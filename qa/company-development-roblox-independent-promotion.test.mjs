import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');

test('Roblox classification promotion has no package checkpoint',()=>{
  assert.ok(!workflow.includes('technical-plan:'));
  assert.ok(!workflow.includes('company-development-roblox-package.mjs'));
  assert.ok(!workflow.includes('qa/company-development-roblox-package.test.mjs'));
  assert.ok(!workflow.includes('robloxBuildOrPackagePassed'));
  assert.ok(!workflow.includes('roblox-package-result-missing'));
  assert.ok(!workflow.includes('TARGET_PLATFORM_BUILD_OR_PACKAGE'));
});

test('Roblox source promotion is item-scoped and one failure does not block other classified games',()=>{
  assert.ok(workflow.includes("ROBLOX_PER_GAME_PROMOTION=YES"));
  assert.ok(workflow.includes("ROBLOX_PROMOTION_COUNT_GATE=NONE"));
  assert.ok(workflow.includes("ROBLOX_EXECUTION_WIP_MAX=2"));
  assert.ok(workflow.includes("const candidates=[...(q.items||[])].sort((a,b)=>Number(Boolean(a.robloxSourceBootstrapFailedAt))-Number(Boolean(b.robloxSourceBootstrapFailedAt)))"));
  assert.match(workflow,/Record isolated source failures without blocking other games[\s\S]*ROBLOX_OTHER_GAME_PROMOTION_BLOCKED=NO/);
  assert.match(workflow,/Dispatch next Roblox source execution slice when other eligible work remains[\s\S]*if: needs\.source-plan\.outputs\.count != '0'/);
  assert.ok(!workflow.includes('ROBLOX_NEXT_BATCH_BLOCKER=CURRENT_SOURCE_BATCH_FAILED'));
  assert.ok(workflow.includes('if(Boolean(item.robloxSourceBootstrapFailedAt))continue;'));
  assert.ok(workflow.includes("status:'ACTIVE',currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'WAITING_TARGET_PLATFORM_VALIDATION'"));
});
