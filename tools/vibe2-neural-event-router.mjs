// 파일명: tools/vibe2-neural-event-router.mjs
// 역할: 이벤트 기반 뉴런 라우팅 결정을 계산하고, 중앙정책이 허용한 안전 범위에서는 기존 wave scheduler에 gated 실행 힌트를 전달한다.
// 원칙: 정책/보안/릴리즈 권한은 확장하지 않는다. 실제 실행은 기존 queue/reserve/fan-in 경로만 사용한다.

import { buildNeuralWorkGraph, neuralWorkGraphEvidence } from './vibe2-neural-work-graph.mjs';

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

const GATED_ACTIONS=new Set([
  'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR',
  'PREPARE_DIAGNOSTIC_REVALIDATION',
  'REEVALUATE_DEPENDENCY_AND_LOCKS'
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
    evidence:uniq(event.evidence||[]),
    dependencies:Array.isArray(event.dependencies)?event.dependencies:[]
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

function rootCauseIndependentEvent(event={}){
  return ['POLICY_CHANGE','RESOURCE_OR_LOCK_CHANGE'].includes(clean(event?.type).toUpperCase());
}

function eventAllowsGatedMutation(event={}){
  if(rootCauseIndependentEvent(event))return true;
  const outcome=clean(event?.outcome).toUpperCase();
  if(!outcome)return true;
  return !['PASS','SUCCESS','VERIFIED','APPROVED','DONE'].includes(outcome);
}

function collectInhibitors({
  event,
  diagnosis,
  rootCause,
  policyFresh=true,
  lockConflict=false,
  securityBlocked=false,
  gatedExecutionEnabled=false
}={}){
  const rootCauseRequired=!rootCauseIndependentEvent(event);
  return uniq([
    ...(diagnosis?.inhibitors||[]),
    policyFresh===false?'CENTRAL_POLICY_STALE_OR_INVALID':'',
    lockConflict===true?'SOURCE_OR_RESOURCE_LOCK_CONFLICT':'',
    securityBlocked===true?'SECURITY_POLICY_BLOCK':'',
    rootCauseRequired&&rootCause?.rootCauseVerified!==true?'ROOT_CAUSE_NOT_VERIFIED':'',
    gatedExecutionEnabled===true?'':'PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'
  ]);
}

export function simulateNeuralEventRoute({
  event={},
  diagnosis=null,
  rootCause=null,
  policyFresh=true,
  lockConflict=false,
  securityBlocked=false,
  gatedExecutionEnabled=false
}={}){
  const normalizedEvent=normalizeEvent(event);
  const proposedAction=actionFromState({event:normalizedEvent,diagnosis,rootCause});
  const inhibitors=collectInhibitors({
    event:normalizedEvent,
    diagnosis,
    rootCause,
    policyFresh,
    lockConflict,
    securityBlocked,
    gatedExecutionEnabled
  });
  const nonAuthorityInhibitors=inhibitors.filter(value=>value!=='PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED');
  const wouldFireWithoutPhase2Authority=
    normalizedEvent.type!=='UNKNOWN'
    &&proposedAction.kind!=='OBSERVE_ONLY'
    &&nonAuthorityInhibitors.length===0;
  const gatedActionAllowed=
    gatedExecutionEnabled===true
    &&GATED_ACTIONS.has(proposedAction.kind)
    &&normalizedEvent.type!=='UNKNOWN'
    &&eventAllowsGatedMutation(normalizedEvent)
    &&nonAuthorityInhibitors.length===0;
  const workerCreationAllowed=gatedActionAllowed&&['PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR','PREPARE_DIAGNOSTIC_REVALIDATION'].includes(proposedAction.kind);
  const queueMutationAllowed=gatedActionAllowed;
  const waveReorderAllowed=gatedActionAllowed;
  const automaticTuningAllowed=gatedActionAllowed;
  const authorityMode=gatedActionAllowed?'GATED':'SHADOW';

  const workGraph=buildNeuralWorkGraph({
    event:normalizedEvent,
    diagnosis,
    rootCause,
    route:{
      proposedAction,
      inhibitors,
      wouldFireWithoutPhase2Authority,
      authorityMode,
      fireAllowed:gatedActionAllowed,
      workerCreationAllowed,
      queueMutationAllowed,
      waveReorderAllowed,
      automaticTuningAllowed
    },
    dependencies:normalizedEvent.dependencies,
    resourceState:{policyFresh,lockConflict,securityBlocked}
  });
  return{
    version:3,
    mode:gatedActionAllowed?'PHASE2_GATED_EVENT_ROUTER':'PHASE2_SHADOW_EVENT_ROUTER',
    authorityMode,
    event:normalizedEvent,
    proposedAction,
    inhibitors,
    wouldFireWithoutPhase2Authority,
    workGraph,
    fireAllowed:gatedActionAllowed,
    workerCreationAllowed,
    queueMutationAllowed,
    waveReorderAllowed,
    automaticTuningAllowed,
    lockAcquisitionAllowed:false,
    policyMutationAllowed:false,
    learningEligible:false,
    authorityPromotionEligible:false,
    comparisonTarget:'CURRENT_WAVE_SCHEDULER_OUTCOME',
    authority:gatedActionAllowed?'GATED_EXISTING_SCHEDULER_ONLY':'SIMULATION_ONLY'
  };
}

export function neuralEventRouteEvidence(route={}){
  const mode=clean(route.mode);
  const gated=mode==='PHASE2_GATED_EVENT_ROUTER';
  if(!gated&&mode!=='PHASE2_SHADOW_EVENT_ROUTER')return[];
  const payload={
    version:3,
    eventIdentityVersion:2,
    authorityMode:gated?'GATED':'SHADOW',
    eventId:clean(route?.event?.id)||null,
    eventType:clean(route?.event?.type)||'UNKNOWN',
    actionKind:clean(route?.proposedAction?.kind)||'OBSERVE_ONLY',
    actionReason:clean(route?.proposedAction?.reason)||null,
    wouldFireWithoutPhase2Authority:route.wouldFireWithoutPhase2Authority===true,
    inhibitors:uniq(route.inhibitors||[]),
    fireAllowed:route.fireAllowed===true,
    workerCreationAllowed:route.workerCreationAllowed===true,
    queueMutationAllowed:route.queueMutationAllowed===true,
    waveReorderAllowed:route.waveReorderAllowed===true,
    automaticTuningAllowed:route.automaticTuningAllowed===true,
    lockAcquisitionAllowed:false,
    policyMutationAllowed:false,
    authorityPromotionEligible:false
  };
  const prefix=gated?'neural-event-gated:':'neural-event-shadow:';
  const actionPrefix=gated?'neural-event-gated-action:':'neural-event-shadow-action:';
  return[
    `${prefix}${encodeURIComponent(JSON.stringify(payload))}`,
    `${actionPrefix}${payload.actionKind}`,
    ...neuralWorkGraphEvidence(route.workGraph||{})
  ];
}
