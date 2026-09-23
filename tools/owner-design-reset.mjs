// Owner-directed redesign reset intake for existing games. This feeds the existing DESIGN_ONLY pipeline; it is not a parallel production path.
import fs from 'node:fs';

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
  return (queue.requests||[]).filter(request=>clean(request?.status).toUpperCase()==='ACTIVE'&&clean(request?.gameId)&&request?.seed);
}

export function ownerDesignResetRequestForGame(gameId,file=OWNER_DESIGN_RESET_FILE){
  const id=clean(gameId);
  const matches=activeOwnerDesignResetRequests(file).filter(request=>clean(request.gameId)===id);
  return matches.at(-1)||null;
}

function ownerDesignResetEventForGame(gameId,file=OWNER_DESIGN_RESET_FILE){
  const id=clean(gameId),queue=loadOwnerDesignResetQueue(file),rows=Array.isArray(queue.requests)?queue.requests:[];
  let match=null,index=-1,sequence=0,matchedSequence=0;
  for(let i=0;i<rows.length;i++){
    const request=rows[i];
    if(clean(request?.status).toUpperCase()!=='ACTIVE'||clean(request?.gameId)!==id||!request?.seed)continue;
    sequence+=1;
    match=request;index=i;matchedSequence=sequence;
  }
  if(!match)return null;
  const eventId=clean(match.requestInstanceId||match.requestId||match.requestedAt||match.updatedAt)||`${clean(match.revision)||'OWNER_RESET'}#${matchedSequence}`;
  return{request:match,index,eventId,sequence:matchedSequence};
}

export function ownerDesignResetSeedForGame(gameId,file=OWNER_DESIGN_RESET_FILE){
  const event=ownerDesignResetEventForGame(gameId,file);
  if(!event)return null;
  const request=event.request;
  const seed=clone(request.seed);
  seed.gameId=clean(request.gameId);
  seed.gameName=clean(request.gameName||seed.gameName||seed.gameId);
  seed.status='ACTIVE';
  seed.generation='OWNER_REDESIGN_RESET';
  seed.ownerResetRevision=clean(request.revision||seed.ownerResetRevision||'OWNER_RESET');
  seed.ownerRequestInstanceId=event.eventId;
  seed.ownerRequestSequence=event.sequence;
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
  if(clean(current?.ownerResetRevision)===clean(reset.ownerResetRevision)
    &&clean(current?.ownerRequestInstanceId)===clean(reset.ownerRequestInstanceId))return {seed:current,changed:false};
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
