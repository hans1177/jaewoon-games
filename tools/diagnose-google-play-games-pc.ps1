param(
  [string]$OutDir = "$env:RUNNER_TEMP\google-play-games-pc-diagnostic"
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

function Test-FileSafe([string]$Path) {
  try { return [System.IO.File]::Exists($Path) } catch { return $false }
}

function Test-DirSafe([string]$Path) {
  try { return [System.IO.Directory]::Exists($Path) } catch { return $false }
}

function Test-RegistryPathSafe([string]$Path) {
  try { return [bool](Test-Path -LiteralPath $Path -ErrorAction SilentlyContinue) } catch { return $false }
}

$paths = @(
  "$env:ProgramFiles\Google\Play Games",
  "${env:ProgramFiles(x86)}\Google\Play Games",
  "$env:LOCALAPPDATA\Google\Play Games",
  "$env:ProgramFiles\Google\Play Games Developer Emulator"
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

$foundPaths = @()
foreach ($p in $paths) {
  if (Test-DirSafe $p) { $foundPaths += $p }
}

$exeCandidates = @()
foreach ($root in $foundPaths) {
  try {
    $exeCandidates += @(Get-ChildItem $root -Filter '*.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
  } catch {}
}
$exeCandidates = @($exeCandidates | Sort-Object -Unique)

# Google documents this HKLM key as the SDK-independent installation signal for
# Google Play Games on PC. Keep generic uninstall/path probes only as secondary diagnostics.
$officialServicesKey = 'HKLM:\SOFTWARE\Google\Play Games Services'
$officialServicesKeyPresent = Test-RegistryPathSafe $officialServicesKey
$uriSchemeRegistered = Test-RegistryPathSafe 'Registry::HKEY_CLASSES_ROOT\googleplaygames\shell\open\command'

$registryNames = @()
$uninstallRoots = @(
  'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
foreach ($r in $uninstallRoots) {
  try {
    $registryNames += @(Get-ItemProperty $r -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName -match 'Google Play Games' } |
      Select-Object -ExpandProperty DisplayName)
  } catch {}
}
$registryNames = @($registryNames | Sort-Object -Unique)

$interactiveExplorer = $false
try { $interactiveExplorer = @((Get-Process explorer -ErrorAction SilentlyContinue)).Count -gt 0 } catch {}

$runnerIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$runnerIsServiceAccount = $runnerIdentity -match '(?i)NETWORK SERVICE|LOCAL SERVICE|SYSTEM'
$sessionId = [System.Diagnostics.Process]::GetCurrentProcess().SessionId

$virtualizationFirmwareEnabled = $null
$hypervisorPresent = $null
try {
  $cpu = Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object -First 1
  if ($null -ne $cpu.VirtualizationFirmwareEnabled) { $virtualizationFirmwareEnabled = [bool]$cpu.VirtualizationFirmwareEnabled }
} catch {}
try {
  $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
  if ($null -ne $cs.HypervisorPresent) { $hypervisorPresent = [bool]$cs.HypervisorPresent }
} catch {}

$adbDevice6520 = $false
try {
  $adb = Get-Command adb.exe -ErrorAction SilentlyContinue
  if ($adb) {
    $old = $ErrorActionPreference
    try {
      $ErrorActionPreference = 'Continue'
      $rows = & $adb.Source devices 2>&1
    } finally { $ErrorActionPreference = $old }
    $adbDevice6520 = (($rows -join "`n") -match '(?m)^localhost:6520\s+device$')
  }
} catch {}

$consumerInstalled = $officialServicesKeyPresent -or (($foundPaths | Where-Object { $_ -match '(?i)Google\\Play Games$' }).Count -gt 0) -or $registryNames.Count -gt 0
$developerEmulatorInstalled = ($foundPaths | Where-Object { $_ -match '(?i)Developer Emulator' }).Count -gt 0

$playableFromRunner = $consumerInstalled -and $uriSchemeRegistered -and -not $runnerIsServiceAccount -and $interactiveExplorer
$status = if ($playableFromRunner) {
  'READY_FOR_INTERACTIVE_GPG_PC_PROBE'
} elseif ($consumerInstalled -and $runnerIsServiceAccount) {
  'BLOCKED_GPG_PC_INSTALLED_BUT_RUNNER_IS_SERVICE_ACCOUNT'
} elseif ($consumerInstalled -and -not $interactiveExplorer) {
  'BLOCKED_GPG_PC_INSTALLED_BUT_NO_INTERACTIVE_DESKTOP'
} elseif ($consumerInstalled -and -not $uriSchemeRegistered) {
  'BLOCKED_GPG_PC_INSTALLED_BUT_LAUNCH_URI_NOT_REGISTERED'
} elseif ($developerEmulatorInstalled -or $adbDevice6520) {
  'READY_DEVELOPER_EMULATOR_PRESENT'
} else {
  'BLOCKED_GPG_PC_NOT_INSTALLED'
}

$payload = [ordered]@{
  version = 2
  authority = 'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE'
  observedAt = (Get-Date).ToUniversalTime().ToString('o')
  status = $status
  googlePlayGamesPcInstalled = [bool]$consumerInstalled
  officialServicesRegistryKeyPresent = [bool]$officialServicesKeyPresent
  googlePlayGamesLaunchUriRegistered = [bool]$uriSchemeRegistered
  supportedDirectLaunchUriTemplate = 'googleplaygames://launch/?pid=2&id={packageId}'
  firstProbePackageId = 'com.block.juggle'
  developerEmulatorInstalled = [bool]$developerEmulatorInstalled
  developerEmulatorAdbOnline = [bool]$adbDevice6520
  runnerIsServiceAccount = [bool]$runnerIsServiceAccount
  runnerSessionId = $sessionId
  interactiveDesktopPresent = [bool]$interactiveExplorer
  virtualizationFirmwareEnabled = $virtualizationFirmwareEnabled
  hypervisorPresent = $hypervisorPresent
  detectedInstallPathCount = $foundPaths.Count
  detectedExecutableCount = $exeCandidates.Count
  detectedRegistryEntryCount = $registryNames.Count
  credentialInspection = $false
  accountInspection = $false
  autoSignIn = $false
  autoTermsAcceptance = $false
  launchAttempted = $false
  runtimePromotionAllowed = $false
}
$payload | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $OutDir 'google-play-games-pc-diagnostic.json') -Encoding UTF8
$payload | ConvertTo-Json -Depth 8 | Write-Host

if ($status -match '^READY_') { exit 0 }
exit 2
