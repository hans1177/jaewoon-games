// [같은 소품 개수 제한] 2026-11-29 오너: "소품도 같은 종류 오브젝트 개수 제한"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scene = fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau', 'utf8');
test('같은 원본 소품은 6개(자연물 14개)까지, 광장에서 먼 것부터 뺀다', () => {
  assert.match(scene, /m:SetAttribute\("ImportedAsset", tostring\(kind\) \.\. "\/" \.\. tostring\(asset\)\)/);
  assert.match(scene, /local CAP_PROP, CAP_NATURE = 6, 14/);
  assert.match(scene, /folder:SetAttribute\("PropCapHidden", capped\)/);
  assert.ok(scene.indexOf('PropCapHidden", capped') < scene.indexOf('local routeOk, routeError'), '주민 검사 전에 정리');
});
