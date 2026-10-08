import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  createVibeActorQualityDNA,
  createVibeCompanionPersonalityDNA,
  createVibeCompanionSelfhoodDNA,
  createVibeCompanionMotivationFrame,
  createVibeCompanionInnerState,
  createVibeCompanionRelationshipFrame,
  createVibeCompanionDialogueIntent,
  createVibeCompanionPersonalArc,
  createVibeCausalEvent,
  createVibeCausalInterpretation,
  planVibeCausalActorLoop,
  planVibeLivingActorDirector,
  createVibePlayerJudgment,
  createVibeAutonomousLifePlan,
  createVibeGuidanceIntent,
  createVibeLanguageRegister,
  createVibeActorEventCandidate,
  createVibeActorQuestCandidate,
  createVibeReactionContinuity,
  createVibeMonsterEcologyMind,
  planVibeCompanionSocialDirector,
  validateVibeAIAction
} from '../assets/vibe-ai-role-director.js';
import {JaewoonCommonAI,JaewoonAISquad} from '../assets/common-ai.js';
import {createAIPartyConfig,createDefaultAIEntries} from '../assets/ai-party.js';
import {deriveGameplaySketch,buildVibePatchPlan,analyzeExistingGameSource,buildRuntimeValidationPlan,runtimeValidationBlockers} from '../tools/company-vibe2-gameplay-intelligence.mjs';

const roleDirectorSource=fs.readFileSync(new URL('../assets/vibe-ai-role-director.js',import.meta.url),'utf8');

const companion={
  id:'mira',
  role:'companion',
  temperament:'dry',
  values:['loyalty','freedom','craft'],
  boundaries:['do-not-lie-to-me'],
  traits:{courage:55,caution:10,empathy:45,curiosity:30,independence:60,protectiveness:50},
  worldview:{worldBelief:'people reveal themselves under pressure',peopleBelief:'trust must be earned'},
  selfImage:'competent scout',
  fearedSelf:'a burden',
  desiredSelf:'someone others can rely on without losing freedom',
  longTermGoal:'map the old frontier',
  personalDuty:'keep the party alive on the road',
  unresolvedThread:'find out why her mentor disappeared',
  contradictions:['freedom-vs-loyalty'],
  formality:'casual',
  directness:'high',
  humor:'dry',
  verbalHabits:['short observations'],
  profanityLevel:'MILD'
};

test('named companion has selfhood worldview life project and quality floor beyond random dialogue',()=>{
  const quality=createVibeActorQualityDNA({role:'companion',named:true});
  const personality=createVibeCompanionPersonalityDNA(companion);
  const selfhood=createVibeCompanionSelfhoodDNA(companion);
  assert.equal(quality.profile,'COMPANION');
  for(const axis of ['WORLDVIEW','SELF_IMAGE','LIFE_PROJECT','RELATIONSHIP','MEMORY','INITIATIVE']) assert.ok(quality.required.includes(axis),axis);
  assert.equal(personality.worldview.worldBelief,'people reveal themselves under pressure');
  assert.equal(personality.selfhood.longTermGoal,'map the old frontier');
  assert.equal(selfhood.lifeProject.unresolvedThread,'find out why her mentor disappeared');
  assert.ok(selfhood.agency.includes('disagree'));
  assert.match(selfhood.rule,/player-is-important-but-not-the-center/);
});

test('companion inner state is structured private state rather than exposed freeform chain of thought',()=>{
  const inner=createVibeCompanionInnerState({
    companion,
    situation:{currentConcern:'the bridge looks unstable',currentHope:'find another route',unsaidFeeling:'does not want to admit fear',viewOfPlayer:'reliable under pressure'},
    relationship:{trust:45,respect:30},
    memory:[{id:'e1',type:'rescue'}],
    emotion:'alert'
  });
  assert.equal(inner.currentConcern,'the bridge looks unstable');
  assert.equal(inner.privacy.playerDoesNotAutomaticallyKnow,true);
  assert.equal(inner.privacy.longFreeformReasoningNotRequired,true);
  assert.ok(inner.use.includes('subtext'));
  assert.ok(inner.motivation.hierarchy.includes('self-actualization'));
});

test('causal relationship reasoning requires a source event and information path',()=>{
  const event=createVibeCausalEvent({id:'evt-rescue-1',type:'rescue',actorId:'player',targetId:'mira',witnesses:['mira']});
  const seen=createVibeCausalInterpretation({actor:companion,event,knowledge:{observed:true,confidence:.95,attribution:'direct-cause'},relationship:{trust:20}});
  const unseen=createVibeCausalInterpretation({actor:{...companion,id:'other'},event,knowledge:{observed:false,reported:false,confidence:0},relationship:{}});
  assert.equal(event.relationshipMutationEligible,true);
  assert.equal(seen.perceived,true);
  assert.equal(seen.extremePermanentShiftAllowed,true);
  assert.equal(unseen.perceived,false);
  assert.equal(unseen.extremePermanentShiftAllowed,false);
  assert.equal(unseen.noHiddenFactAccess,true);
});

test('player judgment is actor-specific multi-axis belief not one global morality score',()=>{
  const judgment=createVibePlayerJudgment({actor:companion,events:[{id:'a',type:'help'},{id:'b',type:'abandon'}],previous:{trustworthiness:20,danger:-5}});
  assert.equal(judgment.dimensions.trustworthiness,20);
  assert.deepEqual(judgment.sourceEventIds,['a','b']);
  assert.equal(judgment.oneGlobalGoodEvilScoreForbidden,true);
  assert.equal(judgment.otherActorsMayJudgeDifferently,true);
});

test('relationship frame is directional causal and cannot directly change combat stats',()=>{
  const frame=createVibeCompanionRelationshipFrame({
    companion,other:{id:'player'},relationship:{trust:35,affection:10,boundaryComfort:25,stage:'working-trust'},
    events:[{id:'promise-1',type:'keep-promise',actor:'player',target:'mira',weight:1}]
  });
  assert.equal(frame.perspectiveSpecific,true);
  assert.equal(frame.state.directional,true);
  assert.equal(frame.causes[0].id,'promise-1');
  assert.ok(frame.affects.includes('personal-space'));
  assert.ok(frame.protected.includes('damage'));
});

test('dialogue and guidance vary by relationship knowledge failure history and silence rules',()=>{
  const inner=createVibeCompanionInnerState({companion,situation:{currentConcern:'player keeps entering poison fog'},relationship:{trust:30},emotion:'concerned'});
  const dialogue=createVibeCompanionDialogueIntent({companion,relationship:{trust:30},innerState:inner,recentLines:['same','same'],activity:'travel',attentionTarget:'poison-fog'});
  const light=createVibeGuidanceIntent({actor:companion,recentFailures:[],knownFacts:['fog damages exposed actors']});
  const direct=createVibeGuidanceIntent({actor:companion,recentFailures:[1,2,3],knownFacts:['fog damages exposed actors']});
  assert.ok(dialogue.allowedSpeechActs.includes('silence'));
  assert.equal(dialogue.repetition.exactRepeatForbidden,true);
  assert.equal(light.hintDirectness,'light');
  assert.equal(direct.hintDirectness,'more-direct');
  assert.equal(direct.onlyKnownInformation,true);
  assert.equal(direct.spoilerWithoutKnowledgePathForbidden,true);
});

test('language register can allow characterful profanity without turning it into random filler',()=>{
  const normal=createVibeLanguageRegister({actor:{...companion,profanityLevel:'STRONG',profanityFrequencyBudget:2},gameProfile:{familyFriendly:false},relationship:{trust:20}});
  const family=createVibeLanguageRegister({actor:{...companion,profanityLevel:'STRONG'},gameProfile:{familyFriendly:true}});
  assert.equal(normal.profanityLevel,'STRONG');
  assert.equal(normal.profanityMustFitCharacterAndContext,true);
  assert.equal(normal.profanityIsNotIdentitySubstitute,true);
  assert.equal(family.profanityLevel,'MILD');
  assert.equal(normal.dehumanizingProtectedClassSlursForbidden,true);
});

test('autonomous life lets NPC companion monster and boss keep personal activity without player presence',()=>{
  const npc=createVibeAutonomousLifePlan({actor:{id:'smith',role:'npc'},duties:['repair-tools'],personalGoals:['restore-workshop']});
  const comp=createVibeAutonomousLifePlan({actor:companion,personalGoals:['map-frontier']});
  const monster=createVibeAutonomousLifePlan({actor:{id:'wolf',role:'monster'},personalGoals:['defend-den']});
  const boss=createVibeAutonomousLifePlan({actor:{id:'warden',role:'boss'},duties:['guard-objective']});
  assert.ok(npc.activities.includes('work'));
  assert.ok(comp.activities.includes('follow-personal-thread'));
  assert.ok(monster.activities.includes('patrol-territory'));
  assert.ok(boss.activities.includes('command-minions'));
  assert.equal(comp.playerAbsenceDoesNotErasePersonalLife,true);
  assert.equal(boss.offscreen.authoritativeWorldEffectsEngineOnly,true);
});

test('actor-generated events and quests are proposals only and never own rewards or completion',()=>{
  const cause=[{id:'mentor-clue',type:'discovery'}];
  const event=createVibeActorEventCandidate({actor:companion,causeEvents:cause,motive:'find mentor',goal:'visit old watchtower'});
  const quest=createVibeActorQuestCandidate({actor:companion,causeEvents:cause,personalStake:'mentor mystery',worldStake:'old frontier',primaryVerb:'investigate',branches:['go-now','ask-locals-first']});
  assert.equal(event.candidateOnly,true);
  assert.equal(event.engineValidationRequired,true);
  assert.equal(event.mayNotInventRewardDamageSpawnCurrencyOrQuestCompletion,true);
  assert.equal(quest.candidateOnly,true);
  assert.equal(quest.acceptanceCompletionRewardPersistentMutation,'engine-only');
  assert.deepEqual(quest.causeEventIds,['mentor-clue']);
});

test('reaction continuity keeps event perception interpretation body intent and memory causally ordered',()=>{
  const reaction=createVibeReactionContinuity({event:{id:'hit-1',type:'ally-hurt'},interpretation:{meaning:'threat'},emotionBefore:'calm',emotionAfter:'anger',intent:'protect'});
  assert.deepEqual([...reaction.sequence],['event','perception','interpretation','emotion','attention','speech-or-silence','body-reaction','intent','engine-action','outcome','memory']);
  assert.equal(reaction.instantMoodFlipRequiresCause,true);
  assert.equal(reaction.laterReconsiderationAllowed,true);
});

test('monster ecology keeps species behavior and individual temperament separate from raw stats',()=>{
  const mind=createVibeMonsterEcologyMind({id:'rare-wolf',role:'elite',species:'wolf',temperament:'cautious-territorial',territory:'north-ridge',groupRole:'scout'});
  assert.equal(mind.species,'wolf');
  assert.equal(mind.temperament,'cautious-territorial');
  assert.ok(mind.ecology.includes('return-to-den'));
  assert.ok(mind.tactical.includes('flank'));
  assert.match(mind.rule,/individual-temperament/);
});

test('social director combines selfhood relationship inner state dialogue initiative and embodiment',()=>{
  const director=planVibeCompanionSocialDirector({
    companion,player:{id:'player'},relationship:{trust:40,respect:20,stage:'working-trust'},
    world:{emotion:'alert',activity:'travel',attentionTarget:'bridge',currentConcern:'unsafe bridge'},
    memory:[{id:'shared-1',type:'shared-danger'}],history:[{speechAct:'warn',topic:'bridge'}]
  });
  assert.equal(director.version,4);
  assert.equal(director.qualityDNA.profile,'COMPANION');
  assert.equal(director.selfhood.lifeProject.longTermGoal,'map the old frontier');
  assert.equal(director.policy.playerNotUniversalCenter,true);
  assert.equal(director.policy.privateInnerState,true);
  assert.ok(director.dialogueIntent.allowedSpeechActs.includes('disagree'));
});

test('common local AI personality changes allowed tactical preference but never gameplay authority',()=>{
  const cautious=new JaewoonCommonAI({personality:{caution:.9,courage:-.4,aggression:-.3}});
  const bold=new JaewoonCommonAI({personality:{caution:-.4,courage:.8,aggression:.8}});
  const enemy={id:'player',distance:2,threat:1,hpRatio:.8};
  const cautiousDecision=cautious.decide({entityKind:'monster',hpRatio:.32,danger:.4,enemies:[enemy],canRetreat:true});
  const boldDecision=bold.decide({entityKind:'monster',hpRatio:.32,danger:.4,enemies:[enemy],canRetreat:true});
  assert.equal(cautiousDecision.state,JaewoonCommonAI.State.RETREAT);
  assert.equal(boldDecision.state,JaewoonCommonAI.State.ATTACK);
  assert.equal(cautiousDecision.gameplayAuthority,false);
  assert.equal(boldDecision.gameplayAuthority,false);
});

// 메인: 실제 AI 제안은 기존 엔진의 대화·파티·좌표·스토리·전투 권한을 대신하지 않는다.
test('NPC story conversation is event-grounded, proximity gated and idempotent',()=>{
  const actor=new JaewoonCommonAI({config:{socialCooldownMs:3000}});
  const beat={id:'village-arrival',sourceEventId:'player-entered-village',eligible:true,engineApproved:true};
  const context={entityKind:'npc',now:1000,playerVisible:true,playerNearby:true,
    canInitiateDialogue:true,canInteract:false,authoredStoryBeat:beat};
  const proposal=actor.decide(context);
  assert.equal(proposal.state,JaewoonCommonAI.State.TALK);
  assert.equal(proposal.target.sourceEventId,beat.sourceEventId);
  assert.equal(proposal.gameplayAuthority,false);
  assert.notEqual(actor.decide({...context,now:21000}).state,JaewoonCommonAI.State.TALK);
  assert.equal(actor.decide({...context,now:22000,authoredStoryBeat:{...beat,id:'new-episode'}}).state,JaewoonCommonAI.State.TALK);
  assert.notEqual(new JaewoonCommonAI().decide({...context,playerNearby:false}).state,JaewoonCommonAI.State.TALK);
  assert.notEqual(new JaewoonCommonAI().decide({...context,authoredStoryBeat:{...beat,engineApproved:false}}).state,JaewoonCommonAI.State.TALK);
});

test('NPC party invitations require explicit prior engine admission and available slots',()=>{
  const party={recruitable:true,engineApproved:true,openSlots:1,playerId:'player'};
  const context={entityKind:'npc',now:1000,playerVisible:true,playerNearby:true,canInitiateDialogue:true,
    partyInvitation:party};
  const npc=new JaewoonCommonAI();
  const invitation=npc.decide(context);
  assert.equal(invitation.state,JaewoonCommonAI.State.INVITE);
  assert.equal(invitation.targetId,'player');
  assert.equal(invitation.gameplayAuthority,false);
  assert.notEqual(npc.decide({...context,now:21000}).state,JaewoonCommonAI.State.INVITE);
  for(const bad of [{openSlots:0},{engineApproved:false},{recruitable:false}]){
    assert.notEqual(new JaewoonCommonAI().decide({...context,partyInvitation:{...party,...bad}}).state,JaewoonCommonAI.State.INVITE);
  }
});

test('observed hints respect actor silence, danger and explicit companion orders',()=>{
  const tip={id:'equipment-gap',text:'Check your unlocked weapon before the hunt',observed:true};
  const npc={entityKind:'npc',now:1000,playerVisible:true,playerNearby:true,canInitiateDialogue:true,knownAdvice:tip};
  assert.equal(new JaewoonCommonAI().decide(npc).state,JaewoonCommonAI.State.GUIDE);
  assert.notEqual(new JaewoonCommonAI().decide({...npc,knownAdvice:{...tip,observed:false}}).state,JaewoonCommonAI.State.GUIDE);
  const companion={entityKind:'companion',now:1000,playerVisible:true,ownerDistance:2,canInitiateDialogue:true,knownAdvice:tip,enemies:[]};
  assert.equal(new JaewoonCommonAI().decide(companion).state,JaewoonCommonAI.State.GUIDE);
  const enemy={id:'wolf',distance:2,threat:1,hpRatio:1};
  assert.equal(new JaewoonCommonAI().decide({...companion,enemies:[enemy]}).state,JaewoonCommonAI.State.ATTACK);
  const loyal=new JaewoonCommonAI();
  loyal.setOrder(JaewoonCommonAI.Order.HOLD);
  assert.equal(loyal.decide(companion).state,JaewoonCommonAI.State.GUARD);
});

test('NPC life route only proposes real nearby authored anchors and never teleports',()=>{
  const context={entityKind:'npc',canRoam:true,movementAuthorized:true,regionId:'town',
    currentActivity:{anchorId:'smith-shop'},authoredAnchors:[
      {id:'smith-shop',regionId:'town',x:130,y:260},
      {id:'foreign',regionId:'field-1',x:500,y:200}
    ],patrolReady:false};
  const npc=new JaewoonCommonAI();
  const route=npc.decide(context);
  assert.equal(route.state,JaewoonCommonAI.State.PATROL);
  assert.equal(route.reason,'npc_authored_daily_route');
  assert.equal(route.target.id,'smith-shop');
  assert.equal(route.gameplayAuthority,false);
  assert.notEqual(npc.decide({...context,movementAuthorized:false}).reason,'npc_authored_daily_route');
  assert.notEqual(npc.decide({...context,currentActivity:{anchorId:'foreign'}}).reason,'npc_authored_daily_route');
  assert.notEqual(npc.decide({...context,authoredAnchors:[{id:'bad',x:Infinity,y:2}]}).reason,'npc_authored_daily_route');
});

test('boss introduction uses authored dialogue once and preserves current attack logic',()=>{
  const scene={id:'ogre-intro',sourceEventId:'ogre-seen-player',engineApproved:true,
    authoredDialogue:'This is my domain.',requiredPhase:'PHASE_1'};
  const context={entityKind:'boss',playerVisible:true,canPresentBossScene:true,
    currentPhase:'PHASE_1',bossScene:scene,enemies:[{id:'player',distance:2,threat:1,hpRatio:1}]};
  const boss=new JaewoonCommonAI();
  const reveal=boss.decide(context);
  assert.equal(reveal.state,JaewoonCommonAI.State.TALK);
  assert.equal(reveal.reason,'boss_authored_cinematic');
  assert.equal(reveal.target.skipAllowed,true);
  assert.equal(reveal.target.presentationOnly,true);
  assert.equal(reveal.gameplayAuthority,false);
  assert.equal(boss.decide(context).state,JaewoonCommonAI.State.ATTACK);
  assert.equal(new JaewoonCommonAI().decide({...context,currentPhase:'PHASE_2'}).state,JaewoonCommonAI.State.ATTACK);
  assert.equal(new JaewoonCommonAI().decide({...context,bossScene:{...scene,engineApproved:false}}).state,JaewoonCommonAI.State.ATTACK);
});

// Unity 원본 소스 정적 회귀: 실물 런타임 조작이 아니며 APK/WebGL 실행 통과로 간주하지 않는다.
test('Unity village life, story save, scout opt-in and boss reveal remain on original engine-owned paths',()=>{
  const core=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/GameCore.cs',import.meta.url),'utf8');
  const runtime=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/RuntimeBootstrap.cs',import.meta.url),'utf8');
  const visual=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/PrototypeAnimatedVisuals.cs',import.meta.url),'utf8');
  assert.match(core,/private const string SaveKey = "daechung-rpg-save-v1"/);
  assert.match(core,/public List<string> witnessedStoryEvents = new\(\)/);
  assert.match(core,/public bool TryRecordStoryEvent\(string eventId\)/);
  assert.match(core,/Player\.witnessedStoryEvents\.Contains\(eventId\)/);
  assert.match(core,/public bool TrySetScoutCompanion\(bool accompanying\)/);
  assert.match(core,/Player\.scoutAccompanying = accompanying;/);
  assert.match(core,/Player\.witnessedStoryEvents == null/);
  assert.match(runtime,/DrawSocialControls\(\)/);
  assert.match(runtime,/IsVillageResidentNearby\(id\)/);
  assert.match(runtime,/TalkWithResident\(string id\)/);
  assert.match(runtime,/TryRecordStoryEvent\("chief-introduction"\)/);
  assert.match(runtime,/TryRecordStoryEvent\("smith-visit"\)/);
  assert.match(runtime,/TryRecordStoryEvent\("ogre-sighted"\)/);
  assert.match(runtime,/TryRecordStoryEvent\("ogre-defeated"\)/);
  assert.match(runtime,/TrySetScoutCompanion\(true\)/);
  assert.match(runtime,/TrySetScoutCompanion\(false\)/);
  assert.match(runtime,/DrawStoryPrompt\(Rect safe, float scale\)/);
  assert.match(runtime,/GUI\.Button\(skip, "SKIP"\)/);
  assert.match(visual,/Vector3\.MoveTowards\(at, destination/);
  assert.match(visual,/InitializeVillageResidents\(\)/);
  assert.match(visual,/public bool IsVillageResidentNearby\(string id\)/);
  assert.match(visual,/public void PlayBossReveal\(\)/);
  assert.match(visual,/public void SkipBossReveal\(\)/);
  assert.match(visual,/public void SetNarrativeCompanion\(bool accompanying\)/);
  assert.doesNotMatch(runtime,/ParticipantCount\s*\+\s*1|Connected\s*=\s*true/);
  assert.doesNotMatch(core,/TryRecordStoryEvent[\s\S]{0,2000}(?:baseAttack\s*[+\-]=|gold\s*[+\-]=|experience\s*[+\-]=)/);
});
test('common AI memory is bounded idempotent and relationships remain directional state',()=>{
  const ai=new JaewoonCommonAI({memoryLimit:4});
  assert.equal(ai.remember({id:'e1',type:'help'}),true);
  assert.equal(ai.remember({id:'e1',type:'help'}),false);
  ai.remember({id:'e2',type:'talk'});ai.remember({id:'e3',type:'fight'});ai.remember({id:'e4',type:'rescue'});ai.remember({id:'e5',type:'gift'});
  ai.setRelationship('player',{trust:30,respect:10,dependence:12,stage:'working-trust'});
  const changed=ai.applyRelationshipEvent('player',{id:'rel-dependence-1',type:'shared-danger',actorId:'player'},{dependence:-5});
  const mind=ai.snapshotMind();
  assert.equal(mind.memory.length,4);
  assert.equal(ai.relationshipWith('player').trust,30);
  assert.equal(changed.applied,true);
  assert.equal(ai.relationshipWith('player').dependence,7);
  assert.equal(mind.gameplayAuthority,false);
});

test('default AI party entries receive stable role archetype identity rather than anonymous bots',()=>{
  const config=createAIPartyConfig({humanPlayers:1,aiCount:3,roles:['tank','ranged','healer']});
  const entries=createDefaultAIEntries(config);
  assert.equal(entries.length,3);
  for(const field of ['movement','combat','rewards','save','spawn','network','progression','quest','gameRules']) assert.equal(config.serverAuthority[field],false,field);
  assert.equal(entries[0].identity.qualityProfile,'COMPANION');
  assert.ok(entries[0].identity.values.length>=2);
  assert.ok(entries[0].identity.stableSeed);
  assert.equal(entries[0].personalityStableAcrossDecisions,true);
  assert.equal(entries[0].gameplayAuthority,false);
});

test('AI party entries bind stable authored identity and role traits into squad controllers',()=>{
  const config=createAIPartyConfig({humanPlayers:1,aiCount:3,roles:['tank','ranged','healer']});
  const entries=createDefaultAIEntries(config);
  const squad=new JaewoonAISquad({members:entries});
  const tank=squad.member(entries[0].id);
  const ranged=squad.member(entries[1].id);
  assert.equal(tank.ai.identity.id,entries[0].identity.id);
  assert.equal(tank.ai.identity.stableSeed,entries[0].identity.stableSeed);
  assert.equal(tank.ai.personality.courage,entries[0].identity.traits.courage);
  assert.equal(tank.ai.personality.protectiveness,entries[0].identity.traits.protectiveness);
  assert.equal(ranged.ai.personality.caution,entries[1].identity.traits.caution);
  assert.equal(squad.list()[0].metadata.identity.qualityProfile,'COMPANION');
  assert.equal(tank.ai.snapshotMind().gameplayAuthority,false);
});

test('Vibe gameplay plan automatically requests causal living actor implementation for companion NPC monster scope',()=>{
  const inventory=[
    {id:'npc',path:'world.npc',label:'NPC villager dialogue companion ally'},
    {id:'combat',path:'combat.enemy',label:'monster boss enemy combat'},
    {id:'quest',path:'story.quest',label:'quest relationship memory'}
  ];
  const sketch=deriveGameplaySketch({gameId:'living-ai',genre:'RPG',baseline:{content:{coreLoop:['explore','talk','fight']}},inventory});
  const source=analyzeExistingGameSource('<main data-npc="smith"><script>let hp=10;function talk(){return true}</script></main>');
  const plan=buildVibePatchPlan({gameplaySketch:sketch,sourceAnalysis:source,inventory});
  const ids=plan.tasks.map(row=>row.id);
  assert.equal(sketch.actors.runtimeActorIntelligenceRequired,true);
  assert.equal(sketch.actors.companionIntelligenceRequired,true);
  assert.equal(sketch.actors.monsterIntelligenceRequired,true);
  for(const id of [
    'BIND_RUNTIME_ACTOR_AI_QUALITY_DNA',
    'IMPLEMENT_CAUSAL_ACTOR_RELATIONSHIP_GRAPH',
    'IMPLEMENT_ACTOR_SPECIFIC_PLAYER_MODEL',
    'IMPLEMENT_INDIVIDUAL_ACTOR_ACTIVITY_SIMULATION',
    'IMPLEMENT_COMPANION_SELFHOOD_WORLDVIEW_AND_SELF_ACTUALIZATION',
    'IMPLEMENT_IN_CHARACTER_GAMEPLAY_MENTOR_BARKS',
    'IMPLEMENT_AUTONOMOUS_PERSONAL_EVENT_AND_QUEST_PROPOSALS',
    'BIND_AI_QUEST_PROPOSALS_TO_EXISTING_QUEST_ENGINE',
    'IMPLEMENT_MONSTER_TEMPERAMENT_TACTICS_AND_ECOLOGY',
    'IMPLEMENT_BOSS_RARE_MONSTER_LIVING_ACTIVITY'
  ]) assert.ok(ids.includes(id),id);
  assert.ok(plan.verificationOrder.includes('RUNTIME_ACTOR_AI_CAUSALITY_WHEN_APPLICABLE'));
  assert.ok(plan.verificationOrder.includes('PERSONAL_QUEST_PROPOSAL_ENGINE_AUTHORITY_WHEN_APPLICABLE'));
});

test('save-enabled living actor plans reuse the existing save authority for bounded mind restore',()=>{
  const inventory=[
    {id:'npc',path:'world.npc',label:'NPC companion relationship memory'},
    {id:'quest',path:'story.quest',label:'quest dialogue'}
  ];
  const sketch=deriveGameplaySketch({gameId:'saved-living-ai',genre:'RPG',baseline:{content:{coreLoop:['explore','talk']}},inventory});
  const source=analyzeExistingGameSource(`<main data-npc="smith"><script>
    const SAVE_KEY='player-save';
    const raw=localStorage.getItem('player-save');
    localStorage.setItem('player-save', JSON.stringify({raw}));
    let hp=10;
  </script></main>`);
  const plan=buildVibePatchPlan({gameplaySketch:sketch,sourceAnalysis:source,inventory});
  const ids=plan.tasks.map(row=>row.id);
  assert.ok(ids.includes('PRESERVE_SAVE_CONTRACT'));
  assert.ok(ids.includes('BIND_ACTOR_MIND_TO_EXISTING_SAVE_RESTORE'));
  const task=plan.tasks.find(row=>row.id==='BIND_ACTOR_MIND_TO_EXISTING_SAVE_RESTORE');
  assert.ok(task.dependsOn.includes('IMPLEMENT_CAUSAL_ACTOR_RELATIONSHIP_GRAPH'));
  assert.ok(task.dependsOn.includes('PRESERVE_SAVE_CONTRACT'));
  assert.match(task.reason,/existing save owner/i);
  assert.match(task.reason,/do not create a parallel save authority/i);
  assert.ok(plan.verificationOrder.includes('ACTOR_MIND_SAVE_RESTORE_WHEN_APPLICABLE'));
});

test('save-enabled living actor runtime validation blocks release without mind restore evidence',()=>{
  const inventory=[
    {id:'npc',path:'world.npc',label:'NPC companion relationship memory'}
  ];
  const sketch=deriveGameplaySketch({gameId:'saved-runtime-ai',genre:'RPG',baseline:{content:{coreLoop:['talk']}},inventory});
  const source=analyzeExistingGameSource(`<main data-npc="smith"><script>
    const state=JSON.parse(localStorage.getItem('save')||'{}');
    localStorage.setItem('save',JSON.stringify(state));
    let hp=10;
  </script></main>`);
  const plan=buildRuntimeValidationPlan({gameplaySketch:sketch,sourceAnalysis:source});
  assert.equal(plan.actorMindSaveRestore.required,true);
  assert.match(plan.actorMindSaveRestore.contract,/ACTOR_IDENTITY_MUST_MATCH/);
  assert.match(plan.actorMindSaveRestore.contract,/DUPLICATE_SOURCE_EVENT_MUST_NOT_REAPPLY_AFTER_RELOAD/);

  const evidence=Object.fromEntries(Object.entries(plan).filter(([,value])=>value&&typeof value==='object'&&'required' in value).map(([key,value])=>[key,{pass:value.required!==true}]));
  evidence.actorMindSaveRestore={pass:false};
  const blockers=runtimeValidationBlockers({plan,evidence});
  assert.ok(blockers.includes('ACTOR_MIND_SAVE_RESTORE_FAILED'));

  evidence.actorMindSaveRestore={pass:true};
  const cleared=runtimeValidationBlockers({plan,evidence});
  assert.ok(!cleared.includes('ACTOR_MIND_SAVE_RESTORE_FAILED'));
});

test('AI action validator rejects attempts to own protected gameplay state',()=>{
  assert.equal(validateVibeAIAction({intent:'warn'}).safe,true);
  const bad=validateVibeAIAction({
    intent:'attack',
    damage:999,
    reward:100,
    spawn:{enemy:'boss'},
    networkAuthority:'client',
    gameRules:{wave:99},
    questRegistration:{id:'fake'}
  });
  assert.equal(bad.safe,false);
  for(const field of ['damage','reward','spawn','networkAuthority','gameRules','questRegistration']) assert.ok(bad.touched.includes(field),field);
});


test('causal actor loop carries action event observer interpretation memory emotion relationship and next intent without hidden knowledge',()=>{
  const loop=planVibeCausalActorLoop({
    event:{
      id:'evt-rescue-chain',
      type:'rescue',
      actorId:'player',
      targetId:'mira',
      location:'old-bridge',
      tick:22,
      witnesses:['mira'],
      magnitude:2,
      actionId:'act-rescue-1',
      actionType:'rescue'
    },
    world:{location:'old-bridge',region:'frontier'},
    player:{id:'player'},
    observers:[
      {
        actor:companion,
        relationship:{trust:10,respect:5},
        memory:[],
        emotion:'alert',
        knowledge:{observed:true,confidence:.95,attribution:'direct-cause'},
        allowQuestProposal:true,
        questVerb:'investigate'
      },
      {
        actor:{...companion,id:'hidden-observer'},
        relationship:{trust:10},
        memory:[],
        emotion:'calm',
        knowledge:{observed:false,reported:false}
      }
    ]
  });
  assert.deepEqual([...loop.canonicalSequence],['action','event','observer','interpretation','memory','emotion','relationship','next-judgment','dialogue','action-preference','quest-candidate','engine-validation']);
  assert.equal(loop.sourceEvent.contractComplete,true);
  assert.equal(loop.sourceEvent.actionId,'act-rescue-1');
  assert.equal(loop.sourceEvent.actionType,'rescue');
  assert.equal(loop.sourceAction.id,'act-rescue-1');
  const mira=loop.observers[0],hidden=loop.observers[1];
  assert.equal(mira.perceived,true);
  assert.equal(mira.memoryCandidate.sourceEventId,'evt-rescue-chain');
  assert.equal(mira.memoryCandidate.sourceActionId,'act-rescue-1');
  assert.equal(mira.memoryCandidate.sourceActionType,'rescue');
  assert.equal(mira.emotionAfter,'relief');
  assert.ok(mira.relationshipDelta.trust>0);
  assert.ok(mira.next.actionPreferences.includes('cooperate-with-source'));
  assert.equal(mira.next.questCandidate.candidateOnly,true);
  assert.equal(mira.next.questCandidate.acceptanceCompletionRewardPersistentMutation,'engine-only');
  assert.equal(hidden.perceived,false);
  assert.equal(hidden.memoryCandidate,null);
  assert.deepEqual(hidden.relationshipDelta,{});
  assert.deepEqual([...hidden.next.actionPreferences],[]);
  assert.equal(loop.noHiddenEventEffectWithoutInformationPath,true);
  assert.ok(loop.engineOwns.includes('network-authority'));
});

test('common AI rejects incomplete or unperceived causal events on direct calls',()=>{
  const ai=new JaewoonCommonAI({identity:{id:'mira'}});
  const incomplete=ai.observeCausalEvent({
    sourceEvent:{id:'evt-incomplete',type:'help',actorId:'player'},
    perceived:true,
    informationPath:'direct-witness'
  });
  assert.equal(incomplete.applied,false);
  assert.equal(incomplete.reason,'source_event_contract_incomplete');

  const hidden=ai.observeCausalEvent({
    sourceEvent:{
      id:'evt-hidden-direct',
      type:'help',
      actorId:'player',
      targetIds:['mira'],
      location:'camp',
      tick:72,
      observability:'LOCAL_VISIBLE',
      contractComplete:true,
      witnesses:[]
    },
    perceived:true
  });
  assert.equal(hidden.applied,false);
  assert.equal(hidden.reason,'no_information_path');
  assert.equal(ai.memory.length,0);
});

test('common ai applies one causal source event once and feeds it into the next declared action choice',()=>{
  const loop=planVibeCausalActorLoop({
    event:{
      id:'evt-help-1',
      type:'help',
      actorId:'player',
      targetId:'mira',
      location:'camp',
      tick:30,
      witnesses:['mira']
    },
    observers:[{
      actor:companion,
      relationship:{trust:0},
      memory:[],
      emotion:'calm',
      knowledge:{observed:true,confidence:1,attribution:'direct-cause'},
      allowQuestProposal:true,
      questVerb:'investigate'
    }]
  });
  const ai=new JaewoonCommonAI({
    role:'support',
    identity:{id:'mira'},
    personality:{courage:.2,caution:.1,empathy:.8,sociability:.7,loyalty:.7}
  });
  const packet=loop.observers[0];
  const first=ai.observeCausalEvent(packet);
  assert.equal(first.applied,true);
  assert.equal(ai.memory.length,1);
  assert.ok(ai.relationshipWith('player').trust>0);
  assert.equal(ai.causalContext.sourceEventId,'evt-help-1');
  assert.equal(ai.causalContext.judgmentEvidence.sourceEventId,'evt-help-1');
  assert.ok(ai.causalContext.dialogueActs.length>0);
  assert.equal(ai.causalContext.questCandidate.candidateOnly,true);
  assert.equal(ai.causalContext.questCandidate.acceptanceCompletionRewardPersistentMutation,'engine-only');
  const trustAfter=ai.relationshipWith('player').trust;
  const duplicate=ai.observeCausalEvent(packet);
  assert.equal(duplicate.applied,false);
  assert.equal(duplicate.reason,'duplicate_event');
  assert.equal(ai.relationshipWith('player').trust,trustAfter);
  const next=ai.decide({entityKind:'npc',danger:0,hostile:false,canInteract:true,patrolReady:true});
  assert.equal(next.state,JaewoonCommonAI.State.INTERACT);
  assert.equal(next.reason,'causal_social_followup');
  assert.equal(next.causalContext.sourceEventId,'evt-help-1');
  assert.equal(next.causalContext.sourceEventType,'help');
  assert.equal(next.causalContext.judgmentEvidence.sourceEventId,'evt-help-1');
  assert.equal(next.causalContext.actorPlayerModel.actorId,'player');
  assert.ok(next.causalContext.actorPlayerModel.patterns.helpful>=1);
  assert.equal(next.causalContext.actorPlayerModel.perspectiveSpecific,true);
  assert.ok(next.causalContext.dialogueActs.length>0);
  assert.equal(next.causalContext.questCandidate.candidateOnly,true);
  assert.equal(next.causalContext.persistentMutationRequiresEngineValidation,true);
  assert.equal(next.causalContext.gameplayAuthority,false);
  assert.equal(next.gameplayAuthority,false);
});

test('reconstructed actor state suppresses a source event already present in memory or relationship history',()=>{
  const packet=planVibeCausalActorLoop({
    event:{
      id:'evt-restored-1',
      type:'help',
      actorId:'player',
      targetId:'mira',
      location:'camp',
      tick:61,
      witnesses:['mira']
    },
    observers:[{
      actor:companion,
      relationship:{trust:12},
      memory:[],
      emotion:'calm',
      knowledge:{observed:true,confidence:1,attribution:'direct-cause'}
    }]
  }).observers[0];

  const restoredFromMemory=new JaewoonCommonAI({identity:{id:'mira'}});
  restoredFromMemory.remember({id:'evt-restored-1',sourceEventId:'evt-restored-1',type:'help',actor:'player'});
  restoredFromMemory.setRelationship('player',{trust:12});
  const memoryDuplicate=restoredFromMemory.observeCausalEvent(packet);
  assert.equal(memoryDuplicate.applied,false);
  assert.equal(memoryDuplicate.reason,'duplicate_event');
  assert.equal(restoredFromMemory.relationshipWith('player').trust,12);

  const restoredFromRelationship=new JaewoonCommonAI({identity:{id:'mira'}});
  restoredFromRelationship.setRelationship('player',{trust:12,causeEventIds:['evt-restored-1']});
  const relationDuplicate=restoredFromRelationship.observeCausalEvent(packet);
  assert.equal(relationDuplicate.applied,false);
  assert.equal(relationDuplicate.reason,'duplicate_event');
  assert.equal(restoredFromRelationship.relationshipWith('player').trust,12);

  const directDuplicate=restoredFromMemory.applyRelationshipEvent('player',{id:'evt-restored-1',type:'help',actorId:'player'},{trust:10});
  assert.equal(directDuplicate.applied,false);
  assert.equal(directDuplicate.reason,'duplicate_event');
  assert.equal(restoredFromMemory.relationshipWith('player').trust,12);
});

test('engine-validated actor mind restore preserves memory emotion relationship and source-event idempotency without replaying transient intent',()=>{
  const source=new JaewoonCommonAI({identity:{id:'mira'},memoryLimit:8});
  const packet=planVibeCausalActorLoop({
    event:{
      id:'evt-restore-mind-1',
      type:'rescue',
      actorId:'player',
      targetId:'mira',
      location:'camp',
      tick:70,
      witnesses:['mira']
    },
    observers:[{
      actor:companion,
      relationship:{trust:5,dependence:4},
      memory:[],
      emotion:'alert',
      knowledge:{observed:true,confidence:1,attribution:'direct-cause'}
    }]
  }).observers[0];
  const applied=source.observeCausalEvent(packet);
  assert.equal(applied.applied,true);
  const snapshot=source.snapshotMind();

  const restored=new JaewoonCommonAI({identity:{id:'mira'},memoryLimit:8});
  const denied=restored.restoreMindState(snapshot);
  assert.equal(denied.restored,false);
  assert.equal(denied.reason,'engine_validation_required');
  assert.equal(restored.memory.length,0);

  const wrongActor=new JaewoonCommonAI({identity:{id:'other-actor'},memoryLimit:8});
  const mismatch=wrongActor.restoreMindState(snapshot,{engineValidated:true});
  assert.equal(mismatch.restored,false);
  assert.equal(mismatch.reason,'actor_identity_mismatch');
  assert.equal(wrongActor.memory.length,0);

  const result=restored.restoreMindState(snapshot,{engineValidated:true});
  assert.equal(result.restored,true);
  assert.equal(result.persistentWrite,false);
  assert.equal(result.gameplayAuthority,false);
  assert.equal(result.transientContextRestored,false);
  assert.equal(restored.causalContext,null);
  assert.equal(restored.memory.length,1);
  assert.equal(restored.emotion,'relief');
  assert.ok(restored.relationshipWith('player').trust>5);
  assert.ok(restored.relationshipWith('player').causeEventIds.includes('evt-restore-mind-1'));

  const duplicate=restored.observeCausalEvent(packet);
  assert.equal(duplicate.applied,false);
  assert.equal(duplicate.reason,'duplicate_event');
  assert.equal(restored.memory.length,1);
});

test('browser runtime exposes the same causal actor loop instead of a parallel shadow implementation',()=>{
  assert.match(roleDirectorSource,/planJaewoonVibeCausalActorLoop:planVibeCausalActorLoop/);
});

test('squad routes causal packets only to the named observer and never broadcasts hidden knowledge',()=>{
  const loop=planVibeCausalActorLoop({
    event:{
      id:'evt-squad-1',
      type:'rescue',
      actorId:'player',
      targetId:'mira',
      location:'bridge',
      tick:55,
      witnesses:['mira']
    },
    observers:[
      {
        actor:companion,
        relationship:{trust:0},
        memory:[],
        emotion:'alert',
        knowledge:{observed:true,confidence:1,attribution:'direct-cause'}
      },
      {
        actor:{...companion,id:'hidden-observer'},
        relationship:{trust:0},
        memory:[],
        emotion:'calm',
        knowledge:{observed:false,reported:false}
      }
    ]
  });
  const miraAi=new JaewoonCommonAI({identity:{id:'mira'}});
  const hiddenAi=new JaewoonCommonAI({identity:{id:'hidden-observer'}});
  const squad=new JaewoonAISquad({members:[
    {id:'mira',ai:miraAi,role:'support'},
    {id:'hidden-observer',ai:hiddenAi,role:'ranged'}
  ]});
  const first=squad.observeCausalPackets(loop.observers);
  assert.equal(first.length,2);
  assert.equal(first.find(row=>row.id==='mira').applied,true);
  assert.equal(first.find(row=>row.id==='hidden-observer').applied,false);
  assert.equal(first.find(row=>row.id==='hidden-observer').reason,'no_information_path');
  assert.equal(miraAi.memory.length,1);
  assert.equal(hiddenAi.memory.length,0);
  const trustAfter=miraAi.relationshipWith('player').trust;
  const duplicate=squad.observeCausalPackets(loop.observers);
  assert.equal(duplicate.find(row=>row.id==='mira').reason,'duplicate_event');
  assert.equal(miraAi.relationshipWith('player').trust,trustAfter);
  assert.equal(hiddenAi.memory.length,0);
});

test('squad mind snapshots restore per-member causal memory without creating cross-member knowledge',()=>{
  const sourceMira=new JaewoonCommonAI({identity:{id:'mira'}});
  const sourceHidden=new JaewoonCommonAI({identity:{id:'hidden-observer'}});
  const sourceSquad=new JaewoonAISquad({members:[
    {id:'mira',ai:sourceMira,role:'support'},
    {id:'hidden-observer',ai:sourceHidden,role:'ranged'}
  ]});
  const loop=planVibeCausalActorLoop({
    event:{
      id:'evt-squad-restore-1',
      type:'help',
      actorId:'player',
      targetId:'mira',
      location:'camp',
      tick:71,
      witnesses:['mira']
    },
    observers:[
      {
        actor:companion,
        relationship:{trust:0},
        memory:[],
        emotion:'calm',
        knowledge:{observed:true,confidence:1,attribution:'direct-cause'}
      },
      {
        actor:{...companion,id:'hidden-observer'},
        relationship:{trust:0},
        memory:[],
        emotion:'calm',
        knowledge:{observed:false,reported:false}
      }
    ]
  });
  sourceSquad.observeCausalPackets(loop.observers);
  const minds=sourceSquad.snapshotMindStates();

  const restoredMira=new JaewoonCommonAI({identity:{id:'mira'}});
  const restoredHidden=new JaewoonCommonAI({identity:{id:'hidden-observer'}});
  const restoredSquad=new JaewoonAISquad({members:[
    {id:'mira',ai:restoredMira,role:'support'},
    {id:'hidden-observer',ai:restoredHidden,role:'ranged'}
  ]});
  const denied=restoredSquad.restoreMindStates(minds);
  assert.equal(denied.restored,false);
  const restored=restoredSquad.restoreMindStates(minds,{engineValidated:true});
  assert.equal(restored.restored,true);
  assert.equal(restored.restoredCount,2);
  assert.equal(restored.missingCount,0);
  assert.equal(restoredMira.memory.length,1);
  assert.equal(restoredHidden.memory.length,0);
  assert.ok(restoredMira.relationshipWith('player').trust>0);
  assert.equal(restoredHidden.relationshipWith('player'),null);

  const duplicate=restoredSquad.observeCausalPackets(loop.observers);
  assert.equal(duplicate.find(row=>row.id==='mira').reason,'duplicate_event');
  assert.equal(duplicate.find(row=>row.id==='hidden-observer').reason,'no_information_path');
  assert.equal(restoredMira.memory.length,1);
  assert.equal(restoredHidden.memory.length,0);
});

test('living actor director does not project the same source event twice when memory already contains it',()=>{
  const priorMemory=[{
    id:'evt-director-duplicate-1',
    sourceEventId:'evt-director-duplicate-1',
    type:'rescue',
    actor:'player',
    target:'player',
    observerId:'mira',
    emotionAfter:'relief'
  }];
  const director=planVibeLivingActorDirector({
    actor:companion,
    player:{id:'player'},
    world:{location:'frontier-gate',emotion:'calm'},
    relationship:{trust:30,respect:5},
    memory:priorMemory,
    causalEvent:{
      id:'evt-director-duplicate-1',
      type:'rescue',
      actorId:'player',
      targetId:'mira',
      location:'frontier-gate',
      tick:62,
      witnesses:['mira']
    },
    causalKnowledge:{observed:true,confidence:1,attribution:'direct-cause'},
    allowQuestProposal:true
  });
  assert.equal(director.causal.duplicateSourceEvent,true);
  assert.equal(director.causal.causalMutationSuppressed,true);
  assert.equal(director.causal.memoryCandidate,null);
  assert.deepEqual(director.causal.relationshipDelta,{});
  assert.deepEqual([...director.causal.next.actionPreferences],[]);
  assert.equal(director.causal.next.questCandidate,null);
  assert.equal(director.projectedState.memory.length,1);
  assert.equal(director.projectedState.relationshipToPlayer.trust,30);
  assert.equal(director.projectedState.persisted,false);
});

test('living actor director projects causal memory emotion relationship and player model into the next context without persisting it',()=>{
  const director=planVibeLivingActorDirector({
    actor:companion,
    player:{id:'player'},
    world:{location:'frontier-gate',emotion:'alert'},
    relationship:{trust:20,respect:5},
    memory:[],
    causalEvent:{
      id:'evt-rescue-director-1',
      type:'rescue',
      actorId:'player',
      targetId:'mira',
      actionId:'act-rescue-director-1',
      actionType:'rescue',
      location:'frontier-gate',
      tick:41,
      witnesses:['mira']
    },
    causalKnowledge:{observed:true,confidence:.9,attribution:'direct-cause'}
  });
  assert.equal(director.version,3);
  assert.equal(director.causal.sourceEvent.id,'evt-rescue-director-1');
  assert.equal(director.causal.perceived,true);
  assert.ok(director.causal.next.actionPreferences.length>0);
  assert.equal(director.projectedState.sourceEventId,'evt-rescue-director-1');
  assert.equal(director.projectedState.memory.length,1);
  assert.equal(director.projectedState.memory[0].sourceActionId,'act-rescue-director-1');
  assert.equal(director.projectedState.emotion,'relief');
  assert.ok(director.projectedState.relationshipToPlayer.trust>20);
  assert.ok(director.relationship.state.trust>20);
  assert.ok(director.social.relationship.trust>20);
  assert.ok(director.playerModel.patterns.helpsOthers>=1);
  assert.equal(director.projectedState.persistentMutationRequiresEngineValidation,true);
  assert.equal(director.projectedState.persisted,false);
  assert.equal(director.projectedState.gameplayAuthority,false);
  assert.equal(director.policy.projectedCausalStateIsNotPersistence,true);
  assert.equal(director.policy.engineAuthoritative,true);
});
