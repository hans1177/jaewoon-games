# 카드 배틀·내 카드 아이콘 제작 목록 (모양·컨셉 통일)

지금 카드 화면은 **아이콘이 모자라거나 안 맞는다**: 자동 진행·손패 교체가 같은 길(route) 아이콘, 지도자 능력은 나침반, 후열(사격)도 나침반,
포 줄은 닻, 멈추기도 닻. 아래 목록을 **한 화풍으로 한꺼번에** 만들어 교체한다.

## 공통 화풍 (기존 `chart_*` 아이콘과 같게)
- 판화 선 + 채색: 황동(금색) 테두리, 붉은 갈색·청록·양피지색 채움, 가는 선 음영
- 투명 배경 PNG, 한 장에 아이콘 하나, 중앙에 크게, 같은 두께의 테두리
- 4열×3행 시트로 12개씩 (칸 사이 간격 균일), 글자·숫자·서명·워터마크 없음
- 같은 시트 안은 크기·여백·선 굵기 통일. 파일 이름은 `icon_<id>.png` (시트를 잘라 등록은 코딩 에이전트가 한다)

## 시트 1 — 전투 줄·행동 (카드 화면)
| id | 그림 |
|---|---|
| row_melee | 교차한 두 자루 검 + 작은 방패 (전열·근접) |
| row_ranged | 활과 화살 한 대 (후열·사격) |
| row_cannon | 포신이 보이는 대포 한 문 (포) |
| act_pass | 흰 깃발 (멈추기) |
| act_leader | 왕관과 깃발 (지도자 능력) |
| act_swap | 카드 두 장이 서로 바뀌는 화살표 (손패 교체) |
| act_auto | 재생 삼각형 + 모래시계 (자동 진행) |
| zone_deck | 뒷면이 보이는 카드 더미 |
| zone_grave | 쓰러진 카드 한 장 + 무덤 십자 (버린 더미) |
| round_gem_full | 채워진 붉은 보석 (이긴 판) |
| round_gem_empty | 비어 있는 보석 틀 |
| score_laurel | 월계관 둥근 틀 (줄 점수 배지 테두리) |

## 시트 2 — 날씨·능력
| id | 그림 |
|---|---|
| wx_fog | 안개 낀 바다 |
| wx_storm | 번개 치는 먹구름 |
| wx_clear | 구름 사이 해 |
| wx_wind | 바람 소용돌이 |
| ab_bond | 서로 묶인 밧줄 두 가닥 (결속) |
| ab_morale | 휘날리는 군기 (사기) |
| ab_spy | 눈 한 쌍과 가면 (첩자) |
| ab_medic | 붕대와 약병 (치료) |
| ab_armor | 철갑 방패 (철갑) |
| ab_horn | 뿔나팔 (군기 올리기) |
| ab_chain | 이어진 사슬 고리 (연쇄) |
| ab_refute | 부러진 깃펜과 X (반증) |

## 시트 3 — 카드 분류 (내 카드 탭·카드 모서리)
| id | 그림 |
|---|---|
| cat_ship | 돛배 한 척 |
| cat_relic | 항아리 유물 |
| cat_animal | 동물 발자국 |
| cat_wonder | 기둥과 산 (지형·원더) |
| cat_person | 투구 쓴 인물 흉상 |
| cat_event | 두루마리와 인장 |
| cat_tech | 톱니바퀴와 나침반 |
| cat_troop | 창과 방패 (병종) |
| cat_legend | 용 머리 (전설 생물) |
| cat_mystery | 물음표 달린 안개 속 문 |
| cat_special | 별 문양 인장 (특수) |
| cat_hero | 금빛 별 왕관 (영웅) |

## 시트 4 — 대륙 탭 (내 카드·덱 짜기)
유럽(성탑), 동아시아(탑과 파도), 중동(둥근 지붕과 초승달), 신대륙(계단 피라미드), 아프리카(바오바브), 동남아(사원 탑), 미지의 땅(안개 속 섬) — `cont_eu` `cont_ea` `cont_me` `cont_nw` `cont_af` `cont_sa` `cont_lo` 7개 + 등급 메달 `tier_bronze` `tier_silver` `tier_gold` 3개 + `filter_owned`(열린 상자) `filter_all`(펼친 책) 2개 = 12개.

## 연결 방법 (코딩 에이전트)
1. 시트를 칸별로 잘라 `assets/inbox/icons/` 에 `icon_<id>.png` + `.license.json` 로 등록
2. 업로드 승인 후 `Menu/` 키로 AssetIds 에 올라오면 `NavalBattle.luau` 의 `mkSide`·`rowIcons`, `CardGallery.luau` 의 필터 칩에 연결
3. 연결 전에는 지금 아이콘을 그대로 둔다 (빈 칸을 만들지 않는다)
