# 파일명: setup-unity-mcp.ps1
# 역할: Unity 프로젝트에 MCP for Unity를 안전하게 연결하고 로컬 AI 제어 환경을 준비한다.

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,

    [switch]$InstallUv,
    [switch]$OpenUnity
)

$ErrorActionPreference = 'Stop'

$PackageName = 'com.coplaydev.unity-mcp'
$PackageUrl = 'https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.0.0'

function Resolve-UnityExe {
    $hubRoot = Join-Path $env:ProgramFiles 'Unity\Hub\Editor'
    if (-not (Test-Path $hubRoot)) { return $null }

    $candidates = Get-ChildItem -Path $hubRoot -Directory -ErrorAction SilentlyContinue |
        ForEach-Object {
            $exe = Join-Path $_.FullName 'Editor\Unity.exe'
            if (Test-Path $exe) {
                [pscustomobject]@{ Version = $_.Name; Exe = $exe; Time = $_.LastWriteTimeUtc }
            }
        } |
        Sort-Object Time -Descending

    return $candidates | Select-Object -First 1
}

function Resolve-UncreatedPath([string]$Path) {
    return $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
}

function Refresh-ProcessPath {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @($machinePath, $userPath) | Where-Object { $_ }
    $env:Path = ($parts -join ';')
}

function Resolve-Uv {
    $cmd = Get-Command uv -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $knownPaths = @(
        (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\uv.exe'),
        (Join-Path $env:USERPROFILE '.local\bin\uv.exe')
    )
    foreach ($candidate in $knownPaths) {
        if (Test-Path $candidate) { return $candidate }
    }
    return $null
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Test-UnityProjectAlreadyOpen([string]$Project) {
    $normalized = [System.IO.Path]::GetFullPath($Project).TrimEnd('\').ToLowerInvariant()
    try {
        $processes = Get-CimInstance Win32_Process -Filter "Name='Unity.exe'" -ErrorAction Stop
        foreach ($process in $processes) {
            $commandLine = [string]$process.CommandLine
            if (-not $commandLine) { continue }
            $candidate = $commandLine.ToLowerInvariant().Replace('/', '\')
            if ($candidate.Contains($normalized.Replace('/', '\'))) {
                return $true
            }
        }
    } catch {
        # 프로세스 조회가 막힌 환경에서는 Unity 자체 중복 실행 검사를 사용한다.
    }
    return $false
}

$unity = Resolve-UnityExe
if (-not $unity) {
    throw 'Unity Hub editor install was not detected under Program Files.'
}
Write-Host "[PASS] Unity detected: $($unity.Version)"

$resolvedProject = Resolve-UncreatedPath $ProjectPath
$manifestPath = Join-Path $resolvedProject 'Packages\manifest.json'
$projectVersionPath = Join-Path $resolvedProject 'ProjectSettings\ProjectVersion.txt'
$embeddedPackagePath = Join-Path $resolvedProject "Packages\$PackageName"
$embeddedPackageJson = Join-Path $embeddedPackagePath 'package.json'

if (-not (Test-Path $resolvedProject)) {
    $parent = Split-Path $resolvedProject -Parent
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    Write-Host "[INFO] Unity project does not exist. Creating: $resolvedProject"
    $process = Start-Process -FilePath $unity.Exe -ArgumentList @(
        '-quit',
        '-batchmode',
        '-createProject',
        $resolvedProject
    ) -Wait -PassThru

    if ($process.ExitCode -ne 0) {
        throw "Unity project creation failed with exit code $($process.ExitCode)."
    }
}

if (-not (Test-Path $manifestPath)) {
    throw "Unity project manifest not found after project creation/open: $manifestPath"
}
if (-not (Test-Path $projectVersionPath)) {
    throw "Unity ProjectSettings not found after project creation/open: $projectVersionPath"
}

# MCP 패키지 연결
# Unity Package Manager는 manifest.json 앞의 UTF-8 BOM을 거부할 수 있으므로 항상 BOM 없이 다시 쓴다.
$manifestText = [System.IO.File]::ReadAllText($manifestPath).TrimStart([char]0xFEFF)
$manifest = $manifestText | ConvertFrom-Json
if (-not $manifest.dependencies) {
    $manifest | Add-Member -MemberType NoteProperty -Name dependencies -Value ([pscustomobject]@{})
}

if (Test-Path $embeddedPackageJson) {
    $existing = $manifest.dependencies.PSObject.Properties[$PackageName]
    if ($existing) {
        $manifest.dependencies.PSObject.Properties.Remove($PackageName)
    }
    $manifestJson = $manifest | ConvertTo-Json -Depth 32
    Write-Utf8NoBom $manifestPath $manifestJson
    Write-Host "[PASS] MCP for Unity embedded package detected: $embeddedPackagePath"
} else {
    $existing = $manifest.dependencies.PSObject.Properties[$PackageName]
    if ($existing) {
        $existing.Value = $PackageUrl
    } else {
        $manifest.dependencies | Add-Member -MemberType NoteProperty -Name $PackageName -Value $PackageUrl
    }

    $manifestJson = $manifest | ConvertTo-Json -Depth 32
    Write-Utf8NoBom $manifestPath $manifestJson
    Write-Host "[PASS] MCP for Unity pinned: $PackageUrl"
}

# uv 준비
$uvPath = Resolve-Uv
if (-not $uvPath -and $InstallUv) {
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        throw 'uv is missing and winget is not available. Install uv manually from https://docs.astral.sh/uv/getting-started/installation/'
    }

    & winget install --id=astral-sh.uv -e --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "uv installation failed with winget exit code $LASTEXITCODE."
    }

    Refresh-ProcessPath
    $uvPath = Resolve-Uv
}

if ($uvPath) {
    $uvVersion = & $uvPath --version 2>$null
    Write-Host "[PASS] uv: $uvPath ($uvVersion)"
} else {
    Write-Host '[NEEDS-LOCAL] uv was not detected. Open a new PowerShell and run: uv --version'
}

# Android 모듈 확인
$androidRoot = Join-Path (Split-Path $unity.Exe -Parent) 'Data\PlaybackEngines\AndroidPlayer'
if (Test-Path $androidRoot) {
    $sdk = Test-Path (Join-Path $androidRoot 'SDK')
    $ndk = Test-Path (Join-Path $androidRoot 'NDK')
    $jdk = Test-Path (Join-Path $androidRoot 'OpenJDK')
    if ($sdk -and $ndk -and $jdk) {
        Write-Host '[PASS] Android SDK / NDK / OpenJDK detected.'
    } else {
        Write-Host "[NEEDS-LOCAL] Android components incomplete. SDK=$sdk NDK=$ndk OpenJDK=$jdk"
    }
} else {
    Write-Host '[NEEDS-LOCAL] Android Build Support missing: Unity Hub > Installs > Unity 6.6 > Add modules.'
}

# Unity 실행
if ($OpenUnity) {
    if (Test-UnityProjectAlreadyOpen $resolvedProject) {
        Write-Host '[PASS] Unity project is already open. Duplicate launch skipped.'
    } else {
        Start-Process -FilePath $unity.Exe -ArgumentList @('-projectPath', $resolvedProject)
        Write-Host '[PASS] Unity launch requested.'
    }
}

Write-Host ''
Write-Host 'ONE-TIME UNITY STEP:'
Write-Host 'Window > MCP for Unity > Configure All Detected Clients'
Write-Host ''
Write-Host 'POLICY: local MCP only / Unity AI not required / paid AI auto-spend disabled by project policy.'
