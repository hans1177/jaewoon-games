#!/usr/bin/env node
// 파일명: tools/baeksu-war-upload-meshes.mjs
// 변환한 원본 CC0 3D 에셋의 해시·라이선스·게임별 권한을 확인하고 기존 Place용으로 등록.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';
const UNIVERSE='10773115989', PLACE='120481433333785';
const fantasy=process.argv.includes('--game-id=fantasy-survival');
const targetUniverse=fantasy?String(process.env.ROBLOX_UNIVERSE_ID||'').trim():UNIVERSE;
const dir=process.argv[2]||'/tmp/baeksu-art';
const receipt=process.argv[3]||'/tmp/baeksu-art-upload.json';
const key=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||'').trim();
if(!key)throw new Error('OPEN_CLOUD_KEY_REQUIRED');
const raw=String(process.env.ROBLOX_ROBLOSECURITY||process.env.ROBLOX_SECURITY_COOKIE||'').trim();
const cookie=raw?(raw.includes('.ROBLOSECURITY=')?raw:'.ROBLOSECURITY='+raw+';'):'';
let creator=String(process.env.ROBLOX_CREATOR_USER_ID||'').trim();
if(!creator&&cookie&&/^[1-9][0-9]*$/.test(targetUniverse)){
 const r=await fetch('https://develop.roblox.com/v1/universes/'+targetUniverse,{
   headers:{cookie},signal:AbortSignal.timeout(16000)});
 const data=await r.json().catch(()=>({}));
 if(r.ok&&String(data.id)===targetUniverse&&data.creatorType==='User')creator=String(data.creatorTargetId||'');
}
// Existing Vibe asset registration resolves the real authenticated owner, never a guessed ID.
if(!creator&&cookie){
 const response=await fetch('https://users.roblox.com/v1/users/authenticated',{
  headers:{cookie},signal:AbortSignal.timeout(16000)
 }).catch(()=>null);
 if(response?.ok){
  const account=await response.json().catch(()=>({}));
  const authenticated=String(account.id||'');
  if(/^[1-9][0-9]*$/.test(authenticated))creator=authenticated;
 }
}
if(!creator){
 const scope=await introspectRobloxApiKey({apiKey:key});
 if(scope.enabled!==true||scope.expired===true)throw Error('MODEL_CREATOR_AUTHORIZATION_UNVERIFIED');
 const writable=scope.scopes.filter(entry=>/asset/i.test(entry.name||'')
  &&entry.operations.some(x=>/write|create/i.test(x)));
 const ids=new Set();
 for(const entry of writable)for(const id of entry.userIds)if(/^[1-9][0-9]*$/.test(id))ids.add(id);
 if(ids.size===1)creator=[...ids][0];
 const authorized=String(scope.authorizedUserId||'');
 if(!creator&&/^[1-9][0-9]*$/.test(authorized)
  &&writable.some(entry=>entry.userIds.includes('*')||entry.userIds.includes(authorized)))creator=authorized;
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
const provenance=JSON.parse(await fs.readFile(path.join(dir,'provenance.json'),'utf8'));
const manifestBytes=fantasy?await fs.readFile('roblox-games/fantasy-survival/native-assets.json'):null;
const manifest=fantasy?JSON.parse(manifestBytes):null;
const names=fantasy?Object.keys(manifest.models):['sparrow','ant','beetle','wolf','turtle','slime','golem','dragon','home','gate','tree','rock'];
if(fantasy&&(manifest.gameId!=='fantasy-survival'||manifest.ownerApproved!==true||manifest.license!=='CC0-1.0'
 ||Object.keys(manifest.models||{}).sort().join(',')!=='bat,bee,boar,deer,golem,mushroom,rabbit,ruin,skeleton,tree,wolf'
 ||provenance.gameId!=='fantasy-survival'||provenance.sourceManifestSha256!==crypto.createHash('sha256').update(manifestBytes).digest('hex')))throw Error('FANTASY_NATIVE_APPROVAL_OR_MANIFEST_MISMATCH');
if(provenance.version!==(fantasy?5:4)||!provenance.roles||Object.keys(provenance.roles).sort().join(',')!==[...names].sort().join(','))throw Error('CC0_PROVENANCE_ROLES_MISMATCH');
const ids={};const records={};const verifiedModels=new Map();
const oldRegistry=fantasy?JSON.parse(await fs.readFile('roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json','utf8').catch(()=>'{"models":{}}')):null;
for(const name of names){
 const extension=fantasy?path.extname(manifest.models[name]?.sourcePath||manifest.models[name]?.archiveEntry||'').slice(1).toLowerCase():'glb';
 if(fantasy&&!['fbx','glb'].includes(extension))throw Error('FANTASY_UNSUPPORTED_NATIVE_FORMAT:'+name);
 const file=path.join(dir,name+'.'+extension);
 const bytes=await fs.readFile(file);
 if(bytes.length<1000||bytes.length>18*1024*1024||(extension==='fbx'?!bytes.subarray(0,18).toString().startsWith('Kaydara FBX Binary'):bytes.subarray(0,4).toString()!=='glTF'))throw Error('BAD_NATIVE_MODEL:'+name);
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 const origin=provenance.roles[name];
 if(!origin||(fantasy?origin.sha256!==digest||manifest.models[name]?.sourceSha256!==digest||origin.sourceSha256!==digest||origin.licenseEvidence!==manifest.models[name]?.licenseEvidence:origin.glbSha256!==digest)||origin.license!=='CC0-1.0'||!/^https:\/\//.test(origin.licenseEvidence||'')||!(/^[a-f0-9]{64}$/).test(origin.sourceSha256||'')||(!fantasy&&(!Number.isInteger(origin.modelPolygons)||origin.modelPolygons<4))){throw Error('CC0_SOURCE_LICENSE_OR_HASH_UNVERIFIED:'+name);}
 verifiedModels.set(name,{bytes,digest,origin,extension});
}
// Validate every original before the first irreversible Model registration.
// Keep existing authorized IDs instead of reuploading the seven deployed originals.
for(const name of names){
 const {bytes,digest,origin,extension}=verifiedModels.get(name);
 const prior=oldRegistry?.models?.[name];
 if(prior&&Number.isSafeInteger(prior.assetId)&&prior.assetId>0
   &&prior.sourceSha256===digest&&prior.sha256===digest
   &&prior.license==='CC0-1.0'&&prior.licenseEvidence===origin.licenseEvidence){
   ids[name]=prior.assetId;
   records[name]=prior;
   console.log('FANTASY_NATIVE_MODEL_REUSED='+name+':'+prior.assetId);
   continue;
 }
 const form=new FormData();
 form.set('request',JSON.stringify({assetType:'Model',displayName:(fantasy?'마력숲 생존기':'백수대전쟁')+' 3D '+name,
  description:'Licensed CC0 original 3D asset for '+(fantasy?'fantasy-survival':'baeksu-war')+'. Source sha256 '+origin.sourceSha256+'. Model sha256 '+digest,
  creationContext:{creator:{userId:Number(creator)}}}));
 form.set('fileContent',new Blob([bytes],{type:extension==='fbx'?'model/fbx':'model/gltf-binary'}),name+'.'+extension);
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
 if(!fantasy){
 const grant=await req('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
  method:'PATCH',headers:{'content-type':'application/json'},
  body:JSON.stringify({subjectType:'Universe',subjectId:UNIVERSE,action:'Use',
    requests:[{assetId:id,grantToDependencies:true}]})
 });
 if(Array.isArray(grant.errors)&&grant.errors.length)throw Error('UNIVERSE_GRANT_FAILED:'+name+':'+JSON.stringify(grant.errors).slice(0,300));
 }
 ids[name]=id;records[name]={assetId:id,sha256:digest,source:'VERIFIED_CC0_ORIGINAL',sourceFile:origin.sourceFile,sourceSha256:origin.sourceSha256,sourceModel:origin.sourceModel,license:origin.license,licenseEvidence:origin.licenseEvidence,universeId:fantasy?null:UNIVERSE};
 console.log((fantasy?'FANTASY_NATIVE_MODEL_REGISTERED=':'BAEKSU_WAR_CC0_MESH_GRANTED=')+name+':'+id);
 await fs.writeFile(receipt,JSON.stringify({version:fantasy?5:4,gameId:fantasy?'fantasy-survival':'baeksu-war',universeId:fantasy?null:UNIVERSE,placeId:fantasy?null:PLACE,models:records},null,2)+'\n');
}
const lua=[
 '-- V4: source-verified CC0 real-model IDs, with baeksu-war Universe permissions.',
 '-- DO NOT substitute procedural Part geometry if an asset is missing.',
 'return {',
 ...names.map(name=>' '+name+'='+ids[name]+','),
 '}',
 ''
].join('\n');
await fs.writeFile('roblox-games/'+(fantasy?'fantasy-survival':'baeksu-war')+'/shared/VisualAssetIds.luau',fantasy?lua.replace('-- V4: source-verified CC0 real-model IDs, with baeksu-war Universe permissions.','-- Source-verified original CC0 FBX/GLB models. Exact Universe grant is required by canonical publishing.'):lua);
if(fantasy)await fs.writeFile('roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json',JSON.stringify({...oldRegistry,version:2,gameId:'fantasy-survival',nativeRegistrationVersion:1,registrationVerified:true,sourceManifestSha256:provenance.sourceManifestSha256,grantRequiredAtPublish:true,runtimeVerified:false,models:records},null,2)+'\n');
console.log((fantasy?'FANTASY_NATIVE_REGISTERED_MODELS=':'BAEKSU_WAR_VERIFIED_CC0_MODELS=')+names.length);
