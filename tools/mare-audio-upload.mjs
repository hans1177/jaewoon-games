// 파일명: tools/mare-audio-upload.mjs
// 마리 에센시아 오리지널 합성 음악·효과음(roblox-games/mare-essentia/audio)을 로블록스 Audio 자산으로 등록하고
// Universe 사용 권한을 승인한 뒤 Shared/AudioIds.luau 에 실제 ID만 기록한다. 같은 해시는 다시 올리지 않는다.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';

const dir='roblox-games/mare-essentia/audio';
const meta=JSON.parse(fs.readFileSync(dir+'/manifest.json','utf8'));
const receiptPath=dir+'/uploaded.json';
const idsPath='roblox-games/mare-essentia/src/ReplicatedStorage/Shared/AudioIds.luau';
const universeId='10774821253';
if(meta.source!=='OWNER_REQUESTED_ORIGINAL_SYNTH_SCORE'||meta.license!=='OWNER_CREATED_AUDIO')throw Error('AUDIO_PROVENANCE_INVALID');

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
  console.log('AUDIO_OWNER_LOOKUP='+r.status+':'+(creator?'RESOLVED':'UNRESOLVED'));
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
  if(unique.length!==1)throw Error('AUDIO_CREATOR_NOT_RESOLVED');
  creator=unique[0];
}

let receipts={};
if(fs.existsSync(receiptPath))receipts=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
const save=()=>fs.writeFileSync(receiptPath,JSON.stringify(receipts,null,1)+'\n');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let failures=0;

for(const t of meta.tracks){
  try{
    const bytes=fs.readFileSync(dir+'/'+t.file);
    const sha=crypto.createHash('sha256').update(bytes).digest('hex');
    let rec=receipts[t.name]||{};
    if(!(rec.sha256===sha&&/^[1-9]\d*$/.test(String(rec.assetId)))){
      const form=new FormData();
      form.append('request',JSON.stringify({
        assetType:'Audio',displayName:('Mare '+t.label).slice(0,50),
        description:'Original synthesized audio for Mare Essentia. No samples. sha256 '+sha,
        creationContext:{creator},
      }));
      form.append('fileContent',new Blob([bytes],{type:'audio/ogg'}),t.name+'.ogg');
      let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
      if(!/^operations\/[a-zA-Z0-9-]+$/.test(String(op.path||'')))throw Error('AUDIO_OPERATION_INVALID');
      const operationPath=op.path,deadline=Date.now()+300000;
      while(!op.done&&Date.now()<deadline){
        await sleep(3000);
        op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
      }
      const assetId=String(op.response?.assetId||'');
      if(!op.done||op.error||!/^[1-9]\d*$/.test(assetId))throw Error('AUDIO_UPLOAD_FAILED:'+String(op.error?.message||'').slice(0,120));
      rec={sha256:sha,assetId,granted:false};
      receipts[t.name]=rec;save();
      console.log('AUDIO_UPLOADED '+t.name+'='+assetId);
      await sleep(2500);
    }
    if(!rec.granted){
      const grant=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
        method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
        body:JSON.stringify({subjectType:'Universe',subjectId:universeId,action:'Use',
          requests:[{assetId:Number(rec.assetId),grantToDependencies:true}]}),
      });
      if(grant.errors?.length)throw Error('AUDIO_UNIVERSE_PERMISSION_REJECTED');
      rec.granted=true;receipts[t.name]=rec;save();
      console.log('AUDIO_GRANTED '+t.name);
    }
  }catch(e){
    failures++;
    console.log('AUDIO_FAILED '+t.name+' '+String(e.message||e).slice(0,200));
  }
}
const lines=meta.tracks.filter(t=>receipts[t.name]?.granted).map(t=>' '+t.name+'="rbxassetid://'+receipts[t.name].assetId+'",');
fs.writeFileSync(idsPath,
  '-- 업로드 워크플로(mare-audio-upload)가 기록한 음악·효과음 ID. 등록과 권한 승인이 끝난 것만 들어간다. 없으면 소리 없이 지나간다.\nreturn {\n'+lines.join('\n')+'\n}\n');
console.log('AUDIO_IDS_WRITTEN count='+lines.length+' failures='+failures);
