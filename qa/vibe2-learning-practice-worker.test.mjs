import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildPracticePrompt,evaluatePracticeAnswer,runLearningPractice} from '../tools/vibe2-learning-practice-worker.mjs';

test('practice requires analysis-only marked work order',()=>{
  assert.throws(()=>buildPracticePrompt({executionRoute:'text-source-worker',goal:'[VIBE_LEARNING_PRACTICE] x'}),/analysis-only/);
  assert.throws(()=>buildPracticePrompt({executionRoute:'analysis-only',goal:'ordinary'}),/marker/);
});

test('practice result can pass structurally but never becomes production pass',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-practice-'));
  const order=path.join(dir,'order.json'),response=path.join(dir,'response.json'),out=path.join(dir,'out.json');
  fs.writeFileSync(order,JSON.stringify({taskId:'p1',executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE] repair repeated save failure'}));
  fs.writeFileSync(response,JSON.stringify({diagnosis:'Repeated save restore state is not reset deterministically.',strategy:'Trace the save owner and verify a bounded restore transaction.',tests:['reload restores state','double restore is idempotent','restart then restore works'],avoidPatterns:['duplicate restore mutation'],reusablePatterns:['single save owner']}));
  const result=await runLearningPractice({workOrderFile:order,responseFile:response,outputFile:out});
  assert.equal(result.evaluation,'PASS');
  assert.equal(result.practiceOnly,true);
  assert.equal(result.productionPass,false);
  assert.equal(result.sourceWrite,false);
  assert.equal(result.knowledgeState,'UNTRUSTED_PRACTICE_OUTPUT');
  assert.match(result.rawModelOutputSha256,/^[a-f0-9]{64}$/);
  assert.equal(result.rawModelOutputStored,false);
  assert.equal(result.candidateLessonsVerified,false);
  assert.equal(result.retrievalEligible,false);
  assert.equal(result.masteryCreditEligible,false);
  assert.equal(result.canonicalTrainingEligible,false);
  assert.equal(result.independentVerificationRequired,true);
  assert.equal(result.distillationRequiredBeforeReuse,true);
});

test('weak practice answer fails evaluation',()=>{
  assert.equal(evaluatePracticeAnswer({diagnosis:'x',strategy:'y',tests:['a']}).pass,false);
});
