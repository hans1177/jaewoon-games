# 바이브 엔진 읽기 전용 점검 (2026-11-07)

## 구조 사실
- 워크플로 141개. Roblox 개발 단계(F0~F9)는 `company-development-roblox-*.yml` 10개(합 약 1만 1천 줄)에 흩어져 있고, 대부분 YAML 안에 JS가 인라인으로 들어 있다.
- 단계 통과 여부는 `game-catalog.json` 게임 항목의 필드(`robloxFoundationF0Passed`, `robloxF9ReleaseRegressionPassed`, `canonicalState` 등)와 `.vibe2/queue.json`에 기록된다.
- 게임 43개(개발확정 35, 설계만 8). `fantasy-survival` 은 등록돼 있다.
- **`mare-scientia` 는 `game-catalog.json` 과 `.vibe2/queue.json` 어디에도 없다.** 그래서 F0~F9가 한 번도 적용된 적이 없고, 배포는 `owner-mare-scientia-direct-publish.yml` 단독으로 이뤄진다.
- 기존 F9/게시 후 검증은 "서버 부팅·실행" 증거 중심이며, **화면(사진) 증거 단계는 없다.** 사진 캡처는 `fantasy-opening-studio-check.yml`(마력숲 오프닝 한정)에만 있다.
- 오너 PC 러너(라벨 `roblox-studio-authenticated`)와 `tools/company-development-roblox-studio-local-play.mjs`(Studio MCP: screen_capture, execute_luau, start_stop_play, get_console_output 등)가 이미 있어 사진·플레이 검증을 재사용할 수 있다.

## 약한 곳
1. 화면 증거가 게임 공통 게이트에 없다.
2. 절차가 게임별·파일별로 흩어지고 인라인 JS라 수정·테스트가 어렵다.
3. 새 게임을 엔진에 올리는 표준 절차(설정 한 줄)가 없다.
4. 사람·AI가 이어받을 기억 파일 표준이 없다(Mare의 `STATE.md` 가 첫 사례).

## 안전한 업그레이드 순서 (기존 엔진을 갈아엎지 않는다)
1. **공통 사진 검증 워크플로 일반화**: `devloop-studio.yml` 을 `game` 입력(게임 id)과 게임별 스크립트(`<game>/tools/devloop/studio-scripts/*.json`)로 일반화. 마력숲에 먼저 적용(오프닝 캡처 재사용).
2. **공통 합격선 스크립트** `tools/devloop/gate.py <game>`: 에셋 등록 검사, 오류 0(텔레메트리/Studio 콘솔), 사진 존재·갱신 확인. 게임별 설정은 `<game>/devloop.json` 한 파일.
3. **기억 표준**: `<game>/docs/devloop/STATE.md` 템플릿.
4. **엔진 연결(마지막, 별도 승인)**: F9 뒤에 "사진 증거" 필드를 `game-catalog.json` 에 추가하고 mare-scientia 를 등록. 다른 에이전트와 충돌하지 않게 작은 PR로.
5. **정리**: 사용 기록이 없는 워크플로는 삭제하지 말고 먼저 `disabled` 목록으로 표시만 한다.
