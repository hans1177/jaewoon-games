// 파일명: tools/vibe2-roblox-onepatch-scope.mjs
// Owner Roblox onepatch: unlimited in-game responsibility, immutable source-boundary security.
// No second queue, no F0/F9 bypass, and no cross-organization source mutations.
import fs from 'node:fs';
import path from 'node:path';

const posix=value=>String(value??'').trim().replaceAll('\\','/').replace(/^\.\//,'');
const writable=/^(?:client|server|shared|assets)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.(?:luau|lua|json|toml|svg|rbxmx|rbxm|glb|gltf|fbx|obj|mtl|png|webp)$|^default\.project\.json$/i;
// '*' expands authorable text/runtime connections; native binary imports require
// the existing engine-editor route rather than sending binary bytes to a text model.
const automaticText=/\.(?:luau|lua|json|toml|svg)$/i;
function fail(reason){throw new Error('ROBLOX_ONEPATCH_'+reason);}
function assertGameRoot(repoRoot,sourceRoot){
  const repo=fs.realpathSync(repoRoot);
  const roblox=fs.realpathSync(path.join(repo,'roblox-games'));
  const game=fs.realpathSync(path.join(repo,sourceRoot));
  if(!roblox.startsWith(repo+path.sep)||!game.startsWith(roblox+path.sep))
    fail('SOURCE_ESCAPE_OR_MISSING');
  return {repo,game};
}
function normalizeInput(file){
  if(Array.isArray(file)){
    if(file.some(item=>typeof item!=='string'))fail('INVALID_FILE_LIST');
    return file.flatMap(item=>item.split(/[;,\n]+/).map(posix).filter(Boolean));
  }
  if(typeof file!=='string')fail('INVALID_FILE_LIST');
  return file.split(/[;,\n]+/).map(posix).filter(Boolean);
}
export function resolveOwnerRobloxOnePatchFiles({repoRoot=process.cwd(),sourceRoot='',file}={}){
  const {repo,game}=assertGameRoot(repoRoot,sourceRoot);
  const entries=normalizeInput(file);
  if(!entries.length)fail('FILES_REQUIRED');
  const accepted=new Set();
  function include(relative){
    if(!writable.test(relative)||relative.split('/').includes('..')||relative.includes('\\')||relative.startsWith('/'))
      fail('NON_ROBLOX_SOURCE_FORBIDDEN');
    const full=path.resolve(game,relative);
    if(!full.startsWith(game+path.sep))fail('SOURCE_ESCAPE_OR_MISSING');
    let actual;
    try{actual=fs.realpathSync(full);}catch{fail('SOURCE_ESCAPE_OR_MISSING');}
    if(!actual.startsWith(game+path.sep)||!fs.statSync(actual).isFile())
      fail('SOURCE_ESCAPE_OR_MISSING');
    accepted.add(posix(sourceRoot)+'/'+relative);
  }
  function discover(folder){
    for(const item of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(item.isSymbolicLink())continue;
      const full=path.join(folder,item.name);
      if(item.isDirectory()){discover(full);continue;}
      if(!item.isFile())continue;
      const relative=path.relative(game,full).replaceAll(path.sep,'/');
      if(writable.test(relative)&&automaticText.test(relative))include(relative);
    }
  }
  for(const raw of entries){
    if(raw==='*'||raw.toLowerCase()==='all'){discover(game);continue;}
    const relative=raw.startsWith(sourceRoot+'/')?raw.slice(sourceRoot.length+1):raw;
    include(relative);
  }
  if(!accepted.size)fail('NO_ELIGIBLE_GAME_SOURCE_FILES');
  return [...accepted].sort();
}
export function mergeOwnerRobloxPatchIntoExistingBuildUp({queue,gameId,task,requestId}={}){
  const rows=Array.isArray(queue?.tasks)?queue.tasks:[];
  // A queued build-up has not been handed to a worker and can absorb the owner's
  // scope without losing its F-step/directory fingerprint or its prior verified evidence.
  const queued=rows.find(item=>item.gameId===gameId&&String(item.target).toLowerCase()==='roblox'
    &&item.status==='queued'&&item.ownerDevelopmentHold!==true
    &&item.protectedChange!==true&&item.paidResourceRequired!==true
    &&(item.buildUpDirective?.directiveId||item.buildUpDirectiveId)
    &&item.sourceRoot===task.sourceRoot);
  if(queued){
    const suffix='\n[OWNER_ROBLOX_ONEPATCH_MERGED]\n'+task.goal;
    const combined={
      ...queued,ownerDirective:true,priority:'owner-immediate',
      goal:queued.goal.includes('owner-request-instance:'+requestId)?queued.goal:queued.goal+suffix,
      responsibleFiles:[...new Set([...(queued.responsibleFiles||[]),...task.responsibleFiles])],
      evidence:[...new Set([...(queued.evidence||[]),...task.evidence,
        'owner-onepatch-merged-active-build-up','owner-onepatch-resume-impacted-stage-not-f0',
        'owner-onepatch-use-exact-unchanged-qa-evidence'])],
    };
    return {queue:{...queue,tasks:rows.map(row=>row.id===queued.id?combined:row)},
      taskId:queued.id,added:false,merged:true,resume:'QUEUED_BUILD_UP'};
  }
  // Never overwrite a running worker's immutable input. The existing DAG serializes
  // overlapping source work and the new patch starts at the affected stage, not by
  // resetting any existing F0-F9 results.
  const running=rows.filter(item=>item.gameId===gameId&&String(item.target).toLowerCase()==='roblox'
    &&item.status==='running'&&(item.buildUpDirective?.directiveId||item.buildUpDirectiveId)
    &&item.sourceRoot===task.sourceRoot&&item.id!==task.id);
  const updated={...task,
    dependencies:[...new Set([...(task.dependencies||[]),...running.map(row=>row.id)])],
    evidence:[...task.evidence,
      ...(running.length?['owner-onepatch-follows-running-build-up','owner-onepatch-resume-impacted-stage-not-f0']:[])],
  };
  return {queue:{...queue,tasks:[...rows,updated]},taskId:task.id,added:true,merged:false,
    resume:running.length?'RUNNING_BUILD_UP_FOLLOW_UP':'NEW_OWNER_PATCH'};
}
