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

test('release workflow publishes only retained exact artifact and keeps transient Roblox busy recovery manual while automatic publishing is paused',()=>{
  assert.match(workflow,/robloxFinalReviewPassed===true/);
  assert.match(workflow,/ROBLOX_RELEASE_PROMOTION_PENDING/);
  assert.match(workflow,/git diff --quiet "\$SOURCE_REVISION" HEAD -- "\$SOURCE_ROOT"/);
  assert.match(workflow,/gh run download "\$ARTIFACT_RUN_ID" --repo "\$GITHUB_REPOSITORY"/);
  assert.match(workflow,/sha256sum "\$place"/);
  assert.match(workflow,/"sha256:\$hash" = "\$expected"/);
  assert.match(workflow,/--assemble-development-release-evidence/);
  assert.match(workflow,/item\.robloxPublicationTarget/);
  assert.match(workflow,/company-runtime-publication-target/);
  assert.match(workflow,/company-runtime-prior-release/);
  assert.match(workflow,/known-good-runtime-evidence\.json/);
  assert.match(workflow,/row\.gameId===gameId/);
  assert.match(workflow,/row\.sourceRevision===revision/);
  assert.match(workflow,/row\.artifactIdentity===artifact/);
  assert.match(workflow,/Number\(row\.artifactRunId\)===artifactRunId/);
  assert.match(workflow,/publicationTarget\|\|\{\}/);
  assert.match(workflow,/persistedTarget\.verified===true/);
  assert.match(workflow,/ROBLOX_RELEASE_PUBLICATION_TARGET_MISSING_OR_MISMATCH/);
  assert.match(workflow,/ROBLOX_RELEASE_PUBLICATION_TARGET_CONFLICT/);
  assert.match(workflow,/ROBLOX_UNIVERSE_ID: \$\{\{ steps\.target\.outputs\.universe_id \}\}/);
  assert.match(workflow,/ROBLOX_PLACE_ID: \$\{\{ steps\.target\.outputs\.place_id \}\}/);
  assert.doesNotMatch(workflow,/vars\.ROBLOX_UNIVERSE_ID/);
  assert.doesNotMatch(workflow,/vars\.ROBLOX_PLACE_ID/);
  assert.match(workflow,/item\.robloxPublicationTarget=\{/);
  assert.match(workflow,/verified:true/);
  assert.match(workflow,/authority:'roblox-canonical-publication-target'/);
  assert.match(workflow,/canonical Roblox publication target changed before persist/);
  assert.match(workflow,/ROBLOX_PUBLICATION_TARGET_PERSISTED/);
  assert.match(workflow,/ROBLOX_V3_STATE=READY/);
  assert.match(workflow,/publishRobloxPlace\(\{plan,retryDelaysMs:\[\]\}\)/);
  assert.match(workflow,/ROBLOX_V3_STATE=PUBLISHED/);
  assert.match(workflow,/actions: write/);
  assert.match(workflow,/timeout-minutes: 300/);
  assert.match(workflow,/retry_seconds=60/);
  assert.match(workflow,/retry_window_seconds=900/);
  assert.match(workflow,/Roblox publish failed HTTP 409/);
  assert.match(workflow,/gh workflow run '\.github\/workflows\/company-development-roblox-release-promotion\.yml'/);
  assert.match(workflow,/deferred=true/);
  assert.match(workflow,/steps\.publish\.outputs\.deferred != 'true'/);
  assert.match(workflow,/ROBLOX_RELEASE_PROMOTION=MANUAL_RETRY_REQUIRED:ROBLOX_409_SERVER_BUSY/);
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
