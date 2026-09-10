# Vibe2 계층형 병렬 아키텍처

## 목적

이 문서는 재운컴퍼니/Vibe2의 자동 제작 실행 구조가 단순 직렬 큐가 아니라 **DAG + 계층형 병렬 + shard + work stealing + source/file lock + incremental QA + fan-in** 구조로 동작하는 기준을 기록한다.

이 구조의 목표는 다음과 같다.

- 서로 충돌하지 않는 게임/작업은 동시에 처리한다.
- 같은 source root 또는 같은 책임 파일은 동시에 수정하지 않는다.
- 1분류 Unity 집중개발은 항상 1개만 유지한다.
- QA 대기와 실패가 누적되면 동시성을 자동으로 낮춘다.
- 수정 범위가 작을 때는 영향 테스트를 먼저 수행하고, 통합 지점에서 전체 회귀를 한 번 수행한다.
- 유료 AI, 유료 runner, 추가 자동결제는 사용하지 않는다.

## 운영 상태

2026-09-11 기준 운영 진입점은 다음과 같다.

- `main`의 `.github/workflows/vibe2-24h-runner.yml`
- 제어 코어는 `vibe2-unreal-core` 브랜치의 `.github/workflows/vibe2-continuous-core.yml`
- 운영 최대 동시 게임 작업 수: `4`
- 1분류 Unity 집중 슬롯: `1`
- activation commit: `6e2ed92bea5620984f77faf7cfad61f815a3a042`
- 문서 작성 시 확인한 `main`: `ed4253bb4fdb0be86743bb2e4d496b5a776c7b4e`
- 문서 작성 시 확인한 `vibe2-unreal-core`: `11586ef426dfa3fbfea18ac5d57a8ea7a469ba7c`

`main`의 runner는 최신 `company-status.json`, `game-catalog.json`을 기준으로 비어 있는 병렬 슬롯을 채운 뒤 `vibe2-unreal-core`의 reusable workflow를 호출한다.

## 전체 흐름

```text
사용자 지시 / 자동 계획
        |
        v
Vibe2 Auto Planner
        |
        v
DAG Queue
        |
        +--> Unity shard --------+
        +--> Web shard ----------+
        +--> Verification shard -+--> conflict-free reserve
        +--> Support shard ------+
                                  |
                                  v
                           Hierarchical Fan-out
                                  |
                     +------------+------------+
                     |            |            |
                  Worker A     Worker B     Worker C ...
                     |            |            |
                  Candidate    Candidate    Candidate
                     |            |            |
               Incremental QA / Content Hash Cache
                     |            |            |
                     +------------+------------+
                                  |
                                  v
                               Fan-in
                                  |
                          Full Core Regression
                                  |
                    +-------------+-------------+
                    |                           |
               slot available              queue full
                    |                           |
             event-driven refill          다음 주기 대기
```

## 1. DAG 스케줄링

작업은 `dependencies`를 가질 수 있다. 선행 작업이 완료되지 않은 작업은 실행 후보가 되지 않는다.

즉 단순 FIFO가 아니라 **의존성이 해결된 작업만 병렬 후보**로 들어간다.

주요 구현:

- `assets/vibe-continuous-queue.js`
- `tools/vibe2-queue-control.mjs`
- `tools/vibe2-auto-planner.mjs`

## 2. 계층형 병렬

병렬화는 한 단계만 사용하지 않는다.

1. 서로 다른 source root의 게임 작업을 병렬화한다.
2. shard별 기본 슬롯을 먼저 채운다.
3. 남는 슬롯은 work stealing으로 다른 shard 작업이 가져간다.
4. 고위험 opt-in 작업만 primary/speculative 후보로 추가 fan-out할 수 있다.
5. worker 결과는 fan-in에서 다시 하나의 큐 상태로 합친다.

운영 최대 동시성은 현재 `4`이며 하드 상한은 큐 코드에서 `8`로 제한한다.

## 3. Sharded Queue

기본 shard는 다음 네 종류다.

| Shard | 기본 역할 | 기본 슬롯 |
|---|---|---:|
| `unity` | Unity 작업 | 1 |
| `web` | Web 테스트베드/웹 작업 | 1 |
| `verification` | QA, inspect, research | 1 |
| `support` | 기타 지원 작업 | 1 |

1차 fan-out에서는 각 shard의 기본 슬롯을 우선 채운다.

이 방식은 특정 종류의 작업만 큐 전체를 독점하는 현상을 줄인다.

## 4. Work Stealing

1차 shard 배치 이후 빈 슬롯이 남으면 shard 구분 없이 **가장 높은 우선순위의 충돌 없는 작업**이 빈 슬롯을 가져간다.

따라서 예를 들어 verification 작업이 없으면 그 슬롯이 놀지 않고 다른 독립 작업에 재사용될 수 있다.

우선순위는 사용자 직접 지시, 분류 상태, task priority 등을 반영한다.

## 5. Source Root / File Lock

병렬 속도를 높이더라도 충돌 방지는 유지한다.

동시에 실행할 수 없는 경우:

- 같은 `sourceRoot`
- 같은 `responsibleFiles`
- 1분류 Unity feature 작업이 이미 집중 슬롯을 점유한 경우

핵심 규칙:

```text
같은 source root  = 병렬 금지
같은 책임 파일    = 병렬 금지
다른 source root  = 조건 충족 시 병렬 허용
1분류 Unity feature = 항상 집중 슬롯 1개
```

worker는 현재 `main`에서 격리 candidate branch/worktree를 만든 뒤 승인된 source boundary 밖으로 변경이 나가지 않았는지 다시 검사한다.

## 6. 1분류 Unity 집중개발 보호

owner 3분류 정책은 병렬화 이후에도 그대로 유지한다.

- 1분류 `release-confirmed`: 정확히 2개
- 2분류 `development-confirmed`: 정확히 3개
- 나머지: `design-only`
- 1분류 2개 중 실제 Unity 집중개발은 **항상 1개만**

즉 전체 동시성은 4지만 1분류 Unity 본개발을 4개 동시에 돌리는 구조가 아니다.

나머지 슬롯은 충돌 없는 Web 사전검증, QA, 지원/분석 등에서 사용한다.

## 7. Event-driven Refill

fan-in 후 큐에 빈 슬롯이 생기면 다음 정시 스케줄까지 기다리지 않고 `vibe2-24h-runner.yml`을 다시 실행해 가능한 작업을 즉시 채운다.

```text
worker 완료
   -> fan-in
   -> free slot 확인
   -> free slot > 0
   -> Vibe2 24H Runner 재호출
```

이 구조로 idle 시간이 줄어든다.

정시 schedule은 복구/안전망 역할도 유지한다.

## 8. Incremental QA

각 candidate마다 전체 회귀를 반복하지 않는다.

worker 단계에서는 변경 범위 기반 `tools/vibe2-incremental-qa.mjs`를 실행한다.

목적:

- 수정 파일과 직접 연관된 검증을 우선 실행
- 작은 변경 때문에 전체 테스트를 매 worker마다 반복하는 비용 감소
- candidate가 통합 가능한 상태인지 빠르게 판정

이후 fan-in 단계에서 Vibe2 core 전체 회귀를 한 번 수행한다.

현재 fan-in 회귀 묶음에는 다음 영역이 포함된다.

- auto planner
- core engine motion
- source worker
- queue control
- incremental QA
- controller contract
- candidate reconcile
- experience control

## 9. Content Hash Cache

Incremental QA는 content-hash 기반 cache를 사용한다.

동일한 검증 대상/내용이 이미 통과한 경우 재사용할 수 있게 해 중복 작업을 줄인다.

workflow cache namespace는 게임/타깃 문맥을 기준으로 분리해 서로 다른 게임의 검증 결과가 잘못 섞이지 않게 한다.

## 10. Dynamic Backpressure

무조건 4개 worker를 유지하지 않는다.

큐 상태가 나빠지면 effective concurrency를 자동으로 낮춘다.

현재 규칙:

- QA 대기 작업이 2개 이상이면 최대 3
- QA 대기 작업이 3개 이상이면 최대 2
- 최근 재시도 실패가 3개 이상이면 최대 2

즉 downstream QA가 밀리는데 upstream 개발만 계속 늘려 병목을 악화시키는 구조를 피한다.

## 11. Selective Speculative Parallelism

모든 작업을 A/B로 두 번 실행하지 않는다.

다음 조건을 만족하는 작업만 speculative variant를 추가할 수 있다.

- Unity 작업이 아님
- `speculativeEligible=true`
- `estimatedRisk=high`

fan-in에서는 PASS한 후보 중 결과를 선택하고 각 variant의 결과를 evidence로 남긴다.

비용이 큰 무차별 speculative 실행은 금지한다.

## 12. Fan-out / Fan-in 상태 쓰기

worker들이 공유 큐를 동시에 직접 수정하지 않는다.

구조:

```text
reserve
  -> immutable worker jobs
  -> result artifact
  -> fan-in
  -> queue state 1회 통합
```

이 방식으로 병렬 worker 사이의 공유 branch write collision을 줄인다.

## 13. 무료 실행 원칙

병렬화 때문에 유료 사용량을 자동으로 늘리지 않는다.

현재 text-source worker는 실행 전 free budget 검증을 거친다.

금지 사항:

- 유료 AI API 자동 호출
- 유료 GitHub runner 자동 선택
- 추가 크레딧 자동결제
- owner 승인 없이 보호된 변경 우회

## 14. 실패 처리

병렬 worker 한 개가 실패해도 `fail-fast: false`로 다른 독립 worker까지 즉시 중단하지 않는다.

각 결과는 `PASS`, `FAIL`, `BLOCKED`로 fan-in에 전달한다.

- `PASS`: candidate는 다음 QA/배포 단계 대기
- `FAIL`: retry 정책에 따라 재시도 가능
- `BLOCKED`: 현재 worker route 또는 정책상 실행 불가

같은 root 충돌이나 dependency 미완료 작업은 실패로 억지 실행하지 않고 deferred/blocked 상태로 유지한다.

## 15. 운영 확인 포인트

병렬 시스템을 변경할 때 최소 확인 항목:

1. `main`의 `VIBE2_MAX_CONCURRENT_GAME_TASKS` 값
2. `vibe2-unreal-core`의 reusable workflow `max-parallel`
3. queue의 `sourceRootExclusive=true`
4. queue의 `responsibleFileExclusive=true`
5. `unityReleaseFocusSlots=1`
6. work stealing 유지 여부
7. dynamic backpressure 유지 여부
8. incremental QA + content-hash cache 유지 여부
9. fan-in 전체 회귀 유지 여부
10. paid resource 금지 유지 여부

## 16. 주요 파일

| 파일 | 역할 |
|---|---|
| `.github/workflows/vibe2-24h-runner.yml` | 운영 진입점, 빈 슬롯 자동 계획, core 호출 |
| `.github/workflows/vibe2-continuous-core.yml` | reserve -> parallel worker -> fan-in -> refill |
| `assets/vibe-continuous-queue.js` | DAG, shard, lock, work stealing, backpressure 정책 |
| `tools/vibe2-auto-planner.mjs` | 최신 회사 상태/카탈로그를 읽고 안전한 병렬 작업 계획 |
| `tools/vibe2-queue-control.mjs` | batch 예약, 상태 전환, fan-in 영속화 |
| `tools/vibe2-incremental-qa.mjs` | 변경 영향 기반 QA + content hash |
| `tools/vibe2-source-worker.mjs` | 격리 source candidate 생성 |
| `.vibe2/queue.json` | 제어 브랜치의 실행 큐 상태 |

## 17. 구조 변경 시 불변 조건

성능 개선을 위해 다음 조건을 깨면 안 된다.

- 사용자 직접 지시 최우선
- 1분류 Unity 집중 슬롯 1개
- 동일 source root 동시 수정 금지
- 동일 책임 파일 동시 수정 금지
- 3분류 source-code 자동 개발 금지
- 검증 전 자동 배포 금지
- 유료 AI/runner/자동결제 금지
- 작업 결과는 evidence와 함께 기록
- 다른 AI/자동화와 동시 작업 시 최신 `main`과 `AGENTS.md` 재확인

## 결론

Vibe2의 현재 병렬 구조는 단순히 프로세스 수를 늘리는 방식이 아니다.

**DAG 스케줄링 -> shard 분산 -> work stealing -> 격리 worker -> incremental QA/cache -> fan-in -> event-driven refill**을 사용해 충돌을 막으면서 전체 대기시간과 유휴 시간을 줄이는 구조다.

성능 튜닝 시에는 worker 개수보다 먼저 **dependency, source lock, QA 병목, cache hit, shard 점유율, fan-in 대기시간**을 확인한다.
