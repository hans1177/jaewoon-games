// 파일명: qa/autonomous-department-scope.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveDepartmentScope } from '../tools/autonomous-department-scope.mjs';

function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-scope-'));return root;}

test('one mixed game file may be owned by multiple isolated departments',()=>{
  const root=fixture();
  try{
    fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><style>.hud{transform:scale(1)}</style><canvas id="game"></canvas><script>const enemy={hp:100,damage:12};let wave=1;const c=document.getElementById('game');c.addEventListener('pointerdown',()=>{});function render(){c.getContext('2d').fillRect(0,0,10,10)}try{render()}catch(error){console.error(error)}</script>`);
    const source=`web-games/${path.basename(root)}`;
    fs.mkdirSync(path.dirname(source),{recursive:true});
    fs.cpSync(root,source,{recursive:true});
    try{
      const common={sourcePath:source,responsibilityFiles:['index.html'],goal:'모바일 전투 UI 오류와 전투 밸런스를 검토',repairMode:'MODEL'};
      const scopes=['development','graphics','qa','balance'].map(role=>resolveDepartmentScope({...common,role}));
      for(const result of scopes){assert.equal(result.run,true);assert.ok(result.scope.includes('index.html'));}
    }finally{fs.rmSync(source,{recursive:true,force:true});}
  }finally{fs.rmSync(root,{recursive:true,force:true});}
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
