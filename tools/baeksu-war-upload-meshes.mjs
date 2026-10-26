#!/usr/bin/env node
// Owner-approved original GLB meshes, not Part-made runtime visuals. Never reuses other games' Universe.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';
const UNIVERSE='10773115989', PLACE='120481433333785';
const dir=process.argv[2]||'/tmp/baeksu-art';
const receipt=process.argv[3]||'/tmp/baeksu-art-upload.json';
const key=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||'').trim();
if(!key)throw new Error('OPEN_CLOUD_KEY_REQUIRED');
const raw=String(process.env.ROBLOX_ROBLOSECURITY||process.env.ROBLOX_SECURITY_COOKIE||'').trim();
const cookie=raw?(raw.includes('.ROBLOSECURITY=')?raw:'.ROBLOSECURITY='+raw+';'):'';
let creator=String(process.env.ROBLOX_CREATOR_USER_ID||'').trim();
if(!creator&&cookie){
 const r=await fetch('https://develop.roblox.com/v1/universes/'+UNIVERSE,{
   headers:{cookie},signal:AbortSignal.timeout(16000)});
 const data=await r.json().catch(()=>({}));
 if(r.ok&&String(data.id)===UNIVERSE&&data.creatorType==='User')creator=String(data.creatorTargetId||'');
}
if(!creator){
 const scope=await introspectRobloxApiKey({apiKey:key});
 const ids=new Set();
 for(const entry of scope.scopes)if(/asset/i.test(entry.name||'')&&entry.operations.some(x=>/write|create/i.test(x)))for(const id of entry.userIds)ids.add(id);
 if(ids.size===1)creator=[...ids][0];
}
if(!/^[1-9][0-9]*$/.test(creator))throw Error('MODEL_CREATOR_UNKNOWN_FAIL_CLOSED');
let csrf='';
async function req(url,opts={}){
 const auth=Boolean(cookie)&&url.startsWith('https://apis.roblox.com/');
 if(auth&&url.includes('/assets/v1/'))url=url.replace('/assets/v1/','/assets/user-auth/v1/');
 const headers={...(opts.headers||{}),...(auth?{cookie}:{"x-api-key":key})};
 if(auth&&csrf)headers['x-csrf-token']=csrf;
 const request=(h)=>fetch(url,{...opts,headers:h,signal:AbortSignal.timeout(60000)});
 let r=await request(headers);
 if(auth&&r.status===403&&r.headers.get('x-csrf-token')){
  csrf=r.headers.get('x-csrf-token');
  r=await request({...headers,'x-csrf-token':csrf});
 }
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error('ROBLOX_ASSET_API_'+r.status+':'+JSON.stringify(data).slice(0,650));
 return data;
}
const names=['sparrow','ant','beetle','wolf','turtle','slime','golem','dragon','home','gate','tree','rock'];
const ids={};const records={};
for(const name of names){
 const file=path.join(dir,name+'.glb');
 const bytes=await fs.readFile(file);
 if(bytes.length<1000||bytes.length>18*1024*1024||bytes.subarray(0,4).toString()!=='glTF')throw Error('BAD_NATIVE_GLB:'+name);
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 const form=new FormData();
 form.set('request',JSON.stringify({assetType:'Model',displayName:'백수대전쟁 3D '+name,
  description:'Original CC0-compatible first-party 3D mesh authoring output, no copied game assets. Source tools/baeksu-war-author-meshes.py, hash '+digest.slice(0,16),
  creationContext:{creator:{userId:Number(creator)}}}));
 form.set('fileContent',new Blob([bytes],{type:'model/gltf-binary'}),name+'.glb');
 const op=await req('https://apis.roblox.com/assets/v1/assets',{method:'POST',body:form});
 if(!/^operations\/[a-zA-Z0-9_/-]+$/.test(op.path||''))throw Error('ASSET_UPLOAD_NO_OPERATION:'+name);
 let id=null;
 for(let i=0;i<40;i++){
  await new Promise(r=>setTimeout(r,1400));
  const info=await req('https://apis.roblox.com/assets/v1/'+op.path);
  if(info.error)throw Error('UPLOAD_FAILED:'+name+':'+JSON.stringify(info.error).slice(0,240));
  if(info.done){id=Number(info.response?.assetId??info.response?.asset?.assetId);break;}
 }
 if(!Number.isSafeInteger(id)||id<1)throw Error('ASSET_ID_INVALID:'+name);
 const grant=await req('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
  method:'PATCH',headers:{'content-type':'application/json'},
  body:JSON.stringify({subjectType:'Universe',subjectId:UNIVERSE,action:'Use',
    requests:[{assetId:id,grantToDependencies:true}]})
 });
 if(Array.isArray(grant.errors)&&grant.errors.length)throw Error('UNIVERSE_GRANT_FAILED:'+name+':'+JSON.stringify(grant.errors).slice(0,300));
 ids[name]=id;records[name]={assetId:id,sha256:digest,source:'FIRST_PARTY_GENERATED_GLTF',universeId:UNIVERSE};
 console.log('BAEKSU_WAR_AUTHORED_MESH_GRANTED='+name+':'+id);
 await fs.writeFile(receipt,JSON.stringify({version:1,universeId:UNIVERSE,placeId:PLACE,models:records},null,2)+'\n');
}
const lua=[
 '-- V3: exact-cloud Model IDs uploaded by owner workflow, granted to baeksu-war Universe only.',
 '-- DO NOT substitute procedural Part geometry if an asset is missing.',
 'return {',
 ...names.map(name=>' '+name+'='+ids[name]+','),
 '}',
 ''
].join('\n');
await fs.writeFile('roblox-games/baeksu-war/shared/VisualAssetIds.luau',lua);
console.log('BAEKSU_WAR_AUTHORED_NATIVE_MESHES='+names.length);
