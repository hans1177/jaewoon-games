import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
const runtime=JSON.parse(fs.readFileSync('vibe2-runtime.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const queue=JSON.parse(fs.readFileSync('.vibe2/queue.json','utf8'));
const control=JSON.parse(fs.readFileSync('.vibe2/parallelism-control.json','utf8'));

test('maximum parallelism is default and source-root locks are permanently disabled',()=>{
  const wave=roadmap.neuralDevelopmentBrain.currentWaveExecution;
  assert.equal(wave.externalProviderAndPlanningBound,256);
  assert.equal(wave.defaultRequestedParallelism,256);
  assert.equal(wave.gamePrimaryBaselineTarget,256);
  assert.equal(wave.gamePrimaryAdaptiveMinimum,4);
  assert.equal(wave.sourceRootWideLockForbidden,true);
  assert.equal(wave.responsibleFileConflictProtectionStillRequired,true);
  assert.equal(wave.globalActiveWorkerBarrier,false);

  assert.equal(runtime.continuous.maxConcurrentGameTasks,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.baselineTarget,256);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMinActiveWorkers,4);
  assert.equal(runtime.continuous.gamePrimaryExecutionWave.adaptiveMaxActiveWorkers,256);
  assert.equal(runtime.coordination.sourceRootExclusive,false);
  assert.equal(runtime.coordination.responsibleFileExclusive,true);
  assert.equal(runtime.coordination.sameFileParallelWrite,false);
  assert.equal(runtime.coordination.stateWritesSerialized,true);
  assert.equal(runtime.safety.queueSourceRootLeaseRequired,false);
  assert.equal(runtime.safety.queueResponsibleFileConflictProtectionRequired,true);

  assert.equal(queue.scheduling.sourceRootExclusive,false);
  assert.equal(queue.scheduling.gameWideLockForbidden,true);
  assert.equal(queue.scheduling.responsibleFileExclusive,true);
  assert.equal(control.currentMax,256);

  assert.ok(runner.includes("VIBE2_MAX_CONCURRENT_GAME_TASKS: '256'"));
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '256'"));
  assert.ok(runner.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '4'"));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_BASELINE_TARGET: '256'"));
  assert.ok(core.includes("VIBE2_GAME_PRIMARY_ADAPTIVE_MIN: '4'"));
});
