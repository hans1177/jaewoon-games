// [청동 아이콘 통일] 2026-11-28 오너: "메뉴창 시각화 아이콘 통일화 한 거 맞어?"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const game = fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau', 'utf8');
test('메뉴 앞 이모지 → 청동 아이콘, 없으면 지움', () => {
  assert.match(game, /function H\.bronzeEmoji\(root\)/);
  assert.match(game, /H\.bronzeEmoji\(mainInner\)/);
  assert.ok(game.includes('cell(1, "지금 할 일"') && game.includes('cell(3, "보상 받기"'));
  assert.ok(!game.includes('cell(3, "🎁 보상 받기"'));
});
