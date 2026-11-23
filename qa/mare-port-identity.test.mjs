import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/mare-essentia/';
const id = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/PortIdentity.luau', 'utf8');
const ports = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/Ports.luau', 'utf8');
const scene = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/PortScene.luau', 'utf8');
const doc = fs.readFileSync(root + 'docs/PORT_VILLAGE_PROMPTS.md', 'utf8');

test('시작 항구 15곳 모두 정체성 표와 5단계 길 재질을 가진다', () => {
  const starts = [...ports.matchAll(/startPort = "([a-z_]+)"/g)].map((m) => m[1]);
  assert.ok(starts.length >= 15);
  for (const p of starts) {
    const m = id.match(new RegExp(`\\n\\t${p} = \\{([\\s\\S]*?)signature = \\{`));
    assert.ok(m, `${p} 정체성 누락`);
    const street = m[1].match(/street = \{([^}]*)\}/);
    assert.equal(street[1].split(',').length, 5, `${p} 길 재질 5단계`);
  }
});

test('마을이 정체성 표로 길·땅 재질을 정한다', () => {
  assert.match(scene, /local PortIdentity = require\(script\.Parent:WaitForChild\("PortIdentity"\)\)/);
  assert.match(scene, /PortIdentity\.streetAt\(scenePortId, sceneLevel\)/);
  assert.match(scene, /plate\.Material = if identityGround then identityGround\[1\]/);
});

test('항구 프롬프트 문서에 공통·발전도·자원·항구별 절이 있다', () => {
  for (const h of ['## 1. 공통 프롬프트', '## 2. 발전도별 마을', '## 3. 자원별 농촌', '## 4. 항구별 프롬프트']) assert.ok(doc.includes(h), h);
  for (const name of ['런던', '암스테르담', '이스탄불', '나가사키', '부산', '리스본']) assert.ok(doc.includes(`### ${name}`), name);
});

test('항구별 길 원본과 골목 정렬은 기존 마을 렌더러에 연결된다', () => {
  const assets = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/AssetIds.luau', 'utf8');
  const known = [
    'Town/kenney_plate_pavement_01', 'Town/cobblestones',
    'Naval/platform-planks', 'Terrain/ground-pathrocks', 'Terrain/ground-pathstraight',
  ];
  for (const a of known) assert.ok(assets.includes('["' + a + '"]'), a + ' 등록 확인');
  for (const layout of ['organic', 'canal', 'terrace', 'grid']) {
    assert.ok(id.includes('layout = "' + layout + '"'), layout + ' 항구 정체성');
    assert.ok(scene.includes('villageLayout == "' + layout + '"'), layout + ' 마을 배치');
  }
  assert.match(scene, /local villageLayout = identity and identity\.layout or nil/);
  assert.match(scene, /local streetName = PortIdentity\.streetAt\(info\.portId, lvl\)/);
  assert.match(scene, /if pathKind and pathAsset and AssetIds\[pathKind \.\. "\/" \.\. pathAsset\] then/);
  assert.match(scene, /CityPortVillageLayout/);
  assert.match(scene, /CityPortVillageStreet/);
  assert.match(scene, /local patchLimit = if streetTouch then 4 else 8/);
});

test('항구별 3D 원본이 없을 때 기존 승인 자산과 주택 생성 흐름을 유지한다', () => {
  assert.match(scene, /originalHouse and AssetIds\["Town\/" \.\. originalHouse\]/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
  assert.match(scene, /local list = SIG\[info\.portId\]/);
  assert.match(scene, /local P = PROFILE\[key\] or PROFILE\.north/);
  assert.match(scene, /PortOriginalHouse/);
  assert.match(scene, /PortOriginalLandmark/);
});
