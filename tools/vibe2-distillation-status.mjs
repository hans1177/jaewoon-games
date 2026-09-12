// 파일명: tools/vibe2-distillation-status.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDataset, isVerifiedPass, TASK_TYPES } from './vibe2-weight-learning.mjs';

function readRecords(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  if (filePath.endsWith('.jsonl')) return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.samples)) return parsed.samples;
  return [parsed];
}

function collectJsonFiles(entry, output = []) {
  if (!entry || !fs.existsSync(entry)) return output;
  const stat = fs.statSync(entry);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(entry).sort()) collectJsonFiles(path.join(entry, name), output);
    return output;
  }
  if (/\.jsonl?$/.test(entry)) output.push(entry);
  return output;
}

export function collectTrainingRecords(inputPaths) {
  const files = [...new Set(inputPaths.flatMap((entry) => collectJsonFiles(entry)))].sort();
  const recordsWithSource = files.flatMap((file) => readRecords(file).map((record, index) => ({
    record,
    sourceFile: path.relative(process.cwd(), file).replaceAll('\\', '/'),
    index,
  })));
  return { files, recordsWithSource };
}

function samplePayload(record) {
  return record?.trainingSample && typeof record.trainingSample === 'object' ? record.trainingSample : record;
}

function hasTextSample(record) {
  const sample = samplePayload(record);
  return Boolean(String(sample?.instruction ?? '').trim() && String(sample?.output ?? '').trim());
}

function independentPass(record) {
  const qa = record?.qa && typeof record.qa === 'object' ? record.qa : {};
  return String(qa.independentQa ?? qa.independent ?? record?.independentQa ?? '').toUpperCase() === 'PASS';
}

function browserPass(record) {
  const qa = record?.qa && typeof record.qa === 'object' ? record.qa : {};
  return String(qa.browserQa ?? qa.browser ?? record?.browserQa ?? '').toUpperCase() === 'PASS';
}

export function buildDistillationStatus(recordsWithSource, options = {}) {
  const {
    minTrainSamples = 24,
    minFreshTrainSamples = 12,
    minDistinctProjects = 2,
    maxProjectShare = 0.75,
    syntheticRatioCap = 0.5,
    taskPlanMinSamples = 8,
    taskPlanMinProjects = 2,
  } = options;

  const rawRecords = recordsWithSource.map((entry) => entry.record);
  const diagnostics = {
    records: rawRecords.length,
    textSamples: rawRecords.filter(hasTextSample).length,
    independentQaPass: rawRecords.filter(independentPass).length,
    browserQaPass: rawRecords.filter(browserPass).length,
    fullyVerifiedTextSamples: rawRecords.filter((record) => hasTextSample(record) && isVerifiedPass(record)).length,
    evidenceOnlyRecords: rawRecords.filter((record) => !hasTextSample(record)).length,
  };

  const tasks = {};
  for (const taskType of TASK_TYPES) {
    const dataset = buildDataset(recordsWithSource, {
      targetTaskType: taskType,
      minTrainSamples,
      minFreshTrainSamples,
      minDistinctProjects,
      minDistinctTaskTypes: 1,
      maxProjectShare,
      syntheticRatioCap,
      taskPlanMinSamples,
      taskPlanMinProjects,
      teacherOnlyDifficult: true,
    });
    const taskPlan = dataset.taskTrainingPlan?.[taskType] ?? { ready: false, samples: 0, distinctProjects: 0, syntheticShare: 0 };
    const ready = dataset.readyForTraining && taskPlan.ready;
    tasks[taskType] = {
      state: ready ? 'READY_FOR_SELF_HOSTED_TRAINING' : 'WAITING_FOR_VERIFIED_SAMPLES',
      ready,
      train: dataset.stats.train,
      freshTrain: dataset.stats.freshTrain,
      eval: dataset.stats.eval,
      holdout: dataset.stats.holdout,
      accepted: dataset.stats.accepted,
      skippedUnverified: dataset.stats.skippedUnverified,
      skippedIncomplete: dataset.stats.skippedIncomplete,
      skippedQuality: dataset.stats.skippedQuality,
      skippedLifecycle: dataset.stats.skippedLifecycle,
      skippedTeacherSimple: dataset.stats.skippedTeacherSimple,
      skippedTaskType: dataset.stats.skippedTaskType,
      distinctProjects: dataset.diversity.distinctProjects,
      maxProjectShare: dataset.diversity.maxProjectShare,
      syntheticShare: taskPlan.syntheticShare,
      contaminationPass: dataset.contamination.pass,
      batchingPass: dataset.batching.pass,
      diversityPass: dataset.diversity.pass,
      taskPlanReady: taskPlan.ready,
    };
  }

  const readyTasks = TASK_TYPES.filter((taskType) => tasks[taskType].ready);
  return {
    version: 2,
    policy: {
      minTrainSamples,
      minFreshTrainSamples,
      minDistinctProjects,
      maxProjectShare,
      syntheticRatioCap,
      teacherOnlyDifficult: true,
      trainingRoute: 'CANONICAL_SELF_HOSTED',
      preferredTrainingBackend: 'SERVER_SELF_HOSTED',
      allowedTrainingBackends: ['SERVER_SELF_HOSTED', 'LOCAL_SELF_HOSTED'],
      localTrainingPreserved: true,
      continuousMode: '24H',
      refreshCadence: 'HOURLY',
      promotionRoute: 'FIXED_HOLDOUT_AB_THEN_CANARY',
    },
    diagnostics,
    readyTasks,
    state: readyTasks.length ? 'READY_TASKS_AVAILABLE' : 'WAITING_FOR_VERIFIED_SAMPLES',
    tasks,
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inline] = arg.slice(2).split('=', 2);
    args[key] = inline ?? argv[++i];
  }
  return args;
}

function numberArg(args, key, fallback) {
  const value = Number(args[key] ?? fallback);
  if (!Number.isFinite(value)) throw new Error(`invalid numeric argument: ${key}`);
  return value;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const evidenceDir = args['evidence-dir'] || 'company-learning/evidence';
  const sampleDir = args['sample-dir'] || 'company-learning/training-samples';
  const out = args.out || 'company-learning/distillation-status.json';
  const { files, recordsWithSource } = collectTrainingRecords([evidenceDir, sampleDir]);
  const status = buildDistillationStatus(recordsWithSource, {
    minTrainSamples: numberArg(args, 'min-train-samples', 24),
    minFreshTrainSamples: numberArg(args, 'min-fresh-train-samples', 12),
    minDistinctProjects: numberArg(args, 'min-distinct-projects', 2),
    maxProjectShare: numberArg(args, 'max-project-share', 0.75),
    syntheticRatioCap: numberArg(args, 'synthetic-ratio-cap', 0.5),
    taskPlanMinSamples: numberArg(args, 'task-plan-min-samples', 8),
    taskPlanMinProjects: numberArg(args, 'task-plan-min-projects', 2),
  });
  status.sourceFiles = files.map((file) => path.relative(process.cwd(), file).replaceAll('\\', '/'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(status, null, 2)}\n`);
  console.log(JSON.stringify(status));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
