// 파일명: tools/pwa-owner-stop.mjs
// 기존 인증된 PWA Command Bridge의 오너 개발중단 지시만 처리한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const REPOSITORY='hans1177/jaewoon-games';
const STOP_PREFIX='OWNER_STOP_GAME:';
const GAME_ID=/^[a-z0-9][a-z0-9-]{0,79}$/;
const TASK_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const args=Object.fromEntries(process.argv.slice(3).filter(a=>a.startsWith('--')&&a.includes('=')).map(a=>{const p=a.indexOf('=');return[a.slice(2,p),a.slice(p+1)];}));
const run=(...args)=>execFileSync('gh',args,{encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024}).trim();

export function parseOwnerStopTask(payload){
  const task=payload?.task??payload;
  if(!task||typeof task!=='object')return null;
  const body=String(task.body??''),id=String(task.game_id??'');
  if(!body.startsWith(STOP_PREFIX))return null;
  if(!TASK_ID.test(String(task.id??''))||!GAME_ID.test(id)||
    body!==STOP_PREFIX+id||task.kind!=='directive')throw Error('OWNER_STOP_TASK_IDENTITY_INVALID');
  return {taskId:task.id,gameId:id};
}
export function stopCatalog(catalog,id){
  if(!catalog||!Array.isArray(catalog.games)||!GAME_ID.test(id))throw Error('OWNER_STOP_CATALOG_INVALID');
  const target=catalog.games.find(game=>game?.id===id);
  if(!target)throw Error('OWNER_STOP_UNKNOWN_GAME:'+id);
  const removed=new Set(catalog.permanentRemovalPolicy?.ids||[]);
  if(removed.has(id))throw Error('OWNER_STOP_ALREADY_REMOVED:'+id);
  const ids=new Set(Array.isArray(catalog.ownerStoppedGameIds)?catalog.ownerStoppedGameIds:[]);
  ids.add(id);
  catalog.ownerStoppedGameIds=[...ids].sort();
  target.ownerDevelopmentStopped=true;
  target.lifecycleState='OWNER_STOPPED';
  return catalog;
}
function stopOnBranch(branch,id){
  if(!['company-runtime','main'].includes(branch))throw Error('OWNER_STOP_BRANCH_INVALID');
  for(let attempt=1;attempt<=5;attempt++){
    const remote=JSON.parse(run('api',`repos/${REPOSITORY}/contents/game-catalog.json?ref=${branch}`));
    if(!/^[a-f0-9]{40}$/.test(String(remote.sha??''))||typeof remote.content!=='string')
      throw Error('OWNER_STOP_REMOTE_CATALOG_INVALID:'+branch);
    const before=Buffer.from(remote.content.replace(/\s/g,''),'base64').toString('utf8');
    const original=JSON.parse(before);
    const wasStopped=Array.isArray(original.ownerStoppedGameIds)
      &&original.ownerStoppedGameIds.includes(id)
      &&original.games?.some(g=>g.id===id&&g.ownerDevelopmentStopped===true&&g.lifecycleState==='OWNER_STOPPED');
    const catalog=stopCatalog(original,id);
    if(wasStopped){
      console.log('OWNER_STOP_ALREADY_APPLIED='+branch+':'+id);return;
    }
    const content=Buffer.from(JSON.stringify(catalog,null,2)+'\n').toString('base64');
    const payload={message:`owner: stop automatic development for ${id} [skip ci]`,sha:remote.sha,branch,content};
    const file=path.join(os.tmpdir(),`owner-stop-${process.pid}-${branch}.json`);
    fs.writeFileSync(file,JSON.stringify(payload),{mode:0o600});
    try{
      run('api','-X','PUT',`repos/${REPOSITORY}/contents/game-catalog.json`,'--input',file);
      console.log('OWNER_STOP_CANONICAL_WRITE='+branch+':'+id);return;
    }catch(error){
      if(attempt===5)throw error;
      console.error('OWNER_STOP_CONFLICT_RETRY='+branch+':'+attempt);
    }finally{fs.rmSync(file,{force:true});}
  }
}
function main(){
  if(process.env.GITHUB_REPOSITORY!==REPOSITORY)throw Error('OWNER_STOP_REPOSITORY_DENIED');
  const task=JSON.parse(fs.readFileSync(args.task||'/tmp/pwa-next.json','utf8'));
  const request=parseOwnerStopTask(task);
  const mode=process.argv[2];
  if(mode==='classify'){
    if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,
      'owner_stop='+(request?'true':'false')+'\n'+(request?'game_id='+request.gameId+'\n':''));
    console.log('PWA_OWNER_STOP='+Boolean(request));return;
  }
  if(mode==='apply'){
    if(!request)throw Error('OWNER_STOP_NOT_REQUESTED');
    // 원본·세이브를 건드리지 않고 runtime 권한 원본과 main 표시본만 고정한다.
    stopOnBranch('company-runtime',request.gameId);
    stopOnBranch('main',request.gameId);
    console.log('OWNER_STOP_VERIFIED_BOTH_CATALOGS='+request.gameId);return;
  }
  throw Error('OWNER_STOP_MODE_UNKNOWN');
}
if(process.argv[1]&&process.argv[1].endsWith('pwa-owner-stop.mjs')){
  try{main();}catch(error){console.error(error?.message||String(error));process.exitCode=1;}
}
