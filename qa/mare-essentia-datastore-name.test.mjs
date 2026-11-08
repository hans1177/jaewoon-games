import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 게임 이름 변경(Mare Scientia -> Mare Essentia) 때 DataStore 이름까지 바뀌어 모든 플레이어 저장이 초기화된 사고를 막는다.
// 이름을 바꿔야 한다면 기존 저장 이전(마이그레이션)을 먼저 구현하고 이 테스트를 의도적으로 갱신해야 한다.
const core=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Core.server.luau','utf8');

test('Mare Essentia 저장소 이름은 개명 전 이름(MareScientia_v2)을 유지한다', () => {
  const m=core.match(/^local STORE_NAME = "([^"]+)"/m);
  assert.ok(m,'STORE_NAME 선언을 찾지 못함');
  assert.equal(m[1],'MareScientia_v2');
});

test('플레이어 저장 키는 UserId 기반 P_ 접두를 유지한다', () => {
  assert.match(core,/return "P_" \.\. player\.UserId/);
});
