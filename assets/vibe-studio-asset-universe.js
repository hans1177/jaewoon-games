// 파일명: assets/vibe-studio-asset-universe.js
// GRAPHICS_PRODUCTION internal module.
// Unifies asset semantics, compatibility, coverage, identity and 24H gap-fill planning.
// It never promotes prepared assets without native runtime verification.

const text=value=>String(value??'').trim();
const upper=value=>text(value).toUpperCase();
const uniq=values=>[...new Set((values||[]).map(text).filter(Boolean))];
const freezeList=values=>Object.freeze([...(Array.isArray(values)?values:[])]);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

export const STUDIO_ASSET_UNIVERSE_TARGET='HIGH_END_STUDIO_ASSET_UNIVERSE';

export const STUDIO_ASSET_FAMILIES=Object.freeze([
  'CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'
]);

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
    productionVerified:false,
    runtimeVerificationRequired:true,
    exactThirdPartyAssetCopy:false
  });
}

export const CLOTHING_LAYER_SLOTS=Object.freeze([
  'HEAD','HAIR','FACE','NECK','TORSO_INNER','TORSO_OUTER','SHOULDER','ARM','GLOVE','BELT','LEG','BOOT','BACK','CAPE','ACCESSORY'
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
  'INTERACTION_ROLE','SILHOUETTE_CLASS','FUNCTION_CLASS','PLATFORM_VARIANT','SOURCE_PROVENANCE','PARENT_ID',
  'RUNTIME_VERIFICATION_STATE','COMPATIBILITY_TAGS','EXCLUSION_TAGS'
]);

export const DEFAULT_COVERAGE_BASELINES=Object.freeze({
  CHARACTER:Object.freeze({BODY:5,FACE:10,HAIR:12,CLOTHING:20,ARMOR:12,ACCESSORY:12}),
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
    PLATFORM_VARIANT:upper(input.PLATFORM_VARIANT||input.platformVariant),
    SOURCE_PROVENANCE:text(input.SOURCE_PROVENANCE||input.sourceProvenance),
    PARENT_ID:text(input.PARENT_ID||input.parentId),
    RUNTIME_VERIFICATION_STATE:upper(input.RUNTIME_VERIFICATION_STATE||input.runtimeVerificationState||'PREPARED_SEMANTIC'),
    COMPATIBILITY_TAGS:freezeList(uniq(input.COMPATIBILITY_TAGS||input.compatibilityTags)),
    EXCLUSION_TAGS:freezeList(uniq(input.EXCLUSION_TAGS||input.exclusionTags))
  };
  return Object.freeze(dna);
}

// 스타일: 조형·표면·연기를 함께 정의하며 실제 메시/클립 적용 전에는 제작 지침이다.
export const ASSET_STYLE_PROFILES=Object.freeze({
  CARTOON:Object.freeze({shapeLanguage:'BOLD_ROUNDED_PRIMARY_FORMS_WITH_CONTROLLED_ASYMMETRY',characterProportion:'EXPRESSIVE_HEAD_HANDS_AND_CLEAR_BODY_MASSES',materialLanguage:'CLEAN_VALUE_GROUPS_BROAD_HIGHLIGHTS_SPARSE_MICRODETAIL',lightingLanguage:'SOFT_KEY_CLEAR_CONTACT_SHADOW_AND_READABLE_FILL',animationExaggeration:'STRONG_KEY_POSES_ELASTIC_FOLLOW_THROUGH',buildingLanguage:'CHUNKY_BEVELS_CLEAR_MODULE_JOINTS_AND_PLAYFUL_ROOFLINES',motion:Object.freeze({poseExaggeration:1.35,anticipationScale:1.2,overshootScale:1.25,squashStretch:.15,secondaryMotion:1.2,recoveryPresentation:1.1})}),
  DARK_FANTASY:Object.freeze({shapeLanguage:'WEIGHTED_ANGULAR_MASSES_WITH_PURPOSEFUL_ASYMMETRY',characterProportion:'GROUNDED_ANATOMY_WITH_ONE_DISTURBING_SIGNATURE',materialLanguage:'LAYERED_ROUGHNESS_EDGE_WEAR_CAVITY_GRIME_AND_MATERIAL_SEPARATION',lightingLanguage:'DIRECTIONAL_KEY_CONTROLLED_FILL_PRESERVE_DARK_SILHOUETTE',animationExaggeration:'RESTRAINED_INTENT_HEAVY_CONTACT_AND_DELAYED_SETTLE',buildingLanguage:'LOAD_BEARING_FORMS_WEATHERED_JOINTS_AND_LOCALIZED_DECAY',motion:Object.freeze({poseExaggeration:.95,anticipationScale:1.15,overshootScale:.8,squashStretch:0,secondaryMotion:.8,recoveryPresentation:1.2})}),
  TOON_NOIR:Object.freeze({shapeLanguage:'BOLD_CARTOON_MASSES_WITH_UNSETTLING_ASYMMETRIC_DETAIL',characterProportion:'READABLE_EXAGGERATION_WITH_LOCKED_UNIQUE_FACE_AND_POSTURE',materialLanguage:'SIMPLIFIED_VALUE_GROUPS_WITH_FOCUSED_WEAR_AND_RICH_HERO_SURFACES',lightingLanguage:'GRAPHIC_LIGHT_SHADOW_GROUPS_WITH_VISIBLE_FACES_AND_CONTACT',animationExaggeration:'HELD_STARES_SHARP_POSE_CHANGES_WEIGHTED_FOLLOW_THROUGH',buildingLanguage:'CROOKED_BUT_SUPPORTED_MODULES_WITH_LOCAL_STORY_TRACES',motion:Object.freeze({poseExaggeration:1.25,anticipationScale:1.3,overshootScale:1.05,squashStretch:.06,secondaryMotion:1.1,recoveryPresentation:1.2})}),
  ANIME_OR_CEL_SHADED:Object.freeze({shapeLanguage:'CLEAN_TAPERED_FORMS_AND_PRECISE_SILHOUETTE',materialLanguage:'CONTROLLED_CEL_BANDS_AND_AUTHORED_HIGHLIGHT_SHAPES',animationExaggeration:'STRONG_LINE_OF_ACTION_HELD_POSES_AND_CRISP_BREAKDOWNS',motion:Object.freeze({poseExaggeration:1.2,anticipationScale:1.15,overshootScale:1.05,squashStretch:.03,secondaryMotion:1.15,recoveryPresentation:1})}),
  STYLIZED_REALISM:Object.freeze({shapeLanguage:'BELIEVABLE_ANATOMY_WITH_SELECTIVE_SHAPE_SIMPLIFICATION',materialLanguage:'PHYSICAL_MATERIAL_SEPARATION_WITH_AUTHORED_WEAR',animationExaggeration:'OBSERVED_WEIGHT_TRANSFER_AND_SUBTLE_SECONDARY_ACTING',motion:Object.freeze({poseExaggeration:1,anticipationScale:1,overshootScale:1,squashStretch:0,secondaryMotion:1,recoveryPresentation:1})}),
  REALISTIC:Object.freeze({shapeLanguage:'ANATOMICALLY_PLAUSIBLE_PLANES_JOINTS_AND_FUNCTIONAL_CONSTRUCTION',materialLanguage:'PHYSICAL_SCALE_PBR_WITH_MICROSURFACE_AND_CAUSE_BASED_WEAR',lightingLanguage:'PHYSICAL_LIGHT_RESPONSE_WITH_CONTROLLED_EXPOSURE_AND_READABLE_CONTACT',characterProportion:'ANATOMICAL_WITH_INDIVIDUAL_ASYMMETRY',animationExaggeration:'SUBTLE_GAZE_BREATHING_BALANCE_INERTIA_AND_CONTACT_NO_CARTOON_SQUASH',motion:Object.freeze({poseExaggeration:1,anticipationScale:1,overshootScale:.65,squashStretch:0,secondaryMotion:.85,recoveryPresentation:1})}),
  LOW_POLY:Object.freeze({shapeLanguage:'PURPOSEFUL_FACETED_PLANES_AND_SPECIES_SPECIFIC_MASSES',materialLanguage:'BROAD_MATTE_VALUE_GROUPS_WITH_SPARSE_SURFACE_ACCENTS',animationExaggeration:'CLEAR_JOINT_POSES_AND_GROUNDED_CONTACT',motion:Object.freeze({poseExaggeration:1.1,anticipationScale:1.1,overshootScale:1,squashStretch:0,secondaryMotion:.8,recoveryPresentation:1})})
});

export function createStyleBible(input={}){
  const family=upper(input.styleFamily||'STYLIZED_FANTASY');
  const styles=(input.styles||[]).filter(row=>typeof row==='string'||Number(row.weight??1)>0).map(row=>upper(typeof row==='string'?row:row.family));
  const mixedToon=styles.includes('CARTOON')&&styles.some(style=>['DARK_FANTASY','HORROR','NOIR','GOTHIC'].includes(style));
  const profileKey=upper(input.profileKey)||(mixedToon||family==='DARK_CARTOON'?'TOON_NOIR':['HORROR','GOTHIC','NOIR'].includes(family)?'DARK_FANTASY':family);
  const defaults=ASSET_STYLE_PROFILES[profileKey]||{};
  const bible={
    styleFamily:family,
    profileKey,
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
  CHARACTER:['FACE','BODY_PROPORTION','HAIR','EXPRESSION','CLOTHING','ACCESSORY','SURFACE_WEAR'],
  CREATURE:['BODY_PLAN','HEAD','LIMB_PROPORTION','HORN_TEETH_CLAW','SKIN','SIGNATURE_ORGAN','SURFACE_WEAR'],
  BUILDING:['WALL','DOOR','WINDOW','ROOF','ROOM_LAYOUT','JOINT_DETAIL','LOCAL_DAMAGE','SURFACE_WEAR'],
  ENVIRONMENT:['TERRAIN_PROFILE','ROCK_FORM','TREE_BRANCH','FOLIAGE_DENSITY','GROUND_COVER','WETNESS','LANDMARK'],
  WEAPON:['BLADE_HEAD','HANDLE','GUARD','ORNAMENT','MATERIAL','SURFACE_WEAR'],
  PROP:['STRUCTURE','PROPORTION','ATTACHMENT','MATERIAL','LOCAL_DAMAGE','SURFACE_WEAR'],
  MATERIAL:['BASE_COLOR','ROUGHNESS','METALLIC','NORMAL_DETAIL','CAVITY_GRIME','EDGE_WEAR','WETNESS'],
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
  if(candidate.styleBible&&Object.entries(candidate.styleBible).some(([key,value])=>!bibleKeys.includes(key)||typeof value!=='string'))issues.push('INVALID_STYLE_FIELD');
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
  styles=[],styleFamily='',artTone=[],worldEra=[],combatFeel=[],presentation=[],customTags=[]
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
  const bible=createStyleBible({styleFamily:conceptProfile.dominantStyle,styles:conceptProfile.weightedStyles,...styleBible});
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

export function scoreStudioAssetCandidate({asset={},gameDna={},usage={}}={}){
  const row=normalizeRegistryAsset(asset);
  const concept=gameDna?.concept||createConceptProfile({styleFamily:row.styleFamily||'STYLIZED_FANTASY'});
  const conceptQa=evaluateConceptCompatibility({asset,concept});
  const platform=upper(gameDna?.platform||gameDna?.PLATFORM_VARIANT||asset.platformVariant||asset.platform);
  const targetPlatform=upper(gameDna?.targetPlatform||gameDna?.platform);
  let score=assetSourceTier(row)*20;
  if(conceptQa.pass)score+=25; else score-=45;
  if(targetPlatform&&(!row.platform||row.platform===targetPlatform||row.platform==='SHARED_REFERENCE'))score+=15;
  if(usage.runtimePass===true)score+=20;
  score+=Math.min(20,Math.max(0,Number(usage.gameConsumerCount)||0)*4);
  score+=Math.min(10,Math.max(0,Number(usage.usageCount)||0));
  if(usage.runtimeFailure===true||Number(usage.verifiedFailureCount)>0)score-=Math.min(60,20+Number(usage.verifiedFailureCount||0)*10);
  if(usage.identityFailure===true||usage.styleFailure===true||usage.navigationFailure===true)score-=25;
  if(usage.mobileBudgetFailure===true)score-=20;
  return Object.freeze({
    id:row.id,
    score:Math.round(score),
    sourceTier:assetSourceTier(row),
    verified:row.verified,
    conceptPass:conceptQa.pass,
    platformCompatible:!targetPlatform||!row.platform||row.platform===targetPlatform||row.platform==='SHARED_REFERENCE',
    rejected:Boolean(!conceptQa.pass||usage.lockedOut===true),
    reasons:Object.freeze([
      row.verified?'VERIFIED_RUNTIME_OR_COMPANY':'UNVERIFIED_OR_PREPARED',
      conceptQa.pass?'CONCEPT_COMPATIBLE':'CONCEPT_MISMATCH',
      usage.runtimeFailure===true?'VERIFIED_RUNTIME_FAILURE':''
    ].filter(Boolean))
  });
}

export function buildStudioAssetLoadout({requirements=[],assets=[],gameDna={},usageByAsset={}}={}){
  const normalized=(assets||[]).map(asset=>({asset,row:normalizeRegistryAsset(asset)}));
  const selections=[];
  for(const requirement of requirements||[]){
    const family=upper(requirement.family),subfamily=upper(requirement.subfamily);
    const candidates=normalized
      .filter(({row})=>row.family===family&&(!subfamily||row.subfamily===subfamily||row.tags.includes(subfamily)))
      .map(({asset,row})=>({asset,row,score:scoreStudioAssetCandidate({asset,gameDna,usage:usageByAsset[row.id]||{}})}))
      .filter(x=>!x.score.rejected)
      .sort((a,b)=>b.score.sourceTier-a.score.sourceTier||b.score.score-a.score.score||a.row.id.localeCompare(b.row.id));
    const picked=candidates[0]||null;
    selections.push(Object.freeze({
      family,subfamily,required:requirement.required!==false,
      assetId:picked?.row.id||null,
      score:picked?.score.score??null,
      sourceTier:picked?.score.sourceTier??0,
      verified:picked?.row.verified===true,
      unresolved:!picked
    }));
  }
  return Object.freeze({
    selections:Object.freeze(selections),
    unresolved:Object.freeze(selections.filter(row=>row.required&&row.unresolved)),
    complete:selections.every(row=>!row.required||!row.unresolved),
    manualOrLockedChoiceWins:true,
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
    colorOnlySpeciesVariantAllowed:false,gameplayStatsAuthority:false
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

export function summarizeVerifiedAssetUsage({events=[]}={}){
  const rows=new Map();
  for(const event of events||[]){
    const id=text(event.assetId);if(!id)continue;
    const row=rows.get(id)||{assetId:id,usageCount:0,gameIds:new Set(),runtimePassCount:0,runtimeFailureCount:0,failureReasons:new Set()};
    row.usageCount+=Math.max(1,Number(event.count)||1);
    if(event.gameId)row.gameIds.add(text(event.gameId));
    if(event.verifiedRuntimePass===true)row.runtimePassCount++;
    if(event.verifiedRuntimeFailure===true){row.runtimeFailureCount++;if(event.failureReason)row.failureReasons.add(upper(event.failureReason));}
    rows.set(id,row);
  }
  return Object.freeze({
    rows:Object.freeze([...rows.values()].map(row=>Object.freeze({
      assetId:row.assetId,usageCount:row.usageCount,gameConsumerCount:row.gameIds.size,
      runtimePassCount:row.runtimePassCount,runtimeFailureCount:row.runtimeFailureCount,
      failureReasons:freezeList([...row.failureReasons]),
      positiveLearningEligible:row.runtimePassCount>0,
      negativeLearningEligible:row.runtimeFailureCount>0
    }))),
    rawTelemetryDirectTrainingAllowed:false,
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
    tags:(asset.tags||asset.capabilities||[]).map(upper)
  };
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
    const category=upper(src.category);
    const status=upper(src.status);
    return /LICENSE_VERIFIED/.test(status)&&(category===family||(family==='BUILDING'&&['ENVIRONMENT','PROP'].includes(category))||(family==='MATERIAL'&&['VFX','ENVIRONMENT'].includes(category)));
  });
}

function semanticSeedId(gap={},index=0){
  return ['PREPARED',upper(gap.family),upper(gap.subfamily),String(index+1).padStart(2,'0')].join('_');
}

export function buildAutonomousAssetGapFillPlan({
  coverageReport={},
  verifiedAssets=[],
  repositoryAssets=[],
  externalSources=[],
  signalsByKey={}
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
      preparedState:'PREPARED_SEMANTIC',
      preparedMayClaimVerified:false,
      nativeRuntimeConsumerRequiredBeforePromotion:true
    }));
  }
  return Object.freeze({
    heatmap,
    actions:Object.freeze(actions.sort((a,b)=>b.priorityScore-a.priorityScore||a.family.localeCompare(b.family))),
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
  customizationRecipes=[],customizationContract=null
}={}){
  const conceptProfile=createConceptProfile({...concept,styleFamily:concept.styleFamily||styleFamily});
  const resolvedStyle=conceptProfile.dominantStyle||upper(styleFamily);
  const coverage=scanUniversalAssetCoverage({assets,activeDemand,platform,styleFamily:resolvedStyle});
  const verified=assets.filter(asset=>normalizeRegistryAsset(asset).verified);
  const gapFill=buildAutonomousAssetGapFillPlan({
    coverageReport:coverage,verifiedAssets:verified,repositoryAssets,externalSources,signalsByKey
  });
  const resolvedBible=createStyleBible({styleFamily:resolvedStyle,styles:conceptProfile.weightedStyles,...styleBible});
  const conceptCoherence=evaluateConceptCoherence({concept:conceptProfile,styleBible:resolvedBible,lockedStyle:styleFamily});
  const visualDna=createGameVisualDNA({gameId,concept:conceptProfile,styleBible:resolvedBible,worldDna,...languages});
  const inferredRequirements=requirements.length?requirements:Object.entries(activeDemand).flatMap(([family,subs])=>Object.entries(subs||{}).filter(([,count])=>Number(count)>0).map(([subfamily])=>({family,subfamily,required:true})));
  const loadout=buildStudioAssetLoadout({requirements:inferredRequirements,assets,gameDna:{...visualDna,targetPlatform:upper(platform)},usageByAsset});
  const futureDemand=buildFutureAssetDemandForecast({gameDemands:futureGameDemands,coverageReport:coverage});
  const usageFeedback=summarizeVerifiedAssetUsage({events:usageEvents});
  const baseMaterialRotation=buildBaseMaterialRotationPlan({families:baseMaterialFamilies,usageByAtom:baseMaterialUsageByAtom});
  const testbed=createStudioTestbedPlan({assetIds:loadout.selections.map(row=>row.assetId).filter(Boolean),platform,mobile:true});
  return Object.freeze({
    version:3,
    target:STUDIO_ASSET_UNIVERSE_TARGET,
    platform:upper(platform),
    concept:conceptProfile,
    conceptAxes:CONCEPT_AXES,
    styleFamilies:ASSET_STYLE_FAMILIES,
    styleBible:resolvedBible,
    customization:customizationContract?.enabled===true?createAssetCustomizationPlan({
      assets:[...repositoryAssets,...assets],
      recipes:customizationRecipes.length?customizationRecipes:uniq(inferredRequirements.map(row=>upper(row.family))).filter(family=>ASSET_CUSTOMIZATION_AXES[family]).map(family=>({family,baseAssetId:loadout.selections.find(row=>row.family===family)?.assetId})),
      styleBible:resolvedBible,contract:customizationContract,platform
    }):null,
    conceptCoherence,
    gameVisualDna:visualDna,
    loadout,
    futureDemand,
    usageFeedback,
    baseMaterialRotation,
    testbed,
    coverage,
    heatmap:gapFill.heatmap,
    gapFill,
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
