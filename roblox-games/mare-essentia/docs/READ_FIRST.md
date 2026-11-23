# mare-essentia — 모든 작업자 필독 (READ FIRST)

**ChatGPT·Claude·Codex·Copilot·Cursor·Gemini·바이브코딩 도구 등 누구든 `mare-essentia`를 만지기 전에 이 파일과 아래 해당 지시서를 반드시 읽고 그대로 따른다.**
읽지 않았으면 읽었다고 말하지 않는다. 지시서와 다르게 만들면 되돌린다. 저장소 루트 `AGENTS.md`(전역 금지 규칙·중앙정책)가 항상 우선한다.

## 1. 무엇을 하든 공통
| 문서 | 내용 |
|---|---|
| `docs/RULES.md` | 에셋 출처, 원본 가공 허용, 오너 제작 원화, 코드 한도(Game.client 최상위 local 추가 금지) |
| `docs/CODE_MAP.md` | 코드 위치 지도 |
| `docs/DESIGN.md` | 게임 전체 설계 |

## 2. 작업 종류별 필독
| 작업 | 반드시 읽을 것 |
|---|---|
| 마을·건물·항구 배치, 건축 시뮬, 구획, 주민 동선, 날씨 | `docs/PORT_VILLAGE_PROMPTS.md` + `docs/ports/README.md` + `docs/ports/<항구>.md` |
| 해전·지상전·퀘스트 배경 | `docs/battle_backdrops/README.md` + 해당 파일 (`naval/`, `field/`, `quests.md`) |
| 배 디자인·질감·등급 기능 | `docs/ships/README.md` + `docs/ships/grades.md` + `docs/ships/<배>.md` |
| 주민(NPC) 헤어·복장·악세·재질·모션 | `docs/residents/README.md` + `docs/residents/jobs.md` + `docs/residents/<문화권>.md` |
| 카드배틀 시스템·화면·이펙트·카드 문구·진영 | `docs/card_battle/README.md`(0절 카드 분류 규칙) + 같은 폴더 전부 |
| 카드·지식카드·지도자 원화 | `docs/CARD_ART_PROMPTS.md` + `docs/CARD_BATTLE_HANDOFF.md` |
| 스토리·연계 퀘스트 | `docs/STORY_QUEST_SYSTEM.md` |
| HUD·아이콘·버튼 효과 | 아래 3절 |

## 3. HUD·아이콘·버튼 효과 규칙 (2026-11-24 오너 지시)
- **아이콘은 기존 청동 원화 시트만** 쓴다: `CardArt/ui_facility_icons`(512px, 4×4), `CardArt/ui_reserve_icons`, `CardArt/ui_reserve_icons_2`(768px, 4×4). 코드는 `Game.client`의 `H.facilityIconCells`, `H.reserveIconCells`, `H.hasIconArt`. 도형 그리기(Glyph)·임의 새 아이콘으로 바꾸지 않는다. 아이콘을 새로 만들 때도 같은 청동 컨셉으로 한다.
- **화면 반짝이 파티클 금지**: `sparkles_main` 류 반짝이·색광 원·파편을 아이콘마다 걸지 않는다.
- **남기는 효과는 하나뿐**: 아이콘이 커졌다 작아지는 맥동(`IconHeartbeat`). 실제 이벤트(조선소 수리, 인원 부족, 납품, 긴급 등)나 튜토리얼 안내(`GuideAlert`) 때만 켠다. 평소에는 멈춘다.
- 알림 표시는 아이콘 우상단 작은 **청동 느낌표 깃발 배지**(`FacilityNotice`) + 맥동.
- **해전·지상전 버튼은 같은 규칙**: 쿨타임은 원 음영이 아니라 아이콘 자체가 어두워진다. 준비완료·교체·가속 링은 아이콘 안쪽(0.80→0.94)에서만 돈다. 흰 원 섬광 대신 아이콘이 한 번 톡 커졌다 돌아온다. 효과가 아이콘보다 넓으면 안 된다.
- 걷기 버튼은 도크 2줄 맨 앞.

## 4. 끝내기 전에
- `roblox-games/mare-essentia/tests/run.sh` 통과(최상위 local 여유 검사 포함).
- Studio 촬영으로 확인하기 전에는 "완료"라고 보고하지 않는다. 병합·배포·Studio 확인은 따로 보고한다.
