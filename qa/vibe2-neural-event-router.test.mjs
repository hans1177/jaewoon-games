// 파일명: qa/vibe2-neural-event-router.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateNeuralEventRoute, neuralEventRouteEvidence } from '../tools/vibe2-neural-event-router.mjs';

const diagnosis={
  mode:'PHASE1_SHADOW_ADVISORY',
  inhibitors:[],
  actionRecommendation:{failureStage:'WEB_REPAIR'}
};

test('verified root cause proposes exact repair but cannot fire before Phase2 authority',()=>{
  const route=simulateNeuralEventRoute({
    event:{type:'RUNTIME_RESULT',gameId:'demo',outcome:'FAIL'},
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'GAME_RUNTIME'}
  });
  assert.equal(route.proposedAction.kind,'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR');
  assert.equal(route.wouldFireWithoutPhase2Authority,true);
  assert.ok(route.inhibitors.includes('PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'));
  assert.equal(route.fireAllowed,false);
  assert.equal(route.workerCreationAllowed,false);
  assert.equal(route.queueMutationAllowed,false);
  assert.equal(route.waveReorderAllowed,false);
});

test('unverified responsible system requests evidence rather than guessing repair scope',()=>{
  const route=simulateNeuralEventRoute({
    event:{type:'QA_RESULT',outcome:'PASS'},
    diagnosis,
    rootCause:{
      state:'CAUSAL_REPAIR_CONFIRMED_SYSTEM_UNVERIFIED',
      rootCauseVerified:false,
      nextEvidenceRequired:['VERIFIED_RESPONSIBLE_SYSTEM_EVIDENCE']
    }
  });
  assert.equal(route.proposedAction.kind,'REQUEST_RESPONSIBLE_SYSTEM_VERIFICATION');
  assert.ok(route.inhibitors.includes('ROOT_CAUSE_NOT_VERIFIED'));
  assert.equal(route.wouldFireWithoutPhase2Authority,false);
  assert.equal(route.fireAllowed,false);
});

test('policy changes can calibrate work-contract recompilation without unrelated root-cause proof',()=>{
  const route=simulateNeuralEventRoute({
    event:{type:'POLICY_CHANGE'},
    diagnosis,
    rootCause:null
  });
  assert.equal(route.proposedAction.kind,'RECOMPILE_WORK_CONTRACT');
  assert.equal(route.proposedAction.requiresFreshPolicy,true);
  assert.equal(route.wouldFireWithoutPhase2Authority,true);
  assert.equal(route.inhibitors.includes('ROOT_CAUSE_NOT_VERIFIED'),false);
  assert.ok(route.inhibitors.includes('PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'));
  assert.equal(route.fireAllowed,false);
  assert.equal(route.policyMutationAllowed,false);
});

test('resource or lock changes can calibrate dependency reevaluation without root-cause proof',()=>{
  const route=simulateNeuralEventRoute({
    event:{type:'RESOURCE_OR_LOCK_CHANGE',gameId:'demo'},
    diagnosis,
    rootCause:null
  });
  assert.equal(route.proposedAction.kind,'REEVALUATE_DEPENDENCY_AND_LOCKS');
  assert.equal(route.wouldFireWithoutPhase2Authority,true);
  assert.equal(route.inhibitors.includes('ROOT_CAUSE_NOT_VERIFIED'),false);
  assert.ok(route.inhibitors.includes('PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'));
  assert.equal(route.fireAllowed,false);
  assert.equal(route.lockAcquisitionAllowed,false);
});

test('security and lock inhibitors suppress hypothetical firing',()=>{
  const route=simulateNeuralEventRoute({
    event:{type:'WORKER_RESULT',outcome:'FAIL'},
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'SOURCE_GENERATION'},
    lockConflict:true,
    securityBlocked:true
  });
  assert.equal(route.wouldFireWithoutPhase2Authority,false);
  assert.ok(route.inhibitors.includes('SOURCE_OR_RESOURCE_LOCK_CONFLICT'));
  assert.ok(route.inhibitors.includes('SECURITY_POLICY_BLOCK'));
});

test('shadow event evidence records simulated intent without granting authority',()=>{
  const route=simulateNeuralEventRoute({
    event:{type:'RUNTIME_RESULT',outcome:'FAIL'},
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'GAME_RUNTIME'}
  });
  const rows=neuralEventRouteEvidence(route);
  const marker=rows.find(value=>value.startsWith('neural-event-shadow:'));
  assert.ok(marker);
  const payload=JSON.parse(decodeURIComponent(marker.slice('neural-event-shadow:'.length)));
  assert.equal(payload.actionKind,'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR');
  assert.equal(payload.fireAllowed,false);
  assert.equal(payload.workerCreationAllowed,false);
  assert.equal(payload.queueMutationAllowed,false);
  assert.equal(payload.waveReorderAllowed,false);
  assert.equal(payload.lockAcquisitionAllowed,false);
  assert.equal(payload.policyMutationAllowed,false);
  assert.equal(payload.learningEligible,false);
  assert.equal(payload.authorityPromotionEligible,false);
});

test('shadow event evidence does not mask accidental forbidden authority bits',()=>{
  const route={
    mode:'PHASE2_SHADOW_EVENT_ROUTER',
    event:{id:'authority-probe',type:'POLICY_CHANGE'},
    proposedAction:{kind:'RECOMPILE_WORK_CONTRACT',reason:'CENTRAL_POLICY_CHANGED'},
    inhibitors:['PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'],
    wouldFireWithoutPhase2Authority:false,
    fireAllowed:false,
    workerCreationAllowed:false,
    queueMutationAllowed:false,
    waveReorderAllowed:false,
    lockAcquisitionAllowed:true,
    policyMutationAllowed:true,
    learningEligible:true,
    authorityPromotionEligible:true
  };
  const marker=neuralEventRouteEvidence(route).find(x=>x.startsWith('neural-event-shadow:'));
  const payload=JSON.parse(decodeURIComponent(marker.slice('neural-event-shadow:'.length)));
  assert.equal(payload.lockAcquisitionAllowed,true);
  assert.equal(payload.policyMutationAllowed,true);
  assert.equal(payload.learningEligible,true);
  assert.equal(payload.authorityPromotionEligible,true);
});


test('shadow event evidence includes deterministic event identity',()=>{
  const route=simulateNeuralEventRoute({
    event:{id:'task-a|run-1:1|primary|candidate-a',type:'WORKER_RESULT',outcome:'FAIL'},
    diagnosis,
    rootCause:{state:'UNRESOLVED',rootCauseVerified:false,nextEvidenceRequired:['MORE_DETERMINISTIC_FAILURE_EVIDENCE']}
  });
  const marker=neuralEventRouteEvidence(route).find(x=>x.startsWith('neural-event-shadow:'));
  const payload=JSON.parse(decodeURIComponent(marker.slice('neural-event-shadow:'.length)));
  assert.equal(payload.eventId,'task-a|run-1:1|primary|candidate-a');
  assert.equal(payload.fireAllowed,false);
});
