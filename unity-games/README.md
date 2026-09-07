# Unity 모바일 게임 원본 프로젝트

앞으로 새 Unity 모바일 게임 원본은 `unity-games/게임이름/` 아래에 둔다.

## 기본 대상

- 플랫폼: Android 우선
- 엔진: 로컬에 설치된 Unity 6 계열
- 게임 형태: 3D 모바일 우선
- Unity Personal 사용 가능 범위에서 운영
- Unity AI / Unity Pro 기능 의존 금지
- 유료 외부 AI 자동결제 금지

## 프로젝트에 커밋할 것

- `Assets/`
- `Packages/`
- `ProjectSettings/`
- 필요한 `.meta` 파일

## 커밋하지 않을 것

- `Library/`
- `Temp/`
- `Logs/`
- `UserSettings/`
- 로컬 `Build/`, `Builds/`
- APK/AAB 결과물

APK/AAB는 테스트나 배포 산출물로 취급하고 소스 저장소에는 기본적으로 넣지 않는다.

## 대용량 에셋

FBX, Blender, PSD, 고용량 오디오/영상 등은 루트 `.gitattributes`의 Git LFS 규칙을 따른다.

## 로컬 Unity 제어 브리지

새 프로젝트 생성 후 저장소 루트에서 한 번 실행한다.

```powershell
.\tools\unity-mcp\setup-unity-mcp.ps1 -ProjectPath .\unity-games\게임이름 -InstallUv -OpenUnity
```

이 스크립트는 무료 MIT 라이선스의 `CoplayDev/unity-mcp` v10.0.0을 프로젝트에 고정 등록하고, 로컬 MCP 실행 준비를 확인한다.

Unity에서 패키지 로딩이 끝나면 한 번만:

`Window > MCP for Unity > Configure All Detected Clients`

그 뒤부터 MCP 호환 로컬 AI 직원이 Unity Editor의 씬, GameObject, 컴포넌트, 스크립트, 테스트, 빌드 작업을 제어할 수 있다.

자세한 내용은 `tools/unity-mcp/README.md`를 따른다.
