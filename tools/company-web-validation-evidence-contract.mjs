import crypto from 'node:crypto';

export const WEB_VALIDATION_SCHEMA_VERSION=11;
export const WEB_HOMEPAGE_MINIMUM=80;
export const WEB_PLATFORM_PROMOTION_MINIMUM=90;
export const WEB_SESSION_WINDOWS=Object.freeze([[0,5],[5,15],[15,25],[25,30]].map(Object.freeze));

const clean=value=>String(value??'').trim();
export const sha256Text=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
export const strictScoreOf=evidence=>Number(evidence?.webStrictScore??evidence?.strictReview?.totalScore);
export const hardFailuresOf=evidence=>Array.isArray(evidence?.strictReview?.hardFailures)?evidence.strictReview.hardFailures:[];

export function structuredWebSessionPass(evidence={}){
  const session=evidence?.sessionContract&&typeof evidence.sessionContract==='object'?evidence.sessionContract:{};
  const windows=Array.isArray(session.windows)?session.windows:[];
  const stages=Array.isArray(session.stageResults)?session.stageResults:[];
  const windowsPass=windows.length===WEB_SESSION_WINDOWS.length&&windows.every((row,index)=>Array.isArray(row)&&Number(row[0])===WEB_SESSION_WINDOWS[index][0]&&Number(row[1])===WEB_SESSION_WINDOWS[index][1]);
  const stagesPass=stages.length===WEB_SESSION_WINDOWS.length&&stages.every((row,index)=>Number(row.stage)===index+1&&Number(row.start)===WEB_SESSION_WINDOWS[index][0]&&Number(row.end)===WEB_SESSION_WINDOWS[index][1]&&row.clicked===true&&row.completed===true&&row.gameStateChanged===true&&row.trigger==='GAMEPLAY_MILESTONE');
  return Number(evidence?.sessionDepthMinutes)>=30&&session.pass===true&&session.validationMode==='GAMEPLAY_MILESTONE_DEPTH'&&session.stageGameplayPassed===true&&Number(session.stageCount)===4&&Number(session.completedStages)===4&&windowsPass&&stagesPass;
}

export function realGameSubstancePass(evidence={}){
  const gate=evidence?.substanceGate&&typeof evidence.substanceGate==='object'?evidence.substanceGate:{};
  return gate.pass===true&&String(gate.implementationClass||'').toUpperCase()==='DEDICATED'&&Number(gate.totalBytes)>=12000&&Number(gate.executableBytes)>=6000&&Number(gate.mechanicCount)>=5&&Number(gate.directSessionControls||0)===0&&Number(gate.proxyMarkers||0)===0;
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
  const blockers=[];
  if(schema<WEB_VALIDATION_SCHEMA_VERSION)blockers.push('WEB_VALIDATION_SCHEMA_STALE');
  if(evidence?.pass!==true||evidence?.validated!==true)blockers.push('WEB_RUNTIME_VALIDATION_NOT_PASS');
  if(evidence?.musicRuntime?.pass!==true)blockers.push('WEB_MUSIC_RUNTIME_NOT_PASS');
  if(!realGameSubstancePass(evidence))blockers.push('WEB_REAL_GAME_SUBSTANCE_NOT_PASS');
  if(!structuredWebSessionPass(evidence))blockers.push('WEB_STRUCTURED_30MIN_NOT_PASS');
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
  }
  return Object.freeze({
    version:2,
    pass:blockers.length===0,
    score:Number.isFinite(score)?score:null,
    schema,
    hardFailures:Object.freeze([...hardFailures]),
    structured30MinutePass:structuredWebSessionPass(evidence),
    realGameSubstancePass:realGameSubstancePass(evidence),
    sourceHash:sourceHash||null,
    baselineHash:baselineHash||null,
    requirePromotionRevalidation,
    minimumScore,
    blockers:Object.freeze([...new Set(blockers)]),
  });
}
