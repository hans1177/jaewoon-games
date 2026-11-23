# 리스본 (lisbon) — ChatGPT 작업 지시서

> 이 문서 하나로 이 항구의 3D 에셋 제작과 마을 배치를 진행한다. 공통 규칙은 `docs/PORT_VILLAGE_PROMPTS.md`.

## 0. 작업 환경

- 게임: Mare Essentia (Roblox, Luau). 배경 1500~1800년 대항해시대. 저장소 `roblox-games/mare-essentia`
- 마을 생성 코드: `src/ReplicatedStorage/Shared/PortScene.luau` (마을 짓기 `densify`, 대표 경관 `placeSignature`/`SIG`, 기념물 `placeLandmarks`)
- 항구 정체성 데이터: `src/ReplicatedStorage/Shared/PortIdentity.luau` (아래 표의 값이 여기 있음)
- 에셋 등록: 파일을 `assets/inbox/Town/<asset_id>.glb`(라이선스 `<asset_id>.license.json` 동봉)에 넣고 main 반영 → `owner-mare-essentia-assets` 워크플로가 Roblox 등록 → 코드에서 `AssetIds["Town/<asset_id>"]`, 배치는 `importedModel(folder, "Town", "<asset_id>", 위치, 크기)`
- 지키기: 저장 데이터·경제 수치·보행 충돌벽 변경 금지. 원본 없으면 기존 승인 에셋으로 대체(이미 있는 방식).
- 코드 한도: `Game.client.luau` 맨 바깥에 `local` 새로 만들기 금지(레지스터 200 한도 → 화면 안 뜸). `do ... end` 또는 `H.이름`에. `tests/run.sh`가 검사.
- 에셋 규칙: `docs/RULES.md` 를 먼저 읽는다(라이선스 `.license.json` 필수, 출처·제작 방식 기록).
- 색감: 지상전·마을 나무/덤불은 옅은 청록 단색 금지 — 잎·줄기·그늘 색을 나누고 지역 기후 색(열대 진녹, 건조 올리브, 한대 청록)을 쓴다.
- 검증: `LUAU_DIR=... bash tests/run.sh`(스모크 905건), Studio `tools/devloop/studio-scripts/mare-town.json` 항공·광장 촬영

## 1. 항구 정체성

| 항목 | 값 |
|---|---|
| 상징물 | 벨렝 탑 (`lm_lisbon_belem`, 종류 tower) |
| 건축 | Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies (지붕 hip, 벽 stucco) |
| 구획 | 계단식: 언덕 등고선 따라 계단 단지, 위로 갈수록 종교·관청 |
| 광장 | 연병장 광장 — riverside parade square with arcades |
| 길 1→5단계 | dirt → gravel → cobble → cobble → paved |
| 밤 조명 | oil_lantern |
| 길 밖 땅 / 날씨 | red_earth / puddles |
| 특산물(교역품) | salt, sugar, spice, porcelain, pepper |

## 2. 발전도별 배치 지시

| 단계 | 필지 | 무엇을 어디에 |
|---|---|---|
| 1 | 6 | 부두 옆 오두막 `lisbon_house_1` 6채, 길 dirt, 횃불 2~3. 외곽: salt 관련 텃밭/작업장 1 |
| 2 | 10 | 부두와 마을 사이 중앙 광장 + `lisbon_plaza_center`. 광장 옆에 `lisbon_landmark_base`(공사 중). 가판대 `lisbon_stall_*` 2개 |
| 3 | 14 | 구역 분리: 시장(광장 동쪽·부두 쪽) / 종교·관청(광장 반대편) / 주거(골목) / 공방(외곽 강·물가). `lisbon_signature_1~3` 구역별 1채, `lisbon_workshop_*` 공방 구역, 가로등 `lisbon_street_lamp` 길 3칸마다, 간판 `lisbon_shop_sign` |
| 4 | 18 | `lisbon_landmark_full`로 교체, `lisbon_house_2`(2층 상점) 큰길 앞, 창고 `lisbon_warehouse_stock`(재고 단계) 부두 뒤, 가로등 2칸마다 |
| 5 | 24 | `lisbon_house_3`(3층) 광장 둘레, 외곽 구역 신설, 가로등 모든 길, 농촌 가공소 |

- 건물은 중앙에 몰지 말고 구역별로 나눈다. 광장 → 큰길 → 골목 순으로 밀도가 낮아지게.
- 같은 집 연속 배치 금지(색 슬롯·회전·높이 변형). 땅은 길(포장)과 길 밖(기후 재질)을 구분.

## 3. 3D 에셋 프롬프트

모든 프롬프트는 공통 문구 포함(그대로 3D 생성 도구에 붙여 넣기).

### `lisbon_landmark_base` — 2단계 상징물 기초(공사 중)
- 분류 landmark · 등장 2단계 · 크기 40x40x30 · 폴리곤 ≤ 15k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Under-construction version of Manueline fortified river tower with ornate stonework: lower half built, wooden scaffolding, cranes, stone blocks on ground.
```

### `lisbon_landmark_full` — 4단계 상징물 완성
- 분류 landmark · 등장 4단계 · 크기 40x40x70 · 폴리곤 ≤ 25k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Completed Manueline fortified river tower with ornate stonework, the city's signature landmark, ornate but game-readable, weathered stone.
```

### `lisbon_house_1` — 1단계 주택 변형 1
- 분류 house · 등장 1단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. 1-storey Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies, humble, small yard, wooden fence. Provide 3 colour-variant material slots.
```

### `lisbon_house_2` — 3단계 주택 변형 2
- 분류 house · 등장 3단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. 2-storey Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies, shop on ground floor, awning. Provide 3 colour-variant material slots.
```

### `lisbon_house_3` — 5단계 주택 변형 3
- 분류 house · 등장 5단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. 3-storey Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies, wealthy merchant house, decorative trim. Provide 3 colour-variant material slots.
```

### `lisbon_signature_1` — 3단계 구역 특산 건물
- 분류 district · 등장 3단계 · 크기 30x24x24 · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. navigation school with armillary sphere, in local style: Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies.
```

### `lisbon_signature_2` — 3단계 구역 특산 건물
- 분류 district · 등장 3단계 · 크기 30x24x24 · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. spice warehouse (Casa da Índia), in local style: Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies.
```

### `lisbon_signature_3` — 3단계 구역 특산 건물
- 분류 district · 등장 3단계 · 크기 30x24x24 · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. monastery cloister, in local style: Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies.
```

### `lisbon_plaza_center` — 2단계 중앙 광장 중심물
- 분류 plaza · 등장 2단계 · 크기 20x20x10 · 폴리곤 ≤ 5k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. riverside parade square with arcades, cobbled base, benches around.
```

### `lisbon_street_lamp` — 3단계 가로등(밤 발광)
- 분류 lamp · 등장 3단계 · 크기 2x2x12 · 폴리곤 ≤ 1.5k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. wrought-iron oil street lantern on a post, glass panes, warm glow, 12 studs tall, emissive glass material slot for night.
```

### `lisbon_shop_sign` — 상점 그림 간판 세트
- 분류 sign · 등장 3단계 · 크기 3x0.5x3 · 폴리곤 ≤ 1k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. set of 6 pictorial azulejo tile signs (no text): fish, barrel, cloth roll, bread, anvil, key. No letters.
```

### `lisbon_stall_salt` — 특산물 가판대: salt
- 분류 goods · 등장 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Market stall with canopy displaying white salt cones and wooden salt tubs, local style of 리스본.
```

### `lisbon_workshop_salt` — 특산물 공방: salt
- 분류 workshop · 등장 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. salt works shed beside shallow evaporation pans, built in local style: Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies. Include worker spots and tools.
```

### `lisbon_stall_sugar` — 특산물 가판대: sugar
- 분류 goods · 등장 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Market stall with canopy displaying sugar loaves in paper cones and sugar sacks, local style of 리스본.
```

### `lisbon_workshop_sugar` — 특산물 공방: sugar
- 분류 workshop · 등장 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. sugar boiling house with cane crusher and chimney, built in local style: Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies. Include worker spots and tools.
```

### `lisbon_stall_spice` — 특산물 가판대: spice
- 분류 goods · 등장 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Market stall with canopy displaying open burlap sacks of colourful spices with brass scoops, local style of 리스본.
```

### `lisbon_workshop_spice` — 특산물 공방: spice
- 분류 workshop · 등장 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. spice sorting warehouse with weighing scales, built in local style: Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies. Include worker spots and tools.
```

### `lisbon_stall_porcelain` — 특산물 가판대: porcelain
- 분류 goods · 등장 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Market stall with canopy displaying blue-and-white porcelain vases and bowls in straw, local style of 리스본.
```

### `lisbon_workshop_porcelain` — 특산물 공방: porcelain
- 분류 workshop · 등장 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. climbing kiln (multi-chamber) with pottery workshop, built in local style: Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies. Include worker spots and tools.
```

### `lisbon_stall_pepper` — 특산물 가판대: pepper
- 분류 goods · 등장 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Market stall with canopy displaying sacks of black peppercorns and pepper vines bundle, local style of 리스본.
```

### `lisbon_workshop_pepper` — 특산물 공방: pepper
- 분류 workshop · 등장 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. pepper drying platform with poles and sacks, built in local style: Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies. Include worker spots and tools.
```

### `lisbon_warehouse_stock` — 창고 마당 재고 3단계
- 분류 goods · 등장 2단계 · 크기 20x16x10 · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Warehouse yard with 3 stacking states (low / medium / full) of crates, barrels and sacks for salt, sugar, spice.
```

## 4. 완료 체크

- [ ] 에셋 파일·라이선스 inbox 등록, `AssetIds` 반영 확인
- [ ] 단계 1~5 Studio 항공 사진에서 구역 분리·광장·상징물 확인
- [ ] 스모크 905건·로직 테스트 통과
