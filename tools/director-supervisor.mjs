// 파일명: tools/director-supervisor.mjs
// 역할: 총괄이 직원별 업무 배정, 실제 실행 증거, 결과, 차단 원인을 점검한다.
// 원칙: 상태표의 running 문자열만으로 근무를 인정하지 않으며 부서 전문 결과물을 대신 작성하지 않는다.
import fs from 'node:fs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const exists=file=>fs.existsSync(file);
const roles=['planning','development','qa','graphics','balance'];
const allDepartments=[...roles,'homepage','release','director'];

function kstDate(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const directive=readJson('company-directive.json',{});
const queue=readJson('artbook-submission-queue.json',{});
const company=readJson('company-status.json',{});
const homepage=readJson('homepage-manager-status.json',null);
const actionsPath=process.argv[2]||'';
const actions=actionsPath?readJson(actionsPath,{workflow_runs:[]}):{workflow_runs:[]};
const runs=Array.isArray(actions?.workflow_runs)?actions.workflow_runs:[];
const date=kstDate();
const activeGameId=queue.currentDailyTarget||'';
const activeGame=(queue.games||[]).find(g=>g.gameId===activeGameId)||{};
const submitted=new Set(activeGame.submitted||activeGame.sectionsReady||[]);
const workOrder=`artbook-work-orders/${date}-${activeGameId}.json`;
const workOrderExists=Boolean(activeGameId&&exists(workOrder));
const activeUnityDir=activeGameId?`unity-games/${activeGameId}`:'';
const activeWebDir=activeGameId?`web-games/${activeGameId}`:'';
const runnerText=exists('tools/artbook-department-runner.mjs')?fs.readFileSync('tools/artbook-department-runner.mjs','utf8'):'';
const runnerUnityCentric=runnerText.includes("const root=`unity-games/${gameId}/Assets/Scripts`");
const evidenceAdapterMismatch=Boolean(activeGameId&&exists(activeWebDir)&&!exists(activeUnityDir)&&runnerUnityCentric);

function latestRun(nameFragment){
  const key=String(nameFragment).toLowerCase();
  return runs
    .filter(r=>String(r.name||r.workflow_name||'').toLowerCase().includes(key))
    .sort((a,b)=>new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0))[0]||null;
}
function runEvidence(run){
  if(!run)return null;
  return {id:run.id||null,status:run.status||null,conclusion:run.conclusion||null,event:run.event||null,createdAt:run.created_at||null,updatedAt:run.updated_at||null,htmlUrl:run.html_url||null};
}
function classifyArtbookRole(role,run){
  const evidence=[];
  const blockers=[];
  if(workOrderExists)evidence.push(`work-order:${workOrder}`);
  if(submitted.has(role))evidence.push(`queue-submission:${role}`);
  if(run)evidence.push(`workflow:${run.id}:${run.status}:${run.conclusion||'pending'}`);
  if(!workOrderExists)blockers.push('NO_WORK_ORDER');
  if(evidenceAdapterMismatch)blockers.push('EVIDENCE_ADAPTER_MISMATCH');

  let status='BLOCKED';
  let reason='assigned artbook work has no verified completion evidence';
  let action='fix operational blocker, then re-run department workflow';
  if(submitted.has(role)){
    status='DONE'; reason='department submission is recorded for the active daily target'; action='hold for collaboration/gate verification';
  }else if(run?.status==='in_progress'||run?.status==='queued'){
    status='WORKING'; reason='department workflow is currently executing'; action='check output after workflow completes';
  }else if(run?.conclusion&&run.conclusion!=='success'&&workOrderExists){
    status='FAILED'; blockers.push('WORKFLOW_FAILED'); reason=`workflow concluded ${run.conclusion}`; action='inspect workflow failure and retry after fix';
  }else if(run?.conclusion==='success'&&workOrderExists){
    status='BLOCKED'; blockers.push('OUTPUT_MISSING'); reason='workflow succeeded but active queue has no department submission'; action='inspect artifact/finalize/commit path';
  }else if(!workOrderExists){
    reason='active daily target has no matching work order, so department automation skips';
  }
  return {department:role,taskAssigned:true,status,task:`${activeGameId||'NO_TARGET'} daily artbook section`,executionEvidence:evidence,resultVerified:submitted.has(role),blockers:[...new Set(blockers)],reason,action};
}

const artbookRun=latestRun('Free Artbook Department Bots');
const homepageRun=latestRun('Homepage Manager');
const staff={};
for(const role of roles)staff[role]=classifyArtbookRole(role,artbookRun);

{
  const evidence=[]; const blockers=[];
  if(homepage)evidence.push('homepage-manager-status.json');
  if(homepageRun)evidence.push(`workflow:${homepageRun.id}:${homepageRun.status}:${homepageRun.conclusion||'pending'}`);
  let status='STALE', reason='homepage status exists but no recent execution evidence was supplied to supervisor', action='run/verify Homepage Manager workflow';
  if(homepageRun?.status==='in_progress'||homepageRun?.status==='queued'){
    status='WORKING';reason='Homepage Manager workflow is executing';action='verify manager status output after completion';
  }else if(homepageRun?.conclusion==='success'&&homepage?.status==='running'){
    status='DONE';reason='homepage manager has a successful workflow run and a running status artifact';action='continue scheduled monitoring';
  }else if(homepageRun?.conclusion&&homepageRun.conclusion!=='success'){
    status='FAILED';blockers.push('WORKFLOW_FAILED');reason=`Homepage Manager concluded ${homepageRun.conclusion}`;action='inspect and fix Homepage Manager workflow';
  }else if(!homepage){
    status='BLOCKED';blockers.push('OUTPUT_MISSING');reason='homepage manager status artifact is missing';action='run Homepage Manager and require status artifact';
  }else if(company?.operations?.homepage?.status==='running'){
    blockers.push('FALSE_RUNNING');
  }
  staff.homepage={department:'homepage',taskAssigned:true,status,task:'homepage compact layout, links, status and mobile maintenance',executionEvidence:evidence,resultVerified:status==='DONE',blockers,reason,action};
}

{
  const releaseTask=Boolean((company.testBuilds||[]).some(x=>!['released','done'].includes(String(x.status||'').toLowerCase())));
  staff.release={department:'release',taskAssigned:releaseTask,status:releaseTask?'BLOCKED':'IDLE_NO_TASK',task:releaseTask?'verify active build/release':'no active verified release task',executionEvidence:[],resultVerified:false,blockers:releaseTask?['DEPENDENCY_BLOCKED']:[],reason:releaseTask?'release/build task exists but no release execution adapter is registered in this supervisor':'no active build awaiting release verification',action:releaseTask?'inspect build and release workflow':'none'};
}

staff.director={department:'director',taskAssigned:true,status:'WORKING',task:'supervise staff execution, blockers and verification',executionEvidence:['tools/director-supervisor.mjs'],resultVerified:true,blockers:[],reason:'current supervisor check is executing from repository evidence',action:'record findings and resolve operational blockers without ghostwriting department work'};

for(const name of allDepartments){if(!staff[name])throw new Error(`missing department supervision record: ${name}`);}
const counts={WORKING:0,DONE:0,IDLE_NO_TASK:0,BLOCKED:0,FAILED:0,STALE:0};
for(const item of Object.values(staff))counts[item.status]=(counts[item.status]||0)+1;
const blocked=Object.values(staff).filter(x=>['BLOCKED','FAILED','STALE'].includes(x.status));

const report={
  version:1,
  dateKst:date,
  directorRole:'staff-supervisor-not-substitute-worker',
  activeDailyTarget:activeGameId||null,
  checks:{
    staffChecked:`${allDepartments.length}/${allDepartments.length}`,
    activeWorkOrder:workOrderExists?workOrder:null,
    activeWorkOrderExists:workOrderExists,
    evidenceAdapterMismatch,
    runningLabelAloneCountsAsWork:false,
    directorMayGhostwriteMissingDepartmentWork:false
  },
  counts,
  attentionRequired:blocked.length>0,
  primaryFindings:[
    ...(!workOrderExists&&activeGameId?[`NO_WORK_ORDER:${workOrder}`]:[]),
    ...(evidenceAdapterMismatch?['EVIDENCE_ADAPTER_MISMATCH:artbook runner is Unity-script-centric while active target has Web archive evidence and no Unity project']:[]),
    ...blocked.flatMap(x=>x.blockers.map(b=>`${x.department}:${b}`))
  ],
  workflowEvidence:{artbook:runEvidence(artbookRun),homepage:runEvidence(homepageRun)},
  staff,
  policy:{
    findWhyWorkStopped:true,
    falseRunningForbidden:true,
    idleWithoutTaskIsNotFailure:true,
    fixLowRiskOperationalBlockers:true,
    escalateCoreDecisions:true,
    directorIntegrationOnlyForDepartmentContent:true
  }
};

fs.writeFileSync('director-supervision-status.json',JSON.stringify(report,null,2)+'\n');
console.log(`STAFF_CHECK=${allDepartments.length}/${allDepartments.length}`);
console.log(`DIRECTOR_ATTENTION=${report.attentionRequired?'YES':'NO'}`);
console.log(`ACTIVE_WORK_ORDER=${workOrderExists?'FOUND':'MISSING'}`);
console.log(`EVIDENCE_ADAPTER_MISMATCH=${evidenceAdapterMismatch?'YES':'NO'}`);
for(const [k,v] of Object.entries(counts))console.log(`STAFF_${k}=${v}`);
for(const finding of report.primaryFindings)console.log(`DIRECTOR_FINDING=${finding}`);
