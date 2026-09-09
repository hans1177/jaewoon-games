import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveGameplayScenario, summarizeBrowserSignals } from '../tools/autonomous-candidate-browser-qa.mjs';

const scenarios=JSON.parse(fs.readFileSync('autonomous-gameplay-scenarios.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const allowedActions=new Set(['move','primary','board','reload','hold-check']);

test('11개 공개 카탈로그 게임 모두 시나리오 프로필이 있다',()=>{
  const expected=new Set(catalog.games.map(game=>game.id));
  const actual=new Set(scenarios.games.map(game=>game.id));
  assert.equal(actual.size,11);
  assert.deepEqual([...actual].sort(),[...expected].sort());
});

test('플레이 가능 게임은 짧은 핵심 시나리오를 갖고 HOLD 게임은 명시적으로 제외된다',()=>{
  for(const game of scenarios.games){
    assert.ok(game.scenario?.id,game.id);
    assert.ok(game.scenario?.intent,game.id);
    assert.ok(Array.isArray(game.scenario?.steps)&&game.scenario.steps.length>=1,game.id);
    for(const step of game.scenario.steps)assert.ok(allowedActions.has(step.action),`${game.id}:${step.action}`);
    if(game.expectedPlayable===true)assert.ok(game.scenario.steps.length>=3,game.id);
  }
  const hold=scenarios.games.filter(game=>game.expectedPlayable===false).map(game=>game.id);
  assert.deepEqual(hold,['egg-heist']);
});

test('후보 경로에서는 P 프로젝트 alias로 실제 게임 시나리오를 찾는다',()=>{
  assert.equal(resolveGameplayScenario({sourcePath:'web-games/.autonomous-candidates/P0001/x',gameId:'P0001',catalog:scenarios})?.id,'survival');
  assert.equal(resolveGameplayScenario({sourcePath:'web-games/.autonomous-candidates/P0002/x',gameId:'P0002',catalog:scenarios})?.id,'insect-survival');
  assert.equal(resolveGameplayScenario({sourcePath:'web-games/chess-battle',catalog:scenarios})?.id,'chess-battle');
});

test('플레이 가능 게임의 시나리오 실패는 browser QA 실패 신호가 된다',()=>{
  const result=summarizeBrowserSignals({
    metrics:{bodyVisible:true,width:390},reloadMetrics:{bodyVisible:true,width:390},
    gameplayScenario:{configured:true,expectedPlayable:true,pass:false,scenarioId:'core',failedStep:'attack'},
  });
  assert.equal(result.pass,false);
  assert.ok(result.errors.includes('scenario:core:attack'));
});

test('HOLD 게임의 비플레이 상태는 플레이 실패로 오인하지 않는다',()=>{
  const result=summarizeBrowserSignals({
    metrics:{bodyVisible:true,width:390},reloadMetrics:{bodyVisible:true,width:390},
    gameplayScenario:{configured:true,expectedPlayable:false,pass:true,status:'HOLD_NOT_PLAYABLE'},
  });
  assert.equal(result.pass,true);
});
