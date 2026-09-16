import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const file = 'tools/vibe2-roblox-runner-bootstrap.ps1';
const source = fs.readFileSync(file, 'utf8');
const liveSmokeFile = '.github/workflows/vibe2-roblox-studio-live-smoke.yml';
const liveSmoke = fs.readFileSync(liveSmokeFile, 'utf8');

test('Roblox runner bootstrap uses official GitHub registration and readiness contracts', () => {
  assert.match(source, /actions\/runners\/registration-token/);
  assert.match(source, /actions\/runners\/remove-token/);
  assert.match(source, /actions\/runners\?per_page=100/);
  assert.match(source, /VIBE2_ROBLOX_STUDIO_RUNNER_READY/);
  assert.match(source, /actions\/variables/);
  assert.match(source, /vibe2-roblox/);
  assert.match(source, /--labels/);
  assert.match(source, /--unattended/);
  assert.match(source, /--replace/);
});

test('Roblox runner bootstrap keeps GUI-capable interactive runner mode available for Studio', () => {
  assert.match(source, /ValidateSet\('Interactive','Service'\)/);
  assert.match(source, /Register-InteractiveRunnerTask/);
  assert.match(source, /New-ScheduledTaskTrigger -AtLogOn/);
  assert.match(source, /LogonType Interactive/);
  assert.match(source, /RobloxStudioBeta\.exe/);
  assert.match(source, /RobloxStudio\.exe/);
});

test('Roblox runner bootstrap never hardcodes credentials or expands Vibe2 authority', () => {
  assert.equal(/github_pat_[A-Za-z0-9_]+/.test(source), false);
  assert.equal(/ghp_[A-Za-z0-9]+/.test(source), false);
  assert.match(source, /VIBE2_GITHUB_ADMIN_TOKEN/);
  assert.match(source, /authorityExpanded = \$false/);
  assert.match(source, /VIBE2_AUTHORITY_EXPANDED/);
  assert.match(source, /'NO'/);
});

test('Roblox runner bootstrap can set readiness only after online runner and Studio checks', () => {
  const onlineAt = source.indexOf("$runner = Wait-RunnerOnline");
  const studioAt = source.indexOf("if ([string]::IsNullOrWhiteSpace($studio))");
  const readyAt = source.lastIndexOf("Set-ReadinessVariable $repo $GitHubToken $true");
  assert(onlineAt >= 0);
  assert(studioAt >= 0);
  assert(readyAt > onlineAt);
  assert(readyAt > studioAt);
});

test('Roblox runner bootstrap can dispatch the dedicated live smoke only explicitly', () => {
  assert.match(source, /\[switch\]\$DispatchLiveSmoke/);
  assert.match(source, /vibe2-roblox-studio-live-smoke\.yml\/dispatches/);
  assert.match(source, /if \(\$DispatchLiveSmoke\) \{ Dispatch-LiveSmoke/);
});

test('Roblox live smoke runs only on the dedicated isolated Studio runner', () => {
  assert.match(liveSmoke, /runs-on: \[self-hosted, Windows, vibe2-roblox\]/);
  assert.match(liveSmoke, /VIBE2_ROBLOX_STUDY_ISOLATED_SESSION: 'true'/);
  assert.equal(/runs-on:.*roblox-studio-authenticated/.test(liveSmoke), false);
  assert.match(liveSmoke, /agentName -eq 'roblox-studio-local'/);
  assert.match(liveSmoke, /Production Roblox Studio runner must not execute dedicated GAME STUDY smoke/);
  assert.match(liveSmoke, /VIBE2_PRODUCTION_RUNNER_TOUCHED=NO/);
});
