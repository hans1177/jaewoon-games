# 📚 지시서 지도 — 무엇을 만들든 1분 안에 찾기

> 2026-11-28 오너: "지시서(주민·몬스터·퀘스트·헤어·악세·복장·마을 구획·건축…) 너무 많다. 디테일하게 정리·분류해서 읽을 수밖에 없게."
> **읽는 법은 딱 3단계.**
> ① 공통 3개(아래 0절)는 무조건 → ② 만드는 것의 **정본 1개**(굵은 글씨) → ③ 필요할 때만 "더 볼 것".
> 정본과 "더 볼 것"이 다르면 **정본이 이긴다.** 파일은 전부 `roblox-games/mare-essentia/docs/` 아래(raw 주소로도 읽힘).

## 0. 무조건 (모든 작업 공통 · 3개)

| 순서 | 파일 | 왜 |
|---|---|---|
| 1 | `READ_FIRST.md` | 금지 규칙·드롭박스 폴더표(3-2절)·끝내기 전 확인 |
| 2 | `RULES.md` | 출처·라이선스·원본 가공·코드 한도 |
| 3 | `ASSET_MANAGEMENT.md` | 등록 규칙, **256색 금지**, 규격 |

---

## 1. 그림 (2D 원화·UI)

| 만드는 것 | 정본(먼저) | 더 볼 것 | 드롭박스 | 파일 이름 예 |
|---|---|---|---|---|
| 카드 원화(대륙·지식·사건) | **`CARD_ART_PROMPTS.md`** | `CARD_SIZE_UI_GUIDE.md`, `CARD_BATTLE_HANDOFF.md` | `CardArt` | `eu_01.png` |
| 카드배틀 화면·프레임·아이콘 | **`card_battle/MOBILE_GRADE_BRIEF.md`** | `card_battle/screens.md`·`effects.md` | `CardArt` | `ui_frame_legend.png` |
| 주인공·동료·담당자 초상 | **`VISUAL_REMAKE_BRIEF.md`** | `PORTRAITS.md` | `Portraits` | `<이름>.png` |
| 메뉴창·버튼·아이콘·프레임 | **`MENU_UI_BRIEF.md`** | `READ_FIRST.md` 3절(아이콘 규칙) | `CardArt`·`Icons` | `ui_menu_icons_4.png` |
| 메뉴 배너 원화 | **`MENU_UI_BRIEF.md`** 6절 | `READ_FIRST.md` 3-1절 | `CardArt` | `menu_<메뉴>_<번호>.jpg` |
| 이벤트 장면·카드 획득 연출 | **`EVENT_SCENES.md`** | — | `CardArt` | 문서 안 목록 |
| 백과 원화·해설 | **`ENCYCLOPEDIA_BRIEF.md`** | `encyclopedia_articles_needed.csv` | `CardArt` | `<카드id>.png` |
| 흥정 미니게임 그림·상인 표정 | **`HAGGLE_MINIGAME_BRIEF.md`** | — | `CardArt` | 문서 안 목록 |
| 보스 소개 원화 | **`BOSS_BRIEF.md`** 5절 | — | `CardArt` | `boss_<id>.png` |

## 2. 마을 (3D 배치·건물)

| 만드는 것 | 정본(먼저) | 더 볼 것 | 드롭박스 | 파일 이름 예 |
|---|---|---|---|---|
| **마을 구획·구도·간격(숫자)** | **`VILLAGE_LAYOUT_SPEC.md`** | `PORT_VILLAGE_PROMPTS.md` 2절 | — | — |
| 항구별 건물·상징물·소품 | **`ports/<항구>.md`** | `ports/README.md`(슬롯 이름), `PORT_VILLAGE_PROMPTS.md` | `Town` | `london_house_2.glb` |
| 문화권 건축 양식·재질 | **`PORT_VILLAGE_PROMPTS.md`** | `RULES.md` 재질 표, `BUILDINGS_BY_REGION.md` | `Town` | `<문화권>_house_1.glb` |
| 왕궁·관청·궁정 | **`BUILDINGS_BY_REGION.md`** | `ports/<항구>.md` 왕궁 절 | `Castle`·`Town` | 문서 안 |
| 자동 배치 필요 목록·오늘 할 10개 | **`AUTO_PLACEMENT.md`** | `auto_placement_needed.csv`, `assets/auto_fill_board.md` | 종류별 | CSV 안 |

## 3. 사람 (주민·동료 3D)

| 만드는 것 | 정본(먼저) | 더 볼 것 | 드롭박스 | 파일 이름 예 |
|---|---|---|---|---|
| **주민 옷·머리·장신구** | **`residents/OUTFIT_SPEC.md`** (이름대로 올리면 자동 착용) | `residents/README.md`(층·재질), `residents/<문화권>.md` | `People` | `outfit_korea_vest.glb`, `hair_japan_female.glb` |
| 직업별 복장·도구·동선 | **`residents/jobs.md`** | `ports/<항구>.md` 5절 하루 동선 | `People`·`Cargo` | — |
| 주민 움직임(대기·걷기·작업·날씨) | **`residents/README.md`** 모션 표 | — | — | — |

## 4. 몬스터·동물·보스

| 만드는 것 | 정본(먼저) | 더 볼 것 | 드롭박스 | 파일 이름 예 |
|---|---|---|---|---|
| **보스(단계·스킬·모션·체력)** | **`BOSS_BRIEF.md`** | `FIELD_COMBAT_BRIEF.md` | `Monsters`·`Naval` | `kraken.glb` |
| 동물 뼈대·움직임·몬스터 변형 | **`discoveries/ANIMAL_RIG_MOTION.md`** | `discoveries/README.md` | `Animals`·`Monsters` | `<카드id>.glb` |
| 탐험 발견물(식물·광물·유물·유적) | **`discoveries/README.md`** | `discoveries/MISSING.md` | `Animals`·`Terrain`·`Relics`·`Town` | `<카드id>.glb` |

## 5. 바다

| 만드는 것 | 정본(먼저) | 더 볼 것 | 드롭박스 | 파일 이름 예 |
|---|---|---|---|---|
| 배 디자인·등급 | **`ships/README.md`** | `ships/grades.md`, `ships/<배>.md` | `Naval` | `<배id>-v5.glb` |
| 해전·항해 배경 | **`battle_backdrops/README.md`** | `battle_backdrops/naval/` | `Naval` | `sea_<해역>_near.glb` |
| 해양 퀘스트 표시·대규모 해전·해상 효과 | **`NAVAL_QUEST_EXPANSION_BRIEF.md`** | — | `Naval`·`CardArt` | 문서 안 |

## 6. 게임 시스템 (규칙·흐름·연출)

| 만드는 것 | 정본(먼저) | 더 볼 것 |
|---|---|---|
| **카드배틀 규칙·메뉴·연출(궨트급)** | **`card_battle/MOBILE_GRADE_BRIEF.md`** | `card_battle/README.md`(카드 분류 0절), `card_text.md`, `factions.md` |
| 퀘스트 이야기·인과관계 | **`STORY_CAUSALITY.md`** | `STORY_QUEST_SYSTEM.md` |
| 지상 전투(약점·반격·숙련 해방·특산품 잠금) | **`FIELD_COMBAT_BRIEF.md`** | `BOSS_BRIEF.md` |
| 지상전·퀘스트 배경 | **`battle_backdrops/README.md`** | `battle_backdrops/field/`, `battle_backdrops/quests.md` |
| 교역 흥정 미니게임 | **`HAGGLE_MINIGAME_BRIEF.md`** | — |
| 메뉴 구조·편의 | **`MENU_UI_BRIEF.md`** | — |
| 게임 전체 설계 | **`DESIGN.md`** | — |

## 7. 기술 (코드·등록)

| 할 일 | 정본 |
|---|---|
| 코드 위치 찾기 | `CODE_MAP.md` |
| 자산 올리기·검사·등록 | `ASSET_MANAGEMENT.md` 2-1절, 결과 `assets/dropbox_inbox_report.md` |
| 저장소 첫 파일·정책 4종·멈춤 금지 | 루트 `START_HERE.md` |

---

## 자주 틀리는 것 5가지
1. 256색(팔레트) 그림 올리기 → 거부됨. **풀컬러.**
2. 파일 이름 대충 → 자동 배치 안 됨. **표의 이름 그대로.**
3. 기본 도형(Part)으로 모델 때우기 → 금지.
4. 궨트·실존 사진·로고 베끼기 → 금지.
5. "읽었다"고만 하고 안 읽기 → 다르게 만들면 되돌린다.
