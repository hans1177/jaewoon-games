# 재운컴퍼니 Unity 로컬 제어 브리지

목표: Unity AI/Unity Pro에 의존하지 않고 로컬 Unity Editor를 외부 AI 직원이 MCP로 제어하고, 사람이 매번 VS Code에서 지시하지 않아도 재운컴퍼니 총괄이 작업을 이어가게 한다.

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
- 유료 API 키를 자동 총괄 실행에 사용하지 않음
- 추가 크레딧 구매/플랜 업그레이드 금지
- 로컬 MCP 우선
- 외부 공개 포트로 임의 노출 금지
- 프로젝트 작업 루트는 `unity-games/` 우선
- 핵심 결정만 한재운 승인, 나머지는 총괄 AI가 결정

## 자동 총괄 순환

`run-company-ai.ps1`은 다음 순서로 설치된 CLI를 확인한다.

```text
Codex
→ Gemini CLI
→ GitHub Copilot CLI
→ CodeBuddy
```

현재 총괄이 무료/현재 구독 포함 사용량 한도, 인증 문제 또는 반복 실행 오류로 더 진행할 수 없으면 다음 총괄로 넘긴다. 총괄 역할은 `.github/agents/director.agent.md`, `COMPANY_FLOW.md`, `company-status.json`을 기준으로 동일하게 유지된다.

자동 실행에서는 `OPENAI_API_KEY`, `AZURE_OPENAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, `CODEBUDDY_API_KEY`를 자식 AI 프로세스에서 제거해 API 종량제 경로로 자동 전환하지 않게 한다. 각 서비스 계정 자체의 추가 유료 사용 설정을 켜는 동작도 하지 않는다.

핵심 결정이 필요하면 총괄은 `OWNER_DECISION_REQUIRED:`로 종료하고 자동 작업을 멈춘다.

## 프로젝트 만든 뒤 1회 설정

저장소 루트 PowerShell:

```powershell
.\tools\unity-mcp\setup-unity-mcp.ps1 -ProjectPath .\unity-games\게임이름 -InstallUv -OpenUnity
```

Unity가 패키지를 받아 컴파일한 뒤:

`Window > MCP for Unity > Configure All Detected Clients`

한 번 구성하면 MCP 호환 AI 클라이언트가 실행 중인 Unity Editor에 연결할 수 있다.

## 재운컴퍼니 자동 시작

현재 세션에서 Unity/MCP/총괄을 함께 시작:

```powershell
.\tools\unity-mcp\start-unity-ai.ps1
```

Windows 로그인 때도 자동으로 재운컴퍼니를 시작하려면 한 번만:

```powershell
.\tools\unity-mcp\start-unity-ai.ps1 -InstallAutoStart
```

이 옵션은 현재 Windows 사용자의 Startup 폴더에 `JaewoonCompanyAI.cmd`를 만든다. 이후 로그인하면 Unity 프로젝트, 로컬 MCP 서버, 총괄 순환기가 자동으로 시작된다. 중복 총괄은 로컬 PID 잠금으로 차단한다.

자동 총괄만 끄고 Unity/MCP만 시작하려면:

```powershell
.\tools\unity-mcp\start-unity-ai.ps1 -NoCompanyRunner
```

총괄 실행 로그는 `%TEMP%\jaewoon-company-ai.log`, 로컬 상태는 저장소 루트의 `.jaewoon-company-ai-state.json`에 저장된다. 상태/잠금/핵심결정 파일은 Git에 커밋하지 않는다.

## Unity 창

MCP 창 자체는 계속 열어둘 필요 없다. Unity Editor가 실행 중이고 MCP 서버/세션이 살아 있으면 창을 닫아도 된다.

## 중요

ChatGPT 모바일 채팅 자체가 사용자의 `localhost`에 직접 접속하는 것은 아니다. 실제 실시간 Editor 제어는 로컬 MCP 클라이언트가 브리지에 연결됐을 때 가능하다. GitHub 파일 수정/커밋은 별도로 계속 자동화할 수 있다.
