// 파일명: qa/vibe2-weight-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDataset,
  buildTaskTrainingPlan,
  classifyFailure,
  computeLearningMetrics,
  detectContamination,
  evaluateAdapter,
  isTeacherEligible,
  isVerifiedPass,
  qualityScore,
  routeAdapter,
  shouldAbortTraining,
  summarizeDiversity,
  TASK_TYPES,
} from '../tools/vibe2-weight-learning.mjs';

function verified(overrides = {}) {
  return {
    instruction: '버그를 수정해',
    input: '재현 조건',
    output: '검증된 수정 결과',
    sourceCommit: 'abc123',
    independentQa: 'PASS',
    browserQa: 'PASS',
    quality: { codeQuality: 1, noRegression: true, playImprovement: 1, ruleCompliance: 1 },
    ...overrides,
  };
}

function rows(count = 20, project = 'P0001', taskType = 'bugfix') {
  return Array.from({ length: count }, (_, index) => ({
    record: verified({
      sourceCommit: `${project}-${index}`,
      project,
      taskType,
      difficulty: 'bug',
      instruction: `작업 ${project} ${index}`,
      input: `입력 ${index}`,
      output: `고유 결과 ${project} ${index}`,
    }),
    sourceFile: 'fixture.jsonl',
    index,
  }));
}

test('검증 PASS 두 종류를 모두 만족해야 학습 가능하다', () => {
  assert.equal(isVerifiedPass(verified()), true);
  assert.equal(isVerifiedPass(verified({ browserQa: 'FAIL' })), false);
});

test('품질 점수와 lifecycle이 학습 데이터 승격을 막는다', () => {
  const data = buildDataset([
    ...rows(20),
    { record: verified({ sourceCommit: 'low', instruction: '낮은 품질', quality: { codeQuality: 0, noRegression: false, playImprovement: 0, ruleCompliance: 0 } }), sourceFile: 'fixture.jsonl', index: 20 },
    { record: verified({ sourceCommit: 'old', instruction: '폐기 규칙', lifecycle: 'obsolete' }), sourceFile: 'fixture.jsonl', index: 21 },
  ], { seed: 42, evalRatio: 0.2, holdoutRatio: 0.2, minTrainSamples: 1 });
  assert.equal(qualityScore(verified()), 1);
  assert.equal(data.stats.skippedQuality, 1);
  assert.equal(data.stats.skippedLifecycle, 1);
  assert.equal(data.stats.deprecatedUsed, false);
  assert.ok(data.train.length && data.eval.length && data.holdout.length);
});

test('train/eval/holdout은 근접 중복 오염을 검출한다', () => {
  const sample = { sampleId: 'a', contentHash: 'same', instruction: 'A', input: '', output: 'B' };
  const result = detectContamination({ train: [sample], eval: [{ ...sample, sampleId: 'b' }], holdout: [] });
  assert.equal(result.pass, false);
});

test('teacher 샘플은 어려운 작업에만 허용한다', () => {
  assert.equal(isTeacherEligible(verified({ teacher: true, sourceKind: 'teacher', taskType: 'bugfix', difficulty: 'bug' })), true);
  assert.equal(isTeacherEligible(verified({ teacher: true, sourceKind: 'teacher', taskType: 'coding', difficulty: 'simple' })), false);
  const data = buildDataset([
    ...rows(20),
    { record: verified({ teacher: true, sourceKind: 'teacher', taskType: 'coding', difficulty: 'simple', sourceCommit: 'teacher-simple', instruction: '간단 코드' }), sourceFile: 'teacher.jsonl', index: 21 },
  ], { seed: 42, evalRatio: 0.2, holdoutRatio: 0.2, minTrainSamples: 1 });
  assert.equal(data.stats.skippedTeacherSimple, 1);
});

test('합성 데이터만 있는 self-training을 차단한다', () => {
  const synthetic = rows(24).map((item) => ({
    ...item,
    record: { ...item.record, sourceKind: 'teacher', teacher: true, difficulty: 'bug' },
  }));
  const data = buildDataset(synthetic, { seed: 7, evalRatio: 0.2, holdoutRatio: 0.2, minTrainSamples: 1, syntheticRatioCap: 0.5 });
  assert.equal(data.train.length, 0);
  assert.equal(data.readyForTraining, false);
});

test('다게임 다양성 부족은 실제 학습 준비를 막는다', () => {
  const oneGame = buildDataset(rows(36, 'P0001'), {
    seed: 12,
    evalRatio: 0.2,
    holdoutRatio: 0.2,
    minTrainSamples: 8,
    minFreshTrainSamples: 8,
    minDistinctProjects: 2,
    minDistinctTaskTypes: 1,
    maxProjectShare: 0.75,
    targetTaskType: 'bugfix',
  });
  assert.equal(oneGame.diversity.distinctProjects, 1);
  assert.equal(oneGame.diversity.pass, false);
  assert.equal(oneGame.readyForTraining, false);

  const multiGameRows = [...rows(24, 'P0001'), ...rows(24, 'P0002')];
  const multiGame = buildDataset(multiGameRows, {
    seed: 12,
    evalRatio: 0.2,
    holdoutRatio: 0.2,
    minTrainSamples: 8,
    minFreshTrainSamples: 8,
    minDistinctProjects: 2,
    minDistinctTaskTypes: 1,
    maxProjectShare: 0.75,
    targetTaskType: 'bugfix',
  });
  assert.equal(multiGame.diversity.distinctProjects, 2);
  assert.equal(multiGame.diversity.pass, true);
  assert.equal(multiGame.readyForTraining, true);
});

test('작업유형별 adapter 학습계획은 샘플수와 프로젝트 다양성을 함께 본다', () => {
  const samples = [
    ...buildDataset(rows(24, 'P0001', 'bugfix'), { seed: 3, evalRatio: 0.2, holdoutRatio: 0.2, minTrainSamples: 1 }).train,
    ...buildDataset(rows(24, 'P0002', 'bugfix'), { seed: 4, evalRatio: 0.2, holdoutRatio: 0.2, minTrainSamples: 1 }).train,
  ];
  const diversity = summarizeDiversity(samples);
  assert.equal(diversity.distinctProjects, 2);
  const plan = buildTaskTrainingPlan(samples, { minSamplesPerTask: 8, minProjectsPerTask: 2 });
  assert.equal(plan.bugfix.ready, true);
  assert.equal(plan.unity.ready, false);
  assert.equal(plan.roblox.ready, false);
  assert.equal(plan.fortnite_uefn.ready, false);
});

test('3개 플랫폼은 공통 학습기 안에서 독립 task lane과 adapter route를 가진다', () => {
  assert.ok(TASK_TYPES.includes('unity'));
  assert.ok(TASK_TYPES.includes('roblox'));
  assert.ok(TASK_TYPES.includes('fortnite_uefn'));

  const robloxRows = [
    ...rows(24, 'R0001', 'roblox').map((entry) => ({ ...entry, record: { ...entry.record, browserQa: 'NOT_APPLICABLE', runtime: 'PASS' } })),
    ...rows(24, 'R0002', 'roblox').map((entry) => ({ ...entry, record: { ...entry.record, browserQa: 'NOT_APPLICABLE', runtime: 'PASS' } })),
  ];
  const robloxDataset = buildDataset(robloxRows, {
    seed: 12, evalRatio: 0.2, holdoutRatio: 0.2, minTrainSamples: 8, minFreshTrainSamples: 8,
    minDistinctProjects: 2, minDistinctTaskTypes: 1, maxProjectShare: 0.75, targetTaskType: 'roblox', syntheticRatioCap: 0,
  });
  assert.equal(robloxDataset.readyForTraining, true);
  assert.equal(robloxDataset.train.every((row) => row.taskType === 'roblox'), true);

  const robloxRoute = routeAdapter({ taskType: 'roblox', goal: 'Roblox Luau release fix' }, { roblox: { status: 'PROMOTED', path: 'adapters/roblox-v2' } });
  const uefnRoute = routeAdapter({ taskType: 'fortnite_uefn', goal: 'UEFN Verse device fix' }, { fortnite_uefn: { status: 'CANARY', path: 'adapters/uefn-v2' } });
  assert.equal(robloxRoute.taskType, 'roblox'); assert.equal(robloxRoute.adapter, 'adapters/roblox-v2');
  assert.equal(uefnRoute.taskType, 'fortnite_uefn'); assert.equal(uefnRoute.adapter, 'adapters/uefn-v2');
});

test('adapter router는 신뢰도가 낮으면 baseline으로 fallback한다', () => {
  const weak = routeAdapter({ goal: '조금 개선' }, { general: { status: 'REJECTED', path: 'x' } });
  assert.equal(weak.fallback, true);
  assert.equal(weak.adapter, null);
  const strong = routeAdapter({ taskType: 'unity', goal: 'Unity Android build fix' }, { unity: { status: 'PROMOTED', path: 'adapters/unity-v2' } });
  assert.equal(strong.taskType, 'unity');
  assert.equal(strong.adapter, 'adapters/unity-v2');
});

test('실패 taxonomy는 주요 재발 유형을 고정한다', () => {
  assert.equal(classifyFailure('Gradle build failed'), 'BUILD');
  assert.equal(classifyFailure('localStorage save broken'), 'SAVE');
  assert.equal(classifyFailure('mobile UI overflow'), 'UI');
});

test('학습 성능 지표에 효율, 재시도, 표본수를 포함한다', () => {
  const metrics = computeLearningMetrics([
    { success: true, firstAttemptQaPass: true, sameErrorRecurred: false, fixIterations: 0, ruleCompliant: true, runtimeMs: 100, memoryMb: 100, retries: 0 },
    { success: false, firstAttemptQaPass: false, sameErrorRecurred: true, fixIterations: 2, ruleCompliant: false, runtimeMs: 300, memoryMb: 200, retries: 2 },
  ]);
  assert.equal(metrics.sampleCount, 2);
  assert.equal(metrics.successRate, 0.5);
  assert.equal(metrics.averageRuntimeMs, 200);
  assert.equal(metrics.averageRetries, 1);
});

test('adapter 승격은 A/B 표본과 canary가 모두 필요하다', () => {
  const baseline = { sampleCount: 20, successRate: 0.7, firstAttemptQaPassRate: 0.6, repeatedErrorRecurrenceRate: 0.2, averageFixIterations: 1.2, ruleComplianceRate: 0.8, averageRetries: 1, averageRuntimeMs: 100, averageMemoryMb: 100 };
  const candidate = { sampleCount: 20, successRate: 0.8, firstAttemptQaPassRate: 0.7, repeatedErrorRecurrenceRate: 0.1, averageFixIterations: 1, ruleComplianceRate: 0.9, averageRetries: 0.8, averageRuntimeMs: 110, averageMemoryMb: 110 };
  const canary = { samples: 10, minimumSamples: 10, regressions: 0, ruleCompliance: true, failureRate: 0, maxFailureRate: 0 };

  assert.equal(evaluateAdapter(baseline, candidate, { canary, minimumEvaluationSamples: 20 }).verdict, 'PROMOTE');
  const noCanary = evaluateAdapter(baseline, candidate, { minimumEvaluationSamples: 20 });
  assert.equal(noCanary.verdict, 'REJECT');
  assert.ok(noCanary.regressions.includes('canaryRequired'));

  const smallAb = evaluateAdapter({ ...baseline, sampleCount: 5 }, candidate, { canary, minimumEvaluationSamples: 20 });
  assert.equal(smallAb.verdict, 'REJECT');
  assert.ok(smallAb.regressions.includes('baselineSampleCount'));
});

test('canary 실패 시 baseline rollback을 요구한다', () => {
  const baseline = { sampleCount: 20, successRate: 0.7, firstAttemptQaPassRate: 0.6, repeatedErrorRecurrenceRate: 0.2, averageFixIterations: 1.2, ruleComplianceRate: 0.8, averageRetries: 1, averageRuntimeMs: 100, averageMemoryMb: 100 };
  const candidate = { sampleCount: 20, successRate: 0.8, firstAttemptQaPassRate: 0.7, repeatedErrorRecurrenceRate: 0.1, averageFixIterations: 1, ruleComplianceRate: 0.9, averageRetries: 0.8, averageRuntimeMs: 110, averageMemoryMb: 110 };
  const result = evaluateAdapter(baseline, candidate, {
    canary: { samples: 10, minimumSamples: 10, regressions: 1, ruleCompliance: true, failureRate: 0.1, maxFailureRate: 0 },
    minimumEvaluationSamples: 20,
  });
  assert.equal(result.verdict, 'REJECT');
  assert.equal(result.deploymentAction, 'ROLLBACK_TO_BASELINE');
  assert.equal(result.rollbackRequired, true);
});

test('학습 이상 신호는 중단과 rollback을 요구한다', () => {
  const result = shouldAbortTraining({ lossRatio: 2.5, evalDelta: -0.1, oom: true });
  assert.equal(result.abort, true);
  assert.equal(result.rollback, true);
  assert.ok(result.reasons.includes('OOM'));
});
