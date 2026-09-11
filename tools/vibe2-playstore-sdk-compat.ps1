$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Find-SdkRoot {
  $candidates = @(
    $env:ANDROID_SDK_ROOT,
    $env:ANDROID_HOME,
    (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Android\Sdk')
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  $root = @($candidates | Select-Object -Unique) | Select-Object -First 1
  if (-not $root) { throw 'ANDROID_SDK_ROOT_NOT_FOUND' }
  $root
}

function Find-SdkManager {
  param([string]$SdkRoot)
  $candidates = New-Object System.Collections.Generic.List[string]
  $latest = Join-Path $SdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
  if (Test-Path -LiteralPath $latest) { $candidates.Add($latest) }

  $cmdRoot = Join-Path $SdkRoot 'cmdline-tools'
  if (Test-Path -LiteralPath $cmdRoot) {
    Get-ChildItem $cmdRoot -Directory -ErrorAction SilentlyContinue |
      Sort-Object {
        $v = 0
        [void][int]::TryParse($_.Name, [ref]$v)
        $v
      } -Descending |
      ForEach-Object {
        $p = Join-Path $_.FullName 'bin\sdkmanager.bat'
        if ((Test-Path -LiteralPath $p) -and -not $candidates.Contains($p)) { $candidates.Add($p) }
      }
  }

  $legacy = Join-Path $SdkRoot 'tools\bin\sdkmanager.bat'
  if (Test-Path -LiteralPath $legacy) { $candidates.Add($legacy) }

  $sdk = @($candidates) | Select-Object -First 1
  if (-not $sdk) { throw 'SDKMANAGER_NOT_FOUND' }
  $sdk
}

function Set-AndroidJava {
  $javaCandidates = @(
    (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'),
    (Join-Path $env:ProgramFiles 'Android\Android Studio\jre')
  )
  foreach ($javaCandidate in $javaCandidates) {
    $javaExe = Join-Path $javaCandidate 'bin\java.exe'
    if (Test-Path -LiteralPath $javaExe) {
      $env:JAVA_HOME = $javaCandidate
      $env:Path = "$(Join-Path $javaCandidate 'bin');$env:Path"
      Write-Host "JAVA_HOME=$javaCandidate"
      return
    }
  }
}

function Invoke-CmdWithYes {
  param([string]$Exe, [string[]]$ArgumentList)
  $quotedExe = '"' + $Exe.Replace('"','""') + '"'
  $quotedArgs = @($ArgumentList | ForEach-Object { '"' + ([string]$_).Replace('"','""') + '"' }) -join ' '
  $command = "(for /L %i in (1,1,500) do @echo y) | $quotedExe $quotedArgs"
  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & $env:ComSpec /d /s /c $command 2>&1
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $old
  }
  [pscustomobject]@{
    ExitCode = [int]$code
    Output = @($output | ForEach-Object { [string]$_ })
    Command = $command
  }
}

$sdkRoot = Find-SdkRoot
Set-AndroidJava
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:ANDROID_HOME = $sdkRoot
$sdkManager = Find-SdkManager $sdkRoot

Write-Host "ANDROID_SDK_ROOT=$sdkRoot"
Write-Host "SDKMANAGER=$sdkManager"

$systemImageRoot = Join-Path $sdkRoot 'system-images'
$installed = @()
if (Test-Path -LiteralPath $systemImageRoot) {
  $installed = @(Get-ChildItem $systemImageRoot -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -eq 'x86_64' -and $_.Parent -and $_.Parent.Name -eq 'google_apis_playstore' -and $_.Parent.Parent -and $_.Parent.Parent.Name -match '^android-\d+$'
  })
}
if ($installed.Count -gt 0) {
  $bestInstalled = $installed | Sort-Object { [int]($_.Parent.Parent.Name -replace '^android-','') } -Descending | Select-Object -First 1
  Write-Host "PLAY_STORE_SYSTEM_IMAGE_ALREADY_INSTALLED=$($bestInstalled.Parent.Parent.Name)"
  exit 0
}

$old = $ErrorActionPreference
try {
  $ErrorActionPreference = 'Continue'
  $listOutput = & $sdkManager --list 2>&1
  $listCode = $LASTEXITCODE
} finally {
  $ErrorActionPreference = $old
}
if ($listCode -ne 0) {
  throw "SDKMANAGER_LIST_FAILED:$(@($listOutput | Select-Object -Last 20) -join "`n")"
}

$best = $null
foreach ($row in @($listOutput)) {
  $text = ([string]$row).Trim()
  if ($text -match '^(system-images;android-(\d+);google_apis_playstore;x86_64)\s*\|') {
    $pkg = $Matches[1]
    $api = [int]$Matches[2]
    if ($null -eq $best -or $api -gt $best.Api) {
      $best = [pscustomobject]@{ Api = $api; Package = $pkg }
    }
  }
}
if ($null -eq $best) { throw 'NO_GOOGLE_PLAY_X86_64_SYSTEM_IMAGE_IN_SDKMANAGER_LIST' }

Write-Host 'ANDROID_SDK_LICENSE_ACCEPTANCE=START'
$license = Invoke-CmdWithYes $sdkManager @('--licenses')
if ($license.ExitCode -eq 0) {
  Write-Host 'ANDROID_SDK_LICENSE_ACCEPTANCE=PASS'
} else {
  Write-Host 'ANDROID_SDK_LICENSE_ACCEPTANCE=DEFER_TO_INSTALL'
}

Write-Host "INSTALLING_PLAY_STORE_SYSTEM_IMAGE=$($best.Package)"
$install = Invoke-CmdWithYes $sdkManager @($best.Package)
if ($install.ExitCode -ne 0) {
  throw "PLAY_STORE_SYSTEM_IMAGE_INSTALL_FAILED:$(@($install.Output | Select-Object -Last 40) -join "`n")"
}

$expected = Join-Path $sdkRoot "system-images\android-$($best.Api)\google_apis_playstore\x86_64"
if (-not (Test-Path -LiteralPath $expected)) {
  throw "PLAY_STORE_SYSTEM_IMAGE_INSTALL_NOT_FOUND:$expected"
}

Write-Host "PLAY_STORE_SYSTEM_IMAGE_INSTALL=PASS"
Write-Host "PLAY_STORE_SYSTEM_IMAGE_API=$($best.Api)"
