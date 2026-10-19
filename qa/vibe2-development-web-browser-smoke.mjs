// qa/vibe2-development-web-browser-smoke.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { assessExistingWebSource, selectDevelopmentWebValidationGames } from '../tools/vibe2-existing-web-assessment.mjs';

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
const chromeProc=spawn(chrome,[
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
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

    let nativeAssetEvidence=null;
    if(gameId==='party-rpg'){
      currentPhase='NATIVE_ASSET_RENDER';
      const deadline=Date.now()+20000;
      while(Date.now()<deadline){
        nativeAssetEvidence=await cdp.evaluate(`(()=>({diagnostics:window.vibe3dDiagnostics||null,x:window.partyRpgVibeState?.().p.x}))()`);
        if(nativeAssetEvidence?.diagnostics?.actors?.some(actor=>actor.kind==='player'))break;
        await delay(250);
      }
      const before=nativeAssetEvidence;
      assert.deepEqual(before?.diagnostics?.missing,[],gameId+': native asset requests must succeed');
      assert.equal(before?.diagnostics?.actors?.find(actor=>actor.kind==='player')?.id,'knight',gameId+': player must consume the registered character');
      assert.ok(before.diagnostics.drawCalls>0&&before.diagnostics.triangles>0,gameId+': WebGL must draw model geometry');
      await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
      try{
        await delay(350);
        nativeAssetEvidence=await cdp.evaluate(`(()=>({diagnostics:window.vibe3dDiagnostics,x:window.partyRpgVibeState().p.x}))()`);
        assert.ok(nativeAssetEvidence.x>before.x,gameId+': player movement must still work');
        assert.match(nativeAssetEvidence.diagnostics.actors.find(actor=>actor.kind==='player').clip,/Walking|WALK/,gameId+': movement must drive the model animation');
      }finally{
        await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
      }
      const inventory=await cdp.evaluate(`(()=>{
        const player=window.partyRpgVibeState().state.player;
        const before={gold:player.gold,owned:player.ownedWeapons.includes('wood')};
        document.getElementById('bagBtn').click();
        const title=document.getElementById('modalTitle').textContent;
        document.querySelector('[data-shop="weapon"]').click();
        document.querySelector('[data-buy="wood"]').click();
        document.getElementById('modalClose').click();
        return {title,before,gold:player.gold,weapon:player.weapon,saved:JSON.parse(localStorage.getItem('party-rpg-v1')).player.weapon};
      })()`);
      assert.match(inventory.title,/인벤토리/);
      assert.equal(inventory.weapon,'wood');assert.equal(inventory.saved,'wood');
      assert.equal(inventory.gold,inventory.before.gold-(inventory.before.owned?0:40),gameId+': original shop economy must remain intact');
      await delay(100);
      const equipment=await cdp.evaluate(`window.vibe3dDiagnostics.actors.find(actor=>actor.kind==='player').equipment`);
      assert.deepEqual(equipment,['1H_Sword'],gameId+': purchased equipment must reach the actor mesh');
    }

    currentPhase='STATE_SNAPSHOT';
    const state=await cdp.evaluate(`(()=>({
      title:document.title,
      bodyText:(document.body?.innerText||'').slice(0,1000),
      bodyChildren:document.body?.children?.length||0,
      canvasCount:document.querySelectorAll('canvas').length,
      loadingFailure:/로딩 실패|loading failed|failed to load the game/i.test(document.body?.innerText||''),
      href:location.href
    }))()`);

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

    results.push({
      gameId,
      clickedStart:Boolean(start?.clicked),
      startTarget:start?.target||'',
      canvasCount:Number(state?.canvasCount||0),
      nativeAssetEvidence
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
