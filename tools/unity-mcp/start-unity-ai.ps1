# 파일명: start-unity-ai.ps1
# 역할: 대충 RPG Unity 프로젝트의 MCP 브리지와 VS Code AI 작업 환경을 한 번에 시작한다.

param(
    [string]$ProjectPath = '.\unity-games\daechung-rpg'
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

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$resolvedProject = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ProjectPath))
$setupScript = Join-Path $PSScriptRoot 'setup-unity-mcp.ps1'

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

# VS Code 워크스페이스 MCP 설정이 로컬에도 존재하는지 보장한다.
$vscodeDir = Join-Path $repoRoot '.vscode'
$mcpConfig = Join-Path $vscodeDir 'mcp.json'
if (-not (Test-Path $vscodeDir)) {
    New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null
}
if (-not (Test-Path $mcpConfig)) {
    @'
{
  "servers": {
    "unityMCP": {
      "type": "http",
      "url": "http://127.0.0.1:8080/mcp"
    }
  }
}
'@ | Set-Content -Path $mcpConfig -Encoding utf8
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
        Write-Host "[FAIL] Unity MCP server did not open port 8080."
        Write-Host "stdout: $outLog"
        Write-Host "stderr: $errLog"
        if (Test-Path $errLog) { Get-Content $errLog -Tail 30 }
        exit 1
    }

    Write-Host "[PASS] Unity MCP server started. PID=$($process.Id)"
    Write-Host "[INFO] Logs: $outLog / $errLog"
}

Write-Host ''
Write-Host 'UNITY ONE-TIME CHECK:'
Write-Host 'Window > MCP for Unity > Start Bridge (Stopped일 때만)'
Write-Host ''
Write-Host 'VS CODE:'
Write-Host 'Chat의 Agent 목록에서 "재운 총괄 AI"를 선택하고 작업을 시작하면 기획/개발/QA/그래픽/밸런스 하위 AI에 분배한다.'
Write-Host ''
Write-Host '[READY] Local Unity AI workspace is configured.'
