# RPG 메뉴 내부 코드 자산

`RPGMenu.luau`는 배낭 검색·분류·상세 보기, 실제 Tool 장착/해제, 장비·퀘스트·파티·설정 화면을 제공한다. `RPGMenuModel.luau`는 서버가 복제한 진행 상태를 표시용 데이터로 변환한다.

현재 실제 소비 게임은 `daechung-rpg`다. 이 게임의 `shared/` 두 모듈과 공용 원본은 byte-identical 상태를 유지한다. 소비 게임에서 검증·개선된 파티/동료 표시와 배낭 슬롯 갱신을 공용 원본으로 되돌려 이후 재사용 시 낡은 복제본을 만들지 않는다.

배낭 목록은 상태 갱신 때 기존 슬롯 버튼을 재사용해 터치·게임패드 선택이 끊기지 않게 하고, 필터로 선택 대상이 사라지면 안전한 선택 대상으로 복구한다. 파티 화면은 현재 편성 수, 동료 슬롯, 보스 동료 해금 수, 멀티 코드, 사냥·기여 상태를 표시하고 해금 동료의 역할·포탈·기본 행동·스킬 정보를 읽기 전용으로 보여 준다.

설치: `RPGMenu.install(config, screenGui, player, options)`. 게임별 연결은 `canOpen`, `onOpen`, `trackQuest`, `changeRoom`, `toggleTips`, `sounds`로 전달한다. 다른 RPG에 적용할 때 실제 보유·진행 스키마에 맞춰 모델을 연결한다. 없는 아이템이나 임의 보상을 생성하지 않는다. 커스텀 장비는 기존 서버 장착 상태를 읽고, Roblox Tool만 Humanoid의 기본 장착/해제 경로를 사용한다.

작은 가로 화면은 메뉴 내용을 스크롤하고, 세로 화면은 아이템 목록 아래에 상세 정보를 배치한다. 터치 버튼은 52px이다. B/게임패드 Y로 열고, 닫기/Esc/게임패드 B로 돌아간다. 채팅 입력 중에는 단축키를 가로채지 않는다. 메뉴가 열려도 세계는 정지하지 않는다.

상태: 실제 Luau 소스 구현 + 현재 소비본 parity 복구. Roblox Studio의 실제 메뉴 조작·가로/세로 화면 검증 전에는 `productionVerified`, `verifiedCompanyReusable`, runtime PASS로 승격하지 않는다.
