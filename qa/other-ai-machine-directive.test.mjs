import assert from 'node:assert/strict';
import fs from 'node:fs';

const directive=JSON.parse(fs.readFileSync('company-learning/other-ai-machine-directive.json','utf8'));
const company=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const lifecycle=roadmap.developmentLifecycleMachine||{};

assert.equal(directive.kind,'MACHINE_EXECUTION_DIRECTIVE');
assert.equal(directive.audience,'OTHER_AI_AND_RUNNERS');
assert.equal(directive.humanDocumentRequired,false);
assert.equal(directive.authority,'NON_AUTHORITATIVE_EXECUTION_GUIDE');
assert.equal(directive.sourceOfTruth,'company-learning/platform-release-roadmap.json');
assert.equal(directive.policyOverrideAllowed,false);

assert.equal(company.machineCompanions.otherAiExecutionDirective.path,'company-learning/other-ai-machine-directive.json');
assert.equal(company.machineCompanions.otherAiExecutionDirective.mayOverrideCentralPolicy,false);
assert.equal(company.machineCompanions.otherAiExecutionDirective.mustReadCentralPolicyFirst,true);

assert.equal(directive.executionRules.gameplayImplementationOwner,'VIBE2_VIBE3');
assert.equal(directive.executionRules.nonVibeGameSourceWriteAllowed,false);
assert.equal(directive.executionRules.preserveExistingAutomation,true);
assert.equal(directive.executionRules.preserveExistingSettings,true);

assert.equal(directive.developmentLifecycle.webFirst.required,true);
assert.equal(directive.developmentLifecycle.webFirst.disposablePrototype,false);
assert.equal(directive.developmentLifecycle.nativeSecondStage.webBaseMustCarryForward,true);
assert.equal(directive.developmentLifecycle.nativeSecondStage.nativeRuntimeEvidenceRequiredSeparately,true);
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
assert.equal(directive.version,2);
assert.equal(workOrder.id,'WEB_TO_NATIVE_TO_POST_RELEASE_CONTINUOUS_DEVELOPMENT_V1');
assert.equal(workOrder.authority,'EXECUTION_SEQUENCE_ONLY');
assert.equal(workOrder.sourceOfTruth,'company-learning/platform-release-roadmap.json');
assert.equal(workOrder.policyCreationAllowed,false);
assert.equal(workOrder.implementationOwner,'VIBE2_VIBE3');
assert.equal(workOrder.startCondition,'PRODUCTION_CLASS=DEVELOPMENT_CONFIRMED_AND_PLATFORM_AND_GENRE_LOCKED');
assert.deepEqual(workOrder.steps.map(step=>step.order),[1,2,3,4,5,6,7,8,9]);
const byStage=Object.fromEntries(workOrder.steps.map(step=>[step.stage,step]));
assert.equal(byStage.WEB_BASE_IMPLEMENTATION.disposablePrototype,false);
assert.ok(byStage.WEB_BASE_IMPLEMENTATION.requiredBaseSystems.includes('core-loop-runtime'));
assert.ok(byStage.WEB_BASE_IMPLEMENTATION.requiredBaseSystems.includes('progression-model'));
assert.equal(byStage.WEB_RUNTIME_VALIDATION.completionSignal,'WEB_DEVELOPMENT_BASELINE_READY');
assert.equal(byStage.TARGET_PLATFORM_SOURCE_BIND.restartFromBlankWhenValidContinuationExists,false);
assert.ok(byStage.TARGET_PLATFORM_SOURCE_BIND.carryForwardRequired.includes('verified-learning-context'));
assert.equal(byStage.TARGET_PLATFORM_IMPLEMENTATION.selectedPlatformOwnsSecondImplementation,true);
assert.equal(byStage.TARGET_PLATFORM_VERIFICATION.webEvidenceCannotSubstitute,true);
assert.equal(byStage.RELEASE_PROMOTION.automaticPublicRepublish,false);
assert.equal(byStage.ROBLOX_POST_RELEASE_FOCUSED_DEVELOPMENT.protectedRunnerSlots,1);
assert.equal(byStage.ROBLOX_POST_RELEASE_FOCUSED_DEVELOPMENT.activeTaskMaxPerProject,1);
assert.equal(byStage.ROBLOX_POST_RELEASE_FOCUSED_DEVELOPMENT.continuousRefill,true);
assert.equal(byStage.ROBLOX_POST_RELEASE_FOCUSED_DEVELOPMENT.scheduler,'vibe2-24h-runner');
assert.equal(byStage.ROBLOX_POST_RELEASE_FOCUSED_DEVELOPMENT.worker,'vibe2-continuous-core');
assert.equal(byStage.LEARNING_PERSISTENCE.continuous24h,true);
assert.equal(byStage.LEARNING_PERSISTENCE.catalogWrapStopsLearning,false);
assert.equal(byStage.LEARNING_PERSISTENCE.waitingForVerifiedSamplesIsFailure,false);
assert.equal(byStage.LEARNING_PERSISTENCE.localModelTrainingInitiatedByThisWorkOrder,false);
assert.ok(workOrder.successSignals.includes('ROBLOX_RELEASE_GETS_ONE_PROTECTED_FOCUS_SLOT'));
assert.ok(workOrder.successSignals.includes('VERIFIED_LEARNING_PERSISTS_CONTINUOUSLY'));
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

assert.equal(lifecycle.webToPlatformHandoff.required,true);
assert.equal(lifecycle.webToPlatformHandoff.webIsDisposablePrototype,false);
assert.equal(lifecycle.postReleaseFocusedDevelopment.enabled,true);
assert.equal(lifecycle.postReleaseFocusedDevelopment.globalProtectedRunnerSlots,1);
assert.equal(lifecycle.intentAmplificationMultiverse.learningContinuity.continuous24h,true);

console.log('PASS other AI machine directive is bound to canonical policy and current development-learning lifecycle');
