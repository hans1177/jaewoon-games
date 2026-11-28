# 자산 등록·관리 지시서 (필독)

**ChatGPT·Claude·Codex·바이브코딩 도구 등 누구든 `mare-essentia`에 원화·UI·아이콘·카드·모델 자산을 만들거나 등록·교체할 때 반드시 읽고 그대로 따른다.**
루트 `AGENTS.md` 전역 금지 규칙과 `docs/RULES.md`가 우선한다.

## 1. 절대 금지: 256색 자산 (2026-11-24 오너 지시)
- **카드배틀 원화, 지식카드, 지도자, 메뉴 원화, UI 틀, 아이콘 시트 등 모든 이미지 자산은 풀컬러(24비트 RGB / 32비트 RGBA)만 등록한다.**
- 다음은 **등록 금지**:
  - PNG 팔레트 모드(`P`, 8비트 인덱스 색), 1비트 이미지
  - 128×128 이상인데 실제 색이 256개 이하인 그림(감색·디더링·GIF 변환본·"용량 줄이기" 저장본)
- 이미지 생성기·편집기에서 내보낼 때 **"PNG-8 / 256색 / 색상 수 줄이기 / 인덱스 색" 옵션을 끈다.** 용량을 줄이려면 색 수 대신 해상도를 맞춘다.
- 기계 차단:
  - `tools/devloop/register_asset.py` 가 256색 그림을 **거부**한다.
  - `tools/devloop/asset_color_check.py <게임폴더>` 가 **실제 등록 자산 + 등록 대기열(assets/inbox)** 을 검사하고, `tests/run.sh` 에서도 돈다. 등록 안 된 보관본(원본 증거 `src/`, 보류 `inbox-hold/`)은 게임에 안 쓰이므로 제외하지만, 그대로 등록하면 거부된다.
- 옛날에 이미 들어온 256색 자산은 `docs/assets/legacy_256color.txt` 에 **교체 대상**으로만 남아 있다.
  - 이 목록에 새 줄을 **추가하지 않는다**(추가로 통과시키는 것 금지).
  - 풀컬러 원본으로 교체하면 그 줄을 지운다. 교체 우선순위: 카드 원화(`eu_*`, `af_*` 등) → UI 틀(`ui_frame_*`) → 아이콘(`ui_icon_*`).

## 2. 등록 경로 (하나뿐)
1. 파일을 `assets/inbox/<종류>/` 에 넣는다. 종류 예: `CardArt`, `Menu`, `Portraits`, `Town`.
2. 같은 이름 + `.license.json` 을 붙인다: `license`, `author`, `source`(URL 또는 `PROJECT_ORIGINAL_ART`), 원본 가공이면 `derived:true`, `originalFiles`, `modification`.
3. `python3 tools/devloop/register_asset.py roblox-games/mare-essentia --dry-run` 으로 먼저 시험한다. 거부가 0건이어야 한다.
4. 실제 등록 → `owner-mare-essentia-assets` 워크플로로 Roblox 업로드 → `AssetIds.luau` 에 ID가 들어온다.
5. 코드는 **`AssetIds["종류/이름"]`으로만** 참조한다. `rbxassetid://숫자`를 코드에 직접 박지 않는다.
- 새 워크플로·유료 API·다른 업로드 경로를 만들지 않는다. 업로드 성공·ID를 지어내지 않는다.

## 2-1. 드롭박스 자동 인입 (오너 자산 · 2026-11-28)
오너가 드롭박스에 올리면 **자동 검사만 통과하면 사람 확인 없이** 등록·배치까지 간다.
- 올리는 곳: `/Vibe2Transfer/inbox/<종류>/<이름>.<확장자>`
  - 그림 종류: `CardArt` · `Icons` · `Portraits` · `Goods` · `Materials` (png/jpg)
  - 모델 종류: `Animals` · `Terrain` · `Relics` · `Town` · `Castle` · `Naval` · `People` · `Monsters` · `Interior` · `Cargo` (**glb 만**, FBX 는 GLB 로 바꿔서)
  - 이름: 소문자·숫자·`_`·`-` 만
- 자동 검사: 이름·형식·크기(그림 128~4096px, 모델 20MB 이하)·**256색 금지**·중복. 대륙 카드(eu_01 등)는 세로 7:10 → 1400×2000 으로 맞춤. 그 밖의 카드 그림 PNG 는 JPG 로 바꿔 등록(기존 UI PNG 및 아래 백과 전용 PNG 제외).
- 백과 전용 `ency_bg_book.png`(1600×1000), `ency_tab_sheet.png`(1024×1024), `ency_map_world.png`(2048×1024), `ency_scale_people.png`(512×512)는 PNG 원본 유지. 문양 시트·크기 비교 그림은 실제 알파 투명도 필수. 시트는 16칸 모두 그림이 있고 칸별 8% 여백을 충족해야 하며 독립 원본 16종과 합성 시각 검수 후 기존 승인표의 정확한 해시가 있어야 등록한다.
- 흐름: 기존 등록 워크플로(`owner-mare-essentia-assets`) 정기 실행이 드롭박스를 확인 → 통과분을 `register_asset.py` 로 정식 폴더에 넣고 main 저장 → 같은 등록기를 다시 불러 Roblox 등록 → `AssetIds` 반영. 대개 10~20분.
- 결과: `docs/assets/dropbox_inbox_report.md`(등록·거부 이유), 기록 `assets/dropbox-imported.json`. 드롭박스 쓰기 권한이 있으면 처리한 파일은 `_done/`, 거부는 `_rejected/` 로 옮긴다.
- **이름만 맞추면 게임에 자동 배치**:
  | 올린 이름 | 들어가는 곳 |
  |---|---|
  | 기존과 같은 이름(예: `CardArt/eu_05.png`, `Icons/…`) | 그 그림을 쓰던 자리 그대로 교체 |
  | `CardArt/menu_<메뉴>_<번호>.jpg` (예: `menu_harbor_02`) | 그 메뉴창 원화 배너에 자동으로 섞임 (메뉴: trade·harbor·route·quest·yard·explore·codex …) |
  | `<모델 종류>/<백과 카드 id>.glb` (예: `Animals/zoo_tiger.glb`) | 지상 탐험에서 그 카드의 실물 모델로 바로 쓰임(관찰 기록 현장 대신) |
  | 그 밖의 새 이름 | 등록·`AssetIds` 까지. 화면에 쓰는 자리는 코드에서 연결 필요 |

## 3. 품질·규격 체크리스트 (등록 전 모두 확인)
| 항목 | 기준 |
|---|---|
| 색 | 풀컬러 RGB/RGBA. 256색·팔레트 금지 (1절) |
| 해상도 | Roblox는 1024px 넘는 변을 줄인다. 카드 원화 세로 7:10은 **716×1024** 권장. 가로 사건 원화는 1024×576 이상 |
| 아이콘 시트 | 4×4 격자, 칸 크기 균일(768px 시트 = 192px 칸). 투명 배경 RGBA. 청동 컨셉 (`READ_FIRST.md` 3절) |
| 투명도 | 아이콘·UI 틀은 알파 채널 필수. 원화는 불투명 |
| 색 공간 | sRGB. CMYK·16비트 채널 금지 |
| 파일 | PNG(아이콘·UI) / PNG 또는 고품질 JPG(원화, 품질 90 이상). 파일당 10MB 이하 |
| 이름 | 소문자·숫자·밑줄만. 접두어 규칙 지키기: `eu_`·`af_`(대륙 카드), `event_`(사건), `ui_`(UI), `ui_icon_`(아이콘) |
| 중복 | 같은 그림 재등록 금지(해시 중복은 자동 거부). 비슷한 그림은 기존 자산 재사용 먼저 |
| 내용 | 실존 인물 사진·타사 캐릭터·로고 금지. 글자(문구)를 그림 안에 넣지 않는다(게임이 글자를 얹는다) |

## 4. 관리 방법
- **한 곳 기록:** 출처는 `assets/SOURCES.md`, 등록 목록은 `assets-registered.json`, ID는 `AssetIds.luau`. 세 곳이 서로 맞아야 한다.
- **미사용 정리:** `python3 tools/devloop/asset_check.py roblox-games/mare-essentia` 로 미등록 참조(오류)와 미사용 자산 수를 본다. 미사용 자산은 지우기 전에 오너에게 확인한다.
- **교체할 때:** 같은 키 이름으로 새 파일을 등록하고, 옛 파일·라이선스는 기록을 남긴 채 교체한다. 키 이름을 바꾸면 코드 참조도 같이 바꾼다.
- **원본 보관:** 가공 전 원본은 지우지 않는다. `originalFiles` 에 경로·해시를 적는다.
- **검수:** 등록 후 Studio 촬영으로 실제 화면에서 깨짐(흐림·계단 현상·잘림·색 띠)을 확인하기 전에는 "적용 완료"라고 보고하지 않는다.
- **보고:** 등록 성공, 업로드 성공, 게임 적용, Studio 확인을 따로 적는다. 하나라도 확인 안 됐으면 "미확인"이라고 쓴다.

## 5. 자동 채우기·자동 배치·자동 수정 (2026-11-28 오너 지시, 모두 필독)

| # | 무엇 | 어디 | 사람이 할 일 |
|---|---|---|---|
| 1 | **오늘 만들 것 10개** (항구 4·해전 3·백과 2·지상 1, 많이 보이는 것부터) | `docs/assets/auto_fill_board.md` | 맨 위부터 이름 그대로 만들어 드롭박스에 올리기 |
| 2 | **무료 원본(CC0) 자동 찾기** — 오늘 목록이 기존 부족 자산 장부에 `auto-slot-…` 로 들어감 | `assets-wanted.auto.json` → `tools/devloop/assets_wanted.py` | 없음 |
| 3 | **문화권 공통 대체** — `<항구>_<슬롯>` 이 없으면 `<문화권>_<슬롯>` (예: `iberia_house_1`) 하나로 그 문화권 항구 전부 채움. **대표 경관(landmark)은 제외**(다른 곳 것 사칭 금지) | `PortScene.cultureSlot` | 문화권 키: britain, china, colonial, creole, desert, france, hanse, iberia, italy, japan, korea, malabar, med, nordic, north, ottoman, pacific, seasia, stone, swahili, tropic, wafrica |
| 4 | **크기·바닥·방향 맞춤** — 배치 함수가 크기를 자리 크기에 맞추고 바닥에 붙임. 예외만 보정표에 `scale`·`yaw`·`y` | `Shared/PlacementOverrides.luau` | 원본은 정면이 -Z, 바닥이 원점 |
| 5 | **겹침·길 피하기** — 이름 규칙 자동 슬롯이 건물·길과 겹치면 6스터드 안에서 비킴 | `PlacementOverrides.avoidOverlap` | 없음 |
| 6 | **지역색** — 문화권 공통 모델을 항구마다 질감 없는 면만 12% 물들임 | `PlacementOverrides.regionTint` | 없음 |
| 7 | **Studio 자동 판정** — 질감 없는 회색 덩어리는 배치 제외, 결과표 남김 | `tools/devloop/placement_autofix.py` + `studio-scripts/asset-autocheck.json` → `docs/assets/asset_autocheck.md` | 표에 뜬 것 다시 만들기 |
| 8 | **모바일 경량** — 부품 300개 넘는 모델은 폰에서 숨김(기존 모델로 대체) | 같은 판정 → `mobileHide` | 가벼운 판(부품 300개 이하) 올리기 |
| 9 | **안 쓰는 자산 찾기** | `docs/assets/unused_assets.md` | **지우기 전 오너 확인** |
| 10 | **채움 현황판** — 장면별 채움 % | `docs/assets/auto_fill_board.md` 위쪽 | 없음 |

- 갱신: `python3 tools/devloop/auto_placement_status.py` (드롭박스 인입 단계에서도 실행).
- 보정표 AUTO 구역은 도구가 다시 쓴다. 사람이 고칠 항목은 AUTO 구역 **밖**에 넣는다.
