# Roblox + Unity 앱 직접 동시개발 중앙 동기화 문서

정책 원본은 `company-learning/platform-release-roadmap.json#directNativeDualPlatformDevelopment`이다. 이 문서는 사람이 읽기 위한 동기화 문서이며 독립 정책 권한을 만들지 않는다.

## 개발 진입

게임 하나에 대해 Roblox 또는 Unity 앱 개발을 요청하면 같은 게임의 두 플랫폼 개발을 자동으로 함께 시작한다.

```text
Owner/Vibe game request
→ 공통 핵심 설계
→ Roblox 전용 설계 + Unity 앱 전용 설계
→ MINIMUM_DESIGN_CONTRACT_READY
→ Roblox native development || Unity app native development
```

Unity WebGL은 개발 진입/출시 관문으로 사용하지 않는다. 대신 동일 `unity-games/<game-id>/` 원본에서 만든 검증된 WebGL 빌드를 홈페이지 소유자 테스트용 validation surface로 사용할 수 있다.

## 설계

플랫폼 환경이 다르므로 같은 플랫폼 설계를 복사하지 않는다.

- 공통 코어: 정체성, 핵심 재미, 코어 루프, 시스템, 성장, 밸런스, 실패/재시도, 멀티 의미
- Roblox 프로필: Roblox 입력, 서버/클라이언트 권한, 세션, 멀티, UI, 성능, 저장/네트워크, Roblox 콘텐츠 적응, 비공개 내부출시
- Unity 앱 프로필: 모바일 터치, 씬/프리팹, 세션, 멀티, UI, Android 성능/발열/메모리, 저장/네트워크, 앱 콘텐츠 적응, 내부/비공개 테스트 빌드

최소 설계 계약이 완성되면 네이티브 개발을 시작할 수 있다. 엄격 설계 검토는 품질 향상을 위해 병렬로 계속 실행된다.

## Vibe

Vibe는 공통 코어 설계를 공유하되 Roblox와 Unity 앱 구현을 각각 플랫폼 네이티브로 작성한다. 한쪽 요청이 들어오면 다른 쪽도 같은 게임 ID로 자동 생성/수리 큐에 들어간다. 한쪽 실패는 다른 쪽을 취소하지 않는다.

검증된 Roblox/Unity 결과는 기존 공통 학습 메모리로 돌아가며 별도 그림자 학습 파이프라인을 만들지 않는다.

## 부서

기존 기획, 그래픽/에셋, 개발, QA, 밸런스, 사운드/연출, 보안, 기록/거버넌스, 마케팅/성장 부서는 유지한다. 공통 부서는 게임 정체성과 공통 자산/규칙을 지원하고, 구현·런타임·QA는 Roblox와 Unity 앱에서 각각 독립 증거를 만든다.

## 동시성

게임 개수에 인위적인 전역 개발 제한을 두지 않는다. GitHub/모델/러너가 처리 가능한 양만 실행 배치로 나눌 수 있지만, 배치 크기는 개발 자격이나 총 게임 수 제한이 아니다.

## 내부 출시와 외부 출시

1차 목표는 내부 출시다.

- Roblox: 서버에 게시하되 Private/Restricted 상태로 유지해 소유자/허용 테스터가 실제 Roblox 앱에서 플레이
- Unity 앱: 내부 또는 비공개 테스트 빌드로 설치/실행

내부 플레이테스트와 수리 후 각 플랫폼은 자기 런타임, 독립 QA, 회귀검증과 명시적 공개 증거가 준비되면 외부 공개할 수 있다. Roblox가 먼저 준비되면 Roblox 먼저 공개할 수 있고 Unity도 반대가 가능하다.

## 홈페이지/서버 동기화

홈페이지의 권위는 `company-runtime`이다. 홈페이지는 게임마다 Roblox와 Unity 상태를 별도로 표시한다.

- 개발 중
- 내부 출시 가능
- 내부 플레이테스트/수리
- 공개 출시 준비
- 공개 출시

서버 상태 파일에는 `development-queue.json`, `game-seed-state.json`, `game-catalog.json`, `company-status.json`, `homepage-platform-exposure.json`이 포함된다. 홈페이지는 검증된 Unity WebGL 빌드가 있을 때 별도 `Unity Web 테스트` 링크를 표시할 수 있다. 이 링크는 테스트 표면이며 Unity 앱 런타임/QA/출시 증거를 대체하지 않는다.
