# Mare Essentia 작업 규칙 (세션이 바뀌어도 같은 품질 유지)

## 에셋
- 승인된 CC0 에셋만 쓴다(`assets-registered.json` / `AssetIds.luau`). AI 생성·웹 다운로드·실존 인물 이미지 금지.
- 소스가 쓰는 모든 에셋은 `tools/devloop/asset_check.py` 가 검사한다. `tests/run.sh` 에 포함돼 있어 오타·미등록은 배포 전에 걸린다.
- 임의 도형 조립(Part 로 건물·나무 만들기)으로 모델을 때우지 않는다. 없는 에셋은 부족 목록에 기록한다.

## 문화권(항구 양식)
- 데이터는 `src/ReplicatedStorage/Shared/PortCultures.luau` 한 곳: `STYLE`(벽·지붕·재질) / `PROFILE`(골목·집 크기·간격) / `OUTFIT`(옷·모자) / `REGION`(항구→양식).
- 새 문화권: 위 네 표에 한 줄씩 + `PortScene.luau` 의 소품(`key == ...`)·랜드마크 분기 + 필요하면 `Pose.addHat` 모자 추가.
- `tests/cultures.test.luau` 가 표 누락(재질·프로필·복식·알 수 없는 양식·시작 항구 일반 양식 사용)을 검사한다.

## 배포·검증
- 한방패치: 직접 수정 → main → 자동 배포. 배포 간격은 최소 5분.
- 푸시 전 `LUAU_DIR=… bash tests/run.sh` 가 통과해야 한다(타입·에셋·로직·문화권 표).
- 화면 검증: `tools/devloop/gen_capture.py` 로 캡처 스크립트를 만들고(`studio-scripts/*.json`), 캡처 결과 폴더를 `visual_lint.py` 로 한 장 시트·이상 화면 검사 후 눈으로 확인한다.
- 다른 게임·공용 엔진·저장 키는 요청 없이 건드리지 않는다.

## 소통
- 사용자 응답은 짧은 한국어. 끝에 결과 한두 줄과 다음 단계 하나.

## 엔진 도구 (`tools/devloop/`)
- `gate.py <게임>`: 에셋 등록 + 캡처 브랜치(사진 존재·오류 0·나이) + 시각 검수(visual_lint) 합격선.
- `new_game.py <게임>`: 새 게임을 엔진에 올리는 표준 절차(devloop.json·STATE.md·캡처 스크립트 폴더 생성).
- `workflow_inventory.py`: 워크플로 149개 점검 → `docs/devloop/WORKFLOW_INVENTORY.json` (읽기 전용, 삭제·비활성화는 하지 않는다).
- game-catalog / .vibe2 큐 등록은 공용 파이프라인이 게시·F0 재시작을 자동으로 돌릴 수 있어 오너 확인 후에만 한다.

## 스모크 빌드·롤백
- `tests/smoke_portscene.luau`: 엔진 목업(`smoke_prelude.luau`)에서 17개 항구 × 발전도 1~5 를 실제로 지어 보며 런타임 오류와 미등록 에셋 요청을 잡는다. (첫 실행에서 `find("tree-oak")` 패턴 버그를 찾아 고침: 문자열 찾기엔 항상 `find(x, 1, true)`)
- 배포 워크플로(`owner-mare-essentia-direct-publish.yml`): 배포 전에 고정 버전 Luau 로 전체 테스트를 돌린다(지금은 경고만, 안정되면 차단으로 전환). 수동 실행의 `rollback_ref` 에 정상이던 커밋을 넣으면 그 소스를 다시 게시한다.
- `visual_lint.py --prev`: 이전 캡처와의 변화량을 보여 준다(0.3 미만이면 장면 갱신 안 됨 의심).

## 에셋 등록 흐름
1. `python3 tools/devloop/assets_wanted.py roblox-games/mare-essentia` → `assets-wanted.json` (부족 목표 + 코드의 미등록 참조 + inbox 대기).
2. 새 파일을 `assets/inbox/<종류>/` 에 넣고 `<파일>.license.json`(license·author·source) 작성 → `python3 tools/devloop/register_asset.py roblox-games/mare-essentia [--dry-run]`.
   라이선스 누락·허용 목록 밖·출처 없음·차단 해시·중복은 거부된다.
3. `owner-mare-essentia-assets` 워크플로로 업로드 → `AssetIds` 반영 → `asset_check.py` 통과.

## 아이템 표시 (UI)
- 큰(60px↑) 3D 아이템은 `ViewportFrame` 안에서 천천히 회전, 큰 상품 그림은 기울기·숨쉬기(2.5D 카드). 화면에 남은 것만 최대 10개를 한 곳(`addItemMotion`)에서 갱신한다. 새 도형은 만들지 않는다.

## 실존 인물 초상 자동 수집·등록·적용 (사람이 다운로드하지 않는다)
- 목록: `famous-figures.json` (학자 19명). 수집기 `tools/devloop/fetch_commons.py` 가 위키미디어 공용 API 로 검색해 **퍼블릭 도메인/CC0 표시 + 인물 이름 일치 + 제외어(동상·묘·우표 등) 통과** 그림만 받아 3:4 로 잘라 `assets/portraits/scholar_<id>.jpg` 로 저장하고 `portraits-report.json` 에 원본 URL·제작자·라이선스를 남긴다.
- 흐름: `owner-mare-essentia-assets` 워크플로(푸시 또는 수동 실행) → 수집 → Open Cloud 업로드 → `AssetIds` 반영 → 커밋. 배포 후 탐험 탭 "이 항구의 학자" 행에 초상이 뜬다(등록된 인물만).
- 로컬 샌드박스는 위키 접속이 막혀 있어 CI 러너에서만 동작한다. 못 받은 인물은 보고서에 `no-public-domain-match`/`error` 로 남고 초상 없이 표시된다. 잘못 고른 그림은 `avoid` 에 파일명 조각을 넣고 해당 `scholar_*.jpg` 를 지우면 다음 실행에서 다시 고른다.

> ⚠️ **지식 카드 784장 그림은 ChatGPT가 직접 제작한 것만 쓴다. 바이브는 제작·수집 금지(검수·승인·연결만).** 아래 자동 수집 절차는 중단 상태이며 다시 켜지 않는다. 자세한 규칙: `assets/cardart/SEALED.md`

## 도감 카드 그림 자동화 (위키백과 대표 이미지 → 수정 → 등록 → 적용)
- `tools/devloop/fetch_card_art.py` 가 카드 788장의 한국어 이름으로 한국어 위키백과 문서의 대표 이미지를 찾고, 라이선스가 퍼블릭 도메인/CC0/CC BY 인 것만 받는다(SA·ND·NC·비자유 제외, 국기·로고·지도 제외).
- **원본 그대로 쓰지 않는다**: 4:3 자르기 · 채도 낮춤 · 자동 대비 · 따뜻한 색조 · 비네팅 · 금색 안쪽 테두리로 도감 풍으로 수정한다.
- 한 번에 80장씩(`--limit`) 받아 `assets/cardart/<카드id>.jpg` → 업로드(`CardArt/<id>`) → `AssetIds` → `CardArt.luau` 가 자동으로 합쳐 도감 카드에 표시. 출처·라이선스는 `CardArtCredits.luau`(자동 생성)와 카드 상세의 "그림 출처"에 나온다.
- 워크플로 `owner-mare-essentia-assets` 를 수동 실행(Run workflow)할 때마다 다음 80장이 진행된다. 진행 상황·실패 사유는 `assets/cardart/cardart-report.json`.

## 코딩 능력 강화 도구
- **린터** `tools/devloop/lint_luau.py` (`tests/run.sh` 에 포함, 자체 시험 `tests/lint_selftest.sh`): R1 하이픈 등 패턴 문자가 든 `find` 에 평문 옵션 누락, R4 같은 함수 중복 정의, `--diff origin/main` 이면 R2 기본 도형(Part 등) 추가·R3 디버그 print/TODO 추가. 예외는 줄 끝 `-- lint:ok`.
- **회귀 방지**: 버그를 고치면 재현 검사를 하나 붙인다(예: 스모크 빌드가 참나무·소나무·야자·집 에셋이 실제로 요청되는지 확인).
- **코드 지도** `tools/devloop/code_map.py` → `docs/CODE_MAP.md`: 파일별 줄 수·함수 줄 번호·의존성. 큰 파일(Game.client 4700줄)을 통째로 읽지 말고 지도로 위치부터 찾는다. 큰 변경 뒤에는 다시 생성한다.
- **자동 되돌리기**: 배포 워크플로 `rollback_ref` 입력(수동). 배포 후 자동 판정은 아직 없음(게임 런타임 검증이 필요).
- **미적용(위험 때문에 보류)**: `Game.client`·`PortScene` 대규모 분할 — 엔진 없이 실행 검증이 안 되는 상태에서 한꺼번에 옮기면 배포가 깨질 수 있어, 기능 단위로 하나씩 옮기며 스모크 빌드로 확인한다.

## 이미지 검수 (2026-11-08 제재 이후)
- 새 이미지는 바이브가 직접 보고 검수해 `assets/APPROVED_IMAGES.json`에 이름+sha256을 올린 것만 업로드된다 (업로드 스크립트가 강제). 오너 승인을 기다리지 않는다 (오너 지시 2026-11-08, 중앙정책 `contentSafety.autonomousVibeReview`).
- 검수 기준: 술(맥주 포함)·담배·마약(아편 포함)·피/상처/질병 근접/해부·노출(고전 명화 포함)·실존 인물 사진은 차단. 애매하면 차단하고 `blockedAssets`에 올린 뒤, 바인딩을 빼고 배포는 계속한다.
- 실존 인물 사진·위키 자동 선별 이미지는 자동 파이프라인으로 올리지 않는다.
- 외부(위키 등)에서 가져온 사진은 원본 그대로 올리지 않는다. `tools/devloop/sketchify.py 입력 출력`으로 연필 스케치로 바꾼 뒤, 사람이 확인하고 APPROVED_IMAGES.json에 등록한 것만 올린다.
