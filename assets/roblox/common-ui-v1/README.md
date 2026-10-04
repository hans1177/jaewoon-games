# Roblox Common UI v3

회사 공용 Roblox UI·AI/NPC 상호작용 베이스. 게임 로직을 소유하지 않고 표시·레이아웃·상태 피드백만 제공한다.

## 공통 화면군

- 기본: FRAME_PANEL, BUTTON_PRIMARY, ICON_BUTTON, TAB_BUTTON, MODAL, TOOLTIP
- HUD: BAR_HEALTH, BAR_PROGRESS, CURRENCY_CHIP, MOBILE_ACTION_BUTTON, HOTBAR, STATUS_EFFECT_CHIP, NOTIFICATION_TOAST
- 인벤토리/장비: INVENTORY_SLOT, INVENTORY_GRID, EQUIPMENT_SLOT
- 캐릭터: CHARACTER_SHEET
- 월드: MINIMAP, NPC_INTERACTION_PROMPT
- 퀘스트/파티: QUEST_CARD, QUEST_TRACKER, PARTY_MEMBER_CARD
- 제작/상점: CRAFTING_RECIPE_CARD, SHOP_ITEM_CARD
- AI/NPC 대화: DIALOGUE_ASSISTANT_BUTTON, DIALOGUE_PANEL, DIALOGUE_CHOICE, DIALOGUE_INPUT, TYPING_INDICATOR, DIALOGUE_HISTORY
- NPC 관계/행동: NPC_INTERACTION_MENU, NPC_RELATIONSHIP_CARD

총 32종.

## 공용 벡터 아이콘

외부 이미지 ID 없이 `RobloxCommonIcons.luau`에서 생성한다.

- CHAT
- AI_SPARK
- INVENTORY
- CHARACTER
- EQUIPMENT
- MINIMAP
- QUEST
- PARTY
- CRAFT
- SHOP
- NOTIFICATION
- SETTINGS

색상과 배경색을 게임 테마에 맞게 바꿀 수 있고, 아이콘 자체는 게임 권한을 소유하지 않는다.

## AI 대화 기준

대화 도우미는 단일 아이콘으로 끝내지 않는다.

- 사용 가능/바쁨/비활성 상태
- 초상화·이름·역할·본문 계층
- 선택지/잠김/비활성 상태
- 직접 입력/전송
- 타이핑 표시
- 대화 기록
- 로딩/오류/응답 불가 표현

UI는 대화 전송, 사실성, 게임 행동 권한을 소유하지 않는다.

## NPC 상호작용 기준

NPC도 AI 대화와 같은 수준으로 공통화한다.

- 거리/키 입력 프롬프트
- 대화
- 퀘스트/의뢰
- 거래
- 아이템 전달
- 조사
- 동행/파티
- 제작/서비스
- 관계·호감·적대·공포·빚 등 표시
- 잠김/조건 미충족/비활성 상태

퀘스트 진행, 보상, 아이템, 재화, 관계값, 네트워크 권한은 게임 코드가 소유한다.

## 내부 품질감사

Studio 없이 수행하는 내부 자산 감사 기준을 사용한다.

- 만점: 1000
- 내부 PASS: 880
- HERO: 920
- ELITE: 950
- MASTERPIECE: 980

점수만 높아서는 통과하지 않는다. UI_UX_SYSTEM, ACCESSIBILITY_INPUT, FEEDBACK_STATES, VARIATION_BREADTH, READABILITY_SCALE, STYLE_COHERENCE 등 핵심축 하드게이트를 모두 넘어야 한다.

PASS 후에도 920 → 950 → 980 → 1000으로 반복 개선한다.

Studio/native runtime 검증은 내부 품질점수와 별개이며 productionVerified/verifiedCompanyReusable 승격 증거에만 사용한다.

## 보호 원칙

- 게임별 theme만 바꿔 재사용
- 모바일 터치 우선
- 키보드/마우스/게임패드 선택 상태 지원
- 색상만으로 상태를 구분하지 않음
- 게임 규칙, HP, 데미지, 인벤토리, 장착, 퀘스트, 보상, 재화, 저장, Remote 권한 없음
