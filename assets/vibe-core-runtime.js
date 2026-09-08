// 파일명: assets/vibe-core-runtime.js
// 역할: Vibe2 workbench, 엔진 어댑터, Motion Core, 경험 메모리, 연속 작업 큐를 하나의 공식 계획 진입점으로 묶는다.
// 원칙: 이 계층은 계획·검증·학습 문맥만 결합하며 게임 권위 수치나 사용자 승인 권한을 확대하지 않는다.

import { planVibeWorkbenchTask } from './vibe-workbench.js';
import { createVibeLearningContext, addVibeExperience, createVibeExperienceMemory } from './vibe-experience-memory.js';
import { createVibeMotionContract, validateVibeMotionContract } from './vibe-motion-core.js';
import { createVibeContinuousQueue, selectNextVibeQueueTask, beginVibeQueueTask, finishVibeQueueTask } from './vibe-continuous-queue.js';

const clean = (value) => String(value ?? '').trim();
const freeze = (value) => Object.freeze(value);
const unique = (values = []) => [...new Set(values.map(clean).filter(Boolean))];
const freezeList = (values = []) => freeze(unique(values));

function stableHash(value = '') {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function motionRequested(workbench) {
  return workbench?.qualityKeys?.includes('animation') || /모션|애니메이션|animation|montage|blend space|state machine|animator|retarget|리타게팅|ik rig|control rig/i.test(clean(workbench?.request));
}

function inferDepartments(workbench, departments = []) {
  const explicit = unique(departments);
  if (explicit.length) return explicit;
  const result = ['development', 'qa'];
  if (workbench?.qualityKeys?.some((key) => ['visual', 'animation', 'vfx'].includes(key))) result.push('graphics');
  if (workbench?.affectedSystems?.includes('밸런스/규칙')) result.push('balance');
  return unique(result);
}

function normalizeMotionInput(workbench, motion = null) {
  if (!motionRequested(workbench)) return null;
  if (!motion || !Array.isArray(motion.states) || motion.states.length === 0) {
    return freeze({
      required: true,
      contract: null,
      validation: null,
      status: 'MOTION_CONTRACT_REQUIRED',
      engine: workbench.target,
      requiredEvidence: freezeList(['actual-motion-clips', 'runtime-transition', 'combat-sync', 'retarget-if-used', 'performance'])
    });
  }
  const contract = createVibeMotionContract({
    actorId: motion.actorId || '',
    actorType: motion.actorType || 'character',
    engine: workbench.target,
    states: motion.states,
    requiredStates: motion.requiredStates,
    transitions: motion.transitions,
    mobileFirst: motion.mobileFirst !== false
  });
  const validation = validateVibeMotionContract(contract);
  return freeze({
    required: true,
    contract,
    validation,
    status: validation.valid ? 'MOTION_CONTRACT_VALID' : 'MOTION_CONTRACT_REVISE',
    engine: workbench.target,
    requiredEvidence: freezeList(['actual-motion-clips', 'runtime-transition', 'combat-sync', 'retarget-if-used', 'performance'])
  });
}

function executionGate(workbench, motionContext) {
  const reasons = [];
  if (workbench?.engineAdapter?.mayWriteSource !== true) reasons.push('source-read-only');
  if (workbench?.companyDevelopment?.ownerGateRequired && !workbench?.companyDevelopment?.executionBeforeGateAllowed) reasons.push('company-owner-gate-required');
  if (workbench?.companyDevelopment?.proposalApproval?.changeRequestRequired) reasons.push('company-change-request-required');
  if (motionContext?.validation && !motionContext.validation.valid) reasons.push('motion-contract-invalid');
  return freeze({
    mayExecute: reasons.length === 0,
    reasons: freezeList(reasons),
    authority: 'vibe2-safety-gate-does-not-replace-company-owner-gate'
  });
}

export function createVibeCoreQueueTask(plan, {
  taskId = '',
  priority = '',
  ownerDirective = false,
  department = '',
  dependencies = [],
  maxRetries = 2
} = {}) {
  if (!plan?.workbench) throw new Error('vibe core plan required');
  const wb = plan.workbench;
  const id = clean(taskId) || `vibe-${stableHash([wb.gameId, wb.target, wb.mode, wb.request].join('|'))}`;
  const requiresOwnerDecision = plan.executionGate.reasons.includes('company-owner-gate-required');
  return freeze({
    id,
    gameId: wb.gameId,
    target: wb.target,
    department: clean(department) || plan.departments[0] || 'development',
    type: wb.mode === 'inspect' ? 'inspect' : 'implementation',
    goal: wb.request,
    responsibleFiles: freezeList(wb.editBrief?.responsibleFiles || []),
    dependencies: freezeList(dependencies),
    priority: clean(priority) || (ownerDirective ? 'owner-immediate' : wb.priority === 'critical' ? 'critical' : wb.priority === 'high' ? 'high' : 'normal'),
    ownerDirective: Boolean(ownerDirective),
    requiresOwnerDecision,
    protectedChange: false,
    paidResourceRequired: false,
    maxRetries: Math.max(0, Math.floor(Number(maxRetries) || 0)),
    status: 'queued'
  });
}

export function planVibeCoreTask({
  request = '',
  target = 'auto',
  gameId = null,
  file = null,
  knownBroken = false,
  artbook = null,
  artbookStatus = '',
  artbookCutCount = 0,
  artbookPostprocessComplete = null,
  artbookRef = '',
  experienceMemory = null,
  departments = [],
  motion = null,
  queue = null,
  ownerDirective = false
} = {}) {
  const prompt = clean(request);
  if (!prompt) throw new Error('vibe core request required');
  const workbench = planVibeWorkbenchTask({
    request: prompt,
    target,
    gameId,
    file,
    knownBroken,
    artbook,
    artbookStatus,
    artbookCutCount,
    artbookPostprocessComplete,
    artbookRef
  });
  const resolvedDepartments = freezeList(inferDepartments(workbench, departments));
  const memory = createVibeExperienceMemory(experienceMemory || {});
  const learning = createVibeLearningContext(memory, {
    engine: workbench.target,
    taskType: motionRequested(workbench) ? 'motion' : workbench.mode,
    departments: resolvedDepartments,
    goal: prompt,
    text: `${prompt} ${(workbench.affectedSystems || []).join(' ')} ${(workbench.qualitySystems || []).join(' ')}`
  }, { limit: 5, minimumScore: 1 });
  const motionContext = normalizeMotionInput(workbench, motion);
  const gate = executionGate(workbench, motionContext);
  const basePlan = freeze({
    version: 1,
    request: prompt,
    target: workbench.target,
    gameId: workbench.gameId,
    departments: resolvedDepartments,
    workbench,
    engineAdapter: workbench.engineAdapter,
    learning,
    motion: motionContext,
    executionGate: gate,
    qa: freezeList([...(workbench.editBrief?.requiredChecks || []), ...(workbench.engineAdapter?.qa || []), ...(motionContext?.requiredEvidence || [])]),
    authority: freeze({
      gameplayResults: 'engine',
      ownerCoreDecision: 'company-owner-gate',
      learning: 'planning-context-only',
      motion: 'timing-and-quality-only',
      sourceWrite: workbench.engineAdapter?.mayWriteSource === true
    })
  });
  const task = createVibeCoreQueueTask(basePlan, { ownerDirective });
  const currentQueue = createVibeContinuousQueue(queue || [task]);
  const queueHasTask = currentQueue.tasks.some((item) => item.id === task.id);
  const effectiveQueue = queueHasTask ? currentQueue : createVibeContinuousQueue([...currentQueue.tasks, task]);
  return freeze({ ...basePlan, queue: effectiveQueue, queueTask: task, next: selectNextVibeQueueTask(effectiveQueue) });
}

export function beginVibeCoreTask(plan) {
  if (!plan?.queueTask?.id || !plan?.queue) throw new Error('vibe core plan queue required');
  if (!plan.executionGate.mayExecute) {
    return freeze({ started: false, reason: 'execution-gate-blocked', gate: plan.executionGate, queue: plan.queue });
  }
  return beginVibeQueueTask(plan.queue, plan.queueTask.id);
}

export function recordVibeCoreOutcome({
  plan,
  queue = null,
  experienceMemory = null,
  outcome = 'PASS',
  evidence = [],
  verified = false,
  problem = '',
  change = '',
  failureCause = '',
  reusablePatterns = [],
  avoidPatterns = [],
  qa = [],
  build = '',
  retryable = true,
  blocker = ''
} = {}) {
  if (!plan?.queueTask?.id) throw new Error('vibe core plan required');
  const proof = freezeList(evidence);
  const currentQueue = createVibeContinuousQueue(queue || plan.queue || [plan.queueTask]);
  const queueResult = finishVibeQueueTask(currentQueue, {
    taskId: plan.queueTask.id,
    outcome,
    evidence: proof,
    blocker,
    retryable
  });
  const learningResult = addVibeExperience(experienceMemory || {}, {
    gameId: plan.gameId || '',
    engine: plan.target,
    departments: plan.departments || [],
    taskType: plan.motion?.required ? 'motion' : plan.workbench?.mode || 'general',
    problem: clean(problem) || clean(blocker),
    goal: plan.request,
    change,
    outcome,
    failureCause,
    qa,
    build,
    evidence: proof,
    reusablePatterns,
    avoidPatterns,
    verified
  });
  return freeze({
    version: 1,
    queue: queueResult,
    learning: learningResult,
    dispatchNext: queueResult.dispatchNext,
    mayReuseLearning: learningResult.added === true,
    authority: 'verified-outcome-recording-only'
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeCoreRuntime = freeze({
    planVibeCoreTask,
    createVibeCoreQueueTask,
    beginVibeCoreTask,
    recordVibeCoreOutcome
  });
}
