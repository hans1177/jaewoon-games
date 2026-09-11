import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBootstrapHtml,buildContractSafePlayable,inferDevelopmentGenre} from '../tools/company-development-web-bootstrap.mjs';
import {evaluateGameplayEvidence} from '../tools/company-development-web-gameplay-validation.mjs';

const playable=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>Test</h1><p id="status">score 0</p><button id="act">Act</button><script>let score=0;document.querySelector('#act').addEventListener('click',()=>{score++;document.querySelector('#status').textContent='score '+score;});</script>${'x'.repeat(1600)}</body></html>`;

test('bootstrap contract accepts self-contained interactive stateful html',()=>{
  const result=validateBootstrapHtml(playable);
  assert.equal(result.pass,true,result.blockers.join(','));
});

test('bootstrap contract rejects external network and persistent storage',()=>{
  const bad=playable.replace('</script>',";localStorage.setItem('x','1');fetch('https://example.com/x');</script>");
  const result=validateBootstrapHtml(bad);
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP'));
  assert.ok(result.blockers.includes('NETWORK_API_FORBIDDEN'));
});

test('contract recovery infers the locked GAME_SEED genre instead of inventing a new class',()=>{
  const cases={
    ACTION_SURVIVAL_ROGUELITE:'SEED-ACTION_SURVIVAL_ROGUELITE-001',
    SINGLE_DEFENSE_STRATEGY:'SEED-SINGLE_DEFENSE_STRATEGY-001',
    PUZZLE:'SEED-PUZZLE-001',
    CASUAL:'SEED-CASUAL-001',
    IDLE_GROWTH_RPG:'SEED-IDLE_GROWTH_RPG-001',
    STORY_COMPLETE_RPG:'SEED-STORY_COMPLETE_RPG-001'
  };
  for(const [genre,gameSeedId] of Object.entries(cases)){
    assert.equal(inferDevelopmentGenre({baseline:{gameSeedId}}),genre);
  }
});

test('deterministic recovery creates strict-contract playable slices for all six seed categories',()=>{
  const cases=[
    ['ACTION_SURVIVAL_ROGUELITE','생존 전투'],
    ['SINGLE_DEFENSE_STRATEGY','방어 전략'],
    ['PUZZLE','퍼즐'],
    ['CASUAL','캐주얼'],
    ['IDLE_GROWTH_RPG','성장 RPG'],
    ['STORY_COMPLETE_RPG','스토리 RPG']
  ];
  const htmls=[];
  for(const [genre,label] of cases){
    const baseline={gameSeedId:`SEED-${genre}-001`,content:{identity:`${genre} Test`,coreFun:`${label} 핵심 재미`,coreLoop:[`${label} 핵심 루프를 실제 입력으로 검증한다.`]}};
    const recovered=buildContractSafePlayable({gameId:`seed-${genre.toLowerCase()}`,gameName:`${genre} Test`,baseline});
    const contract=validateBootstrapHtml(recovered.html);
    assert.equal(recovered.generationMode,'DETERMINISTIC_CONTRACT_RECOVERY');
    assert.equal(contract.pass,true,`${genre}: ${contract.blockers.join(',')}`);
    assert.match(recovered.html,new RegExp(label));
    assert.match(recovered.html,/data-state="ready"/);
    assert.match(recovered.html,/addEventListener\('click'/);
    assert.doesNotMatch(recovered.html,/\b(?:localStorage|sessionStorage)\b/);
    assert.doesNotMatch(recovered.html,/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
    htmls.push(recovered.html);
  }
  assert.equal(new Set(htmls).size,6,'each genre recovery must remain mechanically distinct');
});

test('gameplay evidence requires real interaction and observable state change',()=>{
  const before={text:'score 0',visibleButtons:1,canvases:[],dataState:[],scrollWidth:390,viewportWidth:390};
  const after={...before,text:'score 3'};
  const pass=evaluateGameplayEvidence({before,after,interactionCount:3,reloadVisible:true});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  const fail=evaluateGameplayEvidence({before,after:before,interactionCount:0,reloadVisible:true});
  assert.equal(fail.pass,false);
  assert.ok(fail.blockers.includes('NO_GAMEPLAY_INTERACTION_DELIVERED'));
  assert.ok(fail.blockers.includes('NO_OBSERVABLE_GAME_STATE_CHANGE'));
});
