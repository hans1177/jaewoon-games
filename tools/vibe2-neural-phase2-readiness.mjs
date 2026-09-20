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
  const parsedRows=parseNeuralRootCauseEvidence(values);
  const bySample=new Map();
  const legacyRows=[];
  let duplicateSampleRows=0,sampleConflicts=0;
  for(const row of parsedRows){
    const sampleId=clean(row.sampleId);
    if(!sampleId){legacyRows.push(row);continue;}
    if(bySample.has(sampleId)){
      duplicateSampleRows+=1;
      if(JSON.stringify(bySample.get(sampleId))!==JSON.stringify(row))sampleConflicts+=1;
      continue;
    }
    bySample.set(sampleId,row);
  }
  const rows=[...bySample.values(),...legacyRows];
  const states={};
  let verified=0,systemVerified=0,predictionConsistent=0,predictionContradicted=0,sampleIdentified=0,verifiedSampleIdentified=0;
  for(const row of rows){
    const state=clean(row.state)||'UNRESOLVED';
    const identified=Boolean(clean(row.sampleId));
    states[state]=(states[state]||0)+1;
    if(identified)sampleIdentified+=1;
    if(row.rootCauseVerified===true){
      verified+=1;
      if(identified)verifiedSampleIdentified+=1;
    }
    if(row.responsibleSystemVerified===true)systemVerified+=1;
    if(row.predictedSystemConsistentWithVerified===true)predictionConsistent+=1;
    if(row.predictedSystemConsistentWithVerified===false)predictionContradicted+=1;
  }
  const predictionEvaluated=predictionConsistent+predictionContradicted;
  return{
    version:2,
    rawEvidenceRows:parsedRows.length,
    total:rows.length,
    distinctSampleIds:bySample.size,
    legacyUnidentifiedRows:legacyRows.length,
    duplicateSampleRows,
    sampleConflicts,
    sampleIdentified,
    verified,
    verifiedSampleIdentified,
    verifiedSampleIdentityCoverage:verified?verifiedSampleIdentified/verified:0,
    systemVerified,
    predictionEvaluated,
    predictionConsistent,
    predictionContradicted,
    predictionConsistencyRate:predictionEvaluated?predictionConsistent/predictionEvaluated:null,
    predictionContradictionRate:predictionEvaluated?predictionContradicted/predictionEvaluated:null,
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
    waveAuditSamples:Math.max(1,Number(thresholds.waveAuditSamples||10)),
    calibrationAccuracy:Math.max(0,Math.min(1,Number(thresholds.calibrationAccuracy??0.7))),
    rootCausePredictionCoverage:Math.max(0,Math.min(1,Number(thresholds.rootCausePredictionCoverage??0.8))),
    rootCauseSampleIdentityCoverage:Math.max(0,Math.min(1,Number(thresholds.rootCauseSampleIdentityCoverage??0.8))),
    maxRootCausePredictionContradictionRate:Math.max(0,Math.min(1,Number(thresholds.maxRootCausePredictionContradictionRate??0.3)))
  };
  const predictionCoverage=rootCause.verified>0?rootCause.predictionEvaluated/rootCause.verified:0;
  const identifiedShadowEvents=Number(events.identifiedEventCount||0);
  const identifiedCalibrationEligible=Number(feedback.identifiedCalibrationEligible||0);
  const identifiedCalibrationAccuracy=feedback.identifiedObservedAccuracy;
  const identifiedWaveAuditSamples=Number(audit.distinctSampleIds??audit.identifiedSampleCount??audit.sampleCount??0);
  const gates={
    shadowEventVolume:identifiedShadowEvents>=required.shadowEvents,
    calibrationVolume:identifiedCalibrationEligible>=required.calibrationEligible,
    calibrationAccuracy:identifiedCalibrationAccuracy!==null&&identifiedCalibrationAccuracy!==undefined&&identifiedCalibrationAccuracy>=required.calibrationAccuracy,
    verifiedRootCauseVolume:rootCause.verifiedSampleIdentified>=required.verifiedRootCause,
    rootCauseSampleIdentityCoverage:rootCause.verifiedSampleIdentityCoverage>=required.rootCauseSampleIdentityCoverage,
    zeroFeedbackSampleConflicts:Number(feedback.sampleConflicts||0)===0,
    zeroShadowEventConflicts:Number(events.eventConflicts||0)===0,
    zeroRootCauseSampleConflicts:rootCause.sampleConflicts===0,
    zeroShadowAuditSampleConflicts:Number(audit.sampleConflicts||0)===0,
    rootCausePredictionCoverage:predictionCoverage>=required.rootCausePredictionCoverage,
    rootCausePredictionContradictionRate:rootCause.predictionContradictionRate!==null
      &&rootCause.predictionContradictionRate<=required.maxRootCausePredictionContradictionRate,
    waveAuditVolume:Number(audit.sampleCount||0)>=required.waveAuditSamples,
    zeroUnauthorizedFire:events.unauthorizedFireCount===0,
    shadowSafetyInvariant:events.safetyInvariantPass===true
  };
  const reviewEligible=Object.values(gates).every(Boolean);

  return{
    version:2,
    mode:'PHASE2_READINESS_REVIEW_GATE',
    required,
    gates,
    reviewEligible,
    evidenceSummary:{
      feedback,
      events,
      rootCause,
      rootCausePredictionCoverage:predictionCoverage,
      shadowAuditSamples:Number(audit.sampleCount||0)
    },
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
