// 파일명: qa/company-shared-context.test.mjs
// 역할: 중앙 로드맵과 등록 작업자 실행계열의 문서=코드 동기화 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateSharedWorkerContext } from '../tools/company-shared-context.mjs';

function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'company-shared-context-'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function writeText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
function fixtures(){
  const policy='company-learning/platform-release-roadmap.json',log='company-learning/company-log-map.json',arch='company-learning/company-architecture-map.json',security='company-learning/security-immune-system.json',launcher='.github/workflows/demo-worker.yml';
  const launchers=[launcher];
  return{
    policy,log,arch,security,launcher,launchers,
    policyJson:{version:36,ownerCanonicalRules:{"version":5,"authority":"OWNER_DIRECTIVE_TEST","constitutionalAuthority":"HIGHEST_VIBE_INTERNAL_WORKER_CONTRACT_AUTHORITY","rule1Handling":"RULE_1_THROUGH_RULE_4_ARE_CANONICALIZED_HERE; IMPLEMENTATION_MUST_PRESERVE_THEIR_ORDERED_GATES_AND_EXISTING_AUTHORITY_BOUNDARIES","constitutionalBinding":{"version":1,"authority":"OWNER_DIRECTIVE_TEST","mode":"DYNAMIC_CANONICAL_RULE_AUTO_BIND","automaticContractBinding":true,"appliesToAllCurrentAndFutureRegisteredVibeWorkers":true,"appliesToAllInternalAiDepartmentsAndAutonomousSubsystems":true,"workerMayNotOptOut":true,"childContractMayNotOverride":true,"runtimeMayNotSilentlyAmend":true,"onlyOwnerDirectiveMayCreateAmendDisableOrRemoveCanonicalRule":true,"ruleDiscoveryKeyPattern":"rule<N>","ruleIdentityPattern":"RULE_<N>_*","orderResolution":"IMPLEMENTATION_ORDER_FIRST_THEN_NUMERIC_AUTO_APPEND","futureCanonicalRulesAutoBindWithoutWorkerCodeChange":true,"executionFingerprintMustIncludeEveryEnabledCanonicalRule":true,"sharedContextMustCompileEveryEnabledCanonicalRule":true,"centralWorkContractMustEmbedEveryEnabledCanonicalRule":true,"workerInstructionMustExposeOrderedCanonicalRules":true,"beforeWorkValidationRequired":true,"afterWorkValidationRequired":true,"staleConstitutionMayNotStartWork":true,"staleConstitutionMayNotCompleteWork":true,"missingOrInvalidBindingAction":"FAIL_CLOSED_BLOCK_WORK_AND_REQUEUE_EXACT_FAILURE_STAGE","constitutionChangeInvalidatesActiveWorkerExecutionFingerprint":true,"subordinatePolicyCannotWeakenCanonicalRule":true,"executableEnforcer":"tools/company-constitution-enforcer.mjs","enforcerRequiredAtPolicyQa":true,"enforcerRequiredAt24hPlanner":true,"enforcerRequiredBeforeWorkerSourceWrite":true,"enforcerRequiredAfterWorkerExecution":true,"global24hStopOnConstitutionFailureForbidden":true,"constitutionViolationAction":"QUARANTINE_OR_REQUEUE_AFFECTED_SCOPE_RECOVER_REPLAN_CONTINUE_GLOBAL_24H"},"rule1":{"id":"RULE_1_NEVER_STOP_CONTINUOUS_GAME_DEVELOPMENT","label":"제1규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"CONTINUE"},"rule2":{"id":"RULE_2_EXTERNAL_AI_SECURITY_CAPTURE_AND_VERIFIED_ABSORPTION","label":"제2규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"SECURE_AND_VERIFY"},"rule3":{"id":"RULE_3_SELF_GENERATED_UNBOUNDED_VERIFIED_LEARNING_MULTIVERSE","label":"제3규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"LEARN"},"rule4":{"id":"RULE_4_SELF_ARCHITECTURE_EVOLUTION_AND_FINAL_NEURAL_EXPANSION","label":"제4규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"EVOLVE"},"implementationOrder":["RULE_1","RULE_2","RULE_3","RULE_4"],"orderedImplementationRequired":true},
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
    developmentLifecycleMachine:{
      sharedWorkerContext:{version:5,requiredForAllWorkers:true,centralPolicy:policy,logMap:log,architectureMap:arch,securityPolicy:security,documentIsCode:true,roadmapIsExecutableContract:true,workerLauncherSyncRequired:true,workerLauncherWorkflows:launchers,staleContextMayNotStartWork:true,staleContextMayNotCompleteWork:true,syncMode:'ROADMAP_FIRST_FAIL_CLOSED',completionRequiresSharedContextSync:true,mismatchAction:'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE',compiledArchitectureProjection:{required:true,compiler:'tools/company-shared-context.mjs::compileCentralArchitectureProjection',fingerprintBoundToExecutionEvidence:true,workContractMustUseSameFingerprint:true}},
      securityImmuneSystem:{policyFile:security},
      primaryAiOrchestration:{orchestrator:'CHATGPT_PRIMARY_AI',role:'PRIMARY_AI_NON_BLOCKING_SUPERVISOR',presenceRequiredForAutonomousWork:false,absenceBlocksWorkerProgress:false,workersContinue24hFromCentralContract:true,reviewRequiredForWorkerCompletion:false,deterministicEvidenceCreatesVerifiedCheckpoint:true,verifiedCheckpointDoesNotStopBrain:true,gameSourceAuthoring:false,gameImplementationOwner:['VIBE2','VIBE3'],externalAiWorkerPolicy:{maySelfPromoteToOrchestrator:false,mayIssueFinalSystemCompletionVerdict:false},internalVibeAiCollaboration:{scope:'ALL_VIBE_INTERNAL_AI_AUTONOMOUS_WORKERS_NEURAL_DIAGNOSIS_CRITIC_ROOT_CAUSE_RECOVERY_PLANNER_IMPLEMENTATION_QA_RELEASE_SECURITY_AND_LEARNING_SYSTEMS',collaborationMode:'PRIMARY_AI_NON_BLOCKING_COPILOT_OVERLAY',autonomous24hExecutionContinuesWithoutPrimaryAi:true,primaryAiPresenceIsRuntimeGate:false,appliesToExistingAndFutureRegisteredInternalAi:true,directMainWriteGrantedByCollaboration:false,policyMutationAuthorityGrantedByCollaboration:false,selfAcceptanceGrantedByCollaboration:false,capabilityGrowthRoleLock:{primaryAiRoleAfterCapabilityGrowth:'NON_BLOCKING_ASSISTANT_AND_COLLABORATOR',capabilityMayIncrease:true,authorityMayAutoIncrease:false,primaryAiMayBecomeRuntimeOwner:false,primaryAiMayReplaceDeterministicQa:false,primaryAiMayReplaceVibeImplementationOwnership:false}}}
    }},
    logJson:{requiredForAllWorkers:true,centralPolicy:policy,architectureMap:arch,securityPolicy:security,workerContextLogContract:{roadmapPolicyHashRequired:true,securityPolicyHashRequired:true,launcherValidationRequired:true},orchestrationLogContract:{finalAcceptanceRequiresPrimaryAiReview:false,deterministicMachineGateMayCompleteWithoutPrimaryAi:true,workerMustNotInventPolicy:true,supervisorAbsenceIsNotAWorkerBlocker:true,internalVibeAiCollaboration:{requiredWhenEscalated:true,rawPrivateReasoningLogged:false,autonomousCompletionStillAllowed:true}}},
    archJson:{requiredForAllWorkers:true,centralPolicy:policy,logMap:log,securityPolicy:security,sharedContextLoadOrder:[policy,log,arch,security],centralArchitectureProjection:{required:true,compiler:'tools/company-shared-context.mjs::compileCentralArchitectureProjection',generatedAtExecutionTime:true,manualSemanticMirrorRequired:false,thisFileMayNotOverrideCompiledProjection:true},workerSynchronization:{documentIsCode:true,launcherValidationRequired:true,validator:'tools/company-shared-context.mjs',launcherWorkflows:launchers},workerRoles:{PRIMARY_AI_ORCHESTRATOR:'NON_BLOCKING_ROADMAP_PRIORITY_BOTTLENECK_SUPERVISOR'},externalAiRules:{finalSystemAcceptanceForbidden:true},primaryAiPresenceRequired:false,autonomous24hWorkersContinueWithoutPrimaryAi:true,primaryAiInternalVibeCollaboration:{coverage:'ALL_REGISTERED_VIBE_INTERNAL_AI_AND_AUTONOMOUS_SUBSYSTEMS',mode:'NON_BLOCKING_COPILOT_OVERLAY',autonomyPreserved:true,capabilityGrowthRoleLock:{primaryAiRole:'NON_BLOCKING_ASSISTANT_AND_COLLABORATOR',capabilityExpansionDoesNotChangeAuthority:true}}},
    securityJson:{version:2,sourceOfTruth:policy,centralRoadmapBinding:{documentIsCode:true,sharedContextValidator:'tools/company-shared-context.mjs'},workerSynchronization:{launcherWorkflows:launchers}}
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
  f.policyJson.ownerCanonicalRules.rule5={id:'RULE_5_FUTURE_OWNER_CONSTITUTION',label:'제5규칙',enabled:true,authority:'OWNER_DIRECTIVE_TEST',objective:'FUTURE_RULE'};
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
