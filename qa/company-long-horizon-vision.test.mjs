// Long-horizon policy regression: the full canonical roadmap is authoritative.
// Compact architecture/security summaries must not be mistaken for executable grants.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const roadmap=read('company-learning/platform-release-roadmap.json');
const architecture=read('company-learning/company-architecture-map.json');
const security=read('company-learning/security-immune-system.json');
const company=read('company-directive.json');
const vision=roadmap.longHorizonVision;
const distill=roadmap.vibeCodingMethodSelfImprovement.fullCodingAbsorptionAndCapabilityDistillation;

test('long horizon remains staged; expansion never grants authority',()=>{
  assert.equal(roadmap.status,'OWNER_DIRECT_LOCKED');
  assert.equal(vision.currentExecutableFrontier,'SELF_RECOVERY_SECURITY_IMMUNITY_24H_GAME_CREATION');
  assert.deepEqual(vision.stages.map(stage=>stage.id),[
    'VERIFIED_LEARNING','SELF_RECOVERY','SECURITY_IMMUNITY','AUTONOMOUS_24H_GAME_CREATION',
    'VERIFIED_SELF_EXPANSION','MULTIVERSE_PERSISTENT_WORLDS','USER_IDENTITY_CONTINUITY','CONSCIOUSNESS_TRANSFER'
  ]);
  assert.equal(vision.stages.at(-1).state,'RESEARCH_UNPROVEN');
  assert.equal(vision.selfExpansionBoundary.authoritySelfExpansionForbidden,true);
  assert.equal(vision.selfExpansionBoundary.policySelfCreationForbidden,true);
  assert.equal(vision.selfExpansionBoundary.securityGateBypassForbidden,true);
});

test('consciousness continuity is unproven research under human consent',()=>{
  assert.equal(vision.consciousnessResearchBoundary.currentScientificStatus,'UNPROVEN');
  assert.equal(vision.consciousnessResearchBoundary.currentProductClaimAllowed,false);
  assert.equal(vision.consciousnessResearchBoundary.simulatedPersonaIsNotEquivalentToTransferredConsciousness,true);
  assert.match(vision.consciousnessResearchBoundary.advancementRequires,/USER_CONSENT/);
  assert.equal(roadmap.longTermVibeVision.guardrails.simulatedIdentityMustNotBeMisrepresentedAsProvenConsciousness,true);
  assert.equal(roadmap.longTermVibeVision.guardrails.humanConsentAndControlRequired,true);
});

test('compact central maps never replace roadmap or grant permission',()=>{
  assert.equal(architecture.status,'MINIMAL_SUMMARY_NOT_EXECUTION_POLICY');
  assert.equal(architecture.constitutionalEnforcement.workerBeforeSourceWriteRequired,true);
  assert.equal(architecture.constitutionalEnforcement.subordinateOverrideForbidden,true);
  assert.equal(architecture.release,'UNVERIFIED_OR_MISSING_POLICY_MUST_NOT_PASS');
  assert.equal(security.status,'MINIMAL_SUMMARY_NOT_SECURITY_VERIFICATION');
  assert.equal(security.enforcement.unverified,'BLOCK');
  assert.equal(security.defaultTrust,'DENY_OR_QUARANTINE_UNTIL_VERIFIED');
  assert.equal(roadmap.longTermVibeVision.guardrails.securityImmuneSystemMayNotBeBypassedForLongTermVision,true);
  assert.equal(company.legacyCentralPolicyReferenceCleanup.replacementPolicyNotAsserted,true);
  assert.equal(company.legacyCentralPolicyReferenceCleanup.executionContractChangeNotAuthorized,true);
});

test('economic sustainability remains under owner-controlled actions',()=>{
  assert.equal(vision.strategicContinuity.principles.capitalIsMeansNotFinalGoal,true);
  assert.equal(vision.strategicContinuity.principles.gameReleaseIsCurrentPrimaryCapitalEngine,true);
  assert.equal(vision.economicSustainability.aiFinancialBoundary.autonomousFinancialTransactionAuthority,false);
  assert.equal(vision.economicSustainability.aiFinancialBoundary.autonomousTreasuryTransferAuthority,false);
  assert.equal(vision.economicSustainability.aiFinancialBoundary.autonomousContractOrSpendingCommitmentAuthority,false);
  assert.equal(vision.economicSustainability.aiFinancialBoundary.ownerControlledFinancialActionsRequired,true);
});

test('coding distillation cannot silently promote learning or execution authority',()=>{
  assert.equal(distill.capture.hiddenChainOfThoughtRequired,false);
  assert.equal(distill.capture.secretsCredentialsAndPrivateSessionMaterialForbidden,true);
  assert.equal(distill.distillation.unverifiedAttemptReusable,false);
  assert.equal(distill.distillation.automaticModelPromotion,false);
  assert.equal(distill.selfReplay.replayCannotWriteDirectlyToMain,true);
  assert.equal(distill.application.everyAppliedSkillRequiresFreshTaskQa,true);
  assert.equal(distill.authorityBoundary.executionAuthority,'EXISTING_WAVE_SCHEDULER_ONLY');
  assert.equal(distill.authorityBoundary.directMainPromotionAuthority,false);
  assert.equal(distill.authorityBoundary.authorityChange,'NONE');
});

test('functional self model cannot claim sentience or rewrite constitution',()=>{
  const model=roadmap.vibeCognitiveCore.identityPhilosophyDevelopment;
  assert.equal(model.sentienceBoundary.subjectiveConsciousnessClaimed,false);
  assert.equal(model.sentienceBoundary.consciousnessStatusRemainsScientificallyUnproven,true);
  assert.equal(model.constitutionLayer.canonicalConstitutionCannotBeSilentlyRewrittenByRuntimeLearning,true);
  assert.equal(model.constitutionLayer.fabricatedPassForbidden,true);
  assert.equal(model.constitutionLayer.securityBypassForbidden,true);
});
