// 파일명: qa/vibe2-parallelism-main-contract.test.mjs
// 역할: Vibe2 중앙 machine contract의 정책상 무제한 병렬과 외부 실행 웨이브 최대 256·adaptive backpressure·충돌 보호 규칙을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));

test('PARALLELISM_CONTRACT_GATE uses policy-unbounded external-capacity waves',()=>{
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.humanDocumentRequired,false);
  assert(runtime.version>=12);
  assert.equal(runtime.continuous.maxConcurrentGameTasks,256);
  assert.equal(runtime.continuous.dynamicBackpressure,true);
  assert.equal(runtime.continuous.parallelismPolicy,'UNBOUNDED_BY_POLICY_EXTERNAL_CAPACITY_ONLY');
  assert.equal(runtime.continuous.externalMatrixBatchMax,256);
  assert.equal(runtime.continuous.maxFreeAiWorkers,null);
  assert.equal(runtime.continuous.maxConcurrentGameTasksMeaning,'EXTERNAL_PROVIDER_WAVE_BOUND_NOT_INTERNAL_POLICY_CAP');
  assert.deepEqual(runtime.adaptiveBackpressure.steps,[256,128,64,32,16,8,4]);
  assert.equal(runtime.adaptiveBackpressure.policyConcurrencyLimit,null);
  assert.equal(runtime.adaptiveBackpressure.externalBatchMax,256);
  assert.equal(runtime.adaptiveBackpressure.missingStateFallbackMax,256);
  assert.equal(runtime.adaptiveBackpressure.corruptStateFallbackMax,256);
  assert.equal(runtime.coordination.separateFileLocks,true);
  assert.equal(runtime.coordination.sameFileParallelWrite,false);
  assert.equal(runtime.coordination.stateWritesSerialized,true);
  assert.equal(runtime.coordination.sourceRootExclusive,true);
  assert.equal(runtime.safety.queueSourceRootLeaseRequired,true);
  assert.equal(runtime.workPackages.sameFileParallelWrite,false);
  assert.equal(runtime.workPackages.maxPackagesPerCycle,256);
  assert.equal(runtime.workPackages.capacityPolicy,'UNBOUNDED_BY_POLICY_FILL_EXTERNAL_PROVIDER_CAPACITY_IN_IMMEDIATE_WAVES');
  assert.equal(runtime.parallelismTelemetry.requestedMax,256);
  assert.equal(runtime.parallelismTelemetry.loadProbeTargetWorkers,256);
  assert.deepEqual(runtime.parallelismTelemetry.backpressureSteps,[256,128,64,32,16,8,4]);
  assert.equal(runtime.parallelismTelemetry.policyConcurrencyLimit,null);
  assert.ok(runner.includes("VIBE2_MAX_CONCURRENT_GAME_TASKS: '256'"));
  assert.ok(runner.includes("VIBE2_EXTERNAL_MATRIX_BATCH_MAX: '256'"));
  assert.ok(runner.includes('const maxConcurrentTasks = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 256;'));
  assert.ok(runner.includes("needs.plan.outputs.continue_required != 'YES'"),'P5 game study must yield while production work remains');
  assert.deepEqual(runtime.documentation.humanDocuments,[]);
  assert.equal(runtime.documentation.humanDocumentLimit,0);
  assert.equal(runtime.documentation.machineSourceOfTruth,'vibe2-runtime.json');
});
