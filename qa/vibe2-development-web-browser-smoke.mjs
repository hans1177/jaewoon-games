// qa/vibe2-development-web-browser-smoke.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';

const ROOT=process.cwd();
const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'game-catalog.json'),'utf8'));
const gameIds=(catalog.games||[])
  .filter(game=>String(game.productionClass||'').toUpperCase()==='DEVELOPMENT_CONFIRMED')
  .map(game=>String(game.id||'').trim())
  .filter(Boolean)
  .sort();

assert.ok(gameIds.length>=10,'DEVELOPMENT_CONFIRMED browser smoke requires current game catalog');

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
    this.networkFailures=[];
    this.networkResponses=[];
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
      if(message.method==='Network.loadingFailed'){
        this.networkFailures.push({
          url:String(message.params?.requestId||''),
          requestId:String(message.params?.requestId||''),
          errorText:String(message.params?.errorText||''),
          blockedReason:String(message.params?.blockedReason||''),
          canceled:message.params?.canceled===true
        });
      }
      if(message.method==='Network.responseReceived'){
        const response=message.params?.response||{};
        this.networkResponses.push({
          requestId:String(message.params?.requestId||''),
          url:String(response.url||''),
          status:Number(response.status||0),
          mimeType:String(response.mimeType||''),
          resourceType:String(message.params?.type||'')
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
try{
  const target=await waitForPageTarget(debugPort,45000);
  cdp=new CdpClient(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  const results=[];
  for(const gameId of gameIds){
    cdp.exceptions.length=0;
    cdp.networkFailures.length=0;
    cdp.networkResponses.length=0;
    const missingStart=local404.length;
    const loaded=cdp.waitEvent('Page.loadEventFired',12000);
    const url=`http://127.0.0.1:${sitePort}/web-games/${encodeURIComponent(gameId)}/index.html`;
    await cdp.send('Page.navigate',{url});
    await loaded;
    await delay(500);

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
      const byText=[...document.querySelectorAll('button')].find(button=>
        visible(button)&&/(게임\\s*시작|시작|플레이|열기|입장|start|play)/i.test((button.id||'')+' '+(button.textContent||''))
      );
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

    const state=await cdp.evaluate(`(()=>({
      title:document.title,
      bodyText:(document.body?.innerText||'').slice(0,1000),
      bodyChildren:document.body?.children?.length||0,
      canvasCount:document.querySelectorAll('canvas').length,
      loadingFailure:/로딩 실패|loading failed|failed to load the game/i.test(document.body?.innerText||''),
      href:location.href
    }))()`);

    const assetAudit=await cdp.evaluate(`(async()=>{
      const sameOrigin=url=>{
        try{
          const parsed=new URL(url,location.href);
          return parsed.origin===location.origin && /^https?:$/.test(parsed.protocol);
        }catch{return false;}
      };
      const normalize=url=>{
        try{return new URL(url,location.href).href}catch{return''}
      };
      const imageUrls=new Set();
      const resourceUrls=new Set();
      for(const node of document.querySelectorAll('img[src],audio[src],video[src],source[src]')){
        const raw=node.getAttribute('src');
        if(!raw)continue;
        const absolute=normalize(raw);
        if(!sameOrigin(absolute))continue;
        resourceUrls.add(absolute);
        if(node.tagName==='IMG')imageUrls.add(absolute);
      }
      for(const node of document.querySelectorAll('*')){
        const bg=getComputedStyle(node).backgroundImage||'';
        for(const match of bg.matchAll(/url\\(["']?([^"'()]+)["']?\\)/g)){
          const absolute=normalize(match[1]);
          if(!sameOrigin(absolute))continue;
          resourceUrls.add(absolute);
          imageUrls.add(absolute);
        }
      }
      const fetchFailures=[];
      for(const url of resourceUrls){
        try{
          const response=await fetch(url,{cache:'no-store'});
          if(!response.ok)fetchFailures.push({url,status:response.status});
        }catch(error){
          fetchFailures.push({url,status:0,error:String(error?.message||error)});
        }
      }
      const imageDecodeFailures=[];
      for(const url of imageUrls){
        const result=await new Promise(resolve=>{
          const image=new Image();
          let settled=false;
          const done=(ok,error='')=>{
            if(settled)return;
            settled=true;
            resolve({ok,error});
          };
          const timer=setTimeout(()=>done(false,'IMAGE_DECODE_TIMEOUT'),4000);
          image.onload=()=>{
            clearTimeout(timer);
            if(image.naturalWidth>0&&image.naturalHeight>0)done(true);
            else done(false,'ZERO_DIMENSIONS');
          };
          image.onerror=()=>{
            clearTimeout(timer);
            done(false,'IMAGE_ERROR');
          };
          image.src=url+(url.includes('?')?'&':'?')+'vibe_asset_probe=1';
        });
        if(!result.ok)imageDecodeFailures.push({url,error:result.error});
      }
      return{
        localResourceCount:resourceUrls.size,
        localImageCount:imageUrls.size,
        fetchFailures,
        imageDecodeFailures
      };
    })()`);

    const missing=local404.slice(missingStart).filter(item=>item!=='/favicon.ico');
    const exceptions=cdp.exceptions.filter(error=>
      /TypeError|ReferenceError|SyntaxError|Error/i.test(error.description||error.text)
    );
    const originPrefix=`http://127.0.0.1:${sitePort}/`;
    const badResponses=cdp.networkResponses.filter(row=>row.url.startsWith(originPrefix)&&row.status>=400&&!row.url.endsWith('/favicon.ico'));
    const failedRequestIds=new Set(cdp.networkFailures.map(row=>row.requestId));
    const failedLocalResponses=cdp.networkResponses.filter(row=>failedRequestIds.has(row.requestId)&&row.url.startsWith(originPrefix)&&!row.url.endsWith('/favicon.ico'));

    assert.equal(missing.length,0,`${gameId}: local browser requests missing ${missing.join(',')}`);
    assert.equal(badResponses.length,0,`${gameId}: browser asset/http response failed ${JSON.stringify(badResponses)}`);
    assert.equal(failedLocalResponses.length,0,`${gameId}: browser local resource loading failed ${JSON.stringify(failedLocalResponses)}`);
    assert.equal(assetAudit?.fetchFailures?.length||0,0,`${gameId}: local asset fetch failed ${JSON.stringify(assetAudit?.fetchFailures||[])}`);
    assert.equal(assetAudit?.imageDecodeFailures?.length||0,0,`${gameId}: local image decode failed ${JSON.stringify(assetAudit?.imageDecodeFailures||[])}`);
    assert.equal(exceptions.length,0,`${gameId}: uncaught browser exception ${JSON.stringify(exceptions)}`);
    assert.ok(state?.title,`${gameId}: document title missing after browser boot`);
    assert.ok(Number(state?.bodyChildren||0)>0,`${gameId}: empty body after browser boot`);
    assert.equal(state?.loadingFailure,false,`${gameId}: browser boot rendered a loading failure`);

    results.push({
      gameId,
      clickedStart:Boolean(start?.clicked),
      startTarget:start?.target||'',
      canvasCount:Number(state?.canvasCount||0),
      localResourceCount:Number(assetAudit?.localResourceCount||0),
      localImageCount:Number(assetAudit?.localImageCount||0)
    });
  }

  console.log('DEVELOPMENT_WEB_BROWSER_SMOKE=PASS');
  console.log(JSON.stringify({count:results.length,results}));
}catch(error){
  const detail=`chromeExit=${String(chromeProc.exitCode)} stderr=${chromeStderr.slice(-2000)}`;
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
