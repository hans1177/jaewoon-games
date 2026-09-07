# File: run-company-supervisor.ps1
# Purpose: Keep Jaewoon Company synchronized, prioritize owner directives, and publish verified local work automatically.
# Compatibility: Keep this file ASCII-only so Windows PowerShell 5.1 can parse it reliably.

param(
    [string]$ProjectPath = '.\unity-games\daechung-rpg',
    [int]$IntervalMinutes = 10,
    [int]$QuotaRetryHours = 24,
    [int]$SyncIntervalSeconds = 30,
    [int]$UrgentRetrySeconds = 5
)

$ErrorActionPreference = 'Stop'

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$runnerScript = Join-Path $PSScriptRoot 'run-company-ai.ps1'
$supervisorLockPath = Join-Path $repoRoot '.jaewoon-company-supervisor.lock'
$workerStatePath = Join-Path $repoRoot '.jaewoon-company-ai-state.json'
$directivePath = Join-Path $repoRoot 'company-directive.json'
$statusPath = Join-Path $repoRoot 'company-status.json'
$logPath = Join-Path $env:TEMP 'jaewoon-company-ai.log'
$restartRequested = $false
$waitingForCoreDecision = $false

function Write-CompanyLog([string]$Message) {
    $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Add-Content -Path $logPath -Value $line -Encoding UTF8
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}

function Get-CurrentPowerShellExe {
    try {
        $process = Get-Process -Id $PID -ErrorAction Stop
        if ($process.Path) { return $process.Path }
    } catch {}
    $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
    if ($pwsh) { return $pwsh.Source }
    $powershell = Get-Command powershell.exe -ErrorAction SilentlyContinue
    if ($powershell) { return $powershell.Source }
    throw 'PowerShell executable could not be resolved.'
}

function Resolve-Git {
    $git = Get-Command git.exe -ErrorAction SilentlyContinue
    if (-not $git) { $git = Get-Command git -ErrorAction SilentlyContinue }
    if ($git) { return $git.Source }
    return $null
}

function Invoke-External([string]$FilePath, [string[]]$Arguments) {
    $token = [guid]::NewGuid().ToString('N')
    $outPath = Join-Path $env:TEMP ("jaewoon-ext-$token.out")
    $errPath = Join-Path $env:TEMP ("jaewoon-ext-$token.err")
    try {
        $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $repoRoot -NoNewWindow -Wait -PassThru `
            -RedirectStandardOutput $outPath -RedirectStandardError $errPath
        $stdout = if (Test-Path $outPath) { (Get-Content -Raw -Path $outPath -ErrorAction SilentlyContinue) } else { '' }
        $stderr = if (Test-Path $errPath) { (Get-Content -Raw -Path $errPath -ErrorAction SilentlyContinue) } else { '' }
        return [pscustomobject]@{
            exitCode = [int]$process.ExitCode
            output = (([string]$stdout) + ([string]$stderr)).Trim()
        }
    } catch {
        return [pscustomobject]@{ exitCode = 1; output = $_.Exception.ToString() }
    } finally {
        Remove-Item $outPath,$errPath -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-Git([string[]]$Arguments) {
    $git = Resolve-Git
    if (-not $git) {
        return [pscustomobject]@{ exitCode = 127; output = 'git is not installed.' }
    }
    return Invoke-External -FilePath $git -Arguments $Arguments
}

function Get-FileSha256([string]$Path) {
    if (-not (Test-Path $Path)) { return '' }
    try { return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash } catch { return '' }
}

function Get-JsonProperty($Object, [string]$Name, $Default = $null) {
    if ($null -eq $Object) { return $Default }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $Default }
    return $property.Value
}

function Get-DirectiveRevision {
    if (-not (Test-Path $directivePath)) { return 0 }
    try {
        $directive = Get-Content -Raw -Path $directivePath -Encoding UTF8 | ConvertFrom-Json
        return [int](Get-JsonProperty -Object $directive -Name 'revision' -Default 0)
    } catch {
        Write-CompanyLog "[DIRECTIVE-WARN] Could not read company-directive.json: $($_.Exception.Message)"
        return 0
    }
}

function Get-CompletedDirectiveRevision {
    if (-not (Test-Path $workerStatePath)) { return 0 }
    try {
        $state = Get-Content -Raw -Path $workerStatePath -Encoding UTF8 | ConvertFrom-Json
        return [int](Get-JsonProperty -Object $state -Name 'lastCompletedDirectiveRevision' -Default 0)
    } catch {
        return 0
    }
}

function Get-WorkerStopReason {
    if (-not (Test-Path $workerStatePath)) { return '' }
    try {
        $state = Get-Content -Raw -Path $workerStatePath -Encoding UTF8 | ConvertFrom-Json
        return [string](Get-JsonProperty -Object $state -Name 'stopReason' -Default '')
    } catch {
        return ''
    }
}

function Test-CoreDecisionPending {
    if (-not (Test-Path $statusPath)) { return $false }
    try {
        $status = Get-Content -Raw -Path $statusPath -Encoding UTF8 | ConvertFrom-Json
        $summary = Get-JsonProperty -Object $status -Name 'summary' -Default $null
        $pending = [int](Get-JsonProperty -Object $summary -Name 'pendingApprovals' -Default 0)
        return ($pending -gt 0)
    } catch {
        return $false
    }
}

function Sync-Repository {
    $beforeSupervisorHash = Get-FileSha256 -Path $PSCommandPath
    $status = Invoke-Git @('status','--porcelain')
    if ($status.exitCode -ne 0) {
        Write-CompanyLog "[SYNC-WARN] git status failed: $($status.output)"
        return [pscustomobject]@{ changed = $false; restart = $false }
    }
    if ($status.output) {
        Write-CompanyLog '[SYNC-SKIP] Working tree has uncommitted changes. Remote sync deferred to protect local work.'
        return [pscustomobject]@{ changed = $false; restart = $false }
    }

    $branch = Invoke-Git @('rev-parse','--abbrev-ref','HEAD')
    if ($branch.exitCode -ne 0 -or $branch.output.Trim() -ne 'main') {
        Write-CompanyLog "[SYNC-SKIP] Auto sync only runs on local main branch. Current=$($branch.output.Trim())"
        return [pscustomobject]@{ changed = $false; restart = $false }
    }

    $fetch = Invoke-Git @('fetch','--quiet','origin','main')
    if ($fetch.exitCode -ne 0) {
        Write-CompanyLog "[SYNC-WARN] git fetch failed: $($fetch.output)"
        return [pscustomobject]@{ changed = $false; restart = $false }
    }

    $head = Invoke-Git @('rev-parse','HEAD')
    $remote = Invoke-Git @('rev-parse','origin/main')
    if ($head.exitCode -ne 0 -or $remote.exitCode -ne 0) {
        Write-CompanyLog '[SYNC-WARN] Could not compare local main with origin/main.'
        return [pscustomobject]@{ changed = $false; restart = $false }
    }
    $localSha = $head.output.Trim()
    $remoteSha = $remote.output.Trim()
    if ($localSha -eq $remoteSha) {
        return [pscustomobject]@{ changed = $false; restart = $false }
    }

    $base = Invoke-Git @('merge-base','HEAD','origin/main')
    if ($base.exitCode -ne 0) {
        Write-CompanyLog '[SYNC-WARN] Could not calculate merge base.'
        return [pscustomobject]@{ changed = $false; restart = $false }
    }
    $baseSha = $base.output.Trim()

    if ($baseSha -eq $localSha) {
        $syncResult = Invoke-Git @('merge','--ff-only','origin/main')
        if ($syncResult.exitCode -ne 0) {
            Write-CompanyLog "[SYNC-WARN] Fast-forward failed: $($syncResult.output)"
            return [pscustomobject]@{ changed = $false; restart = $false }
        }
        Write-CompanyLog "[SYNC] Fast-forwarded local main to origin/main $remoteSha"
    } elseif ($baseSha -eq $remoteSha) {
        return [pscustomobject]@{ changed = $false; restart = $false }
    } else {
        $syncResult = Invoke-Git @('rebase','origin/main')
        if ($syncResult.exitCode -ne 0) {
            Invoke-Git @('rebase','--abort') | Out-Null
            Write-CompanyLog '[SYNC-WARN] Local and remote commits conflict. Rebase was aborted; no local work was discarded.'
            return [pscustomobject]@{ changed = $false; restart = $false }
        }
        Write-CompanyLog "[SYNC] Rebased local verified commits onto origin/main $remoteSha"
    }

    $afterSupervisorHash = Get-FileSha256 -Path $PSCommandPath
    $needsRestart = ($beforeSupervisorHash -and $afterSupervisorHash -and $beforeSupervisorHash -ne $afterSupervisorHash)
    return [pscustomobject]@{ changed = $true; restart = $needsRestart }
}

function Publish-VerifiedLocalCommits {
    $status = Invoke-Git @('status','--porcelain')
    if ($status.exitCode -ne 0 -or $status.output) {
        if ($status.output) { Write-CompanyLog '[PUBLISH-SKIP] Working tree is not clean; nothing is auto-pushed.' }
        return $false
    }

    $fetch = Invoke-Git @('fetch','--quiet','origin','main')
    if ($fetch.exitCode -ne 0) {
        Write-CompanyLog "[PUBLISH-WARN] git fetch failed before push: $($fetch.output)"
        return $false
    }

    $head = Invoke-Git @('rev-parse','HEAD')
    $remote = Invoke-Git @('rev-parse','origin/main')
    if ($head.exitCode -ne 0 -or $remote.exitCode -ne 0) { return $false }
    if ($head.output.Trim() -eq $remote.output.Trim()) { return $true }

    $base = Invoke-Git @('merge-base','HEAD','origin/main')
    if ($base.exitCode -ne 0) { return $false }
    $baseSha = $base.output.Trim()
    $localSha = $head.output.Trim()
    $remoteSha = $remote.output.Trim()

    if ($baseSha -eq $localSha) {
        Write-CompanyLog '[PUBLISH-SKIP] Remote main advanced; the next sync cycle will apply it before publishing.'
        return $false
    }

    if ($baseSha -ne $remoteSha) {
        $rebase = Invoke-Git @('rebase','origin/main')
        if ($rebase.exitCode -ne 0) {
            Invoke-Git @('rebase','--abort') | Out-Null
            Write-CompanyLog '[PUBLISH-WARN] Rebase before push conflicted. Local verified commits were preserved and not pushed.'
            return $false
        }
    }

    $push = Invoke-Git @('push','origin','HEAD:main')
    if ($push.exitCode -ne 0) {
        Write-CompanyLog "[PUBLISH-WARN] Verified local commits could not be pushed: $($push.output)"
        return $false
    }
    Write-CompanyLog '[PUBLISH] Verified local company commits pushed to origin/main.'
    return $true
}

function Invoke-OneCompanyWorkUnit {
    if (-not (Test-Path $runnerScript)) {
        Write-CompanyLog "[WORKER-FAIL] Runner script missing: $runnerScript"
        return 1
    }

    $powerShellExe = Get-CurrentPowerShellExe
    $outPath = Join-Path $env:TEMP 'jaewoon-company-worker.out.log'
    $errPath = Join-Path $env:TEMP 'jaewoon-company-worker.err.log'
    Remove-Item $outPath,$errPath -Force -ErrorAction SilentlyContinue
    $arguments = @(
        '-NoProfile',
        '-ExecutionPolicy','Bypass',
        '-File',"`"$runnerScript`"",
        '-ProjectPath',"`"$ProjectPath`"",
        '-IntervalMinutes',[string]$IntervalMinutes,
        '-QuotaRetryHours',[string]$QuotaRetryHours,
        '-Once'
    )

    try {
        $process = Start-Process -FilePath $powerShellExe -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru `
            -RedirectStandardOutput $outPath -RedirectStandardError $errPath
        if ($process.ExitCode -ne 0) {
            $err = if (Test-Path $errPath) { (Get-Content -Raw -Path $errPath -ErrorAction SilentlyContinue) } else { '' }
            Write-CompanyLog "[WORKER-WARN] Company worker exit=$($process.ExitCode) $(([string]$err).Trim())"
        }
        return [int]$process.ExitCode
    } catch {
        Write-CompanyLog "[WORKER-FAIL] $($_.Exception.Message)"
        return 1
    }
}

if (Test-Path $supervisorLockPath) {
    try {
        $existingPid = [int](Get-Content -Raw -Path $supervisorLockPath -Encoding UTF8).Trim()
        if ($existingPid -gt 0 -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
            Write-CompanyLog "[PASS] Company supervisor already active. PID=$existingPid"
            exit 0
        }
    } catch {}
    Remove-Item $supervisorLockPath -Force -ErrorAction SilentlyContinue
}
Write-Utf8NoBom -Path $supervisorLockPath -Text ([string]$PID)

$nextAutonomousAt = [DateTimeOffset]::Now

try {
    Write-CompanyLog "[START] Jaewoon Company supervisor. PID=$PID Repo=$repoRoot"
    Write-CompanyLog "[AUTO] Remote sync every $SyncIntervalSeconds seconds; pending owner directives bypass the normal work interval."
    Write-CompanyLog '[AUTO] Verified clean local commits are published to origin/main automatically.'

    while ($true) {
        $sync = Sync-Repository
        if ($sync.restart) {
            Write-CompanyLog '[RESTART] Supervisor updated from origin/main. Restarting into the new version.'
            $restartRequested = $true
            break
        }

        if (Test-CoreDecisionPending) {
            if (-not $waitingForCoreDecision) {
                Write-CompanyLog '[WAIT] Core owner decision is pending. Supervisor remains alive and keeps syncing for the response.'
                $waitingForCoreDecision = $true
            }
            Start-Sleep -Seconds ([Math]::Max(10, $SyncIntervalSeconds))
            continue
        }
        if ($waitingForCoreDecision) {
            Write-CompanyLog '[RESUME] Core decision cleared. Automatic work resumed.'
            $waitingForCoreDecision = $false
            $nextAutonomousAt = [DateTimeOffset]::Now
        }

        $directiveRevision = Get-DirectiveRevision
        $completedDirectiveRevision = Get-CompletedDirectiveRevision
        $directivePending = ($directiveRevision -gt $completedDirectiveRevision)
        $now = [DateTimeOffset]::Now
        $autonomousDue = ($now -ge $nextAutonomousAt)

        if ($directivePending -or $autonomousDue) {
            if ($directivePending) {
                Write-CompanyLog "[DIRECTIVE] Revision $directiveRevision is pending. Running immediately ahead of autonomous plan."
            }

            Invoke-OneCompanyWorkUnit | Out-Null
            $stopReason = Get-WorkerStopReason

            if ($stopReason -eq 'core-decision-pending' -or $stopReason -eq 'core-decision-required') {
                Write-CompanyLog '[WAIT] Worker reached a protected core decision. Supervisor stays alive for a synced owner response.'
                $waitingForCoreDecision = $true
                Start-Sleep -Seconds ([Math]::Max(10, $SyncIntervalSeconds))
                continue
            }

            if (-not $stopReason) {
                Publish-VerifiedLocalCommits | Out-Null
            }

            $nextAutonomousAt = [DateTimeOffset]::Now.AddMinutes([Math]::Max(1, $IntervalMinutes))
            $directiveStillPending = ((Get-DirectiveRevision) -gt (Get-CompletedDirectiveRevision))
            if ($directiveStillPending) {
                if ($stopReason -eq 'no-runnable-free-provider') {
                    Start-Sleep -Seconds ([Math]::Max(60, $SyncIntervalSeconds))
                } else {
                    Start-Sleep -Seconds ([Math]::Max(2, $UrgentRetrySeconds))
                }
                continue
            }
        }

        Start-Sleep -Seconds ([Math]::Max(10, $SyncIntervalSeconds))
    }
} finally {
    if (Test-Path $supervisorLockPath) {
        try {
            $lockPid = [int](Get-Content -Raw -Path $supervisorLockPath -Encoding UTF8).Trim()
            if ($lockPid -eq $PID) { Remove-Item $supervisorLockPath -Force -ErrorAction SilentlyContinue }
        } catch {}
    }
    Write-CompanyLog '[END] Jaewoon Company supervisor stopped.'
}

if ($restartRequested) {
    $powerShellExe = Get-CurrentPowerShellExe
    $arguments = @(
        '-NoProfile',
        '-ExecutionPolicy','Bypass',
        '-File',"`"$PSCommandPath`"",
        '-ProjectPath',"`"$ProjectPath`"",
        '-IntervalMinutes',[string]$IntervalMinutes,
        '-QuotaRetryHours',[string]$QuotaRetryHours,
        '-SyncIntervalSeconds',[string]$SyncIntervalSeconds,
        '-UrgentRetrySeconds',[string]$UrgentRetrySeconds
    )
    Start-Process -FilePath $powerShellExe -ArgumentList $arguments -WindowStyle Hidden | Out-Null
}
