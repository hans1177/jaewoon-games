# Move the already-registered, stopped, interactive Roblox Studio GitHub Actions runner
# from this Windows user's LocalAppData to E:. Never create new registration tokens.
[CmdletBinding()]
param([string]$DestinationRoot = 'E:\JaewoonRobloxStudioRunner')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') { throw 'ROBLOX_RUNNER_MIGRATION_WINDOWS_REQUIRED' }
if ([int](Get-Process -Id $PID).SessionId -le 0) { throw 'ROBLOX_RUNNER_MIGRATION_INTERACTIVE_SESSION_REQUIRED' }
if (-not $env:LOCALAPPDATA) { throw 'ROBLOX_RUNNER_MIGRATION_USER_PROFILE_REQUIRED' }
$source = Join-Path $env:LOCALAPPDATA 'JaewoonRobloxStudioRunner'
$target = [IO.Path]::GetFullPath($DestinationRoot).TrimEnd('\')
if ($target -notmatch '^E:\\[^\\]+') { throw 'ROBLOX_RUNNER_MIGRATION_DESTINATION_MUST_BE_E_DRIVE' }
$drive = [IO.DriveInfo]::new('E')
if (-not $drive.IsReady) { throw 'ROBLOX_RUNNER_MIGRATION_E_DRIVE_NOT_READY' }
$free = $drive.AvailableFreeSpace
Write-Host ('ROBLOX_RUNNER_E_FREE_GIB=' + [math]::Round($free / 1GB, 2))
if ($free -lt 8GB) { throw 'ROBLOX_RUNNER_MIGRATION_E_DRIVE_NEEDS_AT_LEAST_8_GIB_FREE' }

$sourceConfig = Join-Path $source '.runner'
$sourceCredentials = Join-Path $source '.credentials'
$targetConfig = Join-Path $target '.runner'
$targetCredentials = Join-Path $target '.credentials'
if (-not (Test-Path -LiteralPath $sourceConfig) -or -not (Test-Path -LiteralPath $sourceCredentials)) {
  if ((Test-Path -LiteralPath $targetConfig) -and (Test-Path -LiteralPath $targetCredentials)) {
    Write-Host 'ROBLOX_RUNNER_MIGRATION=ALREADY_ON_E'
    Write-Host ('ROBLOX_RUNNER_E_ROOT=' + $target)
    return
  }
  throw 'ROBLOX_RUNNER_MIGRATION_REGISTERED_SOURCE_MISSING'
}
$meta = Get-Content -LiteralPath $sourceConfig -Raw | ConvertFrom-Json
if ([string]$meta.gitHubUrl -ne 'https://github.com/hans1177/jaewoon-games' -or
    [string]$meta.agentName -notlike 'roblox-studio-*') {
  throw 'ROBLOX_RUNNER_MIGRATION_WRONG_REGISTERED_RUNNER'
}
if (Test-Path -LiteralPath $target) {
  if (Test-Path -LiteralPath $targetConfig) {
    if ((Get-FileHash -LiteralPath $targetConfig -Algorithm SHA256).Hash -ne
        (Get-FileHash -LiteralPath $sourceConfig -Algorithm SHA256).Hash) {
      throw 'ROBLOX_RUNNER_MIGRATION_DIFFERENT_RUNNER_ALREADY_ON_E'
    }
  } elseif (@(Get-ChildItem -LiteralPath $target -Force).Count -gt 0) {
    throw 'ROBLOX_RUNNER_MIGRATION_NONEMPTY_UNRELATED_DESTINATION'
  }
}

$running = @(Get-CimInstance Win32_Process -Filter "Name='Runner.Listener.exe' OR Name='Runner.Worker.exe'" -ErrorAction Stop |
  Where-Object { $_.Name -in @('Runner.Listener.exe','Runner.Worker.exe') -and
    $_.ExecutablePath -and $_.ExecutablePath.StartsWith($source + '\', [StringComparison]::OrdinalIgnoreCase) })
if ($running.Count -gt 0) {
  throw 'ROBLOX_RUNNER_MIGRATION_RUNNER_ACTIVE: stop it with Ctrl+C before migration'
}
$oldRoot = [IO.Path]::GetFullPath($source).TrimEnd('\')
$expectedRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'JaewoonRobloxStudioRunner')).TrimEnd('\')
if (-not [string]::Equals($oldRoot,$expectedRoot,[StringComparison]::OrdinalIgnoreCase)) {
  throw 'ROBLOX_RUNNER_MIGRATION_SOURCE_PATH_GUARD'
}

New-Item -Path $target -ItemType Directory -Force | Out-Null
# _work is disposable Actions job checkout/cache data; _diag holds old runner logs.
# Copy only the runner application and existing GitHub registration credentials.
& robocopy.exe $source $target /E /COPY:DAT /DCOPY:DAT /XJ /R:1 /W:1 /NP /NFL /NDL /XD (Join-Path $source '_work') (Join-Path $source '_diag') | Out-Null
$copyCode = $LASTEXITCODE
if ($copyCode -gt 7) { throw "ROBLOX_RUNNER_MIGRATION_COPY_FAILED=$copyCode" }
foreach ($relative in @('.runner','.credentials','run.cmd','bin\Runner.Listener.exe')) {
  $from = Join-Path $source $relative
  $to = Join-Path $target $relative
  if (-not (Test-Path -LiteralPath $from) -or -not (Test-Path -LiteralPath $to)) {
    throw "ROBLOX_RUNNER_MIGRATION_REQUIRED_FILE_MISSING=$relative"
  }
  if ((Get-FileHash -LiteralPath $from -Algorithm SHA256).Hash -ne
      (Get-FileHash -LiteralPath $to -Algorithm SHA256).Hash) {
    throw "ROBLOX_RUNNER_MIGRATION_FILE_HASH_MISMATCH=$relative"
  }
}
New-Item -Path (Join-Path $target '_work') -ItemType Directory -Force | Out-Null
$runnerTemp = Join-Path $target '_temp'
New-Item -Path $runnerTemp -ItemType Directory -Force | Out-Null
$startupDir = Join-Path $env:LOCALAPPDATA 'JaewoonStudioAuto'
New-Item -Path $startupDir -ItemType Directory -Force | Out-Null
$startupScript = Join-Path $startupDir 'start.ps1'
if (Test-Path -LiteralPath $startupScript) {
  Copy-Item -LiteralPath $startupScript -Destination (Join-Path $target 'previous-start.ps1.bak') -Force
}

# TEMP/TMP apply only to this runner process and its future jobs, not other apps.
$launcher = @'
$ErrorActionPreference = 'Stop'
$runner = '__RUNNER_ROOT__'
$exe = Join-Path $runner 'bin\Runner.Listener.exe'
$cmd = Join-Path $runner 'run.cmd'
if (-not (Test-Path -LiteralPath $cmd)) { throw 'ROBLOX_RUNNER_E_STARTUP_MISSING' }
$already = @(Get-CimInstance Win32_Process -Filter "Name='Runner.Listener.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ExecutablePath -and $_.ExecutablePath -ieq $exe })
if ($already.Count -gt 0) {
  Write-Host 'ROBLOX_RUNNER_E_ALREADY_RUNNING'
  return
}
$runnerTemp = Join-Path $runner '_temp'
New-Item -Path $runnerTemp -ItemType Directory -Force | Out-Null
$env:TEMP = $runnerTemp
$env:TMP = $runnerTemp
Set-Location $runner
& $cmd
'@
$launcher = $launcher.Replace('__RUNNER_ROOT__', $target.Replace("'", "''"))
Set-Content -LiteralPath $startupScript -Value $launcher -Encoding UTF8
$startup = [Environment]::GetFolderPath('Startup')
if (-not $startup) { throw 'ROBLOX_RUNNER_MIGRATION_WINDOWS_STARTUP_UNAVAILABLE' }
$shortcutPath = Join-Path $startup 'JaewoonStudioAuto.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = (Join-Path $PSHOME 'powershell.exe')
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $startupScript + '"'
$shortcut.WorkingDirectory = $target
$shortcut.Save()
if (-not (Test-Path -LiteralPath $shortcutPath) -or
    -not (Test-Path -LiteralPath $startupScript)) {
  throw 'ROBLOX_RUNNER_MIGRATION_AUTOSTART_VERIFY_FAILED'
}
# Delete only the verified registered old runner after copying/verifying to E
# and updating the logon launcher. Leave the E:\jaewoon-games repo untouched.
Remove-Item -LiteralPath $source -Recurse -Force -ErrorAction Stop
Write-Host 'ROBLOX_RUNNER_MIGRATION=SUCCESS'
Write-Host ('ROBLOX_RUNNER_E_ROOT=' + $target)
Write-Host ('ROBLOX_RUNNER_C_FREE_GIB=' + [math]::Round(([IO.DriveInfo]::new('C')).AvailableFreeSpace / 1GB, 2))
Write-Host ('ROBLOX_RUNNER_E_FREE_GIB=' + [math]::Round($drive.AvailableFreeSpace / 1GB, 2))
Write-Host ('ROBLOX_RUNNER_START=' + $startupScript)
'RUNNER_CREDENTIALS_COPIED=YES'
'RUNNER_REGISTER_NEW_TOKEN=NO'
