# Roblox Common Menu v1

회사 공용 메뉴/운영 UI 자산팩. 특정 외부 게임 화면을 복사하지 않고 검증된 메뉴 원리만 내부 스타일 시스템으로 재구성한다.

## 18개 공통 컴포넌트

MAIN_MENU_SHELL, TOP_STATUS_BAR, SIDE_NAVIGATION, BOTTOM_ACTION_BAR, PAUSE_MENU, SETTINGS_PANEL, SETTINGS_ROW, SEARCH_BAR, FILTER_CHIP, SORT_SELECTOR, INVENTORY_PANEL, ITEM_DETAIL_PANEL, EQUIPMENT_PANEL, MAP_PANEL, JOURNAL_PANEL, INPUT_HINT_BAR, SAVE_STATUS, PROFILE_SUMMARY.

## 스타일 6종

- MINIMAL_HERO: 큰 핵심 정보 + 적은 메뉴 항목
- DENSE_TACTICAL: 많은 정보와 빠른 비교
- CINEMATIC_DARK: 배경 연출과 메뉴를 분리한 어두운 스타일
- BRIGHT_CARD: 캐주얼/타이쿤용 카드형
- DIEGETIC_MAP: 지도/기록/탐험 중심
- CLEAN_CONSOLE: 패드 포커스와 입력힌트 중심

## 플로우 사용

새 플로우를 만들지 않는다. 기존 Asset Universe / company-asset-library 경로로 자동 후보화한다.

- DESIGN_REFINEMENT: 메뉴 정보구조와 스타일 선택
- GRAPHICS_PRODUCTION: 색/재질/타이포/레이아웃/포커스 제작
- SOURCE_COMPOSITION: 메인/일시정지/설정/인벤토리/장비/지도/저널 결합
- BUILD_UP: 검색/필터/정렬/상세/입력힌트/저장상태 확장
- PRESENTATION_POLISH: 포커스 모션/깊이/가독성/접근성 개선

Studio는 내부 사용·내부감사·자동교체에 필수 아님. 실제 production 승격과 별개다.
