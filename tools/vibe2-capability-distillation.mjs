// 파일명: tools/vibe2-capability-distillation.mjs
// 역할: 모든 관찰 가능한 Vibe2 코딩 시도를 raw 코드 없이 provenance trace로 보존하고,
//       검증된 성공/실패만 기존 Experience Memory 입력 형식으로 증류한다.
// 원칙: trace 자체는 학습 정답이 아니며, full regression/검증된 실패 원인 전에는 재사용 권한이 없다.

import crypto from 'node:crypto';
import { createVibeExperienceMemory, searchVibeExperience, recordVibeCapabilityApplication, recordVibeCapabilityBenchmark, recordVibeCapabilityPortfolioDecision } from '../assets/vibe-experience-memory.js';

const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const safeArray=(value,max=12)=>Array.isArray(value)?value.map(clean).filter(Boolean).slice(0,max):[];

function redactSensitive(value='',max=700){
  let text=clean(value).slice(0,Math.max(0,Number(max)||700));
  if(!text)return'';
  const replacements=[
    [/\b(gh[pousr]_[A-Za-z0-9_]{16,})\b/g,'[REDACTED_GITHUB_TOKEN]'],
    [/\b(github_pat_[A-Za-z0-9_]{16,})\b/g,'[REDACTED_GITHUB_TOKEN]'],
    [/\b(sk-[A-Za-z0-9_-]{12,})\b/g,'[REDACTED_API_KEY]'],
    [/\b(AKIA[0-9A-Z]{16})\b/g,'[REDACTED_AWS_KEY]'],
    [/(authorization\s*:\s*bearer\s+)[^\s]+/ig,'$1[REDACTED]'],
    [/\b(password|passwd|token|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/ig,'$1=[REDACTED]']
  ];
  for(const [pattern,replacement] of replacements)text=text.replace(pattern,replacement);
  return text;
}

function hashObject(value){
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function evidenceValue(evidence=[],prefix){
  const row=(evidence||[]).map(clean).find(value=>value.startsWith(prefix));
  return row?row.slice(prefix.length):'';
}

function boolEvidence(evidence=[],prefix){
  return upper(evidenceValue(evidence,prefix))==='YES';
}

function normalizeRoleResults(value={}){
  const out={};
  for(const key of ['exploration','implementation','test','performance','regression','review']){
    const status=upper(value?.[key]);
    out[key]=status||'UNKNOWN';
  }
  return out;
}

function inferCapabilityDomains(trace={}){
  const domains=new Set(['TOOL_ORCHESTRATION']);
  const decision=trace.decision||{};
  const execution=trace.execution||{};
  const verification=trace.verification||{};
  if((decision.primaryTargets||[]).length||(decision.primarySystems||[]).length)domains.add('RESPONSIBILITY_LOCALIZATION');
  if(decision.failureFingerprint||verification.causalReplayStatus!=='NOT_REQUIRED')domains.add('ROOT_CAUSE_DEBUGGING');
  if(decision.contextMode||Number(decision.contextBytes)>0)domains.add('CONTEXT_SELECTION');
  if(decision.architectureDriftStatus&&decision.architectureDriftStatus!=='NOT_AVAILABLE')domains.add('ARCHITECTURE_JUDGMENT');
  if(Number(execution.generationAttempts)>1||execution.recoveryUsed===true)domains.add('FAILURE_RECOVERY');
  if(verification.incrementalQaPass===true||verification.fullRegressionPass===true)domains.add('QA_DESIGN');
  if(verification.fullRegressionPass===true)domains.add('REGRESSION_REASONING');
  if(Number(execution.generationAttempts)>0||Number(decision.contextBytes)>0)domains.add('RESOURCE_EFFICIENCY');
  if((trace.task?.goal||'').length>0)domains.add('PROBLEM_DECOMPOSITION');
  return [...domains];
}

function capabilityPatterns(trace={}){
  const decision=trace.decision||{};
  const execution=trace.execution||{};
  const patterns=[];
  if(decision.strategy)patterns.push(`CAPABILITY:CODING_STRATEGY:${decision.strategy}`);
  if((decision.primarySystems||[]).length)patterns.push(`CAPABILITY:RESPONSIBILITY_LOCALIZATION:${decision.primarySystems.slice(0,3).join('+')}`);
  if(decision.contextMode)patterns.push(`CAPABILITY:CONTEXT_SELECTION:${decision.contextMode}`);
  if(execution.recoveryUsed===true)patterns.push('CAPABILITY:FAILURE_RECOVERY:RECOVERED_GENERATION');
  if(trace.verification?.causalReplayExecuted===true)patterns.push('CAPABILITY:ROOT_CAUSE_DEBUGGING:CAUSAL_REPLAY_VERIFIED');
  if(trace.verification?.fullRegressionPass===true)patterns.push('CAPABILITY:REGRESSION_REASONING:FULL_FAN_IN_BOUND');
  patterns.push(...inferCapabilityDomains(trace).map(domain=>`CAPABILITY_DOMAIN:${domain}`));
  return unique(patterns).slice(0,16);
}

export function buildObservableCodingTrace({task={},result={}}={}){
  const evidence=safeArray(result.evidence,80);
  const coding=result.codingMethod&&typeof result.codingMethod==='object'?result.codingMethod:{};
  const identity=result.candidateIdentity&&typeof result.candidateIdentity==='object'?result.candidateIdentity:{};
  const failure=result.candidateFailure&&typeof result.candidateFailure==='object'?result.candidateFailure:{};
  const contract=task.compiledWorkContract&&typeof task.compiledWorkContract==='object'?task.compiledWorkContract:{};
  const roles=normalizeRoleResults(result.roleResults||{});
  const traceSeed={
    taskId:clean(result.taskId||task.id),
    reservationId:clean(result.reservationId||result.metrics?.reservationId),
    variant:clean(result.variant)||'primary',
    baseMainSha:clean(result.baseMainSha||identity.baseMainSha||contract.mainSha),
    candidateBranch:clean(result.candidateBranch),
    outcome:upper(result.outcome),
    failureClass:upper(failure.class),
    strategy:clean(coding.strategy)
  };
  const traceId=`ctrace_${hashObject(traceSeed).slice(0,24)}`;
  const causalReplayStatus=clean(coding.causalReplayStatus)||evidenceValue(evidence,'causal-replay-status:')||'NOT_REQUIRED';
  const trace={
    version:1,
    traceId,
    authority:'OBSERVABLE_CODING_TRACE_PROVENANCE_ONLY',
    source:'VIBE2_WORKER_RESULT',
    teacherClass:'VIBE_GENERATED_CODING',
    task:{
      taskId:clean(result.taskId||task.id)||null,
      workKey:clean(contract.workKey)||null,
      gameId:clean(task.gameId||identity.gameId)||null,
      target:clean(task.target||identity.target).toLowerCase()||null,
      roadmapVersion:Number(contract.roadmapVersion||0)||null,
      baseMainSha:clean(result.baseMainSha||identity.baseMainSha||contract.mainSha)||null,
      variant:clean(result.variant)||'primary',
      goal:redactSensitive(task.goal||'',700)
    },
    decision:{
      strategy:clean(coding.strategy)||null,
      responsibilityConfidence:clean(coding.responsibilityConfidence)||null,
      primaryTargets:safeArray(coding.primaryTargets,8),
      primarySystems:safeArray(coding.primarySystems,12),
      dependentSystems:safeArray(coding.dependentSystems,12),
      contextMode:clean(coding.contextMode)||null,
      contextBytes:Number(coding.contextBytes||0),
      failureFingerprint:clean(coding.failureFingerprint)||null,
      patchRecipeMode:clean(coding.patchRecipeMode)||null,
      architectureDriftStatus:clean(coding.architectureDrift?.status)||null,
      architectureDriftRisk:clean(coding.architectureDrift?.riskLevel)||null
    },
    execution:{
      generationAttempts:Number(coding.generationAttempts||0),
      generationAttemptBudget:Number(coding.generationAttemptBudget||0),
      recoveryUsed:coding.generationRecoveryUsed===true||coding.partialTimeoutRecovery===true||coding.partialMalformedRecovery===true||coding.streamedPartialEditRecovery===true,
      partialTimeoutRecovery:coding.partialTimeoutRecovery===true,
      partialMalformedRecovery:coding.partialMalformedRecovery===true,
      focusedFinalRetry:coding.focusedFinalRetry===true,
      candidateProducedFirstAttempt:coding.candidateProducedFirstAttempt===true,
      candidateBranch:clean(result.candidateBranch)||null,
      candidateSha:evidenceValue(evidence,'candidate-sha:')||null
    },
    changeStats:{
      changedFileCount:Number(result.metrics?.changedFileCount||0),
      addedLineCount:Number(result.metrics?.addedLineCount||0),
      deletedLineCount:Number(result.metrics?.deletedLineCount||0),
      rawPatchStored:false,
      rawCodeStored:false
    },
    verification:{
      workerOutcome:upper(result.outcome)||'UNKNOWN',
      blocker:clean(result.blocker)||null,
      candidateFailureClass:upper(failure.class)||null,
      roleResults:roles,
      incrementalQaPass:roles.test==='PASS',
      performancePass:roles.performance==='PASS',
      fullRegressionPass:roles.regression==='PASS',
      reviewPass:roles.review==='PASS',
      causalReplayStatus,
      causalReplayExecuted:coding.causalReplayExecuted===true||boolEvidence(evidence,'causal-replay-executed:'),
      causalReplayPrepatchReproduced:boolEvidence(evidence,'causal-replay-prepatch-reproduced:')
    },
    metrics:{
      workerTotalMs:Number(result.metrics?.workerTotalMs||result.durationMs||0),
      candidateMs:Number(result.metrics?.candidateMs||0),
      qaMs:Number(result.metrics?.qaMs||0)
    },
    evidenceRefs:unique([
      evidenceValue(evidence,'actions-run:')&&`actions-run:${evidenceValue(evidence,'actions-run:')}`,
      evidenceValue(evidence,'reservation-id:')&&`reservation-id:${evidenceValue(evidence,'reservation-id:')}`,
      evidenceValue(evidence,'incremental-qa-hash:')&&`incremental-qa-hash:${evidenceValue(evidence,'incremental-qa-hash:')}`,
      failure.class&&`source-generation-failure:${upper(failure.class)}`
    ]).slice(0,12),
    capabilityDomains:[],
    safety:{
      hiddenChainOfThoughtStored:false,
      rawModelOutputStored:false,
      rawCodeStored:false,
      secretsOrCredentialsStored:false,
      reusableBeforeVerification:false,
      directProductionAuthority:false,
      directMainWriteAuthority:false,
      authorityExpanded:false
    }
  };
  trace.capabilityDomains=inferCapabilityDomains(trace);
  return Object.freeze(trace);
}

export function buildVerifiedCapabilityExperienceReview({task={},result={},finalReviewPass=false,selected=false}={}){
  const trace=buildObservableCodingTrace({task,result});
  const workerOutcome=upper(result.outcome);
  const failureClass=upper(result.candidateFailure?.class||trace.verification?.candidateFailureClass);
  const success=selected===true&&finalReviewPass===true&&workerOutcome==='PASS';
  const failureEvidence=(result.evidence||[]).map(clean).includes(`source-generation-failure:${failureClass}`);
  const verifiedFailure=!success&&workerOutcome==='FAIL'&&Boolean(failureClass)&&failureClass!=='OTHER'&&failureEvidence;
  if(!success&&!verifiedFailure)return null;
  const evidence=unique([
    ...(result.evidence||[]).map(clean).filter(value=>/^(actions-run:|reservation-id:|candidate-sha:|base-main:|incremental-qa-hash:|incremental-qa-failure-signature:|source-generation-failure:|causal-replay-status:|architecture-drift-status:)/.test(value)),
    `coding-trace:${trace.traceId}`,
    success?'fan-in-review:PASS':'',
    verifiedFailure?`verified-coding-failure:${failureClass}`:''
  ]).filter(Boolean);
  const strategy=clean(trace.decision.strategy)||'UNCLASSIFIED';
  const change=[
    `strategy ${strategy}`,
    `variant ${trace.task.variant}`,
    `attempts ${trace.execution.generationAttempts}`,
    trace.decision.contextMode?`context ${trace.decision.contextMode}`:'',
    `changed-files ${trace.changeStats.changedFileCount}`
  ].filter(Boolean).join(' | ');
  const failureCause=verifiedFailure?`SOURCE_CANDIDATE_GENERATION:${failureClass}`:'';
  const reusablePatterns=success?capabilityPatterns({
    ...trace,
    verification:{...trace.verification,fullRegressionPass:true,reviewPass:true}
  }):[];
  const avoidPatterns=verifiedFailure?unique([
    `CAPABILITY_AVOID:SOURCE_GENERATION:${failureClass}`,
    strategy!=='UNCLASSIFIED'?`CAPABILITY_AVOID:STRATEGY:${strategy}:FAILURE:${failureClass}`:''
  ]).filter(Boolean):[];
  return Object.freeze({
    id:`capability_${trace.traceId}`,
    gameId:clean(trace.task.gameId)||'cross-game',
    engine:clean(trace.task.target)||'unknown',
    departments:Object.freeze(['planning','development','qa']),
    taskType:'coding-capability-distillation',
    problem:verifiedFailure?failureCause:(clean(trace.task.goal)||'verified coding capability application'),
    goal:clean(trace.task.goal)||'verified coding capability application',
    change,
    outcome:success?'PASS':'FAIL',
    failureCause,
    qa:Object.freeze(unique([
      success?'incremental-qa-pass':'',
      success?'performance-sanity-pass':'',
      success?'full-fan-in-regression-pass':'',
      success?'package-review-pass':'',
      verifiedFailure?'observed-source-generation-failure':''
    ]).filter(Boolean)),
    build:evidence.find(value=>value.startsWith('actions-run:'))||'',
    evidence:Object.freeze(evidence.length>=2?evidence:[...evidence,`trace-authority:${trace.authority}`]),
    reusablePatterns:Object.freeze(reusablePatterns),
    avoidPatterns:Object.freeze(avoidPatterns),
    engineQaVerified:success,
    reviewVerified:true,
    reviewDecision:'PASS',
    designIntelligenceRequired:false,
    authorityExpanded:false,
    capabilityDomains:Object.freeze(trace.capabilityDomains),
    codingTraceId:trace.traceId
  });
}

export function mergeCodingTraceLedger(ledgerInput={},traces=[]){
  const current=Array.isArray(ledgerInput?.traces)?ledgerInput.traces.filter(row=>row&&row.traceId):[];
  const map=new Map(current.map(row=>[clean(row.traceId),row]));
  let added=0,refreshed=0;
  for(const raw of traces||[]){
    if(!raw||!clean(raw.traceId))continue;
    const trace=raw.authority==='OBSERVABLE_CODING_TRACE_PROVENANCE_ONLY'?raw:buildObservableCodingTrace(raw);
    if(map.has(trace.traceId))refreshed+=1;else added+=1;
    map.set(trace.traceId,trace);
  }
  const rows=[...map.values()].slice(-5000);
  const verified=rows.filter(row=>row?.verification?.reviewPass===true||row?.verification?.fullRegressionPass===true).length;
  const failures=rows.filter(row=>upper(row?.verification?.workerOutcome)==='FAIL').length;
  return Object.freeze({
    version:1,
    kind:'vibe2-observable-coding-trace-ledger',
    policy:Object.freeze({
      provenanceOnlyUntilVerified:true,
      rawCodeStored:false,
      rawModelOutputStored:false,
      hiddenChainOfThoughtStored:false,
      secretsOrCredentialsStored:false,
      unverifiedAttemptReusable:false,
      canonicalLearningPipelineOnly:true,
      mayExpandAuthority:false
    }),
    traces:Object.freeze(rows),
    stats:Object.freeze({added,refreshed,total:rows.length,verified,failures})
  });
}


export function buildCapabilityApplicationReviews({task={},result={},finalReviewPass=false,selected=false}={}){
  const application=result?.capabilityApplication&&typeof result.capabilityApplication==='object'?result.capabilityApplication:{};
  const injected=application.injected===true;
  const capabilityIds=unique(safeArray(application.exactInjectedCapabilityIds,8));
  if(!injected||!capabilityIds.length)return Object.freeze([]);
  const taskId=clean(result.taskId||task.id);
  const reservationId=clean(result.reservationId||result.metrics?.reservationId);
  const variant=clean(result.variant)||'primary';
  const candidateBranch=clean(result.candidateBranch);
  const sampleIdentity=[taskId,reservationId,variant,candidateBranch].filter(Boolean).join('|');
  const roles=normalizeRoleResults(result.roleResults||{});
  const freshTaskQaPass=selected===true
    &&finalReviewPass===true
    &&upper(result.outcome)==='PASS'
    &&roles.test==='PASS'
    &&roles.performance==='PASS';
  const workKey=clean(task?.compiledWorkContract?.workKey||application.workKey);
  const evidence=unique([
    ...(result.evidence||[]).map(clean).filter(value=>/^(actions-run:|reservation-id:|candidate-sha:|base-main:|incremental-qa-hash:|causal-replay-status:|architecture-drift-status:)/.test(value)),
    finalReviewPass?'fan-in-review:PASS':'',
    sampleIdentity?'capability-application-sample:'+hashObject(sampleIdentity).slice(0,20):''
  ]).filter(Boolean);
  const supportSet=new Set((result.evidence||[]).map(clean).filter(value=>value.startsWith('capability-support:')).map(value=>value.slice('capability-support:'.length)));
  const contradictionSet=new Set((result.evidence||[]).map(clean).filter(value=>value.startsWith('capability-contradiction:')).map(value=>value.slice('capability-contradiction:'.length)));
  return Object.freeze(capabilityIds.map(capabilityId=>Object.freeze({
    version:1,
    capabilityId,
    applicationId:'capp_'+hashObject([capabilityId,sampleIdentity||taskId||'unknown'].join('|')).slice(0,24),
    taskId:taskId||null,
    workKey:workKey||null,
    gameId:clean(task.gameId)||null,
    engine:clean(task.target||task.engine||result?.candidateIdentity?.target).toLowerCase()||null,
    outcome:freshTaskQaPass?'FRESH_QA_PASS':upper(result.outcome)==='FAIL'?'TASK_FAILED_UNATTRIBUTED':'OBSERVED_NOT_FINAL',
    selected:selected===true,
    finalReviewPass:finalReviewPass===true,
    freshTaskQaPass,
    independent:Boolean(taskId&&reservationId),
    capabilitySpecificSupport:supportSet.has(capabilityId),
    capabilitySpecificContradiction:contradictionSet.has(capabilityId),
    coAppliedCapabilityIds:Object.freeze([...capabilityIds]),
    evidence:Object.freeze(evidence),
    observedAt:null,
    rawCodeStored:false,
    rawModelOutputStored:false,
    hiddenChainOfThoughtStored:false,
    authorityExpanded:false
  })));
}

export function applyCapabilityApplicationReviews(memoryInput={},reviews=[]){
  let memory=createVibeExperienceMemory(memoryInput);
  let applied=0,duplicates=0,missing=0;
  const results=[];
  for(const review of Array.isArray(reviews)?reviews:[]){
    const result=recordVibeCapabilityApplication(memory,review);
    results.push(Object.freeze({
      capabilityId:clean(review?.capabilityId)||null,
      applicationId:clean(review?.applicationId)||null,
      updated:result.updated===true,
      duplicate:result.duplicate===true,
      reason:result.reason
    }));
    if(result.updated){applied+=1;memory=result.memory;}
    else if(result.duplicate)duplicates+=1;
    else missing+=1;
  }
  return Object.freeze({
    memory,
    applied,
    duplicates,
    missing,
    results:Object.freeze(results),
    authorityExpanded:false,
    automaticPromotion:false,
    automaticDeprecation:false
  });
}
export function applyCapabilityBenchmarkReviews(memoryInput={},reviews=[]){
  let memory=createVibeExperienceMemory(memoryInput);
  let applied=0,duplicates=0,missing=0;
  const results=[];
  for(const review of Array.isArray(reviews)?reviews:[]){
    const result=recordVibeCapabilityBenchmark(memory,review);
    results.push(Object.freeze({
      capabilityId:clean(review?.capabilityId)||null,
      benchmarkId:clean(review?.benchmarkId)||null,
      updated:result.updated===true,
      duplicate:result.duplicate===true,
      reason:result.reason
    }));
    if(result.updated){applied+=1;memory=result.memory;}
    else if(result.duplicate)duplicates+=1;
    else missing+=1;
  }
  return Object.freeze({
    memory,
    applied,
    duplicates,
    missing,
    results:Object.freeze(results),
    authorityExpanded:false,
    automaticPromotion:false
  });
}

export function applyCapabilityPortfolioDecisions(memoryInput={},decisions=[]){
  let memory=createVibeExperienceMemory(memoryInput);
  let applied=0,duplicates=0,rejected=0;
  const results=[];
  for(const decision of Array.isArray(decisions)?decisions:[]){
    const result=recordVibeCapabilityPortfolioDecision(memory,decision);
    results.push(Object.freeze({
      capabilityId:clean(decision?.capabilityId)||null,
      decisionId:clean(decision?.decisionId)||null,
      updated:result.updated===true,
      duplicate:result.duplicate===true,
      reason:result.reason
    }));
    if(result.updated){applied+=1;memory=result.memory;}
    else if(result.duplicate)duplicates+=1;
    else rejected+=1;
  }
  return Object.freeze({
    memory,
    applied,
    duplicates,
    rejected,
    results:Object.freeze(results),
    authorityExpanded:false,
    automaticDeprecation:false,
    automaticSupersession:false
  });
}

export function retrieveVerifiedCapabilities({experienceInput={},task={},limit=5}={}){
  const memory=createVibeExperienceMemory(experienceInput);
  const records=memory.records.filter(record=>
    record?.verified===true
    &&record?.reusable===true
    &&clean(record?.taskType)==='coding-capability-distillation'
    &&record?.capabilityLifecycle?.retrievalEligible!==false
  );
  const capabilityMemory=createVibeExperienceMemory({records});
  const result=searchVibeExperience(capabilityMemory,{
    gameId:clean(task.gameId),
    engine:clean(task.target||task.engine).toLowerCase(),
    taskType:'coding-capability-distillation',
    departments:safeArray(task.departments||(task.department?[task.department]:[]),8),
    problem:clean(task.problem||task.goal),
    goal:clean(task.goal),
    text:[
      clean(task.goal),
      safeArray(task.responsibleFiles,8).join(' '),
      safeArray(task.evidence,12).join(' ')
    ].filter(Boolean).join(' ')
  },{limit:Math.max(1,Math.min(8,Number(limit)||5)),minimumScore:5});
  const selected=result.matches
    .filter(({reasons})=>{
      const relevanceReasons=reasons||[];
      const sameGame=relevanceReasons.includes('same-game');
      const keywordOverlap=relevanceReasons.some(reason=>reason.startsWith('keyword-overlap:'));
      return sameGame||keywordOverlap;
    })
    .map(({record,score,reasons})=>Object.freeze({
    id:record.id,
    fingerprint:record.fingerprint,
    gameId:record.gameId,
    engine:record.engine,
    outcome:record.outcome,
    problem:record.problem,
    change:record.change,
    failureCause:record.failureCause,
    reusablePatterns:Object.freeze([...(record.reusablePatterns||[])]),
    avoidPatterns:Object.freeze([...(record.avoidPatterns||[])]),
    evidence:Object.freeze([...(record.evidence||[])]),
    confirmations:Number(record.confirmations||1),
    confidence:Number(record.capabilityConfidence??record.confidence??0),
    genericConfidence:Number(record.confidence||0),
    capabilityLifecycle:record.capabilityLifecycle||null,
    applicationCount:Number(record.capabilityLifecycle?.applicationCount||0),
    independentPassCount:Number(record.capabilityLifecycle?.independentPassCount||0),
    generalizationCandidate:record.capabilityLifecycle?.generalizationCandidate===true,
    strongGeneralizationVerified:record.capabilityLifecycle?.strongGeneralizationVerified===true,
    unseenBenchmarkPassCount:Number(record.capabilityLifecycle?.unseenBenchmarkPassCount||0),
    portfolioState:clean(record.capabilityLifecycle?.portfolioState)||'ACTIVE',
    relevance:Number(score||0),
    reasons:Object.freeze([...(reasons||[])])
  }));
  return Object.freeze({
    version:1,
    kind:'verified-coding-capability-retrieval',
    records:Object.freeze(selected),
    count:selected.length,
    verifiedOnly:true,
    advisoryOnly:true,
    rawTraceUsed:false,
    rawCodeUsed:false,
    crossGameKeywordOverlapRequired:true,
    sameEngineAloneEligible:false,
    deprecatedOrSupersededRetrievalEligible:false,
    generalizedRetrievalStillRequiresProblemRelevance:true,
    writableScopeExpansionAllowed:false,
    qaBypassAllowed:false,
    authorityExpanded:false
  });
}

export function verifiedCapabilityGuidance(retrieval={}){
  const records=Array.isArray(retrieval?.records)?retrieval.records:[];
  if(!records.length)return'';
  const lines=[
    '[VERIFIED CAPABILITY MEMORY - advisory only]',
    'These are previously verified coding capability lessons. Use them only when applicable to the current responsibility and evidence.',
    'They MUST NOT expand writable scope, bypass QA/security/runtime gates, copy raw unrelated source, or change protected gameplay/save semantics.'
  ];
  for(const record of records.slice(0,5)){
    const parts=[
      `id=${clean(record.id)}`,
      `outcome=${clean(record.outcome)}`,
      record.reusablePatterns?.length?`reuse=${record.reusablePatterns.join(' | ').slice(0,420)}`:'',
      record.avoidPatterns?.length?`avoid=${record.avoidPatterns.join(' | ').slice(0,420)}`:'',
      record.failureCause?`verifiedFailure=${clean(record.failureCause).slice(0,240)}`:'',
      record.capabilityLifecycle?.state?`lifecycle=${clean(record.capabilityLifecycle.state)}`:'',
      `applications=${Number(record.applicationCount||0)}`,
      `independentPasses=${Number(record.independentPassCount||0)}`,
      `confidence=${Number(record.confidence||0).toFixed(4)}`,
      `relevance=${Number(record.relevance||0).toFixed(2)}`
    ].filter(Boolean);
    lines.push('- '+parts.join('; '));
  }
  return lines.join('\n');
}
