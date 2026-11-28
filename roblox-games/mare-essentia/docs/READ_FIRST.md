# mare-essentia — 모든 작업자 필독 (READ FIRST)

> **인물 사실 묘사 공통 필수 규칙 (2026-11-28 오너 지시):** 인물이 등장할 때 미남·미녀로 획일화하거나 미화하지 않는다. 나이·직업·생활환경에 맞는 얼굴형, 체형, 피부 결, 주름, 비대칭, 머리와 손, 자연스러운 표정과 자세를 사실적으로 묘사한다. 현대 모델 같은 외모·보정 피부·과장된 미형·문화권 고정관념을 피하고 인물마다 개성을 살린다. 기존 역사 고증·회화 화풍·실존 인물 얼굴 제한을 지키며 인물이 없는 소재에는 사람을 억지로 추가하지 않는다.

> 저장소 처음이면 루트 `START_HERE.md`부터(중앙정책 4종 위치·멈춤 금지 문장). 이 파일과 아래 지시서는 전부 raw 주소로도 읽힌다: `https://raw.githubusercontent.com/hans1177/jaewoon-games/main/roblox-games/mare-essentia/docs/<파일>`

**ChatGPT·Claude·Codex·Copilot·Cursor·Gemini·바이브코딩 도구 등 누구든 `mare-essentia`를 만지기 전에 이 파일과 아래 해당 지시서를 반드시 읽고 그대로 따른다.**
**아래 표의 모든 지시서는 필독이다.** 1절은 무엇을 하든 전부 읽고, 2절은 하는 작업에 해당하는 파일을 전부 읽는다.
읽지 않았으면 읽었다고 말하지 않는다. 지시서와 다르게 만들면 되돌린다. 저장소 루트 `AGENTS.md`(전역 금지 규칙·중앙정책)가 항상 우선한다.

## 1. 무엇을 하든 공통
| 문서 | 내용 |
|---|---|
| **`docs/BRIEF_MAP.md`** | **지시서 지도 — 만드는 것별 정본 1개·드롭박스 폴더·파일 이름 예를 한 장에. 여기서 먼저 찾는다** |
| `docs/RULES.md` | 에셋 출처, 원본 가공 허용, 오너 제작 원화, 코드 한도(Game.client 최상위 local 추가 금지) |
| `docs/CODE_MAP.md` | 코드 위치 지도 |
| `docs/DESIGN.md` | 게임 전체 설계 |
| `docs/AUTO_PLACEMENT.md` + `docs/auto_placement_needed.csv` + `docs/assets/auto_fill_board.md` | **자동 배치 필요 자산 목록 + 오늘 만들 것 10개·채움 현황판** (자동 채우기 규칙: `ASSET_MANAGEMENT.md` 5절). 항구·지상 탐험·해전·항해·백과 실물마다 만들 정확한 파일 이름. 이름만 맞추면 드롭박스 → 자동 등록 → 자동 배치 |
| `docs/ASSET_MANAGEMENT.md` | **자산 등록·관리. 256색(팔레트·감색) 원화·UI 등록 절대 금지**, 규격·체크리스트 |

## 2. 작업 종류별 필독
| 작업 | 반드시 읽을 것 |
|---|---|
| 마을·건물·항구 배치, 건축 시뮬, 구획, 주민 동선, 날씨 | **`docs/VILLAGE_LAYOUT_SPEC.md`(숫자 규격·구도·간격, 우선)** + `docs/PORT_VILLAGE_PROMPTS.md` + `docs/ports/README.md` + `docs/ports/<항구>.md` |
| 해전·지상전·퀘스트 배경 | `docs/battle_backdrops/README.md` + 해당 파일 (`naval/`, `field/`, `quests.md`) |
| 배 디자인·질감·등급 기능 | `docs/ships/README.md` + `docs/ships/grades.md` + `docs/ships/<배>.md` |
| 주민(NPC) 헤어·복장·악세·재질·모션 | **`docs/residents/OUTFIT_SPEC.md`(만들 파일 이름·부위·색·프롬프트, 자동 적용)** + `docs/residents/README.md` + `docs/residents/jobs.md` + `docs/residents/<문화권>.md` |
| 카드배틀 시스템·화면·이펙트·카드 문구·진영 | `docs/card_battle/README.md`(0절 카드 분류 규칙) + 같은 폴더 전부 |
| 백과사전 시각화·백과사전 수준 해설(875장) | `docs/ENCYCLOPEDIA_BRIEF.md` + `docs/encyclopedia_articles_needed.csv` |
| **비주얼 전면 재제작 목록·초상화 정리(주인공 15·동료 49·담당자 8)·프롬프트** | `docs/VISUAL_REMAKE_BRIEF.md` |
| 지상 전투 약점·반격·두목 단계·전투 목표, 특산품 잠금·길드 허가증 (움직임 포함) | `docs/FIELD_COMBAT_BRIEF.md` |
| 교역 흥정 미니게임 원화·상인 표정 움직임 | `docs/HAGGLE_MINIGAME_BRIEF.md` |
| 해양 퀘스트 표시·대규모 해전 확장·미구현 해상 그래픽(모델·효과·아이콘) | `docs/NAVAL_QUEST_EXPANSION_BRIEF.md` |
| 메뉴창 UI 고급화·하단 5버튼·퀘스트 UI 아이콘·프레임 제작 | `docs/MENU_UI_BRIEF.md` (아이콘 시트 칸 번호·파일 이름) |
| 퀘스트 이야기·인과관계(문제→원인→할 일→결과)·장(章) 쓰기 | `docs/STORY_CAUSALITY.md` + `docs/STORY_QUEST_SYSTEM.md` |
| 이벤트씬·세계 사건·역사 사건 원화, 카드 습득 연출 | `docs/EVENT_SCENES.md` (없는 원화 목록·파일 이름) |
| 카드·지식카드·지도자 원화 | `docs/CARD_ART_PROMPTS.md` + `docs/CARD_BATTLE_HANDOFF.md` + `docs/ASSET_MANAGEMENT.md` |
| 원화·UI·아이콘 자산 제작·등록·교체 | `docs/ASSET_MANAGEMENT.md` + `docs/assets/legacy_256color.txt`(교체 대상) |
| 스토리·연계 퀘스트 | `docs/STORY_QUEST_SYSTEM.md` |
| 지상 탐험 발견물(식물·동물·광물·유물·유적) 외형·모델 | `docs/discoveries/README.md` + `docs/discoveries/MISSING.md` |
| 동물 뼈대·애니메이션·리액션, 동물→몬스터 변형 | `docs/discoveries/ANIMAL_RIG_MOTION.md` + `docs/discoveries/README.md` |
| HUD·아이콘·버튼 효과 | 아래 3절 |
| **보스(지상 두목·해상 신화 괴물) 단계·스킬·모션·체력** | `docs/BOSS_BRIEF.md` |
| **카드배틀 모바일 궨트급(메뉴·규칙·연출·자산·프롬프트)** | `docs/card_battle/MOBILE_GRADE_BRIEF.md` (카드배틀 정본 묶음) |

## 3. HUD·아이콘·버튼 효과 규칙 (2026-11-24 오너 지시)
- **아이콘은 기존 청동 원화 시트만** 쓴다: `CardArt/ui_facility_icons`(512px, 4×4), `CardArt/ui_reserve_icons`, `CardArt/ui_reserve_icons_2`(768px, 4×4). 코드는 `Game.client`의 `H.facilityIconCells`, `H.reserveIconCells`, `H.hasIconArt`. 도형 그리기(Glyph)·임의 새 아이콘으로 바꾸지 않는다. 아이콘을 새로 만들 때도 같은 청동 컨셉으로 한다.
- **화면 반짝이 파티클 금지**: `sparkles_main` 류 반짝이·색광 원·파편을 아이콘마다 걸지 않는다.
- **남기는 효과는 하나뿐**: 아이콘이 커졌다 작아지는 맥동(`IconHeartbeat`). 실제 이벤트(조선소 수리, 인원 부족, 납품, 긴급 등)나 튜토리얼 안내(`GuideAlert`) 때만 켠다. 평소에는 멈춘다.
- 알림 표시는 아이콘 우상단 작은 **청동 느낌표 깃발 배지**(`FacilityNotice`) + 맥동.
- **해전·지상전 버튼은 같은 규칙**: 쿨타임은 원 음영이 아니라 아이콘 자체가 어두워진다. 준비완료·교체·가속 링은 아이콘 안쪽(0.80→0.94)에서만 돈다. 흰 원 섬광 대신 아이콘이 한 번 톡 커졌다 돌아온다. 효과가 아이콘보다 넓으면 안 된다.
- 걷기 버튼은 도크 2줄 맨 앞.

## 3-1. 메뉴창 구조 규칙 (2026-11-29 오너 지시)
- 기능과 관계없는 공통 원화 띠, 자동 순환 전시장, 공통 요약 카드 제거. 모든 메뉴는 기능 탭과 실제 조작 본문 중심.
- 기존 상품·선박·캐릭터·백과·퀘스트·지도 원화는 해당 기능에서 그대로 보존. 메뉴 배너 전용 자산은 보존하되 새로 제작하지 않는다.
- 자세한 정본: `docs/MENU_UI_BRIEF.md`.

## 3-2. 드롭박스 분류 (자산 올리는 곳 · 2026-11-28 오너 지시)
모든 그림·모델은 `/Vibe2Transfer/inbox/<종류>/<이름>` 으로 올리면 자동 검사 → 등록 → 배치된다. 이름은 소문자·숫자·`_`·`-`.

| 만드는 것 | 드롭박스 폴더 | 파일 이름 |
|---|---|---|
| 카드 원화(대륙·지식·사건) | `CardArt` | `<카드id>.png` |
| 카드배틀 UI | `CardArt` | `ui_<이름>.png` |
| 메뉴창 원화 배너 | `CardArt` | `menu_<메뉴>_<번호>.jpg` |
| 아이콘 | `Icons` | 기존 이름(교체) 또는 새 이름 |
| 초상 | `Portraits` | `<이름>.png` |
| 항구 건물·소품 | `Town` | `<항구id>_<슬롯>.glb` |
| 지상 탐험 원경 | `Terrain` | `field_<탐험지id>.glb` |
| 해전 배경 | `Naval` | `sea_<해역>_near|mid|far.glb` |
| 항해(수동 포함) 배경 | `Naval` | `voyage_<해역>_near|mid|far.glb` |
| 배 | `Naval` | `<배id>-v5.glb` |
| 백과 실물(동물·식물·광물·유물·유적) | `Animals`·`Terrain`·`Relics`·`Town` | `<카드id>.glb` |
| 주민 옷·머리·장신구 | `People` | `outfit_`·`hair_`·`acc_<이름>.glb` |
| 몬스터 | `Monsters` | `<이름>.glb` |

- 모델은 **GLB 만**(FBX 는 GLB 로 바꿔서). 그림·텍스처는 **풀컬러**(256색 금지).
- 정확한 파일 이름 전체 목록: `docs/AUTO_PLACEMENT.md` + `docs/auto_placement_needed.csv`. 규칙: `docs/ASSET_MANAGEMENT.md` 2-1절.
- 결과·거부 이유: `docs/assets/dropbox_inbox_report.md`.

## 4. 끝내기 전에
- **"중앙 검증기 실행 환경에 연결 못 해서 수정 보류"로 멈추지 않는다.** 사전점검은 중앙문서 4종을 읽고 main SHA를 적는 것이고, 검증은 PR의 기존 검사가 한다. 자세히: 루트 `AGENTS.md` '중앙 사전점검이 뜻하는 것'.
- `roblox-games/mare-essentia/tests/run.sh` 통과(최상위 local 여유 검사 포함).
- Studio 촬영으로 확인하기 전에는 "완료"라고 보고하지 않는다. 병합·배포·Studio 확인은 따로 보고한다.
