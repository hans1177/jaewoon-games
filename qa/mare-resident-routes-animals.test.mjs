// [주민 동선·가축] 2026-11-29 오너: "주민 모션 직업별 동선 다양하게, 가축 장난감 같아, 고양이 이상해"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scene = fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau', 'utf8');
test('막힌 하루 동선은 두 곳 왕복으로 줄이고, 서 있어도 직업 동작', () => {
  assert.match(scene, /local shortPlans = \{ \{ morning, market \}, \{ home, morning \}, \{ market, evening \} \}/);
  assert.match(scene, /SetAttribute\("NpcRouteShortened", shortened\)/);
  assert.match(scene, /walker\.mode, walker\.kind = "stay", \(roster and roster\[1\]\) or walker\.socialKind or "look"/);
});
test('고양이 임시 제외, <종>_v2 원본 자동 교체, 지시서', () => {
  assert.match(scene, /if sp ~= "cat" or AssetIds\["Animals\/cat_v2"\] then/);
  assert.match(scene, /if AssetIds\["Animals\/" \.\. species \.\. "_v2"\] then asset = species \.\. "_v2" end/);
  assert.ok(fs.readFileSync('roblox-games/mare-essentia/docs/discoveries/ANIMAL_RIG_MOTION.md', 'utf8').includes('cat_v2.glb'));
});
