# 파일명: tools/runtime/uefn/Vibe2UefnAutoPlayer.ps1
# 역할: 실행 중인 UEFN + Fortnite 플레이테스트 세션에 실제 키 입력을 보내고 런타임 체크포인트를 관측한다.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

function Require-Env([string]$Name) {
    $Value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "Missing environment variable: $Name" }
    return $Value
}

$ScenarioPath = Require-Env 'VIBE2_AUTO_PLAYER_SCENARIO'
$OutputPath = Require-Env 'VIBE2_AUTO_PLAYER_RUNTIME_RESULT'
$Nonce = Require-Env 'VIBE2_AUTO_PLAYER_NONCE'
$RuntimeLog = Require-Env 'VIBE2_UEFN_RUNTIME_LOG'
$Scenario = Get-Content -LiteralPath $ScenarioPath -Raw | ConvertFrom-Json
$Shell = New-Object -ComObject WScript.Shell

$UefnProcess = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match 'UnrealEditorFortnite|UEFN' } | Select-Object -First 1
$FortniteProcess = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match '^FortniteClient' } | Select-Object -First 1
$Errors = [System.Collections.Generic.List[object]]::new()
$Actions = [System.Collections.Generic.List[object]]::new()
$Checkpoints = [System.Collections.Generic.List[object]]::new()
$Started = [Environment]::TickCount64
$FirstInput = $null

$Capabilities = [ordered]@{
    uefnSession = ($null -ne $UefnProcess)
    fortniteClient = ($null -ne $FortniteProcess)
    win32Input = $false
    runtimeObservation = (Test-Path -LiteralPath $RuntimeLog)
}
if (-not $Capabilities.uefnSession) { $Errors.Add([ordered]@{type='session';message='UEFN process not found'}) }
if (-not $Capabilities.fortniteClient) { $Errors.Add([ordered]@{type='session';message='Fortnite client process not found'}) }
if (-not $Capabilities.runtimeObservation) { $Errors.Add([ordered]@{type='observation';message='UEFN runtime log not found'}) }
if ($null -ne $FortniteProcess) { $Capabilities.win32Input = [bool]$Shell.AppActivate($FortniteProcess.Id) }

$KeyMap = @{
    'W'='w'; 'A'='a'; 'S'='s'; 'D'='d'; 'E'='e'; 'F'='f'; 'R'='r';
    'ARROWUP'='{UP}'; 'ARROWDOWN'='{DOWN}'; 'ARROWLEFT'='{LEFT}'; 'ARROWRIGHT'='{RIGHT}';
    'SPACE'=' '; 'ENTER'='{ENTER}'; 'ESCAPE'='{ESC}'
}

function Wait-Checkpoint([string]$Id, [int]$TimeoutMs = 8000) {
    $Needle = "VIBE2_CHECKPOINT|$Id|PASS|"
    $Deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMs)
    do {
        if (Test-Path -LiteralPath $RuntimeLog) {
            $Match = Select-String -LiteralPath $RuntimeLog -SimpleMatch $Needle -ErrorAction SilentlyContinue | Select-Object -Last 1
            if ($null -ne $Match) { return @{ pass=$true; value=$Match.Line } }
        }
        Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $Deadline)
    return @{ pass=$false; value=$null }
}

foreach ($Action in @($Scenario.actions)) {
    $Id = if ($Action.id) { [string]$Action.id } else { 'action' }
    $Type = ([string]$Action.type).ToLowerInvariant()
    $Record = [ordered]@{ id=$Id; type=$Type; dispatched=$false; ok=$false }
    try {
        switch ($Type) {
            'wait' {
                Start-Sleep -Milliseconds ([Math]::Max(0, [int]$Action.ms))
                $Record.ok = $true
            }
            'key' {
                if (-not $Capabilities.win32Input) { throw 'Fortnite window cannot receive input' }
                $KeyName = ([string]($(if ($Action.key) { $Action.key } else { $Action.code }))).ToUpperInvariant()
                if (-not $KeyMap.ContainsKey($KeyName)) { throw "Unsupported UEFN key: $KeyName" }
                if ($null -eq $FirstInput) { $FirstInput = [Environment]::TickCount64 }
                [System.Windows.Forms.SendKeys]::SendWait([string]$KeyMap[$KeyName])
                Start-Sleep -Milliseconds ([Math]::Max(20, [int]$Action.holdMs))
                $Record.dispatched = $true
                $Record.ok = $true
            }
            'expect' {
                $Observed = Wait-Checkpoint -Id $Id
                $Pass = [bool]$Observed.pass
                $Checkpoints.Add([ordered]@{ id=$Id; name=$(if($Action.name){[string]$Action.name}else{$Id}); required=($Action.required -ne $false); pass=$Pass; value=$Observed.value })
                $Record.ok = $Pass
                if (($Action.required -ne $false) -and -not $Pass) { throw "checkpoint failed: $Id" }
            }
            default { throw "Unsupported UEFN AUTO PLAYER action: $Type" }
        }
    } catch {
        $Record.error = $_.Exception.Message
        $Errors.Add([ordered]@{type='action-error';actionId=$Id;message=$_.Exception.Message})
        $Actions.Add($Record)
        if ($Action.required -ne $false) { break }
        continue
    }
    $Actions.Add($Record)
}

$Required = @($Checkpoints | Where-Object { $_.required -ne $false })
$RuntimeVerified = $Capabilities.uefnSession -and $Capabilities.fortniteClient -and $Capabilities.win32Input -and $Capabilities.runtimeObservation -and (@($Actions | Where-Object {$_.dispatched}).Count -gt 0) -and ($Required.Count -gt 0) -and (@($Required | Where-Object {-not $_.pass}).Count -eq 0) -and ($Errors.Count -eq 0)
$Result = [ordered]@{
    version = 1
    engine = 'uefn'
    nonce = $Nonce
    authority = 'vibe2-uefn-fortnite-session-runtime'
    runtimeVerified = [bool]$RuntimeVerified
    capabilities = $Capabilities
    project = [Environment]::GetEnvironmentVariable('VIBE2_UEFN_PROJECT')
    actions = $Actions
    checkpoints = $Checkpoints
    errors = $Errors
    metrics = [ordered]@{
        timeToFirstActionMs = $(if($null -eq $FirstInput){$null}else{[Math]::Max(0,$FirstInput-$Started)})
        durationMs = [Math]::Max(0,[Environment]::TickCount64-$Started)
        consoleErrorCount = 0
    }
}
$Parent = Split-Path -Parent $OutputPath
if ($Parent) { New-Item -ItemType Directory -Force -Path $Parent | Out-Null }
$Result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $OutputPath -Encoding utf8
if (-not $RuntimeVerified) { Write-Warning 'UEFN AUTO PLAYER runtime evidence did not verify.' }
