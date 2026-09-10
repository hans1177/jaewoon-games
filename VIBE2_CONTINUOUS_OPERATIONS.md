# Vibe2 Continuous Operations

## 상태

Vibe2 Core의 연속 작업 경로는 `vibe2-unreal-core`를 제어선으로 사용한다. 실제 게임 소스 후보는 항상 최신 `main`에서 분기하고, 검증 전 `main` 직접 쓰기는 금지한다.

핵심 운영 목표는 **프로세스 수를 무작정 늘리는 것**이 아니라, 의존성이 없는 작업만 계층적으로 병렬 실행하고 충돌 지점에서만 직렬화하는 것이다.

## 현재 스케줄링 구조

```text
hourly safety-net / owner event
        ↓
Global DAG Scheduler
        ↓
독립 작업 fan-out (최대 4)
  ├─ Unity shard
  ├─ Web shard
  ├─ Verification shard
  └─ Support shard
        ↓
source-root / responsible-file lock
        ↓
격리 candidate branch worker
        ↓
변경 영향도 기반 Incremental QA + content-hash cache
        ↓
fan-in
        ↓
Vibe2 전체 core regression 1회
        ↓
엔진/빌드/리뷰 검증 대기
        ↓
빈 슬롯 발생 시 event-driven refill
```

운영 파일:

- `.github/workflows/vibe2-24h-runner.yml`: hourly safety-net + 빈 슬롯 채우기
- `.github/workflows/vibe2-continuous-core.yml`: DAG batch 예약, worker fan-out, fan-in
- `assets/vibe-continuous-queue.js`: 의존성/우선순위/shard/source lock 스케줄러
- `tools/vibe2-auto-planner.mjs`: 빈 슬롯에 독립 저위험 작업 계획
- `tools/vibe2-queue-control.mjs`: batch 예약과 결과 fan-in
- `tools/vibe2-incremental-qa.mjs`: 영향 범위 QA와 content-hash cache

## 계층형 병렬 원칙

병렬화는 세 단계로 제한한다.

1. **게임/source-root 사이 병렬**: 서로 다른 source root만 동시에 작업한다.
2. **shard 병렬**: Unity/Web/Verification/Support가 기본 슬롯을 하나씩 가진다.
3. **work stealing**: 기본 shard가 비어 있으면 다른 shard의 가장 높은 우선순위 독립 작업이 남은 슬롯을 가져간다.

동일 source root는 한 번에 한 source-write만 허용한다. responsible file이 직접 겹치면 당연히 같이 실행하지 않는다. 공유 큐 상태 쓰기와 fan-in만 직렬화하며 candidate worker 자체는 독립 브랜치에서 병렬 실행한다.

### 1분류 Unity 집중 슬롯

owner 3분류 정책은 그대로 유지한다.

- `release-confirmed`는 정확히 2개
- 그중 Unity 본개발 집중 작업은 **항상 1개 슬롯만** 허용
- 나머지 1분류는 next-focus
- 2분류 Web 테스트베드는 독립 source root일 때 병렬 가능
- 3분류는 자동 source-code 개발 금지

즉 전체 병렬 수를 늘려도 1분류 Unity 집중개발 규칙은 늘어나지 않는다.

## DAG 의존성

각 작업의 `dependencies`가 완료되어야 후속 작업이 runnable이 된다. 따라서 계획/개발/QA/그래픽/밸런스처럼 독립 가능한 노드는 fan-out하고, 선행 결과가 필요한 노드는 자동으로 기다린다.

DAG는 순서를 없애는 것이 아니라 **필요한 순서만 남기고 불필요한 대기를 제거**한다.

## Dynamic Backpressure

기본 동시 작업 상한은 4지만 항상 4개를 강제로 실행하지 않는다.

- QA 대기가 누적되면 신규 source worker 동시성을 줄인다.
- 재시도/실패 압력이 커지면 신규 작업 동시성을 줄인다.
- 대기가 해소되면 다시 안전 상한까지 확장한다.

목적은 개발 worker가 QA보다 빠르게 쌓여 전체 파이프라인을 막는 현상을 방지하는 것이다.

## Speculative Parallelism

실패 확률이 높은 작업 중 `high-risk` + 명시적 opt-in 작업만 최대 2개 후보를 병렬 생성할 수 있다.

- 모든 작업에 적용하지 않는다.
- Unity Android 빌드 후보는 중복 빌드 비용/대기를 피하기 위해 speculative duplicate에서 제외한다.
- fan-in은 PASS 후보 중 하나만 winner로 유지하고 loser 후보 evidence를 승격 경로에 섞지 않는다.
- protected gameplay/save/core decision은 speculative 대상으로 자동 확장하지 않는다.

## Incremental QA + Content Hash Cache

각 candidate worker는 전체 테스트 전에 변경 영향 범위만 빠르게 검사한다.

예:

- `git diff --check`
- 충돌 마커/NUL 검사
- JS syntax
- JSON parse
- C#/C++/GD 텍스트 구조 sanity
- Unity YAML/markup sanity

검사 입력은 SHA-256 content hash로 기록한다. 동일 content hash가 이미 PASS면 해당 영향 검사 결과를 재사용할 수 있다.

**중요:** Incremental QA나 cache hit는 최종 검증이 아니다. fan-in에서는 Vibe2 core 전체 regression을 한 번 실행하고, Unity 등 엔진 작업은 별도 실제 엔진/빌드/런타임 증거를 계속 요구한다.

## Event-driven 실행

hourly cron은 안전망일 뿐이다. 다음 사건이 발생하면 기다리지 않고 바로 빈 슬롯을 채운다.

- worker fan-in 완료
- 엔진 verification 완료
- 실패/차단으로 슬롯 반환
- owner 지시로 새 우선 작업 생성

따라서 `작업 완료 → 다음 hourly wake-up 대기` 시간을 제거한다.

## 실행 경로

### text-source-worker

가능 대상:

- Unity C# 및 허용된 텍스트 직렬화 파일
- Unreal C++ / Config / `.uproject` / `.uplugin`
- Godot script/scene/resource 텍스트
- 기존 허용 Web 테스트/유지보수 root

보호 규칙:

- 실제 적용은 `vibe2/candidate/*` 브랜치만
- candidate는 최신 `main`에서 생성
- source-root 경계 밖 수정 금지
- 책임 파일 범위 강제
- 게임 수치/세이브 의미 자동 변경 금지
- 바이너리 에셋 직접 텍스트 수정 금지
- worker의 `main` 직접 push 금지

### engine-editor

Blueprint, Unreal binary asset, Unity Animator/AnimationClip authoring 등 에디터가 필요한 작업은 일반 텍스트 worker가 건드리지 않는다. 연결된 검증 가능한 에디터 worker가 없으면 BLOCKED로 기록하고 다른 독립 작업이 계속 진행한다.

### analysis-only

read-only QA/research는 source write를 만들지 않는다. 현재 전용 analysis worker가 연결되지 않은 경로는 BLOCKED 처리하되 다른 shard를 막지 않는다.

## 모델/비용 정책

- 기본 무료 로컬 모델: `qwen3:1.7b`
- worker당 모델 호출 기본 1회
- 출력 상한 1536 tokens
- 모델 timeout 240000ms
- GitHub standard public runner만 사용
- 유료 AI/API/runner/asset/자동 추가결제 금지

병렬화 때문에 유료 자원을 자동 추가하지 않는다. 무료 예산 게이트가 각 source worker에 그대로 적용된다.

## 검증/완료 판정

다음은 완료가 아니다.

- AI가 코드를 작성함
- candidate branch가 생성됨
- Incremental QA가 PASS함
- cache hit가 발생함
- Unity build 하나가 성공함

작업 종류에 필요한 전체 QA, 엔진/런타임/빌드, 리뷰 증거가 모두 존재해야 완료된다. 자동 `main` 승격 및 최종 public release 승인 규칙은 기존 정책을 그대로 따른다.

## 안전 불변조건

병렬 구조에서도 아래는 바뀌지 않는다.

- owner direct directive 최우선
- 1분류 Unity deep-focus 1개
- 동일 source root 동시 write 금지
- 최신 `main` 기준 candidate 생성
- protected/save-breaking/core decision 자동 변경 금지
- 유료 자원 자동 사용 금지
- 검증 전 `main` 반영 금지
- 3분류 자동 source-code 개발 금지
