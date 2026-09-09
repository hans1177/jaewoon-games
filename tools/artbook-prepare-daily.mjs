// 파일명: tools/artbook-prepare-daily.mjs
// 역할: 기존 게임의 최초 아트북을 우선 채운 뒤, 개발/출시 단계 업그레이드와 필요 수정 요청을 처리한다.
// 제출 수량 정책: INITIAL/업그레이드/수정 모두 일일 개수 제한 없음.
import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=value=>String(value??'').trim();
const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
const pick=type=>parts.find(x=>x.type===type)?.value||'';
const date=`${pick('year')}-${pick('month')}-${pick('day')}`;

const queue=readJson('artbook-submission-queue.json',{games:[],queueOrder:[]});
const registry=readJson('game-artbooks.json',{artbooks:[],dailySubmissions:[],policy:{}});
const secondQueue=readJson('artbook-second-work-queue.json',{tasks:[]});
const revisionQueue=readJson('artbook-revision-queue.json',{tasks:[]});
const catalog=readJson('game-catalog.json',{games:[]});

const roles=['planning','graphics','development','qa','balance'];
const submissionCountPolicy='UNLIMITED';
queue.dailyFinalSubmissionLimit=null;
queue.submissionCountPolicy=submissionCountPolicy;
queue.initialBackfillPolicy='EXISTING_INITIAL_FIRST_UNTIL_DRAINED';
queue.rule='one-collaborative-initial-artbook-per-game-before-formal-production; unlimited sequential initial backfill until existing backlog is drained';
const validCompletedPageCount=n=>Number(n)===10||(Number(n)>=12&&Number(n)<=30);
const validPresentationMode=m=>['VISUAL_FIRST_EMPLOYEE_AUTHORED','VIBE2_FIRST_DRAFT_PLUS_EMPLOYEE_AUTHORED'].includes(String(m||''));
const validSourceMode=m=>['EMPLOYEE_OWNED_VISUAL_PAGES_PLUS_DIRECTOR_PRESENTATION','VIBE2_FIRST_DRAFT_PLUS_EMPLOYEE_OWNED_VISUAL_PAGES_PLUS_DIRECTOR_PRESENTATION'].includes(String(m||''));
const completedArtbooks=(registry.artbooks||[]).filter(x=>String(x.status||'')==='completed-artbook');
const completedInitial=new Set(completedArtbooks.filter(x=>
  String(x.workMode||'INITIAL').toUpperCase()==='INITIAL'&&
  Array.isArray(x.cuts)&&validCompletedPageCount(x.cuts.length)&&
  x.postprocess?.complete===true&&
  validSourceMode(x.postprocess?.sourceMode)&&
  x.postprocess?.assistantAuthorship===false&&
  x.postprocess?.imageFirst===true&&
  validPresentationMode(x.presentation?.mode)&&
  x.presentation?.assistantAuthored===false
).map(x=>x.gameId));

const order=(queue.queueOrder||[]).length?queue.queueOrder:(queue.games||[]).map(x=>x.gameId);
const existingGameIds=new Set((catalog.games||[]).filter(x=>x&&x.id&&(x.hasWebArchive===true||clean(x.unityProjectPath))).map(x=>x.id));
const existingOrder=order.filter(id=>existingGameIds.has(id));
const nextExistingInitial=existingOrder.find(id=>!completedInitial.has(id))||'';
const existingInitialRemaining=existingOrder.filter(id=>!completedInitial.has(id));

const baselineRank={DESIGN_BASELINE:1,DEVELOPMENT_BASELINE:2,RELEASE_BASELINE:3};
function inferLifecycleState(artbook){
  const explicit=clean(artbook?.lifecycle?.state||artbook?.lifecycleState).toUpperCase();
  if(baselineRank[explicit])return explicit;
  const mode=clean(artbook?.workMode||'INITIAL').toUpperCase();
  if(mode==='RELEASE_UPGRADE')return 'RELEASE_BASELINE';
  if(mode==='DEVELOPMENT_UPGRADE')return 'DEVELOPMENT_BASELINE';
  return 'DESIGN_BASELINE';
}
function latestBaseline(gameId){
  return completedArtbooks
    .filter(x=>x.gameId===gameId)
    .map(x=>({...x,__state:inferLifecycleState(x)}))
    .filter(x=>baselineRank[x.__state])
    .sort((a,b)=>(Number(b.edition)||0)-(Number(a.edition)||0)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0]||null;
}
function requiredMilestoneUpgrade(gameId){
  if(!completedInitial.has(gameId))return null;
  const catalogGame=(catalog.games||[]).find(x=>x.id===gameId)||{};
  const stage=clean(catalogGame.homepageCategory).toLowerCase();
  const baseline=latestBaseline(gameId);
  const currentState=baseline?.__state||'DESIGN_BASELINE';
  if(stage==='release-confirmed'&&(baselineRank[currentState]||0)<baselineRank.RELEASE_BASELINE){
    return {gameId,mode:'RELEASE_UPGRADE',trigger:'RELEASE_CONFIRMED',sourceArtbookId:baseline?.id||null,fromState:currentState,targetState:'RELEASE_BASELINE'};
  }
  if(stage==='development-confirmed'&&(baselineRank[currentState]||0)<baselineRank.DEVELOPMENT_BASELINE){
    return {gameId,mode:'DEVELOPMENT_UPGRADE',trigger:'DEVELOPMENT_CONFIRMED',sourceArtbookId:baseline?.id||null,fromState:currentState,targetState:'DEVELOPMENT_BASELINE'};
  }
  return null;
}

const milestoneUpgradeCandidates=existingOrder.map(requiredMilestoneUpgrade).filter(Boolean).sort((a,b)=>{
  const priority={RELEASE_UPGRADE:0,DEVELOPMENT_UPGRADE:1};
  return priority[a.mode]-priority[b.mode]||existingOrder.indexOf(a.gameId)-existingOrder.indexOf(b.gameId);
});
const dueRevision=(revisionQueue.tasks||[]).filter(x=>
  x.status==='SCHEDULED'&&String(x.dueDate||date)<=date&&completedInitial.has(x.gameId)
).sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||''))||String(a.requestedAt||'').localeCompare(String(b.requestedAt||'')))[0]||null;
const dueSecond=(secondQueue.tasks||[]).filter(x=>
  x.status==='SCHEDULED'&&String(x.dueDate||'')<=date&&Array.isArray(x.selectedDepartments)&&x.selectedDepartments.length
).sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')))[0]||null;

let mode='INITIAL';
let gameId='';
let secondWork=null;
let revision=null;
let lifecycleUpgrade=null;

if(nextExistingInitial){
  gameId=nextExistingInitial;
}else if(milestoneUpgradeCandidates.length){
  lifecycleUpgrade=milestoneUpgradeCandidates[0];
  mode=lifecycleUpgrade.mode;
  gameId=lifecycleUpgrade.gameId;
}else if(dueRevision){
  mode='REVISION';
  gameId=dueRevision.gameId;
  const baseline=latestBaseline(gameId);
  revision={
    taskId:dueRevision.id,
    trigger:clean(dueRevision.trigger).toUpperCase(),
    reason:clean(dueRevision.reason),
    evidence:Array.isArray(dueRevision.evidence)?dueRevision.evidence:[],
    selectedDepartments:Array.isArray(dueRevision.selectedDepartments)&&dueRevision.selectedDepartments.length?dueRevision.selectedDepartments:roles,
    sourceArtbookId:dueRevision.sourceArtbookId||baseline?.id||null,
    sourceLifecycleState:dueRevision.sourceLifecycleState||baseline?.__state||'DESIGN_BASELINE',
    targetState:baseline?.__state||'DESIGN_BASELINE'
  };
}else if(dueSecond){
  mode='SECOND_WORK';
  gameId=dueSecond.gameId;
  const baseline=latestBaseline(gameId);
  secondWork={
    taskId:dueSecond.id,sourceDate:dueSecond.sourceDate,selectedDepartments:dueSecond.selectedDepartments,
    criterion:dueSecond.criterion,overallAverageStars:dueSecond.overallAverageStars,
    departmentAverageStars:dueSecond.departmentAverageStars,feedbackByDepartment:dueSecond.feedbackByDepartment,
    sourceArtbookId:baseline?.id||null,targetState:baseline?.__state||'DESIGN_BASELINE'
  };
}else{
  gameId=order.find(id=>!completedInitial.has(id))||'';
}

if(!gameId){
  queue.currentDailyTarget='';
  queue.updatedAt=date;
  queue.currentTargetExecution={
    date,mode:'IDLE',status:'NO_ARTBOOK_WORK_DUE',existingInitialPriority:true,existingInitialRemaining:0,
    submissionCountPolicy,runnerDispatch:null,runnerPaidApi:false,runnerApiKeyRequired:false,directorGhostwritingFallback:false
  };
  writeJson('artbook-submission-queue.json',queue);
  writeJson('artbook-daily-context.json',{
    date,run:false,reason:'NO_ARTBOOK_WORK_DUE',existingInitialPriority:true,existingInitialRemaining:[],
    submissionCountPolicy
  });
  console.log('ARTBOOK_DAILY=ALL_DONE');
  console.log('ARTBOOK_QUEUE_STATE=IDLE');
  console.log('ARTBOOK_SUBMISSION_COUNT_POLICY=UNLIMITED');
  process.exit(0);
}

const queueGame=(queue.games||[]).find(x=>x.gameId===gameId)||{};
const catalogGame=(catalog.games||[]).find(x=>x.id===gameId)||{};
const game={gameId,name:queueGame.name||catalogGame.name||gameId,styleProfile:queueGame.styleProfile||''};
const baseline=latestBaseline(gameId);
const lifecycle={
  documentType:'LIVING_GAME_DESIGN_ARTBOOK',
  createsNewVersion:true,
  overwriteApprovedVersion:false,
  revisionAllowedAnytime:true,
  sourceArtbookId:lifecycleUpgrade?.sourceArtbookId||revision?.sourceArtbookId||secondWork?.sourceArtbookId||baseline?.id||null,
  fromState:lifecycleUpgrade?.fromState||revision?.sourceLifecycleState||secondWork?.targetState||baseline?.__state||null,
  targetState:mode==='INITIAL'?'DESIGN_BASELINE':lifecycleUpgrade?.targetState||revision?.targetState||secondWork?.targetState||baseline?.__state||'DESIGN_BASELINE',
  trigger:mode==='INITIAL'?'INITIAL_DESIGN':lifecycleUpgrade?.trigger||revision?.trigger||(mode==='SECOND_WORK'?'QUALITY_REVISION':'GENERAL_REVISION'),
  requiredMilestoneUpgrade:['DEVELOPMENT_UPGRADE','RELEASE_UPGRADE'].includes(mode)
};

const selectedDepartments=mode==='REVISION'?revision.selectedDepartments:mode==='SECOND_WORK'?secondWork.selectedDepartments:roles;
const sameDaySecondWork=mode==='SECOND_WORK'&&secondWork?.sourceDate===date;
const runnerDispatch=mode==='SECOND_WORK'?'FREE_LOCAL_OPEN_MODEL_SECOND_WORK_SCHEDULED':'FREE_LOCAL_OPEN_MODEL_SCHEDULED';

queue.currentDailyTarget=gameId;
queue.updatedAt=date;
queue.currentTargetExecution={
  ...(queue.currentTargetExecution||{}),date,mode,readySections:0,requiredSections:5,readyReviews:0,requiredReviews:5,
  directorAssemblyReady:false,pagePolicy:{min:12,default:16,max:30,legacyCompletedPages:10},requiredCuts:16,
  postprocessComplete:false,visualFirstRequired:true,employeeAuthorshipRequired:true,vibe2FirstDraftRequired:true,
  existingInitialPriority:true,existingInitialRemaining:existingInitialRemaining.length,lifecycle,submissionCountPolicy,
  runnerDispatch,runnerPaidApi:false,runnerApiKeyRequired:false,directorGhostwritingFallback:false
};
const queueGameMutable=(queue.games||[]).find(x=>x.gameId===gameId);
if(queueGameMutable){
  queueGameMutable.status=mode==='SECOND_WORK'?'SAME_DAY_SECOND_WORK_SCHEDULED':mode==='REVISION'?'ARTBOOK_REVISION_SCHEDULED':`${mode}_ARTBOOK_SCHEDULED`;
  queueGameMutable.currentStage=mode==='INITIAL'?'artbook-department-review':mode==='DEVELOPMENT_UPGRADE'?'artbook-development-upgrade':mode==='RELEASE_UPGRADE'?'artbook-release-upgrade':mode==='REVISION'?'artbook-revision':'artbook-second-work';
}
writeJson('artbook-submission-queue.json',queue);

const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`;
const taskStatus=owner=>{
  if(mode==='SECOND_WORK')return selectedDepartments.includes(owner)?'SECOND_WORK_SCHEDULED':'CARRY_FORWARD_SCHEDULED';
  if(mode==='REVISION')return selectedDepartments.includes(owner)?'REVISION_SCHEDULED':'CARRY_FORWARD_SCHEDULED';
  if(mode==='DEVELOPMENT_UPGRADE')return 'DEVELOPMENT_UPGRADE_SCHEDULED';
  if(mode==='RELEASE_UPGRADE')return 'RELEASE_UPGRADE_SCHEDULED';
  return 'FREE_LOCAL_AI_SCHEDULED';
};
const mk=(owner,scope,deliverable)=>({
  owner,scope,deliverable,submissionPath:`artbook-submissions/${gameId}/${date}/${owner}.json`,
  mayWriteOtherSections:false,status:taskStatus(owner),lifecycleTargetState:lifecycle.targetState
});
const workOrder={
  version:11,date,mode,gameId,gameName:game.name,status:`${mode}_ARTBOOK_WORK_SCHEDULED`,
  submissionCountPolicy,existingInitialPriority:true,existingInitialRemaining:existingInitialRemaining.length,
  styleProfile:game.styleProfile||'',lifecycle,
  sourceEvidence:[`web-games/${gameId} (read-only)`,`unity-games/${gameId} (if present)`,'existing build/test/error records',...(lifecycle.sourceArtbookId?[`artbook:${lifecycle.sourceArtbookId}`]:[])],
  departmentTasks:{
    planning:mk('planning','스토리·세계관·캐릭터 동기·사건 인과를 이미지 중심 2장으로 설계','visual-story-world-pages'),
    graphics:mk('graphics','캐릭터·몬스터·보스·배경·UI·로고·인트로 컨셉을 이미지 중심 2장으로 설계','visual-concept-style-pages'),
    development:mk('development','실제 구현 구조·플레이 루프·시스템 연결을 이미지 중심 2장으로 설계','visual-gameplay-system-pages'),
    qa:mk('qa','플레이 흐름·문제 장면·테스트 동선을 이미지 중심 1장으로 설계','visual-test-journey-page'),
    balance:mk('balance','성장곡선·전투 체감·보상·난이도를 이미지 중심 1장으로 설계','visual-balance-page')
  },
  runnerDispatch:{requestedRunner:'vibe2-local-open-model-department-bots',workflow:'.github/workflows/artbook-free-department-bots.yml',modelPrimary:'qwen3:0.6b',modelLicense:'Apache-2.0',execution:'github-hosted-ubuntu-local-inference',paidApi:false,apiKeyRequired:false,readsOtherDepartmentSubmissions:false,fallbackGhostwritingAllowed:false},
  collaboration:{enabled:true,reviewProtocol:'PEER_IMPROVEMENT_STAR_5',eachReviewerRatesOtherFour:true,selfRatingForbidden:true,oneImprovementPerTarget:true,starMax:5,crossDepartmentGhostwriting:false,directorMayOnlyAssemble:true},
  pagePolicy:{min:12,default:16,max:30,target:16,legacyCompletedPages:10,homepageMode:'compact-card-detail-viewer'},
  presentation:{visualFirst:true,exactPages:16,minPages:12,maxPages:30,vibe2DraftPages:6,departmentAuthoredPages:8,directorAuthoredPages:2,assistantAuthoredPages:0,pagePlan:['director-cover','vibe2-draft-1','vibe2-draft-2','vibe2-draft-3','vibe2-draft-4','vibe2-draft-5','vibe2-draft-6','planning-1','planning-2','graphics-1','graphics-2','development-1','development-2','qa-1','balance-1','director-summary']},
  secondWork,revision,
  completionGate:{allFiveSectionsRequired:true,allFiveReviewsRequired:true,verifiedOrExplicitlyUnverifiedEvidenceRequired:true,uniformTemplateForbidden:true,minCutsRequired:12,maxCutsAllowed:30,targetCutsRequired:true,legacyTenPageCompatible:true,vibe2FirstDraftRequired:true,postprocessRequired:true,employeeVisualPresentationRequired:true,assistantAuthorshipForbidden:true,readyForDirectorAssembly:false,livingArtbookVersionRequired:true,previousBaselineOverwriteForbidden:true}
};
const existing=readJson(workOrderPath,null);
if(!existing||clean(existing.mode).toUpperCase()!==mode||['SECOND_WORK','REVISION','DEVELOPMENT_UPGRADE','RELEASE_UPGRADE'].includes(mode))writeJson(workOrderPath,workOrder);

writeJson('artbook-daily-context.json',{
  date,run:true,mode,gameId,gameName:game.name,workOrderPath,sourceDate:secondWork?.sourceDate||null,
  secondWorkDepartments:secondWork?.selectedDepartments||[],revisionDepartments:revision?.selectedDepartments||[],
  existingInitialPriority:true,existingInitialRemaining,visualFirstRequired:true,employeeAuthorshipRequired:true,
  vibe2FirstDraftRequired:true,pagePolicy:workOrder.pagePolicy,sameDaySecondWork,submissionCountPolicy,lifecycle
});
console.log(`ARTBOOK_DAILY_TARGET=${gameId}`);
console.log(`ARTBOOK_DAILY_MODE=${mode}`);
console.log('ARTBOOK_PRIORITY=EXISTING_INITIAL_FIRST');
console.log(`ARTBOOK_EXISTING_INITIAL_REMAINING=${existingInitialRemaining.length}`);
console.log(`ARTBOOK_LIFECYCLE_TARGET=${lifecycle.targetState}`);
console.log(`ARTBOOK_LIFECYCLE_TRIGGER=${lifecycle.trigger}`);
console.log(`ARTBOOK_SOURCE_BASELINE=${lifecycle.sourceArtbookId||'NONE'}`);
if(secondWork)console.log(`ARTBOOK_SECOND_WORK_DEPARTMENTS=${secondWork.selectedDepartments.join(',')}`);
if(revision)console.log(`ARTBOOK_REVISION_DEPARTMENTS=${revision.selectedDepartments.join(',')}`);
console.log(`ARTBOOK_WORK_ORDER=${workOrderPath}`);
console.log('ARTBOOK_PAGE_POLICY=MIN12,DEFAULT16,MAX30');
console.log('ARTBOOK_VIBE2_FIRST_DRAFT_REQUIRED=YES');
console.log('ARTBOOK_VISUAL_FIRST_REQUIRED=YES');
console.log('ARTBOOK_EMPLOYEE_AUTHORSHIP_REQUIRED=YES');
console.log('ARTBOOK_POSTPROCESS_REQUIRED=YES');
console.log(`ARTBOOK_SAME_DAY_SECOND_WORK=${sameDaySecondWork?'YES':'NO'}`);
console.log('ARTBOOK_SUBMISSION_COUNT_POLICY=UNLIMITED');