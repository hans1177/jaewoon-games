param(
  [string]$PackageId = 'com.block.juggle',
  [string]$AvdName = 'Vibe2PlayStore',
  [string]$TargetRoot = 'E:\Android',
  [int]$TargetDataGb = 16
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
  } finally {
    $ErrorActionPreference=$old
  }
  [pscustomobject]@{ ExitCode=[int]$code; Output=@($out | ForEach-Object { [string]$_ }) }
}

function Get-DataFs {
  param([string]$Adb,[string]$Serial)
  $r=Invoke-Native $Adb @('-s',$Serial,'shell','df','-k','/data')
  $lines=@($r.Output | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  if($lines.Count -eq 0){ return [pscustomobject]@{ Raw='UNKNOWN'; TotalKb=0L; AvailableKb=0L } }
  $last=$lines[-1].Trim()
  $parts=@($last -split '\s+')
  $total=0L; $avail=0L
  if($parts.Count -ge 4){
    [void][long]::TryParse($parts[1],[ref]$total)
    [void][long]::TryParse($parts[3],[ref]$avail)
  }
  [pscustomobject]@{ Raw=$last; TotalKb=$total; AvailableKb=$avail }
}

function Get-BootedSerial {
  param([string]$Adb)
  $devices=Invoke-Native $Adb @('devices')
  foreach($line in $devices.Output){
    if($line -match '^(emulator-\d+)\s+device$'){
      $s=$Matches[1]
      $boot=Invoke-Native $Adb @('-s',$s,'shell','getprop','sys.boot_completed')
      if((($boot.Output -join '').Trim()) -eq '1'){ return $s }
    }
  }
  return $null
}

function Stop-Vibe2Emulator {
  param([string]$Adb,[string]$Serial,[string]$Name)
  if($Serial){ [void](Invoke-Native $Adb @('-s',$Serial,'emu','kill')); Start-Sleep 4 }
  try {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object { ($_.Name -eq 'emulator.exe' -or $_.Name -like 'qemu-system-*.exe') -and ([string]$_.CommandLine -match [regex]::Escape($Name)) } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  } catch {}
  Start-Sleep 2
}

$sourceSdk=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk'
$adb=Join-Path $sourceSdk 'platform-tools\adb.exe'
$emulator=Join-Path $sourceSdk 'emulator\emulator.exe'
$targetSdk=Join-Path $TargetRoot 'Sdk'
$targetAvd=Join-Path $TargetRoot 'avd'
$avdDir=Join-Path $targetAvd "$AvdName.avd"
$config=Join-Path $avdDir 'config.ini'

if(-not (Test-Path -LiteralPath $adb)){ throw "ADB_NOT_FOUND:$adb" }
if(-not (Test-Path -LiteralPath $emulator)){ throw "EMULATOR_NOT_FOUND:$emulator" }
if(-not (Test-Path -LiteralPath $config)){ throw "AVD_CONFIG_NOT_FOUND:$config" }

$raw=[System.IO.File]::ReadAllText($config)
$m=[regex]::Match($raw,'(?im)^image\.sysdir\.1\s*=\s*(.+?)\s*$')
if(-not $m.Success){ throw 'AVD_IMAGE_SYSDIR_NOT_FOUND' }
$relativeImage=$m.Groups[1].Value.Trim().TrimEnd('\','/') -replace '/','\'
$systemImage=Join-Path $targetSdk $relativeImage
if(-not (Test-Path -LiteralPath (Join-Path $systemImage 'system.img'))){ throw "SYSTEM_IMAGE_NOT_FOUND:$systemImage" }

$env:ANDROID_SDK_ROOT=$targetSdk
$env:ANDROID_HOME=$targetSdk
$env:ANDROID_AVD_HOME=$targetAvd
$env:ANDROID_EMULATOR_HOME=$TargetRoot

& $adb start-server | Out-Null
$serial=Get-BootedSerial $adb
if($serial){
  $before=Get-DataFs $adb $serial
  Write-Host "DATA_FS_BEFORE=$($before.Raw)"
  Write-Host "DATA_TOTAL_KB_BEFORE=$($before.TotalKb)"
  Write-Host "DATA_AVAILABLE_KB_BEFORE=$($before.AvailableKb)"
}

$targetBytes=[long]$TargetDataGb * 1024L * 1024L * 1024L
$targetMb=$TargetDataGb * 1024
if($raw -match '(?im)^disk\.dataPartition\.size\s*=.*$'){
  $raw=[regex]::Replace($raw,'(?im)^disk\.dataPartition\.size\s*=.*$',"disk.dataPartition.size=$targetBytes")
} else {
  if(-not $raw.EndsWith("`r`n") -and -not $raw.EndsWith("`n")){ $raw += "`r`n" }
  $raw += "disk.dataPartition.size=$targetBytes`r`n"
}
[System.IO.File]::WriteAllText($config,$raw,[System.Text.Encoding]::UTF8)
Write-Host "AVD_DATA_PARTITION_TARGET_GB=$TargetDataGb"
Write-Host 'USERDATA_WIPE=NO'
Write-Host 'ACCOUNT_DATA_EXPORT=NO'
Write-Host 'PRESERVE_EXISTING_USERDATA=YES'

Stop-Vibe2Emulator $adb $serial $AvdName
[void](Invoke-Native $adb @('kill-server'))
Start-Sleep 2
[void](Invoke-Native $adb @('start-server'))
Get-ChildItem -LiteralPath $avdDir -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like '*.lock' -or $_.Name -like '*.lock.*' } |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

$stdoutLog=Join-Path $TargetRoot 'emulator-resize-stdout.log'
$stderrLog=Join-Path $TargetRoot 'emulator-resize-stderr.log'
Remove-Item -LiteralPath $stdoutLog,$stderrLog -Force -ErrorAction SilentlyContinue

Write-Host 'AVD_PRESERVE_RESIZE_BOOT=START'
$proc=Start-Process $emulator -ArgumentList @(
  '-avd',$AvdName,
  '-sysdir',$systemImage,
  '-partition-size',[string]$targetMb,
  '-no-snapshot',
  '-no-audio',
  '-gpu','swiftshader_indirect',
  '-accel','auto'
) -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru

$deadline=(Get-Date).AddMinutes(12)
$next=(Get-Date)
$serial=$null
do {
  Start-Sleep 5
  $serial=Get-BootedSerial $adb
  if($serial){ break }
  if($proc.HasExited){
    $tail=''
    if(Test-Path -LiteralPath $stderrLog){ $tail=(Get-Content -LiteralPath $stderrLog -Tail 60 -ErrorAction SilentlyContinue) -join "`n" }
    throw "AVD_PRESERVE_RESIZE_BOOT_EXITED:$tail"
  }
  if((Get-Date) -ge $next){
    $state=(Invoke-Native $adb @('devices')).Output -join '; '
    Write-Host "ADB_STATE=$state"
    $next=(Get-Date).AddSeconds(20)
  }
} while((Get-Date) -lt $deadline)

if(-not $serial){ throw 'AVD_PRESERVE_RESIZE_BOOT_TIMEOUT' }
Write-Host "AVD_PRESERVE_RESIZE_BOOT=PASS serial=$serial"
Start-Sleep 10

$after=Get-DataFs $adb $serial
Write-Host "DATA_FS_AFTER=$($after.Raw)"
Write-Host "DATA_TOTAL_KB_AFTER=$($after.TotalKb)"
Write-Host "DATA_AVAILABLE_KB_AFTER=$($after.AvailableKb)"

$account=((Invoke-Native $adb @('-s',$serial,'shell','dumpsys','account')).Output -join "`n") -match '(?i)Account\s*\{[^\r\n}]*type=com\.google[^\r\n}]*\}'
Write-Host "GOOGLE_ACCOUNT_PRESENT=$($(if($account){'YES'}else{'NO'}))"
$setup=((Invoke-Native $adb @('-s',$serial,'shell','settings','get','secure','user_setup_complete')).Output -join '').Trim()
Write-Host "USER_SETUP_COMPLETE=$setup"

$minTotalKb=12L*1024L*1024L
if($after.TotalKb -lt $minTotalKb){
  Write-Host 'AVD_DATA_PARTITION_RESIZE_VERIFIED=NO'
  throw "AVD_DATA_PARTITION_RESIZE_FAILED total_kb=$($after.TotalKb)"
}

[void](Invoke-Native $adb @('-s',$serial,'shell','pm','trim-caches','4G'))
Start-Sleep 2
$final=Get-DataFs $adb $serial
Write-Host "DATA_AVAILABLE_KB_FINAL=$($final.AvailableKb)"
Write-Host 'AVD_DATA_PARTITION_RESIZE_VERIFIED=YES'
Write-Host 'PRESERVED_GOOGLE_ACCOUNT_SESSION=CHECKED'

$runner=Join-Path $env:TEMP 'vibe2-e-run-after-resize.ps1'
$url="https://raw.githubusercontent.com/hans1177/jaewoon-games/main/tools/vibe2-playstore-e-run.ps1?x=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
Invoke-WebRequest $url -OutFile $runner
Write-Host 'RESTARTING_PLAYSTORE_RUNNER=YES'
& powershell -ExecutionPolicy Bypass -File $runner -PackageId $PackageId -AvdName $AvdName -TargetRoot $TargetRoot
exit $LASTEXITCODE
