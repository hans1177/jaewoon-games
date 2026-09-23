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
