import test from 'node:test';
import assert from 'node:assert/strict';
import { computeParallelismTelemetry } from '../tools/vibe2-parallelism-telemetry.mjs';
import { adaptiveRequestedMax, createParallelismControl, decideAdaptiveBackpressure } from '../tools/vibe2-adaptive-backpressure.mjs';
import { runQueueCommand } from '../tools/vibe2-queue-control.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const row=(i,{start=1000,end=5000,cache=true,outcome='PASS'}={})=>({
  taskId:`t${i}`,outcome,
  metrics:{
    requestedMax:20,effectiveMax:20,reservedAt:0,workerStartedAt:start,workerFinishedAt:end,
    checkoutMs:100+i,candidateMs:1000+i*10,qaMs:200+i,workerTotalMs:end-start,ollamaCacheHit:cache
  }
});

test('20 overlapping workers report real peak 20 and full utilization',()=>{
  const results=Array.from({length:20},(_,i)=>row(i,{start:1000+i*5,end:5000+i*5}));
  const t=computeParallelismTelemetry({results,requestedMax:20,effectiveMax:20,taskCount:20});
  assert.equal(t.actualPeakConcurrency,20);
  assert.equal(t.scheduledSlotUtilizationPct,100);
  assert.equal(t.observedPeakUtilizationPct,100);
  assert.equal(t.ollamaCache.hitRatePct,100);
  assert.equal(t.bottleneck,'NONE');
  assert.equal(t.pass,true);
});

test('serialized worker starts expose runner/startup bottleneck',()=>{
  const results=Array.from({length:20},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000}));
  const t=computeParallelismTelemetry({results,requestedMax:20,effectiveMax:20,taskCount:20});
  assert.equal(t.actualPeakConcurrency,1);
  assert.equal(t.bottleneck,'RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION');
  assert.equal(t.pass,false);
});

test('cache misses and failures are visible even when concurrency is healthy',()=>{
  const results=Array.from({length:10},(_,i)=>row(i,{start:1000,end:5000,cache:i<3,outcome:i<8?'PASS':'FAIL'}));
  const t=computeParallelismTelemetry({results,requestedMax:20,effectiveMax:10,taskCount:10});
  assert.equal(t.actualPeakConcurrency,10);
  assert.equal(t.ollamaCache.hitRatePct,30);
  assert.equal(t.failureRatePct,20);
  assert.equal(t.pressureLevel,'HIGH');
  assert.equal(t.bottleneck,'OLLAMA_CACHE_MISS_RATE');
});


test('adaptive controller steps down exactly once under saturated runner pressure',()=>{
  const telemetry=computeParallelismTelemetry({results:Array.from({length:20},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000})),requestedMax:20,effectiveMax:20,taskCount:20});
  const next=decideAdaptiveBackpressure(createParallelismControl({currentMax:20}),telemetry,{now:'2026-09-15T10:00:00.000Z'});
  assert.equal(next.currentMax,16);
  assert.equal(next.lastDecision,'DOWN');
  assert.match(next.lastReason,/RUNNER_CAPACITY/);
});

test('run-local queue backpressure prevents a second persistent downshift',()=>{
  const telemetry=computeParallelismTelemetry({results:Array.from({length:16},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000})),requestedMax:16,effectiveMax:16,taskCount:16});
  const next=decideAdaptiveBackpressure(createParallelismControl({currentMax:20}),telemetry,{now:'2026-09-15T10:01:00.000Z'});
  assert.equal(next.currentMax,20);
  assert.equal(next.lastDecision,'HOLD');
  assert.equal(next.lastReason,'RUN_LOCAL_BACKPRESSURE_ACTIVE');
});

test('low workload never teaches the controller to reduce capacity',()=>{
  const telemetry=computeParallelismTelemetry({results:Array.from({length:5},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000})),requestedMax:20,effectiveMax:20,taskCount:5});
  const next=decideAdaptiveBackpressure(createParallelismControl({currentMax:20}),telemetry,{now:'2026-09-15T10:02:00.000Z'});
  assert.equal(next.currentMax,20);
  assert.equal(next.lastReason,'LOW_LOAD');
});

test('two healthy saturated runs restore one adaptive step',()=>{
  const healthy=computeParallelismTelemetry({results:Array.from({length:12},(_,i)=>row(i,{start:1000+i*5,end:5000+i*5})),requestedMax:12,effectiveMax:12,taskCount:12});
  const first=decideAdaptiveBackpressure(createParallelismControl({currentMax:12}),healthy,{now:'2026-09-15T10:03:00.000Z'});
  assert.equal(first.currentMax,12);
  assert.equal(first.healthyStreak,1);
  const second=decideAdaptiveBackpressure(first,healthy,{now:'2026-09-15T10:04:00.000Z'});
  assert.equal(second.currentMax,16);
  assert.equal(second.lastDecision,'UP');
});

test('queue command reads adaptive cap and fan-in persists exactly one next-run step',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-adaptive-'));
  const queueFile=path.join(dir,'queue.json');
  const controlFile=path.join(dir,'control.json');
  const batchFile=path.join(dir,'batch.json');
  const fanFile=path.join(dir,'fan.json');
  const tasks=Array.from({length:20},(_,i)=>({id:`q-${i}`,gameId:`g-${i}`,target:'web',sourceRoot:`web-games/g-${i}`,goal:'work',status:'queued',responsibleFiles:[`f-${i}.js`]}));
  fs.writeFileSync(queueFile,JSON.stringify({maxConcurrentTasks:20,tasks},null,2));
  fs.writeFileSync(controlFile,JSON.stringify({currentMax:12},null,2));
  const reserved=runQueueCommand({command:'reserve-batch',queue:queueFile,control:controlFile,max:'20',output:batchFile});
  assert.equal(reserved.tasks.length,12);
  assert.equal(reserved.adaptiveMaxConcurrentTasks,12);
  const batch=JSON.parse(fs.readFileSync(batchFile,'utf8'));
  assert.equal(batch.scheduler.configuredMaxConcurrentTasks,20);
  assert.equal(batch.scheduler.adaptiveMaxConcurrentTasks,12);
  const results=reserved.tasks.map((task,i)=>({taskId:task.id,variant:'primary',outcome:'FAIL',blocker:'source-candidate-generation-failed',metrics:{requestedMax:12,effectiveMax:12,reservedAt:1000,workerStartedAt:1000+i*5000,workerFinishedAt:4000+i*5000,checkoutMs:100,candidateMs:1000,qaMs:200,workerTotalMs:3000,ollamaCacheHit:true}}));
  fs.writeFileSync(fanFile,JSON.stringify({results},null,2));
  const merged=runQueueCommand({command:'fan-in',queue:queueFile,control:controlFile,input:fanFile});
  assert.equal(merged.previousAdaptiveControl.currentMax,12);
  assert.equal(merged.adaptiveControl.currentMax,8);
  assert.equal(JSON.parse(fs.readFileSync(controlFile,'utf8')).currentMax,8);
  assert.equal(adaptiveRequestedMax(merged.adaptiveControl,20),8);
});
