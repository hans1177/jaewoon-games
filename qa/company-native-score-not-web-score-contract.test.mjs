import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));

test('Unity Web has independent build and QA obligations without blocking Roblox admission or substituting for native completion quality',()=>{
  assert.equal(directive.stageGateScoringV2.currentThresholds.targetPlatformCompletion,90);
  assert.equal(directive.stageGateScoringV2.currentThresholds.web,80);
  assert.equal(Object.hasOwn(directive.stageGateScoringV2.currentThresholds,'webPlatformPromotion'),false);
  assert.equal(directive.stageGateScoringV2.webScoreRole,'UNITY_WEB_PRE_NATIVE_READINESS_QUALITY_SIGNAL_NOT_NATIVE_COMPLETION_SCORE');
  assert.equal(directive.stageGateScoringV2.designScoreRole,'PARALLEL_QUALITY_SIGNAL_NOT_DEVELOPMENT_ADMISSION');

  const web=roadmap.directNativeDualPlatformDevelopment.unityWebValidationSurface;
  assert.equal(web.requiredForDevelopmentAdmission,false);
  assert.equal(web.enabled,true);
  assert.equal(web.optional,false);
  assert.equal(web.sameCanonicalUnityProjectRequired,true);
  assert.equal(web.missingOrFailedWebBuildAction,'REPAIR_UNITY_WEB_INDEPENDENTLY');
  assert.equal(roadmap.directNativeDualPlatformDevelopment.unityWebGateRequired,false);
  assert.equal(roadmap.changeRecord.ownerRobloxUnityWebOnly20261009.robloxRequiresUnityWebReadiness,false);
  assert.equal(roadmap.changeRecord.ownerRobloxUnityWebOnly20261009.unityWebRequiresActualBrowserIndependentQaAndRegression,true);
  assert.equal(web.requiredForNativeRuntimePass,false);
  assert.equal(web.requiredForIndependentQa,false);
  assert.equal(web.requiredForRegression,false);
  assert.equal(web.requiredForInternalRelease,false);
  assert.equal(web.requiredForPublicRelease,false);
  assert.equal(web.releaseStage,false);
});

test('native release still requires its own runtime QA regression evidence',()=>{
  const external=roadmap.directNativeDualPlatformDevelopment.externalRelease;
  assert.equal(external.platformIndependent,true);
  assert.equal(external.onePlatformMayPublishWithoutWaitingForOther,true);
  assert.equal(external.requiresOwnRuntimeQaRegressionAndExplicitPublicExposureEvidence,true);
});
