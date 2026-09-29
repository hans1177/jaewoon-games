// 파일명: tools/vibe2-fast-distillation-stage.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDistillationStatus, collectTrainingRecords } from './vibe2-distillation-status.mjs';

export const FAST_DISTILLATION_STAGES = Object.freeze([
  Object.freeze({
    name: 'STABLE',
    minTrainSamples: 24,
    minFreshTrainSamples: 12,
    minDistinctProjects: 2,
    maxProjectShare: 0.75,
    taskPlanMinSamples: 8,
    taskPlanMinProjects: 2,
    runtimePromotionEligible: true,
  }),
  Object.freeze({
    name: 'STABILIZING',
    minTrainSamples: 16,
    minFreshTrainSamples: 8,
    minDistinctProjects: 2,
    maxProjectShare: 0.85,
    taskPlanMinSamples: 8,
    taskPlanMinProjects: 2,
    runtimePromotionEligible: false,
  }),
  Object.freeze({
    name: 'BOOTSTRAP_FAST',
    minTrainSamples: 8,
    minFreshTrainSamples: 6,
    minDistinctProjects: 1,
    maxProjectShare: 1,
    taskPlanMinSamples: 8,
    taskPlanMinProjects: 1,
    runtimePromotionEligible: false,
  }),
]);

function hasExplicitQuality(record) {
  const quality = record?.quality;
  return quality
    && Number.isFinite(Number(quality.codeQuality))
    && typeof quality.noRegression === 'boolean'
    && Number.isFinite(Number(quality.playImprovement))
    && Number.isFinite(Number(quality.ruleCompliance));
}

function explicitQualityPass(record, threshold = 0.75) {
  if (!hasExplicitQuality(record)) return false;
  const q = record.quality;
  const score = (
    Math.max(0, Math.min(1, Number(q.codeQuality)))
    + (q.noRegression === true ? 1 : 0)
    + Math.max(0, Math.min(1, Number(q.playImprovement)))
    + Math.max(0, Math.min(1, Number(q.ruleCompliance)))
  ) / 4;
  return score >= threshold;
}

export function filterFastDistillationRecords(recordsWithSource, { qualityThreshold = 0.75 } = {}) {
  const accepted = [];
  const rejected = [];
  for (const entry of recordsWithSource) {
    if (!hasExplicitQuality(entry.record)) {
      rejected.push({ sourceFile: entry.sourceFile, index: entry.index, reason: 'EXPLICIT_QUALITY_REQUIRED' });
      continue;
    }
    if (!explicitQualityPass(entry.record, qualityThreshold)) {
      rejected.push({ sourceFile: entry.sourceFile, index: entry.index, reason: 'QUALITY_BELOW_THRESHOLD' });
      continue;
    }
    accepted.push(entry);
  }
  return { accepted, rejected };
}

export function buildFastDistillationPlan(recordsWithSource, options = {}) {
  const { qualityThreshold = 0.75, syntheticRatioCap = 0.5 } = options;
  const filtered = filterFastDistillationRecords(recordsWithSource, { qualityThreshold });
  const stageStatuses = Object.fromEntries(FAST_DISTILLATION_STAGES.map((stage) => [stage.name, buildDistillationStatus(filtered.accepted, {
    minTrainSamples: stage.minTrainSamples,
    minFreshTrainSamples: stage.minFreshTrainSamples,
    minDistinctProjects: stage.minDistinctProjects,
    maxProjectShare: stage.maxProjectShare,
    syntheticRatioCap,
    taskPlanMinSamples: stage.taskPlanMinSamples,
    taskPlanMinProjects: stage.taskPlanMinProjects,
  })]));

  const tasks = {};
  const taskTypes = Object.keys(stageStatuses.STABLE.tasks ?? {});
  for (const taskType of taskTypes) {
    let selectedStage = null;
    let selectedTask = null;
    for (const stage of FAST_DISTILLATION_STAGES) {
      const task = stageStatuses[stage.name].tasks?.[taskType];
      if (task?.ready) {
        selectedStage = stage;
        selectedTask = task;
        break;
      }
    }
    tasks[taskType] = selectedStage ? {
      ...selectedTask,
      learningStage: selectedStage.name,
      runtimePromotionEligible: selectedStage.runtimePromotionEligible,
      trainingPolicy: {
        minTrainSamples: selectedStage.minTrainSamples,
        minFreshTrainSamples: selectedStage.minFreshTrainSamples,
        minDistinctProjects: selectedStage.minDistinctProjects,
        maxProjectShare: selectedStage.maxProjectShare,
        syntheticRatioCap,
      },
    } : {
      ...stageStatuses.BOOTSTRAP_FAST.tasks?.[taskType],
      learningStage: 'WAITING',
      runtimePromotionEligible: false,
      trainingPolicy: null,
    };
  }

  const earlyReadyTasks = Object.entries(tasks)
    .filter(([, task]) => task.ready === true && task.learningStage !== 'STABLE')
    .map(([taskType]) => taskType);
  const stableReadyTasks = Object.entries(tasks)
    .filter(([, task]) => task.ready === true && task.learningStage === 'STABLE')
    .map(([taskType]) => taskType);

  return {
    version: 1,
    qualityPolicy: {
      explicitQualityRequired: true,
      qualityThreshold,
      missingQualityDefaultsToPass: false,
    },
    stages: FAST_DISTILLATION_STAGES,
    rejectedFastSamples: filtered.rejected,
    acceptedFastSampleCount: filtered.accepted.length,
    stableReadyTasks,
    earlyReadyTasks,
    state: earlyReadyTasks.length
      ? 'FAST_DISTILLATION_READY'
      : stableReadyTasks.length
        ? 'STABLE_PIPELINE_OWNS_READY_TASKS'
        : 'WAITING_FOR_VERIFIED_SAMPLES',
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const evidenceDir = args['evidence-dir'] || 'company-learning/evidence';
  const sampleDir = args['sample-dir'] || 'company-learning/training-samples';
  const out = args.out || 'company-learning/fast-distillation-plan.json';
  const { recordsWithSource } = collectTrainingRecords([evidenceDir, sampleDir]);
  const plan = buildFastDistillationPlan(recordsWithSource, {
    qualityThreshold: Number(args['quality-threshold'] ?? 0.75),
    syntheticRatioCap: Number(args['synthetic-ratio-cap'] ?? 0.5),
  });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(JSON.stringify(plan));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
