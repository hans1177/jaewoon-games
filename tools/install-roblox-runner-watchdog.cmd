@echo off
setlocal EnableExtensions

set "SELF=%~f0"
set "RUNNER_PATH=C:\actions-runner"
set "TASK_NAME=Jaewoon-Roblox-GitHubRunner"
set "EXPECTED_RUNNER=roblox-studio-local"
set "SETUP_URL=https://raw.githubusercontent.com/hans1177/jaewoon-games/main/tools/setup-roblox-runner-autostart.ps1"
set "SETUP_FILE=%TEMP%\jaewoon-setup-roblox-runner-autostart.ps1"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$id=[Security.Principal.WindowsIdentity]::GetCurrent(); $p=New-Object Security.Principal.WindowsPrincipal($id); if(-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){ Start-Process -FilePath $env:ComSpec -Verb RunAs -ArgumentList @('/d','/c',('""{0}""' -f $env:SELF)); exit 100 }"
if "%ERRORLEVEL%"=="100" exit /b 0
if errorlevel 1 exit /b %ERRORLEVEL%

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri $env:SETUP_URL -OutFile $env:SETUP_FILE; & $env:SETUP_FILE -RunnerPath $env:RUNNER_PATH -TaskName $env:TASK_NAME -ExpectedRunnerName $env:EXPECTED_RUNNER -HealthCheckMinutes 1; Start-ScheduledTask -TaskName $env:TASK_NAME; Write-Host 'ROBLOX_RUNNER_WATCHDOG_BOOTSTRAP=PASS'; Write-Host 'ROBLOX_RUNNER_MANUAL_RUN_CMD_REQUIRED=NO'"
if errorlevel 1 exit /b %ERRORLEVEL%

exit /b 0
