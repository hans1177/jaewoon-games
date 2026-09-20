// 파일명: qa/vibe2-parallelism-main-contract.test.mjs
// 역할: Vibe2 GAME_PRIMARY가 고정 내부 cap 없이 baseline/pressure floor 20에서 자율 확장하고 모든 진입 경로가 같은 control/telemetry 분모를 따르는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));

test('PARALLELISM_CONTRACT_GATE keeps GAME_PRIMARY internally unbounded and binds telemetry to the actual external-capacity wave',()=>{
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.humanDocumentRequired,false);
  const wave=roadmap.neuralDevelopmentBrain.currentWaveExecution;
  assert.equal(wave.externalProviderAndPlanningBound,256);
  assert.deepEqual(wave.gamePrimaryAdaptiveSteps,[20,32,64,128,256]);
  assert.equal(wave.gamePrimaryBaselineTarget,20);
  assert.equal(wave.gamePrimaryAdaptiveMinimum,20);
  assert.equal(wave.gamePrimaryExternalBoundary,256);
  assert.equal(wave.adaptiveBackpressureMayLowerBelow20,false);
  assert.equal(wave.adaptiveBackpressureMayRaiseGamePrimaryAbove20,true);
  assert.equal(wave.globalActiveWorkerBarrier,false);

  assert.equal(runtime.continuous.maxConcurrentGameTasks,256);
  assert.equal(runtime.continuous.externalMatrixBatchMax,256);
  assert.equal(runtime.continuous.maxConcurrentGameTasksMeaning,'EXTERNAL_PROVIDER_AND_PLANNING_BOUND; GAME_PRIMARY_HAS_NO_FIXED_INTERNAL_CAP; BASELINE_AND_PRESSURE_FLOOR_20; VERIFIED_HEALTHY_TELEMETRY_SELF_EXPANDS');
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.baselineTarget,20);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMinActiveWorkers,20);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMaxActiveWorkers,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.maxActiveWorkers,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.capacityAwareFreeSlotRefill,true);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.reserveOnlyAfterFanIn,false);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.singleActiveWorkerWave,false);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.adaptiveBaselineTarget,20);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.adaptiveMinActiveWorkers,20);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.adaptiveMaxActiveWorkers,256);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.maxActiveWorkers,256);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.fanInOnlyRefill,false);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.capacityAwareFreeSlotRefill,true);
  assert.equal(runtime.continuous.planningBacklog.activeWaveBlocksReserveNotPlanning,false);
  assert.equal(runtime.continuous.planningBacklog.activeWorkAllowsIndependentFreeSlotReserve,true);
  assert.equal(runtime.continuous.refillBatchPolicy,'REFILL_AVAILABLE_GAME_PRIMARY_SLOTS_AFTER_ATOMIC_TASK_MICRO_FANIN');

  assert.equal(runtime.continuous.dynamicBackpressure,true);
  assert.deepEqual(runtime.adaptiveBackpressure.steps,[4,8,16,20,32,64,128,256]);
  assert.equal(runtime.adaptiveBackpressure.minimumAdaptiveWave,20);
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
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '20'"));
  assert.ok(runner.includes("lane_max: '256'"));
  assert.ok(!runner.includes("lane_max: '20'"));
  assert.ok(runner.includes('const controlTarget=Math.max(adaptiveMin,Number(control.currentMax||baselineTarget));'));
  assert.ok(runner.includes('const effectiveMax=Math.max(adaptiveMin,Math.min(configuredMax,controlTarget));'));
  assert.ok(runner.includes("const gameRefillReady=freeWorkerSlots>0?'YES':'NO'"));

  assert.ok(core.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '20'"));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '20'"));
  assert.ok(core.includes('VIBE2_RESERVE_MODE=FREE_SLOT_REFILL_DURING_ACTIVE_WORK'));
  assert.ok(core.includes('vibe2-queue-control.mjs reserve-batch'));
  assert.ok(core.includes('fallback_effective="$VIBE2_GAME_PRIMARY_BASELINE_TARGET"'));
  assert.equal(wave.gamePrimaryFixedInternalCap,null);
  assert.equal(wave.telemetryDenominator,'CURRENT_ATOMIC_RESERVATION_CAP');
  assert.equal(wave.mode,'ATOMIC_NEURON_STREAM');
  assert.equal(wave.fixedWaveBarrier,false);
  assert.equal(runtime.continuous.executionTopology,'ATOMIC_NEURON_STREAM');
  assert.equal(runtime.continuous.atomicNeuronStream.fixedWaveBarrier,false);
  assert.ok(!core.includes('VIBE2_RESERVE_GUARD=ACTIVE_WAVE_PRESENT'));

  assert.deepEqual(runtime.documentation.humanDocuments,[]);
  assert.equal(runtime.documentation.humanDocumentLimit,0);
  assert.equal(runtime.documentation.machineSourceOfTruth,'vibe2-runtime.json');
});
