// 파일명: tools/fantasy-opening-assets.mjs
// 마력숲 24컷 오프닝 원화 72장(배경·인물·전경)을 로블록스 Image 자산으로 등록하고
// Universe 사용 권한을 승인한 뒤 shared/OpeningAssetIds24.luau 에 실제 ID만 기록한다.
// 기존 horror-combat-assets.mjs 의 이미지 업로드·권한 경로와 같은 비밀키·API를 사용한다.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';

const dir='roblox-games/fantasy-survival/opening24';
const manifest=JSON.parse(fs.readFileSync(dir+'/files.json','utf8'));
const receiptPath=dir+'/uploaded.json';
const idsPath='roblox-games/fantasy-survival/shared/OpeningAssetIds24.luau';
const universeId='10773436325';
const expectedCount=72;
const contentSafety=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'))
  .livingMotionVisualQualityContract.assetAdaptation.contentSafety;
if(contentSafety?.enabled!==true)throw Error('IMAGE_CONTENT_SAFETY_POLICY_REQUIRED');
const blockedHashes=new Set(contentSafety.blockedAssets.flatMap(row=>row.sha256||[]));
const blockedIds=new Set(contentSafety.blockedAssets.flatMap(row=>row.assetIds||[]).map(String));

if(manifest.source!=='OWNER_REQUESTED_GENERATED_24_SCENE_OPENING_LAYERS'||manifest.license!=='OWNER_CREATED_UI')
  throw Error('OPENING24_PROVENANCE_INVALID');
const names=Object.keys(manifest.files).sort();
if(names.length!==expectedCount)throw Error('OPENING24_FILE_COUNT_INVALID:'+names.length);
const sources=new Map();
for(const name of names){
  const bytes=fs.readFileSync(dir+'/'+name);
  const sha=crypto.createHash('sha256').update(bytes).digest('hex');
  if(sha!==manifest.files[name].sha256||bytes.length!==manifest.files[name].bytes)
    throw Error('OPENING24_SOURCE_HASH_INVALID:'+name);
  if(blockedHashes.has(sha))throw Error('REMOVED_IMAGE_SOURCE_FORBIDDEN:'+name);
  sources.set(name,{bytes,sha});
}

const key=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||'').trim();
const rawCookie=String(process.env.ROBLOX_ROBLOSECURITY||process.env.ROBLOX_SECURITY_COOKIE||'').trim();
if(!key)throw Error('ROBLOX_OPEN_CLOUD_API_KEY_MISSING');
const cookie=rawCookie.includes('.ROBLOSECURITY=')?rawCookie:(rawCookie?'.ROBLOSECURITY='+rawCookie+';':'');
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
  if(!r.ok)throw Error('ROBLOX_HTTP_'+r.status+':'+new URL(url).pathname+':'+String(d.code||d.message||'').slice(0,80));
  return d;
}

// 업로드 주체(creator) 확인: 기존 도구와 같은 규칙.
let creator=null;
if(cookie){
  const r=await fetch('https://develop.roblox.com/v1/universes/'+universeId,{headers:{cookie},signal:AbortSignal.timeout(30000)});
  const d=await r.json().catch(()=>({}));
  if(r.ok&&String(d.id)===universeId&&Number(d.creatorTargetId)>0&&['User','Group'].includes(d.creatorType)){
    creator={[d.creatorType==='Group'?'groupId':'userId']:String(d.creatorTargetId)};
  }
  console.log('OPENING24_OWNER_LOOKUP='+r.status+':'+(creator?'RESOLVED':'UNRESOLVED'));
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
  if(unique.length!==1)throw Error('OPENING24_CREATOR_NOT_RESOLVED');
  creator=unique[0];
}

// 이미 올린 파일은 해시가 같으면 다시 올리지 않는다(재실행 안전).
let receipt={assets:{},failed:{},universeId,universeUseGrantVerified:false};
if(fs.existsSync(receiptPath))receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
receipt.assets=receipt.assets||{};
receipt.failed={};
const save=()=>fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,1)+'\n');

for(const name of names){
  const {bytes,sha}=sources.get(name);
  const done=receipt.assets[name];
  if(done&&blockedIds.has(String(done.assetId)))throw Error('REMOVED_IMAGE_ID_FORBIDDEN:'+name);
  if(done&&done.sha256===sha&&/^[1-9]\d*$/.test(String(done.assetId)))continue;
  try{
    const isJpg=name.endsWith('.jpg');
    const form=new FormData();
    form.append('request',JSON.stringify({
      assetType:'Image',displayName:('Mana Forest Opening '+name).slice(0,50),
      description:'Owner-requested original 24-scene opening layer sha256 '+sha,
      creationContext:{creator},
    }));
    form.append('fileContent',new Blob([bytes],{type:isJpg?'image/jpeg':'image/png'}),name);
    let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
    if(!/^operations\/[a-zA-Z0-9-]+$/.test(String(op.path||'')))throw Error('OPENING24_OPERATION_INVALID');
    const operationPath=op.path,deadline=Date.now()+240000;
    while(!op.done&&Date.now()<deadline){
      await new Promise(resolve=>setTimeout(resolve,3000));
      op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
    }
    const assetId=String(op.response?.assetId||'');
    if(!op.done||op.error||!/^[1-9]\d*$/.test(assetId))throw Error('OPENING24_UPLOAD_FAILED:'+String(op.error?.message||'').slice(0,80));
    receipt.assets[name]={assetId,sha256:sha};
    receipt.universeUseGrantVerified=false;
    save();
    console.log('OPENING24_UPLOADED='+name+':'+assetId);
  }catch(error){
    receipt.failed[name]=String(error.message||error).slice(0,160);
    save();
    console.log('OPENING24_FAILED='+name+':'+receipt.failed[name]);
  }
}

const uploaded=names.filter(n=>receipt.assets[n]&&/^[1-9]\d*$/.test(String(receipt.assets[n].assetId)));
console.log('OPENING24_UPLOADED_COUNT='+uploaded.length+'/'+expectedCount);
if(uploaded.length!==expectedCount){save();throw Error('OPENING24_INCOMPLETE');}

// Universe 사용 권한 승인(기존 이미지 등록 경로와 동일한 API).
if(!receipt.universeUseGrantVerified){
  for(let i=0;i<uploaded.length;i+=24){
    const chunk=uploaded.slice(i,i+24);
    const grant=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
      method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
      body:JSON.stringify({subjectType:'Universe',subjectId:universeId,action:'Use',
        requests:chunk.map(n=>({assetId:Number(receipt.assets[n].assetId),grantToDependencies:true}))}),
    });
    if(grant.errors?.length)throw Error('OPENING24_UNIVERSE_PERMISSION_REJECTED');
  }
  receipt.universeUseGrantVerified=true;
  save();
  console.log('OPENING24_UNIVERSE_USE_GRANTED='+universeId);
}

// 72장이 모두 올라가고 권한까지 승인된 경우에만 게임이 읽는 ID 파일을 갱신한다.
const stem=n=>n.replace(/\.(png|jpg)$/,'');
const lines=uploaded.map(n=>' '+stem(n)+'="rbxassetid://'+receipt.assets[n].assetId+'",');
fs.writeFileSync(idsPath,
  '-- 업로드 워크플로(fantasy-opening-assets)가 기록한 로블록스 이미지 ID. 72장 전부 있을 때만 24컷 오프닝을 사용한다.\n'
  +'return {\n'+lines.join('\n')+'\n}\n');
console.log('OPENING24_IDS_WRITTEN='+idsPath);
