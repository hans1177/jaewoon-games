import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildPracticePrompt,buildPracticeRetryPrompt,evaluatePracticeAnswer,runLearningPractice} from '../tools/vibe2-learning-practice-worker.mjs';

test('practice requires analysis-only marked work order',()=>{
  assert.throws(()=>buildPracticePrompt({executionRoute:'text-source-worker',goal:'[VIBE_LEARNING_PRACTICE] x'}),/analysis-only/);
  assert.throws(()=>buildPracticePrompt({executionRoute:'analysis-only',goal:'ordinary'}),/marker/);
});

test('practice prompt keeps strict JSON and no-promotion boundary',()=>{
  const prompt=buildPracticePrompt({executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE] economy drill'});
  assert.match(prompt,/strict JSON object only/);
  assert.match(prompt,/Do not edit files/);
  assert.match(prompt,/Do not claim production pass/);
  assert.match(prompt,/at least 3 concrete verification checks/);
});

test('practice result can pass structurally but never becomes production pass',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-practice-'));
  const order=path.join(dir,'order.json'),response=path.join(dir,'response.json'),out=path.join(dir,'out.json');
  fs.writeFileSync(order,JSON.stringify({taskId:'p1',executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE] repair repeated economy state failure'}));
  fs.writeFileSync(response,JSON.stringify({
    diagnosis:'Economy state has multiple mutation paths without one authoritative transaction boundary.',
    strategy:'Route balance mutations through one bounded transaction and verify invariants after each state transition.',
    tests:['purchase debits once','failed purchase leaves balance unchanged','reload preserves the committed balance'],
    avoidPatterns:['duplicated balance mutation'],
    reusablePatterns:['single authoritative economy transaction']
  }));
  const result=await runLearningPractice({workOrderFile:order,responseFile:response,outputFile:out});
  assert.equal(result.evaluation,'PASS');
  assert.equal(result.practiceOnly,true);
  assert.equal(result.productionPass,false);
  assert.equal(result.sourceWrite,false);
  assert.equal(result.attempts,1);
  assert.equal(result.recoveryUsed,false);
});

test('weak practice answer reports unchanged structural gate failures',()=>{
  const result=evaluatePracticeAnswer({diagnosis:'x',strategy:'y',tests:['a']});
  assert.equal(result.pass,false);
  assert.deepEqual(result.reasons,[
    'DIAGNOSIS_TOO_SHORT',
    'STRATEGY_TOO_SHORT',
    'TESTS_MINIMUM_NOT_MET',
    'GENERALIZED_LESSON_REQUIRED'
  ]);
});

test('retry prompt exposes failure reasons without weakening authority',()=>{
  const base=buildPracticePrompt({executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE] economy drill'});
  const retry=buildPracticeRetryPrompt(base,{reasons:['TESTS_MINIMUM_NOT_MET']});
  assert.match(retry,/TESTS_MINIMUM_NOT_MET/);
  assert.match(retry,/unchanged practice structure gate/);
  assert.match(retry,/Do not weaken verification checks/);
  assert.match(retry,/claim any production\/QA\/release pass/);
});
