# Roblox 게임 소스

`company-learning/platform-release-roadmap.json#roblox`의 Roblox 정책을 실제 소스 구조로 구현하는 루트다.

## 규칙

- 게임별 소스는 `roblox-games/<game-id>/` 아래에 둔다.
- V3 Pump와 `tools/vibe3-roblox-platform.mjs` 어댑터를 사용한다.
- **Roblox Studio는 자동 개발·검증·출시 경로에서 사용하지 않는다.**
- 패키지는 exact source revision에서 Rojo로 `.rbxlx`를 생성한다.
- Vibe + 공용 모델 1회 preflight를 사용하며 부서별 5모델 강제는 사용하지 않는다.
- 모바일 입력/UI를 기본으로 설계한다.
- 서버 권한과 클라이언트 표시 로직을 분리하고 Remote 입력은 서버에서 검증한다.
- 저장이 있으면 DataStore save/rejoin 계약검사를 통과해야 한다.
- 멀티플레이가 있으면 역할/라운드/공유상태/Remote 동기화 계약검사를 통과해야 한다.
- Headless 검증은 `robloxHeadlessFastMvpEvidence` / `robloxHeadlessFastMvpPassed`에 기록한다.
- Studio를 실행하지 않았는데 `robloxRuntimePassed`, `actualStudioRuntime`를 새 PASS로 기록하지 않는다.
- 내부 출시는 **Open Cloud Private/Restricted publish**만 사용한다.
- Universe/Place ID는 Studio 출력이 아니라 company-runtime publication target, prior proven Open Cloud release, owner-pinned Open Cloud target에서 해결한다.
- 쿠키 인증과 Studio UI publish는 금지한다.

## Headless FAST_MVP 게이트

`Exact Source → Static Contract → Rojo Package → Vibe Shared-Model Preflight → Authority/Security → Mobile → Save/Rejoin → Multiplayer Sync → Headless Regression → Open Cloud Private Publish`

## 기본 구조

`base/`는 새 Roblox 게임을 시작할 때 복사 기준으로 쓰는 최소 소스다. 게임 규칙·밸런스·저장 키는 포함하지 않는다.
