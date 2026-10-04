# Roblox Common UI v1

회사 공용 Roblox UI 베이스. 기존 3종을 보존하면서 총 11종으로 확장한다.

- FRAME_PANEL
- BUTTON_PRIMARY
- BAR_HEALTH
- INVENTORY_SLOT
- TOOLTIP
- MODAL
- TAB_BUTTON
- QUEST_CARD
- CURRENCY_CHIP
- BAR_PROGRESS
- MOBILE_ACTION_BUTTON

특징:
- 게임마다 theme만 바꿔 재사용
- 모바일 터치 크기 보장
- 패널/버튼/상태/인벤토리/퀘스트/재화/진행도 공통 시각 언어
- UI는 표시와 터치 피드백만 소유
- HP/데미지/인벤토리/장착/퀘스트/보상/재화/진행도/입력/Remote/저장 권한 없음
- survival 전용이 아니라 모든 Roblox 게임의 공용 베이스

각 게임 스타일에 맞는 파생 설정과 실제 런타임 검증이 필요하다.
현재 `productionVerified=false`, `PENDING_STUDIO`.
