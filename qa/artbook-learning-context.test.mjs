import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const script=path.resolve('tools/artbook-learning-context.mjs');
const roles=['planning','graphics','development','qa','balance'];
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2));}

test('learning context reuses prior feedback and is idempotent',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'artbook-learning-'));
  const date='2026-09-10',gameId='test-survival';
  writeJson(path.join(root,'artbook-submission-queue.json'),{currentDailyTarget:gameId,games:[{gameId}]});
  writeJson(path.join(root,'artbook-style-profiles.json'),{games:{[gameId]:{identity:'survival crafting garden',storyFocus:'survival'}}});
  writeJson(path.join(root,`artbook-work-orders/${date}-${gameId}.json`),{gameId,date,gameName:'Test Survival',departmentTasks:Object.fromEntries(roles.map(r=>[r,{scope:`${r} base scope`}]))});
  writeJson(path.join(root,`artbook-submissions/${gameId}/2026-09-09/artbook.json`),{feedbackLoop:{KEEP:['모바일 조작 가독성은 유지한다.'],CHANGE:['전투 전 경고 신호를 더 명확히 한다.'],DROP:['근거 없는 수치 제안은 제거한다.'],UNITY_IMPLEMENTATION_NOTE:['기존 입력 시스템을 재사용한다.']}});
  const env={...process.env,ARTBOOK_GAME_ID:gameId,ARTBOOK_DATE:date};
  for(let i=0;i<2;i++){
    const run=spawnSync(process.execPath,[script],{cwd:root,env,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr||run.stdout);
  }
  const work=JSON.parse(fs.readFileSync(path.join(root,`artbook-work-orders/${date}-${gameId}.json`),'utf8'));
  for(const role of roles){
    const scope=work.departmentTasks[role].scope;
    assert.match(scope,/\[VIBE2_LEARNING_CONTEXT\]/);
    assert.match(scope,/genreHypothesis=survival/);
    assert.match(scope,/KEEP: 모바일 조작 가독성은 유지한다/);
    assert.equal((scope.match(/\[VIBE2_LEARNING_CONTEXT\]/g)||[]).length,1);
  }
  const context=JSON.parse(fs.readFileSync(path.join(root,`artbook-submissions/${gameId}/${date}/learning-context.json`),'utf8'));
  assert.equal(context.paidApi,false);
  assert.equal(context.genreHypothesis.name,'survival');
  assert.equal(context.contracts.genreIsHypothesisOnly,true);
  assert.equal(context.contracts.noAutomaticRuleChange,true);
  assert.equal(context.learnedFeedback.KEEP[0].text,'모바일 조작 가독성은 유지한다.');
});
