# Roblox Common Materials v1

회사 공용 Roblox 재질 베이스 총 8종.

- WOOD
- STONE
- METAL
- GLASS
- FABRIC
- LEATHER_LIKE
- GROUND
- MAGIC_CRYSTAL

각 재질은 여러 시각 variant를 제공하고 게임별 tint를 허용한다.

중요:
- Material 변경 전에 CurrentPhysicalProperties를 복사한다.
- 변경 후 CustomPhysicalProperties로 복원해 밀도/마찰/탄성을 유지한다.
- LEATHER_LIKE는 Roblox Fabric 기반 시각 프리셋이며 별도 물리 의미를 만들지 않는다.
- 충돌, CanTouch, CanQuery, 게임 판정을 건드리지 않는다.

현재 productionVerified=false / PENDING_STUDIO.
