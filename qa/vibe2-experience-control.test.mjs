// 파일명: qa/vibe2-experience-control.test.mjs
// 역할: Vibe2 학습이 엔진 QA와 검증 리뷰를 우회하지 못하는지 검사한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createVibeExperienceMemory } from '../assets/vibe-experience-memory.js';
import { validateVibeExperiencePromotion, promoteVibeReviewedExperience } from '../tools/vibe2-experience-control.mjs';

function successfulReview(overrides = {}) {
  return {
    gameId: 'daechung-rpg',
    engine: 'unity',
    departments: ['development', 'qa'],
    taskType: 'motion',
    problem: '공격 모션 판정 불일치',
    goal: '공격 모션과 판정 동기화',
    change: 'AnimationEvent 타이밍 정렬',
    outcome: 'PASS',
    qa: ['runtime', 'android-build'],
    build: 'unity-build-run-200',
    evidence: ['candidate:vibe2/candidate/task-1', 'unity-build-run:200'],
    reusablePatterns: ['공격 이벤트를 실제 타격 프레임에 정렬'],
    engineQaVerified: true,
    reviewVerified: true,
    reviewDecision: 'PASS',
    ...overrides
  };
}

test('candidate/build evidence without verified review cannot become memory', () => {
  const review = successfulReview({ reviewVerified: false });
  const validation = validateVibeExperiencePromotion(review);
  assert.equal(validation.valid, false);
  assert(validation.issues.includes('verified-review-required'));
  const result = promoteVibeReviewedExperience(createVibeExperienceMemory(), review);
  assert.equal(result.promoted, false);
});

test('successful learning requires engine QA', () => {
  const validation = validateVibeExperiencePromotion(successfulReview({ engineQaVerified: false }));
  assert.equal(validation.valid, false);
  assert(validation.issues.includes('engine-qa-required-for-success-learning'));
});

test('reviewed successful result becomes reusable experience without authority expansion', () => {
  const result = promoteVibeReviewedExperience(createVibeExperienceMemory(), successfulReview());
  assert.equal(result.promoted, true);
  assert.equal(result.memory.records.length, 1);
  assert.equal(result.memory.records[0].verified, true);
  assert.equal(result.memory.records[0].reusable, true);
  assert.equal(result.authority, 'unchanged');
  assert.equal(result.mayChangeProtectedGameplayValues, false);
});

test('verified failure may teach only when failure cause is reviewed', () => {
  const review = successfulReview({
    outcome: 'FAIL',
    engineQaVerified: false,
    failureCause: 'Root Motion rotation and navigation rotation conflicted',
    reusablePatterns: [],
    avoidPatterns: ['Root Motion 회전과 Nav 회전을 동시에 권위값으로 사용하지 않기']
  });
  const result = promoteVibeReviewedExperience(createVibeExperienceMemory(), review);
  assert.equal(result.promoted, true);
  assert.equal(result.memory.records[0].outcome, 'FAIL');
  assert(result.memory.records[0].failureCause.includes('Root Motion'));
});

test('experience level or record may never expand authority', () => {
  const validation = validateVibeExperiencePromotion(successfulReview({ authorityExpanded: true }));
  assert.equal(validation.valid, false);
  assert(validation.issues.includes('experience-must-not-expand-authority'));
});
