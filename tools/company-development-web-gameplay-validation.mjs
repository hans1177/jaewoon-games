// 실제 게임 본체를 플레이해서 검증한다. 세션 단계 버튼을 직접 눌러 PASS시키는 방식은 금지한다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {runtimeApprovedScopeCoverage} from './company-approved-scope-contract.mjs';

const HOMEPAGE_TEST_THRESHOLD=80;
const FORMAL_IMPLEMENTATION_THRESHOLD=90;
const VALIDATION_SCHEMA_VERSION=11;
const SESSION_MINUTES=30;
const SESSION_STAGE_WINDOWS=[[0,5],[5,15],[15,25],[25,30]];
const MIN_SOURCE_BYTES=12000;
const MIN_SCRIPT_BYTES=6000;
const MIN_MECHANICS=5;
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
function sourceFootprint(source){
  const indexFile=path.join(source,'index.html');
  const html=fs.readFileSync(indexFile,'utf8');
  const totalBytes=Buffer.byteLength(html,'utf8');
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(x=>String(x[1]||''));
  const scriptBytes=scripts.reduce((sum,text)=>sum+Buffer.byteLength(text,'utf8'),0);
  const mechanicIds=[...new Set([...html.matchAll(/data-mechanic-id=["']([^"']+)["']/gi)].map(x=>clean(x[1])).filter(Boolean))];
  const systemCount=Number(html.match(/data-gameplay-system-count=["'](\d+)["']/i)?.[1]||0);
  const proofMode=clean(html.match(/data-session-proof-mode=["']([^"']+)["']/i)?.[1]);
  const directStageControl=clean(html.match(/data-session-stage-direct-control=["']([^"']+)["']/i)?.[1]).toLowerCase();
  const stageButtons=/<button\b[^>]*data-session-stage=/i.test(html);
  const proxyMarkers=(html.match(/scope-control-|FULL APPROVED WEB COMPANION|승인 분량 전체 구현/gi)||[]).length;
  const blockers=[];
  if(totalBytes<MIN_SOURCE_BYTES)blockers.push(`SOURCE_FOOTPRINT_TOO_SMALL:${totalBytes}:${MIN_SOURCE_BYTES}`);
  if(scriptBytes<MIN_SCRIPT_BYTES)blockers.push(`SOURCE_GAME_LOGIC_TOO_SMALL:${scriptBytes}:${MIN_SCRIPT_BYTES}`);
  if(mechanicIds.length<MIN_MECHANICS)blockers.push(`SOURCE_MECHANICS_TOO_FEW:${mechanicIds.length}:${MIN_MECHANICS}`);
  if(systemCount<MIN_MECHANICS)blockers.push(`SOURCE_SYSTEM_COUNT_TOO_LOW:${systemCount}:${MIN_MECHANICS}`);
  if(proofMode!=='PROGRESSION_MILESTONES')blockers.push('SESSION_PROOF_MODE_INVALID');
  if(directStageControl!=='false'||stageButtons)blockers.push('DIRECT_SESSION_STAGE_CONTROL_FORBIDDEN');
  if(proxyMarkers>0)blockers.push(`GENERIC_PROXY_MARKERS_FORBIDDEN:${proxyMarkers}`);
  return {pass:blockers.length===0,implementationClass:'DEDICATED',totalBytes,scriptBytes,mechanicIds,mechanicCount:mechanicIds.length,systemCount,proofMode,directStageControl,stageButtons,proxyMarkers,blockers};
}

function ensure30MinuteSessionContract({sourcePath}={}){
  const source=posix(sourcePath),indexFile=path.join(source,'index.html');
  if(!fs.existsSync(indexFile))throw new Error(`SESSION_CONTRACT_INDEX_MISSING:${indexFile}`);
  const html=fs.readFileSync(indexFile,'utf8');
  const rows=[...html.matchAll(/data-session-stage=["'](\d+)["'][^>]*data-session-start=["'](\d+)["'][^>]*data-session-end=["'](\d+)["']/g)].map(match=>({stage:Number(match[1]),start:Number(match[2]),end:Number(match[3])}));
  const shape=rows.length===4&&rows.every((row,index)=>row.stage===index+1&&row.start===SESSION_STAGE_WINDOWS[index][0]&&row.end===SESSION_STAGE_WINDOWS[index][1]);
  if(!/data-session-minutes=["']30["']/i.test(html)||!shape)throw new Error('SESSION_MILESTONE_CONTRACT_REQUIRED');
  if(!/data-session-proof-mode=["']PROGRESSION_MILESTONES["']/i.test(html))throw new Error('SESSION_PROGRESSION_PROOF_REQUIRED');
  if(/<button\b[^>]*data-session-stage=/i.test(html))throw new Error('SESSION_STAGE_BUTTON_FORBIDDEN');
  return {mutated:false,minutes:30,stages:4,proofMode:'PROGRESSION_MILESTONES'};
}

async function snapshot(page){
  return page.evaluate(()=>{
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0;};
    const text=(document.body?.innerText||'').replace(/\s+/g,' ').trim().slice(0,14000);
    const canvases=[...document.querySelectorAll('canvas')].map(canvas=>{try{return `${canvas.width}x${canvas.height}:${canvas.toDataURL().slice(-180)}`;}catch{return `${canvas.width}x${canvas.height}:TAINTED`;}});
    const dataState=[...document.querySelectorAll('[data-state],[data-score],[data-resource],[data-progress]')].map(el=>({tag:el.tagName,text:(el.textContent||'').trim().slice(0,300),attrs:[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])}));
    const scopeRoot=document.querySelector('[data-approved-scope-count]');
    const scopeControls=[...document.querySelectorAll('[data-scope-id]')].filter(visible);
    const sessionNode=document.querySelector('[data-session-minutes]');
    const sessionStages=[...document.querySelectorAll('[data-session-stage]')].map(el=>({stage:Number(el.getAttribute('data-session-stage')||0),start:Number(el.getAttribute('data-session-start')||0),end:Number(el.getAttribute('data-session-end')||0),complete:String(el.getAttribute('data-session-stage-complete')||'').toLowerCase()==='true',tag:el.tagName,text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,400)}));
    const audioState=(document.querySelector('[data-audio-state]')?.getAttribute('data-audio-state')||'').toLowerCase();
    const values={};for(const id of ['ore','ingot','coins','factory','drones','zone','heat','score']){const el=document.getElementById(id);if(el)values[id]=Number(el.textContent||0)}
    return {text,canvases,dataState,visibleButtons:[...document.querySelectorAll('button,[role="button"]')].filter(visible).length,audioState,muteControls:[...document.querySelectorAll('[data-audio-control="mute"]')].filter(visible).length,volumeControls:[...document.querySelectorAll('[data-audio-control="volume"]')].filter(visible).length,approvedScopeCount:Number(scopeRoot?.getAttribute('data-approved-scope-count')||0),visibleScopeIds:scopeControls.map(el=>el.getAttribute('data-scope-id')).filter(Boolean),mechanicBindings:scopeControls.map(el=>el.getAttribute('data-mechanic-id')).filter(Boolean),sessionDepthMinutes:Number(sessionNode?.getAttribute('data-session-minutes')||0),sessionProofMode:sessionNode?.getAttribute('data-session-proof-mode')||'',sessionDirectControl:sessionNode?.getAttribute('data-session-stage-direct-control')||'',sessionStages,sessionCurrentStage:Number(sessionNode?.getAttribute('data-session-current-stage')||0),sessionCompletedStages:Number(sessionNode?.getAttribute('data-session-completed-stages')||0),runResult:document.body?.getAttribute('data-run-result')||'',values,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
  });
}
function gameplaySignature(view){return JSON.stringify({canvases:view?.canvases||[],dataState:view?.dataState||[],values:view?.values||{},runResult:view?.runResult||'',sessionCompletedStages:view?.sessionCompletedStages||0});}
function gameplayStateChanged(before,after){return gameplaySignature(before)!==gameplaySignature(after);}

function evaluateSessionContract(before,after,stageResults=[]){
  const rows=Array.isArray(before?.sessionStages)?before.sessionStages:[];
  const shape=rows.length===4&&rows.every((row,index)=>row.stage===index+1&&row.start===SESSION_STAGE_WINDOWS[index][0]&&row.end===SESSION_STAGE_WINDOWS[index][1]&&row.tag!=='BUTTON');
  const mode=before?.sessionProofMode==='PROGRESSION_MILESTONES'&&String(before?.sessionDirectControl).toLowerCase()==='false';
  const completed=Number(after?.sessionCompletedStages||0)===4&&(after?.sessionStages||[]).filter(x=>x.complete).length===4;
  const meaningful=stageResults.length===4&&stageResults.every((row,index)=>row.stage===index+1&&row.trigger==='GAMEPLAY_MILESTONE'&&row.completed===true&&row.clicked===true&&row.gameStateChanged===true&&row.directStageClick===false);
  const validatedMinutes=shape&&mode&&completed&&meaningful?30:stageResults.filter(x=>x.trigger==='GAMEPLAY_MILESTONE'&&x.gameStateChanged).reduce((max,row)=>Math.max(max,Number(row.end)||0),0);
  return {pass:shape&&mode&&completed&&meaningful&&validatedMinutes===30,validationMode:'GAMEPLAY_MILESTONE_DEPTH',minutes:30,validatedMinutes,stageCount:rows.length,completedStages:Number(after?.sessionCompletedStages||0),windows:rows.map(x=>[x.start,x.end]),proofMode:'PROGRESSION_MILESTONES',directStageClick:false,shapePass:shape,progressionProofPass:mode,stageGameplayPassed:meaningful,stageResults};
}

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
async function clickTarget(page,selector){
  const target=page.locator(selector).first();
  if(!(await target.count()))return {clicked:false,scopeId:null,mechanicId:null,before:null,after:null};
  const before=await snapshot(page),scopeId=clean(await target.getAttribute('data-scope-id')),mechanicId=clean(await target.getAttribute('data-mechanic-id'));
  try{await target.click({timeout:3000});await page.waitForTimeout(55);}catch{return {clicked:false,scopeId,mechanicId,before,after:await snapshot(page)}}
  const after=await snapshot(page);return {clicked:true,scopeId,mechanicId,before,after};
}

function evaluateGameplayEvidence({before,after,interactionCount,consoleErrors,pageErrors,failedRequests,badResponses,reloadVisible,scopeCoverage,sessionContract,footprint,terminalReached}={}){
  const blockers=[];
  if(!footprint?.pass)blockers.push(...(footprint?.blockers||[]).map(x=>`FOOTPRINT:${x}`));
  if(Number(before?.visibleButtons||0)<4)blockers.push('VISIBLE_GAMEPLAY_CONTROLS_REQUIRED');
  if(interactionCount<8)blockers.push('INSUFFICIENT_GAMEPLAY_INTERACTION');
  if(!gameplayStateChanged(before,after))blockers.push('NO_OBSERVABLE_GAME_STATE_CHANGE');
  if(Number(after?.scrollWidth||0)>Number(after?.viewportWidth||0)+2)blockers.push('MOBILE_HORIZONTAL_OVERFLOW');
  if(!reloadVisible)blockers.push('RELOAD_VISIBILITY_FAILED');
  if(Number(before?.muteControls||0)<1||Number(before?.volumeControls||0)<1)blockers.push('MUSIC_CONTROL_REQUIRED');
  const startsAfterGesture=!['running','playing'].includes(clean(before?.audioState).toLowerCase())&&['running','playing','muted'].includes(clean(after?.audioState).toLowerCase());
  if(!startsAfterGesture)blockers.push('MUSIC_USER_GESTURE_RUNTIME_REQUIRED');
  if(!scopeCoverage?.pass)for(const blocker of scopeCoverage?.blockers||['APPROVED_SCOPE_RUNTIME_COVERAGE_REQUIRED'])blockers.push(`SCOPE:${blocker}`);
  if(!sessionContract?.pass)blockers.push('SESSION:PROGRESSION_MILESTONE_30MIN_DEPTH_REQUIRED');
  if(!terminalReached)blockers.push('TERMINAL_GAME_OUTCOME_REQUIRED');
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
  const homepagePass=Number.isFinite(score)&&score>=HOMEPAGE_TEST_THRESHOLD&&hardFailures.length===0;const formalPass=review.verdict==='PASS'&&score>=FORMAL_IMPLEMENTATION_THRESHOLD&&hardFailures.length===0;
  if(!homepagePass)throw new Error(`STRICT_IMPLEMENTATION_REVIEW_BELOW_HOMEPAGE_THRESHOLD:${review.verdict}:${score}:${hardFailures.join(',')||'NONE'}`);
  return {strictOutput,review,homepagePass,formalPass};
}

export async function runGameplayValidation({gameId,sourcePath,port=4181,output='',screenshot='',promotionRevalidationConfirmed=false}={}){
  const source=posix(sourcePath);if(!gameId)throw new Error('gameId required');if(!source.startsWith('web-games/'))throw new Error(`invalid source path:${source}`);if(!fs.existsSync(source))throw new Error(`source path missing:${source}`);
  ensure30MinuteSessionContract({sourcePath:source});const footprint=sourceFootprint(source);if(!footprint.pass)throw new Error(`REAL_GAME_FOOTPRINT_FAILED:${footprint.blockers.join('|')}`);
  const baselinePath=clean(process.env.DESIGN_BASELINE_SOURCE),sourceIndexSha256=sha256File(path.join(source,'index.html')),designBaselineSha256=sha256File(baselinePath);
  const {chromium}=await import('playwright'),server=await startServer(process.cwd(),Number(port)),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const consoleErrors=[],pageErrors=[],failedRequests=[],badResponses=[];page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(clean(msg.text()).slice(0,500));});page.on('pageerror',e=>pageErrors.push(clean(e.message).slice(0,500)));page.on('requestfailed',r=>{if(r.url().startsWith(`http://127.0.0.1:${port}`))failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText||''}`.slice(0,700));});page.on('response',r=>{if(r.url().startsWith(`http://127.0.0.1:${port}`)&&r.status()>=400)badResponses.push(`${r.status()} ${r.url()}`.slice(0,700));});
  try{
    const url=`http://127.0.0.1:${port}/${source}/`;await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(400);const before=await snapshot(page);let interactionCount=0;const interactedScopeIds=[],scopeInteractionResults=[],stageResults=[];let previousStages=new Map((before.sessionStages||[]).map(x=>[x.stage,x.complete]));
    for(let step=0;step<120;step++){
      const current=await snapshot(page);if(['victory','defeat'].includes(current.runResult))break;
      const selector=await page.locator('#mineOre').count()?choosePocketAction(current):`[data-gameplay-action]:not([disabled])`;
      const result=await clickTarget(page,selector);if(!result.clicked)break;interactionCount++;
      const changed=gameplayStateChanged(result.before,result.after);if(result.scopeId&&changed&&!interactedScopeIds.includes(result.scopeId)){interactedScopeIds.push(result.scopeId);scopeInteractionResults.push({scopeId:result.scopeId,mechanicId:result.mechanicId,clicked:true,stateChanged:true});}
      for(const row of result.after.sessionStages||[]){if(row.complete&&!previousStages.get(row.stage)&&!stageResults.some(x=>x.stage===row.stage)){stageResults.push({stage:row.stage,start:row.start,end:row.end,clicked:true,completed:true,trigger:'GAMEPLAY_MILESTONE',triggeredByGameplay:true,directStageClick:false,gameStateChanged:changed,interactionIndex:interactionCount,mechanicId:result.mechanicId||null});}previousStages.set(row.stage,row.complete)}
    }
    for(const scopeId of before.visibleScopeIds||[]){if(interactedScopeIds.includes(scopeId))continue;const result=await clickTarget(page,`[data-scope-id="${scopeId}"]`);if(result.clicked){interactionCount++;const changed=gameplayStateChanged(result.before,result.after);if(changed){interactedScopeIds.push(scopeId);scopeInteractionResults.push({scopeId,mechanicId:result.mechanicId,clicked:true,stateChanged:true});}}}
    const after=await snapshot(page),terminalReached=['victory','defeat'].includes(after.runResult);const scopeCoverage=runtimeApprovedScopeCoverage({declaredCount:before.approvedScopeCount,visibleScopeIds:before.visibleScopeIds,interactedScopeIds,mechanicBindings:before.mechanicBindings});const sessionContract=evaluateSessionContract(before,after,stageResults.sort((a,b)=>a.stage-b.stage));
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(250);const reloadVisible=await page.evaluate(()=>Boolean(document.body&&document.body.getBoundingClientRect().width>0&&document.body.getBoundingClientRect().height>0));
    const verdict=evaluateGameplayEvidence({before,after,interactionCount,consoleErrors,pageErrors,failedRequests,badResponses,reloadVisible,scopeCoverage,sessionContract,footprint,terminalReached});
    const substanceGate={pass:footprint.pass===true,implementationClass:'DEDICATED',totalBytes:footprint.totalBytes,executableBytes:footprint.scriptBytes,mechanicCount:footprint.mechanicCount,directSessionControls:footprint.stageButtons?1:0,proxyMarkers:footprint.proxyMarkers};
    const report={version:VALIDATION_SCHEMA_VERSION,validationSchemaVersion:VALIDATION_SCHEMA_VERSION,gameId,target:'web',status:verdict.pass?'PASS':'FAIL',pass:verdict.pass,validated:verdict.pass,realEvidenceExists:true,gameplayInteractionPerformed:interactionCount>0,interactionCount,stateChanged:verdict.stateChanged,musicRuntime:verdict.musicRuntime,approvedScopeFullyImplemented:scopeCoverage.pass,scopeCoverage,scopeInteractionResults,runtimeSmokePassed:consoleErrors.length===0&&pageErrors.length===0&&failedRequests.length===0&&badResponses.length===0&&reloadVisible,mobileViewport:{width:390,height:844,touch:true},sourceFootprint:footprint,substanceGate,sessionDepthMinutes:sessionContract.validatedMinutes,sessionContract,terminalOutcome:{required:true,reached:terminalReached,result:after.runResult||null},multiplayer:null,before,after,reloadVisible,blockers:verdict.blockers,consoleErrors,pageErrors,failedRequests,badResponses,evidence:[`interactionCount=${interactionCount}`,`mechanics=${footprint.mechanicCount}`,`sourceBytes=${footprint.totalBytes}`,`scriptBytes=${footprint.scriptBytes}`,`approvedScope=${scopeCoverage.pass}`,`sessionProofMode=${sessionContract.proofMode}`,`sessionDepthMinutes=${sessionContract.validatedMinutes}`,`terminalOutcome=${after.runResult||'none'}`],checkedAt:new Date().toISOString(),sourcePath:source,sourceIndexSha256,sourceRevision:clean(process.env.GITHUB_SHA)||null,designBaselineSha256,url};
    if(screenshot){fs.mkdirSync(path.dirname(screenshot),{recursive:true});await page.screenshot({path:screenshot,fullPage:true});report.screenshot=screenshot;}if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
    console.log(JSON.stringify(report,null,2));if(!report.pass)throw new Error(`WEB_GAMEPLAY_VALIDATION_FAILED:${report.blockers.join(' | ').slice(0,1800)}`);
    const {strictOutput,review,homepagePass,formalPass}=runStrictReview({gameId,source,output});report.strictReviewPath=strictOutput;report.strictReview={verdict:review.verdict,totalScore:Number(review.totalScore),hardFailures:review.hardFailures||[],improvementTargets:review.improvementTargets||[],reviewedAt:review.reviewedAt||null,formalPassThreshold:FORMAL_IMPLEMENTATION_THRESHOLD,homepageTestThreshold:HOMEPAGE_TEST_THRESHOLD};report.webStrictScore=Number(review.totalScore);report.improvementTargets=review.improvementTargets||[];report.homepageTestEligible=homepagePass;report.homepageTestVerdict=homepagePass?'PASS':'REVISE';report.formalReviewPassed=formalPass;report.formalImplementationPassed=formalPass&&promotionRevalidationConfirmed;report.formalImplementationVerdict=report.formalImplementationPassed?'PASS':'REVISE';if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    console.log(`WEB_STRICT_REVIEW_SCORE=${report.webStrictScore}`);console.log(`HOMEPAGE_TEST_ELIGIBLE=${homepagePass?'YES':'NO'}`);console.log(`FORMAL_IMPLEMENTATION_PASS=${report.formalImplementationPassed?'YES':'NO'}`);console.log(`WEB_SOURCE_INDEX_SHA256=${sourceIndexSha256}`);console.log(`WEB_REAL_GAME_BYTES=${footprint.totalBytes}`);console.log(`WEB_REAL_GAME_SCRIPT_BYTES=${footprint.scriptBytes}`);console.log(`WEB_REAL_GAME_MECHANICS=${footprint.mechanicCount}`);console.log(`WEB_30MIN_SESSION_VALIDATED_MINUTES=${sessionContract.validatedMinutes}`);console.log('WEB_30MIN_SESSION_PROOF=GAMEPLAY_MILESTONE_DEPTH');return report;
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}

async function main(){
  const gameId=arg('game-id'),sourcePath=arg('source'),port=Number(arg('port','4181')),output=arg('output'),screenshot=arg('screenshot');const first=await runGameplayValidation({gameId,sourcePath,port,output,screenshot,promotionRevalidationConfirmed:false});const score=Number(first.strictReview?.totalScore),hard=Array.isArray(first.strictReview?.hardFailures)?first.strictReview.hardFailures:[];
  if(first.formalReviewPassed===true&&Number.isFinite(score)&&score>=FORMAL_IMPLEMENTATION_THRESHOLD&&hard.length===0){const secondaryOutput=output?path.join(path.dirname(output),'web-promotion-revalidation.json'):'';let second=null,revalidationError=null;try{second=await runGameplayValidation({gameId,sourcePath,port:port+1,output:secondaryOutput,screenshot:'',promotionRevalidationConfirmed:true});}catch(error){revalidationError=clean(error?.message||error).slice(0,500);second=secondaryOutput?readJson(secondaryOutput,null):null;}const secondScore=Number(second?.strictReview?.totalScore),secondHard=Array.isArray(second?.strictReview?.hardFailures)?second.strictReview.hardFailures:[];const sourceHashMatch=Boolean(first.sourceIndexSha256&&second?.sourceIndexSha256&&first.sourceIndexSha256===second.sourceIndexSha256),baselineHashMatch=first.designBaselineSha256===second?.designBaselineSha256;const secondSubstancePass=second?.substanceGate?.pass===true;const promotionPass=second?.pass===true&&second?.formalReviewPassed===true&&Number.isFinite(secondScore)&&secondScore>=FORMAL_IMPLEMENTATION_THRESHOLD&&secondHard.length===0&&second?.sessionContract?.pass===true&&secondSubstancePass&&second?.terminalOutcome?.reached===true&&sourceHashMatch&&baselineHashMatch;first.promotionRevalidation={required:true,independentRun:true,pass:promotionPass,minimumScore:FORMAL_IMPLEMENTATION_THRESHOLD,firstScore:score,secondScore:Number.isFinite(secondScore)?secondScore:null,sourceHashMatch,baselineHashMatch,secondCheckedAt:second?.checkedAt||null,secondSessionPass:second?.sessionContract?.pass===true,secondFootprintPass:second?.sourceFootprint?.pass===true,secondSubstancePass,secondTerminalReached:second?.terminalOutcome?.reached===true,error:revalidationError};first.formalImplementationPassed=promotionPass;first.formalImplementationVerdict=promotionPass?'PASS':'REVISE';if(output)fs.writeFileSync(output,JSON.stringify(first,null,2)+'\n');console.log(`WEB_PROMOTION_REVALIDATION=${promotionPass?'PASS':'FAIL'}`);console.log(`WEB_PROMOTION_REVALIDATION_SOURCE_HASH_MATCH=${sourceHashMatch?'YES':'NO'}`);}else{first.promotionRevalidation={required:false,independentRun:false,pass:false,minimumScore:FORMAL_IMPLEMENTATION_THRESHOLD,reason:'WEB_SCORE_BELOW_90_OR_HARD_GATE'};first.formalImplementationPassed=false;first.formalImplementationVerdict='REVISE';if(output)fs.writeFileSync(output,JSON.stringify(first,null,2)+'\n');console.log('WEB_PROMOTION_REVALIDATION=NOT_REQUIRED_BELOW_90');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
