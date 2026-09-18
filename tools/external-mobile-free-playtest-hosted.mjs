import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const CONTAINER=process.env.VIBE2_REDROID_CONTAINER||'vibe2-redroid';
const DELIVERY_BASE=(process.env.VIBE2_GOOGLE_PLAY_DELIVERY_BASE||'https://apk.niek.nl').replace(/\/$/,'');
const clean=v=>String(v??'').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha256Buffer=b=>crypto.createHash('sha256').update(b).digest('hex');
const sha256File=f=>sha256Buffer(fs.readFileSync(f));

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(!arg.startsWith('--'))continue;
    const [k,v]=arg.slice(2).split('=',2);
    out[k]=v??argv[++i];
  }
  return out;
}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function writeJson(file,value){ensureDir(path.dirname(file));fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function runDocker(args,{allowFailure=false,binary=false,maxBuffer=64*1024*1024}={}){
  const r=spawnSync('docker',args,{encoding:binary?null:'utf8',maxBuffer});
  if(!allowFailure&&r.status!==0){
    throw new Error('docker '+args.join(' ')+' failed: '+String(r.stderr||r.stdout||'').slice(-4000));
  }
  return r;
}
function dexec(args,opts={}){return runDocker(['exec',CONTAINER,...args],opts);}
function remoteShell(command,{allowFailure=false}={}){
  return dexec(['sh','-c',command],{allowFailure});
}
function safeName(value){return clean(value).replace(/[^A-Za-z0-9._-]+/g,'_');}
function shellQuote(value){return "'"+String(value).replaceAll("'","'\\''")+"'";}

async function fetchJson(url){
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const res=await fetch(url,{headers:{'user-agent':'jaewoon-vibe2-google-play-runtime/1.0','accept':'application/json'}});
      const text=await res.text();
      if(!res.ok)throw new Error('HTTP '+res.status+' '+text.slice(0,800));
      return JSON.parse(text);
    }catch(e){last=e;if(attempt<3)await sleep(2000*attempt);}
  }
  throw last;
}
function normalizeBase64(value){
  return clean(value).replace(/-/g,'+').replace(/_/g,'/').replace(/=+$/,'');
}
function digestMatches(bytes,expectedSha256='',expectedSha1=''){
  const sha256Hex=crypto.createHash('sha256').update(bytes).digest('hex');
  const sha256B64=crypto.createHash('sha256').update(bytes).digest('base64');
  const sha1Hex=crypto.createHash('sha1').update(bytes).digest('hex');
  const sha1B64=crypto.createHash('sha1').update(bytes).digest('base64');
  let checked=false,pass=false;
  if(clean(expectedSha256)){
    checked=true;
    const expected=clean(expectedSha256);
    pass=pass||(/^[a-f0-9]{64}$/i.test(expected)&&sha256Hex.toLowerCase()===expected.toLowerCase());
    pass=pass||(normalizeBase64(expected)===normalizeBase64(sha256B64));
  }
  if(clean(expectedSha1)){
    checked=true;
    const expected=clean(expectedSha1);
    pass=pass||(/^[a-f0-9]{40}$/i.test(expected)&&sha1Hex.toLowerCase()===expected.toLowerCase());
    pass=pass||(normalizeBase64(expected)===normalizeBase64(sha1B64));
  }
  return{pass:!checked||pass,sha256:sha256Hex,sha1:sha1Hex};
}
async function download(url,file,expectedSha256='',expectedSha1=''){
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const res=await fetch(url,{headers:{'user-agent':'jaewoon-vibe2-google-play-runtime/1.0'}});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const bytes=Buffer.from(await res.arrayBuffer());
      if(bytes.length<1024)throw new Error('download too small');
      const verified=digestMatches(bytes,expectedSha256,expectedSha1);
      if(!verified.pass)throw new Error('delivery digest mismatch');
      fs.writeFileSync(file,bytes);
      return{bytes:bytes.length,sha256:verified.sha256,sha1:verified.sha1};
    }catch(e){last=e;if(attempt<3)await sleep(2000*attempt);}
  }
  throw last;
}
async function acquirePackage(packageId,dir){
  ensureDir(dir);
  const api=DELIVERY_BASE+'/api/download/'+encodeURIComponent(packageId)+'?arch=arm64';
  const manifest=await fetchJson(api);
  if(clean(manifest.packageName)!==packageId)throw new Error('delivery package mismatch');
  const files=Array.isArray(manifest.files)?manifest.files:[];
  const apkFiles=files.filter(f=>clean(f.name).toLowerCase().endsWith('.apk')&&clean(f.url));
  if(!apkFiles.some(f=>f.type==='base'))throw new Error('delivery manifest missing base APK');
  const downloaded=[];
  for(const f of apkFiles){
    const local=path.join(dir,safeName(f.name));
    const info=await download(f.url,local,clean(f.sha256),clean(f.sha1));
    downloaded.push({local,name:path.basename(local),type:clean(f.type),sha256:info.sha256,sha1:info.sha1,bytes:info.bytes});
  }
  writeJson(path.join(dir,'delivery-manifest.json'),{
    packageName:manifest.packageName,
    architecture:manifest.architecture,
    versionCode:manifest.versionCode,
    versionName:manifest.versionName,
    deliveryAuthority:'GOOGLE_PLAY_NATIVE_FDFE',
    deliveryBroker:DELIVERY_BASE,
    files:downloaded.map(({name,type,sha256,sha1,bytes})=>({name,type,sha256,sha1,bytes}))
  });
  return downloaded;
}
function installPackage(packageId,files,gameId){
  const remote='/data/local/tmp/vibe2-google-play/'+safeName(gameId);
  remoteShell('rm -rf '+shellQuote(remote)+' && mkdir -p '+shellQuote(remote));
  for(const f of files){
    runDocker(['cp',f.local,CONTAINER+':'+remote+'/'+f.name]);
  }
  for(const lib of files.filter(f=>f.type==='lib')){
    const r=remoteShell('pm install -r '+shellQuote(remote+'/'+lib.name),{allowFailure:true});
    if(r.status!==0)throw new Error('dependent library install failed: '+String(r.stdout||r.stderr).slice(-2000));
  }
  const app=files.filter(f=>f.type!=='lib').map(f=>remote+'/'+f.name);
  if(!app.length)throw new Error('no app APKs to install');
  const cmd=app.length===1?'pm install -r '+shellQuote(app[0]):'pm install-multiple -r '+app.map(shellQuote).join(' ');
  const r=remoteShell(cmd,{allowFailure:true});
  if(r.status!==0)throw new Error('app install failed: '+String(r.stdout||r.stderr).slice(-3000));
  const pathResult=remoteShell('pm path '+shellQuote(packageId),{allowFailure:true});
  if(pathResult.status!==0||!String(pathResult.stdout).includes('package:'))throw new Error('installed package not visible');
}
function screenshot(file){
  const r=dexec(['screencap','-p'],{binary:true,maxBuffer:32*1024*1024});
  if(r.status!==0||!r.stdout?.length)throw new Error('screenshot failed');
  fs.writeFileSync(file,r.stdout);
  return sha256File(file);
}
function screenSize(){
  const r=remoteShell('wm size',{allowFailure:true});
  const m=String(r.stdout||'').match(/(\d+)x(\d+)/);
  return{w:m?Number(m[1]):1080,h:m?Number(m[2]):2400};
}
function input(cmd){remoteShell('cmd input '+cmd,{allowFailure:true});}
function performInput(profile,size){
  const w=size.w,h=size.h,cx=Math.floor(w*.5),cy=Math.floor(h*.55),left=Math.floor(w*.30),right=Math.floor(w*.70),top=Math.floor(h*.35),bottom=Math.floor(h*.75);
  const swipe=(x1,y1,x2,y2,d=300)=>input('swipe '+[Math.floor(x1),Math.floor(y1),Math.floor(x2),Math.floor(y2),d].join(' '));
  const tap=(x,y)=>input('tap '+Math.floor(x)+' '+Math.floor(y));
  switch(profile){
    case'RUNNER':swipe(cx,cy,cx,top,250);swipe(cx,cy,left,cy,250);swipe(cx,cy,right,cy,250);swipe(cx,cy,cx,bottom,250);break;
    case'MATCH3':swipe(w*.38,h*.56,w*.52,h*.56,300);swipe(w*.52,h*.62,w*.52,h*.50,300);swipe(w*.60,h*.56,w*.46,h*.56,300);break;
    case'BLOCK_PUZZLE':swipe(w*.25,h*.82,w*.38,h*.52,500);swipe(w*.50,h*.82,w*.55,h*.48,500);swipe(w*.75,h*.82,w*.68,h*.58,500);break;
    case'SURVIVAL':swipe(cx,bottom,left,cy,800);swipe(cx,bottom,right,cy,800);swipe(cx,bottom,cx,top,800);break;
    case'IDLE_RPG':tap(w*.45,h*.65);tap(w*.35,h*.72);break;
    case'ARENA_DUAL_STICK':swipe(w*.22,h*.76,w*.30,h*.66,650);tap(w*.82,h*.72);tap(w*.72,h*.62);break;
    case'STRATEGY_TAP':tap(w*.50,h*.60);tap(w*.68,h*.52);tap(w*.32,h*.52);break;
    case'BOARD_TAP':tap(w*.50,h*.58);tap(w*.50,h*.78);break;
    case'DRIVE_TWO_BUTTON':tap(w*.78,h*.82);tap(w*.22,h*.82);tap(w*.78,h*.82);break;
    case'SLINGSHOT':swipe(w*.30,h*.62,w*.18,h*.70,700);break;
    case'LOCATION_TAP':tap(w*.50,h*.55);tap(w*.50,h*.82);break;
    case'CARD_TAP':tap(w*.30,h*.70);tap(w*.50,h*.70);tap(w*.70,h*.70);break;
    default:swipe(cx,cy,right,cy,300);
  }
}
function resolveLauncher(packageId){
  const r=remoteShell('cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER '+shellQuote(packageId),{allowFailure:true});
  const rows=String(r.stdout||'').trim().split(/\r?\n/).filter(Boolean);
  const component=rows.at(-1)||'';
  return component.startsWith(packageId+'/')?component:'';
}
function focusText(){return String(remoteShell("dumpsys window | grep -E 'mCurrentFocus|mFocusedApp' | tail -n 12",{allowFailure:true}).stdout||'');}
function pidOf(packageId){return String(remoteShell('pidof '+shellQuote(packageId),{allowFailure:true}).stdout||'').trim();}
function logcat(){return String(remoteShell('logcat -d -v threadtime',{allowFailure:true}).stdout||'');}
function escapeRegex(value){return String(value).replace(/[.*+?^$()|[\]\\{}]/g,'\\$&');}
function noCrash(log,packageId){
  const escaped=escapeRegex(packageId);
  return !new RegExp('FATAL EXCEPTION|ANR in '+escaped+'|Process '+escaped+'.*has died|Force finishing activity.*'+escaped,'i').test(log);
}

async function playOne(game,outDir,size){
  const gameDir=path.join(outDir,game.id);ensureDir(gameDir);
  let packageId='',installReason='',files=[];
  for(const candidate of game.packageIds||[]){
    try{
      const apkDir=path.join(gameDir,'delivery-'+safeName(candidate));
      files=await acquirePackage(candidate,apkDir);
      installPackage(candidate,files,game.id);
      packageId=candidate;installReason='GOOGLE_PLAY_FDFE_INSTALL_PASS';break;
    }catch(e){
      installReason='DELIVERY_OR_INSTALL_FAILED:'+clean(e?.message).slice(0,500);
    }
  }
  if(!packageId){
    const failed={version:1,gameId:game.id,title:game.title,category:game.category,packageId:null,storeUrl:game.storeUrl,authority:'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE',practiceOnly:true,runtimePromotionAllowed:false,installPass:false,installReason,launchPass:false,foregroundPass:false,processAliveAfter:false,visualChange:false,noCrash:false,inputProfile:game.inputProfile,observedAt:new Date().toISOString()};
    writeJson(path.join(gameDir,'result.json'),failed);return failed;
  }
  remoteShell('logcat -c',{allowFailure:true});
  const component=resolveLauncher(packageId);
  let launchPass=false;
  if(component){
    const r=remoteShell('cmd activity start-activity -W -n '+shellQuote(component)+' -a android.intent.action.MAIN -c android.intent.category.LAUNCHER',{allowFailure:true});
    launchPass=r.status===0;
  }
  if(!launchPass){
    const r=remoteShell('monkey -p '+shellQuote(packageId)+' -c android.intent.category.LAUNCHER 1',{allowFailure:true});
    launchPass=r.status===0;
  }
  await sleep(8000);
  const beforeFile=path.join(gameDir,'before.png');
  const beforeHash=screenshot(beforeFile);
  const focusBefore=focusText();
  performInput(game.inputProfile,size);
  await sleep(6000);
  const afterFile=path.join(gameDir,'after.png');
  const afterHash=screenshot(afterFile);
  const focusAfter=focusText();
  const pid=pidOf(packageId);
  const logs=logcat();fs.writeFileSync(path.join(gameDir,'logcat.txt'),logs);
  const result={
    version:1,gameId:game.id,title:game.title,category:game.category,packageId,storeUrl:game.storeUrl,
    authority:'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE',practiceOnly:true,runtimePromotionAllowed:false,
    installPass:true,installReason,launchPass,
    foregroundPass:focusBefore.includes(packageId)||focusAfter.includes(packageId),
    processAliveAfter:Boolean(pid),visualChange:beforeHash!==afterHash,noCrash:noCrash(logs,packageId),
    inputProfile:game.inputProfile,beforeScreenshotSha256:beforeHash,afterScreenshotSha256:afterHash,
    evidenceRetention:'EPHEMERAL_ARTIFACT_ONLY',binaryRedistributed:false,codeExtracted:false,
    deliveryAuthority:'GOOGLE_PLAY_NATIVE_FDFE',deliveryBroker:DELIVERY_BASE,
    observedAt:new Date().toISOString()
  };
  writeJson(path.join(gameDir,'result.json'),result);
  remoteShell('am force-stop '+shellQuote(packageId),{allowFailure:true});
  remoteShell('pm uninstall '+shellQuote(packageId),{allowFailure:true});
  for(const f of files){try{fs.rmSync(f.local,{force:true});}catch{}}
  return result;
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  const manifestPath=args.manifest||'company-learning/external-game-playtest/mobile-free-seed-games.json';
  const outDir=args.out||path.join(process.env.RUNNER_TEMP||'.','external-mobile-game-playtest');
  const maxGames=Math.max(1,Math.min(12,Number(args['max-games']||3)));
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(manifest.authority!=='EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE'||manifest.practiceOnly!==true||manifest.runtimePromotionAllowed!==false)throw new Error('UNSAFE_EXTERNAL_PLAYTEST_MANIFEST');
  const games=manifest.games||[];if(!games.length)throw new Error('EMPTY_GOOGLE_PLAY_CATALOG');
  const start=((Number(args['start-index']||0)%games.length)+games.length)%games.length;
  const selected=Array.from({length:Math.min(maxGames,games.length)},(_,i)=>games[(start+i)%games.length]);
  ensureDir(outDir);
  const size=screenSize(),results=[];
  console.log('EXTERNAL_MOBILE_PLAYTEST_START_INDEX='+start);
  console.log('EXTERNAL_MOBILE_PLAYTEST_BATCH_IDS='+selected.map(g=>g.id).join(','));
  for(const game of selected){
    const result=await playOne(game,outDir,size);
    results.push(result);
    console.log('EXTERNAL_MOBILE_GAME='+game.id+' PASS='+(result.installPass&&result.launchPass&&result.foregroundPass&&result.processAliveAfter&&result.noCrash?'YES':'NO')+' REASON='+result.installReason);
  }
  const summary={version:1,authority:'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE',practiceOnly:true,runtimePromotionAllowed:false,runtimeType:'GITHUB_HOSTED_ARM64_REDROID',deliveryAuthority:'GOOGLE_PLAY_NATIVE_FDFE',games:results,observedAt:new Date().toISOString()};
  writeJson(path.join(outDir,'summary.json'),summary);
  const pass=results.filter(r=>r.installPass&&r.launchPass&&r.foregroundPass&&r.processAliveAfter&&r.noCrash).length;
  console.log('EXTERNAL_MOBILE_PLAYTEST_PASS_COUNT='+pass);
  console.log('EXTERNAL_MOBILE_PLAYTEST_TOTAL='+results.length);
  if(pass<1)throw new Error('EXTERNAL_MOBILE_PLAYTEST_NO_VALID_RUNTIME_SAMPLE');
}
main().catch(error=>{console.error(error?.stack||error?.message||String(error));process.exitCode=1;});
