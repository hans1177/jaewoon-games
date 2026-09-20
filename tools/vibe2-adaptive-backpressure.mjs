// 파일명: tools/vibe2-adaptive-backpressure.mjs
// 역할: 내부 인위적 병렬 상한 없이 외부 실행 용량 안에서 텔레메트리 기반으로 Vibe가 스스로 병렬도를 조절한다.

export const ADAPTIVE_PARALLELISM_STEPS = Object.freeze([1, 2, 4, 8, 16, 20, 32, 64, 128, 256]);
export const DEFAULT_ADAPTIVE_MAX = 256;
export const DEFAULT_TELEMETRY_TTL_MS = 90 * 60 * 1000;

const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const clean = (value) => String(value ?? '').trim();
const positiveInt = (value, fallback = 1) => {
  const n = Math.floor(num(value));
  return n > 0 ? n : Math.max(1, Math.floor(num(fallback)) || 1);
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function adaptiveSteps(maximumMax = DEFAULT_ADAPTIVE_MAX) {
  const ceiling = positiveInt(maximumMax, DEFAULT_ADAPTIVE_MAX);
  const steps = ADAPTIVE_PARALLELISM_STEPS.filter((step) => step <= ceiling);
  let next = steps.length ? steps[steps.length - 1] : 1;
  while (next < ceiling) {
    const doubled = Math.min(ceiling, Math.max(next + 1, next * 2));
    if (!steps.includes(doubled)) steps.push(doubled);
    next = doubled;
  }
  if (!steps.includes(ceiling)) steps.push(ceiling);
  return steps.sort((a, b) => a - b);
}
function stepDown(current, maximumMax = DEFAULT_ADAPTIVE_MAX) {
  const ceiling = positiveInt(maximumMax, DEFAULT_ADAPTIVE_MAX);
  const value = clamp(positiveInt(current, ceiling), 1, ceiling);
  const lower = adaptiveSteps(ceiling).filter((step) => step < value);
  return lower.length ? lower[lower.length - 1] : 1;
}
function stepUp(current, maximumMax = DEFAULT_ADAPTIVE_MAX) {
  const ceiling = positiveInt(maximumMax, DEFAULT_ADAPTIVE_MAX);
  const value = clamp(positiveInt(current, ceiling), 1, ceiling);
  return adaptiveSteps(ceiling).find((step) => step > value) || ceiling;
}

export function createParallelismControl(input = {}) {
  return Object.freeze({
    version: 3,
    currentMax: positiveInt(input.currentMax, DEFAULT_ADAPTIVE_MAX),
    healthyStreak: Math.max(0, Math.floor(num(input.healthyStreak))),
    pressureStreak: Math.max(0, Math.floor(num(input.pressureStreak))),
    lastDecision: clean(input.lastDecision) || 'INIT',
    lastReason: clean(input.lastReason) || 'DEFAULT_EXTERNAL_CAPACITY',
    lastRunId: clean(input.lastRunId) || null,
    lastUpdatedAt: clean(input.lastUpdatedAt) || null,
    lastTelemetry: input.lastTelemetry && typeof input.lastTelemetry === 'object' ? input.lastTelemetry : null
  });
}

export function adaptiveRequestedMax(controlInput = {}, requestedMax = DEFAULT_ADAPTIVE_MAX, { minimumMax = 1 } = {}) {
  const control = createParallelismControl(controlInput);
  const requested = positiveInt(requestedMax, DEFAULT_ADAPTIVE_MAX);
  const floor = clamp(positiveInt(minimumMax, 1), 1, requested);
  return Math.max(floor, Math.min(requested, control.currentMax));
}

function pressureLevel(telemetry = {}) {
  const explicit = clean(telemetry.pressureLevel).toUpperCase();
  if (['SEVERE', 'HIGH', 'MEDIUM', 'LOW', 'NONE'].includes(explicit)) return explicit;
  const failureRate = num(telemetry.failureRatePct);
  if (failureRate >= 40) return 'SEVERE';
  if (failureRate >= 20) return 'HIGH';
  if (failureRate >= 10) return 'MEDIUM';
  return 'LOW';
}

function pressureReasons(telemetry = {}) {
  const reasons = [];
  const failureRate = num(telemetry.failureRatePct);
  const bottleneck = clean(telemetry.bottleneck);
  const bottlenecks = new Set([bottleneck,...(Array.isArray(telemetry.secondaryBottlenecks)?telemetry.secondaryBottlenecks.map(clean):[])].filter(Boolean));
  const peakUtil = num(telemetry.effectivePeakUtilizationPct);
  const queueWaitP95 = num(telemetry.queueWait?.p95Ms);
  const checkoutP95 = num(telemetry.checkout?.p95Ms);
  if (failureRate >= 20) reasons.push('FAILURE_RATE');
  if (bottlenecks.has('RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION') && peakUtil < 80) reasons.push('RUNNER_CAPACITY');
  if (bottlenecks.has('INCREMENTAL_QA')) reasons.push('INCREMENTAL_QA');
  if (bottlenecks.has('CHECKOUT_NETWORK') || checkoutP95 > 30000) reasons.push('CHECKOUT_NETWORK');
  if (queueWaitP95 > 30000) reasons.push('RUNNER_QUEUE_WAIT');
  return reasons;
}

function isHealthy(telemetry = {}) {
  const bottleneck = clean(telemetry.bottleneck);
  return num(telemetry.failureRatePct) < 10
    && ['LOW', 'NONE'].includes(pressureLevel(telemetry))
    && (!bottleneck || bottleneck === 'NONE')
    && num(telemetry.effectivePeakUtilizationPct) >= 80
    && num(telemetry.queueWait?.p95Ms) < 15000
    && num(telemetry.checkout?.p95Ms) < 15000;
}

export function decideAdaptiveBackpressure(controlInput = {}, telemetry = {}, {
  now = new Date().toISOString(),
  telemetryTtlMs = DEFAULT_TELEMETRY_TTL_MS,
  minimumMax = 1,
  maximumMax = DEFAULT_ADAPTIVE_MAX
} = {}) {
  const ceiling = positiveInt(maximumMax, DEFAULT_ADAPTIVE_MAX);
  const configuredFloor = clamp(positiveInt(minimumMax, 1), 1, ceiling);
  let control = createParallelismControl(controlInput);
  const nowMs = Date.parse(now);
  const previousAt = Date.parse(clean(control.lastUpdatedAt));
  const stale = Number.isFinite(nowMs) && Number.isFinite(previousAt) && nowMs - previousAt > Math.max(60_000, Number(telemetryTtlMs) || DEFAULT_TELEMETRY_TTL_MS);
  if (stale && control.currentMax !== ceiling) {
    control = createParallelismControl({
      currentMax: ceiling,
      healthyStreak: 0,
      pressureStreak: 0,
      lastDecision: 'RESET',
      lastReason: 'STALE_TELEMETRY_RESET_TO_EXTERNAL_CAPACITY',
      lastRunId: null,
      lastUpdatedAt: now,
      lastTelemetry: null
    });
  }
  const runId = clean(telemetry.runId);
  if (runId && control.lastRunId === runId) {
    return createParallelismControl({
      ...control,
      currentMax: clamp(control.currentMax, configuredFloor, ceiling),
      lastDecision: 'HOLD',
      lastReason: 'DUPLICATE_RUN',
      lastUpdatedAt: now
    });
  }

  const originalCurrent = clamp(control.currentMax, 1, ceiling);
  const current = clamp(Math.max(originalCurrent, configuredFloor), configuredFloor, ceiling);
  const workerCount = Math.max(0, Math.floor(num(telemetry.workerCount)));
  const effectiveMax = Math.max(1, Math.floor(num(telemetry.effectiveMax) || current));
  const saturationFloor = Math.max(1, Math.ceil(current * 0.75));
  const loaded = workerCount >= saturationFloor;
  const localBackpressureActive = effectiveMax < current;
  const level = pressureLevel(telemetry);
  const reasons = pressureReasons(telemetry);
  const strongPressure = ['SEVERE', 'HIGH'].includes(level) || reasons.length > 0;
  const mediumPressure = level === 'MEDIUM' && reasons.length === 0;

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
  } else if (strongPressure) {
    next = stepDown(current, ceiling);
    healthyStreak = 0;
    pressureStreak = 0;
    decision = next < current ? 'DOWN' : 'HOLD';
    reason = reasons.length ? reasons.join('+') : level;
  } else if (mediumPressure) {
    healthyStreak = 0;
    pressureStreak += 1;
    if (pressureStreak >= 2) {
      next = stepDown(current, ceiling);
      decision = next < current ? 'DOWN' : 'HOLD';
      reason = next < current ? 'MEDIUM_PRESSURE_STREAK_2' : 'AT_MIN_PRESSURE';
      pressureStreak = 0;
    } else {
      reason = 'MEDIUM_PRESSURE_STREAK_1';
    }
  } else if (isHealthy(telemetry)) {
    healthyStreak += 1;
    pressureStreak = 0;
    if (healthyStreak >= 1) {
      next = stepUp(current, ceiling);
      decision = next > current ? 'UP' : 'HOLD';
      reason = next > current ? 'HEALTHY_FAST_RAMP' : 'AT_EXTERNAL_CAPACITY';
      healthyStreak = next > current ? 0 : healthyStreak;
    } else {
      reason = 'HEALTHY_RAMP_PENDING';
    }
  } else {
    healthyStreak = 0;
    pressureStreak = 0;
    reason = 'NEUTRAL';
  }

  if (next < configuredFloor) {
    next = configuredFloor;
    if (originalCurrent < configuredFloor) {
      decision = 'UP';
      reason = `ADAPTIVE_MINIMUM_${configuredFloor}`;
    } else if (strongPressure) {
      decision = 'HOLD';
      reason = `ADAPTIVE_MINIMUM_${configuredFloor}`;
    }
  }
  next = clamp(next, configuredFloor, ceiling);

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
      pressureLevel: level,
      bottleneck: clean(telemetry.bottleneck) || 'NONE',
      externalCapacity: ceiling
    }
  });
}
