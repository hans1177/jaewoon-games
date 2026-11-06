// 파일명: tools/fantasy-opening-audio.mjs
// 마력숲 오프닝 60초 사운드트랙(오너 요청으로 직접 합성한 창작물)을 로블록스 Audio 자산으로 등록하고
// Universe 사용 권한을 승인한 뒤 shared/OpeningAudioId.luau 에 실제 ID만 기록한다.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';

const dir='roblox-games/fantasy-survival/opening24';
const meta=JSON.parse(fs.readFileSync(dir+'/audio.json','utf8'));
const receiptPath=dir+'/audio-uploaded.json';
const idsPath='roblox-games/fantasy-survival/shared/OpeningAudioId.luau';
const universeId='10773436325';
if(meta.source!=='OWNER_REQUESTED_ORIGINAL_SYNTH_SCORE'||meta.license!=='OWNER_CREATED_AUDIO')throw Error('OPENING_AUDIO_PROVENANCE_INVALID');
const bytes=Buffer.from(fs.readFileSync(dir+'/'+meta.file,'utf8').trim(),'base64');
const sha=crypto.createHash('sha256').update(bytes).digest('hex');
if(sha!==meta.sha256||bytes.length!==meta.bytes)throw Error('OPENING_AUDIO_HASH_INVALID');

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
  let r=await fetch(url,{...options,headers,signal:AbortSignal.timeout(90000)});
  if(authenticated&&r.status===403&&r.headers.get('x-csrf-token')){
    csrf=r.headers.get('x-csrf-token');
    r=await fetch(url,{...options,headers:{...headers,'x-csrf-token':csrf},signal:AbortSignal.timeout(90000)});
  }
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error('ROBLOX_HTTP_'+r.status+':'+new URL(url).pathname+':'+String(d.code||d.message||'').slice(0,120));
  return d;
}

let creator=null;
if(cookie){
  const r=await fetch('https://develop.roblox.com/v1/universes/'+universeId,{headers:{cookie},signal:AbortSignal.timeout(30000)});
  const d=await r.json().catch(()=>({}));
  if(r.ok&&String(d.id)===universeId&&Number(d.creatorTargetId)>0&&['User','Group'].includes(d.creatorType))
    creator={[d.creatorType==='Group'?'groupId':'userId']:String(d.creatorTargetId)};
  console.log('OPENING_AUDIO_OWNER_LOOKUP='+r.status+':'+(creator?'RESOLVED':'UNRESOLVED'));
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
  if(unique.length!==1)throw Error('OPENING_AUDIO_CREATOR_NOT_RESOLVED');
  creator=unique[0];
}

let receipt={sha256:'',assetId:'',universeId,universeUseGrantVerified:false};
if(fs.existsSync(receiptPath))receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
const save=()=>fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,1)+'\n');

if(!(receipt.sha256===sha&&/^[1-9]\d*$/.test(String(receipt.assetId)))){
  const form=new FormData();
  form.append('request',JSON.stringify({
    assetType:'Audio',displayName:'Mana Forest Opening Score',
    description:'Original synthesized 60 second opening score. No vocals. sha256 '+sha,
    creationContext:{creator},
  }));
  form.append('fileContent',new Blob([bytes],{type:'audio/ogg'}),'opening-score.ogg');
  let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
  if(!/^operations\/[a-zA-Z0-9-]+$/.test(String(op.path||'')))throw Error('OPENING_AUDIO_OPERATION_INVALID');
  const operationPath=op.path,deadline=Date.now()+300000;
  while(!op.done&&Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,3000));
    op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
  }
  const assetId=String(op.response?.assetId||'');
  if(!op.done||op.error||!/^[1-9]\d*$/.test(assetId))throw Error('OPENING_AUDIO_UPLOAD_FAILED:'+String(op.error?.message||'').slice(0,120));
  receipt={sha256:sha,assetId,universeId,universeUseGrantVerified:false};
  save();
  console.log('OPENING_AUDIO_UPLOADED='+assetId);
}
if(!receipt.universeUseGrantVerified){
  const grant=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
    method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
    body:JSON.stringify({subjectType:'Universe',subjectId:universeId,action:'Use',
      requests:[{assetId:Number(receipt.assetId),grantToDependencies:true}]}),
  });
  if(grant.errors?.length)throw Error('OPENING_AUDIO_UNIVERSE_PERMISSION_REJECTED');
  receipt.universeUseGrantVerified=true;
  save();
  console.log('OPENING_AUDIO_UNIVERSE_USE_GRANTED='+universeId);
}
fs.writeFileSync(idsPath,
  '-- 업로드 워크플로(fantasy-opening-audio)가 기록한 오프닝 음악 ID. 비어 있으면 소리 없이 재생한다.\n'
  +'return {\n score="rbxassetid://'+receipt.assetId+'",\n}\n');
console.log('OPENING_AUDIO_ID_WRITTEN='+idsPath);
