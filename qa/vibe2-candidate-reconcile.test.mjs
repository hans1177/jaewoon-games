// 파일명: qa/vibe2-candidate-reconcile.test.mjs
// 역할: 엔진 검증 성공/실패가 Vibe2 큐에 안전하게 반영되는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createVibeContinuousQueue } from '../assets/vibe-continuous-queue.js';
import { reconcileVibeCandidateVerification } from '../tools/vibe2-candidate-reconcile.mjs';

function blockedCandidate({ retries = 0, maxRetries = 2 } = {}) {
  return createVibeContinuousQueue([
    {
      id: 'task-a',
      gameId: 'daechung-rpg',
      target: 'unity',
      goal: '후보 수정',
      status: 'blocked',
      blocker: 'candidate-awaiting-engine-qa',
      evidence: ['vibe2/candidate/task-a-100'],
      retries,
      maxRetries
    },
    {
      id: 'task-b',
      gameId: 'other',
      target: 'unity',
      goal: '독립 작업',
      status: 'queued'
    }
  ]);
}

test('successful Unity verification stays blocked awaiting review and never auto-passes', () => {
  const result = reconcileVibeCandidateVerification(blockedCandidate(), {
    candidateBranch: 'vibe2/candidate/task-a-100',
    target: 'unity',
    conclusion: 'success',
    runId: '200',
    headSha: 'abc123'
  });
  assert.equal(result.updated, true);
  assert.equal(result.verificationPassed, true);
  assert.equal(result.finalPass, false);
  assert.equal(result.promotionAllowed, false);
  assert.equal(result.learningEligible, false);
  const task = result.queue.tasks.find((item) => item.id === 'task-a');
  assert.equal(task.status, 'blocked');
  assert.equal(task.blocker, 'candidate-unity-verification-passed-awaiting-review');
  assert(task.evidence.includes('unity-verification-run:200'));
  assert.equal(result.next.selected.id, 'task-b');
});

test('failed engine verification retries within task limit', () => {
  const result = reconcileVibeCandidateVerification(blockedCandidate({ retries: 0, maxRetries: 1 }), {
    candidateBranch: 'vibe2/candidate/task-a-100',
    target: 'unity',
    conclusion: 'failure',
    runId: '201'
  });
  const task = result.queue.tasks.find((item) => item.id === 'task-a');
  assert.equal(result.verificationPassed, false);
  assert.equal(result.finalPass, false);
  assert.equal(task.status, 'queued');
  assert.equal(task.retries, 1);
});

test('failed verification stops retry after configured cap', () => {
  const result = reconcileVibeCandidateVerification(blockedCandidate({ retries: 1, maxRetries: 1 }), {
    candidateBranch: 'vibe2/candidate/task-a-100',
    target: 'unity',
    conclusion: 'failure',
    runId: '202'
  });
  const task = result.queue.tasks.find((item) => item.id === 'task-a');
  assert.equal(task.status, 'failed');
  assert.equal(task.retries, 2);
});

test('cancelled or incomplete verification remains blocked', () => {
  const result = reconcileVibeCandidateVerification(blockedCandidate(), {
    candidateBranch: 'vibe2/candidate/task-a-100',
    target: 'unity',
    conclusion: 'cancelled',
    runId: '203'
  });
  const task = result.queue.tasks.find((item) => item.id === 'task-a');
  assert.equal(task.status, 'blocked');
  assert.equal(task.blocker, 'candidate-unity-verification-incomplete');
});

test('non Vibe2 candidate branch is ignored', () => {
  const queue = blockedCandidate();
  const result = reconcileVibeCandidateVerification(queue, {
    candidateBranch: 'feature/random',
    target: 'unity',
    conclusion: 'success'
  });
  assert.equal(result.updated, false);
  assert.equal(result.reason, 'not-vibe2-candidate');
});
