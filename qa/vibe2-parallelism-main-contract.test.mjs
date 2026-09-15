// 파일명: qa/vibe2-parallelism-main-contract.test.mjs
// 역할: main의 병렬 작업 정책과 Vibe2 중앙 machine contract가 최대 20 슬롯·adaptive backpressure·충돌 보호 규칙으로 일치하는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const doc=fs.readFileSync('VIBE2.md','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));

test('PARALLELISM_CONTRACT_GATE keeps main policy and Vibe2 machine contract unified at 20',()=>{
  for(const token of [
    'concurrentGameWipTarget: 20',
    'concurrentGameWipMax: 20',
    'webValidationParallelismTarget: 20',
    'webValidationParallelismMax: 20',
    'adaptiveBackpressureSteps: [20, 16, 12, 8, 4]',
    'sameSourceRootParallelAllowedWhenResponsibleFilesExplicitAndDisjoint: true',
    'sameResponsibleFileParallelForbidden: true',
    'sharedSaveSchemaWritesExclusive: true',
    'centralPolicyWritesExclusive: true',
    'parallelismContractGateRequired: true'
  ]) assert.ok(flow.includes(token),token);

  assert.equal(runtime.continuous.maxConcurrentGameTasks,20);
  assert.deepEqual(runtime.adaptiveBackpressure.steps,[20,16,12,8,4]);
  assert.equal(runtime.coordination.separateFileLocks,true);
  assert.equal(runtime.coordination.sameFileParallelWrite,false);
  assert.equal(runtime.coordination.stateWritesSerialized,true);
  assert.equal(runtime.coordination.sourceRootExclusive,true);

  assert.ok(runner.includes("VIBE2_MAX_CONCURRENT_GAME_TASKS: '20'"));
  assert.ok(runner.includes('Math.min(20, Number(process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS) || 20)'));
  assert.ok(doc.includes('최대 20개 bounded worker'));
  assert.ok(doc.includes('20 → 16 → 12 → 8 → 4'));
  assert.equal(runtime.documentation.humanDocuments.length,1);
  assert.equal(runtime.documentation.humanDocuments[0],'VIBE2.md');
});
