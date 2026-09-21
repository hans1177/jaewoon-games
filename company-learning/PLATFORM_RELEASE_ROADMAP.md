# 플랫폼 출시 로드맵 — Roblox + Unity 앱 직접 동시개발

> 기계 정책 원본은 `company-learning/platform-release-roadmap.json`이다. 이 문서는 실행 이해용 미러이며 독립 정책 권한을 만들지 않는다.

## 개발 진입

Roblox 또는 Unity 앱 어느 한쪽 개발 요청이 들어오면 같은 게임의 두 플랫폼 구현을 자동으로 함께 시작한다.

```text
게임 요청
→ 공통 핵심 설계
→ Roblox 전용 설계 + Unity 앱 전용 설계
→ MINIMUM_DESIGN_CONTRACT_READY
→ Roblox 네이티브 개발 || Unity 앱 네이티브 개발
```

Unity Web은 신규 제작·검증·개발 입장 관문으로 사용하지 않는다.

## 설계

한 게임은 공통 코어를 공유하지만 플랫폼 환경이 다르므로 플랫폼 설계는 별도다.

- Roblox: Roblox 입력, 서버 권한, 세션/멀티, UI, DataStore/네트워크, Roblox 성능, Private/Restricted 내부출시
- Unity 앱: 터치/Input System, Scene/Prefab, 앱 세션, UI, Android 성능/메모리/발열, 저장/네트워크, 내부/Closed 테스트 빌드

엄격 설계 검토는 품질 향상을 위해 개발과 병렬로 계속할 수 있지만, 개발 시작 자격은 최소 설계 계약으로 판단한다.

## 네이티브 개발

각 게임은:

- `roblox-games/<game-id>/`
- `unity-games/<game-id>/`

두 원본을 별도로 가진다.

한 플랫폼 실패는 다른 플랫폼 개발을 취소하지 않는다. 게임 개수에는 인위적인 전역 제한을 두지 않으며 실행 시스템 용량에 따라 배치될 수 있다.

## QA

Roblox는 앞으로 Studio를 실행하지 않는다. Roblox 검증은 다음 Headless FAST_MVP 체인으로 통일한다.

1. Exact Source Static Validation
2. Rojo Package
3. Vibe + 공용모델 1회 Preflight
4. Server/Client Authority + Remote Security 계약검사
5. Mobile Input/UI 계약검사
6. Save/Rejoin 계약검사(저장 게임)
7. Multiplayer State Sync 계약검사(멀티 게임)
8. Headless Exact-Artifact Regression
9. Open Cloud Private/Restricted Publish

`robloxRuntimePassed` 같은 기존 Studio PASS 필드는 실제 과거 Studio 증거가 없으면 새로 true로 만들지 않는다. 새 자동출시 판정은 `robloxHeadlessFastMvpPassed`와 exact artifact evidence를 사용한다.

Unity 앱은 기존처럼 Build/Runtime/Independent QA/Regression을 독립적으로 통과한다. 한 플랫폼의 PASS는 다른 플랫폼 PASS로 승격되지 않는다.

## 내부 출시 — 1차 목표

- Roblox: Studio 없이 검증된 exact Rojo artifact를 Open Cloud로 Private/Restricted 경험에 게시한다.
- Unity 앱: 내부/Closed 테스트 빌드로 실제 기기에 설치하고 플레이

홈페이지는 company-runtime을 권위로 각 플랫폼 내부출시 상태를 따로 표시한다.

## 외부 출시 — 2차 목표

각 플랫폼은 자기 런타임, QA, 회귀검증과 공개 증거가 준비되면 서로 기다리지 않고 공개할 수 있다.

Roblox가 먼저 준비되면 Roblox 먼저 공개하고 Unity 앱은 계속 개발할 수 있으며 반대도 동일하다.

## 홈페이지/서버

권위 상태는 `company-runtime`에 저장한다.

- `development-queue.json`
- `game-seed-state.json`
- `game-catalog.json`
- `company-status.json`
- `homepage-platform-exposure.json`

홈페이지는 Roblox/Unity 앱의 개발, 내부출시, 공개 준비, 공개 상태를 각각 표시한다. 신규 Unity Web 플레이 버튼은 사용하지 않는다.

중앙 실행 동기화 문서는 `company-learning/DIRECT_NATIVE_DUAL_PLATFORM.md`다.
