import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');

test('Roblox runtime foundation QA uses Open Cloud sentinel and never Studio',()=>{
  assert.match(workflow,/name: Company DEVELOPMENT_CONFIRMED Roblox Runtime Foundation QA/);
  assert.match(workflow,/runs-on: ubuntu-latest/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_API_KEY/);
  assert.match(workflow,/fetchRobloxRuntimeFoundationEvidence/);
  assert.match(workflow,/validateRobloxRuntimeFoundationEvidence/);
  assert.match(workflow,/native-foundation-sentinel-v1|company-development-roblox-runtime-foundation\.mjs/);
  assert.doesNotMatch(workflow,/roblox-studio-authenticated/);
  assert.doesNotMatch(workflow,/RobloxStudioBeta\.exe/);
  assert.doesNotMatch(workflow,/ExecuteMultiplayerTestAsync/);
});

test('missing actual runtime observation escalates after repeated automatic attempts',()=>{
  assert.match(workflow,/robloxRuntimeRetryCount=attempts/);
  assert.match(workflow,/attempts>=3/);
  assert.match(workflow,/ROBLOX_ACTUAL_RUNTIME_EXECUTOR_UNAVAILABLE/);
  assert.match(workflow,/roblox-actual-runtime-executor-unavailable/);
  assert.match(workflow,/ROBLOX_FOUNDATION_EXECUTOR_UNAVAILABLE=/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_PENDING/);
});

test('foundation QA remains fail-closed and exact-candidate bound',()=>{
  assert.match(workflow,/candidate\.sourceRevision===sourceRevision/);
  assert.match(workflow,/candidate\.artifactIdentity===artifactIdentity/);
  assert.match(workflow,/candidate\.versionNumber/);
  assert.match(workflow,/runtimeAcceptancePassed/);
  assert.match(workflow,/robloxDatastoreRejoinPassed/);
  assert.match(workflow,/robloxMultiplayerQaPassed/);
  assert.match(workflow,/ROBLOX_FINAL_REVIEW_PENDING/);
});


test('foundation workflow edits self-trigger exact current game revalidation',()=>{
  assert.match(workflow,/push:\s*\n\s*branches: \[main\][\s\S]*company-development-roblox-post-runtime-qa\.yml/);
  assert.match(workflow,/EVENT_NAME: \$\{\{ github\.event_name \}\}/);
  assert.match(workflow,/roblox-games\/\.company-runtime-trigger/);
  assert.match(workflow,/ROBLOX_FOUNDATION_REQUESTED_GAME_ID=/);
  assert.match(workflow,/ROBLOX_FOUNDATION_REQUESTED_GAME_ID_INVALID/);
});


test('foundation QA emits machine-readable exact blocker evidence',()=>{
  assert.match(workflow,/ROBLOX_FOUNDATION_RESULT=/);
  assert.match(workflow,/exactVersion:result\.exactVersion/);
  assert.match(workflow,/checkpointPass:result\.checkpointPass/);
  assert.match(workflow,/checkpointOrderPassed:result\.checkpointOrderPassed/);
  assert.match(workflow,/blockers:result\.blockers/);
});


test('stale published Roblox version counts as missing actual runtime execution and escalates',()=>{
  assert.match(workflow,/result\.exactGame===true&&result\.exactPlace===true&&result\.exactVersion!==true/);
  assert.match(workflow,/ROBLOX_FOUNDATION_STALE_RUNTIME=/);
  assert.match(workflow,/stale-runtime-sentinel-observation/);
  assert.match(workflow,/roblox-runtime-foundation-stale-version/);
  assert.match(workflow,/ROBLOX_ACTUAL_RUNTIME_EXECUTOR_UNAVAILABLE/);
  assert.match(workflow,/attempts>=3/);
});


test('exact Roblox foundation QA is isolated per game and cannot globally serialize multiplayer verification',()=>{
  assert.match(workflow,/group: company-development-roblox-runtime-foundation-qa-\$\{\{ inputs\.game_id/);
  assert.match(workflow,/scheduled-scan/);
  assert.match(workflow,/manual-scan/);
  assert.doesNotMatch(workflow,/group: company-development-roblox-runtime-foundation-qa\s*\n/);
  assert.match(workflow,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
});
