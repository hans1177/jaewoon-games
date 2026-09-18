// 파일명: qa/vibe2-queue-control.test.mjs
// 역할: DAG/shard/source-lock/work-stealing/backpressure/speculative fan-in 큐 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueueVibeTask,
  reserveNextVibeTask,
  reserveVibeTaskBatch,
  markVibeTaskAwaiting,
  releaseVibeTaskExecutionSlot,
  settleVibeTask,
  applyVibeFanInResults,
  recoverFixedFullWebTransportFailures
} from '../tools/vibe2-queue-control.mjs';
import { createVibeContinuousQueue, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';

function add(queue, id, gameId, target='unity', extra={}) {
  return enqueueVibeTask(queue,{ id, gameId, target, goal:`${id} 작업`, sourceRoot:`${target}-games/${gameId}`, ...extra });
}

test('legacy central policy evidence is migrated to the roadmap authority during queue normalization', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'legacy-policy',gameId:'legacy',target:'web',sourceRoot:'web-games/legacy',goal:'legacy',
    status:'queued',evidence:['central-policy:COMPANY_FLOW.md','owner-directive:existing']
  }]});
  assert.equal(queue.tasks[0].evidence.includes('central-policy:COMPANY_FLOW.md'),false);
  assert.equal(queue.tasks[0].evidence.includes('central-policy:company-learning/platform-release-roadmap.json'),true);
  assert.equal(queue.tasks[0].evidence.includes('owner-directive:existing'),true);
});

test('owner directive preempts release and development work', () => {
  let queue=createVibeContinuousQueue();
  queue=add(queue,'dev','dev','unity',{releaseState:'development-confirmed'});
  queue=add(queue,'release','release','web',{releaseState:'release-confirmed'});
  queue=add(queue,'owner','owner','unity',{ownerDirective:true});
  assert.equal(reserveNextVibeTask(queue).task.id,'owner');
});

test('release-confirmed preempts development-confirmed', () => {
  let queue=createVibeContinuousQueue();
  queue=add(queue,'dev','dev','unity',{priority:'critical',releaseState:'development-confirmed'});
  queue=add(queue,'release','release','web',{priority:'normal',releaseState:'release-confirmed'});
  assert.equal(reserveNextVibeTask(queue).task.id,'release');
});

test('independent source roots fan out in one reservation batch', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'u1','u1','unity',{releaseState:'release-confirmed'});
  queue=add(queue,'w1','w1','web',{releaseState:'development-confirmed'});
  queue=add(queue,'w2','w2','web',{releaseState:'development-confirmed'});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.equal(reserved.tasks.length,3);
  assert.deepEqual(new Set(reserved.tasks.map(t=>t.id)),new Set(['u1','w1','w2']));
  assert.equal(reserved.selection.workStealingUsed,false);
});

test('same source root may fan out when responsibility files are concrete and disjoint', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});
  queue=add(queue,'a','same','web',{responsibleFiles:['a.js']});
  queue=add(queue,'b','same','web',{responsibleFiles:['b.js']});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:20});
  assert.equal(reserved.tasks.length,2);
});

test('same source root remains exclusive when responsibility files overlap or are unspecified', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});
  queue=add(queue,'a','same','web',{responsibleFiles:['shared.js']});
  queue=add(queue,'b','same','web',{responsibleFiles:['shared.js']});
  queue=add(queue,'c','same','web');
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:20});
  assert.equal(reserved.tasks.length,1);
  assert.ok(reserved.selection.deferredConflicts.some(row=>row.reason==='responsible-file-conflict'||row.reason==='source-root-conflict'));
});

test('DAG dependency starts only after predecessor PASS', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'base','a','web');
  queue=add(queue,'after','b','web',{dependencies:['base']});
  let reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.deepEqual(reserved.tasks.map(t=>t.id),['base']);
  let done=settleVibeTask(reserved.queue,{taskId:'base',outcome:'PASS',evidence:['pass']});
  const next=selectVibeQueueBatch(done.queue,{maxConcurrentTasks:4});
  assert.equal(next.selected[0].id,'after');
});

test('awaiting QA holds its source root but does not block independent work', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'first','game-a','unity');
  queue=add(queue,'same-next','game-a','unity');
  queue=add(queue,'other','game-b','web');
  let reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:2});
  assert.deepEqual(new Set(reserved.tasks.map(t=>t.id)),new Set(['first','other']));
  queue=markVibeTaskAwaiting(reserved.queue,{taskId:'first',blocker:'candidate-awaiting-qa-and-deployment'});
  let done=settleVibeTask(queue,{taskId:'other',outcome:'PASS'}).queue;
  const next=selectVibeQueueBatch(done,{maxConcurrentTasks:4});
  assert.equal(next.selected.some(t=>t.id==='same-next'),false);
  assert.equal(next.stopReason,'ONLY_CONFLICTING_WORK_AVAILABLE');
});

test('completed single worker releases capacity before fan-in without dropping source locks or adding QA pressure', () => {
  const queue=createVibeContinuousQueue({
    maxConcurrentTasks:2,
    tasks:[
      {id:'first',gameId:'game-a',target:'web',goal:'first',status:'running',responsibleFiles:['first.js']},
      {id:'other-running',gameId:'game-b',target:'web',goal:'other',status:'running',responsibleFiles:['b.js']},
      {id:'same-root',gameId:'game-a',target:'web',goal:'same',status:'queued',responsibleFiles:['first.js']},
      {id:'refill',gameId:'game-c',target:'web',goal:'refill',status:'queued',responsibleFiles:['c.js']}
    ]
  });
  const released=releaseVibeTaskExecutionSlot(queue,{taskId:'first',evidence:['worker-finished']});
  assert.equal(released.released,true);
  const batch=selectVibeQueueBatch(released.queue,{maxConcurrentTasks:2});
  assert.equal(batch.capacityRunning.length,1);
  assert.equal(batch.releasedWorkerSlots.length,1);
  assert.equal(batch.backpressure.awaitingQaCount,0);
  assert.equal(batch.selected.some(t=>t.id==='same-root'),false);
  assert.equal(batch.selected.some(t=>t.id==='refill'),true);
  const second=releaseVibeTaskExecutionSlot(released.queue,{taskId:'first'});
  assert.equal(second.released,false);
  assert.equal(second.reason,'ALREADY_RELEASED');
});

test('stale slot-release callback never overwrites a real awaiting-QA blocker', () => {
  let queue=add(createVibeContinuousQueue(),'task','task','web');
  queue=reserveNextVibeTask(queue).queue;
  queue=markVibeTaskAwaiting(queue,{taskId:'task',blocker:'candidate-awaiting-qa-and-deployment'});
  const released=releaseVibeTaskExecutionSlot(queue,{taskId:'task'});
  assert.equal(released.released,false);
  assert.equal(released.reason,'ALREADY_RELEASED');
  assert.equal(released.queue.tasks[0].blocker,'candidate-awaiting-qa-and-deployment');
});

test('adaptive backpressure steps 20 down through 16 12 8 4 as pressure rises', () => {
  const expected=new Map([[0,20],[2,16],[4,12],[6,8],[8,4]]);
  for(const [count,limit] of expected){
    const tasks=Array.from({length:count},(_,i)=>({id:`run-${i}`,gameId:`g-${i}`,target:'web',sourceRoot:`web-games/g-${i}`,goal:'run',status:'running',blocker:'candidate-awaiting-qa-and-deployment'}));
    const queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks});
    const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:20});
    assert.equal(batch.effectiveMaxConcurrentTasks,limit);
  }
});

test('high-risk opt-in task creates three speculative worker variants', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'risky','risky','web',{estimatedRisk:'high',speculativeEligible:true});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.equal(reserved.matrix[0].speculativeVariants,3);
});

test('fan-in accepts first passing speculative variant and keeps task awaiting full QA', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'risky','risky','web',{estimatedRisk:'high',speculativeEligible:true});
  queue=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4}).queue;
  const merged=applyVibeFanInResults(queue,[
    {taskId:'risky',variant:'primary',outcome:'FAIL',durationMs:900,evidence:['primary-fail']},
    {taskId:'risky',variant:'speculative',outcome:'PASS',durationMs:700,evidence:['spec-pass'],blocker:'candidate-awaiting-qa-and-deployment'}
  ]);
  const task=merged.queue.tasks.find(t=>t.id==='risky');
  assert.equal(task.status,'running');
  assert.equal(task.blocker,'candidate-awaiting-qa-and-deployment');
  assert.ok(task.evidence.includes('speculative-winner:speculative'));
});

test('retryable failure clears blocker and remains selectable until retry limit', () => {
  let queue=add(createVibeContinuousQueue(),'retry','retry','unity',{maxRetries:1});
  let reserved=reserveNextVibeTask(queue);
  let failed=settleVibeTask(reserved.queue,{taskId:'retry',outcome:'FAIL',evidence:['fail-1'],blocker:'source-candidate-generation-failed'});
  assert.equal(failed.queue.tasks[0].status,'queued');
  reserved=reserveNextVibeTask(failed.queue);
  failed=settleVibeTask(reserved.queue,{taskId:'retry',outcome:'FAIL',evidence:['fail-2'],blocker:'source-candidate-generation-failed'});
  assert.equal(failed.queue.tasks[0].status,'failed');
});

test('output-budget repair requeues capped owner full-web rebuild failures once even after v1 transport retry', () => {
  const queue=createVibeContinuousQueue({tasks:[
    {
      id:'full-web',gameId:'web',target:'web',sourceRoot:'web-games/web',goal:'FULL_WEB_GAME_REBUILD actual game',
      ownerDirective:true,status:'failed',retries:3,maxRetries:2,blocker:'source-candidate-generation-failed',
      evidence:['old-failure','repair-retry:vibe2-full-web-stream-http-v1']
    },
    {
      id:'normal-web',gameId:'normal',target:'web',sourceRoot:'web-games/normal',goal:'normal maintenance',
      ownerDirective:true,status:'failed',retries:3,maxRetries:2,blocker:'source-candidate-generation-failed',evidence:['old-failure']
    }
  ]});
  const first=recoverFixedFullWebTransportFailures(queue);
  assert.equal(first.recovered,1);
  const repaired=first.queue.tasks.find(t=>t.id==='full-web');
  assert.equal(repaired.status,'queued');
  assert.equal(repaired.retries,0);
  assert.equal(repaired.blocker,null);
  assert.equal(repaired.lastOutcome,'RETRY_AFTER_INFRA_REPAIR');
  assert.ok(repaired.evidence.includes('repair-retry:vibe2-full-web-stream-http-v1'));
  assert.ok(repaired.evidence.includes('repair-retry:vibe2-full-web-output-budget-v2'));
  assert.equal(first.queue.tasks.find(t=>t.id==='normal-web').status,'failed');
  const second=recoverFixedFullWebTransportFailures(first.queue);
  assert.equal(second.recovered,0);
});

test('protected or paid autonomous work remains ineligible', () => {
  let queue=createVibeContinuousQueue();
  queue=add(queue,'protected','protected','unity',{protectedChange:true});
  queue=add(queue,'paid','paid','unreal',{paidResourceRequired:true});
  const next=selectVibeQueueBatch(queue);
  assert.equal(next.hasEligibleWork,false);
  assert.equal(next.blocked.length,2);
});

test('twenty independent tasks can fill all 20 slots', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});
  for(let i=0;i<20;i++) queue=add(queue,`t-${i}`,`g-${i}`,'web',{responsibleFiles:[`f-${i}.js`]});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:20});
  assert.equal(reserved.tasks.length,20);
  assert.equal(reserved.selection.effectiveMaxConcurrentTasks,20);
});

test('Gemini quota wait releases worker capacity while preserving source lock', () => {
  const queue=createVibeContinuousQueue({maxConcurrentTasks:2,tasks:[
    {id:'quota-wait',gameId:'game-a',target:'web',sourceRoot:'web-games/game-a',goal:'model-bound review',status:'running',blocker:'WAITING_FOR_GEMINI_QUOTA',responsibleFiles:['shared.js']},
    {id:'same-root',gameId:'game-a',target:'web',sourceRoot:'web-games/game-a',goal:'same root work',status:'queued',responsibleFiles:['shared.js']},
    {id:'independent',gameId:'game-b',target:'web',sourceRoot:'web-games/game-b',goal:'independent implementation',status:'queued',responsibleFiles:['game.js']}
  ]});
  const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:2});
  assert.equal(batch.capacityRunning.length,0);
  assert.deepEqual(batch.quotaWaiting.map(task=>task.id),['quota-wait']);
  assert.equal(batch.freeSlots,2);
  assert.equal(batch.selected.some(task=>task.id==='same-root'),false);
  assert.equal(batch.selected.some(task=>task.id==='independent'),true);
  const summary=createVibeContinuousQueue(batch.selected.length?queue:queue);
  assert.equal(summary.tasks.length,3);
});

test('awaiting QA backpressure does not consume worker slots twice', () => {
  const awaiting=Array.from({length:8},(_,i)=>({
    id:`await-${i}`,gameId:`await-${i}`,target:'web',sourceRoot:`web-games/await-${i}`,goal:'await',
    status:'running',blocker:'candidate-awaiting-qa-and-deployment'
  }));
  const queued=Array.from({length:10},(_,i)=>({
    id:`next-${i}`,gameId:`next-${i}`,target:'web',sourceRoot:`web-games/next-${i}`,goal:'next',status:'queued'
  }));
  const queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[...awaiting,...queued]});
  const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:20});
  assert.equal(batch.effectiveMaxConcurrentTasks,4);
  assert.equal(batch.running.length,8);
  assert.equal(batch.capacityRunning.length,0);
  assert.equal(batch.awaitingQa.length,8);
  assert.equal(batch.freeSlots,4);
  assert.equal(batch.selected.length,4);
});

test('per-run request cannot exceed persisted queue cap', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:6,tasks:[]});
  for(let i=0;i<10;i++) queue=add(queue,`cap-${i}`,`cap-${i}`,'web',{responsibleFiles:[`cap-${i}.js`]});
  const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:20});
  assert.equal(batch.persistentMaxConcurrentTasks,6);
  assert.equal(batch.requestedMaxConcurrentTasks,20);
  assert.equal(batch.effectiveMaxConcurrentTasks,6);
  assert.equal(batch.selected.length,6);
});

test('terminal historical failures do not permanently throttle new work', () => {
  const failed=Array.from({length:8},(_,i)=>({
    id:`failed-${i}`,gameId:`failed-${i}`,target:'web',sourceRoot:`web-games/failed-${i}`,goal:'failed',
    status:'failed',lastOutcome:'FAIL',retries:3,maxRetries:2,blocker:'retry-limit-exceeded'
  }));
  const queued=Array.from({length:20},(_,i)=>({
    id:`fresh-${i}`,gameId:`fresh-${i}`,target:'web',sourceRoot:`web-games/fresh-${i}`,goal:'fresh',status:'queued'
  }));
  const queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[...failed,...queued]});
  const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:20});
  assert.equal(batch.backpressure.retryPressureCount,0);
  assert.equal(batch.effectiveMaxConcurrentTasks,20);
  assert.equal(batch.selected.length,20);
});


test('work package metadata survives queue normalization and larger functional package wins same-tier scheduling', () => {
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {id:'tiny',gameId:'a',target:'web',goal:'tiny',sourceRoot:'web-games/a',responsibleFiles:['a.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'p-tiny',taskWorkUnits:1,packageWorkUnits:1,packageSize:1},
    {id:'feature',gameId:'b',target:'web',goal:'feature',sourceRoot:'web-games/b',responsibleFiles:['b.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'p-feature',packageGoal:'finish feature',packageRole:'implementation-owner',taskWorkUnits:3,packageWorkUnits:6,packageSize:2,packageLongWorkProtected:true,completionCriteria:['functional-scope-implemented'],packageContext:{explorationMode:'planner-precomputed-shared-context',sharedPreparation:true,sourceRoot:'web-games/b',responsibleFiles:['b.js']}}
  ]});
  const selection=selectVibeQueueBatch(queue,{maxConcurrentTasks:1});
  assert.equal(selection.selected[0].id,'feature');
  assert.equal(selection.selected[0].packageId,'p-feature');
  assert.equal(selection.selected[0].packageContext.sharedPreparation,true);
  assert.deepEqual([...selection.selected[0].completionCriteria],['functional-scope-implemented']);
});


test('practice-only PASS settles done without candidate QA promotion', () => {
  let queue=createVibeContinuousQueue({tasks:[{
    id:'practice',target:'web',department:'development',type:'research',goal:'[VIBE_LEARNING_PRACTICE] save',
    status:'running',priority:'low',releaseState:'other',evidence:['learning-practice-only','production-pass:NO']
  }]});
  const merged=mergeVibeWorkerResults(queue,[{
    taskId:'practice',variant:'primary',outcome:'PASS',blocker:'learning-practice-complete',
    evidence:['learning-practice-only','production-pass:NO','source-write:NO']
  }]);
  const task=merged.queue.tasks.find(t=>t.id==='practice');
  assert.equal(task.status,'done');
  assert.equal(task.lastOutcome,'PASS');
  assert.ok(task.evidence.includes('production-pass:NO'));
  assert.equal(merged.applied[0].outcome,'DONE_PRACTICE');
});
