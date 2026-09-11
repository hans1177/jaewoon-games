param(
  [string]$OutDir = "$env:RUNNER_TEMP\external-mobile-game-playtest"
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProvisionAvdName = 'Vibe2PlayStoreApi35'
$ProvisionImage = 'system-images;android-35;google_apis_playstore;x86_64'
$UserSdkRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk'

function Write-ProvisionEvidence {
  param([string]$Status, [string]$Reason, [hashtable]$Extra = @{})
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
  $payload = [ordered]@{
    version = 2
    status = $Status
    reason = $Reason
    authority = 'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE'
    observedAt = (Get-Date).ToUniversalTime().ToString('o')
  }
  foreach ($key in $Extra.Keys) { $payload[$key] = $Extra[$key] }
  $payload | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $OutDir 'device-provision.json') -Encoding UTF8
}

function Invoke-Native {
  param([string]$Exe, [string[]]$NativeArgs, [string[]]$StdinLines = @())
  $previous = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    if ($StdinLines.Count -gt 0) {
      $output = $StdinLines | & $Exe @NativeArgs 2>&1
    } else {
      $output = & $Exe @NativeArgs 2>&1
    }
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
  return [pscustomobject]@{
    ExitCode = [int]$code
    Output = @($output | ForEach-Object { [string]$_ })
  }
}

function Get-OnlineDevices {
  $result = Invoke-Native -Exe 'adb' -NativeArgs @('devices')
  if ($result.ExitCode -ne 0) { throw "ADB_DEVICES_FAILED:$($result.ExitCode)" }
  $devices = @()
  foreach ($line in $result.Output) {
    if ($line -match '^([^\s]+)\s+device$') { $devices += $Matches[1] }
  }
  return @($devices)
}

function Get-SdkRoots {
  $roots = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_SDK_ROOT)) { $roots.Add($env:ANDROID_SDK_ROOT) }
  if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) { $roots.Add($env:ANDROID_HOME) }
  $roots.Add($UserSdkRoot)
  $unityRoot = Join-Path $env:ProgramFiles 'Unity\Hub\Editor'
  if (Test-Path $unityRoot) {
    Get-ChildItem $unityRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
      $roots.Add((Join-Path $_.FullName 'Editor\Data\PlaybackEngines\AndroidPlayer\SDK'))
    }
  }
  return @($roots | Where-Object { $_ } | Select-Object -Unique)
}

function Find-JavaHome {
  $candidates = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) { $candidates.Add($env:JAVA_HOME) }

  $unityRoot = Join-Path $env:ProgramFiles 'Unity\Hub\Editor'
  if (Test-Path $unityRoot) {
    Get-ChildItem $unityRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
      $candidates.Add((Join-Path $_.FullName 'Editor\Data\PlaybackEngines\AndroidPlayer\OpenJDK'))
    }
  }

  $adoptiumRoot = Join-Path $env:ProgramFiles 'Eclipse Adoptium'
  if (Test-Path $adoptiumRoot) {
    Get-ChildItem $adoptiumRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
      $candidates.Add($_.FullName)
    }
  }

  $javaRoot = Join-Path $env:ProgramFiles 'Java'
  if (Test-Path $javaRoot) {
    Get-ChildItem $javaRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
      $candidates.Add($_.FullName)
    }
  }

  foreach ($candidate in @($candidates | Where-Object { $_ } | Select-Object -Unique)) {
    if (Test-Path (Join-Path $candidate 'bin\java.exe')) { return $candidate }
  }
  return $null
}

function Set-JavaEnvironment {
  $javaHome = Find-JavaHome
  if (-not $javaHome) {
    Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_JAVA_NOT_FOUND_FOR_ANDROID_SDK' -Extra @{
      unityRoot = (Join-Path $env:ProgramFiles 'Unity\Hub\Editor')
      currentJavaHome = [string]$env:JAVA_HOME
    }
    throw 'BLOCKED_JAVA_NOT_FOUND_FOR_ANDROID_SDK'
  }

  $javaExe = Join-Path $javaHome 'bin\java.exe'
  $env:JAVA_HOME = $javaHome
  $env:Path = "$(Join-Path $javaHome 'bin');$env:Path"
  $probe = Invoke-Native -Exe $javaExe -NativeArgs @('-version')
  Write-Host "JAVA_HOME=$javaHome"
  Write-Host ($probe.Output -join "`n")
  if ($probe.ExitCode -ne 0) {
    Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_JAVA_RUNTIME_FAILED' -Extra @{ javaHome=$javaHome; exitCode=$probe.ExitCode; output=$probe.Output }
    throw 'BLOCKED_JAVA_RUNTIME_FAILED'
  }
  return $javaHome
}

function Find-SdkTool {
  param([string]$ToolName)
  foreach ($root in @(Get-SdkRoots)) {
    $candidates = @(
      (Join-Path $root "cmdline-tools\latest\bin\$ToolName.bat"),
      (Join-Path $root "tools\bin\$ToolName.bat")
    )
    $cmdlineRoot = Join-Path $root 'cmdline-tools'
    if (Test-Path $cmdlineRoot) {
      $candidates += @(Get-ChildItem $cmdlineRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object {
        Join-Path $_.FullName "bin\$ToolName.bat"
      })
    }
    foreach ($candidate in $candidates) {
      if ($candidate -and (Test-Path $candidate)) { return $candidate }
    }
  }
  return $null
}

function Find-EmulatorExe {
  foreach ($root in @(Get-SdkRoots)) {
    $candidate = Join-Path $root 'emulator\emulator.exe'
    if (Test-Path $candidate) { return $candidate }
  }
  return $null
}

function Test-AvdPlayStoreFlag {
  param([string]$AvdName)
  $avdRoot = $env:ANDROID_AVD_HOME
  if ([string]::IsNullOrWhiteSpace($avdRoot)) {
    $avdRoot = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.android\avd'
  }
  $config = Join-Path $avdRoot "$AvdName.avd\config.ini"
  if (-not (Test-Path $config)) { return $false }
  $raw = Get-Content -Raw -ErrorAction SilentlyContinue $config
  return ($raw -match '(?im)^PlayStore\.enabled\s*=\s*yes\s*$')
}

function Ensure-PlayStoreAvd {
  $sdkManager = Find-SdkTool -ToolName 'sdkmanager'
  $avdManager = Find-SdkTool -ToolName 'avdmanager'
  if (-not $sdkManager -or -not $avdManager) {
    Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_COMMANDLINE_TOOLS_NOT_INSTALLED' -Extra @{
      sdkManager = [string]$sdkManager
      avdManager = [string]$avdManager
      searchedSdkRoots = @(Get-SdkRoots)
    }
    throw 'BLOCKED_ANDROID_COMMANDLINE_TOOLS_NOT_INSTALLED'
  }

  $javaHome = Set-JavaEnvironment
  New-Item -ItemType Directory -Path $UserSdkRoot -Force | Out-Null
  Write-Host "ANDROID_PROVISION_SDK_ROOT=$UserSdkRoot"
  Write-Host "ANDROID_SDKMANAGER=$sdkManager"
  Write-Host "ANDROID_AVDMANAGER=$avdManager"

  $yes = @(1..80 | ForEach-Object { 'y' })
  $license = Invoke-Native -Exe $sdkManager -NativeArgs @("--sdk_root=$UserSdkRoot",'--licenses') -StdinLines $yes
  Write-Host ($license.Output -join "`n")
  if ($license.ExitCode -ne 0) {
    Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_SDK_LICENSE_ACCEPTANCE_FAILED' -Extra @{ exitCode=$license.ExitCode; sdkManager=$sdkManager; javaHome=$javaHome; output=@($license.Output | Select-Object -Last 80) }
    throw 'BLOCKED_ANDROID_SDK_LICENSE_ACCEPTANCE_FAILED'
  }

  $packages = @('platform-tools','emulator',$ProvisionImage)
  $install = Invoke-Native -Exe $sdkManager -NativeArgs (@("--sdk_root=$UserSdkRoot") + $packages) -StdinLines $yes
  Write-Host ($install.Output -join "`n")
  if ($install.ExitCode -ne 0) {
    Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_EMULATOR_PACKAGE_INSTALL_FAILED' -Extra @{
      exitCode=$install.ExitCode
      sdkRoot=$UserSdkRoot
      javaHome=$javaHome
      packages=$packages
      output=@($install.Output | Select-Object -Last 80)
    }
    throw 'BLOCKED_ANDROID_EMULATOR_PACKAGE_INSTALL_FAILED'
  }

  $env:ANDROID_SDK_ROOT = $UserSdkRoot
  $env:ANDROID_HOME = $UserSdkRoot
  $platformTools = Join-Path $UserSdkRoot 'platform-tools'
  if (Test-Path $platformTools) { $env:Path = "$platformTools;$env:Path" }

  $emulator = Join-Path $UserSdkRoot 'emulator\emulator.exe'
  if (-not (Test-Path $emulator)) {
    Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_EMULATOR_INSTALL_MISSING_BINARY' -Extra @{ sdkRoot=$UserSdkRoot; javaHome=$javaHome }
    throw 'BLOCKED_ANDROID_EMULATOR_INSTALL_MISSING_BINARY'
  }

  $avdRoot = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.android\avd'
  $env:ANDROID_AVD_HOME = $avdRoot
  New-Item -ItemType Directory -Path $avdRoot -Force | Out-Null

  $existingList = Invoke-Native -Exe $emulator -NativeArgs @('-list-avds')
  $existingAvds = @($existingList.Output | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ($existingAvds -notcontains $ProvisionAvdName) {
    $create = Invoke-Native -Exe $avdManager -NativeArgs @('create','avd','--name',$ProvisionAvdName,'--package',$ProvisionImage,'--device','pixel','--force') -StdinLines @('no')
    Write-Host ($create.Output -join "`n")
    if ($create.ExitCode -ne 0) {
      Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_PLAY_STORE_AVD_CREATE_FAILED' -Extra @{
        exitCode=$create.ExitCode
        sdkRoot=$UserSdkRoot
        javaHome=$javaHome
        systemImage=$ProvisionImage
        output=@($create.Output | Select-Object -Last 80)
      }
      throw 'BLOCKED_ANDROID_PLAY_STORE_AVD_CREATE_FAILED'
    }
  }

  if (-not (Test-AvdPlayStoreFlag -AvdName $ProvisionAvdName)) {
    Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_CREATED_AVD_HAS_NO_PLAY_STORE_FLAG' -Extra @{ avd=$ProvisionAvdName; systemImage=$ProvisionImage; javaHome=$javaHome }
    throw 'BLOCKED_CREATED_AVD_HAS_NO_PLAY_STORE_FLAG'
  }

  Write-Host "ANDROID_PLAY_STORE_AVD_PROVISIONED=$ProvisionAvdName"
  return $emulator
}

$existing = @(Get-OnlineDevices)
if ($existing.Count -gt 0) {
  Write-Host "ANDROID_DEVICE_ALREADY_ONLINE=$($existing -join ',')"
  Write-ProvisionEvidence -Status 'PASS' -Reason 'DEVICE_ALREADY_ONLINE' -Extra @{ devices=$existing }
  exit 0
}

$emulator = Find-EmulatorExe
if (-not $emulator) {
  Write-Host 'ANDROID_EMULATOR_NOT_FOUND=PROVISIONING_USER_SDK'
  $emulator = Ensure-PlayStoreAvd
}
Write-Host "ANDROID_EMULATOR_EXE=$emulator"

$list = Invoke-Native -Exe $emulator -NativeArgs @('-list-avds')
if ($list.ExitCode -ne 0) {
  Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_AVD_LIST_FAILED' -Extra @{ emulator=$emulator; exitCode=$list.ExitCode }
  throw 'BLOCKED_ANDROID_AVD_LIST_FAILED'
}
$avds = @($list.Output | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($avds.Count -eq 0) {
  Write-Host 'ANDROID_AVD_NOT_CONFIGURED=PROVISIONING_PLAY_STORE_AVD'
  $emulator = Ensure-PlayStoreAvd
  $list = Invoke-Native -Exe $emulator -NativeArgs @('-list-avds')
  $avds = @($list.Output | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}
if ($avds.Count -eq 0) {
  Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_AVD_NOT_CONFIGURED' -Extra @{ emulator=$emulator }
  throw 'BLOCKED_ANDROID_AVD_NOT_CONFIGURED'
}

$playStoreAvds = @($avds | Where-Object { Test-AvdPlayStoreFlag -AvdName $_ })
if ($playStoreAvds.Count -eq 0) {
  Write-Host 'ANDROID_PLAY_STORE_AVD_NOT_FOUND=PROVISIONING_PLAY_STORE_AVD'
  $emulator = Ensure-PlayStoreAvd
  $list = Invoke-Native -Exe $emulator -NativeArgs @('-list-avds')
  $avds = @($list.Output | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  $playStoreAvds = @($avds | Where-Object { Test-AvdPlayStoreFlag -AvdName $_ })
}
if ($playStoreAvds.Count -eq 0) {
  Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_AVD_WITHOUT_PLAY_STORE' -Extra @{ emulator=$emulator; availableAvds=$avds }
  throw 'BLOCKED_ANDROID_AVD_WITHOUT_PLAY_STORE'
}

$selected = $playStoreAvds[0]
Write-Host "ANDROID_AVDS=$($avds -join ',')"
Write-Host "ANDROID_PLAY_STORE_AVDS=$($playStoreAvds -join ',')"
Write-Host "ANDROID_SELECTED_AVD=$selected"

$emulatorArgs = @('-avd',$selected,'-no-window','-no-audio','-no-boot-anim','-no-snapshot-save','-gpu','swiftshader_indirect')
$proc = Start-Process -FilePath $emulator -ArgumentList $emulatorArgs -PassThru
Write-Host "ANDROID_EMULATOR_PID=$($proc.Id)"

$deadline = (Get-Date).AddMinutes(5)
$serial = $null
do {
  Start-Sleep -Seconds 5
  $online = @(Get-OnlineDevices)
  if ($online.Count -gt 0) {
    $serial = $online[0]
    break
  }
  if ($proc.HasExited) {
    Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_AVD_EXITED_DURING_BOOT' -Extra @{ avd=$selected; emulatorPid=$proc.Id; exitCode=$proc.ExitCode }
    throw 'BLOCKED_ANDROID_AVD_EXITED_DURING_BOOT'
  }
} while ((Get-Date) -lt $deadline)

if (-not $serial) {
  Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_AVD_BOOT_TIMEOUT' -Extra @{ avd=$selected; emulatorPid=$proc.Id }
  throw 'BLOCKED_ANDROID_AVD_BOOT_TIMEOUT'
}

$bootDeadline = (Get-Date).AddMinutes(4)
$booted = $false
do {
  $boot = Invoke-Native -Exe 'adb' -NativeArgs @('-s',$serial,'shell','getprop','sys.boot_completed')
  if ($boot.ExitCode -eq 0 -and (($boot.Output -join '').Trim() -eq '1')) {
    $booted = $true
    break
  }
  Start-Sleep -Seconds 5
} while ((Get-Date) -lt $bootDeadline)

if (-not $booted) {
  Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_AVD_SYSTEM_BOOT_TIMEOUT' -Extra @{ avd=$selected; serial=$serial; emulatorPid=$proc.Id }
  throw 'BLOCKED_ANDROID_AVD_SYSTEM_BOOT_TIMEOUT'
}

$store = Invoke-Native -Exe 'adb' -NativeArgs @('-s',$serial,'shell','pm','path','com.android.vending')
$hasPlayStore = ($store.ExitCode -eq 0 -and (($store.Output -join "`n") -match '^package:'))
if (-not $hasPlayStore) {
  Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_AVD_WITHOUT_PLAY_STORE' -Extra @{ avd=$selected; serial=$serial; emulatorPid=$proc.Id; availableAvds=$avds }
  throw 'BLOCKED_ANDROID_AVD_WITHOUT_PLAY_STORE'
}

Write-Host "ANDROID_EMULATOR_DEVICE_ONLINE=$serial"
Write-Host 'ANDROID_EMULATOR_PLAY_STORE_PRESENT=YES'
Write-ProvisionEvidence -Status 'PASS' -Reason 'PLAY_STORE_AVD_READY' -Extra @{
  avd=$selected
  serial=$serial
  emulatorPid=$proc.Id
  availableAvds=$avds
  provisionedSdkRoot=$UserSdkRoot
  systemImage=$ProvisionImage
  javaHome=$env:JAVA_HOME
}
