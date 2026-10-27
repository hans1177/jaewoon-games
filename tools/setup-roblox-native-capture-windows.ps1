# One-time bootstrap for a dedicated logged-on Windows capture host.
# This never automates Roblox login, Studio/Player GUI interaction, or purchases a VM.
param(
 [string]$Base = "$env:LOCALAPPDATA\JaewoonNativeMedia",
 [switch]$RegisterWatcher,
 [string]$CaptureGameId = '',
 [Security.SecureString]$PrivateLinkCode
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'WINDOWS_INTERACTIVE_SESSION_REQUIRED' }
function Require-Program([string]$Name,[string]$Package) {
 if (Get-Command $Name -ErrorAction SilentlyContinue) { return }
 if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "WINGET_REQUIRED_TO_INSTALL_$Name"
 }
 & winget install -e --id $Package --silent --accept-source-agreements --accept-package-agreements
 if ($LASTEXITCODE -ne 0) { throw "PACKAGE_INSTALL_FAILED_$Name" }
 if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
  throw "REOPEN_SHELL_TO_REFRESH_PATH_AFTER_INSTALLING_$Name"
 }
}
Require-Program 'git' 'Git.Git'
Require-Program 'gh' 'GitHub.cli'
Require-Program 'node' 'OpenJS.NodeJS.LTS'
Require-Program 'ffmpeg' 'Gyan.FFmpeg'
Require-Program 'ffprobe' 'Gyan.FFmpeg'
# 설치: 본 작업은 웹 브라우저가 실행하는 실제 Windows Roblox Player를 사용한다.
$NativePlayerVersions = Join-Path $env:LOCALAPPDATA 'Roblox\Versions'
$NativePlayers = @(Get-ChildItem -LiteralPath $NativePlayerVersions -Directory -ErrorAction SilentlyContinue |
 ForEach-Object { Join-Path $_.FullName 'RobloxPlayerBeta.exe' } |
 Where-Object { Test-Path -LiteralPath $_ })
if ($NativePlayers.Count -eq 0) {
 if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw 'WINGET_REQUIRED_TO_INSTALL_ROBLOX_PLAYER'
 }
 & winget install -e --id Roblox.Roblox --silent --accept-source-agreements --accept-package-agreements
 if ($LASTEXITCODE -ne 0) { throw 'ROBLOX_PLAYER_INSTALL_FAILED' }
 $NativePlayers = @(Get-ChildItem -LiteralPath $NativePlayerVersions -Directory -ErrorAction SilentlyContinue |
  ForEach-Object { Join-Path $_.FullName 'RobloxPlayerBeta.exe' } |
  Where-Object { Test-Path -LiteralPath $_ })
}
if ($NativePlayers.Count -eq 0) { throw 'ROBLOX_PLAYER_NATIVE_BINARY_NOT_FOUND_AFTER_INSTALL' }
Write-Host 'ROBLOX_NATIVE_PLAYER_BINARY_INSTALLED=YES'
& gh auth status 2>$null
if ($LASTEXITCODE -ne 0) { throw 'CONNECT_GITHUB_AUTH_WITH_GH_AUTH_LOGIN_FIRST' }
New-Item -ItemType Directory -Force -Path $Base | Out-Null
$Repo = Join-Path $Base 'main'
$Runtime = Join-Path $Base 'runtime'
if (-not (Test-Path (Join-Path $Repo '.git'))) {
 & gh repo clone hans1177/jaewoon-games $Repo -- --branch main
 if ($LASTEXITCODE -ne 0) { throw 'MAIN_CLONE_FAILED' }
}
if (-not (Test-Path (Join-Path $Runtime '.git'))) {
 & gh repo clone hans1177/jaewoon-games $Runtime -- --branch company-runtime
 if ($LASTEXITCODE -ne 0) { throw 'RUNTIME_CLONE_FAILED' }
}
if ((& git -C $Runtime branch --show-current).Trim() -ne 'company-runtime') {
 throw 'RUNTIME_BRANCH_MISMATCH'
}
# Keep private server joining details in per-user Windows DPAPI, not in GitHub or logs.
if ($CaptureGameId -and $PrivateLinkCode) {
 if ($CaptureGameId -notin @('cozy-island','daechung-rpg','horror-escape-room')) {
  throw 'CAPTURE_GAME_ID_NOT_ALLOWLISTED'
 }
 $PrivateConfig = Join-Path $Base 'private-capture-join.xml'
 # 설정: 다른 게임의 DPAPI 링크를 삭제하지 않고 게임별로 추가/교체한다.
 $entries = @()
 if (Test-Path -LiteralPath $PrivateConfig) {
  $old = Import-Clixml -LiteralPath $PrivateConfig
  if ($old -and $old.Entries) { $entries = @($old.Entries) }
  elseif ($old -and $old.GameId -and $old.LinkCode -is [Security.SecureString]) {
   $entries = @($old)
  }
 }
 $entries = @($entries | Where-Object {
  $_.GameId -ne $CaptureGameId -and
  $_.GameId -in @('cozy-island','daechung-rpg','horror-escape-room') -and
  $_.LinkCode -is [Security.SecureString]
 })
 $entries += [pscustomobject]@{GameId=$CaptureGameId; LinkCode=$PrivateLinkCode}
 [pscustomobject]@{Version=2; Entries=$entries} |
  Export-Clixml -LiteralPath $PrivateConfig -Force
 Write-Host 'ROBLOX_PRIVATE_CAPTURE_JOIN_CONFIG=DPAPI_SAVED'
} elseif ($CaptureGameId -or $PrivateLinkCode) {
 throw 'CAPTURE_GAME_ID_AND_SECURE_PRIVATE_LINK_CODE_BOTH_REQUIRED'
}
if ($RegisterWatcher) {
 $Watcher = Join-Path $Repo 'tools\watch-roblox-native-capture-windows.ps1'
 # 실행: 손상된 감시 파일을 등록하기 전에 PowerShell 자체 구문 검사.
 $tokens = $null
 $errors = $null
 [System.Management.Automation.Language.Parser]::ParseFile(
  $Watcher, [ref]$tokens, [ref]$errors) | Out-Null
 if ($errors.Count -gt 0) { throw 'ROBLOX_CAPTURE_WATCHER_POWERSHELL_PARSE_FAILED' }
 $Args = '-NoProfile -ExecutionPolicy Bypass -File "'+$Watcher+'" -Base "'+$Base+'"'
 $Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $Args
 $Trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
 $Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
 Register-ScheduledTask -TaskName 'JaewoonRobloxNativeMedia' -Action $Action -Trigger $Trigger -Principal $Principal -Force | Out-Null
 Start-ScheduledTask -TaskName 'JaewoonRobloxNativeMedia'
 Write-Host 'ROBLOX_WINDOWS_CAPTURE_WATCHER=STARTED_AND_REGISTERED_AT_USER_LOGON'
}
Write-Host 'ROBLOX_WINDOWS_MEDIA_CODE_INSTALLED=YES'
Write-Host 'ROBLOX_ACCOUNT_AND_PRIVATE_SESSION_LOGIN_STILL_REQUIRED=YES'
Write-Host 'ROBLOX_PRIVATE_CAPTURE_LAUNCH_DATA=JAEWOON_NATIVE_CAPTURE_<game-id>'
Write-Host 'ROBLOX_ACTUAL_CLIENT_RECORDING_NOT_YET_ATTESTED=YES'
