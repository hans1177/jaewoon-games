// 파일명: qa/vibe2-handoff.test.mjs
// 역할: Vibe2 인간 문서 0개 정책과 기계 상태 기반 자동 인수인계 생성을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildVibe2Handoff, generateVibe2Handoff, validateVibe2MachineState } from '../tools/vibe2-handoff.mjs';
import { runVibe2AutoPlanner } from '../tools/vibe2-auto-planner.mjs';
import { runVibeContinuousRunner } from '../tools/vibe2-continuous-runner.mjs';
import { runQueueCommand } from '../tools/vibe2-queue-control.mjs';

test('machine handoff summarizes queue and adaptive state deterministically', () => {
  const runtime = {
    version: 7,
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
    version: 5,
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
  const experience = { version: 3, records: [{ id: 'x' }] };
  const projectLifecycle = {
    version:1,projectStateVersion:1,
    projects:[{
      gameId:'g1',PROJECT_PHASE:'WEB_BASE_IMPLEMENTATION',PLATFORM:'ROBLOX',GENRE:'RPG',
      WEB_BASELINE:{state:'PENDING'},ROBLOX_HANDOFF:null,
      POST_RELEASE_FOCUS_RUNNER:{assigned:false},LEARNING_CONTEXT:{continuousLearning:true},
      NEXT_MACHINE_ACTION:'IMPLEMENT_WEB_CORE_LOOP_AND_BASE_SYSTEMS'
    }]
  };

  const first = buildVibe2Handoff({ runtime, queue, parallelism, experience, projectLifecycle });
  const second = buildVibe2Handoff({ runtime, queue, parallelism, experience, projectLifecycle });

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
  assert.equal(first.projectLifecycle.projectCount, 1);
  assert.equal(first.projectLifecycle.projects[0].PROJECT_PHASE, 'WEB_BASE_IMPLEMENTATION');
});

test('repository uses no Vibe2 human documents and legacy Vibe2 docs are removed', () => {
  const runtime = JSON.parse(fs.readFileSync('vibe2-runtime.json', 'utf8'));
  assert.equal(runtime.documentation?.humanDocumentRequired, false);
  assert.deepEqual(runtime.documentation?.humanDocuments, []);
  assert.equal(runtime.documentation?.humanDocumentLimit, 0);
  assert.equal(runtime.documentation?.manualHandoffDocumentsAllowed, false);
  assert.equal(runtime.documentation?.runtimeState?.projectLifecycle, '.vibe2/web-roblox-handoffs.json');
  assert.equal(runtime.sources?.projectLifecycleState, '.vibe2/web-roblox-handoffs.json');
  assert.deepEqual(runtime.projectLifecycle?.requiredFields, [
    'PROJECT_PHASE','PLATFORM','GENRE','WEB_BASELINE','ROBLOX_HANDOFF',
    'POST_RELEASE_FOCUS_RUNNER','LEARNING_CONTEXT','NEXT_MACHINE_ACTION'
  ]);
  assert.equal(runtime.projectLifecycle?.postReleaseFocusRunner?.logicalRunnerPerReleasedProject, 1);
  assert.equal(fs.existsSync('VIBE2.md'), false);

  for (const file of runtime.documentation?.legacyHumanDocumentsRemoved || []) {
    assert.equal(fs.existsSync(file), false, `${file} must stay removed`);
  }
});

test('repository handoff is generated entirely from machine state', () => {
  const snapshot = generateVibe2Handoff();
  assert.equal(snapshot.kind, 'vibe2-machine-handoff');
  assert.equal(snapshot.generatedFrom.runtimeVersion, 13);
  assert.equal(snapshot.generatedFrom.queueVersion, 5);
  assert.equal(snapshot.generatedFrom.parallelismVersion, 3);
  assert.equal(snapshot.generatedFrom.experienceVersion, 3);
  assert.equal(snapshot.workPolicy.humanMaintainedHandoff, false);
  assert.equal(snapshot.parallelism.configuredMax, 256);
  assert.deepEqual(snapshot.parallelism.steps, [256, 128, 64, 32, 20, 16, 8, 4]);
  assert.ok(snapshot.workState.taskCount > 0);
});


test('repository machine state is internally consistent and no extra Vibe2 human docs exist', () => {
  const snapshot = generateVibe2Handoff();
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.consistency.ok, true, snapshot.consistency.errors.join(','));
  assert.deepEqual(snapshot.consistency.errors, []);
  const actual = fs.readdirSync('.').filter((file) => /^VIBE2.*\.md$/i.test(file)).sort();
  assert.deepEqual(actual, []);
});

test('consistency gate rejects an unlisted Vibe2 markdown file and divergent adaptive state', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-consistency-'));
  fs.writeFileSync(path.join(tempRoot, 'VIBE2.md'), '# Vibe2\n');
  fs.writeFileSync(path.join(tempRoot, 'VIBE2_STALE.md'), '# stale\n');
  fs.mkdirSync(path.join(tempRoot, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, '.github/workflows'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, 'tools/vibe2-handoff.mjs'), '');
  fs.writeFileSync(path.join(tempRoot, '.github/workflows/vibe2-24h-runner.yml'), '');
  fs.writeFileSync(path.join(tempRoot, '.github/workflows/vibe2-continuous-core.yml'), '');
  const runtime = JSON.parse(fs.readFileSync('vibe2-runtime.json', 'utf8'));
  const queue = { version: 5, maxConcurrentTasks: 20, tasks: [] };
  const parallelism = { version: 2, currentMax: 10 };
  const experience = { version: 3, records: [] };
  const consistency = validateVibe2MachineState({ runtime, queue, parallelism, experience, repoRoot: tempRoot });
  assert.equal(consistency.ok, false);
  assert.equal(consistency.errors.some((x) => x.startsWith('UNLISTED_VIBE2_MARKDOWN:')), true);
  assert.equal(consistency.errors.includes('PERSISTENT_MAX_OUTSIDE_STEPS'), true);
});

test('planner and worker work-order consume generated machine handoff instead of manual context', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-consumers-'));
  const queueFile = path.join(tempRoot, 'queue.json');
  const controlFile = path.join(tempRoot, 'parallelism.json');
  const experienceFile = path.join(tempRoot, 'experience.json');
  const statusFile = path.join(tempRoot, 'status.json');
  const catalogFile = path.join(tempRoot, 'catalog.json');
  fs.writeFileSync(queueFile, JSON.stringify({ version:5, maxConcurrentTasks:256, tasks:[] }));
  fs.writeFileSync(controlFile, JSON.stringify({ version:3, currentMax:8, healthyStreak:0, pressureStreak:0 }));
  fs.writeFileSync(experienceFile, JSON.stringify({ version:3, records:[] }));
  fs.writeFileSync(statusFile, JSON.stringify({ projects:[] }));
  fs.writeFileSync(catalogFile, JSON.stringify({ games:[] }));
  const planned = runVibe2AutoPlanner({ runtimeFile:'vibe2-runtime.json', queueFile, controlFile, experienceFile, statusFile, catalogFile, repoRoot:tempRoot, maxConcurrentTasks:256 });
  assert.equal(planned.machineHandoff.used, true);
  assert.equal(planned.machineHandoff.consistency.ok, true);
  assert.equal(planned.effectivePlannerMax, 8);

  const outputFile = path.join(tempRoot, 'work-order.json');
  const order = runVibeContinuousRunner({ runtimeFile:'vibe2-runtime.json', queueFile, controlFile, experienceFile, outputFile });
  assert.equal(order.machineHandoff.used, true);
  assert.equal(order.machineHandoff.consistency.ok, true);
  assert.equal(order.machineHandoff.currentPersistentMax, 8);
});

test('machine-state E2E reserves only game-primary work, builds worker order, fans in pressure, and leaves auxiliary work separate', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-handoff-e2e-'));
  const queueFile = path.join(tempRoot, 'queue.json');
  const controlFile = path.join(tempRoot, 'parallelism.json');
  const experienceFile = path.join(tempRoot, 'experience.json');
  const batchFile = path.join(tempRoot, 'batch.json');
  const resultFile = path.join(tempRoot, 'results.json');
  const orderFile = path.join(tempRoot, 'work-order.json');
  const tasks = Array.from({ length: 31 }, (_, index) => {
    const n = String(index + 1).padStart(2, '0');
    const gameId = index === 0 ? 'daechung-rpg' : `e2e-${n}`;
    const sourceRoot = index === 0 ? 'web-games/daechung-rpg' : `web-games/e2e-${n}`;
    const analysisOnly = index === 0;
    return { id:`e2e-${n}`, gameId, target:'web', department:analysisOnly?'qa':'development', type:analysisOnly?'qa':'implementation', goal:analysisOnly?'inspect existing web source':'existing web text maintenance', responsibleFiles:analysisOnly?[]:[`${sourceRoot}/index.html`], dependencies:[], priority:'normal', releaseState:'development-confirmed', status:'queued', retries:0, maxRetries:2, ownerDirective:false, requiresOwnerDecision:false, protectedChange:false, paidResourceRequired:false, sourceRoot, estimatedRisk:'low', speculativeEligible:false, evidence:[] };
  });
  fs.writeFileSync(queueFile, JSON.stringify({ version:5, mode:'hierarchical-dag-sharded-work-stealing-queue', maxConcurrentTasks:256, tasks }, null, 2));
  fs.writeFileSync(controlFile, JSON.stringify({ version:3, currentMax:32, healthyStreak:0, pressureStreak:0, lastDecision:'INIT', lastReason:'CANONICAL_STEP_32', lastRunId:null, lastUpdatedAt:null, lastTelemetry:null }, null, 2));
  fs.writeFileSync(experienceFile, JSON.stringify({ version:3, records:[] }, null, 2));

  const before = generateVibe2Handoff({ runtimeFile:'vibe2-runtime.json', queueFile, controlFile, experienceFile });
  assert.equal(before.consistency.ok, true);
  assert.equal(before.workState.queuedCount, 31);

  const reserved = runQueueCommand({ command:'reserve-batch', queue:queueFile, control:controlFile, max:'32', output:batchFile });
  assert.equal(reserved.tasks.length, 30);
  assert.equal(reserved.tasks.some(task=>task.id==='e2e-01'),false);
  assert.equal(reserved.selection?.lane,'game-primary');
  assert.ok(reserved.selection?.laneDeferred?.some(task=>task.id==='e2e-01'));
  const order = runVibeContinuousRunner({ runtimeFile:'vibe2-runtime.json', queueFile, controlFile, experienceFile, outputFile:orderFile, taskId:'e2e-02' });
  assert.equal(order.run, true);
  assert.equal(order.executionRoute, 'text-source-worker');
  assert.equal(order.machineHandoff.used, true);
  assert.equal(order.machineHandoff.consistency.ok, true);
  assert.equal(order.machineHandoff.currentPersistentMax, 32);
  assert.notEqual(order.reason?.startsWith('MACHINE_STATE_INCONSISTENT'), true);

  const now = Date.now();
  const rows = reserved.tasks.map((task, index) => ({
    version:2, taskId:task.id, variant:'primary', outcome:'BLOCKED', blocker:'e2e-pressure', evidence:['actions-run:e2e-machine-handoff'], durationMs:30000,
    metrics:{ requestedMax:32, effectiveMax:32, reservedAt:new Date(now-50000).toISOString(), workerStartedAt:now-30000, workerFinishedAt:now-1000-index, checkoutMs:20000, candidateMs:0, qaMs:0, workerTotalMs:29000, ollamaCacheHit:true, ollamaRuntimeSource:'CACHE' }
  }));
  fs.writeFileSync(resultFile, JSON.stringify({ version:1, results:rows }, null, 2));
  const fanIn = runQueueCommand({ command:'fan-in', queue:queueFile, control:controlFile, input:resultFile });
  assert.equal(fanIn.adaptiveControl.currentMax, 20);
  assert.equal(fanIn.adaptiveControl.lastDecision, 'DOWN');

  const after = generateVibe2Handoff({ runtimeFile:'vibe2-runtime.json', queueFile, controlFile, experienceFile });
  assert.equal(after.consistency.ok, true);
  assert.equal(after.parallelism.currentPersistentMax, 20);
  assert.equal(after.workState.queuedCount, 1);
  assert.equal(after.workState.blockedCount, 30);
  assert.ok(after.workState.queuedPreview.some(task=>task.id==='e2e-01'));
});
