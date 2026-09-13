// 파일명: qa/vibe2-queue-control.test.mjs
// 역할: DAG/shard/source-lock/work-stealing/backpressure/speculative fan-in 큐 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueueVibeTask,
  reserveNextVibeTask,
  reserveVibeTaskBatch,
  markVibeTaskAwaiting,
  settleVibeTask,
  applyVibeFanInResults,
  recoverFixedFullWebTransportFailures
} from '../tools/vibe2-queue-control.mjs';
import { createVibeContinuousQueue, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';

function add(queue, id, gameId, target='unity', extra={}) {
  return enqueueVibeTask(queue,{ id, gameId, target, goal:`${id} 작업`, sourceRoot:`${target}-games/${gameId}`, ...extra });
}

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
  assert.equal(reserved.selection.workStealingUsed,true);
});

test('same source root remains exclusive even when files differ', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'a','same','web',{responsibleFiles:['web-games/same/a.js']});
  queue=add(queue,'b','same','web',{responsibleFiles:['web-games/same/b.js']});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.equal(reserved.tasks.length,1);
  assert.ok(reserved.selection.deferredConflicts.some(row=>row.task.id==='b'&&row.reason==='source-root-conflict'));
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

test('dynamic backpressure reduces concurrency when QA backlog grows', () => {
  const tasks=['a','b','c'].map(id=>({id,gameId:id,target:'web',sourceRoot:`web-games/${id}`,goal:id,status:'running',blocker:'candidate-awaiting-qa-and-deployment'}));
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks});
  queue=add(queue,'new','new','web');
  const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:4});
  assert.equal(batch.effectiveMaxConcurrentTasks,2);
  assert.equal(batch.freeSlots,0);
  assert.equal(batch.stopReason,'PARALLEL_CAPACITY_FULL');
});

test('high-risk opt-in task creates two speculative worker variants', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'risky','risky','web',{estimatedRisk:'high',speculativeEligible:true});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.equal(reserved.matrix[0].speculativeVariants,2);
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
