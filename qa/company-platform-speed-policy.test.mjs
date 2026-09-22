import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
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
  assert.match(flow,/commonExecutionContract:/);
  assert.match(flow,/router: tools\/company-selected-platform-router\.mjs/);
  assert.match(flow,/singleRoutingDecisionPoint: true/);
  assert.match(flow,/commonAdapterContractRequired: true/);
  assert.match(flow,/commonEvidenceSchemaRequired: true/);
  for(const field of ['PLATFORM','SOURCE_REVISION','BUILD_OR_PACKAGE_PASSED','ARTIFACT_IDENTITY','RUNTIME_PASSED','INDEPENDENT_QA_PASSED','REGRESSION_PASSED','EXACT_REVISION','LAST_SUCCESSFUL_STAGE','FAILURE_STAGE','FAILURE_SIGNATURE']){
    assert.match(flow,new RegExp(`- ${field}`));
  }
  assert.match(flow,/ROBLOX: tools\/vibe3-roblox-platform\.mjs/);
  assert.match(flow,/UNITY: tools\/company-development-unity-platform\.mjs/);
  assert.match(flow,/FORTNITE_UEFN: tools\/company-development-uefn-platform\.mjs/);
});

test('speed sequence changes execution only and cannot weaken quality gates',()=>{
  assert.match(flow,/scope: EXECUTION_SPEED_ONLY/);
  assert.match(flow,/qualityOrEvidenceGateWeakeningForbidden: true/);
  let cursor=0;
  for(const stage of canonicalSequence){
    const next=flow.indexOf(`- ${stage}`,cursor);
    assert.ok(next>=cursor,`missing or out-of-order speed stage: ${stage}`);
    cursor=next+stage.length;
  }
  assert.match(flow,/buildOncePerSourceFingerprint: true/);
  assert.match(flow,/sameArtifactRequiredAcrossRuntimeIndependentQaAndRegression: true/);
  assert.match(flow,/retryMustResumeFromExactFailedStageWhenPriorEvidenceStillMatches: true/);
  assert.match(flow,/successfulStepMustNotBeRepeatedWithoutInvalidatingChange: true/);
  assert.match(flow,/nextCanonicalStageDispatchImmediatelyAfterSuccess: true/);
  assert.match(flow,/cronRole: WATCHDOG_AND_RECOVERY_ONLY/);
  assert.match(flow,/cronMustNotBePrimaryProgressionEngine: true/);
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
  assert.equal(roadmap.legacyPolicyMirror.authoritative,false);
  assert.equal(roadmap.runtimeContractCannotCreatePolicy,true);
  assert.equal(roadmap.commonExecutionContract.router,'tools/company-selected-platform-router.mjs');
  assert.equal(roadmap.commonExecutionContract.singleRoutingDecisionPoint,true);
  assert.deepEqual(roadmap.developmentSpeedExecution.canonicalSequence,canonicalSequence);
  assert.equal(roadmap.developmentSpeedExecution.qualityOrEvidenceGateWeakeningForbidden,true);
  assert.equal(roadmap.developmentSpeedExecution.buildOncePerSourceFingerprint,true);
  assert.equal(roadmap.developmentSpeedExecution.sameArtifactRequiredAcrossRuntimeIndependentQaAndRegression,true);
  assert.equal(roadmap.developmentSpeedExecution.cronRole,'WATCHDOG_AND_RECOVERY_ONLY');
});
