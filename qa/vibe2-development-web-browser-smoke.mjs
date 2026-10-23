// qa/vibe2-development-web-browser-smoke.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { assessExistingWebSource, selectDevelopmentWebValidationGames } from '../tools/vibe2-existing-web-assessment.mjs';
import { diagnoseVibeWebFrameBottleneck } from '../tools/vibe2-performance-sanity.mjs';

const ROOT=process.cwd();
const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'game-catalog.json'),'utf8'));
// 실제 HTML을 가진 기존 웹게임을 전수 검사한다. 웹게임으로 선언한 누락 소스는
// selector가 여전히 반환하므로 반드시 HTTP 404 검사에서 실패한다.
const webSourceExists=game=>{
  const id=String(game.id||'').trim();
  return /^[a-z0-9][a-z0-9-]*$/.test(id)
    &&fs.existsSync(path.join(ROOT,'web-games',id,'index.html'));
};
const selected=selectDevelopmentWebValidationGames({catalog,webSourceExists});
const allGameIds=selected.map(game=>String(game.id||'').trim()).filter(Boolean).sort();
// [메인] PR은 실제 변경한 Web 게임의 독립 런타임을 검증하고, main/push는 모든 기존 Web 게임을 감사한다.
// 허용되지 않은 경로 또는 선언되지 않은 게임을 조용히 빼지 않는다.
const requestedScope=String(process.env.VIBE2_BROWSER_CHANGED_GAMES||'ALL').trim();
const requestedIds=requestedScope==='ALL'?null:requestedScope==='NONE'?[]
  :requestedScope.split(',').map(id=>id.trim()).filter(Boolean);
if(requestedIds){
  assert.ok(requestedIds.every(id=>/^[a-z0-9][a-z0-9-]*$/.test(id)),
    'DEVELOPMENT_WEB_BROWSER_SCOPE_INVALID');
  const unknown=requestedIds.filter(id=>!allGameIds.includes(id));
  assert.equal(unknown.length,0,'DEVELOPMENT_WEB_BROWSER_SCOPE_SOURCE_UNCLAIMED:'+unknown.join(','));
}
const gameIds=requestedIds?allGameIds.filter(id=>requestedIds.includes(id)):allGameIds;
console.log('DEVELOPMENT_WEB_BROWSER_SCOPE='+requestedScope);
console.log('DEVELOPMENT_WEB_BROWSER_FULL_CATALOG='+allGameIds.length);
const sourceUnclaimed=(catalog.games||[]).filter(game=>
  game.productionClass==='DEVELOPMENT_CONFIRMED'&&!webSourceExists(game)
  &&game.homepageWebPlayable!==true&&game.canonical?.sources?.web?.playable!==true
  &&String(game.selectedPlatform||game.canonical?.production?.selectedPlatform||'').toUpperCase()!=='WEB'
).map(game=>String(game.id||'')).filter(Boolean).sort();
console.log('DEVELOPMENT_WEB_SOURCE_UNCLAIMED='+sourceUnclaimed.join(','));
console.log('DEVELOPMENT_WEB_SOURCE_EXISTS_CHECKED='+gameIds.length);

assert.ok((catalog.games||[]).length>=10,'DEVELOPMENT_CONFIRMED browser smoke requires current game catalog');
// [대용량 원본] GitHub 단일 파일 조회 한도에 걸리는 HTML은 작업본에서 통째로 검사한다.
// 파일을 나누거나 게임 코드를 수정하지 않고 기존 평가기의 원본 해시·기능 신호를 재사용한다.
// 이 로그는 소스 판독 증거이며 실제 3D/모바일 런타임 통과 증거가 아니다.
const largeSourceAudit=[];
for(const gameId of gameIds){
  const sourcePath=path.join(ROOT,'web-games',gameId,'index.html');
  if(!fs.existsSync(sourcePath)||!fs.statSync(sourcePath).isFile())continue;
  const sourceBytes=fs.statSync(sourcePath).size;
  if(sourceBytes<=1024*1024)continue;
  const source=fs.readFileSync(sourcePath,'utf8');
  const readBytes=Buffer.byteLength(source,'utf8');
  assert.equal(readBytes,sourceBytes,gameId+': LARGE_WEB_SOURCE_INCOMPLETE_UTF8_READ');
  const assessed=assessExistingWebSource({html:source,sourceExists:true});
  assert.equal(assessed.evidence.sourceBytes,sourceBytes,gameId+': LARGE_WEB_SOURCE_ASSESSMENT_TRUNCATED');
  largeSourceAudit.push({
    gameId,sourceBytes,sourceSha256:assessed.evidence.sourceSha256,
    gameplaySignalCount:assessed.evidence.gameplaySignalCount,
    sourceReadFull:true,runtime3dVerified:false
  });
}
console.log('DEVELOPMENT_WEB_LARGE_SOURCE_AUDIT='+JSON.stringify(largeSourceAudit));

if(!gameIds.length){
  console.log('DEVELOPMENT_WEB_BROWSER_SMOKE=NOT_APPLICABLE');
  console.log('DEVELOPMENT_WEB_BROWSER_SMOKE_REASON='+ (requestedScope==='NONE'?'NO_CHANGED_WEB_SOURCE':'NO_PUBLIC_WEB_PLAYABILITY_CLAIMS'));
  process.exit(0);
}

function mime(file){
  const ext=path.extname(file).toLowerCase();
  return ({
    '.html':'text/html; charset=utf-8',
    '.js':'text/javascript; charset=utf-8',
    '.mjs':'text/javascript; charset=utf-8',
    '.json':'application/json; charset=utf-8',
    '.css':'text/css; charset=utf-8',
    '.svg':'image/svg+xml',
    '.png':'image/png',
    '.jpg':'image/jpeg',
    '.jpeg':'image/jpeg',
    '.webp':'image/webp',
    '.wasm':'application/wasm'
  })[ext]||'application/octet-stream';
}

const local404=[];
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url||'/','http://127.0.0.1');
    let pathname=decodeURIComponent(url.pathname);
    if(pathname.endsWith('/'))pathname+='index.html';
    const relative=pathname.replace(/^\/+/, '');
    const file=path.resolve(ROOT,relative);
    if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){
      res.writeHead(403).end('forbidden');
      return;
    }
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){
      if(pathname!=='/favicon.ico')local404.push(pathname);
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200,{
      'content-type':mime(file),
      'cache-control':'no-store'
    });
    fs.createReadStream(file).pipe(res);
  }catch(error){
    res.writeHead(500).end(String(error?.message||error));
  }
});

server.listen(0,'127.0.0.1');
await once(server,'listening');
const address=server.address();
assert.ok(address&&typeof address==='object','browser smoke server address missing');
const sitePort=address.port;

function findChrome(){
  for(const binary of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    const probe=spawnSync(binary,['--version'],{encoding:'utf8'});
    if(!probe.error&&probe.status===0)return binary;
  }
  throw new Error('DEVELOPMENT_WEB_BROWSER_SMOKE_CHROME_MISSING');
}

function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

async function allocateLocalPort(){
  const probe=net.createServer();
  probe.listen(0,'127.0.0.1');
  await once(probe,'listening');
  const value=probe.address();
  assert.ok(value&&typeof value==='object'&&Number(value.port)>0,'browser smoke debug port allocation failed');
  const port=Number(value.port);
  await new Promise((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
  return port;
}

async function waitForPageTarget(port,timeoutMs=10000){
  const end=Date.now()+timeoutMs;
  while(Date.now()<end){
    try{
      const response=await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets=await response.json();
      const page=targets.find(target=>target.type==='page'&&target.webSocketDebuggerUrl);
      if(page)return page;
    }catch{}
    await delay(80);
  }
  throw new Error('CHROME_PAGE_TARGET_TIMEOUT');
}

class CdpClient{
  constructor(url){
    this.url=url;
    this.ws=null;
    this.seq=0;
    this.pending=new Map();
    this.waiters=new Map();
    this.exceptions=[];
  }

  async connect(){
    this.ws=new WebSocket(this.url);
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('CDP_WEBSOCKET_OPEN_TIMEOUT')),8000);
      this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});
      this.ws.addEventListener('error',event=>{clearTimeout(timer);reject(new Error('CDP_WEBSOCKET_ERROR:'+String(event?.message||'')))},{once:true});
    });
    this.ws.addEventListener('message',event=>{
      const message=JSON.parse(String(event.data));
      if(message.id){
        const pending=this.pending.get(message.id);
        if(!pending)return;
        this.pending.delete(message.id);
        if(message.error)pending.reject(new Error(message.error.message||'CDP_ERROR'));
        else pending.resolve(message.result||{});
        return;
      }
      if(message.method==='Runtime.exceptionThrown'){
        const details=message.params?.exceptionDetails||{};
        this.exceptions.push({
          text:String(details.text||''),
          url:String(details.url||''),
          lineNumber:Number(details.lineNumber||0),
          columnNumber:Number(details.columnNumber||0),
          description:String(details.exception?.description||details.exception?.value||'')
        });
      }
      const waiters=this.waiters.get(message.method);
      if(waiters?.length){
        const waiter=waiters.shift();
        waiter.resolve(message.params||{});
        if(!waiters.length)this.waiters.delete(message.method);
      }
    });
  }

  send(method,params={}){
    return new Promise((resolve,reject)=>{
      const id=++this.seq;
      const timer=setTimeout(()=>{
        this.pending.delete(id);
        reject(new Error('CDP_COMMAND_TIMEOUT:'+method));
      },10000);
      this.pending.set(id,{
        resolve:value=>{clearTimeout(timer);resolve(value)},
        reject:error=>{clearTimeout(timer);reject(error)}
      });
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }

  waitEvent(method,timeoutMs=10000){
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{
        const list=this.waiters.get(method)||[];
        this.waiters.set(method,list.filter(item=>item.resolve!==wrappedResolve));
        reject(new Error('CDP_EVENT_TIMEOUT:'+method));
      },timeoutMs);
      const wrappedResolve=value=>{clearTimeout(timer);resolve(value)};
      const list=this.waiters.get(method)||[];
      list.push({resolve:wrappedResolve});
      this.waiters.set(method,list);
    });
  }

  async evaluate(expression){
    const result=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw new Error('CDP_EVALUATE_EXCEPTION:'+String(result.exceptionDetails.text||''));
    return result.result?.value;
  }

  close(){
    try{this.ws?.close()}catch{}
  }
}

const chrome=findChrome();
const profile=fs.mkdtempSync('/tmp/vibe2-web-smoke-');
const debugPort=await allocateLocalPort();
// Existing browser QA now verifies a real GPU/software-WebGL2 frame for the modified Wild Forest.
// Keep the established Chrome options unchanged for unrelated games.
const wild3dOnly=gameIds.length===1&&gameIds[0]==='wild-survival';
const tower3dOnly=gameIds.length===1&&gameIds[0]==='tower-choice-rpg';
const star3dOnly=gameIds.length===1&&gameIds[0]==='seed-action-survival-rogu-echoes-of-the-lost-star';
const gem3dOnly=gameIds.length===1&&gameIds[0]==='gem-survivor';
const forestDefense3dOnly=gameIds.length===1&&gameIds[0]==='defense';
const insect3dOnly=gameIds.length===1&&gameIds[0]==='insect-survival';
const native3dOnly=wild3dOnly||tower3dOnly||star3dOnly||gem3dOnly||forestDefense3dOnly||insect3dOnly;
const chromeProc=spawn(chrome,[
  '--headless=new',
  '--no-sandbox',
  ...(native3dOnly?['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']:['--disable-gpu']),
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-allow-origins=*',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  'about:blank'
],{stdio:['ignore','ignore','pipe']});

let chromeStderr='';
chromeProc.stderr?.on('data',chunk=>{chromeStderr+=String(chunk)});

let cdp;
let currentGameId='CHROME_BOOT',currentPhase='CONNECT';
try{
  const target=await waitForPageTarget(debugPort,45000);
  cdp=new CdpClient(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const results=[];
  for(const gameId of gameIds){
    currentGameId=gameId;currentPhase='NAVIGATE';
    console.log('DEVELOPMENT_WEB_BROWSER_GAME='+gameId);
    cdp.exceptions.length=0;
    const missingStart=local404.length;
    const loaded=cdp.waitEvent('Page.loadEventFired',12000);
    const url=`http://127.0.0.1:${sitePort}/web-games/${encodeURIComponent(gameId)}/index.html`;
    await cdp.send('Page.navigate',{url});
    await loaded;
    await delay(500);

    if(tower3dOnly||gem3dOnly){
      // The owner game cannot start until the exact approved GLB is decoded.
      // Do not treat a click on a disabled Start button as native game evidence.
      currentPhase='TRUE_3D_ASSET_READY';
      let ready=false;
      for(let i=0;i<70;i++){
        const state=await cdp.evaluate(`(()=>({
          startEnabled:document.querySelector('#startBtn')?.disabled===false,
          error:document.body.dataset.spatialDimension==='3d-error',
          status:document.querySelector('#renderStatus')?.textContent||''
        }))()`);
        if(state?.error)throw Error('NATIVE_3D_ASSET_INIT_FAILED:'+gameId+':'+state.status);
        if(state?.startEnabled){ready=true;break}
        await delay(250);
      }
      assert.equal(ready,true,gameId+': native GLB or renderer failed to initialize');
    }
    currentPhase='START_INPUT';
    const start=await cdp.evaluate(`(()=>{
      const visible=element=>{
        if(!element||element.disabled)return false;
        const style=getComputedStyle(element),rect=element.getBoundingClientRect();
        return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0&&rect.width>0&&rect.height>0;
      };
      const preferred=[
        document.querySelector('#startOffline'),
        document.querySelector('#startHuman'),
        document.querySelector('#startBtn'),
        document.querySelector('button#start'),
        document.querySelector('.starter')
      ].find(visible);
      const byText=[...document.querySelectorAll('button')].find(button=>{
        if(!visible(button))return false;
        const label=(button.id||'')+' '+(button.textContent||'');
        // 리셋/삭제/새 기록은 시작처럼 보여도 원본 세이브를 파괴하거나 confirm()으로 브라우저 검사를 정지시킨다.
        if(/(reset|restart|delete|erase|clear.?save|초기화|리셋|삭제|지우기|처음부터|새\\s*기록|재시작)/i.test(label))
          return false;
        return /(게임\\s*시작|시작|플레이|열기|입장|start|play)/i.test(label);
      });
      const target=preferred||byText||null;
      if(target)target.click();
      return {
        clicked:Boolean(target),
        target:target?String(target.id||target.className||target.textContent||'button').slice(0,120):'',
        title:document.title,
        bodyText:(document.body?.innerText||'').slice(0,500)
      };
    })()`);
    await delay(start?.clicked?800:300);

    currentPhase='STATE_SNAPSHOT';
    const state=await cdp.evaluate(`(()=>({
      title:document.title,
      bodyText:(document.body?.innerText||'').slice(0,1000),
      bodyChildren:document.body?.children?.length||0,
      canvasCount:document.querySelectorAll('canvas').length,
      loadingFailure:/로딩 실패|loading failed|failed to load the game/i.test(document.body?.innerText||''),
      href:location.href
    }))()`);

    if(gameId==='party-rpg'){
      // [실제 게임 연결] 등록만 된 CC0가 아니라 로더가 읽은 늑대 모델을 확인한다.
      currentPhase='PARTY_RPG_CC0_WOLF_NATIVE_RUNTIME';
      let evidence=null;
      for(let attempt=0;attempt<48;attempt++){
        evidence=await cdp.evaluate('window.vibe3dDiagnostics||null');
        if(evidence?.loaded?.includes('wolf'))break;
        await delay(250);
      }
      assert.ok(evidence?.loaded?.includes('wolf'),
        'party-rpg: registered CC0 wolf FBX must load as a real native 3D model: '+JSON.stringify(evidence));
      assert.ok(evidence?.missing?.includes('guardian'),
        'party-rpg: unverified replacement roles must remain explicitly missing');
    }
    currentPhase='ASSERT';
    const missing=local404.slice(missingStart).filter(item=>item!=='/favicon.ico');
    const exceptions=cdp.exceptions.filter(error=>
      /TypeError|ReferenceError|SyntaxError|Error/i.test(error.description||error.text)
    );

    assert.equal(missing.length,0,`${gameId}: local browser requests missing ${missing.join(',')}`);
    assert.equal(exceptions.length,0,`${gameId}: uncaught browser exception ${JSON.stringify(exceptions)}`);
    assert.ok(state?.title,`${gameId}: document title missing after browser boot`);
    assert.ok(Number(state?.bodyChildren||0)>0,`${gameId}: empty body after browser boot`);
    assert.equal(state?.loadingFailure,false,`${gameId}: browser boot rendered a loading failure`);

    // Static HTML metadata or an asset list cannot prove the game actually rendered 3D.
    // Only accept a completed Three.js frame AND a live WebGL2 drawing buffer.

    if(insect3dOnly){
      // Unlike the original generic smoke, this does not accept a 2D fallback.
      currentPhase='INSECT_CC0_TRUE_3D_GROUNDED_FRAME';
      let proof=null;
      for(let attempt=0;attempt<90;attempt++){
        proof=await cdp.evaluate(`(()=>{
          const canvas=document.querySelector('#insect3d');
          const gl=canvas?.getContext('webgl2');
          const ground=window.insect3DGroundingProof?.();
          return {
            ready:window.insectScene3DReady===true,
            rendered:canvas?.dataset.renderedFrame==='true',
            webgl2:gl instanceof WebGL2RenderingContext&&gl.drawingBufferWidth>0&&gl.drawingBufferHeight>0,
            canvasVisible:canvas&&getComputedStyle(canvas).display!=='none',
            legacyHidden:document.querySelector('#cv')?.style.visibility==='hidden',
            ground:ground||null,
            notice:(document.body?.innerText||'').slice(0,180)
          };
        })()`);
        if(proof?.ready&&proof?.rendered&&proof?.webgl2&&proof?.ground?.heroPresent)break;
        await delay(250);
      }
      console.log('DEVELOPMENT_WEB_TRUE_3D_BROWSER_EVIDENCE_insect-survival='+JSON.stringify(proof));
      assert.equal(proof?.ready,true,'insect-survival: CC0 3D scene never became ready');
      assert.equal(proof?.rendered,true,'insect-survival: no completed WebGL frame');
      assert.equal(proof?.webgl2,true,'insect-survival: WebGL2 drawing buffer absent');
      assert.equal(proof?.canvasVisible,true,'insect-survival: 3D canvas not visible');
      assert.equal(proof?.legacyHidden,true,'insect-survival: 2D fallback is still visible');
      assert.equal(proof?.ground?.tileCount,12,'insect-survival: original CC0 floor tiles missing');
      assert.equal(proof?.ground?.floorGpuInstances,12,
        'insect-survival: GPU floor must retain all 12 CC0 original panels');
      assert.equal(proof?.ground?.floorGpuVisible,true,
        'insect-survival: GPU-instanced CC0 floor render is missing');
      assert.ok(proof?.ground?.floorGpuBatches>=1,
        'insect-survival: no original CC0 floor submesh is instanced');
      assert.ok(Math.abs(proof?.ground?.floorTop)<.005,
        'insect-survival: original CC0 floor must align with ground Y=0');
      assert.ok(Number.isFinite(proof?.ground?.heroBottom)&&proof.ground.heroBottom>=proof.ground.floorTop-.12,
        'insect-survival: animated character is below original CC0 floor');
      // Feed actual browser counters into the EXISTING read-only Vibe diagnostic.
      // This doesn't claim Android hardware FPS or replace gameplay/security QA.
      await delay(450);
      const frameBudget=await cdp.evaluate('window.insect3DPerformanceProof?.()');
      const vibeDiagnosis=diagnoseVibeWebFrameBottleneck(frameBudget);
      console.log('DEVELOPMENT_WEB_VIBE_PERFORMANCE_EVIDENCE_insect-survival='+JSON.stringify(frameBudget));
      console.log('DEVELOPMENT_WEB_VIBE_BOTTLENECK_DIAGNOSIS_insect-survival='+JSON.stringify(vibeDiagnosis));
      assert.equal(frameBudget?.kind,'VIBE_WEB_RUNTIME_FRAME_EVIDENCE');
      assert.equal(frameBudget?.ready,true);
      assert.equal(frameBudget?.activeWebGL,true);
      assert.equal(frameBudget?.hardwareBenchmarkVerified,false);
      assert.equal(vibeDiagnosis?.observed,true,'Vibe cannot infer bottlenecks without observed WebGL frame');
      assert.equal(vibeDiagnosis?.advisoryOnly,true,'Vibe performance hints must not auto-promote');
      assert.ok(frameBudget?.pixelRatio<=frameBudget?.pixelRatioCap+.001);
      assert.ok(frameBudget?.pixelRatio>=frameBudget?.pixelRatioFloor-.001);
      assert.ok(frameBudget?.framesObserved>=1,'3D performance counters must advance on actual frames');
      assert.ok(frameBudget?.decorGpuBatches>=1,
        'insect-survival: repeated original CC0 decoration not GPU batched');
      assert.ok(frameBudget?.decorGpuInstances>=2,
        'insect-survival: no repeated original CC0 decorative mesh instances');
      assert.ok(frameBudget?.decorGpuProps>=2,
        'insect-survival: decorative prop reuse not observed');
      assert.ok(frameBudget?.decorGpuProps<=frameBudget?.totalDecor,
        'insect-survival: decorative GPU batches cannot duplicate source props');
    }
    if(insect3dOnly){
      // Chromium Android-sized viewport and native CDP touch event regression.
      // This is browser emulation only and never substitutes for physical mobile QA.
      currentPhase='INSECT_EMULATED_MOBILE_GROUNDED_TOUCH';
      await cdp.send('Emulation.setDeviceMetricsOverride',{
        width:393,height:852,deviceScaleFactor:2.5,mobile:true
      });
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      const mobileLoaded=cdp.waitEvent('Page.loadEventFired',12000);
      await cdp.send('Page.navigate',{url});
      await mobileLoaded;
      let mobileProof=null;
      for(let attempt=0;attempt<90;attempt++){
        mobileProof=await cdp.evaluate(`(()=>{
          const canvas=document.querySelector('#insect3d');
          const gl=canvas?.getContext('webgl2');
          const ground=window.insect3DGroundingProof?.();
          const dodge=document.querySelector('#dodgeBtn');
          const rect=dodge?.getBoundingClientRect();
          return {
            mobile:matchMedia('(pointer:coarse)').matches,
            viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio},
            ready:window.insectScene3DReady===true,
            rendered:canvas?.dataset.renderedFrame==='true',
            webgl2:gl instanceof WebGL2RenderingContext&&gl.drawingBufferWidth>0&&gl.drawingBufferHeight>0,
            canvasVisible:canvas&&getComputedStyle(canvas).display!=='none',
            ground:ground||null,
            dodge:rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2,
              fullyVisible:rect.width>0&&rect.height>0&&rect.left>=0&&rect.right<=innerWidth&&
                rect.top>=0&&rect.bottom<=innerHeight}:null,
            serial:Number(window.insectWorldSnapshot?.()?.player?.motionSerial)||0
          };
        })()`);
        if(mobileProof?.ready&&mobileProof?.rendered&&mobileProof?.webgl2&&mobileProof?.ground?.heroPresent)break;
        await delay(250);
      }
      console.log('DEVELOPMENT_WEB_MOBILE_EMULATION_EVIDENCE_insect-survival='+JSON.stringify(mobileProof));
      assert.equal(mobileProof?.mobile,true,'insect-survival: touch emulation not active');
      assert.equal(mobileProof?.viewport?.w,393,'insect-survival: mobile viewport width incorrect');
      assert.equal(mobileProof?.viewport?.h,852,'insect-survival: mobile viewport height incorrect');
      assert.equal(mobileProof?.ready,true,'insect-survival: mobile 3D did not initialize');
      assert.equal(mobileProof?.rendered,true,'insect-survival: mobile 3D frame missing');
      assert.equal(mobileProof?.webgl2,true,'insect-survival: mobile WebGL2 buffer missing');
      assert.equal(mobileProof?.canvasVisible,true,'insect-survival: mobile 3D canvas hidden');
      assert.equal(mobileProof?.ground?.tileCount,12,'insect-survival: mobile CC0 tiles missing');
      assert.equal(mobileProof?.ground?.floorGpuInstances,12,
        'insect-survival: mobile GPU floor must retain all 12 original CC0 panels');
      assert.equal(mobileProof?.ground?.floorGpuVisible,true,
        'insect-survival: mobile original CC0 tiles must render via instancing');
      assert.ok(Math.abs(mobileProof?.ground?.floorTop)<.005,
        'insect-survival: mobile CC0 ground Y mismatch');
      assert.ok(Number.isFinite(mobileProof?.ground?.heroBottom)&&mobileProof.ground.heroBottom>=-.12,
        'insect-survival: character sinks through ground in mobile viewport');
      assert.equal(mobileProof?.dodge?.fullyVisible,true,'insect-survival: mobile dodge control offscreen');
      // Send real CDP touch input to the game button, not a JS click().
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{
        x:mobileProof.dodge.x,y:mobileProof.dodge.y,id:1,radiusX:1,radiusY:1,force:1
      }]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await delay(180);
      const touchResult=await cdp.evaluate(`(()=>{
        const p=window.insectWorldSnapshot?.()?.player;
        const g=window.insect3DGroundingProof?.();
        return {serial:Number(p?.motionSerial)||0,motion:p?.motionAction,
          grounded:Boolean(g&&Number.isFinite(g.heroBottom)&&g.heroBottom>=g.floorTop-.12),
          ready:window.insectScene3DReady===true};
      })()`);
      const mobileBudget=await cdp.evaluate('window.insect3DPerformanceProof?.()');
      console.log('DEVELOPMENT_WEB_MOBILE_VIBE_PERFORMANCE_EVIDENCE_insect-survival='+JSON.stringify(mobileBudget));
      assert.equal(mobileBudget?.ready,true,'mobile WebGL frame budget must observe a ready scene');
      assert.ok(mobileBudget?.pixelRatio<=1.3+.001,'mobile resolution must respect the original cap');
      assert.ok(mobileBudget?.pixelRatio>=mobileBudget?.pixelRatioFloor-.001,'adaptive resolution floor');
      assert.equal(mobileBudget?.hardwareBenchmarkVerified,false,'emulation is not physical device profiling');
      assert.ok(mobileBudget?.decorGpuBatches>=1,
        'insect-survival: mobile decorative CC0 batch missing');
      assert.ok(mobileBudget?.decorGpuInstances>=2,
        'insect-survival: mobile repeated decorative GPU transforms missing');
      console.log('DEVELOPMENT_WEB_MOBILE_TOUCH_EVIDENCE_insect-survival='+JSON.stringify(touchResult));
      assert.ok(touchResult?.serial>mobileProof.serial,
        'insect-survival: physical touch event did not trigger accepted dodge');
      assert.equal(touchResult?.motion,'dodge','insect-survival: touch routed to wrong action');
      assert.equal(touchResult?.grounded,true,'insect-survival: actor sinks during touch-triggered dodge');
      assert.equal(touchResult?.ready,true,'insect-survival: 3D renderer stopped after touch action');
    }
    if(native3dOnly&&!insect3dOnly){
      currentPhase='TRUE_WEBGL_3D_FRAME';
      if(star3dOnly||gem3dOnly||forestDefense3dOnly)assert.equal(start?.clicked,true,gameId+': active gameplay start not clicked');
      assert.equal(start?.clicked,true,'wild-survival: survival start action was not triggered');
      let proof=null;
      for(let attempt=0;attempt<65;attempt++){
        proof=await cdp.evaluate(`(()=>{
          const canvas=document.querySelector('#game');
          const gl=canvas?.getContext('webgl2');
          return {
            dimension:document.body.dataset.spatialDimension||'',
            renderer:document.body.dataset.renderer||'',
            rendered:canvas?.dataset.renderedFrame==='true',
            webgl2:gl instanceof WebGL2RenderingContext && gl.drawingBufferWidth>0 && gl.drawingBufferHeight>0,
            loadingVisible:(()=>{
              const status=document.querySelector('#renderStatus');
              return Boolean(status&&!status.hidden&&getComputedStyle(status).display!=='none');
            })(),
            errorText:(document.querySelector('#renderStatus')?.textContent||'').slice(0,260)
          };
        })()`);
        if(proof?.rendered&&proof?.webgl2&&proof?.dimension==='3d')break;
        await delay(250);
      }
      console.log('DEVELOPMENT_WEB_TRUE_3D_BROWSER_EVIDENCE_'+gameId+'='+JSON.stringify(proof));
      assert.equal(proof?.dimension,'3d',gameId+': 3D scene did not initialize');
      assert.equal(proof?.renderer,'three-webgl',gameId+': 3D renderer is not authoritative');
      assert.equal(proof?.rendered,true,gameId+': no actual Three.js frame was produced');
      assert.equal(proof?.webgl2,true,gameId+': no live WebGL2 drawing buffer');
      assert.equal(proof?.loadingVisible,false,gameId+': 3D loading/error status remains visible');
      if(forestDefense3dOnly){
        currentPhase='DEFENSE_3D_TOWER_PICK';
        const build=await cdp.evaluate(`(()=>{
          const archer=document.querySelector('[data-build="archer"]'),canvas=document.querySelector('#game');
          const startGold=document.querySelector('#gold')?.textContent;
          if(!archer||!canvas)return {ok:false,reason:'missing controls'};
          archer.click();
          // Screen-space pointer must be translated through the 3D ground ray.
          // Search a bounded grid; original game only spends coins on a valid pad.
          const rect=canvas.getBoundingClientRect();
          let clicked=false,position=null;
          for(let row=0;row<15&&!clicked;row++)for(let col=0;col<15&&!clicked;col++){
            const x=rect.left+rect.width*(col+.5)/15;
            const y=rect.top+rect.height*(row+.5)/15;
            canvas.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:x,clientY:y,bubbles:true,cancelable:true}));
            if(document.querySelector('#gold')?.textContent!==startGold){clicked=true;position={x,y};}
          }
          return {clicked,startGold,finalGold:document.querySelector('#gold')?.textContent,position};
        })()`);
        console.log('DEFENSE_3D_TOWER_PICK='+JSON.stringify(build));
        assert.equal(build?.clicked,true,'defense: 3D raycast does not reach original tower build pads');
        assert.equal(build?.startGold,'골드 240');
        assert.equal(build?.finalGold,'골드 160','defense: 3D touch must use original archer cost 80');
      }
    }

    results.push({
      gameId,
      clickedStart:Boolean(start?.clicked),
      startTarget:start?.target||'',
      canvasCount:Number(state?.canvasCount||0)
    });
  }

  console.log('DEVELOPMENT_WEB_BROWSER_SMOKE=PASS');
  console.log(JSON.stringify({count:results.length,results}));
}catch(error){
  const detail=`game=${currentGameId} phase=${currentPhase} chromeExit=${String(chromeProc.exitCode)} stderr=${chromeStderr.slice(-2000)}`;
  throw new Error(`${String(error?.message||error)} ${detail}`,{cause:error});
}finally{
  cdp?.close();
  try{chromeProc.kill('SIGTERM')}catch{}
  server.close();
  try{fs.rmSync(profile,{recursive:true,force:true})}catch{}
}

if(chromeProc.exitCode&&chromeProc.exitCode!==0){
  throw new Error('CHROME_EXIT_NONZERO:'+chromeProc.exitCode+' '+chromeStderr.slice(-2000));
}
