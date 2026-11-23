# 하코다테 (hakodate) — 항구 작업 지시서

> 공통 규칙: `docs/RULES.md`(원본 가공·라이선스·코드 한도) → `docs/PORT_VILLAGE_PROMPTS.md`. 이 문서만으로 이 항구의 테마·왕궁·방문 건물을 만든다.

## 1. 항구 테마

| 항목 | 값 |
|---|---|
| 문화권 | 일본 (`japan`) |
| 나라 | japan |
| 기후 | 온대 북부 — oak and beech, frequent rain |
| 테마 | **어업·염장 항구** — fish market hall, drying racks and salt works |
| 특산물 | fish, timber, fur |
| 건축 | Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts |
| 지붕·벽 | eave · wood |
| 광장 | quay |
| 길 1→5단계 | dirt → gravel → gravel → flagstone → flagstone |
| 밤 조명 | stone_lantern |
| 상징물 | castle keep (tenshu) on stone base or pagoda (2단계 공사 중 → 4단계 완성) |
| 조선소 | 없음(응급 수리만) |
| 왕궁 | 없음 → 5단계에 총독 관저 |

## 2. 발전도별 마을

| 단계 | 마을 모습 | 새로 방문 가능 |
|---|---|---|
| 1 개척 | 오두막 6채·흙길·횃불, 부두 옆 교역소·주점·항만청 | 교역소, 주점, 항만청 |
| 2 마을 | 광장(quay)·상징물 기초, 집 10채, 큰길 gravel | 학자의 서재, 전투 본부 |
| 3 읍 | 시장·종교·주거·공방 구역 분리, 어업·염장 항구 특색 공방, 가로등 3칸마다 | 외교관 거처, 은행 |
| 4 도시 | 상징물 완성, 2층 상점 주택, 창고 마당, 길 flagstone, 가로등 2칸마다 | - |
| 5 대도시 | 3층 주택·외곽 구역, 길 flagstone, 모든 길 가로등, 농촌 가공소 | 총독 관저 |

## 3. 방문 가능 건물 (외형·내부·기능)

### 교역소 — 1단계부터
- 기능: 상품 매입·판매, 시세 비교
- 외형 단계: ① open-air trading post with awning and scales → ③ covered market hall with arcades → ⑤ grand merchant exchange with columns and clock (모두 일본 양식)
- 내부: 저울·장부 책상·견본 상품 선반·시세 칠판(그림), 특산물 견본 진열, 거래 상인 2명 — 일본 실내 양식(바닥·조명 stone_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·어업·염장 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `hakodate_trade_1` — 교역소 외형 1단계
- building · 1단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. open-air trading post with awning and scales, a visitable 교역소 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_trade_2` — 교역소 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. covered market hall with arcades, a visitable 교역소 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_trade_3` — 교역소 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. grand merchant exchange with columns and clock, a visitable 교역소 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

### 주점 — 1단계부터
- 기능: 동료 영입, 소문·의뢰, 카드 대결
- 외형 단계: ① small tavern shack with hanging sign → ③ two-storey inn with stable yard → ⑤ grand inn with balconies and courtyard (모두 일본 양식)
- 내부: 긴 나무 탁자·술통 카운터·벽난로/화덕·소문 게시판·카드 탁자, 2층 숙소 계단 — 일본 실내 양식(바닥·조명 stone_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·어업·염장 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `hakodate_tavern_1` — 주점 외형 1단계
- building · 1단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. small tavern shack with hanging sign, a visitable 주점 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_tavern_2` — 주점 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. two-storey inn with stable yard, a visitable 주점 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_tavern_3` — 주점 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. grand inn with balconies and courtyard, a visitable 주점 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

### 항만청 — 1단계부터
- 기능: 출항·항로·지도, 입항세
- 외형 단계: ① dock office hut beside the pier → ③ customs house with flag → ⑤ admiralty building with signal mast and arcade (모두 일본 양식)
- 내부: 대형 해도 탁자·항로 지도 벽·입항 장부·나침반 진열·창밖 부두 전망 — 일본 실내 양식(바닥·조명 stone_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·어업·염장 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `hakodate_harbor_1` — 항만청 외형 1단계
- building · 1단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. dock office hut beside the pier, a visitable 항만청 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_harbor_2` — 항만청 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. customs house with flag, a visitable 항만청 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_harbor_3` — 항만청 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. admiralty building with signal mast and arcade, a visitable 항만청 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

### 학자의 서재 — 2단계부터
- 기능: 지식 보고·연구·백과
- 외형 단계: ① scribe's room in a townhouse → ③ library with reading hall → ⑤ academy with observatory dome (모두 일본 양식)
- 내부: 책장 벽·지구의·천체 관측기구·표본 상자·보고서 책상, 5단계 관측 돔 — 일본 실내 양식(바닥·조명 stone_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·어업·염장 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `hakodate_scholar_1` — 학자의 서재 외형 1단계
- building · 2단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. scribe's room in a townhouse, a visitable 학자의 서재 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_scholar_2` — 학자의 서재 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. library with reading hall, a visitable 학자의 서재 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_scholar_3` — 학자의 서재 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. academy with observatory dome, a visitable 학자의 서재 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

### 전투 본부 — 2단계부터
- 기능: 해적 사냥·함대전·지상 탐험·카드 대결
- 외형 단계: ① watch post with palisade → ③ barracks with drill yard → ⑤ naval command fortress with bastions (모두 일본 양식)
- 내부: 무기 거치대·작전 지도 탁자·훈련장 허수아비·함대 모형·카드 대결 탁자 — 일본 실내 양식(바닥·조명 stone_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·어업·염장 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `hakodate_battle_1` — 전투 본부 외형 1단계
- building · 2단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. watch post with palisade, a visitable 전투 본부 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_battle_2` — 전투 본부 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. barracks with drill yard, a visitable 전투 본부 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_battle_3` — 전투 본부 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. naval command fortress with bastions, a visitable 전투 본부 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

### 외교관 거처 — 3단계부터
- 기능: 나라 정세·관계·선물·개입
- 외형 단계: ① consul's house with national flags → ③ consulate with walled garden → ⑤ embassy quarter with several flag houses (모두 일본 양식)
- 내부: 여러 나라 깃발·선물 진열장·협상 탁자·국력 순위 게시판 — 일본 실내 양식(바닥·조명 stone_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·어업·염장 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `hakodate_diplomacy_1` — 외교관 거처 외형 1단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. consul's house with national flags, a visitable 외교관 거처 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_diplomacy_2` — 외교관 거처 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. consulate with walled garden, a visitable 외교관 거처 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_diplomacy_3` — 외교관 거처 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. embassy quarter with several flag houses, a visitable 외교관 거처 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

### 은행 — 3단계부터
- 기능: 예금·대출·투자 (3단계부터 또는 지정 항구)
- 외형 단계: ① money changer's counting house → ③ stone bank with vault → ⑤ exchange bank with trading floor (모두 일본 양식)
- 내부: 금고 문·환전 카운터·주화 저울·대출 장부·경비병 — 일본 실내 양식(바닥·조명 stone_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·어업·염장 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `hakodate_bank_1` — 은행 외형 1단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. money changer's counting house, a visitable 은행 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_bank_2` — 은행 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stone bank with vault, a visitable 은행 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

#### `hakodate_bank_3` — 은행 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. exchange bank with trading floor, a visitable 은행 building for a port game, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Clear door, readable sign shape (no text).
```

### 총독 관저 — 5단계
- 기능: 알현·작위·국가 의뢰
- 외형: daimyo residence with gate and garden
- 내부 방: 집무실, 알현실, 문서고, 정원
- 크기: 마을 건물의 3~4배, 단 마을을 가리지 않게 마을 뒤쪽 언덕·물가에 둔다

#### `hakodate_palace` — 총독 관저 외형
- palace · 5단계 · 크기 80x60x40 · 폴리곤 ≤ 40k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. daimyo residence with gate and garden. Royal/governor seat of 하코다테, grand but game-readable, with a ceremonial entrance and courtyard.
```

## 4. 건축 시뮬레이션 (단계별 건물 카탈로그)

마을 경제 시뮬(인구·번영·자금)이 건설을 결정하면 아래 순서로 **공사 현장 → 완공**이 실제로 보인다. 단계가 오를수록 새 건물 종류가 열린다.

| 단계 | 건물 | 분류 | 마을 효과 |
|---|---|---|---|
| 1 | 오두막 | 주거 | 인구 +2 |
| 1 | 우물 | 공공 | 주민 행복 +, 화재 진압 |
| 1 | 부두 창고 | 항만 | 하역 속도 + |
| 1 | 어망 건조대 | 생산 | 식량 + |
| 1 | 텃밭 | 농업 | 식량 + |
| 1 | 신사 | 종교 | 신앙 + |
| 2 | 연립 주택 | 주거 | 인구 +6 |
| 2 | 빵집·화덕 | 식량 | 식량 가공 + |
| 2 | 대장간 | 공방 | 도구·무기 + |
| 2 | 목공소 | 공방 | 건설 속도 + |
| 2 | 곡물 창고 | 저장 | 흉년 대비 + |
| 2 | 방앗간 | 생산 | 곡물 가공 + |
| 2 | 장터 | 상업 | 교역 + |
| 2 | 망루 | 방어 | 해적 경계 + |
| 3 | 사원 | 종교 | 신앙·명성 + |
| 3 | 학당 | 교육 | 연구 + |
| 3 | 의원·병원 | 의료 | 질병 감소 |
| 3 | 대형 창고 | 저장 | 재고 한도 + |
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
| 5 | 식물원 | 과학 | 연구·명성 + |
| 5 | 외곽 신시가지 | 주거 | 인구 +20 |

### 공사 과정 (일본 방식)

- 주재료: cedar/cypress timber, clay tile, plaster
- 공정: 목조 짜맞춤(못 없음) → 상량 → 기와 → 흰 회벽
- 일꾼: 핫피 입은 목수(다이쿠), 끌·대패
- 완공 의식: 상량식(조토시키) 떡 뿌리기

| 공정 | 화면에 보이는 것 | 일꾼 동작 | 걸리는 시간(게임일) |
|---|---|---|---|
| ① 측량 | 말뚝·줄 띄우기, 설계도 탁자 | 감독이 도면 확인, 측량꾼 줄 당기기 | 1 |
| ② 터 닦기 | 흙 파기, 흙더미, 수레 | 삽질·수레 끌기(2~3명) | 1~2 |
| ③ 기초 | 주춧돌/말뚝, 재료 더미(cedar/cypress timber) | 돌 나르기·망치질 | 2 |
| ④ 골조·비계 | 기둥·들보 + 나무 비계, 도르래 기중기 | 목수 톱질·망치, 짐꾼 사다리 오르기 | 2~3 |
| ⑤ 벽 | 벽이 아래부터 차오름(절반→가득) | 석공/미장 동작 | 2~3 |
| ⑥ 지붕 | 지붕틀 → 기와/이엉 잇기 | 지붕 위 일꾼 2명 | 2 |
| ⑦ 마감 | 창·문·간판·색칠, 비계 철거 | 붓질·청소 | 1 |
| ⑧ 완공 | 비계 사라짐, 깃발·꽃장식, 상량식(조토시키) 떡 뿌리기 | 주민 모여 박수, 감독 인사 | 행사 1일 |

- 일꾼 수: 1단계 건물 2명 → 5단계 건물 6~8명. 감독 1명(도면), 목수·석공·짐꾼 구분.
- 공사 중 소리: 망치·톱·수레바퀴(기존 효과음). 밤에는 작업 중단, 현장 등불만.
- 자금 부족·흉년이면 공사 정지(비계만 남고 일꾼 없음). 재개되면 일꾼 복귀.
- 완공 순간: 건물 등장 연출(먼지 걷힘) + 알림 "○○ 완공" + 해당 효과 적용.

#### `hakodate_construction_kit` — 공사 현장 소품 세트
- construction · 1단계 · 크기 kit · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Construction site kit for 일본 style: survey stakes and string, dirt piles, foundation stones, timber scaffold modules (1/2/3 floors), wooden pulley crane, material piles of cedar/cypress timber, clay tile, plaster, wheelbarrow, ladder, plan table.
```

#### `hakodate_construction_stages` — 공사 단계 5개 메시
- construction · 1단계 · 크기 per building · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Generic building in 5 construction stages (foundation, frame+scaffold, half walls, roof framing, finished) in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts. Each stage a separate mesh.
```

#### `hakodate_workers` — 공사 일꾼 복장 세트
- people · 1단계 · 크기 R15 outfits · 폴리곤 ≤ 4k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Construction worker outfit set (foreman with plan scroll, carpenter, mason, porter) for 일본: 핫피 입은 목수(다이쿠), 끌·대패. Period-accurate clothing accessories only (R15 layered).
```

#### `hakodate_bld_hut` — 오두막(주거) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. one-room hut with chimney and fenced yard, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_well` — 우물(공공) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stone well with wooden winch roof, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_dock_shed` — 부두 창고(항만) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. small wooden dock shed with crates, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_fish_rack` — 어망 건조대(생산) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. fish drying racks and net poles, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_garden` — 텃밭(농업) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. fenced vegetable plots with scarecrow, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_chapel` — 신사(종교) 1단계
- building · 1단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. small Shinto shrine with torii, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_house_row` — 연립 주택(주거) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. row of two-storey townhouses sharing walls, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_bakery` — 빵집·화덕(식량) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. bakery with brick oven chimney and bread rack, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_smithy` — 대장간(공방) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. smithy with open forge, anvil and bellows, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_carpenter` — 목공소(공방) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. carpenter's workshop with timber stacks and saw horse, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_granary` — 곡물 창고(저장) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. raised granary on stone legs, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_mill` — 방앗간(생산) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. watermill or windmill depending on terrain, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_market_stalls` — 장터(상업) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. cluster of canopy market stalls around a small square, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_watchtower` — 망루(방어) 2단계
- building · 2단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. wooden coastal watchtower with signal brazier, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_temple` — 사원(종교) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Buddhist temple hall with pagoda, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_school` — 학당(교육) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. schoolhouse with bell and courtyard, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_infirmary` — 의원·병원(의료) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. infirmary with herb garden and beds, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_warehouse` — 대형 창고(저장) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. large stone warehouse with hoist beam and cart door, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_bathhouse` — 공중목욕탕(공공) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. public bathhouse with domes or tiled roof, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_lighthouse` — 등대(항만) 3단계
- building · 3단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stone lighthouse with lantern room, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_town_hall` — 시청·관아(행정) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. town hall / magistrate office with clock or drum tower, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_hospital` — 대병원(의료) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. large hospital around a cloister, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_library` — 도서관(교육) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. library with reading hall and tall windows, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_customs` — 세관(항만) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. customs house with arcade facing the quay, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_fort_wall` — 성벽·포대(방어) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stone harbour walls with gun battery and gate, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_theater` — 극장(문화) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. theatre / performance hall in local style, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_guild_row` — 공방 거리(공방) 4단계
- building · 4단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. street of specialist workshops with signs, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_university` — 대학·학술원(교육) 5단계
- building · 5단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. university/academy with quadrangle and observatory dome, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_exchange` — 증권거래소(상업) 5단계
- building · 5단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stock exchange with courtyard and clock tower, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_botanic` — 식물원(과학) 5단계
- building · 5단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. botanical garden with glasshouse, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_bld_suburb` — 외곽 신시가지(주거) 5단계
- building · 5단계 · 크기 auto · 폴리곤 ≤ 8k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. new suburb block with wider streets and gardens, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

## 5. 마을 기본 에셋

#### `hakodate_landmark_base` — 상징물 공사 중
- landmark · 2단계 · 크기 40x40x30 · 폴리곤 ≤ 15k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Under-construction castle keep (tenshu) on stone base or pagoda: lower half built, scaffolding, cranes, stone blocks.
```

#### `hakodate_landmark_full` — 상징물 완성
- landmark · 4단계 · 크기 40x40x70 · 폴리곤 ≤ 25k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Completed castle keep (tenshu) on stone base or pagoda, signature landmark of 하코다테.
```

#### `hakodate_house_1` — 주택 1단계
- house · 1단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 1-storey Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts, humble, small yard. 3 colour-variant material slots.
```

#### `hakodate_house_2` — 주택 2단계
- house · 3단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 2-storey Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts, shop on ground floor. 3 colour-variant material slots.
```

#### `hakodate_house_3` — 주택 3단계
- house · 5단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 3-storey Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts, wealthy merchant house. 3 colour-variant material slots.
```

#### `hakodate_street_lamp` — 가로등
- lamp · 3단계 · 크기 2x2x12 · 폴리곤 ≤ 1.5k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Japanese granite tōrō stone lantern, 6 studs tall, emissive glass slot.
```

#### `hakodate_stall_fish` — 가판대 fish
- goods · 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Market stall displaying salted fish in barrels and dried fish hanging, style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_workshop_fish` — 공방 fish
- workshop · 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. smokehouse with fish drying racks and a smoking chimney, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_stall_timber` — 가판대 timber
- goods · 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Market stall displaying stacked sawn timber planks, style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

#### `hakodate_workshop_timber` — 공방 timber
- workshop · 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. water-wheel sawmill with log pond, built in local style: Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts.
```

## 6. 완료 체크

- [ ] 에셋 `assets/inbox/Town/<asset_id>.glb` + `.license.json`(원본·derived)
- [ ] 단계 1~5 Studio 항공 사진: 구역 분리·광장·상징물·방문 건물 위치
- [ ] 공사 현장 ①~⑧ 공정과 일꾼 동작, 완공 연출 확인
- [ ] `tests/run.sh` 통과(코드 한도 포함)
