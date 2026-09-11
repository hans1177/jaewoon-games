import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeacherPrompt, loadUnityTeacherRubric } from '../tools/vibe2-structural-repair-distillation.mjs';

function verifiedUnitySample() {
  return {
    instruction: 'OnEnable마다 이벤트가 중복 등록되어 공격이 두 번 적용되는 문제를 고쳐',
    input: '기존 전투 규칙과 저장 의미는 바꾸지 않는다.',
    output: '요약: 이벤트 등록 책임을 단일화\n\n검증된 패치:\ndiff --git a/Assets/Scripts/CombatInput.cs b/Assets/Scripts/CombatInput.cs\n--- a/Assets/Scripts/CombatInput.cs\n+++ b/Assets/Scripts/CombatInput.cs',
    taskType: 'unity',
    sourceRevision: 'unity123',
    independentQa: 'PASS',
    browserQa: 'PASS',
    quality: { codeQuality: 1, noRegression: true, playImprovement: 1, ruleCompliance: 1 },
    provenance: { sourceKind: 'vibe2', sourceRevision: 'unity123', candidateId: 'unity-fixture', gameId: 'fixture-game' },
    verification: { trace: { state: 'PASS', sourceRevision: 'unity123', commitSha: 'unity123', pullRequest: 1, ci: 'PASS', independentQa: 'PASS', runtime: 'PASS', stale: false, flaky: false } },
  };
}

test('Unity teacher rubric은 분석 전용/검증 patch 정답 계약을 고정한다', () => {
  const rubric = loadUnityTeacherRubric('company-learning/unity-teacher-rubric.json');
  assert.equal(rubric.scope, 'UNITY_CODING_ONLY');
  assert.equal(rubric.authority, 'ANALYSIS_ONLY');
  assert.equal(rubric.answerTarget, 'VERIFIED_FINAL_DIFF_ONLY');
  assert.equal(rubric.paidApiRequired, false);
  assert.ok(rubric.principles.length >= 8);
  assert.ok(rubric.exemplars.length >= 3);
});

test('teacher prompt에 Unity lifecycle/책임경계/안티패턴 기준이 실제 주입된다', () => {
  const rubric = loadUnityTeacherRubric('company-learning/unity-teacher-rubric.json');
  const prompt = buildTeacherPrompt(verifiedUnitySample(), { rubric });
  assert.match(prompt, /UNITY_TEACHER_RUBRIC/);
  assert.match(prompt, /MONOBEHAVIOUR_LIFECYCLE/);
  assert.match(prompt, /EVENT_OWNERSHIP/);
  assert.match(prompt, /SAVE_LOAD_BOUNDARY/);
  assert.match(prompt, /one-line patch/i);
  assert.match(prompt, /verified final patch remains the learning answer/i);
  assert.match(prompt, /절대 코드, diff, patch/);
});
