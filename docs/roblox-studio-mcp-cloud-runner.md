# Roblox Studio MCP — 클라우드 Windows 작업자 정상화 및 F9 배포

이 문서는 `hans1177/jaewoon-games`의 **필수 Roblox Studio MCP 실제 플레이** 게이트를 정상적으로 실행하는 방법을 설명합니다. 로컬 PC는 필수는 아니지만, **인증된 대화형 Windows 데스크톱**은 필요합니다. 현재의 단발성 GitHub-hosted `windows-latest` 연결 진단은 Roblox 계정·Studio 로그인 세션을 보존하지 않으며, 실제 플레이 증거가 아닙니다.

## 클라우드 Windows 전용 경로 — 로컬 PC 불필요

**실행 장소는 본인 PC가 아니라 원격 Windows 클라우드 VM**입니다. `self-hosted`는 GitHub Actions의 러너 분류명일 뿐, 로컬 PC를 뜻하지 않습니다. 클라우드 VM도 `[self-hosted, Windows, X64, roblox-studio-authenticated]` 조건을 만족할 수 있습니다.

GitHub-hosted `windows-latest`는 일회용 작업자로 Studio 설치/연결 **진단**은 수행할 수 있지만, Roblox 계정의 인증된 대화형 Studio 세션을 다음 작업까지 유지하지 못합니다. 이를 실제 플레이 PASS로 표시하지 않습니다. 클라우드 VM 생성 및 과금은 자동 승인하지 않습니다.

1. **지속형 원격 Windows VM**을 준비하고 클라우드 제공업체 콘솔이나 보안 원격 데스크톱으로 접속합니다. 공개 RDP(3389) 포트를 전 세계에 열지 않고, 제공업체의 안전한 원격 접속 수단과 방화벽을 사용합니다.
2. **그 VM 안에서** 공식 Roblox Studio를 설치하고 Roblox 계정으로 로그인한 뒤 테스트 Place를 열고 `Assistant → … → Manage MCP Servers → Enable Studio as MCP server`를 켭니다. 사용자의 로컬 PC에는 Studio·러너를 설치하지 않습니다.
3. **같은 원격 Windows 데스크톱의 PowerShell**에서 아래 명령을 실행합니다.

```powershell
git clone https://github.com/hans1177/jaewoon-games.git
cd jaewoon-games
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\connect-roblox-studio-mcp-free-windows.ps1 -CheckOnly
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\connect-roblox-studio-mcp-free-windows.ps1
```

스크립트의 파일명은 기존 무료 실행기 이름을 유지하지만 **클라우드 VM에서도 동작**합니다. 공식 GitHub Actions 러너의 다운로드/해시 검증, Roblox 서명 검증과 대화형 Studio 세션 확인을 수행합니다. 실행 중 표시되는 등록용 **1회용 GitHub 토큰은 원격 VM 콘솔에만** 입력합니다. 토큰/쿠키/비밀번호를 저장소, Actions Secrets, 채팅 또는 워크플로 로그에 복사하지 않습니다.

4. VM에서 러너가 `Online/Idle`인지 [GitHub Actions 러너 설정](https://github.com/hans1177/jaewoon-games/settings/actions/runners)에서 확인합니다. Studio와 러너는 **동일한 원격 Windows 로그인 데스크톱 세션**에 있어야 하며, Session 0 Windows 서비스 형태는 허용하지 않습니다.
5. 기존 `Official Studio MCP actual play` 작업이 활성 대기 중이면 러너 연결 시 자동 실행됩니다. 과거 실행이 **cancelled**인 경우 [기존 Roblox QA](https://github.com/hans1177/jaewoon-games/actions/workflows/company-development-roblox-post-runtime-qa.yml)에서 `Run workflow → game_id`로 정확한 게임을 다시 요청합니다. 후보·정적 검사만으로 F9를 통과 처리하지 않습니다.

이 방식은 **클라우드 배포 자동화**이고, 본인 PC를 전혀 사용하지 않아도 됩니다. 단, 원격 VM의 최초 Studio 로그인/MCP 활성화는 계정 소유자가 실행해야 하며, VM 사용료는 클라우드 제공업체 조건에 따릅니다.

## 1. 먼저 준비할 것

1. 원격 접속 가능한 **지속형 Windows 클라우드 VM** 또는 보안이 유지되는 Windows 작업자 한 대를 준비합니다. 생성 및 요금은 사용자가 직접 확인·승인해야 합니다.
2. VM의 Windows 사용자 데스크톱에 로그인하여 **공식 Roblox Studio**를 설치하고 본인 Roblox 계정으로 Studio에 로그인합니다. 비밀번호·쿠키·로그인 세션을 GitHub 저장소, 로그, Secrets, 자동 스크립트에 복사하지 않습니다.
3. Roblox Studio에서 로컬 테스트 Place를 열고 `Assistant → … → Manage MCP Servers → Enable Studio as MCP server`를 켭니다. 변경 후 필요하면 Studio를 재시작합니다.
4. GitHub의 [Settings → Actions → Runners](https://github.com/hans1177/jaewoon-games/settings/actions/runners)에서 Windows x64 self-hosted runner를 등록하고, 커스텀 라벨 **`roblox-studio-authenticated`** 를 지정합니다.
5. **동일한 로그인 Windows 데스크톱 세션에서** `run.cmd`로 작업자를 실행합니다. Windows 서비스(Session 0) 형태로 실행하지 않습니다. 이 작업은 Roblox Studio의 실제 화면·MCP 서버에 접근해야 합니다. VM 화면 잠금·사용자 로그아웃·자동 재시작도 실제 플레이 중 방해하지 않도록 관리합니다.

GitHub runner 등록 명령과 일회성 등록 토큰은 GitHub 설정 화면에서 발급받으세요. 이 문서나 저장소에 토큰을 하드코딩하지 않습니다. 클라우드 제공업체 계정, VM, 원격 로그인을 ChatGPT가 대신 만들어 둔 것으로 간주해서는 안 됩니다.

## 2. Studio MCP 연결 확인

- GitHub Runners 화면에서 `self-hosted`, `Windows`, `X64`, `roblox-studio-authenticated` 라벨 작업자가 **Online/Idle**로 표시되는지 확인합니다.
- Studio Assistant의 MCP 화면에서 연결된 클라이언트 수를 나타내는 **녹색 표시**를 확인합니다.
- Studio 앱을 연 Windows 사용자와 GitHub runner를 실행한 Windows 사용자는 동일해야 합니다.
- Studio 설치 경로는 `%LOCALAPPDATA%\Roblox\Versions` 또는 `Program Files (x86)\Roblox\Versions`를 지원합니다. 공식 서명된 `RobloxStudioBeta.exe`와 Studio MCP 실행 파일만 허용합니다.
- Studio MCP를 켰는데 도구가 보이지 않으면 Studio를 닫았다 다시 열고, MCP 연결도 재시작한 뒤 로그인된 Place 창이 정상 등록됐는지 확인합니다.

인증·연결 확인은 **실제 플레이 통과가 아닙니다.** 다음 단계에서 정확한 후보 게임의 `start_stop_play`·입력·화면 캡처·콘솔 로그를 검사해야 합니다.

## 3. 기존 GitHub 자동화 재개

기존 워크플로: [Roblox Runtime Foundation QA](https://github.com/hans1177/jaewoon-games/actions/workflows/company-development-roblox-post-runtime-qa.yml).

- 이미 `Official Studio MCP actual play <gameId>`가 **queued/pending**인 실행은 적합한 인증된 runner가 온라인이면 자동 배정됩니다. 불필요하게 중복 실행하거나 기존 대기열을 지우지 마세요.
- Studio 작업이 실패한 경우 `ROBLOX_STUDIO_INTERACTIVE_SESSION_REQUIRED`, `ROBLOX_STUDIO_OFFICIAL_INSTALL_REQUIRED`, `ROBLOX_STUDIO_MCP_OFFICIAL_SIGNATURE_REQUIRED`, `ROBLOX_STUDIO_MCP_SETTING_ENABLE_REQUIRED`, `OFFICIAL_MCP_TOOL_PROVIDER_TIMEOUT` 로그로 원인을 구분합니다.
- 대기 작업이 취소되었을 때만 기존 Runtime Foundation QA의 **Run workflow**에서 해당 `game_id`를 지정하고 다시 요청합니다.
- 성공한 공식 Studio MCP 실제 플레이 기록은 `company-runtime/development-queue.json`의 **정확한 sourceRevision / artifactIdentity / candidateVersionNumber**와 일치해야 합니다. 해당 기록은 F9로 자동 연결됩니다.

## 4. 배포 기준

1. **공식 Studio MCP 실제 플레이 PASS**: 인증된 Studio에서 해당 게임의 플레이 시작, 조작, 캡처, 콘솔·런타임 확인 및 정확한 후보 식별값 일치.
2. **Open Cloud 독립 검증 PASS**: 같은 후보의 Roblox 엔진 API 테스트. HTTP 429는 성공이 아니며, `retryNotBefore` 이후의 제한된 재시도만 실행합니다.
3. **F9 최종 리뷰 PASS**: 두 독립 근거와 코드·회귀·제품 적합성을 확인합니다.
4. **정확한 F9 통과 버전만 정식 배포**하고 배포 후 버전 QA를 수행합니다.

**금지:** Studio 인증 우회, 플레이 증거 임의 생성, 코드 QA만으로 F9 PASS 표시, 공개 서버 Player 봇·외부 GUI 매크로·미문서 Studio CLI 사용.

공식 문서: https://create.roblox.com/docs/studio/mcp
