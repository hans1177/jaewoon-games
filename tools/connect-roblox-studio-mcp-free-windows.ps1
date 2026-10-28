# Official Roblox Studio MCP runner for a persistent interactive Windows cloud VM or equivalent trusted Windows desktop.
# No provisioned VM implied, no Roblox credentials, cookie export, or unattended sign-in.
# Run only on a trusted Windows machine for this repository.
[CmdletBinding()]
param(
  [string]$Repository = 'hans1177/jaewoon-games',
  [string]$RunnerRoot = "${env:SystemDrive}\actions-runner-roblox-studio",
  [switch]$CheckOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') { throw 'ROBLOX_FREE_STUDIO_WINDOWS_REQUIRED' }
if ($Repository -ne 'hans1177/jaewoon-games') { throw 'ROBLOX_FREE_STUDIO_REPOSITORY_NOT_ALLOWLISTED' }
$sessionId = [int](Get-Process -Id $PID).SessionId
if ($sessionId -le 0) { throw 'ROBLOX_FREE_STUDIO_INTERACTIVE_DESKTOP_REQUIRED: do not run as a Windows service' }
if (-not $env:LOCALAPPDATA) { throw 'ROBLOX_FREE_STUDIO_USER_PROFILE_REQUIRED' }

$studio = @(Get-Process -Name 'RobloxStudioBeta' -ErrorAction SilentlyContinue |
  Where-Object { [int]$_.SessionId -eq $sessionId } | Select-Object -First 1)
if ($studio.Count -ne 1) {
  throw 'ROBLOX_FREE_STUDIO_NOT_RUNNING: sign in to Roblox Studio and open the test Place in this Windows desktop'
}
$studioExe = $studio[0].Path
if (-not $studioExe -or -not (Test-Path -LiteralPath $studioExe)) {
  throw 'ROBLOX_FREE_STUDIO_EXECUTABLE_NOT_FOUND'
}
$studioSig = Get-AuthenticodeSignature -FilePath $studioExe
if ($studioSig.Status -ne 'Valid' -or
    $null -eq $studioSig.SignerCertificate -or
    $studioSig.SignerCertificate.Subject -notlike '*O=Roblox Corporation*') {
  throw 'ROBLOX_FREE_STUDIO_SIGNED_OFFICIAL_BINARY_REQUIRED'
}
$mcpBat = Join-Path $env:LOCALAPPDATA 'Roblox\mcp.bat'
$mcpExe = Join-Path (Split-Path $studioExe -Parent) 'StudioMCP.exe'
if (-not (Test-Path -LiteralPath $mcpBat) -and -not (Test-Path -LiteralPath $mcpExe)) {
  throw 'ROBLOX_FREE_STUDIO_OFFICIAL_MCP_LAUNCHER_MISSING: update Studio'
}
if (Test-Path -LiteralPath $mcpExe) {
  $mcpSig = Get-AuthenticodeSignature -FilePath $mcpExe
  if ($mcpSig.Status -ne 'Valid' -or
      $null -eq $mcpSig.SignerCertificate -or
      $mcpSig.SignerCertificate.Subject -notlike '*O=Roblox Corporation*') {
    throw 'ROBLOX_FREE_STUDIO_OFFICIAL_MCP_SIGNATURE_REQUIRED'
  }
}
Write-Host 'ROBLOX_FREE_STUDIO_OFFICIAL_INSTALL=VERIFIED'
Write-Host 'ROBLOX_FREE_STUDIO_INTERACTIVE_SESSION=VERIFIED'
Write-Host 'ROBLOX_FREE_STUDIO_MCP_LAUNCHER=FOUND'
Write-Host 'ROBLOX_FREE_STUDIO_ASSISTANT_ENABLEMENT=OPERATOR_MUST_VERIFY'
Write-Host 'In Studio: Assistant > ... > Manage MCP Servers > Enable Studio as MCP server.'
if ($CheckOnly) {
  Write-Host 'ROBLOX_FREE_STUDIO_PREFLIGHT=PASS_NO_RUNNER_CONNECTED'
  return
}

$runnerUrl = 'https://github.com/' + $Repository
$runnerConfig = Join-Path $RunnerRoot '.runner'
$runnerCmd = Join-Path $RunnerRoot 'run.cmd'
if (Test-Path -LiteralPath $runnerConfig) {
  $registered = Get-Content -LiteralPath $runnerConfig -Raw | ConvertFrom-Json
  if ([string]$registered.gitHubUrl -ne $runnerUrl) {
    throw 'ROBLOX_FREE_STUDIO_RUNNER_ALREADY_REGISTERED_TO_DIFFERENT_REPOSITORY'
  }
  Write-Host 'ROBLOX_FREE_STUDIO_EXISTING_RUNNER=REUSED'
} else {
  if (Test-Path -LiteralPath $RunnerRoot) {
    if (@(Get-ChildItem -LiteralPath $RunnerRoot -Force).Count -gt 0) {
      throw 'ROBLOX_FREE_STUDIO_RUNNER_DIRECTORY_NOT_EMPTY: inspect and clean manually'
    }
  }
  New-Item -ItemType Directory -Path $RunnerRoot -Force | Out-Null
  $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/actions/runner/releases/latest' -Headers @{
    Accept = 'application/vnd.github+json'
    'User-Agent' = 'roblox-studio-mcp-free-runner'
  } -TimeoutSec 45
  $assets = @($release.assets | Where-Object { $_.name -match '^actions-runner-win-x64-[0-9.]+\.zip$' })
  if ($assets.Count -ne 1) { throw 'ROBLOX_FREE_STUDIO_OFFICIAL_RUNNER_RELEASE_UNAVAILABLE' }
  $asset = $assets[0]
  $expected = [string]$asset.digest
  if ($expected -notmatch '^sha256:[a-fA-F0-9]{64}$') {
    throw 'ROBLOX_FREE_STUDIO_OFFICIAL_RUNNER_DIGEST_REQUIRED'
  }
  if ([string]$asset.browser_download_url -notlike 'https://github.com/actions/runner/releases/download/*') {
    throw 'ROBLOX_FREE_STUDIO_RUNNER_SOURCE_UNTRUSTED'
  }
  $zip = Join-Path $env:TEMP ([string]$asset.name)
  try {
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing -TimeoutSec 180
    $sha = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($sha -ne $expected.Substring(7).ToLowerInvariant()) {
      throw 'ROBLOX_FREE_STUDIO_RUNNER_SHA256_INVALID'
    }
    Expand-Archive -LiteralPath $zip -DestinationPath $RunnerRoot
  } finally {
    Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
  }
  Write-Host 'ROBLOX_FREE_STUDIO_GITHUB_RUNNER_PACKAGE=SHA256_VERIFIED'
  $config = Join-Path $RunnerRoot 'config.cmd'
  if (-not (Test-Path -LiteralPath $config)) { throw 'ROBLOX_FREE_STUDIO_CONFIG_MISSING' }
  Write-Host ('Open ' + $runnerUrl + '/settings/actions/runners and choose New self-hosted runner.')
  Write-Host 'Copy the ONE-TIME token and paste it into this authenticated Windows cloud VM session.'
  Write-Host 'Never paste a GitHub token or a Roblox password into ChatGPT, files, or repository logs.'
  $tokenSecure = Read-Host -Prompt 'GitHub Actions registration token (not your password)' -AsSecureString
  $tokenPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($tokenSecure)
  try {
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPtr)
    if ([string]::IsNullOrWhiteSpace($token)) { throw 'ROBLOX_FREE_STUDIO_REGISTRATION_TOKEN_REQUIRED' }
    Push-Location $RunnerRoot
    try {
      & $config --unattended --url $runnerUrl --token $token --labels 'roblox-studio-authenticated' --name ('roblox-studio-' + $env:COMPUTERNAME) --work '_work'
      if ($LASTEXITCODE -ne 0) { throw 'ROBLOX_FREE_STUDIO_RUNNER_REGISTRATION_FAILED' }
    } finally {
      Pop-Location
    }
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPtr)
    Remove-Variable token -ErrorAction SilentlyContinue
    Remove-Variable tokenSecure -ErrorAction SilentlyContinue
  }
}
if (-not (Test-Path -LiteralPath $runnerCmd)) { throw 'ROBLOX_FREE_STUDIO_RUN_CMD_MISSING' }
Write-Host 'ROBLOX_FREE_STUDIO_RUNNER_LABEL=roblox-studio-authenticated'
Write-Host 'ROBLOX_FREE_STUDIO_RUNNER_MODE=SIGNED_IN_INTERACTIVE_DESKTOP_ONLY'
Write-Host 'Keep Studio signed in, Assistant MCP enabled, and this PowerShell window open.'
Write-Host 'Queued official Studio MCP jobs will run here when this authenticated Windows session is online.'
Push-Location $RunnerRoot
try {
  & $runnerCmd
  if ($LASTEXITCODE -ne 0) { throw 'ROBLOX_FREE_STUDIO_RUNNER_STOPPED_WITH_ERROR' }
} finally {
  Pop-Location
}
