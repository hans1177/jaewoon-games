import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const arch=fs.readFileSync('VIBE2_PARALLEL_ARCHITECTURE.md','utf8');

test('PARALLELISM_CONTRACT_GATE keeps main policy and runner unified at 20',()=>{
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
  assert.ok(runner.includes("VIBE2_MAX_CONCURRENT_GAME_TASKS: '20'"));
  assert.ok(runner.includes('Math.min(20, Number(process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS) || 20)'));
  assert.ok(arch.includes('운영 최대 동시 게임 작업 수: `20`'));
  assert.ok(arch.includes('20 → 16 → 12 → 8 → 4'));
  assert.ok(arch.includes('PARALLELISM_CONTRACT_GATE'));
});
