// 파일명: qa/vibe2-parallelism-telemetry.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeParallelismTelemetry } from '../tools/vibe2-parallelism-telemetry.mjs';
import { adaptiveRequestedMax, createParallelismControl, decideAdaptiveBackpressure } from '../tools/vibe2-adaptive-backpressure.mjs';
import { runQueueCommand } from '../tools/vibe2-queue-control.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const row=(i,{start=1000,end=5000,cache=true,outcome='PASS',runId=null,evidence=[],metrics={},blocker=null,candidateFailure=null}={})=>({
  taskId:`t${i}`,outcome,blocker,candidateFailure,
  evidence:[...(runId?[`actions-run:${runId}`]:[]),...evidence],
  metrics:{
    requestedMax:20,effectiveMax:20,reservedAt:0,workerStartedAt:start,workerFinishedAt:end,
    checkoutMs:100+i,candidateMs:1000+i*10,qaMs:200+i,workerTotalMs:end-start,ollamaCacheHit:cache,
    ...metrics
  }
});

test('20 overlapping workers report real peak 20 and full utilization',()=>{
  const results=Array.from({length:20},(_,i)=>row(i,{start:1000+i*5,end:5000+i*5,runId:'100'}));
  const t=computeParallelismTelemetry({results,requestedMax:20,effectiveMax:20,taskCount:20});
  assert.equal(t.runId,'100');
  assert.deepEqual(t.runIds,['100']);
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
  assert.deepEqual(t.secondaryBottlenecks,[]);
  assert.deepEqual(t.bottleneckCandidates,['RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION']);
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

test('direct source-generation failures outrank runner under-utilization while preserving runner as secondary evidence',()=>{
  const results=Array.from({length:24},(_,i)=>{
    const sourceFail=i<8;
    const otherFail=i>=8&&i<11;
    return row(i,{
      start:i<20?1000+i*5:7000+(i-20)*5,
      end:i<20?5000+i*5:11000+(i-20)*5,
      outcome:sourceFail||otherFail?'FAIL':'PASS',
      runId:'live-shadow-1',
      candidateFailure:sourceFail?{class:i===0?'TIMEOUT':'MALFORMED_OUTPUT',message:'source generation failed'}:null,
      blocker:otherFail?'incremental-qa-failed':null
    });
  });
  const t=computeParallelismTelemetry({results,requestedMax:256,effectiveMax:256,taskCount:24});
  assert.equal(t.actualPeakConcurrency,20);
  assert.equal(t.sourceGenerationFailures.count,8);
  assert.equal(t.bottleneck,'SOURCE_CANDIDATE_GENERATION');
  assert.deepEqual(t.secondaryBottlenecks,['RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION']);
  assert.deepEqual(t.bottleneckCandidates,['SOURCE_CANDIDATE_GENERATION','RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION']);
  assert.equal(t.pass,false);
  const next=decideAdaptiveBackpressure(createParallelismControl({currentMax:20}),t,{now:'2026-09-20T02:00:00.000Z'});
  assert.match(next.lastReason,/FAILURE_RATE/);
  assert.match(next.lastReason,/RUNNER_CAPACITY/);
});

test('mixed direct worker failure stages stay classified instead of falling back to unclassified',()=>{
  const results=Array.from({length:9},(_,i)=>{
    const sourceFail=i<3;
    const qaFail=i>=3&&i<6;
    return row(i,{
      start:1000+i*5,
      end:5000+i*5,
      outcome:'FAIL',
      runId:'mixed-worker-failures',
      candidateFailure:sourceFail?{class:i===0?'NO_OP':'MALFORMED_OUTPUT',message:'source generation failed'}:null,
      blocker:sourceFail?'source-candidate-generation-failed':qaFail?'incremental-qa-failed':'performance-sanity-failed'
    });
  });
  const t=computeParallelismTelemetry({results,requestedMax:9,effectiveMax:9,taskCount:9});
  assert.equal(t.failureRatePct,100);
  assert.deepEqual(t.workerFailureStages.classes,{
    SOURCE_CANDIDATE_GENERATION:3,
    INCREMENTAL_QA:3,
    PERFORMANCE_SANITY:3
  });
  assert.equal(t.workerFailureStages.count,9);
  assert.equal(t.workerFailureStages.coveragePct,100);
  assert.equal(t.bottleneck,'SOURCE_CANDIDATE_GENERATION');
  assert.deepEqual(t.secondaryBottlenecks,['INCREMENTAL_QA','PERFORMANCE_SANITY']);
  assert.deepEqual(t.bottleneckCandidates,['SOURCE_CANDIDATE_GENERATION','INCREMENTAL_QA','PERFORMANCE_SANITY']);
  assert.equal(t.bottleneckCandidates.includes('WORKER_FAILURES_UNCLASSIFIED'),false);
  assert.equal(t.pass,false);
});

test('source candidate failures are reported as the real saturated-wave bottleneck',()=>{
  const results=Array.from({length:20},(_,i)=>row(i,{
    start:1000+i*5,end:5000+i*5,outcome:'FAIL',runId:'125',
    blocker:'source-candidate-generation-failed'
  }));
  const t=computeParallelismTelemetry({results,requestedMax:20,effectiveMax:20,taskCount:20});
  assert.equal(t.actualPeakConcurrency,20);
  assert.equal(t.failureRatePct,100);
  assert.equal(t.bottleneck,'SOURCE_CANDIDATE_GENERATION');
  assert.equal(t.sourceGenerationFailures.count,20);
  assert.equal(t.sourceGenerationFailures.ratePct,100);
  assert.equal(t.sourceGenerationFailures.classes.UNCLASSIFIED,20);
  assert.equal(t.pass,false);
});

test('causal source generation classes survive into parallel telemetry',()=>{
  const results=[
    row(1,{outcome:'FAIL',candidateFailure:{class:'NO_OP',message:'same edit'}}),
    row(2,{outcome:'FAIL',candidateFailure:{class:'TIMEOUT',message:'slow'}}),
    row(3,{outcome:'FAIL',evidence:['source-generation-failure:FULL_REWRITE_SIZE']}),
    row(4,{outcome:'PASS'})
  ];
  const t=computeParallelismTelemetry({results,requestedMax:4,effectiveMax:4,taskCount:4});
  assert.equal(t.bottleneck,'SOURCE_CANDIDATE_GENERATION');
  assert.equal(t.sourceGenerationFailures.count,3);
  assert.deepEqual(t.sourceGenerationFailures.classes,{NO_OP:1,TIMEOUT:1,FULL_REWRITE_SIZE:1});
});

test('blocked work order is not counted as source generation failure even with stale candidate metadata',()=>{
  const results=[row(1,{
    outcome:'BLOCKED',
    blocker:'MACHINE_STATE_INCONSISTENT:QUEUE_MAX_DIVERGED',
    candidateFailure:{class:'OTHER',message:'stale metadata'},
    evidence:['source-generation-failure:OTHER']
  })];
  const t=computeParallelismTelemetry({results,requestedMax:20,effectiveMax:20,taskCount:1});
  assert.equal(t.failureRatePct,100);
  assert.equal(t.sourceGenerationFailures.count,0);
  assert.deepEqual(t.sourceGenerationFailures.classes,{});
  assert.equal(t.bottleneck,'WORKER_FAILURES_UNCLASSIFIED');
});

test('mixed actions runs are not treated as one adaptive sample',()=>{
  const results=[row(1,{runId:'101'}),row(2,{runId:'102'})];
  const t=computeParallelismTelemetry({results,requestedMax:20,effectiveMax:20,taskCount:2});
  assert.equal(t.runId,null);
  assert.deepEqual(t.runIds,['101','102']);
});

test('workload telemetry measures completed features actual change volume rework qa duplicates and cycle time',()=>{
  const results=[
    row(1,{start:1000,end:5000,runId:'150',evidence:['incremental-qa-hash:same'],metrics:{changedFileCount:2,addedLineCount:30,deletedLineCount:4,modelPrepMs:100}}),
    row(2,{start:1200,end:6200,runId:'150',evidence:['incremental-qa-hash:same','incremental-qa-hash:same'],metrics:{changedFileCount:1,addedLineCount:8,deletedLineCount:2,modelPrepMs:100}})
  ];
  const tasks=[
    {id:'t1',packageId:'p1',status:'running',retries:1},
    {id:'t2',packageId:'p1',status:'running',retries:0}
  ];
  const t=computeParallelismTelemetry({results,tasks,requestedMax:2,effectiveMax:2,taskCount:2});
  assert.equal(t.workload.completedFeatureCount,1);
  assert.equal(t.workload.changedFileCount,3);
  assert.equal(t.workload.addedLineCount,38);
  assert.equal(t.workload.deletedLineCount,6);
  assert.equal(t.workload.changedLineCount,44);
  assert.equal(t.workload.reworkedTaskCount,1);
  assert.equal(t.workload.reworkRatePct,50);
  assert.ok(t.workload.qaDuplicateRatePct>0);
  assert.equal(t.workload.packageCycleTime.packageCount,1);
  assert.equal(t.workload.packageCycleTime.maxMs,5200);
  assert.equal(t.workload.actualChangeMetricsKnown,true);
});

test('adaptive controller steps down exactly once under saturated runner pressure',()=>{
  const telemetry=computeParallelismTelemetry({results:Array.from({length:16},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000,runId:'200'})),requestedMax:16,effectiveMax:16,taskCount:16});
  const next=decideAdaptiveBackpressure(createParallelismControl({currentMax:16}),telemetry,{now:'2026-09-15T10:00:00.000Z'});
  assert.equal(next.currentMax,8);
  assert.equal(next.lastDecision,'DOWN');
  assert.equal(next.lastRunId,'200');
  assert.match(next.lastReason,/RUNNER_CAPACITY/);
});

test('same actions run cannot downshift persistent cap twice',()=>{
  const telemetry=computeParallelismTelemetry({results:Array.from({length:16},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000,runId:'201'})),requestedMax:16,effectiveMax:16,taskCount:16});
  const first=decideAdaptiveBackpressure(createParallelismControl({currentMax:16}),telemetry,{now:'2026-09-15T10:00:00.000Z'});
  const duplicate=decideAdaptiveBackpressure(first,telemetry,{now:'2026-09-15T10:00:30.000Z'});
  assert.equal(first.currentMax,8);
  assert.equal(duplicate.currentMax,8);
  assert.equal(duplicate.healthyStreak,first.healthyStreak);
  assert.equal(duplicate.pressureStreak,first.pressureStreak);
  assert.equal(duplicate.lastDecision,'HOLD');
  assert.equal(duplicate.lastReason,'DUPLICATE_RUN');
  assert.equal(duplicate.lastRunId,'201');
});

test('run-local queue backpressure prevents a second persistent downshift',()=>{
  const telemetry=computeParallelismTelemetry({results:Array.from({length:12},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000,runId:'202'})),requestedMax:16,effectiveMax:8,taskCount:12});
  const next=decideAdaptiveBackpressure(createParallelismControl({currentMax:16}),telemetry,{now:'2026-09-15T10:01:00.000Z'});
  assert.equal(next.currentMax,16);
  assert.equal(next.lastDecision,'HOLD');
  assert.equal(next.lastReason,'RUN_LOCAL_BACKPRESSURE_ACTIVE');
});

test('low workload never teaches the controller to reduce capacity',()=>{
  const telemetry=computeParallelismTelemetry({results:Array.from({length:5},(_,i)=>row(i,{start:1000+i*5000,end:4000+i*5000,runId:'203'})),requestedMax:16,effectiveMax:16,taskCount:5});
  const next=decideAdaptiveBackpressure(createParallelismControl({currentMax:16}),telemetry,{now:'2026-09-15T10:02:00.000Z'});
  assert.equal(next.currentMax,16);
  assert.equal(next.lastReason,'LOW_LOAD');
});

test('healthy saturated runs fast-ramp one adaptive step per run',()=>{
  const healthy1=computeParallelismTelemetry({results:Array.from({length:8},(_,i)=>row(i,{start:1000+i*5,end:5000+i*5,runId:'204'})),requestedMax:8,effectiveMax:8,taskCount:8});
  const healthy2=computeParallelismTelemetry({results:Array.from({length:16},(_,i)=>row(i,{start:1000+i*5,end:5000+i*5,runId:'205'})),requestedMax:16,effectiveMax:16,taskCount:16});
  const first=decideAdaptiveBackpressure(createParallelismControl({currentMax:8}),healthy1,{now:'2026-09-15T10:03:00.000Z'});
  assert.equal(first.currentMax,16);
  assert.equal(first.healthyStreak,0);
  assert.equal(first.lastDecision,'UP');
  const second=decideAdaptiveBackpressure(first,healthy2,{now:'2026-09-15T10:04:00.000Z'});
  assert.equal(second.currentMax,20);
  assert.equal(second.lastDecision,'UP');
  assert.equal(second.lastRunId,'205');
});

test('version 1 control state migrates without losing its cap',()=>{
  const migrated=createParallelismControl({version:1,currentMax:16,healthyStreak:1});
  assert.equal(migrated.version,3);
  assert.equal(migrated.currentMax,16);
  assert.equal(migrated.healthyStreak,1);
  assert.equal(migrated.lastRunId,null);
});

test('queue command reads adaptive cap and duplicate fan-in keeps exactly one next-run step',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-adaptive-'));
  const queueFile=path.join(dir,'queue.json');
  const controlFile=path.join(dir,'control.json');
  const batchFile=path.join(dir,'batch.json');
  const fanFile=path.join(dir,'fan.json');
  const tasks=Array.from({length:20},(_,i)=>({id:`q-${i}`,gameId:`g-${i}`,target:'web',department:'development',type:'implementation',sourceRoot:`web-games/g-${i}`,goal:'work',status:'queued',responsibleFiles:[`f-${i}.js`]}));
  fs.writeFileSync(queueFile,JSON.stringify({maxConcurrentTasks:16,tasks},null,2));
  fs.writeFileSync(controlFile,JSON.stringify({version:3,currentMax:16},null,2));
  const reserved=runQueueCommand({command:'reserve-batch',queue:queueFile,control:controlFile,max:'16',output:batchFile});
  assert.equal(reserved.tasks.length,16);
  assert.equal(reserved.adaptiveMaxConcurrentTasks,16);
  const batch=JSON.parse(fs.readFileSync(batchFile,'utf8'));
  assert.equal(batch.scheduler.configuredMaxConcurrentTasks,16);
  assert.equal(batch.scheduler.adaptiveMaxConcurrentTasks,16);
  const results=reserved.tasks.map((task,i)=>({taskId:task.id,variant:'primary',outcome:'PASS',blocker:'candidate-awaiting-qa-and-deployment',evidence:['actions-run:300'],metrics:{requestedMax:16,effectiveMax:16,reservedAt:1000,workerStartedAt:1000+i*5000,workerFinishedAt:4000+i*5000,checkoutMs:100,candidateMs:1000,qaMs:200,workerTotalMs:3000,ollamaCacheHit:true}}));
  fs.writeFileSync(fanFile,JSON.stringify({results},null,2));
  const first=runQueueCommand({command:'fan-in',queue:queueFile,control:controlFile,input:fanFile});
  assert.equal(first.previousAdaptiveControl.currentMax,16);
  assert.equal(first.adaptiveControl.currentMax,8);
  assert.equal(first.adaptiveControl.lastRunId,'300');
  const duplicate=runQueueCommand({command:'fan-in',queue:queueFile,control:controlFile,input:fanFile});
  assert.equal(duplicate.previousAdaptiveControl.currentMax,8);
  assert.equal(duplicate.adaptiveControl.currentMax,8);
  assert.equal(duplicate.adaptiveControl.lastReason,'DUPLICATE_RUN');
  assert.equal(JSON.parse(fs.readFileSync(controlFile,'utf8')).currentMax,8);
  assert.equal(adaptiveRequestedMax(duplicate.adaptiveControl,16),8);
});
