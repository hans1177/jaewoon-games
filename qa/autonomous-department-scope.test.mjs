// 파일명: qa/autonomous-department-scope.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveDepartmentScope } from '../tools/autonomous-department-scope.mjs';

function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-scope-'));return root;}

test('one mixed game micro-task file is owned by exactly one implementation department',()=>{
  const root=fixture();
  try{
    fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><style>.hud{transform:scale(1)}</style><canvas id="game"></canvas><script>const enemy={hp:100,damage:12};let wave=1;const c=document.getElementById('game');c.addEventListener('pointerdown',()=>{});function render(){c.getContext('2d').fillRect(0,0,10,10)}try{render()}catch(error){console.error(error)}</script>`);
    const source=`web-games/${path.basename(root)}`;
    fs.mkdirSync(path.dirname(source),{recursive:true});
    fs.cpSync(root,source,{recursive:true});
    try{
      const common={sourcePath:source,responsibilityFiles:['index.html'],goal:'runtime 오류 1개를 index.html에서 복구',repairMode:'MODEL'};
      const roles=['development','graphics','qa','balance'];
      const scopes=roles.map(role=>({role,result:resolveDepartmentScope({...common,role})}));
      const runnable=scopes.filter(row=>row.result.run);
      assert.deepEqual(runnable.map(row=>row.role),['development']);
      assert.deepEqual(runnable[0].result.scope,['index.html']);
      for(const row of scopes.filter(row=>row.role!=='development')){
        assert.equal(row.result.reason,'SINGLE_FILE_MICROTASK_OWNED_BY_DEVELOPMENT');
      }
    }finally{fs.rmSync(source,{recursive:true,force:true});}
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('single-file owner is invariant across department-specific review text',()=>{
  const root=fixture();
  try{
    fs.writeFileSync(path.join(root,'index.html'),'<canvas id="game"></canvas><script>function load(){console.error("404")}</script>');
    const source=`web-games/${path.basename(root)}`;
    fs.mkdirSync(path.dirname(source),{recursive:true});
    fs.cpSync(root,source,{recursive:true});
    try{
      const common={sourcePath:source,responsibilityFiles:['index.html'],goal:'runtime 404 1개만 복구',repairMode:'MODEL'};
      const development=resolveDepartmentScope({...common,role:'development',departmentResult:{nextAction:'개발 로직을 수정'}});
      const graphics=resolveDepartmentScope({...common,role:'graphics',departmentResult:{nextAction:'그래픽 UI와 animation render를 크게 개선'}});
      assert.equal(development.run,true);
      assert.equal(graphics.run,false);
      assert.equal(graphics.reason,'SINGLE_FILE_MICROTASK_OWNED_BY_DEVELOPMENT');
    }finally{fs.rmSync(source,{recursive:true,force:true});}
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('single CSS micro-task is assigned to graphics instead of development fallback',()=>{
  const root=fixture();
  try{
    fs.writeFileSync(path.join(root,'style.css'),'.hud{transform:scale(1);animation:pulse 1s infinite}');
    const source=`web-games/${path.basename(root)}`;
    fs.mkdirSync(path.dirname(source),{recursive:true});
    fs.cpSync(root,source,{recursive:true});
    try{
      const common={sourcePath:source,responsibilityFiles:['style.css'],goal:'UI 그래픽 표시 1개만 수정',repairMode:'MODEL'};
      assert.equal(resolveDepartmentScope({...common,role:'graphics'}).run,true);
      const development=resolveDepartmentScope({...common,role:'development'});
      assert.equal(development.run,false);
      assert.equal(development.reason,'SINGLE_FILE_MICROTASK_OWNED_BY_GRAPHICS');
    }finally{fs.rmSync(source,{recursive:true,force:true});}
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('generated hashed bundles are never selected as model-owned responsibility files',()=>{
  const source='web-games/__scope-bundle-test__';
  fs.rmSync(source,{recursive:true,force:true});
  fs.mkdirSync(path.join(source,'assets'),{recursive:true});
  fs.writeFileSync(path.join(source,'index.html'),'<main id="app"></main><script type="module" src="./src/main.js"></script>');
  fs.mkdirSync(path.join(source,'src'),{recursive:true});
  fs.writeFileSync(path.join(source,'src','main.js'),'const app=document.getElementById("app");app.addEventListener("pointerdown",()=>{});function update(){requestAnimationFrame(update)}update();');
  fs.writeFileSync(path.join(source,'assets','framework-DjPHiq1u.js'),'function generated(){return "bundle"}'.repeat(5000));
  fs.writeFileSync(path.join(source,'assets','index-3qxzORsP.css'),'.generated{display:block}'.repeat(5000));
  try{
    const result=resolveDepartmentScope({
      role:'development',
      sourcePath:source,
      responsibilityFiles:['assets/framework-DjPHiq1u.js','assets/index-3qxzORsP.css'],
      diagnostic:{file:'assets/framework-DjPHiq1u.js',type:'same-origin-resource-failure'},
      goal:'404 runtime 사고 1개만 복구',
      repairMode:'MODEL'
    });
    assert.equal(result.run,true);
    assert.deepEqual([...result.scope].sort(),['index.html','src/main.js']);
    assert.equal(result.scope.some(file=>file.startsWith('assets/')),false);
    assert.equal(result.scores.some(row=>row.path==='assets/framework-DjPHiq1u.js'),false);
  }finally{fs.rmSync(source,{recursive:true,force:true});}
});

test('rule patch stays development-only',()=>{
  const source='web-games/__scope-rule-test__';
  fs.rmSync(source,{recursive:true,force:true});fs.mkdirSync(source,{recursive:true});fs.writeFileSync(path.join(source,'index.html'),'<html></html>');
  try{
    const common={sourcePath:source,responsibilityFiles:['index.html'],repairMode:'RULE_PATCH'};
    assert.equal(resolveDepartmentScope({...common,role:'development'}).run,true);
    assert.equal(resolveDepartmentScope({...common,role:'graphics'}).run,false);
    assert.equal(resolveDepartmentScope({...common,role:'qa'}).run,false);
    assert.equal(resolveDepartmentScope({...common,role:'balance'}).run,false);
  }finally{fs.rmSync(source,{recursive:true,force:true});}
});

test('FAST lane runs implementation only in development workspace',()=>{
  const source='web-games/__scope-fast-test__';
  fs.rmSync(source,{recursive:true,force:true});fs.mkdirSync(source,{recursive:true});fs.writeFileSync(path.join(source,'index.html'),'<html><script>function load(){console.error("404")}</script></html>');
  try{
    const common={sourcePath:source,responsibilityFiles:['index.html'],repairMode:'MODEL',workLane:'FAST',goal:'404 경로 복구'};
    assert.equal(resolveDepartmentScope({...common,role:'development'}).run,true);
    for(const role of ['graphics','qa','balance']){
      const result=resolveDepartmentScope({...common,role});
      assert.equal(result.run,false);
      assert.equal(result.reason,'FAST_LANE_DEVELOPMENT_ONLY');
    }
  }finally{fs.rmSync(source,{recursive:true,force:true});}
});
