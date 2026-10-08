// 파일명: tools/company-game-seed-bootstrap.mjs
// 임포트
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {
  DEFAULT_SEED_CATEGORIES,
  SEED_MATERIAL_DYNAMIC_SIGNALS,
  CAUSAL_DNA_LIBRARY,
  loadSeedState,
  saveSeedState,
  pendingPortfolioSeedRequests,
  fulfillPortfolioSeedRequest,
  ensureSeedMaterialPool,
  resolveSeedMaterialCompositionCount,
  composeSeedMaterials,
  consumeSeedMaterials,
  releaseSeedMaterialReservations,
  seedPlatform,
} from './game-seed-state.mjs';
import {assertGameSeed} from './company-game-seed-contract.mjs';
import {
  categorySeedProfile,
  loadPlatformProfiles,
  normalizeSeedPlatform,
  representativeCategoriesForPlatform,
} from './game-seed-platform-profile.mjs';
import {buildGameFlowArchitecture} from './company-vibe2-game-flow-architect.mjs';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const slugify=v=>clean(v).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42);
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};

const directive=readJson('company-directive.json',{});
const config=directive.gameSeed||{};
const historicalCategories=uniq(config.bootstrap?.categories||DEFAULT_SEED_CATEGORIES);
const allowedTargetPlatforms=uniq(config.allowedTargetPlatforms||['ROBLOX','UNITY','FORTNITE_UEFN']).map(normalizeSeedPlatform).filter(Boolean);
const defaultTargetPlatform=allowedTargetPlatforms.includes(normalizeSeedPlatform(config.initialTargetPlatform))?normalizeSeedPlatform(config.initialTargetPlatform):'ROBLOX';
const defaultPlayMode=clean(config.initialPlayMode)||'PROJECT_DEFINED';
const state=loadSeedState();
const ownerQueueFile=clean(process.env.OWNER_DESIGN_RESET_QUEUE_FILE)||'owner-design-reset-queue.json';
const ownerQueue=readJson(ownerQueueFile,{requests:[]})||{requests:[]};
function isOwnerPreservationSeedRequest(request){
  const seed=request?.seed;
  return clean(request?.status||'ACTIVE').toUpperCase()==='ACTIVE'
    && seed&&typeof seed==='object'&&!Array.isArray(seed)
    && seed.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true
    && clean(seed.OWNER_REBUILD_MODE).toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';
}
function materializeOwnerPreservationSeeds({timestamp=new Date().toISOString()}={}){
  const requests=Array.isArray(ownerQueue?.requests)?ownerQueue.requests.filter(isOwnerPreservationSeedRequest):[];
  const materialized=[];
  for(const request of requests){
    const seed=structuredClone(request.seed);
    assertGameSeed(seed);
    const gameId=clean(seed.gameId);
    if(!gameId)throw new Error('OWNER_PRESERVATION_GAME_ID_REQUIRED');
    const index=(state.seeds||[]).findIndex(row=>clean(row?.gameId)===gameId&&!['DISCARDED','REMOVED'].includes(clean(row?.status).toUpperCase()));
    if(index>=0){
      const current=state.seeds[index];
      if(clean(current?.seedId)!==clean(seed.seedId))throw new Error(`OWNER_PRESERVATION_ACTIVE_SEED_CONFLICT ${gameId}`);
      state.seeds[index]={...current,...seed,updatedAt:timestamp};
    }else{
      state.seeds.push({...seed,createdAt:seed.createdAt||timestamp,updatedAt:timestamp});
    }
    state.categories=uniq([...(state.categories||[]),seed.GAME_CATEGORY]);
    materialized.push(gameId);
  }
  state.ownerPreservationIntake={
    source:ownerQueueFile,
    queueVersion:Number(ownerQueue?.version)||null,
    updatedAt:timestamp,
    gameIds:uniq(materialized),
  };
  return uniq(materialized);
}
state.categories=uniq([...(state.categories||[]),...historicalCategories]);
ensureSeedMaterialPool(state);
state.seedMaterialPolicy.bootstrapCategories=[...historicalCategories];
state.seedMaterialPolicy.bootstrapCategoryRole='HISTORICAL_BASELINE_AND_FALLBACK_ONLY';

const evidenceFile=clean(process.env.GAME_SEED_MARKET_EVIDENCE_FILE)||'game-seed-market-evidence.json';
const marketInput=readJson(evidenceFile,{categories:{}})||{categories:{}};
const platformProfiles=loadPlatformProfiles(clean(process.env.GAME_SEED_PLATFORM_PROFILE_FILE)||undefined);
const top30ManifestFile=clean(process.env.GAME_SEED_TOP30_MANIFEST)||'test-game-candidates.json';
const top30Manifest=readJson(top30ManifestFile,{candidates:[]})||{candidates:[]};
const top30GameIds=uniq((top30Manifest.candidates||[]).map(row=>row?.gameId||row?.id));
const top30GameIdSet=new Set(top30GameIds);
const model=clean(process.env.GAME_SEED_LOCAL_MODEL)||clean(directive.ai?.modelPool?.[0])||'qwen3:0.6b';
const MODEL_TIMEOUT_MS=Math.max(30000,Number(process.env.GAME_SEED_MODEL_TIMEOUT_MS||240000));
const IDLE_TARGET_COUNT=Math.max(0,Math.min(3,Number(process.env.GAME_SEED_IDLE_TARGET_COUNT||0)));
const FORCE_TARGET_COUNT=Math.max(0,Math.min(3,Number(process.env.GAME_SEED_FORCE_TARGET_COUNT||0)));

// 설계 스키마: 개수와 문법은 유지하고 규칙 설명의 공간만 확대한다.
const TEXT={type:'string',maxLength:2400};
const SKETCH_ITEM={type:'string',minLength:1,maxLength:1200};
const CAUSAL_DNA_ITEM_SCHEMA={
  type:'object',
  required:['id','source','principle','gameplayConversion','fusionRole'],
  properties:{id:{type:'string',minLength:3,maxLength:120},source:{type:'string',minLength:3,maxLength:180},principle:{type:'string',minLength:10,maxLength:600},gameplayConversion:{type:'string',minLength:10,maxLength:700},fusionRole:{type:'string',minLength:10,maxLength:500}},
  additionalProperties:false
};
const SYSTEM_AXIS_SCHEMA={
  type:'object',
  required:['key','name','purpose','playerChoice','stateContribution'],
  properties:{
    key:{type:'string',enum:['A','B']},
    name:{type:'string',minLength:2,maxLength:180},
    purpose:{type:'string',minLength:10,maxLength:600},
    playerChoice:{type:'string',minLength:10,maxLength:600},
    stateContribution:{type:'string',minLength:10,maxLength:700}
  },
  additionalProperties:false
};
const SUB_ELEMENT_SCHEMA={
  type:'object',
  required:['name','role','supports','variationEffect'],
  properties:{
    name:{type:'string',minLength:2,maxLength:180},
    role:{type:'string',minLength:10,maxLength:600},
    supports:{type:'array',minItems:1,maxItems:3,uniqueItems:true,items:{type:'string',enum:['MAIN','A','B']}},
    variationEffect:{type:'string',minLength:10,maxLength:700}
  },
  additionalProperties:false
};
const DELVE_ELEMENT_SCHEMA={
  type:'object',
  required:['name','discoveryCondition','masteryOrInsight','gameplayEffect','connectsTo'],
  properties:{
    name:{type:'string',minLength:2,maxLength:180},
    discoveryCondition:{type:'string',minLength:10,maxLength:600},
    masteryOrInsight:{type:'string',minLength:10,maxLength:700},
    gameplayEffect:{type:'string',minLength:10,maxLength:700},
    connectsTo:{type:'array',minItems:2,maxItems:4,uniqueItems:true,items:{type:'string',enum:['MAIN','A','B','c']}}
  },
  additionalProperties:false
};
const NOVEL_GAME_GRAMMAR_SCHEMA={
  type:'object',
  required:['toneBlend','familiarAnchor','causalDNAs','brokenGenreAssumption','newPrimaryVerb','worldRule','causalFusion','irreducibilityTest','storyWorldBindings','gameplaySystemFusion','delveLayer','emergentGenre','expansionVectors','culturalAbstractionRule'],
  properties:{
    toneBlend:{type:'array',minItems:1,maxItems:4,uniqueItems:true,items:{type:'string',minLength:2,maxLength:120}},
    familiarAnchor:{type:'string',minLength:15,maxLength:700},
    causalDNAs:{type:'array',minItems:2,maxItems:4,items:CAUSAL_DNA_ITEM_SCHEMA},
    brokenGenreAssumption:{type:'string',minLength:15,maxLength:700},
    newPrimaryVerb:{type:'string',minLength:8,maxLength:300},
    worldRule:{type:'string',minLength:15,maxLength:700},
    causalFusion:{type:'array',minItems:2,maxItems:6,uniqueItems:true,items:{type:'string',minLength:15,maxLength:700}},
    irreducibilityTest:{type:'object',required:['removeFirstAxis','removeSecondAxis','verdict'],properties:{removeFirstAxis:{type:'string',minLength:15,maxLength:600},removeSecondAxis:{type:'string',minLength:15,maxLength:600},verdict:{type:'string',minLength:15,maxLength:600}},additionalProperties:false},
    storyWorldBindings:{type:'object',required:['emotionalConflict','characterRule','monsterRule','regionRule','storyRule','plausibility'],properties:{emotionalConflict:{type:'string',minLength:15,maxLength:700},characterRule:{type:'string',minLength:15,maxLength:700},monsterRule:{type:'string',minLength:15,maxLength:700},regionRule:{type:'string',minLength:15,maxLength:700},storyRule:{type:'string',minLength:15,maxLength:700},plausibility:{type:'string',minLength:15,maxLength:700}},additionalProperties:false},
    gameplaySystemFusion:{type:'object',required:['formula','main','majorAxes','subElements','crossSystemRules'],properties:{
      formula:{type:'string',enum:['MAIN × A × B × c']},
      main:{type:'object',required:['name','purpose','playerAction','stateContribution'],properties:{name:{type:'string',minLength:2,maxLength:180},purpose:{type:'string',minLength:10,maxLength:600},playerAction:{type:'string',minLength:10,maxLength:600},stateContribution:{type:'string',minLength:10,maxLength:700}},additionalProperties:false},
      majorAxes:{type:'array',minItems:2,maxItems:2,items:SYSTEM_AXIS_SCHEMA},
      subElements:{type:'array',minItems:2,maxItems:6,items:SUB_ELEMENT_SCHEMA},
      crossSystemRules:{type:'array',minItems:4,maxItems:10,uniqueItems:true,items:{type:'string',minLength:15,maxLength:700}}
    },additionalProperties:false},
    delveLayer:{type:'object',required:['formulaSuffix','role','elements'],properties:{
      formulaSuffix:{type:'string',enum:['+ @']},
      role:{type:'string',enum:['DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS']},
      elements:{type:'array',minItems:4,maxItems:10,items:DELVE_ELEMENT_SCHEMA}
    },additionalProperties:false},
    emergentGenre:{type:'object',required:['name','definition','whyNotSingleConventionalGenre','grammarFormula','categoryRole'],properties:{
      name:{type:'string',minLength:4,maxLength:180},
      definition:{type:'string',minLength:20,maxLength:800},
      whyNotSingleConventionalGenre:{type:'string',minLength:20,maxLength:800},
      grammarFormula:{type:'string',enum:['MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @']},
      categoryRole:{type:'string',enum:['SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE']}
    },additionalProperties:false},
    expansionVectors:{type:'array',minItems:4,maxItems:8,uniqueItems:true,items:{type:'string',minLength:15,maxLength:700}},
    culturalAbstractionRule:{type:'string',minLength:15,maxLength:700}
  },
  additionalProperties:false
};
const IDENTITY_CORE_SCHEMA={
  type:'object',
  required:['oneLineFantasy','playerRole','representativeAction','representativeChoice','signatureWorldRule','signatureSystemPromise','growthIdentity','identityCoherence','threeSentenceTest','genreAdaptationRule'],
  properties:{
    oneLineFantasy:{type:'string',minLength:20,maxLength:700},
    playerRole:{type:'string',minLength:10,maxLength:500},
    representativeAction:{type:'string',minLength:10,maxLength:500},
    representativeChoice:{type:'string',minLength:10,maxLength:500},
    signatureWorldRule:{type:'string',minLength:10,maxLength:600},
    signatureSystemPromise:{type:'array',minItems:1,maxItems:2,uniqueItems:true,items:{type:'string',minLength:10,maxLength:500}},
    growthIdentity:{type:'string',minLength:10,maxLength:600},
    identityCoherence:{type:'object',required:['worldCulture','visualLanguage','audioLanguage','enemyItemNpcCoherence'],properties:{
      worldCulture:{type:'string',minLength:10,maxLength:500},
      visualLanguage:{type:'string',minLength:10,maxLength:500},
      audioLanguage:{type:'string',minLength:10,maxLength:500},
      enemyItemNpcCoherence:{type:'string',minLength:10,maxLength:600}
    },additionalProperties:false},
    threeSentenceTest:{type:'object',required:['whatGame','whatDifferent','whatGrowthUnlocks'],properties:{
      whatGame:{type:'string',minLength:15,maxLength:500},
      whatDifferent:{type:'string',minLength:15,maxLength:500},
      whatGrowthUnlocks:{type:'string',minLength:15,maxLength:500}
    },additionalProperties:false},
    genreAdaptationRule:{type:'string',minLength:10,maxLength:500}
  },
  additionalProperties:false
};
const PACING_PLAN_SCHEMA={
  type:'object',
  required:['first5Minutes','minutes5To15','minutes15To25','minutes25To30','midLateGame','replayMotivation'],
  properties:{
    first5Minutes:SKETCH_ITEM,
    minutes5To15:SKETCH_ITEM,
    minutes15To25:SKETCH_ITEM,
    minutes25To30:SKETCH_ITEM,
    midLateGame:SKETCH_ITEM,
    replayMotivation:SKETCH_ITEM,
  },
  additionalProperties:false,
};
const GAMEPLAY_SKETCH_SCHEMA={
  type:'object',
  required:['worldModel','actors','interactionChains','stateMachine','firstPlayableCycle','identityCore','novelGameGrammar','playerPromise','funDrivers','balanceRules','pacingPlan','progressionLayers','expansionPlan','longGoalScenario','completionCriteria','codingGrowthHooks','validationRisks'],
  properties:{
    worldModel:{type:'string',minLength:1,maxLength:1800},
    identityCore:IDENTITY_CORE_SCHEMA,
    novelGameGrammar:NOVEL_GAME_GRAMMAR_SCHEMA,
    actors:{type:'array',minItems:2,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    interactionChains:{type:'array',minItems:1,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    stateMachine:{type:'array',minItems:5,maxItems:10,uniqueItems:true,items:SKETCH_ITEM},
    firstPlayableCycle:{type:'array',minItems:6,maxItems:10,uniqueItems:true,items:SKETCH_ITEM},
    playerPromise:{type:'string',minLength:20,maxLength:700},
    funDrivers:{type:'array',minItems:3,maxItems:6,uniqueItems:true,items:SKETCH_ITEM},
    balanceRules:{type:'array',minItems:4,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    pacingPlan:PACING_PLAN_SCHEMA,
    progressionLayers:{type:'array',minItems:3,maxItems:6,uniqueItems:true,items:SKETCH_ITEM},
    expansionPlan:{type:'array',minItems:4,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    longGoalScenario:{type:'array',minItems:3,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    completionCriteria:{type:'array',minItems:4,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    codingGrowthHooks:{type:'array',minItems:4,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    validationRisks:{type:'array',minItems:2,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
  },
  additionalProperties:false,
};
const PROPOSAL_PROPERTIES={
  requestId:{type:'string',maxLength:120},
  category:{type:'string',maxLength:80},
  gameName:{type:'string',maxLength:120},
  referenceGames:{type:'array',minItems:0,maxItems:4,uniqueItems:true,items:{type:'string',maxLength:120}},
  coreFunToLearn:{type:'array',minItems:1,maxItems:6,uniqueItems:true,items:{type:'string',maxLength:300}},
  coreLoop:{type:'array',minItems:3,maxItems:8,uniqueItems:true,items:{type:'string',maxLength:300}},
  distinctIdentity:TEXT,
  targetAudience:{type:'string',maxLength:600},
  initialTargetPlatform:{type:'string',enum:allowedTargetPlatforms},
  initialPlayMode:{type:'string',minLength:1,maxLength:120},
  multiplayerDesignMode:{type:'string',enum:['SINGLE','COOP','COMPETITIVE','HYBRID']},
  crossPlatformExpansionValue:{type:'string',minLength:1,maxLength:500},
  steamExpansionPossible:{type:'string',enum:['POSSIBLE','NOT_RECOMMENDED']},
  transformationMode:{type:'string',enum:['HOMAGE','REINTERPRETATION','ORIGINAL_COMPOSITION']},
  gameplaySketch:GAMEPLAY_SKETCH_SCHEMA,
};
const REQUIRED_PROPOSAL=Object.keys(PROPOSAL_PROPERTIES);
const batchSchema=count=>({type:'object',required:['proposals'],properties:{proposals:{type:'array',minItems:count,maxItems:count,items:{type:'object',required:REQUIRED_PROPOSAL,properties:PROPOSAL_PROPERTIES,additionalProperties:false}}},additionalProperties:false});

function profileFor(platform,category){
  return categorySeedProfile({platform,category,marketEvidence:marketInput,platformProfiles})||{};
}
function sanitizeMarketEvidence(platform,category){
  const raw=profileFor(platform,category);
  const refs=Array.isArray(raw?.references)?raw.references:[];
  return {
    role:'TARGET_DESIGN_REFERENCE',
    targetMarketScope:'GLOBAL',
    countrySpecificEvidenceRole:'SECONDARY_CONTEXT_ONLY',
    hardPassFailGate:false,
    missingDataDoesNotRejectSeed:true,
    marketDataAloneCannotDiscard:true,
    available:refs.length>0,
    sourceFile:fs.existsSync(evidenceFile)?evidenceFile:null,
    platformProfileFile:'game-seed-platform-profiles.json',
    references:refs,
  };
}
function initialSerialCount(platform,category){
  return(state.seeds||[]).filter(seed=>seedPlatform(seed)===platform&&seed.GAME_CATEGORY===category).length;
}
function uniqueGameId(platform,category,name,used){
  const p=platform.toLowerCase().replace(/_/g,'-').slice(0,12);
  const c=category.toLowerCase().replace(/_/g,'-').slice(0,18);
  const n=slugify(name)||'game';
  let id=`seed-${p}-${c}-${n}`.slice(0,63),i=2;
  while(used.has(id))id=`seed-${p}-${c}-${n}-${i++}`.slice(0,63);
  used.add(id);
  return id;
}
function fallbackTitle(target){
  return `${target.category.split('_').slice(0,3).map(x=>x[0]+x.slice(1).toLowerCase()).join(' ')} Project`;
}
function conceptTokens(seedLike){
  return new Set(norm([...(seedLike.CORE_LOOP||seedLike.coreLoop||[]),seedLike.DISTINCT_IDENTITY||seedLike.distinctIdentity||''].join(' ')).split(/[^a-z0-9가-힣]+/).filter(x=>x.length>2));
}
export const GAME_SEED_CONCEPT_REUSE_SIMILARITY_THRESHOLD=0.82;
export function gameSeedConceptSimilarity(a,b){
  const A=conceptTokens(a),B=conceptTokens(b);
  if(!A.size||!B.size)return 0;
  let hit=0;
  for(const t of A)if(B.has(t))hit++;
  return hit/Math.max(A.size,B.size);
}
export function findSimilarActiveSeed(proposal,seeds=state.seeds||[],threshold=GAME_SEED_CONCEPT_REUSE_SIMILARITY_THRESHOLD){
  let best=null;
  for(const seed of seeds||[]){
    if(['DISCARDED','REMOVED'].includes(clean(seed?.status).toUpperCase()))continue;
    const score=gameSeedConceptSimilarity(seed,proposal);
    if(score<Number(threshold||0))continue;
    if(!best||score>best.score)best={seed,score};
  }
  return best;
}
function activeSeed(seed){
  return seed&&!['DISCARDED','REMOVED'].includes(clean(seed.status).toUpperCase());
}
function learningNode(platform,category=''){
  const root=state.seedMaterialLearning||{};
  const platformNode=root.platforms?.[platform]||root.byPlatform?.[platform]||{};
  const categoryNode=platformNode.categories?.[category]||root.categories?.[category]||{};
  return {root,platformNode,categoryNode};
}
function learningSignals(platform,category=''){
  const {root,platformNode,categoryNode}=learningNode(platform,category);
  return {
    preferFamilies:uniq([
      ...(root.preferSeedMaterialFamilies||[]),
      ...(platformNode.preferSeedMaterialFamilies||[]),
      ...(categoryNode.preferSeedMaterialFamilies||[]),
    ]),
    avoidFamilies:uniq([
      ...(root.avoidSeedMaterialFamilies||[]),
      ...(platformNode.avoidSeedMaterialFamilies||[]),
      ...(categoryNode.avoidSeedMaterialFamilies||[]),
    ]),
  };
}
function preferredCategories(platform){
  const {root,platformNode}=learningNode(platform);
  return uniq([...(root.preferCategories||[]),...(platformNode.preferCategories||[])]);
}
function categoryCandidates(platform){
  const profileCategories=representativeCategoriesForPlatform(directive,platform,platformProfiles);
  return uniq([
    ...preferredCategories(platform),
    ...profileCategories,
    ...(state.categories||[]),
    ...historicalCategories,
    ...DEFAULT_SEED_CATEGORIES,
  ]);
}
function categoryStats(platform,category){
  const active=(state.seeds||[]).filter(activeSeed);
  const sameCategory=active.filter(seed=>clean(seed.GAME_CATEGORY)===category).length;
  const samePlatformCategory=active.filter(seed=>seedPlatform(seed)===platform&&clean(seed.GAME_CATEGORY)===category).length;
  const top30Category=active.filter(seed=>top30GameIdSet.has(clean(seed.gameId))&&clean(seed.GAME_CATEGORY)===category).length;
  return {sameCategory,samePlatformCategory,top30Category};
}
function nextCategory(platform=defaultTargetPlatform){
  const p=normalizeSeedPlatform(platform)||defaultTargetPlatform;
  const candidates=categoryCandidates(p);
  if(!candidates.length)return historicalCategories[0]||DEFAULT_SEED_CATEGORIES[0];
  const preferred=new Set(preferredCategories(p));
  const cursor=Math.max(0,Number(state.seedMaterialPolicy?.categoryCursor||0));
  const ordered=candidates.map((category,index)=>{
    const stats=categoryStats(p,category);
    const adaptiveScore=stats.samePlatformCategory*4+stats.top30Category*5+stats.sameCategory-(preferred.has(category)?4:0);
    const rotated=(index-cursor+candidates.length)%candidates.length;
    return{category,adaptiveScore,rotated};
  }).sort((a,b)=>a.adaptiveScore-b.adaptiveScore||a.rotated-b.rotated||a.category.localeCompare(b.category));
  const selected=ordered[0]?.category||candidates[0];
  const selectedIndex=Math.max(0,candidates.indexOf(selected));
  state.seedMaterialPolicy.categoryCursor=(selectedIndex+1)%Math.max(1,candidates.length);
  state.seedMaterialPolicy.lastCategorySelection={
    mode:'ADAPTIVE_PLATFORM_LEARNING_TOP30_WITH_HISTORICAL_FALLBACK',
    platform:p,
    selected,
    candidateCount:candidates.length,
    historicalFallbackOnly:historicalCategories.includes(selected)&&!representativeCategoriesForPlatform(directive,p,platformProfiles).includes(selected)&&!preferred.has(selected),
    top30ReferenceCount:top30GameIds.length,
  };
  state.categories=uniq([...(state.categories||[]),selected]);
  return selected;
}
function makeTarget(requestId,{category=null,platform=defaultTargetPlatform,generation='MATERIAL_COMPOSITION',portfolioRequest=null,lockedPlatform=false}={}){
  const p=normalizeSeedPlatform(platform)||defaultTargetPlatform;
  const resolvedCategory=clean(category)||nextCategory(p);
  state.categories=uniq([...(state.categories||[]),resolvedCategory]);
  const profile=profileFor(p,resolvedCategory);
  const signals=learningSignals(p,resolvedCategory);
  const materialCount=resolveSeedMaterialCompositionCount(state,{platform:p,category:resolvedCategory,top30GameIds,learningSignals:signals});
  const materials=composeSeedMaterials(state,{count:materialCount,platform:p,category:resolvedCategory,top30GameIds,learningSignals:signals});
  return {
    requestId,
    category:resolvedCategory,
    platform:p,
    generation,
    portfolioRequest,
    lockedPlatform,
    materials,
    materialSelection:{
      mode:'DYNAMIC_CONTEXTUAL_2_TO_4',
      count:materials.length,
      signals:[...SEED_MATERIAL_DYNAMIC_SIGNALS],
      top30ReferenceCount:top30GameIds.length,
    },
    marketEvidence:sanitizeMarketEvidence(p,resolvedCategory),
    benchmarkCandidates:uniq(profile.benchmarkCandidates),
    requiredConceptTerms:uniq(profile.requiredConceptTerms),
    minimumCoreLoop:uniq(profile.minimumCoreLoop),
  };
}
function sketchArray(values,fallback,min,max){
  const out=uniq(values).slice(0,max);
  for(const value of fallback)if(out.length<min&&!out.includes(value))out.push(value);
  return out.slice(0,max);
}
const causalDnaById=new Map(CAUSAL_DNA_LIBRARY.map(row=>[row.id,row]));
function normalizeNovelGameGrammar(target,rawGrammar,coreLoop,identityCore){
  const raw=rawGrammar&&typeof rawGrammar==='object'&&!Array.isArray(rawGrammar)?rawGrammar:{};
  const materialIds=uniq((target.materials||[]).flatMap(row=>Array.isArray(row?.causalDNA)?row.causalDNA:[]));
  const normalized=[];
  for(const row of Array.isArray(raw.causalDNAs)?raw.causalDNAs:[]){
    const id=clean(row?.id).toUpperCase(),known=causalDnaById.get(id);if(!id)continue;
    normalized.push({id,source:clean(row?.source)||known?.source||'CULTURAL_CAUSAL_ARCHETYPE',principle:clean(row?.principle)||known?.principle||'원인과 결과가 플레이 규칙을 통해 되돌아온다.',gameplayConversion:clean(row?.gameplayConversion)||known?.gameGrammar||'플레이어 선택이 다음 상태 규칙을 바꾼다.',fusionRole:clean(row?.fusionRole)||'다른 인과 DNA와 결합해 새 게임문법을 만든다.'});
  }
  for(const id of materialIds){if(normalized.some(row=>row.id===id))continue;const known=causalDnaById.get(id);if(!known)continue;normalized.push({id:known.id,source:known.source,principle:known.principle,gameplayConversion:known.gameGrammar,fusionRole:'선택된 재료의 인과 원리를 실제 플레이 규칙으로 변환한다.'});if(normalized.length>=4)break;}
  for(const known of CAUSAL_DNA_LIBRARY){if(normalized.length>=2)break;if(!normalized.some(row=>row.id===known.id))normalized.push({id:known.id,source:known.source,principle:known.principle,gameplayConversion:known.gameGrammar,fusionRole:'보조 인과축으로 기존 게임 문법을 비튼다.'});}
  const toneBlend=sketchArray(raw.toneBlend,['GAME_SPECIFIC_TONE'],1,4);
  const ir=raw.irreducibilityTest&&typeof raw.irreducibilityTest==='object'&&!Array.isArray(raw.irreducibilityTest)?raw.irreducibilityTest:{};
  const sw=raw.storyWorldBindings&&typeof raw.storyWorldBindings==='object'&&!Array.isArray(raw.storyWorldBindings)?raw.storyWorldBindings:{};
  const fusion=raw.gameplaySystemFusion&&typeof raw.gameplaySystemFusion==='object'&&!Array.isArray(raw.gameplaySystemFusion)?raw.gameplaySystemFusion:{};
  const rawMain=fusion.main&&typeof fusion.main==='object'&&!Array.isArray(fusion.main)?fusion.main:{};
  const rawAxes=Array.isArray(fusion.majorAxes)?fusion.majorAxes:(Array.isArray(fusion.axes)?fusion.axes:[]);
  const byKey=new Map(rawAxes.map(row=>[clean(row?.key).toUpperCase(),row]));
  const primary=coreLoop[0]||identityCore.representativeAction||'핵심 행동';
  const second=coreLoop[1]||identityCore.representativeChoice||'다음 선택';
  const third=coreLoop[2]||'결과를 다음 상황에 반영한다';
  const axisFallback={
    A:{name:second,purpose:'MAIN의 결과를 다음 선택과 비용 구조로 연결하는 첫 번째 대축.',playerChoice:second,stateContribution:'MAIN의 결과를 다음 위험·보상·자원 또는 경로 상태로 바꾼다.'},
    B:{name:third,purpose:'A와 MAIN의 결과를 다른 핵심 판단 구조로 연결하는 두 번째 대축.',playerChoice:third,stateContribution:'A의 결과를 월드·상대·목표 또는 관계 상태 변화와 연결한다.'}
  };
  const axes=['A','B'].map(key=>{
    const row=byKey.get(key)||{},fb=axisFallback[key];
    return {key,name:clean(row.name)||fb.name,purpose:clean(row.purpose)||fb.purpose,playerChoice:clean(row.playerChoice)||fb.playerChoice,stateContribution:clean(row.stateContribution)||fb.stateContribution};
  });
  const rawSubElements=Array.isArray(fusion.subElements)?fusion.subElements:[];
  const subFallback=[
    {name:'상황 규칙',role:'MAIN/A/B의 선택 결과를 상황별로 다르게 만드는 보조 규칙.',supports:['MAIN','A'],variationEffect:'같은 MAIN 행동도 현재 상황 상태에 따라 비용·위험·효율이 달라진다.'},
    {name:'환경 또는 이벤트 변주',role:'A/B 관계에 일시적 조건·기회·압박을 추가하는 서브요소.',supports:['A','B'],variationEffect:'같은 A/B 조합이라도 이벤트·지역·타이밍에 따라 다른 대응을 요구한다.'},
    {name:'보조 자원 또는 정보',role:'MAIN/A/B 사이 선택의 우선순위를 바꾸는 작은 상태층.',supports:['MAIN','B'],variationEffect:'보조 정보나 자원 상태가 다음 선택 순서와 기회비용을 바꾼다.'}
  ];
  const subElements=[...rawSubElements,...subFallback].slice(0,6).map((row,i)=>({
    name:clean(row?.name)||subFallback[i%subFallback.length].name,
    role:clean(row?.role)||subFallback[i%subFallback.length].role,
    supports:uniq(row?.supports).filter(x=>['MAIN','A','B'].includes(x)).slice(0,3),
    variationEffect:clean(row?.variationEffect)||subFallback[i%subFallback.length].variationEffect
  })).map((row,i)=>({...row,supports:row.supports.length?row.supports:subFallback[i%subFallback.length].supports}));
  const gameplaySystemFusion={
    formula:'MAIN × A × B × c',
    main:{name:clean(rawMain.name)||primary,purpose:clean(rawMain.purpose)||'플레이어가 가장 반복적으로 수행하며 즉시 상태 변화를 만드는 중심 플레이.',playerAction:clean(rawMain.playerAction)||primary,stateContribution:clean(rawMain.stateContribution)||'MAIN의 결과가 A/B와 c 서브요소가 읽고 변형할 수 있는 실제 게임 상태를 만든다.'},
    majorAxes:axes,
    subElements:subElements.slice(0,Math.max(2,Math.min(6,subElements.length))),
    crossSystemRules:sketchArray(fusion.crossSystemRules,[
      'MAIN의 결과가 A의 선택 비용·위험·보상 중 하나를 바꾼다.',
      'A의 선택 결과가 B의 가능 행동·상태·우선순위를 바꾼다.',
      'c 서브요소가 MAIN/A/B의 관계를 상황별로 변주하지만 독립된 대축처럼 전체 루프를 소유하지 않는다.',
      'B와 c의 누적 결과가 다시 MAIN의 목적·효율·위험 또는 사용법을 바꿔 순환한다.'
    ],4,10)
  };
  const rawDelve=raw.delveLayer&&typeof raw.delveLayer==='object'&&!Array.isArray(raw.delveLayer)?raw.delveLayer:{};
  const rawDelveElements=Array.isArray(rawDelve.elements)?rawDelve.elements:[];
  const delveFallback=[
    {name:'숨은 교차조합',discoveryCondition:'MAIN과 A를 특정 순서나 조건으로 반복해 B의 평소와 다른 반응을 발견한다.',masteryOrInsight:'표면 규칙이 아니라 시스템 간 상태 전달 순서를 이해한다.',gameplayEffect:'같은 자원과 행동으로 새로운 해결법이나 빌드를 만든다.',connectsTo:['MAIN','A','B']},
    {name:'고급 역이용',discoveryCondition:'A의 비용이나 제약을 B 또는 c 서브요소 상태로 일부러 전환해 본다.',masteryOrInsight:'불리한 규칙도 다른 시스템에서는 자원이 될 수 있음을 파악한다.',gameplayEffect:'정석 진행과 다른 고급 운용 경로가 열린다.',connectsTo:['A','B','c']},
    {name:'재방문 재해석',discoveryCondition:'이전 선택이 누적된 뒤 과거 공간·상대·관계로 돌아간다.',masteryOrInsight:'과거 콘텐츠가 현재 상태에 따라 다른 기능과 의미를 갖는다는 것을 발견한다.',gameplayEffect:'새 통로·사건·상호작용·위험·보상 중 하나가 열린다.',connectsTo:['MAIN','c']},
    {name:'인과 문법 숨은 변형',discoveryCondition:'선택된 causalDNA 두 개 이상의 조건을 동시에 충족한다.',masteryOrInsight:'세계의 인과법칙들이 서로 상쇄·증폭·이전될 수 있음을 이해한다.',gameplayEffect:'기존 시스템 조합만으로는 나오지 않는 예외 규칙이나 특수 결과를 만든다.',connectsTo:['MAIN','A','B','c']}
  ];
  const delveElements=[...rawDelveElements,...delveFallback].slice(0,10).map((row,i)=>({
    name:clean(row?.name)||delveFallback[i%delveFallback.length].name,
    discoveryCondition:clean(row?.discoveryCondition)||delveFallback[i%delveFallback.length].discoveryCondition,
    masteryOrInsight:clean(row?.masteryOrInsight)||delveFallback[i%delveFallback.length].masteryOrInsight,
    gameplayEffect:clean(row?.gameplayEffect)||delveFallback[i%delveFallback.length].gameplayEffect,
    connectsTo:uniq(row?.connectsTo).filter(x=>['MAIN','A','B','c'].includes(x)).slice(0,4)
  })).map((row,i)=>({...row,connectsTo:row.connectsTo.length>=2?row.connectsTo:delveFallback[i%delveFallback.length].connectsTo}));
  const dnaA=normalized[0],dnaB=normalized[1];
  const emergentRaw=raw.emergentGenre&&typeof raw.emergentGenre==='object'&&!Array.isArray(raw.emergentGenre)?raw.emergentGenre:{};
  const newPrimaryVerb=clean(raw.newPrimaryVerb)||`${primary}의 결과를 이용해 다음 세계 규칙을 설계한다`;
  const emergentName=clean(emergentRaw.name)||`${newPrimaryVerb} 복합장르`;
  return {
    toneBlend,
    familiarAnchor:clean(raw.familiarAnchor)||'상실·욕망·경쟁·소속·가족·명예·생존·인정처럼 바로 이해되는 인간 갈등을 감정적 발판으로 사용한다.',
    causalDNAs:normalized.slice(0,4),
    brokenGenreAssumption:clean(raw.brokenGenreAssumption)||`기존 ${target.category} 관습을 최종 장르로 고정하지 않고 ${primary}의 결과가 A/B/c와 세계 인과법칙을 거치며 다시 MAIN을 바꾸게 한다.`,
    newPrimaryVerb,
    worldRule:clean(raw.worldRule)||identityCore.signatureWorldRule,
    causalFusion:sketchArray(raw.causalFusion,[`${dnaA.principle} 때문에 MAIN의 결과가 다음 상태의 비용·권리·위험으로 돌아온다.`,`${dnaB.principle} 때문에 A/B/c의 선택은 기능 병렬 추가가 아니라 서로의 조건과 결과를 바꾼다.`,'재료 인과문법과 일반 시스템 융복합이 동시에 작동해 한쪽을 제거하면 최종 플레이 문법이 달라진다.'],2,6),
    irreducibilityTest:{removeFirstAxis:clean(ir.removeFirstAxis)||`${dnaA.id} 인과를 제거하면 세계 규칙과 MAIN×A×B×c의 관계가 평범한 기능 조합으로 돌아간다.`,removeSecondAxis:clean(ir.removeSecondAxis)||`${dnaB.id} 인과를 제거하면 일반 시스템 융복합이 재료에서 나온 새 인과문법과 분리된다.`,verdict:clean(ir.verdict)||'재료 인과문법과 MAIN×A×B×c의 시스템 관계가 서로를 바꾸므로 단순 장르 태그나 기능 합산으로 분리할 수 없다.'},
    storyWorldBindings:{emotionalConflict:clean(sw.emotionalConflict)||'플레이어가 이해할 수 있는 욕망과 두려움이 새 세계 규칙 때문에 충돌한다.',characterRule:clean(sw.characterRule)||'주요 인물의 목표·두려움·비밀은 핵심 인과법칙에 의해 실제 선택과 관계 변화를 만든다.',monsterRule:clean(sw.monsterRule)||'몬스터는 단순 장애물이 아니라 세계 인과법칙이 생태·저주·정치·기억 중 하나로 구체화된 존재다.',regionRule:clean(sw.regionRule)||'지역마다 같은 인과법칙의 다른 해석이나 비용이 적용되어 공간 사용법이 달라진다.',storyRule:clean(sw.storyRule)||'스토리 사건은 컷신으로만 진행되지 않고 핵심 문법을 사용한 결과로 다음 조건이 바뀐다.',plausibility:clean(sw.plausibility)||'낯선 규칙은 역사·문화·생활·권력·신앙·생태의 이유로 설명되어 세계 안에서는 자연스럽게 느껴져야 한다.'},
    gameplaySystemFusion,
    delveLayer:{formulaSuffix:'+ @',role:'DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS',elements:delveElements.slice(0,Math.max(4,Math.min(10,delveElements.length)))},
    emergentGenre:{name:emergentName,definition:clean(emergentRaw.definition)||`${newPrimaryVerb}을 중심으로 재료 인과문법과 MAIN×A×B×c가 서로 상태를 바꾸고 @ 파고들기 요소가 숨은 운용을 여는 복합장르다.`,whyNotSingleConventionalGenre:clean(emergentRaw.whyNotSingleConventionalGenre)||'기존 장르 태그 하나가 플레이를 정의하지 않으며 재료 인과법칙·MAIN/A/B 대축·c 서브요소·@ 파고들기의 관계 자체가 게임의 반복 규칙을 만든다.',grammarFormula:'MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @',categoryRole:'SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE'},
    expansionVectors:sketchArray(raw.expansionVectors,['새 지역은 같은 인과법칙과 MAIN×A×B×c의 관계를 다른 공간 조건에서 변형한다.','새 몬스터는 체력 배수가 아니라 A/B/c 관계의 상태 전달을 방해·증폭·반전한다.','새 NPC/세력은 같은 인과법칙을 다른 욕망과 이해관계로 해석해 시스템 선택을 바꾼다.','새 아이템/능력은 MAIN/A/B/c 사이의 원인·대가·정보·권리를 이동·보존·분산·위조하는 새 운용을 연다.','새 @는 숨은 조합·숙련·재해석·재방문·관계 변화·고급 변형 중 하나로 기존 시스템을 더 깊게 사용하게 한다.'],4,8),
    culturalAbstractionRule:clean(raw.culturalAbstractionRule)||'동서양 역사·고전·종교·신화·철학·비극·희극·해학·정치·역사적 인물은 높낮이 없이 동등한 재료이며 이름·장면 복제가 아니라 인과구조와 인간 갈등의 추상 DNA로 재해석한다.'
  };
}
export function normalizeGameplaySketch(target,p,coreLoop,gameName){
  const raw=p?.gameplaySketch&&typeof p.gameplaySketch==='object'&&!Array.isArray(p.gameplaySketch)?p.gameplaySketch:{};
  const worldModel=clean(raw.worldModel)||`${gameName}의 실제 플레이 공간은 ${target.category} 핵심 행동, 이동·경로·위치 선택과 목표 진행이 서로 영향을 주는 월드 상태로 구성한다.`;
  const actors=sketchArray(raw.actors,[`플레이어: ${coreLoop[0]||'핵심 행동 수행'}`,`위협/상대 또는 월드 엔티티: 플레이어 행동에 상태와 결과로 반응`],2,8);
  const interactionChains=sketchArray(raw.interactionChains,[`플레이어가 대상/공간을 선택한다 -> 실제 입력을 수행한다 -> 대상 또는 월드 상태가 바뀐다 -> 보상·위험·목표 결과가 바뀐다`],1,8);
  const stateMachine=sketchArray(raw.stateMachine,[
    'START_OR_WORLD_ENTRY','REAL_PLAYER_INPUT','CORE_GAMEPLAY_ACTION','OBSERVABLE_WORLD_OR_TARGET_STATE_CHANGE','PROGRESSION_REWARD_OR_MEANINGFUL_CHOICE','RISK_FAILURE_OR_RESOURCE_PRESSURE','GOAL_OR_RETRY'
  ],5,10);
  const firstPlayableCycle=sketchArray(raw.firstPlayableCycle,[
    '월드에 진입하고 현재 목표를 확인한다',coreLoop[0]||'핵심 행동을 실제 입력으로 수행한다',coreLoop[1]||'행동 결과로 상태와 자원을 변화시킨다','보상 또는 의미 있는 선택을 적용한다','위험·실패·자원 압박을 실제로 겪는다',coreLoop[2]||'목표를 끝내거나 재도전 가능한 사이클을 닫는다'
  ],6,10);
  const playerPromise=clean(raw.playerPromise)||`${gameName}에서 플레이어는 ${coreLoop[0]||'핵심 행동'}을 숙련하고 선택의 결과로 다음 전략·경로·성장 가능성이 실제로 달라지는 경험을 반복한다.`;
  const identityRaw=raw.identityCore&&typeof raw.identityCore==='object'&&!Array.isArray(raw.identityCore)?raw.identityCore:{};
  const coherenceRaw=identityRaw.identityCoherence&&typeof identityRaw.identityCoherence==='object'&&!Array.isArray(identityRaw.identityCoherence)?identityRaw.identityCoherence:{};
  const threeRaw=identityRaw.threeSentenceTest&&typeof identityRaw.threeSentenceTest==='object'&&!Array.isArray(identityRaw.threeSentenceTest)?identityRaw.threeSentenceTest:{};
  const signatureSystemPromise=sketchArray(identityRaw.signatureSystemPromise,[
    `${coreLoop[0]||'대표 행동'}과 ${coreLoop[1]||'대표 선택'}의 결과가 같은 월드 상태에서 서로 영향을 주는 시그니처 상호작용`
  ],1,2);
  const identityCore={
    oneLineFantasy:clean(identityRaw.oneLineFantasy)||clean(p?.distinctIdentity)||playerPromise,
    playerRole:clean(identityRaw.playerRole)||`${gameName}에서 플레이어는 ${coreLoop[0]||'핵심 행동'}의 주체가 되어 세계 상태와 다음 선택을 바꾼다.`,
    representativeAction:clean(identityRaw.representativeAction)||coreLoop[0]||'장르의 핵심 행동을 실제 입력으로 수행한다.',
    representativeChoice:clean(identityRaw.representativeChoice)||coreLoop[1]||'위험·보상·경로·자원 중 다음 결과를 바꾸는 선택을 한다.',
    signatureWorldRule:clean(identityRaw.signatureWorldRule)||`플레이어의 ${coreLoop[0]||'핵심 행동'}과 선택이 ${worldModel}의 다음 상태와 접근 가능성을 실제로 바꾼다.`,
    signatureSystemPromise,
    growthIdentity:clean(identityRaw.growthIdentity)||'성장은 수치 증가만이 아니라 새 행동·경로·조합·관계·발견 또는 대응법을 열어 같은 콘텐츠를 다르게 사용하게 한다.',
    identityCoherence:{
      worldCulture:clean(coherenceRaw.worldCulture)||'세계의 역사·생활·경제·지역 기능이 핵심 플레이 행동이 존재할 이유를 같은 논리로 설명한다.',
      visualLanguage:clean(coherenceRaw.visualLanguage)||'지역·캐릭터·적·아이템·UI가 역할과 위험·보상 차이를 같은 시각 언어로 보여준다.',
      audioLanguage:clean(coherenceRaw.audioLanguage)||'탐험·위험·성공·실패·성장 상태의 소리와 음악이 핵심 행동과 세계 분위기를 일관되게 강화한다.',
      enemyItemNpcCoherence:clean(coherenceRaw.enemyItemNpcCoherence)||'적·아이템·NPC는 이름만 다른 장식이 아니라 세계의 원인과 플레이 규칙, 보상·정보·관계에 연결된다.'
    },
    threeSentenceTest:{
      whatGame:clean(threeRaw.whatGame)||`${gameName}은 ${coreLoop[0]||'핵심 행동'}을 중심으로 선택 결과가 다음 월드 상태를 바꾸는 ${target.category} 게임이다.`,
      whatDifferent:clean(threeRaw.whatDifferent)||`대표 선택와 세계 규칙이 결합되어 같은 장르의 단순 반복과 다른 경로·위험·결과를 만든다.`,
      whatGrowthUnlocks:clean(threeRaw.whatGrowthUnlocks)||'성장할수록 새 행동 조합·경로·관계·발견·대응법 중 장르에 맞는 가능성이 실제 플레이에 열린다.'
    },
    genreAdaptationRule:clean(identityRaw.genreAdaptationRule)||`${target.category}의 핵심 재미를 최우선으로 두고 RPG식 시스템을 강제하지 않으며, 정체성 질문만 장르에 맞게 적용한다.`
  };
  const novelGameGrammar=normalizeNovelGameGrammar(target,raw.novelGameGrammar,coreLoop,identityCore);
  const funDrivers=sketchArray(raw.funDrivers,[
    '핵심 행동은 입력 직후 읽을 수 있는 상태 변화와 피드백을 만든다',
    '안전·속도·보상·자원 중 최소 하나의 실제 트레이드오프가 다음 선택을 바꾼다',
    '숙련과 성장은 숫자 상승뿐 아니라 새 행동 조합·경로·대응법을 연다',
    '월드·적·경제 또는 목표가 플레이어 선택에 반응해 적응을 요구한다'
  ],3,6);
  const balanceRules=sketchArray(raw.balanceRules,[
    '하나의 지배 전략이 모든 상황을 해결하지 못하도록 상황별 비용·카운터·기회비용을 둔다',
    '플레이어 파워 성장과 위협·목표 복잡도 상승을 함께 조정해 성장 체감을 지우지 않는다',
    '실패는 다음 선택이 가능한 복구 경로를 남기고 반복 손실로 진행을 완전히 봉쇄하지 않는다',
    '경제·자원은 획득원과 소비처를 함께 두고 무한 무료 루프나 의미 없는 과잉 축적을 막는다',
    '후반 난이도는 체력·데미지 배수만 늘리지 않고 판단 구조·압박 조합·대응 우선순위를 바꾼다'
  ],4,8);
  const pacingRaw=raw.pacingPlan&&typeof raw.pacingPlan==='object'&&!Array.isArray(raw.pacingPlan)?raw.pacingPlan:{};
  const pacingPlan={
    first5Minutes:clean(pacingRaw.first5Minutes)||'0~5분에 조작·목표·핵심 행동을 이해하고 첫 성공과 첫 위험/선택을 경험한다.',
    minutes5To15:clean(pacingRaw.minutes5To15)||'5~15분에 핵심 루프를 반복하되 첫 성장·장비·경로·전략 선택으로 행동 결과가 달라진다.',
    minutes15To25:clean(pacingRaw.minutes15To25)||'15~25분에 새 압박 유형·지역 규칙·적 행동·목표 또는 시스템 연결을 열어 같은 루프의 단순 반복을 피한다.',
    minutes25To30:clean(pacingRaw.minutes25To30)||'25~30분에 이전 선택과 성장을 조합해 중간 목표·시그니처 상황을 해결하고 다음 플레이 동기를 연다.',
    midLateGame:clean(pacingRaw.midLateGame)||'중후반은 여러 시스템을 결합하고 빌드·경로·플레이스타일 차이가 실제 결과를 갈라놓으며 새로운 규칙 조합을 요구한다.',
    replayMotivation:clean(pacingRaw.replayMotivation)||'재플레이는 다른 빌드·경로·위험 선택·월드 결과·정보 발견으로 새 전략 결과를 만들며 단순 보상 반복에 의존하지 않는다.'
  };
  const progressionLayers=sketchArray(raw.progressionLayers,[
    '세션 성장: 현재 플레이에서 자원·위치·장비·전술 선택이 즉시 다음 행동 가능성을 바꾼다',
    '중기 성장: 해금·지역·시스템 연결 또는 빌드 선택이 새로운 전략 경로를 연다',
    '장기 성장: 숙련·월드 상태·수집·관계·메타 목표 중 장르에 맞는 축이 다음 세션의 선택 폭을 넓힌다'
  ],3,6);
  const expansionPlan=sketchArray(raw.expansionPlan,[
    '새 적·위협은 행동 패턴·대응 우선순위·공간 사용을 바꾼다',
    '새 공간·경로는 이동·자원·가시성·위험보상 중 실제 규칙 차이를 만든다',
    '새 목표·상호작용·정보는 기존 시스템과 연결되어 다른 결정 순서를 만든다',
    '새 빌드·플레이스타일·전략 결과는 동일 콘텐츠를 다른 수치로 반복하는 것이 아니라 행동 조합을 바꾼다',
    '중후반 확장은 기존 진행·경제·월드 상태와 연결되어 앞선 선택의 의미를 누적한다'
  ],4,8);
  const longGoalScenario=sketchArray(raw.longGoalScenario,['초기 핵심 루프와 첫 성장 선택을 완료한다','새 경로·위협·시스템 상호작용으로 플레이 방식을 확장한다','여러 시스템과 누적 선택을 조합해 중간/장기 목표 또는 시그니처 상황을 해결한다'],3,8);
  const completionCriteria=sketchArray(raw.completionCriteria,[
    '첫 5분 안에 실제 입력·핵심 행동·상태 변화·첫 성공과 위험이 연결된다',
    '15~25분 사이 새 결정 공간·압박 유형·시스템 연결이 열린다',
    '30분 이상 플레이는 반복/대기 없이 시스템 조합과 장기 목표로 이어진다',
    '실패·재시도·회복·세이브·소프트락 복구 경로가 게임 규칙과 충돌하지 않는다',
    '모바일 입력·가독성·성능이 핵심 선택과 피드백을 유지한다',
    '초반·중반·후반 콘텐츠가 역할·동선·위험·대응법·리듬에서 구분된다'
  ],4,8);
  const codingGrowthHooks=sketchArray(raw.codingGrowthHooks,[
    '확장 콘텐츠 정의는 가능한 한 기존 설정/데이터 테이블과 안정적인 ID를 사용한다',
    '게임 상태 변경은 기존 책임 함수와 소유권 API를 재사용하고 중복 authoritative 시스템을 만들지 않는다',
    '지역·웨이브·적·퀘스트·보상 확장은 기존 진행/경제/월드 이벤트와 연결 가능한 선언형 슬롯을 우선한다',
    '저장되는 데이터 구조가 바뀌면 버전과 마이그레이션을 포함하고 기존 키 의미를 보존한다',
    '프레젠테이션 자산 바인딩은 게임 로직과 분리해 최신 내부자산을 재선택·적응할 수 있게 한다'
  ],4,8);
  const validationRisks=sketchArray(raw.validationRisks,['버튼/라벨/파일 크기만으로 구현 완료를 가장하지 않는다','반복·재시작·대기로 콘텐츠 분량을 채우지 않는다','색상·체력·데미지 배수만 바꾼 변형을 새 콘텐츠 깊이로 계산하지 않는다'],2,8);
  const flowBaseline={content:{
    identity:clean(p?.distinctIdentity)||gameName,
    playerFantasy:playerPromise,
    coreFun:uniq(p?.coreFunToLearn).join(' '),
    coreLoop,
    progressionDirection:progressionLayers.join(' '),
    identityCore,
    novelGameGrammar,
  }};
  const flowArchitecture=buildGameFlowArchitecture({gameId:`seed:${target.requestId}`,genre:target.category,baseline:flowBaseline,inventory:[]});
  return{version:4,source:clean(raw.source)||'GAME_SEED_MODEL_OR_NORMALIZED_SKETCH_V4_CAUSAL_GRAMMAR',worldModel,actors,interactionChains,stateMachine,firstPlayableCycle,identityCore,novelGameGrammar,playerPromise,funDrivers,balanceRules,pacingPlan,progressionLayers,expansionPlan,longGoalScenario,completionCriteria,codingGrowthHooks,validationRisks,flowArchitecture};
}
function normalizeProposal(target,p={}){
  const existingNames=new Set((state.seeds||[]).map(s=>norm(s.gameName)).filter(Boolean));
  let gameName=clean(p.gameName)||fallbackTitle(target);
  if(existingNames.has(norm(gameName)))gameName=`${gameName} ${initialSerialCount(target.platform,target.category)+1}`;
  const coreLoop=uniq(p.coreLoop).slice(0,8);
  while(coreLoop.length<3)coreLoop.push(['핵심 행동을 수행하고 즉시 결과를 확인한다','획득한 보상으로 성장·전략·다음 목표 중 하나를 선택한다','새 선택으로 상황이 변하고 다시 핵심 행동으로 이어진다'][coreLoop.length]);
  const mode=['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(clean(p.multiplayerDesignMode).toUpperCase())?clean(p.multiplayerDesignMode).toUpperCase():'SINGLE';
  return {
    requestId:target.requestId,
    category:target.category,
    gameName,
    referenceGames:uniq(p.referenceGames).slice(0,4),
    coreFunToLearn:uniq(p.coreFunToLearn).slice(0,6),
    coreLoop,
    distinctIdentity:clean(p.distinctIdentity)||`${gameName}은 선택 재료를 조합해 만든 독립적인 ${target.category} 게임으로 고유한 세계관·시스템·성장 구조를 사용한다.`,
    targetAudience:clean(p.targetAudience)||'Global players matched to the selected platform and category.',
    initialTargetPlatform:target.lockedPlatform?target.platform:(allowedTargetPlatforms.includes(normalizeSeedPlatform(p.initialTargetPlatform))?normalizeSeedPlatform(p.initialTargetPlatform):target.platform),
    initialPlayMode:clean(p.initialPlayMode)||defaultPlayMode,
    multiplayerDesignMode:mode,
    crossPlatformExpansionValue:clean(p.crossPlatformExpansionValue)||'UNKNOWN_UNTIL_PLATFORM_EXPANSION_REVIEW',
    steamExpansionPossible:['POSSIBLE','NOT_RECOMMENDED'].includes(p.steamExpansionPossible)?p.steamExpansionPossible:'POSSIBLE',
    transformationMode:['HOMAGE','REINTERPRETATION','ORIGINAL_COMPOSITION'].includes(p.transformationMode)?p.transformationMode:'ORIGINAL_COMPOSITION',
    gameplaySketch:normalizeGameplaySketch(target,p,coreLoop,gameName),
  };
}
function validateProposal(target,p){
  const errors=[];
  if(p.requestId!==target.requestId)errors.push('requestId');
  if(p.category!==target.category)errors.push('category');
  if(!clean(p.gameName))errors.push('gameName');
  if(uniq(p.coreLoop).length<3)errors.push('coreLoop');
  if(!uniq(p.coreFunToLearn).length)errors.push('coreFun');
  if(!clean(p.distinctIdentity))errors.push('identity');
  if(!allowedTargetPlatforms.includes(normalizeSeedPlatform(p.initialTargetPlatform)))errors.push('platform');
  if(target.lockedPlatform&&normalizeSeedPlatform(p.initialTargetPlatform)!==target.platform)errors.push('lockedPlatform');
  if(!['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(p.multiplayerDesignMode))errors.push('multiplayerDesignMode');
  const sketch=p.gameplaySketch||{};
  if(Number(sketch.version||0)<4||!clean(sketch.worldModel)||!Array.isArray(sketch.actors)||sketch.actors.length<2||!Array.isArray(sketch.interactionChains)||sketch.interactionChains.length<1||!Array.isArray(sketch.stateMachine)||sketch.stateMachine.length<5||!Array.isArray(sketch.firstPlayableCycle)||sketch.firstPlayableCycle.length<6||!clean(sketch.identityCore?.oneLineFantasy)||!clean(sketch.identityCore?.representativeAction)||!clean(sketch.identityCore?.representativeChoice)||!clean(sketch.identityCore?.signatureWorldRule)||!Array.isArray(sketch.identityCore?.signatureSystemPromise)||sketch.identityCore.signatureSystemPromise.length<1||!clean(sketch.identityCore?.growthIdentity)||!clean(sketch.identityCore?.threeSentenceTest?.whatGame)||!clean(sketch.identityCore?.threeSentenceTest?.whatDifferent)||!clean(sketch.identityCore?.threeSentenceTest?.whatGrowthUnlocks)||!clean(sketch.novelGameGrammar?.newPrimaryVerb)||!clean(sketch.novelGameGrammar?.brokenGenreAssumption)||!Array.isArray(sketch.novelGameGrammar?.causalDNAs)||sketch.novelGameGrammar.causalDNAs.length<2||!Array.isArray(sketch.novelGameGrammar?.causalFusion)||sketch.novelGameGrammar.causalFusion.length<2||!clean(sketch.novelGameGrammar?.storyWorldBindings?.emotionalConflict)||!Array.isArray(sketch.novelGameGrammar?.expansionVectors)||sketch.novelGameGrammar.expansionVectors.length<4||!clean(sketch.playerPromise)||!Array.isArray(sketch.funDrivers)||sketch.funDrivers.length<3||!Array.isArray(sketch.balanceRules)||sketch.balanceRules.length<4||!sketch.pacingPlan||!Array.isArray(sketch.progressionLayers)||sketch.progressionLayers.length<3||!Array.isArray(sketch.expansionPlan)||sketch.expansionPlan.length<4||!Array.isArray(sketch.longGoalScenario)||sketch.longGoalScenario.length<3||!Array.isArray(sketch.completionCriteria)||sketch.completionCriteria.length<4||!Array.isArray(sketch.codingGrowthHooks)||sketch.codingGrowthHooks.length<4||!Array.isArray(sketch.validationRisks)||sketch.validationRisks.length<2||!Array.isArray(sketch.flowArchitecture?.flowDNA)||sketch.flowArchitecture.flowDNA.length<2)errors.push('gameplaySketch');
  if(errors.length)throw new Error(`GAME_SEED_INVALID ${target.platform}/${target.category}: ${errors.join(',')}`);
}
// 메인 생성: 기존 배치 진입점 안에서 게임별 문맥과 출력 예산을 분리한다.
async function callModelBatch(targets){
  const proposals=[];
  for(const target of targets){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),MODEL_TIMEOUT_MS);
    const requests=[{
      requestId:target.requestId,
      category:target.category,
      platform:target.platform,
      platformLocked:target.lockedPlatform,
      seedMaterialSelection:target.materialSelection,
      seedMaterials:target.materials.map(m=>({id:m.materialId,sourceFamily:m.sourceFamily,concept:m.concept,mechanic:m.mechanic,setting:m.setting,causalDNA:m.causalDNA})),
      optionalSuccessfulGameReferences:target.benchmarkCandidates,
      targetSessionMinutes:30,
      multiplayerMustBeDecidedNow:true,
      allowedMultiplayerModes:['SINGLE','COOP','COMPETITIVE','HYBRID'],
    }];
    const prompt=`GAME_SEED 초기 상세 설계를 작성하라. 이번 요청은 정확히 한 게임이며 다른 요청의 설정을 섞거나 여러 게임이 출력 예산을 나누게 하지 않는다. requestId와 category는 요청 값을 그대로 반환하고 JSON 스키마의 모든 필드를 완성한다.
재료와 정체성: seedMaterials는 100개 재료 풀에서 플랫폼·카테고리 적합성·상호보완성·검증된 학습·Top30 차별성을 기준으로 동적으로 선정된 2~4개다. 모두 실제로 조합하고 causalDNA 최소 2개를 플레이 규칙으로 변환한다. 직업·산업·자연·과학·스포츠·놀이·사회관계·생존·공간운영·새 아이디어와 동서양 역사·고전·종교·신화·철학·정치·비극·희극·해학·엽기·코믹 재료는 동등하다. 재료의 깊이 서열을 만들지 말고 toneBlend를 게임에 맞게 선택한다. 참고 게임은 선택사항이며 추상 기법만 재해석하고 이름·캐릭터·대사·스토리·맵·아트·소스 복제를 금지한다. 기존 프로젝트와 사실상 같은 coreLoop/distinctIdentity를 만들지 않는다.
인과 문법: familiarAnchor는 익숙한 인간 갈등으로 잡는다. brokenGenreAssumption은 당연한 장르 전제를 깨고 newPrimaryVerb는 이 게임의 실제 반복 행동으로 쓴다. causalDNA와 causalFusion에는 원인→플레이어 선택→대가→다음 상태를 구체적으로 적는다. 업보는 과거 행동이 미래 규칙으로 돌아오는 구조, 예언은 회피가 조건을 완성하는 구조, 정통성은 인정이 권한을 만드는 구조, 오해는 틀린 믿음이 목표·동선을 바꾸는 구조처럼 행동 결과에 연결한다. irreducibilityTest는 각각의 인과축을 제거했을 때 사라지는 선택·상태·후폭풍을 적어 단순 장르 태그 합산과 구분한다.
일반 시스템 문법: gameplaySystemFusion은 MAIN × A × B × c다. MAIN은 중심 반복 플레이이고 A/B만 정확히 두 대축이다. c는 날씨·타이밍·지역규칙·이벤트·보조자원·상태변수처럼 MAIN/A/B 관계를 변주하는 서브요소 묶음이다. RPG 시스템을 모든 장르에 강제하지 않는다. main.playerAction, majorAxes.playerChoice/stateContribution, subElements.variationEffect, crossSystemRules에 발동 조건·입력·읽는 상태·변경되는 상태·비용 또는 임계값·다른 축으로 전달되는 결과를 적는다. MAIN→A, A→B, c의 관계 변주, B→MAIN으로 되돌아오는 규칙을 실제 플레이 예로 각각 연결한다. 기능을 병렬 나열하는 것으로 대체하지 않는다.
파고들기: delveLayer의 + @는 일반 시스템이나 c가 아니라 숨은 조합·숙련 테크닉·발견·재해석·재방문·관계 변화·고급 운용·메타 규칙이다. 최소 4개를 설계하고 각 요소의 discoveryCondition, masteryOrInsight, gameplayEffect, connectsTo를 채운다. 각 @는 MAIN/A/B 또는 c를 통한 관계 최소 두 곳에 연결한다. 처음 발견하는 단서·조건, 숙련 전후 행동 차이, 새 사용법·경로·상태 제어, 대가와 실패 시 복구를 구분한다. 보상을 단순 공격력 증가로 대체하지 않는다. emergentGenre는 MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @의 결과로 생긴 복합장르 이름과 정의다. GAME_CATEGORY는 SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE이며 최종 정체성이 아니다.
전체 플레이: 코드 생성 전에 실제 월드와 플레이 흐름을 GAMEPLAY_SKETCH로 먼저 구성한다. worldModel에는 시작 지점·연결 경로·지역 역할·잠긴 경로와 복구 동선·위험보상 차이를 적는다. actors는 각 역할의 목표·행동·반응·플레이어 대응을 설명한다. interactionChains와 firstPlayableCycle은 시작→입력→이동/선택→핵심 상호작용→상태변화→UI/시청각 피드백→보상/진행→저장/종료까지 실제로 이어진다. stateMachine은 상태 이름만 나열하지 말고 진입 조건·허용 행동·종료 조건·실패와 재시도 전이를 적는다. 각 규칙은 구체적인 한 상황과 결과를 예로 들고 수치가 필요하면 단위·범위·설계 가정임을 명시한다. 기존 승인 수치·저장 키·권한을 덮어쓰는 근거로 사용하지 않는다.
세계와 표현: identityCore의 oneLineFantasy/playerRole/representativeAction/representativeChoice/signatureWorldRule/signatureSystemPromise/growthIdentity를 선명하게 작성한다. signatureSystemPromise는 대표 약속 1~2개로 유지한다. identityCoherence의 문화·시각·오디오·적/아이템/NPC가 같은 정체성을 공유하고 threeSentenceTest는 무슨 게임인지/무엇이 다른지/성장 후 새로 가능한 행동을 각각 답한다. storyWorldBindings는 인물의 목표·두려움·정보, 몬스터 생태와 대응, 지역 규칙과 동선, 사건의 원인과 후폭풍을 동일 세계법칙으로 설명한다. 이야기·대화가 있는 장르만 장면 목적·인물 지식·복선과 회수를 연결하며 설명문으로 실제 상태변화를 대체하지 않는다.
진행과 품질: playerPromise와 funDrivers는 즉시 피드백·위험보상·숙련 선택·월드/적 반응을 연결한다. balanceRules에는 지배전략의 카운터·기회비용, 성장과 위협의 동반 변화, 획득원과 소비처, 복구 가능한 실패, 수치 배수가 아닌 후반 판단 변화가 필요하다. pacingPlan은 0~5/5~15/15~25/25~30분, 중후반, 재플레이마다 다른 목표·새 선택·위험·보상·종료 조건을 적는다. 첫 세션은 의미 있는 30분 진행이며 반복·대기·재시작·체력 뻥튀기로 채우지 않는다. progressionLayers는 세션/중기/장기마다 새 행동·경로·조합을 연다. expansionPlan/expansionVectors/longGoalScenario는 기존 MAIN/A/B/c와 @의 관계를 확장하는 초중후반 역할·동선·적 대응·퀘스트나 목표·시그니처 순간을 실제 순서로 설명한다. 색과 수치만 다른 복제 콘텐츠는 깊이가 아니다.
구현과 검증: initialTargetPlatform은 Roblox/Unity/Fortnite UEFN 중 요청 잠금을 지키고 multiplayerDesignMode는 SINGLE/COOP/COMPETITIVE/HYBRID 중 지금 정한다. multiplayer는 입장·이탈·재입장·권한·동기화 실패를, SINGLE은 그에 맞는 상태 소유권을 설명한다. completionCriteria/validationRisks는 이동·버튼·터치·가독성·화면 잘림·로딩·성능·진행막힘·경제·저장/불러오기·실패복구의 재현 조건과 기대 결과를 구체화한다. codingGrowthHooks는 기존 책임 함수·데이터 테이블·stable ID·상태 소유권·저장 마이그레이션·표현 자산 분리를 사용하며 새 wrapper나 중복 권한을 만들지 않는다. 설계 계획은 검증 증거가 아니므로 실행하지 않은 QA/runtime를 PASS로 쓰지 않는다. 스키마 밖 필드를 새로 만들지 말고 기존 설명 필드에 세부 규칙을 적는다. 문장 길이나 기능 개수 자체를 품질로 세지 않는다.
REQUESTS=${JSON.stringify(requests)}
JSON 객체만 출력하라.`;
    try{
      console.log(`GAME_SEED_AUTHORING_BUDGET=request=${clean(target.requestId)}|num_ctx=32768|num_predict=12288`);
      const r=await fetch('http://127.0.0.1:11434/api/chat',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({
          model,stream:false,think:false,keep_alive:'0s',format:batchSchema(1),
          messages:[
            {role:'system',content:'너는 재운컴퍼니 GAME_SEED 조합 AI다. 현재 한 게임의 초기 설계만 완성한다. 모든 장르에서 재료의 인과 DNA와 MAIN×A×B×c, @ 파고들기를 연결한 새 복합장르를 설계한다. A/B만 대축, c는 서브요소, @는 파고들기 층이다. 기존 필드 안에 발동 조건·입력·상태 변화·대가·피드백·진행·실패복구를 상세히 적고 상투적인 일반론이나 기능 목록으로 대신하지 않는다. 기존 게임·승인 설계·저장·밸런스를 임의 변경하지 않으며 실제 QA 판정 권한을 갖지 않는다.'},
            {role:'user',content:prompt},
          ],
          options:{temperature:0.25,num_ctx:32768,num_predict:12288},
        }),
        signal:controller.signal,
      });
      if(!r.ok)throw new Error(`ollama ${r.status}: ${await r.text()}`);
      const body=await r.json();
      if(body?.done===false||clean(body?.done_reason)==='length')throw new Error(`GAME_SEED_OUTPUT_TRUNCATED ${target.requestId}`);
      const parsed=JSON.parse(clean(body?.message?.content));
      if(!Array.isArray(parsed.proposals)||parsed.proposals.length!==1)throw new Error('GAME_SEED_BATCH_COUNT_MISMATCH');
      const proposal=parsed.proposals[0];
      if(clean(proposal?.requestId)!==clean(target.requestId)||clean(proposal?.category)!==clean(target.category))throw new Error(`GAME_SEED_REQUEST_MISMATCH ${target.requestId}`);
      proposals.push(proposal);
      console.log(`GAME_SEED_AUTHORING_RESPONSE=request=${clean(target.requestId)}|input_tokens=${body.prompt_eval_count??'UNKNOWN'}|output_tokens=${body.eval_count??'UNKNOWN'}|finish=${clean(body.done_reason)||'UNKNOWN'}`);
    }finally{clearTimeout(timer);}
  }
  return proposals;
}
function buildSeed(target,p,{serial,gameId,timestamp}){
  const platform=normalizeSeedPlatform(p.initialTargetPlatform);
  const materialInputs=target.materials.map(m=>({type:'SEED_MATERIAL',id:m.materialId,sourceFamily:m.sourceFamily,value:m.concept}));
  const gameInputs=p.referenceGames.map(value=>({type:'GAME_REFERENCE',value}));
  const seed={
    version:3,
    seedId:`SEED-${platform}-${target.category}-${String(serial).padStart(3,'0')}`,
    gameId,
    gameName:p.gameName,
    status:'ACTIVE',
    generation:target.generation,
    GAME_CATEGORY:target.category,
    SEED_MATERIAL_IDS:target.materials.map(m=>m.materialId),
    SEED_MATERIAL_COUNT:target.materials.length,
    SEED_MATERIAL_SELECTION_MODE:target.materialSelection.mode,
    SEED_MATERIAL_SELECTION_SIGNALS:target.materialSelection.signals,
    SEED_TOP30_DIFFERENTIATION_REFERENCE_COUNT:target.materialSelection.top30ReferenceCount,
    SEED_CATEGORY_SELECTION_ROLE:target.generation==='HISTORICAL_INITIAL_BOOTSTRAP'?'HISTORICAL_BASELINE':'ADAPTIVE_OR_EXPLICIT',
    REFERENCE_INPUTS:[...materialInputs,...gameInputs],
    REFERENCE_GAMES:p.referenceGames,
    CORE_FUN_TO_LEARN:p.coreFunToLearn,
    CORE_LOOP:p.coreLoop,
    DISTINCT_IDENTITY:p.distinctIdentity,
    GAMEPLAY_SKETCH:p.gameplaySketch,
    MARKET_EVIDENCE_SUMMARY:target.marketEvidence,
    TARGET_AUDIENCE:p.targetAudience,
    TARGET_SESSION_MINUTES:30,
    TARGET_SESSION_DIRECTION:'0~5분 조작·목표 이해, 5~15분 핵심 루프와 첫 성장/선택, 15~25분 변주·난이도·서사/전략 변화, 25~30분 중간목표·보상·다음 플레이 동기. 반복·대기·체력 뻥튀기로 시간 채우기 금지.',
    INITIAL_TARGET_PLATFORM:platform,
    INITIAL_PLAY_MODE:p.initialPlayMode,
    MULTIPLAYER_DESIGN_MODE:p.multiplayerDesignMode,
    MULTIPLAYER_DESIGN_REQUIRED_AT_DESIGN:true,
    MULTIPLAYER_QA_REQUIRED:p.multiplayerDesignMode!=='SINGLE',
    CROSS_PLATFORM_EXPANSION_VALUE:p.crossPlatformExpansionValue,
    STEAM_EXPANSION_POSSIBLE:p.steamExpansionPossible,
    TRANSFORMATION_MODE:p.transformationMode,
    SOURCE_CODE_RULE:'OWN_IMPLEMENTATION_ONLY',
    COMMERCIAL_RULE:'INITIAL_GAME_MUST_BE_SELLABLE_OR_MONETIZABLE_FOR_ITS_SELECTED_PLATFORM',
    portfolioSeedRequestId:target.portfolioRequest?.id||null,
    createdAt:timestamp,
    updatedAt:timestamp,
  };
  assertGameSeed(seed);
  return seed;
}
export async function runGameSeedBootstrap({timestamp=new Date().toISOString(),proposalProvider=null}={}){
  if(config.enabled===false)return{action:'DISABLED',created:[],modelCalls:0};
  const ownerPreservationGameIds=materializeOwnerPreservationSeeds({timestamp});
  ensureSeedMaterialPool(state,{timestamp});
  const targets=[];
  const initial=!state.bootstrapCompletedAt;
  const pending=pendingPortfolioSeedRequests(state);
  try{
    if(initial){
      for(const [i,category] of historicalCategories.entries())targets.push(makeTarget(`HISTORICAL-${i+1}`,{category,platform:'UNITY',generation:'HISTORICAL_INITIAL_BOOTSTRAP',lockedPlatform:true}));
    }else if(pending.length){
      for(const req of pending.slice(0,3))targets.push(makeTarget(`PORTFOLIO-${req.id}`,{category:req.category,platform:req.targetPlatform||defaultTargetPlatform,generation:'MATERIAL_COMPOSITION',portfolioRequest:req,lockedPlatform:Boolean(req.targetPlatform)}));
    }else{
      const count=FORCE_TARGET_COUNT||IDLE_TARGET_COUNT;
      for(let i=0;i<count;i++)targets.push(makeTarget(`MATERIAL-${Date.now()}-${i+1}`,{platform:defaultTargetPlatform,generation:IDLE_TARGET_COUNT?'IDLE_MATERIAL_COMPOSITION':'MATERIAL_COMPOSITION'}));
    }
    if(!targets.length){
      state.lastRunAt=timestamp;
      state.lastAction='NO_CREATION_REQUIRED';
      saveSeedState(state);
      return{action:'NO_CREATION_REQUIRED',created:[],modelCalls:0,ownerPreservationGameIds,seedMaterialPoolTarget:100,seedMaterialAvailable:state.seedMaterials.filter(x=>x.status==='AVAILABLE').length};
    }
    const proposals=proposalProvider
      ?await Promise.all(targets.map(t=>proposalProvider({requestId:t.requestId,category:t.category,platform:t.platform,seedMaterials:t.materials,materialSelection:t.materialSelection})))
      :await callModelBatch(targets);
    if(proposals.length!==targets.length)throw new Error('GAME_SEED_BATCH_COUNT_MISMATCH');
    const used=new Set((state.seeds||[]).map(s=>s.gameId));
    const created=[];
    const reused=[];
    const serials=new Map();
    for(let i=0;i<targets.length;i++){
      const target=targets[i],proposal=normalizeProposal(target,proposals[i]);
      validateProposal(target,proposal);
      const duplicate=findSimilarActiveSeed(proposal,state.seeds);
      if(duplicate){
        const existing=duplicate.seed;
        releaseSeedMaterialReservations(state,target.materials,{timestamp});
        if(target.portfolioRequest)fulfillPortfolioSeedRequest(target.portfolioRequest,existing,timestamp);
        reused.push({
          requestId:target.requestId,
          seedId:existing.seedId,
          gameId:existing.gameId,
          category:existing.GAME_CATEGORY,
          initialTargetPlatform:seedPlatform(existing),
          similarityScore:Math.round(duplicate.score*10000)/10000,
          reason:'GAME_SEED_CONCEPT_DUPLICATE_REUSE_EXISTING'
        });
        continue;
      }
      const platform=normalizeSeedPlatform(proposal.initialTargetPlatform);
      const key=`${platform}:${target.category}`;
      const serial=(serials.get(key)??initialSerialCount(platform,target.category))+1;
      serials.set(key,serial);
      const gameId=uniqueGameId(platform,target.category,proposal.gameName,used);
      const seed=buildSeed(target,proposal,{serial,gameId,timestamp});
      state.seeds.push(seed);
      state.categories=uniq([...(state.categories||[]),target.category]);
      consumeSeedMaterials(state,target.materials,{seedId:seed.seedId,timestamp});
      if(target.portfolioRequest)fulfillPortfolioSeedRequest(target.portfolioRequest,seed,timestamp);
      created.push(seed);
    }
    if(initial){
      state.bootstrapCompletedAt=timestamp;
      state.initialBatchCount=created.length+reused.length;
      state.initialBatchCreatedCount=created.length;
      state.initialBatchReusedCount=reused.length;
      state.initialBatchCategories=[...historicalCategories];
    }
    state.lastRunAt=timestamp;
    state.lastAction=IDLE_TARGET_COUNT?'IDLE_MATERIAL_COMPOSITION':initial?'HISTORICAL_INITIAL_BOOTSTRAP':'MATERIAL_COMPOSITION';
    saveSeedState(state);
    return{
      action:state.lastAction,
      created:created.map(s=>({
        seedId:s.seedId,
        gameId:s.gameId,
        category:s.GAME_CATEGORY,
        initialTargetPlatform:s.INITIAL_TARGET_PLATFORM,
        multiplayerDesignMode:s.MULTIPLAYER_DESIGN_MODE,
        gameplaySketchVersion:Number(s.GAMEPLAY_SKETCH?.version||0),
        seedMaterialIds:s.SEED_MATERIAL_IDS,
        seedMaterialCount:s.SEED_MATERIAL_COUNT,
        seedMaterialSelectionMode:s.SEED_MATERIAL_SELECTION_MODE,
      })),
      reused,
      duplicateReuseCount:reused.length,
      duplicatePolicy:'SEARCH_EXISTING_ACTIVE_SEEDS_THEN_REUSE_SIMILAR_NO_DUPLICATE_CREATION',
      duplicateSimilarityThreshold:GAME_SEED_CONCEPT_REUSE_SIMILARITY_THRESHOLD,
      modelCalls:proposalProvider?0:targets.length,
      ownerPreservationGameIds,
      seedMaterialPoolTarget:100,
      seedMaterialAvailable:state.seedMaterials.filter(x=>x.status==='AVAILABLE').length,
      top30DifferentiationReferenceCount:top30GameIds.length,
      paidApi:false,
      targetMarketScope:'GLOBAL',
    };
  }catch(error){
    for(const target of targets)releaseSeedMaterialReservations(state,target.materials,{timestamp});
    saveSeedState(state);
    throw error;
  }
}

// 로그 및 실행 진입점
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  runGameSeedBootstrap().then(result=>{
    console.log(JSON.stringify(result,null,2));
    console.log(`GAME_SEED_CREATED_COUNT=${result.created.length}`);
    console.log(`GAME_SEED_REUSED_COUNT=${(result.reused||[]).length}`);
    console.log(`GAME_SEED_DUPLICATE_POLICY=${result.duplicatePolicy||'SEARCH_EXISTING_ACTIVE_SEEDS_THEN_REUSE_SIMILAR_NO_DUPLICATE_CREATION'}`);
    console.log(`GAME_SEED_DUPLICATE_SIMILARITY_THRESHOLD=${result.duplicateSimilarityThreshold??GAME_SEED_CONCEPT_REUSE_SIMILARITY_THRESHOLD}`);
    console.log(`GAME_SEED_MODEL_CALLS=${result.modelCalls}`);
    console.log(`OWNER_PRESERVATION_SEED_MATERIALIZED_COUNT=${(result.ownerPreservationGameIds||[]).length}`);
    console.log(`OWNER_PRESERVATION_SEED_GAME_IDS=${(result.ownerPreservationGameIds||[]).join(',')||'NONE'}`);
    console.log(`SEED_MATERIAL_POOL_TARGET=${result.seedMaterialPoolTarget||100}`);
    console.log(`SEED_MATERIAL_POOL_AVAILABLE=${result.seedMaterialAvailable??0}`);
    console.log('SEED_MATERIAL_COMPOSITION_MODE=DYNAMIC_CONTEXTUAL_2_TO_4');
    console.log('HISTORICAL_SIX_CATEGORY_ROLE=BASELINE_AND_FALLBACK_ONLY');
    console.log('GAMEPLAY_SKETCH_REQUIRED_FOR_NEW_SEEDS=YES');
    console.log('GAMEPLAY_SKETCH_V2_QUALITY_DEPTH=FUN_BALANCE_PACING_PROGRESSION_COMPLETION_CODING_FLOW');
    console.log('GAME_SEED_FLOW_ARCHITECTURE=DETERMINISTIC_AND_ASSET_ROLE_AWARE');
    console.log('TARGET_SESSION_MINUTES=30');
    console.log('GAME_SEED_MATERIALS_ARE_GAMES=NO');
    console.log('GAME_SEED_PAID_API=NO');
  }).catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
}
