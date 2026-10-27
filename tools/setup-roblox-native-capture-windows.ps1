# One-time bootstrap for a dedicated logged-on Windows capture host.
# This never automates Roblox login, Studio/Player GUI interaction, or purchases a VM.
param(
 [string]$Base = "$env:LOCALAPPDATA\JaewoonNativeMedia",
 [switch]$RegisterWatcher
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
if ($RegisterWatcher) {
 $Watcher = Join-Path $Repo 'tools\watch-roblox-native-capture-windows.ps1'
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
