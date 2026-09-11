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
  [pscustomobject]@{
    ExitCode = [int]$code
    Output = @($out | ForEach-Object { [string]$_ })
  }
}

function Add-IfDirectory {
  param([System.Collections.Generic.List[string]]$List, [string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return }
  try {
    if ([System.IO.Directory]::Exists($Path)) { $List.Add($Path) }
  } catch {}
}

function Get-SdkRoots {
  $roots = New-Object System.Collections.Generic.List[string]
  Add-IfDirectory $roots $env:ANDROID_SDK_ROOT
  Add-IfDirectory $roots $env:ANDROID_HOME
  Add-IfDirectory $roots (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk')

  $unityRoot = Join-Path $env:ProgramFiles 'Unity\Hub\Editor'
  try {
    if ([System.IO.Directory]::Exists($unityRoot)) {
      Get-ChildItem $unityRoot -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object {
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
    try {
      if ([System.IO.File]::Exists($candidate)) { return $candidate }
    } catch {}
  }
  return $null
}

function Find-AvdManager {
  param([string[]]$Roots)
  foreach ($root in $Roots) {
    $candidates = New-Object System.Collections.Generic.List[string]
    $candidates.Add((Join-Path $root 'cmdline-tools\latest\bin\avdmanager.bat'))
    $candidates.Add((Join-Path $root 'tools\bin\avdmanager.bat'))
    $cmdRoot = Join-Path $root 'cmdline-tools'
    try {
      if ([System.IO.Directory]::Exists($cmdRoot)) {
        Get-ChildItem $cmdRoot -Directory -ErrorAction SilentlyContinue |
          Sort-Object Name -Descending |
          ForEach-Object { $candidates.Add((Join-Path $_.FullName 'bin\avdmanager.bat')) }
      }
    } catch {}
    foreach ($candidate in $candidates) {
      try {
        if ([System.IO.File]::Exists($candidate)) { return $candidate }
      } catch {}
    }
  }
  return $null
}

function Find-PlayStoreSystemImage {
  param([string[]]$Roots)
  $best = $null
  foreach ($root in $Roots) {
    $base = Join-Path $root 'system-images'
    try {
      if (-not [System.IO.Directory]::Exists($base)) { continue }
      $hits = @(Get-ChildItem $base -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -eq 'x86_64' -and
        $_.Parent -and $_.Parent.Name -eq 'google_apis_playstore' -and
        $_.Parent.Parent -and $_.Parent.Parent.Name -match '^android-\d+$'
      })
      foreach ($hit in $hits) {
        $api = [int]($hit.Parent.Parent.Name -replace '^android-', '')
        if ($null -eq $best -or $api -gt $best.Api) {
          $best = [pscustomobject]@{
            Root = $root
            Api = $api
            Package = "system-images;android-$api;google_apis_playstore;x86_64"
          }
        }
      }
    } catch {}
  }
  return $best
}

function Get-PlayStoreDevice {
  param([string]$Adb)
  $devices = Invoke-Native $Adb @('devices')
  if ($devices.ExitCode -ne 0) { return $null }
  foreach ($line in $devices.Output) {
    if ($line -match '^([^\s]+)\s+device$') {
      $serial = $Matches[1]
      $store = Invoke-Native $Adb @('-s', $serial, 'shell', 'pm', 'path', 'com.android.vending')
      if ($store.ExitCode -eq 0 -and (($store.Output -join "`n") -match '^package:')) {
        return $serial
      }
    }
  }
  return $null
}

function Wait-ForBoot {
  param([string]$Adb, [int]$Minutes = 8)
  $deadline = (Get-Date).AddMinutes($Minutes)
  do {
    Start-Sleep -Seconds 5
    $serial = Get-PlayStoreDevice -Adb $Adb
    if ($serial) {
      $boot = Invoke-Native $Adb @('-s', $serial, 'shell', 'getprop', 'sys.boot_completed')
      if (($boot.Output -join '').Trim() -eq '1') { return $serial }
    }
  } while ((Get-Date) -lt $deadline)
  return $null
}

function Test-PackageInstalled {
  param([string]$Adb, [string]$Serial, [string]$PackageId)
  $r = Invoke-Native $Adb @('-s', $Serial, 'shell', 'pm', 'path', $PackageId)
  return ($r.ExitCode -eq 0 -and (($r.Output -join "`n") -match '^package:'))
}

$repoRoot = Split-Path $PSScriptRoot -Parent
$manifestPath = Join-Path $repoRoot 'company-learning\external-game-playtest\mobile-free-seed-games.json'
if (-not (Test-Path $manifestPath)) { throw "MANIFEST_NOT_FOUND:$manifestPath" }

$manifest = [System.IO.File]::ReadAllText($manifestPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
if ($manifest.installPolicy -ne 'OFFICIAL_GOOGLE_PLAY_ONLY' -or $manifest.codeExtractionAllowed -ne $false -or $manifest.binaryRedistributionAllowed -ne $false) {
  throw 'UNSAFE_EXTERNAL_GAME_REFERENCE_POLICY'
}

$game = @($manifest.games | Where-Object { $_.id -eq $GameId }) | Select-Object -First 1
if (-not $game) {
  $ids = @($manifest.games | ForEach-Object { $_.id }) -join ', '
  throw "UNKNOWN_GAME_ID:$GameId; available=$ids"
}

$packageId = [string](@($game.packageIds)[0])
if ([string]::IsNullOrWhiteSpace($packageId)) { throw 'PACKAGE_ID_MISSING' }

$roots = @(Get-SdkRoots)
if (-not $roots.Count) { throw 'ANDROID_SDK_NOT_FOUND; install Android Studio or Unity Android Build Support first' }

$adb = Find-Tool -Roots $roots -Relative 'platform-tools\adb.exe'
if (-not $adb) { throw 'ADB_NOT_FOUND_IN_ANDROID_SDK' }
$emulator = Find-Tool -Roots $roots -Relative 'emulator\emulator.exe'
$avdManager = Find-AvdManager -Roots $roots

$platformTools = Split-Path $adb -Parent
$env:Path = "$platformTools;$env:Path"
& $adb start-server | Out-Null

Write-Host "GAME_ID=$GameId"
Write-Host "GAME_TITLE=$($game.title)"
Write-Host "PACKAGE_ID=$packageId"
Write-Host "ADB=$adb"

$serial = Get-PlayStoreDevice -Adb $adb
if (-not $serial) {
  if (-not $emulator) { throw 'PLAY_STORE_DEVICE_NOT_CONNECTED_AND_EMULATOR_NOT_FOUND' }

  $avdHome = if ($env:ANDROID_AVD_HOME) { $env:ANDROID_AVD_HOME } else { Join-Path $env:USERPROFILE '.android\avd' }
  $list = Invoke-Native $emulator @('-list-avds')
  $playAvd = $null
  foreach ($name in $list.Output) {
    $name = $name.Trim()
    if (-not $name) { continue }
    $config = Join-Path $avdHome "$name.avd\config.ini"
    if (Test-Path $config) {
      $raw = [System.IO.File]::ReadAllText($config)
      if ($raw -match '(?im)^PlayStore\.enabled\s*=\s*yes\s*$') {
        $playAvd = $name
        break
      }
    }
  }

  if (-not $playAvd) {
    if (-not $avdManager) { throw 'NO_PLAY_STORE_AVD_AND_AVDMANAGER_NOT_FOUND' }
    $image = Find-PlayStoreSystemImage -Roots $roots
    if ($null -eq $image) {
      throw 'NO_INSTALLED_PLAY_STORE_SYSTEM_IMAGE; install one Android x86_64 Google Play system image in Android Studio SDK Manager, then rerun this script'
    }
    $env:ANDROID_SDK_ROOT = $image.Root
    $env:ANDROID_HOME = $image.Root
    $playAvd = 'Vibe2PlayStore'
    $create = Invoke-Native $avdManager @('create', 'avd', '--name', $playAvd, '--package', $image.Package, '--device', 'pixel_6', '--force')
    if ($create.ExitCode -ne 0) {
      $create = Invoke-Native $avdManager @('create', 'avd', '--name', $playAvd, '--package', $image.Package, '--device', 'pixel', '--force')
    }
    if ($create.ExitCode -ne 0) {
      throw "AVD_CREATE_FAILED:$($create.Output -join ' ')"
    }
    Write-Host "CREATED_PLAY_STORE_AVD=$playAvd"
  }

  Write-Host "STARTING_PLAY_STORE_AVD=$playAvd"
  $proc = Start-Process $emulator -ArgumentList @('-avd', $playAvd, '-no-audio', '-no-boot-anim', '-gpu', 'swiftshader_indirect') -PassThru
  $serial = Wait-ForBoot -Adb $adb -Minutes 8
  if (-not $serial) {
    if (-not $proc.HasExited) { try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {} }
    throw 'PLAY_STORE_AVD_BOOT_TIMEOUT'
  }
}

$androidVersion = ((Invoke-Native $adb @('-s', $serial, 'shell', 'getprop', 'ro.build.version.release')).Output -join '').Trim()
$apiLevel = ((Invoke-Native $adb @('-s', $serial, 'shell', 'getprop', 'ro.build.version.sdk')).Output -join '').Trim()
$abi = ((Invoke-Native $adb @('-s', $serial, 'shell', 'getprop', 'ro.product.cpu.abi')).Output -join '').Trim()

Write-Host "ANDROID_SERIAL=$serial"
Write-Host "ANDROID_VERSION=$androidVersion"
Write-Host "ANDROID_API=$apiLevel"
Write-Host "ANDROID_ABI=$abi"

if (-not (Test-PackageInstalled -Adb $adb -Serial $serial -PackageId $packageId)) {
  Write-Host 'Opening the official Google Play page.'
  Write-Host 'If Play Store asks you to sign in, sign in directly inside the emulator. Do not paste credentials into this script.'
  Invoke-Native $adb @('-s', $serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', "market://details?id=$packageId", '-p', 'com.android.vending') | Out-Null

  $deadline = (Get-Date).AddMinutes($InstallWaitMinutes)
  do {
    if (Test-PackageInstalled -Adb $adb -Serial $serial -PackageId $packageId) { break }
    Start-Sleep -Seconds 5
  } while ((Get-Date) -lt $deadline)
}

$installed = Test-PackageInstalled -Adb $adb -Serial $serial -PackageId $packageId
if (-not $installed) {
  throw "INSTALL_NOT_DETECTED_WITHIN_${InstallWaitMinutes}_MINUTES; complete Play Store sign-in/install and rerun"
}

$launch = Invoke-Native $adb @('-s', $serial, 'shell', 'monkey', '-p', $packageId, '-c', 'android.intent.category.LAUNCHER', '1')
Start-Sleep -Seconds 8
$pid = ((Invoke-Native $adb @('-s', $serial, 'shell', 'pidof', $packageId)).Output -join '').Trim()
$focus = ((Invoke-Native $adb @('-s', $serial, 'shell', 'dumpsys', 'window')).Output -join "`n")
$foreground = $focus -match [regex]::Escape($packageId)
$launchPass = ($launch.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($pid))

$outPath = Join-Path $env:TEMP 'vibe2-playstore-bootstrap.json'
$result = [ordered]@{
  version = 1
  gameId = $GameId
  gameTitle = [string]$game.title
  packageId = $packageId
  installPolicy = 'OFFICIAL_GOOGLE_PLAY_ONLY'
  codeExtractionAllowed = $false
  binaryRedistributionAllowed = $false
  runtimePromotionAllowed = $false
  serial = $serial
  androidVersion = $androidVersion
  apiLevel = $apiLevel
  abi = $abi
  installed = $installed
  launchPass = $launchPass
  foregroundPass = [bool]$foreground
  processId = $pid
  observedAt = (Get-Date).ToUniversalTime().ToString('o')
}
$result | ConvertTo-Json -Depth 8 | Set-Content $outPath -Encoding UTF8

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
