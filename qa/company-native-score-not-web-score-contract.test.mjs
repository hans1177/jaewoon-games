import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));

test('native completion quality remains independent from optional Unity Web validation score',()=>{
  assert.equal(directive.stageGateScoringV2.currentThresholds.targetPlatformCompletion,90);
  assert.equal(directive.stageGateScoringV2.currentThresholds.web,80);
  assert.equal(Object.hasOwn(directive.stageGateScoringV2.currentThresholds,'webPlatformPromotion'),false);
  assert.equal(directive.stageGateScoringV2.webScoreRole,'OPTIONAL_UNITY_WEB_VALIDATION_QUALITY_ONLY');
  assert.equal(directive.stageGateScoringV2.designScoreRole,'PARALLEL_QUALITY_SIGNAL_NOT_DEVELOPMENT_ADMISSION');

  const web=roadmap.directNativeDualPlatformDevelopment.unityWebValidationSurface;
  assert.equal(web.requiredForDevelopmentAdmission,false);
  assert.equal(web.requiredForNativeRuntimePass,false);
  assert.equal(web.requiredForIndependentQa,false);
  assert.equal(web.requiredForRegression,false);
  assert.equal(web.requiredForInternalRelease,false);
  assert.equal(web.requiredForPublicRelease,false);
});

test('native release still requires its own runtime QA regression evidence',()=>{
  const external=roadmap.directNativeDualPlatformDevelopment.externalRelease;
  assert.equal(external.platformIndependent,true);
  assert.equal(external.onePlatformMayPublishWithoutWaitingForOther,true);
  assert.equal(external.requiresOwnRuntimeQaRegressionAndExplicitPublicExposureEvidence,true);
});
