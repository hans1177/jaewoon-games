// 파일명: assets/vibe-ai-role-director.js
// 역할: 게임 런타임 AI 경계를 지키면서 동료/NPC/적을 주인공 종속물이 아닌 독립적 기억·관계·목표·성장·대화·행동을 가진 행위자로 다룸.
// 절대 규칙: AI_GAME_RUNTIME_ONLY. AI는 의도/대화/해석/후보만 제안. 엔진이 수치/전투/보상/저장/진행/충돌을 결정한다.
const RUNTIME_PURPOSES=new Set(['dialogue','companion','npc','enemy','boss','strategy','party','coop','merchant','quest','director']);
const FORBIDDEN_OUTSIDE_GAME=new Set(['code-generation','code-edit','code-review','diagnosis','source-repair','asset-rewrite','build-plan','intent-classification','quality-priority','asset-tagging','style-description','motion-description','qa-summary','design-generation','visual-analysis','animation-analysis']);
const LIVING_CONTEXT=Object.freeze(['identity','role','personality','current-goal','needs','fear','confidence','relationships','recent-events','local-world-state','visible-actors','known-threats','known-resources','location','time','faction','equipment','recent-player-behavior']);
const QUEST_CONTEXT=Object.freeze(['game-genre','world','region','faction','npc-identity','npc-memory','player-history','player-capability','recent-events','unresolved-consequences','story-state','quest-history']);
const SOCIAL_CONTEXT=Object.freeze(['speaker-identity','listener-identity','relationship','trust','familiarity','mood','stress','recent-shared-events','private-memory','current-activity','nearby-actors','location','danger','conversation-history','player-tone']);
const SELF_CONTEXT=Object.freeze(['self-model','personal-history','private-goals','values','beliefs','doubts','relationships','skills-known-by-engine','failures','successes','unresolved-personal-thread','world-view','future-intention']);
const freezeList=x=>Object.freeze(Array.isArray(x)?x:[]);
const clampAxis=(value,min=-100,max=100)=>Math.max(min,Math.min(max,Math.round(Number(value)||0)));
const cleanText=value=>String(value??'').trim();
const stableList=value=>Object.freeze([...(Array.isArray(value)?value:[])].map(cleanText).filter(Boolean));
export function classifyVibeAIUse(purpose=''){const p=String(purpose).trim().toLowerCase();if(RUNTIME_PURPOSES.has(p))return Object.freeze({purpose:p,scope:'game-runtime',serverAI:true,authoritative:false,allowed:true});return Object.freeze({purpose:p,scope:FORBIDDEN_OUTSIDE_GAME.has(p)?'development-forbidden':'unknown',serverAI:false,authoritative:false,allowed:false,absoluteRule:'AI_GAME_RUNTIME_ONLY'})}
export function createVibeRuntimeAIContract({purpose='npc',contextKeys=[]}={}){const c=classifyVibeAIUse(purpose);if(!c.allowed)return Object.freeze({...c,blocked:true});return Object.freeze({...c,blocked:false,input:freezeList(contextKeys),maySuggest:Object.freeze(['dialogue','intent','emotion','social-reaction','attention-target','activity-preference','cooperation-preference','quest-reaction','quest-candidate','destination-preference','tactical-preference','target-preference','self-reflection','personal-goal-priority']),mustNotDecide:Object.freeze(['damage','hp','reward','drop','inventory-write','save-write','progression','combat-result','spawn-count','collision-result','cooldown-result','quest-completion','quest-reward','stat-growth']),engineAuthoritative:true,fallback:'deterministic-game-logic'})}
export function createVibeLivingActorContract(actor={}){const purpose=/enemy|mob|boss|적|몹|보스/.test(String(actor.role||''))?(/boss|보스/.test(String(actor.role))?'boss':'enemy'):'npc';return Object.freeze({base:createVibeRuntimeAIContract({purpose,contextKeys:LIVING_CONTEXT}),identity:Object.freeze({id:actor.id||actor.name||'actor',role:actor.role||purpose,personality:Object.freeze(actor.personality||{}),values:freezeList(actor.values),habits:freezeList(actor.habits),faction:actor.faction||'',occupation:actor.occupation||'',home:actor.home||''}),mind:Object.freeze({goals:freezeList(actor.goals),needs:freezeList(actor.needs),knowledgeScope:'only-observed-or-provided-state',memoryScope:'bounded-personal-runtime-memory',uncertaintyRequired:true,mayChangeMind:true}),variation:Object.freeze({sameStimulusMayProduceDifferentSuggestion:true,avoid:Object.freeze(['single-global-personality','identical-reaction-table','perfect-information','omniscient-coordination','constant-randomness'])}),engineAuthority:true})}
export function createVibeLivingDecisionFrame({actor={},worldState={},perception={},memory=[]}={}){return Object.freeze({actor:createVibeLivingActorContract(actor).identity,perception:Object.freeze(perception),memory:Object.freeze(memory.slice(-12)),world:Object.freeze({location:worldState.location||'',time:worldState.time||'',weather:worldState.weather||'',localEvents:freezeList(worldState.localEvents)}),decisionQuestions:Object.freeze(['what-do-i-want-now','what-do-i-know-not-know','what-changed','who-do-i-trust-or-fear','what-would-this-individual-do']),forbiddenOutput:Object.freeze(['damage-value','hp-change','reward-write','save-write','forced-combat-result'])})}
export function createVibeSocialMemoryPolicy({maxEvents=20}={}){return Object.freeze({maxEvents:Math.max(5,Math.min(40,maxEvents)),remember:Object.freeze(['help','harm','trade','promise','betrayal','rescue','shared-danger','private-joke','embarrassment','argument','gift','loss','victory','repeated-habit','witnessed-major-event']),layers:Object.freeze(['recent-episodic','relationship-summary','long-term-important']),compressOldMemories:true,forgetMinorEvents:true,noGlobalTelepathy:true,relationshipIsPerspectiveSpecific:true,persistentWrite:'engine-controlled-only'})}
export function createVibeEnemyTacticalMind(enemy={}){return Object.freeze({identity:createVibeLivingActorContract({...enemy,role:enemy.role||'enemy'}),consider:Object.freeze(['distance','cover','ally-position','recent-damage-source','escape-route','objective','terrain','target-behavior','own-role','observed-player-habit']),maySuggest:Object.freeze(['pressure','wait','flank','retreat','guard','investigate','reposition','support-ally','change-attention','bait']),mustNot:Object.freeze(['alter-stats','ignore-collision','know-hidden-player-state','guarantee-hit','change-cooldown'])})}
export function createVibeNPCDailyMind(npc={}){return Object.freeze({identity:createVibeLivingActorContract({...npc,role:npc.role||'npc'}),activitySources:Object.freeze(['occupation','time','location','need','relationship','local-event','weather','recent-player-contact','private-goal']),activities:Object.freeze(['work','travel','rest','eat','observe','talk','trade','visit','avoid-danger','investigate','help','return-home','pursue-personal-goal']),rule:'context-driven-not-fixed-loop-only'})}
export function createVibeCrowdDiversityPolicy({population=10}={}){return Object.freeze({population,personalityAxes:Object.freeze(['caution','curiosity','sociability','loyalty','greed','aggression','patience']),behaviorAxes:Object.freeze(['route-preference','attention-span','social-distance','risk-tolerance','routine-strength']),limits:Object.freeze({noPerFrameAI:true,eventDrivenDecisions:true,nearPlayerPriority:true,backgroundActorsUseDeterministicSimulation:true})})}
export function createVibeCompanionPersonalityDNA(c={}){
  const traits=Object.freeze({
    courage:clampAxis(c.traits?.courage??c.courage),
    caution:clampAxis(c.traits?.caution??c.caution),
    aggression:clampAxis(c.traits?.aggression??c.aggression),
    empathy:clampAxis(c.traits?.empathy??c.empathy),
    curiosity:clampAxis(c.traits?.curiosity??c.curiosity),
    sociability:clampAxis(c.traits?.sociability??c.sociability),
    patience:clampAxis(c.traits?.patience??c.patience),
    loyalty:clampAxis(c.traits?.loyalty??c.loyalty),
    pride:clampAxis(c.traits?.pride??c.pride),
    discipline:clampAxis(c.traits?.discipline??c.discipline),
    independence:clampAxis(c.traits?.independence??c.independence),
    protectiveness:clampAxis(c.traits?.protectiveness??c.protectiveness),
    vengefulness:clampAxis(c.traits?.vengefulness??c.vengefulness)
  });
  return Object.freeze({
    id:c.id||c.name||'companion',
    core:Object.freeze({
      temperament:c.temperament||'balanced',
      values:stableList(c.values),
      insecurities:stableList(c.insecurities),
      likes:stableList(c.likes),
      dislikes:stableList(c.dislikes),
      boundaries:stableList(c.boundaries),
      loyalties:stableList(c.loyalties),
      taboos:stableList(c.taboos)
    }),
    traits,
    worldview:Object.freeze({
      worldBelief:cleanText(c.worldview?.worldBelief||c.worldView),
      peopleBelief:cleanText(c.worldview?.peopleBelief),
      fairnessBelief:cleanText(c.worldview?.fairnessBelief),
      dangerBelief:cleanText(c.worldview?.dangerBelief),
      sacrificeBelief:cleanText(c.worldview?.sacrificeBelief),
      successBelief:cleanText(c.worldview?.successBelief)
    }),
    selfhood:Object.freeze({
      selfImage:cleanText(c.selfImage),
      fearedSelf:cleanText(c.fearedSelf),
      desiredSelf:cleanText(c.desiredSelf||c.futureImage),
      refusedSelf:cleanText(c.refusedSelf),
      longTermGoal:cleanText(c.longTermGoal||c.futureGoal),
      personalDuty:cleanText(c.personalDuty),
      unresolvedThread:cleanText(c.unresolvedThread),
      contradictions:stableList(c.contradictions)
    }),
    speech:Object.freeze({
      formality:c.formality||'adaptive',
      verbosity:c.verbosity||'medium',
      directness:c.directness||'medium',
      humor:c.humor||'situational',
      favoriteTopics:stableList(c.favoriteTopics),
      avoidedTopics:stableList(c.avoidedTopics),
      verbalHabits:stableList(c.verbalHabits),
      silencePreference:c.silencePreference||'contextual',
      catchphraseBudget:Math.max(0,Math.min(3,Number(c.catchphraseBudget??1))),
      relationshipSpeechShift:true
    }),
    authoredIdentityRequired:true,
    traitsAreStableBiasNotTemporaryEmotion:true,
    noGameplayAuthority:true
  });
}
export function createVibeRelationshipState({trust=0,familiarity=0,respect=0,tension=0,affection=0,fear=0,debt=0,rivalry=0,protectiveness=0,dependence=0,boundaryComfort=0,stage='stranger'}={}){
  return Object.freeze({
    trust:clampAxis(trust),familiarity:clampAxis(familiarity),respect:clampAxis(respect),tension:clampAxis(tension),affection:clampAxis(affection),
    fear:clampAxis(fear),debt:clampAxis(debt),rivalry:clampAxis(rivalry),protectiveness:clampAxis(protectiveness),dependence:clampAxis(dependence),boundaryComfort:clampAxis(boundaryComfort),
    stage:cleanText(stage||'stranger'),
    directional:true,
    causeEventRequired:true,
    relationshipDoesNotModifyProtectedStats:true,
    rule:'relationship-dimensions-evolve-independently'
  });
}
export function createVibeActorQualityDNA({role='npc',named=true}={}){
  const r=cleanText(role).toLowerCase();
  const profile=/boss/.test(r)?'BOSS':/elite/.test(r)?'ELITE_MONSTER':/enemy|monster|mob/.test(r)?'FOREGROUND_MONSTER':/companion|ally/.test(r)?'COMPANION':/hero/.test(r)?'HERO_NPC':/npc|merchant/.test(r)?'GAMEPLAY_NPC':'BACKGROUND_ACTOR';
  const required={
    BACKGROUND_ACTOR:['IDENTITY','ROUTINE','ATTENTION','PERSONAL_SPACE','BASIC_EMOTION','CONTEXT_REACTION'],
    GAMEPLAY_NPC:['IDENTITY','PERSONALITY','GOALS','ROUTINE','ATTENTION','RELATIONSHIP','CONTEXT_DIALOGUE','KNOWLEDGE_BOUNDARY','EMBODIED_REACTION'],
    COMPANION:['IDENTITY','PERSONALITY','VALUES','WORLDVIEW','SELF_IMAGE','LIFE_PROJECT','RELATIONSHIP','MEMORY','CONTEXT_DIALOGUE','COMBAT_STYLE','COOPERATION','INITIATIVE','PLAYER_STYLE_COMPLEMENT','PERSONAL_SPACE','EMOTION','EMBODIED_REACTION'],
    FOREGROUND_MONSTER:['SPECIES_IDENTITY','TEMPERAMENT','TERRITORY','THREAT_ASSESSMENT','TACTICAL_STYLE','FLEE_OR_PRESSURE_RULE','GROUP_BEHAVIOR','ECOLOGY','ATTENTION','MOTION_IDENTITY'],
    ELITE_MONSTER:['SPECIES_IDENTITY','INDIVIDUAL_VARIANT','TACTICAL_STYLE','TARGET_PREFERENCE','GROUP_ROLE','PRESSURE_RELEASE_PATTERN','REACTION_TO_ALLY_LOSS','RETREAT_OR_COMMIT_PERSONALITY','MOTION_IDENTITY'],
    BOSS:['IDENTITY','PERSONALITY','PHASE_ATTITUDE','TACTICAL_STYLE','TARGET_AND_SPACE_REASONING','DIALOGUE_VOICE','REACTION_MEMORY','PRESENTATION_INTENT','ALLOWED_PATTERN_VARIATION','MOTION_IDENTITY'],
    HERO_NPC:['IDENTITY','VALUES','DESIRE','NEED','FEAR','PRIVATE_GOAL','WORLDVIEW','SELF_IMAGE','RELATIONSHIP','LONG_TERM_MEMORY','VOICE','SUBTEXT','EMOTION','INITIATIVE','PERSONAL_ARC','EMBODIED_REACTION']
  }[profile]||[];
  return Object.freeze({version:1,profile,namedActor:Boolean(named),required:Object.freeze(required),qualityIsNotAStatScore:true,gameplayAuthority:false});
}

export function createVibeCompanionSelfhoodDNA(companion={}){
  const personality=createVibeCompanionPersonalityDNA(companion);
  return Object.freeze({
    id:personality.id,
    identity:Object.freeze({
      background:cleanText(companion.background||companion.origin),
      belonging:stableList(companion.belonging||companion.affiliations),
      responsibilities:stableList(companion.responsibilities),
      reputationBelief:cleanText(companion.reputationBelief)
    }),
    worldview:personality.worldview,
    values:personality.core.values,
    selfImage:Object.freeze({
      current:personality.selfhood.selfImage,
      feared:personality.selfhood.fearedSelf,
      desired:personality.selfhood.desiredSelf,
      refused:personality.selfhood.refusedSelf
    }),
    lifeProject:Object.freeze({
      longTermGoal:personality.selfhood.longTermGoal,
      personalDuty:personality.selfhood.personalDuty,
      unresolvedThread:personality.selfhood.unresolvedThread,
      futureImage:cleanText(companion.futureImage)
    }),
    contradictions:personality.selfhood.contradictions,
    agency:Object.freeze(['start-conversation','warn','disagree','suggest-alternative','pursue-personal-duty-when-engine-allows','choose-silence','repair-relationship','set-boundary']),
    rule:'player-is-important-but-not-the-center-of-this-persons-entire-life'
  });
}

export function createVibeCompanionMotivationFrame({companion={},relationship={},world={},memory=[],emotion='calm'}={}){
  const selfhood=createVibeCompanionSelfhoodDNA(companion),rel=createVibeRelationshipState(relationship);
  return Object.freeze({
    selfhood,
    emotion:cleanText(emotion||'calm'),
    currentWorld:Object.freeze(world),
    recentMemory:Object.freeze(memory.slice(-8)),
    hierarchy:Object.freeze(['survival-and-immediate-need','current-duty','relationship-need','personal-goal','identity-protection','self-actualization']),
    selfActualization:Object.freeze(stableList(companion.selfActualization||[selfhood.lifeProject.longTermGoal,selfhood.selfImage.desired]).filter(Boolean)),
    tensions:Object.freeze(stableList(companion.motivationConflicts||selfhood.contradictions)),
    relationship:rel,
    selectionRule:'motives-bias-intent; engine-rules-still-own-results'
  });
}

export function createVibeCompanionInnerState({companion={},situation={},relationship={},memory=[],emotion='calm'}={}){
  const motivation=createVibeCompanionMotivationFrame({companion,relationship,world:situation,memory,emotion});
  return Object.freeze({
    currentConcern:cleanText(situation.currentConcern||companion.currentConcern),
    currentHope:cleanText(situation.currentHope||companion.currentHope),
    currentFear:cleanText(situation.currentFear||companion.currentFear),
    unsaidFeeling:cleanText(situation.unsaidFeeling||companion.unsaidFeeling),
    recentInterpretation:cleanText(situation.recentInterpretation),
    viewOfPlayer:cleanText(situation.viewOfPlayer),
    viewOfSelf:cleanText(situation.viewOfSelf||motivation.selfhood.selfImage.current),
    motivation,
    privacy:Object.freeze({mayRemainUnspoken:true,playerDoesNotAutomaticallyKnow:true,longFreeformReasoningNotRequired:true,structuredStatePreferred:true}),
    use:Object.freeze(['intent','subtext','silence','attention','gesture','line-selection'])
  });
}

export function createVibeCompanionRelationshipFrame({companion={},other={},relationship={},events=[]}={}){
  const state=createVibeRelationshipState(relationship);
  const causes=Object.freeze(events.slice(-16).filter(event=>event&&event.id&&event.type).map(event=>Object.freeze({id:event.id,type:event.type,actor:event.actor||'',target:event.target||'',weight:Number(event.weight||1)})));
  return Object.freeze({
    actor:companion.id||companion.name||'companion',
    other:other.id||other.name||'player',
    state,
    causes,
    perspectiveSpecific:true,
    repeatedSmallEventsMayAccumulate:true,
    majorEventsMayCauseLargerButBoundedShift:true,
    oneMinorEventShouldNotRewriteBond:true,
    affects:Object.freeze(['speech-style','initiative','personal-space','cooperation-preference','memory-salience','subtext']),
    protected:Object.freeze(['damage','hp','raw-combat-stat','reward','progression'])
  });
}

export function createVibeCompanionDialogueIntent({companion={},relationship={},innerState={},recentLines=[],activity='',attentionTarget=''}={}){
  const personality=createVibeCompanionPersonalityDNA(companion),rel=createVibeRelationshipState(relationship);
  return Object.freeze({
    speaker:personality.id,
    relationship:rel,
    inputs:Object.freeze({
      activity:cleanText(activity),attentionTarget:cleanText(attentionTarget),emotion:cleanText(innerState.emotion||''),currentConcern:cleanText(innerState.currentConcern||''),unsaidFeeling:cleanText(innerState.unsaidFeeling||'')
    }),
    allowedSpeechActs:Object.freeze(['inform','ask','warn','tease','reassure','disagree','apologize','thank','confide','deflect','challenge','negotiate','remember','notice','change-topic','end-conversation','silence']),
    repetition:Object.freeze({recentLineCount:recentLines.slice(-12).length,exactRepeatForbidden:true,topicCooldownRequired:true,catchphraseBudget:personality.speech.catchphraseBudget}),
    speech:personality.speech,
    silenceValid:true,
    unknownInformationRevealForbidden:true,
    questRewardOrProgressCommitForbidden:true
  });
}

export function createVibeCompanionPersonalArc({companion={},history=[],unresolved=[]}={}){
  const selfhood=createVibeCompanionSelfhoodDNA(companion);
  return Object.freeze({
    selfhood,
    history:Object.freeze(history.slice(-20)),
    unresolved:Object.freeze(unresolved.slice(-8)),
    loop:Object.freeze(['experience','interpret','feel','adjust-priority-or-belief-if-justified','choose-next-personal-intention','engine-validates-action','reflect']),
    axes:Object.freeze(['self-confidence','belief','responsibility','belonging','autonomy','ambition','forgiveness','resentment','fear','trust']),
    growthMustFollowExperience:true,
    levelNumberAloneCannotCausePersonalityGrowth:true,
    mayRegressAfterFailure:true,
    contradictionsMayPersistDuringChange:true,
    unresolvedPersonalThreadRequired:true
  });
}

export function createVibeMonsterEcologyMind(monster={}){
  return Object.freeze({
    actor:createVibeLivingActorContract({...monster,role:monster.role||'enemy'}),
    species:cleanText(monster.species||monster.creatureFamily||'unknown'),
    temperament:cleanText(monster.temperament||'territorial'),
    territory:cleanText(monster.territory),
    groupRole:cleanText(monster.groupRole||'member'),
    ecology:Object.freeze(['rest','patrol','forage','investigate','avoid-danger','territory-response','follow-group','protect-group','return-home']),
    tactical:Object.freeze(['pressure','wait','flank','retreat','guard','reposition','bait','support-ally']),
    memory:Object.freeze(['recent-damage-source','intruder-location','ally-loss','failed-approach','safe-route']),
    rule:'species-biology-may-be-shared; individual-temperament-and-history-may-change-preference'
  });
}


export function createVibeSpeechRegister({actor={},relationship={},emotion='calm',gameLanguagePolicy={}}={}){
  const personality=createVibeCompanionPersonalityDNA(actor);
  const rel=createVibeRelationshipState(relationship);
  const allowed=stableList(gameLanguagePolicy.allowedProfanityLevels||['NONE','MILD']);
  const requested=String(actor.profanityLevel||actor.speech?.profanityLevel||'NONE').toUpperCase();
  const profanityLevel=allowed.includes(requested)?requested:(allowed.includes('MILD')?'MILD':'NONE');
  return Object.freeze({
    formality:personality.speech.formality,
    directness:personality.speech.directness,
    verbosity:personality.speech.verbosity,
    humor:personality.speech.humor,
    slangLevel:String(actor.slangLevel||actor.speech?.slangLevel||'LOW').toUpperCase(),
    profanityLevel,
    emotion:cleanText(emotion||'calm'),
    relationshipStage:rel.stage,
    relationshipSpeechShift:true,
    allowedContexts:Object.freeze(['pain','shock','anger','fear','frustration','rough-humor','trusted-intimacy']),
    forbid:Object.freeze(['random-profanity-filler','same-register-for-all-actors','protected-class-slur','default-harassment']),
    localizationMaySoften:true,
    strongProfanityRequiresExplicitGameLanguagePolicy:true
  });
}

export function createVibeGameplayMentorContract({actor={},player={},world={},recentHints=[],gameLanguagePolicy={}}={}){
  const personality=createVibeCompanionPersonalityDNA(actor);
  const register=createVibeSpeechRegister({actor,relationship:player.relationship||{},emotion:world.emotion||'calm',gameLanguagePolicy});
  const observed=Object.freeze({
    lowHealth:Boolean(player.lowHealth),
    repeatedFailure:Number(player.repeatedFailure||0),
    resourceShortage:stableList(player.resourceShortage),
    equipmentIssues:stableList(player.equipmentIssues),
    stalledObjective:cleanText(player.stalledObjective),
    idleOrLost:Boolean(player.idleOrLost),
    currentObjective:cleanText(player.currentObjective),
    visibleDanger:stableList(world.visibleDanger),
    unlockedSystem:cleanText(world.unlockedSystem),
    discoveredInteractable:cleanText(world.discoveredInteractable),
    observedPlayStyle:cleanText(player.observedPlayStyle)
  });
  const triggers=[];
  if(observed.lowHealth)triggers.push('LOW_HEALTH_OR_DANGER');
  if(observed.repeatedFailure>=2)triggers.push('REPEATED_FAILURE');
  if(observed.resourceShortage.length)triggers.push('RESOURCE_SHORTAGE');
  if(observed.equipmentIssues.length)triggers.push('INVENTORY_OR_EQUIPMENT_ISSUE');
  if(observed.stalledObjective||observed.idleOrLost)triggers.push('QUEST_STALLED_OR_LOST');
  if(observed.visibleDanger.length)triggers.push('BOSS_OR_ELITE_WARNING');
  if(observed.unlockedSystem)triggers.push('NEW_SYSTEM_UNLOCK');
  if(observed.discoveredInteractable)triggers.push('DISCOVERED_INTERACTABLE');
  return Object.freeze({
    actor:personality.id,
    observed,
    triggers:Object.freeze(triggers),
    adviceStyle:Object.freeze({
      cautious:personality.traits.caution>25,
      bold:personality.traits.courage>35||personality.traits.aggression>35,
      analytical:personality.traits.discipline>35||personality.traits.curiosity>35,
      protective:personality.traits.protectiveness>35,
      quiet:personality.traits.sociability<-20
    }),
    speechRegister:register,
    outputs:Object.freeze(['EVENT_BARK','PROGRESS_HINT','PREPARATION_ADVICE','TACTICAL_SUGGESTION','RESOURCE_HINT','OPTIONAL_DEEPER_EXPLANATION','CELEBRATION','CAUTION','SILENCE']),
    progression:Object.freeze({
      firstHint:'SHORT_IN_CHARACTER_OBSERVATION',
      repeatedFailure:'MORE_EXPLICIT_BUT_STILL_IN_CHARACTER',
      deeperHint:'ONLY_WHEN_PLAYER_REQUESTS_OR_REPEATEDLY_STALLS'
    }),
    repetition:Object.freeze({
      recentHintSignatures:Object.freeze(recentHints.slice(-12).map(row=>cleanText(row.signature||row.id||row.text))),
      exactRepeatForbidden:true,
      cooldownRequired:true,
      sameTriggerMustEscalateInsteadOfRepeat:true
    }),
    knowledge:Object.freeze({
      sources:Object.freeze(['OBSERVED_PLAYER_ACTIONS','DECLARED_GAME_STATE','VISIBLE_WORLD_STATE','KNOWN_TUTORIAL_FACTS','ACTOR_PERSONAL_KNOWLEDGE']),
      hiddenMechanicCheatingForbidden:true,
      undiscoveredStorySecretRevealForbidden:true,
      unknownInformationMustRemainUnknown:true
    }),
    authority:Object.freeze({
      advisoryOnly:true,
      playerCanIgnore:true,
      cannotChangeGameRules:true,
      cannotGuaranteeOutcome:true
    })
  });
}

export function createVibeAutonomousQuestCandidate({actor={},world={},relationship={},memory=[],unresolved=[],questHistory=[],candidate={}}={}){
  const selfhood=createVibeCompanionSelfhoodDNA(actor);
  const rel=createVibeRelationshipState(relationship);
  const recentMemory=memory.slice(-16);
  const unresolvedThreads=stableList(unresolved.length?unresolved:[selfhood.lifeProject.unresolvedThread]).filter(Boolean);
  const sourceEventId=cleanText(candidate.sourceEventId||recentMemory.at(-1)?.id);
  const sourceCause=cleanText(candidate.cause||candidate.sourceCause||(
    unresolvedThreads[0]?'UNRESOLVED_PERSONAL_THREAD':
    selfhood.lifeProject.longTermGoal?'PERSONAL_LONG_TERM_GOAL':
    sourceEventId?'RECENT_SOURCE_EVENT':''
  ));
  const whyNow=cleanText(candidate.whyNow||(
    sourceEventId?'A_RECENT_EVENT_CHANGED_THE_ACTORS_PRIORITY':
    unresolvedThreads.length?'CURRENT_WORLD_STATE_MAKES_AN_UNRESOLVED_THREAD_ACTIONABLE':''
  ));
  const id=cleanText(candidate.id||[
    actor.id||actor.name||'actor',
    sourceCause||'personal',
    sourceEventId||'current'
  ].join('-').toLowerCase().replace(/[^a-z0-9가-힣_-]+/g,'-').slice(0,96));
  const normalized=Object.freeze({
    id,
    proposerId:cleanText(actor.id||actor.name||'actor'),
    class:String(candidate.class||'PERSONAL_SIDE').toUpperCase(),
    cause:sourceCause,
    sourceEventId:sourceEventId||null,
    actorGoal:cleanText(candidate.actorGoal||selfhood.lifeProject.longTermGoal||selfhood.lifeProject.personalDuty),
    whyNow,
    proposalLineIntent:cleanText(candidate.proposalLineIntent||'ask-for-help-in-character'),
    primaryVerb:cleanText(candidate.primaryVerb||'investigate'),
    structure:cleanText(candidate.structure||'personal-cause-to-world-action'),
    actorType:cleanText(candidate.actorType||actor.role||'companion'),
    locationType:cleanText(candidate.locationType||world.locationType||world.location),
    stake:cleanText(candidate.stake||selfhood.lifeProject.unresolvedThread||'personal-relationship-or-duty'),
    resolution:cleanText(candidate.resolution||'engine-resolved-outcome'),
    consequence:cleanText(candidate.consequence||'actor-memory-relationship-or-world-presentation'),
    objectives:Object.freeze((candidate.objectives||[]).map((row,index)=>Object.freeze({
      id:cleanText(row.id||('objective-'+(index+1))),
      type:cleanText(row.type||'contextual'),
      target:Math.max(1,Number(row.target||1)),
      meta:Object.freeze({...row.meta})
    }))),
    requirements:Object.freeze({...candidate.requirements}),
    rewardRequest:Object.freeze({
      requested:Boolean(candidate.rewardRequest),
      engineMustResolve:true,
      aiCannotSetAuthoritativeReward:true
    }),
    relationshipContext:rel,
    memoryEvidence:Object.freeze(recentMemory.filter(row=>row?.id).map(row=>Object.freeze({id:row.id,type:row.type||'',sourceEvent:row.sourceEvent||row.id}))),
    unresolvedThreads:Object.freeze(unresolvedThreads),
    playerAcceptanceRequired:candidate.playerAcceptanceRequired!==false,
    engineRegistrationRequired:true,
    enginePrerequisiteValidationRequired:true,
    engineRewardAuthority:true,
    generatedQuestIsCandidateOnly:true,
    gameplayAuthority:false
  });
  const diversity=createVibeQuestDiversityGate({candidate:normalized,history:questHistory});
  const issues=[];
  if(!normalized.id)issues.push('QUEST_CANDIDATE_ID_REQUIRED');
  if(!normalized.cause)issues.push('QUEST_SOURCE_CAUSE_REQUIRED');
  if(!normalized.actorGoal)issues.push('ACTOR_GOAL_REQUIRED');
  if(!normalized.whyNow)issues.push('WHY_NOW_REQUIRED');
  if(!normalized.objectives.length)issues.push('OBJECTIVE_STRUCTURE_REQUIRED');
  if(!sourceEventId&&!unresolvedThreads.length&&!selfhood.lifeProject.longTermGoal)issues.push('PERSONAL_OR_EVENT_CAUSE_REQUIRED');
  if(!diversity.pass)issues.push(...diversity.issues);
  return Object.freeze({
    candidate:normalized,
    status:issues.length?'QUEST_CANDIDATE_REPAIR_REQUIRED':'READY_FOR_ENGINE_VALIDATION',
    issues:Object.freeze(issues),
    diversity,
    nextAction:issues.length?'REPAIR_CAUSAL_PERSONAL_QUEST_PROPOSAL':'ENGINE_VALIDATE_AND_OPTIONALLY_REGISTER'
  });
}

export function createVibeAutonomousEventCandidate({actor={},world={},relationship={},memory=[],event={}}={}){
  const selfhood=createVibeCompanionSelfhoodDNA(actor);
  const rel=createVibeRelationshipState(relationship);
  const sourceEventId=cleanText(event.sourceEventId||memory.at(-1)?.id);
  const type=String(event.type||'OPTIONAL_CONVERSATION').toUpperCase();
  return Object.freeze({
    id:cleanText(event.id||((actor.id||actor.name||'actor')+'-'+type.toLowerCase()+'-'+(sourceEventId||'current'))),
    proposerId:cleanText(actor.id||actor.name||'actor'),
    type,
    cause:cleanText(event.cause||selfhood.lifeProject.unresolvedThread||selfhood.lifeProject.longTermGoal||sourceEventId),
    whyNow:cleanText(event.whyNow||sourceEventId&&'recent-source-event'||'personal-goal-pressure'),
    desiredOutcome:cleanText(event.desiredOutcome),
    relationshipContext:rel,
    worldContext:Object.freeze(world),
    sourceEventId:sourceEventId||null,
    playerCanDecline:event.playerCanDecline!==false,
    engineValidationRequired:true,
    gameplayAuthority:false
  });
}

export function planVibeAutonomousActorInitiative({actor={},player={},world={},relationship={},memory=[],history=[],unresolved=[],questHistory=[],gameLanguagePolicy={}}={}){
  const selfhood=createVibeCompanionSelfhoodDNA(actor);
  const innerState=createVibeCompanionInnerState({companion:actor,situation:world,relationship,memory,emotion:world.emotion||'calm'});
  return Object.freeze({
    version:1,
    actorQualityDNA:createVibeActorQualityDNA({role:actor.role||'companion',named:true}),
    selfhood,
    innerState,
    mentor:createVibeGameplayMentorContract({actor,player,world,recentHints:history,gameLanguagePolicy}),
    speechRegister:createVibeSpeechRegister({actor,relationship,emotion:world.emotion||'calm',gameLanguagePolicy}),
    eventFactory:Object.freeze({
      allowedTypes:Object.freeze(['OPTIONAL_CONVERSATION','REQUEST_FOR_HELP','PERSONAL_ERRAND','RELATIONSHIP_SCENE','TRAINING_OR_PRACTICE','VISIT_PLACE','INVESTIGATE','REPAIR_MISTAKE','KEEP_OR_BREAK_PROMISE_SCENE','FACTION_OR_COMMUNITY_DUTY','PERSONAL_GOAL_MILESTONE','RIVALRY_SCENE','RECOVERY_OR_RECONCILIATION']),
      sourceCauses:Object.freeze(['PERSONAL_LONG_TERM_GOAL','UNRESOLVED_PERSONAL_THREAD','RELATIONSHIP_CHANGE','PROMISE_OR_DEBT','WITNESSED_EVENT','FACTION_DUTY','PLACE_MEMORY','FEAR_OR_VALUE_CONFLICT','PLAYER_REPEATED_BEHAVIOR','LOCAL_WORLD_CHANGE','SELF_ACTUALIZATION_STEP'])
    }),
    questProposalContract:Object.freeze({
      requiredFields:Object.freeze(['source-cause','actor-goal','why-now','objective-structure','stake','possible-consequence']),
      candidateOnly:true,
      engineRegisters:true,
      engineValidatesPrerequisites:true,
      engineOwnsRewardsCompletionProgressSpawnInventoryAndSave:true,
      playerAcceptanceRequiredByDefault:true,
      duplicateRuntimeForbidden:true
    }),
    context:Object.freeze({world,relationship:createVibeRelationshipState(relationship),memory:Object.freeze(memory.slice(-16)),history:Object.freeze(history.slice(-12)),unresolved:Object.freeze(unresolved.slice(-8)),questHistory:Object.freeze(questHistory.slice(-16))}),
    initiative:Object.freeze(['offer-help','warn','give-gameplay-hint','bring-up-personal-thread','propose-event','propose-personal-quest','ask-for-space','disagree','apologize','celebrate','choose-silence']),
    noGameplayAuthority:true
  });
}

export function createVibeConversationFrame({speaker={},listener={},relationship={},world={},memory=[],history=[]}={}){return Object.freeze({base:createVibeRuntimeAIContract({purpose:'dialogue',contextKeys:SOCIAL_CONTEXT}),speaker:createVibeCompanionPersonalityDNA(speaker),listener:Object.freeze({id:listener.id||listener.name||'player',recentTone:listener.recentTone||'',recentAction:listener.recentAction||''}),relationship:createVibeRelationshipState(relationship),world:Object.freeze(world),memory:Object.freeze(memory.slice(-12)),history:Object.freeze(history.slice(-8)),questions:Object.freeze(['would-this-person-speak-now','what-do-they-care-about','what-memory-matters','does-silence-fit-better']),output:Object.freeze(['speech-act','utterance','emotion','body-language','attention','confidence'])})}
export function createVibeHumorContract({companion={},relationship={},context={}}={}){return Object.freeze({style:createVibeCompanionPersonalityDNA(companion).speech.humor,allowedSources:Object.freeze(['shared-memory','current-situation','self-deprecation-if-fit','gentle-teasing-if-fit','world-observation','callback']),forbid:Object.freeze(['constant-quips','same-catchphrase-spam','joke-after-every-action','out-of-character-meme-speak']),context:Object.freeze(context),relationship:createVibeRelationshipState(relationship)})}
export function createVibeCompanionInitiativeContract({companion={},situation={}}={}){return Object.freeze({identity:createVibeCompanionPersonalityDNA(companion),mayInitiate:Object.freeze(['comment-on-world','ask-player-question','warn','offer-help','suggest-rest','notice-object','react-to-npc','continue-old-topic','bring-up-shared-memory','disagree','apologize','celebrate','choose-silence']),situation:Object.freeze(situation),limits:Object.freeze(['no-commentary-on-every-event','cooldown-between-noncritical-lines','silence-is-valid'])})}
export function createVibeCompanionEmbodiedReaction({emotion='neutral',intent='observe'}={}){return Object.freeze({emotion,intent,channels:Object.freeze(['gaze','head-direction','distance-choice','posture','movement-speed','gesture','pause-before-speech']),protected:Object.freeze(['move-speed-stat','collision','combat-timing'])})}
export function createVibeCompanionSharedExperience({event={},participants=[]}={}){return Object.freeze({eventId:event.id||event.type||'shared-event',participants:freezeList(participants),perspectives:Object.freeze(participants.map(p=>Object.freeze({actor:p.id||p.name||'actor',interpretationBias:p.interpretationBias||'personality-and-relationship'}))),futureUses:Object.freeze(['dialogue-callback','joke-callback','trust-context','argument-context','quest-reaction','location-memory'])})}
export function createVibeSocialInteractionDiversityGate({candidate={},recent=[]}={}){const sig=x=>[x.speechAct,x.topic,x.emotion,x.humorType,x.initiator,x.bodyLanguage].map(v=>String(v||'').toLowerCase()).join('|'),issues=[];if(recent.slice(-12).some(x=>sig(x)===sig(candidate)))issues.push('duplicate-social-beat');if(recent.slice(-8).filter(x=>x.topic&&x.topic===candidate.topic).length>=2)issues.push('topic-overuse');if(candidate.alwaysTalks)issues.push('no-silence-variation');return Object.freeze({pass:!issues.length,issues:Object.freeze(issues)})}
export function planVibeCompanionSocialDirector({companion={},player={},relationship={},world={},memory=[],history=[]}={}){
  const personality=createVibeCompanionPersonalityDNA(companion);
  const selfhood=createVibeCompanionSelfhoodDNA(companion);
  const relationFrame=createVibeCompanionRelationshipFrame({companion,other:player,relationship,events:memory});
  const innerState=createVibeCompanionInnerState({companion,situation:world,relationship,memory,emotion:world.emotion||'calm'});
  return Object.freeze({
    version:3,
    qualityDNA:createVibeActorQualityDNA({role:'companion',named:true}),
    personality,
    selfhood,
    relationship:relationFrame.state,
    relationshipFrame:relationFrame,
    innerState,
    motivation:createVibeCompanionMotivationFrame({companion,relationship,world,memory,emotion:world.emotion||'calm'}),
    personalArc:createVibeCompanionPersonalArc({companion,history,unresolved:companion.unresolvedThreads||[]}),
    conversation:createVibeConversationFrame({speaker:companion,listener:player,relationship,world,memory,history}),
    dialogueIntent:createVibeCompanionDialogueIntent({companion,relationship,innerState,recentLines:history,activity:world.activity,attentionTarget:world.attentionTarget}),
    humor:createVibeHumorContract({companion,relationship,context:world}),
    initiative:createVibeCompanionInitiativeContract({companion,situation:world}),
    embodied:createVibeCompanionEmbodiedReaction({emotion:world.emotion||'neutral',intent:world.intent||'observe'}),
    policy:Object.freeze({runtimeAIOnly:true,silenceAllowed:true,noTemplateSpam:true,noGameplayAuthority:true,playerNotUniversalCenter:true,relationshipDirectional:true,privateInnerState:true})
  });
}

// 독립 행위자: 플레이어와 만나지 않아도 자기 관점·목표·관계·미해결 문제를 가진다.
export function createVibeActorSelfModel(actor={}){return Object.freeze({id:actor.id||actor.name||'actor',selfImage:actor.selfImage||'evolving',values:freezeList(actor.values),beliefs:freezeList(actor.beliefs),doubts:freezeList(actor.doubts),privateGoals:freezeList(actor.privateGoals||actor.goals),responsibilities:freezeList(actor.responsibilities),attachments:freezeList(actor.attachments),fears:freezeList(actor.fears),personalQuestions:freezeList(actor.personalQuestions),worldView:actor.worldView||'',futureImage:actor.futureImage||'',rule:'player-is-important-but-not-the-center-of-every-actor-self-model'})}
export function createVibeActorPersonalArc({actor={},history=[],unresolved=[]}={}){return Object.freeze({self:createVibeActorSelfModel(actor),history:Object.freeze(history.slice(-20)),unresolved:Object.freeze(unresolved.slice(-10)),arcAxes:Object.freeze(['identity','competence','belief','relationship','responsibility','fear','belonging','ambition']),possibleTransitions:Object.freeze(['reinforce-belief','question-belief','change-priority','gain-confidence','lose-confidence','forgive','resent','detach','commit','seek-new-goal','redefine-self']),rule:'growth-must-follow-experience-not-level-number-alone'})}
export function createVibeActorAutonomyContract({actor={},world={}}={}){return Object.freeze({base:createVibeRuntimeAIContract({purpose:/enemy|boss|적|보스/.test(String(actor.role||''))?'enemy':'npc',contextKeys:SELF_CONTEXT}),self:createVibeActorSelfModel(actor),world:Object.freeze(world),mayPursueWithoutPlayer:Object.freeze(['personal-duty','friendship','rivalry','work','rest','learning','investigation','faction-goal','protect-someone','avoid-someone','repair-mistake','prepare-future-action']),mayRelateToPlayer:Object.freeze(['ally','friend','rival','mentor','student','debtor','critic','temporary-partner','enemy','neutral-acquaintance']),limits:Object.freeze(['no-offscreen-authoritative-result-from-ai','no-invented-items-or-rewards','no-stat-growth-from-ai','no-teleport-or-hidden-knowledge']),rule:'AI may suggest autonomous intention; engine schedules validates and resolves actual world actions'})}
export function createVibeActorSubjectiveWorldModel({actor={},observations=[],rumors=[],memories=[]}={}){return Object.freeze({actor:actor.id||actor.name||'actor',observed:Object.freeze(observations.slice(-16)),rumors:Object.freeze(rumors.slice(-8)),memories:Object.freeze(memories.slice(-16)),truthPolicy:Object.freeze(['observation-can-be-incomplete','rumor-can-be-wrong','memory-can-be-perspective-biased','actor-does-not-read-global-truth-state']),questions:Object.freeze(['what-do-i-think-is-happening','what-am-i-uncertain-about','who-do-i-believe','what-would-change-my-mind']),rule:'different actors may hold different interpretations of the same world event'})}
export function createVibeActorGrowthReflection({actor={},event={},before={}}={}){return Object.freeze({actor:actor.id||actor.name||'actor',event:Object.freeze(event),before:Object.freeze(before),reflect:Object.freeze(['did-this-confirm-or-challenge-a-belief','did-i-succeed-or-fail-by-my-own-standard','did-a-relationship-change','did-my-fear-or-ambition-change','is-an-old-goal-still-worth-pursuing']),maySuggest:Object.freeze(['belief-adjustment','goal-priority-adjustment','relationship-interpretation','new-personal-question','confidence-shift','future-intention']),forbidden:Object.freeze(['stat-write','skill-unlock','save-write','progression-write','reward-write']),authority:'engine approves any persistent growth state'})}
export function createVibeActorParallelStory({actor={},threads=[]}={}){return Object.freeze({actor:actor.id||actor.name||'actor',threads:Object.freeze(threads.slice(-6)),threadTypes:Object.freeze(['personal','family','faction','rivalry','craft','belief','survival','reputation']),visibility:Object.freeze(['some-events-seen-by-player','some-told-later','some-inferred-from-world','some-remain-private']),rule:'actor can have a continuing story that intersects player story without existing only to serve it'})}
export function createVibeRivalProtagonistContract({actor={},playerRelation='rival'}={}){return Object.freeze({actor:createVibeActorSelfModel(actor),playerRelation,qualities:Object.freeze(['independent-goal','competence','limits','personal-stakes','own-allies','own-opponents','capacity-to-change','capacity-to-disagree']),enemyRule:'enemy may retreat reconsider negotiate remember defeat or pursue another objective when authored game rules permit',companionRule:'companion may disagree pursue personal business or temporarily separate when engine-authored content permits',npcRule:'npc may change priorities because of world events not only player interaction'})}
export function createVibeActorIdentityDiversityGate({actors=[]}={}){const signature=a=>[a.role,(a.values||[]).join(','),(a.privateGoals||a.goals||[]).join(','),a.worldView,a.futureImage].map(String).join('|'),seen=new Set(),duplicates=[];for(const a of actors){const s=signature(a);if(seen.has(s))duplicates.push(a.id||a.name||'actor');seen.add(s)}return Object.freeze({pass:duplicates.length===0,duplicates:Object.freeze(duplicates),rule:'major actors need distinct self-model goals worldview and growth pressure'})}
export function planVibeIndependentActorDirector({actor={},world={},history=[],unresolved=[],observations=[],rumors=[],memories=[]}={}){return Object.freeze({version:1,self:createVibeActorSelfModel(actor),arc:createVibeActorPersonalArc({actor,history,unresolved}),autonomy:createVibeActorAutonomyContract({actor,world}),subjectiveWorld:createVibeActorSubjectiveWorldModel({actor,observations,rumors,memories}),parallelStory:createVibeActorParallelStory({actor,threads:unresolved}),pipeline:Object.freeze(['read-bounded-personal-state','separate-self-goals-from-player-relationship','interpret-world-from-own-perspective','select-current-personal-pressure','decide-react-act-wait-or-reconsider','intersect-with-other-actors-goals','engine-validates-world-action','reflect-after-meaningful-event','engine-approves-persistent-growth','carry-unresolved-personal-thread-forward']),policy:Object.freeze({runtimeAIOnly:true,playerNotUniversalCenter:true,individualPerspective:true,independentGoals:true,parallelLifeArc:true,experienceBasedGrowth:true,noOmniscience:true,noGameplayAuthority:true,deterministicFallbackRequired:true})})}

export function createVibeQuestRuntimeContract({genre='adaptive'}={}){return Object.freeze({base:createVibeRuntimeAIContract({purpose:'quest',contextKeys:QUEST_CONTEXT}),genre,sourceRule:'quest-must-emerge-from-world-state-character-need-or-player-consequence',forbid:Object.freeze(['repeat-identical-objective','repeat-identical-story-beat','kill-N-without-context','collect-N-without-context','escort-clone']),authority:'AI-proposes-engine-validates'})}
export function createVibeQuestContinuityFrame({game={},world={},player={},npc={},history=[],unresolved=[]}={}){return Object.freeze({genre:game.genre||game.gameplay||'',world:Object.freeze(world),player:Object.freeze(player),npc:Object.freeze(npc),history:Object.freeze(history.slice(-20)),unresolved:Object.freeze(unresolved.slice(-12))})}
export function createVibeQuestGrowthArc({stage='early',genre='adaptive'}={}){const s={early:['personal-local-stake','small-visible-consequence'],mid:['relationships-and-factions','regional-consequence'],late:['hard-choice','long-memory-payoff'],endgame:['resolve-long-running-thread','legacy-consequence']};return Object.freeze({stage,genre,goals:Object.freeze(s[stage]||s.mid)})}
export function createVibeGenreQuestGrammar({genre='adaptive'}={}){return Object.freeze({genre,rule:'quest-verbs-express-core-game-fantasy'})}
export function createVibeQuestDiversityGate({candidate={},history=[]}={}){const sig=q=>[q.cause,q.primaryVerb,q.structure,q.actorType,q.locationType,q.stake,q.resolution].join('|'),issues=[];if(history.slice(-12).some(q=>sig(q)===sig(candidate)))issues.push('duplicate-quest-signature');if(!candidate.cause)issues.push('missing-cause');if(!candidate.consequence)issues.push('missing-consequence');return Object.freeze({pass:!issues.length,issues:Object.freeze(issues)})}
export function createVibeQuestConsequenceContract({quest={}}={}){return Object.freeze({quest:quest.id||quest.name||'quest',possiblePersistence:Object.freeze(['npc-memory','relationship-state','world-visual-state','available-dialogue','faction-attitude']),writeAuthority:'game-engine-only'})}
export function planVibeRuntimeQuestDirector({game={},world={},player={},npc={},history=[],unresolved=[],stage='early',relationship={},memory=[],questHistory=[]}={}){
  const genre=game.genre||game.gameplay||'adaptive';
  return Object.freeze({
    version:4,
    contract:createVibeQuestRuntimeContract({genre}),
    context:createVibeQuestContinuityFrame({game,world,player,npc,history,unresolved}),
    growth:createVibeQuestGrowthArc({stage,genre}),
    grammar:createVibeGenreQuestGrammar({genre}),
    autonomousInitiative:planVibeAutonomousActorInitiative({actor:npc,player,world,relationship,memory,history,unresolved,questHistory}),
    autonomousQuestProposalAllowed:true,
    autonomousQuestRegistrationAuthority:false,
    policy:Object.freeze({runtimeAIOnly:true,noRepeatQuest:true,continuityRequired:true,growthRequired:true,engineAuthoritative:true,personalCauseRequiredForAutonomousQuest:true,playerCanDeclineOptionalProposal:true})
  });
}
export function createVibeAIDirectorPlan({features=[]}={}){const rows=features.map(classifyVibeAIUse);return Object.freeze({version:7,rows:Object.freeze(rows),runtime:Object.freeze(rows.filter(x=>x.scope==='game-runtime')),blocked:Object.freeze(rows.filter(x=>x.scope!=='game-runtime')),actorQualityDnaRequired:true,companionSelfhoodRequired:true,monsterEcologyPreferred:true,policy:Object.freeze({absoluteRule:'AI_GAME_RUNTIME_ONLY',serverAI:'game-runtime-only',developmentAI:false,designAI:false,analysisAI:false,gameEngineAuthoritative:true,offlineFallbackRequired:true,timeoutFallbackRequired:true,traitsSeparateFromEmotion:true,relationshipDirectional:true,privateInnerStateNotPlayerKnowledge:true})})}
export function scoreVibeAIRuntimeRisk({frequency='event',latencySensitive=false,changesPersistentState=false,affectsCombatResult=false}={}){let risk=10;if(frequency==='frame')risk+=50;if(frequency==='second')risk+=25;if(latencySensitive)risk+=25;if(changesPersistentState)risk+=40;if(affectsCombatResult)risk+=50;return Object.freeze({risk:Math.min(100,risk),level:risk>=70?'high':risk>=35?'medium':'low'})}
export function createVibeAIContextBudget({purpose='npc',mobile=true}={}){const c=classifyVibeAIUse(purpose);if(!c.allowed)return Object.freeze({purpose,blocked:true,maxInputChars:0,maxHistoryTurns:0});const base=purpose==='dialogue'?1400:purpose==='quest'?1100:900;return Object.freeze({purpose,blocked:false,maxInputChars:mobile?base:Math.round(base*1.5),maxHistoryTurns:purpose==='dialogue'?8:6,sendOnlyRelevantState:true,exclude:Object.freeze(['full-save','secrets','source-code','unrelated-player-data','hidden-authoritative-state'])})}
export function validateVibeAIAction(action={}){const forbidden=['damage','hp','reward','drop','inventory','save','progression','spawnCount','combatResult','cooldown','collisionResult','questCompletion','questReward','statGrowth'];const touched=forbidden.filter(k=>action[k]!==undefined);return Object.freeze({safe:!touched.length,touched:Object.freeze(touched),decision:touched.length?'reject-and-use-engine-rule':'allow-as-suggestion'})}
export function assertVibeAIAbsoluteBoundary({scope='',purpose=''}={}){const c=classifyVibeAIUse(purpose),safe=scope==='game-runtime'&&c.allowed;return Object.freeze({safe,rule:'AI_GAME_RUNTIME_ONLY',decision:safe?'allow-runtime-ai':'block-ai'})}
if(typeof window!=='undefined')Object.assign(window,{createJaewoonVibeSpeechRegister:createVibeSpeechRegister,createJaewoonVibeGameplayMentorContract:createVibeGameplayMentorContract,createJaewoonVibeAutonomousQuestCandidate:createVibeAutonomousQuestCandidate,createJaewoonVibeAutonomousEventCandidate:createVibeAutonomousEventCandidate,planJaewoonVibeAutonomousActorInitiative:planVibeAutonomousActorInitiative,createJaewoonVibeActorQualityDNA:createVibeActorQualityDNA,createJaewoonVibeCompanionSelfhoodDNA:createVibeCompanionSelfhoodDNA,createJaewoonVibeCompanionMotivationFrame:createVibeCompanionMotivationFrame,createJaewoonVibeCompanionInnerState:createVibeCompanionInnerState,createJaewoonVibeCompanionRelationshipFrame:createVibeCompanionRelationshipFrame,createJaewoonVibeCompanionDialogueIntent:createVibeCompanionDialogueIntent,createJaewoonVibeCompanionPersonalArc:createVibeCompanionPersonalArc,createJaewoonVibeMonsterEcologyMind:createVibeMonsterEcologyMind,classifyJaewoonVibeAIUse:classifyVibeAIUse,createJaewoonVibeRuntimeAIContract:createVibeRuntimeAIContract,createJaewoonVibeLivingActorContract:createVibeLivingActorContract,createJaewoonVibeLivingDecisionFrame:createVibeLivingDecisionFrame,createJaewoonVibeSocialMemoryPolicy:createVibeSocialMemoryPolicy,createJaewoonVibeEnemyTacticalMind:createVibeEnemyTacticalMind,createJaewoonVibeNPCDailyMind:createVibeNPCDailyMind,createJaewoonVibeCrowdDiversityPolicy:createVibeCrowdDiversityPolicy,createJaewoonVibeCompanionPersonalityDNA:createVibeCompanionPersonalityDNA,createJaewoonVibeRelationshipState:createVibeRelationshipState,createJaewoonVibeConversationFrame:createVibeConversationFrame,createJaewoonVibeHumorContract:createVibeHumorContract,createJaewoonVibeCompanionInitiativeContract:createVibeCompanionInitiativeContract,createJaewoonVibeCompanionEmbodiedReaction:createVibeCompanionEmbodiedReaction,createJaewoonVibeCompanionSharedExperience:createVibeCompanionSharedExperience,createJaewoonVibeSocialInteractionDiversityGate:createVibeSocialInteractionDiversityGate,planJaewoonVibeCompanionSocialDirector:planVibeCompanionSocialDirector,createJaewoonVibeActorSelfModel:createVibeActorSelfModel,createJaewoonVibeActorPersonalArc:createVibeActorPersonalArc,createJaewoonVibeActorAutonomyContract:createVibeActorAutonomyContract,createJaewoonVibeActorSubjectiveWorldModel:createVibeActorSubjectiveWorldModel,createJaewoonVibeActorGrowthReflection:createVibeActorGrowthReflection,createJaewoonVibeActorParallelStory:createVibeActorParallelStory,createJaewoonVibeRivalProtagonistContract:createVibeRivalProtagonistContract,createJaewoonVibeActorIdentityDiversityGate:createVibeActorIdentityDiversityGate,planJaewoonVibeIndependentActorDirector:planVibeIndependentActorDirector,createJaewoonVibeQuestRuntimeContract:createVibeQuestRuntimeContract,planJaewoonVibeRuntimeQuestDirector:planVibeRuntimeQuestDirector,createJaewoonVibeAIDirectorPlan:createVibeAIDirectorPlan,createJaewoonVibeAIContextBudget:createVibeAIContextBudget,validateJaewoonVibeAIAction:validateVibeAIAction,assertJaewoonVibeAIAbsoluteBoundary:assertVibeAIAbsoluteBoundary});