// 파일명: qa/vibe2-planner-web-repair-fixtures.test.mjs
// 역할: company-runtime Web repair/bootstrap 상태가 Vibe planner의 정확한 실행 작업으로 변환되는지 독립 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planVibe2AutonomousTasks } from '../tools/vibe2-auto-planner.mjs';

function tempRepo(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-web-repair-fixture-'));
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    authority:'MACHINE_EXECUTION_CONTRACT',
    machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
    humanDocumentRequired:false,
  },null,2),'utf8');
  return root;
}

function catalogRow(gameId,hasWebArchive=false){
  return {
    id:gameId,
    name:gameId,
    productionClass:'DEVELOPMENT_CONFIRMED',
    lifecycleState:'ACTIVE',
    homepageWebPlayable:false,
    hasWebArchive,
    ...(hasWebArchive?{webPath:`/web-games/${gameId}/`}:{}),
  };
}

test('existing WEB_VIBE_REPAIR_REQUIRED source plans one exact-stage repair and suppresses duplicates',()=>{
  const root=tempRepo();
  try{
    const gameId='fixture-repair-web';
    const relative=`web-games/${gameId}`;
    fs.mkdirSync(path.join(root,relative),{recursive:true});
    fs.writeFileSync(path.join(root,relative,'index.html'),'<!doctype html><main>existing</main>','utf8');
    const developmentQueue={items:[{
      gameId,
      gameName:'Fixture Repair Web',
      status:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'VIBE_WEB_REPAIR',
      canonicalState:'WEB_VIBE_REPAIR_REQUIRED',
      webSourcePath:relative,
      sourcePath:relative,
      vibeWebRequestedStage:'WEB_REPAIR',
      vibeWebImplementationReason:'MOBILE_TOUCH_ACTION_NOT_CONNECTED',
      routingBlockers:['vibe-web-implementation-required:WEB_REPAIR:MOBILE_TOUCH_ACTION_NOT_CONNECTED'],
    }]};

    const first=planVibe2AutonomousTasks({
      status:{projects:[]},
      catalog:{games:[catalogRow(gameId,true)]},
      developmentQueue,
      queue:{maxConcurrentTasks:4,tasks:[]},
      repoRoot:root,
      maxConcurrentTasks:4,
    });
    const exact=first.queue.tasks.filter(row=>row.id===`${gameId}-web-runtime-repair-v1`);
    assert.equal(exact.length,1);
    assert.equal(exact[0].status,'queued');
    assert.deepEqual(exact[0].responsibleFiles,[`${relative}/index.html`]);
    assert.ok(exact[0].evidence.includes('company-runtime-state:WEB_VIBE_REPAIR_REQUIRED'));
    assert.ok(exact[0].evidence.includes('recovery-exact-stage:WEB_REPAIR'));

    const second=planVibe2AutonomousTasks({
      status:{projects:[]},
      catalog:{games:[catalogRow(gameId,true)]},
      developmentQueue,
      queue:first.queue,
      repoRoot:root,
      maxConcurrentTasks:4,
    });
    assert.equal(second.queue.tasks.filter(row=>row.id===`${gameId}-web-runtime-repair-v1`).length,1);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('missing Web root plans candidate bootstrap with explicit evidence and no source side effect',()=>{
  const root=tempRepo();
  try{
    const gameId='fixture-missing-web';
    const relative=`web-games/${gameId}`;
    const result=planVibe2AutonomousTasks({
      status:{projects:[]},
      catalog:{games:[catalogRow(gameId,false)]},
      developmentQueue:{items:[{
        gameId,
        gameName:'Fixture Missing Web',
        status:'ACTIVE',
        productionClass:'DEVELOPMENT_CONFIRMED',
        currentStep:'VIBE_WEB_BASE_IMPLEMENTATION',
        canonicalState:'WEB_VIBE_REPAIR_REQUIRED',
        webSourcePath:relative,
        sourcePath:relative,
      }]},
      queue:{maxConcurrentTasks:4,tasks:[]},
      repoRoot:root,
      maxConcurrentTasks:4,
    });
    const exact=result.queue.tasks.filter(row=>row.id===`${gameId}-web-base-implementation-v1`);
    assert.equal(exact.length,1);
    assert.equal(exact[0].status,'queued');
    assert.equal(exact[0].sourceRoot,relative);
    assert.deepEqual(exact[0].responsibleFiles,[`${relative}/index.html`]);
    assert.ok(exact[0].evidence.includes('source-root-bootstrap-required'));
    assert.ok(exact[0].evidence.includes('existing-web-source:MISSING'));
    assert.match(exact[0].goal,/SOURCE_ROOT_BOOTSTRAP_ALLOWED/);
    assert.equal(fs.existsSync(path.join(root,relative,'index.html')),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});
