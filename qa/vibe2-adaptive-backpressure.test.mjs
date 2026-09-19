// 파일명: qa/vibe2-adaptive-backpressure.test.mjs
// 역할: 정책상 무제한 병렬에서 외부 실행 웨이브(최대 256)의 adaptive backpressure와 복구를 검증한다.

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
  workerCount: 32,
  effectiveMax: 32,
  actualPeakConcurrency: 32,
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
  workerCount: 64,
  effectiveMax: 64,
  actualPeakConcurrency: 32,
  effectivePeakUtilizationPct: 50,
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
  workerCount: 64,
  effectiveMax: 64,
  actualPeakConcurrency: 64,
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

test('persistent pressure moves down exactly one external-capacity step per run', () => {
  const from64 = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 64 }),
    pressuredTelemetry({ runId: 'pressure-64' })
  );
  assert.equal(from64.currentMax, 32);
  assert.equal(from64.lastDecision, 'DOWN');

  const from32 = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 32 }),
    pressuredTelemetry({ runId: 'pressure-32', workerCount: 32, effectiveMax: 32 })
  );
  assert.equal(from32.currentMax, 20);
  assert.equal(from32.lastDecision, 'DOWN');
});

test('medium pressure requires two consecutive saturated runs before one-step down', () => {
  const first = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 64 }),
    mediumTelemetry({ runId: 'medium-1' })
  );
  assert.equal(first.currentMax, 64);
  assert.equal(first.pressureStreak, 1);
  assert.equal(first.lastDecision, 'HOLD');
  assert.equal(first.lastReason, 'MEDIUM_PRESSURE_STREAK_1');

  const second = decideAdaptiveBackpressure(first, mediumTelemetry({ runId: 'medium-2' }));
  assert.equal(second.currentMax, 32);
  assert.equal(second.pressureStreak, 0);
  assert.equal(second.lastDecision, 'DOWN');
  assert.equal(second.lastReason, 'MEDIUM_PRESSURE_STREAK_2');
});

test('run-local queue backpressure does not also lower the persistent adaptive wave', () => {
  const control = createParallelismControl({ currentMax: 64 });
  const next = decideAdaptiveBackpressure(
    control,
    pressuredTelemetry({ runId: 'local-cap-32', effectiveMax: 32 })
  );
  assert.equal(next.currentMax, 64);
  assert.equal(next.lastDecision, 'HOLD');
  assert.equal(next.lastReason, 'RUN_LOCAL_BACKPRESSURE_ACTIVE');
});

test('low-load runs never reduce persistent concurrency or count as recovery', () => {
  const pressure = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 64 }),
    pressuredTelemetry({ runId: 'low-load-pressure', workerCount: 5, effectiveMax: 64 })
  );
  assert.equal(pressure.currentMax, 64);
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

test('one healthy saturated run fast-ramps exactly one external-capacity step', () => {
  const next = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 32 }),
    healthyTelemetry({ runId: 'healthy-1' })
  );
  assert.equal(next.currentMax, 64);
  assert.equal(next.healthyStreak, 0);
  assert.equal(next.lastDecision, 'UP');
  assert.equal(next.lastReason, 'HEALTHY_FAST_RAMP');
});


test('owner-requested 20 wave is a canonical adaptive step', () => {
  const control = createParallelismControl({ currentMax: 20 });
  assert.equal(control.currentMax, 20);
  const down = decideAdaptiveBackpressure(control, pressuredTelemetry({ runId:'pressure-20', workerCount:20, effectiveMax:20 }));
  assert.equal(down.currentMax, 16);
  const up = decideAdaptiveBackpressure(createParallelismControl({ currentMax:16 }), healthyTelemetry({ runId:'healthy-16-to-20', workerCount:16, effectiveMax:16, actualPeakConcurrency:16 }));
  assert.equal(up.currentMax, 20);
});

test('adaptive operational wave never moves below 4 or above external boundary 256', () => {
  const atMin = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 4 }),
    pressuredTelemetry({ runId: 'min-pressure', workerCount: 4, effectiveMax: 4 })
  );
  assert.equal(atMin.currentMax, 4);

  const atMax = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 256 }),
    healthyTelemetry({ runId: 'max-healthy', workerCount: 256, effectiveMax: 256, actualPeakConcurrency: 256 })
  );
  assert.equal(atMax.currentMax, 256);
});

test('duplicate fan-in run id cannot apply pressure twice', () => {
  const once = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 64 }),
    pressuredTelemetry({ runId: 'same-run' })
  );
  assert.equal(once.currentMax, 32);

  const twice = decideAdaptiveBackpressure(
    once,
    pressuredTelemetry({ runId: 'same-run', workerCount: 32, effectiveMax: 32 })
  );
  assert.equal(twice.currentMax, 32);
  assert.equal(twice.lastDecision, 'HOLD');
  assert.equal(twice.lastReason, 'DUPLICATE_RUN');
});

test('adaptive requested max never exceeds persistent control, explicit request, or external wave boundary', () => {
  const control = createParallelismControl({ currentMax: 32 });
  assert.equal(adaptiveRequestedMax(control, 64), 32);
  assert.equal(adaptiveRequestedMax(control, 8), 8);
  assert.equal(adaptiveRequestedMax(createParallelismControl({ currentMax: 256 }), 999), 256);
});

test('missing or corrupt persistent state safely falls back to external wave boundary 256', () => {
  const files = tempFiles();
  try {
    fs.writeFileSync(files.queue, JSON.stringify({ maxConcurrentTasks: 256, tasks: [] }), 'utf8');
    const missing = runQueueCommand({ command: 'reserve-batch', queue: files.queue, control: files.control, max: '256', output: files.output });
    assert.equal(missing.adaptiveControl.currentMax, 256);
    assert.equal(missing.adaptiveControl.lastReason, 'DEFAULT_EXTERNAL_BATCH_MAX');

    fs.writeFileSync(files.control, '{broken-json', 'utf8');
    const corrupt = runQueueCommand({ command: 'reserve-batch', queue: files.queue, control: files.control, max: '64', output: files.output });
    assert.equal(corrupt.adaptiveControl.currentMax, 256);
    assert.equal(corrupt.adaptiveControl.lastReason, 'INVALID_STATE_EXTERNAL_BATCH_DEFAULT');
  } finally {
    fs.rmSync(files.dir, { recursive: true, force: true });
  }
});

test('one fan-in with many pressured results updates persistent wave only once', () => {
  const files = tempFiles();
  try {
    const tasks = Array.from({ length: 32 }, (_, index) => ({
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
        requestedMax: 32,
        effectiveMax: 32,
        workerStartedAt: 1000,
        workerFinishedAt: 2000,
        checkoutMs: 1000
      }
    }));
    fs.writeFileSync(files.queue, JSON.stringify({ maxConcurrentTasks: 256, tasks }), 'utf8');
    fs.writeFileSync(files.control, JSON.stringify(createParallelismControl({ currentMax: 32 })), 'utf8');
    fs.writeFileSync(files.results, JSON.stringify(rows), 'utf8');

    const result = runQueueCommand({ command: 'fan-in', queue: files.queue, control: files.control, input: files.results });
    const persisted = JSON.parse(fs.readFileSync(files.control, 'utf8'));
    assert.equal(result.telemetry.workerCount, 32);
    assert.equal(result.telemetry.pressureLevel, 'SEVERE');
    assert.equal(result.adaptiveControl.currentMax, 20);
    assert.equal(persisted.currentMax, 20);
    assert.equal(persisted.lastRunId, 'fan-in-multi');
  } finally {
    fs.rmSync(files.dir, { recursive: true, force: true });
  }
});

test('stale persistent pressure expires back to external wave boundary before new telemetry', () => {
  const next = decideAdaptiveBackpressure(
    createParallelismControl({ currentMax: 4, lastUpdatedAt:'2026-09-19T08:00:00Z' }),
    healthyTelemetry({ runId:'stale-recovery', workerCount:256, effectiveMax:256, actualPeakConcurrency:256 }),
    { now:'2026-09-19T12:00:00Z' }
  );
  assert.equal(next.currentMax,256);
  assert.equal(next.lastReason,'AT_MAX_HEALTHY');
});


test('owner minimum wave clamps reserve and pressure decisions at 20', () => {
  const below=createParallelismControl({currentMax:8});
  assert.equal(adaptiveRequestedMax(below,256,{minimumMax:20}),20);

  const recovered=decideAdaptiveBackpressure(
    below,
    pressuredTelemetry({runId:'owner-floor-recover',workerCount:20,effectiveMax:20}),
    {minimumMax:20}
  );
  assert.equal(recovered.currentMax,20);
  assert.equal(recovered.lastDecision,'UP');
  assert.equal(recovered.lastReason,'OWNER_MINIMUM_WAVE_20');

  const held=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:20}),
    pressuredTelemetry({runId:'owner-floor-hold',workerCount:20,effectiveMax:20}),
    {minimumMax:20}
  );
  assert.equal(held.currentMax,20);
  assert.equal(held.lastDecision,'HOLD');
  assert.equal(held.lastReason,'OWNER_MINIMUM_WAVE_20');
});
