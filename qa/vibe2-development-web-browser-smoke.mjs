// qa/vibe2-development-web-browser-smoke.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
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

async function waitForFile(file,timeoutMs=10000){
  const end=Date.now()+timeoutMs;
  while(Date.now()<end){
    if(fs.existsSync(file))return;
    await delay(50);
  }
  throw new Error('CHROME_DEVTOOLS_PORT_TIMEOUT');
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
const chromeProc=spawn(chrome,[
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-allow-origins=*',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  'about:blank'
],{stdio:['ignore','ignore','pipe']});

let chromeStderr='';
chromeProc.stderr?.on('data',chunk=>{chromeStderr+=String(chunk)});

let cdp;
try{
  const activePortFile=path.join(profile,'DevToolsActivePort');
  await waitForFile(activePortFile);
  const [debugPortRaw]=fs.readFileSync(activePortFile,'utf8').trim().split(/\r?\n/);
  const debugPort=Number(debugPortRaw);
  assert.ok(Number.isInteger(debugPort)&&debugPort>0,'Chrome DevTools port invalid');

  const target=await waitForPageTarget(debugPort);
  cdp=new CdpClient(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const results=[];
  for(const gameId of gameIds){
    cdp.exceptions.length=0;
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
      canvasCount:Number(state?.canvasCount||0)
    });
  }

  console.log('DEVELOPMENT_WEB_BROWSER_SMOKE=PASS');
  console.log(JSON.stringify({count:results.length,results}));
}finally{
  cdp?.close();
  try{chromeProc.kill('SIGTERM')}catch{}
  server.close();
  try{fs.rmSync(profile,{recursive:true,force:true})}catch{}
}

if(chromeProc.exitCode&&chromeProc.exitCode!==0){
  throw new Error('CHROME_EXIT_NONZERO:'+chromeProc.exitCode+' '+chromeStderr.slice(-2000));
}
