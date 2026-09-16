import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveVibeDevelopmentExecution } from '../tools/vibe2-development-execution-policy.mjs';
import { runVibe2ImplementationWorker } from '../tools/vibe2-implementation-worker.mjs';

const root='roblox-games/seed-roblox-obby-party-minigam-tower-of-hell';
const r2Task={id:'OWNER-ROBLOX-OBBY-WORLD-CORE-20260916-R2',target:'roblox',ownerDirective:true,fullRebuild:true,rebuildMode:'FULL_REBUILD',responsibleFiles:[`${root}/server/Game.server.luau`,`${root}/client/Game.client.luau`],goal:'FULL_REBUILD Roblox obby world core with checkpoints, obstacle course, and read-only progress HUD',evidence:['owner-directive:full-roblox-game-rebuild','rebuild-phase:world-core']};
const r5Task={id:'OWNER-ROBLOX-OBBY-AUTONOMOUS-BALANCE-20260916-R5',target:'roblox',ownerDirective:true,fullRebuild:false,rebuildMode:'INCREMENTAL',responsibleFiles:[`${root}/server/Game.server.luau`,`${root}/client/Game.client.luau`],goal:'PHASE_4_AUTONOMOUS_PLAYTEST_BALANCE',evidence:['development-phase:autonomous-playtest-balance','ai-required:false','qa-required:input-based-playtest-evidence','qa-required:stage-telemetry']};

test('platform-decided structured Roblox work uses deterministic worker without AI',()=>{
  const plan=resolveVibeDevelopmentExecution({task:r2Task,target:'roblox',route:'text-source-worker'});
  assert.equal(plan.platformDecisionResolved,true);assert.equal(plan.deterministicFirst,true);assert.equal(plan.aiAllowed,false);assert.equal(plan.aiRequired,false);assert.equal(plan.aiAssist,false);assert.equal(plan.aiFallbackAvailable,false);assert.equal(plan.executor,'deterministic-source-worker');assert.equal(plan.recipe,'roblox-obby-world-core-v1');
});

test('server-only legacy responsibility remains compatible with the obby deterministic recipe',()=>{
  const plan=resolveVibeDevelopmentExecution({task:{...r2Task,responsibleFiles:['server/Game.server.luau']},target:'roblox',route:'text-source-worker'});assert.equal(plan.executor,'deterministic-source-worker');assert.equal(plan.recipe,'roblox-obby-world-core-v1');
});

test('server plus client HUD responsibility resolves the same deterministic recipe',()=>{
  const plan=resolveVibeDevelopmentExecution({task:{...r2Task,responsibleFiles:['server/Game.server.luau','client/Game.client.luau']},target:'roblox',route:'text-source-worker'});assert.equal(plan.executor,'deterministic-source-worker');assert.equal(plan.recipe,'roblox-obby-world-core-v1');
});

test('Skyline R5 autonomous balance resolves a dedicated deterministic recipe without AI',()=>{
  const plan=resolveVibeDevelopmentExecution({task:r5Task,target:'roblox',route:'text-source-worker'});assert.equal(plan.aiAllowed,false);assert.equal(plan.aiAssist,false);assert.equal(plan.executor,'deterministic-source-worker');assert.equal(plan.recipe,'roblox-obby-autonomous-balance-v1');
});

test('R5 recipe cannot be selected for non-owner or unrelated Roblox work',()=>{
  const noOwner=resolveVibeDevelopmentExecution({task:{...r5Task,ownerDirective:false},target:'roblox',route:'text-source-worker'});assert.equal(noOwner.executor,'deterministic-capability-gap');
  const unrelated=resolveVibeDevelopmentExecution({task:{...r5Task,evidence:[],goal:'unrelated feature'},target:'roblox',route:'text-source-worker'});assert.equal(unrelated.executor,'deterministic-capability-gap');
});

test('unstructured source work becomes a deterministic capability gap instead of AI fallback',()=>{
  const plan=resolveVibeDevelopmentExecution({task:{target:'roblox',responsibleFiles:['server/Feature.server.luau'],goal:'implement a novel system'},target:'roblox',route:'text-source-worker'});assert.equal(plan.platformDecisionResolved,true);assert.equal(plan.deterministicFirst,true);assert.equal(plan.aiAllowed,false);assert.equal(plan.aiAssist,false);assert.equal(plan.aiFallbackAvailable,false);assert.equal(plan.executor,'deterministic-capability-gap');assert.equal(plan.reason,'deterministic-recipe-required');
});

test('explicit AI request is blocked by central no-AI execution policy',()=>{
  const plan=resolveVibeDevelopmentExecution({task:{target:'roblox',responsibleFiles:['server/Feature.server.luau'],goal:'novel system',aiRequired:true},target:'roblox',route:'text-source-worker'});assert.equal(plan.aiRequested,true);assert.equal(plan.aiAllowed,false);assert.equal(plan.aiRequired,false);assert.equal(plan.aiAssist,false);assert.equal(plan.executor,'deterministic-capability-gap');assert.equal(plan.reason,'ai-disabled-by-central-policy');
});

test('AI request cannot override an available deterministic recipe',()=>{
  const plan=resolveVibeDevelopmentExecution({task:{...r2Task,aiRequired:true},target:'roblox',route:'text-source-worker'});assert.equal(plan.aiRequested,true);assert.equal(plan.aiAllowed,false);assert.equal(plan.aiAssist,false);assert.equal(plan.executor,'deterministic-source-worker');assert.equal(plan.recipe,'roblox-obby-world-core-v1');
});

test('editor route does not become AI-dependent',()=>{
  const plan=resolveVibeDevelopmentExecution({task:{target:'roblox'},target:'roblox',route:'engine-editor'});assert.equal(plan.aiAllowed,false);assert.equal(plan.aiRequired,false);assert.equal(plan.aiAssist,false);assert.equal(plan.executor,'engine-editor');
});

test('implementation worker contains no AI runtime or source-worker fallback',()=>{
  assert.equal(typeof runVibe2ImplementationWorker,'function');const source=fs.readFileSync(new URL('../tools/vibe2-implementation-worker.mjs',import.meta.url),'utf8');assert.doesNotMatch(source,/ollama/i);assert.doesNotMatch(source,/vibe2-source-worker\.mjs/);assert.doesNotMatch(source,/ai-source-worker/);assert.match(source,/VIBE2_DETERMINISTIC_CAPABILITY_GAP/);
});

test('Skyline R5 physical playtest requires VirtualInput and forbids teleport traversal',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-roblox-skyline-input-playtest.mjs',import.meta.url),'utf8');assert.match(source,/CreateVirtualInput\(\)/);assert.match(source,/SendKey/);assert.match(source,/physical-stage-%02d/);assert.match(source,/stalledMs/);assert.match(source,/inputBased=true/);assert.doesNotMatch(source,/root\.CFrame\s*=/);assert.doesNotMatch(source,/HumanoidRootPart[^\n]*CFrame\s*=/);
});

test('central machine policy fixes long-horizon self-directed no-AI autonomy',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../.vibe2/central-policy.json',import.meta.url),'utf8'));assert.equal(policy.autonomy.mode,'long-horizon-self-directed');assert.equal(policy.autonomy.aiCallsAllowed,false);assert.equal(policy.autonomy.assistantPerGameDesignDependency,false);assert.equal(policy.autonomy.internalFailureMustFailWorker,true);assert.equal(policy.autonomy.sourceChangeRequiresIncrementalQa,true);assert.deepEqual(policy.autonomy.closedLoop,['detect','design','implement','incremental-qa','runtime-qa','repair','retest','verified-learning']);
});
