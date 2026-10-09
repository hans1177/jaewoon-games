import crypto from 'node:crypto';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const stableInt=value=>Number.parseInt(crypto.createHash('sha256').update(clean(value)||'vibe-flow').digest('hex').slice(0,8),16)>>>0;
const rotate=(items,offset)=>items.length?[...items.slice(offset%items.length),...items.slice(0,offset%items.length)]:[];

export const FLOW_ARCHETYPES=Object.freeze([
  'HUB_AND_SPOKE','EXPEDITION','EXTRACTION_RISK_RETURN','BRANCHING_RUN','DEFENSE_PREP_AND_PRESSURE',
  'PRODUCTION_NETWORK','DISCOVERY_AND_ABILITY_GATING','BRANCHING_NARRATIVE','INFILTRATION_AND_ESCAPE','SANDBOX_SELF_DIRECTED',
  'BOSS_LEARN_ADAPT','LIFE_SCHEDULE','OPERATIONS_CRISIS','TERRITORY_CONTROL','PUZZLE_DISCOVERY',
]);

const GENRE_FLOW_PREFERENCES={
  SINGLE_DEFENSE_STRATEGY:['DEFENSE_PREP_AND_PRESSURE','HUB_AND_SPOKE','OPERATIONS_CRISIS','TERRITORY_CONTROL'],
  ACTION_SURVIVAL_ROGUELITE:['EXPEDITION','EXTRACTION_RISK_RETURN','BRANCHING_RUN','BOSS_LEARN_ADAPT'],
  IDLE_GROWTH_RPG:['HUB_AND_SPOKE','PRODUCTION_NETWORK','EXPEDITION','BRANCHING_NARRATIVE'],
  STORY_COMPLETE_RPG:['HUB_AND_SPOKE','EXPEDITION','BRANCHING_NARRATIVE','DISCOVERY_AND_ABILITY_GATING'],
  STORY_RPG_ADVENTURE_RPG:['HUB_AND_SPOKE','EXPEDITION','BRANCHING_NARRATIVE','DISCOVERY_AND_ABILITY_GATING'],
  ROLEPLAY_LIFE_AVATAR:['LIFE_SCHEDULE','SANDBOX_SELF_DIRECTED','HUB_AND_SPOKE','BRANCHING_NARRATIVE'],
  SIMULATOR_TYCOON_INCREMENTAL:['PRODUCTION_NETWORK','HUB_AND_SPOKE','OPERATIONS_CRISIS','SANDBOX_SELF_DIRECTED'],
  BATTLEGROUND_FIGHTING_SHOOTER:['TERRITORY_CONTROL','BOSS_LEARN_ADAPT','OPERATIONS_CRISIS','EXPEDITION'],
  SURVIVAL_HORROR_ESCAPE:['INFILTRATION_AND_ESCAPE','EXPEDITION','EXTRACTION_RISK_RETURN','DISCOVERY_AND_ABILITY_GATING'],
  OBBY_PARTY_MINIGAME:['EXPEDITION','PUZZLE_DISCOVERY','BRANCHING_RUN','BOSS_LEARN_ADAPT'],
  PUZZLE:['PUZZLE_DISCOVERY','DISCOVERY_AND_ABILITY_GATING','BRANCHING_RUN','HUB_AND_SPOKE'],
  CASUAL:['SANDBOX_SELF_DIRECTED','HUB_AND_SPOKE','PUZZLE_DISCOVERY','LIFE_SCHEDULE'],
};

export const AWARD_CALIBER_SYSTEM_PRINCIPLES=Object.freeze([
  'SYSTEMS_INTERLOCK_AROUND_THE_CORE_FANTASY_INSTEAD_OF_EXISTING_AS_A_FEATURE_CHECKLIST',
  'PROGRESSION_UNLOCKS_NEW_VERBS_COMBINATIONS_ROUTES_OR_RELATIONSHIPS_NOT_ONLY_LARGER_NUMBERS',
  'SIDE_CONTENT_FEEDS_BACK_INTO_CORE_PLAY_WORLD_STATE_CHARACTER_RELATIONSHIPS_OR_BUILD_OPTIONS',
  'WORLD_NPCS_ENEMIES_ECONOMY_AND_ACCESS_REACT_TO_PLAYER_ACTION_OR_NEGLECT',
  'EARLY_MID_LATE_PLAY_CHANGE_DECISION_STRUCTURE_PRESSURE_OR_SYSTEM_COMBINATION',
  'AUTHORED_PEAK_MOMENTS_AND_SYSTEMIC_REPLAY_VALUE_COEXIST',
  'FAILURE_CREATES_RECOVERY_ADAPTATION_OR_NEW_INFORMATION_INSTEAD_OF_EMPTY_REPETITION',
  'OPTIONAL_SYSTEMS_RESPECT_THE_GAME_CONCEPT_AND_DO_NOT_DILUTE_THE_CORE_FANTASY',
  'CONTENT_EXPANSION_ADDS_NEW_ROLES_RULES_INTERACTIONS_OR_CONSEQUENCES_NOT_RESKINS_ONLY',
  'QUALITY_OF_LIFE_REDUCES_FRICTION_WITHOUT_REMOVING_MEANINGFUL_DECISIONS',
]);

const SYSTEM_CATALOG=Object.freeze({
  SURVIVAL_VITALS:Object.freeze({owners:['PLAYER','CORE_STATE'],libraries:[],purpose:'bounded health hunger energy temperature or equivalent survival pressure when concept-relevant'}),
  GATHERING_RESOURCE:Object.freeze({owners:['WORLD','INTERACTION','ECONOMY'],libraries:['assets/inventory-equipment.js'],purpose:'world resources become real inventory inputs through spatial interaction'}),
  INVENTORY_EQUIPMENT:Object.freeze({owners:['PLAYER','ECONOMY','SAVE'],libraries:['assets/inventory-equipment.js'],purpose:'acquire compare equip replace and persist items without shadow inventory authority'}),
  ITEM_LOOT:Object.freeze({owners:['ECONOMY','PROGRESSION'],libraries:['assets/economy-loot-shop.js','assets/inventory-equipment.js'],purpose:'drops and rewards have source tables rarity roles and meaningful use'}),
  CRAFTING:Object.freeze({owners:['ECONOMY','PROGRESSION','INTERACTION'],libraries:['assets/crafting-recipes.js','assets/inventory-equipment.js'],purpose:'recipes consume real resources and create items buildings upgrades or tools that affect play'}),
  HOUSING_BUILDING:Object.freeze({owners:['WORLD','PLACEMENT','ECONOMY','SAVE'],libraries:[],purpose:'player-built shelter base or structures change access safety production storage or planning'}),
  WEATHER_ENVIRONMENT:Object.freeze({owners:['WORLD','PRESENTATION'],libraries:[],purpose:'environment state changes readability traversal pressure or presentation without visual-only fake depth'}),
  EXPLORATION_REGION:Object.freeze({owners:['WORLD','PROGRESSION'],libraries:[],purpose:'regions routes landmarks shortcuts and discoveries alter future choices'}),
  THREAT_ECOLOGY:Object.freeze({owners:['AI','WORLD','COMBAT'],libraries:['assets/targeting-system.js'],purpose:'enemy species roles territories and behaviors interact with world and player decisions'}),
  TARGETING_COMBAT:Object.freeze({owners:['COMBAT','AI','INPUT'],libraries:['assets/targeting-system.js'],purpose:'target selection range priority and combat outcomes remain authoritative and readable'}),
  SKILL_BUILD:Object.freeze({owners:['COMBAT','PROGRESSION'],libraries:['assets/skill-effects.js'],purpose:'skills create build identity counters combinations and timing choices'}),
  ECONOMY_SHOP:Object.freeze({owners:['ECONOMY','PROGRESSION'],libraries:['assets/economy-loot-shop.js'],purpose:'sources sinks prices shops and rewards connect to progression without free loops'}),
  QUEST_DIALOGUE:Object.freeze({owners:['NARRATIVE','PROGRESSION','SAVE'],libraries:['assets/quest-dialogue.js'],purpose:'quests prerequisites dialogue consequences and rewards remain causal and persistent'}),
  NPC_INTERACTION:Object.freeze({owners:['NARRATIVE','INTERACTION','AI'],libraries:['assets/quest-dialogue.js','assets/common-ai.js'],purpose:'NPCs have world roles knowledge boundaries reactions and meaningful interactions'}),
  COMPANION_PARTY:Object.freeze({owners:['NARRATIVE','AI','PLAYER'],libraries:['assets/ai-party.js','assets/common-ai.js','assets/quest-dialogue.js'],purpose:'companions have distinct roles relationships behaviors and player-style complement without stealing gameplay authority'}),
  SOCIAL_RELATIONSHIP:Object.freeze({owners:['NARRATIVE','AI','SAVE'],libraries:['assets/quest-dialogue.js','assets/common-ai.js'],purpose:'relationships change causally and unlock reactions quests information or access'}),
  FACTION_WORLD_STATE:Object.freeze({owners:['NARRATIVE','WORLD','PROGRESSION'],libraries:['assets/quest-dialogue.js'],purpose:'faction and world-state consequences change access conflict support or region behavior'}),
  CODEX_COLLECTION:Object.freeze({owners:['PROGRESSION','NARRATIVE'],libraries:[],purpose:'discovery collection or bestiary knowledge rewards observation and mastery'}),
  WAVE_ENCOUNTER:Object.freeze({owners:['CORE_STATE','AI','COMBAT','PROGRESSION'],libraries:['assets/targeting-system.js'],purpose:'encounter waves change composition rules and pressure rather than only health scaling'}),
  DEFENSE_PLACEMENT:Object.freeze({owners:['PLACEMENT','WORLD','COMBAT'],libraries:[],purpose:'positioning and placement alter routes ranges targets or combat outcomes'}),
  RESEARCH_TECH:Object.freeze({owners:['PROGRESSION','ECONOMY'],libraries:[],purpose:'research opens strategic branches counters and system interactions'}),
  PRODUCTION_CHAIN:Object.freeze({owners:['ECONOMY','WORLD','PROGRESSION'],libraries:['assets/economy-loot-shop.js'],purpose:'production transforms inputs through connected facilities capacity and bottlenecks'}),
  STAFF_CUSTOMER:Object.freeze({owners:['AI','ECONOMY','WORLD'],libraries:['assets/common-ai.js'],purpose:'staff and customer behavior creates service flow preferences queues satisfaction or operational pressure'}),
  UPGRADE_BRANCH:Object.freeze({owners:['PROGRESSION','ECONOMY'],libraries:[],purpose:'upgrades create branching roles and tradeoffs rather than linear stat inflation'}),
  PUZZLE_STATE:Object.freeze({owners:['CORE_STATE','WORLD','INTERACTION'],libraries:[],purpose:'puzzle state preserves clues dependencies reset rules and consequence'}),
  TRAVERSAL_CHECKPOINT:Object.freeze({owners:['PLAYER','WORLD','PROGRESSION'],libraries:[],purpose:'movement mastery checkpoints shortcuts and recovery create pacing and route learning'}),
  TERRITORY_OBJECTIVE:Object.freeze({owners:['WORLD','CORE_STATE','PROGRESSION'],libraries:[],purpose:'territory state objectives and control consequences change routes pressure or resources'}),
});

export const GENRE_SYSTEM_BUNDLES=Object.freeze({
  ACTION_SURVIVAL_ROGUELITE:Object.freeze({
    required:['SURVIVAL_VITALS','GATHERING_RESOURCE','INVENTORY_EQUIPMENT','ITEM_LOOT','CRAFTING','HOUSING_BUILDING','EXPLORATION_REGION','THREAT_ECOLOGY'],
    recommended:['WEATHER_ENVIRONMENT','ECONOMY_SHOP','QUEST_DIALOGUE','SKILL_BUILD','CODEX_COLLECTION'],
    phases:Object.freeze({
      EARLY:['SURVIVAL_VITALS','GATHERING_RESOURCE','INVENTORY_EQUIPMENT'],
      MID:['CRAFTING','HOUSING_BUILDING','ITEM_LOOT','EXPLORATION_REGION'],
      LATE:['THREAT_ECOLOGY','WEATHER_ENVIRONMENT','SKILL_BUILD','CODEX_COLLECTION']
    }),
    chains:['GATHERING_RESOURCE->CRAFTING->HOUSING_BUILDING','THREAT_ECOLOGY->ITEM_LOOT->INVENTORY_EQUIPMENT','EXPLORATION_REGION->WEATHER_ENVIRONMENT->SURVIVAL_VITALS','CRAFTING->INVENTORY_EQUIPMENT->EXPLORATION_REGION']
  }),
  SURVIVAL_HORROR_ESCAPE:Object.freeze({
    required:['SURVIVAL_VITALS','INVENTORY_EQUIPMENT','ITEM_LOOT','EXPLORATION_REGION','THREAT_ECOLOGY','PUZZLE_STATE'],
    recommended:['CRAFTING','QUEST_DIALOGUE','NPC_INTERACTION','CODEX_COLLECTION'],
    phases:Object.freeze({EARLY:['SURVIVAL_VITALS','INVENTORY_EQUIPMENT','EXPLORATION_REGION'],MID:['PUZZLE_STATE','ITEM_LOOT','THREAT_ECOLOGY'],LATE:['QUEST_DIALOGUE','CODEX_COLLECTION']}),
    chains:['EXPLORATION_REGION->PUZZLE_STATE->ITEM_LOOT','THREAT_ECOLOGY->SURVIVAL_VITALS->EXPLORATION_REGION','ITEM_LOOT->INVENTORY_EQUIPMENT->PUZZLE_STATE']
  }),
  STORY_COMPLETE_RPG:Object.freeze({
    required:['NPC_INTERACTION','QUEST_DIALOGUE','INVENTORY_EQUIPMENT','ITEM_LOOT','SKILL_BUILD','ECONOMY_SHOP','COMPANION_PARTY','EXPLORATION_REGION','TARGETING_COMBAT'],
    recommended:['CRAFTING','SOCIAL_RELATIONSHIP','FACTION_WORLD_STATE','CODEX_COLLECTION'],
    phases:Object.freeze({
      EARLY:['NPC_INTERACTION','QUEST_DIALOGUE','INVENTORY_EQUIPMENT','TARGETING_COMBAT'],
      MID:['COMPANION_PARTY','SKILL_BUILD','ITEM_LOOT','ECONOMY_SHOP','EXPLORATION_REGION'],
      LATE:['CRAFTING','SOCIAL_RELATIONSHIP','FACTION_WORLD_STATE','CODEX_COLLECTION']
    }),
    chains:['NPC_INTERACTION->QUEST_DIALOGUE->EXPLORATION_REGION','TARGETING_COMBAT->ITEM_LOOT->INVENTORY_EQUIPMENT','COMPANION_PARTY->SOCIAL_RELATIONSHIP->QUEST_DIALOGUE','SKILL_BUILD->CRAFTING->ECONOMY_SHOP','FACTION_WORLD_STATE->EXPLORATION_REGION->QUEST_DIALOGUE']
  }),
  STORY_RPG_ADVENTURE_RPG:Object.freeze({
    required:['NPC_INTERACTION','QUEST_DIALOGUE','INVENTORY_EQUIPMENT','ITEM_LOOT','SKILL_BUILD','COMPANION_PARTY','EXPLORATION_REGION','TARGETING_COMBAT'],
    recommended:['CRAFTING','ECONOMY_SHOP','SOCIAL_RELATIONSHIP','FACTION_WORLD_STATE','CODEX_COLLECTION'],
    phases:Object.freeze({EARLY:['NPC_INTERACTION','QUEST_DIALOGUE','INVENTORY_EQUIPMENT','TARGETING_COMBAT'],MID:['COMPANION_PARTY','SKILL_BUILD','ITEM_LOOT','EXPLORATION_REGION'],LATE:['CRAFTING','SOCIAL_RELATIONSHIP','FACTION_WORLD_STATE','CODEX_COLLECTION']}),
    chains:['NPC_INTERACTION->QUEST_DIALOGUE->EXPLORATION_REGION','TARGETING_COMBAT->ITEM_LOOT->INVENTORY_EQUIPMENT','COMPANION_PARTY->SOCIAL_RELATIONSHIP->QUEST_DIALOGUE','SKILL_BUILD->CRAFTING->ECONOMY_SHOP']
  }),
  IDLE_GROWTH_RPG:Object.freeze({
    required:['INVENTORY_EQUIPMENT','ITEM_LOOT','SKILL_BUILD','ECONOMY_SHOP','QUEST_DIALOGUE','UPGRADE_BRANCH'],
    recommended:['NPC_INTERACTION','COMPANION_PARTY','CRAFTING','EXPLORATION_REGION','CODEX_COLLECTION'],
    phases:Object.freeze({EARLY:['ECONOMY_SHOP','ITEM_LOOT','UPGRADE_BRANCH'],MID:['INVENTORY_EQUIPMENT','SKILL_BUILD','QUEST_DIALOGUE'],LATE:['CRAFTING','COMPANION_PARTY','EXPLORATION_REGION']}),
    chains:['ITEM_LOOT->ECONOMY_SHOP->UPGRADE_BRANCH','UPGRADE_BRANCH->SKILL_BUILD->INVENTORY_EQUIPMENT','QUEST_DIALOGUE->EXPLORATION_REGION->ITEM_LOOT']
  }),
  SINGLE_DEFENSE_STRATEGY:Object.freeze({
    required:['DEFENSE_PLACEMENT','WAVE_ENCOUNTER','ECONOMY_SHOP','UPGRADE_BRANCH','RESEARCH_TECH','TARGETING_COMBAT'],
    recommended:['ITEM_LOOT','QUEST_DIALOGUE','EXPLORATION_REGION','CODEX_COLLECTION'],
    phases:Object.freeze({EARLY:['DEFENSE_PLACEMENT','WAVE_ENCOUNTER','ECONOMY_SHOP'],MID:['UPGRADE_BRANCH','RESEARCH_TECH','TARGETING_COMBAT'],LATE:['ITEM_LOOT','CODEX_COLLECTION','EXPLORATION_REGION']}),
    chains:['DEFENSE_PLACEMENT->TARGETING_COMBAT->WAVE_ENCOUNTER','WAVE_ENCOUNTER->ECONOMY_SHOP->UPGRADE_BRANCH','UPGRADE_BRANCH->RESEARCH_TECH->DEFENSE_PLACEMENT']
  }),
  SIMULATOR_TYCOON_INCREMENTAL:Object.freeze({
    required:['HOUSING_BUILDING','PRODUCTION_CHAIN','ECONOMY_SHOP','STAFF_CUSTOMER','UPGRADE_BRANCH'],
    recommended:['QUEST_DIALOGUE','NPC_INTERACTION','INVENTORY_EQUIPMENT','CODEX_COLLECTION'],
    phases:Object.freeze({EARLY:['HOUSING_BUILDING','ECONOMY_SHOP'],MID:['PRODUCTION_CHAIN','STAFF_CUSTOMER','UPGRADE_BRANCH'],LATE:['QUEST_DIALOGUE','NPC_INTERACTION','CODEX_COLLECTION']}),
    chains:['HOUSING_BUILDING->PRODUCTION_CHAIN->ECONOMY_SHOP','STAFF_CUSTOMER->ECONOMY_SHOP->UPGRADE_BRANCH','UPGRADE_BRANCH->PRODUCTION_CHAIN->HOUSING_BUILDING']
  }),
  ROLEPLAY_LIFE_AVATAR:Object.freeze({
    required:['NPC_INTERACTION','SOCIAL_RELATIONSHIP','HOUSING_BUILDING','ECONOMY_SHOP','QUEST_DIALOGUE'],
    recommended:['COMPANION_PARTY','INVENTORY_EQUIPMENT','CRAFTING','CODEX_COLLECTION'],
    phases:Object.freeze({EARLY:['NPC_INTERACTION','SOCIAL_RELATIONSHIP'],MID:['HOUSING_BUILDING','ECONOMY_SHOP','QUEST_DIALOGUE'],LATE:['COMPANION_PARTY','CRAFTING','CODEX_COLLECTION']}),
    chains:['NPC_INTERACTION->SOCIAL_RELATIONSHIP->QUEST_DIALOGUE','ECONOMY_SHOP->HOUSING_BUILDING->SOCIAL_RELATIONSHIP','CRAFTING->INVENTORY_EQUIPMENT->HOUSING_BUILDING']
  }),
  BATTLEGROUND_FIGHTING_SHOOTER:Object.freeze({
    required:['TARGETING_COMBAT','SKILL_BUILD','INVENTORY_EQUIPMENT','UPGRADE_BRANCH','TERRITORY_OBJECTIVE'],
    recommended:['ITEM_LOOT','CODEX_COLLECTION'],
    phases:Object.freeze({EARLY:['TARGETING_COMBAT','INVENTORY_EQUIPMENT'],MID:['SKILL_BUILD','UPGRADE_BRANCH'],LATE:['TERRITORY_OBJECTIVE','ITEM_LOOT']}),
    chains:['TARGETING_COMBAT->SKILL_BUILD->UPGRADE_BRANCH','TERRITORY_OBJECTIVE->TARGETING_COMBAT->ITEM_LOOT']
  }),
  OBBY_PARTY_MINIGAME:Object.freeze({
    required:['TRAVERSAL_CHECKPOINT','PUZZLE_STATE','UPGRADE_BRANCH'],
    recommended:['ITEM_LOOT','CODEX_COLLECTION'],
    phases:Object.freeze({EARLY:['TRAVERSAL_CHECKPOINT'],MID:['PUZZLE_STATE','UPGRADE_BRANCH'],LATE:['ITEM_LOOT','CODEX_COLLECTION']}),
    chains:['TRAVERSAL_CHECKPOINT->PUZZLE_STATE->UPGRADE_BRANCH']
  }),
  PUZZLE:Object.freeze({
    required:['PUZZLE_STATE','EXPLORATION_REGION','UPGRADE_BRANCH'],
    recommended:['QUEST_DIALOGUE','CODEX_COLLECTION','ITEM_LOOT'],
    phases:Object.freeze({EARLY:['PUZZLE_STATE'],MID:['EXPLORATION_REGION','UPGRADE_BRANCH'],LATE:['QUEST_DIALOGUE','CODEX_COLLECTION']}),
    chains:['EXPLORATION_REGION->PUZZLE_STATE->UPGRADE_BRANCH','PUZZLE_STATE->CODEX_COLLECTION->QUEST_DIALOGUE']
  }),
  CASUAL:Object.freeze({
    required:['UPGRADE_BRANCH','ITEM_LOOT'],
    recommended:['NPC_INTERACTION','QUEST_DIALOGUE','CODEX_COLLECTION','INVENTORY_EQUIPMENT'],
    phases:Object.freeze({EARLY:['ITEM_LOOT'],MID:['UPGRADE_BRANCH'],LATE:['NPC_INTERACTION','QUEST_DIALOGUE','CODEX_COLLECTION']}),
    chains:['ITEM_LOOT->UPGRADE_BRANCH->CODEX_COLLECTION']
  }),
});

function normalizedGenreSystemBundle(genre=''){
  const key=genreKey(genre);
  if(GENRE_SYSTEM_BUNDLES[key])return{key,bundle:GENRE_SYSTEM_BUNDLES[key]};
  if(/DEFEN|TOWER|STRATEG/.test(key))return{key:'SINGLE_DEFENSE_STRATEGY',bundle:GENRE_SYSTEM_BUNDLES.SINGLE_DEFENSE_STRATEGY};
  if(/HORROR/.test(key)&&/SURVIV|ESCAPE/.test(key))return{key:'SURVIVAL_HORROR_ESCAPE',bundle:GENRE_SYSTEM_BUNDLES.SURVIVAL_HORROR_ESCAPE};
  if(/SURVIV|ROGUE/.test(key))return{key:'ACTION_SURVIVAL_ROGUELITE',bundle:GENRE_SYSTEM_BUNDLES.ACTION_SURVIVAL_ROGUELITE};
  if(/RPG|STORY|ADVENTURE/.test(key))return{key:'STORY_COMPLETE_RPG',bundle:GENRE_SYSTEM_BUNDLES.STORY_COMPLETE_RPG};
  if(/TYCOON|SIMULATOR/.test(key))return{key:'SIMULATOR_TYCOON_INCREMENTAL',bundle:GENRE_SYSTEM_BUNDLES.SIMULATOR_TYCOON_INCREMENTAL};
  if(/ROLEPLAY|LIFE/.test(key))return{key:'ROLEPLAY_LIFE_AVATAR',bundle:GENRE_SYSTEM_BUNDLES.ROLEPLAY_LIFE_AVATAR};
  if(/PUZZLE/.test(key))return{key:'PUZZLE',bundle:GENRE_SYSTEM_BUNDLES.PUZZLE};
  return{key:'CASUAL',bundle:GENRE_SYSTEM_BUNDLES.CASUAL};
}
function systemDescriptor(id,priority='REQUIRED'){
  const row=SYSTEM_CATALOG[id]||{owners:['CORE_STATE'],libraries:[],purpose:'concept-specific gameplay system'};
  return Object.freeze({
    id,priority,
    ownerSystems:Object.freeze([...(row.owners||[])]),
    reusableLibraryHints:Object.freeze([...(row.libraries||[])]),
    purpose:row.purpose,
    reuseRule:'REUSE_EXISTING_COMPATIBLE_SYSTEM_OR_REAUTHOR_SEMANTICS_INSIDE_EXISTING_NATIVE_RESPONSIBILITY',
    shadowSystemForbidden:true,
    gameplayAuthorityMustStayWithExistingResponsibleSystem:true,
  });
}
function novelGrammarFromBaseline(baseline={}){
  const content=baseline?.content&&typeof baseline.content==='object'?baseline.content:baseline;
  const grammar=content?.novelGameGrammar;
  if(!grammar||typeof grammar!=='object'||Array.isArray(grammar))return null;
  return Object.freeze({
    toneBlend:Object.freeze(uniq(grammar.toneBlend||[]).slice(0,4)),
    familiarAnchor:clean(grammar.familiarAnchor),
    newPrimaryVerb:clean(grammar.newPrimaryVerb),
    brokenGenreAssumption:clean(grammar.brokenGenreAssumption),
    worldRule:clean(grammar.worldRule),
    causalDNAs:Object.freeze((grammar.causalDNAs||[]).map(row=>Object.freeze({id:clean(row?.id),source:clean(row?.source),principle:clean(row?.principle),gameplayConversion:clean(row?.gameplayConversion),fusionRole:clean(row?.fusionRole)})).filter(row=>row.id).slice(0,4)),
    causalFusion:Object.freeze(uniq(grammar.causalFusion||[]).slice(0,6)),
    storyWorldBindings:grammar.storyWorldBindings||null,
    gameplaySystemFusion:grammar.gameplaySystemFusion||null,
    delveLayer:grammar.delveLayer||null,
    emergentGenre:grammar.emergentGenre||null,
    expansionVectors:Object.freeze(uniq(grammar.expansionVectors||[]).slice(0,8)),
    irreducibilityTest:grammar.irreducibilityTest||null,
    culturalAbstractionRule:clean(grammar.culturalAbstractionRule),
    rule:'MAIN × A × B × C + @; MAIN identity; A/B system + independent material; C two creative materials plus PRIMARY and SECONDARY genres; @ unbounded delve',
    categoryRole:'SEED_DISCOVERY_AND_ROUTING_HINT_ONLY_NOT_FINAL_GENRE',
    atRole:'DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS'
  });
}
export function buildConceptSystemBlueprint({genre='',baseline={},architecture={}}={}){
  const {key,bundle}=normalizedGenreSystemBundle(genre);
  const semantic=baselineText(baseline).toUpperCase();
  const required=new Set(bundle.required||[]),recommended=new Set(bundle.recommended||[]);
  const promote=id=>{recommended.delete(id);required.add(id);};
  if(/CRAFT|제작/.test(semantic))promote('CRAFTING');
  if(/HOUSE|HOUSING|BASE|SHELTER|건축|집|기지|거점/.test(semantic))promote('HOUSING_BUILDING');
  if(/COMPANION|PARTY|동료|파티/.test(semantic))promote('COMPANION_PARTY');
  if(/NPC|DIALOG|QUEST|대화|퀘스트/.test(semantic)){promote('NPC_INTERACTION');promote('QUEST_DIALOGUE');}
  if(/FACTION|세력|진영/.test(semantic))promote('FACTION_WORLD_STATE');
  if(/RELATION|관계|호감/.test(semantic))promote('SOCIAL_RELATIONSHIP');
  if(/WEATHER|RAIN|SNOW|STORM|FOG|날씨|비|눈|폭풍|안개/.test(semantic))promote('WEATHER_ENVIRONMENT');
  if(/SKILL|MAGIC|ABILITY|스킬|마법/.test(semantic))promote('SKILL_BUILD');
  if(/SHOP|ECONOM|상점|경제/.test(semantic))promote('ECONOMY_SHOP');
  const novelGrammarContract=novelGrammarFromBaseline(baseline);
  const requiredRows=[...required].map(id=>systemDescriptor(id,'REQUIRED'));
  const recommendedRows=[...recommended].filter(id=>!required.has(id)).map(id=>systemDescriptor(id,'EXPANSION'));
  const phasePlan={};
  for(const phase of ['EARLY','MID','LATE']){
    const ids=uniq(bundle.phases?.[phase]||[]).filter(id=>required.has(id)||recommended.has(id));
    phasePlan[phase]=Object.freeze(ids);
  }
  return Object.freeze({
    version:1,profile:key,
    routingProfileRole:'SEED_DISCOVERY_AND_COMPATIBILITY_HINT_ONLY_NOT_FINAL_GENRE',
    target:'CONCEPT_MATCHED_INTERCONNECTED_SYSTEM_BUNDLE',
    requiredSystems:Object.freeze(requiredRows),
    expansionSystems:Object.freeze(recommendedRows),
    phasePlan:Object.freeze(phasePlan),
    interconnectionChains:Object.freeze(uniq(bundle.chains||[])),
    novelGrammarContract,
    awardCaliberPrinciples:AWARD_CALIBER_SYSTEM_PRINCIPLES,
    libraryReusePolicy:Object.freeze({
      existingCompatibleLibraryFirst:true,
      directCrossPlatformCodeCopyForbidden:true,
      platformNativeReauthoringWhenNeeded:true,
      existingGameplayAuthorityWins:true,
      wrapperOrShadowSystemForbidden:true,
      knownReusableLibraries:Object.freeze(uniq([...requiredRows,...recommendedRows].flatMap(row=>row.reusableLibraryHints))),
    }),
    expansionPolicy:Object.freeze({
      contentBundlesMustConnectAtLeastTwoSystems:true,
      newContentMustChangeDecisionStateRouteRelationshipOrBuild:true,
      statOnlyReskinOnlyAndMenuOnlyExpansionDoesNotCount:true,
      sideContentMustFeedCoreFantasyOrWorldState:true,
      laterUpdatesMayAddSystemsWithoutRewritingValidatedCore:true,
      causalGrammarMustMutateAcrossExpansion:true,
      expansionShouldChangeHowTheCoreRuleBehavesNotOnlyAddObjects:true,
      mainABCFormulaRequiredWhenNovelGrammarExists:true,
      aAndBEachNeedSystemAndCreativeMaterial:true,
      cNeedsTwoCreativeThemesAndTwoDistinctGenres:true,
      supportingGenreMustCausallyChangeGameplay:true,
      subElementsAreNotCThemeSlot:true,
      atDelveLayerRequiredAndNotAGeneralSystemAxis:true,
      emergentGenreComesFromCombinedGrammarNotRoutingCategory:true,
      characterMonsterRegionStoryShouldExpressTheSameCausalWorldLawWhenApplicable:true,
    }),
    sourceFlowDNA:Object.freeze(uniq(architecture.flowDNA||[])),
  });
}

function explicitArchitecture(baseline={}){
  const candidates=[baseline.GAME_FLOW_ARCHITECTURE,baseline.gameFlowArchitecture,baseline.GAMEPLAY_SKETCH?.flowArchitecture,baseline.gameplaySketch?.flowArchitecture,baseline.gameSeed?.GAMEPLAY_SKETCH?.flowArchitecture,baseline.seed?.GAMEPLAY_SKETCH?.flowArchitecture];
  return candidates.find(x=>x&&typeof x==='object'&&!Array.isArray(x))||null;
}
function genreKey(genre=''){return clean(genre).toUpperCase();}
function preferredFlows(genre=''){
  const key=genreKey(genre),direct=GENRE_FLOW_PREFERENCES[key];
  if(direct)return direct;
  if(/DEFEN|TOWER|STRATEG/.test(key))return GENRE_FLOW_PREFERENCES.SINGLE_DEFENSE_STRATEGY;
  if(/SURVIV|ROGUE/.test(key))return GENRE_FLOW_PREFERENCES.ACTION_SURVIVAL_ROGUELITE;
  if(/RPG|STORY|ADVENTURE/.test(key))return GENRE_FLOW_PREFERENCES.STORY_COMPLETE_RPG;
  if(/TYCOON|SIMULATOR|IDLE/.test(key))return GENRE_FLOW_PREFERENCES.SIMULATOR_TYCOON_INCREMENTAL;
  if(/PUZZLE/.test(key))return GENRE_FLOW_PREFERENCES.PUZZLE;
  return FLOW_ARCHETYPES;
}
function flowCount(seed){return 2+(seed%3);}
function chooseFlowDNA({gameId='',genre='',baseline={}}={}){
  const seed=stableInt(`${gameId}|${genre}|${JSON.stringify(baseline?.content?.coreLoop||baseline?.coreLoop||[])}`),preferred=preferredFlows(genre);
  const ordered=uniq([...rotate(preferred,seed%Math.max(1,preferred.length)),...rotate(FLOW_ARCHETYPES,(seed>>>5)%FLOW_ARCHETYPES.length)]);
  return ordered.slice(0,flowCount(seed));
}
function phaseArc(flowDNA){
  const flow=i=>flowDNA[i%flowDNA.length];
  return [
    {phase:'EARLY',dominantFlow:flow(0),purpose:'teach the world and core agency',requiredChange:'establish control, first meaningful choice, first consequence'},
    {phase:'MID',dominantFlow:flow(1),purpose:'change the decision structure instead of only scaling numbers',requiredChange:'open parallel goals, route or system interaction, and a new pressure type'},
    {phase:'LATE',dominantFlow:flow(flowDNA.length>2?2:0),purpose:'resolve accumulated world consequences through a different pressure/goal structure',requiredChange:'combine prior systems, expose irreversible or high-stakes choice, reach distinct terminal outcome'},
  ];
}
function pickModes(seed,items,min=2,max=3){const count=Math.min(items.length,min+(seed%Math.max(1,max-min+1)));return rotate(items,seed%items.length).slice(0,count);}

const SYSTEM_ASSET_ROLE_MAP=Object.freeze({
  SURVIVAL_VITALS:[['UI','STATUS']],
  GATHERING_RESOURCE:[['PROP','RESOURCE'],['MOTION','SURVIVAL_CRAFTING'],['UI','ICON']],
  INVENTORY_EQUIPMENT:[['UI','INVENTORY'],['UI','ICON'],['CHARACTER','ACCESSORY']],
  ITEM_LOOT:[['PROP','RESOURCE'],['UI','ICON']],
  CRAFTING:[['PROP','CRAFTING'],['MOTION','SURVIVAL_CRAFTING'],['UI','INVENTORY']],
  HOUSING_BUILDING:[['BUILDING','MODULAR_EXTERIOR'],['BUILDING','INTERIOR'],['PROP','FURNITURE'],['UI','ICON']],
  WEATHER_ENVIRONMENT:[['ENVIRONMENT','WEATHER'],['VFX','WEATHER'],['AUDIO','WEATHER']],
  EXPLORATION_REGION:[['ENVIRONMENT','BIOME'],['ENVIRONMENT','LANDMARK'],['UI','MAP']],
  THREAT_ECOLOGY:[['CREATURE','SPECIES'],['MOTION','COMBAT'],['AUDIO','CREATURE_VOCAL']],
  TARGETING_COMBAT:[['MOTION','COMBAT'],['VFX','IMPACT'],['AUDIO','HIT'],['UI','STATUS']],
  SKILL_BUILD:[['SKILL','VFX'],['MOTION','SKILL'],['UI','ICON']],
  ECONOMY_SHOP:[['UI','FRAME'],['UI','ICON']],
  QUEST_DIALOGUE:[['UI','FRAME'],['UI','ICON']],
  NPC_INTERACTION:[['CHARACTER','BODY'],['MOTION','ACTING'],['UI','FRAME']],
  COMPANION_PARTY:[['CHARACTER','BODY'],['MOTION','ACTING'],['UI','FRAME']],
  SOCIAL_RELATIONSHIP:[['CHARACTER','BODY'],['MOTION','ACTING'],['UI','STATUS']],
  FACTION_WORLD_STATE:[['CHARACTER','ACCESSORY'],['UI','STATUS'],['ENVIRONMENT','LANDMARK']],
  CODEX_COLLECTION:[['UI','FRAME'],['UI','ICON']],
  WAVE_ENCOUNTER:[['CREATURE','BODY_PLAN'],['UI','HUD'],['VFX','STATUS']],
  DEFENSE_PLACEMENT:[['PROP','INTERACTIVE'],['UI','HUD']],
  RESEARCH_TECH:[['UI','FRAME'],['UI','ICON']],
  PRODUCTION_CHAIN:[['BUILDING','MODULAR_EXTERIOR'],['PROP','INTERACTIVE'],['UI','HUD']],
  STAFF_CUSTOMER:[['CHARACTER','BODY'],['MOTION','ACTING'],['UI','HUD']],
  UPGRADE_BRANCH:[['UI','FRAME'],['UI','ICON']],
  PUZZLE_STATE:[['PROP','INTERACTIVE'],['UI','ICON'],['VFX','STATUS']],
  TRAVERSAL_CHECKPOINT:[['MOTION','TRAVERSAL'],['UI','STATUS']],
  TERRITORY_OBJECTIVE:[['UI','MAP'],['ENVIRONMENT','LANDMARK'],['VFX','STATUS']],
});

const FLOW_ASSET_ROLE_MAP=Object.freeze({
  HUB_AND_SPOKE:[['ENVIRONMENT','LANDMARK'],['UI','MAP'],['PROP','INTERACTIVE']],
  EXPEDITION:[['ENVIRONMENT','BIOME'],['MOTION','TRAVERSAL'],['PROP','RESOURCE']],
  EXTRACTION_RISK_RETURN:[['UI','STATUS'],['VFX','STATUS'],['AUDIO','UI']],
  BRANCHING_RUN:[['UI','MAP'],['UI','ICON'],['VFX','STATUS']],
  DEFENSE_PREP_AND_PRESSURE:[['UI','HUD'],['ENVIRONMENT','LANDMARK'],['VFX','IMPACT'],['MOTION','COMBAT']],
  PRODUCTION_NETWORK:[['BUILDING','MODULAR_EXTERIOR'],['PROP','CRAFTING'],['UI','INVENTORY']],
  DISCOVERY_AND_ABILITY_GATING:[['ENVIRONMENT','LANDMARK'],['UI','MAP'],['SKILL','VFX'],['VFX','IMPACT']],
  BRANCHING_NARRATIVE:[['CHARACTER','BODY'],['MOTION','ACTING'],['UI','FRAME'],['AUDIO','UI']],
  INFILTRATION_AND_ESCAPE:[['ENVIRONMENT','BIOME'],['MOTION','TRAVERSAL'],['AUDIO','ENVIRONMENT'],['VFX','STATUS']],
  SANDBOX_SELF_DIRECTED:[['BUILDING','MODULAR_EXTERIOR'],['PROP','INTERACTIVE'],['UI','INVENTORY']],
  BOSS_LEARN_ADAPT:[['CREATURE','SIGNATURE'],['MOTION','COMBAT'],['VFX','BOSS'],['AUDIO','BOSS'],['UI','BOSS']],
  LIFE_SCHEDULE:[['CHARACTER','BODY'],['MOTION','ACTING'],['PROP','FURNITURE'],['UI','HUD']],
  OPERATIONS_CRISIS:[['UI','STATUS'],['VFX','STATUS'],['AUDIO','UI']],
  TERRITORY_CONTROL:[['UI','MAP'],['ENVIRONMENT','LANDMARK'],['VFX','STATUS']],
  PUZZLE_DISCOVERY:[['PROP','INTERACTIVE'],['UI','ICON'],['VFX','IMPACT'],['AUDIO','UI']],
});

function baselineText(baseline={}){
  const content=baseline?.content&&typeof baseline.content==='object'?baseline.content:baseline;
  return [
    content?.identity,content?.playerFantasy,content?.coreFun,content?.progressionDirection,
    ...(Array.isArray(content?.coreLoop)?content.coreLoop:[]),
    ...(Array.isArray(content?.signatureSystems)?content.signatureSystems.flatMap(row=>[row?.name,row?.purpose,row?.playerChoice]):[]),
    content?.novelGameGrammar?JSON.stringify(content.novelGameGrammar):'',
  ].map(clean).filter(Boolean).join(' ');
}
function assetRequirement(family,subfamily,{flowRoles=[],systemRoles=[],phases=[],reason='FLOW_ROLE',required=true}={}){
  return Object.freeze({
    family,subfamily,required:required!==false,priority:required===false?'FLOW_EXPANSION':'FLOW_CRITICAL',
    flowRoles:Object.freeze(uniq(flowRoles)),systemRoles:Object.freeze(uniq(systemRoles)),phases:Object.freeze(uniq(phases)),reason,
    resolution:'LATEST_COMPATIBLE_INTERNAL_ASSET_AT_EXECUTION_TIME',
    libraryEligibility:'CROSS_GENRE_COMPATIBLE_ASSETS',
    genreRestriction:false,
    crossGenreReuseAllowed:true,
    genreUse:'PREFERENCE_ONLY_NOT_ELIGIBILITY_GATE',
    allowedReuseModes:Object.freeze(['USE_AS_IS','LIGHT_THEME_ADAPT','STYLE_ADAPT','RECOMBINE_PARTS','NATIVE_REAUTHOR_BASE']),
    assetIdPinned:false,gameplayAuthority:false,balanceAuthority:false,saveAuthority:false,
  });
}
export function buildFlowAssetRequirements({architecture={},genre='',baseline={}}={}){
  const keyed=new Map();
  const add=(family,subfamily,meta={})=>{
    const key=`${family}:${subfamily}`,prev=keyed.get(key);
    const next=assetRequirement(family,subfamily,{
      flowRoles:[...(prev?.flowRoles||[]),...(meta.flowRoles||[])],
      systemRoles:[...(prev?.systemRoles||[]),...(meta.systemRoles||[])],
      phases:[...(prev?.phases||[]),...(meta.phases||[])],
      reason:prev?.reason||meta.reason||'FLOW_ROLE',
      required:prev?.required===true||meta.required!==false
    });
    keyed.set(key,next);
  };
  const phaseByFlow=new Map();
  for(const row of Array.isArray(architecture.phaseArc)?architecture.phaseArc:[]){
    const flow=clean(row?.dominantFlow).toUpperCase();
    if(!flow)continue;
    if(!phaseByFlow.has(flow))phaseByFlow.set(flow,[]);
    phaseByFlow.get(flow).push(clean(row?.phase).toUpperCase());
  }
  for(const flow of uniq(architecture.flowDNA||[]).map(value=>value.toUpperCase())){
    for(const [family,subfamily] of FLOW_ASSET_ROLE_MAP[flow]||[])add(family,subfamily,{flowRoles:[flow],phases:phaseByFlow.get(flow)||[],reason:'FLOW_DNA'});
  }
  const systemBlueprint=architecture.systemBlueprint||buildConceptSystemBlueprint({genre,baseline,architecture});
  const systemPhases=new Map();
  for(const [phase,ids] of Object.entries(systemBlueprint.phasePlan||{}))for(const id of ids||[]){
    if(!systemPhases.has(id))systemPhases.set(id,[]);
    systemPhases.get(id).push(phase);
  }
  for(const row of systemBlueprint.requiredSystems||[])for(const [family,subfamily] of SYSTEM_ASSET_ROLE_MAP[row.id]||[])add(family,subfamily,{systemRoles:[row.id],phases:systemPhases.get(row.id)||[],reason:'CONCEPT_SYSTEM_REQUIRED',required:true});
  for(const row of systemBlueprint.expansionSystems||[])for(const [family,subfamily] of SYSTEM_ASSET_ROLE_MAP[row.id]||[])add(family,subfamily,{systemRoles:[row.id],phases:systemPhases.get(row.id)||[],reason:'CONCEPT_SYSTEM_EXPANSION',required:false});
  const semantic=(genre+' '+baselineText(baseline)).toUpperCase();
  if(/COMBAT|FIGHT|ATTACK|BATTLE|전투|공격|디펜스|DEFEN/.test(semantic)){
    add('MOTION','COMBAT',{reason:'SEMANTIC_COMBAT'});
    add('VFX','IMPACT',{reason:'SEMANTIC_COMBAT'});
    add('AUDIO','HIT',{reason:'SEMANTIC_COMBAT'});
  }
  if(/BOSS|보스/.test(semantic)){add('CREATURE','SIGNATURE',{reason:'SEMANTIC_BOSS'});add('UI','BOSS',{reason:'SEMANTIC_BOSS'});}
  if(/QUEST|STORY|NPC|DIALOG|서사|스토리|퀘스트|대화/.test(semantic)){add('CHARACTER','BODY',{reason:'SEMANTIC_NARRATIVE'});add('MOTION','ACTING',{reason:'SEMANTIC_NARRATIVE'});}
  if(/INVENTORY|EQUIP|CRAFT|SHOP|인벤토리|장비|제작|상점/.test(semantic)){add('UI','INVENTORY',{reason:'SEMANTIC_SYSTEM_UI'});add('PROP','INTERACTIVE',{reason:'SEMANTIC_SYSTEM_UI'});}
  if(/WEAPON|SWORD|SPEAR|AXE|HAMMER|BOW|GUN|무기|검|창|도끼|망치|활|총/.test(semantic))add('WEAPON','MELEE',{reason:'SEMANTIC_WEAPON'});
  if(/SKILL|MAGIC|SPELL|ABILITY|스킬|마법|주문/.test(semantic)){add('SKILL','VFX',{reason:'SEMANTIC_SKILL'});add('MOTION','SKILL',{reason:'SEMANTIC_SKILL'});}
  if(/WORLD|REGION|MAP|FOREST|DUNGEON|CITY|VILLAGE|지역|맵|숲|던전|도시|마을/.test(semantic)){add('ENVIRONMENT','BIOME',{reason:'SEMANTIC_WORLD'});add('ENVIRONMENT','LANDMARK',{reason:'SEMANTIC_WORLD'});}
  if(/WEATHER|RAIN|SNOW|STORM|FOG|날씨|비|눈|폭풍|안개/.test(semantic)){add('ENVIRONMENT','WEATHER',{reason:'SEMANTIC_WEATHER'});add('VFX','WEATHER',{reason:'SEMANTIC_WEATHER'});add('AUDIO','WEATHER',{reason:'SEMANTIC_WEATHER'});}
  add('UI','HUD',{reason:'BASE_PLAYER_READABILITY'});
  return Object.freeze([...keyed.values()]);
}
function buildQualityGrowthContract({architecture={},genre='',baseline={}}={}){
  const text=baselineText(baseline),phaseNames=(architecture.phaseArc||[]).map(row=>clean(row?.phase).toUpperCase()).filter(Boolean);
  return Object.freeze({
    version:1,target:'AWARD_CALIBER_SYSTEMIC_GAME_COMPLETENESS',
    playerPromise:clean((baseline?.content||baseline)?.playerFantasy)||clean((baseline?.content||baseline)?.identity)||`${clean(genre)||'GAME'} 플레이어가 반복할 이유와 성장 결과를 매 세션 확인한다.`,
    funDrivers:Object.freeze([
      'CORE_ACTION_HAS_IMMEDIATE_READABLE_RESPONSE',
      'CHOICES_CHANGE_RISK_REWARD_ROUTE_OR_SYSTEM_STATE',
      'MASTERY_OPENS_NEW_ACTION_COMBINATIONS_NOT_ONLY_BIGGER_NUMBERS',
      'WORLD_OR_OPPONENT_RESPONSE_CREATES_ADAPTATION',
    ]),
    balanceRules:Object.freeze([
      'NO_SINGLE_DOMINANT_STRATEGY_WITHOUT_CONTEXTUAL_COUNTERPRESSURE',
      'POWER_GROWTH_AND_CHALLENGE_GROWTH_ARE_CHECKED_TOGETHER',
      'FAILURE_COST_PRESERVES_RECOVERY_AND_NEXT_DECISION',
      'ECONOMY_HAS_DECLARED_SOURCES_SINKS_AND_NO_FREE_INFINITE_LOOP',
      'LATE_GAME_DIFFICULTY_CHANGES_DECISION_STRUCTURE_NOT_ONLY_HP_DAMAGE',
    ]),
    pacing:Object.freeze({
      EARLY:'teach core agency, first success, first meaningful choice, first recoverable risk',
      MID:'open parallel goals, new system interaction, route/playstyle divergence, new pressure type',
      LATE:'combine mastered systems, high-stakes choice, distinct encounter or terminal structure, replay hook',
      phases:Object.freeze(phaseNames)
    }),
    expansionRules:Object.freeze([
      'ADD_NEW_ENEMY_OR_ACTOR_BEHAVIOR_ROLE',
      'ADD_NEW_SPACE_ROUTE_OR_REGIONAL_RULE',
      'FOR_TRAVERSABLE_WORLDS_COMPOSE_MULTI_ELEVATION_3D_TERRAIN_WITH_PLAYABLE_BRIDGES_STAIRS_TUNNELS_AND_SHORTCUTS',
      'FOR_TRAVERSABLE_WORLDS_REPLACE_REPEATED_STRAIGHT_CORRIDORS_WITH_CAUSAL_BRANCHES_DISTINCT_LANDMARKS_AND_REVISIT_REASONS',
      'CONNECT_TERRAIN_ARCHITECTURE_AND_ENVIRONMENTAL_CLUES_TO_CURRENT_MAIN_A_B_C_DELVE_GAMEPLAY_WITHOUT_REBALANCING_SAVE_OR_SERVER_AUTHORITY',
      'ADD_NEW_OBJECTIVE_INTERACTION_OR_INFORMATION_LAYER',
      'ADD_NEW_STRATEGY_BUILD_OR_PLAYSTYLE_OUTCOME',
      'CONNECT_NEW_CONTENT_TO_EXISTING_PROGRESSION_ECONOMY_AND_WORLD_STATE',
      'REPETITION_RESKIN_AND_STAT_ONLY_VARIANTS_DO_NOT_COUNT_AS_DEPTH',
    ]),
    completionCriteria:Object.freeze([
      'FIRST_5_MINUTES_READABLE_AND_PLAYABLE',
      '15_TO_25_MINUTES_OPENS_NEW_DECISION_SPACE',
      '30_PLUS_MINUTES_HAS_SYSTEM_COMBINATION_AND_LONG_GOAL_WITHOUT_PADDING',
      'FAIL_RETRY_RECOVERY_SAVE_AND_SOFTLOCK_PATHS_ARE_DEFINED',
      'MOBILE_INPUT_READABILITY_AND_PERFORMANCE_REMAIN_PLAYABLE',
      'CONTENT_HAS_EARLY_MID_LATE_ROLE_DIFFERENTIATION',
      'TRAVERSABLE_3D_WORLD_MUST_HAVE_REAL_ELEVATION_ROUTE_VARIETY_LANDMARK_IDENTITY_AND_VERIFIED_MOBILE_REACHABILITY',
    ]),
    codingGrowthContract:Object.freeze({
      dataDrivenExtensionPreferred:true,
      stableIdsForExpandableContent:true,
      existingResponsibilityFunctionsFirst:true,
      duplicateGameplayAuthorityForbidden:true,
      saveMigrationRequiredWhenPersistedShapeChanges:true,
      extensionPoints:Object.freeze(['CONTENT_DEFINITIONS','ENCOUNTER_OR_WAVE_DEFINITIONS','REGION_OR_ROUTE_RULES','PROGRESSION_REWARD_TABLES','PRESENTATION_ASSET_BINDINGS']),
    }),
    sourceHint:text||null,
  });
}

export function buildGameFlowArchitecture({gameId='',genre='',baseline={},inventory=[]}={}){
  const explicit=explicitArchitecture(baseline);
  if(explicit){
    const base={...explicit,version:Math.max(3,Number(explicit.version||1)),source:'SEED_OR_DESIGN_GAME_FLOW_ARCHITECTURE'};
    const systemBlueprint=base.systemBlueprint||buildConceptSystemBlueprint({genre,baseline,architecture:base});
    const enriched={...base,systemBlueprint};
    const assetRequirements=buildFlowAssetRequirements({architecture:enriched,genre,baseline});
    return{...enriched,assetFlow:base.assetFlow||{version:1,mode:'FLOW_DRIVEN_LATEST_LIBRARY_RESOLUTION',requirements:assetRequirements},qualityGrowthContract:base.qualityGrowthContract||buildQualityGrowthContract({architecture:enriched,genre,baseline})};
  }
  // 설계용 inventory는 기존 플로우 선택 규칙을 유지한다. 실제 파일 검색 결과는 빌드업 증거에서 별도 처리한다.
  const seed=stableInt(`${gameId}|${genre}|${(inventory||[]).map(x=>`${x?.path||''}:${x?.label||''}`).join('|')}`),flowDNA=chooseFlowDNA({gameId,genre,baseline});
  const returnModes=['HUB_RETURN','CONTINUOUS_FORWARD','EXTRACTION_DECISION','MULTI_BASE_ROTATION'];
  const failureModes=['HARD_FAILURE_RETRY','PARTIAL_RESOURCE_LOSS','WORLD_STATE_SETBACK','RELATIONSHIP_OR_ACCESS_COST','TIME_OR_OPPORTUNITY_COST','FORCED_ROUTE_CHANGE'];
  const victoryModes=['BOSS_OR_THREAT_RESOLUTION','ESCAPE_OR_EXTRACTION','ECONOMIC_OR_BUILD_TARGET','TERRITORY_OR_WORLD_CONTROL','MYSTERY_OR_SYSTEM_SOLVED','RELATIONSHIP_OR_SOCIAL_RESOLUTION','SURVIVAL_OR_DURATION_TARGET'];
  const riskTypes=['ENEMY_PRESSURE','RESOURCE_SCARCITY','TIME_PRESSURE','SPACE_OR_ROUTE_DENIAL','ECONOMY_OR_MAINTENANCE_PRESSURE','INFORMATION_UNCERTAINTY'];
  const playstyles=['DIRECT_COMBAT','ECONOMY_AND_BUILD','EXPLORATION_AND_DISCOVERY','SOCIAL_OR_QUEST','STEALTH_OR_AVOIDANCE','TACTICAL_CONTROL'];
  const informationModes=['MAP_DISCOVERY','NPC_KNOWLEDGE','SCOUTING_OR_SENSOR','ITEM_OR_ABILITY_REVEAL','CAUSE_AND_EFFECT_LEARNING'];
  const architecture={
    version:3,source:'DERIVED_GAME_FLOW_ARCHITECT',gameId:clean(gameId),genre:genreKey(genre),
    flowDNA,
    phaseArc:phaseArc(flowDNA),
    transitionEvents:[
      {trigger:'FIRST_MEANINGFUL_PROGRESSION_OR_WORLD_CHANGE',effect:'EARLY_TO_MID_FLOW_CHANGE'},
      {trigger:'MAJOR_REGION_BOSS_NPC_ECONOMY_OR_SYSTEM_THRESHOLD',effect:'MID_TO_LATE_FLOW_CHANGE'},
      {trigger:'PLAYER_CHOICE_OR_WORLD_FAILURE_WHEN_DESIGN_SUPPORTS_IT',effect:'ROUTE_OR_RULESET_BRANCH'},
    ],
    parallelGoals:{required:true,minConcurrentThreads:3,threads:['PRIMARY_OBJECTIVE','GROWTH_OR_EQUIPMENT','WORLD_OR_REGION_CHANGE','OPTIONAL_RELATIONSHIP_COLLECTION_OR_ECONOMY']},
    branching:{required:true,contract:'CHOICE_MUST_CHANGE_NEXT_ROUTE_TARGET_RISK_REWARD_OR_WORLD_STATE_NOT_ONLY_TEXT'},
    returnStructure:{allowedModes:returnModes,selectedMode:returnModes[seed%returnModes.length],sameReturnLoopEveryGameForbidden:true},
    failureModel:{modes:pickModes(seed>>>2,failureModes,2,3),contract:'FAILURE_COSTS_MUST_DIFFER_BY_CONTEXT_AND_PRESERVE_A_REAL_RECOVERY_OR_RETRY_PATH'},
    victoryModel:{modes:pickModes(seed>>>4,victoryModes,2,3),contract:'TERMINAL_SUCCESS_MUST_NOT_DEFAULT_TO_BOSS_KILL_WHEN_ANOTHER OUTCOME FITS THE GAME'},
    worldReactivity:{required:true,contract:'PLAYER_ACTION_OR_NEGLECT_CHANGES_WORLD_NPC_ENEMY_ECONOMY_ACCESS_OR_REGION_STATE_AND_LATER_PLAY'},
    npcInitiative:{required:true,contract:'WHEN_NPCS_EXIST_AT_LEAST_ONE NPC_OR_WORLD_ACTOR_MAY_INITIATE_EVENT_MOVE_REQUEST_CONFLICT_OR_STATE_CHANGE_WITHOUT_PLAYER_BUTTON_PROXY'},
    riskCurve:{required:true,types:pickModes(seed>>>6,riskTypes,3,4),contract:'MID_OR_LATE_PRESSURE_MUST_CHANGE TYPE OR COMBINATION_NOT ONLY NUMERIC SCALE'},
    playstyleRoutes:{required:true,styles:pickModes(seed>>>8,playstyles,2,4),contract:'AT_LEAST_TWO PLAYSTYLES MUST REACH MEANINGFUL PROGRESS THROUGH DIFFERENT ACTION MIXES'},
    regionalRuleVariation:{required:true,contract:'MAJOR_REGIONS_MUST DIFFER BY AT_LEAST ONE REAL MOVEMENT_COMBAT_RESOURCE_VISIBILITY_INTERACTION_OR_RISK_RULE'},
    sessionStructure:{short:'5_MINUTES_HAS_MEANINGFUL_MICRO_GOAL_AND_STATE_CHANGE',medium:'15_TO_25_MINUTES_OPENS_NEW_ROUTE_SYSTEM_OR_PRESSURE',long:'30_PLUS_MINUTES_COMBINES_FLOW_TRANSITION_AND_LONG_GOAL_WITHOUT_PADDING'},
    metaProgression:{mode:'CONDITIONAL_ON_GAME_DESIGN',contract:'IF_PRESENT_SEPARATE_CURRENT_SESSION_GAIN_FROM_PERSISTENT_LONG_TERM_CHANGE'},
    playerAuthoredGoals:{mode:flowDNA.includes('SANDBOX_SELF_DIRECTED')?'REQUIRED':'OPTIONAL',contract:'WHEN_ENABLED_SYSTEMS_SUPPORT SELF_SELECTED BUILD_COLLECTION_RELATIONSHIP_EXPLORATION_OR_ECONOMY GOALS'},
    tensionRhythm:{required:true,contract:'ALTERNATE_PRESSURE_DISCOVERY_REWARD_RECOVERY_OR_DECISION_BEATS; CONTINUOUS SAME_INTENSITY_ACTION_FORBIDDEN'},
    informationProgression:{required:true,modes:pickModes(seed>>>10,informationModes,2,3),contract:'SOME USEFUL INFORMATION IS EARNED THROUGH PLAY AND CHANGES LATER DECISIONS'},
    revisitValue:{required:true,contract:'WHEN BACKTRACKING EXISTS PRIOR SPACE MUST GAIN NEW ACCESS_STATE_EVENT_RISK_REWARD_OR_INFORMATION; EMPTY RETURN TRAVEL DOES NOT COUNT'},
    endingModel:{required:true,multipleOutcomeCapable:true,contract:'WHEN DESIGN HAS BRANCHING_OR_WORLD_STATE ENDING OR TERMINAL STATE MUST REFLECT ACCUMULATED CHOICES_OR_WORLD_STATE'},
    diversityRules:{minFlowArchetypes:2,maxFlowArchetypes:4,phaseDominantFlowMustChange:true,parallelGoalThreadsMin:3,failureModesMin:2,victoryModesMin:2,worldReactionRequired:true,regionalRuleDifferenceRequired:true,sameMacroLoopAcrossAllPhasesForbidden:true,renameOnlyVariationForbidden:true},
  };
  const systemBlueprint=buildConceptSystemBlueprint({genre,baseline,architecture});
  const enriched={...architecture,systemBlueprint};
  const assetRequirements=buildFlowAssetRequirements({architecture:enriched,genre,baseline});
  return{...enriched,assetFlow:{version:1,mode:'FLOW_DRIVEN_LATEST_LIBRARY_RESOLUTION',requirements:assetRequirements},qualityGrowthContract:buildQualityGrowthContract({architecture:enriched,genre,baseline})};
}

export function evaluateGameFlowArchitecture(architecture={}){
  const blockers=[],dna=uniq(architecture.flowDNA||[]),phases=Array.isArray(architecture.phaseArc)?architecture.phaseArc:[],phaseFlows=uniq(phases.map(x=>x?.dominantFlow));
  if(dna.length<2)blockers.push('FLOW_DNA_TOO_NARROW');
  if(dna.length>4)blockers.push('FLOW_DNA_TOO_BROAD');
  if(phases.length<3||phaseFlows.length<2)blockers.push('PHASE_FLOW_CHANGE_REQUIRED');
  if(Number(architecture.parallelGoals?.minConcurrentThreads||0)<3)blockers.push('PARALLEL_GOALS_REQUIRED');
  if((architecture.failureModel?.modes||[]).length<2)blockers.push('FAILURE_STRUCTURE_VARIETY_REQUIRED');
  if((architecture.victoryModel?.modes||[]).length<2)blockers.push('VICTORY_STRUCTURE_VARIETY_REQUIRED');
  if(architecture.worldReactivity?.required!==true)blockers.push('WORLD_REACTIVITY_REQUIRED');
  if(architecture.regionalRuleVariation?.required!==true)blockers.push('REGIONAL_RULE_VARIATION_REQUIRED');
  if(architecture.tensionRhythm?.required!==true)blockers.push('TENSION_RHYTHM_REQUIRED');
  if(architecture.informationProgression?.required!==true)blockers.push('INFORMATION_PROGRESSION_REQUIRED');
  const assetRequirements=architecture.assetFlow?.requirements||[];
  if(!Array.isArray(assetRequirements)||assetRequirements.length<3)blockers.push('FLOW_ASSET_REQUIREMENTS_REQUIRED');
  if(assetRequirements.some(row=>row?.assetIdPinned===true||row?.gameplayAuthority===true||row?.balanceAuthority===true||row?.saveAuthority===true))blockers.push('FLOW_ASSET_AUTHORITY_OR_PINNING_FORBIDDEN');
  const systemBlueprint=architecture.systemBlueprint||{};
  if((systemBlueprint.requiredSystems||[]).length<2)blockers.push('FLOW_CONCEPT_SYSTEM_BUNDLE_REQUIRED');
  if((systemBlueprint.interconnectionChains||[]).length<1)blockers.push('FLOW_SYSTEM_INTERCONNECTION_REQUIRED');
  if((systemBlueprint.awardCaliberPrinciples||[]).length<8)blockers.push('FLOW_AWARD_CALIBER_SYSTEM_PRINCIPLES_REQUIRED');
  if(systemBlueprint.libraryReusePolicy?.wrapperOrShadowSystemForbidden!==true)blockers.push('FLOW_SHADOW_SYSTEM_FORBIDDEN_POLICY_REQUIRED');
  if(systemBlueprint.expansionPolicy?.contentBundlesMustConnectAtLeastTwoSystems!==true)blockers.push('FLOW_INTERCONNECTED_CONTENT_EXPANSION_REQUIRED');
  if(systemBlueprint.novelGrammarContract){
    const grammar=systemBlueprint.novelGrammarContract;
    if(!clean(grammar.newPrimaryVerb)||!clean(grammar.brokenGenreAssumption)||!clean(grammar.worldRule))blockers.push('FLOW_NOVEL_GAME_GRAMMAR_REQUIRED');
    if((grammar.causalDNAs||[]).length<2||(grammar.causalFusion||[]).length<2)blockers.push('FLOW_CAUSAL_DNA_FUSION_REQUIRED');
    if(!clean(grammar.irreducibilityTest?.verdict))blockers.push('FLOW_GRAMMAR_IRREDUCIBILITY_REQUIRED');
    const creativeV5=grammar.gameplaySystemFusion?.formula==='MAIN × A × B × C';
    if(!['MAIN × A × B × C','MAIN × A × B × c'].includes(grammar.gameplaySystemFusion?.formula)
      ||(grammar.gameplaySystemFusion?.majorAxes||[]).length!==2||(grammar.gameplaySystemFusion?.crossSystemRules||[]).length<4)blockers.push('FLOW_MAIN_A_B_C_SYSTEM_FUSION_REQUIRED');
    if(creativeV5&&(grammar.gameplaySystemFusion?.majorAxes||[]).some(row=>!clean(row.systemFamily)||!clean(row.sourceMaterial)||!clean(row.sourceDomain)||!clean(row.materialRule)))blockers.push('FLOW_A_B_SYSTEM_AND_CREATIVE_SOURCE_REQUIRED');
    const c=grammar.gameplaySystemFusion?.themeFusion,themes=Array.isArray(c?.themes)?c.themes:[];
    if(creativeV5&&(themes.length!==2||themes.some(row=>!clean(row.name)||!clean(row.causalEffect))||!clean(c?.jointWorldRule)||!clean(c?.abGameplayEffect)))blockers.push('FLOW_C_TWO_THEMES_AND_CAUSAL_LINK_REQUIRED');
    const genres=Array.isArray(c?.genres)?c.genres:[];
    if(creativeV5&&(genres.length!==2
      ||!['PRIMARY','SECONDARY'].every(role=>genres.some(row=>row.role===role))
      ||new Set(genres.map(row=>clean(row.name).toLowerCase())).size!==2
      ||genres.some(row=>!clean(row.name)||!clean(row.gameplayEffect))
      ||!clean(c?.genreInterlock)))blockers.push('FLOW_C_PRIMARY_SECONDARY_GENRES_GAMEPLAY_REQUIRED');
    if(grammar.delveLayer?.formulaSuffix!=='+ @'||grammar.delveLayer?.role!=='DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS'||(grammar.delveLayer?.elements||[]).length<4)blockers.push('FLOW_AT_DELVE_LAYER_REQUIRED');
    if(!clean(grammar.emergentGenre?.name)||grammar.emergentGenre?.grammarFormula!==(creativeV5?'MAIN × A × B × C + @':'MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @'))blockers.push('FLOW_EMERGENT_COMPOSITE_GENRE_REQUIRED');
    if((grammar.expansionVectors||[]).length<4)blockers.push('FLOW_GRAMMAR_EXPANSION_VECTORS_REQUIRED');
  }
  const quality=architecture.qualityGrowthContract||{};
  if((quality.funDrivers||[]).length<3)blockers.push('FLOW_FUN_DRIVERS_REQUIRED');
  if((quality.balanceRules||[]).length<4)blockers.push('FLOW_BALANCE_RULES_REQUIRED');
  if((quality.expansionRules||[]).length<4)blockers.push('FLOW_EXPANSION_RULES_REQUIRED');
  if((quality.completionCriteria||[]).length<4)blockers.push('FLOW_COMPLETION_CRITERIA_REQUIRED');
  if(quality.codingGrowthContract?.dataDrivenExtensionPreferred!==true)blockers.push('FLOW_CODING_GROWTH_CONTRACT_REQUIRED');
  return{pass:blockers.length===0,blockers,flowArchetypeCount:dna.length,phaseFlowCount:phaseFlows.length,flowAssetRequirementCount:assetRequirements.length,requiredSystemCount:(systemBlueprint.requiredSystems||[]).length,expansionSystemCount:(systemBlueprint.expansionSystems||[]).length};
}
