// 파일명: qa/vibe2-controller-contract.test.mjs
// 역할: Vibe2 24시간 컨트롤러의 엔진 실행 분기와 안전 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createVibeEngineAdapter } from '../assets/vibe-engine-adapter.js';
import { classifyVibeExecutionRoute } from '../tools/vibe2-continuous-runner.mjs';

const workflow = fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml', import.meta.url), 'utf8');

test('Unreal C++ routes to text source worker', () => {
  const adapter = createVibeEngineAdapter({ target: 'unreal', gameSlug: 'demo' });
  const route = classifyVibeExecutionRoute({
    target: 'unreal',
    task: {
      type: 'implementation',
      goal: 'Unreal C++ Hero.cpp 이동 로직 수정',
      responsibleFiles: ['unreal-games/demo/Source/Demo/Hero.cpp']
    },
    adapter
  });
  assert.equal(route.route, 'text-source-worker');
  assert.equal(route.requiresEditor, false);
});

test('Unreal Blueprint and uasset route to engine editor', () => {
  const adapter = createVibeEngineAdapter({ target: 'unreal', gameSlug: 'demo' });
  const blueprint = classifyVibeExecutionRoute({
    target: 'unreal',
    task: { type: 'implementation', goal: 'Animation Blueprint와 Montage 전환 수정', responsibleFiles: [] },
    adapter
  });
  assert.equal(blueprint.route, 'engine-editor');
  assert.equal(blueprint.requiresEditor, true);

  const binary = classifyVibeExecutionRoute({
    target: 'unreal',
    task: { type: 'implementation', goal: '캐릭터 모션 수정', responsibleFiles: ['unreal-games/demo/Content/Hero.uasset'] },
    adapter
  });
  assert.equal(binary.route, 'engine-editor');
  assert.equal(binary.reason, 'responsible-binary-asset');
});

test('non-write QA task routes to analysis only', () => {
  const adapter = createVibeEngineAdapter({ target: 'unity', gameSlug: 'demo' });
  const route = classifyVibeExecutionRoute({
    target: 'unity',
    task: { type: 'qa', goal: '현재 빌드 오류 원인 조사', responsibleFiles: [] },
    adapter
  });
  assert.equal(route.route, 'analysis-only');
});

test('engine adapter forbids binary direct text editing', () => {
  const unreal = createVibeEngineAdapter({ target: 'unreal', gameSlug: 'demo' });
  assert.equal(unreal.execution.binaryAssetsDirectTextEditForbidden, true);
  assert.equal(unreal.execution.editorWorkerRequiredForBinaryAssets, true);
  assert(unreal.source.editorRequiredPatterns.some((value) => value.endsWith('Content/**/*.uasset')));
  assert(unreal.source.textWritablePatterns.some((value) => value.endsWith('Source/**/*.cpp')));
});

test('continuous controller is bounded, candidate-only and never auto-passes unverified source work', () => {
  assert(workflow.includes("cron: '17 * * * *'"));
  assert(workflow.includes('timeout-minutes: 20'));
  assert(workflow.includes('--runner-minutes=20'));
  assert(workflow.includes('VIBE2_MODEL_CALL_BUDGET=1'));
  assert(workflow.includes('vibe2/candidate/'));
  assert(workflow.includes('candidate-awaiting-engine-qa'));
  assert(workflow.includes('VIBE2_TASK_PASS=NO'));
  assert(workflow.includes('VIBE2_BINARY_TEXT_EDIT=NO'));
  assert(workflow.includes('gh workflow run vibe2-continuous-core.yml'));
  assert(!workflow.includes('vibe2-queue-control.mjs pass'));
  assert(!workflow.includes('git push origin HEAD:main'));
  assert(!workflow.includes('web-games/.autonomous-candidates'));
});
