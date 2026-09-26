// 파일명: tools/vibe2-adaptive-backpressure.mjs
// 역할: 정책상 무제한 병렬을 유지하면서 외부 GitHub matrix 배치 용량 안에서 텔레메트리 기반 압력 조절만 수행한다.

export const ADAPTIVE_PARALLELISM_STEPS = Object.freeze([30, 32, 64, 128, 256]);
export const DEFAULT_ADAPTIVE_MAX = 256;
export const DEFAULT_ADAPTIVE_TARGET = 256;
export const DEFAULT_ADAPTIVE_MIN = 30;
export const DEFAULT_TELEMETRY_TTL_MS = 90 * 60 * 1000;

const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const clean = (value) => String(value ?? '').trim();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function normalizeStep(value = DEFAULT_ADAPTIVE_TARGET) {
  const raw = clamp(Math.floor(num(value) || DEFAULT_ADAPTIVE_TARGET), DEFAULT_ADAPTIVE_MIN, DEFAULT_ADAPTIVE_MAX);
  return ADAPTIVE_PARALLELISM_STEPS.reduce((best, step) => Math.abs(step - raw) < Math.abs(best - raw) ? step : best, DEFAULT_ADAPTIVE_TARGET);
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
    version: 4,
    currentMax: normalizeStep(input.currentMax),
    healthyStreak: Math.max(0, Math.floor(num(input.healthyStreak))),
    pressureStreak: Math.max(0, Math.floor(num(input.pressureStreak))),
    lastDecision: clean(input.lastDecision) || 'INIT',
    lastReason: clean(input.lastReason) || `DEFAULT_ADAPTIVE_TARGET_${DEFAULT_ADAPTIVE_TARGET}`,
    lastRunId: clean(input.lastRunId) || null,
    lastUpdatedAt: clean(input.lastUpdatedAt) || null,
    lastTelemetry: input.lastTelemetry && typeof input.lastTelemetry === 'object' ? input.lastTelemetry : null
  });
}

export function adaptiveRequestedMax(controlInput = {}, requestedMax = DEFAULT_ADAPTIVE_MAX, { minimumMax = DEFAULT_ADAPTIVE_MIN } = {}) {
  const control = createParallelismControl(controlInput);
  const requested = clamp(Math.floor(num(requestedMax) || DEFAULT_ADAPTIVE_MAX), 1, DEFAULT_ADAPTIVE_MAX);
  const floor = clamp(Math.max(DEFAULT_ADAPTIVE_MIN, Math.floor(num(minimumMax) || DEFAULT_ADAPTIVE_MIN)), 1, DEFAULT_ADAPTIVE_MAX);
  return Math.max(1, Math.min(requested, Math.max(control.currentMax, floor)));
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
  const firstPass=num(telemetry?.throughput?.firstCandidatePassRatePct);
  const throughput=num(telemetry?.throughput?.verifiedCandidatesPerMinute);
  return num(telemetry.failureRatePct) < 10
    && ['LOW', 'NONE'].includes(pressureLevel(telemetry))
    && (!bottleneck || bottleneck === 'NONE')
    && num(telemetry.effectivePeakUtilizationPct) >= 80
    && num(telemetry.queueWait?.p95Ms) < 15000
    && num(telemetry.checkout?.p95Ms) < 15000
    && (firstPass===0||firstPass>=80)
    && throughput>0;
}

export function decideAdaptiveBackpressure(controlInput = {}, telemetry = {}, { now = new Date().toISOString(), telemetryTtlMs = DEFAULT_TELEMETRY_TTL_MS, minimumMax = DEFAULT_ADAPTIVE_MIN } = {}) {
  let control = createParallelismControl(controlInput);
  const nowMs = Date.parse(now);
  const previousAt = Date.parse(clean(control.lastUpdatedAt));
  const stale = Number.isFinite(nowMs) && Number.isFinite(previousAt) && nowMs - previousAt > Math.max(60_000, Number(telemetryTtlMs) || DEFAULT_TELEMETRY_TTL_MS);
  if (stale) {
    control = createParallelismControl({
      currentMax: DEFAULT_ADAPTIVE_TARGET,
      healthyStreak: 0,
      pressureStreak: 0,
      lastDecision: 'RESET',
      lastReason: `STALE_TELEMETRY_RESET_TO_${DEFAULT_ADAPTIVE_TARGET}`,
      lastRunId: null,
      lastUpdatedAt: now,
      lastTelemetry: null
    });
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

  const configuredFloor = clamp(Math.max(DEFAULT_ADAPTIVE_MIN, Math.floor(num(minimumMax) || DEFAULT_ADAPTIVE_MIN)), 1, DEFAULT_ADAPTIVE_MAX);
  const originalCurrent = control.currentMax;
  const current = Math.max(originalCurrent, configuredFloor);
  const workerCount = Math.max(0, Math.floor(num(telemetry.workerCount)));
  const effectiveMax = Math.max(1, Math.floor(num(telemetry.effectiveMax) || current));
  const saturationFloor = Math.max(1, Math.ceil(current * 0.75));
  const loaded = workerCount >= saturationFloor;
  const localBackpressureActive = effectiveMax < current;
  const level = pressureLevel(telemetry);
  const reasons = pressureReasons(telemetry);
  const firstPass=num(telemetry?.throughput?.firstCandidatePassRatePct);
  const throughput=num(telemetry?.throughput?.verifiedCandidatesPerMinute);
  const previousThroughput=num(control?.lastTelemetry?.verifiedCandidatesPerMinute);
  if(workerCount>=DEFAULT_ADAPTIVE_MIN&&firstPass>0&&firstPass<60)reasons.push('FIRST_CANDIDATE_PASS_RATE');
  if(previousThroughput>0&&throughput>0&&throughput<previousThroughput*.75)reasons.push('VERIFIED_THROUGHPUT_REGRESSION');
  const strongPressure = ['SEVERE', 'HIGH'].includes(level) || reasons.length > 0;
  const mediumPressure = level === 'MEDIUM' && reasons.length === 0;

  let next = current;
  let healthyStreak = control.healthyStreak;
  let pressureStreak = control.pressureStreak;
  let decision = 'HOLD';
  let reason = 'LOW_LOAD';

  if (localBackpressureActive) {
    healthyStreak = 0;
    pressureStreak = 0;
    reason = 'RUN_LOCAL_BACKPRESSURE_ACTIVE';
  } else if (!workerCount || !loaded) {
    healthyStreak = 0;
    pressureStreak = 0;
    reason = workerCount ? 'LOW_LOAD' : 'NO_WORKERS';
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

  if (next < configuredFloor) next = configuredFloor;
  if (originalCurrent < configuredFloor && next === configuredFloor) {
    decision = 'UP';
    reason = `OWNER_MINIMUM_WAVE_${configuredFloor}`;
  } else if (originalCurrent === configuredFloor && next === configuredFloor && strongPressure) {
    decision = 'HOLD';
    const pressureReason = reasons.length ? reasons.join('+') : level;
    reason = `OWNER_MINIMUM_WAVE_${configuredFloor}:${pressureReason}`;
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
      pressureLevel: level,
      bottleneck: clean(telemetry.bottleneck) || 'NONE',
      firstCandidatePassRatePct:firstPass,
      verifiedCandidatesPerMinute:throughput
    }
  });
}