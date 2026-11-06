import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

test('Unity teacher rubric은 실전 구현능력 + 분석 전용/검증 patch 정답 계약을 고정한다', () => {
  const rubric = loadUnityTeacherRubric('company-learning/unity-teacher-rubric.json');
  assert.equal(rubric.scope, 'UNITY_CODING_ONLY');
  assert.equal(rubric.authority, 'ANALYSIS_ONLY');
  assert.equal(rubric.answerTarget, 'VERIFIED_FINAL_DIFF_ONLY');
  assert.equal(rubric.paidApiRequired, false);
  assert.equal(rubric.primaryGoal, 'MAXIMIZE_REAL_UNITY_GAME_IMPLEMENTATION_JUDGMENT');
  assert.ok(rubric.principles.length >= 20);
  assert.ok(rubric.exemplars.length >= 5);
  assert.ok(rubric.masteryAreas.includes('FEATURE_DECOMPOSITION'));
  assert.ok(rubric.masteryAreas.includes('AI_STATE_AND_BEHAVIOR_BOUNDARY'));
  assert.ok(rubric.masteryAreas.includes('BENCHMARK_PATTERN_REIMPLEMENTATION'));
  assert.ok(rubric.masteryAreas.includes('RUNTIME_QA_REASONING'));
  assert.ok(Array.isArray(rubric.implementationChecklist));
  assert.ok(rubric.implementationChecklist.length >= 8);
});

test('teacher prompt에 Unity lifecycle/구현판단/책임경계/안티패턴 기준이 실제 주입된다', () => {
  const rubric = loadUnityTeacherRubric('company-learning/unity-teacher-rubric.json');
  const prompt = buildTeacherPrompt(verifiedUnitySample(), { rubric });
  assert.match(prompt, /UNITY_TEACHER_RUBRIC/);
  assert.match(prompt, /MONOBEHAVIOUR_LIFECYCLE/);
  assert.match(prompt, /FEATURE_DECOMPOSITION/);
  assert.match(prompt, /AI_STATE_AND_BEHAVIOR_BOUNDARY/);
  assert.match(prompt, /BENCHMARK_PATTERN_REIMPLEMENTATION/);
  assert.match(prompt, /SAVE_LOAD_BOUNDARY/);
  assert.match(prompt, /one-line patch/i);
  assert.match(prompt, /verified final patch remains the learning answer/i);
  assert.match(prompt, /절대 코드, diff, patch/);
});

test('24시간 online teacher core lessons는 실제 Unity 구현 영역을 폭넓게 포함한다', () => {
  const doc = JSON.parse(fs.readFileSync('company-learning/unity-teacher-materials/core-lessons.json', 'utf8'));
  assert.equal(doc.scope, 'UNITY_CODING_ONLY');
  assert.equal(doc.primaryGoal, 'REAL_UNITY_GAME_IMPLEMENTATION_JUDGMENT');
  const ids = new Set(doc.lessons.map((lesson) => lesson.id));
  for (const id of [
    'requirement-01', 'architecture-01', 'feature-01', 'input-01', 'mobile-touch-01',
    'combat-01', 'ai-01', 'spawn-01', 'inventory-01', 'equipment-01', 'save-migration-01',
    'scene-transition-01', 'async-01', 'collision-01', 'camera-01', 'animation-01',
    'implementation-01', 'integration-01', 'benchmark-01', 'qa-01', 'verified-target-01'
  ]) assert.ok(ids.has(id), `missing Unity lesson: ${id}`);
  assert.ok(doc.lessons.length >= 40);
});
