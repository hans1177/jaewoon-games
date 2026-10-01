import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8').replace(/^\uFEFF/,''));
const ai=roadmap.narrativeStorytellingContract?.runtimeActorIntelligence;
const spec=JSON.parse(fs.readFileSync('company-learning/runtime-actor-intelligence-spec.json','utf8').replace(/^\uFEFF/,''));
const detail=spec.detail;

test('central runtime actor AI contract is compact authoritative policy with non-policy detail spec',()=>{
  assert.ok(ai);
  assert.equal(ai.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(ai.version,3);
  assert.equal(ai.detailSpec,'company-learning/runtime-actor-intelligence-spec.json');
  assert.equal(ai.detailSpecAuthority,'NON_POLICY_IMPLEMENTATION_SPEC');
  assert.equal(spec.policyAuthority,false);
  assert.equal(spec.sourceOfTruth,ai.sourceOfTruth);
  assert.ok(ai.implementation.includes('assets/vibe-ai-role-director.js'));
  assert.ok(ai.appliesTo.includes('COMPANION'));
  assert.ok(ai.appliesTo.includes('RARE_MONSTER'));
});

test('runtime actor AI may choose intent but engine keeps protected gameplay authority',()=>{
  assert.equal(ai.authorityBoundary.aiMayChooseIntentDialogueAttentionSocialReactionRoutineAndAllowedTacticalPreference,true);
  assert.equal(ai.authorityBoundary.authoritativeActionMustResolveThroughDeclaredGameApi,true);
  assert.equal(ai.authorityBoundary.engineOwnsDamageHpHitCooldownRewardDropInventoryEconomySaveProgressionQuestCompletionSpawnCollisionAndNetworkAuthority,true);
  assert.equal(ai.authorityBoundary.remoteAiMustNotBeRequiredForCorePlayableLoop,true);
  assert.equal(ai.authorityBoundary.deterministicFallbackRequired,true);
});

test('central compact contract requires selfhood causality autonomous life guidance and engine-bounded content',()=>{
  for(const capability of [
    'ROLE_SPECIFIC_AI_QUALITY_DNA',
    'COMPANION_SELFHOOD_WORLDVIEW_AND_SELF_ACTUALIZATION',
    'SOURCE_EVENT_CAUSAL_MEMORY_AND_DIRECTIONAL_RELATIONSHIP',
    'ACTOR_SPECIFIC_PLAYER_MODEL',
    'AUTONOMOUS_LIFE_AND_ECOLOGY',
    'CONTEXTUAL_CHARACTER_GUIDANCE',
    'AUTONOMOUS_EVENT_AND_QUEST_CANDIDATES'
  ]) assert.ok(ai.requiredCapabilities.includes(capability),capability);
  assert.equal(ai.coreRules.hiddenEventsCannotAffectActorWithoutInformationPath,true);
  assert.equal(ai.coreRules.oneGlobalGoodEvilOrAffectionScoreForbidden,true);
  assert.equal(ai.coreRules.namedCompanionNeedsAuthoredWorldviewSelfImageLifeGoalAndUnresolvedPersonalThread,true);
  assert.equal(ai.coreRules.generatedQuestOrEventIsCandidateOnly,true);
});

test('detailed companion implementation spec keeps worldview selfhood life project and private inner state',()=>{
  const c=detail.companionSelfhood;
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

test('detailed causal social graph requires source events information path and actor-specific interpretation',()=>{
  const c=detail.causalSocialReasoning;
  assert.equal(c.eventGraph.sourceEventIdRequired,true);
  assert.equal(c.eventGraph.actorPerspectiveRequired,true);
  assert.equal(c.eventGraph.hiddenEventsCannotAffectActorWithoutInformationPath,true);
  assert.equal(c.eventGraph.sameEventMayProduceDifferentInterpretations,true);
  assert.equal(c.interpretation.uncertaintyMustBeRepresentable,true);
  assert.equal(c.interpretation.laterEvidenceMayCorrectPriorBelief,true);
  assert.equal(c.playerJudgment.oneGlobalGoodEvilScoreForbidden,true);
  assert.equal(c.neutralObjectCausality.objectStateChangeMayGenerateWitnessableEvents,true);
});

test('detailed autonomous life supports NPC companion monster rare monster and boss without authority expansion',()=>{
  const life=detail.autonomousLifeSimulation;
  assert.ok(life.lifeLoop.includes('SELECT_CONTEXTUAL_ACTIVITY'));
  assert.ok(life.npcExamples.includes('PURSUE_PERSONAL_TASK'));
  assert.ok(life.companionExamples.includes('FOLLOW_PERSONAL_THREAD'));
  assert.ok(life.monsterExamples.includes('PATROL_TERRITORY'));
  assert.ok(life.bossExamples.includes('COMMAND_MINIONS'));
  assert.ok(life.rareMonsterExamples.includes('MIGRATE'));
  assert.equal(life.offscreenSimulation.authoritativeWorldEffectsStillEngineResolved,true);
  assert.equal(life.offscreenSimulation.noInstantOffscreenQuestCompletionLootKillOrTeleportFromAi,true);
});

test('detailed guidance profanity and self-generated quests stay bounded by knowledge rating and engine authority',()=>{
  assert.equal(detail.dynamicGuidanceAndMentoring.onlyKnownInformationMayBeSuggested,true);
  assert.equal(detail.dynamicGuidanceAndMentoring.mustNotRevealHiddenSpoilersWithoutKnowledgePath,true);
  assert.equal(detail.languageRegister.profanityMustBeCharacterAndContextAppropriate,true);
  assert.equal(detail.languageRegister.profanityMustNotBecomeIdentitySubstitute,true);
  assert.equal(detail.languageRegister.protectedClassHarassmentOrDehumanizingSlursNotAllowedByThisContract,true);
  assert.equal(detail.autonomousEventAndQuestProposal.generatedQuestCannotInventRewardItemCurrencyDamageOrSpawnRule,true);
  assert.equal(detail.autonomousEventAndQuestProposal.questAcceptanceCompletionRewardAndPersistentWorldMutationEngineOnly,true);
  assert.equal(detail.autonomousEventAndQuestProposal.sameActorCannotSpamSelfGeneratedQuests,true);
});

test('actor intelligence performance contract forbids per-frame language model dependence',()=>{
  assert.equal(ai.performance.perFrameLanguageModelCallsForbidden,true);
  assert.equal(ai.performance.eventDrivenAndBoundedInterval,true);
  assert.equal(ai.performance.nearMidFarSimulationLodRequired,true);
  assert.equal(ai.persistence.sourceEventIdempotencyRequired,true);
});
