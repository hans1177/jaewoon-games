param(
  [string]$OutDir = "$env:RUNNER_TEMP\external-mobile-game-playtest"
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-ProvisionEvidence {
  param([string]$Status, [string]$Reason, [hashtable]$Extra = @{})
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
  $payload = [ordered]@{
    version = 1
    status = $Status
    reason = $Reason
    authority = 'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE'
    observedAt = (Get-Date).ToUniversalTime().ToString('o')
  }
  foreach ($key in $Extra.Keys) { $payload[$key] = $Extra[$key] }
  $payload | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $OutDir 'device-provision.json') -Encoding UTF8
}

function Invoke-Native {
  param([string]$Exe, [string[]]$NativeArgs)
  $previous = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & $Exe @NativeArgs 2>&1
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

function Find-EmulatorExe {
  $candidates = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_SDK_ROOT)) {
    $candidates.Add((Join-Path $env:ANDROID_SDK_ROOT 'emulator\emulator.exe'))
  }
  if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) {
    $candidates.Add((Join-Path $env:ANDROID_HOME 'emulator\emulator.exe'))
  }
  $localSdk = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk\emulator\emulator.exe'
  $candidates.Add($localSdk)
  return ($candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1)
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

$existing = @(Get-OnlineDevices)
if ($existing.Count -gt 0) {
  Write-Host "ANDROID_DEVICE_ALREADY_ONLINE=$($existing -join ',')"
  Write-ProvisionEvidence -Status 'PASS' -Reason 'DEVICE_ALREADY_ONLINE' -Extra @{ devices=$existing }
  exit 0
}

$emulator = Find-EmulatorExe
if (-not $emulator) {
  Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_EMULATOR_NOT_INSTALLED'
  throw 'BLOCKED_ANDROID_EMULATOR_NOT_INSTALLED'
}
Write-Host "ANDROID_EMULATOR_EXE=$emulator"

$list = Invoke-Native -Exe $emulator -NativeArgs @('-list-avds')
if ($list.ExitCode -ne 0) {
  Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_AVD_LIST_FAILED' -Extra @{ emulator=$emulator; exitCode=$list.ExitCode }
  throw 'BLOCKED_ANDROID_AVD_LIST_FAILED'
}
$avds = @($list.Output | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($avds.Count -eq 0) {
  Write-ProvisionEvidence -Status 'BLOCKED' -Reason 'BLOCKED_ANDROID_AVD_NOT_CONFIGURED' -Extra @{ emulator=$emulator }
  throw 'BLOCKED_ANDROID_AVD_NOT_CONFIGURED'
}

$playStoreAvds = @($avds | Where-Object { Test-AvdPlayStoreFlag -AvdName $_ })
$selected = if ($playStoreAvds.Count -gt 0) { $playStoreAvds[0] } else { $avds[0] }
Write-Host "ANDROID_AVDS=$($avds -join ',')"
Write-Host "ANDROID_PLAY_STORE_AVDS=$($playStoreAvds -join ',')"
Write-Host "ANDROID_SELECTED_AVD=$selected"

$emulatorArgs = @('-avd',$selected,'-no-window','-no-audio','-no-boot-anim','-no-snapshot-save','-gpu','swiftshader_indirect')
$proc = Start-Process -FilePath $emulator -ArgumentList $emulatorArgs -PassThru
Write-Host "ANDROID_EMULATOR_PID=$($proc.Id)"

$deadline = (Get-Date).AddMinutes(4)
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

$bootDeadline = (Get-Date).AddMinutes(3)
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
Write-ProvisionEvidence -Status 'PASS' -Reason 'EXISTING_PLAY_STORE_AVD_STARTED' -Extra @{ avd=$selected; serial=$serial; emulatorPid=$proc.Id; availableAvds=$avds }
