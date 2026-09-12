// 파일명: qa/vibe2-training-sample.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVerifiedTrainingSample, MAX_PATCH_BYTES, TRAINING_SAMPLE_VERSION, validatePositiveTrace, qaEvidencePasses, qaRequirementsForTask } from '../tools/vibe2-training-sample.mjs';

function trace(sourceRevision = 'abc123', overrides = {}) {
  return { state: 'PASS', sourceRevision, commitSha: sourceRevision, pullRequest: 123, ci: 'PASS', independentQa: 'PASS', runtime: 'PASS', stale: false, flaky: false, ...overrides };
}
function evidence(overrides = {}) {
  return { gameId: 'P0002', candidateId: 'P0002-test', sourcePath: 'web-games/insect-survival', role: 'development', goal: '거미 공격 데미지 오류를 수정한다',
    diagnosticFocus: { type: 'COMBAT_LOGIC', file: 'index.html', line: 10 }, responsibilityFiles: ['index.html'], changedFiles: ['index.html'],
    summary: '거미 공격 계산을 원래 규칙으로 맞춤', expectedEffect: '전투 규칙 회귀 없이 올바른 피해 적용', saveKeyValidation: 'PASS',
    syntaxChecks: [{ name: 'syntax:index.html', status: 'PASS' }], verificationTrace: trace(), ...overrides };
}

test('검증된 실제 diff와 완결 PASS trace를 bugfix 학습 샘플로 만든다', () => {
  const sample = buildVerifiedTrainingSample({ evidence: evidence(), patch: 'diff --git a/index.html b/index.html\n-old\n+new', sourceRevision: 'abc123', independentQa: 'PASS', browserQa: 'PASS', performance: { playerImpactScore: 0 } });
  assert.equal(sample.version, TRAINING_SAMPLE_VERSION); assert.equal(sample.taskType, 'bugfix'); assert.equal(sample.difficulty, 'bug');
  assert.equal(sample.independentQa, 'PASS'); assert.equal(sample.browserQa, 'PASS'); assert.equal(sample.quality.playImprovement, 0); assert.equal(sample.quality.noRegression, true);
  assert.match(sample.output, /검증된 패치/); assert.match(sample.output, /\+new/); assert.equal(sample.provenance.sourceRevision, 'abc123'); assert.equal(sample.verification.trace.pullRequest, 123);
});

test('role이 비어 있어도 실제 기능 구현 goal과 게임 코드 변경은 coding으로 분류한다', () => {
  const sample = buildVerifiedTrainingSample({ evidence: evidence({ role: '', diagnosticFocus: null, goal: '[FEATURE_DEVELOPMENT] 플레이 가능한 작은 기능 1개를 구현한다', summary: 'Integrated parallel department implementation', verificationTrace: trace('def456') }), patch: 'diff --git a/index.html b/index.html\n-old\n+new', sourceRevision: 'def456' });
  assert.equal(sample.taskType, 'coding'); assert.equal(sample.difficulty, 'simple');
});

test('Unity 게임 소스는 browser QA를 요구하지 않고 Android/runtime 검증을 요구한다', () => {
  const source = evidence({ sourcePath: 'unity-games/P0002', role: '', diagnosticFocus: null, goal: '플레이어 이동을 구현한다', verificationTrace: trace('unity123') });
  const sample = buildVerifiedTrainingSample({ evidence: source, patch: 'diff --git a/unity-games/P0002/Assets/Move.cs b/unity-games/P0002/Assets/Move.cs\n-old\n+new', sourceRevision: 'unity123', browserQa: 'NOT_APPLICABLE', taskType: 'unity' });
  assert.equal(sample.taskType, 'unity'); assert.equal(sample.difficulty, 'unity-build');
  assert.equal(sample.browserQa, 'NOT_APPLICABLE'); assert.equal(sample.verification.runtime, 'PASS'); assert.equal(sample.verification.androidRuntimeRequired, true);
  assert.deepEqual(qaRequirementsForTask('unity'), { independentQa: 'PASS', browserQa: 'NOT_APPLICABLE', runtime: 'PASS', androidRuntimeRequired: true, robloxRuntimeRequired: false, uefnRuntimeRequired: false });
  assert.equal(qaEvidencePasses({ taskType: 'unity', independentQa: 'PASS', browserQa: 'FAIL', runtime: 'PASS' }), true);
});

test('Roblox와 Fortnite UEFN은 각 native runtime gate에 묶인다', () => {
  const roblox = buildVerifiedTrainingSample({
    evidence: evidence({ sourcePath: 'roblox-games/P0100', role: '', diagnosticFocus: null, goal: 'Roblox Luau 이동을 구현한다', verificationTrace: trace('roblox123') }),
    patch: 'diff --git a/roblox-games/P0100/main.luau b/roblox-games/P0100/main.luau\n-old\n+new', sourceRevision: 'roblox123', browserQa: 'NOT_APPLICABLE', taskType: 'roblox',
  });
  assert.equal(roblox.taskType, 'roblox'); assert.equal(roblox.difficulty, 'roblox-release'); assert.equal(roblox.verification.robloxRuntimeRequired, true); assert.equal(roblox.verification.androidRuntimeRequired, false);

  const uefn = buildVerifiedTrainingSample({
    evidence: evidence({ sourcePath: 'fortnite-uefn-games/P0200', role: '', diagnosticFocus: null, goal: 'UEFN Verse 장치를 구현한다', verificationTrace: trace('uefn123') }),
    patch: 'diff --git a/fortnite-uefn-games/P0200/main.verse b/fortnite-uefn-games/P0200/main.verse\n-old\n+new', sourceRevision: 'uefn123', browserQa: 'NOT_APPLICABLE', taskType: 'fortnite_uefn',
  });
  assert.equal(uefn.taskType, 'fortnite_uefn'); assert.equal(uefn.difficulty, 'uefn-release'); assert.equal(uefn.verification.uefnRuntimeRequired, true); assert.equal(uefn.verification.robloxRuntimeRequired, false);
  assert.deepEqual(qaRequirementsForTask('roblox'), { independentQa: 'PASS', browserQa: 'NOT_APPLICABLE', runtime: 'PASS', androidRuntimeRequired: false, robloxRuntimeRequired: true, uefnRuntimeRequired: false });
  assert.deepEqual(qaRequirementsForTask('fortnite_uefn'), { independentQa: 'PASS', browserQa: 'NOT_APPLICABLE', runtime: 'PASS', androidRuntimeRequired: false, robloxRuntimeRequired: false, uefnRuntimeRequired: true });
  assert.equal(qaEvidencePasses({ taskType: 'roblox', independentQa: 'PASS', browserQa: 'FAIL', runtime: 'PASS' }), true);
  assert.equal(qaEvidencePasses({ taskType: 'fortnite_uefn', independentQa: 'PASS', browserQa: 'FAIL', runtime: 'PASS' }), true);
});

test('Unity runtime 실패나 불완전 trace는 학습 샘플로 승격하지 않는다', () => {
  const source = evidence({ sourcePath: 'unity-games/P0002', verificationTrace: trace('unity123', { runtime: 'FAIL' }) });
  assert.throws(() => buildVerifiedTrainingSample({ evidence: source, patch: 'diff --git a/unity-games/P0002/Assets/a.cs b/unity-games/P0002/Assets/a.cs\n-a\n+b', sourceRevision: 'unity123', browserQa: 'NOT_APPLICABLE', taskType: 'unity' }), /runtime PASS/);
});

test('Web 브라우저 QA 실패 샘플은 생성하지 않는다', () => {
  assert.throws(() => buildVerifiedTrainingSample({ evidence: evidence(), patch: 'diff --git a/a b/a\n-a\n+b', sourceRevision: 'abc123', independentQa: 'PASS', browserQa: 'FAIL' }), /브라우저 QA PASS/);
});

test('검증 diff가 없거나 너무 크면 학습 샘플을 만들지 않는다', () => {
  assert.throws(() => buildVerifiedTrainingSample({ evidence: evidence(), patch: '', sourceRevision: 'abc123' }), /patch/);
  assert.throws(() => buildVerifiedTrainingSample({ evidence: evidence(), patch: 'x'.repeat(MAX_PATCH_BYTES + 1), sourceRevision: 'abc123' }), /초과/);
});

test('PR CI runtime 연결이 없는 과거 PASS 표시는 positive 학습으로 승격하지 않는다', () => {
  assert.throws(() => buildVerifiedTrainingSample({ evidence: evidence({ verificationTrace: undefined }), patch: 'diff --git a/a b/a\n-a\n+b', sourceRevision: 'abc123' }), /verificationTrace/);
  assert.throws(() => validatePositiveTrace(trace('abc123', { pullRequest: null }), 'abc123'), /PR 번호/);
  assert.throws(() => validatePositiveTrace(trace('abc123', { runtime: 'UNKNOWN' }), 'abc123'), /runtime PASS/);
});

test('FAIL STALLED NO_ACTIONABLE_WORK stale SHA mismatch는 성공 데이터가 아니다', () => {
  for (const state of ['FAIL', 'STALLED', 'NO_ACTIONABLE_WORK', 'INCOMPLETE_PROGRESS', 'FLAKY', 'STALE', 'SHA_MISMATCH']) assert.throws(() => validatePositiveTrace(trace('abc123', { state }), 'abc123'), /성공 trace 상태/);
  assert.throws(() => validatePositiveTrace(trace('abc123', { stale: true }), 'abc123'), /stale/);
  assert.throws(() => validatePositiveTrace(trace('other'), 'abc123'), /SHA mismatch/);
});
