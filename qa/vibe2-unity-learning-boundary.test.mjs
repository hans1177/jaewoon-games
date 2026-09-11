import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contract = JSON.parse(fs.readFileSync('company-learning/unity-learning-boundary.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/vibe2-structural-repair-distillation.yml', 'utf8');

test('Unity 학습은 실제 게임 프로젝트와 분리된다', () => {
  assert.equal(contract.scope, 'UNITY_CODING_ONLY');
  assert.equal(contract.gameProjectIsTrainingWorkspace, false);
  assert.equal(contract.createDedicatedUnityTrainingProject, false);
  assert.equal(contract.gameProjectRules.trainingMayWriteGameSource, false);
  assert.equal(contract.gameProjectRules.trainingMayCreateScenesOrPrefabs, false);
  assert.equal(contract.gameProjectRules.trainingMayChangeSaveMeaning, false);
  assert.equal(contract.gameProjectRules.verifiedGameWorkMayBecomeTrainingEvidence, true);
});

test('학습 산출물은 로컬 전용 루트에 남고 새 adapter는 검증 전 실전에 투입되지 않는다', () => {
  assert.match(workflow, /jaewoon-vibe2-learning/);
  assert.match(workflow, /adapters\\unity-coding/);
  assert.match(workflow, /promotionState='UNVERIFIED'/);
  assert.match(workflow, /runtimePromotionAllowed=\$false/);
  assert.equal(contract.adapterRules.requiredGate, 'FIXED_HOLDOUT_AB_AND_CANARY');
});

test('teacher는 분석만 하고 정답은 검증된 실제 Unity patch다', () => {
  assert.equal(contract.teacherAuthority, 'ANALYSIS_ONLY');
  assert.equal(contract.answerTarget, 'VERIFIED_FINAL_DIFF_ONLY');
  assert.ok(contract.allowedTrainingInputs.includes('VERIFIED_UNITY_FINAL_PATCHES'));
  assert.ok(contract.allowedTrainingInputs.includes('BOUND_QA_CI_RUNTIME_EVIDENCE'));
});
