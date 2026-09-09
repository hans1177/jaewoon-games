import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};

export function normalizeQueueState(raw={}){
  return {
    version:1,
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

export function reserveQueueWork(state,{date,gameId,gameSlug=null,sourcePath=null,reason=null,runId=null,sourceCommit=null,now=new Date()}={}){
  if(!date||!gameId)throw new Error('date/gameId required');
  const normalized=normalizeQueueState(state);
  const cutoff=new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate()-30);
  const kept=normalized.attempts.filter(x=>{
    const d=new Date(`${x.date}T00:00:00Z`);
    return Number.isNaN(d.getTime())||d>=cutoff;
  });
  const floor=kept.filter(x=>x.date===date&&x.gameId===gameId).length+1;
  kept.push({
    date,gameId,gameSlug,sourcePath,reason,runId:runId?String(runId):null,sourceCommit:sourceCommit||null,
    floor,
    status:'RESERVED',reservedAt:new Date(now).toISOString(),
  });
  return {version:1,attempts:kept};
}

function arg(name){return process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??null;}

function main(){
  const stateFile=arg('state')||'.autonomous/queue-state.json';
  const state=readJson(stateFile,{version:1,attempts:[]});
  const next=reserveQueueWork(state,{
    date:arg('date'),gameId:arg('game-id'),gameSlug:arg('game-slug'),sourcePath:arg('source-path'),reason:arg('reason'),runId:arg('run-id'),sourceCommit:arg('source-commit'),
  });
  writeJson(stateFile,next);
  console.log(JSON.stringify({stateFile,date:arg('date'),gameId:arg('game-id'),attemptsToday:attemptsForDate(next,arg('date')).length,gameFloorsToday:attemptCountForGameOnDate(next,arg('date'),arg('game-id'))},null,2));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  try{main();}catch(error){console.error(error.message);process.exitCode=1;}
}
