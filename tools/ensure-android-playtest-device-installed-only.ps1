param(
  [string]$OutDir = "$env:RUNNER_TEMP\external-mobile-game-playtest"
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$AvdName = 'Vibe2FreshPlayStore'

function Write-Evidence {
  param([string]$Status,[string]$Reason,[hashtable]$Extra=@{})
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
  $p=[ordered]@{version=1;status=$Status;reason=$Reason;authority='EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE';autoLicenseAcceptance=$false;otherUserAvdAccess=$false;observedAt=(Get-Date).ToUniversalTime().ToString('o')}
  foreach($k in $Extra.Keys){$p[$k]=$Extra[$k]}
  $p|ConvertTo-Json -Depth 10|Set-Content (Join-Path $OutDir 'device-provision.json') -Encoding UTF8
}

function Invoke-Native {
  param([string]$Exe,[string[]]$Args,[string[]]$Stdin=@())
  $old=$ErrorActionPreference
  try {
    $ErrorActionPreference='Continue'
    if($Stdin.Count){$o=$Stdin|& $Exe @Args 2>&1}else{$o=& $Exe @Args 2>&1}
    $c=$LASTEXITCODE
  } finally {$ErrorActionPreference=$old}
  [pscustomobject]@{ExitCode=[int]$c;Output=@($o|ForEach-Object{[string]$_})}
}

function Add-ReadableSdkRoot {
  param([System.Collections.Generic.List[string]]$List,[string]$Path)
  if([string]::IsNullOrWhiteSpace($Path)){return}
  try {
    if([System.IO.Directory]::Exists($Path)){$List.Add($Path)}
  } catch {}
}

function Get-SdkRoots {
  $r=New-Object System.Collections.Generic.List[string]
  Add-ReadableSdkRoot $r $env:ANDROID_SDK_ROOT
  Add-ReadableSdkRoot $r $env:ANDROID_HOME
  Add-ReadableSdkRoot $r (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk')
  $users=Join-Path $env:SystemDrive 'Users'
  try {
    if([System.IO.Directory]::Exists($users)){
      Get-ChildItem $users -Directory -ErrorAction SilentlyContinue|ForEach-Object{
        Add-ReadableSdkRoot $r (Join-Path $_.FullName 'AppData\Local\Android\Sdk')
      }
    }
  } catch {}
  $unity=Join-Path $env:ProgramFiles 'Unity\Hub\Editor'
  try {
    if([System.IO.Directory]::Exists($unity)){
      Get-ChildItem $unity -Directory -ErrorAction SilentlyContinue|Sort-Object Name -Descending|ForEach-Object{
        Add-ReadableSdkRoot $r (Join-Path $_.FullName 'Editor\Data\PlaybackEngines\AndroidPlayer\SDK')
      }
    }
  } catch {}
  @($r|Select-Object -Unique)
}

function Find-Tool {
  param([string]$Root,[string]$Name)
  $c=@((Join-Path $Root "cmdline-tools\latest\bin\$Name.bat"),(Join-Path $Root "tools\bin\$Name.bat"))
  $cmd=Join-Path $Root 'cmdline-tools'
  try {
    if([System.IO.Directory]::Exists($cmd)){
      $c+=@(Get-ChildItem $cmd -Directory -ErrorAction SilentlyContinue|Sort-Object Name -Descending|ForEach-Object{Join-Path $_.FullName "bin\$Name.bat"})
    }
  } catch {}
  foreach($p in $c){try{if([System.IO.File]::Exists($p)){return $p}}catch{}}
  $null
}

function Find-PlayStoreImage {
  param([string]$Root)
  $base=Join-Path $Root 'system-images'
  try {
    if(-not [System.IO.Directory]::Exists($base)){return $null}
    $hits=@(Get-ChildItem $base -Directory -Recurse -ErrorAction SilentlyContinue|Where-Object{
      $_.Name -eq 'x86_64' -and $_.Parent -and $_.Parent.Name -eq 'google_apis_playstore' -and $_.Parent.Parent -and $_.Parent.Parent.Name -match '^android-\d+$'
    }|Sort-Object{[int]($_.Parent.Parent.Name-replace '^android-','')} -Descending)
    if(-not $hits.Count){return $null}
    $h=$hits[0];$api=$h.Parent.Parent.Name
    [pscustomobject]@{Package="system-images;$api;google_apis_playstore;x86_64";Api=$api}
  } catch { $null }
}

function Set-Java {
  if(Get-Command java.exe -ErrorAction SilentlyContinue){return}
  $unity=Join-Path $env:ProgramFiles 'Unity\Hub\Editor'
  try {
    $j=Get-ChildItem $unity -Directory -ErrorAction SilentlyContinue|Sort-Object Name -Descending|ForEach-Object{
      $x=Join-Path $_.FullName 'Editor\Data\PlaybackEngines\AndroidPlayer\OpenJDK\bin\java.exe';if([System.IO.File]::Exists($x)){$x}
    }|Select-Object -First 1
    if($j){$home=Split-Path (Split-Path $j -Parent) -Parent;$env:JAVA_HOME=$home;$env:Path="$(Join-Path $home 'bin');$env:Path"}
  } catch {}
}

function Online-PlayStoreDevice {
  $d=Invoke-Native 'adb' @('devices')
  if($d.ExitCode){return $null}
  foreach($line in $d.Output){
    if($line -match '^([^\s]+)\s+device$'){
      $s=$Matches[1];$p=Invoke-Native 'adb' @('-s',$s,'shell','pm','path','com.android.vending')
      if(-not $p.ExitCode -and (($p.Output-join "`n") -match '^package:')){return $s}
    }
  }
  $null
}

function Start-FreshAvd {
  param([string]$Root,[string]$Emulator,[string]$AvdManager,[string]$Package)
  $env:ANDROID_SDK_ROOT=$Root;$env:ANDROID_HOME=$Root
  $pt=Join-Path $Root 'platform-tools';if([System.IO.Directory]::Exists($pt)){$env:Path="$pt;$env:Path"}
  $home=Join-Path $env:RUNNER_TEMP 'vibe2-fresh-playstore-avd';New-Item -ItemType Directory -Path $home -Force|Out-Null;$env:ANDROID_AVD_HOME=$home
  $del=Invoke-Native $AvdManager @('delete','avd','--name',$AvdName)
  $create=Invoke-Native $AvdManager @('create','avd','--name',$AvdName,'--package',$Package,'--device','pixel','--force') @('no')
  if($create.ExitCode){return @{Pass=$false;Reason='FRESH_AVD_CREATE_FAILED';Output=@($create.Output|Select-Object -Last 20)}}
  $config=Join-Path $home "$AvdName.avd\config.ini"
  if(-not [System.IO.File]::Exists($config)){return @{Pass=$false;Reason='FRESH_AVD_CONFIG_MISSING'}}
  $raw=[System.IO.File]::ReadAllText($config)
  if($raw -notmatch '(?im)^PlayStore\.enabled\s*=\s*yes\s*$'){return @{Pass=$false;Reason='FRESH_AVD_NOT_PLAY_STORE'}}
  $proc=Start-Process $Emulator -ArgumentList @('-avd',$AvdName,'-no-window','-no-audio','-no-boot-anim','-no-snapshot-save','-gpu','swiftshader_indirect') -PassThru
  $deadline=(Get-Date).AddMinutes(6);$serial=$null
  do{Start-Sleep 5;$serial=Online-PlayStoreDevice;if($serial){break};if($proc.HasExited){return @{Pass=$false;Reason='FRESH_AVD_EXITED';ExitCode=$proc.ExitCode}}}while((Get-Date)-lt $deadline)
  if(-not $serial){return @{Pass=$false;Reason='FRESH_AVD_BOOT_TIMEOUT'}}
  @{Pass=$true;Serial=$serial;Pid=$proc.Id}
}

$online=Online-PlayStoreDevice
if($online){Write-Evidence 'PASS' 'PLAY_STORE_DEVICE_ALREADY_ONLINE' @{serial=$online};exit 0}

Set-Java
$roots=@(Get-SdkRoots)
Write-Host "READABLE_ANDROID_SDK_ROOTS=$($roots.Count)"
$attempts=@()
foreach($root in $roots){
  try{
    $emu=Join-Path $root 'emulator\emulator.exe';$avd=Find-Tool $root 'avdmanager';$img=Find-PlayStoreImage $root
    $hasEmu=[System.IO.File]::Exists($emu)
    if(-not $hasEmu -or -not $avd -or $null -eq $img){$attempts+=@{hasEmulator=$hasEmu;hasAvdManager=[bool]$avd;hasInstalledPlayStoreImage=($null-ne $img)};continue}
    Write-Host "PREINSTALLED_PLAY_STORE_IMAGE_FOUND=$($img.Package)"
    $s=Start-FreshAvd $root $emu $avd $img.Package
    if($s.Pass){Write-Evidence 'PASS' 'PREINSTALLED_PLAY_STORE_IMAGE_FRESH_AVD_READY' @{serial=$s.Serial;systemImage=$img.Package;emulatorPid=$s.Pid};exit 0}
    $attempts+=@{package=$img.Package;result=$s.Reason}
  }catch{$attempts+=@{result='SDK_ROOT_UNREADABLE_OR_INVALID';detail=$_.Exception.GetType().Name}}
}
Write-Evidence 'BLOCKED' 'BLOCKED_NO_ACCESSIBLE_PREINSTALLED_PLAY_STORE_IMAGE' @{readableSdkRootCount=$roots.Count;attempts=$attempts}
throw 'BLOCKED_NO_ACCESSIBLE_PREINSTALLED_PLAY_STORE_IMAGE'
