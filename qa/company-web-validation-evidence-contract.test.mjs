import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateWebValidationEvidence,sha256Text} from '../tools/company-web-validation-evidence-contract.mjs';

const baseEvidence=()=>({
  version:12,validationSchemaVersion:12,pass:true,validated:true,musicRuntime:{pass:true},sessionDepthMinutes:30,
  substanceGate:{pass:true,implementationClass:'DEDICATED',totalBytes:13613,executableBytes:7000,mechanicCount:7,directSessionControls:0,proxyMarkers:0},
  playableCycle:{pass:true,minimumImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',terminalReached:true},
  contentDepth30:{pass:true,validationMode:'REAL_GAMEPLAY_CONTENT_DEPTH',validatedMinutes:30,directTimeStageControl:false},
  webStrictScore:92,strictReview:{totalScore:92,hardFailures:[]},sourceIndexSha256:sha256Text('web'),designBaselineSha256:sha256Text('design'),
  formalImplementationPassed:true,promotionRevalidation:{pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true,secondSubstancePass:true,secondContentDepth30Pass:true},
});

test('fresh 80+ real playable evidence with final content depth is homepage eligible',()=>{
  const evidence=baseEvidence();evidence.webStrictScore=84;evidence.strictReview.totalScore=84;evidence.formalImplementationPassed=false;evidence.promotionRevalidation={pass:false,independentRun:false};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(result.pass,true,result.blockers.join(','));
  assert.equal(result.realGameSubstancePass,true);
  assert.equal(result.playableCyclePass,true);
  assert.equal(result.finalContentDepth30Pass,true);
});

test('complete playable cycle alone is valid runtime evidence but not homepage-final evidence',()=>{
  const evidence=baseEvidence();evidence.webStrictScore=84;evidence.strictReview.totalScore=84;evidence.formalImplementationPassed=false;evidence.contentDepth30={pass:false,validationMode:'REAL_GAMEPLAY_CONTENT_DEPTH',validatedMinutes:0,directTimeStageControl:false};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.equal(result.playableCyclePass,true);
  assert.equal(result.finalContentDepth30Pass,false);
  assert.ok(result.blockers.includes('WEB_FINAL_CONTENT_DEPTH_30_NOT_PASS'));
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
  evidence.promotionRevalidation.secondSubstancePass=true;evidence.promotionRevalidation.secondContentDepth30Pass=false;
  const noDepth=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(noDepth.pass,false);assert.ok(noDepth.blockers.includes('WEB_PROMOTION_FINAL_CONTENT_DEPTH_NOT_PASS'));
});

test('legacy real gameplay milestone depth stays compatible after schema 12 revalidation',()=>{
  const evidence=baseEvidence();
  evidence.contentDepth30={pass:true,validationMode:'LEGACY_GAMEPLAY_MILESTONE_DEPTH',validatedMinutes:30,directTimeStageControl:false};
  evidence.promotionRevalidation={pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true,secondFootprintPass:true,secondContentDepth30Pass:true};
  delete evidence.substanceGate;
  evidence.sourceFootprint={pass:true,totalBytes:13613,scriptBytes:6800,mechanicCount:7,stageButtons:false,proxyMarkers:0};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(result.pass,true,result.blockers.join(','));
});

test('legacy schema, thin source, missing playable cycle or missing final depth cannot pass',()=>{
  const evidence=baseEvidence();evidence.validationSchemaVersion=11;evidence.substanceGate.totalBytes=5000;evidence.playableCycle.pass=false;evidence.contentDepth30.pass=false;
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_VALIDATION_SCHEMA_STALE'));
  assert.ok(result.blockers.includes('WEB_REAL_GAME_SUBSTANCE_NOT_PASS'));
  assert.ok(result.blockers.includes('WEB_PLAYABLE_CYCLE_NOT_PASS'));
  assert.ok(result.blockers.includes('WEB_FINAL_CONTENT_DEPTH_30_NOT_PASS'));
});
