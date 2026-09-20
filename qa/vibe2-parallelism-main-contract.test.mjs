// 파일명: qa/vibe2-parallelism-main-contract.test.mjs
// 역할: Vibe2 중앙 병렬 실행 계약이 외부 256 상한과 GAME_PRIMARY 20-slot 실행 cap을 구분하고,
//       남은 안전 슬롯을 즉시 refill하며 source/file 충돌 보호를 유지하는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));

test('PARALLELISM_CONTRACT_GATE separates provider capacity from GAME_PRIMARY execution cap',()=>{
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.humanDocumentRequired,false);
  assert.equal(roadmap.neuralDevelopmentBrain.currentWaveExecution.externalProviderAndPlanningBound,256);
  assert.equal(roadmap.neuralDevelopmentBrain.currentWaveExecution.gamePrimaryActiveExecutionCap,20);
  assert.equal(roadmap.neuralDevelopmentBrain.currentWaveExecution.globalActiveWorkerBarrier,false);
  assert.equal(roadmap.neuralDevelopmentBrain.currentWaveExecution.adaptiveBackpressureMayNotRaiseGamePrimaryAbove20,true);

  assert.equal(runtime.continuous.maxConcurrentGameTasks,256);
  assert.equal(runtime.continuous.externalMatrixBatchMax,256);
  assert.equal(runtime.continuous.maxConcurrentGameTasksMeaning,'EXTERNAL_PROVIDER_AND_PLANNING_BOUND; GAME_PRIMARY_ACTIVE_EXECUTION_CAP_IS_20');
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.maxActiveWorkers,20);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.ownerTarget,20);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.capacityAwareFreeSlotRefill,true);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.reserveOnlyAfterFanIn,false);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.singleActiveWorkerWave,false);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.maxActiveWorkers,20);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.fanInOnlyRefill,false);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.capacityAwareFreeSlotRefill,true);
  assert.equal(runtime.continuous.planningBacklog.activeWaveBlocksReserveNotPlanning,false);
  assert.equal(runtime.continuous.planningBacklog.activeWorkAllowsIndependentFreeSlotReserve,true);
  assert.equal(runtime.continuous.refillBatchPolicy,'REFILL_AVAILABLE_GAME_PRIMARY_SLOTS_UP_TO_ACTIVE_CAP_20');

  assert.equal(runtime.continuous.dynamicBackpressure,true);
  assert.deepEqual(runtime.adaptiveBackpressure.steps,[256,128,64,32,20,16,8,4]);
  assert.equal(runtime.adaptiveBackpressure.ownerMinimumWave,20);
  assert.equal(runtime.coordination.separateFileLocks,true);
  assert.equal(runtime.coordination.sameFileParallelWrite,false);
  assert.equal(runtime.coordination.stateWritesSerialized,true);
  assert.equal(runtime.coordination.sourceRootExclusive,true);
  assert.equal(runtime.safety.queueSourceRootLeaseRequired,true);
  assert.equal(runtime.workPackages.sameFileParallelWrite,false);
  assert.equal(runtime.workPackages.maxPackagesPerCycle,256);
  assert.equal(runtime.workPackages.capacityPolicy,'UNBOUNDED_BY_POLICY_FILL_EXTERNAL_PROVIDER_CAPACITY_IN_IMMEDIATE_WAVES');
  assert.equal(runtime.parallelismTelemetry.requestedMax,256);
  assert.deepEqual(runtime.parallelismTelemetry.backpressureSteps,[256,128,64,32,20,16,8,4]);

  assert.ok(runner.includes("VIBE2_MAX_CONCURRENT_GAME_TASKS: '256'"));
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_ACTIVE_MAX: '20'"));
  assert.ok(runner.includes("lane_max: '20'"));
  assert.ok(runner.includes("const effectiveMax=Math.min(activeWaveMax,externalEffectiveMax)"));
  assert.ok(runner.includes("const gameRefillReady=freeWorkerSlots>0?'YES':'NO'"));
  assert.ok(runner.includes("needs.plan.outputs.game_refill_ready == 'YES' && needs.plan.outputs.game_primary_queued != '0'"));

  assert.ok(core.includes('VIBE2_RESERVE_MODE=FREE_SLOT_REFILL_DURING_ACTIVE_WORK'));
  assert.ok(core.includes('vibe2-queue-control.mjs reserve-batch'));
  assert.ok(!core.includes('VIBE2_RESERVE_GUARD=ACTIVE_WAVE_PRESENT'));
  assert.ok(!core.includes("guard:'ACTIVE_LANE_RESERVATION_PRESENT'"));

  assert.deepEqual(runtime.documentation.humanDocuments,[]);
  assert.equal(runtime.documentation.humanDocumentLimit,0);
  assert.equal(runtime.documentation.machineSourceOfTruth,'vibe2-runtime.json');
});
