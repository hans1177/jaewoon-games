param(
  [string]$RunnerPath = '',
  [string]$TaskName = 'Jaewoon-Roblox-GitHubRunner',
  [string]$ExpectedRunnerName = 'roblox-studio-local',
  [int]$HealthCheckMinutes = 1
)

$ErrorActionPreference = 'Stop'

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script from PowerShell opened with Run as administrator.'
  }
}

function Get-RunnerMetadata([string]$Path) {
  $runnerFile = Join-Path $Path '.runner'
  if (-not (Test-Path -LiteralPath $runnerFile)) { return $null }
  try {
    return Get-Content -LiteralPath $runnerFile -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Test-RunnerRoot([string]$Path, [string]$ExpectedName) {
  if (-not $Path) { return $false }
  if (-not (Test-Path -LiteralPath (Join-Path $Path 'run.cmd'))) { return $false }
  $metadata = Get-RunnerMetadata $Path
  if (-not $metadata) { return $false }
  return [string]$metadata.agentName -eq $ExpectedName
}

function Resolve-RunnerRoot([string]$RequestedPath, [string]$ExpectedName) {
  if ($RequestedPath) {
    $resolved = (Resolve-Path -LiteralPath $RequestedPath).Path
    if (-not (Test-RunnerRoot $resolved $ExpectedName)) {
      $metadata = Get-RunnerMetadata $resolved
      $actual = if ($metadata -and $metadata.agentName) { [string]$metadata.agentName } else { 'UNKNOWN' }
      throw "RunnerPath is not the expected Roblox runner. Expected '$ExpectedName', found '$actual' at $resolved"
    }
    return $resolved
  }

  $patterns = @(
    'C:\actions-runner*',
    'C:\github-actions-runner*',
    (Join-Path $env:USERPROFILE 'actions-runner*'),
    (Join-Path $env:USERPROFILE 'github-actions-runner*')
  )

  $matches = @()
  foreach ($pattern in $patterns) {
    foreach ($dir in @(Get-ChildItem -Path $pattern -Directory -ErrorAction SilentlyContinue)) {
      if (Test-RunnerRoot $dir.FullName $ExpectedName) {
        $matches += $dir.FullName
      }
    }
  }

  $matches = @($matches | Sort-Object -Unique)
  if ($matches.Count -eq 0) {
    throw "Could not auto-detect configured runner '$ExpectedName'."
  }
  if ($matches.Count -gt 1) {
    throw "Multiple '$ExpectedName' runner folders were found: $($matches -join ', '). Re-run with -RunnerPath."
  }
  return $matches[0]
}

function Get-TargetListener([string]$RunnerRoot) {
  $expectedPath = [IO.Path]::GetFullPath((Join-Path $RunnerRoot 'bin\Runner.Listener.exe'))
  return @(Get-Process -Name 'Runner.Listener' -ErrorAction SilentlyContinue | Where-Object {
    try {
      $_.Path -and ([IO.Path]::GetFullPath($_.Path) -ieq $expectedPath)
    } catch {
      $false
    }
  })
}

Assert-Administrator
if ($HealthCheckMinutes -lt 1) { throw 'HealthCheckMinutes must be at least 1.' }

$runnerRoot = Resolve-RunnerRoot $RunnerPath $ExpectedRunnerName
$runnerJson = Get-RunnerMetadata $runnerRoot
$runnerName = [string]$runnerJson.agentName
if ($runnerName -ne $ExpectedRunnerName) {
  throw "Refusing to configure unexpected runner '$runnerName'. Expected '$ExpectedRunnerName'."
}

$runnerUrl = if ($runnerJson.gitHubUrl) { [string]$runnerJson.gitHubUrl } elseif ($runnerJson.serverUrl) { [string]$runnerJson.serverUrl } else { 'UNKNOWN' }
$identityName = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$watchdogPath = Join-Path $runnerRoot '.jaewoon-roblox-runner-watchdog.ps1'
$escapedRoot = $runnerRoot.Replace("'", "''")

$watchdogTemplate = @'
$ErrorActionPreference = 'Stop'
$runnerRoot = '__RUNNER_ROOT__'
$listenerExe = [IO.Path]::GetFullPath((Join-Path $runnerRoot 'bin\Runner.Listener.exe'))
$workerExe = [IO.Path]::GetFullPath((Join-Path $runnerRoot 'bin\Runner.Worker.exe'))
$restartMarker = Join-Path $runnerRoot '.jaewoon-roblox-runner-hidden-restart.pending'

function Get-TargetListener {
  return @(Get-Process -Name 'Runner.Listener' -ErrorAction SilentlyContinue | Where-Object {
    try {
      $_.Path -and ([IO.Path]::GetFullPath($_.Path) -ieq $listenerExe)
    } catch {
      $false
    }
  })
}

function Get-TargetWorkers {
  return @(Get-Process -Name 'Runner.Worker' -ErrorAction SilentlyContinue | Where-Object {
    try {
      $_.Path -and ([IO.Path]::GetFullPath($_.Path) -ieq $workerExe)
    } catch {
      $false
    }
  })
}

$listener = @(Get-TargetListener)
if ($listener.Count -gt 0) {
  if ((Test-Path -LiteralPath $restartMarker) -and @(Get-TargetWorkers).Count -eq 0) {
    foreach ($process in $listener) {
      Stop-Process -Id $process.Id -ErrorAction Stop
    }
    for ($attempt = 0; $attempt -lt 10 -and @(Get-TargetListener).Count -gt 0; $attempt++) {
      Start-Sleep -Milliseconds 500
    }
    if (@(Get-TargetListener).Count -gt 0) {
      throw 'Idle Runner.Listener did not stop for hidden-launch migration; scheduled self-heal will retry.'
    }
  } else {
    exit 0
  }
}

$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $listenerExe
$startInfo.Arguments = 'run'
$startInfo.WorkingDirectory = $runnerRoot
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$listenerProcess = New-Object System.Diagnostics.Process
$listenerProcess.StartInfo = $startInfo
[void]$listenerProcess.Start()
Start-Sleep -Seconds 5

if (@(Get-TargetListener).Count -eq 0) {
  throw 'Runner.Listener did not start; scheduled self-heal will retry automatically.'
}

Remove-Item -LiteralPath $restartMarker -Force -ErrorAction SilentlyContinue
'@

$watchdogTemplate.Replace('__RUNNER_ROOT__', $escapedRoot) | Set-Content -LiteralPath $watchdogPath -Encoding UTF8
$restartMarkerPath = Join-Path $runnerRoot '.jaewoon-roblox-runner-hidden-restart.pending'
Set-Content -LiteralPath $restartMarkerPath -Value 'DIRECT_HIDDEN_LISTENER_MIGRATION_PENDING' -Encoding Ascii

$powershellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$actionArgument = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdogPath`""
$action = New-ScheduledTaskAction -Execute $powershellExe -Argument $actionArgument -WorkingDirectory $runnerRoot
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $identityName
$healthTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $HealthCheckMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId $identityName -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -Hidden
$task = New-ScheduledTask -Action $action -Trigger @($logonTrigger, $healthTrigger) -Principal $principal -Settings $settings

Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null

$listener = @(Get-TargetListener $runnerRoot)
Start-ScheduledTask -TaskName $TaskName
if ($listener.Count -eq 0) {
  Start-Sleep -Seconds 6
}

$taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
$listener = @(Get-TargetListener $runnerRoot)

Write-Host "ROBLOX_RUNNER_AUTOSTART_TASK=$TaskName"
Write-Host "ROBLOX_RUNNER_ROOT=$runnerRoot"
Write-Host "ROBLOX_RUNNER_NAME=$runnerName"
Write-Host "ROBLOX_RUNNER_EXPECTED_NAME=$ExpectedRunnerName"
Write-Host "ROBLOX_RUNNER_URL=$runnerUrl"
Write-Host "ROBLOX_RUNNER_LOGON_TYPE=INTERACTIVE"
Write-Host "ROBLOX_RUNNER_TASK_STATE=$($taskInfo.LastTaskResult)"
Write-Host "ROBLOX_RUNNER_LISTENER_PROCESS_COUNT=$($listener.Count)"
Write-Host "ROBLOX_RUNNER_SELF_HEAL_INTERVAL_MINUTES=$HealthCheckMinutes"
Write-Host "ROBLOX_RUNNER_WATCHDOG=$watchdogPath"
Write-Host 'ROBLOX_RUNNER_VISIBLE_CMD_REQUIRED=NO'
Write-Host 'ROBLOX_RUNNER_TASK_HIDDEN=YES'
Write-Host 'ROBLOX_RUNNER_LAUNCH_MODE=CREATE_NO_WINDOW_LISTENER'
Write-Host 'ROBLOX_RUNNER_IDLE_MIGRATION=PENDING_UNTIL_NO_RUNNER_WORKER'
Write-Host 'ROBLOX_RUNNER_SERVICE_MODE=NO'
Write-Host 'ROBLOX_STUDIO_USER_PROFILE_PRESERVED=YES'
Write-Host 'ROBLOX_RUNNER_AUTOSTART_CONFIGURED=YES'

if ($listener.Count -eq 0) {
  Write-Warning 'Runner is not connected yet. The scheduled self-heal will retry automatically; no manual run.cmd action is required.'
}
