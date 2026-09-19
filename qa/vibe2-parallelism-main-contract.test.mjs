// 파일명: qa/vibe2-parallelism-main-contract.test.mjs
// 역할: Vibe2 중앙 machine contract의 persistent queue max=256, adaptive wave와 owner minimum wave=20 분리를 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));

test('PARALLELISM_CONTRACT_GATE uses machine-readable authority only',()=>{
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.humanDocumentRequired,false);

  assert.equal(runtime.continuous.maxConcurrentGameTasks,256);
  assert.equal(runtime.continuous.externalMatrixBatchMax,256);
  assert.equal(runtime.continuous.dynamicBackpressure,true);
  assert.equal(runtime.continuous.refillMode,'fan-in-repository-dispatch-with-hourly-safety-net');
  assert.equal(runtime.continuous.perWorkerSlotRefillEnabled,false);
  assert.equal(runtime.continuous.refillBatchPolicy,'COMPLETE_CURRENT_20_WAVE_THEN_FAN_IN_THEN_REFILL');
  assert.deepEqual(runtime.adaptiveBackpressure.steps,[256,128,64,32,20,16,8,4]);
  assert.equal(runtime.adaptiveBackpressure.ownerMinimumWave,20);
  assert.equal(runtime.adaptiveBackpressure.externalBatchMax,256);
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
  assert.ok(runner.includes("VIBE2_EXTERNAL_MATRIX_BATCH_MAX: '256'"));
  assert.ok(runner.includes('const maxConcurrentTasks = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 256;'));
  assert.ok(runner.includes("needs.plan.outputs.continue_required != 'YES'"),'P5 game study must yield while production work remains');

  assert.deepEqual(runtime.documentation.humanDocuments,[]);
  assert.equal(runtime.documentation.humanDocumentLimit,0);
  assert.equal(runtime.documentation.machineSourceOfTruth,'vibe2-runtime.json');
});
