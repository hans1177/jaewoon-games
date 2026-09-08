// 파일명: qa/vibe2-controller-contract.test.mjs
// 역할: Vibe2 24시간 컨트롤러의 엔진 분기, 직렬 실행, 최신 main 후보 생성 안전 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createVibeEngineAdapter } from '../assets/vibe-engine-adapter.js';
import { classifyVibeExecutionRoute } from '../tools/vibe2-continuous-runner.mjs';

const workflow = fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml', import.meta.url), 'utf8');
const runtime = JSON.parse(fs.readFileSync(new URL('../vibe2-runtime.json', import.meta.url), 'utf8'));

test('Unreal C++ routes to text worker but Blueprint/uasset route to editor', () => {
  const adapter = createVibeEngineAdapter({ target:'unreal', gameSlug:'demo' });
  assert.equal(classifyVibeExecutionRoute({ target:'unreal', task:{ type:'implementation', goal:'Hero.cpp 수정', responsibleFiles:['unreal-games/demo/Source/Demo/Hero.cpp'] }, adapter }).route, 'text-source-worker');
  assert.equal(classifyVibeExecutionRoute({ target:'unreal', task:{ type:'implementation', goal:'Animation Blueprint Montage 수정', responsibleFiles:[] }, adapter }).route, 'engine-editor');
  assert.equal(classifyVibeExecutionRoute({ target:'unreal', task:{ type:'implementation', goal:'캐릭터 수정', responsibleFiles:['unreal-games/demo/Content/Hero.uasset'] }, adapter }).reason, 'responsible-binary-asset');
});

test('non-write QA routes to analysis only', () => {
  const adapter = createVibeEngineAdapter({ target:'unity', gameSlug:'demo' });
  assert.equal(classifyVibeExecutionRoute({ target:'unity', task:{ type:'qa', goal:'빌드 오류 조사', responsibleFiles:[] }, adapter }).route, 'analysis-only');
});

test('runtime uses one serial worker without separate file locks', () => {
  assert.equal(runtime.version, 4);
  assert.equal(runtime.continuous.strategy, 'single-worker-priority-serial-queue');
  assert.equal(runtime.continuous.maxConcurrentGameTasks, 1);
  assert.deepEqual(runtime.continuous.priorityOrder, ['owner-directive','release-confirmed','development-confirmed','reviewing','other']);
  assert.equal(runtime.coordination.separateFileLocks, false);
  assert.equal(runtime.safety.sharedWorkLockRequired, false);
  assert.equal(runtime.safety.existingWebMaintenanceAllowed, true);
  assert.equal(runtime.safety.newWebGameAutomatic, false);
  assert.equal(runtime.assetDecision.learningMayOverrideFixedRules, false);
});

test('controller starts candidates from fresh main and never writes main directly', () => {
  assert(workflow.includes('group: vibe2-single-game-worker'));
  assert(workflow.includes('timeout-minutes: 20'));
  assert(workflow.includes('--model-calls=1'));
  assert(workflow.includes('--runner-minutes=20'));
  assert(workflow.includes('git fetch origin main'));
  assert(workflow.includes('git worktree add -b "$candidate_branch" "$candidate_dir" origin/main'));
  assert(workflow.includes('export VIBE2_BASE_MAIN_SHA="$base_sha"'));
  assert(workflow.includes('vibe2/candidate/'));
  assert(workflow.includes('candidate-awaiting-qa-and-deployment'));
  assert(workflow.includes('vibe2-queue-control.mjs await'));
  assert(!workflow.includes('git push origin HEAD:main'));
  assert(!workflow.includes('vibe2-queue-control.mjs pass'));
});

test('controller operational path contains no shared Work Lock', () => {
  assert(!workflow.includes('vibe2-remote-work-lock.mjs'));
  assert(!workflow.includes('shared-work-lock'));
  assert(!workflow.includes('vibe2-work-locks'));
  assert(workflow.includes('VIBE2_SEPARATE_FILE_LOCK=NO'));
});

test('controller allows approved web source root but keeps candidate boundary', () => {
  assert(workflow.includes('git add "$SOURCE_ROOT" .vibe2/candidates'));
  assert(workflow.includes('candidate escaped approved boundary'));
  assert(!workflow.includes('web-games write forbidden'));
});

test('controller chains only after failure or non-QA block, not while candidate awaits QA', () => {
  assert(workflow.includes('gh workflow run vibe2-24h-runner.yml'));
  assert(workflow.includes("steps.candidate.outcome == 'success'"));
  assert(workflow.includes("steps.candidate.outcome != 'success'"));
});
