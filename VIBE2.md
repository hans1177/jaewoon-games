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
