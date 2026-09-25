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

test('F9 allows internal release when exact engine and official Studio MCP pass while real-server observation remains public-only',()=>{
  assert.match(workflow,/const internalRuntimeObservationDeferred=/);
  assert.match(workflow,/item\.robloxRuntimeFoundationInternalReleaseException===true/);
  assert.match(workflow,/item\.robloxPublicReleaseRuntimeObservationPending===true/);
  assert.match(workflow,/runtime\.authority==='exact-engine-version-awaiting-real-server-boot'/);
  assert.match(workflow,/const internalRuntimeAcceptance=sharedReleaseRuntimeAcceptance\|\|internalRuntimeObservationDeferred/);
  assert.match(workflow,/item\.robloxRuntimeFoundationPassed===true\|\|internalRuntimeObservationDeferred/);
  assert.match(workflow,/actualRuntimeFoundationPassed:item\.robloxRuntimeFoundationPassed===true/);
  assert.match(workflow,/publicReleaseRuntimeObservationPending:internalRuntimeObservationDeferred/);
  assert.match(workflow,/roblox-public-release-awaiting-real-server-boot/);
  assert.match(workflow,/item\.robloxPublicReleaseReady=false/);
});

test('F9 promotion stops at internal release and cannot self-approve external public readiness',()=>{
  assert.match(workflow,/const publicRuntimeAcceptance=false; \/\/ Internal F9 cannot satisfy the external public hard gate\./);
  assert.match(workflow,/item\.robloxPublicReleaseReady=false;/);
  assert.match(workflow,/INTERNAL_BUILDUP_PENDING_EXTERNAL_PUBLIC_HARD_GATE/);
  assert.match(workflow,/externalPublicHardGatePending:true/);
  assert.match(workflow,/roblox-perpetual-buildup-public-hard-gate-pending/);
  assert.doesNotMatch(workflow,/item\.robloxPublicReleaseReady=publicRuntimeAcceptance===true/);
});
