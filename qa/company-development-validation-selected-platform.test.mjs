// 파일명: qa/company-development-validation-selected-platform.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');

test('DEVELOPMENT_CONFIRMED requires fresh Web 30-minute evidence and independent 90-point promotion revalidation',()=>{
  assert.match(source,/web-gameplay-validation\.json/);
  assert.match(source,/WEB_VALIDATION_SCHEMA_VERSION=10/);
  assert.match(source,/structuredWebEvidence/);
  assert.match(source,/session\.stageGameplayPassed===true/);
  assert.match(source,/sourceIndexSha256/);
  assert.match(source,/designBaselineSha256/);
  assert.match(source,/promotionRevalidation\?\.pass===true/);
  assert.match(source,/formalImplementationPassed===true/);
  assert.match(source,/WEB_HOMEPAGE_MINIMUM=80/);
  assert.match(source,/WEB_PLATFORM_PROMOTION_MINIMUM=90/);
  assert.match(source,/WAITING_WEB_GAMEPLAY_VALIDATION/);
  assert.match(source,/WAITING_WEB_GAMEPLAY_REVALIDATION/);
  assert.match(source,/WAITING_WEB_STRICT_IMPROVEMENT/);
  assert.match(source,/webValidationRequired:true/);
  assert.match(source,/musicValidationRequired:true/);
  assert.match(source,/webValidationOptional:false/);
});

test('Web score and target-platform implementation score are stored separately',()=>{
  assert.match(source,/webStrictScore/);
  assert.match(source,/platformImplementationScore/);
  assert.match(source,/webAndPlatformScoresSeparated:true/);
  assert.match(source,/learningLane:selectedPlatform/);
  assert.match(source,/webLearningLane:'WEB_PORTABLE'/);
  assert.match(source,/development-learning-feedback\.json/);
  assert.match(source,/platformScoreDelta/);
});

test('selected platform 80-89 is revised on the same platform and 90+ remains the pass line',()=>{
  assert.match(source,/PLATFORM_DEVELOPMENT_PASS_MINIMUM=90/);
  assert.match(source,/platform-implementation-score-80-89/);
  assert.match(source,/canonicalTargetRevalidationState/);
  assert.match(source,/같은 플랫폼에서 90점 이상이 될 때까지 재평가한다/);
  assert.match(source,/platform-implementation-score-below-80/);
  assert.match(source,/책임 단계에서 수정하고 구조 문제면 재설계/);
});

test('selected-platform evidence still requires real PASS and targeted revalidation',()=>{
  assert.match(source,/resolveSelectedPlatform/);
  assert.match(source,/adapterForPlatform/);
  assert.match(source,/platformAdapter\.evidenceFile/);
  assert.match(source,/platformAdapter\.projectField/);
  assert.match(source,/targetPlatform\.state==='MISSING'/);
  assert.match(source,/targetPlatform\.state==='FAIL'/);
  assert.match(source,/revalidation-required:/);
  assert.match(source,/DEVELOPMENT_ARTBOOK_PROVENANCE_GATE/);
  assert.match(source,/DEVELOPMENT_BASELINE_GATE=READY/);
  assert.doesNotMatch(source,/writeState\('WAITING_UNITY_VALIDATION'/);
  assert.doesNotMatch(source,/writeState\('WAITING_UNITY_REVALIDATION'/);
});