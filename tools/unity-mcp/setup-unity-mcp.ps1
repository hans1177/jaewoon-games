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

$resolvedProject = (Resolve-Path $ProjectPath).Path
$manifestPath = Join-Path $resolvedProject 'Packages\manifest.json'
$projectVersionPath = Join-Path $resolvedProject 'ProjectSettings\ProjectVersion.txt'

if (-not (Test-Path $manifestPath)) {
    throw "Unity project not found: $manifestPath"
}
if (-not (Test-Path $projectVersionPath)) {
    throw "Unity ProjectSettings not found: $projectVersionPath"
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

$uv = Get-Command uv -ErrorAction SilentlyContinue
if (-not $uv -and $InstallUv) {
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        throw 'uv is missing and winget is not available. Install uv manually from https://docs.astral.sh/uv/getting-started/installation/'
    }
    & winget install --id=astral-sh.uv -e --accept-package-agreements --accept-source-agreements
    $uv = Get-Command uv -ErrorAction SilentlyContinue
}

if ($uv) {
    Write-Host "[PASS] uv: $($uv.Source)"
} else {
    Write-Host '[NEEDS-LOCAL] uv is not installed. Run this script again with -InstallUv or install uv manually.'
}

$unity = Resolve-UnityExe
if ($unity) {
    Write-Host "[PASS] Unity detected: $($unity.Version)"
    $androidRoot = Join-Path (Split-Path $unity.Exe -Parent) 'Data\PlaybackEngines\AndroidPlayer'
    if (Test-Path $androidRoot) {
        Write-Host '[PASS] Android Build Support detected.'
    } else {
        Write-Host '[NEEDS-LOCAL] Android Build Support was not detected for this Unity install.'
    }

    if ($OpenUnity) {
        Start-Process -FilePath $unity.Exe -ArgumentList @('-projectPath', $resolvedProject)
        Write-Host '[PASS] Unity launch requested.'
    }
} else {
    Write-Host '[NEEDS-LOCAL] Unity Hub editor install was not detected under Program Files.'
}

Write-Host ''
Write-Host 'ONE-TIME UNITY STEP:'
Write-Host 'Window > MCP for Unity > Configure All Detected Clients'
Write-Host ''
Write-Host 'POLICY: local MCP only / Unity AI not required / paid AI auto-spend disabled by project policy.'
