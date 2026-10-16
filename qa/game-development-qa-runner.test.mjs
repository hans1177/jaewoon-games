import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chooseGameQa,runGameQa} from '../tools/game-development-qa-runner.mjs';

const games=[
 {gameId:'alpha',sources:{WEB:'web-games/alpha',ROBLOX:'roblox-games/alpha'},
  qa:['qa/alpha-save.test.mjs','qa/alpha-combat.test.mjs']},
 {gameId:'beta',sources:{UNITY:'unity-games/beta'},qa:['qa/beta-gameplay.test.mjs']},
 {gameId:'untested',sources:{UEFN:'uefn-games/untested'},qa:[]}
];
test('only changed game is selected; global changes do not cause irrelevant game QA',()=>{
  const selected=chooseGameQa({games,changedFiles:[
    'company-directive.json','web-games/alpha/index.html','tools/company-shared-context.mjs'
  ]});
  assert.deepEqual(selected.map(r=>r.gameId),['alpha']);
  assert.deepEqual(selected[0].tests,['qa/alpha-combat.test.mjs','qa/alpha-save.test.mjs']);
  assert.equal(selected[0].previousValidationEvidenceReused,false);
});
test('native engine and external assets target only their corresponding game',()=>{
  assert.deepEqual(chooseGameQa({games,changedFiles:['unity-games/beta/Assets/Game.cs']}).map(r=>r.gameId),['beta']);
  assert.deepEqual(chooseGameQa({games,changedFiles:['assets/external/alpha/manifest.json']}).map(r=>r.gameId),['alpha']);
  assert.deepEqual(chooseGameQa({games,changedFiles:['qa/beta-gameplay.test.mjs']}).map(r=>r.gameId),['beta']);
});
test('exact game scope and all-game scope are explicit; nonexistent game is never invented',()=>{
  assert.equal(chooseGameQa({games,gameId:'untested'}).length,1);
  assert.equal(chooseGameQa({games,all:true}).length,3);
  assert.throws(()=>chooseGameQa({games,gameId:'missing'}),/GAME_NOT_FOUND/);
  assert.deepEqual(chooseGameQa({games,changedFiles:['game-catalog.json']}),[]);
});
test('missing game QA is reported missing, not passed',()=>{
  const selected=chooseGameQa({games,gameId:'untested'});
  const report=runGameQa({selected});
  assert.equal(report.pass,true);
  assert.equal(report.gameQaMissingCount,1);
  assert.equal(report.gameQaPassedCount,0);
  assert.equal(report.results[0].state,'NO_GAME_SCOPED_QA');
});
test('real subprocess QA failures remain game-scoped and keep exact evidence',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'game-qa-runner-'));
  try{
    const qa=path.join(root,'qa');
    fs.mkdirSync(qa,{recursive:true});
    fs.writeFileSync(path.join(qa,'alpha-pass.test.mjs'),"import test from 'node:test';test('passes',()=>{});\n");
    fs.writeFileSync(path.join(qa,'beta-fail.test.mjs'),"import test from 'node:test';test('fails',()=>{throw Error('real bug')});\n");
    const selected=[
      {gameId:'alpha',tests:['qa/alpha-pass.test.mjs']},
      {gameId:'beta',tests:['qa/beta-fail.test.mjs']},
      {gameId:'untested',tests:[]}
    ];
    const report=runGameQa({selected,repoRoot:root,execute:true});
    assert.equal(report.pass,false);
    assert.equal(report.gameQaPassedCount,1);
    assert.equal(report.gameQaFailedCount,1);
    assert.equal(report.gameQaMissingCount,1);
    assert.deepEqual(report.results.map(x=>x.state),
      ['GAME_QA_PASSED','GAME_QA_FAILED','NO_GAME_SCOPED_QA']);
    assert.match(report.results[1].outputTail,/real bug/);
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});
