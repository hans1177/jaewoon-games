import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {assertGameSeed} from './company-game-seed-contract.mjs';

export const CATALOG_FILE='game-catalog.json';
export const SEED_FILE='game-seed-state.json';
export const RESET_REVISION='OWNER-ALL-GAMES-DESIGN-RESET-20260917-1';
export const RESET_SOURCE='OWNER_ALL_GAMES_DESIGN_RESET_2026-09-17';
export const AUTO_MISSING_DESIGN_SOURCE='AUTO_MISSING_DESIGN_INTAKE_2026-09-25';
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
  const value=clean(game?.selectedPlatform||game?.preferredPlatform||game?.productionTarget||game?.canonical?.production?.selectedPlatform).toUpperCase();
  if(value.includes('ROBLOX'))return 'ROBLOX';
  if(value.includes('FORTNITE')||value.includes('UEFN'))return 'FORTNITE_UEFN';
  return 'UNITY';
}
function multiplayerModeFor(game){
  const value=[
    clean(game?.homepageInfo?.playMode),
    clean(game?.canonical?.homepage?.runtime?.playMode),
    ...(Array.isArray(game?.playModes)?game.playModes.map(clean):[])
  ].join(' ').toUpperCase();
  if(/COMPETITIVE|PVP|VERSUS/.test(value))return 'COMPETITIVE';
  if(/COOP|CO-OP|COOPERATIVE/.test(value))return 'COOP';
  if(/HYBRID|MULTI|ASYMMETRIC/.test(value)||game?.multiplayerSupported===true)return 'HYBRID';
  return 'SINGLE';
}
function resetSeedIdFor(gameId){return `OWNER-ALL-DESIGN-RESET-${clean(gameId).toUpperCase().replace(/[^A-Z0-9]+/g,'-')}-20260917`;}
function autoSeedIdFor(gameId,serial=1){
  const suffix=serial>1?`-R${serial}`:'';
  return `AUTO-MISSING-DESIGN-${clean(gameId).toUpperCase().replace(/[^A-Z0-9]+/g,'-')}${suffix}`;
}
function meaningfulDesign(record,gameId=''){
  if(!record||typeof record!=='object'||Array.isArray(record))return false;
  if(clean(record.gameId)&&clean(record.gameId)!==clean(gameId))return false;
  const content=record.content&&typeof record.content==='object'&&!Array.isArray(record.content)?record.content:record;
  return clean(content.identity).length>=8
    &&clean(content.coreFun).length>=8
    &&Array.isArray(content.coreLoop)&&content.coreLoop.filter(x=>clean(x)).length>=3;
}
export function latestUsableDesign(root='.',gameId=''){
  const base=path.join(root,'design',clean(gameId));
  if(!fs.existsSync(base))return null;
  const dates=fs.readdirSync(base,{withFileTypes:true}).filter(x=>x.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(x.name)).map(x=>x.name).sort().reverse();
  for(const date of dates){
    const file=path.join(base,date,'design-revised.json');
    const record=readJson(file,null);
    if(meaningfulDesign(record,gameId))return{date,file,record};
  }
  return null;
}
export function latestVerifiedDesign(root='.',gameId=''){
  const id=clean(gameId),base=path.join(root,'design',id);
  if(!id||!fs.existsSync(base))return null;
  const seedState=readJson(path.join(root,SEED_FILE),null);
  const reset=seedState?.ownerAllGamesDesignReset;
  const resetIds=new Set((Array.isArray(reset?.gameIds)?reset.gameIds:[]).map(clean).filter(Boolean));
  const resetAt=resetIds.has(id)?(Date.parse(reset?.updatedAt||'')||0):0;
  const resetDate=resetAt?new Date(resetAt).toISOString().slice(0,10):'';
  const dates=fs.readdirSync(base,{withFileTypes:true})
    .filter(x=>x.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(x.name))
    .map(x=>x.name).sort().reverse();
  for(const date of dates){
    const revisedFile=path.join(base,date,'design-revised.json');
    const cycleFile=path.join(base,date,'cycle-status.json');
    const reviewFile=path.join(base,date,'strict-design-review.json');
    const record=readJson(revisedFile,null),cycleStatus=readJson(cycleFile,null),strictReview=readJson(reviewFile,null);
    if(!meaningfulDesign(record,id)||!cycleStatus||!strictReview)continue;
    const gate=cycleStatus?.baselineGate;
    const score=Number(strictReview?.totalScore);
    const hardFailures=Array.isArray(strictReview?.hardFailures)?strictReview.hardFailures:[];
    if(gate?.state!=='DESIGN_BASELINE_READY'||gate?.ready!==true)continue;
    if(clean(strictReview?.verdict).toUpperCase()!=='PASS'||!Number.isFinite(score)||score<80||hardFailures.length)continue;
    const evidenceAt=Date.parse(strictReview?.reviewedAt||strictReview?.generatedAt||strictReview?.updatedAt||strictReview?.createdAt||gate?.checkedAt||'')||0;
    if(resetAt){
      if(evidenceAt&&evidenceAt<resetAt)continue;
      if(!evidenceAt&&date<=resetDate)continue;
    }
    return{
      date,file:revisedFile,record,
      cycleStatusFile:cycleFile,cycleStatus,
      strictReviewFile:reviewFile,strictReview,
      verified:true,strictScore:score,verifiedAt:evidenceAt?new Date(evidenceAt).toISOString():null,
      postResetFresh:resetAt?true:null
    };
  }
  return null;
}
function baseGameplaySketch(game,coreLoop,category){
  const description=clean(game?.description)||clean(game?.name)||clean(game?.id);
  return{
    version:1,
    source:'AUTO_MISSING_DESIGN_CATALOG_INTAKE',
    worldModel:`${description}의 핵심 행동과 목표가 실제 월드·시스템 상태 변화로 연결되는 플레이 공간`,
    actors:['플레이어: 목표를 읽고 실제 입력으로 핵심 행동을 수행','상대·위협·NPC·월드 엔티티: 플레이어 선택에 실제 상태 변화로 반응'],
    interactionChains:['대상 또는 공간 선택 -> 실제 입력 -> 대상/월드 상태 변화 -> 보상·위험·목표 변화'],
    stateMachine:['START_OR_WORLD_ENTRY','REAL_PLAYER_INPUT','CORE_GAMEPLAY_ACTION','OBSERVABLE_STATE_CHANGE','PROGRESSION_REWARD_OR_MEANINGFUL_CHOICE','RISK_FAILURE_OR_RESOURCE_PRESSURE','GOAL_OR_RETRY'],
    firstPlayableCycle:['월드 또는 세션 진입',coreLoop[0],coreLoop[1],'보상 또는 의미 있는 선택 적용','위험·실패·자원 압박 경험',coreLoop[2]],
    expansionPlan:['새 적·위협 또는 행동 패턴','새 공간·경로 또는 목표','새 상호작용 또는 전략 결과'],
    longGoalScenario:['초기 핵심 루프 완료','성장·보상으로 새 선택 개방','새 위협·공간·목표를 거쳐 중간 목표 달성'],
    validationRisks:['버튼·라벨·파일 크기만으로 구현 완료를 가장하지 않는다','반복·재시작·대기로 콘텐츠 분량을 채우지 않는다',`장르 ${category}의 핵심 선택이 실제 상태 변화로 이어지는지 검증한다`]
  };
}
export function makeAutoMissingDesignSeed(game,{serial=1,timestamp=new Date().toISOString()}={}){
  const gameId=clean(game?.id),gameName=clean(game?.name||gameId),description=clean(game?.description);
  if(!gameId)throw new Error('AUTO_MISSING_DESIGN_GAME_ID_REQUIRED');
  const category=categoryFor(game),platform=platformFor(game),mode=multiplayerModeFor(game);
  const genre=(Array.isArray(game?.genre)?game.genre.map(clean).filter(Boolean):[]);
  const coreLoop=[
    `${gameName}의 현재 상황과 목표를 읽고 장르 핵심 행동을 선택한다.`,
    '실제 입력과 상호작용 결과로 월드·대상·자원·위험·진행 상태가 변한다.',
    '변화된 상태와 보상 또는 실패를 바탕으로 다음 목표·지역·상호작용·전략 선택으로 이어간다.'
  ];
  const seed={
    version:2,
    seedId:autoSeedIdFor(gameId,serial),
    gameId,gameName,status:'ACTIVE',generation:'AUTO_MISSING_DESIGN_INTAKE',
    productionClass:'DESIGN_ONLY',productionClassSource:AUTO_MISSING_DESIGN_SOURCE,lifecycleState:'DESIGN_ONLY',
    GAME_CATEGORY:category,
    REFERENCE_GAMES:[],
    REFERENCE_INPUTS:[{type:'CANONICAL_GAME_CATALOG',value:[gameName,description,...genre].filter(Boolean).join(' | ')}],
    CORE_FUN_TO_LEARN:[
      `${gameName}의 실제 플레이 핵심 행동과 선택을 구체화`,
      '행동 결과가 진행·위험·보상과 연결되는 반복 가능한 게임 루프',
      '모바일에서도 즉시 이해되는 입력·피드백·실패·재도전 흐름'
    ],
    CORE_LOOP:coreLoop,
    DISTINCT_IDENTITY:description||`${gameName}의 장르 정체성과 실제 플레이 상태 변화를 중심으로 독자적인 게임 설계를 자동 생성한다.`,
    GAMEPLAY_SKETCH:baseGameplaySketch(game,coreLoop,category),
    MARKET_EVIDENCE_SUMMARY:{role:'AUTO_MISSING_DESIGN_INTAKE',targetMarketScope:'GLOBAL',hardPassFailGate:false,available:false,note:'Canonical catalog identity seeds the existing design pipeline; strict design review must establish the actual design before gameplay authority resumes.'},
    TARGET_AUDIENCE:genre.length?`${genre.join(' · ')} 플레이를 선호하는 글로벌 플레이어`:`${gameName}의 핵심 플레이를 선호하는 글로벌 플레이어`,
    TARGET_SESSION_DIRECTION:'첫 세션부터 입력, 핵심 행동, 실제 상태 변화, 보상 또는 진행, 위험 또는 실패, 다음 목표가 연결되도록 설계한다.',
    TARGET_SESSION_MINUTES:30,
    INITIAL_TARGET_PLATFORM:platform,
    INITIAL_PLAY_MODE:mode==='SINGLE'?'SINGLE_PLAYER':'MULTIPLAYER',
    MULTIPLAYER_DESIGN_MODE:mode,
    CROSS_PLATFORM_EXPANSION_VALUE:'REVIEW_IN_DESIGN_CYCLE',
    TRANSFORMATION_MODE:'ORIGINAL_COMPOSITION',
    SOURCE_CODE_RULE:'PRESERVE_EXISTING_IMPLEMENTATION_UNTIL_VERIFIED_DESIGN_GUIDES_CHANGE',
    REUSE_PRIOR_DESIGN_BASELINE:false,
    REUSE_PRIOR_ARTBOOK:false,
    LEGACY_BUILD_ROLE:'IMPLEMENTATION_REFERENCE_NOT_DESIGN_AUTHORITY',
    SAVE_POLICY:'PRESERVE_OR_MIGRATE_BEFORE_SEMANTIC_CHANGE',
    MOBILE_FIRST:true,
    autoMissingDesignIntake:true,
    createdAt:timestamp,updatedAt:timestamp
  };
  assertGameSeed(seed);
  return seed;
}
function resetSeed(game,existing={},timestamp=new Date().toISOString()){
  const gameId=clean(game.id),gameName=clean(game.name||game.id);
  const category=clean(existing.GAME_CATEGORY)||categoryFor(game);
  const platform=clean(existing.INITIAL_TARGET_PLATFORM||existing.selectedPlatform)||platformFor(game);
  return {
    ...existing,
    version:Math.max(2,Number(existing.version)||0),
    seedId:clean(existing.seedId)||resetSeedIdFor(gameId),
    gameId,gameName,status:'ACTIVE',generation:'OWNER_ALL_GAMES_DESIGN_RESET',ownerResetRevision:RESET_REVISION,
    GAME_CATEGORY:category,
    REFERENCE_GAMES:Array.isArray(existing.REFERENCE_GAMES)?existing.REFERENCE_GAMES:[],
    CORE_FUN_TO_LEARN:Array.isArray(existing.CORE_FUN_TO_LEARN)&&existing.CORE_FUN_TO_LEARN.length?existing.CORE_FUN_TO_LEARN:[`${gameName}의 핵심 재미를 실제 플레이 선택으로 재정의`,'진행·위험·보상이 서로 연결되는 반복 가능한 핵심 루프','모바일에서도 즉시 이해되는 입력과 피드백'],
    CORE_LOOP:Array.isArray(existing.CORE_LOOP)&&existing.CORE_LOOP.length>=3?existing.CORE_LOOP:['현재 상황과 목표를 읽고 의미 있는 다음 행동을 선택한다.','행동 결과로 게임 상태·자원·위험·진행도가 실제로 변한다.','변화된 상태를 바탕으로 새로운 목표와 선택을 갱신하며 다음 사이클로 이어간다.'],
    DISTINCT_IDENTITY:clean(existing.DISTINCT_IDENTITY)||`${gameName}을 기존 구현의 점수나 관문을 승계하지 않고 설계 단계부터 다시 검토해 고유한 핵심 재미와 시스템 연결을 확정한다.`,
    MARKET_EVIDENCE_SUMMARY:existing.MARKET_EVIDENCE_SUMMARY||{role:'DESIGN_REEVALUATION',targetMarketScope:'GLOBAL',hardPassFailGate:false,available:false,note:'Owner ordered all current catalog games back to design. Existing builds are preserved as reference only until a new design passes the canonical gates.'},
    TARGET_AUDIENCE:clean(existing.TARGET_AUDIENCE)||`${gameName}의 핵심 장르 플레이를 선호하는 글로벌 플레이어`,
    TARGET_SESSION_DIRECTION:clean(existing.TARGET_SESSION_DIRECTION)||'첫 세션부터 입력, 핵심 행동, 상태 변화, 보상 또는 진행, 위험 또는 실패, 다음 목표가 연결되도록 다시 설계한다.',
    INITIAL_TARGET_PLATFORM:platform,INITIAL_PLAY_MODE:clean(existing.INITIAL_PLAY_MODE)||'SINGLE_PLAYER',CROSS_PLATFORM_EXPANSION_VALUE:clean(existing.CROSS_PLATFORM_EXPANSION_VALUE)||'REVIEW_IN_DESIGN_CYCLE',
    TRANSFORMATION_MODE:'DESIGN_REEVALUATION_FROM_BASELINE_ZERO',SOURCE_CODE_RULE:'PRESERVE_EXISTING_BUILD_UNTIL_NEW_DESIGN_PASSES',OWNER_REBUILD_MODE:'DESIGN_FROM_START',
    REUSE_PRIOR_DESIGN_BASELINE:false,REUSE_PRIOR_ARTBOOK:false,REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION:false,LEGACY_BUILD_ROLE:'PUBLIC_ROLLBACK_REFERENCE_ONLY',
    PUBLIC_ROUTE_POLICY:'KEEP_EXISTING_WEB_PATH',PUBLIC_SWAP_POLICY:'REPLACE_ONLY_AFTER_FULL_QA_PASS',SAVE_POLICY:'PRESERVE_OR_MIGRATE_BEFORE_SWAP',MOBILE_FIRST:true,
    productionClass:'DESIGN_ONLY',productionClassSource:RESET_SOURCE,lifecycleState:'ACTIVE',updatedAt:timestamp
  };
}
export function autoEnrollMissingDesignSeeds({catalogFile=CATALOG_FILE,seedFile=SEED_FILE,root='.',gameId='',timestamp=new Date().toISOString()}={}){
  const catalog=readJson(path.join(root,catalogFile),{games:[],permanentRemovalPolicy:{ids:[]}});
  const state=readJson(path.join(root,seedFile),{version:2,policyDocument:'company-learning/platform-release-roadmap.json',seeds:[]});
  state.seeds=Array.isArray(state.seeds)?state.seeds:[];
  const removed=new Set((catalog?.permanentRemovalPolicy?.ids||[]).map(clean).filter(Boolean));
  const targetId=clean(gameId);
  const games=(catalog.games||[]).filter(game=>{
    const id=clean(game?.id),life=clean(game?.lifecycleState||game?.canonical?.lifecycle?.state||'ACTIVE').toUpperCase();
    return id&&!removed.has(id)&&['ACTIVE','REBUILD'].includes(life)&&(!targetId||id===targetId);
  });
  const created=[],reactivated=[],alreadySeeded=[],designPresent=[];
  for(const game of games){
    const id=clean(game.id);
    if(latestUsableDesign(root,id)){designPresent.push(id);continue;}
    const candidates=state.seeds.filter(seed=>clean(seed?.gameId)===id);
    const active=candidates.find(seed=>!['DISCARDED','REMOVED'].includes(clean(seed?.status).toUpperCase()));
    if(active){
      if(clean(active.status).toUpperCase()!=='ACTIVE'){
        active.status='ACTIVE';active.reactivatedBy=AUTO_MISSING_DESIGN_SOURCE;active.updatedAt=timestamp;reactivated.push(id);
      }else alreadySeeded.push(id);
      continue;
    }
    const seed=makeAutoMissingDesignSeed(game,{serial:candidates.length+1,timestamp});
    state.seeds.push(seed);created.push(id);
  }
  if(created.length||reactivated.length){
    state.version=Math.max(2,Number(state.version)||0);
    state.policyDocument='company-learning/platform-release-roadmap.json';
    state.autoMissingDesignIntake={version:1,source:AUTO_MISSING_DESIGN_SOURCE,updatedAt:timestamp,createdGameIds:created,reactivatedGameIds:reactivated};
    writeJson(path.join(root,seedFile),state);
  }
  return{created,reactivated,alreadySeeded,designPresent,eligibleGames:games.map(game=>clean(game.id)),changed:created.length+reactivated.length};
}
export function runOwnerAllGamesDesignReset({catalogFile=CATALOG_FILE,seedFile=SEED_FILE,root='.',timestamp=new Date().toISOString()}={}){
  const catalog=readJson(path.join(root,catalogFile),{games:[]});
  const designGames=(catalog.games||[]).filter(game=>clean(game.productionClass)==='DESIGN_ONLY');
  if(!designGames.length)throw new Error('NO_DESIGN_ONLY_GAMES_IN_CATALOG');
  const state=readJson(path.join(root,seedFile),{version:2,policyDocument:'company-learning/platform-release-roadmap.json',seeds:[]});
  state.seeds=Array.isArray(state.seeds)?state.seeds:[];
  const catalogIds=new Set(designGames.map(game=>clean(game.id)).filter(Boolean));
  const existingByGame=new Map();
  for(const seed of state.seeds){const id=clean(seed?.gameId);if(id&&!existingByGame.has(id))existingByGame.set(id,seed);}
  let created=0,reactivated=0,paused=0;
  for(const game of designGames){
    const id=clean(game.id),existing=existingByGame.get(id),next=resetSeed(game,existing||{},timestamp);
    if(existing){if(clean(existing.status).toUpperCase()!=='ACTIVE')reactivated++;Object.keys(existing).forEach(key=>delete existing[key]);Object.assign(existing,next);}
    else{state.seeds.push(next);existingByGame.set(id,next);created++;}
  }
  for(const seed of state.seeds){
    const id=clean(seed?.gameId);if(!id||catalogIds.has(id))continue;
    if(clean(seed.status).toUpperCase()==='ACTIVE'){seed.status='PAUSED';seed.pausedReason='NOT_IN_CANONICAL_GAME_CATALOG';seed.pausedAt=timestamp;paused++;}
  }
  state.version=Math.max(2,Number(state.version)||0);
  state.policyDocument='company-learning/platform-release-roadmap.json';
  state.ownerAllGamesDesignReset={revision:RESET_REVISION,source:RESET_SOURCE,gameCount:designGames.length,gameIds:designGames.map(game=>game.id),updatedAt:timestamp};
  writeJson(path.join(root,seedFile),state);
  return{count:designGames.length,created,reactivated,paused,gameIds:designGames.map(game=>game.id)};
}
function arg(name){
  const prefix=`--${name}=`;
  const row=process.argv.find(v=>v.startsWith(prefix));
  return row?row.slice(prefix.length):'';
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  if(process.argv.includes('--auto-missing-design-intake')){
    const result=autoEnrollMissingDesignSeeds({gameId:arg('game-id')});
    console.log(`AUTO_MISSING_DESIGN_ELIGIBLE=${result.eligibleGames.length}`);
    console.log(`AUTO_MISSING_DESIGN_CREATED=${result.created.length}`);
    console.log(`AUTO_MISSING_DESIGN_REACTIVATED=${result.reactivated.length}`);
    console.log(`AUTO_MISSING_DESIGN_ALREADY_SEEDED=${result.alreadySeeded.length}`);
    console.log(`AUTO_MISSING_DESIGN_PRESENT=${result.designPresent.length}`);
    console.log(`AUTO_MISSING_DESIGN_CREATED_IDS=${result.created.join(',')||'NONE'}`);
  }else{
    const result=runOwnerAllGamesDesignReset();
    console.log(`OWNER_ALL_GAMES_DESIGN_RESET_COUNT=${result.count}`);
    console.log(`OWNER_ALL_GAMES_DESIGN_RESET_CREATED_SEEDS=${result.created}`);
    console.log(`OWNER_ALL_GAMES_DESIGN_RESET_REACTIVATED_SEEDS=${result.reactivated}`);
    console.log(`OWNER_ALL_GAMES_DESIGN_RESET_PAUSED_NONCATALOG=${result.paused}`);
    console.log(`OWNER_ALL_GAMES_DESIGN_RESET_IDS=${result.gameIds.join(',')}`);
  }
}
