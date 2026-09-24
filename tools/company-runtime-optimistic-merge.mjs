import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').trim();
const arg=(name,fallback='')=>process.argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clone=v=>v===undefined?undefined:structuredClone(v);

export function mergeRuntimeQueueDelta({base={},updated={},current={}}={}){
  const out=structuredClone(current);
  const baseById=new Map((base.items||[]).map(item=>[clean(item?.gameId),item]));
  const updatedById=new Map((updated.items||[]).map(item=>[clean(item?.gameId),item]));
  const currentById=new Map((out.items||[]).map(item=>[clean(item?.gameId),item]));
  const changedGameIds=[];
  const conflicts=[];

  for(const [gameId,updatedItem] of updatedById){
    if(!gameId)continue;
    const baseItem=baseById.get(gameId);
    if(!baseItem||same(baseItem,updatedItem))continue;
    const currentItem=currentById.get(gameId);
    if(!currentItem){
      conflicts.push({gameId,field:'__item__',reason:'CURRENT_ITEM_MISSING'});
      continue;
    }
    const keys=new Set([...Object.keys(baseItem),...Object.keys(updatedItem)]);
    let changed=false;
    for(const key of keys){
      const before=baseItem[key];
      const next=updatedItem[key];
      if(same(before,next))continue;
      const now=currentItem[key];
      if(!same(now,before)&&!same(now,next)){
        conflicts.push({gameId,field:key,reason:'CONCURRENT_FIELD_CHANGE'});
        continue;
      }
      if(next===undefined)delete currentItem[key];
      else currentItem[key]=clone(next);
      changed=true;
    }
    if(changed)changedGameIds.push(gameId);
  }

  if(conflicts.length)return {pass:false,queue:out,changedGameIds,conflicts};
  const updatedAt=clean(updated.updatedAt);
  const currentAt=clean(out.updatedAt);
  if(updatedAt&&(!currentAt||updatedAt>currentAt))out.updatedAt=updatedAt;
  return {pass:true,queue:out,changedGameIds,conflicts:[]};
}

function runCli(){
  const baseFile=arg('base');
  const updatedFile=arg('updated');
  const currentFile=arg('current');
  const outputFile=arg('output',currentFile);
  if(!baseFile||!updatedFile||!currentFile||!outputFile)throw new Error('required: --base --updated --current --output');
  const base=JSON.parse(fs.readFileSync(baseFile,'utf8'));
  const updated=JSON.parse(fs.readFileSync(updatedFile,'utf8'));
  const current=JSON.parse(fs.readFileSync(currentFile,'utf8'));
  const result=mergeRuntimeQueueDelta({base,updated,current});
  if(!result.pass){
    console.error('COMPANY_RUNTIME_OPTIMISTIC_MERGE=CONFLICT');
    console.error('COMPANY_RUNTIME_OPTIMISTIC_MERGE_CONFLICTS='+JSON.stringify(result.conflicts));
    process.exitCode=2;
    return;
  }
  fs.writeFileSync(outputFile,JSON.stringify(result.queue,null,2)+'\n');
  console.log('COMPANY_RUNTIME_OPTIMISTIC_MERGE=PASS');
  console.log('COMPANY_RUNTIME_OPTIMISTIC_MERGE_GAMES='+(result.changedGameIds.join(',')||'NONE'));
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href)runCli();
