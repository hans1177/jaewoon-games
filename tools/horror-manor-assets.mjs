import fs from 'node:fs';
import crypto from 'node:crypto';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';

const root='assets/roblox/midnight-manor/generated';
const file=fs.readFileSync(`${root}/manor-lobby.glb`);
if(file.toString('utf8',0,4)!=='glTF'||file.readUInt32LE(4)!==2)throw Error('INVALID_MANOR_GLB');
const hash=crypto.createHash('sha256').update(file).digest('hex');
const key=process.env.ROBLOX_OPEN_CLOUD_API_KEY;
if(!key)throw Error('ROBLOX_OPEN_CLOUD_API_KEY_MISSING');
const universeId='10767445796';
const headers={'x-api-key':key};
const request=async(url,options={})=>{
 const r=await fetch(url,{...options,signal:AbortSignal.timeout(60000)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(`ROBLOX_HTTP_${r.status}:${new URL(url).pathname}`);
 return d;
};
let creator=null;
// Creator is grounded in the target universe, or a single explicit asset-write scope.
const info=await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`,{signal:AbortSignal.timeout(30000)}).then(r=>r.json());
const owner=info.data?.[0]?.creator;
if(Number(owner?.id)>0)creator={[owner.type==='Group'?'groupId':'userId']:String(owner.id)};
if(!creator){
 const scope=await introspectRobloxApiKey({apiKey:key});
 const candidates=[];
 for(const row of scope.scopes){
  if(!/asset/i.test(row.name)||!(/write|create/i.test(row.name)||row.operations.some(x=>/write|create/i.test(x))))continue;
  for(const id of row.userIds)if(/^[1-9]\d*$/.test(id))candidates.push({userId:id});
  for(const id of row.groupIds)if(/^[1-9]\d*$/.test(id))candidates.push({groupId:id});
 }
 const unique=[...new Map(candidates.map(x=>[JSON.stringify(x),x])).values()];
 if(unique.length!==1)throw Error('MANOR_ASSET_CREATOR_NOT_RESOLVED');
 creator=unique[0];
}
const evidencePath=`${root}/roblox-asset.json`;
let evidence=fs.existsSync(evidencePath)?JSON.parse(fs.readFileSync(evidencePath,'utf8')):null;
if(!evidence||evidence.sha256!==hash||!(Number(evidence.assetId)>0)){
 const form=new FormData();
 form.append('request',JSON.stringify({assetType:'Model',displayName:'Midnight Personal Manor',description:'Original western comic-horror personal lobby. Kenney CC0 props. '+hash.slice(0,12),creationContext:{creator}}));
 form.append('fileContent',new Blob([file],{type:'model/gltf-binary'}),'manor-lobby.glb');
 let operation=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers,body:form});
 const operationPath=operation.path;
 if(!/^operations\/[a-zA-Z0-9-]+$/.test(operationPath||''))throw Error('INVALID_ASSET_OPERATION');
 const deadline=Date.now()+240000;
 while(!operation.done&&Date.now()<deadline){
  await new Promise(r=>setTimeout(r,4000));
  operation=await request(`https://apis.roblox.com/assets/v1/${operationPath}`,{headers});
 }
 const assetId=operation.response?.assetId;
 if(!operation.done||operation.error||!(Number(assetId)>0))throw Error('MANOR_ASSET_IMPORT_FAILED');
 evidence={assetId:String(assetId),sha256:hash,creator,sourceRevision:process.env.GITHUB_SHA,importedAt:new Date().toISOString()};
 fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
}
const bounds=JSON.parse(fs.readFileSync(`${root}/import-bounds.json`,'utf8'));
const music=fs.readFileSync(`${root}/manor-waltz.mp3`);
const musicHash=crypto.createHash('sha256').update(music).digest('hex');
if(evidence.musicSha256!==musicHash||!(Number(evidence.musicId)>0)){
 const form=new FormData();
 form.append('request',JSON.stringify({assetType:'Audio',displayName:'Mortimer Misses a Step',description:'Original instrumental comic horror waltz. No vocals or screams.',creationContext:{creator,expectedPrice:0}}));
 form.append('fileContent',new Blob([music],{type:'audio/mpeg'}),'manor-waltz.mp3');
 let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers,body:form});
 const path=op.path;if(!/^operations\/[a-zA-Z0-9-]+$/.test(path||''))throw Error('INVALID_MUSIC_OPERATION');
 const deadline=Date.now()+240000;
 while(!op.done&&Date.now()<deadline){await new Promise(r=>setTimeout(r,4000));op=await request(`https://apis.roblox.com/assets/v1/${path}`,{headers});}
 if(!op.done||op.error||!(Number(op.response?.assetId)>0))throw Error('MANOR_MUSIC_IMPORT_FAILED');
 evidence.musicId=String(op.response.assetId);evidence.musicSha256=musicHash;
 fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
}
fs.writeFileSync('roblox-games/horror-escape-room/shared/ManorAssets.luau',`-- Verified GLB import; sha256 ${hash}\nreturn {ModelId=${evidence.assetId},LobbyMusicId=${evidence.musicId},SourceWidth=${bounds.width},SourceCenter=Vector3.new(${bounds.center.join(',')})}\n`);
console.log(`MANOR_ASSET_ID=${evidence.assetId}`);
console.log(`MANOR_MUSIC_ID=${evidence.musicId}`);
console.log(`MANOR_GLB_SHA256=${hash}`);
