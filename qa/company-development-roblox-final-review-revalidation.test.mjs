// 파일명: qa/company-development-roblox-final-review-revalidation.test.mjs
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml', 'utf8');
const evaluator = fs.readFileSync('tools/company-development-roblox-final-review.mjs', 'utf8');

test('F9 workflow uses canonical same-identity dedupe and exact-candidate review', () => {
  assert.match(workflow, /name: Company DEVELOPMENT_CONFIRMED Roblox F9 Final Review/);
  assert.match(workflow, /run-name: Roblox F9 · \$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.match(workflow, /name: collapse duplicate F9 reviews/);
  assert.match(workflow, /name: Select newest same-identity F9 run/);
  assert.match(workflow, /name: deterministic F9 review and exact-candidate internal release promotion/);
  assert.match(workflow, /ref: company-runtime/);
  assert.match(workflow, /evaluateRobloxF9ProductReadiness/);
  assert.match(workflow, /ROBLOX_F9_CONTRACT_QA=REUSED_CURRENT_MAIN_CI/);
  assert.doesNotMatch(workflow, /RobloxStudioBeta\.exe/);
  assert.doesNotMatch(workflow, /company-development-roblox-runtime-smoke\.luau/);
  assert.doesNotMatch(workflow, /company-development-roblox-mobile-independent-qa\.luau/);
});

test('legacy design normalization remains grounded and fail-closed in the canonical evaluator', () => {
  assert.match(evaluator, /repairPersistedDesignForPromotion/);
  assert.match(evaluator, /FINAL_REVIEW_LEGACY_NORMALIZATION/);
  assert.match(evaluator, /ROBLOX_FINAL_REVIEW_LEGACY_DESIGN_REPAIR=/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_DESIGN_DECISION_MISSING/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_QA_REQUIRED/);
  assert.match(evaluator, /ROBLOX_DATASTORE_REJOIN_REQUIRED/);
  assert.doesNotMatch(workflow, /git add development-queue\.json design/);
});

test('F9 implementation changes re-enter review through current workflow inputs and regression paths', () => {
  assert.match(workflow, /'\.github\/workflows\/company-development-roblox-final-review-revalidation\.yml'/);
  assert.match(workflow, /'\.github\/workflows\/company-development-roblox-release-promotion\.yml'/);
  assert.match(workflow, /'qa\/company-development-roblox-final-review-revalidation\.test\.mjs'/);
  assert.match(workflow, /'qa\/company-development-roblox-runtime-foundation\.test\.mjs'/);
  assert.match(workflow, /'qa\/company-development-roblox-release-promotion\.test\.mjs'/);
});

test('canonical evaluator preserves fail-closed multiplayer and internal-release gates', () => {
  assert.match(evaluator, /new Set\(\['SINGLE', 'COOP', 'COMPETITIVE', 'HYBRID'\]\)/);
  assert.match(evaluator, /item\.robloxMultiplayerQaPassed === true/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_DESIGN_DECISION_MISSING/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_QA_REQUIRED/);
  assert.match(evaluator, /ROBLOX_DATASTORE_REJOIN_REQUIRED/);
  assert.match(evaluator, /ROBLOX_INTERNAL_RELEASE_PENDING/);
  assert.match(evaluator, /releasePendingIds\.push\(item\.gameId\)/);
  assert.match(evaluator, /release_pending_ids_json/);
  assert.match(evaluator, /item\.robloxReleaseClaim = false/);
  assert.match(evaluator, /hasCurrentInternalRelease\(item\)/);
  assert.match(evaluator, /evidence\?\.sourceRevision[\s\S]*item\.robloxSourceCommit/);
  assert.match(evaluator, /evidence\?\.artifactIdentity[\s\S]*item\.robloxBuildArtifactIdentity/);
  assert.match(evaluator, /item\.robloxExactRevisionPassed === true/);
});

test('exact Roblox F9 review is deduped per game identity and current control SHA',()=>{
  assert.match(workflow,/group: roblox-f9-dedupe-\$\{\{ inputs\.game_id \|\| 'scan' \}\}-\$\{\{ github\.sha \}\}/);
  assert.match(workflow,/cancel-in-progress: false/);
  assert.match(workflow,/if \[ -n "\$GAME_ID" \]; then[\s\S]*?ROBLOX_F9_DEDUPE_PASS=\$GAME_ID:\$GITHUB_RUN_ID[\s\S]*?exit 0/);
  assert.match(workflow,/const title='Roblox F9 · '\+\(game\|\|'scan'\)/);
  assert.match(workflow,/CURRENT_CONTROL_SHA/);
  assert.match(workflow,/String\(r\.head_sha\|\|''\)===controlSha/);
  assert.match(workflow,/ROBLOX_F9_EXACT_DEDUPED=/);
  assert.match(workflow,/ROBLOX_F9_SCAN_DEDUPED_NEWER=/);
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
  assert.match(workflow,/ROBLOX_F9_VIBE_REFILL_REQUIRES_SETTLED_WAITER=NO/);
  assert.match(workflow,/ROBLOX_F9_VIBE_REFILL_GAME_DISPATCHED=\$game_id/);
  assert.match(workflow,/execution_lane:"game-primary"/);
  assert.doesNotMatch(workflow,/if \[ "\$settled_count" -gt 0 \]; then/);
  assert.match(workflow,/vibe2-fanin-refill/);
});


test('F9 requires gameplay product readiness and routes failures back to Vibe build-up',()=>{
  assert.match(workflow,/evaluateRobloxF9ProductReadiness/);
  assert.match(workflow,/ROBLOX_F9_GAMEPLAY_PRODUCT_READINESS=/);
  assert.match(workflow,/productReadiness\.pass===true[\s\S]*item\.robloxFoundationF0Passed===true/);
  assert.match(workflow,/const internalFlowNonBlocking=!productBlocked&&\(/);
  assert.match(workflow,/item\.robloxQualityBuildUpRequired=true/);
  assert.match(workflow,/item\.robloxQualityBuildUpSourceRevision=sourceRevision/);
  assert.match(workflow,/roblox-f9-gameplay-product-readiness-failure/);
  assert.match(workflow,/GAMEPLAY_PRODUCT_READINESS/);
  assert.match(workflow,/item\.robloxQualityBuildUpRequired=false/);
  assert.match(workflow,/gameplayProductReadiness:productReadiness/);
});
