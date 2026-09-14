// 실제 게임 본체를 플레이해서 검증한다. 초기 제작은 완결 gameplay cycle 1개, 30분은 최종 content-depth 단계에서만 검증한다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {runtimeApprovedScopeCoverage} from './company-approved-scope-contract.mjs';
import {WEB_VALIDATION_SCHEMA_VERSION,evaluateWebValidationEvidence} from './company-web-validation-evidence-contract.mjs';

const HOMEPAGE_TEST_THRESHOLD=80;
const FORMAL_IMPLEMENTATION_THRESHOLD=90;
const INITIAL_IMPLEMENTATION_UNIT='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE';
const FINAL_CONTENT_DEPTH_MINUTES=30;
const MIN_SOURCE_BYTES=12000;
const MIN_SCRIPT_BYTES=6000;
const MIN_MECHANICS=3;
const clean=value=>String(value??'').trim();
const posix=value=>String(value??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/g,'');
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const boolArg=(name,fallback=false)=>{const raw=clean(arg(name,fallback?'true':'false')).toLowerCase();return ['1','true','yes','on'].includes(raw);};
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
function sha256File(file){return file&&fs.existsSync(file)&&fs.statSync(file).isFile()?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null;}
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){if(!file)return;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}

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
function sourceFootprint(source){
  const indexFile=path.join(source,'index.html');
  const html=fs.readFileSync(indexFile,'utf8');
  const totalBytes=Buffer.byteLength(html,'utf8');
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(x=>String(x[1]||''));
  const scriptBytes=scripts.reduce((sum,text)=>sum+Buffer.byteLength(text,'utf8'),0);
  const mechanicIds=[...new Set([...html.matchAll(/data-mechanic-id=["']([^"']+)["']/gi)].map(x=>clean(x[1])).filter(Boolean))];
  const systemCount=Number(html.match(/data-gameplay-system-count=["'](\d+)["']/i)?.[1]||0);
  const artifactType=clean(html.match(/data-web-artifact-type=["']([^"']+)["']/i)?.[1]);
  const stageButtons=/<button\b[^>]*(?:data-session-stage|data-validation-stage|data-test-stage)/i.test(html);
  const proxyMarkers=(html.match(/scope-control-|FULL APPROVED WEB COMPANION|승인 분량 전체 구현/gi)||[]).length;
  const blockers=[];
  if(artifactType!=='REAL_PLAYABLE_GAME')blockers.push('REAL_PLAYABLE_ARTIFACT_TYPE_REQUIRED');
  if(totalBytes<MIN_SOURCE_BYTES)blockers.push(`SOURCE_FOOTPRINT_TOO_SMALL:${totalBytes}:${MIN_SOURCE_BYTES}`);
  if(scriptBytes<MIN_SCRIPT_BYTES)blockers.push(`SOURCE_GAME_LOGIC_TOO_SMALL:${scriptBytes}:${MIN_SCRIPT_BYTES}`);
  if(mechanicIds.length<MIN_MECHANICS)blockers.push(`SOURCE_MECHANICS_TOO_FEW:${mechanicIds.length}:${MIN_MECHANICS}`);
  if(systemCount<MIN_MECHANICS)blockers.push(`SOURCE_SYSTEM_COUNT_TOO_LOW:${systemCount}:${MIN_MECHANICS}`);
  if(stageButtons)blockers.push('DIRECT_VALIDATION_STAGE_CONTROL_FORBIDDEN');
  if(proxyMarkers>0)blockers.push(`GENERIC_PROXY_MARKERS_FORBIDDEN:${proxyMarkers}`);
  return {pass:blockers.length===0,implementationClass:'DEDICATED_REAL_GAME',artifactType,totalBytes,scriptBytes,mechanicIds,mechanicCount:mechanicIds.length,systemCount,stageButtons,proxyMarkers,blockers,html};
}

async function snapshot(page){
  return page.evaluate(()=>{
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0;};
    const text=(document.body?.innerText||'').replace(/\s+/g,' ').trim().slice(0,14000);
    const canvases=[...document.querySelectorAll('canvas')].filter(visible).map(canvas=>{const r=canvas.getBoundingClientRect();let signature='';try{signature=canvas.toDataURL().slice(-180);}catch{signature='TAINTED';}return {signature:`${canvas.width}x${canvas.height}:${signature}`,area:r.width*r.height};});
    const dataState=[...document.querySelectorAll('[data-state],[data-score],[data-resource],[data-progress]')].map(el=>({tag:el.tagName,text:(el.textContent||'').trim().slice(0,300),attrs:[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])}));
    const scopeRoot=document.querySelector('[data-approved-scope-count]');
    const scopeControls=[...document.querySelectorAll('[data-scope-id]')].filter(visible);
    const gameplayControls=[...document.querySelectorAll('[data-gameplay-action],button[data-mechanic-id],[role="button"][data-mechanic-id]')].filter(visible);
    const mechanicIds=gameplayControls.map(el=>el.getAttribute('data-mechanic-id')).filter(Boolean);
    const testControls=gameplayControls.filter(el=>el.hasAttribute('data-test-stage')||el.hasAttribute('data-validation-stage')||/\b(?:test|validation|검증|테스트)\b/i.test(`${el.id} ${el.className}`));
    const audioState=(document.querySelector('[data-audio-state]')?.getAttribute('data-audio-state')||'').toLowerCase();
    const sessionNode=document.querySelector('[data-session-minutes]');
    const sessionStages=[...document.querySelectorAll('[data-session-stage]')].map(el=>({stage:Number(el.getAttribute('data-session-stage')||0),start:Number(el.getAttribute('data-session-start')||0),end:Number(el.getAttribute('data-session-end')||0),complete:String(el.getAttribute('data-session-stage-complete')||'').toLowerCase()==='true',tag:el.tagName,text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,400)}));
    const variations=[...document.querySelectorAll('[data-content-variation-id]')].map(el=>({id:el.getAttribute('data-content-variation-id')||'',state:(el.getAttribute('data-content-variation-state')||'').toLowerCase(),active:String(el.getAttribute('data-content-variation-active')||'').toLowerCase()==='true'})).filter(x=>x.id);
    const values={};for(const id of ['ore','ingot','coins','factory','drones','zone','heat','score','playerHp','enemyHp','wins','losses','energy','skillCd','distance']){const el=document.getElementById(id);if(el)values[id]=Number(el.textContent||0)}
    const viewportArea=Math.max(1,innerWidth*innerHeight),canvasArea=canvases.reduce((sum,row)=>sum+row.area,0);
    return {text,canvases:canvases.map(x=>x.signature),dataState,visibleButtons:[...document.querySelectorAll('button,[role="button"]')].filter(visible).length,gameplayControlCount:gameplayControls.length,gameplayMechanicIds:mechanicIds,testControlCount:testControls.length,audioState,muteControls:[...document.querySelectorAll('[data-audio-control="mute"]')].filter(visible).length,volumeControls:[...document.querySelectorAll('[data-audio-control="volume"]')].filter(visible).length,approvedScopeCount:Number(scopeRoot?.getAttribute('data-approved-scope-count')||0),visibleScopeIds:scopeControls.map(el=>el.getAttribute('data-scope-id')).filter(Boolean),mechanicBindings:scopeControls.map(el=>el.getAttribute('data-mechanic-id')).filter(Boolean),sessionDepthMinutes:Number(sessionNode?.getAttribute('data-session-minutes')||0),sessionProofMode:sessionNode?.getAttribute('data-session-proof-mode')||'',sessionDirectControl:sessionNode?.getAttribute('data-session-stage-direct-control')||'',sessionStages,sessionCurrentStage:Number(sessionNode?.getAttribute('data-session-current-stage')||0),sessionCompletedStages:Number(sessionNode?.getAttribute('data-session-completed-stages')||0),contentVariations:variations,runResult:document.body?.getAttribute('data-run-result')||'',values,gameplaySurfaceRatio:Math.min(1,canvasArea/viewportArea),scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
  });
}
function gameplaySignature(view){return JSON.stringify({canvases:view?.canvases||[],dataState:view?.dataState||[],values:view?.values||{},runResult:view?.runResult||'',sessionCompletedStages:view?.sessionCompletedStages||0,variations:view?.contentVariations||[]});}
function gameplayStateChanged(before,after){return gameplaySignature(before)!==gameplaySignature(after);}
function sourcePathCounts(html=''){
  const winPathCount=/(?:runResult\s*=\s*['"]victory|dataset\.runResult\s*=\s*['"]victory|\bvictory\b|목표 달성|승리)/i.test(html)?1:0;
  const failPathCount=/(?:runResult\s*=\s*['"]defeat|dataset\.runResult\s*=\s*['"]defeat|\bdefeat\b|game over|패배|가동 중단)/i.test(html)?1:0;
  const retryPathCount=/(?:reset|restart|retry|respawn|checkpoint|new\s*round|next|unlock|재시작|다시|리스폰|체크포인트|다음|해금|라운드)/i.test(html)?1:0;
  const worldOrEnemyEntityCount=/(?:enemy|opponent|npc|monster|tower|obstacle|world|zone|area|room|factory|적|상대|몬스터|타워|장애물|세계|구역|지역|방|공장)/i.test(html)?1:0;
  return{winPathCount,failPathCount,retryPathCount,worldOrEnemyEntityCount};
}
function activeVariationIds(view){return (view?.contentVariations||[]).filter(x=>x.active||['active','complete','completed','unlocked'].includes(x.state)).map(x=>x.id);}

function choosePocketAction(view){
  const v=view?.values||{},heat=Number(v.heat||0),ore=Number(v.ore||0),ingot=Number(v.ingot||0),coins=Number(v.coins||0),factory=Number(v.factory||1),drones=Number(v.drones||0),zone=Number(v.zone||1);
  if(heat>=68)return '#coolFactory';
  const needCoins=target=>{if(coins>=target)return null;if(ingot>=1)return '#sellIngot';if(ore>=4)return '#smeltOre';return '#mineOre';};
  if(factory<2)return needCoins(15)||'#upgradeFactory';
  if(drones<1)return needCoins(15)||'#hireDrone';
  if(zone<2)return needCoins(20)||'#unlockZone';
  if(factory<3)return needCoins(20)||'#upgradeFactory';
  if(zone<3)return needCoins(35)||'#unlockZone';
  return '#mineOre';
}
async function clickTarget(page,selector,index=0){
  const targets=page.locator(selector),count=await targets.count();
  if(!count)return {clicked:false,scopeId:null,mechanicId:null,before:null,after:null};
  const target=targets.nth(Math.abs(Number(index)||0)%count);
  const before=await snapshot(page),scopeId=clean(await target.getAttribute('data-scope-id')),mechanicId=clean(await target.getAttribute('data-mechanic-id'));
  try{await target.click({timeout:3000});await page.waitForTimeout(55);}catch{return {clicked:false,scopeId,mechanicId,before,after:await snapshot(page)}}
  const after=await snapshot(page);return {clicked:true,scopeId,mechanicId,before,after};
}
function initialCycleEvaluation({before,after,interactionCount,meaningfulStateTransitionCount,uniqueInteractedMechanicCount,footprint,terminalReached}={}){
  const paths=sourcePathCounts(footprint?.html||'');
  const progressionSignal=/(?:progress|reward|upgrade|unlock|level|quest|score|coin|gold|resource|growth|보상|성장|강화|해금|레벨|퀘스트|점수|코인|골드|자원)/i.test(footprint?.html||'');
  const requirements={
    START_OR_WORLD_ENTRY:Boolean((before?.canvases||[]).length||Number(before?.gameplaySurfaceRatio)>0),
    REAL_PLAYER_INPUT:Number(interactionCount)>=5,
    CORE_GAMEPLAY_ACTION:Number(uniqueInteractedMechanicCount)>=2,
    OBSERVABLE_WORLD_OR_SYSTEM_STATE_CHANGE:Number(meaningfulStateTransitionCount)>=3,
    PROGRESSION_REWARD_OR_MEANINGFUL_CHOICE:progressionSignal&&Number(meaningfulStateTransitionCount)>=3,
    RISK_FAILURE_OR_RESOURCE_PRESSURE:paths.failPathCount>=1,
    CYCLE_END_GOAL_OR_RETRY:Boolean(terminalReached),
    RESTART_OR_NEXT_PROGRESSION:paths.retryPathCount>=1,
  };
  const blockers=Object.entries(requirements).filter(([,pass])=>!pass).map(([name])=>name);
  return{pass:blockers.length===0,unit:INITIAL_IMPLEMENTATION_UNIT,requirements,blockers,startResult:before?.runResult||null,endResult:after?.runResult||null};
}
function evaluateGameplayEvidence({before,after,interactionCount,meaningfulStateTransitionCount,consoleErrors,pageErrors,failedRequests,badResponses,reloadVisible,scopeCoverage,footprint,initialPlayableCycle}={}){
  const blockers=[];
  if(!footprint?.pass)blockers.push(...(footprint?.blockers||[]).map(x=>`FOOTPRINT:${x}`));
  if(Number(before?.gameplayControlCount||0)<2)blockers.push('FUNCTIONAL_GAMEPLAY_CONTROLS_REQUIRED');
  if(interactionCount<5)blockers.push('INSUFFICIENT_GAMEPLAY_INTERACTION');
  if(meaningfulStateTransitionCount<3)blockers.push('MEANINGFUL_STATE_TRANSITIONS_REQUIRED');
  if(!gameplayStateChanged(before,after))blockers.push('NO_OBSERVABLE_GAME_STATE_CHANGE');
  if(Number(after?.scrollWidth||0)>Number(after?.viewportWidth||0)+2)blockers.push('MOBILE_HORIZONTAL_OVERFLOW');
  if(!reloadVisible)blockers.push('RELOAD_VISIBILITY_FAILED');
  if(Number(before?.muteControls||0)<1||Number(before?.volumeControls||0)<1)blockers.push('MUSIC_CONTROL_REQUIRED');
  const startsAfterGesture=!['running','playing'].includes(clean(before?.audioState).toLowerCase())&&['running','playing','muted'].includes(clean(after?.audioState).toLowerCase());
  if(!startsAfterGesture)blockers.push('MUSIC_USER_GESTURE_RUNTIME_REQUIRED');
  if(!scopeCoverage?.pass)for(const blocker of scopeCoverage?.blockers||['APPROVED_SCOPE_RUNTIME_COVERAGE_REQUIRED'])blockers.push(`SCOPE:${blocker}`);
  if(initialPlayableCycle?.pass!==true)for(const blocker of initialPlayableCycle?.blockers||['COMPLETE_PLAYABLE_CYCLE_REQUIRED'])blockers.push(`CYCLE:${blocker}`);
  for(const item of consoleErrors)blockers.push(`CONSOLE:${item}`);for(const item of pageErrors)blockers.push(`PAGE:${item}`);for(const item of failedRequests)blockers.push(`REQUEST:${item}`);for(const item of badResponses)blockers.push(`RESPONSE:${item}`);
  const unique=[...new Set(blockers)];
  return {pass:unique.length===0,blockers:unique,stateChanged:gameplayStateChanged(before,after),musicRuntime:{required:true,startsAfterUserGesture:startsAfterGesture,muteControl:Number(before?.muteControls||0)>0,volumeControl:Number(before?.volumeControls||0)>0,beforeState:before?.audioState||null,afterState:after?.audioState||null,pass:unique.every(x=>!x.startsWith('MUSIC_'))}};
}
function runStrictReview({gameId,source,output}){
  if(!output)throw new Error('STRICT_REVIEW_REQUIRES_EVIDENCE_OUTPUT');
  const strictOutput=path.join(path.dirname(output),'strict-implementation-review.json');
  const args=['tools/company-strict-production-review.mjs','--mode=implementation',`--game-id=${gameId}`,`--source=${source}`,`--evidence=${output}`,`--output=${strictOutput}`];
  const baseline=clean(process.env.DESIGN_BASELINE_SOURCE),artbook=clean(process.env.ARTBOOK_SOURCE);if(baseline)args.push(`--baseline=${baseline}`);if(artbook&&fs.existsSync(artbook))args.push(`--artbook=${artbook}`);
  try{execFileSync(process.execPath,args,{stdio:'inherit',env:{...process.env,COMPANY_STRICT_STATE_OUTPUT:'/tmp/web-worker/persist/game-seed-state.json'},timeout:120000});}catch(error){if(!fs.existsSync(strictOutput))throw error;}
  const review=JSON.parse(fs.readFileSync(strictOutput,'utf8')),score=Number(review.totalScore),hardFailures=Array.isArray(review.hardFailures)?review.hardFailures:[];
  const initialScorePass=Number.isFinite(score)&&score>=HOMEPAGE_TEST_THRESHOLD&&hardFailures.length===0;
  const formalPass=review.verdict==='PASS'&&score>=FORMAL_IMPLEMENTATION_THRESHOLD&&hardFailures.length===0;
  if(!initialScorePass)throw new Error(`STRICT_IMPLEMENTATION_REVIEW_BELOW_INITIAL_THRESHOLD:${review.verdict}:${score}:${hardFailures.join(',')||'NONE'}`);
  return {strictOutput,review,initialScorePass,formalPass};
}
function finalContentDepthEvidence({requested,startedAt,variationIds,metrics}={}){
  const actualGameplayMinutes=Math.max(0,(Date.now()-Number(startedAt||Date.now()))/60000);
  const pass=requested===true&&actualGameplayMinutes>=FINAL_CONTENT_DEPTH_MINUTES&&variationIds.size>=2&&metrics.uniqueMechanicCount>=5&&metrics.uniqueFunctionalUiCount>=4&&metrics.meaningfulStateTransitionCount>=10&&metrics.systemDependencyCount>=4&&metrics.gameplaySurfaceRatio>=0.12&&metrics.duplicateActionRatio<=0.8&&metrics.testUiRatio===0;
  return{pass,targetMinutes:FINAL_CONTENT_DEPTH_MINUTES,validatedMinutes:pass?actualGameplayMinutes:0,actualGameplayMinutes,validationMode:'FINAL_CONTENT_DEPTH_VALIDATION',varietyEvents:[...variationIds],metrics,reason:pass?null:requested?'REAL_30_MINUTE_CONTENT_DEPTH_NOT_COMPLETE':'FINAL_CONTENT_DEPTH_NOT_RUN_AT_INITIAL_VALIDATION'};
}

export async function runGameplayValidation({gameId,sourcePath,port=4181,output='',screenshot='',promotionRevalidationConfirmed=false,finalContentDepthRequested=false}={}){
  const source=posix(sourcePath);if(!gameId)throw new Error('gameId required');if(!source.startsWith('web-games/'))throw new Error(`invalid source path:${source}`);if(!fs.existsSync(source))throw new Error(`source path missing:${source}`);
  const footprint=sourceFootprint(source),baselinePath=clean(process.env.DESIGN_BASELINE_SOURCE),sourceIndexSha256=sha256File(path.join(source,'index.html')),designBaselineSha256=sha256File(baselinePath);
  if(!footprint.pass){
    const failure={version:WEB_VALIDATION_SCHEMA_VERSION,validationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,gameId,target:'web',status:'FAIL',pass:false,validated:false,artifactQualification:{pass:false,classification:'PRODUCTION_ARTIFACT_FAILURE',blockers:footprint.blockers},productionReturnRequired:true,productionReturnReason:'PRODUCTION_ARTIFACT_FAILURE',sourceFootprint:footprint,sourceIndexSha256,designBaselineSha256,checkedAt:new Date().toISOString(),sourcePath:source,blockers:footprint.blockers};writeJson(output,failure);throw new Error(`PRODUCTION_ARTIFACT_FAILURE:${footprint.blockers.join('|')}`);
  }
  const startedAt=Date.now();
  const {chromium}=await import('playwright'),server=await startServer(process.cwd(),Number(port)),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const consoleErrors=[],pageErrors=[],failedRequests=[],badResponses=[];page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(clean(msg.text()).slice(0,500));});page.on('pageerror',e=>pageErrors.push(clean(e.message).slice(0,500)));page.on('requestfailed',r=>{if(r.url().startsWith(`http://127.0.0.1:${port}`))failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText||''}`.slice(0,700));});page.on('response',r=>{if(r.url().startsWith(`http://127.0.0.1:${port}`)&&r.status()>=400)badResponses.push(`${r.status()} ${r.url()}`.slice(0,700));});
  try{
    const url=`http://127.0.0.1:${port}/${source}/`;await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(400);const before=await snapshot(page);let interactionCount=0,meaningfulStateTransitionCount=0;const interactedScopeIds=[],scopeInteractionResults=[],interactedMechanics=new Set(),stateSignatures=new Set([gameplaySignature(before)]),variationIds=new Set(activeVariationIds(before));
    const playOneAction=async step=>{
      const current=await snapshot(page);for(const id of activeVariationIds(current))variationIds.add(id);if(['victory','defeat'].includes(current.runResult))return false;
      const pocketFoundry=Boolean(await page.locator('#mineOre').count());
      const selector=pocketFoundry?choosePocketAction(current):'[data-gameplay-action]:not([disabled]),button[data-mechanic-id]:not([disabled]),[role="button"][data-mechanic-id]:not([aria-disabled="true"])';
      const result=await clickTarget(page,selector,pocketFoundry?0:step);if(!result.clicked)return false;interactionCount++;
      const changed=gameplayStateChanged(result.before,result.after);if(changed){meaningfulStateTransitionCount++;stateSignatures.add(gameplaySignature(result.after));if(result.mechanicId)interactedMechanics.add(result.mechanicId);}
      if(result.scopeId&&changed&&!interactedScopeIds.includes(result.scopeId)){interactedScopeIds.push(result.scopeId);scopeInteractionResults.push({scopeId:result.scopeId,mechanicId:result.mechanicId,clicked:true,stateChanged:true});}
      for(const id of activeVariationIds(result.after))variationIds.add(id);return true;
    };
    for(let step=0;step<160;step++){const current=await snapshot(page);if(['victory','defeat'].includes(current.runResult))break;if(!await playOneAction(step))break;}
    for(const scopeId of before.visibleScopeIds||[]){if(interactedScopeIds.includes(scopeId))continue;const result=await clickTarget(page,`[data-scope-id="${scopeId}"]`);if(result.clicked){interactionCount++;const changed=gameplayStateChanged(result.before,result.after);if(changed){meaningfulStateTransitionCount++;stateSignatures.add(gameplaySignature(result.after));if(result.mechanicId)interactedMechanics.add(result.mechanicId);interactedScopeIds.push(scopeId);scopeInteractionResults.push({scopeId,mechanicId:result.mechanicId,clicked:true,stateChanged:true});}}}
    let after=await snapshot(page),terminalReached=['victory','defeat'].includes(after.runResult);
    const initialPlayableCycle=initialCycleEvaluation({before,after,interactionCount,meaningfulStateTransitionCount,uniqueInteractedMechanicCount:interactedMechanics.size,footprint,terminalReached});
    if(finalContentDepthRequested&&initialPlayableCycle.pass){
      const deadline=startedAt+FINAL_CONTENT_DEPTH_MINUTES*60*1000;let step=0;
      while(Date.now()<deadline){const current=await snapshot(page);for(const id of activeVariationIds(current))variationIds.add(id);if(['victory','defeat'].includes(current.runResult)){await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(250);continue;}await playOneAction(step++);await page.waitForTimeout(350);}
      after=await snapshot(page);terminalReached=['victory','defeat'].includes(after.runResult);
    }
    const scopeCoverage=runtimeApprovedScopeCoverage({declaredCount:before.approvedScopeCount,visibleScopeIds:before.visibleScopeIds,interactedScopeIds,mechanicBindings:before.mechanicBindings});
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(250);const reloadVisible=await page.evaluate(()=>Boolean(document.body&&document.body.getBoundingClientRect().width>0&&document.body.getBoundingClientRect().height>0));
    const verdict=evaluateGameplayEvidence({before,after,interactionCount,meaningfulStateTransitionCount,consoleErrors,pageErrors,failedRequests,badResponses,reloadVisible,scopeCoverage,footprint,initialPlayableCycle});
    const uniqueFunctionalUiCount=new Set((before.gameplayMechanicIds||[]).filter(Boolean)).size;
    const duplicateActionRatio=before.gameplayControlCount?Math.max(0,Math.min(1,1-uniqueFunctionalUiCount/Number(before.gameplayControlCount))):1;
    const testUiRatio=before.gameplayControlCount?Math.max(0,Math.min(1,Number(before.testControlCount||0)/Number(before.gameplayControlCount))):0;
    const paths=sourcePathCounts(footprint.html);
    const implementationMetrics={uniqueMechanicCount:footprint.mechanicCount,uniqueFunctionalUiCount,gameplayActionCount:interactionCount,meaningfulStateTransitionCount,uniqueGameplayStateCount:stateSignatures.size,uniqueInteractedMechanicCount:interactedMechanics.size,systemDependencyCount:Math.min(5,Math.max(interactedMechanics.size,footprint.systemCount)),worldOrEnemyEntityCount:paths.worldOrEnemyEntityCount,winPathCount:paths.winPathCount,failPathCount:paths.failPathCount,retryPathCount:paths.retryPathCount,duplicateActionRatio,testUiRatio,gameplaySurfaceRatio:Math.max(Number(before.gameplaySurfaceRatio||0),Number(after.gameplaySurfaceRatio||0)),contentVariationCount:variationIds.size};
    const contentDepthValidation=finalContentDepthEvidence({requested:finalContentDepthRequested,startedAt,variationIds,metrics:implementationMetrics});
    const substanceGate={pass:footprint.pass===true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:footprint.totalBytes,executableBytes:footprint.scriptBytes,mechanicCount:footprint.mechanicCount,directSessionControls:footprint.stageButtons?1:0,proxyMarkers:footprint.proxyMarkers,initialImplementationUnit:INITIAL_IMPLEMENTATION_UNIT};
    const sessionContract={pass:contentDepthValidation.pass,validationMode:'FINAL_CONTENT_DEPTH_VALIDATION',minutes:FINAL_CONTENT_DEPTH_MINUTES,validatedMinutes:contentDepthValidation.validatedMinutes,directStageClick:false,legacyStageUiObserved:(before.sessionStages||[]).length,legacyStageUiUsedAsEvidence:false};
    const report={version:WEB_VALIDATION_SCHEMA_VERSION,validationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,gameId,target:'web',status:verdict.pass?'PASS':'FAIL',pass:verdict.pass,validated:verdict.pass,artifactQualification:{pass:footprint.pass,classification:'REAL_PLAYABLE_GAME',blockers:footprint.blockers},productionReturnRequired:false,initialImplementationUnit:INITIAL_IMPLEMENTATION_UNIT,initialImplementationMinuteHardGate:false,initialPlayableCycle,initialPlayableCyclePassed:initialPlayableCycle.pass,initialRealGamePassed:false,realEvidenceExists:true,gameplayInteractionPerformed:interactionCount>0,interactionCount,stateChanged:verdict.stateChanged,musicRuntime:verdict.musicRuntime,approvedScopeFullyImplemented:scopeCoverage.pass,scopeCoverage,scopeInteractionResults,runtimeSmokePassed:consoleErrors.length===0&&pageErrors.length===0&&failedRequests.length===0&&badResponses.length===0&&reloadVisible,mobileViewport:{width:390,height:844,touch:true},sourceFootprint:footprint,substanceGate,implementationMetrics,contentDepthValidation,finalContentDepthPassed:contentDepthValidation.pass,top30Eligible:false,sessionDepthMinutes:contentDepthValidation.validatedMinutes,sessionContract,terminalOutcome:{required:true,reached:terminalReached,result:after.runResult||null},multiplayer:null,before,after,reloadVisible,blockers:verdict.blockers,consoleErrors,pageErrors,failedRequests,badResponses,evidence:[`interactionCount=${interactionCount}`,`meaningfulStateTransitions=${meaningfulStateTransitionCount}`,`uniqueMechanics=${footprint.mechanicCount}`,`uniqueFunctionalUi=${uniqueFunctionalUiCount}`,`systemDependencies=${implementationMetrics.systemDependencyCount}`,`approvedScope=${scopeCoverage.pass}`,`initialPlayableCycle=${initialPlayableCycle.pass}`,`finalContentDepth=${contentDepthValidation.pass}`,`terminalOutcome=${after.runResult||'none'}`],checkedAt:new Date().toISOString(),sourcePath:source,sourceIndexSha256,sourceRevision:clean(process.env.GITHUB_SHA)||null,designBaselineSha256,url};
    if(screenshot){fs.mkdirSync(path.dirname(screenshot),{recursive:true});await page.screenshot({path:screenshot,fullPage:true});report.screenshot=screenshot;}writeJson(output,report);
    console.log(JSON.stringify(report,null,2));if(!report.pass)throw new Error(`WEB_INITIAL_GAMEPLAY_VALIDATION_FAILED:${report.blockers.join(' | ').slice(0,1800)}`);
    const {strictOutput,review,initialScorePass,formalPass}=runStrictReview({gameId,source,output});report.strictReviewPath=strictOutput;report.strictReview={verdict:review.verdict,totalScore:Number(review.totalScore),hardFailures:review.hardFailures||[],improvementTargets:review.improvementTargets||[],reviewedAt:review.reviewedAt||null,formalPassThreshold:FORMAL_IMPLEMENTATION_THRESHOLD,initialScoreThreshold:HOMEPAGE_TEST_THRESHOLD};report.webStrictScore=Number(review.totalScore);report.improvementTargets=review.improvementTargets||[];
    const initialEvidence=evaluateWebValidationEvidence(report,{minimumScore:HOMEPAGE_TEST_THRESHOLD,requireFinalContentDepth:false,currentSourceSha256:sourceIndexSha256,currentBaselineSha256:designBaselineSha256});
    const top30Evidence=evaluateWebValidationEvidence(report,{minimumScore:HOMEPAGE_TEST_THRESHOLD,requireFinalContentDepth:true,currentSourceSha256:sourceIndexSha256,currentBaselineSha256:designBaselineSha256});
    report.initialRealGamePassed=initialEvidence.pass;report.initialRealGameBlockers=initialEvidence.blockers;report.finalContentDepthPassed=top30Evidence.finalContentDepthPass;report.top30Eligible=top30Evidence.pass;report.homepageTestEligible=top30Evidence.pass;report.homepageTestVerdict=top30Evidence.pass?'PASS':initialEvidence.pass?'WAITING_FINAL_CONTENT_DEPTH':'REVISE';report.formalReviewPassed=formalPass;report.formalImplementationPassed=false;report.formalImplementationVerdict='REVISE';writeJson(output,report);
    if(!initialEvidence.pass||!initialScorePass)throw new Error(`WEB_SCHEMA12_INITIAL_EVIDENCE_NOT_PASS:${initialEvidence.blockers.join('|')}`);
    console.log(`WEB_STRICT_REVIEW_SCORE=${report.webStrictScore}`);console.log('INITIAL_REAL_GAME_PASS=YES');console.log(`FINAL_CONTENT_DEPTH_PASS=${report.finalContentDepthPassed?'YES':'NO'}`);console.log(`TOP30_ELIGIBLE=${report.top30Eligible?'YES':'NO'}`);console.log(`FORMAL_IMPLEMENTATION_PASS=${report.formalImplementationPassed?'YES':'NO'}`);console.log(`WEB_SOURCE_INDEX_SHA256=${sourceIndexSha256}`);console.log(`WEB_REAL_GAME_BYTES=${footprint.totalBytes}`);console.log(`WEB_REAL_GAME_SCRIPT_BYTES=${footprint.scriptBytes}`);console.log(`WEB_REAL_GAME_MECHANICS=${footprint.mechanicCount}`);return report;
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}

async function main(){
  const gameId=arg('game-id'),sourcePath=arg('source'),port=Number(arg('port','4181')),output=arg('output'),screenshot=arg('screenshot'),finalContentDepthRequested=boolArg('final-content-depth',false);const first=await runGameplayValidation({gameId,sourcePath,port,output,screenshot,promotionRevalidationConfirmed:false,finalContentDepthRequested});const score=Number(first.strictReview?.totalScore),hard=Array.isArray(first.strictReview?.hardFailures)?first.strictReview.hardFailures:[];
  if(first.finalContentDepthPassed===true&&first.formalReviewPassed===true&&Number.isFinite(score)&&score>=FORMAL_IMPLEMENTATION_THRESHOLD&&hard.length===0){const secondaryOutput=output?path.join(path.dirname(output),'web-promotion-revalidation.json'):'';let second=null,revalidationError=null;try{second=await runGameplayValidation({gameId,sourcePath,port:port+1,output:secondaryOutput,screenshot:'',promotionRevalidationConfirmed:true,finalContentDepthRequested:true});}catch(error){revalidationError=clean(error?.message||error).slice(0,500);second=secondaryOutput?readJson(secondaryOutput,null):null;}const secondScore=Number(second?.strictReview?.totalScore),secondHard=Array.isArray(second?.strictReview?.hardFailures)?second.strictReview.hardFailures:[];const sourceHashMatch=Boolean(first.sourceIndexSha256&&second?.sourceIndexSha256&&first.sourceIndexSha256===second.sourceIndexSha256),baselineHashMatch=first.designBaselineSha256===second?.designBaselineSha256;const secondSubstancePass=second?.substanceGate?.pass===true;const secondContentDepthPass=second?.contentDepthValidation?.pass===true;const promotionPass=second?.initialRealGamePassed===true&&second?.formalReviewPassed===true&&Number.isFinite(secondScore)&&secondScore>=FORMAL_IMPLEMENTATION_THRESHOLD&&secondHard.length===0&&secondContentDepthPass&&secondSubstancePass&&second?.terminalOutcome?.reached===true&&sourceHashMatch&&baselineHashMatch;first.promotionRevalidation={required:true,independentRun:true,pass:promotionPass,minimumScore:FORMAL_IMPLEMENTATION_THRESHOLD,firstScore:score,secondScore:Number.isFinite(secondScore)?secondScore:null,sourceHashMatch,baselineHashMatch,secondCheckedAt:second?.checkedAt||null,secondContentDepthPass,secondFootprintPass:second?.sourceFootprint?.pass===true,secondSubstancePass,secondTerminalReached:second?.terminalOutcome?.reached===true,error:revalidationError};first.formalImplementationPassed=promotionPass;first.formalImplementationVerdict=promotionPass?'PASS':'REVISE';writeJson(output,first);console.log(`WEB_PROMOTION_REVALIDATION=${promotionPass?'PASS':'FAIL'}`);console.log(`WEB_PROMOTION_REVALIDATION_SOURCE_HASH_MATCH=${sourceHashMatch?'YES':'NO'}`);}else{first.promotionRevalidation={required:false,independentRun:false,pass:false,minimumScore:FORMAL_IMPLEMENTATION_THRESHOLD,reason:first.finalContentDepthPassed?'WEB_SCORE_BELOW_90_OR_HARD_GATE':'FINAL_CONTENT_DEPTH_NOT_PASS'};first.formalImplementationPassed=false;first.formalImplementationVerdict='REVISE';writeJson(output,first);console.log(first.finalContentDepthPassed?'WEB_PROMOTION_REVALIDATION=NOT_REQUIRED_BELOW_90':'WEB_PROMOTION_REVALIDATION=WAITING_FINAL_CONTENT_DEPTH');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
