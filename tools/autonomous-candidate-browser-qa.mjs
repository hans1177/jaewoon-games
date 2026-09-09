// 파일명: tools/autonomous-candidate-browser-qa.mjs
// 역할: 통합 후보를 main 승격 전에 모바일 브라우저로 실제 로드/리로드해 콘솔·요청·레이아웃 오류를 수집한다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav'};

function safeFile(root,urlPath){
  const pathname=decodeURIComponent(String(urlPath||'/').split('?')[0]);
  const requested=pathname.endsWith('/')?`${pathname}index.html`:pathname;
  const file=path.resolve(root,`.${requested}`),base=path.resolve(root);
  if(!file.startsWith(base+path.sep)&&file!==base)return null;
  return file;
}
function startServer(root,port){
  const server=http.createServer((req,res)=>{
    const file=safeFile(root,req.url);
    if(!file||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return;}
    res.setHeader('content-type',MIME[path.extname(file).toLowerCase()]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server));});
}
export function summarizeBrowserSignals({consoleErrors=[],pageErrors=[],failedRequests=[],badResponses=[],metrics=null,reloadMetrics=null}={}){
  const errors=[...consoleErrors.map(x=>`console:${x}`),...pageErrors.map(x=>`page:${x}`),...failedRequests.map(x=>`request:${x}`),...badResponses.map(x=>`response:${x}`)];
  if(!metrics?.bodyVisible)errors.push('layout:body-not-visible');
  if(!reloadMetrics?.bodyVisible)errors.push('reload:body-not-visible');
  if(metrics&&metrics.width<=0)errors.push('layout:invalid-width');
  if(reloadMetrics&&reloadMetrics.width<=0)errors.push('reload:invalid-width');
  return {pass:errors.length===0,errors:[...new Set(errors)],metrics,reloadMetrics};
}
async function observe(page){
  return page.evaluate(()=>{
    const body=document.body,rect=body?.getBoundingClientRect();
    const interactive=[...document.querySelectorAll('button,a,input,select,textarea,[role="button"],canvas')];
    const visible=interactive.filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});
    return {bodyVisible:Boolean(body&&rect&&rect.width>0&&rect.height>0),width:rect?.width||0,height:rect?.height||0,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,interactive:interactive.length,visibleInteractive:visible.length,canvas:document.querySelectorAll('canvas').length,title:document.title||''};
  });
}
export async function runCandidateBrowserQa({sourcePath,port=4173,output='',screenshot=''}={}){
  const source=posix(sourcePath);
  if(!source.startsWith('web-games/'))throw new Error(`browser QA source path 오류: ${source}`);
  if(!fs.existsSync(source))throw new Error(`browser QA source 없음: ${source}`);
  const {chromium}=await import('playwright');
  const server=await startServer(process.cwd(),Number(port));
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const consoleErrors=[],pageErrors=[],failedRequests=[],badResponses=[];
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(clean(msg.text()).slice(0,500));});
  page.on('pageerror',error=>pageErrors.push(clean(error.message).slice(0,500)));
  page.on('requestfailed',request=>{if(request.url().startsWith(`http://127.0.0.1:${port}`))failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText||''}`.slice(0,700));});
  page.on('response',response=>{if(response.url().startsWith(`http://127.0.0.1:${port}`)&&response.status()>=400)badResponses.push(`${response.status()} ${response.url()}`.slice(0,700));});
  let metrics=null,reloadMetrics=null;
  try{
    const url=`http://127.0.0.1:${port}/${source}/`;
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(1200);
    metrics=await observe(page);
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(800);
    reloadMetrics=await observe(page);
    const report={version:1,sourcePath:source,url,viewport:{width:390,height:844,touch:true},...summarizeBrowserSignals({consoleErrors,pageErrors,failedRequests,badResponses,metrics,reloadMetrics}),consoleErrors,pageErrors,failedRequests,badResponses,checkedAt:new Date().toISOString()};
    if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
    if(!report.pass&&screenshot){fs.mkdirSync(path.dirname(screenshot),{recursive:true});await page.screenshot({path:screenshot,fullPage:true});report.screenshot=screenshot;if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
    console.log(JSON.stringify(report,null,2));
    if(!report.pass)throw new Error(`candidate browser QA failed: ${report.errors.join(' | ').slice(0,1600)}`);
    return report;
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}

async function main(){await runCandidateBrowserQa({sourcePath:arg('source'),port:Number(arg('port','4173')),output:arg('output'),screenshot:arg('screenshot')});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
