// [항구 겹침·주민 끼임] 2026-11-28 오너: "마을 주민들 동선 끼이고 오브젝트 겹치고 항구마다 개판"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sh = 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared';
const scene = fs.readFileSync(`${sh}/PortScene.luau`, 'utf8');
const ov = fs.readFileSync(`${sh}/PlacementOverrides.luau`, 'utf8');
test('겹침 검사는 마을이 workspace 에 붙은 뒤에 한다', () => {
  assert.match(ov, /if not m:IsDescendantOf\(workspace\) then\n\t\ttable\.insert\(PlacementOverrides\.pending, m\)/);
  assert.match(ov, /function PlacementOverrides\.flush\(\)/);
  const parented = scene.indexOf('folder.Parent = workspace');
  const flush = scene.indexOf('Overrides.flush()');
  assert.ok(parented > 0 && flush > parented, 'flush 는 연결 뒤');
});
test('건물에 박힌 소품 옮기기·숨기기', () => {
  for (const k of ['PropOverlapChecked', 'PropOverlapMoved', 'PropOverlapHidden', 'PropOverlapAudit']) assert.ok(scene.includes(`"${k}"`), k);
  assert.ok(scene.indexOf('PropOverlapAudit') < scene.indexOf('local routeOk, routeError'), '주민 검사 전에 소품 정리');
});
test('주민: 충돌 없는 장식도 막힘, 서 있는 주민끼리 간격', () => {
  assert.match(scene, /local visualSolid = not hit\.CanCollide and not flatName/);
  assert.match(scene, /\(moving or not crowded\(candidate\.Position\)\)/);
  assert.ok(fs.existsSync('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-port-overlap.json'));
});
