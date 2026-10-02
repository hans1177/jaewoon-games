# 파일명: tools/roblox-runner-hidden.ps1
param(
  [string]$RunnerPath = 'C:\actions-runner',
  [string]$ExpectedRunnerName = 'roblox-studio-local'
)

$ErrorActionPreference = 'Stop'

$runnerRoot = [IO.Path]::GetFullPath($RunnerPath)
$runnerMetadataPath = Join-Path $runnerRoot '.runner'
$runCmd = Join-Path $runnerRoot 'run.cmd'
$listenerExe = [IO.Path]::GetFullPath((Join-Path $runnerRoot 'bin\Runner.Listener.exe'))
$workerExe = [IO.Path]::GetFullPath((Join-Path $runnerRoot 'bin\Runner.Worker.exe'))

if (-not (Test-Path -LiteralPath $runnerMetadataPath)) { throw "Runner metadata missing: $runnerMetadataPath" }
if (-not (Test-Path -LiteralPath $runCmd)) { throw "Runner run.cmd missing: $runCmd" }

$metadata = Get-Content -LiteralPath $runnerMetadataPath -Raw | ConvertFrom-Json
if ([string]$metadata.agentName -ne $ExpectedRunnerName) {
  throw "Unexpected runner identity: $($metadata.agentName)"
}

$launcherPath = Join-Path $runnerRoot '.jaewoon-roblox-runner-hidden.vbs'
$migrationPath = Join-Path $runnerRoot '.jaewoon-roblox-runner-hidden-migrate.ps1'
$migrationLauncherPath = Join-Path $runnerRoot '.jaewoon-roblox-runner-hidden-migrate.vbs'
$statePath = Join-Path $runnerRoot '.jaewoon-roblox-runner-hidden-state.json'
$startupRoot = [Environment]::GetFolderPath('Startup')
if (-not $startupRoot) { throw 'Windows Startup folder unavailable' }
$startupPath = Join-Path $startupRoot 'Jaewoon-Roblox-Runner.vbs'

function Escape-Vbs([string]$value) {
  return $value.Replace('"','""')
}

$launcher = @"
Set shell = CreateObject("WScript.Shell")
Set svc = GetObject("winmgmts:\\.\root\cimv2")
Set running = svc.ExecQuery("SELECT * FROM Win32_Process WHERE Name='Runner.Listener.exe'")
If running.Count = 0 Then
  shell.CurrentDirectory = "$(Escape-Vbs $runnerRoot)"
  shell.Run Chr(34) & "$(Escape-Vbs $runCmd)" & Chr(34), 0, False
End If
"@
$launcher | Set-Content -LiteralPath $launcherPath -Encoding ASCII
$launcher | Set-Content -LiteralPath $startupPath -Encoding ASCII

$migrationTemplate = @'
# 파일명: .jaewoon-roblox-runner-hidden-migrate.ps1
$ErrorActionPreference = 'Stop'
$runnerRoot = '__RUNNER_ROOT__'
$listenerExe = '__LISTENER_EXE__'
$workerExe = '__WORKER_EXE__'
$launcherPath = '__LAUNCHER_PATH__'
$statePath = '__STATE_PATH__'

function Get-TargetListener {
  return @(Get-Process -Name 'Runner.Listener' -ErrorAction SilentlyContinue | Where-Object {
    try { $_.Path -and ([IO.Path]::GetFullPath($_.Path) -ieq $listenerExe) } catch { $false }
  })
}

function Get-TargetWorkers {
  return @(Get-Process -Name 'Runner.Worker' -ErrorAction SilentlyContinue | Where-Object {
    try { $_.Path -and ([IO.Path]::GetFullPath($_.Path) -ieq $workerExe) } catch { $false }
  })
}

$deadline = [DateTime]::UtcNow.AddMinutes(45)
while ([DateTime]::UtcNow -lt $deadline) {
  if (@(Get-TargetWorkers).Count -eq 0) {
    foreach ($process in @(Get-TargetListener)) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    for ($attempt = 0; $attempt -lt 40 -and @(Get-TargetListener).Count -gt 0; $attempt++) {
      Start-Sleep -Milliseconds 100
    }

    $wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
    $savedTracking = $env:RUNNER_TRACKING_ID
    $env:RUNNER_TRACKING_ID = ''
    try {
      Start-Process -FilePath $wscript -ArgumentList @('//B','//Nologo',('"' + $launcherPath + '"')) -WindowStyle Hidden
    } finally {
      $env:RUNNER_TRACKING_ID = $savedTracking
    }

    for ($attempt = 0; $attempt -lt 60; $attempt++) {
      if (@(Get-TargetListener).Count -gt 0) {
        @{
          version = 2
          mode = 'HIDDEN_CMD_CONSOLE_PARENT'
          consoleChildrenVisible = $false
          studioGuiVisible = $true
          watchdog = $false
          migrationPending = $false
          migratedAt = [DateTime]::UtcNow.ToString('o')
        } | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
        exit 0
      }
      Start-Sleep -Milliseconds 250
    }
    throw 'Hidden runner listener did not start after idle migration'
  }
  Start-Sleep -Milliseconds 250
}
throw 'Timed out waiting for the current Runner.Worker to become idle'
'@

$escapedRoot = $runnerRoot.Replace("'","''")
$escapedListener = $listenerExe.Replace("'","''")
$escapedWorker = $workerExe.Replace("'","''")
$escapedLauncher = $launcherPath.Replace("'","''")
$escapedState = $statePath.Replace("'","''")
$migration = $migrationTemplate.
  Replace('__RUNNER_ROOT__',$escapedRoot).
  Replace('__LISTENER_EXE__',$escapedListener).
  Replace('__WORKER_EXE__',$escapedWorker).
  Replace('__LAUNCHER_PATH__',$escapedLauncher).
  Replace('__STATE_PATH__',$escapedState)
$migration | Set-Content -LiteralPath $migrationPath -Encoding UTF8

$powerShellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$migrationLauncher = @"
Set shell = CreateObject("WScript.Shell")
shell.Run Chr(34) & "$(Escape-Vbs $powerShellExe)" & Chr(34) & " -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & "$(Escape-Vbs $migrationPath)" & Chr(34), 0, False
"@
$migrationLauncher | Set-Content -LiteralPath $migrationLauncherPath -Encoding ASCII

$currentState = $null
if (Test-Path -LiteralPath $statePath) {
  try { $currentState = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json } catch {}
}

$needsMigration = -not (
  $currentState
  -and [int]$currentState.version -eq 2
  -and [string]$currentState.mode -eq 'HIDDEN_CMD_CONSOLE_PARENT'
  -and $currentState.consoleChildrenVisible -eq $false
  -and $currentState.studioGuiVisible -eq $true
  -and $currentState.migrationPending -eq $false
  -and (Test-Path -LiteralPath $startupPath)
)

if ($needsMigration) {
  @{
    version = 2
    mode = 'HIDDEN_CMD_CONSOLE_PARENT'
    consoleChildrenVisible = $false
    studioGuiVisible = $true
    watchdog = $false
    migrationPending = $true
    configuredAt = [DateTime]::UtcNow.ToString('o')
  } | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8

  $wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
  $savedTracking = $env:RUNNER_TRACKING_ID
  $env:RUNNER_TRACKING_ID = ''
  try {
    Start-Process -FilePath $wscript -ArgumentList @('//B','//Nologo',('"' + $migrationLauncherPath + '"')) -WindowStyle Hidden
  } finally {
    $env:RUNNER_TRACKING_ID = $savedTracking
  }
  Write-Host 'ROBLOX_RUNNER_HIDDEN_MIGRATION=QUEUED_AFTER_CURRENT_WORKER'
} else {
  Write-Host 'ROBLOX_RUNNER_HIDDEN_MIGRATION=ALREADY_CONFIGURED'
}

Write-Host "ROBLOX_RUNNER_STARTUP_LAUNCHER=$startupPath"
Write-Host 'ROBLOX_RUNNER_WATCHDOG=NO'
Write-Host 'ROBLOX_RUNNER_VISIBLE_CMD=NO'
Write-Host 'ROBLOX_RUNNER_VISIBLE_POWERSHELL=NO'
Write-Host 'ROBLOX_RUNNER_VISIBLE_APP=ROBLOX_STUDIO_ONLY'
Write-Host 'ROBLOX_RUNNER_REBOOT_AUTOSTART=HIDDEN_USER_STARTUP'
