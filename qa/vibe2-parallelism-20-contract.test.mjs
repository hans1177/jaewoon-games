import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createVibeContinuousQueue, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';

test('legacy parallelism test path now reflects fixed 128 repeat-development reservation',()=>{
  const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
  const queue=createVibeContinuousQueue({maxConcurrentTasks:64,tasks:[]});
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.baselineTarget,128);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMinActiveWorkers,128);
  assert.equal(runtime.coordination.sourceRootExclusive,false);
  assert.equal(queue.scheduling.sourceRootExclusive,false);
  assert.equal(queue.scheduling.responsibleFileExclusive,true);
  assert.equal(selectVibeQueueBatch(queue,{maxConcurrentTasks:64}).effectiveMaxConcurrentTasks,64);
});
