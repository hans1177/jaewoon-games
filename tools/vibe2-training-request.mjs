// 파일명: tools/vibe2-training-request.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function hash(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function taskBlockers(task = {}) {
  const blockers = [];
  if (!task.batchingPass) blockers.push('INSUFFICIENT_BATCH');
  if (!task.diversityPass) blockers.push('INSUFFICIENT_PROJECT_DIVERSITY');
  if (!task.contaminationPass) blockers.push('DATASET_CONTAMINATION');
  if (!task.taskPlanReady) blockers.push('TASK_PLAN_NOT_READY');
  if (Number(task.eval ?? 0) < 1) blockers.push('EVAL_SPLIT_EMPTY');
  if (Number(task.holdout ?? 0) < 1) blockers.push('HOLDOUT_SPLIT_EMPTY');
  return [...new Set(blockers)];
}

export function buildTrainingRequest(status) {
  if (!status || typeof status !== 'object') throw new Error('distillation status 필요');
  const readyTasks = Array.isArray(status.readyTasks) ? status.readyTasks.filter(Boolean) : [];
  const signature = hash({ policy: status.policy ?? {}, tasks: status.tasks ?? {}, sourceFiles: status.sourceFiles ?? [] });
  const requestId = `distill-${signature.slice(0, 16)}`;
  const requests = readyTasks.map((taskType) => {
    const adapterVersion = `${taskType}-${signature.slice(0, 12)}`;
    const datasetDir = `vibe2-learning/datasets/${taskType}/${requestId}`;
    const adapterDir = `vibe2-learning/adapters/${taskType}/${adapterVersion}`;
    return {
      taskType,
      adapterVersion,
      datasetDir,
      adapterDir,
      datasetCommand: [
        'node', 'tools/vibe2-weight-learning.mjs', 'dataset',
        '--input', 'company-learning/training-samples',
        '--out', datasetDir,
        '--task-type', taskType,
        '--min-train-samples', String(status.policy?.minTrainSamples ?? 24),
        '--min-fresh-train-samples', String(status.policy?.minFreshTrainSamples ?? 12),
        '--min-distinct-projects', String(status.policy?.minDistinctProjects ?? 2),
        '--max-project-share', String(status.policy?.maxProjectShare ?? 0.75),
        '--synthetic-ratio-cap', String(status.policy?.syntheticRatioCap ?? 0.5),
      ],
      trainerCommand: [
        'python', 'tools/vibe2-train.py',
        '--train', `${datasetDir}/train.jsonl`,
        '--eval', `${datasetDir}/eval.jsonl`,
        '--dataset-manifest', `${datasetDir}/manifest.json`,
        '--output', adapterDir,
        '--adapter-version', adapterVersion,
        '--task-type', taskType,
      ],
      promotionGates: ['FIXED_HOLDOUT_AB', 'CANARY', 'NO_REGRESSION', 'RULE_COMPLIANCE'],
    };
  });

  const blockedTasks = Object.fromEntries(
    Object.entries(status.tasks ?? {})
      .filter(([taskType]) => !readyTasks.includes(taskType))
      .map(([taskType, task]) => [taskType, {
        blockers: taskBlockers(task),
        accepted: Number(task.accepted ?? 0),
        train: Number(task.train ?? 0),
        distinctProjects: Number(task.distinctProjects ?? 0),
      }]),
  );

  return {
    version: 2,
    requestId,
    sourceStatusState: status.state ?? 'UNKNOWN',
    state: requests.length ? 'READY_FOR_SELF_HOSTED_TRAINING' : 'WAITING_FOR_VERIFIED_SAMPLES',
    execution: {
      route: 'CANONICAL_SELF_HOSTED',
      preferredBackend: 'SERVER_SELF_HOSTED',
      allowedBackends: ['SERVER_SELF_HOSTED', 'LOCAL_SELF_HOSTED'],
      localBackendPreserved: true,
      sameCanonicalRequestRequired: true,
      duplicateConcurrentRequestTrainingForbidden: true,
      continuousMode: '24H',
      refreshCadence: 'HOURLY',
      githubHostedTrainingAllowed: false,
      paidApiAllowed: false,
      requiresCudaForQlora: true,
      preflightRequired: ['python', 'torch', 'transformers', 'peft'],
    },
    requests,
    blockedTasks,
    nextAction: requests.length
      ? 'RUN_READY_TASKS_ON_SERVER_SELF_HOSTED_BACKEND_LOCAL_REMAINS_AVAILABLE'
      : 'COLLECT_MORE_INDEPENDENT_AND_BROWSER_QA_VERIFIED_SAMPLES_ACROSS_PROJECTS',
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const statusFile = args.status || 'company-learning/distillation-status.json';
  const out = args.out || 'company-learning/distillation-training-request.json';
  const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
  const request = buildTrainingRequest(status);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(request, null, 2)}\n`);
  console.log(JSON.stringify(request));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
