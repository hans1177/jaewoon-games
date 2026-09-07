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

## 기존 프로젝트 보호

`web-games/survival2/unity/`의 기존 Unity 2022 프로젝트는 기존 게임 보존용이므로 새 Unity 6 모바일 3D 프로젝트와 분리해서 유지한다.
