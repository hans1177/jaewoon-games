// 파일명: qa/vibe2-practice-distillation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePracticeResultForDistillation,
  distillPracticeResult,
  mergePracticeDistillationStore
} from '../tools/vibe2-practice-distillation.mjs';

const result={
  taskId:'LEARNING-PRACTICE-gap-save-l1',
  practiceOnly:true,
  productionPass:false,
  sourceWrite:false,
  knowledgeState:'UNTRUSTED_PRACTICE_OUTPUT',
  rawModelOutputSha256:'a'.repeat(64),
  rawModelOutputStored:false,
  candidateLessonsVerified:false,
  retrievalEligible:false,
  masteryCreditEligible:false,
  canonicalTrainingEligible:false,
  independentVerificationRequired:true,
  distillationRequiredBeforeReuse:true,
  evaluation:'PASS',
  diagnosis:'Save restore path needs one authoritative owner.',
  strategy:'Verify save restore transitions through one bounded persistence owner.',
  tests:['save reload restores state','double restore is idempotent','restart then load works'],
  reusablePatterns:['single save persistence owner'],
  avoidPatterns:['duplicate save restore mutation']
};
const order={originalGoal:'[VIBE_LEARNING_PRACTICE]\nkind=MINI_GAME_SYSTEM_DRILL\ndomains=SAVE'};
const patterns={patterns:[
  {id:'p1',system:'SAVE_PERSISTENCE',verified:true,rawCodeStored:false,independentQa:'PASS',sourceRevision:'1'.repeat(40)},
  {id:'p2',system:'SAVE_PERSISTENCE',verified:true,rawCodeStored:false,independentQa:'PASS',sourceRevision:'2'.repeat(40)}
]};

test('raw practice output cannot bypass the quarantine boundary',()=>{
  const check=validatePracticeResultForDistillation({...result,retrievalEligible:true});
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes('RAW_RETRIEVAL_FORBIDDEN'));
});

test('practice distillation stores only verified domain signal and provenance',()=>{
  const distilled=distillPracticeResult({result,order,codePatternsInput:patterns});
  assert.equal(distilled.accepted.length,1);
  const row=distilled.accepted[0];
  assert.equal(row.domain,'SAVE');
  assert.equal(row.authority,'VERIFIED_DISTILLED_PRACTICE_KNOWLEDGE');
  assert.equal(row.verified,true);
  assert.equal(row.independentlyVerified,true);
  assert.equal(row.retrievalEligible,true);
  assert.equal(row.rawModelOutputStored,false);
  assert.equal(row.candidateTextStored,false);
  assert.equal(row.directMasteryCredit,false);
  assert.equal(row.directTrainingSample,false);
  assert.equal(row.verificationEvidence.length,2);
  const serialized=JSON.stringify(distilled);
  assert.doesNotMatch(serialized,/single save persistence owner/);
  assert.doesNotMatch(serialized,/duplicate save restore mutation/);
  assert.doesNotMatch(serialized,/authoritative owner/);
});

test('one verified evidence item is insufficient for practice promotion',()=>{
  const distilled=distillPracticeResult({result,order,codePatternsInput:{patterns:[patterns.patterns[0]]}});
  assert.equal(distilled.accepted.length,0);
  assert.equal(distilled.rejected[0].reason,'INSUFFICIENT_VERIFIED_CORROBORATION');
});

test('practice store dedupes by domain and only strengthens verified advisory signal',()=>{
  const a=distillPracticeResult({result,order,codePatternsInput:patterns});
  const first=mergePracticeDistillationStore({},[a]);
  const second=mergePracticeDistillationStore(first.store,[a]);
  assert.equal(second.store.entries.length,1);
  assert.equal(second.store.entries[0].confirmations,2);
  assert.equal(second.store.entries[0].candidateTextStored,false);
  assert.equal(second.store.entries[0].directProductionPass,false);
  assert.equal(second.store.entries[0].directTrainingSample,false);
});
