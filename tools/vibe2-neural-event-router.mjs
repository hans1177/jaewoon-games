// 파일명: tools/vibe2-neural-event-router.mjs
// 역할: Phase 2 권한 부여 전, 이벤트 기반 뉴런 라우팅 결정을 shadow simulation으로 계산한다. 실제 worker 생성/우선순위 변경은 절대 하지 않는다.

const clean=value=>String(value??'').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];

const EVENT_TYPES=new Set([
  'OWNER_DIRECTIVE',
  'SOURCE_CHANGE',
  'WORKER_RESULT',
  'QA_RESULT',
  'CI_RESULT',
  'RUNTIME_RESULT',
  'SUPERVISOR_RESULT',
  'POLICY_CHANGE',
  'RESOURCE_OR_LOCK_CHANGE'
]);

function normalizeEvent(event={}){
  const type=clean(event.type).toUpperCase();
  return{
    id:clean(event.id)||null,
    type:EVENT_TYPES.has(type)?type:'UNKNOWN',
    gameId:clean(event.gameId)||null,
    taskId:clean(event.taskId)||null,
    outcome:clean(event.outcome).toUpperCase()||null,
    stage:clean(event.stage).toUpperCase()||null,
    signature:clean(event.signature)||null,
    evidence:uniq(event.evidence||[])
  };
}

function actionFromState({event,diagnosis,rootCause}={}){
  const rootState=clean(rootCause?.state).toUpperCase();
  if(event.type==='POLICY_CHANGE')return{
    kind:'RECOMPILE_WORK_CONTRACT',
    reason:'CENTRAL_POLICY_CHANGED',
    requiresFreshPolicy:true
  };
  if(event.type==='RESOURCE_OR_LOCK_CHANGE')return{
    kind:'REEVALUATE_DEPENDENCY_AND_LOCKS',
    reason:'RESOURCE_OR_LOCK_STATE_CHANGED'
  };
  if(rootState==='ROOT_CAUSE_VERIFIED')return{
    kind:'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR',
    reason:'VERIFIED_ROOT_CAUSE_AVAILABLE',
    responsibleSystem:clean(rootCause?.responsibleSystem)||null
  };
  if(rootState==='CAUSAL_REPAIR_CONFIRMED_SYSTEM_UNVERIFIED')return{
    kind:'REQUEST_RESPONSIBLE_SYSTEM_VERIFICATION',
    reason:'CAUSAL_REPAIR_CONFIRMED_SYSTEM_UNVERIFIED'
  };
  if(rootState==='CAUSAL_REPAIR_VERIFIED_AWAITING_INDEPENDENT_CONFIRMATION')return{
    kind:'REQUEST_INDEPENDENT_CONFIRMATION',
    reason:'CAUSAL_REPAIR_NEEDS_REGRESSION_AND_REVIEW'
  };
  if((rootCause?.nextEvidenceRequired||[]).length)return{
    kind:'REQUEST_EVIDENCE',
    reason:'ROOT_CAUSE_UNRESOLVED',
    evidenceRequired:uniq(rootCause.nextEvidenceRequired)
  };
  const stage=clean(diagnosis?.actionRecommendation?.failureStage);
  if(stage)return{
    kind:'PREPARE_DIAGNOSTIC_REVALIDATION',
    reason:'SHADOW_DIAGNOSIS_AVAILABLE',
    failureStage:stage
  };
  return{
    kind:'OBSERVE_ONLY',
    reason:'INSUFFICIENT_EVIDENCE'
  };
}

function collectInhibitors({diagnosis,rootCause,policyFresh=true,lockConflict=false,securityBlocked=false}={}){
  const inhibitors=uniq([
    ...(diagnosis?.inhibitors||[]),
    policyFresh===false?'CENTRAL_POLICY_STALE_OR_INVALID':'',
    lockConflict===true?'SOURCE_OR_RESOURCE_LOCK_CONFLICT':'',
    securityBlocked===true?'SECURITY_POLICY_BLOCK':'',
    rootCause?.rootCauseVerified!==true?'ROOT_CAUSE_NOT_VERIFIED':'',
    'PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'
  ]);
  return inhibitors;
}

export function simulateNeuralEventRoute({
  event={},
  diagnosis=null,
  rootCause=null,
  policyFresh=true,
  lockConflict=false,
  securityBlocked=false
}={}){
  const normalizedEvent=normalizeEvent(event);
  const proposedAction=actionFromState({event:normalizedEvent,diagnosis,rootCause});
  const inhibitors=collectInhibitors({diagnosis,rootCause,policyFresh,lockConflict,securityBlocked});
  const wouldFireWithoutPhase2Authority=
    normalizedEvent.type!=='UNKNOWN'
    &&proposedAction.kind!=='OBSERVE_ONLY'
    &&inhibitors.filter(value=>value!=='PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED').length===0;

  return{
    version:1,
    mode:'PHASE2_SHADOW_EVENT_ROUTER',
    event:normalizedEvent,
    proposedAction,
    inhibitors,
    wouldFireWithoutPhase2Authority,
    fireAllowed:false,
    workerCreationAllowed:false,
    queueMutationAllowed:false,
    waveReorderAllowed:false,
    lockAcquisitionAllowed:false,
    policyMutationAllowed:false,
    learningEligible:false,
    authorityPromotionEligible:false,
    comparisonTarget:'CURRENT_WAVE_SCHEDULER_OUTCOME',
    authority:'SIMULATION_ONLY'
  };
}

export function neuralEventRouteEvidence(route={}){
  if(clean(route.mode)!=='PHASE2_SHADOW_EVENT_ROUTER')return[];
  const payload={
    version:1,
    eventType:clean(route?.event?.type)||'UNKNOWN',
    actionKind:clean(route?.proposedAction?.kind)||'OBSERVE_ONLY',
    actionReason:clean(route?.proposedAction?.reason)||null,
    wouldFireWithoutPhase2Authority:route.wouldFireWithoutPhase2Authority===true,
    inhibitors:uniq(route.inhibitors||[]),
    fireAllowed:false,
    workerCreationAllowed:false,
    queueMutationAllowed:false,
    waveReorderAllowed:false,
    authorityPromotionEligible:false
  };
  return[
    `neural-event-shadow:${encodeURIComponent(JSON.stringify(payload))}`,
    `neural-event-shadow-action:${payload.actionKind}`
  ];
}
