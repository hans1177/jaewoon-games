// 파일명: qa/vibe2-neural-phase2-readiness.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePhase2Readiness, summarizeNeuralRootCauseEvidence } from '../tools/vibe2-neural-phase2-readiness.mjs';

const enc=(prefix,payload)=>prefix+encodeURIComponent(JSON.stringify(payload));

function evidenceSet({events=30,feedback=20,root=10}={}){
  const rows=[];
  for(let i=0;i<events;i++)rows.push(enc('neural-event-shadow:',{
    eventId:`task-${i}|reservation-${i}|primary|candidate-${i}`,
    eventType:'WORKER_RESULT',
    actionKind:'REQUEST_EVIDENCE',
    wouldFireWithoutPhase2Authority:false,
    inhibitors:['ROOT_CAUSE_NOT_VERIFIED','PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'],
    fireAllowed:false,workerCreationAllowed:false,queueMutationAllowed:false,waveReorderAllowed:false
  }));
  for(let i=0;i<feedback;i++)rows.push(enc('neural-shadow-feedback:',{
    sampleId:`feedback-task-${i}|feedback-reservation-${i}|primary|feedback-candidate-${i}`,
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
    sampleId:`root-task-${i}|root-reservation-${i}|primary|root-candidate-${i}`,
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
  assert.equal(result.gates.calibrationAccuracy,true);
  assert.equal(result.gates.rootCauseSampleIdentityCoverage,true);
  assert.equal(result.gates.zeroRootCauseSampleConflicts,true);
  assert.equal(result.gates.rootCausePredictionCoverage,true);
  assert.equal(result.gates.rootCausePredictionContradictionRate,true);
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

test('poor calibration accuracy blocks Phase2 review even when sample counts are sufficient',()=>{
  const evidence=evidenceSet().filter(value=>!value.startsWith('neural-shadow-feedback:'));
  for(let i=0;i<20;i++)evidence.push(enc('neural-shadow-feedback:',{
    sampleId:`poor-task-${i}|poor-reservation-${i}|primary|poor-candidate-${i}`,
    predictedResponsibility:'GAME_RUNTIME',
    observedResponsibility:i<10?'GAME_RUNTIME':'VALIDATOR',
    matchState:i<10?'MATCH':'MISMATCH',
    responsibilityMatch:i<10,
    sampleEligible:true,
    rootCauseVerified:false,
    learningEligible:false,
    authorityPromotionEligible:false
  }));
  const result=evaluatePhase2Readiness({evidence,shadowAudit:{sampleCount:10}});
  assert.equal(result.evidenceSummary.feedback.observedAccuracy,.5);
  assert.equal(result.gates.calibrationVolume,true);
  assert.equal(result.gates.calibrationAccuracy,false);
  assert.equal(result.reviewEligible,false);
});

test('root-cause prediction contradiction rate blocks review despite enough verified roots',()=>{
  const evidence=evidenceSet().filter(value=>!value.startsWith('neural-root-cause:'));
  for(let i=0;i<10;i++)evidence.push(enc('neural-root-cause:',{
    state:'ROOT_CAUSE_VERIFIED',
    rootCauseVerified:true,
    responsibleSystemVerified:true,
    responsibleSystem:i<6?'GAME_RUNTIME':'VALIDATOR',
    predictedResponsibleSystem:'GAME_RUNTIME',
    predictedSystemConsistentWithVerified:i<6,
    phase2AuthorityEligible:false
  }));
  const result=evaluatePhase2Readiness({evidence,shadowAudit:{sampleCount:10}});
  assert.equal(result.evidenceSummary.rootCause.predictionContradictionRate,.4);
  assert.equal(result.gates.rootCausePredictionCoverage,true);
  assert.equal(result.gates.rootCausePredictionContradictionRate,false);
  assert.equal(result.reviewEligible,false);
});

test('insufficient evaluated root-cause predictions blocks review',()=>{
  const evidence=evidenceSet().filter(value=>!value.startsWith('neural-root-cause:'));
  for(let i=0;i<10;i++)evidence.push(enc('neural-root-cause:',{
    state:'ROOT_CAUSE_VERIFIED',
    rootCauseVerified:true,
    responsibleSystemVerified:true,
    responsibleSystem:'GAME_RUNTIME',
    predictedResponsibleSystem:i<7?'GAME_RUNTIME':null,
    ...(i<7?{predictedSystemConsistentWithVerified:true}:{}),
    phase2AuthorityEligible:false
  }));
  const result=evaluatePhase2Readiness({evidence,shadowAudit:{sampleCount:10}});
  assert.equal(result.evidenceSummary.rootCausePredictionCoverage,.7);
  assert.equal(result.gates.rootCausePredictionCoverage,false);
  assert.equal(result.reviewEligible,false);
});

test('duplicate root-cause evidence with the same sampleId counts once',()=>{
  const evidence=evidenceSet({root:0});
  for(let i=0;i<10;i++){
    const row=enc('neural-root-cause:',{
      sampleId:'same-root-task|same-root-reservation|primary|same-root-candidate',
      state:'ROOT_CAUSE_VERIFIED',
      rootCauseVerified:true,
      responsibleSystemVerified:true,
      responsibleSystem:'GAME_RUNTIME',
      predictedResponsibleSystem:'GAME_RUNTIME',
      predictedSystemConsistentWithVerified:true,
      phase2AuthorityEligible:false
    });
    evidence.push(row);
  }
  const result=evaluatePhase2Readiness({evidence,shadowAudit:{sampleCount:10}});
  assert.equal(result.evidenceSummary.rootCause.rawEvidenceRows,10);
  assert.equal(result.evidenceSummary.rootCause.total,1);
  assert.equal(result.evidenceSummary.rootCause.duplicateSampleRows,9);
  assert.equal(result.evidenceSummary.rootCause.verified,1);
  assert.equal(result.gates.verifiedRootCauseVolume,false);
  assert.equal(result.reviewEligible,false);
});

test('conflicting root-cause results for the same sampleId block review',()=>{
  const evidence=evidenceSet();
  evidence.push(enc('neural-root-cause:',{
    sampleId:'root-task-0|root-reservation-0|primary|root-candidate-0',
    state:'ROOT_CAUSE_VERIFIED',
    rootCauseVerified:true,
    responsibleSystemVerified:true,
    responsibleSystem:'VALIDATOR',
    predictedResponsibleSystem:'GAME_RUNTIME',
    predictedSystemConsistentWithVerified:false,
    phase2AuthorityEligible:false
  }));
  const result=evaluatePhase2Readiness({evidence,shadowAudit:{sampleCount:10}});
  assert.equal(result.evidenceSummary.rootCause.sampleConflicts,1);
  assert.equal(result.gates.zeroRootCauseSampleConflicts,false);
  assert.equal(result.reviewEligible,false);
});

test('legacy root-cause evidence without sample identity cannot satisfy identity coverage',()=>{
  const evidence=evidenceSet({root:0});
  for(let i=0;i<10;i++)evidence.push(enc('neural-root-cause:',{
    state:'ROOT_CAUSE_VERIFIED',
    rootCauseVerified:true,
    responsibleSystemVerified:true,
    responsibleSystem:'GAME_RUNTIME',
    predictedResponsibleSystem:'GAME_RUNTIME',
    predictedSystemConsistentWithVerified:true,
    phase2AuthorityEligible:false
  }));
  const result=evaluatePhase2Readiness({evidence,shadowAudit:{sampleCount:10}});
  assert.equal(result.evidenceSummary.rootCause.verified,10);
  assert.equal(result.evidenceSummary.rootCause.verifiedSampleIdentityCoverage,0);
  assert.equal(result.gates.rootCauseSampleIdentityCoverage,false);
  assert.equal(result.reviewEligible,false);
});

test('partial noncanonical identities are treated as legacy and cannot satisfy readiness volume',()=>{
  const evidence=[
    enc('neural-event-shadow:',{
      eventId:'task-only',
      eventType:'WORKER_RESULT',
      actionKind:'REQUEST_EVIDENCE',
      wouldFireWithoutPhase2Authority:false,
      inhibitors:['PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'],
      fireAllowed:false,workerCreationAllowed:false,queueMutationAllowed:false,waveReorderAllowed:false
    }),
    enc('neural-shadow-feedback:',{
      sampleId:'task-only',
      predictedResponsibility:'GAME_RUNTIME',
      observedResponsibility:'GAME_RUNTIME',
      matchState:'MATCH',
      responsibilityMatch:true,
      sampleEligible:true
    }),
    enc('neural-root-cause:',{
      sampleId:'task-only',
      state:'ROOT_CAUSE_VERIFIED',
      rootCauseVerified:true,
      responsibleSystemVerified:true,
      responsibleSystem:'GAME_RUNTIME',
      predictedResponsibleSystem:'GAME_RUNTIME',
      predictedSystemConsistentWithVerified:true
    })
  ];
  const result=evaluatePhase2Readiness({
    evidence,
    shadowAudit:{sampleCount:1,distinctSampleIds:0},
    thresholds:{shadowEvents:1,calibrationEligible:1,verifiedRootCause:1,waveAuditSamples:1}
  });
  assert.equal(result.evidenceSummary.events.distinctEventIds,0);
  assert.equal(result.evidenceSummary.events.legacyUnidentifiedRows,1);
  assert.equal(result.evidenceSummary.feedback.distinctSampleIds,0);
  assert.equal(result.evidenceSummary.feedback.legacyUnidentifiedRows,1);
  assert.equal(result.evidenceSummary.rootCause.distinctSampleIds,0);
  assert.equal(result.evidenceSummary.rootCause.legacyUnidentifiedRows,1);
  assert.equal(result.gates.shadowEventVolume,false);
  assert.equal(result.gates.calibrationVolume,false);
  assert.equal(result.gates.verifiedRootCauseVolume,false);
  assert.equal(result.gates.waveAuditVolume,false);
  assert.equal(result.reviewEligible,false);
});

test('legacy unidentified feedback events and audit volume cannot qualify Phase2 review',()=>{
  const evidence=evidenceSet({events:0,feedback:0,root:10});
  for(let i=0;i<30;i++)evidence.push(enc('neural-event-shadow:',{
    eventType:'WORKER_RESULT',
    actionKind:'REQUEST_EVIDENCE',
    wouldFireWithoutPhase2Authority:false,
    inhibitors:['PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'],
    fireAllowed:false,workerCreationAllowed:false,queueMutationAllowed:false,waveReorderAllowed:false
  }));
  for(let i=0;i<20;i++)evidence.push(enc('neural-shadow-feedback:',{
    predictedResponsibility:'GAME_RUNTIME',
    observedResponsibility:'GAME_RUNTIME',
    matchState:'MATCH',
    responsibilityMatch:true,
    sampleEligible:true
  }));
  const result=evaluatePhase2Readiness({
    evidence,
    shadowAudit:{sampleCount:10,distinctSampleIds:0,legacyUnidentifiedRows:10}
  });
  assert.equal(result.evidenceSummary.events.total,30);
  assert.equal(result.evidenceSummary.events.identifiedEventCount,0);
  assert.equal(result.evidenceSummary.feedback.calibrationEligible,20);
  assert.equal(result.evidenceSummary.feedback.identifiedCalibrationEligible,0);
  assert.equal(result.gates.shadowEventVolume,false);
  assert.equal(result.gates.calibrationVolume,false);
  assert.equal(result.gates.waveAuditVolume,false);
  assert.equal(result.gates.verifiedRootCauseVolume,true);
  assert.equal(result.reviewEligible,false);
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

test('conflicting readiness sample identities block explicit review across feedback events and audit',()=>{
  const evidence=evidenceSet();
  evidence.push(
    enc('neural-shadow-feedback:',{
      sampleId:'feedback-conflict-task|feedback-conflict-reservation|primary|feedback-conflict-candidate',
      predictedResponsibility:'GAME_RUNTIME',
      observedResponsibility:'GAME_RUNTIME',
      matchState:'MATCH',
      responsibilityMatch:true,
      sampleEligible:true
    }),
    enc('neural-shadow-feedback:',{
      sampleId:'feedback-conflict-task|feedback-conflict-reservation|primary|feedback-conflict-candidate',
      predictedResponsibility:'VALIDATOR',
      observedResponsibility:'GAME_RUNTIME',
      matchState:'MISMATCH',
      responsibilityMatch:false,
      sampleEligible:true
    }),
    enc('neural-event-shadow:',{
      eventId:'event-conflict-task|event-conflict-reservation|primary|event-conflict-candidate',
      eventType:'WORKER_RESULT',
      actionKind:'REQUEST_EVIDENCE',
      wouldFireWithoutPhase2Authority:false,
      inhibitors:['PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'],
      fireAllowed:false,workerCreationAllowed:false,queueMutationAllowed:false,waveReorderAllowed:false
    }),
    enc('neural-event-shadow:',{
      eventId:'event-conflict-task|event-conflict-reservation|primary|event-conflict-candidate',
      eventType:'QA_RESULT',
      actionKind:'REQUEST_EVIDENCE',
      wouldFireWithoutPhase2Authority:false,
      inhibitors:['PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'],
      fireAllowed:false,workerCreationAllowed:false,queueMutationAllowed:false,waveReorderAllowed:false
    })
  );
  const result=evaluatePhase2Readiness({
    evidence,
    shadowAudit:{sampleCount:10,sampleConflicts:1}
  });
  assert.equal(result.gates.zeroFeedbackSampleConflicts,false);
  assert.equal(result.gates.zeroShadowEventConflicts,false);
  assert.equal(result.gates.zeroShadowAuditSampleConflicts,false);
  assert.equal(result.reviewEligible,false);
  assert.equal(result.executionAuthorityGranted,false);
});

test('root cause summary preserves prediction contradictions for explicit review',()=>{
  const summary=summarizeNeuralRootCauseEvidence([
    enc('neural-root-cause:',{
      sampleId:'contradiction-task|contradiction-reservation|primary|contradiction-candidate',
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
  assert.equal(summary.distinctSampleIds,1);
  assert.equal(summary.verifiedSampleIdentityCoverage,1);
  assert.equal(summary.predictionEvaluated,1);
  assert.equal(summary.predictionConsistencyRate,0);
  assert.equal(summary.predictionContradictionRate,1);
});
