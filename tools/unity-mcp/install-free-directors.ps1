# File: install-free-directors.ps1
# Purpose: Install local director CLIs used by Jaewoon Company without configuring paid API keys.
# Compatibility: Keep this file ASCII-only for Windows PowerShell 5.1.

param(
    [switch]$SkipCodex,
    [switch]$SkipAntigravity
)

$ErrorActionPreference = 'Stop'

function Refresh-ProcessPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $extra = @(
        (Join-Path $env:APPDATA 'npm'),
        (Join-Path $env:LOCALAPPDATA 'agy\bin'),
        'C:\Program Files\nodejs'
    )

    $parts = @()
    foreach ($value in @($machine, $user, $env:Path) + $extra) {
        if ([string]::IsNullOrWhiteSpace($value)) { continue }
        foreach ($part in ($value -split ';')) {
            if (-not [string]::IsNullOrWhiteSpace($part) -and $parts -notcontains $part) {
                $parts += $part
            }
        }
    }
    $env:Path = ($parts -join ';')
}

function Resolve-CommandPath([string[]]$Names, [string[]]$KnownPaths = @()) {
    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }
    foreach ($path in $KnownPaths) {
        if ($path -and (Test-Path $path)) { return $path }
    }
    return $null
}

function Require-Winget {
    $winget = Resolve-CommandPath -Names @('winget.exe', 'winget')
    if (-not $winget) {
        throw 'winget is required to install Node.js LTS automatically. Install App Installer from Microsoft Store, then rerun this script.'
    }
    return $winget
}

function Ensure-NodeAndNpm {
    Refresh-ProcessPath
    $npm = Resolve-CommandPath -Names @('npm.cmd', 'npm') -KnownPaths @('C:\Program Files\nodejs\npm.cmd')
    if ($npm) {
        Write-Host "[PASS] npm detected: $npm"
        return $npm
    }

    $winget = Require-Winget
    Write-Host '[INFO] npm is missing. Installing Node.js LTS with winget...'
    & $winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js LTS installation failed. winget exit code=$LASTEXITCODE"
    }

    Refresh-ProcessPath
    $npm = Resolve-CommandPath -Names @('npm.cmd', 'npm') -KnownPaths @('C:\Program Files\nodejs\npm.cmd')
    if (-not $npm) {
        throw 'Node.js installation completed but npm is still not visible. Open a new PowerShell and rerun this script.'
    }

    Write-Host "[PASS] npm installed: $npm"
    return $npm
}

function Ensure-Codex {
    Refresh-ProcessPath
    $codex = Resolve-CommandPath -Names @('codex.cmd', 'codex') -KnownPaths @((Join-Path $env:APPDATA 'npm\codex.cmd'))
    if ($codex) {
        Write-Host "[PASS] Codex CLI detected: $codex"
        return
    }

    $npm = Ensure-NodeAndNpm
    Write-Host '[INFO] Installing OpenAI Codex CLI...'
    & $npm install -g '@openai/codex'
    if ($LASTEXITCODE -ne 0) {
        throw "Codex CLI installation failed. npm exit code=$LASTEXITCODE"
    }

    Refresh-ProcessPath
    $codex = Resolve-CommandPath -Names @('codex.cmd', 'codex') -KnownPaths @((Join-Path $env:APPDATA 'npm\codex.cmd'))
    if (-not $codex) {
        throw 'Codex CLI installed but codex is not visible. Open a new PowerShell and rerun this script.'
    }
    Write-Host "[PASS] Codex CLI installed: $codex"
}

function Ensure-Antigravity {
    Refresh-ProcessPath
    $agy = Resolve-CommandPath -Names @('agy.exe', 'agy', 'antigravity') -KnownPaths @((Join-Path $env:LOCALAPPDATA 'agy\bin\agy.exe'))
    if ($agy) {
        Write-Host "[PASS] Antigravity CLI detected: $agy"
        return
    }

    Write-Host '[INFO] Installing Google Antigravity CLI from the official installer...'
    $installerUrl = 'https://antigravity.google/cli/install.ps1'
    $installer = Invoke-RestMethod -Uri $installerUrl -UseBasicParsing
    Invoke-Expression ([string]$installer)

    Refresh-ProcessPath
    $agy = Resolve-CommandPath -Names @('agy.exe', 'agy', 'antigravity') -KnownPaths @((Join-Path $env:LOCALAPPDATA 'agy\bin\agy.exe'))
    if (-not $agy) {
        throw 'Antigravity CLI installation did not expose agy. Open a new PowerShell and rerun this script.'
    }
    Write-Host "[PASS] Antigravity CLI installed: $agy"
}

Write-Host '[INFO] Jaewoon Company free/included director bootstrap'
Write-Host '[POLICY] This script does not create paid API keys or enable paid overage.'

if (-not $SkipCodex) { Ensure-Codex }
if (-not $SkipAntigravity) { Ensure-Antigravity }

Write-Host ''
Write-Host '[READY] Director CLIs are installed.'
Write-Host 'ONE-TIME LOGIN 1: codex --login   -> choose Sign in with ChatGPT'
Write-Host 'ONE-TIME LOGIN 2: agy             -> complete Google account sign-in, trust this repo, then exit the TUI'
Write-Host 'AFTER LOGIN: .\tools\unity-mcp\start-unity-ai.ps1'
