# tools/watch-roblox-native-capture-windows.ps1
# Dedicated logged-on Windows native Roblox Player capture watcher.
# Never drives player input, logs in, or captures unrelated desktop windows.
param(
 [string]$Base = "$env:LOCALAPPDATA\JaewoonNativeMedia",
 [int]$PollSeconds = 3
)
$ErrorActionPreference = 'Stop'

# 경로
$Repo = Join-Path $Base 'main'
$Runtime = Join-Path $Base 'runtime'
$Recorder = Join-Path $Repo 'tools\company-roblox-native-windows-capture.mjs'
$PrivateConfig = Join-Path $Base 'private-capture-join.xml'
$LogDir = Join-Path $Base 'logs'
$Log = Join-Path $LogDir 'capture-worker.log'
$GameIds = @('cozy-island', 'daechung-rpg', 'horror-escape-room')
if ($env:OS -ne 'Windows_NT') { throw 'WINDOWS_INTERACTIVE_SESSION_REQUIRED' }
if (-not (Test-Path -LiteralPath $Recorder)) { throw 'ROBLOX_CAPTURE_WORKER_NOT_INSTALLED' }
if (-not (Test-Path -LiteralPath (Join-Path $Runtime 'development-queue.json'))) {
 throw 'ROBLOX_CAPTURE_RUNTIME_BRANCH_NOT_CHECKED_OUT'
}
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$env:ROBLOX_CAPTURE_AUTHORIZED = '1'
$env:ROBLOX_CAPTURE_SUBMIT = '1'
$script:NextLaunchAttempt = [datetime]::MinValue
$script:NextRefresh = [datetime]::MinValue
$script:LaunchedGame = ''
$script:LaunchedPid = 0
$script:NextGameIndex = 0
$script:LastDiagnostic = @{}

# 로그: 같은 장애를 짧은 주기로 반복 기록하지 않는다.
function Write-CaptureDiagnostic([string]$Kind, [string]$Message) {
 $signature = $Kind + ':' + $Message
 $now = Get-Date
 if ($script:LastDiagnostic.ContainsKey($signature) -and
  ($now - $script:LastDiagnostic[$signature]).TotalMinutes -lt 10) { return }
 $script:LastDiagnostic[$signature] = $now
 "[$($now.ToString('o'))] $Kind=$Message" | Out-File -FilePath $Log -Append -Encoding utf8
}

# 설정: 암호화된 사용자별 비공개 서버 링크만 사용한다.
function Get-ApprovedJoinEntries {
 $entries = @()
 if (Test-Path -LiteralPath $PrivateConfig) {
  $config = Import-Clixml -LiteralPath $PrivateConfig
  if ($config -and $config.Entries) {
   $entries = @($config.Entries)
  } elseif ($config -and $config.GameId) {
   $entries = @($config)
  }
 } elseif ($env:JAEWOON_CAPTURE_GAME_ID -and $env:JAEWOON_CAPTURE_PRIVATE_LINK_CODE) {
  $entries = @([pscustomobject]@{
   GameId = $env:JAEWOON_CAPTURE_GAME_ID
   LinkCode = $env:JAEWOON_CAPTURE_PRIVATE_LINK_CODE
  })
 }
 $approved = @()
 foreach ($entry in $entries) {
  $id = [string]$entry.GameId
  if ($id -notin $GameIds) { continue }
  $code = ''
  if ($entry.LinkCode -is [Security.SecureString]) {
   $code = ([System.Net.NetworkCredential]::new('', $entry.LinkCode)).Password
  } elseif (-not (Test-Path -LiteralPath $PrivateConfig)) {
   $code = [string]$entry.LinkCode
  }
  if ($code -notmatch '^[A-Za-z0-9_-]{8,200}$') { continue }
  $approved += [pscustomobject]@{GameId=$id; LinkCode=$code}
 }
 return $approved
}

# 로컬 캐시의 출처를 현재 중앙 브랜치와 일치시킨다.
function Update-CaptureCheckouts {
 if ((Get-Date) -lt $script:NextRefresh) { return }
 $script:NextRefresh = (Get-Date).AddMinutes(2)
 foreach ($checkout in @(@($Repo, 'main'), @($Runtime, 'company-runtime'))) {
  $directory = [string]$checkout[0]
  $branch = [string]$checkout[1]
  if ((& git -C $directory branch --show-current 2>$null).Trim() -ne $branch) {
   throw "CAPTURE_CHECKOUT_BRANCH_MISMATCH:$branch"
  }
  & git -C $directory pull --ff-only --quiet origin $branch 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "CAPTURE_CHECKOUT_SYNC_FAILED:$branch" }
 }
}

# 확인된 전용 비공개 서버에만 공식 Roblox URI로 접속한다.
function Start-ApprovedPrivateCaptureSession {
 if ((Get-Date) -lt $script:NextLaunchAttempt) { return }
 $script:NextLaunchAttempt = (Get-Date).AddMinutes(5)
 $joins = @(Get-ApprovedJoinEntries)
 if ($joins.Count -eq 0) {
  Write-CaptureDiagnostic 'CAPTURE_LAUNCH_BLOCKED' 'PRIVATE_SERVER_DPAPI_CONFIGURATION_MISSING'
  return
 }
 $queue = Get-Content -LiteralPath (Join-Path $Runtime 'development-queue.json') -Raw |
  ConvertFrom-Json
 for ($i = 0; $i -lt $GameIds.Count; $i++) {
  $idx = ($script:NextGameIndex + $i) % $GameIds.Count
  $id = $GameIds[$idx]
  $join = $joins | Where-Object { $_.GameId -eq $id } | Select-Object -First 1
  if (-not $join) { continue }
  $item = @($queue.items) | Where-Object { $_.gameId -eq $id } | Select-Object -First 1
  $target = $item.robloxPublicationTarget
  if (-not $target -or $target.verified -ne $true -or
   $target.dedicated -ne $true -or $target.shared -eq $true -or
   [string]$target.gameId -ne $id -or
   [string]$target.universeId -notmatch '^[1-9][0-9]*$' -or
   [string]$target.placeId -notmatch '^[1-9][0-9]*$') {
   Write-CaptureDiagnostic 'CAPTURE_LAUNCH_BLOCKED' "PRIVATE_DEDICATED_TARGET_UNVERIFIED:$id"
   continue
  }
  $launch = 'JAEWOON_NATIVE_CAPTURE_' + $id
  $uri = 'roblox://placeId=' + [string]$target.placeId +
   '&linkCode=' + [uri]::EscapeDataString($join.LinkCode) +
   '&launchData=' + [uri]::EscapeDataString($launch)
  Start-Process -FilePath $uri
  $script:LaunchedGame = $id
  $script:LaunchedPid = 0
  $script:NextGameIndex = ($idx + 1) % $GameIds.Count
  Write-CaptureDiagnostic 'CAPTURE_PRIVATE_SESSION_LAUNCH_REQUESTED' $id
  return
 }
}

# 메인: 게임 내 NPC가 실제로 움직였다는 로그가 있을 때만 창 녹화를 요청한다.
while ($true) {
 try {
  Update-CaptureCheckouts
  $active = @(Get-Process -Name 'RobloxPlayerBeta' -ErrorAction SilentlyContinue |
   Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match 'Roblox' })
  if ($active.Count -gt 1) {
   Write-CaptureDiagnostic 'CAPTURE_BLOCKED' 'AMBIGUOUS_MULTIPLE_ROBLOX_WINDOWS'
  } elseif ($active.Count -eq 0) {
   $script:LaunchedPid = 0
   Start-ApprovedPrivateCaptureSession
  } else {
   if ($script:LaunchedGame -and $script:LaunchedPid -eq 0) {
    $script:LaunchedPid = $active[0].Id
   }
   foreach ($id in $GameIds) {
    $output = @(& node $Recorder "--game-id=$id" '--mode=capture' "--runtime-root=$Runtime" 2>&1)
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
     Write-CaptureDiagnostic 'CAPTURE_SUCCESS' $id
     foreach ($message in $output) {
      if ([string]$message -match '^ROBLOX_(WINDOW_CAPTURE_SAVED|CAPTURE_SHA256|NATIVE_CAPTURE_SUBMITTED|NATIVE_RUNTIME_CLIP_ATTESTED)=') {
       Write-CaptureDiagnostic 'CAPTURE_PROOF' ([string]$message)
      }
     }
     # Only close a dedicated session launched by THIS watcher after verified upload.
     # Do not close a Player window that was already open when the watcher started.
     if ($id -eq $script:LaunchedGame -and
      $script:LaunchedPid -eq $active[0].Id -and
      ($output -match 'ROBLOX_NATIVE_CAPTURE_SUBMITTED=YES')) {
      [void]$active[0].CloseMainWindow()
      $script:LaunchedGame = ''
      $script:LaunchedPid = 0
     }
     break
    }
    $message = ((@($output) | ForEach-Object { [string]$_ }) -join ' ')
    if ($message -match 'ROBLOX_CAPTURE_BLOCKED=' -and
     $message -notmatch 'PRIVATE_NPC_LAUNCH_DATA_OR_NATIVE_MOVE_ATTESTATION_MISSING|NATIVE_GAMEPLAY_SESSION_ALREADY_CAPTURED') {
     Write-CaptureDiagnostic 'CAPTURE_BLOCKED' ($id + ':' + $message.Substring(0,[math]::Min($message.Length,240)))
    }
   }
  }
 } catch {
  Write-CaptureDiagnostic 'CAPTURE_WATCHER_EXCEPTION' $_.Exception.Message
 }
 Start-Sleep -Seconds ([math]::Max(2,$PollSeconds))
}
