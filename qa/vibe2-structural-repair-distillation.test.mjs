// 파일명: qa/vibe2-structural-repair-distillation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDistilledStructuralSample,
  buildTeacherPrompt,
  isVerifiedStructuralSource,
  validateTeacherAnalysis,
} from '../tools/vibe2-structural-repair-distillation.mjs';

function verified(overrides = {}) {
  const sourceRevision = overrides.sourceRevision ?? 'abc123';
  return {
    instruction: '중복 이벤트 핸들러 때문에 전투 입력이 두 번 실행되는 문제를 고쳐',
    input: '기존 이벤트 등록 흐름과 저장 의미를 유지해야 한다.',
    output: '요약: 책임 핸들러를 정상화\n\n검증된 패치:\ndiff --git a/game.js b/game.js\n--- a/game.js\n+++ b/game.js\n@@ -1 +1 @@\n-old\n+new',
    taskType: 'bugfix',
    difficulty: 'bug',
    lifecycle: 'active',
    project: 'fixture-game',
    sourceCommit: sourceRevision,
    sourceRevision,
    independentQa: 'PASS',
    browserQa: 'PASS',
    quality: { codeQuality: 1, noRegression: true, playImprovement: 1, ruleCompliance: 1 },
    provenance: { sourceKind: 'vibe2', sourceRevision, candidateId: 'candidate-1', gameId: 'fixture-game' },
    verification: {
      trace: {
        state: 'PASS', sourceRevision, commitSha: sourceRevision, pullRequest: 1,
        ci: 'PASS', independentQa: 'PASS', runtime: 'PASS', stale: false, flaky: false,
      },
    },
    ...overrides,
  };
}

function teacher(overrides = {}) {
  return {
    structuralRepair: true,
    rootCause: '동일 책임의 이벤트 등록이 여러 경로에 분산되어 입력이 중복 실행된다.',
    responsibilityBoundary: '전투 입력 이벤트 등록과 해제 책임을 가진 핸들러 계층',
    patchScope: ['중복 이벤트 등록 경로 제거', '단일 책임 핸들러 유지'],
    whyNotSmallerPatch: '한 호출만 바꾸면 다른 중복 등록 경로가 남아 같은 오류가 재발할 수 있다.',
    regressionRisks: ['입력 이벤트 미등록', '기존 저장 의미 변경'],
    evidence: ['동일 입력이 두 번 실행됨', '기존 이벤트 등록 흐름이 여러 경로에 존재함'],
    ...overrides,
  };
}

test('완결 QA/runtime trace가 있는 실제 성공 샘플만 teacher 입력이 된다', () => {
  assert.equal(isVerifiedStructuralSource(verified()), true);
  assert.equal(isVerifiedStructuralSource(verified({ browserQa: 'FAIL' })), false);
  const stale = verified(); stale.verification.trace.stale = true;
  assert.equal(isVerifiedStructuralSource(stale), false);
  assert.equal(isVerifiedStructuralSource(verified({ quality: null })), false);
});

test('teacher prompt는 코드 생성이 아니라 구조 판단만 요구한다', () => {
  const prompt = buildTeacherPrompt(verified());
  assert.match(prompt, /정답 코드를 생성하지 말고/);
  assert.match(prompt, /절대 코드, diff, patch/);
  assert.match(prompt, /responsibilityBoundary/);
});

test('teacher 응답은 구조화 필드가 없거나 코드 권한을 시도하면 거부한다', () => {
  assert.equal(validateTeacherAnalysis(teacher()).structuralRepair, true);
  assert.throws(() => validateTeacherAnalysis({ ...teacher(), rootCause: '' }), /rootCause/);
  assert.throws(() => validateTeacherAnalysis({ ...teacher(), code: 'function bad(){}' }), /금지된 코드 필드/);
});

test('증류 정답은 teacher 코드가 아니라 원래 검증된 최종 patch를 그대로 유지한다', () => {
  const source = verified();
  const distilled = buildDistilledStructuralSample(source, teacher(), { teacherModel: 'qwen2.5-coder:7b' });
  assert.ok(distilled);
  assert.equal(distilled.specialization, 'structural-repair');
  assert.equal(distilled.taskType, 'bugfix');
  assert.equal(distilled.output, source.output);
  assert.equal(distilled.sourceKind, 'vibe2');
  assert.equal(distilled.teacherSupport.codeAuthority, false);
  assert.equal(distilled.teacherSupport.paidApi, false);
  assert.equal(distilled.teacherSupport.answerTarget, 'VERIFIED_FINAL_DIFF_ONLY');
  assert.match(distilled.input, /STRUCTURAL_REPAIR_TEACHER_ANALYSIS/);
});

test('teacher가 단순 수정으로 판정하면 전문 증류 데이터로 승격하지 않는다', () => {
  assert.equal(buildDistilledStructuralSample(verified(), teacher({ structuralRepair: false })), null);
});
