import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveDepartmentScope } from '../tools/autonomous-department-scope.mjs';

const root='web-games/__vibe2-graphics-scope-test__';
function setup(){
  fs.rmSync(root,{recursive:true,force:true});
  fs.mkdirSync(path.join(root,'ui'),{recursive:true});
  fs.writeFileSync(path.join(root,'index.html'),'<!doctype html><main id="game"></main><script src="game.js"></script>');
  fs.writeFileSync(path.join(root,'game.js'),'const state={hp:10,damage:2}; function update(){requestAnimationFrame(update)} update();');
  fs.writeFileSync(path.join(root,'ui','hud.css'),'.hud{position:fixed;right:-12px;transform:scale(1);animation:pulse 1s infinite}');
}
function cleanup(){fs.rmSync(root,{recursive:true,force:true});}

test('concrete safe-area evidence routes a review-ish graphics handoff to a real visual file',()=>{
  setup();
  try{
    const result=resolveDepartmentScope({
      role:'graphics',sourcePath:root,responsibilityFiles:[],workLane:'FULL',repairMode:'MODEL',
      goal:'모바일 UI 문제를 최소 범위로 복구한다',
      diagnostic:{type:'UI_OUTSIDE_SAFE_AREA',message:'모바일 HUD가 safe area 밖으로 넘침'},
      departmentResult:{summary:'화면 상태를 검토했다',nextAction:'현재 화면을 확인하고 안전한 범위만 유지한다'}
    });
    assert.equal(result.run,true);
    assert.equal(result.reason,'GRAPHICS_ENGINE_ACTIONABLE_SCOPE');
    assert.deepEqual(result.scope,['ui/hud.css']);
    assert.equal(result.graphicsPlan.run,true);
  }finally{cleanup();}
});

test('generic graphics review still remains NO_SCOPE instead of creating cosmetic churn',()=>{
  setup();
  try{
    const result=resolveDepartmentScope({
      role:'graphics',sourcePath:root,responsibilityFiles:[],workLane:'FULL',repairMode:'MODEL',
      goal:'가장 작은 playable vertical slice 1개를 구현한다',
      departmentResult:{summary:'그래픽을 검토했다',nextAction:'현재 그래픽을 검토하고 다음 기준을 제안한다'}
    });
    assert.equal(result.run,false);
    assert.equal(result.reason,'NO_FUNCTIONAL_RESPONSIBILITY');
  }finally{cleanup();}
});

test('graphics planner does not seize a gameplay-only single-file micro-task',()=>{
  setup();
  try{
    const result=resolveDepartmentScope({
      role:'graphics',sourcePath:root,responsibilityFiles:['game.js'],workLane:'FULL',repairMode:'MODEL',
      goal:'runtime 오류 1개를 game.js에서 복구한다',
      diagnostic:{file:'game.js',type:'DOM_NULL_EVENT_BIND',message:'runtime 오류'},
      departmentResult:{nextAction:'그래픽 영향만 검토한다'}
    });
    assert.equal(result.run,false);
  }finally{cleanup();}
});
