// 파일명: tools/autonomous-candidate-browser-qa.mjs
// 역할: 통합 후보를 main 승격 전에 모바일 브라우저로 실제 로드/리로드하고 게임별 짧은 핵심 플레이 입력까지 검증한다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav'};
const SCENARIO_FILE='autonomous-gameplay-scenarios.json';

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
function readScenarioCatalog(){try{return JSON.parse(fs.readFileSync(SCENARIO_FILE,'utf8'));}catch{return {version:1,games:[]};}}
export function resolveGameplayScenario({sourcePath='',gameId='',catalog=readScenarioCatalog()}={}){
  const source=posix(sourcePath),requested=clean(gameId||process.env.PROMOTE_GAME_ID);
  return (catalog?.games||[]).find(row=>{
    const aliases=[row.id,...(row.aliases||[])].map(clean);
    return aliases.includes(requested)||source===posix(row.sourcePath)||source.endsWith(`/${row.id}`)||source.includes(`/${row.id}/`);
  })||null;
}
export function summarizeBrowserSignals({consoleErrors=[],pageErrors=[],failedRequests=[],badResponses=[],metrics=null,reloadMetrics=null,gameplayScenario=null}={}){
  const errors=[...consoleErrors.map(x=>`console:${x}`),...pageErrors.map(x=>`page:${x}`),...failedRequests.map(x=>`request:${x}`),...badResponses.map(x=>`response:${x}`)];
  if(!metrics?.bodyVisible)errors.push('layout:body-not-visible');
  if(!reloadMetrics?.bodyVisible)errors.push('reload:body-not-visible');
  if(metrics&&metrics.width<=0)errors.push('layout:invalid-width');
  if(reloadMetrics&&reloadMetrics.width<=0)errors.push('reload:invalid-width');
  if(gameplayScenario?.configured===true&&gameplayScenario?.expectedPlayable===true&&gameplayScenario?.pass!==true){
    errors.push(`scenario:${gameplayScenario.scenarioId||'unknown'}:${gameplayScenario.failedStep||gameplayScenario.status||'failed'}`);
  }
  return {pass:errors.length===0,errors:[...new Set(errors)],metrics,reloadMetrics};
}
async function observe(page){
  return page.evaluate(()=>{
    const body=document.body,rect=body?.getBoundingClientRect();
    const interactive=[...document.querySelectorAll('button,a,input,select,textarea,[role="button"],canvas')];
    const visible=interactive.filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});
    let storageKeys=[];try{storageKeys=Object.keys(localStorage||{}).sort();}catch{}
    return {bodyVisible:Boolean(body&&rect&&rect.width>0&&rect.height>0),width:rect?.width||0,height:rect?.height||0,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,interactive:interactive.length,visibleInteractive:visible.length,canvas:document.querySelectorAll('canvas').length,title:document.title||'',storageKeys};
  });
}
async function visibleTapPoint(page,offset=0){
  return page.evaluate(index=>{
    const candidates=[...document.querySelectorAll('canvas,button,[role="button"],a')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>20&&r.height>20&&s.display!=='none'&&s.visibility!=='hidden'});
    const el=candidates[index%candidates.length]||document.body;const r=el.getBoundingClientRect();
    return {x:Math.max(4,Math.min(innerWidth-4,r.left+Math.max(4,r.width*0.5))),y:Math.max(4,Math.min(innerHeight-4,r.top+Math.max(4,Math.min(r.height*0.5,innerHeight-r.top-4))))};
  },offset);
}
async function primaryAction(page,keywords=[]){
  const clicked=await page.evaluate(words=>{
    const keys=(words||[]).map(x=>String(x).toLowerCase());
    const els=[...document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]')];
    const visible=els.filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});
    const target=visible.find(el=>keys.some(k=>String(el.innerText||el.value||el.getAttribute('aria-label')||'').toLowerCase().includes(k)))||visible[0];
    if(!target)return false;target.click();return true;
  },keywords);
  if(clicked)return 'visible-control';
  const point=await visibleTapPoint(page,0);await page.touchscreen.tap(point.x,point.y);await page.keyboard.press('Space');return 'surface-fallback';
}
async function executeScenarioStep(page,step,index){
  const action=clean(step?.action).toLowerCase();
  if(action==='hold-check')return {mode:'hold-check'};
  if(action==='move'){
    await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');
    const y=Math.max(80,Math.min(760,Math.floor((await page.evaluate(()=>innerHeight))*0.72)));
    await page.touchscreen.tap(70,y);return {mode:'keyboard+touch'};
  }
  if(action==='primary')return {mode:await primaryAction(page,step?.keywords||[])};
  if(action==='board'){
    const point=await visibleTapPoint(page,index);await page.touchscreen.tap(point.x,point.y);return {mode:'board-tap',point};
  }
  if(action==='reload'){
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(500);return {mode:'reload'};
  }
  throw new Error(`unsupported gameplay scenario action: ${action}`);
}
export async function runGameplayScenario({page,sourcePath='',gameId='',errorCounts=()=>({console:0,page:0,request:0,response:0})}={}){
  const config=resolveGameplayScenario({sourcePath,gameId});
  if(!config)return {configured:false,expectedPlayable:null,pass:true,status:'UNCONFIGURED',scenarioId:null,steps:[]};
  const scenario=config.scenario||{id:'missing',steps:[]};
  if(config.expectedPlayable===false)return {configured:true,gameId:config.id,expectedPlayable:false,pass:true,status:'HOLD_NOT_PLAYABLE',scenarioId:scenario.id,steps:(scenario.steps||[]).map(step=>({label:step.label||step.action,action:step.action,status:'SKIPPED_HOLD'}))};
  const results=[];
  for(let i=0;i<(scenario.steps||[]).length;i++){
    const step=scenario.steps[i],before=errorCounts();
    try{
      const execution=await executeScenarioStep(page,step,i);await page.waitForTimeout(300);
      const after=errorCounts(),newErrors=(after.console-before.console)+(after.page-before.page)+(after.request-before.request)+(after.response-before.response);
      const metrics=await observe(page),pass=metrics.bodyVisible&&newErrors===0;
      results.push({label:step.label||step.action,action:step.action,status:pass?'PASS':'FAIL',newErrors,execution,bodyVisible:metrics.bodyVisible});
      if(!pass)return {configured:true,gameId:config.id,expectedPlayable:true,pass:false,status:'FAILED',scenarioId:scenario.id,intent:scenario.intent,failedStep:step.label||step.action,steps:results};
    }catch(error){
      results.push({label:step.label||step.action,action:step.action,status:'FAIL',error:clean(error.message).slice(0,500)});
      return {configured:true,gameId:config.id,expectedPlayable:true,pass:false,status:'FAILED',scenarioId:scenario.id,intent:scenario.intent,failedStep:step.label||step.action,steps:results};
    }
  }
  return {configured:true,gameId:config.id,expectedPlayable:true,pass:true,status:'PASS',scenarioId:scenario.id,intent:scenario.intent,steps:results};
}
export async function runCandidateBrowserQa({sourcePath,port=4173,output='',screenshot='',gameId=''}={}){
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
  let metrics=null,reloadMetrics=null,gameplayScenario=null;
  try{
    const url=`http://127.0.0.1:${port}/${source}/`;
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(1200);
    metrics=await observe(page);
    gameplayScenario=await runGameplayScenario({page,sourcePath:source,gameId,errorCounts:()=>({console:consoleErrors.length,page:pageErrors.length,request:failedRequests.length,response:badResponses.length})});
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(800);
    reloadMetrics=await observe(page);
    const report={version:2,sourcePath:source,url,viewport:{width:390,height:844,touch:true},...summarizeBrowserSignals({consoleErrors,pageErrors,failedRequests,badResponses,metrics,reloadMetrics,gameplayScenario}),gameplayScenario,consoleErrors,pageErrors,failedRequests,badResponses,checkedAt:new Date().toISOString()};
    if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
    if(!report.pass&&screenshot){fs.mkdirSync(path.dirname(screenshot),{recursive:true});await page.screenshot({path:screenshot,fullPage:true});report.screenshot=screenshot;if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
    console.log(JSON.stringify(report,null,2));
    if(!report.pass)throw new Error(`candidate browser QA failed: ${report.errors.join(' | ').slice(0,1600)}`);
    return report;
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}

async function main(){await runCandidateBrowserQa({sourcePath:arg('source'),port:Number(arg('port','4173')),output:arg('output'),screenshot:arg('screenshot'),gameId:arg('game-id',process.env.PROMOTE_GAME_ID||'')});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
