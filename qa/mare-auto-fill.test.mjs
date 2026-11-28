// [자동 채우기·자동 수정] 보정표·문화권 대체·겹침 피하기·지역색·현황판 도구가 연결돼 있다 (2026-11-28).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia';
const sh = `${root}/src/ReplicatedStorage/Shared`;
const ov = fs.readFileSync(`${sh}/PlacementOverrides.luau`, 'utf8');
const port = fs.readFileSync(`${sh}/PortScene.luau`, 'utf8');
const field = fs.readFileSync(`${sh}/FieldScene.luau`, 'utf8');
test('보정표: AUTO 구역·제외·폰 숨김·겹침·지역색', () => {
  assert.match(ov, /-- AUTO:BEGIN[\s\S]*-- AUTO:END/);
  for (const f of ['get', 'apply', 'avoidOverlap', 'regionTint']) assert.match(ov, new RegExp(`function PlacementOverrides\\.${f}\\(`));
});
test('항구·지상 배치가 보정표를 따른다', () => {
  assert.match(port, /ov\.disabled or \(ov\.mobileHide and/);
  assert.match(field, /ov\.disabled or \(ov\.mobileHide and/);
  assert.match(field, /PlacementOverridesMod\.apply\(m, ov\)/);
});
test('문화권 공통 대체: 대표 경관은 제외', () => {
  const fn = port.split('function PortScene.cultureSlot')[1].split('\nend')[0];
  assert.match(fn, /"landmark"/);
  assert.match(fn, /tostring\(currentKey\) \.\. "_" \.\. slot/);
  for (const s of ['_bld_well', '_street_lamp', '_bld_market_stalls', '_plaza_center', '_workshop_', '_stall_']) {
    assert.match(port, new RegExp(`cultureSlot\\(info\\.portId \\.\\. "${s}`), s);
  }
});
test('도구·점검 스크립트', () => {
  assert.ok(fs.existsSync('tools/devloop/auto_placement_status.py'));
  assert.ok(fs.existsSync('tools/devloop/placement_autofix.py'));
  const steps = JSON.parse(fs.readFileSync(`${root}/tools/devloop/studio-scripts/asset-autocheck.json`, 'utf8'));
  assert.ok(steps.filter(s => s.type === 'luau' && s.ctx === 'Server').length >= 10);
});
