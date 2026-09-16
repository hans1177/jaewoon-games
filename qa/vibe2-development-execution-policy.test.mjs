import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVibeDevelopmentExecution } from '../tools/vibe2-development-execution-policy.mjs';

const r2Task={
  id:'OWNER-ROBLOX-OBBY-WORLD-CORE-20260916-R2',
  target:'roblox',
  ownerDirective:true,
  fullRebuild:true,
  rebuildMode:'FULL_REBUILD',
  responsibleFiles:['roblox-games/seed-roblox-obby-party-minigam-tower-of-hell/server/Game.server.luau'],
  goal:'FULL_REBUILD Roblox obby world core with checkpoints and obstacle course',
  evidence:['owner-directive:full-roblox-game-rebuild','rebuild-phase:world-core']
};

test('platform-decided structured Roblox work uses deterministic worker without AI',()=>{
  const plan=resolveVibeDevelopmentExecution({task:r2Task,target:'roblox',route:'text-source-worker'});
  assert.equal(plan.platformDecisionResolved,true);
  assert.equal(plan.deterministicFirst,true);
  assert.equal(plan.aiRequired,false);
  assert.equal(plan.aiAssist,false);
  assert.equal(plan.executor,'deterministic-source-worker');
  assert.equal(plan.recipe,'roblox-obby-world-core-v1');
});

test('relative Roblox responsibility path resolves the same deterministic recipe',()=>{
  const plan=resolveVibeDevelopmentExecution({task:{...r2Task,responsibleFiles:['server/Game.server.luau']},target:'roblox',route:'text-source-worker'});
  assert.equal(plan.executor,'deterministic-source-worker');
  assert.equal(plan.recipe,'roblox-obby-world-core-v1');
});

test('unstructured source work may use AI assist but AI is not globally required',()=>{
  const plan=resolveVibeDevelopmentExecution({task:{target:'roblox',responsibleFiles:['server/Feature.server.luau'],goal:'implement a novel system'},target:'roblox',route:'text-source-worker'});
  assert.equal(plan.platformDecisionResolved,true);
  assert.equal(plan.aiRequired,false);
  assert.equal(plan.aiAssist,true);
  assert.equal(plan.executor,'ai-source-worker');
});

test('explicit task-level AI requirement remains possible',()=>{
  const plan=resolveVibeDevelopmentExecution({task:{...r2Task,aiRequired:true},target:'roblox',route:'text-source-worker'});
  assert.equal(plan.aiRequired,true);
  assert.equal(plan.aiAssist,true);
  assert.equal(plan.executor,'ai-source-worker');
});

test('editor route does not become AI-dependent',()=>{
  const plan=resolveVibeDevelopmentExecution({task:{target:'roblox'},target:'roblox',route:'engine-editor'});
  assert.equal(plan.aiRequired,false);
  assert.equal(plan.aiAssist,false);
  assert.equal(plan.executor,'engine-editor');
});
