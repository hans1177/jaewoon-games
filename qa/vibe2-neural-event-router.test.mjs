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
  assert.equal(route.workGraph.mode,'PHASE2_SHADOW_NEURAL_WORK_GRAPH');
  assert.equal(route.workGraph.summary.actionKind,'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR');
  assert.equal(route.workGraph.authority.executionAllowed,false);
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
  assert.equal(payload.authorityPromotionEligible,false);
  const graphMarker=rows.find(value=>value.startsWith('neural-work-graph-shadow:'));
  assert.ok(graphMarker);
  const graphPayload=JSON.parse(decodeURIComponent(graphMarker.slice('neural-work-graph-shadow:'.length)));
  assert.equal(graphPayload.actionKind,'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR');
  assert.equal(graphPayload.executionAllowed,false);
  assert.equal(graphPayload.workerCreationAllowed,false);
  assert.equal(graphPayload.queueMutationAllowed,false);
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


test('verified root cause can fire only the central-policy gated scheduler action',()=>{
  const route=simulateNeuralEventRoute({
    event:{id:'gated-task|run-1|WORKER_RESULT',type:'WORKER_RESULT',outcome:'FAIL'},
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'SOURCE_GENERATION'},
    gatedExecutionEnabled:true
  });
  assert.equal(route.mode,'PHASE2_GATED_EVENT_ROUTER');
  assert.equal(route.authorityMode,'GATED');
  assert.equal(route.fireAllowed,true);
  assert.equal(route.workerCreationAllowed,true);
  assert.equal(route.queueMutationAllowed,true);
  assert.equal(route.waveReorderAllowed,true);
  assert.equal(route.automaticTuningAllowed,true);
  assert.equal(route.policyMutationAllowed,false);
  assert.equal(route.lockAcquisitionAllowed,false);
  assert.equal(route.workGraph.mode,'PHASE2_GATED_NEURAL_WORK_GRAPH');
  assert.equal(route.workGraph.authority.executionAllowed,true);
  const markers=neuralEventRouteEvidence(route);
  assert.ok(markers.some(value=>value.startsWith('neural-event-gated:')));
  assert.ok(markers.some(value=>value.startsWith('neural-work-graph-gated:')));
});


test('successful CI result never mutates queue even when historical root cause is verified',()=>{
  const route=simulateNeuralEventRoute({
    event:{id:'ci-pass',type:'CI_RESULT',outcome:'PASS'},
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'GAME_INPUT'},
    gatedExecutionEnabled:true
  });
  assert.equal(route.proposedAction.kind,'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR');
  assert.equal(route.fireAllowed,false);
  assert.equal(route.authorityMode,'SHADOW');
  assert.equal(route.queueMutationAllowed,false);
});

test('verified supervisor revise may use gated existing-scheduler mutation',()=>{
  const route=simulateNeuralEventRoute({
    event:{id:'supervisor-revise',type:'SUPERVISOR_RESULT',outcome:'REVISE'},
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'GAME_INPUT'},
    gatedExecutionEnabled:true
  });
  assert.equal(route.fireAllowed,true);
  assert.equal(route.authorityMode,'GATED');
  assert.equal(route.queueMutationAllowed,true);
  assert.equal(route.policyMutationAllowed,false);
});
