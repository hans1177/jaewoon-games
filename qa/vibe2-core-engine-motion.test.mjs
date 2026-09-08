// 파일명: qa/vibe2-core-engine-motion.test.mjs
// 역할: Vibe2 엔진 어댑터, workbench, Core Runtime, Motion Core, 경험 메모리, 연속 작업 큐 계약을 회귀검사한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectVibeEngineTarget,
  createVibeEngineAdapter,
  validateVibeEngineAdapter
} from '../assets/vibe-engine-adapter.js';
import { planVibeWorkbenchTask, createVibeEditBrief } from '../assets/vibe-workbench.js';
import { planVibeCoreTask, beginVibeCoreTask, recordVibeCoreOutcome } from '../assets/vibe-core-runtime.js';
import {
  createVibeMotionContract,
  validateVibeMotionContract,
  validateVibeMotionTransition,
  createVibeCombatMotionSync,
  scoreVibeMotionQuality,
  createVibeMotionLearningRecord
} from '../assets/vibe-motion-core.js';
import {
  createVibeExperienceMemory,
  addVibeExperience,
  searchVibeExperience
} from '../assets/vibe-experience-memory.js';
import {
  createVibeContinuousQueue,
  selectNextVibeQueueTask,
  beginVibeQueueTask,
  finishVibeQueueTask
} from '../assets/vibe-continuous-queue.js';

test('Unreal target detection and source contract', () => {
  assert.equal(detectVibeEngineTarget('언리얼 UE5 블루프린트로 만들어'), 'unreal');
  const adapter = createVibeEngineAdapter({ target: 'unreal', gameSlug: 'motion-test' });
  assert.equal(adapter.target, 'unreal');
  assert.equal(adapter.mayWriteSource, true);
  assert(adapter.source.candidateFiles.includes('unreal-games/motion-test/*.uproject'));
  assert(adapter.source.ignoredPaths.includes('unreal-games/motion-test/Intermediate/**'));
  assert(adapter.motionBindings.includes('Animation Blueprint'));
  assert.equal(validateVibeEngineAdapter(adapter).valid, true);
});

test('workbench routes Unreal directly and binds engine adapter', () => {
  const plan = planVibeWorkbenchTask({
    request: '언리얼 UE5에서 캐릭터 공격 모션과 블루프린트 전환을 개선',
    target: 'unreal',
    gameId: 'motion-test'
  });
  assert.equal(plan.target, 'unreal');
  assert.equal(plan.engineAdapter.target, 'unreal');
  assert.equal(plan.applyPolicy.sourceWriteAllowed, true);
  assert.equal(plan.applyPolicy.motionRuntimeEvidenceRequired, true);
  assert(plan.candidateFiles.some((path) => path.includes('unreal-games/motion-test')));
  assert(plan.steps.some((step) => step.includes('Animation Blueprint')));
  assert(plan.steps.some((step) => step.includes('Motion Quality Score')));
});

test('workbench keeps web archive read only', () => {
  const plan = planVibeWorkbenchTask({ request: '웹게임 구조 분석', target: 'web', gameId: 'legacy' });
  const brief = createVibeEditBrief({ request: '웹게임 구조 분석', target: 'web', gameId: 'legacy' });
  assert.equal(plan.target, 'web');
  assert.equal(plan.applyPolicy.sourceWriteAllowed, false);
  assert.equal(plan.applyPolicy.webArchiveReadOnly, true);
  assert.equal(brief.outputContract.sourceWriteAllowed, false);
  assert(plan.warnings.some((warning) => warning.includes('archive/read-only')));
});

test('core runtime composes Unreal workbench, verified learning, motion and queue', () => {
  const seeded = addVibeExperience(createVibeExperienceMemory(), {
    gameId: 'old-game',
    engine: 'unreal',
    departments: ['development', 'qa', 'graphics'],
    taskType: 'motion',
    problem: '공격 모션 전환이 끊김',
    goal: '공격 모션 개선',
    change: 'Montage 전환과 Blend 조정',
    outcome: 'PASS',
    evidence: ['old-qa-1'],
    reusablePatterns: ['Montage blend 검증'],
    verified: true
  });
  assert.equal(seeded.added, true);
  const plan = planVibeCoreTask({
    request: '캐릭터 공격 모션 개선',
    target: 'unreal',
    gameId: 'motion-test',
    experienceMemory: seeded.memory,
    ownerDirective: true,
    motion: {
      actorId: 'hero',
      states: [
        { id: 'idle', clips: ['Idle'] },
        { id: 'move', clips: ['Run'] },
        { id: 'attack', clips: ['Attack01'] },
        { id: 'hit', clips: ['Hit01'] },
        { id: 'death', clips: ['Death01'] }
      ],
      transitions: {
        idle: ['move', 'attack', 'hit', 'death'],
        move: ['idle', 'attack', 'hit', 'death'],
        attack: ['idle', 'move', 'hit', 'death'],
        hit: ['idle', 'move', 'death'],
        death: []
      }
    }
  });
  assert.equal(plan.target, 'unreal');
  assert.equal(plan.engineAdapter.target, 'unreal');
  assert.equal(plan.learning.records.length, 1);
  assert.equal(plan.motion.status, 'MOTION_CONTRACT_VALID');
  assert.equal(plan.executionGate.mayExecute, true);
  assert.equal(plan.next.selected.id, plan.queueTask.id);
  assert.equal(plan.queueTask.priority, 'owner-immediate');
  const started = beginVibeCoreTask(plan);
  assert.equal(started.started, true);
  const recorded = recordVibeCoreOutcome({
    plan,
    queue: started.queue,
    experienceMemory: seeded.memory,
    outcome: 'PASS',
    evidence: ['new-qa-1'],
    verified: true,
    problem: '공격 모션 전환 끊김',
    change: 'Blend와 타격 타이밍 동기화',
    reusablePatterns: ['공격 전환 blend + hit timing']
  });
  assert.equal(recorded.learning.added, true);
  assert.equal(recorded.mayReuseLearning, true);
  assert.equal(recorded.dispatchNext, false);
});

test('core runtime blocks invalid motion contract and read-only source', () => {
  const invalidMotion = planVibeCoreTask({
    request: '캐릭터 공격 모션 개선',
    target: 'unreal',
    gameId: 'motion-test',
    motion: {
      states: [
        { id: 'idle', clips: ['Idle'] },
        { id: 'move', clips: ['Move'] },
        { id: 'attack', clips: [] },
        { id: 'hit', clips: ['Hit'] },
        { id: 'death', clips: ['Death'] }
      ],
      transitions: { idle: ['move'], move: ['idle'], attack: ['idle'], hit: ['idle'], death: [] }
    }
  });
  assert.equal(invalidMotion.executionGate.mayExecute, false);
  assert(invalidMotion.executionGate.reasons.includes('motion-contract-invalid'));

  const web = planVibeCoreTask({ request: '웹게임 분석', target: 'web', gameId: 'legacy' });
  assert.equal(web.executionGate.mayExecute, false);
  assert(web.executionGate.reasons.includes('source-read-only'));
});

test('web archive remains read only', () => {
  const adapter = createVibeEngineAdapter({ target: 'web', gameSlug: 'legacy' });
  assert.equal(adapter.mayWriteSource, false);
  assert.equal(adapter.webArchiveReadOnly, true);
  assert.equal(validateVibeEngineAdapter(adapter).valid, true);
});

test('motion contract requires actual motions', () => {
  const contract = createVibeMotionContract({
    actorId: 'hero',
    engine: 'unreal',
    states: [
      { id: 'idle', clips: ['Idle'] },
      { id: 'move', clips: ['Run'] },
      { id: 'attack', clips: ['Attack01'] },
      { id: 'hit', clips: ['Hit01'] },
      { id: 'death', clips: ['Death01'] }
    ],
    transitions: {
      idle: ['move', 'attack', 'hit', 'death'],
      move: ['idle', 'attack', 'hit', 'death'],
      attack: ['idle', 'move', 'hit', 'death'],
      hit: ['idle', 'move', 'death'],
      death: []
    }
  });
  const validation = validateVibeMotionContract(contract);
  assert.equal(validation.valid, true);
  assert.equal(validateVibeMotionTransition(contract, { from: 'death', to: 'idle' }).valid, false);
});

test('missing required motion blocks contract', () => {
  const contract = createVibeMotionContract({
    states: [
      { id: 'idle', clips: ['Idle'] },
      { id: 'move', clips: ['Move'] },
      { id: 'attack', clips: [] },
      { id: 'hit', clips: ['Hit'] },
      { id: 'death', clips: ['Death'] }
    ],
    transitions: { idle: ['move'], move: ['idle'], attack: ['idle'], hit: ['idle'], death: [] }
  });
  const validation = validateVibeMotionContract(contract);
  assert.equal(validation.valid, false);
  assert(validation.issues.includes('missing-motion:attack'));
});

test('combat sync enforces melee hit marker and ranged release marker', () => {
  const meleeBad = createVibeCombatMotionSync({ actionType: 'melee', activeStart: 0.2, activeEnd: 0.4, recoveryEnd: 0.8 });
  assert.equal(meleeBad.valid, false);
  assert(meleeBad.issues.includes('melee-hit-marker-required'));
  const meleeGood = createVibeCombatMotionSync({ actionType: 'melee', activeStart: 0.2, activeEnd: 0.4, recoveryEnd: 0.8, hitMarker: 'HitWindow' });
  assert.equal(meleeGood.valid, true);
  const rangedGood = createVibeCombatMotionSync({ actionType: 'ranged', activeStart: 0.1, activeEnd: 0.1, recoveryEnd: 0.5, releaseMarker: 'ReleaseArrow' });
  assert.equal(rangedGood.valid, true);
});

test('motion quality gate failure overrides high score', () => {
  const result = scoreVibeMotionQuality({
    coverage: 100,
    transition: 100,
    combatSync: 100,
    footStability: 100,
    rootMotion: 100,
    retarget: 100,
    readability: 100,
    performance: 100,
    repetition: 100
  }, { gateFailures: ['attack-hit-timing-mismatch'] });
  assert.equal(result.average, 100);
  assert.equal(result.decision, 'REVISE');
});

test('verified motion learning record only becomes reusable with evidence', () => {
  const bad = createVibeMotionLearningRecord({ problem: 'foot sliding', solution: 'turn state', verified: true });
  assert.equal(bad.reusable, false);
  const good = createVibeMotionLearningRecord({ problem: 'foot sliding', solution: 'turn state', evidence: 'qa-run-1', verified: true });
  assert.equal(good.reusable, true);
});

test('experience memory rejects unverified attempts and retrieves verified evidence', () => {
  let memory = createVibeExperienceMemory();
  const rejected = addVibeExperience(memory, {
    engine: 'unreal',
    taskType: 'motion',
    problem: '4족 방향전환 발 미끄러짐',
    change: 'turn state 적용',
    outcome: 'PASS',
    evidence: [],
    verified: false
  });
  assert.equal(rejected.added, false);
  const accepted = addVibeExperience(memory, {
    engine: 'unreal',
    departments: ['development', 'qa', 'graphics'],
    taskType: 'motion',
    problem: '4족 방향전환 발 미끄러짐',
    change: 'turn state와 root rotation 제한 적용',
    outcome: 'PASS',
    evidence: ['qa-motion-run-12'],
    reusablePatterns: ['4족 turn state'],
    verified: true
  });
  assert.equal(accepted.added, true);
  memory = accepted.memory;
  const result = searchVibeExperience(memory, { engine: 'unreal', taskType: 'motion', problem: '4족 발 미끄러짐' });
  assert.equal(result.count, 1);
  assert.equal(result.matches[0].record.verified, true);
});

test('continuous queue gives owner directive priority and chains short work', () => {
  let queue = createVibeContinuousQueue([
    { id: 'normal', target: 'unity', goal: '일반 작업', priority: 'normal' },
    { id: 'owner', target: 'unreal', goal: '사용자 즉시 작업', priority: 'owner-immediate', ownerDirective: true }
  ]);
  let next = selectNextVibeQueueTask(queue);
  assert.equal(next.selected.id, 'owner');
  const started = beginVibeQueueTask(queue, 'owner');
  assert.equal(started.started, true);
  queue = started.queue;
  const finished = finishVibeQueueTask(queue, { taskId: 'owner', outcome: 'PASS', evidence: ['qa-pass'] });
  assert.equal(finished.dispatchNext, true);
  assert.equal(finished.next.selected.id, 'normal');
  assert.equal(finished.longRunningProcessRequired, false);
});

test('continuous queue blocks unsafe autonomous tasks', () => {
  const queue = createVibeContinuousQueue([
    { id: 'web-write', target: 'web', type: 'implementation', goal: 'legacy 수정' },
    { id: 'core-change', target: 'unity', goal: '핵심 규칙 변경', requiresOwnerDecision: true },
    { id: 'paid', target: 'unreal', goal: '유료 API 작업', paidResourceRequired: true }
  ]);
  const next = selectNextVibeQueueTask(queue);
  assert.equal(next.hasEligibleWork, false);
  assert.equal(next.blocked.length, 3);
});
