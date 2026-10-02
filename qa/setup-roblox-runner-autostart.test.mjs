import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const script = fs.readFileSync('tools/setup-roblox-runner-autostart.ps1', 'utf8');
const bootstrap = fs.readFileSync('tools/install-roblox-runner-watchdog.cmd', 'utf8');
const workflow = fs.readFileSync('.github/workflows/roblox-runner-self-heal.yml', 'utf8');

test('Roblox runner autostart preserves the interactive Windows user profile', () => {
  assert.match(script, /New-ScheduledTaskTrigger -AtLogOn/);
  assert.match(script, /-LogonType Interactive/);
  assert.match(script, /Runner\.Listener/);
  assert.match(script, /run\.cmd/);
  assert.match(script, /\.runner/);
  assert.match(script, /ROBLOX_STUDIO_USER_PROFILE_PRESERVED=YES/);
});

test('Roblox runner autostart is fail-closed to the dedicated authenticated runner', () => {
  assert.match(script, /ExpectedRunnerName = 'roblox-studio-local'/);
  assert.match(script, /metadata\.agentName/);
  assert.match(script, /Refusing to configure unexpected runner/);
  assert.match(script, /ROBLOX_RUNNER_EXPECTED_NAME=/);
});

test('Roblox runner self-heals every minute without a visible manual run.cmd window', () => {
  assert.match(script, /HealthCheckMinutes = 1/);
  assert.match(script, /-RepetitionInterval \(New-TimeSpan -Minutes \$HealthCheckMinutes\)/);
  assert.match(script, /\.jaewoon-roblox-runner-watchdog\.ps1/);
  assert.match(script, /\.jaewoon-roblox-runner-hidden-migrate\.ps1/);
  assert.match(script, /System\.Diagnostics\.ProcessStartInfo/);
  assert.match(script, /CreateNoWindow = \$true/);
  assert.match(script, /UseShellExecute = \$false/);
  assert.match(script, /ProcessWindowStyle\]::Hidden/);
  assert.doesNotMatch(script, /WScript\.Shell/);
  assert.doesNotMatch(script, /wscript\.exe/);
  assert.doesNotMatch(script, /shell\.Run/);
  assert.doesNotMatch(script, /Start-Process -FilePath \$env:ComSpec/);
  assert.match(script, /New-ScheduledTaskSettingsSet[^\n]*-Hidden/);
  assert.match(script, /HiddenMigration/);
  assert.match(script, /Start-Sleep -Milliseconds 200/);
  assert.match(script, /ROBLOX_RUNNER_TASK_HIDDEN=YES/);
  assert.match(script, /ROBLOX_RUNNER_LAUNCH_MODE=DIRECT_CREATE_NO_WINDOW/);
  assert.match(script, /ROBLOX_RUNNER_CHILD_CONSOLE_INHERITANCE=NO_CONSOLE_PARENT/);
  assert.match(script, /Runner\.Worker/);
  assert.match(script, /hidden-restart\.pending/);
  assert.match(script, /Get-TargetWorkers/);
  assert.match(script, /Stop-Process -Id \$process\.Id/);
  assert.match(script, /Remove-Item -LiteralPath \$restartMarker/);
  assert.match(script, /ROBLOX_RUNNER_IDLE_MIGRATION=PENDING_UNTIL_NO_RUNNER_WORKER/);
  assert.match(script, /ROBLOX_RUNNER_IDLE_MIGRATION_POLL_MS=200/);
  assert.match(script, /ROBLOX_RUNNER_VISIBLE_CMD_REQUIRED=NO/);
  assert.match(script, /scheduled self-heal will retry automatically/i);
})

test('one-click bootstrap self-elevates and installs only the exact Roblox runner watchdog', () => {
  assert.match(bootstrap, /Start-Process .* -Verb RunAs/);
  assert.match(bootstrap, /C:\\actions-runner/);
  assert.match(bootstrap, /roblox-studio-local/);
  assert.match(bootstrap, /setup-roblox-runner-autostart\.ps1/);
  assert.match(bootstrap, /HealthCheckMinutes 1/);
  assert.match(bootstrap, /ROBLOX_RUNNER_WATCHDOG_BOOTSTRAP=PASS/);
  assert.doesNotMatch(bootstrap, /config\.cmd/);
  assert.doesNotMatch(bootstrap, /svc\.cmd/);
  assert.doesNotMatch(bootstrap, /--labels/);
});

test('self-heal is automatically applied by the authenticated Roblox runner', () => {
  assert.match(workflow, /name: Roblox Authenticated Runner Self-Heal/);
  assert.match(workflow, /runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(workflow, /roblox-studio-local/);
  assert.match(workflow, /setup-roblox-runner-autostart\.ps1/);
  assert.match(workflow, /install-roblox-runner-watchdog\.cmd/);
  assert.match(workflow, /HealthCheckMinutes 1/);
  assert.match(workflow, /ROBLOX_RUNNER_MANUAL_LOCAL_ACTION_REQUIRED=NO/);
  assert.match(workflow, /shell: powershell/);
});

test('new self-heal runs cancel stale runs waiting on an offline runner', () => {
  assert.match(workflow, /group: roblox-authenticated-runner-self-heal/);
  assert.match(workflow, /cancel-in-progress: true/);
});

test('Roblox runner autostart does not reconfigure runner identity or switch to service mode', () => {
  assert.doesNotMatch(script, /config\.cmd/);
  assert.doesNotMatch(script, /svc\.cmd/);
  assert.doesNotMatch(script, /--labels/);
  assert.doesNotMatch(script, /NETWORK SERVICE/i);
  assert.match(script, /ROBLOX_RUNNER_SERVICE_MODE=NO/);
});
