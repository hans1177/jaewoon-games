import fs from 'node:fs';
import path from 'node:path';

export const GAME_SEED_REQUIRED_FIELDS = Object.freeze([
  'GAME_CATEGORY',
  'REFERENCE_INPUTS',
  'CORE_FUN_TO_LEARN',
  'CORE_LOOP',
  'DISTINCT_IDENTITY',
  'GAMEPLAY_SKETCH',
  'MARKET_EVIDENCE_SUMMARY',
  'TARGET_AUDIENCE',
  'TARGET_SESSION_DIRECTION',
  'TARGET_SESSION_MINUTES',
  'INITIAL_TARGET_PLATFORM',
  'INITIAL_PLAY_MODE',
  'MULTIPLAYER_DESIGN_MODE',
  'CROSS_PLATFORM_EXPANSION_VALUE'
]);

export const GAME_SEED_POLICY = Object.freeze({
  policyDocument: 'COMPANY_FLOW.md',
  stage: 'BEFORE_GAME_DESIGNER_DRAFT',
  selectionMode: 'MIXED_SEED_MATERIAL_COMPOSITION',
  seedMaterialPoolTarget: 100,
  seedMaterialCombineMin: 2,
  seedMaterialCombineMax: 4,
  materialMustBeExistingGame: false,
  transformationModes: Object.freeze(['HOMAGE', 'REINTERPRETATION', 'ORIGINAL_COMPOSITION']),
  initialTargetPlatform: 'ROBLOX',
  allowedTargetPlatforms: Object.freeze(['ROBLOX', 'UNITY']),
  pausedTargetPlatforms: Object.freeze(['FORTNITE_UEFN']),
  projectMaySelectAnyAllowedPlatform: true,
  primaryPlatformIsDefaultNotLock: true,
  initialPlayMode: 'PROJECT_DEFINED',
  multiplayerModes: Object.freeze(['SINGLE','COOP','COMPETITIVE','HYBRID']),
  targetSessionMinutes: 30,
  gameplaySketchRequired: true,
  advancedGameplaySketchVersion: 3,
  advancedGameplaySketchRequiredForNewSeeds: true,
  numericMarketClaimRequiresSource: true,
  numericMarketClaimRequiresObservedAt: true,
  marketEvidenceHardPassFailGate: false
});

export const GAMEPLAY_COMPOSITION_MECHANIC_FAMILIES = Object.freeze([
  'CLASSIC_CARD',
  'CLASSIC_BOARD',
  'MODERN_BOARD',
  'ARCADE',
  'PUZZLE',
  'EXPLORATION',
  'TACTICAL_STRATEGY',
  'LIFE_SIM',
  'SOCIAL_ECONOMY',
  'COLLECTION_META',
  'CRAFT_BUILD',
  'COMPANION_PARTY'
]);

export const GAMEPLAY_NARRATIVE_DNA_FAMILIES = Object.freeze([
  'CHINESE_CLASSICAL_HISTORY',
  'CHINESE_HEROIC_ROMANCE',
  'EAST_ASIAN_MARTIAL_SECT_ABSTRACT',
  'JAPANESE_SENGOKU_SAMURAI',
  'JAPANESE_FOLKLORE_YOKAI',
  'ANCIENT_EGYPT',
  'SUMER_MESOPOTAMIA',
  'BIBLICAL_ANCIENT_NEAR_EAST',
  'MEDIEVAL_EUROPEAN_FEUDAL',
  'ISLAMIC_GOLDEN_AGE_TRADE_SCHOLARSHIP',
  'GREEK_EPIC_MYTH',
  'ROMAN_REPUBLIC_EMPIRE_HISTORY',
  'NORSE_MYTH',
  'MODERN_INDUSTRIAL_REVOLUTION',
  'MODERN_REVOLUTION_REPUBLIC',
  'MODERN_IMPERIAL_COLONIAL_HISTORY',
  'MODERN_WORLD_WAR_TOTAL_WAR',
  'MODERN_COLD_WAR_ESPIONAGE',
  'MODERN_DECOLONIZATION_STATE_BUILDING',
  'MODERN_MASS_POLITICS_PROPAGANDA',
  'MODERN_INDUSTRIAL_CAPITAL_URBAN_LABOR',
  'MODERN_DIPLOMACY_INTERNATIONAL_ORDER',
  'SHAKESPEAREAN_TRAGEDY_INTRIGUE',
  'FAIRYTALE_FOLKLORE',
  'SWASHBUCKLING_ADVENTURE',
  'DYSTOPIAN_POLITICAL_ABSTRACT',
  'HORROR_MYTH_MYSTERY',
  'DETECTIVE_MYSTERY'
]);

export const GAMEPLAY_NARRATIVE_RIGHTS_MODES = Object.freeze([
  'PUBLIC_DOMAIN_OR_HISTORICAL_STRUCTURE',
  'ABSTRACT_TECHNIQUE_ONLY',
  'ORIGINAL_SYNTHESIS'
]);

export const GAMEPLAY_STYLE_DNA_FAMILIES = Object.freeze([
  'EAST_ASIAN_CLASSICAL',
  'MEDITERRANEAN_CLASSICAL',
  'ROMAN_CIVIC_MILITARY',
  'MEDIEVAL_FORTRESS_TOWN',
  'FAIRYTALE_HANDCRAFTED',
  'GOTHIC_HORROR',
  'MYTHIC_MONUMENTAL',
  'INDUSTRIAL_REVOLUTION_URBAN',
  'MODERNIST_DYSTOPIAN',
  'WAR_TORN_MODERN',
  'MARITIME_TRADE_PORT',
  'FRONTIER_SETTLEMENT',
  'NATURAL_BIOREGIONAL',
  'ARCANE_SCHOLARLY',
  'SCIENCE_TECHNOLOGICAL',
  'MYSTERY_NOIR'
]);

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;
const isNonEmptyArray = value => Array.isArray(value) && value.length > 0;
const hasMeaningfulValue = value => {
  if (isNonEmptyString(value)) return true;
  if (isNonEmptyArray(value)) return true;
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.keys(value).length > 0;
  return false;
};
const uniq=values=>[...new Set((Array.isArray(values)?values:[]).map(value=>String(value??'').trim()).filter(Boolean))];
function legacyGameplaySketch(seed){
  const loop=uniq(seed.CORE_LOOP);
  while(loop.length<3)loop.push(['핵심 행동을 수행한다','결과로 성장·보상·선택을 얻는다','위험과 목표를 거쳐 다음 사이클로 이어진다'][loop.length]);
  return {
    version:1,
    source:'LEGACY_SEED_COMPATIBILITY_SKETCH',
    worldModel:`${String(seed.GAME_CATEGORY||'GAME')}의 핵심 행동과 목표가 실제 월드/시스템 상태 변화로 연결되는 플레이 공간`,
    actors:[`플레이어: ${loop[0]}`,'상대·위협·NPC 또는 월드 엔티티: 플레이어 행동에 실제 상태로 반응'],
    interactionChains:['대상/공간 선택 -> 실제 입력 -> 대상 또는 월드 상태 변화 -> 보상·위험·목표 결과 변화'],
    stateMachine:['START_OR_WORLD_ENTRY','REAL_PLAYER_INPUT','CORE_GAMEPLAY_ACTION','OBSERVABLE_WORLD_OR_TARGET_STATE_CHANGE','PROGRESSION_REWARD_OR_MEANINGFUL_CHOICE','RISK_FAILURE_OR_RESOURCE_PRESSURE','GOAL_OR_RETRY'],
    firstPlayableCycle:['월드/세션 진입',loop[0],loop[1],'보상 또는 의미 있는 선택 적용','위험·실패·자원 압박 경험',loop[2]],
    expansionPlan:['새 적·위협 또는 행동 패턴','새 공간·경로 또는 목표','새 상호작용 또는 전략 결과'],
    longGoalScenario:['초기 핵심 루프 완료','성장·보상으로 새 선택 개방','새 위협·공간·목표를 거쳐 중간 목표 달성'],
    validationRisks:['버튼·라벨·파일 크기만으로 구현 완료를 가장하지 않는다','반복·재시작·대기로 콘텐츠 분량을 채우지 않는다'],
  };
}

function normalizeCompatibility(seed){
  if(!seed||typeof seed!=='object'||Array.isArray(seed))return seed;
  if(!isNonEmptyArray(seed.REFERENCE_INPUTS)){
    const games=Array.isArray(seed.REFERENCE_GAMES)?seed.REFERENCE_GAMES.filter(Boolean):[];
    seed.REFERENCE_INPUTS=games.length?games.map(value=>({type:'GAME_REFERENCE',value:String(value)})):[{type:'ORIGINAL_MATERIAL',value:'legacy seed material'}];
  }
  if(!Number.isFinite(Number(seed.TARGET_SESSION_MINUTES)))seed.TARGET_SESSION_MINUTES=30;
  if(!isNonEmptyString(seed.MULTIPLAYER_DESIGN_MODE)){
    const mode=String(seed.INITIAL_PLAY_MODE||'').toUpperCase();
    seed.MULTIPLAYER_DESIGN_MODE=mode.includes('MULTI')?'HYBRID':'SINGLE';
  }
  if(!seed.GAMEPLAY_SKETCH||typeof seed.GAMEPLAY_SKETCH!=='object'||Array.isArray(seed.GAMEPLAY_SKETCH))seed.GAMEPLAY_SKETCH=legacyGameplaySketch(seed);
  return seed;
}

function validateGameplaySketch(sketch,errors){
  if(!sketch||typeof sketch!=='object'||Array.isArray(sketch)){errors.push('GAMEPLAY_SKETCH must be an object');return;}
  if(!isNonEmptyString(sketch.worldModel))errors.push('GAMEPLAY_SKETCH.worldModel is required');
  const requirements=[['actors',2],['interactionChains',1],['stateMachine',5],['firstPlayableCycle',6],['expansionPlan',3],['longGoalScenario',3],['validationRisks',2]];
  for(const [field,min] of requirements)if(!Array.isArray(sketch[field])||uniq(sketch[field]).length<min)errors.push(`GAMEPLAY_SKETCH.${field} requires at least ${min} meaningful items`);
  const version=Math.max(1,Number(sketch.version||1));
  if(version<2)return;
  if(!isNonEmptyString(sketch.playerPromise))errors.push('GAMEPLAY_SKETCH.playerPromise is required for version 2+');
  const advanced=[['funDrivers',3],['balanceRules',4],['progressionLayers',3],['completionCriteria',4],['codingGrowthHooks',4]];
  for(const [field,min] of advanced)if(!Array.isArray(sketch[field])||uniq(sketch[field]).length<min)errors.push(`GAMEPLAY_SKETCH.${field} requires at least ${min} meaningful items for version 2+`);
  const pacing=sketch.pacingPlan;
  if(!pacing||typeof pacing!=='object'||Array.isArray(pacing))errors.push('GAMEPLAY_SKETCH.pacingPlan is required for version 2+');
  else for(const field of ['first5Minutes','minutes5To15','minutes15To25','minutes25To30','midLateGame','replayMotivation'])if(!isNonEmptyString(pacing[field]))errors.push(`GAMEPLAY_SKETCH.pacingPlan.${field} is required for version 2+`);
  const flow=sketch.flowArchitecture;
  if(!flow||typeof flow!=='object'||Array.isArray(flow))errors.push('GAMEPLAY_SKETCH.flowArchitecture is required for version 2+');
  else{
    if(!Array.isArray(flow.flowDNA)||uniq(flow.flowDNA).length<2)errors.push('GAMEPLAY_SKETCH.flowArchitecture.flowDNA requires at least 2 flow archetypes');
    if(!Array.isArray(flow.phaseArc)||flow.phaseArc.length<3)errors.push('GAMEPLAY_SKETCH.flowArchitecture.phaseArc requires EARLY/MID/LATE structure');
    const quality=flow.qualityGrowthContract;
    if(!quality||typeof quality!=='object'||Array.isArray(quality))errors.push('GAMEPLAY_SKETCH.flowArchitecture.qualityGrowthContract is required');
    else{
      if(!Array.isArray(quality.funDrivers)||uniq(quality.funDrivers).length<3)errors.push('GAMEPLAY_SKETCH.flowArchitecture.qualityGrowthContract.funDrivers requires at least 3 items');
      if(!Array.isArray(quality.balanceRules)||uniq(quality.balanceRules).length<4)errors.push('GAMEPLAY_SKETCH.flowArchitecture.qualityGrowthContract.balanceRules requires at least 4 items');
      if(!Array.isArray(quality.expansionRules)||uniq(quality.expansionRules).length<4)errors.push('GAMEPLAY_SKETCH.flowArchitecture.qualityGrowthContract.expansionRules requires at least 4 items');
      if(!Array.isArray(quality.completionCriteria)||uniq(quality.completionCriteria).length<4)errors.push('GAMEPLAY_SKETCH.flowArchitecture.qualityGrowthContract.completionCriteria requires at least 4 items');
      if(quality.codingGrowthContract?.dataDrivenExtensionPreferred!==true)errors.push('GAMEPLAY_SKETCH.flowArchitecture.qualityGrowthContract.codingGrowthContract.dataDrivenExtensionPreferred must be true');
    }
    const assetRequirements=Array.isArray(flow.assetFlow?.requirements)?flow.assetFlow.requirements:[];
    if(assetRequirements.length<3)errors.push('GAMEPLAY_SKETCH.flowArchitecture.assetFlow.requirements requires at least 3 visual-role requirements');
    for(const row of assetRequirements){
      if(row?.assetIdPinned===true||isNonEmptyString(row?.assetId))errors.push('GAMEPLAY_SKETCH flow asset requirements may not pin internal asset ids');
      if(row?.gameplayAuthority===true||row?.balanceAuthority===true||row?.saveAuthority===true||row?.networkingAuthority===true)errors.push('GAMEPLAY_SKETCH flow asset requirements may not own gameplay/balance/save/network authority');
      if(row?.resolution&&String(row.resolution)!=='LATEST_COMPATIBLE_INTERNAL_ASSET_AT_EXECUTION_TIME')errors.push('GAMEPLAY_SKETCH flow asset requirement resolution must use latest compatible internal asset at execution time');
    }
  }

  if(version<3)return;

  const composition=sketch.compositionDepth;
  if(!composition||typeof composition!=='object'||Array.isArray(composition)){
    errors.push('GAMEPLAY_SKETCH.compositionDepth is required for version 3+');
  }else{
    if(!isNonEmptyString(composition.mainContent))errors.push('GAMEPLAY_SKETCH.compositionDepth.mainContent is required for version 3+');
    if(!isNonEmptyString(composition.conceptFusion))errors.push('GAMEPLAY_SKETCH.compositionDepth.conceptFusion is required for version 3+');
    const depthArrays=[
      ['majorSubSystems',3],
      ['extensionSystems',6],
      ['crossSystemCombinations',4],
      ['hiddenCombinations',2],
      ['growthMutations',2],
      ['legacyContentRevisitHooks',2],
      ['mechanicDiversitySources',3]
    ];
    for(const [field,min] of depthArrays){
      if(!Array.isArray(composition[field])||uniq(composition[field]).length<min)errors.push(`GAMEPLAY_SKETCH.compositionDepth.${field} requires at least ${min} meaningful items for version 3+`);
    }
    if(!isNonEmptyString(composition.endgameFusion))errors.push('GAMEPLAY_SKETCH.compositionDepth.endgameFusion is required for version 3+');
    const familySet=new Set(GAMEPLAY_COMPOSITION_MECHANIC_FAMILIES);
    for(const family of uniq(composition.mechanicDiversitySources)){
      if(!familySet.has(family))errors.push(`GAMEPLAY_SKETCH.compositionDepth.mechanicDiversitySources invalid family: ${family}`);
    }
  }

  const narrative=sketch.narrativeDepth;
  if(!narrative||typeof narrative!=='object'||Array.isArray(narrative)){
    errors.push('GAMEPLAY_SKETCH.narrativeDepth is required for version 3+');
    return;
  }
  if(typeof narrative.applicable!=='boolean')errors.push('GAMEPLAY_SKETCH.narrativeDepth.applicable boolean is required for version 3+');
  if(!isNonEmptyString(narrative.storyWeight)||!['LIGHT','MEDIUM','HEAVY'].includes(String(narrative.storyWeight).toUpperCase()))errors.push('GAMEPLAY_SKETCH.narrativeDepth.storyWeight must be LIGHT/MEDIUM/HEAVY');
  if(!isNonEmptyString(narrative.worldConflict))errors.push('GAMEPLAY_SKETCH.narrativeDepth.worldConflict is required for version 3+');
  if(!isNonEmptyString(narrative.mainStoryArc))errors.push('GAMEPLAY_SKETCH.narrativeDepth.mainStoryArc is required for version 3+');
  if(narrative.applicable===true){
    const narrativeArrays=[
      ['narrativeDnaSources',2],
      ['npcRelationshipWeb',2],
      ['companionArcs',1],
      ['mainSubquestLinks',2],
      ['foreshadowPayoffs',2],
      ['factionCultureHooks',2],
      ['historicalMythReinterpretations',2],
      ['worldbuildingFusion',3],
      ['storySystemLinks',3],
      ['contentCausalityLinks',4],
      ['worldEvolutionHooks',2],
      ['culturalRespectRules',3]
    ];
    for(const [field,min] of narrativeArrays){
      if(!Array.isArray(narrative[field])||uniq(narrative[field]).length<min)errors.push(`GAMEPLAY_SKETCH.narrativeDepth.${field} requires at least ${min} meaningful items for version 3+`);
    }
    const narrativeFamilySet=new Set(GAMEPLAY_NARRATIVE_DNA_FAMILIES);
    for(const family of uniq(narrative.narrativeDnaSources)){
      if(!narrativeFamilySet.has(family))errors.push(`GAMEPLAY_SKETCH.narrativeDepth.narrativeDnaSources invalid family: ${family}`);
    }
    const rightsSet=new Set(GAMEPLAY_NARRATIVE_RIGHTS_MODES);
    for(const mode of uniq(narrative.rightsModes)){
      if(!rightsSet.has(mode))errors.push(`GAMEPLAY_SKETCH.narrativeDepth.rightsModes invalid mode: ${mode}`);
    }
    if(!Array.isArray(narrative.rightsModes)||uniq(narrative.rightsModes).length<1)errors.push('GAMEPLAY_SKETCH.narrativeDepth.rightsModes requires at least 1 rights mode');
  }
}

  const style=sketch.styleWorldDepth;
  if(!style||typeof style!=='object'||Array.isArray(style)){
    errors.push('GAMEPLAY_SKETCH.styleWorldDepth is required for version 3+');
    return;
  }
  const styleRequiredStrings=['styleFusion','architectureSettlement','environmentBiomes','materialPropLanguage','characterCostumeSilhouette','paletteLightingWeather','backgroundStorytelling'];
  for(const field of styleRequiredStrings)if(!isNonEmptyString(style[field]))errors.push(`GAMEPLAY_SKETCH.styleWorldDepth.${field} is required for version 3+`);
  const styleArrays=[['styleDnaSources',2],['regionalStyleVariation',3],['gameplayReadabilityLinks',3],['styleExpansionHooks',2],['artRightsRules',3]];
  for(const [field,min] of styleArrays){
    if(!Array.isArray(style[field])||uniq(style[field]).length<min)errors.push(`GAMEPLAY_SKETCH.styleWorldDepth.${field} requires at least ${min} meaningful items for version 3+`);
  }
  const styleFamilySet=new Set(GAMEPLAY_STYLE_DNA_FAMILIES);
  for(const family of uniq(style.styleDnaSources)){
    if(!styleFamilySet.has(family))errors.push(`GAMEPLAY_SKETCH.styleWorldDepth.styleDnaSources invalid family: ${family}`);
  }

function validateMarketNumericClaims(summary, errors) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return;
  const claims = Array.isArray(summary.numericClaims) ? summary.numericClaims : [];
  for (let i = 0; i < claims.length; i += 1) {
    const claim = claims[i];
    if (!claim || typeof claim !== 'object') {
      errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}] must be an object`);
      continue;
    }
    if (!hasMeaningfulValue(claim.value)) errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}].value is required`);
    if (!isNonEmptyString(claim.source)) errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}].source is required for numeric claims`);
    if (!isNonEmptyString(claim.observedAt)) errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}].observedAt is required for numeric claims`);
  }
}

export function validateGameSeed(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { pass: false, errors: ['GAME_SEED must be a JSON object'] };
  const seed=normalizeCompatibility(input);

  for (const field of GAME_SEED_REQUIRED_FIELDS) if (!hasMeaningfulValue(seed[field])) errors.push(`${field} is required`);

  if (!isNonEmptyArray(seed.REFERENCE_INPUTS)) errors.push('REFERENCE_INPUTS must contain at least one game/non-game/original material reference');
  if(seed.SEED_MATERIAL_IDS!==undefined){
    if(!Array.isArray(seed.SEED_MATERIAL_IDS)||seed.SEED_MATERIAL_IDS.length<2||seed.SEED_MATERIAL_IDS.length>4)errors.push('SEED_MATERIAL_IDS must contain 2 to 4 material ids');
  }
  if(Number(seed.TARGET_SESSION_MINUTES)!==30)errors.push('TARGET_SESSION_MINUTES must be exactly 30');
  if(!GAME_SEED_POLICY.multiplayerModes.includes(String(seed.MULTIPLAYER_DESIGN_MODE||'').toUpperCase()))errors.push(`MULTIPLAYER_DESIGN_MODE must be one of ${GAME_SEED_POLICY.multiplayerModes.join(', ')}`);

  if (seed.INITIAL_TARGET_PLATFORM !== undefined) {
    const platform = String(seed.INITIAL_TARGET_PLATFORM).trim().toUpperCase();
    if (!GAME_SEED_POLICY.allowedTargetPlatforms.includes(platform)) errors.push(`INITIAL_TARGET_PLATFORM must be one of ${GAME_SEED_POLICY.allowedTargetPlatforms.join(', ')}`);
  }
  if (seed.INITIAL_PLAY_MODE !== undefined && !isNonEmptyString(seed.INITIAL_PLAY_MODE)) errors.push('INITIAL_PLAY_MODE must be project-defined and non-empty');

  validateGameplaySketch(seed.GAMEPLAY_SKETCH,errors);
  validateMarketNumericClaims(seed.MARKET_EVIDENCE_SUMMARY, errors);
  if (seed.DIRECT_COPY === true || seed.COPY_SOURCE_CODE === true || seed.COPY_ASSETS === true) errors.push('direct copying of source code or protected expression/assets is forbidden');

  return { pass: errors.length === 0, errors };
}

export function assertGameSeed(seed) {
  const result = validateGameSeed(seed);
  if (!result.pass) throw new Error(`GAME_SEED_CONTRACT_FAILED\n- ${result.errors.join('\n- ')}`);
  return seed;
}

export function readAndAssertGameSeed(file) {
  const absolute = path.resolve(file);
  const seed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  assertGameSeed(seed);
  return seed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {console.error('Usage: node tools/company-game-seed-contract.mjs <game-seed.json>');process.exit(2);}
  try {
    const seed=readAndAssertGameSeed(file);
    console.log('GAME_SEED_CONTRACT=PASS');
    console.log(`POLICY_DOCUMENT=${GAME_SEED_POLICY.policyDocument}`);
    console.log(`GAME_SEED_STAGE=${GAME_SEED_POLICY.stage}`);
    console.log(`SEED_MATERIAL_POOL_TARGET=${GAME_SEED_POLICY.seedMaterialPoolTarget}`);
    console.log(`GAMEPLAY_SKETCH_SOURCE=${seed.GAMEPLAY_SKETCH?.source||'UNKNOWN'}`);
    console.log(`TARGET_SESSION_MINUTES=${GAME_SEED_POLICY.targetSessionMinutes}`);
  } catch (error) {console.error(String(error?.message || error));process.exit(1);}
}
