import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');

test('Roblox runtime foundation lane remains Open Cloud only while post-release actual play is a separate Studio MCP lane',()=>{
  const foundation=workflow.split('\n  studio-local-plan:')[0];
  assert.match(foundation,/name: Company DEVELOPMENT_CONFIRMED Roblox Runtime Foundation QA/);
  assert.match(foundation,/runs-on: ubuntu-latest/);
  assert.match(foundation,/ROBLOX_OPEN_CLOUD_API_KEY/);
  assert.match(foundation,/fetchRobloxRuntimeFoundationEvidence/);
  assert.match(foundation,/validateRobloxRuntimeFoundationEvidence/);
  assert.match(foundation,/native-foundation-sentinel-v1|company-development-roblox-runtime-foundation\.mjs/);
  assert.doesNotMatch(foundation,/roblox-studio-authenticated/);
  assert.doesNotMatch(foundation,/RobloxStudioBeta\.exe/);
  assert.doesNotMatch(foundation,/ExecuteMultiplayerTestAsync/);
  assert.match(workflow,/studio-mcp-auto-play:/);
  assert.match(workflow,/Roblox\\mcp\.bat/);
  assert.doesNotMatch(workflow,/RobloxPlayerBeta|roblox:\/\//i);
  assert.doesNotMatch(workflow,/vibe2-roblox-studio-cli-runner|--task\s+RunScript|--runScriptFile/);
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


test('exact Roblox foundation QA isolates exact games while collapsing duplicate scan work without workflow-wide locking',()=>{
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.match(workflow,/run-name: Roblox runtime foundation QA · \$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.doesNotMatch(workflow.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(workflow,/inputs\.game_id/);
  assert.match(workflow,/title='Roblox runtime foundation QA · '\+\(game\|\|'scan'\)/);
  assert.match(workflow,/process\.stdout\.write\(String\(game\?ids\[0\]:ids\[ids\.length-1\]\)\)/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_EXACT_DEDUPED=/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_SCAN_DEDUPED_NEWER=/);
  assert.match(workflow,/strategy:[\s\S]{0,180}fail-fast: false[\s\S]{0,180}matrix:/);
  assert.match(workflow,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
});

test('two-client one-sync is the shared internal and public release gate',()=>{
  assert.match(workflow,/ROBLOX_TWO_CLIENT_ONE_SYNC_PENDING/);
  assert.match(workflow,/item\.currentStep='TARGET_PLATFORM_RUNTIME_ACCEPTANCE'/);
  assert.match(workflow,/item\.robloxFailureSignature='ROBLOX_TWO_CLIENT_ONE_SYNC_PENDING'/);
  assert.match(workflow,/item\.routingBlockers=\['roblox-two-client-one-sync-pending'\]/);
  assert.match(workflow,/item\.robloxPromotionBlockers=\['roblox-two-client-one-sync-pending'\]/);
  assert.doesNotMatch(workflow,/ROBLOX_MULTIPLAYER_SIMPLIFIED_INTERNAL_RELEASE_REVIEW/);
});


test('shared fallback QA only probes the one current candidate and marks older duplicate-current entries superseded',()=>{
  assert.match(workflow,/sharedFastMvpRotationAllowed/);
  assert.match(workflow,/item\.robloxSharedTargetCurrent===false/);
  assert.match(workflow,/ROBLOX_SHARED_TARGET_SUPERSEDED=/);
  assert.match(workflow,/item\.currentStep='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'/);
  assert.match(workflow,/ROBLOX_RUNTIME_CANDIDATE_DEPLOY_PENDING/);
  assert.match(workflow,/roblox-shared-runtime-target-capacity-republish-required/);
});


test('foundation runtime write contention defers only the stale write and keeps unrelated Studio play available',()=>{
  assert.match(workflow,/ROBLOX_FOUNDATION_RUNTIME_WRITE_CONFLICT=DEFERRED_TO_NEXT_CYCLE/);
  assert.match(workflow,/if ! git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"; then[\s\S]*git rebase --abort \|\| true[\s\S]*exit 0/);
});


test('post-runtime QA collapses duplicate scans before heavy work without workflow-wide concurrency',()=>{
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.match(workflow,/run-name: Roblox runtime foundation QA · \$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.doesNotMatch(workflow.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_ACTIVE_WINNER=/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_EXACT_DEDUPED=/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_SCAN_DEDUPED_NEWER=/);
  assert.match(workflow,/runtime-foundation-qa:\n\s+needs: dedupe\n\s+if: needs\.dedupe\.outputs\.run == 'true'/);
  assert.match(workflow,/studio-local-plan:\n\s+needs: dedupe\n\s+if: needs\.dedupe\.outputs\.run == 'true'/);
});
