// [항구 개판 수정] 2026-11-29 오너: "오브젝트 겹침, 중앙 광장만 모여 있고, 주민들 각자 생활하라고 현실처럼"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scene = fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau', 'utf8');
test('집: 두 길 사이 남는 폭 안에서 밀어 넣고, 탈락 원인을 센다', () => {
  assert.match(scene, /if 2 \* measuredHalfZ <= farLimit - nearLimit then/);
  for (const k of ['CityHousingRejectRoad', 'CityHousingRejectStreet', 'CityHousingRejectReserved']) assert.ok(scene.includes(`"${k}"`), k);
});
test('작은 소품끼리 40% 넘게 겹치면 옮기거나 뺀다', () => {
  assert.match(scene, /ox \* oz > 0\.4 \* math\.min\(4 \* hx \* hz, 4 \* o\[3\] \* o\[4\]\)/);
  assert.ok(scene.includes('"PropStackHidden"'));
});
test('주민: 실제 집 앞·직업별 일터·주점·시장 원 위 각자 자리', () => {
  assert.match(scene, /spawnJobs\(folder, info, rng, lvl, walkers, key, houseSpots\)/);
  assert.match(scene, /table\.insert\(houseSpots, \{ pos = pos, side = side, laneZ = laneNear, laneW = laneWidth \}\)/);
  assert.match(scene, /local angle = \(i \* 2\.399\) % \(2 \* math\.pi\)/);
});
