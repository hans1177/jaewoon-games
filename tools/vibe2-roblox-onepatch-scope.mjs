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
        'owner-onepatch-use-exact-unchanged-qa-evidence',
        'owner-onepatch-parent-task:'+queued.id,
        'owner-onepatch-parent-directive:'+String(queued.buildUpDirective?.directiveId||queued.buildUpDirectiveId||''),
        'owner-onepatch-parent-generation:'+Number(queued.buildUpGeneration||queued.buildUpDirective?.generation||0),
        'owner-onepatch-resume-mode:MERGED_CURRENT_QUEUED_BUILD_UP'])],
    };
    return {queue:{...queue,tasks:rows.map(row=>row.id===queued.id?combined:row)},
      taskId:queued.id,added:false,merged:true,resume:'QUEUED_BUILD_UP'};
  }
  // Running build-up input is immutable. In the existing DAG, wait only for an actual
  // source responsibility collision; unrelated owner edits start now, not at a future F stage.
  const running=rows.filter(item=>item.gameId===gameId&&String(item.target).toLowerCase()==='roblox'
    &&item.status==='running'&&(item.buildUpDirective?.directiveId||item.buildUpDirectiveId)
    &&item.sourceRoot===task.sourceRoot&&item.id!==task.id);
  const patchFiles=new Set(task.responsibleFiles||[]);
  const isShared=file=>file===task.sourceRoot+'/default.project.json'||file.startsWith(task.sourceRoot+'/shared/');
  const overlapping=running.filter(row=>{
    const active=row.responsibleFiles||[];
    return !active.length||!patchFiles.size||active.some(file=>patchFiles.has(file)||isShared(file))
      ||[...patchFiles].some(isShared);
  });
  const current=[...running].sort((a,b)=>
    Number(b.buildUpGeneration||b.buildUpDirective?.generation||0)
    -Number(a.buildUpGeneration||a.buildUpDirective?.generation||0))[0]||null;
  const updated={...task,
    dependencies:[...new Set([...(task.dependencies||[]),...overlapping.map(row=>row.id)])],
    // Reuse the canonical queue's existing build-up fields; extra fields are
    // intentionally not persisted by createVibeContinuousQueue.
    ...(current?{
      buildUpDirectiveId:String(current.buildUpDirective?.directiveId||current.buildUpDirectiveId||''),
      buildUpGeneration:Number(current.buildUpGeneration||current.buildUpDirective?.generation||0),
      buildUpStatus:'ONEPATCH_IN_CURRENT_BUILD_UP'
    }:{}),
    evidence:[...new Set([...(task.evidence||[]),
      ...(running.length?['owner-onepatch-resume-impacted-stage-not-f0','owner-onepatch-in-current-build-up']:[]),
      ...(current?[
        'owner-onepatch-parent-task:'+current.id,
        'owner-onepatch-parent-directive:'+String(current.buildUpDirective?.directiveId||current.buildUpDirectiveId||''),
        'owner-onepatch-parent-generation:'+Number(current.buildUpGeneration||current.buildUpDirective?.generation||0),
        'owner-onepatch-resume-mode:'+(overlapping.length?'WAIT_FOR_SOURCE_COLLISION':'IMMEDIATE_DISJOINT_SOURCE')
      ]:[]),
      ...(overlapping.length?['owner-onepatch-source-collision-serialized']
        :running.length?['owner-onepatch-disjoint-source-start-now']:[])])],
  };
  return {queue:{...queue,tasks:[...rows,updated]},taskId:task.id,added:true,merged:false,
    resume:overlapping.length?'RUNNING_BUILD_UP_SOURCE_COLLISION'
      :running.length?'RUNNING_BUILD_UP_DISJOINT_IMMEDIATE':'NEW_OWNER_PATCH'};
}
