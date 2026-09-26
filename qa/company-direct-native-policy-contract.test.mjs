// 파일명: qa/company-direct-native-policy-contract.test.mjs
// 역할: 현재 중앙 Source of Truth의 Roblox+Unity direct-native 개발/내부플레이테스트 계약 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const runtime=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');

test('canonical policy starts Unity Web Roblox and Unity concurrently from minimum design readiness',()=>{
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  const direct=roadmap.directNativeDualPlatformDevelopment;
  assert.equal(direct.status,'OWNER_DIRECT_LOCKED');
  assert.equal(direct.mode,'UNITY_WEB_ROBLOX_UNITY_FULL_PARALLEL_BY_GAME_ID');
  assert.deepEqual(direct.supportedDevelopmentPlatforms,['ROBLOX','UNITY']);
  assert.equal(direct.unityWebEnabled,true);
  assert.equal(direct.unityWebRequired,true);
  assert.equal(direct.unityWebGateRequired,false);
  assert.equal(direct.unityWebMode,'PARALLEL_DEVELOPMENT_AND_VALIDATION_LANE');
  assert.equal(direct.unityWebValidationSurface.requiredForDevelopmentAdmission,false);
  assert.equal(direct.platformRequestAutomaticallyStartsBoth,true);
  assert.equal(direct.triggerRule,'MINIMUM_DESIGN_CONTRACT_READY_STARTS_UNITY_WEB_ROBLOX_UNITY_CONCURRENT_FOR_SAME_GAME');
  assert.deepEqual(direct.parallelDevelopmentFanOut.lanes,['UNITY_WEB','ROBLOX','UNITY']);
  assert.equal(direct.parallelDevelopmentFanOut.sameGameConcurrentStart,true);
  assert.equal(direct.parallelDevelopmentFanOut.crossLaneDevelopmentAdmissionDependencyForbidden,true);
  assert.equal(direct.orchestrationConcurrency.globalSerializationForbidden,true);
  assert.equal(direct.orchestrationConcurrency.distinctGamesParallel,true);
  assert.equal(direct.orchestrationConcurrency.sameGameUnityWebRobloxUnityStartConcurrent,true);
  assert.equal(direct.orchestrationConcurrency.internalPlatformOrderForbidden,true);
  assert.equal(roadmap.platformDevelopmentMayStartWithoutPriorPlatformCompletion,true);
  assert.equal(roadmap.platformReleaseMayProceedWhenOwnEvidencePasses,true);
  assert.equal(direct.fortniteUefnState,'OWNER_HOLD');
});

test('lifecycle has no Web-before-native or upper-lower development admission dependency',()=>{
  const life=roadmap.developmentLifecycleMachine;
  assert.deepEqual(life.stages,[
    'MINIMUM_DESIGN_CONTRACT_READY',
    'PARALLEL_FAN_OUT_UNITY_WEB_ROBLOX_UNITY',
    'LANE_LOCAL_SOURCE_BUILD',
    'LANE_LOCAL_RUNTIME',
    'LANE_LOCAL_INDEPENDENT_QA',
    'LANE_LOCAL_REGRESSION',
    'INTERNAL_PLATFORM_RELEASE',
    'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
    'PUBLIC_RELEASE_READY',
    'PUBLIC_RELEASE',
    'POST_RELEASE_FOCUSED_DEVELOPMENT'
  ]);
  assert.equal(life.directNativeDualPlatformDevelopment.admission,'MINIMUM_DESIGN_CONTRACT_READY');
  assert.deepEqual(life.directNativeDualPlatformDevelopment.concurrentTargets,['UNITY_WEB','ROBLOX','UNITY']);
  assert.equal(life.directNativeDualPlatformDevelopment.unityWebRunsAlongsideNativeWhenBuildable,true);
  assert.equal(life.directNativeDualPlatformDevelopment.unityWebDevelopmentFloorRequired,false);
  assert.equal(life.directNativeDualPlatformDevelopment.unityWebGateRequiredForUpperPlatformStart,false);
  assert.equal(life.directNativeDualPlatformDevelopment.upperPlatformStartOnlyAfterUnityWebReadinessPass,false);
  assert.equal(life.directNativeDualPlatformDevelopment.sameGameThreeLaneConcurrentStart,true);
  assert.equal(life.directNativeDualPlatformDevelopment.crossLaneDevelopmentAdmissionDependencyForbidden,true);
});

test('directive mirrors full parallel development without becoming policy authority',()=>{
  assert.equal(directive.currentExecutionMode,'MINIMUM_DESIGN_THEN_FULL_PARALLEL_UNITY_WEB_ROBLOX_UNITY');
  assert.equal(directive.directNativeDualPlatformDevelopment.mode,'UNITY_WEB_ROBLOX_UNITY_FULL_PARALLEL_BY_GAME_ID');
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebGateRequired,false);
  assert.deepEqual(directive.directNativeDualPlatformDevelopment.parallelDevelopmentLanes,['UNITY_WEB','ROBLOX','UNITY']);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.targetPlatformMayRunImmediately,true);
  assert.deepEqual(directive.classes.DEVELOPMENT_CONFIRMED.parallelDevelopmentLanes,['UNITY_WEB','ROBLOX','UNITY']);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityWebValidationSurface.nativeGateAuthority,false);
  assert.equal(directive.classes.RELEASE_CONFIRMED.webCompanionRequired,false);
});

test('architecture and runtime fan out all lanes by game id without cross-lane admission gates',()=>{
  assert.equal(architecture.concurrentPlatformDevelopment.trigger,'MINIMUM_DESIGN_CONTRACT_READY_STARTS_ALL_THREE_LANES');
  assert.equal(architecture.concurrentPlatformDevelopment.executionMode,'UNITY_WEB_ROBLOX_UNITY_FULL_PARALLEL_BY_GAME_ID');
  assert.equal(architecture.concurrentPlatformDevelopment.admissionAuthority,'MINIMUM_DESIGN_CONTRACT_READY');
  assert.equal(architecture.concurrentPlatformDevelopment.webAdmissionAuthority,false);
  assert.deepEqual(architecture.concurrentPlatformDevelopment.parallelDevelopmentFanOut.lanes,['UNITY_WEB','ROBLOX','UNITY']);
  assert.equal(architecture.concurrentPlatformDevelopment.parallelDevelopmentFanOut.sameGameConcurrentStart,true);
  assert.equal(architecture.concurrentPlatformDevelopment.orchestrationConcurrency.internalPlatformOrderForbidden,true);
  assert.match(runtime,/FULL_PARALLEL_DEVELOPMENT=PASS/);
  assert.match(runtime,/PARALLEL_LANES=UNITY_WEB,ROBLOX,UNITY/);
  assert.match(runtime,/CROSS_LANE_ADMISSION_DEPENDENCY=NONE/);
  assert.match(runtime,/dispatch-roblox:/);
  assert.match(runtime,/dispatch-unity:/);
  assert.match(runtime,/dispatch-unity-web-floor:/);
  assert.match(runtime,/dispatch-unity-web-bootstrap:/);
  assert.doesNotMatch(runtime,/classifyUpperPlatformAdmission/);
  assert.doesNotMatch(runtime,/UPPER_PLATFORM_MACHINE_CONTRACT=PASS/);
  const webBootstrap=fs.readFileSync('.github/workflows/unity-web-floor-source-bootstrap.yml','utf8');
  assert.match(webBootstrap,/group: unity-web-source-bootstrap-\$\{\{ inputs\.game_ids \}\}/);
  assert.doesNotMatch(webBootstrap,/nativeUpperPlatformAlreadyStarted/);
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


test('native executors start from minimum design and never wait for Unity Web readiness',()=>{
  const unity=fs.readFileSync('.github/workflows/company-development-unity-runtime.yml','utf8');
  const roblox=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  for(const workflow of [unity,roblox]){
    assert.doesNotMatch(workflow,/classifyUpperPlatformAdmission/);
    assert.doesNotMatch(workflow,/NATIVE_ADMISSION_BLOCKED/);
  }
  assert.match(unity,/UNITY_PARALLEL_ADMISSION=/);
  assert.match(roblox,/ROBLOX_PARALLEL_ADMISSION=/);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.developmentConfirmedWithoutNativeProgressMustRunUnityWebFloor,false);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.newNativeDevelopmentStartRequiresUnityWebReadiness,false);
});

test('Unity Web source bootstrap is game-id scoped and may run beside native development',()=>{
  const workflow=fs.readFileSync('.github/workflows/unity-web-floor-source-bootstrap.yml','utf8');
  const generator=fs.readFileSync('tools/company-unity-web-floor-bootstrap.mjs','utf8');
  assert.doesNotMatch(workflow,/nativeUpperPlatformAlreadyStarted/);
  assert.doesNotMatch(workflow,/UNITY_WEB_BOOTSTRAP_GRANDFATHER_FORBIDDEN/);
  assert.match(workflow,/group: unity-web-source-bootstrap-\$\{\{ inputs\.game_ids \}\}/);
  assert.match(workflow,/company-unity-web-floor-bootstrap\.mjs/);
  assert.match(workflow,/git add "unity-games\/\$id"/);
  assert.match(generator,/BOOTSTRAP_REQUIRES_GRAPHICS_BUILDUP/);
  assert.match(generator,/upperPlatformReady:false/);
  assert.match(generator,/releaseOrDeploymentAuthority:false/);
  const webWorkflow=fs.readFileSync('.github/workflows/unity-web-first-stage-build.yml','utf8');
  assert.match(webWorkflow,/UNITY_WEB_QUALITY_CHECKPOINT=/);
  assert.match(webWorkflow,/nativeGateAuthority:false/);
});

test('development orchestrator never globally serializes heavy platform or Unity Web execution',()=>{
  assert.doesNotMatch(runtime,/^concurrency:\s*\n\s*group:\s*company-development-confirmed-runtime\s*$/m);
  assert.match(runtime,/dispatch-roblox:/);
  assert.match(runtime,/dispatch-unity:/);
  assert.match(runtime,/dispatch-unity-web-floor:/);
  assert.match(runtime,/dispatch-unity-web-bootstrap:/);
});
