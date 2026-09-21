# Unity 게임 원본 프로젝트

`unity-games/<game-id>/`는 앞으로 재운게임즈 **1차 Web 게임의 Canonical Source**다.

## 기본 흐름

```text
설계 PASS
→ Unity 프로젝트
→ Unity Web Build
→ web-games/<game-id>/
→ 모바일/PC 브라우저 QA
→ Unity Web PASS
→ 기존 플랫폼 후속 플로우
```

1차 Web 단계만 Unity Web으로 통일한다. Roblox/UEFN 후속 구현 방식은 바꾸지 않는다.

## 같은 Unity 프로젝트 재사용

선택 플랫폼이 Unity면 별도 Web용/Android용 게임을 만들지 않는다.

하나의 `unity-games/<game-id>/` 프로젝트에서:

- Unity Web → 1차 브라우저 검증
- Android → APK/AAB
- 필요 시 다른 Unity 플랫폼 빌드

Scene, Prefab, C#, Animator, Material, VFX, UI, 전투, 퀘스트, 인벤토리, AI, 3D 에셋과 게임 데이터는 공통 소스다.

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

## Web 산출물

`web-games/<game-id>/`는 직접 HTML/JS 게임을 작성하는 원본 경로가 아니다.

Unity Web 빌드의 loader, wasm, data, framework.js, StreamingAssets 등 배포 산출물이 들어간다.

## 모바일 입력

게임 자체에서 Unity Input System, On-Screen Stick/Button, Pointer/Touch 또는 필요한 Virtual Joystick을 구현한다.

자동 QA의 키보드 입력은 모바일 조작 PASS가 아니다. `?qa=1`에서 실제 화면의 핵심 모바일 컨트롤 좌표를 `JAEWOON_UNITY_WEB_QA MOBILE_TARGET`으로 노출하고, 브라우저 Touch가 그 실제 컨트롤을 작동시켰을 때만 `MOBILE_INPUT status=PASS`를 기록한다.

장르 핵심 루프의 실제 상태 진행/보상 완료 시점에는 `CORE_FUN status=PASS loop=<genre-specific-loop>`를 기록한다. QA 전용 가짜 승리/보상/상태 변경으로 이 마커를 만들면 안 된다.

공통 Worker가 게임 밖에서 조이스틱을 강제로 주입하는 방식은 장기 기본 입력 경로로 사용하지 않는다.

## 그래픽

실제 게임 화면은 게임 에셋을 우선 사용한다. Primitive는 디버그, 충돌체, 임시 부족분에 한정한다.

무료/상업 사용 가능 또는 소유권이 명확한 에셋만 사용하고 라이선스 출처를 기록한다.

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

`web-games/<game-id>/`의 검증된 Unity Web 공개 산출물은 기존 홈페이지/Cloudflare 배포 정책에 따라 관리한다.

## 로컬 Unity 제어 브리지

```powershell
.\tools\unity-mcp\setup-unity-mcp.ps1 -ProjectPath .\unity-games\게임이름 -InstallUv -OpenUnity
```

자세한 로컬 Unity 제어는 `tools/unity-mcp/README.md`를 따른다.

정책 권한 원본은 `company-learning/platform-release-roadmap.json`의 `unityWebFirstStage`다.

실행/동기화 문서는 `company-learning/UNITY_WEB_FIRST_STAGE.md`를 따른다.
