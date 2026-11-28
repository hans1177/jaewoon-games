// [긴 설명 접기] 2026-11-28 오너: "메뉴창 등 긴 설명 표시 다 → 직관적 시각적 표현으로"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const game = fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau', 'utf8');
test('긴 설명 → 한 줄 + ⓘ, 누르면 항목별 말풍선', () => {
  for (const f of ['shortText', 'showFullText', 'compactLongText']) assert.match(game, new RegExp(`function H\\.${f}\\(`), f);
  assert.match(game, /ulen\(d\.Text\) > 64 and not isList\(d\.Text\) and not skipped\(d\)/);
  assert.ok(game.includes('"FullTextPopup"'));
});
test('그린 뒤 본문·시설 상세에 적용, 도감·대화·이야기 제외', () => {
  assert.match(game, /local n = H\.compactLongText\(content\)/);
  assert.match(game, /currentTab == "codex" or currentTab == "encyclopedia" then return 0/);
  for (const k of ['"Dex"', '"Story"', '"Talk"', '"Dialogue"']) assert.ok(game.includes(k), k);
});
