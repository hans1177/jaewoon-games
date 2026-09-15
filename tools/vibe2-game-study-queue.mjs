// 파일명: tools/vibe2-game-study-queue.mjs
// 역할: GAME STUDY를 기존 Vibe2 병렬 큐/백프레셔 안에서 24시간 반복 예약하고 fan-in에서 Experience Memory로 승격한다.
// 원칙: 일반 작업과 같은 maxConcurrentTasks/currentMax를 공유하며, Study worker는 control/main을 직접 쓰지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue, selectVibeQueueBatch, summarizeVibeContinuousQueue } from '../assets/vibe-continuous-queue.js';
import { promoteGameStudyToExperience } from './vibe2-game-study.mjs';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const STUDY_EVIDENCE_PREFIX = 'game-study-target:';

function readJson(file, fallback = {}) { if (!file || !fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function parseArgs(argv = process.argv.slice(2)) { const [command = 'summary', ...rest] = argv; const args = { command }; for (const raw of rest) { if (!raw.startsWith('--')) continue; const body = raw.slice(2); const at = body.indexOf('='); if (at < 0) args[body] = true; else args[body.slice(0, at)] = body.slice(at + 1); } return args; }
function clamp(value, min = 1, max = 20) { return Math.max(min, Math.min(max, Math.floor(Number(value) || min))); }
function safeId(value) { return clean(value).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'study'; }

export function normalizeGameStudyTarget(input = {}, index = 0) {
  const id = safeId(input.id || input.gameId || `target-${index + 1}`);
  const engine = clean(input.engine).toLowerCase();
  const sourceAccess = clean(input.sourceAccess) || 'observation-only';
  const root = posix(input.root);
  const sourceRoot = posix(input.sourceRoot || (sourceAccess === 'owned-or-authorized-local-copy' ? root : ''));
  const url = clean(input.url);
  const scenarioFile = posix(input.scenarioFile);
  const issues = [];
  if (!['web', 'roblox'].includes(engine)) issues.push('engine-must-be-web-or-roblox');
  if (!scenarioFile) issues.push('scenario-file-required');
  if (engine === 'web' && !root && !url) issues.push('web-root-or-url-required');
  if (engine === 'roblox' && input.runnerReady !== true) issues.push('roblox-real-studio-runner-not-ready');
  if (sourceAccess === 'owned-or-authorized-local-copy' && !sourceRoot) issues.push('authorized-source-root-required');
  if (!['observation-only', 'owned-or-authorized-local-copy'].includes(sourceAccess)) issues.push('source-access-policy-invalid');
  return Object.freeze({
    version: 1,
    id,
    taskId: `game-study-${id}`,
    enabled: input.enabled !== false,
    engine,
    gameId: clean(input.gameId) || `reference-${id}`,
    root: root || null,
    url: url || null,
    scenarioFile: scenarioFile || null,
    sourceRoot: sourceRoot || null,
    sourceAccess,
    tags: Object.freeze(unique(input.tags || [])),
    priority: ['critical', 'high', 'normal', 'low'].includes(clean(input.priority)) ? clean(input.priority) : 'low',
    runnerReady: engine === 'web' ? true : input.runnerReady === true,
    command: clean(input.command) || null,
    commandArgs: Object.freeze(Array.isArray(input.commandArgs) ? input.commandArgs.map(String) : []),
    cwd: posix(input.cwd) || null,
    timeoutMs: Math.max(15000, Math.min(600000, Number(input.timeoutMs) || (engine === 'web' ? 120000 : 180000))),
    valid: issues.length === 0,
    issues: Object.freeze(unique(issues))
  });
}

export function loadGameStudyTargets(input = {}) {
  const rows = Array.isArray(input) ? input : Array.isArray(input?.targets) ? input.targets : [];
  const targets = rows.map(normalizeGameStudyTarget).filter((target) => target.enabled);
  return Object.freeze({
    version: 1,
    mode: clean(input?.mode) || 'hourly-24h-parallel-study',
    maxConcurrentTasks: clamp(input?.maxConcurrentTasks || 20),
    targets: Object.freeze(targets),
    runnable: Object.freeze(targets.filter((target) => target.valid && target.runnerReady)),
    invalid: Object.freeze(targets.filter((target) => !target.valid))
  });
}

function isStudyTask(task = {}) {
  return (task.evidence || []).some((item) => clean(item).startsWith(STUDY_EVIDENCE_PREFIX));
}
function studyTargetId(task = {}) {
  const row = (task.evidence || []).find((item) => clean(item).startsWith(STUDY_EVIDENCE_PREFIX));
  return row ? clean(row).slice(STUDY_EVIDENCE_PREFIX.length) : null;
}
function taskForTarget(target) {
  const sourceRoot = target.sourceRoot || target.root || `game-study:${target.id}`;
  return {
    id: target.taskId,
    gameId: target.gameId,
    target: target.engine,
    department: 'qa',
    type: 'research',
    goal: `[GAME_STUDY:${target.id}] verified observation and pattern distillation for ${target.gameId}`,
    responsibleFiles: [],
    dependencies: [],
    priority: target.priority,
    releaseState: 'other',
    status: 'queued',
    retries: 0,
    maxRetries: 2,
    ownerDirective: false,
    requiresOwnerDecision: false,
    protectedChange: false,
    paidResourceRequired: false,
    sourceRoot,
    speculativeEligible: false,
    estimatedRisk: 'low',
    evidence: [
      `${STUDY_EVIDENCE_PREFIX}${target.id}`,
      `game-study-engine:${target.engine}`,
      `game-study-source-access:${target.sourceAccess}`,
      'game-study-shared-parallel-cap'
    ]
  };
}

export function prepareGameStudyQueue(queueInput = {}, targetInput = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  const targets = loadGameStudyTargets(targetInput);
  const targetByTask = new Map(targets.runnable.map((target) => [target.taskId, target]));
  const seen = new Set();
  const tasks = queue.tasks.map((task) => {
    const target = targetByTask.get(task.id);
    if (!target) return task;
    seen.add(task.id);
    if (task.status === 'running') return task;
    const refreshed = taskForTarget(target);
    return { ...refreshed, evidence: unique([...(task.evidence || []), ...refreshed.evidence]) };
  });
  for (const target of targets.runnable) if (!seen.has(target.taskId)) tasks.push(taskForTarget(target));
  return {
    queue: createVibeContinuousQueue({ maxConcurrentTasks: queue.maxConcurrentTasks, tasks }),
    targets,
    targetByTask
  };
}

export function reserveGameStudyBatch(queueInput = {}, targetInput = {}, controlInput = {}, { maxConcurrentTasks = 20 } = {}) {
  const prepared = prepareGameStudyQueue(queueInput, targetInput);
  const persistentMax = clamp(prepared.queue.maxConcurrentTasks || 20);
  const controlMax = clamp(controlInput?.currentMax || persistentMax);
  const targetMax = clamp(prepared.targets.maxConcurrentTasks || persistentMax);
  const requestedMax = Math.min(clamp(maxConcurrentTasks || 20), persistentMax, controlMax, targetMax);
  const selectionQueue = createVibeContinuousQueue({
    maxConcurrentTasks: prepared.queue.maxConcurrentTasks,
    tasks: prepared.queue.tasks.map((task) => isStudyTask(task) || task.status !== 'queued' ? task : { ...task, status: 'blocked', blocker: task.blocker || 'reserved-for-normal-vibe2-worker' })
  });
  const selection = selectVibeQueueBatch(selectionQueue, { maxConcurrentTasks: requestedMax });
  const selectedIds = new Set(selection.selected.map((task) => task.id));
  const queue = createVibeContinuousQueue({
    maxConcurrentTasks: prepared.queue.maxConcurrentTasks,
    tasks: prepared.queue.tasks.map((task) => selectedIds.has(task.id) ? { ...task, status: 'running', blocker: null } : task)
  });
  const effectiveMax = Number(selection.effectiveMaxConcurrentTasks || requestedMax);
  const matrix = selection.selected.map((task) => {
    const target = prepared.targetByTask.get(task.id);
    return {
      taskId: task.id,
      safeTask: safeId(task.id),
      targetId: studyTargetId(task),
      engine: target?.engine || clean(task.target),
      gameId: target?.gameId || clean(task.gameId),
      requestedMax,
      effectiveMax
    };
  });
  return Object.freeze({
    version: 1,
    createdAt: new Date().toISOString(),
    queue,
    matrix: Object.freeze(matrix),
    webMatrix: Object.freeze(matrix.filter((row) => row.engine === 'web')),
    robloxMatrix: Object.freeze(matrix.filter((row) => row.engine === 'roblox')),
    selectedCount: matrix.length,
    requestedMax,
    effectiveMax,
    invalidTargets: prepared.targets.invalid,
    scheduler: Object.freeze({
      persistentMaxConcurrentTasks: selection.persistentMaxConcurrentTasks,
      requestedMaxConcurrentTasks: selection.requestedMaxConcurrentTasks,
      effectiveMaxConcurrentTasks: selection.effectiveMaxConcurrentTasks,
      freeSlots: selection.freeSlots,
      backpressure: selection.backpressure
    }),
    authorityExpanded: false
  });
}

export function applyGameStudyFanIn({ queueInput = {}, experienceInput = {}, results = [] } = {}) {
  let queue = createVibeContinuousQueue(queueInput);
  let memory = experienceInput || { records: [] };
  const applied = [];
  for (const raw of results || []) {
    const taskId = clean(raw?.taskId);
    if (!taskId || !isStudyTask(queue.tasks.find((task) => task.id === taskId) || {})) continue;
    let outcome = clean(raw?.outcome).toUpperCase();
    let promoted = false;
    let reinforced = false;
    let reason = clean(raw?.reason || raw?.blocker);
    if (outcome === 'PASS' && raw?.study?.verified === true) {
      const promotion = promoteGameStudyToExperience(memory, raw.study);
      memory = promotion.memory;
      promoted = promotion.promoted === true;
      reinforced = promotion.reinforced === true;
      reason = promotion.reason;
      if (!promotion.promoted) outcome = 'BLOCKED';
    }
    const tasks = queue.tasks.map((task) => {
      if (task.id !== taskId) return task;
      const evidence = unique([...(task.evidence || []), ...(raw?.evidence || []), raw?.study?.id ? `game-study:${raw.study.id}` : '', promoted ? 'game-study-promoted' : '', reinforced ? 'game-study-reinforced' : '']);
      if (outcome === 'PASS') return { ...task, status: 'done', blocker: null, lastOutcome: 'PASS', evidence };
      if (outcome === 'BLOCKED') return { ...task, status: 'blocked', blocker: clean(raw?.blocker) || reason || 'game-study-blocked', lastOutcome: 'BLOCKED', evidence };
      const retries = Number(task.retries || 0) + 1;
      return { ...task, status: retries <= Number(task.maxRetries || 2) ? 'queued' : 'failed', retries, blocker: clean(raw?.blocker) || 'game-study-failed', lastOutcome: 'FAIL', evidence };
    });
    queue = createVibeContinuousQueue({ maxConcurrentTasks: queue.maxConcurrentTasks, tasks });
    applied.push({ taskId, outcome: outcome || 'FAIL', promoted, reinforced, reason });
  }
  return Object.freeze({ queue, memory, applied: Object.freeze(applied), summary: summarizeVibeContinuousQueue(queue), authorityExpanded: false });
}

export function reserveGameStudyFiles({ queueFile = '.vibe2/queue.json', targetsFile = '.vibe2/game-study-targets.json', controlFile = '.vibe2/parallelism-control.json', outputFile = '', maxConcurrentTasks = 20 } = {}) {
  const result = reserveGameStudyBatch(readJson(queueFile, { tasks: [] }), readJson(targetsFile, { targets: [] }), readJson(controlFile, {}), { maxConcurrentTasks });
  writeJson(queueFile, result.queue);
  if (outputFile) writeJson(outputFile, result);
  return result;
}

export function fanInGameStudyFiles({ queueFile = '.vibe2/queue.json', experienceFile = '.vibe2/experience.json', resultsDir = '', outputFile = '' } = {}) {
  const files = clean(resultsDir) && fs.existsSync(resultsDir) ? fs.readdirSync(resultsDir).filter((file) => file.endsWith('.json')).sort() : [];
  const results = files.map((file) => JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8')));
  const result = applyGameStudyFanIn({ queueInput: readJson(queueFile, { tasks: [] }), experienceInput: readJson(experienceFile, { records: [] }), results });
  writeJson(queueFile, result.queue);
  writeJson(experienceFile, result.memory);
  if (outputFile) writeJson(outputFile, result);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  if (args.command === 'reserve') {
    const result = reserveGameStudyFiles({ queueFile: clean(args.queue) || '.vibe2/queue.json', targetsFile: clean(args.targets) || '.vibe2/game-study-targets.json', controlFile: clean(args.control) || '.vibe2/parallelism-control.json', outputFile: clean(args.output), maxConcurrentTasks: Number(args.max) || 20 });
    console.log(`VIBE2_GAME_STUDY_RESERVED=${result.selectedCount}`);
    console.log(`VIBE2_GAME_STUDY_REQUESTED_MAX=${result.requestedMax}`);
    console.log(`VIBE2_GAME_STUDY_EFFECTIVE_MAX=${result.effectiveMax}`);
    console.log(`VIBE2_GAME_STUDY_INVALID_TARGETS=${result.invalidTargets.length}`);
  } else if (args.command === 'fan-in') {
    const result = fanInGameStudyFiles({ queueFile: clean(args.queue) || '.vibe2/queue.json', experienceFile: clean(args.experience) || '.vibe2/experience.json', resultsDir: clean(args.results), outputFile: clean(args.output) });
    console.log(`VIBE2_GAME_STUDY_FANIN=${result.applied.length}`);
    console.log(`VIBE2_GAME_STUDY_MEMORY_RECORDS=${result.memory?.records?.length || 0}`);
  } else {
    const targets = loadGameStudyTargets(readJson(clean(args.targets) || '.vibe2/game-study-targets.json', { targets: [] }));
    console.log(`VIBE2_GAME_STUDY_TARGETS=${targets.targets.length}`);
    console.log(`VIBE2_GAME_STUDY_RUNNABLE=${targets.runnable.length}`);
  }
}
