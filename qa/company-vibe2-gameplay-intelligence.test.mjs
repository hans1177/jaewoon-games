import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveGameplaySketch,
  analyzeExistingGameSource,
  buildVibePatchPlan,
  buildVibeDevelopmentContext,
  clipPreservedSourceForModel,
} from '../tools/company-vibe2-gameplay-intelligence.mjs';
import {buildApprovedScopeGenerationPrompt} from '../tools/company-development-web-bootstrap.mjs';

const inventory=[
  {id:'scope-map',path:'world.map',label:'explore map regions and routes'},
  {id:'scope-npc',path:'world.npc',label:'interact with npc and object'},
  {id:'scope-tower',path:'combat.tower',label:'tower placement strategy'},
  {id:'scope-progress',path:'progression.quest',label:'quest reward and unlock'},
];

test('GAMEPLAY_SKETCH preserves an explicit seed/design sketch',()=>{
  const explicit={version:3,worldModel:{regions:['A','B']},interactionGraph:{required:true}};
  const sketch=deriveGameplaySketch({baseline:{GAMEPLAY_SKETCH:explicit},inventory});
  assert.equal(sketch.source,'SEED_OR_DESIGN_GAMEPLAY_SKETCH');
  assert.deepEqual(sketch.worldModel.regions,['A','B']);
  assert.equal(sketch.interactionGraph.required,true);
});

test('derived GAMEPLAY_SKETCH turns approved scope into executable world contracts',()=>{
  const sketch=deriveGameplaySketch({gameId:'g',genre:'SINGLE_DEFENSE_STRATEGY',baseline:{content:{coreLoop:['enter','fight','reward']}},inventory});
  assert.equal(sketch.source,'DERIVED_FROM_LOCKED_DESIGN_BASELINE');
  assert.equal(sketch.worldModel.requiresPlayableSpace,true);
  assert.equal(sketch.interactionGraph.required,true);
  assert.equal(sketch.placementModel.required,true);
  assert.equal(sketch.combatModel.strategicOutcomeDifferenceRequired,true);
  assert.match(sketch.stateMachine.contract,/ENTRY -> INPUT -> CORE_ACTION/);
});

test('source analysis records save, functions, space and interaction capabilities',()=>{
  const html=`<!doctype html><main data-spatial-dimension="3d" data-npc="smith" data-interactable="true" data-area="yard" data-route-id="r1" data-player-z="0" data-camera-yaw="0"><script>function movePlayer(){} function talkToSmith(){} localStorage.setItem('save-v4','x'); addEventListener('pointerdown',()=>{}); let collisionCount=0; const raycastHit=true;</script></main>`;
  const analysis=analyzeExistingGameSource(html);
  assert.equal(analysis.present,true);
  assert.deepEqual(analysis.storageKeys,['save-v4']);
  assert.ok(analysis.functions.includes('movePlayer'));
  assert.equal(analysis.capabilities.threeDimensional,true);
  assert.equal(analysis.capabilities.interactions,true);
  assert.equal(analysis.capabilities.raycastOrPath,true);
});

test('patch plan preserves working source and orders missing real gameplay work',()=>{
  const gameplaySketch=deriveGameplaySketch({baseline:{content:{}},inventory});
  const sourceAnalysis=analyzeExistingGameSource(`<main><script>function saveGame(){} localStorage.setItem('save-key','1')</script></main>`);
  const plan=buildVibePatchPlan({gameplaySketch,sourceAnalysis,inventory,blockers:['ENTITY_INTERACTION_RESULT_REQUIRED']});
  const ids=plan.tasks.map(x=>x.id);
  assert.ok(ids.includes('PRESERVE_EXISTING_BEHAVIOR'));
  assert.ok(ids.includes('PRESERVE_SAVE_CONTRACT'));
  assert.ok(ids.includes('IMPLEMENT_PLAYABLE_SPACE'));
  assert.ok(ids.includes('IMPLEMENT_ENTITY_INTERACTIONS'));
  assert.ok(ids.includes('IMPLEMENT_POSITIONAL_PLACEMENT'));
  assert.ok(ids.includes('IMPLEMENT_DIVERGENT_STRATEGY_RESULTS'));
  assert.ok(ids.some(x=>x.startsWith('FIX_ENTITY_INTERACTION_RESULT_REQUIRED')));
  assert.deepEqual(plan.preserve.storageKeys,['save-key']);
});

test('long preserved source keeps both ends instead of silently losing tail systems',()=>{
  const source='HEAD_'+('a'.repeat(30000))+'_TAIL';
  const clipped=clipPreservedSourceForModel(source,4000);
  assert.ok(clipped.startsWith('HEAD_'));
  assert.ok(clipped.endsWith('_TAIL'));
  assert.match(clipped,/VIBE2_SOURCE_MIDDLE_OMITTED_FOR_CONTEXT/);
});

test('Vibe bootstrap injects development context before coding',()=>{
  const baseline={content:{coreLoop:['enter','fight','reward']}};
  const existingHtml=`<main><script>function saveGame(){} localStorage.setItem('save-v5','1')</script></main>`;
  const context=buildVibeDevelopmentContext({gameId:'g',genre:'SINGLE_DEFENSE_STRATEGY',baseline,inventory,existingHtml,blockers:['RUNTIME_REWORK_REQUIRED:FINAL_CONTENT_DEPTH_REWORK_REQUIRED']});
  const prompt=buildApprovedScopeGenerationPrompt({gameId:'g',gameName:'Game',baseline,inventory,existingHtml,preservationBlockers:['RUNTIME_REWORK_REQUIRED:FINAL_CONTENT_DEPTH_REWORK_REQUIRED'],developmentContext:context});
  assert.match(prompt,/VIBE_DEVELOPMENT_CONTEXT:/);
  assert.match(prompt,/DERIVED_FROM_LOCKED_DESIGN_BASELINE/);
  assert.match(prompt,/PATCH_EXISTING_RESPONSIBLE_SYSTEMS/);
  assert.match(prompt,/save-v5/);
  assert.match(prompt,/IMPLEMENT_POSITIONAL_PLACEMENT/);
  assert.match(prompt,/IMPLEMENT_DIVERGENT_STRATEGY_RESULTS/);
  assert.match(prompt,/EXISTING_HTML:/);
});
