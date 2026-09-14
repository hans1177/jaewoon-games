import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEB_OBJECTIVE_SCORING_RULES,
  scoreWebStrictImplementation,
  evaluateWebValidationEvidence,
  sha256Text,
} from '../tools/company-web-validation-evidence-contract.mjs';

const evidence=()=>({
  validationSchemaVersion:13,version:13,validated:true,target:'web',categoryProfile:'TYCOON_SIMULATOR',
  gameplayInteractionPerformed:true,stateChanged:true,stateChangeCount:12,runtimeSmokePassed:true,
  consoleErrors:[],pageErrors:[],failedRequests:[],badResponses:[],
  mobileViewport:{width:390,height:844,touch:true},after:{scrollWidth:390,viewportWidth:390},musicRuntime:{pass:true},
  approvedScopeFullyImplemented:true,scopeCoverage:{pass:true,mechanicBindings:['mine','smelt','sell','upgrade','auto']},
  initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',initialPlayableCycle:{pass:true,unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},initialPlayableCyclePassed:true,
  implementationMetrics:{uniqueMechanicCount:7,uniqueFunctionalUiCount:6,gameplayActionCount:20,stateVariableCount:9,meaningfulStateTransitionCount:12,uniqueGameplayStateCount:13,uniqueInteractedMechanicCount:5,systemDependencyCount:5,enemyOrWorldEntityCount:3,enemyTypeCount:3,newEnemyTypeCount:2,areaCount:3,newAreaCount:1,objectiveCount:3,newObjectiveCount:1,strategyChoiceCount:3,winPathCount:1,failPathCount:1,retryPathCount:1,duplicateActionRatio:.2,testUiRatio:0,gameplayScreenRatio:.45,contentVariationCount:3,newContentDimensionCount:3},
  runtimeFeatureEvidence:{areas:['field','ridge'],newAreas:['ridge'],strategyChoices:['manual','auto'],independentStrategyEvidence:{required:false,pass:true}},
  sourceFootprint:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:16000,scriptBytes:8000,mechanicCount:7,cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',stageButtons:false,proxyMarkers:0,winPathCount:1,failPathCount:1,retryPathCount:1},
  substanceGate:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:16000,executableBytes:8000,mechanicCount:7,directSessionControls:0,proxyMarkers:0,initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},
  sourceIndexSha256:sha256Text('web'),designBaselineSha256:sha256Text('design'),
});

test('objective scoring keeps quality, evidence confidence, stability and subjective review separate',()=>{
  const result=scoreWebStrictImplementation({category:'SIMULATOR_TYCOON_INCREMENTAL',evidence:evidence()});
  assert.equal(typeof result.totalScore,'number');
  assert.equal(typeof result.evidenceConfidence.score,'number');
  assert.equal(typeof result.regressionStability.score,'number');
  assert.equal(result.subjectiveQuality.includedInAutomaticScore,false);
  assert.equal(result.axisAudit.pass,true);
  assert.equal(result.scoreCap,100);
});

test('weak critical axis caps total below homepage threshold instead of being averaged away',()=>{
  const e=evidence();
  e.implementationMetrics.systemDependencyCount=1;
  const result=scoreWebStrictImplementation({category:'SIMULATOR_TYCOON_INCREMENTAL',evidence:e});
  assert.equal(result.axisAudit.pass,false);
  assert.ok(result.axisAudit.commonMinimumFailures.includes('SYSTEM_CONNECTIVITY'));
  assert.equal(result.scoreCap,WEB_OBJECTIVE_SCORING_RULES.weakAxisScoreCap);
  assert.ok(result.totalScore<80,result.totalScore);
});

test('evidence confidence is not multiplied into game quality score',()=>{
  const e=evidence();
  const result=scoreWebStrictImplementation({category:'SIMULATOR_TYCOON_INCREMENTAL',evidence:e});
  assert.notEqual(result.totalScore,Math.round(result.rawScore*result.evidenceConfidence.score/100));
  assert.equal(result.totalScore,result.rawScore);
});

test('promotion blocks independently low confidence or regression stability',()=>{
  const e=evidence();
  e.webStrictScore=95;
  e.strictReview={totalScore:95,hardFailures:[],objectiveScoring:{axisAudit:{pass:true},evidenceConfidence:{score:60},regressionStability:{score:50}}};
  e.contentDepthValidation={mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',validationMode:'REAL_ELAPSED_GAMEPLAY',pass:true,realContent:true,fakeProgress:false,testHarness:false,directStageClick:false,targetMinutes:30,validatedMinutes:30,meaningfulGameplayMilliseconds:1800000,varietyEvents:['new-area','new-system'],metrics:{...e.implementationMetrics,uniqueMechanicCount:7,uniqueFunctionalUiCount:6,meaningfulStateTransitionCount:12,systemDependencyCount:5,newContentDimensionCount:3,contentVariationCount:3},runtimeFeatureEvidence:e.runtimeFeatureEvidence};
  e.formalImplementationPassed=true;e.promotionRevalidation={pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true,secondSubstancePass:true,secondContentDepthPass:true};
  const result=evaluateWebValidationEvidence(e,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_EVIDENCE_CONFIDENCE_BELOW_MINIMUM'));
  assert.ok(result.blockers.includes('WEB_REGRESSION_STABILITY_BELOW_MINIMUM'));
});
