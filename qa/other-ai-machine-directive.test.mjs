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

assert.equal(lifecycle.webToPlatformHandoff.required,true);
assert.equal(lifecycle.webToPlatformHandoff.webIsDisposablePrototype,false);
assert.equal(lifecycle.postReleaseFocusedDevelopment.enabled,true);
assert.equal(lifecycle.postReleaseFocusedDevelopment.globalProtectedRunnerSlots,1);
assert.equal(lifecycle.intentAmplificationMultiverse.learningContinuity.continuous24h,true);

console.log('PASS other AI machine directive is bound to canonical policy and current development-learning lifecycle');
