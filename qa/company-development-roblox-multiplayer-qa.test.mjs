import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflowPath = '.github/workflows/company-development-roblox-multiplayer-qa.yml';
const probePath = 'tools/company-development-roblox-multiplayer-qa.luau';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('Roblox multiplayer QA is exact-artifact, authenticated-Studio, and two-client only', () => {
  const workflow = read(workflowPath);
  assert.match(workflow, /runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(workflow, /EXPECTED_ARTIFACT/);
  assert.match(workflow, /Get-FileHash -Algorithm SHA256/);
  assert.match(workflow, /company-development-roblox-multiplayer-qa\.luau/);
  assert.match(workflow, /ROBLOX_MULTIPLAYER_QA_CLIENTS=2/);
  assert.match(workflow, /ROBLOX_MULTIPLAYER_DISTINCT_PLAYERS=YES/);
  assert.match(workflow, /ROBLOX_MULTIPLAYER_SERVER_AUTHORITATIVE_ROUNDTRIP=YES/);
  assert.match(workflow, /ROBLOX_MULTIPLAYER_PEER_VISIBILITY=YES/);
  assert.match(workflow, /robloxMultiplayerQaPassed=multiplayerPass/);
  assert.match(workflow, /ROBLOX_EXISTING_RUNTIME_MOBILE_REGRESSION_EVIDENCE_PRESERVED=YES/);
  assert.match(workflow, /ROBLOX_RELEASE_CLAIM=NO/);
  assert.match(workflow, /shell: powershell/);
  assert.doesNotMatch(workflow, /shell: pwsh/);
  assert.match(workflow, /gh run download .*--repo "\$env:GITHUB_REPOSITORY"/);
  assert.doesNotMatch(workflow, /company-development-roblox-mobile-independent-qa\.luau/);
  assert.doesNotMatch(workflow, /company-development-roblox-runtime-smoke\.luau/);
  assert.doesNotMatch(workflow, /windows-latest/);
});

test('Windows PowerShell 5.1 caches the process handle before reading Studio exit code', () => {
  const workflow = read(workflowPath);
  assert.match(
    workflow,
    /\$p = Start-Process[\s\S]*?\$processHandle = \$p\.Handle[\s\S]*?\$p\.WaitForExit\(240000\)[\s\S]*?\$p\.WaitForExit\(\)[\s\S]*?\$exitCode = \$p\.ExitCode/,
  );
  assert.match(workflow, /\$null -eq \$exitCode/);
  assert.match(workflow, /\$exitCode -ne 0/);
  assert.doesNotMatch(workflow, /\$p\.ExitCode -ne 0/);
});

test('successful multiplayer persistence dispatches canonical final-review revalidation', () => {
  const workflow = read(workflowPath);
  assert.match(workflow, /needs\.multiplayer-worker\.result == 'success'/);
  assert.match(workflow, /gh api --method POST "repos\/\$GITHUB_REPOSITORY\/dispatches"/);
  assert.match(workflow, /event_type='roblox_multiplayer_qa_persisted'/);
  assert.match(workflow, /ROBLOX_FINAL_REVIEW_REVALIDATION_DISPATCHED=YES/);
  assert.doesNotMatch(workflow, /robloxFinalReviewPassed=true/);
});

test('multiplayer probe requires two distinct clients and server-authoritative peer visibility', () => {
  const probe = read(probePath);
  assert.match(probe, /ExecuteMultiplayerTestAsync\(2/);
  assert.match(probe, /#names < 2/);
  assert.match(probe, /names\[1\] == names\[2\]/);
  assert.match(probe, /FireAllClients\("SERVER_ROSTER"/);
  assert.match(probe, /PEER_ROSTER_ACK/);
  assert.match(probe, /count\(rosterAck\) >= 2/);
  assert.match(probe, /PASS:TWO_CLIENT_SERVER_AUTHORITATIVE_PEER_ROUNDTRIP/);
  assert.match(probe, /ROBLOX_MULTIPLAYER_QA_CLIENTS=2/);
  assert.match(probe, /ROBLOX_MULTIPLAYER_QA.*PASS/);
});
