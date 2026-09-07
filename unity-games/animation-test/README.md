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

## PC Unity / 외부 총괄 빌드

실제 Unity 컴파일은 사용자의 Windows PC에 설치된 Unity Editor와 Android Build Support를 사용한다.
GitHub-hosted Unity/GameCI 라이선스 빌드는 기본 경로로 사용하지 않는다.

외부 ChatGPT 총괄이나 다른 승인된 총괄 AI는 `.build-requests/unity/animation-test.json`을 갱신해 GitHub에 빌드 요청을 넣을 수 있다.
GitHub Actions의 `Unity Local PC Android APK` 작업이 `jaewoon-unity` self-hosted Windows runner를 통해 사용자 PC에서 Unity를 실행한다.
성공하면 `animation-test.apk`를 GitHub artifact와 `animation-test-latest` prerelease에 업로드한다.

### PC 1회 연결

저장소 최신 main을 받은 뒤 저장소 루트 PowerShell에서 한 번 실행한다.

```powershell
.\tools\unity-mcp\setup-external-build-runner.ps1
```

이 스크립트는 GitHub self-hosted runner를 현재 Windows 사용자 계정에 연결하고 로그인 시 자동 시작하도록 구성한다.
Unity 라이선스는 PC 로컬 것을 그대로 사용하므로 `UNITY_LICENSE`, `UNITY_EMAIL`, `UNITY_PASSWORD` Actions secret은 필요하지 않다.

로컬 MCP/총괄도 같이 사용할 때는 기존대로:

```powershell
.\tools\unity-mcp\start-unity-ai.ps1 -ProjectPath .\unity-games\animation-test
```

## Android APK

프로젝트에는 `Assets/Editor/AndroidCiBuild.cs`가 있으며 Android APK 빌드 진입점은 `AndroidCiBuild.Build`이다.
출력 경로는 `Build/animation-test.apk`다.

## 검증 상태

- 외부 총괄 빌드 요청 파일: 구성 완료
- PC 설치 Unity를 사용하는 self-hosted workflow: 구성 완료
- 첫 외부 빌드 요청: GitHub Actions에 생성 완료
- PC `jaewoon-unity` runner 연결 전에는 해당 작업이 queued 상태로 대기한다.
