import test from 'node:test';
import assert from 'node:assert/strict';
import { computeParallelismTelemetry } from '../tools/vibe2-parallelism-telemetry.mjs';

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
