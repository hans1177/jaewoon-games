// 파일명: tools/artbook-assemble.mjs
// 역할: 검증된 부서 결과를 버전형 살아있는 아트북 후보로 조립하고 5표 평가를 기록한다.
// 총괄은 평가/조립만 하며 부서 결과물을 대신 작성하지 않는다.
import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=value=>String(value??'').trim();
const todayKst=()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;};
const round2=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;

const queue=readJson('artbook-submission-queue.json',null);
const gate=readJson('artbook-gate-status.json',null);
const styles=readJson('artbook-style-profiles.json',{games:{}});
const registry=readJson('game-artbooks.json',{version:4,policy:{},dailySubmissions:[],artbooks:[],legacyArchive:[]});
const feedbackThreads=readJson('artbook-feedback-threads.json',{games:{}});
const secondQueue=readJson('artbook-second-work-queue.json',{version:1,tasks:[]});
const revisionQueue=readJson('artbook-revision-queue.json',{version:1,tasks:[]});
if(!queue||!gate)throw new Error('artbook queue/gate status missing');

const roles=Array.isArray(queue.requiredRoles)&&queue.requiredRoles.length?queue.requiredRoles:['planning','graphics','development','qa','balance'];
const gameId=clean(process.env.ARTBOOK_GAME_ID||gate.gameId||queue.currentDailyTarget);
const date=clean(process.env.ARTBOOK_DATE||gate.date||todayKst());
const game=(queue.games||[]).find(x=>x.gameId===gameId)||null;
const base=path.join('artbook-submissions',gameId,date);
const output=path.join(base,'artbook.json');
const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`;
const workOrder=readJson(workOrderPath,{});
const workMode=clean(workOrder.mode||'INITIAL').toUpperCase();
const lifecycle=workOrder.lifecycle||{};
if(!gameId)throw new Error('gameId missing');
if(gate.gameId!==gameId||gate.date!==date)throw new Error('gate target/date mismatch');
if(gate.readyForDirectorAssembly!==true||Number(gate.readyCount)!==roles.length||Number(gate.reviewReadyCount)!==roles.length||gate.directorReviewReady!==true||Number(gate.ratingsPerDepartment)!==5||gate.collaborationComplete!==true){
  throw new Error(`section/rating gate incomplete: sections ${gate.readyCount||0}/${roles.length}, peer reviews ${gate.reviewReadyCount||0}/${roles.length}, director ${gate.directorReviewReady?'1/1':'0/1'}, ratingsPerDepartment=${gate.ratingsPerDepartment||0}`);
}
if(gate.directorMayAuthorMissingSections!==false||gate.directorMayAuthorMissingReviews!==false)throw new Error('director ghostwriting guard missing');

// 하루 1개 제한은 최초 아트북에만 적용한다. 기존 아트북 업그레이드/수정은 제한 대상이 아니다.
if(workMode==='INITIAL'){
  const submissionsRoot='artbook-submissions';
  if(fs.existsSync(submissionsRoot))for(const entry of fs.readdirSync(submissionsRoot,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const candidate=path.join(submissionsRoot,entry.name,date,'artbook.json');
    if(!fs.existsSync(candidate)||path.normalize(candidate)===path.normalize(output))continue;
    const other=readJson(candidate,{});
    if(clean(other.workMode||'INITIAL').toUpperCase()==='INITIAL')throw new Error(`daily initial artbook limit reached by ${candidate}`);
  }
}

const departments={};
const collaborationReviews={};
const sourceFiles=[];
const reviewFiles=[];
const cuts=[];
const received=Object.fromEntries(roles.map(role=>[role,[]]));
for(const role of roles){
  const file=path.join(base,`${role}.json`);
  const submission=readJson(file,null);
  if(!submission)throw new Error(`${role} submission missing after gate`);
  if(clean(submission.gameId)!==gameId||clean(submission.date)!==date||clean(submission.department||submission.role)!==role||clean(submission.status).toUpperCase()!=='SUBMITTED')throw new Error(`${role} submission identity/status mismatch`);
  if(!Array.isArray(submission.evidence)||submission.evidence.length===0||!submission.section||typeof submission.section!=='object'||Array.isArray(submission.section)||Object.keys(submission.section).length===0)throw new Error(`${role} submission evidence/section missing`);
  sourceFiles.push(file);
  departments[role]={
    status:'SUBMITTED',readiness:submission.departmentReadiness||'NEEDS_VALIDATION',sourceFile:file,
    headline:submission.headline||null,evidence:submission.evidence,section:submission.section,
    unverified:Array.isArray(submission.unverified)?submission.unverified:[],revision:submission.revision||null
  };
  for(const cut of Array.isArray(submission.cuts)?submission.cuts:[]){
    if(cuts.length>=10)break;
    if(!cut||!cut.title||!cut.body||!cut.image)continue;
    cuts.push({no:cuts.length+1,kind:cut.kind||role,title:cut.title,body:cut.body,image:cut.image,sourceDepartment:role});
  }

  const reviewFile=path.join(base,'reviews',`${role}.json`);
  const review=readJson(reviewFile,null);
  if(!review||clean(review.status).toUpperCase()!=='REVIEWED'||Number(review.round)!==2||clean(review.department)!==role)throw new Error(`${role} collaboration review missing after gate`);
  if(clean(review.reviewScope)!=='OTHER_DEPARTMENTS_ONLY'||clean(review.protocol)!=='PEER_IMPROVEMENT_STAR_5'||!Array.isArray(review.peerReviews)||review.peerReviews.length!==4)throw new Error(`${role} peer rating missing after gate`);
  reviewFiles.push(reviewFile);
  collaborationReviews[role]={sourceFile:reviewFile,protocol:review.protocol,reviewScope:review.reviewScope,reviewedDepartments:review.reviewedDepartments||[],peerReviews:review.peerReviews};
  for(const rating of review.peerReviews){
    const target=clean(rating.targetDepartment),stars=Number(rating.stars),improvement=clean(rating.improvement);
    if(!received[target]||target===role||!Number.isInteger(stars)||stars<1||stars>5||!improvement)throw new Error(`${role} invalid peer rating`);
    received[target].push({reviewerDepartment:role,reviewerType:'department',stars,improvement});
  }
}

for(const role of roles)if(received[role].length!==4)throw new Error(`${role} must receive exactly four department ratings before director vote`);
const directorFile=path.join(base,'reviews','director.json');
const directorReview=readJson(directorFile,null);
if(!directorReview||clean(directorReview.status).toUpperCase()!=='REVIEWED'||clean(directorReview.reviewer)!=='director'||clean(directorReview.protocol)!=='DIRECTOR_IMPROVEMENT_STAR_5'||!Array.isArray(directorReview.ratings)||directorReview.ratings.length!==5)throw new Error('director fifth rating review missing after gate');
reviewFiles.push(directorFile);
for(const rating of directorReview.ratings){
  const target=clean(rating.targetDepartment),stars=Number(rating.stars),improvement=clean(rating.improvement);
  if(!received[target]||!Number.isInteger(stars)||stars<1||stars>5||!improvement)throw new Error('invalid director rating');
  if(received[target].some(x=>x.reviewerDepartment==='director'))throw new Error(`duplicate director rating for ${target}`);
  received[target].push({reviewerDepartment:'director',reviewerType:'director',stars,improvement});
}
for(const role of roles)if(received[role].length!==5)throw new Error(`${role} must receive exactly five ratings: four departments plus director`);

const departmentAverages=Object.fromEntries(roles.map(role=>[role,round2(received[role].reduce((sum,x)=>sum+x.stars,0)/5)]));
const overallAverage=round2(roles.reduce((sum,role)=>sum+departmentAverages[role],0)/roles.length);
const followupEligible=!['SECOND_WORK'].includes(workMode);
const secondWorkRoles=followupEligible?roles.filter(role=>departmentAverages[role]<=overallAverage):[];
const secondWorkDueDate=followupEligible?date:null;
const order=[...roles,'director'];
const departmentOpinions=Object.fromEntries(roles.map(role=>{
  const ratings=received[role].slice().sort((a,b)=>a.stars-b.stars||order.indexOf(a.reviewerDepartment)-order.indexOf(b.reviewerDepartment));
  return[role,{
    headline:departments[role].headline,readiness:departments[role].readiness,
    reviewScope:'RECEIVED_FROM_FOUR_DEPARTMENTS_PLUS_DIRECTOR',averageStars:departmentAverages[role],maxStars:5,
    reviewsReceived:5,departmentVotes:4,directorVotes:1,priorityImprovement:ratings[0]?.improvement||'',
    priorityImprovementFrom:ratings[0]?.reviewerDepartment||null,ratings,overallDepartmentAverage:overallAverage,
    secondWorkSameDay:secondWorkRoles.includes(role),secondWorkDueDate:secondWorkRoles.includes(role)?secondWorkDueDate:null,
    unverified:departments[role].unverified||[]
  }];
}));

if(followupEligible&&secondWorkRoles.length){
  const taskId=`${gameId}-${date}-${workMode.toLowerCase()}-followup`;
  const task={
    id:taskId,gameId,gameName:game?.name||gameId,sourceDate:date,dueDate:secondWorkDueDate,status:'SCHEDULED',
    sourceWorkMode:workMode,sourceLifecycleState:lifecycle.targetState||'DESIGN_BASELINE',
    criterion:'FIVE_VOTE_DEPARTMENT_AVERAGE_STARS_LE_OVERALL_AVERAGE',overallAverageStars:overallAverage,maxStars:5,
    ratingsPerDepartment:5,departmentVotesPerResult:4,directorVotesPerResult:1,selectedDepartments:secondWorkRoles,
    departmentAverageStars:departmentAverages,feedbackByDepartment:Object.fromEntries(secondWorkRoles.map(role=>[role,received[role]])),productionApproval:false
  };
  secondQueue.version=Math.max(4,Number(secondQueue.version)||0);
  secondQueue.updatedAt=date;
  secondQueue.tasks=[...(secondQueue.tasks||[]).filter(x=>x.id!==taskId),task];
  writeJson('artbook-second-work-queue.json',secondQueue);
}else if(workMode==='SECOND_WORK'){
  const taskId=clean(workOrder.secondWork?.taskId);
  if(taskId){
    const task=(secondQueue.tasks||[]).find(x=>x.id===taskId);
    if(task){task.status='COMPLETED';task.completedAt=date;task.completedArtbookFile=output;}
    secondQueue.updatedAt=date;
    writeJson('artbook-second-work-queue.json',secondQueue);
  }
}
if(workMode==='REVISION'){
  const taskId=clean(workOrder.revision?.taskId);
  if(taskId){
    const task=(revisionQueue.tasks||[]).find(x=>x.id===taskId);
    if(task){task.status='ASSEMBLED_AWAITING_POSTPROCESS';task.assembledAt=date;task.assembledArtbookFile=output;}
    revisionQueue.updatedAt=date;
    writeJson('artbook-revision-queue.json',revisionQueue);
  }
}

const style=styles?.games?.[gameId]||{};
const gameName=game?.name||style.name||gameId;
const readinessSummary=Object.fromEntries(roles.map(role=>[role,departments[role].readiness]));
const lifecycleTarget=clean(lifecycle.targetState)||(
  workMode==='RELEASE_UPGRADE'?'RELEASE_BASELINE':workMode==='DEVELOPMENT_UPGRADE'?'DEVELOPMENT_BASELINE':'DESIGN_BASELINE'
);
const final={
  version:7,gameId,gameName,date,status:'SUBMITTED',workMode,
  initialArtbook:workMode==='INITIAL',secondWorkArtbook:workMode==='SECOND_WORK',revisionArtbook:workMode==='REVISION',
  developmentUpgradeArtbook:workMode==='DEVELOPMENT_UPGRADE',releaseUpgradeArtbook:workMode==='RELEASE_UPGRADE',
  productionApproval:false,styleProfile:game?.styleProfile||style.identity||null,
  lifecycle:{
    documentType:'LIVING_GAME_DESIGN_ARTBOOK',state:'REVISION_CANDIDATE',targetState:lifecycleTarget,
    trigger:lifecycle.trigger||null,sourceArtbookId:lifecycle.sourceArtbookId||null,
    createsNewVersion:true,overwriteApprovedVersion:false,currentBaselineChangesBeforePostprocess:false
  },
  departments,departmentOpinions,
  ratingSummary:{scale:'STARS_1_TO_5',ratingsPerDepartment:5,departmentVotesPerResult:4,directorVotesPerResult:1,departmentAverageStars:departmentAverages,overallAverageStars:overallAverage,secondWorkCriterion:'DEPARTMENT_AVERAGE_OR_BELOW_OVERALL_AVERAGE',secondWorkDepartments:secondWorkRoles,secondWorkDueDate},
  collaboration:{protocol:'PEER_PLUS_DIRECTOR_IMPROVEMENT_STAR_5',departmentReviews:collaborationReviews,directorReview:{sourceFile:directorFile,protocol:directorReview.protocol,reviewScope:directorReview.reviewScope,ratings:directorReview.ratings},sourceFiles:reviewFiles,allFiveDepartmentsReviewed:true,homepageOpinionMode:'IMPROVEMENT_AND_FIVE_VOTE_AVERAGE_STARS'},
  directorSummary:{assemblyMode:'department-material-plus-director-rating-plus-deterministic-five-vote-aggregation',sourceDepartments:roles,sourceFiles,reviewFiles,readinessSummary,newDepartmentClaimsAdded:false,productionDecisionMade:false},
  cuts,publication:{automaticProductionApproval:false,homepageVisibilityMayBeEnabledSeparately:true,displayReady:cuts.length>0,departmentOpinionsRequired:true,fiveVoteRatingsRequired:true}
};
writeJson(output,final);

const feedback=feedbackThreads.games?.[gameId]||null;
const kindByMode={INITIAL:'initial',SECOND_WORK:'second',REVISION:'revision',DEVELOPMENT_UPGRADE:'development',RELEASE_UPGRADE:'release'};
const kind=kindByMode[workMode]||'revision';
const artbookId=`${gameId}-${date}-${kind}`;
const previous=(registry.artbooks||[]).find(x=>x.id===artbookId)||null;
const priorEditions=(registry.artbooks||[]).filter(x=>x.gameId===gameId).map(x=>Number(x.edition)||0);
const edition=previous?.edition||Math.max(0,...priorEditions)+1;
const titleSuffix={INITIAL:'통합',SECOND_WORK:'2차',REVISION:'수정',DEVELOPMENT_UPGRADE:'개발 기준',RELEASE_UPGRADE:'출시 기준'}[workMode]||'수정';
const intentByMode={
  INITIAL:'5개 부서 독립 결과와 5표 평가를 통합한 최초 설계 기준 후보.',
  SECOND_WORK:'이전 아트북의 평가 보완점을 반영한 후속 수정 후보.',
  REVISION:'사용자/QA/플레이/밸런스/기술 근거에 따라 기존 승인본을 덮어쓰지 않고 만든 수정 후보.',
  DEVELOPMENT_UPGRADE:'개발확정 상태를 반영해 실제 구현 범위와 기술/콘텐츠 기준을 갱신하는 개발 기준 후보.',
  RELEASE_UPGRADE:'출시확정 상태를 반영해 최종 콘텐츠·밸런스·UX·QA·배포 기준을 갱신하는 출시 기준 후보.'
};
const registered={
  id:artbookId,gameId,gameName,edition,title:`${gameName} · ${titleSuffix} 아트북`,subtitle:game?.styleProfile||style.identity||'5개 부서 근거 통합 기록',
  status:'draft-integrated-artbook',published:cuts.length>0,homepageVisible:cuts.length>0,productionApproval:false,
  createdAt:date,workMode,intent:intentByMode[workMode]||intentByMode.REVISION,sourceFile:output,
  lifecycle:{state:'REVISION_CANDIDATE',targetState:lifecycleTarget,trigger:lifecycle.trigger||null,sourceArtbookId:lifecycle.sourceArtbookId||null,currentBaseline:false,createsNewVersion:true,overwriteApprovedVersion:false},
  departmentReadiness:readinessSummary,departmentOpinions,ratingSummary:final.ratingSummary,
  homepageOpinionMode:'IMPROVEMENT_AND_FIVE_VOTE_AVERAGE_STARS',collaborationProtocol:'PEER_PLUS_DIRECTOR_IMPROVEMENT_STAR_5',cuts,
  feedback:feedback?{issueNumber:feedback.issueNumber,issueUrl:feedback.issueUrl}:null
};
registry.version=Math.max(13,Number(registry.version)||0);
registry.updatedAt=date;
registry.artbooks=[...(registry.artbooks||[]).filter(x=>x.id!==artbookId),registered];
registry.dailySubmissions=[...(registry.dailySubmissions||[]).filter(x=>!(x.date===date&&x.gameId===gameId&&x.artbookId===artbookId)),{date,gameId,artbookId,workMode,status:registered.status,lifecycleState:'REVISION_CANDIDATE',productionApproval:false}];
writeJson('game-artbooks.json',registry);

writeJson('artbook-gate-status.json',{
  ...gate,checkedAt:new Date().toISOString(),assembled:true,assembledFile:output,registeredArtbookId:artbookId,
  homepagePublished:registered.published,departmentOpinionsPublished:true,homepageOpinionMode:'IMPROVEMENT_AND_FIVE_VOTE_AVERAGE_STARS',
  ratingsPerDepartment:5,departmentVotesPerResult:4,directorVotesPerResult:1,overallAverageStars:overallAverage,
  secondWorkDepartments:secondWorkRoles,secondWorkDueDate,assemblyAddsNewDepartmentClaims:false,
  artbookLifecycle:{workMode,state:'REVISION_CANDIDATE',targetState:lifecycleTarget,sourceArtbookId:lifecycle.sourceArtbookId||null,overwriteApprovedVersion:false},
  formalProductionGate:'ARTBOOK_ASSEMBLED_AWAITING_POSTPROCESS'
});
console.log('ARTBOOK_ASSEMBLED=YES');
console.log(`ARTBOOK_FILE=${output}`);
console.log(`ARTBOOK_DEPARTMENTS=${roles.length}/${roles.length}`);
console.log(`ARTBOOK_PEER_REVIEWS=${roles.length}/${roles.length}`);
console.log('ARTBOOK_DIRECTOR_REVIEW=1/1');
console.log('ARTBOOK_RATINGS_PER_DEPARTMENT=5');
console.log('ARTBOOK_RATING_SCALE=5');
console.log(`ARTBOOK_OVERALL_AVERAGE_STARS=${overallAverage}`);
console.log(`ARTBOOK_SECOND_WORK_SAME_DAY=${secondWorkRoles.join(',')||'NONE'}`);
console.log(`ARTBOOK_SECOND_WORK_DUE=${secondWorkDueDate||'NONE'}`);
console.log(`ARTBOOK_LIFECYCLE_TARGET=${lifecycleTarget}`);
console.log(`ARTBOOK_SOURCE_BASELINE=${lifecycle.sourceArtbookId||'NONE'}`);
console.log(`ARTBOOK_CUTS=${cuts.length}/10`);
console.log(`ARTBOOK_REGISTERED=${artbookId}`);
console.log(`HOMEPAGE_PUBLISHED=${registered.published?'YES':'NO'}`);
console.log('PRODUCTION_APPROVAL=NO');
