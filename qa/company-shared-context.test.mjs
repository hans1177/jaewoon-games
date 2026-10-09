// 파일명: qa/company-shared-context.test.mjs
// 역할: 중앙 로드맵과 등록 작업자 실행계열의 문서=코드 동기화 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateSharedWorkerContext, verifyPinnedSharedWorkerContext } from '../tools/company-shared-context.mjs';

function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'company-shared-context-'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function writeText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
function fixtures(){
  const policy='company-learning/platform-release-roadmap.json',log='company-learning/company-log-map.json',arch='company-learning/company-architecture-map.json',security='company-learning/security-immune-system.json',launcher='.github/workflows/demo-worker.yml';
  const launchers=[launcher];
  return{
    policy,log,arch,security,launcher,launchers,
    policyJson:{version:36,ownerCanonicalRules:{"version":5,"authority":"OWNER_DIRECTIVE_TEST","constitutionalAuthority":"HIGHEST_VIBE_INTERNAL_WORKER_CONTRACT_AUTHORITY","rule1Handling":"RULE_1_THROUGH_RULE_4_ARE_CANONICALIZED_HERE; IMPLEMENTATION_MUST_PRESERVE_THEIR_ORDERED_GATES_AND_EXISTING_AUTHORITY_BOUNDARIES","constitutionalBinding":{"version":1,"authority":"OWNER_DIRECTIVE_TEST","mode":"DYNAMIC_CANONICAL_RULE_AUTO_BIND","automaticContractBinding":true,"appliesToAllCurrentAndFutureRegisteredVibeWorkers":true,"appliesToAllInternalAiDepartmentsAndAutonomousSubsystems":true,"workerMayNotOptOut":true,"childContractMayNotOverride":true,"runtimeMayNotSilentlyAmend":true,"onlyOwnerDirectiveMayCreateAmendDisableOrRemoveCanonicalRule":true,"ruleDiscoveryKeyPattern":"rule<N>","ruleIdentityPattern":"RULE_<N>_*","orderResolution":"IMPLEMENTATION_ORDER_FIRST_THEN_NUMERIC_AUTO_APPEND","futureCanonicalRulesAutoBindWithoutWorkerCodeChange":true,"executionFingerprintMustIncludeEveryEnabledCanonicalRule":true,"sharedContextMustCompileEveryEnabledCanonicalRule":true,"centralWorkContractMustEmbedEveryEnabledCanonicalRule":true,"workerInstructionMustExposeOrderedCanonicalRules":true,"beforeWorkValidationRequired":true,"afterWorkValidationRequired":false,"staleConstitutionMayNotStartWork":true,"staleConstitutionMayNotCompleteWork":true,"missingOrInvalidBindingAction":"FAIL_CLOSED_BLOCK_WORK_AND_REQUEUE_EXACT_FAILURE_STAGE","constitutionChangeInvalidatesActiveWorkerExecutionFingerprint":true,"subordinatePolicyCannotWeakenCanonicalRule":true,"executableEnforcer":"tools/company-constitution-enforcer.mjs","enforcerRequiredAtPolicyQa":true,"enforcerRequiredAt24hPlanner":true,"enforcerRequiredBeforeWorkerSourceWrite":true,"enforcerRequiredAfterWorkerExecution":false,"global24hStopOnConstitutionFailureForbidden":true,"constitutionViolationAction":"QUARANTINE_OR_REQUEUE_AFFECTED_SCOPE_RECOVER_REPLAN_CONTINUE_GLOBAL_24H","declarativeRuleEnforcementRequired":true,"ruleEnforcementSchemaVersion":1,"futureRuleWithoutMachineEnforcementAction":"FAIL_CLOSED_UNTIL_DECLARATIVE_ASSERTIONS_ARE_DEFINED","hardcodedRuleNumberBranchesForbidden":true,"genericRuleIterationRequired":true,"repositoryAssertions":[{"code":"TEST","operator":"FILE_EXISTS","expected":"package.json"}]},"rule1":{"id":"RULE_1_NEVER_STOP_CONTINUOUS_GAME_DEVELOPMENT","label":"제1규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"CONTINUE","machineEnforcement":{"schemaVersion":1,"assertions":[{"code":"ENABLED","operator":"EQ","path":"enabled","expected":true}]}},"rule2":{"id":"RULE_2_EXTERNAL_AI_SECURITY_CAPTURE_AND_VERIFIED_ABSORPTION","label":"제2규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"SECURE_AND_VERIFY","machineEnforcement":{"schemaVersion":1,"assertions":[{"code":"ENABLED","operator":"EQ","path":"enabled","expected":true}]}},"rule3":{"id":"RULE_3_SELF_GENERATED_UNBOUNDED_VERIFIED_LEARNING_MULTIVERSE","label":"제3규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"LEARN","machineEnforcement":{"schemaVersion":1,"assertions":[{"code":"ENABLED","operator":"EQ","path":"enabled","expected":true}]}},"rule4":{"id":"RULE_4_SELF_ARCHITECTURE_EVOLUTION_AND_FINAL_NEURAL_EXPANSION","label":"제4규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"EVOLVE","machineEnforcement":{"schemaVersion":1,"assertions":[{"code":"ENABLED","operator":"EQ","path":"enabled","expected":true}]}},"implementationOrder":["RULE_1","RULE_2","RULE_3","RULE_4"],"orderedImplementationRequired":true},
    continuousLearning24hContract:{status:'ACTIVE_EXECUTABLE_CONTRACT',existingCanonicalLearningChainOnly:true,separateLearningPipelineForbidden:true},
    centralDocumentation:{machineProjectionSynchronization:{
      mode:'COMPILE_AT_EXECUTION_NO_MANUAL_MIRROR_REQUIRED',
      centralPolicyIsOnlyMutablePolicySource:true,
      architectureProjectionGeneratedAtRuntime:true,
      architectureMapMayNotOverrideProjection:true,
      workContractGeneratedFromSameProjection:true,
      sharedContextGeneratedFromSameProjection:true,
      policyChangeAutomaticallyChangesArchitectureFingerprint:true,
      policyChangeAutomaticallyChangesWorkContractFingerprint:true,
      staleArchitectureProjectionMayNotStartWork:true,
      staleWorkContractMayNotCompleteWork:true
    }},
    fixedAutonomousDevelopmentOperatingContract:{version:1,status:'FIXED_CURRENT_SYSTEM',systemStructure:'EXISTING_CANONICAL_PIPELINE_ONLY',normalOperatingLoop:['BUILD_UP','F0','PRIVATE_RUNTIME_CANDIDATE_DEPLOY','F1_TO_F8_RUNTIME_AND_QA','F9','RELEASE_CLASSIFICATION','IMMEDIATE_NEXT_BUILD_UP'],sequenceMeaningUsesFinalDevelopmentLockV2:true,perpetualPerGameCycle:true,vibeOwnsNormalCycleOperation:true,ownerPresenceRequiredForNormalCycle:false,chatgptPresenceRequiredForNormalCycle:false,normalCycleManualApprovalRequired:false,macroSystemStructureChangeInNormalDevelopment:false,futureSystemWorkScope:'DETAIL_CHAIN_OPTIMIZATION_ONLY',distinctGamesRemainParallel:true,sameGameIndependentWorkParallelWhenSafe:true,failureIsolation:'GAME_AND_STAGE_LOCAL_REPAIR_RETRY',autonomousLearning:{required:true,owner:'VIBE2_VIBE3',ownerPresenceRequired:false,chatgptPresenceRequired:false,continuous24h:true,existingLearningMotorOnly:true,learningMotor:'tools/vibe2-learning-motor.mjs',scheduler:'.github/workflows/vibe2-24h-runner.yml',positiveLearningRequiresVerifiedEvidence:true,verifiedFailureMayBecomeAvoidLesson:true,infrastructureFailureMayNotBecomeGameNegativeLearning:true,taskRelevantLearningMustBeRetrievedBeforeSourceGeneration:true,verifiedLearningMustFeedNextBuildUp:true,verifiedBottleneckLessonsMustFeedFutureCausalRepair:true,learningMayNotExpandAuthority:true,learningMayNotReplaceQaRuntimeOrF9Verification:true,rawUnverifiedModelOutputMayNotSelfPromote:true,newLearningPipelineOrShadowTrainerForbidden:true},requestedGameScopedRuntimeQa:{requestedGameIdMeansExactGameOnly:true,requestedRunMayNotProcessOrMutateUnrelatedGameRuntimeCandidate:true,emptyGameIdMeansParallelBatchScan:true,batchCrossGameParallelismPreserved:true,unrelatedInvalidCandidateMayNotFailRequestedGameRun:true,exactGameFailureRoutesToExactGameStageRepair:true},responsibilitySplit:{vibe:{normalOperationsOwner:true,allNormalProcessManagementOwner:true,bottleneckManagementOwner:true,buildUpThroughF9LifecycleOwner:true,sourceGrowthExecutionOwner:true,ownerOrChatgptPresenceRequired:false},chatgpt:{normalOperationsOwner:false,normalBottleneckManager:false,normalCycleApprovalDependency:false},owner:{normalOperationsOwner:false,normalBottleneckManager:false,normalCycleApprovalDependency:false}},sourceGrowthIntegrity:{buildUpGapMustBindExistingResponsibleGameSource:true,realSourceDiffRequiredWhenBuildUpDecisionRequiresImplementation:true,evaluationOnlyCompletionForbiddenWhenSourceMutationRequired:true,directResponsibleFunctionOrCompleteBlockEditPreferred:true,wrapperOverrideShadowPatchForbidden:true,unnecessaryNewFileOrParallelStructureForbidden:true,sourceRevisionMustPropagateIntoF0CandidateEvidence:true,exactBuildUpSourceRevisionMustBeVerifiedThroughRuntimeChain:true,f9SuccessMustReturnToImmediateNextBuildUp:true,failureRoutesToExactGameStageRepairRetry:true,sourceGrowthDoesNotChangeLockedF0F9Order:true},autonomousBottleneckManagement:{required:true,owner:'VIBE2_VIBE3_EXISTING_SYSTEM_AI',ownerPresenceRequired:false,chatgptPresenceRequired:false,continuousDuringNormalOperation:true,mode:'DETECT_CLASSIFY_REPAIR_RETRY_REBALANCE_WITHIN_EXISTING_AUTHORITY',existingComponents:{sensor:'tools/company-system-ai-bottleneck-sensor.mjs',worker:'tools/company-system-ai-worker.mjs',queueControl:'tools/vibe2-queue-control.mjs',recoveryQueue:'tools/company-recovery-queue.mjs'},unrelatedGamesMustContinue:true,queueAndRunnerPressureMayNotCreateWholeGameSerialization:true,mayNotChangeLockedF0F9Sequence:true,mayNotExpandWritableAuthority:true,mayNotBypassSecurityQaRuntimeOrReleaseGates:true,newPipelineWorkflowWrapperOrShadowManagerForbidden:true},startupSync:{requiredForChatGPTAndWorkers:true,latestMainFirst:true,canonicalReadOrder:[policy,log,arch,security],documentHashesRequired:true,finalDevelopmentLockV2Required:true,beforeMutationDeploymentOrRuntimeStateChange:true,priorConversationOrMemoryMayOverride:false,resyncAfterCentralDocumentChange:true}},
    developmentLifecycleMachine:{
      sharedWorkerContext:{version:6,requiredForAllWorkers:true,centralPolicy:policy,logMap:log,architectureMap:arch,securityPolicy:security,documentIsCode:true,roadmapIsExecutableContract:true,workerLauncherSyncRequired:true,workerLauncherWorkflows:launchers,beforeWorkRequired:true,afterWorkRequired:false,singlePreWorkValidationPerExactWorkUnit:true,repeatedFullValidationWithinExactWorkUnitForbidden:true,completionUsesInitialValidatedContextEvidence:true,staleContextMayNotStartWork:true,staleContextMayNotCompleteWork:true,syncMode:'ROADMAP_FIRST_FAIL_CLOSED',completionRequiresSharedContextSync:true,mismatchAction:'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE',newSessionPreflight:{version:1,required:true,appliesTo:['CHATGPT_NEW_CHAT','ALL_AI_WORKERS','ALL_AUTOMATION_WORKERS','ALL_PLANNERS','ALL_QA_AND_REVIEW_WORKERS','ALL_RELEASE_AND_RUNTIME_WORKERS'],sourceRef:'LATEST_MAIN_AT_WORK_START',latestMainMustBeResolvedBeforeDocumentRead:true,suppliedOrRememberedMainShaIsHintOnly:true,canonicalReadOrder:[policy,log,arch,security],documentHashesMustBeCaptured:true,finalDevelopmentLockStatusMustBeRead:true,noSourceMutationBeforeSyncPass:true,noDeploymentBeforeSyncPass:true,noRuntimeStateMutationBeforeSyncPass:true,priorConversationOrMemoryCannotOverrideCentralPolicy:true,staleOrMissingContextAction:'FAIL_CLOSED_NO_MUTATION',validator:'tools/company-shared-context.mjs',resyncAfterCentralDocumentChange:true,fixedAutonomousDevelopmentOperatingContractMustBeRead:true,requiredOperatingContractPaths:['fixedAutonomousDevelopmentOperatingContract','finalDevelopmentLock']},compiledArchitectureProjection:{required:true,compiler:'tools/company-shared-context.mjs::compileCentralArchitectureProjection',fingerprintBoundToExecutionEvidence:true,workContractMustUseSameFingerprint:true}},
      securityImmuneSystem:{policyFile:security},
      learningMotor:{implementationOwner:'VIBE2_VIBE3',positiveMasteryRequiresVerifiedEvidence:true},
      primaryAiOrchestration:{orchestrator:'CHATGPT_PRIMARY_AI',role:'PRIMARY_AI_NON_BLOCKING_SUPERVISOR',presenceRequiredForAutonomousWork:false,absenceBlocksWorkerProgress:false,workersContinue24hFromCentralContract:true,reviewRequiredForWorkerCompletion:false,deterministicEvidenceCreatesVerifiedCheckpoint:true,verifiedCheckpointDoesNotStopBrain:true,gameSourceAuthoring:false,gameImplementationOwner:['VIBE2','VIBE3'],externalAiWorkerPolicy:{maySelfPromoteToOrchestrator:false,mayIssueFinalSystemCompletionVerdict:false},internalVibeAiCollaboration:{scope:'ALL_VIBE_INTERNAL_AI_AUTONOMOUS_WORKERS_NEURAL_DIAGNOSIS_CRITIC_ROOT_CAUSE_RECOVERY_PLANNER_IMPLEMENTATION_QA_RELEASE_SECURITY_AND_LEARNING_SYSTEMS',collaborationMode:'PRIMARY_AI_NON_BLOCKING_COPILOT_OVERLAY',autonomous24hExecutionContinuesWithoutPrimaryAi:true,primaryAiPresenceIsRuntimeGate:false,appliesToExistingAndFutureRegisteredInternalAi:true,directMainWriteGrantedByCollaboration:false,policyMutationAuthorityGrantedByCollaboration:false,selfAcceptanceGrantedByCollaboration:false,capabilityGrowthRoleLock:{primaryAiRoleAfterCapabilityGrowth:'NON_BLOCKING_ASSISTANT_AND_COLLABORATOR',capabilityMayIncrease:true,authorityMayAutoIncrease:false,primaryAiMayBecomeRuntimeOwner:false,primaryAiMayReplaceDeterministicQa:false,primaryAiMayReplaceVibeImplementationOwnership:false}}}
    }},
    logJson:{requiredForAllWorkers:true,centralPolicy:policy,architectureMap:arch,securityPolicy:security,workerContextLogContract:{version:3,roadmapPolicyHashRequired:true,securityPolicyHashRequired:true,launcherValidationRequired:true,newChatAndWorkerPreflightRequired:true,latestMainShaRequired:true,canonicalReadOrderRequired:true,finalDevelopmentLockStatusRequired:true,preMutationSharedContextPassRequired:true,staleContextMutationForbidden:true,priorConversationOrMemoryOverrideForbidden:true,fixedAutonomousDevelopmentOperatingContractRequired:true},fixedAutonomousDevelopmentOperatingEvidence:{centralContract:'company-learning/platform-release-roadmap.json#fixedAutonomousDevelopmentOperatingContract',autonomousBottleneckManagementOwner:'VIBE2_VIBE3_EXISTING_SYSTEM_AI',ownerOrChatgptBottleneckPresenceRequired:false,vibeOwnsAllNormalProcessManagement:true,chatgptNormalOperationsOwner:false,sourceGrowthIntegrityEvidenceRequired:true,autonomousLearning:{owner:'VIBE2_VIBE3',ownerOrChatgptPresenceRequired:false},requestedRuntimeQaIsolation:{requestedGameOnly:true}},orchestrationLogContract:{finalAcceptanceRequiresPrimaryAiReview:false,deterministicMachineGateMayCompleteWithoutPrimaryAi:true,workerMustNotInventPolicy:true,supervisorAbsenceIsNotAWorkerBlocker:true,internalVibeAiCollaboration:{requiredWhenEscalated:true,rawPrivateReasoningLogged:false,autonomousCompletionStillAllowed:true}}},
    archJson:{requiredForAllWorkers:true,centralPolicy:policy,logMap:log,securityPolicy:security,sharedContextLoadOrder:[policy,log,arch,security],centralArchitectureProjection:{required:true,compiler:'tools/company-shared-context.mjs::compileCentralArchitectureProjection',generatedAtExecutionTime:true,manualSemanticMirrorRequired:false,thisFileMayNotOverrideCompiledProjection:true},workerSynchronization:{version:5,documentIsCode:true,launcherValidationRequired:true,validator:'tools/company-shared-context.mjs',launcherWorkflows:launchers,newChatAndWorkerPreflightRequired:true,appliesToChatGPTNewSessions:true,latestMainResolveBeforeCanonicalRead:true,canonicalReadOrder:[policy,log,arch,security],finalDevelopmentLockStatusMustBeLoaded:true,mutationDeploymentStateChangeForbiddenUntilSyncPass:true,priorConversationOrMemoryCannotOverrideCentralPolicy:true,staleContextFailsClosedBeforeMutation:true,fixedAutonomousDevelopmentOperatingContractMustBeLoaded:true},fixedAutonomousDevelopmentOperatingTopology:{centralContract:'company-learning/platform-release-roadmap.json#fixedAutonomousDevelopmentOperatingContract',ownerAndChatgptNotInNormalCycleCriticalPath:true,bottleneckManagementOwner:'VIBE2_VIBE3_EXISTING_SYSTEM_AI',ownerAndChatgptNotBottleneckManagersInNormalOperation:true,vibeOwnsAllNormalProcessManagement:true,chatgptNormalOperationsOwner:false,sourceGrowthExecutionOwner:'VIBE2_VIBE3',autonomousLearning:{owner:'VIBE2_VIBE3',ownerAndChatgptNotInLearningCriticalPath:true},requestedRuntimeQaIsolation:{requestedGameOnly:true}},workerRoles:{PRIMARY_AI_ORCHESTRATOR:'NON_BLOCKING_ROADMAP_PRIORITY_BOTTLENECK_SUPERVISOR'},externalAiRules:{finalSystemAcceptanceForbidden:true},primaryAiPresenceRequired:false,autonomous24hWorkersContinueWithoutPrimaryAi:true,primaryAiInternalVibeCollaboration:{coverage:'ALL_REGISTERED_VIBE_INTERNAL_AI_AND_AUTONOMOUS_SUBSYSTEMS',mode:'NON_BLOCKING_COPILOT_OVERLAY',autonomyPreserved:true,capabilityGrowthRoleLock:{primaryAiRole:'NON_BLOCKING_ASSISTANT_AND_COLLABORATOR',capabilityExpansionDoesNotChangeAuthority:true}}},
    securityJson:{version:2,sourceOfTruth:policy,centralRoadmapBinding:{documentIsCode:true,sharedContextValidator:'tools/company-shared-context.mjs'},workerSynchronization:{launcherWorkflows:launchers,newChatAndWorkerPreflightRequired:true,latestMainCanonicalSetRequired:true,finalDevelopmentLockStatusMustBeLoaded:true,mutationBeforeSharedContextPassForbidden:true,priorConversationOrMemoryCannotOverrideCentralPolicy:true,fixedAutonomousDevelopmentOperatingContractMustBeLoaded:true},fixedAutonomousDevelopmentOperatingSecurity:{centralContract:'company-learning/platform-release-roadmap.json#fixedAutonomousDevelopmentOperatingContract',normalCycleMayContinueWithoutOwnerOrChatgptPresence:true,vibeMayManageNormalOperationalBottlenecksAutonomously:true,ownerAndChatgptAbsenceDoesNotBlockNonSecurityBottleneckRepair:true,vibeNormalProcessManagementOwner:true,chatgptNormalOperationsOwner:false,evaluationOnlyCompletionMayNotFakeRequiredSourceMutation:true,autonomousLearning:{positiveLearningRequiresVerifiedEvidence:true,newShadowTrainerForbidden:true},requestedRuntimeQaIsolation:{requestedGameOnly:true}}}
  };
}
function setup(cwd,f){
  writeJson(path.join(cwd,f.policy),f.policyJson);
  writeJson(path.join(cwd,f.log),f.logJson);
  writeJson(path.join(cwd,f.arch),f.archJson);
  writeJson(path.join(cwd,f.security),f.securityJson);
  writeText(path.join(cwd,f.launcher),"steps:\n  - run: node tools/company-shared-context.mjs\n");
}

test('roadmap-first shared context validates registered worker launcher',()=>{
  const cwd=root(),f=fixtures();setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{
    const result=validateSharedWorkerContext();
    assert.equal(result.pass,true);
    assert.equal(result.policyVersion,36);
    assert.equal(result.documentIsCode,true);
    assert.equal(result.roadmapSynchronized,true);
    assert.equal(result.workerLaunchersValidated,1);
    assert.equal(result.constitution.automaticContractBinding,true);
    assert.deepEqual(result.constitution.orderedRuleIds,['RULE_1_NEVER_STOP_CONTINUOUS_GAME_DEVELOPMENT','RULE_2_EXTERNAL_AI_SECURITY_CAPTURE_AND_VERIFIED_ABSORPTION','RULE_3_SELF_GENERATED_UNBOUNDED_VERIFIED_LEARNING_MULTIVERSE','RULE_4_SELF_ARCHITECTURE_EVOLUTION_AND_FINAL_NEURAL_EXPANSION']);
    assert.equal(result.constitution.ruleCount,4);
    assert.equal(result.architectureProjection.valid,true);
    assert.match(result.architectureProjection.fingerprint,/^[a-f0-9]{64}$/);
    assert.equal(result.architectureProjection.contract.sourceOfTruth,'company-learning/platform-release-roadmap.json');
  }finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('central shared context rejects Codex reactivation and keeps the current Vibe local Ollama alternative',()=>{
  const cwd=root(),f=fixtures(),previous=process.cwd(),oldRole=process.env.VIBE2_CODEX_ROLE;
  f.policyJson.developmentLifecycleMachine.developmentToolAuthority={
    codex:{role:'DISABLED',allowedScopes:[],allUseForbidden:true},
    gameSourceGenerationProvider:'LOCAL_OLLAMA',
    gameSourceWritePolicy:{allowedWorker:'tools/vibe2-source-worker.mjs'},
    enforcement:{requiredEnvironment:{VIBE2_CODEX_ROLE:'DISABLED',VIBE2_CODEX_GAME_SOURCE_WRITE:'FORBIDDEN'}}
  };
  f.archJson.workerRoles.CODEX='DISABLED';
  f.archJson.forbidden=['CODEX_ANY_SCOPE'];
  setup(cwd,f);process.chdir(cwd);
  try{
    process.env.VIBE2_CODEX_ROLE='DISABLED';
    assert.equal(validateSharedWorkerContext().pass,true);
    f.policyJson.developmentLifecycleMachine.developmentToolAuthority.codex.allowedScopes=['WORKFLOW_AND_CI_TOOLING'];
    writeJson(path.join(cwd,f.policy),f.policyJson);
    assert.throws(()=>validateSharedWorkerContext(),/CODEX_NO_USE_POLICY_DRIFT/);
    f.policyJson.developmentLifecycleMachine.developmentToolAuthority.codex.allowedScopes=[];
    writeJson(path.join(cwd,f.policy),f.policyJson);
    f.archJson.workerRoles.CODEX='SYSTEM_TOOLING_CI_TEST_INFRA_ONLY';
    writeJson(path.join(cwd,f.arch),f.archJson);
    assert.throws(()=>validateSharedWorkerContext(),/CODEX_NO_USE_ARCHITECTURE_DRIFT/);
    f.archJson.workerRoles.CODEX='DISABLED';
    writeJson(path.join(cwd,f.arch),f.archJson);
    process.env.VIBE2_CODEX_ROLE='ENABLED';
    assert.throws(()=>validateSharedWorkerContext(),/CODEX_RUNTIME_ROLE_FORBIDDEN/);
  }finally{
    if(oldRole===undefined)delete process.env.VIBE2_CODEX_ROLE;
    else process.env.VIBE2_CODEX_ROLE=oldRole;
    process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});
  }
});

test('registered launcher without shared-context gate is blocked',()=>{
  const cwd=root(),f=fixtures();setup(cwd,f);writeText(path.join(cwd,f.launcher),"steps:\n  - run: echo unsafe\n");const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/WORKER_LAUNCHER_NOT_SYNCHRONIZED/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('shared context blocks architecture launcher registry drift',()=>{
  const cwd=root(),f=fixtures();f.archJson.workerSynchronization.launcherWorkflows=['.github/workflows/other.yml'];setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/ARCHITECTURE_LAUNCHER_REGISTRY/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('pinned hash reuse keeps the validated cohort exact and fails closed on document drift',()=>{
  const cwd=root(),f=fixtures();setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{
    const full=validateSharedWorkerContext();
    const pinned=verifyPinnedSharedWorkerContext({
      expectedPolicySha256:full.hashes.policySha256,
      expectedLogMapSha256:full.hashes.logMapSha256,
      expectedArchitectureSha256:full.hashes.architectureSha256,
      expectedSecurityPolicySha256:full.hashes.securityPolicySha256
    });
    assert.equal(pinned.pass,true);
    assert.equal(pinned.verificationMode,'PINNED_HASH_REUSE');
    assert.deepEqual(pinned.hashes,full.hashes);
    f.logJson.extraDrift=true;
    writeJson(path.join(cwd,f.log),f.logJson);
    assert.throws(()=>verifyPinnedSharedWorkerContext({
      expectedPolicySha256:full.hashes.policySha256,
      expectedLogMapSha256:full.hashes.logMapSha256,
      expectedArchitectureSha256:full.hashes.architectureSha256,
      expectedSecurityPolicySha256:full.hashes.securityPolicySha256
    }),/PINNED_HASH_MISMATCH:logMapSha256/);
  }finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('expected roadmap hash mismatch is fail closed',()=>{
  const cwd=root(),f=fixtures();setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext({expectedPolicySha256:'0'.repeat(64)}),/POLICY_SHA_MISMATCH/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('primary AI presence must never become a runtime gate',()=>{
  const cwd=root(),f=fixtures();f.policyJson.developmentLifecycleMachine.primaryAiOrchestration.presenceRequiredForAutonomousWork=true;setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/PRIMARY_AI_MUST_NOT_BLOCK_AUTONOMY/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});


test('all Vibe internal AI collaboration contract is required but never becomes a runtime gate',()=>{
  const cwd=root(),f=fixtures();f.policyJson.developmentLifecycleMachine.primaryAiOrchestration.internalVibeAiCollaboration.appliesToExistingAndFutureRegisteredInternalAi=false;setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/PRIMARY_AI_INTERNAL_VIBE_COVERAGE/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});


test('Vibe capability growth cannot auto-promote Primary AI or worker authority',()=>{
  const cwd=root(),f=fixtures();
  f.policyJson.developmentLifecycleMachine.primaryAiOrchestration.internalVibeAiCollaboration.capabilityGrowthRoleLock.authorityMayAutoIncrease=true;
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/VIBE_CAPABILITY_AUTHORITY_SEPARATION/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});


test('future owner canonical rule auto-binds without worker code change',()=>{
  const cwd=root(),f=fixtures();
  f.policyJson.ownerCanonicalRules.rule5={id:'RULE_5_FUTURE_OWNER_CONSTITUTION',label:'제5규칙',enabled:true,authority:'OWNER_DIRECTIVE_TEST',objective:'FUTURE_RULE',machineEnforcement:{schemaVersion:1,assertions:[{code:'ENABLED',operator:'EQ',path:'enabled',expected:true}]}};
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{
    const result=validateSharedWorkerContext();
    assert.equal(result.constitution.ruleCount,5);
    assert.equal(result.constitution.orderedRuleIds.at(-1),'RULE_5_FUTURE_OWNER_CONSTITUTION');
  }finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('worker context fails closed when constitutional auto-binding is weakened',()=>{
  const cwd=root(),f=fixtures();
  f.policyJson.ownerCanonicalRules.constitutionalBinding.automaticContractBinding=false;
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/OWNER_CANONICAL_CONSTITUTION:CONSTITUTION_AUTO_BIND/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});


test('central policy semantic architecture change automatically changes compiled architecture projection without manual map edit',()=>{
  const cwd=root(),f=fixtures();
  f.policyJson.developmentLifecycleMachine.nativeGameFoundationValidationStack={
    version:1,status:'DESIGN_LOCKED_IMPLEMENTATION_REQUIRED',
    ownership:{executionOwner:'EXISTING_GAME_TESTER_AND_QA_CAPABILITY',testerTicketState:'vibe2-unreal-core:.vibe2/tester-debug-tickets.json',runtimePlaytestOwner:'internal-playtest',platformQaOwner:'independent-qa',deterministicVerdictAuthority:'deterministic'},
    departmentReuse:{duplicateFoundationDepartmentForbidden:true},
    layers:[{id:'F0',alwaysRequired:true},{id:'F1',alwaysRequired:true},{id:'F2',alwaysRequired:true},{id:'F3',alwaysRequired:true},{id:'F4',alwaysRequired:true}],
    testerQaFlow:['F0','F1','F2','F3','F4'],
    releaseGate:{canonicalSequence:['F0','PRIVATE_RUNTIME_CANDIDATE_DEPLOY','F1','F2','F3','F4','INTERNAL_PLATFORM_RELEASE']}
  };
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{
    const before=validateSharedWorkerContext();
    const policyFile=path.join(cwd,f.policy);
    const policy=JSON.parse(fs.readFileSync(policyFile,'utf8'));
    policy.developmentLifecycleMachine.nativeGameFoundationValidationStack.releaseGate.canonicalSequence.splice(-1,0,'F9_RELEASE_REGRESSION');
    fs.writeFileSync(policyFile,JSON.stringify(policy,null,2)+'\n');
    const after=validateSharedWorkerContext();
    assert.notEqual(after.architectureProjection.fingerprint,before.architectureProjection.fingerprint);
    assert.equal(after.hashes.architectureSha256,before.hashes.architectureSha256);
  }finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('shared context fails closed when static architecture registry tries to override compiled central projection',()=>{
  const cwd=root(),f=fixtures();
  f.archJson.centralArchitectureProjection.thisFileMayNotOverrideCompiledProjection=false;
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/ARCHITECTURE_PROJECTION_OVERRIDE_BOUNDARY/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});


test('duplicate after-work shared-context validation is forbidden by the single-preflight contract',()=>{
  const cwd=root(),f=fixtures();f.policyJson.developmentLifecycleMachine.sharedWorkerContext.afterWorkRequired=true;setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/SINGLE_PREFLIGHT_CONTEXT_VALIDATION/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('new chat preflight cannot trust remembered main or memory over central policy',()=>{
  const cwd=root(),f=fixtures();
  f.policyJson.developmentLifecycleMachine.sharedWorkerContext.newSessionPreflight.suppliedOrRememberedMainShaIsHintOnly=false;
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/NEW_SESSION_LATEST_MAIN_REQUIRED/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('new chat preflight blocks mutation until canonical four-document sync is valid',()=>{
  const cwd=root(),f=fixtures();
  f.archJson.workerSynchronization.mutationDeploymentStateChangeForbiddenUntilSyncPass=false;
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/ARCHITECTURE_PREMUTATION_SYNC_REQUIRED/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});


test('fixed autonomous Vibe operating contract is mandatory in new chat and worker preflight',()=>{
  const cwd=root(),f=fixtures();
  f.policyJson.developmentLifecycleMachine.sharedWorkerContext.newSessionPreflight.fixedAutonomousDevelopmentOperatingContractMustBeRead=false;
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/NEW_SESSION_FIXED_OPERATING_CONTRACT_REQUIRED/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('fixed operating contract requires Vibe to own normal bottleneck management',()=>{
  const cwd=root(),f=fixtures();
  f.policyJson.fixedAutonomousDevelopmentOperatingContract.autonomousBottleneckManagement.owner='CHATGPT';
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/FIXED_OPERATING_BOTTLENECK_OWNER/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('fixed operating contract requires real source growth when BUILD_UP needs implementation',()=>{
  const cwd=root(),f=fixtures();
  f.policyJson.fixedAutonomousDevelopmentOperatingContract.sourceGrowthIntegrity.realSourceDiffRequiredWhenBuildUpDecisionRequiresImplementation=false;
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/FIXED_OPERATING_SOURCE_GROWTH_REQUIRED/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('fixed operating contract requires Vibe autonomous learning without owner or ChatGPT presence',()=>{
  const cwd=root(),f=fixtures();
  f.policyJson.fixedAutonomousDevelopmentOperatingContract.autonomousLearning.owner='CHATGPT';
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/FIXED_OPERATING_AUTONOMOUS_LEARNING_OWNER/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('fixed operating contract requires exact requested-game runtime QA isolation',()=>{
  const cwd=root(),f=fixtures();
  f.policyJson.fixedAutonomousDevelopmentOperatingContract.requestedGameScopedRuntimeQa.requestedGameIdMeansExactGameOnly=false;
  setup(cwd,f);const previous=process.cwd();process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/FIXED_OPERATING_REQUESTED_RUNTIME_QA_ISOLATION/);}
  finally{process.chdir(previous);fs.rmSync(cwd,{recursive:true,force:true});}
});
