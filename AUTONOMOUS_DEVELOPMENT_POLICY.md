# Vibe2 자동 개발 운영 계약

이 문서는 기존 게임의 자동 개발에서 **모델 실패 하나가 전체 큐를 막지 않도록** 작업 탐지, micro-task, 규칙 패치, 모델 재시도, 게임 단계 우선순위를 정의한다.

## 목표

기존 방식:

```text
넓은 작업 선택
→ 작은 로컬 모델 1회 자유생성
→ JSON/0파일/코드 생성 실패
→ 후보 미생성
→ QA/빌드까지 못 감
```

새 방식:

```text
게임 단계 판별
→ 결정론적 진단
→ 문제 1개 + 책임 파일 1개 micro-task
→ 안전 규칙 패치 가능?
   ├─ YES: 모델 0회 exact edit
   └─ NO: 구조화 JSON 모델 생성
          → 실패 분류
          → 좁은 컨텍스트로 1회 재시도
→ 후보 보호검증
→ 후보 QA
→ 독립 승격 게이트
```

## 1. 게임 단계 우선순위

자동 개발은 아래 순서로 보호한다.

1. `RELEASE_CONFIRMED` / `release-confirmed`
2. `DEVELOPMENT_CONFIRMED` / `development-confirmed`
3. `STRUCTURE_IMPROVEMENT`
4. `PLANNING_IDENTITY_REQUIRED`
5. reviewing / 기타
6. HOLD

### 출시확정

- 공개 안정판 보호가 최우선이다.
- health/diagnostic에 실제 문제가 있을 때만 유지보수 작업을 만든다.
- 문제가 없으면 단순 개선 아이디어 때문에 안정판을 건드리지 않는다.

### 개발확정

- 승인된 핵심 루프와 완료 아트북을 유지하면서 기능/품질을 계속 확장한다.
- 실제 실행 사고가 있으면 일반 개선보다 먼저 처리한다.

### 구조개선

- 기능 추가보다 기술부채를 먼저 줄인다.
- 대형 단일 파일, 저장 파싱, 입력/DOM 연결, 중복 이벤트, 경로/모바일 구조 같은 근거를 우선한다.

### 기획/정체성 필요

- 코드 worker로 보내지 않는다.
- Vibe2 1차 기획 초안 → 기획부 검토 → 아트북 게이트가 먼저다.

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
- `setInterval`은 있으나 정리 근거가 없는 반복 타이머 위험
- 500KB 이상 대형 단일 파일
- 터치/포인터 입력은 있으나 `touch-action` 근거가 없는 경우
- 이미지 `alt` 누락

진단은 문제 후보를 찾는 단계다. 발견됐다는 이유만으로 자동 수정하지 않는다.

## 3. micro-task 계약

자동 작업은 가능한 한 아래처럼 줄인다.

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

책임 파일이 1개로 확정되면 모델은 그 파일만 수정하도록 지시한다.

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

추가 규칙 패치는 실제 패턴이 충분히 증명될 때만 늘린다. 추정 기반 자동 수정은 금지한다.

## 5. 모델 코드 생성 안정화

모델이 필요한 경우:

- Ollama 로컬 무료 모델만 사용한다.
- 유료 API fallback은 없다.
- JSON Schema 구조화 출력을 사용한다.
- 한 작업에서 최대 2회만 생성한다.
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

2차도 실패하면 그 작업을 계속 반복하지 않는다. 실패 근거를 남기고 다음 게임 큐를 진행한다.

## 6. 후보 보호 규칙

모든 후보는 다음을 지킨다.

- 안정판 원본 직접 수정 금지
- candidate 전용 디렉터리/브랜치 사용
- 수정 파일 1~4개 범위
- 저장키 변경 금지
- exact edit는 유일 일치 필수
- JavaScript 문법 검사 필수
- `.github`, 권한, 결제, 비밀정보 생성 금지
- 완료/출시 승인 자체 선언 금지

## 7. 실패가 전체 큐를 막지 않는 규칙

```text
1차 생성 실패
→ 실패 분류
→ 책임 파일 중심 2차 생성
→ 실패
→ 해당 작업 실패 기록
→ 같은 게임 당일 재예약 금지
→ 다음 게임으로 진행
```

안전 규칙 패치가 가능한 작업은 모델 실패와 무관하게 처리할 수 있다.

## 8. 개발/검증 직렬성

현재 단계에서는 후보 생성과 승격 체계를 **전역 직렬**로 유지한다.

이유:

- `autonomous-dev` 기준 SHA가 승격 freshness 기준이다.
- 여러 후보를 동시에 생성해도 첫 승격 뒤 다른 후보의 source revision이 낡아질 수 있다.

향후 병렬화는 별도 단계에서 **후보 생성만 최대 2개 병렬**로 시험하고, QA/빌드/승격/main/배포는 중앙 직렬로 유지한다. 이 문서의 1~5순위 적용 범위에는 병렬화가 포함되지 않는다.

## 9. 구현 파일

- 작업 단계/선택: `tools/autonomous-work-planner.mjs`
- 결정론적 진단: `tools/autonomous-diagnostics.mjs`
- 안전 규칙 패치: `tools/autonomous-rule-patcher.mjs`
- 모델/후보 생성: `tools/autonomous-development-worker.mjs`
- exact edit 보호: `tools/autonomous-safe-edit.mjs`
- 연속 실행: `.github/workflows/autonomous-continuous-development.yml`
- 포트폴리오 단계: `autonomous-portfolio.json`
- 독립 후보 승격: `.github/workflows/autonomous-candidate-promotion.yml`

## 10. 검증 기준

변경 후 최소 다음을 확인한다.

- diagnostics unit tests
- rule patcher unit tests
- planner stage priority tests
- worker JSON normalization/save-key/syntax tests
- free budget telemetry tests
- queue tests
- `node --check` 대상 스크립트
- GitHub Actions 실제 candidate 생성/QA 결과

정적 테스트 통과만으로 실제 게임이 고쳐졌다고 표시하지 않는다. 공개판 반영 여부는 별도 후보 승격/QA/health 근거로 판정한다.
