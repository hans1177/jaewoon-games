import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const clean=v=>String(v??'').trim();
const required=['SERVER_BOOT','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT','CAMERA_READY','INPUT_READY','MOVEMENT_CONFIRMED'];

export function validateRobloxRuntimeFoundationEvidence({sentinel={},gameId='',placeId='',versionNumber=0}={}){
  const checkpoints=sentinel&&typeof sentinel.checkpoints==='object'&&sentinel.checkpoints?sentinel.checkpoints:{};
  const exactGame=!clean(gameId)||clean(sentinel.gameId)===clean(gameId);
  const exactPlace=clean(sentinel.placeId)===clean(placeId);
  const exactVersion=Number(sentinel.placeVersion)===Number(versionNumber)&&Number(versionNumber)>0;
  const checkpointPass=Object.fromEntries(required.map(name=>[name,Boolean(checkpoints[name]&&Number(checkpoints[name].at)>0)]));
  const f1=checkpointPass.SERVER_BOOT;
  const f2=checkpointPass.WORLD_READY&&checkpointPass.SPAWN_READY;
  const f3=checkpointPass.CHARACTER_READY;
  const f4=checkpointPass.GROUND_CONTACT&&checkpointPass.CAMERA_READY&&checkpointPass.INPUT_READY&&checkpointPass.MOVEMENT_CONFIRMED;
  const pass=exactGame&&exactPlace&&exactVersion&&f1&&f2&&f3&&f4;
  return Object.freeze({
    version:1,platform:'ROBLOX',gameId:clean(gameId)||clean(sentinel.gameId),placeId:clean(placeId),placeVersion:Number(versionNumber)||0,
    exactGame,exactPlace,exactVersion,requiredCheckpoints:required,checkpointPass:Object.freeze(checkpointPass),
    f1ServerBootPassed:f1,f2WorldFoundationPassed:f2,f3CharacterFoundationPassed:f3,f4PhysicsAndMovementPassed:f4,
    runtimeFoundationPassed:pass,actualRuntimeEvidence:true,state:pass?'PASS':'BLOCKED',
    blockers:Object.freeze([
      ...(!exactGame?['exactGame']:[]),...(!exactPlace?['exactPlace']:[]),...(!exactVersion?['exactVersion']:[]),
      ...required.filter(name=>!checkpointPass[name]).map(name=>'checkpoint:'+name)
    ]),
    authority:'roblox-runtime-foundation-sentinel'
  });
}

export async function fetchRobloxRuntimeFoundationEvidence({universeId='',apiKey='',datastoreName='native-foundation-sentinel-v1',entryKey='latest',scope='global'}={}){
  const universe=clean(universeId),key=clean(apiKey);
  if(!/^[1-9][0-9]*$/.test(universe))throw new Error('valid universeId required');
  if(!key)throw new Error('ROBLOX_OPEN_CLOUD_API_KEY required');
  const url=new URL(`https://apis.roblox.com/datastores/v1/universes/${universe}/standard-datastores/datastore/entries/entry`);
  url.searchParams.set('datastoreName',datastoreName);url.searchParams.set('entryKey',entryKey);url.searchParams.set('scope',scope);
  const response=await fetch(url,{headers:{'x-api-key':key}});
  const text=await response.text();
  if(!response.ok)throw new Error(`ROBLOX_FOUNDATION_DATASTORE_HTTP_${response.status}:${text.slice(0,300)}`);
  try{return JSON.parse(text);}catch{throw new Error('ROBLOX_FOUNDATION_DATASTORE_INVALID_JSON');}
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
  if(!result.runtimeFoundationPassed)process.exitCode=2;
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});}
