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
import {
  createVibeActorQualityDNA,
  createVibeCompanionSelfhoodDNA,
  createVibeCompanionInnerState,
  createVibeCompanionRelationshipFrame,
  createVibeCausalEventFrame,
  createVibeActorEventAppraisal,
  createVibeActorPlayerModel,
  createVibeGameplayGuidanceFrame,
  createVibeAutonomousContentCandidate,
  createVibeIndividualActivityPlan,
  planVibeLivingActorDirector,
} from '../assets/vibe-ai-role-director.js';
import {JaewoonCommonAI} from '../assets/common-ai.js';
import {createAIPartyConfig,createDefaultAIEntries} from '../assets/ai-party.js';

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
  assert.equal(plan.version,4);
  assert.ok(plan.tasks.some(row=>row.id==='IMPLEMENT_REPLAY_SEED_CONTRACT'));
});

test('patch plan implements macro flow diversity before dependent gameplay systems',()=>{
  const gameplaySketch=deriveGameplaySketch({gameId:'plan',genre:'SINGLE_DEFENSE_STRATEGY',baseline:{content:{}},inventory});
  const sourceAnalysis=analyzeExistingGameSource(`<main><script>function saveGame(){} localStorage.setItem('save-key','1')</script></main>`);
  const plan=buildVibePatchPlan({gameplaySketch,sourceAnalysis,inventory,blockers:['ENTITY_INTERACTION_RESULT_REQUIRED']});
  const ids=plan.tasks.map(x=>x.id);
  assert.equal(plan.version,4);
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
  assert.equal(context.version,7);
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
  assert.equal(context.version,7);
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


test('living actor AI uses source-event causality and actor-specific player beliefs',()=>{
  const event=createVibeCausalEventFrame({
    event:{id:'evt-door-1',type:'protected-object',actorId:'player',objectId:'village-gate',targetIds:['village'],location:'gate'},
    witnesses:[{actorId:'companion-a',channel:'VISION',confidence:1,direct:true}]
  });
  assert.equal(event.validSourceEvent,true);
  assert.equal(event.neutralObjectCanBeCausalContext,true);
  const appraisal=createVibeActorEventAppraisal({
    actor:{id:'companion-a',values:['duty'],boundaries:['protect-village']},
    event:{id:'evt-door-1',type:'protected-object',actorId:'player',objectId:'village-gate'},
    relationship:{trust:10,respect:5},
    knowledgeConfidence:1
  });
  assert.equal(appraisal.sourceEvent.validSourceEvent,true);
  assert.equal(appraisal.relationshipMutationRequiresEngineValidation,true);
  assert.equal(appraisal.gameplayAuthority,false);

  const model=createVibeActorPlayerModel({
    actor:{id:'companion-a'},
    observations:[
      {id:'a',type:'rescue',actor:'player'},
      {id:'b',type:'promise-kept',actor:'player'},
      {id:'c',type:'followed-advice',actor:'player'},
    ]
  });
  assert.equal(model.patterns.helpsOthers,1);
  assert.equal(model.patterns.keepsPromises,1);
  assert.equal(model.patterns.listensToAdvice,1);
  assert.equal(model.beliefNotGlobalTruth,true);
  assert.equal(model.noHiddenPlayerState,true);
});

test('named companion has selfhood worldview self-actualization relationship voice and private inner state',()=>{
  const companion={
    id:'mira',role:'companion',background:'border medic',
    values:['care','freedom','truth'],boundaries:['do-not-abandon-wounded'],
    selfImage:'reliable medic',fearedSelf:'coward',desiredSelf:'someone who can protect a whole team',
    longTermGoal:'build a safe clinic',unresolvedThread:'failed to save an old squadmate',
    worldview:{worldBelief:'people survive by relying on each other',peopleBelief:'trust must be earned'},
    formality:'casual',verbosity:'short',directness:'high',humor:'dry',
    profanityLevel:'CASUAL',catchphraseBudget:1,
    selfActualization:['become-reliable','protect-a-community']
  };
  const dna=createVibeActorQualityDNA({role:'companion',named:true});
  assert.equal(dna.profile,'COMPANION');
  assert.ok(dna.required.includes('WORLDVIEW'));
  const selfhood=createVibeCompanionSelfhoodDNA(companion);
  assert.equal(selfhood.selfImage.current,'reliable medic');
  assert.equal(selfhood.lifeProject.longTermGoal,'build a safe clinic');
  assert.equal(selfhood.rule,'player-is-important-but-not-the-center-of-this-persons-entire-life');

  const inner=createVibeCompanionInnerState({
    companion,
    situation:{currentConcern:'player keeps rushing alone',currentHope:'team slows down',unsaidFeeling:'worried',viewOfPlayer:'brave but reckless'},
    relationship:{trust:35,respect:20},
    memory:[{id:'evt-1',type:'rescue'}],
    emotion:'alert'
  });
  assert.equal(inner.currentConcern,'player keeps rushing alone');
  assert.equal(inner.privacy.playerDoesNotAutomaticallyKnow,true);
  assert.ok(inner.use.includes('subtext'));

  const relationship=createVibeCompanionRelationshipFrame({
    companion,other:{id:'player'},relationship:{trust:35,affection:10,stage:'working-trust'},
    events:[{id:'evt-1',type:'rescue',actor:'player',target:'mira'}]
  });
  assert.equal(relationship.perspectiveSpecific,true);
  assert.equal(relationship.causes[0].id,'evt-1');
  assert.ok(relationship.affects.includes('personal-space'));

  const director=planVibeLivingActorDirector({
    actor:companion,player:{id:'player'},world:{emotion:'alert',activity:'travel',attentionTarget:'bridge'},
    relationship:{trust:35,stage:'working-trust'},memory:[{id:'evt-1',type:'rescue',actor:'player'}],
    recentFailures:[{id:'fail-1',type:'same-damage-source'},{id:'fail-2',type:'same-damage-source'}],
    gameRating:'TEEN'
  });
  assert.equal(director.qualityDNA.profile,'COMPANION');
  assert.equal(director.policy.playerNotUniversalCenter,undefined);
  assert.equal(director.policy.sourceEventCausalityRequired,true);
  assert.equal(director.guidance.spoilerLevel,'DIRECTION');
  assert.equal(director.guidance.profanity.level,'CASUAL');
  assert.equal(director.autonomousContent.engineValidationRequired,true);
});

test('autonomous actor content is a causal candidate and never owns quest reward or world mutation',()=>{
  const valid=createVibeAutonomousContentCandidate({
    actor:{id:'mira'},
    kind:'PERSONAL_ERRAND',
    cause:{id:'evt-supply',type:'resource-shortage',actorId:'mira'},
    goal:'find clean bandages',
    world:{location:'village'},
    relationship:{trust:20},
    recentContent:[]
  });
  assert.equal(valid.candidateValid,true);
  assert.ok(valid.engineOwns.includes('reward'));
  assert.ok(valid.engineOwns.includes('world-mutation'));
  assert.equal(valid.gameplayAuthority,false);

  const invalid=createVibeAutonomousContentCandidate({
    actor:{id:'mira'},kind:'PERSONAL_ERRAND',cause:{type:'resource-shortage'},goal:'find clean bandages',world:{location:'village'}
  });
  assert.equal(invalid.candidateValid,false);

  const duplicate=createVibeAutonomousContentCandidate({
    actor:{id:'mira'},kind:'PERSONAL_ERRAND',
    cause:{id:'evt-supply-2',type:'resource-shortage',actorId:'mira'},
    goal:'find clean bandages',world:{location:'village'},
    recentContent:[{signature:'personal_errand|find clean bandages|mira|village'}]
  });
  assert.equal(duplicate.duplicateRecent,true);
  assert.equal(duplicate.candidateValid,false);
});

test('rare monster and boss can live in world without gaining authoritative combat or reward control',()=>{
  const rare=createVibeIndividualActivityPlan({
    actor:{id:'white-stag',role:'rare-monster'},world:{time:'dawn',location:'marsh'},importance:'important'
  });
  assert.ok(rare.activities.includes('forage'));
  assert.ok(rare.activities.includes('guard-territory'));
  assert.equal(rare.playerPresenceNotRequiredForIdentityOrRoutine,true);
  assert.equal(rare.offscreenAuthoritativeOutcomeForbidden,true);

  const boss=planVibeLivingActorDirector({
    actor:{id:'warden',role:'boss',species:'guardian'},world:{location:'arena'},importance:'hero'
  });
  assert.equal(boss.qualityDNA.profile,'BOSS');
  assert.ok(boss.activity.activities.includes('observe-arena'));
  assert.equal(boss.activity.gameplayAuthority,false);
  assert.equal(boss.policy.engineAuthoritative,true);
});

test('common runtime AI relationship updates require causal events and are idempotent',()=>{
  const ai=new JaewoonCommonAI({
    role:JaewoonCommonAI.Role.SUPPORT,
    identity:{id:'mira'},
    personality:{empathy:.8,protectiveness:.7,caution:.2}
  });
  ai.setRelationship('player',{trust:10,respect:5,stage:'acquaintance'});
  const missing=ai.applyRelationshipEvent('player',{type:'rescue'},{trust:5});
  assert.equal(missing.applied,false);
  assert.equal(missing.reason,'source_event_required');

  const applied=ai.applyRelationshipEvent('player',{id:'evt-1',type:'rescue',actor:'player'},{trust:8,respect:4,protectiveness:3});
  assert.equal(applied.applied,true);
  assert.equal(applied.state.trust,18);
  const duplicate=ai.applyRelationshipEvent('player',{id:'evt-1',type:'rescue',actor:'player'},{trust:8});
  assert.equal(duplicate.applied,false);
  assert.equal(duplicate.reason,'duplicate_event');

  ai.remember({id:'evt-2',type:'followed-advice',actor:'player'});
  const model=ai.inferPlayerModel('player');
  assert.equal(model.patterns.helpful,1);
  assert.equal(model.patterns.adviceFollowed,1);
  assert.equal(model.globalTruth,false);
  assert.equal(ai.snapshotMind().gameplayAuthority,false);
});

test('default AI party entries carry stable companion identity instead of role-only bots',()=>{
  const config=createAIPartyConfig({humanPlayers:1,aiCount:2,roles:['tank','healer']});
  const entries=createDefaultAIEntries(config);
  assert.equal(entries.length,2);
  assert.equal(entries[0].identity.qualityProfile,'COMPANION');
  assert.equal(entries[0].personalityStableAcrossDecisions,true);
  assert.equal(entries[0].relationshipDirectional,true);
  assert.equal(entries[0].memoryRequiresSourceEvent,true);
  assert.equal(entries[0].gameplayAuthority,false);
  assert.notEqual(entries[0].identity.stableSeed,entries[1].identity.stableSeed);
});

test('Vibe gameplay plan requires causal living-actor implementation and runtime evidence when actors exist',()=>{
  const actorInventory=[
    {id:'npc',path:'world.npc',label:'NPC companion dialogue relationship memory'},
    {id:'enemy',path:'combat.enemy',label:'monster boss combat enemy behavior'},
    {id:'quest',path:'quest.system',label:'quest objective progression'}
  ];
  const sketch=deriveGameplaySketch({gameId:'actors',genre:'STORY_COMPLETE_RPG',baseline:{content:{}},inventory:actorInventory});
  assert.equal(sketch.actors.runtimeActorIntelligenceRequired,true);
  assert.equal(sketch.actors.causalRelationshipModelRequired,true);
  assert.equal(sketch.actors.actorSpecificPlayerModelRequired,true);
  assert.equal(sketch.actors.individualActivitySimulationRequired,true);

  const plan=buildVibePatchPlan({gameplaySketch:sketch,sourceAnalysis:{present:true,storageKeys:[],functions:[]},inventory:actorInventory});
  const ids=plan.tasks.map(row=>row.id);
  for(const id of [
    'BIND_RUNTIME_ACTOR_AI_QUALITY_DNA',
    'IMPLEMENT_CAUSAL_ACTOR_RELATIONSHIP_GRAPH',
    'IMPLEMENT_ACTOR_SPECIFIC_PLAYER_MODEL',
    'IMPLEMENT_INDIVIDUAL_ACTOR_ACTIVITY_SIMULATION',
    'IMPLEMENT_IN_CHARACTER_GAMEPLAY_MENTOR_BARKS',
    'IMPLEMENT_AUTONOMOUS_PERSONAL_EVENT_AND_QUEST_PROPOSALS',
    'IMPLEMENT_MONSTER_TEMPERAMENT_TACTICS_AND_ECOLOGY',
    'IMPLEMENT_BOSS_RARE_MONSTER_LIVING_ACTIVITY'
  ]) assert.ok(ids.includes(id),id);

  const validation=buildRuntimeValidationPlan({gameplaySketch:sketch,sourceAnalysis:{capabilities:{},storageKeys:[]}});
  assert.equal(validation.livingActorCausality.required,true);
  const blockers=runtimeValidationBlockers({plan:validation,evidence:{
    longGoal:{pass:true},replayRegression:{pass:true},softlock:{pass:true},difficulty:{pass:true},performance:{pass:true},mobile:{pass:true},
    contentDepth:{pass:true},livingActorCausality:{pass:false}
  }});
  assert.ok(blockers.includes('LIVING_ACTOR_CAUSALITY_FAILED'));
});

test('flow architecture carries award-caliber growth rules and execution-time asset roles',()=>{
  const baseline={content:{
    identity:'A tactical defense expedition with readable routes and boss adaptation.',
    playerFantasy:'Read threats, build a plan, adapt under pressure, and turn mastery into new routes.',
    coreFun:'Route reading, defense placement, combat feedback and progression choices interact every cycle.',
    coreLoop:['read routes and threats','place or upgrade defenses','survive pressure and collect rewards','open a new route or counter-build'],
    signatureSystems:[{name:'Adaptive route pressure',purpose:'change the safe route as threats evolve',playerChoice:'commit to safety, speed, or reward'}],
    progressionDirection:'New defenses and route knowledge open different tactical options instead of only larger numbers.'
  }};
  const flow=buildGameFlowArchitecture({gameId:'flow-assets',genre:'SINGLE_DEFENSE_STRATEGY',baseline,inventory});
  const review=evaluateGameFlowArchitecture(flow);
  assert.equal(review.pass,true,review.blockers.join(','));
  assert.equal(flow.qualityGrowthContract.target,'AWARD_CALIBER_SYSTEMIC_GAME_COMPLETENESS');
  assert.ok(flow.qualityGrowthContract.funDrivers.length>=3);
  assert.ok(flow.qualityGrowthContract.balanceRules.length>=4);
  assert.ok(flow.qualityGrowthContract.expansionRules.length>=4);
  assert.ok(flow.qualityGrowthContract.completionCriteria.length>=4);
  assert.equal(flow.qualityGrowthContract.codingGrowthContract.dataDrivenExtensionPreferred,true);
  assert.ok(flow.assetFlow.requirements.length>=3);
  assert.ok(flow.assetFlow.requirements.every(row=>row.resolution==='LATEST_COMPATIBLE_INTERNAL_ASSET_AT_EXECUTION_TIME'));
  assert.ok(flow.assetFlow.requirements.every(row=>row.assetIdPinned===false&&row.gameplayAuthority===false&&row.balanceAuthority===false&&row.saveAuthority===false));
  assert.ok(flow.assetFlow.requirements.some(row=>row.family==='UI'&&row.subfamily==='HUD'));
});

test('patch plan converts flow asset roles into existing selector apply adapt and verification work',()=>{
  const baseline={content:{identity:'Flow-bound RPG',coreFun:'Explore fight and grow',coreLoop:['explore region','fight threat','choose reward','unlock route']}};
  const gameplaySketch=deriveGameplaySketch({gameId:'flow-asset-plan',genre:'STORY_COMPLETE_RPG',baseline,inventory});
  const plan=buildVibePatchPlan({gameplaySketch,sourceAnalysis:analyzeExistingGameSource(''),inventory});
  const ids=plan.tasks.map(row=>row.id);
  assert.ok(plan.flowAssetRequirements.length>=3);
  assert.ok(ids.includes('IMPLEMENT_FLOW_FUN_BALANCE_AND_COMPLETION_BAR'));
  assert.ok(ids.includes('IMPLEMENT_DATA_DRIVEN_GROWTH_HOOKS'));
  assert.ok(ids.includes('RESOLVE_FLOW_ASSET_REQUIREMENTS_FROM_LATEST_LIBRARY'));
  assert.ok(ids.includes('APPLY_OR_ADAPT_FLOW_ASSETS_WITHOUT_GAMEPLAY_AUTHORITY'));
  assert.ok(ids.includes('VERIFY_FLOW_ASSET_STATE_AND_PHASE_COVERAGE'));
  assert.equal(plan.verificationOrder[1],'FLOW_ASSET_BINDING');
  assert.ok(plan.forbidden.includes('PIN_INTERNAL_ASSET_ID_IN_FLOW_CONTRACT'));
  assert.ok(plan.forbidden.includes('ASSET_LAYER_OWNS_GAMEPLAY_BALANCE_SAVE_OR_NETWORK'));
});

test('survival flow composes crafting housing gathering inventory and ecology as one connected system bundle',()=>{
  const baseline={content:{
    identity:'현실 야생 생존에서 채집하고 제작해 거점을 확장하며 위험한 지역을 탐험한다.',
    playerFantasy:'자원을 읽고 도구를 만들고 집을 지어 더 먼 야생을 버틴다.',
    coreFun:'채집 위치와 위험을 판단하고 제작과 건축으로 다음 탐험 가능성을 넓힌다.',
    coreLoop:['채집 지역을 선택한다','자원을 모아 도구와 장비를 제작한다','거점과 하우징을 확장한다','새 지역의 위협과 생태에 대응한다'],
    progressionDirection:'새 제작법과 거점 기능이 새로운 지역과 생존 전략을 연다.'
  }};
  const flow=buildGameFlowArchitecture({gameId:'survival-system-bundle',genre:'ACTION_SURVIVAL_ROGUELITE',baseline,inventory});
  const ids=new Set(flow.systemBlueprint.requiredSystems.map(row=>row.id));
  for(const id of ['SURVIVAL_VITALS','GATHERING_RESOURCE','INVENTORY_EQUIPMENT','CRAFTING','HOUSING_BUILDING','EXPLORATION_REGION','THREAT_ECOLOGY'])assert.ok(ids.has(id),id);
  assert.ok(flow.systemBlueprint.interconnectionChains.includes('GATHERING_RESOURCE->CRAFTING->HOUSING_BUILDING'));
  assert.ok(flow.systemBlueprint.libraryReusePolicy.knownReusableLibraries.includes('assets/crafting-recipes.js'));
  assert.ok(flow.systemBlueprint.libraryReusePolicy.knownReusableLibraries.includes('assets/inventory-equipment.js'));
  assert.ok(flow.assetFlow.requirements.some(row=>row.family==='BUILDING'&&row.subfamily==='MODULAR_EXTERIOR'));
  assert.ok(flow.assetFlow.requirements.some(row=>row.family==='PROP'&&row.subfamily==='CRAFTING'));
  assert.ok(flow.assetFlow.requirements.some(row=>row.family==='PROP'&&row.subfamily==='RESOURCE'));
  assert.equal(evaluateGameFlowArchitecture(flow).pass,true);
});

test('RPG flow composes companions NPC quests items skills economy crafting and world consequences',()=>{
  const baseline={content:{
    identity:'동료와 여행하며 NPC 의뢰와 지역 문제를 해결하고 장비와 아이템을 제작하는 모험 RPG',
    playerFantasy:'동료와 관계를 쌓고 퀘스트 선택과 전투 빌드로 세계를 바꾼다.',
    coreFun:'NPC와 대화해 목표를 얻고 동료와 전투하며 아이템을 얻어 제작과 스킬 빌드를 바꾼다.',
    coreLoop:['NPC와 동료에게서 목표를 얻는다','지역을 탐험하고 전투한다','아이템과 보상을 비교하고 제작한다','관계와 지역 상태가 바뀐 다음 선택으로 이어진다'],
    progressionDirection:'스킬 장비 동료 관계와 지역 접근이 서로 연결되어 새로운 선택을 연다.'
  }};
  const flow=buildGameFlowArchitecture({gameId:'rpg-system-bundle',genre:'STORY_COMPLETE_RPG',baseline,inventory});
  const ids=new Set(flow.systemBlueprint.requiredSystems.map(row=>row.id));
  for(const id of ['NPC_INTERACTION','QUEST_DIALOGUE','COMPANION_PARTY','INVENTORY_EQUIPMENT','ITEM_LOOT','SKILL_BUILD','ECONOMY_SHOP','TARGETING_COMBAT','CRAFTING'])assert.ok(ids.has(id),id);
  assert.ok(flow.systemBlueprint.interconnectionChains.some(chain=>chain.includes('COMPANION_PARTY->SOCIAL_RELATIONSHIP->QUEST_DIALOGUE')));
  for(const file of ['assets/quest-dialogue.js','assets/inventory-equipment.js','assets/crafting-recipes.js','assets/economy-loot-shop.js','assets/skill-effects.js','assets/targeting-system.js'])assert.ok(flow.systemBlueprint.libraryReusePolicy.knownReusableLibraries.includes(file),file);
  assert.ok(flow.systemBlueprint.awardCaliberPrinciples.length>=8);
  assert.equal(flow.systemBlueprint.expansionPolicy.contentBundlesMustConnectAtLeastTwoSystems,true);
  assert.equal(evaluateGameFlowArchitecture(flow).pass,true);
});

test('patch plan converts required genre systems into existing-owner implementation tasks',()=>{
  const baseline={content:{
    identity:'Survival crafting housing game',
    coreFun:'Gather craft build survive',
    coreLoop:['gather resources','craft tools','build housing','survive threats']
  }};
  const gameplaySketch=deriveGameplaySketch({gameId:'genre-system-plan',genre:'ACTION_SURVIVAL_ROGUELITE',baseline,inventory});
  const plan=buildVibePatchPlan({gameplaySketch,sourceAnalysis:analyzeExistingGameSource(''),inventory});
  const ids=new Set(plan.tasks.map(row=>row.id));
  for(const id of ['IMPLEMENT_CONCEPT_MATCHED_SYSTEM_BUNDLE','REUSE_EXISTING_SYSTEM_LIBRARIES_WHEN_COMPATIBLE','CONNECT_SYSTEMS_INTO_CAUSAL_GAMEPLAY_CHAINS','IMPLEMENT_SYSTEM_CRAFTING','IMPLEMENT_SYSTEM_HOUSING_BUILDING','VERIFY_SYSTEM_BUNDLE_DEPTH_AND_ANTI_CHECKLIST'])assert.ok(ids.has(id),id);
  assert.equal(plan.version,4);
  assert.equal(plan.systemBlueprint.profile,'ACTION_SURVIVAL_ROGUELITE');
  assert.ok(plan.forbidden.includes('DUPLICATE_SHADOW_INVENTORY_CRAFTING_QUEST_ECONOMY_OR_COMPANION_SYSTEM'));
  assert.equal(plan.verificationOrder[2],'CONCEPT_SYSTEM_BUNDLE');
});
