// 파일명: qa/vibe2-central-work-contract.test.mjs
// 역할: 최신 중앙 roadmap 작업계약, 권한 경계, exact failure routing, stale fail-closed를 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  CANONICAL_VIBE_POLICY_PATH,
  loadCentralPolicySnapshot,
  compileVibeCentralWorkContract,
  assertCompiledWorkContractFresh
} from '../tools/vibe2-central-work-contract.mjs';
import { runVibe2SourceWorker } from '../tools/vibe2-source-worker.mjs';

function tempRoot(){return fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-central-contract-'));}
function git(cwd,...args){return execFileSync('git',['-C',cwd,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}

function writePolicy(root,version=196,overrides={}){
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const document={
    version,
    status:'OWNER_DIRECT_LOCKED',
    policySource:CANONICAL_VIBE_POLICY_PATH,
    ownerCanonicalRules:{"version":5,"authority":"OWNER_DIRECTIVE_TEST","constitutionalAuthority":"HIGHEST_VIBE_INTERNAL_WORKER_CONTRACT_AUTHORITY","rule1Handling":"RULE_1_THROUGH_RULE_4_ARE_CANONICALIZED_HERE; IMPLEMENTATION_MUST_PRESERVE_THEIR_ORDERED_GATES_AND_EXISTING_AUTHORITY_BOUNDARIES","constitutionalBinding":{"version":1,"authority":"OWNER_DIRECTIVE_TEST","mode":"DYNAMIC_CANONICAL_RULE_AUTO_BIND","automaticContractBinding":true,"appliesToAllCurrentAndFutureRegisteredVibeWorkers":true,"appliesToAllInternalAiDepartmentsAndAutonomousSubsystems":true,"workerMayNotOptOut":true,"childContractMayNotOverride":true,"runtimeMayNotSilentlyAmend":true,"onlyOwnerDirectiveMayCreateAmendDisableOrRemoveCanonicalRule":true,"ruleDiscoveryKeyPattern":"rule<N>","ruleIdentityPattern":"RULE_<N>_*","orderResolution":"IMPLEMENTATION_ORDER_FIRST_THEN_NUMERIC_AUTO_APPEND","futureCanonicalRulesAutoBindWithoutWorkerCodeChange":true,"executionFingerprintMustIncludeEveryEnabledCanonicalRule":true,"sharedContextMustCompileEveryEnabledCanonicalRule":true,"centralWorkContractMustEmbedEveryEnabledCanonicalRule":true,"workerInstructionMustExposeOrderedCanonicalRules":true,"beforeWorkValidationRequired":true,"afterWorkValidationRequired":true,"staleConstitutionMayNotStartWork":true,"staleConstitutionMayNotCompleteWork":true,"missingOrInvalidBindingAction":"FAIL_CLOSED_BLOCK_WORK_AND_REQUEUE_EXACT_FAILURE_STAGE","constitutionChangeInvalidatesActiveWorkerExecutionFingerprint":true,"subordinatePolicyCannotWeakenCanonicalRule":true,"executableEnforcer":"tools/company-constitution-enforcer.mjs","enforcerRequiredAtPolicyQa":true,"enforcerRequiredAt24hPlanner":true,"enforcerRequiredBeforeWorkerSourceWrite":true,"enforcerRequiredAfterWorkerExecution":true,"global24hStopOnConstitutionFailureForbidden":true,"constitutionViolationAction":"QUARANTINE_OR_REQUEUE_AFFECTED_SCOPE_RECOVER_REPLAN_CONTINUE_GLOBAL_24H"},"rule1":{"id":"RULE_1_NEVER_STOP_CONTINUOUS_GAME_DEVELOPMENT","label":"제1규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"CONTINUE"},"rule2":{"id":"RULE_2_EXTERNAL_AI_SECURITY_CAPTURE_AND_VERIFIED_ABSORPTION","label":"제2규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"SECURE_AND_VERIFY"},"rule3":{"id":"RULE_3_SELF_GENERATED_UNBOUNDED_VERIFIED_LEARNING_MULTIVERSE","label":"제3규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"LEARN"},"rule4":{"id":"RULE_4_SELF_ARCHITECTURE_EVOLUTION_AND_FINAL_NEURAL_EXPANSION","label":"제4규칙","enabled":true,"authority":"OWNER_DIRECTIVE_TEST","objective":"EVOLVE"},"implementationOrder":["RULE_1","RULE_2","RULE_3","RULE_4"],"orderedImplementationRequired":true},
    developmentLifecycleMachine:{
      sharedWorkerContext:{
        requiredForAllWorkers:true,
        centralPolicy:CANONICAL_VIBE_POLICY_PATH,
        beforeWorkRequired:true,
        afterWorkRequired:true,
        staleContextMayNotStartWork:true,
        staleContextMayNotCompleteWork:true,
        syncMode:'ROADMAP_FIRST_FAIL_CLOSED',
        mismatchAction:'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE'
      },
      primaryAiOrchestration:{
        internalVibeAiCollaboration:{
          scope:'ALL_VIBE_INTERNAL_AI_AUTONOMOUS_WORKERS_NEURAL_DIAGNOSIS_CRITIC_ROOT_CAUSE_RECOVERY_PLANNER_IMPLEMENTATION_QA_RELEASE_SECURITY_AND_LEARNING_SYSTEMS',
          collaborationMode:'PRIMARY_AI_NON_BLOCKING_COPILOT_OVERLAY',
          autonomous24hExecutionContinuesWithoutPrimaryAi:true,
          primaryAiPresenceIsRuntimeGate:false,
          appliesToExistingAndFutureRegisteredInternalAi:true,
          directMainWriteGrantedByCollaboration:false,
          policyMutationAuthorityGrantedByCollaboration:false,
          selfAcceptanceGrantedByCollaboration:false,
          capabilityGrowthRoleLock:{
            primaryAiRoleAfterCapabilityGrowth:'NON_BLOCKING_ASSISTANT_AND_COLLABORATOR',
            capabilityMayIncrease:true,
            authorityMayAutoIncrease:false,
            primaryAiMayBecomeRuntimeOwner:false,
            primaryAiMayReplaceDeterministicQa:false,
            primaryAiMayReplaceVibeImplementationOwnership:false
          }
        }
      }
    },
    assistantRoadmapOrchestration:{
      version:1,
      sourceOfTruth:CANONICAL_VIBE_POLICY_PATH,
      blockerOnly:false,
      operatingModel:{dedupeRequired:true},
      assistantRole:{
        mayCreateExecutionWorker:false,
        mayMutateWaveQueue:false,
        mayReorderWave:false,
        mayMutateLocksOrPolicy:false,
        mayAutoPromoteLearningOrTuning:false,
        mayExpandNeuralAuthority:false
      },
      executionBoundary:{
        executionAuthority:'EXISTING_WAVE_SCHEDULER_ONLY',
        neuralExecutionAuthority:false,
        workerCreationAuthority:false,
        queueMutationAuthority:false,
        waveReorderAuthority:false,
        lockPolicyMutationAuthority:false,
        automaticLearningTuningPromotionAuthority:false
      },
      implementationState:{nextGate:'OPERATE_FROM_CENTRAL_ROADMAP_ACTIONABLE_NEXT_GATE_WITH_DURABLE_GITHUB_HANDOFF'}
    }
  };
  Object.assign(document,overrides);
  fs.writeFileSync(file,JSON.stringify(document,null,2)+'\n','utf8');
}

test('current central roadmap compiles a complete Vibe work request without authority expansion',()=>{
  const root=tempRoot();
  writePolicy(root);
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.equal(snapshot.valid,true);
  assert.match(snapshot.executionFingerprint,/^[a-f0-9]{64}$/);
  const contract=compileVibeCentralWorkContract({
    snapshot,
    task:{
      id:'repair-1',
      gameId:'bug-defense',
      target:'web',
      blocker:'COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_REQUIRED',
      lastOutcome:'FAIL',
      evidence:['web-stage:VIBE_WEB_REPAIR','last-passed-stage:SAVE_RESTORE','runtime-failure:TERMINAL_NOT_REACHED']
    },
    plan:{target:'web',qa:['runtime-cycle']},
    route:{route:'text-source-worker'},
    responsibleFiles:['web-games/bug-defense/index.html'],
    supervisionContract:{required:true,approved:false,protectedSemantics:['SAVE_KEY_AND_SAVE_MEANING'],hardReject:['VALIDATION_ONLY_PATCH']},
    mainSha:'abc123'
  });
  assert.equal(contract.required,true);
  assert.equal(contract.validAtCompile,true);
  assert.equal(contract.policy.executionFingerprint,snapshot.executionFingerprint);
  assert.equal(contract.constitution.automaticContractBinding,true);
  assert.equal(contract.constitution.appliesToAllCurrentAndFutureRegisteredVibeWorkers,true);
  assert.deepEqual(contract.constitution.orderedRuleIds,['RULE_1_NEVER_STOP_CONTINUOUS_GAME_DEVELOPMENT','RULE_2_EXTERNAL_AI_SECURITY_CAPTURE_AND_VERIFIED_ABSORPTION','RULE_3_SELF_GENERATED_UNBOUNDED_VERIFIED_LEARNING_MULTIVERSE','RULE_4_SELF_ARCHITECTURE_EVOLUTION_AND_FINAL_NEURAL_EXPANSION']);
  assert.equal(contract.constitution.rules.length,4);
  assert.match(contract.architectureProjection.fingerprint,/^[a-f0-9]{64}$/);
  assert.equal(contract.architectureProjection.sourceOfTruth,CANONICAL_VIBE_POLICY_PATH);
  assert.equal(contract.workRequest.workKey,'repair-1');
  assert.equal(contract.workRequest.roadmapVersion,196);
  assert.equal(contract.workRequest.mainSha,'abc123');
  assert.deepEqual(contract.workRequest.scope,['web-games/bug-defense/index.html']);
  assert.ok(contract.workRequest.dedupeKey);
  assert.equal(contract.workLock.requiredBeforeSourceWrite,true);
  assert.equal(contract.workLock.stateBranch,'vibe2-work-locks');
  assert.equal(contract.workLock.statePath,'.vibe2/work-locks.json');
  assert.equal(contract.workLock.worker,'vibe2');
  assert.equal(contract.workLock.taskId,'repair-1');
  assert.equal(contract.workLock.baseSha,'abc123');
  assert.deepEqual(contract.workLock.files,['web-games/bug-defense/index.html']);
  assert.equal(contract.workLock.releaseRule,'RELEASE_AFTER_FAN_IN_QA_OR_ABORT');
  assert.equal(contract.workRequest.authorityBoundary.executionAuthority,'EXISTING_WAVE_SCHEDULER_ONLY');
  assert.equal(contract.workRequest.authorityBoundary.workerCreationAuthority,false);
  assert.equal(contract.workRequest.authorityBoundary.queueMutationAuthority,false);
  assert.equal(contract.failureRoute.failureStage,'VIBE_WEB_REPAIR');
  assert.equal(contract.failureRoute.lastPassedStage,'SAVE_RESTORE');
  assert.equal(contract.failureRoute.restartFromBeginning,false);
  assert.ok(contract.invariants.protectedSemantics.includes('SAVE_KEY_AND_SAVE_MEANING'));
  assert.ok(contract.invariants.forbiddenChanges.includes('VALIDATION_ONLY_PATCH'));
  assert.equal(contract.learning.reusableLearningAllowed,false);
  assert.equal(contract.promotion.automaticMainPromotionAllowed,false);
  assert.equal(contract.authorityExpanded,false);
});

test('central roadmap snapshot rejects execution authority expansion',()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  const document=JSON.parse(fs.readFileSync(file,'utf8'));
  document.assistantRoadmapOrchestration.executionBoundary.workerCreationAuthority=true;
  fs.writeFileSync(file,JSON.stringify(document,null,2)+'\n','utf8');
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.equal(snapshot.valid,false);
  assert.ok(snapshot.errors.includes('WORKER_CREATION_AUTHORITY'));
});

test('central roadmap fingerprint is fail-closed when policy changes during work',()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const contract=compileVibeCentralWorkContract({
    snapshot,
    task:{id:'task',gameId:'demo',target:'web'},
    plan:{target:'web'},
    route:{route:'text-source-worker'},
    responsibleFiles:['web-games/demo/index.html'],
    mainSha:'abc123'
  });
  assert.equal(assertCompiledWorkContractFresh({cwd:root,contract,phase:'PRE_WORK'}).status,'PASS');
  writePolicy(root,197);
  const versionOnly=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.notEqual(versionOnly.fingerprint,snapshot.fingerprint);
  assert.equal(versionOnly.executionFingerprint,snapshot.executionFingerprint);
  assert.equal(assertCompiledWorkContractFresh({cwd:root,contract,phase:'PRE_CANDIDATE_WRITE'}).status,'PASS');
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  const changed=JSON.parse(fs.readFileSync(file,'utf8'));
  changed.developmentLifecycleMachine.sharedWorkerContext.mismatchAction='BLOCK_AND_REQUEUE_RELEVANT_EXECUTION_POLICY_CHANGE';
  fs.writeFileSync(file,JSON.stringify(changed,null,2)+'\n','utf8');
  assert.throws(
    ()=>assertCompiledWorkContractFresh({cwd:root,contract,phase:'PRE_CANDIDATE_WRITE'}),
    /CENTRAL_POLICY_STALE:PRE_CANDIDATE_WRITE/
  );
});

test('pinned worker ignores unrelated live roadmap progress but detects execution-policy change',()=>{
  const base=tempRoot();
  const origin=path.join(base,'origin.git');
  const seed=path.join(base,'seed');
  const worker=path.join(base,'worker');
  fs.mkdirSync(seed,{recursive:true});
  execFileSync('git',['init','--bare',origin],{stdio:['ignore','pipe','pipe']});
  git(seed,'init','-b','main');
  git(seed,'config','user.name','qa');
  git(seed,'config','user.email','qa@example.invalid');
  writePolicy(seed,196);
  git(seed,'add','.');
  git(seed,'commit','-m','policy v196');
  git(seed,'remote','add','origin',origin);
  git(seed,'push','-u','origin','main');
  execFileSync('git',['clone','--quiet','--branch','main',origin,worker],{stdio:['ignore','pipe','pipe']});

  const snapshot=loadCentralPolicySnapshot({repoRoot:worker,required:true});
  const contract=compileVibeCentralWorkContract({
    snapshot,
    task:{id:'live-stale',gameId:'demo',target:'web'},
    plan:{target:'web'},
    route:{route:'text-source-worker'},
    responsibleFiles:['web-games/demo/index.html'],
    mainSha:git(worker,'rev-parse','HEAD'),
    livePolicyRef:'origin/main'
  });
  assert.equal(contract.freshness.liveMainRequired,true);
  assert.equal(assertCompiledWorkContractFresh({cwd:worker,contract,phase:'PRE_SOURCE_GENERATION'}).liveMainVersion,196);

  writePolicy(seed,197);
  git(seed,'add',CANONICAL_VIBE_POLICY_PATH);
  git(seed,'commit','-m','policy v197');
  git(seed,'push','origin','main');
  assert.equal(loadCentralPolicySnapshot({repoRoot:worker,required:true}).version,196);
  const versionAdvance=assertCompiledWorkContractFresh({cwd:worker,contract,phase:'PRE_CANDIDATE_WRITE'});
  assert.equal(versionAdvance.status,'PASS');
  assert.equal(versionAdvance.liveMainVersion,197);

  const seedPolicy=path.join(seed,CANONICAL_VIBE_POLICY_PATH);
  const executionChange=JSON.parse(fs.readFileSync(seedPolicy,'utf8'));
  executionChange.developmentLifecycleMachine.sharedWorkerContext.mismatchAction='BLOCK_AND_REQUEUE_RELEVANT_EXECUTION_POLICY_CHANGE';
  fs.writeFileSync(seedPolicy,JSON.stringify(executionChange,null,2)+'\n','utf8');
  git(seed,'add',CANONICAL_VIBE_POLICY_PATH);
  git(seed,'commit','-m','execution policy change');
  git(seed,'push','origin','main');
  assert.throws(
    ()=>assertCompiledWorkContractFresh({cwd:worker,contract,phase:'PRE_CANDIDATE_WRITE'}),
    /CENTRAL_POLICY_STALE:PRE_CANDIDATE_WRITE/
  );
});

test('source worker rejects stale compiled policy before model generation',async()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const compiledWorkContract=compileVibeCentralWorkContract({
    snapshot,
    task:{id:'stale-worker',gameId:'demo',target:'web'},
    plan:{target:'web'},
    route:{route:'text-source-worker'},
    responsibleFiles:['web-games/demo/index.html'],
    mainSha:'abc123'
  });
  fs.mkdirSync(path.join(root,'.vibe2'),{recursive:true});
  fs.writeFileSync(path.join(root,'.vibe2/work-order.json'),JSON.stringify({
    run:true,
    workMode:'source-change-candidate',
    taskId:'stale-worker',
    gameId:'demo',
    target:'web',
    source:{root:'web-games/demo',responsibleFiles:['web-games/demo/index.html']},
    workerPolicy:{directMainWrite:false},
    compiledWorkContract
  },null,2)+'\n','utf8');
  const policyFile=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  const changed=JSON.parse(fs.readFileSync(policyFile,'utf8'));
  changed.developmentLifecycleMachine.sharedWorkerContext.mismatchAction='BLOCK_AND_REQUEUE_RELEVANT_EXECUTION_POLICY_CHANGE';
  fs.writeFileSync(policyFile,JSON.stringify(changed,null,2)+'\n','utf8');
  await assert.rejects(
    runVibe2SourceWorker({cwd:root,responseFile:path.join(root,'unused-model-output.json')}),
    /CENTRAL_POLICY_STALE:PRE_SOURCE_GENERATION/
  );
});


test('Primary AI collaboration semantics are part of the Vibe execution fingerprint',()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const before=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  const document=JSON.parse(fs.readFileSync(file,'utf8'));
  document.developmentLifecycleMachine.primaryAiOrchestration.internalVibeAiCollaboration.appliesToExistingAndFutureRegisteredInternalAi=false;
  fs.writeFileSync(file,JSON.stringify(document,null,2)+'\n','utf8');
  const after=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.equal(after.valid,false);
  assert.ok(after.errors.includes('PRIMARY_AI_INTERNAL_VIBE_COVERAGE'));
  assert.notEqual(after.executionFingerprint,before.executionFingerprint);
});


test('capability growth role lock participates in Vibe execution fingerprint',()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const before=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  const document=JSON.parse(fs.readFileSync(file,'utf8'));
  document.developmentLifecycleMachine.primaryAiOrchestration.internalVibeAiCollaboration.capabilityGrowthRoleLock.authorityMayAutoIncrease=true;
  fs.writeFileSync(file,JSON.stringify(document,null,2)+'\n','utf8');
  const after=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.equal(after.valid,false);
  assert.ok(after.errors.includes('VIBE_CAPABILITY_AUTHORITY_SEPARATION'));
  assert.notEqual(after.executionFingerprint,before.executionFingerprint);
});


test('new canonical rule automatically changes execution fingerprint and binds into work contract',()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const before=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  const document=JSON.parse(fs.readFileSync(file,'utf8'));
  document.ownerCanonicalRules.rule5={id:'RULE_5_FUTURE_OWNER_CONSTITUTION',label:'제5규칙',enabled:true,authority:'OWNER_DIRECTIVE_TEST',objective:'FUTURE_RULE'};
  fs.writeFileSync(file,JSON.stringify(document,null,2)+'\n','utf8');
  const after=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.equal(after.valid,true);
  assert.notEqual(after.executionFingerprint,before.executionFingerprint);
  const contract=compileVibeCentralWorkContract({snapshot:after,task:{id:'future-rule',gameId:'demo',target:'web'},plan:{target:'web'},route:{route:'text-source-worker'},responsibleFiles:['web-games/demo/index.html'],mainSha:'abc123'});
  assert.equal(contract.constitution.rules.length,5);
  assert.equal(contract.constitution.orderedRuleIds.at(-1),'RULE_5_FUTURE_OWNER_CONSTITUTION');
});

test('active compiled work becomes stale when owner adds a constitutional rule',()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const contract=compileVibeCentralWorkContract({snapshot,task:{id:'stale-on-new-law',gameId:'demo',target:'web'},plan:{target:'web'},route:{route:'text-source-worker'},responsibleFiles:['web-games/demo/index.html'],mainSha:'abc123'});
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  const document=JSON.parse(fs.readFileSync(file,'utf8'));
  document.ownerCanonicalRules.rule5={id:'RULE_5_FUTURE_OWNER_CONSTITUTION',label:'제5규칙',enabled:true,authority:'OWNER_DIRECTIVE_TEST',objective:'FUTURE_RULE'};
  fs.writeFileSync(file,JSON.stringify(document,null,2)+'\n','utf8');
  assert.throws(()=>assertCompiledWorkContractFresh({cwd:root,contract,phase:'PRE_CANDIDATE_WRITE'}),/CENTRAL_POLICY_STALE:PRE_CANDIDATE_WRITE/);
});


test('central architecture semantic change automatically invalidates an active work contract',()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const before=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const contract=compileVibeCentralWorkContract({
    snapshot:before,
    task:{id:'architecture-stale',gameId:'cozy-island',target:'roblox'},
    plan:{target:'roblox'},
    route:{route:'text-source-worker'},
    responsibleFiles:['roblox-games/cozy-island/server/Game.server.luau'],
    mainSha:'abc123'
  });
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  const document=JSON.parse(fs.readFileSync(file,'utf8'));
  document.developmentLifecycleMachine.nativeGameFoundationValidationStack={
    version:1,
    status:'DESIGN_LOCKED_IMPLEMENTATION_REQUIRED',
    ownership:{
      executionOwner:'EXISTING_GAME_TESTER_AND_QA_CAPABILITY',
      testerTicketState:'vibe2-unreal-core:.vibe2/tester-debug-tickets.json',
      runtimePlaytestOwner:'developmentLifecycleMachine.internalPlatformPlaytestDevelopment',
      platformQaOwner:'developmentLifecycleMachine.targetPlatformDevelopment.runtimeIndependentQaRegressionRequired',
      deterministicVerdictAuthority:'developmentLifecycleMachine.deterministicGateAuthority',
      newDepartmentCreated:false
    },
    departmentReuse:{duplicateFoundationDepartmentForbidden:true},
    layers:[{id:'F0',alwaysRequired:true},{id:'F1',alwaysRequired:true},{id:'F2',alwaysRequired:true},{id:'F3',alwaysRequired:true},{id:'F4',alwaysRequired:true}],
    testerQaFlow:['F0','PRIVATE_RUNTIME_CANDIDATE_DEPLOY','F1','F2','F3','F4'],
    releaseGate:{canonicalSequence:['F0_SOURCE_PREFLIGHT_PASS','PRIVATE_RUNTIME_CANDIDATE_DEPLOY','F1_SERVER_BOOT_PASS','F2_WORLD_FOUNDATION_PASS','F3_CHARACTER_FOUNDATION_PASS','F4_PHYSICS_AND_MOVEMENT_PASS','INTERNAL_PLATFORM_RELEASE']}
  };
  fs.writeFileSync(file,JSON.stringify(document,null,2)+'\n','utf8');
  const after=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.equal(after.valid,true);
  assert.notEqual(after.executionFingerprint,before.executionFingerprint);
  assert.throws(()=>assertCompiledWorkContractFresh({cwd:root,contract,phase:'PRE_CANDIDATE_WRITE'}),/CENTRAL_POLICY_STALE:PRE_CANDIDATE_WRITE/);
  const next=compileVibeCentralWorkContract({snapshot:after,task:{id:'architecture-new',gameId:'cozy-island',target:'roblox'},plan:{target:'roblox'},route:{route:'text-source-worker'},responsibleFiles:['roblox-games/cozy-island/server/Game.server.luau'],mainSha:'abc123'});
  assert.equal(next.architectureProjection.nativeFoundation.version,1);
  assert.deepEqual(next.architectureProjection.nativeFoundation.requiredFoundationLayers,['F0','F1','F2','F3','F4']);
});

test('policy metadata version bump alone does not invalidate compiled architecture or work contract',()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const before=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const contract=compileVibeCentralWorkContract({snapshot:before,task:{id:'version-only',gameId:'demo',target:'web'},plan:{target:'web'},route:{route:'text-source-worker'},responsibleFiles:['web-games/demo/index.html'],mainSha:'abc123'});
  writePolicy(root,197);
  const after=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.equal(after.executionFingerprint,before.executionFingerprint);
  assert.equal(assertCompiledWorkContractFresh({cwd:root,contract,phase:'PRE_WORK'}).status,'PASS');
});
