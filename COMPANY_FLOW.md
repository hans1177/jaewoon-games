# JAEWOON COMPANY PRODUCTION POLICY

```yaml
policy:
  sourceOfTruth: COMPANY_FLOW.md
  format: MACHINE_ORIENTED_POLICY_SPEC
  humanReadableNarrativeRequired: false
  ownerInstructionOverridesPolicy: true
  implementationMustFollowPolicy: true
  evidenceFilesCannotCreatePolicy: true

priority:
  - OWNER_LATEST_DIRECT_INSTRUCTION
  - COMPANY_FLOW
  - COMPANY_DIRECTIVE
  - IMPLEMENTATION_TOOL_CONTRACTS
  - STATUS_AUDIT_BUILD_HEALTH_EVIDENCE

pipelineExecution:
  existingPipelineIsAuthoritative: true
  reuseExistingPipelineRequired: true
  newParallelPipelineForSameStageForbidden: true
  adHocBypassChainForbidden: true
  wrapperOrShadowChainForbidden: true
  repairExistingPipelineAtFailurePoint: true
  pushWorkForwardThroughExistingStages: true
  followCanonicalStageOrder: true
  duplicateTriggerPathForbidden: true
  temporaryRecoveryMustRejoinCanonicalPipelineImmediately: true
  cronOrIndependentLoopMustNotReplaceExistingEventChain: true
  ownerDirectExceptionRequiredToCreateNewPipeline: true

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
  preserveExistingWebArchives: true
  preserveSaveMeaning: true

bootstrapGameSeeds:
  enabled: true
  initialSeedBatchCount: 6
  initialSeedBatchIsProductionQuota: false
  initialSeedGenerationMode: SINGLE_BOOTSTRAP_BATCH
  initialSeedBatchCreatesAllCategoriesAtOnce: true
  oneSeedPerCategory: true
  categories:
    - ACTION_SURVIVAL_ROGUELITE
    - SINGLE_DEFENSE_STRATEGY
    - PUZZLE
    - CASUAL
    - IDLE_GROWTH_RPG
    - STORY_COMPLETE_RPG
  ownerMayReplaceOrExpandCategories: true
  replenishment:
    mode: ONE_FOR_ONE_ONLY
    normalPromotionDoesNotTriggerReplenishment: true
    redesignOrHoldDoesNotTriggerReplenishment: true
    triggers:
      - DISCARDED
      - OWNER_REMOVED
      - OWNER_REQUESTED_ADDITIONAL_SEED
      - OWNER_ADDED_CATEGORY
    replacementCategory: SAME_CATEGORY_UNLESS_OWNER_CHANGES_CATEGORY
    replacementCountPerVacancy: 1
    automaticGrowthBeyondVacanciesForbidden: true

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
    selectionPriority:
      - PROVEN_COMMERCIAL_OR_POPULAR_SUCCESS
      - CLEAR_PROVEN_CORE_FUN_AND_CORE_LOOP
      - ANDROID_SINGLE_PLAYER_FIT
      - PRODUCIBLE_AT_COMPANY_SCALE
      - COMMERCIAL_VIABILITY_WITHOUT_MULTIPLAYER
      - FUTURE_STEAM_OR_MULTIPLAYER_EXPANSION_VALUE
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
    useWhenAvailable:
      - REVENUE_RANK_OR_REVENUE_SIGNAL
      - POPULARITY_OR_DOWNLOAD_RANK
      - TARGET_AGE_OR_AGE_DISTRIBUTION
      - AVERAGE_PLAYTIME
      - MEDIAN_PLAYTIME
      - SESSION_LENGTH
      - RETENTION
      - CONCURRENT_OR_ACTIVE_USERS
      - REVIEW_VOLUME_AND_RATING
    targetDecisionsSupported:
      - TARGET_AUDIENCE
      - TARGET_AGE_RANGE
      - TARGET_SESSION_LENGTH
      - GAME_LENGTH_AND_CONTENT_VOLUME
      - MONETIZATION_OR_SALES_MODEL
      - PROGRESSION_PACING
      - UX_COMPLEXITY
    evidenceRules:
      globalEvidencePreferred: true
      countrySpecificEvidenceCannotDefineDefaultTargetAlone: true
      numericClaimRequiresSource: true
      numericClaimRequiresObservedAt: true
      unverifiableNumericClaimForbidden: true
      unavailableFieldMayBeUNKNOWN: true
      qualitativeBenchmarkAllowedWhenNumericDataUnavailable: true

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
    - STEAM_EXPANSION_POSSIBLE
    - MULTIPLAYER_EXPANSION_POSSIBLE
    - MULTIPLAYER_EXPANSION_VALUE

  initialTargetPlatform: ANDROID_MOBILE
  initialPlayMode: SINGLE_PLAYER
  steam:
    implementedInitially: false
    seedDecisionRequired: true
    decisionValues:
      - POSSIBLE
      - NOT_RECOMMENDED
  multiplayer:
    implementedInitially: false
    requiredForInitialCommercialRelease: false
    seedDecisionRequired: true
    possibleValues:
      - POSSIBLE
      - NOT_RECOMMENDED
    expansionValueValues:
      - LOW
      - MEDIUM
      - HIGH
    optionalFutureModes:
      - COOP
      - PVP
      - NONE
  commercialRule: INITIAL_GAME_MUST_BE_SELLABLE_OR_MONETIZABLE_WITHOUT_MULTIPLAYER

discardPolicy:
  general:
    singleFailureDoesNotImmediatelyDiscard: true
    correctableProblemMustAttemptRevisionFirst: true
    marketMetricAloneCannotDiscard: true
    ownerMayDiscardDirectly: true
    discardState: DISCARDED
    discardCreatesSameCategorySeedVacancy: true

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
      - ANDROID_MOBILE_SINGLE_PLAYER_CANNOT_WORK_AS_PRODUCT
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
      - REAL_WEB_OR_UNITY_OR_PLAY_EVIDENCE_EXISTS
      - FATAL_ISSUE_RECORDED_WITH_EVIDENCE
      - TARGETED_FIX_ATTEMPTED_WHEN_PRACTICAL
      - TARGETED_REVALIDATION_PERFORMED
      - STRUCTURAL_FATAL_BLOCKER_REMAINS
    fatalCriteria:
      - REAL_PLAY_CORE_FUN_REMAINS_UNACCEPTABLE_AFTER_FIX
      - REPETITION_OR_SESSION_STRUCTURE_REMAINS_UNACCEPTABLE_AFTER_FIX
      - MOBILE_TOUCH_OR_UX_IS_STRUCTURALLY_UNFIT
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
  initialActualProduct: ANDROID_MOBILE_SINGLE_PLAYER
  initialReleaseTarget: UNITY_ANDROID
  steamNotBuiltInitially: true
  multiplayerNotBuiltInitially: true
  futureExpansionMustNotRequireSeparateGameCoreByDefault: true
  unityProjectStrategy:
    oneGameOneUnityProject: true
    separatePcProjectByDefault: false
    coreGameplayPlatformIndependentWherePractical: true
    inputUiPlatformAdaptersAllowed: true
  developmentConfirmed:
    actualImplementationFocus: MOBILE_ANDROID
    requireSteamApiNow: false
    requirePcInputNow: false
    requireNetworkServerNow: false
    requireMultiplayerGameplayNow: false
    architectureMustAvoidUnnecessaryMobileOnlyCoupling: true
  releaseConfirmed:
    currentReleaseGateTarget: UNITY_ANDROID
    steamReleaseGateDeferredUntilOwnerRequestsSteamRelease: true
    multiplayerReleaseGateDeferredUntilOwnerRequestsMultiplayer: true

aiOrganization:
  departments:
    - planning
    - graphics
    - development
    - qa
    - balance
  departmentMultimodelStartsAt: DESIGN_ONLY
  fiveDistinctLeadModelIdsRequiredPerCycle: true
  minDistinctModelsPerDepartment: 3
  structurePerDepartment:
    leadCount: 1
    assistantMinCount: 2
    allModelsWithinDepartmentMustBeDistinct: true
  assistantModelsMayOverlapAcrossDepartments: true
  leadModelAssignmentRemappable: true
  paidAiAllowed: false
  paidRunnerAllowed: false

meeting:
  departmentInternalReview:
    leadIndependentReview: true
    assistantIndependentReview: true
    representativeAuthor: DEPARTMENT_LEAD
    representativeRequiredFields:
      - KEEP
      - FIX
      - ADD
      - RISK
      - EVIDENCE
      - MODEL_IDS
  crossDepartment:
    participants: FIVE_DEPARTMENT_LEADS
    eachLeadReadsOtherFourRepresentatives: true
    rebuttalRounds: 1
    rebuttalAuthor: SAME_DEPARTMENT_LEAD
    issueStates:
      - CONSENSUS
      - CONFLICT
      - HOLD
    autoRevisionUsesOnly: CONSENSUS
    conflictOrHoldMustNotBeHidden: true

GameDesigner:
  onePrimaryAuthorPerProjectRevisionCycle: true
  writesInitialDetailedDesign: true
  sameDesignerRevisesAfterMeeting: true
  departmentsDoNotCoauthorInitialDraft: true

ArtbookEditor:
  singleEditor: true
  readsRevisedDetailedDesign: true
  coreStrategyOnly: true
  mayInventNewClaims: false
  departmentsDoNotAuthorPages: true
  preserveRevisionHistoryByDefault: true

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
      - FIVE_DISTINCT_DEPARTMENT_LEADS
      - DEPARTMENT_LEAD_PLUS_ASSISTANT_MULTIMODEL_REVIEW
      - DEPARTMENT_LEAD_INTERNAL_CONSENSUS
      - CROSS_DEPARTMENT_LEAD_MEETING
      - ONE_LEAD_REBUTTAL_ROUND
      - GAME_DESIGNER_REVISION
      - DESIGN_BASELINE_GATE
      - ARTBOOK_EDITOR_CORE_STRATEGY
    baselineReadyRequires:
      - GAME_SEED_COMPLETE
      - DISTINCT_GAME_IDENTITY
      - CORE_FUN_CLEAR
      - CORE_LOOP_ACTION_FEEDBACK_CHOICE_REWARD
      - MARKET_TARGET_DIRECTION_RECORDED
      - MOBILE_UX_DIRECTION_DEFINED
      - STEAM_EXPANSION_DECISION_RECORDED
      - MULTIPLAYER_EXPANSION_DECISION_RECORDED
      - FIVE_DISTINCT_LEAD_MODELS
      - PER_DEPARTMENT_MULTIMODEL_REVIEW_PASS
      - NO_HIDDEN_FATAL_CONFLICT
    readyState: DESIGN_BASELINE_READY

  DEVELOPMENT_CONFIRMED:
    executionMode: GATED_DIRECT
    resumeFromLatestEvidence: true
    webPurpose: GAMEPLAY_VALIDATION_TESTBED
    unityPurpose: ANDROID_TECHNICAL_VALIDATION_PROTOTYPE
    webBeforeUnityByDefault: true
    unityMayRunEarlyWhenEngineBehaviorDefinesCoreFun: true
    aiMayInventValidationPass: false
    webSmokeCountsAsGameplayValidation: false
    actualProductFocus: MOBILE_SINGLE_PLAYER
    futureSteamOrMultiplayerDecisionMustBePreservedFromSeed: true
    futureExpansionArchitectureCheckedDuringTechnicalReview: true
    requiredFlow:
      - LOAD_DESIGN_BASELINE
      - WEB_GAMEPLAY_VALIDATION
      - WEB_EVIDENCE_DEPARTMENT_MEETING
      - GAME_DESIGNER_WEB_REVISION
      - UNITY_ANDROID_TECHNICAL_VALIDATION
      - UNITY_EVIDENCE_DEPARTMENT_MEETING
      - GAME_DESIGNER_TECH_REVISION
      - TARGETED_REVALIDATION
      - DEVELOPMENT_BASELINE_GATE
      - ARTBOOK_EDITOR_REVISION
    webValidationMustCover:
      - CORE_LOOP
      - TEMPO
      - PROGRESSION
      - ECONOMY
      - DIFFICULTY
      - CHOICE_STRUCTURE
      - MOBILE_TOUCH_UI
      - REPETITION_AND_EXPLOITS
    unityValidationMustCover:
      - ANDROID_FPS_FRAME_STABILITY
      - MEMORY_HEAT_LOADING
      - PHYSICS_CAMERA_ANIMATION
      - AI_NAVMESH_OBJECT_COUNT
      - VFX_COST
      - ASPECT_RATIO_TOUCH
      - SAVE_LOAD_UPDATE_COMPATIBILITY
      - APP_PAUSE_RESUME
      - IMPLEMENTATION_COMPLEXITY
      - ASSET_AND_QA_COST
      - FUTURE_STEAM_EXPANSION_FEASIBILITY_IF_SEED_POSSIBLE
      - FUTURE_MULTIPLAYER_EXPANSION_FEASIBILITY_IF_SEED_POSSIBLE
    decisionStates:
      - KEEP
      - CHANGE
      - DROP
      - HOLD
    waitingStates:
      - WAITING_WEB_VALIDATION
      - WAITING_WEB_REVALIDATION
      - WAITING_UNITY_VALIDATION
      - WAITING_UNITY_REVALIDATION
      - WAITING_REVALIDATION
    terminalStates:
      - DEVELOPMENT_BASELINE_READY
      - DEVELOPMENT_BLOCKED
    baselineReadyRequires:
      - DESIGN_BASELINE_EXISTS
      - REAL_WEB_GAMEPLAY_PASS
      - REAL_UNITY_ANDROID_TECHNICAL_PASS
      - REQUIRED_FIXES_APPLIED
      - REQUIRED_REVALIDATION_PASS
      - NO_FATAL_UNRESOLVED_VALIDATION_BLOCKER
    materialChangeRequiresTargetedRevalidation: true
    artbookRevisionOnlyAfterBaselineReady: true

  RELEASE_CONFIRMED:
    executionMode: GATED_DIRECT_RELEASE_PRODUCTION
    target: UNITY_ANDROID
    resumeFromLatestEvidence: true
    developmentBaselineRequired: true
    unityProjectRequired: true
    coreDesignLock: true
    vibe2PrimaryDeveloper: true
    departmentDefaultRole: ERROR_AND_RELEASE_RISK_WATCH
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
      - BIND_CURRENT_UNITY_SOURCE_TREE
      - UNITY_ANDROID_BUILD
      - FIVE_DISTINCT_LEAD_BUILD_PREFLIGHT
      - ANDROID_RUNTIME_VALIDATION
      - INDEPENDENT_QA_AND_REGRESSION
      - FIVE_DISTINCT_LEAD_FINAL_RELEASE_REVIEW
      - VIBE2_FIX_AND_REBUILD_LOOP_IF_REQUIRED
      - RELEASE_GATE
      - RELEASE_BASELINE
      - ARTBOOK_EDITOR_FINAL_REVISION
    buildPreflightIsNotFinalApproval: true
    finalReviewMustReadSameCurrentBuildRuntimeQaEvidence: true
    runtimeValidationMustCover:
      - ANDROID_INPUT
      - FPS_FRAME_STABILITY
      - MEMORY_HEAT_LOADING
      - LONG_RUN_STABILITY
      - CRASH_ANR_RISK
      - PAUSE_RESUME
      - SAVE_CORRUPTION
      - UPDATE_SAVE_COMPATIBILITY
      - SCREEN_RATIO_UI
    independentQaSeparatedFromVibe2SelfCheck: true
    waitingStates:
      - BUILDING
      - WAITING_BUILD
      - WAITING_DEVICE_VALIDATION
    releaseStates:
      - FIX_AND_REVERIFY
      - RELEASE_BLOCKED
      - RELEASE_READY
    releaseReadyRequires:
      - DEVELOPMENT_BASELINE_CONFIRMED
      - CURRENT_SOURCE_UNITY_ANDROID_BUILD_SUCCESS
      - BUILD_PREFLIGHT_NO_RELEASE_BLOCKER
      - CURRENT_BUILD_ANDROID_RUNTIME_PASS
      - CURRENT_BUILD_INDEPENDENT_QA_REGRESSION_PASS
      - FINAL_REVIEW_SAME_BUILD_RUNTIME_QA_NO_UNRESOLVED_BLOCKER
      - CORE_DESIGN_LOCK_NOT_VIOLATED
    finalArtbookOnlyAfterReleaseReady: true

promotion:
  DESIGN_ONLY_TO_DEVELOPMENT_CONFIRMED:
    requires: DESIGN_BASELINE_READY
  DEVELOPMENT_CONFIRMED_TO_RELEASE_CONFIRMED:
    requires:
      - DEVELOPMENT_BASELINE_READY
      - REAL_PLAY_EVIDENCE
      - REAL_UNITY_EVIDENCE
  classMovementNeverUsedToSatisfyCountQuota: true
  normalPromotionNeverTriggersSeedReplenishment: true
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
    directAssistantReviewedAt: 2026-09-12
    status: VERIFIED_RUNTIME_PASS_TRUE
    objective: VERIFIED_BLACK_BOX_RUNTIME_PLAYTEST
    gameId: block-blast
    packageId: com.block.juggle
    executionScope: EXTERNAL_FREE_SERVER_ONLY
    completionCondition:
      - VERIFIED_RUNTIME_PASS_TRUE
      - UNAVOIDABLE_OWNER_ACTION_REQUIRED
    ownerObservedGameEntry:
      gameEntryObserved: true
      evidenceAuthority: OWNER_DIRECT_OBSERVATION_PLUS_CORRELATED_RUN30_EVIDENCE
      exactRunCorrelationConfirmed: true
      stableRuntimePassConfirmed: true
      correlatedRunNumber: 30
      correlatedWorkflowRunId: 34653320467
      correlatedArtifactId: 10284397608
      rule: PRESERVE_GAME_ENTRY_SUCCESS_AND_LATER_FAILURE_AS_SEPARATE_EVIDENCE_STAGES
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
      temporaryTransferUrlDocumentationForbidden: true
      localPcExecutionForbiddenForThisCase: true
      paidRunnerOrPaidCloudForbidden: true
    evidenceGate:
      installPassIsNotRuntimePass: true
      splashVisibilityIsNotRuntimePass: true
      processCreationIsNotRuntimePass: true
      infrastructureReadyIsNotRuntimePass: true
      gameEntryIsMeaningfulPartialEvidence: true
      gameEntryAloneIsNotRuntimePass: true
      stagedEvidenceRequired:
        - INSTALL
        - LAUNCH
        - GAME_ENTRY
        - INPUT_EXERCISE
        - STABILITY
        - CRASH_OR_ANR
      runtimePassRequires:
        - APP_LAUNCH
        - FOREGROUND_OWNERSHIP
        - PROCESS_SURVIVAL
        - INPUT_EXERCISE
        - NO_FATAL_EXCEPTION_OR_NATIVE_CRASH
        - NO_ANR_IN_CAPTURED_WINDOW
    experimentHistory:
      - run: 1
        route: INITIAL_ANDROID_EMULATOR_SERVER
        result: FAIL
        evidence: AVD_HOME_OR_PATH_HANDLING_ERROR_BEFORE_MEANINGFUL_RUNTIME
      - run: 2
        route: UBUNTU_ARM_RUNNER
        result: FAIL
        evidence: ANDROID_SDK_ROOT_OR_TOOLING_NOT_FOUND_AS_EXPECTED
      - run: 3
        route: EMULATOR_WITH_SDK_PATH_FIXED
        result: FAIL
        evidence: ADB_MISSING_FROM_PATH_BEFORE_RUNTIME_VALIDATION
      - run: 4
        route: X86_ANDROID_EMULATOR_WITH_ARM_TRANSLATION
        result: INCONCLUSIVE
        evidence: INSTALL_PATH_REACHED_BUT_RUNTIME_EVIDENCE_INSUFFICIENT
      - run: 5
        route: API35_X86_64_GOOGLE_APIS_ARM_TRANSLATION
        result: FAIL
        evidence: SPLASH_THEN_SIGABRT_IN_NATIVE_TRANSLATION_PATH
      - run: 6
        route: API34_X86_64_GOOGLE_APIS_ARM_TRANSLATION
        result: FAIL
        evidence: INSTALL_PASS_THEN_TRANSLATED_NATIVE_RUNTIME_CRASH
      - run: 7
        route: ARM64_GUEST_ON_X86_UBUNTU_HOST
        result: FAIL
        evidence: SOFTWARE_EMULATION_TOO_SLOW_AND_CANCELLED_BY_CONCURRENCY
      - run: 8
        route: API34_X86_PLAY_IMAGE
        result: FAIL
        evidence: ADB_AUTHORIZATION_BLOCKED_AUTOMATION
      - run: 9
        route: API34_X86_PLAY_IMAGE_RETRY
        result: FAIL
        evidence: SAME_ADB_AUTHORIZATION_BLOCKER_CONFIRMED
      - run: 10
        route: X86_EMULATOR_STORAGE_ADJUSTMENT
        result: FAIL
        evidence: USERDATA_STORAGE_INSUFFICIENT
      - run: 11
        route: X86_EMULATOR_DISK_RETRY
        result: FAIL
        evidence: HOSTED_RUNNER_DISK_REMAINED_INSUFFICIENT
      - run: 12
        route: API33_X86_64_AFTER_DISK_RECOVERY
        result: FAIL
        evidence: EMULATOR_BOOT_EXCEEDED_300_SECOND_LIMIT
      - run: 13
        route: API33_X86_64_BOOTED
        result: FAIL
        evidence: GUEST_ABI_X86_64_ONLY_WITHOUT_NATIVE_BRIDGE_ARM64_INSTALL_UNSUPPORTED
      - run: 14
        route: GITHUB_MACOS_ARM64_ANDROID_ARM64_EMULATOR
        result: FAIL
        evidence: NESTED_HVF_UNAVAILABLE_WITH_HV_UNSUPPORTED
      - run: 15
        route: API36_X86_64_GOOGLE_APIS_ARM_TRANSLATION
        result: FAIL
        evidence: ARM64_ABILIST_AND_NATIVE_BRIDGE_PRESENT_BUT_STREAMING_SPLIT_INSTALL_FINALIZATION_BROKEN_PIPE
        artifactId: 10277466402
      - run: 16
        route: API36_X86_64_NO_STREAMING_INSTALL_AND_PACKAGE_RECOVERY
        result: FAIL
        evidence: INSTALL_COMPLETED_BUT_LAUNCH_HIT_GAME_FATAL_EXCEPTION_JAVA_ASSERTION_ERROR
      - run: 17
        route: API36_X86_64_TRANSLATION_STABILIZED
        result: FAIL
        evidence: UNKNOWN_X86_64_SA_RESTORER_IN_HOST_SIGACTION_CONFIRMED_TRANSLATION_LAYER_INCOMPATIBILITY
      - run: 18
        route: GITHUB_UBUNTU_24_04_ARM_NATIVE_REDROID
        result: FAIL
        evidence: DOCKER_PACKAGE_CONFLICT_CONTAINERD_IO_VS_CONTAINERD_BEFORE_ANDROID_RUNTIME
      - run: 19
        route: NATIVE_ARM64_REDROID_WITH_EXISTING_DOCKER
        result: FAIL
        evidence: HOST_AND_BINDER_READY_BUT_ANDROID_NOT_USABLE_THROUGH_ADB_WAIT_WITHIN_LIMIT
      - run: 20
        route: NATIVE_ARM64_REDROID_DIRECT_DOCKER_EXEC_ANDROID16_15_13_FALLBACK
        result: FAIL
        evidence: REDROID16_AND_15_NEVER_REACHED_BOOT_COMPLETED_AND_REDROID13_EXITED
        workflowRunId: 34639996916
        artifactId: 10279414322
        finalError: REDROID_INTERNAL_BOOT_FAILED
      - run: 28
        route: NATIVE_ARM64_REDROID_ANDROID14_DIRECT_SERVICE_CALLS
        result: PASS_RUNTIME_ONLY
        evidence: RUNTIMEPASS_TRUE_BUT_VISUAL_REVIEW_FOUND_SYSTEM_OVERLAY_AND_FIRST_RUN_CONSENT_STILL_BLOCKING_GAMEPLAY_ENTRY
        workflowRunId: 34649947806
        artifactId: 10284105242
      - run: 29
        route: RUN30_GAME_ENTRY_EVIDENCE_WORKFLOW_WITH_EXPIRED_EPHEMERAL_TRANSFER
        result: FAIL_INFRA
        evidence: NATIVE_ANDROID_READY_THEN_APK_DOWNLOAD_FAILED_BEFORE_INSTALL_OR_GAMEPLAY
        workflowRunId: 34653150525
      - run: 30
        route: NATIVE_ARM64_REDROID_ANDROID14_CORRELATED_GAME_ENTRY_AND_DRAG_INPUT
        result: PASS
        evidence: ACTUAL_TUTORIAL_BOARD_CAPTURED_DRAG_INPUT_CHANGED_BOARD_PROCESS_SURVIVED_FOREGROUND_NO_FATAL_NATIVE_CRASH_OR_ANR_MARKER
        workflowRunId: 34653320467
        artifactId: 10284397608
    provenFacts:
      - GITHUB_UBUNTU_24_04_ARM_HOST_IS_NATIVE_AARCH64
      - HOST_PAGE_SIZE_IS_4096
      - BINDER_LINUX_CAN_LOAD_ON_CURRENT_ARM64_RUNNER
      - BINDERFS_BINDER_HWBINDER_VNDBINDER_DEVICES_CAN_BE_CREATED
      - ACTUAL_GAME_ENTRY_WAS_OBSERVED_IN_AT_LEAST_ONE_PRIOR_SERVER_EXPERIMENT
      - RUN30_CORRELATED_ACTUAL_GAME_ENTRY_AND_INPUT_EVIDENCE_CONFIRMED
      - X86_64_ARM_TRANSLATION_CAN_REACH_INSTALL_OR_LAUNCH_BUT_REPEATEDLY_FAILS_SUSTAINED_RUNTIME_COMPATIBILITY
      - GITHUB_MACOS_ARM64_DOES_NOT_PROVIDE_REQUIRED_NESTED_HVF_FOR_ANDROID_ARM64_EMULATOR
      - NATIVE_ANDROID14_REDROID_BOOT_INSTALL_LAUNCH_GAME_ENTRY_AND_INPUT_SUCCEEDED_ON_GITHUB_HOSTED_ARM64
      - VERIFIED_RUNTIME_PASS_TRUE_IN_RUN_30
    routeState:
      x86ArmTranslation: EXHAUSTED_FOR_STABLE_RUNTIME_UNLESS_MATERIALLY_NEW_EVIDENCE
      hostedMacArm64Emulator: BLOCKED_BY_NESTED_HVF
      githubHostedArm64Redroid: VERIFIED_WORKING_ANDROID14_NATIVE_ARM64_RUN30
      randomAndroidApiCycling: FORBIDDEN_WITHOUT_NEW_HYPOTHESIS
    nextExperimentRules:
      - START_FROM_LATEST_EVIDENCE_NOT_STALE_RUN_IDS
      - PRESERVE_PARTIAL_GAME_ENTRY_SUCCESS_IF_A_LATER_FAILURE_OCCURS
      - DO_NOT_REPEAT_EXHAUSTED_ROUTE_WITHOUT_MATERIALLY_NEW_CAPABILITY_OR_HYPOTHESIS
      - PROBE_RUNTIME_CAPABILITY_BEFORE_DOWNLOADING_PROPRIETARY_APK_BYTES
      - REMOVE_EPHEMERAL_APK_BYTES_AFTER_EACH_RUN
      - REQUIRE_CORRELATED_VISUAL_GAME_ENTRY_AND_INPUT_EVIDENCE_FOR_FUTURE_RUNTIME_PROMOTION
    learningUse:
      negativeEvidenceAllowed: true
      partialObservableDistillationAllowed: true
      positiveGameplayDistillationAllowed: true
      partialObservationBoundary: DIRECTLY_CAPTURED_BLACK_BOX_BEHAVIOR_ONLY
      positiveGameplayDistillationUnlockCondition: VERIFIED_RUNTIME_PASS_TRUE
      positiveGameplayDistillationUnlockConditionSatisfied: true
      positiveGameplayDistillationScope: DIRECTLY_CAPTURED_GAME_ENTRY_INPUT_RESPONSE_AND_VISIBLE_STATE_CHANGE_ONLY
      allowedNegativeTopics:
        - HOSTED_ANDROID_ABI_COMPATIBILITY
        - NATIVE_BRIDGE_LIMITATIONS
        - NESTED_VIRTUALIZATION_CONSTRAINTS
        - SPLIT_APK_INSTALL_FAILURE_RECOVERY
        - BINDER_AND_ANDROID_CONTAINER_PREREQUISITES
        - RUNTIME_EVIDENCE_GATING
        - FAILURE_TO_NEXT_EXPERIMENT_DECISION_QUALITY
    evidenceBindings:
      privateHistory: hans1177/jaewoon-ai-company/server-playtest/block-blast-experiment-history.md
      publicNegativeDistillation: company-learning/external-game-playtest/block-blast-runtime-distillation.json
      ownerGameEntryCorrection: company-learning/external-game-playtest/block-blast-game-entry-correction.json

learning:
  aiDesignOpinionAloneIsNotSuccessEvidence: true
  validatedEvidenceSources:
    - REAL_PLAY
    - WEB_GAMEPLAY_VALIDATION
    - UNITY_TECHNICAL_VALIDATION
    - ANDROID_RUNTIME
    - INDEPENDENT_QA
    - RELEASE_RESULT
  labelSuccessAndFailureCauses: true
  onlyValidatedPatternsFeedVibe2Learning: true
```