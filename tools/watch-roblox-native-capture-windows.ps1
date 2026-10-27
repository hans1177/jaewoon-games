# Dedicated Windows interactive capture watcher. Must run in a logged-on user session.
# Uses native Roblox client telemetry; does not send any keyboard/mouse input or auto-login.
param(
 [string]$Base = "$env:LOCALAPPDATA\JaewoonNativeMedia",
 [int]$PollSeconds = 3
)
$ErrorActionPreference = "Stop"
$Repo = Join-Path $Base "main"
$Runtime = Join-Path $Base "runtime"
$Recorder = Join-Path $Repo "tools\company-roblox-native-windows-capture.mjs"
if (-not (Test-Path $Recorder)) { throw "ROBLOX_CAPTURE_WORKER_NOT_INSTALLED" }
if (-not (Test-Path (Join-Path $Runtime 'development-queue.json'))) {
 throw "ROBLOX_CAPTURE_RUNTIME_BRANCH_NOT_CHECKED_OUT"
}
$env:ROBLOX_CAPTURE_AUTHORIZED = '1'
$env:ROBLOX_CAPTURE_SUBMIT = '1'
New-Item -ItemType Directory -Force -Path (Join-Path $Base "logs") | Out-Null
$Log = Join-Path $Base "logs\capture-worker.log"
# Optional official Roblox deep link. Only routes an already signed-in Roblox client;
# it does not simulate keyboard/mouse input, log in, or bypass private-server access.
$NextLaunchAttempt = [DateTime]::MinValue
function Start-ApprovedPrivateCaptureSession {
 $gameId = [string]$env:JAEWOON_CAPTURE_GAME_ID
 $linkCode = [string]$env:JAEWOON_CAPTURE_PRIVATE_LINK_CODE
 if ($gameId -notin @('cozy-island','daechung-rpg','horror-escape-room')) { return }
 if ($linkCode -notmatch '^[A-Za-z0-9_-]{8,200}
 try {
  $active = Get-Process -Name 'RobloxPlayerBeta' -ErrorAction SilentlyContinue |
   Where-Object { $_.MainWindowHandle -ne 0 }
  if (-not $active) { Start-ApprovedPrivateCaptureSession }
  if ($active) {
   foreach ($gameId in @('cozy-island','daechung-rpg','horror-escape-room')) {
    $stamp = Get-Date -Format o
    # Worker requires matching trusted private NPC-telemetry and per-session nonce.
    $output = & node $Recorder "--game-id=$gameId" "--mode=capture" "--runtime-root=$Runtime" 2>&1
    if ($LASTEXITCODE -eq 0) {
     "[$stamp] $gameId SUCCESS" | Out-File -FilePath $Log -Append -Encoding utf8
     $output | Out-File -FilePath $Log -Append -Encoding utf8
    } elseif ($output -match 'ROBLOX_CAPTURE_BLOCKED=' -and
     $output -notmatch 'PRIVATE_NPC_LAUNCH_DATA_OR_NATIVE_MOVE_ATTESTATION_MISSING|NATIVE_GAMEPLAY_SESSION_ALREADY_CAPTURED') {
     "[$stamp] $gameId BLOCKED: $($output -join ' ')" |
      Out-File -FilePath $Log -Append -Encoding utf8
    }
   }
  }
 } catch {
  "[$(Get-Date -Format o)] WATCHER_EXCEPTION=$($_.Exception.Message)" |
   Out-File -FilePath $Log -Append -Encoding utf8
 }
 Start-Sleep -Seconds ([Math]::Max(2,$PollSeconds))
}
) { return }
 if ((Get-Date) -lt $script:NextLaunchAttempt) { return }
 $script:NextLaunchAttempt = (Get-Date).AddMinutes(5)
 $data = Get-Content -Raw (Join-Path $Runtime 'development-queue.json') |
  ConvertFrom-Json
 $entry = $data.items | Where-Object { $_.gameId -eq $gameId } | Select-Object -First 1
 $target = $entry.robloxPublicationTarget
 if (-not $target -or $target.verified -ne $true -or
  $target.dedicated -ne $true -or $target.shared -eq $true -or
  ([string]$target.gameId -ne $gameId) -or
  ([string]$target.placeId -notmatch '^[1-9][0-9]*
 try {
  $active = Get-Process -Name 'RobloxPlayerBeta' -ErrorAction SilentlyContinue |
   Where-Object { $_.MainWindowHandle -ne 0 }
  if ($active) {
   foreach ($gameId in @('cozy-island','daechung-rpg','horror-escape-room')) {
    $stamp = Get-Date -Format o
    # Worker requires matching trusted private NPC-telemetry and per-session nonce.
    $output = & node $Recorder "--game-id=$gameId" "--mode=capture" "--runtime-root=$Runtime" 2>&1
    if ($LASTEXITCODE -eq 0) {
     "[$stamp] $gameId SUCCESS" | Out-File -FilePath $Log -Append -Encoding utf8
     $output | Out-File -FilePath $Log -Append -Encoding utf8
    } elseif ($output -match 'ROBLOX_CAPTURE_BLOCKED=' -and
     $output -notmatch 'PRIVATE_NPC_LAUNCH_DATA_OR_NATIVE_MOVE_ATTESTATION_MISSING|NATIVE_GAMEPLAY_SESSION_ALREADY_CAPTURED') {
     "[$stamp] $gameId BLOCKED: $($output -join ' ')" |
      Out-File -FilePath $Log -Append -Encoding utf8
    }
   }
  }
 } catch {
  "[$(Get-Date -Format o)] WATCHER_EXCEPTION=$($_.Exception.Message)" |
   Out-File -FilePath $Log -Append -Encoding utf8
 }
 Start-Sleep -Seconds ([Math]::Max(2,$PollSeconds))
}
)) { return }
 $launch = 'JAEWOON_NATIVE_CAPTURE_'+$gameId
 # Roblox's documented deep-link format: placeId, linkCode and LaunchData.
 $uri = 'roblox://placeId='+$target.placeId+
  '&linkCode='+[uri]::EscapeDataString($linkCode)+
  '&launchData='+[uri]::EscapeDataString($launch)
 Start-Process -FilePath $uri
 "[$(Get-Date -Format o)] OFFICIAL_PRIVATE_SESSION_LAUNCH_REQUESTED=$gameId" |
  Out-File -FilePath $Log -Append -Encoding utf8
 # Do not print the join link or credential into logs.
}
while ($true) {
 try {
  $active = Get-Process -Name 'RobloxPlayerBeta' -ErrorAction SilentlyContinue |
   Where-Object { $_.MainWindowHandle -ne 0 }
  if ($active) {
   foreach ($gameId in @('cozy-island','daechung-rpg','horror-escape-room')) {
    $stamp = Get-Date -Format o
    # Worker requires matching trusted private NPC-telemetry and per-session nonce.
    $output = & node $Recorder "--game-id=$gameId" "--mode=capture" "--runtime-root=$Runtime" 2>&1
    if ($LASTEXITCODE -eq 0) {
     "[$stamp] $gameId SUCCESS" | Out-File -FilePath $Log -Append -Encoding utf8
     $output | Out-File -FilePath $Log -Append -Encoding utf8
    } elseif ($output -match 'ROBLOX_CAPTURE_BLOCKED=' -and
     $output -notmatch 'PRIVATE_NPC_LAUNCH_DATA_OR_NATIVE_MOVE_ATTESTATION_MISSING|NATIVE_GAMEPLAY_SESSION_ALREADY_CAPTURED') {
     "[$stamp] $gameId BLOCKED: $($output -join ' ')" |
      Out-File -FilePath $Log -Append -Encoding utf8
    }
   }
  }
 } catch {
  "[$(Get-Date -Format o)] WATCHER_EXCEPTION=$($_.Exception.Message)" |
   Out-File -FilePath $Log -Append -Encoding utf8
 }
 Start-Sleep -Seconds ([Math]::Max(2,$PollSeconds))
}
