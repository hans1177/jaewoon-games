// 파일명: qa/vibe2-parallelism-control.test.mjs
// 역할: Vibe2 영속 adaptive backpressure의 단일 tier 변경, 저부하 보호, 복구, 실제 reserve 적용을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createParallelismControl,
  decideAdaptiveParallelism,
  normalizeParallelismTier,
  readParallelismControl,
  writeParallelismControl
} from '../tools/vibe2-parallelism-control.mjs';
import { runAdaptiveQueueCommand } from '../tools/vibe2-adaptive-queue-control.mjs';
import { createVibeContinuousQueue } from '../assets/vibe-continuous-queue.js';

function healthyTelemetry(max = 16) {
  return {
    taskCount: max,
    workerCount: max,
    effectiveMax: max,
    actualPeakConcurrency: max,
    failureRatePct: 0,
    checkout: { p95Ms: 1000 },
    candidate: { p95Ms: 10000 },
    incrementalQa: { p95Ms: 2000 }
  };
}

function makeTask(id, status = 'queued') {
  return {
    id,
    gameId: `g-${id}`,
    target: 'web',
    sourceRoot: `web-games/g-${id}`,
    responsibleFiles: [`${id}.js`],
    goal: `${id} work`,
    status,
    maxRetries: 2
  };
}

function workerResult(id, { effectiveMax = 20, outcome = 'PASS', start = 1000, end = 5000 } = {}) {
  return {
    taskId: id,
    variant: 'primary',
    outcome,
    blocker: outcome === 'PASS' ? 'candidate-awaiting-qa-and-deployment' : 'source-candidate-generation-failed',
    evidence: [`result:${id}`],
    durationMs: end - start,
    metrics: {
      requestedMax: 20,
      effectiveMax,
      reservedAt: 500,
      workerStartedAt: start,
      workerFinishedAt: end,
      checkoutMs: 1000,
      candidateMs: 10000,
      qaMs: 2000,
      workerTotalMs: end - start,
      ollamaCacheHit: true
    }
  };
}

test('tiers clamp to 20 16 12 8 4 only', () => {
  assert.equal(normalizeParallelismTier(99), 20);
  assert.equal(normalizeParallelismTier(20), 20);
  assert.equal(normalizeParallelismTier(19), 16);
  assert.equal(normalizeParallelismTier(13), 12);
  assert.equal(normalizeParallelismTier(9), 8);
  assert.equal(normalizeParallelismTier(1), 4);
});

test('low workload does not downshift even when its few workers fail', () => {
  const result = decideAdaptiveParallelism({
    control: { currentMax: 20 },
    telemetry: {
      taskCount: 5,
      workerCount: 5,
      effectiveMax: 20,
      actualPeakConcurrency: 5,
      failureRatePct: 40,
      checkout: { p95Ms: 60000 },
      candidate: { p95Ms: 1000 },
      incrementalQa: { p95Ms: 10000 }
    },
    now: '2026-09-15T00:00:00.000Z'
  });
  assert.equal(result.assessment.saturated, false);
  assert.equal(result.decision.action, 'HOLD_LOW_LOAD');
  assert.equal(result.control.currentMax, 20);
});

test('pressure changes persistent cap by exactly one tier per fan-in decision', () => {
  const result = decideAdaptiveParallelism({
    control: { currentMax: 20 },
    telemetry: {
      ...healthyTelemetry(12),
      taskCount: 12,
      effectiveMax: 12
    },
    now: '2026-09-15T00:00:00.000Z'
  });
  assert.equal(result.assessment.pressure, true);
  assert.ok(result.assessment.reasons.includes('IMMEDIATE_BACKPRESSURE_ACTIVE'));
  assert.equal(result.decision.action, 'DOWN');
  assert.equal(result.decision.from, 20);
  assert.equal(result.decision.to, 16);
  assert.equal(result.control.currentMax, 16);
});

test('two consecutive healthy saturated runs recover one tier', () => {
  const first = decideAdaptiveParallelism({
    control: { currentMax: 16, healthySaturatedRuns: 0 },
    telemetry: healthyTelemetry(16),
    now: '2026-09-15T00:00:00.000Z'
  });
  assert.equal(first.decision.action, 'HOLD_RECOVERY');
  assert.equal(first.control.currentMax, 16);
  assert.equal(first.control.healthySaturatedRuns, 1);

  const second = decideAdaptiveParallelism({
    control: first.control,
    telemetry: healthyTelemetry(16),
    now: '2026-09-15T00:01:00.000Z'
  });
  assert.equal(second.decision.action, 'UP');
  assert.equal(second.control.currentMax, 20);
  assert.equal(second.control.healthySaturatedRuns, 0);
});

test('pressure resets healthy recovery streak', () => {
  const first = decideAdaptiveParallelism({
    control: { currentMax: 16 },
    telemetry: healthyTelemetry(16)
  });
  assert.equal(first.control.healthySaturatedRuns, 1);

  const pressured = decideAdaptiveParallelism({
    control: first.control,
    telemetry: { ...healthyTelemetry(16), failureRatePct: 25 }
  });
  assert.equal(pressured.decision.action, 'DOWN');
  assert.equal(pressured.control.currentMax, 12);
  assert.equal(pressured.control.healthySaturatedRuns, 0);
});

test('parallelism control state round-trips through its dedicated file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-parallelism-state-'));
  const file = path.join(root, 'parallelism-control.json');
  const written = writeParallelismControl(file, { currentMax: 12, healthySaturatedRuns: 1, updatedAt: '2026-09-15T00:00:00.000Z' });
  const read = readParallelismControl(file);
  assert.equal(written.currentMax, 12);
  assert.deepEqual(read, written);
});

test('fan-in persistent decision uses immutable starting cap, not same-run effective cap', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-adaptive-fanin-'));
  const queueFile = path.join(root, 'queue.json');
  const controlFile = path.join(root, 'parallelism-control.json');
  const inputFile = path.join(root, 'fan-in.json');
  const tasks = Array.from({ length: 12 }, (_, i) => makeTask(`t-${i}`, 'running'));
  fs.writeFileSync(queueFile, `${JSON.stringify(createVibeContinuousQueue({ maxConcurrentTasks: 20, tasks }), null, 2)}\n`);
  writeParallelismControl(controlFile, { currentMax: 20, healthySaturatedRuns: 0, updatedAt: '2026-09-15T00:00:00.000Z' });
  fs.writeFileSync(inputFile, `${JSON.stringify({ results: tasks.map((task) => workerResult(task.id, { effectiveMax: 12 })) }, null, 2)}\n`);

  const result = runAdaptiveQueueCommand({ command: 'fan-in', queue: queueFile, control: controlFile, input: inputFile });
  assert.equal(result.adaptive.persistentMaxAtFanInStart, 20);
  assert.equal(result.adaptive.telemetry.effectiveMax, 12);
  assert.equal(result.adaptive.decision.from, 20);
  assert.equal(result.adaptive.decision.to, 16);
  assert.equal(result.adaptive.nextPersistentMax, 16);
  assert.equal(readParallelismControl(controlFile).currentMax, 16);
});

test('next reserve reads saved persistent cap and applies it to actual scheduler reservation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-adaptive-reserve-'));
  const queueFile = path.join(root, 'queue.json');
  const controlFile = path.join(root, 'parallelism-control.json');
  const outputFile = path.join(root, 'batch.json');
  const tasks = Array.from({ length: 20 }, (_, i) => makeTask(`t-${i}`));
  fs.writeFileSync(queueFile, `${JSON.stringify(createVibeContinuousQueue({ maxConcurrentTasks: 20, tasks }), null, 2)}\n`);
  writeParallelismControl(controlFile, { currentMax: 16, healthySaturatedRuns: 0, updatedAt: '2026-09-15T00:00:00.000Z' });

  const result = runAdaptiveQueueCommand({ command: 'reserve-batch', queue: queueFile, control: controlFile, max: 20, output: outputFile });
  const batch = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  assert.equal(result.adaptive.persistentMaxAtReservation, 16);
  assert.equal(result.tasks.length, 16);
  assert.equal(result.selection.effectiveMaxConcurrentTasks, 16);
  assert.equal(batch.scheduler.configuredHardMaxConcurrentTasks, 20);
  assert.equal(batch.scheduler.persistentMaxConcurrentTasks, 16);
  assert.equal(batch.scheduler.effectiveMaxConcurrentTasks, 16);
});

test('invalid state falls back safely to the default cap', () => {
  const state = createParallelismControl({ currentMax: 'bad', healthySaturatedRuns: -10 });
  assert.equal(state.currentMax, 20);
  assert.equal(state.healthySaturatedRuns, 0);
});
