// 파일명: qa/vibe2-core-engine-motion.test.mjs
// 역할: Vibe2 엔진 어댑터, Core Runtime, Motion, 경험 학습, 병렬 우선순위 큐를 회귀검사한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { detectVibeEngineTarget, createVibeEngineAdapter, validateVibeEngineAdapter } from '../assets/vibe-engine-adapter.js';
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
import { createVibeExperienceMemory, addVibeExperience, searchVibeExperience } from '../assets/vibe-experience-memory.js';
import { createVibeContinuousQueue, selectNextVibeQueueTask, selectVibeQueueBatch, beginVibeQueueTask, finishVibeQueueTask } from '../assets/vibe-continuous-queue.js';

test('engine adapters expose Unreal and existing web maintenance contracts', () => {
  assert.equal(detectVibeEngineTarget('언리얼 UE5 블루프린트'), 'unreal');
  const unreal = createVibeEngineAdapter({ target: 'unreal', gameSlug: 'motion-test' });
  assert.equal(unreal.mayWriteSource, true);
  assert(unreal.source.ignoredPaths.includes('unreal-games/motion-test/Intermediate/**'));
  assert.equal(validateVibeEngineAdapter(unreal).valid, true);

  const web = createVibeEngineAdapter({ target: 'web', gameSlug: 'legacy' });
  assert.equal(web.mayWriteSource, true);
  assert.equal(web.webArchiveReadOnly, false);
  assert.equal(web.webMaintenanceOnly, true);
  assert.equal(web.source.newGameAutomatic, false);
  assert.equal(validateVibeEngineAdapter(web).valid, true);
});

test('workbench permits existing web source maintenance', () => {
  const plan = planVibeWorkbenchTask({ request: '기존 웹게임 버튼 오류 수정', target: 'web', gameId: 'legacy' });
  const brief = createVibeEditBrief({ request: '기존 웹게임 버튼 오류 수정', target: 'web', gameId: 'legacy' });
  assert.equal(plan.target, 'web');
  assert.equal(plan.applyPolicy.sourceWriteAllowed, true);
  assert.equal(plan.applyPolicy.webArchiveReadOnly, false);
  assert.equal(brief.outputContract.sourceWriteAllowed, true);
});

test('core runtime composes verified Unreal learning and motion', () => {
  const seeded = addVibeExperience(createVibeExperienceMemory(), {
    gameId: 'old-game', engine: 'unreal', departments: ['development', 'qa'], taskType: 'motion',
    problem: '공격 모션 전환 끊김', change: 'Montage blend 조정', outcome: 'PASS',
    evidence: ['old-qa-1'], reusablePatterns: ['Montage blend 검증'], verified: true
  });
  const plan = planVibeCoreTask({
    request: '캐릭터 공격 모션 개선', target: 'unreal', gameId: 'motion-test', experienceMemory: seeded.memory,
    ownerDirective: true,
    motion: {
      actorId: 'hero',
      states: [
        { id: 'idle', clips: ['Idle'] }, { id: 'move', clips: ['Run'] }, { id: 'attack', clips: ['Attack01'] },
        { id: 'hit', clips: ['Hit01'] }, { id: 'death', clips: ['Death01'] }
      ],
      transitions: { idle: ['move','attack','hit','death'], move: ['idle','attack','hit','death'], attack: ['idle','move','hit','death'], hit: ['idle','move','death'], death: [] }
    }
  });
  assert.equal(plan.executionGate.mayExecute, true);
  assert.equal(plan.learning.records.length, 1);
  assert.equal(plan.motion.status, 'MOTION_CONTRACT_VALID');
  const started = beginVibeCoreTask(plan);
  assert.equal(started.started, true);
  const recorded = recordVibeCoreOutcome({
    plan, queue: started.queue, experienceMemory: seeded.memory, outcome: 'PASS', evidence: ['new-qa-1'], verified: true,
    problem: '공격 모션 전환 끊김', change: 'Blend와 타격 타이밍 동기화', reusablePatterns: ['공격 blend + hit timing']
  });
  assert.equal(recorded.learning.added, true);
  assert.equal(recorded.mayReuseLearning, true);
});

test('invalid required motion blocks execution', () => {
  const plan = planVibeCoreTask({
    request: '캐릭터 공격 모션 개선', target: 'unreal', gameId: 'motion-test',
    motion: {
      states: [{ id: 'idle', clips: ['Idle'] }, { id: 'move', clips: ['Move'] }, { id: 'attack', clips: [] }, { id: 'hit', clips: ['Hit'] }, { id: 'death', clips: ['Death'] }],
      transitions: { idle: ['move'], move: ['idle'], attack: ['idle'], hit: ['idle'], death: [] }
    }
  });
  assert.equal(plan.executionGate.mayExecute, false);
  assert(plan.executionGate.reasons.includes('motion-contract-invalid'));
});

test('motion contract and combat timing gates remain enforced', () => {
  const contract = createVibeMotionContract({
    actorId: 'hero', engine: 'unreal',
    states: [{ id: 'idle', clips: ['Idle'] }, { id: 'move', clips: ['Run'] }, { id: 'attack', clips: ['Attack'] }, { id: 'hit', clips: ['Hit'] }, { id: 'death', clips: ['Death'] }],
    transitions: { idle: ['move','attack'], move: ['idle','attack'], attack: ['idle'], hit: ['idle'], death: [] }
  });
  assert.equal(validateVibeMotionContract(contract).valid, true);
  assert.equal(validateVibeMotionTransition(contract, { from: 'death', to: 'idle' }).valid, false);
  assert.equal(createVibeCombatMotionSync({ actionType: 'melee', activeStart: 0.2, activeEnd: 0.4, recoveryEnd: 0.8 }).valid, false);
  assert.equal(createVibeCombatMotionSync({ actionType: 'melee', activeStart: 0.2, activeEnd: 0.4, recoveryEnd: 0.8, hitMarker: 'HitWindow' }).valid, true);
});

test('motion quality hard failure overrides perfect average', () => {
  const result = scoreVibeMotionQuality({ coverage:100, transition:100, combatSync:100, footStability:100, rootMotion:100, retarget:100, readability:100, performance:100, repetition:100 }, { gateFailures:['attack-hit-timing-mismatch'] });
  assert.equal(result.average, 100);
  assert.equal(result.decision, 'REVISE');
});

test('only verified evidence becomes reusable learning', () => {
  const bad = createVibeMotionLearningRecord({ problem:'foot sliding', solution:'turn state', verified:true });
  const good = createVibeMotionLearningRecord({ problem:'foot sliding', solution:'turn state', evidence:'qa-run-1', verified:true });
  assert.equal(bad.reusable, false);
  assert.equal(good.reusable, true);

  let memory = createVibeExperienceMemory();
  assert.equal(addVibeExperience(memory, { engine:'unreal', taskType:'motion', problem:'slide', change:'turn', outcome:'PASS', verified:false }).added, false);
  const accepted = addVibeExperience(memory, { engine:'unreal', taskType:'motion', problem:'slide', change:'turn', outcome:'PASS', evidence:['qa-1'], reusablePatterns:['turn state'], verified:true });
  memory = accepted.memory;
  assert.equal(searchVibeExperience(memory, { engine:'unreal', taskType:'motion', problem:'slide' }).count, 1);
});

test('queue priority is owner directive then release state then task priority', () => {
  const queue = createVibeContinuousQueue([
    { id:'dev-unity', target:'unity', gameId:'dev-unity', sourceRoot:'unity-games/dev-unity', goal:'개발확정', releaseState:'development-confirmed', priority:'critical' },
    { id:'release-web', target:'web', gameId:'release-web', sourceRoot:'web-games/release-web', goal:'출시확정', releaseState:'release-confirmed', priority:'normal' },
    { id:'owner', target:'unity', gameId:'owner', sourceRoot:'unity-games/owner', goal:'사용자 지시', releaseState:'other', priority:'owner-immediate', ownerDirective:true }
  ]);
  assert.equal(selectNextVibeQueueTask(queue).selected.id, 'owner');
  const afterOwner = finishVibeQueueTask(beginVibeQueueTask(queue, 'owner').queue, { taskId:'owner', outcome:'PASS', evidence:['qa'] });
  assert.equal(afterOwner.next.selected[0].id, 'release-web');
});

test('running task allows another independent source root but blocks its own root', () => {
  let queue = createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[
    { id:'release', gameId:'release', sourceRoot:'web-games/release', target:'web', goal:'출시확정 유지보수', releaseState:'release-confirmed' },
    { id:'same-root', gameId:'release', sourceRoot:'web-games/release', target:'web', goal:'같은 루트 후속 작업', releaseState:'development-confirmed' },
    { id:'dev', gameId:'dev', sourceRoot:'unity-games/dev', target:'unity', goal:'개발확정 작업', releaseState:'development-confirmed' }
  ]});
  queue = beginVibeQueueTask(queue, 'release').queue;
  const next = selectVibeQueueBatch(queue);
  assert.equal(next.selected.some(task=>task.id==='dev'), true);
  assert.equal(next.selected.some(task=>task.id==='same-root'), false);
  assert.equal(next.deferredConflicts.some(row=>row.task.id==='same-root'), true);
});

test('protected or paid autonomous work remains blocked while web maintenance is eligible', () => {
  const queue = createVibeContinuousQueue([
    { id:'web-maintenance', target:'web', gameId:'web-maintenance', sourceRoot:'web-games/web-maintenance', goal:'기존 웹게임 버튼 버그 수정', releaseState:'release-confirmed' },
    { id:'core-change', target:'unity', gameId:'core-change', sourceRoot:'unity-games/core-change', goal:'핵심 규칙 변경', requiresOwnerDecision:true },
    { id:'paid', target:'unreal', gameId:'paid', sourceRoot:'unreal-games/paid', goal:'유료 API 작업', paidResourceRequired:true }
  ]);
  const next = selectNextVibeQueueTask(queue);
  assert.equal(next.selected.id, 'web-maintenance');
  assert.equal(next.blocked.length, 2);
});
