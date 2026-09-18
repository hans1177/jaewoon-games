import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { dedupeIdlePracticeTasks, injectIdlePracticeTask } from '../tools/vibe2-learning-motor.mjs';

function practice(id,status='failed',retries=1,evidence=[]){
  return {
    id,status,retries,maxRetries:1,target:'web',type:'research',sourceRoot:'learning-practice:test',
    evidence:['learning-practice-only','production-pass:NO',...evidence]
  };
}

test('duplicate terminal practice tasks collapse and the next unrepresented drill is queued',()=>{
  const queue={version:5,tasks:[
    practice('LEARNING-PRACTICE-gap-asset_production-l1','failed',3,['failure-cause:learning-practice-worker-failed']),
    practice('LEARNING-PRACTICE-gap-asset_production-l1','failed',2,['learning-practice-complete'])
  ]};
  const idle={drills:[
    {id:'gap-asset_production-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['ASSET_PRODUCTION']},
    {id:'gap-economy-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['ECONOMY']}
  ]};
  const result=injectIdlePracticeTask(queue,idle);
  assert.equal(result.added,true);
  assert.equal(result.changed,true);
  assert.equal(result.deduped,1);
  assert.equal(result.queue.tasks.filter(t=>t.id==='LEARNING-PRACTICE-gap-asset_production-l1').length,1);
  assert.equal(result.queue.tasks.some(t=>t.id==='LEARNING-PRACTICE-gap-economy-l1'&&t.status==='queued'),true);
});

test('active practice wins dedupe and prevents another practice from starting',()=>{
  const rows=[
    practice('LEARNING-PRACTICE-gap-save-l1','failed',1),
    practice('LEARNING-PRACTICE-gap-save-l1','running',0,['reservation-id:run:1'])
  ];
  const result=injectIdlePracticeTask({tasks:rows},{drills:[
    {id:'gap-save-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['SAVE']},
    {id:'gap-ui_state-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['UI_STATE']}
  ]});
  assert.equal(result.added,false);
  assert.equal(result.changed,true);
  assert.equal(result.reason,'PRACTICE_ALREADY_ACTIVE');
  const kept=result.queue.tasks.find(t=>t.id==='LEARNING-PRACTICE-gap-save-l1');
  assert.equal(kept.status,'running');
  assert.equal(result.queue.tasks.length,1);
});

test('terminal represented drill is not recreated when no new drill remains',()=>{
  const result=injectIdlePracticeTask(
    {tasks:[practice('LEARNING-PRACTICE-gap-save-l1','failed',2)]},
    {drills:[{id:'gap-save-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['SAVE']}]}
  );
  assert.equal(result.added,false);
  assert.equal(result.reason,'NO_NEW_PRACTICE_DRILL');
  assert.equal(result.queue.tasks.length,1);
});

test('dedupe never merges unrelated production tasks',()=>{
  const rows=[
    {id:'prod-a',status:'queued',evidence:[]},
    {id:'prod-a',status:'queued',evidence:[]},
    practice('LEARNING-PRACTICE-gap-save-l1','failed',1),
    practice('LEARNING-PRACTICE-gap-save-l1','failed',2)
  ];
  const result=dedupeIdlePracticeTasks(rows);
  assert.equal(result.changed,true);
  assert.equal(result.removed,1);
  assert.equal(result.tasks.filter(t=>t.id==='prod-a').length,2);
  assert.equal(result.tasks.filter(t=>t.id==='LEARNING-PRACTICE-gap-save-l1').length,1);
});


test('idle practice model answers require verification and distillation before reuse',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/vibe2-learning-motor.json',import.meta.url),'utf8'));
  const boundary=policy.idleTraining?.knowledgeBoundary||{};
  assert.equal(boundary.rawPracticeModelAnswerAuthority,'UNTRUSTED_PRACTICE_OUTPUT');
  assert.equal(boundary.rawPracticeModelAnswerMayEnterRetrieval,false);
  assert.equal(boundary.rawPracticeModelAnswerMayBecomeExperience,false);
  assert.equal(boundary.rawPracticeModelAnswerMayIncreaseMastery,false);
  assert.equal(boundary.rawPracticeModelAnswerMayEnterCanonicalTraining,false);
  assert.equal(boundary.independentVerificationRequiredBeforeReuse,true);
  assert.equal(boundary.distillationRequiredBeforeReuse,true);
  assert.equal(boundary.verifiedDistilledLessonAuthority,'VERIFIED_DISTILLED_PRACTICE_KNOWLEDGE');
  assert.equal(boundary.verifiedDistilledLessonMayEnterRetrieval,true);
  assert.equal(boundary.verifiedProjectOutcomeStillRequiredForPositiveMasteryOrTraining,true);
  assert.equal(boundary.authorityExpanded,false);
  assert.equal(policy.modelTraining?.practiceRawModelOutputDirectTraining,false);
  assert.equal(policy.modelTraining?.practiceDistilledKnowledgeDirectTraining,false);
});
