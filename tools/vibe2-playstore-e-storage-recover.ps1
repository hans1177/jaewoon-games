param(
  [string]$PackageId = 'com.block.juggle',
  [string]$TargetRoot = 'E:\Android'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Native {
  param([string]$Exe,[string[]]$ArgumentList)
  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $out = & $Exe @ArgumentList 2>&1
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $old
  }
  [pscustomobject]@{ ExitCode=[int]$code; Output=@($out | ForEach-Object { [string]$_ }) }
}

function Get-DeviceSerial {
  param([string]$Adb)
  $r=Invoke-Native $Adb @('devices')
  foreach($line in $r.Output){
    if($line -match '^(emulator-\d+)\s+device$'){ return $Matches[1] }
  }
  return $null
}

function Get-DataFs {
  param([string]$Adb,[string]$Serial)
  $r=Invoke-Native $Adb @('-s',$Serial,'shell','df','-k','/data')
  $lines=@($r.Output | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  if($lines.Count -eq 0){ return [pscustomobject]@{ Raw='UNKNOWN'; AvailableKb=0 } }
  $last=$lines[-1].Trim()
  $parts=@($last -split '\s+')
  $avail=0L
  if($parts.Count -ge 4){ [void][long]::TryParse($parts[3],[ref]$avail) }
  [pscustomobject]@{ Raw=$last; AvailableKb=$avail }
}

$sourceSdk=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk'
$adb=Join-Path $sourceSdk 'platform-tools\adb.exe'
if(-not (Test-Path -LiteralPath $adb)){ throw "ADB_NOT_FOUND:$adb" }

& $adb start-server | Out-Null
$serial=Get-DeviceSerial $adb
if(-not $serial){ throw 'BOOTED_EMULATOR_NOT_FOUND' }

Write-Host "ANDROID_SERIAL=$serial"
$before=Get-DataFs $adb $serial
Write-Host "DATA_FS_BEFORE=$($before.Raw)"
Write-Host "DATA_AVAILABLE_KB_BEFORE=$($before.AvailableKb)"
Write-Host 'STORAGE_SAFE_CLEANUP=START'

$trim=Invoke-Native $adb @('-s',$serial,'shell','pm','trim-caches','4G')
Write-Host "PM_TRIM_CACHES_EXIT=$($trim.ExitCode)"
[void](Invoke-Native $adb @('-s',$serial,'shell','sh','-c','rm -rf /data/local/tmp/*'))

Start-Sleep 2
$afterTrim=Get-DataFs $adb $serial
Write-Host "DATA_FS_AFTER_TRIM=$($afterTrim.Raw)"
Write-Host "DATA_AVAILABLE_KB_AFTER_TRIM=$($afterTrim.AvailableKb)"

if($afterTrim.AvailableKb -lt 1572864){
  Write-Host 'STORAGE_SECOND_STAGE_CLEANUP=START'
  $downloads=Invoke-Native $adb @('-s',$serial,'shell','pm','clear','com.android.providers.downloads')
  Write-Host "DOWNLOAD_MANAGER_CLEAR_EXIT=$($downloads.ExitCode)"
  $vending=Invoke-Native $adb @('-s',$serial,'shell','pm','clear','com.android.vending')
  Write-Host "PLAY_STORE_LOCAL_DATA_CLEAR_EXIT=$($vending.ExitCode)"
  Start-Sleep 3
}

$after=Get-DataFs $adb $serial
Write-Host "DATA_FS_AFTER=$($after.Raw)"
Write-Host "DATA_AVAILABLE_KB_AFTER=$($after.AvailableKb)"
Write-Host "GOOGLE_ACCOUNT_PRESENT=$($(if(((Invoke-Native $adb @('-s',$serial,'shell','dumpsys','account')).Output -join "`n") -match '(?i)Account\s*\{[^\r\n}]*type=com\.google[^\r\n}]*\}'){'YES'}else{'NO'}))"

[void](Invoke-Native $adb @('-s',$serial,'shell','input','keyevent','3'))
Start-Sleep 2

if($after.AvailableKb -lt 1048576){
  Write-Host 'AVD_INTERNAL_STORAGE_STILL_LOW=YES'
  Write-Host 'AVD_STORAGE_REBUILD_REQUIRED=YES'
  Write-Host 'ACCOUNT_DATA_NOT_WIPED=YES'
  exit 2
}

Write-Host 'STORAGE_SAFE_CLEANUP=PASS'
Write-Host 'RESTARTING_PLAYSTORE_RUNNER=YES'

$runner=Join-Path $env:TEMP 'vibe2-e-run-after-storage.ps1'
$url="https://raw.githubusercontent.com/hans1177/jaewoon-games/main/tools/vibe2-playstore-e-run.ps1?x=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
Invoke-WebRequest $url -OutFile $runner
& powershell -ExecutionPolicy Bypass -File $runner -PackageId $PackageId -TargetRoot $TargetRoot
exit $LASTEXITCODE
