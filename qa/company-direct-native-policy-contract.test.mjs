// 파일명: qa/company-direct-native-policy-contract.test.mjs
// 역할: 현재 중앙 Source of Truth의 Roblox+Unity direct-native 개발/내부플레이테스트 계약 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const runtime=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');

test('canonical policy admits Roblox and Unity directly from one minimum design and keeps UEFN owner-held',()=>{
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  const direct=roadmap.directNativeDualPlatformDevelopment;
  assert.equal(direct.status,'OWNER_DIRECT_LOCKED');
  assert.equal(direct.mode,'ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR');
  assert.deepEqual(direct.supportedDevelopmentPlatforms,['ROBLOX','UNITY']);
  assert.equal(direct.webDevelopmentStageRemoved,true);
  assert.equal(direct.unityWebEnabled,true);
  assert.equal(direct.unityWebRequired,false);
  assert.equal(direct.unityWebGateRequired,false);
  assert.equal(direct.unityWebMode,'VALIDATION_SURFACE_ONLY');
  assert.equal(direct.unityWebValidationSurface?.requiredForDevelopmentAdmission,false);
  assert.equal(direct.unityWebValidationSurface?.requiredForInternalRelease,false);
  assert.equal(direct.minimumDesignRequired,true);
  assert.equal(direct.sameGameBothPlatformsRequired,true);
  assert.equal(direct.platformSpecificImplementationRequired,true);
  assert.equal(direct.platformSpecificRuntimeEvidenceRequired,true);
  assert.equal(direct.platformSpecificIndependentQaRequired,true);
  assert.equal(direct.platformSpecificRegressionRequired,true);
  assert.equal(direct.noArtificialGlobalGameCountCap,true);
  assert.equal(direct.fortniteUefnState,'OWNER_HOLD');
  assert.equal(roadmap.developmentAccess.FORTNITE_UEFN,'OWNER_HOLD');
});

test('lifecycle has no active Web-first handoff and treats internal playtest as co-development',()=>{
  const life=roadmap.developmentLifecycleMachine;
  assert.deepEqual(life.stages,['MINIMUM_DESIGN_CONTRACT_READY','ROBLOX_UNITY_NATIVE_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION','INTERNAL_PLATFORM_RELEASE','INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG','PUBLIC_RELEASE_READY','PUBLIC_RELEASE','POST_RELEASE_FOCUSED_DEVELOPMENT']);
  assert.equal(Object.hasOwn(life,'webToPlatformHandoff'),false);
  assert.equal(Object.hasOwn(life,'webFirstImplementation'),false);
  assert.equal(Object.hasOwn(life,'missingWebBaselinePlanning'),false);
  assert.equal(Object.hasOwn(life.machineWorkInstruction||{},'webWorker'),false);
  assert.equal(life.machineWorkInstruction.internalPlaytestWorker.activeCoDevelopment,true);
  assert.equal(life.machineWorkInstruction.internalPlaytestWorker.ownerInterruptSupported,true);
  assert.equal(life.machineWorkInstruction.internalPlaytestWorker.publicPromotionBlockedUntilAcceptance,true);
  assert.equal(life.gameDevelopmentAuthority.appliesFromStage,'MINIMUM_DESIGN_CONTRACT_READY');
  assert.equal(life.gameDevelopmentAuthority.ownsWebFirstImplementation,false);
  assert.equal(life.gameDevelopmentAuthority.ownsSelectedPlatformImplementation,true);
  assert.equal(life.gameDevelopmentAuthority.ownsInternalPlaytestRepair,true);
});

test('directive mirror cannot reactivate legacy Web-first development',()=>{
  assert.equal(directive.currentExecutionMode,'DIRECT_NATIVE_ROBLOX_UNITY');
  assert.equal(Object.hasOwn(directive,'legacyWebFirstPolicy'),false);
  assert.equal(directive.directNativeDualPlatformDevelopment.webDevelopmentStageRemoved,true);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebEnabled,true);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebRequired,false);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebGateRequired,false);
  assert.equal(directive.directNativeDualPlatformDevelopment.unityWebMode,'VALIDATION_SURFACE_ONLY');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.admissionAuthority,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.strictDesignScoreRequiredForAdmission,false);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.strictDesignReviewRunsInParallel,true);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.targetPlatformMayRunImmediately,true);
  assert.equal(directive.classes.DEVELOPMENT_CONFIRMED.unityWebValidationSurface.nativeGateAuthority,false);
  assert.equal(directive.classes.RELEASE_CONFIRMED.webCompanionRequired,false);
  assert.equal(directive.ai.vibe2.ownsWebFirstImplementation,false);
  assert.equal(directive.ai.vibe2.ownsInternalPlaytestRepair,true);
});

test('architecture and runtime execute the same direct-native topology',()=>{
  assert.deepEqual(architecture.executionTopology.web,['UNITY_WEB_VALIDATION_SURFACE_ONLY','SAME_CANONICAL_UNITY_PROJECT','NO_NATIVE_GATE_AUTHORITY']);
  assert.ok(architecture.executionTopology.selectedPlatform.includes('ROBLOX_UNITY_AUTO_PAIR'));
  assert.ok(architecture.executionTopology.selectedPlatform.includes('INTERNAL_PLATFORM_RELEASE'));
  assert.ok(architecture.executionTopology.selectedPlatform.includes('INTERNAL_PLAYTEST'));
  assert.match(runtime,/DIRECT_NATIVE_MACHINE_CONTRACT=PASS/);
  assert.match(runtime,/company-minimum-design-contract\.mjs/);
  assert.match(runtime,/company-selected-platform-router\.mjs/);
  assert.match(runtime,/ROBLOX_RUNTIME_DISPATCH=YES/);
  assert.match(runtime,/UNITY_APP_RUNTIME_DISPATCH=YES/);
  assert.match(runtime,/UNITY_WEB_RUNTIME_DISPATCH_COUNT/);
  assert.match(runtime,/UNITY_WEB_RUNTIME_ROLE=NON_BLOCKING_VALIDATION_SURFACE/);
  assert.match(runtime,/namespaceName=source\.match\(\/\\bnamespace\\s\+\(\[A-Za-z_\]/);
  const webWorkflow=fs.readFileSync('.github/workflows/unity-web-first-stage-build.yml','utf8');
  assert.match(webWorkflow,/namespace = re\.search\(r'\\bnamespace\\s\+/);
  assert.match(webWorkflow,/candidates\.append\(f'\{prefix\}\{classes\[0\]\}\.BuildWeb'\)/);
  assert.doesNotMatch(runtime,/company-development-web-bootstrap\.mjs/);
  assert.doesNotMatch(runtime,/company-development-web-gameplay-validation\.mjs/);
});

test('active scheduling cannot silently re-enable UEFN or weaken native evidence',()=>{
  assert.deepEqual(roadmap.platformPriorityInvariant.priorityTiers,[['UNITY','ROBLOX']]);
  assert.deepEqual(roadmap.platformPriorityInvariant.schedulingOrder,['UNITY','ROBLOX']);
  assert.equal(roadmap.platformPriorityInvariant.fortniteUefnDevelopmentStillAllowed,false);
  assert.equal(roadmap.platformPriorityInvariant.qualityOrEvidenceGateWeakeningAllowed,false);
  assert.equal(roadmap.directNativeDualPlatformDevelopment.externalRelease.requiresOwnRuntimeQaRegressionAndExplicitPublicExposureEvidence,true);
});
