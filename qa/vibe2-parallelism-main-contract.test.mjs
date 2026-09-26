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
  const architectureWave=architecture.neuralWorkGraphTopology.currentWaveExecution;
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
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '256'"));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '30'"));
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

test('reserve scheduling isolates execution lanes and learning defers before production under runner pressure',()=>{
  const reserve=architecture.neuralWorkGraphTopology?.currentWaveExecution?.reserveConcurrency||{};
  const learning=runtime.continuous?.executionLanes?.LEARNING_IDLE||{};

  assert.equal(reserve.mode,'LANE_ISOLATED_OPTIMISTIC_SHARED_QUEUE_WRITE');
  assert.equal(reserve.crossLaneGlobalReserveLock,false);
  assert.equal(reserve.sameLaneReserveSerialization,true);
  assert.equal(reserve.conflictResolution,'FETCH_RESET_REPLAN_RESERVE_PUSH_RETRY_UP_TO_5');
  assert.equal(reserve.schedulerConcurrencyEpoch,'vibe2-24h-cycle-singleton-v4');
  assert.equal(reserve.gamePrimaryExternalBoundary,256);

  assert.equal(runtime.continuous.schedulerConcurrencyEpoch,'vibe2-24h-cycle-singleton-v4');
  assert.equal(runtime.continuous.reserveConcurrency.crossLaneGlobalReserveLock,false);
  assert.equal(runtime.continuous.reserveConcurrency.gamePrimaryExternalBoundary,256);
  assert.equal(learning.liveRunnerPressureGateImplemented,true);
  assert.equal(learning.pressureObservationFailureDefersLearning,true);
  assert.equal(learning.productionMayNotWaitForLearningReserve,true);

  assert.match(core,/format\('vibe2-control-state-\{0\}', inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.match(core,/format\('vibe2-continuous-\{0\}-\{1\}', github\.run_id, inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.doesNotMatch(core,/format\('vibe2-continuous-\{0\}', github\.run_id\)/);
  assert.match(core,/vibe2-fanin-refill-singleton/);
  assert.doesNotMatch(core,/\|\| 'vibe2-control-state-vibe2-unreal-core'/);
  assert.match(runner,/group: vibe2-24h-cycle-singleton-v4/);
  const planBlock=runner.slice(runner.indexOf('  plan:\n'),runner.indexOf('\n  recovery_fast:',runner.indexOf('  plan:\n')));
  const refillBlock=runner.slice(runner.indexOf('  refill:\n'));
  const reserveBlock=core.slice(core.indexOf('  reserve:\n'),core.indexOf('\n  model_cache:',core.indexOf('  reserve:\n')));
  const fanInBlock=core.slice(core.indexOf('  fan_in:\n'));
  assert.match(planBlock,/runs-on: ubuntu-slim/);
  assert.match(refillBlock,/runs-on: ubuntu-slim/);
  assert.match(reserveBlock,/runs-on: ubuntu-slim/);
  assert.match(fanInBlock,/runs-on: ubuntu-slim/);
  assert.match(runner,/VIBE2_24H_RUNNER_PRESSURE_OBSERVATION=PASS/);
  assert.match(runner,/VIBE2_24H_RUNNER_PRESSURE_OBSERVATION=FAIL_DEFER_LEARNING/);
  assert.match(runner,/needs\.plan\.outputs\.learning_idle_queued != '0' && needs\.plan\.outputs\.runner_pressure != 'YES'/);
});
