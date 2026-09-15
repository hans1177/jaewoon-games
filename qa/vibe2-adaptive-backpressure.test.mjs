import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptiveRequestedMax,
  createParallelismControl,
  decideAdaptiveBackpressure
} from '../tools/vibe2-adaptive-backpressure.mjs';

const healthyTelemetry = (overrides = {}) => ({
  runId: 'healthy-run',
  workerCount: 16,
  effectiveMax: 16,
  actualPeakConcurrency: 16,
  effectivePeakUtilizationPct: 100,
  failureRatePct: 0,
  bottleneck: 'NONE',
  queueWait: { p95Ms: 1000 },
  checkout: { p95Ms: 1000 },
  ...overrides
});

const pressuredTelemetry = (overrides = {}) => ({
  runId: 'pressure-run',
  workerCount: 20,
  effectiveMax: 20,
  actualPeakConcurrency: 12,
  effectivePeakUtilizationPct: 60,
  failureRatePct: 0,
  bottleneck: 'RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION',
  queueWait: { p95Ms: 1000 },
  checkout: { p95Ms: 1000 },
  ...overrides
});

test('persistent pressure moves down exactly one adaptive step per run', () => {
  const from20 = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 20 }),
    pressuredTelemetry({ runId: 'pressure-20' })
  );
  assert.equal(from20.currentMax, 16);
  assert.equal(from20.lastDecision, 'DOWN');

  const from16 = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 16 }),
    pressuredTelemetry({ runId: 'pressure-16', workerCount: 16, effectiveMax: 16 })
  );
  assert.equal(from16.currentMax, 12);
  assert.equal(from16.lastDecision, 'DOWN');
});

test('run-local queue backpressure does not also lower the persistent adaptive cap', () => {
  const control = createParallelismControl({ currentMax: 20 });
  const next = decideAdaptiveBackpressure(
    control,
    pressuredTelemetry({ runId: 'local-cap-16', effectiveMax: 16 })
  );
  assert.equal(next.currentMax, 20);
  assert.equal(next.lastDecision, 'HOLD');
  assert.equal(next.lastReason, 'RUN_LOCAL_BACKPRESSURE_ACTIVE');
});

test('low-load runs never reduce persistent concurrency', () => {
  const next = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 20 }),
    pressuredTelemetry({ runId: 'low-load', workerCount: 5, effectiveMax: 20 })
  );
  assert.equal(next.currentMax, 20);
  assert.equal(next.lastDecision, 'HOLD');
  assert.equal(next.lastReason, 'LOW_LOAD');
});

test('two consecutive healthy saturated runs recover one step', () => {
  const first = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 16 }),
    healthyTelemetry({ runId: 'healthy-1' })
  );
  assert.equal(first.currentMax, 16);
  assert.equal(first.healthyStreak, 1);
  assert.equal(first.lastDecision, 'HOLD');

  const second = decideAdaptiveBackpressure(
    first,
    healthyTelemetry({ runId: 'healthy-2' })
  );
  assert.equal(second.currentMax, 20);
  assert.equal(second.healthyStreak, 0);
  assert.equal(second.lastDecision, 'UP');
});

test('duplicate fan-in run id cannot apply pressure twice', () => {
  const once = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 20 }),
    pressuredTelemetry({ runId: 'same-run' })
  );
  assert.equal(once.currentMax, 16);

  const twice = decideAdaptiveBackpressure(
    once,
    pressuredTelemetry({ runId: 'same-run', workerCount: 16, effectiveMax: 16 })
  );
  assert.equal(twice.currentMax, 16);
  assert.equal(twice.lastDecision, 'HOLD');
  assert.equal(twice.lastReason, 'DUPLICATE_RUN');
});

test('adaptive requested max never exceeds persistent control or explicit request', () => {
  const control = createParallelismControl({ currentMax: 12 });
  assert.equal(adaptiveRequestedMax(control, 20), 12);
  assert.equal(adaptiveRequestedMax(control, 8), 8);
});
