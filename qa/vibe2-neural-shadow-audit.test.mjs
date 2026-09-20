// 파일명: qa/vibe2-neural-shadow-audit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNeuralShadowAudit, neuralShadowAuditEvidence, summarizeDurableNeuralShadowAudit } from '../tools/vibe2-neural-shadow-audit.mjs';

test('audit records wave release versus neural hypothetical action without choosing a winner',()=>{
  const audit=buildNeuralShadowAudit({reviewed:[{
    taskId:'a',
    pass:true,
    releaseBlocked:false,
    rootCause:{state:'ROOT_CAUSE_VERIFIED'},
    neuralEventRoute:{
      proposedAction:{kind:'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR',reason:'VERIFIED_ROOT_CAUSE_AVAILABLE'},
      wouldFireWithoutPhase2Authority:true,
      fireAllowed:false
    }
  }]});
  assert.equal(audit.sampleCount,1);
  assert.equal(audit.rows[0].actualWaveOutcome,'WAVE_RELEASE_ELIGIBLE');
  assert.equal(audit.rows[0].comparisonClass,'BOTH_PROCEED_DIFFERENT_ACTION_SEMANTICS');
  assert.equal(audit.winnerSelectionAllowed,false);
  assert.equal(audit.automaticTuningAllowed,false);
  assert.equal(audit.phase2AuthorityReady,false);
});

test('audit preserves neural-would-act versus wave-hold disagreement without resolving it',()=>{
  const audit=buildNeuralShadowAudit({reviewed:[{
    taskId:'b',
    pass:true,
    releaseBlocked:true,
    releaseBlocker:'SUPERVISED_APPROVAL_REQUIRED',
    neuralEventRoute:{
      proposedAction:{kind:'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR'},
      wouldFireWithoutPhase2Authority:true,
      fireAllowed:false
    }
  }]});
  assert.equal(audit.rows[0].actualWaveOutcome,'WAVE_RELEASE_BLOCKED');
  assert.equal(audit.rows[0].comparisonClass,'NEURAL_WOULD_ACT_WAVE_HOLDS');
  assert.equal(audit.interpretationAuthority,'NONE');
});

test('audit preserves wave-proceeds neural-holds disagreement without tuning either system',()=>{
  const audit=buildNeuralShadowAudit({reviewed:[{
    taskId:'c',
    pass:true,
    releaseBlocked:false,
    neuralEventRoute:{
      proposedAction:{kind:'REQUEST_EVIDENCE'},
      wouldFireWithoutPhase2Authority:false,
      fireAllowed:false
    }
  }]});
  assert.equal(audit.rows[0].comparisonClass,'WAVE_PROCEEDS_NEURAL_HOLDS');
  assert.equal(audit.automaticLearningAllowed,false);
});


test('shadow versus wave audit counts duplicate sample identity once without granting authority',()=>{
  const audit=buildNeuralShadowAudit({reviewed:[{
    taskId:'persisted',
    sampleId:'persisted|run-1:1|primary|candidate-a',
    pass:true,
    releaseBlocked:false,
    neuralEventRoute:{
      proposedAction:{kind:'REQUEST_EVIDENCE',reason:'ROOT_CAUSE_UNRESOLVED'},
      wouldFireWithoutPhase2Authority:false,
      fireAllowed:false
    }
  }]});
  const evidence=neuralShadowAuditEvidence(audit);
  assert.equal(evidence.length,1);
  const summary=summarizeDurableNeuralShadowAudit([...evidence,...evidence]);
  assert.equal(summary.rawEvidenceRows,2);
  assert.equal(summary.sampleCount,1);
  assert.equal(summary.duplicateSampleRows,1);
  assert.equal(summary.sampleConflicts,0);
  assert.equal(summary.counts.WAVE_PROCEEDS_NEURAL_HOLDS,1);
  assert.equal(summary.phase2AuthorityReady,false);
  assert.equal(summary.automaticLearningAllowed,false);
});


test('durable audit marker preserves distinct review sample identity',()=>{
  const one=buildNeuralShadowAudit({reviewed:[{
    taskId:'same-task',sampleId:'same-task|run-1:1|primary|candidate-a',
    pass:true,releaseBlocked:false,
    neuralEventRoute:{proposedAction:{kind:'REQUEST_EVIDENCE'},wouldFireWithoutPhase2Authority:false,fireAllowed:false}
  }]});
  const two=buildNeuralShadowAudit({reviewed:[{
    taskId:'same-task',sampleId:'same-task|run-2:1|primary|candidate-b',
    pass:true,releaseBlocked:false,
    neuralEventRoute:{proposedAction:{kind:'REQUEST_EVIDENCE'},wouldFireWithoutPhase2Authority:false,fireAllowed:false}
  }]});
  const markers=[...neuralShadowAuditEvidence(one),...neuralShadowAuditEvidence(two)];
  assert.notEqual(markers[0],markers[1]);
  const summary=summarizeDurableNeuralShadowAudit(markers);
  assert.equal(summary.sampleCount,2);
  assert.equal(summary.duplicateSampleRows,0);
  assert.equal(summary.sampleConflicts,0);
});

test('task-only audit identity is legacy and excluded from distinct readiness samples',()=>{
  const marker='neural-shadow-wave-audit:'+encodeURIComponent(JSON.stringify({
    version:1,
    taskId:'task-only',
    sampleId:'task-only',
    actualWaveOutcome:'WAVE_RELEASE_ELIGIBLE',
    proposedAction:'REQUEST_EVIDENCE',
    comparisonClass:'WAVE_PROCEEDS_NEURAL_HOLDS'
  }));
  const summary=summarizeDurableNeuralShadowAudit([marker]);
  assert.equal(summary.sampleCount,1);
  assert.equal(summary.distinctSampleIds,0);
  assert.equal(summary.identifiedSampleCount,0);
  assert.equal(summary.legacyUnidentifiedRows,1);
});

test('conflicting durable audit rows for one sample identity stay visible',()=>{
  const base={
    version:1,
    taskId:'same-task',
    sampleId:'same-task|run-1:1|primary|candidate-a',
    actualWaveOutcome:'WAVE_RELEASE_ELIGIBLE',
    proposedAction:'REQUEST_EVIDENCE',
    proposedReason:'ROOT_CAUSE_UNRESOLVED',
    wouldFireWithoutPhase2Authority:false,
    phase2FireAllowed:false,
    comparisonClass:'WAVE_PROCEEDS_NEURAL_HOLDS',
    rootCauseState:'UNRESOLVED'
  };
  const marker=row=>'neural-shadow-wave-audit:'+encodeURIComponent(JSON.stringify(row));
  const summary=summarizeDurableNeuralShadowAudit([
    marker(base),
    marker({...base,comparisonClass:'BOTH_HOLD_OR_OBSERVE',actualWaveOutcome:'WAVE_REVIEW_BLOCKED'})
  ]);
  assert.equal(summary.sampleCount,1);
  assert.equal(summary.duplicateSampleRows,1);
  assert.equal(summary.sampleConflicts,1);
});
