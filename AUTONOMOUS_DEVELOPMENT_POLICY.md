# Vibe2 자동 개발 운영 계약

이 문서는 기존 게임의 자동 개발에서 **모델 실패 하나가 전체 큐를 막지 않도록** 작업 탐지, micro-task, 부서 병렬 작업, 통합, QA, 릴리즈 피드백을 정의한다.

## 목표

```text
게임 단계 판별
→ 결정론적 진단
→ 문제 1개 + 책임 파일 중심 micro-task
→ 5개 부서 독립 리뷰 병렬
→ planning-final 통합/파일 소유권 결정
→ development / graphics / QA / balance 격리 code workspace 병렬
→ 비충돌 변경 자동 통합
→ 진짜 same-file conflict만 별도 해결
→ 통합 후보
→ 독립 최종 QA/Promotion
→ 기존 Vibe 릴리즈 게이트
→ public health/runtime 검증
→ Company DNA/Vibe 학습 + 필요 시 Artbook revision
→ 다음 플로어
```

## 1. 게임 단계 우선순위

자동 개발은 다음 우선순위를 따른다.

1. 사용자 최신 직접 지시 / `owner-immediate`
2. `RELEASE_CONFIRMED` 치명적 안정성 사고
3. 완료 `DESIGN_BASELINE`의 명시적 개발 handoff
4. `DEVELOPMENT_CONFIRMED`
5. `STRUCTURE_IMPROVEMENT`
6. `PLANNING_IDENTITY_REQUIRED`
7. reviewing / 기타
8. HOLD

### 출시확정

- 공개 안정판 보호가 최우선이다.
- health/diagnostic에 실제 문제가 있을 때만 유지보수 작업을 만든다.
- 문제가 없으면 단순 개선 아이디어 때문에 안정판을 건드리지 않는다.

### 개발확정

- 승인된 핵심 루프와 최신 승인 아트북을 유지하면서 기능/품질을 계속 확장한다.
- 실제 실행 사고가 있으면 일반 개선보다 먼저 처리한다.

### 구조개선

- 기능 추가보다 기술부채를 먼저 줄인다.
- 대형 단일 파일, 저장 파싱, 입력/DOM 연결, 중복 이벤트, 경로/모바일 구조 같은 근거를 우선한다.

### 기획/정체성 필요

- 코드 worker로 보내지 않는다.
- Vibe2 PROPOSAL → 기획부 검토 → 아트북 게이트가 먼저다.

### HOLD

- 원본 경로, 실행 파일, 승인, 핵심 입력이 해결될 때까지 자동 개발 금지다.

## 2. 결정론적 진단

`tools/autonomous-diagnostics.mjs`가 모델 호출 전에 웹 게임 소스를 검사한다.

현재 탐지 범위:

- 모바일 viewport 누락
- 깨진 로컬 `src` / `href` 경로
- `JSON.parse(localStorage/sessionStorage.getItem(...))` 직접 호출 위험
- DOM 조회 직후 null 확인 없는 이벤트 연결
- 연속 중복 `addEventListener`
- 반복 타이머 정리 위험
- 500KB 이상 대형 단일 파일
- 터치/포인터 입력은 있으나 `touch-action` 근거가 없는 경우
- 이미지 `alt` 누락

진단은 문제 후보를 찾는 단계다. 발견됐다는 이유만으로 자동 수정하지 않는다.

## 3. micro-task 계약

자동 작업은 가능한 한 실제 문제와 책임 파일을 좁힌다.

나쁜 예:

```text
세이브 시스템 안정화
휴먼 GO 구조 개선
모바일 UI 고치기
```

좋은 예:

```text
app.js의 저장 JSON.parse 1곳에 손상 저장값 방어 추가
index.html의 viewport meta 1개 추가
Game UI 버튼 연결 1곳의 null 경로 보강
연속 중복 click listener 1개 제거
```

작업 주문에는 가능하면 다음을 기록한다.

- `goal`
- `responsibilityFiles`
- `diagnosticTopIssue`
- `repairMode`
- 보호값
- 게임 단계

## 4. 규칙 기반 패치

모델 없이 수정할 수 있는 것은 **증명 가능한 exact edit**로 제한한다.

현재 허용:

- `INSERT_VIEWPORT`
- `REMOVE_ADJACENT_DUPLICATE_EVENT_LISTENER`

규칙 패치 조건:

- 수정 대상 문자열이 정확히 하나여야 한다.
- 이미 수정된 상태면 다시 패치하지 않는다.
- 저장키를 변경하지 않는다.
- 핵심 규칙/세이브 의미를 변경하지 않는다.
- 후보 복사본에만 적용한다.
- 모델 후보와 동일한 문법/저장/QA 게이트를 통과한다.

추정 기반 자동 수정은 금지한다.

## 5. 모델 코드 생성 안정화

모델이 필요한 경우:

- Ollama 로컬 무료 모델만 사용한다.
- 유료 API fallback은 없다.
- GitHub Actions의 모델 Job은 `.github/actions/prepare-ollama/action.yml`을 통해 **고정 버전 Ollama 런타임 archive를 cache 복원**한다.
- 각 부서 Job에서 `install.sh`를 반복 실행하거나 systemd/user/GPU 자동설정을 매번 다시 수행하지 않는다.
- source-root 예약은 빠르게 끝낸 뒤 별도 runtime warmup Job이 cache를 준비한다. 모델 런타임 다운로드 때문에 `autonomous-dev-writer` 예약 잠금을 오래 점유하지 않는다.
- 모델 파일은 현재 측정상 pull 시간이 런타임 설치보다 훨씬 짧으므로 각 ephemeral runner에서 필요할 때 pull한다. 실제 계측으로 이득이 확인되기 전에는 대형 모델 cache를 추가하지 않는다.
- JSON Schema 구조화 출력을 사용한다.
- 한 책임 단위에서 최대 2회 생성한다.
- 1차 실패를 분류해 2차 프롬프트에 넣는다.
- 2차는 책임 파일 중심으로 컨텍스트를 줄인다.
- 같은 넓은 답을 그대로 반복하지 않는다.

실패 분류 예:

- `OUTPUT_FORMAT`
- `NO_CHANGE`
- `PROTECTED_VALUE`
- `EDIT_APPLY`
- `SYNTAX`
- `MODEL_RUNTIME`
- `OTHER`

2차도 실패하면 실패 근거를 남기고 다음 작업으로 진행한다.

## 6. 부서 병렬 리뷰와 코드 소유권

한 플로어는 한 게임 source root를 소유한다. 그 안에서 작업을 병렬화한다.

### 리뷰

planning, development, graphics, QA, balance 5개 부서는 독립 Job으로 동시에 검토한다.

### planning-final

planning은 다섯 결과를 통합해 최종 목표, 보호값, 파일 소유권을 정한다. planning은 이 단계에서 게임 소스를 직접 덮어쓰지 않는다.

### 격리 code workspace

development, graphics, QA, balance는 서로 겹치지 않는 책임 파일이 있을 때 각각 별도 workspace에서 동시에 코드 수정할 수 있다.

- development: 로직/구조/기능
- graphics: UI/CSS/렌더/VFX/에셋 연결
- QA: 분리 가능한 테스트/검증 코드
- balance: 분리 가능한 밸런스/경제/난이도 데이터

`NO_SCOPE`는 이번 플로어에서 해당 부서가 분리 가능한 책임 파일을 갖지 않았다는 **정상 완료 상태**다. 실패로 처리하지 않는다.

## 7. 후보 통합과 충돌

각 부서 workspace는 공통 baseline을 기준으로 한다.

- 서로 다른 파일/줄의 비충돌 변경은 자동 통합한다.
- 같은 파일의 진짜 충돌만 conflict 단계로 보낸다.
- conflict resolver는 관련 부서 의도를 보존하고 새로운 기능을 임의 추가하지 않는다.
- 공유 branch 쓰기는 최종 통합 후보 이후에만 발생한다.

한 플로어가 source root를 소유하는 동안 다른 플로어나 AI가 같은 source root를 동시에 수정하지 않는다.

## 8. 후보 보호 규칙

모든 후보는 다음을 지킨다.

- 공개 안정판 직접 수정 금지
- candidate 전용 디렉터리/브랜치 사용
- 저장키 변경 금지
- exact edit 유일 일치 필수
- JavaScript/대상 언어 문법 검사 필수
- `.github`, 권한, 결제, 비밀정보 생성 금지
- 완료/출시 승인 자체 선언 금지
- `baseMainSha`/source freshness 확인

## 9. 최종 QA와 릴리즈

부서별 수정이 끝났다고 바로 공개하지 않는다.

```text
통합 후보
→ Autonomous Candidate Promotion 독립 QA
→ autonomous-dev 승격
→ 기존 Vibe 릴리즈 게이트
→ main 공개
→ Public Game Health 또는 Unity runtime 검증
```

Promotion이나 workspace가 직접 `main`을 쓰지 않는다. 공개는 기존 릴리즈 게이트만 담당한다.

## 10. 릴리즈 후 학습/아트북 환류

릴리즈 결과는 검증 후 기존 학습 시스템에 넣는다.

- 성공/실패 증거 → 기존 `evolution-evidence-recorder` / Company DNA / Vibe 학습
- 운영 결과가 설계에 영향을 주면 `ARTBOOK_REVISION_REQUEST`
- 개발확정 기준 증거가 충분하면 `DEVELOPMENT_BASELINE`
- 릴리즈확정 기준 증거가 충분하면 `RELEASE_BASELINE`
- 공개 health/runtime 검증 전에 성공 사이클로 다음 개발을 넘기지 않는다.

## 11. 실패가 전체 큐를 막지 않는 규칙

```text
부서/모델 작업 실패
→ 실패 분류
→ 제한된 재시도
→ 실패 근거 기록
→ recovery/replan
→ 다음 플로어
```

안전 규칙 패치 가능한 작업은 모델 실패와 무관하게 처리할 수 있다. 총괄은 승인 workflow가 멈췄고 동일 workflow가 active가 아닐 때 저위험 recovery dispatch를 할 수 있다.

## 12. 구현 파일

- 작업 단계/선택: `tools/autonomous-work-planner.mjs`, `tools/autonomous-24h-work-planner.mjs`
- 부서 리뷰/통합 제약: `tools/autonomous-department-cycle.mjs`
- 부서 후보 통합: `tools/autonomous-department-integrator.mjs`
- 결정론적 진단: `tools/autonomous-diagnostics.mjs`
- 안전 규칙 패치: `tools/autonomous-rule-patcher.mjs`
- 모델/후보 생성: `tools/autonomous-development-worker.mjs`
- 로컬 Ollama 런타임 준비/cache: `.github/actions/prepare-ollama/action.yml`
- exact edit 보호: `tools/autonomous-safe-edit.mjs`
- 연속 실행: `.github/workflows/autonomous-continuous-development.yml`
- 독립 후보 승격: `.github/workflows/autonomous-candidate-promotion.yml`
- 릴리즈: 기존 Vibe2 candidate release gate
- 공개 검증: `public-game-health.json` 및 관련 workflow
- 총괄 감독/복구: `.github/workflows/director-supervisor.yml`, `tools/director-supervisor.mjs`

## 13. 검증 기준

변경 후 최소 다음을 확인한다.

- diagnostics unit tests
- rule patcher unit tests
- planner stage priority tests
- worker JSON normalization/save-key/syntax tests
- department integrator tests
- free budget telemetry tests
- queue tests
- `node --check` 대상 스크립트
- Ollama runtime cache 계약: pinned archive + cache restore + 직원별 `install.sh` 반복 금지
- 실제 Actions에서 cache-hit runtime 준비 시간이 기존 반복 설치 시간보다 줄었는지 계측
- GitHub Actions 실제 5부서 병렬 review
- planning-final handoff
- code workspace 병렬 생성
- `NO_SCOPE` 정상 처리
- 통합 후보 생성
- Promotion QA / 릴리즈 / public health 근거

정적 테스트 통과만으로 실제 게임이 고쳐졌다고 표시하지 않는다. 공개판 반영 여부는 실제 후보 승격/QA/health 근거로 판정한다.
