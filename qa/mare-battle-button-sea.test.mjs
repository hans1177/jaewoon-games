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
test('지상 전투: 연속 공격·스킬은 숙련(경험치)으로 해방, 스킬은 확률 자동 발동', () => {
  assert.match(field, /local maxBeat = \(\{ 2, 3, 5, 7, 10 \}\)\[math\.clamp\(pl\.masteryRank or 1, 1, 5\)\]/);
  assert.match(field, /local chanceNow = if rankNow >= 5 then 0\.17 elseif rankNow == 4 then 0\.14 elseif rankNow == 3 then 0\.11 elseif rankNow == 2 then 0\.08 else 0/);
  assert.match(field, /pl\.autoSkillKind = if rankNow >= 4 and near >= 2/);
  assert.doesNotMatch(field, /if pl\.autoNormalHits % 5 == 0 then/);
});


test('전투 효과는 등록 원화만 사용하고 미등록 시 기존 도형 유지', () => {
  assert.ok(fx.includes('AssetIds["CardArt/fx_button_ring"]'));
  assert.ok(fx.includes('AssetIds["CardArt/fx_button_spark"]'));
  assert.equal(fx.split('Instance.new(if art then "ImageLabel" else "Frame")').length - 1, 2);
  assert.ok(fx.includes('ImageTransparency = 1'));
  assert.ok(fx.includes('Instance.new("UIStroke")'));
  assert.ok(fx.includes('BackgroundTransparency = 1'));
  assert.ok(fx.includes('if not GuiService.ReducedMotionEnabled then'));
  assert.ok(fx.includes('task.delay(0.5, function() o:Destroy() end)'));
});
