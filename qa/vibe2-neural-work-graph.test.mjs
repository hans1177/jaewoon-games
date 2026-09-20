// 파일명: qa/vibe2-neural-work-graph.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNeuralWorkGraph,
  neuralWorkGraphEvidence,
  summarizeNeuralWorkGraphEvidence
} from '../tools/vibe2-neural-work-graph.mjs';

const diagnosis={
  mode:'PHASE1_SHADOW_ADVISORY',
  facts:[{id:'fact-1',value:'web-stage:WEB_REPAIR',source:'TASK_OR_RUNTIME_EVIDENCE',verified:true}],
  hypotheses:[{id:'runtime-input-binding',system:'GAME_INPUT',confidence:.9,reason:'input path may be disconnected'}],
  responsibility:{system:'GAME_INPUT',confidence:.9,basis:'WEIGHTED_SHADOW_HYPOTHESES',verified:false},
  bottleneck:{score:82},
  actionRecommendation:{
    mode:'EXACT_FAILURE_STAGE_REPAIR',
    failureStage:'WEB_REPAIR',
    responsibleSystem:'GAME_INPUT',
    preserveAlreadyPassedStages:true,
    blocked:false
  }
};

const route={
  inhibitors:['PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'],
  proposedAction:{
    kind:'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR',
    reason:'VERIFIED_ROOT_CAUSE_AVAILABLE',
    responsibleSystem:'GAME_INPUT'
  },
  wouldFireWithoutPhase2Authority:true
};

test('work graph materializes neural contract fields without granting execution authority',()=>{
  const graph=buildNeuralWorkGraph({
    event:{id:'task-a|run-1|CI_RESULT',type:'CI_RESULT',evidence:['role-result:review:PASS']},
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'GAME_INPUT'},
    route
  });
  assert.equal(graph.mode,'PHASE2_SHADOW_NEURAL_WORK_GRAPH');
  assert.equal(graph.summary.actionKind,'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR');
  assert.equal(graph.summary.wouldActivateWithoutPhase2Authority,true);
  assert.equal(graph.summary.actionActivationState,'INHIBITED');
  assert.equal(graph.authority.executionAllowed,false);
  assert.equal(graph.authority.workerCreationAllowed,false);
  assert.equal(graph.authority.queueMutationAllowed,false);
  assert.equal(graph.authority.waveReorderAllowed,false);
  assert.equal(graph.authority.lockAcquisitionAllowed,false);
  assert.equal(graph.authority.policyMutationAllowed,false);
  assert.equal(graph.authority.automaticLearningAllowed,false);
  assert.equal(graph.authority.authorityPromotionAllowed,false);
  assert.equal(graph.currentWaveSchedulerRemainsAuthoritative,true);
  assert.ok(graph.nodes.some(row=>row.nodeClass==='GOAL'&&row.neuronType==='INTENT'));
  assert.ok(graph.nodes.some(row=>row.nodeClass==='FACT'&&row.neuronType==='CAUSAL'));
  assert.ok(graph.nodes.some(row=>row.nodeClass==='ACTION'&&row.neuronType==='ACTION'));
  for(const row of graph.nodes){
    for(const key of ['inputs','activation','confidence','dependencies','inhibitors','outputs','evidence','lastFiredAt']){
      assert.ok(Object.hasOwn(row,key),`${row.id} missing ${key}`);
    }
    assert.equal(row.lastFiredAt,null);
  }
});

test('required unsatisfied dependency inhibits action before any hypothetical fire',()=>{
  const graph=buildNeuralWorkGraph({
    event:{
      id:'task-b|run-2|WORKER_RESULT',
      type:'WORKER_RESULT',
      dependencies:[{id:'source-lock',required:true,state:'BLOCKED',satisfied:false,evidence:['lock-held']}]
    },
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'GAME_INPUT'},
    route
  });
  assert.equal(graph.summary.dependencyCount,1);
  assert.equal(graph.summary.unsatisfiedDependencyCount,1);
  assert.equal(graph.summary.wouldActivateWithoutPhase2Authority,false);
  assert.ok(graph.summary.actionInhibitors.includes('DEPENDENCY_UNSATISFIED:source-lock'));
  const dependency=graph.nodes.find(row=>row.nodeClass==='DEPENDENCY');
  assert.ok(dependency);
  assert.equal(dependency.activation.state,'INHIBITED');
});

test('unverified cause stays hypothesis rather than becoming fact',()=>{
  const graph=buildNeuralWorkGraph({
    event:{id:'task-c|run-3|QA_RESULT',type:'QA_RESULT'},
    diagnosis,
    rootCause:{
      state:'CAUSAL_REPAIR_CONFIRMED_SYSTEM_UNVERIFIED',
      rootCauseVerified:false,
      responsibleSystem:null,
      nextEvidenceRequired:['VERIFIED_RESPONSIBLE_SYSTEM_EVIDENCE']
    },
    route:{
      inhibitors:['ROOT_CAUSE_NOT_VERIFIED','PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'],
      proposedAction:{kind:'REQUEST_RESPONSIBLE_SYSTEM_VERIFICATION',reason:'CAUSAL_REPAIR_CONFIRMED_SYSTEM_UNVERIFIED'},
      wouldFireWithoutPhase2Authority:false
    }
  });
  const root=graph.nodes.find(row=>row.id==='root-cause');
  assert.ok(root);
  assert.equal(root.nodeClass,'HYPOTHESIS');
  assert.notEqual(root.nodeClass,'FACT');
});

test('graph evidence is compact durable shadow telemetry with all authority bits false',()=>{
  const graph=buildNeuralWorkGraph({
    event:{id:'task-d|run-4|CI_RESULT',type:'CI_RESULT'},
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'GAME_INPUT'},
    route
  });
  const markers=neuralWorkGraphEvidence(graph);
  assert.equal(markers.length,1);
  assert.ok(markers[0].startsWith('neural-work-graph-shadow:'));
  const payload=JSON.parse(decodeURIComponent(markers[0].slice('neural-work-graph-shadow:'.length)));
  assert.equal(payload.eventId,'task-d|run-4|CI_RESULT');
  assert.equal(payload.actionKind,'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR');
  assert.equal(payload.executionAllowed,false);
  assert.equal(payload.workerCreationAllowed,false);
  assert.equal(payload.queueMutationAllowed,false);
  assert.equal(payload.waveReorderAllowed,false);
  assert.equal(payload.lockAcquisitionAllowed,false);
  assert.equal(payload.policyMutationAllowed,false);
  assert.equal(payload.automaticLearningAllowed,false);
  assert.equal(payload.authorityPromotionAllowed,false);
});

test('graph evidence deduplicates exact event identity and blocks conflicting rows',()=>{
  const graph=buildNeuralWorkGraph({
    event:{id:'task-e|run-5|CI_RESULT',type:'CI_RESULT'},
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'GAME_INPUT'},
    route
  });
  const marker=neuralWorkGraphEvidence(graph)[0];
  const exact=summarizeNeuralWorkGraphEvidence([marker,marker]);
  assert.equal(exact.rawRows,2);
  assert.equal(exact.distinctGraphs,1);
  assert.equal(exact.duplicateRows,1);
  assert.equal(exact.conflicts,0);
  assert.equal(exact.unauthorizedAuthorityBitCount,0);
  assert.equal(exact.safetyInvariantPass,true);

  const payload=JSON.parse(decodeURIComponent(marker.slice('neural-work-graph-shadow:'.length)));
  const conflicting='neural-work-graph-shadow:'+encodeURIComponent(JSON.stringify({...payload,actionKind:'REQUEST_EVIDENCE'}));
  const conflict=summarizeNeuralWorkGraphEvidence([marker,conflicting]);
  assert.equal(conflict.distinctGraphs,1);
  assert.equal(conflict.conflicts,1);
  assert.equal(conflict.safetyInvariantPass,false);
});

test('same input produces deterministic graph state',()=>{
  const input={
    event:{id:'task-f|run-6|RUNTIME_RESULT',type:'RUNTIME_RESULT',evidence:['runtime:FAIL']},
    diagnosis,
    rootCause:{state:'ROOT_CAUSE_VERIFIED',rootCauseVerified:true,responsibleSystem:'GAME_INPUT'},
    route
  };
  assert.deepEqual(buildNeuralWorkGraph(input),buildNeuralWorkGraph(input));
});
