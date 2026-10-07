import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const coreQa=fs.readFileSync('.github/workflows/vibe2-core-qa.yml','utf8');
const director=fs.readFileSync('.github/workflows/director-supervisor.yml','utf8');
const recoveryFast=fs.readFileSync('.github/workflows/vibe2-recovery-fast.yml','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const queue=JSON.parse(fs.readFileSync('.vibe2/queue.json','utf8'));
const control=JSON.parse(fs.readFileSync('.vibe2/parallelism-control.json','utf8'));

test('Recovery Fast coalesces redundant control wakes without serializing game-primary development',()=>{
  assert.match(recoveryFast,/concurrency:\n  group: vibe2-recovery-fast-control\n  cancel-in-progress: false/);
  assert.match(recoveryFast,/\n  recover:\n    runs-on: ubuntu-slim/);
  assert.match(recoveryFast,/company-recovery-dispatch\.mjs --route=all/);
  assert.match(recoveryFast,/with:\n\s+ref: main/);
  assert.match(recoveryFast,/git fetch --no-tags --depth=1 origin \+refs\/heads\/main:refs\/remotes\/origin\/main \+refs\/heads\/vibe2-unreal-core:refs\/remotes\/origin\/vibe2-unreal-core --quiet/);
  assert.match(recoveryFast,/git worktree add --detach \/tmp\/vibe2-recovery-control origin\/vibe2-unreal-core/);
  assert.doesNotMatch(recoveryFast,/game-primary.*concurrency|F0.*concurrency|F9.*concurrency/i);
  assert.equal(roadmap.fixedAutonomousDevelopmentOperatingContract.repeatDevelopmentConcurrency.fixedSlots,64);
});

test('early fan-in review never suppresses new runnable worker reservations',()=>{
  const start=core.indexOf('early_review_run="$(cat /tmp/vibe2-early-review-run');
  const end=core.indexOf('node /tmp/vibe2-main/tools/vibe2-handoff.mjs --check',start);
  assert.ok(start>=0&&end>start);
  const block=core.slice(start,end);
  assert.match(block,/VIBE2_RESERVE_MODE=BATCH_EARLY_FAN_IN_PARALLEL/);
  assert.match(block,/VIBE2_RESERVE_CONTINUES_DURING_EARLY_FAN_IN=YES/);
  assert.match(block,/vibe2-queue-control\.mjs reserve-batch/);
  assert.doesNotMatch(block,/BATCH_EARLY_FAN_IN_DRAIN/);
  assert.doesNotMatch(block,/matrix:\[\]/);
});

test('repeat development is fixed at 64 while physical provider capacity and conflict safety remain',()=>{
  const wave=roadmap.neuralDevelopmentBrain.currentWaveExecution;
  assert.equal(wave.externalProviderAndPlanningBound,256);
  assert.equal(wave.gamePrimaryFixedInternalCap,64);
  assert.equal(roadmap.fixedAutonomousDevelopmentOperatingContract.repeatDevelopmentConcurrency.fixedSlots,64);
  assert.equal(roadmap.fixedAutonomousDevelopmentOperatingContract.repeatDevelopmentConcurrency.assetDevelopmentSlotsUnchanged,63);
  assert.equal(wave.defaultRequestedParallelism,64);
  assert.equal(wave.gamePrimaryBaselineTarget,64);
  assert.equal(wave.gamePrimaryAdaptiveMinimum,64);
  assert.equal(wave.sourceRootWideLockForbidden,true);
  assert.equal(wave.responsibleFileConflictProtectionStillRequired,true);
  assert.equal(wave.globalActiveWorkerBarrier,false);

  assert.equal(runtime.continuous.maxConcurrentGameTasks,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.baselineTarget,64);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMinActiveWorkers,64);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMaxActiveWorkers,64);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.fixedRepeatDevelopmentSlots,64);
  const prePlan=runtime.continuous.prePlanGamePrimaryRefill||{};
  assert.equal(prePlan.enabled,true);
  assert.equal(prePlan.workerWorkflow,'.github/workflows/vibe2-continuous-core.yml');
  assert.equal(prePlan.dispatchMode,'WORKFLOW_DISPATCH_BEFORE_FULL_PLANNER');
  assert.equal(prePlan.preservesCanonicalReservation,true);
  assert.equal(runtime.adaptiveBackpressure.adaptiveControlRole,'TELEMETRY_AND_SPECULATIVE_SUPPRESSION_ONLY_NO_RESERVATION_AUTHORITY');
  assert.equal(runtime.adaptiveBackpressure.primaryReservationLimit,'FIXED_REPEAT_DEVELOPMENT_64');
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
  assert.equal(architectureWave.gamePrimaryActiveExecutionCap,'FIXED_REPEAT_DEVELOPMENT_64');
  assert.equal(architectureWave.externalSpareBeyond30,'SUPERSEDED; GAME_PRIMARY_REPEAT_DEVELOPMENT_LOGICAL_TARGET_IS_FIXED_64');
  assert.match(architectureWave.adaptiveControl,/FIXED_64/);
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
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '64'"));
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '64'"));
  assert.ok(runner.includes("VIBE2_ASSET_PRIORITY_BURST_MAX: '8'"));
  assert.ok(runner.includes("VIBE2_RUNNER_JOB_PRESSURE_THRESHOLD: '8'"));
  assert.ok(runner.includes('VIBE2_24H_GAME_PRIMARY_RESERVATION_LIMIT_SOURCE=FIXED_REPEAT_DEVELOPMENT_64'));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '64'"));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '64'"));
  assert.match(core,/GAME_PRIMARY_MAIN_PUSH_WAKE/);
  assert.match(core,/push:\n\s*branches:\n\s*- main\n\s*- 'vibe2\/refill\/fanin\/\*\*'/);
  assert.match(core,/github\.event_name == 'push' && github\.ref == 'refs\/heads\/main' && inputs\.execution_lane == '' && 'vibe2-main-push-game-primary-wake'/);
  assert.match(core,/format\('vibe2-continuous-\{0\}-\{1\}', github\.run_id, inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.match(core,/cancel-in-progress: false/);
  const fastDispatch=runner.indexOf('      - name: Dispatch queued GAME_PRIMARY and independent asset work before full planning');
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

test('game-primary control work uses available latest capacity while push/manual reserve remains slim',()=>{
  const pool=runtime.continuous?.gamePrimaryControlRunnerPool||{};
  const architecturePool=architecture.neuralWorkGraphTopology?.currentWaveExecution?.vibeGameControlRunnerPool||{};

  assert.equal(pool.reserve,'ubuntu-slim');
  assert.equal(pool.fanInRefillReserve,'ubuntu-latest');
  assert.equal(pool.fanIn,'ubuntu-latest');
  assert.equal(pool.worker,'ubuntu-latest');
  assert.equal(pool.modelCache,'ubuntu-latest');
  assert.equal(pool.lightweightReserveSeparatedFromArmFanIn,false);
  assert.equal(pool.queueReservationAndStateFanInOnly,true);
  assert.equal(pool.heavyGameExecutionUnchanged,true);

  assert.equal(architecturePool.reserve,'ubuntu-slim');
  assert.equal(architecturePool.fanIn,'ubuntu-latest');
  assert.equal(architecturePool.worker,'ubuntu-latest');
  assert.equal(architecturePool.modelCache,'ubuntu-latest');
  assert.equal(architecturePool.lightweightReserveSeparatedFromArmFanIn,false);
  assert.equal(architecturePool.queueReservationAndStateFanInOnly,true);
  assert.equal(architecturePool.heavyGameExecutionUnchanged,true);
  assert.equal(roadmap.changeRecord?.fanInRefillRunnerPressureBypass20260927?.runnerRouting?.defaultReserve,'ubuntu-slim');
  assert.equal(roadmap.changeRecord?.fanInRefillRunnerPressureBypass20260927?.runnerRouting?.fanInRefillReserve,'ubuntu-latest');
  assert.equal(roadmap.changeRecord?.runnerBackpressureBottleneckRelief20261001?.runnerRouting?.gamePrimaryFanIn,'ubuntu-latest');

  assert.match(core,/\n  reserve:\n(?:    #[^\n]*\n)*    runs-on: \$\{\{ \(github\.event_name == 'repository_dispatch' && \(github\.event\.action == 'vibe2-fanin-refill' \|\| github\.event\.action == 'vibe2-neuron-complete'\) && 'ubuntu-latest' \|\| 'ubuntu-slim'\) \}\}/);
  assert.match(core.slice(core.indexOf('\n  fan_in:'),core.indexOf('\n    steps:',core.indexOf('\n  fan_in:'))),/\n    runs-on: ubuntu-latest/);
  assert.match(core,/\n  model_cache:[\s\S]{0,360}?if: needs\.reserve\.outputs\.worker_count != '0' && needs\.reserve\.outputs\.model_cache_hit != 'true' && \(inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\) != 'asset-development'/);
  assert.match(core,/\n  model_cache:[\s\S]{0,520}?\n    runs-on: \$\{\{ \(inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\) == 'asset-development' && 'ubuntu-24\.04-arm' \|\| 'ubuntu-latest' \}\}/);
  assert.match(core,/Probe dedicated Vibe2 model cache\n\s+id: ollama_model_cache_probe\n\s+if: steps\.batch\.outputs\.worker_count != '0' && env\.VIBE2_EXECUTION_LANE != 'asset-development'/);
  assert.match(core,/Probe canonical Ollama runtime cache\n\s+id: ollama_runtime_cache_probe\n\s+if: steps\.batch\.outputs\.worker_count != '0' && env\.VIBE2_EXECUTION_LANE != 'asset-development'/);
  assert.match(core,/Record asset no-model cache bypass/);
  assert.match(core,/VIBE2_MODEL_CACHE_RESERVE_PROBE=SKIPPED_ASSET_LANE/);
  assert.match(core,/VIBE2_MODEL_CACHE_WARMUP_DECISION=SKIP_ASSET_WORKER_LOCAL_DECISION/);
  assert.match(core,/put\('local_model',selectedModel\)/);
  assert.match(core,/put\('hero_model_requested',heroModelRequested\?'true':'false'\)/);
  assert.match(core,/put\('model_cache_family',modelCacheFamily\)/);
  assert.match(core,/put\('model_cache_key',modelCacheKey\)/);
  assert.match(core,/model: \$\{\{ steps\.order\.outputs\.local_model \}\}/);
  assert.match(core,/VIBE2_LOCAL_MODEL: \$\{\{ steps\.order\.outputs\.local_model \}\}/);
  assert.match(core,/VIBE2_HERO_ASSET_MODEL_ACTIVE=\$\{\{ steps\.order\.outputs\.hero_model_requested \}\}/);
  assert.match(core,/put\('dcc_recipe_count',dccRecipes\.length\)/);
  assert.match(core,/Prepare declared native DCC authoring runtime/);
  assert.match(core,/Execute declared native DCC authoring verification/);
  assert.match(core,/executeDeclaredNativeDccAuthoringVerification/);
  assert.match(core,/VIBE2_NATIVE_DCC_AUTHORING_STATUS=/);
  assert.match(core,/VIBE2_DCC_AUTHORING_EVIDENCE_FILE: \/tmp\/vibe2-dcc-authoring-evidence\.json/);
  assert.match(core,/Restore and persist selected Vibe2 model cache[\s\S]{0,260}?uses: actions\/cache@v4[\s\S]{0,260}?key: \$\{\{ steps\.order\.outputs\.model_cache_family \}\}-\$\{\{ runner\.os \}\}-\$\{\{ runner\.arch \}\}-\$\{\{ steps\.order\.outputs\.model_cache_key \}\}/);
  assert.match(core,/key: vibe2-ollama-v5-\$\{\{ runner\.os \}\}-\$\{\{ runner\.arch \}\}-qwen3-1\.7b/);
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

  assert.doesNotMatch(director,/\n      - Vibe2 Continuous Core\n/);
  assert.equal(fallback.vibe2CoreCompletionWakeDisabled,true);
  assert.equal(fallback.completionWakeSource,'DIRECTOR_SCHEDULE_AND_NON_VIBE_CORE_EVENTS');
  assert.equal(architectureFallback.vibe2CoreCompletionWakeDisabled,true);
  assert.equal(policyFallback.vibe2CoreCompletionWakeDisabled,true);
  assert.equal(policyFallback.workflowRunWakeSource,'REMOVED_VIBE2_CONTINUOUS_CORE_COMPLETION');
  assert.match(director,/DIRECTOR_GAME_PRIMARY_FALLBACK_WAKE=DISPATCHED/);
  assert.match(director,/DIRECTOR_GAME_PRIMARY_FALLBACK_WAKE=SKIPPED_ACTIVE_CORE/);
  assert.match(director,/actions\/workflows\/vibe2-continuous-core\.yml\/dispatches/);
  assert.match(director,/-f 'inputs\[execution_lane\]=game-primary'/);
  assert.equal(fallback.laneMax,64);
  assert.match(director,/-f 'inputs\[lane_max\]=64'/);
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
    'diff --quiet -- "${state_paths[@]}"',
    'add "${state_paths[@]}"',
    'commit -m "vibe2: repair state and reserve parallel DAG batch [skip ci]"',
    'push origin HEAD:vibe2-unreal-core'
  ]){
    assert.ok(reserve.includes('git -C "$control_root" '+command),command);
  }

  assert.doesNotMatch(reserve,/(?:^|\n)\s*git (?:fetch origin vibe2-unreal-core|reset --hard origin\/vibe2-unreal-core|fetch origin company-runtime|show origin\/company-runtime:development-queue\.json|diff --quiet -- "\$\{state_paths\[@\]\}"|add "\$\{state_paths\[@\]\}"|commit -m "vibe2: repair state and reserve parallel DAG batch|push origin HEAD:vibe2-unreal-core)/);
  assert.match(reserve,/company_runtime_snapshot_sha=''/);
  assert.match(reserve,/if \[ "\$state_attempt" -eq 1 \] \|\| \[ ! -s \/tmp\/vibe2-company-runtime-queue\.json \]; then/);
  assert.ok(reserve.includes('company_runtime_snapshot_sha="$(git -C "$control_root" rev-parse origin/company-runtime)"'));
  assert.ok(reserve.includes('git -C "$control_root" show "$company_runtime_snapshot_sha:development-queue.json" > /tmp/vibe2-company-runtime-queue.json'));
  assert.match(reserve,/VIBE2_RESERVE_RUNTIME_SNAPSHOT=PINNED_FIRST_ATTEMPT/);
  assert.match(reserve,/VIBE2_RESERVE_RUNTIME_SNAPSHOT=REUSED_RETRY/);
  const snapshotBranch=reserve.indexOf('if [ "$state_attempt" -eq 1 ] || [ ! -s /tmp/vibe2-company-runtime-queue.json ]; then');
  const planner=reserve.indexOf('node /tmp/vibe2-main/tools/vibe2-auto-planner.mjs');
  assert.ok(snapshotBranch>=0&&planner>snapshotBranch);
});

test('24H pre-plan priority dispatch block stays valid Bash',()=>{
  const stepStart=runner.indexOf('      - name: Dispatch queued GAME_PRIMARY and independent asset work before full planning');
  const stepEnd=runner.indexOf('\n      - name: Plan from latest main and persist control queue',stepStart);
  assert.ok(stepStart>=0&&stepEnd>stepStart);
  const step=runner.slice(stepStart,stepEnd);
  const runMarker='        run: |\n';
  const runAt=step.indexOf(runMarker);
  assert.ok(runAt>=0);
  const shell=step.slice(runAt+runMarker.length)
    .split('\n')
    .map(line=>line.startsWith('          ')?line.slice(10):line)
    .join('\n')
    .replace(/\$\{\{[^\n]*?\}\}/g,'CI_EXPR');
  assert.doesNotThrow(()=>execFileSync('bash',['-n'],{input:shell,encoding:'utf8',stdio:['pipe','pipe','pipe']}));
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
  assert.equal(reserve.schedulerConcurrencyEpoch,'vibe2-24h-cycle-run-scoped-v10');
  assert.equal(reserve.gamePrimaryExternalBoundary,256);

  assert.equal(runtime.continuous.schedulerConcurrencyEpoch,'vibe2-24h-cycle-run-scoped-v10');
  assert.equal(runtime.continuous.reserveConcurrency.mode,'PARALLEL_RESERVE_OPTIMISTIC_SHARED_QUEUE_WRITE');
  assert.equal(runtime.continuous.reserveConcurrency.crossLaneGlobalReserveLock,false);
  assert.equal(runtime.continuous.reserveConcurrency.sameLaneReserveSerialization,false);
  assert.equal(runtime.continuous.reserveConcurrency.sharedQueueWriteRetryAttempts,null);
  assert.equal(runtime.continuous.reserveConcurrency.sharedQueueWriteRetryPolicy,'UNBOUNDED_WITH_CAPPED_BACKOFF');
  assert.equal(runtime.continuous.reserveConcurrency.reserveJobsParallel,true);
  assert.equal(runtime.continuous.reserveConcurrency.serializationScope,'ATOMIC_SHARED_STATE_WRITE_CRITICAL_SECTION_ONLY');
  assert.equal(runtime.continuous.reserveConcurrency.gamePrimaryExternalBoundary,256);
  assert.equal(learning.liveRunnerPressureGateImplemented,true);
  assert.equal(learning.minimumActiveWorkersUnderPressure,0);
  assert.equal(learning.pressureObservationFailureDefersLearning,true);
  assert.equal(learning.productionMayNotWaitForLearningReserve,true);
  assert.equal(runtime.continuous.auxiliaryLaneFanIn.recoveryFastCausalGameRefillAllowed,true);
  assert.equal(runtime.continuous.auxiliaryLaneFanIn.recoveryFastCausalGameRefillPressureGuardRequired,true);
  assert.equal(runtime.continuous.auxiliaryLaneFanIn.recoveryFastCausalGameRefillQueuePressureThreshold,4);
  assert.equal(runtime.continuous.atomicNeuronStream.fanInRefillConcurrencyScope,'LANE_SCOPED_STATELESS_WAKE_COALESCING');
  assert.equal(runtime.continuous.atomicNeuronStream.globalFanInRefillSingletonForbidden,true);
  assert.equal(runtime.continuous.atomicNeuronStream.pressureCoalescingIndependentFreeSlotRefillPreserved,false);
  assert.equal(runtime.continuous.callbackCoalescing.capacityRefillMayProceedWhileResultCoalesced,false);
  assert.equal(runtime.continuous.callbackCoalescing.pressureCapacityRefill.maxSignalsPerWave,0);
  assert.match(core,/VIBE2_PRESSURE_REFILL_DISPATCH=SKIPPED_DEFER_TO_COHORT_FANIN/);
  assert.match(core,/VIBE2_ATOMIC_NEURON_COMPLETION_DISPATCH=COALESCED_TO_COHORT_FANIN/);
  assert.doesNotMatch(core,/robloxLeaderTaskId|runner-pressure-wave-leader-free-slot-refill|VIBE2_ASSET_NEURON_PRESSURE_BYPASS/);
  assert.match(core,/VIBE2_CONTROL_OPTIMISTIC_RETRY_POLICY=UNBOUNDED/);
  assert.match(core,/VIBE2_CONTROL_OPTIMISTIC_RETRY_BACKOFF_SECONDS=/);
  assert.match(core,/VIBE2_CONTROL_OPTIMISTIC_RETRY_FAST_PATH=ELIGIBLE_NO_GLOBAL_QUEUE_MUTATION/);
  assert.match(core,/VIBE2_CONTROL_OPTIMISTIC_RETRY_GLOBAL_REPLAN=SKIPPED_NO_GLOBAL_QUEUE_MUTATION/);
  assert.match(core,/VIBE2_CONTROL_OPTIMISTIC_RETRY_QUEUE_AUTHORITY=LATEST_CANONICAL_VIBE_QUEUE/);
  assert.doesNotMatch(core,/for state_attempt in 1 2 3 4 5/);
  assert.doesNotMatch(core,/VIBE2_CONTROL_OPTIMISTIC_ATTEMPT=\$state_attempt\/5/);
  assert.doesNotMatch(core,/VIBE2_ASSET_NEURON_PRESSURE_BYPASS=IMMEDIATE_MICRO_FANIN/);
  assert.doesNotMatch(core,/VIBE2_ASSET_ATOMIC_CALLBACK_PRESSURE_BYPASS=YES/);
  assert.match(core,/VIBE2_ASSET_ATOMIC_CALLBACK_PRESSURE_GUARD=ENABLED/);
  assert.match(core,/if \[ "\$\{queue_pressure:-0\}" -gt 0 \]; then/);
  assert.match(core,/execution_lane:String\(process\.env\.VIBE2_EXECUTION_LANE\|\|'game-primary'\)/);
  assert.match(core,/VIBE2_COMPLETED_RESERVATION_RUN_OBSERVATION=PASS/);
  assert.match(core,/VIBE2_COMPLETED_RESERVATION_RUN_OBSERVATION=PARTIAL_FAIL_OPEN/);
  assert.match(core,/recover-completed-reservations/);
  assert.match(core,/VIBE2_COMPLETED_RESERVATION_RUN_MATCHES=/);
  assert.match(core,/actions\/runs\/\$\{reservation_run_id\}/);
  assert.match(core,/VIBE2_COMPLETED_RESERVATION_RUN_CANDIDATES=/);
  assert.match(core,/VIBE2_RESERVE_PROBE_PARALLELISM=\$probe_parallelism/);
  assert.match(core,/probe_parallelism=16/);

  const reserveStart=core.indexOf('\n  reserve:\n');
  const reserveOutputs=core.indexOf('    outputs:',reserveStart);
  assert.ok(reserveStart>=0&&reserveOutputs>reserveStart);
  const reserveHeader=core.slice(reserveStart,reserveOutputs);
  assert.doesNotMatch(reserveHeader,/vibe2-refill-reserve-/);
  assert.doesNotMatch(reserveHeader,/format\('vibe2-reserve-\{0\}', github\.run_id\)/);
  assert.doesNotMatch(reserveHeader,/\n    concurrency:/);
  assert.equal(reserve.statelessRefillCoalescing,'LANE_SCOPED_ONE_RUNNING_ONE_PENDING');
  assert.equal(runtime.continuous.reserveConcurrency.statelessRefillCoalescing,'LANE_SCOPED_ONE_RUNNING_ONE_PENDING');
  assert.equal(reserve.statelessRefillCoalescingScope,'VIBE2_FANIN_REFILL_ONLY');
  assert.equal(runtime.continuous.reserveConcurrency.statelessRefillCoalescingScope,'VIBE2_FANIN_REFILL_ONLY');
  const workerHeader=core.slice(core.indexOf('\n  worker:'),core.indexOf('\n    steps:',core.indexOf('\n  worker:')));
  assert.ok(workerHeader.length>0);
  assert.doesNotMatch(workerHeader,/\n    concurrency:/);
  assert.doesNotMatch(core,/format\('vibe2-control-state-\{0\}', inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.match(core,/format\('vibe2-continuous-\{0\}-\{1\}', github\.run_id, inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.doesNotMatch(core,/format\('vibe2-continuous-\{0\}', github\.run_id\)/);
  assert.doesNotMatch(core,/vibe2-fanin-refill-singleton/);
  assert.match(core,/github\.event_name == 'repository_dispatch' && github\.event\.action == 'vibe2-fanin-refill' && format\('vibe2-fanin-refill-\{0\}', inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.doesNotMatch(core,/\|\| 'vibe2-control-state-vibe2-unreal-core'/);
  assert.match(runner,/group: vibe2-24h-cycle-\$\{\{ github\.run_id \}\}/);
  assert.match(runner,/'tools\/vibe2-queue-control\.mjs'/);
  assert.match(runner,/VIBE2_24H_RUNNER_PRESSURE_OBSERVATION=PASS/);
  assert.match(runner,/VIBE2_24H_RUNNER_PRESSURE_OBSERVATION=FAIL_DEFER_LEARNING/);
  assert.match(runner,/VIBE2_24H_RUNNER_JOB_QUEUE_PRESSURE=/);
  assert.match(runner,/VIBE2_24H_RUNNER_JOB_PRESSURE_THRESHOLD=/);
  assert.match(runner,/actions\/runs\/\$run_id\/jobs\?per_page=100/);
  assert.match(runner,/VIBE2_PREPLAN_PRIORITY_LANE=ASSET_DEVELOPMENT/);
  assert.match(runner,/VIBE2_PREPLAN_ASSET_DEVELOPMENT_DISPATCH=DISPATCHED/);
  assert.match(runner,/needs\.plan\.outputs\.learning_idle_queued != '0'/);
});


test('stale main push wake rebases to latest main before expensive reserve work without cancelling active game workers',()=>{
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
  const reserveStart=core.indexOf('\n  reserve:');
  const staleWakeStep=core.indexOf('- name: Drop stale reserve wake before reserve work',reserveStart);
  const reserveCheckout=core.indexOf('- name: Checkout Vibe2 control line',reserveStart);
  const reserveNodeSetup=core.indexOf('- uses: actions/setup-node@v4',reserveStart);
  assert.ok(reserveStart>=0&&staleWakeStep>reserveStart&&reserveCheckout>staleWakeStep&&reserveNodeSetup>reserveCheckout);
  assert.match(core.slice(reserveCheckout,reserveNodeSetup),/if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core.slice(reserveNodeSetup,core.indexOf('\n      - name:',reserveNodeSetup)),/if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core,/VIBE2_MAIN_PUSH_WAKE_REBASED_TO_LATEST=/);
  assert.match(core,/VIBE2_FANIN_WAKE_STALE_DROPPED=/);
  assert.match(core,/VIBE2_RESERVE_WAKE_FRESHNESS=NEURON_CALLBACK_ALWAYS_INGEST/);
  assert.match(core,/gh api "repos\/\$GITHUB_REPOSITORY\/commits\/main" --jq '\.sha'/);
  assert.match(core,/Prepare latest main machine contract\n\s+id: contract\n\s+if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core,/Fast scheduler preflight\n\s+id: preflight\n\s+if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core,/Reserve conflict-free DAG batch\n\s+id: batch\n\s+if: steps\.main_wake\.outputs\.proceed == 'true'/);
  assert.match(core,/vibe2-main-push-game-primary-wake/);
  assert.match(core,/cancel-in-progress: false/);
  assert.match(director,/\.github\/workflows\/vibe2-continuous-core\.yml/);
  assert.match(director,/vibe2-runtime\.json/);
  assert.match(director,/company-learning\/company-architecture-map\.json/);
  assert.match(director,/VIBE2_STALE_UNSTARTED_FANIN_REFILL/);
});


test('24h runner keeps asset lane independent from generic repository runner pressure',()=>{
  assert.equal(roadmap.assetProductionParallelContract?.parallelism?.assetDevelopmentRunnerCapacityIndependentFromGamePrimary,true);
  assert.equal(roadmap.assetProductionParallelContract?.parallelism?.assetDevelopmentPhysicalRunnerPoolSeparated,true);
  assert.match(runner,/asset_development_active/);
  assert.match(runner,/asset_development_queued/);
  assert.match(runner,/asset_development_refill_ready/);
  assert.match(runner,/VIBE2_24H_ASSET_RESERVATION_PROBE=PASS/);
  assert.match(runner,/VIBE2_24H_ASSET_RECLAIMABLE_RUNS=/);
  assert.match(runner,/const reclaimableAssetRuns=new Set/);
  assert.match(runner,/const activeAssetRows=tasks\.filter/);
  assert.match(runner,/VIBE2_ASSET_DEVELOPMENT_RECLAIMABLE_RESERVATIONS=/);
  assert.match(runner,/activeAssetRows\.filter\(t=>!reclaimableAssetRuns\.has\(String\(t\.reservationRunId\|\|''\)\.trim\(\)\)\)\.length/);
  const assetStart=runner.indexOf('\n  asset_development:\n');
  const assetEnd=runner.indexOf('\n  learning_idle:',assetStart);
  assert.ok(assetStart>=0&&assetEnd>assetStart);
  const assetBlock=runner.slice(assetStart,assetEnd);
  assert.doesNotMatch(assetBlock,/runner_pressure/);
  assert.match(assetBlock,/needs\.plan\.outputs\.asset_development_refill_ready == 'YES' && \(needs\.plan\.outputs\.asset_development_queued != '0' \|\| needs\.plan\.outputs\.asset_development_active != '0'\)/);
  assert.match(assetBlock,/execution_lane: asset-development/);
  assert.match(assetBlock,/lane_max: '63'/);
  assert.equal(roadmap.assetProductionParallelContract?.parallelism?.assetDevelopmentLaneMax,63);
  const qualityFirst=roadmap.assetProductionParallelContract?.parallelism?.qualityFirstDevelopment||{};
  assert.equal(qualityFirst.concurrentSlots,63);
  assert.equal(qualityFirst.qualityBeforeVolume,true);
  assert.equal(qualityFirst.sameFileParallelForbidden,true);
  assert.equal(qualityFirst.actualRuntimeAndBeforeAfterRequiredForQualityPass,true);
  assert.doesNotMatch(core,/VIBE2_ASSET_FIXED_RUNNER_SLOTS/);
  const workerStart=core.indexOf('\n  worker:\n');
  const workerEnd=core.indexOf('\n  fan_in:',workerStart);
  assert.ok(workerStart>=0&&workerEnd>workerStart);
  const workerBlock=core.slice(workerStart,workerEnd);
  assert(workerBlock.includes("max-parallel: ${{ (inputs.execution_lane || github.event.client_payload.execution_lane || 'game-primary') == 'asset-development' && 63 || 256 }}"));
  assert(workerBlock.includes('VIBE2_ASSET_QUALITY_WORK_BUDGET_MINUTES=60'));
  assert(workerBlock.includes('VIBE2_ASSET_PARALLEL_EXECUTION_MAX=63'));
  assert(workerBlock.includes('VIBE2_ASSET_PARALLEL_EXECUTION_MODE=DISTINCT_SAFE_TASKS_UP_TO_LANE_MAX'));
  assert.match(core,/Event-driven fan-in refill fallback/);
  assert.match(core,/VIBE2_EVENT_DRIVEN_REFILL=FANIN_REPOSITORY_DISPATCH/);
});

test('Core QA skips duplicate heavy suites only for dedicated parallelism workflow-only changes',()=>{
  const scopeStart=coreQa.indexOf('\n  scope:\n');
  const scopeEnd=coreQa.indexOf('\n  test:\n',scopeStart);
  assert.ok(scopeStart>=0&&scopeEnd>scopeStart);
  const scopeBlock=coreQa.slice(scopeStart,scopeEnd);
  assert.match(scopeBlock,/Resolve impact-scoped Core QA work/);
  assert.match(scopeBlock,/VIBE2_CORE_QA_PARALLELISM_ONLY=/);
  assert.match(scopeBlock,/vibe2-\(continuous-core\|24h-runner\|parallelism-contract-qa\)/);
  assert.match(scopeBlock,/qa\/vibe2-parallelism-\(main\|20\)-contract/);
  assert.doesNotMatch(scopeBlock,/vibe2-core-qa\.yml/);
  assert.match(scopeBlock,/grep -Eq '\^0\+\$'/);
  assert.equal((coreQa.match(/\n  test:\n/g)||[]).length,1);
  assert.equal((coreQa.match(/\n  browser-smoke:\n/g)||[]).length,1);
  assert.equal((coreQa.match(/\n  practice-runtime:\n/g)||[]).length,1);
  assert.match(coreQa,/\n  test:\n    needs: scope\n    if: \$\{\{ needs\.scope\.outputs\.parallelism_only != 'YES' \}\}/);
  assert.match(coreQa,/\n  browser-smoke:\n    needs: scope\n    if: \$\{\{ needs\.scope\.outputs\.parallelism_only != 'YES' \}\}/);
  assert.match(coreQa,/\n  practice-runtime:\n    needs: scope\n    if: \$\{\{ needs\.scope\.outputs\.parallelism_only != 'YES' \}\}/);
});

test('24h runner does not treat many workflow runs as runner saturation when queued jobs are zero',()=>{
  const stateStart=runner.indexOf('      - name: Read queue continuation state');
  const stateEnd=runner.indexOf('\n      - name: Recover reviewed winners stranded before release dispatch',stateStart);
  assert.ok(stateStart>=0&&stateEnd>stateStart);
  const stateBlock=runner.slice(stateStart,stateEnd);
  assert.match(stateBlock,/if \[ "\$job_pressure_count" -eq 0 \]; then\n\s+runner_pressure='NO'/);
  assert.match(stateBlock,/VIBE2_24H_RUNNER_ZERO_JOB_PRESSURE_BYPASS=YES/);
  assert.match(stateBlock,/elif \[ "\$pressure_count" -lt "\$pressure_threshold" \] && \[ "\$job_pressure_count" -lt "\$job_pressure_threshold" \]; then/);
  assert.match(stateBlock,/VIBE2_24H_RUNNER_JOB_QUEUE_PRESSURE=/);
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

test('24H pre-plan production dispatch observes runner pressure without suppressing production lanes',()=>{
  const stepStart=runner.indexOf('      - name: Dispatch queued GAME_PRIMARY and independent asset work before full planning');
  const stepEnd=runner.indexOf('\n      - name: Plan from latest main and persist control queue',stepStart);
  assert.ok(stepStart>=0&&stepEnd>stepStart);
  const step=runner.slice(stepStart,stepEnd);
  assert.doesNotMatch(step,/VIBE2_PREPLAN_PRODUCTION_PRESSURE_GATE=DEFERRED_TO_FIVE_MINUTE_SAFETY_NET/);
  assert.match(step,/VIBE2_PREPLAN_PRODUCTION_PRESSURE_OBSERVATION=QUEUE_ALLOWED/);
  assert.match(step,/VIBE2_PREPLAN_PRODUCTION_PRESSURE_OBSERVATION=BELOW_THRESHOLD/);
  assert.match(step,/VIBE2_PREPLAN_PRODUCTION_PRESSURE_OBSERVATION=UNAVAILABLE_FAIL_OPEN/);
  assert.match(step,/VIBE2_PREPLAN_ASSET_DEVELOPMENT_DISPATCH=DISPATCHED/);
  assert.match(step,/VIBE2_PREPLAN_GAME_PRIMARY_DISPATCH=DISPATCHED/);
  assert.match(step,/VIBE2_ASSET_PRIORITY_BURST_MAX/);
});
