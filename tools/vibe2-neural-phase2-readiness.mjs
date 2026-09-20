// 파일명: tools/vibe2-neural-phase2-readiness.mjs
// 역할: Phase 2 실행권한 부여 전 shadow evidence가 검토 가능한 수준으로 축적됐는지만 판정한다.
// 원칙: review eligibility와 execution authority를 엄격히 분리한다. 이 모듈은 절대 Phase 2 권한을 부여하지 않는다.

import { summarizeNeuralFeedbackEvidence } from './vibe2-neural-feedback.mjs';
import { summarizeNeuralEventShadowEvidence } from './vibe2-neural-event-telemetry.mjs';

const clean=value=>String(value??'').trim();

export function parseNeuralRootCauseEvidence(values=[]){
  const rows=[];
  for(const raw of Array.isArray(values)?values:[]){
    const value=clean(raw);
    if(!value.startsWith('neural-root-cause:'))continue;
    try{
      const payload=JSON.parse(decodeURIComponent(value.slice('neural-root-cause:'.length)));
      if(payload&&typeof payload==='object')rows.push(payload);
    }catch{}
  }
  return rows;
}

export function summarizeNeuralRootCauseEvidence(values=[]){
  const rows=parseNeuralRootCauseEvidence(values);
  const states={};
  let verified=0,systemVerified=0,predictionConsistent=0,predictionContradicted=0;
  for(const row of rows){
    const state=clean(row.state)||'UNRESOLVED';
    states[state]=(states[state]||0)+1;
    if(row.rootCauseVerified===true)verified+=1;
    if(row.responsibleSystemVerified===true)systemVerified+=1;
    if(row.predictedSystemConsistentWithVerified===true)predictionConsistent+=1;
    if(row.predictedSystemConsistentWithVerified===false)predictionContradicted+=1;
  }
  return{
    version:1,
    total:rows.length,
    verified,
    systemVerified,
    predictionConsistent,
    predictionContradicted,
    states
  };
}

export function evaluatePhase2Readiness({
  evidence=[],
  shadowAudit=null,
  thresholds={}
}={}){
  const feedback=summarizeNeuralFeedbackEvidence(evidence);
  const events=summarizeNeuralEventShadowEvidence(evidence);
  const rootCause=summarizeNeuralRootCauseEvidence(evidence);
  const audit=shadowAudit&&typeof shadowAudit==='object'?shadowAudit:{sampleCount:0,phase2AuthorityReady:false};
  const required={
    shadowEvents:Math.max(1,Number(thresholds.shadowEvents||30)),
    calibrationEligible:Math.max(1,Number(thresholds.calibrationEligible||20)),
    verifiedRootCause:Math.max(1,Number(thresholds.verifiedRootCause||10)),
    waveAuditSamples:Math.max(1,Number(thresholds.waveAuditSamples||10))
  };
  const gates={
    shadowEventVolume:events.total>=required.shadowEvents,
    calibrationVolume:feedback.calibrationEligible>=required.calibrationEligible,
    verifiedRootCauseVolume:rootCause.verified>=required.verifiedRootCause,
    waveAuditVolume:Number(audit.sampleCount||0)>=required.waveAuditSamples,
    zeroUnauthorizedFire:events.unauthorizedFireCount===0,
    shadowSafetyInvariant:events.safetyInvariantPass===true
  };
  const reviewEligible=Object.values(gates).every(Boolean);

  return{
    version:1,
    mode:'PHASE2_READINESS_REVIEW_GATE',
    required,
    gates,
    reviewEligible,
    evidenceSummary:{feedback,events,rootCause,shadowAuditSamples:Number(audit.sampleCount||0)},
    phase2AuthorityReady:false,
    executionAuthorityGranted:false,
    automaticPromotionAllowed:false,
    automaticLearningAllowed:false,
    automaticTuningAllowed:false,
    explicitPrimaryReviewRequired:true,
    securityReviewRequired:true,
    explicitCentralPolicyPromotionRequired:true,
    disagreementReviewRequired:true,
    reason:reviewEligible
      ?'ENOUGH_SHADOW_EVIDENCE_FOR_EXPLICIT_REVIEW_ONLY'
      :'SHADOW_EVIDENCE_NOT_YET_SUFFICIENT_FOR_PHASE2_REVIEW'
  };
}
