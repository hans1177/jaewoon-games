// 파일명: assets/vibe-continuous-queue.js
// 역할: Vibe2 작업을 DAG 의존성 + shard + source/file lock 기반 계층형 병렬 큐로 관리한다.
// 원칙: 사용자 지시 우선, 출시확정 > 개발확정, 서로 독립인 source root만 병렬, 동일 root/file 충돌 금지, 유료 자원 금지.

const clean = (value) => String(value ?? '').trim();
const freeze = (value) => Object.freeze(value);
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const freezeList = (values = []) => freeze(unique(values));
const clampInt = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
const posix = (value) => clean(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');

export const VIBE_QUEUE_STATUSES = freezeList(['queued', 'running', 'blocked', 'done', 'failed', 'cancelled']);
export const VIBE_QUEUE_PRIORITIES = freezeList(['owner-immediate', 'critical', 'high', 'normal', 'low']);
export const VIBE_RELEASE_STATES = freezeList(['release-confirmed', 'development-confirmed', 'reviewing', 'other']);
export const DEFAULT_MAX_CONCURRENT_TASKS = 4;

const PRIORITY_SCORE = freeze({ 'owner-immediate': 100, critical: 80, high: 60, normal: 40, low: 20 });
const RELEASE_STATE_SCORE = freeze({ 'release-confirmed': 400, 'development-confirmed': 300, reviewing: 200, other: 100 });
const BASE_SHARD_SLOTS = freeze({ unity: 1, web: 1, verification: 1, support: 1 });

function normalizeReleaseState(value) {
  const state = clean(value).toLowerCase();
  return VIBE_RELEASE_STATES.includes(state) ? state : 'other';
}
function inferShard(input = {}) {
  const explicit = clean(input.shard).toLowerCase();
  if (explicit) return explicit;
  const type = clean(input.type).toLowerCase();
  const department = clean(input.department).toLowerCase();
  const target = clean(input.target).toLowerCase();
  if (['inspect', 'research', 'qa'].includes(type) || department === 'qa') return 'verification';
  if (target === 'unity') return 'unity';
  if (target === 'web') return 'web';
  return 'support';
}
function inferSourceRoot(input = {}) {
  const explicit = posix(input.sourceRoot);
  if (explicit) return explicit;
  const gameId = clean(input.gameId);
  const target = clean(input.target).toLowerCase();
  if (!gameId || !target) return null;
  if (target === 'web') return `web-games/${gameId}`;
  if (target === 'unity') return `unity-games/${gameId}`;
  if (target === 'unreal') return `unreal-games/${gameId}`;
  if (target === 'godot') return `godot-games/${gameId}`;
  return `${target}:${gameId}`;
}
function normalizeCompanyContext(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const hasContext = Boolean(
    clean(source.stageId) || clean(source.role) || clean(source.artbookRef) || clean(source.assignmentAuthority) ||
    source.artbookLocked === true || source.reviewRequired === true || source.artbookPostprocessComplete === true || Number(source.artbookCutCount) > 0
  );
  if (!hasContext) return null;
  return freeze({
    stageId: clean(source.stageId) || null,
    role: clean(source.role) || null,
    assignmentAuthority: clean(source.assignmentAuthority) || null,
    sourceRef: clean(source.sourceRef) || null,
    artbookLocked: Boolean(source.artbookLocked),
    artbookRef: clean(source.artbookRef) || null,
    artbookStatus: clean(source.artbookStatus) || null,
    artbookCutCount: clampInt(source.artbookCutCount),
    artbookPostprocessComplete: Boolean(source.artbookPostprocessComplete),
    reviewRequired: source.reviewRequired !== false
  });
}
function normalizeTask(input = {}, index = 0) {
  const status = VIBE_QUEUE_STATUSES.includes(clean(input.status)) ? clean(input.status) : 'queued';
  const priority = VIBE_QUEUE_PRIORITIES.includes(clean(input.priority)) ? clean(input.priority) : 'normal';
  const task = {
    id: clean(input.id) || `task-${index + 1}`,
    gameId: clean(input.gameId) || null,
    target: clean(input.target) || 'auto',
    department: clean(input.department) || null,
    type: clean(input.type) || 'implementation',
    goal: clean(input.goal),
    responsibleFiles: freezeList(input.responsibleFiles || []),
    dependencies: freezeList(input.dependencies || []),
    priority,
    releaseState: normalizeReleaseState(input.releaseState || input.homepageCategory),
    status,
    retries: clampInt(input.retries),
    maxRetries: Math.max(0, clampInt(input.maxRetries ?? 2)),
    ownerDirective: Boolean(input.ownerDirective),
    requiresOwnerDecision: Boolean(input.requiresOwnerDecision),
    protectedChange: Boolean(input.protectedChange),
    paidResourceRequired: Boolean(input.paidResourceRequired),
    blocker: clean(input.blocker) || null,
    evidence: freezeList(input.evidence || []),
    lastOutcome: clean(input.lastOutcome) || null,
    companyContext: normalizeCompanyContext(input.companyContext),
    sourceRoot: inferSourceRoot(input),
    speculativeEligible: input.speculativeEligible === true,
    estimatedRisk: ['low','medium','high'].includes(clean(input.estimatedRisk).toLowerCase()) ? clean(input.estimatedRisk).toLowerCase() : 'low'
  };
  task.shard = inferShard(task);
  return freeze(task);
}

export function createVibeContinuousQueue(seed = {}) {
  const source = Array.isArray(seed) ? seed : Array.isArray(seed?.tasks) ? seed.tasks : [];
  const configuredMax = Array.isArray(seed) ? DEFAULT_MAX_CONCURRENT_TASKS : clampInt(seed?.maxConcurrentTasks || DEFAULT_MAX_CONCURRENT_TASKS, 1, 8);
  const tasks = source.map(normalizeTask);
  return freeze({
    version: 4,
    mode: 'hierarchical-dag-sharded-work-stealing-queue',
    maxConcurrentTasks: configuredMax,
    ownerDirectivePreemptsAutonomy: true,
    releaseStatePriority: freezeList(['release-confirmed', 'development-confirmed', 'reviewing', 'other']),
    scheduling: freeze({
      dagDependencies: true,
      hierarchicalParallelism: true,
      shardAware: true,
      workStealing: true,
      sourceRootExclusive: true,
      responsibleFileExclusive: true,
      unityReleaseFocusSlots: 1,
      baseShardSlots: BASE_SHARD_SLOTS,
      dynamicBackpressure: true,
      speculativeParallelism: 'high-risk-opt-in-only'
    }),
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
  if (task.blocker && task.status !== 'running') reasons.push(`explicit-blocker:${task.blocker}`);
  if (task.retries > task.maxRetries) reasons.push('retry-limit-exceeded');
  for (const dependency of task.dependencies) if (!completed.has(dependency)) reasons.push(`dependency-not-complete:${dependency}`);
  return freezeList(reasons);
}
function scoreTask(task, index) {
  return (task.ownerDirective ? 10000 : 0)
    + (RELEASE_STATE_SCORE[task.releaseState] || 0)
    + (PRIORITY_SCORE[task.priority] || 0)
    - index / 1000;
}
function fileLocks(task) {
  const root = posix(task.sourceRoot);
  return new Set((task.responsibleFiles || []).map(posix).filter(Boolean).map((file) => root && !file.startsWith(`${root}/`) ? `${root}/${file}` : file));
}
function lockConflict(a, b) {
  const aRoot = posix(a.sourceRoot), bRoot = posix(b.sourceRoot);
  if (aRoot && bRoot && aRoot === bRoot) return 'source-root-conflict';
  const aFiles = fileLocks(a), bFiles = fileLocks(b);
  for (const file of aFiles) if (bFiles.has(file)) return 'responsible-file-conflict';
  return null;
}
function isReleaseUnity(task) {
  return task.target === 'unity' && task.releaseState === 'release-confirmed' && !['inspect','research','qa'].includes(clean(task.type).toLowerCase());
}
function conflictsWith(task, active) {
  if (isReleaseUnity(task) && active.some(isReleaseUnity)) return 'unity-release-focus-slot-busy';
  for (const other of active) {
    const reason = lockConflict(task, other);
    if (reason) return reason;
  }
  return null;
}
function dynamicConcurrency(queue, requested = queue.maxConcurrentTasks) {
  const hardMax = clampInt(requested || queue.maxConcurrentTasks, 1, 8);
  const running = queue.tasks.filter((task) => task.status === 'running');
  const awaitingQa = running.filter((task) => /awaiting.*qa|qa.*awaiting/i.test(clean(task.blocker))).length;
  const recentFailures = queue.tasks.filter((task) => task.lastOutcome === 'FAIL' && task.retries > 0).length;
  let limit = hardMax;
  if (awaitingQa >= 3) limit = Math.min(limit, 2);
  else if (awaitingQa >= 2) limit = Math.min(limit, 3);
  if (recentFailures >= 3) limit = Math.min(limit, 2);
  return Math.max(1, limit);
}

export function selectVibeQueueBatch(queueInput, { maxConcurrentTasks = null } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const running = queue.tasks.filter((task) => task.status === 'running');
  const effectiveMax = dynamicConcurrency(queue, maxConcurrentTasks || queue.maxConcurrentTasks);
  const freeSlots = Math.max(0, effectiveMax - running.length);
  const completed = completedIds(queue);
  const blocked = [];
  const candidates = [];
  queue.tasks.forEach((task, index) => {
    if (task.status !== 'queued') return;
    const reasons = taskBlockedReasons(task, completed);
    if (reasons.length) blocked.push(freeze({ task, reasons }));
    else candidates.push(freeze({ task, score: scoreTask(task, index) }));
  });
  candidates.sort((a, b) => b.score - a.score || a.task.id.localeCompare(b.task.id));

  const selected = [];
  const deferredConflicts = [];
  const active = [...running];
  const shardUse = Object.create(null);
  for (const task of running) shardUse[task.shard] = (shardUse[task.shard] || 0) + 1;

  // 1차 fan-out: 각 shard의 기본 슬롯을 우선 채운다.
  for (const row of candidates) {
    if (selected.length >= freeSlots) break;
    const baseSlots = BASE_SHARD_SLOTS[row.task.shard] || 1;
    if ((shardUse[row.task.shard] || 0) >= baseSlots) continue;
    const conflict = conflictsWith(row.task, active);
    if (conflict) { deferredConflicts.push(freeze({ task: row.task, reason: conflict })); continue; }
    selected.push(row.task); active.push(row.task); shardUse[row.task.shard] = (shardUse[row.task.shard] || 0) + 1;
  }
  // 2차 work stealing: 비어 있는 슬롯은 shard 구분 없이 가장 높은 우선순위의 독립 작업이 가져간다.
  for (const row of candidates) {
    if (selected.length >= freeSlots) break;
    if (selected.some((task) => task.id === row.task.id)) continue;
    const conflict = conflictsWith(row.task, active);
    if (conflict) { if (!deferredConflicts.some((item) => item.task.id === row.task.id)) deferredConflicts.push(freeze({ task: row.task, reason: conflict })); continue; }
    selected.push(row.task); active.push(row.task); shardUse[row.task.shard] = (shardUse[row.task.shard] || 0) + 1;
  }

  const queuedEligible = candidates.length;
  return freeze({
    selected: freeze(selected),
    running: freeze(running),
    hasEligibleWork: selected.length > 0,
    blocked: freeze(blocked),
    deferredConflicts: freeze(deferredConflicts),
    continueRequired: selected.length > 0,
    effectiveMaxConcurrentTasks: effectiveMax,
    freeSlots,
    workStealingUsed: selected.some((task) => (shardUse[task.shard] || 0) > (BASE_SHARD_SLOTS[task.shard] || 1)),
    shardUse: freeze({ ...shardUse }),
    stopReason: selected.length ? null : freeSlots === 0 ? 'PARALLEL_CAPACITY_FULL' : queuedEligible ? 'ONLY_CONFLICTING_WORK_AVAILABLE' : blocked.length ? 'NO_ELIGIBLE_UNBLOCKED_TASK' : 'QUEUE_EMPTY_OR_COMPLETE'
  });
}

export function selectNextVibeQueueTask(queueInput) {
  const queue = createVibeContinuousQueue(queueInput);
  const batch = selectVibeQueueBatch(queue, { maxConcurrentTasks: 1 });
  const running = queue.tasks.filter((task) => task.status === 'running');
  return freeze({
    selected: batch.selected[0] || null,
    runningTask: running[0] || null,
    hasEligibleWork: Boolean(batch.selected[0]),
    blocked: batch.blocked,
    continueRequired: Boolean(batch.selected[0]),
    stopReason: batch.stopReason,
    runningCount: running.length
  });
}

export function beginVibeQueueTask(queueInput, taskId, { maxConcurrentTasks = null } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskId);
  const existing = queue.tasks.find((task) => task.id === id);
  if (existing?.status === 'running') return freeze({ started: true, task: existing, queue, resumed: true });
  const batch = selectVibeQueueBatch(queue, { maxConcurrentTasks: maxConcurrentTasks || queue.maxConcurrentTasks });
  if (!batch.selected.some((task) => task.id === id)) return freeze({ started: false, reason: 'task-not-currently-eligible-or-conflicts', queue, selection: batch });
  const tasks = queue.tasks.map((task) => task.id === id ? freeze({ ...task, status: 'running', blocker: null }) : task);
  const nextQueue = createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks });
  return freeze({ started: true, task: nextQueue.tasks.find((task) => task.id === id), queue: nextQueue, resumed: false });
}

export function beginVibeQueueBatch(queueInput, { maxConcurrentTasks = null } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const selection = selectVibeQueueBatch(queue, { maxConcurrentTasks: maxConcurrentTasks || queue.maxConcurrentTasks });
  if (!selection.selected.length) return freeze({ started: false, tasks: freeze([]), queue, selection });
  const ids = new Set(selection.selected.map((task) => task.id));
  const tasks = queue.tasks.map((task) => ids.has(task.id) ? freeze({ ...task, status: 'running', blocker: null }) : task);
  const nextQueue = createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks });
  return freeze({ started: true, tasks: freeze(nextQueue.tasks.filter((task) => ids.has(task.id))), queue: nextQueue, selection });
}

export function finishVibeQueueTask(queueInput, { taskId = '', outcome = 'PASS', evidence = [], blocker = '', retryable = true } = {}) {
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
    return freeze({ ...task, status: canRetry ? 'queued' : 'failed', retries: nextRetries, evidence: mergedEvidence, lastOutcome: 'FAIL', blocker: canRetry ? null : (clean(blocker) || 'retry-limit-exceeded') });
  });
  const nextQueue = createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks });
  const next = selectVibeQueueBatch(nextQueue);
  return freeze({ updated: found, outcome: normalizedOutcome, queue: nextQueue, next, dispatchNext: next.continueRequired, longRunningProcessRequired: false });
}

export function summarizeVibeContinuousQueue(queueInput) {
  const queue = createVibeContinuousQueue(queueInput);
  const counts = Object.fromEntries(VIBE_QUEUE_STATUSES.map((status) => [status, queue.tasks.filter((task) => task.status === status).length]));
  const next = selectVibeQueueBatch(queue);
  return freeze({
    version: 4,
    counts: freeze(counts),
    nextTaskId: next.selected[0]?.id || null,
    nextTaskIds: freezeList(next.selected.map((task) => task.id)),
    runningTaskId: next.running[0]?.id || null,
    runningTaskIds: freezeList(next.running.map((task) => task.id)),
    nextReleaseState: next.selected[0]?.releaseState || null,
    continueRequired: next.continueRequired,
    stopReason: next.stopReason,
    ownerDirectiveWaiting: queue.tasks.some((task) => task.ownerDirective && ['queued', 'running', 'blocked'].includes(task.status)),
    maxConcurrentTasks: queue.maxConcurrentTasks,
    effectiveMaxConcurrentTasks: next.effectiveMaxConcurrentTasks,
    freeSlots: next.freeSlots,
    shardUse: next.shardUse,
    workStealingUsed: next.workStealingUsed
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeContinuousQueue = freeze({ createVibeContinuousQueue, selectNextVibeQueueTask, selectVibeQueueBatch, beginVibeQueueTask, beginVibeQueueBatch, finishVibeQueueTask, summarizeVibeContinuousQueue });
}
