# JAEWOON COMPANY PRODUCTION POLICY

```yaml
policy:
  sourceOfTruth: company-learning/platform-release-roadmap.json
  format: MACHINE_ORIENTED_POLICY_SPEC
  authority: LEGACY_POLICY_MIRROR
  authoritative: false
  executionRequired: false
  legacyPolicyMirror: true
  canonicalMachineAuthority: MACHINE_EXECUTION_CONTRACT
  humanReadableNarrativeRequired: false
  naturalLanguagePolicyReplicationForbidden: true
  ownerDirectiveNaturalLanguageStorageForbidden: true
  ownerDirectiveParaphraseStorageForbidden: true
  ownerDirectiveVerbatimStorageForbidden: true
  nonCanonicalPolicyDocumentMode: MACHINE_POINTER_ONLY
  nonCanonicalPolicyDocumentCanonicalReference: company-learning/platform-release-roadmap.json
  ownerInstructionOverridesPolicy: true
  implementationMustFollowPolicy: true
  evidenceFilesCannotCreatePolicy: true
  separatePolicyDocumentsForbidden: true
  machineContractsMayMirrorPolicyButCannotCreatePolicy: true
  latestOwnerDirectiveRecordedAt: 2026-09-18

priority:
  - OWNER_LATEST_DIRECT_INSTRUCTION
  - PLATFORM_RELEASE_ROADMAP_MACHINE_CONTRACT
  - COMPANY_DIRECTIVE
  - LEGACY_COMPANY_FLOW_MIRROR
  - IMPLEMENTATION_TOOL_CONTRACTS
  - STATUS_AUDIT_BUILD_HEALTH_EVIDENCE

ownerCurrentProductionContract:
  recordedAt: 2026-09-15
  authority: OWNER_LATEST_DIRECT_INSTRUCTION
  supersedesConflictingLegacySchedulingAndSeedRulesBelow: true
  seedMaterials:
    poolTarget: 100
    materialIsGame: false
    gameReferenceIsOptionalMaterialType: true
    allowedSourceFamilies:
      - SUCCESSFUL_GAME_STRUCTURE
      - STORY_OR_NARRATIVE_STRUCTURE
      - REAL_JOB_INDUSTRY_LIFE
      - NATURE_ECOLOGY_SCIENCE
      - SPORT_BOARD_PLAY_RULE
      - SOCIAL_COOP_COMPETITION
      - SURVIVAL_ESCAPE_RISK
      - SPACE_BUILDING_OPERATION
      - SYSTEM_MECHANIC_EXPERIMENT
      - FREE_ORIGINAL_IDEA
    combinePerGameSeed:
      min: 2
      max: 4
    sameCategoryOrSameReferenceMayRepeat: true
    finalConceptMaterialDuplicateForbidden: true
    replenishment: KEEP_100_AVAILABLE_OR_RESERVED_MATERIALS
  gameSeedMeaning:
    seedMaterialIsNotGameProject: true
    gameSeedBeginsOnlyAfterMaterialComposition: true
    gameProjectBeginsAfterDesignGate: true
    actualGameCountCap: null
  gameLifecycleAndDevelopmentPipeline:
    canonicalLifecycleAuthority: GAME_CATALOG_LIFECYCLE_STATE_BY_GAME_ID
    lifecycleStates: [ACTIVE, PAUSED, REBUILD, RETIRED, REMOVED]
    missingLifecycleStateDefaultsTo: ACTIVE
    catalogAbsenceMeansNotDiscoverableForAutonomousDevelopment: true
    staleCompanyStatusCannotResurrectMissingCatalogGame: true
    staleQueueCannotResurrectInactiveGame: true
    sourceFilesMayRemainArchivedAfterRetireOrRemove: true
    sourceFileExistenceDoesNotImplyActiveLifecycle: true
    stateRules:
      ACTIVE:
        developmentDiscoveryAllowed: true
        newTaskCreationAllowed: true
        countsTowardDevelopmentPipeline: true
      PAUSED:
        developmentDiscoveryAllowed: false
        newTaskCreationAllowed: false
        queuedTasksMustCancel: true
        runningTaskMustStopAtNextSafeBoundary: true
        countsTowardDevelopmentPipeline: false
        sourcePreserved: true
      REBUILD:
        developmentDiscoveryAllowed: true
        newTaskCreationAllowed: true
        countsTowardDevelopmentPipeline: true
        rebuildFromApprovedDesignRequired: true
      RETIRED:
        developmentDiscoveryAllowed: false
        newTaskCreationAllowed: false
        queuedTasksMustCancel: true
        runningTaskMustStopAtNextSafeBoundary: true
        countsTowardDevelopmentPipeline: false
        autonomousRediscoveryForbidden: true
        sourcePreservedByDefault: true
      REMOVED:
        developmentDiscoveryAllowed: false
        newTaskCreationAllowed: false
        queuedTasksMustCancel: true
        runningTaskMustStopAtNextSafeBoundary: true
        countsTowardDevelopmentPipeline: false
        autonomousRediscoveryForbidden: true
    developmentPipelineTarget: 60
    activeDevelopmentWipMax: 20
    readyBacklogPreferredRange: [25, 30]
    reworkRebuildPreferredRange: [10, 15]
    releasedLiveUsesSeparateSlots: true
    automaticDropOnScoreFailureForbidden: true
    repeatedFailureEscalation:
      first: FIX_FAILED_AXIS_AND_REVALIDATE
      second: REIMPLEMENT_FAILED_SUBSYSTEM
      third: REVIEW_CORE_LOOP_AND_SYSTEM_CONNECTIONS
      fourth: REBUILD_FROM_APPROVED_DESIGN
      fifthOrLater: RETIRE_REVIEW_REQUIRES_STRUCTURAL_FAILURE_EVIDENCE
    structuralFailureRequiredForRetire: true
    emptyPipelineSlotsMustBeRefilledFromNewDesignPassedSeeds: true
    bottleneckResolutionPriority:
      - WEB_SCORE_80_TO_88_WEAK_AXIS_IMPROVEMENT
      - SINGLE_HARD_GATE_BLOCKER
      - FIRST_REWORK_ATTEMPT
      - REBUILD_QUEUE
      - NEW_DEVELOPMENT
    webPrePromotionImprovement:
      rangeMinInclusive: 80
      rangeMaxInclusive: 88
      targetScore: 89
      preserveExisting90PromotionGate: true
      useLatestDevelopmentValidationStatus: true
      useLatestWebValidationEvidence: true
      weakAxisOrBlockerEvidenceRequired: true
      noBlindScoreInflationTasks: true
    staleCatalogMissingProjectMustBecomeLifecycleInactive: true
    existingDevelopmentConfirmedReconciliation:
      activeOrRebuildCatalogGameMustHaveDevelopmentQueueEntry: true
      existingPlayableWebGameMissingValidationMustStillEnterDevelopment: true
      missingValidationCannotBecomeNoSafeAutonomousTask: true
      preserveExistingSourceBeforeAnyRegeneration: true
      firstContinuationGoal: REAL_GAMEPLAY_IMPLEMENTATION_AND_VALIDATION_READINESS
      catalogLifecycleRemainsCanonicalAuthority: true
  categoryAndPlatform:
    legacySixRepresentativeSetsAreHistoricalOnlyForScheduling: true
    fixedSixCategoryProductionQuotaForbidden: true
    categorySelectionMayRoundRobin: true
    selectedPlatformMustDriveImplementationAndScoring: true
    webIsNotNativeDevelopmentSubstitute: true
  webToTargetPlatformContinuity:
    mode: WEB_PORTABLE_BASE_THEN_NATIVE_CONTINUATION
    webPhaseIsDisposablePrototype: false
    webPhasePurpose:
      - REAL_PLAYABLE_VALIDATION
      - PORTABLE_GAMEPLAY_BASE_IMPLEMENTATION
      - SYSTEM_CONTRACT_STABILIZATION
    portableBaseRequiredBeforeTargetPlatformDispatch: true
    portableBaseMustCover:
      - CORE_LOOP_RULES
      - GAME_STATE_MODEL
      - PROGRESSION_MODEL
      - ECONOMY_AND_REWARD_SEMANTICS
      - SAVE_AND_RECOVERY_SEMANTICS
      - CONTENT_AND_LEVEL_SCHEMA
      - BALANCE_AND_DIFFICULTY_RULES
      - INPUT_ACTION_ABSTRACTION
      - UI_STATE_CONTRACT
      - FAILURE_RETRY_AND_SESSION_FLOW
    platformHandoff:
      source: CURRENT_VALIDATED_WEB_COMPANION_PLUS_APPROVED_DESIGN_BASELINE
      target: PROJECT_SELECTED_PLATFORM
      preserveValidatedGameplaySemantics: true
      silentCoreSystemReimplementationDriftForbidden: true
      platformSpecificAdaptationRequired: true
      nativeEvidenceRequiredIndependently: true
      webEvidenceCannotSubstituteNativeEvidence: true
      nativeMayExtendPortableBase: true
      nativeMayReplaceWebSpecificRenderingAndInputLayers: true
      nativeMustPreserveSaveProgressionEconomyMeaningUnlessApprovedDesignRevisionExists: true
    ROBLOX:
      secondStageRole: NATIVE_CONTINUATION_AND_EXPANSION
      inheritPortableBaseContracts: true
      requiredNativeLayers:
        - ROBLOX_INPUT_AND_MOBILE_UX
        - ROBLOX_CLIENT_SERVER_AUTHORITY
        - ROBLOX_SESSION_AND_RESPAWN
        - ROBLOX_DATASTORE_OR_PROJECT_SAVE_ADAPTER_WHEN_APPLICABLE
        - ROBLOX_NETWORKING_AND_MULTIPLAYER_WHEN_DESIGNED
        - ROBLOX_PERFORMANCE_AND_STREAMING
        - ROBLOX_PLATFORM_FEEDBACK_AND_PRESENTATION
      validatedWebCoreRegressionForbidden: true
  postReleaseFocusedDevelopment:
    enabled: true
    scope: RELEASE_CONFIRMED_ROBLOX_ACTIVE_OR_REBUILD
    protectedRunnerSlots: 1
    oneFocusedTaskRunningGlobally: true
    continuousRefill: true
    refillUntil:
      - OWNER_DIRECTIVE_STOPS_OR_REPRIORITIZES
      - GAME_LIFECYCLE_NOT_ACTIVE_OR_REBUILD
      - STRUCTURAL_RETIRE_DECISION
    releaseEndsInitialDevelopmentOnly: true
    liveDevelopmentContinuesAfterRelease: true
    taskGenerationMode: EVIDENCE_DRIVEN_ROTATING_QUALITY_AXIS
    focusAxes:
      - CORE_LOOP_DEPTH
      - CONTENT_VARIATION
      - PROGRESSION_AND_ECONOMY
      - MOBILE_INPUT_AND_UX
      - SAVE_SESSION_AND_RECOVERY
      - PERFORMANCE_AND_LONG_SESSION_STABILITY
      - BALANCE_AND_REWARD
      - VISUAL_AUDIO_FEEDBACK
      - SOCIAL_OR_MULTIPLAYER_WHEN_DESIGNED
    noBlindChurn: true
    preserveCoreDesignUnlessApprovedRevision: true
    preserveSaveMeaning: true
    preservePublishedProjectIdentity: true
    everyChangeRequires:
      - TARGETED_NATIVE_QA
      - REGRESSION_CHECK
      - CURRENT_SOURCE_BINDING
      - LIVE_VERSION_UPDATE_GATE
    learningContext:
      useVerifiedVibeMemory: true
      useTransformativeRecombinationWhenEligible: true
      learningMayExpandAuthority: false
  developmentConcurrency:
    scope: DEVELOPMENT_CONFIRMED_SELECTED_PLATFORM_GAME_IMPLEMENTATION
    concurrentGameWipTarget: 20
    concurrentGameWipMax: 20
    globalAcrossConfiguredSelectedPlatformExecutors: true
    parallelExecutionDefault: true
    webValidationParallelismTarget: 20
    webValidationParallelismMax: 20
    adaptiveBackpressureSteps: [20, 16, 12, 8, 4]
    independentGamesMustRunInParallelWhenCapacityExists: true
    sameSourceRootParallelAllowedWhenResponsibleFilesExplicitAndDisjoint: true
    sameResponsibleFileParallelForbidden: true
    sharedSaveSchemaWritesExclusive: true
    centralPolicyWritesExclusive: true
    parallelismContractGateRequired: true
    sharedRuntimeStatePersistedBySingleAggregationStep: true
    validationTiers:
      - MICRO_TARGETED_CHECK
      - FAST_INITIAL_INTEGRATION
      - FULL_FINAL_VALIDATION
    qualityAndEvidenceGatesUnchanged: true
    representativeCanaryMayTemporarilyReduceActiveWorkers: true
    runtimeRunnerCapacityMayReduceActualConcurrencyWithoutChangingParallelFirstPolicy: true
  multiplayer:
    decisionStage: GAME_DESIGN
    allowedModes:
      - SINGLE
      - COOP
      - COMPETITIVE
      - HYBRID
    lateUnplannedMultiplayerAttachmentForbidden: true
    multiplayerDesignMustDefineParticipantsSessionJoinRulesRewardsExitReconnectAndCoreInteraction: true
    multiplayerQaRequiresTwoOrMoreRealParticipantsWhenApplicable: true
    meaningfulLoopRequired: MEET_TO_COOPERATE_OR_COMPETE_TO_RESULT_TO_REWARD_OR_PROGRESSION
  firstSession:
    initialImplementationMinimumUnit: ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE
    initialImplementationTimeQuotaMinutes: null
    meaningfulMinutesRequiredAtInitialGeneration: null
    finalContentDepthMinutesRequired: 30
    thirtyMinuteRequirementStage: FINAL_CONTENT_DEPTH_VALIDATION_ONLY
    thirtyMinuteInitialGenerationHardGateForbidden: true
    completePlayableCycleRequires:
      - START_OR_WORLD_ENTRY
      - REAL_PLAYER_INPUT
      - CORE_GAMEPLAY_ACTION
      - OBSERVABLE_WORLD_OR_SYSTEM_STATE_CHANGE
      - PROGRESSION_REWARD_OR_MEANINGFUL_CHOICE
      - RISK_FAILURE_OR_RESOURCE_PRESSURE
      - CYCLE_END_GOAL_OR_RETRY
    existingRealGameMustBePreservedAndRevalidatedBeforeRegeneration: true
    testHarnessOrValidationPanelAsGameplayForbidden: true
    directTimeStageControlForbidden: true
    fakeProgressForValidationForbidden: true
    finalContentDepthAppliedOnlyAfterCompleteCycleAndContentExpansion: true
    finalContentDepthMustComeFromGameplayProgression: true
    finalContentDepthDirectMinuteButtonsForbidden: true
    phases:
      - MINUTE_0_TO_5_CONTROL_OBJECTIVE_WORLD_ENTRY
      - MINUTE_5_TO_15_CORE_LOOP_REPETITION_AND_FIRST_PROGRESSION_OR_CHOICE
      - MINUTE_15_TO_25_VARIATION_ESCALATION_STORY_OR_STRATEGY_CHANGE
      - MINUTE_25_TO_30_MID_GOAL_REWARD_AND_NEXT_PLAY_MOTIVATION
    paddingByHealthIdleWaitOrPureRepetitionForbidden: true
  strictHardGatePolicy:
    scoreCannotOverrideHardGate: true
    stageApplicability:
      30MIN_CONTENT_FAIL: FINAL_CONTENT_DEPTH_GATE_ONLY
    hardRejectCodes:
      - DESIGN_MISMATCH
      - STORY_INCOHERENT
      - CORE_FUN_WEAK
      - 30MIN_CONTENT_FAIL
      - MULTIPLAYER_MISSING
      - CATEGORY_MISMATCH
      - IMPLEMENTATION_INCOMPLETE
      - ARTBOOK_MISMATCH
      - REPETITIVE_CONTENT
      - GENERIC_TEMPLATE
      - TARGET_PLATFORM_UX_FAIL
      - FATAL_RUNTIME_BUG
      - QA_EVIDENCE_MISSING
    rejectHandling:
      correctable: FIX_EXISTING_CANDIDATE_AND_REVALIDATE
      structural: REMOVE_TEST_CANDIDATE_AND_REBUILD_FROM_APPROVED_DESIGN
      automaticDropOnFirstFailureForbidden: true
  stageGateScoringV2:
    version: 2
    ownerConfirmedAt: 2026-09-17
    preserveExistingFlowAndStateTransitions: true
    scoreScalePerGate: 100
    scoresAreIndependentBetweenGates: true
    scoreCarryForwardForbidden: true
    bonusPointsForbidden: true
    penaltyPointsForbidden: true
    scoringMethod: DIRECT_EVIDENCE_BASED_PARTIAL_SCORE
    directScoreLevels: [0, 20, 40, 60, 80, 100]
    directScoreMeaning:
      0: MISSING
      20: SHELL_OR_DECLARATION_ONLY
      40: BASIC_FUNCTION_EXISTS
      60: REAL_RUNTIME_FUNCTIONS
      80: INTERCONNECTED_WITH_OTHER_GAME_SYSTEMS
      100: QUALITY_STABILITY_AND_REVALIDATION_PROVEN
    scoreCannotOverrideHardGate: true
    criticalAxisMinimumPercent: 75
    criticalAxisScope:
      DESIGN_GATE: ALL_APPLICABLE_AXES
    weakCriticalAxisScoreCap: 79
    weakCriticalAxisCreatesHardFailure: true
    runtimeEvidencePreferredOverSourceClaims: true
    sourceKeywordOnlyScoringForbidden: true
    gates:
      DESIGN_GATE:
        currentPassMinimum: 80
        minimumPerApplicableAxisPercent: 75
        weakApplicableAxisScoreCap: 79
        weakApplicableAxisCreatesHardFailure: true
        thirtyMinuteContentDepthHardGate: FORBIDDEN
        thirtyMinuteRequirementStage: FINAL_CONTENT_DEPTH_GATE_ONLY
        robloxGenreProfile:
          required: true
          decisionStage: DESIGN_GATE
          taxonomy: ROBLOX_CREATOR_HUB_EXPERIENCE_GENRES
          selectionRule: PRIMARY_CORE_GAMEPLAY_BEST_MATCH
          genreCount: 1
          subgenreCountMax: 1
          playModeSource: MULTIPLAYER_DESIGN_MODE
          allowedPlayModes: [SINGLE, COOP, COMPETITIVE, HYBRID]
          persistTargets: [STRICT_DESIGN_REVIEW_EVIDENCE, ACTIVE_GAME_SEED]
          homepageSource: DESIGN_GATE_PROFILE_ONLY
          homepageIndependentInferenceForbidden: true
          homepageGameIdDisplayForbidden: true
        axes:
          IDEA_AND_DISTINCTNESS: 12
          CATEGORY_IDENTITY: 10
          CORE_LOOP_DESIGN: 14
          SYSTEM_INTERCONNECTION_DESIGN: 12
          PROGRESSION_ECONOMY_BALANCE_DESIGN: 10
          CONTENT_EXPANSION_PLAN: 10
          FAILURE_RETRY_RISK_DESIGN: 8
          PLATFORM_FIT_DESIGN: 8
          UX_AND_ACCESSIBILITY_PLAN: 6
          ART_AUDIO_DIRECTION: 5
          IMPLEMENTATION_FEASIBILITY_AND_TRACEABILITY: 5
      WEB_INITIAL_PLAYABLE_GATE:
        currentPassMinimum: 80
        axes:
          COMPLETE_PLAYABLE_CYCLE: 18
          REAL_INPUT_AND_CONTROL: 12
          OBSERVABLE_STATE_CHANGE: 12
          CORE_SYSTEM_CONNECTIVITY: 12
          REAL_GOAL_FAILURE_RETRY: 12
          CATEGORY_CORE_MECHANIC: 12
          WEB_MOBILE_PLAYABILITY: 10
          BASIC_RUNTIME_STABILITY: 7
          NO_PROXY_NO_FAKE_PROGRESS: 5
      WEB_STRICT_IMPLEMENTATION_GATE:
        currentPassMinimum: 80
        composition:
          COMMON_GAME_QUALITY: 55
          CATEGORY_SPECIFIC_QUALITY: 25
          WEB_PLATFORM_QUALITY: 20
        commonAxes:
          CORE_GAME_LOOP: 8
          CONTROLS_AND_GAME_FEEL: 7
          SYSTEM_CONNECTIVITY: 7
          CONTENT_DEPTH_AND_VARIATION: 7
          PROGRESSION_AND_REWARD: 5
          DIFFICULTY_AND_BALANCE: 5
          FAILURE_AND_RETRY: 4
          FUNCTIONAL_UI_UX: 4
          STABILITY: 4
          SAVE_AND_RECOVERY: 4
        webPlatformAxes:
          MOBILE_TOUCH_AND_SIMULTANEOUS_INPUT: 4
          BROWSER_PERFORMANCE: 3
          VIEWPORT_SIZE_AND_ROTATION: 2
          BACKGROUND_TAB_RESUME: 2
          REFRESH_STATE_RECOVERY: 2
          KEYBOARD_TOUCH_INPUT_COMPATIBILITY: 2
          LOW_END_DEVICE_STABILITY: 2
          LONG_SESSION_MEMORY_AND_LISTENER_STABILITY: 2
          BROWSER_ERROR_RECOVERY: 1
        categoryAxesMustUseApprovedDesignProfile: true
      FINAL_CONTENT_DEPTH_GATE:
        currentFlowRequirement: REAL_30_MINUTE_CONTENT_DEPTH
        axes:
          EARLY_GAME_CHANGE: 12
          MID_GAME_CHANGE: 16
          LATE_GAME_CHANGE: 16
          NEW_MECHANIC_OR_STRATEGIC_DIMENSIONS: 14
          CONTENT_BEHAVIORAL_DIVERSITY: 14
          PACING_AND_REPETITION_CONTROL: 12
          DIFFICULTY_GROWTH_AND_RECOVERY: 8
          REWARD_AND_NEXT_PLAY_MOTIVATION: 8
      WEB_PLATFORM_PROMOTION_GATE:
        currentPassMinimum: 90
        independentRevalidationRequired: true
        usesCurrentWebStrictScore: true
        additionalAxes:
          CURRENT_SOURCE_BINDING: 20
          CURRENT_DESIGN_BASELINE_BINDING: 15
          INDEPENDENT_SECOND_RUNTIME_PASS: 25
          SECOND_CONTENT_DEPTH_PASS: 20
          REGRESSION_STABILITY: 10
          EVIDENCE_CONFIDENCE: 10
      TARGET_PLATFORM_IMPLEMENTATION_GATE:
        passMinimum: 90
        axes:
          VALIDATED_WEB_CORE_PORT_FIDELITY: 15
          TARGET_PLATFORM_NATIVE_INPUT_UX: 15
          TARGET_PLATFORM_RUNTIME_AND_PERFORMANCE: 15
          CATEGORY_CORE_QUALITY: 15
          SYSTEM_CONNECTIVITY: 10
          SAVE_NETWORK_SESSION_PLATFORM_SERVICES_WHEN_APPLICABLE: 10
          CONTENT_AND_PROGRESSION_PARITY_OR_EXPANSION: 10
          REGRESSION_AND_RECOVERABILITY: 10
        platformSpecificProfileRequired: true
        webScoreSubstitutionForbidden: true
      RELEASE_GATE:
        passMinimum: 90
        axes:
          FULL_GAMEPLAY_COMPLETION: 15
          CATEGORY_QUALITY: 10
          PLATFORM_QUALITY: 10
          CONTENT_DEPTH: 10
          BALANCE_AND_EXPLOIT_RESISTANCE: 10
          SAVE_MIGRATION_AND_RECOVERY: 10
          PERFORMANCE_AND_LONG_SESSION_STABILITY: 10
          REGRESSION_STABILITY: 10
          UX_ACCESSIBILITY_AND_FEEDBACK: 5
          RELEASE_EVIDENCE_TRACEABILITY: 10
      LIVE_VERSION_UPDATE_GATE:
        passMinimum: 80
        scoreStoredPerVersion: true
        releaseScoreRemainsImmutable: true
        axes:
          NEW_CONTENT_SUBSTANCE: 20
          EXISTING_SYSTEM_INTEGRATION: 15
          GAMEPLAY_CHANGE_VALUE: 15
          CATEGORY_FIT: 10
          PLATFORM_FIT: 10
          BALANCE: 10
          REGRESSION_STABILITY: 10
          SAVE_PERFORMANCE_AND_COMPATIBILITY: 10
      EXPANSION_PACK_GATE:
        passMinimum: 85
        scoreStoredPerExpansion: true
        releaseScoreRemainsImmutable: true
        axes:
          NEW_CORE_CONTENT: 20
          NEW_SYSTEM_OR_MECHANIC: 15
          NEW_AREA_STAGE_OR_PROGRESSION_AXIS: 15
          EXISTING_SYSTEM_INTEGRATION: 10
          NEW_ENEMY_NPC_BOSS_BEHAVIORAL_DISTINCTNESS: 10
          PROGRESSION_AND_ECONOMY_EXPANSION: 10
          CATEGORY_IDENTITY_STRENGTH: 5
          PLATFORM_QUALITY: 5
          BALANCE: 5
          REGRESSION_SAVE_COMPATIBILITY_AND_STABILITY: 5
    liveContentContinuation:
      releaseEndsInitialDevelopmentOnly: true
      releasedGamesRemainEligibleForContinuousContentExpansion: true
      nextVersionPlanningAfterSuccessfulRelease: true
      updateScoreMustNotReplaceReleaseScore: true
      expansionScoreMustNotReplaceReleaseScore: true
      scoreHistoryRequired: true
  
  
  webImplementationReview:
    appliesTo: WEB_REAL_PLAYABLE_IMPLEMENTATION
    scoreScale: 100
    hardGateBeforeScoring: true
    hardGateFailureForbidsTop30AndPlatformDispatch: true
    hardGates:
      - REAL_PLAYABLE_GAME
      - COMPLETE_PLAYABLE_GAMEPLAY_CYCLE
      - REAL_PLAYER_INPUT
      - REAL_GAMEPLAY_SURFACE
      - MEANINGFUL_INTERCONNECTED_GAME_STATE
      - REAL_GOAL_OR_WIN_AND_REAL_FAILURE_PATH
      - NO_TEST_PROXY
      - NO_FAKE_PROGRESS
      - MOBILE_PLAYABLE
      - RUNTIME_STABLE
      - CATEGORY_PROFILE_MATCH
    objectiveScoring:
      order:
        - HARD_GATES
        - OBJECTIVE_RUNTIME_OBSERVATIONS
        - PREDECLARED_RULE_EVALUATION
        - AXIS_SCORE
        - REQUIRED_AXIS_MINIMUMS_AND_SCORE_CAP
        - EVIDENCE_CONFIDENCE
        - REGRESSION_STABILITY
        - PROMOTION_DECISION
      gameQualityScoreRemainsSeparate100PointScale: true
      evidenceConfidenceSeparateFromGameQuality: true
      regressionStabilitySeparateFromGameQuality: true
      confidenceOrStabilityMultiplicationIntoGameQualityForbidden: true
      subjectiveQualityExcludedFromAutomaticPromotionScore: true
      subjectiveQualityReportedSeparately: true
      runtimeOutcomeEvidenceRequiredForAutomaticGameplayScore: true
      sourceKeywordDomLabelOrDeclaredFeatureAloneCannotGrantGameplayScore: true
      sameBuildSeedInputShouldReproduceEquivalentScore: true
      irrelevantGenreAxisStatus: N/A
      strategyRequiredOnlyWhenGenreOrApprovedDesignRequiresIt: true
      commonCriticalAxisMinimumPercent: 75
      categoryAggregateMinimumPercent: 75
      weakCriticalAxisCannotBeAveragedAway: true
      weakCriticalAxisScoreCap: 79
      weakCriticalAxisCreatesHardFailure: true
      evidenceConfidenceMinimum:
        HOMEPAGE_80_GATE: 70
        PLATFORM_90_GATE: 85
      regressionStabilityMinimum:
        HOMEPAGE_80_GATE: 70
        PLATFORM_90_GATE: 90
      qualityBands:
        EXCELLENT: 95_TO_100
        STRONG: 90_TO_94
        ACCEPTABLE: 80_TO_89
        WEAK: 60_TO_79
        BROKEN: 0_TO_59
      measurements:
        - CORE_LOOP_RUNTIME_OUTCOME
        - SYSTEM_CONNECTIVITY_RUNTIME_OUTCOME
        - CONTROLS_AND_INPUT_RUNTIME_OUTCOME
        - PROGRESSION_AND_REWARD_RUNTIME_OUTCOME
        - RISK_FAILURE_RETRY_RUNTIME_OUTCOME
        - CONTENT_PACING_NOT_RAW_CONTENT_COUNT
        - REPETITIVE_FATIGUE
        - DECISION_OUTCOME_QUALITY
        - FALSE_DIVERSITY
        - ECONOMY_HEALTH_WHEN_APPLICABLE
        - DIFFICULTY_CURVE_WHEN_APPLICABLE
        - SAVE_RESTORE_WHEN_APPLICABLE
        - RECOVERABILITY
        - MOBILE_INPUT_QUALITY
        - PEAK_RUNTIME_PERFORMANCE_WHEN_EVIDENCE_EXISTS
        - EARLY_MID_LATE_CONTENT_COVERAGE_AT_FINAL_DEPTH
        - REPEATED_REPAIR_FAILURE_WHEN_HISTORY_EXISTS
      contentPacingRule: NEW_CONTENT_MUST_CHANGE_PLAY_NOT_ONLY_INCREASE_COUNT
      repeatedActionsRestartAndRetryPaddingExcludedFromContentValue: true
      falseDiversityRule: RENAMES_COLORS_OR_NUMERIC_ONLY_VARIANTS_WITHOUT_BEHAVIOR_DIFFERENCE_DO_NOT_COUNT_AS_DISTINCT
      decisionQualityRule: CHOICE_VALUE_REQUIRES_OBSERVED_DIFFERENT_GAMEPLAY_OUTCOME
      economyRule: EVALUATE_MEANINGFUL_RESOURCE_AND_PURCHASE_CHOICES_NOT_FIXED_CURRENCY_AMOUNT
      difficultyRule: EVALUATE_CHALLENGE_GROWTH_RECOVERY_REWARD_AND_PLAYER_GROWTH_RELATION_NOT_MONOTONIC_INCREASE_ONLY
      evidenceMissingForApplicableRequiredMeasurementCannotBeInvented: true
    commonScoreMax: 55
    categoryScoreMax: 25
    webPlatformScoreMax: 20
    commonWeights:
      CORE_GAME_LOOP: 15
      SYSTEM_CONNECTIVITY: 10
      CONTROLS_AND_GAME_FEEL: 8
      FUNCTIONAL_UI_UX: 7
      PROGRESSION_GROWTH_REWARD: 7
      RISK_FAILURE_RETRY: 5
      GAMEPLAY_FEEDBACK: 4
      STABILITY_PERFORMANCE: 4
    categoryProfileMapping:
      ACTION_SURVIVAL_ROGUELITE: SURVIVAL
      SINGLE_DEFENSE_STRATEGY: TOWER_DEFENSE
      PUZZLE: PUZZLE
      CASUAL: DESIGN_DERIVED_PROFILE_REQUIRED
      IDLE_GROWTH_RPG: RPG
      STORY_COMPLETE_RPG: STORY_ADVENTURE
      ROLEPLAY_LIFE_AVATAR: LIFE_ROLEPLAY
      SIMULATOR_TYCOON_INCREMENTAL: TYCOON_SIMULATOR
      BATTLEGROUND_FIGHTING_SHOOTER: BATTLE_SHOOTER
      SURVIVAL_HORROR_ESCAPE: SURVIVAL
      OBBY_PARTY_MINIGAME: OBBY_PLATFORMER
      STORY_RPG_ADVENTURE_RPG: STORY_ADVENTURE
    categoryProfiles:
      SURVIVAL:
        WORLD_AND_MOVEMENT: 8
        RESOURCE_AND_GATHERING: 7
        CRAFTING: 7
        ENEMY_OR_THREAT: 7
        SURVIVAL_PRESSURE: 6
        EXPLORATION_VARIETY: 5
      TOWER_DEFENSE:
        PLACEMENT_AND_ROUTE: 8
        ENEMY_WAVES: 7
        TOWER_VARIETY: 7
        UPGRADES: 6
        ECONOMY: 6
        STRATEGIC_CHOICE: 6
      RPG:
        COMBAT: 8
        QUEST_AND_NPC: 7
        EXPLORATION: 6
        EQUIPMENT_AND_GROWTH: 7
        ENEMY_AND_BOSS: 6
        STORY_AND_WORLD_STATE: 6
      TYCOON_SIMULATOR:
        PRODUCTION_CHAIN: 9
        UPGRADES: 7
        AUTOMATION: 7
        ECONOMY: 7
        AREA_UNLOCK: 5
        MANUAL_AUTOMATION_CHOICE: 5
      PUZZLE:
        PUZZLE_RULE: 9
        REAL_SOLVABILITY: 7
        DIFFICULTY_CURVE: 7
        BOARD_STATE: 6
        MECHANIC_VARIETY: 6
        FEEDBACK: 5
      OBBY_PLATFORMER:
        MOVEMENT_FEEL: 9
        LEVEL_DESIGN: 8
        OBSTACLE_VARIETY: 7
        FAILURE_AND_RETRY: 6
        DIFFICULTY_CURVE: 6
        CHECKPOINTS: 4
      BATTLE_SHOOTER:
        MOVEMENT: 7
        ATTACK_AND_HIT: 8
        ENEMY_AI: 7
        SKILL_AND_COOLDOWN: 6
        COMBAT_OBJECTIVE: 6
        COMBAT_FEEDBACK: 6
      STORY_ADVENTURE:
        EXPLORATION: 7
        QUEST: 7
        NPC_AND_DIALOGUE: 6
        EVENT_AND_STATE_CHANGE: 6
        COMBAT_OR_PUZZLE: 6
        BRANCH_OR_OBJECTIVE: 8
      LIFE_ROLEPLAY:
        WORLD_AND_SPACE: 7
        INTERACTION: 7
        NPC: 6
        LIFE_ACTIVITIES: 7
        CHARACTER_STATE: 6
        FREEDOM_AND_CHOICE: 7
    automatedSignals:
      - UNIQUE_MECHANIC_COUNT
      - UNIQUE_FUNCTIONAL_UI_COUNT
      - GAMEPLAY_ACTION_COUNT
      - STATE_VARIABLE_COUNT
      - MEANINGFUL_STATE_TRANSITION_COUNT
      - SYSTEM_DEPENDENCY_COUNT
      - ENEMY_OR_WORLD_ENTITY_COUNT
      - WIN_PATH_COUNT
      - FAIL_PATH_COUNT
      - GAMEPLAY_SCREEN_RATIO
      - DUPLICATE_ACTION_RATIO
      - TEST_UI_RATIO
    rawUiCountAuxiliaryOnly: true
    equivalentButtonsChangingSameStateCountAsOneFunctionalUi: true
    testAndValidationUiExcludedFromFunctionalUiCount: true
    repeatedActionPaddingDoesNotIncreaseMechanicOrUiScore: true
    categoryInferenceMismatchIsHardGate: true
    initialImplementationScoreMustNotRequireThirtyMinuteDepth: true
    finalThirtyMinuteContentDepthIsSeparateGate: true
    homepageTop30RequiresFinalThirtyMinuteContentDepthPass: true
    platform90DispatchKeepsIndependentWebRevalidationRequirement: true
  artbookLifecycle:
    designOnlyArtbookForbidden: true
    preWebArtbookForbidden: true
    createOnlyAfterWebStrictReview: true
    requiredStage: POST_WEB_STRICT_REVIEW_PRE_HOMEPAGE
    webStrictReviewScoreMinimumForArtbook: 80
    postWebArtbookMustBindApprovedDesignAndValidatedWebBuild: true
    artbookFailureMustNotUndoDesignOrWebPass: true
    artbookFailureBlocksHomepageRegistrationOnly: true
  homepageTesting:
    genreProfileDisplay:
      source: DESIGN_GATE_ROBLOX_GENRE_PROFILE
      requiredFields: [GENRE, SUBGENRE_WHEN_APPLICABLE, PLAY_MODE]
      position: ADJACENT_TO_GENRE
      gameIdVisible: false
      independentHomepageInferenceForbidden: true
    developmentProgressDisplay:
      source: COMPANY_RUNTIME_DEVELOPMENT_QUEUE
      autoRegisterDevelopmentConfirmed: true
      visibilityRequiresDevelopmentProgressOnly: true
      homepageTestEligibleRequired: false
      webStrictScoreRequired: false
      finalThirtyMinuteContentDepthPassRequired: false
      artbookRequired: false
      promotionAndTop30RemainSeparate: true
      displayFields:
        - STATUS
        - CURRENT_STEP
        - SELECTED_PLATFORM
        - SCORE
      developmentCardMustNotClaimValidationOrRelease: true
      developmentWebTestButtonEnabled: true
      developmentWebTestButtonLabel: 웹 테스트
      developmentPlatformTestButtonEnabled: true
      developmentPlatformTestButtonLabelMode: PLATFORM_NAME
      developmentWebAndPlatformTestButtonsMustBeSeparate: true
      missingPlatformTestTargetDisablesOnlyPlatformButton: true
      developmentScoreDisplayEnabled: true
      developmentScoreSource: CURRENT_WEB_INITIAL_CYCLE_STRICT_SCORE
      developmentScoreRequiresInitialCyclePass: true
      developmentScoreRequiresSchema15: true
      developmentScoreRequiresMusicPass: true
      developmentScoreRequiresCurrentSourceAndBaselineBindingWhenAvailable: true
      reworkOrRevalidationScoresNotShownAsCurrent: true
      developmentRanking: SCORE_DESC
      unratedDevelopmentGamesLast: true
    ownerMayTestBeforeFinalPromotion: true
    prePromotionDisplay: DEVELOPMENT_PROGRESS_SHELF_PLUS_SEPARATE_TOP30_TEST_SHELF
    prePromotionOfficialGameCardForbidden: true
    testCandidateMustBeClearlyMarkedNotPass: true
    webStrictScoreMinimum: 80
    hardGatesMustPass: true
    finalThirtyMinuteContentDepthPassRequired: true
    maxVisibleTestCandidates: 30
    ranking: STRICT_IMPLEMENTATION_SCORE_DESC
    artbookRequiredForHomepageRegistration: true
    officialCardRegistrationRequiresStrictPassAndPromotion: true
    reviseCandidateReturnsToSameCompactTestShelfAfterFix: true
  productionThroughput:
    totalWebTestCandidateCountCap: null
    totalGameProductionCountCap: null
    concurrentGameWipMax: 20
    concurrentGameWipScope: GLOBAL_SELECTED_PLATFORM_DEVELOPMENT
    webValidationParallelismTarget: 20
    webValidationParallelismMax: 20
    webValidationParallelFirst: true
    runtimeCapacityMayReduceActualConcurrency: true
    idleAutonomousProduction:
      enabled: true
      requiresNoHigherPriorityWorkForHours: 24
      seedMaterialPoolMustRemainAtTarget: true
      continueWhileIdleAndFreeCapacityExists: true
      totalProductionCountUnlimited: true
      cronRole: WATCHDOG_ONLY
      eventChainRemainsPrimaryProgression: true
    qualityGateWeakeningForThroughputForbidden: true
    optimizationBudget:
      blockingBudgetMinutes: 10
      maxAttemptsPerOptimizationPass: 2
      timeoutAction: DEFER_NON_BLOCKING_OPTIMIZATION_AND_CONTINUE_FROM_LAST_VALIDATED_STATE
      correctnessSafetyOrHardGateFailureStillBlocks: true
      repeatedOptimizationMustNotStarveOtherGames: true
    modelExecutionBudget:
      designWorkflowTimeoutMinutes: 45
      singleModelCallTimeoutSeconds: 150
      designSchemaAttemptsMax: 2
  learningFeedback:
    continueLearning: true
    recordPassReviseRebuildCauses: true
    recordFixAndRevalidationOutcome: true
    designReviewFeedbackStoredAsUnvalidatedLearningCandidate: true
    designReviewFeedbackFeedsNextDesignContext: true
    recordMaterialFamiliesAndCombinations: true
    nextMaterialSelectionMayUsePreferAvoidSignals: true
    designOpinionAloneCannotBecomeValidatedTrainingSuccess: true
    validatedRuntimeEvidenceRequiredForPositiveTrainingSignal: true
    originalNamesStoryCharactersWorldMapsArtOrCodeMustNotBeCopiedThroughLearning: true
    existingCanonicalDistillationAndTrainerOnly: true
    newParallelTrainerForbidden: true

pipelineExecution:
  existingPipelineIsAuthoritative: true
  reuseExistingPipelineRequired: true
  adHocBypassChainForbidden: true
  wrapperOrShadowChainForbidden: true
  repairExistingPipelineAtFailurePoint: true
  pushWorkForwardThroughExistingStages: true
  followCanonicalStageOrder: true
  duplicateTriggerPathForbidden: true
  temporaryRecoveryMustRejoinCanonicalPipelineImmediately: true
  cronOrIndependentLoopMustNotReplaceExistingEventChain: true

documentationSynchronization:
  centralPolicyFirst: true
  nonCanonicalPolicyDocumentMode: MACHINE_POINTER_ONLY
  humanReadablePolicyReplicationForbidden: true
  ownerDirectiveNaturalLanguageReplicationForbidden: true
  ownerDirectiveParaphraseForbidden: true
  ownerDirectiveVerbatimReplicationForbidden: true
  workDocumentsMustMirrorCurrentCentralPolicy: false
  workDocumentsMayContainPolicyNarrative: false
  workDocumentsMayContainOwnerDirectiveNarrative: false
  syncRelevantWorkDocumentsOnEveryPolicyChange: false
  implementationWorkStartsAfterCentralPolicyUpdate: true
  workDocumentsCannotOverrideCentralPolicy: true
  canonicalReferenceRequired: COMPANY_FLOW.md

homepageOperations:
  mode: SINGLE_MANAGER_WITH_SINGLE_POST_WORK_SUPERVISOR
  manager: HOMEPAGE
  supervisor: DIRECTOR
  managerCount: 1
  supervisorCount: 1
  centralPolicyAndEvidenceDrivenSync: true
  managerAutonomousScope:
    - HERO_AND_FRONT_PAGE_COMPOSITION
    - LAYOUT_AND_TEMPLATE
    - CARD_GRID_AND_SECTION_ORDER
    - RESPONSIVE_MOBILE_PRESENTATION
    - FILTER_NAVIGATION_DISPLAY
    - REPRESENTATIVE_IMAGE_PRESENTATION
    - ARTBOOK_ENTRY_PRESENTATION
    - CANONICAL_STATUS_DISPLAY_SYNC
  evidenceBoundPromotionRequired: true
  fixedFunctionProtection:
    ownerLocked: true
    protectedFunctions:
      - PWA_APP_INSTALL_AND_OFFLINE_RUNTIME
      - PWA_COMMAND_CHAT_WINDOW
      - OWNER_FIXED_EXISTING_HOMEPAGE_FUNCTIONS
    canonicalPwaFiles:
      - manifest.webmanifest
      - install.html
      - sw.js
      - offline.html
      - command.html
    preserveContracts:
      - BEHAVIOR
      - USER_ENTRY_POINT
      - DOM_OR_API_CONTRACT
      - DATA_SOURCE_CONTRACT
      - INSTALL_AND_OFFLINE_RUNTIME
      - CHAT_INPUT_ATTACHMENT_SEND_AND_DEVICE_REGISTRATION_FLOW
    changeRequiresLatestOwnerDirectInstruction: true
  forbiddenAutonomousChanges:
    - COMPANY_POLICY_TRUTH
    - GAME_PRODUCTION_OR_RELEASE_TRUTH
    - UNVERIFIED_DOWNLOAD_OR_PLAY_CLAIM
    - GAME_SOURCE_OR_GAMEPLAY
    - MONETIZATION_PRIVACY_OR_PAID_SERVICE
    - FIXED_FUNCTION_REMOVAL_DISABLEMENT_OR_BEHAVIOR_CHANGE
  afterWorkFlow:
    - HOMEPAGE_MANAGER_APPLY
    - HOMEPAGE_MANAGER_SELF_QA
    - DIRECTOR_SINGLE_POST_WORK_SUPERVISION
    - LIVE_STATUS_CONFIRMATION
  secondHomepageManagerForbidden: true
  secondHomepageSupervisorForbidden: true
  supervisorMayVerifyAndBlockButMustNotSilentlyRewriteManagerOutput: true

production:
  canonicalField: productionClass
  classes:
    DESIGN_ONLY:
      purpose: DESIGN_BASELINE
    DEVELOPMENT_CONFIRMED:
      purpose: DEVELOPMENT_BASELINE
    RELEASE_CONFIRMED:
      purpose: RELEASE_BASELINE
  membership: DYNAMIC_EVIDENCE
  fixedClassCounts: false
  pinnedGameIds: false
  fixedGameCountMin: null
  fixedGameCountMax: null
  fixedPortfolioSize: false
  preserveExistingWebArchives: true
  preserveSaveMeaning: true
  webCompanion:
    requiredForEveryGame: true
    appliesToAllTargetPlatforms: true
    purpose:
      - PLAYABLE_WEB_COMPANION
      - FULL_APPROVED_SCOPE_IMPLEMENTATION
      - BROWSER_QA
      - AUXILIARY_LEARNING_EVIDENCE
    featureParity: FULL_APPROVED_GAMEPLAY_SCOPE_EQUIVALENT_OR_DOCUMENTED_PLATFORM_ADAPTATION
    silentFeatureOmissionForbidden: true
    webBuildIsNotNativeDevelopmentSubstitute: true
    nativePlatformReleaseStillRequiresNativeEvidence: true
  approvedScopeCompletion:
    mode: FULL_APPROVED_DESIGN_SCOPE_REQUIRED
    approvedDesignBaselineMustBeFullyImplemented: true
    silentScopeReductionForbidden: true
    prototypeMayBeIntermediateOnly: true
    prototypeCannotSatisfyCompletionOrReleaseCandidateGate: true
    infeasibleScopeRequiresDesignRevisionBeforeBaselineApprovalOrExplicitOwnerDecision: true
    missingApprovedContentBlocksCompletion: true

portfolioGovernance:
  mode: FIVE_DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO
  gameDevelopmentCountHardMin: null
  gameDevelopmentCountHardMax: null
  fixedGameSlots: false
  oneForOneReplacementRule: false
  automaticGrowthCap: null
  automaticShrinkCap: null
  departmentScoresRequiredForPortfolioDecision: true
  platformScopedRepresentativeSets:
    enabled: true
    sixMeansPerPlatformRepresentativeSetNotGlobalPortfolioCap: true
    representativeSetSizePerPlatform: 6
    representativeSetCompletionIsNotReleaseCount: true
    allRepresentativesAreDevelopmentTargetsAndReleaseCandidates: true
    forcedSixOfSixReleaseForbidden: true
    expansionBeyondRepresentativeSetAllowedWithFiveDepartmentScoreAndEvidence: true
    implementationWip:
      target: 6
      max: 6
      scope: GLOBAL_SELECTED_PLATFORM_DEVELOPMENT
      parallelExecutionDefault: true
      webValidationParallelismTarget: 6
      webValidationParallelismMax: 6
    UNITY:
      preserveExistingHistoricalSix: true
      robloxSetMustNotConsumeOrRewriteUnitySet: true
    ROBLOX:
      currentMainFocus: true
      categories:
        - ROLEPLAY_LIFE_AVATAR
        - SIMULATOR_TYCOON_INCREMENTAL
        - BATTLEGROUND_FIGHTING_SHOOTER
        - SURVIVAL_HORROR_ESCAPE
        - OBBY_PARTY_MINIGAME
        - STORY_RPG_ADVENTURE_RPG
      mandatoryContinuityCategory: STORY_RPG_ADVENTURE_RPG
      discardedMandatoryRepresentativeReopensCategoryGap: true
      historicalUnitySeedsDoNotSatisfyRobloxSlots: true
    FORTNITE_UEFN:
      independentSixCategorySetRequired: true
      mayNotConsumeUnityOrRobloxRepresentativeSlots: true
  departments:
    - planning
    - graphics
    - development
    - qa
    - balance
  scoreScale:
    min: 0
    max: 100
  defaultWeightPerDepartment: 0.2
  scoreDimensions:
    planning:
      - PRODUCT_DIRECTION
      - MARKET_FIT
      - CORE_FUN_CLARITY
      - SCOPE_FEASIBILITY
    graphics:
      - VISUAL_IDENTITY
      - ASSET_FEASIBILITY
      - PRESENTATION_QUALITY
      - PLATFORM_VISUAL_FIT
    development:
      - IMPLEMENTATION_FEASIBILITY
      - ARCHITECTURE_QUALITY
      - PERFORMANCE_RISK
      - MAINTAINABILITY
    qa:
      - PLAYABILITY
      - REGRESSION_RISK
      - PLATFORM_STABILITY
      - RELEASE_CONFIDENCE
    balance:
      - PROGRESSION
      - ECONOMY
      - DIFFICULTY
      - RETENTION_LOOP
  decisionBands:
    EXPAND:
      score: 80_TO_100
      meaning: PORTFOLIO_CAN_EXPAND_WHEN_CAPACITY_AND_EVIDENCE_SUPPORT_IT
    MAINTAIN:
      score: 60_TO_79
      meaning: CONTINUE_CURRENT_PORTFOLIO_AND_IMPROVE
    REVISE_OR_HOLD:
      score: 40_TO_59
      meaning: FIX_WEAK_PROJECTS_BEFORE_ALLOCATING_MORE_CAPACITY
    REDUCE_REVIEW:
      score: 0_TO_39
      meaning: REVIEW_LOW_VALUE_OR_BLOCKED_PROJECTS_FOR_HOLD_DEMOTION_OR_DISCARD
  bandDoesNotImposeNumericGameCount: true
  noSingleDepartmentScoreAutoDiscardsProject: true
  noAggregateScoreAutoDiscardsProject: true
  discardStillRequiresProjectEvidenceAndDiscardPolicy: true
  ownerMayOverridePortfolioDecision: true

bootstrapGameSeeds:
  enabled: true
  historicalInitialSeedBatchCount: 6
  historicalInitialSeedBatchOnly: true
  initialSeedBatchIsProductionQuota: false
  ongoingGameCountNotBoundToInitialSeedBatch: true
  categoriesAreReferenceSetNotSlotQuota: true
  categories:
    - ACTION_SURVIVAL_ROGUELITE
    - SINGLE_DEFENSE_STRATEGY
    - PUZZLE
    - CASUAL
    - IDLE_GROWTH_RPG
    - STORY_COMPLETE_RPG
  ownerMayReplaceOrExpandCategories: true
  replenishment:
    mode: DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO
    oneForOneOnly: false
    replacementCountPerVacancy: null
    automaticGrowthBeyondVacanciesForbidden: false
    expansionOrReductionUsesDepartmentScoresAndEvidence: true

GAME_SEED:
  stage: BEFORE_GAME_DESIGNER_DRAFT
  purpose: DEFINE_WHAT_GAME_TO_BUILD
  selectionMode: FAMOUS_SUCCESSFUL_GAME_COPY_BENCHMARK
  transformationModes:
    - HOMAGE
    - REINTERPRETATION
  primaryIntent: SELECT_SUCCESSFUL_REFERENCE_AND_REBUILD_CORE_SUCCESS_PATTERN
  referenceStrategy:
    mode: FAMOUS_SUCCESSFUL_RELEASED_GAME_BENCHMARK
    sourcesAllowed:
      - FAMOUS_MOBILE_GAMES
      - RELEASED_STEAM_GAMES
      - SUCCESSFUL_ROBLOX_EXPERIENCES
      - SUCCESSFUL_FORTNITE_UEFN_EXPERIENCES
    selectionPriority:
      - PROVEN_COMMERCIAL_OR_POPULAR_SUCCESS
      - CLEAR_PROVEN_CORE_FUN_AND_CORE_LOOP
      - PRIMARY_OR_SELECTED_PLATFORM_FIT
      - PRODUCIBLE_AT_COMPANY_SCALE
      - COMMERCIAL_VIABILITY
      - CROSS_PLATFORM_EXPANSION_VALUE
    mayStudy:
      - CORE_FUN
      - CORE_LOOP
      - COMBAT_TEMPO
      - SESSION_STRUCTURE
      - PROGRESSION_PATTERN
      - ECONOMY_PATTERN
      - UX_PATTERN
      - MARKET_POSITIONING
    mayCarryOverAbstractPatternsThroughReimplementation:
      - GAMEPLAY_RULE_PATTERN
      - CORE_LOOP_PATTERN
      - PROGRESSION_STRUCTURE_PATTERN
      - ECONOMY_STRUCTURE_PATTERN
      - SESSION_STRUCTURE_PATTERN
      - UX_PATTERN
    mustReinterpret:
      - WORLD_AND_SETTING
      - VISUAL_IDENTITY
      - CHARACTERS
      - SYSTEM_COMBINATION
      - PROGRESSION_EXPRESSION
      - PRESENTATION_AND_DIRECTION
    directCopyForbidden:
      - SOURCE_CODE
      - ART_ASSETS
      - AUDIO
      - CHARACTERS
      - NAMES
      - STORY_TEXT
      - MAPS
      - UI_ARTWORK
      - TRADE_DRESS
    sourceCodeRule: IMPLEMENT_EQUIVALENT_OR_INSPIRED_FUNCTIONALITY_WITH_OWN_CODE
    requirement: HOMAGE_OR_REINTERPRET_REFERENCE_INTO_DISTINCT_GAME_IDENTITY
  marketEvidence:
    role: TARGET_DESIGN_REFERENCE
    targetMarketScope: GLOBAL
    countrySpecificEvidenceRole: SECONDARY_CONTEXT_ONLY
    defaultTargetMustNotBeCountrySpecific: true
    hardPassFailGate: false
    missingMarketDataDoesNotAutoRejectSeed: true
    marketDataAloneCannotDiscardGame: true
    numericClaimRequiresSource: true
    numericClaimRequiresObservedAt: true
    unverifiableNumericClaimForbidden: true
    unavailableFieldMayBeUNKNOWN: true
  requiredFields:
    - GAME_CATEGORY
    - REFERENCE_GAMES
    - CORE_FUN_TO_LEARN
    - CORE_LOOP
    - DISTINCT_IDENTITY
    - MARKET_EVIDENCE_SUMMARY
    - TARGET_AUDIENCE
    - TARGET_SESSION_DIRECTION
    - INITIAL_TARGET_PLATFORM
    - INITIAL_PLAY_MODE
    - CROSS_PLATFORM_EXPANSION_VALUE
  derivedProductionRequirements:
    - MANDATORY_WEB_GAME_COMPANION
    - FULL_APPROVED_SCOPE_IMPLEMENTATION
  initialTargetPlatform: ROBLOX
  allowedTargetPlatforms:
    - ROBLOX
    - UNITY
    - FORTNITE_UEFN
  projectMaySelectAnyAllowedPlatform: true
  primaryPlatformIsDefaultNotLock: true
  initialPlayMode: PROJECT_DEFINED
  commercialRule: INITIAL_GAME_MUST_BE_SELLABLE_OR_MONETIZABLE_FOR_ITS_SELECTED_PLATFORM

discardPolicy:
  general:
    singleFailureDoesNotImmediatelyDiscard: true
    correctableProblemMustAttemptRevisionFirst: true
    marketMetricAloneCannotDiscard: true
    departmentScoreAloneCannotDiscard: true
    ownerMayDiscardDirectly: true
    discardState: DISCARDED
    discardDoesNotCreateMandatoryReplacementCount: true
  DESIGN_ONLY:
    question: CAN_THE_GAME_IDEA_AND_DESIGN_SURVIVE
    firstResponseToFatalIssue: REDESIGN
    requiredBeforeDiscard:
      - FATAL_ISSUE_RECORDED_WITH_EVIDENCE
      - SAME_GAME_DESIGNER_REVISION_ATTEMPTED
      - FIVE_DEPARTMENT_REVIEW_REPEATED
      - SAME_FATAL_OR_EQUIVALENT_STRUCTURAL_BLOCKER_REMAINS
    fatalCriteria:
      - CORE_FUN_CANNOT_BE_RECOVERED
      - HOMAGE_OR_REINTERPRETATION_CANNOT_PRODUCE_DISTINCT_IDENTITY
      - SELECTED_TARGET_PLATFORM_CANNOT_WORK_AS_PRODUCT
      - REQUIRED_PRODUCTION_SCOPE_EXCEEDS_CAPABILITY_AND_SCOPING_DOWN_DESTROYS_CORE_FUN
      - CORE_LOOP_MATERIALLY_DUPLICATES_ANOTHER_ACTIVE_SEED_OR_GAME
      - IP_OR_EXPRESSION_DEPENDENCY_CANNOT_BE_RESOLVED_BY_REINTERPRETATION
      - FATAL_DESIGN_BLOCKER_REMAINS_AFTER_REVISION
    nonDiscardStates:
      - REDESIGN
      - CONFLICT
      - HOLD
    finalOutcomes:
      - ACTIVE
      - REDESIGN
      - DISCARDED
  DEVELOPMENT_CONFIRMED:
    question: CAN_THE_VALIDATED_DESIGN_SURVIVE_REAL_IMPLEMENTATION_AND_PLAY
    firstResponseToFatalIssue:
      - BLOCKED
      - HOLD
      - FIX_AND_REVALIDATE
    requiredBeforeDiscard:
      - REAL_TARGET_PLATFORM_OR_PLAY_EVIDENCE_EXISTS
      - FATAL_ISSUE_RECORDED_WITH_EVIDENCE
      - TARGETED_FIX_ATTEMPTED_WHEN_PRACTICAL
      - TARGETED_REVALIDATION_PERFORMED
      - STRUCTURAL_FATAL_BLOCKER_REMAINS
    fatalCriteria:
      - REAL_PLAY_CORE_FUN_REMAINS_UNACCEPTABLE_AFTER_FIX
      - REPETITION_OR_SESSION_STRUCTURE_REMAINS_UNACCEPTABLE_AFTER_FIX
      - TARGET_PLATFORM_UX_IS_STRUCTURALLY_UNFIT
      - PERFORMANCE_MEMORY_HEAT_OR_RUNTIME_COST_IS_STRUCTURALLY_UNRESOLVABLE
      - IMPLEMENTATION_OR_CONTENT_PRODUCTION_COST_IS_UNSUSTAINABLE
      - ECONOMY_PROGRESSION_OR_BALANCE_REPEATEDLY_COLLAPSES_IN_REAL_PLAY
      - SAME_FATAL_IMPLEMENTATION_OR_PLAY_BLOCKER_REPEATS_AFTER_REVALIDATION
    recoveryBeforeDiscard:
      - FIX_IN_DEVELOPMENT_CONFIRMED
      - HOLD_FOR_EVIDENCE
      - DEMOTE_TO_DESIGN_ONLY_IF_CORE_DESIGN_MUST_BE_REBUILT
    finalOutcomes:
      - DEVELOPMENT_CONFIRMED_CONTINUE
      - HOLD_OR_BLOCKED
      - DEMOTE_TO_DESIGN_ONLY
      - DISCARDED

platformStrategy:
  ownerDirectiveRecordedAt: 2026-09-12
  primaryPlatform: ROBLOX
  priority:
    - ROBLOX
    - UNITY
    - FORTNITE_UEFN
  priorityMeaning: DEFAULT_FOCUS_AND_EXPERIENCE_ACCUMULATION_ORDER_ONLY
  developmentAccess:
    ROBLOX: ALWAYS_ALLOWED
    UNITY: ALWAYS_ALLOWED
    FORTNITE_UEFN: ALWAYS_ALLOWED
  allThreePlatformsMayBeDevelopedConcurrently: true
  priorityDoesNotCreatePlatformLock: true
  designStabilizationScheduling:
    mode: ROBLOX_FIRST_THEN_OTHER_PLATFORMS
    activeWhileMilestone: ROBLOX_FAST_RELEASE_STABILIZATION
    sortKeys:
      - ROBLOX_TARGET_FIRST
      - OLDEST_PENDING_FIRST
    perGameIndependentCompletion: true
    portfolioBarrierForbidden: true
    doesNotChangePassThreshold: true
    doesNotOverrideHardFailures: true
    forcePromotionForbidden: true
  roadmapPhaseEntryGatesForbidden: true
  platformDevelopmentMayStartWithoutPriorPlatformCompletion: true
  platformReleaseMayProceedWhenItsOwnEvidenceGatesPass: true
  noParallelLearningPipeline: true
  runtimeContractMirror: company-learning/platform-release-roadmap.json
  runtimeContractCannotCreatePolicy: true
  webCompanionStrategy:
    requiredAcross:
      - ROBLOX
      - UNITY
      - FORTNITE_UEFN
    nativeProjectRemainsCanonicalForPlatformRelease: true
    webCompanionMaySharePortableCoreLogicWherePractical: true
    platformSpecificRuntimeAndUxRemainPlatformScoped: true
    documentedPlatformAdaptationAllowed: true
    silentApprovedGameplayFeatureOmissionForbidden: true
  commonExecutionContract:
    router: tools/company-selected-platform-router.mjs
    singleRoutingDecisionPoint: true
    commonAdapterContractRequired: true
    commonEvidenceSchemaRequired: true
    allowedPlatforms:
      - ROBLOX
      - UNITY
      - FORTNITE_UEFN
    commonEvidenceFields:
      - PLATFORM
      - SOURCE_REVISION
      - BUILD_OR_PACKAGE_PASSED
      - ARTIFACT_IDENTITY
      - RUNTIME_PASSED
      - INDEPENDENT_QA_PASSED
      - REGRESSION_PASSED
      - EXACT_REVISION
      - LAST_SUCCESSFUL_STAGE
      - FAILURE_STAGE
      - FAILURE_SIGNATURE
    adapters:
      ROBLOX: tools/vibe3-roblox-platform.mjs
      UNITY: tools/company-development-unity-platform.mjs
      FORTNITE_UEFN: tools/company-development-uefn-platform.mjs
  developmentSpeedExecution:
    scope: EXECUTION_SPEED_ONLY
    qualityOrEvidenceGateWeakeningForbidden: true
    parallelFirst: true
    independentGamesRunConcurrentlyWhenCapacityExists: true
    sharedStateWritesUseSingleAggregationPoint: true
    validationTiers:
      - MICRO_TARGETED_CHECK
      - FAST_INITIAL_INTEGRATION
      - FULL_FINAL_VALIDATION
    canonicalSequence:
      - CHANGE_DETECTION
      - CHEAP_PRECHECK
      - REPRESENTATIVE_CANARY
      - SINGLE_BUILD_OR_PACKAGE
      - IMMUTABLE_ARTIFACT_BIND
      - TARGET_PLATFORM_RUNTIME
      - INDEPENDENT_QA
      - REGRESSION
      - IMMEDIATE_NEXT_STAGE_DISPATCH
      - RESUME_EXACT_FAILURE_POINT
    changeDetectionRequiredBeforeExpensiveWork: true
    cheapPrecheckRequiredBeforeCanary: true
    representativeCanaryRequiredWhenSharedExecutionContractChangedOrCommonFailureDetected: true
    canaryPassAllowsRemainingEligibleWorkToProceed: true
    buildOncePerSourceFingerprint: true
    sameArtifactRequiredAcrossRuntimeIndependentQaAndRegression: true
    immutableArtifactIdentityRequired: true
    successfulStageEvidenceReusableWhenSourceFingerprintStillMatches: true
    sourceOrRelevantDependencyChangeInvalidatesAffectedEvidenceOnly: true
    failureMustRecordExactStageAndSignature: true
    retryMustResumeFromExactFailedStageWhenPriorEvidenceStillMatches: true
    successfulStepMustNotBeRepeatedWithoutInvalidatingChange: true
    nextCanonicalStageDispatchImmediatelyAfterSuccess: true
    cronRole: WATCHDOG_AND_RECOVERY_ONLY
    cronMustNotBePrimaryProgressionEngine: true
    existingEventChainPreferred: true
  focusMilestones:
    ROBLOX_FAST_RELEASE_STABILIZATION:
      defaultPriority: 1
      blocksUnityDevelopment: false
      blocksFortniteDevelopment: false
      objective: FAST_REAL_RELEASE_AND_STABILIZATION_EXPERIENCE
    ROBLOX_UNITY_CONCURRENT_RELEASE_EXPERIENCE:
      defaultPriority: 2
      entryGate: false
      objective: CONCURRENT_ROBLOX_AND_UNITY_RELEASE_EXPERIENCE
    FORTNITE_UEFN_EXPANSION:
      defaultPriority: 3
      entryGate: false
      objective: ADD_UEFN_RELEASE_EXPERIENCE_WITHOUT_REPLACING_OTHER_TRACKS
  experienceSharing:
    portableVerifiedPatternsUseExistingV3MemoryAndCanonicalDistillation: true
    platformSpecificImplementationRemainsPlatformScoped: true
    successEvidenceDoesNotTransferAcrossPlatforms: true
  ROBLOX:
    role: PRIMARY_DEFAULT_PLATFORM
    sourceRoot: roblox-games/
    taskType: roblox
    runtimeAndPublishAdapter: tools/vibe3-roblox-platform.mjs
    mobileFirst: true
    requiredQa:
      - LUAU_OR_SOURCE_VALIDATION
      - ACTUAL_RUNTIME_PASS
      - SERVER_CLIENT_BOUNDARY_PASS
      - DATASTORE_REJOIN_PASS_WHEN_SAVE_EXISTS
      - MOBILE_CONTROL_UI_PASS
      - MULTIPLAYER_QA_WHEN_APPLICABLE
      - INDEPENDENT_QA_PASS
      - REGRESSION_PASS
      - EXACT_REVISION
  UNITY:
    role: FULL_SUPPORTED_PLATFORM
    developmentAlwaysAllowed: true
    existingPathPreserved: true
    robloxDoesNotReplaceUnity: true
    existingUnityAndroidSourceBuildRuntimeQaReleaseKnowledgePreserved: true
    expansionVersionRequired: true
    legacyAndroidTrackStillValidWhenTargetIsUnity: true
    runtimeValidation:
      apkAbiMustMatchRuntimeAbi: true
      arm64ApkRequiresArm64Runtime: true
      architectureTranslationDoesNotCountAsRuntimePass: true
      configuredAndroidApiMustMatchRuntimeApi: true
      canonicalDevelopmentRuntime: REDROID_NATIVE_ARM64_ANDROID_16
      canonicalRunnerArchitecture: ARM64
      canonicalAndroidApi: 36
      paidRuntimeRequired: false
      legacyBuildChildRuntimeGateDoesNotCreateCanonicalRuntimeEvidence: true
      sameImmutableApkRequiredAcrossRuntimeIndependentQaRegression: true
      existingRuntimeGateMustBeRepairedNotDuplicated: true
      runtimeSmokeContractMustRemainSame: true
    projectStrategy:
      oneGameOneUnityProject: true
      coreGameplayPlatformIndependentWherePractical: true
      inputUiPlatformAdaptersAllowed: true
  FORTNITE_UEFN:
    role: FULL_SUPPORTED_PLATFORM
    developmentAlwaysAllowed: true
    robloxOrUnityCompletionNotRequiredToDevelop: true
    platformSpecificPlaybookRequired: true
    verseUefnRuntimeQaRequiredForVerifiedSuccess: true
    publishingEvidenceRequiredForReleaseClaim: true

aiOrganization:
  departments:
    - planning
    - graphics
    - development
    - qa
    - balance
  departmentMultimodelStartsAt: DEVELOPMENT_CONFIRMED
  fiveDistinctLeadModelIdsRequiredPerCycle: true
  designOnlyReviewMode: DETERMINISTIC_EVIDENCE_NO_AI_VERDICT
  designOnlyModelsPerDepartment: 1
  minDistinctModelsPerDepartment: 1
  structurePerDepartment:
    leadCount: 1
    assistantMinCount: 0
    allModelsWithinDepartmentMustBeDistinct: false
  assistantModelsMayOverlapAcrossDepartments: true
  leadModelAssignmentRemappable: true
  paidAiAllowed: false
  paidRunnerAllowed: false
  providerMode: GEMINI_PRIMARY_VIBE_LOCAL_FALLBACK
  providerSecret: GEMINI_API_KEY
  openAiProviderAllowed: false
  ollamaProviderAllowed: true
  localModelFallbackAllowed: true
  geminiModels:
    - gemini-3.8-flash
    - gemini-3.7-flash
    - gemini-3.6-flash
    - gemini-3.5-flash
    - gemini-3.5-flash-lite

assetPolicy:
  centralSourceOnly: true
  visibleGameElementsRequireRealAssets: true
  visibleElementScope:
    - BACKGROUND
    - TERRAIN
    - FLOOR
    - CHARACTER
    - NPC
    - ENEMY
    - BOSS
    - ENVIRONMENT_OBJECT
    - RESOURCE
    - BUILDING
    - WEAPON
    - ARMOR
    - ITEM
    - PROJECTILE
    - UI_ICON
    - VFX
  finalPlaceholderVisualsForbidden:
    - PRIMITIVE_SHAPE
    - SOLID_COLOR_OBJECT
    - EMOJI
    - TEXT_CHARACTER_AS_ACTOR
  assetReplacementMustNotChangeGameplayOrSaveMeaningWithoutOwnerDecision: true
  missingRequiredAssetCannotBeReportedAsComplete: true
  actorAnimation:
    appliesTo:
      - CHARACTER
      - MONSTER
      - BOSS
    verifiedAnimationRequired: true
    staticActorForbidden: true
    staticImageSlidingAsAnimationForbidden: true
    spriteSheetOrFrameEvidenceRequired: true
    runtimePreviewOrDocumentedAnimationEvidenceRequired: true
    movementAnimationRequired: true
    acceptedMovementExamples:
      - MOVE
      - WALK
      - RUN
      - JUMP
      - FLY
      - SWIM
      - CRAWL
    selectorValidation: assets/asset-selector.js
    manifestVerifiedAnimationRequired: true
  catalog:
    verifiedAnimatedAssetCatalog: assets/animated-assets.json
    sharedAnimatedAssetRoot: assets/animated/
    actorCandidateRequiresVerifiedAndActorUsable: true
    downloadedFalseMeansSourceVerifiedOnly: true
    localUseRequiresDownloadedTrueAndRecordedPath: true
  preferredFormats:
    image: WEBP
    transparentSprite: PNG_ALLOWED
    audio: OGG_PREFERRED_MP3_WAV_ALLOWED
    font: WOFF2
  developmentMusic:
    requiredInWebValidation: true
    firstUserGestureUnlockRequired: true
    autoplayBeforeUserGestureForbidden: true
    muteControlRequired: true
    volumeControlRequired: true
    runtimeStateEvidenceRequired: true
    allowedImplementationModes:
      - WEB_AUDIO_SYNTH
      - LOCAL_LICENSED_AUDIO
    externalTrackRequiresLicenseLedger: true
    runtimeNetworkAudioDependencyForbidden: true
    musicFailureBlocksTargetPlatformDispatch: true
  sizeGuidance:
    ordinaryAssetPreferredMaxMb: 1
    perGameAdditionalAssetsPreferredRangeMb: 20_TO_50
    ordinaryGitSingleFileHardAvoidAtOrAboveMb: 100
    sourceMasterFilesShouldNotBeCommittedWhenOptimizedRuntimeAssetIsSufficient: true
  storage:
    sharedAssets: assets/
    sharedAnimatedAssets: assets/animated/
    animatedCatalog: assets/animated-assets.json
    platformSpecificAssetsFollowProjectSourceRoot: true
  licensing:
    commercialUseRequired: true
    cc0Preferred: true
    permissiveCodeLicensesPreferred:
      - MIT
      - BSD
      - APACHE_2_0
    ccByAllowedWhenAttributionIsPossible: true
    nonCommercialForbidden: true
    unknownSourceForbidden: true
    unknownRedistributionTermsForbidden: true
    externalAssetRecord: LICENSES.md
    verifyLicenseBeforeDownloadOrUse: true
    sameQualityPriority:
      - CC0
      - COMMERCIAL_ATTRIBUTION_NOT_REQUIRED
      - CC_BY
  sourceSelection:
    reuseExistingRepositoryAssetFirst: true
    checkVerifiedCatalogWhenApplicable: true
    validateAnimationBeforeActorSelection: true
    removeStaticOrPrimitiveActorCandidates: true
    inventoryVisibleObjectsAndMissingAssets: true
    preferredExternalSources:
      firstTier:
        - KENNEY
        - POLY_HAVEN
        - AMBIENTCG
      conditionalTier:
        - PIXABAY
        - MIXKIT
        - OPENGAMEART
        - FREESOUND
        - ITCH_IO_GAME_ASSETS
        - FREE_MUSIC_ARCHIVE
        - QUATERNIUS
        - KAYKIT
        - CRAFTPIX_FREEBIES
        - GAME_ICONS_NET
        - OPENMOJI
        - GOOGLE_FONTS
        - FONT_AWESOME_FREE
    licenseAndCommercialUseCheckRequiredBeforeUse: true
    recordSourceAuthorLicenseObservedDate: true
    addOnlyRequiredOptimizedFiles: true
    validateMissingBrokenLoadingAndPerformanceOnSelectedPlatform: true
    removeUnusedCandidateTemporaryAndTestFiles: true
  prohibited:
    - STATIC_ACTOR
    - PRIMITIVE_ACTOR
    - STATIC_IMAGE_POSITION_SLIDE_AS_ANIMATION
    - NONCOMMERCIAL_ASSET
    - UNKNOWN_LICENSE_ASSET
    - SEARCH_RESULT_THUMBNAIL_AS_SOURCE_ASSET
    - UNAUTHORIZED_BRAND_OR_SITE_RENDER
    - LICENSE_CONFLICT_IGNORED
    - STYLE_MISMATCH_ASSET_SPAM
    - PLACEHOLDER_GRAPHICS_WHEN_REAL_ASSET_EXISTS
    - COMPLETION_CLAIM_WITH_REQUIRED_ASSETS_MISSING
  naming:
    preferLowercaseEnglishHyphenatedNames: true
  health:
    presetUseClasses:
      - PROTO
      - TEST
      - SHIP
    actorEvidenceMustRetainLicenseSourceAnimationAndMotionProof: true
    healthChecker: tools/asset-health-check.mjs
    unreachableSourceOrUnclearLicenseStopsNewUse: true
    existingUseRequiresImpactAndReplacementPlanBeforeRemoval: true

departmentStandards:
  centralSourceOnly: true
  machineImplementation:
    evidenceRules: assets/company-department-standards.js
    postModificationReview: tools/company-post-modification-review.mjs
    regressionTest: qa/company-department-standards.test.mjs
    standardsWorkflow: .github/workflows/department-standards-qa.yml
    revoteWorkflow: .github/workflows/post-modification-revote.yml
  common:
    eachDepartmentEvaluatesOwnDomainOnly: true
    verifiableFileBuildTestRuntimeEvidenceRequired: true
    domainSpecificConcreteEvidenceRequired: true
    vaguePraiseIsNotEvidence: true
    insufficientEvidenceForcesRevise: true
    oneDepartmentMustNotAuthorAnotherDepartmentDecision: true
    modificationRequiresSameScopeRegressionRecheck: true
    directorAggregatesFiveDepartmentResultsAndEvidenceGates: true
  planning:
    responsibilities:
      - CORE_FUN
      - CORE_LOOP
      - STORY_QUEST_REGION_PROGRESSION_CONNECTION
      - GAME_IDENTITY_IMPACT
    passMinimum:
      concreteEvidenceCount: 2
      domainEvidenceCount: 2
      beforeAfterCoreLoopImpactCheckRequired: true
      outOfScopeDesignInventionForbidden: true
  development:
    responsibilities:
      - IMPLEMENTATION_FILES_AND_CHANGE_SCOPE
      - CODE_STRUCTURE_AND_DEPENDENCIES
      - SAVE_AND_DATA_COMPATIBILITY
      - COMPILE_AND_BUILDABILITY
      - EXTENSIBILITY_AND_REGRESSION_RISK
    passMinimum:
      concreteEvidenceCount: 2
      domainEvidenceCount: 2
      successfulCompileOrBuildRequired: true
      failedTargetBuildForbidsPass: true
  qa:
    role: ACTUAL_GAME_TESTER
    responsibilities:
      - GAME_RUNTIME
      - PLAY_SMOKE_TEST
      - ERROR_DETECTION
      - PROGRESSION_BLOCK_DETECTION
      - REGRESSION_TEST
      - REPRODUCTION_RECORD
      - POST_FIX_REVALIDATION
    playSequenceWhenApplicable:
      - GAME_START
      - BASIC_MOVEMENT_OR_CONTROL
      - ATTACK_SKILL_OR_CORE_ACTION
      - CHANGED_FUNCTION
      - COMBAT_OR_PROGRESSION
      - SAVE_LOAD_OR_STATE_RETENTION
      - DEATH_RESTART_OR_REENTRY
      - UI_AND_INPUT
    notApplicableStepRequiresReason: true
    mobileAdditionalChecks:
      - TOUCH_INPUT
      - TOUCH_TARGET_SIZE
      - UI_OVERLAP
      - OFFSCREEN_UI
      - ASPECT_RATIO
      - SMALL_SCREEN_READABILITY
      - RAPID_OR_REPEATED_INPUT
      - LOW_END_PERFORMANCE_SIGNALS
    bugRecordRequiredFields:
      - LOCATION
      - REPRO_STEPS
      - EXPECTED_RESULT
      - ACTUAL_RESULT
      - SEVERITY
      - BUILD_OR_COMMIT
      - POST_FIX_REPRO_RESULT
    passMinimum:
      concreteQaEvidenceCount: 2
      domainEvidenceCount: 2
      successfulCompileOrBuildRequired: true
      actualRuntimeOrPlaySmokeEvidenceCount: 1
      runtimeOrPlayEvidenceAbsentForbidsPass: true
      buildSuccessAloneDoesNotPass: true
  graphics:
    responsibilities:
      - READABILITY
      - UI_COMPOSITION
      - ARTBOOK_AND_GAME_IDENTITY_ALIGNMENT
      - CHARACTER_MONSTER_VFX_MOTION_IMPACT
      - ASSET_LICENSE_AND_PLATFORM_PERFORMANCE_IMPACT
    passMinimum:
      domainEvidenceCount: 1
      noImpactRequiresExplicitChangeScopeEvidence: true
      codeQualityAloneDoesNotPass: true
  balance:
    responsibilities:
      - COMBAT_DIFFICULTY
      - DAMAGE_AND_HEALTH_VALUES
      - GROWTH_SPEED
      - REWARDS
      - ECONOMY_AND_RESOURCE_FLOW
    passMinimum:
      domainEvidenceCount: 1
      beforeAfterValueComparisonRequiredWhenBalanceValuesChange: true
      noImpactRequiresExplicitChangeScopeEvidence: true
      codeQualityAloneDoesNotPass: true
  director:
    mustReadAllFiveDepartmentResults: true
    mustReadAllEvidenceGates: true
    mustAggregateCrossDepartmentBlockers: true
    mustSetNextRevisionPriority: true
    cannotInventMissingDepartmentEvidence: true
    reviewVerdict:
      anyDrop: DROP
      noDropAnyReviseOrEvidenceGateFailure: REVISE
      allFivePassAndAllEvidenceGatesPass: PASS
    reviewDropDoesNotBypassDiscardPolicy: true
  postModificationFlow:
    - DEVELOPMENT_CHANGE
    - COMPILE_OR_BUILD
    - QA_ACTUAL_RUNTIME_OR_PLAY
    - PLANNING_REVIEW
    - DEVELOPMENT_REVIEW
    - GRAPHICS_REVIEW
    - BALANCE_REVIEW
    - FIVE_DEPARTMENT_EVIDENCE_GATES
    - DIRECTOR_AGGREGATION
    - PASS_REVISE_OR_DROP
  defectRecoveryFlow:
    - QA_DETECT_ERROR
    - RECORD_REPRODUCTION
    - DEVELOPMENT_FIX
    - NEW_BUILD
    - QA_REVALIDATE_SAME_PROCEDURE
    - RELATED_DEPARTMENT_REVIEW
    - DIRECTOR_VERDICT

meeting:
  DESIGN_ONLY:
    required: false
    crossDepartmentMeeting: false
    rebuttalRounds: 0
    directLeadReviewsFeedDesigner: true
    rationale: SPEED_SIMPLIFICATION_WITHOUT_WEAKENING_STRICT_GATE
  laterStages:
    relatedDepartmentReviewMayRunWhenEvidenceRequires: true

GameDesigner:
  onePrimaryAuthorPerProjectRevisionCycle: true
  writesInitialDetailedDesign: true
  sameDesignerRevisesAfterLeadReview: true
  departmentsDoNotCoauthorInitialDraft: true

ArtbookEditor:
  singleEditor: true
  readsRevisedDetailedDesign: true
  coreStrategyOnly: true
  mayInventNewClaims: false
  departmentsDoNotAuthorPages: true
  preserveRevisionHistoryByDefault: true

artbookDocumentConsolidation:
  compatibilityPath: ARTBOOK_SUBMISSION_CONTRACT.md
  mode: MACHINE_POINTER_ONLY
  canonicalPolicy: COMPANY_FLOW.md
  naturalLanguagePolicyReplication: FORBIDDEN
  ownerDirectiveNaturalLanguageReplication: FORBIDDEN

Vibe2:
  startsAt: DEVELOPMENT_CONFIRMED
  DEVELOPMENT_CONFIRMED: VALIDATION_TEST_ANALYSIS_AND_DEVELOPMENT_SUPPORT
  RELEASE_CONFIRMED: PRIMARY_DEVELOPMENT_ENGINE
  primaryDesignAuthorInDevelopmentClass: false
  primaryArtbookAuthorInDevelopmentClass: false

flows:
  DESIGN_ONLY:
    directResultMode: true
    requiredFlow:
      - GAME_SEED
      - GAME_DESIGNER_DRAFT
      - DETERMINISTIC_PRE_GATE
      - FAILED_AXIS_DESIGNER_REPAIR_MAX_2
      - DETERMINISTIC_DEPARTMENT_EVIDENCE
      - DETERMINISTIC_REVALIDATION
      - STRICT_DESIGN_REVIEW
      - ROBLOX_GENRE_PROFILE_ASSIGNMENT
      - DESIGN_BASELINE_GATE
    baselineReadyRequires:
      - GAME_SEED_COMPLETE
      - DISTINCT_GAME_IDENTITY
      - CORE_FUN_CLEAR
      - CORE_LOOP_ACTION_FEEDBACK_CHOICE_REWARD
      - MARKET_TARGET_DIRECTION_RECORDED
      - TARGET_PLATFORM_UX_DIRECTION_DEFINED
      - PLATFORM_SELECTION_RECORDED
      - MANDATORY_WEB_COMPANION_REQUIREMENT_RECORDED
      - APPROVED_SCOPE_INVENTORY_RECORDED
      - ROBLOX_GENRE_PROFILE_RECORDED
      - DETERMINISTIC_DESIGN_PRE_GATE_PASS
      - DETERMINISTIC_DEPARTMENT_EVIDENCE_RECORDED
      - STRICT_DESIGN_SCORE_AT_LEAST_80
      - STRICT_DESIGN_HARD_FAILURES_EMPTY
    readyState: DESIGN_BASELINE_READY
  DEVELOPMENT_CONFIRMED:
    executionMode: GATED_DIRECT
    resumeFromLatestEvidence: true
    webPurpose: MANDATORY_FULL_APPROVED_SCOPE_WEB_COMPANION_AND_MUSIC_VALIDATION
    targetPlatformPurpose: TECHNICAL_AND_GAMEPLAY_VALIDATION
    webBeforeTargetPlatformByDefault: true
    targetPlatformMayRunImmediately: false
    webGameplayValidationRequired: true
    webCompanionValidationRequired: true
    approvedScopeCompletionRequired: true
    musicValidationRequired: true
    webCandidateMustPassBeforeTargetPlatformDispatch: true
    webCandidateFormalImplementationPassRequiredBeforeTargetPlatformDispatch: true
    webStrictHomepageMinimum: 80
    formalImplementationMinimumForTargetPlatformDispatch: 90
    artbookAfterWebStrictReview: true
    artbookFailureBlocksHomepageRegistrationOnly: true
    webCandidatePublicPromotionRequiresValidationPass: true
    aiMayInventValidationPass: false
    webSmokeCountsAsGameplayValidation: false
    requiredFlow:
      - LOAD_DESIGN_BASELINE
      - WEB_PLAYABLE_QUEUE
      - FULL_APPROVED_SCOPE_WEB_COMPANION_BOOTSTRAP
      - MUSIC_RUNTIME_BIND
      - WEB_GAMEPLAY_MUSIC_AND_APPROVED_SCOPE_VALIDATION
      - WEB_STRICT_REVIEW
      - POST_WEB_ARTBOOK_IF_SCORE_80_OR_HIGHER
      - HOMEPAGE_TEST_CANDIDATE_IF_ARTBOOK_READY
      - WEB_EVIDENCE_DEPARTMENT_MEETING
      - GAME_DESIGNER_WEB_REVISION
      - TARGET_PLATFORM_90_POINT_GATE
      - TARGET_PLATFORM_SOURCE_BIND
      - TARGET_PLATFORM_GAMEPLAY_VALIDATION
      - TARGET_PLATFORM_TECHNICAL_VALIDATION
      - TARGET_PLATFORM_EVIDENCE_DEPARTMENT_MEETING
      - GAME_DESIGNER_TECH_REVISION
      - TARGETED_REVALIDATION
      - DEVELOPMENT_BASELINE_GATE
      - ARTBOOK_EDITOR_REVISION
    webValidationMustCover:
      - FULL_APPROVED_SCOPE_IMPLEMENTATION
      - PLATFORM_EXCLUSIVE_WEB_EQUIVALENT_ADAPTATION
      - CORE_LOOP
      - MOBILE_TOUCH_INPUT
      - OBSERVABLE_STATE_CHANGE
      - MOBILE_HORIZONTAL_OVERFLOW
      - RUNTIME_ERRORS
      - RELOAD_VISIBILITY
      - MUSIC_STARTS_ONLY_AFTER_USER_GESTURE
      - MUSIC_MUTE_CONTROL
      - MUSIC_VOLUME_CONTROL
      - MUSIC_RUNTIME_STATE
    targetPlatformValidationMustCover:
      - CORE_LOOP
      - TEMPO
      - PROGRESSION
      - ECONOMY
      - DIFFICULTY
      - INPUT_AND_UI
      - PERFORMANCE
      - SAVE_LOAD_WHEN_APPLICABLE
      - APP_OR_SESSION_RESUME_WHEN_APPLICABLE
      - IMPLEMENTATION_COMPLEXITY
      - ASSET_AND_QA_COST
    platformSpecificValidationRequired: true
    decisionStates:
      - KEEP
      - CHANGE
      - DROP
      - HOLD
    waitingStates:
      - WAITING_WEB_PLAYABLE
      - WAITING_WEB_GAMEPLAY_VALIDATION
      - WAITING_WEB_GAMEPLAY_REVALIDATION
      - WAITING_POST_WEB_ARTBOOK
      - WAITING_WEB_STRICT_IMPROVEMENT
      - WAITING_TARGET_PLATFORM_VALIDATION
      - WAITING_TARGET_PLATFORM_REVALIDATION
      - WAITING_REVALIDATION
    terminalStates:
      - DEVELOPMENT_BASELINE_READY
      - DEVELOPMENT_BLOCKED
    baselineReadyRequires:
      - DESIGN_BASELINE_EXISTS
      - REAL_WEB_GAMEPLAY_PASS
      - APPROVED_SCOPE_FULLY_IMPLEMENTED
      - MUSIC_RUNTIME_PASS
      - REAL_TARGET_PLATFORM_GAMEPLAY_PASS
      - REAL_TARGET_PLATFORM_TECHNICAL_PASS
      - REQUIRED_FIXES_APPLIED
      - REQUIRED_REVALIDATION_PASS
      - NO_FATAL_UNRESOLVED_VALIDATION_BLOCKER
    materialChangeRequiresTargetedRevalidation: true
    artbookRevisionOnlyAfterBaselineReady: true
  RELEASE_CONFIRMED:
    executionMode: GATED_DIRECT_RELEASE_PRODUCTION
    target: PROJECT_SELECTED_PLATFORM
    resumeFromLatestEvidence: true
    developmentBaselineRequired: true
    targetPlatformProjectRequired: true
    webCompanionRequired: true
    approvedScopeCompletionRequired: true
    coreDesignLock: true
    vibe2PrimaryDeveloper: true
    departmentDefaultRole: ERROR_AND_RELEASE_RISK_REVIEW
    exceptionMeetingForReleaseBlockingIssues: true
    sourceTreeBindingRequired: true
    currentBuildEvidenceBindingRequired: true
    aiMayInventBuildPass: false
    aiMayInventDeviceValidationPass: false
    aiMayInventIndependentQaPass: false
    sourceChangeInvalidatesOldBuildValidation: true
    requiredFlow:
      - LOAD_DEVELOPMENT_BASELINE
      - CORE_DESIGN_LOCK
      - VIBE2_PRIMARY_DEVELOPMENT
      - BIND_CURRENT_WEB_COMPANION_SOURCE_TREE
      - WEB_COMPANION_RUNTIME_VALIDATION
      - BIND_CURRENT_TARGET_PLATFORM_SOURCE_TREE
      - TARGET_PLATFORM_BUILD_OR_PACKAGE
      - FIVE_DISTINCT_LEAD_BUILD_PREFLIGHT
      - TARGET_PLATFORM_RUNTIME_VALIDATION
      - INDEPENDENT_QA_AND_REGRESSION
      - FIVE_DISTINCT_LEAD_FINAL_RELEASE_REVIEW
      - VIBE2_FIX_AND_REBUILD_LOOP_IF_REQUIRED
      - RELEASE_GATE
      - RELEASE_BASELINE
      - ARTBOOK_EDITOR_FINAL_REVISION
    buildPreflightIsNotFinalApproval: true
    finalReviewMustReadSameCurrentBuildRuntimeQaEvidence: true
    independentQaSeparatedFromVibe2SelfCheck: true
    waitingStates:
      - BUILDING
      - WAITING_WEB_COMPANION_VALIDATION
      - WAITING_BUILD
      - WAITING_RUNTIME_VALIDATION
    releaseStates:
      - FIX_AND_REVERIFY
      - RELEASE_BLOCKED
      - RELEASE_READY
    releaseReadyRequires:
      - DEVELOPMENT_BASELINE_CONFIRMED
      - CURRENT_WEB_COMPANION_RUNTIME_PASS
      - APPROVED_SCOPE_FULLY_IMPLEMENTED
      - CURRENT_TARGET_PLATFORM_BUILD_OR_PACKAGE_SUCCESS
      - BUILD_PREFLIGHT_NO_RELEASE_BLOCKER
      - CURRENT_TARGET_PLATFORM_RUNTIME_PASS
      - CURRENT_BUILD_INDEPENDENT_QA_REGRESSION_PASS
      - FINAL_REVIEW_SAME_BUILD_RUNTIME_QA_NO_UNRESOLVED_BLOCKER
      - CORE_DESIGN_LOCK_NOT_VIOLATED
    finalArtbookOnlyAfterReleaseReady: true

executionPause:
  ownerDirectiveRecordedAt: 2026-09-18
  stopAfterStage: NONE
  webDevelopmentPaused: false
  developmentConfirmedQueueAllowed: true
  developmentRuntimeDispatchAllowed: true
  webImplementationStartForbiddenUntilOwnerResume: false
  designPromotionMayContinueWhileWebPaused: true
  strictDesignGateMustRemainUnchanged: true

promotion:
  DESIGN_ONLY_TO_DEVELOPMENT_CONFIRMED:
    requires:
      - DESIGN_BASELINE_READY
      - STRICT_DESIGN_VERDICT_PASS
      - STRICT_DESIGN_SCORE_AT_LEAST_80
      - STRICT_DESIGN_HARD_FAILURES_EMPTY
    scheduling:
      mode: PER_GAME_INDEPENDENT
      portfolioWidePassRequired: false
      waitForOtherGamesForbidden: true
      dispatchImmediatelyAfterOwnEvidencePass: true
      robloxFirstDuringCurrentStabilization: true
      robloxFirstAffectsSchedulingOnly: true
      qualityGateWeakeningForbidden: true
      forcePromotionForbidden: true
      promotionWithoutOwnFreshEvidenceForbidden: true
  DEVELOPMENT_CONFIRMED_TO_RELEASE_CONFIRMED:
    requires:
      - DEVELOPMENT_BASELINE_READY
      - REAL_PLAY_EVIDENCE
      - REAL_SELECTED_PLATFORM_EVIDENCE
      - CURRENT_WEB_COMPANION_RUNTIME_PASS
      - APPROVED_SCOPE_FULLY_IMPLEMENTED
  classMovementNeverUsedToSatisfyCountQuota: true
  countQuotaDoesNotExist: true
  demotionRequiresRecordedReasonAndEvidence: true

developmentSafety:
  oneDevelopmentFloorPerGameSourceRoot: true
  concurrentDirectWritesToSameSourceRootForbidden: true
  meaningfulChangesUseIsolatedCandidateBeforeIntegration: true
  noMainOrPublicWriteBeforeRequiredValidation: true
  preserveExistingGameRulesWithoutOwnerDecision: true
  preserveSaveMeaningWithoutOwnerDecision: true
  monetizationPlatformMajorContentChangesRequireOwnerDecision: true
  avoidWrapperOverrideChains: true
  preferResponsibleSystemDirectEdit: true
  localDevelopmentConnectionHostPreferred: 127.0.0.1

urgentCases:
  BLOCK_BLAST_EXTERNAL_RUNTIME:
    priority: EMERGENCY
    authority: OWNER_DIRECT_EMERGENCY_CASE
    ownerDirectiveRecordedAt: 2026-09-12
    status: VERIFIED_RUNTIME_PASS_TRUE
    objective: VERIFIED_BLACK_BOX_RUNTIME_PLAYTEST
    gameId: block-blast
    packageId: com.block.juggle
    verifiedRuntimePass:
      value: true
      run: 30
      workflowRunId: 34653320467
      artifactId: 10284397608
      artifactDigest: sha256:8c165e437321a156c8c37ad75180874b13b561dc82167b4af08e22c60cddd4b1
      runtimeType: REDROID_NATIVE_ARM64_DIRECT_EXEC
      hostArch: aarch64
      guestAndroid: 14
      guestAbi: arm64-v8a
      actualGameEntryCaptured: true
      meaningfulInputExerciseCaptured: true
      processSurvivedInput: true
      foregroundAfterInput: true
      noFatalExceptionNativeCrashOrAnrInCapturedWindow: true
    safety:
      officialGooglePlayExportOnly: true
      blackBoxObservationOnly: true
      decompileForbidden: true
      reverseEngineeringForbidden: true
      sourceExtractionForbidden: true
      assetExtractionForbidden: true
      internalAlgorithmExtractionForbidden: true
      apkCommitForbidden: true
      binaryRedistributionForbidden: true
      paidRunnerOrPaidCloudForbidden: true
    detailedExperimentHistoryIsEvidenceNotPolicy: true
    evidenceBindings:
      privateHistory: hans1177/jaewoon-ai-company/server-playtest/block-blast-experiment-history.md
      publicNegativeDistillation: company-learning/external-game-playtest/block-blast-runtime-distillation.json
      ownerGameEntryCorrection: company-learning/external-game-playtest/block-blast-game-entry-correction.json

learning:
  webGameEvidence:
    role: AUXILIARY_PORTABLE_LEARNING_EVIDENCE
    maySupport:
      - CORE_GAMEPLAY
      - CORE_LOOP
      - UI_AND_INPUT
      - OBSERVABLE_STATE
      - BUGFIX
      - BROWSER_QA_PATTERNS
    cannotClaimNativePlatformSuccess: true
    cannotSatisfyNativePlatformRuntimeGate: true
    cannotEnterRobloxUnityUefnVerifiedLaneWithoutMatchingNativeEvidence: true
    useExistingCanonicalDistillationOnly: true
    newTrainerOrCronForbidden: true
  aiDesignOpinionAloneIsNotSuccessEvidence: true
  validatedEvidenceSources:
    - REAL_PLAY
    - WEB_GAMEPLAY_VALIDATION
    - ROBLOX_RUNTIME
    - ROBLOX_PUBLISHING_QA
    - UNITY_TECHNICAL_VALIDATION
    - ANDROID_RUNTIME
    - FORTNITE_UEFN_RUNTIME
    - FORTNITE_UEFN_PUBLISHING_QA
    - INDEPENDENT_QA
    - RELEASE_RESULT
  labelSuccessAndFailureCauses: true
  onlyValidatedPatternsFeedVibe2Learning: true
  canonicalDistillationRequired: true
  canonicalLearningChain:
    - VALIDATED_EVIDENCE
    - DISTILLATION_INGEST
    - VERIFIED_TRAINING_SAMPLE
    - DISTILLATION_STATUS
    - DETERMINISTIC_TRAINING_REQUEST
    - LOCAL_SELF_HOSTED_DATASET_BUILD
    - LOCAL_LORA_OR_QLORA_TRAINING
    - TRAINED_UNVERIFIED
    - FIXED_HOLDOUT_AB
    - CANARY
    - PROMOTE_OR_ROLLBACK
  platformTrainingArchitecture:
    mode: SHARED_CANONICAL_TRAINER_WITH_PLATFORM_ISOLATED_LANES
    canonicalTrainerCount: 1
    platformTaskTypes:
      - roblox
      - unity
      - fortnite_uefn
    laneIsolation:
      verifiedEvidence: true
      dataset: true
      adapter: true
      runtimeGate: true
    platformLanesAreNotParallelPipelines: true
    readinessEvaluatedPerTaskType: true
    blockedLaneCannotBorrowCopyOrFabricateSamples: true
    realVerifiedPlatformEvidenceRequired: true
    syntheticPlatformTrainingForbidden: true
    commonRealDatasetGate: tools/vibe2-real-platform-dataset-gate.mjs
    commonLocalTrainer: tools/vibe2-train.py
    canonicalStatusBuilder: tools/vibe2-distillation-status.mjs
    deterministicRequestBuilder: tools/vibe2-training-request.mjs
    hourlyRefreshWorkflow: Vibe2 Distillation Sample Ingest
    secondCronOrShadowRefreshForbidden: true
    localSelfHostedWeightTrainingOnly: true
    freshAdapterState: TRAINED_UNVERIFIED
    promotionRequires:
      - FIXED_HOLDOUT_AB
      - CANARY
  platformSpecificParallelDistillationForbidden: true
  duplicateDistillationTriggerForbidden: true
  shadowDatasetOrTrainerForbidden: true
```

assetProductionParallel:
  version: 2
  authority: OWNER_DIRECTIVE_2026-09-20
  enabled: true
  purpose: REAL_ASSET_PRODUCTION_IS_A_FIRST_CLASS_PARALLEL_DEVELOPMENT_LANE_NOT_GRAPHICS_REVIEW_ONLY
  scope: ACTIVE_DEVELOPMENT_CONFIRMED_AND_RELEASE_CONFIRMED_GAMES
  firstAdoption:
    gameId: fantasy-survival
    name: 마력숲 생존기
    priority: P0_OWNER_FOCUSED_GAME
    targetPlatforms:
      - UNITY
      - ROBLOX
    mode: UNITY_ROBLOX_CONCURRENT
  inputs:
    required:
      - CURRENT_VALIDATED_WEB_COMPANION
      - APPROVED_DESIGN_BASELINE
      - GAME_STYLE_LOCK
    deriveVisibleAssetInventory: true
    deriveAssetSpecFromActualGameplayNeeds: true
    speculativeAssetWorkOutsideApprovedGameplayScopeForbidden: true
  productionLanes:
    - ART_DIRECTION
    - THREE_D_ASSET
    - MATERIAL_TEXTURE
    - ANIMATION
    - VFX
    - UI_ART
    - AUDIO
  workflow:
    - DERIVE_VISIBLE_ASSET_INVENTORY_AND_ASSET_SPEC
    - CLASSIFY_A_B_C_VISUAL_PRIORITY
    - RUN_GAMEPLAY_CODE_AND_ASSET_PRODUCTION_IN_PARALLEL
    - BIND_REAL_ASSETS_TO_UNITY_AND_ROBLOX_PRESENTATION_LAYERS
    - RUN_VISUAL_RUNTIME_QA_ON_ACTUAL_GAMEPLAY
    - ASSET_REPAIR_REQUIRED_FOR_FAILED_ASSET_SCOPE
    - REVALIDATE_PLATFORM_PRESENTATION_AND_REGRESSION
  visualPriority:
    A_GAMEPLAY_CRITICAL:
      - PLAYER_CHARACTER
      - PRIMARY_ENEMIES
      - CORE_WEAPONS_TOOLS
      - CORE_RESOURCES
      - CRAFTING_STRUCTURES
      - PRIMARY_TERRAIN
      - COMBAT_HIT_VFX
    B_WORLD_IDENTITY:
      - REGION_ENVIRONMENT
      - LANDMARKS
      - FOLIAGE
      - LIGHTING
      - ATMOSPHERE
      - AMBIENT_PARTICLES
    C_POLISH:
      - SECONDARY_ANIMATION
      - RARE_ITEM_VISUALS
      - DECORATION
      - UI_POLISH
      - ADVANCED_AUDIO_POLISH
  graphicsPass:
    reviewOrTextSpecAloneCannotPass: true
    realAssetRequired: true
    inGameBindingRequired: true
    actualRuntimeVisualEvidenceRequired: true
    requiredAssetMissingBlocksPass: true
    placeholderVisualCannotPass: true
    platformRuntimeEvidenceIndependent: true
    unityRobloxSharedStyleLockRequired: true
  parallelism:
    gameplayCodeAndAssetProductionConcurrent: true
    responsibleFilesMustBeExplicitAndDisjoint: true
    sameResponsibleFileParallelForbidden: true
    executionAuthority: EXISTING_WAVE_SCHEDULER_ONLY
    newWorkerAuthorityCreated: false
    queueMutationAuthorityCreated: false
    waveReorderAuthorityCreated: false
  failureHandling:
    correctableState: ASSET_REPAIR_REQUIRED
    isolateFailedAssetScopeWhenSafe: true
    unrelatedCodeWorkMayContinueWhenDependencySafe: true
    repairRequiresRebindAndVisualRuntimeQa: true
    waitingStateForCorrectableAssetFailureForbidden: true
  preservation:
    assetOnlyWorkMustNotChangeGameplayBalanceSaveProgressionOrHitSemantics: true
    reuseExistingAssetLicenseAndProvenancePolicy: true
    qualitySecurityEvidenceAndSaveCompatibilityGatesUnchanged: true

platformPresentationAndWeather:
  version: 1
  authority: OWNER_DIRECTIVE_2026-09-20
  canonicalMachinePolicy: company-learning/platform-release-roadmap.json
  firstAdoption:
    gameId: fantasy-survival
    name: 마력숲 생존기
    surfaces:
      - WEB_COMPANION
      - UNITY
      - ROBLOX
  webPresentationQuality:
    target: POLISHED_COMMERCIAL_MOBILE_WEB_2D_OR_2_5D
    prototypeOnlyGraphicsForbiddenAtFinalPass: true
    primitiveOrGeometricPlaceholderCannotSatisfyGraphicsPass: true
    characterEnemyAndCoreObjectVisualIdentityRequired: true
    regionalAtmosphereDifferentiationRequired: true
    animationVfxUiAndCameraPolishRequired: true
    mobileTouchReadabilityRequired: true
    mobilePerformanceBudgetRequired: true
    webDoesNotNeedToImitateHighEndNative3D: true
  platformAssetSeparation:
    webRole: PLAYABLE_GAMEPLAY_AND_ART_DIRECTION_REFERENCE_SURFACE
    webAssetDirectReuseIntoUnityForbidden: true
    webAssetDirectReuseIntoRobloxForbidden: true
    unityAssetsMustBeUnityNativeOrExplicitlyUnityCompatible: true
    robloxAssetsMustBeRobloxNativeOrExplicitlyRobloxCompatible: true
    unityRobloxDirectCrossReuseForbiddenUnlessExplicitCompatibilityVerified: true
    platformSpecificReauthoringExpected: true
    sharedStyleIdentityOnly:
      - GAME_STYLE_LOCK
      - PALETTE
      - SILHOUETTE_LANGUAGE
      - CHARACTER_AND_MONSTER_IDENTITY
      - REGION_IDENTITY
      - MATERIAL_AND_LIGHTING_LANGUAGE
      - VFX_LANGUAGE
      - UI_MOTION_LANGUAGE
  weather:
    presentationOnlyByDefault: true
    canonicalStates:
      - CLEAR
      - RAIN
      - FOG
      - SNOW
      - STORM
    regionalExtensions:
      - VOLCANIC_ASH
      - HEAT_HAZE
    gameplaySemanticsUnchanged:
      - ATTACK
      - HEALTH
      - DROP_RATE
      - MOVEMENT_SPEED
      - ECONOMY
      - PROGRESSION
    futureGameplayWeatherEffectsRequireApprovedDesignChange: true
    transitionControllerRequired: true
    timedOrRegionDrivenTransitionsAllowed: true
    visualAudio:
      skyAndSceneTone: true
      precipitationParticles: true
      fogOrAtmosphere: true
      windAndFoliageMotion: true
      stormLightningFlash: true
      ambientWeatherAudio: true
      criticalGameplaySignalsMustRemainReadable: true
    multiplayer:
      canonicalWeatherStateSharedByAllPlayers: true
      hostOrAuthoritativeRuntimeOwnsWeatherState: true
      clientsObserveSameSemanticWeatherState: true
      joinInProgressReceivesCurrentWeatherState: true
      localPerformanceMayReduceDensityNotMeaning: true
    platformImplementation:
      WEB: CANVAS_DOM_CSS_WEB_AUDIO_OR_EXISTING_RENDER_PIPELINE
      UNITY: UNITY_NATIVE_PARTICLES_FOG_LIGHTING_MATERIALS_AUDIO
      ROBLOX: ROBLOX_NATIVE_PARTICLEEMITTER_ATMOSPHERE_LIGHTING_COLORCORRECTION_SOUND
    mobilePerformance:
      adaptiveEffectDensityRequired: true
      particleCapsRequired: true
      unboundedWeatherEffectsForbidden: true
      lowEndModeMayReduceVisualDensityOnly: true
      criticalTouchAndHazardReadabilityMustRemain: true
    qa:
      actualRuntimeVisualEvidenceRequired: true
      actualRuntimeAudioEvidenceWhenAudioPresent: true
      multiplayerSynchronizationEvidenceRequiredForMultiplayerGames: true
      mobilePerformanceEvidenceRequired: true
      gameplaySemanticsRegressionRequired: true
      weatherTextOrSpecAloneCannotPass: true
      failedWeatherScopeRoutesTo: ASSET_REPAIR_REQUIRED
  executionAuthority: EXISTING_WAVE_SCHEDULER_ONLY
  authorityExpansion: false

webValidationContractAdapter:
  version: 1
  authority: OWNER_DIRECTIVE_2026-09-20
  centralContract: company-learning/platform-release-roadmap.json#webValidationBottleneckAdapterContract
  deterministicFirst: true
  mapActualControlsHandlersAndState: true
  hiddenOrSyntheticValidationControlsForbidden: true
  externalAi:
    providerPriority:
      - GEMINI
      - VIBE_LOCAL_OLLAMA
    ambiguousMappingsOnly: true
    advisoryOnly: true
    directSourceWrite: false
    directPassAuthority: false
    failureBlocksLocalVibeRepair: false
  firstPilotGameId: fantasy-survival
  actualRuntimeInteractionStillRequired: true
  executionAuthority: EXISTING_WAVE_SCHEDULER_ONLY
  authorityExpansion: false

learningClosedLoop:
  version: 1
  authority: OWNER_DIRECTIVE_2026-09-20
  centralContract: company-learning/platform-release-roadmap.json#learningClosedLoopContract
  experienceMemory:
    canonicalStore: .vibe2/experience.json
    verifiedProjectOutcomeOnly: true
    candidatePassAloneInsufficient: true
  externalAi:
    distilledStore: .vibe2/external-ai-distilled-knowledge.json
    rawOutputDirectUse: false
    independentlyVerifiedDistilledOnly: true
    advisoryOnly: true
    ranksAfterInternalVerified: true
  knowledgeAttribution:
    exactInjectedKnowledgeIds: true
    freshQaRegressionReviewRequired: true
    infrastructureFailurePenalty: false
  productionConfidence:
    separateFromMasteryXp: true
    masteryXpRetained: true
    levels: 5
    verifiedProjectOutcomeOnly: true
    holdoutRequiredForStrongGeneralization: true
  strategyPromotion:
    thresholdsUnchanged: true
    preferredVerifiedApplicationsMin: 5
    preferredDistinctGamesMin: 2
    preferredFirstCandidatePassRateMin: 0.6
    controlChallengerEvidence: true
  commonKnowledgeLifecycle:
    - CANDIDATE
    - VERIFIED
    - PREFERRED
    - DEMOTED
    - RETIRED
  retiredKnowledgeRetrievalForbidden: true
  gateWeakening: false
  executionAuthority: EXISTING_WAVE_SCHEDULER_ONLY
  authorityExpansion: false

