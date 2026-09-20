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
  buildSupervisedWebExperienceReview,
  runExperiencePromotion,
  runExperiencePromotionBatch
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

test('verified supervised PASS and REVISE decisions become reusable positive and negative learning',()=>{
  const task={id:'web-supervised-1',gameId:'demo-web',target:'web',goal:'기존 게임을 보존하며 모바일 핵심 루프를 완성한다'};
  const candidateResult={
    outcome:'PASS',candidateBranch:'vibe2/candidate/web-supervised-1/primary',baseMainSha:'abc123',
    candidateIdentity:{manifestPath:'.vibe2/candidates/web-supervised-1/manifest.json'}
  };
  const positive=buildSupervisedWebExperienceReview({
    task,candidateResult,
    supervisionReview:{verified:true,decision:'PASS',rationale:'세이브·입력·핵심 루프 보존 확인',reusablePatterns:['보존 불변조건을 먼저 고정하고 책임 함수만 수정'],evidence:['diff-review:PASS','mobile-runtime:PASS']}
  });
  const positiveGate=validateVibeExperiencePromotion(positive);
  assert.equal(positiveGate.valid,true);
  assert.equal(positive.outcome,'PASS');
  assert.ok(positive.reusablePatterns.includes('보존 불변조건을 먼저 고정하고 책임 함수만 수정'));

  const negative=buildSupervisedWebExperienceReview({
    task,candidateResult,
    supervisionReview:{verified:true,decision:'REVISE',rationale:'검증 버튼만 추가하고 실제 모바일 입력은 연결하지 않음',avoidPatterns:['검증 UI로 실제 게임플레이 부족을 가리는 패턴'],evidence:['diff-review:REVISE','mobile-runtime:FAIL']}
  });
  const negativeGate=validateVibeExperiencePromotion(negative);
  assert.equal(negativeGate.valid,true);
  assert.equal(negative.outcome,'FAIL');
  assert.match(negative.failureCause,/실제 모바일 입력/);
  assert.ok(negative.avoidPatterns.some(value=>/검증 UI/.test(value)));
});

test('supervised review batch writes both verified success and verified failure into experience memory',()=>{
  const writes=[];
  const reviews=[
    successfulReview({id:'supervised-pass',gameId:'demo-web',engine:'web',taskType:'supervised-web-coauthoring'}),
    successfulReview({id:'supervised-fail',gameId:'demo-web',engine:'web',taskType:'supervised-web-coauthoring',outcome:'FAIL',failureCause:'placeholder source was proposed',engineQaVerified:false,avoidPatterns:['placeholder source']})
  ];
  const result=runExperiencePromotionBatch({reviews,memoryFile:'',writeMemory:(_file,value)=>writes.push(value)});
  assert.equal(result.total,2);
  assert.equal(result.promotedCount,2);
  assert.equal(writes.length,1);
  assert.equal(writes[0].records.length,2);
  assert.ok(writes[0].records.some(record=>record.outcome==='FAIL'&&record.avoidPatterns.includes('placeholder source')));
});

test('batch promotion persists phase 3 capability application evidence without double counting the same application',()=>{
  const writes=[];
  const capability=successfulReview({
    id:'capability-phase3-1',
    gameId:'demo-web',
    engine:'web',
    taskType:'coding-capability-distillation',
    problem:'save restore ordering',
    goal:'repair save restore ordering',
    change:'verified save restoration sequence',
    reusablePatterns:['CAPABILITY:CROSS_GAME_SAVE_RESTORE']
  });
  const application={
    version:1,
    capabilityId:'capability-phase3-1',
    applicationId:'capp_demo_1',
    taskId:'demo-task-1',
    workKey:'demo-web:web:save:1',
    gameId:'demo-web',
    engine:'web',
    outcome:'FRESH_QA_PASS',
    selected:true,
    finalReviewPass:true,
    freshTaskQaPass:true,
    independent:true,
    capabilitySpecificSupport:false,
    capabilitySpecificContradiction:false,
    coAppliedCapabilityIds:['capability-phase3-1'],
    evidence:['actions-run:300','fan-in-review:PASS'],
    rawCodeStored:false,
    rawModelOutputStored:false,
    hiddenChainOfThoughtStored:false,
    authorityExpanded:false
  };
  const payload={experienceReviews:[capability],capabilityApplicationReviews:[application,{...application}]};
  const result=runExperiencePromotionBatch({reviews:payload,memoryFile:'',writeMemory:(_file,value)=>writes.push(value)});
  assert.equal(result.promotedCount,1);
  assert.equal(result.capabilityApplicationApplied,1);
  assert.equal(result.capabilityApplicationDuplicates,1);
  assert.equal(result.persisted,true);
  assert.equal(writes.length,1);
  const stored=writes[0].records.find(record=>record.id==='capability-phase3-1');
  assert.equal(stored.capabilityApplications.length,1);
  assert.equal(stored.capabilityLifecycle.state,'APPLICATION_OBSERVED');
  assert.equal(stored.capabilityLifecycle.independentPassCount,1);
  assert.equal(stored.capabilityLifecycle.singlePassAutomaticPromotion,false);
  assert.equal(stored.capabilityLifecycle.unrelatedFailurePenaltyApplied,false);
});



test('batch promotion persists phase 4 capability benchmark evidence without automatic authority promotion',()=>{
  const writes=[];
  const capability=successfulReview({
    id:'capability-phase4-1',
    gameId:'origin-web',
    engine:'web',
    taskType:'coding-capability-distillation',
    problem:'save restore ordering',
    goal:'repair save restore ordering',
    change:'verified save restoration sequence',
    reusablePatterns:['CAPABILITY:CROSS_GAME_SAVE_RESTORE']
  });
  const benchmark={
    version:1,
    benchmarkId:'gbench_demo_1',
    pairId:'gpair_demo_1',
    capabilityId:'capability-phase4-1',
    taskId:'unseen-task-1',
    workKey:'unseen:web:save:1',
    gameId:'unseen-web',
    engine:'web',
    problemFingerprint:'gbench_problem_demo_1',
    sourceCapabilityGameId:'origin-web',
    unseenGame:true,
    unseenProblem:true,
    pairedControlChallenger:true,
    sameSourceBaseline:true,
    sameModelGenerationBudget:true,
    sameWritableScope:true,
    sameQaContract:true,
    nonTargetContextFixed:true,
    targetCapabilityOnlyGuidanceDelta:true,
    controlFreshQaPass:false,
    challengerFreshQaPass:true,
    capabilitySpecificSupport:true,
    capabilitySpecificContradiction:false,
    inconclusive:false,
    evidence:['generalization-fan-in-regression:PASS','capability-specific-support:capability-phase4-1'],
    authorityExpanded:false
  };
  const payload={experienceReviews:[capability],capabilityGeneralizationBenchmarkReviews:[benchmark,{...benchmark}]};
  const result=runExperiencePromotionBatch({reviews:payload,memoryFile:'',writeMemory:(_file,value)=>writes.push(value)});
  assert.equal(result.promotedCount,1);
  assert.equal(result.capabilityGeneralizationBenchmarkApplied,1);
  assert.equal(result.capabilityGeneralizationBenchmarkDuplicates,1);
  assert.equal(result.persisted,true);
  const stored=writes[0].records.find(record=>record.id==='capability-phase4-1');
  assert.equal(stored.capabilityBenchmarks.length,1);
  assert.equal(stored.capabilityLifecycle.benchmarkSupportCount,1);
  assert.equal(stored.capabilityLifecycle.strongGeneralizationVerified,false);
  assert.equal(stored.capabilityLifecycle.automaticSupersession,false);
  assert.equal(stored.capabilityLifecycle.authorityExpanded,false);
});

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
  assert.equal(second.promoted, true);
  assert.equal(second.reason, 'experience-reinforced');
  assert.equal(second.memory.records.length, 1);
  assert.equal(second.memory.records[0].confirmations, 2);
  assert.ok(second.memory.records[0].confidence > first.memory.records[0].confidence);
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
