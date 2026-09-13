import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');

test('Roblox promotion is per-game and has no count/package promotion gate',()=>{
  assert.ok(workflow.includes("ROBLOX_PER_GAME_PROMOTION=YES"));
  assert.ok(workflow.includes("ROBLOX_PROMOTION_COUNT_GATE=NONE"));
  assert.ok(workflow.includes("ROBLOX_EXECUTION_WIP_MAX=2"));
  assert.ok(workflow.includes("const candidates=[...(q.items||[])].sort((a,b)=>Number(Boolean(a.robloxSourceBootstrapFailedAt))-Number(Boolean(b.robloxSourceBootstrapFailedAt)))"));
  assert.ok(workflow.includes("const candidates=[...(q.items||[])].sort((a,b)=>Number(Boolean(a.robloxBuildFailedAt))-Number(Boolean(b.robloxBuildFailedAt)))"));
  assert.match(workflow,/Dispatch next Roblox source execution slice when other eligible work remains[\s\S]*if: needs\.source-plan\.outputs\.count != '0'/);
  assert.match(workflow,/Dispatch next Roblox technical execution slice when other exact-source work remains[\s\S]*if: needs\.technical-plan\.outputs\.count != '0'/);
  assert.ok(!workflow.includes("ROBLOX_NEXT_BATCH_BLOCKER=CURRENT_SOURCE_BATCH_FAILED"));
  assert.ok(!workflow.includes("ROBLOX_NEXT_TECHNICAL_BATCH_BLOCKER=CURRENT_PACKAGE_BATCH_FAILED"));
  assert.ok(workflow.includes("ROBLOX_OTHER_GAME_PROMOTION_BLOCKED=NO"));
});

test('five distinct leads remain a per-game evidence stage, not a game-count quota',()=>{
  assert.ok(workflow.includes("robloxFailureStage:'FIVE_DISTINCT_LEAD_BUILD_PREFLIGHT'"));
  assert.ok(workflow.includes("robloxBuildSourceRevision:result.sourceRevision"));
});
