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

const clean = (value) => String(value ?? '').trim();
const FULL_WEB_TRANSPORT_REPAIR_EVIDENCE = 'repair-retry:vibe2-full-web-stream-http-v1';
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
function priority(value, ownerDirective) { if (ownerDirective) return 'owner-immediate'; return ['critical','high','normal','low'].includes(clean(value)) ? clean(value) : 'normal'; }
function bool(value) { return value === true || ['1','true','yes','y'].includes(clean(value).toLowerCase()); }
function list(value) { return clean(value).split(',').map(clean).filter(Boolean); }
function maxConcurrent(value) { return Math.max(1, Math.min(8, Math.floor(Number(value) || DEFAULT_MAX_CONCURRENT_TASKS))); }

function isRecoverableFullWebTransportFailure(task = {}) {
  const evidence = Array.isArray(task.evidence) ? task.evidence : [];
  const blocker = clean(task.blocker);
  return task.ownerDirective === true
    && clean(task.target).toLowerCase() === 'web'
    && /FULL_WEB_GAME_REBUILD/.test(clean(task.goal))
    && task.status === 'failed'
    && Number(task.retries || 0) > Number(task.maxRetries ?? 2)
    && ['source-candidate-generation-failed','parallel-candidate-generation-failed'].includes(blocker)
    && !evidence.includes(FULL_WEB_TRANSPORT_REPAIR_EVIDENCE);
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
      evidence: [...new Set([...(task.evidence || []), FULL_WEB_TRANSPORT_REPAIR_EVIDENCE])]
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

export function reserveNextVibeTask(queueInput, { maxConcurrentTasks = null } = {}) {
  const recovered = recoverFixedFullWebTransportFailures(queueInput);
  const queue = recovered.queue;
  const selection = selectVibeQueueBatch(queue, { maxConcurrentTasks: maxConcurrentTasks || queue.maxConcurrentTasks });
  const selected = selection.selected[0];
  if (!selected) return { reserved: false, queue, selection, recovered: recovered.recovered };
  const started = beginVibeQueueTask(queue, selected.id, { maxConcurrentTasks: maxConcurrentTasks || queue.maxConcurrentTasks });
  return { reserved: started.started, task: started.task || null, queue: started.queue, selection, recovered: recovered.recovered };
}

export function reserveVibeTaskBatch(queueInput, { maxConcurrentTasks = null } = {}) {
  const recovered = recoverFixedFullWebTransportFailures(queueInput);
  const queue = recovered.queue;
  const started = beginVibeQueueBatch(queue, { maxConcurrentTasks: maxConcurrentTasks || queue.maxConcurrentTasks });
  return {
    reserved: started.started,
    tasks: started.tasks || [],
    queue: started.queue,
    selection: started.selection,
    recovered: recovered.recovered,
    matrix: (started.tasks || []).map((task) => ({
      taskId: task.id,
      shard: task.shard,
      speculativeVariants: task.target !== 'unity' && task.speculativeEligible && task.estimatedRisk === 'high' ? 2 : 1
    }))
  };
}

export function markVibeTaskAwaiting(queueInput, { taskId = '', evidence = [], blocker = 'awaiting-qa' } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskId);
  let found = false;
  const tasks = queue.tasks.map((task) => {
    if (task.id !== id) return task;
    found = true;
    if (task.status !== 'running') throw new Error(`await requires running task: ${id}`);
    return {
      ...task,
      status: 'running',
      blocker: clean(blocker) || 'awaiting-qa',
      evidence: [...new Set([...(task.evidence || []), ...(evidence || []).map(clean).filter(Boolean)])]
    };
  });
  if (!found) throw new Error(`task not found: ${id}`);
  return createVibeContinuousQueue({ tasks, maxConcurrentTasks: queue.maxConcurrentTasks });
}

export function settleVibeTask(queueInput, { taskId = '', outcome = 'PASS', evidence = [], blocker = '', retryable = true } = {}) {
  return finishVibeQueueTask(queueInput, { taskId, outcome, evidence, blocker, retryable });
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
    const passes = variants.filter((row) => clean(row.outcome).toUpperCase() === 'PASS');
    const winner = passes.sort((a,b) => Number(a.durationMs || 0) - Number(b.durationMs || 0))[0] || variants[0];
    const allEvidence = [...new Set(variants.flatMap((row) => Array.isArray(row.evidence) ? row.evidence : []).map(clean).filter(Boolean))];
    if (passes.length) {
      const winnerEvidence = Array.isArray(winner.evidence) ? winner.evidence.map(clean).filter(Boolean) : [];
      const variantSummary = variants.map((row) => `speculative-result:${clean(row.variant) || 'primary'}:${clean(row.outcome).toUpperCase() || 'UNKNOWN'}`);
      queue = markVibeTaskAwaiting(queue, {
        taskId,
        blocker: clean(winner.blocker) || 'candidate-awaiting-qa-and-deployment',
        evidence: [...winnerEvidence, ...variantSummary, `speculative-variants:${variants.length}`, `speculative-winner:${clean(winner.variant) || 'primary'}`]
      });
      applied.push({ taskId, outcome:'AWAIT', winner: clean(winner.variant) || 'primary' });
      continue;
    }
    const blocked = variants.every((row) => clean(row.outcome).toUpperCase() === 'BLOCKED');
    const outcome = blocked ? 'BLOCKED' : 'FAIL';
    const settled = settleVibeTask(queue, {
      taskId,
      outcome,
      blocker: clean(winner.blocker) || (blocked ? 'worker-route-blocked' : 'parallel-candidate-generation-failed'),
      evidence: allEvidence,
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
    const reserved = reserveNextVibeTask(queue, { maxConcurrentTasks: maxConcurrent(args.max) });
    if (reserved.reserved || reserved.recovered) writeJson(file, reserved.queue);
    result = { command, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue) };
  } else if (command === 'reserve-batch') {
    const reserved = reserveVibeTaskBatch(queue, { maxConcurrentTasks: maxConcurrent(args.max) });
    if (reserved.reserved || reserved.recovered) writeJson(file, reserved.queue);
    if (clean(args.output)) writeJson(clean(args.output), { version:1, createdAt:new Date().toISOString(), matrix:reserved.matrix });
    result = { command, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue) };
  } else if (command === 'await') {
    queue = markVibeTaskAwaiting(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });
    writeJson(file, queue);
    result = { command, updated: true, taskId: clean(args.id), queue, summary: summarizeVibeContinuousQueue(queue) };
  } else if (command === 'fan-in') {
    const input = clean(args.input);
    if (!input) throw new Error('--input result json required');
    const payload = readJson(input, []);
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [];
    const merged = applyVibeFanInResults(queue, rows);
    queue = merged.queue;
    writeJson(file, queue);
    result = { command, updated: merged.applied.length > 0, ...merged };
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
  console.log(`VIBE2_QUEUE_FREE_SLOTS=${result.summary?.freeSlots ?? 0}`);
  console.log(`VIBE2_QUEUE_CONTINUE=${result.summary?.continueRequired ? 'YES' : 'NO'}`);
  if (result.task?.id) console.log(`VIBE2_RESERVED_TASK=${result.task.id}`);
  if (result.tasks?.length) console.log(`VIBE2_RESERVED_TASKS=${result.tasks.map((task) => task.id).join(',')}`);
  if (result.matrix) console.log(`VIBE2_RESERVED_MATRIX=${JSON.stringify(result.matrix)}`);
}
