import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');

test('Roblox runtime foundation lane remains Open Cloud only while post-release actual play is a separate Studio MCP lane',()=>{
  const foundation=workflow.split('\n  studio-local-plan:')[0];
  const runtimeFoundation=foundation.slice(foundation.indexOf('\n  runtime-foundation-qa:'),foundation.length);
  assert.match(foundation,/name: Company DEVELOPMENT_CONFIRMED Roblox Runtime Foundation QA/);
  assert.match(foundation,/\n  dedupe:[\s\S]*?runs-on: ubuntu-slim/);
  assert.match(runtimeFoundation,/runs-on: ubuntu-24\.04/);
  assert.doesNotMatch(runtimeFoundation,/runs-on: ubuntu-slim/);
  assert.doesNotMatch(runtimeFoundation,/runs-on: ubuntu-latest/);
  assert.match(runtimeFoundation,/ROBLOX_OPEN_CLOUD_API_KEY/);
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

test('runtime QA rescans when the private candidate producer workflow changes',()=>{
  assert.match(workflow,/\.github\/workflows\/company-development-roblox-release-promotion\.yml/);
});

test('Studio asset binding promotion waits for exact accepted Roblox runtime',()=>{
  assert.match(workflow,/const studioAssetBindingRequired=item\.robloxStudioAssetBindingApplied===true/);
  assert.match(workflow,/&&runtimeAcceptanceForRelease/);
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
  assert.ok((workflow.match(/TRIGGER_CHANGED:/g)||[]).length>=3);
  assert.ok(workflow.includes("TRIGGER_CHANGED: ${{ github.event_name == 'push' && (contains(toJSON(github.event.head_commit.modified), 'roblox-games/.company-runtime-trigger') || contains(toJSON(github.event.head_commit.added), 'roblox-games/.company-runtime-trigger') || contains(toJSON(github.event.head_commit.removed), 'roblox-games/.company-runtime-trigger')) }}"));
  assert.doesNotMatch(workflow,/TRIGGER_CHANGED: .*github\.event\.commits/);
  assert.match(workflow,/process\.env\.EVENT_NAME==='push'&&String\(process\.env\.TRIGGER_CHANGED\|\|''\)\.toLowerCase\(\)==='true'/);
  assert.match(workflow,/\[ "\$\{EVENT_NAME:-\}" = "push" \] && \[ "\$\{TRIGGER_CHANGED:-\}" = "true" \]/);
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
  assert.match(workflow,/result\.exactGame===true[\s\S]*?&&result\.exactPlace===true[\s\S]*?result\.exactVersion!==true/);
  assert.match(workflow,/result\.runtimeFoundationPassed!==true&&exactEngineVersionAwaitingRealServerBoot/);
  assert.match(workflow,/ROBLOX_FOUNDATION_STALE_RUNTIME=.*retry=UNLIMITED_CAUSAL_REPAIR/);
  assert.match(workflow,/stale-runtime-sentinel-observation/);
  assert.match(workflow,/roblox-runtime-foundation-stale-version/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_PENDING/);
  assert.doesNotMatch(workflow,/attempts>=3/);
});


test('exact Roblox foundation QA isolates exact games while collapsing duplicate scan work before runner allocation',()=>{
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.match(workflow,/run-name: Roblox runtime foundation QA · \$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.match(workflow.slice(0,jobsAt),/\nconcurrency:\n\s+group: roblox-runtime-foundation-\$\{\{ inputs\.game_id \|\| 'scan' \}\}\n\s+cancel-in-progress: true/);
  assert.match(workflow,/inputs\.game_id/);
  assert.match(workflow,/title='Roblox runtime foundation QA · '\+\(game\|\|'scan'\)/);
  assert.match(workflow,/process\.stdout\.write\(String\(ids\[ids\.length-1\]\)\)/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_EXACT_DEDUPED=/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_SCAN_DEDUPED_NEWER=/);
  assert.match(workflow,/strategy:[\s\S]{0,180}fail-fast: false[\s\S]{0,180}matrix:/);
  assert.match(workflow,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
});

test('F7 multiplayer checks the exact Roblox source contract before F9',()=>{
  assert.match(workflow,/validateRobloxMultiplayerSourceContract/);
  assert.match(workflow,/const staticMultiplayerCodePass=multiplayer\.required===true&&multiplayerSourceContract\.passed===true/);
  assert.match(workflow,/ROBLOX_F7_MULTIPLAYER_CODE_CONTRACT_PASS=/);
  assert.match(workflow,/item\.robloxMultiplayerQaPassed=true/);
  assert.match(workflow,/runtimeTwoClientExecutionRequired:false/);
  assert.match(workflow,/ROBLOX_FINAL_REVIEW_PENDING/);
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


test('post-runtime QA collapses duplicate scans before heavy work with scan-scoped workflow concurrency',()=>{
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.match(workflow,/run-name: Roblox runtime foundation QA · \$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.match(workflow.slice(0,jobsAt),/\nconcurrency:\n\s+group: roblox-runtime-foundation-\$\{\{ inputs\.game_id \|\| 'scan' \}\}\n\s+cancel-in-progress: true/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_ACTIVE_WINNER=/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_EXACT_DEDUPED=/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_SCAN_DEDUPED_NEWER=/);
  assert.match(workflow,/runtime-foundation-qa:\n\s+needs: dedupe\n\s+if: needs\.dedupe\.outputs\.run == 'true'/);
  const studioPlanAt=workflow.indexOf('\n  studio-local-plan:');
  const studioAutoPlayAt=workflow.indexOf('\n  studio-mcp-auto-play:',studioPlanAt);
  assert.ok(studioPlanAt>0&&studioAutoPlayAt>studioPlanAt);
  const studioPlan=workflow.slice(studioPlanAt,studioAutoPlayAt);
  assert.doesNotMatch(studioPlan,/\n\s+needs:\s+dedupe(?:\s|$)/);
  assert.match(studioPlan,/concurrency:\n\s+group: roblox-studio-mcp-plan-/);
  assert.match(studioPlan,/runs-on: ubuntu-slim/);
});


test('Studio MCP actual play passes each game launch contract into the official helper',()=>{
  assert.match(workflow,/--actual-play-contract=main\/roblox-games\/\$\{\{ matrix\.gameId \}\}\/launch-mvp\.json/);
});

test('active product-quality buildup suppresses Open Cloud and downstream foundation processing for the same source',()=>{
  assert.match(workflow,/item\.robloxQualityBuildUpRequired===true/);
  assert.match(workflow,/item\.robloxQualityBuildUpSourceRevision/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_ENGINE_PROBE_SKIPPED_ACTIVE_QUALITY_BUILDUP=/);
  assert.match(workflow,/ROBLOX_FOUNDATION_PROCESSING_SKIPPED_ACTIVE_QUALITY_BUILDUP=/);
  assert.match(workflow,/QUALITY_FIRST_BUILDUP_SHORT_CIRCUIT=ACTIVE/);
  assert.match(workflow,/QUALITY_FAILURE_CLASS=PRODUCT/);
  assert.match(workflow,/QUALITY_BUILDUP_AUTO_REQUEUE=YES/);
  assert.match(workflow,/EXTERNAL_RELEASE_PROBE_SUPPRESSED=YES/);
  assert.match(workflow,/RESUME_STAGE=REPAIR_REQUIRED/);
});

test('quality-first release-probe suppression is exact-source scoped rather than a permanent game hold',()=>{
  assert.match(workflow,/String\(item\.robloxQualityBuildUpSourceRevision\|\|''\)\.trim\(\)===sourceRevision/);
  assert.doesNotMatch(workflow,/robloxQualityBuildUpRequired===true[\s\S]{0,120}process\.exit\(1\)/);
});


test('active internal product-quality buildup suppresses same-source Open Cloud and foundation processing',()=>{
  assert.match(workflow,/robloxQualityBuildUpRequired===true/);
  assert.match(workflow,/robloxQualityBuildUpSourceRevision/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_ENGINE_PROBE_SKIPPED_ACTIVE_QUALITY_BUILDUP=/);
  assert.match(workflow,/ROBLOX_FOUNDATION_PROCESSING_SKIPPED_ACTIVE_QUALITY_BUILDUP=/);
  assert.match(workflow,/QUALITY_FIRST_BUILDUP_SHORT_CIRCUIT=ACTIVE/);
  assert.match(workflow,/QUALITY_FAILURE_CLASS=PRODUCT/);
  assert.match(workflow,/QUALITY_BUILDUP_AUTO_REQUEUE=YES/);
  assert.match(workflow,/EXTERNAL_RELEASE_PROBE_SUPPRESSED=YES/);
  assert.match(workflow,/RESUME_STAGE=REPAIR_REQUIRED/);
});

test('quality-first suppression keeps public release and exact candidate gates intact',()=>{
  assert.match(workflow,/item\.robloxPublicRelease!==true/);
  assert.match(workflow,/candidate\.sourceRevision===sourceRevision/);
  assert.match(workflow,/candidate\.artifactIdentity===artifactIdentity/);
  assert.match(workflow,/candidate\.versionNumber/);
  assert.match(workflow,/ROBLOX_FINAL_REVIEW_PENDING/);
  assert.doesNotMatch(workflow,/robloxQualityBuildUpRequired\s*=\s*false/);
});

test('active same-source product quality buildup suppresses Open Cloud and downstream foundation processing',()=>{
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_ENGINE_PROBE_SKIPPED_ACTIVE_QUALITY_BUILDUP=/);
  assert.match(workflow,/ROBLOX_FOUNDATION_PROCESSING_SKIPPED_ACTIVE_QUALITY_BUILDUP=/);
  assert.match(workflow,/item\.robloxQualityBuildUpRequired===true/);
  assert.match(workflow,/item\.robloxQualityBuildUpSourceRevision/);
  assert.match(workflow,/QUALITY_FIRST_BUILDUP_SHORT_CIRCUIT=ACTIVE/);
  assert.match(workflow,/EXTERNAL_RELEASE_PROBE_SUPPRESSED=YES/);
  assert.match(workflow,/RESUME_STAGE=REPAIR_REQUIRED/);
});


test('transient Open Cloud failures stay inside the bounded runtime-foundation scan without source rebuild or workflow fanout',()=>{
  assert.match(workflow,/retry_open_cloud_only:/);
  assert.match(workflow,/type: boolean/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_TRANSIENT_RETRY_CANDIDATES=/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_TRANSIENT_RETRY_MODE=IN_SCAN_BOUNDED/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_ENGINE_PROBE_RETRY_IN_CURRENT_SCAN=/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_RUNTIME_STATE_RETRY_IN_CURRENT_SCAN=/);
  assert.doesNotMatch(workflow,/gh workflow run company-development-roblox-post-runtime-qa\.yml[\s\S]{0,240}-f retry_open_cloud_only=true/);
  assert.match(workflow,/Run deterministic foundation protocol QA[\s\S]{0,120}if: \$\{\{ inputs\.retry_open_cloud_only != true \}\}/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_EXACT_GATE_RETRY_PENDING=/);
  assert.match(workflow,/QUALITY_FAILURE_CLASS=INFRASTRUCTURE_OR_EVIDENCE_ONLY/);
  assert.match(workflow,/QUALITY_BUILDUP_AUTO_REQUEUE=NO/);
  assert.match(workflow,/RESUME_STAGE=TARGET_PLATFORM_RUNTIME_FOUNDATION/);
});

test('transient 429 does not fail the whole workflow while non-transient persistent probe failures remain blocking',()=>{
  assert.match(workflow,/transientProbeStatuses=new Set\(\[408,429,500,502,503,504\]\)/);
  assert.match(workflow,/roblox-open-cloud-engine-probe-transient-retry/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_TRANSIENT_PROBE_RETRY=IN_SCAN_BOUNDED/);
  const classifyAt=workflow.indexOf('Enforce persistent Open Cloud probe failures after evidence persistence');
  assert.ok(classifyAt>0);
  const classify=workflow.slice(classifyAt,workflow.indexOf('\n  studio-local-plan:',classifyAt));
  assert.match(classify,/if \[ -s "\$transient_file" \]; then[\s\S]*ROBLOX_OPEN_CLOUD_TRANSIENT_PROBE_RETRY=IN_SCAN_BOUNDED[\s\S]*fi/);
  assert.doesNotMatch(classify,/transient_file[\s\S]{0,500}exit 1/);
  assert.match(classify,/if \[ -s "\$blocking_file" \]; then[\s\S]*exit 1/);
});

test('exact transient Open Cloud retry does not consume the Studio MCP lane',()=>{
  const studioPlanAt=workflow.indexOf('\n  studio-local-plan:');
  const studioAutoPlayAt=workflow.indexOf('\n  studio-mcp-auto-play:',studioPlanAt);
  assert.ok(studioPlanAt>0&&studioAutoPlayAt>studioPlanAt);
  const studioPlan=workflow.slice(studioPlanAt,studioAutoPlayAt);
  assert.match(studioPlan,/if: \$\{\{ inputs\.retry_open_cloud_only != true \}\}/);
});


test('exact transient Open Cloud retry is cancelled when source or artifact changed after dispatch',()=>{
  assert.match(workflow,/RETRY_OPEN_CLOUD_ONLY: \$\{\{ inputs\.retry_open_cloud_only \|\| false \}\}/);
  assert.match(workflow,/const retryOpenCloudOnly=String\(process\.env\.RETRY_OPEN_CLOUD_ONLY\|\|''\)\.toLowerCase\(\)==='true'/);
  assert.match(workflow,/retryOpenCloudOnly&&requested/);
  assert.match(workflow,/c\.sourceRevision===sourceRevision/);
  assert.match(workflow,/c\.artifactIdentity===artifactIdentity/);
  assert.match(workflow,/transientEvidence\.authority==='roblox-open-cloud-engine-probe-failure'/);
  assert.match(workflow,/transientRetryStatuses\.has\(Number\(transientEvidence\.httpStatus\|\|0\)\)/);
  assert.match(workflow,/transientEvidence\.sourceRevision===sourceRevision/);
  assert.match(workflow,/transientEvidence\.artifactIdentity===artifactIdentity/);
  assert.match(workflow,/Number\(transientEvidence\.candidateVersionNumber\|\|0\)===Number\(c\.versionNumber\|\|0\)/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_EXACT_GATE_RETRY_SUPERSEDED_BY_CURRENT_SOURCE=/);
});

test('same exact Studio internal evidence is reused inside the cycle without fabricating external runtime PASS',()=>{
  assert.match(workflow,/const exactExternalRuntimeEvidenceReusable=/);
  assert.match(workflow,/const exactStudioRuntimeEvidenceReusable=/);
  assert.match(workflow,/const exactRuntimeEvidenceReusable=exactExternalRuntimeEvidenceReusable\|\|exactStudioRuntimeEvidenceReusable/);
  assert.match(workflow,/reusedServerBootEvidence:exactExternalRuntimeEvidenceReusable/);
  assert.match(workflow,/reusedStudioInternalEvidence:exactStudioRuntimeEvidenceReusable/);
  assert.match(workflow,/EXACT_SOURCE_ARTIFACT_VERSION_STUDIO_INTERNAL_EVIDENCE_ALREADY_VERIFIED/);
  assert.match(workflow,/item\.robloxRuntimeFoundationPassed=false;[\s\S]{0,100}item\.robloxRuntimePassed=false;/);
  assert.match(workflow,/externalServerBootRequired:false/);
});


test('F7 reuses exact artifact evidence or the current source contract',()=>{
  const priorAt=workflow.indexOf('const exactPriorMultiplayerValidation=Boolean(');
  const reuseAt=workflow.indexOf('const exactMultiplayerValidationReusable=',priorAt);
  assert.ok(priorAt>0&&reuseAt>priorAt);
  const priorBlock=workflow.slice(priorAt,reuseAt);
  assert.match(priorBlock,/priorMultiplayer\.passed===true/);
  assert.match(priorBlock,/priorMultiplayer\.artifactIdentity===artifactIdentity/);
  assert.doesNotMatch(priorBlock,/sourceRevision|placeId|candidateVersionNumber/);
  assert.match(workflow,/const exactMultiplayerValidationReusable=exactPriorMultiplayerValidation\|\|staticMultiplayerCodePass/);
  assert.match(workflow,/item\.robloxMultiplayerQaPassed=true/);
  assert.match(workflow,/ROBLOX_F7_MULTIPLAYER_EVIDENCE_REUSED=/);
});

test('exact local F0 artifact rebinds prior Studio evidence instead of replaying identical bytes',()=>{
  assert.match(workflow,/const reusableLocalStudioArtifactEvidence=Boolean\(/);
  assert.match(workflow,/studioPlay\.artifactIdentity===artifactIdentity/);
  assert.match(workflow,/reusedFromExactArtifactIdentity:true/);
  assert.match(workflow,/historicalSourceRevision/);
  assert.match(workflow,/historicalVersionNumber/);
  assert.match(workflow,/ROBLOX_STUDIO_EXACT_ARTIFACT_EVIDENCE_REBOUND=/);
});


test('foundation QA has no periodic cron fanout and newest same-game work supersedes stale runs',()=>{
  const head=workflow.slice(0,workflow.indexOf('\njobs:\n'));
  assert.doesNotMatch(head,/schedule:/);
  assert.match(head,/cancel-in-progress: true/);
  assert.match(workflow,/process\.stdout\.write\(String\(ids\[ids\.length-1\]\)\)/);
});


test('batch scan cancels stale queued and running foundation runs before heavy work',()=>{
  const head=workflow.slice(0,workflow.indexOf('\njobs:\n'));
  const dedupe=workflow.slice(workflow.indexOf('\n  dedupe:'),workflow.indexOf('\n  runtime-foundation-qa:'));
  const cleanup=dedupe.slice(dedupe.indexOf('Cancel stale queued foundation runs before batch scan'),dedupe.indexOf('Select newest same-identity runtime foundation run'));
  assert.match(head,/group: roblox-runtime-foundation-\$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.match(dedupe,/runs-on: ubuntu-slim/);
  assert.match(cleanup,/Cancel stale queued foundation runs before batch scan/);
  assert.match(cleanup,/github\.event_name != 'workflow_dispatch' \|\| inputs\.game_id == ''/);
  assert.match(cleanup,/const states=new Set\(\['queued','pending','requested','in_progress'\]\)/);
  assert.match(dedupe,/head_sha/);
  assert.match(dedupe,/actions\/runs\/\$run_id\/cancel/);
  assert.match(dedupe,/ROBLOX_STALE_FOUNDATION_RUN_CANCELLED=/);
  assert.match(dedupe,/ROBLOX_STALE_FOUNDATION_RUN_CANCEL_COUNT=/);
});


test('runtime foundation workflow retriggers when its deterministic QA contract changes',()=>{
  const head=workflow.slice(0,workflow.indexOf('\njobs:\n'));
  for(const path of [
    'qa/company-development-roblox-runtime-foundation.test.mjs',
    'qa/company-development-roblox-headless-fast-mvp.test.mjs',
    'qa/company-development-roblox-studio-local-play.test.mjs',
    'qa/company-tester-debug-intake.test.mjs',
  ]) assert.ok(head.includes(path),path);
});


test('runtime-state persistence defines its local F0 candidate resolver in the same Node scope',()=>{
  const start=workflow.indexOf('      - name: Read exact runtime sentinel and persist tester QA evidence');
  const end=workflow.indexOf('\n      - name:',start+20);
  assert.ok(start>=0&&end>start);
  const block=workflow.slice(start,end);
  const helperAt=block.indexOf('const candidateForItem=item=>');
  const useAt=block.indexOf('const candidate=candidateForItem(item)');
  assert.ok(helperAt>0&&useAt>helperAt);
  assert.match(block,/authority:'roblox-local-f0-pre-f9-artifact'/);
  assert.match(block,/f0\.artifactIdentity===artifactIdentity/);
  assert.match(block,/versionNumber:artifactRunId/);
});


test('runtime QA collapses F9 fanout to one scan for all ready games',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const start=workflow.indexOf('Dispatch one F9 scan for all runtime-accepted candidates');
  const end=workflow.indexOf('Dispatch exact Studio MCP follow-up',start);
  const block=workflow.slice(start,end);
  assert.ok(start>0&&end>start);
  assert.match(block,/company-development-roblox-final-review-revalidation\.yml --repo "\$GITHUB_REPOSITORY" --ref main\n/);
  assert.match(block,/ROBLOX_F9_SCAN_DISPATCHED=candidates=/);
  assert.doesNotMatch(block,/-f game_id=/);
  assert.doesNotMatch(block,/while read -r id/);
});
