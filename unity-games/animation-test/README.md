# Animation Test

바이브2 애니메이션 에셋 규칙 검증용 Unity 모바일 테스트 게임.

## 내용

- 플레이어: Pirate
- 적: Skeleton
- 캐릭터/적 모두 실제 애니메이션 스프라이트시트 사용
- 사용 상태: idle / walk / attack / hurt / death
- 화면 왼쪽 길게 누르기: 적에게 이동
- 화면 오른쪽 누르기: 공격
- 키보드 테스트: D 이동, Space 공격, R 재시작

## 에셋

- 원본: https://github.com/chongdashu/ai-pixel-snapped-game-sprites
- 라이선스: MIT
- 런타임에서 원본 GitHub raw 스프라이트시트와 manifest.json을 읽어 애니메이션을 구성한다.
- 정지 캐릭터, 원형/구체/primitive 캐릭터는 사용하지 않는다.

## Unity 실행

Unity 6에서 이 폴더를 프로젝트로 연다.
Editor 스크립트가 `Assets/Scenes/Main.unity`를 만들고 Build Settings에 등록한다.
Play를 누르면 테스트가 시작된다.

## PC 로컬 Unity / MCP 사용

재운게임즈 기본 방식대로 PC에 설치된 Unity Editor와 `tools/unity-mcp` 로컬 브리지를 사용한다.
GitHub-hosted Unity/GameCI 라이선스 빌드는 사용하지 않는다.

저장소 루트 PowerShell에서 테스트 프로젝트를 열 때:

```powershell
.\tools\unity-mcp\start-unity-ai.ps1 -ProjectPath .\unity-games\animation-test
```

로컬 Unity 라이선스와 설치된 Android Build Support를 그대로 사용한다.
별도 `UNITY_LICENSE`, `UNITY_EMAIL`, `UNITY_PASSWORD` GitHub Actions secret은 필요하지 않다.

## Android APK

프로젝트에는 `Assets/Editor/AndroidCiBuild.cs`가 있으며 Android APK 빌드 진입점은 `AndroidCiBuild.Build`이다.
로컬 Unity/MCP 또는 로컬 Unity batchmode에서 이 빌드 함수를 호출한다.
출력 경로는 `Build/animation-test.apk`다.

## 검증 상태

소스와 애니메이션 검증 규칙은 main에 반영됨.
APK 실제 생성/실기기 검증은 PC의 로컬 Unity Editor/MCP 세션에서 수행한다.
