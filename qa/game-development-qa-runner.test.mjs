// 파일명: qa/game-development-qa-runner.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chooseGameQa,runGameQa,testRelevantToRobloxChange} from '../tools/game-development-qa-runner.mjs';

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
test('Roblox-only source changes exclude only explicit web or Unity tests and preserve every native or mixed test',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-platform-qa-scope-'));
  try{
    const specs={
      'web.test.mjs':"const file='web-games/alpha/client.js';",
      'unity.test.mjs':"const file='unity-games/alpha/Assets/World.cs';",
      'native.test.mjs':"const file='roblox-games/alpha/server/Game.server.luau';",
      'mixed.test.mjs':"const x='roblox-games/alpha/client/Game.client.luau';const y='web-games/alpha/client.js';",
      'shared.test.mjs':"test('preserve shared save and security contract',()=>{})"
    };
    fs.mkdirSync(path.join(root,'qa'),{recursive:true});
    for(const [name,body] of Object.entries(specs))fs.writeFileSync(path.join(root,'qa',name),body);
    const g={gameId:'alpha',sources:{ROBLOX:'roblox-games/alpha',WEB:'web-games/alpha',UNITY:'unity-games/alpha'},qa:Object.keys(specs).map(name=>'qa/'+name)};
    const native=chooseGameQa({games:[g],changedFiles:['roblox-games/alpha/shared/GameConfig.luau'],repoRoot:root});
    assert.equal(native.length,1);
    assert.equal(native[0].nativeOnlyQaScope,true);
    assert.deepEqual(native[0].excludedOtherPlatformTests,['qa/unity.test.mjs','qa/web.test.mjs']);
    assert.deepEqual(native[0].tests,['qa/mixed.test.mjs','qa/native.test.mjs','qa/shared.test.mjs']);
    assert.equal(testRelevantToRobloxChange({gameId:'alpha',testPath:'qa/native.test.mjs',repoRoot:root}),true);
    assert.equal(testRelevantToRobloxChange({gameId:'alpha',testPath:'qa/missing.test.mjs',repoRoot:root}),true,'missing QA must fail in the actual test runner, never vanish');
    const mixed=chooseGameQa({games:[g],changedFiles:['web-games/alpha/main.js','roblox-games/alpha/server/Game.server.luau'],repoRoot:root});
    assert.equal(mixed[0].nativeOnlyQaScope,false);
    assert.equal(mixed[0].tests.length,5);
    assert.equal(chooseGameQa({games:[g],gameId:'alpha',repoRoot:root})[0].tests.length,5);
    assert.equal(chooseGameQa({games:[g],all:true,repoRoot:root})[0].tests.length,5);
    assert.deepEqual(chooseGameQa({games:[g],changedFiles:['web-games/alpha/main.js'],repoRoot:root})[0].tests.sort(),g.qa.sort());
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('missing game QA is reported missing, not passed',()=>{
  const selected=chooseGameQa({games,gameId:'untested'});
  const report=runGameQa({selected});
  assert.equal(report.pass,true);
  assert.equal(report.mergeReady,false,'missing QA must never count as merge evidence');
  assert.deepEqual(report.failureGroups,[{signature:'NO_GAME_SCOPED_QA',count:1,gameIds:['untested']}]);
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
    // 상위 테스트 환경이 중첩되어도 실제 게임 QA를 실행해야 한다.
    const originalContext=process.env.NODE_TEST_CONTEXT;
    process.env.NODE_TEST_CONTEXT='child-v8';
    let report;
    try{report=runGameQa({selected,repoRoot:root,execute:true});}
    finally{if(originalContext===undefined)delete process.env.NODE_TEST_CONTEXT;else process.env.NODE_TEST_CONTEXT=originalContext;}
    assert.equal(report.pass,false);
    assert.equal(report.mergeReady,false);
    assert.deepEqual(report.failureGroups.map(group=>[group.signature,group.count]),[
      ['NO_GAME_SCOPED_QA',1],['QA_ASSERTION_FAILURE',1]
    ]);
    assert.equal(report.gameQaPassedCount,1);
    assert.equal(report.gameQaFailedCount,1);
    assert.ok(report.results[0].outputTail.includes('# fail 0'));
    assert.ok(report.results[1].outputTail.includes('# fail 1'));
    assert.equal(report.results[1].exitCode===0&&report.results[1].state==='GAME_QA_PASSED',false);
    assert.equal(report.gameQaMissingCount,1);
    assert.deepEqual(report.results.map(x=>x.state),
      ['GAME_QA_PASSED','GAME_QA_FAILED','NO_GAME_SCOPED_QA']);
    assert.match(report.results[1].outputTail,/real bug/);
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('merge readiness requires actual executed QA and never trusts pending or empty selection',()=>{
  assert.equal(runGameQa({selected:[]}).mergeReady,false);
  const pending=runGameQa({selected:[{gameId:'pending',tests:['qa/not-yet-executed.test.mjs']}]});
  assert.equal(pending.pass,true,'legacy discovery behavior is unchanged');
  assert.equal(pending.mergeReady,false);
  assert.deepEqual(pending.failureGroups,[{signature:'PENDING_EXECUTION',count:1,gameIds:['pending']}]);
});

test('PR game scope uses the true head commit, not synthetic merge containing other games',()=>{
  const workflow=fs.readFileSync('.github/workflows/game-development-sync.yml','utf8');
  assert.ok(workflow.includes('PR_HEAD: ${{ github.event.pull_request.head.sha }}'));
  assert.ok(workflow.includes('head="$PR_HEAD"'));
  assert.ok(workflow.includes('git diff --name-only "$base" "$head"'));
  assert.ok(workflow.includes('GAME_QA_PR_HEAD_REQUIRED'));
  assert.ok(workflow.includes("GH_TOKEN: ${{ github.token }}"));
  assert.ok(workflow.includes("compare/$base...$head"));
  assert.ok(workflow.includes("merge_base_commit.sha"));
  assert.ok(workflow.includes('base="$common_base"'),'base must use PR common ancestor not moving main tip');
  assert.ok(workflow.includes('GAME_QA_PR_MERGE_BASE_UNKNOWN'),'no silent QA skip on unavailable merge base');
  assert.ok(workflow.indexOf('base="$common_base"')<workflow.indexOf('git diff --name-only "$base" "$head"'));
  assert.ok(!workflow.includes('git diff --name-only "$base" HEAD > /tmp/changed-game-files.txt'));
});
