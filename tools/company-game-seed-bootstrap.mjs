// 파일명: tools/company-game-seed-bootstrap.mjs
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
const IDLE_TARGET_COUNT=Math.max(0,Math.min(3,Number(process.env.GAME_SEED_IDLE_TARGET_COUNT||0)));
const FORCE_TARGET_COUNT=Math.max(0,Math.min(3,Number(process.env.GAME_SEED_FORCE_TARGET_COUNT||0)));

const TEXT={type:'string',maxLength:1200};
const SKETCH_ITEM={type:'string',minLength:1,maxLength:360};
const CAUSAL_DNA_ITEM_SCHEMA={
  type:'object',
  required:['id','source','principle','gameplayConversion','fusionRole'],
  properties:{id:{type:'string',minLength:3,maxLength:120},source:{type:'string',minLength:3,maxLength:180},principle:{type:'string',minLength:10,maxLength:600},gameplayConversion:{type:'string',minLength:10,maxLength:700},fusionRole:{type:'string',minLength:10,maxLength:500}},
  additionalProperties:false
};
const SYSTEM_AXIS_SCHEMA={
  type:'object',
  required:['key','name','purpose','playerChoice','stateContribution','systemFamily','sourceMaterial','sourceDomain','materialRule'],
  properties:{
    key:{type:'string',enum:['A','B']},
    systemFamily:{type:'string',minLength:2,maxLength:160},
    sourceMaterial:{type:'string',minLength:2,maxLength:180},
    sourceDomain:{type:'string',minLength:2,maxLength:180},
    materialRule:{type:'string',minLength:15,maxLength:700},
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
// C: 창작 소재 2개 + 메인/보조 장르 2개. 소재와 장르 단어 목록은 닫지 않는다.
const C_THEME_SCHEMA={type:'object',required:['name','kind','causalEffect'],properties:{
  name:{type:'string',minLength:2,maxLength:180},
  kind:{type:'string',enum:['GENRE','MATERIAL']},
  causalEffect:{type:'string',minLength:15,maxLength:700}
},additionalProperties:false};
const C_GENRE_SCHEMA={type:'object',required:['role','name','gameplayEffect'],properties:{
  role:{type:'string',enum:['PRIMARY','SECONDARY']},
  name:{type:'string',minLength:2,maxLength:180},
  gameplayEffect:{type:'string',minLength:15,maxLength:700}
},additionalProperties:false};
const C_FUSION_SCHEMA={type:'object',required:['themes','genres','genreInterlock','jointWorldRule','abGameplayEffect'],properties:{
  themes:{type:'array',minItems:2,maxItems:2,items:C_THEME_SCHEMA},
  genres:{type:'array',minItems:2,maxItems:2,items:C_GENRE_SCHEMA},
  genreInterlock:{type:'string',minLength:20,maxLength:700},
  jointWorldRule:{type:'string',minLength:20,maxLength:700},
  abGameplayEffect:{type:'string',minLength:20,maxLength:700}
},additionalProperties:false};
const DELVE_ELEMENT_SCHEMA={
  type:'object',
  required:['name','discoveryCondition','masteryOrInsight','gameplayEffect','connectsTo'],
  properties:{
    name:{type:'string',minLength:2,maxLength:180},
    discoveryCondition:{type:'string',minLength:10,maxLength:600},
    masteryOrInsight:{type:'string',minLength:10,maxLength:700},
    gameplayEffect:{type:'string',minLength:10,maxLength:700},
    connectsTo:{type:'array',minItems:2,maxItems:4,uniqueItems:true,items:{type:'string',enum:['MAIN','A','B','C','c']}}
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
    gameplaySystemFusion:{type:'object',required:['formula','main','majorAxes','themeFusion','crossSystemRules'],properties:{
      formula:{type:'string',enum:['MAIN × A × B × C']},
      main:{type:'object',required:['name','purpose','playerAction','stateContribution'],properties:{name:{type:'string',minLength:2,maxLength:180},purpose:{type:'string',minLength:10,maxLength:600},playerAction:{type:'string',minLength:10,maxLength:600},stateContribution:{type:'string',minLength:10,maxLength:700}},additionalProperties:false},
      majorAxes:{type:'array',minItems:2,maxItems:2,items:SYSTEM_AXIS_SCHEMA},
      themeFusion:C_FUSION_SCHEMA,
      subElements:{type:'array',minItems:0,maxItems:6,items:SUB_ELEMENT_SCHEMA},
      crossSystemRules:{type:'array',minItems:4,maxItems:10,uniqueItems:true,items:{type:'string',minLength:15,maxLength:700}}
    },additionalProperties:false},
    delveLayer:{type:'object',required:['formulaSuffix','role','elements'],properties:{
      formulaSuffix:{type:'string',enum:['+ @']},
      role:{type:'string',enum:['DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS']},
      elements:{type:'array',minItems:4,items:DELVE_ELEMENT_SCHEMA}
    },additionalProperties:false},
    emergentGenre:{type:'object',required:['name','definition','whyNotSingleConventionalGenre','grammarFormula','categoryRole'],properties:{
      name:{type:'string',minLength:4,maxLength:180},
      definition:{type:'string',minLength:20,maxLength:800},
      whyNotSingleConventionalGenre:{type:'string',minLength:20,maxLength:800},
      grammarFormula:{type:'string',enum:['MAIN × A × B × C + @']},
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
    worldModel:{type:'string',minLength:1,maxLength:900},
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
  const primary=identityCore.oneLineFantasy||identityCore.playerRole||coreLoop[0]||'게임 정체성';
  const second=coreLoop[1]||identityCore.representativeChoice||'다음 선택';
  const third=coreLoop[2]||'결과를 다음 상황에 반영한다';
  const axisFallback={
    A:{name:second,purpose:'MAIN의 결과를 다음 선택과 비용 구조로 연결하는 첫 번째 대축.',playerChoice:second,stateContribution:'MAIN의 결과를 다음 위험·보상·자원 또는 경로 상태로 바꾼다.'},
    B:{name:third,purpose:'A와 MAIN의 결과를 다른 핵심 판단 구조로 연결하는 두 번째 대축.',playerChoice:third,stateContribution:'A의 결과를 월드·상대·목표 또는 관계 상태 변화와 연결한다.'}
  };
  const axes=['A','B'].map(key=>{
    const row=byKey.get(key)||{},fb=axisFallback[key];
    return {key,name:clean(row.name)||fb.name,purpose:clean(row.purpose)||fb.purpose,playerChoice:clean(row.playerChoice)||fb.playerChoice,stateContribution:clean(row.stateContribution)||fb.stateContribution,systemFamily:clean(row.systemFamily),sourceMaterial:clean(row.sourceMaterial),sourceDomain:clean(row.sourceDomain),materialRule:clean(row.materialRule)};
  });
  // V5의 C는 창작 주제와 메인·보조 장르다. 과거 c 보조 규칙은 있을 때만 보존한다.
  const rawSubElements=Array.isArray(fusion.subElements)?fusion.subElements:[];
  const subElements=rawSubElements.slice(0,6).map(row=>({
    name:clean(row?.name),
    role:clean(row?.role),
    supports:uniq(row?.supports).filter(x=>['MAIN','A','B'].includes(x)).slice(0,3),
    variationEffect:clean(row?.variationEffect)
  }));
  const authoredThemes=Array.isArray(fusion.themeFusion?.themes)?fusion.themeFusion.themes:[];
  const themeFusion={
    themes:authoredThemes.map(row=>({name:clean(row?.name),kind:clean(row?.kind).toUpperCase(),causalEffect:clean(row?.causalEffect)})),
    genres:(Array.isArray(fusion.themeFusion?.genres)?fusion.themeFusion.genres:[]).map(row=>({
      role:clean(row?.role).toUpperCase(),name:clean(row?.name),gameplayEffect:clean(row?.gameplayEffect)
    })),
    genreInterlock:clean(fusion.themeFusion?.genreInterlock),
    jointWorldRule:clean(fusion.themeFusion?.jointWorldRule),
    abGameplayEffect:clean(fusion.themeFusion?.abGameplayEffect)
  };
  const gameplaySystemFusion={
    formula:'MAIN × A × B × C',
    main:{name:clean(rawMain.name)||primary,purpose:clean(rawMain.purpose)||'MAIN은 게임의 주제와 정체성이다. 플레이어가 누구이며 어떤 게임을 운영·진행하는지를 명확히 한다.',playerAction:clean(rawMain.playerAction)||clean(identityCore.representativeAction)||coreLoop[0]||primary,stateContribution:clean(rawMain.stateContribution)||'MAIN의 세계·정체성과 반복 목표가 A/B 시스템의 선택과 C 창작 장르 및 @ 발견에 의미를 부여한다.'},
    majorAxes:axes,
    themeFusion,
    subElements,
    crossSystemRules:sketchArray(fusion.crossSystemRules,[
      'MAIN의 결과가 A의 선택 비용·위험·보상 중 하나를 바꾼다.',
      'A의 선택 결과가 B의 가능 행동·상태·우선순위를 바꾼다.',
      'B의 결과가 A의 다음 건설·운영·대응 선택을 되돌려 바꾼다.',
      'C의 두 소재와 메인·보조 장르가 A/B 선택·위험·정보 및 다음 사건을 바꾼다.',
      'A/B의 누적 결과가 다시 MAIN의 목표·세계 상태와 플레이어 선택을 바꾼다.'
    ],4,10)
  };
  const rawDelve=raw.delveLayer&&typeof raw.delveLayer==='object'&&!Array.isArray(raw.delveLayer)?raw.delveLayer:{};
  const rawDelveElements=Array.isArray(rawDelve.elements)?rawDelve.elements:[];
  const delveFallback=[
    {name:'숨은 교차조합',discoveryCondition:'MAIN과 A를 특정 순서나 조건으로 반복해 B의 평소와 다른 반응을 발견한다.',masteryOrInsight:'표면 규칙이 아니라 시스템 간 상태 전달 순서를 이해한다.',gameplayEffect:'같은 자원과 행동으로 새로운 해결법이나 빌드를 만든다.',connectsTo:['MAIN','A','B']},
    {name:'고급 역이용',discoveryCondition:'A의 비용이나 제약을 B 또는 C 장르·소재의 사건 조건으로 일부러 전환해 본다.',masteryOrInsight:'불리한 규칙도 다른 시스템에서는 자원이 될 수 있음을 파악한다.',gameplayEffect:'정석 진행과 다른 고급 운용 경로가 열린다.',connectsTo:['A','B','C']},
    {name:'재방문 재해석',discoveryCondition:'이전 선택이 누적된 뒤 과거 공간·상대·관계로 돌아간다.',masteryOrInsight:'과거 콘텐츠가 현재 상태에 따라 다른 기능과 의미를 갖는다는 것을 발견한다.',gameplayEffect:'새 통로·사건·상호작용·위험·보상 중 하나가 열린다.',connectsTo:['MAIN','C']},
    {name:'인과 문법 숨은 변형',discoveryCondition:'선택된 causalDNA 두 개 이상의 조건을 동시에 충족한다.',masteryOrInsight:'세계의 인과법칙들이 서로 상쇄·증폭·이전될 수 있음을 이해한다.',gameplayEffect:'기존 시스템 조합만으로는 나오지 않는 예외 규칙이나 특수 결과를 만든다.',connectsTo:['MAIN','A','B','C']}
  ];
  const delveElements=rawDelveElements.map((row,i)=>({
    name:clean(row?.name)||delveFallback[i%delveFallback.length].name,
    discoveryCondition:clean(row?.discoveryCondition)||delveFallback[i%delveFallback.length].discoveryCondition,
    masteryOrInsight:clean(row?.masteryOrInsight)||delveFallback[i%delveFallback.length].masteryOrInsight,
    gameplayEffect:clean(row?.gameplayEffect)||delveFallback[i%delveFallback.length].gameplayEffect,
    connectsTo:uniq(row?.connectsTo).map(x=>x==='c'?'C':x).filter(x=>['MAIN','A','B','C'].includes(x)).slice(0,4)
  })).map((row,i)=>({...row,connectsTo:row.connectsTo.length>=2?row.connectsTo:delveFallback[i%delveFallback.length].connectsTo}));
  const dnaA=normalized[0],dnaB=normalized[1];
  const emergentRaw=raw.emergentGenre&&typeof raw.emergentGenre==='object'&&!Array.isArray(raw.emergentGenre)?raw.emergentGenre:{};
  const newPrimaryVerb=clean(raw.newPrimaryVerb)||`${primary}의 결과를 이용해 다음 세계 규칙을 설계한다`;
  const emergentName=clean(emergentRaw.name)||`${newPrimaryVerb} 복합장르`;
  return {
    toneBlend,
    familiarAnchor:clean(raw.familiarAnchor)||'상실·욕망·경쟁·소속·가족·명예·생존·인정처럼 바로 이해되는 인간 갈등을 감정적 발판으로 사용한다.',
    causalDNAs:normalized.slice(0,4),
    brokenGenreAssumption:clean(raw.brokenGenreAssumption)||`기존 ${target.category} 관습을 최종 장르로 고정하지 않고 ${primary}의 결과가 A/B 시스템과 C 소재·장르 인과법칙을 거쳐 다시 MAIN을 바꾸게 한다.`,
    newPrimaryVerb,
    worldRule:clean(raw.worldRule)||identityCore.signatureWorldRule,
    causalFusion:sketchArray(raw.causalFusion,[`${dnaA.principle} 때문에 MAIN의 결과가 다음 상태의 비용·권리·위험으로 돌아온다.`,`${dnaB.principle} 때문에 A/B의 선택과 C의 장르 간섭은 기능 병렬 추가가 아니라 서로의 조건과 결과를 바꾼다.`,'재료 인과문법과 일반 시스템 융복합이 동시에 작동해 한쪽을 제거하면 최종 플레이 문법이 달라진다.'],2,6),
    irreducibilityTest:{removeFirstAxis:clean(ir.removeFirstAxis)||`${dnaA.id} 소재를 제거하면 MAIN 정체성과 A/B 시스템·C 장르의 인과 구조가 약해지거나 사라진다.`,removeSecondAxis:clean(ir.removeSecondAxis)||`${dnaB.id} 인과를 제거하면 일반 시스템 융복합이 재료에서 나온 새 인과문법과 분리된다.`,verdict:clean(ir.verdict)||'A/B 시스템별 소재와 C의 메인·보조 장르를 어느 하나 빼도 선택·위험·스토리 결과가 변하며 단순 기능 합산으로 분리할 수 없다.'},
    storyWorldBindings:{emotionalConflict:clean(sw.emotionalConflict)||'플레이어가 이해할 수 있는 욕망과 두려움이 새 세계 규칙 때문에 충돌한다.',characterRule:clean(sw.characterRule)||'주요 인물의 목표·두려움·비밀은 핵심 인과법칙에 의해 실제 선택과 관계 변화를 만든다.',monsterRule:clean(sw.monsterRule)||'몬스터는 단순 장애물이 아니라 세계 인과법칙이 생태·저주·정치·기억 중 하나로 구체화된 존재다.',regionRule:clean(sw.regionRule)||'지역마다 같은 인과법칙의 다른 해석이나 비용이 적용되어 공간 사용법이 달라진다.',storyRule:clean(sw.storyRule)||'스토리 사건은 컷신으로만 진행되지 않고 핵심 문법을 사용한 결과로 다음 조건이 바뀐다.',plausibility:clean(sw.plausibility)||'낯선 규칙은 역사·문화·생활·권력·신앙·생태의 이유로 설명되어 세계 안에서는 자연스럽게 느껴져야 한다.'},
    gameplaySystemFusion,
    delveLayer:{formulaSuffix:'+ @',role:'DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS',elements:delveElements},
    emergentGenre:{name:emergentName,definition:clean(emergentRaw.definition)||`${primary} 정체성을 중심으로 A/B의 시스템×소재가 서로 상태를 바꾸고 C의 두 소재·메인·보조 장르가 사건과 규칙을 생성하며 @ 파고들기가 계속 확장되는 복합장르다.`,whyNotSingleConventionalGenre:clean(emergentRaw.whyNotSingleConventionalGenre)||'기존 장르 태그 하나가 플레이를 정의하지 않으며 재료 인과법칙·MAIN 주제·A/B 시스템·C 소재와 장르·@ 파고들기의 관계 자체가 게임의 반복 규칙을 만든다.',grammarFormula:'MAIN × A × B × C + @',categoryRole:'SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE'},
    expansionVectors:sketchArray(raw.expansionVectors,['새 지역은 같은 소재와 MAIN×A×B×C 관계를 새로운 지역 법칙과 상황에서 다시 결합한다.','새 몬스터는 체력 배수가 아니라 A/B와 C의 인과관계 상태 전달을 방해·증폭·반전한다.','새 NPC/세력은 같은 인과법칙을 다른 욕망과 이해관계로 해석해 시스템 선택을 바꾼다.','새 아이템/능력은 MAIN/A/B/C 사이의 원인·대가·정보·권리를 이동·보존·분산·위조하는 새 운용을 연다.','새 @는 숨은 조합·숙련·재해석·재방문·관계 변화·고급 변형 중 하나로 기존 시스템을 더 깊게 사용하게 한다.'],4,8),
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
      whatDifferent:clean(threeRaw.whatDifferent)||`대표 선택과 세계 규칙이 결합되어 같은 장르의 단순 반복과 다른 경로·위험·결과를 만든다.`,
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
  return{version:5,source:clean(raw.source)||'GAME_SEED_MODEL_V5_OWNER_CREATIVE_GRAMMAR',worldModel,actors,interactionChains,stateMachine,firstPlayableCycle,identityCore,novelGameGrammar,playerPromise,funDrivers,balanceRules,pacingPlan,progressionLayers,expansionPlan,longGoalScenario,completionCriteria,codingGrowthHooks,validationRisks,flowArchitecture};
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

// 메인: MAIN × A × B × C + @의 소재·행동·상태 인과를 바이브 자체 함수로 계산한다.
// 오픈소스 사례는 검증된 설계 원리 참고로만 사용하고 외부 모델·게임 코드·에셋을 복제하지 않는다.
export function computeVibeSeedProposal(target){
  const category=clean(target.category);
  // 오너의 게임 정체성과 기존 플레이 루프를 우선 읽고, 장르 이름만으로 MAIN을 덮어쓰지 않는다.
  const requestedName=clean(target.gameName||target.ownerGameName);
  const ownerBrief=clean(target.ownerBrief||target.brief);
  const requestContext=[requestedName,ownerBrief,clean(target.gameDescription),...(Array.isArray(target.coreLoop)?target.coreLoop.map(clean):[])].join(' ');
  const context=(category+' '+requestContext).toLowerCase();
  const profiles={
    ACTION_SURVIVAL_ROGUELITE:{genre:'생존',a:'탐험과 채집',b:'제작과 거점 구축',choiceA:'위험한 구역을 조사해 자원과 생존 단서를 확보',choiceB:'수집한 단서에 맞춰 제작 순서와 거점 배치를 변경',playerRole:'생존자'},
    SINGLE_DEFENSE_STRATEGY:{genre:'전략',a:'경로와 방어 배치',b:'적 대응 전술',choiceA:'접근 경로의 방어물과 안전 구역을 선택',choiceB:'변경된 진입로에 따라 적의 약점과 대응 우선순위를 분석',playerRole:'방어 지휘관'},
    PUZZLE:{genre:'퍼즐',a:'단서 조합',b:'공간 상태 변환',choiceA:'관찰한 단서의 순서와 의미를 조합',choiceB:'변한 공간 규칙을 이용해 새 접근 경로를 시험',playerRole:'규칙 탐구자'},
    CASUAL:{genre:'생활',a:'사회관계 선택',b:'생활 공간 탐색',choiceA:'인물과 대상의 요청 가운데 우선순위를 결정',choiceB:'이전 관계의 결과로 열린 장소와 상호작용을 탐색',playerRole:'마을 주민'},
    IDLE_GROWTH_RPG:{genre:'성장',a:'생산과 자원 순환',b:'능력과 임무 선택',choiceA:'생산 자원의 공급과 소비 균형을 조절',choiceB:'확보한 자원의 조건을 이용해 임무와 성장 방향을 선택',playerRole:'성장 전략가'},
    STORY_COMPLETE_RPG:{genre:'롤플레잉',a:'인물 대화와 관계',b:'탐험과 전투 선택',choiceA:'등장인물의 갈등과 증언을 듣고 관계의 향방을 결정',choiceB:'바뀐 관계에 따라 이동 경로와 전투 대응을 결정',playerRole:'모험가'},
    TYCOON:{genre:'경영',a:'시설 건설과 공간 배치',b:'손님과 직원 운영',choiceA:'시설 위치와 이동 동선을 선택해 수용 능력과 서비스 비용을 조정',choiceB:'손님 수요와 직원 배치의 결과를 확인해 다음 시설 투자를 결정',playerRole:'운영자'},
    RACING:{genre:'레이싱',a:'주행 경로와 코너 진입',b:'차량 정비와 전략',choiceA:'속도와 위험을 비교해 진입 경로와 추월 시점을 선택',choiceB:'주행 결과에 맞춰 차량 성능과 다음 구간의 위험 대응을 결정',playerRole:'드라이버'},
    CARD:{genre:'카드 전략',a:'카드 조합과 손패 관리',b:'상대 정보와 자원 운영',choiceA:'손패의 조합과 사용 순서를 선택',choiceB:'공개된 상대 행동과 남은 자원에 맞춰 다음 수를 변경',playerRole:'전략가'},
    RPG:{genre:'롤플레잉',a:'퀘스트와 인물 관계',b:'전투와 장비 운용',choiceA:'인물의 의뢰와 이해관계를 읽고 다음 퀘스트 경로를 선택',choiceB:'전투 결과에 맞춰 장비와 동료의 다음 대응을 조정',playerRole:'모험가'},
    SURVIVAL:{genre:'생존',a:'환경 탐색과 자원 확보',b:'제작과 방어 거점 관리',choiceA:'식량과 재료를 확보할 위험 구역을 선택',choiceB:'남은 자원으로 장비와 거점을 보강해 다음 탐색 위험을 낮출 방법을 선택',playerRole:'생존자'},
    HORROR:{genre:'호러',a:'위협 탐지와 잠입',b:'봉인과 단서 해독',choiceA:'소리와 흔적을 관찰해 숨어 이동할 시점과 경로를 선택',choiceB:'확보한 단서로 봉인 순서와 위험한 상호작용을 선택',playerRole:'조사자'},
    DEFENSE:{genre:'전략',a:'방어 시설 배치',b:'적 패턴과 자원 대응',choiceA:'접근 경로와 적의 사거리 사이에서 배치 위치를 선택',choiceB:'웨이브와 자원 상태에 따라 강화·수리·대응 대상을 결정',playerRole:'방어 지휘관'},
  };
  const school=/학교|school/.test(context);
  const schoolCombat=/괴물|monster|퇴마|exorc|combat|전투|액션/.test(requestContext.toLowerCase());
  const schoolProfile=school?{genre:'경영',a:'학교 시설 건축과 배치',
    b:schoolCombat?'괴물 대응 액션':'학생·교사와 교육 운영',
    choiceA:'교실·복도·특수 시설의 배치로 접근과 안전 구역을 선택',
    choiceB:schoolCombat?'시설이 만든 위험에 따라 괴물의 공격을 피하거나 봉인하는 대응을 선택':'학생의 필요와 교사 배치에 맞춰 학사 운영의 우선순위를 결정',
    playerRole:'학교 운영자'}:null;
  const topicalProfiles=[
    [/타이쿤|tycoon|놀이공원|theme.?park|상점.?운영|management/,profiles.TYCOON],
    [/생존|survival|크래프팅|crafting/,profiles.SURVIVAL],
    [/레이싱|racing|경주|race/,profiles.RACING],
    [/디펜스|defense|tower.?defense|방어전/,profiles.DEFENSE],
    [/퍼즐|puzzle|추리게임/,profiles.PUZZLE],
    [/호러|horror|공포|퇴마|귀신/,profiles.HORROR],
    [/카드|card|덱빌딩|deckbuild/,profiles.CARD],
    [/롤플레잉|\brpg\b|역할게임|던전/,profiles.RPG],
  ];
  const topicMatch=topicalProfiles.find(([pattern])=>pattern.test(requestContext.toLowerCase()));
  const profile=schoolProfile||topicMatch?.[1]||profiles[category]||
    topicalProfiles.find(([pattern])=>pattern.test(context))?.[1]||
    {genre:'모험',a:'경로 탐색과 목표 선택',b:'환경과 상대의 상태 대응',choiceA:'목표를 향할 경로와 상호작용 순서를 결정',choiceB:'경로 결과로 바뀐 세계와 상대의 상태에 대응',playerRole:'플레이어'};
  const materialNames={
    KARMA_RETURN:'업보와 인과응보',MANDATE_LEGITIMACY:'왕조의 정통성과 민심',RITUAL_RECIPROCITY:'의례와 호혜 관계',ANCESTOR_MEMORY:'조상 기억과 계승',
    PROPHECY_SELF_FULFILLMENT:'그리스 비극의 자기실현 예언',HUBRIS_NEMESIS:'오만과 응보',OATH_CONTRACT:'서사시의 맹세와 계약',
    SACRIFICE_SUBSTITUTION:'희생 제의와 대가 교환',TABOO_POLLUTION:'민속 금기와 전염',TRICKSTER_REVERSAL:'신화 속 트릭스터의 질서 역전',
    COMEDIC_MISUNDERSTANDING:'희극의 오해와 엇갈림',CARNIVAL_STATUS_REVERSAL:'축제의 신분 반전',DIALECTIC_SYNTHESIS:'철학의 변증법',
    SHIP_OF_THESEUS_IDENTITY:'테세우스의 배와 정체성',TESTIMONY_CONSENSUS_REALITY:'증언과 합의된 현실',
    DYNASTIC_INHERITANCE:'왕조 계승과 유산',FACTION_BALANCE:'역사적 세력 균형',PATRONAGE_NETWORK:'후원과 인맥 관계',
    EXILE_RETURN:'서사시의 추방과 귀환',MARTYRDOM_MOVEMENT:'순교와 집단 결속',PILGRIMAGE_TRANSFORMATION:'순례와 인물 변화',
    FORTUNE_REVERSAL:'비극과 희극의 운명 반전',ABSURD_BUREAUCRACY:'풍자 속 관료제',NAME_AND_REPUTATION_POWER:'영웅서사의 이름과 평판'
  };
  // 명시된 소재는 최우선이며, 부족한 창작 소재만 게임별 인과 맥락으로 보충한다.
  // 오픈소스·사내 모듈은 원리 참고에 한정하고 외부 모델 호출은 없다.
  const explicitIds=uniq((target.materials||[]).flatMap(row=>row.causalDNA||[]))
    .filter(id=>CAUSAL_DNA_LIBRARY.some(row=>row.id===id));
  const materialHints=[
    [/로마|roman|신전|의례|ritual/,'RITUAL_RECIPROCITY'],
    [/괴물|monster|금기|taboo|미라/,'TABOO_POLLUTION'],
    [/철학|philosophy|변증|dialectic/,'DIALECTIC_SYNTHESIS'],
    [/엽기|코믹|희극|comic|comedy|오해/,'COMEDIC_MISUNDERSTANDING'],
    [/학교|school|교육/,'PATRONAGE_NETWORK'],
    [/왕국|kingdom|왕조|dynasty/,'DYNASTIC_INHERITANCE'],
    [/생존|survival|재난/,'EXILE_RETURN'],
    [/호러|horror|귀신|퇴마/,'TESTIMONY_CONSENSUS_REALITY'],
    [/시간|예언|prophecy/,'PROPHECY_SELF_FULFILLMENT'],
    [/추리|탐정|mystery/,'TESTIMONY_CONSENSUS_REALITY'],
    [/농장|farm|재배/,'RITUAL_RECIPROCITY'],
  ].filter(([pattern])=>pattern.test(requestContext.toLowerCase())).map(([,id])=>id);
  const genreMaterialIds={
    '경영':['PATRONAGE_NETWORK','OATH_CONTRACT','ABSURD_BUREAUCRACY','FORTUNE_REVERSAL'],
    '생존':['EXILE_RETURN','TABOO_POLLUTION','SACRIFICE_SUBSTITUTION','ANCESTOR_MEMORY'],
    '전략':['FACTION_BALANCE','MANDATE_LEGITIMACY','OATH_CONTRACT','FORTUNE_REVERSAL'],
    '퍼즐':['TESTIMONY_CONSENSUS_REALITY','SHIP_OF_THESEUS_IDENTITY','DIALECTIC_SYNTHESIS','TRICKSTER_REVERSAL'],
    '레이싱':['HUBRIS_NEMESIS','FORTUNE_REVERSAL','OATH_CONTRACT','TRICKSTER_REVERSAL'],
    '롤플레잉':['EXILE_RETURN','PILGRIMAGE_TRANSFORMATION','PROPHECY_SELF_FULFILLMENT','DIALECTIC_SYNTHESIS'],
    '호러':['TABOO_POLLUTION','TESTIMONY_CONSENSUS_REALITY','PROPHECY_SELF_FULFILLMENT','RITUAL_RECIPROCITY'],
    '카드 전략':['OATH_CONTRACT','TRICKSTER_REVERSAL','FACTION_BALANCE','HUBRIS_NEMESIS'],
  };
  const variance=Math.max(0,Math.floor(Number(target.variant)||0));
  const hash=value=>{let n=2166136261;for(const ch of value)n=Math.imul(n^ch.codePointAt(0),16777619)>>>0;return n;};
  const orderedPool=[...CAUSAL_DNA_LIBRARY].sort((a,b)=>
    hash([target.requestId,category,requestedName,ownerBrief,variance,a.id].join('|'))-
    hash([target.requestId,category,requestedName,ownerBrief,variance,b.id].join('|')));
  const genreChoices=genreMaterialIds[profile.genre]||[];
  const optionalIds=variance>0
    ?[...orderedPool.map(row=>row.id),...genreChoices]
    :[...genreChoices,...orderedPool.map(row=>row.id)];
  const ids=uniq([...explicitIds,...materialHints,...optionalIds]);
  const chosen=ids.map(id=>CAUSAL_DNA_LIBRARY.find(row=>row.id===id)).filter(Boolean).slice(0,4);
  if(chosen.length<4)throw new Error('VIBE_NATIVE_DESIGN_MATERIALS_INSUFFICIENT');
  const [first,second,third,fourth]=[chosen[0],chosen[1],chosen[2]||chosen[0],chosen[3]||chosen[1]];
  const named=row=>materialNames[row.id]||row.id.replaceAll('_',' ');
  const aMaterial=named(first),bMaterial=named(second),cMaterial1=named(third),cMaterial2=named(fourth);
  const distinct=chosen[0].id!==chosen[1].id&&cMaterial1!==cMaterial2;
  if(!distinct)throw new Error('VIBE_NATIVE_DESIGN_DISTINCT_CAUSAL_SOURCES_REQUIRED');
  const creativeIds=chosen.map(row=>row.id).join('|');
  const secondary=/COMEDIC|CARNIVAL|ABSURD/.test(creativeIds)?'코믹':/TABOO/.test(creativeIds)?'호러':/TESTIMONY/.test(creativeIds)?'미스터리':'추리';
  const secondaryGenre=secondary===profile.genre?'사회극':secondary;
  const gameName=requestedName||`${aMaterial}의 ${profile.genre} 세계`;
  const identity=`${gameName}에서 ${profile.playerRole}가 ${profile.a}와 ${profile.b}의 선택을 통해 ${aMaterial}·${bMaterial}의 인과법칙을 바꾸는 ${profile.genre} 복합 게임`;
  const chooseA=`${profile.choiceA}하면서 ${first.gameGrammar}`;
  const chooseB=`${profile.choiceB}하면서 ${second.gameGrammar}`;
  const stateA=`플레이어가 ${profile.a}을 선택하면 ${aMaterial}의 규칙에 따라 다음 위험과 가능 행동이 변화한다.`;
  const stateB=`플레이어가 ${profile.b}을 선택하면 ${bMaterial}의 규칙에 따라 처음 선택으로 되돌아갈 비용·정보·접근 조건이 변화한다.`;
  const bridge=`${chooseA} 그 결과 ${profile.b}의 가능 행동과 위험이 바뀌며, ${chooseB} 다시 ${profile.a}의 조건을 바꾼다.`;
  const genreInterlock=`${profile.genre} 장르의 주 목표를 진행하는 동안 ${secondaryGenre} 장르의 판단 때문에 정보·접근 비용과 다음 선택이 달라진다. ${secondaryGenre}를 제거하면 같은 경로를 선택해도 인물 반응과 결과가 달라진다.`;
  const coreLoop=[
    `${profile.a}: ${chooseA}`,
    `${profile.b}: ${chooseB}`,
    `${profile.a}로 되돌아가 변한 세계 상태·관계·위험을 비교하고 다음 목표를 선택한다.`
  ];
  const delveConditions=[
    {name:'금기와 기회의 교차',condition:`${aMaterial}의 제약과 ${bMaterial}의 대응을 같은 지역에서 순서대로 시험한다.`,insight:`${first.principle} 상황을 ${second.gameGrammar} 방식으로 해석한다.`,effect:`${profile.a}에서 평소에는 불가능했던 대안 경로와 선택을 연다.`,links:['A','B','C']},
    {name:'되돌아온 선택',condition:`${profile.b}를 완료한 뒤 처음 ${profile.a} 지역을 다시 방문해 달라진 증거를 찾는다.`,insight:`${second.principle} 결과가 과거 선택의 의미를 바꿀 수 있음을 발견한다.`,effect:'보상이 아닌 관계·정보의 복원과 다른 해결 경로를 선택한다.',links:['MAIN','A','B']},
    {name:'두 소재의 숨은 규칙',condition:`${cMaterial1}와 ${cMaterial2}의 조건을 동시에 만족시키는 행동 순서를 실험한다.`,insight:`${third.principle} 원리와 ${fourth.principle} 원리가 동시에 작동함을 파악한다.`,effect:'주 장르의 목표를 보조 장르의 정보 판단으로 우회하는 선택을 연다.',links:['B','C','MAIN']},
    {name:'역전된 종착점',condition:`${profile.a}의 결과를 의도적으로 반대로 선택한 뒤 ${profile.b}를 수행해 후속 변화를 확인한다.`,insight:'한쪽의 불리한 결과가 다른 쪽의 고급 활용 조건이 되는 인과 반전을 학습한다.',effect:'같은 공간과 자원으로도 다른 결말·동선·운용법에 도달한다.',links:['A','B','MAIN']}
  ];
  const grammar={
    toneBlend:[profile.genre,secondaryGenre],
    familiarAnchor:`플레이어는 ${profile.a}에서 얻은 이익과 ${profile.b}의 책임 사이에서 선택의 대가를 직접 감당한다.`,
    causalDNAs:chosen.slice(0,4).map((row,index)=>({id:row.id,source:row.source,principle:row.principle,gameplayConversion:row.gameGrammar,fusionRole:index%2===0?`${profile.a}의 선택 조건을 바꾼다.`:`${profile.b}의 대응 결과를 바꾼다.` })),
    brokenGenreAssumption:`${profile.genre}의 단순한 목표 달성이 끝이 아니다. ${aMaterial}과 ${bMaterial}의 반작용이 다음 세계법칙을 변경한다.`,
    newPrimaryVerb:`${profile.a}의 결과를 ${profile.b}로 전환하고 달라진 조건을 다시 활용한다.`,
    worldRule:`${aMaterial}에 의해 바뀐 인물·지역의 상태는 ${bMaterial}의 선택으로 되돌아오며 다음 사건의 입장 조건을 결정한다.`,
    causalFusion:[bridge,`${cMaterial1}에 의한 반응은 ${cMaterial2}의 비용과 정보를 바꾸고, 그 결과는 ${secondaryGenre}의 판단 규칙으로 다시 반영된다.`],
    irreducibilityTest:{removeFirstAxis:`${profile.a}을 빼면 ${aMaterial}의 제약이 사라져 ${profile.b} 대응의 원인을 잃는다.`,removeSecondAxis:`${profile.b}를 빼면 ${bMaterial}의 반작용이 사라져 다음 ${profile.a}에서 배울 수 있는 선택지가 사라진다.`,verdict:'A/B 중 어느 하나나 C의 보조 장르를 제거하면 정보·동선·세계 반응이 달라지므로 장식으로 대체할 수 없다.'},
    storyWorldBindings:{
      emotionalConflict:`${aMaterial}의 원칙을 지키는 인물과 ${bMaterial}의 책임을 지려는 인물이 목표를 놓고 충돌한다.`,
      characterRule:'인물은 플레이어의 이전 선택을 기억하고 신뢰·거래·협력 조건을 변경한다.',
      monsterRule:'상대나 위협은 누적된 세계 상태에 반응해 접근 경로와 대응 방식을 변경한다.',
      regionRule:`${aMaterial}의 흔적이 남은 지역은 ${bMaterial}의 선택에 따라 새로운 출입·보상 조건을 갖는다.`,
      storyRule:'관계의 갈등이 플레이어의 실제 선택을 통해 해결되거나 심화되고, 그 결과가 다음 사건의 원인이 된다.',
      plausibility:`${first.principle}와 ${second.principle}가 이 세계의 인간관계와 지역 규칙을 지속적으로 지배한다.`
    },
    gameplaySystemFusion:{
      formula:'MAIN × A × B × C',
      main:{name:gameName,purpose:`${identity}에서 플레이어는 선택을 누적해 목적을 완수한다.`,playerAction:coreLoop[0],stateContribution:'플레이어 행동은 다음 목표·위험·세계 반응의 공통 상태를 갱신한다.'},
      majorAxes:[
        {key:'A',name:`${profile.a} × ${aMaterial}`,systemFamily:profile.a,sourceMaterial:aMaterial,sourceDomain:first.source,materialRule:`${first.gameGrammar} 따라서 ${profile.a}의 경로와 비용이 바뀐다.`,purpose:stateA,playerChoice:chooseA,stateContribution:stateA},
        {key:'B',name:`${profile.b} × ${bMaterial}`,systemFamily:profile.b,sourceMaterial:bMaterial,sourceDomain:second.source,materialRule:`${second.gameGrammar} 따라서 ${profile.b}의 정보·대응이 바뀐다.`,purpose:stateB,playerChoice:chooseB,stateContribution:stateB}
      ],
      themeFusion:{
        themes:[{name:cMaterial1,kind:'MATERIAL',causalEffect:`${third.gameGrammar} 그 결과 A와 B가 공유하는 조건이 바뀐다.`},{name:cMaterial2,kind:'MATERIAL',causalEffect:`${fourth.gameGrammar} 그 결과 사건의 비용과 다음 선택이 달라진다.`}],
        genres:[{role:'PRIMARY',name:profile.genre,gameplayEffect:`${profile.a}와 ${profile.b}를 통한 중심 목표와 위험·보상을 판단한다.`},{role:'SECONDARY',name:secondaryGenre,gameplayEffect:`${cMaterial1}의 단서와 ${cMaterial2}의 반응 때문에 같은 목표의 정보·행동·결과가 달라진다.`}],
        genreInterlock,jointWorldRule:`${cMaterial1}와 ${cMaterial2}가 충돌하면 지역의 접근·인물의 입장과 목표가 갱신된다.`,abGameplayEffect:bridge
      },
      crossSystemRules:[`MAIN의 목표가 ${profile.a}에서 추적할 경로와 정보를 결정한다.`,`A의 결과로 ${profile.b}의 비용·위험·가능 행동이 달라진다.`,`B의 대응 결과가 다음 ${profile.a}의 조건을 되돌려 바꾼다.`,`C의 두 소재와 ${secondaryGenre} 판단이 위 두 시스템의 정보·경로를 변경한다.`]
    },
    delveLayer:{formulaSuffix:'+ @',role:'DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS',elements:delveConditions.map(row=>({name:row.name,discoveryCondition:row.condition,masteryOrInsight:row.insight,gameplayEffect:row.effect,connectsTo:row.links}))},
    emergentGenre:{name:`${aMaterial}·${bMaterial} ${profile.genre}`,definition:`${profile.a}과 ${profile.b}의 왕복 결과에 ${cMaterial1}·${cMaterial2}와 ${secondaryGenre} 판단이 개입해 다음 월드 상태가 변하는 복합 장르다.`,whyNotSingleConventionalGenre:'한쪽 시스템이나 소재, 보조 장르를 제거하면 가능 경로와 사건 원인이 바뀌므로 단일 장르 규칙으로 환원할 수 없다.',grammarFormula:'MAIN × A × B × C + @',categoryRole:'SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE'},
    expansionVectors:[`${profile.a}의 새로운 지역에서 이전 인과 선택을 다시 해석한다.`,`${profile.b}의 새 상대는 기존 상태를 증폭하거나 반전한다.`,`${cMaterial1}과 ${cMaterial2}의 조합에 다른 인간 갈등을 연결한다.`,'발견된 단서와 숙련을 기존 시스템 두 개 이상의 새로운 운용으로 확장한다.']
  };
  return {
    requestId:target.requestId,category,gameName,referenceGames:[],coreFunToLearn:[bridge,genreInterlock],
    coreLoop,distinctIdentity:identity,targetAudience:`${profile.genre} 장르에서 실제 선택과 세계 반응을 탐색하는 모바일 플레이어`,
    initialTargetPlatform:target.platform,initialPlayMode:'PROJECT_DEFINED',multiplayerDesignMode:['COOP','COMPETITIVE','HYBRID'].includes(clean(target?.portfolioRequest?.multiplayerDesignMode).toUpperCase())?clean(target.portfolioRequest.multiplayerDesignMode).toUpperCase():(/BATTLEGROUND|PVP|RACING|PARTY/.test(category)?'COMPETITIVE':'COOP'),
    crossPlatformExpansionValue:'동일 인과문법을 보존한 플랫폼별 네이티브 구현에 적용 가능하다.',
    steamExpansionPossible:'POSSIBLE',transformationMode:'ORIGINAL_COMPOSITION',
    gameplaySketch:{version:5,source:'VIBE_NATIVE_CAUSAL_COMPOSITION',novelGameGrammar:grammar,
      worldModel:`${gameName}의 공간은 ${aMaterial}와 ${bMaterial} 선택의 결과로 목표·동선·위험이 달라진다.`,
      interactionChains:[`${chooseA} -> ${stateA} -> ${chooseB} -> ${stateB}`],
      actors:[`플레이어: ${profile.a}와 ${profile.b}의 선택을 담당한다.`,`인물과 상대: ${aMaterial}·${bMaterial}의 결과를 기억하고 반응한다.`],
      identityCore:{oneLineFantasy:identity,playerRole:`${gameName}의 ${profile.playerRole}이자 인과 선택의 책임자`,
        representativeAction:coreLoop[0],representativeChoice:coreLoop[1],
        signatureWorldRule:grammar.worldRule,signatureSystemPromise:[bridge],
        growthIdentity:'성장하면 과거의 선택을 재해석하고 새로운 우회 경로·관계·숙련 조합을 연다.',
        threeSentenceTest:{whatGame:identity,whatDifferent:bridge,whatGrowthUnlocks:'발견한 상태 연결을 재사용해 새로운 접근 경로와 대응법을 연다.'}
      }
    }
  };
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
      :targets.map(computeVibeSeedProposal);
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
      modelCalls:0,
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

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  runGameSeedBootstrap().then(result=>{
    console.log(JSON.stringify(result,null,2));
    console.log(`GAME_SEED_CREATED_COUNT=${result.created.length}`);
    console.log(`GAME_SEED_REUSED_COUNT=${(result.reused||[]).length}`);
    console.log(`GAME_SEED_DUPLICATE_POLICY=${result.duplicatePolicy||'SEARCH_EXISTING_ACTIVE_SEEDS_THEN_REUSE_SIMILAR_NO_DUPLICATE_CREATION'}`);
    console.log(`GAME_SEED_DUPLICATE_SIMILARITY_THRESHOLD=${result.duplicateSimilarityThreshold??GAME_SEED_CONCEPT_REUSE_SIMILARITY_THRESHOLD}`);
    console.log(`GAME_SEED_MODEL_CALLS=${result.modelCalls}`);
    console.log('GAME_SEED_DESIGN_ENGINE=VIBE_NATIVE_CAUSAL_COMPOSITION');
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
