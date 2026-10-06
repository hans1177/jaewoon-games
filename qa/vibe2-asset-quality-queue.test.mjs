import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVibeContinuousQueue, selectVibeQueueBatch, beginVibeQueueTask,
  beginVibeQueueBatch, finishVibeQueueTask
} from '../assets/vibe-continuous-queue.js';

// Reducer fixtures are not runtime observations or production-quality evidence.
const qualityTask = (id, target = 'roblox', overrides = {}) => {
  const sourceRoot = `assets/${target}/quality-fixture/${id}`;
  const sourcePath = target === 'roblox' ? 'init.luau' : target === 'unity' ? 'View.cs' : 'view.js';
  return {
    id, gameId: `consumer-${id}`, target, department: 'graphics', type: 'implementation',
    goal: 'Improve the exact registered source; retain native runtime verification requirements.',
    sourceRoot, responsibleFiles: [`${sourceRoot}/${sourcePath}`], status: 'queued',
    assetProductionLane: true, retryPolicy: 'UNLIMITED', speculativeEligible: false,
    releaseState: 'development-confirmed',
    evidence: ['asset-production-parallel:v1', `asset-current-consumer:consumer-${id}`],
    assetQualityWorkUnit: {
      scope: 'INTERNAL_ASSET_LIBRARY_QUALITY', assetId: `fixture-${id}`, platform: target,
      sourceRoot, sourcePath, sourceFile: `${sourceRoot}/${sourcePath}`, sourceHash: 'a'.repeat(64),
      generation: 1, estimatedModificationMinutes: 60, workerTimeoutMinutes: 60,
      detailSteps: ['form', 'material', 'feedback', 'same-condition-native-recheck'],
      completionRequires: ['real-source-delta', 'native-runtime', 'same-condition-before-after'],
      runtimeVerified: false
    },
    ...overrides
  };
};
const select = queue => selectVibeQueueBatch(queue, {
  maxConcurrentTasks: 63, lane: 'asset-development', internalAssetOnly: true, assetDemandFirst: true
});
const roundTrip = queue => createVibeContinuousQueue(JSON.parse(JSON.stringify(queue)));
const targets = ['roblox', 'unity', 'web'];

for (const target of targets) {
  test(`${target} quality work survives queue serialization with its exact source and evidence obligations`, () => {
    const input = qualityTask(target, target);
    const queue = roundTrip(createVibeContinuousQueue({ tasks: [input], maxConcurrentTasks: 63 }));
    assert.deepEqual(queue.tasks[0].assetQualityWorkUnit, input.assetQualityWorkUnit);
    assert.deepEqual(queue.tasks[0].responsibleFiles, input.responsibleFiles);
    assert.equal(queue.tasks[0].assetQualityWorkUnit.runtimeVerified, false);
    assert.equal(queue.tasks[0].status, 'queued');
    assert.equal(queue.tasks[0].speculativeEligible, false);
    assert.equal(queue.maxConcurrentTasks, 63);
  });
  test(`${target} existing reservation path delivers the same quality work unit to its worker`, () => {
    const input = qualityTask(`reserve-${target}`, target);
    const result = beginVibeQueueBatch({ tasks: [input], maxConcurrentTasks: 63 }, {
      maxConcurrentTasks: 63, lane: 'asset-development', internalAssetOnly: true,
      assetDemandFirst: true, reservation: { id: 'fixture:1', runId: 'fixture', runAttempt: 1 }
    });
    assert.equal(result.started, true);
    assert.deepEqual(result.tasks[0].assetQualityWorkUnit, input.assetQualityWorkUnit);
    assert.equal(result.tasks[0].reservationId, 'fixture:1');
    assert.equal(result.tasks[0].assetQualityWorkUnit.runtimeVerified, false);
    assert.deepEqual(roundTrip(result.queue).tasks[0].assetQualityWorkUnit, input.assetQualityWorkUnit);
  });
}

test('quality authoring uses the existing asset lane even without legacy evidence aliases', () => {
  const input = qualityTask('without-alias', 'web', { assetProductionLane: false, evidence: [] });
  const task = createVibeContinuousQueue([input]).tasks[0];
  assert.equal(task.executionLane, 'ASSET_DEVELOPMENT');
  assert.equal(task.assetProductionLane, true);
  assert.equal(select([input]).selected[0]?.id, input.id);
});

test('internal-only mode includes general quality and legacy motion, but not game-source asset work', () => {
  const quality = qualityTask('menu', 'web');
  const motion = qualityTask('walk', 'roblox', {
    assetQualityWorkUnit: null,
    motionRepairWorkUnit: { scope: 'INTERNAL_ASSET_LIBRARY', objectId: 'roblox-world-ghost-fixture', objectCount: 1, motionCount: 1, clipId: 'walk', sourcePath: 'init.luau' }
  });
  const external = qualityTask('game-source', 'roblox', { assetQualityWorkUnit: null });
  const result = select([quality, motion, external]);
  assert.deepEqual(new Set(result.selected.map(task => task.id)), new Set(['menu', 'walk']));
  assert.ok(result.laneDeferred.some(task => task.id === 'game-source'));
});

test('quality retry policy remains causal and unbounded after 100 actual reducer failures', () => {
  const input = qualityTask('retry');
  let queue = createVibeContinuousQueue([input]);
  for (let i = 1; i <= 100; i += 1) {
    queue = roundTrip(finishVibeQueueTask(queue, { taskId: input.id, outcome: 'FAIL', blocker: 'fixture-current-source-repair' }).queue);
    assert.equal(queue.tasks[0].status, 'queued', `retry ${i}`);
    assert.equal(queue.tasks[0].retries, i);
    assert.equal(queue.tasks[0].retryPolicy, 'UNLIMITED_CAUSAL_REPAIR');
    assert.equal(queue.tasks[0].maxRetries, null);
    assert.deepEqual(queue.tasks[0].assetQualityWorkUnit, input.assetQualityWorkUnit);
    assert.equal(queue.tasks[0].assetQualityWorkUnit.runtimeVerified, false);
  }
});

test('unrelated bounded work retains its existing retry limit', () => {
  const input = qualityTask('bounded', 'web', { assetQualityWorkUnit: null, retryPolicy: 'BOUNDED', maxRetries: 2 });
  let queue = createVibeContinuousQueue([input]);
  for (let i = 0; i < 3; i += 1) queue = finishVibeQueueTask(queue, { taskId: input.id, outcome: 'FAIL' }).queue;
  assert.equal(queue.tasks[0].status, 'failed');
  assert.equal(queue.tasks[0].maxRetries, 2);
});

test('unbounded quality retry does not bypass owner, security, or paid-resource blockers', () => {
  for (const field of ['ownerDevelopmentHold', 'requiresOwnerDecision', 'protectedChange', 'paidResourceRequired']) {
    const result = select([qualityTask(field, 'roblox', { [field]: true })]);
    assert.equal(result.selected.length, 0, field);
    assert.equal(result.blocked.length, 1, field);
  }
});

test('same exact asset source remains exclusive while disjoint files under one root stay parallel', () => {
  const a = qualityTask('one');
  const collision = qualityTask('collision', 'roblox', { sourceRoot: a.sourceRoot, responsibleFiles: [...a.responsibleFiles] });
  const disjoint = qualityTask('disjoint', 'roblox', { sourceRoot: a.sourceRoot, responsibleFiles: [`${a.sourceRoot}/other.luau`] });
  const result = select([a, collision, disjoint]);
  assert.equal(result.selected.length, 2);
  assert.ok(result.deferredConflicts.some(row => row.reason === 'responsible-file-conflict'));
  assert.equal(result.selected.filter(task => task.sourceRoot === a.sourceRoot).length, 2);
});

test('quality source claim prevents ordinary game work from starving the same internal file', () => {
  const asset = qualityTask('claim');
  const game = { ...asset, id: 'ordinary-game-work', department: 'development', assetProductionLane: false,
    assetQualityWorkUnit: null, evidence: [], releaseState: 'development-confirmed' };
  const result = selectVibeQueueBatch([asset, game], { lane: 'game-primary', internalAssetOnly: true, maxConcurrentTasks: 63 });
  assert.equal(result.selected.length, 0);
  assert.ok(result.deferredConflicts.some(row => row.reason === 'queued-asset-reservation-priority'));
});

test('a crowded logical 63-task asset batch retains two Unity/Web reservations and release-first Roblox order', () => {
  const releases = Array.from({ length: 70 }, (_, i) => qualityTask(`release-${i}`, 'roblox', { releaseState: 'release-confirmed' }));
  const unity = qualityTask('unity-floor', 'unity');
  const web = qualityTask('web-floor', 'web');
  const queue = createVibeContinuousQueue({ maxConcurrentTasks: 63, tasks: [...releases, unity, web] });
  const result = select(queue);
  assert.equal(result.selected.length, 63);
  assert.equal(result.selected.filter(task => task.target === 'roblox').length, 61);
  assert.equal(result.selected.filter(task => ['unity', 'web'].includes(task.target)).length, 2);
  assert.equal(result.selected[0].releaseState, 'release-confirmed');
  assert.equal(queue.maxConcurrentTasks, 63);
  // Logical reservations do not prove physical Actions runner occupancy.
  assert.equal(result.assetCrossPlatformReservation.logicalReservationOnly, true);
});

test('Unity/Web share their two reservations and do not require one task from each platform', () => {
  const releases = Array.from({ length: 70 }, (_, i) => qualityTask(`release-${i}`, 'roblox', { releaseState: 'release-confirmed' }));
  const result = select([...releases, qualityTask('web-a', 'web'), qualityTask('web-b', 'web')]);
  assert.equal(result.selected.filter(task => task.target === 'web').length, 2);
});

test('unused cross-platform reservations do not remove other eligible Roblox work', () => {
  const release = qualityTask('released', 'roblox', { releaseState: 'release-confirmed' });
  const others = Array.from({ length: 70 }, (_, i) => qualityTask(`other-${i}`));
  const result = select([...others, release]);
  assert.equal(result.selected.length, 63);
  assert.equal(result.selected[0].id, 'released');
  assert.ok(result.selected.some(task => task.id.startsWith('other-')));
});

test('running cross-platform work counts toward the floor without being cancelled or duplicated', () => {
  const running = qualityTask('active-unity', 'unity', { status: 'running', reservationId: 'existing:1' });
  const releases = Array.from({ length: 70 }, (_, i) => qualityTask(`release-${i}`, 'roblox', { releaseState: 'release-confirmed' }));
  const result = select([...releases, running, qualityTask('web-a', 'web'), qualityTask('web-b', 'web')]);
  assert.equal(result.selected.length, 62);
  assert.equal(result.selected.filter(task => task.target === 'web').length, 1);
  assert.equal(result.running.find(task => task.id === running.id)?.reservationId, 'existing:1');
});

test('cross-platform floor preserves active exact-file locks and reports a real shortfall', () => {
  const running = qualityTask('lock', 'roblox', { status: 'running' });
  const cross = qualityTask('locked-cross', 'web', { sourceRoot: running.sourceRoot, responsibleFiles: [...running.responsibleFiles] });
  const result = select([running, cross]);
  assert.equal(result.selected.length, 0);
  assert.equal(result.assetCrossPlatformReservation.shortfall, 2);
  assert.ok(result.deferredConflicts.some(row => row.reason === 'responsible-file-conflict'));
});

test('quality reservation never converts missing native evidence into runtime verification', () => {
  const input = qualityTask('native-pending', 'roblox', { status: 'running', blocker: 'candidate-awaiting-runtime-evidence', lastOutcome: 'FAN_IN_RUNTIME_EVIDENCE_REQUIRED' });
  const queue = roundTrip(createVibeContinuousQueue([input]));
  const result = select(queue);
  assert.equal(queue.tasks[0].status, 'running');
  assert.equal(queue.tasks[0].executionLane, 'RELEASE_WAIT');
  assert.equal(queue.tasks[0].assetQualityWorkUnit.runtimeVerified, false);
  assert.equal(result.capacityRunning.length, 0);
});
