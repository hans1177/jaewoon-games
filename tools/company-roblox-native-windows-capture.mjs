#!/usr/bin/env node
// Windows-only observer. Never sends player inputs, launches Studio, or reads other windows.
// Authenticated launch of the private capture scene is separate from OS-level recording.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const arg=(key,fallback='')=>{
 const val=process.argv.find(s=>s.startsWith('--'+key+'='));
 return val?val.slice(key.length+3):fallback;
};
const fail=(message)=>{console.error('ROBLOX_CAPTURE_BLOCKED='+message);process.exitCode=1;};
const command=(program,args,timeout=10000)=>spawnSync(program,args,{encoding:'utf8',timeout,maxBuffer:1024*1024});
const readJson=(f)=>JSON.parse(fs.readFileSync(f,'utf8'));
const sha256=(f)=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const allowedGames=new Set(['cozy-island','daechung-rpg','horror-escape-room']);
const gameId=arg('game-id');
const mode=arg('mode','check');
const runtimeRoot=path.resolve(arg('runtime-root',path.join(root,'..','runtime')));
const queueFile=path.join(runtimeRoot,'development-queue.json');
const sameRoot=(dir,file)=>file===dir||file.startsWith(dir+path.sep);
function runtimeTarget(){
 if(!allowedGames.has(gameId))throw Error('UNKNOWN_GAME_ID');
 if(!fs.existsSync(queueFile))throw Error('DURABLE_RUNTIME_QUEUE_MISSING');
 const queue=readJson(queueFile);
 const item=(queue.items||[]).find(x=>x.gameId===gameId);
 const t=item?.robloxPublicationTarget||{};
 if(t.verified!==true||t.dedicated!==true||t.shared===true
   ||String(t.gameId||gameId)!==gameId
   ||!/^[1-9]\d*$/.test(String(t.universeId||''))
   ||!/^[1-9]\d*$/.test(String(t.placeId||'')))throw Error('VERIFIED_PRIVATE_UNIVERSE_REQUIRED');
 return {universeId:String(t.universeId),placeId:String(t.placeId)};
}
function observedNativeNpc(target){
 const base=process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local');
 const folder=path.join(base,'Roblox','logs');
 if(!fs.existsSync(folder))throw Error('ROBLOX_NATIVE_CLIENT_LOG_MISSING');
 const files=fs.readdirSync(folder).filter(f=>f.toLowerCase().endsWith('.log'))
  .map(name=>({file:path.join(folder,name),stat:fs.statSync(path.join(folder,name))}))
  .filter(x=>x.stat.isFile()&&Date.now()-x.stat.mtimeMs<3*60*1000)
  .sort((a,b)=>b.stat.mtimeMs-a.stat.mtimeMs).slice(0,5);
 const prefix='JAEWOON_NATIVE_CAPTURE_READY|'+gameId+'|'+target.universeId+'|'+target.placeId+'|';
 for(const item of files){
  const bytes=fs.readFileSync(item.file);
  const tail=bytes.subarray(Math.max(0,bytes.length-4*1024*1024)).toString('utf8');
  const offset=tail.lastIndexOf(prefix);
  if(offset<0)continue;
  const match=tail.slice(offset+prefix.length).match(/^([1-9][0-9]*)[|]NPC_MOVED[|]([1-9][0-9]*)/);
  if(match)return {placeVersion:match[1],sessionNonce:match[2],clientLogObserved:true};
 }
 throw Error('PRIVATE_NPC_LAUNCH_DATA_OR_NATIVE_MOVE_ATTESTATION_MISSING');
}
function playerWindow(){
 const ps="$ErrorActionPreference='Stop'; $p=@(Get-Process -Name 'RobloxPlayerBeta' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match 'Roblox' }); @($p | ForEach-Object { [pscustomobject]@{pid=$_.Id;hwnd=$_.MainWindowHandle.ToInt64();title=$_.MainWindowTitle} }) | ConvertTo-Json -Compress";
 const out=command('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],15000);
 if(out.status!==0)throw Error('ROBLOX_PROCESS_PROBE_FAILED');
 let windows=[];try{windows=JSON.parse(out.stdout||'[]');}catch{throw Error('ROBLOX_PROCESS_PROBE_INVALID');}
 if(!Array.isArray(windows))windows=[windows];
 if(windows.length!==1)throw Error(windows.length===0?'ROBLOX_PLAYER_VISIBLE_WINDOW_MISSING':'AMBIGUOUS_MULTIPLE_ROBLOX_WINDOWS');
 const w=windows[0];
 if(!Number.isSafeInteger(Number(w.hwnd))||Number(w.hwnd)<=0||!Number.isSafeInteger(Number(w.pid)))throw Error('ROBLOX_WINDOW_HANDLE_INVALID');
 return w;
}
async function run(){
 if(!['check','capture'].includes(mode))throw Error('UNKNOWN_MODE');
 if(process.platform!=='win32')throw Error('WINDOWS_SESSION_REQUIRED');
 const target=runtimeTarget();
 for(const bin of ['ffmpeg','ffprobe']){
  const r=command(bin,['-version'],7000);
  if(r.status!==0)throw Error(bin.toUpperCase()+'_MISSING');
 }
 const window=playerWindow();
 if(mode==='check'){
  console.log('ROBLOX_WINDOWS_CAPTURE_PREREQUISITES=PASS');
  console.log('ROBLOX_CAPTURE_TARGET='+gameId+':universe='+target.universeId);
  console.log('ROBLOX_CAPTURE_SCENE_NOT_VERIFIED=YES');
  return;
 }
 if(process.env.ROBLOX_CAPTURE_AUTHORIZED!=='1')throw Error('EXPLICIT_PRIVATE_CAPTURE_AUTHORIZATION_REQUIRED');
 // Fail closed if the private game did not print its actual engine/NPC motion identity.
 const observed=observedNativeNpc(target);
 const stateRoot=path.join(os.tmpdir(),'jaewoon-native-client-capture');
 fs.mkdirSync(stateRoot,{recursive:true});
 const stateFile=path.join(stateRoot,gameId+'.json');
 if(fs.existsSync(stateFile)){
  const state=readJson(stateFile);
  if(state.sessionNonce===observed.sessionNonce&&state.placeVersion===observed.placeVersion)
   throw Error('NATIVE_GAMEPLAY_SESSION_ALREADY_CAPTURED');
 }
 const duration=Number(arg('seconds','24'));
 if(!Number.isInteger(duration)||duration<8||duration>27)throw Error('DURATION_MUST_BE_8_TO_27_SECONDS');
 const at=new Date().toISOString();
 const stamp=at.replace(/[:.]/g,'-');
 const folder=path.join(runtimeRoot,'assets','runtime-evidence','roblox',gameId,stamp);
 const permitted=path.join(runtimeRoot,'assets','runtime-evidence','roblox',gameId);
 if(!sameRoot(permitted,folder))throw Error('CAPTURE_OUTPUT_PATH_INVALID');
 if(fs.existsSync(folder))throw Error('CAPTURE_DESTINATION_ALREADY_EXISTS');
 fs.mkdirSync(folder,{recursive:true});
 const file=path.join(folder,'capture.mp4');
 // Explicit HWND prevents capturing unrelated personal desktop/windows.
 const result=command('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','gdigrab',
  '-framerate','24','-draw_mouse','0','-i','hwnd='+Math.trunc(Number(window.hwnd)),
  '-t',String(duration),'-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
  '-c:v','libx264','-preset','veryfast','-crf','27','-maxrate','2100k','-bufsize','4200k',
  '-an','-movflags','+faststart',file],Math.max(60,duration+20)*1000);
 if(result.status!==0||!fs.existsSync(file))throw Error('WINDOW_CAPTURE_FAILED:'+String(result.stderr||'').slice(0,180));
 const stat=fs.statSync(file);
 if(stat.size<100*1024||stat.size>25*1024*1024)throw Error('VIDEO_SIZE_UNUSABLE');
 const probe=command('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',file],15000);
 if(probe.status!==0)throw Error('CAPTURE_FFPROBE_FAILED');
 const meta=JSON.parse(probe.stdout||'{}');
 const v=(meta.streams||[]).find(x=>x.codec_type==='video');
 if(!v||v.width!==1280||v.height!==720||Number(meta.format?.duration)<duration-2)throw Error('CAPTURE_VIDEO_NOT_VALIDATED');
 const revision=command('git',['-C',root,'rev-parse','HEAD']).stdout.trim();
 // OS pixels and native process are evidence of a window recording, not proof of
 // exact published revision, in-game actions or successful Roblox gallery upload.
 const proof={
  version:1,gameId,universeId:target.universeId,placeId:target.placeId,
  captureSource:'ROBLOX_WINDOW_RECORDING_PENDING_RUNTIME_ATTESTATION',
  captureAt:at,sourceRevision:/^[a-f0-9]{40}$/.test(revision)?revision:null,
  sha256:sha256(file),artifactIdentity:path.relative(runtimeRoot,file).replaceAll(path.sep,'/'),
  windowProcess:'RobloxPlayerBeta',windowTitleMatched:'Roblox',
  observedNativePlaceVersion:observed.placeVersion,
  nativeCaptureSessionNonce:observed.sessionNonce,
  clientLogObserved:observed.clientLogObserved,
  durationSeconds:Number(meta.format.duration),width:v.width,height:v.height,
  humanPlayerRequired:false,actorAutomation:{mode:'IN_GAME_NPC_AI',
   playerControl:false,existingGameplayOnly:true,verified:false},
  runtimeVerification:{
   pass:false,actualGameplay:false,actualNativeEngine:false,
   clientScreenRecording:true,syntheticFrameRendering:false,
   playerAutomation:false,observedGameplayInteractions:0,
   blocker:'NATIVE_CLIENT_WINDOW_CAPTURED_BUT_GAME_AND_ACTOR_NOT_ATTESTED'
  },
  uploadVerified:false,videoPublished:false
 };
 fs.writeFileSync(path.join(folder,'capture.json'),JSON.stringify(proof,null,2)+'\n');
 fs.writeFileSync(stateFile,JSON.stringify({
  gameId,placeVersion:observed.placeVersion,sessionNonce:observed.sessionNonce,
  videoSha256:proof.sha256,captureAt:at
 },null,2)+'\n');
 console.log('ROBLOX_WINDOW_CAPTURE_SAVED='+file);
 console.log('ROBLOX_CAPTURE_SHA256='+proof.sha256);
 console.log('ROBLOX_RUNTIME_ATTESTATION_REQUIRED=YES');
 if(process.env.ROBLOX_CAPTURE_SUBMIT==='1'){
  const gitStatus=command('git',['-C',runtimeRoot,'rev-parse','--abbrev-ref','HEAD']);
  if(gitStatus.status!==0||gitStatus.stdout.trim()!=='company-runtime')
   throw Error('RUNTIME_CHECKOUT_MUST_TRACK_COMPANY_RUNTIME');
  const relVideo=path.relative(runtimeRoot,file);
  const relProof=path.relative(runtimeRoot,path.join(folder,'capture.json'));
  for(const args of [
   ['-C',runtimeRoot,'add','--',relVideo,relProof],
   ['-C',runtimeRoot,'-c','user.name=jaewoon-native-media-worker',
    '-c','user.email=actions@users.noreply.github.com',
    'commit','-m','runtime: intake verified-window NPC capture for '+gameId,
    '--only','--',relVideo,relProof],
   ['-C',runtimeRoot,'push','origin','HEAD:company-runtime']
  ]){
   const res=command('git',args,30000);
   if(res.status!==0)throw Error('RUNTIME_CAPTURE_SUBMISSION_FAILED:'+String(res.stderr||'').slice(0,160));
  }
  const dispatched=command('gh',['api','--method','POST',
   'repos/hans1177/jaewoon-games/dispatches',
   '-f','event_type=roblox_native_capture_available',
   '-f','client_payload[game_id]='+gameId],15000);
  if(dispatched.status!==0)throw Error('CAPTURE_DISPATCH_FAILED:'+String(dispatched.stderr||'').slice(0,160));
  console.log('ROBLOX_NATIVE_CAPTURE_SUBMITTED=YES');
 }
}
run().catch(e=>fail(String(e?.message||e)));
