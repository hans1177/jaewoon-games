# 헤시피 (recife) — 항구 작업 지시서

> 공통 규칙: `docs/RULES.md`(원본 가공·라이선스·코드 한도) → `docs/PORT_VILLAGE_PROMPTS.md`. 이 문서만으로 이 항구의 테마·왕궁·방문 건물을 만든다.

## 1. 항구 테마

| 항목 | 값 |
|---|---|
| 문화권 | 스페인·포르투갈 식민지 (`colonial`) |
| 나라 | brazil |
| 기후 | 열대 — tropical palms, heavy rain, deep green foliage |
| 테마 | **직물 항구** — weaving workshops, dye works and cloth hall |
| 특산물 | sugar, brazilwood, cotton |
| 건축 | Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades |
| 지붕·벽 | flat · stucco |
| 광장 | parade |
| 길 1→5단계 | sand → dirt → gravel → cobble → paved |
| 밤 조명 | oil_lantern |
| 상징물 | Baroque colonial cathedral facade with twin towers (2단계 공사 중 → 4단계 완성) |
| 조선소 | 있음 |
| 왕궁 | 없음 → 5단계에 총독 관저 |

## 2. 발전도별 마을

| 단계 | 마을 모습 | 새로 방문 가능 |
|---|---|---|
| 1 개척 | 오두막 6채·흙길·횃불, 부두 옆 교역소·주점·항만청 | 교역소, 주점, 항만청, 조선소 |
| 2 마을 | 광장(parade)·상징물 기초, 집 10채, 큰길 dirt | 학자의 서재, 전투 본부 |
| 3 읍 | 시장·종교·주거·공방 구역 분리, 직물 항구 특색 공방, 가로등 3칸마다 | 외교관 거처, 은행 |
| 4 도시 | 상징물 완성, 2층 상점 주택, 창고 마당, 길 cobble, 가로등 2칸마다 | - |
| 5 대도시 | 3층 주택·외곽 구역, 길 paved, 모든 길 가로등, 농촌 가공소 | 총독 관저 |

## 3. 방문 가능 건물 (외형·내부·기능)

### 교역소 — 1단계부터
- 기능: 상품 매입·판매, 시세 비교
- 외형 단계: ① open-air trading post with awning and scales → ③ covered market hall with arcades → ⑤ grand merchant exchange with columns and clock (모두 스페인·포르투갈 식민지 양식)
- 내부: 저울·장부 책상·견본 상품 선반·시세 칠판(그림), 특산물 견본 진열, 거래 상인 2명 — 스페인·포르투갈 식민지 실내 양식(바닥·조명 oil_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·직물 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `recife_trade_1` — 교역소 외형 1단계
- building · 1단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. open-air trading post with awning and scales, a visitable 교역소 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_trade_2` — 교역소 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. covered market hall with arcades, a visitable 교역소 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_trade_3` — 교역소 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. grand merchant exchange with columns and clock, a visitable 교역소 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

### 주점 — 1단계부터
- 기능: 동료 영입, 소문·의뢰, 카드 대결
- 외형 단계: ① small tavern shack with hanging sign → ③ two-storey inn with stable yard → ⑤ grand inn with balconies and courtyard (모두 스페인·포르투갈 식민지 양식)
- 내부: 긴 나무 탁자·술통 카운터·벽난로/화덕·소문 게시판·카드 탁자, 2층 숙소 계단 — 스페인·포르투갈 식민지 실내 양식(바닥·조명 oil_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·직물 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `recife_tavern_1` — 주점 외형 1단계
- building · 1단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. small tavern shack with hanging sign, a visitable 주점 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_tavern_2` — 주점 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. two-storey inn with stable yard, a visitable 주점 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_tavern_3` — 주점 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. grand inn with balconies and courtyard, a visitable 주점 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

### 항만청 — 1단계부터
- 기능: 출항·항로·지도, 입항세
- 외형 단계: ① dock office hut beside the pier → ③ customs house with flag → ⑤ admiralty building with signal mast and arcade (모두 스페인·포르투갈 식민지 양식)
- 내부: 대형 해도 탁자·항로 지도 벽·입항 장부·나침반 진열·창밖 부두 전망 — 스페인·포르투갈 식민지 실내 양식(바닥·조명 oil_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·직물 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `recife_harbor_1` — 항만청 외형 1단계
- building · 1단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. dock office hut beside the pier, a visitable 항만청 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_harbor_2` — 항만청 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. customs house with flag, a visitable 항만청 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_harbor_3` — 항만청 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. admiralty building with signal mast and arcade, a visitable 항만청 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

### 조선소 — 1단계부터
- 기능: 배 구매·개조·수리·보급 (조선소 있는 항구만)
- 외형 단계: ① open slipway with timber shed → ③ covered slipways with rope walk → ⑤ dry dock arsenal with cranes and warehouses (모두 스페인·포르투갈 식민지 양식)
- 내부: 건조 중인 선체 골조·밧줄 더미·돛천 작업대·대포 진열·목재 적치 — 스페인·포르투갈 식민지 실내 양식(바닥·조명 oil_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·직물 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `recife_yard_1` — 조선소 외형 1단계
- building · 1단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. open slipway with timber shed, a visitable 조선소 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_yard_2` — 조선소 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. covered slipways with rope walk, a visitable 조선소 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_yard_3` — 조선소 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. dry dock arsenal with cranes and warehouses, a visitable 조선소 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

### 학자의 서재 — 2단계부터
- 기능: 지식 보고·연구·백과
- 외형 단계: ① scribe's room in a townhouse → ③ library with reading hall → ⑤ academy with observatory dome (모두 스페인·포르투갈 식민지 양식)
- 내부: 책장 벽·지구의·천체 관측기구·표본 상자·보고서 책상, 5단계 관측 돔 — 스페인·포르투갈 식민지 실내 양식(바닥·조명 oil_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·직물 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `recife_scholar_1` — 학자의 서재 외형 1단계
- building · 2단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. scribe's room in a townhouse, a visitable 학자의 서재 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_scholar_2` — 학자의 서재 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. library with reading hall, a visitable 학자의 서재 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_scholar_3` — 학자의 서재 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. academy with observatory dome, a visitable 학자의 서재 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

### 전투 본부 — 2단계부터
- 기능: 해적 사냥·함대전·지상 탐험·카드 대결
- 외형 단계: ① watch post with palisade → ③ barracks with drill yard → ⑤ naval command fortress with bastions (모두 스페인·포르투갈 식민지 양식)
- 내부: 무기 거치대·작전 지도 탁자·훈련장 허수아비·함대 모형·카드 대결 탁자 — 스페인·포르투갈 식민지 실내 양식(바닥·조명 oil_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·직물 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `recife_battle_1` — 전투 본부 외형 1단계
- building · 2단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. watch post with palisade, a visitable 전투 본부 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_battle_2` — 전투 본부 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. barracks with drill yard, a visitable 전투 본부 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_battle_3` — 전투 본부 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. naval command fortress with bastions, a visitable 전투 본부 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

### 외교관 거처 — 3단계부터
- 기능: 나라 정세·관계·선물·개입
- 외형 단계: ① consul's house with national flags → ③ consulate with walled garden → ⑤ embassy quarter with several flag houses (모두 스페인·포르투갈 식민지 양식)
- 내부: 여러 나라 깃발·선물 진열장·협상 탁자·국력 순위 게시판 — 스페인·포르투갈 식민지 실내 양식(바닥·조명 oil_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·직물 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `recife_diplomacy_1` — 외교관 거처 외형 1단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. consul's house with national flags, a visitable 외교관 거처 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_diplomacy_2` — 외교관 거처 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. consulate with walled garden, a visitable 외교관 거처 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_diplomacy_3` — 외교관 거처 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. embassy quarter with several flag houses, a visitable 외교관 거처 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

### 은행 — 3단계부터
- 기능: 예금·대출·투자 (3단계부터 또는 지정 항구)
- 외형 단계: ① money changer's counting house → ③ stone bank with vault → ⑤ exchange bank with trading floor (모두 스페인·포르투갈 식민지 양식)
- 내부: 금고 문·환전 카운터·주화 저울·대출 장부·경비병 — 스페인·포르투갈 식민지 실내 양식(바닥·조명 oil_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·직물 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `recife_bank_1` — 은행 외형 1단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. money changer's counting house, a visitable 은행 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_bank_2` — 은행 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stone bank with vault, a visitable 은행 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

#### `recife_bank_3` — 은행 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. exchange bank with trading floor, a visitable 은행 building for a port game, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Clear door, readable sign shape (no text).
```

### 총독 관저 — 5단계
- 기능: 알현·작위·국가 의뢰
- 외형: viceregal palace with arcade on the plaza de armas
- 내부 방: 집무실, 알현실, 문서고, 정원
- 크기: 마을 건물의 3~4배, 단 마을을 가리지 않게 마을 뒤쪽 언덕·물가에 둔다

#### `recife_palace` — 총독 관저 외형
- palace · 5단계 · 크기 80x60x40 · 폴리곤 ≤ 40k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. viceregal palace with arcade on the plaza de armas. Royal/governor seat of 헤시피, grand but game-readable, with a ceremonial entrance and courtyard.
```

## 4. 건축 시뮬레이션 (단계별 건물 카탈로그)

마을 경제 시뮬(인구·번영·자금)이 건설을 결정하면 아래 순서로 **공사 현장 → 완공**이 실제로 보인다. 단계가 오를수록 새 건물 종류가 열린다.

| 단계 | 건물 | 분류 | 마을 효과 |
|---|---|---|---|
| 1 | 오두막 | 주거 | 인구 +2 |
| 1 | 우물 | 공공 | 주민 행복 +, 화재 진압 |
| 1 | 부두 창고 | 항만 | 하역 속도 + |
| 1 | 텃밭 | 농업 | 식량 + |
| 1 | 작은 예배당 | 종교 | 신앙 + |
| 2 | 연립 주택 | 주거 | 인구 +6 |
| 2 | 빵집·화덕 | 식량 | 식량 가공 + |
| 2 | 대장간 | 공방 | 도구·무기 + |
| 2 | 목공소 | 공방 | 건설 속도 + |
| 2 | 곡물 창고 | 저장 | 흉년 대비 + |
| 2 | 방앗간 | 생산 | 곡물 가공 + |
| 2 | 장터 | 상업 | 교역 + |
| 2 | 망루 | 방어 | 해적 경계 + |
| 3 | 성당 | 종교 | 신앙·명성 + |
| 3 | 학당 | 교육 | 연구 + |
| 3 | 의원·병원 | 의료 | 질병 감소 |
| 3 | 대형 창고 | 저장 | 재고 한도 + |
| 3 | 밧줄 공장 | 조선 | 배 수리비 - |
| 3 | 양조장 | 식량 | 주민 만족 + |
| 3 | 공중목욕탕 | 공공 | 위생 + |
| 3 | 등대 | 항만 | 야간 입항 안전 |
| 4 | 시청·관아 | 행정 | 세금·질서 + |
| 4 | 대병원 | 의료 | 질병 크게 감소 |
| 4 | 도서관 | 교육 | 연구 ++ |
| 4 | 세관 | 항만 | 관세 수입 + |
| 4 | 성벽·포대 | 방어 | 해적·전쟁 방어 |
| 4 | 극장 | 문화 | 명성·만족 + |
| 4 | 공방 거리 | 공방 | 특산물 가공 + |
| 5 | 대학·학술원 | 교육 | 연구 +++ |
| 5 | 증권거래소 | 상업 | 투자·주식 |
| 5 | 해군 공창 | 조선 | 대형선 건조 |
| 5 | 식물원 | 과학 | 연구·명성 + |
| 5 | 외곽 신시가지 | 주거 | 인구 +20 |

### 공사 과정 (스페인·포르투갈 식민지 방식)

- 주재료: stucco over stone, clay tile
- 공정: 석재 → 회칠 → 철 발코니
- 일꾼: 솜브레로 인부, 노새 수레
- 완공 의식: 사제 축복·종

| 공정 | 화면에 보이는 것 | 일꾼 동작 | 걸리는 시간(게임일) |
|---|---|---|---|
| ① 측량 | 말뚝·줄 띄우기, 설계도 탁자 | 감독이 도면 확인, 측량꾼 줄 당기기 | 1 |
| ② 터 닦기 | 흙 파기, 흙더미, 수레 | 삽질·수레 끌기(2~3명) | 1~2 |
| ③ 기초 | 주춧돌/말뚝, 재료 더미(stucco over stone) | 돌 나르기·망치질 | 2 |
| ④ 골조·비계 | 기둥·들보 + 나무 비계, 도르래 기중기 | 목수 톱질·망치, 짐꾼 사다리 오르기 | 2~3 |
| ⑤ 벽 | 벽이 아래부터 차오름(절반→가득) | 석공/미장 동작 | 2~3 |
| ⑥ 지붕 | 지붕틀 → 기와/이엉 잇기 | 지붕 위 일꾼 2명 | 2 |
| ⑦ 마감 | 창·문·간판·색칠, 비계 철거 | 붓질·청소 | 1 |
| ⑧ 완공 | 비계 사라짐, 깃발·꽃장식, 사제 축복·종 | 주민 모여 박수, 감독 인사 | 행사 1일 |

- 일꾼 수: 1단계 건물 2명 → 5단계 건물 6~8명. 감독 1명(도면), 목수·석공·짐꾼 구분.
- 공사 중 소리: 망치·톱·수레바퀴(기존 효과음). 밤에는 작업 중단, 현장 등불만.
- 자금 부족·흉년이면 공사 정지(비계만 남고 일꾼 없음). 재개되면 일꾼 복귀.
- 완공 순간: 건물 등장 연출(먼지 걷힘) + 알림 "○○ 완공" + 해당 효과 적용.

#### `recife_construction_kit` — 공사 현장 소품 세트
- construction · 1단계 · 크기 kit · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Construction site kit for 스페인·포르투갈 식민지 style: survey stakes and string, dirt piles, foundation stones, timber scaffold modules (1/2/3 floors), wooden pulley crane, material piles of stucco over stone, clay tile, wheelbarrow, ladder, plan table.
```

#### `recife_construction_stages` — 공사 단계 5개 메시
- construction · 1단계 · 크기 per building · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Generic building in 5 construction stages (foundation, frame+scaffold, half walls, roof framing, finished) in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. Each stage a separate mesh.
```

#### `recife_workers` — 공사 일꾼 복장 세트
- people · 1단계 · 크기 R15 outfits · 폴리곤 ≤ 4k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Construction worker outfit set (foreman with plan scroll, carpenter, mason, porter) for 스페인·포르투갈 식민지: 솜브레로 인부, 노새 수레. Period-accurate clothing accessories only (R15 layered).
```

#### `recife_bld_hut` — 오두막(주거) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. one-room hut with chimney and fenced yard, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_well` — 우물(공공) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stone well with wooden winch roof, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_dock_shed` — 부두 창고(항만) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. small wooden dock shed with crates, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_garden` — 텃밭(농업) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. fenced vegetable plots with scarecrow, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_chapel` — 작은 예배당(종교) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. small chapel with bell, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_house_row` — 연립 주택(주거) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. row of two-storey townhouses sharing walls, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_bakery` — 빵집·화덕(식량) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. bakery with brick oven chimney and bread rack, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_smithy` — 대장간(공방) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. smithy with open forge, anvil and bellows, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_carpenter` — 목공소(공방) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. carpenter's workshop with timber stacks and saw horse, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_granary` — 곡물 창고(저장) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. raised granary on stone legs, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_mill` — 방앗간(생산) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. watermill or windmill depending on terrain, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_market_stalls` — 장터(상업) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. cluster of canopy market stalls around a small square, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_watchtower` — 망루(방어) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. wooden coastal watchtower with signal brazier, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_temple` — 성당(종교) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stone church with bell tower, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_school` — 학당(교육) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. schoolhouse with bell and courtyard, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_infirmary` — 의원·병원(의료) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. infirmary with herb garden and beds, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_warehouse` — 대형 창고(저장) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. large stone warehouse with hoist beam and cart door, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_ropewalk` — 밧줄 공장(조선) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. long narrow ropewalk shed, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_brewery` — 양조장(식량) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. brewery/winery with vats and casks, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_bathhouse` — 공중목욕탕(공공) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. public bathhouse with domes or tiled roof, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_lighthouse` — 등대(항만) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stone lighthouse with lantern room, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_town_hall` — 시청·관아(행정) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. town hall / magistrate office with clock or drum tower, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_hospital` — 대병원(의료) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. large hospital around a cloister, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_library` — 도서관(교육) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. library with reading hall and tall windows, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_customs` — 세관(항만) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. customs house with arcade facing the quay, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_fort_wall` — 성벽·포대(방어) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stone harbour walls with gun battery and gate, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_theater` — 극장(문화) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. theatre / performance hall in local style, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_guild_row` — 공방 거리(공방) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. street of specialist workshops with signs, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_university` — 대학·학술원(교육) 5단계
- building · 5단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. university/academy with quadrangle and observatory dome, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_exchange` — 증권거래소(상업) 5단계
- building · 5단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stock exchange with courtyard and clock tower, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_arsenal` — 해군 공창(조선) 5단계
- building · 5단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. naval arsenal with dry docks and cranes, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_botanic` — 식물원(과학) 5단계
- building · 5단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. botanical garden with glasshouse, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_bld_suburb` — 외곽 신시가지(주거) 5단계
- building · 5단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. new suburb block with wider streets and gardens, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

## 5. 구획·주거·배치·주민 동선

| 구획 | 위치 | 열리는 단계 | 건물/필지 | 배치 소품 | 주민 직업 |
|---|---|---|---|---|---|
| 항만 구역 | 부두와 해안선 따라, 광장 동쪽 | 1 | 부두 창고·세관·선원 숙소·밧줄 공장 | 화물 상자·통·자루 더미, 기중기, 계류 말뚝, 그물, 수레, 갈매기 | 하역꾼·선원·세관원·어부·밧줄공 |
| 시장 구역 | 광장 둘레, 큰길 시작점 | 1 | 가판대 줄·상점 주택·교역소·여관 | 천막 가판대·특산물 진열·저울·바구니·손수레·간판·우물 | 상인·행상·짐꾼·손님·소매치기 경비 |
| 행정·종교 구역 | 광장 반대편 높은 곳(언덕이면 꼭대기) | 2 | 예배소→대사원·시청·학당·의원·도서관 | 종탑, 계단, 동상/분수, 벤치, 게시판, 화단 | 성직자·관리·학생·의사·경비병 |
| 공방 구역 | 물가/강가·바람 아래쪽 외곽(냄새·연기) | 2 | 대장간·목공소·무두질장·양조장·특산물 공방 | 작업대·재료 더미·화덕 연기·물레방아·건조대·폐자재 | 대장장이·목수·직공·도공·염색공·견습생 |
| 주거 구역 | 큰길 뒤 골목, 시장·공방 사이 | 1 | 노동자 오두막→장인 주택→상인 연립→부유층 저택 | 빨랫줄·화분·장작더미·닭장·벤치·놀이하는 아이·고양이 | 주부·아이·노인·야경꾼·물장수 |
| 부유층 구역 | 광장 가까운 조용한 언덕/물가 | 4 | 부유 상인 저택·정원 주택·관저 | 정원 담장·분수·마차·하인·화분 장식 | 상인 가족·하인·정원사·마부 |
| 농촌·목장 구역 | 마을 바깥 테두리 | 1 | 텃밭→밭·목초지·축사·방앗간·곡물 창고 | 울타리·건초더미·가축·허수아비·수로·농기구 | 농부·목동·방앗간지기·나무꾼 |
| 방어 구역 | 항구 입구 곶·성문 | 2 | 망루→포대·성벽·병영·전투 본부 | 대포·포탄 더미·깃발·초소·훈련 허수아비 | 병사·포수·보초·훈련 교관 |

**헤시피 특색** — 테마 *직물 항구*
- 시장: sugar, brazilwood, cotton 진열이 중심, 장날엔 가판대 2배
- 공방: sugar, cotton 공방이 줄지어 (연기·소리·작업 주민)
- 항만: 조선소와 밧줄 공장이 붙은 큰 항만
- 생활: 스페인·포르투갈 식민지 양식 집, 밤 조명 oil_lantern, 광장 parade

### 주거 등급 (구획 안에서 세분화)

| 등급 | 단계 | 형태 | 사는 사람 |
|---|---|---|---|
| 노동자 오두막 | 1 | 1-room cottage with small yard, shared well (스페인·포르투갈 식민지 양식) | 하역꾼·농부·어부 |
| 장인 주택 | 2 | 2-storey house with ground-floor workshop (스페인·포르투갈 식민지 양식) | 대장장이·목수·직공 |
| 상인 연립 | 3 | 3-storey townhouse with shop front and storage attic (스페인·포르투갈 식민지 양식) | 상인·선장 |
| 부유층 저택 | 4 | detached mansion with garden wall and courtyard (스페인·포르투갈 식민지 양식) | 대상인·관리 |
| 정원 빌라 | 5 | villa with formal garden on the outskirts (스페인·포르투갈 식민지 양식) | 귀족·은행가 |

- 배치 규칙: 광장→큰길→골목 순으로 높고 촘촘하게 → 낮고 성기게. 같은 집 연속 금지(색·높이·문 위치 변형).
- 공방 구역은 바람 아래·물가, 부유층은 조용한 언덕/물가, 농촌은 테두리. 구획 사이 작은 골목·계단·다리로 연결.

### 하루 동선 (주민 일정)

| 시간 | 움직임 |
|---|---|
| 새벽 5~7시 | 어부·하역꾼 집→부두, 빵집 화덕 불, 농부 집→밭, 종 울림 |
| 오전 7~12시 | 상인 집→시장 가판대, 장인 공방 작업, 학생 학당, 공사 현장 일꾼 출근 |
| 정오 | 광장 우물 물 긷기, 노점 식사, 휴식(더운 지역은 낮잠으로 거리 한산) |
| 오후 13~18시 | 하역·운반 수레(농촌→시장→부두), 관리 순찰, 아이들 골목 놀이 |
| 저녁 18~21시 | 주점 붐빔, 예배/기도, 가로등 점등꾼, 가족 귀가 |
| 밤 21~5시 | 야경꾼 순찰·등불, 주점 몇 명, 고양이·개, 공사 중단(현장 등불) |

- 스페인·포르투갈 식민지 생활 특색: 예배 시간·장날·축제일에 광장 인파 증가, 흉년엔 빈 가판대·줄 선 주민.

## 6. 날씨·바닥·파티클

기후 유형: **tropical**

| 날씨 | 바닥 표현 | 파티클·효과 |
|---|---|---|
| 소나기·몬순 | 길 웅덩이(물 반사), 흙길 진흙 바퀴자국, 지붕 물받이 낙수 | 굵은 빗줄기, 지붕 물튀김, 웅덩이 파문, 짙은 물안개 |
| 무더위 | 마른 흙길 갈라짐, 먼지 | 열기 아지랑이, 날벌레 |
| 태풍(드묾) | 쓰러진 가판대 천막, 흩어진 잎 | 강풍 비, 잎 날림, 파도 물보라 |

- 눈은 단계적으로 쌓인다(얇게→덮임→두껍게), 사람 다니는 길은 먼저 녹고 발자국 자국.
- 비 그친 뒤 웅덩이는 서서히 마른다(반사 강도 감소). 진흙길은 수레 바퀴자국이 남는다.
- 모바일은 파티클 수 절반, 원거리 바닥 효과 생략.

#### `recife_weather_ground` — 날씨 바닥 오버레이
- texture · 1단계 · 크기 1024 tile · 폴리곤 ≤ -
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Tileable ground overlay decals for tropical weather on dirt, gravel, cobble streets: puddles with reflections, wet sheen, wheel ruts in mud, snow cover (3 thickness levels), sand drift, frost. Alpha decals for overlay.
```

#### `recife_weather_props` — 날씨 소품 세트
- props · 1단계 · 크기 kit · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Weather props for 스페인·포르투갈 식민지: roof snow caps (3 sizes), icicles, gutter downspout splash, puddle meshes, awning rain drips, sand drift piles, covered market stall cloth.
```

#### `recife_district_props` — 구획 생활 소품 세트
- props · 1단계 · 크기 kit · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. District prop kit for 스페인·포르투갈 식민지 port: laundry lines, firewood stacks, chicken coop, flower pots, benches, wells, signposts, carts, barrels, market baskets, notice board, statue base.
```

#### `recife_house_worker` — 주거 노동자 오두막
- house · 1단계 · 크기 auto · 폴리곤 ≤ 7k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 1-room cottage with small yard, shared well, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. 3 colour slots.
```

#### `recife_house_artisan` — 주거 장인 주택
- house · 2단계 · 크기 auto · 폴리곤 ≤ 7k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 2-storey house with ground-floor workshop, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. 3 colour slots.
```

#### `recife_house_merchant` — 주거 상인 연립
- house · 3단계 · 크기 auto · 폴리곤 ≤ 7k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 3-storey townhouse with shop front and storage attic, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. 3 colour slots.
```

#### `recife_house_mansion` — 주거 부유층 저택
- house · 4단계 · 크기 auto · 폴리곤 ≤ 7k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. detached mansion with garden wall and courtyard, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. 3 colour slots.
```

#### `recife_house_villa` — 주거 정원 빌라
- house · 5단계 · 크기 auto · 폴리곤 ≤ 7k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. villa with formal garden on the outskirts, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades. 3 colour slots.
```

## 7. 마을 기본 에셋

#### `recife_landmark_base` — 상징물 공사 중
- landmark · 2단계 · 크기 40x40x30 · 폴리곤 ≤ 15k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Under-construction Baroque colonial cathedral facade with twin towers: lower half built, scaffolding, cranes, stone blocks.
```

#### `recife_landmark_full` — 상징물 완성
- landmark · 4단계 · 크기 40x40x70 · 폴리곤 ≤ 25k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Completed Baroque colonial cathedral facade with twin towers, signature landmark of 헤시피.
```

#### `recife_house_1` — 주택 1단계
- house · 1단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 1-storey Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades, humble, small yard. 3 colour-variant material slots.
```

#### `recife_house_2` — 주택 2단계
- house · 3단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 2-storey Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades, shop on ground floor. 3 colour-variant material slots.
```

#### `recife_house_3` — 주택 3단계
- house · 5단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 3-storey Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades, wealthy merchant house. 3 colour-variant material slots.
```

#### `recife_street_lamp` — 가로등
- lamp · 3단계 · 크기 2x2x12 · 폴리곤 ≤ 1.5k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. wrought-iron oil street lantern on a post, glass panes, warm glow, 12 studs tall, emissive glass slot.
```

#### `recife_stall_sugar` — 가판대 sugar
- goods · 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Market stall displaying sugar loaves in paper cones and sugar sacks, style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_workshop_sugar` — 공방 sugar
- workshop · 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. sugar boiling house with cane crusher and chimney, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_stall_cotton` — 가판대 cotton
- goods · 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Market stall displaying bales of raw white cotton, style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

#### `recife_workshop_cotton` — 공방 cotton
- workshop · 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. cotton gin shed and dye works with cloth drying lines, built in local style: Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades.
```

## 8. 완료 체크

- [ ] 에셋 `assets/inbox/Town/<asset_id>.glb` + `.license.json`(원본·derived)
- [ ] 단계 1~5 Studio 항공 사진: 구역 분리·광장·상징물·방문 건물 위치
- [ ] 공사 현장 ①~⑧ 공정과 일꾼 동작, 완공 연출 확인
- [ ] 구획 8종·주거 5등급·하루 동선 확인
- [ ] 날씨별 바닥(눈·웅덩이·진흙·모래)과 파티클 확인(모바일 절반)
- [ ] `tests/run.sh` 통과(코드 한도 포함)
