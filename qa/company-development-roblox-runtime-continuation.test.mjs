import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectRobloxBuildPreflight} from '../tools/company-development-roblox-build-preflight.mjs';

const preflight=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime-continuation.yml',import.meta.url),'utf8');
const headless=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-headless-fast-mvp.yml',import.meta.url),'utf8');
const headlessEvaluator=fs.readFileSync(new URL('../tools/company-development-roblox-headless-fast-mvp.mjs',import.meta.url),'utf8');
const parent=fs.readFileSync(new URL('../.github/workflows/company-development-confirmed-runtime.yml',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
const directive=JSON.parse(fs.readFileSync(new URL('../company-directive.json',import.meta.url),'utf8'));

test('Roblox native path is package -> shared preflight -> F0 -> private runtime candidate -> actual tester QA',()=>{
  assert.ok(preflight.includes('workflow_dispatch:'));
  assert.ok(!preflight.includes('company-development-roblox-package.mjs'));
  assert.ok(preflight.includes('company-development-roblox-build-preflight.mjs'));
  assert.ok(preflight.includes("model: 'llama3.2:1b'"));
  assert.ok(preflight.includes('Run Vibe plus shared-model build preflight'));
  assert.ok(preflight.includes('company-development-roblox-headless-fast-mvp.yml'));
  assert.ok(headless.includes('Roblox F0 Source Preflight'));
  assert.ok(headless.includes('company-development-roblox-headless-fast-mvp.mjs'));
  assert.ok(headless.includes('company-development-roblox-runtime.yml'));
  assert.ok(runtime.includes('company-development-roblox-release-promotion.yml'));
});

test('shared preflight requires exact immutable build and one shared model',()=>{
  const item={
    gameId:'g',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX',
    robloxSourceBootstrapPassedAt:'2026-09-22T00:00:00Z',
    robloxSourceCommit:'a'.repeat(40),robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
  };
  const result=inspectRobloxBuildPreflight({item,directive});
  assert.equal(result.pass,true,result.blockers.join(','));
  assert.equal(result.distinctLeadCount,1);
  assert.equal(result.sharedModel,'llama3.2:1b');
});

test('shared preflight admits canonical Roblox Unity concurrent lane without changing selected platform',()=>{
  const item={
    gameId:'dual',productionClass:'DEVELOPMENT_CONFIRMED',
    selectedPlatform:'UNITY',targetPlatform:'UNITY',
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
    robloxSourceBootstrapPassedAt:'2026-09-22T00:00:00Z',
    robloxSourceCommit:'a'.repeat(40),robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
  };
  const result=inspectRobloxBuildPreflight({item,directive});
  assert.equal(result.pass,true,result.blockers.join(','));
  assert.equal(result.robloxLaneEligible,true);
  assert.equal(result.directRoblox,false);
  assert.equal(result.concurrentRoblox,true);
  assert.ok(!result.blockers.includes('roblox-platform-required'));
  assert.equal(item.selectedPlatform,'UNITY');
  assert.equal(item.targetPlatform,'UNITY');
});

test('continuation planner recognizes canonical concurrent Roblox lane before owner-focus fallback',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  assert.match(workflow,/platformExecutionMode\|\|''\)\.toUpperCase\(\)==='ROBLOX_UNITY_CONCURRENT_SAME_GAME'/);
  assert.match(workflow,/item\.concurrentTargetPlatforms\.some\(value=>String\(value\|\|''\)\.toUpperCase\(\)==='ROBLOX'\)/);
  assert.match(workflow,/const secondaryOwnerFocus=platform!=='ROBLOX'&&!concurrentRoblox&&ownerFocusedSecondaryPlatformEligible/);
  assert.match(workflow,/if\(platform!=='ROBLOX'&&!concurrentRoblox&&!secondaryOwnerFocus\)continue/);
});

test('continuation retries the superseded Roblox-only platform blocker for canonical concurrent games',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  assert.match(workflow,/const priorPreflightEvidence=secondaryOwnerFocus\?item\.ownerFocusRobloxBuildPreflightEvidence:item\.robloxBuildPreflightEvidence/);
  assert.match(workflow,/priorBlockers\.every\(blocker=>blocker==='roblox-platform-required'\)/);
  assert.match(workflow,/&&concurrentRoblox/);
  assert.match(workflow,/ROBLOX_PREFLIGHT_SUPERSEDED_PLATFORM_BLOCKER_RETRY=/);
  assert.match(workflow,/\|\|supersededConcurrentPlatformBlocker/);
});

test('preflight persistence promotes only exact source and artifact',()=>{
  assert.ok(preflight.includes('result?.sourceRevision===sourceRevision'));
  assert.ok(preflight.includes('result?.artifactIdentity===artifactIdentity'));
  assert.ok(preflight.includes('robloxBuildPreflightPassed:true'));
  assert.ok(preflight.includes("robloxFailureStage:'F0_SOURCE_INTEGRITY'"));
  assert.ok(preflight.includes("robloxFailureSignature:'ROBLOX_F0_SOURCE_PREFLIGHT_PENDING'"));
});

test('F0 source preflight validates source integrity and explicitly cannot claim actual runtime',()=>{
  for(const token of ['duplicateDeclarationGuard','foundationSentinelContract','sourceStartupMarkers','f0SourceIntegrityPassed','actualRuntimeEvidence:false','runtimeFoundationPassed:false']){
    assert.ok(headlessEvaluator.includes(token),token);
  }
  assert.ok(headless.includes('rebuilt'));
  assert.ok(headless.includes('EXPECTED_ARTIFACT'));
  assert.ok(headless.includes('robloxFoundationF0Passed=exact'));
  assert.ok(headless.includes("item.currentStep='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'"));
});

test('canonical native parent calls Roblox runtime while Roblox runtime watches both fast-path workflow contracts',()=>{
  assert.ok(parent.includes('uses: ./.github/workflows/company-development-roblox-runtime.yml'));
  assert.ok(runtime.includes("- '.github/workflows/company-development-roblox-runtime-continuation.yml'"));
  assert.ok(runtime.includes("- '.github/workflows/company-development-roblox-headless-fast-mvp.yml'"));
});

test('already preflight-ready games wake F0 without requiring a new preflight pass in the same run',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  assert.match(workflow,/f0_ready_count:/);
  assert.match(workflow,/ROBLOX_EXISTING_F0_READY_COUNT=/);
  assert.match(workflow,/needs: \[preflight-plan, preflight-persist\]/);
  assert.match(workflow,/needs\.preflight-plan\.outputs\.f0_ready_count != '0'/);
  assert.match(workflow,/needs\.preflight-persist\.outputs\.pass_count != '0'/);
});

test('shared Roblox preflight checkout fans out without an internal six-game cap',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  assert.doesNotMatch(workflow,/rows\.length>=6/);
  assert.match(workflow,/rows\.length>=256/);
  assert.doesNotMatch(workflow,/max-parallel:\s*6/);
  assert.match(workflow,/ROBLOX_EXECUTION_WIP_MAX=EXTERNAL_PROVIDER_CAPACITY_ONLY/);
  assert.match(workflow,/ROBLOX_PREFLIGHT_CHECKOUT_MODE=PER_GAME_MATRIX_PARALLEL/);
  assert.doesNotMatch(workflow,/ROBLOX_AUTHENTICATED_RUNNER_WIP_MAX/);
});

test('F0 readiness follows canonical central Roblox validation mode instead of queue-local robloxValidationMode',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  assert.ok(workflow.includes("const canonicalRobloxValidationMode=String(roadmap.roblox?.validationMode||'').trim();"));
  assert.ok(workflow.includes("if(canonicalRobloxValidationMode!=='HEADLESS_FAST_MVP')throw new Error('ROBLOX_CANONICAL_VALIDATION_MODE_INVALID:'+canonicalRobloxValidationMode);"));
  assert.ok(workflow.includes('ROBLOX_CANONICAL_VALIDATION_MODE='));
  assert.doesNotMatch(workflow,/item\.robloxValidationMode/);
});

test('Roblox preflight persistence does not hold a global writer job lock and retries semantic writes on conflict',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const start=workflow.indexOf('\n  preflight-persist:\n');
  const end=workflow.indexOf('\n  dispatch-headless:\n',start);
  const block=workflow.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.doesNotMatch(block,/group:\s*company-runtime-writer/);
  assert.match(block,/ROBLOX_PREFLIGHT_PERSIST_OPTIMISTIC_ATTEMPT=/);
  assert.match(block,/ROBLOX_PREFLIGHT_PERSIST_CONFLICT_RETRY=/);
  assert.match(block,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.doesNotMatch(block,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
});

test('Roblox continuation serializes only the same preflight identity and dispatches exact F0 work independently',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const header=workflow.slice(0,workflow.indexOf('\njobs:\n'));
  assert.match(header,/run-name: Roblox shared preflight · \$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  assert.match(header,/concurrency:\n\s+group: roblox-shared-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}\n\s+cancel-in-progress: false/);
  assert.match(workflow,/actions\/workflows\/company-development-roblox-headless-fast-mvp\.yml\/runs\?per_page=100/);
  assert.match(workflow,/ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCH=DEDUPED_ACTIVE:/);
  assert.match(workflow,/gh workflow run company-development-roblox-headless-fast-mvp\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$id"/);
  assert.match(workflow,/ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCH_COUNT=/);
  assert.doesNotMatch(workflow,/ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCHED=YES:BATCH/);
});

test('shared preflight continuation keeps exact game targeting with same-game-only workflow locking',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const header=workflow.slice(0,workflow.indexOf('\njobs:\n'));
  assert.match(workflow,/run-name: Roblox shared preflight · \$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  assert.match(workflow,/workflow_dispatch:[\s\S]*game_id:/);
  assert.match(header,/concurrency:\n\s+group: roblox-shared-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}\n\s+cancel-in-progress: false/);
  assert.match(workflow,/REQUESTED_GAME_ID: \$\{\{ inputs\.game_id \|\| '' \}\}/);
  assert.match(workflow,/if\(requested&&item\.gameId!==requested\)continue/);
  assert.match(workflow,/if\(requested&&item\.gameId!==requested\)return false/);
  assert.match(workflow,/company-development-roblox-headless-fast-mvp\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$id"/);
  assert.match(workflow,/ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCH=DEDUPED_ACTIVE:/);
});


test('continuation workflow and planner collapse duplicate same-game dispatches without cross-game locking',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.match(workflow.slice(0,jobsAt),/\nconcurrency:\n\s+group: roblox-shared-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}\n\s+cancel-in-progress: false/);
  const preflightPlanAt=workflow.indexOf('\n  preflight-plan:\n');
  const preflightWorkerAt=workflow.indexOf('\n  preflight-worker:\n',preflightPlanAt);
  assert.ok(preflightPlanAt>0&&preflightWorkerAt>preflightPlanAt);
  const preflightPlan=workflow.slice(preflightPlanAt,preflightWorkerAt);
  assert.doesNotMatch(preflightPlan,/\n\s+concurrency:/);
  assert.match(workflow.slice(0,jobsAt),/group: roblox-shared-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
});

test('continuation control jobs use slim runners while model preflight stays on full game capacity',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const section=(name,next)=>{
    const start=workflow.indexOf('\n  '+name+':\n');
    assert.ok(start>=0,name);
    const end=next?workflow.indexOf('\n  '+next+':\n',start):workflow.length;
    return workflow.slice(start,end);
  };
  assert.match(section('preflight-plan','preflight-worker'),/runs-on:\s*ubuntu-slim/);
  assert.match(section('preflight-worker','preflight-persist'),/runs-on:\s*ubuntu-latest/);
  assert.match(section('preflight-persist','dispatch-headless'),/runs-on:\s*ubuntu-slim/);
  assert.match(section('dispatch-headless',null),/runs-on:\s*ubuntu-slim/);
});
