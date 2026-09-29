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
import {assertGameSeed} from './company-game-seed-contract.mjs';
import {
  categorySeedProfile,
  loadPlatformProfiles,
  normalizeSeedPlatform,
  representativeCategoriesForPlatform,
} from './game-seed-platform-profile.mjs';

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
const GAMEPLAY_SKETCH_SCHEMA={
  type:'object',
  required:['worldModel','actors','interactionChains','stateMachine','firstPlayableCycle','expansionPlan','longGoalScenario','validationRisks'],
  properties:{
    worldModel:{type:'string',minLength:1,maxLength:900},
    actors:{type:'array',minItems:2,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    interactionChains:{type:'array',minItems:1,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    stateMachine:{type:'array',minItems:5,maxItems:10,uniqueItems:true,items:SKETCH_ITEM},
    firstPlayableCycle:{type:'array',minItems:6,maxItems:10,uniqueItems:true,items:SKETCH_ITEM},
    expansionPlan:{type:'array',minItems:3,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
    longGoalScenario:{type:'array',minItems:3,maxItems:8,uniqueItems:true,items:SKETCH_ITEM},
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
function similarity(a,b){
  const A=conceptTokens(a),B=conceptTokens(b);
  if(!A.size||!B.size)return 0;
  let hit=0;
  for(const t of A)if(B.has(t))hit++;
  return hit/Math.max(A.size,B.size);
}
function assertDistinctConcept(proposal){
  for(const seed of state.seeds||[]){
    if(['DISCARDED','REMOVED'].includes(clean(seed.status).toUpperCase()))continue;
    if(similarity(seed,proposal)>=0.82)throw new Error(`GAME_SEED_CONCEPT_DUPLICATE ${seed.gameId||seed.seedId}`);
  }
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
    `월드에 진입하고 현재 목표를 확인한다`,coreLoop[0]||'핵심 행동을 실제 입력으로 수행한다',coreLoop[1]||'행동 결과로 상태와 자원을 변화시킨다','보상 또는 의미 있는 선택을 적용한다','위험·실패·자원 압박을 실제로 겪는다',coreLoop[2]||'목표를 끝내거나 재도전 가능한 사이클을 닫는다'
  ],6,10);
  const expansionPlan=sketchArray(raw.expansionPlan,['새 적·위협 또는 행동 패턴을 추가한다','새 공간·경로 또는 목표를 추가한다','새 상호작용 또는 전략 선택이 기존과 다른 결과를 만들게 한다'],3,8);
  const longGoalScenario=sketchArray(raw.longGoalScenario,[`초기 핵심 루프를 완료한다`,`성장·보상으로 새로운 선택을 연다`,`새 지역·위협·목표를 거쳐 중간 목표를 달성한다`],3,8);
  const validationRisks=sketchArray(raw.validationRisks,['버튼/라벨/파일 크기만으로 구현 완료를 가장하지 않는다','반복·재시작·대기로 콘텐츠 분량을 채우지 않는다'],2,8);
  return{version:1,source:clean(raw.source)||'GAME_SEED_MODEL_OR_NORMALIZED_SKETCH',worldModel,actors,interactionChains,stateMachine,firstPlayableCycle,expansionPlan,longGoalScenario,validationRisks};
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
  if(!clean(sketch.worldModel)||!Array.isArray(sketch.actors)||sketch.actors.length<2||!Array.isArray(sketch.interactionChains)||sketch.interactionChains.length<1||!Array.isArray(sketch.stateMachine)||sketch.stateMachine.length<5||!Array.isArray(sketch.firstPlayableCycle)||sketch.firstPlayableCycle.length<6||!Array.isArray(sketch.expansionPlan)||sketch.expansionPlan.length<3||!Array.isArray(sketch.longGoalScenario)||sketch.longGoalScenario.length<3||!Array.isArray(sketch.validationRisks)||sketch.validationRisks.length<2)errors.push('gameplaySketch');
  if(errors.length)throw new Error(`GAME_SEED_INVALID ${target.platform}/${target.category}: ${errors.join(',')}`);
  assertDistinctConcept(p);
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
  const prompt=`GAME_SEED를 작성하라. 각 요청의 seedMaterials는 100개 재료 풀에서 목표 플랫폼, 카테고리 적합성, 재료 상호보완성, 검증된 학습 성과, 기존 Top30과의 차별성을 기준으로 2~4개가 동적으로 선정되었다. 주어진 재료를 모두 실제로 조합한다. 재료는 기존 게임일 필요가 없으며 직업·산업·자연·과학·스포츠·놀이·사회관계·생존상황·공간운영·완전 신규 아이디어를 동등하게 사용할 수 있다. existing game reference는 선택사항이다. 동일 참고 게임이나 동일 장르 재사용은 허용하지만 최종 coreLoop와 distinctIdentity가 기존 프로젝트와 사실상 같으면 안 된다. 직접적인 이름·스토리·캐릭터·맵·아트·소스코드 복제를 금지한다. initialTargetPlatform은 Roblox/Unity/Fortnite UEFN 중 프로젝트에 가장 맞게 정하고, multiplayerDesignMode를 설계 전에 SINGLE/COOP/COMPETITIVE/HYBRID 중 하나로 확정한다. gameplaySketch는 코드 작성 전에 게임 전체를 머릿속에서 실행해 보는 스케치다. worldModel에는 실제 플레이 공간·경로·위치가 게임 결과에 어떻게 연결되는지 적고, actors에는 플레이어/NPC/적/사물 역할을, interactionChains에는 접근·선택→입력→대상 상태 변화→게임 결과 변화를 적는다. stateMachine과 firstPlayableCycle은 시작부터 실제 입력·핵심 행동·상태변화·성장/선택·위험/실패·목표/재도전까지 이어져야 한다. expansionPlan은 새 적·구역·목표·상호작용·전략 결과로 실제 콘텐츠를 늘리고 반복/재시작/대기로 시간을 채우지 않는다. longGoalScenario는 여러 단계 목표를 실제 플레이 순서로 적고 validationRisks에는 소프트락·저장·경제·난이도·성능·모바일·겉구현 위험 중 핵심을 적는다. 첫 세션은 정확히 30분의 의미 있는 진행을 전제로 하며 단순 반복·대기·체력 증가로 시간을 채우면 안 된다. REQUESTS=${JSON.stringify(requests)}. JSON 스키마만 출력하라.`;
  try{
    const r=await fetch('http://127.0.0.1:11434/api/chat',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        model,stream:false,keep_alive:'0s',format:batchSchema(targets.length),
        messages:[
          {role:'system',content:'너는 재운컴퍼니 GAME_SEED 조합 AI다. 재료를 게임으로 오해하지 말고 여러 출처의 추상 재료를 독립 게임 설계 후보로 조합한다. 코드 생성 전에 실제 월드와 플레이 흐름을 GAMEPLAY_SKETCH로 먼저 구성한다.'},
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
    const serials=new Map();
    for(let i=0;i<targets.length;i++){
      const target=targets[i],proposal=normalizeProposal(target,proposals[i]);
      validateProposal(target,proposal);
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
      state.initialBatchCount=created.length;
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
    console.log(`GAME_SEED_MODEL_CALLS=${result.modelCalls}`);
    console.log(`OWNER_PRESERVATION_SEED_MATERIALIZED_COUNT=${(result.ownerPreservationGameIds||[]).length}`);
    console.log(`OWNER_PRESERVATION_SEED_GAME_IDS=${(result.ownerPreservationGameIds||[]).join(',')||'NONE'}`);
    console.log(`SEED_MATERIAL_POOL_TARGET=${result.seedMaterialPoolTarget||100}`);
    console.log(`SEED_MATERIAL_POOL_AVAILABLE=${result.seedMaterialAvailable??0}`);
    console.log('SEED_MATERIAL_COMPOSITION_MODE=DYNAMIC_CONTEXTUAL_2_TO_4');
    console.log('HISTORICAL_SIX_CATEGORY_ROLE=BASELINE_AND_FALLBACK_ONLY');
    console.log('GAMEPLAY_SKETCH_REQUIRED_FOR_NEW_SEEDS=YES');
    console.log('TARGET_SESSION_MINUTES=30');
    console.log('GAME_SEED_MATERIALS_ARE_GAMES=NO');
    console.log('GAME_SEED_PAID_API=NO');
  }).catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
}
