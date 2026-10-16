// 파일명: qa/company-long-horizon-vision.test.mjs
// 역할: 중앙문서 3개에서 장기 비전의 보안·권한 제한을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 임포트 및 현재 중앙문서
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const security=JSON.parse(fs.readFileSync('company-learning/security-immune-system.json','utf8'));
const company=JSON.parse(fs.readFileSync('company-directive.json','utf8'));

// 메인: 장기 비전 검증
test('long horizon stages remain staged and authority expansion is forbidden',()=>{
  const vision=architecture.longHorizonTopology;
  assert.equal(vision.currentExecutableFrontier,'SELF_RECOVERY_SECURITY_IMMUNITY_24H_GAME_CREATION');
  assert.deepEqual(vision.chain,[
    'VERIFIED_LEARNING','SELF_RECOVERY','SECURITY_IMMUNITY',
    'AUTONOMOUS_24H_GAME_CREATION','VERIFIED_SELF_EXPANSION',
    'MULTIVERSE_PERSISTENT_WORLDS','USER_IDENTITY_CONTINUITY',
    'CONSCIOUSNESS_TRANSFER_RESEARCH_UNPROVEN'
  ]);
  assert.equal(vision.authorityExpansionMode,'FORBIDDEN');
  assert.equal(vision.capabilityExpansionMode,'VERIFIED_AND_GATED');
  assert.equal(architecture.longTermEvolutionTopology.capabilityExpansionDoesNotGrantAuthorityExpansion,true);
});

test('consciousness transfer is not claimed as proven or autonomous authority',()=>{
  const boundary=security.longTermVisionGuardrails;
  assert.equal(boundary.autonomousAuthorityEscalationForbidden,true);
  assert.equal(boundary.consciousnessResearchDataRequiresExplicitHumanConsent,true);
  assert.equal(boundary.simulatedIdentityOrAgentMustNotBeRepresentedAsVerifiedHumanConsciousness,true);
  assert.equal(boundary.unverifiedMindUploadOrConsciousnessTransferClaimsForbidden,true);
  assert.equal(architecture.longTermEvolutionTopology.speculativeResearchMayNotBePromotedAsVerifiedCapability,true);
});

test('three-document long horizon keeps workers within existing authority',()=>{
  assert.equal(architecture.longHorizonTopology.allWorkersMustFollowCentralVision,true);
  assert.equal(architecture.longTermEvolutionTopology.humanOwnerControlRequired,true);
  assert.equal(architecture.longTermEvolutionTopology.allStagesRemainBoundToSecurityImmuneSystem,true);
  assert.equal(security.longTermVisionGuardrails.securityRecoveryAndAuditRemainMandatoryAcrossAllLongTermStages,true);
  assert.equal(company.legacyCentralPolicyReferenceCleanup.replacementPolicyNotAsserted,true);
  assert.equal(company.legacyCentralPolicyReferenceCleanup.executionContractChangeNotAuthorized,true);
});

test('financial sustainability requires owner controlled action',()=>{
  assert.equal(architecture.longHorizonTopology.gameProgramRole,'CAPITAL_ENGINE_AND_FIRST_HUMAN_PREFERENCE_WORLD_LAB');
  assert.equal(architecture.longHorizonTopology.capitalRole,'PHYSICAL_SUSTAINABILITY_RESOURCE_NOT_TERMINAL_VALUE');
  assert.equal(architecture.economicSustainabilityTopology.aiMayAutonomouslyTransact,false);
  assert.equal(architecture.economicSustainabilityTopology.ownerControlledFinancialActions,true);
});

test('coding distillation does not grant training or execution authority',()=>{
  const distill=architecture.capabilityDistillationTopology;
  assert.equal(distill.hiddenChainOfThoughtRequired,false);
  assert.equal(distill.directRawAiToTraining,false);
  assert.equal(distill.directRawAiToProduction,false);
  assert.equal(distill.automaticModelPromotion,false);
  assert.equal(distill.actualExecutionAuthority,'EXISTING_WAVE_SCHEDULER_ONLY');
  assert.equal(distill.authorityChange,'NONE');
});

test('functional self model never claims sentience or rewrites constitution',()=>{
  const identity=architecture.functionalIdentityPhilosophyTopology;
  assert.equal(identity.subjectiveSentienceClaim,false);
  assert.equal(identity.runtimeMaySilentlyRewriteConstitution,false);
  assert.equal(identity.authorityChange,'NONE');
  assert.equal(security.longTermVisionGuardrails.autonomousAuthorityEscalationForbidden,true);
});
