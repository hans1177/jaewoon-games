// 파일명: qa/vibe2-parallelism-main-contract.test.mjs
// 역할: Vibe2 GAME_PRIMARY가 20 고정 cap 없이 4~256 범위를 텔레메트리로 자기조절하고 모든 진입 경로가 같은 control을 따르는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));

test('PARALLELISM_CONTRACT_GATE keeps 256 external capacity while GAME_PRIMARY self-adapts around baseline 20',()=>{
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.humanDocumentRequired,false);
  const wave=roadmap.neuralDevelopmentBrain.currentWaveExecution;
  assert.equal(wave.externalProviderAndPlanningBound,256);
  assert.deepEqual(wave.gamePrimaryAdaptiveSteps,[4,8,16,20,32,64,128,256]);
  assert.equal(wave.gamePrimaryBaselineTarget,20);
  assert.equal(wave.gamePrimaryAdaptiveMinimum,4);
  assert.equal(wave.gamePrimaryExternalBoundary,256);
  assert.equal(wave.adaptiveBackpressureMayLowerBelow20,true);
  assert.equal(wave.adaptiveBackpressureMayRaiseGamePrimaryAbove20,true);
  assert.equal(wave.globalActiveWorkerBarrier,false);

  assert.equal(runtime.continuous.maxConcurrentGameTasks,256);
  assert.equal(runtime.continuous.externalMatrixBatchMax,256);
  assert.equal(runtime.continuous.maxConcurrentGameTasksMeaning,'EXTERNAL_PROVIDER_AND_PLANNING_BOUND; GAME_PRIMARY_ACTIVE_EXECUTION_SELF_ADAPTS_4_TO_256_WITH_BASELINE_20');
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.baselineTarget,20);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMinActiveWorkers,4);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMaxActiveWorkers,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.maxActiveWorkers,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.capacityAwareFreeSlotRefill,true);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.reserveOnlyAfterFanIn,false);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.singleActiveWorkerWave,false);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.adaptiveBaselineTarget,20);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.adaptiveMinActiveWorkers,4);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.adaptiveMaxActiveWorkers,256);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.maxActiveWorkers,256);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.fanInOnlyRefill,false);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.capacityAwareFreeSlotRefill,true);
  assert.equal(runtime.continuous.planningBacklog.activeWaveBlocksReserveNotPlanning,false);
  assert.equal(runtime.continuous.planningBacklog.activeWorkAllowsIndependentFreeSlotReserve,true);
  assert.equal(runtime.continuous.refillBatchPolicy,'REFILL_AVAILABLE_GAME_PRIMARY_SLOTS_UP_TO_CURRENT_ADAPTIVE_TARGET');

  assert.equal(runtime.continuous.dynamicBackpressure,true);
  assert.deepEqual(runtime.adaptiveBackpressure.steps,[4,8,16,20,32,64,128,256]);
  assert.equal(runtime.adaptiveBackpressure.minimumAdaptiveWave,4);
  assert.equal(runtime.adaptiveBackpressure.baselineAdaptiveWave,20);
  assert.equal(runtime.adaptiveBackpressure.externalBatchMax,256);
  assert.equal(runtime.adaptiveBackpressure.staleTelemetryResetTarget,20);
  assert.equal(runtime.adaptiveBackpressure.staleTelemetryResetsToMax,false);
  assert.equal(runtime.coordination.separateFileLocks,true);
  assert.equal(runtime.coordination.sameFileParallelWrite,false);
  assert.equal(runtime.coordination.stateWritesSerialized,true);
  assert.equal(runtime.coordination.sourceRootExclusive,true);
  assert.equal(runtime.safety.queueSourceRootLeaseRequired,true);
  assert.equal(runtime.workPackages.sameFileParallelWrite,false);
  assert.equal(runtime.workPackages.maxPackagesPerCycle,256);
  assert.equal(runtime.parallelismTelemetry.requestedMax,256);
  assert.deepEqual(runtime.parallelismTelemetry.backpressureSteps,[4,8,16,20,32,64,128,256]);

  assert.ok(runner.includes("VIBE2_MAX_CONCURRENT_GAME_TASKS: '256'"));
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '20'"));
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '4'"));
  assert.ok(runner.includes("lane_max: '256'"));
  assert.ok(!runner.includes("lane_max: '20'"));
  assert.ok(runner.includes('const controlTarget=Math.max(adaptiveMin,Number(control.currentMax||baselineTarget));'));
  assert.ok(runner.includes('const effectiveMax=Math.max(adaptiveMin,Math.min(configuredMax,controlTarget));'));
  assert.ok(runner.includes("const gameRefillReady=freeWorkerSlots>0?'YES':'NO'"));

  assert.ok(core.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '20'"));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '4'"));
  assert.ok(core.includes('VIBE2_RESERVE_MODE=FREE_SLOT_REFILL_DURING_ACTIVE_WORK'));
  assert.ok(core.includes('vibe2-queue-control.mjs reserve-batch'));
  assert.ok(core.includes('fallback_effective="$VIBE2_GAME_PRIMARY_BASELINE_TARGET"'));
  assert.ok(!core.includes('VIBE2_RESERVE_GUARD=ACTIVE_WAVE_PRESENT'));

  assert.deepEqual(runtime.documentation.humanDocuments,[]);
  assert.equal(runtime.documentation.humanDocumentLimit,0);
  assert.equal(runtime.documentation.machineSourceOfTruth,'vibe2-runtime.json');
});
