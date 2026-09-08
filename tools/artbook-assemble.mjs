// 파일명: tools/artbook-assemble.mjs
// 역할: 검증된 5개 부서 결과에 타부서 4표 + 총괄 1표를 합쳐 결과물당 5표 평균을 계산하고 평균 이하 부서를 같은 날 즉시 2차 작업으로 예약한다.
// 총괄은 평가만 하며 부서 결과물을 대신 작성하지 않는다.
import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const todayKst=()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;};
const round2=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;

const queue=readJson('artbook-submission-queue.json',null),gate=readJson('artbook-gate-status.json',null),styles=readJson('artbook-style-profiles.json',{games:{}}),registry=readJson('game-artbooks.json',{version:4,policy:{},dailySubmissions:[],artbooks:[],legacyArchive:[]}),feedbackThreads=readJson('artbook-feedback-threads.json',{games:{}}),secondQueue=readJson('artbook-second-work-queue.json',{version:1,tasks:[]});
if(!queue||!gate)throw new Error('artbook queue/gate status missing');
const roles=Array.isArray(queue.requiredRoles)&&queue.requiredRoles.length?queue.requiredRoles:['planning','graphics','development','qa','balance'];
const gameId=String(process.env.ARTBOOK_GAME_ID||gate.gameId||queue.currentDailyTarget||'').trim(),date=String(process.env.ARTBOOK_DATE||gate.date||todayKst()).trim();
const game=(queue.games||[]).find(x=>x.gameId===gameId)||null,base=path.join('artbook-submissions',gameId,date),output=path.join(base,'artbook.json'),workOrderPath=`artbook-work-orders/${date}-${gameId}.json`,workOrder=readJson(workOrderPath,{}),workMode=String(workOrder.mode||'INITIAL').toUpperCase();
if(!gameId)throw new Error('gameId missing');
if(gate.gameId!==gameId||gate.date!==date)throw new Error('gate target/date mismatch');
if(gate.readyForDirectorAssembly!==true||Number(gate.readyCount)!==roles.length||Number(gate.reviewReadyCount)!==roles.length||gate.directorReviewReady!==true||Number(gate.ratingsPerDepartment)!==5||gate.collaborationComplete!==true)throw new Error(`section/rating gate incomplete: sections ${gate.readyCount||0}/${roles.length}, peer reviews ${gate.reviewReadyCount||0}/${roles.length}, director ${gate.directorReviewReady?'1/1':'0/1'}, ratingsPerDepartment=${gate.ratingsPerDepartment||0}`);
if(gate.directorMayAuthorMissingSections!==false||gate.directorMayAuthorMissingReviews!==false)throw new Error('director ghostwriting guard missing');

const submissionsRoot='artbook-submissions';
if(fs.existsSync(submissionsRoot))for(const entry of fs.readdirSync(submissionsRoot,{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const candidate=path.join(submissionsRoot,entry.name,date,'artbook.json');
  if(fs.existsSync(candidate)&&path.normalize(candidate)!==path.normalize(output))throw new Error(`daily final artbook limit reached by ${candidate}`);
}

const departments={},collaborationReviews={},sourceFiles=[],reviewFiles=[],cuts=[],received=Object.fromEntries(roles.map(r=>[r,[]]));
for(const role of roles){
  const file=path.join(base,`${role}.json`),submission=readJson(file,null);
  if(!submission)throw new Error(`${role} submission missing after gate`);
  if(String(submission.gameId||'')!==gameId||String(submission.date||'')!==date||String(submission.department||submission.role||'')!==role||String(submission.status||'').toUpperCase()!=='SUBMITTED')throw new Error(`${role} submission identity/status mismatch`);
  if(!Array.isArray(submission.evidence)||submission.evidence.length===0||!submission.section||typeof submission.section!=='object'||Array.isArray(submission.section)||Object.keys(submission.section).length===0)throw new Error(`${role} submission evidence/section missing`);
  sourceFiles.push(file);
  departments[role]={status:'SUBMITTED',readiness:submission.departmentReadiness||'NEEDS_VALIDATION',sourceFile:file,headline:submission.headline||null,evidence:submission.evidence,section:submission.section,unverified:Array.isArray(submission.unverified)?submission.unverified:[],revision:submission.revision||null};
  for(const cut of Array.isArray(submission.cuts)?submission.cuts:[]){if(cuts.length>=10)break;if(!cut||!cut.title||!cut.body||!cut.image)continue;cuts.push({no:cuts.length+1,kind:cut.kind||role,title:cut.title,body:cut.body,image:cut.image,sourceDepartment:role});}

  const reviewFile=path.join(base,'reviews',`${role}.json`),review=readJson(reviewFile,null);
  if(!review||String(review.status||'').toUpperCase()!=='REVIEWED'||Number(review.round)!==2||String(review.department||'')!==role)throw new Error(`${role} collaboration review missing after gate`);
  if(String(review.reviewScope||'')!=='OTHER_DEPARTMENTS_ONLY'||String(review.protocol||'')!=='PEER_IMPROVEMENT_STAR_5'||!Array.isArray(review.peerReviews)||review.peerReviews.length!==4)throw new Error(`${role} peer rating missing after gate`);
  reviewFiles.push(reviewFile);
  collaborationReviews[role]={sourceFile:reviewFile,protocol:review.protocol,reviewScope:review.reviewScope,reviewedDepartments:review.reviewedDepartments||[],peerReviews:review.peerReviews};
  for(const rating of review.peerReviews){
    const target=String(rating.targetDepartment||''),stars=Number(rating.stars),improvement=String(rating.improvement||'').trim();
    if(!received[target]||target===role||!Number.isInteger(stars)||stars<1||stars>5||!improvement)throw new Error(`${role} invalid peer rating`);
    received[target].push({reviewerDepartment:role,reviewerType:'department',stars,improvement});
  }
}

for(const role of roles)if(received[role].length!==4)throw new Error(`${role} must receive exactly four department ratings before director vote`);
const directorFile=path.join(base,'reviews','director.json'),directorReview=readJson(directorFile,null);
if(!directorReview||String(directorReview.status||'').toUpperCase()!=='REVIEWED'||String(directorReview.reviewer||'')!=='director'||String(directorReview.protocol||'')!=='DIRECTOR_IMPROVEMENT_STAR_5'||!Array.isArray(directorReview.ratings)||directorReview.ratings.length!==5)throw new Error('director fifth rating review missing after gate');
reviewFiles.push(directorFile);
for(const rating of directorReview.ratings){
  const target=String(rating.targetDepartment||''),stars=Number(rating.stars),improvement=String(rating.improvement||'').trim();
  if(!received[target]||!Number.isInteger(stars)||stars<1||stars>5||!improvement)throw new Error('invalid director rating');
  if(received[target].some(x=>x.reviewerDepartment==='director'))throw new Error(`duplicate director rating for ${target}`);
  received[target].push({reviewerDepartment:'director',reviewerType:'director',stars,improvement});
}
for(const role of roles)if(received[role].length!==5)throw new Error(`${role} must receive exactly five ratings: four departments plus director`);

const departmentAverages=Object.fromEntries(roles.map(role=>[role,round2(received[role].reduce((sum,x)=>sum+x.stars,0)/5)]));
const overallAverage=round2(roles.reduce((sum,role)=>sum+departmentAverages[role],0)/roles.length);
const secondWorkRoles=workMode==='INITIAL'?roles.filter(role=>departmentAverages[role]<=overallAverage):[];
const secondWorkDueDate=workMode==='INITIAL'?date:null;
const order=[...roles,'director'];
const departmentOpinions=Object.fromEntries(roles.map(role=>{
  const ratings=received[role].slice().sort((a,b)=>a.stars-b.stars||order.indexOf(a.reviewerDepartment)-order.indexOf(b.reviewerDepartment));
  return[role,{headline:departments[role].headline,readiness:departments[role].readiness,reviewScope:'RECEIVED_FROM_FOUR_DEPARTMENTS_PLUS_DIRECTOR',averageStars:departmentAverages[role],maxStars:5,reviewsReceived:5,departmentVotes:4,directorVotes:1,priorityImprovement:ratings[0]?.improvement||'',priorityImprovementFrom:ratings[0]?.reviewerDepartment||null,ratings,overallDepartmentAverage:overallAverage,secondWorkSameDay:secondWorkRoles.includes(role),secondWorkDueDate:secondWorkRoles.includes(role)?secondWorkDueDate:null,unverified:departments[role].unverified||[]}];
}));

if(workMode==='INITIAL'){
  const taskId=`${gameId}-${date}-second-work`;
  const task={id:taskId,gameId,gameName:game?.name||gameId,sourceDate:date,dueDate:secondWorkDueDate,status:'SCHEDULED',criterion:'FIVE_VOTE_DEPARTMENT_AVERAGE_STARS_LE_OVERALL_AVERAGE',overallAverageStars:overallAverage,maxStars:5,ratingsPerDepartment:5,departmentVotesPerResult:4,directorVotesPerResult:1,selectedDepartments:secondWorkRoles,departmentAverageStars:departmentAverages,feedbackByDepartment:Object.fromEntries(secondWorkRoles.map(role=>[role,received[role]])),productionApproval:false};
  secondQueue.version=Math.max(3,Number(secondQueue.version)||0);secondQueue.updatedAt=date;secondQueue.tasks=[...(secondQueue.tasks||[]).filter(x=>x.id!==taskId),task];writeJson('artbook-second-work-queue.json',secondQueue);
}else if(workMode==='SECOND_WORK'){
  const taskId=String(workOrder.secondWork?.taskId||'');
  if(taskId){const task=(secondQueue.tasks||[]).find(x=>x.id===taskId);if(task){task.status='COMPLETED';task.completedAt=date;task.completedArtbookFile=output;}secondQueue.updatedAt=date;writeJson('artbook-second-work-queue.json',secondQueue);}
}

const style=styles?.games?.[gameId]||{},gameName=game?.name||style.name||gameId,readinessSummary=Object.fromEntries(roles.map(role=>[role,departments[role].readiness]));
const final={version:6,gameId,gameName,date,status:'SUBMITTED',workMode,initialArtbook:workMode==='INITIAL',secondWorkArtbook:workMode==='SECOND_WORK',productionApproval:false,styleProfile:game?.styleProfile||style.identity||null,departments,departmentOpinions,ratingSummary:{scale:'STARS_1_TO_5',ratingsPerDepartment:5,departmentVotesPerResult:4,directorVotesPerResult:1,departmentAverageStars:departmentAverages,overallAverageStars:overallAverage,secondWorkCriterion:'DEPARTMENT_AVERAGE_OR_BELOW_OVERALL_AVERAGE',secondWorkDepartments:secondWorkRoles,secondWorkDueDate},collaboration:{protocol:'PEER_PLUS_DIRECTOR_IMPROVEMENT_STAR_5',departmentReviews:collaborationReviews,directorReview:{sourceFile:directorFile,protocol:directorReview.protocol,reviewScope:directorReview.reviewScope,ratings:directorReview.ratings},sourceFiles:reviewFiles,allFiveDepartmentsReviewed:true,homepageOpinionMode:'IMPROVEMENT_AND_FIVE_VOTE_AVERAGE_STARS'},directorSummary:{assemblyMode:'department-material-plus-director-rating-plus-deterministic-five-vote-aggregation',sourceDepartments:roles,sourceFiles,reviewFiles,readinessSummary,newDepartmentClaimsAdded:false,productionDecisionMade:false},cuts,publication:{automaticProductionApproval:false,homepageVisibilityMayBeEnabledSeparately:true,displayReady:cuts.length>0,departmentOpinionsRequired:true,fiveVoteRatingsRequired:true}};
writeJson(output,final);

const feedback=feedbackThreads.games?.[gameId]||null,kind=workMode==='SECOND_WORK'?'second':'initial',artbookId=`${gameId}-${date}-${kind}`,previous=(registry.artbooks||[]).find(x=>x.id===artbookId)||null,priorEditions=(registry.artbooks||[]).filter(x=>x.gameId===gameId).map(x=>Number(x.edition)||0),edition=previous?.edition||Math.max(0,...priorEditions)+1;
const registered={id:artbookId,gameId,gameName,edition,title:`${gameName} · ${workMode==='SECOND_WORK'?'2차':'통합'} 아트북`,subtitle:game?.styleProfile||style.identity||'5개 부서 근거 통합 기록',status:workMode==='SECOND_WORK'?'second-work-integrated-artbook':'draft-integrated-artbook',published:cuts.length>0,homepageVisible:cuts.length>0,productionApproval:false,createdAt:date,workMode,intent:workMode==='SECOND_WORK'?'같은 날 5표 평균이 전체 평균 이하인 부서가 보완점을 즉시 반영해 2차 작업한 결과와 새 5표 평가를 통합한 기록.':'5개 부서 독립 결과마다 타부서 4표와 총괄 1표로 보완점 1개·별점 5점 만점 평가를 남긴 초기 아트북.',sourceFile:output,departmentReadiness:readinessSummary,departmentOpinions,ratingSummary:final.ratingSummary,homepageOpinionMode:'IMPROVEMENT_AND_FIVE_VOTE_AVERAGE_STARS',collaborationProtocol:'PEER_PLUS_DIRECTOR_IMPROVEMENT_STAR_5',cuts,feedback:feedback?{issueNumber:feedback.issueNumber,issueUrl:feedback.issueUrl}:null};
registry.version=Math.max(9,Number(registry.version)||0);registry.updatedAt=date;registry.artbooks=[...(registry.artbooks||[]).filter(x=>x.id!==artbookId),registered];registry.dailySubmissions=[...(registry.dailySubmissions||[]).filter(x=>!(x.date===date&&x.gameId===gameId)),{date,gameId,artbookId,status:registered.status,productionApproval:false}];writeJson('game-artbooks.json',registry);

writeJson('artbook-gate-status.json',{...gate,checkedAt:new Date().toISOString(),assembled:true,assembledFile:output,registeredArtbookId:artbookId,homepagePublished:registered.published,departmentOpinionsPublished:true,homepageOpinionMode:'IMPROVEMENT_AND_FIVE_VOTE_AVERAGE_STARS',ratingsPerDepartment:5,departmentVotesPerResult:4,directorVotesPerResult:1,overallAverageStars:overallAverage,secondWorkDepartments:secondWorkRoles,secondWorkDueDate,assemblyAddsNewDepartmentClaims:false,formalProductionGate:'ARTBOOK_ASSEMBLED_AWAITING_OWNER_PRODUCTION_DECISION'});
console.log('ARTBOOK_ASSEMBLED=YES');console.log(`ARTBOOK_FILE=${output}`);console.log(`ARTBOOK_DEPARTMENTS=${roles.length}/${roles.length}`);console.log(`ARTBOOK_PEER_REVIEWS=${roles.length}/${roles.length}`);console.log('ARTBOOK_DIRECTOR_REVIEW=1/1');console.log('ARTBOOK_RATINGS_PER_DEPARTMENT=5');console.log('ARTBOOK_RATING_SCALE=5');console.log(`ARTBOOK_OVERALL_AVERAGE_STARS=${overallAverage}`);console.log(`ARTBOOK_SECOND_WORK_SAME_DAY=${secondWorkRoles.join(',')||'NONE'}`);console.log(`ARTBOOK_SECOND_WORK_DUE=${secondWorkDueDate||'NONE'}`);console.log(`ARTBOOK_CUTS=${cuts.length}/10`);console.log(`ARTBOOK_REGISTERED=${artbookId}`);console.log(`HOMEPAGE_PUBLISHED=${registered.published?'YES':'NO'}`);console.log('PRODUCTION_APPROVAL=NO');
