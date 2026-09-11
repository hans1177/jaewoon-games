param(
  [string]$GameId = 'block-blast',
  [int]$InstallWaitMinutes = 30
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Native {
  param([string]$Exe, [string[]]$Args)
  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $out = & $Exe @Args 2>&1
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $old
  }
  [pscustomobject]@{ ExitCode=[int]$code; Output=@($out | ForEach-Object { [string]$_ }) }
}

function Invoke-NativeWithYes {
  param([string]$Exe, [string[]]$Args)
  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $answers = 1..200 | ForEach-Object { 'y' }
    $out = $answers | & $Exe @Args 2>&1
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $old
  }
  [pscustomobject]@{ ExitCode=[int]$code; Output=@($out | ForEach-Object { [string]$_ }) }
}

function Add-IfDirectory {
  param([System.Collections.Generic.List[string]]$List, [string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return }
  try { if ([System.IO.Directory]::Exists($Path)) { $List.Add($Path) } } catch {}
}

function Get-SdkRoots {
  $roots = New-Object System.Collections.Generic.List[string]
  Add-IfDirectory $roots $env:ANDROID_SDK_ROOT
  Add-IfDirectory $roots $env:ANDROID_HOME
  Add-IfDirectory $roots (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk')
  $unityRoot = Join-Path $env:ProgramFiles 'Unity\Hub\Editor'
  try {
    if ([System.IO.Directory]::Exists($unityRoot)) {
      Get-ChildItem $unityRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
        Add-IfDirectory $roots (Join-Path $_.FullName 'Editor\Data\PlaybackEngines\AndroidPlayer\SDK')
      }
    }
  } catch {}
  @($roots | Select-Object -Unique)
}

function Find-Tool {
  param([string[]]$Roots, [string]$Relative)
  foreach ($root in $Roots) {
    $candidate = Join-Path $root $Relative
    try { if ([System.IO.File]::Exists($candidate)) { return $candidate } } catch {}
  }
  $null
}

function Find-CmdlineTool {
  param([string[]]$Roots, [string]$Name)
  foreach ($root in $Roots) {
    $candidates = New-Object System.Collections.Generic.List[string]
    $candidates.Add((Join-Path $root "cmdline-tools\latest\bin\$Name.bat"))
    $candidates.Add((Join-Path $root "tools\bin\$Name.bat"))
    $cmdRoot = Join-Path $root 'cmdline-tools'
    try {
      if ([System.IO.Directory]::Exists($cmdRoot)) {
        Get-ChildItem $cmdRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
          $candidates.Add((Join-Path $_.FullName "bin\$Name.bat"))
        }
      }
    } catch {}
    foreach ($candidate in $candidates) {
      try { if ([System.IO.File]::Exists($candidate)) { return $candidate } } catch {}
    }
  }
  $null
}

function Set-JavaForAndroidTools {
  if (Get-Command java.exe -ErrorAction SilentlyContinue) { return }
  $candidates = New-Object System.Collections.Generic.List[string]
  $candidates.Add((Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'))
  $candidates.Add((Join-Path $env:ProgramFiles 'Android\Android Studio\jre'))
  $unityRoot = Join-Path $env:ProgramFiles 'Unity\Hub\Editor'
  try {
    if ([System.IO.Directory]::Exists($unityRoot)) {
      Get-ChildItem $unityRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
        $candidates.Add((Join-Path $_.FullName 'Editor\Data\PlaybackEngines\AndroidPlayer\OpenJDK'))
      }
    }
  } catch {}
  foreach ($javaHomeCandidate in $candidates) {
    try {
      $java = Join-Path $javaHomeCandidate 'bin\java.exe'
      if ([System.IO.File]::Exists($java)) {
        $env:JAVA_HOME = $javaHomeCandidate
        $env:Path = "$(Join-Path $javaHomeCandidate 'bin');$env:Path"
        Write-Host "JAVA_HOME=$javaHomeCandidate"
        return
      }
    } catch {}
  }
}

function Find-PlayStoreSystemImage {
  param([string[]]$Roots)
  $best = $null
  foreach ($root in $Roots) {
    $base = Join-Path $root 'system-images'
    try {
      if (-not [System.IO.Directory]::Exists($base)) { continue }
      $hits = @(Get-ChildItem $base -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -eq 'x86_64' -and $_.Parent -and $_.Parent.Name -eq 'google_apis_playstore' -and $_.Parent.Parent -and $_.Parent.Parent.Name -match '^android-\d+$'
      })
      foreach ($hit in $hits) {
        $api = [int]($hit.Parent.Parent.Name -replace '^android-', '')
        if ($null -eq $best -or $api -gt $best.Api) {
          $best = [pscustomobject]@{ Root=$root; Api=$api; Package="system-images;android-$api;google_apis_playstore;x86_64" }
        }
      }
    } catch {}
  }
  $best
}

function Get-LatestAvailablePlayStoreImage {
  param([string]$SdkManager, [string]$SdkRoot)
  $env:ANDROID_SDK_ROOT = $SdkRoot
  $env:ANDROID_HOME = $SdkRoot
  $list = Invoke-Native $SdkManager @('--list','--channel=0')
  if ($list.ExitCode -ne 0) {
    throw "SDKMANAGER_LIST_FAILED:$($list.Output | Select-Object -Last 12 | Out-String)"
  }
  $best = $null
  foreach ($row in @($list.Output)) {
    $text = ([string]$row).Trim()
    if ($text -match '^(system-images;android-(\d+);google_apis_playstore;x86_64)\s*\|') {
      $pkg = $Matches[1]
      $api = [int]$Matches[2]
      if ($null -eq $best -or $api -gt $best.Api) {
        $best = [pscustomobject]@{ Root=$SdkRoot; Api=$api; Package=$pkg }
      }
    }
  }
  $best
}

function Install-PlayStoreSystemImage {
  param([string]$SdkManager, [string]$SdkRoot)
  $env:ANDROID_SDK_ROOT = $SdkRoot
  $env:ANDROID_HOME = $SdkRoot
  Set-JavaForAndroidTools
  Write-Host 'ANDROID_SDK_LICENSE_ACCEPTANCE=START'
  $licenses = Invoke-NativeWithYes $SdkManager @('--licenses')
  if ($licenses.ExitCode -ne 0) {
    throw "ANDROID_SDK_LICENSE_ACCEPTANCE_FAILED:$($licenses.Output | Select-Object -Last 12 | Out-String)"
  }
  Write-Host 'ANDROID_SDK_LICENSE_ACCEPTANCE=PASS'
  $available = Get-LatestAvailablePlayStoreImage $SdkManager $SdkRoot
  if ($null -eq $available) { throw 'NO_AVAILABLE_GOOGLE_PLAY_X86_64_SYSTEM_IMAGE_FOUND_BY_SDKMANAGER' }
  Write-Host "INSTALLING_PLAY_STORE_SYSTEM_IMAGE=$($available.Package)"
  $install = Invoke-NativeWithYes $SdkManager @($available.Package)
  if ($install.ExitCode -ne 0) {
    throw "PLAY_STORE_SYSTEM_IMAGE_INSTALL_FAILED:$($install.Output | Select-Object -Last 20 | Out-String)"
  }
  Write-Host "PLAY_STORE_SYSTEM_IMAGE_INSTALL=PASS api=$($available.Api)"
  $available
}

function Get-PlayStoreDevice {
  param([string]$Adb)
  $devices = Invoke-Native $Adb @('devices')
  if ($devices.ExitCode -ne 0) { return $null }
  foreach ($line in $devices.Output) {
    if ($line -match '^([^\s]+)\s+device$') {
      $serial = $Matches[1]
      $store = Invoke-Native $Adb @('-s',$serial,'shell','pm','path','com.android.vending')
      if ($store.ExitCode -eq 0 -and (($store.Output -join "`n") -match '^package:')) { return $serial }
    }
  }
  $null
}

function Wait-ForBoot {
  param([string]$Adb,[int]$Minutes=10)
  $deadline=(Get-Date).AddMinutes($Minutes)
  do {
    Start-Sleep 5
    $serial=Get-PlayStoreDevice $Adb
    if ($serial) {
      $boot=Invoke-Native $Adb @('-s',$serial,'shell','getprop','sys.boot_completed')
      if (($boot.Output -join '').Trim() -eq '1') { return $serial }
    }
  } while ((Get-Date) -lt $deadline)
  $null
}

function Test-PackageInstalled {
  param([string]$Adb,[string]$Serial,[string]$PackageId)
  $r=Invoke-Native $Adb @('-s',$Serial,'shell','pm','path',$PackageId)
  ($r.ExitCode -eq 0 -and (($r.Output -join "`n") -match '^package:'))
}

function Get-ValidAvdNames {
  param([string]$Emulator)
  $list=Invoke-Native $Emulator @('-list-avds')
  $valid=New-Object System.Collections.Generic.List[string]
  foreach ($row in @($list.Output)) {
    $name=([string]$row).Trim()
    if ([string]::IsNullOrWhiteSpace($name)) { continue }
    if ($name -notmatch '^[A-Za-z0-9._-]+$') {
      Write-Host "IGNORED_EMULATOR_OUTPUT=$name"
      continue
    }
    $valid.Add($name)
  }
  @($valid | Select-Object -Unique)
}

$repoRoot=Split-Path $PSScriptRoot -Parent
$manifestPath=Join-Path $repoRoot 'company-learning\external-game-playtest\mobile-free-seed-games.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw "MANIFEST_NOT_FOUND:$manifestPath" }
$manifest=[System.IO.File]::ReadAllText($manifestPath,[System.Text.Encoding]::UTF8)|ConvertFrom-Json
if ($manifest.installPolicy -ne 'OFFICIAL_GOOGLE_PLAY_ONLY' -or $manifest.codeExtractionAllowed -ne $false -or $manifest.binaryRedistributionAllowed -ne $false) { throw 'UNSAFE_EXTERNAL_GAME_REFERENCE_POLICY' }
$game=@($manifest.games|Where-Object{$_.id -eq $GameId})|Select-Object -First 1
if (-not $game) { throw "UNKNOWN_GAME_ID:$GameId" }
$packageId=[string](@($game.packageIds)[0])
if ([string]::IsNullOrWhiteSpace($packageId)) { throw 'PACKAGE_ID_MISSING' }

$roots=@(Get-SdkRoots)
if (-not $roots.Count) { throw 'ANDROID_SDK_NOT_FOUND; install Android Studio or Unity Android Build Support first' }
$adb=Find-Tool $roots 'platform-tools\adb.exe'
if (-not $adb) { throw 'ADB_NOT_FOUND_IN_ANDROID_SDK' }
$emulator=Find-Tool $roots 'emulator\emulator.exe'
$avdManager=Find-CmdlineTool $roots 'avdmanager'
$sdkManager=Find-CmdlineTool $roots 'sdkmanager'
$env:Path="$(Split-Path $adb -Parent);$env:Path"
& $adb start-server | Out-Null

Write-Host "GAME_ID=$GameId"
Write-Host "GAME_TITLE=$($game.title)"
Write-Host "PACKAGE_ID=$packageId"
Write-Host "ADB=$adb"

$serial=Get-PlayStoreDevice $adb
if (-not $serial) {
  if (-not $emulator) { throw 'PLAY_STORE_DEVICE_NOT_CONNECTED_AND_EMULATOR_NOT_FOUND' }
  $avdHome=if($env:ANDROID_AVD_HOME){$env:ANDROID_AVD_HOME}else{Join-Path $env:USERPROFILE '.android\avd'}
  $playAvd=$null
  foreach($name in @(Get-ValidAvdNames $emulator)) {
    try {
      $config=Join-Path $avdHome "$name.avd\config.ini"
      if (Test-Path -LiteralPath $config) {
        $raw=[System.IO.File]::ReadAllText($config)
        if ($raw -match '(?im)^PlayStore\.enabled\s*=\s*yes\s*$') { $playAvd=$name; break }
      }
    } catch {
      Write-Host "IGNORED_INVALID_AVD_NAME=$name"
    }
  }
  if (-not $playAvd) {
    if (-not $avdManager) { throw 'NO_PLAY_STORE_AVD_AND_AVDMANAGER_NOT_FOUND' }
    $image=Find-PlayStoreSystemImage $roots
    if ($null -eq $image) {
      if (-not $sdkManager) { throw 'NO_INSTALLED_PLAY_STORE_SYSTEM_IMAGE_AND_SDKMANAGER_NOT_FOUND' }
      $sdkRoot = Split-Path (Split-Path (Split-Path $sdkManager -Parent) -Parent) -Parent
      if ((Split-Path $sdkManager -Parent) -match '\\tools\\bin$') {
        $sdkRoot = Split-Path (Split-Path $sdkManager -Parent) -Parent
      }
      if (-not (Test-Path -LiteralPath (Join-Path $sdkRoot 'platform-tools'))) {
        $sdkRoot = @($roots | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'platform-tools') }) | Select-Object -First 1
      }
      if (-not $sdkRoot) { throw 'SDKMANAGER_SDK_ROOT_RESOLUTION_FAILED' }
      $image=Install-PlayStoreSystemImage $sdkManager $sdkRoot
      $roots=@(Get-SdkRoots)
    }
    $env:ANDROID_SDK_ROOT=$image.Root
    $env:ANDROID_HOME=$image.Root
    $playAvd='Vibe2PlayStore'
    $create=Invoke-NativeWithYes $avdManager @('create','avd','--name',$playAvd,'--package',$image.Package,'--device','pixel_6','--force')
    if ($create.ExitCode -ne 0) { $create=Invoke-NativeWithYes $avdManager @('create','avd','--name',$playAvd,'--package',$image.Package,'--device','pixel','--force') }
    if ($create.ExitCode -ne 0) { throw "AVD_CREATE_FAILED:$($create.Output -join ' ')" }
    Write-Host "CREATED_PLAY_STORE_AVD=$playAvd"
  }
  Write-Host "STARTING_PLAY_STORE_AVD=$playAvd"
  $proc=Start-Process $emulator -ArgumentList @('-avd',$playAvd,'-no-audio','-no-boot-anim','-gpu','swiftshader_indirect') -PassThru
  $serial=Wait-ForBoot $adb 10
  if (-not $serial) {
    if (-not $proc.HasExited) { try{Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue}catch{} }
    throw 'PLAY_STORE_AVD_BOOT_TIMEOUT'
  }
}

$androidVersion=((Invoke-Native $adb @('-s',$serial,'shell','getprop','ro.build.version.release')).Output -join '').Trim()
$apiLevel=((Invoke-Native $adb @('-s',$serial,'shell','getprop','ro.build.version.sdk')).Output -join '').Trim()
$abi=((Invoke-Native $adb @('-s',$serial,'shell','getprop','ro.product.cpu.abi')).Output -join '').Trim()
Write-Host "ANDROID_SERIAL=$serial"
Write-Host "ANDROID_VERSION=$androidVersion"
Write-Host "ANDROID_API=$apiLevel"
Write-Host "ANDROID_ABI=$abi"

if (-not (Test-PackageInstalled $adb $serial $packageId)) {
  Write-Host 'Opening official Google Play page. If sign-in appears, sign in only inside the emulator.'
  Invoke-Native $adb @('-s',$serial,'shell','am','start','-a','android.intent.action.VIEW','-d',"market://details?id=$packageId",'-p','com.android.vending')|Out-Null
  $deadline=(Get-Date).AddMinutes($InstallWaitMinutes)
  do {
    if (Test-PackageInstalled $adb $serial $packageId) { break }
    Start-Sleep 5
  } while ((Get-Date) -lt $deadline)
}

$installed=Test-PackageInstalled $adb $serial $packageId
if (-not $installed) { throw "INSTALL_NOT_DETECTED_WITHIN_${InstallWaitMinutes}_MINUTES; complete Play Store sign-in/install and rerun" }
$launch=Invoke-Native $adb @('-s',$serial,'shell','monkey','-p',$packageId,'-c','android.intent.category.LAUNCHER','1')
Start-Sleep 8
$pid=((Invoke-Native $adb @('-s',$serial,'shell','pidof',$packageId)).Output -join '').Trim()
$focus=((Invoke-Native $adb @('-s',$serial,'shell','dumpsys','window')).Output -join "`n")
$foreground=$focus -match [regex]::Escape($packageId)
$launchPass=($launch.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($pid))
$outPath=Join-Path $env:TEMP 'vibe2-playstore-bootstrap.json'
[ordered]@{
  version=2; gameId=$GameId; gameTitle=[string]$game.title; packageId=$packageId;
  installPolicy='OFFICIAL_GOOGLE_PLAY_ONLY'; codeExtractionAllowed=$false; binaryRedistributionAllowed=$false; runtimePromotionAllowed=$false;
  serial=$serial; androidVersion=$androidVersion; apiLevel=$apiLevel; abi=$abi; installed=$installed; launchPass=$launchPass; foregroundPass=[bool]$foreground; processId=$pid;
  observedAt=(Get-Date).ToUniversalTime().ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content $outPath -Encoding UTF8
Write-Host ''
Write-Host 'VIBE2_LOCAL_PLAYSTORE_BOOTSTRAP=PASS'
Write-Host "RESULT_JSON=$outPath"
Write-Host "PACKAGE_ID=$packageId"
Write-Host "ANDROID_VERSION=$androidVersion"
Write-Host "ANDROID_API=$apiLevel"
Write-Host "ANDROID_ABI=$abi"
Write-Host "GAME_LAUNCH_PASS=$launchPass"
Write-Host "GAME_FOREGROUND_PASS=$foreground"
Write-Host 'PASSWORD_CAPTURED=NO'
Write-Host 'ACCOUNT_TOKEN_EXPORTED=NO'