import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
const webRuntime=read('.github/workflows/company-development-confirmed-runtime.yml');
const robloxRuntime=read('.github/workflows/company-development-roblox-runtime.yml');
const bootstrap=read('tools/company-development-roblox-bootstrap.mjs');
const reconcile=read('tools/company-development-roblox-source-reconcile.mjs');
const feeder=read('tools/vibe2-post-release-focus.mjs');
const planner=read('tools/vibe2-auto-planner.mjs');
const runner=read('.github/workflows/vibe2-24h-runner.yml');
const queue=read('assets/vibe-continuous-queue.js');
const developmentQueueReconcileWorkflow=read('.github/workflows/company-development-queue-reconcile.yml');
const seedDesignRuntime=read('.github/workflows/company-seed-design-runtime.yml');
const directorSupervisor=read('.github/workflows/director-supervisor.yml');
const designCycle=read('tools/company-design-cycle.mjs');
const queueControl=read('tools/vibe2-queue-control.mjs');
const adaptiveBackpressure=read('tools/vibe2-adaptive-backpressure.mjs');
const parallelismTelemetry=read('tools/vibe2-parallelism-telemetry.mjs');
const releaseDispatchRecovery=read('tools/vibe2-release-dispatch-recovery.mjs');
const robloxRunnerSelfHeal=read('.github/workflows/roblox-runner-self-heal.yml');

const lifecycle=roadmap.developmentLifecycleMachine;
assert.equal(roadmap.policySource,'company-learning/platform-release-roadmap.json');
assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
assert.equal(roadmap.humanDocumentRequired,false);
assert.equal(roadmap.developmentAccess.ROBLOX,'ALWAYS_ALLOWED');
assert.equal(roadmap.developmentAccess.UNITY,'ALWAYS_ALLOWED');
assert.equal(roadmap.developmentAccess.FORTNITE_UEFN,'OWNER_HOLD');
assert.equal(roadmap.fortniteUefn.developmentAlwaysAllowed,false);
assert.equal(roadmap.fortniteUefn.developmentExecutionAllowed,false);
assert.equal(roadmap.fortniteUefn.releaseExecutionAllowed,false);
assert.equal(roadmap.fortniteUefn.learningAllowed,true);
assert.equal(roadmap.fortniteUefn.ownerStartRequired,true);
assert.equal(roadmap.developmentLifecycleMachine.platformExecutionHolds.FORTNITE_UEFN.state,'OWNER_HOLD');
assert.equal(roadmap.developmentLifecycleMachine.platformExecutionHolds.FORTNITE_UEFN.verifiedLearningCollectionContinues,true);
assert.equal(roadmap.legacyPolicyMirror.authoritative,false);
assert.equal(lifecycle.authority,'MACHINE_EXECUTION_CONTRACT');
assert.equal(lifecycle.humanDocumentRequired,false);
assert.equal(lifecycle.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
assert.deepEqual(lifecycle.stages,[
  'MINIMUM_DESIGN_CONTRACT_READY','ROBLOX_UNITY_NATIVE_SOURCE_BIND','TARGET_PLATFORM_RUNTIME',
  'TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION','INTERNAL_PLATFORM_RELEASE',
  'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG','PUBLIC_RELEASE_READY','PUBLIC_RELEASE','POST_RELEASE_FOCUSED_DEVELOPMENT'
]);

const work=lifecycle.machineWorkInstruction;
assert.equal(work.authority,'MACHINE_EXECUTION_CONTRACT');
assert.equal(work.humanDocumentRequired,false);
assert.equal(work.sourceOfTruth,'company-learning/platform-release-roadmap.json');
assert.equal(work.version,2);
assert.equal(work.objective,'USE_VERIFIED_LEARNING_TO_CONTINUE_ONE_GAME_FROM_MINIMUM_SHARED_DESIGN_TO_ROBLOX_AND_UNITY_NATIVE_INTERNAL_RELEASE_PLAYTEST_AND_POST_RELEASE_COMPLETENESS');
for(const step of [
  'LOAD_APPROVED_PLATFORM_GENRE_AND_MINIMUM_DESIGN_BASELINE',
  'LOAD_CURRENT_PROJECT_STATE_AND_EXISTING_NATIVE_SOURCES',
  'LOAD_VERIFIED_LEARNING_CONTEXT',
  'CREATE_OR_CONTINUE_ROBLOX_NATIVE_SOURCE',
  'CREATE_OR_CONTINUE_UNITY_NATIVE_SOURCE',
  'VERIFY_EACH_PLATFORM_RUNTIME_INDEPENDENT_QA_AND_REGRESSION',
  'PROMOTE_EACH_PLATFORM_INTERNAL_RELEASE_ONLY_AFTER_OWN_GATES_PASS',
  'ENTER_INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
  'REPAIR_OR_EXTEND_FROM_RUNTIME_OWNER_AND_VISUAL_EVIDENCE',
  'PROMOTE_PUBLIC_RELEASE_ONLY_AFTER_PLATFORM_SPECIFIC_ACCEPTANCE',
  'PERSIST_VERIFIED_LEARNING_AND_CREATE_NEXT_FOCUS_CYCLE'
]) assert(work.executionOrder.includes(step),step);
assert.equal(work.webWorker.enabled,false);
assert.equal(work.webWorker.status,'LEGACY_DISABLED');
assert.equal(work.webWorker.developmentAdmissionAuthority,false);
assert.equal(work.webWorker.replacement,'DIRECT_NATIVE_ROBLOX_UNITY_APP_DEVELOPMENT');
assert.equal(work.selectedPlatformWorker.sharedMinimumDesignMustCarryForward,true);
assert.equal(work.selectedPlatformWorker.platformSpecificImplementationRequired,true);
assert.equal(work.selectedPlatformWorker.platformSpecificRuntimeQaRegressionRequired,true);
assert.equal(work.robloxWorker.verifiedLearningRequired,true);
assert.equal(work.robloxWorker.bootstrap,'tools/company-development-roblox-bootstrap.mjs');
assert.equal(work.unityWorker.platformNativeSourceRequired,true);
assert.equal(work.unityWorker.verifiedLearningRequired,true);
assert.equal(work.internalPlaytestWorker.stage,'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG');
assert.equal(work.internalPlaytestWorker.activeCoDevelopment,true);
assert.equal(work.internalPlaytestWorker.ownerInterruptSupported,true);
assert.equal(work.internalPlaytestWorker.publicPromotionBlockedUntilAcceptance,true);
assert.equal(work.postReleaseWorker.protectedRunnerSlots,1);
assert.equal(work.postReleaseWorker.continuousRefill,true);
assert.equal(work.postReleaseWorker.oneConcreteGapPerCycle,true);
assert.equal(work.postReleaseWorker.automaticRepublish,false);
assert.equal(work.learningInstruction.sameGameFirst,true);
assert.equal(work.learningInstruction.crossGameTransformativeRecombinationAllowed,true);
assert.equal(work.learningInstruction.rawCopyForbidden,true);
assert.equal(work.learningInstruction.positiveLearningRequiresVerifiedEvidence,true);
assert.equal(work.learningInstruction.persistAfterVerifiedCycle,true);
assert.equal(work.learningInstruction.modelTrainingThresholdsMustNotBeLowered,true);
assert.equal(work.queueInstruction.postReleaseLongWorkProtected,true);
assert.equal(work.queueInstruction.postReleaseConcurrentProtectedSlots,1);
assert.equal(work.queueInstruction.productionWorkPreemptsPractice,true);
assert.match(work.completionRule,/NEVER_TREAT_INTERNAL_RELEASE_AS_COMPLETION/);
assert.match(work.completionRule,/CONTINUE_INTERNAL_PLAYTEST_REPAIR_UNTIL_PLATFORM_ACCEPTANCE/);

const continuation=lifecycle.machineOnlyProjectContinuation;
assert.equal(continuation.version,2);
assert.equal(continuation.authority,'MACHINE_EXECUTION_CONTRACT');
assert.equal(continuation.humanDocumentRequired,false);
assert.equal(continuation.sourceOfTruth,'company-learning/platform-release-roadmap.json');
assert.equal(continuation.objective,'MINIMUM_SHARED_DESIGN_THEN_CONCURRENT_ROBLOX_UNITY_NATIVE_CONTINUATION_THEN_INTERNAL_PLAYTEST_AND_POST_RELEASE_FOCUSED_DEVELOPMENT');
assert.equal(continuation.webBaseImplementation.enabled,false);
assert.equal(continuation.webBaseImplementation.status,'LEGACY_DISABLED');
assert.equal(continuation.webBaseImplementation.developmentAdmissionAuthority,false);
assert.equal(continuation.nativePlatformContinuation.startsFromSharedMinimumDesign,true);
assert.equal(continuation.nativePlatformContinuation.concurrentRobloxUnity,true);
assert.equal(continuation.nativePlatformContinuation.secondImplementationContinuesFromWebBase,false);
assert.equal(continuation.nativePlatformContinuation.webHandoffRequired,false);
assert.deepEqual(continuation.nativePlatformContinuation.supported,['ROBLOX','UNITY']);
assert.equal(continuation.nativePlatformContinuation.platformProfilesRequired,true);
assert.equal(continuation.nativePlatformContinuation.nativeRuntimeEvidenceRequired,true);
assert.equal(continuation.robloxContinuation.continueFromPortableBase,false);
assert.equal(continuation.robloxContinuation.continueFromSharedMinimumDesign,true);
assert.equal(continuation.robloxContinuation.verifiedLearningReuseRequired,true);
assert.equal(continuation.unityContinuation.continueFromSharedMinimumDesign,true);
assert.equal(continuation.unityContinuation.platformNativeRuntimeEvidenceRequired,true);
assert.equal(continuation.postReleaseFocusedDevelopment.dedicatedProtectedRunnerSlots,1);
assert.equal(continuation.postReleaseFocusedDevelopment.continuousRefill,true);
assert.equal(continuation.verifiedLearningMaxUse.required,true);
assert.equal(continuation.verifiedLearningMaxUse.sameGameHighestPriority,true);
assert.equal(continuation.verifiedLearningMaxUse.crossGameTransformativeRecombinationAllowed,true);
assert.equal(continuation.verifiedLearningMaxUse.learningMayExpandAuthority,false);
assert.equal(continuation.verifiedLearningMaxUse.learningMayReplaceNativeVerification,false);
for(const stage of ['MINIMUM_DESIGN_CONTRACT_READY','TARGET_PLATFORM_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION','INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG','POST_RELEASE_FOCUSED_DEVELOPMENT']){
  assert(continuation.verifiedLearningMaxUse.applyAt.includes(stage),stage);
}

assert.equal(lifecycle.webToPlatformHandoff.required,false);
assert.equal(lifecycle.webToPlatformHandoff.status,'LEGACY_DISABLED');
assert.equal(lifecycle.webToPlatformHandoff.webRole,'NONE');
assert.equal(lifecycle.webToPlatformHandoff.replacement,'MINIMUM_DUAL_PLATFORM_DESIGN_HANDOFF');
assert.match(webRuntime,/Resolve direct native development/);
assert.match(webRuntime,/DIRECT_NATIVE_MACHINE_CONTRACT=PASS/);
assert.match(webRuntime,/UNITY_WEB_RUNTIME_DISPATCH_COUNT/);
assert.match(webRuntime,/UNITY_WEB_RUNTIME_ROLE=NON_BLOCKING_VALIDATION_SURFACE/);
assert.doesNotMatch(webRuntime,/UNITY_WEB_RUNTIME_DISPATCH=NO/);
assert.match(webRuntime,/ROBLOX_RUNTIME_DISPATCH=YES/);
assert.match(webRuntime,/UNITY_APP_RUNTIME_DISPATCH=YES/);
assert.match(webRuntime,/BIDIRECTIONAL_AUTO_PAIR=YES/);
assert.match(webRuntime,/INTERNAL_RELEASE_FIRST=YES/);
assert.doesNotMatch(webRuntime,/company-development-web-bootstrap\.mjs/);
assert.doesNotMatch(webRuntime,/company-development-web-gameplay-validation\.mjs/);
assert.doesNotMatch(webRuntime,/WEB_GAMEPLAY_MUSIC_GATE=REQUIRED/);
assert.match(webRuntime,/company-minimum-design-contract\.mjs/);
assert.match(webRuntime,/company-selected-platform-router\.mjs/);

assert.match(robloxRuntime,/--roadmap=company-learning\/platform-release-roadmap\.json/);
assert.ok(bootstrap.includes('PolicySource = "company-learning/platform-release-roadmap.json"'));
assert.equal(lifecycle.webToPlatformHandoff.required,false);
assert.equal(lifecycle.webFirstImplementation.enabled,false);
assert.equal(lifecycle.missingWebBaselinePlanning.enabled,false);
assert.equal(lifecycle.directNativeDualPlatformDevelopment.webStageSkipped,true);
assert.equal(lifecycle.directNativeDualPlatformDevelopment.webGateSkipped,true);

const focus=lifecycle.postReleaseFocusedDevelopment;
assert.equal(focus.enabled,true);
assert.deepEqual(focus.platforms,['ROBLOX']);
assert.equal(focus.globalProtectedRunnerSlots,1);
assert.equal(focus.activeTaskMaxPerProject,1);
assert.equal(focus.workerRoute,'text-source-worker');
assert.equal(focus.continuousRefill,true);
assert.equal(focus.feeder,'tools/vibe2-post-release-focus.mjs');
assert.equal(focus.generatedTaskContract.postReleaseFocused,true);
assert.equal(focus.generatedTaskContract.packageLongWorkProtected,true);
assert.equal(focus.generatedTaskContract.packageRole,'implementation-owner');
assert.equal(focus.historicalDeploymentRecovery.registry,'company-learning/roblox-sustained-maintenance.json');
assert.equal(focus.historicalDeploymentRecovery.currentReleaseClaimRequired,false);
assert.equal(focus.historicalDeploymentRecovery.protectedSlotSharedWithCurrentPostReleaseFocus,true);
assert.equal(focus.historicalDeploymentRecovery.maintenanceTaskReleaseState,'development-confirmed');
assert.equal(focus.historicalDeploymentRecovery.taskFlag,'historicalDeploymentRecovery');
assert.match(queue,/function isHistoricalPostReleaseMaintenance/);
assert.match(queue,/releaseState === 'release-confirmed' \|\| isHistoricalPostReleaseMaintenance\(task\)/);
assert.match(queue,/historicalDeploymentRecovery: input\.historicalDeploymentRecovery === true/);
assert.match(planner,/self-recovery:HISTORICAL_DEPLOYMENT_FLAG_RESTORED/);
assert.match(planner,/company-learning\/roblox-sustained-maintenance\.json/);
assert.match(planner,/lifecycle-sync:HISTORICAL_REGISTRY_ACTIVE/);

assert.match(feeder,/robloxReleaseClaim===true/);
assert.match(feeder,/evidence\.published===true/);
assert.match(feeder,/postReleaseFocused:true/);
assert.match(feeder,/packageLongWorkProtected:true/);
assert.match(feeder,/packageRole:'implementation-owner'/);
assert.match(feeder,/NO_NEW_SOURCE_CYCLE/);
assert.match(runner,/vibe2-post-release-focus\.mjs/);
assert.match(runner,/company-runtime:development-queue\.json|origin\/company-runtime:development-queue\.json/);
assert.match(queue,/postReleaseFocusedSlots: 1/);
assert.match(queue,/isPostReleaseFocused/);
assert.match(queue,/postReleaseFocusedTaskId/);

const webFirst=lifecycle.webFirstImplementation;
assert.equal(webFirst.enabled,false);
assert.equal(webFirst.status,'LEGACY_DISABLED');
assert.equal(webFirst.developmentAdmissionAuthority,false);
assert.equal(webFirst.replacement,'DIRECT_NATIVE_ROBLOX_UNITY_APP_DEVELOPMENT');
assert.equal(webFirst.authority,'VIBE_IMPLEMENTATION_OWNER');
assert.equal(webFirst.existingSourceAssessmentRequired,true);
assert.equal(webFirst.assessmentOwner,'VIBE_EXPLORATION');
assert.deepEqual(webFirst.assessmentStrategies,['KEEP_AND_CONTINUE','PARTIAL_REPAIR','MAJOR_REWORK','FULL_REBUILD']);
assert.equal(webFirst.fullRebuildRequires,'EXPLORATION_FULL_REBUILD_DECISION');
assert.equal(webFirst.prototypeMarkerAloneCannotForceRebuild,true);
assert.equal(webFirst.existingSourceMustBeReadBeforeDecision,true);
assert.equal(webFirst.approvedDesignComparisonRequired,true);
assert.equal(webFirst.approvedScopeCoverageRequired,true);
assert.equal(webFirst.gameplaySignalAssessmentRequired,true);
assert.equal(webFirst.preserveReusableSystems,true);
assert.equal(webFirst.preserveSaveMeaningWhenCompatible,true);
assert.equal(webFirst.missingSourceAction,'VIBE_NEW_WEB_BASE_IMPLEMENTATION');
assert.equal(webFirst.existingSourceAction,'ASSESS_THEN_IMPLEMENT');
assert.equal(webFirst.companyBootstrapMayGenerateGameSource,false);
assert.equal(webFirst.companyBootstrapMayRepairGameSource,false);
assert.equal(webFirst.companyRuntimeRole,'ROUTE_VALIDATE_FAN_IN_ONLY');
const quota=lifecycle.modelQuotaContinuity;
assert.equal(quota.enabled,true);
assert.equal(quota.designProviderPolicy,'GEMINI_PRIMARY_VIBE_LOCAL_FALLBACK');
assert.equal(quota.quotaFailureIsDesignGateFailure,false);
assert.equal(quota.quotaBlockedState,'WAITING_FOR_GEMINI_QUOTA');
assert.equal(quota.runnerStopOnQuotaExhaustion,false);
assert.equal(quota.continuousRefillRequired,true);
assert.equal(quota.blockedModelTaskConsumesDevelopmentSlot,false);
assert.equal(quota.checkpointResumeRequired,true);
assert.equal(quota.completedPhaseReplayForbidden,true);
assert.equal(quota.fullCycleRestartForbidden,true);
assert.equal(quota.vibeSubstitution.enabled,true);
for(const stage of ['WEB_BASE_IMPLEMENTATION','WEB_RUNTIME_VALIDATION','TARGET_PLATFORM_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION','POST_RELEASE_FOCUSED_DEVELOPMENT']){
  assert(quota.vibeSubstitution.allowedStages.includes(stage),stage);
}
assert(quota.vibeSubstitution.forbiddenResponsibilities.includes('DESIGN_INDEPENDENT_LEAD_REVIEW'));
assert(quota.vibeSubstitution.forbiddenResponsibilities.includes('STAGE_GATE_SCORE_OR_VERDICT_SYNTHESIS'));
assert(quota.vibeSubstitution.allowedStages.includes('DESIGN_AUTHORING'));
assert(quota.vibeSubstitution.allowedStages.includes('DESIGN_REPAIR'));
assert.equal(quota.providerFailureSubstitution.gateDecisionAuthority,'DETERMINISTIC_EVIDENCE_ONLY');
assert.equal(quota.geminiFallback.paidApiAdditionForbidden,true);
assert.equal(quota.geminiFallback.resumeFromExactBlockedTask,true);
assert.match(developmentQueueReconcileWorkflow,/game-primary-gate:/);
assert.match(developmentQueueReconcileWorkflow,/GAME_PRIMARY_GATE=DEFER_ACTIVE_GAME_WORK/);
assert.match(developmentQueueReconcileWorkflow,/cancel-in-progress: true/);
assert.match(developmentQueueReconcileWorkflow,/needs: game-primary-gate/);
assert.match(developmentQueueReconcileWorkflow,/needs\.game-primary-gate\.outputs\.defer != 'true'/);
assert.match(seedDesignRuntime,/game-primary-gate:/);
assert.match(seedDesignRuntime,/GAME_PRIMARY_GATE=DEFER_ACTIVE_GAME_WORK/);
assert.match(seedDesignRuntime,/needs: game-primary-gate/);
assert.match(seedDesignRuntime,/if: needs\.game-primary-gate\.outputs\.defer != 'true'/);
assert.match(directorSupervisor,/game-primary-gate:/);
assert.match(directorSupervisor,/GAME_PRIMARY_GATE=DEFER_ACTIVE_GAME_WORK/);
assert.match(directorSupervisor,/needs: game-primary-gate/);
assert.match(directorSupervisor,/if: needs\.game-primary-gate\.outputs\.defer != 'true'/);
assert.match(seedDesignRuntime,/COMPANY_GEMINI_LEAD_MODELS: '[^']*gemini-3\.8-flash[^']*gemini-3\.7-flash[^']*'/);
assert.match(seedDesignRuntime,/const authorizedLeadPool=uniq\(directive\?\.ai\?\.modelPool\|\|\[\]\);/);
assert.match(seedDesignRuntime,/if\(primary\.some\(model=>!authorizedLeadPool\.includes\(model\)\)\)throw new Error\('GEMINI_QUOTA_GOVERNOR_UNAUTHORIZED_LEAD_MODEL'\);/);
assert.match(seedDesignRuntime,/const fallback=authorizedLeadPool;/);
assert.match(seedDesignRuntime,/COMPANY_GEMINI_LEAD_FALLBACK_LANES:/);
assert.match(seedDesignRuntime,/Resolve checkpoint-aware Gemini quota lanes/);
assert.match(seedDesignRuntime,/WAITING_FOR_GEMINI_QUOTA/);
assert.match(seedDesignRuntime,/GEMINI_QUOTA_FULL_CYCLE_RESTART=NO/);
assert.match(seedDesignRuntime,/GEMINI_QUOTA_CURRENT_PHASE=/);
assert.match(seedDesignRuntime,/GEMINI_QUOTA_LEAD_PHASE_BLOCKING=NO/);
assert.match(seedDesignRuntime,/const leadPhaseActive=currentPhase==='DEPARTMENT_REVIEWS'\|\|missingRoles\.length<roles\.length/);
assert.match(seedDesignRuntime,/DESIGN_GATE_REPAIR_LOOP_DISPATCH=WAITING_FOR_GEMINI_QUOTA/);
assert.match(queue,/WAITING_FOR_GEMINI_QUOTA/);
assert.match(queue,/isExternalQuotaWaitingTask/);
assert.match(designCycle,/DESIGN_CHECKPOINT_CONTRACT_VERSION=3/);
assert.match(designCycle,/checkpointV2MigrationEligible/);
assert.match(designCycle,/checkpointV3CompatibleEngineMigrationEligible/);
assert.match(designCycle,/4e114701cd81e031c4a089be79544cfb23c4275c8d0f5b5f49d92926084a48ec/);
assert.match(designCycle,/QUOTA_VIBE_REPAIR_COMPATIBLE_ENGINE_CHANGE_NO_REPLAY/);
assert.match(designCycle,/PERSIST_GEMINI_DAILY_QUARANTINE_WITHOUT_REPLAY/);
assert.match(designCycle,/GEMINI_MODEL_QUARANTINE_RESTORED=/);
assert.match(designCycle,/persistentGeminiUnavailableStatus/);
assert.match(designCycle,/DESIGN_PRE_GATE_REPAIR_CHECKPOINTS_PRESERVED=YES/);
assert.doesNotMatch(designCycle,/delete designCheckpoint\.phases\[key\]/);
assert.match(designCycle,/GEMINI_DAILY_QUOTA_EXHAUSTED=/);
assert.ok(designCycle.indexOf('if(status===429&&isDailyGeminiQuotaError(error))')<designCycle.indexOf('const minuteRetryMs=geminiMinuteRetryDelayMs(error,candidateModel)'));


const recovery=lifecycle.selfRecoveryAndBottleneckRelief;
assert.equal(recovery.authority,'MACHINE_EXECUTION_CONTRACT');
assert.equal(recovery.humanDocumentRequired,false);
assert.equal(recovery.sourceOfTruth,'company-learning/platform-release-roadmap.json');
assert.equal(recovery.enabled,true);
assert.deepEqual(recovery.recoveryLoop,[
  'DETECT_FAILURE_OR_BOTTLENECK',
  'CLASSIFY_RETRYABLE_VS_POLICY_BLOCK',
  'PRESERVE_VERIFIED_STATE_AND_CURRENT_PROJECT_CHECKPOINT',
  'RELEASE_OR_REQUEUE_STALE_AND_RETRYABLE_WORK',
  'ADJUST_PARALLELISM_OR_ROUTE_AROUND_BLOCKED_CAPACITY',
  'REFILL_ELIGIBLE_INDEPENDENT_WORK',
  'REVERIFY_INCREMENTAL_QA_RUNTIME_AND_FAN_IN',
  'PERSIST_RECOVERY_TELEMETRY_AND_VERIFIED_LEARNING',
  'CONTINUE_NEXT_CYCLE'
]);
assert.equal(recovery.bindings.queueController,'tools/vibe2-queue-control.mjs');
assert.equal(recovery.bindings.adaptiveBackpressure,'tools/vibe2-adaptive-backpressure.mjs');
assert.equal(recovery.bindings.telemetry,'tools/vibe2-parallelism-telemetry.mjs');
assert.equal(recovery.bindings.releaseDispatchRecovery,'tools/vibe2-release-dispatch-recovery.mjs');
assert.equal(recovery.bindings.robloxRunnerSelfHeal,'.github/workflows/roblox-runner-self-heal.yml');
assert.equal(recovery.automaticRecovery.externalModelQuota,'CHECKPOINT_AND_CONTINUE_NON_BLOCKED_VIBE_WORK');
assert.equal(recovery.automaticRecovery.waitingForVerifiedSamples,'CONTINUE_SAMPLE_COLLECTION_NOT_FAILURE');
assert.deepEqual(recovery.bottleneckPolicy.adaptiveSteps,[256,128,64,32,20,16,8,4]);
assert.equal(recovery.bottleneckPolicy.maxStepChangesPerRun,1);
assert.equal(recovery.bottleneckPolicy.productionWorkPreemptsPractice,true);
assert.equal(recovery.bottleneckPolicy.postReleaseProtectedRunnerSlots,1);
assert.equal(recovery.bottleneckPolicy.longWorkProtectedSlots,1);
assert.equal(recovery.bottleneckPolicy.disjointWorkMayContinueWhileOneRouteBlocked,true);
assert.equal(recovery.bottleneckPolicy.doNotConsumeDevelopmentSlotForExternalQuotaWait,true);
for(const key of ['noGateBypass','noTrainingThresholdReduction','noVerifiedLearningDeletion','noRestartFromBlankWhenValidCheckpointExists','noSilentScopeDrop','noAutomaticPublicRepublish','noRuntimePassFabrication','learningMustContinueDuringRecoverableDevelopmentBlock']){
  assert.equal(recovery.invariants[key],true,key);
}
assert.match(queueControl,/recoverStaleRunningReservations/);
assert.match(queueControl,/recoverFanInRegressionFailure/);
assert.match(queue,/isExternalQuotaWaitingTask/);
assert.match(adaptiveBackpressure,/ADAPTIVE_PARALLELISM_STEPS = Object\.freeze\(\[4, 8, 16, 20, 32, 64, 128, 256\]\)/);
assert.match(adaptiveBackpressure,/HEALTHY_FAST_RAMP/);
assert.match(parallelismTelemetry,/RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION/);
assert.match(parallelismTelemetry,/INCREMENTAL_QA/);
assert.match(parallelismTelemetry,/CHECKOUT_NETWORK/);
assert.match(releaseDispatchRecovery,/gateBypass:false/);
assert.match(runner,/vibe2-release-dispatch-recovery\.mjs/);
assert.match(robloxRunnerSelfHeal,/ROBLOX_RUNNER_SELF_HEAL_APPLIED=YES/);

const multiverse=lifecycle.intentAmplificationMultiverse;
assert.equal(multiverse.authority,'MACHINE_EXECUTION_CONTRACT');
assert.equal(multiverse.humanDocumentRequired,false);
assert.equal(multiverse.humanAgencyPrimary,true);
assert.equal(multiverse.vibeRole,'INTENT_MEMORY_CREATIVE_CAPABILITY_AMPLIFIER');
assert.equal(multiverse.consciousnessClaimed,false);
assert.equal(multiverse.sanctuarySemantics.canonicalProjectStateMustRemainRecoverable,true);
assert.equal(multiverse.sanctuarySemantics.checkpointBeforeRiskyBranchOrStageTransition,true);
assert.equal(multiverse.sanctuarySemantics.restartFromBlankForbiddenWhenValidContinuationStateExists,true);
assert(multiverse.sanctuarySemantics.durableSources.includes('company-learning/vibe3-recombination-memory.json'));
assert.equal(multiverse.multiverseExpansion.enabled,true);
assert.equal(multiverse.multiverseExpansion.conceptualExpansionUnbounded,true);
assert.equal(multiverse.multiverseExpansion.executionResourceBounded,true);
assert.equal(multiverse.multiverseExpansion.canonicalIdentityProtected,true);
assert.equal(multiverse.multiverseExpansion.branchMustNotOverwriteCanonicalProject,true);
assert.equal(multiverse.multiverseExpansion.verifiedCrossProjectRecombinationAllowed,true);
assert.equal(multiverse.multiverseExpansion.rawCopyForbidden,true);
assert.equal(multiverse.multiverseExpansion.newExpressionRequired,true);
for(const key of ['project-id','parent-project-or-seed','approved-platform-and-genre-lock','verified-learning-context','source-provenance']){
  assert(multiverse.multiverseExpansion.eachBranchRequires.includes(key),key);
}
assert.equal(multiverse.lifecycleBinding.webFirstExecutableBase,'WEB_BASE_IMPLEMENTATION');
assert.equal(multiverse.lifecycleBinding.webBaselineGate,'WEB_DEVELOPMENT_BASELINE_READY');
assert.equal(multiverse.lifecycleBinding.nativeContinuation,'TARGET_PLATFORM_SOURCE_BIND');
assert.equal(multiverse.lifecycleBinding.robloxPostReleaseFocus,'POST_RELEASE_FOCUSED_DEVELOPMENT');
assert.equal(multiverse.lifecycleBinding.robloxProtectedRunnerSlots,1);
assert.equal(multiverse.lifecycleBinding.webBaseContinuesIntoNative,true);
assert.equal(multiverse.lifecycleBinding.validWebBaseRestartFromBlankForbidden,true);
assert.equal(multiverse.lifecycleBinding.nativeEvidenceRequiredSeparately,true);
assert.equal(multiverse.learningContinuity.continuous24h,true);
assert.equal(multiverse.learningContinuity.googlePlayRotationContinuous,true);
assert.equal(multiverse.learningContinuity.catalogWrapDoesNotStopStudy,true);
assert.equal(multiverse.learningContinuity.canonicalDistillationContinuous,true);
assert.equal(multiverse.learningContinuity.waitingForVerifiedSamplesIsCollectionStateNotFailure,true);
assert.equal(multiverse.learningContinuity.verifiedLearningReuseRequired,true);
assert.equal(multiverse.learningContinuity.practiceMayNotExpandAuthority,true);
assert.equal(multiverse.learningContinuity.modelPromotionStillRequiresFixedHoldoutAbThenCanary,true);
assert.deepEqual(multiverse.expansionLoop,[
  'LOAD_OWNER_INTENT_AND_CANONICAL_PROJECT_STATE',
  'LOAD_VERIFIED_LEARNING_AND_RECOMBINATION_MEMORY',
  'CREATE_OR_CONTINUE_ONE_PLAYABLE_PROJECT_WORLD',
  'IMPLEMENT_WEB_BASE_OR_NATIVE_CONTINUATION',
  'VERIFY_RUNTIME_QA_AND_REGRESSION',
  'PERSIST_NEW_VERIFIED_LESSONS',
  'CONTINUE_EXISTING_WORLD_OR_BRANCH_NEW_PROJECT_WORLD'
]);


console.log('PASS machine-only lifecycle binds Web base to Roblox continuation, verified learning reuse, and one protected post-release focus runner');
