# Vibe2 Motion Core

## 목적

Vibe2 Motion Core는 **애니메이션 파일이 존재하는지**가 아니라 **게임 안에서 모션이 자연스럽고 판정과 정확히 연결되는지**를 검증하는 공통 모션 계층이다.

Unity와 Unreal은 구현 방식이 다르지만 같은 Motion Contract와 QA 기준을 사용한다.

## 기본 파이프라인

```text
캐릭터 의도
→ Motion State Graph
→ 적절한 Clip/Montage/Blend 선택
→ Transition / Blend
→ Gameplay Event 동기화
→ VFX / SFX / Camera 연결
→ 엔진 실행
→ Motion QA
→ 검증 경험 기록
```

## Motion Contract

캐릭터/몬스터/보스마다 최소 계약을 가진다.

예시 필수 상태:

- idle
- move
- run 또는 locomotion
- attack
- hit
- death

게임에 따라 추가:

- attack-combo
- skill
- cast
- block
- dodge
- stun
- knockback
- jump
- fall
- land
- interact

각 상태는 최소 다음 정보를 가진다.

- state id
- 사용 가능한 실제 모션
- loop 여부
- 예상 지속시간
- 진입 조건
- 종료/전환 조건
- interrupt 가능 여부
- Root Motion 사용 여부
- gameplay event marker
- VFX/SFX marker

## Motion State Graph

전환은 명시적으로 관리한다.

```text
idle ↔ move ↔ run
  ↓       ↓
attack ← locomotion
  ↓
hit / stun
  ↓
death
```

검사 항목:

- 존재하지 않는 상태로 전환하지 않는가
- 이동 중 공격 진입이 끊기지 않는가
- 공격 종료 후 정상 locomotion으로 복귀하는가
- death 이후 일반 상태로 복귀하지 않는가
- stun/hit interrupt 우선순위가 올바른가
- transition 시간이 너무 길거나 너무 짧지 않은가

## Combat Motion Sync

공격 모션은 게임 판정과 분리해서 생각하지 않는다.

필수 동기화 지점:

```text
windup
→ active hit frame
→ recovery
```

active hit frame에서만 실제 공격 이벤트가 발생하도록 계약한다.

원거리 공격:

```text
손/무기 발사 모션
→ release marker
→ projectile spawn
→ muzzle VFX
→ SFX
```

근접 공격:

```text
swing start
→ hit window open
→ damage resolution
→ hit reaction
→ hit VFX/SFX
→ hit window close
```

Motion Core는 HP나 실제 데미지 값을 직접 결정하지 않는다. 판정 타이밍과 이벤트 연결만 정의하며 실제 게임 결과는 엔진 게임플레이 권한이 결정한다.

## Retargeting

다른 스켈레톤에 모션을 적용할 때 다음을 검사한다.

- 기준 포즈
- 골반 높이
- 다리 길이
- 팔 길이
- 손/무기 위치
- 발 접지
- Root Motion 축
- 캐릭터 스케일
- 회전 기준

### Unity

- Avatar / Humanoid 매핑
- Animator Controller
- Avatar Mask
- Animation Rigging
- Root Motion 설정

### Unreal

- Skeleton
- IK Rig
- IK Retargeter
- Retarget Pose
- Animation Blueprint
- Montage
- Blend Space
- Control Rig

## Procedural Motion 보정

정적 Clip만으로 해결하지 못하는 항목을 보정한다.

- Foot IK
- 경사면 발 접지
- 손-무기 고정
- Look At
- Aim Offset
- 상체/하체 분리
- 피격 방향 반응
- Head tracking
- 간단한 recoil

절차 보정은 원본 모션을 가리는 임시 패치가 아니라 책임 시스템 안에서 명시적으로 관리한다.

## Motion Quality Score

품질 점수는 단순 파일 존재 여부를 사용하지 않는다.

평가 축:

1. `coverage` — 필요한 상태가 실제 모션으로 채워졌는가
2. `transition` — 상태 전환이 자연스러운가
3. `combatSync` — 공격/피격 판정과 모션이 맞는가
4. `footStability` — 발 미끄러짐/관통이 없는가
5. `rootMotion` — 이동량/회전이 게임 이동과 충돌하지 않는가
6. `retarget` — 다른 스켈레톤 적용 시 왜곡이 허용 범위인가
7. `readability` — 모바일 카메라에서도 공격/피격 의도가 읽히는가
8. `performance` — Animator/AnimBP/IK 비용이 목표 성능 안에 있는가
9. `repetition` — 반복 패턴이 지나치게 기계적이지 않은가

각 축은 0~100으로 기록할 수 있으나 총점만으로 PASS하지 않는다. 필수 게이트 실패가 있으면 총점과 무관하게 REVISE다.

## 필수 Motion QA 게이트

다음 중 하나라도 실패하면 완료로 처리하지 않는다.

- 캐릭터/몬스터/보스의 필수 실제 모션 누락
- attack 모션과 실제 hit timing 불일치
- death 후 locomotion 복귀
- 심한 foot sliding
- Retargeting으로 팔다리/무기 위치가 명백히 깨짐
- 모션 전환 시 순간이동/회전 튐
- Animation/Blueprint/Animator 참조 오류
- 모바일 성능을 심하게 손상하는 IK/Animation 구성

## 모션 학습 메모리

검증된 모션 경험은 다음 게임에서 재사용할 수 있다.

예시:

```text
엔진: Unreal
캐릭터 유형: 4족 몬스터
문제: 180도 방향전환 시 발 미끄러짐
해결: locomotion turn state + 짧은 transition + root rotation 제한
검증: QA PASS
재사용 조건: 4족, 유사 이동속도
```

다른 예:

```text
엔진: Unity
무기: 대검
문제: 공격이 맞기 전에 데미지가 발생
해결: Animation Event를 active frame으로 이동
검증: PlayMode + 실제 전투 PASS
```

학습은 다른 프로젝트의 수치를 자동 복사하지 않는다. 전환 방식, 검사 절차, 실패 패턴 같은 **검증된 방법**을 우선 재사용한다.

## 엔진별 어댑터

```text
Motion Core
├─ Motion Contract
├─ State Graph
├─ Event Sync
├─ Retarget Contract
├─ Quality Score
└─ Adapter
   ├─ Unity Motion Adapter
   │  ├─ Animator
   │  ├─ AnimationClip
   │  ├─ Avatar
   │  └─ Animation Rigging
   └─ Unreal Motion Adapter
      ├─ Animation Blueprint
      ├─ Montage
      ├─ Blend Space
      ├─ IK Rig / Retargeter
      └─ Control Rig
```

## 구현 순서

1. 엔진 중립 Motion Contract 데이터 구조
2. 필수 상태/전환 검증
3. Combat Sync marker 계약
4. Motion Quality Score
5. Unity 어댑터 매핑
6. Unreal 어댑터 매핑
7. 경험 메모리 연결
8. 실제 프로젝트 QA 증거 연결

## 완료 정의

`Attack01` 파일이 존재한다는 이유만으로 완료하지 않는다.

완료 예:

```text
Attack01 존재
+ locomotion에서 정상 진입
+ active frame과 실제 공격 판정 일치
+ 적 hit reaction 연결
+ VFX/SFX 연결
+ recovery 후 정상 복귀
+ retarget 이상 없음
+ 모바일 성능 기준 통과
= Motion PASS
```
