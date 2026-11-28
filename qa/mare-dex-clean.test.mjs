// [깔끔한 도감] 2026-11-28 오너: "답답·복잡, 원화 살려서 깔끔하게, 카드 원화 중심 백과사전 보듯이"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const game = fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau', 'utf8');
test('원화 격자 + 큰 원화 + 자세히 접기', () => {
  assert.match(game, /function H\.renderDex\(found, current, article, category, cx, onPick\)/);
  for (const n of ['DexGrid', 'DexThumb', 'DexPage', 'DexHero']) assert.ok(game.includes(`"${n}"`), n);
  assert.match(game, /H\.dexExpanded = not H\.dexExpanded/);
  assert.match(game, /if H\.dexClean ~= false then[\s\S]*?H\.renderDex\(found, current, article, category, cx/);
});
test('도감 탭은 위 원화 배너를 겹치지 않음', () => {
  assert.match(game, /and not newGameMode and not dexTab/);
});
test('책갈피·검색 유지', () => {
  assert.ok(game.includes('call("SetEncyclopediaBookmark", { id = current.id })'));
  assert.ok(game.includes('"EncyclopediaSearch"'));
});
