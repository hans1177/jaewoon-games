// [종합 발전도 → 마을 단계] 2026-11-29 오너: "경제·건축·발전·연구 모두 연결돼 있지 않아? 항구마다"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const game = fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau', 'utf8');
const village = fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Services/Village.luau', 'utf8');
test('마을 장면 단계 = max(투자 레벨, 종합 발전도)', () => {
  assert.match(game, /local portLevel = math\.clamp\(math\.max\(investLevel, devLevel\), 1, 5\)/);
  assert.match(village, /local score = harborLv \* 5 \+ stages \* 3 \+ tech \* 2 \+ marks \* 4/);
});
