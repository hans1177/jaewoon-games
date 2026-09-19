// 파일명: qa/company-shared-context.test.mjs
// 역할: 중앙정책·로그맵·아키텍처맵과 비차단 주 AI 감독 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateSharedWorkerContext } from '../tools/company-shared-context.mjs';

function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'company-shared-context-'));}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function fixtures(){
  const policy='company-learning/platform-release-roadmap.json';
  const log='company-learning/company-log-map.json';
  const arch='company-learning/company-architecture-map.json';
  return{
    policy,log,arch,
    policyJson:{
      version:32,
      developmentLifecycleMachine:{
        sharedWorkerContext:{
          requiredForAllWorkers:true,
          logMap:log,
          architectureMap:arch,
          completionRequiresSharedContextSync:true,
          mismatchAction:'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE'
        },
        primaryAiOrchestration:{
          orchestrator:'CHATGPT_PRIMARY_AI',
          role:'PRIMARY_AI_NON_BLOCKING_SUPERVISOR',
          presenceRequiredForAutonomousWork:false,
          absenceBlocksWorkerProgress:false,
          workersContinue24hFromCentralContract:true,
          reviewRequiredForWorkerCompletion:false,
          deterministicEvidenceOwnsTaskCompletion:true,
          gameSourceAuthoring:false,
          gameImplementationOwner:['VIBE2','VIBE3'],
          externalAiWorkerPolicy:{
            maySelfPromoteToOrchestrator:false,
            mayIssueFinalSystemCompletionVerdict:false
          }
        }
      }
    },
    logJson:{
      requiredForAllWorkers:true,
      centralPolicy:policy,
      architectureMap:arch,
      orchestrationLogContract:{
        finalAcceptanceRequiresPrimaryAiReview:false,
        deterministicMachineGateMayCompleteWithoutPrimaryAi:true,
        workerMustNotInventPolicy:true,
        supervisorAbsenceIsNotAWorkerBlocker:true
      }
    },
    archJson:{
      requiredForAllWorkers:true,
      centralPolicy:policy,
      logMap:log,
      sharedContextLoadOrder:[policy,log,arch],
      workerRoles:{
        PRIMARY_AI_ORCHESTRATOR:'NON_BLOCKING_ROADMAP_PRIORITY_BOTTLENECK_SUPERVISOR'
      },
      externalAiRules:{
        finalSystemAcceptanceForbidden:true
      },
      primaryAiPresenceRequired:false,
      autonomous24hWorkersContinueWithoutPrimaryAi:true
    }
  };
}

test('shared worker context allows autonomous 24h work without primary AI presence',()=>{
  const cwd=root();
  const f=fixtures();
  write(path.join(cwd,f.policy),f.policyJson);
  write(path.join(cwd,f.log),f.logJson);
  write(path.join(cwd,f.arch),f.archJson);
  const previous=process.cwd();
  process.chdir(cwd);
  try{
    const result=validateSharedWorkerContext();
    assert.equal(result.pass,true);
    assert.equal(result.primaryAiOrchestrator,'CHATGPT_PRIMARY_AI');
    assert.equal(result.primaryAiReviewRequired,false);
    assert.equal(result.autonomous24hWorkersContinue,true);
    assert.equal(result.completionAuthority,'DETERMINISTIC_EVIDENCE_AND_CANONICAL_MACHINE_GATES');
  }finally{process.chdir(previous);}
});

test('shared worker context blocks completion when architecture binding drifts',()=>{
  const cwd=root();
  const f=fixtures();
  f.archJson.logMap='wrong.json';
  write(path.join(cwd,f.policy),f.policyJson);
  write(path.join(cwd,f.log),f.logJson);
  write(path.join(cwd,f.arch),f.archJson);
  const previous=process.cwd();
  process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/MAP_CROSS_REFERENCE/);}
  finally{process.chdir(previous);}
});

test('primary AI presence must never become a runtime gate',()=>{
  const cwd=root();
  const f=fixtures();
  f.policyJson.developmentLifecycleMachine.primaryAiOrchestration.presenceRequiredForAutonomousWork=true;
  write(path.join(cwd,f.policy),f.policyJson);
  write(path.join(cwd,f.log),f.logJson);
  write(path.join(cwd,f.arch),f.archJson);
  const previous=process.cwd();
  process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/PRIMARY_AI_MUST_NOT_BLOCK_AUTONOMY/);}
  finally{process.chdir(previous);}
});

test('worker may complete canonical work through deterministic gates but may not invent policy',()=>{
  const cwd=root();
  const f=fixtures();
  f.logJson.orchestrationLogContract.workerMustNotInventPolicy=false;
  write(path.join(cwd,f.policy),f.policyJson);
  write(path.join(cwd,f.log),f.logJson);
  write(path.join(cwd,f.arch),f.archJson);
  const previous=process.cwd();
  process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/LOG_WORKER_POLICY_BOUNDARY/);}
  finally{process.chdir(previous);}
});
