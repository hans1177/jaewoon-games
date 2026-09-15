# Vibe2

Vibe2에서 사람이 유지하는 운영 문서는 이 파일 하나다.

- 중앙 기계 원본: `vibe2-runtime.json`
- 현재 작업 상태: `.vibe2/queue.json`
- Adaptive 병렬 상태: `.vibe2/parallelism-control.json`
- 검증 경험: `.vibe2/experience.json`
- 자동 인수인계 출력: `node tools/vibe2-handoff.mjs`
- 제어 브랜치: `vibe2-unreal-core`
- 실제 후보 작업 기준: 최신 `main`

작업량이 크면 파일 개수로 억지 분할하지 않고 **검증 가능한 구현 단계로 나눠 연속 진행**한다. 새 작업자는 위 기계 파일을 순서대로 읽고 자동 인수인계 출력을 확인한 뒤 이어서 작업한다.

정책·Motion·Visual Autonomy·Adaptive Backpressure의 상세 계약은 사람이 별도 문서로 중복 관리하지 않고 `vibe2-runtime.json`을 기준으로 한다. 수동 인수인계 문서는 만들지 않는다.

## Work Package Execution

Vibe2 개발은 작은 파일 수정 개수나 동시에 돈 worker 수를 성과로 보지 않는다. 한 planning cycle은 **기능 package 1개 완료 후보 또는 직접 연관 개선 3개 이상**을 최소 작업량 목표로 삼는다.

Planner는 작은 seed task를 받으면 먼저 같은 기능 경계에서 실제로 존재하는 진단, 유지보수, UX/가독성, QA 보강, 성능 안전성 후보를 찾고 서로 다른 책임 파일이면 같은 package로 묶는다. 실제 관련 후보가 부족한 경우에만 직접 연관된 오류 처리, 모바일 UX, 회귀 QA, 기본 성능 점검 scope를 명시적으로 추가한다. 숫자만 올려 작은 task를 큰 작업처럼 취급하지 않는다.

각 package는 공유 준비 컨텍스트, 기능 owner, 구현 역할, incremental QA, fan-in 전체 회귀, 완료 기준을 가진다. 같은 파일 동시 수정은 계속 금지한다. 긴 package는 짧은 작업에 계속 밀리지 않도록 우선순위를 보강하고, 완료는 코드 수정만으로 처리하지 않고 구현 + 관련 QA + 전체 회귀 + 필요한 machine 계약/중앙 문서 동기화까지 확인한다.

작업량 telemetry는 다음을 기준으로 본다.

- 완료된 기능 package 수
- 실제 변경 파일 수와 추가/삭제 라인 수
- 재작업률
- incremental QA 중복률
- package cycle time
- checkout/model 준비시간 비중

낮은 효율이 연속 package에서 반복되면 다음 planning cycle의 최소 package 작업량을 단계적으로 높인다. 안전 규칙, QA, 보호된 게임 규칙이나 저장 의미를 낮춰서 처리량을 올리지는 않는다.

중앙 machine 계약은 `vibe2-runtime.json`이다. 구현 구조가 바뀌는 작업은 별도 지시 없이 해당 계약과 이 문서를 함께 동기화한다. 핵심 권한/보호 규칙 변경은 owner 지시 없이 자동 확정하지 않는다.
