# Roblox Common Motion v1

회사 공용 Roblox R15 모션 원본 11종.

- IDLE_RELAXED
- WALK
- JOG
- RUN
- START
- STOP
- TURN_90
- JUMP_START
- LAND
- HIT_FRONT
- DEATH_FRONT

실제 `KeyframeSequence`를 코드로 생성하고, 로컬/Studio 미리보기용 임시 Animation을 만들어 `Animator:LoadAnimation()`으로 재생할 수 있다.

중요:
- 이동속도/캐릭터 위치/루트모션 권한 없음
- 게임 데미지/상태/세이브/네트워크 권한 없음
- production에서는 영구 Animation 업로드와 실제 R15 런타임 검증 필요
- 현재 productionVerified=false / PENDING_STUDIO
