// 파일명: tools/autonomous-browser-smoke.mjs
// 역할: autonomous 후보 Web 게임을 실제 headless Chromium으로 열어 모바일 기준 로딩/런타임 오류를 독립 확인한다.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

const MIME={'.html':'text/html; charset=utf-8','.htm':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.wav':'audio/wav'};
const clean=v=>String(v??'').trim();
const safeId=v=>clean(v).replace(/[^A-Za-z0-9._-]+/g,'-').slice(0,80)||'candidate';

export function findBrowserExecutable(filesystem=fs){
  const explicit=clean(process.env.AUTONOMOUS_BROWSER_BIN);
  const candidates=[explicit,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
  return candidates.find(file=>{try{return filesystem.statSync(file).isFile();}catch{return false;}})||null;
}

function requestPath(root,url){
  const pathname=decodeURIComponent(new URL(url||'/','http://127.0.0.1').pathname);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const target=path.resolve(root,relative);
  const base=path.resolve(root);
  if(target!==base&&!target.startsWith(`${base}${path.sep}`))return null;
  return target;
}

async function startServer(root){
  const server=http.createServer((req,res)=>{
    let target=requestPath(root,req.url);
    if(!target){res.writeHead(403);res.end('forbidden');return;}
    try{if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');}catch{}
    if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'content-type':MIME[path.extname(target).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(target).pipe(res);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return server;
}

function collectRuntimeErrors(stderr=''){
  const text=String(stderr);
  const patterns=[/net::ERR_[A-Z_]+/g,/Uncaught[^\n]*/gi,/ReferenceError:[^\n]*/gi,/TypeError:[^\n]*/gi,/SyntaxError:[^\n]*/gi];
  const rows=[];
  for(const pattern of patterns)for(const match of text.matchAll(pattern))rows.push(clean(match[0]).slice(0,300));
  return [...new Set(rows)].slice(0,12);
}

export async function runAutonomousBrowserSmoke(candidatePath,{candidateId='candidate',timeoutMs=25000,required=process.env.CI==='true',browserExecutable=findBrowserExecutable()}={}){
  const root=path.resolve(candidatePath),index=path.join(root,'index.html');
  if(!fs.existsSync(index))return {pass:false,status:'FAIL',blockers:['INDEX_HTML_MISSING'],runtimeErrors:[],browser:null,required};
  if(!browserExecutable){
    const pass=!required;
    return {pass,status:pass?'SKIP':'FAIL',blockers:pass?[]:['HEADLESS_BROWSER_UNAVAILABLE'],runtimeErrors:[],browser:null,required};
  }
  const server=await startServer(root),address=server.address(),url=`http://127.0.0.1:${address.port}/`,shot=`/tmp/vibe2-${safeId(candidateId)}-mobile.png`;
  let stdout='',stderr='',timedOut=false,code=null;
  try{
    const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,844','--force-device-scale-factor=1','--enable-logging=stderr','--v=0',`--screenshot=${shot}`,'--dump-dom',url];
    const child=spawn(browserExecutable,args,{stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',chunk=>{if(stdout.length<300000)stdout+=chunk.toString();});
    child.stderr.on('data',chunk=>{if(stderr.length<300000)stderr+=chunk.toString();});
    const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},timeoutMs);
    code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
    clearTimeout(timer);
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
  const runtimeErrors=collectRuntimeErrors(stderr),blockers=[];
  if(timedOut)blockers.push('BROWSER_TIMEOUT');
  if(code!==0)blockers.push(`BROWSER_EXIT_${code}`);
  if(!/<html\b/i.test(stdout)||!/<body\b/i.test(stdout))blockers.push('DOM_NOT_RENDERED');
  if(runtimeErrors.length)blockers.push('RUNTIME_CONSOLE_ERROR');
  const screenshotBytes=fs.existsSync(shot)?fs.statSync(shot).size:0;
  if(screenshotBytes<100)blockers.push('MOBILE_SCREENSHOT_MISSING');
  return {pass:blockers.length===0,status:blockers.length?'FAIL':'PASS',blockers,runtimeErrors,browser:browserExecutable,url,mobileViewport:{width:390,height:844},domBytes:Buffer.byteLength(stdout),screenshotPath:shot,screenshotBytes,stderrExcerpt:stderr.slice(-2000),required};
}
