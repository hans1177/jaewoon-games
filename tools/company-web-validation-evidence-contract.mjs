// 파일명: tools/company-web-validation-evidence-contract.mjs
import crypto from 'node:crypto';

export const WEB_VALIDATION_SCHEMA_VERSION=13;
export const WEB_HOMEPAGE_MINIMUM=80;
export const WEB_PLATFORM_PROMOTION_MINIMUM=90;
// 과거 호출자 호환용 export다. 초기 제작/검증 근거로 사용하지 않는다.
export const WEB_SESSION_WINDOWS=Object.freeze([[0,5],[5,15],[15,25],[25,30]].map(Object.freeze));

export const WEB_COMMON_SCORE_WEIGHTS=Object.freeze({
  CORE_GAME_LOOP:15,
  SYSTEM_CONNECTIVITY:10,
  CONTROLS_AND_GAME_FEEL:8,
  FUNCTIONAL_UI_UX:7,
  PROGRESSION_GROWTH_REWARD:7,
  RISK_FAILURE_RETRY:5,
  GAMEPLAY_FEEDBACK:4,
  STABILITY_PERFORMANCE:4,
});

export const WEB_CATEGORY_PROFILE_MAPPING=Object.freeze({
  ACTION_SURVIVAL_ROGUELITE:'SURVIVAL',
  SINGLE_DEFENSE_STRATEGY:'TOWER_DEFENSE',
  PUZZLE:'PUZZLE',
  CASUAL:'DESIGN_DERIVED_PROFILE_REQUIRED',
  IDLE_GROWTH_RPG:'RPG',
  STORY_COMPLETE_RPG:'STORY_ADVENTURE',
  ROLEPLAY_LIFE_AVATAR:'LIFE_ROLEPLAY',
  SIMULATOR_TYCOON_INCREMENTAL:'TYCOON_SIMULATOR',
  BATTLEGROUND_FIGHTING_SHOOTER:'BATTLE_SHOOTER',
  SURVIVAL_HORROR_ESCAPE:'SURVIVAL',
  OBBY_PARTY_MINIGAME:'OBBY_PLATFORMER',
  STORY_RPG_ADVENTURE_RPG:'STORY_ADVENTURE',
});

export const WEB_CATEGORY_SCORE_WEIGHTS=Object.freeze({
  SURVIVAL:Object.freeze({WORLD_AND_MOVEMENT:8,RESOURCE_AND_GATHERING:7,CRAFTING:7,ENEMY_OR_THREAT:7,SURVIVAL_PRESSURE:6,EXPLORATION_VARIETY:5}),
  TOWER_DEFENSE:Object.freeze({PLACEMENT_AND_ROUTE:8,ENEMY_WAVES:7,TOWER_VARIETY:7,UPGRADES:6,ECONOMY:6,STRATEGIC_CHOICE:6}),
  RPG:Object.freeze({COMBAT:8,QUEST_AND_NPC:7,EXPLORATION:6,EQUIPMENT_AND_GROWTH:7,ENEMY_AND_BOSS:6,STORY_AND_WORLD_STATE:6}),
  TYCOON_SIMULATOR:Object.freeze({PRODUCTION_CHAIN:9,UPGRADES:7,AUTOMATION:7,ECONOMY:7,AREA_UNLOCK:5,MANUAL_AUTOMATION_CHOICE:5}),
  PUZZLE:Object.freeze({PUZZLE_RULE:9,REAL_SOLVABILITY:7,DIFFICULTY_CURVE:7,BOARD_STATE:6,MECHANIC_VARIETY:6,FEEDBACK:5}),
  OBBY_PLATFORMER:Object.freeze({MOVEMENT_FEEL:9,LEVEL_DESIGN:8,OBSTACLE_VARIETY:7,FAILURE_AND_RETRY:6,DIFFICULTY_CURVE:6,CHECKPOINTS:4}),
  BATTLE_SHOOTER:Object.freeze({MOVEMENT:7,ATTACK_AND_HIT:8,ENEMY_AI:7,SKILL_AND_COOLDOWN:6,COMBAT_OBJECTIVE:6,COMBAT_FEEDBACK:6}),
  STORY_ADVENTURE:Object.freeze({EXPLORATION:7,QUEST:7,NPC_AND_DIALOGUE:6,EVENT_AND_STATE_CHANGE:6,COMBAT_OR_PUZZLE:6,BRANCH_OR_OBJECTIVE:8}),
  LIFE_ROLEPLAY:Object.freeze({WORLD_AND_SPACE:7,INTERACTION:7,NPC:6,LIFE_ACTIVITIES:7,CHARACTER_STATE:6,FREEDOM_AND_CHOICE:7}),
});

const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const number=(...values)=>{for(const value of values){const n=Number(value);if(Number.isFinite(n))return n;}return 0;};
const countUnique=value=>Array.isArray(value)?new Set(value.map(clean).filter(Boolean)).size:0;
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
export const sha256Text=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
export const strictScoreOf=evidence=>Number(evidence?.webStrictScore??evidence?.strictReview?.totalScore);
export const hardFailuresOf=evidence=>Array.isArray(evidence?.strictReview?.hardFailures)?evidence.strictReview.hardFailures:[];

export function resolveWebCategoryProfile(category='',evidence={}){
  const c=upper(category);
  if(WEB_CATEGORY_SCORE_WEIGHTS[c])return c;
  const mapped=WEB_CATEGORY_PROFILE_MAPPING[c];
  if(mapped&&mapped!=='DESIGN_DERIVED_PROFILE_REQUIRED')return mapped;
  if(mapped==='DESIGN_DERIVED_PROFILE_REQUIRED'){
    const derived=upper(evidence?.designDerivedCategoryProfile||evidence?.categoryProfile);
    return WEB_CATEGORY_SCORE_WEIGHTS[derived]?derived:'DESIGN_DERIVED_PROFILE_REQUIRED';
  }
  return null;
}

export function webGameplayMetrics(evidence={}){
  const metrics=evidence?.implementationMetrics&&typeof evidence.implementationMetrics==='object'?evidence.implementationMetrics:{};
  const footprint=evidence?.sourceFootprint&&typeof evidence.sourceFootprint==='object'?evidence.sourceFootprint:{};
  const scope=evidence?.scopeCoverage&&typeof evidence.scopeCoverage==='object'?evidence.scopeCoverage:{};
  const runtime=evidence?.runtimeFeatureEvidence&&typeof evidence.runtimeFeatureEvidence==='object'?evidence.runtimeFeatureEvidence:{};
  const depth=evidence?.contentDepthValidation&&typeof evidence.contentDepthValidation==='object'?evidence.contentDepthValidation:{};
  const stateTransitions=Array.isArray(evidence?.scopeInteractionResults)?evidence.scopeInteractionResults.filter(row=>row?.stateChanged===true).length:0;
  const mechanicBindings=Array.isArray(scope?.mechanicBindings)?new Set(scope.mechanicBindings.filter(Boolean)).size:0;
  const terminal=upper(evidence?.terminalOutcome?.result);
  const proxyMarkers=number(evidence?.substanceGate?.proxyMarkers,footprint.proxyMarkers);
  const directControls=number(evidence?.substanceGate?.directSessionControls,footprint.stageButtons===true?1:0);
  return Object.freeze({
    uniqueMechanicCount:number(metrics.uniqueMechanicCount,footprint.mechanicCount),
    uniqueFunctionalUiCount:number(metrics.uniqueFunctionalUiCount,metrics.functionalUiCount,mechanicBindings),
    gameplayActionCount:number(metrics.gameplayActionCount,evidence?.interactionCount),
    stateVariableCount:number(metrics.stateVariableCount,metrics.uniqueGameplayStateCount),
    meaningfulStateTransitionCount:number(metrics.meaningfulStateTransitionCount,evidence?.stateChangeCount,stateTransitions),
    uniqueGameplayStateCount:number(metrics.uniqueGameplayStateCount),
    uniqueInteractedMechanicCount:number(metrics.uniqueInteractedMechanicCount,mechanicBindings),
    systemDependencyCount:number(metrics.systemDependencyCount),
    enemyOrWorldEntityCount:number(metrics.enemyOrWorldEntityCount,metrics.worldOrEnemyEntityCount),
    enemyTypeCount:number(metrics.enemyTypeCount,runtime.enemyTypeCount,countUnique(runtime.enemyTypes)),
    newEnemyTypeCount:number(metrics.newEnemyTypeCount,runtime.newEnemyTypeCount,countUnique(runtime.newEnemyTypes)),
    areaCount:number(metrics.areaCount,runtime.areaCount,countUnique(runtime.areas)),
    newAreaCount:number(metrics.newAreaCount,runtime.newAreaCount,countUnique(runtime.newAreas)),
    objectiveCount:number(metrics.objectiveCount,runtime.objectiveCount,countUnique(runtime.objectives)),
    newObjectiveCount:number(metrics.newObjectiveCount,runtime.newObjectiveCount,countUnique(runtime.newObjectives)),
    towerTypeCount:number(metrics.towerTypeCount,runtime.towerTypeCount,countUnique(runtime.towerTypes)),
    towerEffectProfileCount:number(metrics.towerEffectProfileCount,runtime.towerEffectProfileCount,countUnique(runtime.towerEffectProfiles)),
    placementResultCount:number(metrics.placementResultCount,runtime.placementResultCount),
    strategyChoiceCount:number(metrics.strategyChoiceCount,countUnique(runtime.strategyChoices)),
    strategyCombatOutcomeCount:number(metrics.strategyCombatOutcomeCount,runtime.strategyCombatOutcomeCount,countUnique((runtime.strategyCombatOutcomes||[]).map(row=>row?.outcomeSignature))),
    newContentDimensionCount:number(metrics.newContentDimensionCount,runtime.newContentDimensionCount),
    repeatedActionExcludedCount:number(metrics.repeatedActionExcludedCount),
    meaningfulGameplayMilliseconds:number(depth.meaningfulGameplayMilliseconds),
    winPathCount:number(metrics.winPathCount,footprint.winPathCount,terminal==='VICTORY'?1:0),
    failPathCount:number(metrics.failPathCount,footprint.failPathCount,terminal==='DEFEAT'?1:0),
    retryPathCount:number(metrics.retryPathCount,footprint.retryPathCount),
    duplicateActionRatio:clamp01(metrics.duplicateActionRatio),
    testUiRatio:clamp01(metrics.testUiRatio??(proxyMarkers>0||directControls>0?1:0)),
    gameplayScreenRatio:clamp01(metrics.gameplayScreenRatio??metrics.gameplaySurfaceRatio),
    contentVariationCount:number(metrics.contentVariationCount,metrics.newContentEventCount,metrics.contentChangeCount),
    proxyMarkers,
    directSessionControls:directControls,
  });
}

function completePlayableCyclePass(evidence={}){
  const cycle=evidence?.initialPlayableCycle&&typeof evidence.initialPlayableCycle==='object'?evidence.initialPlayableCycle:
    evidence?.playableCycle&&typeof evidence.playableCycle==='object'?evidence.playableCycle:{};
  const unit=clean(cycle.unit||cycle.contract||evidence?.initialImplementationUnit||evidence?.substanceGate?.initialImplementationUnit||evidence?.sourceFootprint?.cycleContract);
  return unit==='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'&&(cycle.pass===true||evidence?.initialPlayableCyclePassed===true||evidence?.playableCyclePassed===true);
}

function categorySignals(profile,metrics){
  const transitions=Number(metrics.meaningfulStateTransitionCount||0),states=Number(metrics.uniqueGameplayStateCount||0),mechanics=Number(metrics.uniqueInteractedMechanicCount||metrics.uniqueMechanicCount||0),deps=Number(metrics.systemDependencyCount||0),entities=Number(metrics.enemyOrWorldEntityCount||0),retry=Number(metrics.retryPathCount||0)>0;
  const signals={
    SURVIVAL:{
      WORLD_AND_MOVEMENT:states>=3||metrics.areaCount>=2,
      RESOURCE_AND_GATHERING:metrics.stateVariableCount>=3&&transitions>=4,
      CRAFTING:mechanics>=3&&deps>=3,
      ENEMY_OR_THREAT:entities>0&&metrics.failPathCount>=1,
      SURVIVAL_PRESSURE:metrics.winPathCount>=1&&metrics.failPathCount>=1,
      EXPLORATION_VARIETY:metrics.areaCount>=2||metrics.newAreaCount>=1,
    },
    TOWER_DEFENSE:{
      PLACEMENT_AND_ROUTE:metrics.placementResultCount>=1,
      ENEMY_WAVES:metrics.enemyTypeCount>=1&&transitions>=4,
      TOWER_VARIETY:metrics.towerTypeCount>=2&&metrics.towerEffectProfileCount>=2,
      UPGRADES:mechanics>=3&&transitions>=5,
      ECONOMY:metrics.stateVariableCount>=3&&deps>=3,
      STRATEGIC_CHOICE:metrics.strategyChoiceCount>=2&&metrics.strategyCombatOutcomeCount>=2,
    },
    RPG:{
      COMBAT:entities>0&&transitions>=4,
      QUEST_AND_NPC:metrics.objectiveCount>=1,
      EXPLORATION:metrics.areaCount>=2||metrics.newAreaCount>=1,
      EQUIPMENT_AND_GROWTH:mechanics>=3&&transitions>=6,
      ENEMY_AND_BOSS:metrics.enemyTypeCount>=2||entities>=2,
      STORY_AND_WORLD_STATE:metrics.objectiveCount>=2||metrics.newObjectiveCount>=1,
    },
    TYCOON_SIMULATOR:{
      PRODUCTION_CHAIN:deps>=4&&transitions>=6,
      UPGRADES:mechanics>=3&&transitions>=5,
      AUTOMATION:mechanics>=4&&states>=4,
      ECONOMY:metrics.stateVariableCount>=4&&deps>=3,
      AREA_UNLOCK:metrics.areaCount>=2||metrics.newAreaCount>=1,
      MANUAL_AUTOMATION_CHOICE:metrics.strategyChoiceCount>=2||mechanics>=5,
    },
    PUZZLE:{
      PUZZLE_RULE:states>=4&&transitions>=5,
      REAL_SOLVABILITY:metrics.winPathCount>=1&&metrics.failPathCount>=1,
      DIFFICULTY_CURVE:states>=5,
      BOARD_STATE:metrics.stateVariableCount>=2&&states>=3,
      MECHANIC_VARIETY:mechanics>=3,
      FEEDBACK:metrics.uniqueFunctionalUiCount>=3&&transitions>=4,
    },
    OBBY_PLATFORMER:{
      MOVEMENT_FEEL:transitions>=6&&states>=4,
      LEVEL_DESIGN:metrics.areaCount>=2||metrics.newAreaCount>=1,
      OBSTACLE_VARIETY:metrics.contentVariationCount>=2,
      FAILURE_AND_RETRY:retry&&metrics.failPathCount>=1,
      DIFFICULTY_CURVE:states>=5,
      CHECKPOINTS:metrics.objectiveCount>=2||states>=6,
    },
    BATTLE_SHOOTER:{
      MOVEMENT:states>=3,
      ATTACK_AND_HIT:entities>0&&transitions>=5,
      ENEMY_AI:metrics.enemyTypeCount>=1&&entities>0,
      SKILL_AND_COOLDOWN:mechanics>=3,
      COMBAT_OBJECTIVE:metrics.winPathCount>=1&&metrics.failPathCount>=1,
      COMBAT_FEEDBACK:metrics.uniqueFunctionalUiCount>=3&&transitions>=4,
    },
    STORY_ADVENTURE:{
      EXPLORATION:metrics.areaCount>=2||metrics.newAreaCount>=1,
      QUEST:metrics.objectiveCount>=1,
      NPC_AND_DIALOGUE:metrics.objectiveCount>=2||mechanics>=3,
      EVENT_AND_STATE_CHANGE:states>=4&&transitions>=5,
      COMBAT_OR_PUZZLE:entities>0||states>=5,
      BRANCH_OR_OBJECTIVE:metrics.objectiveCount>=2||metrics.newObjectiveCount>=1,
    },
    LIFE_ROLEPLAY:{
      WORLD_AND_SPACE:metrics.areaCount>=2||metrics.newAreaCount>=1,
      INTERACTION:mechanics>=3&&transitions>=5,
      NPC:entities>=2,
      LIFE_ACTIVITIES:mechanics>=4,
      CHARACTER_STATE:metrics.stateVariableCount>=4,
      FREEDOM_AND_CHOICE:mechanics>=5&&states>=4,
    },
  };
  return signals[profile]||{};
}

function categoryScore(profile,metrics){
  const weights=WEB_CATEGORY_SCORE_WEIGHTS[profile];
  if(!weights)return{profile:null,total:0,scores:{},signals:{}};
  const signals=categorySignals(profile,metrics),scores={};let total=0;
  for(const [key,weight] of Object.entries(weights)){const score=signals[key]===true?weight:0;scores[key]=score;total+=score;}
  return{profile,total,scores,signals};
}

function categoryMatch(category,metrics,evidence={}){
  let declared=resolveWebCategoryProfile(category,evidence);
  if(declared==='DESIGN_DERIVED_PROFILE_REQUIRED')return{pass:false,declared:null,observed:null,declaredScore:0,candidates:{},detected:null,reason:'DESIGN_DERIVED_PROFILE_REQUIRED'};
  if(!declared)return{pass:false,declared:null,observed:null,declaredScore:0,candidates:{},detected:null,reason:'CATEGORY_PROFILE_UNKNOWN'};
  const candidates={};let max=-1,observed=[];
  for(const profile of Object.keys(WEB_CATEGORY_SCORE_WEIGHTS)){const row=categoryScore(profile,metrics);candidates[profile]=row.total;if(row.total>max){max=row.total;observed=[profile];}else if(row.total===max)observed.push(profile);}
  const detectedRaw=clean(evidence?.detectedCategory||evidence?.runtimeCategory||evidence?.categoryProfile);
  const detected=detectedRaw?resolveWebCategoryProfile(detectedRaw,evidence)||upper(detectedRaw):null;
  const declaredScore=candidates[declared]||0;
  const runtimeMatch=declaredScore>=16;
  const detectorMatch=!detected||detected===declared;
  return{pass:runtimeMatch&&detectorMatch,declared,observed:observed.length===1?observed[0]:observed.join('|'),declaredScore,candidates,detected,reason:runtimeMatch&&detectorMatch?null:'CATEGORY_PROFILE_MISMATCH'};
}

function harnessIndicators(sourceText,evidence,metrics){
  const text=String(sourceText||'');
  const directStageButton=/<button\b[^>]*(?:data-session-stage|data-content-depth-stage|data-validation-stage|data-test-stage)/i.test(text)||Number(metrics.directSessionControls)>0;
  const timeStageLabels=(text.match(/(?:0\s*[~\-–]\s*5|5\s*[~\-–]\s*15|15\s*[~\-–]\s*25|25\s*[~\-–]\s*30)/gi)||[]).length;
  const syntheticTimeProgress=timeStageLabels>=2||/data-session-minutes=["']30["']|data-session-proof-mode=["']PROGRESSION_MILESTONES["']|data-content-depth-stage=/i.test(text);
  const scopeProxy=/scope-control-|FULL APPROVED WEB COMPANION|승인 분량 전체 구현/i.test(text);
  const testPanel=/(?:validation|test)\s*(?:panel|checklist)|검증\s*(?:패널|체크리스트)|테스트\s*(?:패널|체크리스트)/i.test(text);
  const proxyIncrementCount=(text.match(/\b(?:questComplete|score|progress)\s*\+\+/g)||[]).length;
  const repeatedProxy=proxyIncrementCount>=3&&Number(metrics.systemDependencyCount)<=1&&Number(metrics.enemyOrWorldEntityCount)===0;
  const excessiveTestUi=Number(metrics.testUiRatio)>=0.25;
  const evidenceFakeProgress=evidence?.contentDepthValidation?.fakeProgress===true||evidence?.sourceFootprint?.fakeProgressMarkers>0;
  return Object.freeze({directStageButton,syntheticTimeProgress,scopeProxy,testPanel,repeatedProxy,excessiveTestUi,evidenceFakeProgress,proxyIncrementCount});
}

export function scoreWebStrictImplementation({category='',sourceText='',evidence={}}={}){
  const metrics=webGameplayMetrics(evidence);
  const categoryResult=categoryMatch(category,metrics,evidence);
  const harness=harnessIndicators(sourceText,evidence,metrics);
  const cyclePass=completePlayableCyclePass(evidence);
  const mobilePass=evidence?.mobileViewport?.touch===true&&Number(evidence?.after?.scrollWidth||0)<=Number(evidence?.after?.viewportWidth||0)+2;
  const runtimeStable=evidence?.runtimeSmokePassed===true&&!(evidence?.consoleErrors||[]).length&&!(evidence?.pageErrors||[]).length&&!(evidence?.failedRequests||[]).length&&!(evidence?.badResponses||[]).length;
  const inputStatePass=evidence?.gameplayInteractionPerformed!==false&&metrics.gameplayActionCount>=3&&metrics.meaningfulStateTransitionCount>=3;
  const gameplaySurfacePass=metrics.gameplayScreenRatio>=0.12;
  const realStatePass=metrics.meaningfulStateTransitionCount>=4&&metrics.systemDependencyCount>=2&&(metrics.stateVariableCount>=3||metrics.uniqueGameplayStateCount>=3||evidence?.stateChanged===true);
  const winAndFailPass=metrics.winPathCount>=1&&metrics.failPathCount>=1;
  const noTestProxy=!harness.directStageButton&&!harness.scopeProxy&&!harness.testPanel&&!harness.repeatedProxy&&!harness.excessiveTestUi;
  const noFakeProgress=!harness.syntheticTimeProgress&&!harness.evidenceFakeProgress;
  const realPlayablePass=cyclePass&&noTestProxy&&noFakeProgress&&metrics.uniqueMechanicCount>=3&&metrics.uniqueFunctionalUiCount>=2&&metrics.gameplayActionCount>=5&&metrics.duplicateActionRatio<0.9;
  const gates={
    REAL_PLAYABLE_GAME:realPlayablePass,
    COMPLETE_PLAYABLE_GAMEPLAY_CYCLE:cyclePass,
    REAL_PLAYER_INPUT:inputStatePass,
    REAL_GAMEPLAY_SURFACE:gameplaySurfacePass,
    MEANINGFUL_INTERCONNECTED_GAME_STATE:realStatePass,
    REAL_GOAL_OR_WIN_AND_REAL_FAILURE_PATH:winAndFailPass,
    NO_TEST_PROXY:noTestProxy,
    NO_FAKE_PROGRESS:noFakeProgress,
    MOBILE_PLAYABLE:mobilePass,
    RUNTIME_STABLE:runtimeStable,
    CATEGORY_PROFILE_MATCH:categoryResult.pass,
  };
  const hardFailures=Object.entries(gates).filter(([,pass])=>!pass).map(([name])=>name);

  const commonScores={
    CORE_GAME_LOOP:cyclePass?15:0,
    SYSTEM_CONNECTIVITY:Math.min(10,Math.max(0,Math.round(10*Math.min(1,metrics.systemDependencyCount/5)))),
    CONTROLS_AND_GAME_FEEL:Math.min(8,(mobilePass?3:0)+(metrics.gameplayActionCount>=8?2:metrics.gameplayActionCount>=5?1:0)+(metrics.meaningfulStateTransitionCount>=6?3:metrics.meaningfulStateTransitionCount>=3?1:0)),
    FUNCTIONAL_UI_UX:Math.max(0,Math.min(7,Math.round(7*Math.min(1,metrics.uniqueFunctionalUiCount/5)*(1-Math.min(0.8,metrics.duplicateActionRatio)*0.5)*(1-metrics.testUiRatio)))),
    PROGRESSION_GROWTH_REWARD:metrics.meaningfulStateTransitionCount>=6&&(metrics.stateVariableCount>=3||metrics.uniqueGameplayStateCount>=4)?7:0,
    RISK_FAILURE_RETRY:metrics.winPathCount>=1&&metrics.failPathCount>=1&&metrics.retryPathCount>=1?5:0,
    GAMEPLAY_FEEDBACK:metrics.meaningfulStateTransitionCount>=3&&(metrics.uniqueFunctionalUiCount>=3||evidence?.musicRuntime?.pass===true)?4:0,
    STABILITY_PERFORMANCE:runtimeStable&&mobilePass?4:0,
  };
  const categoryRow=categoryResult.declared?categoryScore(categoryResult.declared,metrics):{total:0,scores:{},signals:{}};
  const categoryScores=Object.fromEntries(Object.entries(categoryRow.scores).map(([key,value])=>[`CATEGORY_${key}`,value]));
  const categoryWeights=categoryResult.declared?Object.fromEntries(Object.entries(WEB_CATEGORY_SCORE_WEIGHTS[categoryResult.declared]).map(([key,value])=>[`CATEGORY_${key}`,value])):{};
  const scores={...commonScores,...categoryScores};
  const weights={...WEB_COMMON_SCORE_WEIGHTS,...categoryWeights};
  const commonScore=Object.values(commonScores).reduce((sum,value)=>sum+Number(value||0),0);
  const categoryTotal=Object.values(categoryScores).reduce((sum,value)=>sum+Number(value||0),0);
  return Object.freeze({
    totalScore:commonScore+categoryTotal,
    commonScore,
    categoryScore:categoryTotal,
    scores:Object.freeze(scores),
    weights:Object.freeze(weights),
    hardFailures:Object.freeze(hardFailures),
    hardGates:Object.freeze(gates),
    metrics,
    categoryProfile:categoryResult.declared,
    observedCategoryProfile:categoryResult.observed,
    categoryMatchPassed:categoryResult.pass,
    categoryCandidates:Object.freeze(categoryResult.candidates),
    categorySignals:Object.freeze(categoryRow.signals),
    harnessIndicators:harness,
    finalContentDepthRequiredHere:false,
  });
}

function normalizedSubstanceGate(evidence={}){
  const explicit=evidence?.substanceGate&&typeof evidence.substanceGate==='object'?evidence.substanceGate:null;
  if(explicit)return explicit;
  const footprint=evidence?.sourceFootprint&&typeof evidence.sourceFootprint==='object'?evidence.sourceFootprint:{};
  return {
    pass:footprint.pass===true,
    implementationClass:footprint.pass===true?'DEDICATED_REAL_GAME':'UNKNOWN',
    totalBytes:Number(footprint.totalBytes||0),
    executableBytes:Number(footprint.scriptBytes||0),
    mechanicCount:Number(footprint.mechanicCount||0),
    directSessionControls:footprint.stageButtons===true?1:0,
    proxyMarkers:Number(footprint.proxyMarkers||0),
    initialImplementationUnit:clean(footprint.cycleContract),
  };
}

export function realGameSubstancePass(evidence={}){
  const gate=normalizedSubstanceGate(evidence),metrics=webGameplayMetrics(evidence);
  const implementationClass=upper(gate.implementationClass);
  return gate.pass===true
    && implementationClass.startsWith('DEDICATED')
    && Number(gate.totalBytes)>=12000
    && Number(gate.executableBytes)>=6000
    && Number(gate.mechanicCount)>=3
    && Number(gate.directSessionControls||0)===0
    && Number(gate.proxyMarkers||0)===0
    && completePlayableCyclePass(evidence)
    && metrics.uniqueFunctionalUiCount>=2
    && metrics.gameplayActionCount>=5
    && metrics.meaningfulStateTransitionCount>=3
    && metrics.gameplayScreenRatio>=0.12
    && metrics.winPathCount>=1
    && metrics.failPathCount>=1
    && metrics.testUiRatio<0.25
    && metrics.duplicateActionRatio<0.9
    && evidence?.mobileViewport?.touch===true
    && evidence?.runtimeSmokePassed===true;
}

export function finalContentDepthPass(evidence={}){
  const depth=evidence?.contentDepthValidation&&typeof evidence.contentDepthValidation==='object'?evidence.contentDepthValidation:{};
  const metrics=webGameplayMetrics({...evidence,implementationMetrics:depth.metrics||evidence?.implementationMetrics,runtimeFeatureEvidence:depth.runtimeFeatureEvidence||evidence?.runtimeFeatureEvidence});
  const varietyEvents=Array.isArray(depth.varietyEvents)?new Set(depth.varietyEvents.filter(Boolean)).size:0;
  const validatedMinutes=number(depth.validatedMinutes,depth.actualGameplayMinutes);
  const meaningfulMs=number(depth.meaningfulGameplayMilliseconds);
  const diversityCount=Math.max(metrics.contentVariationCount,varietyEvents);
  return completePlayableCyclePass(evidence)
    && depth.mode==='FINAL_CONTENT_DEPTH_VALIDATION_ONLY'
    && depth.validationMode==='REAL_ELAPSED_GAMEPLAY'
    && depth.pass===true
    && depth.realContent===true
    && depth.fakeProgress!==true
    && depth.testHarness!==true
    && depth.directStageClick!==true
    && number(depth.targetMinutes,30)>=30
    && validatedMinutes>=30
    && meaningfulMs>=30*60*1000
    && metrics.uniqueMechanicCount>=5
    && metrics.uniqueFunctionalUiCount>=4
    && metrics.meaningfulStateTransitionCount>=10
    && metrics.systemDependencyCount>=4
    && metrics.gameplayScreenRatio>=0.12
    && metrics.duplicateActionRatio<=0.8
    && metrics.testUiRatio===0
    && metrics.directSessionControls===0
    && metrics.newContentDimensionCount>=2
    && diversityCount>=2;
}

export function structuredWebSessionPass(evidence={}){
  return finalContentDepthPass(evidence);
}

export function evaluateWebValidationEvidence(evidence={},options={}){
  const minimumScore=Number(options.minimumScore??WEB_HOMEPAGE_MINIMUM);
  const requirePromotionRevalidation=options.requirePromotionRevalidation===true;
  const requireFinalContentDepth=options.requireFinalContentDepth!==false;
  const currentSourceSha256=clean(options.currentSourceSha256);
  const currentBaselineSha256=clean(options.currentBaselineSha256);
  const score=strictScoreOf(evidence);
  const hardFailures=hardFailuresOf(evidence);
  const schema=Number(evidence?.validationSchemaVersion||evidence?.version||0);
  const sourceHash=clean(evidence?.sourceIndexSha256);
  const baselineHash=clean(evidence?.designBaselineSha256);
  const substancePass=realGameSubstancePass(evidence);
  const depthPass=finalContentDepthPass(evidence);
  const blockers=[];
  if(schema<WEB_VALIDATION_SCHEMA_VERSION)blockers.push('WEB_VALIDATION_SCHEMA_STALE');
  if(evidence?.validated!==true)blockers.push('WEB_RUNTIME_VALIDATION_NOT_PASS');
  if(evidence?.musicRuntime?.pass!==true)blockers.push('WEB_MUSIC_RUNTIME_NOT_PASS');
  if(!substancePass)blockers.push('WEB_REAL_GAME_SUBSTANCE_NOT_PASS');
  if(requireFinalContentDepth&&!depthPass)blockers.push('WEB_FINAL_CONTENT_DEPTH_NOT_PASS');
  if(!Number.isFinite(score)||score<minimumScore)blockers.push('WEB_STRICT_SCORE_BELOW_MINIMUM');
  if(hardFailures.length)blockers.push('WEB_STRICT_HARD_FAILURE');
  if(!sourceHash||!baselineHash)blockers.push('WEB_EVIDENCE_HASH_MISSING');
  if(currentSourceSha256&&sourceHash!==currentSourceSha256)blockers.push('WEB_SOURCE_HASH_STALE');
  if(currentBaselineSha256&&baselineHash!==currentBaselineSha256)blockers.push('WEB_BASELINE_HASH_STALE');
  if(requirePromotionRevalidation){
    if(minimumScore<WEB_PLATFORM_PROMOTION_MINIMUM)blockers.push('WEB_PROMOTION_MINIMUM_CONFIGURATION_INVALID');
    if(evidence?.formalImplementationPassed!==true)blockers.push('WEB_FORMAL_IMPLEMENTATION_NOT_PASS');
    if(evidence?.promotionRevalidation?.pass!==true||evidence?.promotionRevalidation?.independentRun!==true)blockers.push('WEB_INDEPENDENT_PROMOTION_REVALIDATION_NOT_PASS');
    if(evidence?.promotionRevalidation?.sourceHashMatch!==true)blockers.push('WEB_PROMOTION_SOURCE_HASH_MISMATCH');
    if(evidence?.promotionRevalidation?.baselineHashMatch!==true)blockers.push('WEB_PROMOTION_BASELINE_HASH_MISMATCH');
    const secondSubstance=evidence?.promotionRevalidation?.secondSubstancePass===true||evidence?.promotionRevalidation?.secondFootprintPass===true;
    if(!secondSubstance)blockers.push('WEB_PROMOTION_SUBSTANCE_REVALIDATION_NOT_PASS');
    if(evidence?.promotionRevalidation?.secondContentDepthPass!==true&&evidence?.promotionRevalidation?.secondFinalContentDepthPass!==true)blockers.push('WEB_PROMOTION_CONTENT_DEPTH_REVALIDATION_NOT_PASS');
  }
  return Object.freeze({
    version:5,
    pass:blockers.length===0,
    score:Number.isFinite(score)?score:null,
    schema,
    hardFailures:Object.freeze([...hardFailures]),
    finalContentDepthPass:depthPass,
    structured30MinutePass:depthPass,
    realGameSubstancePass:substancePass,
    sourceHash:sourceHash||null,
    baselineHash:baselineHash||null,
    requirePromotionRevalidation,
    requireFinalContentDepth,
    minimumScore,
    blockers:Object.freeze([...new Set(blockers)]),
  });
}
