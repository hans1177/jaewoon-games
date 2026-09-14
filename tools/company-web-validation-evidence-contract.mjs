import crypto from 'node:crypto';

export const WEB_VALIDATION_SCHEMA_VERSION=12;
export const WEB_HOMEPAGE_MINIMUM=80;
export const WEB_PLATFORM_PROMOTION_MINIMUM=90;
// Compatibility export only. Initial Web generation no longer uses time-window stages as a build gate.
export const WEB_SESSION_WINDOWS=Object.freeze([[0,5],[5,15],[15,25],[25,30]].map(Object.freeze));

const clean=value=>String(value??'').trim();
export const sha256Text=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
export const strictScoreOf=evidence=>Number(evidence?.webStrictScore??evidence?.strictReview?.totalScore);
export const hardFailuresOf=evidence=>Array.isArray(evidence?.strictReview?.hardFailures)?evidence.strictReview.hardFailures:[];

export function finalContentDepthPass(evidence={}){
  const cycle=evidence?.initialPlayableCycle&&typeof evidence.initialPlayableCycle==='object'?evidence.initialPlayableCycle:{};
  const depth=evidence?.contentDepthValidation&&typeof evidence.contentDepthValidation==='object'?evidence.contentDepthValidation:{};
  const metrics=evidence?.implementationMetrics&&typeof evidence.implementationMetrics==='object'?evidence.implementationMetrics:(depth.metrics&&typeof depth.metrics==='object'?depth.metrics:{});
  return cycle.pass===true
    && evidence?.initialImplementationMinuteHardGate===false
    && depth.pass===true
    && Number(depth.targetMinutes)>=30
    && depth.validationMode==='REAL_GAMEPLAY_DIVERSITY_PROXY'
    && Number(metrics.uniqueMechanicCount)>=5
    && Number(metrics.uniqueFunctionalUiCount)>=4
    && Number(metrics.meaningfulStateTransitionCount)>=10
    && Number(metrics.uniqueInteractedMechanicCount)>=4
    && Number(metrics.systemDependencyCount)>=4
    && Number(metrics.gameplayScreenRatio)>=0.18
    && Number(metrics.duplicateActionRatio)<=0.8
    && Number(metrics.testUiRatio)===0;
}

// Compatibility alias for older callers. This no longer validates synthetic 0-5/5-15/15-25/25-30 stage rows.
export function structuredWebSessionPass(evidence={}){
  return finalContentDepthPass(evidence);
}

function normalizedSubstanceGate(evidence={}){
  const explicit=evidence?.substanceGate&&typeof evidence.substanceGate==='object'?evidence.substanceGate:null;
  if(explicit)return explicit;
  const footprint=evidence?.sourceFootprint&&typeof evidence.sourceFootprint==='object'?evidence.sourceFootprint:{};
  return {
    pass:footprint.pass===true&&evidence?.initialPlayableCycle?.pass===true,
    implementationClass:footprint.pass===true?'DEDICATED_REAL_GAME':'UNKNOWN',
    totalBytes:Number(footprint.totalBytes||0),
    executableBytes:Number(footprint.scriptBytes||0),
    mechanicCount:Number(footprint.mechanicCount||0),
    directSessionControls:footprint.stageButtons===true?1:0,
    proxyMarkers:Number(footprint.proxyMarkers||0),
    initialImplementationUnit:clean(footprint.cycleContract||evidence?.initialPlayableCycle?.unit),
  };
}

export function realGameSubstancePass(evidence={}){
  const gate=normalizedSubstanceGate(evidence);
  const implementationClass=String(gate.implementationClass||'').toUpperCase();
  const cycleUnit=clean(gate.initialImplementationUnit||evidence?.initialPlayableCycle?.unit);
  return gate.pass===true
    && implementationClass.startsWith('DEDICATED')
    && Number(gate.totalBytes)>=12000
    && Number(gate.executableBytes)>=6000
    && Number(gate.mechanicCount)>=5
    && Number(gate.directSessionControls||0)===0
    && Number(gate.proxyMarkers||0)===0
    && evidence?.initialPlayableCycle?.pass===true
    && cycleUnit==='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE';
}

export function evaluateWebValidationEvidence(evidence={},options={}){
  const minimumScore=Number(options.minimumScore??WEB_HOMEPAGE_MINIMUM);
  const requirePromotionRevalidation=options.requirePromotionRevalidation===true;
  const currentSourceSha256=clean(options.currentSourceSha256);
  const currentBaselineSha256=clean(options.currentBaselineSha256);
  const score=strictScoreOf(evidence);
  const hardFailures=hardFailuresOf(evidence);
  const schema=Number(evidence?.validationSchemaVersion||evidence?.version||0);
  const sourceHash=clean(evidence?.sourceIndexSha256);
  const baselineHash=clean(evidence?.designBaselineSha256);
  const substancePass=realGameSubstancePass(evidence);
  const depthPass=finalContentDepthPass(evidence);
  const blockers=[];
  if(schema<WEB_VALIDATION_SCHEMA_VERSION)blockers.push('WEB_VALIDATION_SCHEMA_STALE');
  if(evidence?.pass!==true||evidence?.validated!==true)blockers.push('WEB_RUNTIME_VALIDATION_NOT_PASS');
  if(evidence?.musicRuntime?.pass!==true)blockers.push('WEB_MUSIC_RUNTIME_NOT_PASS');
  if(!substancePass)blockers.push('WEB_REAL_GAME_SUBSTANCE_NOT_PASS');
  if(!depthPass)blockers.push('WEB_FINAL_CONTENT_DEPTH_NOT_PASS');
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
    const secondSubstance=evidence?.promotionRevalidation?.secondSubstancePass===true||evidence?.promotionRevalidation?.secondFootprintPass===true;
    if(!secondSubstance)blockers.push('WEB_PROMOTION_SUBSTANCE_REVALIDATION_NOT_PASS');
    if(evidence?.promotionRevalidation?.secondContentDepthPass!==true)blockers.push('WEB_PROMOTION_CONTENT_DEPTH_REVALIDATION_NOT_PASS');
  }
  return Object.freeze({
    version:4,
    pass:blockers.length===0,
    score:Number.isFinite(score)?score:null,
    schema,
    hardFailures:Object.freeze([...hardFailures]),
    finalContentDepthPass:depthPass,
    structured30MinutePass:depthPass,
    realGameSubstancePass:substancePass,
    sourceHash:sourceHash||null,
    baselineHash:baselineHash||null,
    requirePromotionRevalidation,
    minimumScore,
    blockers:Object.freeze([...new Set(blockers)]),
  });
}