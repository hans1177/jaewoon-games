// Owner-directed redesign reset intake for existing games. This feeds the existing DESIGN_ONLY pipeline; it is not a parallel production path.
import fs from 'node:fs';
import path from 'node:path';
import {assertGameSeed} from './company-game-seed-contract.mjs';

export const OWNER_DESIGN_RESET_FILE='owner-design-reset-queue.json';
const clean=value=>String(value??'').trim();
const clone=value=>JSON.parse(JSON.stringify(value));

export function loadOwnerDesignResetQueue(file=OWNER_DESIGN_RESET_FILE){
  try{
    const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
    return parsed&&typeof parsed==='object'?parsed:{version:1,requests:[]};
  }catch{return {version:1,requests:[]};}
}

export function activeOwnerDesignResetRequests(file=OWNER_DESIGN_RESET_FILE){
  const queue=loadOwnerDesignResetQueue(file);
  return (queue.requests||[]).filter(request=>clean(request?.status).toUpperCase()==='ACTIVE'&&clean(request?.gameId)&&(request?.seed||clean(request?.designRequest?.instruction)));
}

export function ownerDesignResetRequestForGame(gameId,file=OWNER_DESIGN_RESET_FILE){
  const id=clean(gameId);
  return activeOwnerDesignResetRequests(file).find(request=>clean(request.gameId)===id)||null;
}

export function ownerDesignResetSeedForGame(gameId,file=OWNER_DESIGN_RESET_FILE){
  const request=ownerDesignResetRequestForGame(gameId,file);
  if(!request)return null;
  let seed;
  if(request.designRequest){
    const brief=request.designRequest;
    const game=clean(request.gameId);
    const baselineSource=clean(brief.baselineSource);
    if(baselineSource&&(!baselineSource.startsWith('design/'+game+'/')||!/^design\/[a-z0-9-]+\/\d{4}-\d{2}-\d{2}\/design-revised\.json$/.test(baselineSource)))throw new Error('OWNER_DESIGN_BASELINE_PATH_INVALID: '+game);
    const original=baselineSource?JSON.parse(fs.readFileSync(path.resolve(path.dirname(file),baselineSource),'utf8')):null;
    if(original?.gameId&&clean(original.gameId)!==game)throw new Error('OWNER_DESIGN_BASELINE_GAME_MISMATCH: '+game);
    const content=original?.content||original||{};
    const gameName=clean(request.gameName||original?.gameName||game);
    const platform=clean(brief.originalPlatform||'ROBLOX').toUpperCase();
    const platformProfile=content.platformProfiles?.[platform]||{};
    seed={
      version:3,seedId:'OWNER-DESIGN-'+game.toUpperCase(),
      gameId:game,gameName,
      designInputMode:'OWNER_BRIEF_AND_ORIGINAL_ONLY',
      OWNER_LATEST_DESIGN_REQUEST:clean(brief.instruction),
      DESIGN_BASELINE_SOURCE:baselineSource||null,
      GAME_CATEGORY:clean(original?.gameCategory||'CASUAL'),
      INITIAL_TARGET_PLATFORM:platform,
      INITIAL_PLAY_MODE:clean(content.multiplayerMode)||'PROJECT_DEFINED',
      MULTIPLAYER_DESIGN_MODE:clean(content.robloxBuildProfile?.playMode||content.multiplayerMode).toUpperCase(),
      CORE_FUN_TO_LEARN:[clean(content.coreFun)||clean(brief.instruction)],
      CORE_LOOP:Array.isArray(content.coreLoop)&&content.coreLoop.length?clone(content.coreLoop):['디자이너 AI가 사용자 요청에 맞는 핵심 루프를 설계한다.'],
      DISTINCT_IDENTITY:clean(content.identity)||clean(brief.instruction),
      REFERENCE_GAMES:[],
      REFERENCE_INPUTS:[{type:'ORIGINAL_MATERIAL',value:baselineSource||clean(brief.instruction)}],
      TARGET_AUDIENCE:clean(content.targetAudience)||'기존 원본과 사용자 요청의 대상 플레이어',
      TARGET_SESSION_DIRECTION:'기존 원본의 라운드·세션 규칙을 유지하며 디자이너가 첫 세션과 장기 깊이를 설계한다.',
      TARGET_SESSION_MINUTES:30,
      CROSS_PLATFORM_EXPANSION_VALUE:'ORIGINAL_PLATFORM_DESIGN_WITH_NATIVE_PLATFORM_ADAPTATION',
      MARKET_EVIDENCE_SUMMARY:{available:false,hardPassFailGate:false,role:'OWNER_REQUEST_AND_EXISTING_ORIGINAL'},
      REUSE_PRIOR_DESIGN_BASELINE:Boolean(original),
      REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION:Boolean(original),
      originalDesignContext:{source:baselineSource||null,version:original?.version||null,content:clone(content),platformProfile:clone(platformProfile)},
      UNITY_WEB_VALIDATION_SURFACE:{role:'VALIDATION_SURFACE_ONLY',canonicalSourceRoot:'unity-games/'+game,outputRoot:'web-games/'+game,sameCanonicalUnityProjectRequired:true,nativeReleaseGate:false,developmentAdmissionGate:false,legacyDirectWebAuthoring:false}
    };
    if(!['SINGLE','COOP','COMPETITIVE','HYBRID'].includes(seed.MULTIPLAYER_DESIGN_MODE))seed.MULTIPLAYER_DESIGN_MODE=platformProfile.multiplayerRequired===false?'SINGLE':'HYBRID';
    assertGameSeed(seed);
    seed.GAMEPLAY_SKETCH.source='OWNER_BRIEF_COMPATIBILITY_INPUT_NOT_AUTHORED_DESIGN';
  }else seed=clone(request.seed);
  seed.gameId=clean(request.gameId);
  seed.gameName=clean(request.gameName||seed.gameName||seed.gameId);
  seed.status='ACTIVE';
  seed.generation='OWNER_REDESIGN_RESET';
  seed.ownerResetRevision=clean(request.revision||seed.ownerResetRevision||'OWNER_RESET');
  seed.productionClass='DESIGN_ONLY';
  seed.productionClassSource='OWNER_REDESIGN_RESET_2026-09-13';
  seed.lifecycleState='DESIGN_ONLY';
  delete seed.promotion;
  delete seed.selectedPlatform;
  delete seed.targetPlatform;
  return seed;
}

export function ensureOwnerDesignResetSeed(state,gameId,{file=OWNER_DESIGN_RESET_FILE}={}){
  state.seeds ||= [];
  const reset=ownerDesignResetSeedForGame(gameId,file);
  if(!reset)return {seed:null,changed:false};
  const index=state.seeds.findIndex(seed=>clean(seed?.gameId)===clean(gameId));
  if(index<0){state.seeds.push(reset);return {seed:reset,changed:true};}
  const current=state.seeds[index];
  if(clean(current?.ownerResetRevision)===clean(reset.ownerResetRevision))return {seed:current,changed:false};
  state.seeds[index]=reset;
  return {seed:reset,changed:true};
}

export function materializeOwnerDesignResetSeeds(state,{file=OWNER_DESIGN_RESET_FILE}={}){
  const changed=[];
  for(const request of activeOwnerDesignResetRequests(file)){
    const result=ensureOwnerDesignResetSeed(state,request.gameId,{file});
    if(result.changed)changed.push(request.gameId);
  }
  return {changed,activeCount:activeOwnerDesignResetRequests(file).length};
}
