import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveGameplaySketch,
  analyzeExistingGameSource,
  buildVibePatchPlan,
  buildDependencyAnalysis,
  buildFailureDrivenRepairLoop,
  buildRuntimeValidationPlan,
  runtimeValidationBlockers,
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

test('source analysis records save, functions, dependencies, space and interaction capabilities',()=>{
  const html=`<!doctype html><main data-spatial-dimension="3d" data-npc="smith" data-interactable="true" data-area="yard" data-route-id="r1" data-player-z="0" data-camera-yaw="0"><script>
function movePlayer(){ updateWorld(); }
function updateWorld(){ return true; }
function talkToSmith(){ updateWorld(); }
localStorage.getItem('save-v4'); localStorage.setItem('save-v4','x'); addEventListener('pointerdown',()=>{}); let collisionCount=0; const raycastHit=true; let gold=10; let wave=1; requestAnimationFrame(()=>{});
</script></main>`;
  const analysis=analyzeExistingGameSource(html);
  assert.equal(analysis.present,true);
  assert.deepEqual(analysis.storageKeys,['save-v4']);
  assert.deepEqual(analysis.storageReads,['save-v4']);
  assert.deepEqual(analysis.storageWrites,['save-v4']);
  assert.ok(analysis.functions.includes('movePlayer'));
  assert.ok(analysis.functionDependencies.includes('movePlayer->updateWorld'));
  assert.ok(analysis.functionDependencies.includes('talkToSmith->updateWorld'));
  assert.equal(analysis.capabilities.threeDimensional,true);
  assert.equal(analysis.capabilities.interactions,true);
  assert.equal(analysis.capabilities.raycastOrPath,true);
  assert.equal(analysis.capabilities.touchInput,true);
  assert.equal(analysis.capabilities.economy,true);
  assert.equal(analysis.capabilities.difficulty,true);
  assert.equal(analysis.capabilities.frameLoop,true);
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
  assert.ok(plan.verificationOrder.includes('LONG_GOAL_PLAY'));
  assert.ok(plan.verificationOrder.includes('REPLAY_REGRESSION'));
  assert.ok(plan.verificationOrder.includes('SAVE_RESTORE'));
});

test('dependency analysis and failure loop keep repairs targeted to responsible systems',()=>{
  const sourceAnalysis={storageKeys:['save-v9'],functions:['placeTower','resolveWave'],functionDependencies:['placeTower->resolveWave']};
  const patchPlan={tasks:[
    {id:'IMPLEMENT_PLAYABLE_SPACE',dependsOn:['PRESERVE_EXISTING_BEHAVIOR']},
    {id:'IMPLEMENT_POSITIONAL_PLACEMENT',dependsOn:['IMPLEMENT_PLAYABLE_SPACE']},
    {id:'FIX_TOWER_PLACEMENT_RESULT_REQUIRED',dependsOn:[]},
  ]};
  const dependency=buildDependencyAnalysis({sourceAnalysis,patchPlan});
  const repair=buildFailureDrivenRepairLoop({blockers:['TOWER_PLACEMENT_RESULT_REQUIRED','MOBILE_TOUCH_REQUIRED','SAVE_RESTORE_FAILED','ECONOMY_FREE_LOOP','DIFFICULTY_SPIKE','PERFORMANCE_FRAME_STALL','REPLAY_SAME_SEED_MISMATCH'],patchPlan});
  assert.deepEqual(dependency.protectedSaveKeys,['save-v9']);
  assert.ok(dependency.sourceFunctionEdges.includes('placeTower->resolveWave'));
  assert.ok(dependency.patchTaskEdges.includes('IMPLEMENT_PLAYABLE_SPACE->IMPLEMENT_POSITIONAL_PLACEMENT'));
  assert.equal(repair.mode,'FAILURE_DRIVEN_TARGETED_REPAIR');
  assert.equal(repair.version,3);
  assert.equal(repair.failures[0].type,'SPATIAL_GAMEPLAY');
  assert.equal(repair.failures[1].type,'MOBILE_RUNTIME');
  assert.equal(repair.failures[2].type,'SAVE_REGRESSION');
  assert.equal(repair.failures[3].type,'ECONOMY_BALANCE');
  assert.equal(repair.failures[4].type,'DIFFICULTY_CURVE');
  assert.equal(repair.failures[5].type,'PERFORMANCE_RUNTIME');
  assert.equal(repair.failures[6].type,'REPLAY_REGRESSION');
  assert.ok(repair.repairTaskIds.includes('IMPLEMENT_POSITIONAL_PLACEMENT'));
  assert.ok(repair.retryContract.includes('RUN_REPLAY_REGRESSION'));
  assert.ok(repair.retryContract.includes('VERIFY_SAVE_RESTORE'));
  assert.ok(repair.retryContract.includes('VERIFY_SOFTLOCK_ECONOMY_DIFFICULTY_PERFORMANCE_MOBILE'));
});

test('runtime validation plan requires independent long-goal replay and safety evidence',()=>{
  const gameplaySketch=deriveGameplaySketch({gameId:'g',genre:'SINGLE_DEFENSE_STRATEGY',baseline:{content:{}},inventory});
  const sourceAnalysis=analyzeExistingGameSource(`<main><script>localStorage.getItem('save-v2');localStorage.setItem('save-v2','{}');let gold=10;requestAnimationFrame(()=>{});</script></main>`);
  const plan=buildRuntimeValidationPlan({gameplaySketch,sourceAnalysis});
  assert.equal(plan.mode,'INDEPENDENT_RUNTIME_EVIDENCE');
  assert.equal(plan.longGoal.required,true);
  assert.equal(plan.replayRegression.required,true);
  assert.equal(plan.softlock.required,true);
  assert.equal(plan.saveRestore.required,true);
  assert.deepEqual(plan.saveRestore.protectedKeys,['save-v2']);
  assert.deepEqual(plan.saveRestore.readKeys,['save-v2']);
  assert.deepEqual(plan.saveRestore.writeKeys,['save-v2']);
  assert.equal(plan.economy.required,true);
  assert.equal(plan.difficulty.required,true);
  assert.equal(plan.performance.required,true);
  assert.equal(plan.mobile.required,true);
  assert.equal(plan.strategyOutcomes.required,true);
  assert.equal(plan.contentDepth.required,true);
});

test('runtime failures are converted into existing targeted repair classifications',()=>{
  const gameplaySketch=deriveGameplaySketch({gameId:'g',genre:'SINGLE_DEFENSE_STRATEGY',baseline:{content:{}},inventory});
  const sourceAnalysis=analyzeExistingGameSource(`<main><script>localStorage.getItem('save-v2');localStorage.setItem('save-v2','{}');let gold=10;requestAnimationFrame(()=>{});</script></main>`);
  const plan=buildRuntimeValidationPlan({gameplaySketch,sourceAnalysis});
  const evidence={
    longGoal:{pass:true},replayRegression:{pass:false},softlock:{pass:true},saveRestore:{pass:false},economy:{pass:true},difficulty:{pass:false},performance:{pass:true},mobile:{pass:false},strategyOutcomes:{pass:false},contentDepth:{pass:true},
  };
  const blockers=runtimeValidationBlockers({plan,evidence});
  assert.ok(blockers.includes('REPLAY_SAME_SEED_MISMATCH'));
  assert.ok(blockers.includes('SAVE_RESTORE_FAILED'));
  assert.ok(blockers.includes('DIFFICULTY_RUNTIME_FAILED'));
  assert.ok(blockers.includes('MOBILE_RUNTIME_FAILED'));
  assert.ok(blockers.includes('STRATEGY_OUTCOME_DIVERGENCE_FAILED'));
  const repair=buildFailureDrivenRepairLoop({patchPlan:{tasks:[]},runtimeValidationPlan:plan,runtimeEvidence:evidence});
  assert.equal(repair.runtimeEvidenceBound,true);
  assert.equal(repair.failures.find(x=>x.failure==='REPLAY_SAME_SEED_MISMATCH')?.type,'REPLAY_REGRESSION');
  assert.equal(repair.failures.find(x=>x.failure==='SAVE_RESTORE_FAILED')?.type,'SAVE_REGRESSION');
  assert.equal(repair.failures.find(x=>x.failure==='DIFFICULTY_RUNTIME_FAILED')?.type,'DIFFICULTY_CURVE');
  assert.equal(repair.failures.find(x=>x.failure==='MOBILE_RUNTIME_FAILED')?.type,'MOBILE_RUNTIME');
  assert.equal(repair.failures.find(x=>x.failure==='STRATEGY_OUTCOME_DIVERGENCE_FAILED')?.type,'STRATEGY_OUTCOME');
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
  assert.equal(context.version,4);
  assert.match(prompt,/VIBE_DEVELOPMENT_CONTEXT:/);
  assert.match(prompt,/DERIVED_FROM_LOCKED_DESIGN_BASELINE/);
  assert.match(prompt,/PATCH_EXISTING_RESPONSIBLE_SYSTEMS/);
  assert.match(prompt,/FAILURE_DRIVEN_TARGETED_REPAIR/);
  assert.match(prompt,/INDEPENDENT_RUNTIME_EVIDENCE/);
  assert.match(prompt,/PATCH_DEPENDENCIES_BEFORE_DEPENDENTS/);
  assert.match(prompt,/save-v5/);
  assert.match(prompt,/IMPLEMENT_POSITIONAL_PLACEMENT/);
  assert.match(prompt,/IMPLEMENT_DIVERGENT_STRATEGY_RESULTS/);
  assert.match(prompt,/REPLAY_SAME_SEED_AND_INPUT_SEQUENCE/);
  assert.match(prompt,/EXISTING_HTML:/);
});
