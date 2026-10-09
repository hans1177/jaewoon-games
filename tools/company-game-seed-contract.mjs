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
  advancedGameplaySketchVersion: 5,
  advancedGameplaySketchRequiredForNewSeeds: true,
  numericMarketClaimRequiresSource: true,
  numericMarketClaimRequiresObservedAt: true,
  marketEvidenceHardPassFailGate: false
});

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
  if(version>=3){
    const identity=sketch.identityCore;
    if(!identity||typeof identity!=='object'||Array.isArray(identity))errors.push('GAMEPLAY_SKETCH.identityCore is required for version 3+');
    else{
      for(const field of ['oneLineFantasy','playerRole','representativeAction','representativeChoice','signatureWorldRule','growthIdentity','genreAdaptationRule'])if(!isNonEmptyString(identity[field]))errors.push(`GAMEPLAY_SKETCH.identityCore.${field} is required for version 3+`);
      if(!Array.isArray(identity.signatureSystemPromise)||uniq(identity.signatureSystemPromise).length<1||uniq(identity.signatureSystemPromise).length>2)errors.push('GAMEPLAY_SKETCH.identityCore.signatureSystemPromise requires 1 to 2 items');
      const coherence=identity.identityCoherence;
      if(!coherence||typeof coherence!=='object'||Array.isArray(coherence))errors.push('GAMEPLAY_SKETCH.identityCore.identityCoherence is required for version 3+');
      else for(const field of ['worldCulture','visualLanguage','audioLanguage','enemyItemNpcCoherence'])if(!isNonEmptyString(coherence[field]))errors.push(`GAMEPLAY_SKETCH.identityCore.identityCoherence.${field} is required for version 3+`);
      const test=identity.threeSentenceTest;
      if(!test||typeof test!=='object'||Array.isArray(test))errors.push('GAMEPLAY_SKETCH.identityCore.threeSentenceTest is required for version 3+');
      else for(const field of ['whatGame','whatDifferent','whatGrowthUnlocks'])if(!isNonEmptyString(test[field]))errors.push(`GAMEPLAY_SKETCH.identityCore.threeSentenceTest.${field} is required for version 3+`);
    }
  }
  if(version>=4){
    const grammar=sketch.novelGameGrammar;
    if(!grammar||typeof grammar!=='object'||Array.isArray(grammar))errors.push('GAMEPLAY_SKETCH.novelGameGrammar is required for version 4+');
    else{
      for(const field of ['familiarAnchor','brokenGenreAssumption','newPrimaryVerb','worldRule','culturalAbstractionRule'])if(!isNonEmptyString(grammar[field]))errors.push(`GAMEPLAY_SKETCH.novelGameGrammar.${field} is required for version 4+`);
      if(!Array.isArray(grammar.toneBlend)||uniq(grammar.toneBlend).length<1)errors.push('GAMEPLAY_SKETCH.novelGameGrammar.toneBlend requires at least 1 tone');
      if(!Array.isArray(grammar.causalDNAs)||grammar.causalDNAs.length<2)errors.push('GAMEPLAY_SKETCH.novelGameGrammar.causalDNAs requires at least 2 items');
      if(!Array.isArray(grammar.causalFusion)||uniq(grammar.causalFusion).length<2)errors.push('GAMEPLAY_SKETCH.novelGameGrammar.causalFusion requires at least 2 items');
      if(!grammar.irreducibilityTest||!isNonEmptyString(grammar.irreducibilityTest.verdict))errors.push('GAMEPLAY_SKETCH.novelGameGrammar.irreducibilityTest is required');
      const bindings=grammar.storyWorldBindings;
      if(!bindings||typeof bindings!=='object'||Array.isArray(bindings))errors.push('GAMEPLAY_SKETCH.novelGameGrammar.storyWorldBindings is required');
      else for(const field of ['emotionalConflict','characterRule','monsterRule','regionRule','storyRule','plausibility'])if(!isNonEmptyString(bindings[field]))errors.push(`GAMEPLAY_SKETCH.novelGameGrammar.storyWorldBindings.${field} is required`);
      const fusion=grammar.gameplaySystemFusion;
      if(!fusion||typeof fusion!=='object'||Array.isArray(fusion))errors.push('GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion is required');
      else{
        if(fusion.formula!=='MAIN × A × B × c')errors.push('GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.formula must be MAIN × A × B × c');
        if(!fusion.main||!isNonEmptyString(fusion.main.name)||!isNonEmptyString(fusion.main.playerAction)||!isNonEmptyString(fusion.main.stateContribution))errors.push('GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.main is incomplete');
        const axes=Array.isArray(fusion.majorAxes)?fusion.majorAxes:[];
        const keys=axes.map(row=>String(row?.key||'').toUpperCase());
        if(axes.length!==2||new Set(keys).size!==2||!['A','B'].every(key=>keys.includes(key)))errors.push('GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.majorAxes must be exactly A/B');
        for(const row of axes)if(!isNonEmptyString(row?.name)||!isNonEmptyString(row?.purpose)||!isNonEmptyString(row?.playerChoice)||!isNonEmptyString(row?.stateContribution))errors.push(`GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion major axis ${row?.key||'?'} is incomplete`);
        const subs=Array.isArray(fusion.subElements)?fusion.subElements:[];
        if(subs.length<2)errors.push('GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.subElements requires at least 2 c elements');
        for(const row of subs){
          const supports=uniq(row?.supports).filter(value=>['MAIN','A','B'].includes(value));
          if(!isNonEmptyString(row?.name)||!isNonEmptyString(row?.role)||!isNonEmptyString(row?.variationEffect)||supports.length<1)errors.push(`GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion c sub-element ${row?.name||'?'} is incomplete`);
        }
        if(!Array.isArray(fusion.crossSystemRules)||uniq(fusion.crossSystemRules).length<4)errors.push('GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.crossSystemRules requires at least 4 items');
        if(version>=5){
          if(fusion.formula!=='MAIN × A × B × C')errors.push('GAMEPLAY_SKETCH grammar V5 requires MAIN × A × B × C');
          for(const row of axes){
            for(const field of ['systemFamily','sourceMaterial','sourceDomain','materialRule']){
              if(!isNonEmptyString(row?.[field]))errors.push(`GAMEPLAY_SKETCH A/B ${row?.key||'?'} missing ${field}: system plus unique creative source required`);
            }
          }
          const c=fusion.themeFusion,themes=Array.isArray(c?.themes)?c.themes:[];
          if(themes.length!==2||themes.some(row=>!isNonEmptyString(row?.name)||!isNonEmptyString(row?.causalEffect)||!['GENRE','MATERIAL'].includes(row?.kind))||!themes.some(row=>row?.kind==='GENRE'))errors.push('GAMEPLAY_SKETCH C requires exactly two creative themes with at least one GENRE');
          if(!isNonEmptyString(c?.jointWorldRule)||!isNonEmptyString(c?.abGameplayEffect))errors.push('GAMEPLAY_SKETCH C themes must causally change A/B gameplay and story/world');
          if(!isNonEmptyString(fusion.main?.name)||!isNonEmptyString(fusion.main?.purpose))errors.push('GAMEPLAY_SKETCH MAIN game topic/identity missing');
        }
      }
      const delve=grammar.delveLayer;
      if(!delve||typeof delve!=='object'||Array.isArray(delve))errors.push('GAMEPLAY_SKETCH.novelGameGrammar.delveLayer is required');
      else{
        if(delve.formulaSuffix!=='+ @'||delve.role!=='DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS')errors.push('GAMEPLAY_SKETCH.novelGameGrammar.delveLayer must be + @ and not a general system axis');
        if(!Array.isArray(delve.elements)||delve.elements.length<4)errors.push('GAMEPLAY_SKETCH.novelGameGrammar.delveLayer.elements requires at least 4 @ elements');
        for(const row of delve.elements||[]){
          const links=uniq(row?.connectsTo).filter(value=>['MAIN','A','B','c'].includes(value));
          if(!isNonEmptyString(row?.name)||!isNonEmptyString(row?.discoveryCondition)||!isNonEmptyString(row?.masteryOrInsight)||!isNonEmptyString(row?.gameplayEffect)||links.length<2)errors.push(`GAMEPLAY_SKETCH.novelGameGrammar.delveLayer element ${row?.name||'?'} is incomplete`);
        }
      }
      const emergent=grammar.emergentGenre;
      if(!emergent||typeof emergent!=='object'||Array.isArray(emergent))errors.push('GAMEPLAY_SKETCH.novelGameGrammar.emergentGenre is required');
      else{
        for(const field of ['name','definition','whyNotSingleConventionalGenre'])if(!isNonEmptyString(emergent[field]))errors.push(`GAMEPLAY_SKETCH.novelGameGrammar.emergentGenre.${field} is required`);
        if(emergent.grammarFormula!==(version>=5?'MAIN × A × B × C + @':'MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @'))errors.push('GAMEPLAY_SKETCH.novelGameGrammar.emergentGenre.grammarFormula is invalid');
        if(emergent.categoryRole!=='SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE')errors.push('GAMEPLAY_SKETCH.novelGameGrammar.emergentGenre.categoryRole must mark category as hint only');
      }
      if(!Array.isArray(grammar.expansionVectors)||uniq(grammar.expansionVectors).length<4)errors.push('GAMEPLAY_SKETCH.novelGameGrammar.expansionVectors requires at least 4 items');
    }
  }
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
