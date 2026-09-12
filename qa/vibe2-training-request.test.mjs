// 파일명: qa/vibe2-training-request.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrainingRequest } from '../tools/vibe2-training-request.mjs';

function status(overrides = {}) {
  return {
    policy: {
      minTrainSamples: 24,
      minFreshTrainSamples: 12,
      minDistinctProjects: 2,
      maxProjectShare: 0.75,
      syntheticRatioCap: 0.5,
    },
    readyTasks: [],
    state: 'WAITING_FOR_VERIFIED_SAMPLES',
    sourceFiles: ['a.json', 'b.json'],
    tasks: {
      coding: {
        ready: false,
        accepted: 8,
        train: 6,
        eval: 1,
        holdout: 1,
        distinctProjects: 1,
        batchingPass: false,
        diversityPass: false,
        contaminationPass: true,
        taskPlanReady: false,
      },
    },
    ...overrides,
  };
}

test('학습 준비 전에는 self-hosted 학습 요청을 만들지 않는다', () => {
  const request = buildTrainingRequest(status());
  assert.equal(request.version, 2);
  assert.equal(request.state, 'WAITING_FOR_VERIFIED_SAMPLES');
  assert.equal(request.requests.length, 0);
  assert.equal(request.execution.route, 'CANONICAL_SELF_HOSTED');
  assert.equal(request.execution.preferredBackend, 'SERVER_SELF_HOSTED');
  assert.deepEqual(request.execution.allowedBackends, ['SERVER_SELF_HOSTED', 'LOCAL_SELF_HOSTED']);
  assert.equal(request.execution.localBackendPreserved, true);
  assert.equal(request.execution.continuousMode, '24H');
  assert.equal(request.execution.refreshCadence, 'HOURLY');
  assert.equal(request.execution.githubHostedTrainingAllowed, false);
  assert.equal(request.execution.paidApiAllowed, false);
  assert.ok(request.blockedTasks.coding.blockers.includes('INSUFFICIENT_PROJECT_DIVERSITY'));
});

test('준비된 작업만 서버 우선 canonical dataset/trainer 요청으로 만든다', () => {
  const readyCoding = {
    ready: true,
    accepted: 40,
    train: 28,
    eval: 6,
    holdout: 6,
    distinctProjects: 3,
    batchingPass: true,
    diversityPass: true,
    contaminationPass: true,
    taskPlanReady: true,
  };
  const request = buildTrainingRequest(status({
    readyTasks: ['coding'],
    state: 'READY_TASKS_AVAILABLE',
    tasks: { coding: readyCoding },
  }));
  assert.equal(request.state, 'READY_FOR_SELF_HOSTED_TRAINING');
  assert.equal(request.execution.preferredBackend, 'SERVER_SELF_HOSTED');
  assert.equal(request.execution.localBackendPreserved, true);
  assert.equal(request.requests.length, 1);
  assert.equal(request.requests[0].taskType, 'coding');
  assert.ok(request.requests[0].datasetCommand.includes('--task-type'));
  assert.ok(request.requests[0].datasetCommand.includes('coding'));
  assert.ok(request.requests[0].trainerCommand.includes('tools/vibe2-train.py'));
  assert.deepEqual(request.requests[0].promotionGates, ['FIXED_HOLDOUT_AB', 'CANARY', 'NO_REGRESSION', 'RULE_COMPLIANCE']);
});

test('같은 상태에서는 requestId가 결정론적으로 동일하다', () => {
  assert.equal(buildTrainingRequest(status()).requestId, buildTrainingRequest(status()).requestId);
});
