param(
  [string]$TargetRoot = 'E:\Android',
  [string]$AvdName = 'Vibe2PlayStore',
  [string]$RunnerPath
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

function Get-BootedPlayStoreSerial {
  param([string]$Adb)
  $devices=Invoke-Native $Adb @('devices')
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

function Get-EmulatorState {
  param([string]$Adb)
  $devices=Invoke-Native $Adb @('devices')
  $rows=@($devices.Output | Where-Object { $_ -match '^emulator-\d+\s+' })
  if($rows.Count -eq 0){ return 'none' }
  ($rows -join '; ')
}

$sourceSdk=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk'
$targetSdk=Join-Path $TargetRoot 'Sdk'
$targetAvd=Join-Path $TargetRoot 'avd'
$avdDir=Join-Path $targetAvd "$AvdName.avd"
$avdConfig=Join-Path $avdDir 'config.ini'
$adb=Join-Path $sourceSdk 'platform-tools\adb.exe'
$emulator=Join-Path $sourceSdk 'emulator\emulator.exe'

if(-not (Test-Path -LiteralPath $adb)){ throw "ADB_NOT_FOUND:$adb" }
if(-not (Test-Path -LiteralPath $emulator)){ throw "EMULATOR_NOT_FOUND:$emulator" }
if(-not (Test-Path -LiteralPath $avdConfig)){ throw "E_AVD_CONFIG_NOT_FOUND:$avdConfig" }

$cfg=[System.IO.File]::ReadAllText($avdConfig)
$m=[regex]::Match($cfg,'(?im)^image\.sysdir\.1\s*=\s*(.+?)\s*$')
if(-not $m.Success){ throw "AVD_IMAGE_SYSDIR_NOT_FOUND:$avdConfig" }
$relativeImage=$m.Groups[1].Value.Trim().TrimEnd('\','/') -replace '/','\'
if($relativeImage -notmatch '(?i)google_apis_playstore\\x86_64$'){ throw "AVD_NOT_PLAY_STORE_IMAGE:$relativeImage" }
$targetImage=Join-Path $targetSdk $relativeImage
foreach($required in @('system.img','vendor.img','ramdisk.img','source.properties')){
  if(-not (Test-Path -LiteralPath (Join-Path $targetImage $required))){ throw "E_SYSTEM_IMAGE_INCOMPLETE:$targetImage missing=$required" }
}

$env:ANDROID_SDK_ROOT=$targetSdk
$env:ANDROID_HOME=$targetSdk
$env:ANDROID_AVD_HOME=$targetAvd
$env:ANDROID_EMULATOR_HOME=$TargetRoot
$env:Path="$(Split-Path $adb -Parent);$env:Path"

Write-Host "E_ANDROID_SDK=$targetSdk"
Write-Host "E_ANDROID_AVD=$targetAvd"
Write-Host "E_SYSTEM_IMAGE=$targetImage"
Write-Host "AVD_NAME=$AvdName"
Write-Host 'BOOT_MODE=COLD_BOOT_EXPLICIT_SYSDIR'

# Stop only the Vibe2 emulator/qemu instance when possible.
try {
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { ($_.Name -eq 'emulator.exe' -or $_.Name -like 'qemu-system-*.exe') -and ([string]$_.CommandLine -match [regex]::Escape($AvdName)) } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
} catch {}
Start-Sleep 2

# Reset adb so an old emulator-5554 offline entry is discarded.
[void](Invoke-Native $adb @('kill-server'))
Start-Sleep 2
[void](Invoke-Native $adb @('start-server'))

# Clear stale AVD lock files only after the old process is stopped.
Get-ChildItem -LiteralPath $avdDir -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like '*.lock' -or $_.Name -like '*.lock.*' } |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

$stdoutLog=Join-Path $TargetRoot 'emulator-recover-stdout.log'
$stderrLog=Join-Path $TargetRoot 'emulator-recover-stderr.log'
Remove-Item -LiteralPath $stdoutLog,$stderrLog -Force -ErrorAction SilentlyContinue

Write-Host 'STARTING_PLAY_STORE_AVD_RECOVERY=YES'
$proc=Start-Process $emulator -ArgumentList @(
  '-avd',$AvdName,
  '-sysdir',$targetImage,
  '-no-snapshot',
  '-no-audio',
  '-gpu','auto',
  '-accel','auto'
) -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru

$deadline=(Get-Date).AddMinutes(12)
$nextStatus=(Get-Date)
$serial=$null
do{
  Start-Sleep 5
  $serial=Get-BootedPlayStoreSerial $adb
  if($serial){ break }
  if($proc.HasExited){
    $tail=@()
    if(Test-Path -LiteralPath $stdoutLog){ $tail += Get-Content -LiteralPath $stdoutLog -Tail 50 -ErrorAction SilentlyContinue }
    if(Test-Path -LiteralPath $stderrLog){ $tail += Get-Content -LiteralPath $stderrLog -Tail 50 -ErrorAction SilentlyContinue }
    throw "PLAY_STORE_AVD_RECOVERY_EXITED:$($tail -join "`n")"
  }
  if((Get-Date) -ge $nextStatus){
    Write-Host "ADB_STATE=$(Get-EmulatorState $adb)"
    $nextStatus=(Get-Date).AddSeconds(20)
  }
}while((Get-Date)-lt $deadline)

if(-not $serial){
  $tail=@()
  if(Test-Path -LiteralPath $stdoutLog){ $tail += Get-Content -LiteralPath $stdoutLog -Tail 50 -ErrorAction SilentlyContinue }
  if(Test-Path -LiteralPath $stderrLog){ $tail += Get-Content -LiteralPath $stderrLog -Tail 50 -ErrorAction SilentlyContinue }
  throw "PLAY_STORE_AVD_RECOVERY_TIMEOUT:$($tail -join "`n")"
}

Write-Host "ANDROID_SERIAL=$serial"
Write-Host 'PLAY_STORE_BOOT_RECOVERY=PASS'

if([string]::IsNullOrWhiteSpace($RunnerPath)){ $RunnerPath=Join-Path $PSScriptRoot 'vibe2-playstore-e-run.ps1' }
if(-not (Test-Path -LiteralPath $RunnerPath)){ throw "E_RUNNER_NOT_FOUND:$RunnerPath" }
& powershell -ExecutionPolicy Bypass -File $RunnerPath
exit $LASTEXITCODE
