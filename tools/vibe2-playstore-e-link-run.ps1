param(
  [string]$TargetRoot = 'E:\Android',
  [string]$AvdName = 'Vibe2PlayStore',
  [string]$RunnerPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$sourceSdk = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk'
$targetSdk = Join-Path $TargetRoot 'Sdk'
$targetAvd = Join-Path $TargetRoot 'avd'
$avdConfig = Join-Path $targetAvd "$AvdName.avd\config.ini"

if (-not (Test-Path -LiteralPath $avdConfig)) { throw "E_AVD_CONFIG_NOT_FOUND:$avdConfig" }
$cfg = [System.IO.File]::ReadAllText($avdConfig)
$m = [regex]::Match($cfg, '(?im)^image\.sysdir\.1\s*=\s*(.+?)\s*$')
if (-not $m.Success) { throw "AVD_IMAGE_SYSDIR_NOT_FOUND:$avdConfig" }
$relativeImage = $m.Groups[1].Value.Trim().TrimEnd('\','/')
if ($relativeImage -notmatch '(?i)google_apis_playstore[\\/]x86_64$') { throw "AVD_NOT_PLAY_STORE_IMAGE:$relativeImage" }

$relativeFs = $relativeImage -replace '/', '\'
$targetImage = Join-Path $targetSdk $relativeFs
$sourceImage = Join-Path $sourceSdk $relativeFs

foreach ($required in @('system.img','vendor.img','ramdisk.img','source.properties')) {
  if (-not (Test-Path -LiteralPath (Join-Path $targetImage $required))) { throw "E_SYSTEM_IMAGE_INCOMPLETE:$targetImage missing=$required" }
}

$parent = Split-Path $sourceImage -Parent
New-Item -ItemType Directory -Force $parent | Out-Null

if (Test-Path -LiteralPath $sourceImage) {
  $item = Get-Item -LiteralPath $sourceImage -Force
  $isLink = (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
  if ($isLink) {
    Write-Host "C_SYSTEM_IMAGE_LINK_ALREADY_EXISTS=$sourceImage"
  } else {
    $hasRealImage = Test-Path -LiteralPath (Join-Path $sourceImage 'system.img')
    if ($hasRealImage) {
      Write-Host "C_SYSTEM_IMAGE_ALREADY_VALID=$sourceImage"
    } else {
      Remove-Item -LiteralPath $sourceImage -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

if (-not (Test-Path -LiteralPath $sourceImage)) {
  $cmd = "mklink /J `"$sourceImage`" `"$targetImage`""
  $out = & $env:ComSpec /d /c $cmd 2>&1
  if ($LASTEXITCODE -ne 0) { throw "SYSTEM_IMAGE_JUNCTION_CREATE_FAILED:$($out -join ' ')" }
  Write-Host "C_TO_E_SYSTEM_IMAGE_JUNCTION=CREATED"
  Write-Host "JUNCTION_SOURCE=$sourceImage"
  Write-Host "JUNCTION_TARGET=$targetImage"
}

if (-not (Test-Path -LiteralPath (Join-Path $sourceImage 'system.img'))) { throw "SYSTEM_IMAGE_JUNCTION_VERIFY_FAILED:$sourceImage" }

if ([string]::IsNullOrWhiteSpace($RunnerPath)) { $RunnerPath = Join-Path $PSScriptRoot 'vibe2-playstore-e-run.ps1' }
if (-not (Test-Path -LiteralPath $RunnerPath)) { throw "E_RUNNER_NOT_FOUND:$RunnerPath" }

Write-Host 'SYSTEM_IMAGE_ROUTE=E_DRIVE_DATA_VIA_C_SDK_JUNCTION'
& powershell -ExecutionPolicy Bypass -File $RunnerPath
exit $LASTEXITCODE
