// 파일명: qa/company-long-horizon-vision.test.mjs
// 역할: 축약된 구형 맵이 아닌 최신 canonical 로드맵과 보안 계약으로 권한 경계를 검증한다.

// 임포트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 중앙정책
const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const security=JSON.parse(fs.readFileSync('company-learning/security-immune-system.json','utf8'));
const vision=roadmap.longHorizonVision;
const guard=roadmap.longTermVibeVision.guardrails;

// 메인: 장기 비전 및 권한 불변식
test('long horizon stages remain staged and authority expansion is forbidden',()=>{
  assert.equal(vision.currentExecutableFrontier,'SELF_RECOVERY_SECURITY_IMMUNITY_24H_GAME_CREATION');
  assert.deepEqual(vision.stages.map(row=>row.id),[
    'VERIFIED_LEARNING','SELF_RECOVERY','SECURITY_IMMUNITY','AUTONOMOUS_24H_GAME_CREATION',
    'VERIFIED_SELF_EXPANSION','MULTIVERSE_PERSISTENT_WORLDS','USER_IDENTITY_CONTINUITY',
    'CONSCIOUSNESS_TRANSFER'
  ]);
  assert.equal(vision.stages.at(-1).state,'RESEARCH_UNPROVEN');
  assert.equal(vision.selfExpansionBoundary.authoritySelfExpansionForbidden,true);
  assert.equal(vision.selfExpansionBoundary.policySelfCreationForbidden,true);
  assert.equal(vision.selfExpansionBoundary.securityGateBypassForbidden,true);
  assert.equal(guard.capabilityExpansionDoesNotGrantAuthorityExpansion,true);
});

test('consciousness transfer is not claimed as proven or autonomous authority',()=>{
  assert.equal(vision.consciousnessResearchBoundary.currentScientificStatus,'UNPROVEN');
  assert.equal(vision.consciousnessResearchBoundary.currentProductClaimAllowed,false);
  assert.equal(vision.userAgency.simulatedIdentityMustNotBePresentedAsProvenConsciousness,true);
  assert.match(vision.consciousnessResearchBoundary.advancementRequires,/USER_CONSENT/);
  assert.equal(guard.humanConsentAndControlRequired,true);
  assert.equal(guard.consciousnessTransferMustRemainResearchOnlyUntilScientificallyValidated,true);
});

test('all long-term workers remain under verified central security and execution authority',()=>{
  assert.equal(architecture.branches.main.role,'CANONICAL_CODE_AND_MACHINE_POLICY');
  assert.equal(architecture.constitutionalEnforcement.mode,'FAIL_CLOSED');
  assert.equal(security.defaultTrust,'DENY_OR_QUARANTINE_UNTIL_VERIFIED');
  assert.equal(security.enforcement.unverified,'BLOCK');
  assert.equal(roadmap.assistantRoadmapOrchestration.executionBoundary.executionAuthority,'EXISTING_WAVE_SCHEDULER_ONLY');
  assert.equal(roadmap.assistantRoadmapOrchestration.executionBoundary.neuralExecutionAuthority,false);
  assert.equal(roadmap.assistantRoadmapOrchestration.executionBoundary.lockPolicyMutationAuthority,false);
});

test('financial sustainability requires owner-controlled action',()=>{
  const finance=vision.economicSustainability.aiFinancialBoundary;
  assert.equal(vision.strategicContinuity.principles.capitalIsMeansNotFinalGoal,true);
  assert.equal(vision.strategicContinuity.principles.gameReleaseIsCurrentPrimaryCapitalEngine,true);
  assert.equal(finance.autonomousFinancialTransactionAuthority,false);
  assert.equal(finance.autonomousTreasuryTransferAuthority,false);
  assert.equal(finance.autonomousContractOrSpendingCommitmentAuthority,false);
  assert.equal(finance.ownerControlledFinancialActionsRequired,true);
});

test('verified coding learning does not grant model-training or execution authority',()=>{
  assert.equal(roadmap.vibeCognitiveCore.safeguards.hiddenChainOfThoughtPersistenceRequired,false);
  assert.equal(roadmap.vibeCognitiveCore.safeguards.storeOnlyObservableHypothesesPredictionsActionsAndEvidence,true);
  assert.equal(roadmap.ownerCanonicalRules.rule2.rawExternalAiOutputStored,false);
  assert.equal(roadmap.ownerCanonicalRules.rule2.reusableLearningRequiresIndependentVerification,true);
  assert.equal(roadmap.assistantRoadmapOrchestration.executionBoundary.automaticLearningTuningPromotionAuthority,false);
  assert.equal(roadmap.assistantRoadmapOrchestration.executionBoundary.executionAuthority,'EXISTING_WAVE_SCHEDULER_ONLY');
});

test('functional self-model cannot claim sentience or silently rewrite owner policy',()=>{
  const core=roadmap.vibeCognitiveCore;
  assert.equal(core.interpretation.subjectiveConsciousnessClaimed,false);
  assert.equal(core.safeguards.noSentienceClaim,true);
  assert.equal(core.safeguards.noAuthorityExpansion,true);
  assert.equal(core.safeguards.noGateWeakening,true);
  assert.equal(core.identityPhilosophyDevelopment.constitutionLayer.canonicalConstitutionCannotBeSilentlyRewrittenByRuntimeLearning,true);
  assert.equal(guard.securityImmuneSystemMayNotBeBypassedForLongTermVision,true);
});
