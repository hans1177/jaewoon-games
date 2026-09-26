// 파일명: qa/company-direct-native-policy-contract.test.mjs
// 역할: 현재 중앙 Source of Truth의 Roblox+Unity direct-native 개발/내부플레이테스트 계약 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const runtime=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');

test('canonical policy routes new Roblox and Unity work through the Unity Web readiness floor and keeps UEFN owner-held',()=>{
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  const direct=roadmap.directNativeDualPlatformDevelopment;
  assert.equal(direct.status,'OWNER_DIRECT_LOCKED');
  assert.equal(direct.mode,'ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR');
  assert.deepEqual(direct.supportedDevelopmentPlatforms,['ROBLOX','UNITY']);
  assert.equal(direct.webDevelopmentStageRemoved,false);
  assert.equal(direct.unityWebEnabled,true);
  assert.equal(direct.unityWebRequired,true);
  assert.equal(direct.unityWebGateRequired,true);
  assert.equal(direct.unityWebMode,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(direct.unityWebValidationSurface?.requiredForDevelopmentAdmission,true);
  assert.equal(direct.unityWebValidationSurface?.requiredForInternalRelease,false);
  assert.equal(direct.upperPlatformAdmission,'UPPER_PLATFORM_DEVELOPMENT_READY');
  const fan=direct.unityWebNativeFanOut;
  assert.equal(fan?.enabled,true);
  assert.equal(fan?.role,'MAIN_BOUND_UPPER_PLATFORM_READINESS_HANDOFF');
  assert.equal(fan?.trigger,'UPPER_PLATFORM_DEVELOPMENT_READY_ON_MAIN');
  assert.deepEqual(fan?.targets,['ROBLOX','UNITY']);
  assert.equal(fan?.exactGameOnly,true);
  assert.equal(fan?.requiresMinimumDesignContract,true);
  assert.equal(fan?.developmentAdmissionAuthority,true);
  assert.equal(fan?.directDispatchFromUnityWebBuildForbidden,true);
  assert.equal(fan?.sourceTreeExactMatchRequired,true);
  assert.equal(fan?.nativeEvidenceStillRequired,true);
  assert.equal(direct.upperPlatformAdmissionMigration?.existingNativeDevelopmentGrandfathered,true);
  assert.equal(direct.upperPlatformAdmissionMigration?.grandfatherMode,'DURABLE_NATIVE_PROGRESS_EVIDENCE');
  assert.deepEqual(direct.upperPlatformAdmissionMigration?.grandfatherGameIds,[]);
  assert.equal(direct.upperPlatformAdmissionMigration?.developmentConfirmedWithoutNativeProgressMustRunUnityWebFloor,true);
  assert.equal(direct.upperPlatformAdmissionMigration?.newNativeDevelopmentStartRequiresUnityWebReadiness,true);
  assert.equal(direct.orchestrationConcurrency?.globalSerializationForbidden,true);
  assert.equal(direct.orchestrationConcurrency?.distinctGamesParallel,true);
  assert.equal(direct.orchestrationConcurrency?.unityWebAndNativeParallelWhenIndependent,true);
  assert.equal(direct.orchestrationConcurrency?.longRunningNativeMayNotBlockUnityWebFloor,true);
  assert.equal(direct.orchestrationConcurrency?.sameGameIndependentNonOverlappingPackagesParallel,true);
  assert.equal(direct.orchestrationConcurrency?.onlyAllowedSerialization,'ATOMIC_SHARED_STATE_WRITE_OR_EXACT_RESPONSIBLE_FILE_CONFLICT');
  assert.equal(roadmap.developmentSpeedExecution.globalHeavyExecutionSerializationForbidden,true);
  assert.equal(roadmap.developmentSpeedExecution.globalOrchestrationSerializationForbidden,true);
  assert.equal(roadmap.developmentSpeedExecution.longRunningNativeBuildMayNotBlockUnityWebDevelopment,true);
  assert.equal(roadmap.developmentSpeedExecution.runtimeWaitMustReleaseIndependentDevelopmentCapacity,true);
  assert.equal(roadmap.developmentSpeedExecution.sharedStateSerializationScope,'ATOMIC_SHARED_STATE_WRITE_CRITICAL_SECTION_ONLY');
  assert.equal(direct.minimumDesignRequired,true);
  assert.equal(direct.sameGameBothPlatformsRequired,true);
  assert.equal(direct.platformSpecificRuntimeEvidenceRequired,true);
  assert.equal(direct.platformSpecificIndependentQaRequired,true);
  assert.equal(direct.platformSpecificRegressionRequired,true);
  assert.equal(direct.fortniteUefnState,'OWNER_HOLD');
  assert.equal(roadmap.developmentAccess.FORTNITE_UEFN,'OWNER_HOLD');
});

test('lifecycle uses Unity Web as the pre-native development floor and keeps release separate',()=>{
  const life=roadmap.developmentLifecycleMachine;
  assert.deepEqual(life.stages,[
    'MINIMUM_DESIGN_CONTRACT_READY',
    'UNITY_WEB_CODE_AND_GRAPHICS_DEVELOPMENT',
    'UNITY_WEBGL_BUILD',
    'UNITY_WEB_ACTUAL_BROWSER_PLAY',
    'UNITY_WEB_INDEPENDENT_QA',
    'UNITY_WEB_REGRESSION',
    'UPPER_PLATFORM_DEVELOPMENT_READY',
    'ROBLOX_UNITY_NATIVE_SOURCE_BIND',
    'TARGET_PLATFORM_RUNTIME',
    'TARGET_PLATFORM_INDEPENDENT_QA',
    'TARGET_PLATFORM_REGRESSION',
    'INTERNAL_PLATFORM_RELEASE',
    'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
    'PUBLIC_RELEASE_READY',
    'PUBLIC_RELEASE',
    'POST_RELEASE_FOCUSED_DEVELOPMENT'
  ]);
  assert.equal(life.directNativeDualPlatformDevelopment.admission,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(life.directNativeDualPlatformDevelopment.unityWebDevelopmentFloorRequired,true);
  assert.equal(life.directNativeDualPlatformDevelopment.unityWebGateRequiredForUpperPlatformStart,true);
  assert.equal(life.directNativeDualPlatformDevelopment.existingNativeDevelopmentGrandfathered,true);
  assert.equal(Object.hasOwn(life,'webToPlatformHandoff'),false);
  assert.equal(Object.hasOwn(life,'webFirstImplementation'),false);
  assert.equal(life.machineWorkInstruction.internalPlaytestWorker.activeCoDevelopment,true);
  assert.equal(life.machineWorkInstruction.internalPlaytestWorker.publicPromotionBlockedUntilAcceptance,true);
  assert.equal(life.gameDevelopmentAuthority.ownsWebFirstImplementation,false);
  assert.equal(life.gameDevelopmentAuthority.ownsSelectedPlatformImplementation,true);
  assert.equal(life.gameDevelopmentAuthority.ownsInternalPlaytestRepair,true);
});

test('directive mirrors the Unity Web readiness gate without making Web a release platform',()=>{
  assert.equal(directive.currentExecutionMode,'UNITY_WEB_FLOOR_THEN_DIRECT_NATIVE_ROBLOX_UNITY');
  assert.equal(Object.hasOwn(directive,'legacyWebFirstPolicy'),false);
  assert.equal(directive.directNativeDualPlatformDevelopment.webDevelopmentStageRemoved,false);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebEnabled,true);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebRequired,true);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebGateRequired,true);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebMode,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.upperPlatformAdmissionAuthority,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.targetPlatformMayRunImmediately,false);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityWebDevelopmentMayRunImmediately,true);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityWebValidationSurface.nativeGateAuthority,true);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityWebValidationSurface.releaseAuthority,false);
  assert.equal(directive.classes.RELEASE_CONFIRMED.webCompanionRequired,false);
  assert.equal(directive.ai.vibe2.ownsInternalPlaytestRepair,true);
  assert.equal(directive.ai.robloxStudioExecutionMode,'OFFICIAL_STUDIO_MCP_LOCAL_EXACT_BUILD_ONLY');
  assert.equal(directive.ai.robloxPlayerAutomationAllowed,false);
  assert.equal(directive.ai.robloxStudioExternalGuiAutomationAllowed,false);
  assert.equal(directive.ai.robloxStudioUndocumentedCliAutomationAllowed,false);
});

test('architecture and runtime execute Unity Web readiness before new upper-platform dispatch',()=>{
  assert.deepEqual(architecture.executionTopology.web,[
    'UNITY_WEB_FULL_DEVELOPMENT_FLOOR',
    'SAME_CANONICAL_UNITY_PROJECT',
    'CODE_AND_GRAPHICS_BUILD_UP',
    'UNITY_WEBGL_BUILD',
    'ACTUAL_BROWSER_PLAY',
    'INDEPENDENT_QA',
    'REGRESSION',
    'UPPER_PLATFORM_DEVELOPMENT_READINESS_EVALUATION',
    'REPAIR_REQUIRED_OR_UPPER_PLATFORM_HANDOFF'
  ]);
  assert.equal(architecture.concurrentPlatformDevelopment.admissionAuthority,'UPPER_PLATFORM_DEVELOPMENT_READY');
  assert.equal(architecture.concurrentPlatformDevelopment.webAdmissionAuthority,true);
  assert.ok(architecture.executionTopology.selectedPlatform.includes('UPPER_PLATFORM_DEVELOPMENT_READY'));
  assert.ok(architecture.executionTopology.selectedPlatform.includes('ROBLOX_UNITY_AUTO_PAIR'));
  assert.match(runtime,/UPPER_PLATFORM_MACHINE_CONTRACT=PASS/);
  assert.match(runtime,/upper-platform-development-readiness\.json/);
  assert.match(runtime,/UPPER_PLATFORM_GRANDFATHERED_IDS=/);
  assert.match(runtime,/eligible_json:/);
  assert.match(runtime,/unity_web_json:/);
  assert.match(runtime,/UNITY_WEB_FLOOR_BOOTSTRAP_IDS=/);
  assert.match(runtime,/uses: \.\/\.github\/workflows\/unity-web-floor-source-bootstrap\.yml/);
  assert.match(runtime,/grandfatherGameIds/);
  assert.match(runtime,/uses: \.\/\.github\/workflows\/company-development-roblox-runtime\.yml/);
  assert.match(runtime,/uses: \.\/\.github\/workflows\/company-development-unity-runtime\.yml/);
  assert.match(runtime,/uses: \.\/\.github\/workflows\/unity-web-first-stage-build\.yml/);
  assert.doesNotMatch(runtime,/gh workflow run (?:company-development|unity-web)/);
  const webWorkflow=fs.readFileSync('.github/workflows/unity-web-first-stage-build.yml','utf8');
  assert.match(webWorkflow,/Run Unity Web independent QA/);
  assert.match(webWorkflow,/Run Unity Web regression/);
  assert.match(webWorkflow,/Evaluate upper-platform development readiness/);
  assert.match(webWorkflow,/upper-platform-development-readiness\.json/);
  assert.doesNotMatch(webWorkflow,/Fan verified Unity Web into exact Roblox and Unity development/);
  assert.equal(architecture.concurrentPlatformDevelopment.unityWeb,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.doesNotMatch(runtime,/company-development-web-bootstrap\.mjs/);
});

test('active scheduling cannot silently re-enable UEFN or weaken native evidence',()=>{
  assert.deepEqual(roadmap.platformPriorityInvariant.priorityTiers,[['UNITY','ROBLOX']]);
  assert.deepEqual(roadmap.platformPriorityInvariant.schedulingOrder,['UNITY','ROBLOX']);
  assert.equal(roadmap.platformPriorityInvariant.fortniteUefnDevelopmentStillAllowed,false);
  assert.equal(roadmap.platformPriorityInvariant.qualityOrEvidenceGateWeakeningAllowed,false);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.externalRelease.requiresOwnRuntimeQaRegressionAndExplicitPublicExposureEvidence,true);
});

test('Roblox internal release enters perpetual 3-to-6 buildup while external public release stays fail-closed',()=>{
  const gate=roadmap.developmentLifecycleMachine.internalPlatformReleaseAndPublicExposureGate;
  const loop=gate.internalBuildupLoop;
  const hard=gate.externalPublicReleaseHardGate;
  assert.equal(loop.status,'ACTIVE_EXECUTABLE_CONTRACT_WITH_ACTUAL_VIBE_PLAY_EXECUTOR_REQUIRED');
  assert.equal(loop.startsAfter,'INTERNAL_PLATFORM_RELEASE');
  assert.equal(loop.perpetual,true);
  assert.equal(loop.neverCompletes,true);
  assert.equal(loop.continuesAfterPublicRelease,true);
  assert.deepEqual(loop.sequence,[
    'VIBE_INTERNAL_PLAY',
    'CAUSAL_REPAIR_AND_DEVELOPMENT',
    'ROBLOX_PLATFORM_REBUILD',
    'EXACT_CANDIDATE_REVALIDATION',
    'LOOP_BACK_TO_VIBE_INTERNAL_PLAY'
  ]);
  assert.equal(loop.actualVibePlayEvidenceRequired,true);
  assert.equal(loop.actualVibePlayExecutor,'.github/workflows/company-development-roblox-post-runtime-qa.yml#studio-mcp-auto-play');
  assert.equal(loop.actualVibePlaySurface,'ROBLOX_STUDIO_MCP_PLAY_MODE');
  assert.equal(loop.robloxPlayerAutomation,false);
  assert.equal(loop.externalGuiAutomation,false);
  assert.equal(loop.undocumentedStudioCliAutomation,false);
  assert.equal(loop.thirdPartyMcpBridgeForbidden,true);
  assert.equal(loop.generatedBatchRepairPolicy,'DO_NOT_REWRITE_USE_OFFICIAL_INSTALLED_STUDIOMCP_EXE_FALLBACK');
  assert.equal(roadmap.roblox.studioExecution.generatedBatchBrokenOrStaleFallbackAllowed,true);
  assert.equal(roadmap.roblox.studioExecution.generatedBatchRewriteForbidden,true);
  assert.equal(roadmap.roblox.studioExecution.thirdPartyMcpBridgeForbidden,true);
  assert.equal(roadmap.roblox.studioExecution.studioMcpWindowsOfficialBinaryFallback,'%LOCALAPPDATA%\\Roblox\\Versions\\version-*\\StudioMCP.exe');
  assert.equal(loop.historicalSharedTargetExactArtifactLocalPlayAllowed,true);
  assert.equal(loop.historicalSharedTargetLocalPlayDoesNotClaimCurrentPublishedRuntime,true);
  assert.equal(loop.syntheticStaticOrDeclaredPlayPassForbidden,true);
  assert.equal(loop.noDurationExit,true);
  assert.equal(loop.noLimitedOrRestrictedPublicTestExit,true);
  assert.equal(hard.status,'FAIL_CLOSED');
  assert.equal(hard.criteriaMode,'EVIDENCE_AND_COMPLETION_ONLY');
  assert.equal(hard.fixedDurationRequired,false);
  assert.equal(hard.elapsedDaysRequired,null);
  assert.equal(hard.limitedOrRestrictedPublicTestRequired,false);
  assert.equal(hard.allRequirementsRequired,true);
  assert.equal(hard.exactCandidateBindingRequired,true);
  assert.ok(hard.requirements.includes('ACTUAL_VIBE_INTERNAL_PLAY_EVIDENCE_PASS'));
  assert.ok(hard.requirements.includes('GAME_COMPLETION_EVIDENCE_PASS'));
  assert.ok(hard.requirements.includes('ROBLOX_PLATFORM_ADAPTATION_RUNTIME_EVIDENCE_PASS'));
  assert.ok(hard.requirements.includes('PRESENTATION_COMPLETION_EVIDENCE_PASS'));
  assert.ok(hard.requirements.includes('EXACT_PUBLIC_CANDIDATE_FINAL_REVALIDATION_PASS'));
  assert.equal(gate.publicExposure.publicReadyMayNotBeSetByInternalReleaseOrF9Alone,true);
  assert.equal(gate.publicExposure.publicReadyRequiresHardGatePass,true);

  const archLoop=architecture.releaseExposureLifecycle.robloxPerpetualInternalBuildup;
  const archGate=architecture.releaseExposureLifecycle.robloxExternalPublicReleaseHardGate;
  assert.equal(archLoop.perpetual,true);
  assert.equal(archLoop.continuesAfterPublicRelease,true);
  assert.equal(archLoop.actualPlayExecutor,'.github/workflows/company-development-roblox-post-runtime-qa.yml#studio-mcp-auto-play');
  assert.equal(archLoop.windowsMcpOfficialBinaryFallback,'%LOCALAPPDATA%\\Roblox\\Versions\\version-*\\StudioMCP.exe');
  assert.equal(archLoop.thirdPartyMcpBridge,false);
  assert.equal(archGate.failClosed,true);
  assert.equal(archGate.actualVibePlayRequired,true);
  assert.equal(archGate.f9InternalReleaseCannotSetPublicReady,true);
  assert.equal(archGate.fixedDurationRequired,false);
  assert.equal(archGate.restrictedPublicTestRequired,false);
});

test('every accepted Roblox buildup modification must rebuild before revalidation and replay',()=>{
  const loop=roadmap.developmentLifecycleMachine.internalPlatformReleaseAndPublicExposureGate.internalBuildupLoop;
  assert.equal(loop.rebuildAfterEveryAcceptedModificationRequired,true);
  assert.equal(loop.modifiedSourceMayNotReusePriorBuildArtifact,true);
  assert.equal(loop.modifiedSourceInvalidatesAffectedPlayAndValidationEvidence,true);
  assert.equal(loop.rebuildMustProduceNewExactCandidateBeforeRevalidation,true);
  assert.equal(loop.revalidationMustBindToRebuiltCandidate,true);
  assert.deepEqual(loop.rebuildSequence,[
    'ACCEPTED_MODIFICATION_WRITTEN',
    'PRIOR_AFFECTED_ARTIFACT_AND_PLAY_EVIDENCE_INVALIDATED',
    'ROBLOX_PLATFORM_REBUILD',
    'INTERNAL_REDEPLOY_EXACT_CANDIDATE',
    'EXACT_CANDIDATE_REVALIDATION',
    'VIBE_INTERNAL_PLAY'
  ]);
  const a=architecture.releaseExposureLifecycle.robloxPerpetualInternalBuildup;
  assert.equal(a.rebuildAfterEveryAcceptedModification,true);
  assert.equal(a.staleArtifactReuseAfterSourceModification,false);
  assert.equal(a.revalidationInput,'NEWLY_REBUILT_EXACT_CANDIDATE_ONLY');
});


test('native executors cannot bypass Unity Web upper-platform readiness',()=>{
  const unity=fs.readFileSync('.github/workflows/company-development-unity-runtime.yml','utf8');
  const roblox=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  for(const workflow of [unity,roblox]){
    assert.match(workflow,/company-upper-platform-admission\.mjs/);
    assert.match(workflow,/classifyUpperPlatformAdmission/);
    assert.match(workflow,/grandfatherGameIds/);
    assert.match(workflow,/admission\.state!=='UPPER_PLATFORM'/);
  }
  assert.match(unity,/UNITY_NATIVE_ADMISSION_BLOCKED=/);
  assert.match(roblox,/ROBLOX_NATIVE_ADMISSION_BLOCKED=/);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.grandfatherMode,'DURABLE_NATIVE_PROGRESS_EVIDENCE');
  assert.deepEqual(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.grandfatherGameIds,[]);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.developmentConfirmedWithoutNativeProgressMustRunUnityWebFloor,true);
});

test('Unity Web source bootstrap is fail-closed for any durable native progress without fixed game ids',()=>{
  const workflow=fs.readFileSync('.github/workflows/unity-web-floor-source-bootstrap.yml','utf8');
  const generator=fs.readFileSync('tools/company-unity-web-floor-bootstrap.mjs','utf8');
  assert.match(workflow,/nativeUpperPlatformAlreadyStarted/);
  assert.doesNotMatch(workflow,/const forbidden=new Set\(\['cozy-island','daechung-rpg'\]\)/);
  assert.match(workflow,/UNITY_WEB_BOOTSTRAP_GRANDFATHER_FORBIDDEN/);
  assert.match(workflow,/company-unity-web-floor-bootstrap\.mjs/);
  assert.match(workflow,/git add "unity-games\/$GAME_ID"/);
  assert.doesNotMatch(workflow,/git add "unity-games\/$GAME_ID" "\.build-requests\/unity-web\/\$id\.json"/);
  assert.match(generator,/BOOTSTRAP_REQUIRES_GRAPHICS_BUILDUP/);
  assert.match(generator,/upperPlatformReady:false/);
  assert.match(generator,/releaseOrDeploymentAuthority:false/);
  assert.match(generator,/public static void BuildWeb\(\)/);
  const webWorkflow=fs.readFileSync('.github/workflows/unity-web-first-stage-build.yml','utf8');
  assert.match(webWorkflow,/bootstrapGraphicsBlocked/);
  assert.match(webWorkflow,/presentationState==='BOOTSTRAP_REQUIRES_GRAPHICS_BUILDUP'/);
});


test('development orchestrator never globally serializes heavy platform or Unity Web execution',()=>{
  assert.doesNotMatch(runtime,/^concurrency:\s*\n\s*group:\s*company-development-confirmed-runtime\s*$/m);
  assert.match(runtime,/dispatch-roblox:/);
  assert.match(runtime,/dispatch-unity:/);
  assert.match(runtime,/dispatch-unity-web-floor:/);
  assert.match(runtime,/dispatch-unity-web-bootstrap:/);
});
