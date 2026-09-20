// 파일명: qa/vibe2-neural-event-telemetry.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNeuralEventShadowEvidence, summarizeNeuralEventShadowEvidence } from '../tools/vibe2-neural-event-telemetry.mjs';

function marker(payload){
  return 'neural-event-shadow:'+encodeURIComponent(JSON.stringify({
    version:1,
    eventType:'WORKER_RESULT',
    actionKind:'REQUEST_EVIDENCE',
    actionReason:'ROOT_CAUSE_UNRESOLVED',
    wouldFireWithoutPhase2Authority:false,
    inhibitors:['ROOT_CAUSE_NOT_VERIFIED','PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'],
    fireAllowed:false,
    workerCreationAllowed:false,
    queueMutationAllowed:false,
    waveReorderAllowed:false,
    lockAcquisitionAllowed:false,
    policyMutationAllowed:false,
    learningEligible:false,
    authorityPromotionEligible:false,
    ...payload
  }));
}

test('telemetry counts event types actions and inhibitors without granting authority',()=>{
  const summary=summarizeNeuralEventShadowEvidence([
    marker({}),
    marker({
      eventType:'QA_RESULT',
      actionKind:'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR',
      wouldFireWithoutPhase2Authority:true,
      inhibitors:['PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED']
    })
  ]);
  assert.equal(summary.total,2);
  assert.equal(summary.hypotheticalFireCount,1);
  assert.equal(summary.hypotheticalFireRate,.5);
  assert.equal(summary.byEventType.WORKER_RESULT,1);
  assert.equal(summary.byEventType.QA_RESULT,1);
  assert.equal(summary.byAction.REQUEST_EVIDENCE,1);
  assert.equal(summary.byInhibitor.PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED,2);
  assert.equal(summary.unauthorizedFireCount,0);
  assert.equal(summary.safetyInvariantPass,true);
  assert.equal(summary.phase2AuthorityReady,false);
  assert.equal(summary.automaticTuningAllowed,false);
});

test('telemetry exposes any accidental authority bit as safety invariant failure',()=>{
  const rows=[marker({fireAllowed:true})];
  const parsed=parseNeuralEventShadowEvidence(rows);
  assert.equal(parsed.length,1);
  const summary=summarizeNeuralEventShadowEvidence(rows);
  assert.equal(summary.unauthorizedFireCount,1);
  assert.equal(summary.safetyInvariantPass,false);
  assert.equal(summary.phase2AuthorityReady,false);
});


test('distinct event identities prevent retry shadow samples from collapsing',()=>{
  const a=marker({eventId:'task-r|run-1:1|primary|candidate-a'});
  const b=marker({eventId:'task-r|run-2:1|primary|candidate-b'});
  assert.notEqual(a,b);
  const summary=summarizeNeuralEventShadowEvidence([a,b]);
  assert.equal(summary.total,2);
  assert.equal(summary.byEventType.WORKER_RESULT,2);
  assert.equal(summary.duplicateEventRows,0);
  assert.equal(summary.eventConflicts,0);
  assert.equal(summary.unauthorizedFireCount,0);
});

test('duplicate event identity counts once and conflicting replay stays visible',()=>{
  const a=marker({eventId:'task-r|run-1:1|primary|candidate-a'});
  const duplicate=marker({eventId:'task-r|run-1:1|primary|candidate-a'});
  const conflict=marker({
    eventId:'task-r|run-1:1|primary|candidate-a',
    eventType:'QA_RESULT',
    actionKind:'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR',
    fireAllowed:true
  });
  const summary=summarizeNeuralEventShadowEvidence([a,duplicate,conflict]);
  assert.equal(summary.rawEvidenceRows,3);
  assert.equal(summary.total,1);
  assert.equal(summary.duplicateEventRows,2);
  assert.equal(summary.eventConflicts,1);
  assert.equal(summary.unauthorizedFireCount,1);
  assert.equal(summary.safetyInvariantPass,false);
});
