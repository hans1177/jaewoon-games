param(
  [string]$GameId = 'block-blast',
  [int]$InstallWaitMinutes = 30,
  [string]$TargetRoot = 'E:\Android'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Find-ExistingAndroidSdk {
  $candidates = @(
    (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk'),
    $env:ANDROID_SDK_ROOT,
    $env:ANDROID_HOME
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  foreach ($candidate in @($candidates | Select-Object -Unique)) {
    if (Test-Path -LiteralPath (Join-Path $candidate 'platform-tools\adb.exe')) { return $candidate }
  }
  throw 'SOURCE_ANDROID_SDK_NOT_FOUND'
}

function Find-CmdlineTool {
  param([string]$SdkRoot,[string]$Name)
  $paths = New-Object System.Collections.Generic.List[string]
  $paths.Add((Join-Path $SdkRoot "cmdline-tools\latest\bin\$Name.bat"))
  $cmdRoot = Join-Path $SdkRoot 'cmdline-tools'
  if (Test-Path -LiteralPath $cmdRoot) {
    Get-ChildItem $cmdRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
      $paths.Add((Join-Path $_.FullName "bin\$Name.bat"))
    }
  }
  $paths.Add((Join-Path $SdkRoot "tools\bin\$Name.bat"))
  foreach ($path in $paths) { if (Test-Path -LiteralPath $path) { return $path } }
  throw "$($Name.ToUpperInvariant())_NOT_FOUND"
}

function Set-AndroidJava {
  $javaCandidates = @(
    (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'),
    (Join-Path $env:ProgramFiles 'Android\Android Studio\jre')
  )
  foreach ($javaCandidate in $javaCandidates) {
    $javaExe = Join-Path $javaCandidate 'bin\java.exe'
    if (Test-Path -LiteralPath $javaExe) {
      $env:JAVA_HOME = $javaCandidate
      $env:Path = "$(Join-Path $javaCandidate 'bin');$env:Path"
      Write-Host "JAVA_HOME=$javaCandidate"
      return
    }
  }
}

function Quote-CmdArg {
  param([string]$Value)
  '"' + $Value.Replace('"','""') + '"'
}

function Invoke-CmdWithInputFile {
  param(
    [string]$Exe,
    [string[]]$ArgumentList,
    [string]$InputFile,
    [string]$OutputFile
  )
  $exePart = Quote-CmdArg $Exe
  $argPart = @($ArgumentList | ForEach-Object { Quote-CmdArg ([string]$_) }) -join ' '
  $inPart = Quote-CmdArg $InputFile
  $outPart = Quote-CmdArg $OutputFile
  $command = "call $exePart $argPart < $inPart > $outPart 2>&1"
  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    & $env:ComSpec /d /s /c $command
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $old }
  $output = @()
  if (Test-Path -LiteralPath $OutputFile) {
    $output = @([System.IO.File]::ReadAllLines($OutputFile) | ForEach-Object { [string]$_ })
  }
  [pscustomobject]@{ ExitCode=[int]$code; Output=$output; Command=$command }
}

function Invoke-Native {
  param([string]$Exe,[string[]]$ArgumentList)
  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & $Exe @ArgumentList 2>&1
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $old }
  [pscustomobject]@{ ExitCode=[int]$code; Output=@($output | ForEach-Object { [string]$_ }) }
}

function Test-PlayStoreImageComplete {
  param([string]$ImagePath)
  if (-not (Test-Path -LiteralPath $ImagePath)) { return $false }
  $required = @('source.properties','system.img','vendor.img','ramdisk.img')
  foreach ($name in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $ImagePath $name))) { return $false }
  }
  $true
}

if (-not (Test-Path -LiteralPath 'E:\')) { throw 'E_DRIVE_NOT_FOUND' }
$drive = Get-PSDrive E
if ($drive.Free -lt 12GB) { throw "E_DRIVE_FREE_SPACE_TOO_LOW:$([math]::Round($drive.Free/1GB,2))GB; need at least 12GB" }

$sourceSdk = Find-ExistingAndroidSdk
$sdkManager = Find-CmdlineTool $sourceSdk 'sdkmanager'
$avdManager = Find-CmdlineTool $sourceSdk 'avdmanager'
$targetSdk = Join-Path $TargetRoot 'Sdk'
$targetAvd = Join-Path $TargetRoot 'avd'
$targetTemp = Join-Path $TargetRoot 'temp'
New-Item -ItemType Directory -Force $targetSdk,$targetAvd,$targetTemp | Out-Null

$sourceTemp = Join-Path $sourceSdk '.temp'
if (Test-Path -LiteralPath $sourceTemp) {
  Remove-Item (Join-Path $sourceTemp '*') -Recurse -Force -ErrorAction SilentlyContinue
}

Set-AndroidJava
$env:TEMP = $targetTemp
$env:TMP = $targetTemp

$yesFile = Join-Path $targetTemp 'sdkmanager-yes.txt'
$noFile = Join-Path $targetTemp 'avdmanager-no.txt'
$sdkOutFile = Join-Path $targetTemp 'sdkmanager-output.txt'
$avdOutFile = Join-Path $targetTemp 'avdmanager-output.txt'
(1..800 | ForEach-Object { 'y' }) | Set-Content -LiteralPath $yesFile -Encoding ASCII
(1..100 | ForEach-Object { 'no' }) | Set-Content -LiteralPath $noFile -Encoding ASCII

Write-Host "SOURCE_ANDROID_SDK=$sourceSdk"
Write-Host "TARGET_ANDROID_SDK=$targetSdk"
Write-Host "TARGET_ANDROID_AVD=$targetAvd"
Write-Host "E_FREE_GB=$([math]::Round((Get-PSDrive E).Free/1GB,2))"
Write-Host "SDKMANAGER=$sdkManager"
Write-Host "AVDMANAGER=$avdManager"

$installedRoot = Join-Path $targetSdk 'system-images'
$installed = @()
if (Test-Path -LiteralPath $installedRoot) {
  $installed = @(Get-ChildItem $installedRoot -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -eq 'x86_64' -and $_.Parent -and $_.Parent.Name -eq 'google_apis_playstore' -and $_.Parent.Parent -and $_.Parent.Parent.Name -match '^android-\d+$' -and (Test-PlayStoreImageComplete $_.FullName)
  })
}

$imagePackage = $null
$imageApi = $null
if ($installed.Count -eq 0) {
  $list = Invoke-Native $sdkManager @('--list')
  if ($list.ExitCode -ne 0) { throw "SDKMANAGER_LIST_FAILED:$(@($list.Output | Select-Object -Last 20) -join "`n")" }
  $best = $null
  foreach ($row in $list.Output) {
    $text = ([string]$row).Trim()
    if ($text -match '^(system-images;android-(\d+);google_apis_playstore;x86_64)\s*\|') {
      $pkg = $Matches[1]; $api = [int]$Matches[2]
      if ($null -eq $best -or $api -gt $best.Api) { $best = [pscustomobject]@{ Api=$api; Package=$pkg } }
    }
  }
  if ($null -eq $best) { throw 'NO_GOOGLE_PLAY_X86_64_SYSTEM_IMAGE_IN_SDKMANAGER_LIST' }

  $expected = Join-Path $targetSdk "system-images\android-$($best.Api)\google_apis_playstore\x86_64"
  if ((Test-Path -LiteralPath $expected) -and -not (Test-PlayStoreImageComplete $expected)) {
    Write-Host "REMOVING_INCOMPLETE_E_IMAGE=$expected"
    Remove-Item -LiteralPath $expected -Recurse -Force -ErrorAction SilentlyContinue
  }

  $sourceExpected = Join-Path $sourceSdk "system-images\android-$($best.Api)\google_apis_playstore\x86_64"
  if ((Test-Path -LiteralPath $sourceExpected) -and -not (Test-PlayStoreImageComplete $sourceExpected)) {
    Write-Host "REMOVING_INCOMPLETE_C_IMAGE=$sourceExpected"
    Remove-Item -LiteralPath $sourceExpected -Recurse -Force -ErrorAction SilentlyContinue
  }

  Write-Host 'ANDROID_SDK_LICENSE_ACCEPTANCE=START'
  $license = Invoke-CmdWithInputFile $sdkManager @("--sdk_root=$targetSdk",'--licenses') $yesFile $sdkOutFile
  if ($license.ExitCode -eq 0) { Write-Host 'ANDROID_SDK_LICENSE_ACCEPTANCE=PASS' }
  else { Write-Host 'ANDROID_SDK_LICENSE_ACCEPTANCE=DEFER_TO_INSTALL' }

  Write-Host "INSTALLING_PLAY_STORE_SYSTEM_IMAGE=$($best.Package)"
  $install = Invoke-CmdWithInputFile $sdkManager @("--sdk_root=$targetSdk",$best.Package) $yesFile $sdkOutFile
  if ($install.ExitCode -ne 0) {
    throw "PLAY_STORE_SYSTEM_IMAGE_INSTALL_FAILED:$(@($install.Output | Select-Object -Last 40) -join "`n")"
  }
  if (-not (Test-PlayStoreImageComplete $expected)) {
    $where = @()
    foreach ($root in @($targetSdk,$sourceSdk)) {
      $probe = Join-Path $root "system-images\android-$($best.Api)\google_apis_playstore\x86_64"
      if (Test-Path -LiteralPath $probe) { $where += $probe }
    }
    throw "PLAY_STORE_SYSTEM_IMAGE_INSTALL_NOT_FOUND_OR_INCOMPLETE:$expected; FOUND=$($where -join ';')"
  }
  $imagePackage = $best.Package
  $imageApi = $best.Api
  Write-Host "PLAY_STORE_SYSTEM_IMAGE_INSTALL=PASS api=$imageApi"
} else {
  $bestInstalled = $installed | Sort-Object { [int]($_.Parent.Parent.Name -replace '^android-','') } -Descending | Select-Object -First 1
  $imageApi = [int]($bestInstalled.Parent.Parent.Name -replace '^android-','')
  $imagePackage = "system-images;android-$imageApi;google_apis_playstore;x86_64"
  Write-Host "PLAY_STORE_SYSTEM_IMAGE_ALREADY_INSTALLED=android-$imageApi"
}

$env:ANDROID_SDK_ROOT = $targetSdk
$env:ANDROID_HOME = $targetSdk
$env:ANDROID_AVD_HOME = $targetAvd
$env:ANDROID_EMULATOR_HOME = $TargetRoot

$playAvd = 'Vibe2PlayStore'
$avdConfig = Join-Path $targetAvd "$playAvd.avd\config.ini"
$avdIni = Join-Path $targetAvd "$playAvd.ini"
$avdReady = $false
if (Test-Path -LiteralPath $avdConfig) {
  $configText = [System.IO.File]::ReadAllText($avdConfig)
  if ($configText -match '(?im)^PlayStore\.enabled\s*=\s*yes\s*$') { $avdReady = $true }
}

if (-not $avdReady) {
  Write-Host "CREATING_PLAY_STORE_AVD=$playAvd"
  if (Test-Path -LiteralPath (Join-Path $targetAvd "$playAvd.avd")) {
    Remove-Item -LiteralPath (Join-Path $targetAvd "$playAvd.avd") -Recurse -Force -ErrorAction SilentlyContinue
  }
  if (Test-Path -LiteralPath $avdIni) { Remove-Item -LiteralPath $avdIni -Force -ErrorAction SilentlyContinue }

  $create = Invoke-CmdWithInputFile $avdManager @('create','avd','--name',$playAvd,'--package',$imagePackage,'--device','pixel_6','--force') $noFile $avdOutFile
  if ($create.ExitCode -ne 0) {
    $create = Invoke-CmdWithInputFile $avdManager @('create','avd','--name',$playAvd,'--package',$imagePackage,'--device','pixel','--force') $noFile $avdOutFile
  }
  if ($create.ExitCode -ne 0) {
    throw "AVD_CREATE_FAILED:$(@($create.Output | Select-Object -Last 40) -join "`n")"
  }
  if (-not (Test-Path -LiteralPath $avdConfig)) { throw "AVD_CONFIG_NOT_CREATED:$avdConfig" }
  $configText = [System.IO.File]::ReadAllText($avdConfig)
  if ($configText -notmatch '(?im)^PlayStore\.enabled\s*=\s*yes\s*$') {
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