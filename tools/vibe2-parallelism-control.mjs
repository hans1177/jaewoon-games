// 파일명: tools/vibe2-parallelism-control.mjs
// 역할: Vibe2 다음 실행의 영속 병렬 상한을 텔레메트리 기반으로 한 단계씩 조절한다.
// 원칙: 현재 실행의 즉시 backpressure와 분리하고, fan-in 1회당 영속 tier는 최대 1단계만 변경한다.

import fs from 'node:fs';
import path from 'node:path';

export const PARALLELISM_TIERS = Object.freeze([20, 16, 12, 8, 4]);
export const DEFAULT_PARALLELISM_CONTROL_FILE = '.vibe2/parallelism-control.json';

const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value) => Math.round(num(value) * 100) / 100;

export function normalizeParallelismTier(value) {
  const n = Math.floor(num(value));
  if (!n || n >= PARALLELISM_TIERS[0]) return PARALLELISM_TIERS[0];
  if (n <= PARALLELISM_TIERS.at(-1)) return PARALLELISM_TIERS.at(-1);
  return PARALLELISM_TIERS.find((tier) => n >= tier) || PARALLELISM_TIERS.at(-1);
}

export function createParallelismControl(input = {}) {
  return {
    version: 1,
    currentMax: normalizeParallelismTier(input.currentMax ?? 20),
    healthySaturatedRuns: Math.max(0, Math.floor(num(input.healthySaturatedRuns))),
    lastDecision: input.lastDecision && typeof input.lastDecision === 'object' ? input.lastDecision : null,
    updatedAt: input.updatedAt || null
  };
}

export function readParallelismControl(file = DEFAULT_PARALLELISM_CONTROL_FILE) {
  if (!file || !fs.existsSync(file)) return createParallelismControl();
  try {
    return createParallelismControl(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    return createParallelismControl();
  }
}

export function writeParallelismControl(file = DEFAULT_PARALLELISM_CONTROL_FILE, value = {}) {
  const control = createParallelismControl(value);
  const next = { ...control, updatedAt: value.updatedAt || new Date().toISOString() };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

function nextLowerTier(currentMax) {
  const index = PARALLELISM_TIERS.indexOf(normalizeParallelismTier(currentMax));
  return PARALLELISM_TIERS[Math.min(PARALLELISM_TIERS.length - 1, index + 1)];
}

function nextHigherTier(currentMax) {
  const index = PARALLELISM_TIERS.indexOf(normalizeParallelismTier(currentMax));
  return PARALLELISM_TIERS[Math.max(0, index - 1)];
}

export function assessParallelismPressure({ currentMax = 20, telemetry = {} } = {}) {
  const persistentMax = normalizeParallelismTier(currentMax);
  const workerCount = Math.max(0, Math.floor(num(telemetry.workerCount)));
  const taskCount = Math.max(0, Math.floor(num(telemetry.taskCount || workerCount)));
  const effectiveMax = Math.max(1, Math.min(persistentMax, Math.floor(num(telemetry.effectiveMax) || persistentMax)));
  const saturationThreshold = Math.max(1, Math.ceil(effectiveMax * 0.75));
  const saturated = taskCount >= saturationThreshold;
  const failureRatePct = round(telemetry.failureRatePct);
  const peak = Math.max(0, Math.floor(num(telemetry.actualPeakConcurrency)));
  const peakTarget = Math.max(1, Math.min(workerCount || effectiveMax, effectiveMax));
  const peakUtilizationPct = peakTarget ? round((peak / peakTarget) * 100) : 0;
  const checkoutP95 = num(telemetry.checkout?.p95Ms);
  const qaP95 = num(telemetry.incrementalQa?.p95Ms);
  const candidateP95 = num(telemetry.candidate?.p95Ms);

  const reasons = [];
  if (effectiveMax < persistentMax) reasons.push('IMMEDIATE_BACKPRESSURE_ACTIVE');
  if (failureRatePct >= 10) reasons.push('FAILURE_RATE');
  if (saturated && peakTarget >= 2 && peakUtilizationPct < 80) reasons.push('RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION');
  if (checkoutP95 > 30000) reasons.push('CHECKOUT_PRESSURE');
  if (qaP95 > 5000 && qaP95 > candidateP95 * 1.25) reasons.push('INCREMENTAL_QA_PRESSURE');

  const pressure = saturated && reasons.length > 0;
  const healthy = saturated
    && reasons.length === 0
    && failureRatePct < 10
    && peakUtilizationPct >= 80;

  return {
    persistentMax,
    effectiveMax,
    workerCount,
    taskCount,
    saturationThreshold,
    saturated,
    pressure,
    healthy,
    failureRatePct,
    peakUtilizationPct,
    reasons
  };
}

export function decideAdaptiveParallelism({ control = {}, telemetry = {}, now = new Date().toISOString() } = {}) {
  const current = createParallelismControl(control);
  const assessment = assessParallelismPressure({ currentMax: current.currentMax, telemetry });
  let nextMax = current.currentMax;
  let healthySaturatedRuns = current.healthySaturatedRuns;
  let action = 'HOLD';

  if (assessment.pressure) {
    nextMax = nextLowerTier(current.currentMax);
    healthySaturatedRuns = 0;
    action = nextMax < current.currentMax ? 'DOWN' : 'HOLD_MIN';
  } else if (assessment.healthy) {
    if (current.currentMax >= PARALLELISM_TIERS[0]) {
      healthySaturatedRuns = 0;
      action = 'HOLD_MAX';
    } else {
      healthySaturatedRuns += 1;
      if (healthySaturatedRuns >= 2) {
        nextMax = nextHigherTier(current.currentMax);
        healthySaturatedRuns = 0;
        action = 'UP';
      } else {
        action = 'HOLD_RECOVERY';
      }
    }
  } else {
    healthySaturatedRuns = 0;
    action = assessment.saturated ? 'HOLD' : 'HOLD_LOW_LOAD';
  }

  const decision = {
    at: now,
    action,
    from: current.currentMax,
    to: nextMax,
    saturated: assessment.saturated,
    pressure: assessment.pressure,
    healthy: assessment.healthy,
    reasons: assessment.reasons,
    workerCount: assessment.workerCount,
    taskCount: assessment.taskCount,
    effectiveMax: assessment.effectiveMax,
    failureRatePct: assessment.failureRatePct,
    peakUtilizationPct: assessment.peakUtilizationPct
  };

  return {
    control: {
      version: 1,
      currentMax: nextMax,
      healthySaturatedRuns,
      lastDecision: decision,
      updatedAt: now
    },
    decision,
    assessment
  };
}
