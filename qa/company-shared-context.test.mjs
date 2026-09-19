// 파일명: qa/company-shared-context.test.mjs
// 역할: 중앙정책·로그맵·아키텍처맵의 상호 참조와 완료 차단 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateSharedWorkerContext } from '../tools/company-shared-context.mjs';

function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'company-shared-context-'));}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}

test('shared worker context validates central policy log map and architecture map together',()=>{
  const cwd=root();
  const policy='company-learning/platform-release-roadmap.json';
  const log='company-learning/company-log-map.json';
  const arch='company-learning/company-architecture-map.json';
  write(path.join(cwd,policy),{version:30,developmentLifecycleMachine:{sharedWorkerContext:{requiredForAllWorkers:true,logMap:log,architectureMap:arch,completionRequiresSharedContextSync:true,mismatchAction:'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE'}}});
  write(path.join(cwd,log),{requiredForAllWorkers:true,centralPolicy:policy,architectureMap:arch});
  write(path.join(cwd,arch),{requiredForAllWorkers:true,centralPolicy:policy,logMap:log,sharedContextLoadOrder:[policy,log,arch]});
  const previous=process.cwd();
  process.chdir(cwd);
  try{
    const result=validateSharedWorkerContext();
    assert.equal(result.pass,true);
    assert.equal(result.hashes.policySha256.length,64);
    assert.equal(result.hashes.logMapSha256.length,64);
    assert.equal(result.hashes.architectureSha256.length,64);
  }finally{process.chdir(previous);}
});

test('shared worker context blocks completion when architecture binding drifts',()=>{
  const cwd=root();
  const policy='company-learning/platform-release-roadmap.json';
  const log='company-learning/company-log-map.json';
  const arch='company-learning/company-architecture-map.json';
  write(path.join(cwd,policy),{developmentLifecycleMachine:{sharedWorkerContext:{requiredForAllWorkers:true,logMap:log,architectureMap:arch,completionRequiresSharedContextSync:true,mismatchAction:'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE'}}});
  write(path.join(cwd,log),{requiredForAllWorkers:true,centralPolicy:policy,architectureMap:arch});
  write(path.join(cwd,arch),{requiredForAllWorkers:true,centralPolicy:policy,logMap:'wrong.json',sharedContextLoadOrder:[policy,log,arch]});
  const previous=process.cwd();
  process.chdir(cwd);
  try{assert.throws(()=>validateSharedWorkerContext(),/MAP_CROSS_REFERENCE/);}
  finally{process.chdir(previous);}
});
