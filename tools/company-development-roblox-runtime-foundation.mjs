import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const clean=v=>String(v??'').trim();
const baseRequired=['SERVER_BOOT','MODULE_GRAPH_READY','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT','CAMERA_READY','INPUT_READY','MOVEMENT_CONFIRMED','REMOTE_ROUNDTRIP','CORE_LOOP_READY'];
const foundationCausalOrder=['SERVER_BOOT','MODULE_GRAPH_READY','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT'];
export const ROBLOX_LUAU_EXECUTION_WRITE_SCOPE='universe.place.luau-execution-session:write';

export function validateRobloxRuntimeFoundationEvidence({sentinel={},gameId='',placeId='',versionNumber=0}={}){
  const checkpoints=sentinel&&typeof sentinel.checkpoints==='object'&&sentinel.checkpoints?sentinel.checkpoints:{};
  const requirements=sentinel&&typeof sentinel.requirements==='object'&&sentinel.requirements?sentinel.requirements:{};
  const saveEnabled=requirements.saveEnabled===true;
  const multiplayerRequired=requirements.multiplayerRequired===true;
  const required=[...baseRequired,...(saveEnabled?['SAVE_ROUNDTRIP']:[]),...(multiplayerRequired?['MULTIPLAYER_SYNC']:[])];
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
    const multiplayerObservation=name!=='MULTIPLAYER_SYNC'||Number(row?.participantCount)>=2;
    return[name,exactRuntimeRow&&multiplayerObservation];
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
  const f7=!multiplayerRequired||checkpointPass.MULTIPLAYER_SYNC;
  const f8=checkpointPass.CORE_LOOP_READY;
  const foundation=exactGame&&exactPlace&&exactVersion&&checkpointOrderPassed&&f1&&f2&&f3&&f4;
  const developmentContinuation=foundation&&f5&&f6&&f8;
  const acceptance=developmentContinuation&&f7;
  return Object.freeze({
    version:3,platform:'ROBLOX',gameId:clean(gameId)||clean(sentinel.gameId),placeId:clean(placeId),placeVersion:Number(versionNumber)||0,
    exactGame,exactPlace,exactVersion,requirements:Object.freeze({saveEnabled,multiplayerRequired}),
    requiredCheckpoints:Object.freeze(required),checkpointPass:Object.freeze(checkpointPass),checkpointOrderPassed,foundationCausalOrder:Object.freeze([...foundationCausalOrder]),
    f1ServerBootPassed:f1,f2WorldFoundationPassed:f2,f3CharacterFoundationPassed:f3,f4PhysicsAndMovementPassed:f4,
    f5InputCameraUiPassed:f5,f6CoreServicesPassed:f6,f7MultiplayerFoundationPassed:f7,f8GameplaySystemsPassed:f8,
    runtimeFoundationPassed:foundation,developmentContinuationPassed:developmentContinuation,runtimeAcceptancePassed:acceptance,multiplayerPromotionPending:multiplayerRequired&&!f7,actualRuntimeEvidence:true,state:acceptance?'PASS':developmentContinuation?'DEVELOPMENT_CONTINUES_MULTIPLAYER_PENDING':foundation?'FOUNDATION_PASS_ACCEPTANCE_PENDING':'BLOCKED',
    blockers:Object.freeze([
      ...(!exactGame?['exactGame']:[]),...(!exactPlace?['exactPlace']:[]),...(!exactVersion?['exactVersion']:[]),
      ...(!checkpointOrderPassed?['checkpointOrder']:[]),
      ...required.filter(name=>!checkpointPass[name]).map(name=>'checkpoint:'+name)
    ]),
    authority:'roblox-runtime-foundation-sentinel'
  });
}
export async function fetchRobloxRuntimeFoundationEvidence({universeId='',apiKey='',datastoreName='native-foundation-sentinel-v1',entryKey='latest'}={}){
  const universe=clean(universeId),key=clean(apiKey),store=clean(datastoreName),entry=clean(entryKey);
  if(!/^[1-9][0-9]*$/.test(universe))throw new Error('valid universeId required');
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required');
  if(!store||!entry)throw new Error('datastoreName and entryKey required');
  const url=`https://apis.roblox.com/cloud/v2/universes/${encodeURIComponent(universe)}/data-stores/${encodeURIComponent(store)}/entries/${encodeURIComponent(entry)}`;
  const response=await fetch(url,{headers:{'x-api-key':key}});
  const text=await response.text();
  if(response.status===401||response.status===403)throw new Error(`ROBLOX_FOUNDATION_DATASTORE_PERMISSION_DENIED:requires universe-datastores.objects:read:HTTP_${response.status}:${text.slice(0,220)}`);
  if(!response.ok)throw new Error(`ROBLOX_FOUNDATION_DATASTORE_HTTP_${response.status}:${text.slice(0,300)}`);
  let body;try{body=JSON.parse(text);}catch{throw new Error('ROBLOX_FOUNDATION_DATASTORE_INVALID_JSON');}
  return body&&typeof body.value==='object'&&body.value!==null?body.value:body;
}

export async function probeRobloxOpenCloudEngine({
  universeId='',placeId='',versionNumber=0,apiKey='',fetchImpl=globalThis.fetch,pollIntervalMs=1000,maxPolls=30,expectedStudioAssetBinding=null,
}={}){
  const universe=clean(universeId),place=clean(placeId),version=Number(versionNumber),key=clean(apiKey);
  if(!/^[1-9][0-9]*$/.test(universe))throw new Error('valid universeId required');
  if(!/^[1-9][0-9]*$/.test(place))throw new Error('valid placeId required');
  if(!Number.isInteger(version)||version<=0)throw new Error('valid versionNumber required');
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required');
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  const expectedStudioAssetAtoms=[...new Set(Object.values(expectedStudioAssetBinding?.families||{}).flat().map(clean).filter(Boolean))].sort();
  const studioAssetBindingRequired=expectedStudioAssetBinding?.applied===true;
  const expectedStudioAssetAtomCsv=expectedStudioAssetAtoms.join(',');
  const script=[
    'local Players=game:GetService("Players")',
    'local ReplicatedStorage=game:GetService("ReplicatedStorage")',
    'local studioAssetApplied=false',
    'local studioAssetBindingVersion=0',
    'local studioAssetAtoms={}',
    'local shared=ReplicatedStorage:FindFirstChild("Shared")',
    'local configModule=shared and shared:FindFirstChild("GameConfig")',
    'if configModule and configModule:IsA("ModuleScript") then local ok,config=pcall(require,configModule); if ok and type(config)=="table" and type(config.StudioAssets)=="table" then studioAssetApplied=config.StudioAssets.Applied==true; studioAssetBindingVersion=tonumber(config.StudioAssets.BindingVersion) or 0; if type(config.StudioAssets.Families)=="table" then for _,family in pairs(config.StudioAssets.Families) do if type(family)=="table" then for _,atom in ipairs(family) do if type(atom)=="string" and atom~="" then table.insert(studioAssetAtoms,atom) end end end end end end end',
    'table.sort(studioAssetAtoms)',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED="..tostring(studioAssetApplied))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION="..tostring(studioAssetBindingVersion))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS="..table.concat(studioAssetAtoms,","))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_PLACE="..tostring(game.PlaceId))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_VERSION="..tostring(game.PlaceVersion))',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS="..tostring(#Players:GetPlayers()))',
    'local foundationServerBoot=workspace:GetAttribute("Foundation_SERVER_BOOT")==true',
    'for _=1,16 do if foundationServerBoot then break end; task.wait(0.5); foundationServerBoot=workspace:GetAttribute("Foundation_SERVER_BOOT")==true end',
    'print("JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT="..tostring(foundationServerBoot))',
  ].join(';');
  const base=`https://apis.roblox.com/cloud/v2/universes/${encodeURIComponent(universe)}/places/${encodeURIComponent(place)}/versions/${version}`;
  const decode=async(response,label)=>{
    const text=await response.text();
    let body={};try{body=text?JSON.parse(text):{};}catch{throw new Error(`ROBLOX_OPEN_CLOUD_ENGINE_${label}_INVALID_JSON`);}
    return{body,text};
  };
  const created=await fetchImpl(`${base}/luau-execution-session-tasks`,{
    method:'POST',
    headers:{'content-type':'application/json','x-api-key':key},
    body:JSON.stringify({script,timeout:'20s'}),
  });
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
    const response=await fetchImpl(taskUrl,{headers:{'x-api-key':key}});
    const decoded=await decode(response,'TASK');
    const taskErrorMessage=clean(decoded.body?.message);
    const taskRequiredScope=taskErrorMessage.match(/required scope <([^>]+)>/i)?.[1]||ROBLOX_LUAU_EXECUTION_WRITE_SCOPE;
    if(response.status===401||response.status===403)return Object.freeze({available:false,permissionDenied:true,status:response.status,engineExecuted:false,exactPlace:false,exactVersion:false,state:'UNAVAILABLE_PERMISSION',failureStage:'TASK_POLL',requiredScope:taskRequiredScope,errorCode:clean(decoded.body?.code)||null,errorMessage:taskErrorMessage||null});
    if(!response.ok)throw new Error(`ROBLOX_OPEN_CLOUD_ENGINE_TASK_HTTP_${response.status}:${decoded.text.slice(0,300)}`);
    task=decoded.body;
  }
  const state=clean(task?.state).toUpperCase()||'UNKNOWN';
  if(state!=='COMPLETE')return Object.freeze({available:true,permissionDenied:false,status:200,engineExecuted:false,exactPlace:false,exactVersion:false,state,error:task?.error?.message||null,taskPath:rawPath});
  const logsResponse=await fetchImpl(`${taskUrl}/logs?view=STRUCTURED&maxPageSize=100`,{headers:{'x-api-key':key}});
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
  const exactPlace=joined.includes(`JAEWOON_OPEN_CLOUD_ENGINE_PLACE=${place}`);
  const exactVersion=joined.includes(`JAEWOON_OPEN_CLOUD_ENGINE_VERSION=${version}`);
  const serverBootObserved=joined.includes('JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT=true');
  const studioAssetApplied=joined.includes('JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED=true');
  const studioAssetBindingVersion=Number(joined.match(/JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION=(\d+)/)?.[1]||0);
  const observedStudioAssetAtomCsv=clean(joined.match(/JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS=([^\n]*)/)?.[1]||'');
  const observedStudioAssetAtoms=[...new Set(observedStudioAssetAtomCsv.split(',').map(clean).filter(Boolean))].sort();
  const observedAtomSet=new Set(observedStudioAssetAtoms);
  const studioAssetSelectionMatched=!studioAssetBindingRequired||(expectedStudioAssetAtoms.length>0&&studioAssetApplied&&studioAssetBindingVersion===1&&expectedStudioAssetAtoms.every(atom=>observedAtomSet.has(atom)));
  return Object.freeze({
    available:true,permissionDenied:false,status:200,engineExecuted:true,exactPlace,exactVersion,serverBootObserved,
    playerCount:Number(joined.match(/JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS=(\d+)/)?.[1]||0),
    studioAssetBindingRequired,studioAssetApplied,studioAssetBindingVersion,
    expectedStudioAssetAtoms:Object.freeze(expectedStudioAssetAtoms),observedStudioAssetAtoms:Object.freeze(observedStudioAssetAtoms),
    expectedStudioAssetAtomCsv,observedStudioAssetAtomCsv,studioAssetSelectionMatched,
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
