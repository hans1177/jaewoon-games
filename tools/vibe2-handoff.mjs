// 파일명: tools/vibe2-handoff.mjs
// 역할: Vibe2 중앙 기계 설정과 런타임 상태를 읽어 현재 작업/인수인계 스냅샷을 자동 생성한다.
// 원칙: 사람이 별도 인수인계 문서를 수동 갱신하지 않는다. 이 출력은 기존 기계 상태의 파생값이다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean = (value) => String(value ?? '').trim();

function readJson(file, fallback = null) {
  if (!file || !fs.existsSync(file)) {
    if (fallback !== null) return fallback;
    throw new Error(`missing json: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}

function countStatuses(tasks = []) {
  const counts = {};
  for (const task of tasks) {
    const status = clean(task?.status) || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function priorityRank(task = {}) {
  if (task.ownerDirective === true) return 0;
  const map = { critical: 1, high: 2, normal: 3, low: 4 };
  return map[clean(task.priority).toLowerCase()] ?? 5;
}

function taskPreview(task = {}) {
  return {
    id: clean(task.id) || null,
    gameId: clean(task.gameId) || null,
    target: clean(task.target) || null,
    shard: clean(task.shard) || null,
    priority: clean(task.priority) || null,
    releaseState: clean(task.releaseState) || null,
    status: clean(task.status) || null,
    sourceRoot: clean(task.sourceRoot) || null,
    responsibleFiles: Array.isArray(task.responsibleFiles) ? task.responsibleFiles : [],
    dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
    blocker: clean(task.blocker) || null,
    ownerDirective: task.ownerDirective === true
  };
}

export function buildVibe2Handoff({
  runtime = {},
  queue = {},
  parallelism = {},
  experience = {}
} = {}) {
  const tasks = Array.isArray(queue.tasks) ? queue.tasks : [];
  const queued = tasks
    .filter((task) => clean(task.status).toLowerCase() === 'queued')
    .sort((a, b) => priorityRank(a) - priorityRank(b) || clean(a.id).localeCompare(clean(b.id)));
  const running = tasks.filter((task) => clean(task.status).toLowerCase() === 'running');
  const failed = tasks.filter((task) => clean(task.status).toLowerCase() === 'failed');
  const blocked = tasks.filter((task) => clean(task.status).toLowerCase() === 'blocked');
  const records = Array.isArray(experience.records) ? experience.records : [];
  const docs = runtime.documentation || {};
  const work = runtime.workManagement || {};
  const adaptive = runtime.adaptiveBackpressure || {};

  return {
    version: 1,
    kind: 'vibe2-machine-handoff',
    sourceOfTruth: docs.machineSourceOfTruth || 'vibe2-runtime.json',
    controlBranch: runtime.branches?.control || 'vibe2-unreal-core',
    generatedFrom: {
      runtimeVersion: Number(runtime.version || 0),
      queueVersion: Number(queue.version || 0),
      parallelismVersion: Number(parallelism.version || 0),
      experienceVersion: Number(experience.version || 0)
    },
    workPolicy: {
      largeWorkExecution: work.largeWorkExecution || 'phased-until-complete',
      splitRule: work.splitRule || 'split-by-implementation-phase-not-artificial-file-count',
      ownerDirectivePreemptsAutonomy: work.ownerDirectivePreemptsAutonomy !== false,
      humanMaintainedHandoff: work.humanMaintainedHandoff === true
    },
    workState: {
      taskCount: tasks.length,
      statusCounts: countStatuses(tasks),
      queuedCount: queued.length,
      runningCount: running.length,
      failedCount: failed.length,
      blockedCount: blocked.length,
      ownerDirectiveOpenCount: tasks.filter((task) =>
        task.ownerDirective === true && !['completed', 'cancelled'].includes(clean(task.status).toLowerCase())
      ).length,
      queuedPreview: queued.slice(0, 20).map(taskPreview),
      running: running.map(taskPreview),
      failed: failed.slice(0, 20).map(taskPreview),
      blocked: blocked.slice(0, 20).map(taskPreview)
    },
    parallelism: {
      configuredMax: Number(runtime.continuous?.maxConcurrentGameTasks || 20),
      currentPersistentMax: Number(parallelism.currentMax || runtime.continuous?.maxConcurrentGameTasks || 20),
      steps: Array.isArray(adaptive.steps) ? adaptive.steps : [20, 16, 12, 8, 4],
      healthyStreak: Number(parallelism.healthyStreak || 0),
      pressureStreak: Number(parallelism.pressureStreak || 0),
      lastDecision: clean(parallelism.lastDecision) || null,
      lastReason: clean(parallelism.lastReason) || null,
      lastRunId: clean(parallelism.lastRunId) || null
    },
    experience: {
      recordCount: records.length
    },
    readOrder: Array.isArray(work.handoffReadOrder) ? work.handoffReadOrder : [
      'vibe2-runtime.json',
      '.vibe2/queue.json',
      '.vibe2/parallelism-control.json',
      '.vibe2/experience.json'
    ],
    commands: {
      handoff: 'node tools/vibe2-handoff.mjs',
      queueSummary: 'node tools/vibe2-queue-control.mjs summary',
      coreQa: 'node --test qa/vibe2-*.test.mjs'
    }
  };
}

export function generateVibe2Handoff({
  runtimeFile = 'vibe2-runtime.json',
  queueFile = '',
  controlFile = '',
  experienceFile = ''
} = {}) {
  const runtime = readJson(runtimeFile);
  const state = runtime.documentation?.runtimeState || {};
  const queue = readJson(clean(queueFile) || state.queue || runtime.sources?.queue || '.vibe2/queue.json', { version: 0, tasks: [] });
  const parallelism = readJson(clean(controlFile) || state.parallelism || '.vibe2/parallelism-control.json', { version: 0 });
  const experience = readJson(clean(experienceFile) || state.experience || runtime.sources?.experience || '.vibe2/experience.json', { version: 0, records: [] });
  return buildVibe2Handoff({ runtime, queue, parallelism, experience });
}

export function writeVibe2Handoff(file, snapshot) {
  const output = clean(file);
  if (!output) return;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const snapshot = generateVibe2Handoff({
    runtimeFile: clean(args.runtime) || 'vibe2-runtime.json',
    queueFile: clean(args.queue),
    controlFile: clean(args.control),
    experienceFile: clean(args.experience)
  });
  if (clean(args.output)) writeVibe2Handoff(args.output, snapshot);
  console.log(JSON.stringify(snapshot, null, 2));
}
