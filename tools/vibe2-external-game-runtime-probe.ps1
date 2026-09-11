param(
  [string]$SeedPath = "game-seed-market-evidence.json",
  [string]$OutPath = "external-game-runtime-observation.json",
  [int]$LaunchSeconds = 20
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $SeedPath)) { throw "Seed file not found: $SeedPath" }
$seed = Get-Content -Raw -Encoding UTF8 $SeedPath | ConvertFrom-Json

$titles = New-Object System.Collections.Generic.HashSet[string] ([System.StringComparer]::OrdinalIgnoreCase)
foreach ($category in $seed.categories.PSObject.Properties) {
  foreach ($title in @($category.Value.benchmarkCandidates)) {
    if (-not [string]::IsNullOrWhiteSpace([string]$title)) { [void]$titles.Add([string]$title) }
  }
}

function Normalize-Title([string]$value) {
  if ($null -eq $value) { return '' }
  return (($value.ToLowerInvariant() -replace '[^a-z0-9]+',' ').Trim())
}

function Find-SteamRoot {
  $candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Steam'),
    (Join-Path $env:ProgramFiles 'Steam'),
    (Join-Path $env:LOCALAPPDATA 'Steam')
  ) | Where-Object { $_ -and (Test-Path $_) }
  return $candidates | Select-Object -First 1
}

function Get-SteamLibraries([string]$steamRoot) {
  $libs = New-Object System.Collections.Generic.List[string]
  if ($steamRoot -and (Test-Path $steamRoot)) { $libs.Add($steamRoot) }
  $vdf = if ($steamRoot) { Join-Path $steamRoot 'steamapps\libraryfolders.vdf' } else { $null }
  if ($vdf -and (Test-Path $vdf)) {
    $text = Get-Content -Raw -Encoding UTF8 $vdf
    foreach ($m in [regex]::Matches($text, '"path"\s+"([^"]+)"')) {
      $p = $m.Groups[1].Value -replace '\\\\','\'
      if ($p -and (Test-Path $p) -and -not $libs.Contains($p)) { $libs.Add($p) }
    }
  }
  return $libs
}

function Get-SteamApps([string[]]$libraries) {
  $apps = @()
  foreach ($lib in $libraries) {
    $steamapps = Join-Path $lib 'steamapps'
    if (-not (Test-Path $steamapps)) { continue }
    foreach ($manifest in Get-ChildItem -Path $steamapps -Filter 'appmanifest_*.acf' -File -ErrorAction SilentlyContinue) {
      $text = Get-Content -Raw -Encoding UTF8 $manifest.FullName
      $appid = ([regex]::Match($text, '"appid"\s+"([0-9]+)"')).Groups[1].Value
      $name = ([regex]::Match($text, '"name"\s+"([^"]+)"')).Groups[1].Value
      $installdir = ([regex]::Match($text, '"installdir"\s+"([^"]+)"')).Groups[1].Value
      if ($appid -and $name) {
        $apps += [pscustomobject]@{
          appId = $appid
          name = $name
          normalized = Normalize-Title $name
          installDir = if ($installdir) { Join-Path (Join-Path $steamapps 'common') $installdir } else { $null }
          manifest = $manifest.FullName
        }
      }
    }
  }
  return $apps
}

function Get-AndroidPackages {
  $adb = Get-Command adb -ErrorAction SilentlyContinue
  if (-not $adb) { return @() }
  try {
    $state = (& adb get-state 2>$null).Trim()
    if ($state -ne 'device') { return @() }
    return @(& adb shell pm list packages 2>$null | ForEach-Object { ($_ -replace '^package:','').Trim() } | Where-Object { $_ })
  } catch { return @() }
}

$steamRoot = Find-SteamRoot
$steamLibraries = if ($steamRoot) { @(Get-SteamLibraries $steamRoot) } else { @() }
$steamApps = @(Get-SteamApps $steamLibraries)
$androidPackages = @(Get-AndroidPackages)
$steamExe = if ($steamRoot) { Join-Path $steamRoot 'steam.exe' } else { $null }

$results = @()
foreach ($title in ($titles | Sort-Object)) {
  $normalized = Normalize-Title $title
  $steamMatch = $steamApps | Where-Object { $_.normalized -eq $normalized -or $_.normalized.Contains($normalized) -or $normalized.Contains($_.normalized) } | Select-Object -First 1
  $record = [ordered]@{
    title = $title
    authority = 'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE'
    directRuntimeObserved = $false
    installed = $false
    platform = $null
    installEvidence = $null
    launchAttempted = $false
    launchResult = 'NOT_INSTALLED'
    observedSeconds = 0
    codeExtracted = $false
    decompilationUsed = $false
    productionVerifiedPositive = $false
    trainingUse = 'BEHAVIOR_AND_SYSTEM_REFERENCE_ONLY'
  }

  if ($steamMatch) {
    $record.installed = $true
    $record.platform = 'STEAM_WINDOWS'
    $record.installEvidence = [ordered]@{ appId=$steamMatch.appId; manifest=$steamMatch.manifest; installDir=$steamMatch.installDir }
    if ($steamExe -and (Test-Path $steamExe)) {
      $record.launchAttempted = $true
      try {
        $before = @(Get-Process -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
        Start-Process -FilePath $steamExe -ArgumentList '-silent', '-applaunch', $steamMatch.appId
        Start-Sleep -Seconds ([Math]::Max(5,$LaunchSeconds))
        $after = @(Get-Process -ErrorAction SilentlyContinue)
        $new = @($after | Where-Object { $before -notcontains $_.Id -and $_.ProcessName -notmatch '^(steam|steamwebhelper)$' })
        if ($new.Count -gt 0) {
          $record.directRuntimeObserved = $true
          $record.launchResult = 'PROCESS_OBSERVED'
          $record.observedSeconds = [Math]::Max(5,$LaunchSeconds)
          $record.runtimeProcesses = @($new | Select-Object ProcessName,Id,Path)
        } else {
          $record.launchResult = 'NO_NEW_GAME_PROCESS_OBSERVED'
        }
      } catch {
        $record.launchResult = 'LAUNCH_ERROR'
        $record.error = $_.Exception.Message
      }
    }
  }

  $results += [pscustomobject]$record
}

$out = [ordered]@{
  version = 1
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  sourceSeed = $SeedPath
  sourceRole = [string]$seed.role
  machine = $env:COMPUTERNAME
  steamDetected = [bool]$steamRoot
  steamLibraryCount = $steamLibraries.Count
  steamInstalledAppCount = $steamApps.Count
  adbDevicePackageCount = $androidPackages.Count
  policy = [ordered]@{
    directRuntimeRequired = $true
    documentationOnlyCountsAsObserved = $false
    screenshotsOnlyCountsAsObserved = $false
    decompilationAllowed = $false
    codeExtractionAllowed = $false
    commercialRuntimeCanPromoteProduction = $false
  }
  summary = [ordered]@{
    seedTitleCount = $results.Count
    installedCount = @($results | Where-Object installed).Count
    directRuntimeObservedCount = @($results | Where-Object directRuntimeObserved).Count
  }
  results = $results
}

$out | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $OutPath
Write-Host "SEED_TITLE_COUNT=$($out.summary.seedTitleCount)"
Write-Host "INSTALLED_COUNT=$($out.summary.installedCount)"
Write-Host "DIRECT_RUNTIME_OBSERVED_COUNT=$($out.summary.directRuntimeObservedCount)"
if ($out.summary.directRuntimeObservedCount -eq 0) {
  Write-Host 'EXTERNAL_GAME_RUNTIME_RESULT=NO_DIRECT_RUNTIME_OBSERVATION'
} else {
  Write-Host 'EXTERNAL_GAME_RUNTIME_RESULT=PASS'
}
