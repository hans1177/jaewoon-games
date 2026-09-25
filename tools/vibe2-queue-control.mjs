// 파일명: tools/vibe2-queue-control.mjs
// 역할: Vibe2 병렬 DAG 큐의 추가·예약·원자 뉴런 결과·QA대기·완료·실패·gated 재계획 상태를 영속화한다.
// 원칙: 기존 scheduler와 책임 파일 충돌 보호를 유지하고 source-root/game-wide lock은 만들지 않으며, 검증된 neural gated 실행은 재큐·재우선순위·refill 힌트만 직접 반영한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createVibeContinuousQueue,
  selectNextVibeQueueTask,
  selectVibeQueueBatch,
  beginVibeQueueTask,
  beginVibeQueueBatch,
  finishVibeQueueTask,
  summarizeVibeContinuousQueue,
  DEFAULT_MAX_CONCURRENT_TASKS,
  EXTERNAL_MATRIX_BATCH_MAX
} from '../assets/vibe-continuous-queue.js';
import { computeParallelismTelemetry } from './vibe2-parallelism-telemetry.mjs';
import { adaptiveRequestedMax, createParallelismControl, decideAdaptiveBackpressure, DEFAULT_ADAPTIVE_TARGET, DEFAULT_ADAPTIVE_MIN } from './vibe2-adaptive-backpressure.mjs';
import { evaluateNeuralDiagnosisFeedback, neuralFeedbackEvidence, summarizeNeuralFeedbackEvidence } from './vibe2-neural-feedback.mjs';
import { critiqueNeuralShadow, neuralCriticEvidence } from './vibe2-neural-critic.mjs';
import { verifyNeuralRootCause, neuralRootCauseEvidence } from './vibe2-neural-root-cause.mjs';
import { simulateNeuralEventRoute, neuralEventRouteEvidence } from './vibe2-neural-event-router.mjs';
import { summarizeNeuralEventShadowEvidence } from './vibe2-neural-event-telemetry.mjs';

const clean = (value) => String(value ?? '').trim();
const FULL_WEB_OUTPUT_BUDGET_REPAIR_EVIDENCE = 'repair-retry:vibe2-full-web-output-budget-v2';
const SOURCE_GENERATION_CONTEXT_REPAIR_EVIDENCE = 'repair-retry:vibe2-source-generation-context-v3';
const STALE_RUNNING_RECOVERY_EVIDENCE = 'recovery:stale-running-reservation-v1';
const TRANSIENT_WORK_LOCK_RECOVERY_EVIDENCE = 'recovery:transient-work-lock-requeue-v1';
const DEFAULT_STALE_RUNNING_MS = 45 * 60 * 1000;
function readJson(file, fallback = {}) {
  if (!file || !fs.existsSync(file)) return fallback;
  const raw=fs.readFileSync(file,'utf8');
  if (!clean(raw)) return fallback;
  return JSON.parse(raw);
}
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function parseArgs(argv = process.argv.slice(2)) {
  const [command = 'summary', ...rest] = argv;
  const args = { command };
  for (const raw of rest) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}
function queueFileFrom(args) { return clean(args.queue) || '.vibe2/queue.json'; }
function controlFileFrom(args) { return clean(args.control) || '.vibe2/parallelism-control.json'; }
function readParallelismControl(args) {
  try {
    return createParallelismControl(readJson(controlFileFrom(args), {}));
  } catch {
    return createParallelismControl({ lastReason: `INVALID_STATE_ADAPTIVE_TARGET_${DEFAULT_ADAPTIVE_TARGET}` });
  }
}

export function speculativeExpansionPolicy(controlInput = {}) {
  const control=createParallelismControl(controlInput);
  const telemetry=control.lastTelemetry&&typeof control.lastTelemetry==='object'?control.lastTelemetry:{};
  const lastReason=clean(control.lastReason).toUpperCase();
  const bottleneck=clean(telemetry.bottleneck).toUpperCase();
  const workerCount=Math.max(0,Math.floor(Number(telemetry.workerCount)||0));
  const effectiveMax=Math.max(0,Math.floor(Number(telemetry.effectiveMax)||0));
  const peakUtilization=Math.max(0,Number(telemetry.effectivePeakUtilizationPct)||0);
  const explicitPressure=/(?:RUNNER_CAPACITY|RUNNER_QUEUE_WAIT|CHECKOUT_NETWORK)/.test(lastReason)
    || ['RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION','CHECKOUT_NETWORK'].includes(bottleneck);
  const loadedUnderutilization=workerCount>=4&&effectiveMax>=4&&peakUtilization>0&&peakUtilization<80;
  if(explicitPressure||loadedUnderutilization){
    const reasons=[];
    if(explicitPressure)reasons.push('ADAPTIVE_RUNNER_PRESSURE');
    if(loadedUnderutilization)reasons.push('LOW_EFFECTIVE_PEAK_UTILIZATION');
    return Object.freeze({
      allowed:false,
      reason:reasons.join('+'),
      primaryCoveragePreserved:true,
      lastReason:clean(control.lastReason)||null,
      bottleneck:bottleneck||null,
      workerCount,
      effectiveMax,
      peakUtilizationPct:peakUtilization
    });
  }
  return Object.freeze({
    allowed:true,
    reason:'AVAILABLE',
    primaryCoveragePreserved:true,
    lastReason:clean(control.lastReason)||null,
    bottleneck:bottleneck||null,
    workerCount,
    effectiveMax,
    peakUtilizationPct:peakUtilization
  });
}
function priority(value, ownerDirective) { if (ownerDirective) return 'owner-immediate'; return ['critical','high','normal','low'].includes(clean(value)) ? clean(value) : 'normal'; }
function bool(value) { return value === true || ['1','true','yes','y'].includes(clean(value).toLowerCase()); }
function list(value) { return clean(value).split(',').map(clean).filter(Boolean); }
function maxConcurrent(value) {
  const raw=Number(value);
  if(!Number.isFinite(raw)||raw<=0)return DEFAULT_MAX_CONCURRENT_TASKS;
  return Math.max(1,Math.floor(raw));
}
function optionalMaxConcurrent(value) { return clean(value) ? maxConcurrent(value) : null; }
function reservationFromArgs(args = {}) {
  const id=clean(args['reservation-id']);
  return id ? {
    id,
    runId:clean(args['reservation-run']),
    runAttempt:Math.max(0,Math.floor(Number(args['reservation-attempt'])||0)),
    reservedAt:clean(args['reserved-at'])
  } : {};
}
function resultReservationId(row = {}) {
  const direct=clean(row?.reservationId||row?.metrics?.reservationId);
  if(direct)return direct;
  const evidence=Array.isArray(row?.evidence)?row.evidence:[];
  const marker=evidence.map(clean).find(value=>value.startsWith('reservation-id:'));
  return marker?clean(marker.slice('reservation-id:'.length)):'';
}

function isRecoverableFullWebTransportFailure(task = {}) {
  const evidence = Array.isArray(task.evidence) ? task.evidence : [];
  const blocker = clean(task.blocker);
  return task.ownerDirective === true
    && clean(task.target).toLowerCase() === 'web'
    && /FULL_WEB_GAME_REBUILD/.test(clean(task.goal))
    && task.status === 'failed'
    && Number(task.retries || 0) > Number(task.maxRetries ?? 2)
    && ['source-candidate-generation-failed','parallel-candidate-generation-failed'].includes(blocker)
    && !evidence.includes(FULL_WEB_OUTPUT_BUDGET_REPAIR_EVIDENCE);
}

export function recoverFixedFullWebTransportFailures(queueInput) {
  const queue = createVibeContinuousQueue(queueInput);
  let recovered = 0;
  const tasks = queue.tasks.map((task) => {
    if (!isRecoverableFullWebTransportFailure(task)) return task;
    recovered += 1;
    return {
      ...task,
      status: 'queued',
      retries: 0,
      blocker: null,
      lastOutcome: 'RETRY_AFTER_INFRA_REPAIR',
      evidence: [...new Set([...(task.evidence || []), FULL_WEB_OUTPUT_BUDGET_REPAIR_EVIDENCE])]
    };
  });
  return {
    recovered,
    queue: recovered ? createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks }) : queue
  };
}

export function recoverFixedSourceCandidateGenerationFailures(queueInput) {
  const queue = createVibeContinuousQueue(queueInput);
  let recovered = 0;
  const tasks = queue.tasks.map((task) => {
    const evidence = Array.isArray(task.evidence) ? task.evidence : [];
    const blocker = clean(task.blocker);
    const retryExhausted = Number(task.retries || 0) > Number(task.maxRetries ?? 2);
    const exactWebRepair = /-(?:web-runtime-repair|web-base-implementation)-v1$/.test(clean(task.id))
      || /\[(?:VIBE_WEB_REPAIR|WEB_BASE_IMPLEMENTATION)\]/i.test(clean(task.goal));
    const eligible = task.status === 'failed'
      && clean(task.department).toLowerCase() === 'development'
      && clean(task.type).toLowerCase() === 'implementation'
      && clean(task.target).toLowerCase() === 'web'
      && exactWebRepair
      && retryExhausted
      && ['source-candidate-generation-failed','parallel-candidate-generation-failed'].includes(blocker)
      && !evidence.includes(SOURCE_GENERATION_CONTEXT_REPAIR_EVIDENCE);
    if (!eligible) return task;
    recovered += 1;
    return {
      ...task,
      ...clearedReservation(),
      status:'queued',
      retries:0,
      blocker:null,
      lastOutcome:'RETRY_AFTER_SOURCE_GENERATION_INFRA_REPAIR',
      evidence:[...new Set([...evidence, SOURCE_GENERATION_CONTEXT_REPAIR_EVIDENCE])]
    };
  });
  return {
    recovered,
    queue: recovered ? createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks }) : queue
  };
}

function isWorkerCapacityReleasedBlocker(value = '') {
  const blocker = clean(value);
  return /awaiting.*qa|qa.*awaiting|slot-released.*fan-in|WAITING_FOR_GEMINI_QUOTA|gemini.*quota|external.*model.*quota/i.test(blocker);
}

function clearedReservation() {
  return { reservationId:null, reservationRunId:null, reservationRunAttempt:0, reservedAt:null };
}

export function recoverTransientWorkLockBlocks(queueInput) {
  const queue=createVibeContinuousQueue(queueInput);
  let recovered=0;
  const tasks=queue.tasks.map(task=>{
    const blocker=clean(task.blocker);
    if(task.status!=='blocked'||!/^work-lock-conflict:/i.test(blocker))return task;
    recovered+=1;
    return{
      ...task,
      ...clearedReservation(),
      status:'queued',
      blocker:null,
      lastOutcome:'DEFERRED_BY_WORK_LOCK',
      neuronExpectedVariants:0,
      neuronResults:[],
      evidence:[...new Set([...(task.evidence||[]),TRANSIENT_WORK_LOCK_RECOVERY_EVIDENCE,`transient-work-lock-deferred:${blocker}`])]
    };
  });
  return{recovered,queue:recovered?createVibeContinuousQueue({tasks,maxConcurrentTasks:queue.maxConcurrentTasks}):queue};
}

export function recoverStaleRunningReservations(queueInput, { nowMs = Date.now(), staleMs = DEFAULT_STALE_RUNNING_MS } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  let recovered = 0;
  const tasks = queue.tasks.map((task) => {
    if (task.status !== 'running') return task;
    if (clean(task.department).toLowerCase() !== 'development' || clean(task.type).toLowerCase() !== 'implementation') return task;
    if (isWorkerCapacityReleasedBlocker(task.blocker)) return task;
    const reservedAtMs = Date.parse(clean(task.reservedAt));
    const leaseMissing = !Number.isFinite(reservedAtMs);
    const expired = !leaseMissing && (Number(nowMs) - reservedAtMs) > Math.max(60_000, Number(staleMs) || DEFAULT_STALE_RUNNING_MS);
    if (!leaseMissing && !expired) return task;
    recovered += 1;
    return {
      ...task,
      ...clearedReservation(),
      status:'queued',
      blocker:null,
      lastOutcome:'STALE_RESERVATION_RECOVERED',
      evidence:[...new Set([...(task.evidence || []), STALE_RUNNING_RECOVERY_EVIDENCE])]
    };
  });
  return {
    recovered,
    queue: recovered ? createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks }) : queue
  };
}

function recoverRunnableInfrastructureState(queueInput) {
  const transport = recoverFixedFullWebTransportFailures(queueInput);
  const sourceGeneration = recoverFixedSourceCandidateGenerationFailures(transport.queue);
  const stale = recoverStaleRunningReservations(sourceGeneration.queue);
  return {
    queue:stale.queue,
    recovered:transport.recovered + sourceGeneration.recovered + stale.recovered,
    transportRecovered:transport.recovered,
    sourceGenerationRecovered:sourceGeneration.recovered,
    staleRecovered:stale.recovered
  };
}

export function recoverFanInRegressionFailure(queueInput, results = [], { blocker = 'fan-in-regression-failed' } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const passing = new Map();
  for (const row of results || []) {
    if (clean(row?.outcome).toUpperCase() !== 'PASS') continue;
    const taskId=clean(row?.taskId);
    if (!taskId) continue;
    const rows=passing.get(taskId) || [];
    rows.push(row);
    passing.set(taskId,rows);
  }
  let recovered = 0;
  const tasks = queue.tasks.map((task) => {
    const passRows=passing.get(task.id) || [];
    if (!passRows.length || task.status !== 'running') return task;
    if (!/awaiting.*qa|qa.*awaiting|candidate-awaiting-qa-and-deployment|slot-released.*fan-in/i.test(clean(task.blocker))) return task;
    const reservationIds=[...new Set(passRows.map(resultReservationId).filter(Boolean))];
    if (reservationIds.length > 1) return task;
    const expectedReservationId=reservationIds[0] || '';
    if (expectedReservationId && clean(task.reservationId) !== expectedReservationId) return task;
    recovered += 1;
    return {
      ...task,
      ...clearedReservation(),
      status:'queued',
      blocker:null,
      lastOutcome:'RETRY_AFTER_FAN_IN_REGRESSION_FAILURE',
      evidence:[...new Set([...(task.evidence || []), `failure-cause:${clean(blocker) || 'fan-in-regression-failed'}`, 'recovery:fan-in-regression-requeue-v1'])]
    };
  });
  return {
    recovered,
    queue: recovered ? createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks }) : queue
  };
}

export function enqueueVibeTask(queueInput, taskInput = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskInput.id);
  const goal = clean(taskInput.goal);
  if (!id) throw new Error('task id required');
  if (!goal) throw new Error('task goal required');
  if (queue.tasks.some((task) => task.id === id)) throw new Error(`duplicate task id: ${id}`);
  const ownerDirective = Boolean(taskInput.ownerDirective);
  return createVibeContinuousQueue({
    maxConcurrentTasks: queue.maxConcurrentTasks,
    tasks: [...queue.tasks, {
      id,
      gameId: clean(taskInput.gameId) || null,
      target: clean(taskInput.target) || 'auto',
      department: clean(taskInput.department) || 'development',
      type: clean(taskInput.type) || 'implementation',
      goal,
      responsibleFiles: Array.isArray(taskInput.responsibleFiles) ? taskInput.responsibleFiles : [],
      dependencies: Array.isArray(taskInput.dependencies) ? taskInput.dependencies : [],
      priority: priority(taskInput.priority, ownerDirective),
      releaseState: clean(taskInput.releaseState) || 'other',
      status: 'queued',
      retries: 0,
      retryPolicy: clean(taskInput.retryPolicy).toUpperCase() || undefined,
      maxRetries: Math.max(0, Math.min(5, Number(taskInput.maxRetries ?? 2) || 0)),
      ownerDirective,
      requiresOwnerDecision: Boolean(taskInput.requiresOwnerDecision),
      protectedChange: Boolean(taskInput.protectedChange),
      paidResourceRequired: Boolean(taskInput.paidResourceRequired),
      sourceRoot: clean(taskInput.sourceRoot) || null,
      speculativeEligible: Boolean(taskInput.speculativeEligible),
      estimatedRisk: clean(taskInput.estimatedRisk) || 'low',
      atomicNeuronMode: clean(taskInput.atomicNeuronMode) || null,
      atomicCompletionRequired: taskInput.atomicCompletionRequired === true,
      evidence: Array.isArray(taskInput.evidence) ? taskInput.evidence : []
    }]
  });
}

export function reserveNextVibeTask(queueInput, { maxConcurrentTasks = null, reservation = {}, lane = 'game-primary' } = {}) {
  const recovered = recoverRunnableInfrastructureState(queueInput);
  const queue = recovered.queue;
  const selection = selectVibeQueueBatch(queue, { maxConcurrentTasks, lane });
  const selected = selection.selected[0];
  if (!selected) return { reserved: false, queue, selection, recovered: recovered.recovered };
  const started = beginVibeQueueTask(queue, selected.id, { maxConcurrentTasks, reservation, lane });
  return { reserved: started.started, task: started.task || null, queue: started.queue, selection, recovered: recovered.recovered };
}

export function reserveVibeTaskBatch(queueInput, { maxConcurrentTasks = null, reservation = {}, lane = 'game-primary', speculativeExpansionAllowed = true, speculativeExpansionReason = 'AVAILABLE' } = {}) {
  const recovered = recoverRunnableInfrastructureState(queueInput);
  const queue = recovered.queue;
  const started = beginVibeQueueBatch(queue, { maxConcurrentTasks, reservation, lane });
  let tasks = started.tasks || [];
  const workerBudget = Math.max(
    tasks.length,
    Math.floor(Number(started.selection?.effectiveMaxConcurrentTasks ?? maxConcurrentTasks ?? queue.maxConcurrentTasks) || tasks.length || 1)
  );
  const speculativeVariants = new Map(tasks.map((task) => [task.id, 1]));
  const speculativePriority = (task) => {
    const text=`${clean(task?.id)} ${clean(task?.goal)} ${clean(task?.packageRole)}`.toLowerCase();
    if (/runtime[-_ ]?repair|diagnostic|cleanup|targeted[-_ ]?repair|bug[-_ ]?fix/.test(text)) return 0;
    if (/web[-_ ]?base[-_ ]?implementation|full[_ -]?web|full[_ -]?rebuild|full_web_game_rebuild/.test(text)) return 2;
    return task?.packageLongWorkProtected===true?2:1;
  };
  const speculativeEligible = tasks.filter((task) =>
    !['unity','roblox'].includes(clean(task.target).toLowerCase()) &&
    task.estimatedRisk === 'high' &&
    (task.speculativeEligible || task.priority === 'critical')
  ).map((task,index)=>({task,index,priority:speculativePriority(task)}))
    .sort((a,b)=>a.priority-b.priority||a.index-b.index)
    .map(row=>row.task);
  let spareWorkerSlots = speculativeExpansionAllowed===true?Math.max(0, workerBudget - tasks.length):0;
  for (let round = 0; round < 2 && spareWorkerSlots > 0; round += 1) {
    for (const task of speculativeEligible) {
      if (spareWorkerSlots <= 0) break;
      speculativeVariants.set(task.id, (speculativeVariants.get(task.id) || 1) + 1);
      spareWorkerSlots -= 1;
    }
  }
  const selectedIds = new Set(tasks.map((task) => task.id));
  const annotatedQueue = createVibeContinuousQueue({
    maxConcurrentTasks: started.queue.maxConcurrentTasks,
    tasks: started.queue.tasks.map((task) => selectedIds.has(task.id) ? {
      ...task,
      neuronExpectedVariants: speculativeVariants.get(task.id) || 1,
      neuronResults: []
    } : task)
  });
  tasks = annotatedQueue.tasks.filter((task) => selectedIds.has(task.id));
  return {
    reserved: started.started,
    tasks,
    queue: annotatedQueue,
    selection: started.selection,
    recovered: recovered.recovered,
    speculativeExpansionAllowed:speculativeExpansionAllowed===true,
    speculativeExpansionReason:clean(speculativeExpansionReason)||'AVAILABLE',
    primaryTaskCount:tasks.length,
    workerCount:[...speculativeVariants.values()].reduce((sum,count)=>sum+Number(count||0),0),
    matrix: tasks.map((task) => ({
      taskId: task.id,
      shard: task.shard,
      packageId: task.packageId || null,
      packageRole: task.packageRole || null,
      longWorkProtected: task.packageLongWorkProtected === true,
      reservationId: task.reservationId || null,
      reservationRunId: task.reservationRunId || null,
      reservationRunAttempt: task.reservationRunAttempt || 0,
      reservedAt: task.reservedAt || null,
      speculativeVariants: speculativeVariants.get(task.id) || 1,
      speculativePriority: speculativePriority(task)
    }))
  };
}

export function markVibeTaskAwaiting(queueInput, { taskId = '', evidence = [], blocker = 'awaiting-qa', expectedReservationId = '' } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskId);
  const expected = clean(expectedReservationId);
  let found = false;
  const tasks = queue.tasks.map((task) => {
    if (task.id !== id) return task;
    found = true;
    const currentReservation = clean(task.reservationId);
    const reservationMatches = Boolean(expected && currentReservation && expected === currentReservation);
    const reconcileQueued = task.status === 'queued' && reservationMatches;
    if (expected && !reservationMatches) throw new Error(`await reservation mismatch: ${id}`);
    if (task.status !== 'running' && !reconcileQueued) throw new Error(`await requires running task: ${id}`);
    const mergedEvidence = [
      ...(task.evidence || []),
      ...(evidence || []).map(clean).filter(Boolean),
      ...(reconcileQueued ? [`fan-in-reconciled-reservation:${expected}`] : [])
    ];
    return {
      ...task,
      status: 'running',
      blocker: clean(blocker) || 'awaiting-qa',
      evidence: [...new Set(mergedEvidence)]
    };
  });
  if (!found) throw new Error(`task not found: ${id}`);
  return createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks });
}

export function releaseVibeTaskExecutionSlot(queueInput, { taskId = '', evidence = [], blocker = 'slot-released-awaiting-fan-in' } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskId);
  const task = queue.tasks.find((item) => item.id === id);
  if (!task) throw new Error(`task not found: ${id}`);
  if (task.status !== 'running') return { released:false, updated:false, reason:`TASK_${clean(task.status).toUpperCase()}_NOOP`, queue };
  const currentBlocker = clean(task.blocker);
  if (/awaiting.*qa|qa.*awaiting/i.test(currentBlocker) || /slot-released.*fan-in/i.test(currentBlocker)) {
    return { released:false, updated:false, reason:'ALREADY_RELEASED', queue };
  }
  const nextQueue = markVibeTaskAwaiting(queue, { taskId:id, evidence, blocker:clean(blocker) || 'slot-released-awaiting-fan-in' });
  return { released:true, updated:true, reason:'RELEASED', queue:nextQueue };
}

export function settleVibeTask(queueInput, { taskId = '', outcome = 'PASS', evidence = [], blocker = '', retryable = true } = {}) {
  return finishVibeQueueTask(queueInput, { taskId, outcome, evidence, blocker, retryable });
}

export function verifyVibeWorkerSynchronization(queueInput, {
  taskId = '', reservationId = '', reservationRunId = '', reservationRunAttempt = 0, reservedAt = ''
} = {}) {
  const queue=createVibeContinuousQueue(queueInput);
  const id=clean(taskId);
  if(!id)throw new Error('VIBE_WORKER_SYNC_TASK_ID_REQUIRED');
  const task=queue.tasks.find(row=>row.id===id);
  if(!task)throw new Error(`VIBE_WORKER_SYNC_TASK_NOT_FOUND:${id}`);
  const failures=[];
  if(task.status!=='running')failures.push(`STATUS_${task.status||'UNKNOWN'}`);
  const expectedReservationId=clean(reservationId);
  const expectedRunId=clean(reservationRunId);
  const expectedReservedAt=clean(reservedAt);
  const expectedAttempt=Math.max(0,Math.floor(Number(reservationRunAttempt)||0));
  if(!expectedReservationId||clean(task.reservationId)!==expectedReservationId)failures.push('RESERVATION_ID_MISMATCH');
  if(!expectedRunId||clean(task.reservationRunId)!==expectedRunId)failures.push('RESERVATION_RUN_ID_MISMATCH');
  if(Number(task.reservationRunAttempt||0)!==expectedAttempt)failures.push('RESERVATION_RUN_ATTEMPT_MISMATCH');
  if(!expectedReservedAt||clean(task.reservedAt)!==expectedReservedAt)failures.push('RESERVED_AT_MISMATCH');
  if(clean(task.blocker))failures.push('TASK_BLOCKED');
  return {
    pass:failures.length===0,
    status:failures.length===0?'PASS':'FAIL',
    taskId:id,
    reservationId:clean(task.reservationId)||null,
    reservationRunId:clean(task.reservationRunId)||null,
    reservationRunAttempt:Number(task.reservationRunAttempt||0),
    reservedAt:clean(task.reservedAt)||null,
    failures
  };
}

function workloadEvidence(row = {}) {
  const metrics=row?.metrics||{};
  const changedFiles=Number(metrics.changedFileCount);
  const addedLines=Number(metrics.addedLineCount);
  const deletedLines=Number(metrics.deletedLineCount);
  const prepMs=Math.max(0,Number(metrics.checkoutMs||0))+Math.max(0,Number(metrics.modelPrepMs||0));
  const cycleMs=Math.max(0,Number(metrics.workerTotalMs||row.durationMs||0));
  const evidence=[];
  if(Number.isFinite(changedFiles))evidence.push(`workload:changed-files:${Math.max(0,changedFiles)}`);
  if(Number.isFinite(addedLines)||Number.isFinite(deletedLines))evidence.push(`workload:changed-lines:${Math.max(0,Number.isFinite(addedLines)?addedLines:0)+Math.max(0,Number.isFinite(deletedLines)?deletedLines:0)}`);
  if(prepMs>0)evidence.push(`workload:prep-ms:${prepMs}`);
  if(cycleMs>0)evidence.push(`workload:cycle-ms:${cycleMs}`);
  return evidence;
}
const CODING_METHOD_FAILURE_CLASSES=new Set(['NO_OP','EDIT_MATCH','MALFORMED_OUTPUT','INVALID_PATH','FULL_REWRITE_SIZE','SEMANTIC_DIFF_BUDGET','TIMEOUT','STUDIO_QUALITY_DELTA','DIAGNOSTIC_POSTCONDITION','SYSTEM_CAUSAL_TEST_REQUIRED','SYSTEM_CANDIDATE_SYNTAX']);
function codingStrategyFailureEvidence(row = {}) {
  if(clean(row?.outcome).toUpperCase()!=='FAIL')return[];
  const coding=row?.codingMethod&&typeof row.codingMethod==='object'?row.codingMethod:{};
  const strategy=clean(coding.strategy);
  const failureFingerprint=clean(coding.failureFingerprint);
  if(!strategy||!failureFingerprint)return[];
  let failureClass=clean(row?.candidateFailure?.class).toUpperCase();
  if(!CODING_METHOD_FAILURE_CLASSES.has(failureClass)){
    if(coding.implementationPass===true&&coding.incrementalQaPass===false)failureClass='INCREMENTAL_QA';
    else if(coding.implementationPass===true&&coding.incrementalQaPass===true&&coding.performanceSanityPass===false)failureClass='PERFORMANCE_SANITY';
    else return[];
  }
  const evidence=(row?.evidence||[]).map(clean).filter(Boolean);
  const runEvidence=evidence.find(value=>value.startsWith('actions-run:'))||'';
  const payload={
    version:1,
    variant:clean(row.variant)||'primary',
    strategy,
    failureFingerprint,
    failureClass,
    runEvidence,
    verifiedBy:'IMMUTABLE_WORKER_RESULT',
    infrastructureFailure:false
  };
  return[`coding-strategy-negative:${encodeURIComponent(JSON.stringify(payload))}`];
}
function neuralWorkerSampleId(row={}) {
  return[
    clean(row?.taskId),
    resultReservationId(row),
    clean(row?.variant)||'primary',
    clean(row?.candidateBranch)
  ].filter(Boolean).join('|')||null;
}
function neuralWorkerFeedback(row = {}) {
  return evaluateNeuralDiagnosisFeedback({
    diagnosis:row?.neuralDiagnosis||null,
    outcome:row?.outcome,
    blocker:row?.blocker,
    candidateFailure:row?.candidateFailure||null,
    roleResults:row?.roleResults||{},
    evidence:Array.isArray(row?.evidence)?row.evidence:[],
    sampleId:neuralWorkerSampleId(row)
  });
}
function neuralWorkerEventType(row={}) {
  const evidence=(Array.isArray(row?.evidence)?row.evidence:[]).map(clean).filter(Boolean);
  const roles=row?.roleResults&&typeof row.roleResults==='object'?row.roleResults:{};
  if(row?.candidateFailure||clean(roles.implementation).toUpperCase()==='FAIL')return'WORKER_RESULT';
  if(clean(roles.test).toUpperCase()==='FAIL'||evidence.some(value=>value.startsWith('incremental-qa-failure-signature:')))return'QA_RESULT';
  return'WORKER_RESULT';
}
export function buildNeuralWorkerTransaction(row = {}) {
  const rowEvidence=Array.isArray(row?.evidence)?row.evidence:[];
  const sampleId=neuralWorkerSampleId(row);
  const feedback=neuralWorkerFeedback(row);
  const critic=critiqueNeuralShadow({diagnosis:row?.neuralDiagnosis||null,feedback,evidence:rowEvidence});
  const rootCause=verifyNeuralRootCause({diagnosis:row?.neuralDiagnosis||null,evidence:rowEvidence,sampleId,verificationStage:'WORKER_RESULT'});
  const eventType=neuralWorkerEventType(row);
  const eventRoute=simulateNeuralEventRoute({
    event:{
      id:[sampleId,eventType].filter(Boolean).join('|')||null,
      type:eventType,
      taskId:clean(row?.taskId)||null,
      outcome:clean(row?.outcome).toUpperCase()||null,
      stage:clean(feedback?.observed?.stage)||null,
      signature:clean(feedback?.observed?.failureSignature)||null,
      evidence:rowEvidence
    },
    diagnosis:row?.neuralDiagnosis||null,
    rootCause,
    policyFresh:true,
    lockConflict:false,
    securityBlocked:rowEvidence.map(clean).includes('SECURITY_POLICY_BLOCK'),
    gatedExecutionEnabled:true
  });
  const evidence=[
    ...neuralFeedbackEvidence(feedback),
    ...neuralCriticEvidence(critic),
    ...neuralRootCauseEvidence(rootCause),
    ...neuralEventRouteEvidence(eventRoute)
  ];
  const atomicSummary={
    version:1,
    sampleId,
    feedback:clean(feedback?.matchState)||'UNKNOWN',
    critic:clean(critic?.verdict)||'UNRESOLVED',
    rootCause:clean(rootCause?.state)||'UNRESOLVED',
    route:clean(eventRoute?.proposedAction?.kind)||'OBSERVE'
  };
  return Object.freeze({
    version:1,
    sampleId,
    feedback,
    critic,
    rootCause,
    eventRoute,
    evidence:Object.freeze([...new Set([
      `neural-atomic-transaction:${encodeURIComponent(JSON.stringify(atomicSummary))}`,
      ...evidence
    ])])
  });
}
function reusableWorkerEvidence(row = {}) {
  const evidence=[];
  const exploration=row?.exploration||{};
  if(clean(exploration.reuseKey))evidence.push(`exploration-reuse:${clean(exploration.reuseKey)}`);
  if(Array.isArray(exploration.impactFiles)&&exploration.impactFiles.length)evidence.push(`exploration-impact:${exploration.impactFiles.map(clean).filter(Boolean).join('|')}`);
  if(Array.isArray(exploration.testTargets)&&exploration.testTargets.length)evidence.push(`exploration-tests:${exploration.testTargets.map(clean).filter(Boolean).join('|')}`);
  const roles=row?.roleResults&&typeof row.roleResults==='object'?row.roleResults:{};
  for(const [role,status] of Object.entries(roles))if(clean(status))evidence.push(`role-result:${clean(role)}:${clean(status)}`);
  const outcome=clean(row?.outcome).toUpperCase();
  if(['FAIL','BLOCKED'].includes(outcome)&&clean(row?.blocker))evidence.push(`failure-cause:${clean(row.blocker)}`);
  return evidence;
}

export function applyVibeFanInResults(queueInput, results = []) {
  let queue = createVibeContinuousQueue(queueInput);
  const grouped = new Map();
  for (const raw of results || []) {
    const id = clean(raw?.taskId);
    if (!id) continue;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(raw);
  }
  const applied = [];
  for (const [taskId, variants] of grouped.entries()) {
    const currentTask = queue.tasks.find((task) => task.id === taskId);
    if (!currentTask) { applied.push({ taskId, outcome:'STALE_RESULT_SKIPPED', reason:'TASK_NOT_FOUND' }); continue; }
    const reservationIds = [...new Set(variants.map(resultReservationId).filter(Boolean))];
    if (reservationIds.length > 1) { applied.push({ taskId, outcome:'STALE_RESULT_SKIPPED', reason:'RESERVATION_CONFLICT' }); continue; }
    const expectedReservationId = reservationIds[0] || '';
    if (expectedReservationId) {
      if (clean(currentTask.reservationId) !== expectedReservationId) {
        applied.push({ taskId, outcome:'STALE_RESULT_SKIPPED', reason:'RESERVATION_MISMATCH', expectedReservationId, currentReservationId:clean(currentTask.reservationId) || null });
        continue;
      }
      if (!['running','queued'].includes(clean(currentTask.status))) {
        applied.push({ taskId, outcome:'STALE_RESULT_SKIPPED', reason:`TASK_${clean(currentTask.status).toUpperCase()}_NOT_ACTIVE` });
        continue;
      }
    } else if (clean(currentTask.status) !== 'running') {
      applied.push({ taskId, outcome:'STALE_RESULT_SKIPPED', reason:'LEGACY_NON_RUNNING_RESULT' });
      continue;
    }
    const passes = variants.filter((row) => clean(row.outcome).toUpperCase() === 'PASS');
    const winner = passes.sort((a,b) => Number(a.durationMs || 0) - Number(b.durationMs || 0))[0] || variants[0];
    const transientWorkLock=passes.length===0&&variants.length>0&&variants.every(row=>
      clean(row.outcome).toUpperCase()==='BLOCKED'&&/^work-lock-conflict:/i.test(clean(row.blocker))
    );
    if(transientWorkLock){
      const blockers=[...new Set(variants.map(row=>clean(row.blocker)).filter(Boolean))];
      queue=createVibeContinuousQueue({
        maxConcurrentTasks:queue.maxConcurrentTasks,
        tasks:queue.tasks.map(task=>task.id===taskId?{
          ...task,
          ...clearedReservation(),
          status:'queued',
          blocker:null,
          lastOutcome:'DEFERRED_BY_WORK_LOCK',
          neuronExpectedVariants:0,
          neuronResults:[],
          evidence:[...new Set([...(task.evidence||[]),TRANSIENT_WORK_LOCK_RECOVERY_EVIDENCE,...blockers.map(value=>`transient-work-lock-deferred:${value}`)])]
        }:task)
      });
      applied.push({taskId,outcome:'REQUEUED_TRANSIENT_LOCK',reason:blockers.join('|')||'work-lock-conflict'});
      continue;
    }
    const neuralTransactions=new Map(variants.map(row=>[row,buildNeuralWorkerTransaction(row)]));
    const neuralVariantFeedback=variants.map(row=>neuralTransactions.get(row).feedback);
    const neuralVariantEvidence=variants.flatMap(row=>neuralTransactions.get(row).evidence);
    const allEvidence = [...new Set(variants.flatMap((row) => [
      ...(Array.isArray(row.evidence) ? row.evidence : []),
      ...workloadEvidence(row),
      ...reusableWorkerEvidence(row),
      ...codingStrategyFailureEvidence(row),
      ...neuralTransactions.get(row).evidence
    ]).map(clean).filter(Boolean))];
    if (passes.length) {
      const practiceWinner=passes.find(row=>{
        const ev=(Array.isArray(row.evidence)?row.evidence:[]).map(clean);
        return ev.includes('learning-practice-only')&&ev.includes('production-pass:NO');
      });
      if(practiceWinner){
        const practiceEvidence=[...new Set([
          ...allEvidence,
          'learning-practice-complete',
          'production-pass:NO',
          'source-write:NO'
        ])];
        const settled=settleVibeTask(queue,{taskId,outcome:'PASS',evidence:practiceEvidence,blocker:'',retryable:false});
        queue=settled.queue;
        applied.push({taskId,outcome:'DONE_PRACTICE',winner:clean(practiceWinner.variant)||'primary'});
        continue;
      }
      const winnerEvidence = [
        ...(Array.isArray(winner.evidence) ? winner.evidence.map(clean).filter(Boolean) : []),
        ...workloadEvidence(winner),
        ...reusableWorkerEvidence(winner)
      ];
      const losingStrategyFailureEvidence=variants
        .filter(row=>row!==winner&&clean(row?.outcome).toUpperCase()==='FAIL')
        .flatMap(codingStrategyFailureEvidence);
      const variantSummary = variants.map((row) => `speculative-result:${clean(row.variant) || 'primary'}:${clean(row.outcome).toUpperCase() || 'UNKNOWN'}`);
      queue = markVibeTaskAwaiting(queue, {
        taskId,
        blocker: clean(winner.blocker) || 'candidate-awaiting-qa-and-deployment',
        expectedReservationId,
        evidence: [...winnerEvidence, ...losingStrategyFailureEvidence, ...neuralVariantEvidence, ...variantSummary, `speculative-variants:${variants.length}`, `speculative-winner:${clean(winner.variant) || 'primary'}`]
      });
      applied.push({ taskId, outcome:'AWAIT', winner: clean(winner.variant) || 'primary', neuralFeedback:neuralVariantFeedback });
      continue;
    }
    const blocked = variants.every((row) => clean(row.outcome).toUpperCase() === 'BLOCKED');
    const outcome = blocked ? 'BLOCKED' : 'FAIL';
    const blocker=clean(winner.blocker) || (blocked ? 'worker-route-blocked' : 'parallel-candidate-generation-failed');
    const failureClass=clean(winner?.candidateFailure?.class).toUpperCase()||'UNCLASSIFIED';
    const gatedTransaction=variants.map(row=>neuralTransactions.get(row)).find(transaction=>transaction?.eventRoute?.fireAllowed===true)||null;
    const gatedAction=clean(gatedTransaction?.eventRoute?.proposedAction?.kind);
    const retryStrategyEvidence=outcome==='FAIL'&&gatedTransaction
      ?[`neural-gated-retry-strategy:${failureClass}`,`retry-strategy-must-change-after:${failureClass}`]
      :[];
    const gatedExecutionEvidence=gatedTransaction
      ?[
        `neural-gated-execution:${gatedAction||'ACTION'}`,
        'neural-gated-queue-mutation:REQUEUE_REPRIORITIZE',
        'neural-gated-worker-refill-eligible'
      ]
      :[];
    const settled = settleVibeTask(queue, {
      taskId,
      outcome,
      blocker,
      evidence: [...allEvidence, ...retryStrategyEvidence, ...gatedExecutionEvidence, `failure-cause:${blocker}`],
      retryable: outcome === 'FAIL'
    });
    queue = settled.queue;
    if(outcome==='FAIL'&&gatedTransaction){
      queue=createVibeContinuousQueue({
        maxConcurrentTasks:queue.maxConcurrentTasks,
        tasks:queue.tasks.map(task=>task.id===taskId&&task.status==='queued'
          ?{
            ...task,
            priority:task.priority==='owner-immediate'?'owner-immediate':'high',
            evidence:[...new Set([...(task.evidence||[]),'neural-gated-queue-reprioritized:HIGH'])]
          }
          :task)
      });
    }
    applied.push({ taskId, outcome, neuralFeedback:neuralVariantFeedback, gatedAction:gatedAction||null, retryStrategy:outcome==='FAIL'&&gatedTransaction?failureClass:null });
  }
  const acceptedTaskIds=new Set(applied.filter(row=>clean(row?.outcome)!=='STALE_RESULT_SKIPPED').map(row=>clean(row?.taskId)).filter(Boolean));
  if(acceptedTaskIds.size){
    queue=createVibeContinuousQueue({
      maxConcurrentTasks:queue.maxConcurrentTasks,
      tasks:queue.tasks.map(task=>acceptedTaskIds.has(task.id)?{...task,neuronExpectedVariants:0,neuronResults:[]}:task)
    });
  }
  const durableEvidence=queue.tasks.flatMap(task=>Array.isArray(task.evidence)?task.evidence:[]);
  const neuralCalibration=summarizeNeuralFeedbackEvidence(durableEvidence);
  const neuralEventTelemetry=summarizeNeuralEventShadowEvidence(durableEvidence);
  return { queue, applied, summary: summarizeVibeContinuousQueue(queue), neuralCalibration, neuralEventTelemetry };
}

export function recordVibeNeuronResult(queueInput, rowInput = {}, { expectedVariants = 1 } = {}) {
  let queue = createVibeContinuousQueue(queueInput);
  const taskId = clean(rowInput?.taskId);
  const variant = clean(rowInput?.variant) || 'primary';
  const expected = Math.max(1, Math.min(5, Math.floor(Number(expectedVariants) || 1)));
  const task = queue.tasks.find((item) => item.id === taskId);
  if (!task) return { updated:false, ready:false, slotReleased:false, stale:true, reason:'TASK_NOT_FOUND', taskId, variant, expectedVariants:expected, resultCount:0, queue };
  const rowReservationId = resultReservationId(rowInput);
  if (rowReservationId && clean(task.reservationId) !== rowReservationId) {
    return { updated:false, ready:false, slotReleased:false, stale:true, reason:'RESERVATION_MISMATCH', taskId, variant, expectedVariants:expected, resultCount:(task.neuronResults || []).length, queue };
  }
  if (task.status !== 'running') {
    return { updated:false, ready:false, slotReleased:false, stale:true, reason:`TASK_${clean(task.status).toUpperCase()}_NOT_RUNNING`, taskId, variant, expectedVariants:expected, resultCount:(task.neuronResults || []).length, queue };
  }
  if (isWorkerCapacityReleasedBlocker(task.blocker) && Number(task.neuronExpectedVariants || 0) === 0) {
    return { updated:false, ready:false, slotReleased:true, stale:false, reason:'TASK_ALREADY_MICRO_FANIN_COMPLETE', taskId, variant, expectedVariants:expected, resultCount:0, queue };
  }
  const currentResults = Array.isArray(task.neuronResults) ? task.neuronResults : [];
  const duplicate = currentResults.some((row) => (clean(row?.variant) || 'primary') === variant && resultReservationId(row) === rowReservationId);
  if (duplicate) {
    return { updated:false, ready:currentResults.length >= Math.max(expected, Number(task.neuronExpectedVariants || 0)), slotReleased:false, stale:false, reason:'DUPLICATE_VARIANT', taskId, variant, expectedVariants:Math.max(expected, Number(task.neuronExpectedVariants || 0)), resultCount:currentResults.length, queue };
  }
  const joinedExpected = Math.max(expected, Number(task.neuronExpectedVariants || 0));
  const nextResults = [...currentResults, rowInput];
  queue = createVibeContinuousQueue({
    maxConcurrentTasks: queue.maxConcurrentTasks,
    tasks: queue.tasks.map((item) => item.id === taskId ? { ...item, neuronExpectedVariants:joinedExpected, neuronResults:nextResults } : item)
  });
  if (nextResults.length < joinedExpected) {
    return { updated:true, ready:false, slotReleased:false, stale:false, reason:'AWAITING_VARIANTS', taskId, variant, expectedVariants:joinedExpected, resultCount:nextResults.length, queue };
  }
  const merged = applyVibeFanInResults(queue, nextResults);
  queue = createVibeContinuousQueue({
    maxConcurrentTasks: merged.queue.maxConcurrentTasks,
    tasks: merged.queue.tasks.map((item) => item.id === taskId ? { ...item, neuronExpectedVariants:0, neuronResults:[] } : item)
  });
  const finalTask = queue.tasks.find((item) => item.id === taskId);
  const slotReleased = !finalTask || finalTask.status !== 'running' || isWorkerCapacityReleasedBlocker(finalTask.blocker);
  return {
    updated:true, ready:true, slotReleased, stale:false, reason:'TASK_MICRO_FANIN_COMPLETE',
    taskId, variant, expectedVariants:joinedExpected, resultCount:nextResults.length,
    applied:merged.applied, neuralCalibration:merged.neuralCalibration, neuralEventTelemetry:merged.neuralEventTelemetry, queue
  };
}

export function runQueueCommand(args = {}) {
  const file = queueFileFrom(args);
  const queueFileMissing=!fs.existsSync(file);
  const queueFileBlank=!queueFileMissing&&!clean(fs.readFileSync(file,'utf8'));
  const rawQueue = readJson(file, { tasks: [] });
  const rawTasks = Array.isArray(rawQueue) ? rawQueue : Array.isArray(rawQueue?.tasks) ? rawQueue.tasks : [];
  const atomicSchemaMigrationNeeded = rawQueue?.scheduling?.atomicNeuronCompletion !== true
    || rawTasks.some((task) => {
      const row=task&&typeof task==='object'?task:{};
      const evidence=Array.isArray(row.evidence)?row.evidence.map(clean):[];
      const presentation=/\[PRESENTATION_PASS:[A-Z_]+\]|\[WEATHER_PRESENTATION\]/i.test(clean(row.goal))
        || evidence.some(value=>/^presentation-pass:|^weather-presentation:v1$|^asset-production-parallel:v1$/i.test(value));
      return !Object.prototype.hasOwnProperty.call(row,'neuronExpectedVariants')
        || !Object.prototype.hasOwnProperty.call(row,'neuronResults')
        || (presentation && (
          clean(row.atomicNeuronMode)!=='PER_TASK_MICRO_FANIN'
          || row.atomicCompletionRequired!==true
          || !evidence.includes('atomic-neuron-stream:presentation')
          || !evidence.includes('atomic-neuron-micro-fanin:per-task')
          || !evidence.includes('graphics-atomic-candidate-isolation-required')
        ));
    });
  const queueStateRecovered=queueFileMissing||queueFileBlank;
  let queue = createVibeContinuousQueue(queueStateRecovered?{...rawQueue,maxConcurrentTasks:EXTERNAL_MATRIX_BATCH_MAX}:rawQueue);
  if(queueStateRecovered)writeJson(file,queue);
  const command = clean(args.command).toLowerCase();
  const transientLockRecovery=['reserve','reserve-batch','neuron-complete'].includes(command)?recoverTransientWorkLockBlocks(queue):{recovered:0,queue};
  queue=transientLockRecovery.queue;
  let result;
  if (command === 'verify-worker-sync') {
    const sync=verifyVibeWorkerSynchronization(queue,{
      taskId:clean(args.id),
      reservationId:clean(args['reservation-id']),
      reservationRunId:clean(args['reservation-run']),
      reservationRunAttempt:Number(args['reservation-attempt']||0),
      reservedAt:clean(args['reserved-at'])
    });
    if(!sync.pass)throw new Error(`VIBE_WORKER_SYNC_FAILED:${sync.failures.join(',')}`);
    result={command,...sync,queue,summary:summarizeVibeContinuousQueue(queue)};
  } else if (command === 'enqueue') {
    queue = enqueueVibeTask(queue, {
      id: args.id, gameId: args.game, target: args.target, department: args.department, type: args.type, goal: args.goal,
      responsibleFiles: list(args.files), dependencies: list(args.dependencies), priority: args.priority, releaseState: args['release-state'],
      maxRetries: args.retries, retryPolicy: args['retry-policy'], ownerDirective: bool(args.owner), requiresOwnerDecision: bool(args['owner-decision']),
      protectedChange: bool(args.protected), paidResourceRequired: bool(args.paid), sourceRoot: args['source-root'],
      speculativeEligible: bool(args.speculative), estimatedRisk: args.risk,
      atomicNeuronMode: args['atomic-neuron-mode'], atomicCompletionRequired: bool(args['atomic-completion-required']),
      evidence: list(args.evidence)
    });
    writeJson(file, queue);
    result = { command, updated: true, taskId: clean(args.id), summary: summarizeVibeContinuousQueue(queue) };
  } else if (command === 'reserve') {
    const executionLane=clean(args.lane)||'game-primary';
    const configuredMaxConcurrentTasks=optionalMaxConcurrent(args.max) ?? queue.maxConcurrentTasks;
    const adaptiveControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? DEFAULT_ADAPTIVE_MIN;
    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl, configuredMaxConcurrentTasks, { minimumMax:adaptiveMinimumConcurrentTasks });
    const reservationMaxConcurrentTasks=executionLane==='game-primary'?adaptiveMaxConcurrentTasks:configuredMaxConcurrentTasks;
    const reserved = reserveNextVibeTask(queue, { maxConcurrentTasks: reservationMaxConcurrentTasks, reservation: reservationFromArgs(args), lane:executionLane });
    if (reserved.reserved || reserved.recovered || transientLockRecovery.recovered || atomicSchemaMigrationNeeded) writeJson(file, reserved.queue);
    result = { command, executionLane, configuredMaxConcurrentTasks, adaptiveMinimumConcurrentTasks, adaptiveMaxConcurrentTasks, reservationMaxConcurrentTasks, adaptiveControl, speculativeExpansion, schemaMigrated:atomicSchemaMigrationNeeded, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane }) };
  } else if (command === 'reserve-batch') {
    const executionLane=clean(args.lane)||'game-primary';
    const configuredMaxConcurrentTasks=optionalMaxConcurrent(args.max) ?? queue.maxConcurrentTasks;
    const adaptiveControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? DEFAULT_ADAPTIVE_MIN;
    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl, configuredMaxConcurrentTasks, { minimumMax:adaptiveMinimumConcurrentTasks });
    const reservationMaxConcurrentTasks=executionLane==='game-primary'?adaptiveMaxConcurrentTasks:configuredMaxConcurrentTasks;
    const speculativeExpansion=executionLane==='game-primary'
      ?speculativeExpansionPolicy(adaptiveControl)
      :Object.freeze({allowed:true,reason:'AUXILIARY_LANE_UNCHANGED',primaryCoveragePreserved:true});
    const reserved = reserveVibeTaskBatch(queue, {
      maxConcurrentTasks: reservationMaxConcurrentTasks,
      reservation: reservationFromArgs(args),
      lane:executionLane,
      speculativeExpansionAllowed:speculativeExpansion.allowed,
      speculativeExpansionReason:speculativeExpansion.reason
    });
    if (reserved.reserved || reserved.recovered || transientLockRecovery.recovered || atomicSchemaMigrationNeeded) writeJson(file, reserved.queue);
    if (clean(args.output)) {
      const createdAt=new Date().toISOString();
      const requestedMaxConcurrentTasks=reserved.selection?.requestedMaxConcurrentTasks ?? adaptiveMaxConcurrentTasks;
      const persistentMaxConcurrentTasks=reserved.selection?.persistentMaxConcurrentTasks ?? queue.maxConcurrentTasks;
      writeJson(clean(args.output), {
        version:4, createdAt, matrix:reserved.matrix,
        scheduler:{
          lane:reserved.selection?.lane || executionLane,
          persistentMaxConcurrentTasks,
          configuredMaxConcurrentTasks,
          adaptiveMaxConcurrentTasks,
          reservationMaxConcurrentTasks,
          speculativeExpansionAllowed:reserved.speculativeExpansionAllowed===true,
          speculativeExpansionReason:reserved.speculativeExpansionReason||speculativeExpansion.reason,
          primaryTaskCount:reserved.primaryTaskCount||0,
          workerCount:reserved.workerCount||0,
          requestedMaxConcurrentTasks,
          effectiveMaxConcurrentTasks:reserved.selection?.effectiveMaxConcurrentTasks ?? Math.min(persistentMaxConcurrentTasks, requestedMaxConcurrentTasks),
          freeSlotsBeforeReservation:reserved.selection?.freeSlots ?? 0,
          runningBeforeReservation:reserved.selection?.running?.length ?? 0,
          activeWorkersBeforeReservation:reserved.selection?.capacityRunning?.length ?? 0,
          awaitingQaBeforeReservation:reserved.selection?.awaitingQa?.length ?? 0,
          backpressure:reserved.selection?.backpressure || { awaitingQaCount:0, retryPressureCount:0 },
          blockedCount:reserved.selection?.blocked?.length ?? 0,
          conflictCount:reserved.selection?.deferredConflicts?.length ?? 0,
          workStealingUsed:reserved.selection?.workStealingUsed === true,
          longWorkProtectedSlotUsed:reserved.selection?.longWorkProtectedSlotUsed === true,
          longWorkOwnerTaskId:reserved.selection?.longWorkOwnerTaskId || null,
          shardUse:reserved.selection?.shardUse || {},
          stopReason:reserved.selection?.stopReason || null
        }
      });
    }
    result = { command, executionLane, configuredMaxConcurrentTasks, adaptiveMinimumConcurrentTasks, adaptiveMaxConcurrentTasks, reservationMaxConcurrentTasks, adaptiveControl, schemaMigrated:atomicSchemaMigrationNeeded, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane }) };
  } else if (command === 'release-slot') {
    const released = releaseVibeTaskExecutionSlot(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });
    queue = released.queue;
    if (released.updated) writeJson(file, queue);
    result = { command, taskId: clean(args.id), ...released, summary: summarizeVibeContinuousQueue(queue) };
  } else if (command === 'await') {
    queue = markVibeTaskAwaiting(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });
    writeJson(file, queue);
    result = { command, updated: true, taskId: clean(args.id), queue, summary: summarizeVibeContinuousQueue(queue) };
  } else if (command === 'neuron-complete') {
    const input = clean(args.input);
    if (!input) throw new Error('--input result json required');
    const payload = readJson(input, {});
    const row = Array.isArray(payload) ? payload[0] : (payload?.result && typeof payload.result === 'object' ? payload.result : payload);
    const executionLane = clean(args.lane) || 'game-primary';
    const configuredMaxConcurrentTasks=optionalMaxConcurrent(args.max) ?? queue.maxConcurrentTasks;
    const adaptiveControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? DEFAULT_ADAPTIVE_MIN;
    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl, configuredMaxConcurrentTasks, { minimumMax:adaptiveMinimumConcurrentTasks });
    const reservationMaxConcurrentTasks=executionLane==='game-primary'?adaptiveMaxConcurrentTasks:configuredMaxConcurrentTasks;
    const neuron = recordVibeNeuronResult(queue, row, { expectedVariants: optionalMaxConcurrent(args['expected-variants']) ?? 1 });
    queue = neuron.queue;
    if (neuron.updated || transientLockRecovery.recovered) writeJson(file, queue);
    result = {
      command, executionLane, configuredMaxConcurrentTasks, adaptiveMinimumConcurrentTasks, adaptiveMaxConcurrentTasks,
      reservationMaxConcurrentTasks, adaptiveControl, ...neuron,
      summary:summarizeVibeContinuousQueue(queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane })
    };
  } else if (command === 'fan-in-regression-fail') {
    const input = clean(args.input);
    if (!input) throw new Error('--input result json required');
    const payload = readJson(input, []);
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [];
    const recovered = recoverFanInRegressionFailure(queue, rows, { blocker:clean(args.blocker) || 'fan-in-regression-failed' });
    queue = recovered.queue;
    if (recovered.recovered) writeJson(file, queue);
    result = { command, updated:recovered.recovered > 0, ...recovered, summary:summarizeVibeContinuousQueue(queue) };
  } else if (command === 'fan-in') {
    const input = clean(args.input);
    if (!input) throw new Error('--input result json required');
    const payload = readJson(input, []);
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [];
    const executionLane=clean(args.lane)||'game-primary';
    const adaptiveEligible=executionLane==='game-primary';
    const currentControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? DEFAULT_ADAPTIVE_MIN;
    const firstMetrics=rows.find((row)=>row?.metrics)?.metrics || {};
    const taskCount=new Set(rows.map((row)=>clean(row?.taskId)).filter(Boolean)).size;
    const telemetry=computeParallelismTelemetry({
      results:rows,
      tasks:queue.tasks,
      requestedMax:firstMetrics.requestedMax || currentControl.currentMax,
      effectiveMax:firstMetrics.effectiveMax || currentControl.currentMax,
      taskCount
    });
    const nextControl=adaptiveEligible
      ? decideAdaptiveBackpressure(currentControl, telemetry, { minimumMax:adaptiveMinimumConcurrentTasks })
      : currentControl;
    const merged = applyVibeFanInResults(queue, rows);
    queue = merged.queue;
    writeJson(file, queue);
    if(adaptiveEligible)writeJson(controlFileFrom(args), nextControl);
    const configuredMaxConcurrentTasks=optionalMaxConcurrent(args.max) ?? queue.maxConcurrentTasks;
    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(nextControl,configuredMaxConcurrentTasks,{minimumMax:adaptiveMinimumConcurrentTasks});
    const reservationMaxConcurrentTasks=executionLane==='game-primary'?adaptiveMaxConcurrentTasks:configuredMaxConcurrentTasks;
    result = {
      command, executionLane, adaptiveEligible, updated: merged.applied.length > 0, telemetry,
      adaptiveControl:nextControl, previousAdaptiveControl:currentControl, ...merged,
      summary:summarizeVibeContinuousQueue(queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane })
    };
  } else if (['pass','fail','block','cancel'].includes(command)) {
    const outcome = command === 'pass' ? 'PASS' : command === 'fail' ? 'FAIL' : command === 'block' ? 'BLOCKED' : 'CANCELLED';
    const settled = settleVibeTask(queue, {
      taskId: clean(args.id), outcome, evidence: list(args.evidence), blocker: clean(args.blocker), retryable: !bool(args['no-retry'])
    });
    if (!settled.updated) throw new Error(`task not found: ${clean(args.id)}`);
    writeJson(file, settled.queue);
    result = { command, ...settled, summary: summarizeVibeContinuousQueue(settled.queue) };
  } else if (command === 'summary') {
    const executionLane=clean(args.lane);
    if(executionLane){
      const configuredMaxConcurrentTasks=optionalMaxConcurrent(args.max) ?? queue.maxConcurrentTasks;
      const adaptiveControl=readParallelismControl(args);
      const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? DEFAULT_ADAPTIVE_MIN;
      const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl,configuredMaxConcurrentTasks,{minimumMax:adaptiveMinimumConcurrentTasks});
      const reservationMaxConcurrentTasks=executionLane==='game-primary'?adaptiveMaxConcurrentTasks:configuredMaxConcurrentTasks;
      const summary=summarizeVibeContinuousQueue(queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane });
      result = {
        command, executionLane, configuredMaxConcurrentTasks, adaptiveMinimumConcurrentTasks, adaptiveMaxConcurrentTasks, reservationMaxConcurrentTasks,
        adaptiveControl, queue, summary,
        selection:selectVibeQueueBatch(queue, { maxConcurrentTasks:reservationMaxConcurrentTasks, lane:executionLane })
      };
    } else {
      result = { command, queue, summary: summarizeVibeContinuousQueue(queue), selection: selectVibeQueueBatch(queue) };
    }
  } else throw new Error(`unknown queue command: ${command}`);
  return {...result,queueStateRecovered};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runQueueCommand(parseArgs());
  console.log(`VIBE2_QUEUE_COMMAND=${result.command}`);
  console.log(`VIBE2_QUEUE_STATE_RECOVERED=${result.queueStateRecovered===true?'YES':'NO'}`);
  if(result.executionLane)console.log(`VIBE2_EXECUTION_LANE=${result.executionLane}`);
  if(result.command==='verify-worker-sync'){
    console.log(`VIBE2_WORKER_SYNC=${result.pass===true?'PASS':'FAIL'}`);
    console.log(`VIBE2_WORKER_SYNC_TASK=${result.taskId||'NONE'}`);
    console.log(`VIBE2_WORKER_SYNC_RESERVATION=${result.reservationId||'NONE'}`);
  }
  if(result.reservationMaxConcurrentTasks)console.log(`VIBE2_LANE_RESERVATION_MAX=${result.reservationMaxConcurrentTasks}`);
  if(result.command==='fan-in')console.log(`VIBE2_FANIN_ADAPTIVE_ELIGIBLE=${result.adaptiveEligible===true?'YES':'NO'}`);
  if(Array.isArray(result.dependencyReadyTaskIds)){
    console.log(`VIBE2_DEPENDENCY_READY_BATCH=${result.dependencyReadyTaskIds.join(',')||'NONE'}`);
    console.log(`VIBE2_DEPENDENCY_EVENT_REQUIRED=${result.dependencyEventRequired===true?'YES':'NO'}`);
  }
  if(result.command==='neuron-complete'){
    console.log(`VIBE2_NEURON_RESULT=${result.reason || 'UNKNOWN'}`);
    console.log(`VIBE2_NEURON_TASK_READY=${result.ready===true?'YES':'NO'}`);
    console.log(`VIBE2_NEURON_SLOT_RELEASED=${result.slotReleased===true?'YES':'NO'}`);
    console.log(`VIBE2_NEURON_VARIANTS=${result.resultCount || 0}/${result.expectedVariants || 1}`);
  }
  console.log(`VIBE2_QUEUE_RECOVERED=${result.recovered ?? 0}`);
  console.log(`VIBE2_QUEUE_NEXT=${result.summary?.nextTaskId || 'NONE'}`);
  console.log(`VIBE2_QUEUE_NEXT_BATCH=${(result.summary?.nextTaskIds || []).join(',') || 'NONE'}`);
  console.log(`VIBE2_QUEUE_RUNNING=${(result.summary?.runningTaskIds || []).join(',') || 'NONE'}`);
  console.log(`VIBE2_QUEUE_PERSISTENT_MAX=${result.summary?.persistentMaxConcurrentTasks ?? result.summary?.maxConcurrentTasks ?? DEFAULT_MAX_CONCURRENT_TASKS}`);
  console.log(`VIBE2_QUEUE_REQUESTED_MAX=${result.summary?.requestedMaxConcurrentTasks ?? result.summary?.maxConcurrentTasks ?? DEFAULT_MAX_CONCURRENT_TASKS}`);
  console.log(`VIBE2_QUEUE_EFFECTIVE_MAX=${result.summary?.effectiveMaxConcurrentTasks ?? result.summary?.maxConcurrentTasks ?? DEFAULT_MAX_CONCURRENT_TASKS}`);
  console.log(`VIBE2_QUEUE_ACTIVE_WORKERS=${(result.summary?.capacityRunningTaskIds || []).length}`);
  console.log(`VIBE2_QUEUE_AWAITING_QA=${(result.summary?.awaitingQaTaskIds || []).length}`);
  console.log(`VIBE2_QUEUE_QUOTA_WAITING=${(result.summary?.quotaWaitingTaskIds || []).length}`);
  console.log(`VIBE2_QUEUE_FREE_SLOTS=${result.summary?.freeSlots ?? 0}`);
  console.log(`VIBE2_QUEUE_LONG_WORK_SLOT=${result.summary?.longWorkProtectedSlotUsed ? 'USED' : 'NOT_USED'}`);
  console.log(`VIBE2_QUEUE_CONTINUE=${result.summary?.continueRequired ? 'YES' : 'NO'}`);
  console.log(`VIBE2_BRAIN_LIVE=${result.summary?.brainLive===true?'YES':'NO'}`);
  console.log(`VIBE2_CAUSAL_REPLAN_REQUIRED=${result.summary?.causalReplanRequired===true?'YES':'NO'}`);
  console.log(`VIBE2_QUEUE_RELEASED_WORKER_SLOTS=${(result.summary?.releasedWorkerSlotTaskIds || []).length}`);
  if (result.command === 'release-slot') console.log(`VIBE2_SLOT_RELEASED=${result.released ? 'YES' : 'NO'}`);
  if (result.adaptiveControl) {
    console.log(`VIBE2_ADAPTIVE_MAX=${result.adaptiveControl.currentMax}`);
    console.log(`VIBE2_ADAPTIVE_DECISION=${result.adaptiveControl.lastDecision}`);
    console.log(`VIBE2_ADAPTIVE_REASON=${result.adaptiveControl.lastReason}`);
  }
  if (result.telemetry?.workload) {
    console.log(`VIBE2_WORKLOAD_FEATURES_COMPLETED=${result.telemetry.workload.completedFeatureCount}`);
    console.log(`VIBE2_WORKLOAD_CHANGED_FILES=${result.telemetry.workload.changedFileCount}`);
    console.log(`VIBE2_WORKLOAD_CHANGED_LINES=${result.telemetry.workload.changedLineCount}`);
    console.log(`VIBE2_WORKLOAD_REWORK_RATE=${result.telemetry.workload.reworkRatePct}`);
    console.log(`VIBE2_WORKLOAD_QA_DUPLICATE_RATE=${result.telemetry.workload.qaDuplicateRatePct}`);
  }
  if (result.task?.id) console.log(`VIBE2_RESERVED_TASK=${result.task.id}`);
  if (result.tasks?.length) console.log(`VIBE2_RESERVED_TASKS=${result.tasks.map((task) => task.id).join(',')}`);
  if (result.matrix) console.log(`VIBE2_RESERVED_MATRIX=${JSON.stringify(result.matrix)}`);
}
