import crypto from 'node:crypto';

export const WEB_VALIDATION_SCHEMA_VERSION=12;
export const WEB_HOMEPAGE_MINIMUM=80;
export const WEB_PLATFORM_PROMOTION_MINIMUM=90;
export const WEB_SESSION_WINDOWS=Object.freeze([[0,5],[5,15],[15,25],[25,30]].map(Object.freeze));

const clean=value=>String(value??'').trim();
export const sha256Text=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
export const strictScoreOf=evidence=>Number(evidence?.webStrictScore??evidence?.strictReview?.totalScore);
export const hardFailuresOf=evidence=>Array.isArray(evidence?.strictReview?.hardFailures)?evidence.strictReview.hardFailures:[];

function gameplayMilestoneStage(row,index){
  const expected=WEB_SESSION_WINDOWS[index];
  if(Number(row?.stage)!==index+1||Number(row?.start)!==expected[0]||Number(row?.end)!==expected[1]||row?.gameStateChanged!==true)return false;
  if(row?.trigger==='GAMEPLAY_MILESTONE')return row?.clicked===true&&row?.completed===true;
  return row?.triggeredByGameplay===true&&row?.directStageClick===false;
}

export function structuredWebSessionPass(evidence={}){
  const depth=evidence?.contentDepth30&&typeof evidence.contentDepth30==='object'?evidence.contentDepth30:null;
  if(depth){
    const mode=clean(depth.validationMode);
    const allowedMode=mode==='REAL_GAMEPLAY_CONTENT_DEPTH'||mode==='LEGACY_GAMEPLAY_MILESTONE_DEPTH';
    return depth.pass===true&&allowedMode&&Number(depth.validatedMinutes)>=30&&depth.directTimeStageControl!==true;
  }
  const session=evidence?.sessionContract&&typeof evidence.sessionContract==='object'?evidence.sessionContract:{};
  const windows=Array.isArray(session.windows)?session.windows:[];
  const stages=Array.isArray(session.stageResults)?session.stageResults:[];
  const windowsPass=windows.length===WEB_SESSION_WINDOWS.length&&windows.every((row,index)=>Array.isArray(row)&&Number(row[0])===WEB_SESSION_WINDOWS[index][0]&&Number(row[1])===WEB_SESSION_WINDOWS[index][1]);
  const stagesPass=stages.length===WEB_SESSION_WINDOWS.length&&stages.every(gameplayMilestoneStage);
  const milestoneMode=session.validationMode==='GAMEPLAY_MILESTONE_DEPTH'||session.validationMode==='LEGACY_GAMEPLAY_MILESTONE_DEPTH'||(session.proofMode==='PROGRESSION_MILESTONES'&&session.directStageClick===false);
  return Number(evidence?.sessionDepthMinutes)>=30&&session.pass===true&&milestoneMode&&session.stageGameplayPassed===true&&Number(session.stageCount)===4&&Number(session.completedStages)===4&&windowsPass&&stagesPass;
}

export const finalContentDepth30Pass=structuredWebSessionPass;

function normalizedSubstanceGate(evidence={}){
  const explicit=evidence?.substanceGate&&typeof evidence.substanceGate==='object'?evidence.substanceGate:null;
  if(explicit)return explicit;
  const footprint=evidence?.sourceFootprint&&typeof evidence.sourceFootprint==='object'?evidence.sourceFootprint:{};
  return {
    pass:footprint.pass===true,
    implementationClass:footprint.pass===true?'DEDICATED':'UNKNOWN',
    totalBytes:Number(footprint.totalBytes||0),
    executableBytes:Number(footprint.scriptBytes||0),
    mechanicCount:Number(footprint.mechanicCount||0),
    directSessionControls:footprint.stageButtons===true?1:0,
    proxyMarkers:Number(footprint.proxyMarkers||0),
  };
}

export function realGameSubstancePass(evidence={}){
  const gate=normalizedSubstanceGate(evidence);
  return gate.pass===true&&String(gate.implementationClass||'').toUpperCase()==='DEDICATED'&&Number(gate.totalBytes)>=12000&&Number(gate.executableBytes)>=6000&&Number(gate.mechanicCount)>=5&&Number(gate.directSessionControls||0)===0&&Number(gate.proxyMarkers||0)===0;
}

export function playableCyclePass(evidence={}){
  const cycle=evidence?.playableCycle&&typeof evidence.playableCycle==='object'?evidence.playableCycle:{};
  return cycle.pass===true&&clean(cycle.minimumImplementationUnit)==='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'&&cycle.terminalReached===true;
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
  if(!playableCyclePass(evidence))blockers.push('WEB_PLAYABLE_CYCLE_NOT_PASS');
  if(!finalContentDepth30Pass(evidence))blockers.push('WEB_FINAL_CONTENT_DEPTH_30_NOT_PASS');
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
    if(evidence?.promotionRevalidation?.secondContentDepth30Pass!==true)blockers.push('WEB_PROMOTION_FINAL_CONTENT_DEPTH_NOT_PASS');
  }
  return Object.freeze({
    version:4,
    pass:blockers.length===0,
    score:Number.isFinite(score)?score:null,
    schema,
    hardFailures:Object.freeze([...hardFailures]),
    playableCyclePass:playableCyclePass(evidence),
    finalContentDepth30Pass:finalContentDepth30Pass(evidence),
    structured30MinutePass:finalContentDepth30Pass(evidence),
    realGameSubstancePass:realGameSubstancePass(evidence),
    sourceHash:sourceHash||null,
    baselineHash:baselineHash||null,
    requirePromotionRevalidation,
    minimumScore,
    blockers:Object.freeze([...new Set(blockers)]),
  });
}
