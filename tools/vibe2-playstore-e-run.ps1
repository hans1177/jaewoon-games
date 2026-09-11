param(
  [string]$PackageId = 'com.block.juggle',
  [string]$AvdName = 'Vibe2PlayStore',
  [int]$InstallWaitMinutes = 30,
  [string]$TargetRoot = 'E:\Android'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Native {
  param([string]$Exe,[string[]]$ArgumentList)
  $old=$ErrorActionPreference
  try {
    $ErrorActionPreference='Continue'
    $out=& $Exe @ArgumentList 2>&1
    $code=$LASTEXITCODE
  } finally { $ErrorActionPreference=$old }
  [pscustomobject]@{ ExitCode=[int]$code; Output=@($out|ForEach-Object{[string]$_}) }
}

function Get-PlayStoreBootedSerial {
  param([string]$Adb)
  $devices=Invoke-Native $Adb @('devices')
  if($devices.ExitCode -ne 0){ return $null }
  foreach($line in $devices.Output){
    if($line -match '^([^\s]+)\s+device$'){
      $serial=$Matches[1]
      $boot=Invoke-Native $Adb @('-s',$serial,'shell','getprop','sys.boot_completed')
      if((($boot.Output -join '').Trim()) -ne '1'){ continue }
      $store=Invoke-Native $Adb @('-s',$serial,'shell','pm','path','com.android.vending')
      if($store.ExitCode -eq 0 -and (($store.Output -join "`n") -match '^package:')){ return $serial }
    }
  }
  $null
}

function Test-PackageInstalled {
  param([string]$Adb,[string]$Serial,[string]$Package)
  $r=Invoke-Native $Adb @('-s',$Serial,'shell','pm','path',$Package)
  ($r.ExitCode -eq 0 -and (($r.Output -join "`n") -match '^package:'))
}

function Get-UiXml {
  param([string]$Adb,[string]$Serial)
  [void](Invoke-Native $Adb @('-s',$Serial,'shell','uiautomator','dump','/sdcard/vibe2-window.xml'))
  $r=Invoke-Native $Adb @('-s',$Serial,'shell','cat','/sdcard/vibe2-window.xml')
  if($r.ExitCode -ne 0){ return '' }
  $r.Output -join "`n"
}

function Try-TapInstall {
  param([string]$Adb,[string]$Serial,[string]$Xml)
  $installPattern='(?i)(text|content-desc)="(?:Install|\uC124\uCE58)"'
  foreach($node in [regex]::Matches($Xml,'<node\b[^>]*>')){
    $s=$node.Value
    if($s -notmatch $installPattern){ continue }
    if($s -match 'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'){
      $x1=[int]$Matches[1]; $y1=[int]$Matches[2]; $x2=[int]$Matches[3]; $y2=[int]$Matches[4]
      $x=[int](($x1+$x2)/2); $y=[int](($y1+$y2)/2)
      [void](Invoke-Native $Adb @('-s',$Serial,'shell','input','tap',[string]$x,[string]$y))
      Write-Host "PLAY_STORE_INSTALL_TAP=$x,$y"
      return $true
    }
  }
  $false
}

function Get-EmulatorLogTail {
  param([string]$StdoutLog,[string]$StderrLog)
  $parts=New-Object System.Collections.Generic.List[string]
  if(Test-Path -LiteralPath $StdoutLog){ $parts.Add(((Get-Content -LiteralPath $StdoutLog -Tail 40 -ErrorAction SilentlyContinue)-join "`n")) }
  if(Test-Path -LiteralPath $StderrLog){ $parts.Add(((Get-Content -LiteralPath $StderrLog -Tail 40 -ErrorAction SilentlyContinue)-join "`n")) }
  @($parts | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "`n"
}

$sourceSdk=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk'
$targetSdk=Join-Path $TargetRoot 'Sdk'
$targetAvd=Join-Path $TargetRoot 'avd'
$avdConfig=Join-Path $targetAvd "$AvdName.avd\config.ini"
$adb=Join-Path $sourceSdk 'platform-tools\adb.exe'
$emulator=Join-Path $sourceSdk 'emulator\emulator.exe'

if(-not (Test-Path -LiteralPath $adb)){ throw "ADB_NOT_FOUND:$adb" }
if(-not (Test-Path -LiteralPath $emulator)){ throw "EMULATOR_NOT_FOUND:$emulator" }
if(-not (Test-Path -LiteralPath $avdConfig)){ throw "E_AVD_CONFIG_NOT_FOUND:$avdConfig" }
$cfg=[System.IO.File]::ReadAllText($avdConfig)
if($cfg -notmatch '(?im)^image\.sysdir\.1\s*=\s*.*google_apis_playstore[\\/]+x86_64[\\/]*\s*$'){
  throw "E_AVD_NOT_PLAY_STORE_IMAGE:$avdConfig"
}

$env:ANDROID_SDK_ROOT=$targetSdk
$env:ANDROID_HOME=$targetSdk
$env:ANDROID_AVD_HOME=$targetAvd
$env:ANDROID_EMULATOR_HOME=$TargetRoot
$env:Path="$(Split-Path $adb -Parent);$env:Path"

& $adb start-server | Out-Null
Write-Host "E_ANDROID_SDK=$targetSdk"
Write-Host "E_ANDROID_AVD=$targetAvd"
Write-Host "AVD_NAME=$AvdName"
Write-Host "PACKAGE_ID=$PackageId"

$serial=Get-PlayStoreBootedSerial $adb
if(-not $serial){
  Write-Host "STARTING_PLAY_STORE_AVD=$AvdName"
  $stdoutLog=Join-Path $TargetRoot 'emulator-stdout.log'
  $stderrLog=Join-Path $TargetRoot 'emulator-stderr.log'
  Remove-Item -LiteralPath $stdoutLog,$stderrLog -Force -ErrorAction SilentlyContinue
  $proc=Start-Process $emulator -ArgumentList @('-avd',$AvdName,'-no-audio','-no-boot-anim','-gpu','swiftshader_indirect') -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
  $deadline=(Get-Date).AddMinutes(10)
  do{
    Start-Sleep 5
    $serial=Get-PlayStoreBootedSerial $adb
    if($serial){ break }
    if($proc.HasExited){ throw "PLAY_STORE_AVD_EXITED_EARLY:$(Get-EmulatorLogTail $stdoutLog $stderrLog)" }
  }while((Get-Date)-lt $deadline)
  if(-not $serial){ throw "PLAY_STORE_AVD_BOOT_TIMEOUT:$(Get-EmulatorLogTail $stdoutLog $stderrLog)" }
}

$androidVersion=((Invoke-Native $adb @('-s',$serial,'shell','getprop','ro.build.version.release')).Output -join '').Trim()
$api=((Invoke-Native $adb @('-s',$serial,'shell','getprop','ro.build.version.sdk')).Output -join '').Trim()
$abi=((Invoke-Native $adb @('-s',$serial,'shell','getprop','ro.product.cpu.abi')).Output -join '').Trim()
Write-Host "ANDROID_SERIAL=$serial"
Write-Host "ANDROID_VERSION=$androidVersion"
Write-Host "ANDROID_API=$api"
Write-Host "ANDROID_ABI=$abi"
Write-Host 'PLAY_STORE_PACKAGE=PASS'

if(-not (Test-PackageInstalled $adb $serial $PackageId)){
  Write-Host 'OPENING_OFFICIAL_GOOGLE_PLAY=YES'
  [void](Invoke-Native $adb @('-s',$serial,'shell','am','start','-a','android.intent.action.VIEW','-d',"market://details?id=$PackageId",'-p','com.android.vending'))
  $deadline=(Get-Date).AddMinutes($InstallWaitMinutes)
  $signInShown=$false
  $signInPattern='(?i)(Sign in|Add account|\uB85C\uADF8\uC778|\uACC4\uC815\s*\uCD94\uAC00)'
  do{
    if(Test-PackageInstalled $adb $serial $PackageId){ break }
    Start-Sleep 5
    $xml=Get-UiXml $adb $serial
    if(-not $signInShown -and $xml -match $signInPattern){
      Write-Host 'PLAY_STORE_SIGN_IN_REQUIRED=YES'
      Write-Host 'SIGN_IN_LOCATION=EMULATOR_UI_ONLY'
      Write-Host 'PASSWORD_CAPTURED=NO'
      Write-Host 'ACCOUNT_TOKEN_EXPORTED=NO'
      $signInShown=$true
    }
    [void](Try-TapInstall $adb $serial $xml)
  }while((Get-Date)-lt $deadline)
}

if(-not (Test-PackageInstalled $adb $serial $PackageId)){ throw "INSTALL_NOT_DETECTED_WITHIN_${InstallWaitMinutes}_MINUTES" }

$launch=Invoke-Native $adb @('-s',$serial,'shell','monkey','-p',$PackageId,'-c','android.intent.category.LAUNCHER','1')
Start-Sleep 8
$pid=((Invoke-Native $adb @('-s',$serial,'shell','pidof',$PackageId)).Output -join '').Trim()
$focus=((Invoke-Native $adb @('-s',$serial,'shell','dumpsys','window')).Output -join "`n")
$foreground=$focus -match [regex]::Escape($PackageId)
$launchPass=($launch.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($pid))

$outPath=Join-Path $TargetRoot 'vibe2-playstore-bootstrap.json'
[ordered]@{
  version=3; packageId=$PackageId; installPolicy='OFFICIAL_GOOGLE_PLAY_ONLY'; codeExtractionAllowed=$false; binaryRedistributionAllowed=$false; runtimePromotionAllowed=$false;
  serial=$serial; androidVersion=$androidVersion; apiLevel=$api; abi=$abi; installed=$true; launchPass=$launchPass; foregroundPass=[bool]$foreground; processId=$pid;
  observedAt=(Get-Date).ToUniversalTime().ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $outPath -Encoding UTF8

Write-Host ''
Write-Host 'VIBE2_LOCAL_PLAYSTORE_BOOTSTRAP=PASS'
Write-Host "RESULT_JSON=$outPath"
Write-Host "GAME_LAUNCH_PASS=$launchPass"
Write-Host "GAME_FOREGROUND_PASS=$foreground"
Write-Host 'PASSWORD_CAPTURED=NO'
Write-Host 'ACCOUNT_TOKEN_EXPORTED=NO'
