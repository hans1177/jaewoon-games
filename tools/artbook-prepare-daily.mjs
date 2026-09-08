// 파일명: tools/artbook-prepare-daily.mjs
// 역할: 다음날 2차 작업 예약을 우선 처리하고, 없으면 아직 통합되지 않은 다음 게임의 초기 아트북을 준비한다.
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
  const assembledInitial=new Set((registry.artbooks||[]).filter(x=>String(x.workMode||'INITIAL').toUpperCase()==='INITIAL').map(x=>x.gameId));
  const order=(queue.queueOrder||[]).length?queue.queueOrder:(queue.games||[]).map(x=>x.gameId);
  gameId=queue.currentDailyTarget;const current=(queue.games||[]).find(x=>x.gameId===gameId);
  if(!current||assembledInitial.has(gameId))gameId=order.find(id=>!assembledInitial.has(id))||'';
}
if(!gameId){writeJson('artbook-daily-context.json',{date,run:false,reason:'ALL_INITIAL_ARTBOOKS_ASSEMBLED_NO_SECOND_WORK_DUE'});console.log('ARTBOOK_DAILY=ALL_DONE');process.exit(0);}
const game=(queue.games||[]).find(x=>x.gameId===gameId)||{gameId,name:gameId,styleProfile:''};
queue.currentDailyTarget=gameId;queue.updatedAt=date;queue.currentTargetExecution={...(queue.currentTargetExecution||{}),date,mode,readySections:0,requiredSections:5,readyReviews:0,requiredReviews:5,directorAssemblyReady:false,runnerDispatch:mode==='SECOND_WORK'?'FREE_LOCAL_OPEN_MODEL_SECOND_WORK_SCHEDULED':'FREE_LOCAL_OPEN_MODEL_SCHEDULED',runnerPaidApi:false,runnerApiKeyRequired:false,directorGhostwritingFallback:false};
game.status=mode==='SECOND_WORK'?'NEXT_DAY_SECOND_WORK_SCHEDULED':'DAILY_TARGET_FREE_DEPARTMENT_BOTS_SCHEDULED';game.currentStage=mode==='SECOND_WORK'?'artbook-second-work':'artbook-department-review';
writeJson('artbook-submission-queue.json',queue);
const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`;
if(!fs.existsSync(workOrderPath)){
 const mk=(owner,scope,deliverable)=>({owner,scope,deliverable,submissionPath:`artbook-submissions/${gameId}/${date}/${owner}.json`,mayWriteOtherSections:false,status:mode==='SECOND_WORK'?(secondWork.selectedDepartments.includes(owner)?'SECOND_WORK_SCHEDULED':'CARRY_FORWARD_SCHEDULED'):'FREE_LOCAL_AI_SCHEDULED'});
 const workOrder={version:5,date,mode,gameId,gameName:game.name||gameId,status:mode==='SECOND_WORK'?'NEXT_DAY_SECOND_WORK_SCHEDULED':'FREE_LOCAL_DEPARTMENT_RUNNERS_SCHEDULED',finalSubmissionLimitToday:1,styleProfile:game.styleProfile||'',sourceEvidence:[`web-games/${gameId} (read-only)`,`unity-games/${gameId} (if present)`,'existing build/test/error records'],departmentTasks:{planning:mk('planning','스토리·세계관·캐릭터 동기·사건 인과','story-world-causality-section'),graphics:mk('graphics','캐릭터·몬스터·보스·배경·UI·로고·인트로 컨셉','visual-concept-section'),development:mk('development','실제 구현 구조·기술 가능성·플레이어블 시연 구조','implementation-demo-section'),qa:mk('qa','플레이 흐름·문제 장면·테스트 시나리오·검증 결과','player-flow-test-section'),balance:mk('balance','성장곡선·전투 체감·보상·난이도','progression-combat-feel-section')},runnerDispatch:{requestedRunner:'vibe2-local-open-model-department-bots',workflow:'.github/workflows/artbook-free-department-bots.yml',modelPrimary:'qwen3:0.6b',modelLicense:'Apache-2.0',execution:'github-hosted-ubuntu-local-inference',paidApi:false,apiKeyRequired:false,readsOtherDepartmentSubmissions:false,fallbackGhostwritingAllowed:false},collaboration:{enabled:true,reviewProtocol:'PEER_IMPROVEMENT_STAR_5',eachReviewerRatesOtherFour:true,selfRatingForbidden:true,oneImprovementPerTarget:true,starMax:5,crossDepartmentGhostwriting:false,directorMayOnlyAssemble:true},secondWork,completionGate:{allFiveSectionsRequired:true,allFiveReviewsRequired:true,verifiedOrExplicitlyUnverifiedEvidenceRequired:true,uniformTemplateForbidden:true,readyForDirectorAssembly:false}};
 writeJson(workOrderPath,workOrder);
}
writeJson('artbook-daily-context.json',{date,run:true,mode,gameId,gameName:game.name||gameId,workOrderPath,sourceDate:secondWork?.sourceDate||null,secondWorkDepartments:secondWork?.selectedDepartments||[]});
console.log(`ARTBOOK_DAILY_TARGET=${gameId}`);console.log(`ARTBOOK_DAILY_MODE=${mode}`);if(secondWork)console.log(`ARTBOOK_SECOND_WORK_DEPARTMENTS=${secondWork.selectedDepartments.join(',')}`);console.log(`ARTBOOK_WORK_ORDER=${workOrderPath}`);console.log('DAILY_FINAL_LIMIT=1');
