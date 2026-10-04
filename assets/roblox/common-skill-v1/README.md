# Roblox Common Skill Presentation v1

회사 공용 Roblox 스킬 연출 베이스 총 8종.

- CAST_HAND
- TELEGRAPH_CIRCLE
- IMPACT_SMALL
- CAST_AURA
- PROJECTILE_ORB
- AREA_PULSE
- TELEGRAPH_FAN
- TARGET_MARKER

IMPACT_SMALL과 AREA_PULSE는 공용 VFX를 재사용한다.
PROJECTILE_ORB는 투사체의 외형만 제공하며 이동/충돌은 게임 코드가 소유한다.
TARGET_MARKER는 대상 위 표시만 제공하며 실제 타겟 선택/락온 권한은 소유하지 않는다.

데미지, 실제 범위판정, 쿨다운, 이동, 콤보, 타겟 선택, Remote 권한은 소유하지 않는다.
현재 productionVerified=false / PENDING_STUDIO.
