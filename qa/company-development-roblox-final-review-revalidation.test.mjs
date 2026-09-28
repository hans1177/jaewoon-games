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

test('legacy design normalization remains grounded while multiplayer review consumes exact scoped F7 evidence', () => {
  assert.match(evaluator, /repairPersistedDesignForPromotion/);
  assert.match(evaluator, /FINAL_REVIEW_LEGACY_NORMALIZATION/);
  assert.match(evaluator, /ROBLOX_FINAL_REVIEW_LEGACY_DESIGN_REPAIR=/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_DESIGN_DECISION_MISSING/);
  assert.match(evaluator, /const scopedF7Accepted =/);
  assert.match(evaluator, /post\.multiplayerValidationPassed === true/);
  assert.match(evaluator, /const extendedMultiplayerRequired =/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_EXTENDED_QA_REQUIRED/);
});

test('multiplayer and release implementation changes automatically re-enter final-review revalidation', () => {
  assert.match(workflow, /'\.github\/workflows\/company-development-roblox-multiplayer-qa\.yml'/);
  assert.match(workflow, /'\.github\/workflows\/company-development-roblox-release-promotion\.yml'/);
  assert.match(workflow, /'tools\/company-development-roblox-multiplayer-qa\.luau'/);
  assert.match(workflow, /'tools\/vibe3-roblox-platform\.mjs'/);
  assert.match(workflow, /'qa\/company-development-roblox-multiplayer-qa\.test\.mjs'/);
  assert.match(workflow, /'qa\/company-development-roblox-release-promotion\.test\.mjs'/);
});

test('canonical evaluator is fail-closed only when scoped F7 evidence is missing or extended multiplayer validation is required', () => {
  assert.match(evaluator, /new Set\(\['SINGLE', 'COOP', 'COMPETITIVE', 'HYBRID'\]\)/);
  assert.match(evaluator, /const exactPost =/);
  assert.match(evaluator, /const scopedF7Accepted =/);
  assert.match(evaluator, /const internalStudioValidationAccepted =/);
  assert.match(evaluator, /mode === 'SINGLE'[\s\S]*scopedF7Accepted[\s\S]*item\.robloxMultiplayerQaPassed === true/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_DESIGN_DECISION_MISSING/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_EXTENDED_QA_REQUIRED/);
  assert.match(evaluator, /ROBLOX_F7_EXACT_EVIDENCE_REQUIRED/);
  assert.match(evaluator, /if \(extendedMultiplayerRequired\) multiplayerPendingIds\.push\(item\.gameId\)/);
  assert.match(evaluator, /ROBLOX_DATASTORE_REJOIN_REQUIRED/);
  assert.match(evaluator, /item\.robloxReleaseClaim = false/);
  assert.match(evaluator, /item\.robloxExactRevisionPassed === true/);
});


test('exact Roblox F9 review is isolated per game after multiplayer acceptance',()=>{
  assert.match(workflow,/group: company-development-roblox-f9-final-review-\$\{\{ inputs\.game_id/);
  assert.match(workflow,/scheduled-scan/);
  assert.match(workflow,/manual-scan/);
  assert.doesNotMatch(workflow,/group: company-development-roblox-f9-final-review\s*\n/);
});

test('F9 accepts exact Studio plus scoped F7 evidence without external-server or duplicate multiplayer replay',()=>{
  assert.match(workflow,/const f7Accepted=/);
  assert.match(workflow,/post\.multiplayerApplicabilityKnown===true/);
  assert.match(workflow,/post\.multiplayerValidationPassed===true/);
  assert.match(workflow,/const internalStudioValidationAccepted=/);
  assert.match(workflow,/post\.internalStudioValidationOnly===true/);
  assert.match(workflow,/post\.externalServerBootRequired===false/);
  assert.match(workflow,/const internalRuntimeAcceptance=sharedReleaseRuntimeAcceptance\|\|internalRuntimeObservationDeferred\|\|internalRuntimeFindingDeferred\|\|internalStudioValidationAccepted/);
  assert.match(workflow,/f9RuntimeReplay:false/);
  assert.match(workflow,/f9MultiplayerReplay:false/);
  assert.match(workflow,/f9SecurityFullRescan:false/);
  assert.match(workflow,/twoClientOneSyncPassed:item\.robloxMultiplayerQaPassed===true&&post\.twoParticipantRuntimeObserved===true/);
  assert.doesNotMatch(workflow,/roblox-public-release-awaiting-real-server-boot/);
  assert.match(workflow,/item\.robloxPublicReleaseReady=false/);
});

test('F9 accepts truth-preserving exact runtime failure continuation for internal release only',()=>{
  assert.match(workflow,/const internalRuntimeFindingDeferred=/);
  assert.match(workflow,/item\.robloxRuntimeFailureExternalReleaseOnly===true/);
  assert.match(workflow,/item\.robloxInternalQaContinuationAllowed===true/);
  assert.match(workflow,/item\.robloxInternalRegressionContinuationAllowed===true/);
  assert.match(workflow,/post\.runtimeFailureExternalReleaseOnly===true/);
  assert.match(workflow,/const internalRuntimeAcceptance=sharedReleaseRuntimeAcceptance\|\|internalRuntimeObservationDeferred\|\|internalRuntimeFindingDeferred/);
  assert.match(workflow,/item\.robloxRuntimeFoundationPassed===true\|\|internalRuntimeObservationDeferred\|\|internalRuntimeFindingDeferred/);
  assert.match(workflow,/internalRuntimeFindingDeferred/);
  assert.match(workflow,/runtimeFailureExternalReleaseOnly:internalRuntimeFindingDeferred/);
  assert.match(workflow,/ticket\.internalFlowBlocking===false/);
  assert.match(workflow,/ticket\.externalReleaseBlockingOnly===true/);
  assert.match(workflow,/roblox-internal-release-after-f9-runtime-finding-external-only/);
  assert.match(workflow,/item\.robloxPublicReleaseReady=false/);
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

test('F9 promotion stops at internal release and cannot self-approve external public readiness',()=>{
  assert.match(workflow,/const publicRuntimeAcceptance=false; \/\/ Internal F9 cannot satisfy the external public hard gate\./);
  assert.match(workflow,/item\.robloxPublicReleaseReady=false;/);
  assert.match(workflow,/INTERNAL_BUILDUP_PENDING_EXTERNAL_PUBLIC_HARD_GATE/);
  assert.match(workflow,/externalPublicHardGatePending:true/);
  assert.match(workflow,/roblox-perpetual-buildup-public-hard-gate-pending/);
  assert.doesNotMatch(workflow,/item\.robloxPublicReleaseReady=publicRuntimeAcceptance===true/);
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
