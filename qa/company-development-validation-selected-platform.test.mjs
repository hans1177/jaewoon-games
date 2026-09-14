// 파일명: qa/company-development-validation-selected-platform.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
const contract=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');

test('DEVELOPMENT_CONFIRMED consumes canonical schema13 Web evidence and independent 90-point promotion revalidation',()=>{
  assert.match(source,/web-gameplay-validation\.json/);
  assert.match(source,/company-web-validation-evidence-contract\.mjs/);
  assert.match(source,/evaluateWebValidationEvidence/);
  assert.match(source,/minimumScore:WEB_HOMEPAGE_MINIMUM,requireFinalContentDepth:false/);
  assert.match(source,/minimumScore:WEB_HOMEPAGE_MINIMUM,requireFinalContentDepth:true/);
  assert.match(source,/minimumScore:WEB_PLATFORM_PROMOTION_MINIMUM,requireFinalContentDepth:true,requirePromotionRevalidation:true/);
  assert.match(source,/finalContentDepthPass:top30\.finalContentDepthPass/);
  assert.doesNotMatch(source,/\[\[0,5\],\[5,15\],\[15,25\],\[25,30\]\]/);
  assert.doesNotMatch(source,/GAMEPLAY_MILESTONE_DEPTH/);
  assert.match(contract,/WEB_VALIDATION_SCHEMA_VERSION=13/);
  assert.match(contract,/WEB_HOMEPAGE_MINIMUM=80/);
  assert.match(contract,/WEB_PLATFORM_PROMOTION_MINIMUM=90/);
  assert.match(contract,/REAL_ELAPSED_GAMEPLAY/);
  assert.match(contract,/elapsedRealMilliseconds/);
  assert.match(source,/WAITING_WEB_GAMEPLAY_VALIDATION/);
  assert.match(source,/WAITING_WEB_FINAL_CONTENT_DEPTH/);
  assert.match(source,/WAITING_WEB_GAMEPLAY_REVALIDATION/);
  assert.match(source,/WAITING_WEB_STRICT_IMPROVEMENT/);
  assert.match(source,/webValidationRequired:true/);
  assert.match(source,/musicValidationRequired:true/);
  assert.match(source,/webValidationOptional:false/);
  assert.match(source,/realPlayableWebGameRequired:true/);
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
