# 양곤 (rangoon) — 항구 작업 지시서

> 공통 규칙: `docs/RULES.md`(원본 가공·라이선스·코드 한도) → `docs/PORT_VILLAGE_PROMPTS.md`. 이 문서만으로 이 항구의 테마·왕궁·방문 건물을 만든다.

## 1. 항구 테마

| 항목 | 값 |
|---|---|
| 문화권 | 동남아 (`seasia`) |
| 나라 | burma |
| 기후 | 열대 — tropical palms, heavy rain, deep green foliage |
| 테마 | **광산·금속 항구** — ore wharf, smelters and mint |
| 특산물 | rice, gems, ivory, ebony |
| 건축 | stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves |
| 지붕·벽 | thatch · wood |
| 광장 | market |
| 길 1→5단계 | mud → dirt → gravel → plank → paved |
| 밤 조명 | paper_lantern |
| 상징물 | stupa/pagoda or tiered-roof royal hall (2단계 공사 중 → 4단계 완성) |
| 조선소 | 없음(응급 수리만) |
| 왕궁 | 없음 → 5단계에 총독 관저 |

## 2. 발전도별 마을

| 단계 | 마을 모습 | 새로 방문 가능 |
|---|---|---|
| 1 개척 | 오두막 6채·흙길·횃불, 부두 옆 교역소·주점·항만청 | 교역소, 주점, 항만청 |
| 2 마을 | 광장(market)·상징물 기초, 집 10채, 큰길 dirt | 학자의 서재, 전투 본부 |
| 3 읍 | 시장·종교·주거·공방 구역 분리, 광산·금속 항구 특색 공방, 가로등 3칸마다 | 외교관 거처, 은행 |
| 4 도시 | 상징물 완성, 2층 상점 주택, 창고 마당, 길 plank, 가로등 2칸마다 | - |
| 5 대도시 | 3층 주택·외곽 구역, 길 paved, 모든 길 가로등, 농촌 가공소 | 총독 관저 |

## 3. 방문 가능 건물 (외형·내부·기능)

### 교역소 — 1단계부터
- 기능: 상품 매입·판매, 시세 비교
- 외형 단계: ① open-air trading post with awning and scales → ③ covered market hall with arcades → ⑤ grand merchant exchange with columns and clock (모두 동남아 양식)
- 내부: 저울·장부 책상·견본 상품 선반·시세 칠판(그림), 특산물 견본 진열, 거래 상인 2명 — 동남아 실내 양식(바닥·조명 paper_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·광산·금속 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `rangoon_trade_1` — 교역소 외형 1단계
- building · 1단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. open-air trading post with awning and scales, a visitable 교역소 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_trade_2` — 교역소 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. covered market hall with arcades, a visitable 교역소 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_trade_3` — 교역소 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. grand merchant exchange with columns and clock, a visitable 교역소 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

### 주점 — 1단계부터
- 기능: 동료 영입, 소문·의뢰, 카드 대결
- 외형 단계: ① small tavern shack with hanging sign → ③ two-storey inn with stable yard → ⑤ grand inn with balconies and courtyard (모두 동남아 양식)
- 내부: 긴 나무 탁자·술통 카운터·벽난로/화덕·소문 게시판·카드 탁자, 2층 숙소 계단 — 동남아 실내 양식(바닥·조명 paper_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·광산·금속 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `rangoon_tavern_1` — 주점 외형 1단계
- building · 1단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. small tavern shack with hanging sign, a visitable 주점 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_tavern_2` — 주점 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. two-storey inn with stable yard, a visitable 주점 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_tavern_3` — 주점 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. grand inn with balconies and courtyard, a visitable 주점 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

### 항만청 — 1단계부터
- 기능: 출항·항로·지도, 입항세
- 외형 단계: ① dock office hut beside the pier → ③ customs house with flag → ⑤ admiralty building with signal mast and arcade (모두 동남아 양식)
- 내부: 대형 해도 탁자·항로 지도 벽·입항 장부·나침반 진열·창밖 부두 전망 — 동남아 실내 양식(바닥·조명 paper_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·광산·금속 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `rangoon_harbor_1` — 항만청 외형 1단계
- building · 1단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. dock office hut beside the pier, a visitable 항만청 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_harbor_2` — 항만청 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. customs house with flag, a visitable 항만청 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_harbor_3` — 항만청 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. admiralty building with signal mast and arcade, a visitable 항만청 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

### 학자의 서재 — 2단계부터
- 기능: 지식 보고·연구·백과
- 외형 단계: ① scribe's room in a townhouse → ③ library with reading hall → ⑤ academy with observatory dome (모두 동남아 양식)
- 내부: 책장 벽·지구의·천체 관측기구·표본 상자·보고서 책상, 5단계 관측 돔 — 동남아 실내 양식(바닥·조명 paper_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·광산·금속 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `rangoon_scholar_1` — 학자의 서재 외형 1단계
- building · 2단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. scribe's room in a townhouse, a visitable 학자의 서재 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_scholar_2` — 학자의 서재 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. library with reading hall, a visitable 학자의 서재 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_scholar_3` — 학자의 서재 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. academy with observatory dome, a visitable 학자의 서재 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

### 전투 본부 — 2단계부터
- 기능: 해적 사냥·함대전·지상 탐험·카드 대결
- 외형 단계: ① watch post with palisade → ③ barracks with drill yard → ⑤ naval command fortress with bastions (모두 동남아 양식)
- 내부: 무기 거치대·작전 지도 탁자·훈련장 허수아비·함대 모형·카드 대결 탁자 — 동남아 실내 양식(바닥·조명 paper_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·광산·금속 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `rangoon_battle_1` — 전투 본부 외형 1단계
- building · 2단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. watch post with palisade, a visitable 전투 본부 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_battle_2` — 전투 본부 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. barracks with drill yard, a visitable 전투 본부 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_battle_3` — 전투 본부 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. naval command fortress with bastions, a visitable 전투 본부 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

### 외교관 거처 — 3단계부터
- 기능: 나라 정세·관계·선물·개입
- 외형 단계: ① consul's house with national flags → ③ consulate with walled garden → ⑤ embassy quarter with several flag houses (모두 동남아 양식)
- 내부: 여러 나라 깃발·선물 진열장·협상 탁자·국력 순위 게시판 — 동남아 실내 양식(바닥·조명 paper_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·광산·금속 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `rangoon_diplomacy_1` — 외교관 거처 외형 1단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. consul's house with national flags, a visitable 외교관 거처 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_diplomacy_2` — 외교관 거처 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. consulate with walled garden, a visitable 외교관 거처 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_diplomacy_3` — 외교관 거처 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. embassy quarter with several flag houses, a visitable 외교관 거처 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

### 은행 — 3단계부터
- 기능: 예금·대출·투자 (3단계부터 또는 지정 항구)
- 외형 단계: ① money changer's counting house → ③ stone bank with vault → ⑤ exchange bank with trading floor (모두 동남아 양식)
- 내부: 금고 문·환전 카운터·주화 저울·대출 장부·경비병 — 동남아 실내 양식(바닥·조명 paper_lantern)
- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·광산·금속 항구 상징 소품
- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림

#### `rangoon_bank_1` — 은행 외형 1단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. money changer's counting house, a visitable 은행 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_bank_2` — 은행 외형 2단계
- building · 3단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. stone bank with vault, a visitable 은행 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

#### `rangoon_bank_3` — 은행 외형 3단계
- building · 5단계 · 크기 24x20x(12-26) · 폴리곤 ≤ 12k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. exchange bank with trading floor, a visitable 은행 building for a port game, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves. Clear door, readable sign shape (no text).
```

### 총독 관저 — 5단계
- 기능: 알현·작위·국가 의뢰
- 외형: tiered-roof royal audience hall on stilts
- 내부 방: 집무실, 알현실, 문서고, 정원
- 크기: 마을 건물의 3~4배, 단 마을을 가리지 않게 마을 뒤쪽 언덕·물가에 둔다

#### `rangoon_palace` — 총독 관저 외형
- palace · 5단계 · 크기 80x60x40 · 폴리곤 ≤ 40k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. tiered-roof royal audience hall on stilts. Royal/governor seat of 양곤, grand but game-readable, with a ceremonial entrance and courtyard.
```

## 4. 마을 에셋

#### `rangoon_landmark_base` — 상징물 공사 중
- landmark · 2단계 · 크기 40x40x30 · 폴리곤 ≤ 15k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Under-construction stupa/pagoda or tiered-roof royal hall: lower half built, scaffolding, cranes, stone blocks.
```

#### `rangoon_landmark_full` — 상징물 완성
- landmark · 4단계 · 크기 40x40x70 · 폴리곤 ≤ 25k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Completed stupa/pagoda or tiered-roof royal hall, signature landmark of 양곤.
```

#### `rangoon_house_1` — 주택 1단계
- house · 1단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 1-storey stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves, humble, small yard. 3 colour-variant material slots.
```

#### `rangoon_house_2` — 주택 2단계
- house · 3단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 2-storey stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves, shop on ground floor. 3 colour-variant material slots.
```

#### `rangoon_house_3` — 주택 3단계
- house · 5단계 · 크기 16x14x(12-26) · 폴리곤 ≤ 6k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. 3-storey stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves, wealthy merchant house. 3 colour-variant material slots.
```

#### `rangoon_street_lamp` — 가로등
- lamp · 3단계 · 크기 2x2x12 · 폴리곤 ≤ 1.5k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. red paper lantern hanging from a wooden post with small roof, 10 studs tall, emissive glass slot.
```

#### `rangoon_stall_rice` — 가판대 rice
- goods · 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Market stall displaying straw rice bales and wooden rice measures, style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves.
```

#### `rangoon_workshop_rice` — 공방 rice
- workshop · 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. water-powered rice mill with raised granary, built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves.
```

#### `rangoon_stall_ivory` — 가판대 ivory
- goods · 2단계 · 크기 8x5x6 · 폴리곤 ≤ 3k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. Market stall displaying carved ivory pieces on cloth (display only, no animals harmed depiction), style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves.
```

#### `rangoon_workshop_ivory` — 공방 ivory
- workshop · 3단계 · 크기 24x20x16 · 폴리곤 ≤ 10k
```
Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, separate meshes for roof / walls / trim / props so colors can be tinted in-engine. Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. carving workshop with lathes (display only), built in local style: stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves.
```

## 5. 완료 체크

- [ ] 에셋 `assets/inbox/Town/<asset_id>.glb` + `.license.json`(원본·derived)
- [ ] 단계 1~5 Studio 항공 사진: 구역 분리·광장·상징물·방문 건물 위치
- [ ] `tests/run.sh` 통과(코드 한도 포함)
