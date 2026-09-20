// 파일명: qa/vibe2-neural-feedback.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateNeuralDiagnosisFeedback, neuralFeedbackEvidence, summarizeNeuralFeedback, summarizeNeuralFeedbackEvidence } from '../tools/vibe2-neural-feedback.mjs';

function diagnosis(system='SOURCE_GENERATION',confidence=.8){
  return{
    mode:'PHASE1_SHADOW_ADVISORY',
    responsibility:{system,confidence},
    actionRecommendation:{failureStage:'WEB_REPAIR'},
    bottleneck:{score:77}
  };
}

test('source generation failure is a calibration sample for the next observed blocking system',()=>{
  const feedback=evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('SOURCE_GENERATION',.88),
    outcome:'FAIL',
    blocker:'source-candidate-generation-failed',
    candidateFailure:{class:'MALFORMED_OUTPUT'},
    roleResults:{implementation:'FAIL',test:'FAIL',performance:'FAIL'}
  });
  assert.equal(feedback.observed.stage,'SOURCE_GENERATION');
  assert.equal(feedback.observed.responsibility,'SOURCE_GENERATION');
  assert.equal(feedback.sampleEligible,true);
  assert.equal(feedback.responsibilityMatch,true);
  assert.equal(feedback.matchState,'MATCH');
  assert.equal(feedback.rootCauseVerified,false);
  assert.equal(feedback.learningEligible,false);
  assert.equal(feedback.authorityPromotionEligible,false);
});

test('deterministic source-generation stage can record mismatch without claiming root cause',()=>{
  const feedback=evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('GAME_RUNTIME',.9),
    outcome:'FAIL',
    candidateFailure:{class:'EDIT_MATCH'},
    roleResults:{implementation:'FAIL'}
  });
  assert.equal(feedback.sampleEligible,true);
  assert.equal(feedback.responsibilityMatch,false);
  assert.equal(feedback.matchState,'MISMATCH');
  assert.equal(feedback.calibrationTarget,'NEXT_OBSERVED_BLOCKING_SYSTEM_NOT_ROOT_CAUSE');
  assert.equal(feedback.rootCauseVerified,false);
});

test('QA failure records the stage but leaves responsibility correctness unknown',()=>{
  const feedback=evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('GAME_RUNTIME',.92),
    outcome:'FAIL',
    blocker:'incremental-qa-failed',
    roleResults:{implementation:'PASS',test:'FAIL',performance:'FAIL'}
  });
  assert.equal(feedback.observed.stage,'INCREMENTAL_QA');
  assert.equal(feedback.observed.responsibility,null);
  assert.equal(feedback.sampleEligible,false);
  assert.equal(feedback.responsibilityMatch,null);
  assert.equal(feedback.matchState,'UNKNOWN');
});

test('QA failure signature is preserved as evidence while responsibility remains unknown',()=>{
  const feedback=evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('GAME_RUNTIME',.92),
    outcome:'FAIL',
    blocker:'incremental-qa-failed',
    roleResults:{implementation:'PASS',test:'FAIL',performance:'FAIL'},
    evidence:['incremental-qa-failure-signature:PRESENTATION_STATIC_QA_FAILED:LIVING_MOTION:IDLE_REQUIRED']
  });
  assert.equal(feedback.observed.stage,'INCREMENTAL_QA');
  assert.equal(feedback.observed.failureSignature,'PRESENTATION_STATIC_QA_FAILED:LIVING_MOTION:IDLE_REQUIRED');
  assert.equal(feedback.observed.responsibility,null);
  assert.equal(feedback.matchState,'UNKNOWN');
  assert.equal(feedback.rootCauseVerified,false);
  assert.equal(feedback.authorityPromotionEligible,false);
});

test('worker pass is not treated as proof that the diagnosis root cause was correct',()=>{
  const feedback=evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('VALIDATOR',.7),
    outcome:'PASS',
    roleResults:{implementation:'PASS',test:'PASS',performance:'PASS'}
  });
  assert.equal(feedback.observed.stage,'REPAIR_PATH_PASSED');
  assert.equal(feedback.sampleEligible,false);
  assert.equal(feedback.matchState,'UNKNOWN');
  assert.equal(feedback.authorityPromotionEligible,false);
});

test('feedback evidence is compact, durable and explicitly non-learning',()=>{
  const feedback=evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('SOURCE_GENERATION',.8),
    outcome:'FAIL',
    candidateFailure:{class:'NO_OP'},
    roleResults:{implementation:'FAIL'}
  });
  const evidence=neuralFeedbackEvidence(feedback);
  const encoded=evidence.find(x=>x.startsWith('neural-shadow-feedback:'));
  assert.ok(encoded);
  const payload=JSON.parse(decodeURIComponent(encoded.slice('neural-shadow-feedback:'.length)));
  assert.equal(payload.matchState,'MATCH');
  assert.equal(payload.rootCauseVerified,false);
  assert.equal(payload.learningEligible,false);
  assert.equal(payload.authorityPromotionEligible,false);
});

test('summary never grants phase2 authority from shadow samples alone',()=>{
  const rows=[
    evaluateNeuralDiagnosisFeedback({diagnosis:diagnosis('SOURCE_GENERATION'),outcome:'FAIL',candidateFailure:{class:'NO_OP'},roleResults:{implementation:'FAIL'}}),
    evaluateNeuralDiagnosisFeedback({diagnosis:diagnosis('GAME_RUNTIME'),outcome:'FAIL',candidateFailure:{class:'EDIT_MATCH'},roleResults:{implementation:'FAIL'}}),
    evaluateNeuralDiagnosisFeedback({diagnosis:diagnosis('GAME_RUNTIME'),outcome:'PASS',roleResults:{implementation:'PASS',test:'PASS',performance:'PASS'}})
  ];
  const summary=summarizeNeuralFeedback(rows);
  assert.equal(summary.total,3);
  assert.equal(summary.calibrationEligible,2);
  assert.equal(summary.matches,1);
  assert.equal(summary.mismatches,1);
  assert.equal(summary.unknown,1);
  assert.equal(summary.observedAccuracy,.5);
  assert.equal(summary.phase2AuthorityReady,false);
});


test('durable evidence aggregation reports accuracy but never auto-enables phase2',()=>{
  const match=neuralFeedbackEvidence(evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('SOURCE_GENERATION',.8),
    outcome:'FAIL',candidateFailure:{class:'NO_OP'},roleResults:{implementation:'FAIL'}
  }));
  const mismatch=neuralFeedbackEvidence(evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('GAME_RUNTIME',.8),
    outcome:'FAIL',candidateFailure:{class:'EDIT_MATCH'},roleResults:{implementation:'FAIL'}
  }));
  const summary=summarizeNeuralFeedbackEvidence([...match,...mismatch]);
  assert.equal(summary.durableEvidenceSamples,2);
  assert.equal(summary.calibrationEligible,2);
  assert.equal(summary.matches,1);
  assert.equal(summary.mismatches,1);
  assert.equal(summary.observedAccuracy,.5);
  assert.equal(summary.phase2AuthorityReady,false);
  assert.equal(summary.automaticAuthorityEscalationForbidden,true);
});


test('feedback evidence preserves deterministic sample identity for retry-safe telemetry',()=>{
  const feedback=evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('SOURCE_GENERATION',.8),
    outcome:'FAIL',
    candidateFailure:{class:'NO_OP'},
    roleResults:{implementation:'FAIL'},
    sampleId:'task-a|run-1:1|primary|candidate-a'
  });
  assert.equal(feedback.sampleId,'task-a|run-1:1|primary|candidate-a');
  const marker=neuralFeedbackEvidence(feedback).find(x=>x.startsWith('neural-shadow-feedback:'));
  const payload=JSON.parse(decodeURIComponent(marker.slice('neural-shadow-feedback:'.length)));
  assert.equal(payload.sampleId,'task-a|run-1:1|primary|candidate-a');
});


test('different retry sample identities remain distinct durable feedback markers',()=>{
  const a=evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('SOURCE_GENERATION',.8),
    outcome:'FAIL',candidateFailure:{class:'NO_OP'},roleResults:{implementation:'FAIL'},
    sampleId:'task-r|run-1:1|primary|candidate-a'
  });
  const b=evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('SOURCE_GENERATION',.8),
    outcome:'FAIL',candidateFailure:{class:'NO_OP'},roleResults:{implementation:'FAIL'},
    sampleId:'task-r|run-2:1|primary|candidate-b'
  });
  const ma=neuralFeedbackEvidence(a).find(x=>x.startsWith('neural-shadow-feedback:'));
  const mb=neuralFeedbackEvidence(b).find(x=>x.startsWith('neural-shadow-feedback:'));
  assert.notEqual(ma,mb);
  const summary=summarizeNeuralFeedbackEvidence([ma,mb]);
  assert.equal(summary.durableEvidenceSamples,2);
  assert.equal(summary.calibrationEligible,2);
  assert.equal(summary.duplicateSampleRows,0);
  assert.equal(summary.sampleConflicts,0);
});

test('duplicate calibration sample identity counts once and conflicting result stays visible',()=>{
  const a=evaluateNeuralDiagnosisFeedback({
    diagnosis:diagnosis('SOURCE_GENERATION',.8),
    outcome:'FAIL',candidateFailure:{class:'NO_OP'},roleResults:{implementation:'FAIL'},
    sampleId:'task-r|run-1:1|primary|candidate-a'
  });
  const markerA=neuralFeedbackEvidence(a).find(x=>x.startsWith('neural-shadow-feedback:'));
  const payload=JSON.parse(decodeURIComponent(markerA.slice('neural-shadow-feedback:'.length)));
  const markerConflict='neural-shadow-feedback:'+encodeURIComponent(JSON.stringify({
    ...payload,
    predictedResponsibility:'GAME_RUNTIME',
    matchState:'MISMATCH',
    responsibilityMatch:false
  }));
  const summary=summarizeNeuralFeedbackEvidence([markerA,markerA,markerConflict]);
  assert.equal(summary.rawEvidenceRows,3);
  assert.equal(summary.durableEvidenceSamples,1);
  assert.equal(summary.calibrationEligible,1);
  assert.equal(summary.duplicateSampleRows,2);
  assert.equal(summary.sampleConflicts,1);
});
