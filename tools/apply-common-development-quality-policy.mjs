// One-shot migration for the 2026-09-15 common development quality contract.
// Idempotent by design. Remove this file after the migration commit is verified.
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const write=(file,text)=>fs.writeFileSync(file,text);
const requireIncludes=(text,needle,file)=>{if(!text.includes(needle))throw new Error(`MIGRATION_ANCHOR_MISSING:${file}:${needle.slice(0,80)}`);};
const replaceOnce=(text,from,to,file)=>{if(text.includes(to))return text;requireIncludes(text,from,file);return text.replace(from,to);};
const addAfter=(text,anchor,addition,file)=>{if(text.includes(addition.trim()))return text;requireIncludes(text,anchor,file);return text.replace(anchor,`${anchor}${addition}`);};

const gateIds=[
  'REAL_CORE_LOOP','GAME_STATE_INTEGRITY','DESIGN_FIDELITY','ANTI_FAKE_RUNTIME','MOBILE_INPUT_AND_LAYOUT',
  'WORLD_PLAYABILITY','PLAYER_MOVEMENT','COLLISION_AND_WORLD_BOUNDS','CAMERA_OR_WORLD_FOLLOW','MAP_DENSITY_AND_DISCOVERY',
  'PROXIMITY_INTERACTION','ENEMY_AI_AND_THREAT','COMBAT_RANGE_AND_DAMAGE_FAIRNESS','SPAWN_AND_RESPAWN_SAFETY',
  'CHARACTER_COMBAT_FEEDBACK','BOSS_ENCOUNTER_QUALITY','PROGRESSION_AND_REWARD','ECONOMY_AND_EQUIPMENT_INTEGRITY',
  'SAVE_RESTORE_AND_MIGRATION','SOFTLOCK_RECOVERABILITY','PERFORMANCE_AND_RUNTIME_STABILITY','REGRESSION_REPLAY',
  'FUN_AND_PACING','PORTABILITY_READINESS'
];

function updateEvidenceContract(){
  const file='tools/company-web-validation-evidence-contract.mjs';
  let text=read(file);
  text=replaceOnce(text,"import crypto from 'node:crypto';","import crypto from 'node:crypto';\nimport {evaluateCommonDevelopmentQuality,COMMON_DEVELOPMENT_CONTRACT_VERSION} from './company-common-development-quality-contract.mjs';",file);
  text=text.replace('export const WEB_VALIDATION_SCHEMA_VERSION=13;','export const WEB_VALIDATION_SCHEMA_VERSION=14;');
  text=replaceOnce(text,
    "export function scoreWebStrictImplementation({category='',sourceText='',evidence={}}={}){const {m,cat,h,gates}=objectiveFromRaw(evidence,category,sourceText);const commonScores=",
    "export function scoreWebStrictImplementation({category='',sourceText='',evidence={}}={}){const {m,cat,h,gates}=objectiveFromRaw(evidence,category,sourceText),commonQuality=evaluateCommonDevelopmentQuality({category:category||cat.declared,evidence});const commonScores=",file);
  text=replaceOnce(text,
    "hardFailures=[...baseHard,...(!axes.pass?['REQUIRED_AXIS_MINIMUM']:[])];return Object.freeze({",
    "hardFailures=[...baseHard,...commonQuality.blockers,...(!axes.pass?['REQUIRED_AXIS_MINIMUM']:[])];return Object.freeze({",file);
  text=replaceOnce(text,
    'hardGates:Object.freeze(gates),metrics:m,',
    'hardGates:Object.freeze(gates),commonDevelopmentQuality:commonQuality,commonDevelopmentContractVersion:COMMON_DEVELOPMENT_CONTRACT_VERSION,metrics:m,',file);
  text=replaceOnce(text,
    'raw=objectiveFromRaw(evidence,declaredCategory),computedConfidence=',
    'raw=objectiveFromRaw(evidence,declaredCategory),commonQuality=evaluateCommonDevelopmentQuality({category:declaredCategory,evidence}),computedConfidence=',file);
  text=replaceOnce(text,
    "if(!substance)blockers.push('WEB_REAL_GAME_SUBSTANCE_NOT_PASS');if(requireDepth",
    "if(!substance)blockers.push('WEB_REAL_GAME_SUBSTANCE_NOT_PASS');if(!commonQuality.pass)blockers.push('WEB_COMMON_DEVELOPMENT_QUALITY_NOT_PASS',...commonQuality.blockers);if(requireDepth",file);
  text=replaceOnce(text,
    'realGameSubstancePass:substance,sourceHash:',
    'realGameSubstancePass:substance,commonDevelopmentQualityPass:commonQuality.pass,commonDevelopmentQuality:commonQuality,commonDevelopmentContractVersion:COMMON_DEVELOPMENT_CONTRACT_VERSION,sourceHash:',file);
  text=text.replace('return Object.freeze({version:7,pass:blockers.length===0,','return Object.freeze({version:8,pass:blockers.length===0,');
  write(file,text);
}

function updateCentralPolicy(){
  const file='COMPANY_FLOW.md';
  let text=read(file);
  text=text.replace('developmentScoreRequiresSchema13: true','developmentScoreRequiresSchema14: true');
  text=addAfter(text,'      - CATEGORY_PROFILE_MATCH\n','      - COMMON_DEVELOPMENT_QUALITY\n',file);
  text=addAfter(text,'    webCandidateFormalImplementationPassRequiredBeforeTargetPlatformDispatch: true\n','    commonDevelopmentQualityPassRequiredBeforeTargetPlatformDispatch: true\n',file);
  text=addAfter(text,'      - CORE_LOOP\n','      - COMMON_DEVELOPMENT_QUALITY_CONTRACT\n',file);
  text=addAfter(text,'      - REAL_WEB_GAMEPLAY_PASS\n','      - COMMON_DEVELOPMENT_QUALITY_PASS\n',file);
  text=addAfter(text,'      - CURRENT_WEB_COMPANION_RUNTIME_PASS\n','      - CURRENT_COMMON_DEVELOPMENT_QUALITY_PASS\n',file);
  text=addAfter(text,'      - CURRENT_WEB_COMPANION_RUNTIME_PASS\n      - APPROVED_SCOPE_FULLY_IMPLEMENTED\n','      - COMMON_DEVELOPMENT_QUALITY_PASS\n',file);
  const section=`\ncommonDevelopmentQuality:\n  version: 1\n  sourceOfTruth: COMPANY_FLOW.md\n  executableMirror: tools/company-common-development-quality-contract.mjs\n  appliesAcross:\n    - WEB_PREPLATFORM_PLAYABLE_GAME\n    - SELECTED_TARGET_PLATFORM_DEVELOPMENT\n    - RELEASE_REVALIDATION\n  webRole: SCALED_COMPLETE_PREPLATFORM_GAME\n  coreQualityParityWithTargetPlatform: true\n  webContentQuantityMayBeReduced: true\n  webCoreMechanicsMayNotBeDeferredToTargetPlatform: true\n  targetPlatformRole: EXPAND_VALIDATED_WEB_CORE\n  targetPlatformDispatchRequiresPass: true\n  scoreCannotOverrideFailedGate: true\n  genreApplicabilityDerivedFromApprovedDesign: true\n  runtimeEvidencePreferredOverSourceKeywords: true\n  antiFakeCrossChecksInternalStateVisibleStateAndInputOutcome: true\n  gates:\n${gateIds.map(x=>`    - ${x}`).join('\n')}\n  requiredChecks:\n    - REAL_WORLD_COORDINATE_MOVEMENT_WHEN_AVATAR_GENRE\n    - MOBILE_TOUCH_OR_JOYSTICK_AND_KEYBOARD_WHEN_AVATAR_GENRE\n    - COLLISION_WORLD_BOUNDS_CAMERA_OR_WORLD_FOLLOW_WHEN_APPLICABLE\n    - MULTI_AREA_WORLD_REGION_IDENTITY_LANDMARK_DISCOVERY_AND_EXPLORATION_REWARD\n    - PROXIMITY_BASED_INTERACTION_WHEN_WORLD_INTERACTION_EXISTS\n    - ENEMY_AI_PERCEPTION_TRACKING_DISENGAGE_UNSTUCK_AND_TERRITORY_WHEN_APPLICABLE\n    - COMBAT_RANGE_HITBOX_COOLDOWN_IFRAME_PROJECTILE_TARGETING_AND_DAMAGE_SOURCE_INTEGRITY\n    - SPAWN_RESPAWN_CHECKPOINT_REENTRY_AND_SCENE_CLEANUP_SAFETY\n    - BOSS_MULTI_PATTERN_TELEGRAPH_DODGE_SPACE_REWARD_AND_RETRY_WHEN_APPROVED\n    - INVENTORY_EQUIPMENT_CRAFT_SHOP_QUEST_TRANSACTION_AND_DISPLAY_STATE_INTEGRITY\n    - PROGRESSION_ECONOMY_REWARD_RISK_RETURN_PROBABILITY_AND_EXPLOIT_RESISTANCE\n    - SAVE_RESTORE_WORLD_STATE_SCHEMA_MIGRATION_CORRUPT_DATA_RECOVERY_AND_NEW_GAME_RESET\n    - STATE_MACHINE_INVARIANTS_EVENT_ORDER_DUPLICATE_REWARD_AND_SOFTLOCK_PREVENTION\n    - DELTA_TIME_PAUSE_TAB_RESUME_TIMER_LISTENER_ENTITY_AND_PROJECTILE_LIFECYCLE_STABILITY\n    - NAN_INFINITY_COORDINATE_RANGE_INPUT_LOCK_MULTITOUCH_ROTATION_DPR_AND_VIEWPORT_RESILIENCE\n    - ASSET_LOAD_FAILURE_ERROR_ISOLATION_CONSOLE_ERROR_AND_OFFLINE_CORE_RUNTIME_RESILIENCE\n    - DATA_DRIVEN_RULES_STABLE_IDS_SINGLE_SOURCE_OF_TRUTH_AND_SAVE_COMPATIBILITY\n    - DEBUG_CHEAT_VALIDATION_ONLY_PATH_AND_HIDDEN_ADMIN_CONTROL_ABSENCE\n    - DETERMINISTIC_REPLAY_FAILURE_REPRODUCTION_REGRESSION_BASELINE_AND_EVIDENCE_RETENTION\n    - CONTENT_REACHABILITY_PROGRESS_DEPENDENCY_REQUIRED_ITEM_AND_MAP_CONNECTIVITY\n    - CONTENT_DIVERSITY_REGION_IDENTITY_FIRST_MINUTE_ONBOARDING_GOAL_CLARITY_AND_REPETITION_CONTROL\n    - FUN_PACING_ACTION_FEEDBACK_REWARD_INTERVAL_DIFFICULTY_WAVE_SESSION_LENGTH_AND_COMPLETION_FEEL\n    - LOW_END_MOBILE_PEAK_LOAD_LONG_SESSION_MEMORY_EVENT_LISTENER_AND_SPAWN_STRESS\n    - UI_GAME_STATE_SAVE_STATE_VISUAL_STATE_EQUIVALENCE_AND_TEXT_READABILITY\n    - PORTABLE_SIMULATION_MODEL_SEPARATED_FROM_WEB_RENDER_INPUT_STORAGE_WHERE_PRACTICAL\n    - DESIGN_REQUIREMENT_TO_IMPLEMENTATION_TO_RUNTIME_EVIDENCE_TRACEABILITY\n  evidenceFallbackPolicy:\n    directRuntimeEvidencePreferred: true\n    observedOutcomeFallbackAllowedWhenDirectProbeUnavailable: true\n    fallbackUseMustBeReportedAsEvidenceQualityWarning: true\n    missingMandatoryGenreEvidenceBlocksPromotion: true\n  futureExtension:\n    addPolicyHereFirst: true\n    updateExecutableMirrorAndTestsInSameChange: true\n    schemaVersionMustIncreaseWhenEvidenceMeaningChanges: true\n\n`;
  if(!text.includes('\ncommonDevelopmentQuality:\n')){
    const anchor='homepageOperations:\n';
    requireIncludes(text,anchor,file);
    text=text.replace(anchor,`${section}${anchor}`);
  }
  write(file,text);
}

function updateDirective(){
  const file='company-directive.json';
  const data=JSON.parse(read(file));
  data.revision=Number(data.revision||0)+1;
  data.updatedAt='2026-09-15';
  const display=data.homepageOperations?.developmentProgressDisplay;
  if(display){delete display.scoreRequiresSchema13;display.scoreRequiresSchema14=true;}
  data.commonDevelopmentQuality={
    version:1,
    policyDocument:'COMPANY_FLOW.md',
    executableMirror:'tools/company-common-development-quality-contract.mjs',
    webRole:'SCALED_COMPLETE_PREPLATFORM_GAME',
    coreQualityParityWithTargetPlatform:true,
    webContentQuantityMayBeReduced:true,
    webCoreMechanicsMayNotBeDeferredToTargetPlatform:true,
    targetPlatformRole:'EXPAND_VALIDATED_WEB_CORE',
    targetPlatformDispatchRequiresPass:true,
    gates:gateIds,
    futureExtension:{centralPolicyFirst:true,executableMirrorAndTestsSameChange:true,schemaBumpWhenEvidenceMeaningChanges:true}
  };
  if(data.production?.webCompanion){data.production.webCompanion.preplatformRole='SCALED_COMPLETE_PREPLATFORM_GAME';data.production.webCompanion.coreQualityParityWithTargetPlatform=true;data.production.webCompanion.contentQuantityMayBeReduced=true;}
  const dev=data.classes?.DEVELOPMENT_CONFIRMED;
  if(dev){dev.commonDevelopmentQualityPassRequiredBeforeTargetPlatformDispatch=true;dev.requiredFlow=Array.from(new Set([...(dev.requiredFlow||[]).flatMap(x=>x==='TARGET_PLATFORM_90_POINT_GATE'?['COMMON_DEVELOPMENT_QUALITY_GATE',x]:[x])]));dev.baselineReadyRequires=Array.from(new Set([...(dev.baselineReadyRequires||[]),'COMMON_DEVELOPMENT_QUALITY_PASS']));}
  const rel=data.classes?.RELEASE_CONFIRMED;
  if(rel){rel.commonDevelopmentQualityRequired=true;rel.releaseReadyRequires=Array.from(new Set([...(rel.releaseReadyRequires||[]),'CURRENT_COMMON_DEVELOPMENT_QUALITY_PASS']));}
  write(file,JSON.stringify(data,null,2)+'\n');
}

function updateApplicabilityAndSchemaQa(){
  const contractFile='tools/company-common-development-quality-contract.mjs';
  let contract=read(contractFile);
  contract=replaceOnce(contract,
    "const world=bool(feature.worldRequired,avatarMovement||['TOWER_DEFENSE','TYCOON_SIMULATOR'].includes(profile)&&num(runtime.areaCount,metrics.areaCount)>=2);",
    'const world=bool(feature.worldRequired,avatarMovement);',contractFile);
  write(contractFile,contract);

  const qaFile='qa/company-development-validation-selected-platform.test.mjs';
  let qa=read(qaFile);
  qa=replaceOnce(qa,
    "test('DEVELOPMENT_CONFIRMED consumes canonical schema13 Web evidence and independent 90-point promotion revalidation',()=>{",
    "test('DEVELOPMENT_CONFIRMED consumes canonical schema14 Web evidence and independent 90-point promotion revalidation',()=>{",qaFile);
  qa=replaceOnce(qa,
    'assert.match(contract,/WEB_VALIDATION_SCHEMA_VERSION=13/);',
    'assert.match(contract,/WEB_VALIDATION_SCHEMA_VERSION=14/);',qaFile);
  write(qaFile,qa);
}

function writeQaTest(){
  const file='qa/company-common-development-quality-contract.test.mjs';
  const content=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {COMMON_DEVELOPMENT_GATE_IDS,evaluateCommonDevelopmentQuality} from '../tools/company-common-development-quality-contract.mjs';\nimport {WEB_VALIDATION_SCHEMA_VERSION,evaluateWebValidationEvidence} from '../tools/company-web-validation-evidence-contract.mjs';\n\nconst flow=fs.readFileSync('COMPANY_FLOW.md','utf8');\nconst directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));\nconst evidenceContract=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');\nconst developmentCycle=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');\nconst bootstrap=fs.readFileSync('tools/company-development-web-bootstrap.mjs','utf8');\n\nconst baseEvidence=()=>({\n  version:WEB_VALIDATION_SCHEMA_VERSION,validationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,validated:true,runtimeSmokePassed:true,\n  categoryProfile:'TYCOON_SIMULATOR',validationStage:'initial-cycle',gameplayInteractionPerformed:true,interactionCount:12,stateChanged:true,stateChangeCount:8,\n  approvedScopeFullyImplemented:true,scopeCoverage:{pass:true,mechanicBindings:['mine','smelt','sell','upgrade','unlock']},musicRuntime:{pass:true},\n  mobileViewport:{width:390,height:844,touch:true},after:{scrollWidth:390,viewportWidth:390},before:{scrollWidth:390,viewportWidth:390},\n  sourceFootprint:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:16000,scriptBytes:8000,mechanicCount:7,proxyMarkers:0,stageButtons:false,winPathCount:1,failPathCount:1,retryPathCount:1,cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},\n  substanceGate:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:16000,executableBytes:8000,mechanicCount:7,directSessionControls:0,proxyMarkers:0,initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},\n  initialPlayableCycle:{pass:true,unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',growthRewardOrMeaningfulChoice:true,riskFailureOrResourcePressure:true},initialPlayableCyclePassed:true,\n  implementationMetrics:{uniqueMechanicCount:7,uniqueFunctionalUiCount:6,gameplayActionCount:12,stateVariableCount:6,meaningfulStateTransitionCount:8,uniqueGameplayStateCount:8,uniqueInteractedMechanicCount:5,systemDependencyCount:5,enemyOrWorldEntityCount:3,enemyTypeCount:2,areaCount:3,objectiveCount:3,interactionTargetCount:0,entityInteractionResultCount:0,spatialOutcomeCount:2,newContentDimensionCount:3,winPathCount:1,failPathCount:1,retryPathCount:1,duplicateActionRatio:.2,testUiRatio:0,gameplayScreenRatio:.5,contentVariationCount:3},\n  runtimeFeatureEvidence:{enemyTypeCount:2,areaCount:3,objectiveCount:3,landmarkCount:1,interactionTargetCount:0,entityInteractionResultCount:0,spatialOutcomeCount:2,newContentDimensionCount:3,spatialEvidence:{detected3D:false,collisionObserved:true,cameraObserved:true,spatialOutcomeObserved:true}},\n  runtimeValidationEvidence:{mobile:{pass:true},softlock:{pass:true},performance:{pass:true},economy:{required:false,pass:true},saveRestore:{required:false,pass:true},replayRegression:{required:false,pass:true},preplatformReadiness:{pass:true}},\n  sourceIndexSha256:'source',designBaselineSha256:'baseline',webStrictScore:95,strictReview:{totalScore:95,hardFailures:[]},formalImplementationPassed:false\n});\n\ntest('central policy owns the common development quality contract and schema 14',()=>{\n  assert.match(flow,/commonDevelopmentQuality:/);\n  assert.match(flow,/webRole: SCALED_COMPLETE_PREPLATFORM_GAME/);\n  assert.match(flow,/targetPlatformRole: EXPAND_VALIDATED_WEB_CORE/);\n  assert.match(flow,/developmentScoreRequiresSchema14: true/);\n  assert.equal(directive.homepageOperations.developmentProgressDisplay.scoreRequiresSchema14,true);\n  assert.equal(directive.commonDevelopmentQuality.targetPlatformDispatchRequiresPass,true);\n  assert.equal(WEB_VALIDATION_SCHEMA_VERSION,14);\n});\n\ntest('all executable common gates are mirrored by the central policy',()=>{\n  assert.ok(COMMON_DEVELOPMENT_GATE_IDS.length>=24);\n  for(const gate of COMMON_DEVELOPMENT_GATE_IDS)assert.match(flow,new RegExp('\\\\- '+gate));\n  assert.match(evidenceContract,/evaluateCommonDevelopmentQuality/);\n  assert.match(developmentCycle,/evaluateWebValidationEvidence/);\n  assert.match(bootstrap,/WEB_PREPLATFORM_IMPLEMENTATION_POLICY/);\n});\n\ntest('non-avatar tycoon can pass without fake avatar requirements',()=>{\n  const result=evaluateCommonDevelopmentQuality({category:'SIMULATOR_TYCOON_INCREMENTAL',evidence:baseEvidence()});\n  assert.equal(result.pass,true,result.blockers.join(','));\n  assert.equal(result.gates.PLAYER_MOVEMENT.status,'N/A');\n  assert.equal(result.gates.WORLD_PLAYABILITY.status,'N/A');\n});\n\ntest('avatar survival cannot pass without real movement collision and world follow',()=>{\n  const evidence=baseEvidence();evidence.categoryProfile='SURVIVAL';evidence.featureRequirements={avatarMovementRequired:true,worldRequired:true,explorationRequired:true};\n  evidence.runtimeFeatureEvidence={...evidence.runtimeFeatureEvidence,interactionTargetCount:1,entityInteractionResultCount:1};\n  const result=evaluateCommonDevelopmentQuality({category:'ACTION_SURVIVAL_ROGUELITE',evidence});\n  assert.equal(result.pass,false);\n  assert.ok(result.blockers.includes('COMMON_PLAYER_MOVEMENT_REQUIRED'));\n  assert.ok(result.blockers.includes('COMMON_COLLISION_AND_WORLD_BOUNDS_REQUIRED'));\n});\n\ntest('approved final boss content requires a real multi-pattern boss before platform dispatch',()=>{\n  const evidence=baseEvidence();evidence.categoryProfile='RPG';evidence.validationStage='final-content-depth';evidence.featureRequirements={avatarMovementRequired:true,worldRequired:true,explorationRequired:true,bossRequired:true};\n  evidence.movementProbe={moved:true,visualChanged:true,antiFakePass:true,touchControlPresent:true,collisionObserved:true,cameraObserved:true};\n  evidence.runtimeFeatureEvidence={...evidence.runtimeFeatureEvidence,areaCount:2,landmarkCount:1,interactionTargetCount:1,entityInteractionResultCount:1,bossTypeCount:0,bossPatternCount:0,newContentDimensionCount:3};\n  evidence.contentDepthValidation={mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',status:'COMPLETE',pass:true,meaningfulGameplayMilliseconds:1800000,varietyEvents:['area','enemy'],metrics:{...evidence.implementationMetrics,newContentDimensionCount:3,contentVariationCount:3}};\n  evidence.runtimeValidationEvidence={...evidence.runtimeValidationEvidence,replayRegression:{required:true,pass:true},preplatformReadiness:{pass:false}};\n  const result=evaluateCommonDevelopmentQuality({category:'IDLE_GROWTH_RPG',evidence});\n  assert.equal(result.pass,false);\n  assert.ok(result.blockers.includes('COMMON_BOSS_ENCOUNTER_QUALITY_REQUIRED'));\n});\n\ntest('web evidence evaluator exposes common quality blockers to the native dispatch gate',()=>{\n  const evidence=baseEvidence();evidence.categoryProfile='SURVIVAL';evidence.featureRequirements={avatarMovementRequired:true,worldRequired:true};\n  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80,requireFinalContentDepth:false});\n  assert.equal(result.commonDevelopmentQualityPass,false);\n  assert.ok(result.blockers.includes('WEB_COMMON_DEVELOPMENT_QUALITY_NOT_PASS'));\n  assert.ok(result.blockers.includes('COMMON_PLAYER_MOVEMENT_REQUIRED'));\n});\n`;
  write(file,content);
}

function updatePermanentQaWorkflow(){
  const file='.github/workflows/company-central-policy-contract-qa.yml';
  let text=read(file);
  for(const anchor of ["      - 'tools/company-web-validation-evidence-contract.mjs'\n"]){
    text=addAfter(text,anchor,"      - 'tools/company-common-development-quality-contract.mjs'\n",file);
  }
  for(const anchor of ["      - 'qa/company-web-validation-evidence-contract.test.mjs'\n"]){
    text=addAfter(text,anchor,"      - 'qa/company-common-development-quality-contract.test.mjs'\n",file);
  }
  text=addAfter(text,'          node --check tools/company-web-validation-evidence-contract.mjs\n','          node --check tools/company-common-development-quality-contract.mjs\n',file);
  text=addAfter(text,'            qa/company-web-validation-evidence-contract.test.mjs \\\n','            qa/company-common-development-quality-contract.test.mjs \\\n',file);
  write(file,text);
}

updateCentralPolicy();
updateDirective();
updateApplicabilityAndSchemaQa();
updateEvidenceContract();
writeQaTest();
updatePermanentQaWorkflow();
console.log('COMMON_DEVELOPMENT_POLICY_MIGRATION=APPLIED');
