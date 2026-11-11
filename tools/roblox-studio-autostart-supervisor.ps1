# 로그온한 Windows 데스크톱에서 계속 돌며, Roblox Studio 와 GitHub Actions 러너(roblox-studio-authenticated)가 꺼져 있으면 다시 켠다.
# 재부팅 뒤에도 로그온만 되면 install-roblox-studio-autostart.ps1 이 등록한 예약 작업이 이 스크립트를 시작한다.
# 비밀번호·토큰·쿠키는 다루지 않는다. Studio 는 이미 저장된 Roblox 로그인으로 열리고, 러너는 이미 등록된 것만 쓴다.
# 멈추려면 상태 폴더에 STOP 파일을 만들거나 예약 작업을 지운다.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$RunnerRoot,
  [string]$ConfigPath = '',
  [int]$IntervalSeconds = 30,
  [int]$MaxLoops = 0
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

if ($env:OS -ne 'Windows_NT') { throw 'STUDIO_AUTOSTART_WINDOWS_REQUIRED' }
$sessionId = [int](Get-Process -Id $PID).SessionId
if ($sessionId -le 0) { throw 'STUDIO_AUTOSTART_INTERACTIVE_SESSION_REQUIRED: 서비스(Session 0)로 실행하면 Studio 화면이 없다' }

$stateDir = Join-Path $env:LOCALAPPDATA 'JaewoonRobloxStudioAutostart'
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
$logFile = Join-Path $stateDir 'supervisor.log'
$stopFile = Join-Path $stateDir 'STOP'
$statusFile = Join-Path $stateDir 'status.json'
if (-not $ConfigPath) { $ConfigPath = Join-Path $stateDir 'config.json' }

# 같은 사용자에서 감독 스크립트가 두 개 돌지 않게 한다.
$mutex = New-Object System.Threading.Mutex($false, ('Local\JaewoonRobloxStudioAutostart_' + $sessionId))
if (-not $mutex.WaitOne(0)) { Write-Host 'STUDIO_AUTOSTART_ALREADY_RUNNING'; return }

function Write-Log([string]$msg) {
  try {
    if ((Test-Path -LiteralPath $logFile) -and ((Get-Item -LiteralPath $logFile).Length -gt 1MB)) {
      Move-Item -LiteralPath $logFile -Destination ($logFile + '.old') -Force
    }
    Add-Content -LiteralPath $logFile -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $msg)
  } catch { }
}

function Get-Config {
  $c = [pscustomobject]@{ placeId = ''; universeId = ''; startStudio = $false; startRunner = $true }
  if (Test-Path -LiteralPath $ConfigPath) {
    try {
      $j = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
      foreach ($k in 'placeId', 'universeId', 'startStudio', 'startRunner') {
        if ($null -ne $j.PSObject.Properties[$k]) { $c.$k = $j.$k }
      }
    } catch { Write-Log ('CONFIG_UNREADABLE ' + $_.Exception.Message) }
  }
  return $c
}

# 공식 서명된 Studio 실행 파일만 연다(%LOCALAPPDATA% 와 Program Files (x86) 의 Versions).
function Find-StudioExe {
  $roots = @((Join-Path $env:LOCALAPPDATA 'Roblox\Versions'))
  if (${env:ProgramFiles(x86)}) { $roots += (Join-Path ${env:ProgramFiles(x86)} 'Roblox\Versions') }
  $found = @()
  foreach ($r in $roots) {
    if (Test-Path -LiteralPath $r) {
      $found += Get-ChildItem -LiteralPath $r -Filter 'RobloxStudioBeta.exe' -Recurse -ErrorAction SilentlyContinue
    }
  }
  foreach ($f in ($found | Sort-Object LastWriteTime -Descending)) {
    $sig = Get-AuthenticodeSignature -FilePath $f.FullName
    if ($sig.Status -eq 'Valid' -and $null -ne $sig.SignerCertificate -and $sig.SignerCertificate.Subject -like '*O=Roblox Corporation*') { return $f.FullName }
  }
  return $null
}

function Test-StudioRunning {
  return (@(Get-Process -Name 'RobloxStudioBeta' -ErrorAction SilentlyContinue | Where-Object { [int]$_.SessionId -eq $sessionId }).Count -gt 0)
}

# GitHub 작업이 도는 중(Runner.Worker 가 있음)에는 Studio 를 절대 열지 않는다. 작업(devloop-studio)이 Studio 를 직접 끄고 자기 것을 열기 때문에 둘이 겹치면 캡처가 실패한다.
function Test-JobActive {
  return (@(Get-Process -Name 'Runner.Worker' -ErrorAction SilentlyContinue | Where-Object { [int]$_.SessionId -eq $sessionId }).Count -gt 0)
}

function Test-RunnerRunning {
  $root = [IO.Path]::GetFullPath($RunnerRoot).TrimEnd('\')
  foreach ($p in @(Get-Process -Name 'Runner.Listener' -ErrorAction SilentlyContinue)) {
    try { if ($p.Path -and $p.Path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and [int]$p.SessionId -eq $sessionId) { return $true } } catch { }
  }
  return $false
}

function Assert-RunnerRegistered {
  $cfg = Join-Path $RunnerRoot '.runner'
  if (-not (Test-Path -LiteralPath $cfg)) { throw 'STUDIO_AUTOSTART_RUNNER_NOT_REGISTERED' }
  $meta = Get-Content -LiteralPath $cfg -Raw | ConvertFrom-Json
  if ([string]$meta.gitHubUrl -ne 'https://github.com/hans1177/jaewoon-games') { throw 'STUDIO_AUTOSTART_WRONG_REPOSITORY' }
}

# 실패가 반복되면 30분 쉬어서 계속 창을 띄우는 루프에 빠지지 않는다.
$studioFails = 0; $studioNextTry = [datetime]::MinValue
$runnerFails = 0; $runnerNextTry = [datetime]::MinValue
$loops = 0
Write-Log ('START session=' + $sessionId + ' runnerRoot=' + $RunnerRoot)
try {
  Assert-RunnerRegistered
  while ($true) {
    if (Test-Path -LiteralPath $stopFile) { Write-Log 'STOP_FILE_FOUND exiting'; break }
    $cfgNow = Get-Config
    $now = Get-Date

    if ($cfgNow.startStudio -and -not (Test-JobActive) -and -not (Test-StudioRunning) -and $now -ge $studioNextTry) {
      $exe = Find-StudioExe
      if (-not $exe) {
        Write-Log 'STUDIO_EXE_NOT_FOUND_OR_UNSIGNED'; $studioFails++
      } else {
        try {
          if ($cfgNow.placeId -and $cfgNow.universeId) {
            $uri = 'roblox-studio:1+launchmode:edit+task:EditPlace+placeId:' + [string]$cfgNow.placeId + '+universeId:' + [string]$cfgNow.universeId
            Start-Process -FilePath $uri
          } else {
            Start-Process -FilePath $exe
          }
          Write-Log 'STUDIO_STARTED'
        } catch { Write-Log ('STUDIO_START_FAILED ' + $_.Exception.Message); $studioFails++ }
      }
      $studioNextTry = $now.AddMinutes($(if ($studioFails -ge 5) { 30 } else { 3 }))
      Start-Sleep -Seconds 20
    } elseif (Test-StudioRunning) { $studioFails = 0 }

    if ($cfgNow.startRunner -and -not (Test-RunnerRunning) -and $now -ge $runnerNextTry) {
      $cmd = Join-Path $RunnerRoot 'run.cmd'
      if (-not (Test-Path -LiteralPath $cmd)) {
        Write-Log 'RUNNER_CMD_MISSING'; $runnerFails++
      } else {
        try {
          Start-Process -FilePath $cmd -WorkingDirectory $RunnerRoot -WindowStyle Minimized
          Write-Log 'RUNNER_STARTED'
        } catch { Write-Log ('RUNNER_START_FAILED ' + $_.Exception.Message); $runnerFails++ }
      }
      $runnerNextTry = $now.AddMinutes($(if ($runnerFails -ge 5) { 30 } else { 2 }))
    } elseif (Test-RunnerRunning) { $runnerFails = 0 }

    try {
      [pscustomobject]@{
        at = (Get-Date).ToUniversalTime().ToString('o'); session = $sessionId
        studioRunning = (Test-StudioRunning); runnerRunning = (Test-RunnerRunning)
        studioFails = $studioFails; runnerFails = $runnerFails
      } | ConvertTo-Json | Set-Content -LiteralPath $statusFile -Encoding UTF8
    } catch { }

    $loops++
    if ($MaxLoops -gt 0 -and $loops -ge $MaxLoops) { break }
    Start-Sleep -Seconds $IntervalSeconds
  }
} catch {
  Write-Log ('FATAL ' + $_.Exception.Message)
  throw
} finally {
  $mutex.ReleaseMutex()
}
