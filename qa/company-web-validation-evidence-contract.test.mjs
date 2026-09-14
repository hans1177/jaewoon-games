import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateWebValidationEvidence,sha256Text} from '../tools/company-web-validation-evidence-contract.mjs';

const baseEvidence=()=>({
  version:12,validationSchemaVersion:12,pass:true,validated:true,musicRuntime:{pass:true},sessionDepthMinutes:32,
  realGameQualification:{pass:true,gates:{REAL_GAME:true,COMPLETE_CYCLE:true,REAL_INPUT:true,GAMEPLAY_SURFACE:true,REAL_STATE:true,WIN_LOSS:true,NO_TEST_PROXY:true,NO_FAKE_PROGRESS:true,MOBILE_PLAYABLE:true,RUNTIME_STABLE:true}},
  substanceGate:{pass:true,implementationClass:'DEDICATED',mechanicCount:7,directSessionControls:0,proxyMarkers:0},
  contentDepthValidation:{pass:true,validationMode:'STRUCTURAL_REAL_GAME_CONTENT_DEPTH',targetMinutes:30,estimatedPlayableMinutes:32,uniqueFunctionalUiCount:7,uniqueInteractedMechanics:5,uniqueStateCount:10,meaningfulStateTransitions:9,categoryScore:30,testUiFree:true,directTimeStageProofUsed:false},
  webStrictScore:92,strictReview:{totalScore:92,hardFailures:[]},sourceIndexSha256:sha256Text('web'),designBaselineSha256:sha256Text('design'),
  formalImplementationPassed:true,promotionRevalidation:{pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true,secondSubstancePass:true,secondContentDepthPass:true},
});

test('fresh 80+ real complete-cycle evidence with final content depth is homepage eligible',()=>{
  const evidence=baseEvidence();evidence.webStrictScore=84;evidence.strictReview.totalScore=84;evidence.formalImplementationPassed=false;evidence.promotionRevalidation={pass:false,independentRun:false};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(result.pass,true,result.blockers.join(','));
  assert.equal(result.realGameSubstancePass,true);
  assert.equal(result.completePlayableCyclePass,true);
  assert.equal(result.final30MinuteContentDepthPass,true);
});

test('native promotion requires fresh 90+ independent substance and content-depth revalidation',()=>{
  const evidence=baseEvidence();
  const pass=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  const stale=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true,currentSourceSha256:sha256Text('changed'),currentBaselineSha256:sha256Text('design')});
  assert.equal(stale.pass,false);assert.ok(stale.blockers.includes('WEB_SOURCE_HASH_STALE'));
  evidence.promotionRevalidation.secondContentDepthPass=false;
  const noDepth=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(noDepth.pass,false);assert.ok(noDepth.blockers.includes('WEB_PROMOTION_CONTENT_DEPTH_REVALIDATION_NOT_PASS'));
});

test('initial complete cycle alone cannot impersonate final 30-minute content depth',()=>{
  const evidence=baseEvidence();evidence.contentDepthValidation={...evidence.contentDepthValidation,pass:false,estimatedPlayableMinutes:12};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.equal(result.completePlayableCyclePass,true);
  assert.ok(result.blockers.includes('WEB_FINAL_30MIN_CONTENT_DEPTH_NOT_PASS'));
});

test('test proxy or fake progress fails real-game substance before score can promote it',()=>{
  const evidence=baseEvidence();evidence.realGameQualification={pass:false,gates:{...evidence.realGameQualification.gates,NO_TEST_PROXY:false,NO_FAKE_PROGRESS:false}};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_COMPLETE_PLAYABLE_CYCLE_NOT_PASS'));
  assert.ok(result.blockers.includes('WEB_REAL_GAME_SUBSTANCE_NOT_PASS'));
});

test('schema11 staged-time evidence is stale after the contract change',()=>{
  const evidence=baseEvidence();evidence.validationSchemaVersion=11;evidence.version=11;
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_VALIDATION_SCHEMA_STALE'));
});
