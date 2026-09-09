import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
export const DEFAULT_RESERVATION_LEASE_MS=90*60*1000;

export function normalizeQueueState(raw={}){
  return {
    version:2,
    attempts:Array.isArray(raw.attempts)?raw.attempts.filter(x=>x&&x.date&&x.gameId):[],
  };
}

export function attemptsForDate(state,date){
  return normalizeQueueState(state).attempts.filter(x=>x.date===date);
}

export function attemptedGameIds(state,date){
  return new Set(attemptsForDate(state,date).map(x=>x.gameId));
}

export function attemptCountForGameOnDate(state,date,gameId){
  return attemptsForDate(state,date).filter(x=>x.gameId===gameId).length;
}

export function activeReservations(state,{now=new Date(),isSourceReleased=()=>false}={}){
  const nowMs=new Date(now).getTime();
  return normalizeQueueState(state).attempts.filter(row=>{
    if(row.status!=='RESERVED')return false;
    const expires=Date.parse(String(row.leaseExpiresAt||''));
    if(!Number.isFinite(expires)||expires<=nowMs)return false;
    try{return !isSourceReleased(row);}catch{return true;}
  });
}

export function activeGameIds(state,options={}){
  return new Set(activeReservations(state,options).map(row=>row.gameId));
}

export function activeSourcePaths(state,options={}){
  return new Set(activeReservations(state,options).map(row=>String(row.sourcePath||'').trim()).filter(Boolean));
}

export function reserveQueueWork(state,{date,gameId,gameSlug=null,sourcePath=null,reason=null,runId=null,sourceCommit=null,now=new Date(),leaseMs=DEFAULT_RESERVATION_LEASE_MS}={}){
  if(!date||!gameId)throw new Error('date/gameId required');
  const normalized=normalizeQueueState(state);
  const cutoff=new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate()-30);
  const kept=normalized.attempts.filter(x=>{
    const d=new Date(`${x.date}T00:00:00Z`);
    return Number.isNaN(d.getTime())||d>=cutoff;
  });
  const floor=kept.filter(x=>x.date===date&&x.gameId===gameId).length+1;
  const reservedAt=new Date(now);
  kept.push({
    date,gameId,gameSlug,sourcePath,reason,runId:runId?String(runId):null,sourceCommit:sourceCommit||null,
    floor,
    status:'RESERVED',reservedAt:reservedAt.toISOString(),leaseExpiresAt:new Date(reservedAt.getTime()+leaseMs).toISOString(),
  });
  return {version:2,attempts:kept};
}

export function settleQueueWork(state,{runId=null,gameId=null,status='FAILED',now=new Date()}={}){
  const normalized=normalizeQueueState(state);
  const allowed=new Set(['FAILED','CANCELLED','RELEASED','SUPERSEDED']);
  const nextStatus=String(status||'').toUpperCase();
  if(!allowed.has(nextStatus))throw new Error(`unsupported queue settlement status: ${status}`);
  const id=runId==null?'':String(runId);
  let index=-1;
  for(let i=normalized.attempts.length-1;i>=0;i--){
    const row=normalized.attempts[i];
    if(row.status!=='RESERVED')continue;
    if(id&&String(row.runId||'')===id){index=i;break;}
    if(!id&&gameId&&row.gameId===gameId){index=i;break;}
  }
  if(index<0)return normalized;
  const attempts=[...normalized.attempts];
  attempts[index]={...attempts[index],status:nextStatus,settledAt:new Date(now).toISOString(),leaseExpiresAt:null};
  return {version:2,attempts};
}

function arg(name){return process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??null;}

function main(){
  const stateFile=arg('state')||'.autonomous/queue-state.json';
  const state=readJson(stateFile,{version:2,attempts:[]});
  const settleRunId=arg('settle-run-id');
  const settleGameId=arg('settle-game-id');
  if(settleRunId||settleGameId){
    const next=settleQueueWork(state,{runId:settleRunId,gameId:settleGameId,status:arg('status')||'FAILED'});
    writeJson(stateFile,next);
    console.log(JSON.stringify({stateFile,settledRunId:settleRunId,settledGameId:settleGameId,status:arg('status')||'FAILED'},null,2));
    return;
  }
  const next=reserveQueueWork(state,{
    date:arg('date'),gameId:arg('game-id'),gameSlug:arg('game-slug'),sourcePath:arg('source-path'),reason:arg('reason'),runId:arg('run-id'),sourceCommit:arg('source-commit'),
  });
  writeJson(stateFile,next);
  console.log(JSON.stringify({stateFile,date:arg('date'),gameId:arg('game-id'),attemptsToday:attemptsForDate(next,arg('date')).length,gameFloorsToday:attemptCountForGameOnDate(next,arg('date'),arg('game-id'))},null,2));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  try{main();}catch(error){console.error(error.message);process.exitCode=1;}
}
