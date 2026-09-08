// 파일명: qa/vibe2-queue-control.test.mjs
// 역할: Vibe2 영속 큐의 사용자/출시 우선순위, 단일 예약, QA대기, 재시도 상한을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueVibeTask, reserveNextVibeTask, markVibeTaskAwaiting, settleVibeTask } from '../tools/vibe2-queue-control.mjs';
import { createVibeContinuousQueue, selectNextVibeQueueTask } from '../assets/vibe-continuous-queue.js';

test('owner directive preempts release and development work', () => {
  let queue = createVibeContinuousQueue();
  queue = enqueueVibeTask(queue, { id:'dev', target:'unity', goal:'개발확정', releaseState:'development-confirmed' });
  queue = enqueueVibeTask(queue, { id:'release', target:'web', goal:'출시확정', releaseState:'release-confirmed' });
  queue = enqueueVibeTask(queue, { id:'owner', target:'unity', goal:'사용자 즉시 수정', ownerDirective:true });
  assert.equal(reserveNextVibeTask(queue).task.id, 'owner');
});

test('release-confirmed preempts development-confirmed', () => {
  let queue = createVibeContinuousQueue();
  queue = enqueueVibeTask(queue, { id:'dev', target:'unity', goal:'개발확정', priority:'critical', releaseState:'development-confirmed' });
  queue = enqueueVibeTask(queue, { id:'release', target:'web', goal:'출시확정', priority:'normal', releaseState:'release-confirmed' });
  assert.equal(reserveNextVibeTask(queue).task.id, 'release');
});

test('awaiting QA stays running and prevents next task', () => {
  let queue = createVibeContinuousQueue();
  queue = enqueueVibeTask(queue, { id:'first', target:'unity', goal:'첫 작업' });
  queue = enqueueVibeTask(queue, { id:'second', target:'unity', goal:'둘째 작업' });
  const reserved = reserveNextVibeTask(queue);
  queue = markVibeTaskAwaiting(reserved.queue, { taskId:'first', blocker:'candidate-awaiting-engine-qa', evidence:['vibe2/candidate/first-1'] });
  assert.equal(queue.tasks.find((task) => task.id === 'first').status, 'running');
  const next = selectNextVibeQueueTask(queue);
  assert.equal(next.hasEligibleWork, false);
  assert.equal(next.stopReason, 'RUNNING_TASK_EXISTS');
});

test('PASS releases serial queue to next item', () => {
  let queue = createVibeContinuousQueue();
  queue = enqueueVibeTask(queue, { id:'first', target:'unity', goal:'첫 작업' });
  queue = enqueueVibeTask(queue, { id:'second', target:'unity', goal:'둘째 작업' });
  queue = reserveNextVibeTask(queue).queue;
  const done = settleVibeTask(queue, { taskId:'first', outcome:'PASS', evidence:['qa-pass'] });
  assert.equal(done.next.selected.id, 'second');
});

test('retryable failure clears blocker and remains selectable until retry limit', () => {
  let queue = enqueueVibeTask(createVibeContinuousQueue(), { id:'retry', target:'unity', goal:'재시도 작업', maxRetries:1 });
  let reserved = reserveNextVibeTask(queue);
  let failed = settleVibeTask(reserved.queue, { taskId:'retry', outcome:'FAIL', evidence:['fail-1'], blocker:'source-candidate-generation-failed' });
  assert.equal(failed.queue.tasks[0].status, 'queued');
  assert.equal(failed.queue.tasks[0].blocker, null);
  assert.equal(selectNextVibeQueueTask(failed.queue).selected.id, 'retry');
  reserved = reserveNextVibeTask(failed.queue);
  failed = settleVibeTask(reserved.queue, { taskId:'retry', outcome:'FAIL', evidence:['fail-2'], blocker:'source-candidate-generation-failed' });
  assert.equal(failed.queue.tasks[0].status, 'failed');
  assert.equal(failed.queue.tasks[0].blocker, 'source-candidate-generation-failed');
});

test('protected or paid autonomous work remains ineligible', () => {
  let queue = createVibeContinuousQueue();
  queue = enqueueVibeTask(queue, { id:'protected', target:'unity', goal:'핵심 변경', protectedChange:true });
  queue = enqueueVibeTask(queue, { id:'paid', target:'unreal', goal:'유료 작업', paidResourceRequired:true });
  const next = selectNextVibeQueueTask(queue);
  assert.equal(next.hasEligibleWork, false);
  assert.equal(next.blocked.length, 2);
});
