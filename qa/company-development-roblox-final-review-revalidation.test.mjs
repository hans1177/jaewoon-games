import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
const evaluator=fs.readFileSync('tools/company-development-roblox-final-review.mjs','utf8');

test('F9 is deterministic evidence fan-in and never starts another Roblox runtime session',()=>{
  assert.match(workflow,/name: Company DEVELOPMENT_CONFIRMED Roblox F9 Final Review/);
  assert.match(workflow,/Run F9 deterministic regression contract/);
  assert.match(workflow,/const internalStudioValidationAccepted=/);
  assert.match(workflow,/f9RuntimeReplay:false/);
  assert.doesNotMatch(workflow,/RobloxStudioBeta\.exe/);
  assert.doesNotMatch(workflow,/start_stop_play/);
  assert.doesNotMatch(workflow,/company-development-roblox-multiplayer-qa\.yml/);
});

test('F9 reuses the same exact internal Studio and F7 evidence without external-server promotion blockers',()=>{
  assert.match(workflow,/post\.internalStudioValidationOnly===true/);
  assert.match(workflow,/post\.externalServerBootRequired===false/);
  assert.match(workflow,/post\.officialStudioMcpActualPlayPassed===true/);
  assert.match(workflow,/post\.multiplayerValidationPassed===true/);
  assert.match(workflow,/const internalRuntimeAcceptance=sharedReleaseRuntimeAcceptance\|\|internalRuntimeObservationDeferred\|\|internalRuntimeFindingDeferred\|\|internalStudioValidationAccepted/);
  assert.match(workflow,/const publicRuntimeAcceptance=internalRuntimeAcceptance/);
  assert.match(workflow,/publicReleaseMultiplayerVerificationPending:false/);
  assert.match(workflow,/duplicatePublicMultiplayerCheckRequired:false/);
  assert.match(workflow,/externalPublicServerRequired:false/);
  assert.match(workflow,/item\.robloxPublicReleaseRuntimeObservationPending=false/);
  assert.doesNotMatch(workflow,/roblox-public-release-awaiting-real-server-boot/);
});

test('F9 still stops at internal technical release and cannot self-approve external publication',()=>{
  assert.match(workflow,/item\.robloxPublicReleaseReady=false/);
  assert.match(workflow,/publicRelease:false/);
  assert.match(workflow,/roblox-owner-public-release-approval-required/);
  assert.match(workflow,/roblox-perpetual-buildup-public-hard-gate-pending/);
  assert.doesNotMatch(workflow,/item\.robloxPublicRelease=true/);
});

test('legacy evaluator accepts exact Studio runtime and exact F0 multiplayer contract instead of requiring duplicate two-client QA',()=>{
  assert.match(evaluator,/function exactInternalStudioValidation/);
  assert.match(evaluator,/function exactInternalMultiplayerValidation/);
  assert.match(evaluator,/f0\.multiplayerSyncContractPassed===true/);
  assert.match(evaluator,/f0\.serverClientBoundaryPreflightPassed===true/);
  assert.match(evaluator,/const runtimeGate=item\.robloxRuntimePassed === true \|\| studioAccepted/);
  assert.match(evaluator,/const multiplayerGate = modeDefined && \(mode === 'SINGLE' \|\| internalMultiplayerAccepted \|\| item\.robloxMultiplayerQaPassed === true\)/);
  assert.match(evaluator,/ROBLOX_F7_INTERNAL_MULTIPLAYER_CONTRACT_REQUIRED/);
  assert.doesNotMatch(evaluator,/multiplayerApplicable && item\.robloxMultiplayerQaPassed !== true/);
});

test('F9 remains fail-closed for exact identity, tester failures, save and design applicability',()=>{
  assert.match(workflow,/candidate\.sourceRevision===sourceRevision/);
  assert.match(workflow,/candidate\.artifactIdentity===artifactIdentity/);
  assert.match(workflow,/noCurrentCriticalOrHighTesterFailure:true/);
  assert.match(workflow,/ROBLOX_F9_EXACT_EVIDENCE_MISMATCH/);
  assert.match(workflow,/ROBLOX_F9_OPEN_TESTER_FAILURE/);
  assert.match(evaluator,/ROBLOX_DATASTORE_REJOIN_REQUIRED/);
  assert.match(evaluator,/ROBLOX_MULTIPLAYER_DESIGN_DECISION_MISSING/);
});

test('F9 runtime persistence retries from latest company-runtime with field-scoped optimistic patches',()=>{
  assert.match(workflow,/ROBLOX_F9_RUNTIME_PATCH_COUNT=/);
  assert.match(workflow,/roblox-f9-runtime-patch\.json/);
  assert.match(workflow,/ROBLOX_F9_PERSIST_OPTIMISTIC_ATTEMPT=/);
  assert.match(workflow,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(workflow,/ROBLOX_F9_PERSIST_CONFLICT_RETRY=/);
  assert.match(workflow,/ROBLOX_F9_PERSIST_SAME_FIELD_CONFLICT=/);
  assert.match(workflow,/ROBLOX_F9_PERSIST_REVALIDATION_REQUIRED=/);
  assert.doesNotMatch(workflow,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
});
