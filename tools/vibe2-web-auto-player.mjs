// 파일명: tools/vibe2-web-auto-player.mjs
// 역할: Chrome DevTools Protocol로 Web 게임에 실제 키/마우스 입력을 보내고 PLAY LOG/TELEMETRY 증거를 만든다.
// 외부 npm 의존성 없이 Node 22 + Chrome/Chromium만 사용한다.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { normalizeAutoPlayerScenario, createAutoPlayerResult, persistAutoPlayerResult, applyAutoPlayerEvidenceToManifest } from './vibe2-auto-player-contract.mjs';

const clean=v=>String(v??'').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function argsOf(argv=process.argv.slice(2)){const o={};for(const raw of argv){if(!raw.startsWith('--'))continue;const b=raw.slice(2),i=b.indexOf('=');i<0?o[b]=true:o[b.slice(0,i)]=b.slice(i+1);}return o;}
function which(x){try{return clean(execFileSync('which',[x],{encoding:'utf8'}));}catch{return'';}}
export function findChromeBinary(explicit=''){for(const x of [clean(explicit),clean(process.env.CHROME_PATH),'google-chrome','google-chrome-stable','chromium','chromium-browser'].filter(Boolean)){if(x.includes('/')&&fs.existsSync(x))return x;const y=which(x);if(y)return y;}return'';}

async function serve(root){
  const base=path.resolve(root);
  const server=http.createServer((req,res)=>{
    const raw=decodeURIComponent(String(req.url||'/').split('?')[0]);
    const rel=(raw==='/'?'index.html':raw.replace(/^\/+/,''));
    let file=path.resolve(base,rel);
    if(file!==base&&!file.startsWith(base+path.sep)){res.statusCode=403;res.end('forbidden');return;}
    try{if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');}catch{}
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;res.end('not found');return;}
    const ext=path.extname(file).toLowerCase();
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
    res.setHeader('content-type',types[ext]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return{server,url:`http://127.0.0.1:${server.address().port}`};
}
function getJson(url){return new Promise((resolve,reject)=>http.get(url,res=>{let s='';res.setEncoding('utf8');res.on('data',c=>s+=c);res.on('end',()=>{try{if((res.statusCode||0)>=300)throw new Error(`HTTP ${res.statusCode}`);resolve(JSON.parse(s));}catch(e){reject(e);}});}).on('error',reject));}
async function waitFile(file,ms=10000){const t=Date.now();while(Date.now()-t<ms){if(fs.existsSync(file)&&fs.statSync(file).size>0)return;await sleep(50);}throw new Error('Chrome DevToolsActivePort timeout');}

class CDP{
  constructor(url){this.url=url;this.ws=null;this.seq=0;this.pending=new Map();this.events=new Map();}
  async open(){this.ws=new WebSocket(this.url);this.ws.addEventListener('message',e=>this.message(String(e.data||'')));await new Promise((ok,fail)=>{const t=setTimeout(()=>fail(new Error('CDP open timeout')),8000);this.ws.addEventListener('open',()=>{clearTimeout(t);ok();},{once:true});this.ws.addEventListener('error',()=>{clearTimeout(t);fail(new Error('CDP websocket error'));},{once:true});});}
  message(text){let m;try{m=JSON.parse(text);}catch{return;}if(m.id){const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(p.t);m.error?p.fail(new Error(`${p.method}: ${m.error.message}`)):p.ok(m.result||{});return;}for(const fn of this.events.get(m.method)||[]){try{fn(m.params||{});}catch{}}}
  on(name,fn){const a=this.events.get(name)||[];a.push(fn);this.events.set(name,a);}
  send(method,params={}){const id=++this.seq;return new Promise((ok,fail)=>{const t=setTimeout(()=>{this.pending.delete(id);fail(new Error(`CDP timeout: ${method}`));},10000);this.pending.set(id,{ok,fail,t,method});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws?.close();}catch{}}
}
async function launch(binary){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-chrome-'));
  const child=spawn(binary,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${dir}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
  const portFile=path.join(dir,'DevToolsActivePort');
  await waitFile(portFile);
  const port=Number(fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0]);
  const pages=await getJson(`http://127.0.0.1:${port}/json/list`);
  const page=pages.find(x=>x.type==='page'&&x.webSocketDebuggerUrl)||pages.find(x=>x.webSocketDebuggerUrl);
  if(!page)throw new Error('Chrome page target 없음');
  return{child,dir,ws:page.webSocketDebuggerUrl,browser:path.basename(binary)};
}
async function evalJs(cdp,expression){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text||'runtime evaluate exception');return r.result?.value;}
async function ready(cdp,ms){const t=Date.now();while(Date.now()-t<ms){try{const s=await evalJs(cdp,'document.readyState');if(s==='complete'||s==='interactive')return;}catch{}await sleep(50);}throw new Error('page ready timeout');}
function keyInfo(key,code){const map={ArrowLeft:['ArrowLeft','ArrowLeft',37],ArrowUp:['ArrowUp','ArrowUp',38],ArrowRight:['ArrowRight','ArrowRight',39],ArrowDown:['ArrowDown','ArrowDown',40],Space:[' ','Space',32],Enter:['Enter','Enter',13],Escape:['Escape','Escape',27]};if(map[key])return{key:map[key][0],code:map[key][1],vk:map[key][2]};const k=key||code||'';const upper=k.length===1?k.toUpperCase():k;return{key:k,code:code||(k.length===1&&/[a-z]/i.test(k)?`Key${upper}`:k),vk:k.length===1?upper.charCodeAt(0):0};}
async function key(cdp,a){const d=keyInfo(a.key,a.code);await cdp.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:d.key,code:d.code,windowsVirtualKeyCode:d.vk,nativeVirtualKeyCode:d.vk});await sleep(a.holdMs||50);await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:d.key,code:d.code,windowsVirtualKeyCode:d.vk,nativeVirtualKeyCode:d.vk});}
async function click(cdp,selector){const p=await evalJs(cdp,`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect();return r.width>0&&r.height>0?{x:r.left+r.width/2,y:r.top+r.height/2}:null})()`);if(!p)throw new Error(`click 대상 없음: ${selector}`);await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',buttons:1,clickCount:1});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',buttons:0,clickCount:1});}
async function playability(cdp,required){const v=await evalJs(cdp,`(()=>{const x=window.__VIBE2_PLAYABILITY_EVIDENCE__||null;if(!x)return null;if(x.authority==='v2-playability-evidence'&&typeof window.requireJaewoonVibePlayability==='function')return window.requireJaewoonVibePlayability(x);return x;})()`);return{required:required===true,trusted:v?.authority==='v2-playability-gate'||v?.authority==='v2-playability-evidence',playable:v?.playable===true,value:v};}

export async function runWebAutoPlayer({root='',url='',scenarioFile='',scenario=null,outputFile='',manifestFile='',chromePath=''}={}){
  const sc=normalizeAutoPlayerScenario(scenario||JSON.parse(fs.readFileSync(scenarioFile,'utf8')));if(sc.engine!=='web')throw new Error('Web AUTO PLAYER engine 불일치');
  const bin=findChromeBinary(chromePath);if(!bin)throw new Error('Chrome/Chromium 없음');
  let server=null,browser=null,cdp=null;const startedAt=new Date().toISOString(),t0=Date.now(),runId=`web-${Date.now()}-${process.pid}`,actions=[],checkpoints=[],errors=[];let firstInput=null,consoleErrors=0,pageUrl='';
  try{
    if(url)pageUrl=url;else{server=await serve(root);pageUrl=`${server.url}/${sc.page.replace(/^\/+/, '')}`;}
    browser=await launch(bin);cdp=new CDP(browser.ws);await cdp.open();await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Log.enable');
    cdp.on('Runtime.exceptionThrown',p=>errors.push({type:'runtime-exception',message:clean(p?.exceptionDetails?.text)||'runtime exception'}));
    cdp.on('Log.entryAdded',p=>{if(p?.entry?.level==='error'){consoleErrors++;errors.push({type:'console-error',message:clean(p.entry.text)||'console error'});}});
    await cdp.send('Page.navigate',{url:pageUrl});await ready(cdp,Math.min(sc.timeoutMs,15000));
    for(const a of sc.actions){const r={id:a.id,type:a.type,dispatched:false,ok:false};try{
      if(a.type==='wait'){await sleep(a.ms||50);r.ok=true;}
      else if(a.type==='key'){if(firstInput==null)firstInput=Date.now();await key(cdp,a);r.dispatched=true;r.ok=true;}
      else if(a.type==='click'){if(firstInput==null)firstInput=Date.now();await click(cdp,a.selector);r.dispatched=true;r.ok=true;}
      else if(a.type==='expect'){const value=await evalJs(cdp,a.expression);const pass=value===true;checkpoints.push({id:a.id,name:a.name||a.id,required:a.required!==false,pass,value});r.ok=pass;if(a.required!==false&&!pass)throw new Error(`checkpoint 실패: ${a.name||a.id}`);}
      else if(a.type==='evaluate'){r.value=await evalJs(cdp,a.expression);r.ok=true;}
      else if(a.type==='reload'){await cdp.send('Page.reload',{ignoreCache:true});await ready(cdp,10000);r.ok=true;}
      else throw new Error(`지원하지 않는 Web action: ${a.type}`);
    }catch(e){r.error=e.message;errors.push({type:'action-error',actionId:a.id,message:e.message});if(a.required!==false){actions.push(r);break;}}actions.push(r);}
    const p=await playability(cdp,sc.requirePlayability);
    const result=createAutoPlayerResult({engine:'web',runId,startedAt,finishedAt:new Date().toISOString(),browser:browser.browser,page:pageUrl,actions,checkpoints,errors:sc.failOnRuntimeError?errors:errors.filter(x=>x.type==='action-error'),playability:p,metrics:{durationMs:Date.now()-t0,timeToFirstActionMs:firstInput==null?null:firstInput-t0,consoleErrorCount:consoleErrors},artifactPath:outputFile});
    if(outputFile)persistAutoPlayerResult(outputFile,result);if(manifestFile)applyAutoPlayerEvidenceToManifest(manifestFile,result,{artifactPath:outputFile});return result;
  }finally{cdp?.close();try{browser?.child.kill('SIGKILL');}catch{}if(browser?.dir)fs.rmSync(browser.dir,{recursive:true,force:true});if(server)await new Promise(r=>server.server.close(r));}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const a=argsOf();const result=await runWebAutoPlayer({root:clean(a.root),url:clean(a.url),scenarioFile:clean(a.scenario),outputFile:clean(a.output),manifestFile:clean(a.manifest),chromePath:clean(a.chrome)});console.log(`VIBE2_AUTO_PLAYER_ENGINE=${result.engine}`);console.log(`VIBE2_AUTO_PLAYER_VERIFIED=${result.verified?'YES':'NO'}`);console.log(`VIBE2_AUTO_PLAYER_RUN_ID=${result.runId}`);console.log(`VIBE2_AUTO_PLAYER_INPUTS=${result.telemetry.metrics.inputActionCount}`);console.log(`VIBE2_AUTO_PLAYER_CHECKPOINTS=${result.telemetry.metrics.checkpointPassCount}/${result.telemetry.metrics.checkpointCount}`);if(!result.verified)process.exitCode=1;}
