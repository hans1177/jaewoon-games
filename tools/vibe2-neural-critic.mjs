// 파일명: tools/vibe2-neural-critic.mjs
// 역할: Phase 1 shadow diagnosis + feedback을 비권한 Critic 뉴런으로 평가하고 다음 검증 증거를 지정한다.

const clean=value=>String(value??'').trim();

export function critiqueNeuralShadow({diagnosis=null,feedback=null}={}){
  if(!diagnosis||clean(diagnosis.mode)!=='PHASE1_SHADOW_ADVISORY'||!feedback||clean(feedback.mode)!=='PHASE1_SHADOW_FEEDBACK'){
    return{
      version:1,
      mode:'NOT_APPLICABLE',
      verdict:'UNRESOLVED',
      authority:'NONE',
      confidenceMutationAllowed:false,
      actionFiringAllowed:false,
      learningEligible:false
    };
  }

  const match=clean(feedback.matchState).toUpperCase();
  const verdict=match==='MATCH'
    ?'PIPELINE_SUPPORTED'
    :match==='MISMATCH'
      ?'PIPELINE_CONTRADICTED'
      :'UNRESOLVED';

  const observedStage=clean(feedback?.observed?.stage)||'UNKNOWN';
  const failureSignature=clean(feedback?.observed?.failureSignature)||null;
  let nextEvidenceRequired=[];
  if(feedback.rootCauseVerified===true){
    nextEvidenceRequired=['INDEPENDENT_REGRESSION_CONFIRMATION'];
  }else if(observedStage==='SOURCE_GENERATION'){
    nextEvidenceRequired=[
      'RETRY_SAME_TASK_AFTER_SOURCE_GENERATION_RECOVERY',
      'VERIFY_ORIGINAL_GAME_FAILURE_STILL_REPRODUCES_OR_IS_RESOLVED'
    ];
  }else if(observedStage==='INCREMENTAL_QA'){
    nextEvidenceRequired=[
      failureSignature?`CAUSAL_REPRODUCTION_FOR_QA_SIGNATURE:${failureSignature}`:'CAPTURE_EXACT_QA_FAILURE_SIGNATURE',
      'MAP_FAILURE_TO_RESPONSIBLE_SYSTEM_WITH_REPRODUCIBLE_EVIDENCE'
    ];
  }else if(observedStage==='REPAIR_PATH_PASSED'){
    nextEvidenceRequired=[
      'PREPATCH_FAILURE_REPRODUCTION_OR_EXISTING_VERIFIED_BASELINE',
      'POSTPATCH_CAUSAL_REPLAY',
      'RUNTIME_OR_INDEPENDENT_QA_CONFIRMATION'
    ];
  }else{
    nextEvidenceRequired=['MORE_DETERMINISTIC_FAILURE_EVIDENCE'];
  }

  const adjustmentHint=verdict==='PIPELINE_SUPPORTED'
    ?0.05
    :verdict==='PIPELINE_CONTRADICTED'
      ?-0.1
      :0;

  return{
    version:1,
    mode:'PHASE1_SHADOW_CRITIC',
    verdict,
    predictedResponsibility:clean(feedback?.predicted?.responsibility)||clean(diagnosis?.responsibility?.system)||null,
    observedStage,
    observedResponsibility:clean(feedback?.observed?.responsibility)||null,
    failureSignature,
    rootCauseVerified:feedback.rootCauseVerified===true,
    confidenceAdjustmentHint:adjustmentHint,
    confidenceMutationAllowed:false,
    nextEvidenceRequired,
    inhibitors:[
      ...(feedback.rootCauseVerified===true?[]:['ROOT_CAUSE_UNVERIFIED']),
      'PHASE1_SHADOW_NO_EXECUTION_AUTHORITY'
    ],
    authority:'EVALUATION_ONLY',
    actionFiringAllowed:false,
    waveReorderAllowed:false,
    workerCreationAllowed:false,
    learningEligible:false,
    authorityPromotionEligible:false
  };
}

export function neuralCriticEvidence(critic={}){
  if(clean(critic.mode)!=='PHASE1_SHADOW_CRITIC')return[];
  const payload={
    version:1,
    verdict:clean(critic.verdict)||'UNRESOLVED',
    predictedResponsibility:clean(critic.predictedResponsibility)||null,
    observedStage:clean(critic.observedStage)||null,
    observedResponsibility:clean(critic.observedResponsibility)||null,
    failureSignature:clean(critic.failureSignature)||null,
    rootCauseVerified:critic.rootCauseVerified===true,
    confidenceAdjustmentHint:Number(critic.confidenceAdjustmentHint||0),
    confidenceMutationAllowed:false,
    actionFiringAllowed:false,
    learningEligible:false,
    authorityPromotionEligible:false,
    nextEvidenceRequired:Array.isArray(critic.nextEvidenceRequired)?critic.nextEvidenceRequired.slice(0,6):[]
  };
  return[
    `neural-shadow-critic:${encodeURIComponent(JSON.stringify(payload))}`,
    `neural-shadow-critic-verdict:${payload.verdict}`
  ];
}
