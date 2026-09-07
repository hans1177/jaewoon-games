# File: run-company-supervisor.ps1
# Purpose: Keep the local Jaewoon Company synchronized with origin/main and run one bounded AI work unit per cycle.
# Compatibility: Keep this file ASCII-only so Windows PowerShell 5.1 can parse it reliably.

param(
    [string]$ProjectPath = '.\unity-games\daechung-rpg',
    [int]$IntervalMinutes = 10,
    [int]$QuotaRetryHours = 24
)

$ErrorActionPreference = 'Stop'

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$runnerScript = Join-Path $PSScriptRoot 'run-company-ai.ps1'
$supervisorLockPath = Join-Path $repoRoot '.jaewoon-company-supervisor.lock'
$workerStatePath = Join-Path $repoRoot '.jaewoon-company-ai-state.json'
$logPath = Join-Path $env:TEMP 'jaewoon-company-ai.log'
$restartRequested = $false

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
    $syncResult = $null

    if ($baseSha -eq $localSha) {
        $syncResult = Invoke-Git @('merge','--ff-only','origin/main')
        if ($syncResult.exitCode -ne 0) {
            Write-CompanyLog "[SYNC-WARN] Fast-forward failed: $($syncResult.output)"
            return [pscustomobject]@{ changed = $false; restart = $false }
        }
        Write-CompanyLog "[SYNC] Fast-forwarded local main to origin/main $remoteSha"
    } elseif ($baseSha -eq $remoteSha) {
        Write-CompanyLog '[SYNC] Local main is ahead of origin/main. No remote update to apply.'
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

function Test-CoreDecisionStop {
    if (-not (Test-Path $workerStatePath)) { return $false }
    try {
        $state = Get-Content -Raw -Path $workerStatePath -Encoding UTF8 | ConvertFrom-Json
        $reason = [string]$state.stopReason
        return ($reason -eq 'core-decision-pending' -or $reason -eq 'core-decision-required')
    } catch {
        return $false
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

try {
    Write-CompanyLog "[START] Jaewoon Company supervisor. PID=$PID Repo=$repoRoot"
    Write-CompanyLog '[AUTO] origin/main sync is enabled before every bounded company work unit.'

    while ($true) {
        $sync = Sync-Repository
        if ($sync.restart) {
            Write-CompanyLog '[RESTART] Supervisor updated from origin/main. Restarting into the new version.'
            $restartRequested = $true
            break
        }

        Invoke-OneCompanyWorkUnit | Out-Null
        if (Test-CoreDecisionStop) {
            Write-CompanyLog '[STOP] Core owner decision is required. Supervisor will wait for Han Jaewoon.'
            break
        }

        Start-Sleep -Seconds ([Math]::Max(60, $IntervalMinutes * 60))
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
        '-QuotaRetryHours',[string]$QuotaRetryHours
    )
    Start-Process -FilePath $powerShellExe -ArgumentList $arguments -WindowStyle Hidden | Out-Null
}
