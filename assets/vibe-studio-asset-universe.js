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
  'LIZARDMAN','BEASTMAN','MONSTER_KNIGHT','MONSTER_MAGE','WOLF','FOX','LION','TIGER','BEAR','BOAR','DEER',
  'HORSE_BEAST','HELLHOUND','QUADRUPED_DRAGON','ANT','SOLDIER_ANT','BEETLE','SPIDER','SCORPION','MANTIS',
  'WASP','BEE','CENTIPEDE','GIANT_CRAB','SNAKE','COBRA','GIANT_SERPENT','CROCODILE','BASILISK','BIRD',
  'BAT','FLYING_INSECT','WYVERN','DRAGON','HARPY','FLYING_DEMON','FISH','SHARK','EEL','JELLYFISH',
  'OCTOPUS','SQUID','SEA_SERPENT','SLIME','BLOB','TENTACLE_BEAST','MIMIC','MUSHROOM_MONSTER',
  'PLANT_MONSTER','ROOT_MONSTER','STONE_GOLEM','IRON_GOLEM','CRYSTAL_GOLEM','ROBOT','MECH','GIANT','COLOSSUS'
]);

export const CLOTHING_LAYER_SLOTS=Object.freeze([
  'HEAD','HAIR','FACE','NECK','TORSO_INNER','TORSO_OUTER','SHOULDER','ARM','GLOVE','BELT','LEG','BOOT','BACK','CAPE','ACCESSORY'
]);

export const ASSET_STYLE_FAMILIES=Object.freeze([
  'CARTOON','SEMI_CARTOON','ANIME_OR_CEL_SHADED','STYLIZED_FANTASY','STYLIZED_REALISM','DARK_FANTASY','HIGH_FANTASY','LOW_FANTASY',
  'WUXIA','XIANXIA','EAST_ASIAN_FANTASY','MYTHIC','FAIRYTALE','DREAMLIKE','GOTHIC','HORROR','COSMIC_HORROR','CUTE_CASUAL',
  'LOW_POLY','REALISTIC','SCI_FI','MILITARY_SCI_FI','CYBERPUNK','STEAMPUNK','DIESELPUNK','POST_APOCALYPSE','PRIMITIVE',
  'ANCIENT_CIVILIZATION','MODERN_URBAN','INDUSTRIAL','OCEANIC','SKY_WORLD','DESERT_CIVILIZATION','SNOW_KINGDOM',
  'JUNGLE_RUINS','UNDERGROUND','UNDEAD','MECHANICAL_CIVILIZATION','CHIBI'
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
  CHARACTER:Object.freeze({BODY:3,FACE:6,HAIR:8,CLOTHING:15,ARMOR:8,ACCESSORY:10}),
  CREATURE:Object.freeze({BODY_PLAN:30,SPECIES:50,RIG:16,MUTATION:20,MOTION:8,SIGNATURE:8}),
  BUILDING:Object.freeze({MODULAR_EXTERIOR:24,INTERIOR:12,STRUCTURAL:10,NAVIGATION:4,PROP_SOCKET:8}),
  ENVIRONMENT:Object.freeze({BIOME:18,TERRAIN:12,VEGETATION:24,ROCK:12,LANDMARK:8,WEATHER:8,PROP_DENSITY:6}),
  WEAPON:Object.freeze({MELEE:12,RANGED:6,MAGIC_FOCUS:5,SHIELD:4,THROWN:4}),
  SKILL:Object.freeze({CAST_MOTION:10,VFX:12,PROJECTILE:8,IMPACT:12,AUDIO:12,CAMERA:6,REACTION:10}),
  MATERIAL:Object.freeze({SURFACE:13,STYLE_VARIANT:5}),
  AUDIO:Object.freeze({FOOTSTEP:12,CREATURE_VOCAL:18,ATTACK:12,HIT:12,WEAPON:12,ENVIRONMENT:12,UI:8,MAGIC:12,BOSS:8,BUILDING:8,WEATHER:8}),
  VFX:Object.freeze({CAST:12,TRAIL:10,IMPACT:16,STATUS:12,ENVIRONMENT:12,WEATHER:8,DESTRUCTION:8,BOSS:8}),
  UI:Object.freeze({ICON:24,FRAME:8,BUTTON:8,HUD:10,INVENTORY:8,MAP:8,STATUS:12,BOSS:6}),
  MOTION:Object.freeze({LOCOMOTION:8,COMBAT:10,SKILL:6,DEFENSE:5,REACTION:8,PAIR:4,ACTING:6,DEATH:4}),
  PROP:Object.freeze({FURNITURE:20,CONTAINER:10,CRAFTING:10,DECORATION:24,RESOURCE:12,INTERACTIVE:12,DESTRUCTION:8})
});

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

export function createStyleBible(input={}){
  const bible={
    styleFamily:upper(input.styleFamily||'STYLIZED_FANTASY'),
    shapeLanguage:text(input.shapeLanguage||'CLEAR_READABLE_PRIMARY_FORMS'),
    characterProportion:text(input.characterProportion||'GAME_SPECIFIC'),
    silhouetteRule:text(input.silhouetteRule||'READABLE_AT_GAME_CAMERA_DISTANCE'),
    paletteContrast:text(input.paletteContrast||'ROLE_AND_REGION_SEPARATION'),
    materialLanguage:text(input.materialLanguage||'COHESIVE_WITH_STYLE_FAMILY'),
    lightingLanguage:text(input.lightingLanguage||'SUPPORT_GAMEPLAY_READABILITY'),
    vfxShapeLanguage:text(input.vfxShapeLanguage||'MATCH_STYLE_AND_DAMAGE_ROLE'),
    animationExaggeration:text(input.animationExaggeration||'STYLE_LOCK_DEPENDENT'),
    uiLanguage:text(input.uiLanguage||'MATCH_SHAPE_PALETTE_AND_READABILITY'),
    buildingLanguage:text(input.buildingLanguage||'MATCH_WORLD_THEME_AND_CONSTRUCTION_LOGIC'),
    creatureLanguage:text(input.creatureLanguage||'BODY_PLAN_AND_SPECIES_IDENTITY_FIRST')
  };
  return Object.freeze(bible);
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
  const bible=createStyleBible({styleFamily:conceptProfile.dominantStyle,...styleBible});
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
  requirements=[],usageByAsset={},futureGameDemands=[],usageEvents=[]
}={}){
  const conceptProfile=createConceptProfile({...concept,styleFamily:concept.styleFamily||styleFamily});
  const resolvedStyle=conceptProfile.dominantStyle||upper(styleFamily);
  const coverage=scanUniversalAssetCoverage({assets,activeDemand,platform,styleFamily:resolvedStyle});
  const verified=assets.filter(asset=>normalizeRegistryAsset(asset).verified);
  const gapFill=buildAutonomousAssetGapFillPlan({
    coverageReport:coverage,verifiedAssets:verified,repositoryAssets,externalSources,signalsByKey
  });
  const visualDna=createGameVisualDNA({gameId,concept:conceptProfile,styleBible:{styleFamily:resolvedStyle,...styleBible},worldDna,...languages});
  const inferredRequirements=requirements.length?requirements:Object.entries(activeDemand).flatMap(([family,subs])=>Object.entries(subs||{}).filter(([,count])=>Number(count)>0).map(([subfamily])=>({family,subfamily,required:true})));
  const loadout=buildStudioAssetLoadout({requirements:inferredRequirements,assets,gameDna:{...visualDna,targetPlatform:upper(platform)},usageByAsset});
  const futureDemand=buildFutureAssetDemandForecast({gameDemands:futureGameDemands,coverageReport:coverage});
  const usageFeedback=summarizeVerifiedAssetUsage({events:usageEvents});
  const testbed=createStudioTestbedPlan({assetIds:loadout.selections.map(row=>row.assetId).filter(Boolean),platform,mobile:true});
  return Object.freeze({
    version:3,
    target:STUDIO_ASSET_UNIVERSE_TARGET,
    platform:upper(platform),
    concept:conceptProfile,
    conceptAxes:CONCEPT_AXES,
    styleFamilies:ASSET_STYLE_FAMILIES,
    styleBible:createStyleBible({styleFamily:resolvedStyle,...styleBible}),
    gameVisualDna:visualDna,
    loadout,
    futureDemand,
    usageFeedback,
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
