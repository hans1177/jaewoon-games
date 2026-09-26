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

test('F9 reuses exact two-client sync proof for internal release but external public readiness stays hard-gated',()=>{
  const finalReview=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  assert.match(finalReview,/Roblox F9 Final Review/);
  assert.match(finalReview,/item\.robloxRuntimeFoundationPassed===true/);
  assert.match(finalReview,/const sharedReleaseRuntimeAcceptance=/);
  assert.match(finalReview,/runtime\.f7MultiplayerFoundationPassed===true/);
  assert.match(finalReview,/const internalRuntimeAcceptance=sharedReleaseRuntimeAcceptance/);
  assert.match(finalReview,/const publicRuntimeAcceptance=false;/);
  assert.doesNotMatch(finalReview,/const simplifiedInternalMultiplayer=/);
  assert.match(finalReview,/item\.robloxIndependentQaPassed===true/);
  assert.match(finalReview,/item\.robloxRegressionPassed===true/);
  assert.match(finalReview,/String\(runtime\.universeId\|\|''\)===String\(candidate\.universeId\|\|''\)/);
  assert.match(finalReview,/String\(runtime\.placeId\|\|''\)===String\(candidate\.placeId\|\|''\)/);
  assert.match(finalReview,/runtime\.exactPlace===true/);
  assert.match(finalReview,/runtime\.exactVersion===true/);
  assert.match(finalReview,/Number\(runtime\.candidateVersionNumber\)===Number\(candidate\.versionNumber\)/);
  assert.match(finalReview,/post\.actualRuntimeEvidence===true/);
  assert.match(finalReview,/item\.robloxInternalReleaseReady=true/);
  assert.match(finalReview,/multiplayerVerificationMode:'TWO_CLIENT_ONE_SYNC'/);
  assert.match(finalReview,/publicReleaseMultiplayerVerificationPending:internalRuntimeObservationDeferred\|\|internalRuntimeFindingDeferred/);
  assert.match(finalReview,/item\.robloxPublicReleaseReady=false/);
  assert.match(finalReview,/INTERNAL_BUILDUP_PENDING_EXTERNAL_PUBLIC_HARD_GATE/);
  assert.match(finalReview,/externalPublicHardGatePending:true/);
  assert.match(finalReview,/roblox-perpetual-buildup-public-hard-gate-pending/);
  assert.match(finalReview,/promotedWithoutRepublish:true/);
  assert.match(finalReview,/publicRelease:false/);
  assert.doesNotMatch(finalReview,/item\.robloxPublicReleaseReady=publicRuntimeAcceptance===true/);
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
    /item\.robloxInternalVibePlayEvidence=null/,
    /item\.robloxGameCompletionEvidence=null/,
    /item\.robloxPlatformAdaptationEvidence=null/,
    /item\.robloxSecurityReleaseEvidence=null/,
    /item\.robloxPresentationCompletionEvidence=null/,
    /item\.robloxReleaseStabilityEvidence=null/,
    /item\.robloxPublicReleaseFinalEvidence=null/,
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


test('private runtime candidate uses the same shallow checkout contract while preserving ancestry proof',()=>{
  assert.match(workflow,/Checkout current canonical implementation[\s\S]*fetch-depth:\s*1[\s\S]*fetch-tags:\s*false[\s\S]*filter:\s*blob:none/);
  assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
  assert.match(workflow,/git fetch --no-tags --depth=1 origin "\$SOURCE_REVISION"/);
  assert.match(workflow,/gh api "repos\/\$GITHUB_REPOSITORY\/compare\/\$SOURCE_REVISION\.\.\.\$\(git rev-parse HEAD\)"/);
  assert.match(workflow,/git diff --quiet "\$SOURCE_REVISION" HEAD -- "\$SOURCE_ROOT"/);
});


test('public release rejects static-only multiplayer evidence and requires the same actual two-client sync proof',()=>{
  const item=canonicalItem();
  item.robloxMultiplayerQaPassed=false;
  item.robloxMultiplayerQaEvidence={...item.robloxMultiplayerQaEvidence,multiplayerQaPassed:false,peerVisibilityPassed:false};
  item.robloxInternalMultiplayerSimplifiedPassed=true;
  item.robloxInternalReleaseReady=true;
  item.robloxInternalReleaseEvidence={multiplayerVerificationMode:'TWO_CLIENT_ONE_SYNC',twoClientOneSyncPassed:false,publicRelease:false};
  const evidence=assembleRobloxDevelopmentReleaseEvidence(item);
  assert.equal(evidence.pass,false);
  assert.ok(evidence.blockedReasons.includes('multiplayer-qa-not-passed'));
});

test('private runtime candidate deployment serializes only duplicate work for the same game',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(workflow,/group: company-development-roblox-release-promotion-\$\{\{ inputs\.game_id \|\| github\.run_id \}\}/);
  assert.doesNotMatch(workflow,/group: company-development-roblox-release-promotion\s*$/m);
});


test('private runtime candidate mode comes from central policy plus exact F0 evidence',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.equal(roadmap.roblox.validationMode,'HEADLESS_FAST_MVP');
  assert.equal(roadmap.directNativeDualPlatformDevelopment.robloxValidationOverride.mode,'HEADLESS_FAST_MVP');
  assert.equal(roadmap.roblox.headlessValidation.fakeRuntimePassForbidden,true);
  assert.ok(roadmap.roblox.headlessValidation.requiredStages.includes('OPEN_CLOUD_PRIVATE_OR_RESTRICTED_PUBLISH'));
  assert.match(candidate,/canonicalRobloxValidationMode=String\(roadmap\?\.roblox\?\.validationMode\|\|''\)/);
  assert.match(candidate,/f0EvidenceMode=String\(item\.robloxFoundationF0Evidence\?\.validationMode\|\|item\.robloxHeadlessFastMvpEvidence\?\.validationMode\|\|''\)/);
  assert.match(candidate,/canonicalRobloxValidationMode==='HEADLESS_FAST_MVP'&&f0EvidenceMode==='HEADLESS_SOURCE_PREFLIGHT_F0'/);
  assert.doesNotMatch(candidate,/const headlessMode=item\.robloxValidationMode==='HEADLESS_FAST_MVP'/);
  assert.match(candidate,/ROBLOX_RELEASE_CANONICAL_VALIDATION_MODE=/);
  assert.match(candidate,/ROBLOX_RELEASE_F0_EVIDENCE_MODE=/);
});

test('every rebuilt Roblox candidate invalidates prior Vibe play and external-public evidence before revalidation',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  for(const pattern of [
    /item\.robloxInternalVibePlayEvidence=null/,
    /item\.robloxGameCompletionEvidence=null/,
    /item\.robloxPlatformAdaptationEvidence=null/,
    /item\.robloxSecurityReleaseEvidence=null/,
    /item\.robloxPresentationCompletionEvidence=null/,
    /item\.robloxReleaseStabilityEvidence=null/,
    /item\.robloxPublicReleaseFinalEvidence=null/,
    /item\.currentStep='TARGET_PLATFORM_RUNTIME_FOUNDATION'/
  ]) assert.match(candidate,pattern);
});


test('shared FAST_MVP target selects the newest current runtime candidate and preserves completed evidence on rotation',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/robloxRuntimeCandidateEvidence\?\.published===true/);
  assert.match(candidate,/robloxSharedTargetCurrent===false/);
  assert.match(candidate,/\.sort\(\(a,b\)=>Number\(b\.robloxRuntimeCandidateEvidence\?\.versionNumber/);
  assert.match(candidate,/ROBLOX_RELEASE_SHARED_FALLBACK_CAPACITY_BUSY/);
  assert.match(candidate,/sharedRotation=headlessCanonical===true/);
  const start=candidate.indexOf('if(sharedRotation){');
  const end=candidate.indexOf('item.robloxSharedTargetCurrent=true;',start);
  assert.ok(start>0&&end>start);
  const rotation=candidate.slice(start,end);
  assert.match(rotation,/other\.robloxSharedTargetCurrent=false/);
  assert.match(rotation,/other\.robloxFastMvpSupersededBy=item\.gameId/);
  assert.doesNotMatch(rotation,/other\.robloxRuntimePassed=false/);
  assert.doesNotMatch(rotation,/other\.robloxRuntimeFoundationEvidence=null/);
  assert.doesNotMatch(rotation,/other\.currentStep='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'/);
});


test('shared runtime target rotation waits for exact Vibe play on the occupied candidate',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/const occupiedPlay=occupied\?\.robloxInternalVibePlayEvidence\|\|\{\}/);
  assert.match(candidate,/occupiedPlay\.pass===true/);
  assert.match(candidate,/occupiedPlay\.actualPlay===true/);
  assert.match(candidate,/occupiedPlay\.sourceRevision/);
  assert.match(candidate,/occupiedPlay\.artifactIdentity/);
  assert.match(candidate,/occupiedPlay\.universeId/);
  assert.match(candidate,/occupiedPlay\.placeId/);
  assert.match(candidate,/occupiedPlay\.versionNumber/);
  assert.match(candidate,/if\(occupied&&!occupiedVibePlayComplete\)/);
});


test('canonical Roblox rebuild flow provisions and reuses a dedicated private target before runtime candidate publish',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/name: Ensure game-specific private Roblox target/);
  assert.match(candidate,/createRobloxDedicatedExperience/);
  assert.match(candidate,/configureRobloxExperience/);
  assert.match(candidate,/ensureRobloxExperiencePrivate/);
  assert.match(candidate,/source:'canonical-dedicated-open-cloud-bootstrap'/);
  assert.match(candidate,/bootstrapState:'CREATED_PRIVATE_UNPUBLISHED'/);
  assert.match(candidate,/persistedTarget\.dedicated===true/);
  assert.match(candidate,/bootstrapState\|\|''\)\.toUpperCase\(\)==='CREATED_PRIVATE_UNPUBLISHED'/);
  assert.match(candidate,/dedicated:dedicatedTarget/);
  assert.match(candidate,/shared:dedicatedTarget\?false/);
});

test('an old shared candidate cannot suppress redeploy to a newly reserved dedicated target',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/const publicationTarget=item\.robloxPublicationTarget\|\|\{\}/);
  assert.match(candidate,/String\(item\.robloxRuntimeCandidateEvidence\?\.universeId\|\|''\)===String\(publicationTarget\.universeId\|\|''\)/);
  assert.match(candidate,/String\(item\.robloxRuntimeCandidateEvidence\?\.placeId\|\|''\)===String\(publicationTarget\.placeId\|\|''\)/);
});

test('internal Roblox modification loop keeps the canonical modify check rebuild redeploy revalidate order',()=>{
  const drift=fs.readFileSync('tools/company-roblox-source-drift-sync.mjs','utf8');
  const runtime=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  const qa=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(drift,/validateExistingRobloxSourceTree/);
  assert.match(drift,/robloxBuildOrPackagePassed:false/);
  assert.match(drift,/robloxRuntimePassed:false/);
  assert.match(drift,/robloxInternalReleaseReady:false/);
  assert.match(drift,/ROBLOX_BUILD_PACKAGE_REVALIDATION_PENDING/);
  assert.match(runtime,/company-development-roblox-headless-fast-mvp\.yml/);
  assert.match(candidate,/Publish exact F0-passed package as private runtime candidate/);
  assert.match(qa,/validateRobloxRuntimeFoundationEvidence/);
  assert.match(candidate,/item\.robloxInternalVibePlayEvidence=null/);
});


test('push-triggered candidate deployment selects any canonical pending Roblox candidate without legacy releaseStrategy',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/String\(row\.productionClass\|\|''\)\.toUpperCase\(\)==='DEVELOPMENT_CONFIRMED'/);
  assert.match(candidate,/row\.robloxFoundationF0Passed===true/);
  assert.match(candidate,/row\.robloxBuildPreflightPassed===true/);
  assert.match(candidate,/row\.robloxBuildOrPackagePassed===true/);
  assert.doesNotMatch(candidate,/row\.releaseStrategy==='FAST_MVP'/);
  assert.match(candidate,/skip_reason','no-pending-runtime-candidate'|no-pending-runtime-candidate/);
});

test('dedicated target bootstrap may use existing Roblox security credential only for Experience setup while package publish remains Open Cloud',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/ROBLOX_ROBLOSECURITY: \$\{\{ secrets\.ROBLOX_ROBLOSECURITY \}\}/);
  assert.match(candidate,/ROBLOX_SECURITY_COOKIE: \$\{\{ secrets\.ROBLOX_SECURITY_COOKIE \}\}/);
  assert.match(candidate,/const cookie=String\(process\.env\.ROBLOX_ROBLOSECURITY\|\|process\.env\.ROBLOX_SECURITY_COOKIE\|\|''\)/);
  assert.match(candidate,/createRobloxDedicatedExperience\([\s\S]*cookie/);
  assert.match(candidate,/publishRobloxPlace\(\{plan,retryDelaysMs:\[\]\}\)/);
});


test('existing release workflow applies canonical marketing art through Open Cloud thumbnail scope',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const c=roadmap.robloxMarketingThumbnailSyncContract;
  assert.equal(c.canonicalSource.catalogField,'game-catalog.json#games[].marketingImage');
  assert.equal(c.robloxUpload.provider,'ROBLOX_OPEN_CLOUD');
  assert.equal(c.robloxUpload.requiredScope,'universe.thumbnail:write');
  assert.equal(c.robloxUpload.cookieFallbackForbidden,true);
  assert.deepEqual(c.currentInternalReleaseTargets,['cozy-island','daechung-rpg','horror-escape-room','village-dungeons']);

  const start=workflow.indexOf('\n  thumbnail-sync:');
  assert.ok(start>=0,'thumbnail-sync job missing');
  const block=workflow.slice(start);
  assert.match(block,/github\.event_name == 'push'/);
  assert.match(block,/tools\/company-roblox-thumbnail-sync\.mjs/);
  assert.match(block,/ROBLOX_OPEN_CLOUD_API_KEY: \$\{\{ secrets\.ROBLOX_OPEN_CLOUD_API_KEY \}\}/);
  assert.match(block,/librsvg2-bin/);
  assert.match(block,/fonts-noto-cjk/);
  assert.doesNotMatch(block,/ROBLOX_ROBLOSECURITY|ROBLOX_SECURITY_COOKIE/);
  assert.match(workflow,/assets\/roblox-thumbnails\/\*\*/);
  assert.match(workflow,/game-catalog\.json/);
});
