# Vibe2

Vibe2에서 사람이 유지하는 운영 문서는 이 파일 하나다.

- 중앙 기계 원본: `vibe2-runtime.json`
- 현재 작업 상태: `.vibe2/queue.json`
- Adaptive 병렬 상태: `.vibe2/parallelism-control.json`
- 검증 경험: `.vibe2/experience.json`
- 교차게임 학습 지식: `.vibe2/game-study-knowledge.json`
- 자동 인수인계 출력: `node tools/vibe2-handoff.mjs`
- 제어 브랜치: `vibe2-unreal-core`
- 실제 후보 작업 기준: 최신 `main`

작업량이 크면 파일 개수로 억지 분할하지 않고 **검증 가능한 구현 단계로 나눠 연속 진행**한다. 새 작업자는 위 기계 파일을 순서대로 읽고 자동 인수인계 출력을 확인한 뒤 이어서 작업한다.

정책·Motion·Visual Autonomy·Adaptive Backpressure·GAME STUDY의 상세 계약은 사람이 별도 문서로 중복 관리하지 않고 `vibe2-runtime.json`을 기준으로 한다. 수동 인수인계 문서는 만들지 않는다.

## Work Package Execution

Vibe2 개발은 작은 파일 수정 개수나 동시에 돈 worker 수를 성과로 보지 않는다. 한 planning cycle은 **기능 package 1개 완료 후보 또는 직접 연관 개선 3개 이상**을 최소 작업량 목표로 삼는다.

Planner는 작은 seed task를 받으면 먼저 같은 기능 경계에서 실제로 존재하는 진단, 유지보수, UX/가독성, QA 보강, 성능 안전성 후보를 찾고 서로 다른 책임 파일이면 같은 package로 묶는다. 실제 관련 후보가 부족한 경우에만 직접 연관된 오류 처리, 모바일 UX, 회귀 QA, 기본 성능 점검 scope를 명시적으로 추가한다. 숫자만 올려 작은 task를 큰 작업처럼 취급하지 않는다.

구현 전에는 **읽기 전용 exploration worker**가 구조, 영향 범위, 관련 파일, 테스트 후보를 먼저 수집한다. 이 결과는 reuse key가 붙은 handoff로 구현 worker에 전달하며, 이후 QA·성능·리뷰 worker와 다음 사이클도 같은 조사 결과와 실패 원인을 재사용한다. 같은 내용을 worker마다 다시 찾는 준비 낭비를 줄이는 목적이다.

Package 역할은 `exploration → implementation → test → performance → regression → review`로 분리한다. **소스 수정 권한은 implementation worker만 가진다.** 탐색·QA·성능·회귀·리뷰 역할은 읽기 전용 검증 역할이며 같은 파일 동시 수정은 계속 금지한다. 전체 회귀가 실제 통과하고 앞선 필수 역할 증거가 모두 PASS여야 fan-in review가 PASS된다.

긴 package의 `implementation-owner`에는 **보호 슬롯 1개**를 먼저 배정한다. 작은 작업이 계속 들어와도 큰 기능 owner가 무기한 밀리지 않게 하되, source/file lock과 기존 안전 규칙은 그대로 적용한다.

완료는 코드 수정만으로 처리하지 않는다. 탐색 handoff 재사용 + 구현 + incremental QA + 성능 sanity + 전체 회귀 + fan-in review + 필요한 machine 계약/중앙 문서 동기화까지 확인해야 package 완료 조건을 만족한다.

작업량 telemetry는 다음을 기준으로 본다.

- 완료된 기능 package 수
- 실제 변경 파일 수와 추가/삭제 라인 수
- 재작업률
- incremental QA 중복률
- package cycle time
- checkout/model 준비시간 비중

낮은 효율이 연속 package에서 반복되면 다음 planning cycle의 최소 package 작업량을 단계적으로 높인다. 안전 규칙, QA, 보호된 게임 규칙이나 저장 의미를 낮춰서 처리량을 올리지는 않는다.

중앙 machine 계약은 `vibe2-runtime.json`이다. 구현 구조가 바뀌는 작업은 별도 지시 없이 해당 계약과 이 문서를 함께 동기화한다. 핵심 권한/보호 규칙 변경은 owner 지시 없이 자동 확정하지 않는다.

## GAME STUDY — External Game Learning

GAME STUDY는 기존 게임을 그대로 복제하는 기능이 아니라 **검증된 플레이·허가된 소스에서 일반화 가능한 제작 지식만 증류**하는 서버 학습 파이프라인이다.

기본 흐름은 다음과 같다.

`외부 Web/Roblox 대상 → 실제 AUTO PLAYER/허가 소스 분석 → 단일게임 25축 intelligence → Experience Memory → fan-in → 교차게임 knowledge → 다음 학습/제작에서 재사용`

운영 규칙:

- 실행 위치는 서버다. client local learning은 사용하지 않는다.
- 24시간 runner가 반복 호출하며 일반 Vibe2 작업과 같은 병렬 풀을 사용한다.
- 절대 병렬 상한은 20이고 Adaptive Backpressure `20 → 16 → 12 → 8 → 4`를 공유한다.
- worker는 `.vibe2/experience.json`, `.vibe2/game-study-knowledge.json`, `.vibe2/queue.json`을 직접 쓰지 않는다.
- 장기 상태는 fan-in 한 곳에서만 직렬화해서 갱신한다.
- 실제 입력, 필수 checkpoint 전부 PASS, runtime error 0인 검증 결과만 장기 학습에 승격한다.
- 수치·인과·품질을 관찰하지 못했으면 추측하지 않고 `INSUFFICIENT_EVIDENCE`로 남긴다.
- `authorityExpanded=false`이며 학습이 보호된 gameplay/save/economy/progression 권한을 확대하지 않는다.

### Production Fan-in Reliability

production GAME STUDY는 `예약 → worker artifact → production guard → fan-in → Knowledge/Experience → 다음 planner` 순서를 지킨다.

- `tools/vibe2-game-study-production-fanin.mjs`가 예약 matrix와 실제 artifact를 대조한다.
- 예약 결과가 없거나 JSON이 손상됐거나 task/target/engine이 맞지 않으면 PASS를 추정하지 않는다.
- `PASS` artifact는 반드시 `study.verified=true`여야 하며 `authorityExpanded=true` 결과는 사용할 수 없다.
- 예약하지 않은 stale artifact는 fan-in 입력에서 제외한다.
- 같은 task의 artifact가 둘 이상이면 어느 하나를 임의 선택하지 않고 전부 모호한 결과로 제외한다.
- 누락·손상·중복 결과는 명시적인 `FAIL` evidence로 바뀌어 기존 `maxRetries` 정책을 타므로 task가 `running`에 영구 고정되지 않는다.
- artifact 다운로드 단계 자체가 실패해도 guard가 빈 결과 디렉터리를 기준으로 누락 task를 정리할 수 있다.
- 24시간 runner에서 planning이 성공했다면 일반 continuous job이 실패하더라도 GAME STUDY는 독립적으로 실행된다.
- External Game Study Smoke는 실제 Chrome artifact를 임시 production queue에 fan-in하고, 새 cross-game Knowledge가 실제 queued 구현 작업의 advisory planner context로 다시 들어가는 것까지 end-to-end 검증한다.

### Source / Download Policy

Web 공개 게임은 기본적으로 `observation-only`다. 소스 분석은 소유했거나 명시적으로 허가된 서버 workspace에서만 수행한다.

Roblox 외부 게임은 세 경로로 나눈다.

- 공개 플레이만 가능: 관찰 학습만 하며 generic external Roblox active automation은 켜지 않는다.
- 제작자가 Place Copying/Download를 명시적으로 허용: 서버에서 임시 `.rbxlx` 사본을 받아 구조·스크립트 패턴을 분석할 수 있다.
- 제작자가 Place Copying을 명시적으로 허용하고 실제 Studio runtime 검증이 가능한 경우: `tools/vibe2-roblox-studio-cli-runner.mjs`가 Roblox 공식 Studio CLI `RunScript` 경로로 place를 열고 StudioTestService + VirtualInput 실제 입력을 수행할 수 있다. 이 경로도 `creator-enabled-place-copying` 증거가 필수다.

Roblox 허가 다운로드는 `creator-enabled-place-copying` 증거와 nonce-bound 다운로드 증거가 일치해야 한다. copy-locked Place 우회 다운로드는 허용하지 않는다. 다운로드한 raw Place는 임시 workspace에서만 사용하고 분석 후 삭제한다. Experience Memory와 GAME STUDY Knowledge에는 raw source나 게임 고유 수치를 복사하지 않고 일반화 패턴만 남긴다.

공식 Studio CLI 경로에서도 raw Luau source를 artifact/Knowledge에 기록하지 않는다. 허가된 Studio 세션 안에서 정적 패턴을 검사한 뒤 `DataStoreService`, Remote, input, RunService, CollectionService, PathfindingService, MarketplaceService, Humanoid 같은 **일반화된 패턴 이름/토큰만** sanitized workspace에 남긴다. runtime evidence는 기존 nonce, `vibe2-roblox-studio-runtime` authority, `studioTestService=true`, `virtualInput=true`, 실제 입력 1회 이상, 필수 checkpoint 전부 PASS, runtime error 0 조건을 그대로 적용한다.

첫 실제 후보는 Roblox Creator Hub가 uncopylocked 예제로 제공하는 Potion Shop Demo place `14215142052`다. 대상은 real self-hosted Windows Studio smoke가 성공하기 전에는 `enabled=false`를 유지하며, smoke 성공 후에만 production GAME STUDY 대상으로 승격한다.

### Roblox Windows Runner Bootstrap

실제 Studio 검증 runner는 Windows self-hosted runner이며 필수 custom label은 `vibe2-roblox`다. 자동 준비 도구는 `tools/vibe2-roblox-runner-bootstrap.ps1`이다.

- Roblox Studio는 runner와 같은 Windows 사용자에 설치·로그인돼 있어야 한다. bootstrap은 Studio를 임의 계정으로 설치하거나 인증정보를 저장하지 않는다.
- 기본 `RunnerMode=Interactive`는 `C:\actions-runner`에 GitHub Actions runner를 등록하고 로그인 사용자 세션의 예약 작업 `Vibe2RobloxRunner`로 `run.cmd`를 유지한다. Studio UI/VirtualInput 검증을 같은 사용자 세션에서 실행하기 위한 기본값이다. 필요할 때만 `RunnerMode=Service`를 명시한다.
- bootstrap은 GitHub 공식 repository runner registration-token API를 사용한다. 토큰을 source/파일/로그에 기록하지 않는다.
- `VIBE2_GITHUB_ADMIN_TOKEN`은 Windows 머신 환경에서만 제공한다. 자동 등록에는 repository `Administration:write`, readiness 변수 갱신에는 `Variables:write`, `-DispatchLiveSmoke`까지 사용하면 `Actions:write` 권한이 필요하다.
- `-SyncReadiness`는 Roblox Studio 발견 + GitHub runner online + `vibe2-roblox` label 확인을 모두 통과한 뒤에만 repository variable `VIBE2_ROBLOX_STUDIO_RUNNER_READY=true`를 쓴다. 실패/제거 시 readiness를 먼저 false로 내릴 수 있다.
- `-DispatchLiveSmoke`는 readiness가 올라간 뒤 `.github/workflows/vibe2-roblox-studio-live-smoke.yml`을 `vibe2-unreal-core` ref로 실행한다.
- readiness만 true인 것은 학습 PASS가 아니다. real Studio smoke에서 실제 VirtualInput, checkpoint, 허가된 Potion Shop source distillation까지 PASS한 뒤에만 Potion Shop production target을 `enabled=true`로 승격한다.

권장 1회 등록 명령은 **관리자 PowerShell**에서 토큰을 환경변수로 주입한 뒤 `pwsh -File tools/vibe2-roblox-runner-bootstrap.ps1 -Mode Install -SyncReadiness -DispatchLiveSmoke`다. 토큰 값 자체는 저장소나 명령 기록에 남기지 않는다.

### 25 Learning Axes

`tools/vibe2-game-study-intelligence.mjs`가 아래 25축을 공통 계약으로 제공한다.

1. Mechanic Mining — 전투, 이동, 상점, 저장 같은 기능 단위를 분리한다.
2. System Graph Learning — 관찰된 시스템 전환을 그래프로 만든다.
3. Progression Curve Learning — 실제 수치 시계열이 있을 때만 성장곡선을 학습한다.
4. Economy Simulation Learning — 실제 경제 시계열을 오프라인으로 분석한다.
5. Difficulty Curve Learning — 피해·HP·사망·클리어 등 수치 시계열이 있을 때만 난이도 곡선을 만든다.
6. UI Interaction Mining — 실제 입력 순서에서 UI 흐름을 추출한다.
7. Onboarding Learning — 첫 입력·checkpoint·전투·보상 위치를 학습한다.
8. Retention Loop Mining — 반복 관찰된 플레이 루프를 찾는다.
9. State Machine Extraction — 관찰 순서에서 상태/전환을 추출한다.
10. Event Flow Extraction — runtime 순서와 허가 소스의 co-occurrence를 이벤트 흐름으로 기록한다.
11. Save Schema Learning — 저장 provider/구조 패턴만 학습하고 실제 키·값은 보존하지 않는다.
12. Architecture Distillation — 입력/저장/네트워크/runtime/world 등 아키텍처 블록으로 압축한다.
13. Dependency Learning — 같은 허가 소스 파일에서 함께 나타난 시스템 관계를 기록한다.
14. Change Impact Learning — dependency 근거로 잠재 영향 범위를 제시하며 인과로 단정하지 않는다.
15. Bug Reproduction Learning — runtime error가 관찰된 경우 재현 action trace를 증거로 남긴다.
16. Exploit-Resistance Pattern Learning — Remote/서버 handler/validation guard 같은 정적 방어 패턴을 구분한다.
17. Performance Profiling Learning — 실제 telemetry와 loop 신호를 분리해 기록한다.
18. Game DNA — 시스템 존재/관찰 비중을 공통 벡터로 압축한다.
19. Nearest-Game Retrieval — Game DNA 유사도로 이미 학습한 가까운 게임을 찾는다.
20. Novelty Detection — 가장 가까운 기존 지식과의 차이로 새로움을 계산한다.
21. Knowledge Merge — 여러 게임에서 반복된 일반화 패턴을 confirmations와 함께 병합한다.
22. Knowledge Conflict — 서로 반대되는 검증 패턴은 덮어쓰지 않고 충돌 상태로 유지한다.
23. Automatic Hypothesis Testing — 동일한 관찰 가설이 여러 게임에서 재확인되는지 추적한다.
24. Synthetic Mini-Game Training — 추출한 상태/전환 그래프를 작은 추상 replay로 재검증한다. 원본 구현을 재현했다고 주장하지 않는다.
25. Continual Distillation — 중복 경험을 압축하고 cross-game 검증 패턴만 장기 지식으로 강화한다.

### Learning State

`.vibe2/experience.json`은 **개별 검증 경험과 반복 확인 confidence**를 담당한다.

`.vibe2/game-study-knowledge.json`은 **Game DNA, nearest-game, novelty, cross-game merge/conflict, hypothesis, continual distillation** 같은 여러 게임을 함께 봐야 하는 파생 지식을 담당한다.

둘은 역할이 다르며 raw source 저장소가 아니다. GAME STUDY fan-in이 두 상태를 함께 갱신하고 `node tools/vibe2-handoff.mjs`가 현재 지식 개수·교차게임 패턴·충돌·가설 요약을 중앙 인수인계에 포함한다.
