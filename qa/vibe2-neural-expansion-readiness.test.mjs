// 파일명: qa/vibe2-neural-expansion-readiness.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NEURAL_EXPANSION_READINESS_CHECKS,
  evaluateNeuralExpansionReadiness
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
