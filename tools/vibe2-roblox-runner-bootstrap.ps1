# 파일명: tools/vibe2-roblox-runner-bootstrap.ps1
# 역할: Windows 머신을 Vibe2 Roblox Studio용 GitHub self-hosted runner로 안전하게 등록/점검한다.
# 보안: 토큰은 환경/인자로만 받고 파일/로그에 저장하지 않는다. readiness는 실제 runner online + Studio 확인 뒤에만 true로 올린다.

[CmdletBinding()]
param(
    [ValidateSet('Preflight','Install','Remove')]
    [string]$Mode = 'Preflight',
    [string]$Repository = 'hans1177/jaewoon-games',
    [string]$RunnerName = "vibe2-roblox-$env:COMPUTERNAME",
    [string]$InstallRoot = 'C:\actions-runner',
    [string]$Labels = 'vibe2-roblox',
    [ValidateSet('Interactive','Service')]
    [string]$RunnerMode = 'Interactive',
    [string]$GitHubToken = $env:VIBE2_GITHUB_ADMIN_TOKEN,
    [string]$StudioPath = $env:VIBE2_ROBLOX_STUDIO_PATH,
    [switch]$ForceReconfigure,
    [switch]$SyncReadiness,
    [switch]$DispatchLiveSmoke
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$ApiVersion = '2026-03-10'
$ReadinessVariable = 'VIBE2_ROBLOX_STUDIO_RUNNER_READY'
$RequiredLabel = 'vibe2-roblox'
$ScheduledTaskName = 'Vibe2RobloxRunner'

function Write-Vibe2Status([string]$Name, [string]$Value) {
    Write-Host ("{0}={1}" -f $Name, $Value)
}

function Assert-Windows {
    if (-not $IsWindows) { throw 'Vibe2 Roblox runner bootstrap requires Windows.' }
}

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Install/Remove must run from an elevated PowerShell window.'
    }
}

function Split-Repository([string]$Value) {
    if ($Value -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw 'Repository must be owner/name.' }
    $parts = $Value.Split('/', 2)
    return @{ Owner = $parts[0]; Repo = $parts[1] }
}

function New-GitHubHeaders([string]$Token) {
    if ([string]::IsNullOrWhiteSpace($Token)) { throw 'VIBE2_GITHUB_ADMIN_TOKEN is required for this operation.' }
    return @{
        Accept = 'application/vnd.github+json'
        Authorization = "Bearer $Token"
        'X-GitHub-Api-Version' = $ApiVersion
        'User-Agent' = 'vibe2-roblox-runner-bootstrap'
    }
}

function Invoke-GitHubApi {
    param(
        [ValidateSet('GET','POST','PATCH','DELETE')][string]$Method,
        [string]$Path,
        [string]$Token,
        $Body = $null,
        [switch]$AllowNotFound
    )
    $uri = "https://api.github.com$Path"
    $params = @{
        Method = $Method
        Uri = $uri
        Headers = New-GitHubHeaders $Token
        UseBasicParsing = $true
    }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }
    try {
        $response = Invoke-WebRequest @params
        if ([string]::IsNullOrWhiteSpace($response.Content)) { return $null }
        return ($response.Content | ConvertFrom-Json)
    } catch {
        $status = $null
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        if ($AllowNotFound -and $status -eq 404) { return $null }
        throw "GitHub API $Method $Path failed (HTTP $status). $($_.Exception.Message)"
    }
}

function Find-RobloxStudio([string]$Override = '') {
    if (-not [string]::IsNullOrWhiteSpace($Override)) {
        $resolved = [IO.Path]::GetFullPath($Override)
        if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) { throw "Roblox Studio override not found: $resolved" }
        return $resolved
    }
    $candidates = [System.Collections.Generic.List[string]]::new()
    if ($env:LOCALAPPDATA) {
        $versions = Join-Path $env:LOCALAPPDATA 'Roblox\Versions'
        if (Test-Path -LiteralPath $versions) {
            Get-ChildItem -LiteralPath $versions -Directory -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTimeUtc -Descending |
                ForEach-Object {
                    $candidates.Add((Join-Path $_.FullName 'RobloxStudioBeta.exe'))
                    $candidates.Add((Join-Path $_.FullName 'RobloxStudio.exe'))
                }
        }
    }
    foreach ($root in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
        if ([string]::IsNullOrWhiteSpace($root)) { continue }
        $candidates.Add((Join-Path $root 'Roblox\Roblox Studio\RobloxStudioBeta.exe'))
        $candidates.Add((Join-Path $root 'Roblox\Roblox Studio\RobloxStudio.exe'))
    }
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return [IO.Path]::GetFullPath($candidate) }
    }
    return $null
}

function Get-LatestRunnerAsset([string]$Token) {
    $headers = @{ Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = $ApiVersion; 'User-Agent' = 'vibe2-roblox-runner-bootstrap' }
    if (-not [string]::IsNullOrWhiteSpace($Token)) { $headers.Authorization = "Bearer $Token" }
    $release = Invoke-RestMethod -Method Get -Uri 'https://api.github.com/repos/actions/runner/releases/latest' -Headers $headers
    $asset = @($release.assets) | Where-Object { $_.name -match '^actions-runner-win-x64-[0-9.]+\.zip$' } | Select-Object -First 1
    if (-not $asset) { throw 'Latest GitHub Actions Windows x64 runner asset not found.' }
    return @{ Version = [string]$release.tag_name; Url = [string]$asset.browser_download_url; Name = [string]$asset.name }
}

function Install-RunnerFiles([string]$Root, [string]$Token) {
    New-Item -ItemType Directory -Force -Path $Root | Out-Null
    $config = Join-Path $Root 'config.cmd'
    if (Test-Path -LiteralPath $config) { return }
    $asset = Get-LatestRunnerAsset $Token
    $zip = Join-Path ([IO.Path]::GetTempPath()) $asset.Name
    try {
        Invoke-WebRequest -UseBasicParsing -Uri $asset.Url -OutFile $zip
        Expand-Archive -LiteralPath $zip -DestinationPath $Root -Force
    } finally {
        Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
    }
    if (-not (Test-Path -LiteralPath $config -PathType Leaf)) { throw 'GitHub Actions runner extraction did not produce config.cmd.' }
    Write-Vibe2Status 'VIBE2_GITHUB_RUNNER_PACKAGE' $asset.Version
}

function Get-RegistrationToken([hashtable]$Repo, [string]$Token) {
    $result = Invoke-GitHubApi -Method POST -Path "/repos/$($Repo.Owner)/$($Repo.Repo)/actions/runners/registration-token" -Token $Token
    if ([string]::IsNullOrWhiteSpace([string]$result.token)) { throw 'GitHub runner registration token missing.' }
    return [string]$result.token
}

function Get-RemovalToken([hashtable]$Repo, [string]$Token) {
    $result = Invoke-GitHubApi -Method POST -Path "/repos/$($Repo.Owner)/$($Repo.Repo)/actions/runners/remove-token" -Token $Token
    if ([string]::IsNullOrWhiteSpace([string]$result.token)) { throw 'GitHub runner removal token missing.' }
    return [string]$result.token
}

function Remove-LocalRunnerConfiguration([string]$Root, [hashtable]$Repo, [string]$Token) {
    $config = Join-Path $Root 'config.cmd'
    if (-not (Test-Path -LiteralPath (Join-Path $Root '.runner'))) { return }
    if (-not (Test-Path -LiteralPath $config)) { throw 'Existing .runner found without config.cmd.' }
    try { Unregister-ScheduledTask -TaskName $ScheduledTaskName -Confirm:$false -ErrorAction SilentlyContinue } catch {}
    $removeToken = Get-RemovalToken $Repo $Token
    & $config remove --unattended --token $removeToken
    if ($LASTEXITCODE -ne 0) { throw "config.cmd remove failed with exit code $LASTEXITCODE" }
}

function Register-InteractiveRunnerTask([string]$Root) {
    $runCmd = Join-Path $Root 'run.cmd'
    if (-not (Test-Path -LiteralPath $runCmd)) { throw 'run.cmd missing.' }
    $user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/d /c `"`"$runCmd`"`"" -WorkingDirectory $Root
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
    $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
    Register-ScheduledTask -TaskName $ScheduledTaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Start-ScheduledTask -TaskName $ScheduledTaskName
}

function Register-Runner([string]$Root, [hashtable]$Repo, [string]$Token, [string]$Name, [string]$UserLabels, [string]$ModeName) {
    $config = Join-Path $Root 'config.cmd'
    $registrationToken = Get-RegistrationToken $Repo $Token
    $url = "https://github.com/$($Repo.Owner)/$($Repo.Repo)"
    $args = @('--unattended','--replace','--url',$url,'--token',$registrationToken,'--name',$Name,'--labels',$UserLabels,'--work','_work')
    if ($ModeName -eq 'Service') { $args += '--runasservice' }
    & $config @args
    if ($LASTEXITCODE -ne 0) { throw "config.cmd failed with exit code $LASTEXITCODE" }
    if ($ModeName -eq 'Interactive') { Register-InteractiveRunnerTask $Root }
}

function Get-RegisteredRunner([hashtable]$Repo, [string]$Token, [string]$Name) {
    $result = Invoke-GitHubApi -Method GET -Path "/repos/$($Repo.Owner)/$($Repo.Repo)/actions/runners?per_page=100" -Token $Token
    return @($result.runners) | Where-Object { [string]$_.name -eq $Name } | Select-Object -First 1
}

function Wait-RunnerOnline([hashtable]$Repo, [string]$Token, [string]$Name, [int]$TimeoutSeconds = 90) {
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    do {
        $runner = Get-RegisteredRunner $Repo $Token $Name
        if ($runner) {
            $labels = @($runner.labels | ForEach-Object { [string]$_.name })
            $hasLabel = $labels | Where-Object { $_ -ieq $RequiredLabel }
            if (-not $hasLabel) { throw "Runner '$Name' is missing required label '$RequiredLabel'." }
            if ([string]$runner.status -eq 'online') { return $runner }
        }
        Start-Sleep -Seconds 3
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "Runner '$Name' did not become online within $TimeoutSeconds seconds."
}

function Set-ReadinessVariable([hashtable]$Repo, [string]$Token, [bool]$Ready) {
    $name = $ReadinessVariable
    $path = "/repos/$($Repo.Owner)/$($Repo.Repo)/actions/variables/$name"
    $existing = Invoke-GitHubApi -Method GET -Path $path -Token $Token -AllowNotFound
    $body = @{ name = $name; value = $(if ($Ready) { 'true' } else { 'false' }) }
    if ($existing) {
        Invoke-GitHubApi -Method PATCH -Path $path -Token $Token -Body $body | Out-Null
    } else {
        Invoke-GitHubApi -Method POST -Path "/repos/$($Repo.Owner)/$($Repo.Repo)/actions/variables" -Token $Token -Body $body | Out-Null
    }
    Write-Vibe2Status $ReadinessVariable $(if ($Ready) { 'true' } else { 'false' })
}

function Dispatch-LiveSmoke([hashtable]$Repo, [string]$Token) {
    Invoke-GitHubApi -Method POST -Path "/repos/$($Repo.Owner)/$($Repo.Repo)/actions/workflows/vibe2-roblox-studio-live-smoke.yml/dispatches" -Token $Token -Body @{ ref = 'vibe2-unreal-core' } | Out-Null
    Write-Vibe2Status 'VIBE2_ROBLOX_STUDIO_SMOKE_DISPATCHED' 'YES'
}

function Test-RunnerPreflight([hashtable]$Repo, [string]$Token, [string]$Name, [string]$ResolvedStudio) {
    $configured = Test-Path -LiteralPath (Join-Path $InstallRoot '.runner')
    $runner = $null
    if (-not [string]::IsNullOrWhiteSpace($Token)) { $runner = Get-RegisteredRunner $Repo $Token $Name }
    $labels = if ($runner) { @($runner.labels | ForEach-Object { [string]$_.name }) } else { @() }
    $state = [ordered]@{
        version = 1
        repository = $Repository
        runnerName = $Name
        runnerMode = $RunnerMode
        installRoot = $InstallRoot
        configured = [bool]$configured
        studioFound = -not [string]::IsNullOrWhiteSpace($ResolvedStudio)
        studioPath = $ResolvedStudio
        githubRunnerKnown = $null -ne $runner
        githubRunnerStatus = if ($runner) { [string]$runner.status } else { $null }
        requiredLabelPresent = [bool]($labels | Where-Object { $_ -ieq $RequiredLabel })
        readinessVariable = $ReadinessVariable
        authorityExpanded = $false
    }
    $state | ConvertTo-Json -Depth 6
    return $state
}

Assert-Windows
$repo = Split-Repository $Repository
$studio = Find-RobloxStudio $StudioPath

if ($Mode -eq 'Preflight') {
    $state = Test-RunnerPreflight $repo $GitHubToken $RunnerName $studio
    if ($SyncReadiness) {
        if ([string]::IsNullOrWhiteSpace($GitHubToken)) { throw '-SyncReadiness requires VIBE2_GITHUB_ADMIN_TOKEN.' }
        $ready = $state.configured -and $state.studioFound -and $state.githubRunnerKnown -and $state.githubRunnerStatus -eq 'online' -and $state.requiredLabelPresent
        Set-ReadinessVariable $repo $GitHubToken ([bool]$ready)
    }
    exit 0
}

Assert-Administrator
if ([string]::IsNullOrWhiteSpace($GitHubToken)) {
    throw 'Install/Remove requires VIBE2_GITHUB_ADMIN_TOKEN. Fine-grained token needs repository Administration:write; readiness sync also needs Variables:write.'
}

if ($Mode -eq 'Remove') {
    if ($SyncReadiness) { Set-ReadinessVariable $repo $GitHubToken $false }
    Remove-LocalRunnerConfiguration $InstallRoot $repo $GitHubToken
    try { Unregister-ScheduledTask -TaskName $ScheduledTaskName -Confirm:$false -ErrorAction SilentlyContinue } catch {}
    Write-Vibe2Status 'VIBE2_ROBLOX_RUNNER_REMOVED' 'YES'
    exit 0
}

if ([string]::IsNullOrWhiteSpace($studio)) {
    if ($SyncReadiness) { Set-ReadinessVariable $repo $GitHubToken $false }
    throw 'Roblox Studio was not found. Install and sign in to Roblox Studio on this Windows user before runner activation.'
}

Install-RunnerFiles $InstallRoot $GitHubToken
if (Test-Path -LiteralPath (Join-Path $InstallRoot '.runner')) {
    if (-not $ForceReconfigure) {
        throw 'Runner is already configured. Use -ForceReconfigure to replace it and guarantee the vibe2-roblox label.'
    }
    Remove-LocalRunnerConfiguration $InstallRoot $repo $GitHubToken
}

if ($SyncReadiness) { Set-ReadinessVariable $repo $GitHubToken $false }
Register-Runner $InstallRoot $repo $GitHubToken $RunnerName $Labels $RunnerMode
$runner = Wait-RunnerOnline $repo $GitHubToken $RunnerName
if ([string]$runner.status -ne 'online') { throw 'Registered runner is not online.' }

Write-Vibe2Status 'VIBE2_ROBLOX_RUNNER_ONLINE' 'YES'
Write-Vibe2Status 'VIBE2_ROBLOX_RUNNER_NAME' $RunnerName
Write-Vibe2Status 'VIBE2_ROBLOX_RUNNER_LABEL' $RequiredLabel
Write-Vibe2Status 'VIBE2_ROBLOX_STUDIO_FOUND' 'YES'
Write-Vibe2Status 'VIBE2_ROBLOX_STUDIO_PATH' $studio
Write-Vibe2Status 'VIBE2_AUTHORITY_EXPANDED' 'NO'

if ($SyncReadiness) { Set-ReadinessVariable $repo $GitHubToken $true }
if ($DispatchLiveSmoke) { Dispatch-LiveSmoke $repo $GitHubToken }
