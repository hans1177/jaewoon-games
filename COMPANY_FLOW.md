# 재운컴퍼니 게임 개발 플로우

## 문서 권한 순서

운영 규칙이 충돌하면 다음 순서로 판단한다.

1. 한재운의 최신 직접 지시
2. `company-directive.json`
3. `COMPANY_FLOW.md`, `DEPARTMENT_STANDARDS.md`, `ARTBOOK_POLICY.md`, `ARTBOOK_LIFECYCLE.md`, `AUTONOMOUS_DEVELOPMENT_POLICY.md`
4. `company-status.json`, `director-supervision-status.json`, 각종 감사·빌드·health 상태

상태 파일은 증거와 이력을 기록하며 상위 정책을 덮어쓰지 않는다.

## 회사 구조

재운컴퍼니는 planning, development, graphics, QA, balance 5개 실무 부서와 총괄 AI로 운영한다.

- **Vibe2**: 회사 전체가 사용하는 제작·분석·구현·그래픽·QA·검증 공용 엔진
- **AI 부서**: 각 전문영역의 판단, 구현, 검토, 반론, 증거 책임
- **총괄**: 우선순위 집행, 배정, 실제 실행 확인, 병목 해결, 통합/검증/인계 감독

Vibe2는 초안 전용이 아니다. 아트북 PROPOSAL은 Vibe2의 한 작업 단계일 뿐이고, 개발·그래픽·QA·릴리즈 피드백에서도 Vibe 기능을 계속 사용한다. Vibe2 결과는 부서 근거와 필요한 QA가 없으면 확정하지 않는다.

## 회사 우선순위

```text
한재운 최신 직접 지시(owner-immediate)
→ release-confirmed 치명적 안정성 사고
→ completed DESIGN_BASELINE 개발 handoff
→ development-confirmed
→ structure-improvement
→ planning/identity-required
→ reviewing / other
→ HOLD
```

새 사용자 직접 지시는 아직 시작하지 않은 자율 계획보다 항상 우선한다. 같은 단계에서는 `company-directive.json`의 엔진/기존 프로젝트 우선순위를 따른다.

## 총괄의 감독 및 병목 해결

총괄은 `running` 라벨을 그대로 믿지 않는다. 부서별로 다음을 확인한다.

```text
TASK_ASSIGNED
→ EXECUTION_EVIDENCE
→ RESULT_EVIDENCE
→ VERIFICATION
→ BLOCKER
→ ACTION
```

실시간 업무 상태는 `ACTIVE / WAITING / BLOCKED / DONE`으로 기록한다.

할 일이 있는데 멈췄다면 `NO_WORK_ORDER`, `AUTOMATION_NOT_TRIGGERED`, `WORKFLOW_FAILED`, `OUTPUT_MISSING`, `VALIDATION_FAILED`, `DEPENDENCY_BLOCKED`, `PERMISSION_BLOCKED`, `EVIDENCE_ADAPTER_MISMATCH`, `STALE_QUEUE`, `BACKFILL_CHAIN_STOPPED`, `DEVELOPMENT_CHAIN_STOPPED` 등을 직접 분류한다.

총괄은 다음 저위험 운영 병목을 직접 복구할 수 있다.

- 기존 승인 workflow가 멈췄고 같은 workflow가 active가 아니면 재-dispatch
- 기존 게임 INITIAL 아트북 backlog가 남았는데 Artbook/Backfill chain이 모두 멈췄으면 backfill 재기동
- 자율개발이 failure/cancelled로 끝났고 recovery run이 없으면 기존 autonomous workflow 재기동
- owner-immediate 지시가 큐보다 우선이면 우선순위 재적용
- stale/false-running 상태 교정

같은 workflow가 queued/in_progress일 때는 중복 실행하지 않는다. 장르, 핵심 루프, 스토리 큰 방향, 전투/성장 핵심 모델, 플랫폼, 저장 호환 파괴, 과금, 유료 서비스는 총괄이 임의 결정하지 않고 사용자에게 올린다.

## 아트북 = 설계도

아트북은 개발 그 자체가 아니라 **개발을 지휘하는 살아있는 설계 기준선**이다.

```text
V0 PROPOSAL
→ V1 DESIGN_BASELINE
→ 필요 시 REVISION
→ DEVELOPMENT_BASELINE
→ 필요 시 REVISION
→ RELEASE_BASELINE
→ 이후 필요 시 V4+ REVISION
```

- INITIAL/업데이트/수정/백필은 일일·주간 개수 제한이 없다.
- 모든 기존 게임은 INITIAL 아트북을 가져야 하며 backlog가 0이 될 때까지 계속 처리한다.
- Vibe2가 첫 PROPOSAL을 만든다.
- planning/graphics/development/QA/balance가 자기 전문영역을 독립 제출한다.
- 부서 간 교차검토는 가능하지만 다른 부서 파트를 대신 쓰지 않는다.
- 총괄은 제출된 내용만 통합·요약한다.
- 현재 정책 분량은 12~30컷이며 과거 10컷은 레거시 이력으로만 인정한다.
- 아트북 완료가 곧 본개발/릴리즈 PASS를 뜻하지 않는다.

기존 게임 INITIAL 백필은 `workflow_run` 연쇄뿐 아니라 watchdog 복구도 사용한다. 한 게임 아트북 완료 후 다음 INITIAL이 자동으로 이어져야 하고, 체인이 끊기면 총괄이 다시 기동한다.

## 아트북 완료 후 개발 handoff

개발확정 게임의 `DESIGN_BASELINE`이 완료되면 그 게임은 우선 개발 큐로 넘긴다. 동시에 다른 게임의 INITIAL 아트북 백필은 독립적으로 계속된다.

```text
게임 A DESIGN_BASELINE 완료 ─→ 게임 A 개발 handoff
                         └→ 게임 B INITIAL 백필 계속
```

개발 중 설계 변경이 필요하면 구현에서 몰래 바꾸지 않고 `ARTBOOK_REVISION_REQUEST`를 만든다.

## 한 개발 플로어의 실제 구조

현재 자동개발은 한 게임 source root를 한 플로어가 소유하고, 그 안에서 부서 작업을 병렬화한다.

```text
플로어 준비/예약
→ 5부서 독립 리뷰 병렬
→ planning-final 통합 + 책임 파일 배정
→ development / graphics / QA / balance 격리 code workspace 병렬 수정
→ 비충돌 변경 자동 통합
→ 진짜 same-file conflict만 명시적 해결
→ 통합 후보 생성
→ 강한 독립 최종 QA/Promotion
→ 기존 Vibe 릴리즈 게이트
→ main 공개
→ Public Game Health / Unity runtime 검증
→ Company DNA/Vibe 학습
→ 필요 시 Artbook revision/baseline upgrade
→ 다음 플로어
```

### 부서 코드 작업 원칙

- planning은 최종 제약과 파일 소유권을 통합하고 소스를 직접 덮어쓰지 않는다.
- development/graphics/QA/balance는 서로 겹치지 않는 책임 파일이 있으면 격리 workspace에서 동시에 수정할 수 있다.
- `NO_SCOPE`는 해당 부서가 이번 플로어에서 분리 가능한 책임 파일을 갖지 않았다는 정상 결과다.
- 비충돌 변경은 공통 baseline에서 자동 통합한다.
- 같은 파일/같은 줄의 실제 충돌만 conflict 해결 단계로 보낸다.
- 공유 branch 쓰기는 최종 통합 이후에만 허용한다.

## 수정 직후 바로 릴리즈하지 않는다

부서별 수정본은 공개 대상이 아니다.

```text
부서별 병렬 수정
→ 통합 후보
→ 최종 통합 QA
→ Promotion
→ Vibe 릴리즈 게이트
→ 공개
```

즉 **수정 직후 자동 검증은 즉시 시작하지만, 검증을 건너뛰고 즉시 공개하지 않는다.**

## 릴리즈 후 루프

릴리즈가 끝이 아니다.

```text
검증된 통합본
→ 릴리즈
→ 실제 public health/runtime 확인
→ 기획/개발/QA/그래픽/밸런스 재평가
→ Company DNA/Vibe에 검증된 성공/실패 학습
→ 설계 영향이 있으면 Artbook revision 또는 baseline upgrade
→ 다음 개발
```

Web 릴리즈는 공개 health 결과를 확인하고, Unity는 APK/런타임 증거를 확인한다. 성공 학습과 다음 성공 사이클은 실제 운영 검증 뒤에 이어진다. 실패 시 공개 안정판 보호와 복구 개발을 우선한다.

## 기존 Web 게임 정책

기존 Web 게임은 읽기 전용이 아니다. 다음 저위험 유지보수가 가능하다.

- 버그 수정
- 모바일 UI/UX
- 접근성
- 성능
- 구조 정리
- 회귀 수정
- 경로/실행 오류 수정

핵심 게임플레이, 밸런스, 세이브 의미, 주요 콘텐츠 방향 변경은 owner gate를 따른다. 신규 Web 게임 제작은 기본 자동 타깃이 아니다.

## QA와 검증

QA는 코드 문구만 보는 부서가 아니라 실제 게임 검증 부서다.

- Web: 실제 브라우저 실행, 입력, 재로드, 저장 유지, 모바일 화면, 런타임 오류
- Unity: APK 빌드뿐 아니라 런타임 실행, 입력, 프로세스 생존, 치명 오류, 화면 증거

빌드 성공만으로 QA PASS하지 않는다. 의미 있는 수정 뒤에는 기존 부서 판정을 그대로 승계하지 않고 현재 상태를 다시 평가한다.

## 공개/빌드 원칙

- 테스트 APK와 정식 Play Store 출시는 구분한다.
- APK 성공은 비어 있지 않은 실제 파일과 SHA-256 등 검증 근거를 요구한다.
- 홈페이지 노출은 제작 승인/릴리즈 승인과 동일하지 않다.
- 유료 API, 유료 runner, 유료 초과 사용은 명시 승인 없이는 금지한다.

## 주요 파일

- `company-directive.json` — 최신 사용자 지시와 회사 최상위 운영 정책
- `COMPANY_FLOW.md` — 회사 전체 제작/검증/인계 흐름
- `.github/agents/director.agent.md` — 총괄 실제 감독/복구 역할
- `DEPARTMENT_STANDARDS.md` — 부서별 최소 업무/검증 기준
- `ARTBOOK_POLICY.md`, `ARTBOOK_LIFECYCLE.md` — 아트북 설계도 정책과 버전 수명주기
- `AUTONOMOUS_DEVELOPMENT_POLICY.md` — 자동개발 선택/진단/실행 계약
- `director-supervision-status.json` — 실제 직원 상태와 병목/복구 근거
- `game-artbooks.json` — 아트북 완료 기준 registry
- `game-catalog.json` — 게임별 단계/공개 메타데이터
- `public-game-health.json` — 공개판 운영 검증 근거

회사 문서가 실제 최신 구현과 충돌하면 최신 직접 지시와 `company-directive.json`을 우선하고, 문서를 즉시 현재 구현에 맞춰 갱신한다.
