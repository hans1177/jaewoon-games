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

## 다음 작업자 인수인계 기준

이 팩과 회사 공용 내부자산 작업은 아래 기준으로 계속한다.

### 내부자산 사용

- 내부자산은 **점수가 낮아도 사용 가능**하다.
- 내부점수는 사용 허가/차단 점수가 아니라 **비교·개선·자동교체 우선순위**다.
- 호환되는 자산이 하나뿐이면 낮은 점수라도 현재 자산을 사용하면서 개선한다.
- 호환되는 더 높은 점수 자산이 생기면 **게임 정체성·역할·플랫폼 호환성을 먼저 확인한 뒤 높은 점수 자산을 자동교체 우선후보로 둔다.**
- 점수가 낮다는 이유만으로 기존 자산을 삭제하거나 게임을 빈 자산 상태로 만들지 않는다.
- 수동 고정, 게임 전용 고정, 정체성 잠금이 있으면 자동교체보다 우선한다.

### Studio 관계

- Roblox Studio는 **내부자산 사용에 필수 아님**.
- Roblox Studio는 **내부 품질점수 산정에 필수 아님**.
- Roblox Studio는 **높은 점수 자산 자동교체 판단에 필수 아님**.
- 내부 감사는 소스, 구조, 시각 설계, 상태 다양성, 접근성, 모바일 가독성, 재사용성, 유지보수성 등의 내부 증거로 수행한다.
- Studio/native runtime 검증은 productionVerified / verifiedCompanyReusable 같은 **실제 런타임 승격 증거와 분리**한다.
- Studio가 없다고 내부자산 제작·사용·개선·교체를 멈추지 않는다.

### 반복 개선

- 기존자산과 회사 공통자산을 새 자산보다 먼저 확인한다.
- 현재 자산을 사용하면서 품질 부채를 계속 줄인다.
- PASS는 종료가 아니다.
- 880 → 920 → 950 → 980 → 1000 순으로 계속 개선한다.
- 같은 역할에서 더 좋은 호환 자산이 나오면 높은 점수 쪽으로 자연스럽게 교체한다.
- 이전 자산은 즉시 삭제하지 않고 계보/비교/복구 증거를 보존한다.

### AI·NPC 상호작용

AI 도우미와 NPC는 같은 수준의 공통 상호작용 품질을 갖춘다.

- 대화 진입 아이콘/프롬프트
- 초상화·이름·역할·감정/상태
- 본문·선택지·직접 입력
- 타이핑/대기/오류/응답불가 상태
- 대화 기록
- 퀘스트/의뢰
- 거래
- 아이템 전달
- 조사
- 동행/파티
- 제작/서비스
- 관계/호감/적대/공포/빚 표시
- 잠김/조건 미충족/비활성 상태
- 모바일 터치·키보드/마우스·게임패드 표시 상태

UI는 표현만 담당한다. 실제 대화 진실성, 퀘스트 진행, 보상, 아이템, 재화, 관계값, 저장, 네트워크 권한은 기존 게임 코드가 소유한다.

### 작업 범위

- 이 작업은 **내부자산 품질·공통자산·자산 감사** 범위다.
- 플로우, 스케줄러, 큐, 워크플로우, 배포 인프라를 수정하지 않는다.
- 새 wrapper, shadow pipeline, 별도 자산 파이프라인을 만들지 않는다.
- 기존 `assets/vibe-studio-asset-universe.js`, `company-asset-library.json`, 기존 공통자산 팩 구조를 그대로 사용한다.

## 보호 원칙

- 게임별 theme만 바꿔 재사용
- 모바일 터치 우선
- 키보드/마우스/게임패드 선택 상태 지원
- 색상만으로 상태를 구분하지 않음
- 게임 규칙, HP, 데미지, 인벤토리, 장착, 퀘스트, 보상, 재화, 저장, Remote 권한 없음
