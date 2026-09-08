// 검증이 끝난 뒤 기존 10장 핵심 아트북에 Vibe2 1차 스토리 초안 페이지를 더해 12~30장으로 조립한다.
// 후처리는 새 설정을 만들지 않고 Vibe2 초안과 실제 부서/총괄 제출물만 사용한다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
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

const base=path.join('artbook-submissions',gameId,date),artbookFile=path.join(base,'artbook.json'),artbook=readJson(artbookFile,null),workOrderPath=`artbook-work-orders/${date}-${gameId}.json`,workOrder=readJson(workOrderPath,{});
if(!artbook)throw new Error(`artbook missing: ${artbookFile}`);
const configuredTarget=Math.round(Number(workOrder.pagePolicy?.target||workOrder.presentation?.exactPages||10));
const targetPages=configuredTarget===10?10:Math.max(12,Math.min(30,configuredTarget||16));
const variableMode=targetPages>10;

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
    return{kind:role,title,body,image,sourceDepartment:role,pageType:'employee-visual',visualType:clean(p.visualType),employeeAuthored:true,vibe2Authored:false,assistantAuthored:false,displayLanguage:'ko'};
  });
}
const directorFile=path.join(base,'presentation','director-presentation.json'),director=readJson(directorFile,null);
if(!director||director.status!=='READY'||director.mode!=='VISUAL_FIRST_EMPLOYEE_AUTHORED'||director.runner?.assistantAuthored!==false||director.newClaimsAdded!==false)throw new Error('director employee presentation missing');
for(const key of ['cover','summary']){const p=director[key];if(!p||p.employeeAuthored!==true||!clean(p.image)||!fs.existsSync(p.image))throw new Error(`director ${key} page invalid`);}

let vibePages=[];
let vibeDraftPath=clean(workOrder.vibe2FirstDraftPath||path.join(base,'vibe2-first-draft.json'));
if(variableMode){
  const draft=readJson(vibeDraftPath,null),spine=draft?.storySpine||{},expectedVibePages=targetPages-10;
  if(!draft||String(draft.status||'')!=='FIRST_DRAFT_READY'||draft.proposalOnly!==true)throw new Error('Vibe2 first draft missing or not proposal-only');
  if(!['opening','early','mid','late','finalBoss','ending'].every(k=>clean(spine[k])))throw new Error('Vibe2 first draft must cover opening/early/mid/late/finalBoss/ending');
  if(!Array.isArray(draft.visualPages)||draft.visualPages.length!==expectedVibePages)throw new Error(`Vibe2 draft pages expected ${expectedVibePages}, got ${draft.visualPages?.length||0}`);
  vibePages=draft.visualPages.map((p,i)=>{
    const image=clean(p.image);if(!image||!fs.existsSync(image))throw new Error(`Vibe2 draft page ${i+1} image missing`);
    const title=clip(p.title,28),body=clip(p.body,90);if(!title||!body)throw new Error(`Vibe2 draft page ${i+1} text missing`);
    return{kind:'vibe2',title,body,image,sourceDepartment:'vibe2',pageType:'vibe2-first-draft',visualType:'story-draft',employeeAuthored:false,vibe2Authored:true,assistantAuthored:false,proposal:true,displayLanguage:'ko'};
  });
}

const cuts=[];
const push=(p,role,pageType,visualType='')=>cuts.push({no:cuts.length+1,kind:role,title:clip(p.title,28),body:clip(p.body||p.caption||p.tagline||p.closing||'',90),image:clean(p.image),sourceDepartment:role,pageType,visualType,employeeAuthored:p.employeeAuthored!==false,vibe2Authored:p.vibe2Authored===true,assistantAuthored:false,proposal:p.proposal===true,displayLanguage:'ko'});
push(director.cover,'director','cover','game-concept-cover');
for(const p of vibePages)push(p,'vibe2','vibe2-first-draft','story-draft');
for(const p of departmentPages.planning)push(p,'planning','department-visual',p.visualType);
for(const p of departmentPages.graphics)push(p,'graphics','department-visual',p.visualType);
for(const p of departmentPages.development)push(p,'development','department-visual',p.visualType);
for(const p of departmentPages.qa)push(p,'qa','department-visual',p.visualType);
for(const p of departmentPages.balance)push(p,'balance','department-visual',p.visualType);
push({...director.summary,caption:director.summary.closing},'director','summary','department-summary');

if(cuts.length!==targetPages)throw new Error(`artbook target page mismatch: expected ${targetPages}, got ${cuts.length}`);
if(variableMode&&(cuts.length<12||cuts.length>30))throw new Error(`variable artbook must be 12..30 pages, got ${cuts.length}`);
const expectedOrder=['director',...Array(vibePages.length).fill('vibe2'),'planning','planning','graphics','graphics','development','development','qa','balance','director'];
if(cuts.some((c,i)=>c.sourceDepartment!==expectedOrder[i]))throw new Error('artbook page order mismatch');
const perDepartment=Object.fromEntries([...ROLES,'director','vibe2'].map(r=>[r,cuts.filter(c=>c.sourceDepartment===r).length]));
for(const [role,count] of Object.entries(EXPECTED))if(perDepartment[role]!==count)throw new Error(`${role}: expected ${count}, got ${perDepartment[role]}`);
if(variableMode&&perDepartment.vibe2!==targetPages-10)throw new Error('Vibe2 draft page count mismatch');
if(cuts.some(c=>!c.title||!c.body||!c.image||!fs.existsSync(c.image)))throw new Error('empty title/body/image in completed artbook');
const duplicateVisuals=cuts.length-new Set(cuts.map(c=>c.image)).size;if(duplicateVisuals>0)throw new Error(`visual pages must be unique: duplicates=${duplicateVisuals}`);

const sourceMode=variableMode?'VIBE2_FIRST_DRAFT_PLUS_EMPLOYEE_OWNED_VISUAL_PAGES_PLUS_DIRECTOR_PRESENTATION':'EMPLOYEE_OWNED_VISUAL_PAGES_PLUS_DIRECTOR_PRESENTATION';
const presentationMode=variableMode?'VIBE2_FIRST_DRAFT_PLUS_EMPLOYEE_AUTHORED':'VISUAL_FIRST_EMPLOYEE_AUTHORED';
const pagePlan=cuts.map(c=>c.sourceDepartment==='vibe2'?`Vibe2:${c.title}`:c.sourceDepartment);
const postprocess={version:5,complete:true,checkedAt:new Date().toISOString(),requiredCuts:targetPages,cutCount:targetPages,pagePolicy:{min:12,default:16,max:30,target:targetPages,legacyTenPageCompatible:true},pagePlan,cutsPerDepartment:perDepartment,formatChecked:true,emptyContentChecked:true,uniqueVisualsChecked:true,imagePathsChecked:true,newClaimsAdded:false,sourceMode,assistantAuthorship:false,vibe2DraftAuthorship:variableMode,imageFirst:true,shortText:true,displayLanguage:'ko'};
artbook.version=Math.max(9,Number(artbook.version)||0);artbook.status='COMPLETED';artbook.cuts=cuts;artbook.vibe2FirstDraft=variableMode?{sourceFile:vibeDraftPath,status:'FIRST_DRAFT_READY',proposalOnly:true,pageCount:vibePages.length}:null;artbook.presentation={mode:presentationMode,directorSource:directorFile,departmentPageCounts:Object.fromEntries(ROLES.map(r=>[r,EXPECTED[r]])),vibe2DraftPages:vibePages.length,employeeAuthoredPages:10,assistantAuthored:false};artbook.postprocess=postprocess;artbook.publication={...(artbook.publication||{}),displayReady:true,requiredCuts:targetPages,exactCutCountRequired:true,minCuts:variableMode?12:10,maxCuts:30,postprocessRequired:true,postprocessComplete:true,homepageMode:'compact-card-detail-viewer'};
writeJson(artbookFile,artbook);

const expectedId=`${gameId}-${date}-${String(artbook.workMode||'INITIAL').toUpperCase()==='SECOND_WORK'?'second':'initial'}`;
const registered=(registry.artbooks||[]).find(x=>x.id===expectedId)||(registry.artbooks||[]).find(x=>x.sourceFile===artbookFile)||(registry.artbooks||[]).filter(x=>x.gameId===gameId&&x.createdAt===date).sort((a,b)=>(b.edition||0)-(a.edition||0))[0];
if(!registered)throw new Error('registered artbook missing');
registered.status='completed-artbook';registered.published=true;registered.homepageVisible=true;registered.cuts=cuts;registered.cutCount=targetPages;registered.requiredCuts=targetPages;registered.completionLabel='완료';registered.presentation=artbook.presentation;registered.postprocess=postprocess;registered.vibe2FirstDraft=artbook.vibe2FirstDraft;
for(const daily of registry.dailySubmissions||[])if(daily.gameId===gameId&&daily.date===date){daily.status='completed-artbook';daily.cutCount=targetPages;daily.postprocessComplete=true;daily.visualFirst=true;daily.artbookId=registered.id;}
registry.version=Math.max(12,Number(registry.version)||0);registry.updatedAt=date;writeJson('game-artbooks.json',registry);
writeJson('artbook-gate-status.json',{...gate,checkedAt:new Date().toISOString(),postprocessComplete:true,postprocessChecks:postprocess,cutCount:targetPages,requiredCuts:targetPages,homepagePublished:true,completedArtbook:true,visualFirst:true,employeeAuthoredPages:10,vibe2DraftPages:vibePages.length,assistantAuthoredPages:0,formalProductionGate:'ARTBOOK_COMPLETED_AWAITING_OWNER_PRODUCTION_DECISION'});
console.log('ARTBOOK_POSTPROCESS=PASS');console.log(`ARTBOOK_CUTS=${targetPages}/${targetPages}`);console.log(`ARTBOOK_PAGE_RANGE=${variableMode?'12-30':'LEGACY-10'}`);console.log(`VIBE2_DRAFT_PAGES=${vibePages.length}`);console.log('ARTBOOK_EMPLOYEE_AUTHORED=10');console.log('ASSISTANT_AUTHORSHIP=0');console.log(`ARTBOOK_REGISTERED_ID=${registered.id}`);console.log('ARTBOOK_COMPLETED=YES');console.log('HOMEPAGE_MODE=COMPACT_CARD_DETAIL_VIEWER');
