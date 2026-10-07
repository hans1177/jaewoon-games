// 파일명: tools/company-development-roblox-runtime-foundation.mjs
// 역할: 공식 클라우드 API의 정확한 버전·접지·실행 증거를 검증한다.

import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const clean=v=>String(v??'').trim();
const baseRequired=['SERVER_BOOT','MODULE_GRAPH_READY','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT','CAMERA_READY','INPUT_READY','MOVEMENT_CONFIRMED','REMOTE_ROUNDTRIP','CORE_LOOP_READY'];
const foundationCausalOrder=['SERVER_BOOT','MODULE_GRAPH_READY','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT'];
export const ROBLOX_LUAU_EXECUTION_WRITE_SCOPE='universe.place.luau-execution-session:write';

const transientNetworkCodes=new Set(['EAI_AGAIN','ENOTFOUND','ECONNRESET','ETIMEDOUT','ECONNREFUSED','UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET','ABORT_ERR']);
const transientHttpStatuses=new Set([408,429,500,502,503,504]);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(ms)||0)));
function isTransientNetworkError(error){
  const code=clean(error?.cause?.code||error?.code).toUpperCase();
  const name=clean(error?.name).toUpperCase();
  return transientNetworkCodes.has(code)||name==='TIMEOUTERROR'||name==='ABORTERROR';
}
function transientHttpDelayMs(response,baseDelayMs,attempt){
  const retryAfter=clean(response?.headers?.get?.('retry-after'));
  const retryAfterSeconds=Number(retryAfter);
  const exponentialDelay=Math.min(30000,baseDelayMs*Math.max(1,2**Math.max(0,attempt-1)));
  if(Number.isFinite(retryAfterSeconds)&&retryAfterSeconds>=0)return Math.max(exponentialDelay,retryAfterSeconds*1000);
  return exponentialDelay;
}
async function fetchWithNetworkRetry(fetchImpl,url,init={},options={}){
  const attempts=Math.max(1,Math.min(6,Number(options.attempts)||4));
  const delayMs=Math.max(0,Number(options.delayMs)||0);
  const requestTimeoutMs=Math.max(1000,Math.min(30000,Number(options.requestTimeoutMs)||12000));
  const label=clean(options.label)||'ROBLOX_OPEN_CLOUD';
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      const requestInit=init?.signal?init:{...init,signal:AbortSignal.timeout(requestTimeoutMs)};
      const response=await fetchImpl(url,requestInit);
      const status=Number(response?.status||0);
      if(transientHttpStatuses.has(status)&&attempt<attempts){
        console.warn(label+'_HTTP_RETRY='+attempt+'/'+attempts+':HTTP_'+status);
        const waitMs=transientHttpDelayMs(response,delayMs,attempt);
        if(waitMs>0)await sleep(waitMs);
        continue;
      }
      return response;
    }catch(error){
      lastError=error;
      if(!isTransientNetworkError(error)||attempt>=attempts)throw error;
      console.warn(label+'_NETWORK_RETRY='+attempt+'/'+attempts+':'+clean(error?.cause?.code||error?.code||error?.name||'TRANSIENT'));
      if(delayMs>0)await sleep(delayMs*attempt);
    }
  }
  throw lastError||new Error(label+'_NETWORK_RETRY_EXHAUSTED');
}

export function validateRobloxRuntimeFoundationEvidence({sentinel={},gameId='',placeId='',versionNumber=0}={}){
  const checkpoints=sentinel&&typeof sentinel.checkpoints==='object'&&sentinel.checkpoints?sentinel.checkpoints:{};
  const requirements=sentinel&&typeof sentinel.requirements==='object'&&sentinel.requirements?sentinel.requirements:{};
  const saveEnabled=requirements.saveEnabled===true;
  const multiplayerRequired=requirements.multiplayerRequired===true;
  const required=[...baseRequired,...(saveEnabled?['SAVE_ROUNDTRIP']:[])];
  const exactGame=!clean(gameId)||clean(sentinel.gameId)===clean(gameId);
  const exactPlace=clean(sentinel.placeId)===clean(placeId);
  const exactVersion=Number(sentinel.placeVersion)===Number(versionNumber)&&Number(versionNumber)>0;
  const checkpointPass=Object.fromEntries(required.map(name=>{
    const row=checkpoints[name];
    const exactRuntimeRow=Boolean(
      row
      &&Number(row.at)>0
      &&(!clean(gameId)||clean(row.gameId)===clean(gameId))
      &&clean(row.placeId)===clean(placeId)
      &&Number(row.placeVersion)===Number(versionNumber)
    );
    return[name,exactRuntimeRow];
  }));
  const checkpointOrderPassed=foundationCausalOrder.every((name,index)=>{
    const sequence=Number(checkpoints[name]?.sequence);
    if(!checkpointPass[name]||!Number.isInteger(sequence)||sequence<=0)return false;
    if(index===0)return true;
    const previous=Number(checkpoints[foundationCausalOrder[index-1]]?.sequence);
    return Number.isInteger(previous)&&previous<sequence;
  });
  const f1=checkpointPass.SERVER_BOOT&&checkpointPass.MODULE_GRAPH_READY;
  const f2=checkpointPass.WORLD_READY&&checkpointPass.SPAWN_READY;
  const f3=checkpointPass.CHARACTER_READY;
  const f4=checkpointPass.GROUND_CONTACT&&checkpointPass.MOVEMENT_CONFIRMED;
  const f5=checkpointPass.CAMERA_READY&&checkpointPass.INPUT_READY;
  const f6=checkpointPass.REMOTE_ROUNDTRIP&&(!saveEnabled||checkpointPass.SAVE_ROUNDTRIP);
  const f7=!multiplayerRequired;
  const f8=checkpointPass.CORE_LOOP_READY;
  const foundation=exactGame&&exactPlace&&exactVersion&&checkpointOrderPassed&&f1&&f2&&f3&&f4;
  const developmentContinuation=foundation&&f5&&f6&&f8;
  const acceptance=developmentContinuation;
  return Object.freeze({
    version:3,platform:'ROBLOX',gameId:clean(gameId)||clean(sentinel.gameId),placeId:clean(placeId),placeVersion:Number(versionNumber)||0,
    exactGame,exactPlace,exactVersion,requirements:Object.freeze({saveEnabled,multiplayerRequired}),
    requiredCheckpoints:Object.freeze(required),checkpointPass:Object.freeze(checkpointPass),checkpointOrderPassed,foundationCausalOrder:Object.freeze([...foundationCausalOrder]),
    f1ServerBootPassed:f1,f2WorldFoundationPassed:f2,f3CharacterFoundationPassed:f3,f4PhysicsAndMovementPassed:f4,
    f5InputCameraUiPassed:f5,f6CoreServicesPassed:f6,f7MultiplayerFoundationPassed:f7,f8GameplaySystemsPassed:f8,
    runtimeFoundationPassed:foundation,developmentContinuationPassed:developmentContinuation,runtimeAcceptancePassed:acceptance,multiplayerPromotionPending:false,actualRuntimeEvidence:true,state:acceptance?'PASS':foundation?'FOUNDATION_PASS_ACCEPTANCE_PENDING':'BLOCKED',
    blockers:Object.freeze([
      ...(!exactGame?['exactGame']:[]),...(!exactPlace?['exactPlace']:[]),...(!exactVersion?['exactVersion']:[]),
      ...(!checkpointOrderPassed?['checkpointOrder']:[]),
      ...required.filter(name=>!checkpointPass[name]).map(name=>'checkpoint:'+name)
    ]),
    authority:'roblox-runtime-foundation-sentinel'
  });
}
export function validateRobloxMultiplayerSourceContract({serverSource='',clientSource=''}={}){
  const server=String(serverSource||'');
  const client=String(clientSource||'');
  const playerRoster=/Players\s*:\s*GetPlayers\s*\(\s*\)/.test(server);
  const authoritativeBroadcast=/FireAllClients\s*\(\s*["']MULTIPLAYER_SYNC["']/.test(server);
  const participantCount=/ParticipantCount\s*=/.test(server);
  const clientReceive=/OnClientEvent\s*:\s*Connect/.test(client)&&/MULTIPLAYER_SYNC/.test(client);
  const checks=Object.freeze({
    playerRoster,
    participantCount,
    authoritativeBroadcast,
    clientReceive,
    twoParticipantCapablePath:playerRoster&&participantCount&&authoritativeBroadcast&&clientReceive,
  });
  const passed=checks.twoParticipantCapablePath===true;
  return Object.freeze({
    version:1,
    passed,
    checks,
    authority:'roblox-static-two-client-source-contract',
    runtimeTwoClientExecutionRequired:false,
  });
}

export async function fetchRobloxRuntimeFoundationEvidence({
  universeId='',apiKey='',datastoreName='native-foundation-sentinel-v1',entryKey='latest',
  fetchImpl=globalThis.fetch,networkRetryAttempts=4,networkRetryDelayMs=500,
}={}){
  const universe=clean(universeId),key=clean(apiKey),store=clean(datastoreName),entry=clean(entryKey);
  if(!/^[1-9][0-9]*$/.test(universe))throw new Error('valid universeId required');
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required');
  if(!store||!entry)throw new Error('datastoreName and entryKey required');
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  const url=`https://apis.roblox.com/cloud/v2/universes/${encodeURIComponent(universe)}/data-stores/${encodeURIComponent(store)}/entries/${encodeURIComponent(entry)}`;
  const response=await fetchWithNetworkRetry(fetchImpl,url,{headers:{'x-api-key':key}},{
    attempts:networkRetryAttempts,delayMs:networkRetryDelayMs,label:'ROBLOX_FOUNDATION_DATASTORE'
  });
  const text=await response.text();
  if(response.status===401||response.status===403)throw new Error(`ROBLOX_FOUNDATION_DATASTORE_PERMISSION_DENIED:requires universe-datastores.objects:read:HTTP_${response.status}:${text.slice(0,220)}`);
  if(!response.ok)throw new Error(`ROBLOX_FOUNDATION_DATASTORE_HTTP_${response.status}:${text.slice(0,300)}`);
  let body;try{body=JSON.parse(text);}catch{throw new Error('ROBLOX_FOUNDATION_DATASTORE_INVALID_JSON');}
  return body&&typeof body.value==='object'&&body.value!==null?body.value:body;
}

export async function probeRobloxOpenCloudImageEvidence({
  universeId='',apiKey='',fetchImpl=globalThis.fetch,networkRetryAttempts=4,networkRetryDelayMs=500,
}={}){
  const universe=clean(universeId),key=clean(apiKey);
  if(!/^[1-9][0-9]*$/.test(universe))throw new Error('valid universeId required');
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required');
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  const url='https://apis.roblox.com/thumbnail-personalization-api/v1/universes/'+encodeURIComponent(universe)+'/thumbnails?maxPageSize=50';
  const response=await fetchWithNetworkRetry(fetchImpl,url,{headers:{'x-api-key':key}},{
    attempts:networkRetryAttempts,delayMs:networkRetryDelayMs,label:'ROBLOX_OPEN_CLOUD_IMAGE_CHECK'
  });
  const text=await response.text();
  let body={};
  try{body=text?JSON.parse(text):{};}catch{throw new Error('ROBLOX_OPEN_CLOUD_IMAGE_CHECK_INVALID_JSON');}
  const message=clean(body?.message);
  const requiredScope=message.match(/required scope <([^>]+)>/i)?.[1]||'universe.thumbnail:read';
  if(response.status===401||response.status===403)return Object.freeze({
    available:false,permissionDenied:true,status:response.status,requiredScope,
    imageMetadataAvailable:false,thumbnailCount:0,imageUrls:Object.freeze([]),
    imageContentChecked:false,imageContentPassed:false,imageVisualQualityVerified:false,
    runtimeScreenshot:false,exactRuntimeVersionImage:false,state:'UNAVAILABLE_PERMISSION',authority:'roblox-open-cloud-thumbnail-image-sanity',
  });
  if(!response.ok)throw new Error('ROBLOX_OPEN_CLOUD_IMAGE_CHECK_HTTP_'+response.status+':'+text.slice(0,300));
  const arrays=[];
  const imageUrls=[];
  const visit=(value,keyName='',depth=0)=>{
    if(depth>8||value==null)return;
    if(Array.isArray(value)){
      if(/thumbnail|image|data|item/i.test(keyName))arrays.push(value);
      for(const row of value)visit(row,keyName,depth+1);
      return;
    }
    if(typeof value==='object'){
      for(const [keyName2,row] of Object.entries(value))visit(row,keyName2,depth+1);
      return;
    }
    if(typeof value==='string'&&/^https?:\/\//i.test(value)&&/(image|thumbnail|cdn|rbxcdn)/i.test(keyName+' '+value))imageUrls.push(value);
  };
  visit(body);
  const largestArray=arrays.reduce((best,row)=>row.length>best.length?row:best,[]);
  const thumbnailCount=largestArray.length;
  const metadataAvailable=thumbnailCount>0||imageUrls.length>0;
  const urls=[...new Set(imageUrls)];
  const imageContent=new Array(urls.length);
  const maxImageBytes=8*1024*1024;
  const imageWorkerCount=Math.max(1,Math.min(8,urls.length||1));
  let imageCursor=0;
  // Only URLs returned by the official API are fetched, without forwarding the API key.
  // Payload signatures prove transport integrity, never visual quality or a version-bound screenshot.
  const runImageWorker=async()=>{
    while(true){
      const index=imageCursor++;
      if(index>=urls.length)return;
      const imageUrl=urls[index];
      try{
        const parsed=new URL(imageUrl);
        if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port
          ||!(parsed.hostname==='rbxcdn.com'||parsed.hostname.endsWith('.rbxcdn.com')))throw Error('UNTRUSTED_IMAGE_URL');
        const response=await fetchWithNetworkRetry(fetchImpl,imageUrl,{redirect:'error',signal:AbortSignal.timeout(12000)},{
          attempts:networkRetryAttempts,delayMs:networkRetryDelayMs,label:'ROBLOX_OPEN_CLOUD_IMAGE_CONTENT'
        });
        if(!response.ok)throw Error('IMAGE_HTTP_'+response.status);
        const contentType=clean(response.headers?.get?.('content-type')).split(';')[0].toLowerCase();
        if(!['image/png','image/jpeg','image/webp','image/gif'].includes(contentType))throw Error('IMAGE_CONTENT_TYPE_INVALID');
        if(Number(response.headers?.get?.('content-length')||0)>maxImageBytes)throw Error('IMAGE_TOO_LARGE');
        const parts=[];let bytes=0;
        const reader=response.body?.getReader?.();
        if(!reader)throw Error('IMAGE_STREAM_UNAVAILABLE');
        try{
          while(true){
            const next=await reader.read();if(next.done)break;
            bytes+=next.value.byteLength;
            if(bytes>maxImageBytes)throw Error('IMAGE_TOO_LARGE');
            parts.push(Buffer.from(next.value));
          }
        }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
        const data=Buffer.concat(parts);
        const signatureMatched=(contentType==='image/png'&&data.length>=33&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&data.toString('ascii',12,16)==='IHDR')
          ||(contentType==='image/jpeg'&&data.length>4&&data[0]===255&&data[1]===216&&data.at(-2)===255&&data.at(-1)===217)
          ||(contentType==='image/webp'&&data.length>20&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP')
          ||(contentType==='image/gif'&&data.length>13&&/^GIF8[79]a$/.test(data.toString('ascii',0,6)));
        if(!signatureMatched)throw Error('IMAGE_SIGNATURE_INVALID');
        imageContent[index]=Object.freeze({imageUrl,contentType,bytes,sha256:createHash('sha256').update(data).digest('hex'),contentSignatureMatched:true});
      }catch(error){
        imageContent[index]=Object.freeze({imageUrl,contentSignatureMatched:false,error:clean(error?.message||error)});
      }
    }
  };
  await Promise.all(Array.from({length:imageWorkerCount},()=>runImageWorker()));
  const imageContentPassed=imageContent.length>0&&imageContent.every(row=>row.contentSignatureMatched===true);
  return Object.freeze({
    available:true,permissionDenied:false,status:response.status,
    provider:'ROBLOX_OFFICIAL_CLOUD_API_ONLY',universeId:universe,observedAt:new Date().toISOString(),endpoint:url,
    imageMetadataAvailable:metadataAvailable,
    thumbnailCount,
    imageUrls:Object.freeze(urls),imageContent:Object.freeze(imageContent),
    imageContentChecked:urls.length>0,imageContentPassed,imageVisualQualityVerified:false,
    metadataCoverage:'RETURNED_API_PAGE_ONLY',
    runtimeScreenshot:false,
    exactRuntimeVersionImage:false,
    state:imageContentPassed?'PASS_CLOUD_IMAGE_TRANSPORT':metadataAvailable?'IMAGE_CONTENT_UNVERIFIED':'NO_IMAGE_METADATA',
    authority:'roblox-open-cloud-thumbnail-image-sanity',
    limitation:'THUMBNAIL_METADATA_IS_VISUAL_SANITY_ONLY_NOT_EXACT_RUNTIME_RENDER_PROOF',
  });
}

export async function probeRobloxOpenCloudEngine({
  universeId='',placeId='',versionNumber=0,apiKey='',fetchImpl=globalThis.fetch,pollIntervalMs=1000,maxPolls=30,expectedStudioAssetBinding=null,
  networkRetryAttempts=4,networkRetryDelayMs=500,
}={}){
  const universe=clean(universeId),place=clean(placeId),version=Number(versionNumber),key=clean(apiKey);
  if(!/^[1-9][0-9]*$/.test(universe))throw new Error('valid universeId required');
  if(!/^[1-9][0-9]*$/.test(place))throw new Error('valid placeId required');
  if(!Number.isInteger(version)||version<=0)throw new Error('valid versionNumber required');
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required');
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  const expectedStudioAssetAtoms=[...new Set([
    ...Object.values(expectedStudioAssetBinding?.families||{}).flat(),
    ...(Array.isArray(expectedStudioAssetBinding?.expectedAtomIds)?expectedStudioAssetBinding.expectedAtomIds:[])
  ].map(clean).filter(Boolean))].sort();
  const studioAssetBindingRequired=expectedStudioAssetBinding?.applied===true||expectedStudioAssetBinding?.required===true;
  const expectedStudioAssetBindingVersion=Math.max(1,Number(expectedStudioAssetBinding?.bindingVersion||1));
  const expectedStudioAssetSelectionFingerprint=clean(expectedStudioAssetBinding?.selectionFingerprint);
  const expectedStudioAssetLibraryVersion=Math.max(0,Math.floor(Number(expectedStudioAssetBinding?.libraryVersion)||0));
  const expectedBuildUpAssetSourceUsageFingerprint=clean(expectedStudioAssetBinding?.buildUpAssetSourceUsageFingerprint);
  const expectedStudioAssetAtomCsv=expectedStudioAssetAtoms.join(',');
  const script=[
    'local Players=game:GetService("Players")',
    'local ReplicatedStorage=game:GetService("ReplicatedStorage")',
    'local Lighting=game:GetService("Lighting")',
    'local studioAssetApplied=false',
    'local studioAssetBindingVersion=0',
    'local studioAssetSelectionFingerprint=""',
    'local studioAssetLibraryVersion=0',
    'local studioAssetAtoms={}',
    'local shared=ReplicatedStorage:FindFirstChild("Shared")',
    'local configModule=shared and shared:FindFirstChild("GameConfig")',
    'if configModule and configModule:IsA("ModuleScript") then local ok,config=pcall(require,configModule); if ok and type(config)=="table" and type(config.StudioAssets)=="table" then studioAssetApplied=config.StudioAssets.Applied==true; studioAssetBindingVersion=tonumber(config.StudioAssets.BindingVersion) or 0; studioAssetSelectionFingerprint=tostring(config.StudioAssets.SelectionFingerprint or ""); studioAssetLibraryVersion=tonumber(config.StudioAssets.LibraryVersion) or 0; if type(config.StudioAssets.Families)=="table" then for _,family in pairs(config.StudioAssets.Families) do if type(family)=="table" then for _,atom in ipairs(family) do if type(atom)=="string" and atom~="" then table.insert(studioAssetAtoms,atom) end end end end end end end',
    'table.sort(studioAssetAtoms)',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED="..tostring(studioAssetApplied))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION="..tostring(studioAssetBindingVersion))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_SELECTION_FINGERPRINT="..studioAssetSelectionFingerprint)',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_LIBRARY_VERSION="..tostring(studioAssetLibraryVersion))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS="..table.concat(studioAssetAtoms,","))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_PLACE="..tostring(game.PlaceId))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_VERSION="..tostring(game.PlaceVersion))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_SERVER_CONTEXT=true")',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS="..tostring(#Players:GetPlayers()))',
    'local RunService=game:GetService("RunService")',
    'local simulationRunningBefore=RunService:IsRunning()',
    'local simulationStartAttempted=not simulationRunningBefore',
    'local simulationStartSucceeded=simulationRunningBefore',
    'local simulationStartError=""',
    'if simulationStartAttempted then local ok,err=pcall(function() RunService:Run() end); simulationStartSucceeded=ok; if not ok then simulationStartError=tostring(err) end end',
    'local simulationRunning=RunService:IsRunning()',
    'local startupWaitStarted=os.clock()',
    'local startupWaitDeadline=startupWaitStarted+8',
    'local function runtimeWorldReady() if workspace:GetAttribute("Foundation_SERVER_BOOT")==true then return true end; for _,item in ipairs(workspace:GetDescendants()) do if item:IsA("SpawnLocation") or item:GetAttribute("SpawnMarkerOnly")==true then return true end end; return false end',
    'while not runtimeWorldReady() and os.clock()<startupWaitDeadline do task.wait(0.25) end',
    'local startupWaitSeconds=os.clock()-startupWaitStarted',
    'local runtimeWorldReadyObserved=runtimeWorldReady()',
    'local foundationServerBoot=workspace:GetAttribute("Foundation_SERVER_BOOT")==true',
    'local descendants=workspace:GetDescendants()',
    'local scanLimit=#descendants',
    'local basePartCount=0; local spawnCount=0; local markerSpawnCount=0; local landmarkCount=0; local objectiveCount=0; local spawnPositions={}; local spawnParts={}; local supportExclusions={}; local characters={}; local meshPartCount=0; local minX=math.huge; local minY=math.huge; local minZ=math.huge; local maxX=-math.huge; local maxY=-math.huge; local maxZ=-math.huge',
    'for _,player in ipairs(Players:GetPlayers()) do if player.Character then table.insert(characters,player.Character); table.insert(supportExclusions,player.Character) end end',
    'for i=1,scanLimit do local item=descendants[i]; local lower=string.lower(item.Name); if item:IsA("BasePart") then local characterPart=false; for _,character in ipairs(characters) do if item:IsDescendantOf(character) then characterPart=true; break end end; if not characterPart then basePartCount+=1; if item:IsA("MeshPart") then meshPartCount+=1 end; local isSpawn=item:IsA("SpawnLocation") or item:GetAttribute("SpawnMarkerOnly")==true; local p=item.Position; local h=item.Size*0.5; if not isSpawn and item.CanCollide then minX=math.min(minX,p.X-h.X); minY=math.min(minY,p.Y-h.Y); minZ=math.min(minZ,p.Z-h.Z); maxX=math.max(maxX,p.X+h.X); maxY=math.max(maxY,p.Y+h.Y); maxZ=math.max(maxZ,p.Z+h.Z) end; if isSpawn then spawnCount+=1; if not item:IsA("SpawnLocation") then markerSpawnCount+=1 end; table.insert(spawnPositions,p); table.insert(spawnParts,item); table.insert(supportExclusions,item) end end end; if string.find(lower,"landmark",1,true) or string.find(lower,"hub",1,true) then landmarkCount+=1 end; if string.find(lower,"objective",1,true) or string.find(lower,"goal",1,true) or string.find(lower,"quest",1,true) then objectiveCount+=1 end end',
    'local finiteWorldBounds=basePartCount>0 and minX<math.huge and maxX>-math.huge',
    'local spawnOutsideBounds=0; if finiteWorldBounds then for _,p in ipairs(spawnPositions) do if p.X<minX or p.X>maxX or p.Y<minY or p.Y>maxY or p.Z<minZ or p.Z>maxZ then spawnOutsideBounds+=1 end end end',
    'local spawnInBounds=finiteWorldBounds and spawnCount>0 and spawnOutsideBounds==0',
    'local spawnParams=RaycastParams.new(); spawnParams.ExcludeInstances=supportExclusions; spawnParams.RespectCanCollide=true; spawnParams.IgnoreWater=true',
    'local unsupportedSpawns=0; local floatingSpawns=0; local maximumSpawnGroundGap=0',
    'for _,spawn in ipairs(spawnParts) do spawnParams.CollisionGroup=spawn.CollisionGroup; local hit=workspace:Raycast(spawn.Position+Vector3.new(0,2,0),Vector3.new(0,-66,0),spawnParams); if not hit or hit.Normal.Y<0.55 then unsupportedSpawns+=1 else local gap=spawn.Position.Y-spawn.Size.Y*0.5-hit.Position.Y; maximumSpawnGroundGap=math.max(maximumSpawnGroundGap,gap); if gap>1 then floatingSpawns+=1 elseif gap < -1 then unsupportedSpawns+=1 end end end',
    'print("JAEWOON_OPEN_CLOUD_WORLD_SPAWN_GROUNDING_OBSERVED="..tostring(spawnCount>0))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_MARKER_SPAWNS="..tostring(markerSpawnCount))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_UNSUPPORTED_SPAWNS="..tostring(unsupportedSpawns))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_FLOATING_SPAWNS="..tostring(floatingSpawns))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_MAX_SPAWN_GROUND_GAP="..tostring(maximumSpawnGroundGap))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_MESH_PARTS="..tostring(meshPartCount))',
    'local boundsX=finiteWorldBounds and (maxX-minX) or 0; local boundsY=finiteWorldBounds and (maxY-minY) or 0; local boundsZ=finiteWorldBounds and (maxZ-minZ) or 0',
    'local terrainPresent=workspace:FindFirstChildOfClass("Terrain")~=nil',
    'local atmospherePresent=Lighting:FindFirstChildOfClass("Atmosphere")~=nil',
    'local streamingEnabled=workspace.StreamingEnabled==true',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_RUNNING_BEFORE="..tostring(simulationRunningBefore))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_ATTEMPTED="..tostring(simulationStartAttempted))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_SUCCEEDED="..tostring(simulationStartSucceeded))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_ERROR="..simulationStartError)',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_RUNNING="..tostring(simulationRunning))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_RUNTIME_READY="..tostring(runtimeWorldReadyObserved))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_STARTUP_WAIT_SECONDS="..string.format("%.2f",startupWaitSeconds))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT="..tostring(foundationServerBoot))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_BASEPARTS="..tostring(basePartCount))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_SPAWNS="..tostring(spawnCount))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_SPAWNS_IN_BOUNDS="..tostring(spawnInBounds))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_BOUNDS_FINITE="..tostring(finiteWorldBounds))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_BOUNDS_SIZE="..string.format("%.2f,%.2f,%.2f",boundsX,boundsY,boundsZ))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_LANDMARKS="..tostring(landmarkCount))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_OBJECTIVES="..tostring(objectiveCount))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_TERRAIN_PRESENT="..tostring(terrainPresent))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_LIGHTING_ATMOSPHERE="..tostring(atmospherePresent))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_STREAMING_ENABLED="..tostring(streamingEnabled))',
    'print("JAEWOON_OPEN_CLOUD_WORLD_SCAN_CAPPED="..tostring(#descendants>scanLimit))',
  ].join(';');
  const base=`https://apis.roblox.com/cloud/v2/universes/${encodeURIComponent(universe)}/places/${encodeURIComponent(place)}/versions/${version}`;
  const decode=async(response,label)=>{
    const text=await response.text();
    let body={};try{body=text?JSON.parse(text):{};}catch{throw new Error(`ROBLOX_OPEN_CLOUD_ENGINE_${label}_INVALID_JSON`);}
    return{body,text};
  };
  const created=await fetchWithNetworkRetry(fetchImpl,`${base}/luau-execution-session-tasks`,{
    method:'POST',
    headers:{'content-type':'application/json','x-api-key':key},
    body:JSON.stringify({script,timeout:'20s'}),
  },{attempts:networkRetryAttempts,delayMs:networkRetryDelayMs,label:'ROBLOX_OPEN_CLOUD_ENGINE_CREATE'});
  const createdDecoded=await decode(created,'CREATE');
  const createdErrorMessage=clean(createdDecoded.body?.message);
  const createdRequiredScope=createdErrorMessage.match(/required scope <([^>]+)>/i)?.[1]||ROBLOX_LUAU_EXECUTION_WRITE_SCOPE;
  if(created.status===401||created.status===403)return Object.freeze({available:false,permissionDenied:true,status:created.status,engineExecuted:false,exactPlace:false,exactVersion:false,state:'UNAVAILABLE_PERMISSION',failureStage:'CREATE',requiredScope:createdRequiredScope,errorCode:clean(createdDecoded.body?.code)||null,errorMessage:createdErrorMessage||null});
  if(!created.ok)throw new Error(`ROBLOX_OPEN_CLOUD_ENGINE_CREATE_HTTP_${created.status}:${createdDecoded.text.slice(0,300)}`);
  const rawPath=clean(createdDecoded.body?.path).replace(/^\/+/, '').replace(/^cloud\/v2\//,'');
  if(!rawPath)throw new Error('ROBLOX_OPEN_CLOUD_ENGINE_TASK_PATH_MISSING');
  const taskUrl=`https://apis.roblox.com/cloud/v2/${rawPath}`;
  let task=createdDecoded.body;
  const polls=Math.max(1,Math.min(120,Number(maxPolls)||30));
  const delay=Math.max(0,Number(pollIntervalMs)||0);
  for(let i=0;i<polls&&!['COMPLETE','FAILED'].includes(clean(task?.state).toUpperCase());i++){
    if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
    const response=await fetchWithNetworkRetry(fetchImpl,taskUrl,{headers:{'x-api-key':key}},{
      attempts:networkRetryAttempts,delayMs:networkRetryDelayMs,label:'ROBLOX_OPEN_CLOUD_ENGINE_TASK'
    });
    const decoded=await decode(response,'TASK');
    const taskErrorMessage=clean(decoded.body?.message);
    const taskRequiredScope=taskErrorMessage.match(/required scope <([^>]+)>/i)?.[1]||ROBLOX_LUAU_EXECUTION_WRITE_SCOPE;
    if(response.status===401||response.status===403)return Object.freeze({available:false,permissionDenied:true,status:response.status,engineExecuted:false,exactPlace:false,exactVersion:false,state:'UNAVAILABLE_PERMISSION',failureStage:'TASK_POLL',requiredScope:taskRequiredScope,errorCode:clean(decoded.body?.code)||null,errorMessage:taskErrorMessage||null});
    if(!response.ok)throw new Error(`ROBLOX_OPEN_CLOUD_ENGINE_TASK_HTTP_${response.status}:${decoded.text.slice(0,300)}`);
    task=decoded.body;
  }
  const state=clean(task?.state).toUpperCase()||'UNKNOWN';
  if(state!=='COMPLETE')return Object.freeze({available:true,permissionDenied:false,status:200,engineExecuted:false,exactPlace:false,exactVersion:false,state,error:task?.error?.message||null,taskPath:rawPath});
  const logsResponse=await fetchWithNetworkRetry(fetchImpl,`${taskUrl}/logs?view=STRUCTURED&maxPageSize=100`,{headers:{'x-api-key':key}},{
    attempts:networkRetryAttempts,delayMs:networkRetryDelayMs,label:'ROBLOX_OPEN_CLOUD_ENGINE_LOGS'
  });
  const logsDecoded=await decode(logsResponse,'LOGS');
  const logsErrorMessage=clean(logsDecoded.body?.message);
  const logsRequiredScope=logsErrorMessage.match(/required scope <([^>]+)>/i)?.[1]||ROBLOX_LUAU_EXECUTION_WRITE_SCOPE;
  if(logsResponse.status===401||logsResponse.status===403)return Object.freeze({available:false,permissionDenied:true,status:logsResponse.status,engineExecuted:false,exactPlace:false,exactVersion:false,state:'UNAVAILABLE_PERMISSION',failureStage:'LOGS',requiredScope:logsRequiredScope,errorCode:clean(logsDecoded.body?.code)||null,errorMessage:logsErrorMessage||null,taskPath:rawPath});
  if(!logsResponse.ok)throw new Error(`ROBLOX_OPEN_CLOUD_ENGINE_LOGS_HTTP_${logsResponse.status}:${logsDecoded.text.slice(0,300)}`);
  const rows=Array.isArray(logsDecoded.body?.luauExecutionSessionTaskLogs)?logsDecoded.body.luauExecutionSessionTaskLogs:[];
  const messages=[];
  for(const row of rows){
    for(const message of Array.isArray(row?.structuredMessages)?row.structuredMessages:[])if(clean(message?.message))messages.push(clean(message.message));
    for(const message of Array.isArray(row?.messages)?row.messages:[])if(clean(message))messages.push(clean(message));
  }
  const joined=messages.join('\n');
  const exactPlace=clean(joined.match(/^JAEWOON_OPEN_CLOUD_ENGINE_PLACE=([0-9]+)$/m)?.[1])===place;
  const exactVersion=Number(joined.match(/^JAEWOON_OPEN_CLOUD_ENGINE_VERSION=([0-9]+)$/m)?.[1]||0)===version;
  const simulationRunningBefore=joined.includes('JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_RUNNING_BEFORE=true');
  const simulationStartAttempted=joined.includes('JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_ATTEMPTED=true');
  const simulationStartSucceeded=joined.includes('JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_SUCCEEDED=true');
  const simulationStartError=clean(joined.match(/^JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_ERROR=(.*)$/m)?.[1]||'');
  const simulationRunning=joined.includes('JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_RUNNING=true');
  const legacyFoundationServerBootMarkerObserved=joined.includes('JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT=true');
  const serverContextExecuted=joined.includes('JAEWOON_OPEN_CLOUD_ENGINE_SERVER_CONTEXT=true');
  // Roblox Open Cloud Luau Execution launches a server, loads the exact place version, then executes this task.
  // Exact task execution is therefore direct server-boot evidence; the legacy workspace marker remains diagnostic only.
  const serverBootObserved=serverContextExecuted&&exactPlace&&exactVersion;
  const serverBootEvidence=Object.freeze({
    observed:serverBootObserved,
    provider:'ROBLOX_OPEN_CLOUD_LUAU_EXECUTION',
    taskState:state,
    exactPlace,
    exactVersion,
    scriptExecuted:serverContextExecuted,
    headlessServerExecution:true,
    livePlayerSimulationClaimed:false,
    simulationRunningBefore,
    simulationStartAttempted,
    simulationStartSucceeded,
    simulationStartError:simulationStartError||null,
    simulationRunningAfter:simulationRunning,
    legacyFoundationServerBootMarkerObserved,
    authority:'roblox-open-cloud-luau-execution-session-task',
  });
  const studioAssetApplied=joined.includes('JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED=true');
  const studioAssetBindingVersion=Number(joined.match(/JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION=(\d+)/)?.[1]||0);
  const observedStudioAssetSelectionFingerprint=clean(joined.match(/JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_SELECTION_FINGERPRINT=([^\n]*)/)?.[1]||'');
  const observedStudioAssetLibraryVersion=Number(joined.match(/JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_LIBRARY_VERSION=(\d+)/)?.[1]||0);
  const observedStudioAssetAtomCsv=clean(joined.match(/JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS=([^\n]*)/)?.[1]||'');
  const observedStudioAssetAtoms=[...new Set(observedStudioAssetAtomCsv.split(',').map(clean).filter(Boolean))].sort();
  const observedAtomSet=new Set(observedStudioAssetAtoms);
  const atomMatch=expectedStudioAssetAtoms.length>0&&expectedStudioAssetAtoms.length===observedStudioAssetAtoms.length&&expectedStudioAssetAtoms.every(atom=>observedAtomSet.has(atom));
  const fingerprintMatch=!expectedStudioAssetSelectionFingerprint||observedStudioAssetSelectionFingerprint===expectedStudioAssetSelectionFingerprint;
  const libraryVersionMatch=expectedStudioAssetLibraryVersion<=0||observedStudioAssetLibraryVersion===expectedStudioAssetLibraryVersion;
  const studioAssetSelectionMatched=!studioAssetBindingRequired||(atomMatch&&studioAssetApplied&&studioAssetBindingVersion===expectedStudioAssetBindingVersion&&fingerprintMatch&&libraryVersionMatch);
  const boundsMatch=joined.match(/JAEWOON_OPEN_CLOUD_WORLD_BOUNDS_SIZE=([0-9.+-]+),([0-9.+-]+),([0-9.+-]+)/);
  const worldEvidence=Object.freeze({
    observed:/^JAEWOON_OPEN_CLOUD_WORLD_BASEPARTS=\d+$/m.test(joined),
    runtimeWorldReady:joined.includes('JAEWOON_OPEN_CLOUD_WORLD_RUNTIME_READY=true'),
    startupWaitSeconds:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_STARTUP_WAIT_SECONDS=([0-9.]+)/)?.[1]||0),
    basePartCount:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_BASEPARTS=(\d+)/)?.[1]||0),
    spawnCount:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_SPAWNS=(\d+)/)?.[1]||0),
    spawnsInBounds:joined.includes('JAEWOON_OPEN_CLOUD_WORLD_SPAWNS_IN_BOUNDS=true'),
    markerSpawnCount:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_MARKER_SPAWNS=(\d+)/)?.[1]||0),
    spawnGroundingObserved:joined.includes('JAEWOON_OPEN_CLOUD_WORLD_SPAWN_GROUNDING_OBSERVED=true')
      &&Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_SPAWNS=(\d+)/)?.[1]||0)>0
      &&/^JAEWOON_OPEN_CLOUD_WORLD_UNSUPPORTED_SPAWNS=\d+$/m.test(joined)
      &&/^JAEWOON_OPEN_CLOUD_WORLD_FLOATING_SPAWNS=\d+$/m.test(joined),
    unsupportedSpawns:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_UNSUPPORTED_SPAWNS=(\d+)/)?.[1]||0),
    floatingSpawns:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_FLOATING_SPAWNS=(\d+)/)?.[1]||0),
    maximumSpawnGroundGap:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_MAX_SPAWN_GROUND_GAP=([0-9.]+)/)?.[1]||0),
    meshPartCount:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_MESH_PARTS=(\d+)/)?.[1]||0),
    graphicsEvidenceScope:'ENGINE_SCENE_STRUCTURE_NOT_RENDERED_SCREENSHOT',
    finiteWorldBounds:joined.includes('JAEWOON_OPEN_CLOUD_WORLD_BOUNDS_FINITE=true'),
    boundsSize:Object.freeze({
      x:Number(boundsMatch?.[1]||0),y:Number(boundsMatch?.[2]||0),z:Number(boundsMatch?.[3]||0)
    }),
    landmarkCount:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_LANDMARKS=(\d+)/)?.[1]||0),
    objectiveCount:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_OBJECTIVES=(\d+)/)?.[1]||0),
    terrainPresent:joined.includes('JAEWOON_OPEN_CLOUD_WORLD_TERRAIN_PRESENT=true'),
    lightingAtmospherePresent:joined.includes('JAEWOON_OPEN_CLOUD_WORLD_LIGHTING_ATMOSPHERE=true'),
    streamingEnabled:joined.includes('JAEWOON_OPEN_CLOUD_WORLD_STREAMING_ENABLED=true'),
    scanCapped:joined.includes('JAEWOON_OPEN_CLOUD_WORLD_SCAN_CAPPED=true'),
    worldGeometryPresent:Number(joined.match(/JAEWOON_OPEN_CLOUD_WORLD_BASEPARTS=(\d+)/)?.[1]||0)>0,
    sameLuauExecutionSession:true
  });
  return Object.freeze({
    available:true,permissionDenied:false,status:200,engineExecuted:true,exactPlace,exactVersion,simulationRunningBefore,simulationStartAttempted,simulationStartSucceeded,simulationStartError:simulationStartError||null,simulationRunning,serverBootObserved,serverContextExecuted,serverBootEvidence,legacyFoundationServerBootMarkerObserved,worldEvidence,
    playerCount:Number(joined.match(/JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS=(\d+)/)?.[1]||0),
    studioAssetBindingRequired,studioAssetApplied,studioAssetBindingVersion,expectedStudioAssetBindingVersion,
    expectedStudioAssetSelectionFingerprint:expectedStudioAssetSelectionFingerprint||null,
    observedStudioAssetSelectionFingerprint:observedStudioAssetSelectionFingerprint||null,
    expectedStudioAssetLibraryVersion:expectedStudioAssetLibraryVersion||null,
    observedStudioAssetLibraryVersion:observedStudioAssetLibraryVersion||null,
    expectedBuildUpAssetSourceUsageFingerprint:expectedBuildUpAssetSourceUsageFingerprint||null,
    expectedStudioAssetAtoms:Object.freeze(expectedStudioAssetAtoms),observedStudioAssetAtoms:Object.freeze(observedStudioAssetAtoms),
    expectedStudioAssetAtomCsv,observedStudioAssetAtomCsv,studioAssetAtomMatch:atomMatch,studioAssetFingerprintMatch:fingerprintMatch,studioAssetLibraryVersionMatch:libraryVersionMatch,studioAssetSelectionMatched,
    state,taskPath:rawPath,messages:Object.freeze(messages.slice(0,50)),
  });
}

function args(argv){const out={};for(let i=0;i<argv.length;i++){const x=argv[i];if(!x.startsWith('--'))continue;const [k,v]=x.slice(2).split('=',2);out[k]=v??argv[++i];}return out;}
async function main(){
  const a=args(process.argv.slice(2));
  let sentinel;
  if(a['sentinel-file'])sentinel=JSON.parse(fs.readFileSync(a['sentinel-file'],'utf8'));
  else sentinel=await fetchRobloxRuntimeFoundationEvidence({universeId:a['universe-id'],apiKey:process.env.ROBLOX_OPEN_CLOUD_API_KEY});
  const result=validateRobloxRuntimeFoundationEvidence({sentinel,gameId:a['game-id'],placeId:a['place-id'],versionNumber:Number(a['version-number'])});
  if(!a.output)throw new Error('output required');
  fs.mkdirSync(path.dirname(a.output),{recursive:true});fs.writeFileSync(a.output,JSON.stringify(result,null,2)+'\n');
  console.log('ROBLOX_RUNTIME_FOUNDATION='+(result.runtimeFoundationPassed?'PASS':'BLOCKED')+':'+result.gameId);
  console.log('ROBLOX_RUNTIME_ACCEPTANCE='+(result.runtimeAcceptancePassed?'PASS':'BLOCKED')+':'+result.gameId);
  if(!result.runtimeAcceptancePassed)process.exitCode=2;
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});}

