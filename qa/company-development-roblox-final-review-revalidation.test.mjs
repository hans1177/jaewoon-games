// 파일명: qa/company-development-roblox-final-review-revalidation.test.mjs
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml', 'utf8');
const evaluator = fs.readFileSync('tools/company-development-roblox-final-review.mjs', 'utf8');

test('final-review revalidation reuses prior Studio QA and dispatches only canonical downstream gates', () => {
  assert.match(workflow, /name: Company DEVELOPMENT_CONFIRMED Roblox Final Review Revalidation/);
  assert.match(workflow, /workflows: \["Company DEVELOPMENT_CONFIRMED Roblox Multiplayer QA"\]/);
  assert.match(workflow, /repository_dispatch:[\s\S]*types: \[roblox_multiplayer_qa_persisted\]/);
  assert.match(workflow, /ref: company-runtime/);
  assert.match(workflow, /node \.\.\/main\/tools\/company-development-roblox-final-review\.mjs/);
  assert.match(workflow, /gh workflow run company-development-roblox-multiplayer-qa\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$id"/);
  assert.match(workflow, /gh workflow run company-development-roblox-release-promotion\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$id"/);
  assert.match(workflow, /steps\.evaluate\.outputs\.release_pending_count != '0'/);
  assert.match(workflow, /company-learning\/platform-release-roadmap\.json/);
  assert.match(workflow, /automaticPublishPaused/);
  assert.match(workflow, /automaticReleaseDispatchAllowed/);
  assert.match(workflow, /ROBLOX_AUTOMATIC_PUBLISH_PAUSED=YES/);
  assert.match(workflow, /ROBLOX_AUTOMATIC_RELEASE_DISPATCH_ALLOWED=NO/);
  assert.match(workflow, /ROBLOX_RELEASE_PROMOTION_DISPATCHED=NO/);
  assert.match(workflow, /'company-learning\/platform-release-roadmap\.json'/);
  assert.match(workflow, /ROBLOX_RUNTIME_RERUN=NO/);
  assert.match(workflow, /ROBLOX_MOBILE_INDEPENDENT_QA_RERUN=NO/);
  assert.match(workflow, /ROBLOX_REGRESSION_RERUN=NO/);
  assert.match(workflow, /ROBLOX_RELEASE_STATE_FORCING=NO/);
  assert.doesNotMatch(workflow, /RobloxStudioBeta\.exe/);
  assert.doesNotMatch(workflow, /company-development-roblox-runtime-smoke\.luau/);
  assert.doesNotMatch(workflow, /company-development-roblox-mobile-independent-qa\.luau/);
});

test('legacy design normalization is grounded, persisted, and re-enters final review without weakening QA', () => {
  assert.match(evaluator, /repairPersistedDesignForPromotion/);
  assert.match(evaluator, /FINAL_REVIEW_LEGACY_NORMALIZATION/);
  assert.match(evaluator, /ROBLOX_FINAL_REVIEW_LEGACY_DESIGN_REPAIR=/);
  assert.match(workflow, /tools\/company-design-prepromotion-repair\.mjs/);
  assert.match(workflow, /qa\/design-prepromotion-repair\.test\.mjs/);
  assert.match(workflow, /git add development-queue\.json design/);
  assert.match(workflow, /ROBLOX_LEGACY_DESIGN_REPAIR_GROUNDED_ONLY=YES/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_DESIGN_DECISION_MISSING/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_QA_REQUIRED/);
});

test('multiplayer and release implementation changes automatically re-enter final-review revalidation', () => {
  assert.match(workflow, /'\.github\/workflows\/company-development-roblox-multiplayer-qa\.yml'/);
  assert.match(workflow, /'\.github\/workflows\/company-development-roblox-release-promotion\.yml'/);
  assert.match(workflow, /'tools\/company-development-roblox-multiplayer-qa\.luau'/);
  assert.match(workflow, /'tools\/vibe3-roblox-platform\.mjs'/);
  assert.match(workflow, /'qa\/company-development-roblox-multiplayer-qa\.test\.mjs'/);
  assert.match(workflow, /'qa\/company-development-roblox-release-promotion\.test\.mjs'/);
});

test('canonical evaluator preserves fail-closed multiplayer and release gates', () => {
  assert.match(evaluator, /new Set\(\['SINGLE', 'COOP', 'COMPETITIVE', 'HYBRID'\]\)/);
  assert.match(evaluator, /item\.robloxMultiplayerQaPassed === true/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_DESIGN_DECISION_MISSING/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_QA_REQUIRED/);
  assert.match(evaluator, /ROBLOX_DATASTORE_REJOIN_REQUIRED/);
  assert.match(evaluator, /ROBLOX_RELEASE_PROMOTION_PENDING/);
  assert.match(evaluator, /releasePendingIds\.push\(item\.gameId\)/);
  assert.match(evaluator, /release_pending_ids_json/);
  assert.match(evaluator, /item\.robloxReleaseClaim = false/);
  assert.match(evaluator, /hasCurrentPublishedRelease\(item\)/);
  assert.match(evaluator, /evidence\?\.sourceRevision[\s\S]*item\.robloxSourceCommit/);
  assert.match(evaluator, /evidence\?\.artifactIdentity[\s\S]*item\.robloxBuildArtifactIdentity/);
  assert.match(evaluator, /item\.robloxExactRevisionPassed === true/);
});


test('exact Roblox F9 review is isolated per game after multiplayer acceptance',()=>{
  assert.match(workflow,/group: company-development-roblox-f9-final-review-\$\{\{ inputs\.game_id/);
  assert.match(workflow,/scheduled-scan/);
  assert.match(workflow,/manual-scan/);
  assert.doesNotMatch(workflow,/group: company-development-roblox-f9-final-review\s*\n/);
});

test('F9 records exact verified evidence and queues publication only for released games',()=>{
  assert.match(workflow,/item\.robloxFinalReviewPassed=true/);
  assert.match(workflow,/item\.robloxF9ReleaseRegressionPassed=true/);
  assert.match(workflow,/evaluateInternalRelease/);
  assert.match(workflow,/releaseReadiness\.ready===true/);
  assert.match(workflow,/item\.robloxF9VerifiedPrepublishEvidence=\{/);
  assert.match(workflow,/canonicalPublishRequired:serverPublishEligible/);
  assert.match(workflow,/canonicalPublishCompleted:false/);
  assert.match(workflow,/item\.robloxInternalReleaseReady=serverPublishEligible/);
  assert.match(workflow,/item\.robloxCanonicalPublishPending=serverPublishEligible/);
  assert.match(workflow,/item\.currentStep='POST_F9_CONTINUOUS_EVOLUTION'/);
  assert.match(workflow,/ROBLOX_F9_VERIFIED_CANONICAL_PUBLISH_PENDING/);
});

test('F9 keeps exact runtime continuation evidence but cannot publish canonical target before F9 pass',()=>{
  assert.match(workflow,/const internalRuntimeFindingDeferred=/);
  assert.match(workflow,/item\.robloxRuntimeFailureExternalReleaseOnly===true/);
  assert.match(workflow,/post\.runtimeFailureExternalReleaseOnly===true/);
  assert.match(workflow,/const internalRuntimeAcceptance=sharedReleaseRuntimeAcceptance\|\|internalRuntimeObservationDeferred\|\|internalRuntimeFindingDeferred/);
  assert.match(workflow,/item\.robloxF9VerifiedPrepublishEvidence=\{/);
  assert.match(workflow,/item\.robloxCanonicalPublishPending=serverPublishEligible/);
});

test('F9 runs in parallel and cannot pause internal playtest under an external-only runtime blocker',()=>{
  assert.match(workflow,/const parallelF9Pending=item\.robloxF9PendingInParallel===true/);
  assert.match(workflow,/if\(!legacyF9Pending&&!parallelF9Pending\)continue/);
  assert.match(workflow,/const internalFlowNonBlocking=/);
  assert.match(workflow,/item\.robloxF9PendingInParallel=internalFlowNonBlocking/);
  assert.match(workflow,/item\.currentStep='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'/);
  assert.match(workflow,/item\.robloxF9FailureSignature=f9FailureSignature/);
  assert.match(workflow,/item\.robloxF9PendingInParallel=false/);
  assert.match(workflow,/PUBLIC_RELEASE_RUNTIME_FINDING/);
  assert.match(workflow,/PUBLIC_RELEASE_RUNTIME_OBSERVATION/);
});

test('F9 is nonterminal, publishes only released games, and continues development otherwise',()=>{
  assert.match(workflow,/item\.robloxInternalReleaseReady=serverPublishEligible/);
  assert.match(workflow,/item\.robloxCanonicalPublishPending=serverPublishEligible/);
  assert.match(workflow,/ROBLOX_F9_SERVER_PUBLICATION=/);
  assert.match(workflow,/SKIPPED_DEVELOPMENT/);
  assert.match(workflow,/Dispatch exact F9-verified artifact to canonical Roblox game target/);
  assert.match(workflow,/publish_stage=final/);
  assert.match(workflow,/ROBLOX_F9_NEXT_CYCLE_DISPATCHED=/);
  assert.doesNotMatch(workflow,/promotedWithoutRepublish:true/);
});


test('F9 runtime persistence retries from latest company-runtime with a field-scoped optimistic patch',()=>{
  assert.match(workflow,/ROBLOX_F9_RUNTIME_PATCH_COUNT=/);
  assert.match(workflow,/roblox-f9-runtime-patch\.json/);
  assert.match(workflow,/ROBLOX_F9_PERSIST_OPTIMISTIC_ATTEMPT=/);
  assert.match(workflow,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(workflow,/ROBLOX_F9_PERSIST_CONFLICT_RETRY=/);
  assert.match(workflow,/ROBLOX_F9_PERSIST_SAME_FIELD_CONFLICT=/);
  assert.match(workflow,/ROBLOX_F9_PERSIST_REVALIDATION_REQUIRED=/);
  assert.match(workflow,/EXACT_CANDIDATE_IDENTITY/);
  assert.match(workflow,/currentPresent===change\.beforePresent/);
  assert.match(workflow,/currentPresent===change\.afterPresent/);
  assert.doesNotMatch(workflow,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.doesNotMatch(workflow,/group:.*company-runtime-writer/);
});

test('F9 fan-in repeats development without requiring publication',()=>{
  const fanin=workflow.slice(workflow.indexOf('proof_tsv=/tmp/roblox-f9-vibe-fanin.tsv'));
  assert.match(fanin,/item\.robloxFinalReviewPassed!==true\|\|item\.robloxF9ReleaseRegressionPassed!==true/);
  assert.doesNotMatch(fanin,/item\.robloxInternalReleaseReady!==true/);
  assert.match(fanin,/prepublish\.validationVersionNumber/);
  assert.match(workflow,/const exactInternalF9Proof=/);
  assert.match(workflow,/prepublish\.f9RuntimeReplay===false/);
  assert.match(workflow,/ROBLOX_F9_VIBE_REFILL_DISPATCHED=/);
  assert.match(workflow,/vibe2-fanin-refill/);
});
