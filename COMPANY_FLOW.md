# JAEWOON COMPANY PRODUCTION POLICY

```yaml
policy:
  sourceOfTruth: COMPANY_FLOW.md
  format: MACHINE_ORIENTED_POLICY_SPEC
  humanReadableNarrativeRequired: false
  ownerInstructionOverridesPolicy: true
  implementationMustFollowPolicy: true
  evidenceFilesCannotCreatePolicy: true
  separatePolicyDocumentsForbidden: true
  machineContractsMayMirrorPolicyButCannotCreatePolicy: true
  latestOwnerDirectiveRecordedAt: 2026-09-12

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

documentationSynchronization:
  centralPolicyFirst: true
  workDocumentsMustMirrorCurrentCentralPolicy: true
  syncRelevantWorkDocumentsOnEveryPolicyChange: true
  implementationWorkStartsAfterRelevantWorkDocumentsAreSynchronized: true
  workDocumentsCannotOverrideCentralPolicy: true

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
      - FAST_BROWSER_QA
      - PORTABLE_GAMEPLAY_VALIDATION
      - AUXILIARY_LEARNING_EVIDENCE
    featureParity: APPROVED_GAMEPLAY_SCOPE_EQUIVALENT_OR_DOCUMENTED_PLATFORM_ADAPTATION
    silentFeatureOmissionForbidden: true
    webBuildIsNotNativePlatformSubstitute: true
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
  roadmapPhaseEntryGatesForbidden: true
  platformDevelopmentMayStartWithoutPriorPlatformCompletion: true
  platformReleaseMayProceedWhenItsOwnEvidenceGatesPass: true
  noParallelLearningPipeline: true
  runtimeContractMirror: company-learning/platform-release-roadmap.json
  runtimeContractCannotCreatePolicy: true
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
      - DEPARTMENT_SCORE
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

artbookDocumentConsolidation:
  copiedSourceDocument: ARTBOOK_SUBMISSION_CONTRACT.md
  copiedSourceWasLatestArtbookDocumentAtConsolidation: true
  copiedAt: 2026-09-12
  originalContent: |-
    # 아트북 제출 호환 문서

    재운컴퍼니의 설계·아트북·부서회의 정책 원본은 **`COMPANY_FLOW.md` 하나뿐**이다.

    이 파일은 과거 도구와 링크의 호환 경로다. 부서가 아트북 파트를 공동 집필한다는 예전 계약이나 별도 제출 정책을 여기서 유지하지 않는다.

    현재 출력 형식과 검증 스키마는 실행 코드가 담당하며, 그 의미와 역할 분리는 항상 `COMPANY_FLOW.md`를 따른다.

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
      - TARGET_PLATFORM_UX_DIRECTION_DEFINED
      - PLATFORM_SELECTION_RECORDED
      - MANDATORY_WEB_COMPANION_REQUIREMENT_RECORDED
      - APPROVED_SCOPE_INVENTORY_RECORDED
      - FIVE_DISTINCT_LEAD_MODELS
      - FIVE_DEPARTMENT_SCORES_RECORDED
      - PER_DEPARTMENT_MULTIMODEL_REVIEW_PASS
      - NO_HIDDEN_FATAL_CONFLICT
    readyState: DESIGN_BASELINE_READY
  DEVELOPMENT_CONFIRMED:
    executionMode: GATED_DIRECT
    resumeFromLatestEvidence: true
    webPurpose: MANDATORY_GAMEPLAY_COMPANION_AND_VALIDATION
    targetPlatformPurpose: TECHNICAL_AND_GAMEPLAY_VALIDATION
    webBeforeTargetPlatformByDefault: false
    targetPlatformMayRunImmediately: true
    aiMayInventValidationPass: false
    webSmokeCountsAsGameplayValidation: false
    requiredFlow:
      - LOAD_DESIGN_BASELINE
      - WEB_COMPANION_SOURCE_BIND
      - WEB_COMPANION_GAMEPLAY_VALIDATION
      - TARGET_PLATFORM_SOURCE_BIND
      - TARGET_PLATFORM_GAMEPLAY_VALIDATION
      - TARGET_PLATFORM_TECHNICAL_VALIDATION
      - TARGET_PLATFORM_EVIDENCE_DEPARTMENT_MEETING
      - GAME_DESIGNER_TECH_REVISION
      - TARGETED_REVALIDATION
      - DEVELOPMENT_BASELINE_GATE
      - ARTBOOK_EDITOR_REVISION
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
    webCompanionValidationRequired: true
    approvedScopeCompletionRequired: true
    decisionStates:
      - KEEP
      - CHANGE
      - DROP
      - HOLD
    waitingStates:
      - WAITING_WEB_COMPANION_VALIDATION
      - WAITING_TARGET_PLATFORM_VALIDATION
      - WAITING_TARGET_PLATFORM_REVALIDATION
      - WAITING_REVALIDATION
    terminalStates:
      - DEVELOPMENT_BASELINE_READY
      - DEVELOPMENT_BLOCKED
    baselineReadyRequires:
      - DESIGN_BASELINE_EXISTS
      - WEB_COMPANION_RUNTIME_PASS
      - APPROVED_SCOPE_FULLY_IMPLEMENTED
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
      - WEB_COMPANION_BUILD_OR_PACKAGE
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

promotion:
  DESIGN_ONLY_TO_DEVELOPMENT_CONFIRMED:
    requires: DESIGN_BASELINE_READY
  DEVELOPMENT_CONFIRMED_TO_RELEASE_CONFIRMED:
    requires:
      - DEVELOPMENT_BASELINE_READY
      - REAL_PLAY_EVIDENCE
      - REAL_SELECTED_PLATFORM_EVIDENCE
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
  webGameEvidence:
    role: AUXILIARY_PORTABLE_LEARNING_EVIDENCE
    maySupport:
      - CORE_GAMEPLAY_IMPLEMENTATION
      - GAME_LOOP
      - UI_FLOW
      - STATE_MANAGEMENT
      - BUGFIX
      - BROWSER_QA_PATTERNS
    cannotClaimNativePlatformSuccess: true
    cannotSatisfyNativePlatformRuntimeGate: true
    cannotEnterRobloxUnityUefnVerifiedLaneWithoutMatchingNativeEvidence: true
    useExistingCanonicalDistillationOnly: true
    newTrainerOrCronForbidden: true
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
