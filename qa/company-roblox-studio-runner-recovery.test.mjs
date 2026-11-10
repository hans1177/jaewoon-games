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

test('authenticated Windows Studio runner reconnects after exits but pauses without an interactive Studio',()=>{
  assert.match(canonical,/while \(\$true\) \{/);
  assert.match(canonical,/ROBLOX_FREE_STUDIO_RUNNER_PAUSED=STUDIO_INTERACTIVE_SESSION_MISSING/);
  assert.match(canonical,/ROBLOX_FREE_STUDIO_RUNNER_RESUME=OFFICIAL_STUDIO_INTERACTIVE_SESSION/);
  assert.match(canonical,/Get-AuthenticodeSignature -FilePath \$activeStudioExe/);
  assert.match(canonical,/\$restartDelaySeconds = \[Math\]::Min\(60, \$restartDelaySeconds \* 2\)/);
  assert.match(canonical,/\$runnerExit = \[int\]\$LASTEXITCODE/);
  assert.match(canonical,/if \(\$CheckOnly\) \{/);
  assert.doesNotMatch(canonical,/New-Service|Register-ScheduledTask|--token \$env:/);
});
