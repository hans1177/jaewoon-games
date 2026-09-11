// 파일명: qa/vibe2-fast-distillation-stage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFastDistillationPlan, filterFastDistillationRecords } from '../tools/vibe2-fast-distillation-stage.mjs';

function entry(record, index) {
  return { record, sourceFile: `fixture-${index}.json`, index };
}

function verifiedSample({ project = 'P0001', index, taskType = 'bugfix', playImprovement = 1, quality = true }) {
  const record = {
    instruction: `고유 ${taskType} 작업 ${project} ${index}`,
    input: `재현 입력 ${project} ${index}`,
    output: `검증된 수정 결과 ${project} ${index}`,
    sourceCommit: `${project}-${taskType}-${index}`,
    project,
    taskType,
    difficulty: taskType === 'unity' ? 'unity-build' : 'bug',
    independentQa: 'PASS',
    browserQa: 'PASS',
  };
  if (quality) {
    record.quality = {
      codeQuality: 1,
      noRegression: true,
      playImprovement,
      ruleCompliance: 1,
    };
  }
  return record;
}

function rows(projects, countEach, taskType = 'bugfix') {
  const output = [];
  for (const project of projects) {
    for (let index = 0; index < countEach; index += 1) {
      output.push(entry(verifiedSample({ project, index, taskType }), output.length));
    }
  }
  return output;
}

test('빠른 증류는 명시적 품질 근거가 없는 샘플을 fail-closed 한다', () => {
  const records = [entry(verifiedSample({ index: 0, quality: false }), 0)];
  const filtered = filterFastDistillationRecords(records);
  assert.equal(filtered.accepted.length, 0);
  assert.equal(filtered.rejected[0].reason, 'EXPLICIT_QUALITY_REQUIRED');
});

test('초기 단일 프로젝트에서도 충분한 검증 샘플이면 BOOTSTRAP_FAST만 허용한다', () => {
  const plan = buildFastDistillationPlan(rows(['P0001'], 24));
  assert.equal(plan.tasks.bugfix.ready, true);
  assert.equal(plan.tasks.bugfix.learningStage, 'BOOTSTRAP_FAST');
  assert.equal(plan.tasks.bugfix.runtimePromotionEligible, false);
  assert.ok(plan.earlyReadyTasks.includes('bugfix'));
  assert.equal(plan.state, 'FAST_DISTILLATION_READY');
});

test('두 프로젝트 샘플이 늘면 STABILIZING으로 올라가지만 런타임 승격은 계속 금지한다', () => {
  const plan = buildFastDistillationPlan(rows(['P0001', 'P0002'], 30));
  assert.equal(plan.tasks.bugfix.ready, true);
  assert.ok(['STABILIZING', 'STABLE'].includes(plan.tasks.bugfix.learningStage));
  if (plan.tasks.bugfix.learningStage === 'STABILIZING') {
    assert.equal(plan.tasks.bugfix.runtimePromotionEligible, false);
  }
});

test('정식 STABLE 기준을 만족하면 빠른 lane은 ownership을 넘긴다', () => {
  const plan = buildFastDistillationPlan(rows(['P0001', 'P0002'], 80));
  assert.equal(plan.tasks.bugfix.learningStage, 'STABLE');
  assert.equal(plan.tasks.bugfix.runtimePromotionEligible, true);
  assert.ok(plan.stableReadyTasks.includes('bugfix'));
  assert.ok(!plan.earlyReadyTasks.includes('bugfix'));
  assert.equal(plan.state, 'STABLE_PIPELINE_OWNS_READY_TASKS');
});

test('낮은 명시적 품질 샘플은 초기 증류에서도 제외한다', () => {
  const bad = entry(verifiedSample({ index: 1, playImprovement: 0 }), 0);
  bad.record.quality.codeQuality = 0;
  bad.record.quality.noRegression = false;
  bad.record.quality.ruleCompliance = 0;
  const filtered = filterFastDistillationRecords([bad]);
  assert.equal(filtered.accepted.length, 0);
  assert.equal(filtered.rejected[0].reason, 'QUALITY_BELOW_THRESHOLD');
});
