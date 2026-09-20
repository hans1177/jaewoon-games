// 파일명: qa/vibe2-neural-phase2-readiness.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePhase2Readiness, summarizeNeuralRootCauseEvidence } from '../tools/vibe2-neural-phase2-readiness.mjs';

const enc=(prefix,payload)=>prefix+encodeURIComponent(JSON.stringify(payload));

function evidenceSet({events=30,feedback=20,root=10}={}){
  const rows=[];
  for(let i=0;i<events;i++)rows.push(enc('neural-event-shadow:',{
    eventType:'WORKER_RESULT',
    actionKind:'REQUEST_EVIDENCE',
    wouldFireWithoutPhase2Authority:false,
    inhibitors:['ROOT_CAUSE_NOT_VERIFIED','PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'],
    fireAllowed:false,workerCreationAllowed:false,queueMutationAllowed:false,waveReorderAllowed:false
  }));
  for(let i=0;i<feedback;i++)rows.push(enc('neural-shadow-feedback:',{
    predictedResponsibility:'GAME_RUNTIME',
    observedResponsibility:'GAME_RUNTIME',
    matchState:'MATCH',
    responsibilityMatch:true,
    sampleEligible:true,
    rootCauseVerified:false,
    learningEligible:false,
    authorityPromotionEligible:false
  }));
  for(let i=0;i<root;i++)rows.push(enc('neural-root-cause:',{
    state:'ROOT_CAUSE_VERIFIED',
    rootCauseVerified:true,
    responsibleSystemVerified:true,
    responsibleSystem:'GAME_RUNTIME',
    predictedResponsibleSystem:'GAME_RUNTIME',
    predictedSystemConsistentWithVerified:true,
    phase2AuthorityEligible:false
  }));
  return rows;
}

test('enough shadow evidence only makes Phase2 eligible for explicit review, never execution',()=>{
  const result=evaluatePhase2Readiness({
    evidence:evidenceSet(),
    shadowAudit:{sampleCount:10,phase2AuthorityReady:false}
  });
  assert.equal(result.reviewEligible,true);
  assert.equal(result.reason,'ENOUGH_SHADOW_EVIDENCE_FOR_EXPLICIT_REVIEW_ONLY');
  assert.equal(result.phase2AuthorityReady,false);
  assert.equal(result.executionAuthorityGranted,false);
  assert.equal(result.automaticPromotionAllowed,false);
  assert.equal(result.explicitPrimaryReviewRequired,true);
  assert.equal(result.securityReviewRequired,true);
  assert.equal(result.explicitCentralPolicyPromotionRequired,true);
});

test('insufficient verified root causes blocks even review eligibility',()=>{
  const result=evaluatePhase2Readiness({
    evidence:evidenceSet({root:9}),
    shadowAudit:{sampleCount:10}
  });
  assert.equal(result.reviewEligible,false);
  assert.equal(result.gates.verifiedRootCauseVolume,false);
  assert.equal(result.phase2AuthorityReady,false);
});

test('any unauthorized shadow fire blocks review eligibility',()=>{
  const evidence=evidenceSet();
  evidence.push(enc('neural-event-shadow:',{
    eventType:'QA_RESULT',
    actionKind:'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR',
    wouldFireWithoutPhase2Authority:true,
    inhibitors:[],
    fireAllowed:true,
    workerCreationAllowed:false,
    queueMutationAllowed:false,
    waveReorderAllowed:false
  }));
  const result=evaluatePhase2Readiness({evidence,shadowAudit:{sampleCount:10}});
  assert.equal(result.reviewEligible,false);
  assert.equal(result.gates.zeroUnauthorizedFire,false);
  assert.equal(result.gates.shadowSafetyInvariant,false);
});

test('root cause summary preserves prediction contradictions for explicit review',()=>{
  const summary=summarizeNeuralRootCauseEvidence([
    enc('neural-root-cause:',{
      state:'ROOT_CAUSE_VERIFIED',
      rootCauseVerified:true,
      responsibleSystemVerified:true,
      responsibleSystem:'VALIDATOR',
      predictedResponsibleSystem:'GAME_RUNTIME',
      predictedSystemConsistentWithVerified:false
    })
  ]);
  assert.equal(summary.verified,1);
  assert.equal(summary.systemVerified,1);
  assert.equal(summary.predictionContradicted,1);
});
