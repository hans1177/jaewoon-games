// 파일명: qa/vibe2-training-sample.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVerifiedTrainingSample, MAX_PATCH_BYTES, TRAINING_SAMPLE_VERSION } from '../tools/vibe2-training-sample.mjs';

function evidence(overrides = {}) {
  return {
    gameId: 'P0002',
    candidateId: 'P0002-test',
    sourcePath: 'web-games/insect-survival',
    role: 'development',
    goal: '거미 공격 데미지 오류를 수정한다',
    diagnosticFocus: { type: 'COMBAT_LOGIC', file: 'index.html', line: 10 },
    responsibilityFiles: ['index.html'],
    changedFiles: ['index.html'],
    summary: '거미 공격 계산을 원래 규칙으로 맞춤',
    expectedEffect: '전투 규칙 회귀 없이 올바른 피해 적용',
    saveKeyValidation: 'PASS',
    syntaxChecks: [{ name: 'syntax:index.html', status: 'PASS' }],
    ...overrides,
  };
}

test('검증된 실제 diff를 bugfix 학습 샘플로 만든다', () => {
  const sample = buildVerifiedTrainingSample({
    evidence: evidence(),
    patch: 'diff --git a/index.html b/index.html\n-old\n+new',
    sourceRevision: 'abc123',
    independentQa: 'PASS',
    browserQa: 'PASS',
    performance: { playerImpactScore: 0 },
  });
  assert.equal(sample.version, TRAINING_SAMPLE_VERSION);
  assert.equal(sample.taskType, 'bugfix');
  assert.equal(sample.difficulty, 'bug');
  assert.equal(sample.independentQa, 'PASS');
  assert.equal(sample.browserQa, 'PASS');
  assert.equal(sample.quality.playImprovement, 0);
  assert.equal(sample.quality.noRegression, true);
  assert.match(sample.output, /검증된 패치/);
  assert.match(sample.output, /\+new/);
  assert.equal(sample.provenance.sourceRevision, 'abc123');
});

test('role이 비어 있어도 실제 기능 구현 goal과 게임 코드 변경은 coding으로 분류한다', () => {
  const sample = buildVerifiedTrainingSample({
    evidence: evidence({
      role: '',
      diagnosticFocus: null,
      goal: '[FEATURE_DEVELOPMENT] 플레이 가능한 작은 기능 1개를 구현한다',
      summary: 'Integrated parallel department implementation',
    }),
    patch: 'diff --git a/index.html b/index.html\n-old\n+new',
    sourceRevision: 'def456',
  });
  assert.equal(sample.taskType, 'coding');
  assert.equal(sample.difficulty, 'simple');
});

test('Unity 게임 소스 변경은 unity 작업으로 우선 분류한다', () => {
  const sample = buildVerifiedTrainingSample({
    evidence: evidence({ sourcePath: 'unity-games/daechung-rpg', role: '', diagnosticFocus: null, goal: '플레이어 이동을 구현한다' }),
    patch: 'diff --git a/Assets/Move.cs b/Assets/Move.cs\n-old\n+new',
    sourceRevision: 'unity123',
  });
  assert.equal(sample.taskType, 'unity');
  assert.equal(sample.difficulty, 'unity-build');
});

test('브라우저 QA 실패 샘플은 생성하지 않는다', () => {
  assert.throws(() => buildVerifiedTrainingSample({
    evidence: evidence(),
    patch: 'diff --git a/a b/a\n-a\n+b',
    sourceRevision: 'abc123',
    independentQa: 'PASS',
    browserQa: 'FAIL',
  }), /브라우저 QA PASS/);
});

test('검증 diff가 없거나 너무 크면 학습 샘플을 만들지 않는다', () => {
  assert.throws(() => buildVerifiedTrainingSample({ evidence: evidence(), patch: '', sourceRevision: 'abc123' }), /patch/);
  assert.throws(() => buildVerifiedTrainingSample({ evidence: evidence(), patch: 'x'.repeat(MAX_PATCH_BYTES + 1), sourceRevision: 'abc123' }), /초과/);
});
