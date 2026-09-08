// 파일명: tools/artbook-prepare-daily.mjs
// 역할: 같은 날 2차 작업 예약을 우선 처리하고, 없으면 아직 직원 시각형 10컷 완료되지 않은 다음 게임의 초기 아트북을 준비한다.
import fs from 'node:fs';
import path from 'node:path';
const readJson=(f,d={})=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return d;}};
const writeJson=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>parts.find(x=>x.type===t)?.value||'';const date=`${g('year')}-${g('month')}-${g('day')}`;
const queue=readJson('artbook-submission-queue.json',{games:[],queueOrder:[]}),registry=readJson('game-artbooks.json',{artbooks:[]}),secondQueue=readJson('artbook-second-work-queue.json',{tasks:[]});
const dueTask=(secondQueue.tasks||[]).filter(x=>x.status==='SCHEDULED'&&String(x.dueDate||'')<=date&&Array.isArray(x.selectedDepartments)&&x.selectedDepartments.length).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)))[0]||null;
let mode='INITIAL',gameId='',secondWork=null;
if(dueTask){mode='SECOND_WORK';gameId=dueTask.gameId;secondWork={taskId:dueTask.id,sourceDate:dueTask.sourceDate,selectedDepartments:dueTask.selectedDepartments,criterion:dueTask.criterion,overallAverageStars:dueTask.overallAverageStars,departmentAverageStars:dueTask.departmentAverageStars,feedbackByDepartment:dueTask.feedbackByDepartment};}
else{
  const completedInitial=new Set((registry.artbooks||[]).filter(x=>
    String(x.workMode||'INITIAL').toUpperCase()==='INITIAL'&&
    String(x.status||'')==='completed-artbook'&&
    Array.isArray(x.cuts)&&x.cuts.length===10&&
    x.postprocess?.complete===true&&
    x.postprocess?.sourceMode==='EMPLOYEE_OWNED_VISUAL_PAGES_PLUS_DIRECTOR_PRESENTATION'&&
    x.postprocess?.assistantAuthorship===false&&
    x.postprocess?.imageFirst===true&&
    x.presentation?.mode==='VISUAL_FIRST_EMPLOYEE_AUTHORED'&&
    x.presentation?.assistantAuthored===false
  ).map(x=>x.gameId));
  const order=(queue.queueOrder||[]).length?queue.queueOrder:(queue.games||[]).map(x=>x.gameId);
  gameId=queue.currentDailyTarget;const current=(queue.games||[]).find(x=>x.gameId===gameId);
  if(!current||completedInitial.has(gameId))gameId=order.find(id=>!completedInitial.has(id))||'';
}
if(!gameId){writeJson('artbook-daily-context.json',{date,run:false,reason:'ALL_EMPLOYEE_VISUAL_INITIAL_ARTBOOKS_COMPLETED_10_CUTS_NO_SECOND_WORK_DUE'});console.log('ARTBOOK_DAILY=ALL_DONE');process.exit(0);}
const game=(queue.games||[]).find(x=>x.gameId===gameId)||{gameId,name:gameId,styleProfile:''};
queue.currentDailyTarget=gameId;queue.updatedAt=date;queue.currentTargetExecution={...(queue.currentTargetExecution||{}),date,mode,readySections:0,requiredSections:5,readyReviews:0,requiredReviews:5,directorAssemblyReady:false,requiredCuts:10,postprocessComplete:false,visualFirstRequired:true,employeeAuthorshipRequired:true,runnerDispatch:mode==='SECOND_WORK'?'FREE_LOCAL_OPEN_MODEL_SECOND_WORK_SCHEDULED':'FREE_LOCAL_OPEN_MODEL_SCHEDULED',runnerPaidApi:false,runnerApiKeyRequired:false,directorGhostwritingFallback:false};
game.status=mode==='SECOND_WORK'?'SAME_DAY_SECOND_WORK_SCHEDULED':'DAILY_TARGET_FREE_DEPARTMENT_BOTS_SCHEDULED';game.currentStage=mode==='SECOND_WORK'?'artbook-second-work':'artbook-department-review';
writeJson('artbook-submission-queue.json',queue);
const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`;
const mk=(owner,scope,deliverable)=>({owner,scope,deliverable,submissionPath:`artbook-submissions/${gameId}/${date}/${owner}.json`,mayWriteOtherSections:false,status:mode==='SECOND_WORK'?(secondWork.selectedDepartments.includes(owner)?'SECOND_WORK_SCHEDULED':'CARRY_FORWARD_SCHEDULED'):'FREE_LOCAL_AI_SCHEDULED'});
const workOrder={version:8,date,mode,gameId,gameName:game.name||gameId,status:mode==='SECOND_WORK'?'SAME_DAY_SECOND_WORK_SCHEDULED':'FREE_LOCAL_DEPARTMENT_RUNNERS_SCHEDULED',finalSubmissionLimitToday:1,styleProfile:game.styleProfile||'',sourceEvidence:[`web-games/${gameId} (read-only)`,`unity-games/${gameId} (if present)`,'existing build/test/error records'],departmentTasks:{planning:mk('planning','스토리·세계관·캐릭터 동기·사건 인과를 이미지 중심 2장으로 설계','visual-story-world-pages'),graphics:mk('graphics','캐릭터·몬스터·보스·배경·UI·로고·인트로 컨셉을 이미지 중심 2장으로 설계','visual-concept-style-pages'),development:mk('development','실제 구현 구조·플레이 루프·시스템 연결을 이미지 중심 2장으로 설계','visual-gameplay-system-pages'),qa:mk('qa','플레이 흐름·문제 장면·테스트 동선을 이미지 중심 1장으로 설계','visual-test-journey-page'),balance:mk('balance','성장곡선·전투 체감·보상·난이도를 이미지 중심 1장으로 설계','visual-balance-page')},runnerDispatch:{requestedRunner:'vibe2-local-open-model-department-bots',workflow:'.github/workflows/artbook-free-department-bots.yml',modelPrimary:'qwen3:0.6b',modelLicense:'Apache-2.0',execution:'github-hosted-ubuntu-local-inference',paidApi:false,apiKeyRequired:false,readsOtherDepartmentSubmissions:false,fallbackGhostwritingAllowed:false},collaboration:{enabled:true,reviewProtocol:'PEER_IMPROVEMENT_STAR_5',eachReviewerRatesOtherFour:true,selfRatingForbidden:true,oneImprovementPerTarget:true,starMax:5,crossDepartmentGhostwriting:false,directorMayOnlyAssemble:true},presentation:{visualFirst:true,exactPages:10,pagePlan:['director-cover','planning-1','planning-2','graphics-1','graphics-2','development-1','development-2','qa-1','balance-1','director-summary'],departmentAuthoredPages:8,directorAuthoredPages:2,assistantAuthoredPages:0,longTextForbidden:true},secondWork,completionGate:{allFiveSectionsRequired:true,allFiveReviewsRequired:true,verifiedOrExplicitlyUnverifiedEvidenceRequired:true,uniformTemplateForbidden:true,exactCutsRequired:10,postprocessRequired:true,employeeVisualPresentationRequired:true,assistantAuthorshipForbidden:true,readyForDirectorAssembly:false}};
// 같은 날짜의 INITIAL 작업지시가 이미 있어도 SECOND_WORK라면 반드시 교체해야 한다.
const existing=readJson(workOrderPath,null);
if(!existing||String(existing.mode||'').toUpperCase()!==mode||mode==='SECOND_WORK')writeJson(workOrderPath,workOrder);
writeJson('artbook-daily-context.json',{date,run:true,mode,gameId,gameName:game.name||gameId,workOrderPath,sourceDate:secondWork?.sourceDate||null,secondWorkDepartments:secondWork?.selectedDepartments||[],visualFirstRequired:true,employeeAuthorshipRequired:true,sameDaySecondWork:mode==='SECOND_WORK'&&secondWork?.sourceDate===date});
console.log(`ARTBOOK_DAILY_TARGET=${gameId}`);console.log(`ARTBOOK_DAILY_MODE=${mode}`);if(secondWork)console.log(`ARTBOOK_SECOND_WORK_DEPARTMENTS=${secondWork.selectedDepartments.join(',')}`);console.log(`ARTBOOK_WORK_ORDER=${workOrderPath}`);console.log('ARTBOOK_REQUIRED_CUTS=10');console.log('ARTBOOK_VISUAL_FIRST_REQUIRED=YES');console.log('ARTBOOK_EMPLOYEE_AUTHORSHIP_REQUIRED=YES');console.log('ARTBOOK_POSTPROCESS_REQUIRED=YES');console.log(`ARTBOOK_SAME_DAY_SECOND_WORK=${mode==='SECOND_WORK'&&secondWork?.sourceDate===date?'YES':'NO'}`);console.log('DAILY_FINAL_LIMIT=1');
