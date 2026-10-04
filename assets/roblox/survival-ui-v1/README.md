# Survival UI v1

현재 Roblox `survival`의 StudioAssets UI 3종을 실제 Roblox 네이티브 UI 소스로 구현.

- FRAME_PANEL
- BUTTON_PRIMARY
- BAR_HEALTH

특징:
- 48px 최소 터치 높이
- 패널 깊이/테두리/그라데이션
- 버튼 hover/press 표현
- 체력비율에 따른 good/warn/critical 표시

체력값, 데미지, RemoteEvent, 저장 권한은 게임 코드가 소유한다.
100점은 정적 제작 체크 목표이며 실제 모바일 런타임 PASS를 뜻하지 않는다.
