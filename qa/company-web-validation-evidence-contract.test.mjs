import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateWebValidationEvidence,sha256Text} from '../tools/company-web-validation-evidence-contract.mjs';

const windows=[[0,5],[5,15],[15,25],[25,30]];
const baseEvidence=()=>({
  version:10,validationSchemaVersion:10,pass:true,validated:true,musicRuntime:{pass:true},sessionDepthMinutes:30,
  sessionContract:{pass:true,stageGameplayPassed:true,stageCount:4,completedStages:4,windows,stageResults:windows.map(([start,end],index)=>({stage:index+1,start,end,clicked:true,completed:true,gameStateChanged:true}))},
  webStrictScore:92,strictReview:{totalScore:92,hardFailures:[]},sourceIndexSha256:sha256Text('web'),designBaselineSha256:sha256Text('design'),
  formalImplementationPassed:true,promotionRevalidation:{pass:true,independentRun:true,sourceHashMatch:true,baselineHashMatch:true},
});

test('fresh 80+ evidence is homepage eligible',()=>{
  const evidence=baseEvidence();evidence.webStrictScore=84;evidence.strictReview.totalScore=84;evidence.formalImplementationPassed=false;evidence.promotionRevalidation={pass:false,independentRun:false};
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(result.pass,true,result.blockers.join(','));
});

test('native promotion requires fresh 90+ independent revalidation',()=>{
  const evidence=baseEvidence();
  const pass=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true,currentSourceSha256:sha256Text('web'),currentBaselineSha256:sha256Text('design')});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  const stale=evaluateWebValidationEvidence(evidence,{minimumScore:90,requirePromotionRevalidation:true,currentSourceSha256:sha256Text('changed'),currentBaselineSha256:sha256Text('design')});
  assert.equal(stale.pass,false);
  assert.ok(stale.blockers.includes('WEB_SOURCE_HASH_STALE'));
});

test('legacy schema and missing stage gameplay cannot pass',()=>{
  const evidence=baseEvidence();evidence.validationSchemaVersion=9;evidence.sessionContract.stageResults[3].gameStateChanged=false;
  const result=evaluateWebValidationEvidence(evidence,{minimumScore:80});
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('WEB_VALIDATION_SCHEMA_STALE'));
  assert.ok(result.blockers.includes('WEB_STRUCTURED_30MIN_NOT_PASS'));
});
