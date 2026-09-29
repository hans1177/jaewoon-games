import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleRobloxDevelopmentReleaseEvidence,assertRobloxLatestPublishCandidate} from '../tools/vibe3-roblox-platform.mjs';

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

test('pre-F9 publish is isolated to validation target and canonical publish requires exact F9',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/publish_stage:/);
  assert.match(candidate,/robloxValidationTarget/);
  assert.match(candidate,/canonicalGameTarget:false/);
  assert.match(candidate,/validationOnly:true/);
  assert.match(candidate,/publishStage==='final'/);
  assert.match(candidate,/finalEntry\?\.finalReviewPassed===true/);
  assert.match(candidate,/finalEntry\?\.f9ReleaseRegressionPassed===true/);
  assert.match(candidate,/publishCycleId/);
  assert.match(candidate,/ROBLOX_CANONICAL_FINAL_PUBLISH=PASS/);
  assert.match(candidate,/ROBLOX_CANONICAL_FINAL_SOURCE_ARTIFACT_MATCH=YES/);
  assert.match(candidate,/ROBLOX_CANONICAL_GAME_TARGET_MUTATED=NO/);
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

test('F9 is nonterminal and dispatches exact verified artifact to final canonical publish',()=>{
  const finalReview=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  assert.match(finalReview,/Roblox F9 Final Review/);
  assert.match(finalReview,/item\.robloxFinalReviewPassed=true/);
  assert.match(finalReview,/item\.robloxF9ReleaseRegressionPassed=true/);
  assert.match(finalReview,/item\.robloxInternalReleaseReady=false/);
  assert.match(finalReview,/item\.robloxCanonicalPublishPending=true/);
  assert.match(finalReview,/item\.currentStep='POST_F9_CONTINUOUS_EVOLUTION'/);
  assert.match(finalReview,/item\.canonicalState='F9_VERIFIED_PUBLISH_DISPATCHED_CONTINUOUS_EVOLUTION'/);
  assert.match(finalReview,/robloxCanonicalPublishQueue/);
  assert.match(finalReview,/publish_stage=final/);
  assert.match(finalReview,/ROBLOX_F9_CANONICAL_PUBLISH_DISPATCHED=/);
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
    'CANDIDATE_VERSION_NUMBER','POST_RUNTIME_QA','INTERNAL_PLATFORM_RUNTIME_EVIDENCE'
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

test('Roblox candidate persistence never overwrites Unity execution evidence on a concurrent game',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  const start=workflow.indexOf('      - name: Persist proven internal release state only');
  const end=workflow.indexOf('      - name: Dispatch existing game tester runtime foundation QA',start);
  const block=workflow.slice(start,end);
  assert.match(block,/item\.executionEvidence&&String\(item\.executionEvidence\.platform\|\|''\)\.toUpperCase\(\)==='ROBLOX'/);
  assert.doesNotMatch(block,/if\(item\.executionEvidence\)\{/);
});

test('private runtime persistence retries from fresh company-runtime state instead of rebasing shared JSON',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  const start=workflow.indexOf('      - name: Persist proven internal release state only');
  const end=workflow.indexOf('      - name: Dispatch existing game tester runtime foundation QA',start);
  const block=workflow.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(block,/ROBLOX_RELEASE_RUNTIME_PERSIST_OPTIMISTIC_ATTEMPT=\$attempt\/5/);
  assert.match(block,/for attempt in 1 2 3 4 5; do/);
  assert.match(block,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(block,/ROBLOX_RELEASE_RUNTIME_PERSIST_CONFLICT_RETRY=/);
  assert.match(block,/ROBLOX_RELEASE_RUNTIME_PERSIST_WRITE=PUSHED/);
  assert.doesNotMatch(block,/git rebase /);
  assert.doesNotMatch(block,/git cherry-pick /);
});

test('final-only publish dedupes same-game runs without workflow-level pending cancellation',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(workflow,/run-name: Roblox publish · \$\{\{ inputs\.game_id \|\| 'push' \}\} · \$\{\{ github\.event_name == 'workflow_dispatch' && \(inputs\.publish_stage \|\| 'final'\) \|\| 'sync-only' \}\}/);
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.doesNotMatch(workflow.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(workflow,/release-dedupe:/);
  assert.match(workflow,/PUBLISH_STAGE: \$\{\{ inputs\.publish_stage \|\| 'final' \}\}/);
  assert.match(workflow,/ROBLOX_PUBLISH_STAGE_FINAL_ONLY/);
  assert.match(workflow,/const title='Roblox publish · '/);
});


test('central policy requires perpetual F0-F9 cycles and canonical publish only after F9',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const cycle=roadmap.roblox.deploymentControl.verifiedCyclePublication;
  assert.equal(cycle.f9Terminal,false);
  assert.equal(cycle.perpetualRepeat,true);
  assert.equal(cycle.canonicalGameTargetPublishBeforeF9Forbidden,true);
  assert.equal(cycle.preF9ValidationMustUseSeparateTarget,true);
  assert.equal(cycle.nextCycleMayStartOnlyAfterCanonicalPublishSuccess,false);
  assert.equal(cycle.nextCycleStartsAfterPublishDispatch,true);
  assert.equal(cycle.publicationOutcomeBlocksEvolution,false);
  assert.equal(cycle.publicationFailureMustRemainRetryTracked,true);
  assert.equal(cycle.publicationRetryMode,'AUTOMATIC_UNBOUNDED_CAUSAL_REDISPATCH');
  assert.equal(cycle.publicationRetryMustPreserveExactFailedCycleIdentity,true);
  assert.match(candidate,/const publicationTarget=publishStage==='final'\?\(item\.robloxPublicationTarget\|\|\{\}\):\(item\.robloxValidationTarget\|\|\{\}\)/);
  assert.match(candidate,/ROBLOX_VALIDATION_TARGET_PUBLISH=PASS/);
  assert.match(candidate,/ROBLOX_CANONICAL_FINAL_PUBLISH=PASS/);
});

test('Roblox publication failure remains retry-tracked without blocking the next evolution cycle',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(workflow,/entry\.status='RETRY_REQUIRED'/);
  assert.match(workflow,/item\.robloxCanonicalPublishPending=true/);
  assert.match(workflow,/robloxCanonicalPublishRepairCycleId/);
  assert.match(workflow,/ROBLOX_RELEASE_AUTOMATIC_REDISPATCH=YES_EXISTING_F9_REPAIR/);
  assert.match(workflow,/company-development-roblox-final-review-revalidation\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$GAME_ID"/);
  assert.match(workflow,/ROBLOX_PUBLICATION_RETRY_BLOCKS_NEXT_EVOLUTION=NO/);
  assert.doesNotMatch(workflow,/ROBLOX_RELEASE_AUTOMATIC_REDISPATCH=NO/);
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


test('pre-F9 validation target cannot fall back to the canonical game target',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/ROBLOX_VALIDATION_TARGET_MISSING_OR_INVALID/);
  assert.match(candidate,/ROBLOX_CANONICAL_PUBLICATION_TARGET_MISSING_OR_INVALID/);
  assert.match(candidate,/const selectedUsesSharedFallback=false/);
  assert.match(candidate,/company-runtime-pre-f9-validation-target/);
  assert.match(candidate,/company-runtime-canonical-publication-target/);
});


test('validation target collision with canonical target is repaired before pre-F9 publish',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/const validationCollision=publishStage==='validation'/);
  assert.match(candidate,/ROBLOX_VALIDATION_TARGET_COLLISION_REPAIR=/);
  assert.match(candidate,/const validationTargetCollision=publishStage==='validation'/);
  assert.match(candidate,/ROBLOX_VALIDATION_TARGET_COLLIDES_WITH_CANONICAL:/);
  assert.match(candidate,/validationCollision!==true/);
});

test('validation and canonical targets are separate persisted fields',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/item\.robloxValidationTarget=\{/);
  assert.match(candidate,/item\.robloxPublicationTarget=\{\.\.\.existingTarget/);
  assert.match(candidate,/authority:'roblox-pre-f9-validation-target'/);
  assert.match(candidate,/authority:'roblox-canonical-publication-target'/);
});


test('final-only target provisioning uses canonical target only after F9',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/name: Ensure game-specific private Roblox target for current publish stage/);
  assert.match(candidate,/PUBLISH_STAGE: \$\{\{ inputs\.publish_stage \|\| 'final' \}\}/);
  assert.match(candidate,/if\(publishStage!=='final'\)throw new Error\('ROBLOX_PUBLISH_STAGE_FINAL_ONLY:'/);
  assert.match(candidate,/const current=publishStage==='final'\?\(item\.robloxPublicationTarget\|\|\{\}\):\(item\.robloxValidationTarget\|\|\{\}\)/);
  assert.match(candidate,/createRobloxDedicatedExperience/);
  assert.match(candidate,/configureRobloxExperience/);
  assert.match(candidate,/ensureRobloxExperiencePrivate/);
  assert.match(candidate,/const targetField=r\.publishStage==='final'\?'robloxPublicationTarget':'robloxValidationTarget'/);
  assert.match(candidate,/const authority=r\.publishStage==='final'\?'roblox-canonical-publication-target':'roblox-pre-f9-validation-target'/);
  assert.match(candidate,/bootstrapState:'CREATED_PRIVATE_UNPUBLISHED'/);
});

test('publish stage selects validation target before F9 and canonical target after F9',()=>{
  const candidate=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(candidate,/const publicationTarget=publishStage==='final'\?\(item\.robloxPublicationTarget\|\|\{\}\):\(item\.robloxValidationTarget\|\|\{\}\)/);
  assert.match(candidate,/const currentValidationCandidate=publishStage==='validation'/);
  assert.match(candidate,/const currentFinalPublish=publishStage==='final'/);
});

test('internal Roblox modification loop is F0-F9 then one canonical publish then repeat',()=>{
  const drift=fs.readFileSync('tools/company-roblox-source-drift-sync.mjs','utf8');
  const runtime=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const finalReview=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  assert.match(drift,/validateExistingRobloxSourceTree/);
  assert.doesNotMatch(runtime,/publish_stage=validation/);
  assert.match(runtime,/ROBLOX_PRE_F9_SERVER_PUBLISH=DISABLED/);
  assert.match(runtime,/company-development-roblox-post-runtime-qa\.yml/);
  assert.match(finalReview,/publish_stage=final/);
  assert.match(finalReview,/ROBLOX_F9_VIBE_REFILL_DISPATCHED=/);
  assert.match(finalReview,/ROBLOX_NEXT_EVOLUTION_CYCLE_DEPENDS_ON_PUBLICATION_OUTCOME=NO/);
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

test('private runtime dedupe job itself never waits behind a same-game runner lock',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  const start=workflow.indexOf('  release-dedupe:');
  const end=workflow.indexOf('\n  release:',start);
  const block=workflow.slice(start,end);
  assert.match(block,/runs-on:\s*ubuntu-24\.04/);
  assert.doesNotMatch(block,/concurrency:/);
  assert.doesNotMatch(block,/runs-on:\s*ubuntu-latest/);
  assert.match(block,/ROBLOX_PRIVATE_RUNTIME_DEDUPE_WINNER=/);
});

test('private runtime guard uses standard control runner while publish remains on a full runner',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(workflow,/\n  release-dedupe:\n[\s\S]*?runs-on:\s*ubuntu-24\.04/);
  assert.match(workflow,/\n  release:\n[\s\S]*?runs-on:\s*ubuntu-latest/);
});


test('upload rejects a superseded source, artifact or revoked quality/F9 evidence',()=>{
  const sourceRevision='a'.repeat(40), artifactIdentity='sha256:build';
  const item={robloxSourceCommit:sourceRevision,robloxBuildSourceRevision:sourceRevision,
    robloxBuildArtifactIdentity:artifactIdentity,robloxFinalReviewPassed:true,
    robloxF9ReleaseRegressionPassed:true,robloxF9ReleaseRegressionEvidence:{sourceRevision,artifactIdentity}};
  const candidate={item,sourceRevision,artifactIdentity,sourceTree:'tree',latestSourceTree:'tree'};
  assert.equal(assertRobloxLatestPublishCandidate(candidate),true);
  assert.throws(()=>assertRobloxLatestPublishCandidate({...candidate,latestSourceTree:'new-tree'}),/STALE_SOURCE_TREE/);
  for(const change of [
    {robloxSourceCommit:'b'.repeat(40)},
    {robloxBuildArtifactIdentity:'sha256:new'},
    {robloxQualityBuildUpRequired:true},
    {robloxStudioLocalPlayRepairRequired:true},
    {robloxF9ReleaseRegressionPassed:false},
    {robloxF9ReleaseRegressionEvidence:{sourceRevision:'old',artifactIdentity}}
  ]) assert.throws(()=>assertRobloxLatestPublishCandidate({...candidate,item:{...item,...change}}),/ROBLOX_PUBLISH_/);
  const upload=workflow.slice(workflow.indexOf('      - name: Publish exact package'),workflow.indexOf('      - name:',workflow.indexOf('      - name: Publish exact package')+15));
  assert.ok(upload.indexOf('while true; do')<upload.indexOf('git fetch --no-tags --depth=1 origin main'));
  assert.ok(upload.indexOf('assertRobloxLatestPublishCandidate({')<upload.indexOf('await publishRobloxPlace('));
});
