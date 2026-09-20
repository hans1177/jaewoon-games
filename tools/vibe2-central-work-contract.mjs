// 파일명: tools/vibe2-central-work-contract.mjs
// 역할: 최신 중앙 roadmap을 Vibe 작업 단위의 실행 계약으로 컴파일하고 작업 중 정책 stale 여부를 fail-closed로 검증한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const CANONICAL_VIBE_POLICY_PATH='company-learning/platform-release-roadmap.json';

const clean=value=>String(value??'').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const sha256=value=>crypto.createHash('sha256').update(String(value??''),'utf8').digest('hex');

function policyValidationErrors(policy={}){
  const shared=policy?.developmentLifecycleMachine?.sharedWorkerContext||{};
  const orchestration=policy?.assistantRoadmapOrchestration||{};
  const role=orchestration?.assistantRole||{};
  const boundary=orchestration?.executionBoundary||{};
  const errors=[];
  if(clean(policy.status)!=='OWNER_DIRECT_LOCKED')errors.push('STATUS');
  if(clean(policy.policySource)!==CANONICAL_VIBE_POLICY_PATH)errors.push('POLICY_SOURCE');
  if(shared.requiredForAllWorkers!==true)errors.push('SHARED_CONTEXT_REQUIRED');
  if(clean(shared.centralPolicy)!==CANONICAL_VIBE_POLICY_PATH)errors.push('SHARED_CONTEXT_POLICY');
  if(shared.beforeWorkRequired!==true)errors.push('BEFORE_WORK_SYNC');
  if(shared.afterWorkRequired!==true)errors.push('AFTER_WORK_SYNC');
  if(shared.staleContextMayNotStartWork!==true)errors.push('STALE_START_BLOCK');
  if(shared.staleContextMayNotCompleteWork!==true)errors.push('STALE_COMPLETION_BLOCK');
  if(clean(shared.syncMode)!=='ROADMAP_FIRST_FAIL_CLOSED')errors.push('SYNC_MODE');
  if(clean(orchestration.sourceOfTruth)!==CANONICAL_VIBE_POLICY_PATH)errors.push('ASSISTANT_SOURCE_OF_TRUTH');
  if(orchestration.blockerOnly!==false)errors.push('BLOCKER_ONLY');
  if(orchestration?.operatingModel?.dedupeRequired!==true)errors.push('DEDUPE_REQUIRED');
  if(clean(boundary.executionAuthority)!=='EXISTING_WAVE_SCHEDULER_ONLY')errors.push('EXECUTION_AUTHORITY');
  if(boundary.neuralExecutionAuthority!==false)errors.push('NEURAL_EXECUTION_AUTHORITY');
  if(boundary.workerCreationAuthority!==false)errors.push('WORKER_CREATION_AUTHORITY');
  if(boundary.queueMutationAuthority!==false)errors.push('QUEUE_MUTATION_AUTHORITY');
  if(boundary.waveReorderAuthority!==false)errors.push('WAVE_REORDER_AUTHORITY');
  if(boundary.lockPolicyMutationAuthority!==false)errors.push('LOCK_POLICY_AUTHORITY');
  if(boundary.automaticLearningTuningPromotionAuthority!==false)errors.push('AUTO_LEARNING_AUTHORITY');
  if(role.mayCreateExecutionWorker!==false)errors.push('ASSISTANT_WORKER_CREATION');
  if(role.mayMutateWaveQueue!==false)errors.push('ASSISTANT_QUEUE_MUTATION');
  if(role.mayReorderWave!==false)errors.push('ASSISTANT_WAVE_REORDER');
  if(role.mayMutateLocksOrPolicy!==false)errors.push('ASSISTANT_LOCK_POLICY_MUTATION');
  if(role.mayAutoPromoteLearningOrTuning!==false)errors.push('ASSISTANT_AUTO_LEARNING');
  if(role.mayExpandNeuralAuthority!==false)errors.push('ASSISTANT_NEURAL_AUTHORITY_EXPANSION');
  return errors;
}

export function loadCentralPolicySnapshot({repoRoot=process.cwd(),policyPath=CANONICAL_VIBE_POLICY_PATH,required=false}={}){
  const file=path.resolve(repoRoot,policyPath);
  if(!fs.existsSync(file)){
    return{
      required:required===true,present:false,valid:required!==true,path:policyPath,
      fingerprint:null,version:null,status:null,policySource:null,syncMode:null,
      errors:required===true?['CENTRAL_POLICY_MISSING']:[],document:null
    };
  }
  let raw='',document=null;
  try{
    raw=fs.readFileSync(file,'utf8');
    document=JSON.parse(raw);
  }catch(error){
    return{
      required:required===true,present:true,valid:false,path:policyPath,
      fingerprint:raw?sha256(raw):null,version:null,status:null,policySource:null,
      syncMode:null,errors:['CENTRAL_POLICY_PARSE:'+clean(error?.message||error)],document:null
    };
  }
  const errors=policyValidationErrors(document);
  return{
    required:required===true,present:true,valid:errors.length===0,path:policyPath,
    fingerprint:sha256(raw),version:Number(document.version)||null,
    status:clean(document.status)||null,policySource:clean(document.policySource)||null,
    syncMode:clean(document?.developmentLifecycleMachine?.sharedWorkerContext?.syncMode)||null,
    errors,document
  };
}

export function loadCentralPolicySnapshotFromGitRef({repoRoot=process.cwd(),policyPath=CANONICAL_VIBE_POLICY_PATH,required=false,ref='origin/main',fetchRemote=true}={}){
  const resolvedRef=clean(ref)||'origin/main';
  try{
    const gitRoot=clean(execFileSync('git',['-C',repoRoot,'rev-parse','--show-toplevel'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
    if(!gitRoot)throw new Error('GIT_ROOT_MISSING');
    if(fetchRemote===true){
      const slash=resolvedRef.indexOf('/');
      if(slash<=0||slash===resolvedRef.length-1)throw new Error('LIVE_REF_MUST_BE_REMOTE_BRANCH');
      const remote=resolvedRef.slice(0,slash);
      const branch=resolvedRef.slice(slash+1);
      execFileSync('git',['-C',gitRoot,'fetch','--quiet','--no-tags',remote,`+refs/heads/${branch}:refs/remotes/${remote}/${branch}`],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
    }
    const raw=execFileSync('git',['-C',gitRoot,'show',`${resolvedRef}:${policyPath}`],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
    const document=JSON.parse(raw);
    const errors=policyValidationErrors(document);
    return{
      required:required===true,present:true,valid:errors.length===0,path:policyPath,
      fingerprint:sha256(raw),version:Number(document.version)||null,
      status:clean(document.status)||null,policySource:clean(document.policySource)||null,
      syncMode:clean(document?.developmentLifecycleMachine?.sharedWorkerContext?.syncMode)||null,
      errors,document,source:'GIT_REF',ref:resolvedRef
    };
  }catch(error){
    const detail=clean(error?.stderr||error?.message||error).replace(/\s+/g,' ').slice(0,240)||'UNKNOWN';
    return{
      required:required===true,present:false,valid:required!==true,path:policyPath,
      fingerprint:null,version:null,status:null,policySource:null,syncMode:null,
      errors:required===true?[`CENTRAL_POLICY_LIVE_REF:${detail}`]:[],document:null,source:'GIT_REF',ref:resolvedRef
    };
  }
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
  return{
    mode:'EXACT_FAILURE_STAGE_REPAIR',
    failureStage,
    lastPassedStage,
    blocker:clean(task.blocker)||null,
    lastOutcome:clean(task.lastOutcome)||null,
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
  supervisionContract=null,
  mainSha='',
  livePolicyRef=''
}={}){
  const source=snapshot||{required:false,present:false,valid:true,path:CANONICAL_VIBE_POLICY_PATH,document:null};
  const policy=source.document||{};
  const shared=policy?.developmentLifecycleMachine?.sharedWorkerContext||{};
  const orchestration=policy?.assistantRoadmapOrchestration||{};
  const boundary=orchestration?.executionBoundary||{};
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
    ...(task?.protectedSemantics||[])
  ]);
  const forbidden=uniq([
    'WRAPPER_OR_SHADOW_PIPELINE',
    'UNRELATED_SYSTEM_MUTATION',
    'SAVE_RESET_WITHOUT_MIGRATION',
    'FAKE_GAMEPLAY_OR_VALIDATION_ONLY_PATCH',
    'RESPONSIBLE_FILE_SCOPE_EXPANSION_WITHOUT_NEW_CONTRACT',
    ...(supervisionContract?.hardReject||[])
  ]);
  const passConditions=uniq([
    ...(task?.completionCriteria||[]),
    ...(plan?.qa||[]),
    ...(supervised?['SUPERVISOR_PASS_REQUIRED']:[]),
    ...(presentationQuality?.required===true?['PRESENTATION_RUNTIME_QA_REQUIRED']:[])
  ]);
  const failureRoute=compileFailureRoute(task,responsibleFiles);
  const resolvedMainSha=clean(mainSha||task?.mainSha||process.env.VIBE2_BASE_MAIN_SHA||process.env.GITHUB_SHA)||null;
  const workKey=clean(task?.workKey||task?.id)||null;
  const nextGate=clean(task?.nextGate||failureRoute.failureStage||orchestration?.implementationState?.nextGate)||null;
  const required=source.required===true||Number(orchestration?.version||0)>0;
  const dedupeKey=workKey&&source.fingerprint?sha256([workKey,source.version,source.fingerprint,uniq(responsibleFiles).join('|')].join(':')):null;
  return{
    version:2,
    required,
    validAtCompile:source.valid===true,
    policy:{
      path:source.path||CANONICAL_VIBE_POLICY_PATH,
      version:source.version||null,
      fingerprint:source.fingerprint||null,
      status:source.status||null,
      policySource:source.policySource||null,
      syncMode:source.syncMode||null
    },
    workRequest:{
      workKey,
      roadmapVersion:source.version||null,
      mainSha:resolvedMainSha,
      scope:uniq(responsibleFiles),
      nextGate,
      requiredEvidence:passConditions,
      authorityBoundary:{
        executionAuthority:clean(boundary.executionAuthority)||null,
        neuralExecutionAuthority:boundary.neuralExecutionAuthority===true,
        workerCreationAuthority:boundary.workerCreationAuthority===true,
        queueMutationAuthority:boundary.queueMutationAuthority===true,
        waveReorderAuthority:boundary.waveReorderAuthority===true,
        lockPolicyMutationAuthority:boundary.lockPolicyMutationAuthority===true,
        automaticLearningTuningPromotionAuthority:boundary.automaticLearningTuningPromotionAuthority===true
      },
      dedupeKey
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
    failureRoute,
    passConditions,
    freshness:{
      beforeWorkRequired:shared.beforeWorkRequired===true,
      afterWorkRequired:shared.afterWorkRequired===true,
      staleMayNotStart:shared.staleContextMayNotStartWork===true,
      staleMayNotComplete:shared.staleContextMayNotCompleteWork===true,
      mismatchAction:clean(shared.mismatchAction)||'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE',
      liveMainRequired:Boolean(clean(livePolicyRef)),
      liveMainRef:clean(livePolicyRef)||null,
      liveMainRefreshBeforeCheck:Boolean(clean(livePolicyRef)),
      compare:clean(livePolicyRef)?'SHA256_LOCAL_AND_LIVE_MAIN':'SHA256_LOCAL'
    },
    learning:{
      reusableLearningAllowed:supervisionApproved,
      traceOnlyUntilSupervisorPass:supervised&&!supervisionApproved
    },
    promotion:{
      automaticMainPromotionAllowed:false,
      reason:'CENTRAL_ROADMAP_ASSISTANT_CONTRACT_DOES_NOT_GRANT_PROMOTION_AUTHORITY',
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
  const request=contract.workRequest||{};
  return[
    '[CENTRAL ROADMAP WORK CONTRACT]',
    `policy=${contract.policy?.path||CANONICAL_VIBE_POLICY_PATH}; version=${contract.policy?.version??'unknown'}; sha256=${contract.policy?.fingerprint||'missing'}`,
    contract.freshness?.liveMainRequired===true?`live-main-ref=${contract.freshness?.liveMainRef||'origin/main'}; refresh-before-check=YES`:'',
    `work-key=${request.workKey||'NONE'}; next-gate=${request.nextGate||'NONE'}; dedupe-key=${request.dedupeKey||'NONE'}`,
    `exact-writable-files=${(contract.writableScope?.exactResponsibleFiles||[]).join(', ')||'NONE'}`,
    `preserve=${(contract.invariants?.protectedSemantics||[]).join(', ')}`,
    `forbidden=${(contract.invariants?.forbiddenChanges||[]).join(', ')}`,
    `failure-stage=${failure.failureStage||'TASK_RESPONSIBILITY'}; last-passed-stage=${failure.lastPassedStage||'UNKNOWN'}; blocker=${failure.blocker||'NONE'}`,
    failure.signatures?.length?`failure-evidence=${failure.signatures.join(' | ')}`:'',
    'Read and modify the existing responsible system directly. Do not create a wrapper, shadow pipeline, validation-only behavior, or unrelated rewrite.',
    'Preserve already-passed stages. Repair the exact failure stage, then revalidate it immediately.',
    'This contract does not grant worker creation, queue mutation, wave reorder, lock/policy mutation, or automatic learning/promotion authority.',
    contract.learning?.traceOnlyUntilSupervisorPass===true?'Supervised candidate is TRACE_ONLY. Reusable learning remains blocked until supervisor PASS.':'',
    'The central roadmap fingerprint must still match before source generation and again before candidate output is written.'
  ].filter(Boolean).join('\n');
}

export function assertCompiledWorkContractFresh({cwd=process.cwd(),contract={},phase='WORK'}={}){
  if(contract?.required!==true)return{status:'NOT_REQUIRED',phase,fresh:true};
  if(contract?.validAtCompile!==true)throw new Error(`CENTRAL_POLICY_INVALID_AT_COMPILE:${phase}`);
  const policyPath=contract?.policy?.path||CANONICAL_VIBE_POLICY_PATH;
  const current=loadCentralPolicySnapshot({repoRoot:cwd,policyPath,required:true});
  if(!current.valid)throw new Error(`CENTRAL_POLICY_INVALID:${phase}:${current.errors.join('|')||'UNKNOWN'}`);
  if(!contract?.policy?.fingerprint)throw new Error(`CENTRAL_POLICY_FINGERPRINT_MISSING:${phase}`);
  if(current.fingerprint!==contract.policy.fingerprint){
    throw new Error(`CENTRAL_POLICY_STALE:${phase}:${contract.policy.fingerprint}->${current.fingerprint}`);
  }
  let liveMain=null;
  if(contract?.freshness?.liveMainRequired===true){
    liveMain=loadCentralPolicySnapshotFromGitRef({
      repoRoot:cwd,
      policyPath,
      required:true,
      ref:contract?.freshness?.liveMainRef||'origin/main',
      fetchRemote:contract?.freshness?.liveMainRefreshBeforeCheck!==false
    });
    if(!liveMain.valid)throw new Error(`CENTRAL_POLICY_LIVE_INVALID:${phase}:${liveMain.errors.join('|')||'UNKNOWN'}`);
    if(liveMain.fingerprint!==contract.policy.fingerprint){
      throw new Error(`CENTRAL_POLICY_STALE:${phase}:${contract.policy.fingerprint}->${liveMain.fingerprint}`);
    }
  }
  return{
    status:'PASS',phase,fresh:true,path:current.path,version:current.version,
    fingerprint:current.fingerprint,syncMode:current.syncMode,
    liveMainRef:liveMain?.ref||null,liveMainVersion:liveMain?.version||null,liveMainFingerprint:liveMain?.fingerprint||null
  };
}
