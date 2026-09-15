import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const script = fs.readFileSync('tools/setup-roblox-runner-autostart.ps1', 'utf8');

test('Roblox runner autostart preserves the interactive Windows user profile', () => {
  assert.match(script, /New-ScheduledTaskTrigger -AtLogOn/);
  assert.match(script, /-LogonType Interactive/);
  assert.match(script, /Runner\.Listener/);
  assert.match(script, /run\.cmd/);
  assert.match(script, /\.runner/);
  assert.match(script, /ROBLOX_STUDIO_USER_PROFILE_PRESERVED=YES/);
});

test('Roblox runner autostart does not reconfigure runner identity or switch to service mode', () => {
  assert.doesNotMatch(script, /config\.cmd/);
  assert.doesNotMatch(script, /svc\.cmd/);
  assert.doesNotMatch(script, /--labels/);
  assert.doesNotMatch(script, /NETWORK SERVICE/i);
  assert.match(script, /ROBLOX_RUNNER_SERVICE_MODE=NO/);
});
