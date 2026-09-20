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
    policyJson:{version:36,developmentLifecycleMachine:{
      sharedWorkerContext:{version:2,requiredForAllWorkers:true,centralPolicy:policy,logMap:log,architectureMap:arch,securityPolicy:security,documentIsCode:true,roadmapIsExecutableContract:true,workerLauncherSyncRequired:true,workerLauncherWorkflows:launchers,staleContextMayNotStartWork:true,staleContextMayNotCompleteWork:true,syncMode:'ROADMAP_FIRST_FAIL_CLOSED',completionRequiresSharedContextSync:true,mismatchAction:'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE'},
      securityImmuneSystem:{policyFile:security},
      primaryAiOrchestration:{orchestrator:'CHATGPT_PRIMARY_AI',role:'PRIMARY_AI_NON_BLOCKING_SUPERVISOR',presenceRequiredForAutonomousWork:false,absenceBlocksWorkerProgress:false,workersContinue24hFromCentralContract:true,reviewRequiredForWorkerCompletion:false,deterministicEvidenceCreatesVerifiedCheckpoint:true,verifiedCheckpointDoesNotStopBrain:true,gameSourceAuthoring:false,gameImplementationOwner:['VIBE2','VIBE3'],externalAiWorkerPolicy:{maySelfPromoteToOrchestrator:false,mayIssueFinalSystemCompletionVerdict:false}}
    }},
    logJson:{requiredForAllWorkers:true,centralPolicy:policy,architectureMap:arch,securityPolicy:security,workerContextLogContract:{roadmapPolicyHashRequired:true,securityPolicyHashRequired:true,launcherValidationRequired:true},orchestrationLogContract:{finalAcceptanceRequiresPrimaryAiReview:false,deterministicMachineGateMayCompleteWithoutPrimaryAi:true,workerMustNotInventPolicy:true,supervisorAbsenceIsNotAWorkerBlocker:true}},
    archJson:{requiredForAllWorkers:true,centralPolicy:policy,logMap:log,securityPolicy:security,sharedContextLoadOrder:[policy,log,arch,security],workerSynchronization:{documentIsCode:true,launcherValidationRequired:true,validator:'tools/company-shared-context.mjs',launcherWorkflows:launchers},workerRoles:{PRIMARY_AI_ORCHESTRATOR:'NON_BLOCKING_ROADMAP_PRIORITY_BOTTLENECK_SUPERVISOR'},externalAiRules:{finalSystemAcceptanceForbidden:true},primaryAiPresenceRequired:false,autonomous24hWorkersContinueWithoutPrimaryAi:true},
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
