param(
  [string]$OutDir = "$env:RUNNER_TEMP\external-mobile-game-playtest"
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$AvdName = 'Vibe2PlayStoreApi35'
$InstalledAvdName = 'Vibe2PlayStoreInstalled'
$SystemImage = 'system-images;android-35;google_apis_playstore;x86_64'

function Write-Evidence {
  param([string]$Status, [string]$Reason, [hashtable]$Extra = @{})
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
  $payload = [ordered]@{
    version = 4
    status = $Status
    reason = $Reason
    authority = 'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE'
    autoLicenseAcceptance = $false
    observedAt = (Get-Date).ToUniversalTime().ToString('o')
  }
  foreach ($key in $Extra.Keys) { $payload[$key] = $Extra[$key] }
  $payload | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $OutDir 'device-provision.json') -Encoding UTF8
}

function Invoke-Native {
  param([string]$Exe, [string[]]$NativeArgs, [string[]]$StdinLines = @())
  $previous = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    if ($StdinLines.Count -gt 0) { $output = $StdinLines | & $Exe @NativeArgs 2>&1 }
    else { $output = & $Exe @NativeArgs 2>&1 }
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
  return [pscustomobject]@{ ExitCode=[int]$code; Output=@($output | ForEach-Object { [string]$_ }) }
}

function Get-SdkRoots {
  $roots = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_SDK_ROOT)) { $roots.Add($env:ANDROID_SDK_ROOT) }
  if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) { $roots.Add($env:ANDROID_HOME) }
  $roots.Add((Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk'))

  # Read-only discovery of Android SDK installations under normal Windows user profiles.
  # We intentionally do not inspect or reuse another user's AVD/account data.
  $usersRoot = Join-Path $env:SystemDrive 'Users'
  if (Test-Path $usersRoot) {
    Get-ChildItem $usersRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      $roots.Add((Join-Path $_.FullName 'AppData\Local\Android\Sdk'))
    }
  }

  $unityEditors = Join-Path $env:ProgramFiles 'Unity\Hub\Editor'
  if (Test-Path $unityEditors) {
    Get-ChildItem $unityEditors -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
      $roots.Add((Join-Path $_.FullName 'Editor\Data\PlaybackEngines\AndroidPlayer\SDK'))
    }
  }
  return @($roots | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique)
}

function Set-AvailableJava {
  if (Get-Command java.exe -ErrorAction SilentlyContinue) { return }
  $unityEditors = Join-Path $env:ProgramFiles 'Unity\Hub\Editor'
  if (-not (Test-Path $unityEditors)) { return }
  $java = Get-ChildItem $unityEditors -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
    $candidate = Join-Path $_.FullName 'Editor\Data\PlaybackEngines\AndroidPlayer\OpenJDK\bin\java.exe'
    if (Test-Path $candidate) { $candidate }
  } | Select-Object -First 1
  if ($java) {
    $javaHome = Split-Path (Split-Path $java -Parent) -Parent
    $env:JAVA_HOME = $javaHome
    $env:Path = "$(Join-Path $javaHome 'bin');$env:Path"
    Write-Host 'ANDROID_AVD_JAVA_SOURCE=UNITY_OPENJDK'
  }
}

function Get-OnlineDevices {
  $probe = Invoke-Native -Exe 'adb' -NativeArgs @('devices')
  if ($probe.ExitCode -ne 0) { return @() }
  $devices = @()
  foreach ($line in $probe.Output) {
    if ($line -match '^([^\s]+)\s+device$') { $devices += $Matches[1] }
  }
  return @($devices)
}

function Test-DevicePlayStore {
  param([string]$Serial)
  $probe = Invoke-Native -Exe 'adb' -NativeArgs @('-s',$Serial,'shell','pm','path','com.android.vending')
  return ($probe.ExitCode -eq 0 -and (($probe.Output -join "`n") -match '^package:'))
}

function Find-ToolInRoot {
  param([string]$Root, [string]$ToolName)
  $candidates = @(
    (Join-Path $Root "cmdline-tools\latest\bin\$ToolName.bat"),
    (Join-Path $Root "tools\bin\$ToolName.bat")
  )
  $cmdline = Join-Path $Root 'cmdline-tools'
  if (Test-Path $cmdline) {
    $candidates += @(Get-ChildItem $cmdline -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
      Join-Path $_.FullName "bin\$ToolName.bat"
    })
  }
  return ($candidates | Where-Object { Test-Path $_ } | Select-Object -First 1)
}

function Find-InstalledPlayStoreImage {
  param([string]$Root)
  $systemImages = Join-Path $Root 'system-images'
  if (-not (Test-Path $systemImages)) { return $null }
  $abis = @(Get-ChildItem $systemImages -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -eq 'x86_64' -and $_.Parent -and $_.Parent.Name -eq 'google_apis_playstore' -and $_.Parent.Parent -and $_.Parent.Parent.Name -match '^android-\d+$'
  } | Sort-Object { [int]($_.Parent.Parent.Name -replace '^android-','') } -Descending)
  if ($abis.Count -eq 0) { return $null }
  $abi = $abis[0]
  $api = $abi.Parent.Parent.Name
  return [pscustomobject]@{
    Package = "system-images;$api;google_apis_playstore;x86_64"
    Path = $abi.FullName
    Api = $api
  }
}

function Test-PreacceptedLicense {
  param([string]$Root)
  $licenseDir = Join-Path $Root 'licenses'
  $androidLicense = Join-Path $licenseDir 'android-sdk-license'
  if (-not (Test-Path $androidLicense)) { return $false }
  try { return ((Get-Content $androidLicense -ErrorAction Stop | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }).Count -gt 0) }
  catch { return $false }
}

function Test-AvdPlayStoreFlag {
  param([string]$Name)
  $avdHome = $env:ANDROID_AVD_HOME
  if ([string]::IsNullOrWhiteSpace($avdHome)) { $avdHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.android\avd' }
  $config = Join-Path $avdHome "$Name.avd\config.ini"
  if (-not (Test-Path $config)) { return $false }
  $raw = Get-Content -Raw -ErrorAction SilentlyContinue $config
  return ($raw -match '(?im)^PlayStore\.enabled\s*=\s*yes\s*$')
}

function Start-And-VerifyAvd {
  param([string]$SdkRoot, [string]$Emulator, [string]$Name)
  $env:ANDROID_SDK_ROOT = $SdkRoot
  $env:ANDROID_HOME = $SdkRoot
  $platformTools = Join-Path $SdkRoot 'platform-tools'
  if (Test-Path $platformTools) { $env:Path = "$platformTools;$env:Path" }
  $avdHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.android\avd'
  $env:ANDROID_AVD_HOME = $avdHome

  $proc = Start-Process -FilePath $Emulator -ArgumentList @('-avd',$Name,'-no-window','-no-audio','-no-boot-anim','-no-snapshot-save','-gpu','swiftshader_indirect') -PassThru
  Write-Host "ANDROID_EMULATOR_PID=$($proc.Id)"
  $deadline = (Get-Date).AddMinutes(5)
  $serial = $null
  do {
    Start-Sleep -Seconds 5
    foreach ($device in @(Get-OnlineDevices)) {
      $serial = $device
      break
    }
    if ($serial) { break }
    if ($proc.HasExited) { return @{ Pass=$false; Reason='BLOCKED_ANDROID_AVD_EXITED_DURING_BOOT'; ExitCode=$proc.ExitCode } }
  } while ((Get-Date) -lt $deadline)
  if (-not $serial) { return @{ Pass=$false; Reason='BLOCKED_ANDROID_AVD_BOOT_TIMEOUT' } }

  $bootDeadline = (Get-Date).AddMinutes(4)
  $booted = $false
  do {
    $boot = Invoke-Native -Exe 'adb' -NativeArgs @('-s',$serial,'shell','getprop','sys.boot_completed')
    if ($boot.ExitCode -eq 0 -and (($boot.Output -join '').Trim() -eq '1')) { $booted=$true; break }
    Start-Sleep -Seconds 5
  } while ((Get-Date) -lt $bootDeadline)
  if (-not $booted) { return @{ Pass=$false; Reason='BLOCKED_ANDROID_AVD_SYSTEM_BOOT_TIMEOUT'; Serial=$serial } }
  if (-not (Test-DevicePlayStore -Serial $serial)) { return @{ Pass=$false; Reason='BLOCKED_ANDROID_AVD_WITHOUT_PLAY_STORE'; Serial=$serial } }
  return @{ Pass=$true; Serial=$serial; EmulatorPid=$proc.Id }
}

foreach ($device in @(Get-OnlineDevices)) {
  if (Test-DevicePlayStore -Serial $device) {
    Write-Host "ANDROID_PLAY_STORE_DEVICE_ALREADY_ONLINE=$device"
    Write-Evidence -Status 'PASS' -Reason 'PLAY_STORE_DEVICE_ALREADY_ONLINE' -Extra @{ serial=$device }
    exit 0
  }
}

$roots = @(Get-SdkRoots)
Write-Host "ANDROID_SDK_ROOT_CANDIDATE_COUNT=$($roots.Count)"
Set-AvailableJava

# First reuse an AVD already created for this service account. Never inspect another user's AVD/account data.
foreach ($root in $roots) {
  $emulator = Join-Path $root 'emulator\emulator.exe'
  if (-not (Test-Path $emulator)) { continue }
  $env:ANDROID_SDK_ROOT = $root
  $env:ANDROID_HOME = $root
  $list = Invoke-Native -Exe $emulator -NativeArgs @('-list-avds')
  if ($list.ExitCode -ne 0) { continue }
  foreach ($name in @($list.Output | ForEach-Object { $_.Trim() } | Where-Object { $_ })) {
    if (-not (Test-AvdPlayStoreFlag -Name $name)) { continue }
    Write-Host "ANDROID_REUSING_SERVICE_PLAY_STORE_AVD=$name"
    $started = Start-And-VerifyAvd -SdkRoot $root -Emulator $emulator -Name $name
    if ($started.Pass) {
      Write-Evidence -Status 'PASS' -Reason 'PREEXISTING_PLAY_STORE_AVD_READY' -Extra @{ sdkRoot=$root; avd=$name; serial=$started.Serial; emulatorPid=$started.EmulatorPid }
      exit 0
    }
    Write-Host "ANDROID_PREEXISTING_AVD_START_FAILED=$($started.Reason)"
  }
}

# Next, use only already-downloaded emulator/system-image files. This does not call sdkmanager,
# accept licenses, inspect another user's AVD, or access another user's Google account.
$installedImageAttempts = @()
foreach ($root in $roots) {
  $emulator = Join-Path $root 'emulator\emulator.exe'
  $avdManager = Find-ToolInRoot -Root $root -ToolName 'avdmanager'
  $installedImage = Find-InstalledPlayStoreImage -Root $root
  if (-not (Test-Path $emulator) -or -not $avdManager -or $null -eq $installedImage) {
    $installedImageAttempts += [ordered]@{ hasEmulator=(Test-Path $emulator); hasAvdManager=[bool]$avdManager; hasInstalledPlayStoreImage=($null -ne $installedImage) }
    continue
  }

  Write-Host "ANDROID_FOUND_PREINSTALLED_PLAY_STORE_IMAGE=$($installedImage.Package)"
  $env:ANDROID_SDK_ROOT = $root
  $env:ANDROID_HOME = $root
  $platformTools = Join-Path $root 'platform-tools'
  if (Test-Path $platformTools) { $env:Path = "$platformTools;$env:Path" }
  $avdHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.android\avd'
  $env:ANDROID_AVD_HOME = $avdHome
  New-Item -ItemType Directory -Path $avdHome -Force | Out-Null

  $list = Invoke-Native -Exe $emulator -NativeArgs @('-list-avds')
  $names = @($list.Output | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ($names -contains $InstalledAvdName -and -not (Test-AvdPlayStoreFlag -Name $InstalledAvdName)) {
    Invoke-Native -Exe $avdManager -NativeArgs @('delete','avd','--name',$InstalledAvdName) | Out-Null
    $names = @($names | Where-Object { $_ -ne $InstalledAvdName })
  }
  if ($names -notcontains $InstalledAvdName) {
    $create = Invoke-Native -Exe $avdManager -NativeArgs @('create','avd','--name',$InstalledAvdName,'--package',$installedImage.Package,'--device','pixel','--force') -StdinLines @('no')
    Write-Host ($create.Output -join "`n")
    if ($create.ExitCode -ne 0) {
      $installedImageAttempts += [ordered]@{ package=$installedImage.Package; result='FRESH_AVD_CREATE_FAILED'; exitCode=$create.ExitCode; output=@($create.Output | Select-Object -Last 20) }
      continue
    }
  }
  if (-not (Test-AvdPlayStoreFlag -Name $InstalledAvdName)) {
    $installedImageAttempts += [ordered]@{ package=$installedImage.Package; result='FRESH_AVD_NO_PLAY_STORE_FLAG' }
    continue
  }

  $started = Start-And-VerifyAvd -SdkRoot $root -Emulator $emulator -Name $InstalledAvdName
  if ($started.Pass) {
    Write-Evidence -Status 'PASS' -Reason 'PREINSTALLED_PLAY_STORE_IMAGE_FRESH_AVD_READY' -Extra @{ avd=$InstalledAvdName; serial=$started.Serial; emulatorPid=$started.EmulatorPid; systemImage=$installedImage.Package }
    exit 0
  }
  $installedImageAttempts += [ordered]@{ package=$installedImage.Package; result=$started.Reason }
}

# Finally, provision only inside an SDK root whose Android SDK license was already accepted before this workflow.
$attempts = @()
foreach ($root in $roots) {
  if (-not (Test-PreacceptedLicense -Root $root)) {
    $attempts += [ordered]@{ preacceptedLicense=$false; result='SKIP_LICENSE_NOT_PREACCEPTED' }
    continue
  }
  $sdkManager = Find-ToolInRoot -Root $root -ToolName 'sdkmanager'
  $avdManager = Find-ToolInRoot -Root $root -ToolName 'avdmanager'
  if (-not $sdkManager -or -not $avdManager) {
    $attempts += [ordered]@{ preacceptedLicense=$true; result='SKIP_COMMANDLINE_TOOLS_MISSING' }
    continue
  }

  Write-Host 'ANDROID_PREACCEPTED_SDK_FOUND=YES'
  Write-Host 'ANDROID_AUTO_LICENSE_ACCEPTANCE=NO'
  $env:ANDROID_SDK_ROOT = $root
  $env:ANDROID_HOME = $root
  $install = Invoke-Native -Exe $sdkManager -NativeArgs @("--sdk_root=$root",'platform-tools','emulator',$SystemImage) -StdinLines @('n')
  $installText = $install.Output -join "`n"
  Write-Host $installText
  if ($installText -match '(?i)license.*not accepted|licenses.*not accepted|Accept\?') {
    $attempts += [ordered]@{ preacceptedLicense=$true; result='LICENSE_ADDITIONAL_ACCEPTANCE_REQUIRED'; exitCode=$install.ExitCode }
    continue
  }
  if ($install.ExitCode -ne 0) {
    $attempts += [ordered]@{ preacceptedLicense=$true; result='PACKAGE_INSTALL_FAILED'; exitCode=$install.ExitCode; output=@($install.Output | Select-Object -Last 20) }
    continue
  }

  $emulator = Join-Path $root 'emulator\emulator.exe'
  if (-not (Test-Path $emulator)) {
    $attempts += [ordered]@{ preacceptedLicense=$true; result='EMULATOR_BINARY_MISSING_AFTER_INSTALL' }
    continue
  }

  $avdHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.android\avd'
  $env:ANDROID_AVD_HOME = $avdHome
  New-Item -ItemType Directory -Path $avdHome -Force | Out-Null
  $list = Invoke-Native -Exe $emulator -NativeArgs @('-list-avds')
  $names = @($list.Output | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ($names -notcontains $AvdName) {
    $create = Invoke-Native -Exe $avdManager -NativeArgs @('create','avd','--name',$AvdName,'--package',$SystemImage,'--device','pixel','--force') -StdinLines @('no')
    Write-Host ($create.Output -join "`n")
    if ($create.ExitCode -ne 0) {
      $attempts += [ordered]@{ preacceptedLicense=$true; result='AVD_CREATE_FAILED'; exitCode=$create.ExitCode; output=@($create.Output | Select-Object -Last 20) }
      continue
    }
  }
  if (-not (Test-AvdPlayStoreFlag -Name $AvdName)) {
    $attempts += [ordered]@{ preacceptedLicense=$true; result='CREATED_AVD_NO_PLAY_STORE_FLAG' }
    continue
  }

  $started = Start-And-VerifyAvd -SdkRoot $root -Emulator $emulator -Name $AvdName
  if ($started.Pass) {
    Write-Host "ANDROID_PLAY_STORE_AVD_READY=$AvdName"
    Write-Evidence -Status 'PASS' -Reason 'PREACCEPTED_SDK_PLAY_STORE_AVD_READY' -Extra @{ avd=$AvdName; serial=$started.Serial; emulatorPid=$started.EmulatorPid; systemImage=$SystemImage; attempts=$attempts }
    exit 0
  }
  $attempts += [ordered]@{ preacceptedLicense=$true; result=$started.Reason }
}

$hasPreaccepted = @($attempts | Where-Object { $_.preacceptedLicense -eq $true }).Count -gt 0
$reason = if ($hasPreaccepted) { 'BLOCKED_PREACCEPTED_ANDROID_SDK_CANNOT_PROVISION_PLAY_STORE_AVD' } else { 'BLOCKED_ANDROID_SDK_LICENSE_ACCEPTANCE_REQUIRED' }
Write-Evidence -Status 'BLOCKED' -Reason $reason -Extra @{ searchedSdkRootCount=$roots.Count; installedImageAttempts=$installedImageAttempts; attempts=$attempts; requiredSystemImage=$SystemImage }
throw $reason
