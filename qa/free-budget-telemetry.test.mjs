// 파일명: qa/free-budget-telemetry.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
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

// 예산 보호: 기존 Vibe2 소스 작업의 22분 선언과 포트폴리오 무료 한도가 일치해야 한다.
test('canonical Vibe2 source budget does not exceed the shared free-runner cap',()=>{
  const portfolio=JSON.parse(fs.readFileSync(new URL('../autonomous-portfolio.json',import.meta.url),'utf8'));
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  const start=workflow.indexOf('- name: Verify free execution budget');
  const end=workflow.indexOf('- name: Acquire shared Work Lock',start);
  assert.ok(start>=0&&end>start,'canonical free-budget stage missing');
  const match=workflow.slice(start,end).match(/--runner-minutes=(\d+)/);
  assert.ok(match,'canonical runner minute declaration missing');
  const minutes=Number(match[1]);
  assert.equal(minutes,22);
  assert.ok(portfolio.maxRunnerMinutesPerRun>=minutes);
  assert.equal(portfolio.paidApi,false);
  assert.equal(buildOperationalFreeBudgetTelemetry({...base,runnerMinutes:minutes,maxRunnerMinutes:portfolio.maxRunnerMinutesPerRun}).allowed,true);
});

// 보안: 명령줄의 false가 유료 포트폴리오를 우회하거나 잘못된 비용을 0으로 바꾸면 안 된다.
test('CLI cannot override a paid portfolio or disguise malformed cash and usage',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-free-budget-cli-'));
  const script=fileURLToPath(new URL('../tools/free-budget-telemetry.mjs',import.meta.url));
  const output=path.join(dir,'budget.json');
  const args=['--visibility=public','--visibility-source=GITHUB_REPO_API','--runner=ubuntu-latest','--runner-minutes=22','--model-calls=0','--paid-api=false','--output='+output];
  try{
    fs.writeFileSync(path.join(dir,'autonomous-portfolio.json'),JSON.stringify({paidApi:true,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:22}));
    let run=spawnSync(process.execPath,[script,...args],{cwd:dir,encoding:'utf8'});
    assert.equal(run.status,2,run.stderr);
    assert.ok(JSON.parse(fs.readFileSync(output,'utf8')).failures.includes('PAID_API_FORBIDDEN'));
    fs.writeFileSync(path.join(dir,'autonomous-portfolio.json'),JSON.stringify({paidApi:false,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:22}));
    run=spawnSync(process.execPath,[script,...args,'--cash-krw=invalid'],{cwd:dir,encoding:'utf8'});
    assert.equal(run.status,2,run.stderr);
    assert.ok(JSON.parse(fs.readFileSync(output,'utf8')).failures.includes('CASH_BUDGET_FORBIDDEN'));
    run=spawnSync(process.execPath,[script,...args,'--model-calls=invalid'],{cwd:dir,encoding:'utf8'});
    assert.equal(run.status,2,run.stderr);
    assert.ok(JSON.parse(fs.readFileSync(output,'utf8')).failures.includes('MODEL_CALL_CAP_EXCEEDED'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
