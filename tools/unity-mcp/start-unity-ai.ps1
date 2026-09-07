# 파일명: start-unity-ai.ps1
# 역할: Unity MCP와 재운컴퍼니 자동 총괄 AI를 한 번에 시작한다.

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

function Start-CompanyRunner([string]$PowerShellExe, [string]$RunnerScript, [string]$Project) {
    if (-not (Test-Path $RunnerScript)) {
        throw "Company AI runner not found: $RunnerScript"
    }

    $outLog = Join-Path $env:TEMP 'jaewoon-company-ai-launch.out.log'
    $errLog = Join-Path $env:TEMP 'jaewoon-company-ai-launch.err.log'
    $arguments = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', "`"$RunnerScript`"",
        '-ProjectPath', "`"$Project`""
    )

    $process = Start-Process -FilePath $PowerShellExe -ArgumentList $arguments -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog

    Start-Sleep -Milliseconds 700
    if ($process.HasExited -and $process.ExitCode -ne 0) {
        Write-Host "[FAIL] Company AI runner exited immediately. code=$($process.ExitCode)"
        if (Test-Path $errLog) { Get-Content $errLog -Tail 30 }
        throw 'Company AI runner failed to start.'
    }

    Write-Host "[PASS] Jaewoon Company AI runner started. PID=$($process.Id)"
    Write-Host "[INFO] Company log: $env:TEMP\jaewoon-company-ai.log"
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$resolvedProject = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ProjectPath))
$setupScript = Join-Path $PSScriptRoot 'setup-unity-mcp.ps1'
$runnerScript = Join-Path $PSScriptRoot 'run-company-ai.ps1'
$powerShellExe = Get-CurrentPowerShellExe

if (-not (Test-Path $resolvedProject)) {
    throw "Unity project not found: $resolvedProject"
}

Write-Host "[INFO] Project: $resolvedProject"

# MCP Unity 패키지, uv, Unity 프로젝트 열기까지 기존 설치 스크립트에 맡긴다.
& $setupScript -ProjectPath $resolvedProject -InstallUv -OpenUnity

$uvx = Resolve-Uvx
if (-not $uvx) {
    throw 'uvx was not detected after setup. Open a new PowerShell and run: uvx --version'
}
Write-Host "[PASS] uvx: $uvx"

# VS Code를 열지 않아도 다른 로컬 MCP 클라이언트가 같은 설정을 참조할 수 있게 워크스페이스 설정은 유지한다.
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

# Unity MCP 서버는 localhost에만 열어 외부 노출을 막는다.
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
    Start-CompanyRunner -PowerShellExe $powerShellExe -RunnerScript $runnerScript -Project $ProjectPath
}

Write-Host ''
Write-Host 'UNITY:'
Write-Host 'MCP 창은 닫아도 된다. Unity Editor와 MCP 세션만 살아 있으면 된다.'
Write-Host ''
Write-Host 'COMPANY:'
Write-Host '재운컴퍼니 총괄 AI는 Codex -> Gemini CLI -> Copilot CLI -> CodeBuddy 순서로 사용 가능 상태를 확인한다.'
Write-Host '무료/현재 구독 포함 사용량이 막히거나 인증이 실패하면 다음 총괄로 순환한다.'
Write-Host '유료 API 키는 자동 총괄 실행에서 제거하며, 추가 크레딧 구매/플랜 업그레이드는 금지한다.'
Write-Host '핵심 결정이 필요한 경우에만 한재운 결정을 기다리고 자동 작업을 멈춘다.'
Write-Host ''
Write-Host '[READY] Local Unity + Jaewoon Company AI is configured.'
