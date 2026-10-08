// 파일명: tools/company-unity-web-gameplay-validation.mjs
// 역할: Unity Web 1차 게임을 실제 모바일 브라우저에서 실행하고 표준 QA 증거를 검증한다.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

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

  // 모바일 메뉴를 실제 손가락 입력으로 전환하고 다시 복귀시킨다. 텍스트 표시는 작동 증거가 아니다.
  let mobileMenuInteraction=null;
  if(gameId==='daechung-rpg'){
    const navTarget=markers.slice().reverse().find(line=>line.includes(' MENU_TARGET ')
      &&line.includes('game=daechung-rpg')&&line.includes('role=tab')&&line.includes('index=2'))||'';
    const navX=Number(navTarget.match(/\bx=([0-9.]+)/)?.[1]);
    const navY=Number(navTarget.match(/\by=([0-9.]+)/)?.[1]);
    if(!navTarget||!Number.isFinite(navX)||!Number.isFinite(navY)||navX<=0||navX>=1||navY<=0||navY>=1)
      throw new Error('UNITY_WEB_QA_MOBILE_MENU_TARGET_MISSING');
    const menuTarget={x:canvasBox.x+canvasBox.width*navX,y:canvasBox.y+canvasBox.height*navY};
    if(menuTarget.x<0||menuTarget.x>=mobileViewport.width||menuTarget.y<0||menuTarget.y>=mobileViewport.height)
      throw new Error('UNITY_WEB_QA_MOBILE_MENU_TARGET_OFFSCREEN');
    const menuInputStart=markers.length;
    await page.touchscreen.tap(menuTarget.x,menuTarget.y);
    await page.waitForTimeout(600);
    if(!markers.slice(menuInputStart).some(line=>line.includes(' MENU_INPUT ')&&line.includes('index=2')&&line.includes('status=PASS')))
      throw new Error('UNITY_WEB_QA_MOBILE_MENU_SOCIAL_NOT_INTERACTIVE');
    // 동일한 탭 줄의 첫 탭으로 돌아가 원래 화면을 복구한다.
    const boundsLine=markers.slice().reverse().find(line=>line.includes(' UI_BOUNDS ')&&line.includes('game=daechung-rpg'))||'';
    const getBound=key=>Number(boundsLine.match(new RegExp('\\b'+key+'=([0-9.]+)'))?.[1]);
    const firstTabX=(getBound('tabsLeft')+getBound('tabsWidth')/6)/getBound('screenWidth');
    if(!Number.isFinite(firstTabX)||firstTabX<=0||firstTabX>=1)throw new Error('UNITY_WEB_QA_MOBILE_MENU_BOUNDS_INVALID');
    const firstTapX=canvasBox.x+canvasBox.width*firstTabX;
    const firstMenuInputStart=markers.length;
    await page.touchscreen.tap(firstTapX,menuTarget.y);
    await page.waitForTimeout(600);
    if(!markers.slice(firstMenuInputStart).some(line=>line.includes(' MENU_INPUT ')&&line.includes('index=0')&&line.includes('status=PASS')))
      throw new Error('UNITY_WEB_QA_MOBILE_MENU_WORLD_RETURN_FAILED');
    mobileMenuInteraction={pass:true,actualBrowserTouch:true,visitedPages:['SOCIAL','WORLD'],
      target:menuTarget,returnedToWorld:true};
  }

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
  // 모바일 소프트웨어 브라우저의 프레임 성능 실패는 끝까지 관찰하고
  // 실제 이동·공격·보상·저장 증거를 보존한다. 상위 QA PASS와 별개인 테스트 공개 근거다.
  const framePacingFailed=framePacing.frameCount<25||!Number.isFinite(framePacing.medianFrameMs)||
    framePacing.medianFrameMs>38||framePacing.p95FrameMs>100;
  const performanceBlocked=framePacingFailed||bootMilliseconds>90000;

  // 실제 게임 진행 화면의 픽셀을 읽는다. 콘솔 PASS나 단순 스크린샷 파일 존재는 시각 QA가 아니다.
  const liveCapture=await page.screenshot({fullPage:false});
  const liveCaptureSha256=crypto.createHash('sha256').update(liveCapture).digest('hex');
  if(screenshot){
    fs.mkdirSync(path.dirname(screenshot),{recursive:true});
    fs.writeFileSync(screenshot,liveCapture);
  }
  const visualPixels=await page.evaluate(async encoded=>{
    const bytes=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0));
    const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
    const sampleWidth=80,sampleHeight=Math.max(1,Math.round(sampleWidth*bitmap.height/bitmap.width));
    const surface=document.createElement('canvas');
    surface.width=sampleWidth;surface.height=sampleHeight;
    const context=surface.getContext('2d',{willReadFrequently:true});
    if(!context)throw new Error('UNITY_WEB_QA_PIXEL_READBACK_UNAVAILABLE');
    context.drawImage(bitmap,0,0,sampleWidth,sampleHeight);
    bitmap.close();
    const pixels=context.getImageData(0,0,sampleWidth,sampleHeight).data;
    const histogram=new Map();let sampled=0,magenta=0;
    for(let offset=0;offset<pixels.length;offset+=4){
      const red=pixels[offset],green=pixels[offset+1],blue=pixels[offset+2],alpha=pixels[offset+3];
      if(alpha<240)continue;
      sampled++;
      if(red>=185&&blue>=175&&green<=115&&red>green*1.7&&blue>green*1.7)magenta++;
      const bucket=((red>>3)<<10)|((green>>3)<<5)|(blue>>3);
      histogram.set(bucket,(histogram.get(bucket)||0)+1);
    }
    const dominant=Math.max(0,...histogram.values());
    return {width:sampleWidth,height:sampleHeight,pixelCount:sampled,
      magentaRatio:sampled?magenta/sampled:1,dominantColorRatio:sampled?dominant/sampled:1,
      distinctColorBuckets:histogram.size,source:'REAL_GAMEPLAY_BROWSER_SCREENSHOT'};
  },liveCapture.toString('base64'));
  const mobileUiBounds=await page.evaluate(()=>{
    const viewport={width:window.innerWidth,height:window.innerHeight};
    const clipped=[];
    for(const element of document.querySelectorAll('canvas,button,input,[role="button"]')){
      const style=getComputedStyle(element),rect=element.getBoundingClientRect();
      if(style.display==='none'||style.visibility==='hidden'||rect.width<16||rect.height<16)continue;
      if(rect.left < -2||rect.right>viewport.width+2||rect.top < -2||rect.bottom>viewport.height+2)
        clipped.push({tag:element.tagName,id:element.id||null,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom});
    }
    return {viewport,clipped:clipped.slice(0,10)};
  });
  const nativeRenderMarker=markers.slice().reverse().find(line=>line.includes(' RENDER_STATS ')&&line.includes(`game=${gameId}`)&&line.includes('source=UNITY_NATIVE_RENDERER'))||'';
  const nativeDrawCalls=Number(nativeRenderMarker.match(/\bdrawCalls=(\d+)\b/)?.[1]);
  const nativeTriangles=Number(nativeRenderMarker.match(/\btriangles=(\d+)\b/)?.[1]);
  const nativeRenderCountersMeasured=Boolean(nativeRenderMarker)&&Number.isSafeInteger(nativeDrawCalls)&&nativeDrawCalls>=0&&Number.isSafeInteger(nativeTriangles)&&nativeTriangles>=0;
  const renderBudget={drawCallsMax:500,trianglesMax:250000};
  const renderBudgetExceeded=nativeRenderCountersMeasured&&(nativeDrawCalls>renderBudget.drawCallsMax||nativeTriangles>renderBudget.trianglesMax);
  const nativeUiMarker=markers.slice().reverse().find(line=>line.includes(' UI_BOUNDS ')
    &&line.includes(`game=${gameId}`)&&line.includes('surface=UNITY_ONGUI'))||'';
  const nativeUiKeys=['screenWidth','screenHeight','topLeft','topY','topWidth','topHeight',
    'controlsLeft','controlsY','controlsWidth','controlsHeight',
    'tabsLeft','tabsY','tabsWidth','tabsHeight','actionLeft','actionY','actionWidth','actionHeight'];
  const nativeUiRect=Object.fromEntries(nativeUiKeys.map(key=>{
    const token=nativeUiMarker.split(/\s+/).find(value=>value.startsWith(key+'='));
    return [key,token===undefined?null:Number(token.slice(key.length+1))];
  }));
  const nativeUiMeasured=Boolean(nativeUiMarker)&&Object.values(nativeUiRect).every(value=>Number.isFinite(value))
    &&nativeUiRect.screenWidth>0&&nativeUiRect.screenHeight>0;
  const withinNativeViewport=(left,top,width,height)=>left>=-2&&top>=-2&&width>0&&height>0
    &&left+width<=nativeUiRect.screenWidth+2&&top+height<=nativeUiRect.screenHeight+2;
  const nativeUiOffscreen=nativeUiMeasured
    &&(!withinNativeViewport(nativeUiRect.topLeft,nativeUiRect.topY,nativeUiRect.topWidth,nativeUiRect.topHeight)
      ||!withinNativeViewport(nativeUiRect.controlsLeft,nativeUiRect.controlsY,nativeUiRect.controlsWidth,nativeUiRect.controlsHeight)
      ||!withinNativeViewport(nativeUiRect.tabsLeft,nativeUiRect.tabsY,nativeUiRect.tabsWidth,nativeUiRect.tabsHeight)
      ||!withinNativeViewport(nativeUiRect.actionLeft,nativeUiRect.actionY,nativeUiRect.actionWidth,nativeUiRect.actionHeight));
  const nativeUiOverlap=nativeUiMeasured
    &&(nativeUiRect.topY+nativeUiRect.topHeight>nativeUiRect.tabsY+2
      ||nativeUiRect.tabsY+nativeUiRect.tabsHeight>nativeUiRect.controlsY+2
      ||nativeUiRect.controlsY+nativeUiRect.controlsHeight>nativeUiRect.actionY-6);
  const nativeUiMissing=gameId==='daechung-rpg'&&!nativeUiMeasured;
  const nativeMeshMarker=markers.slice().reverse().find(line=>line.includes(' MESH_INTEGRITY ')
    &&line.includes(`game=${gameId}`)&&line.includes('source=UNITY_MESH_FILTER'))||'';
  const nativeMeshMetric=key=>{
    const token=nativeMeshMarker.split(/\s+/).find(value=>value.startsWith(key+'='));
    return token===undefined?null:Number(token.slice(key.length+1));
  };
  const nativeMeshProof={
    inspected:nativeMeshMetric('inspected'),validMeshes:nativeMeshMetric('validMeshes'),
    triangles:nativeMeshMetric('triangles'),materialPass:nativeMeshMetric('materialPass'),
    texturePass:nativeMeshMetric('texturePass')
  };
  const nativeMeshVerified=Boolean(nativeMeshMarker)&&nativeMeshMarker.includes('status=PASS')
    &&Number.isSafeInteger(nativeMeshProof.inspected)&&nativeMeshProof.inspected>0
    &&nativeMeshProof.validMeshes===nativeMeshProof.inspected
    &&Number.isSafeInteger(nativeMeshProof.triangles)&&nativeMeshProof.triangles>0
    &&nativeMeshProof.materialPass===1&&nativeMeshProof.texturePass===1;
  const nativeMeshMissing=gameId==='daechung-rpg'&&!nativeMeshVerified;
  const shaderLikelyMissing=visualPixels.magentaRatio>=.25;
  const blankOrFrozenFrame=visualPixels.pixelCount<100||visualPixels.dominantColorRatio>=.997;
  const visualBlocked=shaderLikelyMissing||blankOrFrozenFrame||mobileUiBounds.clipped.length>0
    ||nativeUiOffscreen||nativeUiOverlap||nativeUiMissing||nativeMeshMissing;

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
    pass:!performanceBlocked&&!visualBlocked&&!renderBudgetExceeded,
    playableBrowserTest:true,
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
    visualQa:{
      pass:!visualBlocked,source:'REAL_GAMEPLAY_SCREENSHOT_PIXEL_READBACK',
      screenshotObserved:true,captureSha256:liveCaptureSha256,capturePersisted:Boolean(screenshot),
      magentaShaderLikelyMissing:shaderLikelyMissing,
      blankOrFrozenFrame,visualPixels,mobileUiBounds,
      nativeUnityUi:{measurementState:nativeUiMeasured?'UNITY_ONGUI_RUNTIME':'NOT_MEASURED',
        pass:nativeUiMeasured?!nativeUiOffscreen&&!nativeUiOverlap:null,offscreen:nativeUiOffscreen,
        overlapping:nativeUiOverlap,missingRequiredCapture:nativeUiMissing,
        sourceMarker:nativeUiMeasured?nativeUiMarker:null,rects:nativeUiMeasured?nativeUiRect:null},
      nativeUnityMesh:{measurementState:nativeMeshMarker?'UNITY_RUNTIME_MESH_INSPECTION':'NOT_MEASURED',
        pass:nativeMeshMarker?nativeMeshVerified:null,missingRequiredCapture:nativeMeshMissing,
        inspector:'UNITY_MESH_FILTER',metrics:nativeMeshMarker?nativeMeshProof:null,sourceMarker:nativeMeshMarker||null,
        libraryAssetPromotionGranted:false},
      realDeviceVerified:false,
    },
    nativeRenderBudget:{
      measurementState:nativeRenderCountersMeasured?'MEASURED_NATIVE_COUNTERS':'UNKNOWN_NOT_RECORDED',
      pass:nativeRenderCountersMeasured?!renderBudgetExceeded:null,
      drawCalls:nativeRenderCountersMeasured?nativeDrawCalls:null,
      triangles:nativeRenderCountersMeasured?nativeTriangles:null,
      limits:renderBudget,realDeviceVerified:false,
      automaticLodOrTextureMutationPerformed:false,
    },
    mobile:{
      pass:mobileInputObserved&&(!mobileMenuInteraction||mobileMenuInteraction.pass===true),
      menuInteraction:mobileMenuInteraction,
      viewport:mobileViewport,
      layout:mobileLayout,
      touch:true,
      target:{role:'action',x:mobileTargetX,y:mobileTargetY,canvasBox,touchPoint:{x:touchX,y:touchY}},
      actualBrowserTouchDispatched:true,
      realGameTouchHandlerObserved:mobileInputObserved,
    },
    performance:{pass:bootMilliseconds<=90000&&fatal.length===0&&framePacing.medianFrameMs<=38&&framePacing.p95FrameMs<=100&&framePacing.frameCount>=25,
      reason:framePacingFailed?'UNITY_WEB_QA_FRAME_PACING_FAILED':
        bootMilliseconds>90000?'UNITY_WEB_QA_BOOT_SLOW_FAILED':null,
      bootMilliseconds,fatalRuntimeErrorCount:fatal.length,framePacing,
      measurementSurface:'PLAYWRIGHT_MOBILE_BROWSER_EMULATION',realDeviceVerified:false},
    noCriticalRuntimeError:fatal.length===0,
    markers,
    generatedAt:new Date().toISOString(),
  };
  if(output){
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
  }
  await browser.close();
  if(performanceBlocked){
    console.error('UNITY_WEB_GAMEPLAY_QA=REPAIR_REQUIRED:PERFORMANCE');
    if(framePacingFailed)throw new Error('UNITY_WEB_QA_FRAME_PACING_FAILED:'+JSON.stringify(framePacing));
    throw new Error('UNITY_WEB_QA_BOOT_SLOW_FAILED:'+bootMilliseconds);
  }
  if(visualBlocked)throw new Error('UNITY_WEB_QA_VISUAL_RUNTIME_REPAIR_REQUIRED:'+JSON.stringify({
    shaderLikelyMissing,blankOrFrozenFrame,clippedControls:mobileUiBounds.clipped,
    nativeUiOffscreen,nativeUiOverlap,nativeUiMissing,nativeUiRect,nativeMeshMissing,nativeMeshProof,visualPixels
  }));
  if(renderBudgetExceeded)throw new Error('UNITY_WEB_QA_NATIVE_RENDER_BUDGET_EXCEEDED:'+JSON.stringify({
    drawCalls:nativeDrawCalls,triangles:nativeTriangles,limits:renderBudget
  }));
  console.log('UNITY_WEB_GAMEPLAY_QA=PASS');
} finally {
  await new Promise(resolve=>server.close(resolve));
}
