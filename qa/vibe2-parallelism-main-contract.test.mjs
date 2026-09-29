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
  assert.equal(mainPushWake.directMainPushOnly,true);
  assert.equal(mainPushWake.explicitExecutionLaneBypassesMainPushSingleton,true);
  assert.equal(mainPushWake.workflowCallLaneRunsRunScoped,true);
  assert.equal(mainPushWake.workflowCallInheritedPushEventMustNotCoalesce,true);
  assert.equal(mainPushWake.activeWakeCancellationForbidden,true);
  const architectureMainPushWake=architectureWave.mainPushGamePrimaryWake||{};
  assert.equal(architectureMainPushWake.enabled,true);
  assert.equal(architectureMainPushWake.singletonPlannerCompletionRequired,false);
  assert.equal(architectureMainPushWake.usesExistingCanonicalReserve,true);
  assert.equal(architectureMainPushWake.duplicateWakeSignalsCoalesced,true);
  assert.equal(architectureMainPushWake.directMainPushOnly,true);
  assert.equal(architectureMainPushWake.explicitExecutionLaneBypassesMainPushSingleton,true);
  assert.equal(architectureMainPushWake.workflowCallLaneRunsRunScoped,true);
  assert.equal(architectureMainPushWake.workflowCallInheritedPushEventMustNotCoalesce,true);
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
  assert.match(core,/github\.event_name == 'push' && github\.ref == 'refs\/heads\/main' && inputs\.execution_lane == '' && 'vibe2-main-push-game-primary-wake'/);
  assert.match(core,/format\('vibe2-continuous-\{0\}-\{1\}', github\.run_id, inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.match(core,/cancel-in-progress: false/);
  const fastDispatch=runner.indexOf('      - name: Dispatch queued GAME_PRIMARY work before full planning');
  const fullPlan=runner.indexOf('      - name: Plan from latest main and persist control queue');
  assert.ok(fastDispatch>=0&&fullPlan>fastDispatch);
  assert.match(runner,/actions\/workflows\/vibe2-continuous-core\.yml\/dispatches/);
  assert.match(runner,/VIBE2_PREPLAN_GAME_PRIMARY_DISPATCH=DISPATCHED/);
  assert.match(runner,/VIBE2_PREPLAN_GAME_PRIMARY_DISPATCH=FAILED_FALLBACK_POST_PLAN/);
  const regressionPreflight=runtime.continuous?.reserveContractRegressionPreflight||{};
  const architectureRegressionPreflight=architecture.neuralWorkGraphTopology?.currentWaveExecution?.reserveContractRegressionPreflight||{};
  assert.equal(regressionPreflight.enabled,true);
  assert.equal(regressionPreflight.executionLane,'GAME_PRIMARY');
  assert.equal(regressionPreflight.exactContractShaRequired,true);
  assert.equal(regressionPreflight.reuseSuccessfulCoreQaForExactSha,true);
  assert.equal(regressionPreflight.blocksReservationOnFailure,true);
  assert.equal(architectureRegressionPreflight.contractIdentity,'EXACT_RESERVE_MAIN_SHA');
  assert.equal(architectureRegressionPreflight.failureAction,'BLOCK_RESERVATION_BEFORE_GAME_WORKERS');
  assert.match(core,/VIBE2_RESERVE_CONTRACT_REGRESSION_SOURCE=EXACT_SHA_CORE_QA_REUSE/);
  assert.match(core,/VIBE2_RESERVE_CONTRACT_REGRESSION_SOURCE=LOCAL_SAME_FAN_IN_SUITE/);
  assert.match(core,/VIBE2_RESERVE_CONTRACT_REGRESSION=PASS/);
});

test('lightweight reserve uses slim while fan-in stays on ARM and heavy execution stays on ubuntu-latest',()=>{
  const pool=runtime.continuous?.gamePrimaryControlRunnerPool||{};
  const architecturePool=architecture.neuralWorkGraphTopology?.currentWaveExecution?.vibeGameControlRunnerPool||{};

  assert.equal(pool.reserve,'ubuntu-slim');
  assert.equal(pool.fanIn,'ubuntu-24.04-arm');
  assert.equal(pool.worker,'ubuntu-latest');
  assert.equal(pool.modelCache,'ubuntu-latest');
  assert.equal(pool.lightweightReserveSeparatedFromArmFanIn,true);
  assert.equal(pool.queueReservationAndStateFanInOnly,true);
  assert.equal(pool.heavyGameExecutionUnchanged,true);

  assert.equal(architecturePool.reserve,'ubuntu-slim');
  assert.equal(architecturePool.fanIn,'ubuntu-24.04-arm');
  assert.equal(architecturePool.worker,'ubuntu-latest');
  assert.equal(architecturePool.modelCache,'ubuntu-latest');
  assert.equal(architecturePool.lightweightReserveSeparatedFromArmFanIn,true);
  assert.equal(architecturePool.queueReservationAndStateFanInOnly,true);
  assert.equal(architecturePool.heavyGameExecutionUnchanged,true);
  assert.equal(roadmap.changeRecord?.fanInRefillRunnerPressureBypass20260927?.runnerRouting?.defaultReserve,'ubuntu-slim');
  assert.equal(roadmap.changeRecord?.fanInRefillRunnerPressureBypass20260927?.runnerRouting?.fanInRefillReserve,'ubuntu-24.04-arm');

  assert.match(core,/\n  reserve:\n(?:    #[^\n]*\n)*    runs-on: \$\{\{ \(github\.event_name == 'repository_dispatch' && github\.event\.action == 'vibe2-fanin-refill' && 'ubuntu-24\.04-arm' \|\| 'ubuntu-slim'\) \}\}/);
  assert.match(core,/\n  fan_in:[\s\S]{0,260}?\n    runs-on: ubuntu-24\.04-arm/);
  assert.match(core,/\n  model_cache:[\s\S]{0,360}?if: needs\.reserve\.outputs\.worker_count != '0' && needs\.reserve\.outputs\.model_cache_hit != 'true' && \(inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\) != 'asset-development'/);
  assert.match(core,/\n  model_cache:[\s\S]{0,520}?\n    runs-on: \$\{\{ \(inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\) == 'asset-development' && 'ubuntu-24\.04-arm' \|\| 'ubuntu-latest' \}\}/);
  assert.match(core,/Probe shared Ollama cache from reserve runner[\s\S]{0,180}?env\.VIBE2_EXECUTION_LANE != 'asset-development'/);
  assert.match(core,/Record asset no-model cache bypass/);
  assert.match(core,/VIBE2_MODEL_CACHE_RESERVE_PROBE=SKIPPED_ASSET_LANE/);
  assert.match(core,/VIBE2_MODEL_CACHE_WARMUP_DECISION=SKIP_ASSET_WORKER_LOCAL_DECISION/);
  assert.match(core,/\n  worker:[\s\S]{0,520}?matrix\.target == 'roblox'[\s\S]{0,220}?'ubuntu-latest'[\s\S]{0,220}?'ubuntu-24\.04-arm'/);
  assert.equal(roadmap.assetProductionParallelContract?.parallelism?.assetDevelopmentRunnerLabel,'ubuntu-24.04-arm');
  assert.equal(roadmap.assetProductionParallelContract?.parallelism?.assetDevelopmentSchedulerPlanRunner,'ubuntu-24.04-arm');
  assert.equal(roadmap.assetProductionParallelContract?.parallelism?.assetDevelopmentReserveRunner,'ubuntu-slim');
  assert.equal(runtime.continuous?.assetDevelopmentControlRunnerPool?.reserve,'ubuntu-slim');
  assert.equal(roadmap.assetProductionParallelContract?.parallelism?.assetDevelopmentModelCacheRunner,'ubuntu-24.04-arm');
  assert.equal(roadmap.assetProductionParallelContract?.parallelism?.assetDevelopmentArchitectureAwareCache,true);
  assert.equal(roadmap.assetProductionParallelContract?.parallelism?.gamePrimaryRunnerLabel,'ubuntu-latest');
});

test('director fallback wake reuses the canonical game-primary core without creating work',()=>{
  const fallback=runtime.continuous?.directorGamePrimaryFallbackWake||{};
  const architectureFallback=architecture.neuralWorkGraphTopology?.currentWaveExecution?.directorGamePrimaryFallbackWake||{};
  const policyFallback=roadmap.changeRecord?.directorGamePrimaryFallbackWake20260927||{};

  assert.equal(fallback.enabled,true);
  assert.equal(fallback.dispatchTarget,'.github/workflows/vibe2-continuous-core.yml');
  assert.equal(fallback.executionLane,'GAME_PRIMARY');
  assert.equal(fallback.existingQueuedTasksOnly,true);
  assert.equal(fallback.newSchedulerCreated,false);
  assert.equal(fallback.newQueueCreated,false);
  assert.equal(fallback.canonicalReservePathPreserved,true);
  assert.equal(fallback.activeNonPushCoreSuppressesFallbackDispatch,true);

  assert.equal(architectureFallback.enabled,true);
  assert.equal(architectureFallback.dispatchTarget,'.github/workflows/vibe2-continuous-core.yml');
  assert.equal(architectureFallback.existingQueuedTasksOnly,true);
  assert.equal(architectureFallback.newSchedulerCreated,false);
  assert.equal(architectureFallback.newQueueCreated,false);
  assert.equal(architectureFallback.canonicalReservePathPreserved,true);

  assert.equal(policyFallback.existingQueuedTaskDispatchOnly,true);
  assert.equal(policyFallback.newSchedulerCreated,false);
  assert.equal(policyFallback.newQueueCreated,false);
  assert.equal(policyFallback.newTaskCreated,false);
  assert.equal(policyFallback.canonicalReservePathPreserved,true);
  assert.equal(policyFallback.mainPushWakePolicyUnchanged,true);
  assert.equal(policyFallback.responsibleFileConflictProtectionPreserved,true);

  assert.match(director,/\n      - Vibe2 Continuous Core\n    types: \[completed\]/);
  assert.match(director,/DIRECTOR_GAME_PRIMARY_FALLBACK_WAKE=DISPATCHED/);
  assert.match(director,/DIRECTOR_GAME_PRIMARY_FALLBACK_WAKE=SKIPPED_ACTIVE_CORE/);
  assert.match(director,/actions\/workflows\/vibe2-continuous-core\.yml\/dispatches/);
  assert.match(director,/-f 'inputs\[execution_lane\]=game-primary'/);
  assert.match(director,/-f 'inputs\[lane_max\]=256'/);
  assert.match(director,/\(\$run\.event \/\/ ""\) != "push"/);
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
  assert.equal(reserve.conflictResolution,'FETCH_RESET_REPLAN_RESERVE_PUSH_RETRY_UNBOUNDED_WITH_CAPPED_BACKOFF_ON_ACTUAL_WRITE_CONFLICT');
  assert.equal(reserve.schedulerConcurrencyEpoch,'vibe2-24h-cycle-singleton-v9');
  assert.equal(reserve.gamePrimaryExternalBoundary,256);

  assert.equal(runtime.continuous.schedulerConcurrencyEpoch,'vibe2-24h-cycle-singleton-v9');
  assert.equal(runtime.continuous.reserveConcurrency.mode,'PARALLEL_RESERVE_OPTIMISTIC_SHARED_QUEUE_WRITE');
  assert.equal(runtime.continuous.reserveConcurrency.crossLaneGlobalReserveLock,false);
  assert.equal(runtime.continuous.reserveConcurrency.sameLaneReserveSerialization,false);
  assert.equal(runtime.continuous.reserveConcurrency.sharedQueueWriteRetryAttempts,null);
  assert.equal(runtime.continuous.reserveConcurrency.sharedQueueWriteRetryPolicy,'UNBOUNDED_WITH_CAPPED_BACKOFF');
  assert.equal(runtime.continuous.reserveConcurrency.reserveJobsParallel,true);
  assert.equal(runtime.continuous.reserveConcurrency.serializationScope,'ATOMIC_SHARED_STATE_WRITE_CRITICAL_SECTION_ONLY');
  assert.equal(runtime.continuous.reserveConcurrency.gamePrimaryExternalBoundary,256);
  assert.equal(learning.liveRunnerPressureGateImplemented,true);
  assert.equal(learning.pressureObservationFailureDefersLearning,true);
  assert.equal(learning.productionMayNotWaitForLearningReserve,true);
  assert.equal(runtime.continuous.auxiliaryLaneFanIn.recoveryFastCausalGameRefillAllowed,true);
  assert.equal(runtime.continuous.atomicNeuronStream.fanInRefillConcurrencyScope,'RUN_SCOPED_PARALLEL_RESERVE');
  assert.equal(runtime.continuous.atomicNeuronStream.globalFanInRefillSingletonForbidden,true);
  assert.equal(runtime.continuous.atomicNeuronStream.pressureCoalescingIndependentFreeSlotRefillPreserved,true);
  assert.equal(runtime.continuous.callbackCoalescing.capacityRefillMayProceedWhileResultCoalesced,true);
  assert.equal(runtime.continuous.callbackCoalescing.pressureCapacityRefill.maxSignalsPerWave,1);
  assert.match(core,/VIBE2_PRESSURE_REFILL_DISPATCH=WAVE_LEADER_EXISTING_FANIN_REFILL/);
  assert.match(core,/const robloxLeaderTaskId=pressureRefillEligible/);
  assert.match(core,/row\.target==='roblox'&&Number\(row\.speculativeVariants\|\|1\)===1/);
  assert.match(core,/VIBE2_NEURON_TARGET: \$\{\{ matrix\.target \}\}/);
  assert.match(core,/VIBE2_GAME_PRESSURE_MICRO_FANIN=EVERY_COMPLETE_SINGLE_TASK/);
  assert.match(core,/\[ "\$game_micro_fanin" != 'true' \]/);

  assert.match(core,/runner-pressure-wave-leader-free-slot-refill/);
  assert.match(core,/VIBE2_CONTROL_OPTIMISTIC_RETRY_POLICY=UNBOUNDED/);
  assert.match(core,/VIBE2_CONTROL_OPTIMISTIC_RETRY_BACKOFF_SECONDS=/);
  assert.doesNotMatch(core,/for state_attempt in 1 2 3 4 5/);
  assert.doesNotMatch(core,/VIBE2_CONTROL_OPTIMISTIC_ATTEMPT=\$state_attempt\/5/);
  assert.match(core,/VIBE2_ASSET_NEURON_PRESSURE_BYPASS=IMMEDIATE_MICRO_FANIN/);
  assert.match(core,/\[ "\$VIBE2_EXECUTION_LANE" != 'asset-development' \]/);
  assert.match(core,/execution_lane:String\(process\.env\.VIBE2_EXECUTION_LANE\|\|'game-primary'\)/);
  assert.match(core,/VIBE2_COMPLETED_RESERVATION_RUN_OBSERVATION=PASS/);
  assert.match(core,/VIBE2_COMPLETED_RESERVATION_RUN_OBSERVATION=PARTIAL_FAIL_OPEN/);
  assert.match(core,/recover-completed-reservations/);
  assert.match(core,/VIBE2_COMPLETED_RESERVATION_RUN_MATCHES=/);
  assert.match(core,/actions\/runs\/\$\{reservation_run_id\}/);
  assert.match(core,/VIBE2_COMPLETED_RESERVATION_RUN_CANDIDATES=/);

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
  assert.match(runner,/group: vibe2-24h-cycle-singleton-v9/);
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

  assert.match(core,/Drop stale reserve wake before reserve work/);
  assert.match(core,/VIBE2_MAIN_PUSH_WAKE_STALE_DROPPED=/);
  assert.match(core,/VIBE2_FANIN_WAKE_STALE_DROPPED=/);
  assert.match(core,/VIBE2_RESERVE_WAKE_FRESHNESS=NEURON_CALLBACK_ALWAYS_INGEST/);
  assert.match(core,/gh api "repos\/\$GITHUB_REPOSITORY\/commits\/main" --jq '\.sha'/);
  assert.match(core,/Prepare latest main machine contract\n\s+id: contract\n\s+if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core,/Fast scheduler preflight\n\s+if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core,/Reserve conflict-free DAG batch\n\s+id: batch\n\s+if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core,/vibe2-main-push-game-primary-wake/);
  assert.match(core,/cancel-in-progress: false/);
});


test('24h runner wakes asset lane when active reservations need recovery even with no queued asset task',()=>{
  assert.match(runner,/asset_development_active/);
  assert.match(runner,/asset_development_queued/);
  assert.match(runner,/asset_development_refill_ready/);
  assert.match(runner,/needs\.plan\.outputs\.asset_development_refill_ready == 'YES' && \(needs\.plan\.outputs\.asset_development_queued != '0' \|\| needs\.plan\.outputs\.asset_development_active != '0'\)/);
});

test('failed worker releases its exact lock after immutable upload while PASS holds until fan-in',()=>{
  const upload=core.indexOf('- name: Upload worker result for fan-in');
  const release=core.indexOf('- name: Release failed worker Work Lock after immutable result upload');
  const callback=core.indexOf('- name: Dispatch or coalesce atomic neuron completion');
  assert.ok(upload>=0&&release>upload&&callback>release);
  const block=core.slice(release,callback);
  assert.match(block,/steps\.worker_result_upload\.outcome == 'success'/);
  assert.match(block,/row\.workLock\?\.id/);
  assert.match(block,/result_fields\[0\].*PASS/);
  assert.match(block,/HELD_FOR_FAN_IN/);
  assert.match(block,/vibe2-remote-work-lock\.mjs" release --worker=vibe2 --id="\$lock_id"/);
  assert.match(core,/VIBE_REMOTE_WORK_LOCK_REASON=lock-not-found/);
});
