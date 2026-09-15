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
  assert.match(script, /-WindowStyle Hidden/);
  assert.match(script, /ROBLOX_RUNNER_VISIBLE_CMD_REQUIRED=NO/);
  assert.match(script, /scheduled self-heal will retry automatically/i);
});

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

test('Roblox runner autostart does not reconfigure runner identity or switch to service mode', () => {
  assert.doesNotMatch(script, /config\.cmd/);
  assert.doesNotMatch(script, /svc\.cmd/);
  assert.doesNotMatch(script, /--labels/);
  assert.doesNotMatch(script, /NETWORK SERVICE/i);
  assert.match(script, /ROBLOX_RUNNER_SERVICE_MODE=NO/);
});
