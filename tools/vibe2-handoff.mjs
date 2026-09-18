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

function reusableEvidence(task = {}) {
  const prefixes = [
    'exploration-reuse:', 'exploration-impact:', 'exploration-tests:', 'role-result:',
    'incremental-qa-hash:', 'incremental-qa-cache:', 'workload:', 'failure-cause:',
    'speculative-result:', 'speculative-winner:', 'repair-mode:', 'diagnostic:'
  ];
  return [...new Set((Array.isArray(task.evidence) ? task.evidence : [])
    .map(clean)
    .filter((value) => prefixes.some((prefix) => value.startsWith(prefix))))];
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
    lastOutcome: clean(task.lastOutcome) || null,
    ownerDirective: task.ownerDirective === true,
    packageId: clean(task.packageId) || null,
    packageRole: clean(task.packageRole) || null,
    packageLongWorkProtected: task.packageLongWorkProtected === true,
    packageContext: task.packageContext || null,
    reusableEvidence: reusableEvidence(task)
  };
}

function reusableContext(task = {}) {
  return {
    taskId: clean(task.id) || null,
    packageId: clean(task.packageId) || null,
    packageRole: clean(task.packageRole) || null,
    sourceRoot: clean(task.sourceRoot) || null,
    responsibleFiles: Array.isArray(task.responsibleFiles) ? task.responsibleFiles : [],
    sharedPreparation: task.packageContext || null,
    reusableEvidence: reusableEvidence(task),
    blocker: clean(task.blocker) || null,
    lastOutcome: clean(task.lastOutcome) || null,
    retries: Number(task.retries || 0)
  };
}

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const resolveFrom = (root, file) => path.isAbsolute(clean(file)) ? clean(file) : path.join(root, clean(file));

export function validateVibe2MachineState({ runtime = {}, queue = {}, parallelism = {}, experience = {}, projectLifecycle = {}, repoRoot = process.cwd() } = {}) {
  const errors = [];
  const docs = runtime.documentation || {};
  const expected = docs.machineStateVersions || {};
  const state = docs.runtimeState || {};
  const work = runtime.workManagement || {};
  const adaptive = runtime.adaptiveBackpressure || {};
  const sources = runtime.sources || {};
  const continuous = runtime.continuous || {};
  const add = (condition, code) => { if (condition) errors.push(code); };

  add(Number(expected.runtime || 0) > 0 && Number(runtime.version || 0) !== Number(expected.runtime), 'RUNTIME_VERSION_MISMATCH');
  add(Number(expected.queue || 0) > 0 && Number(queue.version || 0) !== Number(expected.queue), 'QUEUE_VERSION_MISMATCH');
  add(Number(expected.parallelism || 0) > 0 && Number(parallelism.version || 0) !== Number(expected.parallelism), 'PARALLELISM_VERSION_MISMATCH');
  add(Number(expected.experience || 0) > 0 && Number(experience.version || 0) !== Number(expected.experience), 'EXPERIENCE_VERSION_MISMATCH');
  add(Number(expected.handoff || 0) > 0 && Number(expected.handoff) !== 2, 'HANDOFF_VERSION_MISMATCH');

  const humanDocs = Array.isArray(docs.humanDocuments) ? docs.humanDocuments.map(clean).filter(Boolean) : [];
  const humanDocumentRequired = docs.humanDocumentRequired === true;
  const expectedHumanDocumentLimit = humanDocumentRequired ? 1 : 0;
  add(Number(docs.humanDocumentLimit || 0) !== expectedHumanDocumentLimit, 'HUMAN_DOCUMENT_LIMIT_MISMATCH');
  if (humanDocumentRequired) add(humanDocs.length !== 1 || humanDocs[0] !== 'VIBE2.md', 'HUMAN_DOCUMENT_SET_INVALID');
  else add(humanDocs.length !== 0, 'HUMAN_DOCUMENT_SET_INVALID');
  add(docs.manualHandoffDocumentsAllowed !== false, 'MANUAL_HANDOFF_DOCUMENT_ALLOWED');
  add(work.humanMaintainedHandoff !== false, 'HUMAN_HANDOFF_ENABLED');
  add(work.handoffMode !== 'generated-from-machine-state', 'HANDOFF_MODE_NOT_GENERATED');
  add(work.machineContextRequired !== true, 'MACHINE_CONTEXT_NOT_REQUIRED');
  const consumers = Array.isArray(work.handoffConsumers) ? work.handoffConsumers : [];
  for (const consumer of ['planner', 'reserve', 'worker', 'fan-in']) add(!consumers.includes(consumer), `HANDOFF_CONSUMER_MISSING:${consumer}`);

  add(clean(state.queue) !== clean(sources.queue), 'QUEUE_SOURCE_DIVERGED');
  add(clean(state.parallelism) !== clean(sources.parallelism || adaptive.stateFile), 'PARALLELISM_SOURCE_DIVERGED');
  add(clean(state.experience) !== clean(sources.experience), 'EXPERIENCE_SOURCE_DIVERGED');
  const lifecycleSourcePath=clean(sources.projectLifecycleState||sources.webRobloxHandoffs);
  const lifecycleStatePath=clean(state.projectLifecycle||lifecycleSourcePath);
  if(lifecycleStatePath||lifecycleSourcePath)add(lifecycleStatePath!==lifecycleSourcePath,'PROJECT_LIFECYCLE_SOURCE_DIVERGED');
  const projectContract=runtime.projectLifecycle||{};
  const requiredProjectFields=Array.isArray(projectContract.requiredFields)?projectContract.requiredFields.map(clean).filter(Boolean):[];
  const projectRows=Array.isArray(projectLifecycle.projects)?projectLifecycle.projects:[];
  if(Number(projectLifecycle.projectStateVersion||0)>0||projectRows.length){
    for(const row of projectRows){
      for(const field of requiredProjectFields)add(!Object.hasOwn(row,field),`PROJECT_LIFECYCLE_FIELD_MISSING:${clean(row.gameId)||'UNKNOWN'}:${field}`);
    }
    const declared=Array.isArray(projectLifecycle.requiredProjectFields)?projectLifecycle.requiredProjectFields.map(clean):[];
    add(requiredProjectFields.length>0&&!sameJson(declared,requiredProjectFields),'PROJECT_LIFECYCLE_SCHEMA_DIVERGED');
  }
  add(clean(adaptive.stateFile) !== clean(state.parallelism), 'ADAPTIVE_STATE_FILE_DIVERGED');

  const steps = Array.isArray(adaptive.steps) ? adaptive.steps.map(Number) : [];
  const telemetrySteps = Array.isArray(runtime.parallelismTelemetry?.backpressureSteps) ? runtime.parallelismTelemetry.backpressureSteps.map(Number) : [];
  add(!sameJson(steps, telemetrySteps), 'ADAPTIVE_STEPS_DIVERGED');
  const configuredMax = Number(continuous.maxConcurrentGameTasks || 0);
  add(Number(queue.maxConcurrentTasks || configuredMax) !== configuredMax, 'QUEUE_MAX_DIVERGED');
  add(!steps.includes(Number(parallelism.currentMax || configuredMax)), 'PERSISTENT_MAX_OUTSIDE_STEPS');
  add(Number(parallelism.currentMax || configuredMax) > configuredMax, 'PERSISTENT_MAX_ABOVE_CONFIGURED');

  if (repoRoot && fs.existsSync(repoRoot)) {
    for (const file of humanDocs) add(!fs.existsSync(path.join(repoRoot, file)), `HUMAN_DOCUMENT_MISSING:${file}`);
    for (const file of docs.legacyHumanDocumentsRemoved || []) add(fs.existsSync(path.join(repoRoot, file)), `LEGACY_HUMAN_DOCUMENT_PRESENT:${file}`);
    if (docs.disallowUnlistedVibe2Markdown === true) {
      const actual = fs.readdirSync(repoRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /^VIBE2.*\.md$/i.test(entry.name))
        .map((entry) => entry.name).sort();
      const allowed = [...humanDocs].sort();
      add(!sameJson(actual, allowed), `UNLISTED_VIBE2_MARKDOWN:${actual.filter((file) => !allowed.includes(file)).join(',') || 'SET_MISMATCH'}`);
    }
    const generatedTool = clean(docs.generatedHandoffTool);
    add(!generatedTool || !fs.existsSync(path.join(repoRoot, generatedTool)), 'HANDOFF_TOOL_MISSING');
    for (const [name, file] of [['ENTRY', continuous.entryWorkflow], ['WORKER', continuous.workerWorkflow]]) {
      const normalized = clean(file);
      add(!normalized || !fs.existsSync(path.join(repoRoot, normalized)), `${name}_WORKFLOW_MISSING`);
    }
  }

  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

export function buildVibe2Handoff({
  runtime = {},
  queue = {},
  parallelism = {},
  experience = {},
  projectLifecycle = {},
  consistency = { ok: true, errors: [] }
} = {}) {
  const tasks = Array.isArray(queue.tasks) ? queue.tasks : [];
  const queued = tasks
    .filter((task) => clean(task.status).toLowerCase() === 'queued')
    .sort((a, b) => priorityRank(a) - priorityRank(b) || clean(a.id).localeCompare(clean(b.id)));
  const running = tasks.filter((task) => clean(task.status).toLowerCase() === 'running');
  const failed = tasks.filter((task) => clean(task.status).toLowerCase() === 'failed');
  const blocked = tasks.filter((task) => clean(task.status).toLowerCase() === 'blocked');
  const records = Array.isArray(experience.records) ? experience.records : [];
  const projectRows = Array.isArray(projectLifecycle.projects) ? projectLifecycle.projects : [];
  const docs = runtime.documentation || {};
  const work = runtime.workManagement || {};
  const adaptive = runtime.adaptiveBackpressure || {};
  const reusable = tasks.filter((task) => clean(task.packageId) || reusableEvidence(task).length || clean(task.blocker));

  return {
    version: 2,
    kind: 'vibe2-machine-handoff',
    consistency: { ok: consistency?.ok !== false, errors: Array.isArray(consistency?.errors) ? [...consistency.errors] : [] },
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
      humanMaintainedHandoff: work.humanMaintainedHandoff === true,
      reusableWorkerContext: work.reusableWorkerContext !== false
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
      blocked: blocked.slice(0, 20).map(taskPreview),
      reusableContexts: reusable.slice(-40).map(reusableContext)
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
    projectLifecycle: {
      stateFile: clean(runtime.projectLifecycle?.stateFile || runtime.sources?.projectLifecycleState || runtime.sources?.webRobloxHandoffs) || null,
      stateVersion: Number(projectLifecycle.projectStateVersion || 0),
      projectCount: projectRows.length,
      requiredFields: Array.isArray(runtime.projectLifecycle?.requiredFields) ? [...runtime.projectLifecycle.requiredFields] : [],
      projects: projectRows
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
  experienceFile = '',
  projectLifecycleFile = ''
} = {}) {
  const runtimePath = path.resolve(runtimeFile);
  const repoRoot = path.dirname(runtimePath);
  const runtime = readJson(runtimePath);
  const state = runtime.documentation?.runtimeState || {};
  const queuePath = resolveFrom(repoRoot, clean(queueFile) || state.queue || runtime.sources?.queue || '.vibe2/queue.json');
  const controlPath = resolveFrom(repoRoot, clean(controlFile) || state.parallelism || runtime.sources?.parallelism || runtime.adaptiveBackpressure?.stateFile || '.vibe2/parallelism-control.json');
  const experiencePath = resolveFrom(repoRoot, clean(experienceFile) || state.experience || runtime.sources?.experience || '.vibe2/experience.json');
  const projectLifecyclePath = resolveFrom(repoRoot, clean(projectLifecycleFile) || state.projectLifecycle || runtime.sources?.projectLifecycleState || runtime.sources?.webRobloxHandoffs || '.vibe2/web-roblox-handoffs.json');
  const queue = readJson(queuePath, { version: 0, tasks: [] });
  const parallelism = readJson(controlPath, { version: 0 });
  const experience = readJson(experiencePath, { version: 0, records: [] });
  const projectLifecycle = readJson(projectLifecyclePath, { version: 1, projectStateVersion: 0, projects: [] });
  const consistency = validateVibe2MachineState({ runtime, queue, parallelism, experience, projectLifecycle, repoRoot });
  return buildVibe2Handoff({ runtime, queue, parallelism, experience, projectLifecycle, consistency });
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
    experienceFile: clean(args.experience),
    projectLifecycleFile: clean(args['project-lifecycle'])
  });
  if (clean(args.output)) writeVibe2Handoff(args.output, snapshot);
  console.log(JSON.stringify(snapshot, null, 2));
  if (args.check === true) {
    if (snapshot.consistency?.ok === true) console.error('VIBE2_MACHINE_STATE=CONSISTENT');
    else {
      console.error(`VIBE2_MACHINE_STATE=INCONSISTENT:${(snapshot.consistency?.errors || []).join('|') || 'UNKNOWN'}`);
      process.exitCode = 1;
    }
  }
}
