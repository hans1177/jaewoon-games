import test from 'node:test';
import assert from 'node:assert/strict';
import { runSystemStewardState } from '../tools/vibe2-system-steward.mjs';

test('steward recovers one stale running lease before lower priority repairs',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:30,tasks:[
      {id:'stale',gameId:'a',target:'web',goal:'x',status:'running',reservedAt:'2026-09-19T10:00:00Z'},
      {id:'dead',gameId:'b',target:'web',goal:'x',status:'failed',retries:3,maxRetries:2}
    ]},
    controlInput:{currentMax:4,lastUpdatedAt:'2026-09-19T09:00:00Z'}
  });
  assert.equal(result.action,'RECOVER_STALE_RUNNING_RESERVATION');
  assert.equal(result.taskId,'stale');
  assert.equal(result.queue.tasks.find(t=>t.id==='stale').status,'queued');
  assert.equal(result.queue.tasks.find(t=>t.id==='dead').status,'failed');
});

test('steward regenerates retry-exhausted useful work with a new generation',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:30,tasks:[
      {id:'dead',gameId:'b',target:'web',goal:'x',status:'failed',retries:3,maxRetries:2,recoveryGeneration:1}
    ]},
    controlInput:{currentMax:30}
  });
  assert.equal(result.action,'REGENERATE_RETRY_EXHAUSTED_TASK');
  const task=result.queue.tasks[0];
  assert.equal(task.status,'queued');
  assert.equal(task.retries,0);
  assert.equal(task.recoveryGeneration,2);
  assert.equal(task.speculativeEligible,true);
  assert(task.evidence.includes('repair-mode:CAUSAL_REGENERATION_GENERATION_2'));
});

test('steward expires stale backpressure and restores the 30-lane ceiling',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:30,tasks:[]},
    controlInput:{currentMax:4,lastUpdatedAt:'2026-09-19T09:00:00Z'}
  });
  assert.equal(result.action,'RESET_STALE_PARALLELISM_PRESSURE');
  assert.equal(result.control.currentMax,30);
  assert.equal(result.control.lastDecision,'RESET');
});

test('steward does not consume a repair on external wait work',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{maxConcurrentTasks:30,tasks:[
      {id:'wait',gameId:'r',target:'roblox',goal:'runtime',status:'running',blocker:'roblox-dedicated-runner-offline-deferred',reservedAt:'2026-09-19T09:00:00Z'}
    ]},
    controlInput:{currentMax:30,lastUpdatedAt:'2026-09-19T11:50:00Z'}
  });
  assert.equal(result.action,'NO_RUNNABLE_WORK_FOR_PLANNER_REFILL');
});
