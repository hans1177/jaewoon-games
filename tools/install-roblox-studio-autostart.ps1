# 이 PC 에서 한 번만 실행한다. 로그온할 때마다(재부팅 뒤 포함) Studio + GitHub 러너를 자동으로 켜는 예약 작업을 등록한다.
#   확인만:      powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\install-roblox-studio-autostart.ps1 -CheckOnly
#   설치:        powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\install-roblox-studio-autostart.ps1 -PlaceId 108565970231899 -UniverseId 10773436325
#   제거:        powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\install-roblox-studio-autostart.ps1 -Uninstall
# 관리자 권한이 필요 없다(현재 사용자 로그온 작업). 비밀번호는 저장하지 않는다.
[CmdletBinding()]
param(
  [string]$RunnerRoot = '',
  [string]$PlaceId = '',
  [string]$UniverseId = '',
  [switch]$CheckOnly,
  [switch]$Uninstall,
  [switch]$KeepStudioOpen
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskName = 'JaewoonRobloxStudioAutostart'

if ($env:OS -ne 'Windows_NT') { throw 'STUDIO_AUTOSTART_WINDOWS_REQUIRED' }
if ([int](Get-Process -Id $PID).SessionId -le 0) { throw 'STUDIO_AUTOSTART_INTERACTIVE_SESSION_REQUIRED' }

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host 'STUDIO_AUTOSTART=REMOVED'
  return
}

# 이미 등록된 러너만 쓴다(새 등록 토큰을 만들지 않는다).
function Find-Runner {
  $cands = @()
  if ($RunnerRoot) { $cands += $RunnerRoot }
  $cands += 'E:\JaewoonRobloxStudioRunner'
  if ($env:LOCALAPPDATA) { $cands += (Join-Path $env:LOCALAPPDATA 'JaewoonRobloxStudioRunner') }
  if ($env:SystemDrive) { $cands += (Join-Path $env:SystemDrive 'actions-runner-roblox-studio') }
  foreach ($c in $cands) {
    $cfg = Join-Path $c '.runner'
    if ((Test-Path -LiteralPath $cfg) -and (Test-Path -LiteralPath (Join-Path $c 'run.cmd'))) {
      $meta = Get-Content -LiteralPath $cfg -Raw | ConvertFrom-Json
      if ([string]$meta.gitHubUrl -eq 'https://github.com/hans1177/jaewoon-games') { return $c }
    }
  }
  return $null
}

$runner = Find-Runner
if (-not $runner) { throw 'STUDIO_AUTOSTART_REGISTERED_RUNNER_NOT_FOUND: 먼저 connect-roblox-studio-mcp-free-windows.ps1 로 러너를 등록하세요' }
Write-Host ('STUDIO_AUTOSTART_RUNNER=' + $runner)

$supervisor = Join-Path $PSScriptRoot 'roblox-studio-autostart-supervisor.ps1'
if (-not (Test-Path -LiteralPath $supervisor)) { throw 'STUDIO_AUTOSTART_SUPERVISOR_MISSING' }
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

# 감독 스크립트를 저장소 폴더가 아닌 안정된 위치로 복사한다(저장소를 옮기거나 브랜치를 바꿔도 안 끊김).
$stateDir = Join-Path $env:LOCALAPPDATA 'JaewoonRobloxStudioAutostart'
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
$installed = Join-Path $stateDir 'roblox-studio-autostart-supervisor.ps1'
Copy-Item -LiteralPath $supervisor -Destination $installed -Force

$configPath = Join-Path $stateDir 'config.json'
# 기본은 러너만 살려 둔다. devloop-studio 작업이 Studio 를 직접 열고 닫으므로, 감독 스크립트가 Studio 를 열면 서로 방해한다.
# Studio 를 항상 열어 두고 싶을 때만 -KeepStudioOpen 을 쓴다(작업 중에는 그래도 열지 않는다).
$startStudio = [bool]$KeepStudioOpen
# 설정은 매번 새로 쓴다(예전 설치가 남긴 startStudio=true 도 덮어쓴다).
[pscustomobject]@{ placeId = $PlaceId; universeId = $UniverseId; startStudio = $startStudio; startRunner = $true } |
  ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
Write-Host ('STUDIO_AUTOSTART_CONFIG=' + $configPath)

if ($CheckOnly) {
  Write-Host 'STUDIO_AUTOSTART_PREFLIGHT=PASS_NOT_INSTALLED'
  return
}

$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$arg = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $installed + '" -RunnerRoot "' + $runner + '" -ConfigPath "' + $configPath + '"'
$action = New-ScheduledTaskAction -Execute $powershell -Argument $arg
$logon = New-ScheduledTaskTrigger -AtLogOn -User $user
# 감독 스크립트가 어떤 이유로 죽어도 5분 안에 다시 시작한다(이미 돌면 mutex 로 바로 끝난다).
$repeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($logon, $repeat) -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Host 'STUDIO_AUTOSTART=INSTALLED'
Write-Host ('STUDIO_AUTOSTART_LOG=' + (Join-Path $stateDir 'supervisor.log'))
Write-Host '재부팅 뒤 Windows 로그인(자동 로그인 포함)만 되면 Studio 와 러너가 자동으로 켜진다. 자동 로그인은 이 도구가 설정하지 않는다.'
Write-Host 'Studio 의 Assistant > Manage MCP Servers > Enable Studio as MCP server 는 한 번 직접 켜 두어야 한다.'
