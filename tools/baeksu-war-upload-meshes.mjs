#!/usr/bin/env node
// 파일명: tools/baeksu-war-upload-meshes.mjs
// 변환한 원본 CC0 3D 에셋의 해시·라이선스·게임별 권한을 확인하고 기존 Place용으로 등록.
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
const provenance=JSON.parse(await fs.readFile(path.join(dir,'provenance.json'),'utf8'));
if(provenance.version!==4||!provenance.roles||Object.keys(provenance.roles).sort().join(',')!==[...names].sort().join(','))throw Error('CC0_PROVENANCE_ROLES_MISMATCH');
const ids={};const records={};
for(const name of names){
 const file=path.join(dir,name+'.glb');
 const bytes=await fs.readFile(file);
 if(bytes.length<1000||bytes.length>18*1024*1024||bytes.subarray(0,4).toString()!=='glTF')throw Error('BAD_NATIVE_GLB:'+name);
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 const origin=provenance.roles[name];
 if(!origin||origin.glbSha256!==digest||origin.license!=='CC0-1.0'||!/^https:\/\//.test(origin.licenseEvidence||'')||!(/^[a-f0-9]{64}$/).test(origin.sourceSha256||'')||!Number.isInteger(origin.modelPolygons)||origin.modelPolygons<4){throw Error('CC0_SOURCE_LICENSE_OR_HASH_UNVERIFIED:'+name);}
 const form=new FormData();
 form.set('request',JSON.stringify({assetType:'Model',displayName:'백수대전쟁 3D '+name,
  description:'Licensed CC0 original 3D asset adapted for baeksu-war. Source '+origin.sourceFile+' sha256 '+origin.sourceSha256.slice(0,16)+'. Model sha256 '+digest.slice(0,16),
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
 ids[name]=id;records[name]={assetId:id,sha256:digest,source:'VERIFIED_CC0_ORIGINAL',sourceFile:origin.sourceFile,sourceSha256:origin.sourceSha256,sourceModel:origin.sourceModel,license:origin.license,licenseEvidence:origin.licenseEvidence,universeId:UNIVERSE};
 console.log('BAEKSU_WAR_CC0_MESH_GRANTED='+name+':'+id);
 await fs.writeFile(receipt,JSON.stringify({version:4,universeId:UNIVERSE,placeId:PLACE,models:records},null,2)+'\n');
}
const lua=[
 '-- V4: source-verified CC0 real-model IDs, with baeksu-war Universe permissions.',
 '-- DO NOT substitute procedural Part geometry if an asset is missing.',
 'return {',
 ...names.map(name=>' '+name+'='+ids[name]+','),
 '}',
 ''
].join('\n');
await fs.writeFile('roblox-games/baeksu-war/shared/VisualAssetIds.luau',lua);
console.log('BAEKSU_WAR_VERIFIED_CC0_MODELS='+names.length);
