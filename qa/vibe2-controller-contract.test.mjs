// 파일명: qa/vibe2-controller-contract.test.mjs
// 역할: Vibe2 24시간 컨트롤러의 엔진 분기, 계층형 병렬, source lock, fan-out/fan-in, incremental QA 안전 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createVibeEngineAdapter } from '../assets/vibe-engine-adapter.js';
import { classifyVibeExecutionRoute } from '../tools/vibe2-continuous-runner.mjs';

const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
const runtime=JSON.parse(fs.readFileSync(new URL('../vibe2-runtime.json',import.meta.url),'utf8'));

test('Unreal C++ routes to text worker but Blueprint/uasset route to editor',()=>{
  const adapter=createVibeEngineAdapter({target:'unreal',gameSlug:'demo'});
  assert.equal(classifyVibeExecutionRoute({target:'unreal',task:{type:'implementation',goal:'Hero.cpp 수정',responsibleFiles:['unreal-games/demo/Source/Demo/Hero.cpp']},adapter}).route,'text-source-worker');
  assert.equal(classifyVibeExecutionRoute({target:'unreal',task:{type:'implementation',goal:'Animation Blueprint Montage 수정',responsibleFiles:[]},adapter}).route,'engine-editor');
  assert.equal(classifyVibeExecutionRoute({target:'unreal',task:{type:'implementation',goal:'캐릭터 수정',responsibleFiles:['unreal-games/demo/Content/Hero.uasset']},adapter}).reason,'responsible-binary-asset');
});

test('non-write QA routes to analysis only',()=>{
  const adapter=createVibeEngineAdapter({target:'unity',gameSlug:'demo'});
  assert.equal(classifyVibeExecutionRoute({target:'unity',task:{type:'qa',goal:'빌드 오류 조사',responsibleFiles:[]},adapter}).route,'analysis-only');
});

test('runtime enables DAG sharding work stealing and bounded parallelism',()=>{
  assert.equal(runtime.version,5);
  assert.equal(runtime.continuous.strategy,'hierarchical-dag-sharded-work-stealing');
  assert.equal(runtime.continuous.maxConcurrentGameTasks,4);
  assert.equal(runtime.continuous.unityReleaseFocusSlots,1);
  assert.equal(runtime.continuous.workStealing,true);
  assert.equal(runtime.continuous.dynamicBackpressure,true);
  assert.equal(runtime.continuous.speculativeParallelism.enabled,true);
  assert.equal(runtime.coordination.sourceRootExclusive,true);
  assert.equal(runtime.coordination.separateFileLocks,true);
  assert.equal(runtime.coordination.fanOutFanIn,true);
  assert.equal(runtime.qaOptimization.incrementalFirst,true);
  assert.equal(runtime.qaOptimization.contentHashCache,true);
  assert.equal(runtime.qaOptimization.fullCoreRegressionOnceAtFanIn,true);
  assert.equal(runtime.safety.existingWebMaintenanceAllowed,true);
  assert.equal(runtime.safety.newWebGameAutomatic,false);
  assert.equal(runtime.assetDecision.learningMayOverrideFixedRules,false);
});

test('controller reserves a batch and fans workers out with a bounded matrix',()=>{
  assert(workflow.includes('reserve-batch'));
  assert(workflow.includes('strategy:'));
  assert(workflow.includes('max-parallel: 4'));
  assert(workflow.includes('matrix: ${{ fromJSON(needs.reserve.outputs.worker_matrix) }}'));
  assert(workflow.includes('group: vibe2-control-state-vibe2-unreal-core'));
  assert(workflow.includes('VIBE2_HIERARCHICAL_FAN_OUT'));
  assert(workflow.includes('VIBE2_HIERARCHICAL_FAN_IN=PASS'));
});

test('controller starts isolated candidates from fresh main and never writes main directly',()=>{
  assert(workflow.includes('git fetch origin main'));
  assert(workflow.includes('git worktree add -b "$candidate_branch" "$candidate_dir" origin/main'));
  assert(workflow.includes('export VIBE2_BASE_MAIN_SHA="$base_sha"'));
  assert(workflow.includes('vibe2/candidate/'));
  assert(workflow.includes('candidate-awaiting-qa-and-deployment'));
  assert(!workflow.includes('git push origin HEAD:main'));
  assert(!workflow.includes('vibe2-queue-control.mjs pass'));
});

test('controller runs content-hash incremental QA per worker and full core regression once at fan-in',()=>{
  assert(workflow.includes('actions/cache@v4'));
  assert(workflow.includes('tools/vibe2-incremental-qa.mjs'));
  assert(workflow.includes('incremental-qa-hash:'));
  assert(workflow.includes('Run the complete Vibe2 core regression once at fan-in'));
  assert(workflow.includes('node --test qa/vibe2-controller-contract.test.mjs'));
});

test('controller serializes only shared queue state writes while worker branches stay parallel',()=>{
  assert(workflow.includes('concurrency:\n      group: vibe2-control-state-vibe2-unreal-core'));
  assert(workflow.includes('actions/upload-artifact@v4'));
  assert(workflow.includes('actions/download-artifact@v4'));
  assert(workflow.includes('vibe2-queue-control.mjs fan-in'));
  assert(!workflow.includes('vibe2-remote-work-lock.mjs'));
});

test('controller allows approved source root but enforces candidate boundary',()=>{
  assert(workflow.includes('git add "$SOURCE_ROOT" .vibe2/candidates'));
  assert(workflow.includes('candidate escaped approved boundary'));
});

test('event-driven refill removes hourly-only idle gaps',()=>{
  assert(workflow.includes('Event-driven refill of free slots'));
  assert(workflow.includes('gh workflow run vibe2-24h-runner.yml'));
  assert.equal(runtime.continuous.wakeMode,'event-driven-plus-hourly-safety-net');
});
