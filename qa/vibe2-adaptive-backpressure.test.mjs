// 파일명: qa/vibe2-adaptive-backpressure.test.mjs
// 역할: Vibe2 영속 Adaptive Backpressure의 단계 이동, hysteresis, 이중 감속 방지, state 복구를 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  adaptiveRequestedMax,
  createParallelismControl,
  decideAdaptiveBackpressure
} from '../tools/vibe2-adaptive-backpressure.mjs';
import { runQueueCommand } from '../tools/vibe2-queue-control.mjs';

const healthyTelemetry = (overrides = {}) => ({
  runId: 'healthy-run',
  workerCount: 16,
  effectiveMax: 16,
  actualPeakConcurrency: 16,
  effectivePeakUtilizationPct: 100,
  failureRatePct: 0,
  pressureLevel: 'LOW',
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
  pressureLevel: 'LOW',
  bottleneck: 'RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION',
  queueWait: { p95Ms: 1000 },
  checkout: { p95Ms: 1000 },
  ...overrides
});

const mediumTelemetry = (overrides = {}) => ({
  ...healthyTelemetry(),
  runId: 'medium-run',
  workerCount: 20,
  effectiveMax: 20,
  actualPeakConcurrency: 20,
  effectivePeakUtilizationPct: 100,
  failureRatePct: 10,
  pressureLevel: 'MEDIUM',
  ...overrides
});

function tempFiles() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-adaptive-'));
  return {
    dir,
    queue: path.join(dir, 'queue.json'),
    control: path.join(dir, 'parallelism-control.json'),
    output: path.join(dir, 'batch.json'),
    results: path.join(dir, 'results.json')
  };
}

test('persistent pressure moves down exactly one adaptive step per run', () => {
  const from20 = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 20 }),
    pressuredTelemetry({ runId: 'pressure-20' })
  );
  assert.equal(from20.currentMax, 16);
  assert.notEqual(from20.currentMax, 12);
  assert.equal(from20.lastDecision, 'DOWN');

  const from16 = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 16 }),
    pressuredTelemetry({ runId: 'pressure-16', workerCount: 16, effectiveMax: 16 })
  );
  assert.equal(from16.currentMax, 12);
  assert.equal(from16.lastDecision, 'DOWN');
});

test('medium pressure requires two consecutive saturated runs before one-step down', () => {
  const first = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 20 }),
    mediumTelemetry({ runId: 'medium-1' })
  );
  assert.equal(first.currentMax, 20);
  assert.equal(first.pressureStreak, 1);
  assert.equal(first.lastDecision, 'HOLD');
  assert.equal(first.lastReason, 'MEDIUM_PRESSURE_STREAK_1');

  const second = decideAdaptiveBackpressure(first, mediumTelemetry({ runId: 'medium-2' }));
  assert.equal(second.currentMax, 16);
  assert.equal(second.pressureStreak, 0);
  assert.equal(second.lastDecision, 'DOWN');
  assert.equal(second.lastReason, 'MEDIUM_PRESSURE_STREAK_2');
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

test('low-load runs never reduce persistent concurrency or count as recovery', () => {
  const pressure = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 20 }),
    pressuredTelemetry({ runId: 'low-load-pressure', workerCount: 5, effectiveMax: 20 })
  );
  assert.equal(pressure.currentMax, 20);
  assert.equal(pressure.lastDecision, 'HOLD');
  assert.equal(pressure.lastReason, 'LOW_LOAD');

  const healthyLowLoad = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 8 }),
    healthyTelemetry({ runId: 'low-load-healthy', workerCount: 5, effectiveMax: 8, actualPeakConcurrency: 5 })
  );
  assert.equal(healthyLowLoad.currentMax, 8);
  assert.equal(healthyLowLoad.healthyStreak, 0);
  assert.equal(healthyLowLoad.lastReason, 'LOW_LOAD');
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

test('adaptive cap never moves below 4 or above 20', () => {
  const atMin = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 4 }),
    pressuredTelemetry({ runId: 'min-pressure', workerCount: 4, effectiveMax: 4 })
  );
  assert.equal(atMin.currentMax, 4);

  const firstHealthy = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 20 }),
    healthyTelemetry({ runId: 'max-healthy-1', workerCount: 20, effectiveMax: 20 })
  );
  const secondHealthy = decideAdaptiveBackpressure(
    firstHealthy,
    healthyTelemetry({ runId: 'max-healthy-2', workerCount: 20, effectiveMax: 20 })
  );
  assert.equal(secondHealthy.currentMax, 20);
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
  assert.deepEqual(twice, once);
});

test('adaptive requested max never exceeds persistent control or explicit request', () => {
  const control = createParallelismControl({ currentMax: 12 });
  assert.equal(adaptiveRequestedMax(control, 20), 12);
  assert.equal(adaptiveRequestedMax(control, 8), 8);
  assert.equal(adaptiveRequestedMax(createParallelismControl({ currentMax: 99 }), 99), 20);
});

test('missing or corrupt persistent state safely falls back to 20', () => {
  const files = tempFiles();
  try {
    fs.writeFileSync(files.queue, JSON.stringify({ maxConcurrentTasks: 20, tasks: [] }), 'utf8');
    const missing = runQueueCommand({ command: 'reserve-batch', queue: files.queue, control: files.control, max: '20', output: files.output });
    assert.equal(missing.adaptiveControl.currentMax, 20);
    assert.equal(missing.adaptiveControl.lastReason, 'DEFAULT_20');

    fs.writeFileSync(files.control, '{broken-json', 'utf8');
    const corrupt = runQueueCommand({ command: 'reserve-batch', queue: files.queue, control: files.control, max: '20', output: files.output });
    assert.equal(corrupt.adaptiveControl.currentMax, 20);
    assert.equal(corrupt.adaptiveControl.lastReason, 'INVALID_STATE_DEFAULT_20');
  } finally {
    fs.rmSync(files.dir, { recursive: true, force: true });
  }
});

test('one fan-in with many pressured results updates persistent cap only once', () => {
  const files = tempFiles();
  try {
    const tasks = Array.from({ length: 20 }, (_, index) => ({
      id: `task-${index}`,
      gameId: `game-${index}`,
      target: 'web',
      sourceRoot: `web-games/game-${index}`,
      goal: 'fan-in pressure test',
      status: 'running'
    }));
    const rows = tasks.map((task) => ({
      taskId: task.id,
      outcome: 'BLOCKED',
      blocker: 'worker-route-blocked',
      evidence: ['actions-run:fan-in-multi'],
      metrics: {
        runId: 'fan-in-multi',
        requestedMax: 20,
        effectiveMax: 20,
        workerStartedAt: 1000,
        workerFinishedAt: 2000,
        checkoutMs: 1000
      }
    }));
    fs.writeFileSync(files.queue, JSON.stringify({ maxConcurrentTasks: 20, tasks }), 'utf8');
    fs.writeFileSync(files.control, JSON.stringify(createParallelismControl({ currentMax: 20 })), 'utf8');
    fs.writeFileSync(files.results, JSON.stringify(rows), 'utf8');

    const result = runQueueCommand({ command: 'fan-in', queue: files.queue, control: files.control, input: files.results });
    const persisted = JSON.parse(fs.readFileSync(files.control, 'utf8'));
    assert.equal(result.telemetry.workerCount, 20);
    assert.equal(result.telemetry.pressureLevel, 'SEVERE');
    assert.equal(result.adaptiveControl.currentMax, 16);
    assert.equal(persisted.currentMax, 16);
    assert.equal(persisted.lastRunId, 'fan-in-multi');
  } finally {
    fs.rmSync(files.dir, { recursive: true, force: true });
  }
});
