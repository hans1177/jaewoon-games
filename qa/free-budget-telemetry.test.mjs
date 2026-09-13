import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOperationalFreeBudgetTelemetry,fetchRepositoryVisibility} from '../tools/free-budget-telemetry.mjs';

const base={repository:'hans1177/jaewoon-games',visibility:'public',visibilitySource:'GITHUB_REPO_API',runner:'ubuntu-latest',cashKRW:0,paidApi:false,modelCalls:1,maxModelCalls:1,runnerMinutes:20,maxRunnerMinutes:20,timestamp:'2026-09-09T00:00:00Z'};

test('public standard runner is verified unmetered free',()=>{
  const t=buildOperationalFreeBudgetTelemetry(base);
  assert.equal(t.allowed,true);
  assert.equal(t.providers[0].quotaMode,'UNMETERED_FREE');
  assert.equal(t.providers[0].status,'AVAILABLE');
  assert.equal(t.providers[1].providerId,'OLLAMA_LOCAL');
});

test('claimed public without GitHub API proof fails closed',()=>{
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

test('repository visibility fetch authenticates, retries transient failures and maps public/private',async()=>{
  const seen=[];
  let transientCalls=0;
  const transientFetch=async(_url,options)=>{
    transientCalls+=1;
    seen.push(options?.headers||{});
    if(transientCalls<3)return {ok:false,status:403,json:async()=>({})};
    return {ok:true,json:async()=>({visibility:'public',private:false})};
  };
  const visibility=await fetchRepositoryVisibility('hans1177/jaewoon-games',{fetchImpl:transientFetch,token:'test-token',attempts:3,retryDelayMs:0});
  assert.equal(visibility,'public');
  assert.equal(transientCalls,3);
  assert.equal(seen[0].Authorization,'Bearer test-token');
  assert.equal(seen[0]['User-Agent'],'jaewoon-vibe2-free-budget-telemetry');

  const privateFetch=async()=>({ok:true,json:async()=>({visibility:'private',private:true})});
  assert.equal(await fetchRepositoryVisibility('hans1177/jaewoon-games',{fetchImpl:privateFetch,attempts:1,retryDelayMs:0}),'private');
});

test('repository visibility fetch still fails closed after all retries',async()=>{
  let calls=0;
  const failedFetch=async()=>{calls+=1;return {ok:false,status:500,json:async()=>({})};};
  assert.equal(await fetchRepositoryVisibility('hans1177/jaewoon-games',{fetchImpl:failedFetch,attempts:3,retryDelayMs:0}),'unknown');
  assert.equal(calls,3);
});
