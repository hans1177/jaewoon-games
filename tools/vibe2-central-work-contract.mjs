// 파일명: tools/vibe2-central-work-contract.mjs
// 역할: 중앙 roadmap을 Vibe 작업 단위의 실행 계약으로 컴파일하고 작업 중 정책 stale 여부를 fail-closed로 검증한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const CANONICAL_VIBE_POLICY_PATH='company-learning/platform-release-roadmap.json';

const clean=value=>String(value??'').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const sha256=value=>crypto.createHash('sha256').update(String(value??''),'utf8').digest('hex');

function policyValidationErrors(policy={}){
  const shared=policy?.developmentLifecycleMachine?.sharedWorkerContext||{};
  const errors=[];
  if(clean(policy.authority)!=='MACHINE_EXECUTION_CONTRACT')errors.push('AUTHORITY');
  if(clean(policy.machineSourceOfTruth)!==CANONICAL_VIBE_POLICY_PATH)errors.push('MACHINE_SOURCE_OF_TRUTH');
  if(policy.humanDocumentRequired!==false)errors.push('HUMAN_DOCUMENT_REQUIRED');
  if(shared.requiredForAllWorkers!==true)errors.push('SHARED_CONTEXT_REQUIRED');
  if(clean(shared.centralPolicy)!==CANONICAL_VIBE_POLICY_PATH)errors.push('SHARED_CONTEXT_POLICY');
  if(shared.beforeWorkRequired!==true)errors.push('BEFORE_WORK_SYNC');
  if(shared.afterWorkRequired!==true)errors.push('AFTER_WORK_SYNC');
  if(shared.staleContextMayNotStartWork!==true)errors.push('STALE_START_BLOCK');
  if(shared.staleContextMayNotCompleteWork!==true)errors.push('STALE_COMPLETION_BLOCK');
  if(clean(shared.syncMode)!=='ROADMAP_FIRST_FAIL_CLOSED')errors.push('SYNC_MODE');
  return errors;
}

export function loadCentralPolicySnapshot({repoRoot=process.cwd(),policyPath=CANONICAL_VIBE_POLICY_PATH,required=false}={}){
  const file=path.resolve(repoRoot,policyPath);
  if(!fs.existsSync(file)){
    return{
      required:required===true,present:false,valid:required!==true,path:policyPath,
      fingerprint:null,version:null,authority:null,machineSourceOfTruth:null,
      syncMode:null,errors:required===true?['CENTRAL_POLICY_MISSING']:[],document:null
    };
  }
  let raw='',document=null;
  try{
    raw=fs.readFileSync(file,'utf8');
    document=JSON.parse(raw);
  }catch(error){
    return{
      required:required===true,present:true,valid:false,path:policyPath,
      fingerprint:raw?sha256(raw):null,version:null,authority:null,machineSourceOfTruth:null,
      syncMode:null,errors:['CENTRAL_POLICY_PARSE:'+clean(error?.message||error)],document:null
    };
  }
  const errors=policyValidationErrors(document);
  return{
    required:required===true,present:true,valid:errors.length===0,path:policyPath,
    fingerprint:sha256(raw),version:Number(document.version)||null,
    authority:clean(document.authority)||null,machineSourceOfTruth:clean(document.machineSourceOfTruth)||null,
    syncMode:clean(document?.developmentLifecycleMachine?.sharedWorkerContext?.syncMode)||null,
    errors,document
  };
}

function taggedValue(evidence=[],prefixes=[]){
  for(const row of evidence){
    for(const prefix of prefixes){
      if(row.startsWith(prefix))return clean(row.slice(prefix.length));
    }
  }
  return null;
}

function compileFailureRoute(task={},responsibleFiles=[]){
  const evidence=uniq(task.evidence||[]);
  const signatures=evidence.filter(row=>
    /(?:runtime-failure|hard-failure|blocker|required|repair|required-failure|validation-failure)/i.test(row)
  ).slice(0,16);
  const failureStage=
    taggedValue(evidence,['failure-stage:','web-stage:','runtime-stage:','validation-stage:','requested-stage:'])||
    clean(task.currentStep)||null;
  const lastPassedStage=taggedValue(evidence,['last-passed-stage:','last-pass-stage:','verified-stage:'])||null;
  const responsibleSystem=taggedValue(evidence,['responsible-system:','failure-system:','owner-system:'])||null;
  const blocker=clean(task.blocker)||null;
  const lastOutcome=clean(task.lastOutcome)||null;
  return{
    mode:'EXACT_FAILURE_STAGE_REPAIR',
    failureStage,
    lastPassedStage,
    blocker,
    lastOutcome,
    signatures,
    responsibleSystem,
    responsibleFiles:uniq(responsibleFiles),
    preserveAlreadyPassedStages:true,
    restartFromBeginning:false,
    widenScopeAutomatically:false,
    revalidateImmediately:true
  };
}

export function compileVibeCentralWorkContract({
  snapshot=null,
  task={},
  plan={},
  route={},
  responsibleFiles=[],
  presentationQuality={},
  supervisionContract=null
}={}){
  const source=snapshot||{required:false,present:false,valid:true,path:CANONICAL_VIBE_POLICY_PATH,document:null};
  const policy=source.document||{};
  const config=policy?.vibeCentralWorkContract||{};
  const shared=policy?.developmentLifecycleMachine?.sharedWorkerContext||{};
  const supervised=supervisionContract?.required===true;
  const supervisionApproved=!supervised||supervisionContract?.approved===true||task?.supervisionApproved===true;
  const protectedSemantics=uniq([
    'GAME_IDENTITY',
    'SAVE_KEY_AND_SAVE_MEANING',
    'CORE_LOOP',
    'PROGRESSION',
    'MOBILE_INPUT',
    'EXISTING_VALID_FEATURES',
    ...(supervisionContract?.protectedSemantics||[]),
    ...(presentationQuality?.preserve||[]),
    ...(task?.protectedSemantics||[]),
    ...(config?.defaultProtectedSemantics||[])
  ]);
  const forbidden=uniq([
    'WRAPPER_OR_SHADOW_PIPELINE',
    'UNRELATED_SYSTEM_MUTATION',
    'SAVE_RESET_WITHOUT_MIGRATION',
    'FAKE_GAMEPLAY_OR_VALIDATION_ONLY_PATCH',
    'RESPONSIBLE_FILE_SCOPE_EXPANSION_WITHOUT_NEW_CONTRACT',
    ...(supervisionContract?.hardReject||[]),
    ...(config?.forbiddenChanges||[])
  ]);
  const passConditions=uniq([
    ...(task?.completionCriteria||[]),
    ...(plan?.qa||[]),
    ...(supervised?['SUPERVISOR_PASS_REQUIRED']:[]),
    ...(presentationQuality?.required===true?['PRESENTATION_RUNTIME_QA_REQUIRED']:[])
  ]);
  const required=source.required===true||config.required===true;
  return{
    version:1,
    required,
    validAtCompile:source.valid===true,
    policy:{
      path:source.path||CANONICAL_VIBE_POLICY_PATH,
      version:source.version||null,
      fingerprint:source.fingerprint||null,
      authority:source.authority||null,
      machineSourceOfTruth:source.machineSourceOfTruth||null,
      syncMode:source.syncMode||null
    },
    task:{
      id:clean(task.id)||null,
      gameId:clean(task.gameId)||null,
      target:clean(plan.target||task.target).toLowerCase()||null,
      executionRoute:clean(route.route)||null
    },
    writableScope:{
      exactResponsibleFiles:uniq(responsibleFiles),
      automaticExpansionAllowed:false,
      directResponsibleSystemModificationPreferred:true
    },
    invariants:{
      protectedSemantics,
      forbiddenChanges:forbidden,
      saveMeaningMustRemainCompatible:true,
      unrelatedBalanceMutationForbidden:true,
      existingValidFeaturesMustRemainFunctional:true
    },
    failureRoute:compileFailureRoute(task,responsibleFiles),
    passConditions,
    freshness:{
      beforeWorkRequired:shared.beforeWorkRequired===true,
      afterWorkRequired:shared.afterWorkRequired===true,
      staleMayNotStart:shared.staleContextMayNotStartWork===true,
      staleMayNotComplete:shared.staleContextMayNotCompleteWork===true,
      mismatchAction:clean(shared.mismatchAction)||'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE',
      compare:'SHA256'
    },
    learning:{
      reusableLearningAllowed:supervisionApproved,
      traceOnlyUntilSupervisorPass:supervised&&!supervisionApproved
    },
    promotion:{
      automaticMainPromotionAllowed:supervisionApproved&&task?.requiresOwnerDecision!==true&&task?.protectedChange!==true,
      supervisorPassRequired:supervised,
      supervisorApproved:supervisionApproved
    },
    preflightChecks:[
      'READ_EXISTING_RESPONSIBLE_SYSTEM',
      'VERIFY_EXACT_WRITABLE_SCOPE',
      'PRESERVE_PROTECTED_SEMANTICS',
      'NO_WRAPPER_OR_SHADOW_PIPELINE',
      'TRACE_FAILURE_TO_RESPONSIBLE_SYSTEM',
      'PLAN_RUNTIME_VERIFIABLE_RESULT'
    ],
    authorityExpanded:false
  };
}

export function compiledWorkContractGuidance(contract={}){
  if(contract?.required!==true)return'';
  const failure=contract.failureRoute||{};
  return[
    '[CENTRAL COMPILED WORK CONTRACT]',
    `policy=${contract.policy?.path||CANONICAL_VIBE_POLICY_PATH}; version=${contract.policy?.version??'unknown'}; sha256=${contract.policy?.fingerprint||'missing'}`,
    `exact-writable-files=${(contract.writableScope?.exactResponsibleFiles||[]).join(', ')||'NONE'}`,
    `preserve=${(contract.invariants?.protectedSemantics||[]).join(', ')}`,
    `forbidden=${(contract.invariants?.forbiddenChanges||[]).join(', ')}`,
    `failure-stage=${failure.failureStage||'TASK_RESPONSIBILITY'}; last-passed-stage=${failure.lastPassedStage||'UNKNOWN'}; blocker=${failure.blocker||'NONE'}`,
    failure.signatures?.length?`failure-evidence=${failure.signatures.join(' | ')}`:'',
    'Read and modify the existing responsible system directly. Do not create a wrapper, shadow pipeline, validation-only behavior, or unrelated rewrite.',
    'Preserve already-passed stages. Repair the exact failure stage, then revalidate it immediately.',
    contract.learning?.traceOnlyUntilSupervisorPass===true?'Supervised candidate is TRACE_ONLY. Reusable learning and main promotion remain blocked until supervisor PASS.':'',
    'The central roadmap fingerprint must still match before work starts and again before candidate output is committed.'
  ].filter(Boolean).join('\n');
}

export function assertCompiledWorkContractFresh({cwd=process.cwd(),contract={},phase='WORK'}={}){
  if(contract?.required!==true)return{status:'NOT_REQUIRED',phase,fresh:true};
  if(contract?.validAtCompile!==true)throw new Error(`CENTRAL_POLICY_INVALID_AT_COMPILE:${phase}`);
  const current=loadCentralPolicySnapshot({repoRoot:cwd,policyPath:contract?.policy?.path||CANONICAL_VIBE_POLICY_PATH,required:true});
  if(!current.valid)throw new Error(`CENTRAL_POLICY_INVALID:${phase}:${current.errors.join('|')||'UNKNOWN'}`);
  if(!contract?.policy?.fingerprint)throw new Error(`CENTRAL_POLICY_FINGERPRINT_MISSING:${phase}`);
  if(current.fingerprint!==contract.policy.fingerprint){
    throw new Error(`CENTRAL_POLICY_STALE:${phase}:${contract.policy.fingerprint}->${current.fingerprint}`);
  }
  return{
    status:'PASS',phase,fresh:true,path:current.path,version:current.version,
    fingerprint:current.fingerprint,syncMode:current.syncMode
  };
}
