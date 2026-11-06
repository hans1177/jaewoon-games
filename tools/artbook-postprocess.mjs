// 검증이 끝난 뒤 기존 10장 핵심 아트북에 Vibe2 1차 스토리 초안 페이지를 더해 12~30장으로 조립한다.
// 후처리는 새 설정을 만들지 않고 Vibe2 초안과 실제 부서/총괄 제출물만 사용한다.
// 살아있는 아트북은 이 단계가 통과될 때만 새 기준선으로 승격되며 이전 기준선은 이력으로 보존한다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
const EXPECTED={planning:2,graphics:2,development:2,qa:1,balance:1,director:2};
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const clip=(value,n)=>{const s=clean(value);return s.length>n?s.slice(0,n-1)+'…':s;};
const todayKst=()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;};

const gate=readJson('artbook-gate-status.json',{});
const queue=readJson('artbook-submission-queue.json',{});
const registry=readJson('game-artbooks.json',{artbooks:[],dailySubmissions:[],latestByGame:{}});
const revisionQueue=readJson('artbook-revision-queue.json',{tasks:[]});
const gameId=clean(process.env.ARTBOOK_GAME_ID||gate.gameId||queue.currentDailyTarget);
const date=clean(process.env.ARTBOOK_DATE||gate.date||todayKst());
if(!gameId)throw new Error('ARTBOOK_GAME_ID missing');
if(gate.gameId!==gameId||gate.date!==date)throw new Error('postprocess gate target/date mismatch');
if(gate.readyForDirectorAssembly!==true||gate.collaborationComplete!==true||gate.directorReviewReady!==true||Number(gate.readyCount)!==5||Number(gate.reviewReadyCount)!==5||Number(gate.ratingsPerDepartment)!==5||gate.assembled!==true)throw new Error('postprocess requires verified departments and reviews');

const base=path.join('artbook-submissions',gameId,date);
const artbookFile=path.join(base,'artbook.json');
const artbook=readJson(artbookFile,null);
const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`;
const workOrder=readJson(workOrderPath,{});
const workMode=clean(workOrder.mode||artbook?.workMode||'INITIAL').toUpperCase();
const lifecycleOrder=workOrder.lifecycle||artbook?.lifecycle||{};
if(!artbook)throw new Error(`artbook missing: ${artbookFile}`);
const configuredTarget=Math.round(Number(workOrder.pagePolicy?.target||workOrder.presentation?.exactPages||10));
const targetPages=configuredTarget===10?10:Math.max(12,Math.min(30,configuredTarget||16));
const variableMode=targetPages>10;

const departmentPages={};
for(const role of ROLES){
  const submission=readJson(path.join(base,`${role}.json`),null);
  const presentation=submission?.presentation;
  if(!submission||clean(submission.status).toUpperCase()!=='SUBMITTED')throw new Error(`${role}: submission missing`);
  if(!presentation||presentation.mode!=='VISUAL_FIRST_EMPLOYEE_AUTHORED'||presentation.generatedBy?.assistantAuthored!==false)throw new Error(`${role}: employee visual presentation missing`);
  if(!Array.isArray(presentation.pages)||presentation.pages.length!==EXPECTED[role])throw new Error(`${role}: expected ${EXPECTED[role]} employee pages`);
  departmentPages[role]=presentation.pages.map((page,index)=>{
    if(page.employeeAuthored!==true||page.sourceDepartment!==role)throw new Error(`${role}: page ${index+1} authorship invalid`);
    const image=clean(page.image);
    if(!image||!fs.existsSync(image))throw new Error(`${role}: page ${index+1} image missing`);
    const title=clip(page.title,28),body=clip(page.caption||page.focus,70);
    if(!title||!body)throw new Error(`${role}: page ${index+1} text missing`);
    return{kind:role,title,body,image,sourceDepartment:role,pageType:'employee-visual',visualType:clean(page.visualType),employeeAuthored:true,vibe2Authored:false,assistantAuthored:false,displayLanguage:'ko'};
  });
}
const directorFile=path.join(base,'presentation','director-presentation.json');
const director=readJson(directorFile,null);
if(!director||director.status!=='READY'||director.mode!=='VISUAL_FIRST_EMPLOYEE_AUTHORED'||director.runner?.assistantAuthored!==false||director.newClaimsAdded!==false)throw new Error('director employee presentation missing');
for(const key of ['cover','summary']){
  const page=director[key];
  if(!page||page.employeeAuthored!==true||!clean(page.image)||!fs.existsSync(page.image))throw new Error(`director ${key} page invalid`);
}

let vibePages=[];
const vibeDraftPath=clean(workOrder.vibe2FirstDraftPath||path.join(base,'vibe2-first-draft.json'));
if(variableMode){
  const draft=readJson(vibeDraftPath,null),spine=draft?.storySpine||{},expectedVibePages=targetPages-10;
  if(!draft||clean(draft.status)!=='FIRST_DRAFT_READY'||draft.proposalOnly!==true)throw new Error('Vibe2 first draft missing or not proposal-only');
  if(!['opening','early','mid','late','finalBoss','ending'].every(key=>clean(spine[key])))throw new Error('Vibe2 first draft must cover opening/early/mid/late/finalBoss/ending');
  if(!Array.isArray(draft.visualPages)||draft.visualPages.length!==expectedVibePages)throw new Error(`Vibe2 draft pages expected ${expectedVibePages}, got ${draft.visualPages?.length||0}`);
  vibePages=draft.visualPages.map((page,index)=>{
    const image=clean(page.image);
    if(!image||!fs.existsSync(image))throw new Error(`Vibe2 draft page ${index+1} image missing`);
    const title=clip(page.title,28),body=clip(page.body,90);
    if(!title||!body)throw new Error(`Vibe2 draft page ${index+1} text missing`);
    return{kind:'vibe2',title,body,image,sourceDepartment:'vibe2',pageType:'vibe2-first-draft',visualType:'story-draft',employeeAuthored:false,vibe2Authored:true,assistantAuthored:false,proposal:true,displayLanguage:'ko'};
  });
}

const cuts=[];
const push=(page,role,pageType,visualType='')=>cuts.push({
  no:cuts.length+1,kind:role,title:clip(page.title,28),body:clip(page.body||page.caption||page.tagline||page.closing||'',90),
  image:clean(page.image),sourceDepartment:role,pageType,visualType,employeeAuthored:page.employeeAuthored!==false,
  vibe2Authored:page.vibe2Authored===true,assistantAuthored:false,proposal:page.proposal===true,displayLanguage:'ko'
});
push(director.cover,'director','cover','game-concept-cover');
for(const page of vibePages)push(page,'vibe2','vibe2-first-draft','story-draft');
for(const page of departmentPages.planning)push(page,'planning','department-visual',page.visualType);
for(const page of departmentPages.graphics)push(page,'graphics','department-visual',page.visualType);
for(const page of departmentPages.development)push(page,'development','department-visual',page.visualType);
for(const page of departmentPages.qa)push(page,'qa','department-visual',page.visualType);
for(const page of departmentPages.balance)push(page,'balance','department-visual',page.visualType);
push({...director.summary,caption:director.summary.closing},'director','summary','department-summary');

if(cuts.length!==targetPages)throw new Error(`artbook target page mismatch: expected ${targetPages}, got ${cuts.length}`);
if(variableMode&&(cuts.length<12||cuts.length>30))throw new Error(`variable artbook must be 12..30 pages, got ${cuts.length}`);
const expectedOrder=['director',...Array(vibePages.length).fill('vibe2'),'planning','planning','graphics','graphics','development','development','qa','balance','director'];
if(cuts.some((cut,index)=>cut.sourceDepartment!==expectedOrder[index]))throw new Error('artbook page order mismatch');
const perDepartment=Object.fromEntries([...ROLES,'director','vibe2'].map(role=>[role,cuts.filter(cut=>cut.sourceDepartment===role).length]));
for(const [role,count] of Object.entries(EXPECTED))if(perDepartment[role]!==count)throw new Error(`${role}: expected ${count}, got ${perDepartment[role]}`);
if(variableMode&&perDepartment.vibe2!==targetPages-10)throw new Error('Vibe2 draft page count mismatch');
if(cuts.some(cut=>!cut.title||!cut.body||!cut.image||!fs.existsSync(cut.image)))throw new Error('empty title/body/image in completed artbook');
const duplicateVisuals=cuts.length-new Set(cuts.map(cut=>cut.image)).size;
if(duplicateVisuals>0)throw new Error(`visual pages must be unique: duplicates=${duplicateVisuals}`);

const sourceMode=variableMode?'VIBE2_FIRST_DRAFT_PLUS_EMPLOYEE_OWNED_VISUAL_PAGES_PLUS_DIRECTOR_PRESENTATION':'EMPLOYEE_OWNED_VISUAL_PAGES_PLUS_DIRECTOR_PRESENTATION';
const presentationMode=variableMode?'VIBE2_FIRST_DRAFT_PLUS_EMPLOYEE_AUTHORED':'VISUAL_FIRST_EMPLOYEE_AUTHORED';
const pagePlan=cuts.map(cut=>cut.sourceDepartment==='vibe2'?`Vibe2:${cut.title}`:cut.sourceDepartment);
const postprocess={
  version:6,complete:true,checkedAt:new Date().toISOString(),requiredCuts:targetPages,cutCount:targetPages,
  pagePolicy:{min:12,default:16,max:30,target:targetPages,legacyTenPageCompatible:true},pagePlan,cutsPerDepartment:perDepartment,
  formatChecked:true,emptyContentChecked:true,uniqueVisualsChecked:true,imagePathsChecked:true,newClaimsAdded:false,
  sourceMode,assistantAuthorship:false,vibe2DraftAuthorship:variableMode,imageFirst:true,shortText:true,displayLanguage:'ko'
};

const targetState=clean(lifecycleOrder.targetState||artbook.lifecycle?.targetState)||(
  workMode==='RELEASE_UPGRADE'?'RELEASE_BASELINE':workMode==='DEVELOPMENT_UPGRADE'?'DEVELOPMENT_BASELINE':'DESIGN_BASELINE'
);
const sourceArtbookId=clean(lifecycleOrder.sourceArtbookId||artbook.lifecycle?.sourceArtbookId)||null;
const trigger=clean(lifecycleOrder.trigger||artbook.lifecycle?.trigger)||(
  workMode==='INITIAL'?'INITIAL_DESIGN':workMode==='DEVELOPMENT_UPGRADE'?'DEVELOPMENT_CONFIRMED':workMode==='RELEASE_UPGRADE'?'RELEASE_CONFIRMED':'GENERAL_REVISION'
);
artbook.version=Math.max(10,Number(artbook.version)||0);
artbook.status='COMPLETED';
artbook.cuts=cuts;
artbook.vibe2FirstDraft=variableMode?{sourceFile:vibeDraftPath,status:'FIRST_DRAFT_READY',proposalOnly:true,pageCount:vibePages.length}:null;
artbook.presentation={mode:presentationMode,directorSource:directorFile,departmentPageCounts:Object.fromEntries(ROLES.map(role=>[role,EXPECTED[role]])),vibe2DraftPages:vibePages.length,employeeAuthoredPages:10,assistantAuthored:false};
artbook.postprocess=postprocess;
artbook.lifecycle={
  documentType:'LIVING_GAME_DESIGN_ARTBOOK',state:targetState,targetState,trigger,sourceArtbookId,
  currentBaseline:true,approved:true,approvedAt:date,createsNewVersion:true,overwriteApprovedVersion:false,historyPreserved:true
};
artbook.publication={...(artbook.publication||{}),displayReady:true,requiredCuts:targetPages,exactCutCountRequired:true,minCuts:variableMode?12:10,maxCuts:30,postprocessRequired:true,postprocessComplete:true,homepageMode:'compact-card-detail-viewer'};
writeJson(artbookFile,artbook);

const kindByMode={INITIAL:'initial',SECOND_WORK:'second',REVISION:'revision',DEVELOPMENT_UPGRADE:'development',RELEASE_UPGRADE:'release'};
const kind=kindByMode[workMode]||'revision';
const expectedId=`${gameId}-${date}-${kind}`;
const registered=(registry.artbooks||[]).find(x=>x.id===expectedId)||(registry.artbooks||[]).find(x=>x.sourceFile===artbookFile)||(registry.artbooks||[]).filter(x=>x.gameId===gameId&&x.createdAt===date).sort((a,b)=>(b.edition||0)-(a.edition||0))[0];
if(!registered)throw new Error('registered artbook missing');

// 새 기준선이 승인되면 이전 기준선은 내용은 그대로 보존하고 현재 기준선 표시만 내린다.
for(const previous of registry.artbooks||[]){
  if(previous.gameId!==gameId||previous.id===registered.id)continue;
  if(previous.lifecycle?.currentBaseline===true||['DESIGN_BASELINE','DEVELOPMENT_BASELINE','RELEASE_BASELINE'].includes(clean(previous.lifecycle?.state))){
    previous.lifecycle={...(previous.lifecycle||{}),state:'SUPERSEDED',currentBaseline:false,supersededBy:registered.id,supersededAt:date};
  }
}
registered.status='completed-artbook';
registered.published=true;
registered.homepageVisible=true;
registered.cuts=cuts;
registered.cutCount=targetPages;
registered.requiredCuts=targetPages;
registered.completionLabel=targetState==='RELEASE_BASELINE'?'출시 기준본':targetState==='DEVELOPMENT_BASELINE'?'개발 기준본':'설계 기준본';
registered.presentation=artbook.presentation;
registered.postprocess=postprocess;
registered.vibe2FirstDraft=artbook.vibe2FirstDraft;
registered.lifecycle={
  state:targetState,targetState,trigger,sourceArtbookId,currentBaseline:true,approved:true,approvedAt:date,
  createsNewVersion:true,overwriteApprovedVersion:false,historyPreserved:true
};
for(const daily of registry.dailySubmissions||[]){
  if(daily.gameId===gameId&&daily.date===date&&daily.artbookId===registered.id){
    daily.status='completed-artbook';daily.cutCount=targetPages;daily.postprocessComplete=true;daily.visualFirst=true;
    daily.artbookId=registered.id;daily.workMode=workMode;daily.lifecycleState=targetState;
  }
}
registry.latestByGame={...(registry.latestByGame||{}),[gameId]:{artbookId:registered.id,edition:Number(registered.edition)||0,state:targetState,workMode,updatedAt:date}};
registry.version=Math.max(14,Number(registry.version)||0);
registry.updatedAt=date;
writeJson('game-artbooks.json',registry);

if(workMode==='REVISION'){
  const taskId=clean(workOrder.revision?.taskId);
  if(taskId){
    const task=(revisionQueue.tasks||[]).find(x=>x.id===taskId);
    if(task){task.status='COMPLETED';task.completedAt=date;task.completedArtbookId=registered.id;task.completedLifecycleState=targetState;}
    revisionQueue.updatedAt=date;
    writeJson('artbook-revision-queue.json',revisionQueue);
  }
}

writeJson('artbook-gate-status.json',{
  ...gate,checkedAt:new Date().toISOString(),postprocessComplete:true,postprocessChecks:postprocess,cutCount:targetPages,
  requiredCuts:targetPages,homepagePublished:true,completedArtbook:true,visualFirst:true,employeeAuthoredPages:10,
  vibe2DraftPages:vibePages.length,assistantAuthoredPages:0,
  artbookLifecycle:{workMode,state:targetState,trigger,sourceArtbookId,currentBaseline:true,latestBaselineId:registered.id,historyPreserved:true},
  formalProductionGate:'ARTBOOK_COMPLETED_CURRENT_BASELINE_READY'
});
console.log('ARTBOOK_POSTPROCESS=PASS');
console.log(`ARTBOOK_CUTS=${targetPages}/${targetPages}`);
console.log(`ARTBOOK_PAGE_RANGE=${variableMode?'12-30':'LEGACY-10'}`);
console.log(`VIBE2_DRAFT_PAGES=${vibePages.length}`);
console.log('ARTBOOK_EMPLOYEE_AUTHORED=10');
console.log('ASSISTANT_AUTHORSHIP=0');
console.log(`ARTBOOK_REGISTERED_ID=${registered.id}`);
console.log(`ARTBOOK_LIFECYCLE_STATE=${targetState}`);
console.log(`ARTBOOK_LATEST_BASELINE=${registered.id}`);
console.log(`ARTBOOK_PREVIOUS_BASELINE=${sourceArtbookId||'NONE'}`);
console.log('ARTBOOK_HISTORY_PRESERVED=YES');
console.log('ARTBOOK_COMPLETED=YES');
console.log('HOMEPAGE_MODE=COMPACT_CARD_DETAIL_VIEWER');
