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

function Get-PlayStoreBootedSerial {
  param([string]$Adb)
  $devices = Invoke-Native $Adb @('devices')
  if ($devices.ExitCode -ne 0) { return $null }
  foreach ($line in $devices.Output) {
    if ($line -match '^([^\s]+)\s+device$') {
      $serial = $Matches[1]
      $boot = Invoke-Native $Adb @('-s',$serial,'shell','getprop','sys.boot_completed')
      if ((($boot.Output -join '').Trim()) -ne '1') { continue }
      $store = Invoke-Native $Adb @('-s',$serial,'shell','pm','path','com.android.vending')
      if ($store.ExitCode -eq 0 -and (($store.Output -join "`n") -match '^package:')) { return $serial }
    }
  }
  $null
}

function Get-EmulatorState {
  param([string]$Adb)
  $devices = Invoke-Native $Adb @('devices')
  $rows = @($devices.Output | Where-Object { $_ -match '^emulator-\d+\s+' })
  if ($rows.Count -eq 0) { return 'none' }
  $rows -join '; '
}

function Test-PackageInstalled {
  param([string]$Adb,[string]$Serial,[string]$Package)
  $r = Invoke-Native $Adb @('-s',$Serial,'shell','pm','path',$Package)
  ($r.ExitCode -eq 0 -and (($r.Output -join "`n") -match '^package:'))
}

function Test-GoogleAccountPresent {
  param([string]$Adb,[string]$Serial)
  $r = Invoke-Native $Adb @('-s',$Serial,'shell','dumpsys','account')
  if ($r.ExitCode -ne 0) { return $false }
  $text = $r.Output -join "`n"
  return ($text -match '(?i)Account\s*\{[^\r\n}]*type=com\.google[^\r\n}]*\}')
}

function Get-ProvisionState {
  param([string]$Adb,[string]$Serial)
  $provisioned = ((Invoke-Native $Adb @('-s',$Serial,'shell','settings','get','global','device_provisioned')).Output -join '').Trim()
  $setup = ((Invoke-Native $Adb @('-s',$Serial,'shell','settings','get','secure','user_setup_complete')).Output -join '').Trim()
  [pscustomobject]@{ DeviceProvisioned=$provisioned; UserSetupComplete=$setup }
}

function Get-UiXml {
  param([string]$Adb,[string]$Serial)
  [void](Invoke-Native $Adb @('-s',$Serial,'shell','uiautomator','dump','/sdcard/vibe2-window.xml'))
  $r = Invoke-Native $Adb @('-s',$Serial,'shell','cat','/sdcard/vibe2-window.xml')
  if ($r.ExitCode -ne 0) { return '' }
  $r.Output -join "`n"
}

function Tap-UiNode {
  param([string]$Adb,[string]$Serial,[string]$Xml,[string]$Pattern,[string]$Label)
  foreach ($node in [regex]::Matches($Xml,'<node\b[^>]*>')) {
    $s = $node.Value
    if ($s -notmatch $Pattern) { continue }
    if ($s -match 'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"') {
      $x1=[int]$Matches[1]; $y1=[int]$Matches[2]; $x2=[int]$Matches[3]; $y2=[int]$Matches[4]
      $x=[int](($x1+$x2)/2); $y=[int](($y1+$y2)/2)
      [void](Invoke-Native $Adb @('-s',$Serial,'shell','input','tap',[string]$x,[string]$y))
      Write-Host "$Label=$x,$y"
      return $true
    }
  }
  $false
}

function Try-TapInstall {
  param([string]$Adb,[string]$Serial,[string]$Xml)
  $pattern='(?i)(text|content-desc)="(?:Install|\uC124\uCE58)"'
  Tap-UiNode $Adb $Serial $Xml $pattern 'PLAY_STORE_INSTALL_TAP'
}

function Try-TapWait {
  param([string]$Adb,[string]$Serial,[string]$Xml)
  $pattern='(?i)(text|content-desc)="(?:Wait|\uB300\uAE30)"'
  Tap-UiNode $Adb $Serial $Xml $pattern 'SYSTEM_UI_WAIT_TAP'
}

function Test-SystemUiAnr {
  param([string]$Xml)
  if ([string]::IsNullOrWhiteSpace($Xml)) { return $false }
  $systemUi = ($Xml -match '(?i)(System UI|com\.android\.systemui)')
  $notResponding = ($Xml -match "(?i)(isn't responding|is not responding|not responding)")
  $waitButton = ($Xml -match '(?i)(text|content-desc)="(?:Wait|\uB300\uAE30)"')
  ($systemUi -and $notResponding -and $waitButton)
}

function Recover-SystemUiAnr {
  param([string]$Adb,[string]$Serial,[string]$InitialXml)
  $xml = $InitialXml
  for ($attempt=1; $attempt -le 5; $attempt++) {
    if (-not (Test-SystemUiAnr $xml)) {
      Write-Host "SYSTEM_UI_ANR_STABLE=PASS attempt=$attempt"
      return $true
    }
    Write-Host "SYSTEM_UI_ANR_WAIT_ATTEMPT=$attempt"
    [void](Try-TapWait $Adb $Serial $xml)
    Start-Sleep 8
    $xml=Get-UiXml $Adb $Serial
  }
  if (-not (Test-SystemUiAnr $xml)) {
    Write-Host 'SYSTEM_UI_ANR_STABLE=PASS attempt=final'
    return $true
  }
  return $false
}

function Get-EmulatorLogTail {
  param([string]$StdoutLog,[string]$StderrLog)
  $parts = New-Object System.Collections.Generic.List[string]
  if (Test-Path -LiteralPath $StdoutLog) { $parts.Add(((Get-Content -LiteralPath $StdoutLog -Tail 50 -ErrorAction SilentlyContinue) -join "`n")) }
  if (Test-Path -LiteralPath $StderrLog) { $parts.Add(((Get-Content -LiteralPath $StderrLog -Tail 50 -ErrorAction SilentlyContinue) -join "`n")) }
  @($parts | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "`n"
}

function Wake-UnlockScreen {
  param([string]$Adb,[string]$Serial)
  [void](Invoke-Native $Adb @('-s',$Serial,'shell','input','keyevent','224'))
  [void](Invoke-Native $Adb @('-s',$Serial,'shell','wm','dismiss-keyguard'))
  [void](Invoke-Native $Adb @('-s',$Serial,'shell','input','keyevent','82'))
  [void](Invoke-Native $Adb @('-s',$Serial,'shell','settings','put','system','screen_off_timeout','1800000'))
  [void](Invoke-Native $Adb @('-s',$Serial,'shell','settings','put','global','window_animation_scale','0'))
  [void](Invoke-Native $Adb @('-s',$Serial,'shell','settings','put','global','transition_animation_scale','0'))
  [void](Invoke-Native $Adb @('-s',$Serial,'shell','settings','put','global','animator_duration_scale','0'))
  Start-Sleep 1
  Write-Host 'DISPLAY_WAKE_UNLOCK=PASS'
}

function Get-ForegroundSummary {
  param([string]$Adb,[string]$Serial)
  $activity = Invoke-Native $Adb @('-s',$Serial,'shell','dumpsys','activity','activities')
  $text = $activity.Output -join "`n"
  foreach ($pattern in @('(?im)^\s*mResumedActivity:.*$','(?im)^\s*topResumedActivity=.*$')) {
    $m=[regex]::Match($text,$pattern)
    if($m.Success){ return $m.Value.Trim() }
  }
  $window = Invoke-Native $Adb @('-s',$Serial,'shell','dumpsys','window')
  $text = $window.Output -join "`n"
  foreach ($pattern in @('(?im)^\s*mCurrentFocus=.*$','(?im)^\s*mFocusedApp=.*$')) {
    $m=[regex]::Match($text,$pattern)
    if($m.Success){ return $m.Value.Trim() }
  }
  'FOREGROUND_UNKNOWN'
}

function Get-UiTextSummary {
  param([string]$Xml)
  if ([string]::IsNullOrWhiteSpace($Xml)) { return 'UI_XML_EMPTY' }
  $values = New-Object System.Collections.Generic.List[string]
  foreach ($m in [regex]::Matches($Xml,'(?:text|content-desc)="([^"]+)"')) {
    $v=$m.Groups[1].Value.Trim()
    if ([string]::IsNullOrWhiteSpace($v)) { continue }
    if (-not $values.Contains($v)) { $values.Add($v) }
    if ($values.Count -ge 12) { break }
  }
  if ($values.Count -eq 0) { return 'UI_TEXT_EMPTY' }
  $values -join ' | '
}

function Start-OfficialPlayStorePage {
  param([string]$Adb,[string]$Serial,[string]$Package)
  Wake-UnlockScreen $Adb $Serial
  [void](Invoke-Native $Adb @('-s',$Serial,'shell','am','force-stop','com.android.vending'))
  Start-Sleep 1
  $r=Invoke-Native $Adb @('-s',$Serial,'shell','am','start','-W','-a','android.intent.action.VIEW','-d',"market://details?id=$Package",'-p','com.android.vending')
  Write-Host "PLAY_STORE_START_EXIT=$($r.ExitCode)"
  Start-Sleep 3
}

function Stop-Vibe2Emulator {
  param([string]$Adb,[string]$Serial,[string]$Name)
  if (-not [string]::IsNullOrWhiteSpace($Serial)) {
    [void](Invoke-Native $Adb @('-s',$Serial,'emu','kill'))
    Start-Sleep 3
  }
  try {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object { ($_.Name -eq 'emulator.exe' -or $_.Name -like 'qemu-system-*.exe') -and ([string]$_.CommandLine -match [regex]::Escape($Name)) } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  } catch {}
  Start-Sleep 2
}

function Start-EAvdColdBoot {
  param(
    [string]$Adb,[string]$Emulator,[string]$Serial,[string]$Name,
    [string]$AvdDir,[string]$SystemImage,[string]$Root
  )
  Write-Host 'PLAY_STORE_SOFTWARE_COLD_BOOT=START'
  Stop-Vibe2Emulator $Adb $Serial $Name
  [void](Invoke-Native $Adb @('kill-server'))
  Start-Sleep 2
  [void](Invoke-Native $Adb @('start-server'))
  Get-ChildItem -LiteralPath $AvdDir -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like '*.lock' -or $_.Name -like '*.lock.*' } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  $stdoutLog=Join-Path $Root 'emulator-ui-recover-stdout.log'
  $stderrLog=Join-Path $Root 'emulator-ui-recover-stderr.log'
  Remove-Item -LiteralPath $stdoutLog,$stderrLog -Force -ErrorAction SilentlyContinue
  $proc=Start-Process $Emulator -ArgumentList @(
    '-avd',$Name,'-sysdir',$SystemImage,'-no-snapshot','-no-audio',
    '-gpu','swiftshader_indirect','-accel','auto'
  ) -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
  $deadline=(Get-Date).AddMinutes(12)
  $nextStatus=(Get-Date)
  do {
    Start-Sleep 5
    $booted=Get-PlayStoreBootedSerial $Adb
    if ($booted) {
      Write-Host "PLAY_STORE_SOFTWARE_COLD_BOOT=PASS serial=$booted"
      return $booted
    }
    if ($proc.HasExited) { throw "PLAY_STORE_SOFTWARE_COLD_BOOT_EXITED:$(Get-EmulatorLogTail $stdoutLog $stderrLog)" }
    if ((Get-Date) -ge $nextStatus) {
      Write-Host "ADB_STATE=$(Get-EmulatorState $Adb)"
      $nextStatus=(Get-Date).AddSeconds(20)
    }
  } while ((Get-Date) -lt $deadline)
  throw "PLAY_STORE_SOFTWARE_COLD_BOOT_TIMEOUT:$(Get-EmulatorLogTail $stdoutLog $stderrLog)"
}

$sourceSdk=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk'
$targetSdk=Join-Path $TargetRoot 'Sdk'
$targetAvd=Join-Path $TargetRoot 'avd'
$avdDir=Join-Path $targetAvd "$AvdName.avd"
$avdConfig=Join-Path $avdDir 'config.ini'
$adb=Join-Path $sourceSdk 'platform-tools\adb.exe'
$emulator=Join-Path $sourceSdk 'emulator\emulator.exe'

if (-not (Test-Path -LiteralPath $adb)) { throw "ADB_NOT_FOUND:$adb" }
if (-not (Test-Path -LiteralPath $emulator)) { throw "EMULATOR_NOT_FOUND:$emulator" }
if (-not (Test-Path -LiteralPath $avdConfig)) { throw "E_AVD_CONFIG_NOT_FOUND:$avdConfig" }
$cfg=[System.IO.File]::ReadAllText($avdConfig)
$m=[regex]::Match($cfg,'(?im)^image\.sysdir\.1\s*=\s*(.+?)\s*$')
if (-not $m.Success) { throw "AVD_IMAGE_SYSDIR_NOT_FOUND:$avdConfig" }
$relativeImage=$m.Groups[1].Value.Trim().TrimEnd('\','/') -replace '/','\'
if ($relativeImage -notmatch '(?i)google_apis_playstore\\x86_64$') { throw "E_AVD_NOT_PLAY_STORE_IMAGE:$relativeImage" }
$systemImage=Join-Path $targetSdk $relativeImage
foreach ($required in @('system.img','vendor.img','ramdisk.img','source.properties')) {
  if (-not (Test-Path -LiteralPath (Join-Path $systemImage $required))) { throw "E_SYSTEM_IMAGE_INCOMPLETE:$systemImage missing=$required" }
}

$env:ANDROID_SDK_ROOT=$targetSdk
$env:ANDROID_HOME=$targetSdk
$env:ANDROID_AVD_HOME=$targetAvd
$env:ANDROID_EMULATOR_HOME=$TargetRoot
$env:Path="$(Split-Path $adb -Parent);$env:Path"

& $adb start-server | Out-Null
Write-Host "E_ANDROID_SDK=$targetSdk"
Write-Host "E_ANDROID_AVD=$targetAvd"
Write-Host "E_SYSTEM_IMAGE=$systemImage"
Write-Host "AVD_NAME=$AvdName"
Write-Host "PACKAGE_ID=$PackageId"

$coldBootUsed=$false
$serial=Get-PlayStoreBootedSerial $adb
if (-not $serial) {
  $serial=Start-EAvdColdBoot $adb $emulator $null $AvdName $avdDir $systemImage $TargetRoot
  $coldBootUsed=$true
}

$androidVersion=((Invoke-Native $adb @('-s',$serial,'shell','getprop','ro.build.version.release')).Output -join '').Trim()
$api=((Invoke-Native $adb @('-s',$serial,'shell','getprop','ro.build.version.sdk')).Output -join '').Trim()
$abi=((Invoke-Native $adb @('-s',$serial,'shell','getprop','ro.product.cpu.abi')).Output -join '').Trim()
Write-Host "ANDROID_SERIAL=$serial"
Write-Host "ANDROID_VERSION=$androidVersion"
Write-Host "ANDROID_API=$api"
Write-Host "ANDROID_ABI=$abi"
Write-Host 'PLAY_STORE_PACKAGE=PASS'

$initialGoogleAccount=Test-GoogleAccountPresent $adb $serial
Write-Host "GOOGLE_ACCOUNT_PRESENT=$($(if($initialGoogleAccount){'YES'}else{'NO'}))"
$provision=Get-ProvisionState $adb $serial
Write-Host "DEVICE_PROVISIONED=$($provision.DeviceProvisioned)"
Write-Host "USER_SETUP_COMPLETE=$($provision.UserSetupComplete)"

if (-not (Test-PackageInstalled $adb $serial $PackageId)) {
  Write-Host 'OPENING_OFFICIAL_GOOGLE_PLAY=YES'
  Start-OfficialPlayStorePage $adb $serial $PackageId
  $deadline=(Get-Date).AddMinutes($InstallWaitMinutes)
  $signInShown=$false
  $setupShown=$false
  $playStoreRetried=$false
  $accountLoopRecovered=$false
  $anrAfterColdBoot=0
  $nextDiagnostic=(Get-Date)
  $signInPattern='(?i)(Sign in|Add account|\uB85C\uADF8\uC778|\uACC4\uC815\s*\uCD94\uAC00)'

  do {
    if (Test-PackageInstalled $adb $serial $PackageId) { break }
    Start-Sleep 5
    $xml=Get-UiXml $adb $serial
    $foreground=Get-ForegroundSummary $adb $serial
    $inGoogleAuthFlow=($foreground -match '(?i)(com\.google\.android\.gms/.auth|com\.google\.android\.apps\.restore|setupwizard|provision)')

    if (Test-SystemUiAnr $xml) {
      Write-Host 'SYSTEM_UI_ANR=DETECTED'
      $recovered=Recover-SystemUiAnr $adb $serial $xml
      if ($recovered) {
        Write-Host 'SYSTEM_UI_ANR_WAIT_RECOVERY=PASS'
        Write-Host 'SYSTEM_UI_STABILIZING=15_SECONDS'
        Start-Sleep 15
        $nextDiagnostic=(Get-Date)
        continue
      }

      if (-not $coldBootUsed) {
        Write-Host 'SYSTEM_UI_ANR_WAIT_RECOVERY=FAILED'
        $serial=Start-EAvdColdBoot $adb $emulator $serial $AvdName $avdDir $systemImage $TargetRoot
        $coldBootUsed=$true
        Start-Sleep 15
        Start-OfficialPlayStorePage $adb $serial $PackageId
        $nextDiagnostic=(Get-Date)
        continue
      }

      $anrAfterColdBoot++
      Write-Host "SYSTEM_UI_ANR_AFTER_SINGLE_COLD_BOOT=$anrAfterColdBoot"
      throw 'SYSTEM_UI_ANR_PERSISTED_AFTER_SINGLE_COLD_BOOT'
    }

    $googleAccountPresent=Test-GoogleAccountPresent $adb $serial
    if ($googleAccountPresent -and -not $accountLoopRecovered -and $inGoogleAuthFlow -and $xml -match $signInPattern) {
      Write-Host 'GOOGLE_ACCOUNT_PRESENT=YES'
      Write-Host 'GOOGLE_ACCOUNT_LOGIN_LOOP_RECOVERY=START'
      [void](Invoke-Native $adb @('-s',$serial,'shell','input','keyevent','3'))
      Start-Sleep 2
      Start-OfficialPlayStorePage $adb $serial $PackageId
      $accountLoopRecovered=$true
      $signInShown=$false
      $playStoreRetried=$true
      Write-Host 'GOOGLE_ACCOUNT_LOGIN_LOOP_RECOVERY=PASS'
      continue
    }

    if (-not $signInShown -and $xml -match $signInPattern) {
      Write-Host 'PLAY_STORE_SIGN_IN_REQUIRED=YES'
      Write-Host 'SIGN_IN_LOCATION=EMULATOR_UI_ONLY'
      Write-Host 'PASSWORD_CAPTURED=NO'
      Write-Host 'ACCOUNT_TOKEN_EXPORTED=NO'
      $signInShown=$true
    }

    if (-not $setupShown -and ($inGoogleAuthFlow -or $xml -match '(?i)(Start|Get started|Copy apps|Google services)')) {
      Write-Host 'ANDROID_INITIAL_SETUP_REQUIRED=YES'
      Write-Host 'COMPLETE_SETUP_IN_EMULATOR_UI=YES'
      $setupShown=$true
    }

    [void](Try-TapInstall $adb $serial $xml)

    if ((Get-Date) -ge $nextDiagnostic) {
      Write-Host "FOREGROUND=$foreground"
      Write-Host "UI_TEXT=$(Get-UiTextSummary $xml)"
      Write-Host "GOOGLE_ACCOUNT_PRESENT=$($(if($googleAccountPresent){'YES'}else{'NO'}))"
      $nextDiagnostic=(Get-Date).AddSeconds(20)
    }

    if (-not $playStoreRetried -and -not $inGoogleAuthFlow -and (Get-Date) -gt $deadline.AddMinutes(-($InstallWaitMinutes-1))) {
      if ($foreground -notmatch '(?i)com\.android\.vending') {
        Write-Host 'PLAY_STORE_FOREGROUND_RECOVERY=START'
        Start-OfficialPlayStorePage $adb $serial $PackageId
        $playStoreRetried=$true
      }
    }
  } while ((Get-Date) -lt $deadline)
}

if (-not (Test-PackageInstalled $adb $serial $PackageId)) { throw "INSTALL_NOT_DETECTED_WITHIN_${InstallWaitMinutes}_MINUTES" }

$launch=Invoke-Native $adb @('-s',$serial,'shell','monkey','-p',$PackageId,'-c','android.intent.category.LAUNCHER','1')
Start-Sleep 8
$pid=((Invoke-Native $adb @('-s',$serial,'shell','pidof',$PackageId)).Output -join '').Trim()
$focus=((Invoke-Native $adb @('-s',$serial,'shell','dumpsys','window')).Output -join "`n")
$foreground=$focus -match [regex]::Escape($PackageId)
$launchPass=($launch.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($pid))
$outPath=Join-Path $TargetRoot 'vibe2-playstore-bootstrap.json'
[ordered]@{
  version=7
  packageId=$PackageId
  installPolicy='OFFICIAL_GOOGLE_PLAY_ONLY'
  codeExtractionAllowed=$false
  binaryRedistributionAllowed=$false
  runtimePromotionAllowed=$false
  serial=$serial
  androidVersion=$androidVersion
  apiLevel=$api
  abi=$abi
  installed=$true
  launchPass=$launchPass
  foregroundPass=[bool]$foreground
  processId=$pid
  observedAt=(Get-Date).ToUniversalTime().ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $outPath -Encoding UTF8

Write-Host ''
Write-Host 'VIBE2_LOCAL_PLAYSTORE_BOOTSTRAP=PASS'
Write-Host "RESULT_JSON=$outPath"
Write-Host "GAME_LAUNCH_PASS=$launchPass"
Write-Host "GAME_FOREGROUND_PASS=$foreground"
Write-Host 'PASSWORD_CAPTURED=NO'
Write-Host 'ACCOUNT_TOKEN_EXPORTED=NO'