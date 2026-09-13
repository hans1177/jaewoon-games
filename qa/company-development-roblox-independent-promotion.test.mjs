import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');

test('Roblox promotion is per-game while technical evidence remains required',()=>{
  assert.ok(workflow.includes('ROBLOX_PER_GAME_PROMOTION=YES'));
  assert.ok(workflow.includes('ROBLOX_PROMOTION_COUNT_GATE=NONE'));
  assert.ok(workflow.includes('ROBLOX_EXECUTION_WIP_MAX=2'));
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
