// 파일명: assets/vibe-continuous-queue.js
// 역할: Vibe2의 24시간 연속 작업을 짧은 검증 단위의 작업 큐로 관리한다.
// 원칙: 사용자 지시 우선, 무한 재시도 금지, 핵심 결정/보호 변경은 자동 진행하지 않는다.

const clean = (value) => String(value ?? '').trim();
const freeze = (value) => Object.freeze(value);
const unique = (values = []) => [...new Set(values.map(clean).filter(Boolean))];
const freezeList = (values = []) => freeze(unique(values));
const clampInt = (value, min = 0) => Math.max(min, Math.floor(Number(value) || 0));

export const VIBE_QUEUE_STATUSES = freezeList(['queued', 'running', 'blocked', 'done', 'failed', 'cancelled']);
export const VIBE_QUEUE_PRIORITIES = freezeList(['owner-immediate', 'critical', 'high', 'normal', 'low']);

const PRIORITY_SCORE = freeze({
  'owner-immediate': 100,
  critical: 80,
  high: 60,
  normal: 40,
  low: 20
});

function normalizeTask(input = {}, index = 0) {
  const status = VIBE_QUEUE_STATUSES.includes(clean(input.status)) ? clean(input.status) : 'queued';
  const priority = VIBE_QUEUE_PRIORITIES.includes(clean(input.priority)) ? clean(input.priority) : 'normal';
  return freeze({
    id: clean(input.id) || `task-${index + 1}`,
    gameId: clean(input.gameId) || null,
    target: clean(input.target) || 'auto',
    department: clean(input.department) || null,
    type: clean(input.type) || 'implementation',
    goal: clean(input.goal),
    responsibleFiles: freezeList(input.responsibleFiles || []),
    dependencies: freezeList(input.dependencies || []),
    priority,
    status,
    retries: clampInt(input.retries),
    maxRetries: Math.max(0, clampInt(input.maxRetries ?? 2)),
    ownerDirective: Boolean(input.ownerDirective),
    requiresOwnerDecision: Boolean(input.requiresOwnerDecision),
    protectedChange: Boolean(input.protectedChange),
    paidResourceRequired: Boolean(input.paidResourceRequired),
    blocker: clean(input.blocker) || null,
    evidence: freezeList(input.evidence || []),
    lastOutcome: clean(input.lastOutcome) || null
  });
}

export function createVibeContinuousQueue(seed = {}) {
  const source = Array.isArray(seed) ? seed : Array.isArray(seed?.tasks) ? seed.tasks : [];
  const tasks = source.map(normalizeTask);
  return freeze({
    version: 1,
    mode: 'short-verified-work-chains',
    longRunningSingleJobRequired: false,
    ownerDirectivePreemptsAutonomy: true,
    defaultMaxRetries: 2,
    tasks: freeze(tasks)
  });
}

function completedIds(queue) {
  return new Set(queue.tasks.filter((task) => task.status === 'done').map((task) => task.id));
}

function taskBlockedReasons(task, completed) {
  const reasons = [];
  if (!task.goal) reasons.push('goal-required');
  if (task.requiresOwnerDecision) reasons.push('owner-decision-required');
  if (task.protectedChange) reasons.push('protected-change-requires-authorization');
  if (task.paidResourceRequired) reasons.push('paid-resource-forbidden');
  if (task.blocker) reasons.push(`explicit-blocker:${task.blocker}`);
  if (task.retries > task.maxRetries) reasons.push('retry-limit-exceeded');
  for (const dependency of task.dependencies) if (!completed.has(dependency)) reasons.push(`dependency-not-complete:${dependency}`);
  if (task.target === 'web' && task.type !== 'inspect' && task.type !== 'research' && task.type !== 'qa') reasons.push('web-games-read-only');
  return freezeList(reasons);
}

function scoreTask(task, index) {
  return (PRIORITY_SCORE[task.priority] || 0) + (task.ownerDirective ? 1000 : 0) - index / 1000;
}

export function selectNextVibeQueueTask(queueInput) {
  const queue = createVibeContinuousQueue(queueInput);
  const completed = completedIds(queue);
  const candidates = [];
  const blocked = [];
  queue.tasks.forEach((task, index) => {
    if (task.status !== 'queued') return;
    const reasons = taskBlockedReasons(task, completed);
    if (reasons.length) blocked.push(freeze({ task, reasons }));
    else candidates.push(freeze({ task, score: scoreTask(task, index) }));
  });
  candidates.sort((a, b) => b.score - a.score || a.task.id.localeCompare(b.task.id));
  const selected = candidates[0]?.task || null;
  return freeze({
    selected,
    hasEligibleWork: Boolean(selected),
    blocked: freeze(blocked),
    continueRequired: Boolean(selected),
    stopReason: selected ? null : blocked.length ? 'NO_ELIGIBLE_UNBLOCKED_TASK' : 'QUEUE_EMPTY_OR_COMPLETE'
  });
}

export function beginVibeQueueTask(queueInput, taskId) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskId);
  const selection = selectNextVibeQueueTask(queue);
  if (!selection.selected || selection.selected.id !== id) {
    return freeze({ started: false, reason: 'task-not-currently-eligible', queue, selection });
  }
  const tasks = queue.tasks.map((task) => task.id === id ? freeze({ ...task, status: 'running' }) : task);
  return freeze({ started: true, task: tasks.find((task) => task.id === id), queue: createVibeContinuousQueue(tasks) });
}

export function finishVibeQueueTask(queueInput, {
  taskId = '',
  outcome = 'PASS',
  evidence = [],
  blocker = '',
  retryable = true
} = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskId);
  const normalizedOutcome = ['PASS', 'FAIL', 'BLOCKED', 'CANCELLED'].includes(clean(outcome).toUpperCase()) ? clean(outcome).toUpperCase() : 'FAIL';
  let found = false;
  const tasks = queue.tasks.map((task) => {
    if (task.id !== id) return task;
    found = true;
    const mergedEvidence = freezeList([...(task.evidence || []), ...(evidence || [])]);
    if (normalizedOutcome === 'PASS') return freeze({ ...task, status: 'done', evidence: mergedEvidence, lastOutcome: 'PASS', blocker: null });
    if (normalizedOutcome === 'BLOCKED') return freeze({ ...task, status: 'blocked', evidence: mergedEvidence, lastOutcome: 'BLOCKED', blocker: clean(blocker) || 'blocked' });
    if (normalizedOutcome === 'CANCELLED') return freeze({ ...task, status: 'cancelled', evidence: mergedEvidence, lastOutcome: 'CANCELLED', blocker: clean(blocker) || null });
    const nextRetries = task.retries + 1;
    const canRetry = Boolean(retryable && nextRetries <= task.maxRetries);
    return freeze({
      ...task,
      status: canRetry ? 'queued' : 'failed',
      retries: nextRetries,
      evidence: mergedEvidence,
      lastOutcome: 'FAIL',
      blocker: clean(blocker) || null
    });
  });
  const nextQueue = createVibeContinuousQueue(tasks);
  const next = selectNextVibeQueueTask(nextQueue);
  return freeze({
    updated: found,
    outcome: normalizedOutcome,
    queue: nextQueue,
    next,
    dispatchNext: next.continueRequired,
    longRunningProcessRequired: false
  });
}

export function summarizeVibeContinuousQueue(queueInput) {
  const queue = createVibeContinuousQueue(queueInput);
  const counts = Object.fromEntries(VIBE_QUEUE_STATUSES.map((status) => [status, queue.tasks.filter((task) => task.status === status).length]));
  const next = selectNextVibeQueueTask(queue);
  return freeze({
    version: 1,
    counts: freeze(counts),
    nextTaskId: next.selected?.id || null,
    continueRequired: next.continueRequired,
    stopReason: next.stopReason,
    ownerDirectiveWaiting: queue.tasks.some((task) => task.ownerDirective && ['queued', 'running', 'blocked'].includes(task.status))
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeContinuousQueue = freeze({
    createVibeContinuousQueue,
    selectNextVibeQueueTask,
    beginVibeQueueTask,
    finishVibeQueueTask,
    summarizeVibeContinuousQueue
  });
}
