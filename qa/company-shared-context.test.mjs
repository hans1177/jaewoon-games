// 파일명: qa/company-shared-context.test.mjs
// 역할: 중앙정책·로그맵·아키텍처맵과 주 AI 총괄 권한의 동기화 계약을 검증한다.

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
      version:31,
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
          role:'PRIMARY_AI_SYSTEM_ORCHESTRATOR_AND_REVIEWER',
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
        finalAcceptanceRequiresPrimaryAiReview:true,
        workerSelfAcceptanceForbidden:true
      }
    },
    archJson:{
      requiredForAllWorkers:true,
      centralPolicy:policy,
      logMap:log,
      sharedContextLoadOrder:[policy,log,arch],
      workerRoles:{
        PRIMARY_AI_ORCHESTRATOR:'SYSTEM_ROADMAP_BOTTLENECK_ASSIGNMENT_REVIEW_AND_ACCEPTANCE_AUTHORITY'
      },
      externalAiRules:{
        finalSystemAcceptanceForbidden:true
      }
    }
  };
}

test('shared worker context validates policy log architecture and primary AI orchestration together',()=>{
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
    assert.equal(result.primaryAiReviewRequired,true);
    assert.equal(result.hashes.policySha256.length,64);
    assert.equal(result.hashes.logMapSha256.length,64);
    assert.equal(result.hashes.architectureSha256.length,64);
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

test('external AI cannot claim final system acceptance',()=>{
  const cwd=root();
  const f=fixtures();
  f.logJson.orchestrationLogContract.workerSelfAcceptanceForbidden=false;
  write(path.join(cwd,f.policy),f.policyJson);
  write(path.join(cwd,f.log),f.logJson);
  write(path.join(cwd,f.arch),f.archJson);
  const previous=process.cwd();
  process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/LOG_WORKER_SELF_ACCEPTANCE/);}
  finally{process.chdir(previous);}
});
