# Vibe2 Continuous Operations

## 상태

이 문서는 Vibe2 Core의 **현재 구현된 연속 작업 경로**를 설명한다.

현재 개발 브랜치: `vibe2-unreal-core`

현재 단계에서는 컴퍼니 운영 파일과 `main`을 직접 수정하지 않는다. 이 브랜치가 최종 통합되기 전까지 GitHub `schedule`은 기본 브랜치의 24시간 운영을 실제로 시작하지 않는다. 수동 `workflow_dispatch`와 QA로 구조를 검증한다.

## 연속 실행 구조

Vibe2는 한 프로세스를 24시간 계속 실행하지 않는다.

```text
1시간 wake-up
→ 큐에서 다음 안전 작업 선택
→ 작업주문 생성
→ 큐 예약
→ 실행 능력 분류
   ├─ text-source-worker
   ├─ engine-editor
   └─ analysis-only
→ 후보/결과 생성
→ 검증 대기 또는 실패 기록
→ 다음 독립 작업이 있으면 즉시 workflow_dispatch
→ 없으면 다음 wake-up까지 종료
```

`workflow`: `.github/workflows/vibe2-continuous-core.yml`

운영 한도:

- GitHub standard public runner만 사용
- 작업 run 최대 20분
- 로컬 무료 모델 호출 최대 1회
- 기본 모델 `qwen3:0.6b`
- 출력 상한 `1536` tokens
- 모델 제한시간 `240000ms`
- 유료 API 금지
- 유료 runner 금지
- 자동 추가 크레딧 구매 금지

## 작업 큐

영속 상태:

- `.vibe2/queue.json`
- `.vibe2/experience.json`
- `.vibe2/work-order.json`

큐 제어:

`tools/vibe2-queue-control.mjs`

지원 명령:

- `enqueue`: 작업 추가
- `reserve`: 현재 최우선 작업 예약
- `pass`: 검증 완료 작업만 PASS
- `fail`: 실패 및 제한된 재시도
- `block`: 외부 검증/엔진/승인 대기
- `cancel`: 취소
- `summary`: 현재 큐 요약

사용자 지시 작업은 `owner-immediate`로 일반 자율 작업보다 먼저 선택한다.

## 실행 경로

### 1. text-source-worker

대상:

- Unity C# 및 안전한 텍스트 직렬화 파일
- Unreal C++ / Config / `.uproject` 등 텍스트 파일
- Godot script/scene/resource 텍스트

실행기:

`tools/vibe2-source-worker.mjs`

보호 규칙:

- `web-games/` 쓰기 금지
- `main`/`master`에서 실제 소스 적용 금지
- 실제 적용은 `vibe2/candidate/*` 브랜치에서만 허용
- 한 작업 변경 파일 수 제한
- exact edit 기반 수정 우선
- 게임 수치/세이브 의미 자동 변경 금지
- 바이너리 에셋 직접 수정 금지

모델이 만든 변경은 곧바로 정식 완료가 아니다.

```text
candidate 생성
→ candidate branch push
→ 원 작업 BLOCKED: candidate-awaiting-engine-qa
→ 엔진 컴파일/런타임/빌드 검증
→ 검증 증거 확인
→ 그 뒤에만 PASS 가능
```

## Unity

현재 자동화 가능한 부분:

- C# 소스 후보 생성
- prefab/scene 등 텍스트 기반 파일의 제한된 후보 수정
- candidate branch 생성
- 기존 build request가 존재하면 Unity Hybrid Android Build 검증 요청

예: `daechung-rpg`

- project: `unity-games/daechung-rpg`
- build request: `.build-requests/unity/daechung-rpg.json`
- build method: `JaewoonGames.DaechungRpg.Editor.AndroidTestBuild.Build`

Unity의 실제 PASS에는 여전히 Editor 컴파일, 참조, 런타임, 필요한 경우 Android build 증거가 필요하다.

## Unreal

### 텍스트 worker 가능

- `.h`
- `.hpp`
- `.cpp`
- `.cs` build scripts
- `.ini`
- `.uproject`
- `.uplugin`

### Unreal Editor worker 필수

다음은 일반 텍스트 AI가 직접 수정하지 않는다.

- Blueprint `.uasset`
- Animation Blueprint
- Montage
- Blend Space
- IK Rig
- IK Retargeter
- Control Rig
- Level/Map `.umap`
- 기타 Unreal binary asset

현재 Unreal Editor authoring worker는 아직 연결 전이다.

따라서 이런 작업이 들어오면 Vibe2는 잘못된 텍스트 수정을 시도하지 않고:

```text
engine-editor
→ BLOCKED: unreal-editor-worker-required
→ 다른 독립 작업 계속
```

으로 처리한다.

Unreal Editor/commandlet 실행 환경이 검증되면 이 경로에 별도 worker를 연결한다.

## Motion Core 연결

모션 관련 작업은 엔진 종류와 관계없이 `VIBE2_MOTION_CORE.md`의 공통 계약을 사용한다.

```text
Motion Contract
→ 상태/전환
→ 공격·피격 이벤트 동기화
→ Retarget/IK
→ 엔진 구현
→ 실제 런타임 관측
→ Motion Quality Gate
→ 검증 경험 저장
```

Unreal에서 Motion Core 결과가 AnimBP/Montage/Control Rig 수정을 요구하면 `engine-editor`로 분기한다.

Unity에서 Animator/AnimationClip의 안전하지 않은 에디터 authoring이 필요할 때도 Editor 검증을 우회하지 않는다.

## 학습

`assets/vibe-experience-memory.js`는 검증된 경험만 재사용한다.

재사용 조건:

- 실제 evidence 존재
- 성공이면 검증된 결과
- 실패면 확인된 failure cause 존재

금지:

- 검증되지 않은 시도를 정답처럼 재사용
- 다른 게임의 체력/데미지/보상 값을 자동 복사
- 경험치가 높다는 이유로 승인 권한 확대

## 완료 판정

다음은 완료가 아니다.

- AI가 코드를 작성함
- candidate branch가 생성됨
- Blueprint 계획이 생성됨
- 아트북/홈페이지에 노출됨

실제 완료는 작업 종류에 필요한 검증 증거가 모두 존재해야 한다.

특히 source worker가 만든 candidate는 자동 PASS하지 않는다.

## 최종 통합 전 체크

컴퍼니 수정이 끝난 뒤 최신 `main`을 다시 읽고 다음을 연결한다.

1. `assets/vibe-company-orchestration-bridge.js` → Vibe2 Core Runtime
2. 컴퍼니 작업 큐 → `.vibe2/queue.json` 변환/동기화
3. 부서 검증 결과 → Experience Memory evidence
4. Unity build 결과 → 후보 작업 PASS/FAIL 처리
5. Unreal Editor runner 연결 여부 확인
6. `Vibe2 Continuous Core` workflow를 기본 브랜치에 통합
7. 통합 후에만 hourly schedule을 실제 24시간 운영으로 간주

컴퍼니 권한, ARTBOOK FIRST, 핵심 결정 승인, `web-games/` read-only 정책은 그대로 유지한다.
