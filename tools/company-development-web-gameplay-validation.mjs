// 파일명: tools/company-development-web-gameplay-validation.mjs
// DEVELOPMENT_CONFIRMED Web 실제 플레이 + 음악 + 승인 분량 전체 런타임 검증기.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {runtimeApprovedScopeCoverage} from './company-approved-scope-contract.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>String(value??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/g,'');
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'};

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
async function snapshot(page){
  return page.evaluate(()=>{
    const text=(document.body?.innerText||'').replace(/\s+/g,' ').trim().slice(0,12000);
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0;};
    const visibleButtons=[...document.querySelectorAll('button,[role="button"]')].filter(visible).length;
    const canvases=[...document.querySelectorAll('canvas')].map(canvas=>{try{return `${canvas.width}x${canvas.height}:${canvas.toDataURL().slice(-220)}`;}catch{return `${canvas.width}x${canvas.height}:TAINTED`;}});
    const dataState=[...document.querySelectorAll('[data-state],[data-score],[data-health],[data-hp],[data-progress],[data-resource]')].map(el=>({tag:el.tagName,text:(el.textContent||'').trim().slice(0,300),attrs:[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])}));
    const audioNode=document.querySelector('[data-audio-state]');
    const audioState=(audioNode?.getAttribute('data-audio-state')||'').toLowerCase();
    const muteControls=[...document.querySelectorAll('[data-audio-control="mute"]')].filter(visible).length;
    const volumeControls=[...document.querySelectorAll('[data-audio-control="volume"]')].filter(visible).length;
    const scopeRoot=document.querySelector('[data-approved-scope-count]');
    const approvedScopeCount=Number(scopeRoot?.getAttribute('data-approved-scope-count')||0);
    const visibleScopeIds=[...document.querySelectorAll('[data-scope-id]')].filter(visible).map(el=>el.getAttribute('data-scope-id')).filter(Boolean);
    return {text,visibleButtons,canvases,dataState,audioState,muteControls,volumeControls,approvedScopeCount,visibleScopeIds,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
  });
}
export function evaluateGameplayEvidence({before,after,interactionCount=0,consoleErrors=[],pageErrors=[],failedRequests=[],badResponses=[],reloadVisible=false,scopeCoverage=null}={}){
  const blockers=[];
  const stateChanged=JSON.stringify({text:before?.text,canvases:before?.canvases,dataState:before?.dataState})!==JSON.stringify({text:after?.text,canvases:after?.canvases,dataState:after?.dataState});
  const audioBefore=clean(before?.audioState).toLowerCase();
  const audioAfter=clean(after?.audioState).toLowerCase();
  const startsAfterGesture=!['running','playing'].includes(audioBefore)&&['running','playing','muted'].includes(audioAfter);
  if(Number(before?.visibleButtons||0)<1)blockers.push('VISIBLE_GAMEPLAY_CONTROL_REQUIRED');
  if(interactionCount<1)blockers.push('NO_GAMEPLAY_INTERACTION_DELIVERED');
  if(!stateChanged)blockers.push('NO_OBSERVABLE_GAME_STATE_CHANGE');
  if(Number(after?.scrollWidth||0)>Number(after?.viewportWidth||0)+2)blockers.push('MOBILE_HORIZONTAL_OVERFLOW');
  if(!reloadVisible)blockers.push('RELOAD_VISIBILITY_FAILED');
  if(Number(before?.muteControls||0)<1)blockers.push('MUSIC_MUTE_CONTROL_REQUIRED');
  if(Number(before?.volumeControls||0)<1)blockers.push('MUSIC_VOLUME_CONTROL_REQUIRED');
  if(!startsAfterGesture)blockers.push('MUSIC_USER_GESTURE_RUNTIME_REQUIRED');
  if(!audioAfter)blockers.push('MUSIC_RUNTIME_STATE_REQUIRED');
  if(scopeCoverage){for(const blocker of scopeCoverage.blockers||[])blockers.push(`SCOPE:${blocker}`);}
  else blockers.push('SCOPE:APPROVED_SCOPE_RUNTIME_COVERAGE_REQUIRED');
  for(const item of consoleErrors)blockers.push(`CONSOLE:${item}`);
  for(const item of pageErrors)blockers.push(`PAGE:${item}`);
  for(const item of failedRequests)blockers.push(`REQUEST:${item}`);
  for(const item of badResponses)blockers.push(`RESPONSE:${item}`);
  const unique=[...new Set(blockers)];
  const musicRuntime={required:true,startsAfterUserGesture:startsAfterGesture,muteControl:Number(before?.muteControls||0)>0,volumeControl:Number(before?.volumeControls||0)>0,beforeState:audioBefore||null,afterState:audioAfter||null,pass:unique.every(x=>!x.startsWith('MUSIC_'))};
  return {pass:unique.length===0,blockers:unique,stateChanged,musicRuntime,scopeCoverage};
}

export async function runGameplayValidation({gameId,sourcePath,port=4181,output='',screenshot=''}={}){
  const source=posix(sourcePath);
  if(!gameId)throw new Error('gameId required');
  if(!source.startsWith('web-games/'))throw new Error(`invalid source path: ${source}`);
  if(!fs.existsSync(source))throw new Error(`source path missing: ${source}`);
  const {chromium}=await import('playwright');
  const server=await startServer(process.cwd(),Number(port));
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const consoleErrors=[],pageErrors=[],failedRequests=[],badResponses=[];
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(clean(msg.text()).slice(0,500));});
  page.on('pageerror',error=>pageErrors.push(clean(error.message).slice(0,500)));
  page.on('requestfailed',request=>{if(request.url().startsWith(`http://127.0.0.1:${port}`))failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText||''}`.slice(0,700));});
  page.on('response',response=>{if(response.url().startsWith(`http://127.0.0.1:${port}`)&&response.status()>=400)badResponses.push(`${response.status()} ${response.url()}`.slice(0,700));});
  try{
    const url=`http://127.0.0.1:${port}/${source}/`;
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(800);
    const before=await snapshot(page);
    let interactionCount=0;
    const interactedScopeIds=[];
    const scopeControls=page.locator('[data-scope-id]:visible');
    const scopeCount=Math.min(await scopeControls.count(),80);
    for(let index=0;index<scopeCount;index++){
      const target=scopeControls.nth(index);
      const scopeId=clean(await target.getAttribute('data-scope-id'));
      try{await target.click({timeout:3000});interactionCount++;if(scopeId)interactedScopeIds.push(scopeId);await page.waitForTimeout(120);}catch{}
    }
    const gameplayButtons=page.locator('button:visible:not([data-audio-control]):not([data-scope-id]),[role="button"]:visible:not([data-audio-control]):not([data-scope-id])');
    const buttonCount=Math.min(await gameplayButtons.count(),4);
    for(let round=0;round<3;round++){
      if(buttonCount>0){const target=gameplayButtons.nth(round%buttonCount);try{await target.click({timeout:3000});interactionCount++;await page.waitForTimeout(220);}catch{}}
    }
    const canvas=page.locator('canvas').first();
    if(await canvas.count()){
      try{const box=await canvas.boundingBox();if(box){await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);interactionCount++;await page.waitForTimeout(220);}}catch{}
    }
    for(const key of ['ArrowRight','ArrowUp','Space']){try{await page.keyboard.press(key);interactionCount++;await page.waitForTimeout(120);}catch{}}
    const after=await snapshot(page);
    const scopeCoverage=runtimeApprovedScopeCoverage({declaredCount:before.approvedScopeCount,visibleScopeIds:before.visibleScopeIds,interactedScopeIds});
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(500);
    const reloadVisible=await page.evaluate(()=>Boolean(document.body&&document.body.getBoundingClientRect().width>0&&document.body.getBoundingClientRect().height>0));
    const verdict=evaluateGameplayEvidence({before,after,interactionCount,consoleErrors,pageErrors,failedRequests,badResponses,reloadVisible,scopeCoverage});
    const report={
      version:3,gameId,target:'web',status:verdict.pass?'PASS':'FAIL',pass:verdict.pass,validated:verdict.pass,
      realEvidenceExists:true,gameplayInteractionPerformed:interactionCount>0,interactionCount,stateChanged:verdict.stateChanged,musicRuntime:verdict.musicRuntime,
      approvedScopeFullyImplemented:scopeCoverage.pass,scopeCoverage,
      runtimeSmokePassed:consoleErrors.length===0&&pageErrors.length===0&&failedRequests.length===0&&badResponses.length===0&&reloadVisible,
      mobileViewport:{width:390,height:844,touch:true},before,after,reloadVisible,
      blockers:verdict.blockers,consoleErrors,pageErrors,failedRequests,badResponses,
      evidence:[`interactionCount=${interactionCount}`,`stateChanged=${verdict.stateChanged}`,`reloadVisible=${reloadVisible}`,`mobileOverflow=${Number(after.scrollWidth||0)<=Number(after.viewportWidth||0)+2}`,`musicRuntime=${verdict.musicRuntime.pass}`,`musicAfterGesture=${verdict.musicRuntime.startsAfterUserGesture}`,`approvedScope=${scopeCoverage.pass}`,`approvedScopeCount=${scopeCoverage.declaredCount}`],
      checkedAt:new Date().toISOString(),sourcePath:source,url
    };
    if(screenshot){fs.mkdirSync(path.dirname(screenshot),{recursive:true});await page.screenshot({path:screenshot,fullPage:true});report.screenshot=screenshot;}
    if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
    console.log(JSON.stringify(report,null,2));
    if(!report.pass)throw new Error(`WEB_GAMEPLAY_VALIDATION_FAILED: ${report.blockers.join(' | ').slice(0,1800)}`);
    return report;
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}

async function main(){await runGameplayValidation({gameId:arg('game-id'),sourcePath:arg('source'),port:Number(arg('port','4181')),output:arg('output'),screenshot:arg('screenshot')});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
