// 파일명: tools/vibe2-neural-diagnosis.mjs
// 역할: 기존 웨이브 실행을 유지한 채 task의 사실/가설/원인/책임/병목/억제조건을 결정론적으로 계산하는 1단계 neural shadow 진단층.

const clean=value=>String(value??'').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));

function evidenceRows(task={},project={}){
  return uniq([
    ...(Array.isArray(task.evidence)?task.evidence:[]),
    ...(Array.isArray(project?.developmentValidation?.blockers)?project.developmentValidation.blockers.map(x=>'development-validation-blocker:'+clean(x)):[]),
    clean(project?.queueCurrentStep)?'queue-step:'+clean(project.queueCurrentStep):'',
    clean(project?.queueCanonicalState)?'queue-state:'+clean(project.queueCanonicalState):'',
    clean(project?.queueVibeWebRequestedStage)?'requested-stage='+clean(project.queueVibeWebRequestedStage):'',
    clean(project?.queueVibeWebImplementationReason)?'implementation-reason='+clean(project.queueVibeWebImplementationReason):'',
    ...(Array.isArray(project?.queueRoutingBlockers)?project.queueRoutingBlockers.map(x=>'routing-blocker='+clean(x)):[]),
    ...(Array.isArray(project?.queueStrictImplementationHardFailures)?project.queueStrictImplementationHardFailures.map(x=>'strict-hard-failure='+clean(x)):[])
  ]);
}

function explicitFact(row=''){
  const value=clean(row);
  return /^(?:central-policy:|release-state:|source-root:|web-stage:|company-runtime-state:|recovery-exact-stage:|requested-stage=|implementation-reason=|routing-blocker=|strict-hard-failure=|development-validation-blocker:|queue-step:|queue-state:|last-validation-at=|supervised-web-build:required|automatic-promotion:blocked-until-supervised-approval|development-baseline:)/i.test(value);
}

function failureStage(rows=[],task={}){
  for(const prefix of ['recovery-exact-stage:','web-stage:','requested-stage=','queue-step:']){
    const row=rows.find(value=>value.startsWith(prefix));
    if(row)return clean(row.slice(prefix.length)).replace(/^VIBE_/,'');
  }
  const blocker=clean(task.blocker);
  if(blocker)return blocker;
  return null;
}

function hypothesisCandidates(text=''){
  const rows=[];
  const add=(id,system,confidence,evidencePattern,reason)=>{
    if(evidencePattern.test(text))rows.push({id,system,confidence:clamp(confidence),reason});
  };
  add('validator-classification-or-contract','VALIDATOR',0.92,/VALIDATOR|CLASSIFICATION|FALSE[_ -]?POSITIVE|SCOPE[_:-].*REQUIRED|APPROVED_SCOPE/i,'검증 분류·scope 계약이 실제 게임 요구와 어긋났을 가능성');
  add('runtime-gameplay-cycle','GAME_RUNTIME',0.9,/COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_REQUIRED|RUN_RESULT_STATE_REQUIRED|WIN_CONDITION_REQUIRED|LOSS_CONDITION_REQUIRED|REAL_GAME_MECHANIC_COUNT_TOO_LOW|REAL_GAME_SYSTEM_COUNT_REQUIRED/i,'실제 플레이 사이클 또는 결과 상태 연결 누락 가능성');
  add('runtime-input-binding','GAME_INPUT',0.9,/MOBILE_TOUCH_ACTION_NOT_CONNECTED|TOWER_POSITION_INPUT_REQUIRED|POINTER|TOUCH|INPUT_REQUIRED/i,'입력이 실제 상태 변화 또는 배치 책임 함수에 연결되지 않았을 가능성');
  add('runtime-spatial-state','GAME_RUNTIME',0.88,/REAL_SPATIAL_STATE_REQUIRED|REAL_ENTITY_INTERACTION_REQUIRED|COLLISION_RUNTIME_REQUIRED|PLAYER_XY_MOVEMENT_REQUIRED|VISUAL_MOVEMENT_REQUIRED/i,'실제 런타임 공간 상태/엔티티 상호작용 증거가 부족할 가능성');
  add('audio-runtime-binding','GAME_AUDIO',0.86,/MUSIC_MUTE_CONTROL_REQUIRED|MUSIC_VOLUME_CONTROL_REQUIRED|AUDIO/i,'오디오 UI와 실제 오디오 상태 연결 누락 가능성');
  add('source-generation-path','SOURCE_GENERATION',0.86,/SOURCE_CANDIDATE_GENERATION_FAILED|MALFORMED_OUTPUT|EDIT_MATCH|NO_OP|TIMEOUT/i,'모델 출력 형식·anchor·generation 경로 문제 가능성');
  add('pipeline-or-runner','INFRA',0.82,/WORKFLOW|RUNNER|CHECKOUT|ARTIFACT|CI_FAILURE|INFRA/i,'게임 코드가 아닌 실행 인프라 또는 CI 경로 문제 가능성');
  add('save-compatibility','SAVE_SYSTEM',0.9,/SAVE|LOCALSTORAGE|PERSIST|RESTORE/i,'저장키·저장 의미·복구 경로 호환성 문제 가능성');
  if(!rows.length)rows.push({id:'responsible-system-unknown',system:'UNKNOWN',confidence:0.35,reason:'명시적 실패 시그니처가 충분하지 않아 추가 증거 필요'});
  return rows
    .sort((a,b)=>b.confidence-a.confidence||a.id.localeCompare(b.id))
    .slice(0,6);
}

function responsibility(hypotheses=[]){
  const scores=new Map();
  for(const h of hypotheses)scores.set(h.system,(scores.get(h.system)||0)+Number(h.confidence||0));
  const ranked=[...scores.entries()]
    .map(([system,score])=>({system,score}))
    .sort((a,b)=>b.score-a.score||a.system.localeCompare(b.system));
  const top=ranked[0]||{system:'UNKNOWN',score:.1};
  const total=Math.max(.0001,ranked.reduce((sum,row)=>sum+row.score,0));
  return{
    system:top.system,
    confidence:clamp(top.score/total),
    alternatives:ranked.slice(1,4).map(row=>({system:row.system,confidence:clamp(row.score/total)}))
  };
}

function downstreamDepth(text=''){
  if(/DESIGN|BASELINE_PROMOTION/i.test(text))return 6;
  if(/WEB_REPAIR|WEB_RUNTIME|VALIDATION|COMPLETE_PLAYABLE|STRICT/i.test(text))return 5;
  if(/PLATFORM|BUILD|PACKAGE|TARGET_RUNTIME/i.test(text))return 4;
  if(/QA|REGRESSION|REVIEW/i.test(text))return 3;
  return 2;
}

function recurrenceSignal(rows=[]){
  const text=rows.join('|').toUpperCase();
  if(/REFRESHED|RETRY|REQUEUE|REPEATED|HISTORICAL/.test(text))return 2;
  if(/FAIL|BLOCKER|REQUIRED/.test(text))return 1;
  return 0;
}

function sharedScopeSignal(responsibilitySystem='',text=''){
  if(['VALIDATOR','INFRA','SOURCE_GENERATION'].includes(responsibilitySystem))return 3;
  if(/COMMON|SHARED|GLOBAL|CENTRAL/.test(text))return 2;
  return 1;
}

function bottleneck({rows=[],task={},hypotheses=[],responsibility:owner}={}){
  const text=[clean(task.goal),clean(task.blocker),clean(task.lastOutcome),...rows].join('|').toUpperCase();
  const depth=downstreamDepth(text);
  const recurrence=recurrenceSignal(rows);
  const sharedScope=sharedScopeSignal(owner?.system,text);
  const priority=clean(task.priority).toLowerCase()==='owner-immediate'?3:clean(task.priority).toLowerCase()==='high'?2:1;
  const evidenceConfidence=hypotheses.length?Math.max(...hypotheses.map(row=>row.confidence)):0.3;
  const score=Math.min(100,Math.round(
    depth*10+
    recurrence*10+
    sharedScope*8+
    priority*6+
    evidenceConfidence*12
  ));
  return{
    score,
    components:{downstreamDepth:depth,recurrence,sharedScope,priority,evidenceConfidence:Number(evidenceConfidence.toFixed(3))},
    advisoryOnly:true,
    mayReorderWave:false
  };
}

function inhibitors(task={},rows=[]){
  const text=[clean(task.blocker),clean(task.lastOutcome),...rows].join('|').toUpperCase();
  const out=[];
  if(task?.supervisionContract?.required===true&&task?.supervisionApproved!==true)out.push('SUPERVISOR_PASS_REQUIRED_BUT_MISSING');
  if(rows.includes('automatic-promotion:blocked-until-supervised-approval'))out.push('SUPERVISOR_PASS_REQUIRED_BUT_MISSING');
  if(/CENTRAL_POLICY_(?:STALE|INVALID)|STALE[_ -]?CONTEXT/.test(text))out.push('CENTRAL_POLICY_STALE_OR_INVALID');
  if(/LIFECYCLE-INACTIVE|PRODUCTION-AUTHORITY-INACTIVE/.test(text))out.push('PRODUCTION_AUTHORITY_INACTIVE');
  if(/SECURITY.*(?:BLOCK|QUARANTINE)|QUARANTINE/.test(text))out.push('SECURITY_POLICY_BLOCK');
  if(task?.protectedChange===true&&task?.requiresOwnerDecision===true)out.push('PROTECTED_CHANGE_OWNER_DECISION_REQUIRED');
  return uniq(out);
}

export function buildNeuralDiagnosis({task={},project={}}={}){
  const rows=evidenceRows(task,project);
  const facts=rows.filter(explicitFact).map((value,index)=>({
    id:`fact-${index+1}`,
    value,
    source:'TASK_OR_RUNTIME_EVIDENCE',
    verified:true
  }));
  const text=[clean(task.goal),clean(task.blocker),clean(task.lastOutcome),...rows].join('|');
  const hypotheses=hypothesisCandidates(text);
  const owner=responsibility(hypotheses);
  const blocker=bottleneck({rows,task,hypotheses,responsibility:owner});
  const hardInhibitors=inhibitors(task,rows);
  const stage=failureStage(rows,task);
  const causalEdges=hypotheses.slice(0,4).map((hypothesis,index)=>({
    from:hypothesis.id,
    to:stage||'TASK_GOAL',
    relation:'POSSIBLE_CAUSE_OF',
    confidence:hypothesis.confidence,
    verified:false,
    rank:index+1
  }));
  return{
    version:1,
    mode:'PHASE1_SHADOW_ADVISORY',
    authority:'DIAGNOSIS_ONLY_NO_EXECUTION_AUTHORITY',
    facts,
    hypotheses,
    causalEdges,
    responsibility:owner,
    bottleneck:blocker,
    inhibitors:hardInhibitors,
    actionRecommendation:{
      mode:'EXACT_FAILURE_STAGE_REPAIR',
      failureStage:stage,
      responsibleSystem:owner.system,
      preserveAlreadyPassedStages:true,
      restartFromBeginning:false,
      automaticScopeExpansion:false,
      blocked:hardInhibitors.length>0,
      blocker:hardInhibitors[0]||null
    },
    learning:{
      eligible:false,
      reason:'SHADOW_DIAGNOSIS_REQUIRES_POST_QA_ROOT_CAUSE_VERIFICATION'
    },
    waveControl:{
      currentWaveSchedulerRemainsAuthoritative:true,
      mayReorderWave:false,
      mayCreateWorker:false
    }
  };
}

export function neuralDiagnosisGuidance(diagnosis={}){
  if(!diagnosis||diagnosis.mode!=='PHASE1_SHADOW_ADVISORY')return'';
  const top=(diagnosis.hypotheses||[])[0];
  return[
    '[NEURAL DIAGNOSIS SHADOW MODE]',
    `responsibility=${diagnosis.responsibility?.system||'UNKNOWN'} confidence=${Number(diagnosis.responsibility?.confidence||0).toFixed(2)}`,
    `bottleneck-score=${diagnosis.bottleneck?.score||0} advisory-only=YES`,
    `failure-stage=${diagnosis.actionRecommendation?.failureStage||'UNKNOWN'}`,
    top?`top-hypothesis=${top.id} confidence=${Number(top.confidence||0).toFixed(2)}`:'',
    diagnosis.inhibitors?.length?`hard-inhibitors=${diagnosis.inhibitors.join(',')}`:'',
    'This diagnosis is evidence guidance only. Existing task scope, central policy, locks, QA, supervision, and wave scheduling remain authoritative.',
    'Do not patch a validator problem by faking gameplay, and do not hide a real game defect by weakening validation.'
  ].filter(Boolean).join('\n');
}
