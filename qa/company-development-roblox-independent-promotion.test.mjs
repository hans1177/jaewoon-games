import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
const parentWorkflow=fs.readFileSync(new URL('../.github/workflows/company-development-confirmed-runtime.yml',import.meta.url),'utf8');

test('Roblox promotion is per-game while technical evidence remains required',()=>{
  assert.ok(workflow.includes('ROBLOX_PER_GAME_PROMOTION=YES'));
  assert.ok(workflow.includes('ROBLOX_PROMOTION_COUNT_GATE=NONE'));
  assert.ok(workflow.includes('ROBLOX_RUNNER_PARALLEL_CAPACITY=EXTERNAL_PROVIDER_MANAGED'));
  assert.ok(workflow.includes('technical-plan:'));
  assert.ok(workflow.includes('technical-worker:'));
  assert.ok(workflow.includes('technical-persist:'));
  assert.ok(workflow.includes('company-development-roblox-package.mjs'));
  assert.ok(workflow.includes('robloxBuildOrPackagePassed'));
  assert.ok(workflow.includes('TARGET_PLATFORM_BUILD_OR_PACKAGE'));
});

test('technical worker runs from its own successful plan even when source work is skipped',()=>{
  assert.match(workflow,/technical-worker:[\s\S]*needs: technical-plan[\s\S]*if: always\(\) && needs\.technical-plan\.result == 'success' && needs\.technical-plan\.outputs\.count != '0'/);
  assert.ok(workflow.includes("const isOrchestrationMissing=item=>String(item.robloxFailureSignature||'')==='roblox-package-result-missing';"));
});

test('one Roblox game failure does not block unrelated game execution',()=>{
  assert.match(workflow,/Dispatch next Roblox source execution slice when other eligible work remains[\s\S]*if: needs\.source-plan\.outputs\.count != '0'/);
  assert.match(workflow,/Dispatch next Roblox technical execution slice when other exact-source work remains[\s\S]*if: needs\.technical-plan\.outputs\.count != '0'/);
  assert.ok(!workflow.includes('ROBLOX_NEXT_BATCH_BLOCKER=CURRENT_SOURCE_BATCH_FAILED'));
  assert.ok(!workflow.includes('ROBLOX_NEXT_TECHNICAL_BATCH_BLOCKER=CURRENT_PACKAGE_BATCH_FAILED'));
  assert.ok(workflow.includes('ROBLOX_OTHER_GAME_PROMOTION_BLOCKED=NO'));
});

test('shared-model preflight remains a per-game evidence stage without adding a game-count quota',()=>{
  assert.ok(workflow.includes("VIBE_SHARED_MODEL_BUILD_PREFLIGHT"));
  assert.ok(workflow.includes('ROBLOX_PACKAGE_PREFLIGHT_FUSION=ENABLED'));
  assert.ok(workflow.includes('robloxBuildSourceRevision:result.sourceRevision'));
  assert.ok(workflow.includes('result.preflightEvidence?.artifactIdentity===result.artifactIdentity'));
});

test('preflight or F0 recovery work uses continuation while fused F0 success dispatches runtime directly',()=>{
  assert.ok(workflow.includes('let packagePending=0,preflightReady=0,f0Ready=0,externalBlocked=0;'));
  assert.ok(workflow.includes("const f0Passed=secondaryOwnerFocus?false:item.robloxFoundationF0Passed===true;"));
  assert.ok(workflow.includes('f0Ready++;'));
  assert.ok(workflow.includes('ROBLOX_F0_READY_COUNT=$f0_ready'));
  assert.match(workflow,/package_pending.*preflight_ready.*f0_ready/);
  assert.ok(workflow.includes('gh workflow run company-development-roblox-runtime-continuation.yml'));
  assert.ok(workflow.includes('ROBLOX_PRIVATE_RUNTIME_RETRY_DISPATCH='));
  assert.ok(workflow.includes('gh workflow run company-development-roblox-release-promotion.yml'));
});

test('merged Roblox source stays in the Roblox lane while the central orchestrator calls both upper-platform lanes',()=>{
  assert.match(parentWorkflow,/uses: \.\/\.github\/workflows\/company-development-roblox-runtime\.yml/);
  assert.match(parentWorkflow,/uses: \.\/\.github\/workflows\/company-development-unity-runtime\.yml/);
  assert.match(parentWorkflow,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.match(parentWorkflow,/UPPER_PLATFORM_ELIGIBLE_IDS=/);
  assert.match(parentWorkflow,/UPPER_PLATFORM_GRANDFATHERED_IDS=/);
  assert.doesNotMatch(parentWorkflow,/BIDIRECTIONAL_AUTO_PAIR=YES/);
  assert.doesNotMatch(parentWorkflow,/UNITY_WEB_RUNTIME_ROLE=NON_BLOCKING_VALIDATION_SURFACE/);
  assert.ok(workflow.includes('persist Roblox source-bind results'));
  assert.ok(workflow.includes('technical-plan:'));
  assert.ok(workflow.includes('DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE'));
});
