# GitHub-hosted Windows ONLY: attempt the official signed Roblox Studio installer,
# start the documented Studio executable, then probe the built-in stdio MCP.
# No credential injection, Studio settings edits, GUI macros, Player bots or undocumented CLI flags.
param(
  [Parameter(Mandatory=$true)][string]$OutputPath
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$studioInstalled=$false
$studioRunning=$false
$installerVerified=$false
$signatureRejected=$false
$stage='NOT_STARTED'
$local=$env:LOCALAPPDATA
$installerUrl='https://setup.rbxcdn.com/RobloxStudioInstaller.exe'

function Find-OfficialStudio {
  # Official Roblox instructions also check Program Files (x86). Windows Actions
  # sometimes installs outside LOCALAPPDATA, while the process appears later.
  $patterns=@()
  if ($local) { $patterns+=(Join-Path $local 'Roblox\Versions\*\RobloxStudioBeta.exe') }
  $programX86=[Environment]::GetFolderPath('ProgramFilesX86')
  if ($programX86) { $patterns+=(Join-Path $programX86 'Roblox\Versions\*\RobloxStudioBeta.exe') }
  foreach ($pattern in $patterns) {
    $candidate=Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($candidate) { return $candidate }
  }
  # The signed executable path of an actually running Studio is authoritative.
  $process=Get-Process -Name 'RobloxStudioBeta' -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($process) {
    try {
      if ($process.Path -and (Test-Path -LiteralPath $process.Path)) {
        return Get-Item -LiteralPath $process.Path
      }
    } catch {}
  }
  return $null
}
function Test-RobloxSignature([string]$file) {
  if (-not $file -or -not (Test-Path -LiteralPath $file)) { return $false }
  $sig=Get-AuthenticodeSignature -FilePath $file
  return ($sig.Status -eq 'Valid' -and
    $null -ne $sig.SignerCertificate -and
    $sig.SignerCertificate.Subject -like '*O=Roblox Corporation*')
}
function Get-StudioProcess {
  @(Get-Process -Name 'RobloxStudioBeta' -ErrorAction SilentlyContinue) |
    Select-Object -First 1
}

try {
  if ($env:RUNNER_OS -ne 'Windows' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
    throw 'HOSTED_WINDOWS_ONLY'
  }
  if (-not $local) { throw 'LOCALAPPDATA_UNAVAILABLE' }
  $stage='CHECK_EXISTING_INSTALLATION'
  $studio=Find-OfficialStudio
  if ($studio) {
    if (-not (Test-RobloxSignature $studio.FullName)) {
      $signatureRejected=$true
      $stage='EXISTING_STUDIO_BINARY_UNTRUSTED'
      $studio=$null
    } else {
      $installerVerified=$true
      $stage='OFFICIAL_STUDIO_PREINSTALLED_SIGNED'
    }
  }
  if (-not $studio -and -not $signatureRejected) {
    $stage='OFFICIAL_INSTALLER_DOWNLOAD'
    $installer=Join-Path $env:RUNNER_TEMP 'RobloxStudioInstaller.exe'
    try {
      Invoke-WebRequest -Uri $installerUrl -OutFile $installer -UseBasicParsing -TimeoutSec 75
      if (-not (Test-RobloxSignature $installer)) {
        $signatureRejected=$true
        $stage='OFFICIAL_INSTALLER_SIGNATURE_REJECTED'
        Remove-Item $installer -Force -ErrorAction SilentlyContinue
      } else {
        $installerVerified=$true
        $stage='SIGNED_OFFICIAL_INSTALLER_STARTED'
        # Roblox documents starting the signed .exe (not an undocumented Studio CLI).
        # Do not -Wait: the installer can launch Studio and remain running.
        Start-Process -FilePath $installer
        $deadline=(Get-Date).AddMinutes(4)
        do {
          Start-Sleep -Seconds 5
          $studio=Find-OfficialStudio
        } until ($studio -or (Get-Date) -ge $deadline)
        $stage=if ($studio) { 'STUDIO_INSTALLED_OFFICIAL_SIGNED' }
          else { 'INSTALLER_NOT_FINISHED_IN_HEADLESS_RUNNER' }
      }
    } catch {
      $stage='OFFICIAL_INSTALLER_DOWNLOAD_OR_LAUNCH_FAILED'
      Write-Host 'ROBLOX_HOSTED_STUDIO_INSTALL_ERROR=INSTALLER_UNAVAILABLE_OR_HEADLESS'
    }
  }

  if ($studio -and -not $signatureRejected) {
    if (-not (Test-RobloxSignature $studio.FullName)) {
      $signatureRejected=$true
      $stage='NEW_STUDIO_BINARY_SIGNATURE_REJECTED'
    } else {
      $installerVerified=$true
    }
  }
  if ($studio -and -not $signatureRejected) {
    $studioInstalled=$true
    $studioRunning=($null -ne (Get-StudioProcess))
    if (-not $studioRunning) {
      try {
        # Roblox's documented Windows open command; never use hidden CLI flags.
        Start-Process -FilePath $studio.FullName
        $stage='OFFICIAL_STUDIO_LAUNCH_REQUESTED'
        for($i=0;$i -lt 6;$i++) {
          Start-Sleep -Seconds 5
          if (Get-StudioProcess) { $studioRunning=$true; break }
        }
      } catch {
        $stage='STUDIO_LAUNCH_BLOCKED_BY_NONINTERACTIVE_SESSION'
      }
    }
    if ($studioRunning) {
      $stage='STUDIO_PROCESS_STARTED_MCP_LOGIN_AND_PLACE_UNVERIFIED'
    } elseif ($stage -ne 'STUDIO_LAUNCH_BLOCKED_BY_NONINTERACTIVE_SESSION') {
      $stage='STUDIO_PROCESS_NOT_ACTIVE'
    }
  }
} catch {
  if ($stage -eq 'NOT_STARTED' -or $stage -eq 'CHECK_EXISTING_INSTALLATION') {
    $stage='HOSTED_RUNNER_OR_WINDOWS_PREREQUISITE_UNAVAILABLE'
  }
  Write-Host 'ROBLOX_HOSTED_STUDIO_INSTALL_OR_LAUNCH=BLOCKED'
}

# Do not pass account paths, cookies, Roblox security tokens or Studio settings
# to the workflow artifact. The Node probe uses a known-local official batch only.
$command=if ($local) { Join-Path $local 'Roblox\mcp.bat' } else { '' }
$argv=@(
  'tools/company-roblox-hosted-studio-mcp-connection.mjs',
  "--studio-installed=$($studioInstalled.ToString().ToLowerInvariant())",
  "--studio-running=$($studioRunning.ToString().ToLowerInvariant())",
  "--installer-verified=$($installerVerified.ToString().ToLowerInvariant())",
  "--installer-rejected=$($signatureRejected.ToString().ToLowerInvariant())",
  "--installer-stage=$stage",
  "--mcp-command=$command",
  "--output=$OutputPath"
)
& node @argv
if ($LASTEXITCODE -ne 0) { throw 'OFFICIAL_STUDIO_MCP_PROBE_FAILED' }
if (-not (Test-Path -LiteralPath $OutputPath)) { throw 'OFFICIAL_STUDIO_MCP_REPORT_MISSING' }
$report=Get-Content -LiteralPath $OutputPath -Raw | ConvertFrom-Json
Write-Host "ROBLOX_HOSTED_WINDOWS_CONNECTION_RESULT=$($report.status)"
Write-Host 'ROBLOX_HOSTED_WINDOWS_RUNNER=EPHEMERAL_NO_CREDENTIALS_PERSISTED'
Write-Host 'ROBLOX_HOSTED_WINDOWS_ACTUAL_PLAY=NOT_EXECUTED'
