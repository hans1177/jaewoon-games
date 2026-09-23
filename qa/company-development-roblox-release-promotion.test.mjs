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

test('headless source preflight can never satisfy Roblox final release evidence',()=>{
  const item=canonicalItem();
  item.robloxValidationMode='HEADLESS_FAST_MVP';
  item.robloxFoundationF0Passed=true;
  item.robloxFoundationF0Evidence={
    sourcePreflightPassed:true,f0SourceIntegrityPassed:true,actualRuntimeEvidence:false,runtimeFoundationPassed:false,
    sourceRevision:item.robloxSourceCommit,artifactIdentity:item.robloxBuildArtifactIdentity,artifactRunId:12345
  };
  const evidence=assembleRobloxDevelopmentReleaseEvidence(item);
  assert.equal(evidence.pass,false);
  assert.equal(evidence.runtimePassed,false);
  assert.ok(evidence.blockedReasons.includes('headless-source-preflight-cannot-satisfy-runtime-release'));
});

test('candidate deployment workflow stops at private runtime candidate and never claims internal release',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/Private Runtime Candidate Deployment/);
  assert.match(candidate,/robloxFoundationF0Passed===true/);
  assert.match(candidate,/createRobloxRuntimeCandidatePublishPlan/);
  assert.match(candidate,/ROBLOX_F0_FALSE_RUNTIME_CLAIM/);
  assert.match(candidate,/item\.robloxRuntimeCandidateEvidence=\{/);
  assert.match(candidate,/releaseClaim:false/);
  assert.match(candidate,/item\.robloxInternalReleaseReady=false/);
  assert.match(candidate,/item\.robloxRuntimePassed=false/);
  assert.match(candidate,/item\.robloxRuntimeFoundationPassed=false/);
  assert.match(candidate,/item\.robloxInternalReleaseEvidence=null/);
  assert.match(candidate,/item\.robloxReleaseEvidence=null/);
  assert.match(candidate,/item\.robloxFinalReviewPassed=false/);
  assert.match(candidate,/item\.robloxPostRuntimeQaEvidence=null/);
  assert.match(candidate,/item\.robloxRuntimeFoundationEvidence=null/);
  assert.match(candidate,/item\.robloxIndependentQaPassed=false/);
  assert.match(candidate,/item\.robloxRegressionPassed=false/);
  assert.match(candidate,/item\.currentStep='TARGET_PLATFORM_RUNTIME_FOUNDATION'/);
  assert.match(candidate,/item\.robloxFailureSignature='ROBLOX_RUNTIME_FOUNDATION_PENDING'/);
  assert.doesNotMatch(candidate,/const legacyCanonical=/);
  assert.doesNotMatch(candidate,/assemble-development-release-evidence/);
  assert.doesNotMatch(candidate,/item\.robloxInternalReleaseReady=true/);
});

test('existing post-runtime QA requires actual F1-F8 sentinel evidence on the exact candidate',()=>{
  const runtime=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(runtime,/Roblox Runtime Foundation QA/);
  assert.match(runtime,/fetchRobloxRuntimeFoundationEvidence/);
  assert.match(runtime,/validateRobloxRuntimeFoundationEvidence/);
  assert.match(runtime,/candidate\.sourceRevision===sourceRevision/);
  assert.match(runtime,/candidate\.artifactIdentity===artifactIdentity/);
  assert.match(runtime,/runtimeAcceptancePassed===true/);
  assert.match(runtime,/GROUND_CONTACT_FAILURE/);
  assert.match(runtime,/ROBLOX_RUNTIME_ACCEPTANCE_PENDING/);
  assert.match(runtime,/item\.currentStep='ROBLOX_FINAL_REVIEW_REVALIDATION'/);
  assert.match(runtime,/actualRuntimeEvidence:true/);
  assert.doesNotMatch(runtime,/Studio QA \(Disabled\)/);
});

test('F9 final review promotes the same tested candidate without republishing it',()=>{
  const finalReview=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  assert.match(finalReview,/Roblox F9 Final Review/);
  assert.match(finalReview,/item\.robloxRuntimeFoundationPassed===true/);
  assert.match(finalReview,/item\.robloxRuntimePassed===true/);
  assert.match(finalReview,/item\.robloxIndependentQaPassed===true/);
  assert.match(finalReview,/item\.robloxRegressionPassed===true/);
  assert.match(finalReview,/String\(runtime\.universeId\|\|''\)===String\(candidate\.universeId\|\|''\)/);
  assert.match(finalReview,/String\(runtime\.placeId\|\|''\)===String\(candidate\.placeId\|\|''\)/);
  assert.match(finalReview,/runtime\.exactPlace===true/);
  assert.match(finalReview,/runtime\.exactVersion===true/);
  assert.match(finalReview,/Number\(runtime\.candidateVersionNumber\)===Number\(candidate\.versionNumber\)/);
  assert.match(finalReview,/post\.actualRuntimeEvidence===true/);
  assert.match(finalReview,/currentBlockingTickets/);
  assert.match(finalReview,/item\.robloxF9ReleaseRegressionPassed=true/);
  assert.match(finalReview,/item\.robloxInternalReleaseReady=true/);
  assert.match(finalReview,/promotedWithoutRepublish:true/);
  assert.match(finalReview,/item\.currentStep='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'/);
  assert.match(finalReview,/publicRelease:false/);
  assert.doesNotMatch(finalReview,/publishRobloxPlace/);
  assert.doesNotMatch(finalReview,/versions\?versionType=Published/);
});



test('cozy island foundation ordering and successful core-loop proof stay fail-closed',()=>{
  const server=fs.readFileSync('roblox-games/cozy-island/server/Game.server.luau','utf8');
  const buildIndex=server.indexOf('\nbuildWorld()\n');
  const bindIndex=server.indexOf('Players.PlayerAdded:Connect(bindPlayer)');
  assert.ok(buildIndex>=0,'cozy island must build world before binding players');
  assert.ok(bindIndex>buildIndex,'safe spawn and world foundation must exist before player binding');
  assert.match(server,/local accepted=H\[a\]\(p\)/);
  assert.match(server,/if accepted==true then\s+foundationCheckpoint\("CORE_LOOP_READY"/);
  assert.match(server,/if battling\[p\]then msg\(p,"전투 중"\)return false end/);
  assert.match(server,/if troops<=0 then msg\(p,"병사가 필요해"\)return false end/);
  assert.match(server,/task\.spawn\(function\(\)[\s\S]*?end\)\s+return true\s+end/);
});

test('new Roblox runtime candidate atomically invalidates stale release and QA pass state',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  for(const pattern of [
    /item\.robloxInternalReleaseEvidence=null/,
    /item\.robloxReleaseEvidence=null/,
    /item\.robloxFinalReviewPassed=false/,
    /item\.robloxF9ReleaseRegressionPassed=false/,
    /item\.robloxPostRuntimeQaEvidence=null/,
    /item\.robloxRuntimeEvidence=null/,
    /item\.robloxRuntimeFoundationEvidence=null/,
    /item\.robloxIndependentQaPassed=false/,
    /item\.robloxRegressionPassed=false/,
    /item\.robloxMultiplayerQaPassed=false/,
    /item\.robloxRuntimePassed=false/,
    /item\.robloxRuntimeFoundationPassed=false/,
  ]) assert.match(candidate,pattern);
});

test('F9 binds the promoted candidate to source artifact universe place and exact version runtime evidence',()=>{
  const finalReview=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  assert.match(finalReview,/candidate\.sourceRevision===sourceRevision/);
  assert.match(finalReview,/candidate\.artifactIdentity===artifactIdentity/);
  assert.match(finalReview,/String\(runtime\.universeId\|\|''\)===String\(candidate\.universeId\|\|''\)/);
  assert.match(finalReview,/String\(runtime\.placeId\|\|''\)===String\(candidate\.placeId\|\|''\)/);
  assert.match(finalReview,/runtime\.exactGame===true/);
  assert.match(finalReview,/runtime\.exactPlace===true/);
  assert.match(finalReview,/runtime\.exactVersion===true/);
  assert.match(finalReview,/Number\(runtime\.candidateVersionNumber\)===Number\(candidate\.versionNumber\)/);
  assert.match(finalReview,/post\.actualRuntimeEvidence===true/);
});



test('Roblox runtime candidate deployment proves canonical ancestry without full-history checkout',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.doesNotMatch(workflow,/Checkout current canonical implementation[\s\S]*?fetch-depth:\s*0/);
  assert.match(workflow,/Checkout current canonical implementation[\s\S]*?fetch-depth:\s*1/);
  assert.match(workflow,/git fetch --no-tags --depth=1 origin "\$SOURCE_REVISION"/);
  assert.match(workflow,/gh api "repos\/\$GITHUB_REPOSITORY\/compare\/\$\{SOURCE_REVISION\}\.\.\.\$\{head_sha\}"/);
  assert.match(workflow,/\[ "\$merge_base" = "\$SOURCE_REVISION" \]/);
  assert.match(workflow,/git diff --quiet "\$SOURCE_REVISION" HEAD -- "\$SOURCE_ROOT"/);
  assert.doesNotMatch(workflow,/git merge-base --is-ancestor "\$SOURCE_REVISION" HEAD/);
});

test('Roblox metadata scope failure cannot invalidate a successfully published runtime candidate',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(workflow,/name: Apply and verify Roblox title description and server size[\s\S]*?id: metadata[\s\S]*?continue-on-error: true/);
  assert.match(workflow,/METADATA_OUTCOME: \$\{\{ steps\.metadata\.outcome \}\}/);
  assert.match(workflow,/ROBLOX_METADATA_SYNC=REPAIR_REQUIRED_NON_BLOCKING/);
  assert.match(workflow,/ROBLOX_METADATA_REQUIRED_OPEN_CLOUD_SCOPE=universe\.place:write/);
  assert.match(workflow,/ROBLOX_RUNTIME_CANDIDATE_INVALIDATED_BY_METADATA_FAILURE=NO/);
});

test('central foundation contract records the implemented atomic repair invariants',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const stack=roadmap.developmentLifecycleMachine.nativeGameFoundationValidationStack;
  assert.equal(stack.governingPrinciples.safeSpawnMustExistBeforePlayerBinding,true);
  assert.equal(stack.governingPrinciples.coreLoopRuntimeCheckpointRequiresSuccessfulGameStateTransition,true);
  assert.equal(stack.governingPrinciples.newRuntimeCandidateInvalidatesPriorReleasePassState,true);
  assert.equal(stack.governingPrinciples.f9ExactCandidateMustBindSourceArtifactUniversePlaceAndVersion,true);
  assert.equal(stack.verification.designAndImplementationEvidence.cozyIslandSpawnBeforePlayerBinding,true);
  assert.equal(stack.verification.designAndImplementationEvidence.coreLoopCheckpointRequiresSuccessfulTransition,true);
  assert.equal(stack.verification.designAndImplementationEvidence.newCandidateClearsPriorReleasePassState,true);
  assert.equal(stack.verification.designAndImplementationEvidence.f9BindsUniversePlaceVersion,true);
});

test('central F0 contract pins official Luau compiler and exact source workflow requires compile evidence',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const f0=roadmap.developmentLifecycleMachine.nativeGameFoundationValidationStack.f0NativeCompiler;
  assert.equal(f0.required,true);
  assert.equal(f0.implementation,'OFFICIAL_LUAU_COMPILER');
  assert.equal(f0.version,'0.739');
  assert.equal(f0.sha256,'8a9b4b381021722c82d6e6cda0964b5c9e7f354ec1035fcd8b657acc22e49247');
  assert.equal(f0.allLuauFilesUnderGameSourceMustCompile,true);
  assert.equal(f0.structuralMarkersCannotSubstituteCompile,true);
  assert.equal(f0.missingCompilerEvidenceAction,'F0_BLOCKED');

  const preflight=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  assert.match(preflight,/luau-lang\/luau\/releases\/download\/0\.739\/luau-ubuntu\.zip/);
  assert.match(preflight,/8a9b4b381021722c82d6e6cda0964b5c9e7f354ec1035fcd8b657acc22e49247/);
  assert.match(preflight,/git archive "\$SOURCE_REVISION" "\$SOURCE_PATH"/);
  assert.match(preflight,/luau-compile "\$file"/);
  assert.match(preflight,/--native-language-compile-passed=true/);
  assert.match(preflight,/--native-compiler-version=0\.739/);
});

test('central native foundation policy locks spawn ordering candidate invalidation and exact F9 identity',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const foundation=roadmap.developmentLifecycleMachine.nativeGameFoundationValidationStack;
  assert.equal(foundation.governingPrinciples.safeSpawnMustExistBeforePlayerBinding,true);
  assert.equal(foundation.governingPrinciples.coreLoopRuntimeCheckpointRequiresSuccessfulGameStateTransition,true);
  assert.equal(foundation.governingPrinciples.newRuntimeCandidateInvalidatesPriorReleasePassState,true);
  assert.equal(foundation.governingPrinciples.f9ExactCandidateMustBindSourceArtifactUniversePlaceAndVersion,true);
  assert.equal(foundation.robloxContract.spawnOrdering.safeSpawnLocationRequiredBeforePlayerBinding,true);
  assert.equal(foundation.robloxContract.coreLoopProof.failedOrRejectedActionMayNotEmitCoreLoopReady,true);
  assert.equal(foundation.releaseGate.newCandidateInvalidation.clearPriorFinalReviewPass,true);
  assert.deepEqual(foundation.releaseGate.f9ExactBinding,[
    'SOURCE_REVISION','ARTIFACT_IDENTITY','UNIVERSE_ID','PLACE_ID',
    'CANDIDATE_VERSION_NUMBER','ACTUAL_RUNTIME_SENTINEL','POST_RUNTIME_QA'
  ]);
});
