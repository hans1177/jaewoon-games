// Public homepage game health + generic smoke-play monitor.
// Never mutates web-games/. It records evidence only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file)==='.'?'.':path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').trim();
const hash=v=>crypto.createHash('sha1').update(clean(v)).digest('hex').slice(0,16);
const now=new Date().toISOString();
const runId=clean(process.env.GITHUB_RUN_ID)||'local';
const base=(clean(process.env.PUBLIC_BASE_URL)||'http://127.0.0.1:4173').replace(/\/$/,'');
const catalog=readJson('game-catalog.json',{games:[]});
const scenarios=readJson('qa/public-game-scenarios.json',{});
const bugMemory=readJson('company-learning/bug-memory.json',{version:1,policy:{},bugs:[]});
bugMemory.bugs=Array.isArray(bugMemory.bugs)?bugMemory.bugs:[];
const artifactDir='qa-artifacts/public-game-health';
fs.mkdirSync(artifactDir,{recursive:true});

function addBug({gameId,type,message,severity='MEDIUM',url=''}){
  const normalized=clean(message).replace(/\d+/g,'#').slice(0,400);
  if(!normalized)return;
  const signature=`public-${gameId}-${type}-${hash(normalized)}`;
  let item=bugMemory.bugs.find(x=>x.signature===signature);
  const occurrence={checkedAt:now,runId,url};
  if(item){
    item.lastSeen=now.slice(0,10);
    item.occurrences=Array.isArray(item.occurrences)?item.occurrences:[];
    item.occurrences.push(occurrence);
    item.occurrences=item.occurrences.slice(-20);
    return;
  }
  bugMemory.bugs.push({
    id:signature,
    signature,
    scope:'public-game-runtime',
    gameId,
    severity,
    status:'open',
    symptom:normalized,
    firstSeen:now.slice(0,10),
    lastSeen:now.slice(0,10),
    occurrences:[occurrence],
    rootCause:null,
    fix:null,
    prevention:null,
    learningVerified:false,
    xpAwarded:false,
    notes:[`Detected by public game smoke-play monitor: ${type}`]
  });
}

const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const game of catalog.games||[]){
    if(!game?.id||!game?.webPath)continue;
    const context=await browser.newContext({viewport:scenarios?.policy?.mobileViewport||{width:360,height:800},ignoreHTTPSErrors:true});
    const page=await context.newPage();
    const errors=[];
    const failed=[];
    let clicked=false;
    page.on('pageerror',err=>errors.push({type:'pageerror',message:clean(err?.message||err)}));
    page.on('console',msg=>{if(msg.type()==='error')errors.push({type:'console',message:clean(msg.text())});});
    page.on('requestfailed',request=>failed.push({url:request.url(),message:clean(request.failure()?.errorText)}));
    const url=`${base}${game.webPath.startsWith('/')?'':'/'}${game.webPath}`;
    let loadOk=false,reloadOk=false,overflowOk=false,bodyOk=false,storageStatus='not-detected';
    try{
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
      loadOk=Boolean(response&&response.ok());
      bodyOk=(await page.locator('body').innerText({timeout:3000}).catch(()=>'' )).trim().length>0;
      overflowOk=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2).catch(()=>false);

      const startTexts=scenarios?.generic?.startButtonTexts||[];
      for(const text of startTexts){
        const button=page.getByRole('button',{name:new RegExp(text,'i')}).first();
        if(await button.count().catch(()=>0)){
          try{await button.click({timeout:800});clicked=true;break;}catch{}
        }
        const link=page.getByRole('link',{name:new RegExp(text,'i')}).first();
        if(await link.count().catch(()=>0)){
          try{await link.click({timeout:800});clicked=true;break;}catch{}
        }
      }
      for(const key of scenarios?.generic?.keys||[]){try{await page.keyboard.press(key,{delay:20});clicked=true;}catch{}}
      try{await page.mouse.click(180,400);clicked=true;}catch{}
      await page.waitForTimeout(500);
      const beforeKeys=await page.evaluate(()=>Object.keys(localStorage)).catch(()=>[]);
      const reload=await page.reload({waitUntil:'domcontentloaded',timeout:20000}).catch(()=>null);
      reloadOk=Boolean(reload&&reload.ok());
      const afterKeys=await page.evaluate(()=>Object.keys(localStorage)).catch(()=>[]);
      if(beforeKeys.length)storageStatus=beforeKeys.every(k=>afterKeys.includes(k))?'persisted':'lost';
      await page.screenshot({path:`${artifactDir}/${game.id}.png`,fullPage:true}).catch(()=>{});
    }catch(error){errors.push({type:'navigation',message:clean(error?.message||error)});}

    const sameOriginFailed=failed.filter(item=>{try{return new URL(item.url).origin===new URL(base).origin;}catch{return false;}});
    const uniqueErrors=[...new Map(errors.filter(x=>x.message).map(x=>[`${x.type}:${x.message}`,x])).values()].slice(0,20);
    const runtimeScore=loadOk&&bodyOk?25:loadOk?15:0;
    const errorScore=Math.max(0,25-(uniqueErrors.length*6));
    const mobileScore=overflowOk?15:0;
    const interactionScore=clicked?15:5;
    const assetScore=Math.max(0,10-(sameOriginFailed.length*3));
    const reloadScore=reloadOk?10:0;
    const score=Math.max(0,Math.min(100,runtimeScore+errorScore+mobileScore+interactionScore+assetScore+reloadScore));
    const status=score>=75?'healthy':score>=55?'warning':'critical';
    const dimensions={runtime:runtimeScore,errors:errorScore,mobile:mobileScore,interaction:interactionScore,assets:assetScore,reload:reloadScore,storage:storageStatus};
    const issues=[...uniqueErrors,...sameOriginFailed.map(x=>({type:'requestfailed',message:`${x.url} ${x.message}`}))].slice(0,20);
    for(const issue of issues)addBug({gameId:game.id,type:issue.type,message:issue.message,severity:issue.type==='pageerror'||issue.type==='navigation'?'HIGH':'MEDIUM',url});
    results.push({gameId:game.id,name:game.name,status,score,checkedAt:now,url,dimensions,issues,failedRequestCount:sameOriginFailed.length,screenshot:`${artifactDir}/${game.id}.png`});
    await context.close();
  }
}finally{await browser.close();}

const previous=readJson('public-game-health.json',{});
const buildById=new Map((previous.games||[]).map(x=>[x.gameId,x.buildHealth]));
const health={
  version:1,
  updatedAt:now,
  policy:{
    scope:'homepage-published-games',scoreRange:[0,100],criticalBelow:55,warningBelow:75,healthyAtLeast:75,
    webArchiveMutation:'forbidden',autoRollbackDisplay:true,rollbackRequiresVerifiedHealthyBaseline:true
  },
  games:results.map(item=>({...item,buildHealth:buildById.get(item.gameId)||null}))
};
bugMemory.updatedAt=now;
writeJson('public-game-health.json',health);
writeJson('company-learning/bug-memory.json',bugMemory);
writeJson(`${artifactDir}/summary.json`,health);
console.log(`PUBLIC_GAME_HEALTH_COUNT=${results.length}`);
console.log(`PUBLIC_GAME_CRITICAL=${results.filter(x=>x.status==='critical').length}`);
