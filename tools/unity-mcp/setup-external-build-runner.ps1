# File: setup-external-build-runner.ps1
# Purpose: Register this Windows PC as the Jaewoon Games self-hosted Unity build runner.
# Compatibility: Windows PowerShell 5.1+.

param(
    [string]$Repo = 'hans1177/jaewoon-games',
    [string]$RunnerDir = "$env:LOCALAPPDATA\JaewoonGitHubRunner"
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

function Start-Runner([string]$Dir) {
    $listener = Get-CimInstance Win32_Process -Filter "Name='Runner.Listener.exe'" -ErrorAction SilentlyContinue |
        Where-Object { ([string]$_.ExecutablePath).StartsWith($Dir, [System.StringComparison]::OrdinalIgnoreCase) } |
        Select-Object -First 1
    if ($listener) {
        Write-Host "[PASS] External build runner already running. PID=$($listener.ProcessId)"
        return
    }

    $runCmd = Join-Path $Dir 'run.cmd'
    if (-not (Test-Path $runCmd)) { throw "run.cmd missing: $runCmd" }
    Start-Process -FilePath $runCmd -WorkingDirectory $Dir -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Write-Host '[PASS] External build runner launch requested.'
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

$configured = Test-Path (Join-Path $RunnerDir '.runner')
if (-not $configured) {
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

    $token = & $gh api --method POST "repos/$Repo/actions/runners/registration-token" --jq '.token'
    if ($LASTEXITCODE -ne 0 -or -not $token) {
        throw 'Could not create a self-hosted runner registration token. Repository admin permission is required.'
    }

    Push-Location $RunnerDir
    try {
        & .\config.cmd --unattended --replace --url "https://github.com/$Repo" --token $token.Trim() --name "jaewoon-unity-$env:COMPUTERNAME" --labels 'jaewoon-unity' --work '_work'
        if ($LASTEXITCODE -ne 0) { throw "Runner configuration failed: $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
    Write-Host '[PASS] PC registered as GitHub self-hosted Unity runner.'
} else {
    Write-Host '[PASS] GitHub self-hosted runner is already configured.'
}

$startup = [Environment]::GetFolderPath('Startup')
if (-not $startup) { throw 'Windows Startup folder could not be resolved.' }
$startupCmd = Join-Path $startup 'JaewoonUnityBuildRunner.cmd'
$escapedDir = $RunnerDir.Replace('%','%%')
$launcher = "@echo off`r`ncd /d `"$escapedDir`"`r`nstart `"`" /min run.cmd`r`n"
[System.IO.File]::WriteAllText($startupCmd, $launcher, [System.Text.Encoding]::ASCII)
Write-Host "[PASS] Login auto-start installed: $startupCmd"

Start-Runner -Dir $RunnerDir

Write-Host ''
Write-Host '[READY] This PC can now receive Unity build jobs from GitHub while the user is logged in.'
Write-Host '[INFO] The Unity license remains local to this PC. No UNITY_LICENSE GitHub secret is used.'
