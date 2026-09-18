// 파일명: qa/vibe2-parallelism-main-contract.test.mjs
// 역할: Vibe2 중앙 machine contract가 최대 20 슬롯·adaptive backpressure·충돌 보호 규칙으로 일치하는지 검증한다.

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

  assert.equal(runtime.continuous.maxConcurrentGameTasks,20);
  assert.equal(runtime.continuous.dynamicBackpressure,true);
  assert.deepEqual(runtime.adaptiveBackpressure.steps,[20,16,12,8,4]);
  assert.equal(runtime.coordination.separateFileLocks,true);
  assert.equal(runtime.coordination.sameFileParallelWrite,false);
  assert.equal(runtime.coordination.stateWritesSerialized,true);
  assert.equal(runtime.coordination.sourceRootExclusive,true);
  assert.equal(runtime.safety.queueSourceRootLeaseRequired,true);
  assert.equal(runtime.workPackages.sameFileParallelWrite,false);
  assert.equal(runtime.parallelismTelemetry.requestedMax,20);
  assert.deepEqual(runtime.parallelismTelemetry.backpressureSteps,[20,16,12,8,4]);

  assert.ok(runner.includes("VIBE2_MAX_CONCURRENT_GAME_TASKS: '20'"));
  assert.ok(runner.includes('Math.min(20, Number(process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS) || 20)'));

  assert.deepEqual(runtime.documentation.humanDocuments,[]);
  assert.equal(runtime.documentation.humanDocumentLimit,0);
  assert.equal(runtime.documentation.machineSourceOfTruth,'vibe2-runtime.json');
});
