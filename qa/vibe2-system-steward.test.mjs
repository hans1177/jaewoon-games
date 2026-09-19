import test from 'node:test';
import assert from 'node:assert/strict';
import { runSystemStewardState } from '../tools/vibe2-system-steward.mjs';

test('steward continues through stale lease retry cemetery stale telemetry and queue-cap repairs',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:32,tasks:[
      {id:'stale',gameId:'a',target:'web',goal:'x',status:'running',reservedAt:'2026-09-19T10:00:00Z'},
      {id:'dead-a',gameId:'b',target:'web',goal:'x',status:'failed',retries:3,maxRetries:2,blocker:'source-candidate-generation-failed'},
      {id:'dead-b',gameId:'c',target:'web',goal:'x',status:'failed',retries:4,maxRetries:2,blocker:'source-candidate-generation-failed'}
    ]},
    controlInput:{currentMax:4,lastUpdatedAt:'2026-09-19T09:00:00Z'}
  });
  assert.equal(result.action,'RECOVER_STALE_RUNNING_RESERVATION');
  assert.deepEqual(result.actions,['RECOVER_STALE_RUNNING_RESERVATION','REGENERATE_RETRY_EXHAUSTED_TASK','PERSIST_REPEATED_FAILURE_SIGNATURE_SCOPE','RESET_STALE_PARALLELISM_PRESSURE','ALIGN_QUEUE_MAX_TO_EXTERNAL_WAVE_256']);
  assert.equal(result.queue.maxConcurrentTasks,256);
  assert.equal(result.control.currentMax,256);
  assert.equal(result.queue.tasks.find(t=>t.id==='stale').status,'queued');
  for(const id of ['dead-a','dead-b']){
    const task=result.queue.tasks.find(t=>t.id===id);
    assert.equal(task.status,'queued'); assert.equal(task.retries,0);
    assert(task.evidence.includes('system-steward:failure-signature:source-candidate-generation-failed'));
    assert(task.evidence.includes('system-steward:fix-pattern:retry-exhausted-causal-regeneration'));
  }
});

test('steward regenerates retry-exhausted useful work with a new generation',()=>{
  const result=runSystemStewardState({now:'2026-09-19T12:00:00Z',queueInput:{maxConcurrentTasks:256,tasks:[{id:'dead',gameId:'b',target:'web',goal:'x',status:'failed',retries:3,maxRetries:2,recoveryGeneration:1}]},controlInput:{currentMax:256}});
  const task=result.queue.tasks[0];
  assert.equal(result.action,'REGENERATE_RETRY_EXHAUSTED_TASK'); assert.equal(task.status,'queued'); assert.equal(task.retries,0); assert.equal(task.recoveryGeneration,2); assert.equal(task.speculativeEligible,true);
  assert(task.evidence.includes('repair-mode:CAUSAL_REGENERATION_GENERATION_2'));
});

test('steward expires stale backpressure and restores the 256 external execution wave',()=>{
  const result=runSystemStewardState({now:'2026-09-19T12:00:00Z',queueInput:{maxConcurrentTasks:256,tasks:[]},controlInput:{currentMax:4,lastUpdatedAt:'2026-09-19T09:00:00Z'}});
  assert.equal(result.action,'RESET_STALE_PARALLELISM_PRESSURE'); assert.equal(result.control.currentMax,256); assert.equal(result.control.lastDecision,'RESET');
});

test('steward immediately repairs invalid v3 parallelism and requeues stale machine blockers in the same pass',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:30,tasks:[
      {id:'blocked-dev',gameId:'bug-defense',target:'web',goal:'continue game development',status:'blocked',blocker:'MACHINE_STATE_INCONSISTENT:QUEUE_MAX_DIVERGED|PERSISTENT_MAX_OUTSIDE_STEPS'}
    ]},
    controlInput:{version:3,currentMax:12,lastUpdatedAt:'2026-09-19T11:59:00Z'}
  });
  const task=result.queue.tasks[0];
  assert.equal(result.queue.maxConcurrentTasks,256);
  assert.equal(result.control.currentMax,256);
  assert.equal(result.control.lastReason,'SYSTEM_STEWARD_INVALID_V3_PARALLELISM_STEP_RESET');
  assert.equal(task.status,'queued');
  assert.equal(task.blocker,null);
  assert(result.actions.includes('RESET_INVALID_PARALLELISM_STATE'));
  assert(result.actions.includes('ALIGN_QUEUE_MAX_TO_EXTERNAL_WAVE_256'));
  assert(result.actions.includes('RECOVER_STALE_MACHINE_STATE_BLOCKER'));
  assert.equal(result.changedControl,true);
  assert.equal(result.changedQueue,true);
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
    controlInput:{version:3,currentMax:256,lastUpdatedAt:'2026-09-19T11:59:00Z'}
  });
  const recovered=healthy.queue.tasks[0];
  assert.equal(healthy.action,'RECOVER_STALE_MACHINE_STATE_BLOCKER');
  assert.equal(recovered.status,'queued');
  assert.equal(recovered.blocker,null);
  assert.equal(recovered.lastOutcome,'SYSTEM_STEWARD_STALE_MACHINE_BLOCKER_RECOVERED');
  assert(recovered.evidence.includes('system-steward:machine-state-revalidated:v3-external-wave-256'));

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
