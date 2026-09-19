// 파일명: qa/company-central-policy-contract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readText=relative=>fs.readFileSync(path.join(repoRoot,relative),'utf8');
const readJson=relative=>JSON.parse(readText(relative));
const flow=readText('COMPANY_FLOW.md');
const obsoleteAgentsPath=path.join(repoRoot,'AGENTS.md');
const directive=readJson('company-directive.json');
const roadmap=readJson('company-learning/platform-release-roadmap.json');
const multimodelWorkflow=readText('.github/workflows/artbook-free-department-bots.yml');
const designCycle=readText('tools/company-design-cycle.mjs');
const pipeline=readText('tools/artbook-production-pipeline.mjs');
const nativeDatasetGate=readText('tools/vibe2-real-platform-dataset-gate.mjs');
const directorSupervisor=readText('.github/workflows/director-supervisor.yml');

test('platform-release-roadmap is the single machine execution policy source',()=>{
  assert.equal(directive.policyDocument,'company-learning/platform-release-roadmap.json');
  assert.equal(directive.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(directive.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(directive.humanDocumentRequired,false);
  assert.equal(roadmap.policySource,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.humanDocumentRequired,false);
  assert.equal(roadmap.runtimeContractCannotCreatePolicy,true);
  assert.equal(roadmap.legacyPolicyMirror.path,'COMPANY_FLOW.md');
  assert.equal(roadmap.legacyPolicyMirror.authoritative,false);
  assert.equal(roadmap.legacyPolicyMirror.requiredForExecution,false);
  assert.equal(roadmap.legacyPolicyMirror.mayCreatePolicy,false);
  assert.match(flow,/sourceOfTruth: company-learning\/platform-release-roadmap\.json/);
  assert.match(flow,/format: MACHINE_ORIENTED_POLICY_SPEC/);
  assert.match(flow,/authority: LEGACY_POLICY_MIRROR/);
  assert.match(flow,/authoritative: false/);
  assert.match(flow,/executionRequired: false/);
  assert.match(flow,/legacyPolicyMirror: true/);
  assert.match(flow,/humanReadableNarrativeRequired: false/);
  assert.match(flow,/ownerInstructionOverridesPolicy: true/);
  assert.match(flow,/passMinimum: 80/);
  assert.match(flow,/formalImplementationMinimumForTargetPlatformDispatch: 90/);
  assert.match(flow,/designOnlyArtbookForbidden: true/);
  assert.match(flow,/preWebArtbookForbidden: true/);
  assert.match(flow,/createOnlyAfterWebStrictReview: true/);
  assert.match(flow,/blockingBudgetMinutes: 10/);
  assert.equal(fs.existsSync(obsoleteAgentsPath),false);
});
test('GAME_SEED mirrors the current historical-bootstrap dynamic-portfolio and selected-platform policy',()=>{
  assert.equal(directive.gameSeed.enabled,true);
  assert.equal(directive.gameSeed.requiredBeforeDesignerDraft,true);
  assert.equal(directive.gameSeed.selectionMode,'MIXED_SEED_MATERIAL_COMPOSITION');
  assert.deepEqual(directive.gameSeed.transformationModes,['HOMAGE','REINTERPRETATION','ORIGINAL_COMPOSITION']);
  assert.equal(directive.gameSeed.materialMustBeExistingGame,false);
  assert.equal(directive.gameSeed.seedMaterialPoolTarget,100);
  assert.equal(directive.gameSeed.requiredFieldsSource,'tools/company-game-seed-contract.mjs#GAME_SEED_REQUIRED_FIELDS');
  assert.ok(directive.gameSeed.requiredFields.includes('REFERENCE_INPUTS'));
  assert.ok(!directive.gameSeed.requiredFields.includes('REFERENCE_GAMES'));
  assert.equal(directive.gameSeed.sourceCodeRule,'IMPLEMENT_EQUIVALENT_OR_INSPIRED_FUNCTIONALITY_WITH_OWN_CODE');
  assert.equal(directive.gameSeed.bootstrap.count,6);
  assert.equal(directive.gameSeed.bootstrap.historicalInitialSeedBatchOnly,true);
  assert.equal(directive.gameSeed.bootstrap.productionQuota,false);
  assert.equal(new Set(directive.gameSeed.bootstrap.categories).size,6);
  assert.equal(directive.gameSeed.marketEvidence.role,'TARGET_DESIGN_REFERENCE');
  assert.equal(directive.gameSeed.marketEvidence.targetMarketScope,'GLOBAL');
  assert.equal(directive.gameSeed.marketEvidence.countrySpecificEvidenceRole,'SECONDARY_CONTEXT_ONLY');
  assert.equal(directive.gameSeed.marketEvidence.defaultTargetMustNotBeCountrySpecific,true);
  assert.equal(directive.gameSeed.marketEvidence.hardPassFailGate,false);
  assert.equal(directive.gameSeed.marketEvidence.numericClaimRequiresSource,true);
  assert.equal(directive.gameSeed.marketEvidence.numericClaimRequiresObservedAt,true);
  assert.equal(directive.gameSeed.replenishment.mode,'DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO');
  assert.equal(directive.gameSeed.replenishment.oneForOneOnly,false);
  assert.equal(directive.gameSeed.replenishment.automaticGrowthBeyondVacanciesForbidden,false);
  assert.equal(directive.gameSeed.initialTargetPlatform,'ROBLOX');
  assert.deepEqual(directive.gameSeed.allowedTargetPlatforms,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(directive.gameSeed.projectMaySelectAnyAllowedPlatform,true);
  assert.match(flow,/historicalInitialSeedBatchCount: 6/);
  assert.match(flow,/historicalInitialSeedBatchOnly: true/);
  assert.match(flow,/initialSeedBatchIsProductionQuota: false/);
  assert.match(flow,/sourceCodeRule: IMPLEMENT_EQUIVALENT_OR_INSPIRED_FUNCTIONALITY_WITH_OWN_CODE/);
  assert.match(flow,/replenishment:[\s\S]*mode: DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO/);
  assert.match(flow,/oneForOneOnly: false/);
  assert.match(flow,/initialTargetPlatform: ROBLOX/);
  assert.match(flow,/projectMaySelectAnyAllowedPlatform: true/);
});

test('DESIGN_ONLY stops at strict design baseline; Web strict review precedes artbook and native dispatch',()=>{
  const design=directive.classes.DESIGN_ONLY;
  const development=directive.classes.DEVELOPMENT_CONFIRMED;
  assert.deepEqual(design.requiredFlow,[
    'GAME_SEED','GAME_DESIGNER_DRAFT','DETERMINISTIC_PRE_GATE','FAILED_AXIS_DESIGNER_REPAIR_MAX_2',
    'DETERMINISTIC_DEPARTMENT_EVIDENCE','DETERMINISTIC_REVALIDATION',
    'STRICT_DESIGN_REVIEW','DESIGN_BASELINE_GATE'
  ]);
  for(const token of ['TARGET_PLATFORM_UX_DIRECTION_DEFINED','PLATFORM_SELECTION_RECORDED','MANDATORY_WEB_COMPANION_REQUIREMENT_RECORDED','APPROVED_SCOPE_INVENTORY_RECORDED','DETERMINISTIC_DEPARTMENT_EVIDENCE_RECORDED','STRICT_DESIGN_SCORE_AT_LEAST_80','STRICT_DESIGN_HARD_FAILURES_EMPTY'])assert.ok(design.baselineReadyRequires.includes(token));
  assert.equal(design.readyState,'DESIGN_BASELINE_READY');
  assert.equal(design.sourceCodeAutoDevelopment,false);
  assert.equal(design.artbookBeforePromotionForbidden,true);
  assert.equal(directive.stageGateScoringV2.currentThresholds.design,80);
  assert.equal(directive.stageGateScoringV2.currentThresholds.web,80);
  assert.equal(directive.stageGateScoringV2.currentThresholds.webPlatformPromotion,90);
  assert.equal(directive.stageGateScoringV2.currentThresholds.targetPlatformCompletion,90);
  assert.equal(directive.ai.artbookEditor.startsAfterDesignPromotion,true);
  assert.equal(directive.ai.artbookEditor.startsAfterWebStrictReview,true);
  assert.equal(directive.ai.artbookEditor.minimumWebStrictScore,80);
  assert.equal(directive.ai.artbookEditor.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.ok(development.requiredFlow.includes('WEB_STRICT_REVIEW'));
  assert.ok(development.requiredFlow.includes('POST_WEB_ARTBOOK_IF_SCORE_80_OR_HIGHER'));
  assert.ok(development.requiredFlow.includes('HOMEPAGE_TEST_CANDIDATE_IF_ARTBOOK_READY'));
  assert.ok(development.requiredFlow.includes('TARGET_PLATFORM_90_POINT_GATE'));
  assert.equal(development.preWebArtbookForbidden,true);
  assert.equal(development.postWebArtbookRequiredForHomepage,true);
  assert.equal(development.webStrictHomepageMinimum,80);
  assert.equal(development.formalImplementationMinimumForTargetPlatformDispatch,90);
  assert.equal(development.artbookFailureBlocksHomepageRegistrationOnly,true);
  assert.equal(directive.ai.vibe2.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive,false);
  assert.equal(Object.hasOwn(directive.ai.vibe2.roleByClass,'DESIGN_ONLY'),false);
  assert.match(designCycle,/GAME_SEED_REQUIRED/);
  assert.match(designCycle,/sameModelAsDraft:false/);
  assert.match(designCycle,/fiveDepartmentLeadReviewCompleted:false/);
  assert.match(designCycle,/DESIGN_ONLY_REVIEW_MODE=DETERMINISTIC_DEPARTMENT_EVIDENCE/);
  assert.match(designCycle,/AbortSignal\.timeout\(effectiveTimeoutMs\)/);
  assert.doesNotMatch(designCycle,/VIBE2_VALIDATION_LEARNING|vibe2-validator/);
  assert.match(pipeline,/DESIGN_ONLY_ARTBOOK_BEFORE_PROMOTION=NO/);
  assert.doesNotMatch(pipeline,/await run\('tools\/company-design-artbook\.mjs'\)/);
  assert.match(pipeline,/DESIGN_ONLY_VIBE2_USED=NO/);
});

test('discard policy requires redesign or real implementation evidence instead of one failure',()=>{
  assert.equal(directive.discardPolicy.general.singleFailureDoesNotImmediatelyDiscard,true);
  assert.equal(directive.discardPolicy.general.correctableProblemMustAttemptRevisionFirst,true);
  assert.equal(directive.discardPolicy.general.marketMetricAloneCannotDiscard,true);
  assert.equal(directive.discardPolicy.general.departmentScoreAloneCannotDiscard,true);
  assert.equal(directive.discardPolicy.DESIGN_ONLY.discardRequiresSameDesignerRevision,true);
  assert.equal(directive.discardPolicy.DESIGN_ONLY.discardRequiresRepeatedFiveDepartmentReview,true);
  assert.equal(directive.discardPolicy.DEVELOPMENT_CONFIRMED.discardRequiresRealEvidence,true);
  assert.equal(directive.discardPolicy.DEVELOPMENT_CONFIRMED.discardRequiresTargetedFixWhenPractical,true);
  assert.equal(directive.discardPolicy.DEVELOPMENT_CONFIRMED.discardRequiresTargetedRevalidation,true);
  assert.match(flow,/SAME_GAME_DESIGNER_REVISION_ATTEMPTED/);
  assert.match(flow,/TARGETED_REVALIDATION_PERFORMED/);
});

test('semantic production classes are canonical and fixed numeric quotas are not policy',()=>{
  assert.equal(directive.production.canonicalField,'productionClass');
  assert.deepEqual(directive.production.canonicalClasses,['DESIGN_ONLY','DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED']);
  assert.equal(directive.production.membership,'DYNAMIC_EVIDENCE');
  assert.equal(directive.production.countsDerivedFromMembership,true);
  assert.equal(directive.production.fixedClassCounts,false);
  assert.equal(directive.production.gameIdsPinned,false);
  assert.equal(Object.hasOwn(directive.production,'numericLabels'),false);
  assert.equal(directive.production.numericLabelsAreAliasesOnly,true);
  assert.equal(Object.hasOwn(directive,'tiersCompatibility'),false);
  assert.match(flow,/membership: DYNAMIC_EVIDENCE/);
  assert.match(flow,/fixedClassCounts: false/);
  assert.match(flow,/fixedPortfolioSize: false/);
});

test('DESIGN_ONLY retains model policy metadata while deterministic department evidence replaces AI lead review',()=>{
  assert.equal(directive.ai.minDistinctModelsPerDepartment,1);
  assert.equal(directive.ai.minDistinctLeadModelsAcrossDepartments,5);
  assert.equal(directive.ai.departmentLeadModelsMustBeDistinct,true);
  assert.equal(new Set(Object.values(directive.ai.departmentLeadModels)).size,5);
  assert.equal(directive.ai.gameDesigner.authorsInitialDetailedDesign,true);
  assert.equal(directive.ai.gameDesigner.singleAuthorPerRevisionCycle,true);
  assert.equal(directive.ai.gameDesigner.sameModelRevisesAfterLeadReview,false);
  assert.match(multimodelWorkflow,/productionClassOf/);
  assert.doesNotMatch(multimodelWorkflow,/productionClassFromLegacyTier|NUMERIC_TIER_POLICY/);
});

test('Vibe2/Vibe3 are the machine-locked game implementation owner from Web-first onward',()=>{
  const authority=roadmap.developmentLifecycleMachine.gameDevelopmentAuthority;
  assert.equal(authority.authority,'VIBE_IMPLEMENTATION_OWNER');
  assert.equal(authority.implementationOwner,'VIBE2_VIBE3');
  assert.equal(authority.appliesFromStage,'WEB_BASE_IMPLEMENTATION');
  assert.equal(authority.ownsWebFirstImplementation,true);
  assert.equal(authority.ownsSelectedPlatformImplementation,true);
  assert.equal(authority.ownsPostReleaseGameSourceDevelopment,true);
  assert.equal(authority.nonVibeAiIsGameDevelopmentOwner,false);
  assert.equal(authority.nonVibeAiMayWriteGameSource,false);
  assert.equal(authority.nonVibeAiMayCreateGameplayFeatureCommits,false);
  assert.equal(authority.nonVibeAiMayModifyOrchestrationCiContractsWhenNeeded,true);
  assert.equal(authority.ownerExplicitInstructionRequiredForAnyException,true);
  assert.equal(directive.ai.vibe2.implementationOwner,true);
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED,'PRIMARY_GAME_IMPLEMENTATION_ENGINE');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED,'PRIMARY_GAME_IMPLEMENTATION_ENGINE');
  assert.equal(directive.ai.nonVibeDevelopmentAssistant.role,'TEACH_REVIEW_DIAGNOSE_UNBLOCK_VALIDATE');
  assert.equal(directive.ai.nonVibeDevelopmentAssistant.gameDevelopmentOwner,false);
  assert.equal(directive.ai.nonVibeDevelopmentAssistant.mayWriteGameSource,false);
  assert.equal(directive.ai.nonVibeDevelopmentAssistant.mayCreateGameplayFeatureCommits,false);
});

test('every game requires a full approved-scope Web companion before selected target platform validation',()=>{
  const development=directive.classes.DEVELOPMENT_CONFIRMED;
  const release=directive.classes.RELEASE_CONFIRMED;
  assert.equal(directive.production.webCompanion.requiredForEveryGame,true);
  assert.equal(directive.production.webCompanion.appliesToAllTargetPlatforms,true);
  assert.equal(directive.production.webCompanion.silentFeatureOmissionForbidden,true);
  assert.equal(directive.production.approvedScopeCompletion.approvedDesignBaselineMustBeFullyImplemented,true);
  assert.equal(directive.production.approvedScopeCompletion.prototypeCannotSatisfyCompletionOrReleaseCandidateGate,true);
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED,'PRIMARY_GAME_IMPLEMENTATION_ENGINE');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED,'PRIMARY_GAME_IMPLEMENTATION_ENGINE');
  assert.equal(development.executionMode,'GATED_DIRECT');
  assert.equal(development.webPurpose,'MANDATORY_FULL_APPROVED_SCOPE_WEB_COMPANION_AND_MUSIC_VALIDATION');
  assert.equal(development.targetPlatformPurpose,'TECHNICAL_AND_GAMEPLAY_VALIDATION');
  assert.equal(development.webBeforeTargetPlatformByDefault,true);
  assert.equal(development.targetPlatformMayRunImmediately,false);
  assert.equal(development.webGameplayValidationRequired,true);
  assert.equal(development.webCompanionValidationRequired,true);
  assert.equal(development.approvedScopeCompletionRequired,true);
  assert.equal(development.musicValidationRequired,true);
  assert.equal(development.webCandidateMustPassBeforeTargetPlatformDispatch,true);
  assert.equal(development.webCandidateFormalImplementationPassRequiredBeforeTargetPlatformDispatch,true);
  assert.equal(development.webStrictHomepageMinimum,80);
  assert.equal(development.formalImplementationMinimumForTargetPlatformDispatch,90);
  assert.equal(development.artbookAfterWebStrictReview,true);
  assert.equal(development.artbookFailureBlocksHomepageRegistrationOnly,true);
  for(const token of ['FULL_APPROVED_SCOPE_WEB_COMPANION_BOOTSTRAP','MUSIC_RUNTIME_BIND','WEB_GAMEPLAY_MUSIC_AND_APPROVED_SCOPE_VALIDATION','WEB_STRICT_REVIEW','POST_WEB_ARTBOOK_IF_SCORE_80_OR_HIGHER','TARGET_PLATFORM_90_POINT_GATE','TARGET_PLATFORM_SOURCE_BIND','TARGET_PLATFORM_GAMEPLAY_VALIDATION','TARGET_PLATFORM_TECHNICAL_VALIDATION'])assert.ok(development.requiredFlow.includes(token),token);
  for(const token of ['REAL_WEB_GAMEPLAY_PASS','APPROVED_SCOPE_FULLY_IMPLEMENTED','MUSIC_RUNTIME_PASS','REAL_TARGET_PLATFORM_GAMEPLAY_PASS','REAL_TARGET_PLATFORM_TECHNICAL_PASS'])assert.ok(development.baselineReadyRequires.includes(token),token);
  assert.equal(development.developmentMusic.firstUserGestureUnlockRequired,true);
  assert.equal(development.developmentMusic.muteControlRequired,true);
  assert.equal(development.developmentMusic.volumeControlRequired,true);
  assert.equal(development.developmentMusic.musicFailureBlocksTargetPlatformDispatch,true);
  assert.equal(release.executionMode,'GATED_DIRECT_RELEASE_PRODUCTION');
  assert.equal(release.target,'PROJECT_SELECTED_PLATFORM');
  assert.equal(release.targetPlatformProjectRequired,true);
  assert.equal(release.webCompanionRequired,true);
  assert.equal(release.approvedScopeCompletionRequired,true);
  assert.equal(release.vibe2PrimaryDeveloper,true);
  assert.equal(release.coreDesignLock,true);
  assert.ok(release.requiredFlow.includes('BIND_CURRENT_WEB_COMPANION_SOURCE_TREE'));
  assert.ok(release.requiredFlow.includes('WEB_COMPANION_RUNTIME_VALIDATION'));
  assert.ok(release.requiredFlow.includes('BIND_CURRENT_TARGET_PLATFORM_SOURCE_TREE'));
  assert.ok(release.requiredFlow.includes('TARGET_PLATFORM_BUILD_OR_PACKAGE'));
  assert.ok(release.requiredFlow.includes('TARGET_PLATFORM_RUNTIME_VALIDATION'));
  assert.match(flow,/webCompanion:[\s\S]*requiredForEveryGame: true/);
  assert.match(flow,/approvedScopeCompletion:[\s\S]*approvedDesignBaselineMustBeFullyImplemented: true/);
  assert.match(flow,/webPurpose: MANDATORY_FULL_APPROVED_SCOPE_WEB_COMPANION_AND_MUSIC_VALIDATION/);
  assert.match(flow,/approvedScopeCompletionRequired: true/);
  assert.match(flow,/APPROVED_SCOPE_FULLY_IMPLEMENTED/);
  assert.match(flow,/musicFailureBlocksTargetPlatformDispatch: true/);
  assert.match(flow,/target: PROJECT_SELECTED_PLATFORM/);
});

test('Web learning evidence is auxiliary and cannot replace native platform evidence',()=>{
  assert.equal(directive.learning.webGameEvidence.role,'AUXILIARY_PORTABLE_LEARNING_EVIDENCE');
  assert.equal(directive.learning.webGameEvidence.cannotClaimNativePlatformSuccess,true);
  assert.equal(directive.learning.webGameEvidence.cannotSatisfyNativePlatformRuntimeGate,true);
  assert.equal(directive.learning.webGameEvidence.cannotEnterRobloxUnityUefnVerifiedLaneWithoutMatchingNativeEvidence,true);
  assert.equal(directive.learning.webGameEvidence.useExistingCanonicalDistillationOnly,true);
  assert.equal(directive.learning.webGameEvidence.newTrainerOrCronForbidden,true);
  assert.match(flow,/role: AUXILIARY_PORTABLE_LEARNING_EVIDENCE/);
  assert.match(flow,/cannotSatisfyNativePlatformRuntimeGate: true/);
  assert.match(nativeDatasetGate,/browser QA must be NOT_APPLICABLE/);
  assert.match(nativeDatasetGate,/runtime PASS required/);
  assert.match(nativeDatasetGate,/real verified/);
});

test('equal-tier design stabilization preserves canonical Web-first development and quality gates',()=>{
  const strategy=directive.platformStrategy.designStabilizationScheduling;
  assert.equal(strategy.mode,'UNITY_ROBLOX_EQUAL_FIRST_TIER');
  assert.deepEqual(strategy.sortKeys,['READINESS_FIRST','ESTIMATED_EXECUTION_EFFICIENCY','OLDEST_PENDING_FIRST']);
  assert.equal(strategy.unityRobloxEqualPriority,true);
  assert.equal(strategy.perGameIndependentCompletion,true);
  assert.equal(strategy.portfolioBarrierForbidden,true);
  assert.equal(strategy.doesNotChangePassThreshold,true);
  assert.equal(strategy.doesNotOverrideHardFailures,true);
  assert.equal(strategy.forcePromotionForbidden,true);
  assert.equal(directive.executionPause.stopAfterStage,'NONE');
  assert.equal(directive.executionPause.webDevelopmentPaused,false);
  assert.equal(directive.executionPause.developmentConfirmedQueueAllowed,true);
  assert.equal(directive.executionPause.developmentRuntimeDispatchAllowed,true);
  assert.equal(directive.executionPause.webImplementationStartForbiddenUntilOwnerResume,false);
  assert.equal(directive.executionPause.designPromotionMayContinueWhileWebPaused,true);
  assert.equal(directive.executionPause.strictDesignGateMustRemainUnchanged,true);
  assert.equal(roadmap.legacyPolicyMirror.authoritative,false);
  assert.equal(roadmap.legacyPolicyMirror.requiredForExecution,false);
  assert.match(flow,/forcePromotionForbidden: true/);
  assert.match(flow,/stopAfterStage: NONE/);
  assert.match(flow,/webDevelopmentPaused: false/);
  assert.match(flow,/developmentRuntimeDispatchAllowed: true/);
});

test('Unity and Roblox share the first development priority tier without creating a platform lock',()=>{
  const strategy=directive.platformStrategy;
  assert.deepEqual(strategy.primaryPlatforms,['UNITY','ROBLOX']);
  assert.equal(strategy.primaryPlatformLegacyCompatibilityOnly,true);
  assert.deepEqual(strategy.priority,['UNITY','ROBLOX','FORTNITE_UEFN']);
  assert.deepEqual(strategy.priorityTiers,[['UNITY','ROBLOX'],['FORTNITE_UEFN']]);
  assert.equal(strategy.priorityMeaning,'UNITY_ROBLOX_EQUAL_FIRST_TIER_READINESS_AND_EXECUTION_EFFICIENCY_TIEBREAK');
  assert.equal(strategy.designStabilizationScheduling.unityRobloxEqualPriority,true);
  assert.equal(strategy.designStabilizationScheduling.mode,'UNITY_ROBLOX_EQUAL_FIRST_TIER');
  assert.equal(strategy.allThreePlatformsMayBeDevelopedConcurrently,true);
  assert.equal(strategy.priorityDoesNotCreatePlatformLock,true);
  assert.equal(strategy.roadmapPhaseEntryGatesForbidden,true);
  assert.equal(strategy.platformDevelopmentMayStartWithoutPriorPlatformCompletion,true);
  assert.equal(strategy.platformReleaseMayProceedWhenItsOwnEvidenceGatesPass,true);
  assert.deepEqual(strategy.developmentAccess,{ROBLOX:'ALWAYS_ALLOWED',UNITY:'ALWAYS_ALLOWED',FORTNITE_UEFN:'ALWAYS_ALLOWED'});
  assert.equal(strategy.UNITY.existingPathPreserved,true);
  assert.equal(strategy.UNITY.robloxDoesNotReplaceUnity,true);
  assert.equal(roadmap.platformPriorityInvariant.mode,'UNITY_ROBLOX_EQUAL_FIRST_TIER');
  assert.deepEqual(roadmap.platformPriorityInvariant.priorityTiers,[['UNITY','ROBLOX'],['FORTNITE_UEFN']]);
  assert.equal(roadmap.platformPriorityInvariant.robloxMustReceiveFirstEligibleDevelopmentSlot,false);
  assert.match(flow,/allThreePlatformsMayBeDevelopedConcurrently: true/);
  assert.match(flow,/roadmapPhaseEntryGatesForbidden: true/);
});

test('owner permanent removal is machine-enforced and cannot auto-recover',()=>{
  const ids=['seed-roblox-battleground-fight-welcome-to-bloxburg','seed-roblox-obby-party-minigam-tower-of-hell'];
  assert.deepEqual(roadmap.permanentProjectRemoval.ids,ids);
  assert.equal(roadmap.permanentProjectRemoval.reentryAllowed,false);
  assert.equal(roadmap.permanentProjectRemoval.automaticRecoveryAllowed,false);
  assert.equal(roadmap.permanentProjectRemoval.automaticMaintenanceAllowed,false);
  assert.deepEqual(directive.platformStrategy.permanentRemovedGameIds,ids);
});

test('paid execution remains forbidden',()=>{
  assert.equal(directive.ai.paidAiAllowed,false);
  assert.equal(directive.ai.paidRunnerAllowed,false);
  assert.ok(directive.rules.includes('paid-ai-paid-overage-and-paid-runners-remain-forbidden'));
});


test('Roblox deployment control allows guarded Open Cloud publishing only',()=>{
  const control=roadmap.roblox.deploymentControl;
  assert.equal(control.automaticPublishPaused,false);
  assert.equal(control.automaticReleaseDispatchAllowed,true);
  assert.equal(control.manualPublishAllowed,true);
  assert.deepEqual(control.allowedPublishRoutes,[
    'GITHUB_CLOUD_OPEN_CLOUD',
    'LOCAL_SELF_HOSTED_OPEN_CLOUD',
  ]);
  assert.equal(control.studioUiPublishAllowed,false);
  assert.equal(control.cookiePublishAllowed,false);
  assert.equal(control.resumeMode,'AUTO_AFTER_CANONICAL_FINAL_REVIEW');
  assert.equal(control.openCloudSafety.officialApiOnly,true);
  assert.equal(control.openCloudSafety.exactFinalReviewedArtifactRequired,true);
  assert.equal(control.openCloudSafety.transient409RetryWithinRun,true);
  assert.equal(control.openCloudSafety.automaticRedispatchAfter409,false);
  assert.equal(control.ownerPinnedPublicationTarget.enabled,true);
  assert.equal(control.ownerPinnedPublicationTarget.fallbackOnlyWhenNoGameSpecificVerifiedTarget,true);
  assert.equal(control.ownerPinnedPublicationTarget.requireGitHubSecretIdMatch,true);
  assert.equal(control.openCloudSafety.credentialSmoke.passed,true);
  assert.equal(control.openCloudSafety.credentialSmoke.releaseClaim,false);
});


test('development WIP is policy-unbounded while external capacity and gates remain fail-closed',()=>{
  assert.equal(roadmap.platformRepresentativeSets.implementationWipTarget,null);
  assert.equal(roadmap.platformRepresentativeSets.implementationWipMax,null);
  assert.equal(roadmap.platformRepresentativeSets.implementationWipPolicy,'UNBOUNDED_BY_INTERNAL_POLICY_EXTERNAL_PROVIDER_CAPACITY_ONLY');
  assert.equal(roadmap.developmentSpeedExecution.globalSelectedPlatformDevelopmentWipMax,null);
  assert.equal(roadmap.developmentSpeedExecution.internalArtificialConcurrencyCapsForbidden,true);
  assert.equal(roadmap.developmentSpeedExecution.externalMatrixBatchMax,256);
  assert.equal(roadmap.developmentLifecycleMachine.selfRecoveryAndBottleneckRelief.invariants.noGateBypass,true);
  assert.equal(directive.executionPause.strictDesignGateMustRemainUnchanged,true);
  assert.equal(directive.stageGateScoringV2.currentThresholds.design,80);
  assert.equal(directive.stageGateScoringV2.currentThresholds.web,80);
});


test('all automated gates repair and retest the same failed gate until PASS',()=>{
  const loop=roadmap.developmentLifecycleMachine.selfRecoveryAndBottleneckRelief.automaticGateRepairLoop;
  assert.equal(loop.enabled,true);
  assert.equal(loop.perGameIndependent,true);
  assert.equal(loop.maxParallelGames,null);
  assert.equal(loop.parallelismPolicy,'UNBOUNDED_BY_INTERNAL_POLICY_EXTERNAL_CAPACITY_ONLY');
  assert.equal(loop.portfolioWidePassBarrier,false);
  assert.equal(loop.retryLimit,'UNLIMITED_UNTIL_PASS_OR_EXPLICIT_STOP_CONDITION');
  assert.equal(loop.advanceOnFailure,false);
  assert.equal(loop.skipFailedGateAllowed,false);
  assert.equal(loop.lowerThresholdAllowed,false);
  assert.equal(loop.fabricatePassAllowed,false);
  assert.deepEqual(loop.loop,[
    'RUN_CURRENT_GATE',
    'ON_PASS_ADVANCE_TO_NEXT_CANONICAL_STAGE',
    'ON_FAIL_CAPTURE_EXACT_FAILURE_EVIDENCE',
    'AUTOMATICALLY_REPAIR_ONLY_THE_FAILED_OR_CAUSAL_SCOPE',
    'PRESERVE_ALREADY_VERIFIED_STATE_AND_CHECKPOINTS',
    'RERUN_THE_SAME_FAILED_GATE',
    'REPEAT_REPAIR_AND_SAME_GATE_RETEST_UNTIL_PASS',
  ]);
  assert.equal(loop.externalCapacityWait.countsAsGateFailure,false);
  assert.equal(loop.externalCapacityWait.consumesDevelopmentSlot,false);
  assert.equal(loop.externalCapacityWait.preserveCheckpoint,true);
  assert.equal(loop.externalCapacityWait.resumeExactFailedGate,true);
  assert.equal(loop.externalCapacityWait.busyLoopForbidden,true);
});


test('Director supervisor consumes canonical machine policy and treats COMPANY_FLOW as legacy mirror only',()=>{
  assert.match(directorSupervisor,/company-learning\/platform-release-roadmap\.json/);
  assert.match(directorSupervisor,/directive\.machineSourceOfTruth!==machineSource/);
  assert.match(directorSupervisor,/policy\.machineSourceOfTruth!==machineSource/);
  assert.match(directorSupervisor,/MACHINE_EXECUTION_CONTRACT/);
  assert.match(directorSupervisor,/authority: LEGACY_POLICY_MIRROR/);
  assert.match(directorSupervisor,/authoritative: false/);
  assert.doesNotMatch(directorSupervisor,/directive\.policyDocument!=='COMPANY_FLOW\.md'/);
  assert.doesNotMatch(directorSupervisor,/policy authority: COMPANY_FLOW\.md only/);
});

test('24h learning is Gemini-free and provider failure cannot stop the portfolio',()=>{
  const quota=roadmap.developmentLifecycleMachine.modelQuotaContinuity;
  const learning=quota.learningProviderIsolation;
  const fallback=quota.providerFailureSubstitution;
  assert.equal(learning.enabled,true);
  assert.equal(learning.continuous24hLearningProvider,'VIBE_LOCAL_OLLAMA');
  assert.equal(learning.localModel,'qwen3:1.7b');
  assert.equal(learning.geminiAllowedFor24hLearning,false);
  assert.equal(learning.paidExternalApiAllowedFor24hLearning,false);
  assert.equal(learning.providerOutageMayStopLearning,false);
  assert.deepEqual(learning.fallbackChain,[
    'VIBE_LOCAL_OLLAMA',
    'DETERMINISTIC_VERIFIED_EVIDENCE_MINING',
    'STATIC_CODE_PATTERN_AND_FAILURE_REGRESSION_DISTILLATION',
    'NON_MODEL_MUTATION_QA_AND_TEST_GENERATION',
  ]);
  assert.equal(fallback.enabled,true);
  assert.equal(fallback.substituteBeforePortfolioWait,true);
  assert.equal(fallback.designAuthoringAndRepairFallback,'VIBE_LOCAL_OLLAMA');
  assert.equal(fallback.gateDecisionAuthority,'DETERMINISTIC_EVIDENCE_ONLY');
  assert.equal(fallback.learningFallback,'NON_MODEL_VERIFIED_EVIDENCE_PIPELINE');
  assert.equal(fallback.blockedProviderConsumesDevelopmentSlot,false);
  assert.equal(fallback.noPortfolioWideStop,true);
  assert.equal(fallback.preserveCheckpoint,true);
  assert.equal(fallback.resumeExactFailedWork,true);
});
