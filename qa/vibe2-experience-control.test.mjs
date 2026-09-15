// 파일명: qa/vibe2-experience-control.test.mjs
// 역할: Vibe2 학습이 엔진 QA와 검증 리뷰를 우회하지 못하고 검증 경험만 다음 작업에 재사용되는지 검사한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createVibeExperienceMemory } from '../assets/vibe-experience-memory.js';
import { buildVibeContinuousWorkOrder } from '../tools/vibe2-continuous-runner.mjs';
import {
  validateVibeExperiencePromotion,
  promoteVibeReviewedExperience,
  buildVibeExperienceReviewFromRevote,
  runExperiencePromotion
} from '../tools/vibe2-experience-control.mjs';

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

function revoteFixture({ buildConclusion = 'success', buildError = '', buildStage = 'Unity Android build', directorDecision = 'PASS' } = {}) {
  const request = {
    version: 1,
    requestId: 'task-review-200',
    gameId: 'daechung-rpg',
    modificationCommit: 'abc123',
    buildRunId: 200,
    buildConclusion,
    buildStage,
    buildError,
    scope: '공격 모션과 판정 동기화 변경 검증'
  };
  const roles = ['planning', 'development', 'qa', 'graphics', 'balance'];
  const departmentVotes = roles.map((role) => ({
    version: 1,
    requestId: request.requestId,
    gameId: request.gameId,
    role,
    decision: directorDecision === 'PASS' ? 'PASS' : (['development', 'qa'].includes(role) ? 'REVISE' : 'PASS'),
    modificationCommit: request.modificationCommit,
    buildRunId: request.buildRunId,
    independent: true
  }));
  const aggregated = departmentVotes.some((vote) => vote.decision === 'DROP') ? 'DROP'
    : departmentVotes.some((vote) => vote.decision === 'REVISE') ? 'REVISE' : 'PASS';
  const director = {
    version: 1,
    requestId: request.requestId,
    gameId: request.gameId,
    role: 'director',
    decision: aggregated,
    modificationCommit: request.modificationCommit,
    buildRunId: request.buildRunId,
    inventedDepartmentContent: false
  };
  return { request, departmentVotes, director };
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

test('minimum two evidence items are required', () => {
  const validation = validateVibeExperiencePromotion(successfulReview({ evidence: ['only-one-proof'] }));
  assert.equal(validation.valid, false);
  assert(validation.issues.includes('minimum-two-evidence-items-required'));
});

test('verified successful revote is deterministically promoted', () => {
  const fixture = revoteFixture();
  const review = buildVibeExperienceReviewFromRevote(fixture);
  assert.equal(review.reviewVerified, true);
  assert.equal(review.engineQaVerified, true);
  assert.equal(review.outcome, 'PASS');
  const result = promoteVibeReviewedExperience(createVibeExperienceMemory(), review);
  assert.equal(result.promoted, true);
  assert.equal(result.memory.records[0].outcome, 'PASS');
});

test('verified build failure cause from request may be promoted as failure experience', () => {
  const fixture = revoteFixture({
    buildConclusion: 'failure',
    buildStage: 'Unity compilation',
    buildError: 'Assets/Scripts/Player.cs(20,4): CS1002 ; expected',
    directorDecision: 'REVISE'
  });
  const review = buildVibeExperienceReviewFromRevote(fixture);
  assert.equal(review.reviewVerified, true);
  assert.equal(review.outcome, 'FAIL');
  assert.match(review.failureCause, /CS1002/);
  const result = promoteVibeReviewedExperience(createVibeExperienceMemory(), review);
  assert.equal(result.promoted, true);
  assert.equal(result.memory.records[0].outcome, 'FAIL');
});

test('unverified failure cause is blocked even when director requests revise', () => {
  const fixture = revoteFixture({ buildConclusion: 'failure', buildError: '', directorDecision: 'REVISE' });
  const review = buildVibeExperienceReviewFromRevote(fixture);
  assert.equal(review.outcome, 'FAIL');
  assert.equal(review.failureCause, '');
  const result = promoteVibeReviewedExperience(createVibeExperienceMemory(), review);
  assert.equal(result.promoted, false);
  assert(result.validation.issues.includes('failure-cause-required-for-failure-learning'));
});

test('same verified experience is not stored twice', () => {
  const first = promoteVibeReviewedExperience(createVibeExperienceMemory(), successfulReview());
  const second = promoteVibeReviewedExperience(first.memory, successfulReview());
  assert.equal(first.promoted, true);
  assert.equal(second.promoted, false);
  assert.equal(second.reason, 'duplicate-experience');
  assert.equal(second.memory.records.length, 1);
});

test('experience storage failure does not change the already verified review decision', () => {
  const result = runExperiencePromotion({
    memoryFile: '/path/that/does/not/matter.json',
    review: successfulReview(),
    writeMemory: () => { throw new Error('simulated storage failure'); }
  });
  assert.equal(result.promoted, false);
  assert.equal(result.persisted, false);
  assert.equal(result.reason, 'experience-storage-failed');
  assert.match(result.storageError, /simulated storage failure/);
  assert.equal(result.validation.valid, true);
  assert.equal(result.validation.outcome, 'PASS');
});

test('verified experience is injected into the next similar worker goal as advisory context', () => {
  const learned = promoteVibeReviewedExperience(createVibeExperienceMemory(), successfulReview({
    taskType: 'modify',
    avoidPatterns: ['검증 없이 공격 판정 타이밍을 추측하지 않기']
  }));
  const order = buildVibeContinuousWorkOrder({
    runtime: {
      continuous: { enabled: true },
      safety: { existingWebMaintenanceAllowed: true, allowedWritableTargets: ['unity'] }
    },
    queue: {
      tasks: [{
        id: 'next-attack-task',
        gameId: 'daechung-rpg',
        target: 'unity',
        department: 'development',
        type: 'implementation',
        goal: '공격 모션 판정 불일치를 수정한다',
        responsibleFiles: ['unity-games/daechung-rpg/Assets/Scripts/PrototypeAnimatedVisuals.cs'],
        priority: 'normal',
        releaseState: 'development-confirmed',
        status: 'queued',
        retries: 0,
        maxRetries: 2
      }]
    },
    experience: learned.memory
  });
  assert.equal(order.run, true);
  assert.equal(order.learningAppliedToWorkerGoal, true);
  assert.match(order.goal, /VERIFIED EXPERIENCE MEMORY/);
  assert.match(order.goal, /검증 없이 공격 판정 타이밍을 추측하지 않기/);
  assert.equal(order.workerPolicy.protectedGameplayMutationAutomatic, false);
});
