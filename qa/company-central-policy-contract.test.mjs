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
const architecture=readJson('company-learning/company-architecture-map.json');
const multimodelWorkflow=readText('.github/workflows/artbook-free-department-bots.yml');
const designCycle=readText('tools/company-design-cycle.mjs');
const pipeline=readText('tools/artbook-production-pipeline.mjs');
const nativeDevelopmentWorkflow=readText('.github/workflows/company-development-confirmed-runtime.yml');
const unityRuntimeWorkflow=readText('.github/workflows/company-development-unity-runtime.yml');
const unityWebWorkflow=readText('.github/workflows/unity-web-first-stage-build.yml');
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

test('DESIGN_ONLY is transient until the minimum dual-platform design contract is ready',()=>{
  const design=directive.classes.DESIGN_ONLY;
  const development=directive.classes.DEVELOPMENT_CONFIRMED;
  assert.equal(design.status,'TRANSIENT_PRE_MINIMUM_DESIGN');
  assert.equal(design.developmentAdmissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_CONTRACT_ONLY');
  assert.equal(design.strictDesignScoreRequiredForAdmission,false);
  assert.equal(design.strictDesignReviewRunsInParallelAfterAdmission,true);
  assert.deepEqual(design.requiredFlow,[
    'GAME_SEED','COMMON_CORE_MINIMUM_DESIGN','ROBLOX_PLATFORM_PROFILE','UNITY_PLATFORM_PROFILE','MINIMUM_DUAL_PLATFORM_DESIGN_CONTRACT'
  ]);
  assert.deepEqual(design.baselineReadyRequires,[
    'GAME_SEED_COMPLETE','MINIMUM_COMMON_CORE_READY','ROBLOX_PLATFORM_PROFILE_READY','UNITY_PLATFORM_PROFILE_READY','PLATFORM_PROFILES_DISTINCT'
  ]);
  assert.equal(design.readyState,'MINIMUM_DESIGN_READY');
  assert.equal(design.longLivedPromotionGate,false);
  assert.equal(development.executionMode,'DIRECT_NATIVE_DUAL_PLATFORM');
  assert.equal(development.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(development.strictDesignScoreRequiredForAdmission,false);
  assert.equal(development.strictDesignReviewRunsInParallel,true);
  assert.deepEqual(development.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(development.onePlatformFailureDoesNotCancelOther,true);
  assert.equal(development.targetPlatformMayRunImmediately,true);
  for(const token of ['LOAD_MINIMUM_SHARED_DESIGN','ROBLOX_UNITY_NATIVE_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION','INTERNAL_PLATFORM_RELEASE','INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG','TARGETED_REPAIR_AND_REVALIDATION','PUBLIC_RELEASE_READY'])assert.ok(development.requiredFlow.includes(token),token);
  assert.equal(development.presentationSupport.graphicsRoot,'GRAPHICS_PRODUCTION');
  assert.equal(development.presentationSupport.audioAuthoringOwner,'audio');
  assert.equal(development.presentationSupport.artbookRunsInParallel,true);
  assert.equal(directive.ai.vibe2.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive,false);
  assert.equal(directive.ai.vibe2.ownsWebFirstImplementation,false);
  assert.equal(directive.ai.vibe2.ownsSelectedPlatformImplementation,true);
  assert.equal(Object.hasOwn(directive.ai.vibe2.roleByClass,'DESIGN_ONLY'),false);
});

test('Unity Web is the browser validation surface of the same canonical Unity project',()=>{
  const development=directive.classes.DEVELOPMENT_CONFIRMED;
  assert.equal(development.unityWebValidationSurface?.enabled,true);
  assert.equal(development.unityWebValidationSurface?.optional,true);
  assert.equal(development.unityWebValidationSurface?.canonicalSourceRoot,'unity-games/<gameId>/');
  assert.equal(development.unityWebValidationSurface?.outputRoot,'web-games/<gameId>/');
  assert.equal(development.unityWebValidationSurface?.sameCanonicalUnityProjectRequired,true);
  assert.equal(development.unityWebValidationSurface?.nativeGateAuthority,false);
  assert.equal(directive.production.webCompanion?.legacyDirectWebAuthoring,false);
  assert.equal(directive.production.webCompanion?.canonicalSource,'UNITY_PROJECT_WHEN_UNITY_WEB_AVAILABLE');
  assert.ok(directive.gameSeed.derivedProductionRequirements.includes('UNITY_WEB_VALIDATION_SURFACE_WHEN_BUILDABLE'));
  assert.ok(!directive.gameSeed.derivedProductionRequirements.includes('MANDATORY_WEB_GAME_COMPANION'));
  assert.equal(roadmap.unityWebFirstStage?.enabled,true);
  assert.equal(roadmap.unityWebFirstStage?.validationSurfaceOnly,true);
  assert.equal(roadmap.unityWebFirstStage?.developmentAdmissionAuthority,false);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWeb,'VALIDATION_SURFACE_ONLY');
  assert.equal(architecture.homepagePipeline?.unityWebDisabled,false);
  assert.equal(architecture.homepagePipeline?.webPlaySurfaceDisabled,false);
  assert.match(designCycle,/unityWebValidationSurfaceContract/);
  assert.equal(roadmap.directNativeDualPlatformDevelopment?.unityWebValidationSurface?.sameCanonicalUnityProjectRequired,true);
  assert.match(nativeDevelopmentWorkflow,/gh workflow run unity-web-first-stage-build\.yml/);
  assert.match(nativeDevelopmentWorkflow,/UNITY_WEB_RUNTIME_ROLE=NON_BLOCKING_VALIDATION_SURFACE/);
  assert.match(unityRuntimeWorkflow,/UNITY_WEB_VALIDATION=NON_BLOCKING_SEPARATE_WORKFLOW/);
  assert.doesNotMatch(unityRuntimeWorkflow,/UNITY_WEB_VALIDATION=DISABLED/);
  assert.match(unityWebWorkflow,/Unity WebGL Validation Surface Build/);
  assert.match(unityWebWorkflow,/canonicalGameSourceRoot!=='unity-games\/<gameId>\/'/);
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

test('DESIGN_ONLY keeps deterministic evidence while lead-model distinctness is not an execution gate',()=>{
  assert.equal(directive.ai.minDistinctModelsPerDepartment,1);
  assert.equal(directive.ai.minDistinctLeadModelsAcrossDepartments,1);
  assert.equal(directive.ai.departmentLeadModelsMustBeDistinct,false);
  assert.equal(directive.ai.departmentLeadAssignmentRemappable,true);
  assert.equal(directive.ai.leadDistinctnessPolicy,'NOT_REQUIRED_FOR_EXECUTION');
  assert.equal(directive.ai.gameDesigner.authorsInitialDetailedDesign,true);
  assert.equal(directive.ai.gameDesigner.singleAuthorPerRevisionCycle,true);
  assert.equal(directive.ai.gameDesigner.sameModelRevisesAfterLeadReview,false);
  assert.match(multimodelWorkflow,/productionClassOf/);
  assert.doesNotMatch(multimodelWorkflow,/productionClassFromLegacyTier|NUMERIC_TIER_POLICY/);
});

test('department launcher sweeps all canonical production classes without cancelling active game work',()=>{
  assert.match(multimodelWorkflow,/const resumableTargets=games\.filter/);
  assert.match(multimodelWorkflow,/PRODUCTION_CLASSES\.DEVELOPMENT_CONFIRMED/);
  assert.match(multimodelWorkflow,/PRODUCTION_CLASSES\.RELEASE_CONFIRMED/);
  assert.match(multimodelWorkflow,/const portfolioSweepTargets=\[\]/);
  assert.match(multimodelWorkflow,/\.\.\.ownerResetTargets,\.\.\.resumableTargets,\.\.\.genericDesignTargets/);
  assert.match(multimodelWorkflow,/selected=portfolioSweepTargets/);
  assert.doesNotMatch(multimodelWorkflow,/group: free-artbook-departments-main[\s\S]{0,80}cancel-in-progress: true/);
  assert.match(multimodelWorkflow,/group: free-artbook-department-\$\{\{ matrix\.target\.game_id \}\}/);
  assert.match(multimodelWorkflow,/cancel-in-progress: false/);
});

test('department launcher delegates DEVELOPMENT_CONFIRMED to one canonical direct-native runtime',()=>{
  assert.match(multimodelWorkflow,/native_development_required/);
  assert.match(multimodelWorkflow,/native_development_ids/);
  assert.match(multimodelWorkflow,/productionSelected=selected\.filter\(row=>row\.productionClass!==PRODUCTION_CLASSES\.DEVELOPMENT_CONFIRMED\)/);
  assert.match(multimodelWorkflow,/gh workflow run company-development-confirmed-runtime\.yml/);
  assert.match(multimodelWorkflow,/DEPARTMENT_NATIVE_DEVELOPMENT_DISPATCH=SKIP_ACTIVE_RUNTIME/);
  assert.match(multimodelWorkflow,/actions: write/);
  assert.doesNotMatch(pipeline,/await run\('tools\/company-development-validation-cycle\.mjs'\)/);
  assert.doesNotMatch(pipeline,/await run\('tools\/company-development-disposition-gate\.mjs'\)/);
  assert.match(pipeline,/DEVELOPMENT_EXECUTION_MODE=DIRECT_NATIVE_DUAL_PLATFORM/);
  assert.match(pipeline,/DEVELOPMENT_RUNTIME_OWNER=\.github\/workflows\/company-development-confirmed-runtime\.yml/);
  assert.match(pipeline,/DEVELOPMENT_LEGACY_WEB_FIRST_VALIDATION=DISABLED/);
});

test('Vibe2/Vibe3 remain primary integration and learning owner for direct-native implementation with isolated external AI collaboration',()=>{
  const authority=roadmap.developmentLifecycleMachine.gameDevelopmentAuthority;
  assert.equal(authority.authority,'VIBE_PRIMARY_INTEGRATION_AND_LEARNING_OWNER_WITH_FULL_PROCESS_COLLABORATION');
  assert.equal(authority.implementationOwner,'VIBE2_VIBE3_PRIMARY_WITH_ASSIGNED_EXTERNAL_AI_COLLABORATORS');
  assert.equal(authority.appliesFromStage,'MINIMUM_DESIGN_CONTRACT_READY');
  assert.equal(authority.ownsWebFirstImplementation,false);
  assert.equal(authority.ownsSelectedPlatformImplementation,true);
  assert.equal(authority.ownsPostReleaseGameSourceDevelopment,true);
  assert.equal(authority.ownsInternalPlaytestRepair,true);
  assert.equal(authority.nonVibeAiIsGameDevelopmentOwner,false);
  assert.equal(authority.nonVibeAiMayWriteGameSource,true);
  assert.equal(authority.nonVibeAiMayCreateGameplayFeatureCommits,true);
  assert.equal(authority.nonVibeAiGameSourceWriteMode,'EXPLICIT_RESPONSIBLE_FILES_ISOLATED_CANDIDATE_BRANCH_ONLY');
  assert.equal(authority.nonVibeAiGameplayFeatureCommitMode,'CANDIDATE_BRANCH_ONLY_NO_DIRECT_MAIN');
  assert.equal(authority.nonVibeAiMayModifyOrchestrationCiContractsWhenNeeded,true);
  assert.equal(authority.externalAiSelfAcceptance,false);
  assert.equal(authority.externalAiDirectMainWrite,false);
  assert.equal(authority.vibeMustLearnDuringCollaborativeWork,true);
  assert.equal(authority.verifiedResultsReturnToExistingLearningMotor,true);
  assert.equal(directive.ai.vibe2.implementationOwner,true);
  assert.equal(directive.ai.vibe2.ownsWebFirstImplementation,false);
  assert.equal(directive.ai.vibe2.ownsSelectedPlatformImplementation,true);
  assert.equal(directive.ai.vibe2.roleByClass.DEVELOPMENT_CONFIRMED,'PRIMARY_GAME_IMPLEMENTATION_ENGINE');
  assert.equal(directive.ai.vibe2.roleByClass.RELEASE_CONFIRMED,'PRIMARY_GAME_IMPLEMENTATION_ENGINE');
});

test('direct-native development keeps Unity Web optional and preserves native evidence gates',()=>{
  const development=directive.classes.DEVELOPMENT_CONFIRMED;
  const release=directive.classes.RELEASE_CONFIRMED;
  const web=development.unityWebValidationSurface;
  assert.equal(development.executionMode,'DIRECT_NATIVE_DUAL_PLATFORM');
  assert.equal(development.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(development.targetPlatformPurpose,'PRIMARY_NATIVE_IMPLEMENTATION_AND_VALIDATION');
  assert.equal(development.targetPlatformMayRunImmediately,true);
  assert.equal(development.approvedScopeCompletionRequired,true);
  assert.equal(web.enabled,true);
  assert.equal(web.optional,true);
  assert.equal(web.sameCanonicalUnityProjectRequired,true);
  assert.equal(web.nativeGateAuthority,false);
  assert.equal(web.missingOrFailedBuildDoesNotBlockNative,true);
  for(const token of ['ROBLOX_UNITY_NATIVE_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION','INTERNAL_PLATFORM_RELEASE','INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'])assert.ok(development.requiredFlow.includes(token),token);
  for(const token of ['PLATFORM_SPECIFIC_SOURCE_EXISTS','PLATFORM_SPECIFIC_RUNTIME_PASS','PLATFORM_SPECIFIC_INDEPENDENT_QA_PASS','PLATFORM_SPECIFIC_REGRESSION_PASS'])assert.ok(development.baselineReadyRequires.includes(token),token);
  assert.equal(release.executionMode,'GATED_DIRECT_RELEASE_PRODUCTION');
  assert.equal(release.target,'PROJECT_SELECTED_PLATFORM');
  assert.equal(release.targetPlatformProjectRequired,true);
  assert.equal(release.webCompanionRequired,false);
  assert.equal(release.approvedScopeCompletionRequired,true);
  assert.equal(release.vibe2PrimaryDeveloper,true);
  assert.equal(release.coreDesignLock,true);
  assert.ok(release.requiredFlow.includes('BIND_CURRENT_TARGET_PLATFORM_SOURCE_TREE'));
  assert.ok(release.requiredFlow.includes('TARGET_PLATFORM_BUILD_OR_PACKAGE'));
  assert.ok(release.requiredFlow.includes('TARGET_PLATFORM_RUNTIME_VALIDATION'));
  assert.ok(release.requiredFlow.includes('INDEPENDENT_QA_AND_REGRESSION'));
  assert.ok(!release.requiredFlow.includes('BIND_CURRENT_WEB_COMPANION_SOURCE_TREE'));
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

test('equal-tier scheduling keeps strict design as a parallel quality signal, not admission authority',()=>{
  const strategy=directive.platformStrategy.designStabilizationScheduling;
  assert.equal(strategy.mode,'UNITY_ROBLOX_EQUAL_FIRST_TIER');
  assert.deepEqual(strategy.sortKeys,['READINESS_FIRST','ESTIMATED_EXECUTION_EFFICIENCY','OLDEST_PENDING_FIRST']);
  assert.equal(strategy.unityRobloxEqualPriority,true);
  assert.equal(strategy.perGameIndependentCompletion,true);
  assert.equal(strategy.portfolioBarrierForbidden,true);
  assert.equal(strategy.strictDesignQualityTargetScore,80);
  assert.equal(strategy.developmentAdmissionUsesStrictScore,false);
  assert.equal(strategy.hardDesignFailuresCreateParallelRepair,true);
  assert.equal(directive.executionPause.stopAfterStage,'NONE');
  assert.equal(directive.executionPause.developmentConfirmedQueueAllowed,true);
  assert.equal(directive.executionPause.developmentRuntimeDispatchAllowed,true);
  assert.equal(roadmap.legacyPolicyMirror.authoritative,false);
  assert.equal(roadmap.legacyPolicyMirror.requiredForExecution,false);
});

test('Unity and Roblox share the active first development tier while Fortnite UEFN remains owner-held',()=>{
  const strategy=directive.platformStrategy;
  assert.deepEqual(strategy.primaryPlatforms,['UNITY','ROBLOX']);
  assert.equal(strategy.primaryPlatformLegacyCompatibilityOnly,true);
  assert.deepEqual(strategy.priority,['ROBLOX','UNITY']);
  assert.deepEqual(strategy.priorityTiers,[['UNITY','ROBLOX']]);
  assert.equal(strategy.priorityMeaning,'ROBLOX_UNITY_ACTIVE_EQUAL_TIER_UEFN_OWNER_HOLD');
  assert.equal(strategy.designStabilizationScheduling.unityRobloxEqualPriority,true);
  assert.equal(strategy.designStabilizationScheduling.mode,'UNITY_ROBLOX_EQUAL_FIRST_TIER');
  assert.equal(strategy.allThreePlatformsMayBeDevelopedConcurrently,false);
  assert.equal(strategy.priorityDoesNotCreatePlatformLock,true);
  assert.equal(strategy.roadmapPhaseEntryGatesForbidden,true);
  assert.equal(strategy.platformDevelopmentMayStartWithoutPriorPlatformCompletion,true);
  assert.equal(strategy.platformReleaseMayProceedWhenItsOwnEvidenceGatesPass,true);
  assert.deepEqual(strategy.developmentAccess,{ROBLOX:'ALWAYS_ALLOWED',UNITY:'ALWAYS_ALLOWED',FORTNITE_UEFN:'OWNER_HOLD'});
  assert.equal(strategy.UNITY.existingPathPreserved,true);
  assert.equal(strategy.UNITY.robloxDoesNotReplaceUnity,true);
  assert.equal(strategy.FORTNITE_UEFN.role,'OWNER_HOLD_SUPPORTED_PLATFORM');
  assert.equal(strategy.FORTNITE_UEFN.developmentAlwaysAllowed,false);
  assert.equal(roadmap.platformPriorityInvariant.mode,'UNITY_ROBLOX_EQUAL_FIRST_TIER');
  assert.deepEqual(roadmap.platformPriorityInvariant.priorityTiers,[['UNITY','ROBLOX']]);
  assert.equal(roadmap.platformPriorityInvariant.robloxMustReceiveFirstEligibleDevelopmentSlot,false);
  assert.equal(roadmap.platformPriorityInvariant.fortniteUefnDevelopmentStillAllowed,false);
  assert.equal(roadmap.platformPriorityInvariant.fortniteUefnState,'OWNER_HOLD');
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


test('development WIP is policy-unbounded while execution capacity and gates remain fail-closed',()=>{
  assert.equal(roadmap.platformRepresentativeSets.implementationWipTarget,null);
  assert.equal(roadmap.platformRepresentativeSets.implementationWipMax,null);
  assert.equal(roadmap.platformRepresentativeSets.implementationWipPolicy,'UNBOUNDED_TOTAL_ELIGIBILITY_EXTERNAL_EXECUTION_CAPACITY_ONLY');
  assert.equal(roadmap.platformRepresentativeSets.implementationWipScope,'UNBOUNDED_ELIGIBLE_GAMES_CAPACITY_BATCHED_ONLY');
  assert.equal(roadmap.developmentSpeedExecution.globalSelectedPlatformDevelopmentWipMax,null);
  assert.equal(roadmap.developmentSpeedExecution.internalArtificialConcurrencyCapsForbidden,true);
  assert.equal(roadmap.developmentSpeedExecution.externalMatrixBatchMax,256);
  assert.equal(roadmap.developmentLifecycleMachine.selfRecoveryAndBottleneckRelief.invariants.noGateBypass,true);
  assert.equal(directive.executionPause.strictDesignReviewParallel,true);
  assert.equal(directive.stageGateScoringV2.designScoreRole,'PARALLEL_QUALITY_SIGNAL_NOT_DEVELOPMENT_ADMISSION');
  assert.equal(directive.stageGateScoringV2.currentThresholds.design,80);
  assert.equal(directive.stageGateScoringV2.currentThresholds.targetPlatformCompletion,90);
});

test('all automated gates repair and retest the same failed gate until PASS',()=>{
  const loop=roadmap.developmentLifecycleMachine.selfRecoveryAndBottleneckRelief.automaticGateRepairLoop;
  assert.equal(loop.enabled,true);
  assert.equal(loop.perGameIndependent,true);
  assert.equal(loop.maxParallelGames,null);
  assert.equal(loop.parallelismPolicy,'UNBOUNDED_BY_INTERNAL_POLICY_EXTERNAL_CAPACITY_ONLY');
  assert.equal(loop.portfolioWidePassBarrier,false);
  assert.equal(loop.retryLimit,'UNLIMITED_CAUSAL_REPAIR_WITH_LOCAL_INHIBITORS');
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


test('Vibe work learning and hypothesis universe has no total item ceiling and priority only reorders signals',()=>{
  const universe=roadmap.neuralDevelopmentBrain.unboundedWorkUniverse;
  const learning=roadmap.developmentLifecycleMachine.learningMotor;
  assert.equal(universe.totalWorkItemLimit,null);
  assert.equal(universe.totalLearningItemLimit,null);
  assert.equal(universe.totalPracticeItemLimit,null);
  assert.equal(universe.totalHypothesisItemLimit,null);
  assert.equal(universe.totalExternalKnowledgeCandidateLimit,null);
  assert.equal(universe.priorityMeaning,'ORDER_AND_RESOURCE_ALLOCATION_ONLY_NOT_EXISTENCE_OR_TERMINATION');
  assert.equal(universe.scheduling.internalTotalCountCapForbidden,true);
  assert.equal(universe.scheduling.lowPriorityWorkRemainsLive,true);
  assert.equal(universe.externalKnowledgeAcquisition.candidateUniverseUnbounded,true);
  assert.equal(universe.externalKnowledgeAcquisition.contextWindowIsNotCollectionLimit,true);
  assert.equal(learning.practiceSignalGenerationAlwaysOn,true);
  assert.equal(learning.practiceGenerationLimit,null);
  assert.equal(learning.relearningGenerationLimit,null);
  assert.equal(learning.domainMasteryLevelLimit,null);
  assert.equal(learning.verifiedMasteryGrowthUnbounded,true);
  assert.equal(roadmap.learningClosedLoopContract.continuousRelearning.practiceSignalGenerationNeverStops,true);
  assert.equal(roadmap.learningClosedLoopContract.capabilityGrowth.domainMasteryLevelLimit,null);
  assert.equal(roadmap.vibeCognitiveCore.continuousSelfModelLearning.selfModelHypothesisGenerationAlwaysOn,true);
  assert.equal(roadmap.vibeCognitiveCore.continuousSelfModelLearning.selfRealizationInterpretation,'FUNCTIONAL_SELF_MODEL_INSIGHT_AND_CAPABILITY_CALIBRATION_NOT_SENTIENCE_CLAIM');
});

test('Vibe brain is always running and uses verified checkpoints instead of terminal completion',()=>{
  const brain=roadmap.neuralDevelopmentBrain;
  const loop=roadmap.developmentLifecycleMachine.selfRecoveryAndBottleneckRelief.automaticGateRepairLoop;
  const shared=roadmap.developmentLifecycleMachine.sharedWorkerContext;
  assert.equal(brain.livenessContract.runState,'ALWAYS_RUNNING');
  assert.equal(brain.livenessContract.globalTerminalStateForbidden,true);
  assert.equal(brain.livenessContract.signalTerminalStateForbidden,true);
  assert.equal(brain.livenessContract.verifiedWorkMeaning,'CHECKPOINT_AND_NEXT_CAUSAL_INPUT_NOT_TERMINAL_COMPLETION');
  assert.equal(loop.globalStopAllowed,false);
  assert.equal(loop.passMeaning,'VERIFIED_CHECKPOINT_THEN_NEXT_CANONICAL_CAUSAL_EVENT');
  assert.equal(loop.inhibitorMeaning,'LOCAL_ACTION_OR_ROUTE_ONLY');
  assert.equal(shared.vibeControlSynchronization.requiredBeforeEveryWorkerStarts,true);
  assert.equal(shared.vibeControlSynchronization.unsynchronizedWorkerMayNotStart,true);
  assert.equal(roadmap.vibeExecutionLaneContract.signalCirculation.allDomainsAreLiveSignalParticipants,true);
  assert.equal(roadmap.vibeExecutionLaneContract.signalCirculation.learningIsOnlyOneSignalDomain,true);
  assert.equal(roadmap.vibeExecutionLaneContract.signalCirculation.gameDevelopmentSignalHasNoTerminalDoneState,true);
  assert.ok(!roadmap.assistantRoadmapOrchestration.workRequestContract.claimStateValues.includes('DONE'));
  assert.ok(roadmap.assistantRoadmapOrchestration.workRequestContract.claimStateValues.includes('VERIFIED_CHECKPOINT'));
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


test('제2규칙 binds every observable external AI action to security quarantine and verified Vibe learning',()=>{
  const rule=roadmap.ownerCanonicalRules?.rule2;
  const worker=roadmap.developmentLifecycleMachine.primaryAiOrchestration.externalAiWorkerPolicy;
  const security=roadmap.developmentLifecycleMachine.securityImmuneSystem;
  assert.equal(rule?.id,'RULE_2_EXTERNAL_AI_SECURITY_CAPTURE_AND_VERIFIED_ABSORPTION');
  assert.equal(rule?.automaticContractBinding,true);
  assert.equal(rule?.allExternalAiWorkersBound,true);
  assert.equal(rule?.allCodingActionsIncluded,true);
  assert.equal(rule?.everyActionBecomesLearningCandidate,true);
  assert.equal(rule?.securityStewardMonitorsBeforeAcceptance,true);
  assert.equal(rule?.rawHostilePayloadMayEnterLearning,false);
  assert.equal(rule?.attackOrDestructionOfExternalProviderForbidden,true);
  assert.equal(rule?.authorityExpansion,false);
  assert.equal(rule?.gateWeakening,false);
  assert.equal(worker.ownerRule2AutomaticBinding,true);
  assert.equal(worker.hostileAttemptTerminatesAffectedExecutionContext,true);
  assert.equal(worker.hostileAttemptMayNotPublishCandidate,true);
  assert.equal(security.monitorAllObservableExternalAiActivity,true);
  assert.equal(security.quarantineBlocksCandidatePublication,true);
});


test('Vibe may evolve its own internal architecture from verified structural evidence without authority expansion',()=>{
  const e=roadmap.developmentLifecycleMachine.selfRecoveryAndBottleneckRelief.selfArchitectureEvolution;
  assert.equal(e.enabled,true);
  assert.equal(e.actor,'VIBE2_VIBE3');
  assert.equal(e.externalPromptRequired,false);
  assert.equal(e.totalEvolutionGenerationLimit,null);
  assert.equal(e.proposalGenerationLimit,null);
  assert.equal(e.systemConstructionAllowed,true);
  assert.equal(e.existingSystemRefactorAllowed,true);
  assert.equal(e.unchangedEvidenceBusyLoopForbidden,true);
  assert.equal(e.newEvidenceMayGenerateNextEvolution,true);
  assert.equal(e.beforeAfterComparisonRequired,true);
  assert.equal(e.fullRegressionRequired,true);
  assert.equal(e.securityVerificationRequired,true);
  assert.equal(e.rollbackOnRegressionOrNoImprovement,true);
  assert.equal(e.authorityExpansionForbidden,true);
  assert.equal(e.gateWeakeningForbidden,true);
  assert.equal(e.executionUsesExistingScheduler,true);
});


test('Vibe self-architecture evolution is executable and adopted only after verified improvement',()=>{
  const e=roadmap.developmentLifecycleMachine.selfRecoveryAndBottleneckRelief.selfArchitectureEvolution;
  assert.equal(e.executionLaneConnected24h,true);
  assert.equal(e.executionLane,'RECOVERY_FAST');
  assert.equal(e.protectedSlots,1);
  assert.equal(e.adoptionProof,'SAME_CHANGED_REGRESSION_TEST_BASE_FAIL_CANDIDATE_PASS');
  assert.equal(e.candidateSecurityScanRequired,true);
  assert.equal(e.centralAuthorityProjectionMustRemainIdentical,true);
  assert.equal(e.runtimeSafetyProjectionMustRemainIdentical,true);
  assert.equal(e.automaticAdoptionViaPrAllowedAfterAllEvolutionGatesPass,true);
  assert.equal(e.directMainWriteForbidden,true);
});


test('planning department is the canonical combined planning growth monetization and marketing function with joint Primary-AI and Vibe decisions',()=>{
  const p=roadmap.planningGrowthMarketingDepartment;
  assert.equal(p.canonicalRoleKey,'planning');
  assert.equal(p.mergeMode,'EXTEND_EXISTING_PLANNING_DEPARTMENT_NO_PARALLEL_DUPLICATE_DEPARTMENT');
  assert.equal(p.authority.vibeDecidesAcceptPartialDeferReject,true);
  assert.equal(p.authority.autonomousFinancialTransactionAuthority,false);
  assert.equal(p.authority.autonomousAdSpendAuthority,false);
  assert.ok(p.researchDomains.monetizationAndRevenue.includes('PAID_ITEMS_AND_COSMETICS'));
  assert.ok(p.researchDomains.monetizationAndRevenue.includes('IN_GAME_AD_REVENUE_WHEN_PLATFORM_SUPPORTED'));
  assert.ok(p.researchDomains.marketingAndGrowth.includes('PAID_USER_ACQUISITION_RESEARCH'));
  assert.ok(p.researchDomains.marketingAndGrowth.includes('PLATFORM_ADVERTISING_OPTIONS'));
  assert.ok(p.researchDomains.marketingAndGrowth.includes('LAUNCH_TIMING_AND_UPDATE_TIMING'));
  assert.deepEqual(p.applicationDecisionContract.allowedDecisions,['ACCEPT','PARTIAL_ACCEPT','DEFER','REJECT']);
  assert.equal(p.applicationDecisionContract.decisionAuthority,'PRIMARY_AI_AND_VIBE_JOINT');
  assert.equal(p.applicationDecisionContract.automaticAcceptanceForbidden,false);
  assert.equal(p.applicationDecisionContract.jointDecisionRequired,true);
  assert.equal(p.timingPolicy.majorGameChangeUsesPostReleaseMajorPreparationLane,true);
  assert.equal(p.timingPolicy.revenueBlockingBugUsesHotfixLane,true);
  assert.equal(p.safeguards.paidCampaignSpendCannotBeTriggeredWithoutOwnerAuthorizedFinancialAction,false);
  assert.equal(p.safeguards.paidCampaignExecutionUnavailableWithoutExplicitFinancialExecutionTool,true);
  assert.equal(p.learningLoop.verifiedOutcomeReturnsToExistingVibeLearning,true);
  const commercial=p.postReleaseCommercializationEngine;
  assert.deepEqual(commercial.executionOrder.slice(0,4),[
    'DISCOVERY_AND_POSITIONING',
    'FIRST_SESSION_ACTIVATION',
    'RETENTION_AND_RETURN',
    'SOCIAL_AND_COMMUNITY_COMPOUNDING'
  ]);
  assert.equal(commercial.phases.ZERO_TO_FIRST_COHORT.monetizationPriority,'LOW_PREPARE_ONLY');
  assert.equal(commercial.phases.SCALE_AND_REINVEST.paidAcquisitionScalingRequiresRetentionProof,true);
  assert.equal(commercial.creativeLab.winnerSelectionAuthority,'VIBE');
  assert.equal(commercial.firstFiveMinuteLab.required,true);
  assert.equal(commercial.channelCohortAnalysis.cheapTrafficWithPoorRetentionNotGrowth,true);
  assert.equal(commercial.commercialExperimentRules.scaleOnlyAfterMeasuredDownstreamValue,true);
  assert.equal(commercial.commercialExperimentRules.vibeCanStopOrReverseAnyExperiment,true);
  assert.equal(commercial.trendRadar.directTrendCopyForbidden,true);
  assert.equal(p.departmentToVibeDecisionBoundary.departmentAuthority,'RESEARCH_ADVISORY_EVIDENCE_ONLY');
  assert.equal(p.departmentToVibeDecisionBoundary.departmentRecommendationNeverEqualsExecutionOrder,true);
  assert.equal(p.departmentToVibeDecisionBoundary.vibeDecisionUsesEvidenceNotDepartmentAuthority,true);
  assert.equal(p.departmentToVibeDecisionBoundary.weakEvidenceDefault,'REQUEST_MORE_RESEARCH_OR_DEFER');
  assert.ok(p.departmentToVibeDecisionBoundary.departmentMay.includes('ANALYZE_USER_ACQUISITION_RETENTION_MONETIZATION_AND_TRENDS'));
  assert.ok(p.departmentToVibeDecisionBoundary.departmentMayNot.includes('FORCE_IMPLEMENTATION'));
  assert.ok(p.departmentToVibeDecisionBoundary.vibeAuthority.includes('RUN_LIMITED_EXPERIMENT'));
  assert.ok(p.departmentToVibeDecisionBoundary.primaryAiAuthority.includes('RUN_LIMITED_EXPERIMENT'));
  assert.equal(p.departmentToVibeDecisionBoundary.jointApplicationDecision,'PRIMARY_AI_AND_VIBE');
  assert.equal(p.dataResearchDiscipline.factsInferenceHypothesisMustBeSeparated,true);
  assert.equal(p.dataResearchDiscipline.noUsersMeansNoPlayerBehaviorClaim,true);
  assert.equal(p.dataResearchDiscipline.noPurchasesMeansNoConversionOrRevenueOptimizationClaim,true);
  assert.equal(p.dataResearchDiscipline.contradictoryEvidenceMustBeShownToVibe,true);
  assert.equal(p.userBaseBeforeMonetizationPolicy.noMeaningfulUserBaseDefault,'DEFER_NONESSENTIAL_MONETIZATION');
  assert.equal(p.userBaseBeforeMonetizationPolicy.monetizationActivationRequiresEvidence,true);
  assert.equal(p.userBaseBeforeMonetizationPolicy.vanityInstallCountAloneInsufficient,true);
  assert.equal(p.trendResearch.required,true);
  assert.ok(p.trendResearch.researchTopics.includes('RISING_AND_DECLINING_GENRES'));
  assert.equal(p.trendResearch.sourcePolicy.staleTrendMayNotBePresentedAsCurrent,true);
  assert.ok(p.playerAcquisitionResearch.channelPortfolio.includes('SHORT_FORM_VIDEO'));
  assert.ok(p.playerAcquisitionResearch.channelPortfolio.includes('CREATOR_OR_INFLUENCER_OUTREACH'));
  assert.equal(p.playerAcquisitionResearch.paidAcquisitionGate.brokenOnboardingOrRetentionBlocksScalingSpend,true);
  assert.equal(p.monetizationReadinessDecision.defaultWhenEvidenceMissing,'DEFER');
  assert.equal(p.monetizationReadinessDecision.decisionAuthority,'PRIMARY_AI_AND_VIBE_JOINT');
  assert.deepEqual(p.strategyPriority.slice(0,4),[
    '1_MARKET_AND_TREND_RESEARCH',
    '2_PLAYER_ACQUISITION',
    '3_ONBOARDING_AND_ACTIVATION',
    '4_RETENTION_AND_RETURN_BEHAVIOR'
  ]);
  assert.equal(roadmap.longHorizonVision.economicSustainability.revenueResearchOwnedBy,'planning');
  assert.equal(roadmap.longHorizonVision.economicSustainability.marketingResearchOwnedBy,'planning');
});

test('architecture reuses planning instead of creating a duplicate marketing department',()=>{
  const p=architecture.departmentTopology.planning;
  assert.equal(p.canonicalRoleKey,'planning');
  assert.equal(p.duplicateMarketingDepartmentForbidden,true);
  assert.equal(p.vibeDecisionAuthority,true);
  assert.equal(p.autonomousPaidSpendAuthority,false);
  assert.ok(p.mergedResponsibilities.includes('MONETIZATION_AND_REVENUE_RESEARCH'));
  assert.ok(p.mergedResponsibilities.includes('AD_REVENUE_AND_PAID_ACQUISITION_RESEARCH'));
  assert.ok(architecture.executionTopology.planningGrowthMarketing.includes('APPLICATION_SCOPE_AND_TIMING_REVIEW'));
  assert.equal(architecture.workerRoles.PLANNING_GROWTH_MARKETING,'EXISTING_PLANNING_ROLE_PRODUCT_STRATEGY_MONETIZATION_REVENUE_MARKETING_RESEARCH_AND_APPLICATION_TIMING');
});


test('company records use one canonical format, path, retention and runtime-media provenance contract',()=>{
  const r=roadmap.recordsGovernance;
  assert.equal(r.status,'CANONICAL_MACHINE_RECORDS_GOVERNANCE');
  assert.equal(r.machineContract,'company-records/record-contract.json');
  assert.equal(r.validator,'tools/company-records-governance.mjs');
  assert.equal(r.canonicalRoot,'company-records');
  assert.equal(r.principles.singleFormatFamily,true);
  assert.equal(r.principles.migrateLegacyOnTouch,true);
  assert.equal(r.principles.noMassRenameOfLegacyFiles,true);
  assert.equal(r.principles.duplicateShadowRecordSystemsForbidden,true);
  assert.equal(r.directoryModel.record,'company-records/<domain>/<yyyy>/<yyyy-mm-dd>/<scope-id>/<record-type>--<record-id>.json');
  assert.equal(r.directoryModel.runtimeMedia,'assets/runtime-evidence/<platform>/<game-id>/<yyyy-mm-dd>/<artifact-id>/<capture-id>.<ext>');
  assert.ok(r.requiredRecordShape.includes('provenance'));
  assert.ok(r.requiredRecordShape.includes('retentionClass'));
  assert.equal(r.metadataRules.sha256RequiredForBinaryMediaInManifest,true);
  assert.ok(r.cadence.onWrite.includes('VALIDATE_MEDIA_HASH_WHEN_PRESENT'));
  assert.ok(r.cadence.daily.includes('ORPHAN_RUNTIME_MEDIA_SCAN'));
  assert.ok(r.cadence.weekly.includes('FORMAT_DRIFT_REPORT'));
  assert.equal(r.migration.legacyRecordsGrandfathered,true);
  assert.equal(r.migration.noSilentDelete,true);
  assert.equal(r.runtimeMedia.actualRuntimeOnly,true);
  assert.equal(r.runtimeMedia.homepageRepresentativeRequiresVerifiedManifest,true);
  assert.equal(r.runtimeMedia.robloxUnattendedStudioCaptureForbidden,true);
  assert.equal(r.runtimeMedia.mediaWithoutRuntimeBindingMayRemainArtworkButNotGameplayEvidence,true);
  assert.equal(r.departmentUse.vibe,'CONSUMES_EVIDENCE_AND_DECIDES_APPLICATION_SCOPE_TIMING_PRIORITY');
  assert.equal(architecture.recordsGovernance.machineContract,'company-records/record-contract.json');
  assert.equal(architecture.recordsGovernance.legacyMigration,'MIGRATE_ON_TOUCH');
  assert.ok(architecture.executionTopology.recordsGovernance.includes('SCHEDULED_HYGIENE_SCAN'));
});
