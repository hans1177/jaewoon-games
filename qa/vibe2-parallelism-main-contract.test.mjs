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

test('general game recovery neural execution has no internal global cap',()=>{
  const direct=roadmap.developmentSpeedExecution.directExecutionContract;
  assert.equal(direct.mode,'INDEPENDENT_TASK_EVENT_DRIVEN');
  assert.equal(direct.internalGlobalParallelCap,null);
  assert.equal(direct.externalMatrixTransportPartitionMax,256);
  assert.equal(direct.learningIdleFixedWorkers,1);
  assert.equal(direct.assetDevelopmentLaneMax,64);
  assert.equal(direct.assetDevelopmentSpeculativeVariantsPerTask,1);
  assert.equal(direct.sharedStateWriteCoordination,'OPTIMISTIC_RETRY_ATOMIC_WRITE_ONLY');

  const exec=runtime.continuous.executionContract;
  assert.equal(exec.internalGlobalParallelCap,null);
  assert.equal(exec.externalMatrixTransportPartitionMax,256);
  assert.equal(exec.independentEligibleTaskStart,'IMMEDIATE');
  assert.deepEqual(exec.serializationReasons,[
    'RESPONSIBLE_FILE_CONFLICT',
    'ACTUAL_DEPENDENCY',
    'EXACT_DUPLICATE_SUPPRESSION',
    'ATOMIC_SHARED_STATE_WRITE'
  ]);

  assert.equal(queue.version,6);
  assert.equal(queue.mode,'independent-dag-direct-reservation-queue');
  assert.equal(queue.maxConcurrentTasks,null);
  assert.equal(queue.execution.internalGlobalParallelCap,null);
  assert.equal(queue.execution.externalMatrixTransportPartitionMax,256);
  assert.equal(queue.execution.sourceRootExclusive,false);
  assert.equal(queue.execution.responsibleFileExclusive,true);

  assert.equal(runtime.adaptiveBackpressure.mode,'TELEMETRY_AND_OPTIONAL_SPECULATION_SIGNAL_ONLY');
  assert.equal(runtime.adaptiveBackpressure.primaryReservationLimit,null);
  assert.equal(runtime.adaptiveBackpressure.primaryReservationDownshiftAllowed,false);
  assert.equal(runtime.adaptiveBackpressure.independentPrimaryEligibilityUnaffected,true);

  for(const text of [runner,core]){
    assert.doesNotMatch(text,/VIBE2_MAX_CONCURRENT_GAME_TASKS|VIBE2_GAME_PRIMARY_BASELINE_TARGET|VIBE2_GAME_PRIMARY_ADAPTIVE_MIN|VIBE2_LANE_MAX|lane_max:/);
  }
  assert.match(core,/VIBE2_EXTERNAL_MATRIX_BATCH_MAX: '256'/);
  assert.match(core,/VIBE2_LEARNING_LANE_MAX: '1'/);
  assert.match(core,/VIBE2_ASSET_DEVELOPMENT_MAX: '64'/);
});

test('control runners stay separated without becoming a general scheduling cap',()=>{
  const pool=runtime.continuous.gamePrimaryControlRunnerPool;
  assert.equal(pool.reserve,'ubuntu-slim');
  assert.equal(pool.fanIn,'ubuntu-24.04-arm');
  assert.equal(pool.worker,'ubuntu-latest');
  assert.equal(pool.modelCache,'ubuntu-latest');
  assert.equal(pool.queueReservationAndStateFanInOnly,true);
  assert.equal(pool.heavyGameExecutionUnchanged,true);

  const architecturePool=architecture.neuralWorkGraphTopology.currentIndependentExecution.vibeGameControlRunnerPool;
  assert.equal(architecturePool.reserve,'ubuntu-slim');
  assert.equal(architecturePool.fanIn,'ubuntu-24.04-arm');
  assert.equal(architecturePool.worker,'ubuntu-latest');
  assert.equal(architecturePool.modelCache,'ubuntu-latest');

  assert.match(core,/runs-on: \$\{\{ \(github\.event_name == 'repository_dispatch'/);
  assert.match(core,/\n  fan_in:[\s\S]*?\n    runs-on: ubuntu-24\.04-arm/);
});

test('director fallback and main push reuse direct canonical reservation without new work authority',()=>{
  const wake=runtime.continuous.mainPushGamePrimaryWake;
  assert.equal(wake.enabled,true);
  assert.equal(wake.usesExistingReservePath,true);
  assert.equal(wake.topLevelSingletonActive,false);
  assert.equal(wake.independentReserveIngress,true);
  assert.equal(wake.duplicateWakeSignalsCoalesced,false);

  const fallback=runtime.continuous.directorGamePrimaryFallbackWake;
  assert.equal(fallback.enabled,true);
  assert.equal(fallback.dispatchTarget,'.github/workflows/vibe2-continuous-core.yml');
  assert.equal(fallback.existingQueuedTasksOnly,true);
  assert.equal(fallback.newQueueCreated,false);
  assert.equal(fallback.laneMax,null);
  assert.equal(fallback.laneMaxMeaning,'NO_INTERNAL_CAP');
  assert.equal(fallback.independentReserveIngress,true);

  assert.match(director,/actions\/workflows\/vibe2-continuous-core\.yml\/dispatches/);
  assert.doesNotMatch(director,/inputs\[lane_max\]/);
});

test('shared queue reserve uses optimistic retry and serializes only atomic state writes',()=>{
  const reserve=runtime.continuous.reserveConcurrency;
  assert.equal(reserve.mode,'PARALLEL_RESERVE_OPTIMISTIC_SHARED_QUEUE_WRITE');
  assert.equal(reserve.crossLaneGlobalReserveLock,false);
  assert.equal(reserve.sameLaneReserveSerialization,false);
  assert.equal(reserve.sharedQueueWriteRetryAttempts,null);
  assert.equal(reserve.sharedQueueWriteRetryPolicy,'UNBOUNDED_WITH_CAPPED_BACKOFF');
  assert.equal(reserve.reserveJobsParallel,true);
  assert.equal(reserve.serializationScope,'ATOMIC_SHARED_STATE_WRITE_CRITICAL_SECTION_ONLY');
  assert.equal(reserve.internalGlobalParallelCap,null);
  assert.equal(reserve.externalMatrixTransportPartitionMax,256);

  const archReserve=architecture.neuralWorkGraphTopology.currentIndependentExecution.reserveConcurrency;
  assert.equal(archReserve.internalGlobalParallelCap,null);
  assert.equal(archReserve.externalMatrixTransportPartitionMax,256);
  assert.equal(archReserve.sameLaneReserveSerialization,false);
  assert.match(core,/VIBE2_CONTROL_OPTIMISTIC_RETRY_POLICY=UNBOUNDED/);
  assert.doesNotMatch(core,/WAVE_LEADER|wave-leader|runner-pressure-wave-leader-free-slot-refill/);
});

test('learning and asset lanes keep only their owner-fixed limits',()=>{
  const learning=runtime.continuous.executionLanes.LEARNING_IDLE;
  assert.equal(learning.maxActiveWorkers,1);
  assert.equal(learning.minimumActiveWorkersUnderPressure,1);
  assert.equal(learning.productionMayNotWaitForLearningReserve,true);

  const asset=roadmap.assetProductionParallelContract.parallelism;
  assert.equal(asset.assetDevelopmentLaneMax,64);
  assert.equal(asset.assetDevelopmentSpeculativeVariantsPerTask,1);
  assert.equal(asset.assetDevelopmentReserveRunner,'ubuntu-slim');
  assert.equal(asset.assetDevelopmentRunnerLabel,'ubuntu-24.04-arm');
  assert.equal(asset.gamePrimaryRunnerLabel,'ubuntu-latest');
  assert.equal(asset.assetDevelopmentUsesExistingCanonicalQueue,true);
});

test('stale main push wake exits before reserve mutation and active workers are not cancelled',()=>{
  const wake=runtime.continuous.mainPushGamePrimaryWake;
  assert.equal(wake.freshnessGateBeforeContractPreflight,true);
  assert.equal(wake.staleWakeMayWriteControlState,false);
  assert.equal(wake.staleWakeMayStartGameWorker,false);
  assert.equal(wake.runningOrCompletedGameWorkerCancellation,false);
  assert.match(core,/VIBE2_MAIN_PUSH_WAKE_STALE_DROPPED=/);
  assert.match(core,/Prepare latest main machine contract/);
  assert.match(core,/Reserve conflict-free DAG batch/);
  assert.match(core,/cancel-in-progress: false/);
});

test('24h runner starts direct independent lanes and keeps asset recovery wake',()=>{
  assert.match(runner,/execution_lane: recovery-fast/);
  assert.match(runner,/execution_lane: game-primary/);
  assert.match(runner,/execution_lane: asset-development/);
  assert.match(runner,/execution_lane: learning-idle/);
  assert.match(runner,/asset_development_refill_ready/);
  assert.match(runner,/asset_development_queued/);
  assert.match(runner,/asset_development_active/);
  assert.doesNotMatch(runner,/schedulerConcurrencyEpoch|wave_ready|wave-leader/);
});
