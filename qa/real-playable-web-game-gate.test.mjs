import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContractSafePlayable,validateBootstrapHtml} from '../tools/company-development-web-bootstrap.mjs';

const baseline={
  gameSeedId:'SEED-ROBLOX-SURVIVAL_HORROR_ESCAPE-001',
  content:{
    identity:'Lantern Run Survival',
    coreFun:'Explore dangerous rooms, avoid threats, fight when necessary, collect resources, and reach the escape objective.',
    coreLoop:[
      'Explore and reposition through dangerous rooms.',
      'Fight enemies and survive incoming pressure.',
      'Collect rewards, upgrade, and reach the next escape objective.'
    ],
    systems:['combat','resource collection','progression','escape objective'],
    mobileUx:'touch controls'
  }
};

test('DEVELOPMENT Web compiler creates a real playable game, not the old validation harness',()=>{
  const result=buildContractSafePlayable({gameId:'real-playable-gate',gameName:'Lantern Run Survival',baseline});
  const review=validateBootstrapHtml(result.html,{scopeInventory:result.approvedScopeInventory});
  assert.equal(review.pass,true,review.blockers.join(','));
  assert.equal(result.artifactType,'REAL_PLAYABLE_GAME');
  assert.match(result.html,/data-web-artifact-type="REAL_PLAYABLE_GAME"/);
  assert.match(result.html,/<canvas\b/);
  assert.match(result.html,/(VICTORY|목표 달성)/);
  assert.match(result.html,/(DEFEAT|게임 오버)/);
  assert.match(result.html,/enemyTurn\(\)/);
  assert.match(result.html,/finishCheck\(\)/);
  assert.doesNotMatch(result.html,/FULL APPROVED WEB COMPANION/);
  assert.doesNotMatch(result.html,/<h2[^>]*>\s*30분 플레이 구조\s*<\/h2>/);
  assert.doesNotMatch(result.html,/<h2[^>]*>\s*승인 분량 전체 구현\s*<\/h2>/);
});

test('old companion/test harness cannot satisfy the real playable game contract',()=>{
  const fake='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body data-audio-state="locked" data-approved-scope-count="1"><h2>30분 플레이 구조</h2><h2>승인 분량 전체 구현</h2><button data-scope-id="scope-x">점수 올리기</button><button data-audio-control="mute">mute</button><input data-audio-control="volume"><script>const AudioContext=window.AudioContext;let score=0;document.querySelector("button").addEventListener("click",()=>score++);</script></body></html>';
  const review=validateBootstrapHtml(fake,{scopeInventory:[{id:'scope-x'}]});
  assert.equal(review.pass,false);
  assert.ok(review.blockers.includes('REAL_PLAYABLE_WEB_GAME_REQUIRED'));
  assert.ok(review.blockers.includes('REAL_GAMEPLAY_SURFACE_REQUIRED'));
  assert.ok(review.blockers.includes('WEB_TEST_HARNESS_FORBIDDEN'));
});
