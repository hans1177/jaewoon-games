// 파일명: tools/vibe2-queue-control.mjs
// 역할: Vibe2 병렬 DAG 큐의 추가·batch 예약·QA대기·완료·실패 상태를 영속화한다.
// 원칙: 서로 다른 source root만 병렬 예약하고 동일 root/file은 잠근다. 상태 쓰기는 fan-in에서 한 번에 합친다.

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
  DEFAULT_MAX_CONCURRENT_TASKS
} from '../assets/vibe-continuous-queue.js';
import { computeParallelismTelemetry } from './vibe2-parallelism-telemetry.mjs';
import { adaptiveRequestedMax, createParallelismControl, decideAdaptiveBackpressure } from './vibe2-adaptive-backpressure.mjs';

const clean = (value) => String(value ?? '').trim();
const FULL_WEB_OUTPUT_BUDGET_REPAIR_EVIDENCE = 'repair-retry:vibe2-full-web-output-budget-v2';
const SOURCE_GENERATION_CONTEXT_REPAIR_EVIDENCE = 'repair-retry:vibe2-source-generation-context-v3';
const STALE_RUNNING_RECOVERY_EVIDENCE = 'recovery:stale-running-reservation-v1';
const DEFAULT_STALE_RUNNING_MS = 45 * 60 * 1000;
function readJson(file, fallback = {}) { if (!file || !fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file, 'utf8')); }
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
    return createParallelismControl({ lastReason: 'INVALID_STATE_EXTERNAL_BATCH_DEFAULT' });
  }
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
      status: 'queued', retries: 0, maxRetries: Math.max(0, Math.min(5, Number(taskInput.maxRetries ?? 2) || 0)),
      ownerDirective,
      requiresOwnerDecision: Boolean(taskInput.requiresOwnerDecision),
      protectedChange: Boolean(taskInput.protectedChange),
      paidResourceRequired: Boolean(taskInput.paidResourceRequired),
      sourceRoot: clean(taskInput.sourceRoot) || null,
      speculativeEligible: Boolean(taskInput.speculativeEligible),
      estimatedRisk: clean(taskInput.estimatedRisk) || 'low',
      evidence: []
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

export function reserveVibeTaskBatch(queueInput, { maxConcurrentTasks = null, reservation = {}, lane = 'game-primary' } = {}) {
  const recovered = recoverRunnableInfrastructureState(queueInput);
  const queue = recovered.queue;
  const started = beginVibeQueueBatch(queue, { maxConcurrentTasks, reservation, lane });
  const tasks = started.tasks || [];
  const workerBudget = Math.max(
    tasks.length,
    Math.floor(Number(started.selection?.effectiveMaxConcurrentTasks ?? maxConcurrentTasks ?? queue.maxConcurrentTasks) || tasks.length || 1)
  );
  const speculativeVariants = new Map(tasks.map((task) => [task.id, 1]));
  const speculativeEligible = tasks.filter((task) =>
    task.target !== 'unity' &&
    task.estimatedRisk === 'high' &&
    (task.speculativeEligible || task.priority === 'critical')
  );
  let spareWorkerSlots = Math.max(0, workerBudget - tasks.length);
  for (let round = 0; round < 2 && spareWorkerSlots > 0; round += 1) {
    for (const task of speculativeEligible) {
      if (spareWorkerSlots <= 0) break;
      speculativeVariants.set(task.id, (speculativeVariants.get(task.id) || 1) + 1);
      spareWorkerSlots -= 1;
    }
  }
  return {
    reserved: started.started,
    tasks,
    queue: started.queue,
    selection: started.selection,
    recovered: recovered.recovered,
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
      speculativeVariants: speculativeVariants.get(task.id) || 1
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
    const allEvidence = [...new Set(variants.flatMap((row) => [
      ...(Array.isArray(row.evidence) ? row.evidence : []),
      ...workloadEvidence(row),
      ...reusableWorkerEvidence(row)
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
      const variantSummary = variants.map((row) => `speculative-result:${clean(row.variant) || 'primary'}:${clean(row.outcome).toUpperCase() || 'UNKNOWN'}`);
      queue = markVibeTaskAwaiting(queue, {
        taskId,
        blocker: clean(winner.blocker) || 'candidate-awaiting-qa-and-deployment',
        expectedReservationId,
        evidence: [...winnerEvidence, ...variantSummary, `speculative-variants:${variants.length}`, `speculative-winner:${clean(winner.variant) || 'primary'}`]
      });
      applied.push({ taskId, outcome:'AWAIT', winner: clean(winner.variant) || 'primary' });
      continue;
    }
    const blocked = variants.every((row) => clean(row.outcome).toUpperCase() === 'BLOCKED');
    const outcome = blocked ? 'BLOCKED' : 'FAIL';
    const blocker=clean(winner.blocker) || (blocked ? 'worker-route-blocked' : 'parallel-candidate-generation-failed');
    const settled = settleVibeTask(queue, {
      taskId,
      outcome,
      blocker,
      evidence: [...allEvidence, `failure-cause:${blocker}`],
      retryable: outcome === 'FAIL'
    });
    queue = settled.queue;
    applied.push({ taskId, outcome });
  }
  return { queue, applied, summary: summarizeVibeContinuousQueue(queue) };
}

export function runQueueCommand(args = {}) {
  const file = queueFileFrom(args);
  let queue = createVibeContinuousQueue(readJson(file, { tasks: [] }));
  const command = clean(args.command).toLowerCase();
  let result;
  if (command === 'enqueue') {
    queue = enqueueVibeTask(queue, {
      id: args.id, gameId: args.game, target: args.target, department: args.department, type: args.type, goal: args.goal,
      responsibleFiles: list(args.files), dependencies: list(args.dependencies), priority: args.priority, releaseState: args['release-state'],
      maxRetries: args.retries, ownerDirective: bool(args.owner), requiresOwnerDecision: bool(args['owner-decision']),
      protectedChange: bool(args.protected), paidResourceRequired: bool(args.paid), sourceRoot: args['source-root'],
      speculativeEligible: bool(args.speculative), estimatedRisk: args.risk
    });
    writeJson(file, queue);
    result = { command, updated: true, taskId: clean(args.id), summary: summarizeVibeContinuousQueue(queue) };
  } else if (command === 'reserve') {
    const configuredMaxConcurrentTasks=optionalMaxConcurrent(args.max) ?? queue.maxConcurrentTasks;
    const adaptiveControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? 4;
    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl, configuredMaxConcurrentTasks, { minimumMax:adaptiveMinimumConcurrentTasks });
    const reserved = reserveNextVibeTask(queue, { maxConcurrentTasks: adaptiveMaxConcurrentTasks, reservation: reservationFromArgs(args) });
    if (reserved.reserved || reserved.recovered) writeJson(file, reserved.queue);
    result = { command, configuredMaxConcurrentTasks, adaptiveMinimumConcurrentTasks, adaptiveMaxConcurrentTasks, adaptiveControl, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue) };
  } else if (command === 'reserve-batch') {
    const configuredMaxConcurrentTasks=optionalMaxConcurrent(args.max) ?? queue.maxConcurrentTasks;
    const adaptiveControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? 4;
    const adaptiveMaxConcurrentTasks=adaptiveRequestedMax(adaptiveControl, configuredMaxConcurrentTasks, { minimumMax:adaptiveMinimumConcurrentTasks });
    const reserved = reserveVibeTaskBatch(queue, { maxConcurrentTasks: adaptiveMaxConcurrentTasks, reservation: reservationFromArgs(args) });
    if (reserved.reserved || reserved.recovered) writeJson(file, reserved.queue);
    if (clean(args.output)) {
      const createdAt=new Date().toISOString();
      const requestedMaxConcurrentTasks=reserved.selection?.requestedMaxConcurrentTasks ?? adaptiveMaxConcurrentTasks;
      const persistentMaxConcurrentTasks=reserved.selection?.persistentMaxConcurrentTasks ?? queue.maxConcurrentTasks;
      writeJson(clean(args.output), {
        version:4, createdAt, matrix:reserved.matrix,
        scheduler:{
          persistentMaxConcurrentTasks,
          configuredMaxConcurrentTasks,
          adaptiveMaxConcurrentTasks,
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
    result = { command, configuredMaxConcurrentTasks, adaptiveMinimumConcurrentTasks, adaptiveMaxConcurrentTasks, adaptiveControl, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue) };
  } else if (command === 'release-slot') {
    const released = releaseVibeTaskExecutionSlot(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });
    queue = released.queue;
    if (released.updated) writeJson(file, queue);
    result = { command, taskId: clean(args.id), ...released, summary: summarizeVibeContinuousQueue(queue) };
  } else if (command === 'await') {
    queue = markVibeTaskAwaiting(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });
    writeJson(file, queue);
    result = { command, updated: true, taskId: clean(args.id), queue, summary: summarizeVibeContinuousQueue(queue) };
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
    const currentControl=readParallelismControl(args);
    const adaptiveMinimumConcurrentTasks=optionalMaxConcurrent(args.min) ?? 4;
    const firstMetrics=rows.find((row)=>row?.metrics)?.metrics || {};
    const taskCount=new Set(rows.map((row)=>clean(row?.taskId)).filter(Boolean)).size;
    const telemetry=computeParallelismTelemetry({
      results:rows,
      tasks:queue.tasks,
      requestedMax:firstMetrics.requestedMax || currentControl.currentMax,
      effectiveMax:firstMetrics.effectiveMax || currentControl.currentMax,
      taskCount
    });
    const nextControl=decideAdaptiveBackpressure(currentControl, telemetry, { minimumMax:adaptiveMinimumConcurrentTasks });
    const merged = applyVibeFanInResults(queue, rows);
    queue = merged.queue;
    writeJson(file, queue);
    writeJson(controlFileFrom(args), nextControl);
    result = { command, updated: merged.applied.length > 0, telemetry, adaptiveControl:nextControl, previousAdaptiveControl:currentControl, ...merged };
  } else if (['pass','fail','block','cancel'].includes(command)) {
    const outcome = command === 'pass' ? 'PASS' : command === 'fail' ? 'FAIL' : command === 'block' ? 'BLOCKED' : 'CANCELLED';
    const settled = settleVibeTask(queue, {
      taskId: clean(args.id), outcome, evidence: list(args.evidence), blocker: clean(args.blocker), retryable: !bool(args['no-retry'])
    });
    if (!settled.updated) throw new Error(`task not found: ${clean(args.id)}`);
    writeJson(file, settled.queue);
    result = { command, ...settled, summary: summarizeVibeContinuousQueue(settled.queue) };
  } else if (command === 'summary') {
    result = { command, queue, summary: summarizeVibeContinuousQueue(queue), selection: selectVibeQueueBatch(queue) };
  } else throw new Error(`unknown queue command: ${command}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runQueueCommand(parseArgs());
  console.log(`VIBE2_QUEUE_COMMAND=${result.command}`);
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
