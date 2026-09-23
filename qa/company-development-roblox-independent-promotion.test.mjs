import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
const parentWorkflow=fs.readFileSync(new URL('../.github/workflows/company-development-confirmed-runtime.yml',import.meta.url),'utf8');

test('Roblox promotion is per-game while technical evidence remains required',()=>{
  assert.ok(workflow.includes('ROBLOX_PER_GAME_PROMOTION=YES'));
  assert.ok(workflow.includes('ROBLOX_PROMOTION_COUNT_GATE=NONE'));
  assert.ok(workflow.includes('ROBLOX_RUNNER_PARALLEL_CAPACITY=6'));
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

test('five distinct leads remain a per-game evidence stage, not a game-count quota',()=>{
  assert.ok(workflow.includes("robloxFailureStage:'FIVE_DISTINCT_LEAD_BUILD_PREFLIGHT'"));
  assert.ok(workflow.includes('robloxBuildSourceRevision:result.sourceRevision'));
  assert.ok(workflow.includes("routingBlockers:['roblox-build-preflight-pending']"));
});

test('already-preflighted retryable runtime work dispatches the existing continuation',()=>{
  assert.ok(workflow.includes('let packagePending=0,preflightReady=0,runtimeReady=0,externalBlocked=0;'));
  assert.ok(workflow.includes("runtimePassed!==true||String(runtimeHarness||'')!==harnessVersion"));
  assert.ok(workflow.includes("['roblox-studio-authentication-required','roblox-studio-local-profile-unavailable'].includes(runtimeEvidence?.failure)"));
  assert.ok(workflow.includes('if(securityBlocked)externalBlocked++;'));
  assert.ok(workflow.includes('else runtimeReady++;'));
  assert.ok(workflow.includes('ROBLOX_RUNTIME_READY_COUNT=$runtime_ready'));
  assert.match(workflow,/package_pending.*preflight_ready.*runtime_ready/);
  assert.match(workflow,/\$runtime_ready.*\^\[1-9\]\[0-9\]\*\$/);
  assert.ok(workflow.includes('gh workflow run company-development-roblox-runtime-continuation.yml'));
});

test('merged Roblox source stays in the Roblox lane while the central orchestrator dispatches both native lanes',()=>{
  assert.ok(parentWorkflow.includes('company-development-roblox-runtime.yml'));
  assert.ok(parentWorkflow.includes('company-development-unity-runtime.yml'));
  assert.ok(parentWorkflow.includes('BIDIRECTIONAL_AUTO_PAIR=YES'));
  assert.ok(parentWorkflow.includes('UNITY_WEB_RUNTIME_DISPATCH_COUNT'));
  assert.ok(parentWorkflow.includes('UNITY_WEB_RUNTIME_ROLE=NON_BLOCKING_VALIDATION_SURFACE'));
  assert.ok(workflow.includes('persist Roblox source-bind results'));
  assert.ok(workflow.includes('technical-plan:'));
  assert.ok(workflow.includes('DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE'));
});
