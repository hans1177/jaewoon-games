// 파일명: qa/vibe2-weight-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDataset, computeLearningMetrics, evaluateAdapter, isVerifiedPass } from '../tools/vibe2-weight-learning.mjs';

function verified(overrides = {}) {
  return {
    instruction: '버그를 수정해',
    input: '재현 조건',
    output: '검증된 수정 결과',
    sourceCommit: 'abc123',
    independentQa: 'PASS',
    browserQa: 'PASS',
    ...overrides,
  };
}

test('검증 PASS 두 종류를 모두 만족해야 학습 가능하다', () => {
  assert.equal(isVerifiedPass(verified()), true);
  assert.equal(isVerifiedPass(verified({ browserQa: 'FAIL' })), false);
  assert.equal(isVerifiedPass(verified({ independentQa: 'FAIL' })), false);
});

test('dataset은 미검증/불완전 샘플을 제외하고 결정론적으로 분할한다', () => {
  const rows = [
    verified({ sourceCommit: 'a1', instruction: 'A', output: 'OA' }),
    verified({ sourceCommit: 'b2', instruction: 'B', output: 'OB' }),
    verified({ sourceCommit: 'c3', instruction: 'C', output: 'OC' }),
    verified({ sourceCommit: 'd4', instruction: 'D', output: 'OD' }),
    verified({ sourceCommit: 'e5', instruction: 'E', output: 'OE' }),
    verified({ sourceCommit: 'bad', instruction: 'FAIL', output: 'X', browserQa: 'FAIL' }),
    verified({ sourceCommit: 'missing', instruction: 'NO_OUTPUT', output: '' }),
  ].map((record, index) => ({ record, sourceFile: 'fixture.jsonl', index }));
  const first = buildDataset(rows, { seed: 42, evalRatio: 0.4 });
  const second = buildDataset(rows, { seed: 42, evalRatio: 0.4 });
  assert.deepEqual(first, second);
  assert.equal(first.stats.accepted, 5);
  assert.equal(first.stats.skippedUnverified, 1);
  assert.equal(first.stats.skippedIncomplete, 1);
  assert.ok(first.train.length > 0);
  assert.ok(first.eval.length > 0);
  for (const sample of [...first.train, ...first.eval]) {
    assert.equal(sample.qa.independentQa, 'PASS');
    assert.equal(sample.qa.browserQa, 'PASS');
    assert.ok(sample.provenance.sourceRevision);
  }
});

test('teacher 샘플도 QA PASS와 provenance 없이는 들어오지 않는다', () => {
  const rows = [
    { record: verified({ teacher: true, sourceKind: 'teacher', sourceCommit: 'teacher-pass' }), sourceFile: 'teacher.jsonl', index: 0 },
    { record: verified({ teacher: true, sourceKind: 'teacher', sourceCommit: '', candidateCommit: '', sourceRevision: '' }), sourceFile: 'teacher.jsonl', index: 1 },
    { record: verified({ teacher: true, sourceKind: 'teacher', sourceCommit: 'teacher-fail', independentQa: 'FAIL' }), sourceFile: 'teacher.jsonl', index: 2 },
  ];
  const result = buildDataset(rows, { seed: 7, evalRatio: 0.5 });
  assert.equal(result.stats.accepted, 1);
  assert.equal(result.stats.skippedIncomplete, 1);
  assert.equal(result.stats.skippedUnverified, 1);
  assert.equal([...result.train, ...result.eval][0].provenance.sourceKind, 'teacher');
});

test('학습 성능 지표를 일관되게 계산한다', () => {
  const metrics = computeLearningMetrics([
    { success: true, firstAttemptQaPass: true, sameErrorRecurred: false, fixIterations: 0, ruleCompliant: true },
    { success: true, firstAttemptQaPass: false, sameErrorRecurred: false, fixIterations: 1, ruleCompliant: true },
    { success: false, firstAttemptQaPass: false, sameErrorRecurred: true, fixIterations: 2, ruleCompliant: false },
  ]);
  assert.equal(metrics.successRate, 2 / 3);
  assert.equal(metrics.firstAttemptQaPassRate, 1 / 3);
  assert.equal(metrics.repeatedErrorRecurrenceRate, 1 / 3);
  assert.equal(metrics.averageFixIterations, 1);
  assert.equal(metrics.ruleComplianceRate, 2 / 3);
});

test('adapter는 무회귀와 최소 평균 향상을 동시에 만족해야 승격한다', () => {
  const baseline = {
    successRate: 0.7,
    firstAttemptQaPassRate: 0.6,
    repeatedErrorRecurrenceRate: 0.2,
    averageFixIterations: 1.2,
    ruleComplianceRate: 0.8,
  };
  const good = evaluateAdapter(baseline, {
    successRate: 0.8,
    firstAttemptQaPassRate: 0.7,
    repeatedErrorRecurrenceRate: 0.1,
    averageFixIterations: 1.0,
    ruleComplianceRate: 0.9,
  });
  assert.equal(good.verdict, 'PROMOTE');
  assert.deepEqual(good.regressions, []);

  const regressed = evaluateAdapter(baseline, {
    successRate: 0.85,
    firstAttemptQaPassRate: 0.75,
    repeatedErrorRecurrenceRate: 0.1,
    averageFixIterations: 1.0,
    ruleComplianceRate: 0.79,
  });
  assert.equal(regressed.verdict, 'REJECT');
  assert.ok(regressed.regressions.includes('ruleComplianceRate'));
});
