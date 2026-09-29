// 파일명: qa/vibe2-neural-expansion-readiness.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NEURAL_EXPANSION_MAX_PARALLEL_CHECKS,
  NEURAL_EXPANSION_READINESS_CHECKS,
  evaluateNeuralExpansionReadiness,
  evaluateNeuralExpansionReadinessParallel
} from '../tools/vibe2-neural-expansion-readiness.mjs';

test('all targeted rule neural shared-context and security QA allows internal neural expansion readiness',()=>{
  const calls=[];
  const result=evaluateNeuralExpansionReadiness({
    root:process.cwd(),
    runner:(root,files)=>{
      calls.push({root,files:[...files]});
      return{pass:true,missing:[],error:null};
    }
  });
  assert.equal(result.pass,true);
  assert.deepEqual(result.missing,[]);
  assert.equal(calls.length,Object.keys(NEURAL_EXPANSION_READINESS_CHECKS).length);
  assert.equal(result.internalNeuralStructureExpansionAllowedWhenPass,true);
  assert.equal(result.neuralExecutionAuthorityExpansionAllowed,false);
  assert.equal(result.queueMutationAuthorityExpanded,false);
  assert.equal(result.workerCreationAuthorityExpanded,false);
  assert.equal(result.gateWeakeningAllowed,false);
});

test('one failed prerequisite keeps neural expansion pending without blocking ordinary architecture evolution',()=>{
  const result=evaluateNeuralExpansionReadiness({
    root:process.cwd(),
    runner:(root,files)=>files.includes('qa/vibe2-owner-rule3-unbounded-learning.test.mjs')
      ?{pass:false,missing:[],error:'RULE3_FAIL'}
      :{pass:true,missing:[],error:null}
  });
  assert.equal(result.pass,false);
  assert.ok(result.missing.includes('rule3QaPass'));
  assert.equal(result.details.rule3QaPass.pass,false);
  assert.equal(result.internalNeuralStructureExpansionAllowedWhenPass,true);
  assert.equal(result.neuralExecutionAuthorityExpansionAllowed,false);
});


test('parallel readiness uses bounded concurrency and fans in through the ordered final gate',async()=>{
  let active=0,maxActive=0;
  const result=await evaluateNeuralExpansionReadinessParallel({
    root:process.cwd(),
    maxParallelChecks:99,
    runner:async()=> {
      active+=1;
      maxActive=Math.max(maxActive,active);
      await new Promise(resolve=>setTimeout(resolve,10));
      active-=1;
      return{pass:true,missing:[],error:null};
    }
  });
  assert.equal(result.pass,true);
  assert.equal(result.evaluationMode,'PARALLEL_BOUNDED_INDEPENDENT_QA_ORDERED_FINAL_GATE');
  assert.equal(result.parallelLaneCount,NEURAL_EXPANSION_MAX_PARALLEL_CHECKS);
  assert.equal(result.maxParallelChecks,NEURAL_EXPANSION_MAX_PARALLEL_CHECKS);
  assert.ok(maxActive>1);
  assert.ok(maxActive<=NEURAL_EXPANSION_MAX_PARALLEL_CHECKS);
  assert.equal(result.rule4QaPass,true);
  assert.equal(result.bottleneckQaPass,true);
  assert.equal(result.orderedRuleGatePass,true);
  assert.equal(result.bottleneckGatePass,true);
  assert.equal(result.finalGateOrderEnforced,true);
  assert.deepEqual(result.implementationOrder,['RULE_1','RULE_2','RULE_3','RULE_4_FINAL_STAGE']);
  assert.equal(result.neuralExecutionAuthorityExpansionAllowed,false);
  assert.equal(result.gateWeakeningAllowed,false);
});

test('parallel readiness remains fail closed when one lane fails',async()=>{
  const result=await evaluateNeuralExpansionReadinessParallel({
    root:process.cwd(),
    runner:async(root,files)=>files.includes('qa/company-security-steward.test.mjs')
      ?{pass:false,missing:[],error:'SECURITY_FAIL'}
      :{pass:true,missing:[],error:null}
  });
  assert.equal(result.pass,false);
  assert.ok(result.missing.includes('securityQaPass'));
  assert.equal(result.internalNeuralStructureExpansionAllowedWhenPass,true);
  assert.equal(result.neuralExecutionAuthorityExpansionAllowed,false);
  assert.equal(result.queueMutationAuthorityExpanded,false);
  assert.equal(result.workerCreationAuthorityExpanded,false);
});


test('parallel readiness keeps explicit lower concurrency caps without weakening gates',async()=>{
  let active=0,maxActive=0;
  const result=await evaluateNeuralExpansionReadinessParallel({
    root:process.cwd(),
    maxParallelChecks:2,
    runner:async()=>{
      active+=1;
      maxActive=Math.max(maxActive,active);
      await new Promise(resolve=>setTimeout(resolve,5));
      active-=1;
      return{pass:true,missing:[],error:null};
    }
  });
  assert.equal(result.parallelLaneCount,2);
  assert.ok(maxActive<=2);
  assert.equal(result.pass,true);
  assert.equal(result.neuralExecutionAuthorityExpansionAllowed,false);
  assert.equal(result.queueMutationAuthorityExpanded,false);
  assert.equal(result.workerCreationAuthorityExpanded,false);
  assert.equal(result.gateWeakeningAllowed,false);
});
