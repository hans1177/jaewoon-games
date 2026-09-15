import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createVibeContinuousQueue, selectVibeQueueBatch, DEFAULT_MAX_CONCURRENT_TASKS } from '../assets/vibe-continuous-queue.js';

const read=p=>fs.readFileSync(p,'utf8');

test('core parallelism contract is uniformly 20',()=>{
  const workflow=read('.github/workflows/vibe2-continuous-core.yml');
  const planner=read('tools/vibe2-auto-planner.mjs');
  const queueControl=read('tools/vibe2-queue-control.mjs');
  const telemetry=read('tools/vibe2-parallelism-telemetry.mjs');
  assert.equal(DEFAULT_MAX_CONCURRENT_TASKS,20);
  assert.match(workflow,/VIBE2_MAX_CONCURRENT_GAME_TASKS: '20'/);
  assert.match(workflow,/max-parallel: 20/);
  assert.match(workflow,/model_cache:/);
  assert.match(workflow,/uses: actions\/cache@v4/);
  assert.match(workflow,/uses: actions\/cache\/restore@v4/);
  assert.match(workflow,/VIBE2_LOCAL_MODEL_SOURCE=CACHE/);
  assert.match(workflow,/VIBE2_LOCAL_MODEL_SOURCE=FALLBACK_PULL/);
  assert.match(workflow,/vibe2-ollama-v2-Linux-qwen3-1\.7b/);
  assert.match(workflow,/~\/.cache\/vibe2-ollama\/bin\/ollama/);
  assert.match(workflow,/VIBE2_OLLAMA_RUNTIME_SOURCE=CACHE/);
  assert.match(workflow,/VIBE2_OLLAMA_RUNTIME_SOURCE=FALLBACK_INSTALL/);
  assert.match(workflow,/worker:[\s\S]*?ref: vibe2-unreal-core\n\s+fetch-depth: 1/);
  assert.match(workflow,/git fetch --depth=1 origin main:refs\/remotes\/origin\/main --quiet/);
  assert.match(workflow,/fan_in:[\s\S]*?ref: vibe2-unreal-core\n\s+fetch-depth: 0/);
  assert.match(workflow,/Mark worker start/);
  assert.match(workflow,/Aggregate Vibe2 parallelism telemetry/);
  assert.match(workflow,/vibe2-parallelism-telemetry\.mjs/);
  assert.match(queueControl,/version:3/);
  assert.match(queueControl,/persistentMaxConcurrentTasks/);
  assert.match(queueControl,/requestedMaxConcurrentTasks/);
  assert.match(queueControl,/effectiveMaxConcurrentTasks/);
  assert.match(telemetry,/actualPeakConcurrency/);
  assert.match(planner,/Math\.min\(20,/);
  assert.match(queueControl,/function maxConcurrent\(value\) \{ return Math\.max\(1, Math\.min\(20,/);
  const q=createVibeContinuousQueue({maxConcurrentTasks:999,tasks:[]});
  assert.equal(q.maxConcurrentTasks,20);
});

test('20 slot queue uses adaptive backpressure instead of fixed throttling',()=>{
  const base=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});
  assert.equal(selectVibeQueueBatch(base,{maxConcurrentTasks:20}).effectiveMaxConcurrentTasks,20);
  const pressured=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:Array.from({length:8},(_,i)=>({id:`q${i}`,gameId:`q${i}`,target:'web',sourceRoot:`web-games/q${i}`,goal:'q',status:'running',blocker:'candidate-awaiting-qa-and-deployment'}))});
  const selection=selectVibeQueueBatch(pressured,{maxConcurrentTasks:20});
  assert.equal(selection.effectiveMaxConcurrentTasks,4);
  assert.equal(selection.capacityRunning.length,0);
  assert.equal(selection.freeSlots,4);
});

test('persisted queue cap remains a hard ceiling over per-run requests',()=>{
  const queue=createVibeContinuousQueue({maxConcurrentTasks:6,tasks:Array.from({length:10},(_,i)=>({id:`q${i}`,gameId:`q${i}`,target:'web',sourceRoot:`web-games/q${i}`,goal:'q'}))});
  const selection=selectVibeQueueBatch(queue,{maxConcurrentTasks:20});
  assert.equal(selection.persistentMaxConcurrentTasks,6);
  assert.equal(selection.requestedMaxConcurrentTasks,20);
  assert.equal(selection.effectiveMaxConcurrentTasks,6);
  assert.equal(selection.selected.length,6);
});
