# Roblox Common Motion v1

회사 공용 Roblox R15 관절 모션 원본 61종. 전체 목록과 기존 동작 길이·우선순위는 `catalog.json`에 있다.

## 기본 동작·액션 수정

- 대기: 반복 경계가 닫히는 호흡과 머리·손의 지연 동작.
- 걷기·조깅·달리기·전력질주: 지지와 회수 구간, 무릎 굽힘, 발목 보상, 골반 중심 이동과 팔의 후속 동작. 같은 보행 함수를 쓰는 경사 오르기·내리기와 부상 보행에도 적용된다.
- 시작·정지·회전: 준비 자세, 체중 이동, 시선 선행, 제동 뒤 복귀.
- 점프·착지: 압축→이륙→공중 자세→접촉→충격 흡수→복귀. 점프 마지막 자세와 착지 첫 자세를 일치시킨다.
- 정면 피격·약공격·강공격: 몸통·팔·다리의 단계별 움직임과 반동·회복. 공격은 준비 자세로 복귀한다.

직접 수정한 기본 동작 13종과 공용 보행의 파생 동작 3종이다. 모든 61종의 기존 길이·우선순위와 기존 이름 있는 이벤트 시점은 보존한다. 키프레임 수 증가 자체를 품질 증거로 사용하지 않는다.

## 기본 작업 예산

기존 `ASSET_DEVELOPMENT` 작업에 60분 예산을 배정한다: 원본·리그 검토 10분, 실제 수정 30분, 접촉·반복·전환 검수 15분, 증거·인계 5분. 빈 대기로 시간을 채우지 않으며 개별 모델 호출 예산이나 게임 작업 권한은 확대하지 않는다. 중앙 기준은 `company-learning/platform-release-roadmap.json`의 `studioMotionProgram.baseQualityWorkSession`이다.

## 검증 범위

실제 `KeyframeSequence`를 생성하고 Studio 미리보기용 임시 Animation을 `Animator:LoadAnimation()`으로 재생할 수 있다. `qa/roblox-common-motion-source.test.mjs`는 원본 Luau를 실행해 61종의 포즈·시간·루트 권한과 기본 동작의 반복·연결을 검사한다. CFrame과 Pose는 검사 대역이므로 이 검사는 실제 Roblox 재생 증거가 아니다.

`VIBE2_LUAU_BINARY=/path/to/luau node --test qa/roblox-common-motion-source.test.mjs`

실제 R15 체형별 발 접촉, 보행 속도 동기화, 보간·블렌딩, 전후 영상 비교, 모바일 성능은 아직 검증하지 않았다. 기존 `quality-evidence.json`의 내부 감사 점수는 이번 수정의 새로운 품질 점수가 아니다. 현재 `productionVerified=false / PENDING_STUDIO`를 유지한다. production 사용에는 영구 Animation 업로드와 실제 대상 리그 검증이 필요하다.

이 계층은 관절 표현만 소유하며 이동속도·캐릭터 위치·게임 데미지·저장·네트워크 권한을 소유하지 않는다.
