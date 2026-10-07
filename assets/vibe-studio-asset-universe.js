// 파일명: assets/vibe-studio-asset-universe.js
// GRAPHICS_PRODUCTION internal module.
// Unifies asset semantics, compatibility, coverage, identity and 24H gap-fill planning.
// It never promotes prepared assets without native runtime verification.

const text=value=>String(value??'').trim();
const upper=value=>text(value).toUpperCase();
const uniq=values=>[...new Set((values||[]).map(text).filter(Boolean))];
const currentAssetConsumerGameIds=asset=>uniq([...(asset?.consumerGameIds||[]),...(asset?.sourceBoundConsumerGameIds||[])]);
const freezeList=values=>Object.freeze([...(Array.isArray(values)?values:[])]);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

export const STUDIO_ASSET_UNIVERSE_TARGET='HIGH_END_STUDIO_ASSET_UNIVERSE';

export const STUDIO_ASSET_FAMILIES=Object.freeze([
  'CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'
]);

export const STUDIO_ASSET_QUALITY_MAX=120;
export const STUDIO_ASSET_QUALITY_WEIGHTS=Object.freeze({
  SILHOUETTE_FORM:10,
  MODELING_STRUCTURE:10,
  MATERIAL_TEXTURE:10,
  COLOR_LIGHTING:8,
  WORLD_STYLE_COHERENCE:10,
  DETAIL_DENSITY:8,
  MOTION_LIVINGNESS:10,
  GAME_CAMERA_READABILITY:10,
  UI_UX_COHERENCE:8,
  VFX_AUDIO_COHESION:8,
  ORIGINALITY_IDENTITY:8,
  MOBILE_PERFORMANCE:8,
  ACTUAL_GAME_BINDING:6,
  PRODUCTION_VERIFICATION:6
});
export const STUDIO_ASSET_QUALITY_GRADES=Object.freeze([
  Object.freeze({min:116,id:'MASTER_ASSET'}),
  Object.freeze({min:110,id:'HERO_QUALITY'}),
  Object.freeze({min:100,id:'COMMERCIAL_GAME_READY'}),
  Object.freeze({min:85,id:'DEVELOPMENT_READY'}),
  Object.freeze({min:70,id:'PROTOTYPE'}),
  Object.freeze({min:0,id:'REPAIR_REQUIRED'})
]);

export const INTERNAL_ASSET_AUDIT_VERSION=1;
export const INTERNAL_ASSET_AUDIT_MAX=1000;
export const INTERNAL_ASSET_AUDIT_PASS=880;
export const INTERNAL_ASSET_AUDIT_GRADES=Object.freeze([
  Object.freeze({min:980,id:'MASTERPIECE'}),
  Object.freeze({min:950,id:'ELITE'}),
  Object.freeze({min:920,id:'HERO'}),
  Object.freeze({min:880,id:'COMMERCIAL_READY'}),
  Object.freeze({min:840,id:'HIGH_QUALITY'}),
  Object.freeze({min:800,id:'DEVELOPMENT_READY'}),
  Object.freeze({min:700,id:'PROTOTYPE'}),
  Object.freeze({min:0,id:'REPAIR_REQUIRED'})
]);
export const INTERNAL_ASSET_AUDIT_WEIGHTS=Object.freeze({
  IDENTITY_SILHOUETTE:80,
  FORM_STRUCTURE:70,
  MATERIAL_SURFACE:70,
  COLOR_LIGHTING:50,
  STYLE_COHERENCE:70,
  DETAIL_FINISH:70,
  READABILITY_SCALE:60,
  MOTION_RIG:60,
  FEEDBACK_STATES:50,
  UI_UX_SYSTEM:60,
  MODULAR_REUSE:70,
  VARIATION_BREADTH:60,
  PERFORMANCE_LOD:60,
  ACCESSIBILITY_INPUT:50,
  PROVENANCE_MAINTAINABILITY:50,
  INTEGRATION_READINESS:70
});
export const INTERNAL_ASSET_AUDIT_AXIS_APPLICABILITY=Object.freeze({
  CHARACTER:Object.freeze(['IDENTITY_SILHOUETTE','FORM_STRUCTURE','MATERIAL_SURFACE','COLOR_LIGHTING','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','MOTION_RIG','FEEDBACK_STATES','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','ACCESSIBILITY_INPUT','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  CREATURE:Object.freeze(['IDENTITY_SILHOUETTE','FORM_STRUCTURE','MATERIAL_SURFACE','COLOR_LIGHTING','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','MOTION_RIG','FEEDBACK_STATES','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  BUILDING:Object.freeze(['IDENTITY_SILHOUETTE','FORM_STRUCTURE','MATERIAL_SURFACE','COLOR_LIGHTING','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','FEEDBACK_STATES','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  ENVIRONMENT:Object.freeze(['IDENTITY_SILHOUETTE','FORM_STRUCTURE','MATERIAL_SURFACE','COLOR_LIGHTING','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','MOTION_RIG','FEEDBACK_STATES','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  WEAPON:Object.freeze(['IDENTITY_SILHOUETTE','FORM_STRUCTURE','MATERIAL_SURFACE','COLOR_LIGHTING','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','MOTION_RIG','FEEDBACK_STATES','UI_UX_SYSTEM','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','ACCESSIBILITY_INPUT','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  SKILL:Object.freeze(['IDENTITY_SILHOUETTE','MATERIAL_SURFACE','COLOR_LIGHTING','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','MOTION_RIG','FEEDBACK_STATES','UI_UX_SYSTEM','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','ACCESSIBILITY_INPUT','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  MATERIAL:Object.freeze(['MATERIAL_SURFACE','COLOR_LIGHTING','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  AUDIO:Object.freeze(['STYLE_COHERENCE','DETAIL_FINISH','FEEDBACK_STATES','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','ACCESSIBILITY_INPUT','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  VFX:Object.freeze(['IDENTITY_SILHOUETTE','MATERIAL_SURFACE','COLOR_LIGHTING','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','MOTION_RIG','FEEDBACK_STATES','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','ACCESSIBILITY_INPUT','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  UI:Object.freeze(['IDENTITY_SILHOUETTE','FORM_STRUCTURE','MATERIAL_SURFACE','COLOR_LIGHTING','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','MOTION_RIG','FEEDBACK_STATES','UI_UX_SYSTEM','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','ACCESSIBILITY_INPUT','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  MOTION:Object.freeze(['IDENTITY_SILHOUETTE','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','MOTION_RIG','FEEDBACK_STATES','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS']),
  PROP:Object.freeze(['IDENTITY_SILHOUETTE','FORM_STRUCTURE','MATERIAL_SURFACE','COLOR_LIGHTING','STYLE_COHERENCE','DETAIL_FINISH','READABILITY_SCALE','FEEDBACK_STATES','UI_UX_SYSTEM','MODULAR_REUSE','VARIATION_BREADTH','PERFORMANCE_LOD','ACCESSIBILITY_INPUT','PROVENANCE_MAINTAINABILITY','INTEGRATION_READINESS'])
});
export const INTERNAL_ASSET_FAMILY_EXPECTATIONS=Object.freeze({
  CHARACTER:Object.freeze({critical:Object.freeze({IDENTITY_SILHOUETTE:88,FORM_STRUCTURE:85,DETAIL_FINISH:82,MOTION_RIG:82,STYLE_COHERENCE:82}),expectations:Object.freeze(['distinct silhouette at gameplay camera','anatomy/proportion hierarchy','face/hands/feet or equivalent identity detail','material separation','rig and deformation readiness','idle/locomotion/action/hit/death coverage','equipment/socket compatibility','LOD and mobile readability'])}),
  CREATURE:Object.freeze({critical:Object.freeze({IDENTITY_SILHOUETTE:90,FORM_STRUCTURE:86,DETAIL_FINISH:82,MOTION_RIG:84,STYLE_COHERENCE:82}),expectations:Object.freeze(['species-readable body plan','head/mouth/eye/appendage identity','locomotion-specific articulation','attack contact readability','hit/death presentation','surface/material breakup','variants beyond color-only identity','LOD and mobile silhouette'])}),
  BUILDING:Object.freeze({critical:Object.freeze({FORM_STRUCTURE:86,STYLE_COHERENCE:84,DETAIL_FINISH:80,MODULAR_REUSE:82,PERFORMANCE_LOD:80}),expectations:Object.freeze(['modular exterior grammar','door/window/roof/foundation compatibility','interior when gameplay exposes it','collision/nav proxy readiness','prop sockets','material family variants','landmark readability','LOD'])}),
  ENVIRONMENT:Object.freeze({critical:Object.freeze({STYLE_COHERENCE:86,DETAIL_FINISH:82,READABILITY_SCALE:84,MODULAR_REUSE:80,PERFORMANCE_LOD:82}),expectations:Object.freeze(['terrain/biome language','foreground-midground-background depth','landmark route readability','vegetation and rock families','set dressing density','weather/light compatibility','streaming/LOD','mobile clutter control'])}),
  WEAPON:Object.freeze({critical:Object.freeze({IDENTITY_SILHOUETTE:88,DETAIL_FINISH:84,MODULAR_REUSE:82,READABILITY_SCALE:82}),expectations:Object.freeze(['equipped model','world/drop model','inventory icon','crafting icon when craftable','grip/socket map','material variants','damage-state presentation when applicable','LOD'])}),
  SKILL:Object.freeze({critical:Object.freeze({FEEDBACK_STATES:90,READABILITY_SCALE:86,STYLE_COHERENCE:84,PERFORMANCE_LOD:82}),expectations:Object.freeze(['cast anticipation','telegraph','travel/area presentation','impact','reaction','icon','audio role','mobile density variant'])}),
  MATERIAL:Object.freeze({critical:Object.freeze({MATERIAL_SURFACE:92,STYLE_COHERENCE:84,DETAIL_FINISH:84,VARIATION_BREADTH:82}),expectations:Object.freeze(['base material','roughness/specular response','edge/wear logic','platform variant','weathering variant','damage variant when applicable','tile/scale consistency','style-lock compatibility'])}),
  AUDIO:Object.freeze({critical:Object.freeze({STYLE_COHERENCE:84,DETAIL_FINISH:84,VARIATION_BREADTH:82,PROVENANCE_MAINTAINABILITY:90}),expectations:Object.freeze(['event role','variation set','mix priority','loop seam when looping','distance behavior','mobile budget','ducking/overlap policy','license/provenance'])}),
  VFX:Object.freeze({critical:Object.freeze({FEEDBACK_STATES:90,READABILITY_SCALE:86,STYLE_COHERENCE:84,PERFORMANCE_LOD:84}),expectations:Object.freeze(['event binding','anticipation/impact/recovery readability','shape language','density tiers','mobile cap','pooling readiness','occlusion/clutter safety','color-blind readable cues when gameplay relevant'])}),
  UI:Object.freeze({
    FULL_SCREEN_SYSTEM:15,SEARCH_FILTER_SORT:3,STATE_FEEDBACK:4,INPUT_MODE_HINT:3,SCREEN_TRANSITION:4,critical:Object.freeze({UI_UX_SYSTEM:90,ACCESSIBILITY_INPUT:90,FEEDBACK_STATES:86,VARIATION_BREADTH:84,READABILITY_SCALE:88,STYLE_COHERENCE:84}),expectations:Object.freeze(['HUD','inventory','character sheet','equipment','minimap','dialogue/helper','NPC interaction','quest','party','crafting','shop','notification','status effects','hotbar','interaction prompt','touch/keyboard/gamepad states','empty/loading/disabled/selected/error states'])}),
  MOTION:Object.freeze({critical:Object.freeze({MOTION_RIG:94,VARIATION_BREADTH:84,DETAIL_FINISH:86,READABILITY_SCALE:82}),expectations:Object.freeze(['idle','walk','jog/run','start/stop','turn','jump/land','attack','hit','death','blend/interrupt','contact consistency','speed sync','motion LOD'])}),
  PROP:Object.freeze({critical:Object.freeze({IDENTITY_SILHOUETTE:84,DETAIL_FINISH:82,MODULAR_REUSE:84,READABILITY_SCALE:80}),expectations:Object.freeze(['world model','interaction state','inventory icon when item','crafting icon when craftable','drop model when collectible','collision proxy','material variants','LOD'])})
});
export const COMMON_UI_SURFACE_EXPECTATIONS=Object.freeze([
  'HUD','NAVIGATION','INVENTORY','EQUIPMENT','CHARACTER_SHEET','MINIMAP','DIALOGUE','AI_DIALOGUE_HELPER','NPC_INTERACTION',
  'QUEST','PARTY','CRAFTING','SHOP','NOTIFICATION','STATUS_EFFECT','HOTBAR','INTERACTION_PROMPT','TOOLTIP','MODAL',
  'MAIN_MENU','TOP_BAR','SIDE_NAVIGATION','PAUSE','SETTINGS','SEARCH_FILTER_SORT','INVENTORY_FULL','EQUIPMENT_FULL',
  'CHARACTER_DETAIL','MAP_FULL','QUEST_LOG','CRAFTING_FULL','SHOP_FULL','STATE_FEEDBACK','INPUT_HINT','SCREEN_TRANSITION',
  'ITEM_DETAIL','ITEM_COMPARE','ITEM_ACTIONS','ITEM_STATE','INVENTORY_DEEP','STASH','LOOT','QUICKSLOT','RADIAL_ACTION',
  'LOADOUT','EQUIPMENT_DEEP','UPGRADE','REPAIR','DISMANTLE','CRAFTING_DEEP','TRADE','CODEX','RECENT_ITEMS',
  'HOUSING_BUILD','PLACEMENT_FEEDBACK','SANDBOX_EDIT','HOUSING_MANAGEMENT','HOUSING_DECOR','SETTLEMENT','FARMING',
  'AI_COMPANION','NPC_RELATIONSHIP','NPC_MEMORY','NPC_DIALOGUE_DEEP','NPC_SERVICE','NPC_QUEST','PARTY_DEEP',
  'MOUNT_RIDE','MOUNT_SEATING','MOUNT_COMMAND','MOUNT_CARGO','MOUNT_STATUS','TRAVEL','PARRY_FEEDBACK','WORLD_PROP_INTERACTION'
]);

export const COMMON_ENVIRONMENT_BIOME_EXPECTATIONS=Object.freeze([
  'FOREST','SNOW','DESERT','SWAMP','CAVE','COAST','VILLAGE','CITY','RUINS','DUNGEON'
]);

export const COMMON_ENVIRONMENT_ROLE_EXPECTATIONS=Object.freeze([
  'BIOME_KIT','TERRAIN','GROUND_DETAIL','PATH_ROAD','CLIFF','WATER','LANDMARK','SET_DRESSING',
  'TERRAIN_COMPOSITION','VILLAGE_CLUSTER','RUIN_CLUSTER','DISCOVERY_POI','BACKGROUND_LAYER','INTERACTION_PRESENTATION',
  'WEATHER_PRESENTATION','SKY_ATMOSPHERE','LIGHTING_PRESET','SOUNDSCAPE_ROLE'
]);

export const COMMON_TERRAIN_COMPOSITION_EXPECTATIONS=Object.freeze([
  'ROLLING_HILLS','RIDGE_PASS','RIVER_VALLEY','TERRACED_HILLS','MEADOW_BASIN','FOREST_EDGE',
  'VILLAGE_HILL','VILLAGE_CROSSROADS','FARM_HAMLET','CLIFF_SETTLEMENT','COAST_VILLAGE','RUINED_HIGHLAND',
  'MOUNTAIN_FOOT','RIVER_TOWN','SNOW_HAMLET','OASIS_SETTLEMENT','WETLAND_HAMLET','CAVE_OUTPOST',
  'CITY_OUTSKIRTS','RUIN_VALLEY','ISLAND_TERRACES','FOREST_GULLY','DESERT_ESCARPMENT','SNOW_BASIN'
]);

export const COMMON_CREATURE_ECOLOGY_EXPECTATIONS=Object.freeze({
  bodyPlans:Object.freeze(['HUMANOID','BIPED','QUADRUPED','INSECT','ARACHNID','SERPENT','FLYING','AQUATIC','GOLEM','GIANT','UNDEAD','AMORPHOUS']),
  ecologyRoles:Object.freeze(['PREY_GRAZER','PREY_SMALL','PACK_PREDATOR','AMBUSH_PREDATOR','APEX_PREDATOR','SCAVENGER','TERRITORIAL','SWARM','VENOMOUS','AQUATIC_PREDATOR','FLYING_PREDATOR','HUMANOID_FACTION','UNDEAD','CONSTRUCT_GUARDIAN']),
  encounterRanks:Object.freeze(['NORMAL','ALPHA','ELITE','CHAMPION','MINIBOSS','WORLD_BOSS']),
  habitatCompositions:Object.freeze(['FOREST_PREY_PREDATOR','DESERT_SCAVENGER_VENOMOUS','SWAMP_AMBUSH_AQUATIC','CAVE_SWARM_ARACHNID','COAST_AQUATIC_FLYING','SNOW_PACK_GIANT','VILLAGE_HUMANOID_FACTION','RUINS_UNDEAD_GOLEM','DUNGEON_ELITE_CHAMPION'])
});

export const COMMON_PARRY_PRESENTATION_EXPECTATIONS=Object.freeze({
  motion:Object.freeze(['BLOCK_RAISE','BLOCK_HOLD','PARRY_PERFECT','GUARD_BREAK','COUNTER_READY']),
  vfx:Object.freeze(['BLOCK_IMPACT','PARRY_PERFECT_FLASH','GUARD_BREAK_BURST','ATTACK_TELEGRAPH_PULSE','COUNTER_READY_PULSE']),
  ui:Object.freeze(['PARRY_TIMING_INDICATOR','GUARD_METER','GUARD_BREAK_WARNING','COUNTER_READY_INDICATOR','ATTACK_TELEGRAPH_INDICATOR']),
  gameplayTimingAuthority:false,
  damageAuthority:false,
  staminaAuthority:false,
  stunAuthority:false
});



export const COMMON_ENVIRONMENT_STATE_EXPECTATIONS=Object.freeze([
  'CLEAR_DAY','OVERCAST','RAIN','HEAVY_RAIN','THUNDERSTORM','SNOW','BLIZZARD','FOG',
  'STRONG_WIND','WHITE_NIGHT','SOLAR_ECLIPSE','AURORA_NIGHT','SANDSTORM','HEAT_HAZE'
]);

export const COMMON_AMBIENT_SOUNDSCAPE_EXPECTATIONS=Object.freeze({
  layers:Object.freeze(['BED','NEAR_LOOP','DISTANT_LOOP','SCATTER','ONE_SHOT','INTERACTION_SOURCE']),
  sourceGroups:Object.freeze({
    WIND:Object.freeze(['WIND_LIGHT','WIND_SOFT','WIND_GUST','WIND_GALE','WIND_COLD','WIND_SAND']),
    INSECT:Object.freeze(['INSECT_DAY','INSECT_TWILIGHT','NIGHT_INSECT','INSECT_SWARM','INSECT_DRY']),
    ANIMAL:Object.freeze(['BIRD_DAY','DISTANT_BIRD','DISTANT_CROW','FROG','GULL','BAT_SCATTER','DISTANT_WILDLIFE','ANIMAL_YARD']),
    MACHINE:Object.freeze(['MACHINE_HUM','TOOL_WORK','CART_WHEEL','STRUCTURE_RATTLE','SIGN_RATTLE','CHAIN_CREAK'])
  }),
  variationRules:Object.freeze([
    'NO_SINGLE_LOOP_ONLY','VARIATION_SET_FOR_REPEATERS','DISTANCE_BANDS','WEATHER_BLEND',
    'TIME_OF_DAY_VARIANT_OPTIONAL','INTERIOR_EXTERIOR_BLEND','OCCLUSION_ROLE','SCATTER_INTERVAL_WITH_DEDUPE'
  ]),
  actualAudioAssetRequiredForPlayback:true,
  audioPlaybackAuthority:false,
  mixAuthority:false
});

export const INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT=Object.freeze({
  version:1,
  status:'ACTIVE_STUDIO_AUDIO_BREADTH',
  target:'LAYERED_REACTIVE_WORLD_AND_MUSIC_AUDIO_LIBRARY',
  roleTargetMin:180,
  actualVerifiedAudioFileCountSeparateFromRoleCoverage:true,
  music:Object.freeze({
    roles:Object.freeze([
      'TITLE_MENU','SAFE_HOME','EXPLORATION_CALM','EXPLORATION_TENSION','REGION_THEME','CITY_THEME','VILLAGE_THEME',
      'WILDERNESS_THEME','DUNGEON_TENSION','CAVE_THEME','SEA_TRAVEL','STEALTH','DANGER','COMBAT_ENTER',
      'COMBAT_LAYER_LOW','COMBAT_LAYER_MID','COMBAT_LAYER_HIGH','BOSS_INTRO','BOSS_PHASE_LOW','BOSS_PHASE_HIGH',
      'BOSS_FINAL_PHASE','VICTORY','DEFEAT','DISCOVERY','STORY_REVEAL','FACTION_THEME','ERA_THEME','FESTIVAL_EVENT',
      'WEATHER_LAYER','NIGHT_LAYER','ECLIPSE_OR_ANOMALY_LAYER'
    ]),
    transitionAxes:Object.freeze(['LOCATION','THREAT','COMBAT_INTENSITY','BOSS_PHASE','DISCOVERY','TIME_OF_DAY','WEATHER','FACTION','STORY_STATE','SAFE_DANGER_STATE']),
    requirements:Object.freeze(['LOOP_SEAM_OR_CLEAN_ENDING','STEM_OR_LAYER_COMPATIBILITY_WHEN_APPLICABLE','NO_ABRUPT_UNMOTIVATED_RESTART','DUCKING_PRIORITY','MOBILE_BUDGET_VARIANT'])
  }),
  ambience:Object.freeze({
    layers:Object.freeze(['BED','NEAR_LOOP','MID_LOOP','DISTANT_LOOP','SCATTER','ONE_SHOT','INTERACTION_SOURCE','INTERIOR_ROOM_TONE']),
    roles:Object.freeze([
      'WIND_LIGHT','WIND_SOFT','WIND_GUST','WIND_GALE','WIND_COLD','WIND_SAND',
      'RAIN_LIGHT','RAIN_HEAVY','THUNDER_NEAR','THUNDER_FAR','SNOW_HUSH','BLIZZARD_WIND',
      'FOREST_LEAF_RUSTLE','GRASS_WIND','REED_RUSTLE','WATER_STREAM','WATER_RIVER','SURF_NEAR','SURF_DISTANT',
      'CAVE_AIR','WATER_DRIP','STONE_ECHO','CITY_CROWD','VILLAGE_ACTIVITY','MARKET_CROWD','DISTANT_VOICE',
      'MACHINE_HUM','GENERATOR_LOAD','TOOL_WORK','CART_WHEEL','STRUCTURE_CREAK','STRUCTURE_RATTLE',
      'SIGN_RATTLE','CHAIN_CREAK','CLOTH_FLAP','TORCH_BURN','FIREPLACE','RADIO_STATIC'
    ])
  }),
  creatureVocals:Object.freeze({
    roles:Object.freeze([
      'WOLF_HOWL_NEAR','WOLF_HOWL_DISTANT','WOLF_GROWL','WOLF_ATTACK',
      'COYOTE_HOWL_NEAR','COYOTE_HOWL_DISTANT','BEAR_GROWL','BEAR_ROAR','BOAR_GRUNT','BOAR_CHARGE',
      'DEER_CALL','ELK_BUGLE','MOOSE_CALL','BISON_BELLOW','FOX_BARK','RABBIT_DISTRESS',
      'BIRD_DAY','DISTANT_BIRD','DISTANT_CROW','GULL','OWL_NIGHT','BAT_SCATTER',
      'FROG','INSECT_DAY','INSECT_TWILIGHT','NIGHT_INSECT','INSECT_SWARM',
      'MONSTER_IDLE','MONSTER_ALERT','MONSTER_ATTACK','MONSTER_HIT','MONSTER_DEATH',
      'BOSS_VOCAL_INTRO','BOSS_VOCAL_PHASE','BOSS_VOCAL_DEATH'
    ]),
    contextAxes:Object.freeze(['SPECIES','STATE','THREAT','DISTANCE','REGION','TIME_OF_DAY','WEATHER','PACK_OR_SOLO']),
    repeatPolicy:'VARIATION_SET_WITH_COOLDOWN_AND_DEDUPE'
  }),
  gameplaySfx:Object.freeze({
    roles:Object.freeze([
      'FOOTSTEP_SURFACE','LANDING_SURFACE','SWIM_SPLASH','CLIMB_CONTACT',
      'WEAPON_SWING_LIGHT','WEAPON_SWING_HEAVY','WEAPON_HIT_FLESH','WEAPON_HIT_ARMOR','WEAPON_HIT_STONE','WEAPON_HIT_WOOD',
      'BLOCK','PARRY','GUARD_BREAK','CRITICAL_HIT','PROJECTILE_RELEASE','PROJECTILE_FLYBY','PROJECTILE_IMPACT',
      'SKILL_PREPARE','SKILL_CAST','SKILL_TRAVEL','SKILL_IMPACT','SKILL_LOOP','SKILL_END',
      'ITEM_PICKUP','ITEM_DROP','LOOT_COMMON','LOOT_RARE','LOOT_LEGENDARY',
      'CRAFT_START','CRAFT_LOOP','CRAFT_COMPLETE','UPGRADE','REPAIR','DISMANTLE',
      'DOOR_OPEN','DOOR_CLOSE','CHEST_OPEN','SWITCH','LEVER','BREAK_DESTRUCTION'
    ])
  }),
  ui:Object.freeze({
    roles:Object.freeze(['UI_HOVER','UI_CONFIRM','UI_CANCEL','UI_ERROR','UI_WARNING','UI_REWARD','UI_TAB','UI_PAGE','UI_NOTIFICATION','UI_QUEST_UPDATE','UI_LEVEL_UP','UI_PURCHASE','UI_FAIL','UI_SUCCESS'])
  }),
  spatialMix:Object.freeze({
    distanceBands:Object.freeze(['NEAR','MID','FAR','DISTANT']),
    environmentContexts:Object.freeze(['OPEN_AIR','FOREST_DENSE','CAVE','SMALL_INTERIOR','LARGE_INTERIOR','CITY_STREET','UNDERWATER']),
    requirements:Object.freeze([
      'DISTANCE_FALLOFF','OCCLUSION_FILTER_ROLE','REVERB_ZONE_ROLE','INTERIOR_EXTERIOR_BLEND',
      'PRIORITY_DUCKING','SIMULTANEOUS_EVENT_LIMIT','REPEATER_DEDUPE','RANDOMIZED_VARIATION_SET','MOBILE_VOICE_BUDGET'
    ])
  }),
  variation:Object.freeze({
    minimumRepeaterVariantsRecommended:4,
    heroOrHighFrequencyVariantsRecommended:8,
    singleLoopOnlyForbidden:true,
    exactRepeatBurstForbidden:true,
    pitchVolumeVariationMaySupplementButNotReplaceDistinctSourceVariation:true,
    timeWeatherRegionVariantsAllowed:true
  }),
  quality:Object.freeze({
    continual:true,
    oneAndDoneForbidden:true,
    weakestAxisFirst:true,
    axes:Object.freeze([
      'TIMBRE_IDENTITY','TRANSIENT_BODY_TAIL','LOOP_OR_ENDING','VARIATION_BREADTH','SPATIAL_RESPONSE',
      'MIX_PRIORITY','EVENT_SYNC','WORLD_STYLE_COHERENCE','REACTIVE_MUSIC_TRANSITION','MOBILE_BUDGET','PROVENANCE'
    ])
  }),
  productionVerifiedAutomatic:false,
  actualAudioFileRequiredBeforeClaimingPlaybackAsset:true,
  gameplayAuthority:false,
  mixRuntimeAuthority:false
});

export const SEED_ACTION_SURVIVAL_ROGUE_INTERNAL_ASSET_IDEAS=Object.freeze({
  seedId:'seed-action-survival-rogu-echoes-of-the-lost-star',
  sourceGameFacts:Object.freeze({
    gameName:'잃어버린 별의 메아리',
    genre:'SURVIVAL_ACTION_ROGUELITE',
    coreLoop:Object.freeze(['REALTIME_COMBAT','ECHO_SHARD_PICKUP','REALTIME_BUILD_SELECTION','WAVE_ESCALATION','BOSS_WAVE','RUN_RESULT_TO_META_GROWTH']),
    mobilePresentation:'ONE_HAND_PORTRAIT_FIRST_WITH_LANDSCAPE_PARITY',
    currentRuntimeVerified:false
  }),
  rule:'COMMON_PRESENTATION_IDEAS_ONLY_NO_GAMEPLAY_COPY',
  environmentBackgrounds:Object.freeze([
    'ECHO_SHARD_FIELD','ENTROPY_STORM_FRONT','TEMPORAL_RIFT_VALLEY','STARFALL_RUIN_FIELD','ECLIPSE_CRATER',
    'AURORA_RELAY_OUTPOST','WHITE_NIGHT_TUNDRA','FOG_MARSH','VOID_TIDE_COAST','CRASHED_MACHINE_SITE'
  ]),
  items:Object.freeze([
    'ECHO_SHARD_WORLD_MODEL','RUN_BUILD_CORE','META_GROWTH_TOKEN_VISUAL','FIELD_REPAIR_KIT','SIGNAL_BEACON_ITEM',
    'POWER_CELL','RELIC_FRAGMENT','EMERGENCY_LANTERN','COMPASS_TOOL','LORE_TABLET'
  ]),
  props:Object.freeze([
    'ECHO_RELAY','RIFT_ANCHOR','WEATHER_STATION','BROKEN_OBSERVATORY','GENERATOR','SUPPLY_CRATE',
    'SALVAGE_PILE','STAR_MAP_TABLE','WAVE_WARNING_BEACON','BOSS_ARENA_MARKER'
  ]),
  characters:Object.freeze([
    'SURVIVOR_SCOUT','FIELD_ENGINEER','ECHO_RESEARCHER','WANDERER_TRADER','ARMORED_SCAVENGER','RIFT_WATCHER'
  ]),
  menus:Object.freeze([
    'ECHO_SELECTION','RUN_LOADOUT','WAVE_THREAT_HUD','BOSS_WARNING','RUN_RESULT','META_GROWTH',
    'REGION_STATE','WEATHER_WARNING','RELIC_CODEX','ONE_HAND_PORTRAIT_ACTION_HUD','AUDIO_ACCESSIBILITY','ENVIRONMENT_ACCESSIBILITY'
  ]),
  ambientAudio:Object.freeze([
    'ECHO_RESONANCE','ENTROPY_HUM','RIFT_SHIMMER','WIND_LAYERED','INSECT_SCATTER','WILDLIFE_DISTANCE',
    'GENERATOR_HUM','RADIO_STATIC','THUNDER_NEAR_FAR','RUIN_CREAK','CLOTH_FLAP','TOOL_WORK'
  ]),
  coupling:Object.freeze([
    'ENVIRONMENT_STATE>SKY_BACKGROUND>SURFACE_RESPONSE>SOUNDSCAPE>OPTIONAL_UI_CUE',
    'ECHO_SHARD_DROP>WORLD_MODEL>PICKUP_VFX>PICKUP_AUDIO_ROLE>HUD_FEEDBACK',
    'ECHO_SELECTION>CHOICE_CARD>BUILD_CHANGE_PRESENTATION',
    'WAVE_STATE>BACKGROUND_PRESSURE>THREAT_HUD>BOSS_WARNING',
    'BIOME>WILDLIFE_AUDIO>PROP_SET>CHARACTER_WARDROBE',
    'WIND>FOLIAGE_CLOTH_PROP_MOTION>WIND_AUDIO_LAYER',
    'MACHINE_PROP>MACHINE_SOUND_ROLE>DISTANCE_OCCLUSION>INTERACTION_ONE_SHOT',
    'ECLIPSE>CELESTIAL_BACKGROUND>AMBIENT_HUSH>WILDLIFE_SILENCE_TRANSITION',
    'RAIN_OR_SNOW>BACKGROUND_VISIBILITY>SURFACE_PRESENTATION>FOOTSTEP_MATERIAL_AUDIO_ROLE',
    'RUN_RESULT>META_GROWTH_PRESENTATION>RETURN_TO_NEXT_RUN_MENU'
  ]),
  gameplayAuthority:false,
  balanceAuthority:false,
  saveAuthority:false,
  networkAuthority:false
});

export const COMPANY_COMMON_SEED_ASSET_IDEA_AXES=Object.freeze({
  version:1,
  scope:'ALL_COMPANY_COMMON_SEEDS',
  sourcePattern:'artbook-submissions/seed-*/current.json',
  gameplaySignals:Object.freeze([
    'ACTION_COMBAT','SURVIVAL','ROGUELITE_RUN','RPG_PROGRESSION','PUZZLE','CASUAL_SHORT_RUN','IDLE_GROWTH',
    'TYCOON_SIM','SOCIAL_ROLEPLAY','HORROR','DEFENSE','NARRATIVE','EXPLORATION','SANDBOX_HOUSING',
    'COZY_FARMING','COOP_MULTIPLAYER'
  ]),
  worldThemes:Object.freeze([
    'CELESTIAL_COSMIC','NATURAL_WILDERNESS','SETTLEMENT_SOCIAL','INDUSTRIAL_MACHINE',
    'FANTASY_RUINS','HORROR_INTERIOR','ABSTRACT_COLOR','FORTRESS_LANES','UNIVERSAL_STYLE_ADAPTIVE'
  ]),
  stateAxes:Object.freeze([
    'BASE','TIME_OF_DAY','WEATHER','SEASON','CELESTIAL_EVENT','DISASTER','REGIONAL_VARIANT',
    'WET_DRY','DIRT_MUD','SNOW_FROST','HEAT_COLD','DAMAGE_WEAR','CORROSION','POWERED_UNPOWERED',
    'ACTIVE_INACTIVE','LOCKED_UNLOCKED','COMMON_RARE_LEGENDARY','UPGRADE_STAGE','MOBILE_LOW_DENSITY'
  ]),
  assetDomains:Object.freeze([
    'UI','ITEM','WEAPON','CHARACTER_GEAR','SKILL','VFX','MOTION','MATERIAL','ENVIRONMENT',
    'BUILDING','WORLD_PROP','CREATURE','FOLIAGE','PRESENTATION','AUDIO'
  ]),
  crossFamilyCompositionRequired:true,
  gameplayAuthority:false,
  balanceAuthority:false,
  saveAuthority:false,
  networkAuthority:false
});

const COMPANY_COMMON_SEED_SIGNAL_RULES=Object.freeze([
  Object.freeze({id:'ACTION_COMBAT',keywords:Object.freeze(['ACTION','COMBAT','BOSS','ENEMY','SKILL','WEAPON','전투','보스','적 ','스킬','무기'])}),
  Object.freeze({id:'SURVIVAL',keywords:Object.freeze(['SURVIVAL','SURVIVE','RESOURCE','THREAT','생존','자원','위협'])}),
  Object.freeze({id:'ROGUELITE_RUN',keywords:Object.freeze(['ROGUELITE','ROGUE','WAVE','BUILD SELECTION','RUN RESULT','런','웨이브','빌드'])}),
  Object.freeze({id:'RPG_PROGRESSION',keywords:Object.freeze(['RPG','LEVEL','EQUIPMENT','QUEST','HERO','SKILL GROWTH','레벨','장비','퀘스트','영웅','성장'])}),
  Object.freeze({id:'PUZZLE',keywords:Object.freeze(['PUZZLE','BOARD','GRID','MATCH','COMBO','퍼즐','보드','연쇄'])}),
  Object.freeze({id:'CASUAL_SHORT_RUN',keywords:Object.freeze(['CASUAL','ONE HAND','ONE-HAND','SHORT SESSION','QUICK RETRY','캐주얼','한 손','짧은','재도전'])}),
  Object.freeze({id:'IDLE_GROWTH',keywords:Object.freeze(['IDLE','OFFLINE','AUTO BATTLE','방치','오프라인','자동 전투'])}),
  Object.freeze({id:'TYCOON_SIM',keywords:Object.freeze(['TYCOON','SIMULATOR','SIMULATION','INCOME','PRODUCTION','FOUNDRY','타이쿤','경영','수익','생산'])}),
  Object.freeze({id:'SOCIAL_ROLEPLAY',keywords:Object.freeze(['ROLEPLAY','SOCIAL','AVATAR','JOB','VEHICLE','SHARED SOCIAL','역할놀이','아바타','직업','차량','사회'])}),
  Object.freeze({id:'HORROR',keywords:Object.freeze(['HORROR','DREAD','ESCAPE','CHASE','DARK','공포','탈출','추격','어둠'])}),
  Object.freeze({id:'DEFENSE',keywords:Object.freeze(['DEFENSE','TOWER','LANE','BASTION','DEFENDER','디펜스','타워','보루','방어'])}),
  Object.freeze({id:'NARRATIVE',keywords:Object.freeze(['STORY','NARRATIVE','ENDING','DIALOGUE','CHARACTER RELATIONSHIP','스토리','서사','엔딩','대화'])}),
  Object.freeze({id:'EXPLORATION',keywords:Object.freeze(['EXPLORE','EXPLORATION','WORLD AREA','REGION','TRAVEL','DISCOVER','탐험','지역','여행','발견'])}),
  Object.freeze({id:'SANDBOX_HOUSING',keywords:Object.freeze(['HOUSING','HOME CUSTOMIZATION','PLACEMENT','CONSTRUCTION','BUILD MODE','SANDBOX','집 꾸미기','배치','건설'])}),
  Object.freeze({id:'COZY_FARMING',keywords:Object.freeze(['COZY','FARM','FARMING','CROP','COOKING','ANIMAL HOME','농사','농장','작물','요리'])}),
  Object.freeze({id:'COOP_MULTIPLAYER',keywords:Object.freeze(['COOP','MULTIPLAYER','OTHER PLAYERS','SHARED OBJECTIVE','GROUP ACTIVITY','협동','멀티','다른 플레이어'])})
]);

const COMPANY_COMMON_SEED_WORLD_RULES=Object.freeze([
  Object.freeze({id:'CELESTIAL_COSMIC',keywords:Object.freeze(['STAR','CELESTIAL','CRYSTAL','SHARD','ECHO','REALM','별','천상','수정','파편','메아리'])}),
  Object.freeze({id:'NATURAL_WILDERNESS',keywords:Object.freeze(['SURVIVAL','FOREST','WILDERNESS','NATURE','RESOURCE','생존','숲','야생','자원'])}),
  Object.freeze({id:'SETTLEMENT_SOCIAL',keywords:Object.freeze(['HARBOR','SOCIAL','AVATAR','HOME','JOB','VEHICLE','ROLEPLAY','항구','아바타','주거','직업'])}),
  Object.freeze({id:'INDUSTRIAL_MACHINE',keywords:Object.freeze(['FOUNDRY','TYCOON','MACHINE','PRODUCTION','FACTORY','공장','기계','생산','타이쿤'])}),
  Object.freeze({id:'FANTASY_RUINS',keywords:Object.freeze(['RPG','FANTASY','ELDORIA','QUEST','MAGIC','ADVENTURE','판타지','퀘스트','마법','모험'])}),
  Object.freeze({id:'HORROR_INTERIOR',keywords:Object.freeze(['HORROR','LANTERN','DOOR','DARK','ESCAPE','공포','랜턴','문','어둠','탈출'])}),
  Object.freeze({id:'ABSTRACT_COLOR',keywords:Object.freeze(['CHROMATIC','COLOR','PUZZLE','GRID','MATCH','색채','색','퍼즐','보드'])}),
  Object.freeze({id:'FORTRESS_LANES',keywords:Object.freeze(['BASTION','DEFENSE','TOWER','LANE','FORTRESS','보루','방어','타워','길목'])})
]);

const COMPANY_COMMON_SEED_DOMAIN_STATE_DEFAULTS=Object.freeze({
  UI:Object.freeze(['BASE','ACTIVE_INACTIVE','LOCKED_UNLOCKED','MOBILE_LOW_DENSITY']),
  ITEM:Object.freeze(['BASE','COMMON_RARE_LEGENDARY','DAMAGE_WEAR','REGIONAL_VARIANT']),
  WEAPON:Object.freeze(['BASE','UPGRADE_STAGE','DAMAGE_WEAR','COMMON_RARE_LEGENDARY']),
  CHARACTER_GEAR:Object.freeze(['BASE','REGIONAL_VARIANT','SEASON','DAMAGE_WEAR','UPGRADE_STAGE']),
  SKILL:Object.freeze(['BASE','COMMON_RARE_LEGENDARY','MOBILE_LOW_DENSITY']),
  VFX:Object.freeze(['BASE','MOBILE_LOW_DENSITY','WEATHER','CELESTIAL_EVENT']),
  MOTION:Object.freeze(['BASE','ACTIVE_INACTIVE','DAMAGE_WEAR']),
  MATERIAL:Object.freeze(['BASE','WET_DRY','DIRT_MUD','SNOW_FROST','HEAT_COLD','DAMAGE_WEAR','CORROSION']),
  ENVIRONMENT:Object.freeze(['BASE','TIME_OF_DAY','WEATHER','SEASON','CELESTIAL_EVENT','DISASTER','REGIONAL_VARIANT']),
  BUILDING:Object.freeze(['BASE','REGIONAL_VARIANT','DAMAGE_WEAR','POWERED_UNPOWERED','WEATHER']),
  WORLD_PROP:Object.freeze(['BASE','ACTIVE_INACTIVE','POWERED_UNPOWERED','DAMAGE_WEAR','WEATHER']),
  CREATURE:Object.freeze(['BASE','REGIONAL_VARIANT','SEASON','COMMON_RARE_LEGENDARY']),
  FOLIAGE:Object.freeze(['BASE','SEASON','WEATHER','REGIONAL_VARIANT']),
  PRESENTATION:Object.freeze(['BASE','TIME_OF_DAY','WEATHER','CELESTIAL_EVENT','MOBILE_LOW_DENSITY']),
  AUDIO:Object.freeze(['BASE','TIME_OF_DAY','WEATHER','REGIONAL_VARIANT','MOBILE_LOW_DENSITY'])
});

export const COMPANY_COMMON_SEED_ASSET_IDEA_RECIPES=Object.freeze([
  Object.freeze({id:'UNIVERSAL_WORLD_STATE',signals:Object.freeze(['ALWAYS']),ideas:Object.freeze([
    Object.freeze({domain:'ENVIRONMENT',ideaId:'CLIMATE_SKY_DEPTH_STACK',role:'WEATHER_TIME_CELESTIAL_BACKGROUND'}),
    Object.freeze({domain:'MATERIAL',ideaId:'WEATHER_REACTIVE_SURFACE_SET',role:'WET_SNOW_DIRT_HEAT_COLD_DAMAGE'}),
    Object.freeze({domain:'PRESENTATION',ideaId:'DISTANT_WORLD_EVENT_BACKGROUNDS',role:'FOREGROUND_MIDGROUND_BACKGROUND_EVENT_DEPTH'}),
    Object.freeze({domain:'VFX',ideaId:'WEATHER_WORLD_EFFECT_LANGUAGE',role:'ENVIRONMENT_WEATHER_EVENT'}),
    Object.freeze({domain:'AUDIO',ideaId:'BIOME_WEATHER_SOUND_ROLE_MATRIX',role:'WIND_WATER_WILDLIFE_MACHINE_STRUCTURE_CLIMATE'}),
    Object.freeze({domain:'FOLIAGE',ideaId:'WIND_AND_SEASON_FOLIAGE_VARIANTS',role:'WIND_SEASON_WEATHER_RESPONSE'})
  ])}),
  Object.freeze({id:'UNIVERSAL_MOBILE_ACCESSIBILITY',signals:Object.freeze(['ALWAYS']),ideas:Object.freeze([
    Object.freeze({domain:'UI',ideaId:'ONE_HAND_CONTEXT_ACTION_LAYOUTS',role:'TOUCH_FIRST_CONTEXTUAL_CONTROLS'}),
    Object.freeze({domain:'PRESENTATION',ideaId:'REDUCED_MOTION_FEEDBACK_VARIANTS',role:'ACCESSIBILITY_REDUCED_MOTION'}),
    Object.freeze({domain:'VFX',ideaId:'MOBILE_EFFECT_DENSITY_TIERS',role:'MOBILE_DENSITY'}),
    Object.freeze({domain:'AUDIO',ideaId:'MOBILE_AUDIO_PRIORITY_ROLES',role:'MOBILE_BUDGET_VARIANT'})
  ])}),
  Object.freeze({id:'COMBAT_READABILITY',signals:Object.freeze(['ACTION_COMBAT']),ideas:Object.freeze([
    Object.freeze({domain:'WEAPON',ideaId:'WEAPON_IMPACT_SOCKET_VARIANTS',role:'IMPACT_TRAIL_SOCKET'}),
    Object.freeze({domain:'SKILL',ideaId:'CAST_TELEGRAPH_IMPACT_CHAIN',role:'CAST_TELEGRAPH_TRAVEL_IMPACT'}),
    Object.freeze({domain:'VFX',ideaId:'CRITICAL_DODGE_COUNTER_LANGUAGE',role:'CRITICAL_DODGE_COUNTER_FEEDBACK'}),
    Object.freeze({domain:'MOTION',ideaId:'ANTICIPATION_IMPACT_RECOVERY_SET',role:'COMBAT_TIMING_LANGUAGE'}),
    Object.freeze({domain:'UI',ideaId:'COMBAT_THREAT_COMBO_HUD',role:'THREAT_COMBO_BOSS_READABILITY'}),
    Object.freeze({domain:'AUDIO',ideaId:'COMBAT_DISTANCE_AUDIO_ROLES',role:'SWING_HIT_BLOCK_SKILL_BOSS'})
  ])}),
  Object.freeze({id:'SURVIVAL_WORLD_PRESSURE',signals:Object.freeze(['SURVIVAL']),ideas:Object.freeze([
    Object.freeze({domain:'WORLD_PROP',ideaId:'CAMP_SURVIVAL_INTERACTION_KIT',role:'CAMP_STORAGE_REPAIR_LIGHT_SIGNAL'}),
    Object.freeze({domain:'ITEM',ideaId:'FIELD_NAVIGATION_SURVIVAL_ITEMS',role:'REPAIR_SIGNAL_NAVIGATION_RESEARCH'}),
    Object.freeze({domain:'MOTION',ideaId:'FATIGUE_INJURY_WORK_MOTIONS',role:'FATIGUE_INJURY_CARRY_GATHER_REPAIR'}),
    Object.freeze({domain:'UI',ideaId:'SURVIVAL_REGION_PRESSURE_HUD',role:'VITALS_WEATHER_REGION_RISK'}),
    Object.freeze({domain:'CREATURE',ideaId:'WILDLIFE_HABITAT_VARIATION_SET',role:'ECOLOGY_HABITAT_RANK_VARIATION'})
  ])}),
  Object.freeze({id:'ROGUELITE_RUN',signals:Object.freeze(['ROGUELITE_RUN']),ideas:Object.freeze([
    Object.freeze({domain:'UI',ideaId:'REALTIME_BUILD_SELECTION_CARDS',role:'BUILD_SELECTION_ONE_HAND'}),
    Object.freeze({domain:'ITEM',ideaId:'RUN_TOKEN_SHARD_WORLD_SET',role:'RUN_RESOURCE_WORLD_DROP'}),
    Object.freeze({domain:'VFX',ideaId:'LOOT_BUILD_UPGRADE_BURST_SET',role:'LOOT_RARITY_UPGRADE'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'WAVE_WARNING_WORLD_BEACONS',role:'WAVE_WARNING_BOSS_ARENA_SIGNAL'}),
    Object.freeze({domain:'ENVIRONMENT',ideaId:'RUN_PRESSURE_BACKGROUND_STAGES',role:'WAVE_PRESSURE_BACKGROUND'}),
    Object.freeze({domain:'PRESENTATION',ideaId:'RUN_RESULT_META_RETURN_PRESENTATION',role:'RUN_RESULT_META_GROWTH_RETURN'})
  ])}),
  Object.freeze({id:'RPG_PROGRESSION',signals:Object.freeze(['RPG_PROGRESSION']),ideas:Object.freeze([
    Object.freeze({domain:'CHARACTER_GEAR',ideaId:'RPG_SET_IDENTITY_GEAR_LAYERS',role:'SET_IDENTITY_SOCKET_UPGRADE_TRANSMOG'}),
    Object.freeze({domain:'ITEM',ideaId:'QUEST_RELIC_LORE_ITEM_FAMILIES',role:'QUEST_RELIC_LORE_KEY_TREASURE'}),
    Object.freeze({domain:'UI',ideaId:'RPG_QUEST_EQUIPMENT_CODEX_SCREENS',role:'QUEST_EQUIPMENT_CODEX_LOADOUT'}),
    Object.freeze({domain:'ENVIRONMENT',ideaId:'REGION_FACTION_LANDMARK_KIT',role:'REGION_FACTION_DISCOVERY'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'VENDOR_CAMP_SERVICE_PROP_KIT',role:'VENDOR_CAMP_SERVICE_QUEST'}),
    Object.freeze({domain:'PRESENTATION',ideaId:'RPG_BOSS_RELIC_PRESENTATION',role:'CHAPTER_BOSS_RELIC_HERO_MOMENT'})
  ])}),
  Object.freeze({id:'PUZZLE_CASCADE',signals:Object.freeze(['PUZZLE']),ideas:Object.freeze([
    Object.freeze({domain:'UI',ideaId:'PUZZLE_BOARD_GOAL_MOVE_UI',role:'BOARD_GOAL_MOVE_HINT'}),
    Object.freeze({domain:'VFX',ideaId:'PUZZLE_CASCADE_FEEDBACK_KIT',role:'MATCH_COMBO_CASCADE_CLEAR'}),
    Object.freeze({domain:'MATERIAL',ideaId:'PUZZLE_TILE_STATE_MATERIALS',role:'TILE_LOCKED_ACTIVE_DAMAGED_SPECIAL'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'PUZZLE_SWITCH_AND_OBSTACLE_PROPS',role:'SWITCH_OBSTACLE_GOAL_OBJECT'}),
    Object.freeze({domain:'AUDIO',ideaId:'PUZZLE_COMBO_AUDIO_ROLES',role:'MATCH_COMBO_CLEAR_ERROR'}),
    Object.freeze({domain:'PRESENTATION',ideaId:'PUZZLE_LEVEL_TRANSITION_SET',role:'LEVEL_ENTRY_CLEAR_FAIL_RETRY'})
  ])}),
  Object.freeze({id:'CASUAL_SHORT_RUN',signals:Object.freeze(['CASUAL_SHORT_RUN']),ideas:Object.freeze([
    Object.freeze({domain:'UI',ideaId:'CASUAL_ONE_HAND_RUN_HUD',role:'ONE_ACTION_SCORE_DISTANCE_RISK'}),
    Object.freeze({domain:'VFX',ideaId:'CASUAL_PICKUP_STREAK_VFX',role:'PICKUP_STREAK_REWARD'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'CASUAL_ROUTE_CHOICE_WORLD_PROPS',role:'ROUTE_CHOICE_RISK_REWARD'}),
    Object.freeze({domain:'PRESENTATION',ideaId:'CASUAL_FAST_RETRY_PRESENTATION',role:'FAIL_RESULT_FAST_RETRY'}),
    Object.freeze({domain:'ITEM',ideaId:'CASUAL_COLLECTION_ITEM_FAMILY',role:'COLLECTIBLE_REWARD'})
  ])}),
  Object.freeze({id:'IDLE_GROWTH',signals:Object.freeze(['IDLE_GROWTH']),ideas:Object.freeze([
    Object.freeze({domain:'UI',ideaId:'OFFLINE_REWARD_GROWTH_UI',role:'OFFLINE_REWARD_FORMATION_UPGRADE'}),
    Object.freeze({domain:'CHARACTER_GEAR',ideaId:'GROWTH_STAGE_GEAR_VARIANTS',role:'VISIBLE_GROWTH_STAGE'}),
    Object.freeze({domain:'VFX',ideaId:'ASCENSION_GROWTH_VFX',role:'LEVEL_UP_ASCENSION_UPGRADE'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'IDLE_GROWTH_SHRINE_MACHINE_PROPS',role:'GROWTH_RESOURCE_PRODUCTION'}),
    Object.freeze({domain:'PRESENTATION',ideaId:'RETURN_SUMMARY_PRESENTATION',role:'RETURN_OFFLINE_SUMMARY'})
  ])}),
  Object.freeze({id:'TYCOON_MACHINE_LIFECYCLE',signals:Object.freeze(['TYCOON_SIM']),ideas:Object.freeze([
    Object.freeze({domain:'WORLD_PROP',ideaId:'TYCOON_MACHINE_LIFECYCLE_KIT',role:'PRODUCTION_SERVICE_MACHINE'}),
    Object.freeze({domain:'BUILDING',ideaId:'TYCOON_SERVICE_BUILDING_TIERS',role:'SERVICE_PRODUCTION_UPGRADE'}),
    Object.freeze({domain:'UI',ideaId:'TYCOON_QUEUE_CAPACITY_DASHBOARD',role:'QUEUE_CAPACITY_INCOME_MAINTENANCE'}),
    Object.freeze({domain:'MOTION',ideaId:'STAFF_WORK_REPAIR_MOTION_SET',role:'STAFF_WORK_CARRY_REPAIR_CLEAN'}),
    Object.freeze({domain:'MATERIAL',ideaId:'MACHINE_WEAR_REPAIR_MATERIALS',role:'CLEAN_WORN_DIRTY_CORRODED_REPAIRED'}),
    Object.freeze({domain:'AUDIO',ideaId:'TYCOON_MACHINE_AUDIO_ROLES',role:'MACHINE_HUM_TOOL_WORK_WARNING'})
  ])}),
  Object.freeze({id:'SOCIAL_ROLEPLAY_LIFE',signals:Object.freeze(['SOCIAL_ROLEPLAY']),ideas:Object.freeze([
    Object.freeze({domain:'CHARACTER_GEAR',ideaId:'ROLEPLAY_IDENTITY_LIFE_KIT',role:'JOB_ROLE_SOCIAL_OUTFIT'}),
    Object.freeze({domain:'BUILDING',ideaId:'ROLEPLAY_HOME_SERVICE_BUILDINGS',role:'HOME_JOB_SERVICE_SOCIAL'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'ROLEPLAY_LIFE_PROP_FAMILY',role:'HOME_JOB_VEHICLE_SOCIAL_INTERACTION'}),
    Object.freeze({domain:'UI',ideaId:'ROLE_JOB_SOCIAL_UI',role:'ROLE_JOB_HOME_SOCIAL_ACTIVITY'}),
    Object.freeze({domain:'MOTION',ideaId:'SOCIAL_EMOTE_JOB_MOTION_SET',role:'EMOTE_JOB_SOCIAL_INTERACTION'}),
    Object.freeze({domain:'AUDIO',ideaId:'SOCIAL_SPACE_AMBIENT_ROLES',role:'CITY_HOME_MARKET_VEHICLE_SOCIAL'})
  ])}),
  Object.freeze({id:'HORROR_TENSION_ESCALATION',signals:Object.freeze(['HORROR']),ideas:Object.freeze([
    Object.freeze({domain:'ENVIRONMENT',ideaId:'HORROR_TENSION_ESCALATION_KIT',role:'VISIBILITY_THREAT_SAFEPOINT_ESCALATION'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'INVESTIGATION_KEY_SAFEPOINT_PROPS',role:'INVESTIGATION_KEY_CLUE_SAFEPOINT'}),
    Object.freeze({domain:'VFX',ideaId:'HORROR_THREAT_FLASH_VFX',role:'THREAT_REVEAL_CHASE_WARNING'}),
    Object.freeze({domain:'AUDIO',ideaId:'HORROR_DISTANCE_TENSION_AUDIO',role:'DISTANCE_THREAT_STRUCTURE_CREAK_RADIO'}),
    Object.freeze({domain:'MATERIAL',ideaId:'DAMP_RUST_GRIME_HORROR_MATERIALS',role:'DAMP_DIRT_CORROSION_DAMAGE'}),
    Object.freeze({domain:'PRESENTATION',ideaId:'HORROR_ACCESSIBLE_TRANSITIONS',role:'THREAT_ENTRY_FAIL_SAFE_REDUCED_FLASH'})
  ])}),
  Object.freeze({id:'DEFENSE_WAVE_COMMAND',signals:Object.freeze(['DEFENSE']),ideas:Object.freeze([
    Object.freeze({domain:'UI',ideaId:'DEFENSE_WAVE_COMMAND_KIT',role:'WAVE_BASE_RANGE_UPGRADE_BOSS'}),
    Object.freeze({domain:'BUILDING',ideaId:'DEFENSE_TOWER_BASE_TIERS',role:'TOWER_DEFENDER_BASE'}),
    Object.freeze({domain:'VFX',ideaId:'DEFENSE_RANGE_TELEGRAPH_VFX',role:'RANGE_TARGET_WAVE_BOSS_TELEGRAPH'}),
    Object.freeze({domain:'CREATURE',ideaId:'LANE_ENEMY_RANK_SILHOUETTES',role:'LANE_GRUNT_ELITE_BOSS'}),
    Object.freeze({domain:'ENVIRONMENT',ideaId:'DEFENSE_LANE_BACKGROUND_PRESSURE',role:'LANE_ROUTE_WAVE_PRESSURE'}),
    Object.freeze({domain:'AUDIO',ideaId:'DEFENSE_WAVE_BOSS_AUDIO_ROLES',role:'WAVE_START_BASE_HIT_BOSS_WARNING_CLEAR'})
  ])}),
  Object.freeze({id:'NARRATIVE_QUEST_WORLD',signals:Object.freeze(['NARRATIVE']),ideas:Object.freeze([
    Object.freeze({domain:'UI',ideaId:'NARRATIVE_DIALOGUE_HISTORY_UI',role:'DIALOGUE_CHOICE_HISTORY_RELATIONSHIP'}),
    Object.freeze({domain:'CHARACTER_GEAR',ideaId:'FACTION_STORY_WARDROBE_SET',role:'FACTION_REGION_STORY_ROLE'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'QUEST_LORE_STORY_PROP_SET',role:'QUEST_LORE_CLUE_STORY_OBJECT'}),
    Object.freeze({domain:'MOTION',ideaId:'DIALOGUE_ACTING_GESTURE_SET',role:'DIALOGUE_REACTION_HANDOFF_CEREMONY'}),
    Object.freeze({domain:'PRESENTATION',ideaId:'CHAPTER_STORY_TRANSITION_SET',role:'CHAPTER_ENTRY_REVEAL_ENDING'}),
    Object.freeze({domain:'AUDIO',ideaId:'NARRATIVE_MUSIC_DIALOGUE_ROLES',role:'DIALOGUE_UI_STORY_TRANSITION_REVEAL'})
  ])}),
  Object.freeze({id:'EXPLORATION_DISCOVERY',signals:Object.freeze(['EXPLORATION']),ideas:Object.freeze([
    Object.freeze({domain:'ENVIRONMENT',ideaId:'DISCOVERY_LANDMARK_REGION_KIT',role:'LANDMARK_POI_ROUTE_REGION'}),
    Object.freeze({domain:'UI',ideaId:'MAP_POI_DISCOVERY_UI',role:'MAP_POI_ROUTE_DISCOVERY'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'FIELD_EXPLORATION_PROP_KIT',role:'SIGNPOST_CAMP_BEACON_RESEARCH'}),
    Object.freeze({domain:'ITEM',ideaId:'EXPLORATION_TOOL_ITEM_SET',role:'COMPASS_CAMERA_SCANNER_MARKER'}),
    Object.freeze({domain:'AUDIO',ideaId:'BIOME_DISCOVERY_AUDIO_LAYERS',role:'BIOME_WILDLIFE_WIND_WATER_DISCOVERY'}),
    Object.freeze({domain:'FOLIAGE',ideaId:'EXPLORATION_FOLIAGE_BIOME_SET',role:'BIOME_ROUTE_LANDMARK_DENSITY'})
  ])}),
  Object.freeze({id:'SANDBOX_HOUSING',signals:Object.freeze(['SANDBOX_HOUSING']),ideas:Object.freeze([
    Object.freeze({domain:'BUILDING',ideaId:'MODULAR_HOUSING_CONSTRUCTION_KIT',role:'FOUNDATION_WALL_WINDOW_DOOR_ROOF_STAIRS'}),
    Object.freeze({domain:'UI',ideaId:'SANDBOX_PLACEMENT_EDIT_UI',role:'PLACE_ROTATE_MOVE_COPY_DELETE_UNDO'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'HOUSING_FURNITURE_STORAGE_PROP_SET',role:'FURNITURE_STORAGE_LIGHT_DECOR'}),
    Object.freeze({domain:'MATERIAL',ideaId:'HOUSING_MATERIAL_PALETTE_SET',role:'WALL_FLOOR_ROOF_TRIM_THEME'}),
    Object.freeze({domain:'MOTION',ideaId:'BUILD_CARRY_PLACE_MOTION_SET',role:'CARRY_BUILD_REPAIR_PLACE'}),
    Object.freeze({domain:'VFX',ideaId:'PLACEMENT_VALIDATION_VFX',role:'VALID_INVALID_SNAP_SUPPORT'})
  ])}),
  Object.freeze({id:'COZY_FARMING_LIFE',signals:Object.freeze(['COZY_FARMING']),ideas:Object.freeze([
    Object.freeze({domain:'FOLIAGE',ideaId:'SEASONAL_CROP_FOLIAGE_SET',role:'CROP_FLOWER_TREE_SEASON_GROWTH'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'FARM_PROCESSING_LIFE_PROPS',role:'PLOT_PROCESSING_ANIMAL_HOME_STORAGE'}),
    Object.freeze({domain:'ITEM',ideaId:'FARM_SEED_PRODUCE_ITEM_FAMILIES',role:'SEED_PRODUCE_FEED_INGREDIENT'}),
    Object.freeze({domain:'UI',ideaId:'FARM_RELATIONSHIP_COLLECTION_UI',role:'PLOT_HARVEST_COLLECTION_RELATIONSHIP'}),
    Object.freeze({domain:'MOTION',ideaId:'FARM_COOK_CARE_MOTION_SET',role:'PLANT_WATER_HARVEST_FEED_COOK'}),
    Object.freeze({domain:'MATERIAL',ideaId:'SOIL_WET_SEASON_MATERIAL_SET',role:'SOIL_MUD_WET_DRY_SEASON'}),
    Object.freeze({domain:'AUDIO',ideaId:'FARM_INSECT_ANIMAL_AUDIO_ROLES',role:'INSECT_BIRD_ANIMAL_TOOL_WATER'})
  ])}),
  Object.freeze({id:'COOP_SHARED_ACTION',signals:Object.freeze(['COOP_MULTIPLAYER']),ideas:Object.freeze([
    Object.freeze({domain:'UI',ideaId:'COOP_PARTY_MARKER_PING_UI',role:'PARTY_MARKER_PING_SHARED_OBJECTIVE'}),
    Object.freeze({domain:'CHARACTER_GEAR',ideaId:'COOP_ROLE_IDENTITY_GEAR',role:'TEAM_ROLE_IDENTITY'}),
    Object.freeze({domain:'VFX',ideaId:'REVIVE_SHARED_OBJECTIVE_VFX',role:'REVIVE_PING_SHARED_GOAL'}),
    Object.freeze({domain:'MOTION',ideaId:'PAIR_REVIVE_CARRY_MOTIONS',role:'PAIR_REVIVE_CARRY_HANDOFF'}),
    Object.freeze({domain:'WORLD_PROP',ideaId:'COOP_RALLY_WORLD_PROP',role:'RALLY_READY_SHARED_OBJECTIVE'}),
    Object.freeze({domain:'AUDIO',ideaId:'COOP_PING_TEAM_AUDIO_ROLES',role:'PING_READY_REVIVE_OBJECTIVE'})
  ])})
]);

export const COMPANY_COMMON_SEED_CROSS_GENRE_IDEA_KITS=Object.freeze([
  Object.freeze({id:'ECLIPSE_MARKET_BLACKOUT',signals:Object.freeze(['SOCIAL_ROLEPLAY','TYCOON_SIM','HORROR','RPG_PROGRESSION']),components:Object.freeze(['ECLIPSE_SKY','POWERED_UNPOWERED_BUILDINGS','EMERGENCY_LANTERN_PROPS','OUTAGE_STATUS_UI','GENERATOR_HUM_TO_AMBIENT_HUSH','FLICKER_VFX','SOOT_WET_MATERIAL_VARIANTS'])}),
  Object.freeze({id:'FLOODED_RUIN_RESEARCH_RUN',signals:Object.freeze(['SURVIVAL','EXPLORATION','RPG_PROGRESSION']),components:Object.freeze(['FLOODED_RUINS','WATER_MUD_SURFACES','SPECIMEN_AND_SCANNER_ITEMS','ROPE_SIGNAL_PROPS','AMPHIBIOUS_CREATURE_VARIANTS','WATER_DISTANCE_AUDIO','DISCOVERY_POI_UI'])}),
  Object.freeze({id:'AURORA_HARVEST_FESTIVAL',signals:Object.freeze(['COZY_FARMING','SOCIAL_ROLEPLAY','CASUAL_SHORT_RUN']),components:Object.freeze(['AURORA_SKY','SEASONAL_CROPS','MARKET_DECOR','FESTIVAL_OUTFITS','COLLECTION_UI','WIND_INSECT_ANIMAL_AUDIO','REWARD_SPARKLE_VFX'])}),
  Object.freeze({id:'SANDSTORM_CONVOY_DEFENSE',signals:Object.freeze(['DEFENSE','TYCOON_SIM','SURVIVAL']),components:Object.freeze(['SANDSTORM_VISIBILITY','CONVOY_MACHINE_PROPS','WAVE_BEACONS','DUST_MATERIALS','LANE_THREAT_UI','MACHINE_RATTLE_AUDIO','ELITE_SILHOUETTES'])}),
  Object.freeze({id:'CRYSTAL_FACTORY_OVERLOAD',signals:Object.freeze(['IDLE_GROWTH','TYCOON_SIM','RPG_PROGRESSION']),components:Object.freeze(['CRYSTAL_MACHINE_PROPS','EMISSIVE_OVERHEAT_MATERIALS','UPGRADE_ASCENSION_VFX','REPAIR_WORK_MOTIONS','OVERLOAD_WARNING_UI','GENERATOR_HUM_AUDIO'])}),
  Object.freeze({id:'WHITE_NIGHT_BOSS_MIGRATION',signals:Object.freeze(['SURVIVAL','ACTION_COMBAT','DEFENSE']),components:Object.freeze(['WHITE_NIGHT_SKY','MIGRATION_CREATURE_VARIANTS','BOSS_WARNING_BEACONS','DISTANT_WILDLIFE_CALLS','FROST_WET_SURFACES','WAVE_PRESSURE_BACKGROUND'])}),
  Object.freeze({id:'FOG_TOWN_MEMORY_CASE',signals:Object.freeze(['NARRATIVE','HORROR','SOCIAL_ROLEPLAY']),components:Object.freeze(['FOG_TOWN_BACKGROUND','CLUE_AND_LORE_PROPS','FACTION_WARDROBE','DIALOGUE_HISTORY_UI','STRUCTURE_CREAK_AUDIO','DISCOVERY_REVEAL_VFX'])}),
  Object.freeze({id:'COLOR_RIFT_PUZZLE_EVENT',signals:Object.freeze(['PUZZLE','CASUAL_SHORT_RUN','RPG_PROGRESSION']),components:Object.freeze(['COLOR_RIFT_BACKGROUND','TILE_STATE_MATERIALS','CASCADE_VFX','COLLECTIBLE_SHARDS','LEVEL_RESULT_UI','COMBO_AUDIO'])}),
  Object.freeze({id:'RAINED_IN_HOME_DAY',signals:Object.freeze(['SANDBOX_HOUSING','COZY_FARMING','SOCIAL_ROLEPLAY']),components:Object.freeze(['RAIN_WINDOW_BACKGROUND','INTERIOR_EXTERIOR_AUDIO_BLEND','WET_OUTERWEAR_VARIANTS','FURNITURE_INTERACTION_PROPS','WARM_LIGHT_MATERIALS','HOME_ACTIVITY_UI'])}),
  Object.freeze({id:'ECLIPSE_PILGRIMAGE',signals:Object.freeze(['NARRATIVE','RPG_PROGRESSION','SOCIAL_ROLEPLAY']),components:Object.freeze(['ECLIPSE_SKY','CEREMONIAL_PROPS','PROCESSION_MOTIONS','CEREMONIAL_WARDROBE','AMBIENT_HUSH_AUDIO','CHAPTER_REVEAL_PRESENTATION'])}),
  Object.freeze({id:'INDUSTRIAL_FREEZE_FAILURE',signals:Object.freeze(['TYCOON_SIM','SURVIVAL']),components:Object.freeze(['FROZEN_MACHINE_PROPS','ICE_CORROSION_MATERIALS','REPAIR_KIT_ITEMS','FAILURE_WARNING_UI','TOOL_WORK_AUDIO','STEAM_FROST_VFX'])}),
  Object.freeze({id:'RUINED_COAST_SIGNAL_RESCUE',signals:Object.freeze(['EXPLORATION','SURVIVAL','COOP_MULTIPLAYER']),components:Object.freeze(['STORM_COAST_BACKGROUND','PORTABLE_BEACON_PROPS','RADIO_STATIC_AUDIO','RESCUE_CARRY_MOTIONS','TEAM_PING_UI','WET_DAMAGE_MATERIALS'])})
]);

function companySeedIdeaText(seed={}){
  const signature=(seed.signatureSystems||[]).flatMap(row=>{
    if(typeof row==='string')return[row];
    return [row?.name,row?.purpose,row?.playerChoice].filter(Boolean);
  });
  return upper([
    seed.gameId,seed.gameName,seed.identity,seed.genre,seed.coreFun,
    ...(seed.coreLoop||[]),...signature,seed.progressionDirection,seed.visualDirection,seed.mobileUx
  ].filter(Boolean).join(' '));
}

function detectCompanySeedRuleIds(source,rules){
  const result=[];
  for(const rule of rules){
    if((rule.keywords||[]).some(keyword=>source.includes(upper(keyword))))result.push(rule.id);
  }
  return uniq(result);
}

export function createCompanySeedAssetIdeationPlan({seeds=[],assets=[]}={}){
  const seedRows=[];
  const aggregate=new Map();
  const detectedSignalSet=new Set();
  const worldThemeSet=new Set();
  const baseRecipes=COMPANY_COMMON_SEED_ASSET_IDEA_RECIPES.filter(row=>row.signals.includes('ALWAYS'));

  for(const seed of seeds||[]){
    const source=companySeedIdeaText(seed);
    const signals=detectCompanySeedRuleIds(source,COMPANY_COMMON_SEED_SIGNAL_RULES);
    const worldThemes=detectCompanySeedRuleIds(source,COMPANY_COMMON_SEED_WORLD_RULES);
    if(!worldThemes.length)worldThemes.push('UNIVERSAL_STYLE_ADAPTIVE');
    for(const id of signals)detectedSignalSet.add(id);
    for(const id of worldThemes)worldThemeSet.add(id);

    const selected=[
      ...baseRecipes,
      ...COMPANY_COMMON_SEED_ASSET_IDEA_RECIPES.filter(row=>row.signals.some(signal=>signals.includes(signal)))
    ];
    const recipeIds=[];
    for(const recipe of selected){
      recipeIds.push(recipe.id);
      for(const idea of recipe.ideas){
        const key=idea.domain+'|'+idea.ideaId;
        const current=aggregate.get(key)||{
          ideaId:idea.ideaId,
          domain:idea.domain,
          role:idea.role,
          stateVariants:[...(COMPANY_COMMON_SEED_DOMAIN_STATE_DEFAULTS[idea.domain]||['BASE'])],
          sourceSeedIds:[],
          sourceSignals:[],
          worldThemes:[]
        };
        if(seed.gameId&&!current.sourceSeedIds.includes(seed.gameId))current.sourceSeedIds.push(seed.gameId);
        for(const signal of signals)if(!current.sourceSignals.includes(signal))current.sourceSignals.push(signal);
        for(const theme of worldThemes)if(!current.worldThemes.includes(theme))current.worldThemes.push(theme);
        aggregate.set(key,current);
      }
    }

    seedRows.push(Object.freeze({
      gameId:text(seed.gameId)||'UNKNOWN_SEED',
      gameName:text(seed.gameName||seed.identity),
      signals:Object.freeze(signals),
      worldThemes:Object.freeze(worldThemes),
      recipeIds:Object.freeze(uniq(recipeIds))
    }));
  }

  const ideas=[...aggregate.values()].map(row=>Object.freeze({
    ...row,
    stateVariants:Object.freeze(uniq(row.stateVariants)),
    sourceSeedIds:Object.freeze(uniq(row.sourceSeedIds)),
    sourceSignals:Object.freeze(uniq(row.sourceSignals)),
    worldThemes:Object.freeze(uniq(row.worldThemes)),
    combinationKey:[row.domain,row.role,...row.worldThemes.slice(0,2)].join('>'),
    gameplayAuthority:false,
    balanceAuthority:false,
    saveAuthority:false,
    networkAuthority:false
  })).sort((a,b)=>a.domain.localeCompare(b.domain)||a.ideaId.localeCompare(b.ideaId));

  const demandMap=new Map();
  for(const idea of ideas)demandMap.set(idea.domain,(demandMap.get(idea.domain)||0)+idea.sourceSeedIds.length);
  let gapByDomain=new Map();
  if((assets||[]).length){
    const report=auditCommonLibrarySystemDepth({assets});
    gapByDomain=new Map(report.rows.map(row=>[row.domain,row.missing.length]));
  }
  const familyDemand=[...demandMap.entries()].map(([domain,seedDemand])=>{
    const currentGapCount=gapByDomain.get(domain)||0;
    return Object.freeze({
      domain,
      currentGapCount,
      seedDemand,
      priorityScore:currentGapCount*20+seedDemand*5,
      action:currentGapCount>0?'VOLUME_UP_GAP_FIRST':'EXPAND_COMBINATION_BREADTH'
    });
  }).sort((a,b)=>b.priorityScore-a.priorityScore||b.seedDemand-a.seedDemand||a.domain.localeCompare(b.domain));

  const detectedSignals=[...detectedSignalSet].sort();
  const crossGenreKits=COMPANY_COMMON_SEED_CROSS_GENRE_IDEA_KITS.map(kit=>{
    const matchedSignals=kit.signals.filter(signal=>detectedSignalSet.has(signal));
    return Object.freeze({...kit,matchedSignals:Object.freeze(matchedSignals),matchScore:matchedSignals.length});
  }).filter(kit=>kit.matchScore>=2).sort((a,b)=>b.matchScore-a.matchScore||a.id.localeCompare(b.id));

  return Object.freeze({
    version:1,
    scope:'ALL_COMPANY_COMMON_SEEDS',
    sourcePattern:COMPANY_COMMON_SEED_ASSET_IDEA_AXES.sourcePattern,
    seedCount:seedRows.length,
    detectedSignals:Object.freeze(detectedSignals),
    worldThemes:Object.freeze([...worldThemeSet].sort()),
    seeds:Object.freeze(seedRows),
    ideas:Object.freeze(ideas),
    ideaCount:ideas.length,
    familyDemand:Object.freeze(familyDemand),
    crossGenreKits:Object.freeze(crossGenreKits),
    crossGenreKitCount:crossGenreKits.length,
    stateAxes:COMPANY_COMMON_SEED_ASSET_IDEA_AXES.stateAxes,
    volumeBeforeQuality:false,
    reuseAdaptRecombineBeforeNewAuthoring:true,
    deterministicMachineReadable:true,
    eventDrivenOnly:true,
    schedulerCreated:false,
    workflowCreated:false,
    queueCreated:false,
    pipelineCreated:false,
    gameplayAuthority:false,
    balanceAuthority:false,
    saveAuthority:false,
    networkAuthority:false
  });
}

export const COMMON_PRESENTATION_EXPECTATIONS=Object.freeze({
  loading:Object.freeze(['BRAND_BACKGROUND','LOGO','SPINNER','PROGRESS_BAR','TIP','STATUS_TEXT']),
  introModes:Object.freeze(['SIMPLE_FADE','LOGO_REVEAL','PARTICLE_LIGHT','WORLD_PAN','MINIMAL_CINEMATIC']),
  genreBackgrounds:Object.freeze(['SURVIVAL','RPG','DEFENSE','CASUAL','PUZZLE','HORROR','STRATEGY']),
  gameSpecificVariationFields:Object.freeze(['LOGO','COLOR','BACKGROUND','COPY','INTENSITY','DURATION'])
});


export const COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS=Object.freeze({
  UI:Object.freeze({
    minimumDepth:5,
    required:Object.freeze([
      'ITEM_DETAIL','ITEM_COMPARE','ITEM_CONTEXT_ACTIONS','STACK_SPLIT','MULTI_SELECT','FAVORITE_LOCK_NEW_STATE',
      'INVENTORY_CONTAINER','INVENTORY_WEIGHT_CAPACITY','STASH','LOOT_WINDOW','LOOT_FEED','QUICK_SLOT','RADIAL_MENU',
      'LOADOUT_PRESET','EQUIPMENT_COMPARE','SET_BONUS','SOCKET_ENCHANT','UPGRADE','REPAIR','DISMANTLE',
      'CRAFT_TREE','RECIPE_DETAIL','MATERIAL_TRACKING','BUY_SELL','BUYBACK','CODEX','COLLECTION_PROGRESS',
      'RECENT_ITEMS','SOURCE_AND_USAGE','ACCESSIBILITY_INPUT_SWAP','GAMEPAD_FOCUS_PATH',
      'AI_COMPANION','NPC_MEMORY','MOUNT_TRAVEL','PARRY_FEEDBACK','WORLD_PROP_INTERACTION'
    ])
  }),
  ITEM:Object.freeze({
    minimumDepth:4,
    required:Object.freeze([
      'CONSUMABLE','FOOD','INGREDIENT','RESOURCE','CRAFT_MATERIAL','UPGRADE_MATERIAL','QUEST_ITEM','KEY_ITEM','LORE',
      'UTILITY','AMMUNITION','THROWABLE','TREASURE','CURRENCY_CONTAINER','STACK_PROFILE','RARITY_BAND',
      'WORLD_MODEL','DROP_MODEL','VIEWPORT_ICON','EQUIPPED_VISUAL_WHEN_APPLICABLE'
    ])
  }),
  WEAPON:Object.freeze({
    minimumDepth:4,
    required:Object.freeze([
      'ONE_HAND_BLADE','TWO_HAND_BLADE','DAGGER','POLEARM','AXE','HAMMER_MACE','BOW','CROSSBOW','MAGIC_FOCUS',
      'SHIELD','DUAL_WIELD_PAIR','THROWN','GATHERING_TOOL','GRIP_SOCKET','WORLD_DROP','INVENTORY_ICON','CRAFT_ICON',
      'UPGRADE_STAGE_VISUAL','DAMAGE_WEAR_VARIANT','RARITY_ORNAMENT_VARIANT'
    ])
  }),
  CHARACTER_GEAR:Object.freeze({
    minimumDepth:4,
    required:Object.freeze([
      'HEAD','CHEST','HANDS','LEGS','FEET','BACK','SHOULDER','BELT','RING','AMULET','ACCESSORY','COSMETIC_OVERLAY',
      'LIGHT_MEDIUM_HEAVY','SET_IDENTITY','SOCKET_POINT','UPGRADE_STAGE_VISUAL','DAMAGE_WEAR_VARIANT','TRANSMOG_BASE'
    ])
  }),
  SKILL:Object.freeze({
    minimumDepth:4,
    required:Object.freeze([
      'CAST','TELEGRAPH','PROJECTILE','TRAIL','IMPACT','AREA','CHANNEL','BEAM','SUMMON','DASH','SHIELD','HEAL',
      'AURA','STATUS_APPLY','STATUS_CLEANSE','INTERRUPT','ICON','AUDIO_ROLE','CAMERA_ROLE','MOBILE_DENSITY'
    ])
  }),
  VFX:Object.freeze({
    minimumDepth:4,
    required:Object.freeze([
      'HIT','CRITICAL','BLOCK','PARRY','DODGE','HEAL','BUFF','DEBUFF','STATUS','LOOT_COMMON','LOOT_RARE','LOOT_LEGENDARY',
      'UPGRADE','CRAFT','DISMANTLE','QUEST_UPDATE','INTERACTION','ENVIRONMENT','WEATHER','DESTRUCTION','BOSS','MOBILE_DENSITY'
    ])
  }),
  MOTION:Object.freeze({
    minimumDepth:5,
    required:Object.freeze([
      'IDLE','WALK','JOG','RUN','SPRINT','START','STOP','TURN','JUMP','LAND','CROUCH','CLIMB','SWIM','DODGE','ROLL',
      'BLOCK','PARRY','LIGHT_ATTACK','HEAVY_ATTACK','RANGED_ATTACK','CAST','CHANNEL','INTERACT','GATHER','CRAFT','CARRY',
      'EQUIP','UNEQUIP','USE_CONSUMABLE','HIT_FRONT','HIT_BACK','DOWNED','REVIVE','DEATH','EMOTE','BLEND','MOTION_LOD',
      'SIT_STAND','LEAN','OPEN_CLOSE','PICK_PLACE','PUSH_PULL','DIALOGUE_GESTURE','NPC_WORK','COOK','FARM','FISH',
      'BED','LADDER_ENTRY_EXIT','SLOPE','FATIGUE','INJURY'
    ])
  }),
  MATERIAL:Object.freeze({
    minimumDepth:4,
    required:Object.freeze([
      'WOOD','STONE','METAL','GLASS','FABRIC','LEATHER','GROUND','BRICK','ICE','ASPHALT','SKIN','BONE','WATER','MUD',
      'SAND','SNOW','MOSS','CRYSTAL','EMISSIVE','CORROSION','DIRT','WET_DRY','DAMAGE','WEATHERING','STYLE_VARIANT'
    ])
  }),
  ENVIRONMENT:Object.freeze({
    minimumDepth:5,
    required:Object.freeze([
      'FOREST','SNOW','DESERT','SWAMP','CAVE','COAST','VILLAGE','CITY','RUINS','DUNGEON',
      'TERRAIN','GROUND_DETAIL','PATH_ROAD','CLIFF','WATER','LANDMARK','SET_DRESSING','HILL','RIDGE','VALLEY',
      'VILLAGE_CLUSTER','BACKGROUND_LAYER','PROP_INTERACTION','WEATHER','SKY_ATMOSPHERE',
      'LIGHTING_PRESET','STREAMING_LOD','INTERIOR_EXTERIOR_TRANSITION','DISCOVERY_POI',
      'BASIN','PLATEAU','TERRACE','GULLY','CREEK','ROAD_GRID','ESCARPMENT','WETLAND_ISLAND','CAVE_FLOOR',
      'BACKGROUND_PARALLAX','SETTLEMENT_VARIATION'
    ])
  }),
  BUILDING:Object.freeze({
    minimumDepth:4,
    required:Object.freeze([
      'FOUNDATION','FLOOR','WALL_SOLID','WALL_WINDOW','WALL_CORNER','DOOR','WINDOW','ROOF','STAIR','RAILING','PILLAR',
      'ARCHWAY','INTERIOR_KIT','EXTERIOR_TRIM','SIGNAGE','PROP_SOCKET','DAMAGE_STATE','DESTRUCTION_VARIANT',
      'COLLISION_NAV_PROXY','MATERIAL_VARIANT','LOD'
    ])
  }),
  WORLD_PROP:Object.freeze({
    minimumDepth:4,
    required:Object.freeze([
      'CONTAINER','CHEST','CRATE','BARREL','FURNITURE','LIGHT_SOURCE','SIGNPOST','FENCE','MARKET','CRAFT_STATION',
      'WORKBENCH','COOKING','STORAGE','INTERACTIVE_SWITCH','DOOR_CONTROL','LORE_COLLECTIBLE','DESTRUCTIBLE',
      'RESOURCE_NODE','QUEST_PROP','DECORATION','INTERACTION_ROLE','INTERACTION_STATE','COLLISION_PROXY','LOD',
      'CART','SETTLEMENT_LIFE','FLAG','TENT','FIREWOOD','FARM_TOOL','RUIN_DEBRIS','CONSTRUCTION_TRACE'
    ])
  }),
  CREATURE:Object.freeze({
    minimumDepth:5,
    required:Object.freeze([
      'BIPED','QUADRUPED','INSECT','ARACHNID','FLYING','AQUATIC','SERPENT','AMORPHOUS','GOLEM','GIANT',
      'HEAD_VARIANT','TORSO_VARIANT','APPENDAGE','HORN','TAIL','WING','SHELL','SURFACE_VARIANT','ELITE_ORNAMENT',
      'BOSS_SIGNATURE','RIG_PROFILE','LOCOMOTION_SET','ATTACK_SET','HIT_DEATH_SET','ECOLOGY_ROLE','ENCOUNTER_RANK','HABITAT_COMPOSITION','LOD'
    ])
  }),
  AUDIO:Object.freeze({
    minimumDepth:6,
    required:Object.freeze([
      'UI_CONFIRM','UI_CANCEL','UI_ERROR','UI_REWARD','UI_WARNING','UI_NOTIFICATION',
      'FOOTSTEP','LANDING_SURFACE','WEAPON_SWING','WEAPON_HIT','BLOCK_PARRY','CREATURE_VOCAL','CREATURE_HOWL','CREATURE_DISTANCE_CALL',
      'SKILL_CAST','SKILL_IMPACT','PROJECTILE','ITEM_PICKUP','LOOT_RARITY','CRAFT','UPGRADE','REPAIR','DESTRUCTION',
      'ENVIRONMENT_BED','ENVIRONMENT_NEAR','ENVIRONMENT_DISTANT','ENVIRONMENT_SCATTER','WEATHER','WATER','WIND','BUILDING','MACHINE',
      'INTERIOR_EXTERIOR','OCCLUSION_ROLE','REVERB_ZONE_ROLE','DISTANCE_BAND','BOSS','DIALOGUE_UI',
      'MUSIC_MENU','MUSIC_EXPLORATION','MUSIC_TENSION','MUSIC_COMBAT_LAYER','MUSIC_BOSS_PHASE','MUSIC_DISCOVERY','MUSIC_REGION',
      'MUSIC_TIME_WEATHER_LAYER','MUSIC_TRANSITION','VARIATION_SET','REPEATER_DEDUPE','MOBILE_BUDGET_VARIANT'
    ])
  }),
  FOLIAGE:Object.freeze({
    minimumDepth:4,
    required:Object.freeze([
      'GRASS','BUSH','FERN','FLOWER','STUMP','FALLEN_LOG','PINE_TREE','DEAD_TREE','BROADLEAF_TREE','VINE','REED',
      'MOSS','MUSHROOM','ROOT','BIOME_VARIANT','SEASON_VARIANT','WIND_VARIANT','LOD'
    ])
  }),
  PRESENTATION:Object.freeze({
    minimumDepth:4,
    required:Object.freeze([
      'BRAND_BACKGROUND','LOGO','SPINNER','PROGRESS_BAR','TIP','STATUS_TEXT','SIMPLE_FADE','LOGO_REVEAL',
      'PARTICLE_LIGHT','WORLD_PAN','MINIMAL_CINEMATIC','INPUT_SKIP_HINT','ACCESSIBILITY_REDUCED_MOTION','FAILURE_RECOVERY_STATE'
    ])
  })
});


export const COMMON_GENRE_SYSTEM_EXPECTATIONS=Object.freeze({
  SURVIVAL:Object.freeze([
    'VITALS','HUNGER_THIRST_OR_GAME_EQUIVALENT','RESOURCE_GATHERING','TOOL_PROGRESSION','CRAFTING','COOKING',
    'SHELTER','WEATHER_OR_ENVIRONMENT_PRESSURE','STORAGE','LOOT','REPAIR','DURABILITY_PRESENTATION',
    'DAY_NIGHT','MAP_DISCOVERY','CAMP_OR_RESPAWN_POINT','TERRAIN_VARIATION','CREATURE_ECOLOGY','WORLD_PROP_INTERACTION','PARRY_OPTIONAL','FARMING_OPTIONAL','ANIMAL_INTERACTION_OPTIONAL'
  ]),
  RPG:Object.freeze([
    'CHARACTER_STATS','LEVEL_PROGRESSION','EQUIPMENT','ITEM_COMPARE','SKILLS','STATUS_EFFECTS','QUEST_LOG','DIALOGUE',
    'PARTY_OPTIONAL','LOOT','VENDORS','CRAFTING','UPGRADE','SET_BONUS','SOCKET_ENCHANT','CODEX','MAP_POI',
    'FAST_TRAVEL_OPTIONAL','BUILD_LOADOUT','RECENT_NEW_ITEMS'
  ]),
  CASUAL:Object.freeze([
    'ONE_ACTION_READABILITY','SHORT_SESSION_LOOP','COLLECTION','COSMETIC_REWARD','DAILY_OR_REPEATABLE_OPTIONAL',
    'LIGHT_INVENTORY','CLEAR_PROGRESS','TUTORIAL_CONTEXT','ACCESSIBILITY','TOUCH_FIRST','LOW_NAV_DEPTH','REWARD_FEEDBACK'
  ]),
  SANDBOX:Object.freeze([
    'OBJECT_PLACEMENT','OBJECT_ROTATION','SNAP_OR_FREE_PLACE','MULTI_OBJECT_SELECTION','MOVE_COPY_DELETE','UNDO_REDO',
    'BLUEPRINT_OR_PRESET','MATERIAL_PALETTE','WORLD_INTERACTION','PHYSICS_COMBINATION_OPTIONAL','CONSTRUCTION',
    'STORAGE','CRAFTING','DECORATION','PLAYER_MARKERS','SAVE_LAYOUT','MULTIPLAYER_OWNERSHIP_OPTIONAL'
  ]),
  HOUSING:Object.freeze([
    'FOUNDATION','TRIANGLE_FOUNDATION','WALL','HALF_WALL','WINDOW','DOOR_FRAME','DOOR','CEILING','ROOF','PILLAR',
    'STAIRS','RAILING','FENCE','GATE','LADDER','SNAP_SOCKET','PLACEMENT_GHOST','VALID_INVALID_PLACEMENT',
    'STRUCTURAL_SUPPORT_PRESENTATION','BUILD_TIER_PRESENTATION','REPAIR','DEMOLISH_RETURN','OWNERSHIP_PERMISSION',
    'DECAY_OR_UPKEEP_OPTIONAL','BED_RESPAWN_OPTIONAL','STORAGE','CRAFT_STATION','FURNITURE','LIGHTING','DECORATION',
    'COMFORT_OR_ROOM_SCORE_OPTIONAL','INTERIOR_EXTERIOR','SETTLEMENT_OVERVIEW'
  ]),
  COZY:Object.freeze([
    'HOME_CUSTOMIZATION','FURNITURE','WALLPAPER_FLOORING_OR_THEME','STORAGE','COLLECTION','FARMING','COOKING',
    'CRAFTING','DECORATION','NPC_RELATIONSHIP','SHOPPING','OUTFIT','PHOTO_OR_SHOWCASE_OPTIONAL','LOW_PRESSURE_FEEDBACK'
  ]),
  FARMING:Object.freeze([
    'PLOT','SEED','PLANT_GROWTH','WATERING','HARVEST','FERTILIZER_OPTIONAL','STORAGE','PROCESSING_MACHINE','ANIMAL_HOME',
    'FEED','PRODUCT_COLLECTION','COOKING','SELLING','BUILDING_UPGRADE','SEASON_OR_BIOME_VARIANT'
  ]),
  SETTLEMENT:Object.freeze([
    'BUILD_ZONE','HOUSING','STORAGE','CRAFT_STATIONS','NPC_BEDS_OR_ASSIGNMENT','LIGHTING','DEFENSE_OPTIONAL','PATHING',
    'RESOURCE_FLOW','SERVICE_BUILDINGS','DECORATION','OWNERSHIP','UPGRADE','OVERVIEW_STATUS'
  ]),
  ACTION:Object.freeze([
    'CORE_COMBAT_LOOP','LOCK_OR_TARGET_OPTIONAL','DODGE_OR_EVASION','BLOCK_PARRY_OPTIONAL','COMBO_OR_CHAIN','WEAPON_FEEDBACK',
    'HIT_REACTION','BOSS_TELEGRAPH','PARRY_FEEDBACK','COUNTER_WINDOW_FEEDBACK','QUICK_ITEM','SKILL_ACCESS','CAMERA_FEEDBACK','MOBILE_INPUT_PARITY'
  ]),
  ADVENTURE:Object.freeze([
    'WORLD_EXPLORATION','MAP_POI','QUEST_OR_OBJECTIVE','INTERACTION_PROMPT','PUZZLE_OPTIONAL','LORE','COLLECTIBLE',
    'TRAVERSAL','FAST_TRAVEL_OPTIONAL','CODEX','DISCOVERY_FEEDBACK','CONTEXTUAL_TOOL_USE'
  ]),
  PUZZLE:Object.freeze([
    'BOARD_OR_ACTIVE_STATE','VALID_ACTION_FEEDBACK','UNDO_REDO_OPTIONAL','HINT_SYSTEM','STEP_OR_MOVE_COUNT_OPTIONAL',
    'CLEAR_STATE','FAIL_STATE','RETRY','ACCESSIBILITY','TOUCH_PRECISION','LEVEL_SELECT','PROGRESSION'
  ]),
  TYCOON:Object.freeze([
    'BUILD_MODE','PLACEMENT_VALIDATION','PATH_CONNECTION','CAPACITY','QUEUE','UPGRADE','STAFF','MAINTENANCE','CUSTOMER_STATE',
    'SATISFACTION','INCOME_EXPENSE','SERVICE_STATUS','OVERVIEW_DASHBOARD','DECORATION'
  ]),
  COOP_MULTIPLAYER:Object.freeze([
    'PARTY','PLAYER_MARKERS','PING','SHARED_OBJECTIVE','REVIVE_OPTIONAL','OWNERSHIP_PERMISSION','LOOT_RULE_PRESENTATION',
    'TRADE_OPTIONAL','READY_STATE','CONNECTION_STATE','SYNC_FEEDBACK','VOICE_OR_CHAT_OPTIONAL'
  ]),
  NARRATIVE:Object.freeze([
    'DIALOGUE','CHOICES','HISTORY','CHARACTER_RELATIONSHIP','QUEST_STATE','LORE','CODEX','CUTSCENE_SKIP','SUBTITLE',
    'ACCESSIBILITY','SAVE_CHECKPOINT_PRESENTATION','DECISION_CONSEQUENCE_FEEDBACK'
  ]),
  DEFENSE:Object.freeze([
    'BASE_HEALTH','WAVE_STATE','PLACEMENT','TOWER_OR_UNIT_CARD','RANGE_PREVIEW','UPGRADE_PATH','SELL_OR_RECYCLE',
    'ENEMY_CODEX','RESOURCE_ECONOMY','BOSS_WARNING','FAST_BUILD_INPUT','PAUSE_OR_SPEED_OPTIONAL'
  ]),
  HORROR:Object.freeze([
    'LIGHT_OR_VISIBILITY','THREAT_FEEDBACK','INVESTIGATION','LORE','KEY_ITEM','PUZZLE','CHASE_OR_ESCAPE','SAFE_POINT_OPTIONAL',
    'INVENTORY_PRESSURE_OPTIONAL','AUDIO_CUE','OBJECTIVE_TRACKING','ACCESSIBILITY_REDUCED_FLASH_SHAKE'
  ])
});


export const COMMON_LIBRARY_SYSTEM_DEPTH_ALIASES=Object.freeze({
  UI:Object.freeze({
    ITEM_DETAIL:Object.freeze(['ITEM_DETAIL_PANEL']),
    ITEM_COMPARE:Object.freeze(['ITEM_COMPARE_PANEL']),
    ITEM_CONTEXT_ACTIONS:Object.freeze(['ITEM_CONTEXT_MENU']),
    STACK_SPLIT:Object.freeze(['STACK_SPLIT_DIALOG']),
    MULTI_SELECT:Object.freeze(['MULTI_SELECT_BAR']),
    FAVORITE_LOCK_NEW_STATE:Object.freeze(['ITEM_STATE_BADGES']),
    INVENTORY_CONTAINER:Object.freeze(['INVENTORY_CONTAINER_PANEL']),
    INVENTORY_WEIGHT_CAPACITY:Object.freeze(['INVENTORY_WEIGHT_METER','INVENTORY_CAPACITY_METER']),
    STASH:Object.freeze(['STASH_SCREEN']),
    QUICK_SLOT:Object.freeze(['QUICK_SLOT_BAR']),
    LOADOUT_PRESET:Object.freeze(['LOADOUT_PRESET_PANEL']),
    EQUIPMENT_COMPARE:Object.freeze(['EQUIPMENT_COMPARE_PANEL']),
    SET_BONUS:Object.freeze(['SET_BONUS_PANEL']),
    SOCKET_ENCHANT:Object.freeze(['SOCKET_ENCHANT_PANEL']),
    UPGRADE:Object.freeze(['UPGRADE_PANEL']),
    REPAIR:Object.freeze(['REPAIR_PANEL','REPAIR_BUILDING_PANEL']),
    DISMANTLE:Object.freeze(['DISMANTLE_PANEL']),
    CRAFT_TREE:Object.freeze(['CRAFTING_TREE']),
    RECIPE_DETAIL:Object.freeze(['RECIPE_DETAIL_PANEL']),
    MATERIAL_TRACKING:Object.freeze(['MATERIAL_TRACKER']),
    BUY_SELL:Object.freeze(['BUY_SELL_PANEL']),
    BUYBACK:Object.freeze(['BUYBACK_PANEL']),
    CODEX:Object.freeze(['CODEX_SCREEN']),
    RECENT_ITEMS:Object.freeze(['RECENT_ITEMS_PANEL']),
    SOURCE_AND_USAGE:Object.freeze(['ITEM_SOURCE_USAGE_PANEL']),
    ACCESSIBILITY_INPUT_SWAP:Object.freeze(['INPUT_HINT','SETTINGS_PANEL']),
    GAMEPAD_FOCUS_PATH:Object.freeze(['INPUT_HINT','SIDE_NAVIGATION']),
    AI_COMPANION:Object.freeze(['AI_COMPANION_STATUS_CARD','COMPANION_COMMAND_WHEEL']),
    NPC_MEMORY:Object.freeze(['NPC_MEMORY_SUMMARY','NPC_RUMOR_KNOWLEDGE_PANEL']),
    MOUNT_TRAVEL:Object.freeze(['MOUNT_STATUS_HUD','TRAVEL_ROUTE_PANEL']),
    PARRY_FEEDBACK:Object.freeze(['PARRY_TIMING_INDICATOR','GUARD_METER']),
    WORLD_PROP_INTERACTION:Object.freeze(['WORLD_PROP_INTERACTION_PROMPT','WORLD_PROP_ACTION_WHEEL'])
  }),
  WEAPON:Object.freeze({
    ONE_HAND_BLADE:Object.freeze(['SWORD']),
    POLEARM:Object.freeze(['SPEAR']),
    HAMMER_MACE:Object.freeze(['HAMMER']),
    MAGIC_FOCUS:Object.freeze(['STAFF']),
    GATHERING_TOOL:Object.freeze(['PICKAXE','AXE','HAMMER'])
  }),
  CHARACTER_GEAR:Object.freeze({
    HEAD:Object.freeze(['HEAD_GEAR']),
    CHEST:Object.freeze(['TORSO_GEAR']),
    HANDS:Object.freeze(['HAND_GEAR']),
    LEGS:Object.freeze(['LEG_GEAR','LEGS']),
    FEET:Object.freeze(['FOOT_GEAR']),
    BACK:Object.freeze(['BACK_GEAR']),
    SHOULDER:Object.freeze(['SHOULDER_GEAR','SHOULDER']),
    BELT:Object.freeze(['BELT_GEAR','BELT']),
    RING:Object.freeze(['RING_GEAR','RING']),
    AMULET:Object.freeze(['AMULET_GEAR','AMULET']),
    ACCESSORY:Object.freeze(['ACCESSORY_GEAR','ACCESSORY']),
    COSMETIC_OVERLAY:Object.freeze(['COSMETIC_OVERLAY']),
    LIGHT_MEDIUM_HEAVY:Object.freeze(['LIGHT_TORSO','MEDIUM_TORSO','HEAVY_TORSO']),
    SET_IDENTITY:Object.freeze(['SET_IDENTITY']),
    SOCKET_POINT:Object.freeze(['SOCKET_POINT']),
    UPGRADE_STAGE_VISUAL:Object.freeze(['UPGRADE_STAGE_VISUAL']),
    DAMAGE_WEAR_VARIANT:Object.freeze(['DAMAGE_WEAR_VARIANT']),
    TRANSMOG_BASE:Object.freeze(['TRANSMOG_BASE'])
  }),
  MATERIAL:Object.freeze({
    LEATHER:Object.freeze(['LEATHER_LIKE']),
    CRYSTAL:Object.freeze(['MAGIC_CRYSTAL'])
  }),
  VFX:Object.freeze({
    HIT:Object.freeze(['IMPACT_FLASH','IMPACT_CONFIRMATION']),
    BLOCK:Object.freeze(['BLOCK_IMPACT','BLOCK_CONTACT']),
    PARRY:Object.freeze(['PARRY_PERFECT_FLASH','PERFECT_PARRY_CONFIRMATION','COUNTER_READY_PULSE'])
  }),
  SKILL:Object.freeze({
    CAST:Object.freeze(['CAST_HAND','CAST_ORIGIN_PRESENTATION']),
    TELEGRAPH:Object.freeze(['TELEGRAPH_CIRCLE','AREA_TELEGRAPH_PRESENTATION']),
    IMPACT:Object.freeze(['IMPACT_SMALL','SMALL_IMPACT_PRESENTATION']),
    TRAIL:Object.freeze(['SKILL_TRAIL']),
    ICON:Object.freeze(['SKILL_ICON_BADGE']),
    MOBILE_DENSITY:Object.freeze(['MOBILE_DENSITY_VARIANT'])
  }),
  MOTION:Object.freeze({
    TURN:Object.freeze(['TURN_90']),
    JUMP:Object.freeze(['JUMP_START']),
    DEATH:Object.freeze(['DEATH_FRONT']),
    SIT_STAND:Object.freeze(['SIT_DOWN','STAND_UP']),
    LEAN:Object.freeze(['LEAN_WALL_IDLE']),
    OPEN_CLOSE:Object.freeze(['OPEN_DOOR','OPEN_CONTAINER']),
    PICK_PLACE:Object.freeze(['PICKUP_GROUND','PLACE_GROUND']),
    PUSH_PULL:Object.freeze(['PUSH_OBJECT','PULL_OBJECT']),
    DIALOGUE_GESTURE:Object.freeze(['TALK_GESTURE']),
    NPC_WORK:Object.freeze(['NPC_WORK_LOOP']),
    COOK:Object.freeze(['COOK_LOOP']),
    FARM:Object.freeze(['FARM_TEND']),
    FISH:Object.freeze(['FISH_CAST']),
    BED:Object.freeze(['BED_LIE_DOWN']),
    LADDER_ENTRY_EXIT:Object.freeze(['LADDER_ENTER','LADDER_EXIT']),
    SLOPE:Object.freeze(['SLOPE_ASCEND','SLOPE_DESCEND']),
    FATIGUE:Object.freeze(['FATIGUED_IDLE']),
    INJURY:Object.freeze(['INJURED_WALK'])
  }),
  ENVIRONMENT:Object.freeze({
    PATH_ROAD:Object.freeze(['PATH_ROAD','ROAD_DIRT']),
    STREAMING_LOD:Object.freeze(['STREAMING_OR_LOD']),
    HILL:Object.freeze(['ROLLING_HILLS','VILLAGE_HILL','TERRACED_HILLS']),
    RIDGE:Object.freeze(['RIDGE_PASS','RUINED_HIGHLAND']),
    VALLEY:Object.freeze(['RIVER_VALLEY','MEADOW_BASIN']),
    VILLAGE_CLUSTER:Object.freeze(['VILLAGE_HILL','VILLAGE_CROSSROADS','FARM_HAMLET','CLIFF_SETTLEMENT','COAST_VILLAGE']),
    BACKGROUND_LAYER:Object.freeze(['TERRAIN_COMPOSITION','BACKGROUND','BACKGROUND_1','BACKGROUND_2','BACKGROUND_3','BACKGROUND_4','BACKGROUND_5']),
    PROP_INTERACTION:Object.freeze(['SET_DRESSING','WORLD_PROP_INTERACTION','INTERACTION_PRESENTATION']),
    BASIN:Object.freeze(['MEADOW_BASIN','SNOW_BASIN']),
    PLATEAU:Object.freeze(['RUINED_HIGHLAND']),
    TERRACE:Object.freeze(['TERRACED_HILLS','ISLAND_TERRACES']),
    GULLY:Object.freeze(['FOREST_GULLY']),
    CREEK:Object.freeze(['FOREST_GULLY']),
    ROAD_GRID:Object.freeze(['CITY_OUTSKIRTS']),
    ESCARPMENT:Object.freeze(['DESERT_ESCARPMENT']),
    WETLAND_ISLAND:Object.freeze(['WETLAND_HAMLET']),
    CAVE_FLOOR:Object.freeze(['CAVE_OUTPOST']),
    BACKGROUND_PARALLAX:Object.freeze(['BACKGROUND_LAYER','BACKGROUND_5']),
    SETTLEMENT_VARIATION:Object.freeze(['RIVER_TOWN','SNOW_HAMLET','OASIS_SETTLEMENT','WETLAND_HAMLET','CAVE_OUTPOST','CITY_OUTSKIRTS'])
  }),
  BUILDING:Object.freeze({
    FOUNDATION:Object.freeze(['FOUNDATION_RECT','FOUNDATION_TRIANGLE','FENCE_FOUNDATION']),
    FLOOR:Object.freeze(['FLOOR_TILE']),
    WALL_SOLID:Object.freeze(['WALL_SOLID','HALF_WALL']),
    DOOR:Object.freeze(['DOOR_SINGLE','DOOR_FRAME']),
    WINDOW:Object.freeze(['WALL_WINDOW','WINDOW_FRAME']),
    ROOF:Object.freeze(['ROOF_GABLE','ROOF_FLAT','ROOF_SLOPE','ROOF_CORNER']),
    STAIR:Object.freeze(['STAIRS','STAIRS_STRAIGHT','LADDER']),
    PILLAR:Object.freeze(['PILLAR','PILLAR_STONE']),
    EXTERIOR_TRIM:Object.freeze(['WALL_TRIM'])
  }),
  WORLD_PROP:Object.freeze({
    CONTAINER:Object.freeze(['CHEST','CRATE','BARREL','STORAGE','WARDROBE']),
    FURNITURE:Object.freeze(['BED','BENCH','TABLE','WARDROBE','SHELF']),
    LIGHT_SOURCE:Object.freeze(['TORCH','WALL_TORCH','FLOOR_LAMP']),
    MARKET:Object.freeze(['MARKET_STALL']),
    CRAFT_STATION:Object.freeze(['CRAFT_STATION','WORKBENCH']),
    COOKING:Object.freeze(['COOKING','COOKING_HEARTH']),
    STORAGE:Object.freeze(['STORAGE','WARDROBE','SHELF']),
    DECORATION:Object.freeze(['DECORATION','RUG','DECOR_STATUE']),
    INTERACTION_ROLE:Object.freeze(['INTERACTIONPRESENTATIONROLE','WORLD_PROP_INTERACTION']),
    INTERACTION_STATE:Object.freeze(['AVAILABLE','BLOCKED','LOCKED','IN_USE'])
  }),
  CREATURE:Object.freeze({
    BIPED:Object.freeze(['TORSO_BIPED','BIPED_TORSO']),
    QUADRUPED:Object.freeze(['TORSO_QUADRUPED','QUADRUPED_TORSO']),
    INSECT:Object.freeze(['THORAX_INSECT','INSECT_THORAX']),
    WING:Object.freeze(['WING_PAIR']),
    HORN:Object.freeze(['HORN_PAIR']),
    SHELL:Object.freeze(['SHELL_BACK']),
    TAIL:Object.freeze(['TAIL_LONG']),
    ECOLOGY_ROLE:Object.freeze(['PREY_GRAZER','PREDATOR','AMBUSH_PREDATOR','HUMANOID_FACTION','UNDEAD','ELITE_VARIANT']),
    ENCOUNTER_RANK:Object.freeze(['ELITE_ORNAMENT']),
    HABITAT_COMPOSITION:Object.freeze(['CREATURE_ECOLOGY_CONTRACT'])
  }),
  FOLIAGE:Object.freeze({
    GRASS:Object.freeze(['GRASS_TUFT']),
    BUSH:Object.freeze(['BUSH_ROUND']),
    FERN:Object.freeze(['FERN_CLUSTER']),
    FLOWER:Object.freeze(['WILDFLOWER_PATCH']),
    STUMP:Object.freeze(['TREE_STUMP']),
    FALLEN_LOG:Object.freeze(['FALLEN_LOG']),
    PINE_TREE:Object.freeze(['PINE_TREE']),
    DEAD_TREE:Object.freeze(['DEAD_TREE']),
    BROADLEAF_TREE:Object.freeze(['BROADLEAF_TREE']),
    VINE:Object.freeze(['VINE_CLUSTER','VINE']),
    REED:Object.freeze(['REED_PATCH','REED']),
    MOSS:Object.freeze(['MOSS_PATCH','MOSS']),
    MUSHROOM:Object.freeze(['MUSHROOM_CLUSTER','MUSHROOM']),
    ROOT:Object.freeze(['ROOT_CLUSTER','ROOT']),
    BIOME_VARIANT:Object.freeze(['BIOME_VARIANT','BIOME_SHRUB_VARIANT','AUTUMN_TREE_VARIANT']),
    SEASON_VARIANT:Object.freeze(['SEASON_VARIANT','AUTUMN_TREE_VARIANT']),
    WIND_VARIANT:Object.freeze(['WIND_VARIANT','WIND_BENT_TREE']),
    LOD:Object.freeze(['LOD','LOD_FOLIAGE_PROXY'])
  }),
  PRESENTATION:Object.freeze({
    BRAND_BACKGROUND:Object.freeze(['LOADING_SCREEN','PRESENTATION']),
    LOGO:Object.freeze(['LOADING_SCREEN','INTRO']),
    SPINNER:Object.freeze(['LOADING_SCREEN']),
    PROGRESS_BAR:Object.freeze(['LOADING_SCREEN']),
    TIP:Object.freeze(['LOADING_SCREEN']),
    STATUS_TEXT:Object.freeze(['LOADING_SCREEN'])
  })
});

export const COMMON_LIBRARY_SYSTEM_DEPTH_REFERENCE_PRINCIPLES=Object.freeze([
  'INFORMATION_ARCHITECTURE_NOT_COPY',
  'VISIBLE_STATE_BEFORE_COMMITMENT',
  'CONTEXT_ACTIONS_NEAR_ACTIVE_OBJECT',
  'ITEM_COMPARE_WITH_SOURCE_AND_USAGE',
  'BUILD_SYNERGY_WITH_SET_SOCKET_ENCHANT',
  'RECENT_NEW_FAVORITE_LOCK_STATES',
  'CONTAINER_STASH_LOOT_AND_TRADE_COHERENCE',
  'TOUCH_KEYBOARD_MOUSE_GAMEPAD_PARITY',
  'FAST_BACK_STACK_AND_FOCUS_PRESERVATION',
  'PRESENTATION_ASSET_NEVER_OWNS_GAMEPLAY_SAVE_OR_NETWORK_AUTHORITY'
]);

export const INTERNAL_ASSET_MINIMUM_COVERAGE=Object.freeze({
  CHARACTER:Object.freeze({
    BODY_ARCHETYPE:8,FACE:16,HAIR:20,SKIN_OR_SURFACE:12,CLOTHING_INNER:12,CLOTHING_OUTER:16,
    ARMOR:16,FOOTWEAR:10,ACCESSORY:20,PORTRAIT_OR_ICON:12,EQUIPMENT_SOCKET:12,DAMAGE_STATE:4,
    RIG_PROFILE:6,LOD_LEVELS:3
  }),
  CREATURE:Object.freeze({
    BODY_PLAN:40,SPECIES:80,HEAD_VARIANT:24,APPENDAGE:32,SURFACE_VARIANT:20,RIG_PROFILE:24,
    LOCOMOTION_SET:24,ATTACK_SET:32,HIT_DEATH_SET:24,BOSS_SIGNATURE:16,MUTATION:32,LOD_LEVELS:3
  }),
  BUILDING:Object.freeze({
    FOUNDATION:12,WALL:18,DOOR:12,WINDOW:12,ROOF:16,STAIR:8,FLOOR:12,INTERIOR_KIT:16,
    EXTERIOR_DETAIL:20,PROP_SOCKET:12,LANDMARK:12,COLLISION_NAV_PROXY:8,MATERIAL_VARIANT:12,LOD_LEVELS:3
  }),
  ENVIRONMENT:Object.freeze({
    BIOME:20,COMMON_BIOME_KIT:10,TERRAIN:18,GROUND_DETAIL:20,TREE:24,SHRUB:18,GRASS:12,FLOWER:12,ROCK:20,
    WATER:12,LANDMARK:12,PATH_ROAD:12,CLIFF:12,SET_DRESSING:30,WEATHER:12,SKY_ATMOSPHERE:10,LIGHTING_PRESET:10,
    STREAMING_OR_LOD:6
  }),
  WEAPON:Object.freeze({
    MELEE:20,RANGED:12,MAGIC_FOCUS:10,SHIELD:8,THROWN:8,TOOL:12,EQUIPPED_MODEL:20,WORLD_DROP_MODEL:20,
    INVENTORY_ICON:24,CRAFTING_ICON:16,GRIP_SOCKET_MAP:16,MATERIAL_VARIANT:16,DAMAGE_VARIANT:8,LOD_LEVELS:3
  }),
  SKILL:Object.freeze({
    CAST:20,TELEGRAPH:20,PROJECTILE:14,AREA:14,TRAIL:16,IMPACT:24,REACTION:16,STATUS:16,
    ICON:24,AUDIO_ROLE:20,CAMERA_ROLE:12,MOBILE_DENSITY_VARIANT:12
  }),
  MATERIAL:Object.freeze({
    BASE_SURFACE:24,ROUGHNESS_RESPONSE:16,SPECULAR_RESPONSE:12,WEATHERING:16,DAMAGE:12,
    WET_DRY:10,DIRT_MUD:10,EMISSIVE:10,TRANSPARENT:8,PLATFORM_VARIANT:12,STYLE_VARIANT:12
  }),
  AUDIO:Object.freeze({
    FOOTSTEP:16,CREATURE_VOCAL:24,ATTACK:18,HIT:18,WEAPON:18,ENVIRONMENT:18,UI:16,MAGIC:18,
    BOSS:12,BUILDING:12,WEATHER:12,DIALOGUE_UI:10,VARIATION_SET:16,MOBILE_BUDGET_VARIANT:10
  }),
  VFX:Object.freeze({
    CAST:18,TELEGRAPH:18,TRAIL:16,IMPACT:24,STATUS:18,ENVIRONMENT:18,WEATHER:12,DESTRUCTION:12,
    BOSS:12,REWARD:12,UI_FEEDBACK:12,MOBILE_DENSITY_VARIANT:12
  }),
  UI:Object.freeze({
    ICON:96,FRAME:24,BUTTON:24,HUD:20,INVENTORY:32,EQUIPMENT:24,CHARACTER_SHEET:14,MINIMAP:12,
    DIALOGUE:16,AI_DIALOGUE_HELPER:10,NPC_INTERACTION:16,QUEST:14,PARTY:10,CRAFTING:12,SHOP:12,
    NOTIFICATION:16,STATUS_EFFECT:20,HOTBAR:14,TOOLTIP:18,MODAL:16,LOADING_ERROR_EMPTY_STATE:18,ITEM_DETAIL_COMPARE:16,STASH_LOOT:12,RADIAL_QUICKSLOT:10,CODEX_COLLECTION:12
  }),
  MOTION:Object.freeze({
    IDLE:12,LOCOMOTION:36,START_STOP:12,TURN:12,TRAVERSAL:24,COMBAT:72,WEAPON_COMBAT:52,
    SKILL:28,DEFENSE:24,REACTION:28,SURVIVAL_CRAFTING:28,INTERACTION_UTILITY:24,PAIR:10,
    ACTING:18,DEATH:12,BLEND_TRANSITION:20,MOTION_LOD:8
  }),
  PROP:Object.freeze({
    FURNITURE:30,CONTAINER:24,CRAFTING:24,DECORATION:36,RESOURCE:24,INTERACTIVE:28,DESTRUCTION:16,ITEM_ROLE:24,
    INVENTORY_ICON:20,CRAFTING_ICON:16,DROP_MODEL:18,COLLISION_PROXY:16,MATERIAL_VARIANT:20,LOD_LEVELS:3
  })
});



export const INTERNAL_ASSET_ADAPTATION_AXES=Object.freeze({
  CHARACTER:Object.freeze(['PALETTE','MATERIAL','PROPORTION','FACE_HAIR','CLOTHING','ARMOR','ACCESSORY','EQUIPMENT_SOCKET','MOTION_STYLE']),
  CREATURE:Object.freeze(['PALETTE','MATERIAL','BODY_PROPORTION','HEAD','HORN','TAIL','WING','SHELL','APPENDAGE','ARMOR_PLATE','MOTION_STYLE']),
  BUILDING:Object.freeze(['MATERIAL','ROOF','WALL','DOOR','WINDOW','TRIM','SIGNAGE','PROP_SOCKET','SET_DRESSING','WEATHERING']),
  ENVIRONMENT:Object.freeze(['PALETTE','MATERIAL','VEGETATION_MIX','ROCK_FORM','GROUND_DETAIL','PATH_ROAD','CLIFF','WATER','LANDMARK_DETAIL','WEATHER','LIGHTING','SET_DRESSING','DENSITY','LOD']),
  WEAPON:Object.freeze(['PALETTE','MATERIAL','BLADE_OR_HEAD','GRIP','GUARD','ORNAMENT','WEAR','VFX_SOCKET','ICON_PRESENTATION']),
  SKILL:Object.freeze(['PALETTE','SHAPE_LANGUAGE','TELEGRAPH','TRAIL','PROJECTILE','IMPACT','STATUS_PRESENTATION','ICON','AUDIO_ROLE','DENSITY']),
  MATERIAL:Object.freeze(['PALETTE','ROUGHNESS','SPECULAR','NORMAL_DETAIL','WEATHERING','DAMAGE','WET_DRY','EMISSIVE']),
  AUDIO:Object.freeze(['EQ','PITCH_RANGE','VARIATION','LAYERING','DISTANCE','MIX_PRIORITY','LOOP','EVENT_MAPPING']),
  VFX:Object.freeze(['PALETTE','SHAPE_LANGUAGE','PARTICLE_DENSITY','TRAIL','IMPACT','TIMING','LOD','EVENT_MAPPING']),
  UI:Object.freeze(['THEME','PALETTE','TYPOGRAPHY','ICON','BORDER','CORNER','DEPTH','LAYOUT','SPACING','STATE_VARIANTS','MOTION_FEEDBACK','NAVIGATION_DEPTH','INPUT_HINT','SCREEN_TRANSITION','BACKGROUND_MOTIF']),
  MOTION:Object.freeze(['SPEED','AMPLITUDE','POSE_EXAGGERATION','ANTICIPATION','RECOVERY','BLEND','SECONDARY_MOTION','CONTACT']),
  PROP:Object.freeze(['PALETTE','MATERIAL','PROPORTION','DETAIL_PARTS','WEATHERING','INTERACTION_STATE','ICON_PRESENTATION'])
});



export const COMMON_LIBRARY_LOOSE_VOLUME_BANDS=Object.freeze({
  UI:Object.freeze({minimum:115,targetMin:200,targetMax:360,softReviewAt:520}),
  ITEM:Object.freeze({minimum:40,targetMin:64,targetMax:120,softReviewAt:180}),
  WEAPON:Object.freeze({minimum:20,targetMin:36,targetMax:72,softReviewAt:120}),
  CHARACTER_GEAR:Object.freeze({minimum:18,targetMin:36,targetMax:72,softReviewAt:120}),
  SKILL:Object.freeze({minimum:20,targetMin:40,targetMax:96,softReviewAt:150}),
  VFX:Object.freeze({minimum:22,targetMin:48,targetMax:120,softReviewAt:180}),
  MOTION:Object.freeze({minimum:52,targetMin:80,targetMax:160,softReviewAt:240}),
  MATERIAL:Object.freeze({minimum:25,targetMin:40,targetMax:80,softReviewAt:128}),
  ENVIRONMENT:Object.freeze({minimum:40,targetMin:64,targetMax:140,softReviewAt:220}),
  BUILDING:Object.freeze({minimum:21,targetMin:40,targetMax:90,softReviewAt:140}),
  WORLD_PROP:Object.freeze({minimum:32,targetMin:64,targetMax:160,softReviewAt:240}),
  CREATURE:Object.freeze({minimum:28,targetMin:64,targetMax:160,softReviewAt:240}),
  FOLIAGE:Object.freeze({minimum:18,targetMin:36,targetMax:96,softReviewAt:150}),
  PRESENTATION:Object.freeze({minimum:14,targetMin:24,targetMax:60,softReviewAt:96}),
  AUDIO:Object.freeze({minimum:23,targetMin:48,targetMax:120,softReviewAt:180,measurement:'ROLE_OR_VERIFIED_ASSET_NOT_AUDIO_FILE_CLAIM'})
});


export const INTERNAL_PROGRESSION_COMPLEXITY_PROFILES=Object.freeze({
  VERY_SIMPLE:Object.freeze({
    id:'VERY_SIMPLE',depth:1,
    presentation:Object.freeze(['LEVEL','XP_OR_PROGRESS','MAX_HP_OR_PRIMARY_STAT','ATTACK_OR_PRIMARY_POWER','NEXT_UNLOCK']),
    menuDepthTarget:1,choiceDensity:'LOW',branching:'NONE_OR_SINGLE_CHOICE',
    suitableSignals:Object.freeze(['CASUAL','ARCADE','SHORT_SESSION','SIMPLE_SURVIVAL']),
    gameplayAuthority:false
  }),
  SURVIVAL_SIMPLE:Object.freeze({
    id:'SURVIVAL_SIMPLE',depth:2,
    presentation:Object.freeze(['LEVEL_OR_MILESTONE','PERK_OR_MUTATION','EQUIPMENT_TIER','CRAFTING_TIER','REGION_OR_RESOURCE_MILESTONE','OPTIONAL_SMALL_BRANCH']),
    menuDepthTarget:2,choiceDensity:'MEDIUM',branching:'SMALL_PERK_OR_LOADOUT_BRANCHES',
    suitableSignals:Object.freeze(['SURVIVAL','CRAFTING','BASE_BUILDING','EXPLORATION','MUTATION','PERK']),
    gameplayAuthority:false
  }),
  DEEP_RPG:Object.freeze({
    id:'DEEP_RPG',depth:3,
    presentation:Object.freeze(['ATTRIBUTE','PROFICIENCY','CLASS_OR_ROLE','SUBCLASS_OR_SPECIALIZATION','ACTIVE_SKILL','PASSIVE','RESOURCE','CONDITION','EQUIPMENT_BUILD','FACTION_REPUTATION','COMPANION_RELATION','CRAFTING_SPECIALIZATION','MULTI_BRANCH_PROGRESSION']),
    menuDepthTarget:3,choiceDensity:'HIGH',branching:'MULTI_AXIS_INTERCONNECTED',
    suitableSignals:Object.freeze(['RPG','TABLETOP','PARTY','CLASS','SUBCLASS','D20','PROFICIENCY','COMPANION','DEEP_BUILD']),
    gameplayAuthority:false
  })
});

export function selectInternalProgressionComplexityProfile({requested='AUTO',signals=[]}={}){
  const explicit=upper(requested);
  if(INTERNAL_PROGRESSION_COMPLEXITY_PROFILES[explicit])return INTERNAL_PROGRESSION_COMPLEXITY_PROFILES[explicit];
  const textSignals=uniq(signals).map(upper).join(' ');
  if(/RPG|TABLETOP|D20|CLASS|SUBCLASS|PROFICIENCY|COMPANION|DEEP_BUILD/.test(textSignals))return INTERNAL_PROGRESSION_COMPLEXITY_PROFILES.DEEP_RPG;
  if(/SURVIVAL|CRAFT|BUILDING|EXPLORATION|MUTATION|PERK|RESOURCE/.test(textSignals))return INTERNAL_PROGRESSION_COMPLEXITY_PROFILES.SURVIVAL_SIMPLE;
  return INTERNAL_PROGRESSION_COMPLEXITY_PROFILES.VERY_SIMPLE;
}

export const INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES=Object.freeze({
  SURVIVAL_HOUSING_CONQUEST:Object.freeze({
    version:1,status:'ACTIVE_MACHINE_REFERENCE',protectedExpressionCopyForbidden:true,
    domainTargetMin:Object.freeze({BUILDING:120,WORLD_PROP:140,CREATURE:160,MOTION:160,UI:280,ITEM:96,ENVIRONMENT:100,AUDIO:80,PRESENTATION:40}),
    housing:Object.freeze({
      moduleFamilyTarget:40,themeTarget:16,roomKitTarget:16,
      requiredRoles:Object.freeze(['FOUNDATION_SQUARE','FOUNDATION_TRIANGLE','FLOOR','HALF_WALL','WALL_SOLID','WALL_WINDOW','WALL_CORNER','DOOR_FRAME','DOOR','WINDOW_FRAME','WINDOW','CEILING','ROOF_FLAT','ROOF_SLOPE','ROOF_CORNER','PILLAR','STAIR','RAMP','LADDER','RAILING','FENCE','GATE','BALCONY','ARCHWAY','INTERIOR_KIT','SIGNAGE','PROP_SOCKET','DEFENSE_WALL','WATCHTOWER','TRAP_SOCKET','SIEGE_DAMAGE_PRESENTATION']),
      stateVariants:Object.freeze(['MATERIAL_TIER','PLACEMENT_PREVIEW','VALID_INVALID','DAMAGE','REPAIR','DESTRUCTION','OWNERSHIP','DECAY_OR_UPKEEP','LOD']),
      invasionPresentationRoles:Object.freeze(['INVASION_WARNING','ATTACK_DIRECTION','WAVE_FORECAST','FORTIFICATION_STATUS','SIEGE_DAMAGE','BREACH_WARNING','DEFENSE_RESULT'])
    }),
    creatureEcology:Object.freeze({
      bodyPlanTarget:36,speciesTarget:60,animalSpeciesTarget:30,hostileSpeciesTarget:40,ecologyRoleTarget:14,
      encounterRanks:Object.freeze(['NORMAL','ALPHA','ELITE','CHAMPION','MINIBOSS','WORLD_BOSS']),
      requiredPresentation:Object.freeze(['SPECIES_SILHOUETTE','REGION_VARIANT','AGE_OR_SIZE_VARIANT','THREAT_OR_PREY_ROLE','LOCOMOTION_SET','ATTACK_OR_FLEE_SET','HIT_STAGGER_DEATH','HABITAT_COMPOSITION','LOD'])
    })
  }),
  MARITIME_TRADE_ECONOMY:Object.freeze({
    version:1,status:'ACTIVE_MACHINE_REFERENCE',protectedExpressionCopyForbidden:true,
    domainTargetMin:Object.freeze({BUILDING:100,WORLD_PROP:120,ITEM:120,UI:300,ENVIRONMENT:110,MOTION:140,AUDIO:96,PRESENTATION:48}),
    tradeItemCategoryTarget:18,vesselClassTarget:10,portBuildingRoleTarget:20,
    tradeItemCategories:Object.freeze(['FOOD','SPICE','TEXTILE','WOOD','ORE','METAL','WEAPON','CERAMIC','GEM','ART','MEDICINE','LIVESTOCK','CRAFT_GOOD','LUXURY','BOOK_KNOWLEDGE','RELIGIOUS_GOOD','MILITARY_SUPPLY','SHIP_MATERIAL']),
    portBuildingRoles:Object.freeze(['PIER','DOCK','WAREHOUSE','MARKET','SHIPYARD','CUSTOMS','TRADING_POST','HARBOR_OFFICE','LIGHTHOUSE','TAVERN','GUILD_HALL','FORT','HARBOR_WALL','DRY_DOCK','FISHERY','NAVAL_YARD','MERCHANT_HOUSE','AUCTION_HOUSE','SUPPLY_DEPOT','CART_YARD']),
    requiredUiRoles:Object.freeze(['PORT_MARKET','LOCAL_PRICE','REGIONAL_PRICE_COMPARE','SUPPLY_DEMAND','TAX_TARIFF','CARGO_HOLD','LOAD_UNLOAD','TRADE_ROUTE','TRADE_HISTORY','CONTRACT_ORDER','INVESTMENT_PREVIEW','CREW','FLEET','SHIP_STATUS','WIND_DIRECTION','SEA_RISK','PORT_ENTRY','SHIP_UPGRADE'])
  }),
  CIVILIZATION_WORLD_EXPRESSION:Object.freeze({
    version:1,status:'ACTIVE_MACHINE_REFERENCE',protectedExpressionCopyForbidden:true,
    domainTargetMin:Object.freeze({BUILDING:110,WORLD_PROP:120,ITEM:100,UI:320,ENVIRONMENT:120,MOTION:140,AUDIO:96,PRESENTATION:64}),
    worldMapLayerTarget:12,civilizationIdentityTarget:16,eraPresentationTarget:8,
    worldMapLayers:Object.freeze(['TERRITORY','BORDER','CITY_INFLUENCE','TRADE_ROUTE','RESOURCE','DANGER','WAR_FRONT','CULTURE','RELIGION','CLIMATE','DIPLOMACY','DISCOVERY']),
    requiredUiRoles:Object.freeze(['WORLD_MAP','TERRITORY_LAYER','DIPLOMACY_STATUS','CIVILIZATION_TRAITS','CITY_DETAIL','POPULATION_STATE','HAPPINESS_ORDER','CULTURE_RELIGION','TECH_TREE','ERA_PROGRESS','RESOURCE_FLOW','WORLD_EVENT_LOG','WAR_PEACE_ALLIANCE','POWER_COMPARE','MAP_FILTER','INFLUENCE_HEGEMONY'])
  }),
  RPG_RULES_CRAFTING_SKILL_STORY:Object.freeze({
    version:1,status:'ACTIVE_MACHINE_REFERENCE',protectedExpressionCopyForbidden:true,
    progressionComplexity:Object.freeze(Object.keys(INTERNAL_PROGRESSION_COMPLEXITY_PROFILES)),
    domainTargetMin:Object.freeze({ITEM:140,WEAPON:80,CHARACTER_GEAR:96,SKILL:180,VFX:120,MOTION:200,UI:340,AUDIO:110,PRESENTATION:100,CREATURE:180}),
    tabletopRulePresentation:Object.freeze({requiredUiRoles:Object.freeze(['ABILITY_SCORE','D20_CHECK','PROFICIENCY','ADVANTAGE_DISADVANTAGE','ACTION_ECONOMY','CONDITION','REST','LEVEL_GROWTH','SPELL_OR_SKILL_RESOURCE','EQUIPMENT_REQUIREMENT','EXPLORATION_CHECK','SOCIAL_CHECK']),rulesEngineAuthority:false}),
    professionCrafting:Object.freeze({professionTarget:16,recipeFamilyTarget:80,recipeAxes:Object.freeze(['BASE_RECIPE','QUALITY','MATERIAL_SUBSTITUTION','SPECIALIZATION','TOOL_STATION','ORDER_CONTRACT','BATCH','RARE_PROC','REGIONAL_RECIPE','UPGRADE_RECIPE'])}),
    skillLibrary:Object.freeze({familyTarget:24,skillPresentationTarget:180,axes:Object.freeze(['BASIC','CORE','DEFENSIVE','MOBILITY','CONTROL','SUMMON','AURA','DOT','BURST','CHANNEL','TRANSFORM','COMBO','COUNTER','ULTIMATE','PASSIVE','KEYSTONE','RESOURCE_CONVERTER','STATUS_SYNERGY']),buildAxes:Object.freeze(['ACTIVE','PASSIVE','MODIFIER','VARIANT','GEAR_SYNERGY','STATUS_SYNERGY','RESOURCE_SYNERGY'])}),
    careerMiniGameGrowth:Object.freeze({careerTarget:16,minigameFamilyTarget:20,careerFamilies:Object.freeze(['WARRIOR','RULER','OFFICER','MERCHANT','CRAFTSMAN','PHYSICIAN','SCHOLAR','SPY','SCOUT','PIRATE_OR_NAVAL','CULTURE','DIPLOMAT','MONK_OR_PRIEST','HUNTER','FARMER','ARTISAN'])})
  }),
  SAMURAI_DYNASTY_WUXIA_STORY:Object.freeze({
    version:1,status:'ACTIVE_MACHINE_REFERENCE',protectedExpressionCopyForbidden:true,namedCharacterSectTechniqueCopyForbidden:true,
    domainTargetMin:Object.freeze({BUILDING:120,WORLD_PROP:140,ITEM:140,WEAPON:80,CHARACTER_GEAR:96,SKILL:180,VFX:120,MOTION:200,UI:340,AUDIO:110,PRESENTATION:100,CREATURE:180}),
    samuraiSystems:Object.freeze({
      requiredPresentation:Object.freeze(['CLAN','LORD_VASSAL','LOYALTY','HONOR_REPUTATION','OFFICE_RANK','FIEF_TERRITORY','RETINUE','SUCCESSION','PLEDGE_STATE','ALLIANCE','BETRAYAL_RISK','DUEL','DOJO','SWORD_SCHOOL','BATTLE_COUNCIL','TACTIC','SIEGE','RECRUIT_TALENT']),
      combatStyles:Object.freeze(['KATANA','DUAL_BLADE','SPEAR','POLEARM','BOW','UNARMED','DRAW_STYLE_ABSTRACT','HEAVY_BLADE'])
    }),
    wuxiaSystems:Object.freeze({
      requiredPresentation:Object.freeze(['SECT_FACTION','MASTER_DISCIPLE','FAVOR_DEBT','GRUDGE','REPUTATION','RUMOR','INNER_SKILL','OUTER_SKILL','LIGHTNESS_SKILL','WEAPON_ART','MERIDIAN_PROGRESS','MANUAL_DISCOVERY','SECRET_ENCOUNTER','DUEL_CHALLENGE','ALLIANCE_RIVALRY','MULTI_BRANCH_STORY','MORAL_CHOICE','TRAVEL_EVENT']),
      skillCategories:Object.freeze(['SWORD','SABER','SPEAR','STAFF','FIST','PALM','FINGER','GRAPPLE','THROWING','INNER_POWER','LIGHTNESS','BODY_HARDENING','HEALING','POISON','ACUPOINT_OR_STATUS','COUNTER','FORMATION','SECRET_ART']),
      storyAxes:Object.freeze(['MASTER_DISCIPLE','RIVAL','ROMANCE_OPTIONAL','FACTION_CONFLICT','REVENGE','DEBT_OF_GRATITUDE','SECRET_MANUAL','IDENTITY_SECRET','TOURNAMENT','WAR','ESCORT','INVESTIGATION','TREASURE','HERMIT_ENCOUNTER','MORAL_BRANCH','ENDING_BRANCH'])
    })
  }),
  EXPLORATION_EVENT_WORLD:Object.freeze({
    version:1,status:'ACTIVE_MACHINE_REFERENCE',protectedExpressionCopyForbidden:true,
    domainTargetMin:Object.freeze({ENVIRONMENT:140,WORLD_PROP:160,CREATURE:180,ITEM:140,UI:340,MOTION:200,AUDIO:110,PRESENTATION:100,SKILL:180}),
    explorationAxes:Object.freeze(['DISCOVERY','LANDMARK','HIDDEN_PATH','RUIN','CAVE','DUNGEON','UNDERWATER','MOUNTAIN','FOREST','DESERT','SWAMP','SNOW','OCEAN','CITY','VILLAGE','BORDERLAND']),
    eventFamilies:Object.freeze(['RUMOR','AMBUSH','RESCUE','ESCORT','TREASURE','PUZZLE','WEATHER_HAZARD','NATURAL_DISASTER','RARE_CREATURE','WORLD_BOSS','FACTION_ENCOUNTER','MERCHANT_CARAVAN','SHIPWRECK','PIRATE_ATTACK','LOST_TRAVELER','HERMIT','SECRET_MANUAL','RESOURCE_RUSH','INVASION','FESTIVAL','TOURNAMENT','DIPLOMATIC_INCIDENT','EPIDEMIC','FAMINE','REBELLION','WAR_FRONT_CHANGE','ANCIENT_MECHANISM','MORAL_CHOICE','CHAIN_EVENT']),
    chain:Object.freeze(['DISCOVER_SIGNAL','INVESTIGATE','RISK_OR_CHOICE','RESOLVE','REWARD_OR_COST','WORLD_REACTION','FOLLOWUP_HOOK']),
    contextAxes:Object.freeze(['TIME_OF_DAY','WEATHER','BIOME','REGION','FACTION','REPUTATION','LEVEL_OR_POWER','PARTY_STATE','WORLD_STATE','SEASON','TRADE_STATE','WAR_STATE'])
  }),
  MULTI_AXIS_PROGRESSION_GROWTH:Object.freeze({
    version:1,status:'ACTIVE_MACHINE_REFERENCE',protectedExpressionCopyForbidden:true,
    domainTargetMin:Object.freeze({ITEM:140,WEAPON:80,CHARACTER_GEAR:96,SKILL:180,VFX:120,MOTION:200,UI:340,AUDIO:110,PRESENTATION:100,BUILDING:120,WORLD_PROP:160,CREATURE:180,ENVIRONMENT:140}),
    growthAxes:Object.freeze(['CHARACTER_LEVEL','ATTRIBUTE','CLASS_OR_ROLE','PROFESSION','WEAPON_MASTERY','SKILL_MASTERY','CRAFTING_SPECIALIZATION','EQUIPMENT_TIER','BUILD_SYNERGY','FACTION_REPUTATION','CLAN_OR_SECT_RANK','MASTER_DISCIPLE_RELATION','SETTLEMENT_OR_FIEF','CITY_OR_CIVILIZATION','TRADE_REPUTATION','FLEET','EXPLORATION_KNOWLEDGE','CODEX_DISCOVERY','COMPANION_RELATION','STORY_BRANCH','WORLD_INFLUENCE','ERA_OR_TECH']),
    complexityProfiles:INTERNAL_PROGRESSION_COMPLEXITY_PROFILES,
    rule:'GAME_SELECTS_ONLY_APPLICABLE_COMPLEXITY_AND_AXES'
  }),
  GOTY_MOTION_MUSIC_RESPONSIVITY:Object.freeze({
    version:1,status:'ACTIVE_MACHINE_REFERENCE',protectedExpressionCopyForbidden:true,
    domainTargetMin:Object.freeze({MOTION:200,AUDIO:180,PRESENTATION:100}),
    reusableMotionCategoryTargets:Object.freeze({LOCOMOTION:32,TRAVERSAL:20,COMBAT:64,WEAPON_COMBAT:44,SKILL:24,DEFENSE:20,REACTION:24,SURVIVAL_CRAFTING:24,INTERACTION_UTILITY:20,PAIR:8,ACTING:12,DEATH:8}),
    contextualMotionSystems:Object.freeze(['CONTEXT_SELECTOR','VARIATION_MEMORY','TRANSITION_DIRECTOR','CONTACT_QA','PROCEDURAL_CONTACT_CORRECTION','REACTION_MATCHER','PAIR_MOTION','EMOTION_INTENT','MOTION_LOD','CREATURE_BODY_PLAN_SIGNATURE']),
    reactiveMusicRoles:Object.freeze(['EXPLORATION_CALM','EXPLORATION_TENSION','COMBAT_ENTER','COMBAT_LAYER_LOW','COMBAT_LAYER_HIGH','BOSS_PHASE','VICTORY','DEFEAT','DISCOVERY','CITY','WILDERNESS','DUNGEON','SEA_TRAVEL','STEALTH','DANGER','FACTION_THEME_ROLE','ERA_THEME_ROLE','WEATHER_LAYER','NIGHT_LAYER','SAFE_HOME']),
    musicTransitionAxes:Object.freeze(['LOCATION','THREAT','COMBAT_INTENSITY','BOSS_PHASE','DISCOVERY','TIME_OF_DAY','WEATHER','FACTION','STORY_STATE'])
  })
});

function internalReferenceBreadthTarget(domain=''){
  const key=upper(domain);let targetMin=0;const profileIds=[];
  for(const [profileId,profile] of Object.entries(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES)){
    const value=Math.max(0,Number(profile?.domainTargetMin?.[key])||0);
    if(value>0){targetMin=Math.max(targetMin,value);profileIds.push(profileId);}
  }
  return Object.freeze({targetMin,profileIds:Object.freeze(profileIds)});
}

function verifiedAudioFileCount(assets=[]){
  const fileRe=/\.(?:wav|ogg|mp3|flac|m4a|aac)$/i;
  return (assets||[]).filter(asset=>{
    if(!commonDepthDomainMatch('AUDIO',asset))return false;
    const verified=asset?.productionVerified===true||asset?.verifiedCompanyReusable===true||upper(asset?.runtimeVerificationState)==='VERIFIED_RUNTIME';
    if(!verified)return false;
    return [asset?.path,...(asset?.sourceFiles||[])].map(text).filter(Boolean).some(file=>fileRe.test(file));
  }).length;
}

export const COMMON_UI_SUBSYSTEM_VOLUME_BANDS=Object.freeze({
  INVENTORY_ITEM_MANAGEMENT:Object.freeze({targetMin:32,targetMax:72,softReviewAt:110,keywords:Object.freeze(['INVENTORY','ITEM_','STASH','LOOT','QUICK_SLOT','RADIAL','RECENT_ITEMS','SOURCE_USAGE'])}),
  MENU_NAVIGATION:Object.freeze({targetMin:30,targetMax:72,softReviewAt:110,keywords:Object.freeze(['MENU','NAVIGATION','TOP_BAR','SIDE_NAVIGATION','PAUSE','SETTINGS','SEARCH','FILTER','SORT','FULL_SCREEN','CONFIRM_DIALOG'])}),
  EQUIPMENT_LOADOUT:Object.freeze({targetMin:18,targetMax:42,softReviewAt:70,keywords:Object.freeze(['EQUIPMENT','LOADOUT','SET_BONUS','SOCKET','ENCHANT'])}),
  CRAFTING_UPGRADE:Object.freeze({targetMin:18,targetMax:44,softReviewAt:72,keywords:Object.freeze(['CRAFT','RECIPE','MATERIAL_TRACK','UPGRADE','REPAIR','DISMANTLE'])}),
  SHOP_TRADE:Object.freeze({targetMin:14,targetMax:36,softReviewAt:60,keywords:Object.freeze(['SHOP','BUY','SELL','BUYBACK','TRADE','VENDOR'])}),
  QUEST_CODEX:Object.freeze({targetMin:16,targetMax:40,softReviewAt:64,keywords:Object.freeze(['QUEST','CODEX','COLLECTION','DISCOVERY','LORE'])}),
  NPC_RELATIONSHIP:Object.freeze({targetMin:24,targetMax:56,softReviewAt:88,keywords:Object.freeze(['NPC_','RELATIONSHIP','MEMORY','RUMOR','DIALOGUE'])}),
  PARTY_COMPANION:Object.freeze({targetMin:24,targetMax:64,softReviewAt:96,keywords:Object.freeze(['PARTY','COMPANION','ALLY','REVIVE_RESCUE'])}),
  MOUNT_TRAVEL:Object.freeze({targetMin:18,targetMax:44,softReviewAt:70,keywords:Object.freeze(['MOUNT','TRAVEL','VEHICLE','ROUTE'])}),
  COMBAT_HUD:Object.freeze({targetMin:18,targetMax:48,softReviewAt:76,keywords:Object.freeze(['HEALTH','STATUS','HOTBAR','PARRY','GUARD','BOSS','WAVE','THREAT','COMBO','TARGET'])}),
  HOUSING_SANDBOX:Object.freeze({targetMin:24,targetMax:56,softReviewAt:88,keywords:Object.freeze(['BUILD_','PLACEMENT','HOUSING','BLUEPRINT','SNAP','STABILITY','FURNITURE','OBJECT_TRANSFORM'])}),
  FARMING_SETTLEMENT:Object.freeze({targetMin:18,targetMax:44,softReviewAt:70,keywords:Object.freeze(['FARM','ANIMAL','PROCESSING','SETTLEMENT','CROP','HARVEST'])}),
  ACCESSIBILITY_INPUT:Object.freeze({targetMin:14,targetMax:36,softReviewAt:60,keywords:Object.freeze(['ACCESSIBILITY','INPUT','FOCUS','TOUCH','GAMEPAD','REDUCED_MOTION','SUBTITLE'])}),
  LOADING_ERROR_STATE:Object.freeze({targetMin:16,targetMax:40,softReviewAt:64,keywords:Object.freeze(['LOADING','ERROR','FAILURE','EMPTY','DISABLED','LOCKED','NEW_STATE','STATE_BADGES'])}),
  MOBILE_ONE_HAND:Object.freeze({targetMin:12,targetMax:32,softReviewAt:52,keywords:Object.freeze(['QUICK_SLOT','RADIAL','HOTBAR','INTERACTION_PROMPT','ACTION_BAR','ONE_HAND','TOUCH'])}),
  ECONOMY_TRADE:Object.freeze({targetMin:20,targetMax:48,softReviewAt:76,keywords:Object.freeze(['MARKET','TRADE','PRICE','SUPPLY','DEMAND','TAX','TARIFF','CARGO','CONTRACT','INVESTMENT','VENDOR'])}),
  WORLD_STRATEGY_DIPLOMACY:Object.freeze({targetMin:24,targetMax:56,softReviewAt:88,keywords:Object.freeze(['WORLD_MAP','TERRITORY','DIPLOMACY','CIVILIZATION','ERA','TECH','INFLUENCE','WAR','PEACE','CULTURE','RELIGION'])}),
  FLEET_NAVIGATION:Object.freeze({targetMin:18,targetMax:44,softReviewAt:70,keywords:Object.freeze(['FLEET','SHIP','SAIL','SEA','PORT','CREW','WIND','CARGO','NAVIGATION'])}),
  CONQUEST_DEFENSE:Object.freeze({targetMin:16,targetMax:40,softReviewAt:64,keywords:Object.freeze(['INVASION','SIEGE','DEFENSE','BREACH','FORTIFICATION','RAID_WARNING','WAVE_FORECAST'])}),
  PROGRESSION_GROWTH:Object.freeze({targetMin:24,targetMax:60,softReviewAt:92,keywords:Object.freeze(['LEVEL','ATTRIBUTE','MASTERY','PROGRESSION','GROWTH','REPUTATION','RANK','SPECIALIZATION','TECH_TREE'])}),
  SKILL_BUILD_LIBRARY:Object.freeze({targetMin:24,targetMax:64,softReviewAt:96,keywords:Object.freeze(['SKILL','ABILITY','PASSIVE','KEYSTONE','BUILD','COMBO','RUNE','MODIFIER'])}),
  PROFESSION_CRAFTING:Object.freeze({targetMin:20,targetMax:48,softReviewAt:76,keywords:Object.freeze(['PROFESSION','RECIPE','CRAFTING_ORDER','SPECIALIZATION','MATERIAL_QUALITY','WORK_ORDER'])}),
  FACTION_STORY_RELATION:Object.freeze({targetMin:24,targetMax:60,softReviewAt:92,keywords:Object.freeze(['FACTION','CLAN','SECT','LOYALTY','HONOR','REPUTATION','MASTER','DISCIPLE','RUMOR','STORY_BRANCH'])}),
  EXPLORATION_EVENTS:Object.freeze({targetMin:24,targetMax:60,softReviewAt:92,keywords:Object.freeze(['DISCOVERY','EXPLORATION','EVENT','RUMOR','LANDMARK','HIDDEN','RUIN','TREASURE','WORLD_EVENT','ENCOUNTER'])})
});


export const COMMON_UI_SUBSYSTEM_IDEA_POOLS=Object.freeze({
  INVENTORY_ITEM_MANAGEMENT:Object.freeze([
    'SMART_SORT_PREVIEW','CAPACITY_FORECAST','OVERWEIGHT_RESOLUTION_SHEET','STACK_SPLIT_SLIDER','MULTI_SELECT_BATCH_ACTION',
    'EQUIP_CONFLICT_PREVIEW','ITEM_COMPARE_DELTA','SOURCE_USAGE_TRACE','LOOT_FILTER_PRESET','STASH_TRANSFER_QUEUE',
    'NEW_ITEM_REVIEW_QUEUE','FAVORITE_LOCK_COMBINED_STATE','QUICKSLOT_REBIND_SHEET','DROP_CONFIRM_WITH_RARITY','ITEM_HISTORY_TRAIL'
  ]),
  MENU_NAVIGATION:Object.freeze([
    'SYSTEM_SWITCHER_DRAWER','BREADCRUMB_BACKSTACK','LAST_LOCATION_RESUME','CONTEXT_QUICK_ACTION_SHEET','ONE_HAND_BOTTOM_NAV',
    'SEARCH_RECENT_QUERY_CHIPS','FILTER_ACTIVE_SUMMARY','SORT_REASON_HINT','DEEP_LINK_RETURN_PATH','FOCUS_PRESERVING_TRANSITION',
    'EMPTY_STATE_NEXT_ACTION','LOADING_SKELETON_STATE','OFFLINE_READONLY_STATE','INTERRUPTED_ACTION_RESUME','UNSAVED_CHANGE_GUARD'
  ]),
  EQUIPMENT_LOADOUT:Object.freeze([
    'SLOT_CONFLICT_EXPLAINER','LOADOUT_DIFF_PREVIEW','SET_PROGRESS_TRACKER','SET_BONUS_BREAKPOINT','SOCKET_ROUTE_PREVIEW',
    'ENCHANT_BEFORE_AFTER','DURABILITY_WEAR_PREVIEW','TRANSMOG_LAYER_PREVIEW','QUICK_SWAP_LOADOUT','MISSING_REQUIREMENT_HINT',
    'EQUIPPED_SOURCE_TRACE','UPGRADE_PATH_COMPARE'
  ]),
  CRAFTING_UPGRADE:Object.freeze([
    'CRAFT_QUEUE_OVERVIEW','RECIPE_PREREQUISITE_CHAIN','MATERIAL_SHORTAGE_ROUTE','PINNED_RECIPE_TRACKER','BATCH_CRAFT_PREVIEW',
    'UPGRADE_SUCCESS_STATE','UPGRADE_RESOURCE_DELTA','REPAIR_PRIORITY_LIST','DISMANTLE_RETURN_PREVIEW','CRAFT_STATION_REQUIREMENT',
    'CRAFT_HISTORY_RECENT','ALTERNATE_MATERIAL_PATH'
  ]),
  SHOP_TRADE:Object.freeze([
    'BUY_SELL_TOGGLE_CONTEXT','PRICE_DELTA_COMPARE','BULK_PURCHASE_PREVIEW','BUYBACK_HISTORY','VENDOR_STOCK_STATE',
    'AFFORDABILITY_SHORTFALL_HINT','TRADE_RECEIVE_GIVE_SUMMARY','FAVORITE_VENDOR_ITEM','NEW_VENDOR_STOCK_BADGE','PURCHASE_IMPACT_PREVIEW'
  ]),
  QUEST_CODEX:Object.freeze([
    'QUEST_DEPENDENCY_CHAIN','OBJECTIVE_PROGRESS_TIMELINE','REGION_QUEST_CLUSTER','DISCOVERY_TO_CODEX_LINK','LORE_RELATION_GRAPH',
    'COLLECTION_MISSING_SOURCE_HINT','RECENT_DISCOVERY_FEED','QUEST_REWARD_PREVIEW','FAILED_OBJECTIVE_RECOVERY','STORY_CHAPTER_PROGRESS',
    'BOSS_CODEX_PATTERN_SUMMARY','CREATURE_HABITAT_CODEX'
  ]),
  NPC_RELATIONSHIP:Object.freeze([
    'RELATIONSHIP_TIMELINE','NPC_KNOWN_FACTS','NPC_MEMORY_CHANGE_BADGE','NPC_SCHEDULE_TIMELINE','SERVICE_AVAILABILITY_REASON',
    'RUMOR_SOURCE_CONFIDENCE','GIFT_PREFERENCE_HISTORY','QUEST_HANDOFF_CONTEXT','FACTION_RELATION_SUMMARY','DIALOGUE_TOPIC_HISTORY',
    'NPC_HOME_WORK_LOCATION','RELATIONSHIP_THRESHOLD_PREVIEW'
  ]),
  PARTY_COMPANION:Object.freeze([
    'PARTY_ROLE_OVERVIEW','COMPANION_ORDER_PRIORITY','FORMATION_PREVIEW','TARGET_FOCUS_CARD','REVIVE_PRIORITY_PANEL',
    'HELP_REQUEST_CONTEXT','INVENTORY_HANDOFF_PREVIEW','COMPANION_GEAR_COMPARE','AUTONOMY_SCOPE_PANEL','READY_STATE_SUMMARY',
    'SHARED_OBJECTIVE_CONTRIBUTION','PARTY_PING_HISTORY','DOWNED_MEMBER_EDGE_INDICATOR'
  ]),
  MOUNT_TRAVEL:Object.freeze([
    'MOUNT_CONDITION_HUD','MOUNT_CARGO_CAPACITY','ROUTE_RISK_PREVIEW','FAST_TRAVEL_REQUIREMENT','TRAVEL_PROGRESS_STOPS',
    'MOUNT_RECALL_STATE','VEHICLE_DAMAGE_ZONE','SEAT_ROLE_INDICATOR','MOUNT_COMMAND_CONTEXT','TRAVEL_WEATHER_WARNING',
    'DESTINATION_ACTIVITY_PREVIEW'
  ]),
  COMBAT_HUD:Object.freeze([
    'THREAT_EDGE_INDICATOR','BOSS_PHASE_STRIP','WAVE_FORECAST_RIBBON','STATUS_EFFECT_TIMELINE','PARRY_WINDOW_LAYER',
    'GUARD_BREAK_RECOVERY','COMBO_DECAY_INDICATOR','TARGET_PRIORITY_MARKER','DAMAGE_SOURCE_RECAP','REVIVE_PROGRESS_RING',
    'OBJECTIVE_RISK_STACK','ELITE_MODIFIER_BADGES','DODGE_COOLDOWN_READABILITY','LOW_HEALTH_ACCESSIBLE_WARNING'
  ]),
  HOUSING_SANDBOX:Object.freeze([
    'SNAP_SOCKET_VISUALIZER','STRUCTURAL_SUPPORT_OVERLAY','ROOM_FUNCTION_HEATMAP','BLUEPRINT_GHOST_DIFF','PLACEMENT_COLLISION_REASON',
    'UNDO_HISTORY_TIMELINE','OWNERSHIP_PERMISSION_OVERLAY','BUILD_TIER_COMPARE','DAMAGE_REPAIR_OVERLAY','MATERIAL_THEME_PREVIEW',
    'COPY_REGION_SELECTION','INTERIOR_EXTERIOR_MODE','GRID_FREEPLACE_TOGGLE','DECOR_DENSITY_METER'
  ]),
  FARMING_SETTLEMENT:Object.freeze([
    'CROP_GROWTH_TIMELINE','WATERING_STATE_LAYER','SOIL_CONDITION_HINT','SEASON_FORECAST_STRIP','HARVEST_READY_FILTER',
    'ANIMAL_NEED_SUMMARY','PROCESSING_QUEUE','SETTLEMENT_RESOURCE_FLOW','WORKER_ASSIGNMENT_OVERVIEW','SERVICE_BUILDING_STATUS',
    'STORAGE_PRESSURE_ALERT','FARM_ROUTE_TASK_LIST','MARKET_DAY_PREVIEW'
  ]),
  ACCESSIBILITY_INPUT:Object.freeze([
    'INPUT_MODE_LIVE_SWAP','ACTION_REMAP_CONTEXT','HOLD_DURATION_SETTING','REDUCED_FLASH_MODE','REDUCED_MOTION_MODE',
    'HIGH_CONTRAST_GAMEPLAY_CUES','FONT_SCALE_PREVIEW','COLOR_BLIND_SHAPE_BACKUP','AUDIO_VISUAL_CUE_FALLBACK','HAPTIC_INTENSITY_SETTING',
    'SUBTITLE_SPEAKER_DIRECTION','FOCUS_PATH_DEBUG_HINT'
  ]),
  LOADING_ERROR_STATE:Object.freeze([
    'RETRY_WITH_CAUSE','PARTIAL_LOAD_CONTINUE','OFFLINE_CACHE_STATE','SAVE_CONFLICT_CHOICE','NETWORK_RECONNECT_PROGRESS',
    'MISSING_CONTENT_EXPLANATION','EMPTY_INVENTORY_NEXT_ACTION','EMPTY_QUEST_NEXT_ACTION','DISABLED_REASON_TOOLTIP','LOCKED_REQUIREMENT_CARD',
    'RECOVERY_CHECKPOINT_SUMMARY','FAILED_ACTION_ROLLBACK_FEEDBACK'
  ]),
  MOBILE_ONE_HAND:Object.freeze([
    'THUMB_REACH_ACTION_ARC','CONTEXT_ACTION_STACK','ONE_HAND_RADIAL_QUICKSLOT','BOTTOM_SHEET_DETAIL','EDGE_SAFE_BOSS_WARNING',
    'PORTRAIT_COMBAT_COMPACT','LANDSCAPE_PARITY_LAYOUT','TOUCH_HOLD_CONFIRM','SWIPE_TAB_SYSTEM_SWITCH','LARGE_TARGET_DANGER_ACTION',
    'THUMB_OCCLUSION_SAFE_TOOLTIP'
  ]),
  ECONOMY_TRADE:Object.freeze(['PORT_MARKET_OVERVIEW','LOCAL_PRICE_TREND','REGIONAL_PRICE_COMPARE','SUPPLY_DEMAND_BALANCE','TAX_TARIFF_BREAKDOWN','CARGO_HOLD_MANIFEST','LOAD_UNLOAD_QUEUE','TRADE_ROUTE_BOOKMARK','TRADE_HISTORY_LEDGER','CONTRACT_ORDER_BOARD','INVESTMENT_RETURN_PREVIEW','PERISHABLE_CARGO_WARNING','ILLEGAL_GOOD_RISK_BADGE','CULTURAL_DEMAND_HINT','BULK_TRADE_CONFIRM']),
  WORLD_STRATEGY_DIPLOMACY:Object.freeze(['WORLD_MAP_LAYER_SWITCHER','TERRITORY_BORDER_OVERLAY','CITY_INFLUENCE_HEATMAP','DIPLOMACY_RELATION_MATRIX','CIVILIZATION_TRAIT_PANEL','CITY_POPULATION_STATE','HAPPINESS_ORDER_BREAKDOWN','CULTURE_RELIGION_LAYER','TECH_TREE_BRANCH_COMPARE','ERA_PROGRESS_TIMELINE','RESOURCE_FLOW_NETWORK','WORLD_EVENT_LOG','WAR_PEACE_ALLIANCE_STATE','POWER_COMPARE_OVERVIEW','HEGEMONY_INFLUENCE_TRACKER']),
  FLEET_NAVIGATION:Object.freeze(['FLEET_COMPOSITION_PANEL','SHIP_STATUS_CARD','CREW_MORALE_PANEL','PROVISION_WATER_STATE','CARGO_WEIGHT_BALANCE','WIND_DIRECTION_GAUGE','SAIL_EFFICIENCY_HINT','SEA_RISK_OVERLAY','PORT_ENTRY_PANEL','ANCHOR_DOCK_STATE','SHIP_UPGRADE_COMPARE','DAMAGE_REPAIR_SECTION','NAVIGATION_ROUTE_PLANNER','PIRATE_THREAT_WARNING','CONVOY_FORMATION_PREVIEW']),
  CONQUEST_DEFENSE:Object.freeze(['INVASION_WARNING_BANNER','ATTACK_DIRECTION_COMPASS','DEFENSE_WAVE_FORECAST','FORTIFICATION_STATUS_PANEL','BREACH_WARNING','SIEGE_DAMAGE_SUMMARY','DEFENSE_ASSIGNMENT_OVERVIEW','TRAP_DEFENSE_STATUS','WATCHTOWER_ALERT','BASE_DEFENSE_READINESS','INVASION_RESULT_SUMMARY','LOOT_LOSS_REPORT','REPAIR_PRIORITY_AFTER_SIEGE','ENEMY_FORCE_COMPOSITION','DEFENSE_ROUTE_OVERLAY']),
  PROGRESSION_GROWTH:Object.freeze(['MULTI_AXIS_GROWTH_OVERVIEW','LEVEL_ATTRIBUTE_DELTA','CLASS_ROLE_MILESTONE','PROFESSION_MASTERY','WEAPON_MASTERY','SKILL_MASTERY','CRAFT_SPECIALIZATION','EQUIPMENT_BUILD_COMPARE','FACTION_REPUTATION','CLAN_SECT_RANK','SETTLEMENT_FIEF_GROWTH','CITY_CIVILIZATION_GROWTH','TRADE_REPUTATION','FLEET_GROWTH','EXPLORATION_KNOWLEDGE','COMPANION_RELATION_GROWTH','STORY_BRANCH_PROGRESS','WORLD_INFLUENCE','ERA_TECH_PROGRESS','NEXT_MEANINGFUL_UNLOCK']),
  SKILL_BUILD_LIBRARY:Object.freeze(['SKILL_TREE_OVERVIEW','ACTIVE_PASSIVE_SPLIT','SKILL_VARIANT_COMPARE','RESOURCE_SYNERGY_HINT','STATUS_SYNERGY_HINT','GEAR_SKILL_SYNERGY','COMBO_ROUTE_PREVIEW','DEFENSIVE_SKILL_LOADOUT','MOBILITY_SKILL_LOADOUT','SUMMON_CONTROL_PANEL','AURA_STACK_SUMMARY','DOT_STACK_TIMELINE','ULTIMATE_RESOURCE_STATE','KEYSTONE_IMPACT_PREVIEW','BUILD_PRESET_COMPARE']),
  PROFESSION_CRAFTING:Object.freeze(['PROFESSION_OVERVIEW','RECIPE_BOOK_DEEP','SPECIALIZATION_TREE','CRAFTING_ORDER_BOARD','MATERIAL_QUALITY_COMPARE','RESULT_QUALITY_PREVIEW','WORK_ORDER_HISTORY','DISCOVERY_RECIPE_FEED','TOOL_STATION_REQUIREMENT','REGIONAL_RECIPE_FILTER','BATCH_CRAFT_COST','RARE_PROC_EXPLANATION']),
  FACTION_STORY_RELATION:Object.freeze(['FACTION_RELATION_MATRIX','CLAN_HIERARCHY_PANEL','LOYALTY_HONOR_STATUS','OFFICE_RANK_PROGRESS','FIEF_TERRITORY_SUMMARY','MASTER_DISCIPLE_GRAPH','FAVOR_DEBT_LEDGER','GRUDGE_RELATION_TRACKER','RUMOR_NETWORK','STORY_BRANCH_HISTORY','DUEL_CHALLENGE_CONTEXT','ALLIANCE_BETRAYAL_RISK']),
  EXPLORATION_EVENTS:Object.freeze(['DISCOVERY_SIGNAL_CARD','LANDMARK_REVEAL_PANEL','HIDDEN_PATH_HINT','RUMOR_TO_LOCATION_LINK','EVENT_CHOICE_PANEL','WORLD_REACTION_SUMMARY','RARE_ENCOUNTER_WARNING','WEATHER_HAZARD_ROUTE','SHIPWRECK_EVENT_CARD','SECRET_ENCOUNTER_PANEL','TREASURE_CLUE_CHAIN','PUZZLE_DISCOVERY_LOG','REGION_EVENT_FEED','FOLLOWUP_HOOK_TRACKER','EXPLORATION_COMPLETION_MAP'])
});

export const COMMON_LIBRARY_AUTOMATED_IDEA_POOLS=Object.freeze({
  ITEM:Object.freeze([
    'FIELD_REPAIR_KIT_FAMILY','SIGNAL_AND_MARKER_ITEM_FAMILY','RESEARCH_SAMPLE_CONTAINER','LORE_RECORDING_DEVICE',
    'SURVIVAL_CARRY_CONTAINER','REGIONAL_INGREDIENT_VARIANTS','CRAFT_COMPONENT_FAMILY','UPGRADE_CORE_FAMILY',
    'QUEST_KEY_VARIATION_SET','THROWABLE_UTILITY_FAMILY','AMMUNITION_PRESENTATION_FAMILY','TREASURE_CONTAINER_VARIANTS',
    'WEATHER_PROTECTION_CONSUMABLE','NAVIGATION_TOOL_FAMILY','SALVAGE_PART_FAMILY','FARM_PRODUCE_FAMILY'
  ]),
  WEAPON:Object.freeze([
    'UPGRADE_STAGE_TRIM_FAMILY','DAMAGE_WEAR_FAMILY','FACTION_ORNAMENT_FAMILY','REGIONAL_MATERIAL_VARIANTS',
    'LIGHT_HEAVY_SILHOUETTE_PAIR','RANGED_AMMO_VISUAL_PAIR','MAGIC_FOCUS_SHAPE_FAMILY','SHIELD_PROFILE_FAMILY',
    'THROWN_TOOL_FAMILY','GATHERING_TOOL_SPECIALIZATION','WORLD_DROP_PRESENTATION','CRAFT_ICON_PRESENTATION'
  ]),
  CHARACTER_GEAR:Object.freeze([
    'REGIONAL_WARDROBE_FAMILY','FACTION_SET_IDENTITY','WEATHER_LAYER_OVERLAY','JOB_ROLE_OUTFIT_FAMILY',
    'DAMAGE_WEAR_OVERLAY','UPGRADE_TRIM_STAGE','SOCKET_CHARM_FAMILY','TRANSMOG_BASE_LAYERS',
    'CEREMONIAL_ACCESSORY_SET','SURVIVAL_PACK_STRAP_SET','HORROR_INVESTIGATOR_GEAR','COZY_WORK_CLOTHING'
  ]),
  SKILL:Object.freeze([
    'PROJECTILE_SHAPE_FAMILY','AREA_BOUNDARY_FAMILY','CHANNEL_PROGRESS_PRESENTATION','BEAM_WIDTH_VARIANTS',
    'SUMMON_MARKER_FAMILY','DASH_AFTERIMAGE_FAMILY','SHIELD_SURFACE_FAMILY','HEAL_ZONE_FAMILY',
    'AURA_STATE_FAMILY','STATUS_APPLY_CLEANSE_PAIR','INTERRUPT_FEEDBACK_FAMILY','MOBILE_DENSITY_VARIANTS'
  ]),
  VFX:Object.freeze([
    'WEATHER_RAIN_IMPACT_SET','SNOW_FROST_RESPONSE_SET','DUST_SANDSTORM_SET','WET_SPLASH_SET',
    'MACHINE_SPARK_STEAM_SET','BUILD_PLACE_REPAIR_SET','BIOLOGICAL_POLLEN_SPORE_SET','CREATURE_TRACK_DUST_SET',
    'LOOT_RARITY_LANGUAGE','QUEST_DISCOVERY_REVEAL','BOSS_PHASE_TRANSITION','ENVIRONMENT_ANOMALY_SET',
    'DESTRUCTION_DEBRIS_TIERS','MOBILE_LOW_DENSITY_SET'
  ]),
  MOTION:Object.freeze([
    'CARRY_WEIGHT_VARIANTS','COOP_HANDOFF_PAIR','WORK_TOOL_LOOP_FAMILY','REPAIR_KNEEL_STAND','CLEAN_SWEEP_LOOP',
    'WEATHER_BRACE_REACTION','COLD_SHIVER_IDLE','HEAT_EXHAUSTION_IDLE','MUD_TRUDGE_LOCOMOTION','WET_SHAKE_REACTION',
    'NPC_SERVICE_GESTURES','CEREMONY_ACTING_SET','FARM_WATER_HARVEST_SET','MACHINE_OPERATE_SET','INJURY_SEVERITY_VARIANTS'
  ]),
  MATERIAL:Object.freeze([
    'WETNESS_INTENSITY_STEPS','SNOW_COVERAGE_STEPS','MUD_SPLASH_STEPS','DUST_ACCUMULATION_STEPS','RUST_PROGRESSION_STEPS',
    'MOSS_OVERGROWTH_STEPS','SCORCH_DAMAGE_STEPS','FROST_EDGE_STEPS','HEAT_DISCOLORATION_STEPS','POLLUTION_STAIN_STEPS',
    'COAST_SALT_WEATHERING','INDUSTRIAL_OIL_GRIME','HORROR_DAMP_SURFACE','COZY_WARM_WOOD_VARIANT'
  ]),
  ENVIRONMENT:Object.freeze([
    'MOUNTAIN_RANGE_DEPTH_SET','CITY_SKYLINE_DEPTH_SET','INDUSTRIAL_HORIZON_SET','RUINED_HORIZON_SET',
    'COASTAL_CLIFF_DEPTH_SET','RURAL_FIELD_DEPTH_SET','CAVE_DEPTH_CHAMBERS','UNDERGROUND_INFRASTRUCTURE_SET',
    'COSMIC_ANOMALY_HORIZON','WEATHER_FRONT_TRANSITIONS','TIME_OF_DAY_DEPTH_VARIANTS','DISASTER_AFTERMATH_REGION',
    'INTERIOR_EXTERIOR_BLEND_SET','DISCOVERY_LANDMARK_FAMILY','REGIONAL_SETTLEMENT_VARIANTS'
  ]),
  BUILDING:Object.freeze([
    'DOOR_STATE_FAMILY','INTERIOR_ROOM_KIT','SERVICE_BUILDING_KIT','MARKET_BUILDING_KIT','INDUSTRIAL_BUILDING_KIT',
    'FARM_BUILDING_KIT','RESEARCH_OUTPOST_KIT','RUINED_BUILDING_VARIANTS','RELIGIOUS_CEREMONIAL_KIT',
    'MILITARY_DEFENSE_KIT','DAMAGE_REPAIR_STAGES','REGIONAL_ROOF_WALL_VARIANTS','COLLISION_NAV_PROXY_SET','LOD_BUILDING_SET'
  ]),
  WORLD_PROP:Object.freeze([
    'LIVING_HOME_PROP_SET','FARM_TOOL_PROP_SET','MARKET_DISPLAY_PROP_SET','INDUSTRIAL_MACHINE_PROP_SET',
    'CAMP_SURVIVAL_PROP_SET','EXPLORATION_RESEARCH_PROP_SET','RUIN_DEBRIS_PROP_SET','RELIGIOUS_CEREMONIAL_PROP_SET',
    'MILITARY_CHECKPOINT_PROP_SET','SIGNAL_COMMUNICATION_PROP_SET','WEATHER_MEASUREMENT_PROP_SET','WATER_COAST_PROP_SET',
    'INTERACTION_STATE_VARIANTS','DESTRUCTIBLE_VARIANTS','COLLISION_PROXY_VARIANTS','LOD_PROP_SET'
  ]),
  CREATURE:Object.freeze([
    'AMORPHOUS_BODY_PLAN','AQUATIC_BODY_PLAN','SERPENT_BODY_PLAN','FLYING_BODY_PLAN','GIANT_BODY_PLAN',
    'TORSO_PROPORTION_VARIANTS','SURFACE_BIOME_VARIANTS','SEASONAL_COAT_VARIANTS','ELITE_ORNAMENT_FAMILY',
    'BOSS_SIGNATURE_PARTS','HABITAT_ADAPTATION_PARTS','MUTATION_APPENDAGE_FAMILY','RIG_PROFILE_VARIANTS',
    'LOCOMOTION_PRESENTATION_SET','ATTACK_SILHOUETTE_SET','HIT_DEATH_PRESENTATION_SET'
  ]),
  FOLIAGE:Object.freeze([
    'BROADLEAF_SPECIES_FAMILY','VINE_DENSITY_FAMILY','WETLAND_REED_FAMILY','MOSS_SURFACE_FAMILY',
    'MUSHROOM_BIOME_FAMILY','ROOT_FORM_FAMILY','SEASON_COLOR_SHAPE_VARIANTS','WIND_BENT_VARIANTS',
    'SNOW_LOADED_VARIANTS','DRY_HEAT_STRESSED_VARIANTS','COAST_SALT_STRESSED_VARIANTS','LOD_PROXY_FAMILY'
  ]),
  PRESENTATION:Object.freeze([
    'INPUT_SKIP_HINT','REDUCED_MOTION_INTRO','FAILURE_RECOVERY_SCREEN','RUN_RESULT_TRANSITION','CHAPTER_REVEAL_TRANSITION',
    'BOSS_INTRO_SHORT','WEATHER_EVENT_TRANSITION','REGION_DISCOVERY_REVEAL','OFFLINE_RETURN_SUMMARY','SEASON_EVENT_BUMPER',
    'ONE_HAND_LOADING_VARIANT','LOW_END_DEVICE_LOADING_VARIANT'
  ]),
  AUDIO:Object.freeze([
    'BGM_TITLE_MENU_SET','BGM_SAFE_HOME_SET','BGM_EXPLORATION_CALM_TENSION_SET','BGM_REGION_THEME_FAMILY',
    'BGM_COMBAT_LOW_MID_HIGH_STEMS','BGM_BOSS_PHASE_STEMS','BGM_VICTORY_DEFEAT_SET','BGM_DISCOVERY_STORY_REVEAL_SET',
    'BGM_FACTION_ERA_THEME_FAMILY','BGM_TIME_WEATHER_LAYER_SET','BGM_DUNGEON_STEALTH_DANGER_SET',
    'WIND_STRENGTH_LAYERS','RAIN_DISTANCE_LAYERS','THUNDER_NEAR_FAR','SNOW_MUFFLED_AMBIENCE','INSECT_TIME_OF_DAY_LAYERS',
    'WOLF_HOWL_NEAR_DISTANT_SET','COYOTE_HOWL_NEAR_DISTANT_SET','BEAR_ROAR_GROWL_SET','WILDLIFE_DISTANCE_CALLS',
    'BIRD_CROW_OWL_TIME_OF_DAY_SET','FROG_BAT_INSECT_SCATTER_SET','MONSTER_IDLE_ALERT_ATTACK_HIT_DEATH_SET','BOSS_VOCAL_PHASE_SET',
    'WATER_STREAM_COAST_LAYERS','CAVE_AIR_DRIP_ECHO_SET','CITY_VILLAGE_MARKET_CROWD_SET',
    'MACHINE_LOAD_STATES','STRUCTURE_CREAK_STRESS','TOOL_WORK_VARIATIONS','FOOTSTEP_SURFACE_ROLES',
    'WEAPON_CONTACT_MATERIAL_SET','PROJECTILE_RELEASE_FLYBY_IMPACT_SET','SKILL_PREPARE_CAST_TRAVEL_IMPACT_SET',
    'LOOT_RARITY_ROLES','CRAFT_REPAIR_UPGRADE_DISMANTLE_SET','DOOR_CHEST_SWITCH_LEVER_SET',
    'BOSS_WARNING_ROLES','UI_FULL_FEEDBACK_SET','INTERIOR_EXTERIOR_TRANSITION','OCCLUSION_REVERB_ZONE_ROLES',
    'NEAR_MID_FAR_DISTANCE_BANDS','REPEATER_VARIATION_AND_DEDUPE','MOBILE_MIX_PRIORITY_VARIANTS'
  ]),
  UI:Object.freeze([
    'INVENTORY_DEPTH_EXPANSION','MENU_NAVIGATION_DEPTH_EXPANSION','COMBAT_HUD_DEPTH_EXPANSION','HOUSING_SANDBOX_DEPTH_EXPANSION',
    'FARM_SETTLEMENT_DEPTH_EXPANSION','NPC_SOCIAL_DEPTH_EXPANSION','ACCESSIBILITY_INPUT_DEPTH_EXPANSION','MOBILE_ONE_HAND_DEPTH_EXPANSION'
  ])
});


export const INTERNAL_ASSET_REFERENCE_IDEA_POOLS=Object.freeze({
  ITEM:Object.freeze(['TRADE_SPICE_FAMILY','TRADE_TEXTILE_FAMILY','TRADE_CERAMIC_FAMILY','TRADE_LUXURY_FAMILY','TRADE_MEDICINE_FAMILY','TRADE_BOOK_KNOWLEDGE_FAMILY','SHIP_SUPPLY_FAMILY','DIPLOMATIC_GIFT_FAMILY','FACTION_TOKEN_FAMILY','SKILL_MANUAL_FAMILY','SECRET_CLUE_ITEM_FAMILY','EXPLORATION_RELIC_FAMILY','PROFESSION_ORDER_ITEM_FAMILY','REGIONAL_SPECIALTY_FAMILY','PERISHABLE_CARGO_FAMILY','CONTRABAND_RISK_FAMILY','CIVILIZATION_RESOURCE_FAMILY','FIEF_TAX_GOOD_FAMILY']),
  WEAPON:Object.freeze(['KATANA_PROFILE_FAMILY','DUAL_BLADE_PROFILE_FAMILY','POLEARM_PROFILE_FAMILY','BOW_PROFILE_FAMILY','WUXIA_SWORD_PROFILE_FAMILY','WUXIA_SABER_PROFILE_FAMILY','STAFF_PROFILE_FAMILY','FIST_GAUNTLET_PROFILE','THROWING_WEAPON_PROFILE','NAVAL_BOARDING_WEAPON_FAMILY','CEREMONIAL_WEAPON_VARIANTS','FACTION_WEAPON_ORNAMENTS']),
  CHARACTER_GEAR:Object.freeze(['SAMURAI_ARMOR_LAYER_FAMILY','RONIN_TRAVEL_GEAR','WUXIA_ROBE_LAYER_FAMILY','SECT_UNIFORM_FAMILY','MERCHANT_ATTIRE_FAMILY','NAVAL_CREW_ATTIRE','OFFICER_COURT_ATTIRE','CRAFT_PROFESSION_OUTFIT','EXPLORER_TRAVEL_SET','CLIMATE_LAYER_VARIANTS','FACTION_RANK_ORNAMENT','CEREMONIAL_FORMAL_SET']),
  SKILL:Object.freeze(['SWORD_COMBO_BRANCH_FAMILY','SABER_HEAVY_BRANCH_FAMILY','SPEAR_CONTROL_BRANCH_FAMILY','STAFF_REACH_BRANCH_FAMILY','FIST_COMBO_BRANCH_FAMILY','PALM_FORCE_BRANCH_FAMILY','GRAPPLE_CONTROL_FAMILY','THROWING_WEAPON_SKILL_FAMILY','INNER_POWER_RESOURCE_FAMILY','LIGHTNESS_MOVEMENT_FAMILY','BODY_HARDENING_DEFENSE_FAMILY','HEALING_MERIDIAN_FAMILY','POISON_STATUS_FAMILY','ACUPOINT_INTERRUPT_FAMILY','COUNTER_RIPOSTE_FAMILY','FORMATION_BUFF_FAMILY','SUMMON_COMPANION_FAMILY','AURA_BUILD_FAMILY','DOT_BUILD_FAMILY','BURST_BUILD_FAMILY','CHANNEL_BUILD_FAMILY','TRANSFORM_BUILD_FAMILY','RESOURCE_CONVERTER_FAMILY','STATUS_SYNERGY_FAMILY','GEAR_SYNERGY_FAMILY','KEYSTONE_PASSIVE_FAMILY','ULTIMATE_SKILL_FAMILY','SECRET_ART_VARIANT_FAMILY','BOSS_STOLEN_TECHNIQUE_ABSTRACT','EXPLORATION_UNLOCK_SKILL_FAMILY']),
  VFX:Object.freeze(['WUXIA_TRAIL_LANGUAGE','INNER_POWER_AURA_FAMILY','ACUPOINT_STATUS_MARKERS','PARRY_COUNTER_CONTACT_SET','FACTION_BANNER_VFX','NAVAL_CANNON_IMPACT_SET','SHIP_DAMAGE_SMOKE_FIRE_SET','TRADE_RARITY_REVEAL','TECH_ERA_UNLOCK_VFX','TERRITORY_CHANGE_VFX','SECRET_DISCOVERY_VFX','WORLD_EVENT_ALERT_VFX','DUEL_INTRO_VFX','SKILL_BUILD_SYNERGY_VFX','ULTIMATE_READABILITY_SET','MOBILE_SKILL_DENSITY_SET']),
  MOTION:Object.freeze(['STRAFE_LEFT_RIGHT_LOCOMOTION','BACKPEDAL_LOCOMOTION','TURN_45_90_180_FAMILY','JUMP_AIR_FALL_FAMILY','LIGHT_HEAVY_LAND_FAMILY','CROUCH_MOVE_STEALTH_FAMILY','MANTLE_VAULT_TRAVERSAL','SWIM_SURFACE_DIVE_FAMILY','DIRECTIONAL_HIT_STRENGTH_SET','KNOCKBACK_KNOCKDOWN_GETUP_SET','WALL_HIT_RECOVERY_SET','TECH_ROLL_RECOVERY_SET','WEAPON_STANCE_FAMILY','WEAPON_FOOTWORK_FAMILY','LIGHT_COMBO_BRANCH_FAMILY','HEAVY_COMMIT_RECOVERY_FAMILY','GAP_CLOSER_ATTACK_FAMILY','AERIAL_ATTACK_FAMILY','PARRY_COUNTER_RIPOSTE_FAMILY','GRAPPLE_PAIR_FAMILY','FINISHER_PAIR_FAMILY','SKILL_PREPARE_RELEASE_RECOVERY','EMOTION_INTENT_IDLE_FAMILY','GROUP_FORMATION_MOTION','CREATURE_BODYPLAN_SIGNATURE_FAMILY','BOSS_INTRO_PHASE_ENRAGE_DEATH','MOUNT_BOARD_RIDE_DISMOUNT','SHIP_DECK_WORK_FAMILY','SAIL_ROPE_WINCH_WORK_FAMILY','DIPLOMACY_CEREMONY_GESTURE_FAMILY','DOJO_TRAINING_FAMILY','WUXIA_LIGHTNESS_TRAVERSAL']),
  MATERIAL:Object.freeze(['SHIP_WET_WOOD_FAMILY','SAIL_CLOTH_WEATHERING','HISTORICAL_LACQUER_FAMILY','AGED_PAPER_SCROLL_FAMILY','BRONZE_IRON_AGE_VARIANTS','CERAMIC_GLAZE_VARIANTS','SALT_CORROSION_FAMILY','PORT_GRIME_WETNESS','TEMPLE_WOOD_STONE_VARIANTS','WUXIA_SILK_ROBE_MATERIALS','FACTION_BANNER_FABRIC','BATTLE_DAMAGE_BUILDING_MATERIAL']),
  ENVIRONMENT:Object.freeze(['ARCHIPELAGO_ROUTE_REGION','HARBOR_CITY_REGION','NAVAL_STRAIT_REGION','OPEN_OCEAN_WEATHER_REGION','TRADE_WIND_CORRIDOR','CIVILIZATION_BORDERLAND_REGION','WAR_FRONT_REGION','FIEF_CASTLE_TOWN_REGION','WUXIA_MOUNTAIN_SECT_REGION','BAMBOO_FOREST_TRAVEL_REGION','CLIFF_HERMIT_REGION','ANCIENT_RUIN_CHAIN','HIDDEN_CAVE_ROUTE','UNDERWATER_WRECK_REGION','CARAVAN_ROAD_REGION','RIVER_TRADE_REGION','FESTIVAL_CITY_STATE','FAMINE_DROUGHT_STATE','REBELLION_DAMAGED_REGION','ERA_GROWTH_CITY_VARIANTS','DISCOVERY_LANDMARK_CHAIN','SECRET_PATH_VARIANTS','WEATHER_EVENT_REGION_SET','TIME_OF_DAY_EVENT_VARIANTS']),
  BUILDING:Object.freeze(['SQUARE_TRIANGLE_FOUNDATION_FAMILY','WEDGE_HALF_WALL_FAMILY','INNER_OUTER_CORNER_FAMILY','ARCH_DOOR_WINDOW_FAMILY','BALCONY_VERANDA_FAMILY','STAIR_RAMP_LADDER_FAMILY','DEFENSE_WALL_TOWER_FAMILY','GATEHOUSE_BREACH_FAMILY','TRAP_SOCKET_FORTIFICATION','MATERIAL_TIER_BUILDING_FAMILY','HARBOR_PIER_DOCK_KIT','SHIPYARD_DRYDOCK_KIT','WAREHOUSE_CUSTOMS_KIT','LIGHTHOUSE_HARBOR_OFFICE','MERCHANT_GUILD_BUILDING_KIT','CITY_RESIDENTIAL_TIER_FAMILY','PALACE_COUNCIL_KIT','CULTURE_RELIGION_LANDMARK_KIT','ERA_ARCHITECTURE_VARIANT_FAMILY','WAR_DAMAGE_RECONSTRUCTION_FAMILY','SAMURAI_CASTLE_TOWN_KIT','DOJO_TRAINING_KIT','WUXIA_SECT_COMPOUND_KIT','CARAVANSERAI_TRADE_KIT']),
  WORLD_PROP:Object.freeze(['PORT_CRANE_WINCH_SET','ROPE_SAIL_RIGGING_SET','CARGO_CRATE_BARREL_VARIANTS','MARKET_STALL_GOODS_SET','CUSTOMS_LEDGER_PROP_SET','NAVIGATION_MAP_TABLE_SET','FACTION_BANNER_STANDARD_SET','SIEGE_DEFENSE_PROP_SET','DOJO_TRAINING_PROP_SET','WUXIA_SCROLL_MANUAL_PROP_SET','HERMIT_CAMP_PROP_SET','SHRINE_TEMPLE_PROP_SET','DIPLOMACY_GIFT_DISPLAY','CITY_CIVIC_PROP_SET','TECH_ERA_PROP_VARIANTS','EXPLORATION_CLUE_PROP_SET','RUIN_MECHANISM_PROP_SET','HIDDEN_PATH_MARKER_SET','WORLD_EVENT_PROP_VARIANTS','FESTIVAL_PROP_SET','CARAVAN_PROP_SET','SHIPWRECK_DEBRIS_SET','BATTLEFIELD_AFTERMATH_SET','FIEF_ADMIN_PROP_SET']),
  CREATURE:Object.freeze(['CANINE_WILDLIFE_FAMILY','FELINE_WILDLIFE_FAMILY','URSINE_WILDLIFE_FAMILY','BOAR_WILDLIFE_FAMILY','DEER_HOOFED_WILDLIFE_FAMILY','SMALL_PREY_WILDLIFE_FAMILY','GROUND_BIRD_WILDLIFE_FAMILY','FLYING_BIRD_WILDLIFE_FAMILY','REPTILE_WILDLIFE_FAMILY','AQUATIC_FISH_FAMILY','SHARK_PREDATOR_FAMILY','CEPHALOPOD_FAMILY','CRABLIKE_FAMILY','INSECT_SWARM_FAMILY','ARACHNID_VARIANT_FAMILY','HUMANOID_FACTION_FAMILY','UNDEAD_FAMILY','GOLEM_CONSTRUCT_FAMILY','GIANT_COLOSSUS_FAMILY','APEX_PREDATOR_FAMILY','PREY_PREDATOR_ECOLOGY_PAIR','PACK_BEHAVIOR_PRESENTATION','AMBUSH_BEHAVIOR_PRESENTATION','TERRITORIAL_BEHAVIOR_PRESENTATION','NORMAL_ALPHA_ELITE_CHAMPION_FAMILY','MINIBOSS_WORLD_BOSS_SIGNATURE','REGION_CLIMATE_SURFACE_VARIANTS','AGE_SIZE_PROPORTION_VARIANTS','DAMAGE_SCAR_WEAR_VARIANTS','CREATURE_LOD_FAMILY']),
  FOLIAGE:Object.freeze(['BAMBOO_SPECIES_FAMILY','TEA_FIELD_FOLIAGE','RICE_FIELD_FOLIAGE','COASTAL_PINE_FAMILY','MOUNTAIN_HERB_FAMILY','MEDICINAL_PLANT_FAMILY','POISON_PLANT_FAMILY','ORCHARD_TREE_FAMILY','RIVER_REED_FAMILY','TEMPLE_GARDEN_FAMILY','WAR_DAMAGED_FOLIAGE','SEASONAL_CIVILIZATION_VARIANTS']),
  PRESENTATION:Object.freeze(['INVASION_WARNING_SEQUENCE','PORT_DISCOVERY_SEQUENCE','SHIP_DEPARTURE_SEQUENCE','TRADE_SUCCESS_SEQUENCE','ERA_TRANSITION_SEQUENCE','CITY_GROWTH_SEQUENCE','WAR_DECLARATION_SEQUENCE','DIPLOMACY_RESOLUTION_SEQUENCE','TECH_UNLOCK_SEQUENCE','TERRITORY_CHANGE_SEQUENCE','FACTION_RANK_UP_SEQUENCE','DOJO_MASTERY_SEQUENCE','SECT_INITIATION_SEQUENCE','SECRET_ART_DISCOVERY_SEQUENCE','WORLD_EVENT_BANNER_FAMILY','EXPLORATION_LANDMARK_REVEAL','RARE_ENCOUNTER_REVEAL','TOURNAMENT_INTRO_RESULT','STORY_BRANCH_CONSEQUENCE','PROGRESSION_MILESTONE_SEQUENCE','BOSS_PHASE_SEQUENCE','FESTIVAL_EVENT_SEQUENCE','SHIPWRECK_EVENT_SEQUENCE','CIVILIZATION_CRISIS_SEQUENCE']),
  AUDIO:Object.freeze([
    'UI_CONFIRM_CANCEL_ERROR_REWARD_ROLES','FOOTSTEP_SURFACE_ROLE_FAMILY','WEAPON_SWING_HIT_BLOCK_PARRY_ROLES',
    'CREATURE_VOCAL_ROLE_FAMILY','CANINE_HOWL_DISTANCE_ROLE_FAMILY','WILDLIFE_TIME_STATE_CALL_FAMILY',
    'SKILL_CAST_IMPACT_ROLE_FAMILY','PROJECTILE_AUDIO_ROLE_FAMILY','ITEM_PICKUP_ROLE_FAMILY','CRAFT_UPGRADE_ROLE_FAMILY',
    'BUILDING_CONSTRUCTION_DAMAGE_ROLES','PORT_HARBOR_AMBIENCE_ROLES','SAIL_ROPE_WOOD_SHIP_ROLES','MARKET_CITY_CROWD_ROLES',
    'CAVE_WATER_WIND_AMBIENCE_ROLES','INTERIOR_EXTERIOR_ROOMTONE_ROLES','OCCLUSION_REVERB_DISTANCE_ROLE_FAMILY',
    'NAVAL_COMBAT_WARNING_ROLES','DIPLOMACY_CIVILIZATION_EVENT_ROLES','ERA_TECH_UNLOCK_ROLES',
    'TITLE_MENU_MUSIC_ROLE','EXPLORATION_DISCOVERY_MUSIC_ROLES','COMBAT_INTENSITY_MUSIC_LAYERS','BOSS_PHASE_MUSIC_LAYERS',
    'TIME_WEATHER_MUSIC_LAYERS','FACTION_THEME_ROLE_FAMILY','SAFE_HOME_MUSIC_ROLE','DUNGEON_TENSION_MUSIC_ROLE',
    'STEALTH_DANGER_MUSIC_ROLE','VICTORY_DEFEAT_MUSIC_ROLE','SEA_TRAVEL_MUSIC_ROLE',
    'VARIATION_SET_CONTRACTS','REPEATER_DEDUPE_CONTRACTS','MOBILE_AUDIO_BUDGET_VARIANTS'
  ]),
  UI:Object.freeze(['ECONOMY_TRADE_DEPTH_EXPANSION','WORLD_STRATEGY_DIPLOMACY_DEPTH_EXPANSION','FLEET_NAVIGATION_DEPTH_EXPANSION','CONQUEST_DEFENSE_DEPTH_EXPANSION','PROGRESSION_GROWTH_DEPTH_EXPANSION','SKILL_BUILD_DEPTH_EXPANSION','PROFESSION_CRAFTING_DEPTH_EXPANSION','FACTION_STORY_DEPTH_EXPANSION','EXPLORATION_EVENT_DEPTH_EXPANSION'])
});

export const COMMON_UI_SYSTEM_COMPOSITION_GRAPH=Object.freeze({
  version:1,
  inventoryFlow:Object.freeze([
    'PICKUP','NEW_STATE','DETAIL','COMPARE','CONTEXT_ACTION','USE_OR_EQUIP','CONTAINER_OR_STASH','TRANSFER',
    'QUICK_SLOT_OR_RADIAL','LOADOUT','UPGRADE_OR_REPAIR_OR_DISMANTLE','SOURCE_AND_USAGE','CODEX','RECENT_ITEMS'
  ]),
  menuRoots:Object.freeze([
    'MAIN_MENU','IN_GAME_PAUSE','INVENTORY','EQUIPMENT','CHARACTER','MAP_TRAVEL','QUEST','CRAFTING',
    'SHOP_TRADE','CODEX_COLLECTION','SOCIAL_PARTY','HOUSING_SANDBOX','FARM_SETTLEMENT','SETTINGS_ACCESSIBILITY','RUN_RESULT'
  ]),
  recommendedDepth:3,
  softReviewDepth:5,
  hardBlockDepth:null,
  preserveBackStack:true,
  preserveSelectionFocus:true,
  touchFirst:true,
  contextActionsNearActiveObject:true,
  deepNavigationAllowedWhenContextIsPreserved:true,
  colorOnlyStateForbidden:true,
  gameplayAuthority:false,
  saveAuthority:false,
  networkAuthority:false
});

export const INTERNAL_ASSET_STUDIO_VARIATION_AXES=Object.freeze({
  BUILDING:Object.freeze(['FUNCTION_ROLE','INTERIOR_EXTERIOR','MATERIAL_TIER','REGION_CLIMATE','DAMAGE_REPAIR_DECAY','OWNERSHIP_FACTION','CONSTRUCTION_STATE','LOD']),
  CREATURE:Object.freeze(['BODY_PLAN','AGE_SIZE','REGION_CLIMATE','NORMAL_ALPHA_ELITE_BOSS','SURFACE_MATERIAL','DAMAGE_SCAR_WEAR','MOTION_IDENTITY','SEASON_EVENT','LOD']),
  MOTION:Object.freeze(['INTENT','WEIGHT','SPEED','START_STOP_TURN','WEAPON_STANCE','REACTION_DIRECTION_STRENGTH','FATIGUE_INJURY','EMOTION_ACTING','CONTACT','LOD']),
  UI:Object.freeze(['DEFAULT_HOVER_PRESSED_DISABLED','EMPTY_LOADING_ERROR_SUCCESS','TOUCH_GAMEPAD_KEYBOARD','COMPACT_STANDARD_EXPANDED','ACCESSIBILITY','INFORMATION_DENSITY','CONTEXT_STATE']),
  WORLD_PROP:Object.freeze(['FUNCTION_ROLE','INTERACTION_STATE','REGION_CLIMATE','WEAR_DAMAGE','OWNERSHIP_FACTION','SET_DRESSING_CONTEXT','LOD']),
  ENVIRONMENT:Object.freeze(['BIOME_REGION','FOREGROUND_MIDGROUND_BACKGROUND','WEATHER','TIME_OF_DAY','SEASON','CIVILIZATION_STATE','DAMAGE_RECOVERY','ATMOSPHERE','LOD_STREAMING']),
  ITEM:Object.freeze(['RARITY','MATERIAL_TIER','WORLD_DROP_INVENTORY_CRAFT','USED_UNUSED_EMPTY','REGION_SOURCE','WEAR_DAMAGE','STACK_PRESENTATION']),
  SKILL:Object.freeze(['PREPARE_TELEGRAPH_RELEASE_IMPACT_RECOVERY','PROJECTILE_BEAM_AOE_SUMMON','BUFF_DEBUFF_HEAL','ELEMENT_AFFINITY','POWER_TIER','MOBILE_DENSITY']),
  VFX:Object.freeze(['ANTICIPATION_CONTACT_AFTEREFFECT','INTENSITY_TIER','SHAPE_LANGUAGE','ELEMENT_AFFINITY','WEATHER_ENVIRONMENT','MOBILE_DENSITY','LOD']),
  PRESENTATION:Object.freeze(['INTRO_TRANSITION_RESULT','DISCOVERY_MILESTONE','SUCCESS_FAILURE_RECOVERY','BOSS_PHASE','WORLD_EVENT','INPUT_SKIP_ACCESSIBILITY','MOBILE_DENSITY']),
  CHARACTER_GEAR:Object.freeze(['BODY_SLOT','LIGHT_MEDIUM_HEAVY','OCCUPATION_FACTION','REGION_CLIMATE','RANK_RARITY','DAMAGE_WEAR','CEREMONIAL_WORK_COMBAT','LOD']),
  WEAPON:Object.freeze(['FAMILY_ROLE','ONE_TWO_HAND','RARITY_ORNAMENT','MATERIAL_TIER','DAMAGE_WEAR','REGION_FACTION','EQUIP_WORLD_DROP_ICON','MOTION_VFX_PAIRING','LOD']),
  AUDIO:Object.freeze(['EVENT_ROLE','MUSIC_STATE','INTENSITY_LAYER','DISTANCE_BAND','SURFACE_MATERIAL','CREATURE_SPECIES_STATE','WEATHER_TIME','REGION_FACTION','INTERIOR_EXTERIOR','OCCLUSION_REVERB','VARIATION_SET','REPEATER_DEDUPE','MOBILE_BUDGET']),
  FOLIAGE:Object.freeze(['SPECIES','BIOME_REGION','SEASON','WEATHER_WIND','HEALTH_DAMAGE','DENSITY','FOREGROUND_MIDGROUND_BACKGROUND','LOD']),
  MATERIAL:Object.freeze(['SURFACE_FAMILY','CLEAN_WORN_DAMAGED','DRY_WET_FROZEN_CORRODED','REGION_CLIMATE','RARITY_ENERGY','LIGHT_RESPONSE','LOD_COST'])
});

export const INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT=Object.freeze({
  version:13,
  scope:'ALL_INTERNAL_COMMON_LIBRARIES',
  catalogDiscovery:'assets/roblox/common-*/catalog.json',
  seedDiscovery:'artbook-submissions/seed-*/current.json',
  registry:'company-asset-library.json',
  persistentWorklistField:'internalAssetLibraryAutomation.nextVolumeActions',
  automaticOperations:Object.freeze([
    'DISCOVER_COMMON_CATALOGS',
    'SYNC_PACK_COUNTS',
    'SYNC_ATOM_OR_ITEM_ROWS',
    'SYNC_CATALOG_TITLE_AND_VERSION_METADATA',
    'REBUILD_SYSTEM_DEPTH_GAPS',
    'REBUILD_LOOSE_VOLUME_PLAN',
    'REBUILD_UI_SUBSYSTEM_DEPTH',
    'REBUILD_COMPANY_SEED_DEMAND',
    'REBUILD_REFERENCE_BREADTH_PROFILE_GAPS',
    'FILTER_IDEAS_ALREADY_PRESENT_BY_ID_ATOM_OR_ROLE',
    'ATTACH_LICENSE_VERIFIED_FREE_SOURCE_CANDIDATES_TO_WORKLIST',
    'KEEP_FREE_SOURCE_CANDIDATES_METADATA_ONLY_UNTIL_SELECTED',
    'ACQUIRE_SELECTED_FREE_SOURCE_ON_DEMAND',
    'OVERLAY_SOURCE_BOUND_REFERENCE_IMAGE_IDEAS_FOR_CURRENT_TASK',
    'ATTACH_STYLE_EXPRESSION_AXES_TO_WORKLIST',
    'PERSIST_PRIORITY_ORDERED_NEXT_VOLUME_ACTIONS',
    'SELECT_VOLUME_OR_QUALITY_FOCUS',
    'CONTINUE_NORMAL_SAFE_ASSET_WORK_WITHOUT_HUMAN_OR_CHATGPT_PRESENCE',
    'QUARANTINE_BLOCKED_ASSET_AND_CONTINUE_NEXT_SAFE_ACTION',
    'ENTER_QUALITY_UP_1000_IMMEDIATELY_AFTER_RECOMMENDED_VOLUME',
    'RESCAN_LIBRARY_TYPE_ROLE_AND_QUALITY_METADATA_EVERY_CYCLE',
    'REINDEX_INTERNAL_REUSE_DONORS_FROM_CURRENT_QUALITY',
    'REBUILD_WORKLIST_AFTER_LIBRARY_FRESHNESS_CHANGE',
    'REVIEW_SEMANTIC_DUPLICATE_GROUPS_WITHOUT_AUTOMATIC_DELETION',
    'REBUILD_AUDIO_BGM_AMBIENCE_VOCAL_SFX_BREADTH',
    'REAUDIT_EXISTING_AUDIO_QUALITY_AND_VARIATION',
    'MARK_STALE_ROWS_FOR_REVIEW_WITHOUT_DELETION'
  ]),
  countPolicy:'LOOSE_TARGET_BANDS_NOT_HARD_CAPS',
  hardMaximum:null,
  overSoftLimitAction:'DEDUPLICATION_REVIEW_ONLY',
  overSoftLimitBlocksUse:false,
  perDomainIdeaBudgetPerCycle:24,
  preferDistinctRoleStateGenreCombination:true,
  ideaDeduplicationFields:Object.freeze(['id','assetId','atomId','role','roles','sourceIdeaId','ideaId']),
  repeatedDistinctVariationProposalForbidden:true,
  volumeBeforeQuality:false,
  qualityUpStartsOnlyAfterRecommendedVolume:false,
  qualityTargetInternalAuditScore:1000,
  qualityUpWorkingBandMin:980,
  qualityUpSelection:'WEAKEST_INTERNAL_AUDIT_AXIS_FIRST',
  focusPhases:Object.freeze(['VOLUME_UP','QUALITY_UP_1000']),
  volumeActionConsumption:'PERSISTED_PRIORITY_WORKLIST_FIRST',
  freeSourceCandidateLimitPerAction:8,
  freeSourceCatalogSufficiencyCount:12,
  styleExpressionRequiredForAllDomains:true,
  styleExpressionContractRef:'assets/vibe-studio-asset-universe.js#INTERNAL_ASSET_STYLE_EXPRESSION_AXES',
  styleExpressionDomainBindingRef:'assets/vibe-studio-asset-universe.js#INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS',
  referenceImageIdeaOverlay:Object.freeze({
    enabled:true,
    priority:'CURRENT_TASK_BEFORE_PERSISTED_GENERIC_VOLUME_ACTIONS',
    taskLocalOnly:true,
    persistentRegistryStorageForbidden:true,
    rawImagePersistentLearningForbidden:true,
    sourceBoundObservationRequired:true,
    directCopyForbidden:true,
    unseenGeometryAndMotionRemainCreativeProposals:true,
    productionPromotionAutomatic:false,
    producedAssetMayEnterCatalogOnlyAfterNormalAssetQA:true
  }),
  reuseResolutionOrder:Object.freeze(['REUSE_EXISTING','DERIVE_VARIANT','RECOMBINE_EXISTING','LICENSE_VERIFIED_FREE_SOURCE_ADAPT','NEW_AUTHORING']),
  freeOriginalVolumePolicy:Object.freeze({
    priority:'AFTER_INTERNAL_REUSE_BEFORE_NEW_AUTHORING',
    purpose:'ON_DEMAND_GAP_FILL_WHILE_PRIMARY_WORK_FOCUSES_ON_QUALITY_AND_AUTOMATION_DETAIL',
    allowed:'CC0_OR_CLEAR_COMMERCIAL_USE_AND_MODIFICATION_ALLOWED',
    sourceCatalogMode:'SUFFICIENT_METADATA_CATALOG_ON_DEMAND_ACQUISITION',
    bulkPrefetchForbidden:true,
    speculativeDownloadForbidden:true,
    automaticAcquisitionMode:'SELECTED_WORKLIST_ACTION_ONLY',
    acquireOnlyWhen:Object.freeze([
      'ACTIVE_WORKLIST_ACTION_REQUIRES_SOURCE',
      'NO_SUITABLE_EXISTING_INTERNAL_ASSET',
      'NO_ACCEPTABLE_DERIVED_OR_RECOMBINED_INTERNAL_VARIANT'
    ]),
    reuseDownloadedSourceAcrossFutureCompatibleActions:true,
    commercialUseRequired:true,
    derivativeModificationRequired:true,
    provenanceRequired:true,
    sourceLineageRequired:true,
    directProtectedCommercialGameAssetCopyForbidden:true,
    nativeAdaptationRequired:true,
    runtimeVerificationRequiredBeforeProductionPromotion:true
  }),
  autonomousOperatingContract:Object.freeze({
    version:1,
    status:'ACTIVE_EXISTING_VIBE_ASSET_LOOP',
    executionLane:'ASSET_DEVELOPMENT',
    normalCycleOwner:'VIBE_EXISTING_ASSET_DEVELOPMENT_LOOP',
    ownerPresenceRequired:false,
    humanPresenceRequired:false,
    chatgptPresenceRequired:false,
    manualApprovalRequiredForNormalSafeAssetWork:false,
    existingRuntimeBindings:Object.freeze({
      scheduler:'.github/workflows/vibe2-24h-runner.yml',
      executor:'.github/workflows/vibe2-continuous-core.yml',
      planner:'tools/vibe2-asset-production-plan.mjs',
      library:'assets/vibe-studio-asset-universe.js',
      registry:'company-asset-library.json',
      qa:'qa/vibe-studio-asset-universe.test.mjs'
    }),
    cycle:Object.freeze([
      'SYNC_EXISTING_CATALOGS_AND_REGISTRY',
      'REBUILD_DEDUPED_PRIORITY_WORKLIST',
      'OVERLAY_TASK_LOCAL_REFERENCE_IMAGE_IDEAS_WHEN_PRESENT',
      'APPLY_CONCEPT_STYLE_EXPRESSION_AXES',
      'CONSUME_HIGHEST_PRIORITY_SAFE_ACTION',
      'REUSE_EXISTING',
      'DERIVE_VARIANT',
      'RECOMBINE_EXISTING',
      'LICENSE_VERIFIED_FREE_SOURCE_ADAPT_ON_DEMAND',
      'VERIFY_ROLE_IDENTITY_STYLE_QUALITY_DIVERSITY_GAP',
      'NEW_AUTHORING_WHEN_VERIFIED_GAP_REMAINS_AFTER_REASONABLE_REUSE_ADAPT_OR_RECOMBINE',
      'RUN_EXISTING_ASSET_QA_AND_IDEMPOTENCY',
      'PERSIST_REGISTRY_IF_CHANGED',
      'REPEAT_UNTIL_RECOMMENDED_VOLUME_AND_REQUIRED_ROLES_PASS',
      'ENTER_QUALITY_UP_1000_IMMEDIATELY',
      'IMPROVE_WEAKEST_INTERNAL_AUDIT_AXIS_FIRST',
      'REPEAT_QUALITY_QA_UNTIL_INTERNAL_1000'
    ]),
    resumeSource:'company-asset-library.json#internalAssetLibraryAutomation.nextVolumeActions',
    newAuthoringPolicy:'NOT_GLOBALLY_BLOCKED_REQUIRES_VERIFIED_ROLE_IDENTITY_STYLE_QUALITY_DIVERSITY_OR_PLATFORM_GAP',
    resumeAfterInterruption:true,
    continueAfterSafeActionCompletion:true,
    blockedActionPolicy:'QUARANTINE_BLOCKED_ASSET_AND_CONTINUE_NEXT_SAFE_ACTION',
    ambiguousLicensePolicy:'REJECT_SOURCE_AND_CONTINUE_NEXT_VERIFIED_CANDIDATE',
    missingFreeSourcePolicy:'CONTINUE_RESOLUTION_ORDER_TO_NEW_AUTHORING',
    runtimeEvidenceMissingPolicy:'KEEP_PRODUCTION_UNVERIFIED_AND_CONTINUE_INTERNAL_QUALITY_WORK',
    failureRetryPolicy:'REBUILD_FROM_LATEST_REGISTRY_AND_RETRY_SAFE_ASSET_SCOPE',
    volumeExitCondition:'EXISTING_SAFE_ASSET_QUALITY_WORK_AVAILABLE',
    qualityEntryAction:'QUALITY_UP_1000',
    qualitySelection:'WEAKEST_INTERNAL_AUDIT_AXIS_FIRST',
    qualityTarget:1000,
    postQualityTargetAction:'KEEP_REAUDITING_EXISTING_ASSETS_AND_REOPEN_ON_NEW_CRITERIA_BETTER_REFERENCE_OBSERVED_DEFECT_LIBRARY_CHANGE_OR_QUALITY_REGRESSION',
    continuousExistingAssetQualityEvolution:true,
    oneAndDoneAssetCompletionForbidden:true,
    reAuditExistingAssetsEveryMaintenanceCycle:true,
    quality1000IsCurrentContractCeilingNotPermanentCompletion:true,
    reopenTriggers:Object.freeze([
      'NEW_QUALITY_CRITERIA',
      'NEW_HIGHER_QUALITY_INTERNAL_REFERENCE',
      'OBSERVED_RUNTIME_OR_VISUAL_DEFECT',
      'NEW_PLATFORM_OR_LOD_REQUIREMENT',
      'NEW_STYLE_EXPRESSION_REQUIREMENT',
      'LIBRARY_TYPE_ROLE_OR_QUALITY_CHANGE',
      'QUALITY_REGRESSION'
    ]),
    terminalStateForbidden:true,
    internalQualityDoesNotPromoteProduction:true,
    rawReferencePersistenceForbidden:true,
    newWorkflowRequired:false,
    newSchedulerRequired:false,
    newQueueRequired:false,
    newPipelineRequired:false,
    newWrapperRequired:false,
    newShadowSystemRequired:false
  }),
  autonomousMaintenanceContract:Object.freeze({
    version:1,
    status:'ACTIVE_SELF_MAINTAINING_LIBRARY',
    trigger:'EVERY_EXISTING_ASSET_DEVELOPMENT_PLANNING_EXECUTION',
    ownerPresenceRequired:false,
    humanPresenceRequired:false,
    chatgptPresenceRequired:false,
    operations:Object.freeze([
      'RESCAN_CURRENT_CATALOGS_AND_REGISTRY',
      'REBUILD_INVENTORY_TYPE_ROLE_QUALITY_FINGERPRINTS',
      'DETECT_NEW_OR_REMOVED_TYPE_ROLE_METADATA',
      'REINDEX_HIGHEST_QUALITY_INTERNAL_REUSE_DONORS',
      'REBUILD_VOLUME_AND_QUALITY_PRIORITY_FROM_CURRENT_LIBRARY',
      'MARK_STALE_CATALOG_ROWS_REVIEW_ONLY',
      'BUILD_SEMANTIC_DUPLICATE_REVIEW_GROUPS',
      'PERSIST_CANONICAL_REGISTRY_ONLY_WHEN_CHANGED',
      'CONTINUE_NEXT_SAFE_ASSET_ACTION'
    ]),
    currentLibraryAlwaysWins:true,
    qualityUpdatesReorderReuseDonors:true,
    newTypeOrRoleReopensRelevantIdeation:true,
    qualityRegressionReopensQualityWork:true,
    existingAssetsReauditedContinuously:true,
    quality1000StillReauditedAgainstCurrentContract:true,
    strongerReferenceOrNewCriterionMayReopenExistingAsset:true,
    staleRowsNeverAutoDeleted:true,
    semanticDuplicatesReviewOnly:true,
    originalAssetsPreserved:true,
    maintenanceMayNotPromoteProductionVerified:true,
    maintenanceMayNotCreateNewWorkflowSchedulerQueuePipelineWrapperOrShadow:true
  }),
  reuseAdaptRecombineBeforeNewAuthoring:true,
  deleteExistingAssetAutomatically:false,
  productionPromotionAutomatically:false,
  runtimeVerificationStillRequired:true,
  productionRuntimeVerificationSeparateFromInternalQuality:true,
  actualAudioAssetClaimRequiresVerifiedAudioFile:true,
  workflowCreated:false,
  schedulerCreated:false,
  queueCreated:false,
  pipelineCreated:false,
  wrapperCreated:false,
  shadowSystemCreated:false
});

function stableAssetMaintenanceHash(value=''){
  let hash=2166136261;
  for(const ch of String(value??'')){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(16).padStart(8,'0');
}
const INTERNAL_ASSET_MAINTENANCE_ROLE_FIELDS=Object.freeze([
  'role','roles','usageRole','usageRoles','systemRole','systemRoles','itemRole','toolRole','gearRole','creatureRole',
  'environmentRole','environmentRoles','buildingRole','worldRole','interactionRole','presentationRoles','motionRole',
  'combatRole','ecologyRole','skillFamily','subfamily','type'
]);
function internalAssetMaintenanceRoleTokens(asset={}){
  const out=[];
  for(const field of INTERNAL_ASSET_MAINTENANCE_ROLE_FIELDS){
    const value=asset?.[field];
    for(const entry of (Array.isArray(value)?value:[value])){
      const token=upper(entry).replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
      if(token)out.push(token);
    }
  }
  return uniq(out).sort();
}
function internalAssetMaintenanceQuality(asset={}){
  const audit=scoreInternalAssetAudit1000({asset});
  if(audit.applicableAxes.some(axis=>{
    const value=internalAssetAuditEvidenceValue(asset.internalAuditEvidence||{},axis);
    return typeof value==='number'&&Number.isFinite(value);
  }))return Number(audit.score);
  const declared=asset?.internalAuditScore;
  return typeof declared==='number'&&Number.isFinite(declared)
    ?Math.round(clamp(declared,0,INTERNAL_ASSET_AUDIT_MAX)*10)/10:null;
}
// 자산 관리: 세부 개선은 기존 원본 책임 파일과 현재 감사 축에만 연결한다.
const INTERNAL_ASSET_DETAIL_REPAIR_STEPS=Object.freeze({
  IDENTITY_SILHOUETTE:['PRIMARY_SECONDARY_SHAPE_HIERARCHY','GAME_CAMERA_SILHOUETTE_COMPARISON'],
  FORM_STRUCTURE:['CONSTRUCTION_JOINTS_AND_LOAD_BEARING_FORMS','ANATOMY_OR_MODULAR_SEAM_ALIGNMENT'],
  MATERIAL_SURFACE:['SEPARATE_MATERIAL_ROUGHNESS_AND_SPECULAR_RESPONSE','CAUSE_BASED_EDGE_WEAR_AND_SURFACE_TRANSITIONS'],
  COLOR_LIGHTING:['LOCK_PALETTE_AND_VALUE_HIERARCHY','COMPARE_LIGHT_AND_DARK_ENVIRONMENTS'],
  STYLE_COHERENCE:['PRESERVE_STYLE_BIBLE_AND_IDENTITY_LOCKS','MATCH_SHAPE_MATERIAL_AND_MOTION_LANGUAGE'],
  DETAIL_FINISH:['SECONDARY_FORMS_BEFORE_MICRODETAIL','SEAMS_FASTENERS_EDGE_PROFILES_AND_CONTACT_DETAIL','CAUSE_BASED_WEAR_WITHOUT_RANDOM_NOISE'],
  READABILITY_SCALE:['COMPARE_GAME_CAMERA_MID_RANGE_AND_CLOSEUP','REMOVE_DETAIL_THAT_HIDES_FUNCTION'],
  MOTION_RIG:['JOINT_CONTACT_AND_WEIGHT_TRANSFER','ENTRY_CONTACT_RECOVERY_AND_INTERRUPT_CONTINUITY','SECONDARY_FOLLOW_THROUGH_WITH_LOCKED_GAMEPLAY_TIMING'],
  FEEDBACK_STATES:['AUTHOR_DISTINCT_EXISTING_INTERACTION_STATES','ALIGN_VISUAL_AUDIO_AND_MOTION_EVENTS'],
  UI_UX_SYSTEM:['CHECK_EMPTY_LOADING_ERROR_SELECTED_AND_DISABLED_STATES','PRESERVE_NAVIGATION_AND_TOUCH_TARGETS'],
  MODULAR_REUSE:['CHECK_SOCKETS_SCALE_AND_SEAM_FIT','PRESERVE_EXISTING_PUBLIC_FACTORY_CONTRACT'],
  VARIATION_BREADTH:['ADD_ROLE_STATE_AND_FORM_VARIATION','REJECT_COLOR_ONLY_DUPLICATE_VARIANTS'],
  PERFORMANCE_LOD:['MEASURE_PART_TRIANGLE_DRAW_AND_TEXTURE_COST','REDUCE_DISTANT_DETAIL_WITHOUT_CHANGING_COLLISION_OR_GAMEPLAY'],
  ACCESSIBILITY_INPUT:['CHECK_SMALL_SCREEN_CONTRAST_AND_NON_COLOR_CUES','PRESERVE_INPUT_AND_REDUCED_MOTION_BEHAVIOR'],
  PROVENANCE_MAINTAINABILITY:['CHECK_SOURCE_LICENSE_HASH_AND_DERIVATIVE_LINEAGE','KEEP_REPRODUCIBLE_AUTHORING_RECIPE'],
  INTEGRATION_READINESS:['CHECK_NATIVE_IMPORT_MATERIAL_RIG_AND_SOCKET_BINDINGS','KEEP_RUNTIME_VERIFICATION_SEPARATE_FROM_INTERNAL_AUDIT']
});
export function buildInternalAssetMaintenanceSnapshot({assets=[],uiAtomIds=[],audioRoleIds=[],previous=null,consumerGames=[]}={}){
  const gamesById=new Map(consumerGames.filter(game=>upper(game.lifecycleState||game.canonical?.lifecycle?.state||'ACTIVE')==='ACTIVE').map(game=>[text(game.id||game.gameId),game]));
  const rows=(assets||[]).map(asset=>{
    const family=upper(asset?.family||asset?.category);
    const roles=internalAssetMaintenanceRoleTokens(asset);
    const quality=internalAssetMaintenanceQuality(asset);
    const currentConsumers=currentAssetConsumerGameIds(asset);
    return Object.freeze({
      id:text(asset?.id||asset?.assetId||asset?.atomId),
      packId:text(asset?.packId),
      family,
      subfamily:upper(asset?.subfamily||asset?.type),
      roles:Object.freeze(roles),
      consumerGameIds:Object.freeze(currentConsumers),
      consumerPriority:Math.max(0,...currentConsumers.map(id=>{
        const game=gamesById.get(text(id));if(!game)return 0;
        const state=upper(game.productionClass||game.canonical?.production?.class);
        const roblox=upper(asset.platform)==='ROBLOX'||(asset.platforms||[]).some(p=>upper(p)==='ROBLOX');
        return roblox&&state==='RELEASE_CONFIRMED'?3:roblox&&state==='DEVELOPMENT_CONFIRMED'?2:1;
      })),
      quality,
      qualityGrade:text(asset?.internalAuditGrade)||null,
      auditAxes:scoreInternalAssetAudit1000({asset}).axes,
      measuredAuditAxes:scoreInternalAssetAudit1000({asset}).applicableAxes.filter(axis=>{
        const value=internalAssetAuditEvidenceValue(asset.internalAuditEvidence||{},axis);
        return typeof value==='number'&&Number.isFinite(value);
      }),
      sourceHash:text(asset?.sourceHash||asset?.sourceSha256)||null,
      sourceFiles:Object.freeze(uniq(asset?.sourceFiles||[asset?.path]).sort()),
      catalogVersion:asset?.catalogVersion??null,
      reuseEligible:asset?.catalogActive!==false
        &&!/(STALE|QUARANTIN|RETIRED|REJECTED)/.test(upper(asset?.catalogState)+' '+upper(asset?.status))
        &&asset?.rightsPass!==false,
      catalogState:upper(asset?.catalogState),
      catalogActive:asset?.catalogActive!==false,
      status:upper(asset?.status),
      productionVerified:asset?.productionVerified===true,
      runtimeVerificationState:upper(asset?.runtimeVerificationState)
    });
  }).filter(row=>row.id).sort((a,b)=>a.id.localeCompare(b.id));
  const typeRoleTokens=new Set();
  for(const row of rows){
    if(row.family)typeRoleTokens.add('FAMILY:'+row.family);
    if(row.packId)typeRoleTokens.add('PACK:'+row.packId);
    if(row.subfamily)typeRoleTokens.add('SUBFAMILY:'+row.family+':'+row.subfamily);
    for(const role of row.roles)typeRoleTokens.add('ROLE:'+row.family+':'+role);
  }
  for(const id of uiAtomIds||[])typeRoleTokens.add('UI_ATOM:'+upper(id));
  for(const id of audioRoleIds||[])typeRoleTokens.add('AUDIO_ROLE:'+upper(id));
  const sortedTypeRoleTokens=[...typeRoleTokens].sort();
  const inventoryFingerprint=stableAssetMaintenanceHash(JSON.stringify(rows));
  const typeRoleFingerprint=stableAssetMaintenanceHash(JSON.stringify(sortedTypeRoleTokens));
  const qualityRows=rows.filter(row=>row.quality!==null).map(row=>({id:row.id,quality:row.quality,grade:row.qualityGrade,family:row.family,packId:row.packId})).sort((a,b)=>a.id.localeCompare(b.id));
  const qualityFingerprint=stableAssetMaintenanceHash(JSON.stringify(rows.map(row=>({
    id:row.id,quality:row.quality,grade:row.qualityGrade,axes:row.auditAxes,
    sourceHash:row.sourceHash,sourceFiles:row.sourceFiles,catalogVersion:row.catalogVersion,reuseEligible:row.reuseEligible
  }))));
  const staleRowIds=rows.filter(row=>row.catalogActive===false||row.catalogState==='STALE_CATALOG_ROW_REVIEW').map(row=>row.id);
  const semanticGroups=new Map();
  for(const row of rows){
    const primaryRole=row.roles[0]||'';
    const key=[row.family,row.subfamily,primaryRole].join('|');
    if(!row.family||!row.subfamily||!primaryRole)continue;
    const group=semanticGroups.get(key)||[];
    group.push(row.id);semanticGroups.set(key,group);
  }
  const semanticDuplicateReviewGroups=[...semanticGroups.entries()]
    .filter(([,ids])=>ids.length>1)
    .map(([key,ids])=>Object.freeze({key,assetIds:Object.freeze([...ids].sort()),count:ids.length}))
    .sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key))
    .slice(0,48);
  const donorCandidates=qualityRows
    .filter(row=>rows.some(asset=>asset.id===row.id&&asset.reuseEligible))
    .sort((a,b)=>Number(b.quality)-Number(a.quality)||a.id.localeCompare(b.id))
    .slice(0,64)
    .map(row=>Object.freeze({...row}));
  const qualityRepairActions=[],repairKeys=new Set();
  for(const row of rows.filter(row=>row.reuseEligible).sort((a,b)=>b.consumerPriority-a.consumerPriority)){
    const axes=Object.entries(row.auditAxes).sort(([a,av],[b,bv])=>av-bv||INTERNAL_ASSET_AUDIT_WEIGHTS[b]-INTERNAL_ASSET_AUDIT_WEIGHTS[a]||a.localeCompare(b));
    const weakest=axes[0];
    const measured=row.measuredAuditAxes.includes(weakest?.[0]);
    const sourceFiles=row.sourceFiles.map(file=>file.replace(/^\//,''))
      .filter(file=>file.startsWith('assets/')&&!file.split('/').includes('..')&&!/(^|\/)quality-evidence\.json$/.test(file));
    const kind=!measured?'INSPECT_ASSET_QUALITY':weakest?.[1]<1?'IMPROVE_ASSET_DETAIL':'REAUDIT_ASSET_QUALITY';
    const repairKey=[sourceFiles.join('|')||row.id,kind,weakest?.[0]||'UNMEASURED'].join(':');
    if(repairKeys.has(repairKey))continue;
    repairKeys.add(repairKey);
    qualityRepairActions.push(Object.freeze({
      kind,assetId:row.id,packId:row.packId||null,family:row.family,consumerGameIds:row.consumerGameIds,consumerPriority:row.consumerPriority,
      sourceFiles:Object.freeze(sourceFiles),sourceHash:row.sourceHash,
      sourceInspectionRequired:sourceFiles.length===0,
      weakestAxis:measured?weakest?.[0]||null:null,
      currentAxisScore:measured?Math.round((weakest?.[1]||0)*100):null,
      targetAxisScore:100,
      detailSteps:Object.freeze(measured?[...(INTERNAL_ASSET_DETAIL_REPAIR_STEPS[weakest?.[0]]||[])]:['INSPECT_CURRENT_SOURCE_AND_SAME_CONDITION_CAPTURES','RECORD_APPLICABLE_AXIS_MEASUREMENTS_WITHOUT_INVENTING_SCORES']),
      preserveAxes:Object.freeze(axes.filter(([,value])=>value>=.9).map(([axis])=>axis)),
      familyExpectations:INTERNAL_ASSET_FAMILY_EXPECTATIONS[row.family]?.expectations||Object.freeze([]),
      comparisonViews:Object.freeze(row.family==='AUDIO'?['EVENT','LOOP_SEAM','MOBILE_MIX']:['GAME_CAMERA','MID_RANGE','CLOSEUP','CONTACT_OR_STATE']),
      completionRequires:Object.freeze(['RESPONSIBLE_SOURCE_DIFF_WHEN_REPAIR_REQUIRED','FRESH_SAME_CONDITION_COMPARISON','NO_STRONG_AXIS_REGRESSION','MOBILE_BUDGET_CHECK']),
      libraryFreshnessFingerprint:inventoryFingerprint,qualityFreshnessFingerprint:qualityFingerprint,
      productionPromotionAllowed:false,gameplayAuthority:false
    }));
  }
  qualityRepairActions.sort((a,b)=>b.consumerPriority-a.consumerPriority||(a.kind==='REAUDIT_ASSET_QUALITY')-(b.kind==='REAUDIT_ASSET_QUALITY')
    ||Number(a.currentAxisScore??-1)-Number(b.currentAxisScore??-1)||a.assetId.localeCompare(b.assetId));
  const prior=previous&&typeof previous==='object'?previous:{};
  const priorReady=Boolean(text(prior.inventoryFingerprint));
  const priorTokens=new Set(Array.isArray(prior.typeRoleTokens)?prior.typeRoleTokens:[]);
  const currentTokens=new Set(sortedTypeRoleTokens);
  const newTypeRoleTokens=priorReady?sortedTypeRoleTokens.filter(token=>!priorTokens.has(token)):[];
  const removedTypeRoleTokens=priorReady?[...priorTokens].filter(token=>!currentTokens.has(token)).sort():[];
  const refreshReasons=[];
  if(!priorReady)refreshReasons.push('MAINTENANCE_BASELINE_INITIALIZED');
  else{
    if(prior.inventoryFingerprint!==inventoryFingerprint)refreshReasons.push('INVENTORY_CHANGED');
    if(prior.typeRoleFingerprint!==typeRoleFingerprint)refreshReasons.push('TYPE_OR_ROLE_CHANGED');
    if(prior.qualityFingerprint!==qualityFingerprint)refreshReasons.push('QUALITY_METADATA_CHANGED');
  }
  if(staleRowIds.length)refreshReasons.push('STALE_ROWS_PRESENT');
  if(semanticDuplicateReviewGroups.length)refreshReasons.push('SEMANTIC_DUPLICATE_REVIEW_AVAILABLE');
  return Object.freeze({
    version:1,
    status:'SELF_MAINTENANCE_READY',
    inventoryFingerprint,
    typeRoleFingerprint,
    qualityFingerprint,
    assetCount:rows.length,
    packCount:new Set(rows.map(row=>row.packId).filter(Boolean)).size,
    familyCount:new Set(rows.map(row=>row.family).filter(Boolean)).size,
    typeRoleTokenCount:sortedTypeRoleTokens.length,
    scoredAssetCount:qualityRows.length,
    typeRoleTokens:Object.freeze(sortedTypeRoleTokens),
    newTypeRoleTokens:Object.freeze(newTypeRoleTokens.slice(0,192)),
    removedTypeRoleTokens:Object.freeze(removedTypeRoleTokens.slice(0,192)),
    staleRowIds:Object.freeze(staleRowIds.slice(0,192)),
    semanticDuplicateReviewGroups:Object.freeze(semanticDuplicateReviewGroups),
    qualityDonorCandidates:Object.freeze(donorCandidates),
    nextQualityActions:Object.freeze(qualityRepairActions.slice(0,96)),
    refreshRequired:refreshReasons.length>0,
    refreshReasons:Object.freeze(refreshReasons),
    currentLibraryAlwaysWins:true,
    automaticDeletion:false,
    duplicateReviewOnly:true,
    qualityUpdateMayReorderDonors:true,
    newTypeOrRoleMayReopenIdeation:true,
    continueWithoutHuman:true,
    continueWithoutChatgpt:true
  });
}

function looseVolumeState(count,band={}){
  const value=Math.max(0,Number(count)||0);
  if(value<Number(band.minimum||0))return'SYSTEM_DEPTH_VOLUME_REQUIRED';
  if(value<Number(band.targetMin||0))return'EXPAND_TOWARD_RECOMMENDED_RANGE';
  if(value<=Number(band.targetMax||Infinity))return'HEALTHY_VOLUME';
  if(value<Number(band.softReviewAt||Infinity))return'BROAD_LIBRARY_KEEP_IF_DISTINCT';
  return'SOFT_DEDUP_REVIEW_ONLY';
}

const COMMON_LIBRARY_PACK_ID_BY_DOMAIN=Object.freeze({
  UI:'roblox-common-ui-v1',
  ITEM:'roblox-common-items-v1',
  WEAPON:'roblox-common-tools-v1',
  CHARACTER_GEAR:'roblox-common-character-gear-v1',
  SKILL:'roblox-common-skill-v1',
  VFX:'roblox-common-vfx-v1',
  MOTION:'roblox-common-motion-v1',
  MATERIAL:'roblox-common-materials-v1',
  ENVIRONMENT:'roblox-common-environment-v1',
  BUILDING:'roblox-common-building-v1',
  WORLD_PROP:'roblox-common-world-props-v1',
  CREATURE:'roblox-common-creature-parts-v1',
  FOLIAGE:'roblox-common-foliage-v1',
  PRESENTATION:'roblox-common-presentation-v1'
});

function commonLibraryPackCount(domain,assets=[]){
  const packId=COMMON_LIBRARY_PACK_ID_BY_DOMAIN[domain];
  const pack=packId?(assets||[]).find(asset=>asset?.id===packId):null;
  if(!pack)return null;
  if(domain==='UI')return Number(pack.componentCount??pack.assetCount??pack.registryAtomCount)||0;
  if(domain==='ITEM')return Number(pack.assetCount??pack.itemCount)||0;
  if(domain==='WEAPON'||domain==='CHARACTER_GEAR'||domain==='BUILDING'||domain==='WORLD_PROP'||domain==='CREATURE'||domain==='FOLIAGE')return Number(pack.itemCount??pack.assetCount)||0;
  if(domain==='SKILL'||domain==='VFX'||domain==='MATERIAL')return Number(pack.assetCount??pack.itemCount)||0;
  if(domain==='MOTION')return Number(pack.motionCount??pack.assetCount)||0;
  if(domain==='ENVIRONMENT')return Number(pack.terrainCompositionCount??pack.sceneCompositionCount??pack.recipeCount??pack.environmentStateCount)||0;
  if(domain==='PRESENTATION'){
    const direct=Number(pack.presentationComponentCount);
    if(Number.isFinite(direct)&&direct>0)return direct;
    const loading=Array.isArray(pack.loadingElements)?pack.loadingElements.length:0;
    const intro=Array.isArray(pack.introModes)?pack.introModes.length:0;
    return loading+intro;
  }
  return null;
}

function commonLibraryIdentityCount(domain,assets=[]){
  const packCount=commonLibraryPackCount(domain,assets);
  if(packCount!=null&&packCount>0)return packCount;
  const candidates=(assets||[]).filter(asset=>commonDepthDomainMatch(domain,asset));
  return candidates.filter(asset=>{
    if(asset?.id===asset?.packId)return false;
    if(asset?.catalogActive===false)return false;
    if(asset?.atomId||asset?.assetId)return true;
    const sub=upper(asset?.subfamily);
    return sub&&!sub.endsWith('_PACK')&&!sub.endsWith('_KIT');
  }).length;
}

function uiSubsystemCount(ids=[],spec={}){
  const needles=(spec.keywords||[]).map(upper);
  return (ids||[]).filter(id=>{
    const token=upper(id);
    return needles.some(needle=>token.includes(needle));
  }).length;
}

export function buildInternalAssetLibraryAutomationPlan({assets=[],seedPlan=null,uiAtomIds=[],audioRoleIds=[],externalSources=[],previousMaintenance=null,consumerGames=[]}={}){
  const inventoryAssets=assets;
  assets=(assets||[]).filter(asset=>asset?.catalogActive!==false
    &&!/(STALE|QUARANTIN|RETIRED|REJECTED)/.test(upper(asset?.catalogState)+' '+upper(asset?.status))
    &&asset?.rightsPass!==false);
  const depth=auditCommonLibrarySystemDepth({assets});
  const seedIdeas=seedPlan?.ideas||[];
  const depthByDomain=new Map(depth.rows.map(row=>[row.domain,row]));
  const audioRoles=uniq(audioRoleIds).map(upper);
  const audioRoleTokens=new Set(audioRoles);
  const actualVerifiedAudioAssetCount=verifiedAudioFileCount(assets);
  const maintenance=buildInternalAssetMaintenanceSnapshot({assets:inventoryAssets,uiAtomIds,audioRoleIds,previous:previousMaintenance,consumerGames});
  const domains=[];
  const freeSourceCategoriesByDomain=Object.freeze({
    BUILDING:Object.freeze(['BUILDING','PROP','ENVIRONMENT']),
    CREATURE:Object.freeze(['CREATURE']),
    MOTION:Object.freeze(['MOTION']),
    UI:Object.freeze(['UI']),
    WORLD_PROP:Object.freeze(['PROP']),
    ENVIRONMENT:Object.freeze(['ENVIRONMENT','MATERIAL','PROP']),
    ITEM:Object.freeze(['PROP','WEAPON']),
    SKILL:Object.freeze(['VFX','MOTION']),
    VFX:Object.freeze(['VFX']),
    PRESENTATION:Object.freeze(['UI','VFX','AUDIO']),
    CHARACTER_GEAR:Object.freeze(['CHARACTER','PROP']),
    WEAPON:Object.freeze(['WEAPON','PROP']),
    AUDIO:Object.freeze(['AUDIO']),
    FOLIAGE:Object.freeze(['ENVIRONMENT','PROP']),
    MATERIAL:Object.freeze(['MATERIAL','ENVIRONMENT'])
  });
  const eligibleFreeSources=(externalSources||[]).filter(source=>
    /LICENSE_VERIFIED/.test(upper(source?.status))
    &&source?.volumeAdaptationEligible===true
    &&source?.commercialUseAllowed===true
    &&source?.derivativesAllowed===true
  ).map(source=>Object.freeze({
    id:text(source?.id),
    categories:Object.freeze(uniq([source?.category,...(Array.isArray(source?.categories)?source.categories:[])]).map(upper)),
    sourcePriority:Number(source?.sourcePriority||0)
  })).filter(source=>source.id).sort((a,b)=>b.sourcePriority-a.sourcePriority||a.id.localeCompare(b.id));
  const freeSourceIdsForDomain=domain=>{
    const allowed=freeSourceCategoriesByDomain[upper(domain)]||[];
    return eligibleFreeSources.filter(source=>source.categories.some(category=>allowed.includes(category))).map(source=>source.id);
  };
  // 검색: 같은 실행에서 자산 분류·품질을 한 번만 색인하고 역할별 순위를 재사용한다.
  const candidatesByDomain=new Map(Object.keys(COMMON_LIBRARY_LOOSE_VOLUME_BANDS).map(domain=>[domain,[]]));
  for(const asset of assets){
    const candidate={
      id:text(asset.id||asset.assetId||asset.atomId),packId:text(asset.packId)||null,
      family:upper(asset.family||asset.category)||null,platform:upper(asset.platform)||null,
      roles:internalAssetMaintenanceRoleTokens(asset),quality:internalAssetMaintenanceQuality(asset),
      grade:text(asset.internalAuditGrade)||null
    };
    if(!candidate.id)continue;
    for(const [domain,rows] of candidatesByDomain)if(commonDepthDomainMatch(domain,asset))rows.push(candidate);
  }
  const rankedCandidateCache=new Map();
  const internalReuseCandidatesForAction=(domain,role='')=>{
    const requested=upper(role).replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    const key=upper(domain)+'|'+requested;
    if(!rankedCandidateCache.has(key))rankedCandidateCache.set(key,(candidatesByDomain.get(upper(domain))||[])
      .map(row=>({...row,roleMatch:requested&&row.roles.includes(requested)?1:0}))
      .sort((a,b)=>b.roleMatch-a.roleMatch||Number(b.quality??-1)-Number(a.quality??-1)||a.id.localeCompare(b.id)));
    return rankedCandidateCache.get(key);
  };
  const normalizeIdentity=value=>upper(value).replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  const existingIdentityTokens=new Set();
  const identityTokensByDomain=new Map(Object.keys(COMMON_LIBRARY_LOOSE_VOLUME_BANDS).map(domain=>[domain,new Set()]));
  const addExistingIdentity=value=>{
    if(Array.isArray(value)){for(const item of value)addExistingIdentity(item);return;}
    const token=normalizeIdentity(value);
    if(token)existingIdentityTokens.add(token);
  };
  for(const asset of assets||[]){
    addExistingIdentity(asset?.id);
    addExistingIdentity(asset?.assetId);
    addExistingIdentity(asset?.atomId);
    addExistingIdentity(asset?.role);
    addExistingIdentity(asset?.roles);
    addExistingIdentity(asset?.usageRole);
    addExistingIdentity(asset?.usageRoles);
    addExistingIdentity(asset?.sourceIdeaId);
    addExistingIdentity(asset?.ideaId);
    for(const [domain,tokens] of identityTokensByDomain){
      if(!commonDepthDomainMatch(domain,asset))continue;
      for(const value of [asset.id,asset.assetId,asset.atomId,asset.sourceIdeaId,asset.ideaId,...internalAssetMaintenanceRoleTokens(asset)]){
        const token=normalizeIdentity(value);if(token)tokens.add(token);
      }
    }
  }
  for(const atomId of uiAtomIds||[])addExistingIdentity(atomId);
  for(const roleId of audioRoleIds||[])addExistingIdentity(roleId);
  for(const atomId of uiAtomIds||[])identityTokensByDomain.get('UI')?.add(normalizeIdentity(atomId));
  for(const roleId of audioRoleIds||[])identityTokensByDomain.get('AUDIO')?.add(normalizeIdentity(roleId));
  const genericIdeaRoles=new Set(['DISTINCT_ROLE_STATE_STYLE_COMBINATION','MISSING_CONTEXT_STATE_OR_FLOW_VARIANT']);
  const ideaAlreadyCovered=(ideaId,role='',domain='')=>{
    const ideaToken=normalizeIdentity(ideaId);
    const roleToken=normalizeIdentity(role);
    const domainTokens=identityTokensByDomain.get(domain)||new Set();
    if(ideaToken&&domainTokens.has(ideaToken))return true;
    return Boolean(roleToken&&!genericIdeaRoles.has(roleToken)&&domainTokens.has(roleToken));
  };

  for(const [domain,band] of Object.entries(COMMON_LIBRARY_LOOSE_VOLUME_BANDS)){
    const referenceBreadth=internalReferenceBreadthTarget(domain);
    const targetMin=Math.max(Number(band.targetMin||0),Number(referenceBreadth.targetMin||0));
    const targetMax=Math.max(Number(band.targetMax||0),Math.ceil(targetMin*1.6));
    const softReviewAt=Math.max(Number(band.softReviewAt||0),Math.ceil(targetMax*1.5));
    const currentCount=domain==='AUDIO'&&audioRoles.length?audioRoles.length:commonLibraryIdentityCount(domain,assets);
    const depthRow=depthByDomain.get(domain);
    const missing=domain==='AUDIO'&&audioRoles.length
      ?(COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS.AUDIO.required||[]).filter(role=>!audioRoleTokens.has(upper(role)))
      :[...(depthRow?.missing||[])];
    const ideaBudget=Math.min(
      INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.perDomainIdeaBudgetPerCycle,
      Math.max(4,targetMin-currentCount,missing.length)
    );
    const candidates=[],candidateKeys=new Set();
    const pushCandidate=candidate=>{
      if(candidates.length>=ideaBudget||ideaAlreadyCovered(candidate?.ideaId,candidate?.role,domain))return false;
      const key=normalizeIdentity(candidate?.ideaId);
      if(!key||candidateKeys.has(key))return false;
      candidateKeys.add(key);
      candidates.push(Object.freeze(candidate));
      return true;
    };
    for(const required of missing){
      pushCandidate({
        ideaId:[domain,required,'BASE'].join('_'),
        source:'SYSTEM_DEPTH_GAP',
        domain,
        role:required,
        priority:300
      });
    }
    for(const idea of seedIdeas.filter(row=>row.domain===domain)){
      if(candidates.length>=ideaBudget)break;
      pushCandidate({
        ideaId:idea.ideaId,
        source:'COMPANY_COMMON_SEED_DEMAND',
        domain,
        role:idea.role,
        stateVariants:idea.stateVariants,
        priority:220+Math.min(60,(idea.sourceSeedIds||[]).length*6)
      });
    }
    const domainPool=uniq([...(COMMON_LIBRARY_AUTOMATED_IDEA_POOLS[domain]||[]),...(INTERNAL_ASSET_REFERENCE_IDEA_POOLS[domain]||[])]);
    for(const ideaId of domainPool){
      if(candidates.length>=ideaBudget||currentCount+candidates.length>=targetMin)break;
      pushCandidate({
        ideaId,
        source:'DOMAIN_IDEA_POOL',
        domain,
        role:'DISTINCT_ROLE_STATE_STYLE_COMBINATION',
        priority:150
      });
    }
    let slot=1;
    while(candidates.length<ideaBudget&&currentCount+candidates.length<targetMin&&slot<=9999){
      const ideaId=[domain,'DISTINCT_VARIATION',String(slot).padStart(2,'0')].join('_');
      slot++;
      pushCandidate({
        ideaId,
        source:'LOOSE_VOLUME_TARGET',
        domain,
        role:'DISTINCT_ROLE_STATE_STYLE_COMBINATION',
        priority:120
      });
    }
    domains.push(Object.freeze({
      domain,
      currentCount,
      minimum:band.minimum,
      targetMin,
      targetMax,
      baseTargetMin:band.targetMin,
      referenceTargetMin:referenceBreadth.targetMin,
      referenceProfileIds:referenceBreadth.profileIds,
      softReviewAt,
      hardMaximum:null,
      state:looseVolumeState(currentCount,{...band,targetMin,targetMax,softReviewAt}),
      measurement:domain==='AUDIO'?'ROLE_CONTRACT_COUNT_NOT_VERIFIED_AUDIO_FILE_COUNT':'CATALOG_IDENTITY_COUNT',
      actualVerifiedAudioAssetCount:domain==='AUDIO'?actualVerifiedAudioAssetCount:null,
      roleContractCount:domain==='AUDIO'?audioRoles.length:null,
      missingDepthRoles:Object.freeze(missing),
      suggestedIdeas:Object.freeze(candidates),
      suggestedIdeaCount:candidates.length,
      overSoftLimitBlocksUse:false
    }));
  }

  const uiIds=uniq(uiAtomIds.length?uiAtomIds:(assets||[]).filter(row=>row.packId==='roblox-common-ui-v1').map(row=>row.atomId));
  const uiSubsystems=Object.entries(COMMON_UI_SUBSYSTEM_VOLUME_BANDS).map(([id,band])=>{
    const currentCount=uiSubsystemCount(uiIds,band);
    const state=currentCount<band.targetMin?'EXPAND_TOWARD_RECOMMENDED_RANGE':
      currentCount<=band.targetMax?'HEALTHY_VOLUME':
      currentCount<band.softReviewAt?'BROAD_LIBRARY_KEEP_IF_DISTINCT':'SOFT_DEDUP_REVIEW_ONLY';
    const suggestedCount=Math.min(12,Math.max(0,band.targetMin-currentCount));
    const pool=COMMON_UI_SUBSYSTEM_IDEA_POOLS[id]||[];
    const suggestedIdeas=[],candidateKeys=new Set();
    const pushUiIdea=(ideaId,source,priority)=>{
      if(suggestedIdeas.length>=suggestedCount||ideaAlreadyCovered(ideaId,'MISSING_CONTEXT_STATE_OR_FLOW_VARIANT','UI'))return false;
      const key=normalizeIdentity(ideaId);
      if(!key||candidateKeys.has(key))return false;
      candidateKeys.add(key);
      suggestedIdeas.push(Object.freeze({
        ideaId,
        source,
        subsystem:id,
        role:'MISSING_CONTEXT_STATE_OR_FLOW_VARIANT',
        priority
      }));
      return true;
    };
    for(const ideaId of pool){
      if(suggestedIdeas.length>=suggestedCount)break;
      pushUiIdea(ideaId,'UI_SUBSYSTEM_IDEA_POOL',210);
    }
    let slot=1;
    while(suggestedIdeas.length<suggestedCount&&slot<=9999){
      const ideaId=['UI',id,'DEPTH',String(slot).padStart(2,'0')].join('_');
      slot++;
      pushUiIdea(ideaId,'UI_SUBSYSTEM_DEPTH',180);
    }
    return Object.freeze({
      subsystem:id,
      currentCount,
      targetMin:band.targetMin,
      targetMax:band.targetMax,
      softReviewAt:band.softReviewAt,
      hardMaximum:null,
      state,
      suggestedIdeas:Object.freeze(suggestedIdeas),
      overSoftLimitBlocksUse:false
    });
  }).sort((a,b)=>{
    const da=Math.max(0,a.targetMin-a.currentCount),db=Math.max(0,b.targetMin-b.currentCount);
    return db-da||a.subsystem.localeCompare(b.subsystem);
  });

  const sortedDomains=domains.sort((a,b)=>{
    const da=Math.max(0,a.targetMin-a.currentCount),db=Math.max(0,b.targetMin-b.currentCount);
    return db-da||a.domain.localeCompare(b.domain);
  });
  const volumeBlockingDomains=sortedDomains
    .filter(row=>row.currentCount<row.targetMin||row.missingDepthRoles.length>0)
    .map(row=>Object.freeze({domain:row.domain,currentCount:row.currentCount,targetMin:row.targetMin,missingDepthRoles:Object.freeze([...row.missingDepthRoles])}));
  const uiBlockingSubsystems=uiSubsystems
    .filter(row=>row.currentCount<row.targetMin)
    .map(row=>Object.freeze({subsystem:row.subsystem,currentCount:row.currentCount,targetMin:row.targetMin}));
  const volumeReady=volumeBlockingDomains.length===0&&uiBlockingSubsystems.length===0;
  const nextVolumeActionRows=volumeReady?[]:[
    ...sortedDomains.flatMap(row=>(row.suggestedIdeas||[]).slice(0,4).map(idea=>({kind:'DOMAIN_VOLUME',domain:row.domain,ideaId:idea.ideaId,source:idea.source,role:idea.role||null,priority:Number(idea.priority||0),targetMin:row.targetMin,currentCount:row.currentCount,freeSourceCandidateIds:freeSourceIdsForDomain(row.domain).slice(0,INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeSourceCandidateLimitPerAction)}))),
    ...uiSubsystems.flatMap(row=>(row.suggestedIdeas||[]).slice(0,3).map(idea=>({kind:'UI_SUBSYSTEM_VOLUME',domain:'UI',subsystem:row.subsystem,ideaId:idea.ideaId,source:idea.source,role:idea.role||null,priority:Number(idea.priority||0),targetMin:row.targetMin,currentCount:row.currentCount,freeSourceCandidateIds:freeSourceIdsForDomain('UI').slice(0,INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeSourceCandidateLimitPerAction)})))
  ].sort((a,b)=>b.priority-a.priority||String(a.domain).localeCompare(String(b.domain))||String(a.ideaId).localeCompare(String(b.ideaId))).slice(0,96).sort((a,b)=>{
    const deficitA=Math.max(0,Number(a.targetMin||0)-Number(a.currentCount||0));
    const deficitB=Math.max(0,Number(b.targetMin||0)-Number(b.currentCount||0));
    const scoreA=Number(a.priority||0)+deficitA;
    const scoreB=Number(b.priority||0)+deficitB;
    return scoreB-scoreA||Number(b.priority||0)-Number(a.priority||0)||String(a.domain).localeCompare(String(b.domain))||String(a.ideaId).localeCompare(String(b.ideaId));
  });
  const freeSourceCatalogReady=eligibleFreeSources.length>=INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeSourceCatalogSufficiencyCount;
  const nextVolumeActions=nextVolumeActionRows.map((row,index)=>{
    const freeSourceAvailable=Array.isArray(row.freeSourceCandidateIds)&&row.freeSourceCandidateIds.length>0;
    const allInternalReuseCandidates=internalReuseCandidatesForAction(row.domain,row.role);
    const internalReuseCandidatePreview=allInternalReuseCandidates.slice(0,4).map(candidate=>Object.freeze({
      id:candidate.id,quality:candidate.quality,grade:candidate.grade
    }));
    return Object.freeze({
      ...row,
      freeSourceAvailable,
      internalReuseCandidateCount:allInternalReuseCandidates.length,
      internalReuseCandidatePreview:Object.freeze(internalReuseCandidatePreview),
      internalReusePreviewLimit:4,
      allCompatibleInternalAssetsRemainEligible:true,
      internalReusePreviewIsNotEligibilityCap:true,
      detailImprovementAssetId:maintenance.nextQualityActions.find(action=>allInternalReuseCandidates.some(candidate=>candidate.id===action.assetId))?.assetId||null,
      studioVariationAxes:Object.freeze([...(INTERNAL_ASSET_STUDIO_VARIATION_AXES[row.domain]||[])]),
      libraryFreshnessFingerprint:maintenance.inventoryFingerprint,
      qualityFreshnessFingerprint:maintenance.qualityFingerprint,
      freeSourceCandidateIds:Object.freeze([...(row.freeSourceCandidateIds||[])]),
      freeSourceAcquisitionMode:freeSourceAvailable?'ON_DEMAND_SELECTED_ACTION_ONLY':'NOT_AVAILABLE',
      bulkPrefetchAllowed:false,
      speculativeDownloadAllowed:false,
      acquireExternalOnlyAfterInternalReuseFailure:true,
      styleExpressionAdaptationRequired:true,
      styleExpressionAxisIds:Object.freeze([...(INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS[row.domain]||[])]),
      worklistOrder:index+1,
      resolutionOrder:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.reuseResolutionOrder
    });
  });
  const qualityFirst=maintenance.nextQualityActions.length>0||volumeReady;
  const autonomousNextAction=qualityFirst
    ?Object.freeze({
      kind:'QUALITY_UP_1000',
      phase:'QUALITY_UP_1000',
      selection:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.qualityUpSelection,
      workingBandMin:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.qualityUpWorkingBandMin,
      target:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.qualityTargetInternalAuditScore,
      action:maintenance.nextQualityActions[0]||null,
      continueWithoutHuman:true
    })
    :nextVolumeActions.length
      ?Object.freeze({
        kind:'CONSUME_PRIORITY_WORKLIST_ACTION',
        phase:'VOLUME_UP',
        action:nextVolumeActions[0],
        continueAfterCompletion:true,
        continueWithoutHuman:true
      })
      :Object.freeze({
        kind:'REBUILD_VOLUME_WORKLIST',
        phase:'VOLUME_UP',
        continueWithoutHuman:true
      });
  return Object.freeze({
    version:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.version,
    countPolicy:'LOOSE_TARGET_BANDS_NOT_HARD_CAPS',
    hardMaximum:null,
    domains:Object.freeze(sortedDomains),
    uiSubsystems:Object.freeze(uiSubsystems),
    uiCompositionGraph:COMMON_UI_SYSTEM_COMPOSITION_GRAPH,
    referenceBreadthProfiles:INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES,
    progressionComplexityProfiles:INTERNAL_PROGRESSION_COMPLEXITY_PROFILES,
    focusPhase:qualityFirst?'QUALITY_UP_1000':'VOLUME_UP',
    qualityTarget:INTERNAL_ASSET_AUDIT_MAX,
    volumeReady,
    volumeBlockingDomains:Object.freeze(volumeBlockingDomains),
    uiBlockingSubsystems:Object.freeze(uiBlockingSubsystems),
    nextVolumeActions:Object.freeze(nextVolumeActions),
    nextQualityActions:maintenance.nextQualityActions,
    autonomousOperatingContract:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.autonomousOperatingContract,
    autonomousMaintenanceContract:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.autonomousMaintenanceContract,
    maintenance,
    studioVariationAxes:INTERNAL_ASSET_STUDIO_VARIATION_AXES,
    autonomousNextAction,
    autonomousContinuationRequired:true,
    ownerPresenceRequired:false,
    humanPresenceRequired:false,
    chatgptPresenceRequired:false,
    persistentWorklistField:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.persistentWorklistField,
    volumeActionConsumption:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.volumeActionConsumption,
    reuseResolutionOrder:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.reuseResolutionOrder,
    freeOriginalVolumePolicy:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeOriginalVolumePolicy,
    eligibleFreeSourceCount:eligibleFreeSources.length,
    freeSourceCandidateLimitPerAction:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeSourceCandidateLimitPerAction,
    freeSourceCatalogSufficiencyCount:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeSourceCatalogSufficiencyCount,
    freeSourceCatalogReady,
    freeSourceCatalogExpansionMode:freeSourceCatalogReady?'PAUSED_UNTIL_REAL_COVERAGE_GAP':'TARGETED_GAP_ONLY',
    primaryAttention:freeSourceCatalogReady?'QUALITY_AND_AUTOMATION_DETAIL_WITH_ON_DEMAND_GAP_FILL':'TARGETED_SOURCE_GAP_AND_QUALITY',
    styleExpressionAxes:INTERNAL_ASSET_STYLE_EXPRESSION_AXES,
    styleExpressionDomainBindings:INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS,
    styleExpressionRequiredForAllDomains:true,
    ideaDeduplication:Object.freeze({
      fields:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.ideaDeduplicationFields,
      existingIdentityCount:existingIdentityTokens.size,
      repeatedDistinctVariationProposalForbidden:true
    }),
    qualityUpPolicy:Object.freeze({
      selection:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.qualityUpSelection,
      workingBandMin:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.qualityUpWorkingBandMin,
      target:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.qualityTargetInternalAuditScore,
      continuousExistingAssetQualityEvolution:true,
      oneAndDoneAssetCompletionForbidden:true,
      reAuditEveryMaintenanceCycle:true,
      quality1000IsCurrentContractCeilingNotPermanentCompletion:true,
      reopenTriggers:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.autonomousOperatingContract.reopenTriggers,
      productionRuntimeVerificationSeparate:true
    }),
    audioStudioBreadth:INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT,
    audioRoleContractCount:audioRoles.length,
    actualVerifiedAudioAssetCount,
    audioRoleVolumeSeparateFromVerifiedFileCount:true,
    volumeBeforeQuality:false,
    qualityUpStartsOnlyAfterRecommendedVolume:false,
    overSoftLimitAction:'DEDUPLICATION_REVIEW_ONLY',
    overSoftLimitBlocksUse:false,
    automaticDeletion:false,
    productionPromotionAutomatic:false,
    runtimeVerificationRequired:true
  });
}

export const INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT=Object.freeze({
  version:4,
  scope:'INTERNAL_ASSETS_ONLY',
  documentationMode:'MACHINE_READABLE_ONLY',
  mode:'EVENT_DRIVEN_ASSET_REVIEW_NOT_SCHEDULER',
  consumerStageAccess:'ALL_EXISTING_FLOW_STAGES',
  allInternalAssetsComposableAcrossExistingStages:true,
  stageSpecificCombinationAllowed:true,
  crossFamilyCompositionAllowed:true,
  compositionStillRequiresLicenseSecurityPlatformRoleAndStyleCompatibility:true,
  flowOwnership:false,
  flowMutationAllowed:false,
  workflowMutationAllowed:false,
  queueMutationAllowed:false,
  schedulerMutationAllowed:false,
  deploymentMutationAllowed:false,
  newPipelineCreated:false,
  triggers:Object.freeze([
    'INTERNAL_ASSET_ADDED',
    'INTERNAL_ASSET_CHANGED',
    'COMMON_PACK_VERSION_CHANGED',
    'GENRE_EXPECTATION_CHANGED',
    'COMPANY_COMMON_SEED_SET_CHANGED',
    'COMPANY_COMMON_SEED_CONTENT_CHANGED',
    'NEW_GAME_ASSET_REQUIREMENT_NOT_COVERED',
    'BEFORE_GAME_ASSET_BINDING',
    'AFTER_RUNTIME_ASSET_FAILURE',
    'BEFORE_COMPANY_REUSABLE_PROMOTION'
  ]),
  preBinding:Object.freeze([
    'SEARCH_EXISTING_GAME_ASSETS',
    'SEARCH_COMPANY_COMMON_ASSETS',
    'CROSS_PACK_SYSTEM_DEPTH_AUDIT',
    'GENRE_SYSTEM_EXPECTATION_COMPARE',
    'BUILD_COMPANY_COMMON_SEED_ASSET_IDEA_PLAN',
    'BUILD_INTERNAL_ASSET_LIBRARY_AUTOMATION_PLAN',
    'REBUILD_UI_SUBSYSTEM_DEPTH',
    'READ_PERSISTED_NEXT_VOLUME_ACTIONS',
    'OVERLAY_TASK_LOCAL_REFERENCE_IMAGE_IDEAS',
    'RESOLVE_CONCEPT_STYLE_EXPRESSION_PROFILE',
    'APPLY_STYLE_EXPRESSION_AXES_TO_ALL_ASSET_DOMAINS',
    'REMOVE_DUPLICATE_AUTHORING_CANDIDATES',
    'FILTER_EXISTING_ID_ATOM_ROLE_FROM_SUGGESTED_IDEAS',
    'CHECK_LICENSE_PLATFORM_ROLE_STYLE_COMPATIBILITY',
    'PREFER_REUSE_ADAPT_RECOMBINE_BEFORE_NEW_AUTHORING'
  ]),
  packRevision:Object.freeze([
    'PACK_LOCAL_GAP_AUDIT',
    'COMPANY_CROSS_PACK_GAP_AUDIT',
    'REMOVE_GAPS_ALREADY_COVERED_BY_OTHER_COMMON_PACKS',
    'KEEP_ONLY_REAL_COMPANY_WIDE_GAPS',
    'REPRIORITIZE_FROM_COMPANY_COMMON_SEED_DEMAND',
    'VOLUME_UP_BEFORE_QUALITY_UP',
    'CONSUME_NEXT_VOLUME_ACTIONS_IN_PRIORITY_ORDER',
    'QUALITY_UP_WEAKEST_AXIS_980_TO_1000_AFTER_VOLUME_READY',
    'KEEP_COMMON_ASSET_STYLE_ADAPTIVE_NOT_GAME_STYLE_PINNED',
    'UPDATE_PRIORITY_GAPS',
    'UPDATE_CATALOG_AND_LIBRARY',
    'UPDATE_ASSET_QA'
  ]),
  completionEvidence:Object.freeze([
    'CATALOG_UPDATED',
    'COMPANY_LIBRARY_UPDATED',
    'MACHINE_METADATA_UPDATED',
    'ASSET_QA_PASS',
    'REGRESSION_PASS',
    'LATEST_MAIN_FRESHNESS_VERIFIED',
    'MAIN_MERGED'
  ]),
  internalScoreIsUsageGate:false,
  existingAssetsRemainUsable:true,
  productionPromotionRequiresRuntimeEvidence:true
});

export const INTERNAL_ASSET_REUSE_POLICY=Object.freeze({
  version:3,
  lowScoreUseAllowed:true,
  scoreIsNotUsageGate:true,
  studioRequiredForUse:false,
  studioRequiredForAudit:false,
  studioRequiredForReplacement:false,
  preferReuseBeforeNewAuthoring:true,
  preferCompanyCommonBaseWhenQualityComparable:true,
  preservePriorAssetHistory:true,
  composition:Object.freeze({
    consumerStageAccess:'ALL_EXISTING_FLOW_STAGES',
    allInternalAssetsComposableAcrossExistingStages:true,
    stageSpecificCombinationAllowed:true,
    crossFamilyCompositionAllowed:true,
    compositionDoesNotGrantGameplaySaveNetworkOrFlowAuthority:true,
    hardBlockersStillApply:true,
    compatibilityStillRequired:true,
    newFlowOrPipelineCreated:false
  }),
  machineReadableDiscovery:Object.freeze({
    enabled:true,
    developmentStageAutoDiscovery:true,
    inspectCompanyLibraryBeforeNewAuthoring:true,
    inspectExistingGameAssetsBeforeNewAuthoring:true,
    preferExistingAndCompanyCommonAssets:true,
    metadataSources:Object.freeze([
      'company-asset-library.json',
      'assets/vibe-studio-asset-universe.js',
      'assets/roblox/*/catalog.json'
    ]),
    requiredMetadata:Object.freeze([
      'id','family','subfamily','platform','status','license','sourceFiles',
      'companyCommonBase','styleAdaptationRequiredPerGame','gameplayAuthority'
    ]),
    selectionOutput:Object.freeze([
      'assetId','applicationMode','replacementAction','effectiveInternalQuality',
      'sourceFiles','packId','machineTags','usageContract','gameSpecificVariationFields',
      'consumerStageAccess','composableAcrossExistingFlowStages'
    ]),
    newPipelineCreated:false
  }),
  adaptationModes:Object.freeze([
    'USE_AS_IS',
    'LIGHT_THEME_ADAPT',
    'STYLE_ADAPT',
    'RECOMBINE_PARTS',
    'NATIVE_REAUTHOR_BASE',
    'KEEP_CURRENT_AND_ITERATE'
  ]),
  hardBlockers:Object.freeze([
    'EXPLICIT_INTERNAL_USE_FORBIDDEN',
    'SECURITY_BLOCKED',
    'CORRUPT_SOURCE',
    'LICENSE_FORBIDDEN'
  ]),
  replacement:Object.freeze({
    minimumEffectiveGain:10,
    higherCompatibleEffectiveQualityPreferred:true,
    currentAssetMayRemainUntilAdaptationReady:true,
    noEmptySlotDuringReplacement:true,
    manualOrGameLockWins:true,
    studioNotRequired:true
  })
});

function internalLicenseForbidden(value=''){
  const license=upper(value);
  if(!license)return false;
  return /(?:^|[^A-Z0-9])NC(?:[^A-Z0-9]|$)/.test(license)
    ||license.includes('NONCOMMERCIAL')
    ||license.includes('NO-COMMERCIAL')
    ||license.includes('COPYRIGHT_UNKNOWN')
    ||license.includes('출처 불명');
}

export function evaluateInternalAssetReuse({asset={},gameDna={},requirement={},usage={}}={}){
  const row=normalizeRegistryAsset(asset);
  const family=upper(requirement.family||row.family);
  const requestedSubfamily=upper(requirement.subfamily);
  const concept=gameDna?.concept||createConceptProfile({styleFamily:row.styleFamily||'STYLIZED_FANTASY'});
  const conceptQa=evaluateConceptCompatibility({asset,concept});
  const targetPlatform=upper(gameDna?.targetPlatform||gameDna?.platform);
  const platformCompatible=!targetPlatform||!row.platform||row.platform===targetPlatform||row.platform==='SHARED_REFERENCE';
  const familyCompatible=!family||row.family===family;
  const roleCompatible=!requestedSubfamily||row.subfamily===requestedSubfamily||row.tags.includes(requestedSubfamily);
  const hardBlockers=[];
  if(asset?.internalUseForbidden===true)hardBlockers.push('EXPLICIT_INTERNAL_USE_FORBIDDEN');
  if(usage?.securityBlocked===true||asset?.securityBlocked===true)hardBlockers.push('SECURITY_BLOCKED');
  if(usage?.corruptSource===true||asset?.corruptSource===true)hardBlockers.push('CORRUPT_SOURCE');
  if(internalLicenseForbidden(asset?.license||asset?.policy))hardBlockers.push('LICENSE_FORBIDDEN');
  if(usage?.lockedOut===true)hardBlockers.push('EXPLICIT_INTERNAL_USE_FORBIDDEN');

  const audit=scoreInternalAssetAudit1000({asset,evidence:usage.internalAuditEvidence||usage.internalAudit||{}});
  const declared=Number(
    usage.internalAuditScore!==undefined?usage.internalAuditScore:
    asset?.internalAuditScore!==undefined?asset.internalAuditScore:
    Number.NaN
  );
  const baseQuality=Number.isFinite(declared)
    ?clamp(declared,0,INTERNAL_ASSET_AUDIT_MAX)
    :audit.measuredAxisCount>0?audit.score:0;

  const axes=INTERNAL_ASSET_ADAPTATION_AXES[row.family]||Object.freeze([]);
  const declaredAxes=uniq(asset?.adaptationAxes||asset?.adaptationCapabilities||[]);
  const adaptationAxes=declaredAxes.length?declaredAxes:axes;
  const provenanceAvailable=Boolean(asset?.sourceHash||asset?.contentHash||asset?.sha256||asset?.sourceFiles?.length||asset?.path);
  const canStyleAdapt=familyCompatible&&adaptationAxes.length>0;
  const canRecombine=familyCompatible&&adaptationAxes.length>=3;
  const canNativeReauthor=!platformCompatible&&provenanceAvailable&&familyCompatible;

  let mode='USE_AS_IS';
  let adaptationPenalty=0;
  const adaptationReasons=[];
  if(!familyCompatible){
    mode='KEEP_CURRENT_AND_ITERATE';
    adaptationPenalty+=220;
    adaptationReasons.push('FAMILY_MISMATCH');
  }else if(!roleCompatible){
    mode=canRecombine?'RECOMBINE_PARTS':'KEEP_CURRENT_AND_ITERATE';
    adaptationPenalty+=canRecombine?80:180;
    adaptationReasons.push('ROLE_RECOMBINE_REQUIRED');
  }else if(!platformCompatible){
    mode=canNativeReauthor?'NATIVE_REAUTHOR_BASE':'KEEP_CURRENT_AND_ITERATE';
    adaptationPenalty+=canNativeReauthor?70:200;
    adaptationReasons.push('PLATFORM_REAUTHOR_REQUIRED');
  }else if(!conceptQa.pass){
    mode=canStyleAdapt?'STYLE_ADAPT':'KEEP_CURRENT_AND_ITERATE';
    adaptationPenalty+=canStyleAdapt?45:160;
    adaptationReasons.push('STYLE_ADAPT_REQUIRED');
  }else if(asset?.themeAdaptationRequiredPerGame===true||asset?.styleAdaptationRequiredPerGame===true){
    mode='LIGHT_THEME_ADAPT';
    adaptationPenalty+=15;
    adaptationReasons.push('GAME_THEME_ADAPT_REQUIRED');
  }

  const reuseBonus=(asset?.companyCommonBase===true||upper(asset?.reuseScope)==='COMPANY_ROBLOX_COMMON_BASE')?18:0;
  const versatilityBonus=Math.min(40,adaptationAxes.length*4);
  const usageConfidenceBonus=(usage.runtimePass===true?20:0)
    +Math.min(20,Math.max(0,Number(usage.gameConsumerCount)||0)*4)
    +Math.min(10,Math.max(0,Number(usage.usageCount)||0));
  const observedFailurePenalty=(usage.runtimeFailure===true?160:0)
    +Math.min(120,Math.max(0,Number(usage.verifiedFailureCount)||0)*30)
    +(usage.identityFailure===true?90:0)
    +(usage.styleFailure===true?90:0)
    +(usage.navigationFailure===true?90:0)
    +(usage.mobileBudgetFailure===true?70:0);
  const effectiveQuality=Math.round(clamp(
    baseQuality-adaptationPenalty-observedFailurePenalty+reuseBonus+versatilityBonus+usageConfidenceBonus,
    0,INTERNAL_ASSET_AUDIT_MAX
  )*10)/10;
  const usable=hardBlockers.length===0&&familyCompatible&&(roleCompatible||canRecombine);
  const directBindingReady=usable&&platformCompatible&&conceptQa.pass&&roleCompatible;
  const adaptationReady=usable&&!directBindingReady&&mode!=='KEEP_CURRENT_AND_ITERATE';

  return Object.freeze({
    assetId:row.id,
    family:row.family,
    requestedFamily:family||null,
    requestedSubfamily:requestedSubfamily||null,
    baseQuality,
    effectiveQuality,
    internalAudit:audit,
    mode,
    usable,
    directBindingReady,
    adaptationReady,
    studioRequired:false,
    nativeRuntimeRequiredForInternalUse:false,
    conceptCompatible:conceptQa.pass,
    platformCompatible,
    familyCompatible,
    roleCompatible,
    adaptationAxes:freezeList(adaptationAxes),
    adaptationPenalty,
    observedFailurePenalty,
    usageConfidenceBonus,
    adaptationReasons:freezeList(adaptationReasons),
    hardBlockers:freezeList(hardBlockers),
    lowScoreUseAllowed:true,
    scoreIsNotUsageGate:true,
    provenanceAvailable
  });
}

export function chooseInternalAssetReplacement({currentAsset=null,candidates=[],gameDna={},requirement={},usageByAsset={}}={}){
  const lockedAssetId=text(requirement.lockedAssetId||requirement.manualAssetId||requirement.gameLockedAssetId);
  const rows=(candidates||[]).map(asset=>({
    asset,
    reuse:evaluateInternalAssetReuse({asset,gameDna,requirement,usage:usageByAsset[text(asset?.id)]||{}})
  })).filter(row=>row.reuse.usable&&!row.reuse.hardBlockers.length)
    .sort((a,b)=>b.reuse.effectiveQuality-a.reuse.effectiveQuality||b.reuse.baseQuality-a.reuse.baseQuality||assetSourceTier(normalizeRegistryAsset(b.asset))-assetSourceTier(normalizeRegistryAsset(a.asset))||text(a.asset?.id).localeCompare(text(b.asset?.id)));
  const locked=lockedAssetId?rows.find(row=>text(row.asset?.id)===lockedAssetId)||null:null;
  const best=locked||rows[0]||null;
  const current=currentAsset?evaluateInternalAssetReuse({
    asset:currentAsset,gameDna,requirement,usage:usageByAsset[text(currentAsset?.id)]||{}
  }):null;
  const gain=best&&current?Math.round((best.reuse.effectiveQuality-current.effectiveQuality)*10)/10:null;
  const replacementRecommended=Boolean(
    best&&current&&text(best.asset?.id)!==text(currentAsset?.id)&&
    gain>=INTERNAL_ASSET_REUSE_POLICY.replacement.minimumEffectiveGain
  );
  return Object.freeze({
    selectedAssetId:text(best?.asset?.id)||null,
    selectedMode:best?.reuse?.mode||null,
    selectedBaseQuality:best?.reuse?.baseQuality??null,
    selectedEffectiveQuality:best?.reuse?.effectiveQuality??null,
    currentAssetId:text(currentAsset?.id)||null,
    currentEffectiveQuality:current?.effectiveQuality??null,
    effectiveGain:gain,
    replacementRecommended,
    replacementAction:locked?'KEEP_LOCKED':
      !best?'NO_USABLE_INTERNAL_ASSET':
      !current?'USE_SELECTED':
      replacementRecommended?(best.reuse.directBindingReady?'REPLACE_NOW':'ADAPT_THEN_REPLACE'):
      'KEEP_CURRENT_AND_ITERATE',
    studioRequired:false,
    lowScoreCurrentAssetMayRemain:true,
    previousAssetHistoryPreserved:true,
    candidates:Object.freeze(rows.map(row=>Object.freeze({
      assetId:text(row.asset?.id),
      baseQuality:row.reuse.baseQuality,
      effectiveQuality:row.reuse.effectiveQuality,
      mode:row.reuse.mode,
      directBindingReady:row.reuse.directBindingReady,
      adaptationReady:row.reuse.adaptationReady
    })))
  });
}

export const STUDIO_ASSET_CRITICS=Object.freeze({
  ART_DIRECTOR:Object.freeze(['WORLD_STYLE_COHERENCE','COLOR_LIGHTING','ORIGINALITY_IDENTITY']),
  MODEL_CRITIC:Object.freeze(['SILHOUETTE_FORM','MODELING_STRUCTURE','DETAIL_DENSITY']),
  MATERIAL_CRITIC:Object.freeze(['MATERIAL_TEXTURE','COLOR_LIGHTING']),
  RIG_MOTION_CRITIC:Object.freeze(['MOTION_LIVINGNESS']),
  GAME_CAMERA_CRITIC:Object.freeze(['GAME_CAMERA_READABILITY','ACTUAL_GAME_BINDING']),
  UI_CRITIC:Object.freeze(['UI_UX_COHERENCE']),
  VFX_AUDIO_CRITIC:Object.freeze(['VFX_AUDIO_COHESION']),
  MOBILE_CRITIC:Object.freeze(['MOBILE_PERFORMANCE']),
  PRODUCTION_CRITIC:Object.freeze(['PRODUCTION_VERIFICATION'])
});
export const STUDIO_ASSET_QUALITY_AXIS_APPLICABILITY=Object.freeze({
  CHARACTER:Object.freeze(['SILHOUETTE_FORM','MODELING_STRUCTURE','MATERIAL_TEXTURE','COLOR_LIGHTING','WORLD_STYLE_COHERENCE','DETAIL_DENSITY','MOTION_LIVINGNESS','GAME_CAMERA_READABILITY','VFX_AUDIO_COHESION','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  CREATURE:Object.freeze(['SILHOUETTE_FORM','MODELING_STRUCTURE','MATERIAL_TEXTURE','COLOR_LIGHTING','WORLD_STYLE_COHERENCE','DETAIL_DENSITY','MOTION_LIVINGNESS','GAME_CAMERA_READABILITY','VFX_AUDIO_COHESION','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  BUILDING:Object.freeze(['SILHOUETTE_FORM','MODELING_STRUCTURE','MATERIAL_TEXTURE','COLOR_LIGHTING','WORLD_STYLE_COHERENCE','DETAIL_DENSITY','GAME_CAMERA_READABILITY','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  ENVIRONMENT:Object.freeze(['SILHOUETTE_FORM','MODELING_STRUCTURE','MATERIAL_TEXTURE','COLOR_LIGHTING','WORLD_STYLE_COHERENCE','DETAIL_DENSITY','MOTION_LIVINGNESS','GAME_CAMERA_READABILITY','VFX_AUDIO_COHESION','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  WEAPON:Object.freeze(['SILHOUETTE_FORM','MODELING_STRUCTURE','MATERIAL_TEXTURE','COLOR_LIGHTING','WORLD_STYLE_COHERENCE','DETAIL_DENSITY','MOTION_LIVINGNESS','GAME_CAMERA_READABILITY','VFX_AUDIO_COHESION','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  SKILL:Object.freeze(['SILHOUETTE_FORM','MATERIAL_TEXTURE','COLOR_LIGHTING','WORLD_STYLE_COHERENCE','DETAIL_DENSITY','MOTION_LIVINGNESS','GAME_CAMERA_READABILITY','UI_UX_COHERENCE','VFX_AUDIO_COHESION','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  MATERIAL:Object.freeze(['MATERIAL_TEXTURE','COLOR_LIGHTING','WORLD_STYLE_COHERENCE','DETAIL_DENSITY','GAME_CAMERA_READABILITY','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  AUDIO:Object.freeze(['WORLD_STYLE_COHERENCE','VFX_AUDIO_COHESION','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  VFX:Object.freeze(['SILHOUETTE_FORM','MATERIAL_TEXTURE','COLOR_LIGHTING','WORLD_STYLE_COHERENCE','DETAIL_DENSITY','MOTION_LIVINGNESS','GAME_CAMERA_READABILITY','VFX_AUDIO_COHESION','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  UI:Object.freeze(['SILHOUETTE_FORM','MODELING_STRUCTURE','MATERIAL_TEXTURE','COLOR_LIGHTING','WORLD_STYLE_COHERENCE','DETAIL_DENSITY','MOTION_LIVINGNESS','GAME_CAMERA_READABILITY','UI_UX_COHERENCE','VFX_AUDIO_COHESION','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  MOTION:Object.freeze(['WORLD_STYLE_COHERENCE','MOTION_LIVINGNESS','GAME_CAMERA_READABILITY','VFX_AUDIO_COHESION','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION']),
  PROP:Object.freeze(['SILHOUETTE_FORM','MODELING_STRUCTURE','MATERIAL_TEXTURE','COLOR_LIGHTING','WORLD_STYLE_COHERENCE','DETAIL_DENSITY','GAME_CAMERA_READABILITY','ORIGINALITY_IDENTITY','MOBILE_PERFORMANCE','ACTUAL_GAME_BINDING','PRODUCTION_VERIFICATION'])
});
export const STUDIO_ASSET_FAMILY_OUTPUTS=Object.freeze({
  CHARACTER:Object.freeze(['MASTER_GLB_SOURCE','WORLD_MODEL','RIG','MATERIAL_SET','MOTION_SET','PORTRAIT_OR_ICON','LOD0','LOD1','LOD2']),
  CREATURE:Object.freeze(['MASTER_GLB_SOURCE','WORLD_MODEL','BODY_PLAN_RIG','MATERIAL_SET','SPECIES_MOTION_SET','ICON','LOD0','LOD1','LOD2']),
  BUILDING:Object.freeze(['WORLD_MODEL','MODULAR_PARTS','INTERIOR_WHEN_APPLICABLE','MATERIAL_SET','COLLISION_NAV_PROXY','LOD0','LOD1','LOD2']),
  ENVIRONMENT:Object.freeze(['TERRAIN_OR_KIT','LANDMARK','SET_DRESSING','MATERIAL_SET','PLACEMENT_RULES','LOD_OR_STREAMING_VARIANTS']),
  WEAPON:Object.freeze(['EQUIPPED_MODEL','WORLD_DROP_MODEL','INVENTORY_ICON','CRAFTING_ICON_WHEN_CRAFTABLE','MATERIAL_SET','GRIP_SOCKET_MAP','LOD0','LOD1','LOD2']),
  SKILL:Object.freeze(['CAST_PRESENTATION','PROJECTILE_OR_AREA_VISUAL','IMPACT_PRESENTATION','ICON','AUDIO_ROLE','REACTION_PRESENTATION']),
  MATERIAL:Object.freeze(['BASE_MATERIAL','PLATFORM_VARIANT','WEATHERING_VARIANT','DAMAGE_VARIANT_WHEN_APPLICABLE']),
  AUDIO:Object.freeze(['SOURCE_ASSET','EVENT_BINDING','VARIATION_SET','MOBILE_BUDGET_VARIANT']),
  VFX:Object.freeze(['SOURCE_EFFECT','GAMEPLAY_EVENT_BINDING','MOBILE_BUDGET_VARIANT','LOD_OR_DENSITY_VARIANT']),
  UI:Object.freeze(['HUD_COMPONENT','MENU_COMPONENT','INVENTORY_COMPONENT','CHARACTER_SHEET','EQUIPMENT_COMPONENT','MINIMAP_COMPONENT','DIALOGUE_COMPONENT','AI_DIALOGUE_HELPER','NPC_INTERACTION_COMPONENT','QUEST_COMPONENT','PARTY_COMPONENT','CRAFTING_COMPONENT','SHOP_COMPONENT','NOTIFICATION_COMPONENT','STATUS_EFFECT_COMPONENT','HOTBAR_COMPONENT','INTERACTION_PROMPT','ICON_SET','STATE_VARIANTS','TOUCH_FEEDBACK']),
  MOTION:Object.freeze(['SOURCE_MOTION','PLATFORM_RETARGET','CONTACT_MAP','BLEND_VARIANTS','MOTION_LOD']),
  PROP:Object.freeze(['WORLD_MODEL','INTERACTION_VARIANT','INVENTORY_ICON_WHEN_ITEM','CRAFTING_ICON_WHEN_CRAFTABLE','DROP_MODEL_WHEN_COLLECTIBLE','COLLISION_PROXY','LOD0','LOD1','LOD2'])
});

export const CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT=Object.freeze({
  version:1,
  status:'ACTIVE_EXECUTABLE_CONTRACT',
  format:'GLB_2_0',
  appliesToFamilies:Object.freeze(['CHARACTER','CREATURE']),
  appliesToRoles:Object.freeze(['PLAYER','NPC','ENEMY','CREATURE','BOSS']),
  purpose:'ONE_AUTHORED_SKINNED_3D_MASTER_SOURCE_BEFORE_ROBLOX_UNITY_WEB_PLATFORM_BINDING',
  requiredBeforePlatformNativeVariant:true,
  requiredContents:Object.freeze(['MESH','NORMALS','UV0','MATERIALS','SKELETON','SKIN_WEIGHTS','ANIMATION']),
  structuralChecks:Object.freeze({
    glbVersion2:true,
    meshRequired:true,
    normalsRequired:true,
    uv0Required:true,
    materialRequired:true,
    skinAndSkeletonRequired:true,
    jointWeightsRequired:true,
    animationRequired:true
  }),
  platformUse:Object.freeze({
    ROBLOX:'IMPORT_OR_REAUTHOR_FROM_MASTER_GLB_THEN_BIND_MESHPART_BONES_ANIMATOR',
    UNITY:'IMPORT_OR_REAUTHOR_FROM_MASTER_GLB_THEN_BIND_SKINNED_MESH_RENDERER_ANIMATOR_MATERIAL',
    WEB:'LOAD_MASTER_GLB_OR_DERIVED_GLTF_WITH_WEB_RUNTIME_BINDING'
  }),
  directCrossPlatformFinalBinaryReuseForbidden:true,
  platformNativeBindingAndRuntimeVerificationRequired:true,
  primitivePartAssemblyPrototypeOnly:true,
  primitiveOrColorOnlyMayNotClaimFinal3dActor:true,
  previewImageSemanticAtomOrMarkerMayNotSubstituteForGlb:true,
  gameplayBalanceSaveProgressionEconomyNetworkAuthorityImmutable:true
});

export const CREATURE_BODY_PLANS=Object.freeze([
  'SMALL_HUMANOID_BIPED','STANDARD_HUMANOID_MONSTER','HEAVY_BIPED','DIGITIGRADE_BIPED','HUNCHED_BIPED',
  'APE_LIKE_BIPED','SKELETAL_BIPED','BOSS_BIPED','QUADRUPED_CANINE','QUADRUPED_FELINE','QUADRUPED_HEAVY',
  'QUADRUPED_HOOFED','QUADRUPED_REPTILE','ARACHNID','INSECT_6LEG','INSECT_FLYING','SCORPION','CENTIPEDE',
  'SERPENT','LIZARD','CROCODILIAN','FLYING_BIRD','FLYING_BAT','FLYING_WYVERN','FLYING_DEMON',
  'FISH','SHARK','EEL','JELLYFISH','CEPHALOPOD','CRABLIKE','SLIME_OR_AMORPHOUS','TENTACLE',
  'PLANT_MONSTER','MUSHROOM_MONSTER','MIMIC','GOLEM_HEAVY','ROBOT_MECH','GIANT_BIPED','COLOSSUS'
]);

export const CREATURE_SPECIES=Object.freeze([
  'GOBLIN','KOBOLD','ORC','TROLL','OGRE','MINOTAUR','SKELETON','ZOMBIE','GHOUL','WEREWOLF','DEMON',
  'LIZARDMAN','BEASTMAN','MONSTER_KNIGHT','MONSTER_MAGE','WOLF','FOX','COYOTE','LION','TIGER','BEAR','BOAR','DEER',
  'ELK','MOOSE','BISON','RABBIT','RACCOON','SQUIRREL','BEAVER','BADGER','MOUNTAIN_GOAT','TURKEY','CROW',
  'HORSE_BEAST','HELLHOUND','QUADRUPED_DRAGON','ANT','SOLDIER_ANT','BEETLE','SPIDER','SCORPION','MANTIS',
  'WASP','BEE','CENTIPEDE','GIANT_CRAB','SNAKE','COBRA','GIANT_SERPENT','CROCODILE','BASILISK','BIRD',
  'BAT','FLYING_INSECT','WYVERN','DRAGON','HARPY','FLYING_DEMON','FISH','SHARK','EEL','JELLYFISH',
  'OCTOPUS','SQUID','SEA_SERPENT','SLIME','BLOB','TENTACLE_BEAST','MIMIC','MUSHROOM_MONSTER',
  'PLANT_MONSTER','ROOT_MONSTER','STONE_GOLEM','IRON_GOLEM','CRYSTAL_GOLEM','ROBOT','MECH','GIANT','COLOSSUS'
]);

export const SURVIVAL_WILDLIFE_SPECIES=Object.freeze([
  'BEAR','BOAR','DEER','ELK','MOOSE','BISON','WOLF','COYOTE','FOX','RABBIT','RACCOON','SQUIRREL',
  'BEAVER','BADGER','MOUNTAIN_GOAT','TURKEY','CROW'
]);

export const SURVIVAL_WILDLIFE_ARCHETYPES=Object.freeze({
  BEAR:Object.freeze({bodyPlan:'QUADRUPED_HEAVY',size:'LARGE',locomotion:'HEAVY_QUADRUPED',temperament:'DEFENSIVE_PREDATOR',skinVariants:['DARK_BROWN','BLACK','CINNAMON']}),
  BOAR:Object.freeze({bodyPlan:'QUADRUPED_HEAVY',size:'MEDIUM',locomotion:'LOW_HEAVY_QUADRUPED',temperament:'TERRITORIAL',skinVariants:['DARK_BROWN','MUDDY_BROWN','GREY_BROWN']}),
  DEER:Object.freeze({bodyPlan:'QUADRUPED_HOOFED',size:'MEDIUM',locomotion:'HOOFED_LIGHT',temperament:'SKITTISH_PREY',skinVariants:['TAN','BROWN','DARK_WINTER']}),
  ELK:Object.freeze({bodyPlan:'QUADRUPED_HOOFED',size:'LARGE',locomotion:'HOOFED_HEAVY',temperament:'ALERT_PREY',skinVariants:['BROWN','DARK_NECK','WINTER']}),
  MOOSE:Object.freeze({bodyPlan:'QUADRUPED_HOOFED',size:'XLARGE',locomotion:'HOOFED_HEAVY',temperament:'DEFENSIVE',skinVariants:['DARK_BROWN','GREY_BROWN']}),
  BISON:Object.freeze({bodyPlan:'QUADRUPED_HEAVY',size:'XLARGE',locomotion:'HEAVY_HERD',temperament:'DEFENSIVE_HERD',skinVariants:['DARK_BROWN','BLACK_BROWN']}),
  WOLF:Object.freeze({bodyPlan:'QUADRUPED_CANINE',size:'MEDIUM',locomotion:'CANINE',temperament:'PACK_PREDATOR',skinVariants:['GREY','DARK_GREY','BROWN_GREY']}),
  COYOTE:Object.freeze({bodyPlan:'QUADRUPED_CANINE',size:'MEDIUM_SMALL',locomotion:'CANINE_LIGHT',temperament:'OPPORTUNISTIC',skinVariants:['SAND','GREY_BROWN']}),
  FOX:Object.freeze({bodyPlan:'QUADRUPED_CANINE',size:'SMALL',locomotion:'CANINE_LIGHT',temperament:'SKITTISH',skinVariants:['RED','DARK_RED','SILVER']}),
  RABBIT:Object.freeze({bodyPlan:'QUADRUPED_SMALL',size:'SMALL',locomotion:'HOPPER',temperament:'FLEE',skinVariants:['BROWN','GREY','WHITE']}),
  RACCOON:Object.freeze({bodyPlan:'QUADRUPED_SMALL',size:'SMALL',locomotion:'SMALL_MAMMAL',temperament:'CURIOUS',skinVariants:['GREY_MASK','BROWN_MASK']}),
  SQUIRREL:Object.freeze({bodyPlan:'QUADRUPED_SMALL',size:'TINY',locomotion:'SMALL_MAMMAL_FAST',temperament:'FLEE',skinVariants:['RED_BROWN','GREY']}),
  BEAVER:Object.freeze({bodyPlan:'QUADRUPED_SMALL',size:'SMALL',locomotion:'SMALL_MAMMAL_HEAVY',temperament:'NEUTRAL',skinVariants:['BROWN','DARK_BROWN']}),
  BADGER:Object.freeze({bodyPlan:'QUADRUPED_SMALL',size:'SMALL',locomotion:'SMALL_MAMMAL_HEAVY',temperament:'DEFENSIVE',skinVariants:['BLACK_WHITE','BROWN_WHITE']}),
  MOUNTAIN_GOAT:Object.freeze({bodyPlan:'QUADRUPED_HOOFED',size:'MEDIUM',locomotion:'HOOFED_CLIMBER',temperament:'NEUTRAL',skinVariants:['WHITE','CREAM','GREY']}),
  TURKEY:Object.freeze({bodyPlan:'FLYING_BIRD',size:'SMALL',locomotion:'GROUND_BIRD',temperament:'FLEE',skinVariants:['DARK_BRONZE','BROWN']}),
  CROW:Object.freeze({bodyPlan:'FLYING_BIRD',size:'TINY',locomotion:'BIRD',temperament:'FLEE',skinVariants:['BLACK','BLUE_BLACK']})
});

export const SURVIVAL_LOW_POLY_VISUAL_PROFILE=Object.freeze({
  target:'POLISHED_STYLIZED_LOW_POLY_FOREST_SURVIVAL',
  productionVerified:false,
  styleFamily:'LOW_POLY',
  qualityBar:'MOBILE_READABLE_COMMERCIAL_ROBLOX_SURVIVAL',
  silhouette:Object.freeze({
    readableAtDistance:true,
    speciesSpecificHeadNeckBackLegProportion:true,
    colorOnlySpeciesIdentityForbidden:true,
    chunkyPrimaryMassesWithSecondaryAnatomy:true
  }),
  mesh:Object.freeze({
    articulatedMeshPreferred:true,
    primitiveOnlyFinalAnimalForbidden:true,
    facetedNormals:true,
    largeReadablePlanes:true,
    controlledPolygonDensity:true,
    separateJawEarTailAndLegMotionWhenApplicable:true
  }),
  material:Object.freeze({
    matteRoughness:true,
    restrainedSpecular:true,
    subtleValueVariationAcrossBodyPlanes:true,
    furAndHideSuggestedByShapeAndValueNotDenseHairCards:true,
    muddyGroundContactVariationAllowed:true
  }),
  palette:Object.freeze({
    forestGreens:'DEEP_TO_MID_NATURAL_GREENS',
    bark:'DARK_WARM_BROWN',
    ground:'MOSS_GRASS_EARTH',
    wildlife:'NATURAL_BROWN_GREY_TAN_BLACK',
    saturation:'MODERATE',
    contrast:'CLEAR_SILHOUETTE_OVER_BACKGROUND'
  }),
  environment:Object.freeze({
    coniferAndBroadleafMix:true,
    layeredTreeCanopy:true,
    lowPolyRocksLogsStumps:true,
    lightDistanceFog:true,
    softOvercastOrMorningLight:true,
    terrainHeightBreaks:true,
    sparseGroundPlants:true
  }),
  player:Object.freeze({
    robloxAvatarCompatible:true,
    groundedFootPlacement:true,
    toolGripAlignmentRequired:true,
    bodyLeanMatchesAcceleration:true,
    idleBreathingAndWeightShift:true
  }),
  referencePolicy:'MATCH_REFERENCE_QUALITY_AND_SURVIVAL_READABILITY_WITH_ORIGINAL_ASSETS',
  exactThirdPartyMeshTextureSkinCopy:false,
  nativeRuntimeVerificationRequired:true
});

export function createSurvivalWildlifeAssetProfile({species='BEAR',platform='ROBLOX',skinVariant=''}={}){
  const key=upper(species)||'BEAR';
  const archetype=SURVIVAL_WILDLIFE_ARCHETYPES[key]||SURVIVAL_WILDLIFE_ARCHETYPES.BEAR;
  const variant=upper(skinVariant)||archetype.skinVariants[0];
  return Object.freeze({
    target:SURVIVAL_LOW_POLY_VISUAL_PROFILE.target,
    species:SURVIVAL_WILDLIFE_ARCHETYPES[key]?key:'BEAR',
    platform:upper(platform),
    bodyPlan:archetype.bodyPlan,
    size:archetype.size,
    locomotionFamily:archetype.locomotion,
    temperament:archetype.temperament,
    skinVariant:variant,
    availableSkinVariants:freezeList(archetype.skinVariants),
    style:SURVIVAL_LOW_POLY_VISUAL_PROFILE,
    rigRequirements:Object.freeze({
      articulatedLegs:true,
      spineAndNeck:true,
      jawWhenAttackOrGrazeUsesMouth:true,
      tailWhenSpeciesHasVisibleTail:true,
      earMotionWhenReadable:true,
      rootOnlyMotionForbidden:true
    }),
    visualRequirements:Object.freeze({
      silhouetteMustReadFromMobileCamera:true,
      speciesAnatomyMustRemainDistinct:true,
      meshAndMaterialMustExceedPrimitivePlaceholder:true,
      skinRequiresShapeOrMaterialVariationBeyondHue:true,
      lodRequired:true,
      groundContactShadowRequired:true
    }),
    masterGlbRequired:true,
    masterAssetFormat:'GLB_2_0',
    masterGlbContractVersion:CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.version,
    productionVerified:false,
    runtimeVerificationRequired:true,
    exactThirdPartyAssetCopy:false
  });
}

export const CLOTHING_LAYER_SLOTS=Object.freeze([
  'HEAD','HAIR','FACE','EAR','PIERCING','NECK',
  'TORSO_BASE','TORSO_INNER','TORSO_OUTER','SHOULDER',
  'ARM_UPPER','ARM_LOWER','GLOVE','WAIST','BELT','HIP',
  'LEG_INNER','LEG_OUTER','BOOT','BACK','CAPE','ACCESSORY','SPECIES_PART','TAIL_OR_APPENDAGE'
]);

export const ASSET_STYLE_FAMILIES=Object.freeze([
  'CARTOON','SEMI_CARTOON','ANIME_OR_CEL_SHADED','STYLIZED_FANTASY','STYLIZED_REALISM','DARK_FANTASY','HIGH_FANTASY','LOW_FANTASY',
  'WUXIA','XIANXIA','EAST_ASIAN_FANTASY','MYTHIC','FAIRYTALE','DREAMLIKE','GOTHIC','HORROR','COSMIC_HORROR','CUTE_CASUAL',
  'LOW_POLY','REALISTIC','SCI_FI','MILITARY_SCI_FI','CYBERPUNK','STEAMPUNK','DIESELPUNK','POST_APOCALYPSE','PRIMITIVE',
  'ANCIENT_CIVILIZATION','MODERN_URBAN','INDUSTRIAL','OCEANIC','SKY_WORLD','DESERT_CIVILIZATION','SNOW_KINGDOM',
  'JUNGLE_RUINS','UNDERGROUND','UNDEAD','MECHANICAL_CIVILIZATION','CHIBI','INK_WASH','WATERCOLOR','NOIR','TOON_NOIR',
  'SOLARPUNK','BIOPUNK','RETRO_FUTURISM','COZY','PAPER_CRAFT','VOXEL','DREAMCORE','HISTORICAL_EAST_ASIAN',
  'SPACE_OPERA','UNDERWATER_FANTASY','DESERT_FANTASY','MYTHIC_NORDIC'
]);

export const CONCEPT_AXES=Object.freeze({
  ART_TONE:Object.freeze(['CUTE','BRIGHT','MYSTERIOUS','DARK','GRITTY','ELEGANT','EPIC','SURREAL','HORROR','COMEDIC']),
  WORLD_ERA:Object.freeze(['PRIMITIVE','ANCIENT','MEDIEVAL','WUXIA','INDUSTRIAL','MODERN','NEAR_FUTURE','FUTURE','POST_APOCALYPSE','TIMELESS_FANTASY']),
  COMBAT_FEEL:Object.freeze(['FAST_COMBO','WEIGHTY','DODGE','PARRY','WUXIA_FLOW','PROJECTILE','SKILL_BURST','SURVIVAL','CROWD_CONTROL','BOSS_DUEL']),
  PRESENTATION:Object.freeze(['MINIMAL','READABLE_ARCADE','CINEMATIC','ATMOSPHERIC','HAND_PAINTED','CEL_SHADED','MATERIAL_RICH'])
});

export const BIOME_FAMILIES=Object.freeze([
  'FOREST','MAGICAL_FOREST','JUNGLE','SWAMP','DESERT','SNOW','VOLCANO','MOUNTAIN','PLAINS','BEACH',
  'OCEAN','CAVE','UNDERGROUND','SKY','VOID','RUINS','CITY','VILLAGE'
]);

export const BUILDING_THEMES=Object.freeze([
  'FANTASY_VILLAGE','CASTLE','DUNGEON','TEMPLE','JUNGLE_RUIN','DESERT','SNOW','MODERN_CITY','INDUSTRIAL','SCI_FI','HORROR','CARTOON'
]);

export const ASSET_DNA_FIELDS=Object.freeze([
  'ASSET_ID','FAMILY','SUBFAMILY','BODY_PLAN','SPECIES','RIG_PROFILE','STYLE_FAMILY','THEME','BIOME_FAMILY',
  'LAYER_SLOT','MODULE_TYPE','WEAPON_FAMILY','SKILL_FAMILY','MATERIAL_FAMILY','AUDIO_ROLE','VFX_ROLE','UI_ROLE',
  'INTERACTION_ROLE','SILHOUETTE_CLASS','FUNCTION_CLASS','HERO_ROLE','ITEM_ROLE','FAMILY_ROOT_ID','VISUAL_INTENT',
  'CAMERA_READABILITY_ROLE','PRESENTATION_ROLES','PLATFORM_VARIANT','SOURCE_PROVENANCE','PARENT_ID',
  'RUNTIME_VERIFICATION_STATE','COMPATIBILITY_TAGS','EXCLUSION_TAGS'
]);

export const DEFAULT_COVERAGE_BASELINES=Object.freeze({
  CHARACTER:Object.freeze({BODY_ARCHETYPE:12,HEAD_BASE:48,FACE_MORPH:28,SKIN_TONE:32,SKIN_DETAIL:24,EYE:32,BROW:20,HAIR:48,FACIAL_HAIR:24,SCAR_TATTOO_MAKEUP:40,PIERCING_ACCESSORY:32,SPECIES_PART:32,CLOTHING:60,ARMOR:36,EXPRESSION:24,GAIT_IDENTITY:24}),
  CREATURE:Object.freeze({BODY_PLAN:36,SPECIES:60,RIG:20,MUTATION:24,MOTION:12,SIGNATURE:12}),
  BUILDING:Object.freeze({MODULAR_EXTERIOR:30,INTERIOR:16,STRUCTURAL:12,NAVIGATION:5,PROP_SOCKET:10}),
  ENVIRONMENT:Object.freeze({BIOME:18,TERRAIN:16,VEGETATION:30,ROCK:16,LANDMARK:10,WEATHER:10,PROP_DENSITY:8}),
  WEAPON:Object.freeze({MELEE:16,RANGED:8,MAGIC_FOCUS:6,SHIELD:5,THROWN:5}),
  SKILL:Object.freeze({CAST_MOTION:14,VFX:16,PROJECTILE:10,IMPACT:16,AUDIO:14,CAMERA:8,REACTION:12}),
  MATERIAL:Object.freeze({SURFACE:16,STYLE_VARIANT:6}),
  AUDIO:Object.freeze({FOOTSTEP:14,CREATURE_VOCAL:20,ATTACK:14,HIT:14,WEAPON:14,ENVIRONMENT:14,UI:10,MAGIC:14,BOSS:10,BUILDING:10,WEATHER:10}),
  VFX:Object.freeze({CAST:16,TRAIL:14,IMPACT:20,STATUS:16,ENVIRONMENT:16,WEATHER:10,DESTRUCTION:10,BOSS:10}),
  UI:Object.freeze({ICON:30,FRAME:10,BUTTON:10,HUD:12,INVENTORY:10,MAP:10,STATUS:14,BOSS:8}),
  MOTION:Object.freeze({
    LOCOMOTION:32,TRAVERSAL:20,COMBAT:64,WEAPON_COMBAT:44,SKILL:24,DEFENSE:20,
    REACTION:24,SURVIVAL_CRAFTING:24,INTERACTION_UTILITY:20,PAIR:8,ACTING:12,DEATH:8
  }),
  PROP:Object.freeze({FURNITURE:24,CONTAINER:12,CRAFTING:14,DECORATION:28,RESOURCE:14,INTERACTIVE:14,DESTRUCTION:10})
})

export function createAssetDNA(input={}){
  const dna={
    ASSET_ID:text(input.ASSET_ID||input.assetId||input.id),
    FAMILY:upper(input.FAMILY||input.family||input.category),
    SUBFAMILY:upper(input.SUBFAMILY||input.subfamily||input.type),
    BODY_PLAN:upper(input.BODY_PLAN||input.bodyPlan),
    SPECIES:upper(input.SPECIES||input.species),
    RIG_PROFILE:upper(input.RIG_PROFILE||input.rigProfile),
    STYLE_FAMILY:upper(input.STYLE_FAMILY||input.styleFamily),
    THEME:upper(input.THEME||input.theme),
    BIOME_FAMILY:upper(input.BIOME_FAMILY||input.biomeFamily),
    LAYER_SLOT:upper(input.LAYER_SLOT||input.layerSlot),
    MODULE_TYPE:upper(input.MODULE_TYPE||input.moduleType),
    WEAPON_FAMILY:upper(input.WEAPON_FAMILY||input.weaponFamily),
    SKILL_FAMILY:upper(input.SKILL_FAMILY||input.skillFamily),
    MATERIAL_FAMILY:upper(input.MATERIAL_FAMILY||input.materialFamily),
    AUDIO_ROLE:upper(input.AUDIO_ROLE||input.audioRole),
    VFX_ROLE:upper(input.VFX_ROLE||input.vfxRole),
    UI_ROLE:upper(input.UI_ROLE||input.uiRole),
    INTERACTION_ROLE:upper(input.INTERACTION_ROLE||input.interactionRole),
    SILHOUETTE_CLASS:upper(input.SILHOUETTE_CLASS||input.silhouetteClass),
    FUNCTION_CLASS:upper(input.FUNCTION_CLASS||input.functionClass),
    HERO_ROLE:upper(input.HERO_ROLE||input.heroRole),
    ITEM_ROLE:upper(input.ITEM_ROLE||input.itemRole),
    FAMILY_ROOT_ID:text(input.FAMILY_ROOT_ID||input.familyRootId||input.assetFamilyId||input.PARENT_ID||input.parentId),
    VISUAL_INTENT:text(input.VISUAL_INTENT||input.visualIntent),
    CAMERA_READABILITY_ROLE:upper(input.CAMERA_READABILITY_ROLE||input.cameraReadabilityRole),
    PRESENTATION_ROLES:freezeList(uniq(input.PRESENTATION_ROLES||input.presentationRoles)),
    PLATFORM_VARIANT:upper(input.PLATFORM_VARIANT||input.platformVariant),
    SOURCE_PROVENANCE:text(input.SOURCE_PROVENANCE||input.sourceProvenance),
    PARENT_ID:text(input.PARENT_ID||input.parentId),
    RUNTIME_VERIFICATION_STATE:upper(input.RUNTIME_VERIFICATION_STATE||input.runtimeVerificationState||'PREPARED_SEMANTIC'),
    COMPATIBILITY_TAGS:freezeList(uniq(input.COMPATIBILITY_TAGS||input.compatibilityTags)),
    EXCLUSION_TAGS:freezeList(uniq(input.EXCLUSION_TAGS||input.exclusionTags))
  };
  return Object.freeze(dna);
}

function qualityMetric(value){
  const n=Number(value);
  if(!Number.isFinite(n))return 0;
  if(n>1)return clamp(n/100,0,1);
  return clamp(n,0,1);
}
function qualityGrade(score=0){
  return STUDIO_ASSET_QUALITY_GRADES.find(row=>Number(score)>=row.min)?.id||'REPAIR_REQUIRED';
}
function qualityEvidenceValue(source={},axis=''){
  const aliases={
    SILHOUETTE_FORM:['SILHOUETTE_FORM','silhouetteForm','silhouette','form'],
    MODELING_STRUCTURE:['MODELING_STRUCTURE','modelingStructure','modeling','structure'],
    MATERIAL_TEXTURE:['MATERIAL_TEXTURE','materialTexture','material','texture'],
    COLOR_LIGHTING:['COLOR_LIGHTING','colorLighting','lighting','color'],
    WORLD_STYLE_COHERENCE:['WORLD_STYLE_COHERENCE','worldStyleCoherence','styleCoherence','worldFit'],
    DETAIL_DENSITY:['DETAIL_DENSITY','detailDensity','detail'],
    MOTION_LIVINGNESS:['MOTION_LIVINGNESS','motionLivingness','motion','animation'],
    GAME_CAMERA_READABILITY:['GAME_CAMERA_READABILITY','gameCameraReadability','cameraReadability','readability'],
    UI_UX_COHERENCE:['UI_UX_COHERENCE','uiUxCoherence','uiUx','ui'],
    VFX_AUDIO_COHESION:['VFX_AUDIO_COHESION','vfxAudioCohesion','vfxAudio'],
    ORIGINALITY_IDENTITY:['ORIGINALITY_IDENTITY','originalityIdentity','identity','originality'],
    MOBILE_PERFORMANCE:['MOBILE_PERFORMANCE','mobilePerformance','performance'],
    ACTUAL_GAME_BINDING:['ACTUAL_GAME_BINDING','actualGameBinding','gameBinding'],
    PRODUCTION_VERIFICATION:['PRODUCTION_VERIFICATION','productionVerification','verification']
  };
  for(const key of aliases[axis]||[axis])if(source[key]!==undefined)return source[key];
  return 0;
}

export function scoreStudioAssetQuality120({asset={},evidence={}}={}){
  const source={...(asset?.qualityEvidence||{}),...(asset?.quality120||{}),...(evidence||{})};
  const family=upper(asset?.family||asset?.category);
  const configuredAxes=Array.isArray(asset?.applicableQualityAxes)&&asset.applicableQualityAxes.length
    ?uniq(asset.applicableQualityAxes.map(upper)).filter(axis=>STUDIO_ASSET_QUALITY_WEIGHTS[axis]!==undefined)
    :(STUDIO_ASSET_QUALITY_AXIS_APPLICABILITY[family]||Object.freeze(Object.keys(STUDIO_ASSET_QUALITY_WEIGHTS)));
  const excluded=new Set((asset?.notApplicableQualityAxes||source.notApplicableQualityAxes||[]).map(upper));
  const applicableAxes=configuredAxes.filter(axis=>!excluded.has(axis));
  const runtimeState=upper(asset?.runtimeVerificationState||source.runtimeVerificationState);
  const actualBinding=source.actualGameBinding===true||source.ACTUAL_GAME_BINDING===true||currentAssetConsumerGameIds(asset).length>0;
  const productionVerified=(asset?.productionVerified===true||asset?.verifiedCompanyReusable===true)
    &&(/VERIFIED_NATIVE_RUNTIME|VERIFIED_RUNTIME/.test(runtimeState)||source.runtimeVerified===true);
  const normalized={};
  let earned=0;
  let applicableWeight=0;
  for(const [axis,weight] of Object.entries(STUDIO_ASSET_QUALITY_WEIGHTS)){
    if(!applicableAxes.includes(axis))continue;
    let value=qualityMetric(qualityEvidenceValue(source,axis));
    if(axis==='ACTUAL_GAME_BINDING'&&actualBinding)value=1;
    if(axis==='PRODUCTION_VERIFICATION')value=productionVerified?1:0;
    normalized[axis]=value;
    earned+=weight*value;
    applicableWeight+=weight;
  }
  const score=applicableWeight>0?Math.round((earned/applicableWeight)*STUDIO_ASSET_QUALITY_MAX*10)/10:0;
  const ranked=Object.entries(normalized).map(([axis,value])=>Object.freeze({
    axis,value,weightedScore:Math.round(STUDIO_ASSET_QUALITY_WEIGHTS[axis]*value*10)/10,
    max:STUDIO_ASSET_QUALITY_WEIGHTS[axis]
  })).sort((a,b)=>a.value-b.value||b.max-a.max||a.axis.localeCompare(b.axis));
  return Object.freeze({
    version:2,
    assetId:text(asset?.id)||null,
    family:family||null,
    score,
    maxScore:STUDIO_ASSET_QUALITY_MAX,
    grade:qualityGrade(score),
    axes:Object.freeze(normalized),
    applicableAxes:freezeList(applicableAxes),
    applicableWeight,
    weakestAxis:ranked[0]||null,
    strongestAxes:freezeList(ranked.filter(row=>row.value>=.85).map(row=>row.axis)),
    measuredAxisCount:Object.values(normalized).filter(value=>value>0).length,
    commercialTargetReached:score>=100,
    heroTargetReached:score>=110,
    masterTargetReached:score>=116,
    scoreBlocksDevelopmentBinding:false,
    lowScoreMayBindWhenNoBetterSafeCompatibleAsset:true,
    productionVerified,
    productionVerificationIndependentFromQualityScore:true
  });
}


function internalAssetAuditMetric(value){
  const n=Number(value);
  if(!Number.isFinite(n))return 0;
  if(n>1)return clamp(n/100,0,1);
  return clamp(n,0,1);
}
function internalAssetAuditGrade(score=0){
  return INTERNAL_ASSET_AUDIT_GRADES.find(row=>Number(score)>=row.min)?.id||'REPAIR_REQUIRED';
}
function internalAssetAuditEvidenceValue(source={},axis=''){
  if(source[axis]!==undefined)return source[axis];
  const aliases={
    IDENTITY_SILHOUETTE:['identitySilhouette','identity','silhouette','distinctIdentity'],
    FORM_STRUCTURE:['formStructure','form','structure','modelingStructure','anatomy'],
    MATERIAL_SURFACE:['materialSurface','material','surface','texture'],
    COLOR_LIGHTING:['colorLighting','color','lighting'],
    STYLE_COHERENCE:['styleCoherence','style','worldFit'],
    DETAIL_FINISH:['detailFinish','detail','finish'],
    READABILITY_SCALE:['readabilityScale','readability','cameraReadability','scaleReadability'],
    MOTION_RIG:['motionRig','motion','rig','animation'],
    FEEDBACK_STATES:['feedbackStates','feedback','states','stateCoverage'],
    UI_UX_SYSTEM:['uiUxSystem','ui','ux','uiUx','uiSystem'],
    MODULAR_REUSE:['modularReuse','modular','reuse','modularity'],
    VARIATION_BREADTH:['variationBreadth','variation','breadth','variantCoverage'],
    PERFORMANCE_LOD:['performanceLod','performance','lod','mobilePerformance'],
    ACCESSIBILITY_INPUT:['accessibilityInput','accessibility','input','touch','inputCoverage'],
    PROVENANCE_MAINTAINABILITY:['provenanceMaintainability','provenance','maintainability','sourceQuality'],
    INTEGRATION_READINESS:['integrationReadiness','integration','bindingReadiness','applicationReadiness']
  };
  for(const key of aliases[axis]||[])if(source[key]!==undefined)return source[key];
  return undefined;
}
export function scoreInternalAssetAudit1000({asset={},evidence={}}={}){
  const source={...(asset?.internalAuditEvidence||{}),...(evidence||{})};
  const family=upper(asset?.family||asset?.category);
  const configured=Array.isArray(asset?.internalAuditAxes)&&asset.internalAuditAxes.length
    ?uniq(asset.internalAuditAxes.map(upper)).filter(axis=>INTERNAL_ASSET_AUDIT_WEIGHTS[axis]!==undefined)
    :(INTERNAL_ASSET_AUDIT_AXIS_APPLICABILITY[family]||Object.freeze(Object.keys(INTERNAL_ASSET_AUDIT_WEIGHTS)));
  const excluded=new Set((asset?.internalAuditNotApplicableAxes||source.notApplicableAxes||[]).map(upper));
  const applicableAxes=configured.filter(axis=>!excluded.has(axis));
  const normalized={};
  let earned=0,applicableWeight=0;
  for(const axis of applicableAxes){
    const weight=INTERNAL_ASSET_AUDIT_WEIGHTS[axis]||0;
    const value=internalAssetAuditMetric(internalAssetAuditEvidenceValue(source,axis));
    normalized[axis]=value;
    earned+=weight*value;
    applicableWeight+=weight;
  }
  const score=applicableWeight>0?Math.round((earned/applicableWeight)*INTERNAL_ASSET_AUDIT_MAX*10)/10:0;
  const blockers=[];
  const minimumAxis=family==='UI'?0.72:0.68;
  for(const [axis,value] of Object.entries(normalized)){
    if(value<minimumAxis)blockers.push('AXIS_BELOW_FLOOR:'+axis+':'+Math.round(value*100));
  }
  const globalCritical={STYLE_COHERENCE:80,READABILITY_SCALE:78,PROVENANCE_MAINTAINABILITY:80};
  const familyCritical=INTERNAL_ASSET_FAMILY_EXPECTATIONS[family]?.critical||{};
  for(const [axis,min] of Object.entries({...globalCritical,...familyCritical})){
    if(normalized[axis]!==undefined&&normalized[axis]*100<min)blockers.push('HARD_GATE:'+axis+':'+Math.round(normalized[axis]*100)+'<'+min);
  }
  const measuredAxisCount=Object.values(normalized).filter(value=>value>0).length;
  if(measuredAxisCount<Math.max(5,Math.ceil(applicableAxes.length*.8)))blockers.push('INSUFFICIENT_AUDIT_EVIDENCE');
  const pass=score>=INTERNAL_ASSET_AUDIT_PASS&&blockers.length===0;
  return Object.freeze({
    version:INTERNAL_ASSET_AUDIT_VERSION,
    assetId:text(asset?.id)||null,
    family:family||null,
    score,maxScore:INTERNAL_ASSET_AUDIT_MAX,
    grade:internalAssetAuditGrade(score),
    pass,
    minimumPassScore:INTERNAL_ASSET_AUDIT_PASS,
    axes:Object.freeze(normalized),
    applicableAxes:freezeList(applicableAxes),
    applicableWeight,
    measuredAxisCount,
    blockers:freezeList(blockers),
    expectations:freezeList(INTERNAL_ASSET_FAMILY_EXPECTATIONS[family]?.expectations||[]),
    studioRequired:false,
    nativeRuntimeRequired:false,
    productionPromotionIndependent:true,
    productionRuntimeVerificationUntouched:true,
    continualImprovementRequired:true,
    nextQualityTargets:freezeList([920,950,980,1000].filter(value=>value>score))
  });
}

export function createStudioAssetCriticReview({assessment={}}={}){
  const axes=assessment?.axes||{};
  const applicable=new Set(assessment?.applicableAxes||Object.keys(axes));
  const critics=Object.entries(STUDIO_ASSET_CRITICS).map(([critic,ownedAxes])=>{
    const relevant=ownedAxes.filter(axis=>applicable.has(axis));
    if(!relevant.length)return null;
    const values=relevant.map(axis=>Number(axes[axis]||0));
    const percent=values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length*100):0;
    return Object.freeze({critic,axes:freezeList(relevant),percent,status:percent>=90?'STRONG':percent>=75?'ACCEPTABLE':'IMPROVE'});
  }).filter(Boolean).sort((a,b)=>a.percent-b.percent||a.critic.localeCompare(b.critic));
  return Object.freeze({
    assetId:assessment?.assetId||null,
    critics:Object.freeze(critics),
    weakestCritic:critics[0]||null,
    independentPerspectivesRequired:true,
    oneCriticCannotSelfPromoteProduction:true
  });
}

export function createStudioAssetFamilyPlan({asset={},availableOutputs=[]}={}){
  const family=upper(asset?.family||asset?.category);
  const configured=STUDIO_ASSET_FAMILY_OUTPUTS[family]||Object.freeze([]);
  const available=new Set((availableOutputs||asset?.availableOutputs||[]).map(upper));
  const itemLike=(family==='PROP'||family==='WEAPON')&&/(ITEM|LOOT|RESOURCE|CONSUMABLE|CRAFT|WEAPON|TOOL)/.test(upper(asset?.functionClass||asset?.subfamily||asset?.type||family));
  const craftable=asset?.craftable===true||/CRAFT/.test(upper(asset?.functionClass||asset?.tags?.join(' ')));
  const collectible=asset?.collectible===true||itemLike;
  const required=configured.filter(role=>{
    if(!/_WHEN_/.test(role))return true;
    if(role==='INVENTORY_ICON_WHEN_ITEM')return itemLike;
    if(role==='CRAFTING_ICON_WHEN_CRAFTABLE')return craftable;
    if(role==='DROP_MODEL_WHEN_COLLECTIBLE')return collectible;
    return false;
  });
  const gaps=required.filter(role=>!available.has(role));
  return Object.freeze({
    assetId:text(asset?.id)||null,
    family,
    requiredOutputs:freezeList(required),
    optionalOutputs:freezeList(configured.filter(role=>!required.includes(role))),
    availableOutputs:freezeList([...available]),
    missingRequiredOutputs:freezeList(gaps),
    itemPresentationRequired:itemLike,
    itemPresentationRoles:itemLike?freezeList(required.filter(role=>/WORLD_MODEL|INVENTORY_ICON|DROP_MODEL|CRAFTING_ICON/.test(role))):freezeList([]),
    familyRootId:text(asset?.familyRootId||asset?.assetFamilyId||asset?.dna?.FAMILY_ROOT_ID||asset?.parentId)||text(asset?.id)||null,
    sameAssetDnaAcrossWorldEquipDropAndUi:true,
    uiIconMustReflectWorldAssetIdentity:itemLike||family==='WEAPON',
    equippedDropInventoryCraftingVariantsShareLineage:itemLike||family==='WEAPON',
    complete:gaps.length===0
  });
}

export function createHeroAssetQualityBaseline({assets=[],assessments=[],heroAssetIds=[]}={}){
  const explicit=new Set((heroAssetIds||[]).map(text).filter(Boolean));
  const byId=new Map((assessments||[]).map(row=>[text(row.assetId),row]));
  const heroes=(assets||[]).filter(asset=>{
    const id=text(asset?.id);
    const tags=(asset?.tags||[]).map(upper);
    return explicit.has(id)||asset?.hero===true||/HERO|PRIMARY|SIGNATURE|BOSS|LANDMARK|STARTING_HUB/.test(upper(asset?.heroRole||asset?.importance||''))||tags.some(tag=>/HERO|PRIMARY|SIGNATURE|BOSS|LANDMARK/.test(tag));
  }).map(asset=>({assetId:text(asset.id),assessment:byId.get(text(asset.id))||scoreStudioAssetQuality120({asset})}));
  const scores=heroes.map(row=>Number(row.assessment?.score)||0);
  return Object.freeze({
    heroAssetIds:freezeList(heroes.map(row=>row.assetId)),
    averageScore:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10:0,
    minimumScore:scores.length?Math.min(...scores):0,
    heroTarget:110,
    masterTarget:116,
    heroAssetsDefineGameQualityBaseline:true,
    empty:heroes.length===0
  });
}

export function createStudioAssetEvolutionPlan({assessment={},criticReview={},alternatives=[]}={}){
  const safeAlternatives=(alternatives||[]).filter(row=>row&&row.rightsPass!==false&&row.platformCompatible!==false&&row.gameplayAuthoritySafe!==false);
  const score=Number(assessment?.score)||0;
  const weakest=assessment?.weakestAxis?.axis||criticReview?.weakestCritic?.axes?.[0]||'UNMEASURED_QUALITY';
  const useCurrent=score<STUDIO_ASSET_QUALITY_MAX;
  return Object.freeze({
    assetId:assessment?.assetId||null,
    currentScore:score,
    targetScore:STUDIO_ASSET_QUALITY_MAX,
    currentGrade:assessment?.grade||qualityGrade(score),
    bindCurrentAsset:useCurrent||score>=STUDIO_ASSET_QUALITY_MAX,
    lowScoreBindingAllowed:score<100,
    fallbackReason:score<100&&safeAlternatives.length===0?'NO_BETTER_SAFE_COMPATIBLE_ALTERNATIVE':null,
    replacementPolicy:safeAlternatives.length?'KEEP_CURRENT_UNTIL_BETTER_ALTERNATIVE_PROVES_SUPERIOR':'IMPROVE_CURRENT_IN_PLACE',
    nextTarget:weakest,
    worstPartFirst:true,
    preserveStrongAxes:freezeList(assessment?.strongestAxes||[]),
    fullRebuildDefault:false,
    productionPromotionStillRequiresRuntimeEvidence:true,
    verifiedOutcomeOnlyMayTeachPositiveLearning:true,
    continueEvolutionAfterCheckpoint:true
  });
}

export function buildStudioAssetQuality120Program({assets=[],qualityEvidenceByAsset={},heroAssetIds=[],familyOutputsByAsset={}}={}){
  const seen=new Set();
  const uniqueAssets=[];
  for(const asset of assets||[]){const id=text(asset?.id);if(!id||seen.has(id))continue;seen.add(id);uniqueAssets.push(asset);}
  const assessments=uniqueAssets.map(asset=>scoreStudioAssetQuality120({asset,evidence:qualityEvidenceByAsset?.[text(asset.id)]||{}}));
  const assessmentById=new Map(assessments.map(row=>[row.assetId,row]));
  const criticReviews=uniqueAssets.map(asset=>createStudioAssetCriticReview({assessment:assessmentById.get(text(asset.id))}));
  const criticById=new Map(criticReviews.map(row=>[row.assetId,row]));
  const familyPlans=uniqueAssets.map(asset=>createStudioAssetFamilyPlan({asset,availableOutputs:familyOutputsByAsset?.[text(asset.id)]||asset?.availableOutputs||[]}));
  const evolutionQueue=uniqueAssets.map(asset=>createStudioAssetEvolutionPlan({
    assessment:assessmentById.get(text(asset.id)),criticReview:criticById.get(text(asset.id)),alternatives:asset?.qualityAlternatives||[]
  })).sort((a,b)=>a.currentScore-b.currentScore||String(a.assetId).localeCompare(String(b.assetId)));
  const heroBaseline=createHeroAssetQualityBaseline({assets:uniqueAssets,assessments,heroAssetIds});
  return Object.freeze({
    version:1,
    maxScore:STUDIO_ASSET_QUALITY_MAX,
    weights:STUDIO_ASSET_QUALITY_WEIGHTS,
    assessments:Object.freeze(assessments),
    criticReviews:Object.freeze(criticReviews),
    familyPlans:Object.freeze(familyPlans),
    heroBaseline,
    evolutionQueue:Object.freeze(evolutionQueue),
    belowCommercialCount:assessments.filter(row=>row.score<100).length,
    belowMasterCount:assessments.filter(row=>row.score<116).length,
    lowScoreBindingPolicy:'USE_WHEN_NO_BETTER_SAFE_COMPATIBLE_ALTERNATIVE_AND_KEEP_VISUAL_DEBT_OPEN',
    qualityScoreIsNotADevelopmentBindingGate:true,
    productionVerificationRemainsRuntimeEvidenceBased:true,
    verifiedOutcomeOnlyLearning:true
  });
}

// 스타일: 조형·표면·연기를 함께 정의하며 실제 메시/클립 적용 전에는 제작 지침이다.
// 기존 라이브러리의 종류별 기대조건을 실행 가능한 제작 순서로 압축한 작성자 교재.
// 검증된 자산/가중치/런타임 기록을 만들거나 기존 점수를 올리지 않는다.
const ASSET_TEACHER_FAMILY_NOTES=Object.freeze({
  CHARACTER:'Player/NPC: preserve identity and role; build readable head/torso/limb masses, face/hands/feet and clothing layers. Inspect existing rig, deformation, grip sockets, gaze and gait before reuse. NPC occupation changes posture/props, not quest or AI authority.',
  CREATURE:'Monster/animal: identify the actual body plan first (biped, quadruped, multi-leg, winged, swimming, slithering, floating). Keep species joints, limb count and silhouette; one signature feature before small detail. Match support/contact and appendage lag to that anatomy; never force a humanoid rig.',
  BUILDING:'Block load-bearing foundation, walls, roof and openings at gameplay scale; align modular seams and door pivots. Add interiors only where visible/required, then joints and cause-based wear. Keep navigation, collision and interaction authority unchanged.',
  ENVIRONMENT:'Plant/tree/terrain: establish biome and trunk-branch-leaf hierarchy, clustered leaf masses and species silhouette. For wind, local bend=a*h*h*sin(w*t+phase), h clamped to 0..1, keeps the root at h=0 fixed; branch lag stays bounded. Preserve terrain/collision; inspect canopy alpha overdraw and distant LOD.',
  WEAPON:'Separate functional blade/head, guard and handle masses; preserve grip/socket axes and hand clearance. Match equipped/drop/icon silhouettes. Add material seams and wear at actual contact edges; presentation never changes damage, reach or hit windows.',
  SKILL:'Build readable anticipation, travel/area, impact and recovery on the existing event timeline. Shape, color and sound must agree on the role. Preserve target/radius/cooldown and server authority; test overlapping effects at the real camera.',
  MATERIAL:'Separate base color, roughness, metallic and normal roles in the existing native material system. Check scale and response under neutral lighting; place dirt in cavities and wear at exposed/contact edges. Do not bake arbitrary light/shadow into albedo or replace form with noise.',
  AUDIO:'Create role-specific attack/body/tail and restrained variations using authorized sources or synthesis. Check loop seams, clipping, concurrent voices, distance and mix hierarchy; bind to the existing event once. Hearing a preview is not in-game mix verification.',
  VFX:'Use a clear primary shape and short supporting layers; synchronize emission to existing events. Budget particles, transparency and lights for the target mobile scene; reuse existing pooling. Effect size/brightness must not hide combat or imply changed hit logic.',
  UI:'Preserve layout/input/state semantics; produce a coherent icon, border and typography language with readable contrast. Inspect touch targets, safe areas and empty/loading/disabled/error states in the real screen. Decorative polish must not obscure actions or fabricate rewards.',
  MOTION:'Inspect the existing rig/body plan and clip window first. Shape pose, support/weight, arcs, contact, overlap and loop continuity; adapt only compatible joints. Preserve root ownership, clip duration and event times. Local pose bounds do not prove world-space planting.',
  PROP:'Identify rigid, hinged, articulated or soft construction. Set the correct pivot, attachment and functional proportions; refine seams/contact wear after silhouette. Keep collision/interaction semantics; animate only the existing movable parts, with bounded secondary motion.'
});

const ASSET_TEACHER_STYLE_NOTES=Object.freeze({
  CARTOON:'Bold rounded masses, few value groups, clear key poses; elastic accents only on compatible rigs.',
  SEMI_CARTOON:'Believable construction with selective proportion exaggeration and clean surfaces.',
  ANIME_OR_CEL_SHADED:'Clean tapered silhouettes, controlled cel bands and authored highlight shapes; crisp posing.',
  STYLIZED_FANTASY:'Readable fantasy silhouettes, selected ornate accents and coherent material families.',
  STYLIZED_REALISM:'Plausible anatomy/construction with selective simplification and observed weight.',
  DARK_FANTASY:'Weighted angular masses, cause-based weathering and readable silhouettes in controlled darkness.',
  HIGH_FANTASY:'Heroic mass hierarchy, purposeful ornament and magic motifs that preserve functional joints.',
  LOW_FANTASY:'Grounded craft, restrained fantasy accents and practical material wear.',
  WUXIA:'Flowing lines, layered cloth and controlled follow-through; preserve grip and landing contact.',
  XIANXIA:'Airy layered silhouettes and elevated motifs; bounded cloth/VFX must preserve readable action.',
  EAST_ASIAN_FANTASY:'Consistent regional craft and architectural grammar; avoid mixing unrelated motifs without a brief.',
  MYTHIC:'A strong symbolic silhouette and a small coherent motif set before ornamental detail.',
  FAIRYTALE:'Welcoming exaggerated proportions, organic curves and legible story props.',
  DREAMLIKE:'Intentional scale/shape contrasts with clear navigation and interaction cues.',
  GOTHIC:'Vertical rhythm, supported pointed forms and localized weathering; keep dark shapes separable.',
  HORROR:'One unsettling identity cue, controlled negative space and restrained motion; keep gameplay readable.',
  COSMIC_HORROR:'Unfamiliar body relationships with deliberate articulation and consistent silhouette logic.',
  CUTE_CASUAL:'Round primary masses, friendly proportions and minimal surface noise; retain role contrast.',
  LOW_POLY:'Purposeful facets aligned to form; species-specific masses, broad values and clear contacts.',
  REALISTIC:'Anatomical joints, physical material scale and causal wear; subtle inertia, no cartoon squash.',
  SCI_FI:'Functional panels, joints and access seams; deliberate material and emissive hierarchy.',
  MILITARY_SCI_FI:'Load-bearing gear, readable hard-surface construction and restrained tactical accents.',
  CYBERPUNK:'Layered urban tech with limited emissive focal points; preserve silhouettes against neon.',
  STEAMPUNK:'Coherent mechanical linkages, pressure vessels and aged metal; no purposeless gears.',
  DIESELPUNK:'Heavy industrial masses, visible fastening and restrained oily wear.',
  POST_APOCALYPSE:'Repairs, salvage and weathering follow construction/history; avoid uniform grime.',
  PRIMITIVE:'Readable stone/wood/fiber construction with believable bindings and tool marks.',
  ANCIENT_CIVILIZATION:'A consistent structural/material vocabulary and motif scale; decay follows exposure.',
  MODERN_URBAN:'Human scale, contemporary construction seams and coherent signage/prop density.',
  INDUSTRIAL:'Functional support, access, fasteners and material zones before pipes and grime.',
  OCEANIC:'Marine silhouettes, wet/dry material separation and coherent aquatic/shore anatomy.',
  SKY_WORLD:'Light silhouettes and anchored floating structures; retain routes and depth cues.',
  DESERT_CIVILIZATION:'Heat-adapted massing, shaded openings and wind/exposure-based wear.',
  SNOW_KINGDOM:'Snow rests on supported surfaces; cold palette retains material and role contrast.',
  JUNGLE_RUINS:'Structure remains readable beneath clustered vegetation; roots/growth follow support.',
  UNDERGROUND:'Layered rock strata, supported openings and clear routes in low light.',
  UNDEAD:'Preserve readable original anatomy with localized decay and a controlled gait signature.',
  MECHANICAL_CIVILIZATION:'Joint-driven motion and consistent machine construction; respect articulation clearance.',
  CHIBI:'Large head and compact body with clear hands/feet; check balance, equipment clearance and contacts.',
  INK_WASH:'Large value masses, intentional brush-like edges and sparse accent color; protect silhouette.',
  WATERCOLOR:'Soft color transitions and selective edge definition; keep focal and interaction shapes crisp.',
  NOIR:'Graphic light/shadow groups and restrained palette; faces, silhouettes and contacts remain visible.',
  TOON_NOIR:'Bold cartoon masses plus unsettling asymmetry; graphic shadow, held stares and weighted follow-through.',
  SOLARPUNK:'Repairable organic technology, welcoming greenery and clean functional material joins.',
  BIOPUNK:'Organic/technical interfaces follow a readable anatomy and material boundary.',
  RETRO_FUTURISM:'A consistent era of curves, controls and materials combined with purposeful future elements.',
  COZY:'Soft round forms, warm restrained values, tactile matte materials and gentle bounded motion; avoid busy microdetail.',
  PAPER_CRAFT:'Layer thickness, folds and cut edges drive form; preserve visible construction and joint limits.',
  VOXEL:'Consistent grid scale and purposeful stepped silhouettes; avoid noisy single-cell surface detail.',
  DREAMCORE:'Familiar simple forms with deliberate surreal contrast; keep spatial and interaction cues clear.',
  HISTORICAL_EAST_ASIAN:'Use a coherent period/region for garment layering, joinery and roof/prop construction.',
  SPACE_OPERA:'Heroic technological silhouettes, large panel hierarchy and readable restrained emissive accents.',
  UNDERWATER_FANTASY:'Aquatic articulation, buoyant secondary motion and depth-separated color/lighting.',
  DESERT_FANTASY:'Desert construction and cloth protection first, then a coherent fantasy motif hierarchy.',
  MYTHIC_NORDIC:'Strong timber/stone/metal masses, restrained interlace motifs and exposure-based weathering.'
});

const ASSET_TEACHER_DOMAIN_MODULES=Object.freeze({
  BUILDING:freezeList([
    Object.freeze({id:'MODERN_BUILDINGS',source:'assets/roblox/common-building-v1/RobloxCommonBuilding.luau',apis:freezeList(['List','Describe','Create']),lesson:'Modern house/apartment/shop/office/school/hospital/factory: reuse the existing floor, wall, window, door, stair and roof modules. Set a consistent storey/module grid, supported slabs, window rhythm, entrances and visible interiors. Separate concrete/brick/glass/metal; keep existing collision, door interactions and routes.',check:'Inspect street silhouette, floor alignment, doorway clearance, stairs, interior/exterior seams and repeated-window density at mobile distance.'}),
    Object.freeze({id:'MEDIEVAL_BUILDINGS',source:'assets/roblox/common-building-v1/RobloxCommonBuilding.luau',apis:freezeList(['Describe','Create']),lesson:'Medieval cottage/inn/shop/blacksmith/stable/mill/castle/wall/tower: establish timber or masonry support, infill, roof pitch/eaves and door/window grammar. Adapt shared modules to the task era; keep functional openings before ornament, weathering and banners. Do not mix modern and medieval construction unless the brief requests it.',check:'Inspect load-bearing joins, roof corners, gate clearance, readable function and restrained variation; a collection of boxes is only blockout.'})
  ]),
  ENVIRONMENT:freezeList([
    Object.freeze({id:'SETTLEMENT_LAYOUT',source:'assets/roblox/common-environment-v1/RobloxCommonEnvironment.luau',apis:freezeList(['CreateBiomeKit','CreateTerrainComposition','ListCompositions']),lesson:'Village/town/city: use an existing composition and its intended scale. Establish landmark, road/path hierarchy, entrances, market/plaza, residential and service clusters; align buildings to roads and terrain. Dress existing traversable routes; preserve spawn, navigation and interaction ownership.',check:'Walk the actual approach, crossroads and return route; inspect grounded foundations, readable landmarks, door access, scale and empty-space rhythm.'}),
    Object.freeze({id:'BACKGROUND_LAYERS',source:'assets/roblox/common-environment-v1/RobloxCommonEnvironment.luau',apis:freezeList(['CreateBiomeKit','CreateTerrainComposition']),lesson:'Compose foreground framing, playable midground and distant skyline using terrain, cliffs, water, vegetation and building silhouettes. Reduce distant geometry/material detail and contrast deliberately. Keep gameplay paths, targets and camera sightlines clear; fog must not conceal broken geometry.',check:'Compare near/mid/far camera views, horizon gaps, water/shore seams, silhouette separation, LOD transitions and mobile transparency cost.'}),
    Object.freeze({id:'WEATHER_PRESENTATION',source:'assets/roblox/common-environment-v1/RobloxCommonEnvironment.luau',apis:freezeList(['GetEnvironmentStateProfile','CreateEnvironmentPresentation','BindEnvironmentState','GetBiomeSoundscape']),states:COMMON_ENVIRONMENT_STATE_EXPECTATIONS,lesson:'Use the existing weather state as input. Coordinate sky, light, fog, bounded wind/foliage, rain/snow particles, wet/frost material response and ambient audio. Blend presentation with u=clamp(elapsed/duration,0,1), weight=u*u*(3-2*u), using the existing duration. Keep indoor shelter and mobile readability; never change weather authority or clock.',check:'Observe actual rain/snow/fog/light and sound through a transition, indoors and outdoors; state attributes alone do not prove weather rendered. Check particle/light/audio budgets and excessive flashing.'})
  ]),
  PROP:freezeList([
    Object.freeze({id:'SET_DRESSING',source:'assets/roblox/common-world-props-v1/RobloxCommonWorldProps.luau',apis:freezeList(['List','Describe','Create']),lesson:'Street/interior props include lamps, signs, benches, fences, crates, barrels, carts, shelves, tables, beds and workshop tools. Place purposeful clusters at believable use/contact points; vary scale/orientation only within construction logic. Preserve pivots, interaction reach and traversable space; do not scatter random clutter.',check:'Inspect support/ground contact, overlap, repeated patterns, sign readability, moving-part clearance and performance at game-camera distance.'}),
    Object.freeze({id:'ITEM_REPRESENTATIONS',source:'assets/roblox/common-items-v1/RobloxCommonItems.luau',apis:freezeList(['List','Describe','Create','CreateViewport']),lesson:'Weapons, armor, consumables, ingredients, resources, quest/key items and collectibles need a consistent existing item identity across world/drop, equipped and inventory views. Use the same internal model/style for its icon where supported. Distinguish type/rarity with silhouette and labels as well as color; preserve quantities, stats, prices and save IDs.',check:'Compare world and inventory representations, icon crop/lighting, equipped alignment, stack/lock/bound state and selected-item identity without inventing owned items.'})
  ]),
  UI:freezeList([
    Object.freeze({id:'INVENTORY_VARIANTS',source:'assets/roblox/common-ui-v1/RobloxCommonUI.luau',apis:freezeList(['CreateInventoryGrid','CreateInventoryFullScreen','CreateInventoryContainerPanel','CreateEquipmentFullScreen','CreateStashScreen','CreateItemDetailPanel','CreateItemComparePanel','CreateItemContextMenu']),lesson:'Support the task-selected grid/list/category bag, equipment slots, stash/storage, loot and quickslot views through existing screens. Keep stable item IDs, selected focus, filters/sort and scroll position. Bind equip/use/split/move/drop controls to existing validated handlers; show capacity, stack, lock, comparison and empty/full states from real data.',check:'On touch test selection, scrolling, long-press/actions, confirmation/cancel, close/reopen and return focus. A decorative grid or locally fabricated inventory update is not a working system.'}),
    Object.freeze({id:'MENU_NAVIGATION',source:'assets/roblox/common-ui-v1/RobloxCommonUI.luau',apis:freezeList(['CreateMainMenu','CreatePauseMenu','CreateSettingsPanel','CreateSideNavigation','CreateSearchField','CreateFilterBar','CreateSortControl','CreateNavigationBreadcrumbBackstack']),lesson:'Main/pause/settings menus and tabs use one existing navigation/back-stack owner. Keep selected tab, scroll/focus and return path; wire every visible action to its existing behavior. Respect safe areas, touch targets and modal input capture. Do not assume a local pause stops multiplayer simulation.',check:'Test open/back/close and repeated transitions, disabled/loading/error states, overlapping menus, small portrait/landscape screens and existing settings persistence.'}),
    Object.freeze({id:'SYSTEM_SCREENS',source:'assets/roblox/common-ui-v1/RobloxCommonUI.luau',apis:freezeList(['CreateShopFullScreen','CreateCraftingFullScreen','CreateMapFullScreen','CreateCharacterDetailScreen','CreateCodexScreen']),lesson:'Shop, crafting, upgrade/repair, map, quests, skills/status, codex, party and housing screens share the established component/style language. Show actual costs, requirements and results from existing systems, and provide explicit pending/success/failure feedback. Preserve economy, recipes, rewards, saves and server validation.',check:'Exercise a real existing action end-to-end, reject stale/double submissions through existing logic, verify displayed results against state, and retain focus/back navigation. Buttons and success text alone are not functional evidence.'})
  ])
});

const ASSET_TEACHER_ADVANCED_TECHNIQUES=Object.freeze([
  Object.freeze({...{"id":"CONTACT_IK_AND_REACH","when":"An existing articulated limb misses a validated contact target.","lesson":"Use the bound chain/root/end effector and stable pole in existing IK ownership; convert world targets into the correct rig space. Clamp geometric reach, retain anatomical limits, blend IK weight during the existing contact phase and release it before swing. Native IKControl modifies the bound chain; avoid another writer fighting Animator. A planar solver is only a geometry example.","check":"Compare same-condition slope/step/moving-support contact, knee flips, unreachable targets, root preservation and chain compatibility; never claim a raycast alone proves planted feet.","references":["https://create.roblox.com/docs/animation/inverse-kinematics"]},families:freezeList(["MOTION","CHARACTER","CREATURE"])}),
  Object.freeze({...{"id":"INERTIAL_SECONDARY_RESPONSE","when":"Existing secondary presentation snaps or changes feel with frame rate.","lesson":"Carry position and velocity through an exact damped response for each bounded scalar channel. Keep the fixed-target assumption per step, preserve authored clip phases, and apply anatomical/visual limits through the existing owner. Reset only on an actual teleport/lifecycle discontinuity. This is cosmetic response, not replacement physics or root movement.","check":"Compare equal time at 30/60/120 Hz, large dt, target changes, interruption and convergence; inspect clipping and unintended overshoot from carried velocity."},families:freezeList(["MOTION","CHARACTER","CREATURE","ENVIRONMENT","VFX","UI","WEAPON","SKILL"])}),
  Object.freeze({...{"id":"ROTATION_SPACE_AND_BLENDING","when":"A bound joint takes a long turn or snaps across orientation boundaries.","lesson":"Keep local/world spaces explicit and choose the shortest quaternion hemisphere before interpolation. Normalize inputs/output and handle near-identical orientations. Blend only channels the existing layer owns, preserving animation priorities/events and root authority. A deliberate full spin needs its authored angular path; shortest-path interpolation cannot invent it.","check":"Test q versus -q, tiny and near-180-degree changes, native local axes, interruption and loop closure; preserve the original duration."},families:freezeList(["MOTION","CHARACTER","CREATURE"])}),
  Object.freeze({...{"id":"PBR_UV_AND_STYLE_LOCK","when":"Materials look plastic, seams show, or texture detail defeats the selected style.","lesson":"Separate base color, roughness, metalness and tangent-space normals; Roblox SurfaceAppearance uses supported maps on MeshParts. Establish texel density, UV seams/padding and reusable trim/atlas regions before extra texture detail. Normals change lighting, not silhouette. Keep low-poly/cartoon/cozy palette and shape hierarchy; PBR is optional style-compatible material behavior, not a command to make everything photoreal.","check":"Compare native neutral/day/night lighting, UV seams at distance, material read, silhouette, texture memory and mobile capture; imported appearance and normal orientation must be verified in Studio.","references":["https://create.roblox.com/docs/art/modeling/surface-appearance","https://create.roblox.com/docs/reference/engine/classes/SurfaceAppearance"]},families:freezeList(["MATERIAL","CHARACTER","CREATURE","BUILDING","ENVIRONMENT","PROP","WEAPON"])}),
  Object.freeze({...{"id":"LOD_STREAMING_AND_VISIBILITY","when":"Measured rendering cost or visible detail popping exceeds the task budget.","lesson":"Use screen size and existing hysteresis to choose visual detail, preserving silhouette before surface detail. Prefer existing native render fidelity/streaming mechanisms; tolerate streamed instances disappearing/reappearing and release owned listeners. Streaming is not proof an offscreen object is inactive. Keep collision, authoritative state and required gameplay animation/events independent of decorative detail.","check":"Measure CPU/GPU/memory on the target device before/after; sweep thresholds, revisit streamed zones and verify no missing colliders, stale references or gameplay-event loss.","references":["https://create.roblox.com/docs/performance-optimization/improve"]},families:freezeList(["CHARACTER","CREATURE","BUILDING","ENVIRONMENT","PROP","VFX"])}),
  Object.freeze({...{"id":"CONSTRAINED_PROCEDURAL_DRESSING","when":"Repeated scenes need controlled variation without clutter or blocked routes.","lesson":"Generate candidates from existing source IDs and a stable order, validate terrain/support and reserved path/door/spawn areas, then reject decorative overlaps with a spatial index. Keep era/module grammar and density zones; sparse/negative space is intentional. Point spacing only handles its stated proxy shape and cannot replace native mesh bounds/collision validation.","check":"Compare a small scene with a brute-force overlap oracle, regenerate identical inputs, test negative coordinates and preserve navigation/interaction clearances."},families:freezeList(["BUILDING","ENVIRONMENT","PROP"])}),
  Object.freeze({...{"id":"VIRTUALIZED_UI_AND_RECYCLING","when":"Inventory/menu lists create excessive layout work or recycled cells show stale items.","lesson":"Render a viewport window plus bounded overscan, pool only owned cells, retain total scroll extent and bind actions by stable item ID. Reset recycled imagery/listeners and guard async thumbnail results by the current binding/version. Keep selection/focus independent of visible rows; fixed-height math cannot be reused for variable-height rows without measured offsets.","check":"Test a large list, fast scroll/filter/reorder, offscreen selection, controller focus, resize, repeated reopen and late responses; verify both correct IDs and measured native UI cost.","references":["https://create.roblox.com/docs/ui/scrolling-frames"]},families:freezeList(["UI"])}),
  Object.freeze({...{"id":"VFX_AUDIO_AND_WEATHER_BUDGET","when":"Effects obscure gameplay or accumulate work during weather/combat transitions.","lesson":"Budget active transparent screen coverage, emitter/light count and audio voices through existing owners; recycle only after reset and bound cleanup. Keep weather/effect timing and server events unchanged. Use distance/visibility for decorative detail and restrained perceptual transitions; avoid creating a new per-effect frame loop or silently muting gameplay cues.","check":"Measure worst-case overlapping effects on the target device, enter shelters, interrupt transitions and repeatedly spawn/despawn; inspect stale particles, voice leaks and loss of required cues.","references":["https://create.roblox.com/docs/performance-optimization/microprofiler/use-microprofiler"]},families:freezeList(["VFX","AUDIO","ENVIRONMENT","SKILL"])})
]);

const ASSET_TEACHER_APPLICATION_EXAMPLES=Object.freeze([
  Object.freeze({...{"id":"AI_TARGET_STICKINESS","actorAIOnly":true,"use":"Choose a target ID from unique stable IDs and finite precomputed utility scores in the existing AI owner. Only alive, perceived, allowed candidates participate; these flags must come from the existing validated observation layer. Keep the current eligible target unless the alternative improves its score by more than the nonnegative switch margin. This is an intent, not hit/range authorization.","code":"local function chooseTarget(candidates, currentId, margin)\n  assert(margin >= 0 and margin < math.huge, \"INVALID_SWITCH_MARGIN\")\n  local best, current = nil, nil\n  for _, row in ipairs(candidates) do\n    local score = row.score\n    if type(row.id) == \"string\" and row.id ~= \"\" and row.alive == true and row.perceived == true and row.allowed == true\n      and type(score) == \"number\" and score == score and math.abs(score) < math.huge then\n      if row.id == currentId then current = row end\n      if not best or score > best.score or (score == best.score and row.id < best.id) then best = row end\n    end\n  end\n  if not best then return nil end\n  if current and best.score-current.score <= margin then return current.id end\n  return best.id\nend\nreturn chooseTarget","checks":"Test candidate permutations, score ties, invalid/dead/occluded targets, exact switching margin and disappearance of the previous target. Scores must not introduce hidden knowledge."},families:freezeList(["CHARACTER","CREATURE"])}),
  Object.freeze({...{"id":"AI_FOLLOW_HYSTERESIS","actorAIOnly":true,"use":"Pure follow/stop intent for the current movement owner. Finite nonnegative distance and stopDistance; resumeDistance > stopDistance. Carry the previous moving boolean between decisions and use the owner's validated target distance. This does not calculate a route, velocity or teleport an actor.","code":"local function followIntent(moving, distance, stopDistance, resumeDistance)\n  assert(distance >= 0 and stopDistance >= 0 and resumeDistance > stopDistance, \"INVALID_FOLLOW_RANGE\")\n  if distance <= stopDistance then return false end\n  if distance >= resumeDistance then return true end\n  return moving == true\nend\nreturn followIntent","checks":"Test noisy distances inside the hysteresis band, exact boundaries, both previous states and invalid thresholds. Native crowd spacing, path clearance and lost-owner behavior require separate checks."},families:freezeList(["CHARACTER","CREATURE"])}),
  Object.freeze({...{"id":"AI_STATE_DWELL","actorAIOnly":true,"use":"Suppress nonurgent intent churn inside the existing state machine. State IDs and requested transitions are already validated; now/enteredAt use one monotonic clock, minimum dwell is finite >= 0. urgent comes only from the owner's existing death/stun/interrupt policy. Return state and entry time; do not retime attacks, hit windows or mandatory transitions.","code":"local function stateIntent(current, requested, now, enteredAt, minimumDwell, urgent)\n  assert(now >= enteredAt and minimumDwell >= 0, \"INVALID_STATE_CLOCK\")\n  if current == requested then return current, enteredAt end\n  if urgent ~= true and now-enteredAt < minimumDwell then return current, enteredAt end\n  return requested, now\nend\nreturn stateIntent","checks":"Test repeated same-state requests, exact dwell boundary, noisy alternatives, urgent interruption and a regressing clock. Run existing exit/entry cleanup only when the returned state actually changes."},families:freezeList(["CHARACTER","CREATURE"])}),
  Object.freeze({...{"id":"AI_PATH_RESULT_GUARD","actorAIOnly":true,"use":"Accept one native path result only for the active actor lifetime, target and revision. state has active, actorId, targetId, revision and pending request ID; request is the immutable snapshot captured before ComputeAsync. ok means the protected call and native PathStatus succeeded. A path with at least two waypoints is only a proposal; already-at-goal handling belongs to the existing owner.","code":"local function acceptPath(state, request, ok, waypoints)\n  if not state.active or state.pending == nil or state.pending ~= request.id\n    or state.actorId ~= request.actorId or state.targetId ~= request.targetId or state.revision ~= request.revision then\n    return nil, \"stale\"\n  end\n  state.pending = nil\n  if ok ~= true or type(waypoints) ~= \"table\" or #waypoints < 2 then return nil, \"failed\" end\n  return waypoints, \"ready\"\nend\nreturn acceptPath","checks":"Complete requests out of order; change target or actor generation; destroy the actor; deliver twice; fail the current path. Stale results must not clear the newer pending request. Native waypoint reachability and jump actions remain separate."},families:freezeList(["CHARACTER","CREATURE"])}),
  Object.freeze({...{"id":"TAPERED_APPENDAGE_WAVE","creatureOnly":true,"use":"Pure decorative joint-angle offset in radians for a compatible existing tail/tendril chain. Finite bounded inputs: s is normalized root-to-tip position, phase and phaseLag are authored radians, maxAngle >= 0. Sample against the saved rest/local transform through the existing animation owner; never compound onto the previous frame or drive authoritative root motion.","code":"local function appendageWave(s, phase, phaseLag, maxAngle)\n  assert(maxAngle >= 0, \"INVALID_ANGLE_BOUND\")\n  local u = math.max(0, math.min(1, s))\n  local envelope = u*u*(3-2*u)\n  return maxAngle*envelope*math.sin(phase-phaseLag*u)\nend\nreturn appendageWave","checks":"Check fixed root, zero amplitude, clamped position, angle bounds, repeat/reverse-order sampling and periodicity. Native joint axes, chain accumulation, contact and clipping remain separate checks."},families:freezeList(["CHARACTER","CREATURE"])}),
  Object.freeze({...{"id":"DIRECTIONAL_SURFACE_MASK","surfaceOnly":true,"use":"Offline or existing per-region decorative blend weight from the dot product of validated unit surface normal and unit deposition direction in the same coordinate space. Finite dot, low/high in [-1,1] with high > low; intensity clamped to [0,1]. Smoothstep is a paint proposal, not a runtime shader, ambient occlusion or proof snow/moss can reach a sheltered surface.","code":"local function surfaceMask(dot, low, high, intensity)\n  assert(low >= -1 and high <= 1 and high > low, \"INVALID_NORMAL_RANGE\")\n  local d = math.max(-1, math.min(1, dot))\n  local u = math.max(0, math.min(1, (d-low)/(high-low)))\n  return u*u*(3-2*u)*math.max(0, math.min(1, intensity))\nend\nreturn surfaceMask","checks":"Check threshold endpoints, monotonicity, clamped intensity and invalid intervals. Validate support/exposure separately and apply only to owned decorative color/texture regions; no collision or gameplay mutation."},families:freezeList(["MATERIAL","CHARACTER","CREATURE","BUILDING","ENVIRONMENT","PROP","WEAPON"])}),
  Object.freeze({...{"id":"PATH_SEGMENT_CLEARANCE","use":"Squared XZ distance from a decorative candidate center to a validated path segment. Finite bounded coordinates in existing world units; compare with (path half-width + conservative footprint radius + margin)^2 in the existing placement owner. This is a rejection proxy, not collision/navigation or permission to move a gameplay object.","code":"local function pathDistanceSquared(px, pz, ax, az, bx, bz)\n  local vx, vz = bx-ax, bz-az\n  local lengthSquared = vx*vx + vz*vz\n  local t = 0\n  if lengthSquared > 0 then\n    t = math.max(0, math.min(1, ((px-ax)*vx + (pz-az)*vz)/lengthSquared))\n  end\n  local dx, dz = px-(ax+t*vx), pz-(az+t*vz)\n  return dx*dx + dz*dz\nend\nreturn pathDistanceSquared","checks":"Test points along/beyond either endpoint, negative coordinates, zero-length segments and segment reversal. Inspect native footprint clearance, slope, overhang and actual traversability separately."},families:freezeList(["ENVIRONMENT","BUILDING","PROP"])}),
  Object.freeze({...{"id":"CUBIC_BEZIER_CAMERA_COMPONENT","cinematicOnly":true,"use":"Evaluate one finite scalar component of an authored cubic Bezier camera path with u clamped to [0,1]; repeat for X/Y/Z in the existing camera owner. This does not supply orientation, collision, focus or constant arc-length speed. Keep authored cut times and use the existing reduced-motion alternative.","code":"local function bezier(p0, p1, p2, p3, u)\n  local t = math.max(0, math.min(1, u))\n  local a, b, c = p0+(p1-p0)*t, p1+(p2-p1)*t, p2+(p3-p2)*t\n  local d, e = a+(b-a)*t, b+(c-b)*t\n  return d+(e-d)*t\nend\nreturn bezier","checks":"Check endpoints, clamping, a straight path, bounds within the control-value hull and repeat sampling. Native camera obstruction, orientation, motion comfort and speed still need actual playback."},families:freezeList(["MOTION","ENVIRONMENT"])}),
  Object.freeze({...{"id":"MONOTONIC_CINEMATIC_CUES","cinematicOnly":true,"use":"Collect visual cue IDs for one active run. state holds active/token/time; cues have finite sorted times and unique IDs. Initial time below zero includes a time-zero cue. Pass the current run token, update only forward and treat seek/skip as separate existing lifecycle actions. These cues must never grant damage, items or quest progress.","code":"local function advanceCues(state, token, now, cues)\n  if not state.active or state.token ~= token or now <= state.time then return {} end\n  local previous = state.time\n  state.time = now\n  local ids = {}\n  for _, cue in ipairs(cues) do\n    if cue.time > previous and cue.time <= now then table.insert(ids, cue.id) end\n  end\n  return ids\nend\nreturn advanceCues","checks":"Test time zero, equal cue times, a long frame, repeated updates, rewind, inactive runs and stale tokens after restart. A cue crossing is presentation evidence only, not proof audio/VFX actually rendered."},families:freezeList(["MOTION","AUDIO","VFX","UI"])}),
  Object.freeze({...{"id":"RELEASE_CINEMATIC_OWNERSHIP","cinematicOnly":true,"use":"Guard the existing scene's synchronous, non-yielding restore callback with its run token. The callback must restore only captured owned presentation state and must not start a new scene; resolve current camera/respawn through the existing owner. Return ok,error; a failed restore remains retryable and must be reported. This is not a complete camera/input controller.","code":"local function releaseScene(state, token, restore)\n  if not state.active or state.token ~= token or state.releasing then return false end\n  state.releasing = true\n  local ok, err = pcall(restore, state.snapshot)\n  state.releasing = false\n  if not ok then return false, err end\n  if state.token == token then state.active = false; state.token = nil end\n  return true\nend\nreturn releaseScene","checks":"Test finish followed by skip, stale completion after restart, recursive release and a failing restore followed by retry. Verify real camera/input/UI/audio restoration separately; a successful callback alone does not prove all owned properties were restored."},families:freezeList(["MOTION","UI"])}),
  Object.freeze({...{"id":"HERMITE_POSE_SEGMENT","use":"Scalar cubic Hermite between two already authored pose samples. p0/p1 are channel values, v0/v1 value-units per second, duration > 0; finite bounded rig inputs. Endpoint times remain the existing clip/event markers. Returns value and velocity. Outside the interval holds the endpoint with zero velocity; use zero endpoint velocities for a rest boundary. Large tangents can overshoot, so inspect existing anatomical bounds.","code":"local function poseSegment(p0, v0, p1, v1, elapsed, duration)\n  assert(duration > 0, \"INVALID_DURATION\")\n  if elapsed < 0 then return p0, 0 end\n  if elapsed > duration then return p1, 0 end\n  local u = elapsed/duration\n  local u2, u3 = u*u, u*u*u\n  local value = (2*u3-3*u2+1)*p0 + (u3-2*u2+u)*duration*v0\n    + (-2*u3+3*u2)*p1 + (u3-u2)*duration*v1\n  local velocity = ((6*u2-6*u)*p0 + (3*u2-4*u+1)*duration*v0\n    + (-6*u2+6*u)*p1 + (3*u2-2*u)*duration*v1)/duration\n  return value, velocity\nend\nreturn poseSegment","checks":"Check exact endpoint values/velocities, shared-segment C1 continuity, finite-difference derivatives, reverse sample order and invalid duration. Scalar continuity does not certify joint limits, world contact or native transition quality."},families:freezeList(["MOTION"])}),
  Object.freeze({...{"id":"CRITICALLY_DAMPED_SECONDARY_MOTION","use":"Exact scalar critically damped spring for an existing secondary visual channel. Finite inputs, omega > 0 in radians/second; target is constant during each step. Carry both value and velocity. Existing root, hit timing and update ownership remain authoritative; nonzero initial velocity may overshoot.","code":"local function spring(value, velocity, target, omega, dt)\n  assert(omega > 0, \"INVALID_FREQUENCY\")\n  dt = math.max(0, dt)\n  local offset = value - target\n  local j = velocity + omega * offset\n  local decay = math.exp(-omega * dt)\n  return target + (offset + j * dt) * decay,\n    (velocity - omega * j * dt) * decay\nend\nreturn spring","checks":"Compare 30/60/120 Hz and one full step against split steps for a fixed target; verify zero dt, carried velocity, convergence and invalid frequency. Native collision and articulation limits remain separate."},families:freezeList(["MOTION","CHARACTER","CREATURE","ENVIRONMENT","VFX","UI","WEAPON","SKILL"])}),
  Object.freeze({...{"id":"TWO_BONE_REACH_GEOMETRY","use":"Planar two-link geometry in an existing rig-local bend plane; a,b > 0, finite lengths and target x/y in the same units. Pole sign selects bend side. Returns joint x/y, clamped endpoint x/y, reachClamped. This only teaches geometry: prefer existing IKControl, retain pole continuity, joint limits and grounded-target ownership; do not add IK to incompatible rigs.","code":"local function twoBone(a, b, x, y, poleSign)\n  assert(a > 0 and b > 0, \"INVALID_BONE_LENGTH\")\n  local length = math.sqrt(x*x + y*y)\n  local ux, uy = 1, 0\n  if length > 0 then ux, uy = x/length, y/length end\n  local d = math.max(math.abs(a-b), math.min(a+b, length))\n  if d == 0 then return a, 0, 0, 0, false end\n  local along = (a*a - b*b + d*d) / (2*d)\n  local height = math.sqrt(math.max(0, a*a - along*along))\n  local side = poleSign < 0 and -1 or 1\n  return ux*along - uy*height*side, uy*along + ux*height*side,\n    ux*d, uy*d, d ~= length\nend\nreturn twoBone","checks":"Check both segment lengths, reflected pole directions, zero-distance equal links, unreachable inner/outer targets and rotating target angles. Passing this math is not foot contact, world-space IK or native rig validation."},families:freezeList(["MOTION","CHARACTER","CREATURE"])}),
  Object.freeze({...{"id":"SHORTEST_QUATERNION_BLEND","use":"Interpolate existing orientation samples as finite nonzero {x,y,z,w} quaternions using the shortest hemisphere. Weight clamps to [0,1]. Preserve the established CFrame/Animator conversion and priority; prefer native interpolation when sufficient. Does not infer turn direction for a requested full spin.","code":"local function slerp(a, b, weight)\n  local function unit(q)\n    local n = math.sqrt(q[1]^2 + q[2]^2 + q[3]^2 + q[4]^2)\n    assert(n > 1e-12, \"INVALID_QUATERNION\")\n    return {q[1]/n, q[2]/n, q[3]/n, q[4]/n}\n  end\n  a, b = unit(a), unit(b)\n  local dot = 0\n  for i=1,4 do dot = dot + a[i]*b[i] end\n  if dot < 0 then\n    dot = -dot\n    for i=1,4 do b[i] = -b[i] end\n  end\n  dot = math.max(-1, math.min(1, dot))\n  local t = math.max(0, math.min(1, weight))\n  local left, right = 1-t, t\n  if dot < 0.9995 then\n    local theta = math.acos(dot)\n    left, right = math.sin((1-t)*theta)/math.sin(theta), math.sin(t*theta)/math.sin(theta)\n  end\n  local result = {}\n  for i=1,4 do result[i] = left*a[i] + right*b[i] end\n  return unit(result)\nend\nreturn slerp","checks":"Test antipodal q/-q, tiny rotations, normalized output, constant angular steps outside the near-parallel fallback, endpoint clamping and unchanged inputs. Check intended native joint axes and 180-degree ambiguity separately."},families:freezeList(["MOTION","CHARACTER","CREATURE"])}),
  Object.freeze({...{"id":"VIRTUALIZED_FIXED_ROW_WINDOW","use":"Compute visible one-based rows for an existing fixed-height inventory/list; rowHeight includes spacing, scroll is in content pixels. count/overscan are nonnegative integers, height >= 0. Returns first,last,totalCanvasHeight; 1,0 denotes an empty window. Rebind pooled cells by stable ID and retain offscreen selection; variable-height layouts need measured prefix sums instead.","code":"local function rowWindow(count, rowHeight, scroll, height, overscan)\n  assert(count >= 0 and count == math.floor(count), \"INVALID_COUNT\")\n  assert(rowHeight > 0 and height >= 0, \"INVALID_EXTENT\")\n  assert(overscan >= 0 and overscan == math.floor(overscan), \"INVALID_OVERSCAN\")\n  local total = count * rowHeight\n  if count == 0 or height == 0 then return 1, 0, total end\n  local top = math.max(0, math.min(math.max(0, total-height), scroll))\n  local first = math.max(1, math.floor(top/rowHeight)+1-overscan)\n  local last = math.min(count, math.ceil((top+height)/rowHeight)+overscan)\n  return first, last, total\nend\nreturn rowWindow","checks":"Test empty/zero-height views, elastic negative/overscroll offsets, exact row boundaries, partial rows, viewport larger than content and a million-row list; rendered row count must stay bounded by viewport plus overscan."},families:freezeList(["UI"])}),
  Object.freeze({...{"id":"SPATIAL_HASH_DECORATIVE_SPACING","use":"Choose a deterministic subset of finite {id,x,z} candidates in stable source-ID order, with common positive minSpacing. Use only existing decorative candidates after native ground/path/clearance validation; the XZ point test is not mesh collision or gameplay placement. Return original records read-only. Recompute through the existing composition owner, not every frame.","code":"local function spacedPoints(candidates, minSpacing)\n  assert(minSpacing > 0, \"INVALID_SPACING\")\n  local cells, chosen = {}, {}\n  local function key(x,z) return tostring(x)..\":\"..tostring(z) end\n  for _, p in ipairs(candidates) do\n    local cx, cz = math.floor(p.x/minSpacing), math.floor(p.z/minSpacing)\n    local clear = true\n    for x=cx-1,cx+1 do\n      for z=cz-1,cz+1 do\n        for _, q in ipairs(cells[key(x,z)] or {}) do\n          local dx, dz = p.x-q.x, p.z-q.z\n          if dx*dx + dz*dz < minSpacing*minSpacing then clear = false end\n        end\n      end\n    end\n    if clear then\n      local cell = key(cx,cz)\n      cells[cell] = cells[cell] or {}\n      table.insert(cells[cell],p)\n      table.insert(chosen,p)\n    end\n  end\n  return chosen\nend\nreturn spacedPoints","checks":"Compare against a brute-force greedy spacing oracle, including negative coordinates, cell boundaries, duplicates and exact spacing. Stable input must reproduce without altering RNG, candidate records or native placement authority."},families:freezeList(["ENVIRONMENT","BUILDING","PROP"])}),
  Object.freeze({id:"FRAME_RATE_INDEPENDENT_FOLLOW",families:freezeList(["CHARACTER","CREATURE","MOTION","ENVIRONMENT","VFX","UI","WEAPON","SKILL"]),use:"Smooth an existing presentation scalar with frame-rate-independent exponential decay. Inputs must be finite; keep the existing update owner, units and gameplay timing.",code:"local function follow(value, target, rate, dt)\n  local alpha = 1 - math.exp(-math.max(0, rate) * math.max(0, dt))\n  return value + (target - value) * alpha\nend\nreturn follow",checks:"Compare 30/60/120 equal-duration steps; zero/negative dt must not advance and positive steps must not overshoot."}),
  Object.freeze({id:"SMOOTH_STATE_TRANSITION",families:freezeList(["ENVIRONMENT","MATERIAL","VFX","AUDIO","UI"]),use:"Blend existing weather/light/material/audio presentation from its authoritative state. Elapsed/duration are finite, duration >= 0; this does not choose or change game weather.",code:"local function transitionWeight(elapsed, duration)\n  assert(duration >= 0, \"INVALID_DURATION\")\n  if duration == 0 then return 1 end\n  local u = math.max(0, math.min(1, elapsed / duration))\n  return u * u * (3 - 2 * u)\nend\nreturn transitionWeight",checks:"Check start/end clamping, midpoint, zero duration and zero boundary velocity; preserve the existing transition duration."}),
  Object.freeze({id:"PERIODIC_SWING_ENVELOPE",families:freezeList(["MOTION"]),use:"A bounded gait lift envelope, phase in radians, height in existing rig units. Adapt only compatible existing swing channels; this does not solve world-space contact.",code:"local function swingLift(phase, height)\n  local swing = math.max(0, math.sin(phase))\n  return math.max(0, height) * swing * swing\nend\nreturn swingLift",checks:"Sample full cycles and both contact boundaries; verify periodic height and first-derivative continuity. A local lift is not proof of foot planting."}),
  Object.freeze({id:"STABLE_DECORATIVE_VARIATION",families:freezeList(["BUILDING","ENVIRONMENT","PROP","MATERIAL","CREATURE","CHARACTER"]),use:"Derive a deterministic decorative fraction from a stable source ID without changing shared random state. This is not suitable for rewards, security, unique IDs or authoritative generation.",code:"local function stableUnit(id)\n  local hash = 5381\n  for i = 1, #id do\n    hash = (hash * 33 + string.byte(id, i)) % 65521\n  end\n  return hash / 65521\nend\nreturn stableUnit",checks:"Same ID must reproduce across calls, values stay in [0,1), and neighboring assets use their existing distinct IDs; never resample each frame."}),
  Object.freeze({id:"MODULAR_GRID_SNAP",families:freezeList(["BUILDING","ENVIRONMENT","PROP"]),use:"Snap a visual module in the existing local construction coordinate system. Cell size is positive in the same units; ties round toward positive infinity. Preserve gameplay placement rules.",code:"local function snap(value, cell)\n  assert(cell > 0, \"INVALID_CELL\")\n  return math.floor(value / cell + 0.5) * cell\nend\nreturn snap",checks:"Test positive/negative coordinates, half-cell ties and repeated snapping; snapping must be idempotent."}),
  Object.freeze({id:"SUPPORT_PLANE_OFFSET",families:freezeList(["BUILDING","ENVIRONMENT","PROP"]),use:"Compute the offset for an oriented VISUAL bounding box against an already validated support plane. Normal is unit length, axes orthonormal, halfSize nonnegative; signedDistance is dot(normal, boxCenter-hitPoint). Apply through the existing static-prop placement owner, never actor/root physics.",code:"local function supportOffset(normal, right, up, look, halfSize, signedDistance, clearance)\n  local extent = math.abs(normal:Dot(right)) * halfSize.X\n    + math.abs(normal:Dot(up)) * halfSize.Y\n    + math.abs(normal:Dot(look)) * halfSize.Z\n  return extent + math.max(0, clearance) - signedDistance\nend\nreturn supportOffset",checks:"Check axis-aligned and rotated boxes, clearance and signed distances. Verify actual native contact/collision separately; bounding-box support can leave gaps under concave shapes."}),
  Object.freeze({id:"DETAIL_HYSTERESIS",families:freezeList(["BUILDING","ENVIRONMENT","PROP","CHARACTER","CREATURE","VFX"]),use:"Avoid near/far rendering detail flicker at a distance boundary. Distances and thresholds use the same units; affect visual detail only, preserving required animation/events/collision.",code:"local function useNearDetail(wasNear, distance, enterDistance, exitDistance)\n  assert(enterDistance >= 0 and exitDistance > enterDistance, \"INVALID_BAND\")\n  if distance <= enterDistance then return true end\n  if distance >= exitDistance then return false end\n  return wasNear == true\nend\nreturn useNearDetail",checks:"Cross both thresholds and oscillate inside the band; retain the previous state within the band and reject an invalid band."}),
  Object.freeze({id:"STABLE_INVENTORY_FILTER",families:freezeList(["UI"]),use:"Build a visible ID list from existing read-only item records. IDs are stable/unique and records already authorized; retain source order, counts and saved state. Bind actions by ID, never a filtered row number.",code:"local function visibleItemIds(items, query, category)\n  local needle = string.lower(query or \"\")\n  local ids = {}\n  for _, item in ipairs(items) do\n    local categoryMatches = category == nil or category == \"\" or item.category == category\n    if categoryMatches and string.find(string.lower(item.name or \"\"), needle, 1, true) then\n      table.insert(ids, item.id)\n    end\n  end\n  return ids\nend\nreturn visibleItemIds",checks:"Test literal pattern characters, duplicate names with distinct IDs, empty results, category filters and unchanged input records. Unicode/localized search needs the existing text-normalization owner."}),
  Object.freeze({id:"LATEST_VIEW_RESULT_ONLY",families:freezeList(["UI"]),use:"Ignore stale asynchronous menu/search/item-detail responses in the existing view owner. State has open/version; fetch accepts one callback(data,error). Closing/reopening invalidates version. Render reports errors without fabricating results; this is not server authorization or transaction deduplication.",code:"local function refreshView(state, fetch, render)\n  state.version = state.version + 1\n  local version = state.version\n  local delivered = false\n  fetch(function(data, err)\n    if not delivered and state.open and state.version == version then\n      delivered = true\n      render(data, err)\n    end\n  end)\nend\nreturn refreshView",checks:"Complete requests out of order, close the view, and invoke a callback twice; only the latest open view updates once. Server actions still need existing authoritative validation."}),
  Object.freeze({id:"DISCONNECT_OWNED_LISTENERS",families:freezeList(["UI","MOTION","ENVIRONMENT","VFX","AUDIO"]),use:"Release only this view/effect's dense list of owned connections when its existing lifecycle ends. Shared listeners and gameplay services are outside this list; use the existing cleanup owner.",code:"local function disconnectOwned(connections)\n  for i = #connections, 1, -1 do\n    connections[i]:Disconnect()\n    connections[i] = nil\n  end\nend\nreturn disconnectOwned",checks:"Repeated open/close must not multiply callbacks. After cleanup the owned list is empty; running cleanup twice must not disconnect unrelated listeners."})
]);

const CINEMATIC_DIRECTION_TEACHER=Object.freeze({"id":"CINEMATIC_DIRECTION_TEACHER_V1","provenance":"TEACHER_AUTHORED","status":"PRACTICE_ONLY","runtimeVerified":false,"productionVerified":false,"gameplayAuthority":false,"scope":"Apply only to an explicitly assigned cinematic/presentation task in its existing camera/timeline/UI owner. A single object-motion source window may not add a cutscene system.","lessons":[{"id":"STORY_BEATS_AND_BLOCKING","lesson":"Give each shot one readable purpose: establish place, reveal intent, show the existing action/consequence, then return control. Block with the actual game camera and compatible actors before detail. Keep the shortest sequence that communicates the beat; cuts do not authorize new quests, actors, rewards or gameplay states.","check":"Can a first-time viewer identify who acts, what changes and where play resumes without dialogue? Compare normal-speed playback and the skip result."},{"id":"COMPOSITION_AND_EYELINES","lesson":"Use foreground/midground/background separation, lead room and clear silhouettes. Match gaze, screen direction and the established action axis across reverse shots; cross the axis only with a deliberate re-establishing shot. Frame actual rig proportions, weapons and subtitles across portrait and landscape.","check":"Check occluded faces/hands, head cropping, reverse-shot gaze, line-crossing confusion and caption/safe-area overlap at the native device aspect ratios."},{"id":"CAMERA_PATH_AND_FOCUS","lesson":"Reuse the local camera owner. A Scriptable camera needs intentional CFrame, field of view and Focus updates plus later restoration. Choose static, pan, dolly, arc or reveal by story purpose. Cubic Bezier parameter time is not constant path speed; use an existing arc-length path when speed must be uniform. Use native obstruction checks; a smooth curve can pass through a wall.","check":"Scrub the entire path, inspect walls/near clipping, orientation flips, moving targets, focus region and camera return. Prefer restrained motion and respect reduced-motion settings.","references":["https://create.roblox.com/docs/workspace/camera"]},{"id":"ACTOR_BLOCKING_AND_CONTACT","lesson":"Stage actors with their existing rig, clip and contact owners. Keep gaze/hand/prop contacts, root authority and relative partner alignment consistent. Camera framing cannot hide skating or penetration. Multi-actor presentation must tolerate a participant being absent or streamed out; never teleport authoritative actors solely to repair a shot.","check":"Compare contact and silhouette from both the cinematic and gameplay cameras, including variable actor size, interrupted animation and missing participants."},{"id":"EDITING_CUES_AND_SOUND","lesson":"Use the existing presentation clock and authored animation/event markers for cuts, whooshes, impacts and subtitles. Cut on a clear action or reaction; use a sound lead/trail when it improves continuity. Dispatch crossed visual cues once per active run, including a long frame, and cancel old callbacks on skip. Do not drive damage/rewards from cutscene cues.","check":"Test equal-timestamp cues, low frame rate, delayed loading, out-of-order callbacks and interrupted audio. Preserve subtitle readability and existing authoritative event timing.","references":["https://create.roblox.com/docs/animation/events"]},{"id":"SKIP_CANCEL_AND_RETURN","lesson":"Route finish, skip, death/respawn, scene unload and error through the existing cleanup owner. Capture only owned camera/UI/input/audio properties and use a run token so an old scene cannot restore over a new one. Restore CameraType/subject/FOV/Focus and input/UI state as applicable; resolve respawn/current-camera changes through the current owner instead of reviving stale objects. Skipping is not completing a server quest.","check":"Skip at the first/middle/last frame; close twice; restart before an old callback arrives; inject a restore error and retry. Confirm control, camera, UI and audio actually recover."},{"id":"STREAMING_AND_MULTIPLAYER","lesson":"Resolve the exact shot's required streamed objects with a bounded existing readiness flow and graceful fallback. Keep camera presentation local to its intended audience and synchronize shared beats through existing authoritative timestamps. One player's cutscene or skip must not freeze other players or duplicate transactions.","check":"Test a missing streamed actor, a late join, disconnect and independent skips; preserve server state and gameplay visibility for players outside the scene."},{"id":"ACCESSIBLE_MOBILE_REVIEW","lesson":"Keep skip/back reachable by touch/controller, captions within safe areas and essential information available after a skip. Respect existing reduced-motion/flash settings; avoid repeated extreme FOV/shake. Budget visible particles/lights/audio and inspect mobile frame time while returning smoothly to play.","check":"Review portrait/landscape, reduced motion, captions on/off, slow loading and repeated entry/exit. Record actual captures and state restoration; an authored storyboard is not a rendered-quality pass."}],"ideas":[{"id":"BOSS_REVEAL","beats":["Existing environmental cue or shadow","Readable silhouette and signature gesture","Player reaction or scale comparison","Return to the established gameplay camera before combat input matters"],"guard":"Preserve existing encounter start and boss AI; the reveal cannot add invulnerability or delay an active attack."},{"id":"DUEL_EXCHANGE","beats":["Establish both fighters and the action axis","Frame the existing strike and confirmed contact","Brief direction-matched reaction","Return to a readable spacing view"],"guard":"Use current hit/cancel windows; no new hit-stop, camera lock or hidden opponent action."},{"id":"DIALOGUE_SUBTEXT","beats":["Shared establishing composition","Over-shoulder framing with matched eyelines","A gesture/prop insert that carries meaning","A reaction hold and clear return"],"guard":"Existing dialogue, actor identity and player choice remain authoritative."},{"id":"COZY_WORLD_INTRO","beats":["Calm foreground detail","Gentle reveal of the existing village landmark","NPC or animal doing an existing routine","Match the final shot to the playable entry view"],"guard":"Respect reduced motion, streaming readiness and current spawn/navigation."},{"id":"HORROR_OFFSCREEN_REVEAL","beats":["An existing sound suggests a direction","Hold on the character's reaction or empty space","Reveal only the necessary silhouette","Return control with the exit route still readable"],"guard":"Do not conceal active hazards, force flashing or rewrite enemy visibility rules."},{"id":"ITEM_OR_CRAFT_REVEAL","beats":["Show the existing item silhouette","A readable material/detail turn","Confirm the server-provided result in UI","Return selection and camera focus"],"guard":"The presentation never creates ownership, currency, crafting success or duplicate rewards."}]});

const PHOTO_REFERENCE_TEACHER_LESSONS=freezeList([{"id":"PIXEL_EVIDENCE_AND_UNCERTAINTY","lesson":"Read actual reference bytes and keep source ID/hash. Describe visible evidence separately from inferred design: horizon/perspective, silhouette, relative proportions, material regions, palette, light/shadow and occlusion. A single photograph cannot establish hidden topology, true dimensions or measured motion; mark those as proposals."},{"id":"SHAPE_DECOMPOSITION","lesson":"Break the subject into primary mass, secondary forms and signature details before microtexture. For a building use supported modules and openings; for a creature use body plan, actual visible limb placement, joint landmarks and silhouette anchors. Record which parts are occluded rather than inventing observed certainty."},{"id":"PHOTO_TO_CREATURE_DESIGN","lesson":"Turn an ordinary animal/object/nature reference into an original creature by transferring selected shape rhythm, material cues or proportion relationships. Choose a coherent body plan, support pattern and articulating parts; design unseen views explicitly. Do not describe a photo's still pose as a measured walk/attack or force every subject into a humanoid rig."},{"id":"PHOTO_TO_ENVIRONMENT_KIT","lesson":"Extract a usable terrain/building/vegetation/prop palette and repeated construction grammar. Separate foreground, playable midground and distant silhouette. Preserve the requested idea and style while designing a navigable native scene; a perspective photograph is not a top-down navigation map."},{"id":"STYLE_AND_MATERIAL_TRANSLATION","lesson":"Apply the explicit cartoon/dark-cartoon/cozy/low-poly/realistic lock to shape, value groups and surface detail. Separate photographed lighting from intended material color where evidence allows; do not bake every shadow into albedo. Keep identity anchors, consistent texel/detail scale and native material limits."},{"id":"NATIVE_ASSET_CONSTRUCTION","lesson":"Choose compatible existing modules/rigs, set scale from a known game anchor, author pivots/UV/materials and needed articulation, then bind through the current asset consumer. Blocked or unseen regions need original construction proposals. A thumbnail, prompt or generated image is not an editable mesh or a usable animated monster."},{"id":"REFERENCE_AND_RENDER_REVIEW","lesson":"Compare a matching reference view for silhouette/proportion/value, then turnaround/close-up/game-camera views for hidden geometry, seams and readability. For creatures also inspect native deformation/contact/action; for backgrounds walk the actual routes and inspect collisions. Preserve source and rendered artifact identities; record uncertain or unmeasured axes."}].map(row=>Object.freeze(row)));
const WORLD_LAYOUT_TEACHER_LESSONS=freezeList([{"id":"ROUTE_GRAPH_BEFORE_DRESSING","lesson":"Start from existing spawn, required entrances, objective and exit anchors; inspect the canonical route graph including one-way edges and required-node reachability. Refine visual dressing around those routes. A graph connection is only an abstract proposal until native width, slope, collision and traversal are verified.","source":"assets/vibe-environment-director.js","apis":["createVibeRouteGraph","createVibeMapDetailReconstruction"]},{"id":"TERRAIN_AND_WATER_LOGIC","lesson":"Establish coherent terrain masses, ridge/valley flow and existing water boundaries. Fit foundations, paths and retaining structures to supported surfaces; keep readable traversable grades and bridge approaches. Never infer world height/scale from one perspective photo or change collision/navigation just to match its silhouette."},{"id":"SETTLEMENT_FUNCTION_AND_FRONTAGE","lesson":"Arrange the existing settlement around a readable landmark and road hierarchy. Use purposeful residential/service/market clusters, supported building modules, consistent frontage and accessible entrances. Modern grids and medieval organic streets use different construction grammar; retain deliberate plazas, yards and negative space."},{"id":"COMPOSITION_AND_DISCOVERY","lesson":"Build a clear near/mid/far hierarchy with a dominant landmark, secondary cues and restrained filler. Use sightline reveals, framing and changes in density without hiding gameplay-critical targets. Check the actual player approach and return route, not only an attractive aerial composition."},{"id":"FOOTPRINT_AND_PATH_CLEARANCE","lesson":"Use existing validated support, footprints and reserved path/door/spawn regions before accepting decorative candidates. A point-to-segment distance plus conservative footprint radius can reject obvious path intrusions; irregular/vertical geometry still needs native checks. Keep all authoritative navigation, collision and interaction ownership unchanged."},{"id":"DENSITY_STREAMING_AND_NATIVE_WALKTHROUGH","lesson":"Spend detail where the player sees or interacts with it, reduce distant clutter, and preserve silhouette through existing LOD/streaming. Revisit the scene after unload/reload and inspect route clearance, entrance reachability, camera obstruction and device frame/memory cost. Declarative layout flags do not prove a playable map."}].map(row=>Object.freeze(row)));

const SURFACE_CRAFT_TEACHER=Object.freeze({
  source:'assets/roblox/common-materials-v1/RobloxCommonMaterials.luau',apis:freezeList(['Describe','Apply','ApplyMany','Audit']),
  nativeContract:'Inspect actual atom IDs and Describe variants first. Apply accepts BasePart plus variant, Color3 tint, tintStrength, reflectance, transparency and preservePhysics; keep preservePhysics=true and existing collision ownership. It sets built-in Material/Color/Reflectance/Transparency, not PBR texture maps. MeshPart SurfaceAppearance maps require separate compatible UVs and supported native imports; never invent a BasePart Roughness property or treat Reflectance as roughness. A material switch does not necessarily clear previous transparency: set the intended existing visual state explicitly.',
  styleContract:'Use the selected style bible: low-poly emphasizes intentional planes and sparse material groups; cartoon/cozy use broad highlights and restrained detail; dark cartoon preserves readable values; realism requires plausible scale and surface response. These are adaptations, not permission to replace the locked palette or shape language.',
  lessons:freezeList([{"id":"FUR_CLUMPS","lesson":"Group fur into silhouette clumps following anatomy and growth direction. Use sparse cards or modeled tufts only where the existing renderer supports them; reserve dense strands for close views.","check":"Check bald seams, card overdraw, joint stretching and distant shimmer."},{"id":"FEATHER_LAYERS","lesson":"Separate flight feathers, coverts and body masses; align overlaps with wing structure and fold direction. Author broad value groups before individual feather marks.","check":"Inspect folded and extended wings, layer intersections and silhouette at game distance."},{"id":"SCALES_AND_CHITIN","lesson":"Follow body flow with scale bands or shell plates; keep flexible gaps at joints. Large plates affect geometry while fine scales may use supported texture channels.","check":"Bend every joint and inspect stretched scales, rigid creases and excessive sparkle."},{"id":"SKIN_AND_LEATHER","lesson":"Use coherent skin planes and localized folds around compression; leather grain and wear follow thickness, seams and contact. Avoid uniform pores or painted lighting.","check":"Compare neutral and grazing light, stretched joints and style-appropriate detail scale."},{"id":"BONE_AND_HORN","lesson":"Build believable attachment, taper and growth direction. Separate hard keratin/bone from soft tissue using value and surface response rather than random highlights.","check":"Inspect roots, tips, intersections and readable contrast against the body."},{"id":"WOOD_AND_BARK","lesson":"Align grain with the piece's growth or construction direction, including end grain and supported joints. Bark depth must match viewing distance and silhouette needs.","check":"Check grain across modules, repeated tiles, UV seams and disconnected structural pieces."},{"id":"STONE_AND_EARTH","lesson":"Establish rock planes or packed-soil masses first; place fractures, sediment and dirt by plausible exposure and contact. Preserve broad light/shadow groups for low-poly work.","check":"Inspect tiny noisy facets, floating debris, tiling and material separation under flat light."},{"id":"METAL_PAINT_AND_RUST","lesson":"Distinguish exposed metal from paint, oxide and dirt. Use supported metalness/roughness maps when available; assign wear where handling or exposure explains it.","check":"Compare bare and coated regions under more than one light; check plastic-looking uniform gloss."},{"id":"CLOTH_AND_WEAVE","lesson":"Place folds from attachment, gravity and tension; keep weave subordinate to silhouette and correct scale. Model major folds and use supported maps for fine relief.","check":"Inspect shoulder/elbow compression, mirrored seams and distant moire or texture shimmer."},{"id":"GLASS_WATER_AND_ICE","lesson":"Choose the task's existing opaque, translucent or reflective treatment. Model important thickness/edges and keep transparent layers bounded; do not promise refraction from a tint preset.","check":"Check overlapping transparency, background readability and mobile cost without altering water physics."},{"id":"FOLIAGE_MOSS_AND_SNOW","lesson":"Group foliage by species and growth rhythm. Place moss/snow using exposure and support proposals, then verify shelter and contact; a normal-only mask cannot detect occlusion.","check":"Check leaf clusters, floating deposits, alpha overdraw and seasonal style consistency."},{"id":"SLIME_CRYSTAL_AND_EMISSION","lesson":"Separate body mass, highlights and restrained luminous accents. Keep internal details legible with bounded transparency; a Neon or color setting alone is not a complete glow effect.","check":"Inspect overlapping layers, clipped highlights, readable body volume and effect cost."}].map(row=>Object.freeze(row)))
});
const CREATURE_CRAFT_TEACHER=Object.freeze({
  source:'assets/roblox/common-creature-parts-v1/RobloxCommonCreatureParts.luau',apis:freezeList(['List','Describe','Create','CreateViewport']),
  nativeContract:'Inspect List/Describe before Create. Existing parts are decorative assemblies: anchored by default with CanCollide/CanTouch/CanQuery=false, and not a working NPC rig. Use supported quality near/mid/far, palette and bounded scale; bind compatible parts through the existing skeleton, joints or skin weights and animation owner. A static welded limb cannot articulate by itself. Preserve authoritative collision/root/AI/hit windows and existing consumer ownership.',
  designContract:'Start with body plan, species silhouette, size anchor, joint map, locomotion and existing action identity. Reuse createCreatureSpeciesBlueprint in this module; unknown species need an explicit design and must not be passed off as a fallback bear. Author unseen views as proposals. Review deformation, expression, contact, hit/death presentation and native device cost; hue-only variants do not demonstrate different species. Apply only the assigned species/body plan.',
  lessons:freezeList([{"id":"PAWED_QUADRUPED","lesson":"For wolves/cats/bears, define paw type, shoulder/hip masses, spine flexibility and center of mass from the chosen species. Heavy plantigrade and agile digitigrade bodies need different proportions and joint landmarks.","check":"Review front/side/three-quarter silhouette, planted paws, turning and weight transfer."},{"id":"HOOFED_QUADRUPED","lesson":"For deer/goats/boars, establish hoof contact, limb segment lengths, neck carriage and horn/tusk roots. Keep hock and knee interpretation explicit; do not reuse human leg axes blindly.","check":"Check leg folding, hoof penetration, head reach and balance on validated slopes."},{"id":"SMALL_AND_HOPPING","lesson":"For rabbits/rodents, define hindlimb leverage, compact torso, ears and tail identity. Preserve the existing hop/stride timing and keep secondary ears within their own joint limits.","check":"Check takeoff/landing contact, body clearance and ear/tail clipping at small scale."},{"id":"BIRDS_AND_BATS","lesson":"Bird wings use feather fans while bats use supported membranes; choose the correct skeleton and folding grammar. Distinguish ground stance, wing strokes and existing flight presentation.","check":"Inspect folded/extended wing topology, membrane stretching and foot contact; do not replace flight physics."},{"id":"INSECTS_AND_ARACHNIDS","lesson":"Use explicit six-leg insect or eight-leg arachnid plans unless the fantasy brief says otherwise. Place legs on coherent body segments and preserve mandible/antenna identity.","check":"Count and trace limb roots, inspect support sequence and crossed or collapsing legs."},{"id":"SERPENTS_AND_AQUATICS","lesson":"Choose a segmented serpent, fish, eel or tentacled body plan; specify spine and fin/tentacle attachments. Lateral fish motion, vertical cetacean motion and ground slither are distinct references.","check":"Check wave direction, segment lengths, surface intersections and existing water/root authority."},{"id":"BIPEDS_AND_GIANTS","lesson":"For humanoid, undead or giant forms, lock pelvis/ribcage/head proportions and load-bearing stance before ornaments. Scale changes require reconsidering visual stride, reach and weight cues.","check":"Inspect hands/feet, joint axes, equipment sockets and native contacts at the actual size."},{"id":"HYBRID_AND_ARMORED_MONSTERS","lesson":"Build a dragon, golem or hybrid around one coherent load path and explicit limb/wing count. Make plates, horns and signature organs functional in silhouette with deformation clearance.","check":"Check attachment roots and joint gaps through existing attacks; ornament changes never add hitboxes or skills."},{"id":"AMORPHOUS_AND_FLOATING","lesson":"For slime, ghosts and plant creatures, state which masses deform and which anchors stay fixed. Use a compatible existing rig/deformation method and clear face or threat cues.","check":"Inspect root preservation, silhouette collapse, tendril clipping and looping; cosmetic waves do not prove locomotion."}].map(row=>Object.freeze(row)))
});

const ACTOR_AI_TEACHER=Object.freeze({"sources":[{"source":"assets/common-ai.js","exports":["JaewoonCommonAI","JaewoonAISquad"],"methods":["decide","decideEnemy","decideCompanion","decideNpc","setOrder"]},{"source":"assets/ai-party.js","exports":["createAIPartyConfig","createDefaultAIEntries","validateAIPartyConfig"]},{"source":"assets/vibe-ai-role-director.js","exports":["createVibeMonsterEcologyMind","planVibeLivingActorDirector","planVibeCompanionSocialDirector","validateVibeAIAction"]}],"contract":"Inspect these existing JavaScript references and the assigned game's actual AI consumer; JavaScript is not a Roblox ModuleScript. Adapt only the required decision/math body to the existing native owner. JaewoonCommonAI returns intents with gameplayAuthority=false; validateVibeAIAction checks forbidden authority fields and is not complete native action authorization. Do not install a second brain, movement loop or scheduler. Unknown states, missing observations and unsupported actions need the existing safe fallback.","references":["https://create.roblox.com/docs/characters/pathfinding","https://create.roblox.com/docs/scripting/security/client-server-boundary"],"lessons":[{"id":"OBSERVATION_AND_MEMORY","lesson":"Build actor-local observations from existing sight/hearing and validated events; track last-known position, age and confidence. Separate perceived facts from proposed beliefs and expire lost contacts.","check":"Test occluded/dead targets, missing events and stale memory; no hidden world facts."},{"id":"MONSTER_TACTICS","lesson":"Use the existing monster ecology and decision owner for patrol, investigate, approach, attack intent, flank, retreat and return. Species, territory and personality affect preferences; authored attack/cancel windows stay fixed.","check":"Test no target, unreachable prey, leash return, group pressure and interruption during windup."},{"id":"COMPANION_ORDERS_AND_SUPPORT","lesson":"Respect existing follow/hold/focus/protect/retreat orders and role priorities. Resolve owner loss and stop/resume distances; propose heal/revive only when the existing capability and target checks allow it.","check":"Test conflicting orders, missing owner, downed allies, blocked follow routes and unavailable support actions."},{"id":"NPC_LIFE_AND_DIALOGUE","lesson":"Reuse current home/work/patrol anchors, activity stack, interruption and dialogue ownership. Resume the previous valid activity after conversation; keep identity and event-sourced relationships consistent.","check":"Test two players requesting interaction, danger during dialogue, unavailable workstations and actor unload."},{"id":"STATE_PRIORITY_AND_DWELL","lesson":"Document valid transitions and entry/exit cleanup in the current FSM/behavior tree. Brief dwell and target hysteresis reduce indecision; existing death/stun/cancel priorities must interrupt promptly.","check":"Replay noisy decisions and repeated identical states; do not reset entry time or restart animations every tick."},{"id":"PATH_FAILURE_AND_STALE_RESULTS","lesson":"Use the existing native path owner with compatible agent dimensions, protected ComputeAsync, checked PathStatus and waypoint actions. Replan for blockage ahead, meaningful goal changes or lack of progress with a bounded cooldown. Tag requests by actor lifetime, goal and revision; cancel obsolete work.","check":"Test no path, removed actor, replaced target, delayed results and blockage behind the actor. Never teleport through walls to claim recovery."},{"id":"DECISION_INTENT_AND_AUTHORITY","lesson":"Keep AI output as an allowed intent. Existing authoritative movement/combat/interaction owners revalidate target life, faction, range, line of sight, cooldown and ownership before acting. Dialogue/model text cannot grant damage, inventory, quests or persistent relationships.","check":"Test forged IDs, stale support requests and duplicate commands; preserve existing server validation and network ownership."},{"id":"BUDGET_AND_REPLAY","lesson":"Reuse the current shared scheduler and distance/importance budgets; stagger perception and path requests. Prefer deterministic local decisions for immediate reactions; optional language responses need a timeout and current-context fallback.","check":"Replay identical observations and measure native crowd CPU/path counts. Training's 64-worker setting is separate and remains unchanged."}]});

export function createAssetProductionTeachingRecipe({families=[],styleBible={},platform='',cinematic=false,visualReference=false,surfaceCraft=false,creatureCraft=false,actorAI=false}={}){
  const aliases={PLAYER:'CHARACTER',NPC:'CHARACTER',COMPANION:'CHARACTER',ALLY:'CHARACTER',ENEMY:'CREATURE',BOSS:'CREATURE',MONSTER:'CREATURE',ANIMAL:'CREATURE',BACKGROUND:'ENVIRONMENT',PLANT:'ENVIRONMENT',TREE:'ENVIRONMENT',FOLIAGE:'ENVIRONMENT',TERRAIN:'ENVIRONMENT',VILLAGE:'ENVIRONMENT',CITY:'ENVIRONMENT',WEATHER:'ENVIRONMENT',MODERN_BUILDING:'BUILDING',MEDIEVAL_BUILDING:'BUILDING',ITEM:'PROP',WORLD_PROP:'PROP',BACKGROUND_PROP:'PROP',CHARACTER_GEAR:'CHARACTER',EFFECT:'VFX',ANIMATION:'MOTION',INVENTORY:'UI',MENU:'UI',SYSTEM_UI:'UI'};
  const requested=uniq(uniq(families).map(value=>aliases[upper(value)]||upper(value)));
  const selected=requested.length?requested:STUDIO_ASSET_FAMILIES;
  const target=upper(platform);
  const actorAIEnabled=actorAI===true&&(!target||target==='ROBLOX')&&selected.some(family=>['CHARACTER','CREATURE'].includes(family));
  const cinematicEnabled=cinematic===true&&(!target||target==='ROBLOX');
  const surfaceEnabled=surfaceCraft===true&&(!target||target==='ROBLOX')&&selected.some(family=>['MATERIAL','CHARACTER','CREATURE','BUILDING','ENVIRONMENT','PROP','WEAPON'].includes(family));
  const creatureEnabled=creatureCraft===true&&(!target||target==='ROBLOX')&&selected.some(family=>['CHARACTER','CREATURE'].includes(family));
  const bible=createStyleBible({...styleBible,expressionAxes:styleBible?.expressionAxes||styleBible?.styleExpression?.axes}),style=bible.profileKey;
  const familyLessons=selected.filter(family=>ASSET_TEACHER_FAMILY_NOTES[family]).map(family=>Object.freeze({family,lesson:ASSET_TEACHER_FAMILY_NOTES[family]}));
  return Object.freeze({
    id:'INTERNAL_ASSET_TEACHER_V1',provenance:'TEACHER_AUTHORED',status:'PRACTICE_ONLY',runtimeVerified:false,productionVerified:false,gameplayAuthority:false,
    familyLessons:freezeList(familyLessons),unmappedFamilies:freezeList(selected.filter(family=>!ASSET_TEACHER_FAMILY_NOTES[family])),
    domainModules:freezeList(selected.flatMap(family=>ASSET_TEACHER_DOMAIN_MODULES[family]||[])),
    advancedTechniques:freezeList(target&&target!=='ROBLOX'?[]:ASSET_TEACHER_ADVANCED_TECHNIQUES.filter(technique=>technique.families.some(family=>selected.includes(family)))),
    cinematicDirection:cinematicEnabled?CINEMATIC_DIRECTION_TEACHER:null,
    surfaceCraft:surfaceEnabled?SURFACE_CRAFT_TEACHER:null,
    creatureCraft:creatureEnabled?CREATURE_CRAFT_TEACHER:null,
    actorAI:actorAIEnabled?ACTOR_AI_TEACHER:null,
    photoReferenceLessons:visualReference===true?PHOTO_REFERENCE_TEACHER_LESSONS:freezeList([]),
    worldLayoutLessons:selected.some(family=>['ENVIRONMENT','BUILDING'].includes(family))?WORLD_LAYOUT_TEACHER_LESSONS:freezeList([]),
    applicationPlatform:'ROBLOX',
    applicationExamples:freezeList(target&&target!=='ROBLOX'?[]:ASSET_TEACHER_APPLICATION_EXAMPLES.filter(example=>(!example.cinematicOnly||cinematicEnabled)&&(!example.surfaceOnly||surfaceEnabled)&&(!example.creatureOnly||creatureEnabled)&&(!example.actorAIOnly||actorAIEnabled)&&example.families.some(family=>selected.includes(family)))),
    applicationContract:'Original teaching examples use the Lua/Luau common subset. Their standalone return exposes a function for isolated tests, not a replacement game module. Adapt the relevant body directly inside the existing responsible function and native API flow; do not add wrappers, duplicate update loops or paste every example. Existing rig units, style locks, clip/event timing, bounds, source IDs and lifecycle ownership win. Parameterize from the existing task; passing arithmetic mocks is not Roblox runtime or commercial quality evidence.',
    failurePractice:'Exercise a normal case and a breaking case: different frame rates, zero/boundary values, stale view results, repeated open/close, support orientation and dense mobile scenes. Check the actual visible result and state, not helper existence. Keep successful axes; rework only observed defects and retain uncertainty when measurements are missing.',
    moduleScope:'These modules are reference coverage, not permission to add every screen/object/era. Apply only the current task and responsible source. Open the listed internal source to inspect actual IDs, options and return contracts before calling its APIs. Engine-specific source is reused only on its native platform.',
    style:Object.freeze({family:bible.styleFamily,profileKey:style,lesson:ASSET_TEACHER_STYLE_NOTES[style]||null,needsSpecificBrief:!ASSET_TEACHER_STYLE_NOTES[style],shape:bible.shapeLanguage,material:bible.materialLanguage,motion:bible.animationExaggeration,expression:bible.styleExpression}),
    inspect:'Open the selected internal source and verify its path/hash, native format, rig/pivots, material channels, variants and existing consumer. A registry entry, image, score or missing path is not a usable native asset or runtime proof. Reuse compatible strong parts; author only missing/weak parts in the existing responsibility. The explicit concept/style lock overrides generic teacher suggestions.',
    exercise:'Within the current object/source scope: fix the largest silhouette/construction defect, then material separation, articulation/contact and visible detail. Connect the actual native result to the existing consumer. Use before/after executable edits and the existing QA/evidence path; a renamed constant, recipe declaration or unused helper is not production.',
    verify:'Compare the same camera/light/scale/state before and after: silhouette, structure, material, style, motion/contact when applicable, mobile readability/performance and actual game binding. Keep source identity, gameplay timing, collision, saves and network authority. Record unsupported axes as unverified; this teacher cannot grant learning mastery or commercial/runtime PASS.'
  });
}

export const ASSET_STYLE_PROFILES=Object.freeze({
  COZY:Object.freeze({shapeLanguage:'SOFT_ROUNDED_READABLE_FORMS_WITH_TACTILE_CONSTRUCTION',materialLanguage:'WARM_RESTRAINED_VALUES_MATTE_SURFACES_AND_SPARSE_MICRODETAIL',lightingLanguage:'SOFT_WARM_KEY_READABLE_CONTACT_AND_GENTLE_FILL',characterProportion:'FRIENDLY_READABLE_PROPORTIONS_WITH_STABLE_CONTACT',animationExaggeration:'GENTLE_BOUNDED_SWAY_CLEAR_GESTURES_AND_SOFT_SETTLE',motion:Object.freeze({poseExaggeration:1.05,anticipationScale:1.05,overshootScale:.7,squashStretch:.02,secondaryMotion:.7,recoveryPresentation:1.1})}),
  CARTOON:Object.freeze({shapeLanguage:'BOLD_ROUNDED_PRIMARY_FORMS_WITH_CONTROLLED_ASYMMETRY',characterProportion:'EXPRESSIVE_HEAD_HANDS_AND_CLEAR_BODY_MASSES',materialLanguage:'CLEAN_VALUE_GROUPS_BROAD_HIGHLIGHTS_SPARSE_MICRODETAIL',lightingLanguage:'SOFT_KEY_CLEAR_CONTACT_SHADOW_AND_READABLE_FILL',animationExaggeration:'STRONG_KEY_POSES_ELASTIC_FOLLOW_THROUGH',buildingLanguage:'CHUNKY_BEVELS_CLEAR_MODULE_JOINTS_AND_PLAYFUL_ROOFLINES',motion:Object.freeze({poseExaggeration:1.35,anticipationScale:1.2,overshootScale:1.25,squashStretch:.15,secondaryMotion:1.2,recoveryPresentation:1.1})}),
  DARK_FANTASY:Object.freeze({shapeLanguage:'WEIGHTED_ANGULAR_MASSES_WITH_PURPOSEFUL_ASYMMETRY',characterProportion:'GROUNDED_ANATOMY_WITH_ONE_DISTURBING_SIGNATURE',materialLanguage:'LAYERED_ROUGHNESS_EDGE_WEAR_CAVITY_GRIME_AND_MATERIAL_SEPARATION',lightingLanguage:'DIRECTIONAL_KEY_CONTROLLED_FILL_PRESERVE_DARK_SILHOUETTE',animationExaggeration:'RESTRAINED_INTENT_HEAVY_CONTACT_AND_DELAYED_SETTLE',buildingLanguage:'LOAD_BEARING_FORMS_WEATHERED_JOINTS_AND_LOCALIZED_DECAY',motion:Object.freeze({poseExaggeration:.95,anticipationScale:1.15,overshootScale:.8,squashStretch:0,secondaryMotion:.8,recoveryPresentation:1.2})}),
  TOON_NOIR:Object.freeze({shapeLanguage:'BOLD_CARTOON_MASSES_WITH_UNSETTLING_ASYMMETRIC_DETAIL',characterProportion:'READABLE_EXAGGERATION_WITH_LOCKED_UNIQUE_FACE_AND_POSTURE',materialLanguage:'SIMPLIFIED_VALUE_GROUPS_WITH_FOCUSED_WEAR_AND_RICH_HERO_SURFACES',lightingLanguage:'GRAPHIC_LIGHT_SHADOW_GROUPS_WITH_VISIBLE_FACES_AND_CONTACT',animationExaggeration:'HELD_STARES_SHARP_POSE_CHANGES_WEIGHTED_FOLLOW_THROUGH',buildingLanguage:'CROOKED_BUT_SUPPORTED_MODULES_WITH_LOCAL_STORY_TRACES',motion:Object.freeze({poseExaggeration:1.25,anticipationScale:1.3,overshootScale:1.05,squashStretch:.06,secondaryMotion:1.1,recoveryPresentation:1.2})}),
  ANIME_OR_CEL_SHADED:Object.freeze({shapeLanguage:'CLEAN_TAPERED_FORMS_AND_PRECISE_SILHOUETTE',materialLanguage:'CONTROLLED_CEL_BANDS_AND_AUTHORED_HIGHLIGHT_SHAPES',animationExaggeration:'STRONG_LINE_OF_ACTION_HELD_POSES_AND_CRISP_BREAKDOWNS',motion:Object.freeze({poseExaggeration:1.2,anticipationScale:1.15,overshootScale:1.05,squashStretch:.03,secondaryMotion:1.15,recoveryPresentation:1})}),
  STYLIZED_REALISM:Object.freeze({shapeLanguage:'BELIEVABLE_ANATOMY_WITH_SELECTIVE_SHAPE_SIMPLIFICATION',materialLanguage:'PHYSICAL_MATERIAL_SEPARATION_WITH_AUTHORED_WEAR',animationExaggeration:'OBSERVED_WEIGHT_TRANSFER_AND_SUBTLE_SECONDARY_ACTING',motion:Object.freeze({poseExaggeration:1,anticipationScale:1,overshootScale:1,squashStretch:0,secondaryMotion:1,recoveryPresentation:1})}),
  REALISTIC:Object.freeze({shapeLanguage:'ANATOMICALLY_PLAUSIBLE_PLANES_JOINTS_AND_FUNCTIONAL_CONSTRUCTION',materialLanguage:'PHYSICAL_SCALE_PBR_WITH_MICROSURFACE_AND_CAUSE_BASED_WEAR',lightingLanguage:'PHYSICAL_LIGHT_RESPONSE_WITH_CONTROLLED_EXPOSURE_AND_READABLE_CONTACT',characterProportion:'ANATOMICAL_WITH_INDIVIDUAL_ASYMMETRY',animationExaggeration:'SUBTLE_GAZE_BREATHING_BALANCE_INERTIA_AND_CONTACT_NO_CARTOON_SQUASH',motion:Object.freeze({poseExaggeration:1,anticipationScale:1,overshootScale:.65,squashStretch:0,secondaryMotion:.85,recoveryPresentation:1})}),
  LOW_POLY:Object.freeze({shapeLanguage:'PURPOSEFUL_FACETED_PLANES_AND_SPECIES_SPECIFIC_MASSES',materialLanguage:'BROAD_MATTE_VALUE_GROUPS_WITH_SPARSE_SURFACE_ACCENTS',animationExaggeration:'CLEAR_JOINT_POSES_AND_GROUNDED_CONTACT',motion:Object.freeze({poseExaggeration:1.1,anticipationScale:1.1,overshootScale:1,squashStretch:0,secondaryMotion:.8,recoveryPresentation:1})})
});

export const INTERNAL_ASSET_STYLE_EXPRESSION_AXES=Object.freeze({
  SURFACE_FEEL:Object.freeze(['ROUGH','BALANCED','SOFT']),
  SHAPE_TEMPER:Object.freeze(['SHARP','ROUND','MIXED','FLOWING','BLOCKY']),
  EXPRESSION_INTENSITY:Object.freeze(['RESTRAINED','BALANCED','EXPRESSIVE','EXTREME']),
  MATERIAL_FINISH:Object.freeze(['RAW','MATTE','WEATHERED','CLEAN','GLOSSY']),
  LINE_ENERGY:Object.freeze(['CALM','FLOWING','DYNAMIC','AGGRESSIVE']),
  COLOR_ENERGY:Object.freeze(['MUTED','NATURAL','VIBRANT','HIGH_CONTRAST']),
  DETAIL_DENSITY:Object.freeze(['MINIMAL','MEDIUM','DENSE','SELECTIVE_DENSE']),
  DAMAGE_WEAR:Object.freeze(['CLEAN','LIGHT_WORN','HEAVY_WORN']),
  MOTION_ENERGY:Object.freeze(['SUBTLE','GROUNDED','EXPRESSIVE','EXAGGERATED']),
  VFX_ENERGY:Object.freeze(['SUBTLE','READABLE','PUNCHY','SPECTACULAR']),
  UI_EXPRESSION:Object.freeze(['MINIMAL','BALANCED','BOLD','ORNATE']),
  AUDIO_ENERGY:Object.freeze(['SUBTLE','NATURAL','PUNCHY','CINEMATIC']),
  ATMOSPHERE_WEIGHT:Object.freeze(['AIRY','BALANCED','HEAVY','OPPRESSIVE'])
});

export const INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS=Object.freeze({
  BUILDING:Object.freeze(['SURFACE_FEEL','SHAPE_TEMPER','EXPRESSION_INTENSITY','MATERIAL_FINISH','LINE_ENERGY','COLOR_ENERGY','DETAIL_DENSITY','DAMAGE_WEAR','ATMOSPHERE_WEIGHT']),
  CREATURE:Object.freeze(['SURFACE_FEEL','SHAPE_TEMPER','EXPRESSION_INTENSITY','MATERIAL_FINISH','LINE_ENERGY','COLOR_ENERGY','DETAIL_DENSITY','DAMAGE_WEAR','MOTION_ENERGY']),
  MOTION:Object.freeze(['EXPRESSION_INTENSITY','LINE_ENERGY','MOTION_ENERGY']),
  UI:Object.freeze(['SHAPE_TEMPER','EXPRESSION_INTENSITY','LINE_ENERGY','COLOR_ENERGY','DETAIL_DENSITY','UI_EXPRESSION','MOTION_ENERGY']),
  WORLD_PROP:Object.freeze(['SURFACE_FEEL','SHAPE_TEMPER','MATERIAL_FINISH','COLOR_ENERGY','DETAIL_DENSITY','DAMAGE_WEAR']),
  ENVIRONMENT:Object.freeze(['SURFACE_FEEL','SHAPE_TEMPER','MATERIAL_FINISH','COLOR_ENERGY','DETAIL_DENSITY','DAMAGE_WEAR','ATMOSPHERE_WEIGHT']),
  ITEM:Object.freeze(['SURFACE_FEEL','SHAPE_TEMPER','MATERIAL_FINISH','COLOR_ENERGY','DETAIL_DENSITY','DAMAGE_WEAR']),
  SKILL:Object.freeze(['SHAPE_TEMPER','EXPRESSION_INTENSITY','LINE_ENERGY','COLOR_ENERGY','MOTION_ENERGY','VFX_ENERGY']),
  VFX:Object.freeze(['SHAPE_TEMPER','EXPRESSION_INTENSITY','LINE_ENERGY','COLOR_ENERGY','DETAIL_DENSITY','VFX_ENERGY']),
  PRESENTATION:Object.freeze(['EXPRESSION_INTENSITY','LINE_ENERGY','COLOR_ENERGY','DETAIL_DENSITY','MOTION_ENERGY','VFX_ENERGY','UI_EXPRESSION','AUDIO_ENERGY','ATMOSPHERE_WEIGHT']),
  CHARACTER_GEAR:Object.freeze(['SURFACE_FEEL','SHAPE_TEMPER','EXPRESSION_INTENSITY','MATERIAL_FINISH','COLOR_ENERGY','DETAIL_DENSITY','DAMAGE_WEAR']),
  WEAPON:Object.freeze(['SURFACE_FEEL','SHAPE_TEMPER','EXPRESSION_INTENSITY','MATERIAL_FINISH','LINE_ENERGY','COLOR_ENERGY','DETAIL_DENSITY','DAMAGE_WEAR','MOTION_ENERGY','VFX_ENERGY']),
  AUDIO:Object.freeze(['EXPRESSION_INTENSITY','AUDIO_ENERGY','ATMOSPHERE_WEIGHT']),
  FOLIAGE:Object.freeze(['SURFACE_FEEL','SHAPE_TEMPER','COLOR_ENERGY','DETAIL_DENSITY','DAMAGE_WEAR','MOTION_ENERGY','ATMOSPHERE_WEIGHT']),
  MATERIAL:Object.freeze(['SURFACE_FEEL','MATERIAL_FINISH','COLOR_ENERGY','DETAIL_DENSITY','DAMAGE_WEAR'])
});

const INTERNAL_ASSET_STYLE_EXPRESSION_PRESETS=Object.freeze({
  COZY_CALM:Object.freeze({SURFACE_FEEL:'SOFT',SHAPE_TEMPER:'ROUND',EXPRESSION_INTENSITY:'BALANCED',MATERIAL_FINISH:'MATTE',LINE_ENERGY:'CALM',COLOR_ENERGY:'NATURAL',DETAIL_DENSITY:'MINIMAL',DAMAGE_WEAR:'CLEAN',MOTION_ENERGY:'SUBTLE',VFX_ENERGY:'SUBTLE',UI_EXPRESSION:'BALANCED',AUDIO_ENERGY:'SUBTLE',ATMOSPHERE_WEIGHT:'AIRY'}),
  SOFT_PLAYFUL:Object.freeze({SURFACE_FEEL:'SOFT',SHAPE_TEMPER:'ROUND',EXPRESSION_INTENSITY:'EXPRESSIVE',MATERIAL_FINISH:'CLEAN',LINE_ENERGY:'DYNAMIC',COLOR_ENERGY:'VIBRANT',DETAIL_DENSITY:'MEDIUM',DAMAGE_WEAR:'CLEAN',MOTION_ENERGY:'EXAGGERATED',VFX_ENERGY:'PUNCHY',UI_EXPRESSION:'BOLD',AUDIO_ENERGY:'PUNCHY',ATMOSPHERE_WEIGHT:'AIRY'}),
  DARK_ROUGH:Object.freeze({SURFACE_FEEL:'ROUGH',SHAPE_TEMPER:'SHARP',EXPRESSION_INTENSITY:'EXPRESSIVE',MATERIAL_FINISH:'WEATHERED',LINE_ENERGY:'AGGRESSIVE',COLOR_ENERGY:'MUTED',DETAIL_DENSITY:'DENSE',DAMAGE_WEAR:'HEAVY_WORN',MOTION_ENERGY:'GROUNDED',VFX_ENERGY:'PUNCHY',UI_EXPRESSION:'ORNATE',AUDIO_ENERGY:'CINEMATIC',ATMOSPHERE_WEIGHT:'OPPRESSIVE'}),
  FLOWING_RESTRAINED:Object.freeze({SURFACE_FEEL:'BALANCED',SHAPE_TEMPER:'FLOWING',EXPRESSION_INTENSITY:'RESTRAINED',MATERIAL_FINISH:'MATTE',LINE_ENERGY:'FLOWING',COLOR_ENERGY:'MUTED',DETAIL_DENSITY:'SELECTIVE_DENSE',DAMAGE_WEAR:'LIGHT_WORN',MOTION_ENERGY:'EXPRESSIVE',VFX_ENERGY:'READABLE',UI_EXPRESSION:'MINIMAL',AUDIO_ENERGY:'NATURAL',ATMOSPHERE_WEIGHT:'AIRY'}),
  GROUNDED_REAL:Object.freeze({SURFACE_FEEL:'BALANCED',SHAPE_TEMPER:'MIXED',EXPRESSION_INTENSITY:'RESTRAINED',MATERIAL_FINISH:'WEATHERED',LINE_ENERGY:'CALM',COLOR_ENERGY:'NATURAL',DETAIL_DENSITY:'DENSE',DAMAGE_WEAR:'LIGHT_WORN',MOTION_ENERGY:'GROUNDED',VFX_ENERGY:'READABLE',UI_EXPRESSION:'BALANCED',AUDIO_ENERGY:'NATURAL',ATMOSPHERE_WEIGHT:'BALANCED'}),
  CLEAN_TECH:Object.freeze({SURFACE_FEEL:'BALANCED',SHAPE_TEMPER:'SHARP',EXPRESSION_INTENSITY:'BALANCED',MATERIAL_FINISH:'CLEAN',LINE_ENERGY:'DYNAMIC',COLOR_ENERGY:'HIGH_CONTRAST',DETAIL_DENSITY:'SELECTIVE_DENSE',DAMAGE_WEAR:'CLEAN',MOTION_ENERGY:'EXPRESSIVE',VFX_ENERGY:'SPECTACULAR',UI_EXPRESSION:'BOLD',AUDIO_ENERGY:'PUNCHY',ATMOSPHERE_WEIGHT:'BALANCED'}),
  GENERAL:Object.freeze({SURFACE_FEEL:'BALANCED',SHAPE_TEMPER:'MIXED',EXPRESSION_INTENSITY:'BALANCED',MATERIAL_FINISH:'MATTE',LINE_ENERGY:'DYNAMIC',COLOR_ENERGY:'NATURAL',DETAIL_DENSITY:'MEDIUM',DAMAGE_WEAR:'LIGHT_WORN',MOTION_ENERGY:'GROUNDED',VFX_ENERGY:'READABLE',UI_EXPRESSION:'BALANCED',AUDIO_ENERGY:'NATURAL',ATMOSPHERE_WEIGHT:'BALANCED'})
});

export function resolveInternalAssetStyleExpressionProfile({styleFamily='',styles=[],artTone=[],overrides={}}={}){
  const firstStyle=(styles||[])[0];
  const family=upper(styleFamily||(typeof firstStyle==='string'?firstStyle:firstStyle?.family)||'STYLIZED_FANTASY');
  const toneSet=new Set(uniq(artTone).map(upper));
  let preset='GENERAL';
  if(family==='COZY')preset='COZY_CALM';
  else if(['CARTOON','CUTE_CASUAL','CHIBI','FAIRYTALE','PAPER_CRAFT'].some(token=>family.includes(token)))preset='SOFT_PLAYFUL';
  else if(['DARK_FANTASY','HORROR','GOTHIC','NOIR','TOON_NOIR','POST_APOCALYPSE','UNDEAD'].some(token=>family.includes(token)))preset='DARK_ROUGH';
  else if(['WUXIA','INK_WASH','HISTORICAL_EAST_ASIAN','EAST_ASIAN_FANTASY','WATERCOLOR'].some(token=>family.includes(token)))preset='FLOWING_RESTRAINED';
  else if(['REALISTIC','STYLIZED_REALISM','LOW_FANTASY','PRIMITIVE'].some(token=>family.includes(token)))preset='GROUNDED_REAL';
  else if(['SCI_FI','CYBERPUNK','SOLARPUNK','BIOPUNK','RETRO_FUTURISM','SPACE_OPERA','MECHANICAL_CIVILIZATION'].some(token=>family.includes(token)))preset='CLEAN_TECH';
  const axes={...INTERNAL_ASSET_STYLE_EXPRESSION_PRESETS[preset]};
  if(toneSet.has('DARK')||toneSet.has('GRITTY')||toneSet.has('HORROR')){
    axes.SURFACE_FEEL='ROUGH';axes.MATERIAL_FINISH='WEATHERED';axes.DAMAGE_WEAR='HEAVY_WORN';axes.ATMOSPHERE_WEIGHT='HEAVY';
  }
  if(toneSet.has('BRIGHT')||toneSet.has('CUTE')){
    axes.SURFACE_FEEL='SOFT';axes.SHAPE_TEMPER='ROUND';axes.COLOR_ENERGY='VIBRANT';axes.MATERIAL_FINISH='CLEAN';axes.ATMOSPHERE_WEIGHT='AIRY';
  }
  if(toneSet.has('EPIC')){
    axes.EXPRESSION_INTENSITY='EXPRESSIVE';axes.DETAIL_DENSITY='DENSE';axes.MOTION_ENERGY='EXPRESSIVE';axes.VFX_ENERGY='SPECTACULAR';axes.AUDIO_ENERGY='CINEMATIC';
  }
  if(toneSet.has('ELEGANT')){
    axes.SHAPE_TEMPER='FLOWING';axes.EXPRESSION_INTENSITY='RESTRAINED';axes.LINE_ENERGY='FLOWING';axes.DETAIL_DENSITY='SELECTIVE_DENSE';
  }
  if(toneSet.has('SURREAL')){
    axes.EXPRESSION_INTENSITY='EXPRESSIVE';axes.COLOR_ENERGY='HIGH_CONTRAST';axes.VFX_ENERGY='SPECTACULAR';
  }
  if(toneSet.has('COMEDIC')){
    axes.EXPRESSION_INTENSITY='EXTREME';axes.MOTION_ENERGY='EXAGGERATED';axes.UI_EXPRESSION='BOLD';
  }
  for(const [key,value] of Object.entries(overrides||{})){
    const axis=upper(key),choice=upper(value);
    if(INTERNAL_ASSET_STYLE_EXPRESSION_AXES[axis]?.includes(choice))axes[axis]=choice;
  }
  return Object.freeze({
    version:1,sourceStyleFamily:family,preset,axes:Object.freeze(axes),
    conceptStyleLockWins:true,photoReferenceMaySuggestButNotOverrideConceptLock:true,
    gameplayAuthority:false,balanceAuthority:false,progressionAuthority:false,saveAuthority:false,networkAuthority:false
  });
}

export function createStyleBible(input={}){
  const family=upper(input.styleFamily||'STYLIZED_FANTASY');
  const styles=(input.styles||[]).filter(row=>typeof row==='string'||Number(row.weight??1)>0).map(row=>upper(typeof row==='string'?row:row.family));
  const mixedToon=styles.includes('CARTOON')&&styles.some(style=>['DARK_FANTASY','HORROR','NOIR','GOTHIC'].includes(style));
  const profileKey=upper(input.profileKey)||(mixedToon||family==='DARK_CARTOON'?'TOON_NOIR':['HORROR','GOTHIC','NOIR'].includes(family)?'DARK_FANTASY':family);
  const defaults=ASSET_STYLE_PROFILES[profileKey]||{};
  const styleExpression=resolveInternalAssetStyleExpressionProfile({
    styleFamily:profileKey,
    styles:input.styles||[],
    artTone:input.artTone||[],
    overrides:input.styleExpressionOverrides||input.expressionAxes||{}
  });
  const bible={
    styleFamily:family,
    profileKey,
    styleExpression,
    shapeLanguage:text(input.shapeLanguage||defaults.shapeLanguage||'CLEAR_READABLE_PRIMARY_FORMS'),
    characterProportion:text(input.characterProportion||defaults.characterProportion||'GAME_SPECIFIC'),
    silhouetteRule:text(input.silhouetteRule||'READABLE_AT_GAME_CAMERA_DISTANCE'),
    paletteContrast:text(input.paletteContrast||'ROLE_AND_REGION_SEPARATION'),
    materialLanguage:text(input.materialLanguage||defaults.materialLanguage||'COHESIVE_WITH_STYLE_FAMILY'),
    lightingLanguage:text(input.lightingLanguage||defaults.lightingLanguage||'SUPPORT_GAMEPLAY_READABILITY'),
    vfxShapeLanguage:text(input.vfxShapeLanguage||'MATCH_STYLE_AND_DAMAGE_ROLE'),
    animationExaggeration:text(input.animationExaggeration||defaults.animationExaggeration||'STYLE_LOCK_DEPENDENT'),
    uiLanguage:text(input.uiLanguage||'MATCH_SHAPE_PALETTE_AND_READABILITY'),
    buildingLanguage:text(input.buildingLanguage||defaults.buildingLanguage||'MATCH_WORLD_THEME_AND_CONSTRUCTION_LOGIC'),
    creatureLanguage:text(input.creatureLanguage||'BODY_PLAN_AND_SPECIES_IDENTITY_FIRST')
  };
  return Object.freeze(bible);
}

// 커마 제작: 모델별로 선언된 범위와 연결점만 사용한다. 이 계획은 실제 편집·검증 결과가 아니다.
export const ASSET_CUSTOMIZATION_AXES=Object.freeze(Object.fromEntries(Object.entries({
  CHARACTER:['FACE','BODY_PROPORTION','HAIR','EXPRESSION','CLOTHING','ACCESSORY','SURFACE_WEAR','BODY_ARCHETYPE','HEAD_BASE','FACE_MORPH','EYE_SHAPE','EYE_COLOR','HETEROCHROMIA','BROW','SKIN_TONE','SKIN_DETAIL','AGE_PRESENTATION','HAIR_STYLE','HAIR_COLOR','HAIR_HIGHLIGHT','HAIR_GRAYING','FACIAL_HAIR','SCAR','TATTOO_OR_BODY_MARK','MAKEUP','PIERCING','SPECIES_PART','GAIT_IDENTITY'],
  CREATURE:['BODY_PLAN','HEAD','LIMB_PROPORTION','HORN_TEETH_CLAW','SKIN','SIGNATURE_ORGAN','SURFACE_WEAR'],
  BUILDING:['WALL','DOOR','WINDOW','ROOF','ROOM_LAYOUT','JOINT_DETAIL','LOCAL_DAMAGE','SURFACE_WEAR'],
  ENVIRONMENT:['TERRAIN_PROFILE','ROCK_FORM','TREE_BRANCH','FOLIAGE_DENSITY','GROUND_COVER','WETNESS','LANDMARK'],
  WEAPON:['BLADE_HEAD','HANDLE','GUARD','ORNAMENT','MATERIAL','SURFACE_WEAR'],
  PROP:['STRUCTURE','PROPORTION','ATTACHMENT','MATERIAL','LOCAL_DAMAGE','SURFACE_WEAR'],
  MATERIAL:['BASE_COLOR','ROUGHNESS','METALLIC','NORMAL_DETAIL','CAVITY_GRIME','EDGE_WEAR','WETNESS'],
  AUDIO:['TIMBRE','ATTACK_TRANSIENT','BODY','TAIL','LAYERING','VARIATION','SPATIAL_RESPONSE','MIX_PRIORITY'],
  UI:['SHAPE','BORDER','MATERIAL','ICON','CONTRAST','TYPOGRAPHY','LAYOUT_VISUAL','STATE_VARIANT','FEEDBACK_MOTION'],
  VFX:['SHAPE','PALETTE','DENSITY','TRAIL','IMPACT','DISSIPATION'],
  SKILL:['CAST_POSE','PROJECTILE_VISUAL','IMPACT_VISUAL','RECOVERY_POSE'],
  MOTION:['POSE','GAZE','WEIGHT_TRANSFER','STRIDE_PRESENTATION','FOLLOW_THROUGH','RECOVERY_PRESENTATION']
}).map(([family,axes])=>[family,freezeList(axes)])));

export function createAssetCustomizationPlan({assets=[],recipes=[],styleBible={},contract={},platform='UNITY'}={}){
  const byId=new Map(assets.filter(row=>text(row.id)).map(row=>[text(row.id),row]));
  const familyProduction=Object.freeze({
    CHARACTER:Object.freeze({
      construction:Object.freeze(['PRIMARY_SILHOUETTE','BODY_PROPORTIONS','SECONDARY_ANATOMY','FACE_HANDS_FEET','CLOTHING_AND_EQUIPMENT_FIT','DEFORMATION_TOPOLOGY','RIG_AND_SOCKETS','SURFACE_AUTHORING','MOTION_PREP']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['ROLE_SILHOUETTE','HEAD_BODY_RATIO','EQUIPMENT_READABILITY','PRIMARY_COLOR_MASSES']),
        MID_RANGE:Object.freeze(['ANATOMY_PLANES','CLOTHING_LAYERS','ARMOR_OVERLAP','HAIR_OR_CREST_GROUPS','SECONDARY_COLOR_BLOCKS']),
        CLOSEUP:Object.freeze(['EYELIDS_LIPS_JAW','FINGERS_HAND_SHAPE','SEAMS_FASTENERS','MATERIAL_TRANSITIONS','SCARS_MARKS','EDGE_WEAR']),
        CONTACT:Object.freeze(['HAND_WEAPON_GRIP','FOOT_GROUND','CLOTH_BODY_CLEARANCE','JOINT_FOLDS','SOCKET_ALIGNMENT'])
      }),
      authoredOutputs:Object.freeze(['EDITABLE_DCC_SOURCE','GAME_MESH','UV_OR_ATLAS','MATERIAL_SET','RIG','SOCKET_MAP','EXPRESSION_CONTROLS','PLATFORM_VARIANTS'])
    }),
    CREATURE:Object.freeze({
      construction:Object.freeze(['SPECIES_SILHOUETTE','ANATOMICAL_MASS','LIMB_APPENDAGE_STRUCTURE','HEAD_MOUTH_EYES','BODY_PLAN_TOPOLOGY','SPECIES_MATERIALS','BODY_PLAN_RIG','LOCOMOTION_AND_ATTACK_PREP']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['SPECIES_SILHOUETTE','LOCOSILHOUETTE','DANGER_CUE','SIGNATURE_APPENDAGE']),
        MID_RANGE:Object.freeze(['MUSCLE_SHELL_FUR_MASS','JOINT_STRUCTURE','HORN_CLAW_TOOTH_GROUPS','PATTERN_REGIONS']),
        CLOSEUP:Object.freeze(['MOUTH_EYE_STRUCTURE','SKIN_FUR_SHELL_BREAKUP','SCARS_DAMAGE','ROUGHNESS_VARIATION']),
        CONTACT:Object.freeze(['FOOT_CLAW_GROUND','MOUTH_HIT_REGION','LIMB_ROOT_DEFORMATION','TAIL_WING_APPENDAGE_BASE'])
      }),
      authoredOutputs:Object.freeze(['EDITABLE_DCC_SOURCE','SPECIES_GAME_MESH','UV_OR_ATLAS','SPECIES_MATERIAL_SET','BODY_PLAN_RIG','ATTACK_CONTACT_MAP','PLATFORM_VARIANTS'])
    }),
    BUILDING:Object.freeze({
      construction:Object.freeze(['FOOTPRINT_AND_MASSING','FOUNDATION_AND_STRUCTURE','WALL_OPENINGS','DOOR_WINDOW_FRAMES','UPPER_FLOOR_AND_ROOF','INTERIOR_SHELL','FUNCTIONAL_FIXTURES','SURFACE_HISTORY','MODULAR_PLATFORM_VARIANTS']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['MASSING','ROOFLINE','ENTRANCE_READABILITY','LANDMARK_SHAPE']),
        MID_RANGE:Object.freeze(['FACADE_BAYS','WINDOW_DOOR_DEPTH','SUPPORTS_BALCONIES','MATERIAL_BLOCKS']),
        CLOSEUP:Object.freeze(['JOINTS_TRIM_GUTTERS','HINGES_HANDLES','SEAMS_CRACKS','DRAINAGE_STAINS','REPAIR_PATCHES']),
        CONTACT:Object.freeze(['DOORWAY_CLEARANCE','STAIR_TREADS','HANDLES_SWITCHES','INTERACTION_PROP_ANCHORS','WALL_FLOOR_CONTACT'])
      }),
      authoredOutputs:Object.freeze(['EDITABLE_MODULAR_SOURCE','STRUCTURAL_MODULES','INTERIOR_MODULES','MATERIAL_SET','COLLISION_NAV_PROXY','PLATFORM_VARIANTS'])
    }),
    ENVIRONMENT:Object.freeze({
      construction:Object.freeze(['MACRO_TERRAIN','DRAINAGE_AND_WATER','ROUTE_SHOULDERS','VEGETATION_SPECIES_CLUSTERS','ROCK_SOIL_STRATA','LANDMARKS','SET_DRESSING','AMBIENT_MOTION']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['BIOME_SHAPE_LANGUAGE','LANDMARK_HIERARCHY','ROUTE_READABILITY','MAJOR_COLOR_VALUE_GROUPS']),
        MID_RANGE:Object.freeze(['VEGETATION_CLUSTERS','ROCK_SOIL_BREAKUP','BANKS_CLIFFS','DISTRICT_BOUNDARIES']),
        CLOSEUP:Object.freeze(['ROOT_SOIL_CONTACT','EROSION_RUNOFF','LEAF_BRANCH_VARIATION','SURFACE_DEBRIS','PATH_WEAR']),
        CONTACT:Object.freeze(['FOOTING_CLEARANCE','RESOURCE_INTERACTION_SPACE','GROUND_CONTACT','WATER_EDGE','OBJECT_PLACEMENT_ANCHORS'])
      }),
      authoredOutputs:Object.freeze(['EDITABLE_WORLD_SOURCE','TERRAIN_DATA','ENVIRONMENT_KITS','BIOME_MATERIAL_SET','PLACEMENT_RULES','LOD_VARIANTS'])
    }),
    WEAPON:Object.freeze({
      construction:Object.freeze(['PRIMARY_PROFILE','GRIP_AND_HAND_CLEARANCE','FUNCTIONAL_PART_BREAKDOWN','EDGE_AND_TIP_STRUCTURE','MATERIAL_REGION_SPLIT','SOCKET_PIVOT','WEAR_AND_DAMAGE','MOTION_CONTACT_PREP']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['WEAPON_PROFILE','LENGTH_MASS','SIGNATURE_COLOR']),
        MID_RANGE:Object.freeze(['GRIP_GUARD_HEAD_OR_BLADE','PART_LAYERING','MATERIAL_REGIONS']),
        CLOSEUP:Object.freeze(['WRAP_FASTENERS','EDGE_BEVELS','SCRATCHES','ENGRAVING_OR_STYLE_DETAIL']),
        CONTACT:Object.freeze(['HAND_GRIP','IMPACT_EDGE_OR_HEAD','HOLSTER_SOCKET','TWO_HAND_SECONDARY_GRIP'])
      }),
      authoredOutputs:Object.freeze(['EDITABLE_DCC_SOURCE','GAME_MESH','MATERIAL_SET','GRIP_SOCKET_MAP','IMPACT_CONTACT_MAP','PLATFORM_VARIANTS'])
    }),
    PROP:Object.freeze({
      construction:Object.freeze(['FUNCTIONAL_MASS','ASSEMBLY_PARTS','SUPPORT_AND_CONTACT','MATERIAL_REGIONS','FASTENERS','USE_WEAR','INTERACTION_PIVOT','LOD_VARIANTS']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['FUNCTION_SILHOUETTE','CATEGORY_READABILITY']),
        MID_RANGE:Object.freeze(['ASSEMBLY_BREAKDOWN','HANDLE_LID_SUPPORT','MATERIAL_BLOCKS']),
        CLOSEUP:Object.freeze(['HINGES_BOLTS_SEAMS','EDGE_WEAR','DIRT_CONTACT','LABEL_OR_SYMBOL']),
        CONTACT:Object.freeze(['GRAB_POINT','OPEN_CLOSE_PIVOT','GROUND_WALL_CONTACT','INTERACTION_CLEARANCE'])
      }),
      authoredOutputs:Object.freeze(['EDITABLE_DCC_SOURCE','GAME_MESH','MATERIAL_SET','INTERACTION_SOCKET_MAP','COLLISION_PROXY','LOD_VARIANTS'])
    }),
    UI:Object.freeze({
      construction:Object.freeze(['INFORMATION_HIERARCHY','SHAPE_LANGUAGE','COMPONENT_FRAMES','ICON_AUTHORING','TYPOGRAPHY_SPACING','STATE_VARIANTS','TOUCH_FEEDBACK','PLATFORM_LAYOUT_VARIANTS']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['HUD_PRIORITY','ICON_SILHOUETTE','VALUE_READABILITY','SAFE_AREA']),
        MID_RANGE:Object.freeze(['PANEL_GROUPING','BUTTON_HIERARCHY','MINIMAP_FRAME','INTERACTION_PROMPT']),
        CLOSEUP:Object.freeze(['BORDER_EDGE_MATERIAL','STATE_HIGHLIGHT','ICON_INTERNAL_SHAPE','TEXTURE_OR_WEAR']),
        CONTACT:Object.freeze(['TOUCH_TARGET','PRESSED_STATE','FOCUSED_SELECTED','DISABLED_STATE','DRAG_OR_HOLD_FEEDBACK'])
      }),
      authoredOutputs:Object.freeze(['COMPONENT_SOURCE','ICON_SET','STATE_SPRITES_OR_VECTORS','TYPOGRAPHY_TOKENS','LAYOUT_BINDINGS','PLATFORM_VARIANTS'])
    }),
    MATERIAL:Object.freeze({
      construction:Object.freeze(['MATERIAL_IDENTITY','BASE_COLOR_OR_VALUE','ROUGHNESS_SPECULAR','NORMAL_OR_STYLIZED_FORM','EDGE_RESPONSE','WEAR_MASKS','DIRT_WETNESS','PLATFORM_SHADER_VARIANTS']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['VALUE_GROUP','MATERIAL_CATEGORY']),
        MID_RANGE:Object.freeze(['ROUGHNESS_BREAKUP','LARGE_SURFACE_VARIATION']),
        CLOSEUP:Object.freeze(['MICRO_NORMAL','GRAIN_WEAVE_PORES','EDGE_WEAR','SCRATCH_PATCH']),
        CONTACT:Object.freeze(['CONTACT_DIRT','POLISH_BY_USE','WETNESS_OR_MUD','SEAM_ACCUMULATION'])
      }),
      authoredOutputs:Object.freeze(['EDITABLE_MATERIAL_SOURCE','TEXTURE_OR_PARAMETER_SET','MASK_SET','PLATFORM_SHADER_BINDINGS'])
    }),
    AUDIO:Object.freeze({
      construction:Object.freeze(['EVENT_ROLE','SOURCE_OR_SYNTHESIS','TIMBRE_IDENTITY','TRANSIENT_BODY_TAIL','VARIATION_SET','SPATIAL_RESPONSE','MIX_PRIORITY','MOBILE_CODEC_VARIANT']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['EVENT_READABILITY','ROLE_SEPARATION','MIX_PRIORITY']),
        MID_RANGE:Object.freeze(['SPATIAL_FALLOFF','OCCLUSION_OR_FILTERING','VARIATION']),
        CLOSEUP:Object.freeze(['TRANSIENT_BODY_TAIL','TIMBRE_DETAIL','LAYER_BALANCE']),
        CONTACT:Object.freeze(['IMPACT_SYNC','SURFACE_RESPONSE','WEAPON_OR_BODY_CONTACT_MATCH'])
      }),
      authoredOutputs:Object.freeze(['EDITABLE_AUDIO_SOURCE_OR_RECIPE','EVENT_VARIATION_SET','SPATIAL_BINDING','MIX_BINDING','MOBILE_VARIANT'])
    }),
    VFX:Object.freeze({
      construction:Object.freeze(['EVENT_ROLE','PRIMARY_SHAPE','SECONDARY_PARTICLES','TRAIL_OR_WAVE','IMPACT_BREAKUP','DISSIPATION','LIGHTING_RESPONSE','MOBILE_DENSITY_VARIANT']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['TELEGRAPH_READABILITY','PRIMARY_SHAPE','DANGER_OR_REWARD_ROLE']),
        MID_RANGE:Object.freeze(['PARTICLE_LAYERING','TRAIL_LENGTH','IMPACT_BREAKUP']),
        CLOSEUP:Object.freeze(['EDGE_DETAIL','MATERIAL_LIGHT_RESPONSE','DISSIPATION_DETAIL']),
        CONTACT:Object.freeze(['IMPACT_POINT_ALIGNMENT','HIT_EVENT_SYNC','SURFACE_INTERACTION'])
      }),
      authoredOutputs:Object.freeze(['EDITABLE_VFX_SOURCE','EVENT_BINDING','MOBILE_DENSITY_VARIANT','LOD_OR_DISTANCE_VARIANT'])
    }),
    SKILL:Object.freeze({
      construction:Object.freeze(['CAST_INTENT','TELEGRAPH','PROJECTILE_OR_AREA_FORM','IMPACT','REACTION','AUDIO_CUE','CAMERA_RESPONSE','RECOVERY_PRESENTATION']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['SKILL_ROLE_READABILITY','TELEGRAPH','IMPACT_IDENTITY']),
        MID_RANGE:Object.freeze(['PROJECTILE_OR_AREA_STRUCTURE','CAST_BODY_LANGUAGE','VFX_LAYERING']),
        CLOSEUP:Object.freeze(['HAND_OR_WEAPON_ORIGIN','MATERIAL_DETAIL','IMPACT_BREAKUP']),
        CONTACT:Object.freeze(['CAST_EVENT_SYNC','HIT_EVENT_SYNC','TARGET_REACTION_ALIGNMENT'])
      }),
      authoredOutputs:Object.freeze(['CAST_PRESENTATION','TELEGRAPH_PRESENTATION','PROJECTILE_OR_AREA_PRESENTATION','IMPACT_PRESENTATION','AUDIO_BINDING','CAMERA_BINDING'])
    }),
    MOTION:Object.freeze({
      construction:Object.freeze(['POSE_LANGUAGE','WEIGHT_TRANSFER','LOCOMOTION_OR_ACTION_ARC','CONTACT','FOLLOW_THROUGH','RECOVERY','BLEND_TRANSITIONS','MOTION_LOD']),
      detailByDistance:Object.freeze({
        GAME_CAMERA:Object.freeze(['POSE_READABILITY','TIMING_ARC','ACTION_ROLE']),
        MID_RANGE:Object.freeze(['WEIGHT_TRANSFER','LIMB_ARCS','SECONDARY_MOTION']),
        CLOSEUP:Object.freeze(['GAZE_HAND_FOOT_DETAIL','TORSO_COUNTER_MOTION','FACIAL_OR_APPENDAGE_ACTING']),
        CONTACT:Object.freeze(['FOOT_PLANT','HAND_WEAPON_CONTACT','IMPACT_ALIGNMENT','PAIR_ALIGNMENT_WHEN_USED'])
      }),
      authoredOutputs:Object.freeze(['EDITABLE_MOTION_SOURCE_OR_KEYPOSE_RECIPE','PLATFORM_RETARGET','CONTACT_MAP','BLEND_VARIANTS','MOTION_LOD'])
    })
  });
  const defaultProduction=Object.freeze({
    construction:Object.freeze(['PRIMARY_FORM','SECONDARY_CONSTRUCTION','TERTIARY_DETAIL','MATERIAL_IDENTITY','PLATFORM_BINDING']),
    detailByDistance:Object.freeze({
      GAME_CAMERA:Object.freeze(['SILHOUETTE_AND_FUNCTION']),
      MID_RANGE:Object.freeze(['STRUCTURE_AND_PARTS']),
      CLOSEUP:Object.freeze(['MATERIAL_AND_CONSTRUCTION_DETAIL']),
      CONTACT:Object.freeze(['CONTACT_AND_INTERACTION_DETAIL'])
    }),
    authoredOutputs:Object.freeze(['EDITABLE_SOURCE','NATIVE_DERIVATIVE','APPLICATION_BINDING'])
  });
  const items=recipes.map((recipe,index)=>{
    const family=upper(recipe.family),base=byId.get(text(recipe.baseAssetId));
    const capabilities=base?.customization||{};
    const controls=capabilities.controls||{};
    const issues=[],operations=[];
    if(!ASSET_CUSTOMIZATION_AXES[family])issues.push('UNSUPPORTED_VISUAL_FAMILY');
    if(!base)issues.push('BASE_ASSET_REQUIRED');
    const baseFamily=upper(base?.family||base?.category||base?.dna?.FAMILY);
    if(baseFamily&&baseFamily!==family)issues.push('BASE_FAMILY_MISMATCH');
    const revision=text(base?.sourceHash||base?.contentHash||base?.sha256);
    if(!revision)issues.push('SOURCE_HASH_REQUIRED');
    const locked=uniq(recipe.lockedParameters);
    const scoped=recipe.editableParameters!==undefined;
    const editable=uniq(Array.isArray(recipe.editableParameters)?recipe.editableParameters:[]);
    const previous=recipe.previousParameters||{};
    const parameters={...(scoped?previous:{}),...(recipe.parameters||{})};
    if(scoped){
      if(!Array.isArray(recipe.editableParameters)||!editable.length)issues.push('EDIT_SCOPE_REQUIRED');
      if(!recipe.previousParameters||!Object.keys(previous).length)issues.push('EDIT_BASELINE_REQUIRED');
      for(const key of editable)if(!Object.hasOwn(controls,key))issues.push('UNSUPPORTED_EDIT_SCOPE:'+key);
      for(const [key,value] of Object.entries(recipe.parameters||{}))if(!editable.includes(key)&&JSON.stringify(value)!==JSON.stringify(previous[key]))issues.push('OUTSIDE_EDIT_SCOPE:'+key);
    }
    for(const key of locked){
      if(!Object.hasOwn(recipe.previousParameters||{},key))issues.push('LOCKED_VALUE_MISSING:'+key);
      else parameters[key]=recipe.previousParameters[key];
    }
    if(!Object.keys(controls).length)issues.push('AUTHOR_CUSTOMIZATION_BINDINGS');
    for(const [key,value] of Object.entries(parameters)){
      const control=Object.hasOwn(controls,key)?controls[key]:null;
      if(!control||!ASSET_CUSTOMIZATION_AXES[family]?.includes(upper(control.axis))){issues.push('UNSUPPORTED_CONTROL:'+key);continue;}
      const kind=upper(control.kind),target=text(control.target);
      if(!['MORPH','BONE_PROPORTION','MATERIAL_SCALAR','COLOR','CHOICE','PART','MODULE','PRESENTATION_SCALAR'].includes(kind)||!target){issues.push('INVALID_BINDING:'+key);continue;}
      if(kind==='PART'||kind==='MODULE'){
        const part=byId.get(text(value));
        if(!Array.isArray(control.choices)||!control.choices.includes(value)||!part){issues.push('INCOMPATIBLE_PART:'+key);continue;}
        if(!(part.customization?.compatibleBaseIds||[]).includes(base.id)||!(part.customization?.sockets||[]).includes(target)){
          issues.push('PART_SOCKET_BINDING_REQUIRED:'+key);continue;
        }
        const partHash=text(part.sourceHash||part.contentHash||part.sha256);
        if(!partHash){issues.push('PART_SOURCE_HASH_REQUIRED:'+key);continue;}
        operations.push(Object.freeze({key,axis:upper(control.axis),kind,target,value,sourceHash:partHash}));
      }else if(kind==='COLOR'){
        if(!Array.isArray(value)||![3,4].includes(value.length)||value.some(channel=>typeof channel!=='number'||!Number.isFinite(channel)||channel<0||channel>1)){
          issues.push('COLOR_RANGE_INVALID:'+key);continue;
        }
        operations.push(Object.freeze({key,axis:upper(control.axis),kind,target,value:freezeList(value)}));
      }else if(kind==='CHOICE'){
        if(typeof value!=='string'||!Array.isArray(control.choices)||!control.choices.includes(value)){issues.push('UNSUPPORTED_CHOICE:'+key);continue;}
        operations.push(Object.freeze({key,axis:upper(control.axis),kind,target,value}));
      }else{
        if(typeof value!=='number'||!Number.isFinite(value)||!Number.isFinite(control.min)||!Number.isFinite(control.max)||control.min>control.max||value<control.min||value>control.max){
          issues.push('CONTROL_RANGE_INVALID:'+key);continue;
        }
        if(kind==='BONE_PROPORTION'&&capabilities.retargetRequired!==true){issues.push('RETARGET_BINDING_REQUIRED:'+key);continue;}
        operations.push(Object.freeze({key,axis:upper(control.axis),kind,target,value}));
      }
    }
    const production=familyProduction[family]||defaultProduction;
    const localRepairReady=Boolean(base&&revision&&issues.every(issue=>!['BASE_ASSET_REQUIRED','BASE_FAMILY_MISMATCH','SOURCE_HASH_REQUIRED'].includes(issue)));
    const repairScope=freezeList(scoped?editable:Object.keys(parameters));
    const application=upper(platform)==='ROBLOX'
      ?freezeList(['BUILD_OR_REBUILD_DERIVED_NATIVE_ASSET','IMPORT_TO_EXISTING_ROBLOX_GAME_ASSET_PATH','BIND_MESH_MATERIAL_RIG_ATTACHMENTS_OR_UI_TO_EXISTING_RESPONSIBILITY','PRESERVE_COLLISION_HITBOX_SAVE_AND_REMOTE_AUTHORITY','USE_MOBILE_LOD_AND_TEXTURE_BUDGET'])
      :upper(platform)==='UNITY'
        ?freezeList(['BUILD_OR_REBUILD_DERIVED_NATIVE_ASSET','IMPORT_TO_EXISTING_UNITY_PROJECT','BIND_MESH_RENDERER_SKINNED_MESH_ANIMATOR_MATERIAL_PREFAB_OR_UI_TO_EXISTING_RESPONSIBILITY','PRESERVE_COLLIDER_GAMEPLAY_SAVE_AND_NETCODE_AUTHORITY','USE_LOD_GROUP_AND_MOBILE_TEXTURE_MATERIAL_BUDGET'])
        :freezeList(['BUILD_DERIVED_ASSET','BIND_TO_EXISTING_RENDERER_AND_UI_RESPONSIBILITY','PRESERVE_GAMEPLAY_AND_SAVE_MEANING']);
    const chain=Object.freeze({
      sequence:freezeList(['INSPECT','DEFINE_REPAIR','AUTHOR','APPLY','REINSPECT']),
      automaticAdvance:true,
      noManualPromptRequiredBetweenStages:true,
      inspect:Object.freeze({sourceAssetId:text(recipe.baseAssetId)||null,sourceHash:revision||null,issues:freezeList(issues),actualMeshRigMaterialSocketInspectionRequired:true}),
      repair:Object.freeze({mode:localRepairReady?'LOCAL_REPAIR_OR_DETAIL_BUILD':'STRUCTURAL_AUTHORING_REQUIRED',editableParameters:repairScope,lockedParameters:freezeList(locked),identityAnchors:freezeList(recipe.identityAnchors||[]),preserveUnrelatedValues:true}),
      author:Object.freeze({construction:production.construction,detailByDistance:production.detailByDistance,outputs:production.authoredOutputs,editableSourceRequired:true,randomDetailScatterForbidden:true,causeBasedDetailRequired:true}),
      apply:Object.freeze({platform:upper(platform),steps:application,directExistingResponsibilityBinding:true,shadowBindingForbidden:true}),
      reinspect:Object.freeze({sameCameraLightingState:true,actualRuntimeObservationRequired:true,failedRegionOnlyReentersRepair:true,declarationOnlyCompletionForbidden:true}),
      stopOnlyWhen:Object.freeze(['MISSING_REQUIRED_AUTHORING_TOOL','RIGHTS_OR_LICENSE_BLOCK','CANONICAL_POLICY_BLOCK','RESPONSIBLE_SOURCE_UNAVAILABLE']),
      exactStageResumeAfterFailure:true
    });
    return Object.freeze({
      id:text(recipe.id)||`${family.toLowerCase()||'asset'}-${index+1}`,family,
      subfamily:upper(recipe.subfamily),
      baseAssetId:text(recipe.baseAssetId)||null,sourceHash:revision||null,
      status:issues.length?'AUTHORING_REQUIRED':'DECLARED_BINDINGS_READY',
      axes:ASSET_CUSTOMIZATION_AXES[family]||freezeList([]),
      parameters:Object.freeze(parameters),lockedParameters:freezeList(locked),
      editableParameters:scoped?freezeList(editable):null,
      changedParameters:freezeList(Object.keys(parameters).filter(key=>JSON.stringify(parameters[key])!==JSON.stringify(previous[key]))),
      editOperations:freezeList(issues.length?[]:operations.filter(operation=>JSON.stringify(operation.value)!==JSON.stringify(previous[operation.key]))),
      operations:freezeList(issues.length?[]:operations),issues:freezeList(issues),
      identityAnchors:freezeList(recipe.identityAnchors||[]),
      precisionProduction:production,
      productionChain:chain,
      authoringRequirements:freezeList(['INSPECT_ACTUAL_MESH_RIG_MORPHS_AND_SOCKETS','PRESERVE_SOURCE_AND_EDIT_DERIVATIVE','CONFORM_ADJACENT_PARTS_AND_CLOTHING','BUILD_GAME_CAMERA_TO_CONTACT_DETAIL_LAYERS','AUTHOR_CAUSAL_MATERIAL_WEAR_AND_CONSTRUCTION','RECHECK_CONTACT_CLIPPING_AND_GAMEPLAY_BOUNDS','BUILD_NATIVE_VARIANT_AND_BIND_EXISTING_RESPONSIBILITY']),
      runtimeVerified:false,sourceMutationPerformed:false
    });
  });
  return Object.freeze({
    version:2,status:'AUTHORING_PLAN_NOT_RUNTIME_PROOF',platform:upper(platform),
    families:freezeList(Object.keys(ASSET_CUSTOMIZATION_AXES)),axes:ASSET_CUSTOMIZATION_AXES,
    styleBible,items:freezeList(items),
    unresolvedCount:items.filter(row=>row.issues.length).length,
    automaticProductionChain:Object.freeze({
      sequence:freezeList(['INSPECT','DEFINE_REPAIR','AUTHOR','APPLY','REINSPECT']),
      automaticAdvance:true,
      reportOnlyInspectionForbidden:true,
      reportOnlyRepairPlanForbidden:true,
      authoringMustProduceEditableSourceAndNativeDerivative:true,
      applicationMustBindExistingGameResponsibility:true,
      applyReturnsToRuntimeInspection:true,
      failedRegionLoopsWithoutRebuildingUnaffectedScope:true,
      exactStageResumeAfterFailure:true,
      newPipeline:false
    }),
    workflow:freezeList(contract.workflow||['INSPECT_REUSE_AND_LICENSED_EXTERNAL_GLB','NORMALIZE_SCALE_RIG_MATERIALS_AND_SOCKETS','DEFINE_EXACT_REPAIR_SCOPE','AUTHOR_PRIMARY_SECONDARY_TERTIARY_AND_CONTACT_DETAIL','AUTHOR_MATERIAL_RIG_MOTION_OR_UI_STATES','BUILD_NATIVE_PLATFORM_VARIANT','APPLY_TO_EXISTING_GAME_RESPONSIBILITY','REINSPECT_SAME_RUNTIME_VIEW']),
    detailPasses:freezeList(['PRIMARY_SILHOUETTE','SECONDARY_ANATOMY_AND_CONSTRUCTION','TERTIARY_FUNCTIONAL_DETAIL','CONTACT_AND_INTERACTION_DETAIL','SEAMS_JOINTS_AND_CLOTHING_FIT','CAUSE_BASED_WEAR_GRIME_AND_DAMAGE','MATERIAL_LIGHT_RESPONSE','EXPRESSION_GAZE_FINGERS_AND_SECONDARY_MOTION']),
    detailResolutionLadder:Object.freeze({
      GAME_CAMERA:'SILHOUETTE_ROLE_AND_FUNCTION_FIRST',
      MID_RANGE:'STRUCTURE_PARTS_AND_SECONDARY_FORMS',
      CLOSEUP:'MATERIAL_CONSTRUCTION_AND_IDENTITY_DETAIL',
      CONTACT:'JOINT_GRIP_DOOR_HANDLE_FOOTING_AND_INTERACTION_DETAIL'
    }),
    causalDetailRules:freezeList(['DETAIL_FOLLOWS_FUNCTION','WEAR_FOLLOWS_CONTACT_AND_USE','DIRT_FOLLOWS_GROUND_WATER_AND_HAND_CONTACT','DAMAGE_FOLLOWS_IMPACT_EXPOSURE','FASTENERS_EXIST_WHERE_PARTS_JOIN','PROPS_EXIST_BECAUSE_DISTRICT_OR_ACTOR_USES_THEM','RANDOM_NOISE_IS_NOT_DETAIL']),
    externalSourceRequirements:freezeList(['SOURCE_URL_AND_CONTENT_HASH','LICENSE_EVIDENCE','COMMERCIAL_USE_AND_MODIFICATION_PERMISSION','SEPARATE_RESALE_REDISTRIBUTION_PERMISSION_WHEN_SELLING_ASSETS','TARGET_PLATFORM_IMPORT_AND_RUNTIME_CHECK']),
    minimumQuality:Object.freeze({...contract.minimumQuality}),
    uiAndIconReview:Object.freeze({
      scope:freezeList(['HUD','MENU','PANEL','BUTTON','ICON','INVENTORY','MAP','MINIMAP','INTERACTION','TOOLTIP','STATUS','CURSOR','TOUCH_CONTROL']),
      states:freezeList(['NORMAL','PRESSED','DISABLED','SELECTED','FOCUSED','HOVER_WHEN_SUPPORTED','HOLD_OR_PROGRESS_WHEN_USED']),
      iconPreviewPixels:freezeList([24,32,48,64]),
      authoringPasses:freezeList(['SEMANTIC_SILHOUETTE','PRIMARY_SHAPE','SECONDARY_SYMBOL_DETAIL','EDGE_MATERIAL_AND_DEPTH','STATE_VARIANTS','SMALL_SIZE_SIMPLIFICATION','LIGHT_DARK_BACKGROUND_VARIANTS']),
      minimapAuthoring:freezeList(['WORLD_TO_MAP_SYMBOL_LANGUAGE','PLAYER_ALLY_ENEMY_OBJECTIVE_PRIORITY','LANDMARK_AND_ROUTE_READABILITY','ZOOM_LEVEL_DETAIL_REDUCTION','EDGE_CLAMP_AND_OFFSCREEN_DIRECTION','TOUCH_SAFE_EXPAND_COLLAPSE_STATE']),
      interactionAuthoring:freezeList(['PROMPT_ICON','ACTION_LABEL','HOLD_PROGRESS','DISABLED_OR_BLOCKED_REASON','WORLD_ANCHOR_OR_SCREEN_EDGE_PLACEMENT','TOUCH_TARGET']),
      silhouetteAndMeaningBeforeMicrodetail:true,lightAndDarkBackgroundComparison:true,
      preserveHitTargetsNavigationAccessibilityAndSaveSemantics:true,
      styleTranslation:'MATCH_SHAPE_MATERIAL_EDGE_WEAR_AND_MOTION_LANGUAGE_WITH_SCREEN_SCALE_DETAIL',
      emojiOrGenericPlaceholderIsNotFinalAsset:true
    }),
    review:Object.freeze({
      captures:freezeList(['FACE_OR_SIGNATURE_CLOSEUP','FULL_OBJECT_TURNTABLE','ACTUAL_GAME_CAMERA','REPRESENTATIVE_ACTION_AND_TRANSITIONS']),
      sameCameraAndLighting:true,frameAddressedFindings:true,missingMeasurements:'UNVERIFIED',
      prototypeIsNotCompletion:true,elapsedTimeIsNotQualityEvidence:true
    }),
    effort:Object.freeze({
      quickAssemblyPercent:contract.detailedWorkBudget?.quickAssemblyPercent??15,
      detailAndMotionPercent:contract.detailedWorkBudget?.detailAndMotionPercent??65,
      comparisonAndRuntimeQaPercent:contract.detailedWorkBudget?.comparisonAndRuntimeQaPercent??20,
      representativeWorkPlanningMinutes:contract.detailedWorkBudget?.heroAssetOrRepresentativeMotionPlanningMinutes??null,
      planningOnly:true,elapsedTimeIsNotQualityEvidence:true
    }),
    sourceImmutable:true,gameplayAuthority:false,newPipeline:false,runtimeVerified:false
  });
}
// Unity와 Web이 교환하는 시각 설정. 엔진 객체나 게임 저장 데이터는 포함하지 않는다.
// 같은 문서를 각 엔진의 실제 연결점으로 변환하며, 저장/전송은 기존 작업·자산 저장소가 담당한다.
export function synchronizeAssetCustomization({document=null,currentDocument=null,baseRevision=0,gameId='',platform='WEB',assets=[],customization=null,styleBible={},motionStyle={},motionBindings=[]}={}){
  const issues=[],targetPlatform=upper(platform)==='UNITY_WEB'?'UNITY':upper(platform);
  const stable=value=>JSON.stringify(value,(_,entry)=>entry&&typeof entry==='object'&&!Array.isArray(entry)?Object.fromEntries(Object.keys(entry).sort().map(key=>[key,entry[key]])):entry);
  const id=text(gameId),importing=document!==null;
  const byId=new Map(assets.map(asset=>[text(asset.id),asset]));
  const modifierBounds={poseExaggeration:[.5,2],anticipationScale:[.5,2],overshootScale:[0,2],squashStretch:[0,1],secondaryMotion:[0,2],recoveryPresentation:[.5,2]};
  if(!['UNITY','WEB'].includes(targetPlatform))issues.push('UNSUPPORTED_SYNC_PLATFORM');
  if(!id)issues.push('GAME_ID_REQUIRED');
  if(!importing&&baseRevision!==(currentDocument?.revision??0))issues.push('BASE_REVISION_CONFLICT');
  const candidate=document||{
    schemaVersion:1,gameId:id,revision:baseRevision+1,baseRevision,
    styleBible,motionStyle:{profileKey:motionStyle.profileKey,modifiers:motionStyle.modifiers},
    recipes:(customization?.items||[]).map(item=>({
      id:item.id,family:item.family,subfamily:item.subfamily,baseAssetId:item.baseAssetId,sourceHash:item.sourceHash,
      parameters:Object.entries(item.parameters).map(([key,value])=>({key,value})),
      lockedParameters:[...item.lockedParameters],identityAnchors:[...item.identityAnchors]
    })),
    motionBindings
  };
  if(Object.keys(candidate).some(key=>!['schemaVersion','gameId','revision','baseRevision','styleBible','motionStyle','recipes','motionBindings'].includes(key)))issues.push('NON_VISUAL_DOCUMENT_FIELD');
  const bibleKeys=Object.keys(createStyleBible());
  const styleExpressionKeys=new Set(['version','sourceStyleFamily','preset','axes','conceptStyleLockWins','photoReferenceMaySuggestButNotOverrideConceptLock','gameplayAuthority','balanceAuthority','progressionAuthority','saveAuthority','networkAuthority']);
  const validStyleExpression=value=>{
    if(!value||typeof value!=='object'||Array.isArray(value))return false;
    if(Object.keys(value).some(key=>!styleExpressionKeys.has(key)))return false;
    if(value.version!==1||typeof value.sourceStyleFamily!=='string'||typeof value.preset!=='string')return false;
    if(!value.axes||typeof value.axes!=='object'||Array.isArray(value.axes))return false;
    for(const [axis,choice] of Object.entries(value.axes)){
      if(!INTERNAL_ASSET_STYLE_EXPRESSION_AXES[axis]?.includes(choice))return false;
    }
    return value.conceptStyleLockWins===true
      &&value.photoReferenceMaySuggestButNotOverrideConceptLock===true
      &&value.gameplayAuthority===false
      &&value.balanceAuthority===false
      &&value.progressionAuthority===false
      &&value.saveAuthority===false
      &&value.networkAuthority===false;
  };
  if(candidate.styleBible&&Object.entries(candidate.styleBible).some(([key,value])=>
    !bibleKeys.includes(key)||(key==='styleExpression'?!validStyleExpression(value):typeof value!=='string')
  ))issues.push('INVALID_STYLE_FIELD');
  if(candidate.motionStyle&&(Object.keys(candidate.motionStyle).some(key=>!['profileKey','modifiers'].includes(key))||Object.keys(candidate.motionStyle.modifiers||{}).some(key=>!Object.hasOwn(modifierBounds,key))))issues.push('NON_VISUAL_MOTION_FIELD');
  if(candidate.schemaVersion!==1)issues.push('UNSUPPORTED_SCHEMA_VERSION');
  if(candidate.gameId!==id||(currentDocument&&currentDocument.gameId!==id))issues.push('GAME_ID_MISMATCH');
  if(!Number.isSafeInteger(candidate.revision)||candidate.revision<1||!Number.isSafeInteger(candidate.baseRevision)||candidate.baseRevision<0||candidate.baseRevision!==candidate.revision-1)issues.push('INVALID_REVISION');
  if(currentDocument){
    if(candidate.revision<currentDocument.revision)issues.push('STALE_REVISION');
    else if(candidate.revision===currentDocument.revision&&stable(candidate)!==stable(currentDocument))issues.push('REVISION_CONTENT_CONFLICT');
    else if(candidate.revision>currentDocument.revision&&candidate.baseRevision!==currentDocument.revision)issues.push('BASE_REVISION_CONFLICT');
  }
  if(!candidate.styleBible||typeof candidate.styleBible.profileKey!=='string'||!candidate.styleBible.profileKey)issues.push('STYLE_BIBLE_REQUIRED');
  if(candidate.motionStyle?.profileKey!==candidate.styleBible?.profileKey)issues.push('STYLE_MOTION_PROFILE_MISMATCH');
  for(const [key,[min,max]] of Object.entries(modifierBounds)){
    const value=candidate.motionStyle?.modifiers?.[key];
    if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)issues.push('INVALID_MOTION_MODIFIER:'+key);
  }
  const recipeIds=new Set(),recipes=[];
  if(!Array.isArray(candidate.recipes))issues.push('RECIPES_REQUIRED');
  for(const row of Array.isArray(candidate.recipes)?candidate.recipes:[]){
    if(!row||!text(row.id)||recipeIds.has(row.id)){issues.push('INVALID_OR_DUPLICATE_RECIPE');continue;}
    recipeIds.add(row.id);
    const base=byId.get(row.baseAssetId),sourceHash=text(base?.sourceHash||base?.contentHash||base?.sha256);
    if(!sourceHash||sourceHash!==row.sourceHash)issues.push('SOURCE_HASH_MISMATCH:'+row.id);
    const values=Array.isArray(row.parameters)?row.parameters:[];
    if(!Array.isArray(row.parameters)||values.some(entry=>!entry||!text(entry.key))||new Set(values.map(entry=>entry?.key)).size!==values.length){issues.push('INVALID_PARAMETERS:'+row.id);continue;}
    const parameters=Object.fromEntries(values.map(entry=>[entry.key,entry.value]));
    if(!Array.isArray(row.lockedParameters)||!Array.isArray(row.identityAnchors)){issues.push('IDENTITY_LOCKS_REQUIRED:'+row.id);continue;}
    const previous=currentDocument?.recipes?.find(entry=>entry.id===row.id);
    for(const key of previous?.lockedParameters||[]){
      if(!row.lockedParameters.includes(key)||stable(parameters[key])!==stable(previous.parameters.find(entry=>entry.key===key)?.value))issues.push('LOCKED_VALUE_CONFLICT:'+row.id+':'+key);
    }
    if(previous&&(previous.baseAssetId!==row.baseAssetId||stable(previous.identityAnchors)!==stable(row.identityAnchors)))issues.push('IDENTITY_CONFLICT:'+row.id);
    recipes.push({...row,parameters,previousParameters:parameters});
  }
  // 한 플랫폼에서 잠긴 항목을 삭제한 문서도 조용히 다른 플랫폼에 적용하지 않는다.
  for(const row of currentDocument?.recipes||[])if(row.lockedParameters?.length&&!recipeIds.has(row.id))issues.push('LOCKED_RECIPE_REMOVED:'+row.id);
  const plan=createAssetCustomizationPlan({assets,recipes,styleBible:candidate.styleBible,platform:targetPlatform});
  const applications=[];
  for(const item of plan.items){
    issues.push(...item.issues.map(issue=>item.id+':'+issue));
    const asset=byId.get(item.baseAssetId),variant=asset?.platformVariants?.[targetPlatform];
    if(!variant?.path||!variant?.contentHash||variant?.derivedFromHash!==item.sourceHash){issues.push('PLATFORM_VARIANT_REQUIRED:'+item.id+':'+targetPlatform);continue;}
    const operations=[];
    for(const operation of item.operations){
      const binding=variant.bindings?.[operation.key];
      if(!binding?.target||binding.kind!==operation.kind){issues.push('PLATFORM_BINDING_REQUIRED:'+item.id+':'+operation.key);continue;}
      let value=operation.value;
      // 값을 임의 축척하지 않는다. 예: Web morph 0..1 / Unity blendshape 0..100은 선언된 scale로만 변환한다.
      if(typeof value==='number'){
        if(typeof binding.scale!=='number'||!Number.isFinite(binding.scale)||binding.scale===0){issues.push('PLATFORM_SCALE_REQUIRED:'+item.id+':'+operation.key);continue;}
        value*=binding.scale;
        if(!Number.isFinite(value)){issues.push('PLATFORM_VALUE_INVALID:'+item.id+':'+operation.key);continue;}
      }
      let part=null;
      if(['PART','MODULE'].includes(operation.kind)){
        part=byId.get(operation.value)?.platformVariants?.[targetPlatform];
        if(!part?.path||!part?.contentHash||part.derivedFromHash!==operation.sourceHash){issues.push('PLATFORM_PART_REQUIRED:'+item.id+':'+operation.key);continue;}
      }
      operations.push({...operation,target:binding.target,value,...(part?{partPath:part.path,partContentHash:part.contentHash}:{})});
    }
    applications.push({recipeId:item.id,assetId:item.baseAssetId,path:variant.path,contentHash:variant.contentHash,operations});
  }
  const motions=[],states=new Set();
  if(!Array.isArray(candidate.motionBindings))issues.push('MOTION_BINDINGS_REQUIRED');
  for(const motion of Array.isArray(candidate.motionBindings)?candidate.motionBindings:[]){
    if(motion&&Object.keys(motion).some(key=>!['state','assetId','sourceHash','clip','durationSeconds','events'].includes(key)))issues.push('NON_VISUAL_MOTION_BINDING_FIELD');
    if(Array.isArray(motion?.events)&&motion.events.some(event=>event&&Object.keys(event).some(key=>!['id','normalizedTime'].includes(key))))issues.push('NON_VISUAL_MOTION_EVENT_FIELD');
    if(!motion||!text(motion.state)||states.has(motion.state)||!text(motion.clip)||typeof motion.durationSeconds!=='number'||!Number.isFinite(motion.durationSeconds)||motion.durationSeconds<=0||!Array.isArray(motion.events)||motion.events.some(event=>!event||!text(event.id)||typeof event.normalizedTime!=='number'||!Number.isFinite(event.normalizedTime)||event.normalizedTime<0||event.normalizedTime>1)){
      issues.push('INVALID_MOTION_BINDING');continue;
    }
    states.add(motion.state);
    const asset=byId.get(motion.assetId),variant=asset?.platformVariants?.[targetPlatform],clip=variant?.clips?.[motion.clip];
    const sourceHash=text(asset?.sourceHash||asset?.contentHash||asset?.sha256);
    if(!sourceHash||sourceHash!==motion.sourceHash||variant?.derivedFromHash!==sourceHash||!variant?.path||!variant?.contentHash||!clip?.name){issues.push('MOTION_VARIANT_REQUIRED:'+motion.state);continue;}
    if(clip.durationSeconds!==motion.durationSeconds||stable(clip.events)!==stable(motion.events)){issues.push('MOTION_TIMING_MISMATCH:'+motion.state);continue;}
    motions.push({...motion,path:variant.path,contentHash:variant.contentHash,clip:clip.name});
  }
  const schemaConflict=issues.some(issue=>!/(?:PLATFORM_|MOTION_VARIANT_REQUIRED|MOTION_TIMING_MISMATCH)/.test(issue));
  return Object.freeze({
    version:1,status:issues.length?(schemaConflict?'SYNC_CONFLICT':'AUTHORING_REQUIRED'):'READY_FOR_PLATFORM_APPLICATION',
    platform:targetPlatform,issues:freezeList(issues),
    document:schemaConflict?null:JSON.parse(JSON.stringify(candidate)),
    customization:schemaConflict?null:plan,
    // 전체 문서가 유효할 때만 적용 목록을 전달한다. 부분 적용은 상태를 갈라놓는다.
    applications:freezeList(issues.length?[]:applications),motions:freezeList(issues.length?[]:motions),
    transport:'EXISTING_ASSET_REGISTRY_AND_WORK_ORDER',atomicApplicationRequired:true,
    gameplayAuthority:false,sourceMutationPerformed:false,runtimeVerified:false
  });
}

// 동일 조건 비교와 부위별 재작업 입력. 캡처 등록 자체는 시각 품질 PASS가 아니다.
export function createAssetDetailReviewPlan({customization={},styles=['CARTOON','REALISTIC','DARK_FANTASY'],platforms=['UNITY','WEB'],captureContract={},captures=[],findings=[]}={}){
  const styleKeys=uniq(styles.map(upper)),targetPlatforms=uniq(platforms.map(upper));
  const items=customization.items||[],byId=new Map(items.map(item=>[item.id,item]));
  const issues=[],validCaptures=[],repairs=[],rejectedFindings=[];
  const stable=value=>JSON.stringify(value,(_,entry)=>entry&&typeof entry==='object'&&!Array.isArray(entry)?Object.fromEntries(Object.keys(entry).sort().map(key=>[key,entry[key]])):entry);
  const same=(a,b)=>stable(a)===stable(b);
  const sampleTimes=captureContract.normalizedTimes;
  const contractReady=['cameraHash','lightingHash','actionId'].every(key=>text(captureContract[key]))
    &&Number.isSafeInteger(captureContract.seed)&&captureContract.seed>=0
    &&typeof captureContract.durationSeconds==='number'&&Number.isFinite(captureContract.durationSeconds)&&captureContract.durationSeconds>0
    &&Array.isArray(sampleTimes)&&sampleTimes.length>=3&&sampleTimes[0]===0&&sampleTimes.at(-1)===1
    &&sampleTimes.every((value,index)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1&&(index===0||value>sampleTimes[index-1]));
  if(!contractReady)issues.push('MATCHED_CAPTURE_CONTRACT_REQUIRED');
  if(!styleKeys.length||styleKeys.some(key=>!ASSET_STYLE_PROFILES[key]))issues.push('SUPPORTED_STYLE_PROFILES_REQUIRED');
  if(!targetPlatforms.length||targetPlatforms.some(key=>!['UNITY','WEB','ROBLOX'].includes(key)))issues.push('SUPPORTED_PLATFORMS_REQUIRED');
  if(!items.length)issues.push('CUSTOMIZATION_SUBJECT_REQUIRED');
  const seen=new Set();
  for(const capture of captures){
    const item=byId.get(capture?.recipeId),key=[capture?.recipeId,capture?.styleFamily,capture?.platform].join(':');
    const valid=contractReady&&item?.sourceHash&&capture.sourceHash===item.sourceHash
      &&same(capture.parameters,item.parameters)&&same(capture.identityAnchors,item.identityAnchors)
      &&styleKeys.includes(capture.styleFamily)&&targetPlatforms.includes(capture.platform)
      &&['cameraHash','lightingHash','actionId','seed','durationSeconds'].every(field=>capture[field]===captureContract[field])
      &&same(capture.normalizedTimes,sampleTimes)&&text(capture.artifactRef)&&text(capture.artifactHash)
      &&(item.family!=='UI'||same(capture.iconPreviewPixels,[24,32,48,64]));
    if(!valid||seen.has(key)){issues.push('CAPTURE_MISMATCH_OR_DUPLICATE:'+key);continue;}
    seen.add(key);validCaptures.push({...capture});
  }
  const missing=items.flatMap(item=>styleKeys.flatMap(style=>targetPlatforms.filter(platform=>!seen.has([item.id,style,platform].join(':'))).map(platform=>({recipeId:item.id,styleFamily:style,platform}))));
  const findingIds=new Set();
  for(const finding of findings){
    const item=byId.get(finding?.recipeId),reasons=[];
    if(!finding||!text(finding.id)||findingIds.has(finding.id)){rejectedFindings.push({id:finding?.id||null,reasons:['FINDING_ID_REQUIRED_OR_DUPLICATED']});continue;}
    findingIds.add(finding.id);
    const capture=validCaptures.find(row=>row.recipeId===finding.recipeId&&row.sourceHash===finding.sourceHash&&row.platform===finding.platform&&row.styleFamily===finding.styleFamily&&row.artifactHash===finding.artifactHash);
    if(!capture)reasons.push('CURRENT_MATCHED_CAPTURE_REQUIRED');
    if(!text(finding.region)||!text(finding.observed)||!text(finding.requestedChange))reasons.push('LOCALIZED_FINDING_REQUIRED');
    if(!['BLOCKER','HIGH','MEDIUM','LOW'].includes(finding.severity))reasons.push('SEVERITY_REQUIRED');
    const range=finding.normalizedTimeRange;
    if(!Array.isArray(range)||range.length!==2||range.some(value=>typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)||range[0]>range[1])reasons.push('FRAME_RANGE_REQUIRED');
    const keys=uniq(Array.isArray(finding.parameterKeys)?finding.parameterKeys:[]);
    if(!keys.length||keys.some(key=>!Object.hasOwn(item?.parameters||{},key)))reasons.push('EXISTING_PARAMETER_TARGET_REQUIRED');
    if(keys.some(key=>(item?.lockedParameters||[]).includes(key)))reasons.push('LOCKED_IDENTITY_TARGET');
    if(reasons.length){rejectedFindings.push({id:finding.id,reasons});continue;}
    repairs.push({findingId:finding.id,recipeId:item.id,baseAssetId:item.baseAssetId,sourceHash:item.sourceHash,
      severity:finding.severity,region:finding.region,normalizedTimeRange:[...range],
      observed:finding.observed,requestedChange:finding.requestedChange,
      evidence:{artifactRef:capture.artifactRef,artifactHash:capture.artifactHash,platform:capture.platform,styleFamily:capture.styleFamily},
      recipe:{id:item.id,family:item.family,subfamily:item.subfamily,baseAssetId:item.baseAssetId,previousParameters:{...item.parameters},parameters:{},editableParameters:keys,lockedParameters:[...item.lockedParameters],identityAnchors:[...item.identityAnchors]},
      applyNewValuesOnlyAfterAuthoring:true,closed:false,runtimeVerified:false});
  }
  const severity={BLOCKER:0,HIGH:1,MEDIUM:2,LOW:3};repairs.sort((a,b)=>severity[a.severity]-severity[b.severity]||a.findingId.localeCompare(b.findingId));
  return Object.freeze({
    version:1,status:issues.length||missing.length?'CAPTURES_REQUIRED':rejectedFindings.length?'REVIEW_EVIDENCE_REQUIRED':repairs.length?'LOCAL_REPAIR_REQUIRED':'CAPTURE_SET_READY_FOR_VISUAL_REVIEW',
    comparisonStyles:freezeList(styleKeys.filter(key=>ASSET_STYLE_PROFILES[key]).map(key=>({styleFamily:key,styleBible:createStyleBible({styleFamily:key}),motionModifiers:ASSET_STYLE_PROFILES[key].motion}))),
    captureContract:{...captureContract},subjects:freezeList(items.map(item=>({recipeId:item.id,baseAssetId:item.baseAssetId,sourceHash:item.sourceHash,parameters:item.parameters,lockedParameters:item.lockedParameters,identityAnchors:item.identityAnchors}))),
    issues:freezeList(issues),missingCaptures:freezeList(missing),acceptedCaptureCount:validCaptures.length,
    repairs:freezeList(repairs),rejectedFindings:freezeList(rejectedFindings),
    nextAction:repairs.length?'REPAIR_SPECIFIED_REGIONS_THEN_RECAPTURE_SAME_CONDITIONS':'CAPTURE_AND_REVIEW_SAME_CONDITIONS',
    protectedSemantics:freezeList(['GAMEPLAY_EVENTS','CLIP_DURATION','ROOT_AUTHORITY','MAP_CONNECTIVITY','UI_HIT_TARGETS','SAVE_MEANING']),
    captureMetadataIsNotQualityProof:true,sourceMutationPerformed:false,runtimeVerified:false
  });
}

export function createAssetRuntimeVisualReviewPlan({
  sourceRevision='',platforms=[],requiredSurfaces=[],requiredViews=['GAME_CAMERA'],captures=[],
  expectedSubjects=[],visualGoals=[],editableTargets=[],evidenceRoot='',evidenceProvenance=[]
}={}){
  const allowedPlatforms=new Set(['ROBLOX','UNITY','WEB']);
  const surfacePlatform=Object.freeze({
    ROBLOX_STUDIO:'ROBLOX',
    UNITY_EDITOR:'UNITY',
    UNITY_ANDROID_APK:'UNITY',
    WEB_BROWSER:'WEB'
  });
  const revision=text(sourceRevision),issues=[];
  const platformInput=Array.isArray(platforms)?platforms:[],surfaceInput=Array.isArray(requiredSurfaces)?requiredSurfaces:[],viewInput=Array.isArray(requiredViews)?requiredViews:[];
  if(!Array.isArray(platforms)||!Array.isArray(requiredSurfaces)||!Array.isArray(requiredViews))issues.push('RUNTIME_REVIEW_ARRAY_CONTRACT_REQUIRED');
  const targetPlatforms=uniq(platformInput.map(upper));
  if(!revision)issues.push('SOURCE_REVISION_REQUIRED');
  if(!targetPlatforms.length||targetPlatforms.some(platform=>!allowedPlatforms.has(platform)))issues.push('SUPPORTED_RUNTIME_REVIEW_PLATFORMS_REQUIRED');
  const defaultSurface={ROBLOX:'ROBLOX_STUDIO',UNITY:'UNITY_ANDROID_APK',WEB:'WEB_BROWSER'};
  const surfaces=uniq((surfaceInput.length?surfaceInput:targetPlatforms.map(platform=>defaultSurface[platform])).map(upper));
  if(!surfaces.length||surfaces.some(surface=>!surfacePlatform[surface]||!targetPlatforms.includes(surfacePlatform[surface])))issues.push('SUPPORTED_RUNTIME_REVIEW_SURFACES_REQUIRED');
  const views=uniq(viewInput.map(upper));
  if(!views.length)issues.push('RUNTIME_REVIEW_VIEWS_REQUIRED');

  const subjectIds=new Set(),subjects=[];
  for(const [index,row] of (Array.isArray(expectedSubjects)?expectedSubjects:[]).entries()){
    const source=typeof row==='string'?{id:row}:row||{},id=text(source.id||source.assetId||source.name);
    if(!id||subjectIds.has(id)){issues.push('EXPECTED_SUBJECT_ID_REQUIRED_OR_DUPLICATED:'+index);continue;}
    subjectIds.add(id);
    const mustBeVisibleIn=uniq((Array.isArray(source.mustBeVisibleIn)&&source.mustBeVisibleIn.length?source.mustBeVisibleIn:views).map(upper));
    if(mustBeVisibleIn.some(view=>!views.includes(view)))issues.push('EXPECTED_SUBJECT_VIEW_OUTSIDE_CONTRACT:'+id);
    subjects.push(Object.freeze({
      id,label:text(source.label||source.name||id),role:upper(source.role||'SCENE_OBJECT'),
      required:source.required!==false,mustBeVisibleIn:freezeList(mustBeVisibleIn),
      identityAnchors:freezeList(uniq(Array.isArray(source.identityAnchors)?source.identityAnchors:[]))
    }));
  }

  const captureIds=new Set(),normalizedCaptures=[];
  for(const [index,row] of (Array.isArray(captures)?captures:[]).entries()){
    const capture=row||{},platform=upper(capture.platform),surface=upper(capture.surface||defaultSurface[platform]),view=upper(capture.view||capture.cameraRole);
    const id=text(capture.id)||['capture',platform||'unknown',surface||'unknown',view||index+1].join('-').toLowerCase();
    const viewport=capture.viewport||{},captureIssues=[];
    if(captureIds.has(id))captureIssues.push('CAPTURE_ID_DUPLICATED');
    captureIds.add(id);
    if(!allowedPlatforms.has(platform)||!targetPlatforms.includes(platform))captureIssues.push('CAPTURE_PLATFORM_OUTSIDE_CONTRACT');
    if(!surfacePlatform[surface]||surfacePlatform[surface]!==platform||!surfaces.includes(surface))captureIssues.push('CAPTURE_SURFACE_OUTSIDE_CONTRACT');
    if(!view||!views.includes(view))captureIssues.push('CAPTURE_VIEW_OUTSIDE_CONTRACT');
    if(!text(capture.imageRef||capture.artifactRef))captureIssues.push('CAPTURE_IMAGE_REF_REQUIRED');
    if(text(capture.sourceRevision)!==revision)captureIssues.push('CAPTURE_SOURCE_REVISION_MISMATCH');
    if(!text(capture.sceneId))captureIssues.push('CAPTURE_SCENE_ID_REQUIRED');
    if(!Number.isSafeInteger(viewport.width)||viewport.width<=0||!Number.isSafeInteger(viewport.height)||viewport.height<=0)captureIssues.push('CAPTURE_VIEWPORT_REQUIRED');
    if(captureIssues.length)issues.push(...captureIssues.map(reason=>reason+':'+id));
    normalizedCaptures.push(Object.freeze({
      id,platform,surface,view,sceneId:text(capture.sceneId),
      imageRef:text(capture.imageRef||capture.artifactRef),artifactHash:text(capture.artifactHash),
      sourceRevision:text(capture.sourceRevision),captureSourceRevision:text(capture.captureSourceRevision||capture.sourceRevision),
      sourceCompatibility:text(capture.sourceCompatibility),producer:Object.freeze({...capture.producer}),
      viewport:Object.freeze({width:Number(viewport.width)||0,height:Number(viewport.height)||0}),
      ready:captureIssues.length===0
    }));
  }

  const missingCaptures=[];
  for(const surface of surfaces)for(const view of views){
    const platform=surfacePlatform[surface];
    if(!normalizedCaptures.some(capture=>capture.ready&&capture.platform===platform&&capture.surface===surface&&capture.view===view)){
      missingCaptures.push(Object.freeze({platform,surface,view}));
    }
  }
  if(!normalizedCaptures.length)issues.push('RUNTIME_CAPTURE_REQUIRED');
  return Object.freeze({
    version:1,enabled:true,
    status:issues.length||missingCaptures.length?'CAPTURES_REQUIRED':'READY_FOR_PIXEL_INSPECTION',
    sourceRevision:revision,platforms:freezeList(targetPlatforms),requiredSurfaces:freezeList(surfaces),requiredViews:freezeList(views),
    captures:freezeList(normalizedCaptures),expectedSubjects:freezeList(subjects),
    evidenceRoot:text(evidenceRoot)||null,evidenceProvenance:freezeList(Array.isArray(evidenceProvenance)?evidenceProvenance.map(row=>Object.freeze({...row})):[]),
    visualGoals:freezeList(uniq(Array.isArray(visualGoals)?visualGoals:[])),editableTargets:freezeList(uniq(Array.isArray(editableTargets)?editableTargets:[])),
    issues:freezeList(issues),missingCaptures:freezeList(missingCaptures),
    pixelInspectionRequired:true,pixelInspectionPerformed:false,
    protectedSemantics:freezeList(['GAMEPLAY_RULES','BALANCE','HITBOXES','DAMAGE','COOLDOWNS','PROGRESSION','ECONOMY','SAVE_MEANING','NETWORK_AUTHORITY']),
    nextAction:issues.length||missingCaptures.length?'CAPTURE_CURRENT_RUNTIME_SURFACES':'INSPECT_ACTUAL_PIXELS_AND_RETURN_LOCAL_REPAIRS',
    sourceMutationPerformed:false,runtimeVerified:false
  });
}

function normalizeConceptWeights(rows=[]){
  const cleanRows=(rows||[]).map((row,index)=>({
    family:upper(row.family||row.styleFamily||row.id||row.name),
    weight:Math.max(0,Number(row.weight??row.ratio??(index===0?1:0))||0)
  })).filter(row=>row.family);
  if(!cleanRows.length)cleanRows.push({family:'STYLIZED_FANTASY',weight:1});
  const total=cleanRows.reduce((sum,row)=>sum+row.weight,0)||cleanRows.length;
  return Object.freeze(cleanRows.map(row=>Object.freeze({family:row.family,weight:Number((row.weight/total).toFixed(4))})));
}

export function createConceptProfile({
  styles=[],styleFamily='',artTone=[],worldEra=[],combatFeel=[],presentation=[],customTags=[],styleExpressionOverrides={}
}={}){
  const source=styles.length?styles:[{family:styleFamily||'STYLIZED_FANTASY',weight:1}];
  const weightedStyles=normalizeConceptWeights(source);
  const dominantStyle=[...weightedStyles].sort((a,b)=>b.weight-a.weight||a.family.localeCompare(b.family))[0]?.family||'STYLIZED_FANTASY';
  return Object.freeze({
    weightedStyles,
    dominantStyle,
    axes:Object.freeze({
      ART_TONE:freezeList(uniq(artTone).map(upper)),
      WORLD_ERA:freezeList(uniq(worldEra).map(upper)),
      COMBAT_FEEL:freezeList(uniq(combatFeel).map(upper)),
      PRESENTATION:freezeList(uniq(presentation).map(upper))
    }),
    customTags:freezeList(uniq(customTags).map(upper)),
    styleExpression:resolveInternalAssetStyleExpressionProfile({styleFamily:dominantStyle,styles:weightedStyles,artTone,overrides:styleExpressionOverrides}),
    freeMixing:true,
    styleLockWins:true,
    gameplayAuthority:false
  });
}

export function evaluateConceptCompatibility({asset={},concept={}}={}){
  const dna=asset.dna||asset;
  const profile=concept.weightedStyles?concept:createConceptProfile(concept);
  const actual=upper(dna.STYLE_FAMILY||dna.styleFamily);
  const allowed=new Set(profile.weightedStyles.map(row=>row.family));
  const warnings=[];
  if(actual&&!allowed.has(actual))warnings.push('CONCEPT_STYLE_MISMATCH');
  const tags=(dna.COMPATIBILITY_TAGS||dna.compatibilityTags||[]).map(upper);
  for(const required of profile.customTags||[]){
    if(required&&actual&&required!==actual&&!tags.includes(required))warnings.push('CONCEPT_TAG_MISMATCH:'+required);
  }
  return Object.freeze({
    pass:warnings.length===0,
    dominantStyle:profile.dominantStyle,
    acceptedStyles:freezeList(profile.weightedStyles.map(row=>row.family)),
    warnings:Object.freeze(warnings),
    gameplayAuthority:false
  });
}

export function createGameVisualDNA({
  gameId='',concept={},styleBible={},worldDna={},biomeLanguage='',characterLanguage='',creatureLanguage='',
  buildingLanguage='',motionLanguage='',vfxLanguage='',audioLanguage='',uiLanguage='',narrativePresentationLanguage=''
}={}){
  const conceptProfile=concept.weightedStyles?concept:createConceptProfile(concept);
  const bible=createStyleBible({styleFamily:conceptProfile.dominantStyle,styles:conceptProfile.weightedStyles,artTone:conceptProfile.axes?.ART_TONE||[],styleExpressionOverrides:conceptProfile.styleExpression?.axes||{},...styleBible});
  const fingerprint=[
    text(gameId)||'GAME',
    conceptProfile.weightedStyles.map(row=>row.family+':'+row.weight).join(','),
    upper(worldDna?.BIOME||worldDna?.biome||worldDna?.fields?.BIOME),
    text(bible.shapeLanguage),text(bible.materialLanguage),text(bible.lightingLanguage),
    text(motionLanguage),text(vfxLanguage),text(audioLanguage),text(uiLanguage),text(narrativePresentationLanguage)
  ].join('|');
  return Object.freeze({
    gameId:text(gameId),
    fingerprint,
    concept:conceptProfile,
    styleBible:bible,
    worldDna:Object.freeze({...worldDna}),
    languages:Object.freeze({
      BIOME:text(biomeLanguage)||upper(worldDna?.BIOME||worldDna?.biome||worldDna?.fields?.BIOME),
      CHARACTER:text(characterLanguage)||text(bible.characterProportion),
      CREATURE:text(creatureLanguage)||text(bible.creatureLanguage),
      BUILDING:text(buildingLanguage)||text(bible.buildingLanguage),
      MOTION:text(motionLanguage)||text(bible.animationExaggeration),
      VFX:text(vfxLanguage)||text(bible.vfxShapeLanguage),
      AUDIO:text(audioLanguage)||'MATCH_CONCEPT_WORLD_AND_EVENT_ROLE',
      UI:text(uiLanguage)||text(bible.uiLanguage),
      NARRATIVE_PRESENTATION:text(narrativePresentationLanguage)||'MATCH_GAME_CONCEPT_AND_WORLD_STATE'
    }),
    gameStyleLockWins:true,
    gameplayAuthority:false
  });
}

function assetSourceTier(row={}){
  if(row.verified)return 5;
  if(/REPO_ASSET|REPOSITORY/.test(row.status))return 4;
  if(/LICENSE_VERIFIED_EXTERNAL/.test(row.status))return 3;
  if(row.prepared)return 1;
  return 2;
}

export function scoreStudioAssetCandidate({asset={},gameDna={},usage={},requirement={}}={}){
  const row=normalizeRegistryAsset(asset);
  const reuse=evaluateInternalAssetReuse({asset,gameDna,requirement,usage});
  const companyCommonBase=asset?.companyCommonBase===true||upper(asset?.reuseScope)==='COMPANY_ROBLOX_COMMON_BASE';
  const quality120=scoreStudioAssetQuality120({asset,evidence:usage.qualityEvidence||usage.quality120||{}});
  let score=assetSourceTier(row)*20;
  if(reuse.conceptCompatible)score+=25;
  if(reuse.platformCompatible)score+=15;
  if(companyCommonBase)score+=6;
  if(usage.runtimePass===true)score+=20;
  score+=Math.min(20,Math.max(0,Number(usage.gameConsumerCount)||0)*4);
  score+=Math.min(10,Math.max(0,Number(usage.usageCount)||0));
  if(usage.runtimeFailure===true||Number(usage.verifiedFailureCount)>0)score-=Math.min(60,20+Number(usage.verifiedFailureCount||0)*10);
  if(usage.identityFailure===true||usage.styleFailure===true||usage.navigationFailure===true)score-=25;
  if(usage.mobileBudgetFailure===true)score-=20;
  score+=Math.round(quality120.score/12);
  score+=Math.round(reuse.effectiveQuality/50);
  return Object.freeze({
    id:row.id,
    score:Math.round(score),
    sourceTier:assetSourceTier(row),
    verified:row.verified,
    conceptPass:reuse.conceptCompatible,
    platformCompatible:reuse.platformCompatible,
    quality120,
    internalAudit:reuse.internalAudit,
    internalAuditScore:reuse.baseQuality,
    effectiveInternalQuality:reuse.effectiveQuality,
    internalAuditGrade:internalAssetAuditGrade(reuse.baseQuality),
    internalAuditPass:reuse.internalAudit.pass===true,
    internalAuditStudioRequired:false,
    applicationMode:reuse.mode,
    directBindingReady:reuse.directBindingReady,
    adaptationReady:reuse.adaptationReady,
    adaptationAxes:reuse.adaptationAxes,
    companyCommonBase,
    commonBasePreferenceApplied:companyCommonBase,
    qualityScoreBlocksBinding:false,
    internalAuditScoreBlocksBinding:false,
    lowQualityMayBindWhenNoBetterSafeCompatibleAsset:true,
    lowInternalAuditScoreMayBind:true,
    higherCompatibleInternalAuditScorePreferred:true,
    rejected:Boolean(!reuse.usable||reuse.hardBlockers.length),
    hardBlockers:reuse.hardBlockers,
    reasons:Object.freeze([
      row.verified?'VERIFIED_RUNTIME_OR_COMPANY':'UNVERIFIED_OR_PREPARED',
      reuse.conceptCompatible?'CONCEPT_COMPATIBLE':'CONCEPT_ADAPTATION_ALLOWED',
      reuse.platformCompatible?'PLATFORM_COMPATIBLE':reuse.mode==='NATIVE_REAUTHOR_BASE'?'PLATFORM_REAUTHOR_BASE_ALLOWED':'PLATFORM_MISMATCH',
      companyCommonBase?'COMPANY_COMMON_BASE_REUSE_PREFERRED_WHEN_EQUIVALENT':'',
      reuse.baseQuality<INTERNAL_ASSET_AUDIT_PASS?'INTERNAL_QUALITY_DEBT_USE_ALLOWED_KEEP_IMPROVING':'INTERNAL_AUDIT_TARGET_REACHED',
      reuse.mode!=='USE_AS_IS'?'ADAPTATION_MODE:'+reuse.mode:'',
      usage.runtimeFailure===true?'VERIFIED_RUNTIME_FAILURE':''
    ].filter(Boolean))
  });
}

export function buildStudioAssetLoadout({requirements=[],assets=[],gameDna={},usageByAsset={},libraryVersion=0,librarySnapshotId='',expectedSnapshotId=''}={}){
  // 원자적 검색: 한 장부 스냅샷의 종류/파츠 색인만 사용하며 조회 도중 다른 버전을 합치지 않는다.
  assets=JSON.parse(JSON.stringify(assets||[]));
  const snapshotId=text(librarySnapshotId)||'inventory:'+stableAssetMaintenanceHash(JSON.stringify(assets));
  const snapshotMatches=!text(expectedSnapshotId)||text(expectedSnapshotId)===snapshotId;
  const byFamily=new Map(),byAtom=new Map();
  for(const asset of assets||[]){
    if(asset?.catalogActive===false||/(STALE|QUARANTIN|RETIRED|REJECTED)/.test(upper(asset?.catalogState)+' '+upper(asset?.status))||asset?.rightsPass===false)continue;
    const entry={asset,row:normalizeRegistryAsset(asset)},family=entry.row.family;
    if(!byFamily.has(family))byFamily.set(family,[]);
    byFamily.get(family).push(entry);
    for(const atom of uniq([asset.id,asset.atomId,asset.assetId].map(upper))){
      const key=family+'|'+atom;
      if(!byAtom.has(key))byAtom.set(key,[]);
      byAtom.get(key).push(entry);
    }
  }
  const selections=[];
  let candidateVisits=0;
  for(const requirement of requirements||[]){
    const family=upper(requirement.family),subfamily=upper(requirement.subfamily);
    const lockedAssetId=text(requirement.lockedAssetId||requirement.manualAssetId||requirement.gameLockedAssetId);
    const currentAssetId=text(requirement.currentAssetId);
    const atomId=upper(requirement.atomId);
    const familyCandidates=snapshotMatches?(atomId?byAtom.get(family+'|'+atomId)||[]:byFamily.get(family)||[]):[];
    candidateVisits+=familyCandidates.length;
    const currentAsset=currentAssetId?familyCandidates.find(({row})=>row.id===currentAssetId)?.asset||null:null;
    const choice=chooseInternalAssetReplacement({
      currentAsset,
      candidates:familyCandidates.map(row=>row.asset),
      gameDna,
      requirement:{...requirement,family,subfamily,lockedAssetId},
      usageByAsset
    });
    const picked=choice.selectedAssetId?familyCandidates.find(({row})=>row.id===choice.selectedAssetId)||null:null;
    const scored=picked?scoreStudioAssetCandidate({
      asset:picked.asset,gameDna,usage:usageByAsset[picked.row.id]||{},requirement:{...requirement,family,subfamily}
    }):null;
    selections.push(Object.freeze({
      requirementId:text(requirement.requirementId||requirement.id)||null,
      role:upper(requirement.role||requirement.systemRole)||null,
      family,subfamily,required:requirement.required!==false,
      assetId:picked?.row.id||null,
      atomId:text(picked?.asset.atomId||picked?.asset.assetId)||null,
      libraryVersion:Number(libraryVersion)||0,
      librarySnapshotId:snapshotId,
      sourceHash:text(picked?.asset.sourceHash||picked?.asset.sourceSha256||picked?.asset.contentHash)||null,
      sourceContentFingerprint:text(picked?.asset.sourceContentFingerprint)||null,
      sourceFilesPresent:picked?.asset.sourceFilesPresent??null,
      score:scored?.score??null,
      sourceTier:scored?.sourceTier??0,
      verified:picked?.row.verified===true,
      quality120:scored?.quality120?.score??null,
      qualityGrade:scored?.quality120?.grade??null,
      internalAuditScore:scored?.internalAuditScore??null,
      effectiveInternalQuality:scored?.effectiveInternalQuality??null,
      internalAuditGrade:scored?.internalAuditGrade??null,
      internalAuditPass:scored?.internalAuditPass===true,
      internalAuditStudioRequired:false,
      applicationMode:scored?.applicationMode||null,
      directBindingReady:scored?.directBindingReady===true,
      adaptationReady:scored?.adaptationReady===true,
      adaptationAxes:scored?.adaptationAxes||Object.freeze([]),
      lowQualityFallback:Boolean(picked&&Number(scored?.internalAuditScore||0)<INTERNAL_ASSET_AUDIT_PASS),
      qualityScoreBlocksBinding:false,
      internalAuditScoreBlocksBinding:false,
      lockedAssetId:lockedAssetId||null,
      lockedChoiceApplied:choice.replacementAction==='KEEP_LOCKED',
      currentAssetId:currentAssetId||null,
      currentEffectiveQuality:choice.currentEffectiveQuality,
      replacementRecommended:choice.replacementRecommended,
      replacementAction:choice.replacementAction,
      replacementReason:choice.replacementRecommended?'HIGHER_EFFECTIVE_INTERNAL_QUALITY_AFTER_ADAPTATION':null,
      effectiveGain:choice.effectiveGain,
      packId:picked?.row.packId||null,
      sourceFiles:picked?freezeList(picked.row.sourceFiles.length?picked.row.sourceFiles:[text(picked.asset.path)].filter(Boolean)):Object.freeze([]),
      machineTags:picked?.row.machineTags||Object.freeze([]),
      usageContract:picked?.row.usageContract||null,
      gameSpecificVariationFields:picked?.row.gameSpecificVariationFields||Object.freeze([]),
      companyCommonBase:picked?.row.companyCommonBase===true,
      consumerStageAccess:'ALL_EXISTING_FLOW_STAGES',
      composableAcrossExistingFlowStages:true,
      stageSpecificCombinationAllowed:true,
      flowOwnership:false,
      machineReadableDiscovery:true,
      unresolved:!picked
    }));
  }
  const complete=snapshotMatches&&selections.every(row=>!row.required||!row.unresolved);
  const bindingReady=complete&&selections.every(row=>!row.required||(row.sourceFiles.length>0&&row.sourceFilesPresent!==false));
  return Object.freeze({
    selections:Object.freeze(selections),
    unresolved:Object.freeze(selections.filter(row=>row.required&&row.unresolved)),
    complete,
    libraryVersion:Number(libraryVersion)||0,
    librarySnapshotId:snapshotId,
    snapshotMatches,
    atomicBindingReady:bindingReady,
    bindingBatch:freezeList(bindingReady?selections.filter(row=>!row.unresolved).map(row=>Object.freeze({
      assetId:row.assetId,atomId:row.atomId,packId:row.packId,sourceFiles:row.sourceFiles,sourceHash:row.sourceHash,
      sourceContentFingerprint:row.sourceContentFingerprint,
      libraryVersion:row.libraryVersion,librarySnapshotId:row.librarySnapshotId,applicationMode:row.applicationMode,
      usageContract:row.usageContract
    })):[]),
    bindingAction:!snapshotMatches?'RESELECT_CURRENT_LIBRARY_SNAPSHOT':bindingReady?'APPLY_THROUGH_EXISTING_SOURCE_WORKER':'RESOLVE_REQUIRED_ASSETS_BEFORE_BINDING',
    searchStats:Object.freeze({assetCount:assets.length,familyBucketCount:byFamily.size,atomBucketCount:byAtom.size,candidateVisits}),
    bindingBatchIsRuntimeProof:false,
    lowQualityFallbackCount:selections.filter(row=>row.lowQualityFallback).length,
    lowQualityBindingAllowed:true,
    lowQualityBindingAllowedWhenNoBetterSafeCompatibleAsset:true,
    internalAuditScoreIsNotBindingGate:true,
    qualityScoreIsNotBindingGate:true,
    adaptationBeforeRejectionPreferred:true,
    higherCompatibleInternalAuditScoreAutoPreferred:true,
    automaticReplacementUsesEffectiveQuality:true,
    automaticReplacementStudioRequired:false,
    automaticReplacementNativeRuntimeRequired:false,
    manualOrLockedChoiceWins:true,
    priorAssetHistoryPreserved:true,
    noEmptySlotDuringReplacement:true,
    consumerStageAccess:'ALL_EXISTING_FLOW_STAGES',
    allSelectedAssetsComposableAcrossExistingFlowStages:true,
    stageSpecificCombinationAllowed:true,
    crossFamilyCompositionAllowed:true,
    flowOwnership:false,
    flowMutationAllowed:false,
    machineReadableDiscovery:true,
    selectionContractVersion:4,
    newPipelineCreated:false,
    gameplayAuthority:false
  });
}

export function buildFutureAssetDemandForecast({gameDemands=[],coverageReport={}}={}){
  const demand=new Map();
  for(const game of gameDemands||[]){
    const weight=Math.max(1,Number(game.priorityWeight)||1);
    for(const req of game.requirements||[]){
      const key=upper(req.family)+':'+upper(req.subfamily);
      if(key===':')continue;
      demand.set(key,(demand.get(key)||0)+weight*Math.max(1,Number(req.count)||1));
    }
  }
  const rows=(coverageReport.rows||[]).map(row=>{
    const key=row.family+':'+row.subfamily;
    const futureDemand=demand.get(key)||0;
    const forecastScore=futureDemand*20+Math.max(0,Number(row.missingSlots)||0)*8+(Number(row.coveragePercent)<50?15:0);
    return Object.freeze({...row,futureDemand,forecastScore});
  }).filter(row=>row.futureDemand>0||row.missingSlots>0)
    .sort((a,b)=>b.forecastScore-a.forecastScore||b.futureDemand-a.futureDemand||a.family.localeCompare(b.family));
  return Object.freeze({
    rows:Object.freeze(rows),
    highestPriority:rows[0]||null,
    preparationOnly:true,
    maySelfPromoteVerified:false
  });
}

export function createCreatureSpeciesBlueprint({
  id='',bodyPlan='',species='',concept={},silhouette='',locomotion='',attackLanguage='',signatureSkill='',audioIdentity='',hitDeathIdentity='',platform=''
}={}){
  const profile=createConceptProfile(concept);
  const missing=[];
  for(const [key,value] of Object.entries({BODY_PLAN:bodyPlan,SPECIES:species,SILHOUETTE:silhouette,LOCOMOTION:locomotion,ATTACK_LANGUAGE:attackLanguage,SIGNATURE_SKILL:signatureSkill,AUDIO_IDENTITY:audioIdentity,HIT_DEATH_IDENTITY:hitDeathIdentity}))if(!text(value))missing.push(key);
  return Object.freeze({
    id:text(id)||[upper(species||'CREATURE'),upper(bodyPlan||'BODY'),profile.dominantStyle].join('_'),
    bodyPlan:upper(bodyPlan),species:upper(species),concept:profile,
    identity:Object.freeze({
      silhouette:text(silhouette),locomotion:text(locomotion),attackLanguage:text(attackLanguage),
      signatureSkill:text(signatureSkill),audioIdentity:text(audioIdentity),hitDeathIdentity:text(hitDeathIdentity)
    }),
    platform:upper(platform),complete:missing.length===0,missing:Object.freeze(missing),
    masterGlbRequired:true,masterAssetFormat:'GLB_2_0',masterGlbContractVersion:CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.version,
    primitiveFallbackPrototypeOnly:true,colorOnlySpeciesVariantAllowed:false,gameplayStatsAuthority:false
  });
}

export function createPlatformAssetVariantPlan({
  platform='UNITY',deviceClass='MOBILE',styleIdentity='',sourceAssetId='',lod='AUTO',meshDensity='AUTO',materialComplexity='AUTO',
  textureBudget='AUTO',particleBudget='AUTO',audioVariantBudget='AUTO',motionLod='AUTO',lightingComplexity='AUTO'
}={}){
  const p=upper(platform),mobile=/MOBILE/.test(upper(deviceClass));
  return Object.freeze({
    sourceAssetId:text(sourceAssetId),platform:p,deviceClass:upper(deviceClass),styleIdentity:text(styleIdentity),
    adaptation:Object.freeze({
      LOD:upper(lod),MESH_DENSITY:upper(meshDensity),MATERIAL_COMPLEXITY:upper(materialComplexity),
      TEXTURE_BUDGET:upper(textureBudget),PARTICLE_BUDGET:upper(particleBudget),AUDIO_VARIANT_BUDGET:upper(audioVariantBudget),
      MOTION_LOD:upper(motionLod),LIGHTING_COMPLEXITY:upper(lightingComplexity)
    }),
    mobileBudgetRequired:mobile,
    preserve:Object.freeze(['GAMEPLAY_SPEED','HITBOX_SEMANTICS','DAMAGE','COOLDOWN','SAVE_MEANING','PROGRESSION','NETWORK_AUTHORITY','STYLE_IDENTITY']),
    runtimeVerificationRequired:true
  });
}

export function createStudioTestbedPlan({assetIds=[],platform='UNITY',mobile=true}={}){
  const scenarios=['DEFAULT_LIGHT','LOW_LIGHT','COMBAT_CLOSE','COMBAT_CROWD','RAIN_OR_WEATHER','MOBILE_LOW_BUDGET','LOD_DISTANCE','NAVIGATION_AND_COLLISION','MOTION_CONTACT','UI_READABILITY'];
  return Object.freeze({
    assetIds:freezeList(uniq(assetIds)),platform:upper(platform),mobile:Boolean(mobile),scenarios:Object.freeze(scenarios),
    checks:Object.freeze(['STYLE_IDENTITY','SILHOUETTE_READABILITY','MOTION_CONTACT','NAVIGATION_COLLISION','LOD_POP','MOBILE_FRAME_COST','VFX_READABILITY','AUDIO_REPETITION','UI_READABILITY']),
    testbedPassMayPromoteCompanyAsset:false,
    actualGameRuntimeStillRequired:true
  });
}

export function evaluateCompanyAssetPromotion({asset={},consumer={},runtimeEvidence={}}={}){
  const id=text(asset?.id),family=upper(asset?.family||asset?.category),platform=upper(runtimeEvidence?.platform||consumer?.platform||asset?.platformVariant||asset?.platform);
  const license=text(asset?.license);
  const sourceHash=text(asset?.sourceHash||asset?.sourceSha256||asset?.contentHash||asset?.sha256);
  const artifactHash=text(asset?.artifactHash||asset?.derivedSha256||asset?.contentHash||asset?.sha256);
  const artifactPath=text(asset?.path||runtimeEvidence?.artifactPath);
  const masterGlbRequired=['CHARACTER','CREATURE'].includes(family);
  const masterGlb=text(asset?.masterGlb||asset?.meshArtifact||asset?.masterSourcePath);
  const masterGlbHash=text(asset?.masterGlbHash||asset?.masterSourceHash||asset?.masterGlbSha256);
  const masterGlbStaticQaPass=asset?.masterGlbStaticQaPass===true||runtimeEvidence?.masterGlbStaticQaPass===true;
  const consumerGameId=text(consumer?.gameId||runtimeEvidence?.gameId);
  const runtimeAssetId=text(runtimeEvidence?.assetId);
  const runtimeSourceHash=text(runtimeEvidence?.sourceHash);
  const runtimeArtifactHash=text(runtimeEvidence?.artifactHash);
  const blockers=[];
  if(!id)blockers.push('ASSET_ID_REQUIRED');
  if(!STUDIO_ASSET_FAMILIES.includes(family))blockers.push('SUPPORTED_ASSET_FAMILY_REQUIRED');
  if(!['ROBLOX','UNITY'].includes(platform))blockers.push('NATIVE_PLATFORM_REQUIRED');
  if(!license||/^unknown$/i.test(license)||/(?:CC-BY-NC|NONCOMMERCIAL|NO-COMMERCIAL|NC\b)/i.test(license))blockers.push('COMMERCIAL_MODIFIABLE_LICENSE_REQUIRED');
  if(!sourceHash)blockers.push('SOURCE_HASH_REQUIRED');
  if(!artifactPath)blockers.push('NATIVE_ARTIFACT_OR_SOURCE_PATH_REQUIRED');
  if(masterGlbRequired){
    if(!/\.glb$/i.test(masterGlb))blockers.push('CROSS_PLATFORM_MASTER_GLB_REQUIRED');
    if(!masterGlbHash)blockers.push('CROSS_PLATFORM_MASTER_GLB_HASH_REQUIRED');
    if(!masterGlbStaticQaPass)blockers.push('CROSS_PLATFORM_MASTER_GLB_STATIC_QA_REQUIRED');
  }
  if(!consumerGameId)blockers.push('RUNTIME_CONSUMER_GAME_REQUIRED');
  if(runtimeEvidence?.nativeBindingPass!==true)blockers.push('NATIVE_BINDING_PASS_REQUIRED');
  if(runtimeEvidence?.visualRuntimePass!==true)blockers.push('VISUAL_RUNTIME_PASS_REQUIRED');
  if(runtimeEvidence?.mobilePerformancePass!==true)blockers.push('MOBILE_PERFORMANCE_PASS_REQUIRED');
  if(runtimeEvidence?.regressionPass!==true)blockers.push('REGRESSION_PASS_REQUIRED');
  if(runtimeEvidence?.licenseProvenancePass!==true)blockers.push('LICENSE_PROVENANCE_PASS_REQUIRED');
  if(!runtimeAssetId)blockers.push('RUNTIME_ASSET_ID_REQUIRED');
  else if(runtimeAssetId!==id)blockers.push('RUNTIME_ASSET_ID_MISMATCH');
  if(!runtimeSourceHash&&!runtimeArtifactHash)blockers.push('RUNTIME_ASSET_HASH_REQUIRED');
  if(runtimeSourceHash&&runtimeSourceHash!==sourceHash)blockers.push('RUNTIME_SOURCE_HASH_MISMATCH');
  if(runtimeArtifactHash&&artifactHash&&runtimeArtifactHash!==artifactHash)blockers.push('RUNTIME_ARTIFACT_HASH_MISMATCH');
  const eligible=blockers.length===0;
  return Object.freeze({
    version:1,eligible,blockers:Object.freeze(blockers),assetId:id||null,family:family||null,platform:platform||null,consumerGameId:consumerGameId||null,
    promotion:eligible?Object.freeze({
      id,family,category:family,platform,status:'VERIFIED_COMPANY_ASSET',path:artifactPath,license,
      sourceHash,artifactHash:artifactHash||null,
      ...(masterGlbRequired?{masterGlb,masterGlbHash,masterGlbStaticQaPass:true,masterGlbContractVersion:CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.version}:{}),
      productionVerified:true,verifiedCompanyReusable:true,runtimeVerificationState:'VERIFIED_NATIVE_RUNTIME',
      artReviewState:'RUNTIME_VERIFIED',consumerGameIds:Object.freeze([consumerGameId]),
      promotionEvidence:Object.freeze({
        assetId:id,nativeBindingPass:true,visualRuntimePass:true,mobilePerformancePass:true,regressionPass:true,licenseProvenancePass:true,
        sourceHash,artifactHash:artifactHash||null,runtimeEvidenceId:text(runtimeEvidence?.id||runtimeEvidence?.runId)||null
      })
    }):null,
    preparedArtifactMayNotSelfPromote:true,
    runtimeConsumerRequired:true,
    gameplayAuthority:false
  });
}

export function promoteVerifiedCompanyAssetRegistry({registry={},asset={},consumer={},runtimeEvidence={}}={}){
  const decision=evaluateCompanyAssetPromotion({asset,consumer,runtimeEvidence});
  if(!decision.eligible)return Object.freeze({updated:false,decision,registry});
  const existing=Array.isArray(registry?.assets)?registry.assets:[];
  const nextAsset=decision.promotion;
  const at=existing.findIndex(row=>text(row?.id)===nextAsset.id);
  const assets=at>=0
    ?existing.map((row,index)=>index===at?{...row,...nextAsset,consumerGameIds:uniq([...(row.consumerGameIds||[]),...nextAsset.consumerGameIds])}:row)
    :[...existing,nextAsset];
  return Object.freeze({updated:true,decision,registry:{...registry,version:Math.max(1,Number(registry?.version||0)+1),assets}});
}

export function promoteVerifiedCompanyAssetsFromRuntimeEvidence({registry={},consumer={},runtimeEvidence={}}={}){
  const explicitIds=uniq([
    ...(Array.isArray(runtimeEvidence?.assetIds)?runtimeEvidence.assetIds:[]),
    ...(Array.isArray(runtimeEvidence?.assets)?runtimeEvidence.assets.map(row=>row?.assetId||row?.id):[])
  ]);
  if(!explicitIds.length)return Object.freeze({updated:false,promotedAssetIds:Object.freeze([]),decisions:Object.freeze([]),reason:'EXPLICIT_RUNTIME_ASSET_IDS_REQUIRED',registry});
  const assets=Array.isArray(registry?.assets)?registry.assets:[];
  const evidenceById=new Map((Array.isArray(runtimeEvidence?.assets)?runtimeEvidence.assets:[]).map(row=>[text(row?.assetId||row?.id),row]));
  let nextRegistry=registry;
  const promoted=[],decisions=[];
  for(const id of explicitIds){
    const descriptor=evidenceById.get(id)||{};
    const registered=assets.find(row=>text(row?.id)===id);
    const declaredGenerated=descriptor?.generatedByDeclaredRecipe===true&&descriptor?.persistedForCandidate===true;
    const asset=registered||(declaredGenerated?{
      id,
      family:upper(descriptor?.family),
      category:upper(descriptor?.family),
      platform:upper(runtimeEvidence?.platform||consumer?.platform),
      path:text(descriptor?.path),
      license:text(descriptor?.license),
      sourceHash:text(descriptor?.sourceHash),
      artifactHash:text(descriptor?.artifactHash),
      status:'PREPARED_DECLARED_GENERATED_ASSET',
      productionVerified:false,
      verifiedCompanyReusable:false,
      runtimeVerificationState:'PENDING_EXACT_NATIVE_RUNTIME'
    }:null);
    if(!asset){
      decisions.push(Object.freeze({assetId:id,eligible:false,blockers:Object.freeze(['ASSET_NOT_IN_REGISTRY_OR_DECLARED_GENERATED_DESCRIPTOR'])}));
      continue;
    }
    const perAsset={...runtimeEvidence,...descriptor,assetId:id,assetIds:undefined,assets:undefined};
    const result=promoteVerifiedCompanyAssetRegistry({registry:nextRegistry,asset,consumer,runtimeEvidence:perAsset});
    decisions.push(result.decision);
    if(result.updated){
      nextRegistry=result.registry;
      promoted.push(id);
    }
  }
  return Object.freeze({
    updated:promoted.length>0,
    promotedAssetIds:Object.freeze(promoted),
    decisions:Object.freeze(decisions),
    reason:promoted.length?'EXACT_RUNTIME_ASSET_PROMOTION_APPLIED':'NO_ELIGIBLE_EXACT_RUNTIME_ASSET',
    registry:nextRegistry
  });
}

export function summarizeVerifiedAssetUsage({events=[]}={}){
  const rows=new Map();
  for(const event of events||[]){
    const id=text(event.assetId);if(!id)continue;
    const row=rows.get(id)||{
      assetId:id,usageCount:0,gameIds:new Set(),runtimePassCount:0,runtimeFailureCount:0,failureReasons:new Set(),
      verifiedQualityScores:[],verifiedWeakAxes:new Set(),lastVerifiedQuality120:null
    };
    row.usageCount+=Math.max(1,Number(event.count)||1);
    if(event.gameId)row.gameIds.add(text(event.gameId));
    if(event.verifiedRuntimePass===true){
      row.runtimePassCount++;
      const qualityScore=Number(event.quality120?.score??event.qualityScore120);
      if(Number.isFinite(qualityScore)){
        const bounded=Math.max(0,Math.min(STUDIO_ASSET_QUALITY_MAX,qualityScore));
        row.verifiedQualityScores.push(bounded);
        row.lastVerifiedQuality120=bounded;
      }
      const weakAxis=upper(event.quality120?.weakestAxis?.axis||event.weakestQualityAxis);
      if(weakAxis)row.verifiedWeakAxes.add(weakAxis);
    }
    if(event.verifiedRuntimeFailure===true){
      row.runtimeFailureCount++;
      if(event.failureReason)row.failureReasons.add(upper(event.failureReason));
      const weakAxis=upper(event.quality120?.weakestAxis?.axis||event.weakestQualityAxis);
      if(weakAxis)row.verifiedWeakAxes.add(weakAxis);
    }
    rows.set(id,row);
  }
  return Object.freeze({
    rows:Object.freeze([...rows.values()].map(row=>Object.freeze({
      assetId:row.assetId,usageCount:row.usageCount,gameConsumerCount:row.gameIds.size,
      runtimePassCount:row.runtimePassCount,runtimeFailureCount:row.runtimeFailureCount,
      failureReasons:freezeList([...row.failureReasons]),
      verifiedQualitySampleCount:row.verifiedQualityScores.length,
      bestVerifiedQuality120:row.verifiedQualityScores.length?Math.max(...row.verifiedQualityScores):null,
      lastVerifiedQuality120:row.lastVerifiedQuality120,
      verifiedWeakAxes:freezeList([...row.verifiedWeakAxes]),
      positiveLearningEligible:row.runtimePassCount>0,
      qualityLearningEligible:row.runtimePassCount>0&&row.verifiedQualityScores.length>0,
      negativeLearningEligible:row.runtimeFailureCount>0
    }))),
    rawTelemetryDirectTrainingAllowed:false,
    unverifiedQualityScoresMayTeachPositiveLearning:false,
    existingCanonicalLearningChainOnly:true
  });
}

export function evaluateConceptCoherence({
  concept={},styleBible={},lockedStyle='',intentionalPairings=[]
}={}){
  const profile=concept.weightedStyles?concept:createConceptProfile(concept);
  const families=profile.weightedStyles.map(row=>row.family);
  const pairKey=(a,b)=>[upper(a),upper(b)].sort().join('|');
  const intentional=new Set((intentionalPairings||[]).map(row=>Array.isArray(row)?pairKey(row[0],row[1]):upper(row)));
  const tensions=[
    ['REALISTIC','PAPER_CRAFT'],['REALISTIC','VOXEL'],['REALISTIC','CARTOON'],
    ['PRIMITIVE','SPACE_OPERA'],['HISTORICAL_EAST_ASIAN','CYBERPUNK'],
    ['CUTE_CASUAL','COSMIC_HORROR'],['NOIR','CUTE_CASUAL']
  ];
  const warnings=[];
  for(const [a,b] of tensions){
    if(families.includes(a)&&families.includes(b)&&!intentional.has(pairKey(a,b)))warnings.push('INTENTIONAL_BLEND_CONFIRM:'+pairKey(a,b));
  }
  const eras=(profile.axes?.WORLD_ERA||[]).map(upper);
  if(eras.includes('PRIMITIVE')&&eras.includes('FUTURE')&&!intentional.has('PRIMITIVE|FUTURE'))warnings.push('WORLD_ERA_TENSION:PRIMITIVE|FUTURE');
  const hardFailures=[];
  const lock=upper(lockedStyle);
  if(lock&&!families.includes(lock))hardFailures.push('LOCKED_STYLE_NOT_IN_CONCEPT:'+lock);
  const bibleStyle=upper(styleBible.styleFamily);
  if(bibleStyle&&!families.includes(bibleStyle))hardFailures.push('STYLE_BIBLE_OUTSIDE_CONCEPT:'+bibleStyle);
  return Object.freeze({
    pass:hardFailures.length===0,
    reviewRequired:warnings.length>0,
    warnings:Object.freeze(warnings),
    hardFailures:Object.freeze(hardFailures),
    freeMixingPreserved:true,
    unusualBlendAutomaticFailure:false,
    intentionalPairingMayResolveWarning:true,
    gameplayAuthority:false
  });
}

export function evaluateStyleBible(asset={},bible={}){
  const dna=asset.dna||asset;
  const expected=upper(bible.styleFamily);
  const actual=upper(dna.STYLE_FAMILY||dna.styleFamily);
  const warnings=[];
  if(expected&&actual&&actual!==expected)warnings.push('STYLE_FAMILY_MISMATCH');
  if(!upper(dna.SILHOUETTE_CLASS||dna.silhouetteClass))warnings.push('SILHOUETTE_CLASS_MISSING');
  return Object.freeze({pass:warnings.length===0,warnings:Object.freeze(warnings),styleFamily:expected});
}

export function assetSemanticFingerprint(asset={}){
  const dna=asset.dna||asset;
  return [
    upper(dna.FAMILY||dna.family||dna.category),
    upper(dna.SUBFAMILY||dna.subfamily||dna.type),
    upper(dna.BODY_PLAN||dna.bodyPlan||dna.MODULE_TYPE||dna.moduleType),
    upper(dna.SILHOUETTE_CLASS||dna.silhouetteClass),
    upper(dna.FUNCTION_CLASS||dna.functionClass||dna.INTERACTION_ROLE||dna.interactionRole),
    upper(dna.MATERIAL_FAMILY||dna.materialFamily),
    upper(dna.STYLE_FAMILY||dna.styleFamily),
    upper(dna.PLATFORM_VARIANT||dna.platformVariant)
  ].join('|');
}

export function evaluateAssetIdentity({
  candidate={},
  reference={},
  differences={}
}={}){
  const meaningful={
    silhouette:Number(differences.silhouette||0),
    locomotion:Number(differences.locomotion||0),
    attackLanguage:Number(differences.attackLanguage||0),
    signatureSkill:Number(differences.signatureSkill||0),
    audioIdentity:Number(differences.audioIdentity||0),
    deathOrHit:Number(differences.deathOrHit||0),
    functionDifference:Number(differences.functionDifference||0),
    shapeDifference:Number(differences.shapeDifference||0),
    themeDifference:Number(differences.themeDifference||0),
    colorOnly:differences.colorOnly===true
  };
  const family=upper((candidate.dna||candidate).FAMILY||(candidate.dna||candidate).family);
  let score=0;
  if(family==='CREATURE'){
    score=meaningful.silhouette*25+meaningful.locomotion*15+meaningful.attackLanguage*20+meaningful.signatureSkill*15+meaningful.audioIdentity*10+meaningful.deathOrHit*15;
  }else if(['BUILDING','PROP'].includes(family)){
    score=meaningful.shapeDifference*45+meaningful.functionDifference*35+meaningful.themeDifference*20;
  }else{
    score=meaningful.silhouette*45+meaningful.functionDifference*35+meaningful.themeDifference*20;
  }
  if(meaningful.colorOnly)score=Math.min(score,20);
  const distinct=score>=55&&!meaningful.colorOnly;
  return Object.freeze({
    distinct,
    score:Math.round(clamp(score,0,100)),
    colorOnlyRejected:meaningful.colorOnly,
    candidateFingerprint:assetSemanticFingerprint(candidate),
    referenceFingerprint:assetSemanticFingerprint(reference)
  });
}

export function checkClothingLayerCompatibility({items=[],bodyPlan='',rigProfile='',styleFamily=''}={}){
  const normalized=(items||[]).map(item=>({...(item.dna||item),id:text(item.id||(item.dna||item).ASSET_ID)}));
  const conflicts=[];
  const slots=new Map();
  for(const item of normalized){
    const slot=upper(item.LAYER_SLOT||item.layerSlot);
    if(slot){
      if(slots.has(slot)&&!['ACCESSORY'].includes(slot))conflicts.push('DUPLICATE_LAYER_SLOT:'+slot);
      slots.set(slot,item.id);
    }
    if(bodyPlan&&item.BODY_PLAN&&upper(item.BODY_PLAN)!==upper(bodyPlan)&&!(item.COMPATIBILITY_TAGS||[]).includes(upper(bodyPlan)))conflicts.push('BODY_PLAN_MISMATCH:'+item.id);
    if(rigProfile&&item.RIG_PROFILE&&upper(item.RIG_PROFILE)!==upper(rigProfile)&&!(item.COMPATIBILITY_TAGS||[]).includes(upper(rigProfile)))conflicts.push('RIG_PROFILE_MISMATCH:'+item.id);
    if(styleFamily&&item.STYLE_FAMILY&&upper(item.STYLE_FAMILY)!==upper(styleFamily))conflicts.push('STYLE_MISMATCH:'+item.id);
    if(item.clippingRisk===true)conflicts.push('CLIPPING_RISK:'+item.id);
  }
  const cape=normalized.find(x=>upper(x.LAYER_SLOT)==='CAPE');
  const shoulder=normalized.find(x=>upper(x.LAYER_SLOT)==='SHOULDER');
  if(cape&&shoulder&&(cape.largeVolume===true||shoulder.largeVolume===true))conflicts.push('CAPE_SHOULDER_VOLUME_CONFLICT');
  return Object.freeze({
    pass:conflicts.length===0,
    conflicts:Object.freeze(conflicts),
    action:conflicts.length?'ALTERNATE_VARIANT_OR_BLOCK_COMBINATION':'ALLOW'
  });
}

const THEME_FORBIDDEN=Object.freeze({
  MEDIEVAL:Object.freeze(['SCI_FI','CYBERPUNK']),
  FANTASY:Object.freeze(['MODERN_TACTICAL','CYBERPUNK']),
  PEASANT:Object.freeze(['SCI_FI','ROYAL_CEREMONIAL']),
  SCI_FI:Object.freeze(['MEDIEVAL_PEASANT']),
  WUXIA:Object.freeze(['MODERN_TACTICAL'])
});

export function checkOutfitThemeGrammar({theme='',items=[]}={}){
  const t=upper(theme);
  const forbidden=THEME_FORBIDDEN[t]||[];
  const violations=(items||[]).filter(item=>{
    const tags=(item.themeTags||item.THEME_TAGS||[]).map(upper);
    return tags.some(tag=>forbidden.includes(tag));
  }).map(item=>text(item.id||item.ASSET_ID));
  return Object.freeze({pass:violations.length===0,theme:t,violations:Object.freeze(violations)});
}

export function validateBuildingGrammar({modules=[],navigation={}}={}){
  const types=(modules||[]).map(row=>upper(row.type||row.MODULE_TYPE));
  const failures=[];
  if(types.includes('DOOR')&&!types.includes('WALL'))failures.push('NO_FLOATING_DOOR');
  if(types.includes('WINDOW')&&!types.includes('WALL'))failures.push('WINDOW_MUST_BIND_WALL');
  if(types.includes('UPPER_FLOOR')&&!types.includes('STAIRS'))failures.push('STAIRS_CONNECT_FLOORS');
  if(types.includes('UPPER_FLOOR')&&!types.includes('ROOF'))failures.push('ROOF_REQUIRED');
  if(navigation.playerClear===false)failures.push('PLAYER_NAV_BLOCKED');
  if(navigation.npcClear===false)failures.push('NPC_NAV_BLOCKED');
  if(navigation.collisionValid===false)failures.push('COLLISION_INVALID');
  return Object.freeze({pass:failures.length===0,failures:Object.freeze(failures),blocksVerifiedPromotion:failures.length>0});
}

export function createBiomeDNA({
  biome='FOREST',ground=[],rock=[],tree=[],plant=[],cliff=[],water=[],fog=[],particle=[],sky=[],lighting=[],
  landmark=[],smallProp=[],ambience=[],creaturePreference=[],architecturePreference=[]
}={}){
  return Object.freeze({
    biome:upper(biome),
    channels:Object.freeze({
      GROUND:freezeList(ground),ROCK:freezeList(rock),TREE:freezeList(tree),PLANT:freezeList(plant),
      CLIFF:freezeList(cliff),WATER:freezeList(water),FOG:freezeList(fog),PARTICLE:freezeList(particle),
      SKY:freezeList(sky),LIGHTING:freezeList(lighting),LANDMARK:freezeList(landmark),SMALL_PROP:freezeList(smallProp),
      AMBIENCE:freezeList(ambience),CREATURE_PREFERENCE:freezeList(creaturePreference),
      ARCHITECTURE_PREFERENCE:freezeList(architecturePreference)
    })
  });
}

export function createPropDensityProfile({biome='FOREST',deviceClass='MOBILE',cameraDistance=20,navigationClearance=1,landmarkPriority=1}={}){
  const device=upper(deviceClass);
  const mobile=/MOBILE/.test(device);
  const distance=Math.max(1,Number(cameraDistance)||20);
  const scale=(mobile?0.7:1)*clamp(30/distance,0.5,1.25)*clamp(Number(navigationClearance)||1,0.5,1.2);
  return Object.freeze({
    biome:upper(biome),
    largeLandmarkDensity:clamp(0.025*Number(landmarkPriority||1),0.005,0.08),
    mediumObjectDensity:clamp(0.15*scale,0.05,0.35),
    smallPropDensity:clamp(0.4*scale,0.1,0.8),
    vegetationDensity:clamp(0.3*scale,0.08,0.75),
    vfxDensity:clamp(0.08*scale,0.02,0.18),
    mobileReductionApplied:mobile
  });
}

export function createSkillPresentationKit({id='',skillFamily='',castMotion='',vfx='',projectile='',impact='',audio='',camera='',reaction=''}={}){
  const components={CAST_MOTION:castMotion,VFX:vfx,PROJECTILE_OR_RANGE_PRESENTATION:projectile,IMPACT:impact,AUDIO:audio,CAMERA:camera,REACTION:reaction};
  const missing=Object.entries(components).filter(([,value])=>!text(value)).map(([key])=>key);
  return Object.freeze({
    id:text(id),
    skillFamily:upper(skillFamily),
    components:Object.freeze(components),
    missing:Object.freeze(missing),
    complete:missing.length===0,
    gameplayDamageCooldownAndTargetingAuthority:false
  });
}

export function createDamagePresentation({family='SLASH',reaction='',vfx='',audio='',cameraFeedback=''}={}){
  const missing=[];
  if(!reaction)missing.push('REACTION');
  if(!vfx)missing.push('VFX');
  if(!audio)missing.push('AUDIO');
  if(!cameraFeedback)missing.push('CAMERA_FEEDBACK');
  return Object.freeze({family:upper(family),reaction:text(reaction),vfx:text(vfx),audio:text(audio),cameraFeedback:text(cameraFeedback),complete:missing.length===0,missing:Object.freeze(missing),gameplayDamageAuthority:false});
}

export function createDestructionProfile({family='WOOD_BREAK',lod='SIMPLIFIED',fragments=0,vfx='',audio=''}={}){
  const mode=upper(lod);
  return Object.freeze({
    family:upper(family),lod:mode,fragments:Math.max(0,Math.floor(Number(fragments)||0)),vfx:text(vfx),audio:text(audio),
    mobileSafe:mode!=='FULL'||Number(fragments)<=24,
    gameplayCollisionAuthority:false
  });
}

export function createAssetCompatibilityGraph({nodes=[],edges=[]}={}){
  const safeNodes=(nodes||[]).map(node=>Object.freeze({id:text(node.id),family:upper(node.family),tags:freezeList(uniq(node.tags))})).filter(row=>row.id);
  const ids=new Set(safeNodes.map(row=>row.id));
  const safeEdges=[];
  const unresolved=[];
  for(const edge of edges||[]){
    const row=Object.freeze({from:text(edge.from),to:text(edge.to),type:upper(edge.type),required:edge.required!==false,verified:edge.verified===true});
    if(ids.has(row.from)&&ids.has(row.to))safeEdges.push(row); else if(row.required)unresolved.push(row);
  }
  return Object.freeze({nodes:Object.freeze(safeNodes),edges:Object.freeze(safeEdges),unresolved:Object.freeze(unresolved),valid:unresolved.length===0});
}

function normalizeRegistryAsset(asset={}){
  return {
    id:text(asset.id),
    family:upper(asset.family||asset.category),
    subfamily:upper(asset.subfamily||asset.type),
    status:upper(asset.status),
    verified:asset.verifiedCompanyReusable===true||upper(asset.status)==='VERIFIED_COMPANY_ASSET'||upper(asset.runtimeVerificationState)==='VERIFIED_RUNTIME',
    prepared:/PREPARED|RESEARCH|CANDIDATE/.test(upper(asset.status))||upper(asset.runtimeVerificationState)==='PREPARED_SEMANTIC',
    styleFamily:upper(asset.styleFamily),
    platform:upper(asset.platformVariant||asset.platform),
    bodyPlan:upper(asset.bodyPlan),
    species:upper(asset.species),
    tags:(asset.tags||asset.capabilities||asset.machineTags||[]).map(upper),
    machineTags:(asset.machineTags||asset.tags||asset.capabilities||[]).map(upper),
    packId:text(asset.packId),
    sourceFiles:Object.freeze([...(asset.sourceFiles||[])]),
    companyCommonBase:asset.companyCommonBase===true,
    usageContract:asset.usageContract||asset.bindingHint||asset.assemblyContract||asset.introContract||null,
    gameSpecificVariationFields:Object.freeze([...(asset.gameSpecificVariationFields||[])])
  };
}

function commonDepthDomainMatch(domain,asset={}){
  const family=upper(asset.family||asset.category);
  const packId=text(asset.packId);
  if(domain==='UI')return family==='UI';
  if(domain==='ITEM')return packId==='roblox-common-items-v1'||Boolean(asset.itemRole);
  if(domain==='WEAPON')return family==='WEAPON';
  if(domain==='CHARACTER_GEAR')return packId==='roblox-common-character-gear-v1'||Boolean(asset.gearRole);
  if(domain==='SKILL')return family==='SKILL';
  if(domain==='VFX')return family==='VFX';
  if(domain==='MOTION')return family==='MOTION';
  if(domain==='MATERIAL')return family==='MATERIAL';
  if(domain==='ENVIRONMENT')return family==='ENVIRONMENT';
  if(domain==='BUILDING')return family==='BUILDING';
  if(domain==='WORLD_PROP')return family==='PROP'&&!asset.itemRole&&packId!=='roblox-common-items-v1';
  if(domain==='CREATURE')return family==='CREATURE';
  if(domain==='AUDIO')return family==='AUDIO';
  if(domain==='FOLIAGE')return family==='FOLIAGE'||packId==='roblox-common-foliage-v1'||(family==='ENVIRONMENT'&&['GRASS','BUSH','FERN','FLOWER','STUMP','FALLEN_LOG','PINE_TREE','DEAD_TREE'].includes(upper(asset.subfamily)));
  if(domain==='PRESENTATION')return packId==='roblox-common-presentation-v1'||upper(asset.subfamily)==='PRESENTATION';
  return false;
}

function commonDepthTokens(assets=[]){
  const tokens=new Set();
  const add=value=>{
    const token=upper(value).replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    if(token)tokens.add(token);
  };
  const fields=['id','assetId','family','category','subfamily','type','itemRole','toolRole','gearRole','buildingRole','worldRole','role','systemRole','biomeId','familyRootId','atomId','packId','snapClass','stabilityRole','interactionRole','propKind'];
  const arrays=['tags','machineTags','capabilities','presentationRoles','systemRoles','motionStates','environmentRoles','biomes','loadingElements','introModes','inventoryCategories','uiSurfaces','terrainCompositions','backgroundLayers'];
  for(const asset of assets||[]){
    for(const field of fields)add(asset?.[field]);
    for(const field of arrays)for(const value of asset?.[field]||[])add(value);
    if(asset?.stackProfile)add('STACK_PROFILE');
    if(asset?.rarityBand)add('RARITY_BAND');
    if(asset?.sameAssetDnaAcrossWorldEquipDropAndUi===true){
      add('WORLD_MODEL');add('DROP_MODEL');add('VIEWPORT_ICON');add('EQUIPPED_VISUAL_WHEN_APPLICABLE');
    }
    if(text(asset?.packId)==='roblox-common-tools-v1'){
      add('GRIP_SOCKET');add('WORLD_DROP');add('INVENTORY_ICON');add('CRAFT_ICON');
    }
  }
  return tokens;
}

export function auditCommonLibrarySystemDepth({assets=[]}={}){
  const source=(assets||[]).filter(asset=>asset?.catalogActive!==false
    &&!/(STALE|QUARANTIN|RETIRED|REJECTED)/.test(upper(asset?.catalogState)+' '+upper(asset?.status))
    &&asset?.rightsPass!==false
    &&(asset?.companyCommonBase===true||String(asset?.reuseScope||'').includes('COMPANY')));
  const rows=[];
  for(const [domain,expectation] of Object.entries(COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS)){
    const candidates=source.filter(asset=>commonDepthDomainMatch(domain,asset));
    const tokens=commonDepthTokens(candidates);
    const aliases=COMMON_LIBRARY_SYSTEM_DEPTH_ALIASES[domain]||{};
    const covered=[];
    const missing=[];
    for(const required of expectation.required){
      const accepted=[required,...(aliases[required]||[])].map(upper);
      if(accepted.some(token=>tokens.has(token)))covered.push(required);
      else missing.push(required);
    }
    rows.push(Object.freeze({
      domain,
      minimumDepth:expectation.minimumDepth,
      candidateCount:candidates.length,
      requiredCount:expectation.required.length,
      coveredCount:covered.length,
      coveragePercent:expectation.required.length?Math.round(covered.length/expectation.required.length*100):100,
      covered:Object.freeze(covered),
      missing:Object.freeze(missing)
    }));
  }
  rows.sort((a,b)=>a.coveragePercent-b.coveragePercent||a.domain.localeCompare(b.domain));
  return Object.freeze({
    version:1,
    rows:Object.freeze(rows),
    incomplete:Object.freeze(rows.filter(row=>row.missing.length>0)),
    complete:rows.every(row=>row.missing.length===0),
    scoreIsUsageGate:false,
    existingAssetsRemainUsable:true,
    crossPackCoverage:true,
    newPipelineCreated:false
  });
}


export function scanUniversalAssetCoverage({
  assets=[],
  baselines=DEFAULT_COVERAGE_BASELINES,
  activeDemand={},
  platform='',
  styleFamily=''
}={}){
  const normalized=(assets||[]).map(normalizeRegistryAsset);
  const rows=[];
  for(const family of Object.keys(baselines)){
    for(const [subfamily,required] of Object.entries(baselines[family]||{})){
      const matches=normalized.filter(row=>row.family===family&&(row.subfamily===subfamily||row.tags.includes(subfamily)));
      const verified=matches.filter(row=>row.verified).length;
      const prepared=matches.filter(row=>row.prepared&&!row.verified).length;
      const missing=Math.max(0,Number(required)-verified);
      const demand=Number(activeDemand[family]?.[subfamily]||0);
      const styleVerified=styleFamily?matches.filter(row=>row.verified&&(!row.styleFamily||row.styleFamily===upper(styleFamily))).length:verified;
      const platformVerified=platform?matches.filter(row=>row.verified&&(!row.platform||row.platform===upper(platform)||row.platform==='SHARED_REFERENCE')).length:verified;
      const coveragePercent=Number(required)>0?Math.min(100,Math.round(verified/Number(required)*100)):100;
      rows.push(Object.freeze({
        family,subfamily,required:Number(required),availableVerified:verified,availablePrepared:prepared,missingSlots:missing,
        coveragePercent,activeDemand:demand,styleCoveragePercent:styleFamily?Math.min(100,Math.round(styleVerified/Number(required)*100)):coveragePercent,
        platformCoveragePercent:platform?Math.min(100,Math.round(platformVerified/Number(required)*100)):coveragePercent
      }));
    }
  }
  rows.sort((a,b)=>a.coveragePercent-b.coveragePercent||b.activeDemand-a.activeDemand||a.family.localeCompare(b.family));
  return Object.freeze({
    rows:Object.freeze(rows),
    overallCoveragePercent:rows.length?Math.round(rows.reduce((sum,row)=>sum+row.coveragePercent,0)/rows.length):100,
    missingSlotCount:rows.reduce((sum,row)=>sum+row.missingSlots,0),
    incomplete:Object.freeze(rows.filter(row=>row.missingSlots>0))
  });
}

export function scoreAssetGapPriority({gap={},signals={}}={}){
  let score=0;
  if(signals.runtimeMissingOrBroken===true)score+=50;
  if(signals.activeGameDemand===true||Number(gap.activeDemand)>0)score+=45;
  score+=Math.min(30,Math.max(0,Number(signals.gameConsumerCount)||0)*6);
  if(signals.playerVisibleFrequencyHigh===true)score+=25;
  if(signals.heroBossLandmark===true)score+=25;
  if(Number(gap.styleCoveragePercent)<50)score+=15;
  if(Number(gap.platformCoveragePercent)<50)score+=15;
  if(signals.externalSourceReady===true)score+=10;
  if(signals.verifiedReuseAvailable===true)score-=15;
  score+=Math.min(30,Math.max(0,Number(gap.missingSlots)||0)*3);
  return score;
}

export function buildLibraryHeatmap({coverageReport={},signalsByKey={}}={}){
  const rows=(coverageReport.rows||[]).map(gap=>{
    const key=gap.family+':'+gap.subfamily;
    const signals=signalsByKey[key]||{};
    return Object.freeze({...gap,priorityScore:scoreAssetGapPriority({gap,signals})});
  }).sort((a,b)=>b.priorityScore-a.priorityScore||a.coveragePercent-b.coveragePercent||a.family.localeCompare(b.family));
  return Object.freeze({rows:Object.freeze(rows),highestPriorityGap:rows.find(row=>row.missingSlots>0)||null});
}

function externalCandidatesForGap(gap={},externalSources=[]){
  const family=upper(gap.family);
  return (externalSources||[]).filter(src=>{
    const categories=uniq([src?.category,...(Array.isArray(src?.categories)?src.categories:[])]).map(upper);
    const status=upper(src?.status);
    const categoryMatch=categories.includes(family)
      ||(family==='BUILDING'&&categories.some(category=>['ENVIRONMENT','PROP'].includes(category)))
      ||(family==='MATERIAL'&&categories.some(category=>['VFX','ENVIRONMENT'].includes(category)));
    return /LICENSE_VERIFIED/.test(status)&&categoryMatch;
  }).sort((a,b)=>
    Number(b?.volumeAdaptationEligible===true)-Number(a?.volumeAdaptationEligible===true)
    ||Number(b?.sourcePriority||0)-Number(a?.sourcePriority||0)
    ||text(a?.id).localeCompare(text(b?.id))
  );
}

function semanticSeedId(gap={},index=0){
  return ['PREPARED',upper(gap.family),upper(gap.subfamily),String(index+1).padStart(2,'0')].join('_');
}

export function buildAutonomousAssetGapFillPlan({
  coverageReport={},
  verifiedAssets=[],
  repositoryAssets=[],
  externalSources=[],
  signalsByKey={},
  qualityProgram={}
}={}){
  const verified=(verifiedAssets||[]).map(normalizeRegistryAsset);
  const repo=(repositoryAssets||[]).map(normalizeRegistryAsset);
  const heatmap=buildLibraryHeatmap({coverageReport,signalsByKey});
  const actions=[];
  for(const gap of heatmap.rows.filter(row=>row.missingSlots>0)){
    const verifiedMatches=verified.filter(row=>row.family===gap.family&&(row.subfamily===gap.subfamily||row.tags.includes(gap.subfamily)));
    const repoMatches=repo.filter(row=>row.family===gap.family&&(row.subfamily===gap.subfamily||row.tags.includes(gap.subfamily)));
    const external=externalCandidatesForGap(gap,externalSources);
    let route='PREPARE_SEMANTIC_ASSET_SEED';
    let sourceIds=[];
    if(verifiedMatches.length){route='REUSE_VERIFIED_COMPANY_ASSET';sourceIds=verifiedMatches.map(x=>x.id);}
    else if(repoMatches.length){route='REUSE_LICENSE_VERIFIED_REPOSITORY_ASSET';sourceIds=repoMatches.map(x=>x.id);}
    else if(external.length){route='ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET';sourceIds=external.map(x=>x.id);}
    const semanticSeeds=Array.from({length:gap.missingSlots},(_,i)=>semanticSeedId(gap,i));
    actions.push(Object.freeze({
      family:gap.family,subfamily:gap.subfamily,missingSlots:gap.missingSlots,priorityScore:gap.priorityScore,
      route,sourceIds:Object.freeze(sourceIds),semanticSeeds:Object.freeze(semanticSeeds),
      acquisitionMode:route==='ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET'?'ON_DEMAND_SELECTED_ACTION_ONLY':'NOT_REQUIRED',
      bulkPrefetchAllowed:false,
      speculativeDownloadAllowed:false,
      acquireOnlyWhenSelected:route==='ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET',
      adaptAfterAcquisition:route==='ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET',
      reuseAcquiredSourceWhenCompatible:true,
      preparedState:'PREPARED_SEMANTIC',
      preparedMayClaimVerified:false,
      nativeRuntimeConsumerRequiredBeforePromotion:true
    }));
  }
  const familyByAssetId=new Map([
    ...(verifiedAssets||[]),
    ...(repositoryAssets||[])
  ].map(asset=>[text(asset?.id),Object.freeze({
    family:upper(asset?.family||asset?.category),
    subfamily:upper(asset?.subfamily||asset?.type)
  })]));
  const heroIds=new Set(qualityProgram?.heroBaseline?.heroAssetIds||[]);
  const qualityActions=(qualityProgram?.evolutionQueue||[])
    .filter(row=>row?.assetId&&Number(row.currentScore)<STUDIO_ASSET_QUALITY_MAX)
    .map(row=>{
      const identity=familyByAssetId.get(text(row.assetId))||{};
      const deficit=Math.max(0,STUDIO_ASSET_QUALITY_MAX-Number(row.currentScore||0));
      const heroBonus=heroIds.has(text(row.assetId))?50:0;
      return Object.freeze({
        kind:'QUALITY_EVOLUTION',
        family:identity.family||'UNKNOWN',
        subfamily:identity.subfamily||'',
        assetId:text(row.assetId),
        currentScore:Number(row.currentScore||0),
        targetScore:STUDIO_ASSET_QUALITY_MAX,
        qualityGrade:text(row.currentGrade),
        priorityScore:200+heroBonus+deficit,
        route:'IMPROVE_EXISTING_ASSET_WORST_PART_FIRST',
        nextTarget:text(row.nextTarget)||'UNMEASURED_QUALITY',
        preserveStrongAxes:freezeList(row.preserveStrongAxes||[]),
        bindCurrentAsset:true,
        lowScoreBindingAllowed:true,
        visualDebtMustRemainOpen:Number(row.currentScore)<100,
        fullRebuildDefault:false,
        nativeRuntimeConsumerRequiredBeforePromotion:true,
        verifiedOutcomeOnlyMayTeachPositiveLearning:true
      });
    });
  const allActions=[...actions,...qualityActions].sort((a,b)=>b.priorityScore-a.priorityScore||String(a.family).localeCompare(String(b.family))||String(a.assetId||'').localeCompare(String(b.assetId||'')));
  return Object.freeze({
    heatmap,
    actions:Object.freeze(allActions),
    coverageActions:Object.freeze(actions.sort((a,b)=>b.priorityScore-a.priorityScore||a.family.localeCompare(b.family))),
    qualityActions:Object.freeze(qualityActions.sort((a,b)=>b.priorityScore-a.priorityScore||String(a.assetId).localeCompare(String(b.assetId)))),
    qualityEvolutionEnabled:true,
    qualityTarget:STUDIO_ASSET_QUALITY_MAX,
    qualityScoreIsNotBindingGate:true,
    lowScoreAssetMayRemainBoundDuringImprovement:true,
    noArtificialCategoryCap:true,
    unityRobloxNativeVariantsRequired:true,
    runtimeVerificationRequired:true
  });
}

export function buildBaseMaterialRotationPlan({
  families={},usageByAtom={},minimumPerFamily=20,maxRetirePerFamilyPerCycle=2,maxGraduatePerFamilyPerCycle=2,
  staleAfterCycles=30,masteryThreshold=90,masteryVerifiedPassMinimum=2
}={}){
  const productionActive={},learningActive={},retired=[],graduated=[],refill=[];
  const reasons={};
  for(const [family,atomsRaw] of Object.entries(families||{})){
    const atoms=uniq(atomsRaw);
    const floor=Math.min(atoms.length,Math.max(1,Number(minimumPerFamily)||20));
    const scored=atoms.map(atom=>{
      const signal=usageByAtom?.[atom]||{};
      const duplicate=Boolean(signal.duplicateOf);
      const broken=signal.verifiedRuntimeFailure===true||Number(signal.compatibilityFailureCount||0)>=2;
      const stale=Number(signal.usageCount||0)===0&&Number(signal.unusedCycles||0)>=Math.max(1,Number(staleAfterCycles)||30);
      const protectedAtom=signal.locked===true||signal.gameLocked===true||signal.manualLocked===true;
      const mastered=signal.mastered===true||(
        Number(signal.masteryScore||0)>=Math.max(1,Number(masteryThreshold)||90)&&
        Number(signal.verifiedPassCount||0)>=Math.max(1,Number(masteryVerifiedPassMinimum)||2)
      );
      const retireReason=protectedAtom?'':duplicate?'DUPLICATE':broken?'VERIFIED_FAILURE_OR_COMPATIBILITY_BREAK':stale?'STALE_UNUSED':'';
      const priority=duplicate?300:broken?250:stale?100:0;
      return{atom,retireReason,priority,protectedAtom,mastered,learningLocked:signal.activeLearningRequired===true};
    });
    const retireCandidates=scored.filter(row=>row.retireReason).sort((a,b)=>b.priority-a.priority||a.atom.localeCompare(b.atom));
    const maxAllowed=Math.max(0,atoms.length-floor);
    const retireCount=Math.min(retireCandidates.length,Math.max(0,Number(maxRetirePerFamilyPerCycle)||2),maxAllowed);
    const retiredRows=retireCandidates.slice(0,retireCount);
    const retiredSet=new Set(retiredRows.map(row=>row.atom));
    const graduateRows=scored
      .filter(row=>row.mastered&&!row.learningLocked&&!retiredSet.has(row.atom))
      .sort((a,b)=>a.atom.localeCompare(b.atom))
      .slice(0,Math.max(0,Number(maxGraduatePerFamilyPerCycle)||2));
    const graduatedSet=new Set(graduateRows.map(row=>row.atom));
    productionActive[family]=freezeList(atoms.filter(atom=>!retiredSet.has(atom)));
    learningActive[family]=freezeList(atoms.filter(atom=>!retiredSet.has(atom)&&!graduatedSet.has(atom)));
    for(const row of retiredRows){
      retired.push(Object.freeze({family,atom:row.atom,reason:row.retireReason,historyPreserved:true,physicalDelete:false,productionReusable:false}));
      reasons[row.atom]=row.retireReason;
      refill.push(Object.freeze({family,count:1,replaces:row.atom,reason:row.retireReason,route:'EXISTING_24H_GAP_FILL',replacementGoal:'RESTORE_ACTIVE_MATERIAL_SLOT'}));
    }
    for(const row of graduateRows){
      graduated.push(Object.freeze({
        family,atom:row.atom,reason:'MASTERY_SATURATED',historyPreserved:true,physicalDelete:false,
        productionReusable:true,learningQueueRemoved:true
      }));
      reasons[row.atom]='MASTERY_SATURATED';
      refill.push(Object.freeze({
        family,count:1,replaces:row.atom,reason:'MASTERY_SATURATED',route:'EXISTING_24H_GAP_FILL',
        replacementGoal:'NEW_UNMASTERED_DIVERSITY_SLOT'
      }));
    }
  }
  return Object.freeze({
    version:2,status:'ROTATION_PLAN',active:Object.freeze(productionActive),productionActive:Object.freeze(productionActive),
    learningActive:Object.freeze(learningActive),retired:Object.freeze(retired),graduated:Object.freeze(graduated),refill:Object.freeze(refill),
    retireCount:retired.length,graduateCount:graduated.length,refillCount:refill.length,historyPreserved:true,physicalDeleteForbidden:true,
    masteredMaterialRemainsProductionReusable:true,masteredMaterialLeavesLearningExpansionPool:true,
    minimumPerFamily:Number(minimumPerFamily)||20,maxRetirePerFamilyPerCycle:Number(maxRetirePerFamilyPerCycle)||2,
    maxGraduatePerFamilyPerCycle:Number(maxGraduatePerFamilyPerCycle)||2,staleAfterCycles:Number(staleAfterCycles)||30,
    masteryThreshold:Number(masteryThreshold)||90,masteryVerifiedPassMinimum:Number(masteryVerifiedPassMinimum)||2,
    reasons:Object.freeze(reasons),usesExistingGapFill:true
  });
}

export function createAssetLineage({
  assetId='',parentId='',sourceId='',sourceHash='',derivedHash='',transformHistory=[],licenseEvidence='',
  platform='',styleFamily='',gameId='',verificationSha='',runtimeEvidenceId=''
}={}){
  return Object.freeze({
    assetId:text(assetId),parentId:text(parentId)||null,sourceId:text(sourceId)||null,sourceHash:text(sourceHash)||null,
    derivedHash:text(derivedHash)||null,transformHistory:freezeList(uniq(transformHistory)),licenseEvidence:text(licenseEvidence)||null,
    platform:upper(platform),styleFamily:upper(styleFamily),gameId:text(gameId)||null,verificationSha:text(verificationSha)||null,
    runtimeEvidenceId:text(runtimeEvidenceId)||null,originalImmutable:true,revalidateDerivedWhenParentImproves:true,
    complete:Boolean(assetId&&sourceId&&derivedHash&&platform)
  });
}

export function createStudioAssetUniversePlan({
  assets=[],repositoryAssets=[],externalSources=[],activeDemand={},signalsByKey={},platform='UNITY',
  styleFamily='STYLIZED_FANTASY',styleBible={},concept={},gameId='',worldDna={},languages={},
  requirements=[],usageByAsset={},futureGameDemands=[],usageEvents=[],baseMaterialFamilies={},baseMaterialUsageByAtom={},
  customizationRecipes=[],customizationContract=null,qualityEvidenceByAsset={},heroAssetIds=[],familyOutputsByAsset={},
  libraryVersion=0,librarySnapshotId='',expectedSnapshotId=''
}={}){
  const conceptProfile=createConceptProfile({...concept,styleFamily:concept.styleFamily||styleFamily});
  const resolvedStyle=conceptProfile.dominantStyle||upper(styleFamily);
  const combinedById=new Map();
  for(const asset of [...assets,...repositoryAssets]){
    const id=text(asset?.id);
    if(!id)continue;
    const existing=combinedById.get(id);
    combinedById.set(id,existing?{...asset,...existing}:asset);
  }
  const combinedAssets=[...combinedById.values()];
  const coverage=scanUniversalAssetCoverage({assets,activeDemand,platform,styleFamily:resolvedStyle});
  const verified=assets.filter(asset=>normalizeRegistryAsset(asset).verified);
  const quality120=buildStudioAssetQuality120Program({
    assets:combinedAssets,
    qualityEvidenceByAsset,
    heroAssetIds,
    familyOutputsByAsset
  });
  const gapFill=buildAutonomousAssetGapFillPlan({
    coverageReport:coverage,verifiedAssets:verified,repositoryAssets,externalSources,signalsByKey,qualityProgram:quality120
  });
  const resolvedBible=createStyleBible({styleFamily:resolvedStyle,styles:conceptProfile.weightedStyles,artTone:conceptProfile.axes?.ART_TONE||[],styleExpressionOverrides:conceptProfile.styleExpression?.axes||{},...styleBible});
  const conceptCoherence=evaluateConceptCoherence({concept:conceptProfile,styleBible:resolvedBible,lockedStyle:styleFamily});
  const visualDna=createGameVisualDNA({gameId,concept:conceptProfile,styleBible:resolvedBible,worldDna,...languages});
  const inferredRequirements=requirements.length?requirements:Object.entries(activeDemand).flatMap(([family,subs])=>Object.entries(subs||{}).filter(([,count])=>Number(count)>0).map(([subfamily])=>({family,subfamily,required:true})));
  const effectiveRequirements=inferredRequirements.map(requirement=>{
    if(text(requirement.currentAssetId))return requirement;
    const family=upper(requirement.family),subfamily=upper(requirement.subfamily);
    const current=combinedAssets.find(asset=>{
      const row=normalizeRegistryAsset(asset);
      const currentConsumer=asset?.sameGameExistingRoblox===true||currentAssetConsumerGameIds(asset).map(text).includes(text(gameId));
      return currentConsumer&&row.family===family&&(!subfamily||row.subfamily===subfamily||row.tags.includes(subfamily));
    });
    return current?{...requirement,currentAssetId:text(current.id)}:requirement;
  });
  const loadout=buildStudioAssetLoadout({
    libraryVersion,librarySnapshotId,expectedSnapshotId,
    requirements:effectiveRequirements,
    assets:combinedAssets,
    gameDna:{...visualDna,targetPlatform:upper(platform)},
    usageByAsset
  });
  const futureDemand=buildFutureAssetDemandForecast({gameDemands:futureGameDemands,coverageReport:coverage});
  const usageFeedback=summarizeVerifiedAssetUsage({events:usageEvents});
  const baseMaterialRotation=buildBaseMaterialRotationPlan({families:baseMaterialFamilies,usageByAtom:baseMaterialUsageByAtom});
  const testbed=createStudioTestbedPlan({assetIds:loadout.selections.map(row=>row.assetId).filter(Boolean),platform,mobile:true});
  return Object.freeze({
    version:4,
    target:STUDIO_ASSET_UNIVERSE_TARGET,
    internalAssetReusePolicy:INTERNAL_ASSET_REUSE_POLICY,
    internalAssetMinimumCoverage:INTERNAL_ASSET_MINIMUM_COVERAGE,
    internalAssetCandidateCount:combinedAssets.length,
    platform:upper(platform),
    concept:conceptProfile,
    conceptAxes:CONCEPT_AXES,
    styleFamilies:ASSET_STYLE_FAMILIES,
    styleBible:resolvedBible,
    customization:customizationContract?.enabled===true?createAssetCustomizationPlan({
      assets:[...repositoryAssets,...assets],
      recipes:customizationRecipes.length?customizationRecipes:uniq(effectiveRequirements.map(row=>upper(row.family))).filter(family=>ASSET_CUSTOMIZATION_AXES[family]).map(family=>({family,baseAssetId:loadout.selections.find(row=>row.family===family)?.assetId})),
      styleBible:resolvedBible,contract:customizationContract,platform
    }):null,
    conceptCoherence,
    gameVisualDna:visualDna,
    loadout,
    futureDemand,
    usageFeedback,
    baseMaterialRotation,
    testbed,
    quality120,
    coverage,
    heatmap:gapFill.heatmap,
    gapFill,
    crossPlatform3dMasterGlb:CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT,
    creatureUniverse:Object.freeze({
      bodyPlanCount:CREATURE_BODY_PLANS.length,
      speciesCount:CREATURE_SPECIES.length,
      bodyPlans:CREATURE_BODY_PLANS,
      species:CREATURE_SPECIES
    }),
    clothingLayers:CLOTHING_LAYER_SLOTS,
    biomes:BIOME_FAMILIES,
    buildingThemes:BUILDING_THEMES,
    continuous24h:true,
    existingCanonicalLearningChainOnly:true,
    preparedSemanticMayClaimVerified:false
  });
}
