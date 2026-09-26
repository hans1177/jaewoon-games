// 파일명: qa/vibe2-adaptive-backpressure.test.mjs
// 역할: 외부 한계 256을 기본 요청하고 검증된 외부 압력에서만 단계적으로 낮아졌다가 복구되는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  adaptiveRequestedMax,
  createParallelismControl,
  decideAdaptiveBackpressure,
  DEFAULT_ADAPTIVE_MIN,
  DEFAULT_ADAPTIVE_TARGET
} from '../tools/vibe2-adaptive-backpressure.mjs';
import { runQueueCommand } from '../tools/vibe2-queue-control.mjs';

const healthyTelemetry=(overrides={})=>({
  runId:'healthy-run',workerCount:256,effectiveMax:256,actualPeakConcurrency:256,effectivePeakUtilizationPct:100,
  failureRatePct:0,pressureLevel:'LOW',bottleneck:'NONE',
  queueWait:{p95Ms:1000},checkout:{p95Ms:1000},
  throughput:{firstCandidatePassRatePct:100,verifiedCandidatesPerMinute:4,changedLinesPerMinute:40},...overrides
});
const pressuredTelemetry=(overrides={})=>({
  runId:'pressure-run',workerCount:256,effectiveMax:256,actualPeakConcurrency:128,effectivePeakUtilizationPct:50,
  failureRatePct:0,pressureLevel:'LOW',bottleneck:'RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION',
  queueWait:{p95Ms:1000},checkout:{p95Ms:1000},...overrides
});
function tempFiles(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-adaptive-'));
  return{dir,queue:path.join(dir,'queue.json'),control:path.join(dir,'parallelism-control.json'),output:path.join(dir,'batch.json')};
}

test('default requests the external boundary immediately',()=>{
  assert.equal(DEFAULT_ADAPTIVE_TARGET,256);
  assert.equal(DEFAULT_ADAPTIVE_MIN,30);
  assert.equal(createParallelismControl({}).currentMax,256);
  assert.equal(adaptiveRequestedMax(createParallelismControl({}),256),256);
});

test('verified external pressure downshifts one step but never below owner floor 30',()=>{
  const from256=decideAdaptiveBackpressure(createParallelismControl({currentMax:256}),pressuredTelemetry({runId:'p256'}));
  assert.equal(from256.currentMax,128);
  assert.equal(from256.lastDecision,'DOWN');
  const from32=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:32}),
    pressuredTelemetry({runId:'p32',workerCount:32,effectiveMax:32,actualPeakConcurrency:16}),
    {minimumMax:30}
  );
  assert.equal(from32.currentMax,30);
  assert.equal(from32.lastDecision,'DOWN');
});

test('verified pressure holds floor 30 and never lowers it',()=>{
  const at30=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:30}),
    pressuredTelemetry({runId:'p30',workerCount:30,effectiveMax:30,actualPeakConcurrency:15}),
    {minimumMax:30}
  );
  assert.equal(at30.currentMax,30);
  assert.equal(at30.lastDecision,'HOLD');
  assert.match(at30.lastReason,/OWNER_MINIMUM_WAVE_30/);
});

test('healthy saturated capacity recovers upward after pressure',()=>{
  const next=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:128}),
    healthyTelemetry({runId:'recover',workerCount:128,effectiveMax:128,actualPeakConcurrency:128})
  );
  assert.equal(next.currentMax,256);
  assert.equal(next.lastDecision,'UP');
});

test('low load does not invent pressure or reduce requested capacity',()=>{
  const next=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:256}),
    pressuredTelemetry({runId:'low-load',workerCount:12,effectiveMax:256})
  );
  assert.equal(next.currentMax,256);
  assert.equal(next.lastDecision,'HOLD');
  assert.equal(next.lastReason,'LOW_LOAD');
});

test('run-local backpressure does not double-apply persistent pressure',()=>{
  const next=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:256}),
    pressuredTelemetry({runId:'local',effectiveMax:128})
  );
  assert.equal(next.currentMax,256);
  assert.equal(next.lastReason,'RUN_LOCAL_BACKPRESSURE_ACTIVE');
});

test('duplicate telemetry cannot apply the same pressure twice',()=>{
  const once=decideAdaptiveBackpressure(createParallelismControl({currentMax:256}),pressuredTelemetry({runId:'same'}));
  const twice=decideAdaptiveBackpressure(once,pressuredTelemetry({runId:'same',workerCount:128,effectiveMax:128}));
  assert.equal(once.currentMax,128);
  assert.equal(twice.currentMax,128);
  assert.equal(twice.lastReason,'DUPLICATE_RUN');
});

test('missing or corrupt control state falls back to maximum default 256',()=>{
  const files=tempFiles();
  try{
    fs.writeFileSync(files.queue,JSON.stringify({maxConcurrentTasks:256,tasks:[]}),'utf8');
    const missing=runQueueCommand({command:'reserve-batch',queue:files.queue,control:files.control,max:'256',output:files.output});
    assert.equal(missing.adaptiveControl.currentMax,256);
    assert.equal(missing.adaptiveControl.lastReason,'DEFAULT_ADAPTIVE_TARGET_256');
    fs.writeFileSync(files.control,'{broken-json','utf8');
    const corrupt=runQueueCommand({command:'reserve-batch',queue:files.queue,control:files.control,max:'256',output:files.output});
    assert.equal(corrupt.adaptiveControl.currentMax,256);
    assert.equal(corrupt.adaptiveControl.lastReason,'INVALID_STATE_ADAPTIVE_TARGET_256');
  }finally{fs.rmSync(files.dir,{recursive:true,force:true});}
});

test('stale pressure evidence resets to maximum before fresh evaluation',()=>{
  const next=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:32,lastUpdatedAt:'2026-09-19T08:00:00Z'}),
    healthyTelemetry({runId:'stale',workerCount:256,effectiveMax:256,actualPeakConcurrency:256}),
    {now:'2026-09-19T12:00:00Z'}
  );
  assert.equal(next.currentMax,256);
  assert.equal(next.lastReason,'AT_MAX_HEALTHY');
});
