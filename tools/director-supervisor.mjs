// 파일명: tools/director-supervisor.mjs
// 역할: 총괄이 직원별 업무 배정, 실제 실행 증거, 결과, 중단 직접 원인을 점검한다.
// 원칙: 상태표의 running 문자열만으로 근무를 인정하지 않으며 부서 전문 결과물을 대신 작성하지 않는다.
import fs from 'node:fs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const readText=file=>{try{return fs.readFileSync(file,'utf8');}catch{return'';}};
const exists=file=>fs.existsSync(file);
const roles=['planning','development','qa','graphics','balance'];
const allDepartments=[...roles,'homepage','release','director'];

function kstDate(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const queue=readJson('artbook-submission-queue.json',{});
const company=readJson('company-status.json',{});
const homepage=readJson('homepage-manager-status.json',null);
const actionsPath=process.argv[2]||'';
const jobsPath=process.argv[3]||'';
const failedLogsDir=process.argv[4]||'';
const actions=actionsPath?readJson(actionsPath,{workflow_runs:[]}):{workflow_runs:[]};
const jobsPacket=jobsPath?readJson(jobsPath,{jobs:[]}):{jobs:[]};
const runs=Array.isArray(actions?.workflow_runs)?actions.workflow_runs:[];
const jobs=Array.isArray(jobsPacket?.jobs)?jobsPacket.jobs:[];
const date=kstDate();
const activeGameId=queue.currentDailyTarget||'';
const activeGame=(queue.games||[]).find(g=>g.gameId===activeGameId)||{};
const submitted=new Set(activeGame.submitted||activeGame.sectionsReady||[]);
const workOrder=`artbook-work-orders/${date}-${activeGameId}.json`;
const workOrderExists=Boolean(activeGameId&&exists(workOrder));
const activeUnityDir=activeGameId?`unity-games/${activeGameId}`:'';
const activeWebDir=activeGameId?`web-games/${activeGameId}`:'';
const runnerText=exists('tools/artbook-department-runner.mjs')?readText('tools/artbook-department-runner.mjs'):'';
const runnerUnityCentric=runnerText.includes("const root=`unity-games/${gameId}/Assets/Scripts`");
const evidenceAdapterMismatch=Boolean(activeGameId&&exists(activeWebDir)&&!exists(activeUnityDir)&&runnerUnityCentric);

function latestRun(nameFragment){
  const key=String(nameFragment).toLowerCase();
  return runs
    .filter(r=>String(r.name||r.workflow_name||'').toLowerCase().includes(key))
    .sort((a,b)=>new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0))[0]||null;
}
function latestRoleJob(role,run){
  if(!run)return null;
  return jobs
    .filter(j=>Number(j.run_id)===Number(run.id)&&String(j.name||'').toLowerCase()===`round1 (${role})`)
    .sort((a,b)=>new Date(b.completed_at||b.started_at||b.created_at||0)-new Date(a.completed_at||a.started_at||a.created_at||0))[0]||null;
}
function runEvidence(run){
  if(!run)return null;
  return {id:run.id||null,status:run.status||null,conclusion:run.conclusion||null,event:run.event||null,createdAt:run.created_at||null,updatedAt:run.updated_at||null,htmlUrl:run.html_url||null};
}
function jobEvidence(job){
  if(!job)return null;
  const failedStep=(job.steps||[]).find(s=>s.conclusion==='failure');
  return {id:job.id||null,name:job.name||null,status:job.status||null,conclusion:job.conclusion||null,failedStep:failedStep?.name||null,startedAt:job.started_at||null,completedAt:job.completed_at||null,htmlUrl:job.html_url||null};
}
function roleFailureLog(role){
  if(!failedLogsDir)return'';
  return readText(`${failedLogsDir.replace(/\/$/,'')}/${role}.log`);
}
function detectDirectCause(log){
  const text=String(log||'');
  if(!text.trim())return null;
  if(/Unexpected end of JSON input|JSON\.parse.*unexpected end|unterminated.*json/i.test(text))return{code:'LOCAL_MODEL_JSON_TRUNCATED',detail:'로컬 모델 응답 JSON이 끝까지 닫히지 않아 파싱 실패',action:'짧은 완결 JSON 재시도 경로를 사용하고 재발 여부를 확인'};
  if(/ARTBOOK_LOCAL_MODEL_ERROR=.*ollama|connection refused.*11434|could not connect.*11434/i.test(text))return{code:'LOCAL_MODEL_UNAVAILABLE',detail:'로컬 Ollama 호출 또는 연결 실패',action:'Ollama 실행·모델 로드 상태를 복구한 뒤 재실행'};
  if(/timed out|timeout|job exceeded.*time/i.test(text))return{code:'TIMEOUT',detail:'작업 제한시간 또는 모델 응답시간 초과',action:'병목 단계를 확인하고 입력·출력 범위 또는 작업 제한시간을 조정'};
  if(/No space left on device/i.test(text))return{code:'RUNNER_STORAGE_FULL',detail:'실행기 저장공간 부족',action:'불필요 캐시/아티팩트를 정리하고 재실행'};
  if(/Resource not accessible by integration|permission denied|HTTP 403|status 403/i.test(text))return{code:'PERMISSION_BLOCKED',detail:'GitHub 작업 권한 또는 리소스 접근 차단',action:'필요 최소 권한을 확인·수정한 뒤 재실행'};
  if(/20110|serial invalid|Unity.*license.*invalid/i.test(text))return{code:'UNITY_LICENSE_INVALID',detail:'Unity 라이선스 검증 실패',action:'유효한 Unity Personal 라이선스 근거를 확인한 뒤 빌드 재실행'};
  if(/SyntaxError|TypeError|ReferenceError|Error:/i.test(text))return{code:'UNCLASSIFIED_JOB_ERROR',detail:'실패 로그에 코드/런타임 오류가 있으나 자동 분류 규칙에 아직 없음',action:'실패 로그의 마지막 오류를 검토하고 원인 분류 규칙을 보강'};
  return{code:'UNCLASSIFIED_FAILURE_LOG',detail:'실패 로그는 확보했지만 알려진 원인 패턴과 일치하지 않음',action:'로그를 검토해 직접 원인과 재발방지 규칙을 추가'};
}
function classifyArtbookRole(role,run){
  const roleJob=latestRoleJob(role,run);
  const log=roleFailureLog(role);
  const directCause=detectDirectCause(log);
  const evidence=[];
  const blockers=[];
  if(workOrderExists)evidence.push(`work-order:${workOrder}`);
  if(submitted.has(role))evidence.push(`queue-submission:${role}`);
  if(run)evidence.push(`workflow:${run.id}:${run.status}:${run.conclusion||'pending'}`);
  if(roleJob)evidence.push(`job:${roleJob.id}:${roleJob.status}:${roleJob.conclusion||'pending'}`);
  if(log)evidence.push(`failed-job-log:${role}`);
  if(!workOrderExists)blockers.push('NO_WORK_ORDER');
  if(evidenceAdapterMismatch)blockers.push('EVIDENCE_ADAPTER_MISMATCH');

  let status='BLOCKED';
  let reason='assigned artbook work has no verified completion evidence';
  let action='fix operational blocker, then re-run department workflow';
  if(submitted.has(role)){
    status='DONE'; reason='department submission is recorded for the active daily target'; action='hold for collaboration/gate verification';
  }else if(roleJob?.status==='in_progress'||roleJob?.status==='queued'){
    status='WORKING'; reason='this department job is currently executing'; action='check department output after job completes';
  }else if(roleJob?.conclusion==='failure'){
    status='FAILED'; blockers.push('WORKFLOW_FAILED');
    if(directCause?.code)blockers.push(directCause.code);
    const failedStep=(roleJob.steps||[]).find(s=>s.conclusion==='failure')?.name;
    reason=directCause?.detail||`this department job failed${failedStep?` at ${failedStep}`:''}`;
    action=directCause?.action||'inspect this department job log, fix the direct cause, then retry';
  }else if(roleJob?.conclusion==='success'&&run?.conclusion&&run.conclusion!=='success'){
    status='BLOCKED'; blockers.push('DEPENDENCY_BLOCKED');
    reason='this department completed its independent round, but the overall artbook workflow stopped because another department/downstream dependency failed';
    action='preserve this successful department result and unblock the failed dependency';
  }else if(roleJob?.conclusion==='success'&&run?.conclusion==='success'){
    status='BLOCKED'; blockers.push('OUTPUT_MISSING'); reason='this department job succeeded but active queue has no recorded final submission'; action='inspect artifact/finalize/commit path';
  }else if(run?.status==='in_progress'||run?.status==='queued'){
    status='WORKING'; reason='artbook workflow is active and this role job has not completed yet'; action='check role job evidence when the same workflow completes';
  }else if(!workOrderExists){
    reason='active daily target has no matching work order, so department automation skips';
  }else if(run?.conclusion&&run.conclusion!=='success'){
    status='BLOCKED'; blockers.push('DEPENDENCY_BLOCKED'); reason='overall workflow failed before this department produced a conclusive job result'; action='inspect failed dependency and rerun';
  }
  return {department:role,taskAssigned:true,status,task:`${activeGameId||'NO_TARGET'} daily artbook section`,executionEvidence:evidence,resultVerified:submitted.has(role),jobEvidence:jobEvidence(roleJob),directCause,blockers:[...new Set(blockers)],reason,action};
}

const artbookRun=latestRun('Free Artbook Department Bots');
const homepageRun=latestRun('Homepage Manager');
const unityBuildRun=latestRun('Unity Hybrid Android Build');
const unityRuntimeRun=latestRun('Unity Android Runtime Smoke');
const publicHealthRun=latestRun('Public Game Health');
const staff={};
for(const role of roles)staff[role]=classifyArtbookRole(role,artbookRun);

{
  const evidence=[]; const blockers=[];
  const homepagePolicy=company?.policy?.homepageOperations||{};
  const runtimeSyncActive=homepagePolicy.runtimeDataSync===true&&homepagePolicy.diagnosticOnly===true&&homepagePolicy.autoMaintenance===false;
  if(homepage)evidence.push('homepage-manager-status.json:snapshot-only');
  if(runtimeSyncActive)evidence.push('company-status:homepage-runtime-sync-active');
  if(homepageRun)evidence.push(`workflow:${homepageRun.id}:${homepageRun.status}:${homepageRun.conclusion||'pending'}`);
  if(publicHealthRun)evidence.push(`public-health:${publicHealthRun.id}:${publicHealthRun.status}:${publicHealthRun.conclusion||'pending'}`);

  let taskAssigned=false;
  let status='IDLE_NO_TASK';
  let reason=runtimeSyncActive
    ? 'homepage latest-data sync is handled by runtime JSON refresh; Homepage Manager is diagnostic-only and has no standing worker task'
    : 'homepage diagnostic tool has no active task';
  let action='none';
  let resultVerified=runtimeSyncActive;

  if(homepageRun?.status==='in_progress'||homepageRun?.status==='queued'){
    taskAssigned=true;status='WORKING';reason='Homepage Manager diagnostic workflow is executing';action='verify diagnostics after completion';resultVerified=false;
  }else if(homepageRun?.conclusion==='failure'){
    taskAssigned=true;status='FAILED';blockers.push('WORKFLOW_FAILED');reason='latest Homepage Manager diagnostic workflow failed';action='inspect and fix Homepage Manager diagnostics';resultVerified=false;
  }else if(homepageRun?.conclusion==='success'){
    taskAssigned=true;status='DONE';reason='latest Homepage Manager diagnostic workflow completed successfully; runtime JSON sync remains separate';action='none';resultVerified=true;
  }else if(!runtimeSyncActive){
    taskAssigned=true;status='BLOCKED';blockers.push('RUNTIME_SYNC_POLICY_MISMATCH');reason='homepage runtime sync policy is not aligned with diagnostic-only operation';action='align company homepage policy';resultVerified=false;
  }

  staff.homepage={department:'homepage',taskAssigned,status,task:taskAssigned?'homepage diagnostics':'no standing homepage worker task; runtime data sync is automatic',executionEvidence:evidence,resultVerified,blockers,reason,action};
}

{
  const builds=Array.isArray(company.testBuilds)?company.testBuilds:[];
  const latestBuild=[...builds].sort((a,b)=>new Date(b.builtAt||0)-new Date(a.builtAt||0))[0]||null;
  const buildStatus=String(latestBuild?.status||'').toLowerCase();
  const artifactVerified=Boolean(
    latestBuild&&
    ['ready','released','done'].includes(buildStatus)&&
    String(latestBuild.release||'').trim()&&
    String(latestBuild.download||'').trim()&&
    /^[a-f0-9]{64}$/i.test(String(latestBuild.sha256||''))&&
    Number(latestBuild.bytes)>0&&
    String(latestBuild.builtAt||'').trim()
  );
  const evidence=[];
  const blockers=[];
  if(latestBuild)evidence.push(`company-status:test-build:${latestBuild.requestId||latestBuild.gameId||'unknown'}:${buildStatus||'unknown'}`);
  if(artifactVerified){
    evidence.push(`release:${latestBuild.release}`);
    evidence.push(`download:${latestBuild.download}`);
    evidence.push(`sha256:${latestBuild.sha256}`);
    evidence.push(`bytes:${latestBuild.bytes}`);
  }
  if(unityBuildRun)evidence.push(`unity-build-workflow:${unityBuildRun.id}:${unityBuildRun.status}:${unityBuildRun.conclusion||'pending'}`);
  if(unityRuntimeRun)evidence.push(`unity-runtime-workflow:${unityRuntimeRun.id}:${unityRuntimeRun.status}:${unityRuntimeRun.conclusion||'pending'}`);

  let taskAssigned=Boolean(latestBuild||unityBuildRun||unityRuntimeRun);
  let status='IDLE_NO_TASK';
  let reason='no active build or release evidence exists';
  let action='none';
  let resultVerified=false;

  if(unityBuildRun?.status==='in_progress'||unityBuildRun?.status==='queued'){
    status='WORKING';reason='Unity build workflow is executing';action='verify APK artifact after build completion';
  }else if(unityBuildRun?.conclusion==='failure'&&!artifactVerified){
    status='FAILED';blockers.push('BUILD_WORKFLOW_FAILED');reason='latest Unity build workflow failed and no verified test release artifact supersedes it';action='inspect Unity build failure';
  }else if(artifactVerified){
    status='DONE';reason='test APK release evidence is complete: release URL, download URL, SHA-256, non-empty bytes and build timestamp are present';action=unityRuntimeRun?.conclusion==='success'?'none':'runtime QA remains tracked separately from release artifact verification';resultVerified=true;
  }else if(latestBuild){
    status='BLOCKED';blockers.push('RELEASE_EVIDENCE_INCOMPLETE');reason='test build record exists but release/download/hash/non-empty artifact evidence is incomplete';action='complete release artifact evidence';
  }else if(unityRuntimeRun?.conclusion==='failure'){
    status='BLOCKED';blockers.push('RUNTIME_QA_FAILED');reason='Unity runtime smoke failed without a current verified release artifact';action='inspect runtime smoke evidence';
  }

  staff.release={department:'release',taskAssigned,status,task:taskAssigned?'verify active build/release evidence':'no active verified release task',executionEvidence:evidence,resultVerified,blockers,reason,action};
}

staff.director={department:'director',taskAssigned:true,status:'WORKING',task:'supervise staff execution, blockers, direct causes and verification',executionEvidence:['tools/director-supervisor.mjs'],resultVerified:true,blockers:[],reason:'current supervisor check is executing from repository evidence',action:'record findings and resolve operational blockers without ghostwriting department work'};

for(const name of allDepartments){if(!staff[name])throw new Error(`missing department supervision record: ${name}`);}
const counts={WORKING:0,DONE:0,IDLE_NO_TASK:0,BLOCKED:0,FAILED:0,STALE:0};
for(const item of Object.values(staff))counts[item.status]=(counts[item.status]||0)+1;
const attention=Object.values(staff).filter(x=>['BLOCKED','FAILED','STALE'].includes(x.status));

const report={
  version:4,
  dateKst:date,
  directorRole:'staff-supervisor-not-substitute-worker',
  activeDailyTarget:activeGameId||null,
  checks:{
    staffChecked:`${allDepartments.length}/${allDepartments.length}`,
    activeWorkOrder:workOrderExists?workOrder:null,
    activeWorkOrderExists:workOrderExists,
    evidenceAdapterMismatch,
    jobLevelEvidenceUsed:jobs.length>0,
    failureLogsUsed:Boolean(failedLogsDir),
    runningLabelAloneCountsAsWork:false,
    directorMayGhostwriteMissingDepartmentWork:false,
    homepageDiagnosticOnlyRecognized:true,
    releaseArtifactEvidenceAdapterRegistered:true
  },
  counts,
  attentionRequired:attention.length>0,
  primaryFindings:[
    ...(!workOrderExists&&activeGameId?[`NO_WORK_ORDER:${workOrder}`]:[]),
    ...(evidenceAdapterMismatch?['EVIDENCE_ADAPTER_MISMATCH:artbook runner is Unity-script-centric while active target has Web archive evidence and no Unity project']:[]),
    ...attention.flatMap(x=>x.blockers.map(b=>`${x.department}:${b}`))
  ],
  workflowEvidence:{
    artbook:runEvidence(artbookRun),
    homepage:runEvidence(homepageRun),
    publicGameHealth:runEvidence(publicHealthRun),
    unityBuild:runEvidence(unityBuildRun),
    unityRuntime:runEvidence(unityRuntimeRun)
  },
  staff,
  policy:{
    findWhyWorkStopped:true,
    inspectFailedJobLogs:true,
    distinguishIndividualFailureFromBlockedPeers:true,
    falseRunningForbidden:true,
    idleWithoutTaskIsNotFailure:true,
    homepageDiagnosticToolIsNotStandingWorker:true,
    verifiedReleaseArtifactCanSatisfyReleaseEvidence:true,
    fixLowRiskOperationalBlockers:true,
    escalateCoreDecisions:true,
    directorIntegrationOnlyForDepartmentContent:true
  }
};

fs.writeFileSync('director-supervision-status.json',JSON.stringify(report,null,2)+'\n');
console.log(`STAFF_CHECK=${allDepartments.length}/${allDepartments.length}`);
console.log(`DIRECTOR_ATTENTION=${report.attentionRequired?'YES':'NO'}`);
console.log(`ACTIVE_WORK_ORDER=${workOrderExists?'FOUND':'MISSING'}`);
console.log(`JOB_LEVEL_EVIDENCE=${jobs.length?'YES':'NO'}`);
console.log(`FAILURE_LOG_EVIDENCE=${failedLogsDir?'YES':'NO'}`);
console.log(`EVIDENCE_ADAPTER_MISMATCH=${evidenceAdapterMismatch?'YES':'NO'}`);
console.log(`HOMEPAGE_DIAGNOSTIC_ONLY=${report.checks.homepageDiagnosticOnlyRecognized?'YES':'NO'}`);
console.log(`RELEASE_EVIDENCE_ADAPTER=${report.checks.releaseArtifactEvidenceAdapterRegistered?'YES':'NO'}`);
for(const [k,v] of Object.entries(counts))console.log(`STAFF_${k}=${v}`);
for(const finding of report.primaryFindings)console.log(`DIRECTOR_FINDING=${finding}`);