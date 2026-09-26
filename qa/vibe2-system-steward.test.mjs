import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSystemStewardState, runSystemStewardFiles } from '../tools/vibe2-system-steward.mjs';

test('steward continues through stale lease retry cemetery stale telemetry and queue-cap repairs',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:32,tasks:[
      {id:'stale',gameId:'a',target:'web',goal:'x',status:'running',reservedAt:'2026-09-19T10:00:00Z'},
      {id:'dead-a',gameId:'b',target:'web',department:'development',type:'implementation',goal:'x',status:'failed',retries:3,maxRetries:2,blocker:'source-candidate-generation-failed'},
      {id:'dead-b',gameId:'c',target:'web',department:'development',type:'implementation',goal:'x',status:'failed',retries:4,maxRetries:2,blocker:'source-candidate-generation-failed'}
    ]},
    controlInput:{currentMax:4,lastUpdatedAt:'2026-09-19T09:00:00Z'}
  });
  assert.equal(result.action,'RECOVER_STALE_RUNNING_RESERVATION');
  assert.deepEqual(result.actions,['RECOVER_STALE_RUNNING_RESERVATION','RESUME_UNLIMITED_CAUSAL_REPAIR','PERSIST_REPEATED_FAILURE_SIGNATURE_SCOPE','RESET_INVALID_PARALLELISM_STATE','ALIGN_QUEUE_EXTERNAL_BOUNDARY_256']);
  assert.equal(result.queue.maxConcurrentTasks,256);
  assert.equal(result.control.currentMax,256);
  assert.equal(result.queue.tasks.find(t=>t.id==='stale').status,'queued');
  for(const id of ['dead-a','dead-b']){
    const task=result.queue.tasks.find(t=>t.id===id);
    assert.equal(task.status,'queued'); assert.equal(task.retries,id==='dead-a'?3:4);
    assert.equal(task.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
    assert.equal(task.maxRetries,null);
    assert(task.evidence.includes('repair-mode:UNLIMITED_CAUSAL_REPAIR'));
    assert(task.evidence.includes('system-steward:failure-signature:source-candidate-generation-failed'));
    assert(task.evidence.includes('system-steward:fix-pattern:causal-repair-without-attempt-ceiling'));
  }
});

test('steward preserves expired lease while its GitHub Actions reservation run is live',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    liveReservationRunIds:new Set(['36229097447']),
    queueInput:{maxConcurrentTasks:256,tasks:[{
      id:'live-stale-age',gameId:'a',target:'web',department:'development',type:'implementation',goal:'x',
      status:'running',reservationId:'36229097447:1',reservationRunId:'36229097447',reservationRunAttempt:1,
      reservedAt:'2026-09-19T10:00:00Z'
    }]},
    controlInput:{version:4,currentMax:256,lastUpdatedAt:'2026-09-19T11:59:00Z'}
  });
  const task=result.queue.tasks.find(t=>t.id==='live-stale-age');
  assert.equal(task.status,'running');
  assert.equal(task.reservationId,'36229097447:1');
  assert.equal(result.actions.includes('RECOVER_STALE_RUNNING_RESERVATION'),false);
  assert.equal(result.liveReservationRunCount,1);
  assert.equal(result.liveReservationProtectedCount,1);
});

test('steward resumes safe development failure with unlimited causal repair without erasing retry history',()=>{
  const result=runSystemStewardState({now:'2026-09-19T12:00:00Z',queueInput:{maxConcurrentTasks:256,tasks:[{id:'dead',gameId:'b',target:'web',department:'development',type:'implementation',goal:'x',status:'failed',retries:3,maxRetries:2,recoveryGeneration:1}]},controlInput:{currentMax:256}});
  const task=result.queue.tasks[0];
  assert.equal(result.action,'RESUME_UNLIMITED_CAUSAL_REPAIR'); assert.equal(task.status,'queued'); assert.equal(task.retries,3); assert.equal(task.recoveryGeneration,2);
  assert.equal(task.retryPolicy,'UNLIMITED_CAUSAL_REPAIR'); assert.equal(task.maxRetries,null);
  assert(task.evidence.includes('system-steward:unlimited-causal-repair:resume:generation-2'));
  assert(task.evidence.includes('repair-mode:UNLIMITED_CAUSAL_REPAIR'));
});

test('steward expires stale valid backpressure back to 256 while keeping 256 as external boundary',()=>{
  const result=runSystemStewardState({now:'2026-09-19T12:00:00Z',queueInput:{maxConcurrentTasks:256,tasks:[]},controlInput:{currentMax:32,lastDecision:'DOWN',lastReason:'RUNNER_QUEUE_WAIT',lastUpdatedAt:'2026-09-19T09:00:00Z',lastTelemetry:{runId:'pressure-1',pressureLevel:'HIGH',queueWaitP95Ms:45000}}});
  assert.equal(result.action,'RESET_STALE_PARALLELISM_PRESSURE'); assert.equal(result.control.currentMax,256); assert.equal(result.control.lastDecision,'RESET');
  assert.equal(result.control.lastReason,'SYSTEM_STEWARD_STALE_TELEMETRY_RESET_TO_256');
  assert.equal(result.queue.maxConcurrentTasks,256);
});

test('steward immediately repairs invalid v4 parallelism and requeues stale machine blockers in the same pass',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:30,tasks:[
      {id:'blocked-dev',gameId:'bug-defense',target:'web',goal:'continue game development',status:'blocked',blocker:'MACHINE_STATE_INCONSISTENT:QUEUE_MAX_DIVERGED|PERSISTENT_MAX_OUTSIDE_STEPS'}
    ]},
    controlInput:{version:4,currentMax:12,lastUpdatedAt:'2026-09-19T11:59:00Z'}
  });
  const task=result.queue.tasks[0];
  assert.equal(result.queue.maxConcurrentTasks,256);
  assert.equal(result.control.currentMax,256);
  assert.equal(result.control.lastReason,'SYSTEM_STEWARD_INVALID_V4_PARALLELISM_STATE_RESET_TO_256');
  assert.equal(task.status,'queued');
  assert.equal(task.blocker,null);
  assert(result.actions.includes('RESET_INVALID_PARALLELISM_STATE'));
  assert(result.actions.includes('ALIGN_QUEUE_EXTERNAL_BOUNDARY_256'));
  assert(result.actions.includes('RECOVER_STALE_MACHINE_STATE_BLOCKER'));
  assert.equal(result.changedControl,true);
  assert.equal(result.changedQueue,true);
});

test('steward accepts a fresh verified-pressure downshift as a valid v4 adaptive step',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:256,tasks:[{id:'dev',gameId:'g',target:'web',goal:'x',status:'queued'}]},
    controlInput:{version:4,currentMax:20,lastDecision:'DOWN',lastReason:'RUNNER_QUEUE_WAIT',lastUpdatedAt:'2026-09-19T11:59:00Z',lastTelemetry:{runId:'pressure-2',pressureLevel:'HIGH',queueWaitP95Ms:45000}}
  });
  assert.equal(result.control.currentMax,20);
  assert.equal(result.actions.includes('RESET_INVALID_PARALLELISM_STATE'),false);
  assert.equal(result.actions.includes('RESET_STALE_PARALLELISM_PRESSURE'),false);
});

test('steward rejects a fresh lower adaptive step without verified pressure evidence',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:256,tasks:[]},
    controlInput:{version:4,currentMax:20,lastDecision:'HOLD',lastUpdatedAt:'2026-09-19T11:59:00Z'}
  });
  assert.equal(result.control.currentMax,256);
  assert.equal(result.control.lastReason,'SYSTEM_STEWARD_INVALID_V4_PARALLELISM_STATE_RESET_TO_256');
  assert.ok(result.actions.includes('RESET_INVALID_PARALLELISM_STATE'));
});

test('steward does not consume a repair on external wait work',()=>{
  const result=runSystemStewardState({now:'2026-09-19T12:00:00Z',queueInput:{maxConcurrentTasks:256,tasks:[{id:'wait',gameId:'r',target:'roblox',goal:'runtime',status:'running',blocker:'roblox-dedicated-runner-offline-deferred',reservedAt:'2026-09-19T09:00:00Z'}]},controlInput:{currentMax:256,lastUpdatedAt:'2026-09-19T11:50:00Z'}});
  assert.equal(result.action,'NO_RUNNABLE_WORK_FOR_PLANNER_REFILL');
});


test('steward requeues stale machine-state blockers only after raw state is normalized',()=>{
  const healthy=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:256,tasks:[
      {id:'stale-machine',gameId:'g',target:'web',goal:'x',status:'blocked',blocker:'MACHINE_STATE_INCONSISTENT:PARALLELISM_VERSION_MISMATCH|QUEUE_MAX_DIVERGED|PERSISTENT_MAX_OUTSIDE_STEPS|PERSISTENT_MAX_ABOVE_CONFIGURED'}
    ]},
    controlInput:{version:4,currentMax:256,lastUpdatedAt:'2026-09-19T11:59:00Z'}
  });
  const recovered=healthy.queue.tasks[0];
  assert.equal(healthy.action,'RECOVER_STALE_MACHINE_STATE_BLOCKER');
  assert.equal(recovered.status,'queued');
  assert.equal(recovered.blocker,null);
  assert.equal(recovered.lastOutcome,'SYSTEM_STEWARD_STALE_MACHINE_BLOCKER_RECOVERED');
  assert(recovered.evidence.includes('system-steward:machine-state-revalidated:v4-external-boundary-256'));

  const unhealthy=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:32,tasks:[
      {id:'real-machine-block',gameId:'g',target:'web',goal:'x',status:'blocked',blocker:'MACHINE_STATE_INCONSISTENT:QUEUE_MAX_DIVERGED'}
    ]},
    controlInput:{version:2,currentMax:32,lastUpdatedAt:'2026-09-19T11:59:00Z'}
  });
  assert.equal(unhealthy.queue.tasks[0].status,'blocked');
  assert.equal(unhealthy.queue.tasks[0].blocker,'MACHINE_STATE_INCONSISTENT:QUEUE_MAX_DIVERGED');
  assert.equal(unhealthy.actions.includes('RECOVER_STALE_MACHINE_STATE_BLOCKER'),false);
});


test('steward never reopens bounded QA or protected failures as unlimited causal repair',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:256,tasks:[
      {id:'qa-fail',gameId:'q',target:'web',department:'qa',type:'qa',goal:'verify',status:'failed',retries:9,maxRetries:2,blocker:'qa-failed'},
      {id:'protected-dev',gameId:'p',target:'web',department:'development',type:'implementation',goal:'protected',status:'failed',retries:9,maxRetries:2,protectedChange:true,blocker:'protected-failed'}
    ]},
    controlInput:{currentMax:20,lastUpdatedAt:'2026-09-19T11:59:00Z'}
  });
  assert.equal(result.actions.includes('RESUME_UNLIMITED_CAUSAL_REPAIR'),false);
  assert.equal(result.queue.tasks.find(t=>t.id==='qa-fail').status,'failed');
  assert.equal(result.queue.tasks.find(t=>t.id==='protected-dev').status,'failed');
});


test('steward repairs an actual zero-byte queue file before handoff preflight',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-steward-blank-'));
  const queueFile=path.join(dir,'queue.json');
  const controlFile=path.join(dir,'parallelism.json');
  fs.writeFileSync(queueFile,'','utf8');
  fs.writeFileSync(controlFile,JSON.stringify({version:4,currentMax:20,lastDecision:'HOLD'}),'utf8');
  const result=runSystemStewardFiles({queueFile,controlFile,now:'2026-09-25T00:00:00Z'});
  assert.equal(result.recoveredBlankQueue,true);
  assert.equal(result.changedQueue,true);
  const repaired=JSON.parse(fs.readFileSync(queueFile,'utf8'));
  assert.equal(repaired.version,5);
  assert.equal(repaired.maxConcurrentTasks,256);
  assert.deepEqual(repaired.tasks,[]);
  assert.equal(JSON.parse(fs.readFileSync(controlFile,'utf8')).version,4);
});

test('steward migrates explicit legacy v3 parallelism state to v4',()=>{
  const result=runSystemStewardState({
    now:'2026-09-25T00:00:00Z',
    queueInput:{maxConcurrentTasks:256,tasks:[]},
    controlInput:{version:3,currentMax:20,lastDecision:'HOLD'}
  });
  assert.equal(result.control.version,4);
  assert.equal(result.control.currentMax,256);
  assert.equal(result.control.lastReason,'SYSTEM_STEWARD_INVALID_V4_PARALLELISM_STATE_RESET_TO_256');
  assert.ok(result.actions.includes('RESET_INVALID_PARALLELISM_STATE'));
});
