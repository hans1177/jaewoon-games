// [발전도별 종합 필지] 2026-11-29 오너: "항구별 발전도에 따라 종합 필지가 정해져야"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sh = 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared';
const b = fs.readFileSync(`${sh}/PortBuildings.luau`, 'utf8');
const scene = fs.readFileSync(`${sh}/PortScene.luau`, 'utf8');
test('단계별 땅 크기·주택 줄 시작점 표가 있고 장면이 쓴다', () => {
  assert.match(b, /B\.CityPlan = \{/);
  for (const lv of [1, 2, 3, 4, 5]) assert.match(b, new RegExp(`\\[${lv}\\] = \\{ landW = \\d+, landD = \\d+, rowStart = -\\d+ \\}`));
  assert.match(scene, /local cityRowStart = if isRoyalCity then -260 else PortBuildings\.cityPlan\(lvl\)\.rowStart/);
  assert.ok(!scene.includes('-260 + rowShift'), '모든 단계 -260 고정 제거');
  assert.match(scene, /local planLeft, planHalfZ = townRight - plan\.landW, plan\.landD \/ 2/);
});
