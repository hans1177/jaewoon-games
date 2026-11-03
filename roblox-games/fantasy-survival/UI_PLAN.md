# 마력숲 · 캐릭터·인벤토리·전체 메뉴 UI 개선 계획

- 대상: `fantasy-survival` Roblox 게임의 기존 **캐릭터 / 인벤토리 / 활동 / 저널 / 옵션 / 도우미 / 동료 / 스킬** 화면.
- 적용 범위: 기존 `client/Game.client.luau`의 메뉴 렌더, 기존 게임 복제본 `shared/RobloxCommonUI.luau#AdaptActionMenu`, 관련 회귀 검사.
- 기준: 2026-11-03 사용자 UI 전면 개선 요청. **시각적 재구성만** 수행하며 서버 판정·장비 ID·저장 키·숙련도·보상·스킬 밸런스는 그대로 둔다.
- 진행: 설계 → 현재 책임 소스 직접 수정 → `main` 병합 → 기존 Roblox source-drift-sync/F0~F9/전용 Place 게시 → **동일 게시본 후검증**. 검증이 안 되면 미검증으로 보고한다.

## 외부 게임 UI에서 차용할 원칙

1. **디아블로 4**: 왼쪽 인물·요약 능력치, 인물 주변 장비 슬롯, 분류된 가방과 선택 항목의 상세 정보. 동작·색·이미지는 복사하지 않는다. <https://gamedevartisan.com/game-design/feature-study-d4-inventory>
2. **월드 오브 워크래프트: 용군단**: 중요 정보와 탐색을 먼저 보여주고 불필요한 중복 HUD를 줄이는 방향. <https://news.blizzard.com/en-gb/article/23841481/world-of-warcraft-dragonflight-hud-and-ui-revamp>
3. **원신**: 선택 항목 상세 정보와 대표 캐릭터가 읽기 좋은 크기로 분리된 계층 구조. <https://www.hoyodex.com/wiki/genshin-impact/character-menu>

**마력숲 고유 방향**: 검은 판금 UI 모사가 아니라 짙은 청록·숲의 먹색·은은한 금색의 **마력 탐험 수첩**. 이미 등록된 아이콘 아틀라스와 실제 Roblox 아바타 ViewportFrame만 재사용한다.

## 화면 명세

| 화면 | 실제 변경 | 보존 |
| --- | --- | --- |
| 전체 메뉴 | 공통 제목·보조 설명·가로 스와이프 탭, 탭 선택 대비, 간격·판넬 그림자, 작은 기기 자동 배치 | 기존 8개 메뉴·열기/닫기·ESC/단축키·터치 |
| 캐릭터 | 주인공 3D 미리보기 강조, 이름/능력 요약, 6개 장비 카드, 숙련 진행 바, 공간의 계층 | 아바타·착용 장비 복제, 6슬롯 ID, 서버 속성, 실제 숙련 |
| 인벤토리 | 분류→검색→아이템 격자→상세/버튼 순서, 가방 상태, 선택 카드 시각 강조, 단일 버튼 폭 확대 | 검색·분류·서버 보유 상태·실제 장착/해제/제작/사용 |
| 나머지 메뉴 | 동일한 여백·폰트·청록/금색 색조를 공통 패널에 적용 | 저널/스킬/동료/옵션/도우미 기능 |

## 모바일·접근성 규칙

- 화면 최소 높이 360에서도 제목, 메뉴 탭, 닫기 버튼이 겹치지 않도록 배치. 작은 높이는 스크롤.
- 가로 스와이프 가능한 메뉴·인벤토리 분류 탭 유지. 버튼 높이 **48 이상**, 주요 행동 52 기준.
- 캐릭터 미리보기는 비율에 따라 가로형·세로형 전환. 아이템 격자는 너비에 따라 2~6열.
- 선택은 **테두리 굵기와 배경 대비**로 동시에 표시하며 색만으로 판단하지 않게 한다.
- 메뉴를 연 동안 전투 버튼을 가리거나 원격 주문을 임의 발생시키지 않는다.
- 이미 획득한 보유 아이템과 제작 가능한 미보유 장비를 **명확히 구분**한다.

## 실제 코드 구현 기준 · 2026-11-03 재구현

이 항목은 디자인 제안이 아니라 기존 Luau 책임 함수에 직접 연결할 구현 계약이야. 실제 Roblox Place 게시나 모바일 런타임 검증을 대신하지 않아.

| 구역 | 확정된 동작 | 검증 위치 |
| --- | --- | --- |
| 캐릭터 전신 | 원래 플레이어 R15 및 실제 Tool을 복제하는 `NativeAvatarPreview`를 유지하고, ViewportFrame의 종횡비·시야각에 맞게 카메라를 다시 맞춰 머리/발 잘림 방지 | `redrawNativeAvatar`, `layoutNativeAvatar` |
| 전투 상태 | 휴머노이드 Health/MaxHealth와 기존 `MeadowStamina` 속성으로 체력·기력 게이지, 실제 장비 공격·방어·강화·보스 기록 표시 | `renderWitcherCharacter` |
| 숙련 정보 | 기존 `Config.Proficiencies` 7개를 개별 카드로 나누고 서버 속성 숫자만 표시. 숙련 보상 50:1 규칙 유지 | `renderMeadowPages`, `MeadowProficiencyCards` |
| 소지품 세로 화면 | 검색·기존 분류 탭 아래에 3열 중심의 아이템 격자를 표시하고, 선택하면 아래 상세/장착/제작 버튼 위치로 스크롤 | `layoutGrid`, `layoutInventoryWorkspace` |
| 소지품 가로 화면 | 폭 620 이상이면 격자 전용 스크롤과 오른쪽 고정 상세창으로 분리. 작은 높이에서는 전체 페이지 스크롤로 하단 버튼 접근 | `MeadowInventoryWorkspace`, `MeadowInventoryItemScroll` |
| 항목 선택 | 기존 8개 분류에 **보유** 필터 추가, 보유·미보유 제작법 구분, 선택 슬롯 강조와 분류 탭의 실제 선택 표시. 장착·해제·물약 사용·제작 명령은 기존 서버 경로 유지 | `redrawSelection`, `renderInventory` |
| 긴 설명 | 조합 비용·설명·서버 반환 메시지가 136픽셀 표시 영역에서 사라지지 않도록 내부 텍스트 스크롤 | `SelectedItemDescriptionScroll` |
| 전체 메뉴 | 기존 8개 페이지 유지. 세로 가로 스와이프 탭, 선택 탭 자동 중앙 정렬, 화면별 부제목, 짧은 화면 헤더 축소, 게임패드 B/닫기 | `RobloxCommonUI.AdaptActionMenu` |

### UI 완성 판정

1. 기본 화면과 메뉴를 연 상태에서 실제 아바타 머리·다리가 모두 보여야 해.
2. 휴대전화 세로(360×640, 390×844)에서 검색, 카드 선택, 상세, 장착/제작/사용에 터치로 도달해야 해.
3. 가로(844×390)에서 항목 격자와 상세창이 동시에 보여야 하고, 양쪽 스크롤·닫기 버튼이 잘리지 않아야 해.
4. 화면 비율 변경 시 실제 6종 장비 칸과 7개 숙련도 카드가 내용과 겹치지 않아야 해.
5. 장비·소모품·연구 기록·재화 수량 및 저장 재접속 결과는 변경 전 서버 상태와 일치해야 해.
6. 소스 검사는 `qa/fantasy-survival-roblox-ui.test.mjs` 및 `qa/company-development-roblox-package.test.mjs`에서 실제 변경 구조를 검증해. 다만 이 검사만으로 Roblox 런타임 성공을 선언하지 않아.

## 변경·검증 기준

- 책임 원본: `client/Game.client.luau`의 `renderWitcherCharacter`, `renderWitcherInventory`, `renderMeadowPages` 및 메뉴 연결부, `shared/RobloxCommonUI.luau#AdaptActionMenu` 직접 수정.
- 비변경: `server/Game.server.luau`, `GameConfig.MeadowEquipment`, `MeadowConsumables`, DataStore 저장 형식, 원격 명령 문자열.
- 정적 회귀: `qa/fantasy-survival-roblox-ui.test.mjs`에 메뉴 여덟 탭·선택/검색·상세 하단·모바일 대응·기존 장착/제작 명령 및 아바타 검증 추가.
- 실제 게시 후 검증 장면: 360×640 / 390×844 / 844×390 / 1280×720에서 메뉴 열기, 캐릭터 미리보기, 장비 여섯 칸, 분류/검색/스크롤, 슬롯 선택→상세→장착/제작/사용, 닫기·재열기, 저장/재접속, 터치·조이스틱, 오류·화면 잘림·프레임.
- 실제 런타임·모바일 조작·배포 증거가 없으면 **통과나 완료로 표기하지 않는다**.
