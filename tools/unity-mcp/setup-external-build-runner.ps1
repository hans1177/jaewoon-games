# File: setup-external-build-runner.ps1
# Purpose: Register or repair this Windows PC as the Jaewoon Games self-hosted Unity build runner.
# Compatibility: Windows PowerShell 5.1+.

param(
    [string]$Repo = 'hans1177/jaewoon-games',
    [string]$RunnerDir = ''
)

$ErrorActionPreference = 'Stop'

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = (@($machine, $user) | Where-Object { $_ }) -join ';'
}

function Resolve-Gh {
    $gh = Get-Command gh.exe -ErrorAction SilentlyContinue
    if ($gh) { return $gh.Source }

    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if (-not $winget) { return $null }

    Write-Host '[INFO] GitHub CLI missing. Installing with winget...'
    & $winget.Source install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw "GitHub CLI install failed: $LASTEXITCODE" }
    Refresh-Path
    $gh = Get-Command gh.exe -ErrorAction SilentlyContinue
    if ($gh) { return $gh.Source }
    return $null
}

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Stop-InteractiveRunner([string]$Dir) {
    $listeners = Get-CimInstance Win32_Process -Filter "Name='Runner.Listener.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.ExecutablePath -and ([string]$_.ExecutablePath).StartsWith($Dir, [System.StringComparison]::OrdinalIgnoreCase)
        }
    foreach ($listener in $listeners) {
        Write-Host "[INFO] Stopping interactive runner PID=$($listener.ProcessId)"
        Stop-Process -Id $listener.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

function Get-RunnerServiceName([string]$Dir) {
    $serviceFile = Join-Path $Dir '.service'
    if (-not (Test-Path $serviceFile)) { return $null }
    $name = (Get-Content $serviceFile -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($name)) { return $null }
    return $name
}

function Start-RunnerService([string]$Dir) {
    $serviceName = Get-RunnerServiceName -Dir $Dir
    if (-not $serviceName) { throw 'Runner service metadata (.service) is missing after configuration.' }

    $service = Get-Service -Name $serviceName -ErrorAction Stop
    Set-Service -Name $serviceName -StartupType Automatic
    if ($service.Status -ne 'Running') {
        Start-Service -Name $serviceName
    }
    $service = Get-Service -Name $serviceName
    if ($service.Status -ne 'Running') { throw "Runner service failed to start: $serviceName" }
    Write-Host "[PASS] GitHub Actions runner service is running: $serviceName"
}

function Get-RegistrationToken([string]$Gh, [string]$RepoName) {
    $token = & $Gh api --method POST "repos/$RepoName/actions/runners/registration-token" --jq '.token'
    if ($LASTEXITCODE -ne 0 -or -not $token) {
        throw 'Could not create a self-hosted runner registration token. Repository admin permission is required.'
    }
    return $token.Trim()
}

function Get-RemovalToken([string]$Gh, [string]$RepoName) {
    $token = & $Gh api --method POST "repos/$RepoName/actions/runners/remove-token" --jq '.token'
    if ($LASTEXITCODE -ne 0 -or -not $token) {
        throw 'Could not create a self-hosted runner removal token. Repository admin permission is required.'
    }
    return $token.Trim()
}

if ([string]::IsNullOrWhiteSpace($RunnerDir)) {
    $legacyDir = "$env:LOCALAPPDATA\JaewoonGitHubRunner"
    if (Test-Path (Join-Path $legacyDir '.runner')) {
        $RunnerDir = $legacyDir
        Write-Host "[INFO] Reusing existing runner directory: $RunnerDir"
    } else {
        $RunnerDir = 'C:\actions-runner'
        Write-Host "[INFO] Using service-friendly runner directory: $RunnerDir"
    }
}

if (-not (Test-Administrator)) {
    throw 'Run this script from PowerShell opened with Run as administrator. Windows service configuration requires administrator rights.'
}

$gh = Resolve-Gh
if (-not $gh) { throw 'GitHub CLI could not be installed or found.' }

& $gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Host '[NEEDS-LOGIN] GitHub CLI login is required once.'
    & $gh auth login
    if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI login failed.' }
}

$repoInfo = & $gh repo view $Repo --json nameWithOwner --jq '.nameWithOwner'
if ($LASTEXITCODE -ne 0 -or $repoInfo.Trim() -ne $Repo) {
    throw "GitHub repository access check failed: $Repo"
}

if (-not (Test-Path $RunnerDir)) {
    New-Item -ItemType Directory -Path $RunnerDir -Force | Out-Null
}

if (-not (Test-Path (Join-Path $RunnerDir 'config.cmd'))) {
    $releaseJson = & $gh api repos/actions/runner/releases/latest
    if ($LASTEXITCODE -ne 0) { throw 'Could not read latest GitHub Actions runner release.' }
    $release = $releaseJson | ConvertFrom-Json
    $asset = $release.assets | Where-Object { $_.name -match '^actions-runner-win-x64-.*\.zip$' } | Select-Object -First 1
    if (-not $asset) { throw 'Windows x64 GitHub Actions runner asset was not found.' }

    $zip = Join-Path $env:TEMP $asset.name
    Write-Host "[INFO] Downloading runner: $($asset.name)"
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $RunnerDir -Force
    Remove-Item $zip -Force -ErrorAction SilentlyContinue
}

$configured = Test-Path (Join-Path $RunnerDir '.runner')
$serviceName = Get-RunnerServiceName -Dir $RunnerDir

if ($configured -and -not $serviceName) {
    Write-Host '[INFO] Existing runner is configured interactively. Reconfiguring it as a Windows service...'
    Stop-InteractiveRunner -Dir $RunnerDir
    $removeToken = Get-RemovalToken -Gh $gh -RepoName $Repo
    Push-Location $RunnerDir
    try {
        & .\config.cmd remove --token $removeToken
        if ($LASTEXITCODE -ne 0) { throw "Existing runner removal failed: $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
    $configured = $false
}

if (-not $configured) {
    $token = Get-RegistrationToken -Gh $gh -RepoName $Repo
    Push-Location $RunnerDir
    try {
        & .\config.cmd --unattended --replace --url "https://github.com/$Repo" --token $token --name "jaewoon-unity-$env:COMPUTERNAME" --labels 'jaewoon-unity' --work '_work' --runasservice
        if ($LASTEXITCODE -ne 0) { throw "Runner service configuration failed: $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
    Write-Host '[PASS] PC registered as a Windows service self-hosted Unity runner.'
} else {
    Write-Host '[PASS] GitHub self-hosted runner service is already configured.'
}

# Remove the old login-only launcher so the runner cannot start twice.
$startup = [Environment]::GetFolderPath('Startup')
if ($startup) {
    $startupCmd = Join-Path $startup 'JaewoonUnityBuildRunner.cmd'
    if (Test-Path $startupCmd) {
        Remove-Item $startupCmd -Force
        Write-Host "[PASS] Removed obsolete login startup launcher: $startupCmd"
    }
}

Start-RunnerService -Dir $RunnerDir

Write-Host ''
Write-Host '[READY] This PC can receive Unity build jobs whenever Windows is running, even before user login.'
Write-Host '[INFO] Expected runner labels: self-hosted, Windows, X64, jaewoon-unity'
Write-Host '[INFO] The Unity license remains local to this PC. No UNITY_LICENSE GitHub secret is used for local builds.'
