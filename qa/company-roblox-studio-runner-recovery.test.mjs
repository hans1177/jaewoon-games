import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/company-roblox-runner-pwsh-bootstrap.yml',import.meta.url),'utf8');
const canonical=fs.readFileSync(new URL('../tools/connect-roblox-studio-mcp-free-windows.ps1',import.meta.url),'utf8');

test('Unity recovery discovers the registered per-user Studio runner, not a hardcoded obsolete name',()=>{
  const recover=workflow.slice(workflow.indexOf('  recover-via-unity:'),workflow.indexOf('\n  bootstrap:'));
  assert.match(recover,/\$expectedRunnerName = 'roblox-studio-' \+ \$env:COMPUTERNAME/);
  assert.match(canonical,/--name \('roblox-studio-' \+ \$env:COMPUTERNAME\)/);
  assert.match(recover,/JaewoonRobloxStudioRunner/);
  assert.match(recover,/JaewoonRobloxStudioRunner2/);
  assert.match(recover,/\.credentials/);
  assert.match(recover,/\[string\]\$metadata\.gitHubUrl -eq 'https:\/\/github\.com\/hans1177\/jaewoon-games'/);
  assert.doesNotMatch(recover,/\$expectedRunnerName = 'roblox-studio-local'/);
});

test('Studio runner recovery only starts existing authenticated runner on interactive matching Windows user',()=>{
  const recover=workflow.slice(workflow.indexOf('  recover-via-unity:'),workflow.indexOf('\n  bootstrap:'));
  assert.match(recover,/\$hostSessionId = \[int\]\(Get-Process -Id \$PID\)\.SessionId/);
  assert.match(recover,/if \(\$hostSessionId -le 0\) \{/);
  assert.match(recover,/ROBLOX_RUNNER_RECOVERY=BLOCKED_SERVICE_SESSION_NO_INTERACTIVE_DESKTOP/);
  assert.match(recover,/ROBLOX_RUNNER_RECOVERY=BLOCKED_DIFFERENT_WINDOWS_USER/);
  assert.match(recover,/ROBLOX_RUNNER_RECOVERY=EXISTING_LISTENER_WRONG_SESSION_PRESERVED/);
  assert.match(recover,/Start-Process -FilePath \$env:ComSpec -ArgumentList @\('\/d','\/c','run\.cmd'\)/);
  assert.match(recover,/ROBLOX_RUNNER_RECOVERY=INTERACTIVE_LOGON_LISTENER_RUNNING/);
  assert.doesNotMatch(recover,/config\.cmd|Read-Host|--token|New-ScheduledTask/);
});

test('recovery preserves unrelated Windows services and login boundaries without false Studio PASS',()=>{
  const bootstrap=workflow.slice(workflow.indexOf('\n  bootstrap:'));
  assert.match(bootstrap,/ROBLOX_RUNNER_STARTUP=BLOCKED_SERVICE_SESSION_PRESERVE_EXISTING_USER_LOGON_SHORTCUT/);
  assert.match(bootstrap,/ROBLOX_RUNNER_STARTUP=BLOCKED_DIFFERENT_WINDOWS_USER/);
  assert.match(workflow,/ROBLOX_RUNNER_PATH_DISCOVERY=AUTO_METADATA/);
  assert.doesNotMatch(workflow,/STUDIO_ACTUAL_PLAY=PASS|ROBLOX_STUDIO_MCP_PLAY_PASS=YES/);
});

test('authenticated Windows Studio runner stays online for Studio launch and reconnects on exit',()=>{
  assert.match(canonical,/while \(\$true\) \{/);
  assert.match(canonical,/ROBLOX_FREE_STUDIO_RUNNER_AVAILABLE_WITHOUT_STUDIO=WAIT_FOR_GITHUB_JOB_LAUNCH/);
  assert.match(canonical,/ROBLOX_FREE_STUDIO_APP_READY=OFFICIAL_STUDIO_INTERACTIVE_SESSION/);
  assert.doesNotMatch(canonical,/ROBLOX_FREE_STUDIO_RUNNER_PAUSED=/);
  assert.match(canonical,/Get-AuthenticodeSignature -FilePath \$activeStudioExe/);
  assert.match(canonical,/\$restartDelaySeconds = \[Math\]::Min\(60, \$restartDelaySeconds \* 2\)/);
  assert.match(canonical,/\$runnerExit = \[int\]\$LASTEXITCODE/);
  assert.match(canonical,/if \(\$CheckOnly\) \{/);
  assert.doesNotMatch(canonical,/New-Service|Register-ScheduledTask|--token \$env:/);
  const bootstrap=workflow.slice(workflow.indexOf('\n  bootstrap:'));
  assert.match(bootstrap,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  const recover=workflow.slice(workflow.indexOf('  recover-via-unity:'),workflow.indexOf('\n  bootstrap:'));
  assert.match(recover,/runs-on: \[self-hosted, Windows, X64, jaewoon-unity\]/);
  assert.match(bootstrap,/WScript\.Sleep 15000/);
  assert.match(bootstrap,/shell\.Run "cmd\.exe \/d \/c run\.cmd", 0, False/);
  assert.match(bootstrap,/ROBLOX_RUNNER_WATCHDOG=ACTIVE_SAME_INTERACTIVE_SESSION/);
  assert.match(bootstrap,/ROBLOX_RUNNER_INTERACTIVE_WATCHDOG_START_NOT_VERIFIED/);
  assert.match(bootstrap,/ROBLOX_RUNNER_REBOOT_PROOF=NOT_TESTED_NO_FORCED_REBOOT/);
  assert.match(bootstrap,/Get-Item -LiteralPath \$startupPath -ErrorAction Stop/);
  assert.match(bootstrap,/if \(\$existingWatchers.Count -gt 0\) \{ Start-Sleep -Seconds 2 \}/);
  assert.ok(bootstrap.indexOf('Stop-Process -Id ([int]$watcher.ProcessId)') < bootstrap.indexOf('[IO.File]::WriteAllText($startupTemp'));
  assert.match(bootstrap,/Move-Item -LiteralPath \$startupTemp -Destination \$startupPath -Force/);
  assert.match(bootstrap,/ROBLOX_RUNNER_STARTUP_TEMP_NOT_VERIFIED/);
  assert.match(bootstrap,/ROBLOX_RUNNER_STARTUP_VOLUME_FREE_MB/);
  assert.match(bootstrap,/ROBLOX_RUNNER_SYSTEM_DISK_SPACE_REQUIRED/);
  assert.match(bootstrap,/Get-Date\)\.AddDays\(-2\)/);
  assert.match(bootstrap,/\.Extension -in @\('\.log','\.txt'\)/);
  assert.match(bootstrap,/Get-ChildItem -LiteralPath \$robloxLogs -File/);
  assert.doesNotMatch(bootstrap,/Remove-Item -LiteralPath \$env:LOCALAPPDATA|Remove-Item.*Roblox\\Versions/);
  assert.doesNotMatch(bootstrap,/\$launcher \| Set-Content -LiteralPath \$startupPath/);
  assert.doesNotMatch(bootstrap,/Get-Content -LiteralPath \$startupPath -Raw/);
  assert.match(bootstrap,/\[int\]\$_.SessionId -eq \$hostSessionId/);
  assert.doesNotMatch(bootstrap,/shell\.Run Chr\(34\) & target & Chr\(34\) & " run"/);
  assert.match(bootstrap,/For Each p In listeners/);
  assert.match(bootstrap,/If LCase\(p\.ExecutablePath\) = LCase\(target\) Then/);
});

test('daily C cleanup runs on existing signed-in Studio runner without touching apps, saves, or downloads',()=>{
  assert.match(workflow,/cron: '15 18 \* \* \*'/);
  const recover=workflow.slice(workflow.indexOf('  recover-via-unity:'),workflow.indexOf('\n  bootstrap:'));
  assert.match(recover,/if: github\.event_name != 'schedule'/);
  const bootstrap=workflow.slice(workflow.indexOf('\n  bootstrap:'));
  assert.match(bootstrap,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  const start=bootstrap.indexOf('- name: Clean only aged Windows user temporary files and Roblox logs on C');
  const end=bootstrap.indexOf('- name: Install hidden user-logon Startup launcher');
  assert.ok(start>=0&&end>start);
  const cleanup=bootstrap.slice(start,end);
  assert.match(cleanup,/\$systemRoot = \[IO\.Path\]::GetPathRoot\(\$env:WINDIR\)/);
  assert.match(cleanup,/Join-Path \$env:LOCALAPPDATA 'Roblox\\logs'/);
  assert.match(cleanup,/Join-Path \$env:LOCALAPPDATA 'Temp'/);
  assert.match(cleanup,/Days = 2; Ext = @\('\.log','\.txt'\)/);
  assert.match(cleanup,/Days = 7; Ext = @\('\.tmp','\.log','\.dmp'\)/);
  assert.match(cleanup,/\$file\.FullName -Force -ErrorAction Stop/);
  assert.match(cleanup,/\$deletedCount -ge 5000/);
  assert.match(cleanup,/ReparsePoint/);
  assert.match(cleanup,/C_UNUSED_APPS=REVIEW_ONLY_NO_AUTOMATIC_UNINSTALL/);
  assert.match(cleanup,/C_DRIVE_BELOW_5GB=OWNER_REVIEW_WINDOWS_STORAGE_CLEANUP_RECOMMENDATIONS/);
  assert.doesNotMatch(cleanup,/Remove-AppxPackage|Win32_Product|winget uninstall|Get-ChildItem -Recurse|Clear-RecycleBin|Downloads|Documents|SavedPlaces/);
  assert.match(bootstrap,/name: Install hidden user-logon Startup launcher\n        if: github\.event_name != 'schedule'/);
  assert.match(bootstrap,/name: Checkout native recording setup without downloading game assets\n        if: github\.event_name != 'schedule'/);
  assert.match(bootstrap,/name: Restore real Roblox Player recording on existing interactive Windows runner\n        if: github\.event_name != 'schedule'/);
});
