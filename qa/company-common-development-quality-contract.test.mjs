import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COMMON_DEVELOPMENT_GATE_IDS,evaluateCommonDevelopmentQuality} from '../tools/company-common-development-quality-contract.mjs';
import {WEB_VALIDATION_SCHEMA_VERSION,evaluateWebValidationEvidence} from '../tools/company-web-validation-evidence-contract.mjs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const evidenceContract=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');
const developmentCycle=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
const bootstrap=fs.readFileSync('tools/company-development-web-bootstrap.mjs','utf8');

const baseEvidence=()=>({
  version:WEB_VALIDATION_SCHEMA_VERSION,validationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,validated:true,runtimeSmokePassed:true,
  categoryProfile:'TYCOON_SIMULATOR',validationStage:'initial-cycle',gameplayInteractionPerformed:true,interactionCount:12,stateChanged:true,stateChangeCount:8,
  approvedScopeFullyImplemented:true,scopeCoverage:{pass:true,mechanicBindings:['mine','smelt','sell','upgrade','unlock']},musicRuntime:{pass:true},
  mobileViewport:{width:390,height:844,touch:true},after:{scrollWidth:390,viewportWidth:390},before:{scrollWidth:390,viewportWidth:390},
  sourceFootprint:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:16000,scriptBytes:8000,mechanicCount:7,proxyMarkers:0,stageButtons:false,winPathCount:1,failPathCount:1,retryPathCount:1,cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},
  substanceGate:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:16000,executableBytes:8000,mechanicCount:7,directSessionControls:0,proxyMarkers:0,initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},
  initialPlayableCycle:{pass:true,unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',growthRewardOrMeaningfulChoice:true,riskFailureOrResourcePressure:true},initialPlayableCyclePassed:true,
  implementationMetrics:{uniqueMechanicCount:7,uniqueFunctionalUiCount:6,gameplayActionCount:12,stateVariableCount:6,meaningfulStateTransitionCount:8,uniqueGameplayStateCount:8,uniqueInteractedMechanicCount:5,systemDependencyCount:5,enemyOrWorldEntityCount:3,enemyTypeCount:2,areaCount:3,objectiveCount:3,interactionTargetCount:0,entityInteractionResultCount:0,spatialOutcomeCount:2,newContentDimensionCount:3,winPathCount:1,failPathCount:1,retryPathCount:1,duplicateActionRatio:.2,testUiRatio:0,gameplayScreenRatio:.5,contentVariationCount:3},
  runtimeFeatureEvidence:{enemyTypeCount:2,areaCount:3,objectiveCount:3,landmarkCount:1,interactionTargetCount:0,entityInteractionResultCount:0,spatialOutcomeCount:2,newContentDimensionCount:3,spatialEvidence:{detected3D:false,collisionObserved:true,cameraObserved:true,spatialOutcomeObserved:true}},
  runtimeValidationEvidence:{mobile:{pass:true},softlock:{pass:true},performance:{pass:true},economy:{required:false,pass:true},saveRestore:{required:false,pass:true},replayRegression:{required:false,pass:true},preplatformReadiness:{pass:true}},
  sourceIndexSha256:'source',designBaselineSha256:'baseline',webStrictScore:95,strictReview:{totalScore:95,hardFailures:[]},formalImplementationPassed:false
});

test('central policy owns the common development quality contract and schema 14',()=>{
  assert.match(flow,/commonDevelopmentQuality:/);
  assert.match(flow,/webRole: SCALED_COMPLETE_PREPLATFORM_GAME/);
  assert.match(flow,/targetPlatformRole: EXPAND_VALIDATED_WEB_CORE/);
  assert.match(flow,/developmentScoreRequiresSchema14: true/);
  assert.equal(directive.homepageOperations.developmentProgressDisplay.scoreRequiresSchema14,true);
  assert.equal(directive.commonDevelopmentQuality.targetPlatformDispatchRequiresPass,true);
  assert.equal(WEB_VALIDATION_SCHEMA_VERSION,14);
});

test('all executable common gates are mirrored by the central policy',()=>{
  assert.ok(COMMON_DEVELOPMENT_GATE_IDS.length>=24);
  for(const gate of COMMON_DEVELOPMENT_GATE_IDS)assert.match(flow,new RegExp('\\- '+gate));
  assert.match(evidenceContract,/evaluateCommonDevelopmentQuality/);
  assert.match(developmentCycle,/evaluateWebValidationEvidence/);
  assert.match(bootstrap,/WEB_PREPLATFORM_IMPLEMENTATION_POLICY/);
});

test('non-avatar tycoon can pass without fake avatar requirements',()=>{
  const result=evaluateCommonDevelopmentQuality({category:'SIMULATOR_TYCOON_INCREMENTAL',evidence:baseEvidence()});
  assert.equal(result.pass,true,result.blockers.join(','));
  assert.equal(result.gates.PLAYER_MOVEMENT.status,'N/A');
  assert.equal(result.gates.WORLD_PLAYABILITY.status,'N/A');
});

test('avatar survival cannot pass without real movement collision and world follow',()=>{
  const evidence=baseEvidence();evidence.categoryProfile='SURVIVAL';evidence.featureRequirements={avatarMovementRequired:true,worldRequired:true,explorationRequired:true};
  evidence.runtimeFeatureEvidence={...evidence.runtimeFeatureEvidence,interactionTargetCount:1,entityInteractionResultCount:1};
  const result=evaluateCommonDevelopmentQuality({category:'ACTION_SURVIVAL_ROGUELITE',evidence});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('COMMON_PLAYER_MOVEMENT_REQUIRED'));
  assert.ok(result.blockers.includes('COMMON_COLLISION_AND_WORLD_BOUNDS_REQUIRED'));
});

test('approved final boss content requires a real multi-pattern boss before platform dispatch',()=>{
  const evidence=baseEvidence();evidence.categoryProfile='RPG';evidence.validationStage='final-content-depth';evidence.featureRequirements={avatarMovementRequired:true,worldRequired:true,explorationRequired:true,bossRequired:true};
  evidence.movementProbe={moved:true,visualChanged:true,antiFakePass:true,touchControlPresent:true,collisionObserved:true,cameraObserved:true};
  evidence.runtimeFeatureEvidence={...evidence.runtimeFeatureEvidence,areaCount:2,landmarkCount:1,interactionTargetCount:1,entityInteractionResultCount:1,bossTypeCount:0,bossPatternCount:0,newContentDimensionCount:3};
  evidence.contentDepthValidation={mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',status:'COMPLETE',pass:true,meaningfulGameplayMilliseconds:1800000,varietyEvents:['area','enemy'],metrics:{...evidence.implementationMetrics,newContentDimensionCount:3,contentVariationCount:3}};
  evidence.runtimeValidationEvidence={...evidence.runtimeValidationEvidence,replayRegression:{required:true,pass:true},preplatformReadiness:{pass:false}};
  const result=evaluateCommonDevelopmentQuality({category:'IDLE_GROWTH_RPG',evidence});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('COMMON_BOSS_ENCOUNTER_QUALITY_REQUIRED'));
});

test('web evidence evaluator exposes common quality blockers to the native dispatch gate',()=>{
  const evidence=baseEvidence();evidence.categoryProfile='SURVIVAL';evidence.featureRequirements={avatarMovementRequired:true,worldRequired:true};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80,requireFinalContentDepth:false});
  assert.equal(result.commonDevelopmentQualityPass,false);
  assert.ok(result.blockers.includes('WEB_COMMON_DEVELOPMENT_QUALITY_NOT_PASS'));
  assert.ok(result.blockers.includes('COMMON_PLAYER_MOVEMENT_REQUIRED'));
});
