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

test('13개 촬영 확인 항구에 등록된 실물 특산품 3D를 표시하되 원본 경제는 보존한다', () => {
  const assets = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/AssetIds.luau', 'utf8');
  const registrations = new Map([...assets.matchAll(/\["Cargo\/([^"]+)"\] = (\d+)/g)]
    .map(m => [m[1], m[2]]));
  const extended = [...scene.matchAll(/cargoModels\.(\w+) = "([^"]+)"/g)];
  assert.ok(extended.length >= 25, '검수 항구별 실물 상품 연결');
  for (const [, good, mesh] of extended) {
    assert.ok(registrations.has(mesh), good + ' 실물 등록 누락');
  }
  for (const port of ['london','amsterdam','rouen','lisbon','istanbul','zanzibar',
    'calicut','nagasaki','veracruz','busan','canton','sydney','cartagena_indias']) {
    assert.ok(ports.includes('id = "' + port + '"'), port + ' 기존 항구');
  }
  for (const good of ['cloves', 'ivory', 'ambergris', 'cinnamon', 'copper',
    'silver', 'cochineal', 'ginseng', 'wool', 'sealskin', 'gold', 'gems']) {
    assert.match(scene, new RegExp('cargoModels\\.' + good + ' = "'));
  }
  assert.match(scene, /if identity and cargoIndex >= 4 then break end/);
  assert.match(scene, /if mesh and AssetIds\["Cargo\/" \.\. mesh\] then/);
  assert.match(scene, /PortShowcaseGoodsId/);
  assert.match(scene, /for _, id in \(if port then port\.produces else \{\}\) do/);
});

test('개별 지시서 25개 항구의 5단계 실제 외관이 일치한다', () => {
  for (const port of ['london', 'amsterdam', 'rouen', 'lisbon', 'istanbul',
    'zanzibar', 'calicut', 'nagasaki', 'veracruz', 'busan', 'canton',
    'sydney', 'cartagena_indias', 'copenhagen', 'gothenburg', 'venice', 'seville',
    'stockholm', 'bergen', 'hamburg', 'porto', 'edinburgh', 'valletta', 'genoa', 'havana']) {
    const instructions = fs.readFileSync(root + 'docs/ports/' + port + '.md', 'utf8');
    const entry = id.split('\n\t' + port + ' = { landmark = ')[1]
      ?.split(/\n\t[a-z_]+ = \{/)[0] ?? '';
    assert.ok(entry, port + ' 외관 정체성 존재');
    const roofWall = instructions.match(/^\| 지붕·벽 \| ([^|]+) \|/m)?.[1]?.trim().split(' · ');
    const plaza = instructions.match(/^\| 광장 \| ([^|]+) \|/m)?.[1]?.trim();
    const lamp = instructions.match(/^\| 밤 조명 \| ([^|]+) \|/m)?.[1]?.trim();
    const streets = instructions.match(/^\| 길 1→5단계 \| ([^|]+) \|/m)?.[1]?.trim().split(' → ');
    assert.ok(roofWall && plaza && lamp && streets?.length === 5, port + ' 지시서 완전성');
    for (const [key, expected] of Object.entries({
      roof: roofWall[0], wall: roofWall[1], plaza, lamp,
    })) {
      assert.ok(entry.includes(key + ' = "' + expected + '"'),
        port + ' ' + key + ' 지시서 불일치');
    }
    assert.ok(entry.includes('street = { ' + streets.map(s => '"' + s + '"').join(', ') + ' }'),
      port + ' 5단계 도로 지시서 불일치');
  }
});

test('열대 해안 검수 항구는 기존 등록 바위 모델의 해안 유형을 선택한다', () => {
  for (const port of ['zanzibar', 'calicut', 'veracruz', 'sydney', 'cartagena_indias']) {
    assert.ok(scene.includes(port + ' = "bay"'), port + ' 해안선 지정');
  }
  const assets = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/AssetIds.luau', 'utf8');
  assert.ok(assets.includes('["Naval/rocks-a"]'), '기존 해안 메쉬 등록');
  assert.match(scene, /elseif form == "bay" and i ~= 2 then/);
});

test('북유럽·한자·이베리아·이탈리아·카리브 8항구는 실제 원본 등록키를 유지한다', () => {
  const newPorts = ['stockholm', 'bergen', 'hamburg', 'porto',
    'edinburgh', 'valletta', 'genoa', 'havana'];
  for (const port of newPorts) {
    assert.ok(ports.includes('id = "' + port + '"'), port + ' 기존 항구');
    const data = id.split('\n\t' + port + ' = { landmark = ')[1]?.split(/\n\t[a-z_]+ = \{/)[0];
    assert.ok(data, port + ' 지시서 기반 시각 정체성');
    // 등록 여부와 관계없이 실제 해당 항구의 전용 랜드마크 ID여야 한다.
    assert.ok(data.includes('id = "lm_' + port + '_'), port + ' 고유 랜드마크 정체성');
  }
  assert.match(scene, /if identity then folder:SetAttribute\("CityPortMissingLandmark", landmarkAsset\) end/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
});

test('전체 181개 실제 항구의 주택·도로·구역·랜드마크·광장을 기존 자리에서 재배치한다', () => {
  const area = ports.split('local Ports:')[1]?.split('local Nations:')[0] ?? '';
  const names = [...area.matchAll(/^\t([a-z_]+) = \{\s*\n\t\tid = "\1"/gm)].map(m => m[1]);
  assert.equal(names.length, 181, '기존 전체 항구 181개를 보존한다');
  assert.equal(new Set(names).size, names.length, '항구 식별자 중복 없음');

  for (const region of [
    'complete-city-reposition-v2', 'coast-layout-reposition-v2',
    'district-reposition-v3', 'district-collision-reposition-v2',
    'civic-quarter-reposition-v2', 'facility-block-reposition-v2',
  ]) {
    assert.ok(scene.includes('info.portId .. ":' + region + '"'),
      region + ': 전체 항구 ID 고정 시드 재배치');
  }
  assert.match(scene, /CityPortLayoutRevision", "WHOLE_PORT_REPOSITION_V2"/);
  assert.match(scene, /CityDistrictLayoutMode", "WHOLE_PORT_REPOSITION_COLLISION_CHECK"/);
  assert.match(scene, /CityFacilityLayoutMode", "WHOLE_PORT_REPOSITION_V2"/);
  assert.match(scene, /districtSeed:NextNumber\(-28, 28\)/);
  assert.match(scene, /local signatureCenter = SIG_ANCHOR \+ Vector3\.new/);
  assert.ok(scene.includes('local civicSide = if (PortData.Ports[info.portId] or {}).shipyard then 1'),
    '운영 중인 조선소를 피해 대표경관을 북측에 배치');
  assert.ok(scene.includes('local landmarkSide = if (PortData.Ports[info.portId] or {}).shipyard then 1'),
    '광장은 북측 대표경관과 반대편에 배치');
  assert.match(scene, /local plazaAt = Vector3\.new\(-140 \+ civicOffset/);
  assert.match(scene, /CityPortPlazaLocation", plazaAt/);
  assert.match(scene, /CityPortPlazaAccessConnected", true/);
  assert.match(scene, /strip\(folder, style, plazaAt\.X, plazaAt\.Z \* 0\.5, 9,/);
  assert.match(scene, /CityFacilityPosition_" \.\. f\.tab, f\.pos/);
  assert.match(scene, /facilitySites\[\(index \+ rotation - 1\) % #facilitySites \+ 1\]/);
  assert.match(scene, /local townHalfZ = math\.min\(360 \+ lvl \* 80 \+ 14, math\.max\(442, outerEdgeZ \+ 52\)\)/);
  assert.match(scene, /for _, other in districts do/);
  assert.match(scene, /if clear and isRoyalCity and x - hx < -215/);
  assert.match(scene, /for _, a in landmarkSites do/);
  assert.doesNotMatch(scene, /local laneOffset = districtSeed:NextNumber\(-9, 9\)/);
  assert.doesNotMatch(scene, /Vector3\.new\(-134 \+ districtOffset, 0, 86/);
  assert.doesNotMatch(scene, /CityPortPlazaLocation", Vector3\.new\(-106, 0, 122\)/);
  assert.match(scene, /for _, f in facilities do\s+if f\.always or \(f\.key and fac\[f\.key\]\)/);
  assert.match(scene, /f\.pos = Vector3\.new\(site\.X \+ facilityRng:NextInteger\(-2, 2\), 0, site\.Z \* reflection\)/);
});

test('재배치 이후 시설 이용 주민과 주택 골목도 새 좌표를 사용한다', () => {
  for (const [role, facility] of [['scholarAt', 'tech'], ['clerkAt', 'route'], ['bankerAt', 'harbor']]) {
    assert.ok(scene.includes('GetAttribute("CityFacilityPosition_' + facility + '")'),
      facility + ' 방문 건물에 전문직 주민 연결');
    assert.ok(scene.includes('at = ' + role + ', prop ='), role + ' 실제 주민 좌표 사용');
  }
  assert.match(scene, /local laneNear = 152 \+ laneOffset \+ laneIndex \* laneL \+ nearBend/);
  assert.match(scene, /local laneFar = 152 \+ laneOffset \+ \(laneIndex \+ 1\) \* laneL \+ farBend/);
  assert.match(scene, /strip\(folder, style, sx, 0, laneWidth, 2 \* \(152 \+ math\.abs\(laneOffset\) \+ pairsN \* laneL\) \+ 30\)/);
  assert.match(scene, /local homeCandidates, homePlaced, homeShifted,/);
  assert.match(scene, /CityHousingLayoutState/);
  assert.match(scene, /CityPortPlannedPlots/);
  assert.match(scene, /PortOriginalLandmark/);
  assert.match(scene, /CityFacilityLayoutMode", "WHOLE_PORT_REPOSITION_V2"/);
});

test('181개 항구의 왕궁·랜드마크·상징 부속·농업 구획을 실제 신규 위치에서 렌더링한다', () => {
  assert.match(scene, /seeded\(info\.portId \.\. ":landmark-sites-reposition-v3"\)/);
  assert.match(scene, /Vector3\.new\(-118, 0, 201\), Vector3\.new\(-183, 0, 201\)/);
  assert.match(scene, /landmarkSites\[i\] = Vector3\.new\(oldSite\.X \+ shiftX/);
  assert.match(scene, /folder:SetAttribute\("CityLandmarkReflowCount", #landmarkSites\)/);
  assert.match(scene, /densify\(folder, info, style, rng, walkers,[\s\S]*?onFacility, landmarkSites\)/);
  assert.match(scene, /placeLandmarks\(folder, info, style, rng, onFacility, walkers, landmarkSites\)/);
  assert.match(scene, /local at = landmarkSites\[order\[idx\]\]/);
  assert.match(scene, /for _, landmark in landmarkSites do/);
  assert.match(scene, /for _, a in landmarkSites do/);
  assert.match(scene, /seeded\(info\.portId \.\. ":royal-district-reposition-v3"\)/);
  assert.match(scene, /local px = -425 \+ royalLayoutRng:NextInteger\(-22, 22\)/);
  assert.match(scene, /local townLeft = if isRoyalCity then -635 else math\.min\(-475, X_END - 32\)/);
  assert.match(scene, /importedModel\(folder, kind, asset, signatureCenter \+ Vector3\.new/);
  assert.match(scene, /importedModel\(folder, "Castle", "flag-banner-long", signatureCenter \+ Vector3\.new/);
  assert.doesNotMatch(scene, /importedModel\(folder, kind, asset, Vector3\.new\(-8, 0, -112\)/);
});

test('181개 항구 산업·시장·농업지구가 항구별 새로운 독립 공간과 실제 시설 충돌 검사를 사용한다', () => {
  assert.match(scene, /seeded\(info\.portId \.\. ":district-reposition-v3"\)/);
  assert.match(scene, /local farmX = -357 \+ \(if reflow then reflow.district else dz:NextInteger\(-12, 12\)\)/);
  assert.match(scene, /local farmZ = 379 \+ dz:NextInteger\(0, 9\)/);
  assert.match(scene, /Vector3\.new\(farmX, 0, firstSide \* farmZ\)/);
  assert.match(scene, /if clear and kind ~= "farm" then/);
  assert.match(scene, /folder:GetAttribute\("CityFacilityPosition_" \.\. tab\)/);
  assert.match(scene, /local plazaLocation = folder:GetAttribute\("CityPortPlazaLocation"\)/);
  assert.match(scene, /for _, site in facilityLocations do/);
  assert.match(scene, /math\.abs\(x - site\.X\) < hx \+ 25/);
  assert.match(scene, /math\.abs\(x - site\.X\) < halfX \+ 25/);
  assert.doesNotMatch(scene, /if x > -108 - halfX and math\.abs\(z\) > 17 - halfZ/);
  assert.match(scene, /for _, other in districts do/);
});


test('181개 항구 지시서별 실제 광장·도로·랜드마크·시설 재배치', () => {
  const ports181 = [...ports.slice(ports.indexOf('local Ports:'), ports.indexOf('local Nations:'))
    .matchAll(/^\t([a-z_]+) = \{\n\t\tid = "[a-z_]+", name = /gm)].map(match => match[1]);
  assert.equal(ports181.length, 181, '기존 등록 항구 181개');
  assert.equal(new Set(ports181).size, 181, '등록 항구 ID 중복 없음');
  const unique = new Set();
  for (const port of ports181) {
    const block = id.split('\n\t' + port + ' = { landmark = ')[1]?.split(/\n\t[a-z_]+ = \{/)[0] ?? '';
    const data = block.match(/reflow = \{ lane = (-?\d+), plaza = (-?\d+), side = (-?\d+), landmarkX = (-?\d+), landmarkZ = (-?\d+), district = (-?\d+), facility = (\d+) \}/);
    assert.ok(data, port + ' 항구별 재배치 누락');
    const [lane, plaza, side, lx, lz, district, facility] = data.slice(1).map(Number);
    assert.ok(Math.abs(lane) <= 12 && Math.abs(plaza) <= 15, port + ' 도로·광장');
    assert.ok(side === -1 || side === 1, port + ' 남북 구역');
    assert.ok(Math.abs(lx) <= 8 && Math.abs(lz) <= 8, port + ' 랜드마크 안전 범위');
    assert.ok(Math.abs(district) <= 12 && facility >= 1 && facility <= 6, port + ' 시설·외곽 배치');
    unique.add(data[0]);
  }
  assert.equal(unique.size, 181, '항구마다 서로 다른 공간 배치');
  assert.match(scene, /CityPortManualReflow", "PORT_MANUAL_REPOSITION_V1"/);
  assert.match(scene, /local laneOffset = districtSeed:NextNumber\(-28, 28\) \+ terrainLaneShift \+ \(if reflow then reflow.lane else 0\)/);
  assert.match(scene, /local districtX = -138 \+ \(if reflow then reflow.district/);
  assert.match(scene, /local farmX = -357 \+ \(if reflow then reflow.district/);
  assert.match(scene, /local rotation = if reflow then reflow.facility else facilityRng/);
  assert.match(scene, /local shiftX = if reflow then reflow.landmarkX/);
  assert.match(scene, /local shiftZ = if reflow then reflow.landmarkZ/);
  assert.match(scene, /local plazaAt = Vector3.new\(-140 \+ civicOffset/);
  assert.match(scene, /CityFacilityPosition_" \.\. f.tab, f.pos/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
});


test('추가 8개 항구의 5단계 외관과 기존 필지 재배치가 지시서에 맞는다', () => {
  const extra = ['bordeaux', 'marseille', 'naples', 'athens', 'goa', 'manila', 'osaka', 'cape_town'];
  for (const port of extra) {
    const instructions = fs.readFileSync(root + 'docs/ports/' + port + '.md', 'utf8');
    const entry = id.split('\n\t' + port + ' = { landmark = ')[1]?.split(/\n\t[a-z_]+ = \{/)[0] ?? '';
    assert.ok(entry, port + ' 독립 마을 누락');
    assert.ok(ports.includes('id = "' + port + '"'), port + ' 기존 항구 보존');
    const roofWall = instructions.match(/^\| 지붕·벽 \| ([^|]+) \|/m)?.[1]?.trim().split(' · ');
    const plaza = instructions.match(/^\| 광장 \| ([^|]+) \|/m)?.[1]?.trim();
    const lamp = instructions.match(/^\| 밤 조명 \| ([^|]+) \|/m)?.[1]?.trim();
    const streets = instructions.match(/^\| 길 1→5단계 \| ([^|]+) \|/m)?.[1]?.trim().split(' → ');
    assert.equal(streets?.length, 5, port + ' 5단계 길');
    for (const [key, value] of Object.entries({roof: roofWall?.[0], wall: roofWall?.[1], plaza, lamp}))
      assert.ok(entry.includes(key + ' = "' + value + '"'), port + ' ' + key);
    assert.ok(entry.includes('street = { ' + streets.map(s => '"' + s + '"').join(', ') + ' }'), port + ' 도로 원형');
    assert.match(entry, /^\{ id = "lm_[^"]+", name = "[^"]+", kind = "[^"]+", fallback = "none" \}/);
    assert.match(entry, /reflow = \{ lane = -?\d+, plaza = -?\d+, side = -?\d+, landmarkX = -?\d+, landmarkZ = -?\d+, district = -?\d+, facility = \d+ \}/);
  }
  assert.match(scene, /local reflow = identity and identity.reflow/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
});


// [항구별 재배치 34~50] 17개 지시서의 외관, 5단계 도로, 승인 모델·시설 위치 검증.
test('추가 17개 항구 지시서와 고유 3D 위치를 검증한다', () => {
  const extra = ['alexandria', 'algiers', 'antwerp', 'barcelona', 'beirut', 'boston', 'buenos_aires', 'cadiz', 'colombo', 'dakar', 'dublin', 'edo', 'incheon', 'jeddah', 'kilwa', 'malacca', 'new_york'];
  const unique = new Set();
  for (const port of extra) {
    const doc = fs.readFileSync(root + 'docs/ports/' + port + '.md', 'utf8');
    const entry = id.split('\n\t' + port + ' = { landmark = ')[1]?.split(/\n\t[a-z_]+ = \{/)[0] ?? '';
    assert.ok(entry, port + ' 항구별 지정 누락');
    assert.ok(ports.includes('id = "' + port + '"'), port + ' 기존 항구 보존');
    const roofWall = doc.match(/^\| 지붕·벽 \| ([^|]+) \|/m)?.[1]?.trim().split(' · ');
    const plaza = doc.match(/^\| 광장 \| ([^|]+) \|/m)?.[1]?.trim();
    const lamp = doc.match(/^\| 밤 조명 \| ([^|]+) \|/m)?.[1]?.trim();
    const streets = doc.match(/^\| 길 1→5단계 \| ([^|]+) \|/m)?.[1]?.trim().split(' → ');
    assert.equal(streets?.length, 5, port + ' 5단계 도로');
    for (const [key, value] of Object.entries({ roof: roofWall?.[0], wall: roofWall?.[1], plaza, lamp }))
      assert.ok(entry.includes(key + ' = "' + value + '"'), port + ' 지시서 ' + key);
    assert.ok(entry.includes('street = { ' + streets.map(x => '"' + x + '"').join(', ') + ' }'), port + ' 길 5단계');
    assert.match(entry, /^\{ id = "lm_[^"]+", name = "[^"]+", kind = "[^"]+", fallback = "none" \}/);
    const match = entry.match(/reflow = \{ lane = (-?\d+), plaza = (-?\d+), side = (-?\d+), landmarkX = (-?\d+), landmarkZ = (-?\d+), district = (-?\d+), facility = (\d+) \}/);
    assert.ok(match, port + ' 고유 배치');
    const [lane, plazaPos, side, lx, lz, district, facility] = match.slice(1).map(Number);
    assert.ok(Math.abs(lane) <= 12 && Math.abs(plazaPos) <= 15, port + ' 도로 광장 범위');
    assert.ok(Math.abs(side) === 1 && Math.abs(lx) <= 8 && Math.abs(lz) <= 8, port + ' 랜드마크 안전 범위');
    assert.ok(Math.abs(district) <= 12 && facility >= 1 && facility <= 6, port + ' 구획 시설 범위');
    assert.ok(!unique.has(match[0]), port + ' 위치 중복');
    unique.add(match[0]);
  }
  assert.equal(unique.size, 17);
  assert.match(scene, /CityPortManualReflow", "PORT_MANUAL_REPOSITION_V1"/);
  assert.match(scene, /local rotation = if reflow then reflow.facility else facilityRng/);
  assert.match(scene, /local shiftX = if reflow then reflow.landmarkX/);
  assert.match(scene, /local shiftZ = if reflow then reflow.landmarkZ/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
});


// [항구별 재배치 51~67] 지시서 대조와 진흙길 원본 재질 지원.
test('51~67번째 항구의 5단계 길·광장·시설·랜드마크는 지시서와 일치한다', () => {
  const extra = ['acapulco', 'acre', 'aden', 'agadir', 'ajaccio', 'ambon', 'amoy', 'ancona', 'auckland', 'banda', 'bandar_abbas', 'bangkok', 'basra', 'batavia', 'belem', 'benghazi', 'benguela'];
  const unique = new Set();
  for (const port of extra) {
    const doc = fs.readFileSync(root + 'docs/ports/' + port + '.md', 'utf8');
    const entry = id.split('\n\t' + port + ' = { landmark = ')[1]?.split(/\n\t[a-z_]+ = \{/)[0] ?? '';
    assert.ok(entry, port + ' 고유 항구 정체성');
    assert.ok(ports.includes('id = "' + port + '"'), port + ' 기존 항구와 조선소 기능 보존');
    const roofWall = doc.match(/^\| 지붕·벽 \| ([^|]+) \|/m)?.[1]?.trim().split(' · ');
    const plaza = doc.match(/^\| 광장 \| ([^|]+) \|/m)?.[1]?.trim();
    const lamp = doc.match(/^\| 밤 조명 \| ([^|]+) \|/m)?.[1]?.trim();
    const streets = doc.match(/^\| 길 1→5단계 \| ([^|]+) \|/m)?.[1]?.trim().split(' → ');
    assert.equal(streets?.length, 5, port + ' 5단계 도로');
    for (const [key, value] of Object.entries({ roof: roofWall?.[0], wall: roofWall?.[1], plaza, lamp }))
      assert.ok(entry.includes(key + ' = "' + value + '"'), port + ' 지시서 ' + key);
    assert.ok(entry.includes('street = { ' + streets.map(x => '"' + x + '"').join(', ') + ' }'), port + ' 도로 재질');
    assert.match(entry, /^\{ id = "lm_[^"]+", name = "[^"]+", kind = "[^"]+", fallback = "none" \}/);
    const match = entry.match(/reflow = \{ lane = (-?\d+), plaza = (-?\d+), side = (-?\d+), landmarkX = (-?\d+), landmarkZ = (-?\d+), district = (-?\d+), facility = (\d+) \}/);
    assert.ok(match, port + ' 항구 위치');
    const [lane, plazaPos, side, lx, lz, district, facility] = match.slice(1).map(Number);
    assert.ok(Math.abs(lane) <= 12 && Math.abs(plazaPos) <= 15, port + ' 도로·광장 안전 범위');
    assert.ok(Math.abs(side) === 1 && Math.abs(lx) <= 8 && Math.abs(lz) <= 8, port + ' 랜드마크 안전 범위');
    assert.ok(Math.abs(district) <= 12 && facility >= 1 && facility <= 6, port + ' 공방·시설 안전 범위');
    assert.ok(!unique.has(match[0]), port + ' 배치 중복');
    unique.add(match[0]);
  }
  assert.equal(unique.size, 17);
  assert.match(id, /M.STREETS = \{[^\n]*mud = true \}/);
  assert.match(id, /mud = \{ "Mud", 105, 89, 70 \}/);
  assert.match(scene, /CityPortManualReflow", "PORT_MANUAL_REPOSITION_V1"/);
  assert.match(scene, /local rotation = if reflow then reflow.facility else facilityRng/);
  assert.match(scene, /local shiftX = if reflow then reflow.landmarkX/);
  assert.match(scene, /local shiftZ = if reflow then reflow.landmarkZ/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
});


// [항구별 재배치 68~84] 추가 17개 지시서 일치·기존 상호작용·시설 충돌 경계 회귀.
test('68~84번째 항구의 지시서 5단계 외관과 실제 필지 재배치', () => {
  const extra = ['bissau', 'bone', 'bridgetown', 'brunei', 'calabar', 'calcutta', 'callao', 'campeche', 'candia', 'cartagena', 'casablanca', 'charleston', 'cochin', 'corfu', 'damietta', 'darwin', 'diu'];
  const unique = new Set();
  for (const port of extra) {
    const doc = fs.readFileSync(root + 'docs/ports/' + port + '.md', 'utf8');
    const entry = id.split('\n\t' + port + ' = { landmark = ')[1]?.split(/\n\t[a-z_]+ = \{/)[0] ?? '';
    assert.ok(entry, port + ' 독립 항구 정체성');
    assert.ok(ports.includes('id = "' + port + '"'), port + ' 기존 항구 보존');
    const roofWall = doc.match(/^\| 지붕·벽 \| ([^|]+) \|/m)?.[1]?.trim().split(' · ');
    const plaza = doc.match(/^\| 광장 \| ([^|]+) \|/m)?.[1]?.trim();
    const lamp = doc.match(/^\| 밤 조명 \| ([^|]+) \|/m)?.[1]?.trim();
    const streets = doc.match(/^\| 길 1→5단계 \| ([^|]+) \|/m)?.[1]?.trim().split(' → ');
    assert.equal(streets?.length, 5, port + ' 원본 5단계 도로');
    for (const [key, value] of Object.entries({ roof: roofWall?.[0], wall: roofWall?.[1], plaza, lamp }))
      assert.ok(entry.includes(key + ' = "' + value + '"'), port + ' 원본 지시서 ' + key);
    assert.ok(entry.includes('street = { ' + streets.map(v => '"' + v + '"').join(', ') + ' }'), port + ' 발전 단계별 길 재질');
    assert.match(entry, /^\{ id = "lm_[^"]+", name = "[^"]+", kind = "[^"]+", fallback = "none" \}/, port + ' 등록되지 않은 역사 원본 사칭 금지');
    const at = entry.match(/reflow = \{ lane = (-?\d+), plaza = (-?\d+), side = (-?\d+), landmarkX = (-?\d+), landmarkZ = (-?\d+), district = (-?\d+), facility = (\d+) \}/);
    assert.ok(at, port + ' 별도 재배치');
    const [lane, plazaPos, side, lx, lz, district, facility] = at.slice(1).map(Number);
    assert.ok(Math.abs(lane) <= 12 && Math.abs(plazaPos) <= 15, port + ' 도로·광장 안전 위치');
    assert.ok(Math.abs(side) === 1 && Math.abs(lx) <= 8 && Math.abs(lz) <= 8, port + ' 상징물 안전 위치');
    assert.ok(Math.abs(district) <= 12 && facility >= 1 && facility <= 6, port + ' 특산 구획·방문시설 안전 위치');
    assert.ok(!unique.has(at[0]), port + ' 중복 배치 금지');
    unique.add(at[0]);
  }
  assert.equal(unique.size, 17);
  assert.match(scene, /CityPortManualReflow", "PORT_MANUAL_REPOSITION_V1"/);
  assert.match(scene, /local rotation = if reflow then reflow.facility else facilityRng/);
  assert.match(scene, /local shiftX = if reflow then reflow.landmarkX/);
  assert.match(scene, /local shiftZ = if reflow then reflow.landmarkZ/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
});


// [항구별 재배치 85~101] 새 항구 17곳의 문화권·도로 발전·시각 좌표를 기존 생성 경로로 검증.
test('85~101번째 항구는 원본 항구 지시서와 고유 배치를 보존한다', () => {
  const extra = ['cagliari', 'elmina', 'famagusta', 'freetown', 'funchal', 'gdansk', 'gibraltar', 'glasgow', 'guam', 'guayaquil', 'hakodate', 'halifax', 'helsinki', 'hobart', 'hoi_an', 'honolulu', 'hull'];
  const unique = new Set();
  for (const port of extra) {
    const manual = fs.readFileSync(root + 'docs/ports/' + port + '.md', 'utf8');
    const entry = id.split('\n\t' + port + ' = { landmark = ')[1]?.split(/\n\t[a-z_]+ = \{/)[0] ?? '';
    assert.ok(entry, port + ' 개별 항구 정체성');
    assert.ok(ports.includes('id = "' + port + '"'), port + ' 기존 게임 항구 데이터와 저장 키 보존');
    const roofWall = manual.match(/^\| 지붕·벽 \| ([^|]+) \|/m)?.[1]?.trim().split(' · ');
    const plaza = manual.match(/^\| 광장 \| ([^|]+) \|/m)?.[1]?.trim();
    const lamp = manual.match(/^\| 밤 조명 \| ([^|]+) \|/m)?.[1]?.trim();
    const streets = manual.match(/^\| 길 1→5단계 \| ([^|]+) \|/m)?.[1]?.trim().split(' → ');
    assert.equal(streets?.length, 5, port + ' 5단계 길');
    for (const [key, value] of Object.entries({ roof: roofWall?.[0], wall: roofWall?.[1], plaza, lamp }))
      assert.ok(entry.includes(key + ' = "' + value + '"'), port + ' 지시서 ' + key);
    assert.ok(entry.includes('street = { ' + streets.map(v => '"' + v + '"').join(', ') + ' }'), port + ' 길 5단계 재질');
    assert.match(entry, /^\{ id = "lm_[^"]+", name = "[^"]+", kind = "[^"]+", fallback = "none" \}/, port + ' 미등록 랜드마크 대체 금지');
    const pos = entry.match(/reflow = \{ lane = (-?\d+), plaza = (-?\d+), side = (-?\d+), landmarkX = (-?\d+), landmarkZ = (-?\d+), district = (-?\d+), facility = (\d+) \}/);
    assert.ok(pos, port + ' 3D 구획의 개별 위치');
    const [lane, plazaPos, side, lx, lz, district, facility] = pos.slice(1).map(Number);
    assert.ok(Math.abs(lane) <= 12 && Math.abs(plazaPos) <= 15, port + ' 골목·광장 이동 한계');
    assert.ok(Math.abs(side) === 1 && Math.abs(lx) <= 8 && Math.abs(lz) <= 8, port + ' 랜드마크 이동 한계');
    assert.ok(Math.abs(district) <= 12 && facility >= 1 && facility <= 6, port + ' 구획·방문 시설 이동 한계');
    assert.ok(!unique.has(pos[0]), port + ' 중복 3D 배치');
    unique.add(pos[0]);
  }
  assert.equal(unique.size, 17);
  assert.match(scene, /CityPortManualReflow", "PORT_MANUAL_REPOSITION_V1"/);
  assert.match(scene, /local rotation = if reflow then reflow.facility else facilityRng/);
  assert.match(scene, /local shiftX = if reflow then reflow.landmarkX/);
  assert.match(scene, /local shiftZ = if reflow then reflow.landmarkZ/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
});


// [항구별 재배치 102~118] 항구 지시서와 기존 3D 마을 생성 경로를 그대로 비교.
test('102~118번째 항구 지시서·필지 좌표·승인 건물 보존', () => {
  const extra = ['kingston', 'koenigsberg', 'la_guaira', 'la_rochelle', 'lagos', 'las_palmas', 'livorno', 'luanda', 'lubeck', 'macau', 'madras', 'makassar', 'malaga', 'messina', 'mocha', 'mogadishu', 'mombasa'];
  const unique = new Set();
  for (const port of extra) {
    const manual = fs.readFileSync(root + 'docs/ports/' + port + '.md', 'utf8');
    const entry = id.split('\n\t' + port + ' = { landmark = ')[1]?.split(/\n\t[a-z_]+ = \{/)[0] ?? '';
    assert.ok(entry, port + ' 개별 마을 정체성');
    assert.ok(ports.includes('id = "' + port + '"'), port + ' 기존 등록 항구 보존');
    const roofWall = manual.match(/^\| 지붕·벽 \| ([^|]+) \|/m)?.[1]?.trim().split(' · ');
    const plaza = manual.match(/^\| 광장 \| ([^|]+) \|/m)?.[1]?.trim();
    const lamp = manual.match(/^\| 밤 조명 \| ([^|]+) \|/m)?.[1]?.trim();
    const streets = manual.match(/^\| 길 1→5단계 \| ([^|]+) \|/m)?.[1]?.trim().split(' → ');
    assert.equal(streets?.length, 5, port + ' 5단계 도로');
    for (const [key, value] of Object.entries({ roof: roofWall?.[0], wall: roofWall?.[1], plaza, lamp }))
      assert.ok(entry.includes(key + ' = "' + value + '"'), port + ' 지시서 ' + key);
    assert.ok(entry.includes('street = { ' + streets.map(x => '"' + x + '"').join(', ') + ' }'), port + ' 5단계 길 재질');
    assert.match(entry, /^\{ id = "lm_[^"]+", name = "[^"]+", kind = "[^"]+", fallback = "none" \}/, port + ' 미등록 건물 대체 금지');
    const pos = entry.match(/reflow = \{ lane = (-?\d+), plaza = (-?\d+), side = (-?\d+), landmarkX = (-?\d+), landmarkZ = (-?\d+), district = (-?\d+), facility = (\d+) \}/);
    assert.ok(pos, port + ' 시설·광장·랜드마크 위치');
    const [lane, plazaPos, side, lx, lz, district, facility] = pos.slice(1).map(Number);
    assert.ok(Math.abs(lane) <= 12 && Math.abs(plazaPos) <= 15, port + ' 거리·광장 범위');
    assert.ok(Math.abs(side) === 1 && Math.abs(lx) <= 8 && Math.abs(lz) <= 8, port + ' 상징 건축 이동 범위');
    assert.ok(Math.abs(district) <= 12 && facility >= 1 && facility <= 6, port + ' 상관·방문시설 이동 범위');
    assert.ok(!unique.has(pos[0]), port + ' 위치 중복');
    unique.add(pos[0]);
  }
  assert.equal(unique.size, 17);
  assert.match(scene, /CityPortManualReflow", "PORT_MANUAL_REPOSITION_V1"/);
  assert.match(scene, /local rotation = if reflow then reflow.facility else facilityRng/);
  assert.match(scene, /local shiftX = if reflow then reflow.landmarkX/);
  assert.match(scene, /local shiftZ = if reflow then reflow.landmarkZ/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
});


// [항구별 재배치 119~181] 63개 항구 전부 원본 지시서와 실제 좌표를 대조한다.
test('119~181번째 항구의 개별 지시서·구역·색상·좌표·승인 자산 정책', () => {
  const extras = ["montevideo","mozambique","muscat","nassau","new_orleans","ningbo","oran","oslo","ouidah","palermo","palma","panama","paramaribo","perth","philadelphia","plymouth","ponta_delgada","port_louis","port_moresby","port_of_spain","portobelo","praia","quebec","ragusa","rangoon","recife","rhodes","riga","rio","rotterdam","safi","saint_louis","salvador","san_francisco","san_juan","santo_domingo","sao_tome","shanghai","singapore","sitka","smyrna","split","st_helena","st_johns","st_petersburg","surat","suva","syracuse","tahiti","tainan","tallinn","tangier","ternate","thessaloniki","tianjin","toulon","trieste","tripoli","tunis","valencia","valparaiso","vancouver","visby"];
  const coordinates = new Set();
  for (const port of extras) {
    const manual = fs.readFileSync(root + 'docs/ports/' + port + '.md', 'utf8');
    const entry = id.split('\n\t' + port + ' = { landmark = ')[1]?.split(/\n\t[a-z_]+ = \{/)[0] ?? '';
    assert.ok(entry, port + ' 개별 정체성');
    assert.ok(ports.includes('id = "' + port + '"'), port + ' 등록 항구');
    const roofWall = manual.match(/^\| 지붕·벽 \| ([^|]+) \|/m)?.[1]?.trim().split(' · ');
    const plaza = manual.match(/^\| 광장 \| ([^|]+) \|/m)?.[1]?.trim();
    const lamp = manual.match(/^\| 밤 조명 \| ([^|]+) \|/m)?.[1]?.trim();
    const streets = manual.match(/^\| 길 1→5단계 \| ([^|]+) \|/m)?.[1]?.trim().split(' → ');
    const symbol = manual.match(/^\| 상징물 \| ([^|]+) \|/m)?.[1]?.split(' (2단계')[0];
    const climate = manual.match(/기후 유형: \*\*([a-z_]+)\*\*/)?.[1];
    assert.equal(streets?.length, 5, port + ' 5단계 길');
    for (const [key, value] of Object.entries({ roof: roofWall?.[0], wall: roofWall?.[1], plaza, lamp })) {
      assert.ok(entry.includes(key + ' = "' + value + '"'), port + ' 지시서 ' + key);
    }
    assert.ok(entry.includes('street = { ' + streets.map(v => '"' + v + '"').join(', ') + ' }'), port + ' 도로 재질');
    assert.ok(entry.includes(symbol), port + ' 원본 지시서 랜드마크 설명');
    assert.match(entry, /^\{ id = "lm_[^"]+", name = "[^"]+", kind = "[^"]+", fallback = "none" \}/, port + ' 미등록 건물 대체 금지');
    assert.match(entry, /facade = \{ \d+, \d+, \d+ \}, roofTint = \{ \d+, \d+, \d+ \}/, port + ' 지붕과 외벽 색상');
    assert.ok(manual.includes('## 5. 구획·주거·배치·주민 동선'), port + ' 마을 구역 지시서');
    assert.ok(manual.includes(port + '_landmark_full'), port + ' 원본 랜드마크 완성형 사양');
    if (climate === 'cold') assert.ok(entry.includes('weatherGround = "snow"'), port + ' 한랭 날씨');
    if (climate === 'tropical') assert.ok(entry.includes('weatherGround = "monsoon_mud"'), port + ' 열대 강우');
    const pos = entry.match(/reflow = \{ lane = (-?\d+), plaza = (-?\d+), side = (-?\d+), landmarkX = (-?\d+), landmarkZ = (-?\d+), district = (-?\d+), facility = (\d+) \}/);
    assert.ok(pos, port + ' 실제 개별 배치');
    const [lane, plazaPos, side, lx, lz, district, facility] = pos.slice(1).map(Number);
    assert.ok(Math.abs(lane) <= 12 && Math.abs(plazaPos) <= 15, port + ' 도로·광장 범위');
    assert.ok(Math.abs(side) === 1 && Math.abs(lx) <= 8 && Math.abs(lz) <= 8, port + ' 랜드마크 범위');
    assert.ok(Math.abs(district) <= 12 && facility >= 1 && facility <= 6, port + ' 구획·방문시설 범위');
    assert.ok(!coordinates.has(pos[0]), port + ' 중복 배치');
    coordinates.add(pos[0]);
  }
  assert.equal(coordinates.size, 63);
  assert.match(scene, /CityPortManualReflow", "PORT_MANUAL_REPOSITION_V1"/);
  assert.match(scene, /local rotation = if reflow then reflow.facility else facilityRng/);
  assert.match(scene, /local shiftX = if reflow then reflow.landmarkX/);
  assert.match(scene, /local shiftZ = if reflow then reflow.landmarkZ/);
  assert.match(scene, /if AssetIds\["Town\/" \.\. landmarkAsset\] then/);
});


// [런던 1/181] 원본 지시서의 실제 특산품·정본 지역 장날·하역장·조선소 소품을 기존 렌더러와 대조.
test('런던 지시서: 양모·석탄·주석 시장과 장날 가판대·광물 하역·조선항 밧줄', () => {
  const brief = fs.readFileSync(root + 'docs/ports/london.md', 'utf8');
  const assets = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/AssetIds.luau', 'utf8');
  assert.match(brief, /\| 특산물 \| wool, coal, tin \|/);
  assert.match(brief, /장날엔 가판대 2배/);
  assert.match(brief, /조선소와 밧줄 공장이 붙은 큰 항만/);
  assert.match(ports, /london = \{[\s\S]*?produces = \{ "wool", "coal", "tin" \}/);
  for (const item of ['Cargo/textiles-stack-small', 'Cargo/coal', 'Cargo/tin', 'Town/stall-red',
    'Town/stall-green', 'Town/workbench-anvil', 'Relics/rope-bundle-a']) {
    assert.ok(assets.includes('["' + item + '"]'), item + ' 등록 승인 모델');
  }
  assert.match(scene, /wool = \{ "Cargo", "textiles-stack-small" \}/);
  assert.match(scene, /coal = \{ "Cargo", "coal" \}/);
  assert.match(scene, /tin = \{ "Cargo", "tin" \}/);
  assert.ok(scene.includes('marketGoods = if info.portId == "london" then { "wool", "coal", "tin" }'));
  assert.match(scene, /local londonMarketDay = info.portId == "london" and type\(info\.day\) == "number"/);
  assert.match(scene, /require\(script\.Parent:WaitForChild\("Harbor"\)\)\.festivalAt\("europe", info\.day\)/);
  const sharedHarbor = fs.readFileSync(root + 'src/ReplicatedStorage/Shared/Harbor.luau', 'utf8');
  assert.match(sharedHarbor, /function Harbor\.festivalAt\(region: string, day: number\)/);
  assert.match(sharedHarbor, /europe = \{ \{ day = 45, name = "사육제\(카니발\)" \}/);
  assert.match(scene, /put\("Town", stallAsset, 7, x, cz \+ side \* 19, false/);
  assert.match(scene, /"CityMarketStalls", stalls \+ londonExtraStalls/);
  assert.match(scene, /"CityLondonMarketDay", londonMarketDay/);
  assert.ok(scene.includes('for index, mineral in { "coal", "tin" } do'));
  assert.match(scene, /AssetIds\["Cargo\/" \.\. mineral\]/);
  // 공통 원본 밧줄 배치와 런던 전용 대체 원본·진단을 각각 검증한다.
  const ropeBlock = scene.split('-- [런던 조선항]')[1].split('-- [지역 특산품 하역]')[0];
  assert.match(ropeBlock, /if lay\.freight and lay\.shipyardBuilt then/);
  assert.match(ropeBlock, /local ropeSource = info\.portId \.\. "-rope-twist-02-source"/);
  assert.match(ropeBlock, /if not rope and info\.portId == "london" and AssetIds\["Relics\/rope-bundle-a"\] then\s+rope = one\("Relics", "rope-bundle-a",/);
  assert.match(ropeBlock, /if rope and info\.portId == "london" then rope:SetAttribute\("LondonHarborRopeSupply", true\) end/);
  assert.ok(scene.includes('if stalls > 0 then GOOD_MESH[good] else nil'),
    '실제 시장 건물 없으면 특산품 미배치');
  assert.ok(scene.includes('if table.find((port and port.produces) or {}, mineral)'),
    '등록된 실물 생산품만 하역');
});

test('항구 분할 교체 중 이전 모션을 중단하고 새 장면의 낙하 복구 연결을 보존한다', () => {
  const retiring = scene.indexOf('old:SetAttribute("PortSceneActive", false)');
  const destroy = scene.indexOf('child:Destroy()', retiring);
  const attach = scene.indexOf('folder.Parent = workspace', destroy);
  const ready = scene.indexOf('folder:SetAttribute("PortSceneActive", true)', attach);
  const holder = scene.indexOf('holder:Destroy()', attach);
  assert.ok(retiring >= 0 && destroy > retiring && attach > destroy && holder > attach && ready > holder);
  const safety = scene.split('-- 안전망: 어떤 이유로든 바다나 허공')[1].split('-- 한낮의 열기')[0];
  assert.match(safety, /if not folder\.Parent or folder:GetAttribute\("PortSceneActive"\) ~= true then return end/);
  assert.match(safety, /folder\.Destroying:Connect\(function\(\) conn:Disconnect\(\) end\)/);
  assert.match(safety, /hrp\.Position\.Y < -12/);
  assert.match(safety, /char:PivotTo\(CFrame\.new\(-6, 6, 10\)\)/);
  for (const loop of ['swayConn = RunService.Heartbeat', 'local walkConn = RunService.PreSimulation', 'local climateConn = RunService.Heartbeat', 'followConn = RunService.PreSimulation']) {
    const start = scene.indexOf(loop);
    assert.ok(start >= 0 && scene.slice(start, start + 500).includes('folder:GetAttribute("PortSceneActive") ~= true'), loop);
  }
});

test('건축 모델 설치와 시공 인력의 지연 작업은 제거 시 취소하고 정상 완료 시 연결을 해제한다', () => {
  const install = scene.split('-- [설치 타이머]')[1].split('return m')[0];
  assert.match(install, /local installThread = task\.delay\(buildDelay, function\(\)/);
  assert.match(install, /installCleanup = m\.Destroying:Once\(function\(\)\s+if coroutine\.status\(installThread\) == "suspended" then task\.cancel\(installThread\) end/);
  assert.match(install, /task\.wait\(0\.76\)/);
  assert.match(install, /piece\.part\.CanCollide = piece\.solid/);
  assert.match(install, /installCleanup:Disconnect\(\)/);
  assert.doesNotMatch(install, /task\.delay\(0\.76/);
  assert.match(scene, /local crewThread = task\.defer\(function\(\)/);
  assert.match(scene, /crewCleanup = folder\.Destroying:Once\(function\(\)\s+if coroutine\.status\(crewThread\) == "suspended" then task\.cancel\(crewThread\) end/);
  assert.match(scene, /crewCleanup:Disconnect\(\)/);
});

test('간판·시설 작업자·비계·복장 갱신은 제거된 장면에 지연 작업을 남기지 않는다', () => {
  for (const [cleanup, owner, thread] of [
    ['signCleanup', 'bb', 'signThread'],
    ['builderCleanup', 'builder', 'builderThread'],
    ['scaffoldCleanup', 'scaffold', 'scaffoldThread'],
  ]) {
    assert.ok(scene.includes(cleanup + ' = ' + owner + '.Destroying:Once(function()'));
    assert.ok(scene.includes('if coroutine.status(' + thread + ') == "suspended" then task.cancel(' + thread + ') end'));
    assert.ok(scene.includes(cleanup + ':Disconnect()'));
  }
  assert.match(scene, /for _ = 1, 40 do\s+task\.wait\(1\)\s+if not bb\.Parent or not adornee\.Parent then break end\s+if tryShow\(\) then break end/);
  assert.match(scene, /builderCleanup:Disconnect\(\)\s+if builder\.Parent then builder:Destroy\(\) end/);
  assert.match(scene, /scaffoldCleanup:Disconnect\(\)\s+if scaffold\.Parent then scaffold:Destroy\(\) end/);
  assert.match(scene, /outfitThread = task\.delay\(0\.08, function\(\)\s+outfitThread = nil/);
  assert.match(scene, /if outfitThread and coroutine\.status\(outfitThread\) == "suspended" then task\.cancel\(outfitThread\) end\s+outfitThread = nil/);
});

test('항해 중 항구 간판과 동료 연산을 중단하고 해상 날씨 소유권을 유지한다', () => {
  const signs = scene.split('local function animateSign(rec)')[1].split('-- 방문시설 간판:')[0];
  assert.match(signs, /local sailing = workspace:GetAttribute\("VoyageActive"\) == true/);
  assert.match(signs, /if not a\.bb\.Parent then\s+table\.remove\(signAnims, i\)\s+elseif not sailing then/);
  assert.match(signs, /if #signAnims == 0 then\s+signLoop:Disconnect\(\)/);
  const followers = scene.split('followConn = RunService.PreSimulation:Connect')[1].split('followConn:Disconnect()')[0];
  assert.match(followers, /if workspace:GetAttribute\("VoyageActive"\) or workspace:FindFirstChild\("FieldScene"\) then return end/);
  assert.ok(followers.indexOf('workspace:GetAttribute("VoyageActive")') < followers.indexOf('workspace:Raycast('));
  const climate = scene.split('local climateConn = RunService.Heartbeat:Connect')[1].split('climateConn:Disconnect()')[0];
  assert.match(climate, /if workspace:GetAttribute\("VoyageActive"\) or workspace:GetAttribute\("ShotCF"\) or workspace:FindFirstChild\("FieldScene"\) then\s+if snow and snow\.Rate ~= 0 then snow\.Rate = 0 end\s+return\s+end/);
  assert.ok(climate.indexOf('workspace:GetAttribute("VoyageActive")') < climate.indexOf('portClouds.Cover ='));
  assert.match(climate, /snow\.Rate = if seasonIndex == 1 then 18 \+ dawn \* 9 else 0/);
});

test('원거리 주민은 위치와 보행 위상을 보존하고 관절 갱신만 제한한다', () => {
  const walk = scene.split('local walkConn = RunService.PreSimulation:Connect')[1].split('walkConn:Disconnect()')[0];
  assert.match(walk, /local motionEye = motionCamera and motionCamera\.CFrame\.Position/);
  assert.match(walk, /local motionRange = if UserInputService\.TouchEnabled then 135 else 180/);
  assert.match(walk, /local fullMotion = RunService:IsStudio\(\) or not motionEye/);
  assert.match(walk, /w\.trav = \(w\.trav or 0\) \+ walked\s+end\s+--[^\n]*\n\s+if fullMotion or \(motionEye - pos\)\.Magnitude < motionRange then/);
  assert.match(walk, /if fullMotion or \(motionEye - w\.base\.Position\)\.Magnitude < motionRange then/);
  assert.match(walk, /local close = not motionEye or \(motionEye - destination\)\.Magnitude < \(if UserInputService\.TouchEnabled then 105 else 155\)/);
  assert.match(walk, /if close and now >= w\.groundCheckAt then/);
  assert.match(walk, /local pivot = w\.base \* CFrame\.new\(0, w\.groundOffset \+ bob, d\) \* CFrame\.Angles\(0, w\.hd, 0\)\s+w\.model:PivotTo\(pivot\)/);
  assert.match(scene, /if math\.max\(sz\.X, sz\.Y, sz\.Z\) < 4 then\s+d\.CastShadow = false/);
});


test('건축 외벽색은 원본 지붕·창호를 덮지 않고 복원된 부위 재질을 유지한다', () => {
  const start = scene.indexOf('local function importedModel(');
  const end = scene.indexOf('-- 등불:', start);
  const importer = scene.slice(start, end);
  assert.match(importer, /if tint and not architecture and not preserveArchitectureTexture then/);
  assert.match(importer, /if architecture and importedWhite/);
  assert.match(importer, /if tint and asset:find\("roof", 1, true\) and not asset:find\("house", 1, true\) then/);
  assert.match(importer, /material, paint = Enum\.Material\.Glass/);
  assert.match(importer, /material, paint = Enum\.Material\.Metal/);
  const uniform = scene.slice(scene.indexOf('local function uniformMaterial('), scene.indexOf('local vacancyRate'));
  assert.match(uniform, /if not textured and \(p\.Material == Enum\.Material\.Plastic or p\.Material == Enum\.Material\.SmoothPlastic\)\s+and low >= 0\.78 and high - low <= 0\.14 then/);
  assert.match(uniform, /local textured = sa ~= nil or p\.MaterialVariant ~= ""/);
  assert.match(uniform, /ch:IsA\("SpecialMesh"\) and ch\.TextureId ~= ""/);
  assert.match(uniform, /p\.Material = selected/);
});


test('창호와 현관은 주택 표면에 붙이며 회전된 실제 경계와 두께를 반영한다', () => {
  const start = scene.indexOf('-- [입면 정밀 배치]');
  const block = scene.slice(start, scene.indexOf('local size = math.max(w, d) * variation', start));
  assert.ok(start >= 0);
  assert.match(block, /table\.insert\(facadeDetails, trim\)/);
  assert.match(block, /table\.insert\(facadeDetails, doorway\)/);
  assert.match(block, /wallProbe\.FilterType = Enum\.RaycastFilterType\.Include/);
  assert.match(block, /wallProbe\.FilterDescendantsInstances = \{ mesh \}/);
  assert.match(block, /math\.abs\(houseCF\.RightVector\.Z\) \* houseSize\.X/);
  assert.match(block, /math\.abs\(detailCF\.LookVector\.Z\) \* detailSize\.Z/);
  assert.match(block, /hit\.Normal\.Z \* front >= 0\.5/);
  assert.match(block, /hit\.Position\.Z \+ front \* math\.max\(0, detailHalfDepth - 0\.08\)/);
  assert.match(block, /detail:PivotTo\(CFrame\.new\(0, 0, targetZ - detailCF\.Position\.Z\) \* detail:GetPivot\(\)\)/);
  assert.match(block, /else\s+--[^\n]+\n\s+detail:Destroy\(\)/);
  for (const front of [-1, 1]) for (const halfDepth of [0.05, 0.5, 2]) {
    const wallZ = 10 * front;
    const targetZ = wallZ + front * Math.max(0, halfDepth - 0.08);
    assert.ok(Math.abs((targetZ - front * halfDepth) - wallZ) <= 0.0800000001);
  }
});
