import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8').replace(/^\uFEFF/,''));
const ai=roadmap.narrativeStorytellingContract?.runtimeActorIntelligence;

test('central runtime actor AI contract exists inside narrative storytelling authority',()=>{
  assert.ok(ai);
  assert.equal(ai.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(ai.version,3);
  assert.ok(ai.implementation.includes('assets/vibe-ai-role-director.js'));
  assert.ok(ai.implementation.includes('assets/common-ai.js'));
  assert.ok(ai.appliesTo.includes('COMPANION'));
  assert.ok(ai.appliesTo.includes('MONSTER'));
  assert.ok(ai.appliesTo.includes('BOSS'));
});

test('runtime actor AI may choose intent and dialogue but never owns protected gameplay state',()=>{
  assert.equal(ai.authorityBoundary.aiMayChooseIntent,true);
  assert.equal(ai.authorityBoundary.aiMayChooseDialogue,true);
  assert.equal(ai.authorityBoundary.aiMayChooseAllowedTacticalPreference,true);
  assert.equal(ai.authorityBoundary.engineOwnsDamageHpHitCooldownRewardDropInventoryEconomySaveProgressionQuestCompletionSpawnCollisionNetworkAuthority,true);
  assert.equal(ai.authorityBoundary.authoritativeActionMustResolveThroughDeclaredGameApi,true);
  assert.equal(ai.authorityBoundary.networkServerAuthorityMustRemainIntact,true);
  assert.equal(ai.authorityBoundary.deterministicFallbackRequired,true);
});

test('named companions require worldview selfhood life project and relationship causality',()=>{
  const c=ai.companionSelfhood;
  assert.ok(c);
  assert.ok(c.selfLayers.worldview.includes('WHAT_THE_WORLD_IS_LIKE'));
  assert.ok(c.selfLayers.selfImage.includes('WHO_I_WANT_TO_BECOME'));
  assert.ok(c.selfLayers.lifeProject.includes('CURRENT_LONG_TERM_AIM'));
  assert.ok(c.motivationHierarchy.layers.includes('SELF_ACTUALIZATION'));
  assert.equal(c.relationshipFormation.directional,true);
  assert.equal(c.relationshipFormation.oneMinorEventMustNotRewriteEntireBond,true);
  assert.equal(c.subjectiveInnerState.notAChainOfThought,true);
  assert.equal(c.subjectiveInnerState.playerMustNotAutomaticallyKnowPrivateInnerState,true);
});

test('causal social graph requires observed source events and actor-specific interpretation',()=>{
  const c=ai.causalSocialReasoning;
  assert.equal(c.eventGraph.sourceEventIdRequired,true);
  assert.equal(c.eventGraph.actorPerspectiveRequired,true);
  assert.equal(c.eventGraph.hiddenEventsCannotAffectActorWithoutInformationPath,true);
  assert.equal(c.eventGraph.sameEventMayProduceDifferentInterpretations,true);
  assert.equal(c.interpretation.uncertaintyMustBeRepresentable,true);
  assert.equal(c.interpretation.laterEvidenceMayCorrectPriorBelief,true);
  assert.equal(c.playerJudgment.oneGlobalGoodEvilScoreForbidden,true);
  assert.equal(c.neutralObjectCausality.objectStateChangeMayGenerateWitnessableEvents,true);
});

test('NPC companion monster rare monster and boss can sustain bounded autonomous life',()=>{
  const life=ai.autonomousLifeSimulation;
  assert.ok(life.lifeLoop.includes('SELECT_CONTEXTUAL_ACTIVITY'));
  assert.ok(life.npcExamples.includes('PURSUE_PERSONAL_TASK'));
  assert.ok(life.companionExamples.includes('FOLLOW_PERSONAL_THREAD'));
  assert.ok(life.monsterExamples.includes('PATROL_TERRITORY'));
  assert.ok(life.bossExamples.includes('COMMAND_MINIONS'));
  assert.ok(life.rareMonsterExamples.includes('MIGRATE'));
  assert.equal(life.offscreenSimulation.authoritativeWorldEffectsStillEngineResolved,true);
  assert.equal(life.offscreenSimulation.noInstantOffscreenQuestCompletionLootKillOrTeleportFromAi,true);
});

test('characterful hints profanity and self-generated quests remain bounded by knowledge rating and engine authority',()=>{
  assert.equal(ai.dynamicGuidanceAndMentoring.onlyKnownInformationMayBeSuggested,true);
  assert.equal(ai.dynamicGuidanceAndMentoring.mustNotRevealHiddenSpoilersWithoutKnowledgePath,true);
  assert.equal(ai.languageRegister.profanityMustBeCharacterAndContextAppropriate,true);
  assert.equal(ai.languageRegister.profanityMustNotBecomeIdentitySubstitute,true);
  assert.equal(ai.languageRegister.protectedClassHarassmentOrDehumanizingSlursNotAllowedByThisContract,true);
  assert.equal(ai.autonomousEventAndQuestProposal.generatedQuestCannotInventRewardItemCurrencyDamageOrSpawnRule,true);
  assert.equal(ai.autonomousEventAndQuestProposal.questAcceptanceCompletionRewardAndPersistentWorldMutationEngineOnly,true);
  assert.equal(ai.autonomousEventAndQuestProposal.sameActorCannotSpamSelfGeneratedQuests,true);
});

test('actor intelligence performance contract forbids per-frame language model dependence',()=>{
  assert.equal(ai.performance.perFrameLanguageModelCallsForbidden,true);
  assert.equal(ai.performance.remoteAiTimeoutMustFallbackDeterministically,true);
  assert.equal(ai.performance.remoteAiFailureMustNotBreakCoreGameplay,true);
  assert.equal(ai.performance.memoryMustBeCompressedBeforeUnboundedGrowth,true);
});
