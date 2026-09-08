// 파일명: qa/vibe2-queue-control.test.mjs
// 역할: Vibe2 영속 큐의 사용자 우선순위, 예약, 보류, 재시도 상한을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueueVibeTask,
  reserveNextVibeTask,
  settleVibeTask
} from '../tools/vibe2-queue-control.mjs';
import { createVibeContinuousQueue, selectNextVibeQueueTask } from '../assets/vibe-continuous-queue.js';

test('owner directive preempts normal queued work', () => {
  let queue = createVibeContinuousQueue();
  queue = enqueueVibeTask(queue, { id: 'normal', target: 'unity', goal: '일반 개선' });
  queue = enqueueVibeTask(queue, { id: 'owner', target: 'unreal', goal: '사용자 즉시 수정', ownerDirective: true });
  const reserved = reserveNextVibeTask(queue);
  assert.equal(reserved.reserved, true);
  assert.equal(reserved.task.id, 'owner');
  assert.equal(reserved.task.status, 'running');
});

test('blocked candidate does not prevent next independent task', () => {
  let queue = createVibeContinuousQueue();
  queue = enqueueVibeTask(queue, { id: 'first', target: 'unity', goal: '첫 작업' });
  queue = enqueueVibeTask(queue, { id: 'second', target: 'unity', goal: '둘째 작업' });
  const reserved = reserveNextVibeTask(queue);
  const blocked = settleVibeTask(reserved.queue, {
    taskId: 'first',
    outcome: 'BLOCKED',
    blocker: 'candidate-awaiting-qa',
    evidence: ['vibe2/candidate/first-1']
  });
  const next = selectNextVibeQueueTask(blocked.queue);
  assert.equal(next.selected.id, 'second');
});

test('failed task retries only within configured limit', () => {
  let queue = createVibeContinuousQueue();
  queue = enqueueVibeTask(queue, { id: 'retry', target: 'unity', goal: '재시도 작업', maxRetries: 1 });
  let reserved = reserveNextVibeTask(queue);
  let failed = settleVibeTask(reserved.queue, { taskId: 'retry', outcome: 'FAIL', evidence: ['fail-1'] });
  assert.equal(failed.queue.tasks[0].status, 'queued');
  assert.equal(failed.queue.tasks[0].retries, 1);
  reserved = reserveNextVibeTask(failed.queue);
  failed = settleVibeTask(reserved.queue, { taskId: 'retry', outcome: 'FAIL', evidence: ['fail-2'] });
  assert.equal(failed.queue.tasks[0].status, 'failed');
  assert.equal(failed.queue.tasks[0].retries, 2);
});

test('protected or paid autonomous work remains ineligible', () => {
  let queue = createVibeContinuousQueue();
  queue = enqueueVibeTask(queue, { id: 'protected', target: 'unity', goal: '핵심 변경', protectedChange: true });
  queue = enqueueVibeTask(queue, { id: 'paid', target: 'unreal', goal: '유료 작업', paidResourceRequired: true });
  const next = selectNextVibeQueueTask(queue);
  assert.equal(next.hasEligibleWork, false);
  assert.equal(next.blocked.length, 2);
});
