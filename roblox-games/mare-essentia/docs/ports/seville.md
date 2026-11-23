# 세비야 (seville) — ChatGPT 작업 지시서

> 이 문서 하나로 이 항구의 3D 에셋 제작과 마을 배치를 진행한다. 공통 규칙은 `docs/PORT_VILLAGE_PROMPTS.md`.

## 0. 작업 환경

- 게임: Mare Essentia (Roblox, Luau). 배경 1500~1800년 대항해시대. 저장소 `roblox-games/mare-essentia`
- 마을 생성 코드: `src/ReplicatedStorage/Shared/PortScene.luau` (마을 짓기 `densify`, 대표 경관 `placeSignature`/`SIG`, 기념물 `placeLandmarks`)
- 항구 정체성 데이터: `src/ReplicatedStorage/Shared/PortIdentity.luau` (아래 표의 값이 여기 있음)
- 에셋 등록: 파일을 `assets/inbox/Town/<asset_id>.glb`(라이선스 `<asset_id>.license.json` 동봉)에 넣고 main 반영 → `owner-mare-essentia-assets` 워크플로가 Roblox 등록 → 코드에서 `AssetIds["Town/<asset_id>"]`, 배치는 `importedModel(folder, "Town", "<asset_id>", 위치, 크기)`
- 지키기: 저장 데이터·경제 수치·보행 충돌벽 변경 금지. 원본 없으면 기존 승인 에셋으로 대체(이미 있는 방식).
- 코드 한도: `Game.client.luau` 맨 바깥에 `local` 새로 만들기 금지(레지스터 200 한도 → 화면 안 뜸). `do ... end` 또는 `H.이름`에. `tests/run.sh`가 검사.
- 에셋 규칙: `docs/RULES.md` 를 먼저 읽는다. 3D는 **승인 원본 에셋을 가공**해서 만든다(아래 프롬프트 = 가공 목표). `.license.json`에 원본 이름·URL·라이선스·"derived"·가공 내용 기록. 원본 없이 처음부터 AI 생성은 보류.
- 색감: 지상전·마을 나무/덤불은 옅은 청록 단색 금지 — 잎·줄기·그늘 색을 나누고 지역 기후 색(열대 진녹, 건조 올리브, 한대 청록)을 쓴다.
- 검증: `LUAU_DIR=... bash tests/run.sh`(스모크 905건), Studio `tools/devloop/studio-scripts/mare-town.json` 항공·광장 촬영

## 1. 항구 정체성

| 항목 | 값 |
|---|---|
| 상징물 | 히랄다 종탑 (`lm_seville_giralda`, 종류 campanile) |
| 건축 | Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios (지붕 hip, 벽 stucco) |
| 구획 | 골목형: 구불구불한 골목, 불규칙 필지 |
| 광장 | 분수 광장 — plaza with tiled fountain and orange trees |
| 길 1→5단계 | dirt → gravel → cobble → flagstone → paved |
| 밤 조명 | oil_lantern |
| 길 밖 땅 / 날씨 | red_earth / dust |
| 특산물(교역품) | wine, sugar, leather, pepper |

## 2. 발전도별 배치 지시

| 단계 | 필지 | 무엇을 어디에 |
|---|---|---|
| 1 | 6 | 부두 옆 오두막 `seville_house_1` 6채, 길 dirt, 횃불 2~3. 외곽: wine 관련 텃밭/작업장 1 |
| 2 | 10 | 부두와 마을 사이 중앙 광장 + `seville_plaza_center`. 광장 옆에 `seville_landmark_base`(공사 중). 가판대 `seville_stall_*` 2개 |
| 3 | 14 | 구역 분리: 시장(광장 동쪽·부두 쪽) / 종교·관청(광장 반대편) / 주거(골목) / 공방(외곽 강·물가). `seville_signature_1~3` 구역별 1채, `seville_workshop_*` 공방 구역, 가로등 `seville_street_lamp` 길 3칸마다, 간판 `seville_shop_sign` |
| 4 | 18 | `seville_landmark_full`로 교체, `seville_house_2`(2층 상점) 큰길 앞, 창고 `seville_warehouse_stock`(재고 단계) 부두 뒤, 가로등 2칸마다 |
| 5 | 24 | `seville_house_3`(3층) 광장 둘레, 외곽 구역 신설, 가로등 모든 길, 농촌 가공소 |

- 건물은 중앙에 몰지 말고 구역별로 나눈다. 광장 → 큰길 → 골목 순으로 밀도가 낮아지게.
- 같은 집 연속 배치 금지(색 슬롯·회전·높이 변형). 땅은 길(포장)과 길 밖(기후 재질)을 구분.

## 3. 3D 에셋 프롬프트

모든 프롬프트는 공통 문구 포함(그대로 3D 생성 도구에 붙여 넣기).

### `seville_landmark_base` — 2단계 상징물 기초(공사 중)
- 분류 landmark · 등장 2단계 · 크기 40x40x30 · 폴리곤 ≤ 15k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Under-construction version of Giralda-style brick bell tower: lower half built, wooden scaffolding, cranes, stone blocks on ground.
```

### `seville_landmark_full` — 4단계 상징물 완성
- 분류 landmark · 등장 4단계 · 크기 40x40x70 · 폴리곤 ≤ 25k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Completed Giralda-style brick bell tower, the city's signature landmark, ornate but game-readable, weathered stone.
```

### `seville_house_1` — 1단계 주택 변형 1
- 분류 house · 등장 1단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. 1-storey Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios, humble, small yard, wooden fence. Provide 3 colour-variant material slots.
```

### `seville_house_2` — 3단계 주택 변형 2
- 분류 house · 등장 3단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. 2-storey Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios, shop on ground floor, awning. Provide 3 colour-variant material slots.
```

### `seville_house_3` — 5단계 주택 변형 3
- 분류 house · 등장 5단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. 3-storey Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios, wealthy merchant house, decorative trim. Provide 3 colour-variant material slots.
```

### `seville_signature_1` — 3단계 구역 특산 건물
- 분류 district · 등장 3단계 · 크기 30x24x24 · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. House of Trade (Casa de Contratación) arcaded building, in local style: Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios.
```

### `seville_signature_2` — 3단계 구역 특산 건물
- 분류 district · 등장 3단계 · 크기 30x24x24 · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. olive oil press house, in local style: Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios.
```

### `seville_signature_3` — 3단계 구역 특산 건물
- 분류 district · 등장 3단계 · 크기 30x24x24 · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Torre del Oro riverside tower wharf, in local style: Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios.
```

### `seville_plaza_center` — 2단계 중앙 광장 중심물
- 분류 plaza · 등장 2단계 · 크기 20x20x10 · 폴리곤 ≤ 5k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. plaza with tiled fountain and orange trees, cobbled base, benches around.
```

### `seville_street_lamp` — 3단계 가로등(밤 발광)
- 분류 lamp · 등장 3단계 · 크기 2x2x12 · 폴리곤 ≤ 1.5k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. wrought-iron oil street lantern on a post, glass panes, warm glow, 12 studs tall, emissive glass material slot for night.
```

### `seville_shop_sign` — 상점 그림 간판 세트
- 분류 sign · 등장 3단계 · 크기 3x0.5x3 · 폴리곤 ≤ 1k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. set of 6 pictorial painted tile signs (no text): fish, barrel, cloth roll, bread, anvil, key. No letters.
```

### `seville_stall_wine` — 특산물 가판대: wine
- 분류 goods · 등장 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Market stall with canopy displaying oak wine barrels and clay amphorae, local style of 세비야.
```

### `seville_workshop_wine` — 특산물 공방: wine
- 분류 workshop · 등장 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. wine press house with a big wooden screw press and barrel cellar door, built in local style: Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios. Include worker spots and tools.
```

### `seville_stall_sugar` — 특산물 가판대: sugar
- 분류 goods · 등장 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Market stall with canopy displaying sugar loaves in paper cones and sugar sacks, local style of 세비야.
```

### `seville_workshop_sugar` — 특산물 공방: sugar
- 분류 workshop · 등장 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. sugar boiling house with cane crusher and chimney, built in local style: Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios. Include worker spots and tools.
```

### `seville_stall_leather` — 특산물 가판대: leather
- 분류 goods · 등장 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Market stall with canopy displaying tanned leather hides hanging and saddles, local style of 세비야.
```

### `seville_workshop_leather` — 특산물 공방: leather
- 분류 workshop · 등장 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. tannery with lime pits and hanging hides, built in local style: Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios. Include worker spots and tools.
```

### `seville_stall_pepper` — 특산물 가판대: pepper
- 분류 goods · 등장 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Market stall with canopy displaying sacks of black peppercorns and pepper vines bundle, local style of 세비야.
```

### `seville_workshop_pepper` — 특산물 공방: pepper
- 분류 workshop · 등장 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. pepper drying platform with poles and sacks, built in local style: Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios. Include worker spots and tools.
```

### `seville_warehouse_stock` — 창고 마당 재고 3단계
- 분류 goods · 등장 2단계 · 크기 20x16x10 · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Warehouse yard with 3 stacking states (low / medium / full) of crates, barrels and sacks for wine, sugar, leather.
```

## 4. 완료 체크

- [ ] 에셋 파일·라이선스 inbox 등록, `AssetIds` 반영 확인
- [ ] 단계 1~5 Studio 항공 사진에서 구역 분리·광장·상징물 확인
- [ ] 스모크 905건·로직 테스트 통과
