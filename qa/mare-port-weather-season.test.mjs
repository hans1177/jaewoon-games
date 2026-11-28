// [날씨·계절 땅 표현] 2026-11-29 오너: "비·눈 땅에 표현, 날씨 계절 표현 다양하게 제대로"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scene = fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau', 'utf8');
const game = fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau', 'utf8');
test('항구 장면에 날씨가 전달된다(예전엔 없음)', () => {
  assert.match(game, /weather = \(function\(\)\n\t\t\tlocal okW, w = pcall\(function\(\) return require\(Shared:WaitForChild\("Voyage"\)\)\.weather/);
});
test('계절·날씨별 땅·길·지붕·나무 표현과 내리는 비·눈·계절 입자', () => {
  for (const look of ['"snow"', '"wet"', '"autumn"', '"spring"', '"dry_summer"', '"monsoon_green"', '"dry_bright"']) assert.ok(scene.includes(look), look);
  for (const n of ['"PortSnowfall"', '"PortRainfall"', '"PortSeasonDrift"', '"PortGroundLook"', '"PortWeatherAudit"']) assert.ok(scene.includes(n), n);
  assert.ok(!scene.includes('PortCultures.REGION'), '정의 안 된 전역 금지');
  assert.match(scene, /source\.CFrame = CFrame\.new\(cam\.CFrame\.Position \+ Vector3\.new\(0, 26, 0\)\)/);
});
