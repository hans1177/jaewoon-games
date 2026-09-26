import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const queue=JSON.parse(fs.readFileSync('.vibe2/queue.json','utf8'));
const control=JSON.parse(fs.readFileSync('.vibe2/parallelism-control.json','utf8'));

test('maximum parallelism is default and source-root locks are permanently disabled',()=>{
  const wave=roadmap.neuralDevelopmentBrain.currentWaveExecution;
  assert.equal(wave.externalProviderAndPlanningBound,256);
  assert.equal(wave.defaultRequestedParallelism,256);
  assert.equal(wave.gamePrimaryBaselineTarget,256);
  assert.equal(wave.gamePrimaryAdaptiveMinimum,30);
  assert.equal(wave.sourceRootWideLockForbidden,true);
  assert.equal(wave.responsibleFileConflictProtectionStillRequired,true);
  assert.equal(wave.globalActiveWorkerBarrier,false);

  assert.equal(runtime.continuous.maxConcurrentGameTasks,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.baselineTarget,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMinActiveWorkers,30);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMaxActiveWorkers,256);
  const prePlan=runtime.continuous.prePlanGamePrimaryRefill||{};
  assert.equal(prePlan.enabled,true);
  assert.equal(prePlan.workerWorkflow,'.github/workflows/vibe2-continuous-core.yml');
  assert.equal(prePlan.dispatchMode,'WORKFLOW_DISPATCH_BEFORE_FULL_PLANNER');
  assert.equal(prePlan.preservesCanonicalReservation,true);
  assert.equal(runtime.adaptiveBackpressure.adaptiveControlRole,'TELEMETRY_AND_SPECULATIVE_SUPPRESSION_ONLY');
  assert.equal(runtime.adaptiveBackpressure.primaryReservationLimit,'CONFIGURED_EXTERNAL_PROVIDER_BOUNDARY');
  assert.equal(runtime.adaptiveBackpressure.primaryReservationDownshiftAllowed,false);
  const architectureWave=architecture.neuralWorkGraphTopology.currentWaveExecution;
  const architecturePrePlan=architectureWave.prePlanGamePrimaryRefill||{};
  assert.equal(architecturePrePlan.enabled,true);
  assert.equal(architecturePrePlan.fullPlannerCompletionRequiredBeforeDispatch,false);
  assert.equal(architecturePrePlan.canonicalReservationAndConflictRulesPreserved,true);
  const mainPushWake=runtime.continuous.mainPushGamePrimaryWake||{};
  assert.equal(mainPushWake.enabled,true);
  assert.equal(mainPushWake.executionLane,'GAME_PRIMARY');
  assert.equal(mainPushWake.usesExistingReservePath,true);
  assert.equal(mainPushWake.newSchedulerCreated,false);
  assert.equal(mainPushWake.duplicateWakeSignalsCoalesced,true);
  assert.equal(mainPushWake.concurrencyGroup,'vibe2-main-push-game-primary-wake');
  assert.equal(mainPushWake.activeWakeCancellationForbidden,true);
  const architectureMainPushWake=architectureWave.mainPushGamePrimaryWake||{};
  assert.equal(architectureMainPushWake.enabled,true);
  assert.equal(architectureMainPushWake.singletonPlannerCompletionRequired,false);
  assert.equal(architectureMainPushWake.usesExistingCanonicalReserve,true);
  assert.equal(architectureMainPushWake.duplicateWakeSignalsCoalesced,true);
  assert.equal(architectureMainPushWake.activeWakeCancellationForbidden,true);
  assert.equal(architectureWave.gamePrimaryActiveExecutionCap,'ADAPTIVE_30_TO_256_FROM_VERIFIED_THROUGHPUT');
  assert.equal(architectureWave.externalSpareBeyond30,'AVAILABLE_TO_GAME_PRIMARY; 30_IS_PRESSURE_FLOOR_NOT_CAP');
  assert.match(architectureWave.adaptiveControl,/PRESSURE_FLOOR_30/);
  assert.equal(runtime.coordination.sourceRootExclusive,false);
  assert.equal(runtime.coordination.responsibleFileExclusive,true);
  assert.equal(runtime.coordination.sameFileParallelWrite,false);
  assert.equal(runtime.coordination.stateWritesSerialized,true);
  assert.equal(runtime.safety.queueSourceRootLeaseRequired,false);
  assert.equal(runtime.safety.queueResponsibleFileConflictProtectionRequired,true);

  assert.equal(queue.scheduling.sourceRootExclusive,false);
  assert.equal(queue.scheduling.gameWideLockForbidden,true);
  assert.equal(queue.scheduling.responsibleFileExclusive,true);
  assert.equal(control.currentMax,256);

  assert.ok(runner.includes("VIBE2_MAX_CONCURRENT_GAME_TASKS: '256'"));
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '256'"));
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '30'"));
  assert.ok(runner.includes('VIBE2_24H_GAME_PRIMARY_RESERVATION_LIMIT_SOURCE=CONFIGURED_EXTERNAL_PROVIDER_BOUNDARY'));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '256'"));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '30'"));
  assert.match(core,/GAME_PRIMARY_MAIN_PUSH_WAKE/);
  assert.match(core,/push:\n\s*branches:\n\s*- main\n\s*- 'vibe2\/refill\/fanin\/\*\*'/);
  assert.match(core,/vibe2-main-push-game-primary-wake/);
  assert.match(core,/cancel-in-progress: false/);
  const fastDispatch=runner.indexOf('      - name: Dispatch queued GAME_PRIMARY work before full planning');
  const fullPlan=runner.indexOf('      - name: Plan from latest main and persist control queue');
  assert.ok(fastDispatch>=0&&fullPlan>fastDispatch);
  assert.match(runner,/actions\/workflows\/vibe2-continuous-core\.yml\/dispatches/);
  assert.match(runner,/VIBE2_PREPLAN_GAME_PRIMARY_DISPATCH=DISPATCHED/);
  assert.match(runner,/VIBE2_PREPLAN_GAME_PRIMARY_DISPATCH=FAILED_FALLBACK_POST_PLAN/);
});

test('game control jobs stay on ARM while heavy execution stays on ubuntu-latest',()=>{
  const pool=runtime.continuous?.gamePrimaryControlRunnerPool||{};
  const architecturePool=architecture.neuralWorkGraphTopology?.currentWaveExecution?.vibeGameControlRunnerPool||{};

  assert.equal(pool.reserve,'ubuntu-24.04-arm');
  assert.equal(pool.fanIn,'ubuntu-24.04-arm');
  assert.equal(pool.worker,'ubuntu-latest');
  assert.equal(pool.modelCache,'ubuntu-latest');
  assert.equal(pool.queueReservationAndStateFanInOnly,true);
  assert.equal(pool.heavyGameExecutionUnchanged,true);

  assert.equal(architecturePool.reserve,'ubuntu-24.04-arm');
  assert.equal(architecturePool.fanIn,'ubuntu-24.04-arm');
  assert.equal(architecturePool.worker,'ubuntu-latest');
  assert.equal(architecturePool.modelCache,'ubuntu-latest');
  assert.equal(architecturePool.queueReservationAndStateFanInOnly,true);
  assert.equal(architecturePool.heavyGameExecutionUnchanged,true);

  assert.match(core,/\n  reserve:\n(?:    #[^\n]*\n)*    runs-on: ubuntu-24\.04-arm/);
  assert.match(core,/\n  fan_in:[\s\S]{0,260}?\n    runs-on: ubuntu-24\.04-arm/);
  assert.match(core,/\n  model_cache:[\s\S]{0,180}?\n    runs-on: ubuntu-latest/);
  assert.match(core,/\n  worker:[\s\S]{0,180}?\n    runs-on: ubuntu-latest/);
});

test('reserve batch persists control state only through the explicit Vibe2 control root',()=>{
  const start=core.indexOf('      - name: Reserve conflict-free DAG batch');
  const end=core.indexOf('\n  model_cache:',start);
  assert.ok(start>=0&&end>start);
  const reserve=core.slice(start,end);

  assert.match(reserve,/control_root="\$GITHUB_WORKSPACE"/);
  assert.match(reserve,/test -d "\$control_root\/\.git"/);
  for(const command of [
    'fetch origin vibe2-unreal-core --quiet',
    'reset --hard origin/vibe2-unreal-core',
    'fetch origin company-runtime --quiet',
    'show origin/company-runtime:development-queue.json',
    'diff --quiet -- "${state_paths[@]}"',
    'add "${state_paths[@]}"',
    'commit -m "vibe2: repair state and reserve parallel DAG batch [skip ci]"',
    'push origin HEAD:vibe2-unreal-core'
  ]){
    assert.ok(reserve.includes('git -C "$control_root" '+command),command);
  }

  assert.doesNotMatch(reserve,/(?:^|\n)\s*git (?:fetch origin vibe2-unreal-core|reset --hard origin\/vibe2-unreal-core|fetch origin company-runtime|show origin\/company-runtime:development-queue\.json|diff --quiet -- "\$\{state_paths\[@\]\}"|add "\$\{state_paths\[@\]\}"|commit -m "vibe2: repair state and reserve parallel DAG batch|push origin HEAD:vibe2-unreal-core)/);
});

test('reserve scheduling runs same-lane reserves in parallel and learning still defers before production under runner pressure',()=>{
  const reserve=architecture.neuralWorkGraphTopology?.currentWaveExecution?.reserveConcurrency||{};
  const learning=runtime.continuous?.executionLanes?.LEARNING_IDLE||{};

  assert.equal(reserve.mode,'PARALLEL_RESERVE_OPTIMISTIC_SHARED_QUEUE_WRITE');
  assert.equal(reserve.crossLaneGlobalReserveLock,false);
  assert.equal(reserve.sameLaneReserveSerialization,false);
  assert.equal(reserve.reserveJobsParallel,true);
  assert.equal(reserve.serializationScope,'ATOMIC_SHARED_STATE_WRITE_CRITICAL_SECTION_ONLY');
  assert.equal(reserve.conflictResolution,'FETCH_RESET_REPLAN_RESERVE_PUSH_RETRY_UP_TO_5_ON_ACTUAL_WRITE_CONFLICT');
  assert.equal(reserve.schedulerConcurrencyEpoch,'vibe2-24h-cycle-singleton-v3');
  assert.equal(reserve.gamePrimaryExternalBoundary,256);

  assert.equal(runtime.continuous.schedulerConcurrencyEpoch,'vibe2-24h-cycle-singleton-v3');
  assert.equal(runtime.continuous.reserveConcurrency.mode,'PARALLEL_RESERVE_OPTIMISTIC_SHARED_QUEUE_WRITE');
  assert.equal(runtime.continuous.reserveConcurrency.crossLaneGlobalReserveLock,false);
  assert.equal(runtime.continuous.reserveConcurrency.sameLaneReserveSerialization,false);
  assert.equal(runtime.continuous.reserveConcurrency.reserveJobsParallel,true);
  assert.equal(runtime.continuous.reserveConcurrency.serializationScope,'ATOMIC_SHARED_STATE_WRITE_CRITICAL_SECTION_ONLY');
  assert.equal(runtime.continuous.reserveConcurrency.gamePrimaryExternalBoundary,256);
  assert.equal(learning.liveRunnerPressureGateImplemented,true);
  assert.equal(learning.pressureObservationFailureDefersLearning,true);
  assert.equal(learning.productionMayNotWaitForLearningReserve,true);
  assert.equal(runtime.continuous.auxiliaryLaneFanIn.recoveryFastCausalGameRefillAllowed,true);
  assert.equal(runtime.continuous.atomicNeuronStream.fanInRefillConcurrencyScope,'RUN_SCOPED_PARALLEL_RESERVE');
  assert.equal(runtime.continuous.atomicNeuronStream.globalFanInRefillSingletonForbidden,true);

  const reserveStart=core.indexOf('\n  reserve:\n');
  const reserveOutputs=core.indexOf('    outputs:',reserveStart);
  assert.ok(reserveStart>=0&&reserveOutputs>reserveStart);
  assert.doesNotMatch(core.slice(reserveStart,reserveOutputs),/\n    concurrency:/);
  assert.doesNotMatch(core,/format\('vibe2-control-state-\{0\}', inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.match(core,/format\('vibe2-continuous-\{0\}-\{1\}', github\.run_id, inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.doesNotMatch(core,/format\('vibe2-continuous-\{0\}', github\.run_id\)/);
  assert.doesNotMatch(core,/vibe2-fanin-refill-singleton/);
  assert.doesNotMatch(core,/format\('vibe2-fanin-refill-\{0\}'/);
  assert.doesNotMatch(core,/\|\| 'vibe2-control-state-vibe2-unreal-core'/);
  assert.match(runner,/group: vibe2-24h-cycle-singleton-v3/);
  assert.match(runner,/VIBE2_24H_RUNNER_PRESSURE_OBSERVATION=PASS/);
  assert.match(runner,/VIBE2_24H_RUNNER_PRESSURE_OBSERVATION=FAIL_DEFER_LEARNING/);
  assert.match(runner,/needs\.plan\.outputs\.learning_idle_queued != '0' && needs\.plan\.outputs\.runner_pressure != 'YES'/);
});


test('stale main push wake exits before expensive reserve work without cancelling active game workers',()=>{
  const wake=runtime.continuous.mainPushGamePrimaryWake||{};
  const architectureWake=architecture.neuralWorkGraphTopology?.currentWaveExecution?.mainPushGamePrimaryWake||{};
  const policyWake=roadmap.changeRecord?.mainPushWakeFreshnessGate20260927||{};
  const logMap=JSON.parse(fs.readFileSync('company-learning/company-log-map.json','utf8'));
  const evidence=logMap.mainPushWakeFreshnessEvidence||{};

  assert.equal(wake.freshnessGateBeforeContractPreflight,true);
  assert.equal(wake.staleWakeMayWriteControlState,false);
  assert.equal(wake.staleWakeMayStartGameWorker,false);
  assert.equal(wake.runningOrCompletedGameWorkerCancellation,false);
  assert.equal(architectureWake.freshnessGateBeforeContractPreflight,true);
  assert.equal(architectureWake.staleWakeMayWriteControlState,false);
  assert.equal(architectureWake.staleWakeMayStartGameWorker,false);
  assert.equal(architecture.mainPushWakeFreshnessGate?.staleUnstartedWakeDrain,'.github/workflows/director-supervisor.yml::VIBE2_STALE_UNSTARTED_MAIN_PUSH_GAME_PRIMARY_WAKE');
  assert.equal(architecture.mainPushWakeFreshnessGate?.inProgressWakeCancellationForbidden,true);
  assert.equal(policyWake.staleWakeMayMutateControlState,false);
  assert.equal(policyWake.staleWakeMayStartGameWorker,false);
  assert.equal(policyWake.runningOrCompletedGameWorkerCancellationForbidden,true);
  assert.equal(policyWake.duplicateWakeSignalsCoalesced,true);
  assert.equal(policyWake.concurrencyGroup,'vibe2-main-push-game-primary-wake');
  assert.equal(policyWake.activeWakeCancellationForbidden,true);
  assert.equal(policyWake.staleUnstartedWakeDrain,'.github/workflows/director-supervisor.yml::VIBE2_STALE_UNSTARTED_MAIN_PUSH_GAME_PRIMARY_WAKE');
  assert.equal(policyWake.staleQueuedWakeMayCancel,true);
  assert.equal(policyWake.inProgressWakeCancellationForbidden,true);
  assert.equal(evidence.concurrencyGroup,'vibe2-main-push-game-primary-wake');
  assert.ok(evidence.markers.includes('VIBE2_STALE_UNSTARTED_MAIN_PUSH_GAME_PRIMARY_WAKE'));
  assert.equal(evidence.staleQueuedWakeDrainAllowed,true);
  assert.equal(evidence.inProgressWakeCancellationForbidden,true);
  assert.equal(evidence.onlyNewestPendingMainWakeRetained,true);
  assert.equal(evidence.staleWakeControlStateWriteForbidden,true);
  assert.equal(evidence.staleWakeGameWorkerFanoutForbidden,true);

  assert.match(core,/Drop stale main-push wake before reserve work/);
  assert.match(core,/VIBE2_MAIN_PUSH_WAKE_STALE_DROPPED=/);
  assert.match(core,/gh api "repos\/\$GITHUB_REPOSITORY\/commits\/main" --jq '\.sha'/);
  assert.match(core,/Prepare latest main machine contract\n\s+id: contract\n\s+if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core,/Fast scheduler preflight\n\s+if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core,/Reserve conflict-free DAG batch\n\s+id: batch\n\s+if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core,/vibe2-main-push-game-primary-wake/);
  assert.match(core,/cancel-in-progress: false/);
});
