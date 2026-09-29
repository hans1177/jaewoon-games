# File: start-unity-ai.ps1
# Purpose: Start Unity MCP and the self-updating Jaewoon Company supervisor.
# Compatibility: Keep this file ASCII-only so Windows PowerShell 5.1 can parse it reliably.

param(
    [string]$ProjectPath = '.\unity-games\daechung-rpg',
    [switch]$InstallAutoStart,
    [switch]$NoCompanyRunner
)

$ErrorActionPreference = 'Stop'

function Resolve-Uvx {
    $cmd = Get-Command uvx -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $known = @(
        (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\uvx.exe'),
        (Join-Path $env:USERPROFILE '.local\bin\uvx.exe')
    )
    foreach ($candidate in $known) {
        if (Test-Path $candidate) { return $candidate }
    }
    return $null
}

function Test-Port([int]$Port) {
    try {
        return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
    } catch {
        return $false
    }
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}

function Get-CurrentPowerShellExe {
    try {
        $process = Get-Process -Id $PID -ErrorAction Stop
        if ($process.Path) { return $process.Path }
    } catch {}

    $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
    if ($pwsh) { return $pwsh.Source }
    $powershell = Get-Command powershell.exe -ErrorAction SilentlyContinue
    if ($powershell) { return $powershell.Source }
    throw 'PowerShell executable could not be resolved.'
}

function Install-LoginAutoStart([string]$PowerShellExe, [string]$StartScript, [string]$Project) {
    $startupDir = [Environment]::GetFolderPath('Startup')
    if (-not $startupDir) { throw 'Windows Startup folder could not be resolved.' }

    $launcherPath = Join-Path $startupDir 'JaewoonCompanyAI.cmd'
    $content = @"
@echo off
"$PowerShellExe" -NoProfile -ExecutionPolicy Bypass -File "$StartScript" -ProjectPath "$Project"
"@
    Write-Utf8NoBom -Path $launcherPath -Text $content
    Write-Host "[PASS] Windows login auto-start installed: $launcherPath"
}

function Get-ExistingCompanySupervisor([string]$RepoRoot) {
    $lockPath = Join-Path $RepoRoot '.jaewoon-company-supervisor.lock'
    if (-not (Test-Path $lockPath)) { return $null }
    try {
        $supervisorPid = [int](Get-Content -Raw -Path $lockPath -Encoding UTF8).Trim()
        if ($supervisorPid -gt 0) {
            return Get-Process -Id $supervisorPid -ErrorAction SilentlyContinue
        }
    } catch {}
    return $null
}

function Stop-LegacyCompanyRunner([string]$RepoRoot) {
    $lockPath = Join-Path $RepoRoot '.jaewoon-company-ai.lock'
    if (-not (Test-Path $lockPath)) { return }
    try {
        $runnerPid = [int](Get-Content -Raw -Path $lockPath -Encoding UTF8).Trim()
        if ($runnerPid -gt 0) {
            $process = Get-Process -Id $runnerPid -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $runnerPid -Force -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 250
                Write-Host "[INFO] Legacy company runner stopped for supervisor migration. PID=$runnerPid"
            }
        }
    } catch {}
    Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
}

function Start-CompanySupervisor([string]$PowerShellExe, [string]$SupervisorScript, [string]$Project, [string]$RepoRoot) {
    if (-not (Test-Path $SupervisorScript)) {
        throw "Company supervisor not found: $SupervisorScript"
    }

    $existing = Get-ExistingCompanySupervisor -RepoRoot $RepoRoot
    if ($existing) {
        Write-Host "[PASS] Jaewoon Company supervisor already active. PID=$($existing.Id)"
        Write-Host "[INFO] Company log: $env:TEMP\jaewoon-company-ai.log"
        return
    }

    Stop-LegacyCompanyRunner -RepoRoot $RepoRoot

    $outLog = Join-Path $env:TEMP 'jaewoon-company-ai-launch.out.log'
    $errLog = Join-Path $env:TEMP 'jaewoon-company-ai-launch.err.log'
    Remove-Item $outLog,$errLog -Force -ErrorAction SilentlyContinue

    $arguments = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', "`"$SupervisorScript`"",
        '-ProjectPath', "`"$Project`""
    )

    $process = Start-Process -FilePath $PowerShellExe -ArgumentList $arguments -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog

    $companyLog = Join-Path $env:TEMP 'jaewoon-company-ai.log'
    $started = $false
    for ($i = 0; $i -lt 24; $i++) {
        Start-Sleep -Milliseconds 250
        if ($process.HasExited) { break }
        if (Test-Path $companyLog) {
            $tail = Get-Content $companyLog -Tail 30 -ErrorAction SilentlyContinue | Out-String
            if ($tail -match ("\[START\] Jaewoon Company supervisor\. PID=" + [regex]::Escape([string]$process.Id))) {
                $started = $true
                break
            }
        }
    }

    if (-not $started) {
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
        Write-Host '[FAIL] Company supervisor did not confirm startup.'
        if (Test-Path $errLog) {
            Write-Host '--- launch stderr ---'
            Get-Content $errLog -Tail 80
        }
        if (Test-Path $outLog) {
            Write-Host '--- launch stdout ---'
            Get-Content $outLog -Tail 80
        }
        throw 'Company supervisor failed to start.'
    }

    Write-Host "[PASS] Jaewoon Company supervisor started and confirmed. PID=$($process.Id)"
    Write-Host '[PASS] Automatic origin/main sync enabled before each company work unit.'
    Write-Host "[INFO] Company log: $companyLog"
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$resolvedProject = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ProjectPath))
$setupScript = Join-Path $PSScriptRoot 'setup-unity-mcp.ps1'
$supervisorScript = Join-Path $PSScriptRoot 'run-company-supervisor.ps1'
$powerShellExe = Get-CurrentPowerShellExe

if (-not (Test-Path $resolvedProject)) {
    throw "Unity project not found: $resolvedProject"
}

Write-Host "[INFO] Project: $resolvedProject"

# Reuse the existing Unity/MCP setup path.
& $setupScript -ProjectPath $resolvedProject -InstallUv -OpenUnity

$uvx = Resolve-Uvx
if (-not $uvx) {
    throw 'uvx was not detected after setup. Open a new PowerShell and run: uvx --version'
}
Write-Host "[PASS] uvx: $uvx"

# Keep the local MCP workspace config available to MCP-capable clients.
$vscodeDir = Join-Path $repoRoot '.vscode'
$mcpConfig = Join-Path $vscodeDir 'mcp.json'
if (-not (Test-Path $vscodeDir)) {
    New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null
}
if (-not (Test-Path $mcpConfig)) {
    $mcpJson = @'
{
  "servers": {
    "unityMCP": {
      "type": "http",
      "url": "http://127.0.0.1:8080/mcp"
    }
  }
}
'@
    Write-Utf8NoBom -Path $mcpConfig -Text $mcpJson
    Write-Host '[PASS] VS Code MCP workspace config created.'
} else {
    Write-Host '[PASS] VS Code MCP workspace config exists.'
}

# Keep MCP loopback-only.
if (Test-Port 8080) {
    Write-Host '[PASS] Unity MCP HTTP port 8080 is already listening.'
} else {
    $outLog = Join-Path $env:TEMP 'jaewoon-unity-mcp.out.log'
    $errLog = Join-Path $env:TEMP 'jaewoon-unity-mcp.err.log'
    Remove-Item $outLog,$errLog -Force -ErrorAction SilentlyContinue

    $args = @(
        '--from', 'mcpforunityserver==10.0.0',
        'mcp-for-unity',
        '--transport', 'http',
        '--http-host', '127.0.0.1',
        '--http-port', '8080',
        '--default-instance', 'daechung-rpg'
    )

    $process = Start-Process -FilePath $uvx -ArgumentList $args -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog

    $ready = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-Port 8080) {
            $ready = $true
            break
        }
        if ($process.HasExited) { break }
    }

    if (-not $ready) {
        Write-Host '[FAIL] Unity MCP server did not open port 8080.'
        Write-Host "stdout: $outLog"
        Write-Host "stderr: $errLog"
        if (Test-Path $errLog) { Get-Content $errLog -Tail 30 }
        exit 1
    }

    Write-Host "[PASS] Unity MCP server started. PID=$($process.Id)"
    Write-Host "[INFO] Logs: $outLog / $errLog"
}

if ($InstallAutoStart) {
    Install-LoginAutoStart -PowerShellExe $powerShellExe -StartScript $PSCommandPath -Project $ProjectPath
}

if (-not $NoCompanyRunner) {
    Start-CompanySupervisor -PowerShellExe $powerShellExe -SupervisorScript $supervisorScript -Project $ProjectPath -RepoRoot $repoRoot
}

Write-Host ''
Write-Host 'UNITY: The MCP window may be closed. Keep the Unity Editor and MCP session active.'
Write-Host 'SYNC: The company supervisor fetches origin/main before every work unit and safely applies remote updates when the tree is clean.'
Write-Host 'COMPANY: The local director rotates Codex -> Antigravity -> CodeBuddy -> Copilot (hard-stop confirmed only) when needed.'
Write-Host 'COST: Paid API environment variables are removed from child runs; automatic credit purchase or plan upgrade is forbidden.'
Write-Host 'OWNER: Automation stops only when a core owner decision is required.'
Write-Host '[READY] Local Unity + Jaewoon Company AI is configured.'
