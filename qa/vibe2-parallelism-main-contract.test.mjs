import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const queue=JSON.parse(fs.readFileSync('.vibe2/queue.json','utf8'));
const control=JSON.parse(fs.readFileSync('.vibe2/parallelism-control.json','utf8'));

test('maximum parallelism is default and source-root locks are permanently disabled',()=>{
  const wave=roadmap.neuralDevelopmentBrain.currentWaveExecution;
  assert.equal(wave.externalProviderAndPlanningBound,256);
  assert.equal(wave.defaultRequestedParallelism,256);
  assert.equal(wave.gamePrimaryBaselineTarget,256);
  assert.equal(wave.gamePrimaryAdaptiveMinimum,4);
  assert.equal(wave.sourceRootWideLockForbidden,true);
  assert.equal(wave.responsibleFileConflictProtectionStillRequired,true);
  assert.equal(wave.globalActiveWorkerBarrier,false);

  assert.equal(runtime.continuous.maxConcurrentGameTasks,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.baselineTarget,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMinActiveWorkers,4);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMaxActiveWorkers,256);
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
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '4'"));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '256'"));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '4'"));
});

test('reserve scheduling is lane-isolated and stale scheduler concurrency uses the current epoch',()=>{
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const reserve=architecture.neuralWorkGraphTopology?.currentWaveExecution?.reserveConcurrency||{};
  const bottleneck=roadmap.developmentLifecycleMachine?.selfRecoveryAndBottleneckRelief?.bottleneckPolicy||{};

  assert.equal(bottleneck.laneSpecificBackpressurePreferred,true);
  assert.equal(bottleneck.globalCollapseForSingleLaneFailureForbidden,true);
  assert.equal(reserve.mode,'LANE_ISOLATED_OPTIMISTIC_SHARED_QUEUE_WRITE');
  assert.equal(reserve.crossLaneGlobalReserveLock,false);
  assert.equal(reserve.sameLaneReserveSerialization,true);
  assert.equal(reserve.conflictResolution,'FETCH_RESET_REPLAN_RESERVE_PUSH_RETRY_UP_TO_5');
  assert.equal(reserve.schedulerConcurrencyEpoch,'vibe2-24h-cycle-singleton-v2');

  assert.match(core,/format\('vibe2-control-state-\{0\}', inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
  assert.doesNotMatch(core,/['"]vibe2-control-state-vibe2-unreal-core['"]/);
  assert.match(core,/for state_attempt in 1 2 3 4 5/);
  assert.match(core,/git fetch origin vibe2-unreal-core --quiet/);
  assert.match(core,/git reset --hard origin\/vibe2-unreal-core/);
  assert.match(core,/git push origin HEAD:vibe2-unreal-core/);

  assert.match(runner,/group: vibe2-24h-cycle-singleton-v2/);
  assert.doesNotMatch(runner,/group: vibe2-24h-cycle-singleton\n/);
});

