# Unity 앱 게임 원본 프로젝트

`unity-games/<game-id>/`는 재운게임즈 Unity **앱 네이티브 구현의 Canonical Source**다.

## 현재 흐름

```text
공통 핵심 설계
+ Unity 앱 전용 플랫폼 설계
→ unity-games/<game-id>/
→ Unity 앱 네이티브 구현
→ APK/AAB 또는 내부 테스트 빌드
→ Unity 런타임 QA
→ 독립 QA
→ 회귀검증
→ 내부/비공개 테스트 출시
→ 공개 출시 준비
→ 공개 출시
```

Unity WebGL은 선행 관문이 아니다. 동일 Unity 프로젝트에서 소유자용 브라우저 검증 빌드를 병렬 생성할 수 있다.

## Roblox와의 자동 쌍

같은 게임이 Roblox 또는 Unity 앱 어느 쪽에서 시작되더라도 두 구현이 자동으로 함께 개발된다.

- Roblox 원본: `roblox-games/<game-id>/`
- Unity 앱 원본: `unity-games/<game-id>/`

공통 게임 의미는 공유하지만 입력, UI, 세션, 네트워크, 성능, 저장/앱 수명주기 등 플랫폼 설계와 구현은 각각 독립적이다.

## Unity 앱 플랫폼 설계

Unity 구현은 `design-revised.json#content.platformProfiles.UNITY`를 직접 사용한다.

필수 항목:

- Input System / 터치
- 앱 세션 및 suspend/resume
- 멀티 런타임
- Android 성능/메모리/발열
- Unity UI / safe area
- 저장/네트워크
- 플랫폼 콘텐츠 적응
- 내부 테스트 출시 목표
- 검증 증거

## 기본 프로젝트 구조

- `Assets/Scenes/`
- `Assets/Scripts/`
- `Assets/Prefabs/`
- `Assets/Art/`
- `Assets/Materials/`
- `Assets/Animations/`
- `Assets/Audio/`
- `Assets/UI/`
- `Assets/Data/`
- `Assets/Editor/`
- 필요 시 `Assets/Addressables/`

## 빌드

기본 네이티브 대상은 Android 앱이다.

- APK/AAB
- 내부 또는 Closed 테스트 빌드
- 필요 시 스토어 공개 빌드

Unity WebGL 빌드는 `web-games/<game-id>/`에 검증용으로 생성할 수 있다. 이는 Android 앱 빌드나 출시 판정을 대신하지 않으며, 홈페이지에는 검증 manifest가 통과한 경우에만 테스트 링크가 노출된다.

## 에셋/성능

실제 게임 에셋을 우선 사용하며 Primitive는 디버그·충돌체·임시 부족분에 한정한다. 라이선스 출처를 기록한다.

모바일에서는 메모리, GPU, 발열, 배터리, 로딩, draw call, texture, shader, particle, audio, GC를 실제 기기 기준으로 검증한다.

## 커밋

커밋:

- `Assets/`
- `Packages/`
- `ProjectSettings/`
- 필요한 `.meta`

기본 비커밋:

- `Library/`
- `Temp/`
- `Logs/`
- `UserSettings/`
- 로컬 임시 Build 폴더
- APK/AAB 산출물

정책 권한 원본은 `company-learning/platform-release-roadmap.json#directNativeDualPlatformDevelopment`다.

동기화 문서는 `company-learning/DIRECT_NATIVE_DUAL_PLATFORM.md`를 따른다.
