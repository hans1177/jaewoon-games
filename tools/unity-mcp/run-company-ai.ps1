# File: run-company-ai.ps1
# Purpose: Run the Jaewoon Company director locally and rotate among available included/free CLI providers.
# Compatibility: Keep this file ASCII-only so Windows PowerShell 5.1 can parse it without a UTF-8 BOM.

param(
    [string]$ProjectPath = '.\unity-games\daechung-rpg',
    [int]$IntervalMinutes = 10,
    [int]$QuotaRetryHours = 24,
    [switch]$Once
)

$ErrorActionPreference = 'Stop'

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$resolvedProject = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ProjectPath))
$statePath = Join-Path $repoRoot '.jaewoon-company-ai-state.json'
$lockPath = Join-Path $repoRoot '.jaewoon-company-ai.lock'
$ownerDecisionPath = Join-Path $repoRoot '.jaewoon-owner-decision.txt'
$logPath = Join-Path $env:TEMP 'jaewoon-company-ai.log'

# Gemini CLI stopped serving individual/free accounts in June 2026.
# Antigravity CLI is the current Google individual/free terminal path.
# Copilot is last and disabled by default because its CLI credit cap is not an included-only billing guard.
$providerOrder = @('codex', 'antigravity', 'codebuddy', 'copilot')
$copilotHardStopEnvironmentName = 'JAEWOON_COPILOT_HARD_STOP_CONFIRMED'

$paidApiEnvironmentNames = @(
    'OPENAI_API_KEY',
    'AZURE_OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'ANTHROPIC_API_KEY',
    'CODEBUDDY_API_KEY'
)

$quotaPatterns = @(
    'quota', 'usage limit', 'rate limit', 'resource exhausted', 'credits exhausted',
    'credit limit', 'billing limit', 'payment required', 'buy credits', 'purchase credits',
    'upgrade your plan', 'monthly limit', 'daily limit', 'weekly limit', '429'
)
$authPatterns = @(
    'not logged in', 'login required', 'authentication required', 'unauthorized',
    'sign in', 'please login', 'auth error', '401'
)

function Write-CompanyLog([string]$Message) {
    $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Add-Content -Path $logPath -Value $line -Encoding UTF8
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}

function New-RunnerState {
    return [pscustomobject]@{
        version = 1
        currentProviderIndex = 0
        lastProvider = $null
        lastRunAt = $null
        lastExitCode = $null
        stopReason = $null
        blockedUntil = [pscustomobject]@{}
        consecutiveFailures = [pscustomobject]@{}
    }
}

function Read-RunnerState {
    if (-not (Test-Path $statePath)) { return New-RunnerState }
    try {
        return (Get-Content -Raw -Path $statePath -Encoding UTF8 | ConvertFrom-Json)
    } catch {
        Write-CompanyLog "[WARN] State file reset: $($_.Exception.Message)"
        Remove-Item $statePath -Force -ErrorAction SilentlyContinue
        return New-RunnerState
    }
}

function Save-RunnerState($State) {
    Write-Utf8NoBom -Path $statePath -Text ($State | ConvertTo-Json -Depth 8)
}

function Get-PropertyValue($Object, [string]$Name, $Default = $null) {
    if ($null -eq $Object) { return $Default }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $Default }
    return $property.Value
}

function Set-MapValue($Object, [string]$Name, $Value) {
    if ($null -eq $Object.PSObject.Properties[$Name]) {
        $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    } else {
        $Object.PSObject.Properties[$Name].Value = $Value
    }
}

function Test-TextContainsAny([string]$Text, [string[]]$Patterns) {
    $value = [string]$Text
    foreach ($pattern in $Patterns) {
        if ($value.IndexOf($pattern, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return $true }
    }
    return $false
}

function Test-CopilotHardStopConfirmed {
    return ([Environment]::GetEnvironmentVariable($copilotHardStopEnvironmentName, 'User') -eq '1' -or
            [Environment]::GetEnvironmentVariable($copilotHardStopEnvironmentName, 'Process') -eq '1')
}

function Resolve-ProviderCommand([string]$Provider) {
    $names = switch ($Provider) {
        'codex' { @('codex') }
        'antigravity' { @('agy', 'antigravity') }
        'codebuddy' { @('codebuddy', 'cbc') }
        'copilot' { @('copilot') }
        default { @() }
    }
    foreach ($name in $names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }
    return $null
}

function Get-ProviderArguments([string]$Provider, [string]$Prompt) {
    switch ($Provider) {
        'codex' {
            return @('exec', '--full-auto', $Prompt)
        }
        'antigravity' {
            return @('-p', $Prompt, '--output-format', 'json', '--print-timeout', '10m', '--dangerously-skip-permissions')
        }
        'codebuddy' {
            return @('-p', $Prompt, '--output-format', 'json', '--permission-mode', 'auto', '--max-turns', '12')
        }
        'copilot' {
            # This is only reachable after the user confirms an account-level hard stop for paid overage.
            return @('-sp', $Prompt, '--agent=director', '--no-ask-user', '--no-remote', '--no-remote-export', '--max-ai-credits=60', '--allow-all-tools')
        }
        default {
            throw "Unsupported provider: $Provider"
        }
    }
}

function Build-DirectorPrompt {
    $status = ''
    $statusPath = Join-Path $repoRoot 'company-status.json'
    if (Test-Path $statusPath) {
        $status = Get-Content -Raw -Path $statusPath -Encoding UTF8
    }

    return @"
You are the active director AI for Jaewoon Company. Perform one real autonomous company work unit. Do not wait for a person to open VS Code or repeat instructions.

Read and follow these files first:
- .github/agents/director.agent.md
- COMPANY_FLOW.md
- company-status.json
- AGENTS.md

Priority project: unity-games/daechung-rpg
The web-games directory is read-only reference material.
If Unity MCP is available, use the real Unity Editor/MCP for scenes, GameObjects, components, scripts, compilation, tests, and verification.

Operating rules:
1. Assign planning, development, QA, graphics, and balance roles as needed for the highest-priority work unit.
2. QA is mandatory after implementation. Fix failures in the same work unit when possible.
3. Ask Han Jaewoon only for core decisions: genre, core loop, major story direction, core combat model, core progression model, platform, save-breaking changes, monetization, or paid AI use.
4. If a core decision is required, stop further implementation and make the first line of your final output exactly: OWNER_DECISION_REQUIRED:
5. All other implementation, Unity configuration, camera details, graphics, UI, animation, VFX, QA fixes, balance values, optimization, and build details are delegated to the director.
6. Never buy credits, enable paid API usage, upgrade a plan, or work around an included/free usage limit. If included/free usage is blocked, terminate normally so the local runner can rotate providers.
7. Only commit a verified local work unit. Do not push remotely.
8. Do not raise company-status progress without evidence.
9. Complete one highest-priority work unit and exit. Do not create an infinite loop inside the provider session.

Current company-status.json snapshot:
$status
"@
}

function Invoke-Provider([string]$Provider, [string]$CommandPath, [string]$Prompt) {
    $savedEnvironment = @{}
    foreach ($name in $paidApiEnvironmentNames) {
        $item = Get-Item "Env:$name" -ErrorAction SilentlyContinue
        if ($item) {
            $savedEnvironment[$name] = $item.Value
            Remove-Item "Env:$name" -ErrorAction SilentlyContinue
            Write-CompanyLog "[GUARD] Removed paid API environment variable from child process: $name"
        }
    }

    try {
        $arguments = Get-ProviderArguments -Provider $Provider -Prompt $Prompt
        Push-Location $repoRoot
        try {
            $lines = & $CommandPath @arguments 2>&1
            $exitCode = $LASTEXITCODE
            if ($null -eq $exitCode) { $exitCode = 0 }
            $output = ($lines | Out-String).Trim()
        } finally {
            Pop-Location
        }
        return [pscustomobject]@{ provider = $Provider; exitCode = [int]$exitCode; output = $output }
    } catch {
        return [pscustomobject]@{ provider = $Provider; exitCode = 1; output = $_.Exception.ToString() }
    } finally {
        foreach ($entry in $savedEnvironment.GetEnumerator()) {
            Set-Item "Env:$($entry.Key)" $entry.Value
        }
    }
}

function Test-CoreDecisionPending {
    $statusPath = Join-Path $repoRoot 'company-status.json'
    if (-not (Test-Path $statusPath)) { return $false }
    try {
        $status = Get-Content -Raw -Path $statusPath -Encoding UTF8 | ConvertFrom-Json
        $pending = Get-PropertyValue -Object $status.summary -Name 'pendingApprovals' -Default 0
        return ([int]$pending -gt 0)
    } catch {
        Write-CompanyLog "[WARN] Could not read company-status.json: $($_.Exception.Message)"
        return $false
    }
}

function Get-NextRunnableProvider($State) {
    $count = $providerOrder.Count
    for ($offset = 0; $offset -lt $count; $offset++) {
        $index = ([int]$State.currentProviderIndex + $offset) % $count
        $provider = $providerOrder[$index]

        if ($provider -eq 'copilot' -and -not (Test-CopilotHardStopConfirmed)) {
            Write-CompanyLog '[SKIP] copilot disabled: account-level paid-overage hard stop is not confirmed.'
            continue
        }

        $command = Resolve-ProviderCommand -Provider $provider
        if (-not $command) {
            Write-CompanyLog "[SKIP] $provider CLI is not installed."
            continue
        }

        $blockedText = Get-PropertyValue -Object $State.blockedUntil -Name $provider -Default $null
        if ($blockedText) {
            try {
                $blockedUntil = [DateTimeOffset]::Parse([string]$blockedText)
                if ($blockedUntil -gt [DateTimeOffset]::Now) {
                    Write-CompanyLog "[SKIP] $provider blocked until $blockedUntil"
                    continue
                }
            } catch {
                Set-MapValue -Object $State.blockedUntil -Name $provider -Value $null
            }
        }

        $State.currentProviderIndex = $index
        return [pscustomobject]@{ name = $provider; command = $command; index = $index }
    }
    return $null
}

if (-not (Test-Path $resolvedProject)) {
    throw "Unity project not found: $resolvedProject"
}

# Prevent duplicate directors.
if (Test-Path $lockPath) {
    try {
        $existingPid = [int](Get-Content -Raw -Path $lockPath -Encoding UTF8).Trim()
        if ($existingPid -gt 0 -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
            Write-CompanyLog "[PASS] Company AI runner already active. PID=$existingPid"
            exit 0
        }
    } catch {}
    Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
}
Write-Utf8NoBom -Path $lockPath -Text ([string]$PID)

try {
    Write-CompanyLog "[START] Jaewoon Company AI runner. PID=$PID Repo=$repoRoot Project=$resolvedProject"

    while ($true) {
        $state = Read-RunnerState
        $state.stopReason = $null

        if (Test-CoreDecisionPending) {
            $state.stopReason = 'core-decision-pending'
            Save-RunnerState $state
            Write-CompanyLog '[STOP] Core decision is pending for Han Jaewoon.'
            break
        }

        $provider = Get-NextRunnableProvider -State $state
        if (-not $provider) {
            $state.stopReason = 'no-runnable-free-provider'
            Save-RunnerState $state
            Write-CompanyLog '[WAIT] No runnable provider. Retrying after interval.'
            if ($Once) { break }
            Start-Sleep -Seconds ([Math]::Max(60, $IntervalMinutes * 60))
            continue
        }

        $prompt = Build-DirectorPrompt
        Write-CompanyLog "[RUN] Director provider=$($provider.name) command=$($provider.command)"
        $result = Invoke-Provider -Provider $provider.name -CommandPath $provider.command -Prompt $prompt

        $state.lastProvider = $provider.name
        $state.lastRunAt = [DateTimeOffset]::Now.ToString('o')
        $state.lastExitCode = $result.exitCode

        $output = [string]$result.output
        if ($output) {
            $preview = $output
            if ($preview.Length -gt 1200) { $preview = $preview.Substring(0, 1200) + ' ...' }
            Write-CompanyLog "[OUTPUT][$($provider.name)] $preview"
        }

        if (Test-TextContainsAny -Text $output -Patterns @('OWNER_DECISION_REQUIRED:')) {
            Write-Utf8NoBom -Path $ownerDecisionPath -Text $output
            $state.stopReason = 'core-decision-required'
            Save-RunnerState $state
            Write-CompanyLog '[STOP] Provider requested a core decision from Han Jaewoon.'
            break
        }

        $quotaHit = Test-TextContainsAny -Text $output -Patterns $quotaPatterns
        $authFailed = Test-TextContainsAny -Text $output -Patterns $authPatterns

        if ($quotaHit) {
            $blockedUntil = [DateTimeOffset]::Now.AddHours([Math]::Max(1, $QuotaRetryHours)).ToString('o')
            Set-MapValue -Object $state.blockedUntil -Name $provider.name -Value $blockedUntil
            Set-MapValue -Object $state.consecutiveFailures -Name $provider.name -Value 0
            $state.currentProviderIndex = ($provider.index + 1) % $providerOrder.Count
            $state.stopReason = "quota-rotate:$($provider.name)"
            Write-CompanyLog "[ROTATE] $($provider.name) quota or credit limit detected."
        } elseif ($authFailed) {
            Set-MapValue -Object $state.blockedUntil -Name $provider.name -Value ([DateTimeOffset]::Now.AddHours(6).ToString('o'))
            $state.currentProviderIndex = ($provider.index + 1) % $providerOrder.Count
            $state.stopReason = "auth-rotate:$($provider.name)"
            Write-CompanyLog "[ROTATE] $($provider.name) authentication unavailable."
        } elseif ($result.exitCode -ne 0) {
            $failures = [int](Get-PropertyValue -Object $state.consecutiveFailures -Name $provider.name -Default 0) + 1
            Set-MapValue -Object $state.consecutiveFailures -Name $provider.name -Value $failures
            if ($failures -ge 2) {
                $state.currentProviderIndex = ($provider.index + 1) % $providerOrder.Count
                Set-MapValue -Object $state.blockedUntil -Name $provider.name -Value ([DateTimeOffset]::Now.AddHours(1).ToString('o'))
                Write-CompanyLog "[ROTATE] $($provider.name) failed twice. Moving to next provider."
            } else {
                Write-CompanyLog "[WARN] $($provider.name) failed once. One retry remains."
            }
            $state.stopReason = "provider-error:$($provider.name)"
        } else {
            Set-MapValue -Object $state.consecutiveFailures -Name $provider.name -Value 0
            Set-MapValue -Object $state.blockedUntil -Name $provider.name -Value $null
            $state.stopReason = $null
            Write-CompanyLog "[PASS] $($provider.name) completed one company work unit."
        }

        Save-RunnerState $state
        if ($Once) { break }
        Start-Sleep -Seconds ([Math]::Max(60, $IntervalMinutes * 60))
    }
} finally {
    if (Test-Path $lockPath) {
        try {
            $lockPid = [int](Get-Content -Raw -Path $lockPath -Encoding UTF8).Trim()
            if ($lockPid -eq $PID) { Remove-Item $lockPath -Force -ErrorAction SilentlyContinue }
        } catch {}
    }
    Write-CompanyLog '[END] Jaewoon Company AI runner stopped.'
}
