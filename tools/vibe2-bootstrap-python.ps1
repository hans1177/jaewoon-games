# 파일명: tools/vibe2-bootstrap-python.ps1
$ErrorActionPreference = 'Stop'

$learningRoot = Join-Path $env:USERPROFILE 'jaewoon-vibe2-learning'
$pythonRoot = Join-Path $learningRoot 'python311'
$pythonExe = Join-Path $pythonRoot 'python.exe'
$toolCachePython = if ($env:RUNNER_TOOL_CACHE) { Join-Path $env:RUNNER_TOOL_CACHE 'Python\3.11.9\x64\python.exe' } else { $null }

function Test-VibePython([string]$candidate) {
  if ([string]::IsNullOrWhiteSpace($candidate) -or -not (Test-Path $candidate)) { return $false }
  & $candidate -c "import sys; assert sys.version_info[:2] == (3, 11); print(sys.executable)" *> $null
  if ($LASTEXITCODE -ne 0) { return $false }
  & $candidate -m pip --version *> $null
  return $LASTEXITCODE -eq 0
}

$candidates = @()
if ($toolCachePython) { $candidates += $toolCachePython }
$candidates += $pythonExe

$resolved = $null
foreach ($candidate in $candidates) {
  if (Test-VibePython $candidate) {
    $resolved = $candidate
    break
  }
}

if (-not $resolved) {
  New-Item -ItemType Directory -Path $learningRoot -Force | Out-Null
  $installer = Join-Path $env:RUNNER_TEMP 'python-3.11.9-amd64.exe'
  if (-not (Test-Path $installer)) {
    Invoke-WebRequest -UseBasicParsing -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -OutFile $installer
  }
  if (Test-Path $pythonRoot) { Remove-Item $pythonRoot -Recurse -Force }
  $args = @(
    '/quiet',
    'InstallAllUsers=0',
    "TargetDir=$pythonRoot",
    'Include_pip=1',
    'Include_launcher=0',
    'Include_test=0',
    'PrependPath=0',
    'Shortcuts=0'
  )
  $process = Start-Process -FilePath $installer -ArgumentList $args -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw "Python user install failed with exit code $($process.ExitCode)" }
  if (-not (Test-VibePython $pythonExe)) { throw 'Python user install finished but python/pip validation failed' }
  $resolved = $pythonExe
}

$pythonDir = Split-Path -Parent $resolved
$scriptsDir = Join-Path $pythonDir 'Scripts'
"PYTHON_EXE=$resolved" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
$pythonDir | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
if (Test-Path $scriptsDir) { $scriptsDir | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append }

& $resolved --version
& $resolved -m pip --version
Write-Host "PYTHON_RUNTIME=PASS"
Write-Host "PYTHON_EXE=$resolved"
