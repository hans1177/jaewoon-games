param(
  [string]$RunnerPath = '',
  [string]$TaskName = 'Jaewoon-Roblox-GitHubRunner'
)

$ErrorActionPreference = 'Stop'

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script from PowerShell opened with Run as administrator.'
  }
}

function Test-RunnerRoot([string]$Path) {
  if (-not $Path) { return $false }
  return (Test-Path -LiteralPath (Join-Path $Path 'run.cmd')) -and
         (Test-Path -LiteralPath (Join-Path $Path '.runner'))
}

function Resolve-RunnerRoot([string]$RequestedPath) {
  if ($RequestedPath) {
    $resolved = (Resolve-Path -LiteralPath $RequestedPath).Path
    if (-not (Test-RunnerRoot $resolved)) {
      throw "RunnerPath is not a configured GitHub Actions runner folder: $resolved"
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
      if (Test-RunnerRoot $dir.FullName) {
        $matches += $dir.FullName
      }
    }
  }

  $matches = @($matches | Sort-Object -Unique)
  if ($matches.Count -eq 0) {
    throw 'Could not auto-detect the configured runner folder. Re-run with -RunnerPath C:\path\to\runner.'
  }
  if ($matches.Count -gt 1) {
    throw "Multiple configured runners were found: $($matches -join ', '). Re-run with -RunnerPath for the Roblox runner."
  }
  return $matches[0]
}

Assert-Administrator
$runnerRoot = Resolve-RunnerRoot $RunnerPath
$runCmd = Join-Path $runnerRoot 'run.cmd'
$runnerJson = Get-Content -LiteralPath (Join-Path $runnerRoot '.runner') -Raw | ConvertFrom-Json
$identityName = [Security.Principal.WindowsIdentity]::GetCurrent().Name

$cmdArgument = "/d /s /c `"`"$runCmd`"`""
$action = New-ScheduledTaskAction -Execute $env:ComSpec -Argument $cmdArgument -WorkingDirectory $runnerRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identityName
$principal = New-ScheduledTaskPrincipal -UserId $identityName -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings

Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null

$listener = @(Get-Process -Name 'Runner.Listener' -ErrorAction SilentlyContinue)
if ($listener.Count -eq 0) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 3
}

$taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
$listener = @(Get-Process -Name 'Runner.Listener' -ErrorAction SilentlyContinue)
$runnerName = if ($runnerJson.agentName) { [string]$runnerJson.agentName } else { 'UNKNOWN' }
$runnerUrl = if ($runnerJson.gitHubUrl) { [string]$runnerJson.gitHubUrl } elseif ($runnerJson.serverUrl) { [string]$runnerJson.serverUrl } else { 'UNKNOWN' }

Write-Host "ROBLOX_RUNNER_AUTOSTART_TASK=$TaskName"
Write-Host "ROBLOX_RUNNER_ROOT=$runnerRoot"
Write-Host "ROBLOX_RUNNER_NAME=$runnerName"
Write-Host "ROBLOX_RUNNER_URL=$runnerUrl"
Write-Host "ROBLOX_RUNNER_LOGON_TYPE=INTERACTIVE"
Write-Host "ROBLOX_RUNNER_TASK_STATE=$($taskInfo.LastTaskResult)"
Write-Host "ROBLOX_RUNNER_LISTENER_PROCESS_COUNT=$($listener.Count)"
Write-Host 'ROBLOX_RUNNER_SERVICE_MODE=NO'
Write-Host 'ROBLOX_STUDIO_USER_PROFILE_PRESERVED=YES'
Write-Host 'ROBLOX_RUNNER_AUTOSTART_CONFIGURED=YES'

if ($listener.Count -eq 0) {
  Write-Warning 'Autostart is configured, but Runner.Listener is not visible yet. Sign out/in once or start the scheduled task manually to verify.'
}
