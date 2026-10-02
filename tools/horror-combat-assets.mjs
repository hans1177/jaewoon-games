// 파일명: tools/horror-combat-assets.mjs
// 저장소 원본 스킨드 GLB를 심야 대탈출 전용 Roblox Model 자산으로 등록한다.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';

const source='assets/roblox/world-ghosts/native/mesh/bride.glb';
const evidencePath='assets/roblox/world-ghosts/native/combat-roblox-assets.json';
const output='roblox-games/horror-escape-room/shared/CombatAssets.luau';
const file=fs.readFileSync(source);
if(file.toString('utf8',0,4)!=='glTF'||file.readUInt32LE(4)!==2)throw Error('INVALID_COMBAT_GLB');
const hash=crypto.createHash('sha256').update(file).digest('hex');
const key=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||'').trim();
const rawCookie=String(process.env.ROBLOX_ROBLOSECURITY||process.env.ROBLOX_SECURITY_COOKIE||'').trim();
if(!key)throw Error('ROBLOX_OPEN_CLOUD_API_KEY_MISSING');
const cookie=rawCookie.includes('.ROBLOSECURITY=')?rawCookie:(rawCookie?'.ROBLOSECURITY='+rawCookie+';':'');
const universeId='10767445796';
let csrf='';
async function request(url,options={}){
 const authenticated=!!cookie&&url.startsWith('https://apis.roblox.com/');
 if(authenticated&&url.startsWith('https://apis.roblox.com/assets/v1/'))url=url.replace('/assets/v1/','/assets/user-auth/v1/');
 const headers={...(options.headers||{})};
 if(authenticated){delete headers['x-api-key'];headers.cookie=cookie;if(csrf)headers['x-csrf-token']=csrf;}
 let r=await fetch(url,{...options,headers,signal:AbortSignal.timeout(60000)});
 if(authenticated&&r.status===403&&r.headers.get('x-csrf-token')){
  csrf=r.headers.get('x-csrf-token');
  r=await fetch(url,{...options,headers:{...headers,'x-csrf-token':csrf},signal:AbortSignal.timeout(60000)});
 }
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error('ROBLOX_HTTP_'+r.status+':'+new URL(url).pathname);
 return d;
}
let creator=null;
if(cookie){
 const r=await fetch('https://develop.roblox.com/v1/universes/'+universeId,{headers:{cookie},signal:AbortSignal.timeout(30000)});
 const d=await r.json().catch(()=>({}));
 if(r.ok&&String(d.id)===universeId&&Number(d.creatorTargetId)>0&&['User','Group'].includes(d.creatorType)){
  creator={[d.creatorType==='Group'?'groupId':'userId']:String(d.creatorTargetId)};
 }
 console.log('COMBAT_PRIVATE_OWNER_LOOKUP='+r.status+':'+(creator?'RESOLVED':'UNRESOLVED'));
}
if(!creator){
 const scope=await introspectRobloxApiKey({apiKey:key});
 const candidates=[];
 for(const row of scope.scopes){
  if(!/asset/i.test(row.name)||!(/write|create/i.test(row.name)||row.operations.some(x=>/write|create/i.test(x))))continue;
  for(const id of row.userIds)if(/^[1-9]\d*$/.test(id))candidates.push({userId:id});
  for(const id of row.groupIds)if(/^[1-9]\d*$/.test(id))candidates.push({groupId:id});
 }
 const unique=[...new Map(candidates.map(x=>[JSON.stringify(x),x])).values()];
 if(unique.length!==1)throw Error('COMBAT_ASSET_CREATOR_NOT_RESOLVED');
 creator=unique[0];
}
let evidence=fs.existsSync(evidencePath)?JSON.parse(fs.readFileSync(evidencePath,'utf8')):{};
if(evidence.sha256!==hash||!(Number(evidence.humanoidModelId)>0)){
 const form=new FormData();
 form.append('request',JSON.stringify({
  assetType:'Model',
  displayName:'Midnight Authored Combat Ghost',
  description:'Original skinned ghost mesh for Midnight Escape combat presentation. '+hash.slice(0,12),
  creationContext:{creator}
 }));
 form.append('fileContent',new Blob([file],{type:'model/gltf-binary'}),'midnight-authored-combat-ghost.glb');
 let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
 const opPath=op.path;
 if(!/^operations\/[a-zA-Z0-9-]+$/.test(opPath||''))throw Error('INVALID_COMBAT_ASSET_OPERATION');
 const deadline=Date.now()+240000;
 while(!op.done&&Date.now()<deadline){
  await new Promise(r=>setTimeout(r,4000));
  op=await request('https://apis.roblox.com/assets/v1/'+opPath,{headers:{'x-api-key':key}});
 }
 const assetId=op.response?.assetId;
 if(!op.done||op.error||!(Number(assetId)>0)){
  console.error('COMBAT_ASSET_IMPORT_OPERATION='+JSON.stringify({done:op.done===true,error:op.error||null,response:op.response||null,path:op.path||null}));
  throw Error('COMBAT_ASSET_IMPORT_FAILED');
 }
 evidence={version:1,humanoidModelId:String(assetId),sha256:hash,creator,sourceRevision:process.env.GITHUB_SHA,importedAt:new Date().toISOString()};
 fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
}
const grants=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
 method:'PATCH',
 headers:{'x-api-key':key,'content-type':'application/json'},
 body:JSON.stringify({subjectType:'Universe',subjectId:universeId,action:'Use',requests:[{assetId:Number(evidence.humanoidModelId),grantToDependencies:true}]})
});
if(grants.errors?.length)throw Error('COMBAT_ASSET_PERMISSION_FAILED:'+grants.errors.map(e=>e.code).join(','));
fs.writeFileSync(output,`-- 파일명: shared/CombatAssets.luau
-- 저장소 원본 스킨드 GLB ${hash}
return {
 HumanoidModelId=${Number(evidence.humanoidModelId)},
 HumanoidSourceSha256=${JSON.stringify(hash)},
 AssetSource=${JSON.stringify(source)},
}
`);
console.log('COMBAT_AUTHORED_MODEL_ID='+evidence.humanoidModelId);
console.log('COMBAT_AUTHORED_GLB_SHA256='+hash);
