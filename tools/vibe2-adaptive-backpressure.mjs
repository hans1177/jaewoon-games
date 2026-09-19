// 파일명: tools/vibe2-adaptive-backpressure.mjs
// 역할: 최근 병렬 실행 텔레메트리를 다음 run의 영속 동시성 cap(30→24→20→16→12→8→4)에 연결하고 오래된 압력을 만료한다.

export const ADAPTIVE_PARALLELISM_STEPS = Object.freeze([4, 8, 12, 16, 20, 24, 30]);
export const DEFAULT_ADAPTIVE_MAX = 30;
export const DEFAULT_TELEMETRY_TTL_MS = 90 * 60 * 1000;

const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const clean = (value) => String(value ?? '').trim();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function normalizeStep(value = DEFAULT_ADAPTIVE_MAX) {
  const raw = clamp(Math.floor(num(value) || DEFAULT_ADAPTIVE_MAX), 4, 30);
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
    version: 3,
    currentMax: normalizeStep(input.currentMax),
    healthyStreak: Math.max(0, Math.floor(num(input.healthyStreak))),
    pressureStreak: Math.max(0, Math.floor(num(input.pressureStreak))),
    lastDecision: clean(input.lastDecision) || 'INIT',
    lastReason: clean(input.lastReason) || 'DEFAULT_30',
    lastRunId: clean(input.lastRunId) || null,
    lastUpdatedAt: clean(input.lastUpdatedAt) || null,
    lastTelemetry: input.lastTelemetry && typeof input.lastTelemetry === 'object' ? input.lastTelemetry : null
  });
}

export function adaptiveRequestedMax(controlInput = {}, requestedMax = DEFAULT_ADAPTIVE_MAX) {
  const control = createParallelismControl(controlInput);
  const requested = clamp(Math.floor(num(requestedMax) || DEFAULT_ADAPTIVE_MAX), 1, 30);
  return Math.max(1, Math.min(requested, control.currentMax));
}

function pressureLevel(telemetry = {}) {
  const explicit = clean(telemetry.adaptivePressureLevel || telemetry.pressureLevel).toUpperCase();
  if (['SEVERE', 'HIGH', 'MEDIUM', 'LOW', 'NONE'].includes(explicit)) return explicit;
  const failureRate = num(telemetry.adaptiveFailureRatePct ?? telemetry.failureRatePct);
  if (failureRate >= 40) return 'SEVERE';
  if (failureRate >= 20) return 'HIGH';
  if (failureRate >= 10) return 'MEDIUM';
  return 'LOW';
}

function pressureReasons(telemetry = {}) {
  const reasons = [];
  const failureRate = num(telemetry.adaptiveFailureRatePct ?? telemetry.failureRatePct);
  const bottleneck = clean(telemetry.adaptiveBottleneck || telemetry.bottleneck);
  const peakUtil = num(telemetry.adaptiveEffectivePeakUtilizationPct ?? telemetry.effectivePeakUtilizationPct);
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
  const bottleneck = clean(telemetry.adaptiveBottleneck || telemetry.bottleneck);
  return num(telemetry.adaptiveFailureRatePct ?? telemetry.failureRatePct) < 10
    && ['LOW', 'NONE'].includes(pressureLevel(telemetry))
    && (!bottleneck || bottleneck === 'NONE')
    && num(telemetry.adaptiveEffectivePeakUtilizationPct ?? telemetry.effectivePeakUtilizationPct) >= 80
    && num(telemetry.queueWait?.p95Ms) < 15000
    && num(telemetry.checkout?.p95Ms) < 15000;
}

export function decideAdaptiveBackpressure(controlInput = {}, telemetry = {}, { now = new Date().toISOString(), telemetryTtlMs = DEFAULT_TELEMETRY_TTL_MS } = {}) {
  let control = createParallelismControl(controlInput);
  const nowMs = Date.parse(now);
  const previousAt = Date.parse(clean(control.lastUpdatedAt));
  const stale = Number.isFinite(nowMs) && Number.isFinite(previousAt) && nowMs - previousAt > Math.max(60_000, Number(telemetryTtlMs) || DEFAULT_TELEMETRY_TTL_MS);
  if (stale && control.currentMax < DEFAULT_ADAPTIVE_MAX) {
    control = createParallelismControl({currentMax:DEFAULT_ADAPTIVE_MAX,healthyStreak:0,pressureStreak:0,lastDecision:'RESET',lastReason:'STALE_TELEMETRY_RESET',lastRunId:null,lastUpdatedAt:now,lastTelemetry:null});
  }
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
  const workerCount = Math.max(0, Math.floor(num(telemetry.adaptiveWorkerCount ?? telemetry.workerCount)));
  const totalWorkerCount = Math.max(0, Math.floor(num(telemetry.workerCount)));
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
    reason = !workerCount && totalWorkerCount > 0 ? 'NON_PRODUCTION_ONLY' : (workerCount ? 'LOW_LOAD' : 'NO_WORKERS');
  } else if (localBackpressureActive) {
    healthyStreak = 0;
    pressureStreak = 0;
    reason = 'RUN_LOCAL_BACKPRESSURE_ACTIVE';
  } else if (strongPressure) {
    next = stepDown(current);
    healthyStreak = 0;
    pressureStreak = 0;
    decision = next < current ? 'DOWN' : 'HOLD';
    reason = reasons.length ? reasons.join('+') : level;
  } else if (mediumPressure) {
    healthyStreak = 0;
    pressureStreak += 1;
    if (pressureStreak >= 2) {
      next = stepDown(current);
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
      next = stepUp(current);
      decision = next > current ? 'UP' : 'HOLD';
      reason = next > current ? 'HEALTHY_FAST_RAMP' : 'AT_MAX_HEALTHY';
      healthyStreak = next > current ? 0 : healthyStreak;
    } else {
      reason = 'HEALTHY_RAMP_PENDING';
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
      totalWorkerCount,
      effectiveMax,
      actualPeakConcurrency: num(telemetry.adaptivePeakConcurrency ?? telemetry.actualPeakConcurrency),
      effectivePeakUtilizationPct: num(telemetry.adaptiveEffectivePeakUtilizationPct ?? telemetry.effectivePeakUtilizationPct),
      failureRatePct: num(telemetry.adaptiveFailureRatePct ?? telemetry.failureRatePct),
      pressureLevel: level,
      bottleneck: clean(telemetry.adaptiveBottleneck || telemetry.bottleneck) || 'NONE'
    }
  });
}