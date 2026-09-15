// 파일명: tools/vibe2-adaptive-queue-control.mjs
// 역할: 기존 Vibe2 큐 제어를 감싸 영속 adaptive cap을 실제 예약에 적용하고 fan-in에서 한 번만 갱신한다.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { runQueueCommand } from './vibe2-queue-control.mjs';
import { computeParallelismTelemetry } from './vibe2-parallelism-telemetry.mjs';
import {
  DEFAULT_PARALLELISM_CONTROL_FILE,
  decideAdaptiveParallelism,
  readParallelismControl,
  writeParallelismControl
} from './vibe2-parallelism-control.mjs';

const clean = (value) => String(value ?? '').trim();
const clampMax = (value) => Math.max(1, Math.min(20, Math.floor(Number(value) || 20)));

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

function readFanInResults(file) {
  if (!file || !fs.existsSync(file)) return [];
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [];
}

function augmentBatchOutput(file, { hardMax, persistentMax, effectiveMax }) {
  if (!file || !fs.existsSync(file)) return;
  const batch = JSON.parse(fs.readFileSync(file, 'utf8'));
  batch.scheduler = {
    ...(batch.scheduler || {}),
    configuredHardMaxConcurrentTasks: hardMax,
    persistentMaxConcurrentTasks: persistentMax,
    effectiveMaxConcurrentTasks: effectiveMax
  };
  fs.writeFileSync(file, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
}

function logQueueResult(result = {}) {
  console.log(`VIBE2_QUEUE_COMMAND=${result.command || 'unknown'}`);
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

export function runAdaptiveQueueCommand(args = {}) {
  const command = clean(args.command).toLowerCase() || 'summary';
  const controlFile = clean(args.control) || DEFAULT_PARALLELISM_CONTROL_FILE;
  const controlAtStart = readParallelismControl(controlFile);

  if (command === 'reserve-batch' || command === 'reserve') {
    const hardMax = clampMax(args.max);
    const persistentMax = Math.min(hardMax, controlAtStart.currentMax);
    const result = runQueueCommand({ ...args, command, max: persistentMax });
    const effectiveMax = result.selection?.effectiveMaxConcurrentTasks ?? persistentMax;
    if (command === 'reserve-batch') {
      augmentBatchOutput(clean(args.output), { hardMax, persistentMax, effectiveMax });
    }
    return {
      ...result,
      adaptive: {
        hardMax,
        persistentMaxAtReservation: persistentMax,
        effectiveMax,
        controlFile
      }
    };
  }

  if (command === 'fan-in') {
    const persistentMaxAtFanInStart = controlAtStart.currentMax;
    const results = readFanInResults(clean(args.input));
    const uniqueTaskCount = new Set(results.map((row) => clean(row?.taskId)).filter(Boolean)).size;
    const observedEffectiveMax = Math.max(
      1,
      Math.min(
        persistentMaxAtFanInStart,
        Math.floor(Number(results[0]?.metrics?.effectiveMax) || persistentMaxAtFanInStart)
      )
    );
    const telemetry = computeParallelismTelemetry({
      results,
      requestedMax: persistentMaxAtFanInStart,
      effectiveMax: observedEffectiveMax,
      taskCount: uniqueTaskCount
    });

    // Queue fan-in must succeed before adaptive state is persisted.
    const result = runQueueCommand(args);
    const decision = decideAdaptiveParallelism({
      control: controlAtStart,
      telemetry
    });
    const saved = writeParallelismControl(controlFile, decision.control);

    return {
      ...result,
      adaptive: {
        persistentMaxAtFanInStart,
        nextPersistentMax: saved.currentMax,
        healthySaturatedRuns: saved.healthySaturatedRuns,
        decision: decision.decision,
        telemetry,
        controlFile
      }
    };
  }

  return { ...runQueueCommand(args), adaptive: { persistentMax: controlAtStart.currentMax, controlFile } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runAdaptiveQueueCommand(parseArgs());
  logQueueResult(result);
  console.log(`VIBE2_ADAPTIVE_PERSISTENT_MAX=${result.adaptive?.persistentMaxAtReservation ?? result.adaptive?.persistentMaxAtFanInStart ?? result.adaptive?.persistentMax ?? 20}`);
  if (result.adaptive?.effectiveMax != null) console.log(`VIBE2_ADAPTIVE_EFFECTIVE_MAX=${result.adaptive.effectiveMax}`);
  if (result.adaptive?.nextPersistentMax != null) console.log(`VIBE2_ADAPTIVE_NEXT_MAX=${result.adaptive.nextPersistentMax}`);
  if (result.adaptive?.decision?.action) console.log(`VIBE2_ADAPTIVE_ACTION=${result.adaptive.decision.action}`);
  if (result.adaptive?.decision?.reasons) console.log(`VIBE2_ADAPTIVE_REASONS=${result.adaptive.decision.reasons.join(',') || 'NONE'}`);
}
