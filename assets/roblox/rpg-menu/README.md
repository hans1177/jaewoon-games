# RPG 메뉴 내부 코드 자산

`RPGMenu.luau`는 배낭 검색·분류·상세 보기, 실제 Tool 장착/해제, 장비·퀘스트·파티·설정 화면을 제공한다. `RPGMenuModel.luau`는 서버가 복제한 진행 상태를 표시용 데이터로 변환한다.

현재 소비 게임은 `daechung-rpg`다. 이 게임의 `shared/`에는 두 모듈의 동일한 복제본을 고정한다. 이를 통해 게임별 소스 revision과 빌드 artifact에 UI 코드가 함께 포함된다. `qa/roblox-rpg-menu.test.mjs`가 원본과 소비 복제본의 일치를 확인한다. 원본 수정 시 복제본도 같이 갱신한다.

설치: `RPGMenu.install(config, screenGui, player, options)`. 게임별 연결은 `canOpen`, `onOpen`, `trackQuest`, `changeRoom`, `toggleTips`, `sounds`로 전달한다. 다른 RPG에 적용할 때 실제 보유·진행 스키마에 맞춰 모델을 연결한다. 없는 아이템이나 임의 보상을 생성하지 않는다. 커스텀 장비는 기존 서버 장착 상태를 읽고, Roblox Tool만 Humanoid의 기본 장착/해제 경로를 사용한다.

작은 가로 화면은 메뉴 내용을 스크롤하고, 세로 화면은 아이템 목록 아래에 상세 정보를 배치한다. 터치 버튼은 52px이다. B/게임패드 Y로 열고, 닫기/Esc/게임패드 B로 돌아간다. 채팅 입력 중에는 단축키를 가로채지 않는다. 메뉴가 열려도 세계는 정지하지 않는다.

상태: 소스 구현. Studio의 실제 메뉴 조작·가로/세로 화면 검증 전에는 production verified로 승격하지 않는다. Piggy: Intercity는 사용자가 제시한 품질 참고이며, 제공된 사진은 게임 소개 화면이므로 내부 UI의 동일성은 아직 확인하지 못했다.
