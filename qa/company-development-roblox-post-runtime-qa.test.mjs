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

test('Studio asset binding promotion waits for exact accepted Roblox runtime',()=>{
  assert.match(workflow,/const studioAssetBindingRequired=item\.robloxStudioAssetBindingApplied===true/);
  assert.match(workflow,/result\.runtimeAcceptancePassed===true/);
  assert.match(workflow,/result\.f5InputCameraUiPassed===true/);
  assert.match(workflow,/result\.f8GameplaySystemsPassed===true/);
  assert.match(workflow,/ROBLOX_STUDIO_ASSET_RUNTIME_BINDING_PASS/);
  assert.match(workflow,/sourceRevision/);
  assert.match(workflow,/artifactIdentity/);
  assert.match(workflow,/candidateVersionNumber:Number\(candidate\.versionNumber\)/);
  assert.match(workflow,/actualPlatformRuntime:true/);
  assert.match(workflow,/studioAssetRuntimeBindingPassed/);
});

test('missing actual runtime observation remains on the same gate with unlimited causal retry',()=>{
  assert.match(workflow,/robloxRuntimeRetryCount=attempts/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_PENDING/);
  assert.match(workflow,/ROBLOX_FOUNDATION_AWAITING_FIRST_RUNTIME=.*retry=UNLIMITED_CAUSAL_REPAIR/);
  assert.doesNotMatch(workflow,/ROBLOX_ACTUAL_RUNTIME_EXECUTOR_UNAVAILABLE/);
  assert.doesNotMatch(workflow,/roblox-actual-runtime-executor-unavailable/);
  assert.doesNotMatch(workflow,/attempts>=3/);
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
  assert.match(workflow,/paths:[\s\S]*company-development-roblox-post-runtime-qa\.yml[\s\S]*roblox-games\/\.company-runtime-trigger/);
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


test('stale published Roblox version preserves the exact failed stage and retries without a fixed cap',()=>{
  assert.match(workflow,/result\.exactGame===true&&result\.exactPlace===true&&result\.exactVersion!==true/);
  assert.match(workflow,/ROBLOX_FOUNDATION_STALE_RUNTIME=.*retry=UNLIMITED_CAUSAL_REPAIR/);
  assert.match(workflow,/stale-runtime-sentinel-observation/);
  assert.match(workflow,/roblox-runtime-foundation-stale-version/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_PENDING/);
  assert.doesNotMatch(workflow,/attempts>=3/);
});


test('exact Roblox foundation QA is isolated per game and persists through latest-state reapply',()=>{
  assert.match(workflow,/group: company-development-roblox-runtime-foundation-qa-\$\{\{ inputs\.game_id/);
  assert.match(workflow,/scheduled-scan/);
  assert.match(workflow,/manual-scan/);
  assert.doesNotMatch(workflow,/group: company-development-roblox-runtime-foundation-qa\s*\n/);
  assert.match(workflow,/roblox-foundation-state-patches\.json/);
  assert.match(workflow,/ROBLOX_FOUNDATION_PERSIST_ATTEMPT=/);
  assert.match(workflow,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(workflow,/ROBLOX_FOUNDATION_PERSIST_CONFLICT_RETRY=/);
  assert.doesNotMatch(workflow,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
});

test('foundation QA declares Studio asset binding requirement once per candidate scope',()=>{
  const declarations=workflow.match(/const studioAssetBindingRequired=item\.robloxStudioAssetBindingApplied===true;/g)||[];
  assert.equal(declarations.length,1);
});

test('two-client one-sync is the shared internal and public release gate',()=>{
  assert.match(workflow,/ROBLOX_TWO_CLIENT_ONE_SYNC_PENDING/);
  assert.match(workflow,/item\.currentStep='TARGET_PLATFORM_RUNTIME_ACCEPTANCE'/);
  assert.match(workflow,/item\.robloxFailureSignature='ROBLOX_TWO_CLIENT_ONE_SYNC_PENDING'/);
  assert.match(workflow,/item\.routingBlockers=\['roblox-two-client-one-sync-pending'\]/);
  assert.match(workflow,/item\.robloxPromotionBlockers=\['roblox-two-client-one-sync-pending'\]/);
  assert.doesNotMatch(workflow,/ROBLOX_MULTIPLAYER_SIMPLIFIED_INTERNAL_RELEASE_REVIEW/);
});
