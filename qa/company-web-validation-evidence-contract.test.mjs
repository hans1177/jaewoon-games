import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateWebValidationEvidence,sha256Text} from '../tools/company-web-validation-evidence-contract.mjs';

const metrics=()=>({
  uniqueMechanicCount:7,
  uniqueFunctionalUiCount:6,
  gameplayActionCount:20,
  meaningfulStateTransitionCount:12,
  uniqueGameplayStateCount:12,
  uniqueInteractedMechanicCount:5,
  systemDependencyCount:5,
  enemyOrWorldEntityCount:3,
  winPathCount:1,
  failPathCount:1,
  retryPathCount:1,
  gameplayScreenRatio:0.45,
  duplicateActionRatio:0.25,
  testUiRatio:0,
  approvedScopePass:true,
  terminalReached:true,
});
const baseEvidence=()=>{
  const implementationMetrics=metrics();
  return {
    version:12,validationSchemaVersion:12,pass:true,validated:true,musicRuntime:{pass:true},sessionDepthMinutes:30,
    initialImplementationMinuteHardGate:false,
    initialPlayableCycle:{pass:true,unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',blockers:[]},
    implementationMetrics,
    contentDepthValidation:{pass:true,targetMinutes:30,validationMode:'REAL_GAMEPLAY_DIVERSITY_PROXY',initialBuildMinuteHardGate:false,blockers:[],metrics:implementationMetrics},
    substanceGate:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:13613,executableBytes:7000,mechanicCount:7,directSessionControls:0,proxyMarkers:0,initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},
    webStrictScore:92,strictReview:{totalScore:92,hardFailures:[]},sourceIndexSha256:sha256Text('web'),designBaselineSha256:sha256Text('design'),
    formalImplementationPassed:true,promotionRevalidation:{pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true,secondSubstancePass:true,secondContentDepthPass:true},
  };
};

test('fresh 80+ real-cycle evidence with final content depth is homepage eligible',()=>{
  const evidence=baseEvidence();evidence.webStrictScore=84;evidence.strictReview.totalScore=84;evidence.formalImplementationPassed=false;evidence.promotionRevalidation={pass:false,independentRun:false};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(result.pass,true,result.blockers.join(','));
  assert.equal(result.realGameSubstancePass,true);
  assert.equal(result.finalContentDepthPass,true);
  assert.equal(result.structured30MinutePass,true);
});

test('native promotion requires fresh 90+ independent substance and content-depth revalidation',()=>{
  const evidence=baseEvidence();
  const pass=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  const stale=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true,currentSourceSha256:sha256Text('changed'),currentBaselineSha256:sha256Text('design')});
  assert.equal(stale.pass,false);assert.ok(stale.blockers.includes('WEB_SOURCE_HASH_STALE'));
  evidence.promotionRevalidation.secondSubstancePass=false;
  const noSubstance=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(noSubstance.pass,false);assert.ok(noSubstance.blockers.includes('WEB_PROMOTION_SUBSTANCE_REVALIDATION_NOT_PASS'));
  evidence.promotionRevalidation.secondSubstancePass=true;evidence.promotionRevalidation.secondContentDepthPass=false;
  const noDepth=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(noDepth.pass,false);assert.ok(noDepth.blockers.includes('WEB_PROMOTION_CONTENT_DEPTH_REVALIDATION_NOT_PASS'));
});

test('current validator footprint plus complete cycle and gameplay diversity evidence are accepted',()=>{
  const evidence=baseEvidence();delete evidence.substanceGate;
  evidence.sourceFootprint={pass:true,totalBytes:13613,scriptBytes:6800,mechanicCount:7,stageButtons:false,proxyMarkers:0,cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'};
  evidence.promotionRevalidation={pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true,secondFootprintPass:true,secondContentDepthPass:true};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(result.pass,true,result.blockers.join(','));
});

test('legacy, thin or fake-depth evidence cannot pass',()=>{
  const evidence=baseEvidence();evidence.validationSchemaVersion=11;evidence.substanceGate.totalBytes=5000;evidence.initialPlayableCycle.pass=false;evidence.contentDepthValidation.pass=false;evidence.implementationMetrics.meaningfulStateTransitionCount=2;
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_VALIDATION_SCHEMA_STALE'));
  assert.ok(result.blockers.includes('WEB_REAL_GAME_SUBSTANCE_NOT_PASS'));
  assert.ok(result.blockers.includes('WEB_FINAL_CONTENT_DEPTH_NOT_PASS'));
});