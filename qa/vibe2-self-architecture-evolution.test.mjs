import test from 'node:test';
import assert from 'node:assert/strict';
import { injectSelfArchitectureEvolutionTasks } from '../tools/vibe2-self-architecture-evolution.mjs';

const failure=(id,blocker,generation=0)=>({id,gameId:id,target:'web',department:'development',type:'implementation',goal:'x',status:'failed',blocker,recoveryGeneration:generation,retryPolicy:'UNLIMITED_CAUSAL_REPAIR'});

test('repeated structural failure becomes one atomic self-architecture evolution task',()=>{
  const input={maxConcurrentTasks:256,tasks:[failure('a','source-candidate-generation-failed'),failure('b','source-candidate-generation-failed'),failure('c','source-candidate-generation-failed')]};
  const result=injectSelfArchitectureEvolutionTasks(input,{currentMax:20});
  assert.equal(result.added.length,1);
  const task=result.added[0];
  assert.equal(task.target,'system');
  assert.equal(task.department,'system-architecture');
  assert.equal(task.systemSteward,true);
  assert.equal(task.executionLane,'RECOVERY_FAST');
  assert.equal(task.maxRetries,null);
  assert(task.responsibleFiles.includes('tools/vibe2-source-worker.mjs'));
  assert(task.responsibleFiles.includes('qa/vibe2-source-worker.test.mjs'));
  assert(task.evidence.includes('architecture-total-evolution-generation-limit:NONE'));
  assert(task.evidence.includes('architecture-neural-expansion-phase:LAST_STAGE_ONLY'));
  assert(task.evidence.includes('architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION'));
  assert(task.evidence.includes('architecture-neural-expansion-readiness:PENDING'));
  assert(task.evidence.includes('architecture-neural-expansion-allowed:NO'));
  assert(task.completionCriteria.includes('BEFORE_AFTER_METRIC_IMPROVED'));
  assert(task.completionCriteria.includes('NEURAL_EXECUTION_AUTHORITY_UNCHANGED'));
});

test('unchanged evidence does not create a busy-loop generation after verified architecture work',()=>{
  const base=[failure('a','fan-in-regression-failed'),failure('b','fan-in-regression-failed'),failure('c','fan-in-regression-failed')];
  const first=injectSelfArchitectureEvolutionTasks({tasks:base},{});
  const verified={...first.added[0],status:'verified'};
  const same=injectSelfArchitectureEvolutionTasks({tasks:[...base,verified]},{});
  assert.equal(same.added.length,0);
  const more=injectSelfArchitectureEvolutionTasks({tasks:[...base,failure('d','fan-in-regression-failed'),verified]},{});
  assert.equal(more.added.length,1);
  assert.match(more.added[0].id,/-v2$/);
});

test('high recovery generation can trigger structural evolution before three separate failures',()=>{
  const result=injectSelfArchitectureEvolutionTasks({tasks:[failure('a','queue-starvation',2)]},{});
  assert.equal(result.added.length,1);
  assert(result.added[0].responsibleFiles.includes('tools/vibe2-auto-planner.mjs'));
});


test('verified final-stage readiness allows Vibe to consider neural expansion without expanding execution authority',()=>{
  const input={tasks:[failure('a','source-candidate-generation-failed'),failure('b','source-candidate-generation-failed'),failure('c','source-candidate-generation-failed')]};
  const result=injectSelfArchitectureEvolutionTasks(input,{
    neuralExpansionReadiness:{
      source:'TEST_VERIFIED_QA',
      rule1QaPass:true,rule2QaPass:true,rule3QaPass:true,
      atomicNeuronFanInQaPass:true,sharedContextQaPass:true,securityQaPass:true
    }
  });
  assert.equal(result.neuralExpansionReadiness.pass,true);
  assert.equal(result.added.length,1);
  const task=result.added[0];
  assert.ok(task.evidence.includes('architecture-neural-expansion-readiness:PASS'));
  assert.ok(task.evidence.includes('architecture-neural-expansion-allowed:YES'));
  assert.ok(task.completionCriteria.includes('NEURAL_EXPANSION_IF_CHOSEN_REQUIRES_CAUSAL_PROOF'));
  assert.ok(task.completionCriteria.includes('NEURAL_EXECUTION_AUTHORITY_UNCHANGED'));
});


test('neural bottlenecks route to neural architecture responsibilities when structure needs expansion',()=>{
  const rows=[
    failure('n1','neural-event-router-bottleneck'),
    failure('n2','neural-event-router-bottleneck'),
    failure('n3','neural-event-router-bottleneck')
  ];
  const result=injectSelfArchitectureEvolutionTasks({tasks:rows},{
    neuralExpansionReadiness:{
      rule1QaPass:true,rule2QaPass:true,rule3QaPass:true,
      atomicNeuronFanInQaPass:true,sharedContextQaPass:true,securityQaPass:true
    }
  });
  assert.equal(result.added.length,1);
  const task=result.added[0];
  assert.ok(task.responsibleFiles.includes('tools/vibe2-neural-event-router.mjs'));
  assert.ok(task.responsibleFiles.includes('tools/vibe2-fan-in-review.mjs'));
  assert.ok(task.evidence.includes('architecture-neural-expansion-allowed:YES'));
});
