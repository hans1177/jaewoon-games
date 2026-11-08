# Mare Scientia 작업 규칙 (세션이 바뀌어도 같은 품질 유지)

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
- 배포 워크플로(`owner-mare-scientia-direct-publish.yml`): 배포 전에 고정 버전 Luau 로 전체 테스트를 돌린다(지금은 경고만, 안정되면 차단으로 전환). 수동 실행의 `rollback_ref` 에 정상이던 커밋을 넣으면 그 소스를 다시 게시한다.
- `visual_lint.py --prev`: 이전 캡처와의 변화량을 보여 준다(0.3 미만이면 장면 갱신 안 됨 의심).
