import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// DataStore 이름이 개명·유니버스 변경 중에 조용히 바뀌어 플레이어 저장이 초기화되는 사고를 막는다.
// (2026-11-08: 새 유니버스에서 MareEssentia_v2로 저장이 시작됨.) 바꿔야 한다면 기존 저장 이전(마이그레이션)을 먼저 구현하고 이 테스트를 의도적으로 갱신한다.
const core=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Core.server.luau','utf8');

test('Mare Essentia 저장소 이름은 MareEssentia_v2로 고정된다', () => {
  const m=core.match(/^local STORE_NAME = "([^"]+)"/m);
  assert.ok(m,'STORE_NAME 선언을 찾지 못함');
  assert.equal(m[1],'MareEssentia_v2');
});

test('플레이어 저장 키는 UserId 기반 P_ 접두를 유지한다', () => {
  assert.match(core,/return "P_" \.\. player\.UserId/);
});


// [탐험 숙련 회귀] 기존 DataStore 확장·서버 정산·3~5단 순수 시각 연출을 점검한다.
const read=(p)=>fs.readFileSync('roblox-games/mare-essentia/src/'+p,'utf8');
const state=read('ServerScriptService/Services/State.luau');
const discovery=read('ServerScriptService/Services/Discovery.luau');
const view=read('ServerScriptService/Services/View.luau');
const field=read('ReplicatedStorage/Shared/FieldScene.luau');
const client=read('StarterPlayer/Game.client.luau');

test('무기별 숙련은 기존 저장소에 호환 추가되고 구버전 저장을 읽는다',()=>{
  assert.match(state,/weaponPractice = \{\}/);
  assert.match(state,/type\(saved\.weaponPractice\) == "table"/);
  assert.match(state,/D\.Weapons\.get\(id\)\.id == id/);
  assert.match(state,/weaponPractice = state\.weaponPractice/);
  assert.match(view,/view\.weaponPractice = table\.clone/);
});

test('탐험 숙련은 서버 유효 무기·시간 상한·중복 재전송 검사 후 정산한다',()=>{
  assert.match(discovery,/handlers\.FieldPracticeBegin/);
  assert.match(discovery,/handlers\.FieldPracticeCommit/);
  assert.match(discovery,/fieldRuns\[state\] = nil/);
  assert.match(discovery,/math\.min\(120,/);
  assert.match(client,/call\("FieldPracticeBegin"/);
  assert.match(client,/call\("FieldPracticeCommit"/);
  assert.match(field,/pcall\(opts\.onFinish, result, observedCardId, earnedPractice\)/);
  assert.match(field,/local rank = practiceRank\(practice\.xp\)/);
});

test('3·4·5단은 차등 시각 연출이며 추가 타격 판정과 보상이 없다',()=>{
  assert.match(field,/if stage >= 3 then masteryCinema\(hrp, stage, defeatedAt\) end/);
  assert.match(field,/if stage == 3 then 0\.18 elseif stage == 4 then 0\.21/);
  assert.match(field,/if stage >= 4 then slowMotionUntil/);
  assert.match(field,/if stage >= 4 and not visualMobile then/);
  assert.match(field,/-- 추가 공격 판정·대미지·드롭·쿨타임은 발생시키지 않는다/);
  assert.match(client,/call\("Explore", \{ siteId = s\.id, observedCardId = observedCardId \}\)/);
  assert.doesNotMatch(discovery,/state\.coins\s*\+=\s*earned/);
});
