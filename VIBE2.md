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

Vibe2 개발은 작은 파일 수정 개수를 성과로 보지 않는다. Planner는 같은 기능 경계의 진단, 유지보수, UX/가독성, QA 보강, 성능 안전성 작업을 가능한 범위에서 하나의 work package로 확장한다. 최소 작업량을 못 채운 작은 작업은 즉시 실행하지 않고 관련 작업과 합치거나 보류한다.

각 package는 공유 준비 컨텍스트, 기능 owner, 구현 역할, incremental QA, fan-in 전체 회귀, 완료 기준을 가진다. 긴 package는 짧은 작업에 계속 밀리지 않도록 우선순위를 보강하며 source/file lock 안전 규칙은 그대로 유지한다. 작업량 평가는 worker 수가 아니라 package 완료 수, work units, micro-task 비율, 재작업률, package 평균 작업량을 기준으로 한다. 낮은 효율이 반복되면 다음 planning cycle의 최소 package 작업량을 한 단계 높인다.

중앙 machine 계약은 `vibe2-runtime.json`이다. 구현 구조가 바뀌는 작업은 별도 지시 없이 해당 계약과 이 문서를 함께 동기화한다. 핵심 권한/보호 규칙 변경은 owner 지시 없이 자동 확정하지 않는다.
