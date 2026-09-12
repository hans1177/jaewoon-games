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

test('runtime roadmap mirrors central execution contract without creating policy',()=>{
  assert.equal(roadmap.policySource,'COMPANY_FLOW.md');
  assert.equal(roadmap.runtimeContractCannotCreatePolicy,true);
  assert.equal(roadmap.commonExecutionContract.router,'tools/company-selected-platform-router.mjs');
  assert.equal(roadmap.commonExecutionContract.singleRoutingDecisionPoint,true);
  assert.deepEqual(roadmap.developmentSpeedExecution.canonicalSequence,canonicalSequence);
  assert.equal(roadmap.developmentSpeedExecution.qualityOrEvidenceGateWeakeningForbidden,true);
  assert.equal(roadmap.developmentSpeedExecution.buildOncePerSourceFingerprint,true);
  assert.equal(roadmap.developmentSpeedExecution.sameArtifactRequiredAcrossRuntimeIndependentQaAndRegression,true);
  assert.equal(roadmap.developmentSpeedExecution.cronRole,'WATCHDOG_AND_RECOVERY_ONLY');
});
