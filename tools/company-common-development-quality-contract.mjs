// 파일명: tools/company-common-development-quality-contract.mjs
// COMPANY_FLOW.md의 공통 개발 품질 규칙을 Web 사전검증과 본 플랫폼 진입 게이트가 함께 쓰는 단일 실행 계약으로 미러링한다.

export const COMMON_DEVELOPMENT_CONTRACT_VERSION=1;
export const COMMON_DEVELOPMENT_POLICY_SOURCE='COMPANY_FLOW.md';
export const COMMON_DEVELOPMENT_GATE_IDS=Object.freeze([
  'REAL_CORE_LOOP',
  'GAME_STATE_INTEGRITY',
  'DESIGN_FIDELITY',
  'ANTI_FAKE_RUNTIME',
  'MOBILE_INPUT_AND_LAYOUT',
  'WORLD_PLAYABILITY',
  'PLAYER_MOVEMENT',
  'COLLISION_AND_WORLD_BOUNDS',
  'CAMERA_OR_WORLD_FOLLOW',
  'MAP_DENSITY_AND_DISCOVERY',
  'PROXIMITY_INTERACTION',
  'ENEMY_AI_AND_THREAT',
  'COMBAT_RANGE_AND_DAMAGE_FAIRNESS',
  'SPAWN_AND_RESPAWN_SAFETY',
  'CHARACTER_COMBAT_FEEDBACK',
  'BOSS_ENCOUNTER_QUALITY',
  'PROGRESSION_AND_REWARD',
  'ECONOMY_AND_EQUIPMENT_INTEGRITY',
  'SAVE_RESTORE_AND_MIGRATION',
  'SOFTLOCK_RECOVERABILITY',
  'PERFORMANCE_AND_RUNTIME_STABILITY',
  'REGRESSION_REPLAY',
  'FUN_AND_PACING',
  'PORTABILITY_READINESS',
]);

const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const num=(...values)=>{for(const value of values){const n=Number(value);if(Number.isFinite(n))return n;}return 0;};
const bool=(value,fallback=false)=>value===true?true:value===false?false:fallback;
const array=value=>Array.isArray(value)?value:[];
const status=(applicable,pass,evidence={})=>Object.freeze({applicable,status:!applicable?'N/A':pass?'PASS':'FAIL',pass:!applicable||pass===true,evidence:Object.freeze({...evidence})});

const CATEGORY_PROFILE_MAP=Object.freeze({
  ACTION_SURVIVAL_ROGUELITE:'SURVIVAL',
  SINGLE_DEFENSE_STRATEGY:'TOWER_DEFENSE',
  IDLE_GROWTH_RPG:'RPG',
  STORY_COMPLETE_RPG:'STORY_ADVENTURE',
  ROLEPLAY_LIFE_AVATAR:'LIFE_ROLEPLAY',
  SIMULATOR_TYCOON_INCREMENTAL:'TYCOON_SIMULATOR',
  BATTLEGROUND_FIGHTING_SHOOTER:'BATTLE_SHOOTER',
  SURVIVAL_HORROR_ESCAPE:'SURVIVAL',
  OBBY_PARTY_MINIGAME:'OBBY_PLATFORMER',
  STORY_RPG_ADVENTURE_RPG:'STORY_ADVENTURE',
});

function categoryProfile(category,evidence={}){
  const explicit=upper(evidence?.categoryProfile||evidence?.strictReview?.evidence?.categoryProfile);
  if(explicit)return CATEGORY_PROFILE_MAP[explicit]||explicit;
  const raw=upper(category||evidence?.GAME_CATEGORY||evidence?.category);
  return CATEGORY_PROFILE_MAP[raw]||raw||'UNKNOWN';
}

function requirementsOf(category,evidence={}){
  const profile=categoryProfile(category,evidence),feature=evidence?.featureRequirements||evidence?.runtimeFeatureEvidence?.featureRequirements||{},runtime=evidence?.runtimeFeatureEvidence||{},metrics=evidence?.implementationMetrics||{};
  const finalStage=clean(evidence?.validationStage)==='final-content-depth'||evidence?.contentDepthValidation?.mode==='FINAL_CONTENT_DEPTH_VALIDATION_ONLY'&&evidence?.contentDepthValidation?.status!=='PENDING_AFTER_CONTENT_EXPANSION';
  const avatarMovement=bool(feature.avatarMovementRequired,['SURVIVAL','RPG','BATTLE_SHOOTER','OBBY_PLATFORMER','STORY_ADVENTURE','LIFE_ROLEPLAY'].includes(profile));
  const world=bool(feature.worldRequired,avatarMovement);
  const exploration=bool(feature.explorationRequired,['SURVIVAL','RPG','STORY_ADVENTURE','LIFE_ROLEPLAY'].includes(profile));
  const boss=bool(feature.bossRequired,false);
  const enemyAi=['SURVIVAL','RPG','BATTLE_SHOOTER','TOWER_DEFENSE','STORY_ADVENTURE'].includes(profile);
  const directCombat=['SURVIVAL','RPG','BATTLE_SHOOTER','STORY_ADVENTURE'].includes(profile);
  const interaction=num(runtime.interactionTargetCount,metrics.interactionTargetCount)>0||exploration;
  return Object.freeze({profile,finalStage,avatarMovement,world,exploration,boss,enemyAi,directCombat,interaction});
}

function optionalEvidencePass(record,fallback){
  if(record&&typeof record==='object'){
    if(record.required===false)return true;
    if(record.pass===true)return true;
    if(record.pass===false)return false;
  }
  return fallback;
}

export function evaluateCommonDevelopmentQuality({category='',evidence={},requireRegressionReplay=false}={}){
  const req=requirementsOf(category,evidence),runtime=evidence?.runtimeFeatureEvidence||{},validation=evidence?.runtimeValidationEvidence||{},metrics=evidence?.implementationMetrics||{},cycle=evidence?.initialPlayableCycle||{},movement=evidence?.movementProbe||runtime?.movementProbe||validation?.preplatformReadiness?.movement?.evidence||{},preplatform=validation?.preplatformReadiness||{},scope=evidence?.scopeCoverage||{},footprint=evidence?.sourceFootprint||{},substance=evidence?.substanceGate||{},depth=evidence?.contentDepthValidation||{},spatial=runtime?.spatialEvidence||{},errors=array(evidence?.consoleErrors).length+array(evidence?.pageErrors).length+array(evidence?.failedRequests).length+array(evidence?.badResponses).length;

  const interactionCount=num(evidence?.interactionCount,metrics.gameplayActionCount),transitions=num(evidence?.stateChangeCount,metrics.meaningfulStateTransitionCount),stateVars=num(metrics.stateVariableCount),dependencies=num(metrics.systemDependencyCount),enemyTypes=num(runtime.enemyTypeCount,metrics.enemyTypeCount),areas=num(runtime.areaCount,metrics.areaCount),objectives=num(runtime.objectiveCount,metrics.objectiveCount),landmarks=num(runtime.landmarkCount,metrics.landmarkCount),bossTypes=num(runtime.bossTypeCount,metrics.bossTypeCount),bossPatterns=num(runtime.bossPatternCount,metrics.bossPatternCount),interactionTargets=num(runtime.interactionTargetCount,metrics.interactionTargetCount),interactionResults=num(runtime.entityInteractionResultCount,metrics.entityInteractionResultCount),spatialOutcomes=num(runtime.spatialOutcomeCount,metrics.spatialOutcomeCount),newDimensions=num(runtime.newContentDimensionCount,metrics.newContentDimensionCount),variations=num(metrics.contentVariationCount,array(depth?.varietyEvents).length),gameplayScreenRatio=Number(metrics.gameplayScreenRatio||0),duplicateRatio=Number(metrics.duplicateActionRatio||0),testUiRatio=Number(metrics.testUiRatio||0);

  const runtimeStable=evidence?.runtimeSmokePassed===true&&errors===0;
  const scopePass=evidence?.approvedScopeFullyImplemented===true&&scope?.pass===true;
  const cyclePass=cycle?.pass===true||evidence?.initialPlayableCyclePassed===true;
  const proxyFree=num(substance.proxyMarkers,footprint.proxyMarkers)===0&&num(substance.directSessionControls,footprint.stageButtons===true?1:0)===0&&testUiRatio<0.25;
  const stateIntegrity=transitions>=3&&interactionCount>=5&&(stateVars>=2||dependencies>=2||evidence?.stateChanged===true)&&runtimeStable;
  const mobilePass=validation?.mobile?.pass===true||evidence?.mobileViewport?.touch===true&&num(evidence?.after?.scrollWidth)<=num(evidence?.after?.viewportWidth)+2;
  const movementPass=!req.avatarMovement||movement.moved===true&&movement.visualChanged===true&&movement.antiFakePass!==false&&movement.touchControlPresent===true;
  const collisionPass=!req.avatarMovement||movement.collisionObserved===true;
  const cameraPass=!(req.avatarMovement&&req.world)||movement.cameraObserved===true;
  const worldPass=!req.world||areas>=2&&spatialOutcomes>=1;
  const mapDensityPass=!req.world||areas>=2&&(landmarks>=1||objectives>=2||enemyTypes>=2||interactionTargets>=2);
  const proximityFallback=interactionResults>=1;
  const proximityPass=!req.interaction||optionalEvidencePass(runtime?.proximityInteractionEvidence,proximityFallback);
  const enemyAiFallback=enemyTypes>=1&&(spatialOutcomes>=1||transitions>=4)&&cycle?.riskFailureOrResourcePressure!==false;
  const enemyAiPass=!req.enemyAi||optionalEvidencePass(runtime?.enemyAiEvidence,enemyAiFallback);
  const difficultyPass=validation?.difficulty?.required!==true||validation?.difficulty?.pass===true;
  const combatFairnessFallback=!req.directCombat||enemyTypes>=1&&difficultyPass&&cycle?.riskFailureOrResourcePressure!==false&&num(metrics.failPathCount,footprint.failPathCount)>=1;
  const combatFairnessPass=!req.directCombat||optionalEvidencePass(runtime?.combatRangeEvidence,combatFairnessFallback);
  const spawnFallback=!req.enemyAi||cyclePass&&interactionCount>=5&&validation?.softlock?.pass!==false;
  const spawnPass=!req.enemyAi||optionalEvidencePass(runtime?.spawnSafetyEvidence,spawnFallback);
  const feedbackFallback=!req.directCombat||transitions>=3&&gameplayScreenRatio>=0.12;
  const feedbackPass=!req.directCombat||optionalEvidencePass(runtime?.combatFeedbackEvidence,feedbackFallback);
  const bossPass=!(req.finalStage&&req.boss)||bossTypes>=1&&bossPatterns>=2&&optionalEvidencePass(runtime?.bossEncounterEvidence,true);
  const explorationPass=!(req.finalStage&&req.exploration)||landmarks>=1&&interactionResults>=1&&areas>=2;
  const progressionPass=cycle?.growthRewardOrMeaningfulChoice!==false&&(transitions>=3||num(metrics.uniqueGameplayStateCount)>=3);
  const economyPass=validation?.economy?.required!==true||validation?.economy?.pass===true;
  const savePass=validation?.saveRestore?.required!==true||validation?.saveRestore?.pass===true;
  const softlockPass=validation?.softlock?.pass===true||cyclePass&&num(metrics.retryPathCount,footprint.retryPathCount)>=1;
  const performancePass=validation?.performance?.pass!==false&&runtimeStable;
  const replay=validation?.replayRegression||evidence?.deterministicReplay||{};
  const replayApplicable=requireRegressionReplay===true||replay?.required===true;
  const replayPass=!replayApplicable||replay?.required===false||replay?.pass===true||evidence?.promotionRevalidation?.pass===true;
  const pacingPass=!req.finalStage||depth?.pass===true&&num(depth.meaningfulGameplayMilliseconds)>=1800000&&newDimensions>=2&&variations>=2&&duplicateRatio<=0.8&&testUiRatio===0;
  const funPass=cyclePass&&progressionPass&&cycle?.riskFailureOrResourcePressure!==false&&pacingPass;
  const preplatformPass=preplatform?.pass!==false&&movementPass&&worldPass&&explorationPass&&bossPass;
  const portabilityPass=!req.finalStage||preplatformPass&&scopePass&&savePass&&runtimeStable;

  const gates={
    REAL_CORE_LOOP:status(true,cyclePass,{cyclePass,interactionCount}),
    GAME_STATE_INTEGRITY:status(true,stateIntegrity,{transitions,interactionCount,stateVars,dependencies,runtimeStable}),
    DESIGN_FIDELITY:status(true,scopePass,{approvedScopeFullyImplemented:evidence?.approvedScopeFullyImplemented===true,scopePass:scope?.pass===true}),
    ANTI_FAKE_RUNTIME:status(true,proxyFree&&(!req.avatarMovement||movement.antiFakePass===true),{proxyMarkers:num(substance.proxyMarkers,footprint.proxyMarkers),testUiRatio,movementAntiFakePass:movement.antiFakePass??null}),
    MOBILE_INPUT_AND_LAYOUT:status(true,mobilePass&&(!req.avatarMovement||movement.touchControlPresent===true),{mobilePass,touchControlPresent:movement.touchControlPresent??null}),
    WORLD_PLAYABILITY:status(req.world,worldPass,{areas,spatialOutcomes}),
    PLAYER_MOVEMENT:status(req.avatarMovement,movementPass,{moved:movement.moved??null,visualChanged:movement.visualChanged??null}),
    COLLISION_AND_WORLD_BOUNDS:status(req.avatarMovement,collisionPass,{collisionObserved:movement.collisionObserved??spatial.collisionObserved??null}),
    CAMERA_OR_WORLD_FOLLOW:status(req.avatarMovement&&req.world,cameraPass,{cameraObserved:movement.cameraObserved??spatial.cameraObserved??null}),
    MAP_DENSITY_AND_DISCOVERY:status(req.world,mapDensityPass,{areas,landmarks,objectives,enemyTypes,interactionTargets}),
    PROXIMITY_INTERACTION:status(req.interaction,proximityPass,{interactionTargets,interactionResults,directEvidence:runtime?.proximityInteractionEvidence||null}),
    ENEMY_AI_AND_THREAT:status(req.enemyAi,enemyAiPass,{enemyTypes,spatialOutcomes,directEvidence:runtime?.enemyAiEvidence||null}),
    COMBAT_RANGE_AND_DAMAGE_FAIRNESS:status(req.directCombat,combatFairnessPass,{enemyTypes,difficultyPass,failPathCount:num(metrics.failPathCount,footprint.failPathCount),directEvidence:runtime?.combatRangeEvidence||null}),
    SPAWN_AND_RESPAWN_SAFETY:status(req.enemyAi,spawnPass,{softlockPass:validation?.softlock?.pass??null,directEvidence:runtime?.spawnSafetyEvidence||null}),
    CHARACTER_COMBAT_FEEDBACK:status(req.directCombat,feedbackPass,{transitions,gameplayScreenRatio,directEvidence:runtime?.combatFeedbackEvidence||null}),
    BOSS_ENCOUNTER_QUALITY:status(req.finalStage&&req.boss,bossPass,{bossTypes,bossPatterns,directEvidence:runtime?.bossEncounterEvidence||null}),
    PROGRESSION_AND_REWARD:status(true,progressionPass,{transitions,growthRewardOrMeaningfulChoice:cycle?.growthRewardOrMeaningfulChoice??null}),
    ECONOMY_AND_EQUIPMENT_INTEGRITY:status(validation?.economy?.required===true,economyPass,{economy:validation?.economy||null}),
    SAVE_RESTORE_AND_MIGRATION:status(validation?.saveRestore?.required===true,savePass,{saveRestore:validation?.saveRestore||null}),
    SOFTLOCK_RECOVERABILITY:status(true,softlockPass,{softlock:validation?.softlock||null,retryPathCount:num(metrics.retryPathCount,footprint.retryPathCount)}),
    PERFORMANCE_AND_RUNTIME_STABILITY:status(true,performancePass,{runtimeStable,performance:validation?.performance||null,errorCount:errors}),
    REGRESSION_REPLAY:status(replayApplicable,replayPass,{replay}),
    FUN_AND_PACING:status(true,funPass,{finalStage:req.finalStage,pacingPass,newDimensions,variations,duplicateRatio,testUiRatio}),
    PORTABILITY_READINESS:status(req.finalStage,portabilityPass,{preplatformPass,scopePass,savePass,runtimeStable}),
  };

  const blockers=Object.entries(gates).filter(([,row])=>row.applicable&&row.pass!==true).map(([id])=>`COMMON_${id}_REQUIRED`);
  const warnings=[];
  if(req.enemyAi&&!runtime?.enemyAiEvidence)warnings.push('ENEMY_AI_USES_OBSERVED_OUTCOME_FALLBACK');
  if(req.directCombat&&!runtime?.combatRangeEvidence)warnings.push('COMBAT_RANGE_USES_OBSERVED_OUTCOME_FALLBACK');
  if(req.enemyAi&&!runtime?.spawnSafetyEvidence)warnings.push('SPAWN_SAFETY_USES_RECOVERABILITY_FALLBACK');
  if(req.interaction&&!runtime?.proximityInteractionEvidence)warnings.push('PROXIMITY_USES_INTERACTION_OUTCOME_FALLBACK');
  if(req.directCombat&&!runtime?.combatFeedbackEvidence)warnings.push('COMBAT_FEEDBACK_USES_STATE_AND_SURFACE_FALLBACK');

  return Object.freeze({
    version:COMMON_DEVELOPMENT_CONTRACT_VERSION,
    policyDocument:COMMON_DEVELOPMENT_POLICY_SOURCE,
    pass:blockers.length===0,
    phase:req.finalStage?'FINAL_PREPLATFORM':'INITIAL_PLAYABLE',
    categoryProfile:req.profile,
    requirements:req,
    gates:Object.freeze(gates),
    blockers:Object.freeze(blockers),
    evidenceQualityWarnings:Object.freeze(warnings),
    coreQualityParity:true,
    webContentQuantityMayBeReduced:true,
    mainPlatformRole:'EXPAND_VALIDATED_WEB_CORE',
  });
}
