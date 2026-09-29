import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOperationalFreeBudgetTelemetry,fetchRepositoryVisibility,readRepositoryVisibilityFromEvent,resolveRepositoryVisibility} from '../tools/free-budget-telemetry.mjs';

const base={repository:'hans1177/jaewoon-games',visibility:'public',visibilitySource:'GITHUB_REPO_API',runner:'ubuntu-latest',cashKRW:0,paidApi:false,modelCalls:1,maxModelCalls:1,runnerMinutes:20,maxRunnerMinutes:20,timestamp:'2026-09-09T00:00:00Z'};

test('public standard runner is verified unmetered free',()=>{
  const t=buildOperationalFreeBudgetTelemetry(base);
  assert.equal(t.allowed,true);
  assert.equal(t.providers[0].quotaMode,'UNMETERED_FREE');
  assert.equal(t.providers[0].status,'AVAILABLE');
  assert.equal(t.providers[1].providerId,'OLLAMA_LOCAL');
});

test('verified GitHub event payload is also authoritative',()=>{
  const t=buildOperationalFreeBudgetTelemetry({...base,visibilitySource:'GITHUB_EVENT_PAYLOAD'});
  assert.equal(t.allowed,true);
  assert.equal(t.providers[0].quotaMode,'UNMETERED_FREE');
});

test('claimed public without GitHub proof fails closed',()=>{
  const t=buildOperationalFreeBudgetTelemetry({...base,visibilitySource:'UNVERIFIED'});
  assert.equal(t.allowed,false);
  assert.ok(t.failures.includes('PUBLIC_VISIBILITY_NOT_VERIFIED'));
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

test('repository visibility fetch maps public/private and fails closed on errors',async()=>{
  const publicFetch=async()=>({ok:true,json:async()=>({full_name:'hans1177/jaewoon-games',visibility:'public',private:false})});
  const privateFetch=async()=>({ok:true,json:async()=>({full_name:'hans1177/jaewoon-games',visibility:'private',private:true})});
  const failedFetch=async()=>({ok:false,json:async()=>({})});
  assert.equal(await fetchRepositoryVisibility('hans1177/jaewoon-games',{fetchImpl:publicFetch}),'public');
  assert.equal(await fetchRepositoryVisibility('hans1177/jaewoon-games',{fetchImpl:privateFetch}),'private');
  assert.equal(await fetchRepositoryVisibility('hans1177/jaewoon-games',{fetchImpl:failedFetch}),'unknown');
});

test('event payload fallback verifies exact repository and fails closed on mismatch',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-budget-'));
  const eventPath=path.join(dir,'event.json');
  fs.writeFileSync(eventPath,JSON.stringify({repository:{full_name:'hans1177/jaewoon-games',visibility:'public',private:false}}));
  assert.equal(readRepositoryVisibilityFromEvent('hans1177/jaewoon-games',eventPath),'public');
  assert.equal(readRepositoryVisibilityFromEvent('other/repo',eventPath),'unknown');
  const failedFetch=async()=>({ok:false,json:async()=>({})});
  const resolved=await resolveRepositoryVisibility('hans1177/jaewoon-games',{fetchImpl:failedFetch,eventPath});
  assert.deepEqual(resolved,{visibility:'public',visibilitySource:'GITHUB_EVENT_PAYLOAD'});
});
