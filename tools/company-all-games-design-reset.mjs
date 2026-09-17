import fs from 'node:fs';

const CATALOG_FILE='game-catalog.json';
const SEED_FILE='game-seed-state.json';
const RESET_REVISION='OWNER-ALL-GAMES-DESIGN-RESET-20260917-1';
const RESET_SOURCE='OWNER_ALL_GAMES_DESIGN_RESET_2026-09-17';
const clean=v=>String(v??'').trim();
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');

function categoryFor(game){
  const text=[game?.name,game?.description,...(Array.isArray(game?.genre)?game.genre:[])].map(clean).join(' ').toLowerCase();
  if(/방치|idle/.test(text))return 'IDLE_GROWTH_RPG';
  if(/스토리|story/.test(text)&&/rpg/.test(text))return 'STORY_COMPLETE_RPG';
  if(/퍼즐|체스|보드|puzzle|chess/.test(text))return 'PUZZLE';
  if(/디펜스|영토|defense|strategy|전략/.test(text))return 'SINGLE_DEFENSE_STRATEGY';
  if(/생존|survival|로그라이트|rogue/.test(text))return 'ACTION_SURVIVAL_ROGUELITE';
  return 'CASUAL';
}

function platformFor(game){
  const value=clean(game?.selectedPlatform||game?.preferredPlatform).toUpperCase();
  if(value.includes('ROBLOX'))return 'ROBLOX';
  if(value.includes('FORTNITE')||value.includes('UEFN'))return 'FORTNITE_UEFN';
  return 'UNITY';
}

function seedIdFor(gameId){
  return `OWNER-ALL-DESIGN-RESET-${clean(gameId).toUpperCase().replace(/[^A-Z0-9]+/g,'-')}-20260917`;
}

function makeSeed(game,existing={}){
  const gameId=clean(game.id),gameName=clean(game.name||game.id);
  const category=clean(existing.GAME_CATEGORY)||categoryFor(game);
  const platform=clean(existing.INITIAL_TARGET_PLATFORM||existing.selectedPlatform)||platformFor(game);
  return {
    ...existing,
    version:Math.max(2,Number(existing.version)||0),
    seedId:clean(existing.seedId)||seedIdFor(gameId),
    gameId,
    gameName,
    status:'ACTIVE',
    generation:'OWNER_ALL_GAMES_DESIGN_RESET',
    ownerResetRevision:RESET_REVISION,
    GAME_CATEGORY:category,
    REFERENCE_GAMES:Array.isArray(existing.REFERENCE_GAMES)?existing.REFERENCE_GAMES:[],
    CORE_FUN_TO_LEARN:Array.isArray(existing.CORE_FUN_TO_LEARN)&&existing.CORE_FUN_TO_LEARN.length?existing.CORE_FUN_TO_LEARN:[
      `${gameName}의 핵심 재미를 실제 플레이 선택으로 재정의`,
      '진행·위험·보상이 서로 연결되는 반복 가능한 핵심 루프',
      '모바일에서도 즉시 이해되는 입력과 피드백'
    ],
    CORE_LOOP:Array.isArray(existing.CORE_LOOP)&&existing.CORE_LOOP.length>=3?existing.CORE_LOOP:[
      '현재 상황과 목표를 읽고 의미 있는 다음 행동을 선택한다.',
      '행동 결과로 게임 상태·자원·위험·진행도가 실제로 변한다.',
      '변화된 상태를 바탕으로 새로운 목표와 선택을 갱신하며 다음 사이클로 이어간다.'
    ],
    DISTINCT_IDENTITY:clean(existing.DISTINCT_IDENTITY)||`${gameName}을 기존 구현의 점수나 관문을 승계하지 않고 설계 단계부터 다시 검토해 고유한 핵심 재미와 시스템 연결을 확정한다.`,
    MARKET_EVIDENCE_SUMMARY:existing.MARKET_EVIDENCE_SUMMARY||{role:'DESIGN_REEVALUATION',targetMarketScope:'GLOBAL',hardPassFailGate:false,available:false,note:'Owner ordered all current catalog games back to design. Existing builds are preserved as reference only until a new design passes the canonical gates.'},
    TARGET_AUDIENCE:clean(existing.TARGET_AUDIENCE)||`${gameName}의 핵심 장르 플레이를 선호하는 글로벌 플레이어`,
    TARGET_SESSION_DIRECTION:clean(existing.TARGET_SESSION_DIRECTION)||'첫 세션부터 입력, 핵심 행동, 상태 변화, 보상 또는 진행, 위험 또는 실패, 다음 목표가 연결되도록 다시 설계한다.',
    INITIAL_TARGET_PLATFORM:platform,
    INITIAL_PLAY_MODE:clean(existing.INITIAL_PLAY_MODE)||'SINGLE_PLAYER',
    CROSS_PLATFORM_EXPANSION_VALUE:clean(existing.CROSS_PLATFORM_EXPANSION_VALUE)||'REVIEW_IN_DESIGN_CYCLE',
    TRANSFORMATION_MODE:'DESIGN_REEVALUATION_FROM_BASELINE_ZERO',
    SOURCE_CODE_RULE:'PRESERVE_EXISTING_BUILD_UNTIL_NEW_DESIGN_PASSES',
    OWNER_REBUILD_MODE:'DESIGN_FROM_START',
    REUSE_PRIOR_DESIGN_BASELINE:false,
    REUSE_PRIOR_ARTBOOK:false,
    REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION:false,
    LEGACY_BUILD_ROLE:'PUBLIC_ROLLBACK_REFERENCE_ONLY',
    PUBLIC_ROUTE_POLICY:'KEEP_EXISTING_WEB_PATH',
    PUBLIC_SWAP_POLICY:'REPLACE_ONLY_AFTER_FULL_QA_PASS',
    SAVE_POLICY:'PRESERVE_OR_MIGRATE_BEFORE_SWAP',
    MOBILE_FIRST:true,
    productionClass:'DESIGN_ONLY',
    productionClassSource:RESET_SOURCE,
    lifecycleState:'ACTIVE',
    updatedAt:new Date().toISOString()
  };
}

const catalog=readJson(CATALOG_FILE,{games:[]});
const designGames=(catalog.games||[]).filter(game=>clean(game.productionClass)==='DESIGN_ONLY');
if(!designGames.length)throw new Error('NO_DESIGN_ONLY_GAMES_IN_CATALOG');

const state=readJson(SEED_FILE,{version:2,policyDocument:'COMPANY_FLOW.md',seeds:[]});
if(!Array.isArray(state.seeds))state.seeds=[];
const catalogIds=new Set(designGames.map(game=>clean(game.id)).filter(Boolean));
const existingByGame=new Map();
for(const seed of state.seeds){
  const id=clean(seed?.gameId);if(id&&!existingByGame.has(id))existingByGame.set(id,seed);
}

let created=0,reactivated=0,paused=0;
for(const game of designGames){
  const gameId=clean(game.id),existing=existingByGame.get(gameId);
  const next=makeSeed(game,existing||{});
  if(existing){
    if(clean(existing.status).toUpperCase()!=='ACTIVE')reactivated++;
    Object.keys(existing).forEach(key=>delete existing[key]);
    Object.assign(existing,next);
  }else{
    state.seeds.push(next);existingByGame.set(gameId,next);created++;
  }
}

for(const seed of state.seeds){
  const id=clean(seed?.gameId);if(!id||catalogIds.has(id))continue;
  if(clean(seed.status).toUpperCase()==='ACTIVE'){
    seed.status='PAUSED';
    seed.pausedReason='NOT_IN_CANONICAL_GAME_CATALOG';
    seed.pausedAt=new Date().toISOString();
    paused++;
  }
}

state.version=Math.max(2,Number(state.version)||0);
state.policyDocument='COMPANY_FLOW.md';
state.ownerAllGamesDesignReset={revision:RESET_REVISION,source:RESET_SOURCE,gameCount:designGames.length,gameIds:designGames.map(game=>game.id),updatedAt:new Date().toISOString()};
writeJson(SEED_FILE,state);
console.log(`OWNER_ALL_GAMES_DESIGN_RESET_COUNT=${designGames.length}`);
console.log(`OWNER_ALL_GAMES_DESIGN_RESET_CREATED_SEEDS=${created}`);
console.log(`OWNER_ALL_GAMES_DESIGN_RESET_REACTIVATED_SEEDS=${reactivated}`);
console.log(`OWNER_ALL_GAMES_DESIGN_RESET_PAUSED_NONCATALOG=${paused}`);
console.log(`OWNER_ALL_GAMES_DESIGN_RESET_IDS=${designGames.map(game=>game.id).join(',')}`);
