// Authenticated PWA owner requests only. The existing bridge provides OIDC and device auth.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const REPOSITORY='hans1177/jaewoon-games';
const GAME_ID=/^[a-z0-9][a-z0-9-]{0,79}$/;
const TASK_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROOTS=['web-games','roblox-games','unity-games'];
const argv=Object.fromEntries(process.argv.slice(3).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const i=x.indexOf('=');return[x.slice(2,i),x.slice(i+1)];}));
const run=(...args)=>execFileSync('gh',args,{encoding:'utf8',timeout:40000,maxBuffer:24*1024*1024}).trim();
const api=(endpoint)=>JSON.parse(run('api','repos/'+REPOSITORY+'/'+endpoint));
const writePayload=(payload)=>{const name=path.join(os.tmpdir(),'jaewoon-owner-delete-'+process.pid+'-'+Math.random().toString(36).slice(2)+'.json');fs.writeFileSync(name,JSON.stringify(payload),{mode:0o600});return name;};
function apiWrite(method,endpoint,payload){
  const file=writePayload(payload);
  try{return JSON.parse(run('api','-X',method,'repos/'+REPOSITORY+'/'+endpoint,'--input',file));}
  finally{fs.rmSync(file,{force:true});}
}
export function parseOwnerStopTask(payload){
  const task=payload?.task??payload;
  if(!task||typeof task!=='object')return null;
  const body=String(task.body??''),id=String(task.game_id??'');
  const mode=body.startsWith('OWNER_DELETE_GAME:')?'delete':body.startsWith('OWNER_STOP_GAME:')?'stop':null;
  if(!mode)return null;
  if(!TASK_ID.test(String(task.id??''))||!GAME_ID.test(id)||
    body!=='OWNER_'+(mode==='delete'?'DELETE':'STOP')+'_GAME:'+id||task.kind!=='directive')
    throw Error('OWNER_MANAGEMENT_TASK_IDENTITY_INVALID');
  return {taskId:task.id,gameId:id,mode};
}
export function stopCatalog(catalog,id){
  if(!catalog||!Array.isArray(catalog.games)||!GAME_ID.test(id))throw Error('OWNER_STOP_CATALOG_INVALID');
  const target=catalog.games.find(game=>game?.id===id);
  if(!target)throw Error('OWNER_STOP_UNKNOWN_GAME:'+id);
  if((catalog.permanentRemovalPolicy?.ids||[]).includes(id))throw Error('OWNER_STOP_ALREADY_REMOVED:'+id);
  const ids=new Set(Array.isArray(catalog.ownerStoppedGameIds)?catalog.ownerStoppedGameIds:[]);
  ids.add(id);
  catalog.ownerStoppedGameIds=[...ids].sort();
  target.ownerDevelopmentStopped=true;
  target.lifecycleState='OWNER_STOPPED';
  return catalog;
}
export function permanentlyDeleteCatalog(catalog,id){
  if(!catalog||!Array.isArray(catalog.games)||!GAME_ID.test(id))throw Error('OWNER_DELETE_CATALOG_INVALID');
  const policy=catalog.permanentRemovalPolicy;
  if(!policy||!Array.isArray(policy.ids)||policy.reentryAllowed!==false)throw Error('OWNER_DELETE_POLICY_INVALID');
  if(!catalog.games.some(g=>g?.id===id)&&!policy.ids.includes(id))throw Error('OWNER_DELETE_UNKNOWN_GAME:'+id);
  policy.ids=[...new Set([...policy.ids,id])].sort();
  policy.reentryAllowed=false;
  policy.automaticRecoveryAllowed=false;
  policy.automaticMaintenanceAllowed=false;
  policy.sourceDeletionRequired=true;
  catalog.games=catalog.games.filter(game=>game.id!==id);
  catalog.ownerStoppedGameIds=(Array.isArray(catalog.ownerStoppedGameIds)?catalog.ownerStoppedGameIds:[]).filter(v=>v!==id);
  return catalog;
}
function loadCatalog(branch){
  const item=api('contents/game-catalog.json?ref='+branch);
  if(!/^[a-f0-9]{40}$/.test(String(item.sha||''))||typeof item.content!=='string')throw Error('OWNER_CATALOG_READ_INVALID:'+branch);
  const text=Buffer.from(item.content.replace(/\s/g,''),'base64').toString('utf8');
  return {sha:item.sha,catalog:JSON.parse(text)};
}
function applyRuntime(id,mode){
  for(let i=0;i<6;i++){
    const {sha,catalog}=loadCatalog('company-runtime');
    const updated=mode==='delete'?permanentlyDeleteCatalog(catalog,id):stopCatalog(catalog,id);
    const content=Buffer.from(JSON.stringify(updated,null,2)+'\n','utf8').toString('base64');
    try{
      apiWrite('PUT','contents/game-catalog.json',{branch:'company-runtime',sha,content,
        message:'owner: '+mode+' game '+id+' from canonical runtime [skip ci]'});
      console.log('OWNER_RUNTIME_CATALOG_'+mode.toUpperCase()+'='+id);
      return;
    }catch(error){if(i===5)throw error;console.error('OWNER_RUNTIME_CATALOG_RETRY='+(i+1));}
  }
}
function mainDeletionEntries(baseTree,id){
  const root=api('git/trees/'+baseTree);
  if(!Array.isArray(root.tree)||root.truncated)throw Error('OWNER_MAIN_TREE_INVALID');
  const entries=[];
  for(const parent of ROOTS){
    const tree=root.tree.find(e=>e.path===parent&&e.type==='tree');
    if(!tree)continue;
    const subtree=api('git/trees/'+tree.sha);
    if(subtree.truncated||!Array.isArray(subtree.tree))throw Error('OWNER_SOURCE_TREE_TRUNCATED:'+parent);
    if(subtree.tree.some(e=>e.path===id&&e.type==='tree'))
      entries.push({path:parent+'/'+id,mode:'040000',type:'tree',sha:null});
  }
  // Only game-exclusive covers; shared asset libraries and unrelated games are protected.
  const assets=root.tree.find(e=>e.path==='assets'&&e.type==='tree');
  if(assets){
    const assetTree=api('git/trees/'+assets.sha);
    if(assetTree.truncated)throw Error('OWNER_ASSET_TREE_TRUNCATED');
    const ownTitle='title-'+id+'.svg';
    if(assetTree.tree.some(e=>e.path===ownTitle&&e.type==='blob'))
      entries.push({path:'assets/'+ownTitle,mode:'100644',type:'blob',sha:null});
    const covers=assetTree.tree.find(e=>e.path==='homepage-covers'&&e.type==='tree');
    if(covers){
      const tree=api('git/trees/'+covers.sha);
      if(tree.truncated)throw Error('OWNER_COVERS_TREE_TRUNCATED');
      for(const basename of [id+'.webp',id+'-480.webp',id+'.png',id+'.svg']){
        if(tree.tree.some(e=>e.path===basename&&e.type==='blob'))
          entries.push({path:'assets/homepage-covers/'+basename,mode:'100644',type:'blob',sha:null});
      }
    }
  }
  return entries;
}
function applyMain(id,mode){
  for(let i=0;i<6;i++){
    const head=api('commits/main');
    const sha=String(head.sha||''),tree=String(head.commit?.tree?.sha||'');
    if(!/^[a-f0-9]{40}$/.test(sha)||!/^[a-f0-9]{40}$/.test(tree))throw Error('OWNER_MAIN_SHA_INVALID');
    const {catalog}=loadCatalog('main');
    if(mode==='delete')permanentlyDeleteCatalog(catalog,id);
    else if(!catalog.games?.some(game=>game.id===id)&&catalog.ownerStoppedGameIds?.includes(id)){
      console.log('OWNER_MAIN_ALREADY_STOPPED='+id);return;
    }else stopCatalog(catalog,id);
    const changes=mode==='delete'?mainDeletionEntries(tree,id):[];
    if(mode==='delete'){
      const extra=changes.filter(row=>row.path.startsWith('assets/')).map(row=>row.path);
      const remove=catalog.permanentRemovalPolicy;
      remove.removedAssetFiles=[...new Set([...(remove.removedAssetFiles||[]),...extra])].sort();
      if(!catalog.permanentRemovalPolicy.ids.includes(id))throw Error('OWNER_DELETE_TOMBSTONE_MISSING');
    }
    const body=JSON.stringify(catalog,null,2)+'\n';
    const delta=[{path:'game-catalog.json',mode:'100644',type:'blob',content:body},...changes];
    const nextTree=apiWrite('POST','git/trees',{base_tree:tree,tree:delta});
    if(!/^[a-f0-9]{40}$/.test(String(nextTree.sha||'')))throw Error('OWNER_DELETE_TREE_CREATE_FAILED');
    const commit=apiWrite('POST','git/commits',{message:'owner: '+mode+' game '+id+' (canonical catalog and owned sources)',tree:nextTree.sha,parents:[sha]});
    if(!/^[a-f0-9]{40}$/.test(String(commit.sha||'')))throw Error('OWNER_DELETE_COMMIT_CREATE_FAILED');
    try{
      apiWrite('PATCH','git/refs/heads/main',{sha:commit.sha,force:false});
      console.log('OWNER_MAIN_'+mode.toUpperCase()+'_COMMIT='+commit.sha);
      console.log('OWNER_DELETED_PATHS='+changes.map(row=>row.path).join(','));
      const verify=loadCatalog('main').catalog;
      if(mode==='delete'&&(!verify.permanentRemovalPolicy?.ids?.includes(id)||verify.games.some(g=>g.id===id)))
        throw Error('OWNER_DELETE_MAIN_VERIFY_FAILED');
      return;
    }catch(error){
      if(i===5)throw error;
      console.error('OWNER_MAIN_UPDATE_RETRY='+(i+1));
    }
  }
}
function main(){
  if(process.env.GITHUB_REPOSITORY!==REPOSITORY)throw Error('OWNER_MANAGEMENT_REPOSITORY_DENIED');
  const task=JSON.parse(fs.readFileSync(argv.task||'/tmp/pwa-next.json','utf8'));
  const request=parseOwnerStopTask(task),mode=process.argv[2];
  if(mode==='classify'){
    if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,
      'owner_stop='+(request?'true':'false')+'\n'+(request?'game_id='+request.gameId+'\nowner_action='+request.mode+'\n':''));
    console.log('PWA_OWNER_MANAGEMENT='+String(request?.mode||'none'));return;
  }
  if(mode==='apply'){
    if(!request)throw Error('OWNER_MANAGEMENT_TASK_MISSING');
    applyRuntime(request.gameId,request.mode);
    applyMain(request.gameId,request.mode);
    console.log('OWNER_MANAGEMENT_VERIFIED='+request.mode+':'+request.gameId);return;
  }
  throw Error('OWNER_MANAGEMENT_MODE_UNKNOWN');
}
if(process.argv[1]&&process.argv[1].endsWith('pwa-owner-stop.mjs')){
  try{main();}catch(error){console.error(error?.stack||String(error));process.exitCode=1;}
}
