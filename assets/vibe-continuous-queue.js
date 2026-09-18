// 파일명: assets/vibe-continuous-queue.js
// 역할: Vibe2 작업을 DAG 의존성 + shard + source/file lock 기반 계층형 병렬 큐로 관리한다.
// 원칙: 사용자 지시 우선, 출시확정 > 개발확정, 서로 독립인 source root만 병렬, 동일 root/file 충돌 금지, 유료 자원 금지.

const clean = (value) => String(value ?? '').trim();
const freeze = (value) => Object.freeze(value);
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const freezeList = (values = []) => freeze(unique(values));
const CANONICAL_POLICY_EVIDENCE='central-policy:company-learning/platform-release-roadmap.json';
const LEGACY_POLICY_EVIDENCE='central-policy:COMPANY_FLOW.md';
function normalizeEvidence(values=[]){
  const rows=unique(values);
  const hadLegacy=rows.includes(LEGACY_POLICY_EVIDENCE);
  const filtered=rows.filter(value=>value!==LEGACY_POLICY_EVIDENCE);
  if(hadLegacy&&!filtered.includes(CANONICAL_POLICY_EVIDENCE))filtered.unshift(CANONICAL_POLICY_EVIDENCE);
  return filtered;
}
const clampInt = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
const posix = (value) => clean(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');

export const VIBE_QUEUE_STATUSES = freezeList(['queued', 'running', 'blocked', 'done', 'failed', 'cancelled']);
export const VIBE_QUEUE_PRIORITIES = freezeList(['owner-immediate', 'critical', 'high', 'normal', 'low']);
export const VIBE_RELEASE_STATES = freezeList(['release-confirmed', 'development-confirmed', 'reviewing', 'other']);
export const DEFAULT_MAX_CONCURRENT_TASKS = 20;

const PRIORITY_SCORE = freeze({ 'owner-immediate': 100, critical: 80, high: 60, normal: 40, low: 20 });
const RELEASE_STATE_SCORE = freeze({ 'release-confirmed': 400, 'development-confirmed': 300, reviewing: 200, other: 100 });
const BASE_SHARD_SLOTS = freeze({ unity: 3, web: 7, verification: 5, support: 5 });

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
function normalizePackageContext(input = {}) {
  const source=input&&typeof input==='object'?input:{};
  if(!clean(source.explorationMode)&&!clean(source.sourceRoot)&&!(source.responsibleFiles||[]).length)return null;
  return freeze({
    explorationMode:clean(source.explorationMode)||'dedicated-exploration-worker-handoff',
    explorationRequired:source.explorationRequired!==false,
    sharedPreparation:source.sharedPreparation!==false,
    sourceRoot:posix(source.sourceRoot)||null,
    responsibleFiles:freezeList(source.responsibleFiles||[]),
    diagnosticEvidence:freezeList(source.diagnosticEvidence||[]),
    roles:freeze({...((source.roles&&typeof source.roles==='object')?source.roles:{})})
  });
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
    evidence: freezeList(normalizeEvidence(input.evidence || [])),
    lastOutcome: clean(input.lastOutcome) || null,
    reservationId: clean(input.reservationId) || null,
    reservationRunId: clean(input.reservationRunId) || null,
    reservationRunAttempt: clampInt(input.reservationRunAttempt || 0, 0, 1000000),
    reservedAt: clean(input.reservedAt) || null,
    companyContext: normalizeCompanyContext(input.companyContext),
    sourceRoot: inferSourceRoot(input),
    speculativeEligible: input.speculativeEligible === true,
    estimatedRisk: ['low','medium','high'].includes(clean(input.estimatedRisk).toLowerCase()) ? clean(input.estimatedRisk).toLowerCase() : 'low',
    taskWorkUnits: clampInt(input.taskWorkUnits || input.workUnits || 0, 0, 8),
    packageId: clean(input.packageId) || null,
    packageGoal: clean(input.packageGoal) || null,
    packageRole: clean(input.packageRole) || null,
    packageOwner: clean(input.packageOwner) || null,
    packageWorkUnits: clampInt(input.packageWorkUnits || 0, 0, 40),
    packageSize: clampInt(input.packageSize || 0, 0, 8),
    packageMinWorkUnits: clampInt(input.packageMinWorkUnits || 0, 0, 12),
    packageLongWorkProtected: input.packageLongWorkProtected === true,
    postReleaseFocused: input.postReleaseFocused === true,
    historicalDeploymentRecovery: input.historicalDeploymentRecovery === true,
    selectedPlatform: clean(input.selectedPlatform || (clean(input.target).toLowerCase()==='roblox'?'ROBLOX':clean(input.target).toLowerCase()==='unity'?'UNITY':'' )).toUpperCase() || null,
    focusCycle: clampInt(input.focusCycle || 0, 0, 1000000),
    focusPolicyRef: clean(input.focusPolicyRef) || null,
    packageContext: normalizePackageContext(input.packageContext),
    completionCriteria: freezeList(input.completionCriteria || [])
  };
  task.shard = inferShard(task);
  return freeze(task);
}

export function createVibeContinuousQueue(seed = {}) {
  const source = Array.isArray(seed) ? seed : Array.isArray(seed?.tasks) ? seed.tasks : [];
  const configuredMax = Array.isArray(seed) ? DEFAULT_MAX_CONCURRENT_TASKS : clampInt(seed?.maxConcurrentTasks || DEFAULT_MAX_CONCURRENT_TASKS, 1, 20);
  const tasks = source.map(normalizeTask);
  return freeze({
    version: 5,
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
      postReleaseFocusedSlots: 1,
      robloxFirstEligibleSlots: 1,
      platformPriority: freezeList(['ROBLOX','UNITY','FORTNITE_UEFN']),
      longWorkProtectedSlots: 1,
      roleSeparation: true,
      baseShardSlots: BASE_SHARD_SLOTS,
      dynamicBackpressure: true,
      speculativeParallelism: 'high-risk-opt-in-only',
      workPackageAware: true,
      longWorkPackagePriority: true,
      minimumWorkloadGate: true
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
    + Math.min(6, Number(task.packageWorkUnits || task.taskWorkUnits || 0))
    + (task.packageLongWorkProtected ? 3 : 0)
    + (task.postReleaseFocused ? 8 : 0)
    - index / 1000;
}
function fileLocks(task) {
  const root = posix(task.sourceRoot);
  return new Set((task.responsibleFiles || []).map(posix).filter(Boolean).map((file) => root && !file.startsWith(`${root}/`) ? `${root}/${file}` : file));
}
function lockConflict(a, b) {
  const aRoot = posix(a.sourceRoot), bRoot = posix(b.sourceRoot);
  const aFiles = fileLocks(a), bFiles = fileLocks(b);
  if (aRoot && bRoot && aRoot === bRoot) {
    if (!aFiles.size || !bFiles.size) return 'source-root-conflict';
    for (const file of aFiles) if (bFiles.has(file)) return 'responsible-file-conflict';
    return null;
  }
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
function isAwaitingQaTask(task) {
  return task?.status === 'running' && /awaiting.*qa|qa.*awaiting/i.test(clean(task?.blocker));
}
function isReleasedWorkerSlotTask(task) {
  return task?.status === 'running' && /slot-released.*fan-in/i.test(clean(task?.blocker));
}
function isExternalQuotaWaitingTask(task) {
  return task?.status === 'running' && /WAITING_FOR_GEMINI_QUOTA|gemini.*quota|external.*model.*quota/i.test(clean(task?.blocker));
}
function releasesWorkerCapacity(task) {
  return isAwaitingQaTask(task) || isReleasedWorkerSlotTask(task) || isExternalQuotaWaitingTask(task);
}
function isProtectedLongOwner(task) {
  return task?.packageLongWorkProtected === true && clean(task?.packageRole) === 'implementation-owner';
}
function isOwnerDirectiveTask(task) {
  return task?.ownerDirective === true;
}
function isRobloxPriorityDevelopment(task) {
  return clean(task?.selectedPlatform).toUpperCase() === 'ROBLOX'
    && clean(task?.department).toLowerCase() === 'development'
    && clean(task?.type).toLowerCase() === 'implementation';
}
function isHistoricalPostReleaseMaintenance(task) {
  return task?.historicalDeploymentRecovery === true
    && clean(task?.releaseState).toLowerCase() === 'development-confirmed'
    && task?.packageLongWorkProtected === true
    && clean(task?.packageRole) === 'implementation-owner';
}
function isPostReleaseFocused(task) {
  const releaseState=clean(task?.releaseState).toLowerCase();
  return task?.postReleaseFocused === true
    && clean(task?.target).toLowerCase() === 'roblox'
    && (releaseState === 'release-confirmed' || isHistoricalPostReleaseMaintenance(task))
    && !['inspect','research','qa'].includes(clean(task?.type).toLowerCase());
}
function dynamicConcurrency(queue, requested = null) {
  const persistentMax = clampInt(queue?.maxConcurrentTasks || DEFAULT_MAX_CONCURRENT_TASKS, 1, 20);
  const requestedMax = requested === null || requested === undefined || clean(requested) === ''
    ? persistentMax
    : clampInt(requested, 1, 20);
  const hardMax = Math.min(persistentMax, requestedMax);
  const running = queue.tasks.filter((task) => task.status === 'running');
  const awaitingQa = running.filter(isAwaitingQaTask).length;
  const retryPressure = queue.tasks.filter((task) =>
    task.status === 'queued' &&
    task.lastOutcome === 'FAIL' &&
    task.retries > 0 &&
    task.retries <= task.maxRetries
  ).length;
  let limit = hardMax;
  const applyPressure = (count) => {
    if (count >= 8) limit = Math.min(limit, 4);
    else if (count >= 6) limit = Math.min(limit, 8);
    else if (count >= 4) limit = Math.min(limit, 12);
    else if (count >= 2) limit = Math.min(limit, 16);
  };
  applyPressure(awaitingQa);
  applyPressure(retryPressure);
  return freeze({
    persistentMaxConcurrentTasks: persistentMax,
    requestedMaxConcurrentTasks: requestedMax,
    effectiveMaxConcurrentTasks: Math.max(1, limit),
    awaitingQaCount: awaitingQa,
    retryPressureCount: retryPressure
  });
}

export function selectVibeQueueBatch(queueInput, { maxConcurrentTasks = null } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const running = queue.tasks.filter((task) => task.status === 'running');
  const capacityRunning = running.filter((task) => !releasesWorkerCapacity(task));
  const concurrency = dynamicConcurrency(queue, maxConcurrentTasks);
  const effectiveMax = concurrency.effectiveMaxConcurrentTasks;
  const freeSlots = Math.max(0, effectiveMax - capacityRunning.length);
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
  for (const task of capacityRunning) shardUse[task.shard] = (shardUse[task.shard] || 0) + 1;

  // Owner directives always consume eligible capacity before protected/autonomous lanes.
  for (const ownerRow of candidates.filter((row) => isOwnerDirectiveTask(row.task))) {
    if (selected.length >= freeSlots) break;
    const conflict = conflictsWith(ownerRow.task, active);
    if (conflict) {
      if (!deferredConflicts.some((item) => item.task.id === ownerRow.task.id)) deferredConflicts.push(freeze({ task: ownerRow.task, reason: conflict }));
      continue;
    }
    selected.push(ownerRow.task);
    active.push(ownerRow.task);
    shardUse[ownerRow.task.shard] = (shardUse[ownerRow.task.shard] || 0) + 1;
  }

  let postReleaseFocusedSlotUsed = false;
  let postReleaseFocusedTaskId = null;
  if (selected.length < freeSlots && !capacityRunning.some(isPostReleaseFocused)) {
    for (const focusedRow of candidates.filter((row) => isPostReleaseFocused(row.task))) {
      if (selected.some((task) => task.id === focusedRow.task.id)) continue;
      const conflict = conflictsWith(focusedRow.task, active);
      if (conflict) {
        if (!deferredConflicts.some((item) => item.task.id === focusedRow.task.id)) deferredConflicts.push(freeze({ task: focusedRow.task, reason: conflict }));
        continue;
      }
      selected.push(focusedRow.task);
      active.push(focusedRow.task);
      shardUse[focusedRow.task.shard] = (shardUse[focusedRow.task.shard] || 0) + 1;
      postReleaseFocusedSlotUsed = true;
      postReleaseFocusedTaskId = focusedRow.task.id;
      break;
    }
  }

  let robloxFirstEligibleSlotUsed = false;
  let robloxFirstEligibleTaskId = null;
  if (selected.length < freeSlots && !capacityRunning.some(isRobloxPriorityDevelopment) && !selected.some(isRobloxPriorityDevelopment)) {
    for (const robloxRow of candidates.filter((row) => isRobloxPriorityDevelopment(row.task))) {
      if (selected.some((task) => task.id === robloxRow.task.id)) continue;
      const conflict = conflictsWith(robloxRow.task, active);
      if (conflict) {
        if (!deferredConflicts.some((item) => item.task.id === robloxRow.task.id)) deferredConflicts.push(freeze({ task: robloxRow.task, reason: conflict }));
        continue;
      }
      selected.push(robloxRow.task);
      active.push(robloxRow.task);
      shardUse[robloxRow.task.shard] = (shardUse[robloxRow.task.shard] || 0) + 1;
      robloxFirstEligibleSlotUsed = true;
      robloxFirstEligibleTaskId = robloxRow.task.id;
      break;
    }
  }

  let longWorkProtectedSlotUsed = false;
  let longWorkOwnerTaskId = null;
  if (selected.length < freeSlots && !capacityRunning.some(isProtectedLongOwner)) {
    for (const protectedRow of candidates.filter((row) => isProtectedLongOwner(row.task))) {
      if (selected.some((task) => task.id === protectedRow.task.id)) continue;
      const conflict = conflictsWith(protectedRow.task, active);
      if (conflict) {
        if (!deferredConflicts.some((item) => item.task.id === protectedRow.task.id)) deferredConflicts.push(freeze({ task: protectedRow.task, reason: conflict }));
        continue;
      }
      selected.push(protectedRow.task);
      active.push(protectedRow.task);
      shardUse[protectedRow.task.shard] = (shardUse[protectedRow.task.shard] || 0) + 1;
      longWorkProtectedSlotUsed = true;
      longWorkOwnerTaskId = protectedRow.task.id;
      break;
    }
  }

  for (const row of candidates) {
    if (selected.length >= freeSlots) break;
    if (selected.some((task) => task.id === row.task.id)) continue;
    const baseSlots = BASE_SHARD_SLOTS[row.task.shard] || 1;
    if ((shardUse[row.task.shard] || 0) >= baseSlots) continue;
    const conflict = conflictsWith(row.task, active);
    if (conflict) { if (!deferredConflicts.some((item) => item.task.id === row.task.id)) deferredConflicts.push(freeze({ task: row.task, reason: conflict })); continue; }
    selected.push(row.task); active.push(row.task); shardUse[row.task.shard] = (shardUse[row.task.shard] || 0) + 1;
  }
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
    capacityRunning: freeze(capacityRunning),
    awaitingQa: freeze(running.filter(isAwaitingQaTask)),
    quotaWaiting: freeze(running.filter(isExternalQuotaWaitingTask)),
    releasedWorkerSlots: freeze(running.filter(isReleasedWorkerSlotTask)),
    hasEligibleWork: selected.length > 0,
    blocked: freeze(blocked),
    deferredConflicts: freeze(deferredConflicts),
    continueRequired: selected.length > 0,
    persistentMaxConcurrentTasks: concurrency.persistentMaxConcurrentTasks,
    requestedMaxConcurrentTasks: concurrency.requestedMaxConcurrentTasks,
    effectiveMaxConcurrentTasks: effectiveMax,
    backpressure: freeze({
      awaitingQaCount: concurrency.awaitingQaCount,
      retryPressureCount: concurrency.retryPressureCount
    }),
    freeSlots,
    postReleaseFocusedSlotUsed,
    postReleaseFocusedTaskId,
    robloxFirstEligibleSlotUsed,
    robloxFirstEligibleTaskId,
    longWorkProtectedSlotUsed,
    longWorkOwnerTaskId,
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
    runningCount: running.length,
    capacityRunningCount: batch.capacityRunning.length,
    awaitingQaCount: batch.awaitingQa.length
  });
}

function reservationFields(reservation = {}) {
  return {
    reservationId: clean(reservation?.id || reservation?.reservationId) || null,
    reservationRunId: clean(reservation?.runId || reservation?.reservationRunId) || null,
    reservationRunAttempt: clampInt(reservation?.runAttempt || reservation?.reservationRunAttempt || 0, 0, 1000000),
    reservedAt: clean(reservation?.reservedAt) || null
  };
}

const CLEARED_RESERVATION = Object.freeze({
  reservationId: null,
  reservationRunId: null,
  reservationRunAttempt: 0,
  reservedAt: null
});

export function beginVibeQueueTask(queueInput, taskId, { maxConcurrentTasks = null, reservation = {} } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskId);
  const existing = queue.tasks.find((task) => task.id === id);
  if (existing?.status === 'running') return freeze({ started: true, task: existing, queue, resumed: true });
  const batch = selectVibeQueueBatch(queue, { maxConcurrentTasks });
  if (!batch.selected.some((task) => task.id === id)) return freeze({ started: false, reason: 'task-not-currently-eligible-or-conflicts', queue, selection: batch });
  const reservationMeta = reservationFields(reservation);
  const tasks = queue.tasks.map((task) => task.id === id ? freeze({ ...task, ...reservationMeta, status: 'running', blocker: null }) : task);
  const nextQueue = createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks });
  return freeze({ started: true, task: nextQueue.tasks.find((task) => task.id === id), queue: nextQueue, resumed: false });
}

export function beginVibeQueueBatch(queueInput, { maxConcurrentTasks = null, reservation = {} } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const selection = selectVibeQueueBatch(queue, { maxConcurrentTasks });
  if (!selection.selected.length) return freeze({ started: false, tasks: freeze([]), queue, selection });
  const ids = new Set(selection.selected.map((task) => task.id));
  const reservationMeta = reservationFields(reservation);
  const tasks = queue.tasks.map((task) => ids.has(task.id) ? freeze({ ...task, ...reservationMeta, status: 'running', blocker: null }) : task);
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
    if (normalizedOutcome === 'PASS') return freeze({ ...task, ...CLEARED_RESERVATION, status: 'done', evidence: mergedEvidence, lastOutcome: 'PASS', blocker: null });
    if (normalizedOutcome === 'BLOCKED') return freeze({ ...task, ...CLEARED_RESERVATION, status: 'blocked', evidence: mergedEvidence, lastOutcome: 'BLOCKED', blocker: clean(blocker) || 'blocked' });
    if (normalizedOutcome === 'CANCELLED') return freeze({ ...task, ...CLEARED_RESERVATION, status: 'cancelled', evidence: mergedEvidence, lastOutcome: 'CANCELLED', blocker: clean(blocker) || null });
    const nextRetries = task.retries + 1;
    const canRetry = Boolean(retryable && nextRetries <= task.maxRetries);
    return freeze({ ...task, ...CLEARED_RESERVATION, status: canRetry ? 'queued' : 'failed', retries: nextRetries, evidence: mergedEvidence, lastOutcome: 'FAIL', blocker: canRetry ? null : (clean(blocker) || 'retry-limit-exceeded') });
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
    version: 5,
    counts: freeze(counts),
    nextTaskId: next.selected[0]?.id || null,
    nextTaskIds: freezeList(next.selected.map((task) => task.id)),
    runningTaskId: next.running[0]?.id || null,
    runningTaskIds: freezeList(next.running.map((task) => task.id)),
    capacityRunningTaskIds: freezeList(next.capacityRunning.map((task) => task.id)),
    awaitingQaTaskIds: freezeList(next.awaitingQa.map((task) => task.id)),
    quotaWaitingTaskIds: freezeList(next.quotaWaiting.map((task) => task.id)),
    releasedWorkerSlotTaskIds: freezeList(next.releasedWorkerSlots.map((task) => task.id)),
    nextReleaseState: next.selected[0]?.releaseState || null,
    continueRequired: next.continueRequired,
    stopReason: next.stopReason,
    ownerDirectiveWaiting: queue.tasks.some((task) => task.ownerDirective && ['queued', 'running', 'blocked'].includes(task.status)),
    maxConcurrentTasks: queue.maxConcurrentTasks,
    persistentMaxConcurrentTasks: next.persistentMaxConcurrentTasks,
    requestedMaxConcurrentTasks: next.requestedMaxConcurrentTasks,
    effectiveMaxConcurrentTasks: next.effectiveMaxConcurrentTasks,
    backpressure: next.backpressure,
    freeSlots: next.freeSlots,
    postReleaseFocusedSlotUsed: next.postReleaseFocusedSlotUsed,
    postReleaseFocusedTaskId: next.postReleaseFocusedTaskId,
    robloxFirstEligibleSlotUsed: next.robloxFirstEligibleSlotUsed,
    robloxFirstEligibleTaskId: next.robloxFirstEligibleTaskId,
    longWorkProtectedSlotUsed: next.longWorkProtectedSlotUsed,
    longWorkOwnerTaskId: next.longWorkOwnerTaskId,
    shardUse: next.shardUse,
    workStealingUsed: next.workStealingUsed
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeContinuousQueue = freeze({ createVibeContinuousQueue, selectNextVibeQueueTask, selectVibeQueueBatch, beginVibeQueueTask, beginVibeQueueBatch, finishVibeQueueTask, summarizeVibeContinuousQueue });
}