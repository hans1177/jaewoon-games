import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {
  DEFAULT_SEED_CATEGORIES,
  SEED_MATERIAL_DYNAMIC_SIGNALS,
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
import {assertGameSeed,GAMEPLAY_COMPOSITION_MECHANIC_FAMILIES,GAMEPLAY_NARRATIVE_DNA_FAMILIES,GAMEPLAY_NARRATIVE_RIGHTS_MODES} from './company-game-seed-contract.mjs';
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

const TEXT={type:'string',maxLength:1200};
const SKETCH_ITEM={type:'string',minLength:1,maxLength:360};
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
const COMPOSITION_DEPTH_SCHEMA={
  type:'object',
  required:['mainContent','majorSubSystems','extensionSystems','crossSystemCombinations','hiddenCombinations','growthMutations','legacyContentRevisitHooks','endgameFusion','mechanicDiversitySources'],
  properties:{
    mainContent:{type:'string',minLength:20,maxLength:700},
    majorSubSystems:{type:'array',minItems:3,maxItems:6,uniqueItems:true,items:SKETCH_ITEM},
    extensionSystems:{type:'array',minItems:6,maxItems:15,uniqueItems:true,items:SKETCH_ITEM},
    crossSystemCombinations:{type:'array',minItems:4,maxItems:10,uniqueItems:true,items:SKETCH_ITEM},
    hiddenCombinations:{type:'array',minItems:2,maxItems:6,uniqueItems:true,items:SKETCH_ITEM},
    growthMutations:{type:'array',minItems:2,maxItems:6,uniqueItems:true,items:SKETCH_ITEM},
    legacyContentRevisitHooks:{type:'array',minItems:2,maxItems:6,uniqueItems:true,items:SKETCH_ITEM},
    endgameFusion:{type:'string',minLength:30,maxLength:900},
    mechanicDiversitySources:{type:'array',minItems:3,maxItems:8,uniqueItems:true,items:{type:'string',enum:[...GAMEPLAY_COMPOSITION_MECHANIC_FAMILIES]}},
  },
  additionalProperties:false,
};
const NARRATIVE_DEPTH_SCHEMA={
  type:'object',
  required:['applicable','storyWeight','worldConflict','mainStoryArc','narrativeDnaSources','rightsModes','npcRelationshipWeb','companionArcs','mainSubquestLinks','foreshadowPayoffs','factionCultureHooks','historicalMythReinterpretations','worldbuildingFusion','storySystemLinks','culturalRespectRules'],
  properties:{
    applicable:{type:'boolean'},
    storyWeight:{type:'string',enum:['LIGHT','MEDIUM','HEAVY']},
    worldConflict:{type:'string',minLength:20,maxLength:900},
    mainStoryArc:{type:'string',minLength:30,maxLength:1000},
    narrativeDnaSources:{type:'array',minItems:2,maxItems:6,uniqueItems:true,items:{type:'string',enum:[...GAMEPLAY_NARRATIVE_DNA_FAMILIES]}},
    rightsModes:{type:'array',minItems:1,maxItems:3,uniqueItems:true,items:{type:'string',enum:[...GAMEPLAY_NARRATIVE_RIGHTS_MODES]}},
    npcRelationshipWeb:{type:'array',minItems:2,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    companionArcs:{type:'array',minItems:1,maxItems:6,uniqueItems:true,items:SKETCH_ITEM},
    mainSubquestLinks:{type:'array',minItems:2,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    foreshadowPayoffs:{type:'array',minItems:2,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    factionCultureHooks:{type:'array',minItems:2,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    historicalMythReinterpretations:{type:'array',minItems:2,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    worldbuildingFusion:{type:'array',minItems:3,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    storySystemLinks:{type:'array',minItems:3,maxItems:10,uniqueItems:true,items:SKETCH_ITEM},
    culturalRespectRules:{type:'array',minItems:3,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
  },
  additionalProperties:false,
};
const GAMEPLAY_SKETCH_SCHEMA={
  type:'object',
  required:['worldModel','actors','interactionChains','stateMachine','firstPlayableCycle','playerPromise','funDrivers','balanceRules','pacingPlan','progressionLayers','expansionPlan','longGoalScenario','completionCriteria','codingGrowthHooks','validationRisks','compositionDepth','narrativeDepth'],
  properties:{
    worldModel:{type:'string',minLength:1,maxLength:900},
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
    compositionDepth:COMPOSITION_DEPTH_SCHEMA,
    narrativeDepth:NARRATIVE_DEPTH_SCHEMA,
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
function normalizeGameplaySketch(target,p,coreLoop,gameName){
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
  const compositionRaw=raw.compositionDepth&&typeof raw.compositionDepth==='object'&&!Array.isArray(raw.compositionDepth)?raw.compositionDepth:{};
  const mainContent=clean(compositionRaw.mainContent)||(gameName+'의 메인 '+target.category+' 핵심 플레이를 유지하면서 서브 시스템이 메인 선택과 성장에 실제 상태로 연결된다.');
  const majorSubSystems=sketchArray(compositionRaw.majorSubSystems,[
    (coreLoop[1]||'핵심 결과')+'를 장기 성장·해금·전략 선택으로 연결하는 성장 축',
    (coreLoop[2]||'다음 목표')+'를 공간·목표·발견 차이로 확장하는 탐험/콘텐츠 축',
    '수집·관계·경제·제작 중 게임 정체성에 맞는 축을 메인 플레이 결과와 연결하는 서브 시스템'
  ],3,6);
  const extensionSystems=sketchArray(compositionRaw.extensionSystems,[
    '판매·상점·거래 또는 지역별 교환 조건',
    '동료·파티·주민·호감도 중 장르에 맞는 관계 성장',
    '서브퀘스트·사건·도전 의뢰',
    '고전 카드·주사위·타일·경매 규칙을 변형한 짧은 미니게임',
    '아이템·유물·도감·세트 수집과 조합',
    '강화·합성·진화·연구 중 기존 성장과 연결되는 메타 선택',
    '펫·소환·동료 수집 또는 역할 조합',
    '무역·생산·운송·시장 변동 중 장르에 맞는 경제 변주'
  ],6,15);
  const systemA=majorSubSystems[0]||'SUB_SYSTEM_A';
  const systemB=majorSubSystems[1]||'SUB_SYSTEM_B';
  const systemC=majorSubSystems[2]||'SUB_SYSTEM_C';
  const crossSystemCombinations=sketchArray(compositionRaw.crossSystemCombinations,[
    '메인 × '+systemA+': 서브 성과가 다음 핵심 플레이 선택을 바꾼다',
    '메인 × '+systemB+': 새 공간·목표·위험이 핵심 루프의 다른 경로를 연다',
    systemA+' × '+systemC+': 한 서브 시스템의 보상이 다른 서브 시스템의 선택을 확장한다',
    '메인 × '+systemA+' × '+systemB+' + @: 중후반에는 세 축과 하나 이상의 확장 요소를 함께 조합해야 새로운 결과가 열린다'
  ],4,10);
  const hiddenCombinations=sketchArray(compositionRaw.hiddenCombinations,[
    systemA+'의 특정 상태 + '+systemB+'의 특정 성과가 숨은 이벤트·보상·경로를 연다',
    systemB+' + '+systemC+' + 특정 시기/지역/조건 조합으로 비밀 콘텐츠가 드러난다'
  ],2,6);
  const growthMutations=sketchArray(compositionRaw.growthMutations,[
    '초반 단독 시스템이 중반에 다른 시스템과 결합되고 후반에는 새 선택 규칙으로 변형된다',
    '성장으로 얻은 이동·도구·관계·정보가 이전 지역/콘텐츠의 접근법과 보상을 바꾼다'
  ],2,6);
  const legacyContentRevisitHooks=sketchArray(compositionRaw.legacyContentRevisitHooks,[
    '새 성장 능력이나 도구가 초반 지역의 미개방 경로·상호작용·보상을 다시 열게 한다',
    '후반 시스템이 초기 NPC·상점·던전·맵·수집품에 새로운 목적과 교환/조합 가치를 부여한다'
  ],2,6);
  const endgameFusion=clean(compositionRaw.endgameFusion)||('엔드게임은 메인 플레이 × '+systemA+' × '+systemB+' × '+systemC+' + 복수 @ 요소를 조합해 단순 수치 상승이 아닌 빌드·경로·수집·경제·관계의 상호작용으로 파고들기를 만든다.');
  const allowedFamilies=new Set(GAMEPLAY_COMPOSITION_MECHANIC_FAMILIES);
  const mechanicDiversitySources=sketchArray(
    (Array.isArray(compositionRaw.mechanicDiversitySources)?compositionRaw.mechanicDiversitySources:[]).filter(value=>allowedFamilies.has(clean(value))),
    ['CLASSIC_CARD','MODERN_BOARD','COLLECTION_META','EXPLORATION'],
    3,8
  );
  const compositionDepth={mainContent,majorSubSystems,extensionSystems,crossSystemCombinations,hiddenCombinations,growthMutations,legacyContentRevisitHooks,endgameFusion,mechanicDiversitySources};
  const narrativeRaw=raw.narrativeDepth&&typeof raw.narrativeDepth==='object'&&!Array.isArray(raw.narrativeDepth)?raw.narrativeDepth:{};
  const storyWeight=clean(narrativeRaw.storyWeight).toUpperCase()
    ||(/RPG|ADVENTURE|HORROR|STRATEGY|SIMULATION/i.test(target.category)?'HEAVY':/PUZZLE|CASUAL|ARCADE/i.test(target.category)?'LIGHT':'MEDIUM');
  const narrativePool=[...GAMEPLAY_NARRATIVE_DNA_FAMILIES];
  const narrativeSeed=clean(target.requestId||gameName).split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
  const narrativeFallback=[];
  for(let i=0;i<3;i++)narrativeFallback.push(narrativePool[(narrativeSeed+i*7)%narrativePool.length]);
  const allowedNarrativeFamilies=new Set(GAMEPLAY_NARRATIVE_DNA_FAMILIES);
  const narrativeDnaSources=sketchArray(
    (Array.isArray(narrativeRaw.narrativeDnaSources)?narrativeRaw.narrativeDnaSources:[]).filter(value=>allowedNarrativeFamilies.has(clean(value))),
    narrativeFallback,2,6
  );
  const allowedRightsModes=new Set(GAMEPLAY_NARRATIVE_RIGHTS_MODES);
  const rightsModes=sketchArray(
    (Array.isArray(narrativeRaw.rightsModes)?narrativeRaw.rightsModes:[]).filter(value=>allowedRightsModes.has(clean(value))),
    ['PUBLIC_DOMAIN_OR_HISTORICAL_STRUCTURE','ABSTRACT_TECHNIQUE_ONLY','ORIGINAL_SYNTHESIS'],1,3
  );
  const worldConflict=clean(narrativeRaw.worldConflict)
    ||(gameName+'의 세계는 서로 다른 세력·지역·가치관이 '+mainContent+'의 자원과 목표를 두고 충돌하며 플레이어 선택으로 관계와 지역 상태가 달라진다.');
  const mainStoryArc=clean(narrativeRaw.mainStoryArc)
    ||'초반에는 지역 사건과 NPC 관계를 통해 갈등을 발견하고, 중반에는 동료·세력·서브퀘의 선택 결과가 메인 갈등에 합류하며, 후반에는 과거의 복선과 역사·신화 재해석이 현재 세계의 진실과 최종 선택을 바꾼다.';
  const npcRelationshipWeb=sketchArray(narrativeRaw.npcRelationshipWeb,[
    '핵심 NPC는 목표·두려움·비밀·소속 세력·플레이어 기억을 가지며 퀘스트 결과에 따라 관계 상태가 바뀐다',
    'NPC끼리 동맹·경쟁·가족·사제·채무·은원 중 하나 이상의 관계를 공유하고 한 인물의 선택이 다른 인물의 태도와 사건 조건에 영향을 준다',
    '상인·장인·정보원·주민 같은 기능 NPC도 경제·제작·탐험·세력 상태와 개인 사연을 연결한다'
  ],2,8);
  const companionArcs=sketchArray(narrativeRaw.companionArcs,[
    '동료는 영입 계기→개인 갈등→관계 선택→전투/탐험 역할 변화→후반 결단의 단계가 있고 파티 조합이 대사·서브퀘·숨은 사건 조건에 영향을 준다',
    '동료의 개인 목표와 메인 세력 갈등이 충돌하는 순간을 만들어 충성·이탈·화해·전용 능력/정보 해금이 플레이 결과로 이어진다'
  ],1,6);
  const mainSubquestLinks=sketchArray(narrativeRaw.mainSubquestLinks,[
    '메인 사건이 여러 NPC 관점의 서브퀘를 만들고 서브퀘 결과가 이후 메인 대사·지원·경로·보스 대응·세력 상태 중 하나 이상을 바꾼다',
    '초반의 작은 부탁이나 수집 단서가 중후반 가문·세력·유적·전쟁·미스터리의 핵심 증거 또는 선택 조건으로 회수된다',
    '서브퀘 완료 보상은 단순 재화만이 아니라 정보·동료 관계·새 거래·탐험 경로·제작법·평판 등 다른 시스템에 연결된다'
  ],2,8);
  const foreshadowPayoffs=sketchArray(narrativeRaw.foreshadowPayoffs,[
    '초반 환경 단서·대사·유물·소문 중 하나를 중반 사건에서 재해석하고 후반 메인 갈등에서 실제 선택 근거로 회수한다',
    '서로 모순되는 NPC 증언이나 기록을 남겨 플레이어가 탐험·수집·관계 정보를 조합하면 숨은 진실과 다른 해결법을 발견하게 한다'
  ],2,8);
  const factionCultureHooks=sketchArray(narrativeRaw.factionCultureHooks,[
    '세력마다 통치·거래·명예·신앙·기술·전쟁 방식 중 최소 두 축이 달라 지역 구조와 NPC 행동, 상점/퀘스트/적대 규칙에 반영된다',
    '세력 관계는 고정 선악이 아니라 이해관계·역사적 상처·자원·외교 조건으로 설명하고 플레이어 행동에 따라 동맹·중립·갈등이 변화한다'
  ],2,8);
  const historicalMythReinterpretations=sketchArray(narrativeRaw.historicalMythReinterpretations,[
    narrativeDnaSources[0]+'의 권력·관계·운명·사회구조를 이름과 사건을 복제하지 않고 게임 세계의 세력/지역/인물 갈등으로 재구성한다',
    narrativeDnaSources[1]+'의 서사 기법을 메인 퀘스트와 동료/서브퀘 구조로 변형하고 원전의 고유 표현·대사·캐릭터·장면 배열은 복제하지 않는다',
    '로마 공화정/제정의 원로원·가문 경쟁·군단·속주·시민권·대중정치·무역 구조와 현대사의 산업화·도시화·혁명·총력전·냉전/첩보·탈식민·국제질서 구조를 필요할 때 세계관 시스템으로 재해석한다'
  ],2,8);
  const worldbuildingFusion=sketchArray(narrativeRaw.worldbuildingFusion,[
    '역사적 권력 구조 × 신화적 세계 규칙을 결합해 세력 제도·지역 신앙·금기·유물의 기원을 한 세계사로 연결한다',
    '경제/무역/기술 변화 × NPC 관계망을 결합해 도시·마을·상점·직업·세력의 생활상이 메인 갈등의 원인이자 결과가 되게 한다',
    '전쟁/정치 갈등 × 탐험/미스터리를 결합해 폐허·기록·국경·유적이 과거 사건의 증거이자 현재 플레이 경로가 되게 한다',
    '민담/공포/신화 × 일상 문화 요소를 결합해 괴이·축제·의식·금기·지역 전설이 퀘스트와 환경 상호작용으로 드러나게 한다'
  ],3,8);
  const storySystemLinks=sketchArray(narrativeRaw.storySystemLinks,[
    'NPC 관계/평판 변화가 동료 영입·상점·무역·서브퀘·지역 접근 중 실제 시스템 상태를 바꾼다',
    '탐험에서 발견한 기록·유물·증거가 메인/서브퀘 분기와 제작·수집·숨은 보스/지역 조건으로 연결된다',
    '세력 선택과 동료 조합이 파티 시너지·지원군·가격·경로·보스 대응 방식 중 하나 이상을 변화시킨다',
    '하우징/거점/박물관/기록실 같은 적합한 시스템이 수집한 서사 자산을 보관·해석하고 새 사건·제작·탐험 목표를 연다'
  ],3,10);
  const culturalRespectRules=sketchArray(narrativeRaw.culturalRespectRules,[
    '역사·신화·민담은 단일 민족/문화의 고정 관념이나 우열 서열로 단순화하지 않고 내부의 다양한 역할과 이해관계를 구분한다',
    '실제 비극·전쟁·식민지배·박해·학살을 가벼운 보상 장치나 희화화로 사용하지 않고 필요하면 허구화·거리두기·맥락화를 적용한다',
    '김용·톨킨·오웰 등 현대 보호 작품은 고유 캐릭터·세계관·명칭·대사·장면을 복제하지 않고 문파 관계·권력 감시·원정 구조 같은 추상 기법만 변형한다',
    '공공영역 고전과 역사 소재도 원문 복제가 아니라 세계관·시스템·인물관계에 맞는 독자적 재구성을 우선한다'
  ],3,8);
  const narrativeDepth={applicable:true,storyWeight,worldConflict,mainStoryArc,narrativeDnaSources,rightsModes,npcRelationshipWeb,companionArcs,mainSubquestLinks,foreshadowPayoffs,factionCultureHooks,historicalMythReinterpretations,worldbuildingFusion,storySystemLinks,culturalRespectRules};
  const flowBaseline={content:{
    identity:clean(p?.distinctIdentity)||gameName,
    playerFantasy:playerPromise,
    coreFun:uniq(p?.coreFunToLearn).join(' '),
    coreLoop,
    progressionDirection:progressionLayers.join(' '),
  }};
  const flowArchitecture=buildGameFlowArchitecture({gameId:`seed:${target.requestId}`,genre:target.category,baseline:flowBaseline,inventory:[]});
  return{version:3,source:clean(raw.source)||'GAME_SEED_MODEL_OR_NORMALIZED_SKETCH_V3',worldModel,actors,interactionChains,stateMachine,firstPlayableCycle,playerPromise,funDrivers,balanceRules,pacingPlan,progressionLayers,expansionPlan,longGoalScenario,completionCriteria,codingGrowthHooks,validationRisks,compositionDepth,narrativeDepth,flowArchitecture};
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
  if(Number(sketch.version||0)<3||!clean(sketch.worldModel)||!Array.isArray(sketch.actors)||sketch.actors.length<2||!Array.isArray(sketch.interactionChains)||sketch.interactionChains.length<1||!Array.isArray(sketch.stateMachine)||sketch.stateMachine.length<5||!Array.isArray(sketch.firstPlayableCycle)||sketch.firstPlayableCycle.length<6||!clean(sketch.playerPromise)||!Array.isArray(sketch.funDrivers)||sketch.funDrivers.length<3||!Array.isArray(sketch.balanceRules)||sketch.balanceRules.length<4||!sketch.pacingPlan||!Array.isArray(sketch.progressionLayers)||sketch.progressionLayers.length<3||!Array.isArray(sketch.expansionPlan)||sketch.expansionPlan.length<4||!Array.isArray(sketch.longGoalScenario)||sketch.longGoalScenario.length<3||!Array.isArray(sketch.completionCriteria)||sketch.completionCriteria.length<4||!Array.isArray(sketch.codingGrowthHooks)||sketch.codingGrowthHooks.length<4||!Array.isArray(sketch.validationRisks)||sketch.validationRisks.length<2||!Array.isArray(sketch.flowArchitecture?.flowDNA)||sketch.flowArchitecture.flowDNA.length<2||!sketch.compositionDepth||!clean(sketch.compositionDepth.mainContent)||!Array.isArray(sketch.compositionDepth.majorSubSystems)||sketch.compositionDepth.majorSubSystems.length<3||!Array.isArray(sketch.compositionDepth.extensionSystems)||sketch.compositionDepth.extensionSystems.length<6||!Array.isArray(sketch.compositionDepth.crossSystemCombinations)||sketch.compositionDepth.crossSystemCombinations.length<4||!Array.isArray(sketch.compositionDepth.hiddenCombinations)||sketch.compositionDepth.hiddenCombinations.length<2||!Array.isArray(sketch.compositionDepth.growthMutations)||sketch.compositionDepth.growthMutations.length<2||!Array.isArray(sketch.compositionDepth.legacyContentRevisitHooks)||sketch.compositionDepth.legacyContentRevisitHooks.length<2||!clean(sketch.compositionDepth.endgameFusion)||!Array.isArray(sketch.compositionDepth.mechanicDiversitySources)||sketch.compositionDepth.mechanicDiversitySources.length<3||!sketch.narrativeDepth||sketch.narrativeDepth.applicable!==true||!clean(sketch.narrativeDepth.worldConflict)||!clean(sketch.narrativeDepth.mainStoryArc)||!Array.isArray(sketch.narrativeDepth.narrativeDnaSources)||sketch.narrativeDepth.narrativeDnaSources.length<2||!Array.isArray(sketch.narrativeDepth.npcRelationshipWeb)||sketch.narrativeDepth.npcRelationshipWeb.length<2||!Array.isArray(sketch.narrativeDepth.mainSubquestLinks)||sketch.narrativeDepth.mainSubquestLinks.length<2||!Array.isArray(sketch.narrativeDepth.worldbuildingFusion)||sketch.narrativeDepth.worldbuildingFusion.length<3||!Array.isArray(sketch.narrativeDepth.storySystemLinks)||sketch.narrativeDepth.storySystemLinks.length<3)errors.push('gameplaySketch');
  if(errors.length)throw new Error(`GAME_SEED_INVALID ${target.platform}/${target.category}: ${errors.join(',')}`);
}
async function callModelBatch(targets){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),MODEL_TIMEOUT_MS);
  const requests=targets.map(t=>({
    requestId:t.requestId,
    category:t.category,
    platform:t.platform,
    platformLocked:t.lockedPlatform,
    seedMaterialSelection:t.materialSelection,
    seedMaterials:t.materials.map(m=>({id:m.materialId,sourceFamily:m.sourceFamily,concept:m.concept,mechanic:m.mechanic,setting:m.setting})),
    optionalSuccessfulGameReferences:t.benchmarkCandidates,
    targetSessionMinutes:30,
    multiplayerMustBeDecidedNow:true,
    allowedMultiplayerModes:['SINGLE','COOP','COMPETITIVE','HYBRID'],
  }));
  const prompt=`GAME_SEED를 작성하라. 각 요청의 seedMaterials는 100개 재료 풀에서 목표 플랫폼, 카테고리 적합성, 재료 상호보완성, 검증된 학습 성과, 기존 Top30과의 차별성을 기준으로 2~4개가 동적으로 선정되었다. 주어진 재료를 모두 실제로 조합한다. 재료는 기존 게임일 필요가 없으며 직업·산업·자연·과학·스포츠·놀이·사회관계·생존상황·공간운영·완전 신규 아이디어를 동등하게 사용할 수 있다. existing game reference는 선택사항이다. 동일 참고 게임이나 동일 장르 재사용은 허용하지만 최종 coreLoop와 distinctIdentity가 기존 프로젝트와 사실상 같으면 안 된다. 직접적인 이름·스토리·캐릭터·맵·아트·소스코드 복제를 금지한다. initialTargetPlatform은 Roblox/Unity/Fortnite UEFN 중 프로젝트에 가장 맞게 정하고, multiplayerDesignMode를 설계 전에 SINGLE/COOP/COMPETITIVE/HYBRID 중 하나로 확정한다. gameplaySketch는 코드 작성 전에 게임 전체를 머릿속에서 실행해 보는 스케치다. worldModel에는 실제 플레이 공간·경로·위치가 게임 결과에 어떻게 연결되는지 적고, actors에는 플레이어/NPC/적/사물 역할을, interactionChains에는 접근·선택→입력→대상 상태 변화→게임 결과 변화를 적는다. stateMachine과 firstPlayableCycle은 시작부터 실제 입력·핵심 행동·상태변화·성장/선택·위험/실패·목표/재도전까지 이어져야 한다. playerPromise는 플레이어가 반복할 핵심 경험과 숙련의 보상을 한 문장으로 고정한다. funDrivers는 즉시 피드백·트레이드오프·숙련에 따른 새 선택·월드/적 반응을 구체적으로 적고, balanceRules는 지배전략 방지·파워/위협 동반 성장·복구 가능한 실패·경제 source/sink·후반 판단구조 변화를 포함한다. pacingPlan은 0~5/5~15/15~25/25~30분과 중후반/재플레이를 각각 다른 역할로 설계하고, progressionLayers는 세션/중기/장기 성장의 선택 폭 변화를 적는다. expansionPlan은 새 적·구역·목표·상호작용·전략 결과로 실제 콘텐츠를 늘리며 색상/체력/데미지 배수만 다른 변형이나 반복/재시작/대기를 깊이로 세지 않는다. compositionDepth는 메인 콘텐츠 1개를 중심으로 실제 대형 서브시스템을 최소 3개 설계하고, 판매·동료·서브퀘·미니게임·무역·수집·강화·펫/소환·아이템 조합·파티 조합 같은 @ 확장요소를 게임 정체성에 맞게 최소 6개 풀로 구성한다. 고전 카드/주사위/타일/경매 같은 고전 규칙부터 덱빌딩·드래프트·일꾼배치·엔진빌딩 같은 현대 보드 규칙, 아케이드·생활·사회경제·수집 메타까지 mechanicDiversitySources에서 최소 3개 서로 다른 계통을 사용한다. crossSystemCombinations는 A×B, A×C, B×C, A×B×C+@처럼 최소 4개 실제 상태 연결을 만들고 hiddenCombinations는 조건형 숨은 조합, growthMutations는 성장에 따라 단독 시스템이 융복합으로 변하는 과정, legacyContentRevisitHooks는 성장 후 옛 지역/콘텐츠에 돌아올 이유, endgameFusion은 최종 파고들기 구조를 구체적으로 적는다. 서브 시스템과 미니게임은 독립 메뉴로 던져놓지 말고 메인 성장·탐험·경제·수집·관계 중 하나 이상과 실제 상태를 주고받게 한다. narrativeDepth는 세계관 형성 자체에도 융복합을 적용한다. 중국 사기/초한지/삼국지/수호지 같은 역사·영웅군상, 로마 공화정·제정의 가문/원로원/군단/속주/시민권/대중정치, 그리스·북유럽·이집트·메소포타미아 신화, 셰익스피어·그림형제·안데르센·뒤마 등 공공영역 고전의 갈등/관계/모험 구조, 일본 전국시대/요괴민담, 중세/교역/학문사, 산업혁명·혁명/공화정·제국주의/식민지 경쟁·세계대전형 총력전·냉전/첩보·탈식민/신생국·대중정치/선전·산업자본/도시노동·국제질서 같은 현대사 구조, 공포신화·미스터리를 2~4개 이상 독자적으로 재조합한다. NPC 관계망·동료 개인서사·세력 문화·메인↔서브퀘 양방향 영향·복선/회수·유물/기록/환경 단서·스토리×게임시스템 연결을 설계한다. 김용·톨킨·오웰 등 현대 보호 작품은 이름/인물/세계관/대사/장면을 복제하지 않고 문파 관계, 감시사회, 원정/동료관계 같은 추상 기법만 참고한다. completionCriteria는 첫 플레이부터 30분+, 실패복구, 모바일, 초중후반 역할 차이를 포함하고 codingGrowthHooks는 기존 책임 함수·데이터 테이블·안정 ID·저장 마이그레이션·프레젠테이션 자산 분리를 고려한다. longGoalScenario는 여러 단계 목표를 실제 플레이 순서로 적고 validationRisks에는 소프트락·저장·경제·난이도·성능·모바일·겉구현 위험 중 핵심을 적는다. 첫 세션은 정확히 30분의 의미 있는 진행을 전제로 하며 단순 반복·대기·체력 증가로 시간을 채우면 안 된다. REQUESTS=${JSON.stringify(requests)}. JSON 스키마만 출력하라.`;
  try{
    const r=await fetch('http://127.0.0.1:11434/api/chat',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        model,stream:false,keep_alive:'0s',format:batchSchema(targets.length),
        messages:[
          {role:'system',content:'너는 재운컴퍼니 GAME_SEED 조합 AI다. 재료를 게임으로 오해하지 말고 여러 출처의 추상 재료를 독립 게임 설계 후보로 조합한다. 코드 생성 전에 실제 월드와 플레이 흐름을 GAMEPLAY_SKETCH로 먼저 구성한다. 재미·밸런스·페이싱·성장·중후반 확장·완성 기준을 서로 연결하고 수치만 키운 복제 콘텐츠를 금지한다. GAMEPLAY_SKETCH v3에서는 메인 장르만 바꾸는 반복을 피하고 고전 카드·보드·아케이드부터 현대 보드/수집/생활/사회경제 규칙까지 다른 계통의 메커니즘을 재조합해 메인×서브×서브×서브+@의 후반 파고들기 구조를 만든다. 세계관도 단일 레퍼런스 복제가 아니라 역사·신화·고전문학·민담·미스터리·공포·세력정치·관계극 DNA를 융합하고, 그 결과를 NPC/동료/서브퀘/세력/지역/경제/수집/탐험 상태와 연결한다.'},
          {role:'user',content:prompt},
        ],
        options:{temperature:0.25,num_ctx:16384,num_predict:7000},
      }),
      signal:controller.signal,
    });
    if(!r.ok)throw new Error(`ollama ${r.status}: ${await r.text()}`);
    const body=await r.json();
    const parsed=JSON.parse(clean(body?.message?.content));
    if(!Array.isArray(parsed.proposals)||parsed.proposals.length!==targets.length)throw new Error('GAME_SEED_BATCH_COUNT_MISMATCH');
    return parsed.proposals;
  }finally{clearTimeout(timer);}
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
      modelCalls:proposalProvider?0:1,
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
