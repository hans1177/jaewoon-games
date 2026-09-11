param(
  [string]$GameId = 'block-blast',
  [int]$InstallWaitMinutes = 30,
  [string]$TargetRoot = 'E:\Android'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Find-SourceSdk {
  $candidates = @(
    (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk'),
    $env:ANDROID_SDK_ROOT,
    $env:ANDROID_HOME
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  foreach ($candidate in @($candidates | Select-Object -Unique)) {
    if (Test-Path -LiteralPath (Join-Path $candidate 'cmdline-tools\latest\bin\avdmanager.bat')) {
      return $candidate
    }
  }
  throw 'SOURCE_ANDROID_SDK_WITH_CMDLINE_TOOLS_NOT_FOUND'
}

function Invoke-CmdWithInputFile {
  param(
    [string]$Exe,
    [string[]]$ArgumentList,
    [string]$InputFile,
    [string]$OutputFile
  )
  $qExe = '"' + $Exe.Replace('"','""') + '"'
  $qArgs = @($ArgumentList | ForEach-Object { '"' + ([string]$_).Replace('"','""') + '"' }) -join ' '
  $qIn = '"' + $InputFile.Replace('"','""') + '"'
  $qOut = '"' + $OutputFile.Replace('"','""') + '"'
  $command = "call $qExe $qArgs < $qIn > $qOut 2>&1"
  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    & $env:ComSpec /d /s /c $command
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $old
  }
  $output = @()
  if (Test-Path -LiteralPath $OutputFile) {
    $output = @([System.IO.File]::ReadAllLines($OutputFile) | ForEach-Object { [string]$_ })
  }
  [pscustomobject]@{ ExitCode=[int]$code; Output=$output }
}

if (-not (Test-Path -LiteralPath 'E:\')) { throw 'E_DRIVE_NOT_FOUND' }

$sourceSdk = Find-SourceSdk
$targetSdk = Join-Path $TargetRoot 'Sdk'
$targetAvd = Join-Path $TargetRoot 'avd'
$targetTemp = Join-Path $TargetRoot 'temp'
New-Item -ItemType Directory -Force $targetSdk,$targetAvd,$targetTemp | Out-Null

$sourceCmdline = Join-Path $sourceSdk 'cmdline-tools\latest'
$targetCmdline = Join-Path $targetSdk 'cmdline-tools\latest'
$targetAvdManager = Join-Path $targetCmdline 'bin\avdmanager.bat'

if (-not (Test-Path -LiteralPath $targetAvdManager)) {
  Write-Host "COPYING_CMDLINE_TOOLS_TO_E=$sourceCmdline"
  New-Item -ItemType Directory -Force (Split-Path $targetCmdline -Parent) | Out-Null
  if (Test-Path -LiteralPath $targetCmdline) {
    Remove-Item -LiteralPath $targetCmdline -Recurse -Force -ErrorAction SilentlyContinue
  }
  Copy-Item -LiteralPath $sourceCmdline -Destination $targetCmdline -Recurse -Force
}

if (-not (Test-Path -LiteralPath $targetAvdManager)) {
  throw "E_AVDMANAGER_NOT_FOUND:$targetAvdManager"
}

$images = @()
$systemImagesRoot = Join-Path $targetSdk 'system-images'
if (Test-Path -LiteralPath $systemImagesRoot) {
  $images = @(Get-ChildItem $systemImagesRoot -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -eq 'x86_64' -and
    $_.Parent -and $_.Parent.Name -eq 'google_apis_playstore' -and
    $_.Parent.Parent -and $_.Parent.Parent.Name -match '^android-\d+$' -and
    (Test-Path -LiteralPath (Join-Path $_.FullName 'system.img')) -and
    (Test-Path -LiteralPath (Join-Path $_.FullName 'vendor.img'))
  })
}
if ($images.Count -eq 0) { throw 'E_PLAY_STORE_SYSTEM_IMAGE_NOT_FOUND' }

$bestImage = $images | Sort-Object { [int]($_.Parent.Parent.Name -replace '^android-','') } -Descending | Select-Object -First 1
$api = [int]($bestImage.Parent.Parent.Name -replace '^android-','')
$imagePackage = "system-images;android-$api;google_apis_playstore;x86_64"

$env:ANDROID_SDK_ROOT = $targetSdk
$env:ANDROID_HOME = $targetSdk
$env:ANDROID_AVD_HOME = $targetAvd
$env:ANDROID_EMULATOR_HOME = $TargetRoot
$env:TEMP = $targetTemp
$env:TMP = $targetTemp

$noFile = Join-Path $targetTemp 'avd-no.txt'
$outFile = Join-Path $targetTemp 'avd-create-output.txt'
(1..30 | ForEach-Object { 'no' }) | Set-Content -LiteralPath $noFile -Encoding ASCII

$playAvd = 'Vibe2PlayStore'
$avdDir = Join-Path $targetAvd "$playAvd.avd"
$avdConfig = Join-Path $avdDir 'config.ini'
$avdIni = Join-Path $targetAvd "$playAvd.ini"

Write-Host "SOURCE_ANDROID_SDK=$sourceSdk"
Write-Host "E_ANDROID_SDK=$targetSdk"
Write-Host "E_AVDMANAGER=$targetAvdManager"
Write-Host "PLAY_STORE_IMAGE=$imagePackage"
Write-Host "E_ANDROID_AVD=$targetAvd"

$ready = $false
if (Test-Path -LiteralPath $avdConfig) {
  $raw = [System.IO.File]::ReadAllText($avdConfig)
  if ($raw -match '(?im)^PlayStore\.enabled\s*=\s*yes\s*$') { $ready = $true }
}

if (-not $ready) {
  Remove-Item -LiteralPath $avdDir -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $avdIni -Force -ErrorAction SilentlyContinue

  Write-Host "CREATING_PLAY_STORE_AVD=$playAvd"
  $create = Invoke-CmdWithInputFile $targetAvdManager @('create','avd','--name',$playAvd,'--package',$imagePackage,'--device','pixel_6','--force') $noFile $outFile
  if ($create.ExitCode -ne 0) {
    $create = Invoke-CmdWithInputFile $targetAvdManager @('create','avd','--name',$playAvd,'--package',$imagePackage,'--device','pixel','--force') $noFile $outFile
  }
  if ($create.ExitCode -ne 0) {
    throw "AVD_CREATE_FAILED:$(@($create.Output | Select-Object -Last 40) -join "`n")"
  }
  if (-not (Test-Path -LiteralPath $avdConfig)) {
    throw "AVD_CONFIG_NOT_CREATED:$avdConfig"
  }
  $raw = [System.IO.File]::ReadAllText($avdConfig)
  if ($raw -notmatch '(?im)^PlayStore\.enabled\s*=\s*yes\s*$') {
    throw "AVD_CREATED_WITHOUT_PLAY_STORE:$avdConfig"
  }
  Write-Host "CREATED_PLAY_STORE_AVD=$playAvd"
} else {
  Write-Host "PLAY_STORE_AVD_ALREADY_READY=$playAvd"
}

$oneClick = Join-Path $PSScriptRoot 'vibe2-playstore-oneclick.ps1'
if (-not (Test-Path -LiteralPath $oneClick)) { throw "ONECLICK_SCRIPT_NOT_FOUND:$oneClick" }
Write-Host 'STARTING_VIBE2_ONECLICK=YES'
& powershell -ExecutionPolicy Bypass -File $oneClick -GameId $GameId -InstallWaitMinutes $InstallWaitMinutes
exit $LASTEXITCODE
