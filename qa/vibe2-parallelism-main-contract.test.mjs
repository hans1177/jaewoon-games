import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const director=fs.readFileSync('.github/workflows/director-supervisor.yml','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const queue=JSON.parse(fs.readFileSync('.vibe2/queue.json','utf8'));
const control=JSON.parse(fs.readFileSync('.vibe2/parallelism-control.json','utf8'));

test('general execution is direct and has no internal global cap',()=>{
  const direct=roadmap.developmentSpeedExecution.directExecutionContract;
  const runtimeDirect=runtime.continuous.executionContract;
  const game=runtime.continuous.executionLanes.GAME_PRIMARY;
  const arch=architecture.neuralWorkGraphTopology.currentIndependentExecution;

  assert.equal(direct.mode,'INDEPENDENT_TASK_EVENT_DRIVEN');
  assert.equal(direct.independentEligibleTaskStart,'IMMEDIATE');
  assert.equal(direct.internalGlobalParallelCap,null);
  assert.equal(direct.externalMatrixTransportPartitionMax,256);
  assert.deepEqual(direct.serializationReasons,[
    'RESPONSIBLE_FILE_CONFLICT','ACTUAL_DEPENDENCY','EXACT_DUPLICATE_SUPPRESSION','ATOMIC_SHARED_STATE_WRITE'
  ]);

  assert.equal(runtimeDirect.mode,'INDEPENDENT_TASK_EVENT_DRIVEN');
  assert.equal(runtimeDirect.internalGlobalParallelCap,null);
  assert.equal(runtimeDirect.externalMatrixTransportPartitionMax,256);
  assert.equal(runtimeDirect.sharedStateWriteCoordination,'OPTIMISTIC_RETRY_ATOMIC_WRITE_ONLY');

  assert.equal(game.internalGlobalParallelCap,null);
  assert.equal(game.externalMatrixTransportPartitionMax,256);
  assert.equal(game.independentReservationWhileActive,true);
  assert.equal(game.independentEligibleTaskStart,'IMMEDIATE');

  assert.equal(arch.internalGlobalCap,null);
  assert.equal(arch.externalMatrixTransportPartitionMax,256);
  assert.equal(arch.globalActiveBarrier,false);
  assert.equal(arch.independentEligibleTaskStart,'IMMEDIATE');

  assert.equal(runtime.coordination.sourceRootExclusive,false);
  assert.equal(runtime.coordination.responsibleFileExclusive,true);
  assert.equal(runtime.coordination.gameWideLockForbidden,true);
  assert.equal(runtime.coordination.sameFileParallelWrite,false);
  assert.equal(runtime.coordination.stateWritesSerialized,true);
  assert.equal(runtime.safety.queueSourceRootLeaseRequired,false);
  assert.equal(runtime.safety.queueResponsibleFileConflictProtectionRequired,true);

  assert.equal(queue.version,6);
  assert.equal(queue.mode,'independent-dag-direct-reservation-queue');
  assert.equal(queue.maxConcurrentTasks,null);
  assert.equal(queue.execution.internalGlobalParallelCap,null);
  assert.equal(queue.execution.externalMatrixTransportPartitionMax,256);
  assert.equal(queue.execution.sourceRootExclusive,false);
  assert.equal(queue.execution.responsibleFileExclusive,true);
  assert.equal(queue.execution.atomicSharedStateWriteMode,'OPTIMISTIC_RETRY');

  assert.equal(runtime.adaptiveBackpressure.mode,'TELEMETRY_AND_OPTIONAL_SPECULATION_SIGNAL_ONLY');
  assert.equal(runtime.adaptiveBackpressure.primaryReservationLimit,null);
  assert.equal(runtime.adaptiveBackpressure.primaryReservationDownshiftAllowed,false);
  assert.equal(runtime.adaptiveBackpressure.independentPrimaryEligibilityUnaffected,true);
  assert.equal(runtime.adaptiveBackpressure.stateCurrentMaxMeaning,'LEGACY_TELEMETRY_SIGNAL_ONLY_NOT_RESERVATION_AUTHORITY');
  assert.ok(Number(control.currentMax)>0);
});

test('learning and asset lanes keep their explicit owner limits only',()=>{
  const direct=runtime.continuous.executionContract;
  const learning=runtime.continuous.executionLanes.LEARNING_IDLE;
  const asset=runtime.continuous.executionLanes.ASSET_DEVELOPMENT;

  assert.equal(direct.learningIdleFixedWorkers,1);
  assert.equal(direct.assetDevelopmentLaneMax,64);
  assert.equal(direct.assetDevelopmentSpeculativeVariantsPerTask,1);
  assert.equal(learning.maxActiveWorkers,1);
  assert.equal(learning.minimumActiveWorkersUnderPressure,1);
  assert.equal(asset.maxActiveWorkers,64);
  assert.equal(asset.speculativeVariantsPerTask,1);
  assert.equal(asset.distinctTaskParallelismPreserved,true);

  assert.equal(queue.execution.learningIdleFixedWorkers,1);
  assert.equal(queue.execution.assetDevelopmentLaneMax,64);
  assert.equal(queue.execution.assetDevelopmentSpeculativeVariantsPerTask,1);
  assert.match(core,/VIBE2_LEARNING_LANE_MAX: '1'/);
  assert.match(core,/VIBE2_ASSET_DEVELOPMENT_MAX: '64'/);
  assert.match(core,/VIBE2_EXTERNAL_MATRIX_BATCH_MAX: '256'/);
});

test('reserve uses optimistic shared-state writes without general reserve serialization',()=>{
  const reserve=runtime.continuous.reserveConcurrency;
  const archReserve=architecture.neuralWorkGraphTopology.currentIndependentExecution.reserveConcurrency;

  assert.equal(reserve.mode,'PARALLEL_RESERVE_OPTIMISTIC_SHARED_QUEUE_WRITE');
  assert.equal(reserve.crossLaneGlobalReserveLock,false);
  assert.equal(reserve.sameLaneReserveSerialization,false);
  assert.equal(reserve.sharedQueueWriteRetryAttempts,null);
  assert.equal(reserve.sharedQueueWriteRetryPolicy,'UNBOUNDED_WITH_CAPPED_BACKOFF');
  assert.equal(reserve.reserveJobsParallel,true);
  assert.equal(reserve.serializationScope,'ATOMIC_SHARED_STATE_WRITE_CRITICAL_SECTION_ONLY');
  assert.equal(reserve.internalGlobalParallelCap,null);
  assert.equal(reserve.externalMatrixTransportPartitionMax,256);

  assert.equal(archReserve.mode,'PARALLEL_RESERVE_OPTIMISTIC_SHARED_QUEUE_WRITE');
  assert.equal(archReserve.crossLaneGlobalReserveLock,false);
  assert.equal(archReserve.sameLaneReserveSerialization,false);
  assert.equal(archReserve.reserveJobsParallel,true);
  assert.equal(archReserve.serializationScope,'ATOMIC_SHARED_STATE_WRITE_CRITICAL_SECTION_ONLY');
  assert.equal(archReserve.internalGlobalParallelCap,null);
  assert.equal(archReserve.externalMatrixTransportPartitionMax,256);

  assert.match(core,/VIBE2_CONTROL_OPTIMISTIC_RETRY_POLICY=UNBOUNDED/);
  assert.doesNotMatch(core,/for state_attempt in 1 2 3 4 5/);
  assert.doesNotMatch(core,/WAVE_LEADER|wave-leader|NEXT_EXTERNAL_MATRIX_WINDOW|NEW_WAVE_OR_IDLE_REFILL/);
});

test('main-push wake is direct run-scoped ingress and director fallback passes no cap input',()=>{
  const wake=runtime.continuous.mainPushGamePrimaryWake;
  const archWake=architecture.neuralWorkGraphTopology.currentIndependentExecution.mainPushGamePrimaryWake;

  assert.equal(wake.enabled,true);
  assert.equal(wake.executionLane,'GAME_PRIMARY');
  assert.equal(wake.usesExistingReservePath,true);
  assert.equal(wake.duplicateWakeSignalsCoalesced,false);
  assert.equal(wake.topLevelSingletonActive,false);
  assert.equal(wake.independentReserveIngress,true);
  assert.equal(wake.workflowCallLaneRunsRunScoped,true);
  assert.equal(wake.activeWakeCancellationForbidden,true);

  assert.equal(archWake.enabled,true);
  assert.equal(archWake.usesExistingCanonicalReserve,true);
  assert.equal(archWake.duplicateWakeSignalsCoalesced,false);
  assert.equal(archWake.independentReserveIngress,true);
  assert.equal(archWake.workflowCallLaneRunsRunScoped,true);

  assert.match(core,/format\('vibe2-continuous-\{0\}-\{1\}', github\.run_id, inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.match(core,/cancel-in-progress: false/);
  assert.doesNotMatch(core,/vibe2-main-push-game-primary-wake/);

  assert.match(director,/actions\/workflows\/vibe2-continuous-core\.yml\/dispatches/);
  assert.match(director,/-f 'inputs\[execution_lane\]=game-primary'/);
  assert.doesNotMatch(director,/inputs\[lane_max\]/);
});

test('current runner topology keeps lightweight control and heavy execution separated',()=>{
  const pool=runtime.continuous.gamePrimaryControlRunnerPool;
  const archPool=architecture.neuralWorkGraphTopology.currentIndependentExecution.vibeGameControlRunnerPool;

  assert.equal(pool.reserve,'ubuntu-slim');
  assert.equal(pool.fanIn,'ubuntu-24.04-arm');
  assert.equal(pool.worker,'ubuntu-latest');
  assert.equal(pool.modelCache,'ubuntu-latest');
  assert.equal(pool.lightweightReserveSeparatedFromArmFanIn,true);
  assert.equal(pool.queueReservationAndStateFanInOnly,true);
  assert.equal(pool.heavyGameExecutionUnchanged,true);

  assert.equal(archPool.reserve,'ubuntu-slim');
  assert.equal(archPool.fanIn,'ubuntu-24.04-arm');
  assert.equal(archPool.worker,'ubuntu-latest');
  assert.equal(archPool.modelCache,'ubuntu-latest');
  assert.equal(archPool.lightweightReserveSeparatedFromArmFanIn,true);
  assert.equal(archPool.queueReservationAndStateFanInOnly,true);
  assert.equal(archPool.heavyGameExecutionUnchanged,true);

  assert.match(core,/\n  fan_in:[\s\S]*?\n    runs-on: ubuntu-24\.04-arm/);
  assert.match(core,/asset-development' && 'ubuntu-24\.04-arm' \|\| 'ubuntu-latest'/);
});

test('stale wake and failed-worker lock safety remain fail-closed',()=>{
  const wake=runtime.continuous.mainPushGamePrimaryWake;
  assert.equal(wake.freshnessGateBeforeContractPreflight,true);
  assert.equal(wake.staleWakeMayWriteControlState,false);
  assert.equal(wake.staleWakeMayStartGameWorker,false);
  assert.equal(wake.runningOrCompletedGameWorkerCancellation,false);
  assert.match(core,/Drop stale reserve wake before reserve work/);
  assert.match(core,/VIBE2_MAIN_PUSH_WAKE_STALE_DROPPED=/);
  assert.match(core,/Prepare latest main machine contract\n\s+id: contract\n\s+if: steps\.main_wake\.outputs\.proceed == 'true'/);

  const upload=core.indexOf('- name: Upload worker result for fan-in');
  const release=core.indexOf('- name: Release failed worker Work Lock after immutable result upload');
  const callback=core.indexOf('- name: Dispatch or coalesce atomic neuron completion');
  assert.ok(upload>=0&&release>upload&&callback>release);
  const block=core.slice(release,callback);
  assert.match(block,/steps\.worker_result_upload\.outcome == 'success'/);
  assert.match(block,/row\.workLock\?\.id/);
  assert.match(block,/HELD_FOR_FAN_IN/);
});
