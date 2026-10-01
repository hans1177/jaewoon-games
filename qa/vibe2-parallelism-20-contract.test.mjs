import test from 'node:test';
import assert from 'node:assert/strict';
import { createVibeContinuousQueue, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';

test('legacy max values do not cap independent general work',()=>{
  const tasks=Array.from({length:40},(_,i)=>({
    id:`t-${i}`,
    gameId:`g-${i}`,
    target:'web',
    department:'development',
    type:'implementation',
    goal:'independent work',
    sourceRoot:`web-games/g-${i}`,
    responsibleFiles:[`f-${i}.js`],
    status:'queued'
  }));
  const queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks});
  const selection=selectVibeQueueBatch(queue,{lane:'game-primary',maxConcurrentTasks:20});
  assert.equal(queue.version,6);
  assert.equal(queue.maxConcurrentTasks,null);
  assert.equal(selection.internalGlobalParallelCap,null);
  assert.equal(selection.laneMaxActiveWorkers,null);
  assert.equal(selection.selected.length,40);
});

test('fixed learning and asset lanes retain only their explicit worker limits',()=>{
  const learningTasks=Array.from({length:3},(_,i)=>({
    id:`learn-${i}`,gameId:`learn-${i}`,target:'web',department:'development',type:'research',
    goal:'practice',status:'queued',evidence:['learning-practice-only']
  }));
  const learning=selectVibeQueueBatch(createVibeContinuousQueue({tasks:learningTasks}),{lane:'learning-idle'});
  assert.equal(learning.laneMaxActiveWorkers,1);
  assert.equal(learning.selected.length,1);

  const assetTasks=Array.from({length:70},(_,i)=>({
    id:`asset-${i}`,gameId:`asset-${i}`,target:'unity',department:'development',type:'implementation',
    goal:'asset production',status:'queued',assetProductionLane:true,
    sourceRoot:`unity-games/asset-${i}`,responsibleFiles:[`Assets/a-${i}.txt`],evidence:['asset-production-parallel:v1']
  }));
  const asset=selectVibeQueueBatch(createVibeContinuousQueue({tasks:assetTasks}),{lane:'asset-development'});
  assert.equal(asset.laneMaxActiveWorkers,64);
  assert.equal(asset.selected.length,64);
});
