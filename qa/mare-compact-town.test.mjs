// [빈 땅 줄이기] 2026-11-28 오너: 이스탄불 등 넓은 맨땅에 집이 띄엄띄엄
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scene = fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau', 'utf8');
test('지시서 항구는 실제 집·시설 범위 + 40 으로 땅을 줄이고 빈 길을 자른다', () => {
  assert.match(scene, /p:SetAttribute\("RoadStrip", true\)/);
  assert.match(scene, /if not isRoyalCity and #placedLots > 0 then/);
  assert.match(scene, /local compactLeft = math\.max\(townLeft, wantLeft\)/);
  assert.match(scene, /SetAttribute\("TownCompactRoadsTrimmed", trimmed\)/);
});
