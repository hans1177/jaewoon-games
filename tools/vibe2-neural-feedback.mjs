// 파일명: tools/vibe2-neural-feedback.mjs
// 역할: Phase 1 shadow neural diagnosis를 immutable worker 결과와 비교해 검증 가능한 범위의 calibration evidence만 생성한다.

const clean=value=>String(value??'').trim();
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));

function observedPipelineState({outcome='',blocker='',candidateFailure=null,roleResults={},evidence=[]}={}){
  const normalizedOutcome=clean(outcome).toUpperCase();
  const failureClass=clean(candidateFailure?.class).toUpperCase();
  const implementation=clean(roleResults?.implementation).toUpperCase();
  const test=clean(roleResults?.test).toUpperCase();
  const performance=clean(roleResults?.performance).toUpperCase();
  const evidenceRows=(Array.isArray(evidence)?evidence:[]).map(clean).filter(Boolean);
  const qaFailureMarker=evidenceRows.find(value=>value.startsWith('incremental-qa-failure-signature:'));
  const qaFailureSignature=qaFailureMarker?clean(qaFailureMarker.slice('incremental-qa-failure-signature:'.length)):null;

  if(candidateFailure||implementation==='FAIL'){
    return{
      stage:'SOURCE_GENERATION',
      responsibility:'SOURCE_GENERATION',
      deterministicallyObserved:true,
      evidenceClass:failureClass?`CANDIDATE_FAILURE_${failureClass}`:'IMPLEMENTATION_ROLE_FAIL'
    };
  }
  if(test==='FAIL'||/incremental-qa-failed/i.test(clean(blocker))){
    return{
      stage:'INCREMENTAL_QA',
      responsibility:null,
      deterministicallyObserved:true,
      evidenceClass:'QA_STAGE_FAILURE_ROOT_CAUSE_UNVERIFIED',
      failureSignature:qaFailureSignature
    };
  }
  if(performance==='FAIL'||/performance-sanity-failed/i.test(clean(blocker))){
    return{
      stage:'PERFORMANCE_SANITY',
      responsibility:null,
      deterministicallyObserved:true,
      evidenceClass:'PERFORMANCE_STAGE_FAILURE_ROOT_CAUSE_UNVERIFIED'
    };
  }
  if(normalizedOutcome==='PASS'){
    return{
      stage:'REPAIR_PATH_PASSED',
      responsibility:null,
      deterministicallyObserved:true,
      evidenceClass:'WORKER_PIPELINE_PASS_ROOT_CAUSE_UNVERIFIED'
    };
  }
  return{
    stage:normalizedOutcome==='BLOCKED'?'BLOCKED':'UNKNOWN',
    responsibility:null,
    deterministicallyObserved:false,
    evidenceClass:'INSUFFICIENT_VERIFIED_OUTCOME'
  };
}

export function evaluateNeuralDiagnosisFeedback({
  diagnosis=null,
  outcome='',
  blocker='',
  candidateFailure=null,
  roleResults={},
  evidence=[]
}={}){
  if(!diagnosis||clean(diagnosis.mode)!=='PHASE1_SHADOW_ADVISORY'){
    return{
      version:1,
      mode:'NOT_APPLICABLE',
      sampleEligible:false,
      responsibilityMatch:null,
      matchState:'UNKNOWN',
      learningEligible:false,
      authorityPromotionEligible:false
    };
  }

  const predictedResponsibility=clean(diagnosis?.responsibility?.system)||null;
  const predictedConfidence=clamp(diagnosis?.responsibility?.confidence);
  const observed=observedPipelineState({outcome,blocker,candidateFailure,roleResults,evidence});
  const responsibilityMatch=observed.responsibility
    ? predictedResponsibility===observed.responsibility
    : null;
  const matchState=responsibilityMatch===true?'MATCH':responsibilityMatch===false?'MISMATCH':'UNKNOWN';

  return{
    version:1,
    mode:'PHASE1_SHADOW_FEEDBACK',
    calibrationTarget:'NEXT_OBSERVED_BLOCKING_SYSTEM_NOT_ROOT_CAUSE',
    predicted:{
      responsibility:predictedResponsibility,
      confidence:predictedConfidence,
      failureStage:clean(diagnosis?.actionRecommendation?.failureStage)||null,
      bottleneckScore:Number(diagnosis?.bottleneck?.score||0)
    },
    observed,
    responsibilityMatch,
    matchState,
    sampleEligible:observed.responsibility!==null,
    rootCauseVerified:false,
    learningEligible:false,
    authorityPromotionEligible:false,
    waveControlChangeAllowed:false,
    eventRoutingAuthorityAllowed:false,
    verifiedBy:'IMMUTABLE_WORKER_RESULT'
  };
}

export function neuralFeedbackEvidence(feedback={}){
  if(clean(feedback.mode)!=='PHASE1_SHADOW_FEEDBACK')return[];
  const payload={
    version:1,
    predictedResponsibility:clean(feedback?.predicted?.responsibility)||null,
    predictedConfidence:Number(feedback?.predicted?.confidence||0),
    observedStage:clean(feedback?.observed?.stage)||null,
    observedResponsibility:clean(feedback?.observed?.responsibility)||null,
    matchState:clean(feedback.matchState)||'UNKNOWN',
    responsibilityMatch:feedback.responsibilityMatch===true?true:feedback.responsibilityMatch===false?false:null,
    sampleEligible:feedback.sampleEligible===true,
    rootCauseVerified:false,
    learningEligible:false,
    authorityPromotionEligible:false,
    verifiedBy:'IMMUTABLE_WORKER_RESULT'
  };
  return[
    `neural-shadow-feedback:${encodeURIComponent(JSON.stringify(payload))}`,
    `neural-shadow-match:${payload.matchState}`,
    `neural-shadow-observed-stage:${payload.observedStage||'UNKNOWN'}`
  ];
}

export function summarizeNeuralFeedback(rows=[]){
  const samples=(Array.isArray(rows)?rows:[])
    .filter(row=>clean(row?.mode)==='PHASE1_SHADOW_FEEDBACK');
  const eligible=samples.filter(row=>row.sampleEligible===true);
  const matches=eligible.filter(row=>row.responsibilityMatch===true).length;
  const mismatches=eligible.filter(row=>row.responsibilityMatch===false).length;
  return{
    version:1,
    total:samples.length,
    calibrationEligible:eligible.length,
    matches,
    mismatches,
    unknown:samples.length-eligible.length,
    observedAccuracy:eligible.length?matches/eligible.length:null,
    phase2AuthorityReady:false,
    reason:'SHADOW_TELEMETRY_ONLY_REQUIRES_POST_QA_ROOT_CAUSE_AND_MINIMUM_SAMPLE_POLICY'
  };
}


export function parseNeuralFeedbackEvidence(values=[]){
  const rows=[];
  for(const value of Array.isArray(values)?values:[]){
    const text=clean(value);
    if(!text.startsWith('neural-shadow-feedback:'))continue;
    try{
      const payload=JSON.parse(decodeURIComponent(text.slice('neural-shadow-feedback:'.length)));
      if(payload&&typeof payload==='object')rows.push(payload);
    }catch{}
  }
  return rows;
}

export function summarizeNeuralFeedbackEvidence(values=[]){
  const rows=parseNeuralFeedbackEvidence(values);
  const eligible=rows.filter(row=>row.sampleEligible===true);
  const matches=eligible.filter(row=>row.responsibilityMatch===true||clean(row.matchState)==='MATCH').length;
  const mismatches=eligible.filter(row=>row.responsibilityMatch===false||clean(row.matchState)==='MISMATCH').length;
  return{
    version:1,
    durableEvidenceSamples:rows.length,
    calibrationEligible:eligible.length,
    matches,
    mismatches,
    unknown:rows.length-eligible.length,
    observedAccuracy:eligible.length?matches/eligible.length:null,
    phase2AuthorityReady:false,
    automaticAuthorityEscalationForbidden:true
  };
}
