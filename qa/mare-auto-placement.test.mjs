// [자동 배치] 해역표는 해전 표와 같고, 항해 장면이 voyage_/sea_ 슬롯을 찾으며, 필요 자산 목록이 있다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia';
const sea = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/SeaAreas.luau`, 'utf8');
const naval = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/NavalBattle.luau`, 'utf8');
const voyage = fs.readFileSync(`${root}/src/ReplicatedStorage/Shared/VoyageScene.luau`, 'utf8');
const client = fs.readFileSync(`${root}/src/StarterPlayer/Game.client.luau`, 'utf8');
const rows = s => Object.fromEntries([...s.matchAll(/^\s*([a-z_]+) = "([a-z_ ]+)",?$/gm)].map(m => [m[1], m[2]]));
test('해역표 = 해전 briefPorts', () => {
  const navalBlock = naval.split('local briefPorts = {')[1].split('\n\t\t\t}')[0];
  assert.deepEqual(rows(sea.split('SeaAreas.PORTS = {')[1].split('\n}')[0]), rows(navalBlock));
});
test('항해 해역 배경 슬롯', () => {
  assert.match(voyage, /"voyage_" \.\. sea \.\. "_" \.\. band\[1\]/);
  assert.match(voyage, /name = "sea_" \.\. sea \.\. "_" \.\. band\[1\]/, '없으면 해전 배경 재사용');
  assert.match(voyage, /rec\.always, rec\.loop = true/);
  assert.match(client, /fromId = fromId, toId = portId/);
});
test('필요 자산 목록', () => {
  const md = fs.readFileSync(`${root}/docs/AUTO_PLACEMENT.md`, 'utf8');
  const csv = fs.readFileSync(`${root}/docs/auto_placement_needed.csv`, 'utf8');
  assert.match(md, /이름 규칙\(슬롯\)/);
  assert.ok(csv.split('\n').length > 4000);
  assert.match(csv, /Naval\/sea_north_sea_far\.glb/);
  assert.match(csv, /Town\/london_landmark_full\.glb/);
});
