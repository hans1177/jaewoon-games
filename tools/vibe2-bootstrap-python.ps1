# 파일명: tools/vibe2-bootstrap-python.ps1
$ErrorActionPreference = 'Stop'

$learningRoot = Join-Path $env:USERPROFILE 'jaewoon-vibe2-learning'
$pythonRoot = Join-Path $learningRoot 'python311-embedded'
$pythonExe = Join-Path $pythonRoot 'python.exe'
$toolCachePython = if ($env:RUNNER_TOOL_CACHE) { Join-Path $env:RUNNER_TOOL_CACHE 'Python\3.11.9\x64\python.exe' } else { $null }

function Test-NativeCommand([string]$exe, [string[]]$args) {
  $previous = $ErrorActionPreference
  $exitCode = 1
  try {
    $ErrorActionPreference = 'Continue'
    & $exe @args 2>&1 | Out-Null
    $exitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previous
  }
  return ($exitCode -eq 0)
}

function Test-VibePython([string]$candidate) {
  if ([string]::IsNullOrWhiteSpace($candidate) -or -not (Test-Path $candidate)) { return $false }
  if (-not (Test-NativeCommand $candidate @('-c', 'import sys; assert sys.version_info[:2] == (3, 11)'))) { return $false }
  if (-not (Test-NativeCommand $candidate @('-m', 'pip', '--version'))) { return $false }
  return $true
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

Write-Host 'PYTHON_ML_STACK=ENSURING'
& $resolved -m pip install --disable-pip-version-check --no-warn-script-location --index-url 'https://download.pytorch.org/whl/cu121' 'torch==2.5.1+cu121'
if ($LASTEXITCODE -ne 0) { throw 'CUDA PyTorch installation failed' }
& $resolved -m pip install --disable-pip-version-check --no-warn-script-location 'transformers>=4.51,<5' 'peft>=0.14,<1' 'accelerate>=1,<2' sentencepiece
if ($LASTEXITCODE -ne 0) { throw 'Unity LoRA dependency installation failed' }

$pythonDir = Split-Path -Parent $resolved
$scriptsDir = Join-Path $pythonDir 'Scripts'
"PYTHON_EXE=$resolved" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
$pythonDir | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
if (Test-Path $scriptsDir) { $scriptsDir | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append }

$nvidiaSmi = $null
$nvidiaCandidates = @(
  (Join-Path $env:WINDIR 'System32\nvidia-smi.exe'),
  (Join-Path $env:ProgramFiles 'NVIDIA Corporation\NVSMI\nvidia-smi.exe')
)
foreach ($candidate in $nvidiaCandidates) {
  if (Test-Path $candidate) {
    $nvidiaSmi = $candidate
    break
  }
}
if (-not $nvidiaSmi) {
  $driverStore = Join-Path $env:WINDIR 'System32\DriverStore\FileRepository'
  if (Test-Path $driverStore) {
    $nvidiaSmi = Get-ChildItem -Path $driverStore -Filter 'nvidia-smi.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  }
}
if ($nvidiaSmi) {
  $nvidiaDir = Split-Path -Parent $nvidiaSmi
  $nvidiaDir | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
  Write-Host "NVIDIA_SMI_FOUND=$nvidiaSmi"
} else {
  Write-Host 'NVIDIA_SMI_FOUND=NO'
}

try {
  $videoControllers = @(Get-CimInstance Win32_VideoController -ErrorAction Stop)
  Write-Host "WINDOWS_GPU_COUNT=$($videoControllers.Count)"
  for ($i = 0; $i -lt $videoControllers.Count; $i++) {
    $gpu = $videoControllers[$i]
    Write-Host "WINDOWS_GPU_${i}_NAME=$($gpu.Name)"
    Write-Host "WINDOWS_GPU_${i}_VENDOR=$($gpu.AdapterCompatibility)"
    Write-Host "WINDOWS_GPU_${i}_DRIVER=$($gpu.DriverVersion)"
    Write-Host "WINDOWS_GPU_${i}_PROCESSOR=$($gpu.VideoProcessor)"
    Write-Host "WINDOWS_GPU_${i}_STATUS=$($gpu.Status)"
  }
} catch {
  Write-Host "WINDOWS_GPU_QUERY=UNAVAILABLE:$($_.Exception.Message)"
}

& $resolved --version
& $resolved -m pip --version
& $resolved -c "import torch, transformers, peft, accelerate; available=torch.cuda.is_available(); print('PYTHON_ML_STACK=PASS'); print('TORCH=' + torch.__version__); print('TORCH_CUDA=' + str(torch.version.cuda)); print('TORCH_CUDA_AVAILABLE=' + str(available)); print('TORCH_GPU_NAME=' + (torch.cuda.get_device_name(0) if available else 'NONE')); print('TORCH_GPU_MEMORY=' + (str(torch.cuda.get_device_properties(0).total_memory) if available else '0'))"
if ($LASTEXITCODE -ne 0) { throw 'Unity LoRA runtime validation failed' }
Write-Host 'PYTHON_RUNTIME=PASS'
Write-Host 'PYTHON_BOOTSTRAP=REGISTRY_FREE_EMBEDDED'
Write-Host "PYTHON_EXE=$resolved"
