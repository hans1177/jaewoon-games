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
  ownerFirstRunnerAllocation,
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
  assert.equal(DEFAULT_ADAPTIVE_MIN,4);
  assert.equal(createParallelismControl({}).currentMax,256);
  assert.equal(adaptiveRequestedMax(createParallelismControl({}),256),256);
});

test('verified external pressure downshifts one step without an internal floor at 20',()=>{
  const from256=decideAdaptiveBackpressure(createParallelismControl({currentMax:256}),pressuredTelemetry({runId:'p256'}));
  assert.equal(from256.currentMax,128);
  assert.equal(from256.lastDecision,'DOWN');
  const from20=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:20}),
    pressuredTelemetry({runId:'p20',workerCount:20,effectiveMax:20,actualPeakConcurrency:10}),
    {minimumMax:4}
  );
  assert.equal(from20.currentMax,16);
  assert.equal(from20.lastDecision,'DOWN');
});

test('observed external concurrency ceiling fast-converges to the nearest safe step',()=>{
  const next=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:256}),
    pressuredTelemetry({
      runId:'external-capacity-19',
      workerCount:42,
      effectiveMax:256,
      actualPeakConcurrency:19,
      effectivePeakUtilizationPct:7.42,
      failureRatePct:88.1,
      pressureLevel:'SEVERE',
      bottleneck:'SOURCE_CANDIDATE_GENERATION'
    }),
    {minimumMax:4}
  );
  assert.equal(next.currentMax,20);
  assert.equal(next.lastDecision,'DOWN');
  assert.equal(next.lastReason,'EXTERNAL_CAPACITY_OBSERVED_19');
});

test('small low-load wave is not mistaken for an external capacity ceiling',()=>{
  const next=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:256}),
    pressuredTelemetry({
      runId:'small-wave',
      workerCount:7,
      effectiveMax:256,
      actualPeakConcurrency:4,
      effectivePeakUtilizationPct:1.56
    }),
    {minimumMax:4}
  );
  assert.equal(next.currentMax,256);
  assert.equal(next.lastDecision,'HOLD');
  assert.equal(next.lastReason,'LOW_LOAD');
});

test('verified pressure can reach floor 4 but never lower',()=>{
  const at4=decideAdaptiveBackpressure(
    createParallelismControl({currentMax:4}),
    pressuredTelemetry({runId:'p4',workerCount:4,effectiveMax:4,actualPeakConcurrency:2}),
    {minimumMax:4}
  );
  assert.equal(at4.currentMax,4);
  assert.equal(at4.lastDecision,'HOLD');
  assert.match(at4.lastReason,/OWNER_MINIMUM_WAVE_4/);
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


test('game-primary keeps adaptive telemetry while reserving to fixed repeat-development boundary',t=>{
  const previous={priority:process.env.VIBE2_AUTONOMOUS_OWNER_RUNNER_PRIORITY,observed:process.env.VIBE2_OBSERVED_ACTIVE_HOSTED_JOBS};
  process.env.VIBE2_AUTONOMOUS_OWNER_RUNNER_PRIORITY='1';
  process.env.VIBE2_OBSERVED_ACTIVE_HOSTED_JOBS='20';
  t.after(()=>{for(const [key,value] of [['VIBE2_AUTONOMOUS_OWNER_RUNNER_PRIORITY',previous.priority],['VIBE2_OBSERVED_ACTIVE_HOSTED_JOBS',previous.observed]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  const files=tempFiles();
  try{
    const tasks=Array.from({length:40},(_,i)=>({
      id:`adaptive-task-${i}`,gameId:`g-${i}`,target:'roblox',department:'development',type:'implementation',
      goal:'adaptive reservation',status:'queued',sourceRoot:`roblox-games/g-${i}`,responsibleFiles:['server/Game.server.luau'],evidence:[]
    }));
    fs.writeFileSync(files.queue,JSON.stringify({maxConcurrentTasks:256,tasks}), 'utf8');
    fs.writeFileSync(files.control,JSON.stringify({version:4,currentMax:20,lastReason:'EXTERNAL_CAPACITY_OBSERVED_19'}),'utf8');
    const result=runQueueCommand({
      command:'reserve-batch',queue:files.queue,control:files.control,lane:'game-primary',
      max:'256',min:'4','reservation-id':'adaptive:1','reservation-run':'adaptive','reserved-at':'2026-09-28T00:00:00Z',output:files.output
    });
    assert.equal(result.adaptiveMaxConcurrentTasks,20);
    assert.equal(result.reservationMaxConcurrentTasks,128);
    // 활성 중앙정책이 로드되면 Web 목표도 정식 정책 수치로 검사한다.
    // 원래의 고정 128 개발 슬롯과 Gemini 압력 수치는 그대로 검증한다.
    const verifiedPolicy=process.env.COMPANY_VERIFIED_POLICY_PATH
      ?JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'))
      :null;
    const flow=verifiedPolicy?.developmentSpeedExecution?.webGameFlow;
    assert.equal(result.selection?.webGameFlow?.target,flow?.enabled===true?Number(flow.targetConcurrentGames||0):0);
    assert.equal(result.tasks.length,40);
  }finally{fs.rmSync(files.dir,{recursive:true,force:true});}
});

test('auxiliary reserve-batch is not capped by game-primary adaptive control',()=>{
  const files=tempFiles();
  try{
    const tasks=Array.from({length:24},(_,i)=>({
      id:`asset-task-${i}`,gameId:'horror-escape-room',target:'roblox',department:'graphics',type:'implementation',
      assetProductionLane:true,goal:'internal motion repair',status:'queued',sourceRoot:`assets/roblox/world-ghosts/motions/fixture-${i}`,
      responsibleFiles:['init.luau'],evidence:['asset-production-parallel:v1'],
      motionRepairWorkUnit:{scope:'INTERNAL_ASSET_LIBRARY',objectId:`roblox-world-ghost-fixture-${i}`,clipId:'walk',sourcePath:'init.luau',objectCount:1,motionCount:1}
    }));
    fs.writeFileSync(files.queue,JSON.stringify({maxConcurrentTasks:256,tasks}), 'utf8');
    fs.writeFileSync(files.control,JSON.stringify({version:4,currentMax:20,lastReason:'EXTERNAL_CAPACITY_OBSERVED_19'}),'utf8');
    const result=runQueueCommand({
      command:'reserve-batch',queue:files.queue,control:files.control,lane:'asset-development',
      max:'64',min:'4','reservation-id':'asset:1','reservation-run':'asset','reserved-at':'2026-09-28T00:00:00Z',output:files.output
    });
    assert.equal(result.adaptiveMaxConcurrentTasks,20);
    assert.equal(result.reservationMaxConcurrentTasks,64);
    assert.equal(result.tasks.length,24);
  }finally{fs.rmSync(files.dir,{recursive:true,force:true});}
});


test('fixed game development target survives physical runner pressure while auxiliary work preserves owner headroom',()=>{
  const automatic=ownerFirstRunnerAllocation({tasks:[{
    id:'auto',status:'queued',executionLane:'GAME_PRIMARY',ownerDirective:false
  }]},{requestedMax:128,totalSlots:20,ownerReservedSlots:8});
  assert.equal(automatic.concurrentCeiling,128);
  assert.equal(automatic.reason,'FIXED_GAME_PRIMARY_TARGET_EXTERNAL_QUEUEING');
  const owner=ownerFirstRunnerAllocation({tasks:[{
    id:'direct',status:'queued',executionLane:'GAME_PRIMARY',ownerDirective:true
  }]},{requestedMax:128,totalSlots:20,ownerReservedSlots:8});
  assert.equal(owner.concurrentCeiling,128);
  assert.equal(owner.ownerReady,true);
  assert.equal(ownerFirstRunnerAllocation({tasks:[]},
    {lane:'game-primary',requestedMax:3,totalSlots:20,ownerReservedSlots:8}).concurrentCeiling,3);
  assert.equal(ownerFirstRunnerAllocation({tasks:[]},
    {lane:'asset-development',requestedMax:9,totalSlots:20,ownerReservedSlots:8}).concurrentCeiling,9);
  assert.equal(ownerFirstRunnerAllocation({tasks:[{
    id:'running-asset',status:'running',executionLane:'ASSET_DEVELOPMENT'
  }]},{requestedMax:128,totalSlots:20,ownerReservedSlots:8}).concurrentCeiling,128,
    'running assets may not reduce the fixed development target');
  const withOwner=ownerFirstRunnerAllocation({tasks:[
    {id:'running-asset',status:'running',executionLane:'ASSET_DEVELOPMENT'},
    {id:'owner',status:'queued',executionLane:'GAME_PRIMARY',ownerDirective:true}
  ]},{requestedMax:128,totalSlots:20,ownerReservedSlots:8});
  assert.equal(withOwner.concurrentCeiling,128);
  assert.equal(ownerFirstRunnerAllocation({tasks:[
    {id:'running-game',status:'running',executionLane:'GAME_PRIMARY'}
  ]},{lane:'asset-development',requestedMax:128,totalSlots:20,ownerReservedSlots:8}).concurrentCeiling,11);
});

test('canonical Vibe reserve activates owner-first budget but does not weaken QA, release or security checks',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  const controller=fs.readFileSync('tools/vibe2-queue-control.mjs','utf8');
  assert.match(workflow,/VIBE2_AUTONOMOUS_OWNER_RUNNER_PRIORITY: '1'/);
  assert.match(workflow,/VIBE2_HOSTED_RUNNER_LIMIT: '20'/);
  assert.match(workflow,/VIBE2_OWNER_RESERVED_SLOTS: '8'/);
  assert.match(controller,/ownerFirstRunnerAllocation\(queue/);
  assert.match(workflow,/node --test --test-concurrency=4/);
  assert.match(workflow,/candidate-awaiting-qa-and-deployment|verified_learning_memory_sha/);
});

test('asset reservation only hands off its own proven hosted runner slot',()=>{
  const opts={lane:'asset-development',requestedMax:63,observedActiveHostedJobs:'12'};
  const blocked=ownerFirstRunnerAllocation({tasks:[]},opts);
  assert.equal(blocked.admissionClosed,true);
  assert.equal(blocked.concurrentCeiling,0);
  assert.equal(blocked.reserveHandoffSlot,0);
  const handed=ownerFirstRunnerAllocation({tasks:[]},{...opts,observedCurrentReserveHostedJob:'1'});
  assert.equal(handed.observedHostedJobs,12,'real observation is never fabricated or reduced');
  assert.equal(handed.reserveHandoffSlot,1);
  assert.equal(handed.concurrentCeiling,1);
  assert.equal(handed.admissionClosed,false);
  const atPhysicalLimit=ownerFirstRunnerAllocation({tasks:[]},{...opts,observedActiveHostedJobs:'20',observedCurrentReserveHostedJob:'1'});
  assert.equal(atPhysicalLimit.concurrentCeiling,0,'no handoff if all 20 runners are occupied');
  assert.equal(atPhysicalLimit.admissionClosed,true);
  const missing=ownerFirstRunnerAllocation({tasks:[]},{lane:'asset-development',requestedMax:63,observedCurrentReserveHostedJob:'1'});
  assert.equal(missing.concurrentCeiling,0,'unknown capacity never claims free runners');
  const otherLane=ownerFirstRunnerAllocation({tasks:[]},{...opts,lane:'learning-idle',observedCurrentReserveHostedJob:'1'});
  assert.equal(otherLane.concurrentCeiling,0,'non-asset lanes may not borrow proof');
  const primary=ownerFirstRunnerAllocation({tasks:[]},{...opts,lane:'game-primary',observedCurrentReserveHostedJob:'1'});
  assert.equal(primary.concurrentCeiling,63,'game-primary logical target unchanged when separately requested');
});

// 보조 작업: 자리가 없으면 가짜 한 슬롯을 만들지 않고 실제 여유가 관측되면 재개한다.
test('auxiliary admission uses actual runner availability rather than logical development reservations',()=>{
  const tasks=Array.from({length:128},(_,i)=>({id:'game-'+i,status:'running',executionLane:'GAME_PRIMARY'}));
  const unknown=ownerFirstRunnerAllocation({tasks},{lane:'asset-development',requestedMax:63});
  assert.equal(unknown.admissionClosed,true);
  assert.equal(unknown.concurrentCeiling,0);
  const free=ownerFirstRunnerAllocation({tasks},{lane:'asset-development',requestedMax:63,observedActiveHostedJobs:'2'});
  assert.equal(free.admissionClosed,false);
  assert.equal(free.concurrentCeiling,10);
  const full=ownerFirstRunnerAllocation({tasks},{lane:'asset-development',requestedMax:63,observedActiveHostedJobs:'12'});
  assert.equal(full.admissionClosed,true);
  assert.equal(full.concurrentCeiling,0);
  const primary=ownerFirstRunnerAllocation({tasks},{lane:'GAME_PRIMARY',requestedMax:128,observedActiveHostedJobs:'20'});
  assert.equal(primary.admissionClosed,false);
  assert.equal(primary.concurrentCeiling,128);
});
