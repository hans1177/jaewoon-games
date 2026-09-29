// 파일명: qa/company-long-horizon-vision.test.mjs
// 역할: 장기 비전이 실행 가능 단계와 연구 단계를 혼동하지 않고 중앙 로드맵에 고정됐는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));

test('long horizon vision preserves verified staged progression',()=>{
  const vision=roadmap.longHorizonVision;
  assert.equal(vision?.documentIsCode,true);
  assert.equal(vision?.currentExecutableFrontier,'SELF_RECOVERY_SECURITY_IMMUNITY_24H_GAME_CREATION');
  assert.deepEqual((vision?.stages||[]).map(x=>x.id),[
    'VERIFIED_LEARNING',
    'SELF_RECOVERY',
    'SECURITY_IMMUNITY',
    'AUTONOMOUS_24H_GAME_CREATION',
    'VERIFIED_SELF_EXPANSION',
    'MULTIVERSE_PERSISTENT_WORLDS',
    'USER_IDENTITY_CONTINUITY',
    'CONSCIOUSNESS_TRANSFER'
  ]);
  assert.equal(vision?.selfExpansionBoundary?.authoritySelfExpansionForbidden,true);
  assert.equal(vision?.selfExpansionBoundary?.capabilityExpansionAllowed,true);
});

test('consciousness transfer stays research-only until reproducible evidence exists',()=>{
  const vision=roadmap.longHorizonVision;
  const stage=(vision?.stages||[]).find(x=>x.id==='CONSCIOUSNESS_TRANSFER');
  assert.equal(stage?.state,'RESEARCH_UNPROVEN');
  assert.equal(vision?.consciousnessResearchBoundary?.currentScientificStatus,'UNPROVEN');
  assert.equal(vision?.consciousnessResearchBoundary?.currentProductClaimAllowed,false);
  assert.equal(vision?.consciousnessResearchBoundary?.simulatedPersonaIsNotEquivalentToTransferredConsciousness,true);
});

test('architecture mirrors the central long horizon chain',()=>{
  assert.equal(architecture?.longHorizonTopology?.centralPolicy,'company-learning/platform-release-roadmap.json');
  assert.equal(architecture?.longHorizonTopology?.allWorkersMustFollowCentralVision,true);
  assert.equal(architecture?.longHorizonTopology?.authorityExpansionMode,'FORBIDDEN');
  assert.equal(architecture?.longHorizonTopology?.capabilityExpansionMode,'VERIFIED_AND_GATED');
});


test('strategic continuity keeps game release capital and human-preference lab connected to the long horizon',()=>{
  const continuity=roadmap.longHorizonVision?.strategicContinuity;
  const economic=roadmap.longHorizonVision?.economicSustainability;
  assert.equal(continuity?.principles?.capitalIsMeansNotFinalGoal,true);
  assert.equal(continuity?.principles?.gameReleaseIsCurrentPrimaryCapitalEngine,true);
  assert.equal(continuity?.principles?.gameDevelopmentIsHumanPreferenceAndCapabilityLaboratory,true);
  assert.equal(continuity?.principles?.multiverseIsNotEquivalentToAConventionalGame,true);
  assert.equal(continuity?.principles?.multiverseIsLongHorizonIntermediateCreationPlatform,true);
  assert.equal(economic?.runwayDiscipline?.runwayIsCriticalRealityMetric,true);
  assert.equal(economic?.aiFinancialBoundary?.autonomousFinancialTransactionAuthority,false);
  assert.equal(economic?.aiFinancialBoundary?.ownerControlledFinancialActionsRequired,true);
});

test('full coding absorption remains verification-gated capability distillation',()=>{
  const distill=roadmap.vibeCodingMethodSelfImprovement?.fullCodingAbsorptionAndCapabilityDistillation;
  assert.equal(distill?.capture?.allObservableAttemptsCapturedWhenAvailable,true);
  assert.equal(distill?.capture?.hiddenChainOfThoughtRequired,false);
  assert.equal(distill?.selfReplay?.replayBeforeReusablePromotion,true);
  assert.equal(distill?.distillation?.unverifiedAttemptReusable,false);
  assert.equal(distill?.distillation?.automaticModelPromotion,false);
  assert.equal(distill?.application?.everyAppliedSkillRequiresFreshTaskQa,true);
  assert.equal(distill?.authorityBoundary?.executionAuthority,'EXISTING_WAVE_SCHEDULER_ONLY');
  assert.equal(distill?.authorityBoundary?.workerCreationAuthority,false);
  assert.equal(distill?.authorityBoundary?.queueMutationAuthority,false);
  assert.equal(distill?.authorityBoundary?.authorityChange,'NONE');
});

test('functional self model and evolving philosophy do not claim sentience or self expand authority',()=>{
  const identity=roadmap.vibeCognitiveCore?.identityPhilosophyDevelopment;
  assert.equal(identity?.constitutionLayer?.selfAuthorityExpansionForbidden,true);
  assert.equal(identity?.evolvingPhilosophyLayer?.runtimeMayGeneratePhilosophyCandidates,true);
  assert.equal(identity?.evolvingPhilosophyLayer?.canonicalPhilosophyChangeRequiresExistingCentralAuthorityReview,true);
  assert.equal(identity?.sentienceBoundary?.functionalSelfModelIsNotProofOfSentience,true);
  assert.equal(identity?.sentienceBoundary?.subjectiveConsciousnessClaimed,false);
  assert.equal(architecture?.functionalIdentityPhilosophyTopology?.runtimeMaySilentlyRewriteConstitution,false);
});

test('architecture maps sustainability capability distillation and multiverse continuity without new execution authority',()=>{
  assert.equal(architecture?.longHorizonTopology?.capitalRole,'PHYSICAL_SUSTAINABILITY_RESOURCE_NOT_TERMINAL_VALUE');
  assert.equal(architecture?.longHorizonTopology?.gameProgramRole,'CAPITAL_ENGINE_AND_FIRST_HUMAN_PREFERENCE_WORLD_LAB');
  assert.equal(architecture?.capabilityDistillationTopology?.actualExecutionAuthority,'EXISTING_WAVE_SCHEDULER_ONLY');
  assert.equal(architecture?.capabilityDistillationTopology?.automaticModelPromotion,false);
  assert.equal(architecture?.capabilityDistillationTopology?.authorityChange,'NONE');
  assert.equal(architecture?.economicSustainabilityTopology?.aiMayAutonomouslyTransact,false);
});
