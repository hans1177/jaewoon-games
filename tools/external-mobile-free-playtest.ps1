param(
  [string]$ManifestPath = 'company-learning/external-game-playtest/mobile-free-seed-games.json',
  [string]$OutDir = "$env:RUNNER_TEMP\external-mobile-game-playtest",
  [int]$MaxGames = 1
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Adb {
  param([string]$Serial, [string[]]$Args, [switch]$AllowFailure)
  $all = @('-s', $Serial) + $Args
  $output = & adb @all 2>&1
  $code = $LASTEXITCODE
  if (-not $AllowFailure -and $code -ne 0) {
    throw "adb failed ($code): adb $($all -join ' ')`n$($output -join "`n")"
  }
  return @($output)
}

function Get-ConnectedDevices {
  $rows = & adb devices 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'adb devices failed' }
  $devices = @()
  foreach ($line in $rows) {
    if ($line -match '^([^\s]+)\s+device$') { $devices += $Matches[1] }
  }
  return $devices
}

function Get-ScreenSize {
  param([string]$Serial)
  $rows = Invoke-Adb -Serial $Serial -Args @('shell','wm','size')
  $text = $rows -join ' '
  if ($text -match '(\d+)x(\d+)') { return @{ Width=[int]$Matches[1]; Height=[int]$Matches[2] } }
  return @{ Width=1080; Height=1920 }
}

function Test-PackageInstalled {
  param([string]$Serial, [string]$PackageId)
  $rows = Invoke-Adb -Serial $Serial -Args @('shell','pm','path',$PackageId) -AllowFailure
  return (($rows -join "`n") -match '^package:')
}

function Save-Screenshot {
  param([string]$Serial, [string]$Name, [string]$Directory)
  $remote = "/sdcard/${Name}.png"
  Invoke-Adb -Serial $Serial -Args @('shell','screencap','-p',$remote) | Out-Null
  Invoke-Adb -Serial $Serial -Args @('pull',$remote,(Join-Path $Directory "${Name}.png")) | Out-Null
  Invoke-Adb -Serial $Serial -Args @('shell','rm','-f',$remote) -AllowFailure | Out-Null
  return (Join-Path $Directory "${Name}.png")
}

function Find-InstallButtonCenter {
  param([string]$Serial, [string]$Directory)
  $remote = '/sdcard/window.xml'
  Invoke-Adb -Serial $Serial -Args @('shell','uiautomator','dump',$remote) -AllowFailure | Out-Null
  $local = Join-Path $Directory 'window.xml'
  Invoke-Adb -Serial $Serial -Args @('pull',$remote,$local) -AllowFailure | Out-Null
  if (-not (Test-Path $local)) { return $null }
  try { [xml]$xml = Get-Content -Raw -Encoding UTF8 $local } catch { return $null }
  $installWords = @('Install','설치')
  $blockedWords = @('Sign in','로그인','Add account','계정 추가')
  foreach ($node in $xml.SelectNodes('//node')) {
    $text = [string]$node.text
    $desc = [string]$node.'content-desc'
    foreach ($blocked in $blockedWords) {
      if ($text -eq $blocked -or $desc -eq $blocked) { return @{ Blocked=$true; Reason='PLAY_STORE_SIGN_IN_REQUIRED' } }
    }
  }
  foreach ($node in $xml.SelectNodes('//node')) {
    $text = [string]$node.text
    $desc = [string]$node.'content-desc'
    if (($installWords -contains $text) -or ($installWords -contains $desc)) {
      $bounds = [string]$node.bounds
      if ($bounds -match '^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$') {
        $x = [int]( ([int]$Matches[1] + [int]$Matches[3]) / 2 )
        $y = [int]( ([int]$Matches[2] + [int]$Matches[4]) / 2 )
        return @{ Blocked=$false; X=$x; Y=$y }
      }
    }
  }
  return $null
}

function Install-FromPlayStore {
  param([string]$Serial, [string]$PackageId, [string]$Directory)
  if (Test-PackageInstalled -Serial $Serial -PackageId $PackageId) { return @{ Pass=$true; AlreadyInstalled=$true; Reason='ALREADY_INSTALLED' } }
  $play = Invoke-Adb -Serial $Serial -Args @('shell','pm','path','com.android.vending') -AllowFailure
  if (($play -join "`n") -notmatch '^package:') { return @{ Pass=$false; AlreadyInstalled=$false; Reason='PLAY_STORE_NOT_PRESENT' } }
  Invoke-Adb -Serial $Serial -Args @('shell','am','start','-a','android.intent.action.VIEW','-d',"market://details?id=$PackageId",'-p','com.android.vending') -AllowFailure | Out-Null
  Start-Sleep -Seconds 6
  if (Test-PackageInstalled -Serial $Serial -PackageId $PackageId) { return @{ Pass=$true; AlreadyInstalled=$false; Reason='INSTALLED_AFTER_STORE_OPEN' } }
  $button = Find-InstallButtonCenter -Serial $Serial -Directory $Directory
  if ($null -eq $button) { return @{ Pass=$false; AlreadyInstalled=$false; Reason='INSTALL_BUTTON_NOT_FOUND' } }
  if ($button.Blocked -eq $true) { return @{ Pass=$false; AlreadyInstalled=$false; Reason=$button.Reason } }
  Invoke-Adb -Serial $Serial -Args @('shell','input','tap',[string]$button.X,[string]$button.Y) | Out-Null
  $deadline = (Get-Date).AddMinutes(15)
  do {
    Start-Sleep -Seconds 5
    if (Test-PackageInstalled -Serial $Serial -PackageId $PackageId) { return @{ Pass=$true; AlreadyInstalled=$false; Reason='PLAY_STORE_INSTALL_PASS' } }
  } while ((Get-Date) -lt $deadline)
  return @{ Pass=$false; AlreadyInstalled=$false; Reason='PLAY_STORE_INSTALL_TIMEOUT' }
}

function Invoke-SafeInputProfile {
  param([string]$Serial, [string]$Profile, [hashtable]$Size)
  $w=$Size.Width; $h=$Size.Height
  $cx=[int]($w*0.50); $cy=[int]($h*0.55)
  $left=[int]($w*0.30); $right=[int]($w*0.70); $top=[int]($h*0.35); $bottom=[int]($h*0.75)
  switch ($Profile) {
    'RUNNER' {
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',$cx,$cy,$cx,$top,'250') | Out-Null
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',$cx,$cy,$left,$cy,'250') | Out-Null
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',$cx,$cy,$right,$cy,'250') | Out-Null
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',$cx,$cy,$cx,$bottom,'250') | Out-Null
    }
    'MATCH3' {
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',[int]($w*.38),[int]($h*.56),[int]($w*.52),[int]($h*.56),'300') | Out-Null
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',[int]($w*.52),[int]($h*.62),[int]($w*.52),[int]($h*.50),'300') | Out-Null
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',[int]($w*.60),[int]($h*.56),[int]($w*.46),[int]($h*.56),'300') | Out-Null
    }
    'BLOCK_PUZZLE' {
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',[int]($w*.25),[int]($h*.82),[int]($w*.38),[int]($h*.52),'500') | Out-Null
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',[int]($w*.50),[int]($h*.82),[int]($w*.55),[int]($h*.48),'500') | Out-Null
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',[int]($w*.75),[int]($h*.82),[int]($w*.68),[int]($h*.58),'500') | Out-Null
    }
    'SURVIVAL' {
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',$cx,$bottom,$left,$cy,'800') | Out-Null
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',$cx,$bottom,$right,$cy,'800') | Out-Null
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',$cx,$bottom,$cx,$top,'800') | Out-Null
    }
    'IDLE_RPG' {
      Invoke-Adb -Serial $Serial -Args @('shell','input','tap',[int]($w*.45),[int]($h*.65)) | Out-Null
      Invoke-Adb -Serial $Serial -Args @('shell','input','tap',[int]($w*.35),[int]($h*.72)) | Out-Null
    }
    default {
      Invoke-Adb -Serial $Serial -Args @('shell','input','swipe',$cx,$cy,$right,$cy,'300') | Out-Null
    }
  }
}

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) { throw 'BLOCKED_ADB_NOT_FOUND' }
if (-not (Test-Path $ManifestPath)) { throw "manifest missing: $ManifestPath" }
$manifest = Get-Content -Raw -Encoding UTF8 $ManifestPath | ConvertFrom-Json
if ($manifest.authority -ne 'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE' -or $manifest.practiceOnly -ne $true -or $manifest.runtimePromotionAllowed -ne $false) { throw 'unsafe external playtest manifest' }
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$devices = @(Get-ConnectedDevices)
if ($devices.Count -eq 0) { throw 'BLOCKED_ANDROID_DEVICE_NOT_CONNECTED' }
$serial = $null
foreach ($candidate in $devices) {
  $store = Invoke-Adb -Serial $candidate -Args @('shell','pm','path','com.android.vending') -AllowFailure
  if (($store -join "`n") -match '^package:') { $serial = $candidate; break }
}
if (-not $serial) { throw 'BLOCKED_PLAY_STORE_NOT_PROVISIONED' }
$size = Get-ScreenSize -Serial $serial
$games = @($manifest.games | Select-Object -First $MaxGames)
$summary = @()
foreach ($game in $games) {
  $gameDir = Join-Path $OutDir $game.id
  New-Item -ItemType Directory -Path $gameDir -Force | Out-Null
  $packageId = $null
  $install = $null
  foreach ($candidatePackage in @($game.packageIds)) {
    $install = Install-FromPlayStore -Serial $serial -PackageId $candidatePackage -Directory $gameDir
    if ($install.Pass) { $packageId = $candidatePackage; break }
  }
  if (-not $packageId) {
    $result = [ordered]@{
      version=1; gameId=$game.id; title=$game.title; category=$game.category; packageId=$null; storeUrl=$game.storeUrl;
      authority='EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE'; practiceOnly=$true; runtimePromotionAllowed=$false;
      installPass=$false; installReason=$install.Reason; launchPass=$false; foregroundPass=$false; processAliveAfter=$false;
      visualChange=$false; noCrash=$false; inputProfile=$game.inputProfile; observedAt=(Get-Date).ToUniversalTime().ToString('o')
    }
    $result | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $gameDir 'result.json') -Encoding UTF8
    $summary += $result
    continue
  }
  Invoke-Adb -Serial $serial -Args @('logcat','-c') -AllowFailure | Out-Null
  $launch = Invoke-Adb -Serial $serial -Args @('shell','monkey','-p',$packageId,'-c','android.intent.category.LAUNCHER','1') -AllowFailure
  Start-Sleep -Seconds 8
  $before = Save-Screenshot -Serial $serial -Name 'before' -Directory $gameDir
  $focusBefore = (Invoke-Adb -Serial $serial -Args @('shell','dumpsys','window') -AllowFailure) -join "`n"
  $foregroundPass = $focusBefore -match [regex]::Escape($packageId)
  $pidBefore = ((Invoke-Adb -Serial $serial -Args @('shell','pidof',$packageId) -AllowFailure) -join '').Trim()
  Invoke-SafeInputProfile -Serial $serial -Profile $game.inputProfile -Size $size
  Start-Sleep -Seconds 6
  $after = Save-Screenshot -Serial $serial -Name 'after' -Directory $gameDir
  $focusAfter = (Invoke-Adb -Serial $serial -Args @('shell','dumpsys','window') -AllowFailure) -join "`n"
  $pidAfter = ((Invoke-Adb -Serial $serial -Args @('shell','pidof',$packageId) -AllowFailure) -join '').Trim()
  $logPath = Join-Path $gameDir 'logcat.txt'
  & adb -s $serial logcat -d -v threadtime | Set-Content $logPath -Encoding UTF8
  $logText = Get-Content -Raw -Encoding UTF8 $logPath
  $crashPattern = "FATAL EXCEPTION|ANR in $([regex]::Escape($packageId))|Process $([regex]::Escape($packageId)).*has died|Force finishing activity.*$([regex]::Escape($packageId))"
  $noCrash = $logText -notmatch $crashPattern
  $beforeHash = (Get-FileHash $before -Algorithm SHA256).Hash.ToLowerInvariant()
  $afterHash = (Get-FileHash $after -Algorithm SHA256).Hash.ToLowerInvariant()
  $visualChange = $beforeHash -ne $afterHash
  $result = [ordered]@{
    version=1; gameId=$game.id; title=$game.title; category=$game.category; packageId=$packageId; storeUrl=$game.storeUrl;
    authority='EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE'; practiceOnly=$true; runtimePromotionAllowed=$false;
    installPass=$true; installReason=$install.Reason; launchPass=($launch -join "`n") -match 'Events injected: 1';
    foregroundPass=($foregroundPass -or ($focusAfter -match [regex]::Escape($packageId))); processAliveAfter=([bool]$pidAfter);
    visualChange=$visualChange; noCrash=$noCrash; inputProfile=$game.inputProfile;
    beforeScreenshotSha256=$beforeHash; afterScreenshotSha256=$afterHash;
    evidenceRetention='EPHEMERAL_ARTIFACT_ONLY'; binaryRedistributed=$false; codeExtracted=$false;
    observedAt=(Get-Date).ToUniversalTime().ToString('o')
  }
  $result | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $gameDir 'result.json') -Encoding UTF8
  $summary += $result
  Invoke-Adb -Serial $serial -Args @('shell','am','force-stop',$packageId) -AllowFailure | Out-Null
}
$summaryPath = Join-Path $OutDir 'summary.json'
@{
  version=1; authority='EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE'; practiceOnly=$true; runtimePromotionAllowed=$false;
  deviceSerial=$serial; games=$summary; observedAt=(Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Depth 12 | Set-Content $summaryPath -Encoding UTF8
$passCount = @($summary | Where-Object { $_.installPass -and $_.launchPass -and $_.foregroundPass -and $_.processAliveAfter -and $_.noCrash }).Count
Write-Host "EXTERNAL_MOBILE_PLAYTEST_PASS_COUNT=$passCount"
Write-Host "EXTERNAL_MOBILE_PLAYTEST_TOTAL=$($summary.Count)"
Write-Host "EXTERNAL_MOBILE_PLAYTEST_SUMMARY=$summaryPath"
if ($passCount -lt 1) { throw 'EXTERNAL_MOBILE_PLAYTEST_NO_VALID_RUNTIME_SAMPLE' }
