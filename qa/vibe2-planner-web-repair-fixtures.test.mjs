// 파일명: qa/vibe2-planner-web-repair-fixtures.test.mjs
// 역할: company-runtime Web repair/bootstrap 상태가 Vibe planner의 정확한 실행 작업으로 변환되는지 독립 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planVibe2AutonomousTasks, findSafeTasks } from '../tools/vibe2-auto-planner.mjs';

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

// 회귀: 3D 표시·CSS 또는 미연결 렌더러로 전환 대상이 누락되면 안 된다.
test('3D labels, CSS depth and unconnected renderer files cannot suppress redevelopment',()=>{
  const root=tempRepo();
  try{
    const dir=path.join(root,'web-games','flat');fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),`<body data-spatial-dimension="3d" style="perspective:800px"><canvas></canvas>${' '.repeat(900)}</body>`);
    fs.writeFileSync(path.join(dir,'unused.mjs'),'new THREE.PerspectiveCamera();new THREE.Mesh();new THREE.WebGLRenderer().render(scene,camera);');
    const project={gameId:'flat',engine:'web',projectPath:'web-games/flat',releaseState:'development-confirmed',ownerPreservationPresentationUpgrade:true};
    const rows=findSafeTasks(project,root,{tasks:[]});
    assert.match(rows[0].id,/web-startup-spatial-repair/);
    assert.ok(rows[0].evidence.some(value=>value.includes('REAL_3D_GAMEPLAY_IMPLEMENTATION_REQUIRED')));
    assert.deepEqual(rows[0].responsibleFiles,['web-games/flat/index.html']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('connected nested modules are inspected and repair owns the existing renderer',()=>{
  const root=tempRepo();
  try{
    const dir=path.join(root,'web-games','modular');fs.mkdirSync(path.join(dir,'view'),{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),'<canvas></canvas><script type="module" src="main.mjs"></script>');
    fs.writeFileSync(path.join(dir,'main.mjs'),"import './view/world.mjs';");
    const renderer=path.join(dir,'view/world.mjs');
    fs.writeFileSync(renderer,"import '../main.mjs';\n"+'// flat renderer\n'.repeat(80));
    const project={gameId:'modular',engine:'web',projectPath:'web-games/modular',releaseState:'development-confirmed',ownerPreservationPresentationUpgrade:true};
    const repair=findSafeTasks(project,root,{tasks:[]})[0];
    assert.match(repair.id,/web-startup-spatial-repair/);
    assert.deepEqual(new Set(repair.responsibleFiles),new Set(['web-games/modular/index.html','web-games/modular/main.mjs','web-games/modular/view/world.mjs']));
    fs.writeFileSync(renderer,"import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';\n"+'const camera=new THREE.PerspectiveCamera();const mesh=new THREE.Mesh();const renderer=new THREE.WebGLRenderer();renderer.render(scene,camera);\n'+'// source structure only\n'.repeat(80));
    const next=findSafeTasks(project,root,{tasks:[]});
    assert.equal(next.some(row=>/web-startup-spatial-repair/.test(row.id)),false);
    fs.appendFileSync(renderer,"\nimport './missing.mjs';");
    const missing=findSafeTasks(project,root,{tasks:[]})[0];
    assert.ok(missing.evidence.some(value=>value.includes('LOCAL_RUNTIME_DEPENDENCY_MISSING:./missing.mjs')));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
