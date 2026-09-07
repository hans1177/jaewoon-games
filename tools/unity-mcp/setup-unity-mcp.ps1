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

$unity = Resolve-UnityExe
if (-not $unity) {
    throw 'Unity Hub editor install was not detected under Program Files.'
}
Write-Host "[PASS] Unity detected: $($unity.Version)"

$resolvedProject = Resolve-UncreatedPath $ProjectPath
$manifestPath = Join-Path $resolvedProject 'Packages\manifest.json'
$projectVersionPath = Join-Path $resolvedProject 'ProjectSettings\ProjectVersion.txt'

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

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
if (-not $manifest.dependencies) {
    $manifest | Add-Member -MemberType NoteProperty -Name dependencies -Value ([pscustomobject]@{})
}

$existing = $manifest.dependencies.PSObject.Properties[$PackageName]
if ($existing) {
    $existing.Value = $PackageUrl
} else {
    $manifest.dependencies | Add-Member -MemberType NoteProperty -Name $PackageName -Value $PackageUrl
}

$manifest | ConvertTo-Json -Depth 32 | Set-Content -Path $manifestPath -Encoding utf8
Write-Host "[PASS] MCP for Unity pinned: $PackageUrl"

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

$androidRoot = Join-Path (Split-Path $unity.Exe -Parent) 'Data\PlaybackEngines\AndroidPlayer'
if (Test-Path $androidRoot) {
    Write-Host '[PASS] Android Build Support detected.'
} else {
    Write-Host '[NEEDS-LOCAL] Android Build Support missing: Unity Hub > Installs > Unity 6.6 > Add modules > Android Build Support + Android SDK & NDK Tools + OpenJDK.'
}

if ($OpenUnity) {
    Start-Process -FilePath $unity.Exe -ArgumentList @('-projectPath', $resolvedProject)
    Write-Host '[PASS] Unity launch requested.'
}

Write-Host ''
Write-Host 'ONE-TIME UNITY STEP:'
Write-Host 'Window > MCP for Unity > Configure All Detected Clients'
Write-Host ''
Write-Host 'POLICY: local MCP only / Unity AI not required / paid AI auto-spend disabled by project policy.'
