// 파일명: tools/vibe2-queue-control.mjs
// 역할: Vibe2 단일 직렬 큐의 추가·예약·QA대기·완료·실패 상태를 영속화한다.
// 원칙: 한 작업이 QA/배포까지 끝나기 전 다음 게임 작업을 시작하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createVibeContinuousQueue,
  selectNextVibeQueueTask,
  beginVibeQueueTask,
  finishVibeQueueTask,
  summarizeVibeContinuousQueue
} from '../assets/vibe-continuous-queue.js';

const clean = (value) => String(value ?? '').trim();
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

export function enqueueVibeTask(queueInput, taskInput = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const id = clean(taskInput.id);
  const goal = clean(taskInput.goal);
  if (!id) throw new Error('task id required');
  if (!goal) throw new Error('task goal required');
  if (queue.tasks.some((task) => task.id === id)) throw new Error(`duplicate task id: ${id}`);
  const ownerDirective = Boolean(taskInput.ownerDirective);
  return createVibeContinuousQueue([...queue.tasks, {
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
    evidence: []
  }]);
}

export function reserveNextVibeTask(queueInput) {
  const queue = createVibeContinuousQueue(queueInput);
  const selection = selectNextVibeQueueTask(queue);
  if (!selection.selected) return { reserved: false, queue, selection };
  const started = beginVibeQueueTask(queue, selection.selected.id);
  return { reserved: started.started, task: started.task || null, queue: started.queue, selection };
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
  return createVibeContinuousQueue(tasks);
}

export function settleVibeTask(queueInput, { taskId = '', outcome = 'PASS', evidence = [], blocker = '', retryable = true } = {}) {
  return finishVibeQueueTask(queueInput, { taskId, outcome, evidence, blocker, retryable });
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
      protectedChange: bool(args.protected), paidResourceRequired: bool(args.paid)
    });
    writeJson(file, queue);
    result = { command, updated: true, taskId: clean(args.id), summary: summarizeVibeContinuousQueue(queue) };
  } else if (command === 'reserve') {
    const reserved = reserveNextVibeTask(queue);
    if (reserved.reserved) writeJson(file, reserved.queue);
    result = { command, ...reserved, summary: summarizeVibeContinuousQueue(reserved.queue) };
  } else if (command === 'await') {
    queue = markVibeTaskAwaiting(queue, { taskId: clean(args.id), evidence: list(args.evidence), blocker: clean(args.blocker) });
    writeJson(file, queue);
    result = { command, updated: true, taskId: clean(args.id), queue, summary: summarizeVibeContinuousQueue(queue) };
  } else if (['pass','fail','block','cancel'].includes(command)) {
    const outcome = command === 'pass' ? 'PASS' : command === 'fail' ? 'FAIL' : command === 'block' ? 'BLOCKED' : 'CANCELLED';
    const settled = settleVibeTask(queue, {
      taskId: clean(args.id), outcome, evidence: list(args.evidence), blocker: clean(args.blocker), retryable: !bool(args['no-retry'])
    });
    if (!settled.updated) throw new Error(`task not found: ${clean(args.id)}`);
    writeJson(file, settled.queue);
    result = { command, ...settled, summary: summarizeVibeContinuousQueue(settled.queue) };
  } else if (command === 'summary') {
    result = { command, queue, summary: summarizeVibeContinuousQueue(queue), selection: selectNextVibeQueueTask(queue) };
  } else throw new Error(`unknown queue command: ${command}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runQueueCommand(parseArgs());
  console.log(`VIBE2_QUEUE_COMMAND=${result.command}`);
  console.log(`VIBE2_QUEUE_NEXT=${result.summary?.nextTaskId || 'NONE'}`);
  console.log(`VIBE2_QUEUE_CONTINUE=${result.summary?.continueRequired ? 'YES' : 'NO'}`);
  if (result.task?.id) console.log(`VIBE2_RESERVED_TASK=${result.task.id}`);
}
