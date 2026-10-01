import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createVibeContinuousQueue, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';

test('legacy parallelism test path now validates cap-free direct execution',()=>{
  const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
  const tasks=Array.from({length:40},(_,i)=>({
    id:`independent-${i}`,gameId:`game-${i}`,target:'web',goal:'work',status:'queued',
    sourceRoot:`web-games/game-${i}`,responsibleFiles:[`web-games/game-${i}/index.html`]
  }));
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks});
  const selection=selectVibeQueueBatch(queue,{maxConcurrentTasks:1,lane:'game-primary'});

  assert.equal(runtime.continuous.executionContract.internalGlobalParallelCap,null);
  assert.equal(runtime.continuous.executionContract.externalMatrixTransportPartitionMax,256);
  assert.equal(runtime.continuous.executionLanes.GAME_PRIMARY.internalGlobalParallelCap,null);
  assert.equal(runtime.coordination.sourceRootExclusive,false);
  assert.equal(runtime.coordination.responsibleFileExclusive,true);
  assert.equal(queue.version,6);
  assert.equal(queue.maxConcurrentTasks,null);
  assert.equal(queue.execution.internalGlobalParallelCap,null);
  assert.equal(selection.internalGlobalParallelCap,null);
  assert.equal(selection.laneMaxActiveWorkers,null);
  assert.equal(selection.selected.length,40);
});
