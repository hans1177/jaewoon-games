// 파일명: qa/company-central-policy-contract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readText=relative=>fs.readFileSync(path.join(repoRoot,relative),'utf8');
const readJson=relative=>JSON.parse(readText(relative));
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
  assert.equal(Object.hasOwn(roadmap,'legacyPolicyMirror'),false);
  assert.equal(Object.hasOwn(roadmap,'legacyPolicyCleanup'),false);
  assert.equal(roadmap.centralDocumentation.canonicalSet.policy,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.centralDocumentation.humanReadableArtifactPolicy.humanReadablePolicyMirrorRequired,false);
  assert.equal(roadmap.centralDocumentation.rules.legacyHumanPolicyMirrorForbidden,true);
  assert.equal(roadmap.centralDocumentation.rules.completedOneShotMigrationArtifactsMustBeRemoved,true);
  assert.equal(fs.existsSync(obsoleteAgentsPath),false);
  for(const removed of [
    'COMPANY_FLOW.md',
    'company-learning/DIRECT_NATIVE_DUAL_PLATFORM.md',
    'company-learning/PLATFORM_RELEASE_ROADMAP.md',
    'company-learning/PRIMARY_THREE_FAST_MVP.md',
    'company-learning/UNITY_WEB_FIRST_STAGE.md',
    'company-learning/VIBE3_ENGINE.md',
    '.github/workflows/temp-cloud-designer-cutover-v2.yml',
    '.github/workflows/temp-design-v2-wireup.yml',
    '.github/workflows/one-shot-common-development-policy.yml',
    'tools/temp-migrate-stage-gate-v2.mjs',
    'tools/apply-common-development-quality-policy.mjs'
  ]) assert.equal(fs.existsSync(path.join(repoRoot,removed)),false,removed);
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
  assert.equal(development.executionMode,'UNITY_WEB_FLOOR_THEN_DIRECT_NATIVE_DUAL_PLATFORM');
  assert.equal(development.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(development.strictDesignScoreRequiredForAdmission,false);
  assert.equal(development.strictDesignReviewRunsInParallel,true);
  assert.deepEqual(development.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(development.onePlatformFailureDoesNotCancelOther,true);
  assert.equal(development.targetPlatformMayRunImmediately,false);
  assert.equal(development.unityWebDevelopmentMayRunImmediately,true);
  assert.equal(development.upperPlatformAdmissionAuthority,'UPPER_PLATFORM_DEVELOPMENT_READY');
  for(const token of ['LOAD_MINIMUM_SHARED_DESIGN','UNITY_WEB_CODE_AND_GRAPHICS_DEVELOPMENT','UNITY_WEBGL_BUILD','UNITY_WEB_ACTUAL_BROWSER_PLAY','UNITY_WEB_INDEPENDENT_QA','UNITY_WEB_REGRESSION','UPPER_PLATFORM_DEVELOPMENT_READINESS_EVALUATION','ROBLOX_UNITY_NATIVE_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION','INTERNAL_PLATFORM_RELEASE','INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG','TARGETED_REPAIR_AND_REVALIDATION','PUBLIC_RELEASE_READY'])assert.ok(development.requiredFlow.includes(token),token);
  assert.equal(development.presentationSupport.graphicsRoot,'GRAPHICS_PRODUCTION');
  assert.equal(development.presentationSupport.audioAuthoringOwner,'audio');
  assert.equal(development.presentationSupport.artbookRunsInParallel,true);
  assert.equal(directive.ai.vibe2.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(directive.ai.vibe2.designOnlyActive,false);
  assert.equal(directive.ai.vibe2.ownsWebFirstImplementation,false);
  assert.equal(directive.ai.vibe2.ownsSelectedPlatformImplementation,true);
  assert.equal(Object.hasOwn(directive.ai.vibe2.roleByClass,'DESIGN_ONLY'),false);
});

test('Unity Web gates upper-platform development without deployment or release',()=>{
  const lane=roadmap.directNativeDualPlatformDevelopment?.unityWebDevelopmentLane;
  const gate=roadmap.directNativeDualPlatformDevelopment?.upperPlatformDevelopmentReadinessGate;
  const expectedFlow=[
    'CODE_DEVELOPMENT',
    'GRAPHICS_MOTION_AUDIO_PRESENTATION_DEVELOPMENT',
    'UNITY_WEBGL_BUILD',
    'ACTUAL_BROWSER_PLAY',
    'INDEPENDENT_QA',
    'REGRESSION',
    'UPPER_PLATFORM_DEVELOPMENT_READINESS_EVALUATION',
    'CAUSAL_REPAIR_AND_REBUILD_WHEN_NOT_READY',
    'HANDOFF_TO_ROBLOX_AND_UNITY_WHEN_READY',
  ];
  assert.equal(lane?.enabled,true);
  assert.equal(lane?.role,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(lane?.canonicalSourceRoot,'unity-games/<gameId>/');
  assert.equal(lane?.outputRoot,'web-games/<gameId>/');
  assert.equal(lane?.sameCanonicalUnityProjectRequired,true);
  assert.equal(lane?.separateWebGameplayCodebaseForbidden,true);
  assert.deepEqual(lane?.developmentFlow,expectedFlow);
  assert.equal(lane?.actualBrowserPlayRequired,true);
  assert.equal(lane?.independentQaRequired,true);
  assert.equal(lane?.regressionRequired,true);
  assert.equal(lane?.regressionPassNextAction,'UPPER_PLATFORM_DEVELOPMENT_READINESS_EVALUATION');
  assert.equal(lane?.readinessFailNextAction,'NEXT_UNITY_WEB_DEVELOPMENT_FLOOR');
  assert.equal(lane?.readinessPassNextAction,'START_CONCURRENT_ROBLOX_AND_UNITY_UPPER_PLATFORM_DEVELOPMENT');
  assert.equal(lane?.deploymentStage,false);
  assert.equal(lane?.internalReleaseStage,false);
  assert.equal(lane?.publicReleaseStage,false);
  assert.equal(gate?.gateId,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.deepEqual(gate?.targets,['ROBLOX','UNITY']);
  assert.equal(gate?.allCriteriaRequired,true);
  assert.deepEqual(Object.keys(gate?.criteria||{}),['design','code','graphics','webglBuild','actualPlay','qa','portability']);
  assert.equal(gate?.criteria?.design?.required?.includes('ROBLOX_PLATFORM_PROFILE_READY'),true);
  assert.equal(gate?.criteria?.code?.required?.includes('CORE_LOOP_IMPLEMENTED'),true);
  assert.equal(gate?.criteria?.graphics?.required?.includes('BASE_MOTION_ANIMATION_AND_VFX_PRESENT'),true);
  assert.equal(gate?.criteria?.webglBuild?.required?.includes('EXACT_CURRENT_UNITY_SOURCE_REVISION_BOUND'),true);
  assert.equal(gate?.criteria?.actualPlay?.required?.includes('REAL_CORE_FUN_LOOP_PROGRESS_PASS'),true);
  assert.equal(gate?.criteria?.qa?.required?.includes('REGRESSION_PASS'),true);
  assert.equal(gate?.criteria?.portability?.required?.includes('PLATFORM_DIFFERENCES_ISOLATED_IN_PLATFORM_PROFILES'),true);
  assert.equal(gate?.failureState,'REPAIR_REQUIRED');
  assert.equal(gate?.passState,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(gate?.passAction,'START_CONCURRENT_ROBLOX_AND_UNITY_UPPER_PLATFORM_DEVELOPMENT');
  assert.equal(gate?.releaseOrDeploymentAuthority,false);
  assert.equal(roadmap.developmentLifecycleMachine?.targetPlatformDevelopment?.admissionGate,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(roadmap.unityWebFirstStage?.scope,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(roadmap.unityWebFirstStage?.developmentAdmissionAuthority,true);
  assert.equal(roadmap.unityWebFirstStage?.validationSurfaceOnly,false);
  assert.equal(roadmap.unityWebFirstStage?.nativeDevelopmentMayRunWithoutWebBuild,false);
  assert.equal(roadmap.webCompanion?.developmentAdmissionGate,true);
  assert.equal(roadmap.webCompanion?.releaseGate,false);
  assert.equal(architecture.concurrentPlatformDevelopment?.admissionAuthority,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWeb,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.deepEqual(architecture.concurrentPlatformDevelopment?.unityWebDevelopmentLane?.developmentFlow,expectedFlow);
  assert.equal(architecture.concurrentPlatformDevelopment?.upperPlatformDevelopmentReadinessGate?.gateId,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(architecture.departmentTopology?.unityWebRole,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(architecture.departmentRuntimeTopology?.developmentConfirmed?.unityWebReadinessPassDispatch,'ROBLOX_AND_UNITY_CONCURRENT_DEVELOPMENT');
  assert.equal(architecture.developmentPipeline?.unityWebDevelopmentLane?.readinessGate,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(lane?.bootstrapOwner,'.github/workflows/unity-web-floor-source-bootstrap.yml');
  assert.equal(lane?.bootstrapRole,'CANONICAL_UNITY_SOURCE_SKELETON_ONLY_NOT_GAME_COMPLETION');
  assert.equal(lane?.repairExecutionOwner,'tools/vibe2-auto-planner.mjs');
  assert.equal(lane?.repairExecutionEngine,'EXISTING_VIBE2_VIBE3_DEVELOPMENT_ENGINE');
  assert.equal(lane?.repairTaskSourceRoot,'unity-games/<gameId>/');
  assert.equal(lane?.repairReadsReadinessEvidence,'web-games/<gameId>/upper-platform-development-readiness.json');
  assert.equal(lane?.repairMayModifyPolicyOrHomepage,false);
  assert.equal(lane?.repairMayWeakenQaOrReadinessGate,false);
  assert.deepEqual(lane?.causalRepairLoop,[
    'READ_REPAIR_REQUIRED_AND_FAILED_READINESS_DOMAINS',
    'VIBE_CODE_AND_GRAPHICS_CAUSAL_REPAIR_IN_CANONICAL_UNITY_SOURCE',
    'MERGE_VERIFIED_SOURCE_DELTA',
    'UNITY_WEBGL_REBUILD',
    'ACTUAL_BROWSER_REPLAY',
    'INDEPENDENT_QA',
    'REGRESSION',
    'UPPER_PLATFORM_DEVELOPMENT_READINESS_REEVALUATION',
  ]);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebDevelopmentLane?.causalRepairOwner,'tools/vibe2-auto-planner.mjs');
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebDevelopmentLane?.repairWriteBoundary,'unity-games/<gameId>/');
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebDevelopmentLane?.repairPolicyWriteAllowed,false);
  assert.equal(architecture.developmentPipeline?.unityWebDevelopmentLane?.repairLoopUsesExistingDevelopmentEngine,true);
  assert.equal(architecture.developmentPipeline?.unityWebDevelopmentLane?.shadowRepairPipeline,false);
  assert.equal(architecture.departmentRuntimeTopology?.developmentConfirmed?.unityWebRepairOwner,'tools/vibe2-auto-planner.mjs');
  assert.equal(lane?.preReadinessFailurePersistence,'company-runtime:development-queue.json#unityWebDevelopmentFloorEvidence');
  assert.equal(lane?.repairableFailureWake,'.github/workflows/vibe2-24h-runner.yml');
  assert.equal(lane?.infrastructureFailureState,'INFRASTRUCTURE_PENDING');
  assert.equal(lane?.infrastructureFailureDoesNotAuthorizeSourceRepair,true);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebDevelopmentLane?.preReadinessFailureWriter,'tools/company-unity-web-floor-runtime-persist.mjs');
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebDevelopmentLane?.preReadinessFailureStore,'company-runtime:development-queue.json');
  assert.equal(architecture.departmentRuntimeTopology?.developmentConfirmed?.unityWebFailureWriter,'tools/company-unity-web-floor-runtime-persist.mjs');
  assert.equal(roadmap.changeRecord?.unityWebVibeRepairLoop20260926?.implementationState,'ACTIVE_VIBE_REPAIR_LOOP_BOUND');
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.nativeGateAuthority,true);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.developmentAdmissionAuthority,true);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.nativeFanOutTrigger,'UPPER_PLATFORM_DEVELOPMENT_READY_ON_MAIN');
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.nativeFanOutDoesNotCreateAdmissionAuthority,false);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.newUpperPlatformEntryBlocking,true);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.existingNativeDevelopmentGrandfathered,true);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebDevelopmentLane?.implementationState,'ACTIVE_EXECUTOR_BOUND');
  assert.equal(roadmap.changeRecord?.unityWebUpperPlatformDevelopmentGate20260925?.implementationState,'CENTRAL_POLICY_ARCHITECTURE_AND_EXECUTOR_BOUND');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityWebValidationSurface?.sameCanonicalUnityProjectRequired,true);
  assert.equal(directive.production.webCompanion?.legacyDirectWebAuthoring,false);
  assert.match(nativeDevelopmentWorkflow,/gh workflow run unity-web-first-stage-build\.yml/);
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
  assert.match(pipeline,/DEVELOPMENT_EXECUTION_MODE=UNITY_WEB_FLOOR_THEN_DIRECT_NATIVE_DUAL_PLATFORM/);
  assert.match(pipeline,/DEVELOPMENT_RUNTIME_OWNER=\.github\/workflows\/company-development-confirmed-runtime\.yml/);
  assert.match(pipeline,/UNITY_WEB_UPPER_PLATFORM_FLOOR=REQUIRED_FOR_NEW_NATIVE_START/);
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

test('Unity Web is required for new upper-platform entry while native evidence remains separate',()=>{
  const development=directive.classes.DEVELOPMENT_CONFIRMED;
  const release=directive.classes.RELEASE_CONFIRMED;
  const web=development.unityWebValidationSurface;
  assert.equal(development.executionMode,'UNITY_WEB_FLOOR_THEN_DIRECT_NATIVE_DUAL_PLATFORM');
  assert.equal(development.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(development.upperPlatformAdmissionAuthority,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(development.targetPlatformPurpose,'UNITY_WEB_PREDEVELOPMENT_THEN_PRIMARY_NATIVE_IMPLEMENTATION_AND_VALIDATION');
  assert.equal(development.targetPlatformMayRunImmediately,false);
  assert.equal(development.unityWebDevelopmentMayRunImmediately,true);
  assert.equal(development.approvedScopeCompletionRequired,true);
  assert.equal(web.enabled,true);
  assert.equal(web.optional,false);
  assert.equal(web.sameCanonicalUnityProjectRequired,true);
  assert.equal(web.nativeGateAuthority,true);
  assert.equal(web.upperPlatformReadinessGate,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(web.missingOrFailedBuildDoesNotBlockNative,false);
  assert.equal(web.releaseAuthority,false);
  for(const token of ['UNITY_WEB_CODE_AND_GRAPHICS_DEVELOPMENT','UNITY_WEBGL_BUILD','UNITY_WEB_ACTUAL_BROWSER_PLAY','UNITY_WEB_INDEPENDENT_QA','UNITY_WEB_REGRESSION','UPPER_PLATFORM_DEVELOPMENT_READINESS_EVALUATION','ROBLOX_UNITY_NATIVE_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION'])assert.ok(development.requiredFlow.includes(token),token);
  for(const token of ['UPPER_PLATFORM_DEVELOPMENT_READY','PLATFORM_SPECIFIC_SOURCE_EXISTS','PLATFORM_SPECIFIC_RUNTIME_PASS','PLATFORM_SPECIFIC_INDEPENDENT_QA_PASS','PLATFORM_SPECIFIC_REGRESSION_PASS'])assert.ok(development.baselineReadyRequires.includes(token),token);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.existingNativeDevelopmentGrandfathered,true);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.newNativeDevelopmentStartRequiresUnityWebReadiness,true);
  assert.equal(release.executionMode,'GATED_DIRECT_RELEASE_PRODUCTION');
  assert.equal(release.target,'PROJECT_SELECTED_PLATFORM');
  assert.equal(release.targetPlatformProjectRequired,true);
  assert.equal(release.webCompanionRequired,false);
  assert.ok(!release.requiredFlow.includes('BIND_CURRENT_WEB_COMPANION_SOURCE_TREE'));
});

test('Web learning evidence is auxiliary and cannot replace native platform evidence',()=>{
  assert.equal(directive.learning.webGameEvidence.role,'AUXILIARY_PORTABLE_LEARNING_EVIDENCE');
  assert.equal(directive.learning.webGameEvidence.cannotClaimNativePlatformSuccess,true);
  assert.equal(directive.learning.webGameEvidence.cannotSatisfyNativePlatformRuntimeGate,true);
  assert.equal(directive.learning.webGameEvidence.cannotEnterRobloxUnityUefnVerifiedLaneWithoutMatchingNativeEvidence,true);
  assert.equal(directive.learning.webGameEvidence.useExistingCanonicalDistillationOnly,true);
  assert.equal(directive.learning.webGameEvidence.newTrainerOrCronForbidden,true);
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
  assert.equal(Object.hasOwn(roadmap,'legacyPolicyMirror'),false);
  assert.equal(roadmap.centralDocumentation.legacyPolicyCleanup.status,'REMOVED_FROM_ACTIVE_REPOSITORY');
});

test('Unity and Roblox share the active first development tier while Fortnite UEFN remains owner-held',()=>{
  const strategy=directive.platformStrategy;
  assert.deepEqual(strategy.primaryPlatforms,['UNITY','ROBLOX']);
  assert.equal(strategy.primaryPlatformLegacyCompatibilityOnly,true);
  assert.deepEqual(strategy.priority,['ROBLOX','UNITY']);
  assert.deepEqual(strategy.priorityTiers,[['UNITY','ROBLOX']]);
  assert.equal(strategy.priorityMeaning,'UNITY_WEB_FLOOR_THEN_ROBLOX_UNITY_ACTIVE_EQUAL_UPPER_TIER');
  assert.equal(strategy.designStabilizationScheduling.unityRobloxEqualPriority,true);
  assert.equal(strategy.designStabilizationScheduling.mode,'UNITY_ROBLOX_EQUAL_FIRST_TIER');
  assert.equal(strategy.allThreePlatformsMayBeDevelopedConcurrently,false);
  assert.equal(strategy.priorityDoesNotCreatePlatformLock,true);
  assert.equal(strategy.roadmapPhaseEntryGatesForbidden,false);
  assert.equal(strategy.platformDevelopmentMayStartWithoutPriorPlatformCompletion,false);
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

test('Director supervisor consumes canonical machine policy without a human policy mirror',()=>{
  assert.match(directorSupervisor,/company-learning\/platform-release-roadmap\.json/);
  assert.match(directorSupervisor,/directive\.machineSourceOfTruth!==machineSource/);
  assert.match(directorSupervisor,/policy\.machineSourceOfTruth!==machineSource/);
  assert.match(directorSupervisor,/MACHINE_EXECUTION_CONTRACT/);
  assert.match(directorSupervisor,/human policy mirror must remain disabled/);
  assert.match(directorSupervisor,/legacy policy mirror field must be removed/);
  assert.doesNotMatch(directorSupervisor,/directive\.policyDocument!=='COMPANY_FLOW\.md'/);
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


test('central policy authorizes only gated atomic neural execution and keeps UEFN hold unchanged',()=>{
  const gated=roadmap.neuralGatedExecution;
  assert.equal(gated.state,'GATED_EXECUTION_ENABLED');
  assert.equal(gated.existingSchedulerOnly,true);
  assert.equal(gated.universalAtomicNeuronExecution,true);
  assert.ok(gated.gatedAuthorities.includes('REQUEUE_EXISTING_TASK'));
  assert.ok(gated.gatedAuthorities.includes('TUNE_GAME_PRIMARY_CONCURRENCY_FROM_VERIFIED_THROUGHPUT'));
  assert.equal(gated.sourceCandidateGeneration.strategyMutationRequiresVerifiedRootCause,true);
  assert.equal(gated.sourceCandidateGeneration.successfulResultMutationForbidden,true);
  assert.equal(gated.sourceCandidateGeneration.verifiedSupervisorReviseRequeuesExistingTask,true);
  assert.equal(gated.sourceCandidateGeneration.omittedEditPathExactResponsibleFileRecovery,true);
  assert.equal(gated.sourceCandidateGeneration.omittedEditPathRecoveryMode,'UNIQUE_FIND_MATCH_WITHIN_RESPONSIBLE_FILES');
  assert.equal(gated.sourceCandidateGeneration.ambiguousMissingPathMustFailClosed,true);
  assert.equal(gated.sourceCandidateGeneration.invalidRelativePathFailureClass,'INVALID_PATH');
  assert.equal(gated.sourceCandidateGeneration.invalidPathBoundedRetry,true);
  assert.equal(gated.sourceCandidateGeneration.deterministicRecoveryBeforeAdditionalModelInvocation,true);
  assert.equal(gated.sourceCandidateGeneration.missingPathRecoveryTelemetry,'codingMethod.missingPathRecoveries');
  assert.equal(gated.sourceCandidateGeneration.latestObservedMissingPathIncident.runId,36057026213);
  assert.equal(gated.sourceCandidateGeneration.latestObservedMissingPathIncident.affectedRobloxTasks,13);
  assert.equal(gated.runtimeSynchronization.syncBeforeEveryNonNeuronReserveIngress,true);
  assert.equal(gated.runtimeSynchronization.staleVibeControlStateMayNotOverrideNewerCompanyRuntime,true);
  assert.equal(gated.runtimeSynchronization.lifecycleProjectionMustBeMonotonic,true);
  assert.equal(gated.runtimeResultIngress.enabled,true);
  assert.equal(gated.runtimeResultIngress.eventType,'RUNTIME_RESULT');
  assert.equal(gated.runtimeResultIngress.passOutcomeObserveOnly,true);
  assert.equal(gated.runtimeResultIngress.failureMutationRequiresVerifiedRootCause,true);
  assert.equal(gated.runtimeResultIngress.rawRuntimeFailureMayNotInventRootCause,true);
  assert.equal(gated.runtimeSynchronization.missingGenreMayNotRegressStartedNativeWork,true);
  assert.equal(gated.runtimeSynchronization.canonicalNativeExecutionEvidenceField,'executionEvidence');
  assert.equal(gated.runtimeSynchronization.plannerMustPreserveNestedFailureStageSignatureAndSourceRevision,true);
  assert.ok(gated.forbiddenAuthorities.includes('CENTRAL_POLICY_MUTATION'));
  assert.ok(gated.forbiddenAuthorities.includes('QA_OR_RUNTIME_GATE_BYPASS'));
  assert.ok(gated.forbiddenAuthorities.includes('RELEASE_PASS_OR_PROMOTION_SELF_APPROVAL'));
  assert.equal(gated.fortniteUefnChange,false);
  assert.equal(roadmap.developmentAccess.FORTNITE_UEFN,'OWNER_HOLD');
  assert.equal(roadmap.neuralDevelopmentBrain.currentExecutionMode,'ATOMIC_NEURON_DAG_WITH_GATED_NEURAL_CONTROL_AND_SHADOW_FALLBACK');
  assert.equal(roadmap.neuralDevelopmentBrain.phase2.mode,'GATED_EVENT_ROUTER_WITH_SHADOW_FALLBACK');
  assert.equal(roadmap.neuralDevelopmentBrain.phase2.shadowAuthorityScope,'OBSERVE_COMPARE_AUDIT_ONLY');
  assert.equal(roadmap.neuralDevelopmentBrain.phase2.currentGatedAuthority.mode,'GATED_EXISTING_SCHEDULER_ONLY');
  assert.equal(roadmap.neuralDevelopmentBrain.phase2.currentGatedAuthority.fireAllowedForVerifiedGatedActions,true);
  assert.equal(roadmap.neuralDevelopmentBrain.phase2.currentGatedAuthority.policyMutationAllowed,false);
  assert.equal(roadmap.neuralDevelopmentBrain.phase2.eventBindings.runtimeResult.eventType,'RUNTIME_RESULT');
  assert.equal(roadmap.neuralDevelopmentBrain.activation.mode,'MERGED_MAIN_GATED_EXECUTION_WITH_SHADOW_FALLBACK');
  assert.equal(roadmap.neuralDevelopmentBrain.activation.neuralExecutionAuthority,true);
  assert.equal(roadmap.neuralDevelopmentBrain.activation.neuralQueueMutationAuthority,'REQUEUE_REPRIORITIZE_REFILL_ONLY');
  assert.equal(roadmap.neuralDevelopmentBrain.currentWaveExecution.phase2NeuralExecutionAuthority,true);
  assert.equal(roadmap.neuralDevelopmentBrain.currentWaveExecution.neuralAuthorityScope,'GATED_EXISTING_SCHEDULER_ONLY');
  assert.equal(roadmap.neuralDevelopmentBrain.currentWaveExecution.runtimeResultIngress,true);

  const workGraph=roadmap.neuralDevelopmentBrain.phase2WorkGraphImplementation;
  assert.equal(workGraph.state,'GATED_EXISTING_SCHEDULER_ACTIVE_WITH_SHADOW_FALLBACK');
  assert.equal(workGraph.workGraphMayFireAction,true);
  assert.equal(workGraph.workerCreationAuthority,'GATED_EXISTING_QUEUED_TASK_DISPATCH_ONLY');
  assert.equal(workGraph.queueMutationAuthority,'GATED_REQUEUE_REPRIORITIZE_REFILL_ONLY');
  assert.equal(workGraph.waveReorderAuthority,'GATED_CONFLICT_FREE_EXISTING_TASKS_ONLY');
  assert.equal(workGraph.lockAuthority,'NONE');
  assert.equal(workGraph.policyMutationAuthority,'NONE');
  assert.equal(workGraph.shadowFallbackPreserved,true);
  assert.ok(workGraph.evidencePrefixes.includes('neural-work-graph-gated:'));

  const shadow=architecture.neuralWorkGraphTopology.phase2Shadow;
  assert.equal(shadow.modeScope,'SHADOW_FALLBACK_AND_AUDIT_ONLY');
  assert.equal(shadow.currentExecutionAuthoritySource,'phase2GatedExecution');
  assert.equal(shadow.eventBindings.runtimeResult,'RUNTIME_RESULT');
  assert.equal(shadow.eventBindings.supervisorResult,'SUPERVISOR_RESULT');

  const arch=architecture.neuralWorkGraphTopology.phase2GatedExecution;
  assert.equal(arch.state,'ENABLED');
  assert.equal(arch.version,2);
  assert.equal(arch.shadowFallbackPreserved,true);
  assert.equal(arch.minimumProcedurePolicyRespected,true);
  assert.equal(arch.runtimeResultIngress.liveCodeMerged,true);
  assert.equal(arch.sourceCandidateRecovery.missingEditPath,'UNIQUE_FIND_MATCH_WITHIN_RESPONSIBLE_FILES');
  assert.equal(arch.sourceCandidateRecovery.deterministicBeforeModelRetry,true);
  assert.equal(arch.sourceCandidateRecovery.ambiguousOrUnmatchedPath,'INVALID_PATH_BOUNDED_RETRY');
  assert.equal(arch.sourceCandidateRecovery.writableScopeExpansionAllowed,false);
  assert.equal(arch.sourceCandidateRecovery.telemetry,'codingMethod.missingPathRecoveries');
  assert.equal(arch.allowedWorkerAuthority,'EXISTING_QUEUED_TASK_DISPATCH_ONLY');
  assert.equal(arch.retryStrategyMutationRequiresVerifiedRootCause,true);
  assert.equal(arch.successfulResultMutationForbidden,true);
  assert.equal(arch.verifiedSupervisorReviseRequeue,true);
  assert.equal(arch.runtimeResultIngress.enabled,true);
  assert.equal(arch.runtimeResultIngress.passOutcomeObserveOnly,true);
  assert.equal(arch.runtimeResultIngress.failureMutationRequiresVerifiedRootCause,true);
  assert.equal(architecture.neuralWorkGraphTopology.liveShadowRepairLoop.neuralExecutionAuthority,'GATED_EXISTING_SCHEDULER_ONLY');
  assert.equal(architecture.neuralWorkGraphTopology.activation.eventRoutingExecutionAuthority,'GATED_EXISTING_SCHEDULER_ONLY');
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.authorityChange,'GATED_REQUEUE_REPRIORITIZE_REFILL_AND_VERIFIED_TUNING');
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.reserveIngressRuntimeSync.required,true);
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.reserveIngressRuntimeSync.appliesToEveryNonNeuronReserveIngress,true);
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.projectLifecycleMonotonicity.downstreamMachineEvidencePreventsBackwardProjection,true);
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.projectLifecycleMonotonicity.runtimeEvidenceOverridesStaleTopLevelFlags,true);
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.projectLifecycleMonotonicity.canonicalNativeExecutionEvidenceField,'executionEvidence');
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.projectLifecycleMonotonicity.plannerPreservesFailureStageSignatureAndSourceRevision,true);
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.reserveIngressRuntimeSync.blankControlQueueRecovery.enabled,true);
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.reserveIngressRuntimeSync.blankControlQueueRecovery.canonicalQueueVersion,5);
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.reserveIngressRuntimeSync.blankControlQueueRecovery.nonEmptyMalformedJsonFailClosed,true);
  assert.equal(arch.protectedAuthority.policyMutation,false);
  assert.equal(arch.protectedAuthority.qaBypass,false);
  assert.equal(arch.protectedAuthority.releaseSelfApproval,false);
});


test('minimum necessary procedure policy keeps development throughput ahead of unrelated process overhead',()=>{
  const p=roadmap.minimumNecessaryProcedurePolicy;
  assert.equal(p.status,'ACTIVE');
  assert.equal(p.priority,'DEVELOPMENT_THROUGHPUT_FIRST_WITH_MINIMUM_NECESSARY_PROCEDURE');
  assert.equal(p.defaultMode,'MINIMUM_NECESSARY_VALIDATION_AND_NONBLOCKING_AUDIT');
  assert.equal(p.principles.procedureIsMeansNotGoal,true);
  assert.equal(p.principles.unrelatedProcedureMayNotDelayDevelopment,true);
  assert.equal(p.principles.alreadyPassingEvidenceMustBeReusedWhenStillValid,true);
  assert.equal(p.principles.duplicateValidationWithoutEvidenceInvalidationForbidden,true);
  assert.equal(p.principles.duplicateReviewWithoutRelevantChangeForbidden,true);
  assert.equal(p.principles.wholeRepositoryRegressionIsNotDefault,true);
  assert.equal(p.principles.administrativeChecksMayNotConsumeGamePrimaryWorkerSlots,true);
  assert.equal(p.principles.asyncOrPosthocAuditPreferredWhenAcceptanceNeedNotBlock,true);
  assert.equal(p.security.manualOrPrimaryAiReviewOnlyForRelevantSecurityOrProtectedAuthorityDelta,true);
  assert.equal(p.security.repeatExactHeadReviewWithoutSecurityRelevantDeltaForbidden,true);
  assert.equal(p.security.unrelatedSecurityReviewMayNotHoldDevelopmentSlots,true);
  assert.equal(p.security.verifiedSecurityEvidenceReusableUntilRelevantDelta,true);
  assert.equal(p.regression.defaultScope,'CHANGED_RESPONSIBILITY_AND_TRANSITIVE_DEPENDENCIES_ONLY');
  assert.equal(p.regression.impactScopedFirst,true);
  assert.equal(p.regression.expandScopeOnlyOnEvidence,true);
  assert.equal(p.regression.unaffectedPassingEvidenceReusable,true);
  assert.equal(p.regression.rerunSuccessfulUnaffectedStagesForbidden,true);
  assert.equal(p.qaAndReview.portfolioWideBarrierForbidden,true);
  assert.equal(p.qaAndReview.reviewMayNotBecomeRoutineSerializationPoint,true);
  assert.equal(p.execution.nonblockingChecksUseSpareOrSeparateCapacity,true);
  assert.equal(p.execution.taskMicroFanInImmediateRefillPreserved,true);
  assert.equal(p.execution.cohortFanInLimitedToRelevantIntegrationRegressionAndRelease,true);
  assert.ok(p.hardGateOnlyWhen.includes('PUBLIC_RELEASE_OR_EXTERNAL_PROMOTION'));
  assert.ok(p.forbiddenInterpretations.includes('SKIP_RELEVANT_SECURITY_FINDING'));
  assert.ok(p.forbiddenInterpretations.includes('REUSE_INVALIDATED_EVIDENCE'));

  const projection=architecture.minimumNecessaryProcedurePolicyProjection;
  assert.equal(projection.defaultValidationScope,'CHANGED_RESPONSIBILITY_AND_TRANSITIVE_DEPENDENCIES_ONLY');
  assert.equal(projection.duplicateValidationForbidden,true);
  assert.equal(projection.duplicateReviewForbiddenWithoutRelevantDelta,true);
  assert.equal(projection.wholeRepositoryRegressionDefaultForbidden,true);
  assert.equal(projection.administrativeChecksConsumeGamePrimarySlots,false);
  assert.equal(projection.atomicRefillContinuesDuringUnrelatedChecks,true);
  assert.equal(projection.releaseAndConfirmedSecurityFindingsRemainFailClosed,true);
  assert.equal(projection.impactScopedWorkflowTriggersImplemented,true);
  assert.equal(projection.unrelatedWorkflowStartupForbidden,true);
  assert.equal(projection.scopeExpansionRequiresRelevantEvidence,true);

  const impact=p.implementation.impactScopedWorkflowTriggers;
  assert.equal(impact.enabled,true);
  assert.equal(impact.pullRequestAndMainPush,true);
  assert.equal(impact.unrelatedChangesDoNotStartWorkflow,true);
  assert.equal(impact.scopeMayExpandOnlyWhenRelevantEvidenceRequiresIt,true);
  assert.deepEqual(impact.workflows,projection.impactScopedWorkflowFiles);
  for(const workflowFile of impact.workflows){
    const source=readText(workflowFile);
    assert.match(source,/push:\n\s+branches: \[main\]\n\s+paths:/,workflowFile);
    assert.match(source,/pull_request:\n\s+branches: \[main\]\n\s+paths:/,workflowFile);
  }
});
