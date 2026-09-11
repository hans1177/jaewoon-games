# 파일명: tools/vibe2-bootstrap-python.ps1
$ErrorActionPreference = 'Stop'

$learningRoot = Join-Path $env:USERPROFILE 'jaewoon-vibe2-learning'
$pythonRoot = Join-Path $learningRoot 'python311-embedded'
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
  if (Test-Path $pythonRoot) { Remove-Item $pythonRoot -Recurse -Force }
  New-Item -ItemType Directory -Path $pythonRoot -Force | Out-Null

  $archive = Join-Path $env:RUNNER_TEMP 'python-3.11.9-embed-amd64.zip'
  Invoke-WebRequest -UseBasicParsing -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' -OutFile $archive
  Expand-Archive -LiteralPath $archive -DestinationPath $pythonRoot -Force

  $pthFile = Join-Path $pythonRoot 'python311._pth'
  if (-not (Test-Path $pthFile)) { throw 'embedded Python path configuration is missing' }
  $pth = Get-Content $pthFile
  $normalized = @()
  foreach ($line in $pth) {
    if ($line.Trim() -eq '#import site') { $normalized += 'import site' }
    else { $normalized += $line }
  }
  if (-not ($normalized -contains 'Lib\site-packages')) { $normalized += 'Lib\site-packages' }
  Set-Content -Path $pthFile -Value $normalized -Encoding Ascii
  New-Item -ItemType Directory -Path (Join-Path $pythonRoot 'Lib\site-packages') -Force | Out-Null

  $getPip = Join-Path $env:RUNNER_TEMP 'get-pip.py'
  Invoke-WebRequest -UseBasicParsing -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile $getPip
  & $pythonExe $getPip --disable-pip-version-check --no-warn-script-location
  if ($LASTEXITCODE -ne 0) { throw 'embedded Python pip bootstrap failed' }
  if (-not (Test-VibePython $pythonExe)) { throw 'embedded Python validation failed' }
  $resolved = $pythonExe
}

$pythonDir = Split-Path -Parent $resolved
$scriptsDir = Join-Path $pythonDir 'Scripts'
"PYTHON_EXE=$resolved" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
$pythonDir | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
if (Test-Path $scriptsDir) { $scriptsDir | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append }

& $resolved --version
& $resolved -m pip --version
Write-Host 'PYTHON_RUNTIME=PASS'
Write-Host 'PYTHON_BOOTSTRAP=REGISTRY_FREE_EMBEDDED'
Write-Host "PYTHON_EXE=$resolved"
