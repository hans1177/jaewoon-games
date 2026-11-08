#!/usr/bin/env node
// 파일명: tools/company-roblox-dedicated-experience.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIGITS=/^[1-9][0-9]*$/;
const DEFAULT_TEMPLATE_PLACE_ID='95206881';

function clean(v){return String(v??'').trim();}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function safeJson(text){try{return text?JSON.parse(text):null;}catch{return {raw:String(text||'').slice(0,1200)};}}
function errText(payload){return JSON.stringify(payload??{}).slice(0,1600);}
function validId(v){return DIGITS.test(clean(v));}
function cookieHeader(raw){
  const v=clean(raw);
  if(!v)return'';
  return v.includes('.ROBLOSECURITY=')?v:`.ROBLOSECURITY=${v};`;
}
function pickIds(payload={}){
  const universeId=clean(payload.universeId??payload.UniverseId??payload.id??payload.universe?.id);
  const placeId=clean(payload.rootPlaceId??payload.RootPlaceId??payload.placeId??payload.PlaceId??payload.rootPlace?.id);
  return {universeId,placeId};
}

export async function csrfFetch({url,method='POST',cookie,headers={},body,fetchImpl=globalThis.fetch}={}){
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation unavailable');
  const c=cookieHeader(cookie);
  if(!c)throw new Error('ROBLOX_ROBLOSECURITY required');
  const baseHeaders={...headers,cookie:c};
  let response=await fetchImpl(url,{method,headers:baseHeaders,body});
  if(response.status!==403)return response;
  const token=response.headers?.get?.('x-csrf-token')||'';
  if(!token)return response;
  response=await fetchImpl(url,{method,headers:{...baseHeaders,'x-csrf-token':token},body});
  return response;
}

async function parseResponse(response){
  const text=await response.text();
  return {text,payload:safeJson(text)};
}

export async function introspectRobloxApiKey({
  apiKey=process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  fetchImpl=globalThis.fetch,
}={}){
  const key=clean(apiKey);
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required');
  const response=await fetchImpl('https://apis.roblox.com/api-keys/v1/introspect',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({apiKey:key}),
  });
  const {payload}=await parseResponse(response);
  if(!response.ok)throw new Error(`Roblox API key introspect failed HTTP ${response.status}`);
  const scopes=Array.isArray(payload?.scopes)?payload.scopes:[];
  const safeScopes=scopes.map(scope=>Object.freeze({
    name:clean(scope?.name)||null,
    operations:Array.isArray(scope?.operations)?scope.operations.map(clean):[],
    universeIds:Array.isArray(scope?.universeIds)?scope.universeIds.map(clean):[],
    userIds:Array.isArray(scope?.userIds)?scope.userIds.map(clean):[],
    groupIds:Array.isArray(scope?.groupIds)?scope.groupIds.map(clean):[],
  }));
  return Object.freeze({
    enabled:payload?.enabled===true,
    expired:payload?.expired===true,
    // Roblox key introspection supplies this verified owner when asset scopes use '*'.
    authorizedUserId:/^[1-9][0-9]*$/.test(clean(payload?.authorizedUserId))
      ?clean(payload.authorizedUserId):null,
    scopes:Object.freeze(safeScopes),
  });
}

async function resolveRootPlaceId(universeId,{fetchImpl=globalThis.fetch}={}){
  const response=await fetchImpl(`https://develop.roblox.com/v1/universes/${universeId}/places`);
  const {payload}=await parseResponse(response);
  if(!response.ok)throw new Error(`Roblox root place lookup failed HTTP ${response.status}: ${errText(payload)}`);
  const rows=Array.isArray(payload)?payload:(payload?.data||payload?.places||[]);
  const root=rows.find(x=>x?.isRootPlace===true||x?.IsRootPlace===true)||rows[0];
  const placeId=clean(root?.id??root?.placeId??root?.PlaceId);
  if(!validId(placeId))throw new Error('Roblox root place lookup returned no valid place id');
  return placeId;
}

export async function createRobloxDedicatedExperience({
  templatePlaceId=DEFAULT_TEMPLATE_PLACE_ID,
  apiKey=process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  fetchImpl=globalThis.fetch,
}={}){
  // [인증] 1980 등 특정 로그인 세션을 추측하지 않는다. 현재 GitHub Open Cloud 키만 사용한다.
  const template=clean(templatePlaceId),key=clean(apiKey);
  if(!validId(template))throw new Error('template place id invalid');
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required');
  const endpoint='https://apis.roblox.com/universes/v1/universes/create';
  const tryBody=async body=>{
    const response=await fetchImpl(endpoint,{
      method:'POST',
      headers:{'content-type':'application/json','x-api-key':key},
      body:JSON.stringify(body),
    });
    return {response,...await parseResponse(response)};
  };
  let result=await tryBody({templatePlaceId:Number(template)});
  if(!result.response.ok&&result.response.status===400)
    result=await tryBody({templatePlaceIdToUse:Number(template)});
  if(!result.response.ok){
    const authHint=[401,403].includes(result.response.status)?':OPEN_CLOUD_CREATE_NOT_AUTHORIZED':'';
    throw new Error(`Roblox experience create failed HTTP ${result.response.status}${authHint}: ${errText(result.payload)}`);
  }
  const ids=pickIds(result.payload||{});
  if(!validId(ids.universeId))throw new Error(`Roblox experience create response missing universe id: ${errText(result.payload)}`);
  const placeId=validId(ids.placeId)?ids.placeId:await resolveRootPlaceId(ids.universeId,{fetchImpl});
  return Object.freeze({universeId:ids.universeId,placeId,created:true});
}

export async function configureRobloxExperience({
  universeId,name,description='',avatarRig='',
  apiKey=process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  fetchImpl=globalThis.fetch,
}={}){
  if(!validId(universeId))throw new Error('universe id invalid');
  if(!clean(name))throw new Error('experience name required');
  const key=clean(apiKey);
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required');
  if(avatarRig&&avatarRig!=='R15')throw new Error('UNSUPPORTED_OWNER_AVATAR_RIG');
  // [R15] 공식 키만으로 아바타 리그 변경을 검증할 수 없으므로 옛 쿠키로 우회하지 않는다.
  if(avatarRig==='R15')throw new Error('ROBLOX_R15_OWNER_STUDIO_CONFIGURATION_REQUIRED_API_KEY_ONLY');
  const endpoint=`https://apis.roblox.com/cloud/v2/universes/${universeId}?updateMask=displayName,description,visibility`;
  const response=await fetchImpl(endpoint,{
    method:'PATCH',
    headers:{'content-type':'application/json','x-api-key':key},
    body:JSON.stringify({displayName:clean(name),description:String(description||''),visibility:'PRIVATE'}),
  });
  const {payload}=await parseResponse(response);
  if(!response.ok)throw new Error(`Roblox experience configure failed HTTP ${response.status}: ${errText(payload)}`);
  return Object.freeze({configured:true,privateRequested:true});
}

export async function ensureRobloxExperiencePrivate({
  universeId,
  apiKey=process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  fetchImpl=globalThis.fetch,
}={}){
  if(!validId(universeId))throw new Error('universe id invalid');
  // [인증] 비공개 전환은 Open Cloud 키로만 시도하고 옛 계정 쿠키로 재시도하지 않는다.
  const key=clean(apiKey);
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required for private enforcement');
  const response=await fetchImpl(`https://apis.roblox.com/legacy-develop/v1/universes/${universeId}/deactivate`,{
    method:'POST',headers:{'x-api-key':key},
  });
  const {payload}=await parseResponse(response);
  if(!response.ok)throw new Error(`Roblox private enforcement failed HTTP ${response.status}: ${errText(payload)}`);
  const check=await fetchImpl(`https://develop.roblox.com/v1/universes/${universeId}`);
  const checked=await parseResponse(check);
  if(check.ok){
    const active=checked.payload?.isActive??checked.payload?.IsActive??checked.payload?.isUniverseActive??checked.payload?.IsUniverseActive;
    if(active===true)throw new Error('Roblox private enforcement verification says universe is active/public');
  }
  return Object.freeze({private:true});
}

export async function publishRobloxDedicatedPlace({
  universeId,placeId,placeFile,
  apiKey=process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  fetchImpl=globalThis.fetch,
  retryDelaysMs=[3000,8000,15000,30000,60000,90000,120000,180000],
}={}){
  if(!validId(universeId)||!validId(placeId))throw new Error('publish target ids invalid');
  const key=clean(apiKey);
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required');
  if(!placeFile||!fs.existsSync(placeFile))throw new Error('place file missing');
  const body=fs.readFileSync(placeFile);
  // [이미지 정책] 모든 기존 전용 게시 경로에서 알려진 제재 이미지 연결을 검사한다.
  const contentSafety=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'))
    .livingMotionVisualQualityContract.assetAdaptation.contentSafety;
  if(contentSafety?.enabled!==true)throw new Error('IMAGE_CONTENT_SAFETY_POLICY_REQUIRED');
  const artifactText=body.toString('utf8');
  for(const row of contentSafety.blockedAssets){
    for(const assetId of row.assetIds||[]){
      if(new RegExp('(^|[^0-9])'+String(assetId)+'([^0-9]|$)').test(artifactText))
        throw new Error('REMOVED_IMAGE_ID_IN_PUBLISH_ARTIFACT:'+assetId);
    }
  }
  const ext=placeFile.toLowerCase().endsWith('.rbxlx')?'application/xml':'application/octet-stream';
  const endpoint=`https://apis.roblox.com/universes/v1/${universeId}/places/${placeId}/versions?versionType=Published`;
  for(let i=0;i<=retryDelaysMs.length;i+=1){
    const response=await fetchImpl(endpoint,{method:'POST',headers:{'x-api-key':key,'content-type':ext},body});
    const {payload}=await parseResponse(response);
    if(response.ok){
      const versionNumber=Number(payload?.versionNumber);
      if(!Number.isInteger(versionNumber)||versionNumber<=0)throw new Error('Roblox publish response missing versionNumber');
      return Object.freeze({published:true,versionNumber,endpoint});
    }
    const detail=errText(payload);
    const transient=response.status===409&&/server is busy|unable to process your upload request/i.test(detail);
    if(transient&&i<retryDelaysMs.length){await sleep(retryDelaysMs[i]);continue;}
    if(response.status===401||response.status===403){
      try{
        const scope=await introspectRobloxApiKey({apiKey:key,fetchImpl});
        console.log('ROBLOX_API_KEY_SCOPE='+JSON.stringify(scope));
      }catch(error){
        console.log('ROBLOX_API_KEY_SCOPE_DIAGNOSTIC_FAILED='+String(error?.message||error));
      }
    }
    throw new Error(`Roblox publish failed HTTP ${response.status}: ${detail}`);
  }
  throw new Error('Roblox publish retry loop exhausted');
}

function sha256(file){
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const a=argv[i]; if(!a.startsWith('--'))continue;
    const [k,v]=a.slice(2).split('=',2); out[k]=v??argv[++i];
  }
  return out;
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  const gameId=clean(args['game-id']);
  const gameName=clean(args['game-name']);
  const placeFile=clean(args['place-file']);
  const output=clean(args.output);
  const sourceRevision=clean(args['source-revision']);
  const avatarRig=clean(args['avatar-rig']);
  const reuseUniverseId=clean(args['reuse-universe-id']);
  const reusePlaceId=clean(args['reuse-place-id']);
  if(!gameId||!gameName||!placeFile||!output||!sourceRevision)throw new Error('game-id, game-name, place-file, output, source-revision required');
  // [인증] R15 전용 설정은 API 키로 입증되지 않아, 다른 계정 쿠키를 쓰는 대신 새 체험 생성을 차단한다.
  if(avatarRig==='R15'&&clean(process.env.ROBLOX_OPEN_CLOUD_API_KEY))
    throw new Error('ROBLOX_R15_OWNER_STUDIO_CONFIGURATION_REQUIRED_API_KEY_ONLY');
  const result={
    version:1,gameId,gameName,sourceRevision,
    artifactIdentity:`sha256:${sha256(placeFile)}`,
    universeId:validId(reuseUniverseId)?reuseUniverseId:null,
    placeId:validId(reusePlaceId)?reusePlaceId:null,
    reusedTarget:validId(reuseUniverseId)&&validId(reusePlaceId),
    created:false,configured:false,private:false,published:false,versionNumber:null,
    stage:'STARTED',checkedAt:new Date().toISOString(),
    authority:'owner-dedicated-roblox-experience-bootstrap',
  };
  const write=()=>fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  write();
  try{
    if(!result.reusedTarget){
      result.stage='CREATE_EXPERIENCE'; write();
      const created=await createRobloxDedicatedExperience();
      result.universeId=created.universeId; result.placeId=created.placeId; result.created=true; write();
    }
    result.stage='CONFIGURE_EXPERIENCE'; write();
    const configured=await configureRobloxExperience({
      universeId:result.universeId,avatarRig,
      name:gameName,
      description:`Private internal build for ${gameName}. Managed from hans1177/jaewoon-games.`,
    });
    if(configured.avatarRig){result.avatarRig=configured.avatarRig;console.log('ROBLOX_DEDICATED_AVATAR_RIG='+configured.avatarRig);}
    result.configured=true; write();
    result.stage='ENFORCE_PRIVATE'; write();
    await ensureRobloxExperiencePrivate({universeId:result.universeId});
    result.private=true; write();
    result.stage='PUBLISH_PLACE'; write();
    const published=await publishRobloxDedicatedPlace({
      universeId:result.universeId,placeId:result.placeId,placeFile,
    });
    result.published=true; result.versionNumber=published.versionNumber;
    if(gameId==='fantasy-survival'&&avatarRig==='R15'){
      result.stage='POST_PUBLISH_VERIFY';write();
      try{
        const {probeRobloxOpenCloudEngine}=await import('./company-development-roblox-runtime-foundation.mjs');
        const proof=await probeRobloxOpenCloudEngine({
          universeId:result.universeId,placeId:result.placeId,versionNumber:result.versionNumber,
          apiKey:process.env.ROBLOX_OPEN_CLOUD_API_KEY,maxPolls:24,pollIntervalMs:1000,
          expectedCombatActions:['U:JAB_LEFT','U:UPPERCUT_RIGHT','U:ROUND_KICK_R','U:ELBOW_RIGHT']
        });
        const exact=proof.engineExecuted===true&&proof.exactPlace===true&&proof.exactVersion===true&&proof.serverContextExecuted===true;
        result.postPublishQa={exactPublishedVersionVerified:exact,avatarRigConfigured:'R15',
          state:proof.state||'UNVERIFIED',error:proof.error||proof.errorMessage||null,motionProbe:proof.motionProbe||null,realPlayerGameplayVerified:false,clientMotionPlaybackVerified:false,
          authority:'roblox-open-cloud-exact-place-version-luau-task',checkedAt:new Date().toISOString()};
        console.log('FOREST_POST_PUBLISH_EXACT_VERSION='+(exact?'PASS':'UNVERIFIED'));
        console.log('FOREST_MOTION_PROBE='+JSON.stringify(proof.motionProbe||null));
        if(proof.error||proof.errorMessage)console.log('FOREST_POST_PUBLISH_ERROR='+JSON.stringify(proof.error||proof.errorMessage));
      }catch(error){
        result.postPublishQa={exactPublishedVersionVerified:false,avatarRigConfigured:'R15',
          realPlayerGameplayVerified:false,clientMotionPlaybackVerified:false,error:String(error?.message||error).slice(0,220)};
        console.log('FOREST_POST_PUBLISH_EXACT_VERSION=UNVERIFIED');
      }
      write();
    }
    result.stage='PASS'; result.pass=true; result.completedAt=new Date().toISOString(); write();
    console.log(`ROBLOX_DEDICATED_EXPERIENCE_PASS=${gameId}`);
    console.log(`ROBLOX_DEDICATED_UNIVERSE_ID=${result.universeId}`);
    console.log(`ROBLOX_DEDICATED_PLACE_ID=${result.placeId}`);
    console.log(`ROBLOX_DEDICATED_VERSION=${result.versionNumber}`);
  }catch(error){
    result.pass=false; result.error=String(error?.message||error); result.failedAt=new Date().toISOString(); write();
    console.error(`ROBLOX_DEDICATED_EXPERIENCE_FAILED=${gameId}:${result.stage}:${result.error}`);
    process.exitCode=1;
  }
}

if(import.meta.url===`file://${process.argv[1]}`)main();
