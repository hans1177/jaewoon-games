# Roblox 게임 소스

Roblox 게임의 실제 소스 구조를 관리하는 루트다. 삭제된 중앙정책 문서는 더 이상 참조하지 않으며, 현재 저장소의 실행 코드와 게임별 검증 결과를 기준으로 한다.

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

## 전 화면 네이티브 3D 강제 정책 — 2026-10-18

- **모든 보이는 메뉴·HUD·인벤토리·도움창·전투 숫자·스킬 아이콘·알림·상태 정보까지 실제 3D 월드/카메라 공간 오브젝트여야 한다. 2D 예외는 없다.**
- `Workspace` 또는 실제 3D 카메라 공간에서 `Model`/`MeshPart`/`Part` 등 깊이·부피가 있는 모델을 사용한다. 검증된 3D 글자 메시와 3D 패널/아이콘을 사용하고 클릭은 3D 레이캐스트/히트박스 입력으로 판정한다.
- `ScreenGui`, `BillboardGui`, `SurfaceGui`, `TextLabel`, `ImageLabel` 등 Roblox의 2D GuiObject를 플레이어에게 보이는 최종 UI로 사용하는 것은 금지한다. 3D 파트에 붙이는 `SurfaceGui`도 2D이므로 통과하지 못한다.
- 기존 공통 2D UI는 **레거시 전환 대상**이며 신규/수정된 최종 화면에 적용하지 않는다. 실물 3D 오브젝트 기반의 동등 기능·저장·멀티·터치 조작이 검증될 때까지 기존 플레이 가능한 게임 소스는 삭제하지 않는다.
- 3D 깊이·메시·재질·글리프·레이캐스트·모바일 조작·장면 캡처 등 정확한 실행 증거가 없으면 3D UI 완성/배포 합격을 주장하지 않는다. Headless 정적 계약은 Roblox 실제 런타임을 대신하지 않는다.
- 기준은 `company-learning/platform-release-roadmap.json#livingMotionVisualQualityContract.minimumSpatialPresentation`; Unity/보류 플랫폼 잠금과 기존 릴리스 권한은 변경하지 않는다.

## Headless FAST_MVP 게이트

`Exact Source → Static Contract → Rojo Package → Vibe Shared-Model Preflight → Authority/Security → Mobile → Save/Rejoin → Multiplayer Sync → Headless Regression → Open Cloud Private Publish`

## 기본 구조

`base/`는 새 Roblox 게임을 시작할 때 복사 기준으로 쓰는 최소 소스다. 게임 규칙·밸런스·저장 키는 포함하지 않는다.
