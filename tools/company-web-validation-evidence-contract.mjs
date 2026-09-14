import crypto from 'node:crypto';

export const WEB_VALIDATION_SCHEMA_VERSION=12;
export const WEB_HOMEPAGE_MINIMUM=80;
export const WEB_PLATFORM_PROMOTION_MINIMUM=90;
export const WEB_FINAL_CONTENT_DEPTH_MINUTES=30;

const clean=value=>String(value??'').trim();
export const sha256Text=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
export const strictScoreOf=evidence=>Number(evidence?.webStrictScore??evidence?.strictReview?.totalScore);
export const hardFailuresOf=evidence=>Array.isArray(evidence?.strictReview?.hardFailures)?evidence.strictReview.hardFailures:[];

export function completePlayableCyclePass(evidence={}){
  const q=evidence?.realGameQualification&&typeof evidence.realGameQualification==='object'?evidence.realGameQualification:{};
  return q.pass===true&&q.gates?.REAL_GAME===true&&q.gates?.COMPLETE_CYCLE===true&&q.gates?.REAL_INPUT===true&&q.gates?.REAL_STATE===true&&q.gates?.WIN_LOSS===true&&q.gates?.NO_TEST_PROXY===true&&q.gates?.NO_FAKE_PROGRESS===true&&q.gates?.MOBILE_PLAYABLE===true&&q.gates?.RUNTIME_STABLE===true;
}

export function finalContentDepthPass(evidence={}){
  const depth=evidence?.contentDepthValidation&&typeof evidence.contentDepthValidation==='object'?evidence.contentDepthValidation:{};
  return depth.pass===true&&depth.validationMode==='STRUCTURAL_REAL_GAME_CONTENT_DEPTH'&&Number(depth.estimatedPlayableMinutes)>=WEB_FINAL_CONTENT_DEPTH_MINUTES&&Number(depth.uniqueFunctionalUiCount)>=5&&Number(depth.uniqueInteractedMechanics)>=4&&Number(depth.uniqueStateCount)>=8&&Number(depth.meaningfulStateTransitions)>=7&&depth.testUiFree===true;
}

function normalizedSubstanceGate(evidence={}){
  const explicit=evidence?.substanceGate&&typeof evidence.substanceGate==='object'?evidence.substanceGate:null;
  if(explicit)return explicit;
  const footprint=evidence?.sourceFootprint&&typeof evidence.sourceFootprint==='object'?evidence.sourceFootprint:{};
  return {pass:footprint.pass===true,implementationClass:footprint.pass===true?'DEDICATED':'UNKNOWN',mechanicCount:Number(footprint.mechanicCount||0),directSessionControls:footprint.stageButtons===true?1:0,proxyMarkers:Number(footprint.proxyMarkers||0)};
}

export function realGameSubstancePass(evidence={}){
  const gate=normalizedSubstanceGate(evidence);
  return completePlayableCyclePass(evidence)&&gate.pass===true&&String(gate.implementationClass||'').toUpperCase()==='DEDICATED'&&Number(gate.mechanicCount)>=5&&Number(gate.directSessionControls||0)===0&&Number(gate.proxyMarkers||0)===0;
}

export function evaluateWebValidationEvidence(evidence={},options={}){
  const minimumScore=Number(options.minimumScore??WEB_HOMEPAGE_MINIMUM);
  const requirePromotionRevalidation=options.requirePromotionRevalidation===true;
  const currentSourceSha256=clean(options.currentSourceSha256);
  const currentBaselineSha256=clean(options.currentBaselineSha256);
  const score=strictScoreOf(evidence),hardFailures=hardFailuresOf(evidence),schema=Number(evidence?.validationSchemaVersion||evidence?.version||0);
  const sourceHash=clean(evidence?.sourceIndexSha256),baselineHash=clean(evidence?.designBaselineSha256),blockers=[];
  if(schema<WEB_VALIDATION_SCHEMA_VERSION)blockers.push('WEB_VALIDATION_SCHEMA_STALE');
  if(evidence?.pass!==true||evidence?.validated!==true)blockers.push('WEB_RUNTIME_VALIDATION_NOT_PASS');
  if(evidence?.musicRuntime?.pass!==true)blockers.push('WEB_MUSIC_RUNTIME_NOT_PASS');
  if(!completePlayableCyclePass(evidence))blockers.push('WEB_COMPLETE_PLAYABLE_CYCLE_NOT_PASS');
  if(!realGameSubstancePass(evidence))blockers.push('WEB_REAL_GAME_SUBSTANCE_NOT_PASS');
  if(!finalContentDepthPass(evidence))blockers.push('WEB_FINAL_30MIN_CONTENT_DEPTH_NOT_PASS');
  if(!Number.isFinite(score)||score<minimumScore)blockers.push('WEB_STRICT_SCORE_BELOW_MINIMUM');
  if(hardFailures.length)blockers.push('WEB_STRICT_HARD_FAILURE');
  if(!sourceHash||!baselineHash)blockers.push('WEB_EVIDENCE_HASH_MISSING');
  if(currentSourceSha256&&sourceHash!==currentSourceSha256)blockers.push('WEB_SOURCE_HASH_STALE');
  if(currentBaselineSha256&&baselineHash!==currentBaselineSha256)blockers.push('WEB_BASELINE_HASH_STALE');
  if(requirePromotionRevalidation){
    if(minimumScore<WEB_PLATFORM_PROMOTION_MINIMUM)blockers.push('WEB_PROMOTION_MINIMUM_CONFIGURATION_INVALID');
    if(evidence?.formalImplementationPassed!==true)blockers.push('WEB_FORMAL_IMPLEMENTATION_NOT_PASS');
    if(evidence?.promotionRevalidation?.pass!==true||evidence?.promotionRevalidation?.independentRun!==true)blockers.push('WEB_INDEPENDENT_PROMOTION_REVALIDATION_NOT_PASS');
    if(evidence?.promotionRevalidation?.sourceHashMatch!==true)blockers.push('WEB_PROMOTION_SOURCE_HASH_MISMATCH');
    if(evidence?.promotionRevalidation?.baselineHashMatch!==true)blockers.push('WEB_PROMOTION_BASELINE_HASH_MISMATCH');
    if(evidence?.promotionRevalidation?.secondSubstancePass!==true)blockers.push('WEB_PROMOTION_SUBSTANCE_REVALIDATION_NOT_PASS');
    if(evidence?.promotionRevalidation?.secondContentDepthPass!==true)blockers.push('WEB_PROMOTION_CONTENT_DEPTH_REVALIDATION_NOT_PASS');
  }
  return Object.freeze({version:4,pass:blockers.length===0,score:Number.isFinite(score)?score:null,schema,hardFailures:Object.freeze([...hardFailures]),completePlayableCyclePass:completePlayableCyclePass(evidence),final30MinuteContentDepthPass:finalContentDepthPass(evidence),realGameSubstancePass:realGameSubstancePass(evidence),sourceHash:sourceHash||null,baselineHash:baselineHash||null,requirePromotionRevalidation,minimumScore,blockers:Object.freeze([...new Set(blockers)])});
}
