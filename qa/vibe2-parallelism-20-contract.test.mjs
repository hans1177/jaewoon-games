import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createVibeContinuousQueue, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';

test('legacy parallelism test path keeps external max 256 with owner game-primary floor 30',()=>{
  const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
  const queue=createVibeContinuousQueue({maxConcurrentTasks:256,tasks:[]});
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.baselineTarget,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMinActiveWorkers,30);
  assert.equal(runtime.coordination.sourceRootExclusive,false);
  assert.equal(queue.scheduling.sourceRootExclusive,false);
  assert.equal(queue.scheduling.responsibleFileExclusive,true);
  assert.equal(selectVibeQueueBatch(queue,{maxConcurrentTasks:256}).effectiveMaxConcurrentTasks,256);
});
