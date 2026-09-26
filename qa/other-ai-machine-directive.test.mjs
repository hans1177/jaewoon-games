// 파일명: qa/other-ai-machine-directive.test.mjs
// 역할: 비권위 AI 실행 가이드가 최신 중앙정책/아키텍처 의미를 그대로 따르는지 검증한다.

import assert from 'node:assert/strict';
import fs from 'node:fs';

const directive=JSON.parse(fs.readFileSync('company-learning/other-ai-machine-directive.json','utf8'));
const company=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const security=JSON.parse(fs.readFileSync('company-learning/security-immune-system.json','utf8'));

const lifecycle=roadmap.developmentLifecycleMachine||{};
const dual=roadmap.directNativeDualPlatformDevelopment||{};
const floor=dual.unityWebDevelopmentLane||{};

assert.equal(directive.kind,'MACHINE_EXECUTION_DIRECTIVE');
assert.equal(directive.audience,'OTHER_AI_AND_RUNNERS');
assert.equal(directive.humanDocumentRequired,false);
assert.equal(directive.authority,'NON_AUTHORITATIVE_EXECUTION_GUIDE');
assert.equal(directive.sourceOfTruth,'company-learning/platform-release-roadmap.json');
assert.equal(directive.policyOverrideAllowed,false);
assert.equal(directive.version,3);

assert.equal(company.machineCompanions.otherAiExecutionDirective.path,'company-learning/other-ai-machine-directive.json');
assert.equal(company.machineCompanions.otherAiExecutionDirective.mayOverrideCentralPolicy,false);
assert.equal(company.machineCompanions.otherAiExecutionDirective.mustReadCentralPolicyFirst,true);

const canonicalReads=[
  'company-learning/platform-release-roadmap.json',
  'company-learning/company-log-map.json',
  'company-learning/company-architecture-map.json',
  'company-learning/security-immune-system.json'
];
assert.deepEqual(architecture.sharedContextLoadOrder,canonicalReads);
assert.deepEqual(directive.requiredReads.slice(0,4),canonicalReads);
assert.deepEqual(directive.sharedContext.loadOrder,canonicalReads);
assert.equal(directive.sharedContext.beforeWorkRequired,true);
assert.equal(directive.sharedContext.afterWorkRequired,true);
assert.equal(directive.sharedContext.runtimeMayNotCreatePolicy,true);
assert.equal(directive.sharedContext.manualPolicyMirrorForbidden,true);
assert.equal(directive.executionRules.canonicalSharedContextOrderRequired,true);
assert.equal(directive.executionRules.runtimeStateCannotCreatePolicy,true);
assert.equal(directive.executionRules.postCentralDocumentWriteSharedContextResyncRequired,true);
assert.equal(security.sourceOfTruth,'company-learning/platform-release-roadmap.json');

assert.equal(directive.executionRules.gameplayImplementationOwner,'VIBE2_VIBE3');
assert.equal(directive.executionRules.nonVibeGameSourceWriteAllowed,false);
assert.equal(directive.executionRules.preserveExistingAutomation,true);
assert.equal(directive.executionRules.preserveExistingSettings,true);

assert.equal(roadmap.currentPhase,'UNITY_WEB_DEVELOPMENT_FLOOR_THEN_ROBLOX_UNITY_UPPER_PLATFORM_DEVELOPMENT');
assert.equal(dual.unityWebRequired,true);
assert.equal(dual.unityWebGateRequired,true);
assert.deepEqual(dual.supportedDevelopmentPlatforms,['ROBLOX','UNITY']);

const webAlias=directive.developmentLifecycle.webFirst;
assert.equal(webAlias.status,'DEPRECATED_COMPATIBILITY_ALIAS');
assert.equal(webAlias.compatibilityAliasFor,'UNITY_WEB_DEVELOPMENT_FLOOR');
assert.equal(webAlias.legacyIndependentWebGameplayMeaningRemoved,true);
assert.equal(webAlias.canonicalSourceRoot,'unity-games/<gameId>/');
assert.equal(webAlias.outputRoot,'web-games/<gameId>/');
assert.equal(webAlias.sameCanonicalUnityProjectRequired,true);
assert.equal(webAlias.separateWebGameplayCodebaseForbidden,true);
assert.equal(webAlias.completionSignal,'UPPER_PLATFORM_DEVELOPMENT_READY');
assert.equal(webAlias.passAction,'START_CONCURRENT_ROBLOX_AND_UNITY_UPPER_PLATFORM_DEVELOPMENT');
assert.equal(webAlias.failureAction,'REPAIR_REQUIRED');
assert.equal(webAlias.publicReleaseStage,false);

const directiveFloor=directive.developmentLifecycle.unityWebDevelopmentFloor;
assert.equal(directiveFloor.role,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
assert.equal(directiveFloor.canonicalSourceRoot,'unity-games/<gameId>/');
assert.equal(directiveFloor.outputRoot,'web-games/<gameId>/');
assert.equal(directiveFloor.sameCanonicalUnityProjectRequired,true);
assert.equal(directiveFloor.separateWebGameplayCodebaseForbidden,true);
assert.equal(directiveFloor.passSignal,'UPPER_PLATFORM_DEVELOPMENT_READY');
assert.equal(directiveFloor.passAction,'START_CONCURRENT_ROBLOX_AND_UNITY_UPPER_PLATFORM_DEVELOPMENT');
assert.equal(directiveFloor.failureAction,'REPAIR_REQUIRED');
assert.equal(directiveFloor.releaseAuthority,false);
assert.equal(floor.role,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
assert.equal(floor.canonicalSourceRoot,'unity-games/<gameId>/');
assert.equal(floor.outputRoot,'web-games/<gameId>/');
assert.equal(floor.sameCanonicalUnityProjectRequired,true);
assert.equal(floor.separateWebGameplayCodebaseForbidden,true);

const upper=directive.developmentLifecycle.nativeSecondStage;
assert.equal(upper.canonicalMeaning,'ROBLOX_AND_UNITY_CONCURRENT_UPPER_PLATFORM_DEVELOPMENT');
assert.equal(upper.trigger,'UPPER_PLATFORM_DEVELOPMENT_READY');
assert.equal(upper.webBaseMustCarryForward,false);
assert.equal(upper.unityUsesSameCanonicalProject,true);
assert.equal(upper.robloxUsesSharedApprovedDesignAndGameplayMeaning,true);
assert.deepEqual(upper.concurrentTargets,['ROBLOX','UNITY']);
assert.equal(upper.bothPlatformsRequiredForSameGame,true);
assert.equal(upper.eachPlatformRequiresOwnRuntimeQaRegression,true);
assert.equal(upper.webEvidenceCannotSubstituteNativePass,true);

assert.equal(directive.developmentLifecycle.robloxPostRelease.enabled,true);
assert.equal(directive.developmentLifecycle.robloxPostRelease.protectedRunnerSlots,1);
assert.equal(directive.developmentLifecycle.robloxPostRelease.continuousRefill,true);

assert.equal(directive.learning.continuous24h,true);
assert.equal(directive.learning.googlePlayRotationContinuous,true);
assert.equal(directive.learning.catalogWrapMustNotStopStudy,true);
assert.equal(directive.learning.waitingForVerifiedSamplesMeansCollectionStateNotFailure,true);
assert.equal(directive.learning.maximizeVerifiedLearningUse,true);
assert.equal(directive.learning.rawCopyForbidden,true);
assert.equal(directive.learning.newExpressionRequired,true);
assert.equal(directive.learning.learningMayExpandAuthority,false);
assert.equal(directive.learning.learningMayReplaceNativeVerification,false);

assert.equal(directive.localExecution.initiateLocalModelTraining,false);
assert.equal(directive.localExecution.doNotChangeCanonicalTrainingRoute,true);

const workOrder=directive.workOrder;
assert.equal(workOrder.authority,'EXECUTION_SEQUENCE_ONLY');
assert.equal(workOrder.sourceOfTruth,'company-learning/platform-release-roadmap.json');
assert.equal(workOrder.policyCreationAllowed,false);
assert.equal(workOrder.implementationOwner,'VIBE2_VIBE3');
assert.equal(workOrder.centralLifecycle,'UNITY_WEB_DEVELOPMENT_FLOOR_THEN_ROBLOX_UNITY_CONCURRENT_UPPER_PLATFORM_DEVELOPMENT');
assert.equal(workOrder.compatibilityStageNamesPreserved,true);
assert.deepEqual(workOrder.steps.map(step=>step.order),[1,2,3,4,5,6,7,8,9]);

const byStage=Object.fromEntries(workOrder.steps.map(step=>[step.stage,step]));
assert.equal(byStage.WEB_BASE_IMPLEMENTATION.canonicalStage,'UNITY_WEB_DEVELOPMENT_FLOOR');
assert.equal(byStage.WEB_BASE_IMPLEMENTATION.canonicalSourceRoot,'unity-games/<gameId>/');
assert.equal(byStage.WEB_BASE_IMPLEMENTATION.separateWebGameplayCodebaseForbidden,true);
assert.equal(byStage.WEB_RUNTIME_VALIDATION.canonicalStage,'UNITY_WEB_RUNTIME_QA_READINESS');
assert.equal(byStage.WEB_RUNTIME_VALIDATION.completionSignal,'UPPER_PLATFORM_DEVELOPMENT_READY');
assert.equal(byStage.WEB_RUNTIME_VALIDATION.passAction,'START_CONCURRENT_ROBLOX_AND_UNITY_UPPER_PLATFORM_DEVELOPMENT');
assert.equal(byStage.TARGET_PLATFORM_SOURCE_BIND.canonicalStage,'UPPER_PLATFORM_SOURCE_BIND');
assert.deepEqual(byStage.TARGET_PLATFORM_SOURCE_BIND.concurrentTargets,['ROBLOX','UNITY']);
assert.equal(byStage.TARGET_PLATFORM_IMPLEMENTATION.canonicalStage,'ROBLOX_AND_UNITY_CONCURRENT_IMPLEMENTATION');
assert.equal(byStage.TARGET_PLATFORM_IMPLEMENTATION.selectedPlatformOwnsSecondImplementation,false);
assert.deepEqual(byStage.TARGET_PLATFORM_IMPLEMENTATION.concurrentTargets,['ROBLOX','UNITY']);
assert.equal(byStage.TARGET_PLATFORM_VERIFICATION.webEvidenceCannotSubstitute,true);
assert.equal(byStage.TARGET_PLATFORM_VERIFICATION.perPlatformIndependentEvidenceRequired,true);
assert.equal(byStage.RELEASE_PROMOTION.automaticPublicRepublish,false);
assert.equal(byStage.ROBLOX_POST_RELEASE_FOCUSED_DEVELOPMENT.protectedRunnerSlots,1);
assert.equal(byStage.LEARNING_PERSISTENCE.continuous24h,true);
assert.ok(workOrder.successSignals.includes('UNITY_WEB_FLOOR_RUNTIME_QA_REGRESSION_PASS'));
assert.ok(workOrder.successSignals.includes('UPPER_PLATFORM_DEVELOPMENT_READY'));
assert.ok(workOrder.successSignals.includes('ROBLOX_AND_UNITY_CONCURRENT_DEVELOPMENT_STARTED'));
assert.ok(workOrder.forbidden.includes('NON_VIBE_GAMEPLAY_SOURCE_WRITE'));
assert.ok(workOrder.forbidden.includes('STOP_24H_LEARNING_AFTER_CATALOG_WRAP'));

const homepageSync=directive.homepageRuntimeSyncWorkOrder;
assert.equal(homepageSync.id,'HOMEPAGE_PUBLIC_RUNTIME_SYNC_V1');
assert.equal(homepageSync.kind,'MACHINE_WORK_ORDER');
assert.equal(homepageSync.humanDocumentRequired,false);
assert.equal(homepageSync.publicEndpoint.baseUrl,'https://jaewoon-games.pages.dev/');
assert.equal(homepageSync.publicEndpoint.legacyRepoHomepageMetadataMustNotBeUsed,true);
assert.equal(homepageSync.executionRules.noNewHomepagePipeline,true);
assert.equal(homepageSync.executionRules.preserveHomepageManager,true);
assert.equal(homepageSync.executionRules.publicEndpointMustBeComparedAgainstCanonical,true);
assert.equal(homepageSync.executionRules.deploymentProviderSettingsMustNotBeGuessed,true);
assert.deepEqual(homepageSync.steps.map(step=>step.order),[1,2,3,4,5,6]);
const homepageByStage=Object.fromEntries(homepageSync.steps.map(step=>[step.stage,step]));
assert.equal(homepageByStage.COMPARE_WITH_CANONICAL_RUNTIME.comparisonMode,'SEMANTIC_JSON_PLUS_CONTENT_HASH');
assert.equal(homepageByStage.CLASSIFY_FAILURE.codeMutationBeforeClassificationForbidden,true);
assert.ok(homepageByStage.REPAIR_EXISTING_DEPLOYMENT_PATH_ONLY.priorities.includes('DO_NOT_CREATE_SHADOW_DEPLOYMENT'));
assert.ok(homepageByStage.PUBLIC_REVERIFY.required.includes('PUBLIC_CATALOG_MATCHES_CANONICAL'));
assert.ok(homepageByStage.PUBLIC_REVERIFY.required.includes('PUBLIC_STATUS_MATCHES_CANONICAL'));
assert.ok(homepageSync.successSignals.includes('PUBLIC_HOMEPAGE_CURRENT'));
assert.ok(homepageSync.successSignals.includes('NO_SHADOW_PIPELINE_CREATED'));

assert.equal(lifecycle.sharedWorkerContext.syncMode,'ROADMAP_FIRST_FAIL_CLOSED');
assert.equal(lifecycle.sharedWorkerContext.beforeWorkRequired,true);
assert.equal(lifecycle.sharedWorkerContext.afterWorkRequired,true);
assert.equal(lifecycle.sharedWorkerContext.runtimeMayNotCreatePolicy,true);
assert.equal(lifecycle.sharedWorkerContext.postCentralDocumentWriteSharedContextResyncRequired,true);
assert.equal(lifecycle.postReleaseFocusedDevelopment.enabled,true);
assert.equal(lifecycle.intentAmplificationMultiverse.learningContinuity.continuous24h,true);

console.log('PASS other AI machine directive follows current central Vibe policy and architecture');
