# 재운컴퍼니 Unity 로컬 제어 브리지

목표: Unity AI/Unity Pro에 의존하지 않고 로컬 Unity Editor를 외부 AI 직원이 MCP로 제어할 수 있게 한다.

## 선택한 브리지

- MCP for Unity: `CoplayDev/unity-mcp`
- 고정 버전: `v10.0.0`
- 라이선스: MIT
- Unity 지원: 2021.3 LTS ~ 6.x
- 요구사항: Python 3.10+ 실행 환경을 `uv`로 제공
- 외부 AI 클라이언트가 씬/GameObject/컴포넌트/스크립트/테스트/빌드 작업을 호출할 수 있다.

## 재운컴퍼니 정책

- Unity AI 사용 필수 아님
- Unity Pro 사용 필수 아님
- 자동 유료 결제 금지
- 로컬 MCP 우선
- 외부 공개 포트로 임의 노출 금지
- 프로젝트 작업 루트는 `unity-games/` 우선

## 프로젝트 만든 뒤 1회 실행

저장소 루트 PowerShell:

```powershell
.\tools\unity-mcp\setup-unity-mcp.ps1 -ProjectPath .\unity-games\게임이름 -InstallUv -OpenUnity
```

스크립트가 하는 일:

1. Unity 프로젝트 여부 확인
2. `Packages/manifest.json`에 MCP for Unity v10.0.0 고정 등록
3. `uv` 확인, `-InstallUv` 사용 시 WinGet으로 설치 시도
4. Unity Hub Editor/Android Build Support 탐지
5. `-OpenUnity` 사용 시 해당 프로젝트를 Unity로 실행

## Unity에서 남는 1회 작업

Unity가 패키지를 받아 컴파일한 뒤:

`Window > MCP for Unity > Configure All Detected Clients`

이 설정 뒤부터 MCP 호환 AI 클라이언트가 실행 중인 Unity Editor에 연결할 수 있다.

## 중요

ChatGPT 모바일 채팅 자체가 사용자의 `localhost`에 직접 접속하는 것은 아니다. 실제 실시간 Editor 제어는 로컬 MCP 클라이언트(Codex, VS Code 계열 MCP 클라이언트, 로컬 AI 등)가 이 브리지에 연결됐을 때 가능하다. GitHub 파일 수정/커밋은 별도로 계속 자동화할 수 있다.
