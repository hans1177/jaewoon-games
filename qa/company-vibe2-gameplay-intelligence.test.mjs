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
  runtimeEvidenceFromValidationReport,
  buildVibeDevelopmentContext,
  clipPreservedSourceForModel,
} from '../tools/company-vibe2-gameplay-intelligence.mjs';
import {buildGameFlowArchitecture,evaluateGameFlowArchitecture,FLOW_ARCHETYPES} from '../tools/company-vibe2-game-flow-architect.mjs';
import {buildApprovedScopeGenerationPrompt} from '../tools/company-development-web-bootstrap.mjs';
import {evaluateDeterministicReplayEvidence} from '../tools/company-web-deterministic-replay.mjs';

const inventory=[
  {id:'scope-map',path:'world.map',label:'explore map regions and routes'},
  {id:'scope-npc',path:'world.npc',label:'interact with npc and object'},
  {id:'scope-tower',path:'combat.tower',label:'tower placement strategy'},
  {id:'scope-progress',path:'progression.quest',label:'quest reward and unlock'},
];

test('GAME_FLOW_ARCHITECT creates diverse macro progression instead of one repeated loop',()=>{
  const flow=buildGameFlowArchitecture({gameId:'tower-alpha',genre:'SINGLE_DEFENSE_STRATEGY',baseline:{content:{coreLoop:['prepare','place','defend','adapt']}},inventory});
  const review=evaluateGameFlowArchitecture(flow);
  assert.equal(flow.source,'DERIVED_GAME_FLOW_ARCHITECT');
  assert.ok(flow.flowDNA.length>=2&&flow.flowDNA.length<=4);
  assert.ok(flow.flowDNA.every(x=>FLOW_ARCHETYPES.includes(x)));
  assert.equal(flow.phaseArc.length,3);
  assert.ok(new Set(flow.phaseArc.map(x=>x.dominantFlow)).size>=2);
  assert.equal(flow.parallelGoals.required,true);
  assert.ok(flow.parallelGoals.minConcurrentThreads>=3);
  assert.equal(flow.branching.required,true);
  assert.equal(flow.worldReactivity.required,true);
  assert.equal(flow.npcInitiative.required,true);
  assert.ok(flow.failureModel.modes.length>=2);
  assert.ok(flow.victoryModel.modes.length>=2);
  assert.ok(flow.riskCurve.types.length>=3);
  assert.ok(flow.playstyleRoutes.styles.length>=2);
  assert.equal(flow.regionalRuleVariation.required,true);
  assert.equal(flow.tensionRhythm.required,true);
  assert.equal(flow.informationProgression.required,true);
  assert.equal(flow.revisitValue.required,true);
  assert.equal(flow.endingModel.required,true);
  assert.equal(review.pass,true);
});

test('same genre does not collapse every game to identical Flow DNA',()=>{
  const signatures=new Set();
  for(let i=0;i<12;i++){
    const flow=buildGameFlowArchitecture({gameId:`survival-${i}`,genre:'ACTION_SURVIVAL_ROGUELITE',baseline:{content:{coreLoop:['explore','fight','loot','decide']}},inventory});
    signatures.add(flow.flowDNA.join('|')+'::'+flow.returnStructure.selectedMode+'::'+flow.failureModel.modes.join('|'));
  }
  assert.ok(signatures.size>=4);
});

test('explicit game flow architecture is preserved instead of overwritten',()=>{
  const explicit={version:4,flowDNA:['LIFE_SCHEDULE','SANDBOX_SELF_DIRECTED'],phaseArc:[{phase:'EARLY',dominantFlow:'LIFE_SCHEDULE'},{phase:'MID',dominantFlow:'SANDBOX_SELF_DIRECTED'},{phase:'LATE',dominantFlow:'LIFE_SCHEDULE'}],parallelGoals:{minConcurrentThreads:3},failureModel:{modes:['TIME_OR_OPPORTUNITY_COST','RELATIONSHIP_OR_ACCESS_COST']},victoryModel:{modes:['RELATIONSHIP_OR_SOCIAL_RESOLUTION','ECONOMIC_OR_BUILD_TARGET']},worldReactivity:{required:true},regionalRuleVariation:{required:true},tensionRhythm:{required:true},informationProgression:{required:true}};
  const flow=buildGameFlowArchitecture({gameId:'life',genre:'ROLEPLAY_LIFE_AVATAR',baseline:{GAME_FLOW_ARCHITECTURE:explicit},inventory});
  assert.equal(flow.source,'SEED_OR_DESIGN_GAME_FLOW_ARCHITECTURE');
  assert.deepEqual(flow.flowDNA,explicit.flowDNA);
});

test('GAMEPLAY_SKETCH preserves an explicit seed/design sketch and enriches missing macro flow',()=>{
  const explicit={version:3,worldModel:{regions:['A','B']},interactionGraph:{required:true}};
  const sketch=deriveGameplaySketch({gameId:'explicit-sketch',genre:'STORY_COMPLETE_RPG',baseline:{GAMEPLAY_SKETCH:explicit},inventory});
  assert.equal(sketch.source,'SEED_OR_DESIGN_GAMEPLAY_SKETCH');
  assert.deepEqual(sketch.worldModel.regions,['A','B']);
  assert.equal(sketch.interactionGraph.required,true);
  assert.ok(sketch.flowArchitecture.flowDNA.length>=2);
});

test('derived GAMEPLAY_SKETCH turns approved scope into executable world and flow contracts',()=>{
  const sketch=deriveGameplaySketch({gameId:'g',genre:'SINGLE_DEFENSE_STRATEGY',baseline:{content:{coreLoop:['enter','fight','reward']}},inventory});
  assert.equal(sketch.source,'DERIVED_FROM_LOCKED_DESIGN_BASELINE');
  assert.equal(sketch.version,2);
  assert.equal(sketch.worldModel.requiresPlayableSpace,true);
  assert.equal(sketch.interactionGraph.required,true);
  assert.equal(sketch.placementModel.required,true);
  assert.equal(sketch.combatModel.strategicOutcomeDifferenceRequired,true);
  assert.match(sketch.stateMachine.contract,/MACRO_PROGRESSION_MUST_FOLLOW flowArchitecture/);
  assert.equal(evaluateGameFlowArchitecture(sketch.flowArchitecture).pass,true);
});

test('flow architecture review rejects shallow one-loop sketches',()=>{
  const review=evaluateGameFlowArchitecture({flowDNA:['HUB_AND_SPOKE'],phaseArc:[{dominantFlow:'HUB_AND_SPOKE'}],parallelGoals:{minConcurrentThreads:1},failureModel:{modes:['HARD_FAILURE_RETRY']},victoryModel:{modes:['BOSS_OR_THREAT_RESOLUTION']},worldReactivity:{required:false},regionalRuleVariation:{required:false},tensionRhythm:{required:false},informationProgression:{required:false}});
  assert.equal(review.pass,false);
  assert.ok(review.blockers.includes('FLOW_DNA_TOO_NARROW'));
  assert.ok(review.blockers.includes('PHASE_FLOW_CHANGE_REQUIRED'));
  assert.ok(review.blockers.includes('PARALLEL_GOALS_REQUIRED'));
  assert.ok(review.blockers.includes('WORLD_REACTIVITY_REQUIRED'));
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

test('randomized source without replay seed contract becomes a targeted repair task',()=>{
  const gameplaySketch=deriveGameplaySketch({gameId:'rng',baseline:{content:{}},inventory});
  const sourceAnalysis=analyzeExistingGameSource(`<main><script>const roll=Math.random();function attack(){return roll}</script></main>`);
  assert.equal(sourceAnalysis.capabilities.randomness,true);
  assert.equal(sourceAnalysis.capabilities.replaySeedContract,false);
  const plan=buildVibePatchPlan({gameplaySketch,sourceAnalysis,inventory});
  assert.equal(plan.version,3);
  assert.ok(plan.tasks.some(row=>row.id==='IMPLEMENT_REPLAY_SEED_CONTRACT'));
});

test('patch plan implements macro flow diversity before dependent gameplay systems',()=>{
  const gameplaySketch=deriveGameplaySketch({gameId:'plan',genre:'SINGLE_DEFENSE_STRATEGY',baseline:{content:{}},inventory});
  const sourceAnalysis=analyzeExistingGameSource(`<main><script>function saveGame(){} localStorage.setItem('save-key','1')</script></main>`);
  const plan=buildVibePatchPlan({gameplaySketch,sourceAnalysis,inventory,blockers:['ENTITY_INTERACTION_RESULT_REQUIRED']});
  const ids=plan.tasks.map(x=>x.id);
  assert.equal(plan.version,3);
  assert.ok(ids.includes('PRESERVE_EXISTING_BEHAVIOR'));
  assert.ok(ids.includes('PRESERVE_SAVE_CONTRACT'));
  assert.ok(ids.includes('IMPLEMENT_GAME_FLOW_ARCHITECTURE'));
  assert.ok(ids.includes('IMPLEMENT_FLOW_PHASE_TRANSITIONS'));
  assert.ok(ids.includes('IMPLEMENT_PARALLEL_GOALS_AND_BRANCH_CONSEQUENCES'));
  assert.ok(ids.includes('IMPLEMENT_WORLD_REACTIVITY_AND_NPC_INITIATIVE'));
  assert.ok(ids.includes('IMPLEMENT_DISTINCT_FAILURE_AND_VICTORY_STRUCTURES'));
  assert.ok(ids.includes('IMPLEMENT_PLAYSTYLE_AND_REGION_RULE_VARIATION'));
  assert.ok(ids.includes('IMPLEMENT_SESSION_RHYTHM_INFORMATION_AND_REVISIT'));
  assert.ok(ids.includes('IMPLEMENT_PLAYABLE_SPACE'));
  assert.ok(ids.includes('IMPLEMENT_ENTITY_INTERACTIONS'));
  assert.ok(ids.includes('IMPLEMENT_POSITIONAL_PLACEMENT'));
  assert.ok(ids.includes('IMPLEMENT_DIVERGENT_STRATEGY_RESULTS'));
  assert.ok(ids.some(x=>x.startsWith('FIX_ENTITY_INTERACTION_RESULT_REQUIRED')));
  assert.deepEqual(plan.preserve.storageKeys,['save-key']);
  assert.equal(plan.verificationOrder[0],'FLOW_ARCHITECTURE_CONTRACT');
  assert.ok(plan.verificationOrder.includes('LONG_GOAL_PLAY'));
  assert.ok(plan.verificationOrder.includes('REPLAY_REGRESSION'));
  assert.ok(plan.verificationOrder.includes('SAVE_RESTORE'));
});

test('dependency analysis and failure loop keep repairs targeted to responsible systems',()=>{
  const sourceAnalysis={storageKeys:['save-v9'],functions:['placeTower','resolveWave'],functionDependencies:['placeTower->resolveWave']};
  const patchPlan={tasks:[
    {id:'IMPLEMENT_GAME_FLOW_ARCHITECTURE',dependsOn:['PRESERVE_EXISTING_BEHAVIOR']},
    {id:'IMPLEMENT_FLOW_PHASE_TRANSITIONS',dependsOn:['IMPLEMENT_GAME_FLOW_ARCHITECTURE']},
    {id:'IMPLEMENT_PLAYABLE_SPACE',dependsOn:['PRESERVE_EXISTING_BEHAVIOR']},
    {id:'IMPLEMENT_POSITIONAL_PLACEMENT',dependsOn:['IMPLEMENT_PLAYABLE_SPACE']},
    {id:'FIX_TOWER_PLACEMENT_RESULT_REQUIRED',dependsOn:[]},
  ]};
  const dependency=buildDependencyAnalysis({sourceAnalysis,patchPlan});
  const repair=buildFailureDrivenRepairLoop({blockers:['FLOW_PHASE_REPETITION','TOWER_PLACEMENT_RESULT_REQUIRED','MOBILE_TOUCH_REQUIRED','SAVE_RESTORE_FAILED','ECONOMY_FREE_LOOP','DIFFICULTY_SPIKE','PERFORMANCE_FRAME_STALL','REPLAY_SAME_SEED_MISMATCH'],patchPlan});
  assert.deepEqual(dependency.protectedSaveKeys,['save-v9']);
  assert.ok(dependency.sourceFunctionEdges.includes('placeTower->resolveWave'));
  assert.ok(dependency.patchTaskEdges.includes('IMPLEMENT_GAME_FLOW_ARCHITECTURE->IMPLEMENT_FLOW_PHASE_TRANSITIONS'));
  assert.ok(dependency.patchTaskEdges.includes('IMPLEMENT_PLAYABLE_SPACE->IMPLEMENT_POSITIONAL_PLACEMENT'));
  assert.equal(repair.mode,'FAILURE_DRIVEN_TARGETED_REPAIR');
  assert.equal(repair.version,5);
  assert.equal(repair.failures[0].type,'GAME_FLOW_ARCHITECTURE');
  assert.equal(repair.failures[1].type,'SPATIAL_GAMEPLAY');
  assert.ok(repair.repairTaskIds.includes('IMPLEMENT_GAME_FLOW_ARCHITECTURE'));
  assert.ok(repair.repairTaskIds.includes('IMPLEMENT_FLOW_PHASE_TRANSITIONS'));
  assert.ok(repair.retryContract.includes('VERIFY_FLOW_ARCHITECTURE_WHEN_RELEVANT'));
  assert.ok(repair.retryContract.includes('RUN_REPLAY_REGRESSION'));
  assert.ok(repair.retryContract.includes('VERIFY_SAVE_RESTORE'));
});

test('runtime validation plan requires independent long-goal replay and safety evidence',()=>{
  const gameplaySketch=deriveGameplaySketch({gameId:'g',genre:'SINGLE_DEFENSE_STRATEGY',baseline:{content:{}},inventory});
  const sourceAnalysis=analyzeExistingGameSource(`<main><script>localStorage.getItem('save-v2');localStorage.setItem('save-v2','{}');let gold=10;requestAnimationFrame(()=>{});</script></main>`);
  const plan=buildRuntimeValidationPlan({gameplaySketch,sourceAnalysis});
  assert.equal(plan.version,2);
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
  const evidence={longGoal:{pass:true},replayRegression:{pass:false,status:'CRITICAL_STATE_DIVERGED'},softlock:{pass:true},saveRestore:{pass:false},economy:{pass:true},difficulty:{pass:false},performance:{pass:true},mobile:{pass:false},strategyOutcomes:{pass:false},contentDepth:{pass:true}};
  const blockers=runtimeValidationBlockers({plan,evidence});
  assert.ok(blockers.includes('REPLAY_SAME_SEED_MISMATCH'));
  assert.ok(blockers.includes('SAVE_RESTORE_FAILED'));
  assert.ok(blockers.includes('DIFFICULTY_RUNTIME_FAILED'));
  assert.ok(blockers.includes('MOBILE_RUNTIME_FAILED'));
  assert.ok(blockers.includes('STRATEGY_OUTCOME_DIVERGENCE_FAILED'));
  const repair=buildFailureDrivenRepairLoop({patchPlan:{tasks:[]},runtimeValidationPlan:plan,runtimeEvidence:evidence});
  assert.equal(repair.runtimeEvidenceBound,true);
  assert.ok(repair.runtimeFailureCount>=5);
  assert.equal(repair.failures.find(x=>x.failure==='REPLAY_SAME_SEED_MISMATCH')?.type,'REPLAY_REGRESSION');
  assert.equal(repair.failures.find(x=>x.failure==='SAVE_RESTORE_FAILED')?.type,'SAVE_REGRESSION');
  assert.equal(repair.failures.find(x=>x.failure==='DIFFICULTY_RUNTIME_FAILED')?.type,'DIFFICULTY_CURVE');
  assert.equal(repair.failures.find(x=>x.failure==='MOBILE_RUNTIME_FAILED')?.type,'MOBILE_RUNTIME');
  assert.equal(repair.failures.find(x=>x.failure==='STRATEGY_OUTCOME_DIVERGENCE_FAILED')?.type,'STRATEGY_OUTCOME');
});

test('deterministic replay requires same seed, full input trace and matching critical-state deltas',()=>{
  const pass=evaluateDeterministicReplayEvidence({usesRandomness:true,referenceSeed:'seed-42',replaySeed:'seed-42',expectedOutcomeSignatures:['a','b','c'],observedOutcomeSignatures:['a','b','c'],traceLength:3,executedCount:3});
  assert.equal(pass.pass,true);
  assert.equal(pass.status,'PASS');
  assert.equal(pass.sameSeed,true);
  assert.equal(pass.sameInputTrace,true);
  assert.equal(pass.criticalStateMatch,true);
  const noSeed=evaluateDeterministicReplayEvidence({usesRandomness:true,referenceSeed:'',replaySeed:'',expectedOutcomeSignatures:['a','b','c'],observedOutcomeSignatures:['a','b','c'],traceLength:3,executedCount:3});
  assert.equal(noSeed.pass,false);
  assert.equal(noSeed.status,'REPLAY_SEED_NOT_EXPOSED');
  const shortReplay=evaluateDeterministicReplayEvidence({usesRandomness:false,expectedOutcomeSignatures:['a','b','c'],observedOutcomeSignatures:['a','b'],traceLength:3,executedCount:2});
  assert.equal(shortReplay.pass,false);
  assert.equal(shortReplay.status,'INPUT_TRACE_REPLAY_FAILED');
  const diverged=evaluateDeterministicReplayEvidence({usesRandomness:true,referenceSeed:'seed-7',replaySeed:'seed-7',expectedOutcomeSignatures:['gold:+5','wave:+1','hp:-2'],observedOutcomeSignatures:['gold:+5','wave:+1','hp:-8'],traceLength:3,executedCount:3});
  assert.equal(diverged.pass,false);
  assert.equal(diverged.status,'CRITICAL_STATE_DIVERGED');
  assert.equal(diverged.criticalStateMatch,false);
});

test('validation report runtime evidence binds into Vibe development context',()=>{
  const runtimeEvidence={longGoal:{pass:true},replayRegression:{pass:false,status:'CRITICAL_STATE_DIVERGED'},softlock:{pass:true},saveRestore:{required:false,pass:true},economy:{required:false,pass:true},difficulty:{pass:true},performance:{pass:true},mobile:{pass:true},strategyOutcomes:{pass:false},contentDepth:{pass:false}};
  assert.deepEqual(runtimeEvidenceFromValidationReport({runtimeValidationEvidence:runtimeEvidence}),runtimeEvidence);
  const context=buildVibeDevelopmentContext({gameId:'g',genre:'SINGLE_DEFENSE_STRATEGY',baseline:{content:{}},inventory,existingHtml:'<main><script>let wave=1</script></main>',blockers:['RUNTIME_REWORK_REQUIRED'],runtimeEvidence});
  assert.equal(context.version,6);
  assert.equal(context.flowArchitectureValidation.pass,true);
  assert.deepEqual(context.runtimeEvidence,runtimeEvidence);
  assert.equal(context.repairLoop.runtimeEvidenceBound,true);
  assert.equal(context.repairLoop.failures.find(x=>x.failure==='REPLAY_SAME_SEED_MISMATCH')?.type,'REPLAY_REGRESSION');
});

test('long preserved source keeps both ends instead of silently losing tail systems',()=>{
  const source='HEAD_'+('a'.repeat(30000))+'_TAIL';
  const clipped=clipPreservedSourceForModel(source,4000);
  assert.ok(clipped.startsWith('HEAD_'));
  assert.ok(clipped.endsWith('_TAIL'));
  assert.match(clipped,/VIBE2_SOURCE_MIDDLE_OMITTED_FOR_CONTEXT/);
});

test('Vibe bootstrap receives the complete macro flow architecture before coding',()=>{
  const baseline={content:{coreLoop:['enter','fight','reward']}};
  const existingHtml=`<main><script>function saveGame(){} localStorage.setItem('save-v5','1');const roll=Math.random()</script></main>`;
  const context=buildVibeDevelopmentContext({gameId:'g',genre:'SINGLE_DEFENSE_STRATEGY',baseline,inventory,existingHtml,blockers:['RUNTIME_REWORK_REQUIRED:FINAL_CONTENT_DEPTH_REWORK_REQUIRED'],runtimeEvidence:null});
  const prompt=buildApprovedScopeGenerationPrompt({gameId:'g',gameName:'Game',baseline,inventory,existingHtml,preservationBlockers:['RUNTIME_REWORK_REQUIRED:FINAL_CONTENT_DEPTH_REWORK_REQUIRED'],developmentContext:context});
  assert.equal(context.version,6);
  assert.match(prompt,/VIBE_DEVELOPMENT_CONTEXT:/);
  assert.match(prompt,/DERIVED_FROM_LOCKED_DESIGN_BASELINE/);
  assert.match(prompt,/flowArchitecture/);
  assert.match(prompt,/flowDNA/);
  assert.match(prompt,/phaseArc/);
  assert.match(prompt,/parallelGoals/);
  assert.match(prompt,/worldReactivity/);
  assert.match(prompt,/failureModel/);
  assert.match(prompt,/victoryModel/);
  assert.match(prompt,/PATCH_EXISTING_RESPONSIBLE_SYSTEMS/);
  assert.match(prompt,/IMPLEMENT_GAME_FLOW_ARCHITECTURE/);
  assert.match(prompt,/IMPLEMENT_FLOW_PHASE_TRANSITIONS/);
  assert.match(prompt,/IMPLEMENT_WORLD_REACTIVITY_AND_NPC_INITIATIVE/);
  assert.match(prompt,/IMPLEMENT_PLAYSTYLE_AND_REGION_RULE_VARIATION/);
  assert.match(prompt,/FAILURE_DRIVEN_TARGETED_REPAIR/);
  assert.match(prompt,/INDEPENDENT_RUNTIME_EVIDENCE/);
  assert.match(prompt,/PATCH_DEPENDENCIES_BEFORE_DEPENDENTS/);
  assert.match(prompt,/save-v5/);
  assert.match(prompt,/IMPLEMENT_POSITIONAL_PLACEMENT/);
  assert.match(prompt,/IMPLEMENT_DIVERGENT_STRATEGY_RESULTS/);
  assert.match(prompt,/IMPLEMENT_REPLAY_SEED_CONTRACT/);
  assert.match(prompt,/REPLAY_SAME_SEED_AND_INPUT_SEQUENCE/);
  assert.match(prompt,/EXISTING_HTML:/);
});
