import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOperationalFreeBudgetTelemetry} from '../tools/free-budget-telemetry.mjs';

const base={repository:'hans1177/jaewoon-games',visibility:'public',runner:'ubuntu-latest',cashKRW:0,paidApi:false,modelCalls:1,maxModelCalls:1,runnerMinutes:20,maxRunnerMinutes:20,timestamp:'2026-09-09T00:00:00Z'};

test('public standard runner is verified unmetered free',()=>{
  const t=buildOperationalFreeBudgetTelemetry(base);
  assert.equal(t.allowed,true);
  assert.equal(t.providers[0].quotaMode,'UNMETERED_FREE');
  assert.equal(t.providers[0].status,'AVAILABLE');
  assert.equal(t.providers[1].providerId,'OLLAMA_LOCAL');
});

test('private or unknown visibility fails closed',()=>{
  for(const visibility of ['private','unknown']){
    const t=buildOperationalFreeBudgetTelemetry({...base,visibility});
    assert.equal(t.allowed,false);
    assert.ok(t.failures.includes('PUBLIC_VISIBILITY_NOT_VERIFIED'));
  }
});

test('larger or unknown runner is never assumed free',()=>{
  const t=buildOperationalFreeBudgetTelemetry({...base,runner:'ubuntu-latest-8-cores'});
  assert.equal(t.allowed,false);
  assert.ok(t.failures.includes('STANDARD_RUNNER_NOT_VERIFIED'));
});

test('paid API and cash spend are blocked',()=>{
  assert.equal(buildOperationalFreeBudgetTelemetry({...base,paidApi:true}).allowed,false);
  assert.equal(buildOperationalFreeBudgetTelemetry({...base,cashKRW:1}).allowed,false);
});

test('model-call and runner-minute caps are enforced before work',()=>{
  const model=buildOperationalFreeBudgetTelemetry({...base,modelCalls:2});
  assert.ok(model.failures.includes('MODEL_CALL_CAP_EXCEEDED'));
  const runner=buildOperationalFreeBudgetTelemetry({...base,runnerMinutes:21});
  assert.ok(runner.failures.includes('RUNNER_MINUTE_CAP_EXCEEDED'));
});
