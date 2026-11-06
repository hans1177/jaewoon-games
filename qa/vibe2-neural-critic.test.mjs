// 파일명: qa/vibe2-neural-critic.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { critiqueNeuralShadow, neuralCriticEvidence } from '../tools/vibe2-neural-critic.mjs';

const diagnosis={mode:'PHASE1_SHADOW_ADVISORY',responsibility:{system:'GAME_RUNTIME',confidence:.9}};

test('critic treats unknown QA responsibility as unresolved and asks for causal evidence',()=>{
  const critic=critiqueNeuralShadow({
    diagnosis,
    feedback:{
      mode:'PHASE1_SHADOW_FEEDBACK',
      matchState:'UNKNOWN',
      predicted:{responsibility:'GAME_RUNTIME'},
      observed:{stage:'INCREMENTAL_QA',responsibility:null,failureSignature:'PRESENTATION_STATIC_QA_FAILED:LIVING_MOTION'},
      rootCauseVerified:false
    }
  });
  assert.equal(critic.verdict,'UNRESOLVED');
  assert.equal(critic.rootCauseVerified,false);
  assert.ok(critic.nextEvidenceRequired.some(x=>x.startsWith('CAUSAL_REPRODUCTION_FOR_QA_SIGNATURE:')));
  assert.equal(critic.confidenceMutationAllowed,false);
  assert.equal(critic.actionFiringAllowed,false);
  assert.equal(critic.learningEligible,false);
});

test('critic records pipeline contradiction but cannot mutate confidence or fire work',()=>{
  const critic=critiqueNeuralShadow({
    diagnosis,
    feedback:{
      mode:'PHASE1_SHADOW_FEEDBACK',
      matchState:'MISMATCH',
      predicted:{responsibility:'GAME_RUNTIME'},
      observed:{stage:'SOURCE_GENERATION',responsibility:'SOURCE_GENERATION'},
      rootCauseVerified:false
    }
  });
  assert.equal(critic.verdict,'PIPELINE_CONTRADICTED');
  assert.equal(critic.confidenceAdjustmentHint,-.1);
  assert.equal(critic.confidenceMutationAllowed,false);
  assert.equal(critic.workerCreationAllowed,false);
  assert.ok(critic.inhibitors.includes('ROOT_CAUSE_UNVERIFIED'));
});

test('critic support remains non-authoritative while root cause is unverified',()=>{
  const critic=critiqueNeuralShadow({
    diagnosis:{mode:'PHASE1_SHADOW_ADVISORY',responsibility:{system:'SOURCE_GENERATION',confidence:.8}},
    feedback:{
      mode:'PHASE1_SHADOW_FEEDBACK',
      matchState:'MATCH',
      predicted:{responsibility:'SOURCE_GENERATION'},
      observed:{stage:'SOURCE_GENERATION',responsibility:'SOURCE_GENERATION'},
      rootCauseVerified:false
    }
  });
  assert.equal(critic.verdict,'PIPELINE_SUPPORTED');
  assert.equal(critic.confidenceAdjustmentHint,.05);
  assert.equal(critic.authorityPromotionEligible,false);
  const evidence=neuralCriticEvidence(critic);
  const marker=evidence.find(x=>x.startsWith('neural-shadow-critic:'));
  const payload=JSON.parse(decodeURIComponent(marker.slice('neural-shadow-critic:'.length)));
  assert.equal(payload.verdict,'PIPELINE_SUPPORTED');
  assert.equal(payload.confidenceMutationAllowed,false);
  assert.equal(payload.actionFiringAllowed,false);
});


test('critic recognizes prepatch reproduction plus executed causal replay without claiming root cause',()=>{
  const critic=critiqueNeuralShadow({
    diagnosis,
    feedback:{
      mode:'PHASE1_SHADOW_FEEDBACK',
      matchState:'UNKNOWN',
      predicted:{responsibility:'GAME_RUNTIME'},
      observed:{stage:'REPAIR_PATH_PASSED',responsibility:null},
      rootCauseVerified:false
    },
    evidence:[
      'causal-replay-status:EXECUTED_PASS',
      'causal-replay-executed:YES',
      'causal-replay-prepatch-reproduced:YES'
    ]
  });
  assert.equal(critic.causalRepairVerified,true);
  assert.equal(critic.prePatchReproduced,true);
  assert.equal(critic.causalReplayPass,true);
  assert.equal(critic.rootCauseVerified,false);
  assert.equal(critic.actionFiringAllowed,false);
  assert.ok(critic.nextEvidenceRequired.includes('RUNTIME_OR_INDEPENDENT_QA_CONFIRMATION'));
  assert.ok(critic.nextEvidenceRequired.includes('MAP_CAUSALLY_VERIFIED_REPAIR_TO_RESPONSIBLE_SYSTEM_BEFORE_ROOT_CAUSE_CLAIM'));
});
