// 파일명: tools/company-system-ai-failure-classifier.mjs
// 역할: System AI 실패를 중앙 정책의 원인 클래스로 결정론적으로 분류하고 복구 경로를 선택한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];

export const SYSTEM_AI_FAILURE_CLASSES=Object.freeze([
  'IMPLEMENTATION_DEFECT',
  'STALE_QA_CONTRACT',
  'RESERVATION_OR_LOCK_CONTENTION',
  'RUNNER_OR_INFRASTRUCTURE_FAILURE',
  'CENTRAL_POLICY_OR_SHARED_CONTEXT_MISMATCH',
  'EXTERNAL_SERVICE_OR_CREDENTIAL_FAILURE',
  'SECURITY_OR_AUTHORITY_BOUNDARY',
  'UNKNOWN_REQUIRES_CAUSAL_DIAGNOSIS'
]);

function textOf(task={},result={},qaReview={}){
  return [
    task.failureStage,task.failureSignature,task.blocker,task.lastOutcome,task.goal,
    result.failureStage,result.failureSignature,result.failureClass,result.blocker,result.outcome,
    qaReview.reason,
    ...(task.evidence||[]),...(result.evidence||[])
  ].map(clean).filter(Boolean).join(' ');
}

function explicitClass(result={}){
  const raw=upper(result.failureClass);
  if(SYSTEM_AI_FAILURE_CLASSES.includes(raw))return raw;
  if(raw==='INFRASTRUCTURE_CONTRACT_FAILURE')return'RUNNER_OR_INFRASTRUCTURE_FAILURE';
  return null;
}

export function classifySystemAiFailure({task={},result={},qaReview={}}={}){
  const explicit=explicitClass(result);
  const text=textOf(task,result,qaReview);
  const security=upper(result?.security?.verdict);
  let failureClass=explicit;

  if(!failureClass&&['QUARANTINE','REVIEW'].includes(security))failureClass='SECURITY_OR_AUTHORITY_BOUNDARY';
  if(!failureClass&&/SECURITY|QUARANTINE|SECRET|CREDENTIAL_BOUNDARY|UNAUTHORIZED|AUTHORITY_BOUNDARY/i.test(text))failureClass='SECURITY_OR_AUTHORITY_BOUNDARY';
  if(!failureClass&&/CENTRAL_POLICY_STALE|SHARED_CONTEXT|POLICY_SHA|CONSTITUTION|ARCHITECTURE_PROJECTION|WORK_CONTRACT_STALE/i.test(text))failureClass='CENTRAL_POLICY_OR_SHARED_CONTEXT_MISMATCH';
  if(!failureClass&&/LOCK|RESERVATION|LEASE_EXPIRED|WORK_LOCK|CONCURRENCY|PUSH_CONFLICT|NON_FAST_FORWARD/i.test(text))failureClass='RESERVATION_OR_LOCK_CONTENTION';
  if(!failureClass&&/RUNNER|INFRASTRUCTURE|CHECKOUT|SETUP-NODE|OLLAMA.*(?:INSTALL|START|CACHE)|ENOSPC|ENOMEM|EAI_AGAIN|ECONNRESET/i.test(text))failureClass='RUNNER_OR_INFRASTRUCTURE_FAILURE';
  if(!failureClass&&/RATE.?LIMIT|QUOTA|SERVICE_UNAVAILABLE|EXTERNAL_SERVICE|HTTP_?(?:401|403|429|5\d\d)|AUTHENTICATION|TOKEN_MISSING/i.test(text))failureClass='EXTERNAL_SERVICE_OR_CREDENTIAL_FAILURE';
  if(!failureClass&&qaReview?.verifiedContractDrift===true)failureClass='STALE_QA_CONTRACT';
  if(!failureClass&&upper(result.outcome)==='FAIL'&&/IMPLEMENT|VERIFY|TEST|QA|SOURCE|BUILD|RUNTIME/i.test(text))failureClass='IMPLEMENTATION_DEFECT';
  if(!failureClass)failureClass='UNKNOWN_REQUIRES_CAUSAL_DIAGNOSIS';

  const infrastructureLike=['RESERVATION_OR_LOCK_CONTENTION','RUNNER_OR_INFRASTRUCTURE_FAILURE','EXTERNAL_SERVICE_OR_CREDENTIAL_FAILURE'].includes(failureClass);
  const securityBoundary=failureClass==='SECURITY_OR_AUTHORITY_BOUNDARY';
  const policyMismatch=failureClass==='CENTRAL_POLICY_OR_SHARED_CONTEXT_MISMATCH';
  const staleQa=failureClass==='STALE_QA_CONTRACT';
  const unknown=failureClass==='UNKNOWN_REQUIRES_CAUSAL_DIAGNOSIS';

  const route=securityBoundary?'SECURITY_IMMUNE_SYSTEM'
    :policyMismatch?'RELOAD_CURRENT_SHARED_CONTEXT_AND_REPLAN'
    :failureClass==='RESERVATION_OR_LOCK_CONTENTION'?'RECLAIM_OR_RETRY_RESERVATION'
    :failureClass==='RUNNER_OR_INFRASTRUCTURE_FAILURE'?'REQUEUE_EXACT_CHECKPOINT_NEW_WORKER'
    :failureClass==='EXTERNAL_SERVICE_OR_CREDENTIAL_FAILURE'?'REQUEUE_WITHOUT_TASK_PENALTY_OR_WAIT_FOR_EXTERNAL_EVENT'
    :staleQa?'QA_CONTRACT_REVIEW_AND_INDEPENDENT_REVALIDATION'
    :failureClass==='IMPLEMENTATION_DEFECT'?'SCOPED_CAUSAL_IMPLEMENTATION_REPAIR'
    :'MULTI_HYPOTHESIS_CAUSAL_DIAGNOSIS';

  return{
    version:1,
    failureClass,
    route,
    retryBudgetConsumed:!infrastructureLike,
    learningPenalty:!infrastructureLike,
    workerHandoffRecommended:['RESERVATION_OR_LOCK_CONTENTION','RUNNER_OR_INFRASTRUCTURE_FAILURE'].includes(failureClass),
    securityReviewRequired:securityBoundary,
    primaryAiCollaborationRequired:securityBoundary||policyMismatch||unknown||Number(task.recurrenceCount||task.retries||0)>=2,
    qaContractDriftVerified:staleQa,
    evidence:uniq([
      'system-ai-failure-class:'+failureClass,
      'system-ai-failure-route:'+route,
      'retry-budget-consumed:'+(infrastructureLike?'NO':'YES'),
      'learning-penalty:'+(infrastructureLike?'NO':'YES')
    ])
  };
}

function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const at=raw.indexOf('=');out[raw.slice(2,at<0?undefined:at)]=at<0?true:raw.slice(at+1);}return out;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=parseArgs();
  const result=classifySystemAiFailure({task:readJson(clean(a.task),{}),result:readJson(clean(a.result),{}),qaReview:readJson(clean(a['qa-review']),{})});
  if(clean(a.output)){fs.mkdirSync(path.dirname(a.output),{recursive:true});fs.writeFileSync(a.output,JSON.stringify(result,null,2)+'\n');}
  console.log('SYSTEM_AI_FAILURE_CLASS='+result.failureClass);
  console.log('SYSTEM_AI_FAILURE_ROUTE='+result.route);
  console.log('SYSTEM_AI_HANDOFF_RECOMMENDED='+(result.workerHandoffRecommended?'YES':'NO'));
}
