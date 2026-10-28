# Roblox Studio MCP — 클라우드 Windows 작업자 정상화 및 F9 배포

이 문서는 `hans1177/jaewoon-games`의 **필수 Roblox Studio MCP 실제 플레이** 게이트를 정상적으로 실행하는 방법을 설명합니다. 로컬 PC는 필수는 아니지만, **인증된 대화형 Windows 데스크톱**은 필요합니다. 현재의 단발성 GitHub-hosted `windows-latest` 연결 진단은 Roblox 계정·Studio 로그인 세션을 보존하지 않으며, 실제 플레이 증거가 아닙니다.

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
