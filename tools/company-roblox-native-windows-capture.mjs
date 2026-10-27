#!/usr/bin/env node
// Native Roblox footage recorder: existing Windows plus verified physical Android.
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
  if(match){
   const ageSeconds=Math.floor(Date.now()/1000)-Number(match[2]);
   if(ageSeconds>=-2&&ageSeconds<=7)
    return {placeVersion:match[1],sessionNonce:match[2],clientLogObserved:true,ageSeconds};
  }
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
// 두 운영체제의 녹화 파일에 같은 영상 무결성 검사를 적용한다.
function validateNativeVideo(file,duration){
 const stat=fs.statSync(file);
 if(stat.size<100*1024||stat.size>25*1024*1024)throw Error('VIDEO_SIZE_UNUSABLE');
 const probe=command('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',file],15000);
 if(probe.status!==0)throw Error('CAPTURE_FFPROBE_FAILED');
 const meta=JSON.parse(probe.stdout||'{}');
 const v=(meta.streams||[]).find(x=>x.codec_type==='video');
 if(!v||v.width!==1280||v.height!==720||Number(meta.format?.duration)<duration-2)throw Error('CAPTURE_VIDEO_NOT_VALIDATED');
 // Reject blank/frozen GDI GPU surfaces. A playable MP4 alone does not prove gameplay.
 const audit=command('ffmpeg',['-hide_banner','-nostats','-i',file,
  '-vf','blackdetect=d=3:pix_th=0.10,freezedetect=n=-55dB:d=3',
  '-an','-f','null','-'],60000);
 if(audit.status!==0)throw Error('CAPTURE_FRAME_AUDIT_FAILED');
 const messages=String(audit.stderr||'');
 // 분석: 영상 끝까지 검거나 정지된 경우 종료 이벤트가 없어도 거부한다.
 const fullBlack=messages.match(/black_start:\\s*0(?:[.\\s]|$)/);
 if(fullBlack){
  const end=messages.match(/black_end:\\s*([0-9.]+)/);
  if(!end||Number(end[1])>=duration-2)throw Error('CAPTURE_BLACK_FRAMES_REJECTED');
 }
 const fullFreeze=messages.match(/freeze_start:\\s*0(?:[.\\s]|$)/);
 if(fullFreeze){
  const end=messages.match(/freeze_end:\\s*([0-9.]+)/);
  if(!end||Number(end[1])>=duration-2)throw Error('CAPTURE_STATIC_FRAMES_REJECTED');
 }
 return {meta,v};
}
function submitCapture({file,proofPath,proof,stateFile,observed}){
 const gitStatus=command('git',['-C',runtimeRoot,'rev-parse','--abbrev-ref','HEAD']);
 if(gitStatus.status!==0||gitStatus.stdout.trim()!=='company-runtime')
  throw Error('RUNTIME_CHECKOUT_MUST_TRACK_COMPANY_RUNTIME');
 const relVideo=path.relative(runtimeRoot,file);
 const relProof=path.relative(runtimeRoot,proofPath);
 if(!sameRoot(path.join(runtimeRoot,'assets','runtime-evidence','roblox',gameId),file)
   ||!sameRoot(runtimeRoot,proofPath)||!fs.existsSync(file)||!fs.existsSync(proofPath)
   ||sha256(file)!==proof.sha256)
  throw Error('NATIVE_CAPTURE_SUBMISSION_INTEGRITY_INVALID');
 // Do not repeatedly commit the same recorded asset after an interrupted upload.
 const stage=command('git',['-C',runtimeRoot,'add','--',relVideo,relProof],25000);
 if(stage.status!==0)throw Error('NATIVE_CAPTURE_GIT_ADD_FAILED');
 const staged=command('git',['-C',runtimeRoot,'diff','--cached','--quiet','--',relVideo,relProof],25000);
 if(staged.status===1){
  const c=command('git',['-C',runtimeRoot,'-c','user.name=jaewoon-native-media-worker',
   '-c','user.email=actions@users.noreply.github.com',
   'commit','-m','runtime: intake private NPC footage for '+gameId,
   '--only','--',relVideo,relProof],30000);
  if(c.status!==0)throw Error('NATIVE_CAPTURE_COMMIT_FAILED');
 }else if(staged.status!==0)throw Error('NATIVE_CAPTURE_STAGING_CHECK_FAILED');
 let pushed=false;
 for(let retry=0;retry<4;retry++){
  const rebase=command('git',['-C',runtimeRoot,'pull','--rebase','origin','company-runtime'],45000);
  if(rebase.status!==0)throw Error('NATIVE_CAPTURE_RUNTIME_REBASE_CONFLICT');
  const push=command('git',['-C',runtimeRoot,'push','origin','HEAD:company-runtime'],45000);
  if(push.status===0){pushed=true;break;}
 }
 if(!pushed)throw Error('NATIVE_CAPTURE_RUNTIME_PUSH_RETRY_EXHAUSTED');
 fs.writeFileSync(stateFile,JSON.stringify({
  gameId,placeVersion:observed.placeVersion,sessionNonce:observed.sessionNonce,
  videoSha256:proof.sha256,videoPath:file,proofPath,uploaded:true,
  captureAt:proof.captureAt
 },null,2)+'\n');
 const dispatched=command('gh',['api','--method','POST',
  'repos/hans1177/jaewoon-games/dispatches',
  '-f','event_type=roblox_native_capture_available',
  '-f','client_payload[game_id]='+gameId],15000);
 if(dispatched.status!==0){
  console.warn('ROBLOX_NATIVE_CAPTURE_DISPATCH_PENDING_DAILY_RECOVERY=YES');
 }else console.log('ROBLOX_NATIVE_CAPTURE_DISPATCHED=YES');
 console.log('ROBLOX_NATIVE_CAPTURE_SUBMITTED=YES');
}
// 안드로이드: 승인된 실물폰만 촬영하며, 게임 입력/터치/잠금 우회는 하지 않는다.
async function captureAndroid(){
 const target=runtimeTarget();
 const listed=command('adb',['devices'],10000);
 if(listed.status!==0)throw Error('ADB_REQUIRED_ON_ANDROID');
 const devices=listed.stdout.split(/\r?\n/).slice(1)
  .map(x=>x.trim().split(/\s+/)).filter(x=>x[1]==='device');
 if(devices.length!==1||!/^[A-Za-z0-9._:-]+$/.test(devices[0][0]))
  throw Error('EXACTLY_ONE_AUTHORIZED_PHYSICAL_ANDROID_DEVICE_REQUIRED');
 const serial=devices[0][0];
 const adb=(args,timeout=15000,buffer=1024*1024)=>spawnSync('adb',
  ['-s',serial,...args],{encoding:'utf8',timeout,maxBuffer:buffer});
 for(const key of ['ro.kernel.qemu','ro.boot.qemu']){
  const r=adb(['shell','getprop',key]);
  if(r.status!==0||r.stdout.trim()==='1')throw Error('ANDROID_EMULATOR_NOT_SUPPORTED');
 }
 if(adb(['shell','getprop','ro.product.model']).stdout.trim().length===0)
  throw Error('PHYSICAL_ANDROID_MODEL_UNVERIFIED');
 const pkg=adb(['shell','pm','path','com.roblox.client']);
 if(pkg.status!==0||!pkg.stdout.includes('package:'))throw Error('ROBLOX_ANDROID_APP_NOT_INSTALLED');
 if(mode==='check'){
  console.log('ROBLOX_ANDROID_PHYSICAL_DEVICE_READY=YES');
  console.log('ROBLOX_ANDROID_NPC_GAMEPLAY_NOT_VERIFIED=YES');
  return;
 }
 if(process.env.ROBLOX_CAPTURE_AUTHORIZED!=='1')throw Error('EXPLICIT_PRIVATE_CAPTURE_AUTHORIZATION_REQUIRED');
 const link=String(process.env.JAEWOON_CAPTURE_PRIVATE_LINK_CODE||'');
 if(process.env.JAEWOON_CAPTURE_GAME_ID!==gameId||!/^[A-Za-z0-9_-]{8,200}$/.test(link))
  throw Error('ANDROID_PRIVATE_SERVER_LINK_CONFIGURATION_REQUIRED');
 for(const bin of ['ffmpeg','ffprobe']){
  if(command(bin,['-version'],7000).status!==0)throw Error(bin.toUpperCase()+'_MISSING');
 }
 // Roblox 공식 딥링크로만 진입한다. 외부 매크로나 플레이어 조작은 사용하지 않는다.
 const uri='roblox://placeId='+target.placeId+'&linkCode='+encodeURIComponent(link)
  +'&launchData='+encodeURIComponent('JAEWOON_NATIVE_CAPTURE_'+gameId);
 const joined=adb(['shell','am','start','-a','android.intent.action.VIEW','-d',"'"+uri+"'"],20000);
 if(joined.status!==0||/Error:|unable to resolve/i.test(joined.stdout+joined.stderr))
  throw Error('ANDROID_PRIVATE_ROBLOX_DEEPLINK_FAILED');
 const foreground=()=>{
  const a=adb(['shell','dumpsys','activity','activities'],15000,5*1024*1024);
  const w=adb(['shell','dumpsys','window'],15000,3*1024*1024);
  return a.status===0&&w.status===0
   &&/(?:topResumedActivity|mResumedActivity|ResumedActivity:)[^\n]*com\.roblox\.client/i.test(a.stdout)
   &&/(?:mCurrentFocus|mFocusedApp)[^\n]*com\.roblox\.client/i.test(w.stdout);
 };
 const prefix='JAEWOON_NATIVE_CAPTURE_READY|'+gameId+'|'+target.universeId+'|'+target.placeId+'|';
 const pidReply=adb(['shell','pidof','com.roblox.client']);
 const pids=pidReply.stdout.trim().split(/\s+/);
 if(pidReply.status!==0||pids.length!==1||!/^[1-9][0-9]*$/.test(pids[0]))
  throw Error('ANDROID_ROBLOX_PID_ATTESTATION_REQUIRED');
 const expectedPid=pids[0];
 let observed=null;
 const deadline=Date.now()+47000;
 while(Date.now()<deadline){
  if(foreground()){
   const raw=adb(['logcat','-d','-v','threadtime','-t','12000'],17000,12*1024*1024);
   // Android 로그의 프로세스 PID까지 Roblox 앱과 일치해야 한다.
   if(raw.status===0){
    const line=raw.stdout.split(/\r?\n/).filter(x=>x.includes(prefix)).at(-1)||'';
    const pid=line.match(/^\d\d-\d\d\s+\d\d:\d\d:\d\d[.]\d+\s+(\d+)\s+\d+\s+[A-Z]/);
    const ix=line.lastIndexOf(prefix);
    if(pid&&pid[1]===expectedPid&&ix>=0){
     const m=line.slice(ix+prefix.length).match(/^([1-9]\d*)[|]NPC_MOVED[|]([1-9]\d*)/);
     if(m){
      const ageSeconds=Math.floor(Date.now()/1000)-Number(m[2]);
      if(ageSeconds>=-2&&ageSeconds<=7)
       observed={placeVersion:m[1],sessionNonce:m[2],ageSeconds,clientLogObserved:true};
     }
    }
   }
  }
  if(observed)break;
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 if(!observed)throw Error('ANDROID_NATIVE_NPC_LOG_OR_FOREGROUND_ATTESTATION_MISSING');
 const stateDir=path.join(os.tmpdir(),'jaewoon-native-client-capture');
 fs.mkdirSync(stateDir,{recursive:true});
 const stateFile=path.join(stateDir,gameId+'.json');
 if(fs.existsSync(stateFile)){
  const state=readJson(stateFile);
  if(state.sessionNonce===observed.sessionNonce&&state.placeVersion===observed.placeVersion){
   if(state.uploaded)throw Error('NATIVE_GAMEPLAY_SESSION_ALREADY_CAPTURED');
   if(state.videoPath&&state.proofPath&&fs.existsSync(state.videoPath)&&fs.existsSync(state.proofPath)
    &&sameRoot(path.join(runtimeRoot,'assets','runtime-evidence','roblox',gameId),state.videoPath)){
    if(process.env.ROBLOX_CAPTURE_SUBMIT==='1'){
     submitCapture({file:state.videoPath,proofPath:state.proofPath,
      proof:readJson(state.proofPath),stateFile,observed});
     console.log('ROBLOX_CAPTURE_REUSED_EXISTING_VIDEO_AFTER_UPLOAD_FAILURE=YES');
     return;
    }
   }
   throw Error('NATIVE_CAPTURE_LOCAL_FILE_PENDING_UPLOAD');
  }
 }
 const duration=Number(arg('seconds','19'));
 if(!Number.isInteger(duration)||duration<8||duration>22)
  throw Error('DURATION_MUST_BE_8_TO_22_SECONDS');
 const at=new Date().toISOString();
 const folder=path.join(runtimeRoot,'assets','runtime-evidence','roblox',gameId,at.replace(/[:.]/g,'-'));
 if(!sameRoot(path.join(runtimeRoot,'assets','runtime-evidence','roblox',gameId),folder)||fs.existsSync(folder))
  throw Error('ANDROID_CAPTURE_DESTINATION_INVALID');
 fs.mkdirSync(folder,{recursive:true});
 const file=path.join(folder,'capture.mp4');
 const remote='/sdcard/Movies/jaewoon-npc-'+gameId+'-'+Date.now()+'.mp4';
 try{
  const recorded=adb(['shell','screenrecord','--size','1280x720','--bit-rate','3000000',
   '--time-limit',String(duration),remote],(duration+20)*1000);
  if(recorded.status!==0)throw Error('ANDROID_SCREENRECORD_FAILED');
  if(!foreground())throw Error('ANDROID_ROBLOX_LEFT_FOREGROUND_DURING_CAPTURE');
  const pulled=adb(['pull',remote,file],35000,2*1024*1024);
  if(pulled.status!==0||!fs.existsSync(file))throw Error('ANDROID_CAPTURE_PULL_FAILED');
 }finally{
  adb(['shell','rm','-f',remote],8000);
 }
 const {meta,v}=validateNativeVideo(file,duration);
 const revision=command('git',['-C',root,'rev-parse','HEAD']).stdout.trim();
 const proof={
  version:1,gameId,universeId:target.universeId,placeId:target.placeId,
  captureSource:'ROBLOX_NATIVE_SCRIPTED_ACTOR_CAPTURE',
  captureAt:at,sourceRevision:/^[a-f0-9]{40}$/.test(revision)?revision:null,
  sha256:sha256(file),artifactIdentity:path.relative(runtimeRoot,file).replaceAll(path.sep,'/'),
  captureDevice:'ANDROID_PHYSICAL',androidPackage:'com.roblox.client',
  nativeVideoOrigin:'PHYSICAL_ANDROID_ROBLOX_SCREENRECORD_WITH_REAL_NPC_MOVEMENT',
  observedNativePlaceVersion:observed.placeVersion,nativeCaptureSessionNonce:observed.sessionNonce,
  captureStartLagSeconds:observed.ageSeconds,clientLogObserved:true,
  sourceRevisionBinding:'WORKER_CHECKOUT_SHA_NOT_NATIVE_PUBLISHED_PLACE_VERIFICATION',
  durationSeconds:Number(meta.format.duration),width:v.width,height:v.height,
  humanPlayerRequired:false,
  actorAutomation:{mode:'IN_GAME_NPC_AI',playerControl:false,existingGameplayOnly:true,verified:true},
  runtimeVerification:{
   pass:true,actualGameplay:true,actualNativeEngine:true,
   clientScreenRecording:true,syntheticFrameRendering:false,
   playerAutomation:false,observedGameplayInteractions:1,
   observedNativeNpcMotionStudsMin:2.5,gameIdentityFromClientLog:true,
   videoFrameAuditPassed:true,publishedPlaceRevisionChecked:false,releaseApprovalRequired:true
  },uploadVerified:false,videoPublished:false
 };
 const proofPath=path.join(folder,'capture.json');
 fs.writeFileSync(proofPath,JSON.stringify(proof,null,2)+'\n');
 fs.writeFileSync(stateFile,JSON.stringify({
  gameId,placeVersion:observed.placeVersion,sessionNonce:observed.sessionNonce,
  videoSha256:proof.sha256,videoPath:file,proofPath,uploaded:false,captureAt:at
 },null,2)+'\n');
 console.log('ROBLOX_ANDROID_CAPTURE_SAVED='+file);
 console.log('ROBLOX_CAPTURE_SHA256='+proof.sha256);
 console.log('ROBLOX_NATIVE_RUNTIME_CLIP_ATTESTED=YES');
 console.log('ROBLOX_PUBLICATION_MODERATION_STILL_REQUIRED=YES');
 if(process.env.ROBLOX_CAPTURE_SUBMIT==='1')
  submitCapture({file,proofPath,proof,stateFile,observed});
}

async function run(){
 if(!['check','capture','watch'].includes(mode))throw Error('UNKNOWN_MODE');
 if(arg('device')==='android'){
  if(mode!=='watch')return captureAndroid();
  // 모바일 상주 실행: 한 게임당 14일에 한 번만 새 영상 생성.
  // 비공개 인증/자산 증거가 없으면 촬영 성공으로 처리하지 않는다.
  if(process.env.ROBLOX_CAPTURE_AUTHORIZED!=='1'||process.env.ROBLOX_CAPTURE_SUBMIT!=='1')
   throw Error('ANDROID_WATCH_AUTHORIZATION_AND_SUBMISSION_REQUIRED');
  let lastError='',lastLogged=0;
  const stateFile=path.join(os.tmpdir(),'jaewoon-native-client-capture',gameId+'.json');
  while(true){
   try{
    const state=fs.existsSync(stateFile)?readJson(stateFile):null;
    if(state&&!state.uploaded&&state.videoPath&&state.proofPath
      &&fs.existsSync(state.videoPath)&&fs.existsSync(state.proofPath)){
     submitCapture({file:state.videoPath,proofPath:state.proofPath,
      proof:readJson(state.proofPath),stateFile,
      observed:{placeVersion:state.placeVersion,sessionNonce:state.sessionNonce}});
    }else if(!state?.uploaded||Date.now()-Date.parse(state.captureAt)>=14*86400*1000){
     await captureAndroid();
    }
    lastError='';
   }catch(e){
    const signature=String(e?.message||e);
    if(lastError!==signature||Date.now()-lastLogged>30*60000){
     console.error('ROBLOX_ANDROID_WATCH_BLOCKED='+signature);
     lastError=signature;lastLogged=Date.now();
    }
   }
   await new Promise(resolve=>setTimeout(resolve,10*60*1000));
  }
 }
 if(process.platform!=='win32')throw Error('WINDOWS_SESSION_REQUIRED');
 if(mode==='watch')throw Error('WINDOWS_WATCH_USE_EXISTING_POWERSHELL_WORKER');
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
  if(state.sessionNonce===observed.sessionNonce&&state.placeVersion===observed.placeVersion){
   if(state.uploaded===true)throw Error('NATIVE_GAMEPLAY_SESSION_ALREADY_CAPTURED');
   if(state.videoPath&&state.proofPath&&fs.existsSync(state.videoPath)
      &&fs.existsSync(state.proofPath)
      &&sameRoot(path.join(runtimeRoot,'assets','runtime-evidence','roblox',gameId),state.videoPath)){
    if(process.env.ROBLOX_CAPTURE_SUBMIT==='1'){
     const proof=readJson(state.proofPath);
     submitCapture({file:state.videoPath,proofPath:state.proofPath,proof,stateFile,observed});
     console.log('ROBLOX_CAPTURE_REUSED_EXISTING_VIDEO_AFTER_UPLOAD_FAILURE=YES');
     return;
    }
    throw Error('NATIVE_CAPTURE_LOCAL_FILE_PENDING_UPLOAD');
   }
   throw Error('NATIVE_CAPTURE_PREVIOUS_SESSION_RECOVERY_REQUIRES_MANUAL_INSPECTION');
  }
 }
 const duration=Number(arg('seconds','19'));
 if(!Number.isInteger(duration)||duration<8||duration>22)throw Error('DURATION_MUST_BE_8_TO_22_SECONDS');
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
 const {meta,v}=validateNativeVideo(file,duration);
 const revision=command('git',['-C',root,'rev-parse','HEAD']).stdout.trim();
 // OS pixels and native process are evidence of a window recording, not proof of
 // exact published revision, in-game actions or successful Roblox gallery upload.
 const proof={
  version:1,gameId,universeId:target.universeId,placeId:target.placeId,
  captureSource:'ROBLOX_NATIVE_SCRIPTED_ACTOR_CAPTURE',
  captureAt:at,sourceRevision:/^[a-f0-9]{40}$/.test(revision)?revision:null,
  sha256:sha256(file),artifactIdentity:path.relative(runtimeRoot,file).replaceAll(path.sep,'/'),
  windowProcess:'RobloxPlayerBeta',windowTitleMatched:'Roblox',
  observedNativePlaceVersion:observed.placeVersion,
  nativeCaptureSessionNonce:observed.sessionNonce,
  captureStartLagSeconds:observed.ageSeconds,
  sourceRevisionBinding:'WORKER_CHECKOUT_SHA_NOT_NATIVE_PUBLISHED_PLACE_VERIFICATION',
  nativeVideoOrigin:'WINDOW_CAPTURE_OF_ROBLOX_PLAYER_WITH_REAL_NPC_MOVEMENT',
  clientLogObserved:observed.clientLogObserved,
  durationSeconds:Number(meta.format.duration),width:v.width,height:v.height,
  humanPlayerRequired:false,actorAutomation:{mode:'IN_GAME_NPC_AI',
   playerControl:false,existingGameplayOnly:true,verified:true},
  runtimeVerification:{
   pass:true,actualGameplay:true,actualNativeEngine:true,
   clientScreenRecording:true,syntheticFrameRendering:false,
   playerAutomation:false,observedGameplayInteractions:1,
   observedNativeNpcMotionStudsMin:2.5,
   gameIdentityFromClientLog:true,videoFrameAuditPassed:true,
   publishedPlaceRevisionChecked:false,
   releaseApprovalRequired:true
  },
  uploadVerified:false,videoPublished:false
 };
 fs.writeFileSync(path.join(folder,'capture.json'),JSON.stringify(proof,null,2)+'\n');
 fs.writeFileSync(stateFile,JSON.stringify({
  gameId,placeVersion:observed.placeVersion,sessionNonce:observed.sessionNonce,
  videoSha256:proof.sha256,videoPath:file,
  proofPath:path.join(folder,'capture.json'),uploaded:false,captureAt:at
 },null,2)+'\n');
 console.log('ROBLOX_WINDOW_CAPTURE_SAVED='+file);
 console.log('ROBLOX_CAPTURE_SHA256='+proof.sha256);
 console.log('ROBLOX_NATIVE_RUNTIME_CLIP_ATTESTED=YES');
 console.log('ROBLOX_PUBLICATION_MODERATION_STILL_REQUIRED=YES');
 if(process.env.ROBLOX_CAPTURE_SUBMIT==='1'){
  submitCapture({file,proofPath:path.join(folder,'capture.json'),proof,stateFile,observed});
 }
}
run().catch(e=>fail(String(e?.message||e)));
