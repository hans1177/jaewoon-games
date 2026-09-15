// 파일명: tools/vibe2-adaptive-backpressure.mjs
// 역할: 최근 병렬 실행 텔레메트리를 다음 run의 영속 동시성 cap(20→16→12→8→4)에 연결한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ADAPTIVE_PARALLELISM_STEPS = Object.freeze([4, 8, 12, 16, 20]);
export const DEFAULT_ADAPTIVE_MAX = 20;

const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const clean = (value) => String(value ?? '').trim();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function readJson(file, fallback = {}) {
  if (!file || !fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function parseArgs(argv = process.argv.slice(2)) {
  const [command = 'resolve', ...rest] = argv;
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

function normalizeStep(value = DEFAULT_ADAPTIVE_MAX) {
  const raw = clamp(Math.floor(num(value) || DEFAULT_ADAPTIVE_MAX), 4, 20);
  return ADAPTIVE_PARALLELISM_STEPS.reduce((best, step) => Math.abs(step - raw) < Math.abs(best - raw) ? step : best, DEFAULT_ADAPTIVE_MAX);
}
function stepDown(current) {
  const index = ADAPTIVE_PARALLELISM_STEPS.indexOf(normalizeStep(current));
  return ADAPTIVE_PARALLELISM_STEPS[Math.max(0, index - 1)];
}
function stepUp(current) {
  const index = ADAPTIVE_PARALLELISM_STEPS.indexOf(normalizeStep(current));
  return ADAPTIVE_PARALLELISM_STEPS[Math.min(ADAPTIVE_PARALLELISM_STEPS.length - 1, index + 1)];
}

export function createParallelismControl(input = {}) {
  return Object.freeze({
    version: 2,
    currentMax: normalizeStep(input.currentMax),
    healthyStreak: Math.max(0, Math.floor(num(input.healthyStreak))),
    pressureStreak: Math.max(0, Math.floor(num(input.pressureStreak))),
    lastDecision: clean(input.lastDecision) || 'INIT',
    lastReason: clean(input.lastReason) || 'DEFAULT_20',
    lastRunId: clean(input.lastRunId) || null,
    lastUpdatedAt: clean(input.lastUpdatedAt) || null,
    lastTelemetry: input.lastTelemetry && typeof input.lastTelemetry === 'object' ? input.lastTelemetry : null
  });
}

export function adaptiveRequestedMax(controlInput = {}, requestedMax = DEFAULT_ADAPTIVE_MAX) {
  const control = createParallelismControl(controlInput);
  const requested = clamp(Math.floor(num(requestedMax) || DEFAULT_ADAPTIVE_MAX), 1, 20);
  return Math.max(1, Math.min(requested, control.currentMax));
}

function pressureReasons(telemetry = {}) {
  const reasons = [];
  const failureRate = num(telemetry.failureRatePct);
  const bottleneck = clean(telemetry.bottleneck);
  const peakUtil = num(telemetry.effectivePeakUtilizationPct);
  const queueWaitP95 = num(telemetry.queueWait?.p95Ms);
  const checkoutP95 = num(telemetry.checkout?.p95Ms);
  if (failureRate >= 20) reasons.push('FAILURE_RATE');
  if (bottleneck === 'RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION' && peakUtil < 80) reasons.push('RUNNER_CAPACITY');
  if (bottleneck === 'INCREMENTAL_QA') reasons.push('INCREMENTAL_QA');
  if (bottleneck === 'CHECKOUT_NETWORK' || checkoutP95 > 30000) reasons.push('CHECKOUT_NETWORK');
  if (queueWaitP95 > 30000) reasons.push('RUNNER_QUEUE_WAIT');
  return reasons;
}

function isHealthy(telemetry = {}) {
  const bottleneck = clean(telemetry.bottleneck);
  return num(telemetry.failureRatePct) < 10
    && (!bottleneck || bottleneck === 'NONE')
    && num(telemetry.effectivePeakUtilizationPct) >= 80
    && num(telemetry.queueWait?.p95Ms) < 15000
    && num(telemetry.checkout?.p95Ms) < 15000;
}

export function decideAdaptiveBackpressure(controlInput = {}, telemetry = {}, { now = new Date().toISOString() } = {}) {
  const control = createParallelismControl(controlInput);
  const runId = clean(telemetry.runId);
  if (runId && control.lastRunId === runId) {
    return createParallelismControl({
      ...control,
      lastDecision: 'HOLD',
      lastReason: 'DUPLICATE_RUN',
      lastUpdatedAt: now
    });
  }

  const current = control.currentMax;
  const workerCount = Math.max(0, Math.floor(num(telemetry.workerCount)));
  const effectiveMax = Math.max(1, Math.floor(num(telemetry.effectiveMax) || current));
  const saturationFloor = Math.max(1, Math.ceil(current * 0.75));
  const loaded = workerCount >= saturationFloor;
  const localBackpressureActive = effectiveMax < current;
  const reasons = pressureReasons(telemetry);

  let next = current;
  let healthyStreak = control.healthyStreak;
  let pressureStreak = control.pressureStreak;
  let decision = 'HOLD';
  let reason = 'LOW_LOAD';

  if (!workerCount || !loaded) {
    healthyStreak = 0;
    pressureStreak = 0;
    reason = workerCount ? 'LOW_LOAD' : 'NO_WORKERS';
  } else if (localBackpressureActive) {
    healthyStreak = 0;
    pressureStreak = 0;
    reason = 'RUN_LOCAL_BACKPRESSURE_ACTIVE';
  } else if (reasons.length) {
    next = stepDown(current);
    pressureStreak += 1;
    healthyStreak = 0;
    decision = next < current ? 'DOWN' : 'HOLD';
    reason = reasons.join('+');
  } else if (isHealthy(telemetry)) {
    healthyStreak += 1;
    pressureStreak = 0;
    if (healthyStreak >= 2) {
      next = stepUp(current);
      decision = next > current ? 'UP' : 'HOLD';
      reason = next > current ? 'HEALTHY_STREAK_2' : 'AT_MAX_HEALTHY';
      healthyStreak = next > current ? 0 : healthyStreak;
    } else {
      reason = 'HEALTHY_STREAK_1';
    }
  } else {
    healthyStreak = 0;
    pressureStreak = 0;
    reason = 'NEUTRAL';
  }

  return createParallelismControl({
    ...control,
    currentMax: next,
    healthyStreak,
    pressureStreak,
    lastDecision: decision,
    lastReason: reason,
    lastRunId: runId || control.lastRunId,
    lastUpdatedAt: now,
    lastTelemetry: {
      runId: runId || null,
      workerCount,
      effectiveMax,
      actualPeakConcurrency: num(telemetry.actualPeakConcurrency),
      effectivePeakUtilizationPct: num(telemetry.effectivePeakUtilizationPct),
      failureRatePct: num(telemetry.failureRatePct),
      bottleneck: clean(telemetry.bottleneck) || 'NONE'
    }
  });
}

export function resolveAdaptiveRequestedMax({ controlFile = '.vibe2/parallelism-control.json', requestedMax = DEFAULT_ADAPTIVE_MAX } = {}) {
  const control = createParallelismControl(readJson(controlFile, {}));
  return Object.freeze({ control, requestedMax: adaptiveRequestedMax(control, requestedMax) });
}

export function persistAdaptiveDecision({ controlFile = '.vibe2/parallelism-control.json', telemetryFile = '', runId = '', now = new Date().toISOString() } = {}) {
  if (!telemetryFile) throw new Error('telemetryFile required');
  const control = createParallelismControl(readJson(controlFile, {}));
  const telemetry = readJson(telemetryFile, {});
  const next = decideAdaptiveBackpressure(control, { ...telemetry, runId: clean(runId) || clean(telemetry.runId) }, { now });
  writeJson(controlFile, next);
  return next;
}

export function runAdaptiveBackpressureCommand(args = {}) {
  const command = clean(args.command).toLowerCase();
  const controlFile = clean(args.control) || '.vibe2/parallelism-control.json';
  if (command === 'resolve') {
    return { command, ...resolveAdaptiveRequestedMax({ controlFile, requestedMax: args.requested }) };
  }
  if (command === 'update') {
    const telemetryFile = clean(args.telemetry);
    if (!telemetryFile) throw new Error('--telemetry required');
    const control = persistAdaptiveDecision({ controlFile, telemetryFile, runId: clean(args['run-id']) });
    return { command, control };
  }
  throw new Error(`unknown adaptive command: ${command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runAdaptiveBackpressureCommand(parseArgs());
  if (result.command === 'resolve') {
    console.log(`VIBE2_ADAPTIVE_CURRENT_MAX=${result.control.currentMax}`);
    console.log(`VIBE2_ADAPTIVE_REQUESTED_MAX=${result.requestedMax}`);
  } else {
    console.log(`VIBE2_ADAPTIVE_CURRENT_MAX=${result.control.currentMax}`);
    console.log(`VIBE2_ADAPTIVE_DECISION=${result.control.lastDecision}`);
    console.log(`VIBE2_ADAPTIVE_REASON=${result.control.lastReason}`);
    console.log(`VIBE2_ADAPTIVE_RUN_ID=${result.control.lastRunId || 'NONE'}`);
  }
}
