# 이 PC 에서 한 번만 실행한다. 로그온할 때마다(재부팅 뒤 포함) Studio + GitHub 러너를 자동으로 켜는 예약 작업을 등록한다.
#   확인만:      powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\install-roblox-studio-autostart.ps1 -CheckOnly
#   설치:        powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\install-roblox-studio-autostart.ps1 -PlaceId 73607605986189 -UniverseId 10775310508
#   제거:        powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\install-roblox-studio-autostart.ps1 -Uninstall
# 관리자 권한이 필요 없다(현재 사용자 로그온 작업). 비밀번호는 저장하지 않는다.
[CmdletBinding()]
param(
  [string]$RunnerRoot = '',
  [string]$PlaceId = '',
  [string]$UniverseId = '',
  [switch]$CheckOnly,
  [switch]$Uninstall,
  [switch]$KeepStudioOpen,
  [switch]$DisableStudioAutostart
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
$installed = Join-Path $stateDir 'roblox-studio-autostart-supervisor.ps1'
$configPath = Join-Path $stateDir 'config.json'
# [기존 시작 프로그램] 공식 GitHub 자동복구가 설치한 같은 러너용 VBS 감시기는 그대로 재사용한다.
# 두 감시기가 run.cmd 를 동시에 실행하면 GitHub 세션 충돌이 생기므로 감독 스크립트는 Studio 만 관리한다.
$startup = [Environment]::GetFolderPath('Startup')
$existingRunnerStartup = $false
if ($startup) {
  $watchdogPath = Join-Path $startup 'Jaewoon-Roblox-Runner.vbs'
  if (Test-Path -LiteralPath $watchdogPath -PathType Leaf) {
    $watchdog = Get-Content -LiteralPath $watchdogPath -Raw
    $listener = Join-Path $runner 'bin\Runner.Listener.exe'
    if ($watchdog.IndexOf(('target = "' + $listener + '"'), [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
        $watchdog.Contains('shell.Run "cmd.exe /d /c run.cmd"') -and
        $watchdog.Contains('WScript.Sleep 15000')) {
      $existingRunnerStartup = $true
      Write-Host 'STUDIO_AUTOSTART_EXISTING_RUNNER_WATCHDOG=REUSED'
    } else {
      throw 'STUDIO_AUTOSTART_EXISTING_RUNNER_WATCHDOG_UNVERIFIED'
    }
  }
}
# 기존 E: 러너 이전 도구의 시작 바로가기도 같은 러너를 실행한다.
if (-not $existingRunnerStartup -and $startup) {
  $shortcutPath = Join-Path $startup 'JaewoonStudioAuto.lnk'
  $launcherPath = Join-Path $env:LOCALAPPDATA 'JaewoonStudioAuto\start.ps1'
  if ((Test-Path -LiteralPath $shortcutPath -PathType Leaf) -and
      (Test-Path -LiteralPath $launcherPath -PathType Leaf)) {
    $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($shortcutPath)
    $launcher = Get-Content -LiteralPath $launcherPath -Raw
    $quotedRunner = "'" + $runner.Replace("'", "''") + "'"
    if ([string]$shortcut.Arguments -like ('*' + $launcherPath + '*') -and
        $launcher.Contains($quotedRunner) -and
        $launcher.Contains('run.cmd')) {
      $existingRunnerStartup = $true
      Write-Host 'STUDIO_AUTOSTART_EXISTING_RUNNER_SHORTCUT=REUSED'
    }
  }
}
# [기본 복구] 새 설치·재설치 시 스튜디오 자동 감시를 켠다. 명시적 중지는 유지한다.
if ($KeepStudioOpen -and $DisableStudioAutostart) { throw 'STUDIO_AUTOSTART_CONFLICTING_OPTIONS' }
# [기존 설치 보존] 재설치가 명시적으로 꺼둔 Studio 자동실행과 Place 정보를 되돌리지 않는다.
$previous = $null
if (Test-Path -LiteralPath $configPath -PathType Leaf) {
  try { $previous = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json }
  catch { throw 'STUDIO_AUTOSTART_EXISTING_CONFIG_UNREADABLE' }
}
if ($previous) {
  if (-not $PSBoundParameters.ContainsKey('PlaceId') -and $null -ne $previous.PSObject.Properties['placeId']) {
    $PlaceId = [string]$previous.placeId
  }
  if (-not $PSBoundParameters.ContainsKey('UniverseId') -and $null -ne $previous.PSObject.Properties['universeId']) {
    $UniverseId = [string]$previous.universeId
  }
}
$startStudio = $true
if ($previous -and $null -ne $previous.PSObject.Properties['startStudio']) {
  $startStudio = [bool]$previous.startStudio
}
if ($KeepStudioOpen) { $startStudio = $true }
if ($DisableStudioAutostart) { $startStudio = $false }
$startRunner = -not $existingRunnerStartup
Write-Host ('STUDIO_AUTOSTART_STUDIO_ON_LOGIN=' + $startStudio)
Write-Host ('STUDIO_AUTOSTART_RUNNER_OWNED_BY_SUPERVISOR=' + $startRunner)
if ($CheckOnly) {
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Write-Host ('STUDIO_AUTOSTART_PREFLIGHT=' + $(if ($task) { 'ALREADY_INSTALLED' } else { 'READY_TO_INSTALL' }))
  return
}
# [설치] 기존 시작 프로그램과 충돌하지 않는 설정만 저장한다.
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
Copy-Item -LiteralPath $supervisor -Destination $installed -Force
[pscustomobject]@{ placeId = $PlaceId; universeId = $UniverseId; startStudio = $startStudio; startRunner = $startRunner } |
  ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
Write-Host ('STUDIO_AUTOSTART_CONFIG=' + $configPath)

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
# [실행 중 코드 반영] Studio/게임이 아닌 기존 감독 작업만 갱신한다.
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
if ($existingTask.State -eq 'Running') {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction Stop
  Write-Host 'STUDIO_AUTOSTART_SUPERVISOR_TASK_RESTART=REQUESTED'
}
Start-ScheduledTask -TaskName $taskName
Write-Host 'STUDIO_AUTOSTART=INSTALLED'
Write-Host ('STUDIO_AUTOSTART_LOG=' + (Join-Path $stateDir 'supervisor.log'))
Write-Host 'Windows 로그인 후 설정에 따라 Studio 와 러너를 복구한다. 기존 설치는 이 도구를 다시 실행해야 변경된 감시기가 반영된다. 자동 로그인은 설정하지 않는다.'
Write-Host 'Studio 의 Assistant > Manage MCP Servers > Enable Studio as MCP server 는 한 번 직접 켜 두어야 한다.'
