import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const clean=v=>String(v??'').trim();
const baseRequired=['SERVER_BOOT','MODULE_GRAPH_READY','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT','CAMERA_READY','INPUT_READY','MOVEMENT_CONFIRMED','REMOTE_ROUNDTRIP','CORE_LOOP_READY'];

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
    return[name,Boolean(
      row
      &&Number(row.at)>0
      &&(!clean(gameId)||clean(row.gameId)===clean(gameId))
      &&clean(row.placeId)===clean(placeId)
      &&Number(row.placeVersion)===Number(versionNumber)
    )];
  }));
  const f1=checkpointPass.SERVER_BOOT&&checkpointPass.MODULE_GRAPH_READY;
  const f2=checkpointPass.WORLD_READY&&checkpointPass.SPAWN_READY;
  const f3=checkpointPass.CHARACTER_READY;
  const f4=checkpointPass.GROUND_CONTACT&&checkpointPass.MOVEMENT_CONFIRMED;
  const f5=checkpointPass.CAMERA_READY&&checkpointPass.INPUT_READY;
  const f6=checkpointPass.REMOTE_ROUNDTRIP&&(!saveEnabled||checkpointPass.SAVE_ROUNDTRIP);
  const f7=!multiplayerRequired||checkpointPass.MULTIPLAYER_SYNC;
  const f8=checkpointPass.CORE_LOOP_READY;
  const foundation=exactGame&&exactPlace&&exactVersion&&f1&&f2&&f3&&f4;
  const acceptance=foundation&&f5&&f6&&f7&&f8;
  return Object.freeze({
    version:2,platform:'ROBLOX',gameId:clean(gameId)||clean(sentinel.gameId),placeId:clean(placeId),placeVersion:Number(versionNumber)||0,
    exactGame,exactPlace,exactVersion,requirements:Object.freeze({saveEnabled,multiplayerRequired}),
    requiredCheckpoints:Object.freeze(required),checkpointPass:Object.freeze(checkpointPass),
    f1ServerBootPassed:f1,f2WorldFoundationPassed:f2,f3CharacterFoundationPassed:f3,f4PhysicsAndMovementPassed:f4,
    f5InputCameraUiPassed:f5,f6CoreServicesPassed:f6,f7MultiplayerFoundationPassed:f7,f8GameplaySystemsPassed:f8,
    runtimeFoundationPassed:foundation,runtimeAcceptancePassed:acceptance,actualRuntimeEvidence:true,state:acceptance?'PASS':foundation?'FOUNDATION_PASS_ACCEPTANCE_PENDING':'BLOCKED',
    blockers:Object.freeze([
      ...(!exactGame?['exactGame']:[]),...(!exactPlace?['exactPlace']:[]),...(!exactVersion?['exactVersion']:[]),
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
