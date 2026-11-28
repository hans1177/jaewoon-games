# 자동 배치 지시서 — 이름만 맞추면 게임에 바로 들어간다 (필독)

> 자동 생성: `python3 tools/gen_auto_placement.py`. 전체 목록은 `docs/auto_placement_needed.csv`(파일 이름·용도·등록 여부).
> ChatGPT·바이브 도구는 여기 적힌 **정확한 파일 이름**으로 모델을 만들어 드롭박스 `/Vibe2Transfer/inbox/<그룹>/<이름>.glb` 에 올린다.
> 자동 검사 통과 → 등록 → 게임이 그 이름을 찾아 **항구·지상 탐험·해전·항해(수동 항해 포함)** 해당 자리에 자동 배치한다(`docs/ASSET_MANAGEMENT.md` 2-1절).

## 1. 현황

| 장면 | 필요 | 등록됨 | 남음 |
|---|---|---|---|
| 항구 | 3778 | 15 | 3763 |
| 지상 탐험 | 592 | 0 | 592 |
| 해전 | 81 | 0 | 81 |
| 항해 | 81 | 0 | 81 |
| 백과 실물 | 107 | 0 | 107 |

## 2. 이름 규칙(슬롯)

| 장면 | 그룹(드롭박스 폴더) | 파일 이름 | 놓이는 곳 |
|---|---|---|---|
| 항구 | Town | `<항구id>_landmark_base` / `_landmark_full` | 항구 대표 경관(2~3단계 / 4단계 이상) |
| 항구 | Town | `<항구id>_house_1` · `_house_2` · `_house_3` | 서민·장인·부유층 주택 |
| 항구 | Town | `<항구id>_street_lamp` · `_bld_well` · `_bld_market_stalls` · `_bld_mill` · `_plaza_center` | 가로등·우물·시장·방앗간·광장 |
| 항구 | Town | `<항구id>_workshop_<특산품>` · `_stall_<특산품>` | 특산 공방(3단계+)·가판대(2단계+) |
| 지상 탐험 | Terrain | `field_<탐험지id>` | 탐험지 원경 대표 지형 |
| 해전 | Naval | `sea_<해역>_near` · `_mid` · `_far` | 해전 배경 3층 |
| 항해(수동 포함) | Naval | `voyage_<해역>_near` · `_mid` · `_far` | 항해 중 양옆 해안(없으면 sea_ 재사용) |
| 백과 실물 | Animals·Terrain·Relics·Town | `<카드id>` (예: `zoo_tiger`) | 지상 탐험 발견물 실물 |
| 메뉴 원화 | CardArt | `menu_<메뉴>_<번호>.jpg` | 메뉴창 원화 배너 |

- 항구 id·특산품·탐험지 id·해역은 CSV 에 모두 있다. 해역 id 는 `Shared/SeaAreas.luau`.
- 크기·모양·문화권 양식은 기존 지시서를 따른다: 항구 `docs/ports/<항구>.md`, 배경 `docs/battle_backdrops/`, 배 `docs/ships/`, 백과 실물 `docs/discoveries/`.
- 모델은 GLB, 텍스처 풀컬러(256색 금지), 기본 도형(Part) 조립 금지(루트 AGENTS.md).

## 3. 먼저 만들 것(추천 순서)

1. 해역 27곳 `sea_<해역>_far` — 해전·항해 둘 다 바로 좋아진다.
2. 주요 항구 대표 경관 `<항구>_landmark_full` (런던·리스본·암스테르담·이스탄불·광저우 등).
3. 동물 `docs/discoveries/MISSING.md` 순서대로 `<카드id>.glb`.
4. 항구 주택 3종·가로등 — 항구 분위기가 가장 크게 바뀐다.
5. 탐험지 `field_<id>` — 자주 가는 근교 탐험지부터.

