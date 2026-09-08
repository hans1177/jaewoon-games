// 검증이 끝난 뒤 부서 AI 8장 + 총괄 AI 2장을 정확히 10장으로 조립한다. 후처리는 새 내용을 만들지 않는다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
const NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스',director:'총괄'};
const EXPECTED={planning:2,graphics:2,development:2,qa:1,balance:1,director:2};
const readJson=(f,v=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return v;}};
const writeJson=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,n)=>{const s=clean(v);return s.length>n?s.slice(0,n-1)+'…':s;};
const todayKst=()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;};

const gate=readJson('artbook-gate-status.json',{}),queue=readJson('artbook-submission-queue.json',{}),registry=readJson('game-artbooks.json',{artbooks:[],dailySubmissions:[]});
const gameId=clean(process.env.ARTBOOK_GAME_ID||gate.gameId||queue.currentDailyTarget),date=clean(process.env.ARTBOOK_DATE||gate.date||todayKst());
if(!gameId)throw new Error('ARTBOOK_GAME_ID missing');
if(gate.gameId!==gameId||gate.date!==date)throw new Error('postprocess gate target/date mismatch');
if(gate.readyForDirectorAssembly!==true||gate.collaborationComplete!==true||gate.directorReviewReady!==true||Number(gate.readyCount)!==5||Number(gate.reviewReadyCount)!==5||Number(gate.ratingsPerDepartment)!==5||gate.assembled!==true)throw new Error('postprocess requires verified departments and reviews');

const base=path.join('artbook-submissions',gameId,date),artbookFile=path.join(base,'artbook.json'),artbook=readJson(artbookFile,null);
if(!artbook)throw new Error(`artbook missing: ${artbookFile}`);
const departmentPages={};
for(const role of ROLES){
  const submission=readJson(path.join(base,`${role}.json`),null),presentation=submission?.presentation;
  if(!submission||String(submission.status||'').toUpperCase()!=='SUBMITTED')throw new Error(`${role}: submission missing`);
  if(!presentation||presentation.mode!=='VISUAL_FIRST_EMPLOYEE_AUTHORED'||presentation.generatedBy?.assistantAuthored!==false)throw new Error(`${role}: employee visual presentation missing`);
  if(!Array.isArray(presentation.pages)||presentation.pages.length!==EXPECTED[role])throw new Error(`${role}: expected ${EXPECTED[role]} employee pages`);
  departmentPages[role]=presentation.pages.map((p,i)=>{
    if(p.employeeAuthored!==true||p.sourceDepartment!==role)throw new Error(`${role}: page ${i+1} authorship invalid`);
    const image=clean(p.image);if(!image||!fs.existsSync(image))throw new Error(`${role}: page ${i+1} image missing`);
    const title=clip(p.title,28),body=clip(p.caption||p.focus,70);if(!title||!body)throw new Error(`${role}: page ${i+1} text missing`);
    return{kind:role,title,body,image,sourceDepartment:role,pageType:'employee-visual',visualType:clean(p.visualType),employeeAuthored:true,assistantAuthored:false,displayLanguage:'ko'};
  });
}
const directorFile=path.join(base,'presentation','director-presentation.json'),director=readJson(directorFile,null);
if(!director||director.status!=='READY'||director.mode!=='VISUAL_FIRST_EMPLOYEE_AUTHORED'||director.runner?.assistantAuthored!==false||director.newClaimsAdded!==false)throw new Error('director employee presentation missing');
for(const key of ['cover','summary']){const p=director[key];if(!p||p.employeeAuthored!==true||!clean(p.image)||!fs.existsSync(p.image))throw new Error(`director ${key} page invalid`);}

const cuts=[];
const push=(p,role,pageType,visualType='')=>cuts.push({no:cuts.length+1,kind:role,title:clip(p.title,28),body:clip(p.caption||p.tagline||p.closing||'',70),image:clean(p.image),sourceDepartment:role,pageType,visualType,employeeAuthored:true,assistantAuthored:false,displayLanguage:'ko'});
push(director.cover,'director','cover','game-concept-cover');
for(const p of departmentPages.planning)push(p,'planning','department-visual',p.visualType);
for(const p of departmentPages.graphics)push(p,'graphics','department-visual',p.visualType);
for(const p of departmentPages.development)push(p,'development','department-visual',p.visualType);
for(const p of departmentPages.qa)push(p,'qa','department-visual',p.visualType);
for(const p of departmentPages.balance)push(p,'balance','department-visual',p.visualType);
push({...director.summary,caption:director.summary.closing},'director','summary','department-summary');

if(cuts.length!==10)throw new Error(`artbook must be exactly 10 pages, got ${cuts.length}`);
const expectedOrder=['director','planning','planning','graphics','graphics','development','development','qa','balance','director'];
if(cuts.some((c,i)=>c.sourceDepartment!==expectedOrder[i]))throw new Error('10-page department order mismatch');
const perDepartment=Object.fromEntries([...ROLES,'director'].map(r=>[r,cuts.filter(c=>c.sourceDepartment===r).length]));
for(const [role,count] of Object.entries(EXPECTED))if(perDepartment[role]!==count)throw new Error(`${role}: expected ${count}, got ${perDepartment[role]}`);
if(cuts.some(c=>!c.title||!c.body||!c.image||!fs.existsSync(c.image)))throw new Error('empty title/body/image in completed artbook');
const duplicateVisuals=cuts.length-new Set(cuts.map(c=>c.image)).size;if(duplicateVisuals>0)throw new Error(`visual pages must be unique: duplicates=${duplicateVisuals}`);

const postprocess={version:3,complete:true,checkedAt:new Date().toISOString(),requiredCuts:10,cutCount:10,pagePlan:['표지','기획','기획','그래픽','그래픽','개발','개발','QA','밸런스','총괄'],cutsPerDepartment:perDepartment,formatChecked:true,emptyContentChecked:true,uniqueVisualsChecked:true,imagePathsChecked:true,newClaimsAdded:false,sourceMode:'EMPLOYEE_OWNED_VISUAL_PAGES_PLUS_DIRECTOR_PRESENTATION',assistantAuthorship:false,imageFirst:true,shortText:true,displayLanguage:'ko'};
artbook.version=Math.max(7,Number(artbook.version)||0);artbook.status='COMPLETED';artbook.cuts=cuts;artbook.presentation={mode:'VISUAL_FIRST_EMPLOYEE_AUTHORED',directorSource:directorFile,departmentPageCounts:Object.fromEntries(ROLES.map(r=>[r,EXPECTED[r]])),assistantAuthored:false};artbook.postprocess=postprocess;artbook.publication={...(artbook.publication||{}),displayReady:true,requiredCuts:10,exactCutCountRequired:true,postprocessRequired:true,postprocessComplete:true};
writeJson(artbookFile,artbook);

const registered=(registry.artbooks||[]).find(x=>x.sourceFile===artbookFile)||(registry.artbooks||[]).filter(x=>x.gameId===gameId&&x.createdAt===date).sort((a,b)=>(b.edition||0)-(a.edition||0))[0];
if(!registered)throw new Error('registered artbook missing');
registered.status='completed-artbook';registered.published=true;registered.homepageVisible=true;registered.cuts=cuts;registered.cutCount=10;registered.requiredCuts=10;registered.completionLabel='완료';registered.presentation=artbook.presentation;registered.postprocess=postprocess;
for(const daily of registry.dailySubmissions||[])if(daily.gameId===gameId&&daily.date===date){daily.status='completed-artbook';daily.cutCount=10;daily.postprocessComplete=true;daily.visualFirst=true;}
registry.version=Math.max(10,Number(registry.version)||0);registry.updatedAt=date;writeJson('game-artbooks.json',registry);
writeJson('artbook-gate-status.json',{...gate,checkedAt:new Date().toISOString(),postprocessComplete:true,postprocessChecks:postprocess,cutCount:10,requiredCuts:10,homepagePublished:true,completedArtbook:true,visualFirst:true,employeeAuthoredPages:10,assistantAuthoredPages:0,formalProductionGate:'ARTBOOK_COMPLETED_AWAITING_OWNER_PRODUCTION_DECISION'});
console.log('ARTBOOK_POSTPROCESS=PASS');console.log('ARTBOOK_CUTS=10/10');console.log('ARTBOOK_PAGE_PLAN=COVER,PLANNING2,GRAPHICS2,DEVELOPMENT2,QA1,BALANCE1,SUMMARY');console.log('ARTBOOK_EMPLOYEE_AUTHORED=10/10');console.log('ASSISTANT_AUTHORSHIP=0/10');console.log('ARTBOOK_COMPLETED=YES');console.log('HOMEPAGE_PUBLISHED=YES');
