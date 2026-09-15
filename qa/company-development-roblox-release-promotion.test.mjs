import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleRobloxDevelopmentReleaseEvidence} from '../tools/vibe3-roblox-platform.mjs';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');

function canonicalItem(){
  const sourceRevision='a'.repeat(40);
  const artifactIdentity=`sha256:${'b'.repeat(64)}`;
  const artifactRunId=12345;
  return {
    gameId:'seed-test-roblox',
    productionClass:'DEVELOPMENT_CONFIRMED',
    selectedPlatform:'ROBLOX',
    robloxSourceCommit:sourceRevision,
    robloxSourceFingerprint:'fingerprint',
    robloxSourceBootstrapPassedAt:'2026-09-15T00:00:00Z',
    robloxBuildSourceRevision:sourceRevision,
    robloxBuildArtifactIdentity:artifactIdentity,
    robloxBuildOrPackagePassed:true,
    robloxBuildPreflightPassed:true,
    robloxBuildPreflightEvidence:{pass:true,sourceRevision,artifactIdentity,authority:'roblox-five-distinct-lead-build-preflight'},
    robloxRuntimePassed:true,
    robloxServerClientBoundaryPassed:true,
    robloxDatastoreRejoinPassed:true,
    robloxRuntimeEvidence:{sourceRevision,artifactIdentity,artifactRunId,runtimePassed:true,serverClientBoundaryPassed:true,saveExists:false,datastoreRejoinPassed:true,authority:'roblox-real-studio-runtime'},
    robloxMobileControlUiPassed:true,
    robloxIndependentQaPassed:true,
    robloxRegressionPassed:true,
    robloxExactRevisionPassed:true,
    robloxPostRuntimeQaEvidence:{sourceRevision,artifactIdentity,artifactRunId,exactRevision:true,mobileControlUiPassed:true,independentQaPassed:true,regressionPassed:true,authority:'roblox-real-studio-post-runtime-qa'},
    robloxMultiplayerMode:'COMPETITIVE',
    robloxMultiplayerApplicable:true,
    robloxMultiplayerQaPassed:true,
    robloxMultiplayerQaEvidence:{sourceRevision,artifactIdentity,artifactRunId,actualStudioRuntime:true,multiplayerClients:2,distinctPlayersPassed:true,serverAuthoritativeRoundtripPassed:true,peerVisibilityPassed:true,multiplayerQaPassed:true,authority:'roblox-real-studio-multiplayer-qa'},
    robloxFinalReviewPassed:true,
  };
}

test('development final release evidence is derived only from exact canonical prior evidence',()=>{
  const evidence=assembleRobloxDevelopmentReleaseEvidence(canonicalItem());
  assert.equal(evidence.pass,true);
  assert.equal(evidence.state,'PASS');
  assert.equal(evidence.sameRevision,true);
  assert.equal(evidence.sameArtifact,true);
  assert.equal(evidence.sameArtifactRun,true);
  assert.equal(evidence.protectedStatePreserved,true);
  assert.equal(evidence.multiplayerQaPassed,true);
  assert.equal(evidence.finalReviewPassed,true);
});

test('development final release evidence fails closed on final review, peer or artifact-run mismatch',()=>{
  const finalReviewMissing=canonicalItem();
  finalReviewMissing.robloxFinalReviewPassed=false;
  assert(assembleRobloxDevelopmentReleaseEvidence(finalReviewMissing).blockedReasons.includes('final-review-not-passed'));

  const peerMissing=canonicalItem();
  peerMissing.robloxMultiplayerQaEvidence.peerVisibilityPassed=false;
  assert(assembleRobloxDevelopmentReleaseEvidence(peerMissing).blockedReasons.includes('multiplayer-qa-not-passed'));

  const runMismatch=canonicalItem();
  runMismatch.robloxPostRuntimeQaEvidence.artifactRunId=99999;
  assert(assembleRobloxDevelopmentReleaseEvidence(runMismatch).blockedReasons.includes('development-artifact-run-mismatch'));

  const artifactMismatch=canonicalItem();
  artifactMismatch.robloxPostRuntimeQaEvidence.artifactIdentity=`sha256:${'c'.repeat(64)}`;
  assert.equal(assembleRobloxDevelopmentReleaseEvidence(artifactMismatch).exactRevision,false);
});

test('release workflow publishes only the retained exact artifact after final review and never reruns Studio QA',()=>{
  assert.match(workflow,/robloxFinalReviewPassed===true/);
  assert.match(workflow,/ROBLOX_RELEASE_PROMOTION_PENDING/);
  assert.match(workflow,/git diff --quiet "\$SOURCE_REVISION" HEAD -- "\$SOURCE_ROOT"/);
  assert.match(workflow,/gh run download "\$ARTIFACT_RUN_ID" --repo "\$GITHUB_REPOSITORY"/);
  assert.match(workflow,/sha256sum "\$place"/);
  assert.match(workflow,/"sha256:\$hash" = "\$expected"/);
  assert.match(workflow,/--assemble-development-release-evidence/);
  assert.match(workflow,/ROBLOX_V3_STATE=READY/);
  assert.match(workflow,/--execute/);
  assert.match(workflow,/ROBLOX_V3_STATE=PUBLISHED/);
  assert.match(workflow,/item\.robloxReleaseClaim=true/);
  assert.match(workflow,/steps\.publish\.outcome == 'success'/);
  assert.match(workflow,/ROBLOX_RUNTIME_RERUN=NO/);
  assert.match(workflow,/ROBLOX_MOBILE_INDEPENDENT_QA_RERUN=NO/);
  assert.match(workflow,/ROBLOX_REGRESSION_RERUN=NO/);
  assert.match(workflow,/ROBLOX_MULTIPLAYER_QA_RERUN=NO/);
  assert.doesNotMatch(workflow,/RobloxStudioBeta\.exe/);
  assert.doesNotMatch(workflow,/company-development-roblox-runtime-smoke\.luau/);
  assert.doesNotMatch(workflow,/company-development-roblox-mobile-independent-qa\.luau/);
});
