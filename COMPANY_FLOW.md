# 재운컴퍼니 중앙 제작 플로우

이 문서는 재운컴퍼니의 **유일한 사람용 제작 정책 원본**이다. 회사 최종목표, 조직 구조, 시스템 아키텍처, 제작 분류, 설계, 부서 회의, 검증, Vibe2 역할, 아트북 역할이 충돌하면 이 문서를 기준으로 판단한다.

`company-directive.json`은 이 문서를 실행하기 위한 짧은 기계 설정만 가진다. 다른 문서에는 같은 정책을 다시 복제하지 않는다. 상태·감사·빌드·아트북 이력 파일은 증거를 기록할 뿐 새로운 정책을 만들지 않는다.

## 0. 회사 최종목표와 시스템 아키텍처

### 회사 최종목표

재운컴퍼니의 최종목표는 게임을 **설계 → 다중모델 부서 검토 → 실제 플레이/기술 검증 → 개발 → 독립 QA → 출시**까지 지속적으로 완성하고, 검증된 성공·실패 경험을 Vibe2에 축적하여 **게임을 만들수록 회사 전체의 설계·개발·검증·출시 능력이 향상되는 자율 게임 제작 시스템**을 구축하는 것이다.

최우선 원칙은 다음과 같다.

- 사용자의 최신 지시와 게임 고유 정체성을 보존한다.
- 재미가 검증되지 않은 설계를 비싼 본개발로 확대하지 않는다.
- 기술적으로 검증되지 않은 상태를 출시 가능으로 오판하지 않는다.
- AI끼리의 평가보다 실제 플레이, Web/Unity 검증, 독립 QA, 출시 결과를 더 강한 근거로 사용한다.
- 성공과 실패의 원인을 모두 기록해 다음 게임의 판단을 개선한다.
- 자동화가 커져도 사용자의 최종 결정권과 안전 게이트를 우회하지 않는다.

### 전체 시스템 아키텍처

```text
사용자 최신 지시
→ COMPANY_FLOW.md 중앙 정책
→ company-directive.json 실행 설정
→ productionClass별 운영 모드 선택

DESIGN_ONLY
  Game Designer AI
  → 5개 부서 × 서로 다른 Lead AI 5개
      └ 각 부서: Lead AI + 보조 AI들 = 최소 3개 실제 모델 검토
  → 각 부서 Lead AI가 부서 내부 의견 통합
  → 5개 Lead AI 부서간 회의/반박
  → 같은 Game Designer AI 설계 수정
  → Design Baseline
  → Artbook Editor 핵심 전략 압축

DEVELOPMENT_CONFIRMED
  Design Baseline
  → Web Gameplay Validation
  → Web 근거 부서회의
  → 같은 Game Designer AI 수정
  → Unity Technical Validation
  → Unity 근거 부서회의
  → 같은 Game Designer AI 최종 수정
  → 필요한 범위 재검증
  → Development Baseline Gate
  → Artbook Editor 자동 revision

RELEASE_CONFIRMED
  Development Baseline
  → Vibe2 본개발/통합
  → Unity Android 실제 빌드
  → 5개 부서 빌드 preflight 위험감시
  → 실제 Android 런타임 검증
  → 독립 QA/회귀 검증
  → 5개 부서 최종 위험감시
      └ 동일한 현재 빌드 + 런타임 + 독립 QA 근거 사용
  → 문제 있으면 Vibe2 수정 → 재빌드 → 재검증 반복
  → Release Gate
  → Release Baseline
  → Artbook Editor 최종 revision

모든 단계의 실제 검증 근거
→ 성공/실패 원인 라벨링
→ 검증된 패턴만 Vibe2 학습 근거
→ 다음 설계·개발 사이클로 환류
```

아키텍처의 **역할 의미는 고정**하지만 실제 AI 모델, 분류별 게임 수, 숫자 표시 별칭은 운영 상황과 사용자 지시에 따라 바뀔 수 있다. 구조 변경이 필요하면 이 중앙 문서를 먼저 수정하고 실행 설정과 코드는 이 의미를 따라야 한다.

## 1. 권한 순서

1. 사용자의 최신 직접 지시
2. `COMPANY_FLOW.md`의 현재 중앙 정책
3. `company-directive.json`의 실행 설정
4. 구현 세부 도구 계약
5. 상태·감사·빌드·health 기록

## 2. 제작 분류의 기준

제작 분류의 **정식 의미는 숫자가 아니라 `productionClass`**다.

- `DESIGN_ONLY`: 설계 기준선을 만드는 단계
- `DEVELOPMENT_CONFIRMED`: 실제 플레이·기술 검증으로 개발 기준선을 만드는 단계
- `RELEASE_CONFIRMED`: 출시 기준선을 따라 본개발·릴리즈 검증을 수행하는 단계

현재 표시 숫자는 `RELEASE_CONFIRMED=1`, `DEVELOPMENT_CONFIRMED=2`, `DESIGN_ONLY=3`을 사용하지만 숫자는 **표시 및 하위 호환 별칭**일 뿐이다. 사용자가 숫자를 바꿔도 `productionClass` 의미와 작업 규칙은 그대로 유지한다.

### 분류 수와 멤버십

- 각 분류의 게임 수는 고정하지 않는다.
- 분류별 개수는 현재 `productionClass` 멤버십에서 계산한다.
- 특정 게임 ID를 특정 분류에 영구 고정하지 않는다.
- 실제 설계 성숙도, playable 근거, 기술 검증, Unity 준비도, QA 근거를 사용해 승격·하락한다.
- 단순히 목표 개수를 맞추기 위한 상위 N개 자동 승격·하락을 금지한다.
- 기존 공개 Web판과 저장 의미는 분류 이동 때문에 삭제하지 않는다.

## 3. 회사 AI 구조

재운컴퍼니는 `planning`, `graphics`, `development`, `qa`, `balance` 5개 부서와 Game Designer AI, Artbook Editor AI, Vibe2, 회의 조정 역할로 운영한다.

### 5개 부서 Lead AI 원칙

- 역할은 고정하되 실제 모델은 영구 고정하지 않는다.
- `DESIGN_ONLY`부터 5개 부서에 각각 **서로 다른 실제 Lead AI model ID**를 배정한다.
- 같은 사이클에서 5개 Lead model ID는 중복되면 안 된다.
- 각 부서는 **Lead 1개 + 보조 2개 이상**, 합계 최소 3개의 서로 다른 실제 모델이 같은 근거를 독립 검토한다.
- 보조 모델은 부서 사이에서 겹칠 수 있지만 한 부서 내부 model ID는 모두 달라야 한다.
- Lead 배정은 성능·가용성·검증 결과에 따라 교체할 수 있다.
- 부서 이름이나 프롬프트만 다른 동일 모델을 서로 다른 Lead로 계산하지 않는다.
- 유료 API, 유료 모델, 유료 runner, 자동 초과결제를 사용하지 않는다.

```text
planning     → Lead Model A + Assistants
graphics     → Lead Model B + Assistants
development  → Lead Model C + Assistants
qa           → Lead Model D + Assistants
balance      → Lead Model E + Assistants

A/B/C/D/E는 같은 사이클에서 모두 서로 다른 실제 model ID
```

### 부서 내부 회의

```text
해당 부서 Lead 독립 검토
+ 해당 부서 보조 AI 독립 검토
→ 근거/충돌/공통점 비교
→ 해당 부서 Lead가 대표 의견 확정
```

대표 의견에는 최소 `KEEP / FIX / ADD / RISK / EVIDENCE`를 남기고 Lead/보조 model ID를 함께 기록한다.

### 부서 간 회의

```text
5개 Lead 대표 의견
→ 각 Lead가 다른 4개 부서 대표 의견 전체 열람
→ 각 Lead가 자기 부서 책임으로 1회 반박·수정
→ 회의 조정기가 CONSENSUS / CONFLICT / HOLD 판정
```

`CONSENSUS`만 자동 설계 수정 근거가 된다. `CONFLICT`와 `HOLD`를 임의로 합의 처리하지 않는다.

## 4. 설계와 아트북의 분리

### 상세 설계

- 한 프로젝트의 상세 설계 초안은 **Game Designer AI 1명**이 처음부터 끝까지 작성한다.
- 여러 AI가 초안을 분할 공동집필하지 않는다.
- 한 수정 사이클에서는 초안을 작성한 같은 Game Designer 모델/역할이 회의 결과를 반영해 수정한다.
- 부서 AI는 설계를 대신 쓰지 않고 검토·반박·근거 제출을 담당한다.

### 아트북

아트북은 상세 설계의 **핵심 전략 압축본**이다.

- 별도의 **Artbook Editor AI 1명**이 전체 아트북을 편집한다.
- 부서 AI가 아트북 페이지를 분담 집필하지 않는다.
- Artbook Editor는 새 설정·수치·규칙·스토리를 발명할 수 없다.
- 정체성, 플레이어 판타지, 핵심 루프, 시그니처 시스템, 성장 방향, 비주얼 방향을 중심으로 압축한다.
- 상세 구현 로그·긴 QA 표·모든 밸런스 수치를 복제하지 않는다.
- 기존 아트북 이력은 덮어쓰지 않고 revision으로 보존한다.

### Vibe2

- `DESIGN_ONLY`와 `DEVELOPMENT_CONFIRMED`에서 Vibe2는 상세 설계나 아트북의 주 저자가 아니다.
- 검증용 구현, 테스트 분석, 개발 보조, 검증된 패턴 축적을 담당할 수 있다.
- AI가 만든 설계 자체를 성공 데이터로 간주하지 않는다. 실제 QA·플레이·기술·출시 근거가 붙어야 성공 근거가 된다.

## 5. DESIGN_ONLY — Design Baseline

현재 표시 별칭은 **3분류**다. 목적은 개발에 넘길 수 있는 설계 기준선을 확정하는 것이다.

### DESIGN_ONLY 다이렉트 흐름

```text
한 번 시작
→ Game Designer AI 상세 설계 초안
→ 5개 고유 Lead AI 배정
→ 각 부서 Lead + 보조 AI 독립 검토
→ 각 Lead가 부서 대표 의견 확정
→ 5개 Lead 회의 + 각 Lead 1회 반박
→ CONSENSUS / CONFLICT / HOLD
→ 같은 Game Designer가 CONSENSUS 반영 수정
→ Design Baseline Gate
→ Artbook Editor 핵심 전략 아트북 작성
→ Vibe2 검증·학습 후보 기록
→ 결과 반환
```

3분류는 외부 실기 검증을 필수로 요구하지 않는 설계 단계이므로, 필요한 AI 작업과 설계 게이트가 충족되면 **설계부터 아트북까지 한 사이클에서 다이렉트 결과**를 낸다.

### DESIGN_ONLY 확정 조건

- 게임 정체성과 핵심 재미가 명확하다.
- 핵심 루프가 행동 → 피드백 → 선택 → 보상으로 연결된다.
- 대표 시스템과 성장 방향이 모순되지 않는다.
- 비주얼 방향과 모바일 UX 방향이 정의돼 있다.
- 개발부·QA가 프로토타입 검증 질문을 만들 수 있다.
- 5개 Lead model ID가 실제로 서로 다르다.
- 각 부서 최소 다중모델 검토 기준을 통과한다.
- 치명적인 미해결 충돌을 합의된 것처럼 숨기지 않는다.

통과 상태는 `DESIGN_BASELINE_READY`다. 이는 영구 설계 잠금이 아니라 `DEVELOPMENT_CONFIRMED` 검증에 넘길 수 있는 기준선이다.

## 6. DEVELOPMENT_CONFIRMED — Gated Direct Development Validation

현재 표시 별칭은 **2분류**다. 목적은 Design Baseline이 **실제로 재미있고, 실제 목표 엔진·기기에서 구현 가능하며, 수정 후에도 다시 검증되는지** 확인해 Development Baseline을 만드는 것이다.

2분류도 사용자 입장에서는 **한 번 실행해 시작하는 다이렉트 파이프라인**이다. 그러나 3분류와 달리 실제 플레이/Unity 근거가 필수이므로, 근거가 없거나 실패하면 그 지점에서 정확히 멈춘다. AI가 누락된 실험 결과를 상상해서 다음 게이트를 통과시키면 안 된다.

### 6.1 시작과 검증 계획

```text
2분류 시작
→ 기존 Design Baseline 로드
→ Game Designer가 핵심 검증 질문/성공기준 추출
→ Web Gameplay 검증 준비
```

검증 질문은 새 게임을 다시 기획하기 위한 것이 아니라 기존 설계의 위험한 가정을 시험하기 위한 것이다.

### 6.2 Web Gameplay Validation

Web은 빠르고 저렴한 **게임플레이 검증 테스트베드**다. 완성 그래픽이 목적이 아니다.

검증 대상:
- 핵심 루프와 반복 재미
- 전투/상호작용 템포
- 성장·보상·경제
- 난이도와 적 수치
- 스킬/선택 구조
- 모바일 터치와 UI 흐름
- 반복 플레이의 지루함·악용 구조

`web smoke test`, 페이지 로딩 성공, 단순 실행 성공만으로 Gameplay Validation PASS를 만들 수 없다. 실제 플레이 검증 기록이 필요하다.

#### Web 결과 분기

```text
Web Gameplay PASS
→ 1차 부서 근거회의로 자동 진행

Web Gameplay FAIL
→ 실패 원인 + CHANGE/DROP/HOLD 후보 기록
→ 필요한 수정안 기록
→ WAITING_WEB_REVALIDATION
→ Unity 단계로 진행 금지

Web 실제 근거 없음
→ WAITING_WEB_VALIDATION
→ AI 추정으로 PASS 금지
```

### 6.3 1차 회의 — Web 근거회의

5개 고유 Lead + 각 부서 보조 AI 구조를 그대로 사용한다. 모든 AI는 **같은 Web 실제 결과**를 읽는다.

- 기획: 핵심 재미가 실제로 살아 있는가
- 개발: Web에서 드러난 구조가 Unity 이전에 위험한가
- 그래픽: 가독성과 필요한 시각 피드백이 적절한가
- QA: 재현 오류·입력·상태 전이 위험이 무엇인가
- 밸런스: 전투시간·성장·경제·선택률이 무너지는가

실제 기능 판정은 `KEEP / CHANGE / DROP / HOLD`로 남긴다. 부서 내부 불일치와 회사 회의 상태는 `CONSENSUS / CONFLICT / HOLD`로 별도 기록한다.

회의 후 **같은 Game Designer AI**가 합의된 Web 근거만 반영해 설계를 수정한다.

### 6.4 Unity Technical Validation

Web 검증을 통과하고 1차 설계 수정이 끝나면 Unity 기술 검증으로 자동 진행한다.

Unity 검증 대상:
- Android FPS·프레임 안정성
- 메모리·발열·로딩
- 물리·카메라·애니메이션
- AI/NavMesh·다수 객체
- VFX/파티클 비용
- 화면비·터치 입력
- 저장/불러오기·업데이트 호환
- 앱 중단/복귀
- 구현 복잡도·기술 부채
- 에셋 제작량·QA 경우의 수

턴제·카드·디펜스 등은 Web 우선이 기본이다. 3D 액션·물리·대규모 맵처럼 엔진 동작 자체가 재미를 결정하면 작은 Unity 검증을 더 일찍 병행할 수 있다.

#### Unity 결과 분기

```text
Unity Technical PASS
→ 2차 부서 기술회의로 자동 진행

Unity Technical FAIL
→ 실패 원인 + 기술 수정 범위 기록
→ WAITING_UNITY_REVALIDATION
→ Development Baseline 승인 금지

Unity 프로젝트/실행환경/실제 기술 근거 없음
→ WAITING_UNITY_VALIDATION
→ AI 추정으로 PASS 금지
```

### 6.5 2차 회의 — Unity 기술 근거회의

모든 부서는 동일한 실제 Unity 기술 근거를 읽는다.

- 기획: 기술 축소가 핵심 재미를 손상시키는가
- 개발: 구현 복잡도·성능·세이브·구조 위험
- 그래픽: 에셋/애니메이션/VFX 비용과 GPU·메모리 부담
- QA: 재현성·회귀·기기·입력·저장·복귀 위험
- 밸런스: 기술 제한이 난이도·전투량·경제에 미치는 영향

기술이 어렵다는 이유만으로 핵심 재미를 즉시 삭제하지 않는다. 우선순위는 다음과 같다.

```text
핵심 재미 보존
→ 구현 방식 단순화
→ 제작량 감소
→ 성능/QA 위험 감소
→ 그래도 불가능할 때 DROP/HOLD
```

회의 후 같은 Game Designer가 합의된 근거만 반영해 최종 수정한다.

### 6.6 재검증

설계를 수정했다고 바로 Development Baseline을 승인하지 않는다.

- Web 재미에 영향을 준 변경 → Web 재검증
- Unity 기술에 영향을 준 변경 → Unity 재검증
- 양쪽 모두 영향을 준 변경 → Web + Unity 둘 다 재검증
- 단순 문구/비기능 정리처럼 검증 결과를 바꾸지 않는 변경은 근거와 함께 재검증 면제 가능

필수 재검증이 아직 없으면 `WAITING_REVALIDATION`에서 정지한다.

### 6.7 Development Baseline Gate

`DEVELOPMENT_BASELINE_READY`는 다음을 모두 만족해야 한다.

```text
Design Baseline 존재
+ 실제 Web Gameplay Validation PASS
+ 실제 Unity Technical Validation PASS
+ 필수 수정사항 반영
+ 필요한 재검증 PASS
+ 치명적인 미해결 검증 차단 항목 없음
```

AI 회의 완료는 Development Baseline 승인과 동일하지 않다. Web smoke test도 Gameplay Validation과 동일하지 않다.

### 6.8 2분류 다이렉트 결과 상태

한 번 실행된 2분류 파이프라인은 가능한 데까지 자동 진행하고 다음 중 하나로 명확히 종료한다.

- `DEVELOPMENT_BASELINE_READY`: 모든 실제 근거·재검증 통과
- `WAITING_WEB_VALIDATION`: Web 실제 검증 필요
- `WAITING_WEB_REVALIDATION`: Web 수정 후 재검증 필요
- `WAITING_UNITY_VALIDATION`: Unity 실제 검증 필요
- `WAITING_UNITY_REVALIDATION`: Unity 수정 후 재검증 필요
- `WAITING_REVALIDATION`: 변경 영향에 따른 추가 재검증 필요
- `DEVELOPMENT_BLOCKED`: 현재 설계/기술 조건에서 진행 불가능한 치명적 차단 사유 존재

`WAITING_*`는 실패를 숨긴 상태가 아니라 **다음 실제 근거가 필요한 정상 게이트 상태**다. 필요한 근거가 추가되면 사용자가 단계를 하나씩 다시 지시할 필요 없이 같은 2분류 사이클이 다음 가능한 단계부터 이어갈 수 있어야 한다.

### 6.9 2분류 아트북

`DEVELOPMENT_BASELINE_READY`가 되면 **Artbook Editor가 자동으로 새 revision을 생성**한다.

2분류 아트북은 다음을 압축한다.
- 실제 검증을 살아남은 핵심 재미
- 최종 핵심 루프
- 살아남은 시그니처 시스템
- 검증 후 확정된 구현 방향
- 성장/밸런스 방향
- 비주얼 방향

세부 FPS 표, 긴 QA 로그, 전체 테스트 데이터는 아트북이 아니라 검증 증거 파일에 남긴다.

2분류가 `WAITING_*` 또는 `DEVELOPMENT_BLOCKED`면 **통과된 최종 아트북으로 위장하지 않는다.** 후보 수정 기록은 남길 수 있지만 Development Baseline 아트북 revision은 만들지 않는다.

## 7. RELEASE_CONFIRMED — Gated Direct Release Production

현재 표시 별칭은 **1분류**다. 목적은 확정된 Development Baseline을 **Vibe2가 실제 Unity Android 제품으로 구현·통합하고, 실제 빌드와 기기 근거, 5개 부서 위험감시, 독립 QA, 수정·재검증을 통과시켜 Release Baseline을 만드는 것**이다.

1분류도 사용자 입장에서는 **한 번 시작하는 다이렉트 파이프라인**이다. 내부에서는 실제 빌드·기기·QA 근거가 필요한 지점에서만 멈추며, 필요한 근거가 추가되면 같은 릴리즈 사이클을 다음 가능한 단계부터 재개한다.

### 7.1 시작 조건과 Vibe2 본개발

1분류 시작에는 `DEVELOPMENT_BASELINE_READY` 근거가 필요하다. 분류 표시 숫자만 1이라고 해서 본개발을 승인하지 않는다.

```text
1분류 시작
→ Development Baseline 로드
→ Core Design Lock 적용
→ Vibe2 본개발/통합
→ Unity Android Build 요청
```

Vibe2는 이 단계의 **주 개발 엔진**이다. 확정된 설계·기술 기준선을 구현하고, 통합하고, 발견된 결함을 수정한다. 부서 AI가 일상 개발을 대신하거나 매 사이클 새 기능을 추가하지 않는다.

### 7.2 Core Design Lock

1분류 기본 상태에서는 핵심 재미, 입력 방식, 전투 규칙, 핵심 성장 구조, 핵심 경제 구조를 잠근다.

다음 경우에만 예외 설계회의를 열 수 있다.

- 실제 구현에서 핵심 루프가 붕괴함
- 확정 핵심 기능이 기술적으로 구현 불가능함
- 치명적인 성능 한계가 핵심 구조와 직접 충돌함
- 저장 손상·업데이트 호환 파괴가 구조적 원인으로 발생함
- 출시 차단 수준의 UX/밸런스 문제가 핵심 설계에서 발생함
- 사용자가 직접 설계 변경을 지시함

예외 사유 없이 부서 AI나 Vibe2가 대형 기능, 핵심 규칙, 게임 정체성을 임의 변경하면 안 된다.

### 7.3 Unity Android Build Gate

Vibe2 구현 또는 수정 후에는 실제 Unity Android 빌드 근거가 필요하다.

```text
빌드 성공 + 검증 가능한 APK/빌드 근거 존재
→ 5부서 빌드 preflight 위험감시
→ 실제 Android 런타임 검증
→ 독립 QA/회귀 검증
→ 5부서 최종 위험감시

빌드 실패
→ 실패 로그/원인 기록
→ FIX_AND_REVERIFY
→ Vibe2 수정 후 재빌드

빌드 실행 환경 또는 빌드 근거 없음
→ WAITING_BUILD
→ AI 추정으로 build PASS 금지
```

소스가 변경됐는데 이전 빌드의 PASS를 새 빌드 근거로 재사용하면 안 된다.

### 7.4 5개 부서 출시위험 감시 — 빌드 preflight + 최종 검토

5개 고유 Lead + 각 부서 보조 AI의 위험감시는 **두 단계**로 수행한다.

#### 1차: Build Preflight

Unity Android 빌드가 현재 소스와 정확히 연결되면, 먼저 Development Baseline과 현재 빌드 근거만으로 확인 가능한 명백한 출시 차단 위험을 빠르게 점검한다. 이 단계는 실제 기기/독립 QA를 대체하지 않으며 최종 출시 승인이 아니다.

#### 2차: Final Release Review

실제 Android 런타임 검증과 독립 QA/회귀 검증이 모두 완료된 뒤, 5개 부서는 반드시 **동일한 현재 빌드 + 그 빌드에 묶인 Android 런타임 결과 + 그 빌드에 묶인 독립 QA 근거**를 함께 읽고 최종 위험감시를 수행한다.

- 기획: Development Baseline·핵심 재미 이탈
- 개발: 크래시, ANR성 문제, 성능, 구조, 빌드, 저장 위험
- 그래픽: 깨짐, 가독성, 애니메이션/에셋, 렌더링·메모리 비용
- QA: 재현 절차, 회귀, 입력, 화면비, 중단/복귀, 기기별 오류
- 밸런스: 명백한 밸런스 붕괴, 악용, 진행 불가능 구간

각 부서 Lead가 보조 AI 결과를 검토해 근거 없는 추측을 제거하고 대표 위험 목록을 확정한다. 새 기능 제안은 기본 출력이 아니다.

최종 5부서 검토에서 사용하는 runtime/QA 근거가 현재 build ID 또는 SHA에 묶여 있지 않으면 **Final Release Review를 실행하거나 `RELEASE_READY`를 승인하면 안 된다.**

### 7.5 실제 기기/런타임 검증

Release Gate에는 실제 Android 근거가 필요하다.

검증 대상:
- 실제 Android 입력
- FPS·프레임 안정성
- 메모리·발열·로딩
- 장시간 실행 안정성
- 크래시·ANR성 문제
- 앱 중단/복귀
- 저장 데이터 손상
- 업데이트 후 세이브 호환
- 다양한 화면비와 UI

실제 기기 또는 이에 준하는 승인된 런타임 근거가 없으면 `WAITING_DEVICE_VALIDATION`에서 멈춘다. 정적 빌드 성공만으로 기기 검증 PASS를 만들 수 없다.

### 7.6 독립 QA와 회귀 검증

독립 QA는 Vibe2 자기검사와 분리한다. 최소 다음을 검증한다.

- Development Baseline 핵심 요구 재현
- 변경 기능과 인접 기능 회귀
- 저장/불러오기/업데이트
- 중단/복귀
- 모바일 입력과 화면비
- 크래시/치명 오류
- 출시 차단 밸런스/진행 문제

QA가 실패하면 실패 항목, 재현 절차, 근거, 영향 범위를 기록하고 `FIX_AND_REVERIFY`로 보낸다.

### 7.7 Vibe2 수정 → 재빌드 → 재검증 반복

`FIX_AND_REVERIFY`에서는 Vibe2가 확인된 결함만 수정한다.

```text
확인된 실패 근거
→ Vibe2 수정
→ 새 Unity Android Build
→ 5부서 Build Preflight
→ 영향 범위 Android 런타임 검증
→ 독립 QA/회귀 재검증
→ 현재 build/runtime/QA를 읽는 5부서 Final Release Review
→ Release Gate 재평가
```

수정 후 이전 빌드/이전 QA PASS를 그대로 재사용하지 않는다. 현재 빌드와 현재 수정본을 참조한 재검증 근거가 필요하다.

### 7.8 Release Gate와 상태

1분류 파이프라인은 가능한 데까지 자동 진행하고 다음 상태 중 하나로 종료한다.

- `BUILDING`: Vibe2가 확정 Development Baseline을 구현·통합 중
- `WAITING_BUILD`: 실제 Unity Android 빌드/빌드 근거 필요
- `WAITING_DEVICE_VALIDATION`: 현재 빌드의 실제 Android 런타임 또는 독립 QA/회귀 근거 필요
- `FIX_AND_REVERIFY`: 빌드·부서감시·기기검증·독립 QA에서 수정 가능한 실패 발견
- `RELEASE_BLOCKED`: 현재 조건에서 자동 수정으로 해소할 수 없는 출시 차단 사유 존재
- `RELEASE_READY`: 현재 빌드가 모든 필수 출시 근거와 독립 QA를 통과

`RELEASE_READY`는 다음을 모두 만족해야 한다.

```text
Development Baseline 확인
+ 현재 소스에 대응하는 Unity Android Build 성공
+ 5개 부서 Build Preflight에 명백한 release blocker 없음
+ 현재 빌드 실제 Android 런타임 검증 PASS
+ 현재 빌드 독립 QA/회귀 PASS
+ 동일한 현재 build/runtime/QA 근거를 읽은 5개 부서 Final Release Review에서 unresolved release blocker 없음
+ Core Design Lock 위반 없음
```

AI 의견만으로 `RELEASE_READY`를 만들 수 없다.

### 7.9 Release Baseline과 최종 아트북

`RELEASE_READY`가 확인되면 `RELEASE_BASELINE`을 생성하고 실제 승인 빌드·검증 근거와 **최종 5부서 위험감시 근거**를 연결한다.

그 뒤 **Artbook Editor가 최종 revision을 자동 생성**한다. 최종 아트북은 출시에서 살아남은 핵심 정체성·루프·시그니처 시스템·성장/밸런스·비주얼 방향만 압축하며, 긴 QA/기기 로그를 복제하지 않는다.

`BUILDING`, `WAITING_*`, `FIX_AND_REVERIFY`, `RELEASE_BLOCKED` 상태에서는 최종 Release Baseline 아트북 revision으로 위장하지 않는다.

## 8. 승격·하락과 아트북 처리

승격·하락은 개수 맞추기가 아니라 **현재 근거가 어느 제작 기준선을 충족하는지**로 결정한다.

```text
DESIGN_ONLY → DEVELOPMENT_CONFIRMED
Design Baseline 존재
→ 2분류 Gated Direct Validation 시작

DEVELOPMENT_CONFIRMED → RELEASE_CONFIRMED
DEVELOPMENT_BASELINE_READY + 실제 플레이/Unity 근거 확인
→ 1분류 Gated Direct Release Production 시작

출시 직전
RELEASE_READY
→ Release Baseline 확정
→ 최종 아트북 revision
```

하락이 필요하면 원인과 근거를 기록한다. 분류별 총 개수가 달라지는 것은 정상이며 다른 게임을 대신 끌어올리거나 내리지 않는다.

## 9. 개발 플로어와 안전 규칙

- 한 개발 플로어는 한 게임 source root를 독점한다.
- 같은 source root를 여러 AI가 동시에 직접 수정하지 않는다.
- `RELEASE_CONFIRMED` 실제 코드 수정은 Vibe2 개발 흐름에서 격리 후보 → 통합 → 실제 빌드 → 5부서 Build Preflight → Android 런타임 검증 → 독립 QA → 5부서 Final Release Review → release gate 순서로 간다.
- 수정 직후 검증 없이 main/public으로 바로 내보내지 않는다.
- 기존 게임 핵심 규칙, 세이브 의미, 과금, 플랫폼, 대형 콘텐츠 방향은 사용자 결정 없이 몰래 바꾸지 않는다.
- 임시 wrapper·override 체인을 누적하기보다 담당 시스템을 직접 수정한다.
- Unity MCP 등 로컬 개발 연결은 외부 공개 포트가 아니라 `127.0.0.1` 우선이다.
