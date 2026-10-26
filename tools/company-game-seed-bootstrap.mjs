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
// New creation must never use the legacy MAIN × A × B × C fallback when
// the canonical design classification is unavailable. Historical records stay readable.
export function verifiedSeedBasicDesignMethod(file=process.env.COMPANY_VERIFIED_DESIGN_POLICY_PATH){
  const source=clean(file);
  if(!source||!fs.existsSync(source))throw new Error('GAME_SEED_VERIFIED_DESIGN_POLICY_PATH_REQUIRED');
  const roadmap=readJson(source,{});
  const method=roadmap?.continuousGameplaySystemEvolutionContract?.gameIdentityConceptContract?.novelCausalGameGrammar?.ownerBasicDesignMethod;
  if(roadmap?.authority!=='MACHINE_EXECUTION_CONTRACT'
    ||method?.formula!=='MAIN = A + B + C + D + @'
    ||!Number.isInteger(method?.version)||method.version<1
    ||!Array.isArray(method.gameGenreClassification)||method.gameGenreClassification.length===0
    ||!Array.isArray(method.materialClassification)||method.materialClassification.length===0
    ||!Array.isArray(method.creativeGenreExamplesKo)||method.creativeGenreExamplesKo.length<2)
    throw new Error('GAME_SEED_OWNER_ABCD_PLUS_AT_STANDARD_REQUIRED');
  return method;
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
    basicDesignMethod:verifiedSeedBasicDesignMethod(),
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
    ...(!raw.standardVersion?{themes:authoredThemes.map(row=>({name:clean(row?.name),kind:clean(row?.kind).toUpperCase(),causalEffect:clean(row?.causalEffect)}))}:{}),
    genres:(Array.isArray(fusion.themeFusion?.genres)?fusion.themeFusion.genres:[]).map(row=>({
      role:clean(row?.role).toUpperCase(),name:clean(row?.name),gameplayEffect:clean(row?.gameplayEffect)
    })),
    genreInterlock:clean(fusion.themeFusion?.genreInterlock),
    jointWorldRule:clean(fusion.themeFusion?.jointWorldRule),
    abGameplayEffect:clean(fusion.themeFusion?.abGameplayEffect)
  };
  const gameplaySystemFusion={
    formula:raw.standardVersion?raw.standardFormula:'MAIN × A × B × C',
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
    ...(row?.sourceDId?{sourceDId:clean(row.sourceDId)}:{}),
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
    ...(raw.standardVersion?{standardVersion:raw.standardVersion,standardFormula:raw.standardFormula,representativeGameReference:raw.representativeGameReference?structuredClone(raw.representativeGameReference):null,existingSystemReference:raw.existingSystemReference?structuredClone(raw.existingSystemReference):null,existingGameSystemRole:raw.existingGameSystemRole||null,dCreations:structuredClone(raw.dCreations||[])}:{}),
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
    emergentGenre:{name:emergentName,definition:clean(emergentRaw.definition)||`${primary} 정체성을 중심으로 A/B의 시스템×소재가 서로 상태를 바꾸고 C의 두 소재·메인·보조 장르가 사건과 규칙을 생성하며 @ 파고들기가 계속 확장되는 복합장르다.`,whyNotSingleConventionalGenre:clean(emergentRaw.whyNotSingleConventionalGenre)||'기존 장르 태그 하나가 플레이를 정의하지 않으며 재료 인과법칙·MAIN 주제·A/B 시스템·C 소재와 장르·@ 파고들기의 관계 자체가 게임의 반복 규칙을 만든다.',grammarFormula:raw.standardVersion?raw.standardFormula:'MAIN × A × B × C + @',categoryRole:'SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE'},
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
  if(target.basicDesignMethod){
    const grammar=p?.gameplaySketch?.novelGameGrammar;
    const expected=target.basicDesignMethod.formula;
    if(grammar?.standardVersion!==target.basicDesignMethod.version
      ||grammar?.gameplaySystemFusion?.formula!==expected
      ||grammar?.emergentGenre?.grammarFormula!==expected
      ||!Array.isArray(grammar.dCreations)||grammar.dCreations.length===0)
      throw new Error('GAME_SEED_NONCANONICAL_DESIGN_GRAMMAR_REJECTED');
  }
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
  // 메인: 새 문법의 기존 게임은 B 시스템만 참고한다. 과거 A 참고도 새 문법에서는 B로 승계한다.
  const bReference=target.basicDesignMethod
    ?(['B_SYSTEM_ONLY','B_SUPPORTING_REFERENCE_ONLY','B_EXISTING_GAME_SYSTEMS'].includes(target.bSystemReference?.scope)?target.bSystemReference:
      target.aSystemReference?.scope==='A_SYSTEM_ONLY'?target.aSystemReference:null)
    :null;
  const freeTopicMode=target.designTopicMode==='VIBE_FREE_TOPIC'||Boolean(bReference);
  const requestedName=freeTopicMode?'':clean(target.gameName||target.ownerGameName);
  const ownerBrief=freeTopicMode?'':clean(target.ownerBrief||target.brief);
  const requestContext=freeTopicMode?'':[target.basicDesignMethod?'':requestedName,ownerBrief,clean(target.gameDescription),...(Array.isArray(target.coreLoop)?target.coreLoop.map(clean):[])].join(' ');
  const context=(category+' '+requestContext).toLowerCase();
  const obbyProfile={
    genre:'오비',
    a:'장애물 경로와 점프 타이밍',
    b:'체크포인트와 구간 기믹 운용',
    choiceA:'발판 이동 주기와 점프 거리를 관찰해 착지 경로와 도약 시점을 선택',
    choiceB:'통과한 체크포인트와 구간 장치의 상태를 바꾸어 다음 장애물의 접근 경로와 위험을 선택',
    playerRole:'장애물 도전자'
  };
  const profiles={
    OBBY:obbyProfile,PLATFORMER:obbyProfile,OBBY_PLATFORMER:obbyProfile,
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
    INFECTION:{genre:'감염 추격',a:'진영 전환과 추격 경로',b:'정화와 팀 대응',choiceA:'상대 진영과 이동 경로를 읽고 감염 또는 회피의 시점과 대상을 선택',choiceB:'바뀐 인원과 역할을 읽고 정화·지원·반격의 우선순위를 선택',playerRole:'감염 추격전 참가자'},
    KINGDOM:{genre:'왕국 경영',a:'채집과 주민 자동화',b:'병력 편성과 거점 정복',choiceA:'자원 부족과 주민 역할을 비교해 직접 채집과 자동화 투자의 순서를 선택',choiceB:'확보한 자원과 병력의 조건으로 다음 거점·지원·귀환 경로를 선택',playerRole:'작은 왕국의 운영자'},
    DEFENSE:{genre:'전략',a:'방어 시설 배치',b:'적 패턴과 자원 대응',choiceA:'접근 경로와 적의 사거리 사이에서 배치 위치를 선택',choiceB:'웨이브와 자원 상태에 따라 강화·수리·대응 대상을 결정',playerRole:'방어 지휘관'},
    CASUAL_TOUCH:{genre:"캐주얼",a:"짧은 입력과 점수 획득",b:"보너스 선택과 빠른 재시도",choiceA:"화면의 대상과 타이밍을 고르고 입력 결과를 확인",choiceB:"획득한 점수와 위험에 따라 다음 도전 목표를 선택",playerRole:"도전자"},
    ACTION:{genre:"액션",a:"움직임과 공격 타이밍",b:"회피와 적 행동 대응",choiceA:"공격 범위와 적 전조를 읽어 행동을 입력",choiceB:"이전 공격 결과에 맞춰 회피 위치와 다음 대응을 선택",playerRole:"액션 플레이어"},
    ACTION_RPG:{genre:"액션 RPG",a:"능력 조합과 실시간 전투",b:"장비 성장과 퀘스트 분기",choiceA:"공격 기술과 이동을 조합해 교전 방식을 선택",choiceB:"획득한 기술과 장비로 다음 의뢰 및 전투 방식을 조정",playerRole:"모험가"},
    TACTICAL_RPG:{genre:"전술 RPG",a:"동료 배치와 행동 순서",b:"지형과 적 대응 전술",choiceA:"부대의 위치와 턴 행동의 순서를 결정",choiceB:"이전 턴의 피해와 지형 변화를 읽고 역할 분담을 변경",playerRole:"전술 지휘관"},
    MMORPG:{genre:"다중접속 RPG",a:"파티 역할과 공동 전투",b:"거래와 장기 성장 경로",choiceA:"동료의 역할과 공동 목표를 확인해 협동 행동을 선택",choiceB:"파티 획득 보상과 장비·교환 조건으로 다음 지역을 선택",playerRole:"파티 모험가"},
    ADVENTURE:{genre:"어드벤처",a:"지역 조사와 이야기 목표",b:"선택 결과와 새로운 길",choiceA:"현재 지역의 단서를 확인하고 조사할 장소를 결정",choiceB:"획득한 증거에 따라 사건 접근 순서와 다음 장소를 선택",playerRole:"탐험가"},
    ACTION_ADVENTURE:{genre:"액션 어드벤처",a:"탐험 경로와 실시간 행동",b:"환경 장치와 위험 대응",choiceA:"이동 경로와 사용할 행동 기술의 순서를 고름",choiceB:"이전 상호작용이 바꾼 지형 조건을 활용해 다음 장치를 선택",playerRole:"모험가"},
    EXPLORATION:{genre:"탐험",a:"미지 공간과 지도 정보 수집",b:"지형 발견과 위험 경로 계획",choiceA:"새 지역에서 지도 단서와 접근 가능 통로를 조사",choiceB:"발견한 지형과 위험 정보를 반영해 귀환과 탐험 경로를 결정",playerRole:"탐사자"},
    OPEN_WORLD:{genre:"오픈월드",a:"자유 목적지와 환경 사건 선택",b:"지역 변화와 평판 반응",choiceA:"여러 월드 목표 중 방문할 장소와 행동을 스스로 선택",choiceB:"완료한 목표가 바꾼 지역 관계에 맞춰 다음 활동을 결정",playerRole:"여행자"},
    SHOOTER:{genre:"슈팅",a:"조준과 탄약 운용",b:"엄폐와 상대 위치 변화",choiceA:"목표의 움직임을 읽고 사격 위치와 시점을 선택",choiceB:"발사 결과와 남은 탄약에 따라 엄폐와 다음 표적을 변경",playerRole:"사수"},
    FPS:{genre:"일인칭 슈팅",a:"시야와 조준 정밀도",b:"장비 선택과 전술 이동",choiceA:"일인칭 시야에서 위협 위치와 사격 타이밍을 결정",choiceB:"적 반응과 사격 결과에 맞춰 무기와 경로를 조정",playerRole:"전투원"},
    BATTLE_ROYALE:{genre:"배틀로얄",a:"안전 구역과 수집 경로",b:"상대 교전과 생존 판단",choiceA:"줄어드는 안전 지대와 획득 장비를 보고 이동 경로를 결정",choiceB:"다른 참가자의 위치와 장비 차이를 읽고 교전 또는 회피 선택",playerRole:"생존 참가자"},
    FIGHTING:{genre:"격투",a:"거리 조절과 기술 연계",b:"방어 판정과 반격",choiceA:"상대 거리와 빈틈을 읽고 기본기와 연계를 선택",choiceB:"막기와 회피 결과에 따라 반격 타이밍과 다음 기술을 결정",playerRole:"격투가"},
    BEAT_EM_UP:{genre:"난투 액션",a:"다수 적 상대 위치 선정",b:"공격 범위와 군중 대응",choiceA:"주변 적의 분포와 이동 경로를 읽고 공격 방향을 선택",choiceB:"적의 밀집과 공격 전조에 따라 회피와 제압 순서를 변경",playerRole:"전투가"},
    SPORTS:{genre:"스포츠",a:"플레이 선택과 공간 점유",b:"팀 전술과 점수 대응",choiceA:"공 또는 목표물의 위치를 읽고 패스·이동·공격을 선택",choiceB:"점수와 상대 진형 변화에 따라 선수 위치와 전술을 수정",playerRole:"선수"},
    SOCCER:{genre:"축구",a:"패스 경로와 슈팅 기회",b:"상대 수비와 포지션 변경",choiceA:"동료의 공간과 상대 수비를 읽고 패스 또는 드리블을 선택",choiceB:"공격 결과에 맞춰 압박과 수비 라인을 조정",playerRole:"축구 선수"},
    BASKETBALL:{genre:"농구",a:"드리블과 득점 위치 선택",b:"스크린과 수비 전환",choiceA:"코트의 빈 공간을 찾고 돌파·패스·슛 중 하나를 선택",choiceB:"이전 공격 결과를 보고 수비 위치와 다음 공격 전개를 조정",playerRole:"농구 선수"},
    RHYTHM:{genre:"리듬",a:"박자 입력과 콤보 유지",b:"패턴 예측과 난이도 조절",choiceA:"음악 신호에 맞춰 노트의 입력 위치와 타이밍을 선택",choiceB:"판정 결과에 따라 연속 입력 방식과 다음 구간 전략을 변경",playerRole:"연주자"},
    MUSIC:{genre:"음악",a:"악기 연주와 소리 조합",b:"리듬 변화와 연주 목표",choiceA:"악기의 음정과 리듬 순서를 선택해 연주를 구성",choiceB:"청중 또는 합주 결과를 보고 다음 구간의 소리와 구성을 수정",playerRole:"연주자"},
    STEALTH:{genre:"잠입",a:"시야와 소음 회피",b:"경비 경로와 은폐 선택",choiceA:"경비 시야와 움직임을 읽고 진입 타이밍과 은폐 장소를 선택",choiceB:"들킨 흔적과 경비 반응을 보고 우회·대기·장치 사용을 결정",playerRole:"잠입자"},
    SIMULATION:{genre:"시뮬레이션",a:"실제 동작과 환경 상태 조작",b:"결과 관찰과 절차 수정",choiceA:"장치 또는 대상의 현재 상태를 읽고 조작 순서를 선택",choiceB:"시뮬레이션 결과를 분석해 설정과 다음 실험을 조정",playerRole:"운영자"},
    LIFE_SIM:{genre:"생활 시뮬레이션",a:"일상 활동과 시간 배분",b:"관계와 주거 변화",choiceA:"일과 중 방문할 장소와 상호작용 대상을 선택",choiceB:"활동 성과와 관계 변화를 바탕으로 다음 일정을 재구성",playerRole:"주민"},
    ROLEPLAY:{genre:"역할놀이",a:"아바타 역할과 사회 활동",b:"관계와 상황극 선택",choiceA:"자신의 역할과 다른 플레이어와의 상호작용을 결정",choiceB:"대화와 행동으로 바뀐 관계에 맞춰 다음 활동을 선택",playerRole:"역할 연기자"},
    FARMING:{genre:"농장 경영",a:"작물 재배와 수확 계획",b:"토지와 판매 전략",choiceA:"토양과 계절 조건을 읽고 재배할 작물과 경작 구역을 선택",choiceB:"수확 결과와 주문 수요에 맞춰 판매·저장·다음 파종을 변경",playerRole:"농장주"},
    CRAFTING:{genre:"제작",a:"재료 조합과 작업 순서",b:"도구 사용과 제작 효율",choiceA:"보유 재료를 확인하고 만들 물건과 제작 순서를 선택",choiceB:"완성한 도구의 성능과 사용처를 보고 다음 제작 목표를 결정",playerRole:"제작자"},
    SANDBOX:{genre:"샌드박스",a:"자유 건축과 물리 조작",b:"창작물 상호작용과 재구성",choiceA:"월드의 재료와 배치 규칙을 이용해 건축 구조를 선택",choiceB:"구조물의 실제 반응을 관찰해 연결 방식과 다음 목표를 변경",playerRole:"창작자"},
    CITY_BUILDER:{genre:"도시 건설",a:"지역 배치와 도시 서비스",b:"시민 수요와 시설 균형",choiceA:"구역별 교통과 생활 수요를 보고 도로 및 시설 위치를 선택",choiceB:"수용 능력과 예산 변화를 확인해 다른 구역의 계획을 조정",playerRole:"도시 운영자"},
    TOWER_DEFENSE:{genre:"타워 디펜스",a:"방어 유닛과 공격 경로 배치",b:"웨이브에 따른 업그레이드",choiceA:"적의 진입로와 사거리를 확인해 방어 시설을 선택",choiceB:"도착한 적의 특성과 보유 자원에 따라 강화·수리·교체를 결정",playerRole:"방어 지휘관"},
    RTS:{genre:"실시간 전략",a:"실시간 자원 수급과 부대 통제",b:"정찰과 기습 방어",choiceA:"현재 전장을 보고 일꾼과 부대에 이동·생산 명령을 선택",choiceB:"적의 동선을 확인해 수비·공격·자원 전환 순서를 수정",playerRole:"전략 지휘관"},
    TURN_BASED:{genre:"턴제 전략",a:"행동 순서와 턴 자원 배분",b:"적의 다음 행동 예측",choiceA:"턴당 행동 기회를 배분해 이동과 능력 사용을 선택",choiceB:"상대 턴의 결과에 따라 다음 턴의 위치와 우선 대상을 변경",playerRole:"전술 지휘관"},
    AUTO_BATTLER:{genre:"자동 전투",a:"유닛 조합과 배치",b:"상성 대응과 장비 선택",choiceA:"전투 전 유닛 역할과 자리 배치를 결정",choiceB:"자동 전투 결과에 따라 유닛·시너지·장비 조합을 변경",playerRole:"편성 관리자"},
    ROGUELIKE:{genre:"로그라이크",a:"무작위 경로와 위험 보상 선택",b:"획득 능력과 재도전 전략",choiceA:"진행 중 등장한 보상과 위험 중 선택지를 결정",choiceB:"실패로 학습한 패턴을 적용해 다음 진입 빌드와 경로를 바꿈",playerRole:"탐험가"},
    METROIDVANIA:{genre:"탐험 플랫포머",a:"능력으로 여는 지형 경로",b:"이전 장소 재방문과 비밀 발견",choiceA:"현재 이동 능력으로 도달 가능한 지역의 통로를 탐색",choiceB:"새 능력 획득 후 과거 장소로 돌아가 다른 접근 경로를 찾음",playerRole:"탐험가"},
    DETECTIVE:{genre:"추리",a:"증거 수집과 가설 조합",b:"증언 검증과 사건 해석",choiceA:"조사한 단서들을 연결해 확인할 가설을 선택",choiceB:"증언의 모순을 판정해 새로운 조사 대상과 해결 방향을 정함",playerRole:"탐정"},
    VISUAL_NOVEL:{genre:"비주얼 노벨",a:"대화 선택과 인물 관계",b:"분기 사건과 정보 회수",choiceA:"대화 속 선택이 인물에게 주는 영향을 읽고 답변을 결정",choiceB:"바뀐 관계와 사건 정보를 활용해 다음 대화와 장면을 선택",playerRole:"주인공"},
    PARTY:{genre:"파티",a:"짧은 미니게임 규칙 대응",b:"협력 경쟁과 라운드 전략",choiceA:"라운드 목표를 읽고 사용할 이동·상호작용을 선택",choiceB:"점수 결과와 다음 규칙에 맞춰 협력 또는 경쟁 방식을 변경",playerRole:"참가자"},
    MINIGAME:{genre:"미니게임",a:"즉각적인 목표 달성과 입력",b:"시간 제한과 점수 경로",choiceA:"짧은 규칙에 맞춰 버튼·이동·상호작용의 타이밍을 선택",choiceB:"결과에 따라 다음 시도의 접근법과 목표 점수를 조정",playerRole:"참가자"},
    BOARD:{genre:"보드 게임",a:"칸 이동과 차례별 선택",b:"상대의 다음 수와 전략 변화",choiceA:"주어진 차례에서 이동할 칸이나 사용할 행동을 선택",choiceB:"상대의 선택으로 바뀐 판 상황을 읽고 다음 차례를 계획",playerRole:"플레이어"},
    ARCADE:{genre:"아케이드",a:"빠른 조작과 점수 수집",b:"난이도 변화와 실수 회복",choiceA:"접근하는 목표에 맞춰 이동과 입력 타이밍을 조정",choiceB:"연속 성공과 실패 결과를 확인해 다음 패턴 대응을 변경",playerRole:"도전자"},
    COLLECTION:{genre:"수집",a:"수집 대상 탐색과 확보",b:"도감 완성과 교환 조합",choiceA:"희귀도와 위치 정보를 보고 수집할 대상을 결정",choiceB:"수집 진척과 중복 자원을 활용해 교환 또는 새로운 탐색을 선택",playerRole:"수집가"},
    PET_SIM:{genre:"펫 시뮬레이션",a:"반려동물 돌보기와 성장",b:"훈련과 성격 상호작용",choiceA:"현재 상태를 읽고 돌봄·먹이·놀기 활동을 선택",choiceB:"친밀도와 행동 변화에 따라 훈련과 다음 모험을 조정",playerRole:"보호자"},
    IDLE:{genre:"방치형",a:"자동 생산과 자원 소비 선택",b:"생산 라인과 성장 투자",choiceA:"수익률과 생산 대기를 비교해 강화할 시설을 선택",choiceB:"획득 자원을 새로운 단계와 자동화에 재투자",playerRole:"운영자"},
    EDUCATIONAL:{genre:"교육",a:"문제 해결과 지식 적용",b:"피드백 분석과 학습 경로",choiceA:"현재 문제를 읽고 해결 절차와 정답 후보를 선택",choiceB:"오답의 이유를 확인해 다음 학습 과제와 연습 방법을 조정",playerRole:"학습자"},
    VEHICLE_SIM:{genre:"운전 시뮬레이션",a:"차량 조작과 도로 판단",b:"노면과 안전 운행 계획",choiceA:"차량 속도와 도로 상태에 맞춰 조향·가속·제동을 선택",choiceB:"주행 결과와 목적지 조건에 따라 차량 운용을 수정",playerRole:"운전자"},
    COOKING:{genre:"요리",a:"조리 단계와 재료 조합",b:"주문 시간과 주방 동선",choiceA:"레시피와 재료 상태에 맞춰 조리 순서를 선택",choiceB:"완성된 요리와 주문 피드백을 확인해 다음 조리 계획을 조정",playerRole:"요리사"},
    SOCIAL_DEDUCTION:{genre:"사회적 추리",a:"증언과 거짓 정보 비교",b:"투표와 집단 신뢰 결정",choiceA:"참가자의 행동과 발언을 관찰해 의심 대상을 선택",choiceB:"공개된 증거와 투표 결과에 따라 다음 설득 전략을 변경",playerRole:"조사자"},
    SURVIVAL_CRAFTING:{genre:"생존 제작",a:"자원 채집과 생존 경로",b:"장비 제작과 기지 위험 대응",choiceA:"체력·환경 위험과 자원 위치를 읽고 채집 지역을 선택",choiceB:"제작한 도구와 자원 상태에 따라 안전거점과 다음 탐색을 계획",playerRole:"생존자"},
    HORROR_ESCAPE:{genre:"공포 탈출",a:"위협 회피와 탈출 단서 조사",b:"방 잠금과 협력 퍼즐",choiceA:"공간의 소리와 흔적을 통해 안전한 이동 및 단서 조사를 선택",choiceB:"발견한 열쇠·규칙과 위협 위치에 맞춰 탈출 경로를 바꿈",playerRole:"탈출자"},
    OBBY_PARTY_MINIGAME:{genre:"장애물 파티",a:"장애물 이동과 짧은 라운드 목표",b:"반응 타이밍과 경쟁 보상 선택",choiceA:"발판 위험과 라운드 목표를 읽고 점프·회피 경로를 선택",choiceB:"완료 결과와 다음 규칙에 맞춰 이동 전략을 조정",playerRole:"참가자"},
    ROLEPLAY_LIFE_AVATAR:{genre:"아바타 역할놀이",a:"아바타 꾸미기와 역할 활동",b:"집과 사회 공간 관리",choiceA:"아바타 역할을 고르고 월드에서 수행할 활동을 선택",choiceB:"완료한 활동과 사회적 피드백으로 집·의상·모임 목표를 변경",playerRole:"주민"},
    SIMULATOR_TYCOON_INCREMENTAL:{genre:"시뮬레이터 경영",a:"자원 생산과 업그레이드 선택",b:"자동화와 구역 확장",choiceA:"획득 자원과 생산 속도를 비교해 강화 대상을 선택",choiceB:"이전 수익으로 자동화 설비와 다음 구역을 결정",playerRole:"운영자"},
    BATTLEGROUND_FIGHTING_SHOOTER:{genre:"대전 슈팅 액션",a:"전장 이동과 공격 기술 사용",b:"상대 기술과 팀 전술 대응",choiceA:"상대 위치와 공격 전조에 맞춰 기술·조준을 선택",choiceB:"교전 결과와 팀 상황에 따라 장비·엄폐·협동 공격을 조정",playerRole:"전투원"},
    SURVIVAL_HORROR_ESCAPE:{genre:"생존 공포 탈출",a:"위험한 장소 탐색과 자원 관리",b:"위협 대응과 탈출 목표",choiceA:"위협 징후를 보고 탐색할 장소와 사용할 물건을 선택",choiceB:"획득 단서와 자원에 따라 회피·협동·탈출 경로를 결정",playerRole:"생존자"},
    STORY_RPG_ADVENTURE_RPG:{genre:"스토리 RPG",a:"의뢰 수주와 월드 탐험",b:"전투 성장과 이야기 선택",choiceA:"NPC 의뢰와 지역 정보를 읽고 다음 목적지를 선택",choiceB:"전투 결과로 얻은 능력을 바탕으로 퀘스트 경로와 선택을 변경",playerRole:"모험가"},
  };
  const explicitObby=['OBBY','PLATFORMER','OBBY_PLATFORMER'].includes(category.toUpperCase())||/오비|플랫포머|obby|platformer|파쿠르|parkour/i.test(requestedName);
  const school=/학교|school/.test(context);
  const schoolCombat=/괴물|monster|퇴마|exorc|combat|전투|액션/.test(requestContext.toLowerCase());
  const schoolProfile=school?{genre:'경영',a:'학교 시설 건축과 배치',
    b:schoolCombat?'괴물 대응 액션':'학생·교사와 교육 운영',
    choiceA:'교실·복도·특수 시설의 배치로 접근과 안전 구역을 선택',
    choiceB:schoolCombat?'시설이 만든 위험에 따라 괴물의 공격을 피하거나 봉인하는 대응을 선택':'학생의 필요와 교사 배치에 맞춰 학사 운영의 우선순위를 결정',
    playerRole:'학교 운영자'}:null;
  const topicalProfiles=[
    [/오비|플랫포머|obby|platformer|파쿠르|parkour/,obbyProfile],
    [/감염.{0,40}추격|감염전|infection.{0,40}chase/,profiles.INFECTION],
    [/왕국|kingdom|주민.{0,30}자동화|거점.{0,30}점령|정복|conquest/,profiles.KINGDOM],
    [/타이쿤|tycoon|놀이공원|theme.?park|상점.?운영|management/,profiles.TYCOON],
    [/생존|survival|크래프팅|crafting/,profiles.SURVIVAL],
    [/레이싱|racing|경주|race/,profiles.RACING],
    [/디펜스|defense|tower.?defense|방어전/,profiles.DEFENSE],
    [/퍼즐|puzzle|추리게임/,profiles.PUZZLE],
    [/호러|horror|공포|퇴마|귀신/,profiles.HORROR],
    [/카드|card|덱빌딩|deckbuild/,profiles.CARD],
    [/롤플레잉|\brpg\b|역할게임|던전/,profiles.RPG],
  ];
  // MAIN의 명시된 주제를 먼저 잡고, 세계관 소재 단어가 다른 게임 시스템을 선택하지 않게 한다.
  const topicMatch=topicalProfiles.find(([pattern])=>pattern.test(requestedName.toLowerCase()))
    ||topicalProfiles.find(([pattern])=>pattern.test(requestContext.toLowerCase()));
  // 오너가 주제를 완전히 재창작하도록 요청한 경우, 기존 게임명·소개·장르의 프로필 매칭을 하지 않는다.
  // 후보 시스템 선택도 외부 대필 없이 기존 Vibe의 결정론적 선택으로 수행한다.
  // 자유주제는 일반 게임 장르 전체를 시스템 후보로 사용한다. 신규 플랫폼 장르도 같은 원본 프로필에서 자동 수용한다.
  const registeredCategories=freeTopicMode?Object.values(typeof platformProfiles==='object'?platformProfiles?.platforms||{}:{})
    .flatMap(platform=>Object.entries(platform?.categories||{})):[];
  const registeredProfiles=registeredCategories.filter(([id])=>!profiles[id]).map(([id,registered])=>{
    const groups=(registered.requiredConceptGroups||[]).map(group=>Array.isArray(group)?group.filter(Boolean).slice(0,2).join('·'):'').filter(Boolean);
    const genre=id.replaceAll('_',' ').toLowerCase();
    const first=groups[0]||'목표·행동',second=groups[1]||'상태·결과';
    return {genre,a:`${first} 목표 선택`,b:`${second} 대응 선택`,
      choiceA:`${first} 관련 상태를 관찰하고 수행할 행동과 대상을 결정`,
      choiceB:`앞선 결과를 읽고 ${second} 조건에 맞춰 다음 대응과 재진입을 선택`,playerRole:'플레이어'};
  });
  const freeProfiles=[...new Map([...Object.values(profiles),...registeredProfiles].map(row=>[`${row.genre}|${row.a}|${row.b}`,row])).values()];
  const freeFingerprint=[...`${target.requestId}|${target.topicRevision||''}|${target.variant||0}`]
    .reduce((hash,ch)=>Math.imul(hash^ch.codePointAt(0),16777619)>>>0,2166136261);
  // 자유주제는 과거 장르의 A/B 한 벌을 그대로 고르는 대신 서로 다른 행동 계열을 인과적으로 결합한다.
  const referenceBaseline=Number(target.basicDesignMethod?.version)>=2;
  const baseProfile=referenceBaseline&&bReference&&profiles[category]?profiles[category]:freeTopicMode?freeProfiles[freeFingerprint%freeProfiles.length]:
    (explicitObby?obbyProfile:null)||schoolProfile||topicMatch?.[1]||profiles[category]||
    topicalProfiles.find(([pattern])=>pattern.test(context))?.[1]||
    {genre:'모험',a:'경로 탐색과 목표 선택',b:'환경과 상대의 상태 대응',choiceA:'목표를 향할 경로와 상호작용 순서를 결정',choiceB:'경로 결과로 바뀐 세계와 상대의 상태에 대응',playerRole:'플레이어'};
  // A 시스템만 허용된 기존 시드 참고다. 이전 제목·세계관·소재·장르·B/@는 절대로 참조하지 않는다.
  const aOnly=!target.basicDesignMethod&&freeTopicMode&&target?.aSystemReference?.scope==='A_SYSTEM_ONLY'?target.aSystemReference:null;
  const aSystem=clean(aOnly?.systemFamily);
  const aChoice=clean(aOnly?.playerChoice);
  const freePartners=freeTopicMode?freeProfiles.filter(row=>row.genre!==baseProfile.genre
    &&row.b!==baseProfile.b&&row.b!==baseProfile.a&&row.b!==aSystem):[];
  const partner=freePartners.length?freePartners[(freeFingerprint>>>9)%freePartners.length]:baseProfile;
  const profile=freeTopicMode?{...baseProfile,
    a:aSystem||baseProfile.a,choiceA:aChoice||baseProfile.choiceA,
    b:partner.b,choiceB:partner.choiceB}: {...baseProfile};
  // 메인: 새 문법의 A는 이름 있는 참고게임, B는 원본 시스템 자체다.
  // 소재·세계관의 자유 창작과 기존 시스템의 임의 대체를 혼동하지 않는다.
  let representativeGame=null;
  if(referenceBaseline){
    const examples=target.basicDesignMethod.representativeGameExamples||[];
    const requested=target.representativeGameReference;
    const name=clean(typeof requested==='string'?requested:requested?.name);
    representativeGame=typeof requested==='object'&&requested?.name?requested:
      name?examples.find(row=>row.name===name):null;
    if(name&&!representativeGame)throw new Error('A_REFERENCE_GAME_SYSTEM_EVIDENCE_REQUIRED:'+name);
    if(!representativeGame){
      const genre=target.basicDesignMethod.gameGenreClassification.find(row=>row.detailed.includes(baseProfile.genre))?.representative;
      representativeGame=examples.find(row=>row.gameGenre===genre)
        ||examples.find(row=>row.gameGenre===(/RPG|SURVIVAL/.test(category)?'역할수행':/DEFENSE|STRATEGY/.test(category)?'전략':'액션'));
    }
    if(!representativeGame||!['name','systemFamily','playerChoice','source'].every(key=>clean(representativeGame[key])))
      throw new Error('A_REFERENCE_GAME_SYSTEM_EVIDENCE_REQUIRED');
    profile.a=clean(representativeGame.systemFamily);profile.choiceA=clean(representativeGame.playerChoice);
    profile.genre=clean(representativeGame.gameGenre)||baseProfile.genre;
    if(bReference){
      if(!['systemFamily','playerChoice','source'].every(key=>clean(bReference[key])))throw new Error('B_EXISTING_GAME_SYSTEM_EVIDENCE_REQUIRED');
      profile.b=clean(bReference.systemFamily);profile.choiceB=clean(bReference.playerChoice);
    }
  }
  const materialNames={
    KARMA_RETURN:'업보와 인과응보',MANDATE_LEGITIMACY:'왕조의 정통성과 민심',RITUAL_RECIPROCITY:'의례와 호혜 관계',ANCESTOR_MEMORY:'조상 기억과 계승',
    PROPHECY_SELF_FULFILLMENT:'그리스 비극의 자기실현 예언',HUBRIS_NEMESIS:'오만과 응보',OATH_CONTRACT:'서사시의 맹세와 계약',
    SACRIFICE_SUBSTITUTION:'희생 제의와 대가 교환',TABOO_POLLUTION:'민속 금기와 전염',TRICKSTER_REVERSAL:'신화 속 트릭스터의 질서 역전',
    COMEDIC_MISUNDERSTANDING:'희극의 오해와 엇갈림',CARNIVAL_STATUS_REVERSAL:'축제의 신분 반전',DIALECTIC_SYNTHESIS:'철학의 변증법',
    SHIP_OF_THESEUS_IDENTITY:'테세우스의 배와 정체성',TESTIMONY_CONSENSUS_REALITY:'증언과 합의된 현실',
    DYNASTIC_INHERITANCE:'왕조 계승과 유산',FACTION_BALANCE:'역사적 세력 균형',PATRONAGE_NETWORK:'후원과 인맥 관계',
    EXILE_RETURN:'서사시의 추방과 귀환',MARTYRDOM_MOVEMENT:'순교와 집단 결속',PILGRIMAGE_TRANSFORMATION:'순례와 인물 변화',
    FORTUNE_REVERSAL:'비극과 희극의 운명 반전',ABSURD_BUREAUCRACY:'풍자 속 관료제',NAME_AND_REPUTATION_POWER:'영웅서사의 이름과 평판',
    SCIENCE_ECOLOGY:'생태학과 관계의 변화',SCIENCE_ASTRONOMY:'천문학과 별의 관측',SCIENCE_INVENTION:'과학적 발명과 실험',NARRATIVE_PERSPECTIVE:'서사의 시점 변화',
    EAST_ASIAN_CONFUCIAN_RITES:'동아시아 예절과 관계',EAST_ASIAN_BUDDHIST_CAUSALITY:'동아시아 불교의 인과',SOUTH_ASIAN_DHARMA_DUTY:'남아시아의 의무와 삶의 길',
    WESTERN_MONASTIC_COMMUNITY:'서양 수도원 공동체',WEST_ASIAN_COMMUNITY_STEWARDSHIP:'서아시아 공동체의 돌봄과 책임',
    EAST_ASIAN_HISTORICAL_ASTRONOMER:'동아시아 천문학자의 관측',WESTERN_RENAISSANCE_INVENTOR:'르네상스 발명가의 실험',MEDIEVAL_SCHOLAR_OPTICS:'중세 학자의 빛과 시각 연구',HISTORICAL_NAVIGATOR:'역사적 항해가의 길 찾기',
    SCIENCE_THERMAL_COST:'열역학과 에너지의 대가',SCIENCE_CHEMICAL_REACTIONS:'화학의 반응 조건',SCIENCE_GENETIC_ADAPTATION:'유전과 환경 적응',
    PHILOSOPHY_ETHICAL_TRADEOFF:'윤리철학의 가치 충돌',PHILOSOPHY_FREE_WILL:'철학의 자유와 책임',EAST_ASIAN_DAOIST_BALANCE:'동아시아 도가의 균형',
    NARRATIVE_FORESHADOWING:'소설의 복선과 회수',NARRATIVE_MULTIPLE_VIEWPOINTS:'서사의 다중 시점',ART_PERSPECTIVE:'예술의 시각과 구도',MUSIC_RHYTHM:'음악의 리듬 조합',NATURE_SEASONAL_CYCLES:'자연의 계절과 생태 순환'
  };
  // 자유주제에서만 사용하는 열린 창작 소재 후보. 기존 일반 시드와 저장된 소재 풀은 변경하지 않는다.
  const freeCreativeSources=freeTopicMode?[
    {id:"SCIENCE_GRAVITY",label:"물리학·궤도 역학",source:"SCIENCE_PHYSICS_GRAVITY",principle:"중력과 거리의 차이가 같은 힘에서도 이동 경로를 다르게 만든다.",gameGrammar:"위치와 거리 조건에 따라 접근 가능한 경로와 위험이 달라진다."},
    {id:"SCIENCE_ECOLOGY",label:"생태학·상호의존",source:"SCIENCE_ECOLOGY_RELATIONS",principle:"생물과 환경은 서로 영향을 주어 하나의 변화가 다른 관계를 흔든다.",gameGrammar:"한 자원의 사용이 다른 생물의 행동과 자원 경로도 바꾼다."},
    {id:"SCIENCE_INFORMATION",label:"정보과학·전달 지연",source:"SCIENCE_INFORMATION_THEORY",principle:"정보는 전달 시점과 신뢰도에 따라 서로 다른 결정을 낳는다.",gameGrammar:"단서 수신 순서에 따라 협력 가능 여부와 대응 경로가 달라진다."},
    {id:"SCIENCE_CHEMISTRY",label:"화학·촉매 작용",source:"SCIENCE_CHEMISTRY_CATALYSIS",principle:"촉매의 존재가 같은 물질의 반응 경로와 조건을 바꿀 수 있다.",gameGrammar:"가상의 제작 규칙에서 보조 재료가 조합 순서와 장치 동작을 바꾼다."},
    {id:"SCIENCE_EVOLUTION",label:"진화생물학·적응",source:"SCIENCE_EVOLUTION_ADAPTATION",principle:"환경 압력에 따른 생존 방식의 차이가 다음 세대의 특성을 바꾼다.",gameGrammar:"반복되는 행동에 적이 적응해 다음 탐색과 대응의 조건이 변한다."},
    {id:"SCIENCE_TIME",label:"물리학·상대 시간",source:"SCIENCE_RELATIVITY_TIME",principle:"관찰 위치와 상대 운동이 시간·사건 순서를 이해하는 조건이 된다.",gameGrammar:"가상의 세계에서 관찰 경로별 사건 단서와 판정 시점을 다르게 만든다."},
    {id:"HISTORY_TECHNOLOGY",label:"산업사·발명 확산",source:"HISTORY_TECHNOLOGY_CHANGE",principle:"새 도구의 보급은 생산 방식뿐 아니라 노동과 교류 관계도 바꾼다.",gameGrammar:"장치의 새로운 쓰임을 발견하면 제작·거래·이동 경로가 함께 변한다."},
    {id:"HISTORY_TRADE",label:"교역사·항로 개척",source:"HISTORY_TRADE_EXCHANGE",principle:"교역로는 물자의 흐름과 함께 정보와 협력 관계를 새로 만든다.",gameGrammar:"교역 통로를 열면 자원 교환과 인물 관계가 함께 변한다."},
    {id:"HISTORICAL_JANG",label:"장영실의 관측과 발명",source:"HISTORICAL_PERSON_JANG_YEONG_SIL",principle:"관측과 발명으로 새로운 도구의 쓰임과 측정 방식을 찾는다.",gameGrammar:"관찰 기록을 바탕으로 장치 사용 방법과 경로의 접근 조건을 바꾼다."},
    {id:"HISTORICAL_ADA",label:"에이다 러브레이스의 알고리즘적 상상",source:"HISTORICAL_PERSON_ADA_LOVELACE",principle:"추상적 절차를 조합하면 같은 기계도 다른 문제를 풀 수 있다.",gameGrammar:"행동 순서와 계산 규칙의 조합이 자동화의 결과와 목표를 바꾼다."},
    {id:"HISTORICAL_EXPLORER",label:"역사적 탐험가의 기록",source:"HISTORICAL_EXPLORER_RECORDS",principle:"새로 발견한 장소의 기록은 과거에 그린 지도의 의미도 바꾼다.",gameGrammar:"관측 단서를 반영하면 이미 방문한 장소에서 새 경로가 나타난다."},
    {id:"NARRATIVE_UNRELIABLE",label:"서사·믿을 수 없는 화자",source:"NARRATIVE_UNRELIABLE_NARRATOR",principle:"서술자의 제한된 관점은 동일 사건의 의미와 책임을 달리 전달한다.",gameGrammar:"설명자의 신뢰도를 판별해 조사 순서와 대화 선택 조건을 바꾼다."},
    {id:"NARRATIVE_BRANCH",label:"서사·분기와 결과",source:"NARRATIVE_BRANCH_CAUSALITY",principle:"작은 결정이 뒤따르는 사건의 참여자와 원인·결말을 바꾼다.",gameGrammar:"앞서 선택한 사건이 다음 장소와 등장인물의 행동 가능 조건을 바꾼다."},
    {id:"NARRATIVE_FORESHADOW",label:"문학·복선과 회수",source:"LITERATURE_FORESHADOW_PAYOFF",principle:"초반의 징후는 나중 사건에서 다른 의미와 원인으로 되돌아온다.",gameGrammar:"이전에 확인한 단서로 후반 위험의 전조와 다른 대응을 해금한다."},
    {id:"PHILOSOPHY_ETHICS",label:"윤리철학·책임의 딜레마",source:"PHILOSOPHY_ETHICS_DILEMMA",principle:"하나의 이익을 선택하면 다른 가치의 책임과 기회비용이 발생한다.",gameGrammar:"어떤 가치를 우선했는지에 따라 NPC 반응과 행동 조건을 바꾼다."},
    {id:"PHILOSOPHY_IDENTITY",label:"존재철학·변화하는 정체성",source:"PHILOSOPHY_EXISTENTIAL_IDENTITY",principle:"변화 이후에도 무엇이 같은 존재인지에 관한 판단이 달라질 수 있다.",gameGrammar:"도구와 관계를 바꾸어도 유지할 자격과 권한의 범위를 선택하게 한다."},
    {id:"ART_PERSPECTIVE",label:"미술·원근과 시점",source:"ART_PERSPECTIVE_PERCEPTION",principle:"관찰 위치에 따라 같은 공간의 형태와 숨은 단서를 다르게 인식한다.",gameGrammar:"보는 각도를 바꾸면 공간 퍼즐의 통로와 선택지가 달라진다."},
    {id:"MUSIC_RHYTHM",label:"음악·리듬과 합주",source:"MUSIC_RHYTHM_HARMONY",principle:"서로 다른 박자의 조합은 새로운 리듬과 긴장·해소를 만든다.",gameGrammar:"소리의 입력 순서와 박자가 장치·NPC의 반응 시점을 바꾼다."},
    {id:"NATURE_TIDE",label:"자연과학·조석 변화",source:"NATURE_TIDES_CYCLE",principle:"주기적인 수면 변화는 같은 공간의 접근성과 이동 조건을 바꾼다.",gameGrammar:"물높이의 주기에 맞춰 통행 시간과 자원 위치를 다시 선택한다."},
    {id:"NATURE_SEASONS",label:"자연·계절과 생태 순환",source:"NATURE_SEASONAL_ECOLOGY",principle:"계절의 변화는 생물의 이동과 자원 이용 관계를 바꾼다.",gameGrammar:"계절의 징후를 읽고 채집 경로와 위협 대응을 바꾼다."},
    {id:"SOCIAL_TRUST",label:"사회학·집단 신뢰",source:"SOCIAL_TRUST_COOPERATION",principle:"공동체의 신뢰는 반복된 약속의 이행과 배신에 따라 달라진다.",gameGrammar:"협력의 실제 결과가 동료 모집과 공동 임무의 조건을 바꾼다."},
    {id:"CULTURE_TRANSLATION",label:"문화·언어와 번역",source:"CULTURE_LANGUAGE_CONTEXT",principle:"같은 표현도 문화적 맥락이 달라지면 의미와 반응이 달라질 수 있다.",gameGrammar:"언어 단서를 해석하면 거래·동맹·임무의 접근 조건이 달라진다."}
,
    {id:"DEVELOPMENT_PROTOTYPE",label:"개발·시제품 반복",source:"DEVELOPMENT_ITERATIVE_PROTOTYPE",principle:"완성 전 시제품의 실패는 조건을 바꿔 다음 실험의 성공 가능성을 높인다.",gameGrammar:"실험 기록을 비교해 장치·능력의 다음 제작 순서와 진입 조건을 바꾼다."},
    {id:"DEVELOPMENT_DEBUGGING",label:"개발·오류 추적",source:"DEVELOPMENT_DEBUG_CAUSE_TRACE",principle:"표면에 드러난 오류와 실제 원인은 다를 수 있어 재현 조건의 기록이 중요하다.",gameGrammar:"실패한 조작을 재현하고 원인 조건을 바꿔 월드 장치의 새로운 작동 경로를 찾는다."},
    {id:"DEVELOPMENT_AUTOMATION",label:"개발·자동화 실험",source:"DEVELOPMENT_AUTOMATION_FEEDBACK",principle:"자동 규칙은 처음 세운 조건과 환경 변화가 어긋나면 예상 밖의 결과를 낳는다.",gameGrammar:"작업 우선순위를 조정해 자동화가 접근·자원·상대의 반응을 바꾸게 한다."},
    {id:"RESEARCH_CONTROLLED_EXPERIMENT",label:"연구·대조 실험",source:"RESEARCH_CONTROLLED_CAUSAL_TEST",principle:"원인을 파악하려면 다른 조건을 보존하고 하나의 변화를 비교해야 한다.",gameGrammar:"같은 지역에서 입력 조건만 바꾸어 새로운 인과 규칙과 안전한 대응을 발견한다."},
    {id:"RESEARCH_FIELD_NOTES",label:"연구·현장 관찰",source:"RESEARCH_FIELD_OBSERVATION",principle:"반복 관찰에서 생긴 예외는 기존 가설을 고치고 새 조사 대상을 만든다.",gameGrammar:"관찰한 예외를 기록해 지도·위험 판정과 다음 연구 목표를 변경한다."},
    {id:"RESEARCH_ARCHAEOLOGY",label:"고고학·유적 단서",source:"RESEARCH_ARCHAEOLOGY_LAYERS",principle:"서로 다른 시대의 흔적을 비교하면 공간의 이용 목적과 사건 순서를 재구성할 수 있다.",gameGrammar:"유적의 지층과 기록을 비교해 숨은 통로·의뢰·상호작용 규칙을 연다."},
    {id:"GHOST_UNFINISHED_PROMISE",label:"귀신·미완의 약속",source:"SUPERNATURAL_GHOST_PROMISE",principle:"남겨진 약속과 기억의 불일치는 살아 있는 이들의 선택을 통해 풀리기도 한다.",gameGrammar:"귀신의 기억과 NPC의 증언을 비교해 봉인·화해·우회 중 다른 해결을 선택한다."},
    {id:"GHOST_PLACE_MEMORY",label:"귀신·장소의 잔향",source:"SUPERNATURAL_HAUNTED_PLACE_MEMORY",principle:"특정 장소에 남은 흔적을 알아볼 때 사건의 숨은 순서가 드러난다.",gameGrammar:"다른 시간대의 흔적을 조사해 같은 건물의 출입과 위험 조건을 달리한다."},
    {id:"GHOST_NIGHT_WITNESS",label:"민담·밤의 방문자",source:"SUPERNATURAL_FOLK_NIGHT_VISITOR",principle:"밤에만 나타나는 목격자의 단서는 그가 떠난 뒤 다른 증거로 검증해야 한다.",gameGrammar:"한정된 시간에 만난 존재의 단서를 낮의 조사와 연결해 다른 행동을 연다."},
    {id:"GHOST_PROTECTIVE_SPIRIT",label:"귀신·수호령의 대가",source:"SUPERNATURAL_PROTECTIVE_SPIRIT",principle:"도움을 주는 존재라도 지키는 규칙과 요구하는 대가가 서로 다를 수 있다.",gameGrammar:"수호령의 규칙을 이해해 도움과 위험을 교환하거나 다른 길을 선택한다."},
    {id:"NOVEL_CHAPTER_SHIFT",label:"소설·장면 전환",source:"LITERATURE_NOVEL_CHAPTER_CAUSALITY",principle:"장면마다 관찰 가능한 사건이 다르면 독자는 뒤늦게 앞선 선택의 의미를 이해한다.",gameGrammar:"서로 다른 장면의 인물 정보를 조합해 과거 지역의 사건 조건을 다시 판단한다."},
    {id:"NOVEL_CHARACTER_CHANGE",label:"소설·인물의 내적 갈등",source:"LITERATURE_CHARACTER_DEVELOPMENT",principle:"인물의 믿음과 목표는 사건을 겪으면서 바뀌고 같은 선택도 다른 의미를 낳는다.",gameGrammar:"반복 대화에서 드러난 가치관 변화가 NPC 관계와 임무의 해결법을 바꾼다."},
    {id:"NOVEL_MYSTERY_REVEAL",label:"소설·복선의 반전",source:"LITERATURE_MYSTERY_REVELATION",principle:"앞선 단서를 모두 설명하는 새 사실은 과거의 인과관계를 뒤집을 수 있다.",gameGrammar:"서로 떨어진 기록을 연결해 이전 퍼즐의 다른 해법과 진입 경로를 연다."},
    {id:"SPORTS_TEAM_FORMATION",label:"스포츠·포지션 전술",source:"SPORTS_TEAM_FORMATION",principle:"선수의 역할과 공간 배치가 상대 팀의 대응과 다음 득점 가능성을 변화시킨다.",gameGrammar:"동료 위치와 역할을 바꾸면 패스 경로·방어 범위·지원 조건이 바뀐다."},
    {id:"SPORTS_ENDURANCE_PACING",label:"스포츠·지구력 배분",source:"SPORTS_ENDURANCE_PACING",principle:"초반의 무리한 속도와 휴식 선택은 후반 지속 능력과 위험 판단을 바꾼다.",gameGrammar:"같은 경로도 페이스와 회복 시간을 선택해 다른 위험·보상을 얻는다."},
    {id:"SPORTS_COMEBACK_MOMENTUM",label:"스포츠·역전 흐름",source:"SPORTS_COMEBACK_MOMENTUM",principle:"점수의 열세가 전술 선택을 바꾸고 대응이 성공하면 경기의 흐름이 달라진다.",gameGrammar:"뒤진 상황에서는 위치와 위험 부담을 달리 선택해 새로운 득점 기회를 만든다."},
    {id:"SPORTS_REFEREE_INTERPRETATION",label:"스포츠·판정과 이의 제기",source:"SPORTS_RULE_JUDGMENT",principle:"규칙을 해석하는 판정은 동일한 행동의 점수·자격·다음 플레이를 좌우한다.",gameGrammar:"상대의 행동과 규칙을 분석해 판정 리스크를 피하거나 다른 전술을 택한다."},
    {id:"TRAVEL_CULTURAL_ENCOUNTER",label:"여행·낯선 지역의 교류",source:"TRAVEL_CROSS_CULTURAL_ENCOUNTER",principle:"낯선 장소에서는 같은 제안도 언어와 지역 관습에 따라 다른 관계를 만든다.",gameGrammar:"현지인과 교류하며 얻은 정보를 통해 거래·이동·새 임무 접근이 달라진다."},
    {id:"TRAVEL_ROUTE_PLANNING",label:"여행·여정 설계",source:"TRAVEL_ITINERARY_DECISIONS",principle:"같은 목적지라도 이동 순서와 머무는 장소가 체력·비용·만남을 바꾼다.",gameGrammar:"경유지와 휴식 구간을 조정해 위험한 길과 새로운 만남의 기회를 비교한다."},
    {id:"TRAVEL_LOST_WAYFINDING",label:"여행·길 잃기와 발견",source:"TRAVEL_LOST_ROUTE_DISCOVERY",principle:"예상과 다른 길은 손실을 낳지만 잘 관찰하면 새로운 지형 지식을 얻게 한다.",gameGrammar:"잘못 들어선 경로에서 발견한 단서를 지도에 반영해 새로운 귀환법을 연다."},
    {id:"EXPLORATION_CAVE_MAPPING",label:"탐험·동굴 지도 제작",source:"EXPLORATION_CAVE_MAPPING",principle:"지하의 한정된 통로와 시야는 작은 발견만으로 전체 이동 전략을 바꾸게 한다.",gameGrammar:"위험한 통로의 흔적을 지도에 추가해 귀환 경로와 다음 탐사 지점을 바꾼다."},
    {id:"EXPLORATION_DEEP_SEA",label:"탐험·심해 관측",source:"EXPLORATION_DEEP_SEA_OBSERVATION",principle:"관측이 어려운 환경에서는 작은 신호 하나가 생물·지형에 관한 가설을 바꾼다.",gameGrammar:"제한된 장비와 단서를 이용해 안전 구역과 새로운 관측 대상을 식별한다."},
    {id:"EXPLORATION_SKY_ISLAND",label:"탐험·떠 있는 섬의 항로",source:"EXPLORATION_FLOATING_ISLAND_ROUTES",principle:"서로 떨어진 영역 사이에서는 바람과 시간의 변화가 이동 가능한 항로를 만든다.",gameGrammar:"바람의 흔적을 관찰해 건널 수 있는 경로와 도구 사용 순서를 결정한다."},
    {id:"SURVIVAL_SHELTER",label:"생존·쉼터와 위험 관리",source:"SURVIVAL_SHELTER_PROTECTION",principle:"쉼터는 외부 위험을 줄이지만 자원을 소비하고 새로운 관리 부담을 만든다.",gameGrammar:"보호 구역의 위치와 유지 비용을 조절해 다음 탐색 조건을 바꾼다."},
    {id:"SURVIVAL_FORAGING",label:"생존·계절 채집",source:"SURVIVAL_FORAGING_CYCLES",principle:"식량의 위치와 이용 가능 시점이 달라지면 동일한 생존 경로도 위험해진다.",gameGrammar:"환경 징후를 관찰해 채집 시기와 이동 경로를 변경한다."},
    {id:"SURVIVAL_RESCUE_SIGNAL",label:"생존·구조 신호와 협력",source:"SURVIVAL_RESCUE_COMMUNICATION",principle:"한정된 자원으로 신호를 보내는 선택은 생존과 구조 기회의 비용을 교환하게 한다.",gameGrammar:"구조 신호를 언제 어디에서 보내는지에 따라 협력자와 위험한 사건이 달라진다."},
    {id:"SURVIVAL_EXTREME_CLIMATE",label:"생존·극한 기후 판단",source:"SURVIVAL_EXTREME_WEATHER",principle:"변덕스러운 기후에서는 과거의 안전한 길도 돌연 위험해질 수 있다.",gameGrammar:"기후의 전조를 확인해 이동 시점과 장비·쉼터 배치를 조정한다."},
    {id:"FICTION_ALTERNATE_HISTORY",label:"소설·가상 역사",source:"LITERATURE_ALTERNATE_HISTORY",principle:"작은 사건 하나가 다르게 일어났다는 가정은 사회 질서와 인물의 목표를 바꾼다.",gameGrammar:"분기된 역사에서 서로 다른 인물의 단서를 확인해 사건과 지역 규칙을 변경한다."},
    {id:"FOLK_RELIGION_SPIRIT_CONTRACT",label:"민속 신앙·영과의 약속",source:"FOLK_RELIGION_SPIRIT_AGREEMENT",principle:"지역의 신앙과 약속은 공동체가 지켜야 할 의무와 금기를 설명하는 틀이 된다.",gameGrammar:"의식의 순서와 약속 이행이 NPC 협력과 신비한 장소의 접근 조건을 바꾼다."}
  ]:[];
  // 명시된 소재는 최우선이며, 부족한 창작 소재만 게임별 인과 맥락으로 보충한다.
  // 오픈소스·사내 모듈은 원리 참고에 한정하고 외부 모델 호출은 없다.
  const explicitIds=uniq((freeTopicMode?[]:(target.materials||[])).flatMap(row=>row.causalDNA||[]))
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
    '오비':['TRICKSTER_REVERSAL','OATH_CONTRACT','PROPHECY_SELF_FULFILLMENT','FORTUNE_REVERSAL'],
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
  // 자유주제의 소재 선택은 게임 ID/요청 개정만 사용한다. 옛 장르·주제·고정 장르별 소재 우선순위를 배제한다.
  const compositionKey=freeTopicMode?[target.requestId,target.topicRevision||'',variance]:target.basicDesignMethod?[target.requestId,category,ownerBrief,variance]:[target.requestId,category,requestedName,ownerBrief,variance];
  // 메인: 새 기본설계는 중앙 분류표를 직접 읽는다. 고정 DNA 후보는 이전 접수 호환에만 사용한다.
  const standard=target.basicDesignMethod;
  // 기존 게임을 보존하는 경우 A/B/C 소재가 실제 구현과 무관한 세계관으로 바뀌지 않도록
  // 소유자가 승인한 재료 분류만 후보로 삼는다. 일반 신규 게임 설계는 원래 선택 알고리즘 유지.
  const preserveFamilies=Array.isArray(target.preservationMaterialFamilies)?new Set(target.preservationMaterialFamilies):null;
  const materialFamilies=preserveFamilies
    ?(standard?.materialClassification||[]).filter(row=>preserveFamilies.has(row.broad))
    :(standard?.materialClassification||[]);
  if(preserveFamilies&&materialFamilies.length<2)throw new Error('OWNER_PRESERVATION_MATERIAL_DOMAIN_EVIDENCE_MISSING');
  const standardSources=standard?materialFamilies.flatMap(row=>(row.specificMaterials||[]).map(material=>({
    id:`STANDARD:${row.broad}:${material.middle}:${material.name}`,label:material.name,
    source:row.broad,middle:material.middle,material,
    principle:material.feature,
    gameGrammar:`${material.name}: ${material.action}. ${material.condition}일 때 ${material.consequence}`
  })))||[];
  if(standard&&standardSources.some(row=>!standard.materialClassification.find(item=>item.broad===row.source)?.middle.includes(row.middle)))throw new Error('VIBE_MATERIAL_SOURCE_PATH_INVALID');
  const creativeSourcePool=standard?standardSources:freeTopicMode?[...CAUSAL_DNA_LIBRARY,...freeCreativeSources]:CAUSAL_DNA_LIBRARY;
  const orderedPool=[...creativeSourcePool].sort((a,b)=>
    hash([...compositionKey,a.id].join('|'))-hash([...compositionKey,b.id].join('|')));
  const genreChoices=genreMaterialIds[profile.genre]||[];
  const optionalIds=freeTopicMode?orderedPool.map(row=>row.id):variance>0
    ?[...orderedPool.map(row=>row.id),...genreChoices]
    :[...genreChoices,...orderedPool.map(row=>row.id)];
  const ids=uniq([...explicitIds,...materialHints,...optionalIds]);
  const orderedMaterials=ids.map(id=>creativeSourcePool.find(row=>row.id===id)).filter(Boolean);
  const distinctSources=orderedMaterials.filter((row,index)=>orderedMaterials.findIndex(candidate=>candidate.source===row.source)===index);
  // A(대규모 세계 규칙)와 B(세부 사건 규칙)는 서로 다른 독립 후보에서 선택한다.
  // B를 A 소재의 하위 목록에서 찾거나 A 선택 결과로 계산하지 않는다.
  const independentlyRanked=(axis)=>[...creativeSourcePool].sort((a,b)=>
    hash([...compositionKey,axis,a.id].join('|'))-hash([...compositionKey,axis,b.id].join('|')));
  // 대분류를 먼저 독립 선택해 소분류 항목이 많은 분야가 더 자주 뽑히는 구조를 피한다.
  const familyOrder=axis=>standard?[...materialFamilies].sort((a,b)=>hash([...compositionKey,axis,a.broad].join('|'))-hash([...compositionKey,axis,b.broad].join('|'))):[];
  const bFamily=familyOrder('B_MATERIAL_BROAD')[0]?.broad;
  const aFamily=familyOrder('A_MATERIAL_BROAD').find(row=>!preserveFamilies||row.broad!==bFamily)?.broad;
  const bIndependent=standard?independentlyRanked('B_INDEPENDENT_DETAIL').find(row=>row.source===bFamily):freeTopicMode?independentlyRanked('B_INDEPENDENT_DETAIL')[0]:null;
  const aIndependent=standard?independentlyRanked('A_BROAD_WORLD').find(row=>row.source===aFamily&&row.id!==bIndependent?.id):freeTopicMode?independentlyRanked('A_BROAD_WORLD').find(row=>row.source!==bIndependent?.source):null;
  const cSupporting=standard?independentlyRanked('D_SPECIFIC_SOURCE').filter(row=>row.id!==aIndependent?.id&&row.id!==bIndependent?.id):freeTopicMode?distinctSources.filter(row=>row.source!==aIndependent?.source&&row.source!==bIndependent?.source):[];
  const chosen=(standard||freeTopicMode?[aIndependent,bIndependent,...cSupporting]:orderedMaterials).filter(Boolean).slice(0,4);
  if(chosen.length<4)throw new Error('VIBE_NATIVE_DESIGN_MATERIALS_INSUFFICIENT');
  const [first,second,third,fourth]=[chosen[0],chosen[1],chosen[2]||chosen[0],chosen[3]||chosen[1]];
  const named=row=>materialNames[row.id]||row.label||row.id.replaceAll('_',' ');
  const aMaterial=standard?first.source:named(first),bMaterial=standard?second.middle:named(second),cMaterial1=named(third),cMaterial2=named(fourth);
  const distinct=chosen[0].id!==chosen[1].id&&cMaterial1!==cMaterial2;
  // 정식 소재는 모두 보존하고 표시용 세계·발견 명칭만 소재의 핵심 명사로 압축한다.
  const materialKeyword=material=>material.includes('의 ')?material.slice(material.lastIndexOf('의 ')+2):material;
  const [aKeyword,bKeyword,cKeyword1,cKeyword2]=[aMaterial,bMaterial,cMaterial1,cMaterial2].map(materialKeyword);
  if(!distinct)throw new Error('VIBE_NATIVE_DESIGN_DISTINCT_CAUSAL_SOURCES_REQUIRED');
  const creativeIds=chosen.map(row=>row.id).join('|');
  const secondary=/COMEDIC|CARNIVAL|ABSURD/.test(creativeIds)?'코믹':/TABOO/.test(creativeIds)?'호러':/TESTIMONY/.test(creativeIds)?'미스터리':'추리';
  const fiction=standard?.creativeGenreExamplesKo||[];
  const primaryGenre=standard?fiction[hash([...compositionKey,'C_PRIMARY'].join('|'))%fiction.length]:profile.genre;
  const secondaryGenre=standard?fiction.filter(name=>name!==primaryGenre)[hash([...compositionKey,'C_SECONDARY'].join('|'))%(fiction.length-1)]:freeTopicMode?partner.genre:(secondary===profile.genre?'사회극':secondary);
  const representativeMap={'오비':'액션','경영':'시뮬레이션','롤플레잉':'역할수행','호러':'어드벤처','카드 전략':'카드·보드','비주얼 노벨':'어드벤처','축구':'스포츠','농구':'스포츠','타워 디펜스':'전략','로그라이크':'역할수행','수집':'방치·증분','잠입':'액션','오픈월드':'어드벤처','요리':'시뮬레이션','아케이드':'액션','샌드박스':'시뮬레이션','도시 건설':'시뮬레이션','자동 전투':'전략','제작':'생존','보드 게임':'카드·보드','캐주얼':'파티','배틀로얄':'슈팅','교육':'퍼즐','음악':'리듬'};
  const aGameGenre=standard?.gameGenreClassification.find(row=>row.detailed.includes(profile.genre))?.representative||representativeMap[profile.genre]||(/슈팅/.test(profile.genre)?'슈팅':/레이싱/.test(profile.genre)?'레이싱':/리듬/.test(profile.genre)?'리듬':/성장|방치|증분/.test(profile.genre)?'방치·증분':/생활|아바타|경영|농장|시뮬/.test(profile.genre)?'시뮬레이션':/감염|파티|미니게임/.test(profile.genre)?'파티':/RPG|역할/.test(profile.genre)?'역할수행':/생존/.test(profile.genre)?'생존':/추리|공포|탈출|모험|탐험/.test(profile.genre)?'어드벤처':/전략|방어/.test(profile.genre)?'전략':/액션|격투|오비/.test(profile.genre)?'액션':profile.genre);
  const aClassification=standard?.gameGenreClassification.find(row=>row.representative===aGameGenre);
  const bRepresentative=/운영|경영|관리|제조/.test(profile.b)?'시뮬레이션':/단서|공간|조합|퍼즐/.test(profile.b)?'퍼즐':/제작|거점|생존/.test(profile.b)?'생존':/성장|임무/.test(profile.b)?'역할수행':/추리|탐험|탈출/.test(profile.b)?'어드벤처':/전술|전략|방어|적 패턴|자원 대응/.test(profile.b)?'전략':'액션';
  const bClassification=standard?.gameGenreClassification.find(row=>row.representative===bRepresentative);
  if(standard&&(!aClassification||!bClassification||fiction.length<2))throw new Error(`VIBE_BASIC_DESIGN_STANDARD_CLASSIFICATION_MISSING:${profile.genre}`);
  // 메인: C의 효과는 선택한 소분류의 조건·결과·위험에서 파생한다. 작품 장르별 고정 사건을 주입하지 않는다.
  const genreEffects=Object.fromEntries(fiction.map(name=>{
    const source=name===primaryGenre?third:fourth;
    if(!standard)return [name,''];
    return [name,`${name}: ${source.material.name}의 ${source.material.feature}를 작품의 경험·정보·갈등·선택에 연결한다. ${source.material.condition} 조건에서 ${source.material.action} 행동을 판정하며 ${source.material.consequence} 결과와 ${source.material.risk} 위험이 A의 중심 행동과 B의 보조 판단을 바꾼다.`];
  }));
  const chooseA=freeTopicMode
    ?`행동: ${profile.choiceA}한다. 선택: 새 ResourceState를 얻기 위해 위험을 감수할지, 현재 RouteState로 안전하게 되돌아갈지 결정한다.`
    :`${profile.choiceA}하면서 ${first.gameGrammar}`;
  const chooseB=freeTopicMode
    ?`행동: ${profile.choiceB}한다. 선택: A가 남긴 ResourceState로 대응을 바꿀지, RiskState를 감수하고 다른 경로를 열지 결정한다.`
    :`${profile.choiceB}하면서 ${second.gameGrammar}`;
  // 각 대축은 입력 조건·플레이어 선택·출력·실패 후 재선택을 가진다. 수치·보상·저장키를 임의로 창작하지 않는다.
  const stateA=freeTopicMode
    ?`A는 ${aMaterial}을 대규모 세계 규칙으로 창작한다. MAIN의 RouteState·RiskState를 읽어 ${profile.a} 실행 조건을 판정하고, ${first.gameGrammar} 결과로 RiskState·ResourceState를 갱신해 B와 세계의 다음 선택을 바꾼다. 조건 미충족·취소 시 이전 상태를 보존한다.`
    :`플레이어가 ${profile.a}을 선택하면 ${aMaterial}의 규칙에 따라 다음 위험과 가능 행동이 변화한다.`;
  const stateB=freeTopicMode
    ?`B는 A의 하위 주제가 아니라 ${bMaterial}에서 독자적으로 만든 세부 사건·대상 규칙이다. 독립적으로 정한 ${profile.b} 행동은 A가 출력한 RiskState·ResourceState를 조건으로 읽는다. ${second.gameGrammar} 대응 성공 시 RouteState·RiskState를 A로 돌려보내 세계 규칙까지 바꾼다. 조건 미충족 시 상태를 보존한다.`
    :`플레이어가 ${profile.b}을 선택하면 ${bMaterial}의 규칙에 따라 처음 선택으로 되돌아갈 비용·정보·접근 조건이 변화한다.`;
  const bridge=freeTopicMode
    ?`A에서 ${profile.a}를 선택해 RiskState·ResourceState를 바꾸고, 그 값을 읽는 B의 ${profile.b} 대응을 실행한다. B의 RouteState·RiskState 출력은 다시 A의 접근 가능성과 다음 선택을 바꾼다. 실패 시 마지막 유효 상태로 돌아가 대안을 고른다.`
    :`${chooseA} 그 결과 ${profile.b}의 가능 행동과 위험이 바뀌며, ${chooseB} 다시 ${profile.a}의 조건을 바꾼다.`;
  const genreInterlock=standard?`${primaryGenre}: ${genreEffects[primaryGenre]} ${secondaryGenre}: ${genreEffects[secondaryGenre]} 보조 장르가 없으면 같은 대상의 관찰·책임·행동 판단이 사라져 A의 다음 선택이 달라진다.`:freeTopicMode
    ?`${primaryGenre}의 인물 갈등을 해결하려면 A의 ResourceState 확보와 B의 RouteState 변경을 반복한다. ${secondaryGenre} 판단에서는 ${cMaterial1}의 단서를 먼저 해석하거나 ${cMaterial2}의 반작용을 감수해야 B의 대응·A의 재진입 중 하나가 가능하다. 보조 장르를 제거하면 실제 접근 조건이 달라진다.`
    :`${primaryGenre} 작품 장르의 주 갈등을 진행하는 동안 ${secondaryGenre} 장르의 판단 때문에 정보·접근 비용과 다음 선택이 달라진다. ${secondaryGenre}를 제거하면 같은 경로를 선택해도 인물 반응과 결과가 달라진다.`;
  const coreLoop=freeTopicMode?[
    `A 시작: RouteState·RiskState를 확인한 뒤 ${profile.choiceA}한다. 성공하면 ResourceState·RiskState가 바뀌고, 실패하면 대체 경로를 선택한다.`,
    `B 대응: A의 ResourceState·RiskState를 확인한 뒤 ${profile.choiceB}한다. 성공하면 RouteState·RiskState를 갱신하고 불가능하면 소비 없이 다시 선택한다.`,
    `A 재진입: B가 갱신한 RouteState와 이전 경로를 비교해 ${profile.a}의 새 선택을 실행하거나 @ 발견 조건을 시험한다.`
  ]:[
    `${profile.a}: ${chooseA}`,
    `${profile.b}: ${chooseB}`,
    `${profile.a}로 되돌아가 변한 세계 상태·관계·위험을 비교하고 다음 목표를 선택한다.`
  ];
  // 메인: D의 정확한 소재 경로를 먼저 확정하고 @는 그 원본에서만 파생한다.
  const standardDSources=standard?[third,fourth,...orderedMaterials.filter(row=>row.id!==third.id&&row.id!==fourth.id)]
    .slice(0,Math.max(2,Math.ceil(Number(target.discoveryCount||4)/2))).map((row,index)=>({
      id:`D_${index+1}`,materialPath:[row.source,row.middle,row.material.name],
      pathReason:`${row.source}→${row.middle}→${row.material.name}의 실제 분류 연결을 사용한다. 소재 특징은 ${row.material.feature}이며 행동·조건·결과는 게임용 창작 해석이다.`,
      sourceFeature:row.material.feature,action:row.material.action,condition:row.material.condition,
      consequence:row.material.consequence,risk:row.material.risk
    })):[];
  // @는 주제별로 이름·조건·발견·실제 선택 변화가 달라지며 MAIN/A/B/C 두 항목 이상을 연결한다.
  const delveConditions=standard?Array.from({length:Number(target.discoveryCount||4)},(_,index)=>{
    const source=standardDSources[index%standardDSources.length];
    const phase=Math.floor(index/standardDSources.length);
    return {
      sourceDId:source.id,
      name:`${source.materialPath[2]}: ${phase===0?source.condition:source.risk}의 ${phase===0?'성립':'후속 결과'}`,
      condition:`${source.materialPath[2]}의 ${source.sourceFeature}를 A의 ${profile.choiceA}와 B의 ${profile.choiceB}로 시험한다. ${phase===0?source.condition:source.risk} 조건의 차이를 비교한다.`,
      insight:`${source.action} 행동에서 ${source.condition} 조건에 따른 ${source.consequence} 결과와 ${source.risk} 위험의 관계를 발견한다. ${genreInterlock}`,
      effect:`${source.consequence} 결과를 A의 ${profile.a}와 B의 ${profile.b}에 연결해 연관 콘텐츠를 연구·창작·개발한다. ${source.action} 행동을 달라진 조건에 적용하고 그 결과를 다음 @의 대상으로 삼는다. 실패·취소 시 마지막 유효 상태를 보존한다.`,
      links:['A','B','C']
    };
  }):freeTopicMode?[
    {name:`${aKeyword}의 경로 해독`,condition:`A의 RouteState로 진입해 RiskState·ResourceState가 바뀐 이유를 확인하고 B의 대응을 시험한다.`,insight:`${first.principle} 원리를 A의 선택과 B의 결과를 비교해 발견한다.`,effect:`B에서 비용이 다른 대응을 선택한 뒤 WorldAccessState에 새 접근 조건을 반영한다. 실패하면 원래 RouteState를 유지한다.`,links:['A','B','C']},
    {name:`${bKeyword}의 귀환 흔적`,condition:`B가 RouteState·RiskState를 갱신한 뒤 A의 이전 진입 장소를 다시 방문해 차이를 확인한다.`,insight:`${second.principle} 원리 때문에 같은 A 행동도 재방문에서는 다른 조건으로 판정됨을 발견한다.`,effect:`다음 A에서 위험을 낮추는 우회 RouteState 또는 정보 회복을 선택한다. 재방문 전에는 해금하지 않는다.`,links:['MAIN','A','B']},
    {name:`${cKeyword1}·${cKeyword2}의 이중 단서`,condition:`C의 두 소재가 각각 A의 RiskState와 B의 ResourceState를 바꾸는 사례를 관찰한 뒤 순서를 비교한다.`,insight:`${third.principle} / ${fourth.principle} 두 원리가 결합될 때 ${secondaryGenre}의 해석이 다음 행동 허용 여부를 바꾼다.`,effect:`단서 해석을 선택해 IntentState를 갱신하고 B의 다른 대응을 연다. 조건 미달이면 기존 행동을 유지한다.`,links:['B','C','MAIN']},
    {name:`${profile.a}·${profile.b}의 역전`,condition:`A의 위험 선택을 바꾼 두 결과에 동일한 B 대응을 적용해 RouteState·RiskState를 비교한다.`,insight:`${aMaterial}의 불리한 결과가 ${bMaterial}의 다른 조건에서는 유리해지는 실제 인과를 발견한다.`,effect:`A로 재진입할 때 WorldAccessState에 반대 경로를 기록해 다른 해결을 선택한다. 실패한 시도는 기존 상태를 보존한다.`,links:['A','B','MAIN']}
  ]:[
    {name:'금기와 기회의 교차',condition:`${aMaterial}의 제약과 ${bMaterial}의 대응을 같은 지역에서 순서대로 시험한다.`,insight:`${first.principle} 상황을 ${second.gameGrammar} 방식으로 해석한다.`,effect:`${profile.a}에서 평소에는 불가능했던 대안 경로와 선택을 연다.`,links:['A','B','C']},
    {name:'되돌아온 선택',condition:`${profile.b}를 완료한 뒤 처음 ${profile.a} 지역을 다시 방문해 달라진 증거를 찾는다.`,insight:`${second.principle} 결과가 과거 선택의 의미를 바꿀 수 있음을 발견한다.`,effect:'보상이 아닌 관계·정보의 복원과 다른 해결 경로를 선택한다.',links:['MAIN','A','B']},
    {name:'두 소재의 숨은 규칙',condition:`${cMaterial1}와 ${cMaterial2}의 조건을 동시에 만족시키는 행동 순서를 실험한다.`,insight:`${third.principle} 원리와 ${fourth.principle} 원리가 동시에 작동함을 파악한다.`,effect:'주 장르의 목표를 보조 장르의 정보 판단으로 우회하는 선택을 연다.',links:['B','C','MAIN']},
    {name:'역전된 종착점',condition:`${profile.a}의 결과를 의도적으로 반대로 선택한 뒤 ${profile.b}를 수행해 후속 변화를 확인한다.`,insight:'한쪽의 불리한 결과가 다른 쪽의 고급 활용 조건이 되는 인과 반전을 학습한다.',effect:'같은 공간과 자원으로도 다른 결말·동선·운용법에 도달한다.',links:['A','B','MAIN']}
  ];
  // @는 최초 네 발견으로 출발하지만 상한이 없다. 다음 발견은 이전 @의 결과를 선행 조건으로 삼아
  // A↔B의 상태 교환과 C의 해석을 더 깊게 조합한다. 현재 설계에서 필요한 수만 생성한다.
  const discoveryCount=target.discoveryCount===undefined?4:Number(target.discoveryCount);
  if(!Number.isSafeInteger(discoveryCount)||discoveryCount<4)throw new Error('VIBE_NATIVE_DELVE_COUNT_INVALID');
  const delvePaths=[
    {name:'되돌림 경로',condition:'B의 RouteState를 A의 이전 경로에 적용하고 RiskState 차이를 관찰한다.',insight:'B의 결과를 복구와 재진입의 조건으로 바꾸는 숙련',effect:'A의 다른 접근 경로를 열고 다시 B의 ResourceState 조건을 시험한다.',links:['MAIN','A','B']},
    {name:'교환된 비용',condition:'A의 ResourceState 결과를 다른 B 대응 순서로 시험하고 RiskState를 비교한다.',insight:'동일 자원이 다른 B 행동에 서로 다른 선택 비용을 만드는 관계',effect:'B의 비용을 바꾸어 다음 A의 RouteState 선택지를 넓힌다.',links:['A','B','C']},
    {name:'숨은 증거',condition:'C의 서로 다른 소재 단서를 A와 B에서 역순으로 해석하고 IntentState 변화를 확인한다.',insight:'주 장르 목표에 보조 장르의 정보 판정이 뒤늦게 개입하는 규칙',effect:'IntentState를 새 조건으로 연결해 B의 우회 선택을 연다.',links:['B','C','MAIN']},
    {name:'다음 갈림길',condition:'앞서 밝혀진 WorldAccessState 조건에서 A→B→A를 다시 수행해 새로운 차이를 비교한다.',insight:'같은 월드도 발견된 선행 조건에 따라 다음 숙련을 계속 만든다는 관계',effect:'WorldAccessState에 다음 실험 경로를 연결하고 발견 실패 시 기존 선택을 보존한다.',links:['MAIN','A','C']}
  ];
  for(let index=standard?discoveryCount:4;index<discoveryCount;index++){
    // 네 최초 발견에서 시작해 모든 후속 발견이 앞선 @ 중 하나에 의존하는 확장 트리.
    const parent=delveConditions[Math.floor((index-4)/2)];
    const path=delvePaths[(index-4)%delvePaths.length];
    const material=chosen[(index+1)%chosen.length];
    const materialName=named(material);
    const parentLabel=parent.name.length>92?parent.name.slice(0,92):parent.name;
    const generationLabel=[...String(index-3)].map(d=>'영일이삼사오육칠팔구'[Number(d)]||'열').join('');
    delveConditions.push({
      name:`${parentLabel}·${materialName} ${path.name} ${generationLabel}`,
      condition:`${parent.name}을(를) 먼저 발견한 뒤 ${path.condition} 이전에 발견한 규칙을 적용하지 않으면 이 실험은 열리지 않는다.`,
      insight:`${parent.insight.slice(0,140)}를 출발점으로 ${material.principle} 원리와 ${path.insight}을(를) 결합해 선행 발견의 결과를 재해석한다.`,
      effect:`${path.effect} ${material.gameGrammar} 다음 @의 조건은 이 결과에서 파생된다. 실패·취소 시 이전 WorldAccessState·RouteState를 보존한다.`,
      links:path.links
    });
  }
  // 정식 자유주제 순서: A(독립 대분류) + B(독립 소분류) → C(메인·보조 장르 융합) → @ 발견·숙련 → 결과 MAIN.
  // 오너가 명칭을 확정한 기존 설계는 보존하고, 자유주제만 모든 축을 완성한 뒤 게임 정체성을 확정한다.
  const discoveredCore=delveConditions[0];
  const gameName=requestedName||(freeTopicMode
    ?`${aOnly?`${aSystem}·`:''}${aKeyword}·${bKeyword} ${profile.genre}×${secondaryGenre}: ${discoveredCore.name}`.slice(0,178)
    :`${aMaterial}의 ${profile.genre} 세계`);
  const identity=freeTopicMode
    ?`${gameName}. MAIN은 A(${profile.a} × ${aMaterial})의 대규모 창작 규칙과 독립적인 B(${profile.b} × ${bMaterial})의 세부 사건 규칙, C(메인 ${standard?primaryGenre:profile.genre} × 보조 ${secondaryGenre}; ${cMaterial1}·${cMaterial2} 반작용), @(${discoveredCore.name}: ${discoveredCore.effect})를 연결한 결과로 결정된다. A→B→A의 입력·행동·상태 변화가 실제 목표를 만든다.`.slice(0,680)
    :`${gameName}에서 ${profile.playerRole}가 ${profile.a}와 ${profile.b}의 선택을 통해 ${aMaterial}·${bMaterial}의 인과법칙을 바꾸는 ${profile.genre} 복합 게임`;
  const grammar={
    ...(standard?{standardVersion:standard.version,standardFormula:standard.formula,representativeGameReference:representativeGame?{...representativeGame}:null,...(referenceBaseline?{existingSystemReference:{scope:bReference?'B_EXISTING_GAME_SYSTEMS':'B_NEW_GAME_INITIAL_SYSTEMS',systemFamily:clean(bReference?.systemFamily||profile.b),playerChoice:clean(bReference?.playerChoice||profile.choiceB),source:clean(bReference?.source)||'신규 기본설계:'+clean(target.requestId)}}:{}),existingGameSystemRole:referenceBaseline?(bReference?'B_EXISTING_GAME_SYSTEMS':'B_NEW_GAME_INITIAL_SYSTEMS'):bReference?'B_SUPPORTING_REFERENCE':null,dCreations:standardDSources}:{}),
    toneBlend:standard?[primaryGenre,secondaryGenre]:[profile.genre,secondaryGenre],
    familiarAnchor:`플레이어는 ${profile.a}에서 얻은 이익과 ${profile.b}의 책임 사이에서 선택의 대가를 직접 감당한다.`,
    causalDNAs:chosen.slice(0,4).map((row,index)=>({id:row.id,source:row.source,principle:row.principle,gameplayConversion:row.gameGrammar,fusionRole:index%2===0?`${profile.a}의 선택 조건을 바꾼다.`:`${profile.b}의 대응 결과를 바꾼다.` })),
    brokenGenreAssumption:`${profile.genre}의 단순한 목표 달성이 끝이 아니다. ${aMaterial}과 ${bMaterial}의 반작용이 다음 세계법칙을 변경한다.`,
    newPrimaryVerb:`${profile.a}의 결과를 ${profile.b}로 전환하고 달라진 조건을 다시 활용한다.`,
    worldRule:freeTopicMode?`A의 RiskState·ResourceState가 B의 ${bMaterial} 판정을 바꾸고 B의 RouteState·RiskState가 MAIN의 WorldAccessState를 거쳐 다시 A의 접근 조건이 된다.`:`${aMaterial}에 의해 바뀐 인물·지역의 상태는 ${bMaterial}의 선택으로 되돌아오며 다음 사건의 입장 조건을 결정한다.`,
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
      formula:standard?standard.formula:'MAIN × A × B × C',
      main:{name:gameName,purpose:freeTopicMode?`${identity} 플레이어는 선택한 목표를 향해 A→B→A와 @의 발견 조건을 실행한다.`.slice(0,590):`${identity}에서 플레이어는 선택을 누적해 목적을 완수한다.`,playerAction:coreLoop[0],stateContribution:freeTopicMode?'WorldAccessState·IntentState를 읽고 A의 첫 RouteState를 정한다. @ 발견으로 새로운 접근 조건이 생겼을 때만 WorldAccessState를 갱신한다.':'플레이어 행동은 다음 목표·위험·세계 반응의 공통 상태를 갱신한다.'},
      majorAxes:[
        {key:'A',name:`${profile.a} × ${aMaterial}`,systemFamily:profile.a,sourceMaterial:aMaterial,sourceDomain:first.source,materialRule:freeTopicMode?stateA:`${first.gameGrammar} 따라서 ${profile.a}의 경로와 비용이 바뀐다.`,purpose:stateA,playerChoice:chooseA,stateContribution:stateA},
        {key:'B',name:`${profile.b} × ${bMaterial}`,systemFamily:profile.b,sourceMaterial:bMaterial,sourceDomain:second.source,materialRule:freeTopicMode?stateB:`${second.gameGrammar} 따라서 ${profile.b}의 정보·대응이 바뀐다.`,purpose:stateB,playerChoice:chooseB,stateContribution:stateB}
      ],
      themeFusion:{
        ...(!standard?{themes:[{name:cMaterial1,kind:'MATERIAL',causalEffect:freeTopicMode?`${third.gameGrammar} 이 단서의 확인 여부가 A의 RiskState와 B의 ResourceState 사용 조건을 바꾼다.`:`${third.gameGrammar} 그 결과 A와 B가 공유하는 조건이 바뀐다.`},{name:cMaterial2,kind:'MATERIAL',causalEffect:freeTopicMode?`${fourth.gameGrammar} B의 RouteState 해금과 A의 재진입 조건을 바꾸며 대가를 선택하게 한다.`:`${fourth.gameGrammar} 그 결과 사건의 비용과 다음 선택이 달라진다.`}]}:{}),
        genres:standard?[{role:'PRIMARY',name:primaryGenre,gameplayEffect:genreEffects[primaryGenre]},{role:'SECONDARY',name:secondaryGenre,gameplayEffect:genreEffects[secondaryGenre]}]:[{role:'PRIMARY',name:primaryGenre,gameplayEffect:freeTopicMode?`A(${profile.a})와 B(${profile.b})의 왕복 선택으로 중심 목표와 위험·보상을 판정한다.`:`${profile.a}와 ${profile.b}를 통한 중심 목표와 위험·보상을 판단한다.`},{role:'SECONDARY',name:secondaryGenre,gameplayEffect:`${cMaterial1}의 단서와 ${cMaterial2}의 반응 때문에 같은 목표의 정보·행동·결과가 달라진다.`}],
        genreInterlock,jointWorldRule:`${cMaterial1}와 ${cMaterial2}가 충돌하면 지역의 접근·인물의 입장과 목표가 갱신된다.`,abGameplayEffect:bridge
      },
      crossSystemRules:freeTopicMode?[`MAIN이 WorldAccessState·IntentState를 확인해 A의 RouteState 진입을 결정한다.`,`A가 RouteState·RiskState를 읽고 실행하면 RiskState·ResourceState가 변해 B의 행동 비용과 허용 조건이 바뀐다.`,`B가 RiskState·ResourceState를 판정해 RouteState·RiskState를 출력한 뒤 A로 반환한다. 실패·취소 시 원래 상태를 보존한다.`,`C의 ${cMaterial1}·${cMaterial2} 단서 해석이 A의 RiskState 및 B의 ResourceState·RouteState 조건을 변경하며 ${secondaryGenre} 판단이 실제 대안 선택을 만든다.`]:[`MAIN의 목표가 ${profile.a}에서 추적할 경로와 정보를 결정한다.`,`A의 결과로 ${profile.b}의 비용·위험·가능 행동이 달라진다.`,`B의 대응 결과가 다음 ${profile.a}의 조건을 되돌려 바꾼다.`,`C의 두 소재와 ${secondaryGenre} 판단이 위 두 시스템의 정보·경로를 변경한다.`]
    },
    delveLayer:{formulaSuffix:'+ @',role:'DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS',elements:delveConditions.map(row=>({... (row.sourceDId?{sourceDId:row.sourceDId}:{}),name:row.name,discoveryCondition:row.condition,masteryOrInsight:row.insight,gameplayEffect:row.effect,connectsTo:row.links}))},
    emergentGenre:{name:freeTopicMode?`${gameName} 복합장르`.slice(0,180):`${aMaterial}·${bMaterial} ${profile.genre}`,definition:freeTopicMode?`A(${profile.a})·B(${profile.b})가 인과 상태를 교환하고 C(${standard?primaryGenre:profile.genre}×${secondaryGenre})가 목표와 대응법을 바꾸며 @(${discoveredCore.name})의 발견 결과가 다음 행동을 여는 복합 장르다.`:`${profile.a}과 ${profile.b}의 왕복 결과에 ${cMaterial1}·${cMaterial2}와 ${secondaryGenre} 판단이 개입해 다음 월드 상태가 변하는 복합 장르다.`,whyNotSingleConventionalGenre:'한쪽 시스템이나 소재, 보조 장르를 제거하면 가능 경로와 사건 원인이 바뀌므로 단일 장르 규칙으로 환원할 수 없다.',grammarFormula:standard?standard.formula:'MAIN × A × B × C + @',categoryRole:'SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE'},
    expansionVectors:[`${profile.a}의 새로운 지역에서 이전 인과 선택을 다시 해석한다.`,`${profile.b}의 새 상대는 기존 상태를 증폭하거나 반전한다.`,`${cMaterial1}과 ${cMaterial2}의 조합에 다른 인간 갈등을 연결한다.`,`@의 각 발견 결과에서 다음 A→B→A 조건과 C의 새 해석을 파생한다. 동일 상태값이나 번호만 바꾼 발견은 제외하고 기존 숙련과 다음 숙련의 새 행동·판정·결과를 확인해 상한 없이 이어 간다.`]
  };
  return {
    basicDesignSelection:standard?{
      standardVersion:standard.version,
      a:{gameGenre:aClassification.representative,gameRole:'PRIMARY',material:first.source,...(referenceBaseline?{referenceGame:{...representativeGame}}:{})},
      b:{gameGenreRepresentative:bClassification.representative,gameGenre:bClassification.detailed.find(name=>name.split(' ').some(word=>word.length>1&&profile.b.includes(word)))||bClassification.detailed[0],gameRole:'SUPPORTING',material:second.middle,materialPath:[second.source,second.middle],supportingReason:`${profile.b}는 ${profile.a}의 결과를 읽는 보조 판단이다. 결과가 중심 ${profile.a}의 다음 경로와 위험으로 돌아온다.`},
      ...(referenceBaseline||bReference?{existingSystemReference:{scope:referenceBaseline?(bReference?'B_EXISTING_GAME_SYSTEMS':'B_NEW_GAME_INITIAL_SYSTEMS'):'B_SUPPORTING_REFERENCE_ONLY',systemFamily:clean(bReference?.systemFamily||profile.b),playerChoice:clean(bReference?.playerChoice||profile.choiceB),source:clean(bReference?.source)||'신규 기본설계:'+clean(target.requestId)}}:{}),
      materialHierarchyVersion:standard.materialHierarchyVersion,
      dSources:standardDSources
    }:null,
    requestId:target.requestId,category,gameName,referenceGames:representativeGame?[representativeGame.name]:[],coreFunToLearn:[bridge,genreInterlock],
    coreLoop,distinctIdentity:identity,targetAudience:`${profile.genre} 장르에서 실제 선택과 세계 반응을 탐색하는 모바일 플레이어`,
    initialTargetPlatform:target.platform,initialPlayMode:'PROJECT_DEFINED',multiplayerDesignMode:['COOP','COMPETITIVE','HYBRID'].includes(clean(target?.portfolioRequest?.multiplayerDesignMode).toUpperCase())?clean(target.portfolioRequest.multiplayerDesignMode).toUpperCase():(/BATTLEGROUND|PVP|RACING|PARTY/.test(category)?'COMPETITIVE':'COOP'),
    crossPlatformExpansionValue:'동일 인과문법을 보존한 플랫폼별 네이티브 구현에 적용 가능하다.',
    steamExpansionPossible:'POSSIBLE',transformationMode:'ORIGINAL_COMPOSITION',
    gameplaySketch:{version:5,source:'VIBE_NATIVE_CAUSAL_COMPOSITION',novelGameGrammar:grammar,
      worldModel:freeTopicMode?`${gameName}의 첫 선택 장소에서는 A의 RouteState를, 되돌림 장소에서는 B의 ResourceState·RiskState를 검증한다. 돌아오면 동일 장소의 접근 조건과 결과가 변경된다.`:`${gameName}의 공간은 ${aMaterial}와 ${bMaterial} 선택의 결과로 목표·동선·위험이 달라진다.`,
      interactionChains:freeTopicMode?[`MAIN(WorldAccessState) → A(RouteState·RiskState 입력, ResourceState 출력) → B(ResourceState·RiskState 입력, RouteState 출력) → A 재진입`,`@ 발견 조건 충족 → MAIN(WorldAccessState·IntentState 변경) → A의 새로운 경로를 판정`]:[`${chooseA} -> ${stateA} -> ${chooseB} -> ${stateB}`],
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

