// Owner-directed redesign reset intake for existing games. This feeds the existing DESIGN_ONLY pipeline; it is not a parallel production path.
import fs from 'node:fs';

export const OWNER_DESIGN_RESET_FILE='owner-design-reset-queue.json';
const clean=value=>String(value??'').trim();
const clone=value=>JSON.parse(JSON.stringify(value));
const normalizedIntent=value=>clean(value).toLowerCase().replace(/\s+/g,' ');

export function loadOwnerDesignResetQueue(file=OWNER_DESIGN_RESET_FILE){
  try{
    const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
    return parsed&&typeof parsed==='object'?parsed:{version:1,requests:[]};
  }catch{return {version:1,requests:[]};}
}

export function activeOwnerDesignResetRequests(file=OWNER_DESIGN_RESET_FILE){
  const queue=loadOwnerDesignResetQueue(file);
  return (queue.requests||[]).filter(request=>clean(request?.status).toUpperCase()==='ACTIVE'&&clean(request?.gameId)&&request?.seed);
}

export function ownerDesignResetRequestForGame(gameId,file=OWNER_DESIGN_RESET_FILE){
  const id=clean(gameId);
  const matches=activeOwnerDesignResetRequests(file).filter(request=>clean(request.gameId)===id);
  return matches.at(-1)||null;
}

export function ownerDesignResetSeedForGame(gameId,file=OWNER_DESIGN_RESET_FILE){
  const request=ownerDesignResetRequestForGame(gameId,file);
  if(!request)return null;
  const activeSameGame=activeOwnerDesignResetRequests(file).filter(row=>clean(row.gameId)===clean(gameId));
  const literal=clean(request.goal||request.request||request.instruction||request.seed?.OWNER_LITERAL_REQUEST);
  const sameIntentCount=literal
    ?activeSameGame.filter(row=>normalizedIntent(row.goal||row.request||row.instruction||row.seed?.OWNER_LITERAL_REQUEST)===normalizedIntent(literal)).length
    :1;
  const seed=clone(request.seed);
  seed.gameId=clean(request.gameId);
  seed.gameName=clean(request.gameName||seed.gameName||seed.gameId);
  seed.status='ACTIVE';
  seed.generation='OWNER_REDESIGN_RESET';
  seed.ownerResetRevision=clean(request.revision||seed.ownerResetRevision||'OWNER_RESET');
  seed.ownerRequestInstanceId=clean(request.requestId||request.revision||seed.ownerRequestInstanceId||seed.ownerResetRevision);
  seed.ownerLiteralRequest=literal||clean(seed.ownerLiteralRequest)||null;
  seed.ownerRepeatCount=Math.max(1,sameIntentCount);
  seed.ownerRepeatedRequestCreatesNewDesignRevision=true;
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
  const active=activeOwnerDesignResetRequests(file);
  const changed=[];
  const gameIds=[...new Set(active.map(request=>clean(request.gameId)).filter(Boolean))];
  for(const gameId of gameIds){
    const result=ensureOwnerDesignResetSeed(state,gameId,{file});
    if(result.changed)changed.push(gameId);
  }
  return {changed,activeCount:active.length};
}
