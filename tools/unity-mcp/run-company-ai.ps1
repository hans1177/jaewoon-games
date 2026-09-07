# 파일명: run-company-ai.ps1
# 역할: 재운컴퍼니 총괄 AI를 로컬에서 자동 실행하고 무료/포함 사용량이 막히면 다음 AI로 순환한다.

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

$providerOrder = @('codex', 'gemini', 'copilot', 'codebuddy')
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
    'upgrade your plan', 'monthly limit', 'daily limit', '429',
    '사용량 한도', '할당량', '크레딧', '결제 필요', '요금제 업그레이드'
)
$authPatterns = @(
    'not logged in', 'login required', 'authentication required', 'unauthorized',
    'sign in', 'please login', 'auth error', '401',
    '로그인 필요', '인증 필요'
)

function Write-CompanyLog([string]$Message) {
    $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Add-Content -Path $logPath -Value $line -Encoding UTF8
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}

function Read-RunnerState {
    if (-not (Test-Path $statePath)) {
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

    try {
        return (Get-Content -Raw -Path $statePath -Encoding UTF8 | ConvertFrom-Json)
    } catch {
        Write-CompanyLog "[WARN] State file reset: $($_.Exception.Message)"
        Remove-Item $statePath -Force -ErrorAction SilentlyContinue
        return Read-RunnerState
    }
}

function Save-RunnerState($State) {
    $json = $State | ConvertTo-Json -Depth 8
    Write-Utf8NoBom -Path $statePath -Text $json
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
        if ($value.IndexOf($pattern, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            return $true
        }
    }
    return $false
}

function Resolve-ProviderCommand([string]$Provider) {
    $names = switch ($Provider) {
        'codex' { @('codex') }
        'gemini' { @('gemini') }
        'copilot' { @('copilot') }
        'codebuddy' { @('codebuddy', 'cbc') }
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
        'gemini' {
            return @('-p', $Prompt, '--output-format', 'json', '--approval-mode', 'auto_edit')
        }
        'copilot' {
            return @(
                '-sp', $Prompt,
                '--agent=director',
                '--no-ask-user',
                '--no-remote',
                '--no-remote-export',
                '--max-ai-credits=60',
                '--allow-all-tools'
            )
        }
        'codebuddy' {
            return @(
                '-p', $Prompt,
                '--output-format', 'json',
                '--permission-mode', 'auto',
                '--max-turns', '12'
            )
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
너는 현재 재운컴퍼니의 총괄 AI다. VS Code에서 사람이 매번 지시하는 방식이 아니라 회사 자동 운영 1회차를 실제로 수행한다.

반드시 먼저 다음 파일을 읽고 그대로 따른다.
- .github/agents/director.agent.md
- COMPANY_FLOW.md
- company-status.json
- AGENTS.md

현재 최우선 프로젝트는 unity-games/daechung-rpg 이며 기존 web-games 는 읽기 전용 참고 자료다.
Unity MCP가 연결되어 있으면 실제 Unity Editor/MCP를 사용해서 씬, GameObject, 컴포넌트, 스크립트, 컴파일/테스트를 직접 처리한다.

운영 규칙:
1. 기획/개발/QA/그래픽/밸런스 중 필요한 역할을 배정하고 한 작업 단위를 끝낸다.
2. 구현 뒤 QA를 반드시 수행하고, 실패하면 같은 작업 단위에서 수정한다.
3. 장르, 핵심 플레이 루프, 스토리 큰 방향, 전투 핵심 모델, 성장 핵심 모델, 플랫폼, 세이브 호환성 파괴, 과금 구조, 유료 AI 사용만 한재운에게 올린다.
4. 위 핵심 결정이 필요하면 추가 구현을 멈추고 최종 응답 첫 줄을 정확히 `OWNER_DECISION_REQUIRED:` 로 시작한 뒤 필요한 결정과 선택지를 짧게 적는다.
5. 그 외 코드 구조, Unity 세부 설정, 카메라 세부, 그래픽, UI, 애니메이션, VFX, QA 수정, 밸런스 수치, 최적화, 빌드 세부는 총괄이 결정하고 계속 진행한다.
6. 유료 API 키, 추가 크레딧 구매, 유료 사용량 확장, 플랜 업그레이드를 절대 하지 않는다. 무료/현재 구독 포함 사용량이 막히면 억지로 우회하지 말고 종료한다.
7. 검증된 작업 단위만 로컬 Git 커밋할 수 있다. 원격 push는 하지 않는다.
8. 진행 근거가 없으면 company-status.json의 진행률을 올리지 않는다.
9. 이번 실행에서는 가장 우선순위 높은 실제 작업 단위 하나를 완성하고 종료한다. 무한 루프를 만들지 않는다.

현재 company-status.json 스냅샷:
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
            Write-CompanyLog "[GUARD] Cleared paid API environment variable for child run: $name"
        }
    }

    try {
        $arguments = Get-ProviderArguments -Provider $Provider -Prompt $Prompt
        Push-Location $repoRoot
        try {
            $lines = & $CommandPath @arguments 2>&1
            $exitCode = $LASTEXITCODE
            $output = ($lines | Out-String).Trim()
        } finally {
            Pop-Location
        }

        return [pscustomobject]@{
            provider = $Provider
            exitCode = [int]$exitCode
            output = $output
        }
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
        $command = Resolve-ProviderCommand -Provider $provider
        if (-not $command) {
            Write-CompanyLog "[SKIP] $provider CLI not installed."
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

# 중복 총괄 프로세스 방지
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
    Write-CompanyLog "[START] Jaewoon Company AI runner. Repo=$repoRoot Project=$resolvedProject"

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
        Write-CompanyLog "[RUN] Director provider=$($provider.name)"
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
            Write-CompanyLog "[ROTATE] $($provider.name) quota/credit limit detected. Next provider index=$($state.currentProviderIndex)"
        } elseif ($authFailed) {
            $blockedUntil = [DateTimeOffset]::Now.AddHours(6).ToString('o')
            Set-MapValue -Object $state.blockedUntil -Name $provider.name -Value $blockedUntil
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
                Write-CompanyLog "[WARN] $($provider.name) failed once. It will get one retry."
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
