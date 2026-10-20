// 파일명: qa/company-direct-native-policy-contract.test.mjs
// 역할: 현재 중앙 Source of Truth의 Roblox+Unity direct-native 개발/내부플레이테스트 계약 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const runtime=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');

test('canonical policy enables Roblox and holds both Unity targets and UEFN',()=>{
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  const direct=roadmap.directNativeDualPlatformDevelopment;
  assert.equal(direct.status,'OWNER_DIRECT_LOCKED');
  assert.equal(direct.mode,'ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR');
  assert.deepEqual(direct.supportedDevelopmentPlatforms,['ROBLOX','UNITY']);
  assert.equal(direct.webDevelopmentStageRemoved,false);
  assert.equal(direct.unityWebEnabled,false);
  assert.equal(direct.unityWebRequired,false);
  assert.equal(direct.unityWebGateRequired,false);
  assert.equal(direct.unityWebMode,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(direct.unityWebValidationSurface?.requiredForDevelopmentAdmission,false);
  assert.equal(direct.unityWebValidationSurface?.requiredForInternalRelease,false);
  assert.equal(direct.upperPlatformAdmission,'MINIMUM_DESIGN_READY');
  const fan=direct.unityWebNativeFanOut;
  assert.equal(fan?.enabled,false);
  assert.equal(fan?.role,'MAIN_BOUND_UPPER_PLATFORM_READINESS_HANDOFF');
  assert.equal(fan?.trigger,'UPPER_PLATFORM_DEVELOPMENT_READY_ON_MAIN');
  assert.deepEqual(fan?.targets,['ROBLOX','UNITY']);
  assert.equal(fan?.exactGameOnly,true);
  assert.equal(fan?.requiresMinimumDesignContract,true);
  assert.equal(fan?.developmentAdmissionAuthority,false);
  assert.equal(fan?.directDispatchFromUnityWebBuildForbidden,true);
  assert.equal(fan?.sourceTreeExactMatchRequired,true);
  assert.equal(fan?.nativeEvidenceStillRequired,true);
  assert.equal(direct.upperPlatformAdmissionMigration?.existingNativeDevelopmentGrandfathered,true);
  assert.equal(direct.upperPlatformAdmissionMigration?.grandfatherMode,'DURABLE_NATIVE_PROGRESS_EVIDENCE');
  assert.deepEqual(direct.upperPlatformAdmissionMigration?.grandfatherGameIds,[]);
  assert.equal(direct.upperPlatformAdmissionMigration?.developmentConfirmedWithoutNativeProgressMustRunUnityWebFloor,false);
  assert.equal(direct.upperPlatformAdmissionMigration?.newNativeDevelopmentStartRequiresUnityWebReadiness,false);
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
  assert.equal(direct.sameGameBothPlatformsRequired,false);
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
  assert.equal(life.directNativeDualPlatformDevelopment.admission,'MINIMUM_DESIGN_READY');
  assert.equal(life.directNativeDualPlatformDevelopment.unityWebDevelopmentFloorRequired,false);
  assert.equal(life.directNativeDualPlatformDevelopment.unityWebGateRequiredForUpperPlatformStart,false);
  assert.equal(life.directNativeDualPlatformDevelopment.existingNativeDevelopmentGrandfathered,true);
  assert.equal(Object.hasOwn(life,'webToPlatformHandoff'),false);
  assert.equal(Object.hasOwn(life,'webFirstImplementation'),false);
  assert.equal(life.machineWorkInstruction.internalPlaytestWorker.activeCoDevelopment,true);
  assert.equal(life.machineWorkInstruction.internalPlaytestWorker.publicPromotionBlockedUntilAcceptance,true);
  assert.equal(life.gameDevelopmentAuthority.ownsWebFirstImplementation,false);
  assert.equal(life.gameDevelopmentAuthority.ownsSelectedPlatformImplementation,true);
  assert.equal(life.gameDevelopmentAuthority.ownsInternalPlaytestRepair,true);
});

test('directive mirrors Roblox-only development and holds Unity Web',()=>{
  assert.equal(directive.currentExecutionMode,'ROBLOX_ONLY_CONTINUOUS_DEVELOPMENT');
  assert.equal(Object.hasOwn(directive,'legacyWebFirstPolicy'),false);
  assert.equal(directive.directNativeDualPlatformDevelopment.webDevelopmentStageRemoved,false);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebEnabled,false);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebRequired,false);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebGateRequired,false);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebMode,'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.upperPlatformAdmissionAuthority,'MINIMUM_DESIGN_READY');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.targetPlatformMayRunImmediately,true);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityWebDevelopmentMayRunImmediately,false);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityWebValidationSurface.nativeGateAuthority,false);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityWebValidationSurface.releaseAuthority,false);
  assert.equal(directive.classes.RELEASE_CONFIRMED.webCompanionRequired,false);
  assert.equal(directive.ai.vibe2.ownsInternalPlaytestRepair,true);
  assert.equal(directive.ai.robloxStudioExecutionMode,'OFFICIAL_STUDIO_MCP_LOCAL_EXACT_BUILD_ONLY');
  assert.equal(directive.ai.robloxPlayerAutomationAllowed,false);
  assert.equal(directive.ai.robloxStudioExternalGuiAutomationAllowed,false);
  assert.equal(directive.ai.robloxStudioUndocumentedCliAutomationAllowed,false);
});


test('Roblox upper-platform dispatch dedupes only active runs from the current main control revision',()=>{
  assert.match(runtime,/CURRENT_CONTROL_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(runtime,/const activeIds=\(file,prefix,exactHead=''\)=>/);
  assert.match(runtime,/if\(exactHead&&String\(run\.head_sha\|\|''\)!==exactHead\)continue/);
  assert.match(runtime,/const activeRoblox=activeIds\('\/tmp\/active-roblox-native-runs\.json','Roblox runtime · ',currentControlSha\)/);
  assert.match(runtime,/ROBLOX_NATIVE_DISPATCH_DEDUPED_CURRENT_MAIN=/);
  assert.match(runtime,/ROBLOX_NATIVE_DISPATCH_CURRENT_MAIN_REQUIRED=/);
});





test('native executors enforce minimum design while Unity Android development is held',()=>{
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
  assert.equal(roadmap.directNativeDualPlatformDevelopment.upperPlatformAdmissionMigration.developmentConfirmedWithoutNativeProgressMustRunUnityWebFloor,false);
});

test('Unity Web source bootstrap is fail-closed for any durable native progress without fixed game ids',()=>{
  const workflow=fs.readFileSync('.github/workflows/unity-web-floor-source-bootstrap.yml','utf8');
  const generator=fs.readFileSync('tools/company-unity-web-floor-bootstrap.mjs','utf8');
  assert.match(workflow,/nativeUpperPlatformAlreadyStarted/);
  assert.doesNotMatch(workflow,/const forbidden=new Set\(\['cozy-island','daechung-rpg'\]\)/);
  assert.match(workflow,/UNITY_WEB_BOOTSTRAP_EXISTING_SOURCE_MUST_BE_REPAIRED_IN_PLACE/);
  assert.match(workflow,/company-unity-web-floor-bootstrap\.mjs/);
  assert.match(workflow,/git add "unity-games\/\$GAME_ID"/);
  assert.doesNotMatch(workflow,/git add "unity-games\/\$GAME_ID" "\.build-requests\/unity-web\/\$GAME_ID\.json"/);
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
  assert.doesNotMatch(runtime,/dispatch-unity-web-floor:/);
  assert.doesNotMatch(runtime,/dispatch-unity-web-bootstrap:/);
});


test('current machine authority permits Roblox and general Web but holds Unity and UEFN',()=>{
  assert.equal(roadmap.status,'OWNER_DIRECT_LOCKED');
  assert.deepEqual(roadmap.ownerActiveDevelopmentScope20261009.activeTargets,['ROBLOX','WEB']);
  assert.equal(roadmap.developmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  assert.equal(roadmap.developmentAccess.WEB,'ALWAYS_ALLOWED');
  for(const platform of ['UNITY','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN'])
    assert.equal(roadmap.developmentAccess[platform],'OWNER_HOLD',platform);
});

test('central ordinary Web policy publishes each main revision before public verification on the existing route',()=>{
  const order=roadmap.webRuntimeStartabilityContract.publicationOrder;
  assert.deepEqual(order.sequence,['MERGE_AUTHORIZED_SOURCE_TO_MAIN','PUBLISH_EXACT_MAIN_VIA_EXISTING_GITHUB_PAGES','VERIFY_PUBLIC_DEPLOYED_SAME_REVISION','RECORD_FAILURE_AND_REPAIR_REDEPLOY']);
  assert.equal(order.qaScoreOrF0F9MayBlockStaticPublication,false);
  assert.equal(order.postDeploymentVerificationRequired,true);
  assert.equal(order.verificationMustMatchPublishedSourceShaAndGameTree,true);
  assert.equal(order.failedOrUnverifiedRuntimeMayBeReportedPass,false);
  assert.equal(order.deploymentImpliesProductionReady,false);
  assert.equal(order.existingF0F9DefinitionsAndInternalOrderPreserved,true);
  const workflow=fs.readFileSync(order.existingWorkflow,'utf8');
  const push=workflow.split('  push:')[1].split('  workflow_dispatch:')[0];
  assert.match(push,/branches:\s*\[main\]/);assert.doesNotMatch(push,/paths|paths-ignore|if:/);
  assert.ok(workflow.indexOf('uses: actions/deploy-pages@v4')<workflow.indexOf('      - name: Verify live GitHub Pages source and game routes'));
  const header=workflow.split('  publish-pages:')[1].split('    steps:')[0];
  assert.match(header,/needs: deploy/);assert.doesNotMatch(header,/needs: \[|qa_pass|approval|result ==/);
});
