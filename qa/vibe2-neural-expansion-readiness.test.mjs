// 파일명: qa/vibe2-neural-expansion-readiness.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
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


test('parallel readiness starts independent QA lanes before any lane completes and fans in once',async()=>{
  const started=[];
  let release;
  const barrier=new Promise(resolve=>{release=resolve;});
  const resultPromise=evaluateNeuralExpansionReadinessParallel({
    root:process.cwd(),
    runner:async(root,files)=>{
      started.push(files[0]);
      if(started.length===Object.keys(NEURAL_EXPANSION_READINESS_CHECKS).length)release();
      await barrier;
      return{pass:true,missing:[],error:null};
    }
  });
  await barrier;
  assert.equal(started.length,Object.keys(NEURAL_EXPANSION_READINESS_CHECKS).length);
  const result=await resultPromise;
  assert.equal(result.pass,true);
  assert.equal(result.evaluationMode,'PARALLEL_INDEPENDENT_QA_ORDERED_FINAL_GATE');
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
