// [전투 버튼 효과 크게·해양 퀘스트 표시] 2026-11-28
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sh = 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared';
const fx = fs.readFileSync(`${sh}/BattleButtonFx.luau`, 'utf8');
const field = fs.readFileSync(`${sh}/FieldScene.luau`, 'utf8');
const naval = fs.readFileSync(`${sh}/NavalBattle.luau`, 'utf8');
const voyage = fs.readFileSync(`${sh}/VoyageScene.luau`, 'utf8');
const sea = fs.readFileSync(`${sh}/SeaAreas.luau`, 'utf8');
test('버튼 효과 모듈: 누름·준비, 해상·지상 연결', () => {
  for (const f of ['press', 'ready', 'attach']) assert.match(fx, new RegExp(`function Fx\\.${f}\\(`));
  assert.match(fx, /ring\(o, size \* 0\.95, accent, 6, 1\.8/);
  assert.match(field, /ButtonFx\.attach\(b\)/);
  assert.match(field, /ButtonFx\.ready\(sb\.btn/);
  assert.match(naval, /ButtonFx\.attach\(b\)/);
  assert.match(naval, /ButtonFx\.ready\(b\)/);
});
test('항해: 목적지 빛기둥·가장자리 화살표·다음 할 일·해역 자막', () => {
  assert.match(voyage, /beacon\.Name = "VoyageDestinationBeacon"/);
  assert.match(voyage, /edgeArrow\.Name = "VoyageDestinationArrow"/);
  assert.match(voyage, /ns\.Name = "VoyageNextStep"/);
  assert.match(voyage, /cap\.Name = "VoyageSeaCaption"/);
  assert.equal((sea.match(/^\t[a-z_]+ = \{ "/gm) || []).length, 27);
});
