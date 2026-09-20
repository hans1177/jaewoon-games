// 파일명: qa/vibe2-parallelism-main-contract.test.mjs
// 역할: Vibe2 중앙 machine contract가 최대 30 슬롯·adaptive backpressure·충돌 보호 규칙으로 일치하는지 검증한다.

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

  assert.equal(runtime.continuous.maxConcurrentGameTasks,30);
  assert.equal(runtime.continuous.dynamicBackpressure,true);
  assert.deepEqual(runtime.adaptiveBackpressure.steps,[30,24,20,16,12,8,4]);
  assert.equal(runtime.coordination.separateFileLocks,true);
  assert.equal(runtime.coordination.sameFileParallelWrite,false);
  assert.equal(runtime.coordination.stateWritesSerialized,true);
  assert.equal(runtime.coordination.sourceRootExclusive,true);
  assert.equal(runtime.safety.queueSourceRootLeaseRequired,true);
  assert.equal(runtime.workPackages.sameFileParallelWrite,false);
  assert.equal(runtime.workPackages.maxPackagesPerCycle,30);
  assert.equal(runtime.workPackages.capacityPolicy,'FILL_AVAILABLE_INDEPENDENT_PRODUCTION_SLOTS_UP_TO_GLOBAL_30');
  assert.equal(runtime.parallelismTelemetry.requestedMax,30);
  assert.deepEqual(runtime.parallelismTelemetry.backpressureSteps,[30,24,20,16,12,8,4]);

  assert.ok(runner.includes("VIBE2_MAX_CONCURRENT_GAME_TASKS: '30'"));
  assert.ok(runner.includes('Math.min(30, Number(process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS) || 30)'));
  assert.ok(runner.includes("needs.plan.outputs.continue_required != 'YES'"),'P5 game study must yield while production work remains');

  assert.deepEqual(runtime.documentation.humanDocuments,[]);
  assert.equal(runtime.documentation.humanDocumentLimit,0);
  assert.equal(runtime.documentation.machineSourceOfTruth,'vibe2-runtime.json');
});

test('24H game-primary refill does not wait for every active worker to finish',()=>{
  const continuous=runner.slice(runner.indexOf('  continuous:'),runner.indexOf('  learning_idle:'));
  const learning=runner.slice(runner.indexOf('  learning_idle:'),runner.indexOf('  game_study:'));
  const study=runner.slice(runner.indexOf('  game_study:'),runner.indexOf('  refill:'));
  const refill=runner.slice(runner.indexOf('  refill:'));

  assert.match(continuous,/continue_required == 'YES'/);
  assert.match(continuous,/game_primary_queued != '0'/);
  assert.doesNotMatch(continuous,/wave_ready/,'independent production refill must not wait for a global zero-worker barrier');

  assert.match(learning,/wave_ready == 'YES'/,'idle learning stays behind the zero-active-game safety barrier');
  assert.match(study,/wave_ready == 'YES'/,'game study stays behind the zero-active-game safety barrier');

  assert.match(refill,/needs\.continuous\.result == 'success'/);
  assert.doesNotMatch(refill,/wave_ready/,'next production cycle may refill while unrelated workers remain active');
});
