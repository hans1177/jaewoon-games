// 파일명: qa/vibe2-distillation-status.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDistillationStatus } from '../tools/vibe2-distillation-status.mjs';

function entry(record, index) {
  return { record, sourceFile: `fixture-${index}.json`, index };
}

function verifiedSample({ project, index, taskType = 'bugfix' }) {
  return {
    instruction: `고유 ${taskType} 작업 ${project} ${index}`,
    input: `재현 입력 ${project} ${index}`,
    output: `검증된 수정 결과 ${project} ${index}`,
    sourceCommit: `${project}-${taskType}-${index}`,
    project,
    taskType,
    difficulty: taskType === 'unity' ? 'unity-build' : 'bug',
    independentQa: 'PASS',
    browserQa: 'PASS',
    quality: {
      codeQuality: 1,
      noRegression: true,
      playImprovement: 1,
      ruleCompliance: 1,
    },
  };
}

test('성공 근거만 있고 학습 텍스트가 없으면 학습 준비로 보지 않는다', () => {
  const records = Array.from({ length: 20 }, (_, index) => entry({
    id: `evidence-${index}`,
    gameId: 'P0009',
    outcome: 'SUCCESS',
    sourceRevision: `sha-${index}`,
    independentQa: 'PASS',
    verified: true,
  }, index));

  const status = buildDistillationStatus(records);
  assert.equal(status.state, 'WAITING_FOR_VERIFIED_SAMPLES');
  assert.equal(status.readyTasks.length, 0);
  assert.equal(status.diagnostics.evidenceOnlyRecords, 20);
  assert.equal(status.diagnostics.fullyVerifiedTextSamples, 0);
});

test('두 프로젝트의 충분한 검증 샘플이 쌓이면 해당 작업 어댑터만 준비된다', () => {
  const records = [];
  for (const project of ['P0001', 'P0002']) {
    for (let index = 0; index < 80; index += 1) {
      records.push(entry(verifiedSample({ project, index, taskType: 'bugfix' }), records.length));
    }
  }

  const status = buildDistillationStatus(records, {
    minTrainSamples: 24,
    minFreshTrainSamples: 12,
    minDistinctProjects: 2,
    maxProjectShare: 0.75,
    taskPlanMinSamples: 8,
    taskPlanMinProjects: 2,
  });

  assert.equal(status.tasks.bugfix.ready, true);
  assert.equal(status.tasks.bugfix.state, 'READY_FOR_LOCAL_TRAINING');
  assert.equal(status.tasks.bugfix.distinctProjects, 2);
  assert.equal(status.tasks.coding.ready, false);
  assert.ok(status.readyTasks.includes('bugfix'));
});

test('브라우저 QA가 빠진 텍스트 샘플은 진짜 학습 데이터로 세지 않는다', () => {
  const records = [entry({
    ...verifiedSample({ project: 'P0001', index: 1 }),
    browserQa: 'FAIL',
  }, 0)];
  const status = buildDistillationStatus(records, {
    minTrainSamples: 1,
    minFreshTrainSamples: 1,
    minDistinctProjects: 1,
    maxProjectShare: 1,
    taskPlanMinSamples: 1,
    taskPlanMinProjects: 1,
  });

  assert.equal(status.diagnostics.textSamples, 1);
  assert.equal(status.diagnostics.fullyVerifiedTextSamples, 0);
  assert.equal(status.tasks.bugfix.ready, false);
  assert.equal(status.tasks.bugfix.skippedUnverified, 1);
});

test('검증된 외부 Android black-box QA 샘플은 브라우저 QA를 위조하지 않고 학습 데이터로 인정한다', () => {
  const record = {
    version: 3,
    instruction: '외부 Android 런타임을 단계별 black-box 증거로 검증한다',
    input: 'APP_LAUNCH -> GAME_ENTRY -> INPUT_EXERCISE -> PROCESS_SURVIVAL',
    output: '관찰된 범위만 학습하고 proprietary code/assets/internal algorithm은 추출하지 않는다',
    taskType: 'qa',
    difficulty: 'regression',
    lifecycle: 'active',
    sourceKind: 'external-black-box',
    project: 'external-game',
    gameId: 'external-game',
    sourceRevision: 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    independentQa: 'BLACK_BOX_EVIDENCE_PASS',
    browserQa: 'NOT_APPLICABLE',
    quality: { codeQuality: 1, noRegression: true, playImprovement: 0, ruleCompliance: 1 },
    provenance: { sourceKind: 'external-black-box', sourceRevision: 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' },
    verification: { runtime: 'PASS', blackBoxEvidence: 'PASS', proprietaryExtraction: false },
  };
  const status = buildDistillationStatus([entry(record, 0)], {
    minTrainSamples: 1,
    minFreshTrainSamples: 0,
    minDistinctProjects: 1,
    maxProjectShare: 1,
    taskPlanMinSamples: 1,
    taskPlanMinProjects: 1,
  });
  assert.equal(status.diagnostics.textSamples, 1);
  assert.equal(status.diagnostics.fullyVerifiedTextSamples, 1);
  assert.equal(status.tasks.qa.accepted, 1);
  assert.equal(status.tasks.qa.skippedUnverified, 0);
});
