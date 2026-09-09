// 파일명: qa/artbook-learning-context.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const script=path.resolve('tools/artbook-learning-context.mjs');
const roles=['planning','graphics','development','qa','balance'];
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2));}
function validFeedback(DECISION,ROOT_CAUSE_CLASS){return {DECISION,ROOT_CAUSE_CLASS,ROOT_CAUSE:'실제 검증에서 확인된 원인이다.',EVIDENCE:'재현 가능한 플레이 및 게이트 근거다.',UNITY_IMPLEMENTATION_NOTE:'기존 책임 시스템 안에서 수정한다.',UNITY_ART_NOTE:'모바일 가독성과 역할 구분을 유지한다.'};}

test('learning context binds demo feedback, rejects unsafe DROP, excludes self-learning, and stays idempotent',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'artbook-learning-'));
  const date='2026-09-10',gameId='test-stealth';
  writeJson(path.join(root,'artbook-submission-queue.json'),{currentDailyTarget:gameId,games:[{gameId}]});
  writeJson(path.join(root,'artbook-style-profiles.json'),{games:{[gameId]:{identity:'침투 작전 파일 경비 발각 탈출',storyFocus:'잠입 경비 발각 위험 보상',signatureSections:['침투','경비','탈출']}}});
  writeJson(path.join(root,`artbook-work-orders/${date}-${gameId}.json`),{gameId,date,gameName:'Test Stealth',departmentTasks:Object.fromEntries(roles.map(r=>[r,{scope:`${r} base scope`}]))});
  writeJson(path.join(root,`artbook-submissions/${gameId}/2026-09-07/learning-context.json`),{learnedFeedback:{KEEP:[{text:'자기 생성 학습 컨텍스트는 재학습하면 안 된다.'}]}});
  writeJson(path.join(root,`artbook-submissions/${gameId}/2026-09-08/legacy.json`),{feedbackLoop:{KEEP:['모바일 조작 가독성은 유지한다.'],DROP:['근본원인 분류가 없는 오래된 DROP은 재사용하지 않는다.']}});
  writeJson(path.join(root,`artbook-submissions/${gameId}/2026-09-09/valid.json`),{feedback:validFeedback('DROP','DESIGN_REDUNDANT')});
  writeJson(path.join(root,`artbook-submissions/${gameId}/2026-09-09/invalid.json`),{feedback:validFeedback('DROP','TOOL_CODE')});
  writeJson(path.join(root,'artbook-demo-concept-gate.json'),{games:{[gameId]:{feedback:validFeedback('FIX_REQUIRED','DATA_BINDING')}}});
  const env={...process.env,ARTBOOK_GAME_ID:gameId,ARTBOOK_DATE:date};
  for(let i=0;i<2;i++){
    const run=spawnSync(process.execPath,[script],{cwd:root,env,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr||run.stdout);
  }
  const work=JSON.parse(fs.readFileSync(path.join(root,`artbook-work-orders/${date}-${gameId}.json`),'utf8'));
  for(const role of roles){
    const scope=work.departmentTasks[role].scope;
    assert.match(scope,/\[VIBE2_LEARNING_CONTEXT\]/);
    assert.match(scope,/genreHypothesis=stealth/);
    assert.match(scope,/KEEP: 모바일 조작 가독성은 유지한다/);
    assert.match(scope,/DROP: 실제 검증에서 확인된 원인이다/);
    assert.match(scope,/FIX_REQUIRED: 실제 검증에서 확인된 원인이다/);
    assert.doesNotMatch(scope,/오래된 DROP은 재사용하지 않는다/);
    assert.doesNotMatch(scope,/자기 생성 학습 컨텍스트는 재학습하면 안 된다/);
    assert.equal((scope.match(/\[VIBE2_LEARNING_CONTEXT\]/g)||[]).length,1);
  }
  const context=JSON.parse(fs.readFileSync(path.join(root,`artbook-submissions/${gameId}/${date}/learning-context.json`),'utf8'));
  assert.equal(context.paidApi,false);
  assert.equal(context.genreHypothesis.name,'stealth');
  assert.equal(context.contracts.structuredFeedbackValidated,true);
  assert.equal(context.contracts.demoGateFeedbackBound,true);
  assert.equal(context.contracts.legacyDropRequiresRootCause,true);
  assert.equal(context.contracts.selfGeneratedLearningExcluded,true);
  assert.equal(context.learnedFeedback.DROP.length,1);
  assert.equal(context.learnedFeedback.FIX_REQUIRED.length,1);
  assert.ok(context.sourceFiles.some(x=>x.includes('artbook-demo-concept-gate.json#games.test-stealth.feedback')));
  assert.ok(!context.sourceFiles.some(x=>x.endsWith('/learning-context.json')));
  assert.ok(context.rejectedFeedback.some(x=>x.reason==='legacy-drop-missing-root-cause-contract'));
  assert.ok(context.rejectedFeedback.some(x=>/DROP/.test(x.reason)));
});
