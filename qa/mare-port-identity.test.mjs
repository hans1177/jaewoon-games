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

test('항구마다 필지·물길·광장·거리·날씨를 직접 적용한다', () => {
  assert.match(scene, /PortIdentity\.tier\(lvl\)\.plots/);
  assert.match(scene, /homePlaced < portPlotLimit and rowPlaced < rowPlotLimit/);
  assert.match(scene, /waterLane = if identity then villageLayout == "canal"/);
  assert.match(scene, /CityPortPlazaType/);
  assert.match(scene, /CityPortPlazaCenter/);
  assert.match(scene, /CityPortPlazaAsset/);
  assert.match(scene, /local laneRow = math\.min\(pairsN, i - 1\)/);
  assert.match(scene, /identity\.weatherGround == "monsoon_mud"/);
  assert.match(scene, /CityPortMissingLamp/);
  assert.doesNotMatch(scene, /local function disc\(radius, y, color, mat\)/);
});

test('항구별 승인 실물만 배치하고 없는 건축과 농작물은 대체하지 않는다', () => {
  const assets = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/AssetIds.luau', 'utf8');
  assert.match(scene, /CityPortMissingLandmark/);
  assert.match(scene, /originalHouse and AssetIds\["Town\/" \.\. originalHouse\]/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
  assert.match(scene, /scenePortId == "london" or scenePortId == "rouen"/);
  for (let i = 1; i <= 4; i++) {
    assert.ok(assets.includes('"Town/village-house-' + i + '"'), '원본 민가 ' + i);
  }
  assert.match(scene, /CityPortRuralProduct/);
  assert.match(scene, /CityPortRuralCropAsset/);
  assert.match(scene, /MISSING_EXACT_3D_CROP/);
  assert.match(scene, /if workshop and AssetIds\["Town\/" \.\. workshop\] then/);
  assert.match(scene, /CityPortPlannedPlots/);
  assert.match(scene, /CityHistoricWindmill/);
});

test('시드니·카르타헤나 실화면에 항구별 길·광장·건축 정체성을 반영한다', () => {
  const specs = [
    ['sydney', 'thatch', 'wood', 'organic', 'quay', 'torch',
      ['sand', 'sand', 'gravel', 'plank', 'paved']],
    ['cartagena_indias', 'flat', 'stucco', 'grid', 'parade', 'oil_lantern',
      ['sand', 'dirt', 'gravel', 'cobble', 'paved']],
  ];
  for (const [port, roof, wall, layout, plaza, lamp, streets] of specs) {
    assert.ok(ports.includes(`id = "${port}"`), `${port} 실제 항구 ID`);
    const section = id.split(`\n\t${port} = { landmark = `)[1]?.split(/\n\t[a-z_]+ = \{/)[0] ?? '';
    assert.ok(section, `${port} 별도 외관 누락`);
    for (const [key, value] of Object.entries({ roof, wall, layout, plaza, lamp })) {
      assert.ok(section.includes(`${key} = "${value}"`), `${port} ${key} 구별`);
    }
    assert.ok(section.includes('street = { ' + streets.map(s => '"' + s + '"').join(', ') + ' }'),
      `${port} 발전도별 실물 도로`);
  }
  const culture = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/PortCultures.luau', 'utf8');
  assert.match(culture, /pacific = \{ "sydney"/);
  assert.match(culture, /colonial = \{[^\n]*"cartagena_indias"/);
  assert.match(scene, /SIG\.sydney = cat\(one\("Naval", "structure-platform-dock"/);
  assert.doesNotMatch(scene, /SIG\.sydney = cat\(lighthouse/);
  const assets = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/AssetIds.luau', 'utf8');
  for (const name of ['structure-platform-dock', 'boat-row-small', 'dock-side']) {
    assert.ok(assets.includes('["Naval/' + name + '"]'), name + ' 등록 실물');
  }
  assert.match(scene, /CityPortMissingLandmark/);
});

test('실촬영된 항구 대표 거리에는 승인된 문화권 실물만 사용한다', () => {
  const assets = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/AssetIds.luau', 'utf8');
  const allowed = [
    'Town/village-house-2', 'Town/village-house-3', 'Town/village-house-1',
    'Town/eastasia-base', 'Town/eastasia-roof',
    'Naval/dock-side', 'Naval/boat-sail-a',
  ];
  for (const path of allowed) assert.ok(assets.includes('["' + path + '"]'), path + ' 승인 등록');
  const london = scene.match(/SIG\.london = cat\(([\s\S]*?)\n\tSIG\.edinburgh/);
  assert.ok(london, '런던 거리');
  assert.match(london[1], /village-house-2/);
  assert.doesNotMatch(london[1], /one\("Town", "house"/);
  const canton = scene.match(/SIG\.canton = cat\(([\s\S]*?)\n\tSIG\.macau/);
  assert.ok(canton, '광저우 상관 거리');
  assert.match(canton[1], /eastasia-base/);
  assert.match(canton[1], /eastasia-roof/);
  assert.doesNotMatch(canton[1], /one\("Town", "house"/);
  const zanzibar = scene.match(/SIG\.zanzibar = cat\(([\s\S]*?)\n\t-- \[광저우\]/);
  assert.ok(zanzibar, '잔지바르 항만');
  assert.match(zanzibar[1], /one\("Naval", "dock-side"/);
  assert.doesNotMatch(zanzibar[1], /tower-square/);
  assert.match(scene, /\(port and port\.name or info\.portName or info\.portId\) \.\. " · "/);
});

test('확인된 수변 항구 3곳의 부두·선박은 바다에만 배치하고 보행을 막지 않는다', () => {
  assert.match(scene, /waterfront = waterfront == true/);
  assert.match(scene, /local at = if e\.waterfront then Vector3\.new\(/);
  assert.match(scene, /54 \+ e\.dx \+ variation\.shiftX \* 0\.2/);
  assert.match(scene, /not early and not e\.waterfront/);
  for (const port of ['sydney', 'zanzibar', 'canton']) {
    const block = scene.match(new RegExp('SIG\\.' + port + ' = cat\\(([\\s\\S]*?)\\n\\t(?:SIG\\.|-- \\[)'));
    assert.ok(block, port + ' 대표 경관');
    assert.match(block[1], /nil, true/, port + ' 실제 수변 배치');
  }
});
