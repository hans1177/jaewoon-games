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
const security=readJson('company-learning/security-immune-system.json');
const autonomousExpansionPolicy=readJson('company-learning/vibe-autonomous-content-expansion-policy.json');
const logMap=readJson('company-learning/company-log-map.json');
const multimodelWorkflow=readText('.github/workflows/artbook-free-department-bots.yml');
const designCycle=readText('tools/company-design-cycle.mjs');
const pipeline=readText('tools/artbook-production-pipeline.mjs');
const nativeDevelopmentWorkflow=readText('.github/workflows/company-development-confirmed-runtime.yml');
const unityRuntimeWorkflow=readText('.github/workflows/company-development-unity-runtime.yml');
const unityWebWorkflow=readText('.github/workflows/unity-web-first-stage-build.yml');
const nativeDatasetGate=readText('tools/vibe2-real-platform-dataset-gate.mjs');
const directorSupervisor=readText('.github/workflows/director-supervisor.yml');
const coreQaWorkflow=readText('.github/workflows/vibe2-core-qa.yml');
const vibe24hRunner=readText('.github/workflows/vibe2-24h-runner.yml');
const vibeContinuousCore=readText('.github/workflows/vibe2-continuous-core.yml');
const vibeAutoPlanner=readText('tools/vibe2-auto-planner.mjs');
const vibeSourceWorker=readText('tools/vibe2-source-worker.mjs');
const securityWorkflow=readText('.github/workflows/company-security-immune.yml');
const recordsWorkflow=readText('.github/workflows/company-records-governance.yml');

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
test('director fallback wake only re-dispatches existing queued GAME_PRIMARY work',()=>{
  const fallback=roadmap.changeRecord?.directorGamePrimaryFallbackWake20260927||{};
  assert.equal(fallback.existingQueuedTaskDispatchOnly,true);
  assert.equal(fallback.newSchedulerCreated,false);
  assert.equal(fallback.newQueueCreated,false);
  assert.equal(fallback.newTaskCreated,false);
  assert.equal(fallback.canonicalReservePathPreserved,true);
  assert.equal(fallback.gateIndependentFromRunnerDrain,true);
  assert.equal(fallback.gateActiveCancellationForbidden,true);
  assert.equal(fallback.staleQueuedNonPushCoreMaySuppressFallback,false);
  assert.equal(fallback.superviseWaitsForRunnerDrainAndGamePrimaryGate,true);
  assert.equal(fallback.activeNonPushCoreSuppressesFallbackDispatch,true);
  assert.equal(fallback.cancelledWorkflowRunWakeSuppressed,true);
  assert.equal(fallback.qualitySecurityReleaseGatesUnchanged,true);

  const coalescing=roadmap.changeRecord?.directorPreSupervisionCoalescing20260927||{};
  assert.equal(coalescing.gamePrimaryGateCancelInProgress,false);
  assert.equal(coalescing.gamePrimaryGateActiveCompletionPreserved,true);
  assert.equal(coalescing.gamePrimaryGatePendingLatestWins,true);
  assert.equal(coalescing.runnerDrainConcurrencyGroup,'director-runner-drain-v3');
  assert.equal(coalescing.previousRunnerDrainConcurrencyGroup,'director-runner-drain-v2');
  assert.equal(coalescing.runnerDrainEpochAdvancedToBypassLegacyPendingGroup,true);

  const latestDirector=roadmap.changeRecord?.runnerBackpressureBottleneckRelief20261001?.director||{};
  assert.equal(latestDirector.vibe2CoreCompletionWakeDisabled,true);
  assert.equal(fallback.vibe2CoreCompletionWakeDisabled,true);
  assert.doesNotMatch(directorSupervisor,/\n      - Vibe2 Continuous Core\n/);
  assert.match(directorSupervisor,/game-primary-gate:[\s\S]*?group: director-game-primary-gate-v1[\s\S]*?cancel-in-progress: false/);
  assert.match(directorSupervisor,/DIRECTOR_GAME_PRIMARY_FALLBACK_WAKE=DISPATCHED/);
  assert.match(directorSupervisor,/DIRECTOR_GAME_PRIMARY_SCOPED_CORE_ACTIVE=/);
  assert.match(directorSupervisor,/DIRECTOR_GAME_PRIMARY_FALLBACK_WAKE=SKIPPED_ACTIVE_CORE/);
  assert.match(directorSupervisor,/actions\/workflows\/vibe2-continuous-core\.yml\/dispatches/);
  assert.doesNotMatch(directorSupervisor,/DIRECTOR_GAME_PRIMARY_FALLBACK_WAKE=.*CREATE_(?:TASK|QUEUE|SCHEDULER)/);
});

test('Unity Web log contract matches the mandatory upper-platform development floor and per-game bootstrap parallelism',()=>{
  const evidence=logMap.unityWebGameDevelopmentEvidence;
  assert.equal(evidence.role,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(evidence.nativeGateAuthority,false);
  assert.equal(evidence.developmentAdmissionAuthority,false);
  assert.equal(evidence.requiredForDevelopmentAdmission,false);
  assert.equal(evidence.requiredForNativeRuntimePass,false);
  assert.equal(evidence.requiredForRelease,false);
  assert.equal(evidence.canonicalSource,'unity-games/<gameId>/');
  assert.equal(evidence.sourceBootstrapParallelism,'PER_GAME_MATRIX_PARALLEL');
  assert.equal(evidence.sourceBootstrapGlobalSerializationForbidden,true);
  for(const marker of ['UNITY_WEB_FLOOR_REQUIRED','UNITY_WEB_FLOOR_BOOTSTRAP_REQUIRED','UNITY_WEB_BOOTSTRAP_GENERATED_ID']){
    assert.ok(evidence.markers.includes(marker),marker);
  }
  assert.ok(!evidence.markers.includes('UNITY_WEB_RUNTIME_ROLE=NON_BLOCKING_VALIDATION_SURFACE'));
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
  assert.deepEqual(directive.gameSeed.allowedTargetPlatforms,['ROBLOX','UNITY']);
  assert.deepEqual(directive.gameSeed.pausedTargetPlatforms,['FORTNITE_UEFN']);
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
  assert.equal(development.executionMode,'ROBLOX_AND_UNITY_WEB_INDEPENDENT_CONTINUOUS');
  assert.equal(development.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(development.strictDesignScoreRequiredForAdmission,false);
  assert.equal(development.strictDesignReviewRunsInParallel,true);
  assert.deepEqual(development.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(development.onePlatformFailureDoesNotCancelOther,true);
  assert.equal(development.targetPlatformMayRunImmediately,true);
  assert.equal(development.unityWebDevelopmentMayRunImmediately,true);
  assert.equal(development.upperPlatformAdmissionAuthority,'MINIMUM_DESIGN_READY');
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
  assert.equal(lane?.readinessPassNextAction,'CONTINUE_UNITY_WEB_BUILD_UP');
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
  assert.equal(roadmap.developmentLifecycleMachine?.targetPlatformDevelopment?.admissionGate,'MINIMUM_DESIGN_READY');
  assert.equal(roadmap.unityWebFirstStage?.scope,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(roadmap.unityWebFirstStage?.developmentAdmissionAuthority,false);
  assert.equal(roadmap.unityWebFirstStage?.validationSurfaceOnly,false);
  assert.equal(roadmap.unityWebFirstStage?.nativeDevelopmentMayRunWithoutWebBuild,true);
  assert.equal(roadmap.webCompanion?.developmentAdmissionGate,false);
  assert.equal(roadmap.webCompanion?.releaseGate,false);
  assert.equal(roadmap.directNativeDualPlatformDevelopment?.unityWebMode,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(roadmap.departmentDrivenPortfolioDevelopmentControl?.runtimeExecution?.unityWebValidationSurface?.role,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(roadmap.departmentDrivenPortfolioDevelopmentControl?.runtimeExecution?.unityWebValidationSurface?.developmentAdmissionGate,false);
  assert.equal(roadmap.canonicalProductionDepartments?.unityWebRole,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(directive.gameSeed?.derivedProductionRequirements?.includes('UNITY_WEB_UPPER_PLATFORM_PREDEVELOPMENT_FLOOR'),true);
  assert.equal(directive.gameSeed?.derivedProductionRequirements?.includes('UNITY_WEB_VALIDATION_SURFACE_WHEN_BUILDABLE'),false);
  assert.equal(directive.ai?.audioDepartment?.unityWebRole,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(directive.rules?.includes('owner-development-targets-roblox-and-unity-web-only-unity-android-owner-hold'),true);
  assert.equal(directive.rules?.includes('unity-web-is-optional-validation-surface-from-the-same-canonical-unity-project'),false);
  assert.equal(roadmap.unityWebFirstStage?.homepageTestLinkEnabled,true);
  assert.equal(roadmap.unityWebFirstStage?.homepageTestLinkIsNotDeploymentOrRelease,true);
  assert.equal(architecture.concurrentPlatformDevelopment?.admissionAuthority,'MINIMUM_DESIGN_READY');
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWeb,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.deepEqual(architecture.concurrentPlatformDevelopment?.unityWebDevelopmentLane?.developmentFlow,expectedFlow);
  assert.equal(architecture.concurrentPlatformDevelopment?.upperPlatformDevelopmentReadinessGate?.gateId,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(architecture.departmentTopology?.unityWebRole,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(architecture.departmentRuntimeTopology?.developmentConfirmed?.unityWebReadinessPassDispatch,'CONTINUE_UNITY_WEB_BUILD_UP');
  assert.equal(architecture.developmentPipeline?.unityWebDevelopmentLane?.readinessGate,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.nativeGateAuthority,false);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.developmentAdmissionAuthority,false);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.nativeFanOutTrigger,'UPPER_PLATFORM_DEVELOPMENT_READY_ON_MAIN');
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.nativeFanOutDoesNotCreateAdmissionAuthority,true);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.newUpperPlatformEntryBlocking,false);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebValidationSurface?.existingNativeDevelopmentGrandfathered,true);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebDevelopmentLane?.implementationState,'ACTIVE_EXECUTOR_BOUND');
  assert.equal(roadmap.changeRecord?.unityWebUpperPlatformDevelopmentGate20260925?.implementationState,'CENTRAL_POLICY_ARCHITECTURE_AND_EXECUTOR_BOUND');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityWebValidationSurface?.sameCanonicalUnityProjectRequired,true);
  assert.equal(directive.production.webCompanion?.legacyDirectWebAuthoring,false);
  assert.match(nativeDevelopmentWorkflow,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.doesNotMatch(nativeDevelopmentWorkflow,/gh workflow run unity-web-first-stage-build\.yml/);
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
  assert.match(pipeline,/DEVELOPMENT_EXECUTION_MODE=ROBLOX_AND_UNITY_WEB_ONLY_CONTINUOUS_DEVELOPMENT/);
  assert.match(pipeline,/DEVELOPMENT_RUNTIME_OWNER=\.github\/workflows\/company-development-confirmed-runtime\.yml/);
  assert.match(pipeline,/UNITY_WEB_UPPER_PLATFORM_FLOOR=INDEPENDENT_NO_ROBLOX_GATE/);
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
  assert.equal(development.executionMode,'ROBLOX_AND_UNITY_WEB_INDEPENDENT_CONTINUOUS');
  assert.equal(development.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(development.upperPlatformAdmissionAuthority,'MINIMUM_DESIGN_READY');
  assert.equal(development.targetPlatformPurpose,'ROBLOX_AND_UNITY_WEB_ONLY_ANDROID_HELD');
  assert.equal(development.targetPlatformMayRunImmediately,true);
  assert.equal(development.unityWebDevelopmentMayRunImmediately,true);
  assert.equal(development.approvedScopeCompletionRequired,true);
  assert.equal(web.enabled,true);
  assert.equal(web.optional,false);
  assert.equal(web.sameCanonicalUnityProjectRequired,true);
  assert.equal(web.nativeGateAuthority,false);
  assert.equal(web.upperPlatformReadinessGate,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(web.missingOrFailedBuildDoesNotBlockNative,true);
  assert.equal(web.releaseAuthority,false);
  for(const token of ['UNITY_WEB_CODE_AND_GRAPHICS_DEVELOPMENT','UNITY_WEBGL_BUILD','UNITY_WEB_ACTUAL_BROWSER_PLAY','UNITY_WEB_INDEPENDENT_QA','UNITY_WEB_REGRESSION','UPPER_PLATFORM_DEVELOPMENT_READINESS_EVALUATION','ROBLOX_UNITY_NATIVE_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION'])assert.ok(development.requiredFlow.includes(token),token);
  for(const token of ['UPPER_PLATFORM_DEVELOPMENT_READY','PLATFORM_SPECIFIC_SOURCE_EXISTS','PLATFORM_SPECIFIC_RUNTIME_PASS','PLATFORM_SPECIFIC_INDEPENDENT_QA_PASS','PLATFORM_SPECIFIC_REGRESSION_PASS'])assert.ok(development.baselineReadyRequires.includes(token),token);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.existingNativeDevelopmentGrandfathered,true);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.newNativeDevelopmentStartRequiresUnityWebReadiness,false);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.grandfatherMode,'DURABLE_NATIVE_PROGRESS_EVIDENCE');
  assert.deepEqual(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.grandfatherGameIds,[]);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.developmentConfirmedWithoutNativeProgressMustRunUnityWebFloor,false);
  assert.equal(roadmap.changeRecord?.unityWebFloorScope20260926?.grandfatherMode,'DURABLE_NATIVE_PROGRESS_EVIDENCE');
  assert.deepEqual(roadmap.changeRecord?.unityWebFloorScope20260926?.grandfatherGameIds,[]);
  assert.equal(roadmap.changeRecord?.unityWebFloorScope20260926?.developmentConfirmedWithoutNativeProgressMustRunUnityWebFloor,true);
  assert.equal(architecture.concurrentPlatformDevelopment?.upperPlatformAdmissionMigration?.grandfatherMode,'DURABLE_NATIVE_PROGRESS_EVIDENCE');
  assert.equal(architecture.concurrentPlatformDevelopment?.upperPlatformAdmissionMigration?.developmentConfirmedWithoutNativeProgressMustRunUnityWebFloor,false);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebGrandfatherScope?.grandfatherMode,'DURABLE_NATIVE_PROGRESS_EVIDENCE');
  assert.deepEqual(architecture.concurrentPlatformDevelopment?.unityWebGrandfatherScope?.grandfatherGameIds,[]);
  assert.equal(architecture.concurrentPlatformDevelopment?.unityWebGrandfatherScope?.developmentConfirmedWithoutNativeProgressMustRunUnityWebFloor,false);
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
  assert.equal(strategy.platformDevelopmentMayStartWithoutPriorPlatformCompletion,true);
  assert.equal(strategy.platformReleaseMayProceedWhenItsOwnEvidenceGatesPass,true);
  assert.deepEqual(strategy.developmentAccess,{ROBLOX:'ALWAYS_ALLOWED',UNITY:'OWNER_HOLD',FORTNITE_UEFN:'OWNER_HOLD',UNITY_WEB:'ALWAYS_ALLOWED',UNITY_ANDROID:'OWNER_HOLD'});
  assert.equal(strategy.UNITY.existingPathPreserved,true);
  assert.equal(strategy.UNITY.robloxDoesNotReplaceUnity,true);
  assert.equal(strategy.FORTNITE_UEFN.role,'DEVELOPMENT_PAUSED_SUPPORTED_PLATFORM');
  assert.equal(strategy.FORTNITE_UEFN.developmentStatus,'DEVELOPMENT_PAUSED');
  assert.equal(strategy.FORTNITE_UEFN.statusLabel,'개발보류');
  assert.equal(strategy.FORTNITE_UEFN.autonomousBuildUpAllowed,false);
  assert.equal(strategy.FORTNITE_UEFN.developmentAlwaysAllowed,false);
  assert.equal(roadmap.platformPriorityInvariant.mode,'UNITY_ROBLOX_EQUAL_FIRST_TIER');
  assert.deepEqual(roadmap.platformPriorityInvariant.priorityTiers,[['UNITY','ROBLOX']]);
  assert.equal(roadmap.platformPriorityInvariant.robloxMustReceiveFirstEligibleDevelopmentSlot,false);
  assert.equal(roadmap.platformPriorityInvariant.fortniteUefnDevelopmentStillAllowed,false);
  assert.equal(roadmap.platformPriorityInvariant.fortniteUefnState,'OWNER_HOLD');
  assert.equal(roadmap.platformPriorityInvariant.fortniteUefnDevelopmentStatus,'DEVELOPMENT_PAUSED');
  assert.equal(roadmap.platformPriorityInvariant.fortniteUefnStatusLabel,'개발보류');
});

test('Fortnite UEFN development pause is explicit in central policy and build-up projections',()=>{
  const pause=roadmap.changeRecord.fortniteUefnDevelopmentPause20260927;
  assert.equal(pause.machineState,'OWNER_HOLD');
  assert.equal(pause.displayStatus,'DEVELOPMENT_PAUSED');
  assert.equal(pause.statusLabel,'개발보류');
  assert.equal(pause.developmentExecutionAllowed,false);
  assert.equal(pause.autonomousBuildUpAllowed,false);
  assert.equal(pause.graphicsBuildUpAllowed,false);
  assert.equal(pause.menuBuildUpAllowed,false);
  assert.deepEqual(pause.activeBuildUpPlatforms,['WEB','ROBLOX','UNITY']);
  assert.deepEqual(pause.pausedPlatforms,['FORTNITE_UEFN']);
  assert.equal(architecture.fortniteUefnDevelopmentPauseTopology.developmentStatus,'DEVELOPMENT_PAUSED');
  assert.equal(architecture.fortniteUefnDevelopmentPauseTopology.statusLabel,'개발보류');
  assert.equal(architecture.fortniteUefnDevelopmentPauseTopology.autonomousBuildUpAllowed,false);
  assert.deepEqual(autonomousExpansionPolicy.scope.platforms,['WEB','ROBLOX','UNITY']);
  assert.deepEqual(autonomousExpansionPolicy.scope.pausedPlatforms,['FORTNITE_UEFN']);
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
  assert.equal(control.resumeMode,'AUTO_AFTER_EACH_F9_FINAL_PUBLISH_DISPATCH');
  assert.equal(control.verifiedCyclePublication.f9Terminal,false);
  assert.equal(control.verifiedCyclePublication.perpetualRepeat,true);
  assert.equal(control.verifiedCyclePublication.canonicalGameTargetPublishBeforeF9Forbidden,true);
  assert.equal(control.verifiedCyclePublication.preF9ValidationMustUseSeparateTarget,true);
  assert.equal(control.verifiedCyclePublication.nextCycleMayStartOnlyAfterCanonicalPublishSuccess,false);
  assert.equal(control.verifiedCyclePublication.nextCycleStartsAfterPublishDispatch,true);
  assert.equal(control.verifiedCyclePublication.publicationOutcomeBlocksEvolution,false);
  assert.equal(control.verifiedCyclePublication.publicationVisibilityBlocksEvolution,false);
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

test('Web Roblox and Unity all repeat F0 through F9 then deploy and immediately start the next cycle',()=>{
  const loop=roadmap.developmentLifecycleMachine.verifiedF0F9PublicationLoop;
  assert.deepEqual(loop.appliesTo,['WEB','ROBLOX','UNITY']);
  assert.deepEqual(loop.sequence,[
    'GAME_SOURCE_MUTATION','F0','F1','F2','F3','F4','F5','F6','F7','F8','F9',
    'RELEASE_CLASSIFICATION','PUBLISH_ONLY_IF_RELEASED','IMMEDIATE_NEXT_EVOLUTION_CYCLE'
  ]);
  assert.equal(loop.f9Terminal,false);
  assert.equal(loop.f10Forbidden,true);
  assert.equal(loop.publishBeforeF9Forbidden,true);
  assert.equal(loop.publicationOutcomeBlocksNextEvolution,false);
  assert.equal(loop.publicationVisibilityBlocksNextEvolution,false);
  assert.equal(loop.internalOrExternalVisibilityIrrelevantToEvolutionLoop,true);
  assert.equal(loop.nextCycleTrigger,'F9_VERIFIED_AND_RELEASED_PUBLISH_DISPATCHED_OR_DEVELOPMENT_PUBLICATION_SKIPPED');
  assert.equal(loop.developmentGamePublicationAllowed,false);
  assert.equal(loop.developmentGameNextCycleRequiresPublicationDispatch,false);
  assert.equal(loop.repeat,'UNBOUNDED_UNTIL_OWNER_HOLD_OR_PROJECT_REMOVAL');
  const efficiency=roadmap.developmentLifecycleMachine.validationEfficiencyOptimization;
  assert.deepEqual(efficiency.appliesTo,['WEB','ROBLOX','UNITY']);
  assert.equal(efficiency.everyVerifiedDevelopmentDeltaStillRunsF0ThroughF9,true);
  assert.equal(efficiency.f9DoesNotTerminateEvolution,true);
  assert.equal(efficiency.publishOrDeployDispatchAfterF9Required,true);
  assert.equal(efficiency.nextF0CycleStartsAfterPublishOrDeployDispatchWithoutWaitingForOutcome,true);
  assert.equal(efficiency.publicationOutcomeBlocksEvolution,false);
  assert.equal(efficiency.publicationVisibilityBlocksEvolution,false);
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
  const lineLocator=gated.sourceCandidateGeneration.explicitLineLocatorRecovery;
  assert.equal(lineLocator?.enabled,true);
  assert.ok(lineLocator?.acceptedSuffixes?.includes(':<line>'));
  assert.ok(lineLocator?.acceptedSuffixes?.includes('#L<line>'));
  assert.equal(lineLocator?.exactResponsibleFileMatchRequired,true);
  assert.equal(lineLocator?.stripBeforeExtensionValidation,true);
  assert.equal(lineLocator?.writableScopeExpansionAllowed,false);
  assert.equal(lineLocator?.unmatchedLocatorFailsClosedAsInvalidPath,true);
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
  assert.equal(roadmap.developmentAccess.FORTNITE_UEFN,'OWNER_HOLD');
  assert.equal(roadmap.fortniteUefn.developmentStatus,'DEVELOPMENT_PAUSED');
  assert.equal(roadmap.fortniteUefn.developmentStatusLabel,'개발보류');
  assert.equal(roadmap.fortniteUefn.buildUpExecutionAllowed,false);
  assert.equal(roadmap.fortniteUefn.graphicsBuildUpAllowed,false);
  assert.equal(roadmap.fortniteUefn.menuBuildUpAllowed,false);
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
  const robloxParallel=roadmap.developmentSpeedExecution.robloxEndToEndParallelExecution;
  assert.equal(robloxParallel.workflowLevelGameWideSerializationForbidden,true);
  assert.equal(robloxParallel.workflowLevelConcurrencyGroupByGameIdForbidden,true);
  assert.equal(robloxParallel.sameGameConflictSerializationScope,'EXACT_DUPLICATE_STAGE_OR_RESPONSIBLE_FILE_OR_ATOMIC_SHARED_STATE_WRITE_ONLY');
  assert.equal(robloxParallel.crossGameWorkflowSerializationForbidden,true);
  assert.equal(robloxParallel.exactGameDuplicateWorkflowSerializationAllowed,false);
  assert.equal(robloxParallel.exactGameDuplicateStageCoalescingAllowed,true);
  assert.equal(robloxParallel.internalSameWorkflowGameMatrixParallelismPreserved,true);
  const noGameWideLock=roadmap.changeRecord?.robloxGameWideWorkflowSerializationRemoval20260926;
  assert.equal(noGameWideLock.gameIdStillCanonicalTaskIdentity,true);
  assert.equal(noGameWideLock.internalArtificialParallelCapAdded,false);
  assert.equal(architecture.robloxDevelopmentParallelismProjection.topLevelGameWideWorkflowLock,false);
  assert.equal(architecture.robloxDevelopmentParallelismProjection.maxParallelInternalCap,null);
  assert.equal(p.execution.taskMicroFanInImmediateRefillPreserved,true);
  assert.equal(p.execution.cohortFanInLimitedToRelevantIntegrationRegressionAndRelease,true);
  assert.equal(p.principles.optimizationLaneMustRemainLiveDuringDevelopment,true);
  assert.equal(p.principles.unrelatedSecurityQaOrReviewMustNotSerializeBuildUp,true);
  assert.equal(p.developmentLoopOptimization.active,true);
  assert.equal(p.developmentLoopOptimization.unrelatedSecurityQaReviewAdminAction,'SKIP_OR_RUN_NONBLOCKING_WITH_REUSED_VALID_EVIDENCE');
  assert.equal(p.developmentLoopOptimization.relevantSecurityBoundaryStillFailClosed,true);
  assert.equal(p.developmentLoopOptimization.optimizationLaneMustRemainEligibleDuringDevelopment,true);
  assert.equal(p.developmentLoopOptimization.optimizationMayRunParallelWhenResponsibleFilesDoNotConflict,true);
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
  assert.equal(projection.unrelatedSecurityQaReviewMaySerializeBuildUp,false);
  assert.equal(projection.optimizationLaneRemainsLive,true);
  assert.equal(projection.optimizationParallelWhenNoResponsibleFileConflict,true);

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

test('game-specific BUILD_UP directive is one autonomous common goal with exhaustive per-loop coverage',()=>{
  const c=roadmap.continuousGameplaySystemEvolutionContract?.gameSpecificBuildUpDirective;
  assert.equal(c.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(c.placement,'BETWEEN_COMPANY_EVOLUTION_BUILD_UP_DECISION_AND_PLATFORM_IMPLEMENTATION');
  assert.equal(c.runtimeBranch,'vibe2-unreal-core');
  assert.equal(c.canonicalArtifact,'.vibe2/build-up-directives/<gameId>/current.json');
  assert.equal(c.commonGoalAcrossPlatforms,true);
  assert.equal(c.creationAuthority,'VIBE_DIRECTOR_ONLY');
  assert.equal(c.platformExecutorsConsumerOnly,true);
  assert.equal(c.platformLocalDirectiveGenerationForbidden,true);
  assert.deepEqual(c.supportedExecutionSurfaces,['UNITY_WEB','ROBLOX','UNITY_APP']);
  assert.equal(c.analysisCoverage.allRelevantDomainsMustBeConsideredEveryGeneration,true);
  assert.equal(c.analysisCoverage.silentDomainOmissionForbidden,true);
  assert.equal(c.directiveDetail.everyApplicableDomainGetsOwnDirective,true);
  assert.ok(c.directiveDetail.requiredSections.includes('ALL_DOMAIN_IMPLEMENTATION_DIRECTIVES'));
  assert.equal(c.loopEscalation.developmentDepthRequired,true);
  assert.equal(c.loopEscalation.verifiedLoopIncrementsDepth,true);
  assert.equal(c.loopEscalation.failedLoopKeepsDepthAndRequiresDeeperCausalRepair,true);
  assert.equal(c.loopEscalation.verifiedStatusAloneCannotIncreaseDepth,true);
  assert.equal(c.loopEscalation.realGameSourceTreeDeltaRequiredForDepthIncrease,true);
  assert.equal(c.loopEscalation.generationFanInRequiredBeforeNextDirective,true);
  assert.equal(c.loopEscalation.anyActiveTaskKeepsSameDirectiveGeneration,true);
  assert.equal(c.loopEscalation.anyFailedTaskKeepsDepthAndTriggersCausalRepair,true);
  assert.equal(c.loopEscalation.allRequiredGenerationTasksMustBeVerifiedBeforeEscalation,true);
  assert.equal(c.loopEscalation.sharedDirectiveGenerationAllRequiredTasksMustVerifyBeforeDepthIncrease,true);
  assert.equal(c.loopEscalation.anyFailedSiblingKeepsCurrentDepth,true);
  assert.equal(c.gameSpecificity.oneGenericCrossGameDirectiveForbidden,true);
  assert.equal(c.gameSpecificity.renameGameAndStillFitsHeuristic,'REGENERATE_AS_TOO_GENERIC');
  assert.equal(c.visualBuildUpDirective.required,true);
  assert.equal(c.visualBuildUpDirective.actualRenderedChangeRequired,true);
  assert.equal(c.visualBuildUpDirective.markerConfigAtomOnlyNeverCounts,true);
  assert.equal(c.loopEscalation.automatic,true);
  assert.equal(c.loopEscalation.everyVerifiedCycleCreatesNextDirective,true);
  assert.equal(c.loopEscalation.previousGoalMayNotRepeatWithoutNewEvidence,true);
  assert.equal(c.verification.workflowQaHomepageOnlyDeltaDoesNotCountAsGameEvolution,true);
  assert.equal(c.verification.foundationOnlyRepairDoesNotCountAsBuildUpUnlessPrimaryGoalIsVerifiedFoundationDefect,true);
  assert.equal(c.platformHandoff.platformMayNotInventDifferentCoreGameMeaning,true);
  assert.equal(c.platformHandoff.missingDirectiveMayNotInventPlatformSpecificGoal,true);
  const arch=architecture.continuousGameplaySystemEvolutionTopology?.gameSpecificBuildUpDirective;
  assert.equal(arch.generator,'tools/company-build-up-directive.mjs');
  assert.equal(arch.runtimeBranch,'vibe2-unreal-core');
  assert.equal(arch.everyVerifiedLoopRegeneratesDirective,true);
  assert.equal(arch.perApplicableDomainDirectiveRequired,true);
  assert.equal(arch.verifiedLoopDevelopmentDepthEscalation,true);
  assert.equal(arch.creationAuthority,'VIBE_DIRECTOR_ONLY');
  assert.equal(arch.platformExecutorsConsumerOnly,true);
  assert.equal(arch.platformLocalDirectiveGenerationForbidden,true);
  assert.equal(arch.verifiedStatusWithoutGameSourceDeltaCannotEscalate,true);
  assert.equal(arch.realGameSourceTreeDeltaRequiredForDepthIncrease,true);
  assert.equal(arch.generationFanInBeforeEscalation,true);
  assert.equal(arch.activeSiblingTaskPreventsGenerationAdvance,true);
  assert.equal(arch.failedSiblingTaskPreventsGenerationAdvance,true);
  assert.equal(arch.sharedDirectiveGenerationAllRequiredTasksMustVerifyBeforeDepthIncrease,true);
  assert.equal(arch.anyFailedSiblingKeepsCurrentDepth,true);
  assert.equal(arch.sharedSiblingDirectiveObjectExact,true);
  assert.equal(arch.genericCrossGameDirectiveForbidden,true);
  assert.equal(arch.shadowPipelineCreated,false);

  const robloxBootstrap=readText('tools/company-development-roblox-bootstrap.mjs');
  const unityBootstrap=readText('tools/company-development-unity-bootstrap.mjs');
  const unityWebBootstrap=readText('tools/company-unity-web-floor-bootstrap.mjs');
  for(const source of [robloxBootstrap,unityBootstrap,unityWebBootstrap]){
    assert.doesNotMatch(source,/import\s+\{?\s*buildGameSpecificBuildUpDirective/);
    assert.doesNotMatch(source,/buildGameSpecificBuildUpDirective\s*\(/);
    assert.match(source,/buildUpDirectiveCompletionClaim:false/);
  }
});


test('seed design runtime keeps owner reset priority without starving missing-design intake',()=>{
  const designContext=roadmap.continuousGameplaySystemEvolutionContract?.designContext;
  assert.equal(designContext?.missingDesignMustNotRemainPassive,true);
  assert.equal(designContext?.activeGameWorkDoesNotDeferDesignGeneration,true);
  const workflow=readText('.github/workflows/company-seed-design-runtime.yml');
  assert.match(workflow,/const ownerResetPriority=seed=>activeResetIds\.has\(String\(seed\?\.gameId\|\|''\)\.trim\(\)\)\?0:1;/);
  assert.match(workflow,/const eligible=preservationOnly[\s\S]{0,120}\? active\.filter\(preservationSeed\)[\s\S]{0,80}: active;/);
  assert.match(workflow,/ownerResetPriority\(a\)-ownerResetPriority\(b\)\|\|/);
  assert.doesNotMatch(workflow,/activeResetPending\.length\?activeResetSeeds:active/);
  assert.match(workflow,/OWNER_RESET_SCHEDULING=PRIORITY_NOT_EXCLUSIVE/);
});

test('Unity learning preparation stays off game-primary ubuntu-latest capacity',()=>{
  const policy=roadmap.changeRecord?.learningPreparationRunnerIsolation20260927;
  assert.equal(policy?.workflows?.practiceCpuFallback?.preparePracticeRunner,'ubuntu-slim');
  assert.equal(policy?.workflows?.structuralDistillation?.staticGateRunner,'ubuntu-slim');
  assert.equal(policy?.workflows?.structuralDistillation?.onlineTeacherRunner,'ubuntu-slim');
  assert.equal(policy?.selfHostedTrainingMoved,false);
  assert.equal(policy?.heavyGameExecutionChanged,false);
  assert.equal(policy?.learningAuthorityChanged,false);
  assert.equal(policy?.qualitySecurityReleaseGatesUnchanged,true);
  assert.equal(policy?.gamePrimaryUbuntuLatestCapacityProtected,true);
  assert.equal(policy?.workflowLevelConcurrencyRemoved,true);
  assert.equal(policy?.controlPlanePreparationBlockedByLocalTraining,false);
  assert.equal(policy?.localRunnerOfflineMayBlockPreparation,false);
  assert.equal(policy?.localRunnerOfflineMayBlockOnlyLocalTraining,true);
  assert.equal(policy?.localTrainingConcurrency?.practiceGroup,'vibe2-unity-practice-local-training');
  assert.equal(policy?.localTrainingConcurrency?.verifiedGroup,'vibe2-unity-verified-local-training');
  assert.equal(policy?.localTrainingConcurrency?.cancelInProgress,false);

  const practice=readText('.github/workflows/vibe2-practice-cpu-fallback.yml');
  const prepareStart=practice.indexOf('\n  prepare-practice:\n');
  const trainStart=practice.indexOf('\n  cpu-practice-train:\n',prepareStart);
  assert.ok(prepareStart>=0&&trainStart>prepareStart);
  const prepare=practice.slice(prepareStart,trainStart);
  const practiceHeader=practice.slice(0,practice.indexOf('\njobs:\n'));
  const localPractice=practice.slice(trainStart);
  assert.doesNotMatch(practiceHeader,/\nconcurrency:\n/);
  assert.match(prepare,/runs-on:\s*ubuntu-slim/);
  assert.doesNotMatch(prepare,/runs-on:\s*ubuntu-latest/);
  assert.match(localPractice,/concurrency:\n\s+group:\s*vibe2-unity-practice-local-training\n\s+cancel-in-progress:\s*false/);
  assert.match(localPractice,/runs-on:\s*\[self-hosted, Windows, X64, jaewoon-unity\]/);

  const structural=readText('.github/workflows/vibe2-structural-repair-distillation.yml');
  const staticStart=structural.indexOf('\n  static-gate:\n');
  const teacherStart=structural.indexOf('\n  online-teacher:\n',staticStart);
  const practiceTrainStart=structural.indexOf('\n  unity-practice-train:\n',teacherStart);
  assert.ok(staticStart>=0&&teacherStart>staticStart&&practiceTrainStart>teacherStart);
  const staticGate=structural.slice(staticStart,teacherStart);
  const teacher=structural.slice(teacherStart,practiceTrainStart);
  const structuralHeader=structural.slice(0,structural.indexOf('\njobs:\n'));
  const localStructural=structural.slice(practiceTrainStart);
  assert.doesNotMatch(structuralHeader,/\nconcurrency:\n/);
  assert.match(staticGate,/runs-on:\s*ubuntu-slim/);
  assert.match(staticGate,/actions\/setup-python@v5/);
  assert.doesNotMatch(staticGate,/runs-on:\s*ubuntu-latest/);
  assert.match(teacher,/runs-on:\s*ubuntu-slim/);
  assert.doesNotMatch(teacher,/runs-on:\s*ubuntu-latest/);
  assert.match(localStructural,/unity-practice-train:[\s\S]*?group:\s*vibe2-unity-practice-local-training[\s\S]*?cancel-in-progress:\s*false/);
  assert.match(localStructural,/unity-train:[\s\S]*?group:\s*vibe2-unity-verified-local-training[\s\S]*?cancel-in-progress:\s*false/);
  assert.match(localStructural,/runs-on:\s*\[self-hosted, Windows, X64, jaewoon-unity\]/);

  const projection=architecture.learningPreparationRunnerIsolation;
  assert.equal(projection?.practiceCpuFallback?.preparePracticeRunner,'ubuntu-slim');
  assert.equal(projection?.structuralDistillation?.staticGateRunner,'ubuntu-slim');
  assert.equal(projection?.structuralDistillation?.onlineTeacherRunner,'ubuntu-slim');
  assert.equal(projection?.selfHostedTrainingMoved,false);
  assert.equal(projection?.gamePrimaryUbuntuLatestCapacityProtected,true);
  assert.equal(projection?.workflowLevelConcurrencyRemoved,true);
  assert.equal(projection?.controlPlanePreparationBlockedByLocalTraining,false);
  assert.equal(projection?.localRunnerOfflineMayBlockOnlyLocalTraining,true);
  assert.equal(projection?.localTrainingConcurrency?.practiceGroup,'vibe2-unity-practice-local-training');
  assert.equal(projection?.localTrainingConcurrency?.verifiedGroup,'vibe2-unity-verified-local-training');
});

test('administrative control-plane QA stays off game-primary ubuntu-latest capacity',()=>{
  const roadmap=JSON.parse(readText('company-learning/platform-release-roadmap.json'));
  assert.equal(roadmap.minimumNecessaryProcedurePolicy.principles.administrativeChecksMayNotConsumeGamePrimaryWorkerSlots,true);
  assert.equal(roadmap.minimumNecessaryProcedurePolicy.execution.nonblockingChecksUseSpareOrSeparateCapacity,true);
  for(const workflowFile of [
    '.github/workflows/company-evolution-qa.yml',
    '.github/workflows/company-central-policy-contract-qa.yml',
    '.github/workflows/main-write-guard.yml',
  ]){
    const source=readText(workflowFile);
    assert.match(source,/runs-on:\s*ubuntu-slim/,workflowFile);
    assert.doesNotMatch(source,/runs-on:\s*ubuntu-latest/,workflowFile);
  }
});

test('System AI reserve control stays off game-primary ubuntu-latest capacity',()=>{
  const workflow=readText('.github/workflows/company-system-ai-workers.yml');
  const reserveStart=workflow.indexOf('\n  reserve:\n');
  const workerStart=workflow.indexOf('\n  worker:\n',reserveStart);
  assert.ok(reserveStart>=0&&workerStart>reserveStart);
  const reserve=workflow.slice(reserveStart,workerStart);
  assert.match(reserve,/runs-on:\s*ubuntu-slim/);
  assert.doesNotMatch(reserve,/runs-on:\s*ubuntu-latest/);
  const policy=roadmap.changeRecord?.controlPlaneRunnerPoolSeparation20260926;
  assert.equal(policy?.systemAi?.reserveRunner,'ubuntu-slim');
});

test('Vibe3 contract QA stays off game-primary ubuntu-latest capacity',()=>{
  const workflow=readText('.github/workflows/vibe3-engine-contract.yml');
  assert.match(workflow,/\n  contract:\n[\s\S]*?runs-on:\s*ubuntu-slim/);
  assert.doesNotMatch(workflow,/runs-on:\s*ubuntu-latest/);
  assert.ok(architecture.minimumNecessaryProcedurePolicyProjection.impactScopedWorkflowFiles.includes('.github/workflows/vibe3-engine-contract.yml'));
  assert.equal(roadmap.minimumNecessaryProcedurePolicy.principles.administrativeChecksMayNotConsumeGamePrimaryWorkerSlots,true);
});

test('Roblox development keeps only current code/static QA contract and no historical repair mirrors',()=>{
  const workflow=readText('.github/workflows/company-development-roblox-post-runtime-qa.yml');
  const qaStart=workflow.indexOf('\n  runtime-foundation-qa:\n');
  const studioStart=workflow.indexOf('\n  studio-local-plan:\n',qaStart);
  assert.ok(qaStart>=0&&studioStart>qaStart);
  const remoteQa=workflow.slice(qaStart,studioStart);
  assert.match(remoteQa,/runs-on:\s*ubuntu-24\.04/);
  assert.doesNotMatch(remoteQa,/runs-on:\s*ubuntu-latest/);

  const verification=roadmap.roblox?.developmentVerification||{};
  assert.deepEqual(verification.postBuildUpRequired,['CODE_QA','STATIC_QA']);
  assert.equal(verification.studio,'OPTIONAL_DIAGNOSTIC');
  assert.equal(verification.studioBlocksDevelopment,false);
  assert.equal(verification.studioBlocksF9,false);
  assert.equal(verification.studioBlocksDeployment,false);
  assert.equal(verification.exactSourceArtifactBindingRequired,true);

  assert.equal(roadmap.roblox?.studioExecution?.required,false);
  assert.equal(roadmap.roblox?.studioExecution?.requiredForInternalRelease,false);
  assert.equal(roadmap.roblox?.studioExecution?.deploymentGate,false);
  assert.equal(roadmap.developmentLifecycleMachine?.validationEfficiencyOptimization?.roblox?.studioValidationRequired,false);

  for(const key of [
    'robloxPostRuntimeQaRunnerIsolation20260927',
    'robloxOpenCloudThrottleRecovery20260927',
    'robloxStudioUnavailableUnlimitedRetry20261002',
    'robloxF9FaninRuntimePathRepair20260927',
    'robloxPlannerDuplicateContractQaRemoval20260927',
    'robloxSourcePlanWakeAndRunnerIsolation20260927'
  ])assert.equal(Object.hasOwn(roadmap.changeRecord||{},key),false,key);
  for(const key of [
    'robloxRuntimeFoundationRunnerIsolation',
    'robloxPlannerDuplicateContractQaRemoval',
    'robloxSourcePlanWakeAndRunnerIsolation',
    'robloxOpenCloudThrottleRecovery',
    'robloxF9FaninRuntimePathRepair'
  ])assert.equal(Object.hasOwn(architecture,key),false,key);
  for(const key of [
    'robloxPostRuntimeQaRunnerIsolationEvidence',
    'robloxExactEngineStudioHandoffEvidence',
    'robloxOpenCloudThrottleRecoveryEvidence',
    'robloxF9FaninRuntimePathRepairEvidence',
    'robloxPlannerDuplicateContractQaRemovalEvidence',
    'robloxSourcePlanWakeAndRunnerIsolationEvidence'
  ])assert.equal(Object.hasOwn(logMap,key),false,key);
});

test('core QA cancels superseded main regressions while preserving non-main active runs',()=>{
  const historical=roadmap.changeRecord?.vibe2CoreQaActiveCompletion20260927;
  const policy=roadmap.changeRecord?.runnerBackpressureBottleneckRelief20261001?.coreQa;
  assert.equal(historical?.cancelActiveValidation,false);
  assert.equal(historical?.pendingPolicy,'KEEP_ONLY_LATEST_PENDING_SAME_REF');
  assert.equal(historical?.exactShaReuseByGamePrimaryReservePreserved,true);
  assert.equal(historical?.qualityGateWeakened,false);
  assert.equal(policy?.mainPushCancelsSupersededInProgress,true);
  assert.equal(policy?.nonMainActiveRunPreserved,true);
  assert.equal(policy?.exactShaAuthorityPreserved,true);
  assert.match(coreQaWorkflow,/concurrency:\n(?:\s+#.*\n)*\s+group: vibe2-core-qa-\$\{\{ github\.ref \}\}[\s\S]*?cancel-in-progress:\s*\$\{\{ github\.event_name == 'push' && github\.ref == 'refs\/heads\/main' \}\}/);
  const pool=architecture.neuralWorkGraphTopology?.currentWaveExecution?.vibeGameControlRunnerPool;
  assert.equal(pool?.coreQaRunner,'ubuntu-slim');
  assert.equal(pool?.coreQaConcurrencyMode,'MAIN_LATEST_SHA_ONLY_NON_MAIN_ACTIVE_PRESERVED');
  assert.equal(pool?.coreQaCancelInProgress,undefined);
  assert.equal(pool?.coreQaMainPushCancelsSupersededInProgress,true);
  assert.equal(pool?.coreQaNonMainCancelInProgress,false);
  assert.equal(pool?.coreQaBrowserSmokeRunner,'ubuntu-24.04');
  assert.equal(pool?.coreQaBrowserSmokeSeparateJob,true);
  assert.equal(pool?.coreQaBrowserSmokeParallel,true);
  assert.equal(pool?.coreQaBrowserSmokeRequiresRealBrowser,true);
  assert.equal(historical?.browserSmoke?.runner,'ubuntu-24.04');
  assert.equal(historical?.browserSmoke?.separateJob,true);
  assert.equal(historical?.browserSmoke?.parallelWithCoreTests,true);
  assert.equal(historical?.browserSmoke?.realBrowserRequired,true);
  assert.equal(historical?.browserSmoke?.browserGatePreserved,true);
  assert.equal(historical?.browserSmoke?.gamePrimaryUbuntuLatestLabelUsed,false);
  assert.match(coreQaWorkflow,/\n  browser-smoke:\n\s+needs:\s*scope\n\s+if:\s*\$\{\{ needs\.scope\.outputs\.parallelism_only != 'YES' \}\}\n\s+name: Development Web browser startup smoke\n\s+runs-on: ubuntu-24\.04/);
  assert.doesNotMatch(coreQaWorkflow,/\n  browser-smoke:\n[\s\S]{0,160}?needs:\s*test/);
});

test('focused retry history reuse stays evidence-gated without weakening QA',()=>{
  const policy=roadmap.changeRecord?.vibeFocusedRetryHistoryReuse20260927;
  assert.equal(policy?.action,'REUSE_EXISTING_FOCUSED_WEB_FIRST_EDIT_STREAM_PATH_ON_ATTEMPT_ONE');
  assert.deepEqual(policy?.eligibility,[
    'TARGET_WEB',
    'ONE_RESPONSIBLE_HTML_FILE',
    'TASK_RETRIES_GT_0',
    'PRIOR_CODING_FOCUSED_REPLACE_ONLY_YES',
    'PRIOR_GENERATION_ATTEMPTS_GE_2',
    'PRIOR_MATERIAL_CANDIDATE_SHA_PRESENT'
  ]);
  assert.equal(policy?.fullRewriteExcluded,true);
  assert.equal(policy?.newTaskExcluded,true);
  assert.equal(policy?.candidateValidationUnchanged,true);
  assert.equal(policy?.incrementalQaUnchanged,true);
  assert.equal(policy?.fanInRegressionUnchanged,true);
  assert.equal(policy?.retryBudgetUnchanged,true);
  const topology=architecture.vibeSourceGenerationFocusedRecoveryTopology;
  assert.equal(topology?.version,3);
  assert.equal(topology?.historicalFocusedRetryReuse?.enabled,true);
  assert.equal(topology?.historicalFocusedRetryReuse?.scope,'RETRIED_SINGLE_HTML_WEB_TASK_ONLY');
  assert.equal(topology?.historicalFocusedRetryReuse?.firstAttemptMode,'EXISTING_FOCUSED_WEB_FIRST_EDIT_STREAM');
  const worker=readText('tools/vibe2-source-worker.mjs');
  assert.match(worker,/const retriedFocusedGeneration=Number\(order\?\.selectedTask\?\.retries\|\|0\)>0/);
  assert.match(worker,/evidence\.has\('coding-focused-replace-only:YES'\)/);
  assert.match(worker,/\^candidate-sha:\[0-9a-f\]\{40\}\$/i);
});

test('duplicate administrative QA keeps only the latest same-ref validation',()=>{
  const roadmap=JSON.parse(readText('company-learning/platform-release-roadmap.json'));
  assert.equal(roadmap.minimumNecessaryProcedurePolicy.principles.duplicateValidationWithoutEvidenceInvalidationForbidden,true);
  assert.equal(roadmap.minimumNecessaryProcedurePolicy.principles.duplicateReviewWithoutRelevantChangeForbidden,true);
  for(const workflowFile of [
    '.github/workflows/company-evolution-qa.yml',
    '.github/workflows/company-central-policy-contract-qa.yml',
    '.github/workflows/vibe2-parallelism-contract-qa.yml',
    '.github/workflows/company-security-immune.yml',
  ]){
    const source=readText(workflowFile);
    assert.match(source,/concurrency:\n\s+group:/,workflowFile);
    assert.match(source,/cancel-in-progress:\s*true/,workflowFile);
  }
  const parallelism=readText('.github/workflows/vibe2-parallelism-contract-qa.yml');
  assert.match(parallelism,/runs-on:\s*ubuntu-slim/);
});


test('Director runner drain uses separate fixed 24.04 capacity while gate and supervision remain slim',()=>{
  const policy=roadmap.changeRecord?.directorDrainRunnerIsolation20260927;
  const topology=architecture.directorDrainRunnerIsolation;
  assert.equal(policy?.runnerDrainRunner,'ubuntu-24.04');
  assert.equal(policy?.gamePrimaryGateRunner,'ubuntu-slim');
  assert.equal(policy?.superviseRunner,'ubuntu-slim');
  assert.equal(policy?.heavyGameExecutionRunner,'ubuntu-latest');
  assert.equal(policy?.gameHeavyExecutionChanged,false);
  assert.equal(policy?.drainLogicChanged,false);
  assert.equal(policy?.activeGameCancellationForbidden,true);
  assert.equal(policy?.independentGameCancellationForbidden,true);
  assert.equal(topology?.runnerDrain,'ubuntu-24.04');
  assert.equal(topology?.gamePrimaryGate,'ubuntu-slim');
  assert.equal(topology?.supervise,'ubuntu-slim');
  assert.equal(topology?.heavyGameExecution,'ubuntu-latest');
  const queueReconcile=readText('.github/workflows/company-development-queue-reconcile.yml');
  assert.match(queueReconcile,/game-primary-gate:[\s\S]*?runs-on:\s*ubuntu-24\.04/);
  assert.match(queueReconcile,/reconcile:[\s\S]*?runs-on:\s*ubuntu-24\.04/);
  assert.doesNotMatch(queueReconcile,/runs-on:\s*ubuntu-latest/);
  const queueIsolation=roadmap.changeRecord?.developmentQueueReconcileRunnerIsolation20260927||{};
  assert.equal(queueIsolation.gamePrimaryGateRunner,'ubuntu-24.04');
  assert.equal(queueIsolation.reconcileRunner,'ubuntu-24.04');
  assert.equal(queueIsolation.previousRunner,'ubuntu-slim');
  assert.equal(architecture.developmentQueueReconcileRunnerIsolation?.gamePrimaryGateRunner,'ubuntu-24.04');
  assert.equal(logMap.developmentQueueReconcileRunnerIsolationEvidence?.expectedRunnerLabels?.reconcile,'ubuntu-24.04');
  assert.match(directorSupervisor,/runner-drain:[\s\S]*?runs-on:\s*ubuntu-24\.04/);
  assert.match(directorSupervisor,/game-primary-gate:[\s\S]*?runs-on:\s*ubuntu-slim/);
  assert.match(directorSupervisor,/supervise:[\s\S]*?runs-on:\s*ubuntu-slim/);
});

test('director supervisor runner drain remains structurally valid and jobs are unique',()=>{
  assert.equal((directorSupervisor.match(/\n  runner-drain:\n/g)||[]).length,1);
  assert.equal((directorSupervisor.match(/\n  game-primary-gate:\n/g)||[]).length,1);
  assert.equal((directorSupervisor.match(/\n  supervise:\n/g)||[]).length,1);
  assert.match(directorSupervisor,/while IFS='\\|' read -r run_id reason; do/);
  assert.doesNotMatch(directorSupervisor,/while IFS=\s+outputs:/);
});


test('director runner drain uses targeted active-run queries instead of deep Actions history pagination',()=>{
  assert.match(directorSupervisor,/fetch_runs 'per_page=100'/);
  assert.match(directorSupervisor,/fetch_runs 'status=in_progress&per_page=100'/);
  assert.match(directorSupervisor,/fetch_runs 'status=queued&per_page=100'/);
  assert.match(directorSupervisor,/DIRECTOR_RUNNER_DRAIN_FETCH_RETRY=/);
  assert.match(directorSupervisor,/VIBE2_STALE_UNSTARTED_MAIN_PUSH_GAME_PRIMARY_WAKE/);
  assert.doesNotMatch(directorSupervisor,/for page in \$\(seq 1 20\)/);
  assert.match(directorSupervisor,/page_query="\$\{query\}&page=\$\{page\}"/);
  assert.doesNotMatch(directorSupervisor,/for page in \$\(seq 1 20\)/);
});

test('administrative operational control workflows stay off game-primary ubuntu-latest capacity',()=>{
  for(const workflowFile of [
    '.github/workflows/company-status-sync.yml',
    '.github/workflows/company-design-promotion-sync.yml',
    '.github/workflows/company-platform-exposure-sync.yml',
    '.github/workflows/vibe2-recovery-fast.yml',
  ]){
    const source=readText(workflowFile);
    assert.match(source,/runs-on:\s*ubuntu-slim/,workflowFile);
    assert.doesNotMatch(source,/runs-on:\s*ubuntu-latest/,workflowFile);
  }
  assert.match(directorSupervisor,/runner-drain:[\s\S]*?runs-on:\s*ubuntu-24\.04/);
  assert.match(directorSupervisor,/game-primary-gate:[\s\S]*?runs-on:\s*ubuntu-slim/);
  assert.match(directorSupervisor,/supervise:[\s\S]*?runs-on:\s*ubuntu-slim/);
});

test('director runner drain remains parallel while supervise alone is serialized',()=>{
  const jobsAt=directorSupervisor.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.doesNotMatch(directorSupervisor.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(directorSupervisor,/runner-drain:[\s\S]*?runs-on:\s*ubuntu-24\.04/);
  assert.match(directorSupervisor,/supervise:[\s\S]*?concurrency:\n\s+group:\s*director-central-company-supervise-v3/);
});


test('director uses job-local coalescing without workflow-wide serialization',()=>{
  const jobsAt=directorSupervisor.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.doesNotMatch(directorSupervisor.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(directorSupervisor,/runner-drain:[\s\S]*?group:\s*director-runner-drain-v3/);
  assert.match(directorSupervisor,/game-primary-gate:[\s\S]*?group:\s*director-game-primary-gate-v1/);
  assert.match(directorSupervisor,/game-primary-gate:[\s\S]*?cancel-in-progress:\s*false/);
  assert.doesNotMatch(directorSupervisor,/game-primary-gate:\n\s+needs:\s+runner-drain/);
  assert.match(directorSupervisor,/DIRECTOR_GAME_PRIMARY_CURRENT_MAIN=/);
  assert.match(directorSupervisor,/supervise:\n\s+needs: \[runner-drain, game-primary-gate\]/);
  assert.match(directorSupervisor,/supervise:[\s\S]*?group:\s*director-central-company-supervise-v3/);
});

test('quality-first buildup short-circuit is centralized and architecture/log projections cannot weaken it',()=>{
  const p=roadmap.minimumNecessaryProcedurePolicy?.qualityFirstBuildupShortCircuit;
  assert.equal(p?.authority,'OWNER_DIRECTIVE_2026-09-27');
  assert.equal(p?.automaticRouting?.ownerApprovalRequiredForApprovedScopeQualityRepair,false);
  assert.equal(p?.automaticRouting?.canonicalRoute,'EXISTING_VIBE_PLANNER_AND_SOURCE_WORKER_ONLY');
  assert.equal(p?.shortCircuit?.transient429MayNotPreemptActiveQualityBuildUp,true);
  assert.ok(p?.shortCircuit?.activeInternalQualityFailureSuppresses?.includes('OPEN_CLOUD_EXTERNAL_RUNTIME_PROBE'));
  assert.ok(p?.shortCircuit?.activeInternalQualityFailureSuppresses?.includes('REDUNDANT_F9_REVALIDATION'));
  assert.equal(p?.resume?.fullPipelineRestartForbidden,true);
  assert.equal(p?.resume?.afterInternalQualityPass,'RESUME_AT_FIRST_INVALIDATED_DOWNSTREAM_GATE');
  assert.equal(p?.f9?.productQualityFailureAction,'AUTO_REQUEUE_CANONICAL_GAME_CODE_BUILD_UP_WITHOUT_OWNER_APPROVAL');
  assert.equal(p?.f9?.sourceMutationForbiddenSolelyForTransient429,true);
  assert.equal(p?.resume?.publicReleaseHardGateUnchanged,true);
  assert.equal(p?.resume?.securityAndSaveIntegrityGatesUnchanged,true);

  const projection=architecture.minimumNecessaryProcedurePolicyProjection?.qualityFirstBuildupShortCircuit;
  assert.equal(projection?.source,'company-learning/platform-release-roadmap.json#minimumNecessaryProcedurePolicy.qualityFirstBuildupShortCircuit');
  assert.equal(projection?.internalProductQualityFailurePreemptsExternalReleaseObservation,true);
  assert.equal(projection?.approvedScopeQualityRepairOwnerApprovalRequired,false);
  assert.equal(projection?.activeQualityFailureSuppressesExternalProbe,true);
  assert.equal(projection?.fullPipelineRestartForbidden,true);
  assert.equal(projection?.publicReleaseHardGateUnchanged,true);

  const evidence=logMap.qualityFirstBuildupShortCircuitEvidence;
  assert.equal(evidence?.source,'company-learning/platform-release-roadmap.json#minimumNecessaryProcedurePolicy.qualityFirstBuildupShortCircuit');
  assert.ok(evidence?.requiredMarkers?.includes('QUALITY_BUILDUP_AUTO_REQUEUE=YES|NO'));
  assert.equal(evidence?.transient429MustNotClaimGameSourceDefect,true);
});


test('central policy makes verified internal product quality failure preempt external release observation',()=>{
  const policy=roadmap.minimumNecessaryProcedurePolicy?.qualityFirstBuildupShortCircuit;
  assert.equal(policy?.status,'ACTIVE');
  assert.equal(policy?.automaticRouting?.ownerApprovalRequiredForApprovedScopeQualityRepair,false);
  assert.equal(policy?.automaticRouting?.canonicalRoute,'EXISTING_VIBE_PLANNER_AND_SOURCE_WORKER_ONLY');
  assert.equal(policy?.automaticRouting?.shadowPipelineForbidden,true);
  assert.equal(policy?.automaticRouting?.directResponsibleFunctionOrModuleRepairRequired,true);
  assert.equal(policy?.shortCircuit?.transient429MayNotPreemptActiveQualityBuildUp,true);
  assert.equal(policy?.shortCircuit?.externalObservationMayRunAgainOnlyAfterRelevantInternalQualityPass,true);
  assert.equal(policy?.shortCircuit?.validUnchangedPassingEvidenceMustBeReused,true);
  assert.equal(policy?.resume?.fullPipelineRestartForbidden,true);
  assert.equal(policy?.resume?.publicReleaseHardGateUnchanged,true);
  assert.equal(policy?.resume?.securityAndSaveIntegrityGatesUnchanged,true);
  assert.equal(policy?.f9?.productQualityFailureAction,'AUTO_REQUEUE_CANONICAL_GAME_CODE_BUILD_UP_WITHOUT_OWNER_APPROVAL');
  assert.equal(policy?.f9?.sourceMutationForbiddenSolelyForTransient429,true);

  const projection=architecture.minimumNecessaryProcedurePolicyProjection?.qualityFirstBuildupShortCircuit;
  assert.equal(projection?.source,'company-learning/platform-release-roadmap.json#minimumNecessaryProcedurePolicy.qualityFirstBuildupShortCircuit');
  assert.equal(projection?.internalProductQualityFailurePreemptsExternalReleaseObservation,true);
  assert.equal(projection?.approvedScopeQualityRepairOwnerApprovalRequired,false);
  assert.equal(projection?.transient429DoesNotCauseGameSourceRebuild,true);
  assert.equal(projection?.resumeAtFirstInvalidatedDownstreamGate,true);
  assert.equal(projection?.f9ProductQualityFailureReturnsToBuildUp,true);
  assert.equal(projection?.publicReleaseHardGateUnchanged,true);

  const logContract=logMap.qualityFirstBuildupShortCircuitEvidence;
  assert.equal(logContract?.source,'company-learning/platform-release-roadmap.json#minimumNecessaryProcedurePolicy.qualityFirstBuildupShortCircuit');
  assert.equal(logContract?.transient429MustNotClaimGameSourceDefect,true);
  assert.equal(logContract?.sourceMutationRequiredBeforeProductQualityRevalidation,true);
  assert.ok(logContract?.requiredMarkers?.includes('QUALITY_FIRST_BUILDUP_SHORT_CIRCUIT=ACTIVE'));
});

test('quality-first buildup short-circuit is centralized in policy and projected without weakening release gates',()=>{
  const policy=roadmap.minimumNecessaryProcedurePolicy?.qualityFirstBuildupShortCircuit||{};
  assert.equal(policy.status,'ACTIVE');
  assert.equal(policy.automaticRouting?.ownerApprovalRequiredForApprovedScopeQualityRepair,false);
  assert.equal(policy.automaticRouting?.canonicalRoute,'EXISTING_VIBE_PLANNER_AND_SOURCE_WORKER_ONLY');
  assert.equal(policy.automaticRouting?.requeueMode,'AUTOMATIC_UNLIMITED_CAUSAL_BUILD_UP');
  assert.equal(policy.shortCircuit?.transient429MayNotPreemptActiveQualityBuildUp,true);
  assert.equal(policy.shortCircuit?.externalObservationMayRunAgainOnlyAfterRelevantInternalQualityPass,true);
  assert.equal(policy.shortCircuit?.validUnchangedPassingEvidenceMustBeReused,true);
  assert.equal(policy.resume?.fullPipelineRestartForbidden,true);
  assert.equal(policy.resume?.publicReleaseHardGateUnchanged,true);
  assert.equal(policy.resume?.securityAndSaveIntegrityGatesUnchanged,true);
  assert.equal(policy.f9?.productQualityFailureAction,'AUTO_REQUEUE_CANONICAL_GAME_CODE_BUILD_UP_WITHOUT_OWNER_APPROVAL');
  assert.equal(policy.f9?.sourceMutationForbiddenSolelyForTransient429,true);

  const projection=architecture.minimumNecessaryProcedurePolicyProjection?.qualityFirstBuildupShortCircuit||{};
  assert.equal(projection.internalProductQualityFailurePreemptsExternalReleaseObservation,true);
  assert.equal(projection.approvedScopeQualityRepairOwnerApprovalRequired,false);
  assert.equal(projection.automaticCanonicalRoute,'VIBE_PLANNER_TO_VIBE_SOURCE_WORKER');
  assert.equal(projection.transient429DoesNotCauseGameSourceRebuild,true);
  assert.equal(projection.fullPipelineRestartForbidden,true);
  assert.equal(projection.publicReleaseHardGateUnchanged,true);
  assert.equal(projection.securityAndSaveIntegrityGatesUnchanged,true);

  const logContract=logMap.qualityFirstBuildupShortCircuitEvidence||{};
  assert.equal(logContract.transient429MustNotClaimGameSourceDefect,true);
  assert.equal(logContract.sourceMutationRequiredBeforeProductQualityRevalidation,true);
  assert.equal(logContract.publicReleaseHardGateEvidenceStillRequired,true);
});

test('asset development reuses GRAPHICS_PRODUCTION with a dedicated execution lane instead of creating a shadow pipeline',()=>{
  const asset=roadmap.assetProductionParallelContract;
  const parallel=asset.parallelism;
  const library=asset.companyGraphicsLibrary24h;
  const topology=architecture.assetProductionParallelism;
  assert.equal(parallel.assetDevelopmentExecutionLane,'ASSET_DEVELOPMENT');
  assert.equal(parallel.assetDevelopmentUsesExistingCanonicalQueue,true);
  assert.equal(parallel.assetDevelopmentUsesExistingContinuousCore,true);
  assert.equal(parallel.assetDevelopmentDedicatedRunner,true);
  assert.equal(parallel.assetDevelopmentRunnerLabel,'ubuntu-24.04-arm');
  assert.equal(parallel.assetDevelopmentSchedulerPlanRunner,'ubuntu-24.04-arm');
  assert.equal(parallel.assetDevelopmentReserveRunner,'ubuntu-slim');
  assert.equal(parallel.assetDevelopmentModelCacheRunner,'ubuntu-24.04-arm');
  assert.equal(parallel.assetDevelopmentArchitectureAwareCache,true);
  assert.equal(parallel.assetDevelopmentOllamaCacheKey,'vibe2-ollama-v5-${runner.os}-${runner.arch}-qwen3-1.7b');
  assert.equal(parallel.gamePrimaryRunnerLabel,'ubuntu-latest');
  assert.equal(parallel.assetDevelopmentPhysicalRunnerPoolSeparated,true);
  assert.deepEqual(parallel.assetDevelopmentOllamaArchitectures,['X64','ARM64']);
  assert.equal(parallel.assetDevelopmentRobloxGeneration.mode,'BOUNDED_FOCUSED_EXACT_ANCHOR');
  assert.equal(parallel.assetDevelopmentRobloxGeneration.maxAttempts,3);
  assert.equal(parallel.assetDevelopmentRobloxGeneration.focusedTimeoutMs,120000);
  assert.equal(parallel.assetDevelopmentRobloxGeneration.focusedMaxPredict,768);
  assert.equal(parallel.assetDevelopmentRobloxGeneration.gamePrimaryGenerationPolicyUnchanged,true);
  assert.equal(parallel.assetDevelopmentSpeculativeVariantsPerTask,1);
  assert.equal(parallel.assetDevelopmentSpeculativeVariantsSuppressed,true);
  assert.equal(parallel.assetDevelopmentDistinctTaskParallelismPreserved,true);
  assert.equal(parallel.assetDevelopmentLaneMax,63);
  assert.equal(parallel.assetDevelopmentLaneMaxAppliesToWorkflowCallDispatchAndRepositoryDispatch,true);
  assert.equal(parallel.assetDevelopmentFanInOptimisticRetryHardAttemptCap,false);
  assert.equal(parallel.assetDevelopmentFanInOptimisticRetryMode,'RETRY_UNTIL_SUCCESS_WITH_LATEST_CONTROL_STATE');
  assert.equal(parallel.assetDevelopmentFanInRetryBackoffMaxSeconds,10);
  assert.equal(parallel.assetDevelopmentFanInForcePushForbidden,true);
  assert.equal(parallel.assetDevelopmentFanInReapplyLatestControlStateEveryRetry,true);
  assert.equal(parallel.assetDevelopmentSourceWorkerBuildUpDirectiveSyntaxGuard,true);
  assert.equal(parallel.newTopLevelAssetPipelineCreated,false);
  assert.equal(parallel.newWorkerAuthorityCreated,false);
  assert.equal(parallel.queueMutationAuthorityCreated,false);
  assert.equal(library.graphicsProductionRoot,'GRAPHICS_PRODUCTION');
  assert.equal(library.executionLane,'ASSET_DEVELOPMENT');
  assert.equal(library.dedicatedRunner,true);
  assert.equal(library.reusableProductionTarget.motion.verifiedReusableClipTarget,300);
  assert.deepEqual(library.fullAssetDevelopmentScope,[
    'CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'
  ]);
  assert.equal(topology.dedicatedExecution.lane,'ASSET_DEVELOPMENT');
  assert.equal(topology.dedicatedExecution.runnerLabel,'ubuntu-24.04-arm');
  assert.equal(topology.dedicatedExecution.schedulerPlanRunner,'ubuntu-24.04-arm');
  assert.equal(topology.dedicatedExecution.reserveRunner,'ubuntu-24.04-arm');
  assert.equal(topology.dedicatedExecution.modelCacheRunner,'ubuntu-24.04-arm');
  assert.equal(topology.dedicatedExecution.architectureAwareCache,true);
  assert.equal(topology.dedicatedExecution.gamePrimaryRunnerLabel,'ubuntu-latest');
  assert.equal(topology.dedicatedExecution.physicalRunnerPoolSeparated,true);
  assert.equal(topology.dedicatedExecution.robloxGeneration.maxAttempts,3);
  assert.equal(topology.dedicatedExecution.speculativeVariantsPerTask,1);
  assert.equal(topology.dedicatedExecution.speculativeVariantsSuppressed,true);
  assert.equal(topology.dedicatedExecution.distinctTaskParallelismPreserved,true);
  assert.equal(topology.dedicatedExecution.laneMax,63);
  assert.equal(topology.dedicatedExecution.laneMaxAppliesToWorkflowCallDispatchAndRepositoryDispatch,true);
  assert.equal(topology.dedicatedExecution.fanInOptimisticRetryHardAttemptCap,false);
  assert.equal(topology.dedicatedExecution.fanInForcePushForbidden,true);
  assert.equal(topology.dedicatedExecution.newTopLevelPipeline,false);
  assert.equal(logMap.assetDevelopmentDedicatedLaneEvidence.executionLane,'ASSET_DEVELOPMENT');
  assert.equal(logMap.assetDevelopmentDedicatedLaneEvidence.runnerLabel,'ubuntu-24.04-arm');
  assert.equal(logMap.assetDevelopmentDedicatedLaneEvidence.physicalRunnerPoolSeparated,true);
  assert.match(vibe24hRunner,/asset_development:[\s\S]*execution_lane: asset-development[\s\S]*lane_max: '63'/);
  assert.match(vibe24hRunner,/VIBE2_ASSET_DEVELOPMENT_QUEUED=/);
  assert.match(vibe24hRunner,/VIBE2_ASSET_DEVELOPMENT_ACTIVE=/);
  assert.match(vibe24hRunner,/game_study:[\s\S]*needs: \[plan, continuous, asset_development, learning_idle\]/);
  assert.match(vibe24hRunner,/asset_development_queued == '0'[\s\S]*asset_development_active == '0'/);
  assert.match(vibeContinuousCore,/\n          - asset-development/);
  assert.match(vibeContinuousCore,/asset-development' && 'ubuntu-24\.04-arm' \|\| 'ubuntu-latest'/);
  assert.match(vibeContinuousCore,/assetLane\?1:requestedVariantCount/);
  assert.match(vibeContinuousCore,/VIBE2_ASSET_SPECULATIVE_VARIANTS_SUPPRESSED=/);
  assert.match(vibeContinuousCore,/VIBE2_ASSET_SPECULATIVE_WORKERS_AVOIDED=/);
  assert.match(vibeContinuousCore,/github\.event\.client_payload\.execution_lane \|\| 'game-primary'\) == 'asset-development' && '63'/);
  assert.match(vibeContinuousCore,/VIBE2_FAN_IN_OPTIMISTIC_RETRY_UNBOUNDED=YES/);
  assert.match(vibeContinuousCore,/VIBE2_FAN_IN_REGRESSION_OPTIMISTIC_RETRY_UNBOUNDED=YES/);
  assert.doesNotMatch(vibeContinuousCore,/for attempt in 1 2 3 4 5; do/);
  assert.doesNotMatch(vibeContinuousCore,/git push --force|git push -f/);
  assert.match(vibeSourceWorker,/contentRule=Stay inside the existing BUILD_UP responsibility\.[\s\S]*?',\n\s+\`gameplay=/);
  const laneIsolation=roadmap.changeRecord.reusableCoreLaneConcurrencyIsolation20260927;
  assert.equal(laneIsolation.fix.workflowCallLaneScope,'RUN_ID_PLUS_EXECUTION_LANE');
  assert.equal(laneIsolation.fix.assetDevelopmentPreserved,true);
  assert.equal(laneIsolation.cancelInProgressRemainsFalse,true);
  assert.equal(architecture.neuralWorkGraphTopology.currentWaveExecution.mainPushGamePrimaryWake.workflowCallLaneRunsRunScoped,true);
  assert.equal(logMap.mainPushWakeFreshnessEvidence.workflowCallInheritedPushEventMustRemainRunScoped,true);
  assert.equal(logMap.reusableCoreLaneConcurrencyEvidence.requiresExplicitLaneEmptyForMainPushSingleton,true);
  assert.match(vibeContinuousCore,/inputs\.execution_lane == '' && 'vibe2-main-push-game-primary-wake'/);
  assert.match(vibeContinuousCore,/format\('vibe2-continuous-\{0\}-\{1\}', github\.run_id, inputs\.execution_lane \|\| github\.event\.client_payload\.execution_lane \|\| 'game-primary'\)/);
});

test('external AI loss never stops independent Vibe development and resumes from the same checkpoint',()=>{
  const continuity=roadmap.developmentLifecycleMachine.modelQuotaContinuity.providerFailureSubstitution;
  const authority=roadmap.developmentLifecycleMachine.gameDevelopmentAuthority.externalAiContinuity;
  assert.equal(continuity.version,2);
  assert.ok(continuity.externalAiDisconnectSignals.includes('CONNECTION_LOST'));
  assert.ok(continuity.externalAiDisconnectSignals.includes('PROVIDER_UNAVAILABLE'));
  assert.equal(continuity.externalAiUnavailableAction,'CONTINUE_SAME_CHECKPOINT_WITH_VIBE2_VIBE3_ONLY');
  assert.equal(continuity.externalAiAvailabilityMayBlockVibeDevelopment,false);
  assert.equal(continuity.externalAiReconnectAction,'OPTIONAL_REJOIN_FUTURE_ELIGIBLE_WORK_WITHOUT_REPLAYING_COMPLETED_VIBE_WORK');
  assert.equal(authority.collaborationOptionalForContinuation,true);
  assert.equal(authority.unavailableAction,'VIBE2_VIBE3_SOLO_CONTINUE_SAME_CHECKPOINT');
  assert.equal(authority.independentVibeWorkWaitStateForbidden,true);
  assert.equal(authority.preserveCheckpoint,true);
  assert.equal(authority.replayCompletedVibeWorkOnReconnect,false);
  assert.equal(architecture.externalAiRules.externalAiUnavailableAction,'VIBE2_VIBE3_SOLO_CONTINUE_SAME_CHECKPOINT');
  assert.equal(architecture.externalAiRules.externalAiAvailabilityMayBlockIndependentVibeWork,false);
  assert.equal(architecture.externalAiRules.externalAiReconnectReplaysCompletedVibeWork,false);
});

test('adaptive graphics replacement count is grounded in touched source evidence',()=>{
  const pass=roadmap.assetProductionParallelContract.graphicsPassContract;
  assert.equal(pass.adaptiveReplacementCountMustBeGroundedPerSourceBinding,true);
  assert.equal(pass.perReplacementSourceEvidenceRequired,true);
  assert.equal(pass.actualReplacementCountMustEqualGroundedEvidenceCount,true);
  assert.equal(pass.replacementEvidenceMustReferenceTouchedSourcePath,true);
  assert.equal(pass.replacementEvidenceSnippetMustExistInChangedSource,true);
  assert.equal(pass.duplicateReplacementEvidenceCannotInflateCount,true);
  assert.equal(pass.selfReportedCountWithoutGroundedSourceEvidenceCannotPass,true);

  const completion=autonomousExpansionPolicy.presentationEvolution.completion;
  assert.equal(completion.perReplacementSourceEvidenceRequired,true);
  assert.equal(completion.actualReplacementCountMustEqualGroundedEvidenceCount,true);
  assert.equal(completion.replacementEvidenceMustReferenceTouchedSourcePath,true);
  assert.equal(completion.replacementEvidenceSnippetMustExistInChangedSource,true);
  assert.equal(completion.duplicateReplacementEvidenceCannotInflateCount,true);
  assert.equal(completion.selfReportedCountWithoutGroundedSourceEvidenceCannotPass,true);

  const change=roadmap.changeRecord.graphicsReplacementSourceGrounding20260927;
  assert.deepEqual(change.activePlatforms,['WEB','ROBLOX','UNITY']);
  assert.deepEqual(change.pausedPlatforms,['FORTNITE_UEFN']);
  assert.deepEqual(change.adaptiveReplacementRange,[1,60]);
  assert.equal(change.actualReplacementCountMustEqualGroundedEvidenceCount,true);
  assert.equal(change.eachReplacementEvidenceMustReferenceTouchedSourcePath,true);
  assert.equal(change.eachReplacementEvidenceSnippetMustExistInChangedSource,true);
  assert.equal(change.duplicateEvidenceCannotInflateCount,true);
  assert.equal(change.selectionMarkerOrSelfReportedCountOnlyCannotPass,true);
  assert.equal(change.newWorkflowOrStageCreated,false);
});

test('menu experience diversity stays inside existing Vibe presentation buildup',()=>{
  const menu=autonomousExpansionPolicy.presentationEvolution.menuExperienceDiversity;
  assert.equal(menu.status,'ACTIVE');
  assert.equal(menu.executionBoundary,'EXISTING_MENU_AND_UI_BUILD_UP_ONLY');
  assert.deepEqual(menu.runtimePlatforms,['WEB','ROBLOX','UNITY']);
  assert.deepEqual(menu.pausedPlatforms,['FORTNITE_UEFN']);
  assert.equal(menu.pausedPlatformStatus.FORTNITE_UEFN,'개발보류');
  assert.deepEqual(menu.surfaces,['MAIN_MENU','INVENTORY_UI','SHOP_UI','CRAFT_UI','QUEST_UI','SETTINGS_UI','RESULT_UI']);
  assert.equal(menu.genericOneTemplateForAllGamesForbidden,true);
  assert.equal(menu.colorOrBackgroundOnlyVariationDoesNotCount,true);
  assert.equal(menu.gameAndGenreContextRequired,true);
  assert.equal(menu.chooseAdaptOrHybridizePatternFamilies,true);
  assert.equal(menu.projectSpecificPatternAllowed,true);
  assert.equal(menu.unityWebIsUnityBuildTargetNotIndependentPlatform,true);
  assert.equal(menu.plannerActiveBindingProfileRequired,true);
  assert.equal(menu.unityWebMustNotUseGenericWebBindingProfile,true);
  assert.equal(menu.implementationSeparation.UNITY_APP_AND_WEBGL.requiredUnityWebPlannerProfile,'UNITY_WEBGL_SAME_CANONICAL_UNITY_PROJECT_AND_UI_SOURCE');
  assert.equal(menu.implementationSeparation.FORTNITE_UEFN.runtimeImplementation,'PAUSED_OWNER_HOLD_NO_BUILD_UP');
  assert.equal(menu.implementationSeparation.FORTNITE_UEFN.resumeRuntimeImplementation,'UEFN_NATIVE_UI_SYSTEM');
  assert.equal(menu.implementationSeparation.FORTNITE_UEFN.ownerExplicitResumeRequired,true);
  assert.equal(menu.implementationSeparation.ROBLOX.runtimeImplementation,'ROBLOX_NATIVE_EXISTING_UI_SYSTEM');
  assert.equal(menu.implementationSeparation.UNITY_APP_AND_WEBGL.runtimeImplementation,'SAME_CANONICAL_UNITY_PROJECT_AND_UI_SOURCE');
  assert.equal(menu.implementationSeparation.UNITY_APP_AND_WEBGL.canonicalSourceRoot,'unity-games/<gameId>/');
  assert.equal(menu.implementationSeparation.UNITY_APP_AND_WEBGL.separateHtmlCssJsGameplayUiForbidden,true);
  assert.equal(menu.implementationSeparation.GENERIC_WEB_OR_LEGACY_VALIDATION.cannotSubstituteForUnityWebglGameplayUi,true);
  assert.equal(menu.mobileFirst.touchTargetMinimumPx,44);
  assert.equal(menu.preservation.inventMissingGameplaySystemOnlyToFillMenuForbidden,true);
  assert.ok(menu.patternFamilies.MAIN_MENU.includes('CINEMATIC_HERO'));
  assert.ok(menu.patternFamilies.INVENTORY_UI.includes('QUICKSLOT_FIRST'));
  assert.ok(menu.patternFamilies.SHOP_UI.includes('MERCHANT_CONTEXT'));
  assert.ok(menu.patternFamilies.CRAFT_UI.includes('STATION_CONTEXT'));
  assert.ok(menu.patternFamilies.QUEST_UI.includes('JOURNAL_CHAIN'));
  assert.ok(menu.patternFamilies.SETTINGS_UI.includes('ACCESSIBILITY_FIRST'));
  assert.ok(menu.patternFamilies.RESULT_UI.includes('NEXT_OBJECTIVE'));
  const topology=architecture.menuExperienceDiversityTopology;
  assert.equal(topology.executionModel,'RESPONSIBILITY_INSIDE_EXISTING_PRESENTATION_BUILD_UP_NOT_A_NEW_STAGE');
  assert.deepEqual(topology.platforms,['WEB','ROBLOX','UNITY']);
  assert.deepEqual(topology.pausedPlatforms,['FORTNITE_UEFN']);
  assert.equal(topology.pausedPlatformStatus.FORTNITE_UEFN,'개발보류');
  assert.equal(topology.genericOneTemplateForAllGamesForbidden,true);
  assert.equal(topology.colorOrBackgroundOnlyVariationDoesNotCount,true);
  assert.equal(topology.unityWebIdentity,'UNITY_WEBGL_BUILD_OF_SAME_CANONICAL_UNITY_PROJECT');
  assert.equal(topology.plannerActiveBindingProfileRequired,true);
  assert.equal(topology.unityWebRequiredActiveBindingProfile,'UNITY_WEBGL_SAME_CANONICAL_UNITY_PROJECT_AND_UI_SOURCE');
  assert.equal(topology.unityWebGenericWebBindingProfileForbidden,true);
  assert.equal(topology.platformBinding.FORTNITE_UEFN,'PAUSED_OWNER_HOLD_NO_BUILD_UP');
  assert.equal(topology.resumePlatformBinding.FORTNITE_UEFN,'SEPARATE_UEFN_NATIVE_UI_RUNTIME');
  assert.equal(topology.platformBinding.ROBLOX,'SEPARATE_ROBLOX_NATIVE_UI_RUNTIME');
  assert.equal(topology.platformBinding.UNITY_APP_AND_WEBGL,'SAME_CANONICAL_UNITY_PROJECT_AND_UI_SOURCE');
  assert.equal(topology.unityWebSeparateHtmlCssJsGameplayUiForbidden,true);
  assert.equal(topology.unityWebCanonicalSourceRoot,'unity-games/<gameId>/');
  const unityWebMenu=roadmap.directNativeDualPlatformDevelopment.unityWebDevelopmentLane.menuUiSourceIdentity;
  assert.equal(unityWebMenu.sameCanonicalUnityProjectAsUnityAppRequired,true);
  assert.equal(unityWebMenu.sameUiSourceAsUnityAppByDefault,true);
  assert.equal(unityWebMenu.webBuildTarget,'UNITY_WEBGL');
  assert.equal(unityWebMenu.separateHtmlCssJsGameplayUiForbidden,true);
  assert.equal(unityWebMenu.genericLegacyWebUiCannotSatisfyUnityWebRequirement,true);
  assert.equal(unityWebMenu.plannerActiveBindingProfileRequired,true);
  assert.equal(unityWebMenu.requiredPlannerProfile,'UNITY_WEBGL_SAME_CANONICAL_UNITY_PROJECT_AND_UI_SOURCE');
  const platformAssetSeparation=roadmap.assetProductionParallelContract.platformAssetSeparation;
  assert.equal(platformAssetSeparation.unityWebMenuRuntimeMustUseSameCanonicalUnityProjectAsUnity,true);
  assert.equal(platformAssetSeparation.unityAndUnityWebShareUiSourceByDefault,true);
  assert.equal(platformAssetSeparation.unityWebSeparateHtmlCssJsGameplayUiForbidden,true);
  assert.equal(platformAssetSeparation.robloxMenuRuntimeMustBeRobloxNative,true);
  assert.equal(topology.newWorkflow,false);
  assert.equal(topology.newStage,false);
  assert.match(vibeAutoPlanner,/MENU_EXPERIENCE_SURFACES/);
  assert.match(vibeAutoPlanner,/menu-experience-diversity:v1/);
  assert.match(vibeAutoPlanner,/LOBBY_OR_HUB/);
  assert.match(vibeAutoPlanner,/LOADING_TRANSITION/);
  assert.match(vibeAutoPlanner,/FIRST_PLAY_GUIDANCE/);
  assert.match(vibeAutoPlanner,/SAME_CANONICAL_UNITY_PROJECT_AND_UI_SOURCE/);
  assert.match(vibeAutoPlanner,/menuPlatformBindingProfile/);
  assert.match(vibeAutoPlanner,/UNITY_WEBGL_SAME_CANONICAL_UNITY_PROJECT_AND_UI_SOURCE/);
  assert.match(vibeAutoPlanner,/Unity Web 전용 HTML\/CSS\/JS gameplay UI를 따로 만들어 대체하지 않는다/);
});


test('BUILD_UP grounding stays connected from source proof through exact target runtime identity',()=>{
  const graphics=roadmap.assetProductionParallelContract.graphicsPassContract;
  assert.equal(graphics.groundedEvidenceMustPersistThroughCandidateManifest,true);
  assert.equal(graphics.incrementalQaMustRevalidateGroundedEvidenceAgainstCandidateSource,true);
  assert.equal(graphics.fanInMustRequireGroundedGraphicsEvidence,true);
  assert.equal(graphics.targetRuntimeEvidenceMustBindExactBuildUpSourceIdentity,true);

  const closure=roadmap.assetProductionParallelContract.buildUpRuntimeClosure;
  assert.equal(closure.status,'ACTIVE');
  assert.deepEqual(closure.activePlatforms,['WEB','ROBLOX','UNITY']);
  assert.deepEqual(closure.pausedPlatforms,['FORTNITE_UEFN']);
  assert.equal(closure.sourceIdentity,'SOURCE_ROOT_TREE_SHA');
  assert.deepEqual(closure.graphicsGroundingChain,[
    'SOURCE_WORKER_GROUNDED_REPLACEMENT_VALIDATION',
    'CANDIDATE_MANIFEST_PERSISTENCE',
    'INCREMENTAL_QA_REVALIDATION',
    'FAN_IN_GROUNDED_EVIDENCE_GATE',
    'TARGET_RUNTIME_EXACT_SOURCE_BINDING'
  ]);
  assert.equal(closure.roblox.waitingTaskMustRecordPromotedSourceTreeSha,true);
  assert.equal(closure.roblox.f9SettlementMustMatchWaitingSourceTreeSha,true);
  assert.equal(closure.roblox.sameGameDifferentSourceMayNotSettle,true);
  assert.equal(closure.roblox.runtimePassWithoutExactBuildUpSourceIdentityCannotSettleTask,true);
  assert.equal(closure.web.finalRuntimeAuthority,'WEB_CANDIDATE_BROWSER_RUNTIME_PLUS_CLOUDFLARE_DEPLOYMENT');
  assert.equal(closure.web.candidateRuntimeBeforeAfterRequired,true);
  assert.equal(closure.web.cloudflarePagesDeploymentCheckRequired,true);
  assert.equal(closure.web.reviewedMainPromotionRequired,true);
  assert.equal(closure.web.promotedSourceTreeShaRequired,true);
  assert.equal(closure.web.exactPromotedSourceRequiredForSettlement,true);
  assert.equal(closure.web.anotherPlatformRuntimeMayNotSubstitute,true);
  assert.equal(closure.web.robloxRuntimeDispatchForbidden,true);
  assert.equal(closure.newWorkflowOrShadowPipelineForbidden,true);

  const completion=autonomousExpansionPolicy.presentationEvolution.completion;
  assert.equal(completion.groundedEvidenceMustPersistThroughCandidateManifest,true);
  assert.equal(completion.incrementalQaMustRevalidateGroundedEvidenceAgainstCandidateSource,true);
  assert.equal(completion.fanInMustRequireGroundedGraphicsEvidence,true);
  assert.equal(completion.targetRuntimeEvidenceMustBindExactBuildUpSourceIdentity,true);
  assert.equal(completion.robloxF9SettlementRequiresExactPromotedSourceTree,true);

  const projected=autonomousExpansionPolicy.buildUpRuntimeClosure;
  assert.deepEqual(projected.activePlatforms,['WEB','ROBLOX','UNITY']);
  assert.deepEqual(projected.pausedPlatforms,['FORTNITE_UEFN']);
  assert.equal(projected.sourceIdentity,'SOURCE_ROOT_TREE_SHA');
  assert.equal(projected.robloxSameGameDifferentSourceMayNotSettle,true);
  assert.equal(projected.web.candidateRuntimeBeforeAfterRequired,true);
  assert.equal(projected.web.releaseDeploymentTarget,'CLOUDFLARE_PAGES');
  assert.equal(projected.web.releaseDeploymentPreviewMustPass,true);
  assert.equal(projected.web.promotedSourceTreeShaRequired,true);
  assert.equal(projected.web.finalSettlementRequiresExactPromotedSourceTree,true);
  assert.equal(projected.web.crossPlatformRuntimeDispatchForbidden,true);
  assert.equal(projected.web.robloxRuntimeMayNotSubstituteForWebRuntime,true);
  assert.equal(projected.noNewWorkflowOrShadowPipeline,true);

  const topology=architecture.buildUpRuntimeGroundingTopology;
  assert.equal(topology.executionModel,'EXISTING_BUILD_UP_FLOW_NO_NEW_STAGE_OR_SHADOW_PIPELINE');
  assert.deepEqual(topology.activePlatforms,['WEB','ROBLOX','UNITY']);
  assert.deepEqual(topology.pausedPlatforms,['FORTNITE_UEFN']);
  assert.equal(topology.sourceIdentity,'SOURCE_ROOT_TREE_SHA');
  assert.equal(topology.exactSourceRules.sameGameIdAloneInsufficient,true);
  assert.equal(topology.exactSourceRules.promotedSourceTreeMustMatchRuntimeSourceTree,true);
  assert.equal(topology.exactSourceRules.staleOrDifferentBuildUpGenerationCannotSettle,true);
  assert.deepEqual(topology.webRuntimePath,[
    'VIBE2_SOURCE_WORKER_GROUNDED_VALIDATION',
    'CANDIDATE_BROWSER_RUNTIME_BEFORE_AFTER',
    'VIBE2_FAN_IN_GROUNDED_AND_RUNTIME_VISUAL_GATE',
    'WEB_STATIC_AND_SAVE_COMPATIBILITY_QA',
    'CLOUDFLARE_PAGES_RELEASE_COMMIT_PREVIEW',
    'REVIEWED_MAIN_PROMOTION',
    'PROMOTED_SOURCE_ROOT_TREE_SHA_RECORDED',
    'VIBE2_WEB_TASK_SETTLEMENT_ON_EXACT_PROMOTED_SOURCE'
  ]);
  assert.equal(topology.webExactSourceRules.candidateRuntimeBeforeAfterRequired,true);
  assert.equal(topology.webExactSourceRules.cloudflarePagesPreviewRequired,true);
  assert.equal(topology.webExactSourceRules.promotedSourceTreeMustMatchReviewedCandidateSource,true);
  assert.equal(topology.webExactSourceRules.robloxRuntimeDispatchForbidden,true);
  assert.equal(topology.webExactSourceRules.anotherPlatformRuntimeMayNotSubstitute,true);
  assert.equal(topology.fortniteUefnOwnerHoldRespected,true);

  const change=roadmap.changeRecord.buildUpEndToEndGrounding20260928;
  assert.equal(change.sameGameStaleRuntimeProofMayNotPassNewerBuildUp,true);
  assert.equal(change.noNewWorkflowOrStage,true);
  assert.equal(change.gameplaySemanticsUnchanged,true);
  const webChange=roadmap.changeRecord.buildUpWebRuntimeClosure20260928;
  assert.equal(webChange.activePlatform,'WEB');
  assert.equal(webChange.candidateRuntimeBeforeAfterRequired,true);
  assert.equal(webChange.cloudflarePagesDeploymentPreviewRequired,true);
  assert.equal(webChange.promotedSourceTreeShaRequired,true);
  assert.equal(webChange.finalSettlementRequiresExactPromotedSourceTree,true);
  assert.equal(webChange.robloxRuntimeDispatchFromWebReleaseForbidden,true);
  assert.equal(webChange.noNewWorkflowOrStage,true);
  assert.equal(webChange.gameplaySemanticsUnchanged,true);
});

test('Roblox development policy keeps only code-static QA core gates and optional Studio diagnostics',()=>{
  const verify=roadmap.roblox.developmentVerification;
  assert.equal(verify.buildUpRequired,true);
  assert.deepEqual(verify.postBuildUpRequired,['CODE_QA','STATIC_QA']);
  assert.equal(verify.studio,'OPTIONAL_DIAGNOSTIC');
  assert.equal(verify.studioBlocksDevelopment,false);
  assert.equal(verify.studioBlocksF9,false);
  assert.equal(verify.studioBlocksDeployment,false);

  const studio=roadmap.roblox.studioExecution;
  assert.equal(studio.required,false);
  assert.equal(studio.optionalDiagnostic,true);
  assert.equal(studio.deploymentGate,false);
  assert.equal(studio.f9Gate,false);
  assert.equal(studio.requiredForInternalRelease,false);
  assert.equal(studio.postBuildUpVerificationLevel,'CODE_AND_STATIC_QA');
  assert.equal(Object.hasOwn(studio,'actualPlayQualityContract'),false);
  assert.equal(Object.hasOwn(studio,'runnerHost'),false);

  const policy=roadmap.developmentLifecycleMachine.validationEfficiencyOptimization;
  assert.deepEqual(policy.floors,['F0','F1','F2','F3','F4','F5','F6','F7','F8','F9']);
  assert.equal(policy.f10Forbidden,true);
  assert.equal(policy.impactScopedValidation,true);
  assert.equal(policy.duplicateValidationForbidden,true);
  assert.equal(policy.roblox.studioValidationRequired,false);
  assert.equal(policy.roblox.studioDiagnosticOptional,true);
  assert.equal(policy.f9.startsNewRuntimeSession,false);
  assert.equal(policy.f9.terminatesEvolution,false);

  const topology=architecture.validationEfficiencyTopology;
  assert.equal(topology.roblox.verification,'CODE_AND_STATIC_QA');
  assert.equal(topology.roblox.studio,'OPTIONAL_DIAGNOSTIC');
  assert.equal(topology.roblox.studioRequired,false);
  assert.equal(topology.f9.terminalState,false);

  const securityPolicy=security.minimumNecessaryDevelopmentSecurity;
  assert.equal(securityPolicy.evidenceReuse.fullRescanEveryFloor,false);
  assert.equal(securityPolicy.evidenceReuse.newSecurityPipelineForbidden,true);
});

test('central document automatically retains only current references and archives removed policy',()=>{
  const file='company-learning/platform-release-roadmap.json';
  const current=JSON.parse(fs.readFileSync(file,'utf8'));
  const policy=current.centralDocumentRetention;
  assert.equal(policy.version,4);
  assert.equal(policy.mode,'AUTO_CURRENT_USE_ONLY');
  assert.equal(policy.autoPruneEnabled,true);
  assert.equal(policy.keepOnlyCurrentUseAndPinned,true);
  assert.equal(policy.autoArchiveUnreferencedChangeRecords,true);
  assert.equal(policy.autoArchiveHistoricalShapedNestedState,true);
  assert.equal(policy.manualHistoricalSelectorMaintenanceRequired,false);
  assert.deepEqual(policy.historicalArchiveSelectors,[]);
  assert.deepEqual(policy.currentUseReferenceScanRoots,['qa','tools','.github','assets']);
  assert.equal(policy.currentUseReferenceScanner,'tools/company-records-governance.mjs#findCurrentCentralPolicyReferences');
  assert.equal(policy.autoPruneCommand,'node tools/company-records-governance.mjs --central-auto-prune');
  assert.equal(policy.autoPruneWorkflow,'.github/workflows/company-records-governance.yml#central-current-use-prune');
  assert.equal(policy.archiveRecordRequiredBeforeDeletion,true);
  assert.equal(policy.referencedChangeRecordKeysAutoProtected,true);
  assert.ok(fs.statSync(file).size<=policy.maxUtf8Bytes);
  assert.ok(fs.existsSync(path.join(repoRoot,policy.latestArchiveRecord)));
});

test('automatic current-use pruning is isolated and deterministically security-verified',()=>{
  assert.match(recordsWorkflow,/central-current-use-prune:/);
  assert.match(recordsWorkflow,/node tools\/company-records-governance\.mjs --central-auto-prune/);
  assert.match(recordsWorkflow,/records\/central-current-use-\$\{GITHUB_RUN_ID\}/);
  assert.match(recordsWorkflow,/gh pr merge/);
  assert.match(securityWorkflow,/CENTRAL_AUTO_PRUNE_REFERENCED_PATHS_PROTECTED=PASS/);
  assert.match(securityWorkflow,/CENTRAL_AUTO_PRUNE_ARCHIVE_FIDELITY=PASS/);
  assert.match(securityWorkflow,/CENTRAL_AUTO_PRUNE_ONLY_ARCHIVAL_MUTATION=PASS/);
  assert.match(securityWorkflow,/AUTO_PRUNE_NON_ARCHIVAL_POLICY_MUTATION/);
  assert.match(securityWorkflow,/steps\.auto_prune\.outputs\.pass != 'YES'/);
  assert.match(securityWorkflow,/PRIMARY_AI_DIRECT_REVIEW=PASS/);
  assert.match(securityWorkflow,/ALLOW_VERIFIED_CURRENT_USE_AUTO_PRUNE/);
});

test('obsolete Roblox Studio and recovery detail is not duplicated in central policy',()=>{
  assert.equal(Object.hasOwn(roadmap.roblox.studioExecution,'actualPlayQualityContract'),false);
  assert.equal(Object.hasOwn(roadmap.roblox.studioExecution,'runnerHost'),false);
  assert.equal(Object.hasOwn(architecture,'robloxRuntimeFoundationRunnerIsolation'),false);
  assert.equal(Object.hasOwn(architecture,'robloxPlannerDuplicateContractQaRemoval'),false);
  assert.equal(Object.hasOwn(architecture,'robloxOpenCloudThrottleRecovery'),false);
  assert.equal(Object.hasOwn(logMap,'robloxOpenCloudThrottleRecoveryEvidence'),false);
  assert.equal(Object.hasOwn(security,'robloxVerifiedCyclePublicationSecurity'),false);
});



test('current Vibe operating system is fixed while detail-chain optimization remains open',()=>{
  const fixed=roadmap.fixedAutonomousDevelopmentOperatingContract;
  assert.equal(fixed.version,1);
  assert.equal(fixed.status,'FIXED_CURRENT_SYSTEM');
  assert.equal(fixed.systemStructure,'EXISTING_CANONICAL_PIPELINE_ONLY');
  assert.deepEqual(fixed.normalOperatingLoop,['BUILD_UP','F0','PRIVATE_RUNTIME_CANDIDATE_DEPLOY','F1_TO_F8_RUNTIME_AND_QA','F9','RELEASE_CLASSIFICATION','IMMEDIATE_NEXT_BUILD_UP']);
  assert.equal(fixed.sequenceMeaningUsesFinalDevelopmentLockV2,true);
  assert.equal(fixed.perpetualPerGameCycle,true);
  assert.equal(fixed.vibeOwnsNormalCycleOperation,true);
  assert.equal(fixed.ownerPresenceRequiredForNormalCycle,false);
  assert.equal(fixed.chatgptPresenceRequiredForNormalCycle,false);
  assert.equal(fixed.normalCycleManualApprovalRequired,false);
  const externalAiExecution=roadmap.externalAiVibeFullProcessCollaboration.execution;
  assert.equal(externalAiExecution.externalAiRequiredForProduction,false);
  assert.equal(externalAiExecution.externalAiDefaultEnabled,false);
  assert.equal(externalAiExecution.localAuthoringContinuesWithoutExternalAi,true);
  assert.equal(roadmap.developmentLifecycleMachine.modelQuotaContinuity.designProviderPolicy,'VIBE_LOCAL_WITH_OPTIONAL_EXTERNAL_AI');
  assert.equal(roadmap.developmentLifecycleMachine.modelQuotaContinuity.providerFailureSubstitution.externalAiAvailabilityMayBlockVibeDevelopment,false);
  assert.equal(fixed.ownerRoleDuringNormalOperation,'OCCASIONAL_DEVELOPMENT_FEEDBACK');
  assert.equal(fixed.feedbackChangeReturnsToExistingCycle,true);
  assert.equal(fixed.macroSystemStructureChangeInNormalDevelopment,false);
  assert.equal(fixed.futureSystemWorkScope,'DETAIL_CHAIN_OPTIMIZATION_ONLY');
  assert.equal(fixed.distinctGamesRemainParallel,true);
  assert.equal(fixed.sameGameIndependentWorkParallelWhenSafe,true);
  assert.equal(fixed.failureIsolation,'GAME_AND_STAGE_LOCAL_REPAIR_RETRY');
  const causalGrammar=roadmap.continuousGameplaySystemEvolutionContract.gameIdentityConceptContract.novelCausalGameGrammar;
  const finalCausalFormula='MAIN × A × B × C + @ = EMERGENT_COMPOSITE_GENRE';
  assert.equal(causalGrammar.canonicalFormula,finalCausalFormula);
  assert.deepEqual(causalGrammar.generalizedSystemFusion.onlyMajorAxes,['A','B']);
  assert.equal(causalGrammar.generalizedSystemFusion.C.genreCount,2);
  assert.equal(causalGrammar.generalizedSystemFusion.C.genreRoles[0],'PRIMARY');
  assert.equal(causalGrammar.generalizedSystemFusion.C.genreRoles[1],'SECONDARY');
  assert.equal(causalGrammar.generalizedSystemFusion.A.sourceMaterialAndDomainRequired,true);
  assert.equal(causalGrammar.delveLayer.isFourthSystem,false);
  assert.equal(causalGrammar.emergentGenre.finalCompositeGenreIdentity,true);
  assert.equal(causalGrammar.existingGameApplication.reconstructFromCurrentDesignAndSourceFirst,true);
  assert.equal(causalGrammar.existingGameApplication.noIdentityRewriteRequired,true);
  assert.equal(logMap.gameSpecificBuildUpDirectiveEvidenceContract.gameIdentityConceptEvidence.causalGameGrammarEvidence.formula,finalCausalFormula);
  assert.equal(logMap.gameSpecificBuildUpDirectiveEvidenceContract.gameIdentityConceptEvidence.causalGameGrammarEvidence.primarySecondaryGenreCausalEffectRequired,true);
  assert.equal(architecture.continuousGameplaySystemEvolutionTopology.gameIdentityConcept.causalGrammarFlow.formula,finalCausalFormula);
  assert.equal(security.gameSpecificBuildUpDirectiveSecurity.gameIdentityConceptProtections.causalGameGrammar.formula,finalCausalFormula);
  assert.equal(fixed.autonomousBottleneckManagement.required,true);
  assert.equal(fixed.repeatDevelopmentConcurrency.fixedSlots,128);
  assert.equal(fixed.repeatDevelopmentConcurrency.automaticRefill,true);
  assert.equal(fixed.repeatDevelopmentConcurrency.eachVerifiedCycleReturnsToNextBuildUp,true);
  assert.equal(fixed.repeatDevelopmentConcurrency.runnerPressureMayReduceLogicalSlots,false);
  assert.equal(fixed.repeatDevelopmentConcurrency.runnerPressureMaySuppressGamePrimaryDispatch,false);
  assert.equal(fixed.repeatDevelopmentConcurrency.runnerPressureMaySuppressNextCycleRefill,false);
  assert.equal(fixed.repeatDevelopmentConcurrency.internalReleaseIsCheckpointNotTerminal,true);
  assert.equal(fixed.repeatDevelopmentConcurrency.externalPublicReleaseIsCheckpointNotTerminal,true);
  assert.equal(fixed.repeatDevelopmentConcurrency.externalPublicReleaseRequiresExplicitOwnerApproval,true);
  assert.equal(fixed.repeatDevelopmentConcurrency.postReleaseRepeatDevelopmentContinues,true);
  assert.deepEqual(fixed.repeatDevelopmentConcurrency.supportedBoundPlatformLoops,['ROBLOX','UNITY_WEB']);
  assert.equal(logMap.fixedRepeatDevelopment64EvidenceContract.runnerPressureMaySuppressGamePrimaryRefill,false);
  assert.equal(logMap.fixedRepeatDevelopment64EvidenceContract.runnerPressureMaySuppressNextCycleRefill,false);
  assert.equal(architecture.fixedRepeatDevelopment64.logicalCapacityUnaffectedByRunnerPressure,true);
  assert.equal(architecture.fixedRepeatDevelopment64.gamePrimaryDispatchNotPressureGated,true);
  assert.equal(architecture.fixedRepeatDevelopment64.nextCycleRefillNotPressureGated,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.runnerPressureMayNotLowerFixedGamePrimaryLogicalCapacity,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.runnerPressureMayNotBlockSafeGamePrimaryDispatch,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.runnerPressureMayNotBlockPostF9NextBuildUp,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.externalPublicReleaseStillRequiresExplicitOwnerApproval,true);
  assert.equal(fixed.autonomousBottleneckManagement.owner,'VIBE2_VIBE3_EXISTING_SYSTEM_AI');
  assert.equal(fixed.autonomousBottleneckManagement.ownerPresenceRequired,false);
  assert.equal(fixed.autonomousBottleneckManagement.chatgptPresenceRequired,false);
  assert.equal(fixed.autonomousBottleneckManagement.continuousDuringNormalOperation,true);
  assert.equal(fixed.autonomousBottleneckManagement.mode,'DETECT_CLASSIFY_REPAIR_RETRY_REBALANCE_WITHIN_EXISTING_AUTHORITY');
  assert.equal(fixed.autonomousBottleneckManagement.existingComponents.sensor,'tools/company-system-ai-bottleneck-sensor.mjs');
  assert.equal(fixed.autonomousBottleneckManagement.existingComponents.worker,'tools/company-system-ai-worker.mjs');
  assert.equal(fixed.autonomousBottleneckManagement.existingComponents.queueControl,'tools/vibe2-queue-control.mjs');
  assert.equal(fixed.autonomousBottleneckManagement.existingComponents.recoveryQueue,'tools/company-recovery-queue.mjs');
  assert.equal(fixed.autonomousBottleneckManagement.unrelatedGamesMustContinue,true);
  assert.equal(fixed.autonomousBottleneckManagement.queueAndRunnerPressureMayNotCreateWholeGameSerialization,true);
  assert.equal(fixed.autonomousBottleneckManagement.mayNotChangeLockedF0F9Sequence,true);
  assert.equal(fixed.autonomousBottleneckManagement.mayNotExpandWritableAuthority,true);
  assert.equal(fixed.autonomousBottleneckManagement.mayNotBypassSecurityQaRuntimeOrReleaseGates,true);
  assert.equal(fixed.autonomousBottleneckManagement.newPipelineWorkflowWrapperOrShadowManagerForbidden,true);
  assert.equal(fixed.responsibilitySplit.vibe.normalOperationsOwner,true);
  assert.equal(fixed.responsibilitySplit.vibe.allNormalProcessManagementOwner,true);
  assert.equal(fixed.responsibilitySplit.vibe.bottleneckManagementOwner,true);
  assert.equal(fixed.responsibilitySplit.vibe.buildUpThroughF9LifecycleOwner,true);
  assert.equal(fixed.responsibilitySplit.vibe.sourceGrowthExecutionOwner,true);
  assert.equal(fixed.responsibilitySplit.vibe.ownerOrChatgptPresenceRequired,false);
  assert.equal(fixed.responsibilitySplit.chatgpt.normalOperationsOwner,false);
  assert.equal(fixed.responsibilitySplit.chatgpt.normalBottleneckManager,false);
  assert.equal(fixed.responsibilitySplit.chatgpt.normalCycleApprovalDependency,false);
  assert.equal(fixed.responsibilitySplit.chatgpt.bottleneckOverflowAssist,true);
  assert.equal(fixed.responsibilitySplit.chatgpt.bottleneckOverflowAssistIsSecondary,true);
  assert.equal(fixed.responsibilitySplit.chatgpt.vibeRemainsPrimaryOwner,true);
  assert.equal(fixed.responsibilitySplit.chatgpt.absenceMayNotBlockVibe,true);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.enabled,true);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.role,'SECONDARY_ON_DEMAND_BOTTLENECK_REPAIR_ASSIST');
  assert.equal(fixed.chatgptOverflowBottleneckAssist.primaryOwnerRemains,'VIBE2_VIBE3_EXISTING_SYSTEM_AI');
  assert.equal(fixed.chatgptOverflowBottleneckAssist.normalOperationsOwner,false);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.normalApprovalDependency,false);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.automaticBackgroundInvocationAssumed,false);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.vibeContinuesWhenChatgptAbsent,true);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.unrelatedGamesContinueDuringAssist,true);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.noNewPipelineWorkflowWrapperOrShadowManager,true);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.mayNotChangeLockedF0F9Sequence,true);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.mayNotBypassSecurityQaRuntimeOrReleaseGates,true);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.mayNotExpandWritableAuthority,true);
  assert.equal(fixed.chatgptOverflowBottleneckAssist.assistOutcomeMustReturnToExistingVibeLoop,true);
  assert.ok(fixed.responsibilitySplit.chatgpt.focus.includes('VIBE_SYSTEM_CAPABILITY_EVOLUTION'));
  assert.ok(fixed.responsibilitySplit.chatgpt.focus.includes('OWNER_REQUESTED_DIRECT_GAME_SOURCE_EVOLUTION'));
  assert.equal(fixed.responsibilitySplit.owner.normalOperationsOwner,false);
  assert.equal(fixed.sourceGrowthIntegrity.buildUpGapMustBindExistingResponsibleGameSource,true);
  assert.equal(fixed.sourceGrowthIntegrity.realSourceDiffRequiredWhenBuildUpDecisionRequiresImplementation,true);
  assert.equal(fixed.sourceGrowthIntegrity.evaluationOnlyCompletionForbiddenWhenSourceMutationRequired,true);
  assert.equal(fixed.sourceGrowthIntegrity.directResponsibleFunctionOrCompleteBlockEditPreferred,true);
  assert.equal(fixed.sourceGrowthIntegrity.wrapperOverrideShadowPatchForbidden,true);
  assert.equal(fixed.sourceGrowthIntegrity.unnecessaryNewFileOrParallelStructureForbidden,true);
  assert.equal(fixed.sourceGrowthIntegrity.sourceRevisionMustPropagateIntoF0CandidateEvidence,true);
  assert.equal(fixed.sourceGrowthIntegrity.exactBuildUpSourceRevisionMustBeVerifiedThroughRuntimeChain,true);
  assert.equal(fixed.sourceGrowthIntegrity.f9SuccessMustReturnToImmediateNextBuildUp,true);
  assert.equal(fixed.sourceGrowthIntegrity.failureRoutesToExactGameStageRepairRetry,true);
  assert.equal(fixed.sourceGrowthIntegrity.sourceGrowthDoesNotChangeLockedF0F9Order,true);
  assert.equal(fixed.autonomousLearning.required,true);
  assert.equal(fixed.autonomousLearning.owner,'VIBE2_VIBE3');
  assert.equal(fixed.autonomousLearning.ownerPresenceRequired,false);
  assert.equal(fixed.autonomousLearning.chatgptPresenceRequired,false);
  assert.equal(fixed.autonomousLearning.continuous24h,true);
  assert.equal(fixed.autonomousLearning.existingLearningMotorOnly,true);
  assert.equal(fixed.autonomousLearning.learningMotor,'tools/vibe2-learning-motor.mjs');
  assert.equal(fixed.autonomousLearning.scheduler,'.github/workflows/vibe2-24h-runner.yml');
  assert.equal(fixed.autonomousLearning.positiveLearningRequiresVerifiedEvidence,true);
  assert.equal(fixed.autonomousLearning.verifiedFailureMayBecomeAvoidLesson,true);
  assert.equal(fixed.autonomousLearning.infrastructureFailureMayNotBecomeGameNegativeLearning,true);
  assert.equal(fixed.autonomousLearning.taskRelevantLearningMustBeRetrievedBeforeSourceGeneration,true);
  assert.equal(fixed.autonomousLearning.verifiedLearningMustFeedNextBuildUp,true);
  assert.equal(fixed.autonomousLearning.verifiedBottleneckLessonsMustFeedFutureCausalRepair,true);
  assert.equal(fixed.autonomousLearning.learningMayNotExpandAuthority,true);
  assert.equal(fixed.autonomousLearning.learningMayNotReplaceQaRuntimeOrF9Verification,true);
  assert.equal(fixed.autonomousLearning.rawUnverifiedModelOutputMayNotSelfPromote,true);
  assert.equal(fixed.autonomousLearning.newLearningPipelineOrShadowTrainerForbidden,true);
  assert.equal(fixed.requestedGameScopedRuntimeQa.requestedGameIdMeansExactGameOnly,true);
  assert.equal(fixed.requestedGameScopedRuntimeQa.requestedRunMayNotProcessOrMutateUnrelatedGameRuntimeCandidate,true);
  assert.equal(fixed.requestedGameScopedRuntimeQa.emptyGameIdMeansParallelBatchScan,true);
  assert.equal(fixed.requestedGameScopedRuntimeQa.batchCrossGameParallelismPreserved,true);
  assert.equal(fixed.requestedGameScopedRuntimeQa.unrelatedInvalidCandidateMayNotFailRequestedGameRun,true);
  assert.equal(fixed.requestedGameScopedRuntimeQa.exactGameFailureRoutesToExactGameStageRepair,true);
  assert.equal(roadmap.developmentLifecycleMachine.learningMotor.implementationOwner,'VIBE2_VIBE3');
  assert.equal(roadmap.continuousLearning24hContract.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(roadmap.continuousLearning24hContract.existingCanonicalLearningChainOnly,true);
  assert.equal(roadmap.continuousLearning24hContract.separateLearningPipelineForbidden,true);
  assert.equal(fixed.internalAssetConsumption,'EXISTING_BUILD_UP_ASSET_PRODUCTION_PATH_ONLY');
  assert.equal(fixed.internalAssetCreatesNewFlowStage,false);
  assert.equal(fixed.newPipelineWrapperOrShadowStructureForThisOperatingModel,false);
  assert.equal(fixed.startupSync.requiredForChatGPTAndWorkers,true);
  assert.equal(fixed.startupSync.latestMainFirst,true);
  assert.deepEqual(fixed.startupSync.canonicalReadOrder,['company-learning/platform-release-roadmap.json','company-learning/company-log-map.json','company-learning/company-architecture-map.json','company-learning/security-immune-system.json']);
  assert.equal(fixed.startupSync.documentHashesRequired,true);
  assert.equal(fixed.startupSync.finalDevelopmentLockV2Required,true);
  assert.equal(fixed.startupSync.beforeMutationDeploymentOrRuntimeStateChange,true);
  assert.equal(fixed.startupSync.priorConversationOrMemoryMayOverride,false);
  assert.equal(roadmap.finalDevelopmentLock.version,2);
  assert.equal(roadmap.finalDevelopmentLock.status,'LOCKED');
  assert.equal(roadmap.developmentLifecycleMachine.sharedWorkerContext.newSessionPreflight.fixedAutonomousDevelopmentOperatingContractMustBeRead,true);
  assert.deepEqual(roadmap.developmentLifecycleMachine.sharedWorkerContext.newSessionPreflight.requiredOperatingContractPaths,['fixedAutonomousDevelopmentOperatingContract','finalDevelopmentLock']);
  assert.equal(logMap.workerContextLogContract.fixedAutonomousDevelopmentOperatingContractRequired,true);
  assert.equal(architecture.workerSynchronization.fixedAutonomousDevelopmentOperatingContractMustBeLoaded,true);
  assert.equal(security.workerSynchronization.fixedAutonomousDevelopmentOperatingContractMustBeLoaded,true);
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.ownerAndChatgptNotInNormalCycleCriticalPath,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.normalCycleMayContinueWithoutOwnerOrChatgptPresence,true);
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.autonomousBottleneckManagementOwner,'VIBE2_VIBE3_EXISTING_SYSTEM_AI');
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.ownerOrChatgptBottleneckPresenceRequired,false);
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.bottleneckManagementOwner,'VIBE2_VIBE3_EXISTING_SYSTEM_AI');
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.ownerAndChatgptNotBottleneckManagersInNormalOperation,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.vibeMayManageNormalOperationalBottlenecksAutonomously,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.ownerAndChatgptAbsenceDoesNotBlockNonSecurityBottleneckRepair,true);
  assert.equal(roadmap.developmentSpeedExecution.controlPlaneQueueBacklogMitigation.directCodingOwner,'VIBE_EXISTING_SYSTEM_AI_AUTONOMOUS_BOTTLENECK_REPAIR');
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.vibeOwnsAllNormalProcessManagement,true);
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.chatgptNormalOperationsOwner,false);
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.sourceGrowthIntegrityEvidenceRequired,true);
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.vibeOwnsAllNormalProcessManagement,true);
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.chatgptNormalOperationsOwner,false);
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.sourceGrowthExecutionOwner,'VIBE2_VIBE3');
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.vibeNormalProcessManagementOwner,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.chatgptNormalOperationsOwner,false);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.evaluationOnlyCompletionMayNotFakeRequiredSourceMutation,true);
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.autonomousLearning.owner,'VIBE2_VIBE3');
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.autonomousLearning.ownerOrChatgptPresenceRequired,false);
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.autonomousLearning.owner,'VIBE2_VIBE3');
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.autonomousLearning.ownerAndChatgptNotInLearningCriticalPath,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.autonomousLearning.positiveLearningRequiresVerifiedEvidence,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.autonomousLearning.newShadowTrainerForbidden,true);
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.requestedRuntimeQaIsolation.requestedGameOnly,true);
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.requestedRuntimeQaIsolation.requestedGameOnly,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.requestedRuntimeQaIsolation.requestedGameOnly,true);
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.chatgptOverflowBottleneckAssist.role,'SECONDARY_ON_DEMAND');
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.chatgptOverflowBottleneckAssist.primaryOwner,'VIBE2_VIBE3_EXISTING_SYSTEM_AI');
  assert.equal(logMap.fixedAutonomousDevelopmentOperatingEvidence.chatgptOverflowBottleneckAssist.normalOperationsDependency,false);
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.chatgptOverflowBottleneckAssist.mode,'SECONDARY_ON_DEMAND');
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.chatgptOverflowBottleneckAssist.normalCriticalPath,false);
  assert.equal(architecture.fixedAutonomousDevelopmentOperatingTopology.chatgptOverflowBottleneckAssist.vibeContinuesWithoutAssist,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.chatgptOverflowBottleneckAssist.secondaryOnly,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.chatgptOverflowBottleneckAssist.primaryOwnerRemainsVibe,true);
  assert.equal(security.fixedAutonomousDevelopmentOperatingSecurity.chatgptOverflowBottleneckAssist.absenceMayNotBlockNormalOperation,true);
  assert.match(vibeAutoPlanner,/department:'development',type:'implementation'/);
  assert.match(vibeAutoPlanner,/post-f9-new-build-up-generation:REQUIRED/);
  assert.match(vibeAutoPlanner,/build-up-source-tree:/);
  assert.match(vibeSourceWorker,/후보가 실제 source 변경을 생성하지 않음/);
  assert.match(vibeSourceWorker,/변경 없는 edit:/);
  assert.match(vibeSourceWorker,/책임 파일이 지정된 작업은 새 파일 자동 생성 금지/);
  assert.equal(roadmap.changeRecord.perGameFlowQueueBottleneckRepair20261004.status,'IMPLEMENTED_MAIN');
  assert.equal(roadmap.changeRecord.perGameFlowQueueBottleneckRepair20261004.mergeSha,'20a30f4f71efbd9d8309c8135253a782007320ba');
});
