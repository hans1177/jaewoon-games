// 실제 게임 본체를 플레이해서 검증한다. 첫 구현은 완결 플레이 사이클, 30분은 최종 콘텐츠 깊이 검증으로만 사용한다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {runtimeApprovedScopeCoverage} from './company-approved-scope-contract.mjs';
import {scoreRealWebGame} from './company-web-real-game-score.mjs';

const HOMEPAGE_TEST_THRESHOLD=80;
const FORMAL_IMPLEMENTATION_THRESHOLD=90;
const VALIDATION_SCHEMA_VERSION=12;
const INITIAL_IMPLEMENTATION_UNIT='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE';
const FINAL_CONTENT_DEPTH_MINUTES=30;
const MIN_MECHANICS=5;
const clean=value=>String(value??'').trim();
const posix=value=>String(value??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/g,'');
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
function sha256File(file){return file&&fs.existsSync(file)&&fs.statSync(file).isFile()?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null;}
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function categoryFromBaseline(baseline={}){const seed=clean(baseline?.gameSeedId||baseline?.seedId).toUpperCase();const m=seed.match(/^SEED-(?:ROBLOX-)?(.+)-\d+$/);return clean(m?.[1]||baseline?.category||baseline?.content?.category||'CASUAL');}

function safeFile(root,urlPath){const pathname=decodeURIComponent(String(urlPath||'/').split('?')[0]);const requested=pathname.endsWith('/')?`${pathname}index.html`:pathname;const file=path.resolve(root,`.${requested}`),base=path.resolve(root);if(!file.startsWith(base+path.sep)&&file!==base)return null;return file;}
function startServer(root,port){const server=http.createServer((req,res)=>{const file=safeFile(root,req.url);if(!file||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return;}res.setHeader('content-type',MIME[path.extname(file).toLowerCase()]||'application/octet-stream');fs.createReadStream(file).pipe(res);});return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server));});}

function sourceFootprint(source){
  const indexFile=path.join(source,'index.html'),html=fs.readFileSync(indexFile,'utf8');
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(x=>String(x[1]||''));
  const totalBytes=Buffer.byteLength(html,'utf8'),scriptBytes=scripts.reduce((sum,text)=>sum+Buffer.byteLength(text,'utf8'),0);
  const mechanicIds=[...new Set([...html.matchAll(/data-mechanic-id=["']([^"']+)["']/gi)].map(x=>clean(x[1])).filter(Boolean))];
  const systemCount=Number(html.match(/data-gameplay-system-count=["'](\d+)["']/i)?.[1]||0);
  const implementationUnit=clean(html.match(/data-implementation-unit=["']([^"']+)["']/i)?.[1]);
  const realArtifact=/data-web-artifact-type=["']REAL_PLAYABLE_GAME["']/i.test(html);
  const stageButtons=/<button\b[^>]*data-session-stage=/i.test(html);
  const sessionStageMarkers=(html.match(/data-session-stage=["']/gi)||[]).length;
  const proxyMarkers=(html.match(/scope-control-|FULL APPROVED WEB COMPANION|승인 분량 전체 구현/gi)||[]).length;
  const blockers=[];
  if(mechanicIds.length<MIN_MECHANICS)blockers.push(`SOURCE_MECHANICS_TOO_FEW:${mechanicIds.length}:${MIN_MECHANICS}`);
  if(systemCount<MIN_MECHANICS)blockers.push(`SOURCE_SYSTEM_COUNT_TOO_LOW:${systemCount}:${MIN_MECHANICS}`);
  if(!realArtifact)blockers.push('REAL_PLAYABLE_GAME_MARKER_REQUIRED');
  if(implementationUnit!==INITIAL_IMPLEMENTATION_UNIT)blockers.push('COMPLETE_PLAYABLE_CYCLE_IMPLEMENTATION_UNIT_REQUIRED');
  if(stageButtons)blockers.push('SESSION_STAGE_TEST_BUTTON_FORBIDDEN');
  if(proxyMarkers>0)blockers.push(`GENERIC_PROXY_MARKERS_FORBIDDEN:${proxyMarkers}`);
  return{pass:blockers.length===0,implementationClass:'DEDICATED',html,totalBytes,scriptBytes,mechanicIds,mechanicCount:mechanicIds.length,systemCount,implementationUnit,realArtifact,stageButtons,sessionStageMarkers,proxyMarkers,blockers};
}

async function snapshot(page){
  return page.evaluate(()=>{
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0;};
    const text=(document.body?.innerText||'').replace(/\s+/g,' ').trim().slice(0,6000);
    const canvases=[...document.querySelectorAll('canvas')].filter(visible).map(canvas=>{const r=canvas.getBoundingClientRect();let sig='';try{sig=canvas.toDataURL().slice(-180);}catch{sig='TAINTED';}return{sig:`${canvas.width}x${canvas.height}:${sig}`,area:r.width*r.height};});
    const boardSurfaces=[...document.querySelectorAll('.board,[data-gameplay-surface]')].filter(visible).map(el=>{const r=el.getBoundingClientRect();return r.width*r.height;});
    const dataState=[...document.querySelectorAll('[data-state],[data-score],[data-resource],[data-progress],[data-run-result]')].map(el=>({tag:el.tagName,text:(el.textContent||'').trim().slice(0,240),attrs:[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])}));
    const scopeRoot=document.querySelector('[data-approved-scope-count]'),scopeControls=[...document.querySelectorAll('[data-scope-id]')].filter(visible),functional=[...document.querySelectorAll('[data-mechanic-id]')].filter(visible);
    const audioState=(document.querySelector('[data-audio-state]')?.getAttribute('data-audio-state')||document.body?.getAttribute('data-audio-state')||'').toLowerCase();
    const runNode=document.querySelector('[data-run-result]');
    const viewportArea=Math.max(1,innerWidth*innerHeight),surfaceArea=Math.max(0,...canvases.map(x=>x.area),...boardSurfaces);
    return{text,canvasSignatures:canvases.map(x=>x.sig),dataState,visibleButtons:[...document.querySelectorAll('button,[role="button"]')].filter(visible).length,audioState,muteControls:[...document.querySelectorAll('[data-audio-control="mute"]')].filter(visible).length,volumeControls:[...document.querySelectorAll('[data-audio-control="volume"]')].filter(visible).length,approvedScopeCount:Number(scopeRoot?.getAttribute('data-approved-scope-count')||0),visibleScopeIds:scopeControls.map(el=>el.getAttribute('data-scope-id')).filter(Boolean),scopeMechanicBindings:scopeControls.map(el=>el.getAttribute('data-mechanic-id')).filter(Boolean),functionalMechanicBindings:functional.map(el=>el.getAttribute('data-mechanic-id')).filter(Boolean),runResult:runNode?.getAttribute('data-run-result')||document.body?.getAttribute('data-run-result')||'',realArtifact:Boolean(document.querySelector('[data-web-artifact-type="REAL_PLAYABLE_GAME"]')),implementationUnit:document.querySelector('[data-implementation-unit]')?.getAttribute('data-implementation-unit')||'',gameplaySurfaceRatio:Math.min(1,surfaceArea/viewportArea),visibleSessionTestUi:[...document.querySelectorAll('[data-session-stage]')].filter(visible).length,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
  });
}
function gameplaySignature(view){return JSON.stringify({canvas:view?.canvasSignatures||[],dataState:view?.dataState||[],runResult:view?.runResult||'',text:String(view?.text||'').slice(0,2500)});}
function gameplayStateChanged(before,after){return gameplaySignature(before)!==gameplaySignature(after);}

function choosePocketAction(view){const text=String(view?.text||'');const number=id=>{const m=text.match(new RegExp(`${id}\\s*(\\d+)`,'i'));return Number(m?.[1]||0);};const heat=number('heat'),ore=number('ore'),ingot=number('ingot'),coins=number('coins');if(heat>=68)return'#coolFactory';if(coins<15){if(ingot>=1)return'#sellIngot';if(ore>=4)return'#smeltOre';return'#mineOre';}return'#upgradeFactory';}
async function clickTarget(page,selector,index=0){const targets=page.locator(selector),count=await targets.count();if(!count)return{clicked:false,scopeId:null,mechanicId:null,before:null,after:null};const target=targets.nth(Math.abs(Number(index)||0)%count),before=await snapshot(page),scopeId=clean(await target.getAttribute('data-scope-id')),mechanicId=clean(await target.getAttribute('data-mechanic-id'));try{await target.click({timeout:2500});await page.waitForTimeout(55);}catch{return{clicked:false,scopeId,mechanicId,before,after:await snapshot(page)}}const after=await snapshot(page);return{clicked:true,scopeId,mechanicId,before,after};}

function buildContentDepthValidation(metrics,score){
  const raw=5+Math.min(12,Number(metrics.uniqueFunctionalUiCount||0)*2)+Math.min(10,Number(metrics.uniqueInteractedMechanics||0)*2)+Math.min(10,Number(metrics.meaningfulStateTransitions||0))+Math.min(8,Math.floor(Number(score.categoryScore||0)/4));
  const pass=score.qualification?.pass===true&&Number(metrics.uniqueFunctionalUiCount)>=5&&Number(metrics.uniqueInteractedMechanics)>=4&&Number(metrics.uniqueStateCount)>=8&&Number(metrics.meaningfulStateTransitions)>=7&&Number(score.categoryScore)>=20&&metrics.testUiRatio===0&&raw>=FINAL_CONTENT_DEPTH_MINUTES;
  return{pass,validationMode:'STRUCTURAL_REAL_GAME_CONTENT_DEPTH',targetMinutes:FINAL_CONTENT_DEPTH_MINUTES,estimatedPlayableMinutes:pass?Math.max(FINAL_CONTENT_DEPTH_MINUTES,raw):Math.min(29,raw),uniqueFunctionalUiCount:metrics.uniqueFunctionalUiCount,uniqueInteractedMechanics:metrics.uniqueInteractedMechanics,uniqueStateCount:metrics.uniqueStateCount,meaningfulStateTransitions:metrics.meaningfulStateTransitions,categoryScore:score.categoryScore,testUiFree:metrics.testUiRatio===0,directTimeStageProofUsed:false};
}
function writeStrictReview({gameId,output,score,contentDepth,runtimePass,scopePass,mobilePass}){
  const hard=[];
  if(score.qualification?.pass!==true||!scopePass)hard.push('IMPLEMENTATION_INCOMPLETE');
  if(Number(score.categoryScore)<20)hard.push('CATEGORY_MISMATCH');
  if(!contentDepth.pass)hard.push('30MIN_CONTENT_FAIL');
  if(!runtimePass)hard.push('QA_EVIDENCE_MISSING');
  if(!mobilePass)hard.push('TARGET_PLATFORM_UX_FAIL');
  const total=Number(score.totalScore||0),hardFailures=[...new Set(hard)],verdict=hardFailures.length||total<FORMAL_IMPLEMENTATION_THRESHOLD?(total<65?'REBUILD':'REVISE'):'PASS';
  const review={version:4,gameId,reviewStage:'WEB_IMPLEMENTATION_STRICT_REVIEW',scoreScale:100,passThreshold:FORMAL_IMPLEMENTATION_THRESHOLD,homepageTestThreshold:HOMEPAGE_TEST_THRESHOLD,totalScore:total,commonScore:score.commonScore,categoryScore:score.categoryScore,categoryFamily:score.categoryFamily,scores:{...score.common,...score.category},weightsMode:'COMMON_60_PLUS_CATEGORY_40',improvementTargets:score.improvementTargets||[],hardFailures,verdict,evidence:{realGameQualification:score.qualification,contentDepthValidation:contentDepth},policyDocument:'COMPANY_FLOW.md',reviewedAt:new Date().toISOString()};
  const strictOutput=path.join(path.dirname(output),'strict-implementation-review.json');fs.writeFileSync(strictOutput,JSON.stringify(review,null,2)+'\n');return{strictOutput,review,homepagePass:runtimePass&&scopePass&&contentDepth.pass&&total>=HOMEPAGE_TEST_THRESHOLD&&hardFailures.length===0,formalPass:runtimePass&&scopePass&&contentDepth.pass&&total>=FORMAL_IMPLEMENTATION_THRESHOLD&&hardFailures.length===0};
}

export async function runGameplayValidation({gameId,sourcePath,port=4181,output='',screenshot='',promotionRevalidationConfirmed=false}={}){
  const source=posix(sourcePath);if(!gameId)throw new Error('gameId required');if(!source.startsWith('web-games/'))throw new Error(`invalid source path:${source}`);if(!fs.existsSync(source))throw new Error(`source path missing:${source}`);
  const footprint=sourceFootprint(source);if(!footprint.pass)throw new Error(`REAL_GAME_FOOTPRINT_FAILED:${footprint.blockers.join('|')}`);
  const baselinePath=clean(process.env.DESIGN_BASELINE_SOURCE),baseline=readJson(baselinePath,{}),category=categoryFromBaseline(baseline),sourceIndexSha256=sha256File(path.join(source,'index.html')),designBaselineSha256=sha256File(baselinePath);
  const {chromium}=await import('playwright'),server=await startServer(process.cwd(),Number(port)),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const consoleErrors=[],pageErrors=[],failedRequests=[],badResponses=[];page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(clean(msg.text()).slice(0,500));});page.on('pageerror',e=>pageErrors.push(clean(e.message).slice(0,500)));page.on('requestfailed',r=>{if(r.url().startsWith(`http://127.0.0.1:${port}`))failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText||''}`.slice(0,700));});page.on('response',r=>{if(r.url().startsWith(`http://127.0.0.1:${port}`)&&r.status()>=400)badResponses.push(`${r.status()} ${r.url()}`.slice(0,700));});
  try{
    const url=`http://127.0.0.1:${port}/${source}/`;await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(350);
    const before=await snapshot(page),stateSet=new Set([gameplaySignature(before)]),interactedScopeIds=[],interactedMechanics=new Set(),scopeInteractionResults=[];let interactionCount=0,attemptCount=0;
    for(let step=0;step<120;step++){
      const current=await snapshot(page);if(['victory','defeat'].includes(clean(current.runResult).toLowerCase()))break;
      const pocket=Boolean(await page.locator('#mineOre').count());let selector=pocket?choosePocketAction(current):'button[data-gameplay-action]:not([disabled]),button[data-scope-id]:not([disabled]),[role="button"][data-scope-id]';
      if(!pocket&&await page.locator(selector).count()===0)selector='button:not([data-audio-control]):not(.save):not(.reset):not([disabled])';
      attemptCount++;const result=await clickTarget(page,selector,pocket?0:step);if(!result.clicked)continue;interactionCount++;
      const changed=gameplayStateChanged(result.before,result.after);if(changed)stateSet.add(gameplaySignature(result.after));
      const mech=result.mechanicId||result.scopeId;if(mech&&changed)interactedMechanics.add(mech);
      if(result.scopeId&&changed&&!interactedScopeIds.includes(result.scopeId)){interactedScopeIds.push(result.scopeId);scopeInteractionResults.push({scopeId:result.scopeId,mechanicId:result.mechanicId,clicked:true,stateChanged:true});}
    }
    for(const scopeId of before.visibleScopeIds||[]){if(interactedScopeIds.includes(scopeId))continue;attemptCount++;const result=await clickTarget(page,`button[data-scope-id="${scopeId}"],[role="button"][data-scope-id="${scopeId}"]`);if(result.clicked){interactionCount++;const changed=gameplayStateChanged(result.before,result.after);if(changed){stateSet.add(gameplaySignature(result.after));interactedScopeIds.push(scopeId);if(result.mechanicId)interactedMechanics.add(result.mechanicId);scopeInteractionResults.push({scopeId,mechanicId:result.mechanicId,clicked:true,stateChanged:true});}}}
    const after=await snapshot(page),terminalReached=['victory','defeat'].includes(clean(after.runResult).toLowerCase()),scopeCoverage=runtimeApprovedScopeCoverage({declaredCount:before.approvedScopeCount,visibleScopeIds:before.visibleScopeIds,interactedScopeIds,mechanicBindings:before.scopeMechanicBindings});
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(220);const reloadVisible=await page.evaluate(()=>Boolean(document.body&&document.body.getBoundingClientRect().width>0&&document.body.getBoundingClientRect().height>0));
    const runtimeStable=consoleErrors.length===0&&pageErrors.length===0&&failedRequests.length===0&&badResponses.length===0&&reloadVisible,mobilePlayable=Number(after.scrollWidth||0)<=Number(after.viewportWidth||0)+2&&Number(before.visibleButtons||0)>=3;
    const startsAfterGesture=!['running','playing'].includes(clean(before.audioState).toLowerCase())&&['running','playing','muted'].includes(clean(after.audioState).toLowerCase()),musicRuntime={required:true,startsAfterUserGesture:startsAfterGesture,muteControl:Number(before.muteControls||0)>0,volumeControl:Number(before.volumeControls||0)>0,beforeState:before.audioState||null,afterState:after.audioState||null,pass:startsAfterGesture&&Number(before.muteControls||0)>0&&Number(before.volumeControls||0)>0};
    const visibleBindings=before.functionalMechanicBindings||[],uniqueFunctional=new Set(visibleBindings),duplicateActionRatio=visibleBindings.length?1-(uniqueFunctional.size/visibleBindings.length):1,testUiRatio=(Number(before.visibleSessionTestUi||0)>0||footprint.stageButtons||footprint.proxyMarkers>0)?1:0;
    const winLossImplemented=/(victory|목표 달성|달성!|선승)/i.test(footprint.html)&&/(defeat|shutdown|가동 중단|쓰러졌다|파괴됐다|패배)/i.test(footprint.html);
    const metrics={realArtifact:before.realArtifact&&footprint.realArtifact,terminalReached,meaningfulStateTransitions:Math.max(0,stateSet.size-1),uniqueInteractedMechanics:interactedMechanics.size,interactionCount,stateChanged:gameplayStateChanged(before,after),gameplaySurfaceRatio:Number(before.gameplaySurfaceRatio||0),gameplaySurfacePresent:Number(before.gameplaySurfaceRatio||0)>0,uniqueStateCount:stateSet.size,winLossImplemented,testUiRatio,directSessionControls:footprint.stageButtons?1:0,proxyMarkers:footprint.proxyMarkers,duplicateActionRatio,mobilePlayable,runtimeStable,interactionSuccessRatio:attemptCount?interactionCount/attemptCount:0,uniqueFunctionalUiCount:uniqueFunctional.size,visualFeedback:gameplayStateChanged(before,after),audioFeedback:musicRuntime.pass,mechanicIds:footprint.mechanicIds,interactedMechanicIds:[...interactedMechanics]};
    const score=scoreRealWebGame({category,sourceText:footprint.html,metrics}),contentDepthValidation=buildContentDepthValidation(metrics,score),qualification=score.qualification;
    const pass=qualification.pass===true&&scopeCoverage.pass===true&&musicRuntime.pass===true&&runtimeStable;
    const baseBlockers=[...(qualification.failures||[]).map(x=>`REAL_GAME:${x}`),...(scopeCoverage.pass?[]:(scopeCoverage.blockers||[]).map(x=>`SCOPE:${x}`)),...(musicRuntime.pass?[]:['MUSIC_RUNTIME_NOT_PASS']),...(runtimeStable?[]:['RUNTIME_STABILITY_NOT_PASS'])];
    const report={version:VALIDATION_SCHEMA_VERSION,validationSchemaVersion:VALIDATION_SCHEMA_VERSION,gameId,target:'web',status:pass?'PASS':'FAIL',pass,validated:pass,realEvidenceExists:true,gameplayInteractionPerformed:interactionCount>0,interactionCount,stateChanged:metrics.stateChanged,musicRuntime,approvedScopeFullyImplemented:scopeCoverage.pass,scopeCoverage,scopeInteractionResults,runtimeSmokePassed:runtimeStable,mobileViewport:{width:390,height:844,touch:true},sourceFootprint:footprint,substanceGate:{pass:qualification.pass===true,implementationClass:'DEDICATED',mechanicCount:footprint.mechanicCount,directSessionControls:footprint.stageButtons?1:0,proxyMarkers:footprint.proxyMarkers},realGameQualification:qualification,webImplementationScore:score,contentDepthValidation,sessionDepthMinutes:contentDepthValidation.estimatedPlayableMinutes,terminalOutcome:{required:true,reached:terminalReached,result:after.runResult||null},multiplayer:null,before,after,reloadVisible,blockers:baseBlockers,consoleErrors,pageErrors,failedRequests,badResponses,evidence:[`interactionCount=${interactionCount}`,`uniqueFunctionalUi=${metrics.uniqueFunctionalUiCount}`,`uniqueMechanics=${metrics.uniqueInteractedMechanics}`,`uniqueStates=${metrics.uniqueStateCount}`,`stateTransitions=${metrics.meaningfulStateTransitions}`,`category=${score.categoryFamily}`,`commonScore=${score.commonScore}`,`categoryScore=${score.categoryScore}`,`contentDepth=${contentDepthValidation.estimatedPlayableMinutes}`,`terminalOutcome=${after.runResult||'none'}`],checkedAt:new Date().toISOString(),sourcePath:source,sourceIndexSha256,sourceRevision:clean(process.env.GITHUB_SHA)||null,designBaselineSha256,url};
    if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
    const strict=writeStrictReview({gameId,output,score,contentDepth:contentDepthValidation,runtimePass:pass,scopePass:scopeCoverage.pass,mobilePass:mobilePlayable});
    report.strictReviewPath=strict.strictOutput;report.strictReview={verdict:strict.review.verdict,totalScore:strict.review.totalScore,commonScore:strict.review.commonScore,categoryScore:strict.review.categoryScore,categoryFamily:strict.review.categoryFamily,hardFailures:strict.review.hardFailures,improvementTargets:strict.review.improvementTargets,reviewedAt:strict.review.reviewedAt,formalPassThreshold:FORMAL_IMPLEMENTATION_THRESHOLD,homepageTestThreshold:HOMEPAGE_TEST_THRESHOLD};report.webStrictScore=strict.review.totalScore;report.improvementTargets=strict.review.improvementTargets;report.homepageTestEligible=strict.homepagePass;report.homepageTestVerdict=strict.homepagePass?'PASS':'REVISE';report.formalReviewPassed=strict.formalPass;report.formalImplementationPassed=strict.formalPass&&promotionRevalidationConfirmed;report.formalImplementationVerdict=report.formalImplementationPassed?'PASS':'REVISE';
    if(screenshot){fs.mkdirSync(path.dirname(screenshot),{recursive:true});await page.screenshot({path:screenshot,fullPage:true});report.screenshot=screenshot;}if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));if(!report.pass)throw new Error(`WEB_GAMEPLAY_VALIDATION_FAILED:${report.blockers.join(' | ').slice(0,1800)}`);
    console.log(`WEB_STRICT_REVIEW_SCORE=${report.webStrictScore}`);console.log(`WEB_COMMON_SCORE=${score.commonScore}`);console.log(`WEB_CATEGORY_SCORE=${score.categoryScore}`);console.log(`WEB_CATEGORY_FAMILY=${score.categoryFamily}`);console.log(`WEB_COMPLETE_PLAYABLE_CYCLE=${qualification.gates?.COMPLETE_CYCLE?'PASS':'FAIL'}`);console.log(`WEB_FINAL_30MIN_CONTENT_DEPTH=${contentDepthValidation.pass?'PASS':'FAIL'}`);console.log(`WEB_FINAL_30MIN_ESTIMATED_MINUTES=${contentDepthValidation.estimatedPlayableMinutes}`);console.log(`HOMEPAGE_TEST_ELIGIBLE=${strict.homepagePass?'YES':'NO'}`);console.log(`FORMAL_IMPLEMENTATION_PASS=${report.formalImplementationPassed?'YES':'NO'}`);return report;
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}

async function main(){
  const gameId=arg('game-id'),sourcePath=arg('source'),port=Number(arg('port','4181')),output=arg('output'),screenshot=arg('screenshot');
  const first=await runGameplayValidation({gameId,sourcePath,port,output,screenshot,promotionRevalidationConfirmed:false}),score=Number(first.strictReview?.totalScore),hard=Array.isArray(first.strictReview?.hardFailures)?first.strictReview.hardFailures:[];
  if(first.formalReviewPassed===true&&Number.isFinite(score)&&score>=FORMAL_IMPLEMENTATION_THRESHOLD&&hard.length===0){
    const secondaryOutput=output?path.join(path.dirname(output),'web-promotion-revalidation.json'):'';let second=null,revalidationError=null;
    try{second=await runGameplayValidation({gameId,sourcePath,port:port+1,output:secondaryOutput,screenshot:'',promotionRevalidationConfirmed:true});}catch(error){revalidationError=clean(error?.message||error).slice(0,500);second=secondaryOutput?readJson(secondaryOutput,null):null;}
    const secondScore=Number(second?.strictReview?.totalScore),secondHard=Array.isArray(second?.strictReview?.hardFailures)?second.strictReview.hardFailures:[],sourceHashMatch=Boolean(first.sourceIndexSha256&&second?.sourceIndexSha256&&first.sourceIndexSha256===second.sourceIndexSha256),baselineHashMatch=first.designBaselineSha256===second?.designBaselineSha256,secondSubstancePass=second?.substanceGate?.pass===true,secondContentDepthPass=second?.contentDepthValidation?.pass===true;
    const promotionPass=second?.pass===true&&second?.formalReviewPassed===true&&Number.isFinite(secondScore)&&secondScore>=FORMAL_IMPLEMENTATION_THRESHOLD&&secondHard.length===0&&secondSubstancePass&&secondContentDepthPass&&second?.terminalOutcome?.reached===true&&sourceHashMatch&&baselineHashMatch;
    first.promotionRevalidation={required:true,independentRun:true,pass:promotionPass,minimumScore:FORMAL_IMPLEMENTATION_THRESHOLD,firstScore:score,secondScore:Number.isFinite(secondScore)?secondScore:null,sourceHashMatch,baselineHashMatch,secondCheckedAt:second?.checkedAt||null,secondSubstancePass,secondContentDepthPass,secondTerminalReached:second?.terminalOutcome?.reached===true,error:revalidationError};first.formalImplementationPassed=promotionPass;first.formalImplementationVerdict=promotionPass?'PASS':'REVISE';if(output)fs.writeFileSync(output,JSON.stringify(first,null,2)+'\n');console.log(`WEB_PROMOTION_REVALIDATION=${promotionPass?'PASS':'FAIL'}`);
  }else{first.promotionRevalidation={required:false,independentRun:false,pass:false,minimumScore:FORMAL_IMPLEMENTATION_THRESHOLD,reason:'WEB_SCORE_BELOW_90_OR_HARD_GATE'};first.formalImplementationPassed=false;first.formalImplementationVerdict='REVISE';if(output)fs.writeFileSync(output,JSON.stringify(first,null,2)+'\n');console.log('WEB_PROMOTION_REVALIDATION=NOT_REQUIRED_BELOW_90');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
