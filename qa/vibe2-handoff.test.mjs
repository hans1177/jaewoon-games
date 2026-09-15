// 파일명: qa/vibe2-handoff.test.mjs
// 역할: Vibe2 인간 문서 1개 정책과 기계 상태 기반 자동 인수인계 생성을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildVibe2Handoff, generateVibe2Handoff } from '../tools/vibe2-handoff.mjs';

test('machine handoff summarizes queue and adaptive state deterministically', () => {
  const runtime = {
    version: 6,
    documentation: { machineSourceOfTruth: 'vibe2-runtime.json' },
    branches: { control: 'vibe2-unreal-core' },
    workManagement: {
      largeWorkExecution: 'phased-until-complete',
      splitRule: 'split-by-implementation-phase-not-artificial-file-count',
      handoffReadOrder: ['vibe2-runtime.json', '.vibe2/queue.json']
    },
    continuous: { maxConcurrentGameTasks: 20 },
    adaptiveBackpressure: { steps: [20, 16, 12, 8, 4] }
  };
  const queue = {
    version: 4,
    tasks: [
      { id: 'b', status: 'queued', priority: 'normal', responsibleFiles: ['b.js'] },
      { id: 'a', status: 'queued', priority: 'high', ownerDirective: true, responsibleFiles: ['a.js'] },
      { id: 'c', status: 'running', priority: 'high', sourceRoot: 'unity-games/c', blocker: 'awaiting-qa' },
      { id: 'd', status: 'failed', priority: 'low' }
    ]
  };
  const parallelism = {
    version: 2,
    currentMax: 16,
    healthyStreak: 1,
    pressureStreak: 0,
    lastDecision: 'HOLD',
    lastReason: 'HEALTHY_STREAK_1'
  };
  const experience = { version: 1, records: [{ id: 'x' }] };

  const first = buildVibe2Handoff({ runtime, queue, parallelism, experience });
  const second = buildVibe2Handoff({ runtime, queue, parallelism, experience });

  assert.deepEqual(first, second);
  assert.equal(first.sourceOfTruth, 'vibe2-runtime.json');
  assert.equal(first.controlBranch, 'vibe2-unreal-core');
  assert.equal(first.workPolicy.largeWorkExecution, 'phased-until-complete');
  assert.equal(first.workState.taskCount, 4);
  assert.equal(first.workState.queuedCount, 2);
  assert.equal(first.workState.runningCount, 1);
  assert.equal(first.workState.failedCount, 1);
  assert.equal(first.workState.queuedPreview[0].id, 'a');
  assert.equal(first.parallelism.currentPersistentMax, 16);
  assert.deepEqual(first.parallelism.steps, [20, 16, 12, 8, 4]);
  assert.equal(first.experience.recordCount, 1);
});

test('repository uses exactly one Vibe2 human document and legacy Vibe2 docs are removed', () => {
  const runtime = JSON.parse(fs.readFileSync('vibe2-runtime.json', 'utf8'));
  assert.deepEqual(runtime.documentation?.humanDocuments, ['VIBE2.md']);
  assert.equal(runtime.documentation?.humanDocumentLimit, 1);
  assert.equal(runtime.documentation?.manualHandoffDocumentsAllowed, false);
  assert.equal(fs.existsSync('VIBE2.md'), true);

  for (const file of runtime.documentation?.legacyHumanDocumentsRemoved || []) {
    assert.equal(fs.existsSync(file), false, `${file} must stay removed`);
  }
});

test('repository handoff is generated entirely from machine state', () => {
  const snapshot = generateVibe2Handoff();
  assert.equal(snapshot.kind, 'vibe2-machine-handoff');
  assert.equal(snapshot.generatedFrom.runtimeVersion, 6);
  assert.equal(snapshot.generatedFrom.queueVersion, 4);
  assert.equal(snapshot.generatedFrom.parallelismVersion, 2);
  assert.equal(snapshot.generatedFrom.experienceVersion, 1);
  assert.equal(snapshot.workPolicy.humanMaintainedHandoff, false);
  assert.equal(snapshot.parallelism.configuredMax, 20);
  assert.deepEqual(snapshot.parallelism.steps, [20, 16, 12, 8, 4]);
  assert.ok(snapshot.workState.taskCount > 0);
});
