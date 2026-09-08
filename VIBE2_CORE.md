# Vibe2 Core 운영 계약

## 문서 상태

이 문서는 Vibe2를 재운게임즈의 게임 제작 핵심 엔진으로 확장하기 위한 **목표 계약**이다. 문서에 적힌 기능이 모두 현재 구현됐다는 뜻은 아니다. 구현은 이 문서를 기준으로 단계적으로 진행한다.

재운컴퍼니의 현재 운영 규칙, 승인 게이트, 부서 권한, 아트북 정책은 그대로 유지한다. 컴퍼니 쪽 파일이 수정 중일 때 Vibe2는 해당 파일을 읽기만 하고 직접 수정하지 않는다.

## 목적

Vibe2 Core의 역할은 다음과 같다.

- 자연어 요구를 엔진 독립 작업계획으로 변환
- Unity / Unreal / Godot 등 엔진별 실행 어댑터로 분기
- 보호 대상 게임 규칙과 저장 의미를 보존
- 작업을 짧은 단위로 분할하고 검증 후 다음 작업으로 이어감
- AI 부서 협업 결과와 검증된 성공/실패 경험을 다음 작업에 재사용
- 애니메이션/모션을 별도 핵심 품질 축으로 관리

## 권한 분리

```text
한재운
  ↓
재운컴퍼니
= 지시 우선순위 / 단계 / 부서 배정 / 핵심결정 승인 / 운영상태
  ↓
Vibe2 Core
= 작업계획 / 실행계약 / 엔진 분기 / 보호규칙 / 검증 / 학습 조회
  ↓
Engine Adapter
= Unity / Unreal / Godot
  ↓
실제 책임 파일 수정
  ↓
QA / 빌드 / 런타임 증거
  ↓
검증된 경험 저장
```

Vibe2 경험이 쌓여도 사용자 승인 권한이나 부서 권한은 확대되지 않는다. 학습은 품질, 근거 수, 대안 검토, 회귀 깊이를 강화하는 데만 사용한다.

## 24시간 연속 작업 모델

24시간 운영은 한 개의 장기 프로세스를 계속 실행하는 방식이 아니라 **짧은 검증 작업을 연속으로 이어가는 작업 큐** 방식으로 구현한다.

```text
작업 선택
→ 격리된 작업 단위 실행
→ QA
→ 결과 기록
→ 성공: 다음 작업
→ 실패: 실패 원인 기록 + 재작업 또는 보류
→ 막힘: 다른 독립 작업 선택
→ 큐가 남아 있으면 다음 실행 호출
```

필수 규칙:

- 사용자 새 지시는 자율 큐보다 항상 우선한다.
- 작업 하나는 명확한 책임 파일과 완료 조건을 가진다.
- 실패한 작업을 무한 반복하지 않는다.
- 핵심 결정, 저장 파괴 변경, 과금, 유료 AI 요구는 자동 진행하지 않는다.
- `web-games/`는 읽기/분석 전용이다.
- 정식 신규 구현은 `unity-games/` 또는 이후 `unreal-games/` 같은 엔진별 소스 경로에서 수행한다.
- 홈페이지 공개는 자동 작업 큐와 분리한다.

## 엔진 독립 구조

Vibe2 Core는 공통 의미 모델과 엔진 어댑터를 분리한다.

```text
Vibe2 Core
├─ Goal Contract
├─ Work Plan
├─ Protected State Contract
├─ Learning Context
├─ Motion Contract
├─ QA Contract
└─ Engine Adapter
   ├─ Unity Adapter
   ├─ Unreal Adapter
   └─ Godot Adapter
```

### Unity Adapter

책임 경로 예시:

- `unity-games/<slug>/Assets/**`
- `unity-games/<slug>/Packages/manifest.json`
- `unity-games/<slug>/ProjectSettings/**`

검증:

- C# 컴파일
- Scene / Prefab 참조
- Animator / AnimationClip 연결
- Android 빌드
- 실제 실행 증거

### Unreal Adapter

신규 표준 경로:

- `unreal-games/<slug>/<project>.uproject`
- `unreal-games/<slug>/Content/**`
- `unreal-games/<slug>/Config/**`
- `unreal-games/<slug>/Source/**`

소스 관리 제외 대상:

- `Binaries/**`
- `DerivedDataCache/**`
- `Intermediate/**`
- `Saved/**`

검증 목표:

- C++ 컴파일
- Blueprint 참조 오류
- Map / Level 로딩
- Animation Blueprint / Montage / State Machine
- IK Rig / IK Retargeter / Control Rig
- Packaging
- Android 또는 Windows 타깃 빌드
- Shader / 메모리 / 프레임 / 모바일 성능

## AI 협업 학습

Vibe2 학습은 모델 자체 재훈련이 아니라 **검증된 경험 검색 + 실행계약 반영** 방식으로 한다.

학습 단위는 최소 다음 정보를 가진다.

- 게임 ID
- 엔진
- 담당 부서
- 작업 유형
- 증상 / 목표
- 적용한 변경
- 실패 원인 또는 성공 요인
- QA 결과
- 빌드 결과
- 관련 커밋/증거
- 재사용 가능한 패턴
- 재사용 금지 조건

```text
과거 검증 경험
→ 현재 작업과 유사도 검색
→ 관련 경험만 작업계획에 첨부
→ 부서가 대안 검토
→ 실행
→ QA
→ 새 경험 저장
```

검증되지 않은 시도는 성공 패턴으로 승격하지 않는다. 실패도 원인과 증거가 확인된 경우에는 학습 자료로 저장할 수 있다.

## Motion Core 연결

애니메이션/모션은 그래픽 부가 기능이 아니라 Vibe2의 핵심 품질 축으로 취급한다.

Motion Core는 다음을 공통 계약으로 제공한다.

- 필수 모션 목록
- 상태 전환 그래프
- 공격/피격/VFX/SFX 동기화 지점
- Blend / Transition 품질
- Root Motion / Foot Sliding / IK 검사
- Retargeting 검사
- 모션 품질 점수
- 모션 성공/실패 경험 학습

세부 규칙은 `VIBE2_MOTION_CORE.md`를 따른다.

## 보호 규칙

다음은 자동으로 변경하지 않는다.

- 체력
- 공격력
- 웨이브
- 보상
- 드랍률
- 저장 키
- 저장 구조
- 진행 의미
- 승인된 핵심 플레이 규칙
- 완료 아트북으로 잠긴 컨셉

변경이 필요하면 명시적 승인 또는 기존 컴퍼니 게이트를 통과해야 한다.

## 구현 순서

1. 문서 계약 확정
2. Vibe2 엔진 타깃 공통화
3. Unreal Adapter 추가
4. Motion Core 계약/검증 모듈 추가
5. 경험 메모리 저장/검색 모듈 추가
6. 24시간 작업 큐를 Unity/Unreal 소스 중심으로 전환
7. QA 추가
8. 컴퍼니 수정 완료 후 최신 브리지와 최종 연결

## 현재 구현과 목표의 차이

현재 Vibe2에는 workbench/orchestrator, 보호 규칙, 일부 엔진 중립 모델, 애니메이션 상태 관리, 부서 경험치 연동이 존재한다.

추가 구현이 필요한 항목:

- Unreal 직접 타깃
- Unreal 책임 경로/QA 계약
- 독립 Motion Core
- 장기 경험 검색 메모리
- Unity/Unreal 공통 24시간 작업 큐
- 컴퍼니 최신 브리지와의 최종 재연결
