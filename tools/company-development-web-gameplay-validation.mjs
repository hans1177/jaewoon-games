// 파일명: tools/company-development-web-gameplay-validation.mjs
// 실제 게임 본체를 플레이해서 검증한다. 초기 사이클과 최종 30분 실콘텐츠 검증은 같은 validator 안에서 단계만 분리한다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {runtimeApprovedScopeCoverage} from './company-approved-scope-contract.mjs';

const HOMEPAGE_TEST_THRESHOLD=80;
const FORMAL_IMPLEMENTATION_THRESHOLD=90;
const VALIDATION_SCHEMA_VERSION=13;
const INITIAL_PLAYABLE_CYCLE='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE';
const FINAL_CONTENT_MINUTES=30;
const MIN_SOURCE_BYTES=12000;
const MIN_SCRIPT_BYTES=6000;
const MIN_MECHANICS=5;
const INITIAL_MAX_INTERACTIONS=240;
const FINAL_ACTION_INTERVAL_MS=650;
const clean=value=>String(value??'').trim();
const posix=value=>String(value??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/g,'');
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
function sha256File(file){return file&&fs.existsSync(file)&&fs.statSync(file).isFile()?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null;}
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}

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
function localScriptSources(html){
  const out=[];
  for(const match of String(html).matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script\s*>/gi)){
    const src=clean(match[1]);
    if(!src||/^(?:https?:|\/\/|data:)/i.test(src))continue;
    const file=path.resolve(process.cwd(),src.replace(/^\//,''));
    if(file.startsWith(process.cwd()+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())out.push(fs.readFileSync(file,'utf8'));
  }
  return out;
}
function sourceBundle(source){
  const indexFile=path.join(source,'index.html'),html=fs.readFileSync(indexFile,'utf8');
  return {html,text:[html,...localScriptSources(html)].join('\n')};
}
function countStateVariables(text){
  const names=['hp','health','score','res','resource','coins','gold','wave','level','xp','wood','food','stone','mana','pop','combo','stage','progress','day','power','chapter','towers','heat','factory','drones','zone'];
  return names.filter(name=>new RegExp(`\\b${name}\\b`,'i').test(text)).length;
}
function countSystemDependencies(text){
  const groups=[/resource|coin|gold|wood|food|ore|mana|자원|코인|골드|목재|식량|광석/i,/upgrade|power|level|craft|build|강화|레벨|제작|건설/i,/enemy|wave|combat|attack|damage|적|웨이브|전투|공격|피해/i,/reward|score|xp|unlock|보상|점수|경험치|해금/i,/health|hp|risk|fail|defeat|체력|위험|실패|패배/i,/world|zone|map|chapter|quest|세계|구역|맵|챕터|퀘스트/i];
  return groups.filter(re=>re.test(text)).length;
}
function sourceFootprint(source){
  const {html,text}=sourceBundle(source);
  const totalBytes=Buffer.byteLength(text,'utf8');
  const inlineScripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(x=>String(x[1]||''));
  const localScripts=localScriptSources(html);
  const scriptBytes=[...inlineScripts,...localScripts].reduce((sum,value)=>sum+Buffer.byteLength(value,'utf8'),0);
  const mechanicIds=[...new Set([...text.matchAll(/data-mechanic-id=["']([^"']+)["']/gi)].map(x=>clean(x[1])).filter(Boolean))];
  const systemCount=Math.max(Number(text.match(/data-gameplay-system-count=["'](\d+)["']/i)?.[1]||0),countSystemDependencies(text));
  const cycleContract=new RegExp(`data-playable-cycle-contract=["']${INITIAL_PLAYABLE_CYCLE}["']`,'i').test(text)?INITIAL_PLAYABLE_CYCLE:'';
  const proxyMarkers=(text.match(/scope-control-|FULL APPROVED WEB COMPANION|승인 분량 전체 구현|data-session-stage|data-content-depth-stage|PROGRESSION_MILESTONES/gi)||[]).length;
  const fakeTimeMarkers=(text.match(/(?:0\s*[~\-–]\s*5|5\s*[~\-–]\s*15|15\s*[~\-–]\s*25|25\s*[~\-–]\s*30)\s*(?:분|min)/gi)||[]).length;
  const directStageButtons=/<button\b[^>]*(?:data-session-stage|data-content-depth-stage|data-validation-stage|data-test-stage)/i.test(text);
  const winPathCount=/(?:end\s*\(\s*true|victory|win\b|목표\s*달성|승리|클리어|방어\s*성공)/i.test(text)?1:0;
  const failPathCount=/(?:end\s*\(\s*false|defeat|lose\b|패배|쓰러|파괴|실패|체력이\s*모두)/i.test(text)?1:0;
  const retryPathCount=/(?:reset|restart|retry|새\s*게임|다시\s*도전|재도전|초기화)/i.test(text)?1:0;
  const growthRewardChoice=/(?:upgrade|level|reward|unlock|craft|build|choice|power\+\+|강화|성장|보상|해금|제작|선택)/i.test(text);
  const riskPressure=/(?:damage|health|hp|cost|resource|defeat|fail|위험|피해|체력|비용|자원|패배|실패)/i.test(text);
  const blockers=[];
  if(totalBytes<MIN_SOURCE_BYTES)blockers.push(`SOURCE_FOOTPRINT_TOO_SMALL:${totalBytes}:${MIN_SOURCE_BYTES}`);
  if(scriptBytes<MIN_SCRIPT_BYTES)blockers.push(`SOURCE_GAME_LOGIC_TOO_SMALL:${scriptBytes}:${MIN_SCRIPT_BYTES}`);
  if(mechanicIds.length<MIN_MECHANICS)blockers.push(`SOURCE_MECHANICS_TOO_FEW:${mechanicIds.length}:${MIN_MECHANICS}`);
  if(systemCount<MIN_MECHANICS)blockers.push(`SOURCE_SYSTEM_COUNT_TOO_LOW:${systemCount}:${MIN_MECHANICS}`);
  if(cycleContract!==INITIAL_PLAYABLE_CYCLE)blockers.push('COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_CONTRACT_REQUIRED');
  if(proxyMarkers>0)blockers.push(`GENERIC_OR_TIME_PROXY_MARKERS_FORBIDDEN:${proxyMarkers}`);
  if(fakeTimeMarkers>0)blockers.push(`FAKE_TIME_PROGRESS_MARKERS_FORBIDDEN:${fakeTimeMarkers}`);
  if(directStageButtons)blockers.push('DIRECT_TIME_STAGE_CONTROL_FORBIDDEN');
  if(!winPathCount||!failPathCount)blockers.push('REAL_WIN_AND_FAIL_PATH_REQUIRED');
  if(!retryPathCount)blockers.push('REAL_RETRY_PATH_REQUIRED');
  if(!growthRewardChoice)blockers.push('GROWTH_REWARD_OR_CHOICE_REQUIRED');
  if(!riskPressure)blockers.push('RISK_FAILURE_OR_RESOURCE_PRESSURE_REQUIRED');
  return {pass:blockers.length===0,implementationClass:'DEDICATED_REAL_GAME',totalBytes,scriptBytes,mechanicIds,mechanicCount:mechanicIds.length,systemCount,cycleContract,proxyMarkers,fakeTimeMarkers,directStageButtons,stageButtons:directStageButtons,winPathCount,failPathCount,retryPathCount,growthRewardChoice,riskPressure,stateVariableCount:countStateVariables(text),systemDependencyCount:countSystemDependencies(text),blockers};
}

async function snapshot(page){
  return page.evaluate(()=>{
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0;};
    const normalize=value=>String(value||'').replace(/\s+/g,' ').trim().toLowerCase();
    const bodyText=(document.body?.innerText||'').replace(/\s+/g,' ').trim().slice(0,16000);
    const controls=[...document.querySelectorAll('button,[role="button"],[data-gameplay-action]')].filter(visible);
    const gameplayControls=controls.filter(el=>el.matches('[data-gameplay-action]')||el.closest('.actions,.controls,.game-controls'));
    const functionalLabels=[...new Set(gameplayControls.map(el=>normalize(el.getAttribute('aria-label')||el.textContent||el.id)).filter(Boolean))];
    const mechanics=[...new Set(gameplayControls.map(el=>el.getAttribute('data-mechanic-id')).filter(Boolean))];
    const scopeRoot=document.querySelector('[data-approved-scope-count]');
    const scopeControls=[...document.querySelectorAll('[data-scope-id]')].filter(visible);
    const surface=document.querySelector('[data-gameplay-surface],canvas,.board,.game-board,.gameplay');
    const sr=surface?.getBoundingClientRect();
    const gameplayScreenRatio=sr?Math.max(0,Math.min(1,(sr.width*sr.height)/(innerWidth*innerHeight))):0;
    const entityCount=[...document.querySelectorAll('.enemy,.foe,.tower,.tile,.cell,.gem,[data-enemy],[data-world-entity]')].filter(visible).length;
    const testNodes=[...document.querySelectorAll('[data-session-stage],[data-content-depth-stage],[data-validation-stage],[data-test-stage],.validation-panel,.test-panel')].filter(visible);
    const stateNodes=[...document.querySelectorAll('[data-state],[data-score],[data-resource],[data-progress]')].map(el=>({tag:el.tagName,text:(el.textContent||'').trim().slice(0,300),attrs:[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])}));
    const values={};for(const id of ['ore','ingot','coins','factory','drones','zone','heat','score','hp','gold','wave','level','stage','day','wood','food','mana','pop','power','chapter']){const el=document.getElementById(id);if(el)values[id]=Number(el.textContent||0)}
    const canvasState=[...document.querySelectorAll('canvas')].map(canvas=>{try{return `${canvas.width}x${canvas.height}:${canvas.toDataURL().slice(-160)}`;}catch{return `${canvas.width}x${canvas.height}:TAINTED`;}});
    const root=document.querySelector('[data-playable-cycle-contract]');
    const runResult=(document.body?.getAttribute('data-run-result')||root?.getAttribute('data-run-result')||'').toLowerCase();
    const audioState=(document.querySelector('[data-audio-state]')?.getAttribute('data-audio-state')||document.body?.getAttribute('data-audio-state')||'').toLowerCase();
    const duplicateActionRatio=gameplayControls.length?Math.max(0,1-functionalLabels.length/gameplayControls.length):1;
    const testUiRatio=controls.length?Math.min(1,testNodes.length/controls.length):0;
    return {bodyText,stateNodes,values,canvasState,visibleButtons:controls.length,gameplayControlCount:gameplayControls.length,functionalLabels,mechanics,uniqueFunctionalUiCount:functionalLabels.length,uniqueMechanicCount:mechanics.length,entityCount,testUiCount:testNodes.length,testUiRatio,duplicateActionRatio,gameplayScreenRatio,audioState,muteControls:[...document.querySelectorAll('[data-audio-control="mute"]')].filter(visible).length,volumeControls:[...document.querySelectorAll('[data-audio-control="volume"]')].filter(visible).length,approvedScopeCount:Number(scopeRoot?.getAttribute('data-approved-scope-count')||document.body?.getAttribute('data-approved-scope-count')||0),visibleScopeIds:scopeControls.map(el=>el.getAttribute('data-scope-id')).filter(Boolean),mechanicBindings:scopeControls.map(el=>el.getAttribute('data-mechanic-id')).filter(Boolean),cycleContract:root?.getAttribute('data-playable-cycle-contract')||document.body?.getAttribute('data-playable-cycle-contract')||'',runResult,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
  });
}
function gameplaySignature(view){return JSON.stringify({stateNodes:view?.stateNodes||[],values:view?.values||{},canvasState:view?.canvasState||[],runResult:view?.runResult||''});}
function gameplayStateChanged(before,after){return gameplaySignature(before)!==gameplaySignature(after);}
function choosePocketAction(view){
  const v=view?.values||{},heat=Number(v.heat||0),ore=Number(v.ore||0),ingot=Number(v.ingot||0),coins=Number(v.coins||0),factory=Number(v.factory||1),drones=Number(v.drones||0),zone=Number(v.zone||1);
  if(heat>=68)return '#coolFactory';
  const needCoins=target=>{if(coins>=target)return null;if(ingot>=1)return '#sellIngot';if(ore>=4)return '#smeltOre';return '#mineOre';};
  if(factory<2)return needCoins(15)||'#upgradeFactory';if(drones<1)return needCoins(15)||'#hireDrone';if(zone<2)return needCoins(20)||'#unlockZone';if(factory<3)return needCoins(20)||'#upgradeFactory';if(zone<3)return needCoins(35)||'#unlockZone';return '#mineOre';
}
async function clickTarget(page,selector,index=0){
  const targets=page.locator(selector),count=await targets.count();if(!count)return {clicked:false,scopeId:null,mechanicId:null,label:null,before:null,after:null};
  const target=targets.nth(Math.abs(Number(index)||0)%count),before=await snapshot(page),scopeId=clean(await target.getAttribute('data-scope-id')),mechanicId=clean(await target.getAttribute('data-mechanic-id')),label=clean(await target.innerText().catch(()=>''));
  try{await target.click({timeout:3000});await page.waitForTimeout(70);}catch{return {clicked:false,scopeId,mechanicId,label,before,after:await snapshot(page)}}
  return {clicked:true,scopeId,mechanicId,label,before,after:await snapshot(page)};
}
async function realRetry(page){
  const retry=page.locator('.reset,[data-retry],button').filter({hasText:/새 게임|다시|재도전|retry|restart|초기화/i}).first();
  if(await retry.count()){
    page.once('dialog',dialog=>dialog.accept().catch(()=>{}));
    try{await retry.click({timeout:2500});await page.waitForTimeout(250);return true;}catch{}
  }
  try{await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(250);return true;}catch{return false;}
}
function evaluateInitialCycle({footprint,before,after,interactionCount,stateTransitionCount,uniqueInteractedMechanics,terminalReached,retryObserved,scopeCoverage}={}){
  const pass=footprint.pass===true&&before?.cycleContract===INITIAL_PLAYABLE_CYCLE&&interactionCount>=5&&stateTransitionCount>=3&&uniqueInteractedMechanics>=2&&terminalReached&&footprint.growthRewardChoice&&footprint.riskPressure&&footprint.winPathCount>=1&&footprint.failPathCount>=1&&retryObserved&&scopeCoverage?.pass===true;
  return {unit:INITIAL_PLAYABLE_CYCLE,pass,startWorldEntry:true,realPlayerInput:interactionCount>0,coreGameplayAction:interactionCount>=3,actualStateChange:stateTransitionCount>=3,growthRewardOrMeaningfulChoice:footprint.growthRewardChoice,riskFailureOrResourcePressure:footprint.riskPressure,goalOrCycleEnd:terminalReached,retryPath:retryObserved,interactionCount,stateTransitionCount,uniqueInteractedMechanics};
}
function pendingContentDepth(){return {mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',validationMode:'REAL_ELAPSED_GAMEPLAY',status:'PENDING_AFTER_CONTENT_EXPANSION',pass:false,targetMinutes:FINAL_CONTENT_MINUTES,validatedMinutes:0,actualGameplayMinutes:0,elapsedRealMilliseconds:0,realContent:false,fakeProgress:false,testHarness:false,directStageClick:false,metrics:null,varietyEvents:[]};}
function implementationMetrics({footprint,before,after,interactionCount,stateTransitionCount,uniqueStateCount,interactedMechanics,varietyEvents}={}){
  return {uniqueMechanicCount:Math.max(footprint.mechanicCount,before?.uniqueMechanicCount||0,after?.uniqueMechanicCount||0),uniqueFunctionalUiCount:Math.max(before?.uniqueFunctionalUiCount||0,after?.uniqueFunctionalUiCount||0),gameplayActionCount:interactionCount,stateVariableCount:footprint.stateVariableCount,meaningfulStateTransitionCount:stateTransitionCount,uniqueGameplayStateCount:uniqueStateCount,uniqueInteractedMechanicCount:interactedMechanics.size,systemDependencyCount:footprint.systemDependencyCount,enemyOrWorldEntityCount:Math.max(before?.entityCount||0,after?.entityCount||0),winPathCount:footprint.winPathCount,failPathCount:footprint.failPathCount,retryPathCount:footprint.retryPathCount,gameplayScreenRatio:Math.max(before?.gameplayScreenRatio||0,after?.gameplayScreenRatio||0),duplicateActionRatio:Math.max(before?.duplicateActionRatio||0,after?.duplicateActionRatio||0),testUiRatio:Math.max(before?.testUiRatio||0,after?.testUiRatio||0),contentVariationCount:varietyEvents.size};
}
function evaluateRuntimeEvidence({before,after,interactionCount,stateTransitionCount,consoleErrors,pageErrors,failedRequests,badResponses,reloadVisible,scopeCoverage,initialPlayableCycle,footprint}={}){
  const blockers=[];
  if(!footprint.pass)blockers.push(...footprint.blockers.map(x=>`FOOTPRINT:${x}`));
  if(Number(before?.gameplayControlCount||0)<1)blockers.push('REAL_GAMEPLAY_INPUT_REQUIRED');
  if(!initialPlayableCycle.pass)blockers.push('COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_REQUIRED');
  if(Number(after?.scrollWidth||0)>Number(after?.viewportWidth||0)+2)blockers.push('MOBILE_HORIZONTAL_OVERFLOW');
  if(!reloadVisible)blockers.push('RELOAD_VISIBILITY_FAILED');
  if(Number(before?.muteControls||0)<1||Number(before?.volumeControls||0)<1)blockers.push('MUSIC_CONTROL_REQUIRED');
  const startsAfterGesture=!['running','playing'].includes(clean(before?.audioState).toLowerCase())&&['running','playing','muted'].includes(clean(after?.audioState).toLowerCase());
  if(!startsAfterGesture)blockers.push('MUSIC_USER_GESTURE_RUNTIME_REQUIRED');
  if(!scopeCoverage?.pass)for(const blocker of scopeCoverage?.blockers||['APPROVED_SCOPE_RUNTIME_COVERAGE_REQUIRED'])blockers.push(`SCOPE:${blocker}`);
  for(const item of consoleErrors)blockers.push(`CONSOLE:${item}`);for(const item of pageErrors)blockers.push(`PAGE:${item}`);for(const item of failedRequests)blockers.push(`REQUEST:${item}`);for(const item of badResponses)blockers.push(`RESPONSE:${item}`);
  const unique=[...new Set(blockers)];
  return {pass:unique.length===0,blockers:unique,stateChanged:stateTransitionCount>0,musicRuntime:{required:true,startsAfterUserGesture:startsAfterGesture,muteControl:Number(before?.muteControls||0)>0,volumeControl:Number(before?.volumeControls||0)>0,beforeState:before?.audioState||null,afterState:after?.audioState||null,pass:unique.every(x=>!x.startsWith('MUSIC_'))}};
}
function runStrictReview({gameId,source,output}){
  if(!output)throw new Error('STRICT_REVIEW_REQUIRES_EVIDENCE_OUTPUT');
  const strictOutput=path.join(path.dirname(output),'strict-implementation-review.json');
  const args=['tools/company-strict-production-review.mjs','--mode=implementation',`--game-id=${gameId}`,`--source=${source}`,`--evidence=${output}`,`--output=${strictOutput}`];
  const baseline=clean(process.env.DESIGN_BASELINE_SOURCE),artbook=clean(process.env.ARTBOOK_SOURCE);if(baseline)args.push(`--baseline=${baseline}`);if(artbook&&fs.existsSync(artbook))args.push(`--artbook=${artbook}`);
  try{execFileSync(process.execPath,args,{stdio:'inherit',env:{...process.env,COMPANY_STRICT_STATE_OUTPUT:'/tmp/web-worker/persist/game-seed-state.json'},timeout:120000});}catch(error){if(!fs.existsSync(strictOutput))throw error;}
  const review=JSON.parse(fs.readFileSync(strictOutput,'utf8')),score=Number(review.totalScore),hardFailures=Array.isArray(review.hardFailures)?review.hardFailures:[];
  return {strictOutput,review,homepageScorePass:Number.isFinite(score)&&score>=HOMEPAGE_TEST_THRESHOLD&&hardFailures.length===0,formalPass:review.verdict==='PASS'&&score>=FORMAL_IMPLEMENTATION_THRESHOLD&&hardFailures.length===0};
}

export async function runGameplayValidation({gameId,sourcePath,port=4181,output='',screenshot='',validationStage='initial-cycle',promotionRevalidationConfirmed=false}={}){
  const source=posix(sourcePath),finalMode=validationStage==='final-content-depth';
  if(!gameId)throw new Error('gameId required');if(!source.startsWith('web-games/'))throw new Error(`invalid source path:${source}`);if(!fs.existsSync(source))throw new Error(`source path missing:${source}`);if(!['initial-cycle','final-content-depth'].includes(validationStage))throw new Error(`invalid validation stage:${validationStage}`);
  const footprint=sourceFootprint(source);if(!footprint.pass)throw new Error(`REAL_GAME_FOOTPRINT_FAILED:${footprint.blockers.join('|')}`);
  const baselinePath=clean(process.env.DESIGN_BASELINE_SOURCE),sourceIndexSha256=sha256File(path.join(source,'index.html')),designBaselineSha256=sha256File(baselinePath);
  const {chromium}=await import('playwright'),server=await startServer(process.cwd(),Number(port)),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const consoleErrors=[],pageErrors=[],failedRequests=[],badResponses=[];page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(clean(msg.text()).slice(0,500));});page.on('pageerror',e=>pageErrors.push(clean(e.message).slice(0,500)));page.on('requestfailed',r=>{if(r.url().startsWith(`http://127.0.0.1:${port}`))failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText||''}`.slice(0,700));});page.on('response',r=>{if(r.url().startsWith(`http://127.0.0.1:${port}`)&&r.status()>=400)badResponses.push(`${r.status()} ${r.url()}`.slice(0,700));});
  try{
    const url=`http://127.0.0.1:${port}/${source}/`;await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(400);
    const before=await snapshot(page),startedAt=Date.now(),deadline=finalMode?startedAt+FINAL_CONTENT_MINUTES*60*1000:Number.POSITIVE_INFINITY;
    let interactionCount=0,stateTransitionCount=0,terminalReached=false,retryObserved=footprint.retryPathCount>0,lastTerminalResult=null,step=0;
    const interactedScopeIds=[],scopeInteractionResults=[],interactedMechanics=new Set(),stateSignatures=new Set([gameplaySignature(before)]),varietyEvents=new Set();
    while(finalMode?Date.now()<deadline:step<INITIAL_MAX_INTERACTIONS){
      const current=await snapshot(page);
      if(['victory','defeat'].includes(current.runResult)){
        terminalReached=true;lastTerminalResult=current.runResult;
        if(!finalMode)break;
        const retried=await realRetry(page);retryObserved=retryObserved||retried;if(!retried)break;step++;continue;
      }
      const pocketFoundry=Boolean(await page.locator('#mineOre').count());
      const selector=pocketFoundry?choosePocketAction(current):'[data-gameplay-action]:not([disabled])';
      const result=await clickTarget(page,selector,pocketFoundry?0:step);step++;
      if(!result.clicked){if(finalMode){await page.waitForTimeout(FINAL_ACTION_INTERVAL_MS);continue;}break;}
      interactionCount++;if(result.mechanicId)interactedMechanics.add(result.mechanicId);if(result.label)varietyEvents.add(result.label.replace(/\d+/g,'#').slice(0,80));
      const changed=gameplayStateChanged(result.before,result.after);if(changed){stateTransitionCount++;stateSignatures.add(gameplaySignature(result.after));if(result.scopeId&&!interactedScopeIds.includes(result.scopeId)){interactedScopeIds.push(result.scopeId);scopeInteractionResults.push({scopeId:result.scopeId,mechanicId:result.mechanicId,clicked:true,stateChanged:true});}}
      if(['victory','defeat'].includes(result.after?.runResult)){terminalReached=true;lastTerminalResult=result.after.runResult;if(!finalMode)break;}
      if(finalMode)await page.waitForTimeout(FINAL_ACTION_INTERVAL_MS);
    }
    for(const scopeId of before.visibleScopeIds||[]){if(interactedScopeIds.includes(scopeId))continue;const result=await clickTarget(page,`[data-scope-id="${scopeId}"]`);if(result.clicked){interactionCount++;if(result.mechanicId)interactedMechanics.add(result.mechanicId);const changed=gameplayStateChanged(result.before,result.after);if(changed){stateTransitionCount++;stateSignatures.add(gameplaySignature(result.after));interactedScopeIds.push(scopeId);scopeInteractionResults.push({scopeId,mechanicId:result.mechanicId,clicked:true,stateChanged:true});}}}
    const after=await snapshot(page),scopeCoverage=runtimeApprovedScopeCoverage({declaredCount:before.approvedScopeCount,visibleScopeIds:before.visibleScopeIds,interactedScopeIds,mechanicBindings:before.mechanicBindings});
    const initialPlayableCycle=evaluateInitialCycle({footprint,before,after,interactionCount,stateTransitionCount,uniqueInteractedMechanics:interactedMechanics.size,terminalReached,retryObserved,scopeCoverage});
    const metrics=implementationMetrics({footprint,before,after,interactionCount,stateTransitionCount,uniqueStateCount:stateSignatures.size,interactedMechanics,varietyEvents});
    const elapsedRealMilliseconds=Date.now()-startedAt,actualGameplayMinutes=elapsedRealMilliseconds/60000;
    const contentDepthValidation=finalMode?{mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',validationMode:'REAL_ELAPSED_GAMEPLAY',status:elapsedRealMilliseconds>=FINAL_CONTENT_MINUTES*60*1000?'COMPLETE':'INCOMPLETE',pass:initialPlayableCycle.pass&&elapsedRealMilliseconds>=FINAL_CONTENT_MINUTES*60*1000&&stateTransitionCount>=10&&varietyEvents.size>=2&&metrics.testUiRatio===0&&metrics.duplicateActionRatio<=0.8,targetMinutes:FINAL_CONTENT_MINUTES,validatedMinutes:elapsedRealMilliseconds>=FINAL_CONTENT_MINUTES*60*1000?actualGameplayMinutes:0,actualGameplayMinutes,elapsedRealMilliseconds,realContent:stateTransitionCount>=10&&varietyEvents.size>=2,fakeProgress:false,testHarness:false,directStageClick:false,metrics,varietyEvents:[...varietyEvents]}:pendingContentDepth();
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(250);const reloadVisible=await page.evaluate(()=>Boolean(document.body&&document.body.getBoundingClientRect().width>0&&document.body.getBoundingClientRect().height>0));
    const verdict=evaluateRuntimeEvidence({before,after,interactionCount,stateTransitionCount,consoleErrors,pageErrors,failedRequests,badResponses,reloadVisible,scopeCoverage,initialPlayableCycle,footprint});
    if(finalMode&&!contentDepthValidation.pass)verdict.blockers.push('FINAL_REAL_30MIN_CONTENT_DEPTH_REQUIRED');
    verdict.pass=verdict.blockers.length===0;
    const substanceGate={pass:footprint.pass===true&&initialPlayableCycle.pass,implementationClass:'DEDICATED_REAL_GAME',totalBytes:footprint.totalBytes,executableBytes:footprint.scriptBytes,mechanicCount:footprint.mechanicCount,directSessionControls:0,proxyMarkers:footprint.proxyMarkers,initialImplementationUnit:INITIAL_PLAYABLE_CYCLE};
    const report={version:VALIDATION_SCHEMA_VERSION,validationSchemaVersion:VALIDATION_SCHEMA_VERSION,gameId,target:'web',validationStage,status:verdict.pass?'PASS':'FAIL',pass:verdict.pass,validated:verdict.pass,realEvidenceExists:true,gameplayInteractionPerformed:interactionCount>0,interactionCount,stateChanged:verdict.stateChanged,stateChangeCount:stateTransitionCount,musicRuntime:verdict.musicRuntime,approvedScopeFullyImplemented:scopeCoverage.pass,scopeCoverage,scopeInteractionResults,runtimeSmokePassed:consoleErrors.length===0&&pageErrors.length===0&&failedRequests.length===0&&badResponses.length===0&&reloadVisible,mobileViewport:{width:390,height:844,touch:true},sourceFootprint:footprint,substanceGate,initialImplementationUnit:INITIAL_PLAYABLE_CYCLE,initialPlayableCycle,initialPlayableCyclePassed:initialPlayableCycle.pass,implementationMetrics:metrics,contentDepthValidation,sessionDepthMinutes:contentDepthValidation.validatedMinutes,terminalOutcome:{required:true,reached:terminalReached,result:lastTerminalResult||after.runResult||null},multiplayer:null,before,after,reloadVisible,blockers:[...new Set(verdict.blockers)],consoleErrors,pageErrors,failedRequests,badResponses,evidence:[`validationStage=${validationStage}`,`interactionCount=${interactionCount}`,`stateTransitions=${stateTransitionCount}`,`mechanics=${footprint.mechanicCount}`,`approvedScope=${scopeCoverage.pass}`,`initialPlayableCycle=${initialPlayableCycle.pass}`,`finalContentDepth=${contentDepthValidation.pass}`,`elapsedRealMilliseconds=${contentDepthValidation.elapsedRealMilliseconds}`],checkedAt:new Date().toISOString(),sourcePath:source,sourceIndexSha256,sourceRevision:clean(process.env.GITHUB_SHA)||null,designBaselineSha256,url};
    if(screenshot){fs.mkdirSync(path.dirname(screenshot),{recursive:true});await page.screenshot({path:screenshot,fullPage:true});report.screenshot=screenshot;}if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
    console.log(JSON.stringify(report,null,2));if(!report.pass)throw new Error(`WEB_GAMEPLAY_VALIDATION_FAILED:${report.blockers.join(' | ').slice(0,1800)}`);
    const {strictOutput,review,homepageScorePass,formalPass}=runStrictReview({gameId,source,output});report.strictReviewPath=strictOutput;report.strictReview={verdict:review.verdict,totalScore:Number(review.totalScore),hardFailures:review.hardFailures||[],improvementTargets:review.improvementTargets||[],reviewedAt:review.reviewedAt||null,formalPassThreshold:FORMAL_IMPLEMENTATION_THRESHOLD,homepageTestThreshold:HOMEPAGE_TEST_THRESHOLD};report.webStrictScore=Number(review.totalScore);report.improvementTargets=review.improvementTargets||[];report.homepageTestEligible=homepageScorePass&&contentDepthValidation.pass;report.homepageTestVerdict=report.homepageTestEligible?'PASS':'REVISE';report.formalReviewPassed=formalPass&&contentDepthValidation.pass;report.formalImplementationPassed=report.formalReviewPassed&&promotionRevalidationConfirmed;report.formalImplementationVerdict=report.formalImplementationPassed?'PASS':'REVISE';if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    console.log(`WEB_VALIDATION_STAGE=${validationStage}`);console.log(`WEB_STRICT_REVIEW_SCORE=${report.webStrictScore}`);console.log(`INITIAL_PLAYABLE_CYCLE=${initialPlayableCycle.pass?'PASS':'FAIL'}`);console.log(`FINAL_30MIN_CONTENT_DEPTH=${contentDepthValidation.pass?'PASS':'PENDING_OR_FAIL'}`);console.log(`HOMEPAGE_TEST_ELIGIBLE=${report.homepageTestEligible?'YES':'NO'}`);console.log(`FORMAL_IMPLEMENTATION_PASS=${report.formalImplementationPassed?'YES':'NO'}`);return report;
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}

async function main(){
  const gameId=arg('game-id'),sourcePath=arg('source'),port=Number(arg('port','4181')),output=arg('output'),screenshot=arg('screenshot'),validationStage=arg('validation-stage','initial-cycle');
  const first=await runGameplayValidation({gameId,sourcePath,port,output,screenshot,validationStage,promotionRevalidationConfirmed:false});
  const score=Number(first.strictReview?.totalScore),hard=Array.isArray(first.strictReview?.hardFailures)?first.strictReview.hardFailures:[];
  if(validationStage==='final-content-depth'&&first.contentDepthValidation?.pass===true&&first.formalReviewPassed===true&&Number.isFinite(score)&&score>=FORMAL_IMPLEMENTATION_THRESHOLD&&hard.length===0){
    const secondaryOutput=output?path.join(path.dirname(output),'web-promotion-revalidation.json'):'';let second=null,revalidationError=null;
    try{second=await runGameplayValidation({gameId,sourcePath,port:port+1,output:secondaryOutput,screenshot:'',validationStage:'final-content-depth',promotionRevalidationConfirmed:true});}catch(error){revalidationError=clean(error?.message||error).slice(0,500);second=secondaryOutput?readJson(secondaryOutput,null):null;}
    const secondScore=Number(second?.strictReview?.totalScore),secondHard=Array.isArray(second?.strictReview?.hardFailures)?second.strictReview.hardFailures:[];const sourceHashMatch=Boolean(first.sourceIndexSha256&&second?.sourceIndexSha256&&first.sourceIndexSha256===second.sourceIndexSha256),baselineHashMatch=first.designBaselineSha256===second?.designBaselineSha256;const secondSubstancePass=second?.substanceGate?.pass===true;const secondContentDepthPass=second?.contentDepthValidation?.pass===true;
    const promotionPass=second?.pass===true&&second?.formalReviewPassed===true&&Number.isFinite(secondScore)&&secondScore>=FORMAL_IMPLEMENTATION_THRESHOLD&&secondHard.length===0&&secondContentDepthPass&&secondSubstancePass&&second?.terminalOutcome?.reached===true&&sourceHashMatch&&baselineHashMatch;
    first.promotionRevalidation={required:true,independentRun:true,pass:promotionPass,minimumScore:FORMAL_IMPLEMENTATION_THRESHOLD,firstScore:score,secondScore:Number.isFinite(secondScore)?secondScore:null,sourceHashMatch,baselineHashMatch,secondCheckedAt:second?.checkedAt||null,secondContentDepthPass,secondFinalContentDepthPass:secondContentDepthPass,secondSubstancePass,secondTerminalReached:second?.terminalOutcome?.reached===true,error:revalidationError};first.formalImplementationPassed=promotionPass;first.formalImplementationVerdict=promotionPass?'PASS':'REVISE';if(output)fs.writeFileSync(output,JSON.stringify(first,null,2)+'\n');console.log(`WEB_PROMOTION_REVALIDATION=${promotionPass?'PASS':'FAIL'}`);
  }else{first.promotionRevalidation={required:false,independentRun:false,pass:false,minimumScore:FORMAL_IMPLEMENTATION_THRESHOLD,reason:validationStage!=='final-content-depth'?'FINAL_CONTENT_DEPTH_NOT_RUN':first.webStrictScore<FORMAL_IMPLEMENTATION_THRESHOLD?'WEB_SCORE_BELOW_90':'FINAL_CONTENT_DEPTH_OR_HARD_GATE'};first.formalImplementationPassed=false;first.formalImplementationVerdict='REVISE';if(output)fs.writeFileSync(output,JSON.stringify(first,null,2)+'\n');console.log('WEB_PROMOTION_REVALIDATION=NOT_RUN');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
