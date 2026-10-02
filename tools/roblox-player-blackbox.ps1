# 파일명: tools/roblox-player-blackbox.ps1
param(
  [Parameter(Mandatory=$true)][string]$GameId,
  [Parameter(Mandatory=$true)][string]$PlaceId,
  [Parameter(Mandatory=$true)][string]$UniverseId,
  [Parameter(Mandatory=$true)][int]$VersionNumber,
  [Parameter(Mandatory=$true)][string]$SourceRevision,
  [Parameter(Mandatory=$true)][string]$ArtifactIdentity,
  [Parameter(Mandatory=$true)][string]$SessionId,
  [Parameter(Mandatory=$true)][string]$OutputDir
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class JaewoonBlackBoxInput {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing

$startedAt = [DateTime]::UtcNow
$existing = @{}
Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessName -in @('RobloxPlayerBeta','RobloxPlayer') } |
  ForEach-Object { $existing[[string]$_.Id] = $true }

function Find-OwnedPlayer {
  $rows = @(Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ProcessName -in @('RobloxPlayerBeta','RobloxPlayer') -and -not $existing.ContainsKey([string]$_.Id) })
  foreach($proc in @($rows | Sort-Object StartTime)){
    try {
      if($proc.StartTime.ToUniversalTime() -ge $startedAt.AddSeconds(-3)){ return $proc }
    } catch {}
  }
  return $null
}

function Capture-Window {
  param([System.Diagnostics.Process]$Process,[string]$Path)
  if(-not $Process -or $Process.HasExited -or $Process.MainWindowHandle -eq 0){ return $false }
  $rect = New-Object JaewoonBlackBoxInput+RECT
  if(-not [JaewoonBlackBoxInput]::GetWindowRect($Process.MainWindowHandle,[ref]$rect)){ return $false }
  $width = [Math]::Max(1,$rect.Right-$rect.Left)
  $height = [Math]::Max(1,$rect.Bottom-$rect.Top)
  if($width -lt 320 -or $height -lt 180){ return $false }
  $bmp = New-Object System.Drawing.Bitmap $width,$height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  try {
    $g.CopyFromScreen($rect.Left,$rect.Top,0,0,$bmp.Size)
    $bmp.Save($Path,[System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $g.Dispose()
    $bmp.Dispose()
  }
  return (Test-Path -LiteralPath $Path) -and ((Get-Item -LiteralPath $Path).Length -gt 1024)
}

function Send-Key {
  param([System.Diagnostics.Process]$Process,[byte]$Vk,[int]$HoldMs=150)
  if(-not $Process -or $Process.HasExited -or $Process.MainWindowHandle -eq 0){ return $false }
  [JaewoonBlackBoxInput]::SetForegroundWindow($Process.MainWindowHandle) | Out-Null
  Start-Sleep -Milliseconds 120
  [JaewoonBlackBoxInput]::keybd_event($Vk,0,0,[UIntPtr]::Zero)
  Start-Sleep -Milliseconds $HoldMs
  [JaewoonBlackBoxInput]::keybd_event($Vk,0,2,[UIntPtr]::Zero)
  return $true
}

$owned = $null
$evidence = [ordered]@{
  version = 1
  platform = 'ROBLOX'
  authority = 'ROBLOX_PLAYER_EXACT_PRIVATE_BLACK_BOX'
  sessionId = $SessionId
  gameId = $GameId
  sourceRevision = $SourceRevision
  artifactIdentity = $ArtifactIdentity
  universeId = $UniverseId
  placeId = $PlaceId
  versionNumber = $VersionNumber
  startedAt = $startedAt.ToString('o')
  actualPlayerRuntime = $true
  studioUsed = $false
  browserUsed = $false
  exactPrivateValidationTarget = $true
  processLaunch = $false
  windowReady = $false
  preInputScreenCaptured = $false
  inputDelivered = $false
  postInputScreenCaptured = $false
  visualDeltaObserved = $false
  processAliveAfterInput = $false
  ownedProcessClosed = $false
  completed = $false
  pass = $false
  failureClass = $null
  failure = $null
}

try {
  $launchPayload = "{`"jaewoonBlackBox`":true,`"sessionId`":`"$SessionId`"}"
  $launchData = [uri]::EscapeDataString($launchPayload)
  $uri = "roblox://placeId=$PlaceId&launchData=$launchData"
  Start-Process $uri | Out-Null
  Write-Host "ROBLOX_PLAYER_BLACK_BOX_DEEP_LINK=STARTED:$PlaceId"

  $deadline = [DateTime]::UtcNow.AddSeconds(90)
  while([DateTime]::UtcNow -lt $deadline){
    $owned = Find-OwnedPlayer
    if($owned){ break }
    Start-Sleep -Milliseconds 500
  }
  if(-not $owned){ throw 'ROBLOX_PLAYER_PROCESS_NOT_OBSERVED' }
  $evidence.processLaunch = $true
  $evidence.processId = $owned.Id

  $windowDeadline = [DateTime]::UtcNow.AddSeconds(60)
  while([DateTime]::UtcNow -lt $windowDeadline){
    try { $owned.Refresh() } catch {}
    if(-not $owned.HasExited -and $owned.MainWindowHandle -ne 0){ break }
    Start-Sleep -Milliseconds 500
  }
  if($owned.HasExited -or $owned.MainWindowHandle -eq 0){ throw 'ROBLOX_PLAYER_WINDOW_NOT_READY' }
  $evidence.windowReady = $true

  Start-Sleep -Seconds 5
  $before = Join-Path $OutputDir 'screen-before-input.png'
  $after = Join-Path $OutputDir 'screen-after-input.png'
  $evidence.preInputScreenCaptured = Capture-Window -Process $owned -Path $before

  $sent = $false
  $sent = (Send-Key -Process $owned -Vk 0x0D -HoldMs 100) -or $sent
  Start-Sleep -Milliseconds 500
  $sent = (Send-Key -Process $owned -Vk 0x57 -HoldMs 900) -or $sent
  Start-Sleep -Milliseconds 350
  $sent = (Send-Key -Process $owned -Vk 0x20 -HoldMs 120) -or $sent
  $evidence.inputDelivered = $sent

  Start-Sleep -Seconds 4
  try { $owned.Refresh() } catch {}
  $evidence.processAliveAfterInput = -not $owned.HasExited
  if($evidence.processAliveAfterInput){
    $evidence.postInputScreenCaptured = Capture-Window -Process $owned -Path $after
  }

  if($evidence.preInputScreenCaptured){
    $evidence.preInputScreenSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $before).Hash.ToLowerInvariant()
    $evidence.preInputScreenBytes = (Get-Item -LiteralPath $before).Length
  }
  if($evidence.postInputScreenCaptured){
    $evidence.postInputScreenSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $after).Hash.ToLowerInvariant()
    $evidence.postInputScreenBytes = (Get-Item -LiteralPath $after).Length
  }
  $evidence.visualDeltaObserved =
    $evidence.preInputScreenCaptured -and
    $evidence.postInputScreenCaptured -and
    $evidence.preInputScreenSha256 -ne $evidence.postInputScreenSha256

  $evidence.pass =
    $evidence.processLaunch -and
    $evidence.windowReady -and
    $evidence.preInputScreenCaptured -and
    $evidence.inputDelivered -and
    $evidence.postInputScreenCaptured -and
    $evidence.processAliveAfterInput

  if(-not $evidence.pass){
    $evidence.failureClass = 'PLAYER_RUNTIME_OBSERVATION'
    $evidence.failure = 'ROBLOX_PLAYER_BLACK_BOX_REQUIRED_SIGNAL_MISSING'
  }
} catch {
  $evidence.failureClass = if($evidence.processLaunch){'PLAYER_RUNTIME_OBSERVATION'}else{'HOST_OR_PLAYER_INFRASTRUCTURE'}
  $evidence.failure = [string]$_.Exception.Message
} finally {
  $evidence.completed = $true
  $evidence.completedAt = [DateTime]::UtcNow.ToString('o')
  if($owned){
    try {
      $owned.Refresh()
      if(-not $owned.HasExited){ Stop-Process -Id $owned.Id -Force -ErrorAction Stop }
      $evidence.ownedProcessClosed = $true
    } catch {
      $evidence.cleanupFailure = [string]$_.Exception.Message
    }
  } else {
    $evidence.ownedProcessClosed = $true
  }
  $evidence | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $OutputDir 'evidence.json') -Encoding UTF8
}

Write-Host "ROBLOX_PLAYER_BLACK_BOX_SESSION=$SessionId"
Write-Host "ROBLOX_PLAYER_BLACK_BOX_PROCESS_LAUNCH=$($evidence.processLaunch)"
Write-Host "ROBLOX_PLAYER_BLACK_BOX_WINDOW_READY=$($evidence.windowReady)"
Write-Host "ROBLOX_PLAYER_BLACK_BOX_INPUT=$($evidence.inputDelivered)"
Write-Host "ROBLOX_PLAYER_BLACK_BOX_VISUAL_DELTA=$($evidence.visualDeltaObserved)"
Write-Host "ROBLOX_PLAYER_BLACK_BOX_PASS=$($evidence.pass)"
if(-not $evidence.pass){ exit 2 }
