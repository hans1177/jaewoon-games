// 파일명: tools/company-unity-web-gameplay-validation.mjs
// 역할: Unity Web 1차 게임을 실제 모바일 브라우저에서 실행하고 표준 QA 증거를 검증한다.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const args=Object.fromEntries(process.argv.slice(2).map(v=>{
  const m=v.match(/^--([^=]+)=(.*)$/);
  return m?[m[1],m[2]]:[v.replace(/^--/,''),'true'];
}));

const gameId=String(args['game-id']||'').trim();
const source=String(args.source||`web-games/${gameId}`).replaceAll('\\','/').replace(/^\/+|\/+$/g,'');
const output=String(args.output||'').trim();
const screenshot=String(args.screenshot||'').trim();
const port=Number(args.port||4187);

if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error(`INVALID_GAME_ID:${gameId}`);
if(source!==`web-games/${gameId}`)throw new Error(`UNITY_WEB_BUILD_OUTPUT_REQUIRED:${source}`);
if(!fs.existsSync(source))throw new Error(`UNITY_WEB_SOURCE_MISSING:${source}`);
if(!fs.existsSync(path.join(source,'index.html')))throw new Error('UNITY_WEB_INDEX_MISSING');
const manifestPath=path.join(source,'unity-web-deploy-manifest.json');
const deployManifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
const approvedEnvironment=deployManifest.approvedEnvironment||{required:false};
if(approvedEnvironment.required===true&&(
  deployManifest.gameId!==gameId||
  !/^[a-f0-9]{64}$/.test(String(approvedEnvironment.layoutSha256||''))||
  !Number.isInteger(approvedEnvironment.terrainCells)||approvedEnvironment.terrainCells<=0||
  !Number.isInteger(approvedEnvironment.buildingCount)||approvedEnvironment.buildingCount<0||
  !Number.isInteger(approvedEnvironment.vegetationCount)||approvedEnvironment.vegetationCount<0
))throw new Error('UNITY_WEB_APPROVED_ENVIRONMENT_DEPLOY_BINDING_INVALID');

const requiredFiles={
  wasm:false,data:false,framework:false,loader:false,
};
const walk=dir=>{
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.isFile()){
      const name=entry.name;
      if(/\.wasm(?:\.(?:br|gz))?$/.test(name))requiredFiles.wasm=true;
      if(/\.data(?:\.(?:br|gz))?$/.test(name))requiredFiles.data=true;
      if(/\.framework\.js(?:\.(?:br|gz))?$/.test(name))requiredFiles.framework=true;
      if(/\.loader\.js$/.test(name))requiredFiles.loader=true;
    }
  }
};
walk(source);
if(Object.values(requiredFiles).some(v=>!v))throw new Error(`UNITY_WEB_ARTIFACT_SET_INCOMPLETE:${JSON.stringify(requiredFiles)}`);

const contentType=file=>{
  const bare=file.replace(/\.(br|gz)$/,'');
  if(bare.endsWith('.wasm'))return 'application/wasm';
  if(bare.endsWith('.js'))return 'application/javascript; charset=utf-8';
  if(bare.endsWith('.json'))return 'application/json; charset=utf-8';
  if(bare.endsWith('.html'))return 'text/html; charset=utf-8';
  if(bare.endsWith('.css'))return 'text/css; charset=utf-8';
  return 'application/octet-stream';
};

const root=process.cwd();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const relative=pathname.replace(/^\/+/, '');
    const file=path.resolve(root,relative.endsWith('/')?`${relative}index.html`:relative);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      res.writeHead(404);res.end('not found');return;
    }
    const headers={'Content-Type':contentType(file),'Cache-Control':'no-store'};
    if(file.endsWith('.br'))headers['Content-Encoding']='br';
    if(file.endsWith('.gz'))headers['Content-Encoding']='gzip';
    res.writeHead(200,headers);
    fs.createReadStream(file).pipe(res);
  }catch(error){
    res.writeHead(500);res.end(String(error?.message||error));
  }
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});

const markers=[];
const consoleErrors=[];
const pageErrors=[];
const failedRequests=[];

try{
  // 실제 Android Chrome 사용자 에이전트를 사용해 Unity WebGL의 모바일 템플릿 경로를 실행한다.
  const {chromium,devices}=await import('playwright');
  const androidChrome=devices['Pixel 5'];
  if(!androidChrome?.userAgent?.includes('Android'))throw new Error('UNITY_WEB_QA_ANDROID_PROFILE_MISSING');
  const mobileViewport={width:390,height:844};
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({...androidChrome,viewport:mobileViewport});
  page.on('console',msg=>{
    const text=String(msg.text()||'');
    if(text.includes('JAEWOON_UNITY_WEB_QA ')||text.includes('UNITY_WEB_WORLD='))markers.push(text);
    if(msg.type()==='error')consoleErrors.push(text);
  });
  page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));
  page.on('requestfailed',req=>failedRequests.push(`${req.method()} ${req.url()} ${req.failure()?.errorText||''}`));

  const parseState=line=>Object.fromEntries(String(line||'').trim().split(/\s+/).slice(2).map(token=>{
    const at=token.indexOf('=');
    return at>0?[token.slice(0,at),token.slice(at+1)]:null;
  }).filter(Boolean));
  const volatileStateKeys=new Set(['game','region','enemy','enemyHp','hp','maxHp','x','y','z','cameraX','cameraY','cameraZ']);
  const url=`http://127.0.0.1:${port}/${source}/?qa=1`;
  const bootStartedAt=Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForSelector('canvas',{state:'visible',timeout:90000});
  await page.waitForTimeout(4000);
  const bootMilliseconds=Date.now()-bootStartedAt;

  // 바탕화면용 960px 템플릿이 모바일 화면에 축소되어도 터치 로그만으로 통과시키지 않는다.
  const mobileLayout=await page.evaluate(()=>({
    userAgent:navigator.userAgent,
    innerWidth:window.innerWidth,
    documentWidth:document.documentElement.scrollWidth,
    visualWidth:window.visualViewport?.width??window.innerWidth,
    viewportMeta:document.querySelector('meta[name="viewport"]')?.getAttribute('content')||'',
    unityContainerClass:document.querySelector('#unity-container')?.className||'',
  }));
  if(!mobileLayout.userAgent.includes('Android')||
     Math.abs(mobileLayout.innerWidth-mobileViewport.width)>2||
     mobileLayout.documentWidth>mobileViewport.width+2||
     mobileLayout.visualWidth>mobileViewport.width+2){
    throw new Error('UNITY_WEB_QA_ANDROID_VIEWPORT_MISMATCH:'+JSON.stringify({mobileViewport,mobileLayout}));
  }

  const boot=()=>markers.some(x=>x.includes(' BOOT ')&&x.includes(`game=${gameId}`)&&x.includes('status=PASS'));
  if(!boot())throw new Error('UNITY_WEB_QA_BOOT_MARKER_MISSING');
  const worldMeshMarker=markers.find(x=>x.includes('UNITY_WEB_WORLD=VISUAL_MESH_AUTHORED')&&x.includes(`game=${gameId}`))||null;
  if(approvedEnvironment.required===true){
    if(markers.some(x=>x.includes('UNITY_WEB_WORLD=REPAIR_REQUIRED')))throw new Error('UNITY_WEB_APPROVED_ENVIRONMENT_NATIVE_AUTHORING_FAILED');
    if(!worldMeshMarker)throw new Error('UNITY_WEB_APPROVED_ENVIRONMENT_MESH_NOT_OBSERVED');
    for(const [field,tag] of [['terrainCells','terrain'],['buildingCount','buildings'],['vegetationCount','vegetation']]){
      if(!worldMeshMarker.includes(`${tag}=${approvedEnvironment[field]}`))
        throw new Error('UNITY_WEB_APPROVED_ENVIRONMENT_GEOMETRY_COUNT_MISMATCH:'+tag);
    }
    if(!markers.some(x=>x.includes(`game=${gameId}`)&&x.includes('domain=environment status=PASS')))
      throw new Error('UNITY_WEB_APPROVED_ENVIRONMENT_VISUAL_RUNTIME_NOT_READY');
  }
  const initialStateLine=markers.slice().reverse().find(x=>x.includes(' STATE '))||'';
  const initialState=parseState(initialStateLine);

  const canvas=page.locator('canvas').first();
  const canvasBox=await canvas.boundingBox();
  if(!canvasBox||canvasBox.width<1||canvasBox.height<1)throw new Error('UNITY_WEB_QA_CANVAS_BOUNDS_MISSING_FOR_TOUCH');

  const mobileTargetLine=markers.slice().reverse().find(x=>x.includes(' MOBILE_TARGET ')&&x.includes('role=action'))||'';
  const mobileTargetX=Number(mobileTargetLine.match(/\bx=([0-9.]+)/)?.[1]);
  const mobileTargetY=Number(mobileTargetLine.match(/\by=([0-9.]+)/)?.[1]);
  if(!mobileTargetLine||!Number.isFinite(mobileTargetX)||!Number.isFinite(mobileTargetY)||mobileTargetX<=0||mobileTargetX>=1||mobileTargetY<=0||mobileTargetY>=1){
    throw new Error('UNITY_WEB_QA_REAL_MOBILE_ACTION_TARGET_MISSING');
  }
  const touchX=canvasBox.x+(canvasBox.width*mobileTargetX);
  const touchY=canvasBox.y+(canvasBox.height*mobileTargetY);
  if(touchX<0||touchX>=mobileViewport.width||touchY<0||touchY>=mobileViewport.height){
    throw new Error('UNITY_WEB_QA_REAL_MOBILE_ACTION_OFFSCREEN:'+JSON.stringify({touchX,touchY,mobileViewport,canvasBox}));
  }

  let gameplayStartInput='KEYBOARD_DIGIT1';
  await canvas.focus();
  await page.keyboard.press('Digit1');
  await page.waitForTimeout(1200);
  let enteredGameplay=markers.some(x=>(x.includes(' START ')||x.includes(' REGION '))&&!x.includes('region=town'));
  if(!enteredGameplay){
    gameplayStartInput='REAL_BROWSER_TOUCH_FALLBACK';
    await page.touchscreen.tap(touchX,touchY);
    await page.waitForTimeout(900);
    enteredGameplay=markers.some(x=>(x.includes(' START ')||x.includes(' REGION '))&&!x.includes('region=town'));
  }
  if(!enteredGameplay)throw new Error('UNITY_WEB_QA_GAMEPLAY_START_MISSING');

  const mobileMarkerStart=markers.length;
  await page.touchscreen.tap(touchX,touchY);
  await page.waitForTimeout(900);
  const mobileInputObserved=markers.slice(mobileMarkerStart).some(x=>x.includes(' MOBILE_INPUT ')&&x.includes('role=action')&&x.includes('status=PASS'));
  if(!mobileInputObserved)throw new Error('UNITY_WEB_QA_REAL_MOBILE_ACTION_NOT_OBSERVED');

  await canvas.focus();
  for(let i=0;i<20&&!markers.some(x=>x.includes(' REWARD ')||x.includes(' PROGRESS '));i++){
    await page.keyboard.press('Space');
    await page.waitForTimeout(250);
  }

  const actions=markers.filter(x=>x.includes(' ATTACK ')||x.includes(' ACTION '));
  const progress=markers.filter(x=>x.includes(' REWARD ')||x.includes(' PROGRESS '));
  const coreFunMarkers=markers.filter(x=>x.includes(' CORE_FUN ')&&x.includes('status=PASS'));
  if(actions.length<1)throw new Error('UNITY_WEB_QA_CORE_ACTION_EVIDENCE_MISSING');
  if(progress.length<1)throw new Error('UNITY_WEB_QA_PROGRESS_EVIDENCE_MISSING');
  if(coreFunMarkers.length<1)throw new Error('UNITY_WEB_QA_GENRE_CORE_FUN_EVIDENCE_MISSING');

  // 게임플레이 중 실제 브라우저 렌더 루프를 관찰한다. 첫 로딩 시간만으로 FPS PASS를 주장하지 않는다.
  const framePacing=await page.evaluate(()=>new Promise(resolve=>{
    const intervals=[];
    let first=null,previous=null,finished=false;
    const finish=()=>{
      if(finished)return;
      finished=true;
      const sorted=intervals.slice().sort((a,b)=>a-b);
      const percentile=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]:null;
      const medianFrameMs=percentile(0.5),p95FrameMs=percentile(0.95);
      resolve({
        frameCount:sorted.length,
        medianFrameMs,
        p95FrameMs,
        approximateMedianFps:medianFrameMs?Math.round(10000/medianFrameMs)/10:null
      });
    };
    const timer=setTimeout(finish,3500);
    const onFrame=now=>{
      if(finished)return;
      if(first===null)first=now;
      if(previous!==null&&now>previous)intervals.push(now-previous);
      previous=now;
      if(now-first>=2400){clearTimeout(timer);finish();}
      else requestAnimationFrame(onFrame);
    };
    requestAnimationFrame(onFrame);
  }));
  if(framePacing.frameCount<25||!Number.isFinite(framePacing.medianFrameMs)||
     framePacing.medianFrameMs>38||framePacing.p95FrameMs>100)
    throw new Error('UNITY_WEB_QA_FRAME_PACING_FAILED:'+JSON.stringify(framePacing));

  await canvas.focus();
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(2200);
  const safeReturnObserved=markers.some(x=>x.includes(' RETURN ')||x.includes(' RESET ')||(x.includes(' REGION ')&&x.includes('region=town')));
  if(!safeReturnObserved)throw new Error('UNITY_WEB_QA_SAFE_RETURN_OR_RESET_MISSING');

  const statesBeforeReload=markers.filter(x=>x.includes(' STATE '));
  const progressedStateLine=statesBeforeReload.slice().reverse()[0]||'';
  const progressedState=parseState(progressedStateLine);
  const persistentChangedKeys=Object.keys(progressedState).filter(key=>{
    if(volatileStateKeys.has(key)||!(key in initialState))return false;
    return String(progressedState[key])!==String(initialState[key]);
  });
  if(!persistentChangedKeys.length)throw new Error('UNITY_WEB_QA_PERSISTENT_PROGRESS_STATE_NOT_REFLECTED');

  const reloadMarkerStart=markers.length;
  await page.reload({waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForSelector('canvas',{state:'visible',timeout:90000});
  await page.waitForTimeout(3500);

  const persistedLine=markers.slice(reloadMarkerStart).reverse().find(x=>x.includes(' STATE '))||'';
  const persistedState=parseState(persistedLine);
  const restoredKeys=persistentChangedKeys.filter(key=>String(persistedState[key])===String(progressedState[key]));
  if(restoredKeys.length!==persistentChangedKeys.length)throw new Error(`UNITY_WEB_QA_SAVE_RESTORE_MISSING:${persistentChangedKeys.filter(key=>!restoredKeys.includes(key)).join(',')}`);

  const fatal=[...consoleErrors,...pageErrors,...failedRequests].filter(x=>/abort|out of memory|wasm.*error|failed to fetch|build error|exception/i.test(x));
  if(fatal.length)throw new Error(`UNITY_WEB_FATAL_RUNTIME_ERROR:${fatal.slice(0,5).join(' | ')}`);

  if(screenshot){
    fs.mkdirSync(path.dirname(screenshot),{recursive:true});
    await page.screenshot({path:screenshot,fullPage:false});
  }

  const evidence={
    version:1,
    engine:'UNITY_WEB',
    gameId,
    sourcePath:source,
    approvedEnvironment:{
      required:approvedEnvironment.required===true,
      layoutSha256:approvedEnvironment.required===true?approvedEnvironment.layoutSha256:null,
      runtimeObserved:approvedEnvironment.required===true?Boolean(worldMeshMarker):false,
      geometryMarker:approvedEnvironment.required===true?worldMeshMarker:null,
      collisionPhysicsVerified:false,
    },
    pass:true,
    boot:{pass:true},
    input:{pass:true,qaMode:'REAL_GAME_FUNCTION_INPUT_AND_REAL_BROWSER_TOUCH',mobileInputObserved,canvasFocusedBeforeKeyboard:true,gameplayStartInput},
    gameplay:{
      pass:true,
      gameplayStartObserved:true,
      coreActionObserved:true,
      coreActionCount:actions.length,
      progressObserved:true,
      safeReturnOrResetObserved:true,
    },
    coreFun:{
      pass:coreFunMarkers.length>0,
      evidence:'GAME_EMITTED_GENRE_CORE_FUN_AFTER_REAL_PROGRESS',
      markerCount:coreFunMarkers.length,
      markers:coreFunMarkers,
    },
    saveRestore:{pass:true,persistentChangedKeys,restoredKeys},
    mobile:{
      pass:mobileInputObserved,
      viewport:mobileViewport,
      layout:mobileLayout,
      touch:true,
      target:{role:'action',x:mobileTargetX,y:mobileTargetY,canvasBox,touchPoint:{x:touchX,y:touchY}},
      actualBrowserTouchDispatched:true,
      realGameTouchHandlerObserved:mobileInputObserved,
    },
    performance:{pass:bootMilliseconds<=90000&&fatal.length===0&&framePacing.medianFrameMs<=38&&framePacing.p95FrameMs<=100,bootMilliseconds,fatalRuntimeErrorCount:fatal.length,framePacing,measurementSurface:'PLAYWRIGHT_MOBILE_BROWSER_EMULATION',realDeviceVerified:false},
    noCriticalRuntimeError:fatal.length===0,
    markers,
    generatedAt:new Date().toISOString(),
  };
  if(output){
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
  }
  console.log('UNITY_WEB_GAMEPLAY_QA=PASS');
  await browser.close();
} finally {
  await new Promise(resolve=>server.close(resolve));
}
