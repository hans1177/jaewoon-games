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

export function buildGameFlowArchitecture({gameId='',genre='',baseline={},inventory=[]}={}){
  const explicit=explicitArchitecture(baseline);
  if(explicit)return{version:Number(explicit.version||1),source:'SEED_OR_DESIGN_GAME_FLOW_ARCHITECTURE',...explicit};
  const seed=stableInt(`${gameId}|${genre}|${(inventory||[]).map(x=>`${x?.path||''}:${x?.label||''}`).join('|')}`),flowDNA=chooseFlowDNA({gameId,genre,baseline});
  const returnModes=['HUB_RETURN','CONTINUOUS_FORWARD','EXTRACTION_DECISION','MULTI_BASE_ROTATION'];
  const failureModes=['HARD_FAILURE_RETRY','PARTIAL_RESOURCE_LOSS','WORLD_STATE_SETBACK','RELATIONSHIP_OR_ACCESS_COST','TIME_OR_OPPORTUNITY_COST','FORCED_ROUTE_CHANGE'];
  const victoryModes=['BOSS_OR_THREAT_RESOLUTION','ESCAPE_OR_EXTRACTION','ECONOMIC_OR_BUILD_TARGET','TERRITORY_OR_WORLD_CONTROL','MYSTERY_OR_SYSTEM_SOLVED','RELATIONSHIP_OR_SOCIAL_RESOLUTION','SURVIVAL_OR_DURATION_TARGET'];
  const riskTypes=['ENEMY_PRESSURE','RESOURCE_SCARCITY','TIME_PRESSURE','SPACE_OR_ROUTE_DENIAL','ECONOMY_OR_MAINTENANCE_PRESSURE','INFORMATION_UNCERTAINTY'];
  const playstyles=['DIRECT_COMBAT','ECONOMY_AND_BUILD','EXPLORATION_AND_DISCOVERY','SOCIAL_OR_QUEST','STEALTH_OR_AVOIDANCE','TACTICAL_CONTROL'];
  const informationModes=['MAP_DISCOVERY','NPC_KNOWLEDGE','SCOUTING_OR_SENSOR','ITEM_OR_ABILITY_REVEAL','CAUSE_AND_EFFECT_LEARNING'];
  return{
    version:1,source:'DERIVED_GAME_FLOW_ARCHITECT',gameId:clean(gameId),genre:genreKey(genre),
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
  return{pass:blockers.length===0,blockers,flowArchetypeCount:dna.length,phaseFlowCount:phaseFlows.length};
}
