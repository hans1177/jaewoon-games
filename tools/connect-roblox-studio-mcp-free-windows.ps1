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

# [공식 설치 검사] 로그인한 PC에서는 Studio가 아직 열리지 않아도 기존 러너를 연결한다.
# 정확한 Place 열기와 플레이는 기존 Studio MCP 전용 작업이 담당한다.
$studio = @(Get-Process -Name 'RobloxStudioBeta' -ErrorAction SilentlyContinue |
  Where-Object { [int]$_.SessionId -eq $sessionId } | Select-Object -First 1)
$studioCandidates = @()
if ($studio.Count -eq 1 -and $studio[0].Path) {
  $studioCandidates += [string]$studio[0].Path
}
$studioRoots = @((Join-Path $env:LOCALAPPDATA 'Roblox\Versions'))
$programFilesX86 = [Environment]::GetFolderPath('ProgramFilesX86')
if ($programFilesX86) { $studioRoots += (Join-Path $programFilesX86 'Roblox\Versions') }
foreach ($root in $studioRoots) {
  if (-not (Test-Path -LiteralPath $root -PathType Container)) { continue }
  $installed = @(Get-ChildItem -Path (Join-Path $root '*\RobloxStudioBeta.exe') -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending)
  foreach ($candidate in $installed) { $studioCandidates += [string]$candidate.FullName }
}
$studioExe = $null
foreach ($candidate in @($studioCandidates | Select-Object -Unique)) {
  if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
  $studioSig = Get-AuthenticodeSignature -FilePath $candidate
  if ($studioSig.Status -eq 'Valid' -and
      $null -ne $studioSig.SignerCertificate -and
      $studioSig.SignerCertificate.Subject -like '*O=Roblox Corporation*') {
    $studioExe = $candidate
    break
  }
}
if (-not $studioExe) {
  throw 'ROBLOX_FREE_STUDIO_SIGNED_OFFICIAL_INSTALL_REQUIRED'
}
if ($studio.Count -eq 0) {
  Write-Host 'ROBLOX_FREE_STUDIO_OFFICIAL_INSTALL_READY=STUDIO_CLOSED'
  Write-Host 'ROBLOX_FREE_STUDIO_STUDIO_LAUNCH=DEFER_TO_EXACT_OFFICIAL_MCP_QA'
} else {
  Write-Host 'ROBLOX_FREE_STUDIO_OFFICIAL_INSTALL_READY=STUDIO_RUNNING'
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
Write-Host 'Keep the Windows desktop logged in and Assistant MCP enabled; exact QA launches Studio automatically.'
Write-Host 'Queued official Studio MCP jobs will run here when this authenticated Windows session is online.'
# [메인] 재연결: 같은 인증된 Windows 사용자 데스크톱에서만 기존 러너를 재실행한다.
# 자격 증명 자동 로그인, 서비스(Session 0) 실행, 새 러너 등록은 하지 않는다.
$restartDelaySeconds = 15
$studioAppAbsentNotified = $false
$lastRunnerExit = $null
while ($true) {
  # [인증] 러너는 Studio가 닫혀 있어도 온라인이어야 다음 작업에서 Studio를 열 수 있다.
  # 실제 Studio 인증/플레이 증거는 해당 GitHub 작업이 별도로 검증한다.
  if ([int](Get-Process -Id $PID).SessionId -ne $sessionId -or $sessionId -le 0) {
    throw 'ROBLOX_FREE_STUDIO_INTERACTIVE_DESKTOP_REQUIRED'
  }
  $activeStudio = @(Get-Process -Name 'RobloxStudioBeta' -ErrorAction SilentlyContinue |
    Where-Object { [int]$_.SessionId -eq $sessionId } | Select-Object -First 1)
  if ($activeStudio.Count -eq 0) {
    if (-not $studioAppAbsentNotified) {
      Write-Host 'ROBLOX_FREE_STUDIO_RUNNER_AVAILABLE_WITHOUT_STUDIO=WAIT_FOR_GITHUB_JOB_LAUNCH'
      $studioAppAbsentNotified = $true
    }
  } else {
    $activeStudioExe = $activeStudio[0].Path
    if (-not $activeStudioExe -or -not (Test-Path -LiteralPath $activeStudioExe)) {
      throw 'ROBLOX_FREE_STUDIO_EXECUTABLE_NOT_FOUND'
    }
    $activeStudioSig = Get-AuthenticodeSignature -FilePath $activeStudioExe
    if ($activeStudioSig.Status -ne 'Valid' -or
        $null -eq $activeStudioSig.SignerCertificate -or
        $activeStudioSig.SignerCertificate.Subject -notlike '*O=Roblox Corporation*') {
      throw 'ROBLOX_FREE_STUDIO_SIGNED_OFFICIAL_BINARY_REQUIRED'
    }
    if ($studioAppAbsentNotified) {
      Write-Host 'ROBLOX_FREE_STUDIO_APP_READY=OFFICIAL_STUDIO_INTERACTIVE_SESSION'
      $studioAppAbsentNotified = $false
    }
  }
  $runnerExit = -1
  try {
    Push-Location $RunnerRoot
    try {
      & $runnerCmd
      $runnerExit = [int]$LASTEXITCODE
    } finally {
      Pop-Location
    }
  } catch {
    Write-Warning 'ROBLOX_FREE_STUDIO_RUNNER_START_FAILED=RETRY_WITH_EXISTING_REGISTRATION'
  }
  if ($lastRunnerExit -ne $runnerExit) {
    Write-Warning "ROBLOX_FREE_STUDIO_RUNNER_EXIT=$runnerExit"
    $lastRunnerExit = $runnerExit
  }
  Write-Host "ROBLOX_FREE_STUDIO_RUNNER_RECONNECT_DELAY_SECONDS=$restartDelaySeconds"
  Start-Sleep -Seconds $restartDelaySeconds
  $restartDelaySeconds = [Math]::Min(60, $restartDelaySeconds * 2)
}
