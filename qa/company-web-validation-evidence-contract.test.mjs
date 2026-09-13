import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateWebValidationEvidence,sha256Text} from '../tools/company-web-validation-evidence-contract.mjs';

const windows=[[0,5],[5,15],[15,25],[25,30]];
const milestoneRows=windows.map(([start,end],index)=>({stage:index+1,start,end,clicked:true,completed:true,gameStateChanged:true,trigger:'GAMEPLAY_MILESTONE'}));
const baseEvidence=()=>({
  version:11,validationSchemaVersion:11,pass:true,validated:true,musicRuntime:{pass:true},sessionDepthMinutes:30,
  substanceGate:{pass:true,implementationClass:'DEDICATED',totalBytes:13613,executableBytes:7000,mechanicCount:7,directSessionControls:0,proxyMarkers:0},
  sessionContract:{pass:true,validationMode:'GAMEPLAY_MILESTONE_DEPTH',stageGameplayPassed:true,stageCount:4,completedStages:4,windows,stageResults:milestoneRows.map(x=>({...x}))},
  webStrictScore:92,strictReview:{totalScore:92,hardFailures:[]},sourceIndexSha256:sha256Text('web'),designBaselineSha256:sha256Text('design'),
  formalImplementationPassed:true,promotionRevalidation:{pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true,secondSubstancePass:true},
});

test('fresh 80+ dedicated evidence is homepage eligible',()=>{
  const evidence=baseEvidence();evidence.webStrictScore=84;evidence.strictReview.totalScore=84;evidence.formalImplementationPassed=false;evidence.promotionRevalidation={pass:false,independentRun:false};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(result.pass,true,result.blockers.join(','));
  assert.equal(result.realGameSubstancePass,true);
  assert.equal(result.structured30MinutePass,true);
});

test('native promotion requires fresh 90+ independent substance revalidation',()=>{
  const evidence=baseEvidence();
  const pass=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  const stale=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true,currentSourceSha256:sha256Text('changed'),currentBaselineSha256:sha256Text('design')});
  assert.equal(stale.pass,false);assert.ok(stale.blockers.includes('WEB_SOURCE_HASH_STALE'));
  evidence.promotionRevalidation.secondSubstancePass=false;
  const noSubstance=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(noSubstance.pass,false);assert.ok(noSubstance.blockers.includes('WEB_PROMOTION_SUBSTANCE_REVALIDATION_NOT_PASS'));
});

test('current validator sourceFootprint and progression milestone evidence are accepted without weakening thresholds',()=>{
  const evidence=baseEvidence();delete evidence.substanceGate;
  evidence.sourceFootprint={pass:true,totalBytes:13613,scriptBytes:6800,mechanicCount:7,stageButtons:false,proxyMarkers:0};
  evidence.sessionContract={pass:true,proofMode:'PROGRESSION_MILESTONES',directStageClick:false,stageGameplayPassed:true,stageCount:4,completedStages:4,windows,stageResults:windows.map(([start,end],index)=>({stage:index+1,start,end,clicked:true,triggeredByGameplay:true,directStageClick:false,gameStateChanged:true}))};
  evidence.promotionRevalidation={pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true,secondFootprintPass:true};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true});
  assert.equal(result.pass,true,result.blockers.join(','));
});

test('legacy or thin evidence cannot pass',()=>{
  const evidence=baseEvidence();evidence.validationSchemaVersion=10;evidence.substanceGate.totalBytes=5000;evidence.sessionContract.stageResults[3].gameStateChanged=false;
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_VALIDATION_SCHEMA_STALE'));
  assert.ok(result.blockers.includes('WEB_REAL_GAME_SUBSTANCE_NOT_PASS'));
  assert.ok(result.blockers.includes('WEB_STRUCTURED_30MIN_NOT_PASS'));
});
