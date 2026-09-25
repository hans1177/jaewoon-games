// 파일명: tools/vibe2-central-work-contract.mjs
// 역할: 최신 중앙 roadmap을 Vibe 작업 단위의 실행 계약으로 컴파일하고 작업 중 정책 stale 여부를 fail-closed로 검증한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { VIBE_WORK_LOCK_STATE_BRANCH, VIBE_WORK_LOCK_STATE_PATH } from '../assets/vibe-work-lock.js';
import { compileOwnerCanonicalConstitution, compileCentralArchitectureProjection } from './company-shared-context.mjs';

export const CANONICAL_VIBE_POLICY_PATH='company-learning/platform-release-roadmap.json';

const clean=value=>String(value??'').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const sha256=value=>crypto.createHash('sha256').update(String(value??''),'utf8').digest('hex');

function workerExecutionPolicyProjection(policy={}){
  const constitution=compileOwnerCanonicalConstitution(policy);
  const architectureProjection=compileCentralArchitectureProjection(policy);
  const shared=policy?.developmentLifecycleMachine?.sharedWorkerContext||{};
  const live=shared?.liveMainFreshness||{};
  const centralDocumentation=policy?.centralDocumentation||{};
  const orchestration=policy?.assistantRoadmapOrchestration||{};
  const primaryCollaboration=policy?.developmentLifecycleMachine?.primaryAiOrchestration?.internalVibeAiCollaboration||{};
  const role=orchestration?.assistantRole||{};
  const boundary=orchestration?.executionBoundary||{};
  return{
    status:clean(policy.status)||null,
    policySource:clean(policy.policySource)||null,
    ownerCanonicalConstitution:{
      version:constitution.version,
      authority:constitution.authority,
      constitutionalAuthority:constitution.constitutionalAuthority,
      automaticContractBinding:constitution.binding?.automaticContractBinding===true,
      fingerprint:constitution.fingerprint,
      orderedRuleIds:constitution.orderedRuleIds,
      ruleFingerprints:constitution.rules.map(row=>({number:row.number,id:row.id,fingerprint:row.fingerprint}))
    },
    compiledCentralArchitecture:{
      valid:architectureProjection.valid,
      fingerprint:architectureProjection.fingerprint,
      contract:architectureProjection.contract
    },
    sharedWorkerContext:{
      requiredForAllWorkers:shared.requiredForAllWorkers===true,
      centralPolicy:clean(shared.centralPolicy)||null,
      logMap:clean(shared.logMap)||null,
      architectureMap:clean(shared.architectureMap)||null,
      securityPolicy:clean(shared.securityPolicy)||null,
      loadOrder:uniq(shared.loadOrder||[]),
      validator:clean(shared.validator)||null,
      qa:clean(shared.qa)||null,
      bindSha256ToExecutionEvidence:shared.bindSha256ToExecutionEvidence===true,
      requiredLogMarkers:uniq(shared.requiredLogMarkers||[]),
      centralDocumentationContract:clean(shared.centralDocumentationContract)||null,
      codeChangeRequiresCentralDocumentationImpactReview:shared.codeChangeRequiresCentralDocumentationImpactReview===true,
      documentationChangeRequiresImplementationImpactReview:shared.documentationChangeRequiresImplementationImpactReview===true,
      postCentralDocumentWriteSharedContextResyncRequired:shared.postCentralDocumentWriteSharedContextResyncRequired===true,
      beforeWorkRequired:shared.beforeWorkRequired===true,
      afterWorkRequired:shared.afterWorkRequired===true,
      completionRequiresSharedContextSync:shared.completionRequiresSharedContextSync===true,
      runtimeMayNotCreatePolicy:shared.runtimeMayNotCreatePolicy===true,
      aiMayNotExpandOwnAuthority:shared.aiMayNotExpandOwnAuthority===true,
      staleContextMayNotStartWork:shared.staleContextMayNotStartWork===true,
      staleContextMayNotCompleteWork:shared.staleContextMayNotCompleteWork===true,
      syncMode:clean(shared.syncMode)||null,
      mismatchAction:clean(shared.mismatchAction)||null,
      liveMainFreshness:{
        required:live.required===true,
        ref:clean(live.ref)||null,
        policyPath:clean(live.policyPath)||null,
        compare:clean(live.compare)||null,
        refreshBeforeSourceGeneration:live.refreshBeforeSourceGeneration===true,
        refreshBeforeCandidateWrite:live.refreshBeforeCandidateWrite===true,
        fetchOrValidationFailure:clean(live.fetchOrValidationFailure)||null,
        fingerprintMismatch:clean(live.fingerprintMismatch)||null
      }
    },
    centralDocumentation:{
      sourceOfTruth:clean(centralDocumentation.sourceOfTruth)||null,
      canonicalSet:centralDocumentation.canonicalSet||{},
      readOrder:uniq(centralDocumentation.readOrder||[]),
      rules:centralDocumentation.rules||{},
      synchronization:centralDocumentation.synchronization||{},
      machineProjectionSynchronization:centralDocumentation.machineProjectionSynchronization||{}
    },
    primaryAiInternalVibeCollaboration:{
      scope:clean(primaryCollaboration.scope)||null,
      collaborationMode:clean(primaryCollaboration.collaborationMode)||null,
      autonomous24hExecutionContinuesWithoutPrimaryAi:primaryCollaboration.autonomous24hExecutionContinuesWithoutPrimaryAi===true,
      primaryAiPresenceIsRuntimeGate:primaryCollaboration.primaryAiPresenceIsRuntimeGate===true,
      appliesToExistingAndFutureRegisteredInternalAi:primaryCollaboration.appliesToExistingAndFutureRegisteredInternalAi===true,
      directMainWriteGrantedByCollaboration:primaryCollaboration.directMainWriteGrantedByCollaboration===true,
      policyMutationAuthorityGrantedByCollaboration:primaryCollaboration.policyMutationAuthorityGrantedByCollaboration===true,
      selfAcceptanceGrantedByCollaboration:primaryCollaboration.selfAcceptanceGrantedByCollaboration===true,
      capabilityGrowthRoleLock:{
        primaryAiRoleAfterCapabilityGrowth:clean(primaryCollaboration?.capabilityGrowthRoleLock?.primaryAiRoleAfterCapabilityGrowth)||null,
        capabilityMayIncrease:primaryCollaboration?.capabilityGrowthRoleLock?.capabilityMayIncrease===true,
        authorityMayAutoIncrease:primaryCollaboration?.capabilityGrowthRoleLock?.authorityMayAutoIncrease===true,
        primaryAiMayBecomeRuntimeOwner:primaryCollaboration?.capabilityGrowthRoleLock?.primaryAiMayBecomeRuntimeOwner===true,
        primaryAiMayReplaceDeterministicQa:primaryCollaboration?.capabilityGrowthRoleLock?.primaryAiMayReplaceDeterministicQa===true,
        primaryAiMayReplaceVibeImplementationOwnership:primaryCollaboration?.capabilityGrowthRoleLock?.primaryAiMayReplaceVibeImplementationOwnership===true
      }
    },
    assistantRoadmapOrchestration:{
      sourceOfTruth:clean(orchestration.sourceOfTruth)||null,
      blockerOnly:orchestration.blockerOnly===true,
      dedupeRequired:orchestration?.operatingModel?.dedupeRequired===true,
      assistantRole:{
        mayCreateExecutionWorker:role.mayCreateExecutionWorker===true,
        mayMutateWaveQueue:role.mayMutateWaveQueue===true,
        mayReorderWave:role.mayReorderWave===true,
        mayMutateLocksOrPolicy:role.mayMutateLocksOrPolicy===true,
        mayAutoPromoteLearningOrTuning:role.mayAutoPromoteLearningOrTuning===true,
        mayExpandNeuralAuthority:role.mayExpandNeuralAuthority===true
      },
      executionBoundary:{
        executionAuthority:clean(boundary.executionAuthority)||null,
        neuralExecutionAuthority:boundary.neuralExecutionAuthority===true,
        workerCreationAuthority:boundary.workerCreationAuthority===true,
        queueMutationAuthority:boundary.queueMutationAuthority===true,
        waveReorderAuthority:boundary.waveReorderAuthority===true,
        lockPolicyMutationAuthority:boundary.lockPolicyMutationAuthority===true,
        automaticLearningTuningPromotionAuthority:boundary.automaticLearningTuningPromotionAuthority===true
      },
      implementationNextGate:clean(orchestration?.implementationState?.nextGate)||null
    }
  };
}
function workerExecutionPolicyFingerprint(policy={}){return sha256(JSON.stringify(workerExecutionPolicyProjection(policy)));}

function policyValidationErrors(policy={}){
  const constitution=compileOwnerCanonicalConstitution(policy);
  const architectureProjection=compileCentralArchitectureProjection(policy);
  const shared=policy?.developmentLifecycleMachine?.sharedWorkerContext||{};
  const centralDocumentation=policy?.centralDocumentation||{};
  const orchestration=policy?.assistantRoadmapOrchestration||{};
  const collaboration=policy?.developmentLifecycleMachine?.primaryAiOrchestration?.internalVibeAiCollaboration||{};
  const role=orchestration?.assistantRole||{};
  const boundary=orchestration?.executionBoundary||{};
  const errors=[];
  if(!constitution.valid)errors.push(...constitution.errors.map(error=>`OWNER_CANONICAL_${error}`));
  if(shared?.compiledArchitectureProjection?.required===true&&!architectureProjection.valid)errors.push(...architectureProjection.errors.map(error=>`CENTRAL_ARCHITECTURE_${error}`));
  if(clean(policy.status)!=='OWNER_DIRECT_LOCKED')errors.push('STATUS');
  if(clean(policy.policySource)!==CANONICAL_VIBE_POLICY_PATH)errors.push('POLICY_SOURCE');
  if(shared.requiredForAllWorkers!==true)errors.push('SHARED_CONTEXT_REQUIRED');
  if(clean(shared.centralPolicy)!==CANONICAL_VIBE_POLICY_PATH)errors.push('SHARED_CONTEXT_POLICY');
  const canonicalSet=centralDocumentation?.canonicalSet||{};
  if(clean(centralDocumentation.sourceOfTruth)!==CANONICAL_VIBE_POLICY_PATH+'#centralDocumentation')errors.push('CENTRAL_DOCUMENTATION_SOURCE');
  if(clean(shared.logMap)!==clean(canonicalSet.logMap))errors.push('SHARED_CONTEXT_LOG_MAP');
  if(clean(shared.architectureMap)!==clean(canonicalSet.architectureMap))errors.push('SHARED_CONTEXT_ARCHITECTURE_MAP');
  if(clean(shared.securityPolicy)!==clean(canonicalSet.securityPolicy))errors.push('SHARED_CONTEXT_SECURITY_POLICY');
  if(JSON.stringify(shared.loadOrder||[])!==JSON.stringify(centralDocumentation.readOrder||[]))errors.push('SHARED_CONTEXT_READ_ORDER');
  if(shared.bindSha256ToExecutionEvidence!==true)errors.push('SHARED_CONTEXT_HASH_BINDING');
  for(const marker of ['WORKER_CONTEXT_POLICY_SHA256','WORKER_CONTEXT_LOG_MAP_SHA256','WORKER_CONTEXT_ARCHITECTURE_SHA256','WORKER_CONTEXT_SECURITY_POLICY_SHA256']){
    if(!(shared.requiredLogMarkers||[]).includes(marker))errors.push('SHARED_CONTEXT_REQUIRED_MARKER:'+marker);
  }
  if(clean(shared.centralDocumentationContract)!==CANONICAL_VIBE_POLICY_PATH+'#centralDocumentation')errors.push('SHARED_CONTEXT_CENTRAL_DOCUMENTATION_CONTRACT');
  if(shared.codeChangeRequiresCentralDocumentationImpactReview!==true)errors.push('CODE_CHANGE_DOCUMENTATION_IMPACT_REVIEW');
  if(shared.documentationChangeRequiresImplementationImpactReview!==true)errors.push('DOCUMENTATION_CHANGE_IMPLEMENTATION_IMPACT_REVIEW');
  if(shared.postCentralDocumentWriteSharedContextResyncRequired!==true)errors.push('POST_DOCUMENT_WRITE_SHARED_CONTEXT_RESYNC');
  if(centralDocumentation?.synchronization?.beforeWorkLoadAndValidateCanonicalSet!==true)errors.push('CENTRAL_DOCUMENTATION_BEFORE_WORK_SYNC');
  if(centralDocumentation?.synchronization?.afterWorkReloadAndValidateCanonicalSet!==true)errors.push('CENTRAL_DOCUMENTATION_AFTER_WORK_SYNC');
  if(centralDocumentation?.synchronization?.vibeWorkerPreflightRequired!==true)errors.push('CENTRAL_DOCUMENTATION_VIBE_PREFLIGHT');
  if(centralDocumentation?.synchronization?.currentMainPolicyShaBindingRequired!==true)errors.push('CENTRAL_DOCUMENTATION_MAIN_BINDING');
  if(centralDocumentation?.synchronization?.documentHashesBoundToExecutionEvidence!==true)errors.push('CENTRAL_DOCUMENTATION_HASH_EVIDENCE');
  if(shared.beforeWorkRequired!==true)errors.push('BEFORE_WORK_SYNC');
  if(shared.afterWorkRequired!==true)errors.push('AFTER_WORK_SYNC');
  if(shared.staleContextMayNotStartWork!==true)errors.push('STALE_START_BLOCK');
  if(shared.staleContextMayNotCompleteWork!==true)errors.push('STALE_COMPLETION_BLOCK');
  if(clean(shared.syncMode)!=='ROADMAP_FIRST_FAIL_CLOSED')errors.push('SYNC_MODE');
  if(clean(collaboration.scope)!=='ALL_VIBE_INTERNAL_AI_AUTONOMOUS_WORKERS_NEURAL_DIAGNOSIS_CRITIC_ROOT_CAUSE_RECOVERY_PLANNER_IMPLEMENTATION_QA_RELEASE_SECURITY_AND_LEARNING_SYSTEMS')errors.push('PRIMARY_AI_INTERNAL_VIBE_SCOPE');
  if(clean(collaboration.collaborationMode)!=='PRIMARY_AI_NON_BLOCKING_COPILOT_OVERLAY')errors.push('PRIMARY_AI_INTERNAL_VIBE_MODE');
  if(collaboration.autonomous24hExecutionContinuesWithoutPrimaryAi!==true||collaboration.primaryAiPresenceIsRuntimeGate!==false)errors.push('PRIMARY_AI_INTERNAL_VIBE_NONBLOCKING');
  if(collaboration.appliesToExistingAndFutureRegisteredInternalAi!==true)errors.push('PRIMARY_AI_INTERNAL_VIBE_COVERAGE');
  if(collaboration.directMainWriteGrantedByCollaboration!==false||collaboration.policyMutationAuthorityGrantedByCollaboration!==false||collaboration.selfAcceptanceGrantedByCollaboration!==false)errors.push('PRIMARY_AI_INTERNAL_VIBE_AUTHORITY');
  const capabilityLock=collaboration?.capabilityGrowthRoleLock||{};
  if(clean(capabilityLock.primaryAiRoleAfterCapabilityGrowth)!=='NON_BLOCKING_ASSISTANT_AND_COLLABORATOR')errors.push('PRIMARY_AI_CAPABILITY_GROWTH_ROLE_LOCK');
  if(capabilityLock.capabilityMayIncrease!==true||capabilityLock.authorityMayAutoIncrease!==false)errors.push('VIBE_CAPABILITY_AUTHORITY_SEPARATION');
  if(capabilityLock.primaryAiMayBecomeRuntimeOwner!==false||capabilityLock.primaryAiMayReplaceDeterministicQa!==false||capabilityLock.primaryAiMayReplaceVibeImplementationOwnership!==false)errors.push('PRIMARY_AI_ASSISTANT_BOUNDARY_AFTER_CAPABILITY_GROWTH');
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
      fingerprint:null,executionFingerprint:null,version:null,status:null,policySource:null,syncMode:null,
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
      fingerprint:raw?sha256(raw):null,executionFingerprint:null,version:null,status:null,policySource:null,
      syncMode:null,errors:['CENTRAL_POLICY_PARSE:'+clean(error?.message||error)],document:null
    };
  }
  const errors=policyValidationErrors(document);
  return{
    required:required===true,present:true,valid:errors.length===0,path:policyPath,
    fingerprint:sha256(raw),executionFingerprint:workerExecutionPolicyFingerprint(document),version:Number(document.version)||null,
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
      fingerprint:sha256(raw),executionFingerprint:workerExecutionPolicyFingerprint(document),version:Number(document.version)||null,
      status:clean(document.status)||null,policySource:clean(document.policySource)||null,
      syncMode:clean(document?.developmentLifecycleMachine?.sharedWorkerContext?.syncMode)||null,
      errors,document,source:'GIT_REF',ref:resolvedRef
    };
  }catch(error){
    const detail=clean(error?.stderr||error?.message||error).replace(/\s+/g,' ').slice(0,240)||'UNKNOWN';
    return{
      required:required===true,present:false,valid:required!==true,path:policyPath,
      fingerprint:null,executionFingerprint:null,version:null,status:null,policySource:null,syncMode:null,
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

function taskEvidenceValue(task={},prefixes=[]){return taggedValue(uniq(task?.evidence||[]),prefixes)}
function compileCurrentTruth({task={},source={},mainSha='',responsibleFiles=[]}={}){return{gameId:clean(task.gameId)||null,approvedDesignRevision:clean(task.designRevision||taskEvidenceValue(task,['design-revision:']))||null,currentSourceRevision:clean(task.sourceRevision||task.robloxSourceCommit||mainSha)||null,currentInternalRobloxVersion:Number(task.internalRobloxVersion||task.robloxInternalReleaseVersion||taskEvidenceValue(task,['internal-roblox-version:']))||null,currentKnownGoodSourceRevision:clean(task.knownGoodSourceRevision||taskEvidenceValue(task,['known-good-source:']))||null,currentKnownGoodArtifact:clean(task.knownGoodArtifact||taskEvidenceValue(task,['known-good-artifact:']))||null,activeChangeSetId:clean(task.changeSet?.id||task.changeSetId)||null,openFailureEvidence:uniq([...(task.failureEvidence||[]),...(task.evidence||[]).filter(row=>/(?:failure|blocker|repair|required)/i.test(row))]).slice(0,24),styleLock:clean(task.styleLock||taskEvidenceValue(task,['style-lock:']))||null,policyVersion:source.version||null,mainSha:clean(mainSha)||null,responsibleFiles:uniq(responsibleFiles),compiledNotPersisted:true}}
function compileAcceptanceContract(task={},plan={}){const explicit=task.acceptanceContract||task.changeSet?.acceptanceContract||{},observable=uniq([...(explicit.observable||[]),...(task.completionCriteria||[]),...(plan.qa||[])]);return{observable,markerOnlyPassForbidden:explicit.markerOnlyPassForbidden!==false,preserveExistingBehaviorRequired:explicit.preserveExistingBehaviorRequired!==false,exactRevisionRequired:explicit.exactRevisionRequired!==false,runtimeObservationRequired:clean(task.target).toLowerCase()==='roblox'||task.presentationQuality?.required===true||explicit.runtimeObservationRequired===true}}

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
  const constitution=compileOwnerCanonicalConstitution(policy);
  const architectureProjection=compileCentralArchitectureProjection(policy);
  const shared=policy?.developmentLifecycleMachine?.sharedWorkerContext||{};
  const centralDocumentation=policy?.centralDocumentation||{};
  const orchestration=policy?.assistantRoadmapOrchestration||{};
  const boundary=orchestration?.executionBoundary||{};
  const supervised=supervisionContract?.required===true;
  const supervisionApproved=!supervised||supervisionContract?.approved===true||task?.supervisionApproved===true;
  const systemArchitecture=clean(plan?.target||task?.target).toLowerCase()==='system'&&task?.systemSteward===true&&clean(task?.department).toLowerCase()==='system-architecture';
  const protectedSemantics=uniq(systemArchitecture?[
    'CENTRAL_POLICY_AUTHORITY_BOUNDARY','SECURITY_GATES','QUALITY_AND_EVIDENCE_GATES','VERIFIED_LEARNING',
    'EXISTING_PUBLIC_AND_RUNTIME_CONTRACTS','EXISTING_SCHEDULER_AUTHORITY',...(task?.protectedSemantics||[])
  ]:[
    'GAME_IDENTITY','SAVE_KEY_AND_SAVE_MEANING','CORE_LOOP','PROGRESSION','MOBILE_INPUT','EXISTING_VALID_FEATURES',
    ...(supervisionContract?.protectedSemantics||[]),...(presentationQuality?.preserve||[]),...(task?.protectedSemantics||[])
  ]);
  const forbidden=uniq(systemArchitecture?[
    'AUTHORITY_EXPANSION','GATE_OR_THRESHOLD_WEAKENING','SECURITY_WEAKENING','VERIFIED_LEARNING_DELETION',
    'FABRICATED_PASS','WRAPPER_OR_SHADOW_PIPELINE','UNRELATED_SYSTEM_MUTATION','RESPONSIBLE_FILE_SCOPE_EXPANSION_WITHOUT_NEW_CONTRACT'
  ]:[
    'WRAPPER_OR_SHADOW_PIPELINE','UNRELATED_SYSTEM_MUTATION','SAVE_RESET_WITHOUT_MIGRATION',
    'FAKE_GAMEPLAY_OR_VALIDATION_ONLY_PATCH','RESPONSIBLE_FILE_SCOPE_EXPANSION_WITHOUT_NEW_CONTRACT',
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
  const exactResponsibleFiles=uniq(responsibleFiles);
  const currentTruth=compileCurrentTruth({task,source,mainSha:resolvedMainSha,responsibleFiles:exactResponsibleFiles});
  const acceptanceContract=compileAcceptanceContract(task,plan);
  const changeSet=task.changeSet&&typeof task.changeSet==='object'?task.changeSet:{id:clean(task.changeSetId)||workKey,baseSourceRevision:clean(task.baseSourceRevision||resolvedMainSha)||null,status:clean(task.changeSetStatus)||'ACTIVE'};
  const workLockRequired=clean(route?.route).toLowerCase()==='text-source-worker'&&exactResponsibleFiles.length>0;
  const workLock={
    requiredBeforeSourceWrite:workLockRequired,
    stateBranch:VIBE_WORK_LOCK_STATE_BRANCH,
    statePath:VIBE_WORK_LOCK_STATE_PATH,
    worker:'vibe2',
    taskId:workKey,
    gameId:clean(task.gameId)||null,
    files:exactResponsibleFiles,
    baseSha:resolvedMainSha,
    acquisitionState:workLockRequired?'WORKER_MUST_ACQUIRE_BEFORE_SOURCE_WRITE':'NOT_REQUIRED',
    releaseRule:workLockRequired?'RELEASE_AFTER_FAN_IN_QA_OR_ABORT':'NOT_REQUIRED',
    sameTaskSpeculativeVariantsMayReuse:true,
    authority:'EDIT_EXCLUSIVITY_ONLY_NO_OWNER_GATE_EXPANSION'
  };
  return{
    version:2,
    required,
    validAtCompile:source.valid===true,
    constitution:{
      version:constitution.version,
      authority:constitution.authority,
      constitutionalAuthority:constitution.constitutionalAuthority,
      fingerprint:constitution.fingerprint,
      automaticContractBinding:constitution.binding?.automaticContractBinding===true,
      appliesToAllCurrentAndFutureRegisteredVibeWorkers:constitution.binding?.appliesToAllCurrentAndFutureRegisteredVibeWorkers===true,
      childContractMayNotOverride:constitution.binding?.childContractMayNotOverride===true,
      orderedRuleIds:constitution.orderedRuleIds,
      rules:constitution.rules.map(row=>({key:row.key,number:row.number,id:row.id,label:row.label,authority:row.authority,objective:row.objective,fingerprint:row.fingerprint,contract:row.contract}))
    },
    architectureProjection:{
      valid:architectureProjection.valid,
      fingerprint:architectureProjection.fingerprint,
      sourceOfTruth:architectureProjection.contract?.sourceOfTruth||CANONICAL_VIBE_POLICY_PATH,
      authorityOrder:architectureProjection.contract?.authorityOrder||[],
      nativeFoundation:architectureProjection.contract?.nativeFoundation||null,
      implementationOwnership:architectureProjection.contract?.implementationOwnership||null
    },
    policy:{
      path:source.path||CANONICAL_VIBE_POLICY_PATH,
      version:source.version||null,
      fingerprint:source.fingerprint||null,
      executionFingerprint:source.executionFingerprint||null,
      status:source.status||null,
      policySource:source.policySource||null,
      syncMode:source.syncMode||null
    },
    documentSynchronization:{
      sourceOfTruth:clean(centralDocumentation.sourceOfTruth)||null,
      canonicalSet:centralDocumentation.canonicalSet||{},
      readOrder:uniq(centralDocumentation.readOrder||[]),
      validator:clean(shared.validator)||null,
      qa:clean(shared.qa)||null,
      bindSha256ToExecutionEvidence:shared.bindSha256ToExecutionEvidence===true,
      requiredLogMarkers:uniq(shared.requiredLogMarkers||[]),
      beforeWorkRequired:shared.beforeWorkRequired===true,
      afterWorkRequired:shared.afterWorkRequired===true,
      postCentralDocumentWriteSharedContextResyncRequired:shared.postCentralDocumentWriteSharedContextResyncRequired===true
    },
    workRequest:{
      workKey,
      roadmapVersion:source.version||null,
      mainSha:resolvedMainSha,
      scope:exactResponsibleFiles,
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
    currentTruth,
    changeSet,
    acceptanceContract,
    workLock,
    writableScope:{
      exactResponsibleFiles,
      automaticExpansionAllowed:false,
      directResponsibleSystemModificationPreferred:true
    },
    invariants:{
      protectedSemantics,
      forbiddenChanges:forbidden,
      saveMeaningMustRemainCompatible:!systemArchitecture,
      unrelatedBalanceMutationForbidden:true,
      existingValidFeaturesMustRemainFunctional:true,
      authorityMustRemainUnchanged:systemArchitecture,
      qualityEvidenceAndSecurityGatesMustRemainUnchanged:systemArchitecture
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
    preflightChecks:systemArchitecture?[
      'READ_EXISTING_RESPONSIBLE_SYSTEM','VERIFY_STRUCTURAL_CAUSE','COMPARE_AT_LEAST_TWO_ALTERNATIVES',
      'VERIFY_EXACT_WRITABLE_SCOPE','PRESERVE_AUTHORITY_AND_GATES','NO_WRAPPER_OR_SHADOW_PIPELINE',
      'PLAN_SAME_FAILURE_RECHECK','PLAN_BEFORE_AFTER_METRIC_COMPARISON'
    ]:[
      'READ_EXISTING_RESPONSIBLE_SYSTEM','VERIFY_EXACT_WRITABLE_SCOPE','PRESERVE_PROTECTED_SEMANTICS',
      'NO_WRAPPER_OR_SHADOW_PIPELINE','TRACE_FAILURE_TO_RESPONSIBLE_SYSTEM','PLAN_RUNTIME_VERIFIABLE_RESULT'
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
    '[OWNER CANONICAL CONSTITUTION - HIGHEST WORKER AUTHORITY]',
    `constitution-sha256=${contract.constitution?.fingerprint||'missing'}; automatic-bind=${contract.constitution?.automaticContractBinding===true?'YES':'NO'}; ordered-rules=${(contract.constitution?.orderedRuleIds||[]).join(' > ')||'NONE'}`,
    ...(contract.constitution?.rules||[]).map(rule=>`${rule.id} ${rule.label||''}: ${rule.objective||'FULL_CANONICAL_RULE_CONTRACT_BOUND'}`),
    'Every current and future registered Vibe worker is automatically bound to every enabled canonical rule. No worker, department, child contract, runtime learning, or subordinate policy may opt out or weaken it.',
    `architecture-projection-sha256=${contract.architectureProjection?.fingerprint||'missing'}; source=${contract.architectureProjection?.sourceOfTruth||CANONICAL_VIBE_POLICY_PATH}`,
    contract.architectureProjection?.nativeFoundation?.version?`native-foundation=V${contract.architectureProjection.nativeFoundation.version}; owner=${contract.architectureProjection.nativeFoundation.executionOwner||'UNKNOWN'}; required=${(contract.architectureProjection.nativeFoundation.requiredFoundationLayers||[]).join(',')||'NONE'}`:'',
    `policy=${contract.policy?.path||CANONICAL_VIBE_POLICY_PATH}; version=${contract.policy?.version??'unknown'}; sha256=${contract.policy?.fingerprint||'missing'}; execution-sha256=${contract.policy?.executionFingerprint||'missing'}`,
    `central-doc-read-order=${(contract.documentSynchronization?.readOrder||[]).join(' > ')||'MISSING'}; hash-binding=${contract.documentSynchronization?.bindSha256ToExecutionEvidence===true?'ALL_CANONICAL_DOCS':'MISSING'}`,
    contract.freshness?.liveMainRequired===true?`live-main-ref=${contract.freshness?.liveMainRef||'origin/main'}; refresh-before-check=YES`:'',
    `work-key=${request.workKey||'NONE'}; next-gate=${request.nextGate||'NONE'}; dedupe-key=${request.dedupeKey||'NONE'}`,
    `exact-writable-files=${(contract.writableScope?.exactResponsibleFiles||[]).join(', ')||'NONE'}`,
    `current-truth-source=${contract.currentTruth?.currentSourceRevision||'UNKNOWN'}; change-set=${contract.changeSet?.id||'NONE'}`,
    contract.workLock?.requiredBeforeSourceWrite===true?`work-lock=REQUIRED; worker=${contract.workLock.worker}; base=${contract.workLock.baseSha||'UNKNOWN'}; files=${(contract.workLock.files||[]).join(', ')||'NONE'}`:'work-lock=NOT_REQUIRED',
    `acceptance=${(contract.acceptanceContract?.observable||[]).join(' | ')||'NONE'}`,
    `preserve=${(contract.invariants?.protectedSemantics||[]).join(', ')}`,
    `forbidden=${(contract.invariants?.forbiddenChanges||[]).join(', ')}`,
    `failure-stage=${failure.failureStage||'TASK_RESPONSIBILITY'}; last-passed-stage=${failure.lastPassedStage||'UNKNOWN'}; blocker=${failure.blocker||'NONE'}`,
    failure.signatures?.length?`failure-evidence=${failure.signatures.join(' | ')}`:'',
    'Read and modify the existing responsible system directly. Do not create a wrapper, shadow pipeline, validation-only behavior, or unrelated rewrite.',
    'Preserve already-passed stages. Repair the exact failure stage, then revalidate it immediately.',
    'This contract does not grant worker creation, queue mutation, wave reorder, lock/policy mutation, or automatic learning/promotion authority.',
    contract.learning?.traceOnlyUntilSupervisorPass===true?'Supervised candidate is TRACE_ONLY. Reusable learning remains blocked until supervisor PASS.':'',
    'The central roadmap must stay valid, and its worker execution-policy projection fingerprint must still match before source generation and again before candidate output is written. Full document SHA remains evidence but unrelated roadmap progress metadata does not invalidate an active worker.'
  ].filter(Boolean).join('\n');
}

export function assertCompiledWorkContractFresh({cwd=process.cwd(),contract={},phase='WORK'}={}){
  if(contract?.required!==true)return{status:'NOT_REQUIRED',phase,fresh:true};
  if(contract?.validAtCompile!==true)throw new Error(`CENTRAL_POLICY_INVALID_AT_COMPILE:${phase}`);
  const policyPath=contract?.policy?.path||CANONICAL_VIBE_POLICY_PATH;
  const current=loadCentralPolicySnapshot({repoRoot:cwd,policyPath,required:true});
  if(!current.valid)throw new Error(`CENTRAL_POLICY_INVALID:${phase}:${current.errors.join('|')||'UNKNOWN'}`);
  if(!contract?.policy?.fingerprint)throw new Error(`CENTRAL_POLICY_FINGERPRINT_MISSING:${phase}`);
  if(!contract?.policy?.executionFingerprint)throw new Error(`CENTRAL_POLICY_EXECUTION_FINGERPRINT_MISSING:${phase}`);
  if(current.executionFingerprint!==contract.policy.executionFingerprint){
    throw new Error(`CENTRAL_POLICY_STALE:${phase}:${contract.policy.executionFingerprint}->${current.executionFingerprint}`);
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
    if(liveMain.executionFingerprint!==contract.policy.executionFingerprint){
      throw new Error(`CENTRAL_POLICY_STALE:${phase}:${contract.policy.executionFingerprint}->${liveMain.executionFingerprint}`);
    }
  }
  return{
    status:'PASS',phase,fresh:true,path:current.path,version:current.version,
    fingerprint:current.fingerprint,executionFingerprint:current.executionFingerprint,syncMode:current.syncMode,
    liveMainRef:liveMain?.ref||null,liveMainVersion:liveMain?.version||null,liveMainFingerprint:liveMain?.fingerprint||null,liveMainExecutionFingerprint:liveMain?.executionFingerprint||null
  };
}
