# 지상 탐험 발견물 외형 지시서 (필독)

**ChatGPT·Claude·바이브코딩 도구 등 누구든 백과 실물(식물·동물·광물·유물·유적)의 지상 탐험 외형·모델을 만들거나 바꿀 때 반드시 읽고 따른다.**
루트 `AGENTS.md`(파츠·원형·임의 생성물 금지), `docs/RULES.md`, `docs/ASSET_MANAGEMENT.md`(256색 금지)가 우선한다.

## 1. 구조 (코드는 이미 있음)
- 매핑표: `src/ReplicatedStorage/Shared/DiscoveryForms.luau`. 백과 실물 509장 전부가 **대표 모양(archetype)** 하나에 묶인다.
  - 모양별 모델 후보, 크기, 무리 수, 조사 방법(스케치·채집·탁본·조사), 장소 힌트, 시간·날씨 조건, 꽃 피는 철.
  - 이름이 헷갈리는 항목은 `NAME_OVERRIDE` 에 이름으로 직접 지정한다.
- 연출: `src/ReplicatedStorage/Shared/DiscoveryStage.luau` (FieldScene 발견 지점에서 호출).
  - 멀리선 어두운 실루엣 → 20스터드 안으로 오면 또렷해짐.
  - 모델이 없거나 조건(밤·비 온 뒤)이 안 맞으면 **관찰 기록 현장**(모닥불 돌·기록장·천막 + 카드 원화). 조건이 맞으면 실물 등장.
  - 식물은 무리로, 꽃은 봄·여름만 핌. 동물은 뛰어서 다가가면 달아남(최대 3번). 채집하면 하나가 사라짐.
  - 유적은 크게 세워 멀리서 보이는 목표. 조사 지점은 유적 앞.
- 백과 미발견 카드에는 "실루엣 힌트 · 어디서/방법/조건" 한 줄이 나온다.
- 금빛 공 표식(기본 도형)은 없앴다. 일반 발견물은 상자·항아리·지도·기록장·잔해 소품으로 보인다.

## 2. 대표 모양 표
| 모양 | 종류 | 카드 수 | 방법 | 지금 쓰는 승인 모델 |
|---|---|---|---|---|
| amphitheater | site | 2 | 탁본 | Terrain/greek-amphitheater |
| animal_large | animal | 16 | 스케치 | **없음(제작 필요)** |
| animal_small | animal | 10 | 스케치 | **없음(제작 필요)** |
| bamboo | plant | 1 | 채집 | Terrain/east-bamboo-grove |
| bird | animal | 28 | 스케치 | **없음(제작 필요)** |
| bridge | site | 2 | 탁본 | Terrain/bridge-stone, Castle/bridge-straight |
| city_ruin | site | 27 | 탁본 | Terrain/ruins-wall-arched, Terrain/mystic-broken-wall, Terrain/ruins-pillar-decorated |
| clay | mineral | 3 | 채집 | Terrain/kenney_stone_largeB |
| coin | relic | 4 | 조사 | Relics/coin |
| crop | plant | 10 | 채집 | Terrain/crops-wheatstageb, Terrain/crops-cornstagec, Terrain/crop-turnip |
| crystal | mineral | 11 | 채집 | Terrain/mystic-crystals |
| document | relic | 29 | 조사 | Relics/map-rolled, Relics/journal-open, Relics/blueprint |
| fish | animal | 30 | 스케치 | **없음(제작 필요)** |
| flower | plant | 9 | 채집 | Terrain/forest-flower-purple, Terrain/forest-flower-yellow |
| fortress | site | 22 | 탁본 | Castle/fortress, Castle/tower-square-base, Castle/wall-corner-half-tower |
| harbor_site | site | 13 | 탁본 | Naval/dock-side, Town/cart-high |
| insect | animal | 1 | 스케치 | **없음(제작 필요)** |
| instrument | relic | 11 | 조사 | Relics/compass-base, Relics/drafting-compass, Relics/magnifying-glass |
| marine | animal | 14 | 스케치 | **없음(제작 필요)** |
| mound | site | 3 | 탁본 | Terrain/platform-grass, Terrain/crypt-large |
| natural_wonder | site | 6 | 스케치 | Terrain/cliff-waterfall-rock, Terrain/cliff-large-stone, Terrain/land-waterfall |
| ore | mineral | 18 | 채집 | Terrain/kenney_rock_tallE, Terrain/rock-talld |
| reptile | animal | 9 | 스케치 | **없음(제작 필요)** |
| resin | mineral | 10 | 채집 | Terrain/mystic-crystals |
| rock_outcrop | mineral | 20 | 채집 | Terrain/rock-largea, Terrain/rock-tallc, Terrain/kenney_rock_largeB |
| ruin_classical | site | 6 | 탁본 | Terrain/greek-ruins-a, Terrain/greek-ruins-b, Terrain/greek-column |
| ruin_egypt | site | 2 | 탁본 | Terrain/egypt-temple-arch-a, Terrain/egypt-obelisk, Terrain/egypt-column |
| ruin_meso | site | 2 | 탁본 | **없음(제작 필요)** |
| sacred | site | 18 | 탁본 | Town/church, Town/bell-tower, Town/eastasia-bell |
| salt | mineral | 6 | 채집 | Terrain/rock-largec |
| seaweed | plant | 4 | 채집 | Naval/grass-plant, Terrain/coast-grass-patch |
| ship_model | relic | 7 | 조사 | Naval/boat-sail-a, Naval/boat-row-small |
| shrub | plant | 17 | 채집 | Terrain/plant-bushdetailed, Terrain/forest-bush-detailed, Terrain/plant-bushlarge |
| stone_circle | site | 3 | 탁본 | Terrain/statue-ring, Terrain/altar-stone |
| stone_relic | relic | 13 | 탁본 | Terrain/altar-stone, Terrain/statue-head, Terrain/pillar-obelisk |
| succulent | plant | 3 | 채집 | Terrain/arid-cactus-short, Terrain/arid-cactus-tall |
| tower | site | 6 | 탁본 | Castle/tower-hexagon-base, Terrain/pillar-obelisk |
| treasure | relic | 38 | 조사 | Naval/chest |
| tree_arid | plant | 3 | 채집 | Terrain/tree-plateau-fall, Terrain/arid-cactus-tall |
| tree_broadleaf | plant | 33 | 채집 | Terrain/tree-oak, Terrain/tree-detailed, Terrain/tree-default-fall |
| tree_conifer | plant | 5 | 채집 | Terrain/tree-pinedefaulta, Terrain/tree-pinetalla-detailed, Terrain/north-pine-fall |
| tree_palm | plant | 4 | 채집 | Terrain/tropical-palm-tall, Terrain/tree-palmdetailedtall, Terrain/kenney_tree_palmShort |
| tree_wetland | plant | 5 | 채집 | Terrain/tree-plateau, Terrain/tree-thin |
| vessel | relic | 6 | 조사 | Relics/pot |
| vine | plant | 4 | 채집 | Terrain/hanging-moss, Terrain/plant-flattall |
| volcanic | mineral | 9 | 채집 | Terrain/rock-talli, Terrain/kenney_rock_largeD |
| weapon | relic | 6 | 조사 | Relics/weapon-sword, Relics/shield-round, Relics/weapon-axe |

## 3. 만들어야 할 것 (우선순위)
부족 목록은 `docs/discoveries/MISSING.md` (자동 생성, 107건). **동물이 전부 부족하다.**
1. **새(bird) 28종** — 해안 절벽·물가에 무리. 날개 접은 자세 + 날갯짓 1종. 퍼핀·갈매기·홍학·펭귄·앵무·독수리 등 실루엣이 확실히 다르게.
2. **해양 동물(marine) 14종·물고기·바다생물(fish) 30종** — 해안 얕은 물에 반쯤 잠긴 모습(고래는 등·꼬리만 보이게). 물고기는 수면 아래 떼.
3. **큰 짐승(animal_large) 13종** — 무스·순록·엘크·낙타·하마·북극곰·재규어·호랑이 등. 서 있기 + 걷기.
4. **작은 짐승(animal_small) 10종·파충류(reptile) 9종·곤충(insect) 1종**.
5. **중남미 피라미드(ruin_meso)** — 마야·테오티우아칸 계단 피라미드(이집트 모델로 대체 금지).

## 4. 제작 규칙
- **가장 빠른 방법:** 백과 카드 id 와 같은 이름의 GLB 를 드롭박스 `/Vibe2Transfer/inbox/Animals/zoo_tiger.glb` 처럼 올리면 자동 등록되고 탐험에 바로 나온다(`docs/ASSET_MANAGEMENT.md` 2-1절).
- **동물 뼈대·애니메이션·행동(리액션)·몬스터 재사용은 `docs/discoveries/ANIMAL_RIG_MOTION.md` 필독.** 표준 뼈 이름·애니메이션 이름을 지켜야 탐험·목장·몬스터에서 재사용된다.
- 종마다 **실제 생김새 그대로**(색·무늬·비율). 다른 종 모델을 색만 바꿔 쓰지 않는다.
- 저폴리 + 손그림 질감, 게임 내 기존 승인 동물(`Animals/elephant`, `Animals/llama`)과 같은 스케일·톤.
- 한 모델 1~3천 폴리곤, 텍스처 512~1024px **풀컬러**(256색 금지).
- 등록은 `docs/ASSET_MANAGEMENT.md` 2절 경로만. 등록 후 동물은 `DF.EXACT_ANIMALS[카드id] = "모델이름"`, 나머지는 해당 모양 `models` 에 추가.
- 새 모양이 필요하면 `DF.ARCHETYPES` 에 추가하고 규칙(`RULES`)·예외(`NAME_OVERRIDE`)를 고친다.
- 작업 후 `tests/run.sh` 통과 + Studio 지상 탐험 촬영으로 확인하기 전에는 완료라고 보고하지 않는다.
