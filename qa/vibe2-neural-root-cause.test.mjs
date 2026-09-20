// 파일명: qa/vibe2-neural-root-cause.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyNeuralRootCause, neuralRootCauseEvidence } from '../tools/vibe2-neural-root-cause.mjs';

const diagnosis={responsibility:{system:'GAME_RUNTIME',confidence:.9}};

test('causal replay plus full regression does not invent a responsible system',()=>{
  const result=verifyNeuralRootCause({
    diagnosis,
    evidence:[
      'causal-replay-prepatch-reproduced:YES',
      'causal-replay-executed:YES',
      'causal-replay-status:EXECUTED_PASS',
      'role-result:regression:PASS',
      'role-result:review:PASS'
    ]
  });
  assert.equal(result.state,'CAUSAL_REPAIR_CONFIRMED_SYSTEM_UNVERIFIED');
  assert.equal(result.causalRepairVerified,true);
  assert.equal(result.independentConfirmation,true);
  assert.equal(result.responsibleSystemVerified,false);
  assert.equal(result.rootCauseVerified,false);
  assert.ok(result.nextEvidenceRequired.includes('VERIFIED_RESPONSIBLE_SYSTEM_EVIDENCE'));
  assert.equal(result.actionFiringAllowed,false);
  assert.equal(result.phase2AuthorityEligible,false);
});

test('root cause becomes verified only with explicit verified responsible-system evidence',()=>{
  const result=verifyNeuralRootCause({
    diagnosis,
    evidence:[
      'causal-replay-prepatch-reproduced:YES',
      'causal-replay-executed:YES',
      'causal-replay-status:EXECUTED_PASS',
      'role-result:regression:PASS',
      'role-result:review:PASS',
      'independent-qa-verified-responsible-system:GAME_RUNTIME'
    ]
  });
  assert.equal(result.state,'ROOT_CAUSE_VERIFIED');
  assert.equal(result.responsibleSystemVerified,true);
  assert.equal(result.responsibleSystem,'GAME_RUNTIME');
  assert.equal(result.predictedSystemConsistentWithVerified,true);
  assert.equal(result.rootCauseVerified,true);
  assert.equal(result.learningEligible,false);
  assert.equal(result.eventRoutingAuthorityAllowed,false);
});

test('verified system disagreement stays visible instead of being coerced into the neural prediction',()=>{
  const result=verifyNeuralRootCause({
    diagnosis,
    sampleId:'sample-runtime-validator-1',
    evidence:[
      'causal-replay-prepatch-reproduced:YES',
      'causal-replay-executed:YES',
      'causal-replay-status:EXECUTED_PASS',
      'role-result:regression:PASS',
      'role-result:review:PASS',
      'verified-responsible-system:VALIDATOR'
    ]
  });
  assert.equal(result.rootCauseVerified,true);
  assert.equal(result.responsibleSystem,'VALIDATOR');
  assert.equal(result.predictedResponsibleSystem,'GAME_RUNTIME');
  assert.equal(result.predictedSystemConsistentWithVerified,false);
  assert.equal(result.sampleId,'sample-runtime-validator-1');
  const evidence=neuralRootCauseEvidence(result);
  const marker=evidence.find(x=>x.startsWith('neural-root-cause:'));
  const payload=JSON.parse(decodeURIComponent(marker.slice('neural-root-cause:'.length)));
  assert.equal(payload.sampleId,'sample-runtime-validator-1');
  assert.equal(payload.predictedSystemConsistentWithVerified,false);
  assert.equal(payload.phase2AuthorityEligible,false);
});

test('causal repair without regression remains unverified root cause',()=>{
  const result=verifyNeuralRootCause({
    diagnosis,
    evidence:[
      'causal-replay-prepatch-reproduced:YES',
      'causal-replay-executed:YES',
      'causal-replay-status:EXECUTED_PASS'
    ]
  });
  assert.equal(result.state,'CAUSAL_REPAIR_VERIFIED_AWAITING_INDEPENDENT_CONFIRMATION');
  assert.equal(result.rootCauseVerified,false);
  assert.ok(result.nextEvidenceRequired.includes('FULL_REGRESSION_PASS'));
  assert.ok(result.nextEvidenceRequired.includes('INDEPENDENT_REVIEW_PASS'));
});
