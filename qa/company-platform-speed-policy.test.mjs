import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const canonicalSequence=[
  'CHANGE_DETECTION',
  'CHEAP_PRECHECK',
  'REPRESENTATIVE_CANARY',
  'SINGLE_BUILD_OR_PACKAGE',
  'IMMUTABLE_ARTIFACT_BIND',
  'TARGET_PLATFORM_RUNTIME',
  'INDEPENDENT_QA',
  'REGRESSION',
  'IMMEDIATE_NEXT_STAGE_DISPATCH',
  'RESUME_EXACT_FAILURE_POINT',
];

test('central policy defines one selected-platform router and common evidence contract',()=>{
  const contract=roadmap.commonExecutionContract;
  assert.equal(contract.router,'tools/company-selected-platform-router.mjs');
  assert.equal(contract.singleRoutingDecisionPoint,true);
  assert.equal(contract.commonAdapterContractRequired,true);
  assert.equal(contract.commonEvidenceSchemaRequired,true);
  for(const field of ['PLATFORM','SOURCE_REVISION','BUILD_OR_PACKAGE_PASSED','ARTIFACT_IDENTITY','RUNTIME_PASSED','INDEPENDENT_QA_PASSED','REGRESSION_PASSED','EXACT_REVISION','LAST_SUCCESSFUL_STAGE','FAILURE_STAGE','FAILURE_SIGNATURE']){
    assert.ok(contract.commonEvidenceFields.includes(field),field);
  }
  assert.equal(contract.adapters.ROBLOX,'tools/vibe3-roblox-platform.mjs');
  assert.equal(contract.adapters.UNITY,'tools/company-development-unity-platform.mjs');
});

test('speed sequence changes execution only and cannot weaken quality gates',()=>{
  const speed=roadmap.developmentSpeedExecution;
  assert.equal(speed.scope,'EXECUTION_SPEED_ONLY');
  assert.equal(speed.qualityOrEvidenceGateWeakeningForbidden,true);
  assert.deepEqual(speed.canonicalSequence,canonicalSequence);
  assert.equal(speed.buildOncePerSourceFingerprint,true);
  assert.equal(speed.sameArtifactRequiredAcrossRuntimeIndependentQaAndRegression,true);
  assert.equal(speed.retryMustResumeFromExactFailedStageWhenPriorEvidenceStillMatches,true);
  assert.equal(speed.successfulStepMustNotBeRepeatedWithoutInvalidatingChange,true);
  assert.equal(speed.nextCanonicalStageDispatchImmediatelyAfterSuccess,true);
  assert.equal(speed.cronRole,'WATCHDOG_AND_RECOVERY_ONLY');
  assert.equal(speed.cronMustNotBePrimaryProgressionEngine,true);
});

test('Unity and Roblox are the active equal scheduling tier while UEFN remains owner-held',()=>{
  assert.deepEqual(roadmap.priority,['ROBLOX','UNITY']);
  assert.equal(roadmap.primaryPlatform,'ROBLOX');
  assert.equal(roadmap.primaryPlatformRole,'LEGACY_COMPATIBILITY_ONLY_NOT_SCHEDULING_PRIORITY');
  assert.equal(roadmap.platformPriorityInvariant.mode,'UNITY_ROBLOX_EQUAL_FIRST_TIER');
  assert.deepEqual(roadmap.platformPriorityInvariant.priorityTiers,[['UNITY','ROBLOX']]);
  assert.deepEqual(roadmap.platformPriorityInvariant.schedulingOrder,['UNITY','ROBLOX']);
  assert.equal(roadmap.platformPriorityInvariant.robloxMustReceiveFirstEligibleDevelopmentSlot,false);
  assert.equal(roadmap.platformPriorityInvariant.unityDevelopmentStillAllowed,true);
  assert.equal(roadmap.platformPriorityInvariant.fortniteUefnDevelopmentStillAllowed,false);
  assert.equal(roadmap.platformPriorityInvariant.fortniteUefnState,'OWNER_HOLD');
  assert.equal(roadmap.platformPriorityInvariant.qualityOrEvidenceGateWeakeningAllowed,false);
  assert.equal(roadmap.developmentAccess.FORTNITE_UEFN,'OWNER_HOLD');
  assert.equal(roadmap.developmentLifecycleMachine.platformPriorityInvariant.schedulerMustHonorRobloxFirst,false);
  assert.equal(roadmap.developmentLifecycleMachine.platformPriorityInvariant.schedulerMustHonorUnityRobloxEqualTier,true);
  assert.equal(roadmap.developmentLifecycleMachine.platformPriorityInvariant.fortniteUefnExcludedWhileOwnerHold,true);
});
test('canonical machine roadmap owns the execution contract',()=>{
  assert.equal(roadmap.policySource,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.authority,'MACHINE_EXECUTION_CONTRACT');
  assert.equal(roadmap.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.humanDocumentRequired,false);
  assert.equal(Object.hasOwn(roadmap,'legacyPolicyMirror'),false);
  assert.equal(roadmap.runtimeContractCannotCreatePolicy,true);
  assert.equal(roadmap.commonExecutionContract.router,'tools/company-selected-platform-router.mjs');
  assert.equal(roadmap.commonExecutionContract.singleRoutingDecisionPoint,true);
  assert.deepEqual(roadmap.developmentSpeedExecution.canonicalSequence,canonicalSequence);
  assert.equal(roadmap.developmentSpeedExecution.qualityOrEvidenceGateWeakeningForbidden,true);
  assert.equal(roadmap.developmentSpeedExecution.buildOncePerSourceFingerprint,true);
  assert.equal(roadmap.developmentSpeedExecution.sameArtifactRequiredAcrossRuntimeIndependentQaAndRegression,true);
  assert.equal(roadmap.developmentSpeedExecution.cronRole,'WATCHDOG_AND_RECOVERY_ONLY');
});


test('non-development CI fan-out stays impact-scoped and does not duplicate runtime metadata work',()=>{
  const status=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
  const homepage=fs.readFileSync('.github/workflows/homepage-manager.yml','utf8');
  const vibe=fs.readFileSync('.github/workflows/vibe-qa.yml','utf8');
  const evolution=fs.readFileSync('.github/workflows/company-evolution-qa.yml','utf8');
  const central=fs.readFileSync('.github/workflows/company-central-policy-contract-qa.yml','utf8');

  assert.match(status,/Company DEVELOPMENT_CONFIRMED Roblox Final Review Revalidation/);
  assert.match(status,/Company DEVELOPMENT_CONFIRMED Roblox Release Promotion/);
  assert.doesNotMatch(status,/Company DEVELOPMENT_CONFIRMED Roblox Runtime\n/);
  assert.doesNotMatch(status,/Company DEVELOPMENT_CONFIRMED Roblox Runtime Continuation/);
  assert.doesNotMatch(status,/Company DEVELOPMENT_CONFIRMED Roblox Post-Runtime QA/);
  assert.doesNotMatch(status,/Company DEVELOPMENT_CONFIRMED Roblox Multiplayer QA/);

  assert.match(homepage,/workflow_run:\n\s+workflows:\n\s+- Company Status Sync/);
  assert.doesNotMatch(homepage,/workflows:\n(?:\s+- .*\n)*\s+- Company DEVELOPMENT_CONFIRMED Runtime/);

  assert.doesNotMatch(vibe,/'assets\/\*\*'/);
  assert.match(vibe,/'assets\/vibe-\*\.js'/);
  assert.match(vibe,/'assets\/asset-manifest\.json'/);

  assert.doesNotMatch(evolution,/'tools\/company-\*\.mjs'/);
  assert.doesNotMatch(evolution,/'qa\/company-\*\.test\.mjs'/);
  assert.match(evolution,/'tools\/company-release-production-cycle\.mjs'/);
  assert.match(evolution,/'qa\/company-system-ai-evolution\.test\.mjs'/);

  assert.match(central,/Resolve impact-scoped central contract work/);
  assert.match(central,/CENTRAL_POLICY_STUDIO_QA=/);
  assert.match(central,/CENTRAL_POLICY_POST_RUNTIME_QA=/);
  assert.match(central,/CENTRAL_POLICY_STUDIO_CONTRACT=REUSED_UNCHANGED/);
  assert.match(central,/CENTRAL_POLICY_POST_RUNTIME_CONTRACT=REUSED_UNCHANGED/);
});
