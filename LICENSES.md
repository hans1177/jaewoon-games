# 외부 코드/에셋 라이선스 기록

외부 무료 코드와 에셋을 추가할 때 아래 형식으로 기록합니다.

```text
이름:
종류: 이미지 / UI / 3D / 텍스처 / 음악 / 효과음 / 폰트 / 코드
제작자:
출처 사이트:
원본 페이지:
라이선스:
상업적 사용: 가능 / 불가 / 확인 필요
저작자 표시: 필요 / 불필요
수정 여부:
다운로드/라이선스 확인 날짜:
사용 위치 또는 게임:
비고:
```

## 게임 에셋 기본 강제 원칙 — CC0 원본 수정 사용 (2026-10-20)

최신 `main:company-learning/platform-release-roadmap.json#ownerCanonicalRules.rule5`가 권한 원본이다. **모든 신규 GPT·Vibe·게임 개발 작업은 CC0 / CC0-1.0 / CC0 1.0 Universal 권리 확인된 원본을 해당 게임에 맞게 수정**해야 한다. 과거의 “CC0 우선”, “CC-BY 허용”, “자체 제작으로 대체”는 현행 신규 게임 에셋 제작 허가가 아니다.

- 사용 전 라이선스와 원본 파일을 실제 검증하고 **원본 페이지 URL, 확인일, 원본 SHA-256, 파생본 SHA-256, 수정 이력과 게임 바인딩**을 남긴다.
- 원본이 없다면 검증 가능한 CC0 원본을 먼저 확보한다. 자체 만든 낮은 품질의 모델/메시/이미지/음원 또는 AI 생성물로 빈자리를 채우지 않는다.
- 교체한 저품질 자체 제작 에셋은 **활성 게임의 CC0 교체·회귀/저장/모바일 테스트·전체 소비자 확인** 후 필요한 비활성 소비자가 없을 때 파일과 라이브러리 등록을 **영구 삭제**한다. 재도입 금지. 비활성 게임과 그 게임에서 쓰는 공유 에셋 원본은 보존한다.
- 개발하지 않는 게임은 변경하지 않으며, 본문 아래의 이전 라이선스 기록은 **과거 출처 기록이지 현재 신규 게임 에셋 사용 승인 목록이 아니다.**
- 서드파티 **프로그램 코드** 의존성의 MIT / BSD / Apache-2.0 등 라이선스 검증과 기록은 별도로 유지한다. CC0 강제는 게임 표현 에셋에 적용한다.
- 새 GPT 대화 또는 Vibe 작업 시작 시 최신 중앙헌법과 `AGENTS.md`를 우선 확인한다. 저장소와 연결되지 않은 일반 ChatGPT 채팅에서 자동 조회된다고 주장하지 않는다.

## 승인된 검색 소스

- Kenney
- Poly Haven
- ambientCG
- Pixabay
- Mixkit
- OpenGameArt
- Freesound
- itch.io Game Assets
- Free Music Archive

승인된 소스라는 이유만으로 모든 파일을 자동 허용하지 않습니다. 실제 사용 전 각 에셋/트랙의 원본 페이지에서 라이선스를 확인하고 이 문서에 기록합니다.

## 바이브코딩 기록 규칙

1. 외부 에셋을 게임에 추가한 같은 작업에서 라이선스 기록도 같이 추가합니다.
2. CC0라도 출처와 원본 페이지를 기록합니다.
3. 이전 CC-BY 기록은 이력·권리 확인용으로 보존하되, 신규 게임 에셋으로 채택하지 않습니다.
4. 음악/효과음은 트랙 또는 사운드 단위로 기록합니다.
5. 라이선스 조건이 바뀔 수 있는 사이트는 다운로드 당시 확인 날짜를 반드시 남깁니다.
6. NC, ND 등 게임 배포/수정 방식과 충돌할 수 있는 조건은 기본 사용하지 않습니다.

## 현재 기록

### AI Pixel Snapped Game Sprites

이름: AI Pixel Snapped Game Sprites
종류: 이미지 / 애니메이션 스프라이트시트
제작자: Chong-U Lim
출처 사이트: GitHub
원본 페이지: https://github.com/chongdashu/ai-pixel-snapped-game-sprites
라이선스: MIT
상업적 사용: 가능
저작자 표시: 라이선스 고지 유지 필요
수정 여부: 런타임 프레임 분할만 수행
다운로드/라이선스 확인 날짜: 2026-09-08
사용 위치 또는 게임: unity-games/animation-test, unity-games/daechung-rpg
비고: Pirate/Skeleton의 idle, walk, attack, hurt, death 애니메이션을 원본 raw 스프라이트시트와 manifest.json에서 런타임 로드. 대충 RPG 초안은 최초 다운로드 후 기기 persistentDataPath 캐시에 저장하여 재사용.

### Kenney UI Pack

이름: UI Pack
종류: UI / UX / 버튼 / 패널 / 슬라이더 / 슬롯
제작자: Kenney
출처 사이트: Kenney
원본 페이지: https://kenney.nl/assets/ui-pack
라이선스: Creative Commons CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 Web + Unity UI 후보
비고: 430개 파일. 메뉴, 설정창, 팝업, 버튼, 슬롯 프레임, 게이지 배경용 세트.

### Kenney UI Pack RPG Expansion

이름: UI Pack (RPG Expansion)
종류: UI / UX / RPG 패널 / 버튼 / 슬라이더
제작자: Kenney
출처 사이트: Kenney
원본 페이지: https://kenney.nl/assets/ui-pack-rpg-expansion
라이선스: Creative Commons CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 Web + Unity RPG UI 후보
비고: 85개 파일. 캐릭터창, 스킬창, 장비창, 인벤토리, 상태 패널용.

### Kenney UI Pack Adventure

이름: UI Pack - Adventure
종류: UI / UX / 버튼 / 패널 / HUD
제작자: Kenney
출처 사이트: Kenney
원본 페이지: https://kenney.nl/assets/ui-pack-adventure
라이선스: Creative Commons CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 Web + Unity 판타지/어드벤처 UI 후보
비고: 130개 파일. 판타지 HUD, 퀘스트창, 상점창, 선택창, 모바일 메뉴용.

### Kenney UI Pack Pixel Adventure

이름: UI Pack - Pixel Adventure
종류: UI / UX / 픽셀 UI / 버튼 / 패널 / 슬롯
제작자: Kenney
출처 사이트: Kenney
원본 페이지: https://kenney.nl/assets/ui-pack-pixel-adventure
라이선스: Creative Commons CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 Web + Unity 픽셀 UI 후보
비고: 500개 파일. 픽셀 RPG, 스킬바, 퀵슬롯, 인벤토리, 게이지용.

### Kenney Game Icons

이름: Game Icons
종류: UI / 아이콘 / 입력 프롬프트
제작자: Kenney
출처 사이트: Kenney
원본 페이지: https://kenney.nl/assets/game-icons
라이선스: Creative Commons CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 Web + Unity UX 후보
비고: 105개 파일. 조작 안내, 버튼 아이콘, 튜토리얼, 상호작용 표시용.

### Kenney UI Audio

이름: UI Audio
종류: 효과음 / UI / UX
제작자: Kenney
출처 사이트: Kenney
원본 페이지: https://kenney.nl/assets/ui-audio
라이선스: Creative Commons CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 Web + Unity UI 효과음 후보
비고: 50개 파일. 클릭, 선택, 스위치, 탭 전환용.

### RPG Inventory / Character Sheet

이름: RPG Inventory
종류: UI / 캐릭터창 / 인벤토리 / 장비창 / 슬롯
제작자: itsmars
출처 사이트: OpenGameArt
원본 페이지: https://opengameart.org/content/rpg-inventory
라이선스: CC0 / Public Domain
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 Web + Unity RPG UI 후보
비고: 캐릭터 시트와 인벤토리 세트. BlankSlot 및 희귀도 테두리 세트도 제공.

### RPG UI Icons

이름: RPG UI Icons
종류: UI / 스킬 / 상태이상 / 속성 / 아이템 / 장비 아이콘
제작자: OwlishMedia
출처 사이트: OpenGameArt
원본 페이지: https://opengameart.org/content/rpg-ui-icons
라이선스: CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 Web + Unity RPG 아이콘 후보
비고: 16x16, 32x32. 스킬 슬롯, 버프/디버프, 속성, 무기, 방어구, 아이템 분류용.

### Tiny RPG Dragon Regalia GUI

이름: Tiny RPG - Dragon Regalia GUI
종류: UI / UX / RPG / 버튼 / 장비 프레임 / 게이지 / 미니맵 / 초상화 / 슬롯
제작자: tiopalada
출처 사이트: OpenGameArt
원본 페이지: https://opengameart.org/content/tiny-rpg-dragon-regalia-gui
라이선스: CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 Web + Unity RPG UI 후보
비고: 버튼 상태, 장비 프레임, 9-slice 프레임, HP/MP/EXP 바, 미니맵, 초상화, 아이템 슬롯, 커서가 한 세트에 포함.

### Fantasy RPG Icons

이름: Fantasy RPG Icons
종류: 스킬 / 마법 / 무기 / 방어구 / 아이템 / 재화 아이콘
제작자: Drummyfish
출처 사이트: OpenGameArt
원본 페이지: https://opengameart.org/content/fantasy-rpg-icons-0
라이선스: CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 Web + Unity 판타지 스킬/아이템 아이콘 후보
비고: 32개, 128x128. 스킬, 주문, 장비, 물약, 가방, 골드 등 고해상도 아이콘 세트.

### Kenney Mobile Controls

이름: Mobile Controls
종류: UI / UX / 모바일 조작 / 조이스틱 / 버튼 / HUD / 터치 아이콘
제작자: Kenney
출처 사이트: Kenney / OpenGameArt 미러 확인
원본 페이지: https://kenney.nl/assets/mobile-controls
라이선스: Creative Commons CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 모바일 Web + Unity UI 후보
비고: 45개 조작 스프라이트를 8가지 스타일로 제공하고 두 크기 PNG, SVG, 스프라이트시트, 하이라이트, 40개 아이콘을 포함해 총 900개 파일로 제공되는 모바일 전용 세트.

### Kenney Particle Pack

이름: Particle Pack
종류: VFX / 파티클 / 스킬 효과
제작자: Kenney
출처 사이트: Kenney
원본 페이지: https://kenney.nl/assets/particle-pack
라이선스: Creative Commons CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 모바일 Web + Unity VFX 후보
비고: 512x512 기반 80개 파일. 스킬 발동, 타격, 폭발, 마법, 버프/디버프, 레벨업 효과용.

### Kenney Interface Sounds

이름: Interface Sounds
종류: 효과음 / UI / UX
제작자: Kenney
출처 사이트: Kenney
원본 페이지: https://kenney.nl/assets/interface-sounds
라이선스: Creative Commons CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 모바일 Web + Unity UI 효과음 후보
비고: 100개 파일. 터치 버튼, 확인/취소, 창 전환, 인벤토리/스킬 선택 등 모바일 인터페이스 효과음 보강용.

### Powers Icons

이름: Powers Icons
종류: UI / 스킬 / 특수 능력 아이콘
제작자: Clint Bellanger
출처 사이트: OpenGameArt
원본 페이지: https://opengameart.org/node/3229
라이선스: CC0
상업적 사용: 가능
저작자 표시: 불필요
수정 여부: 미사용 원본 후보
다운로드/라이선스 확인 날짜: 2026-09-09
사용 위치 또는 게임: 공용 모바일 Web + Unity 스킬 UI 후보
비고: 특수 능력과 액티브 스킬용 아이콘 세트. 모바일 큰 스킬 버튼과 스킬 선택창 후보로 사용.

## World ghost mesh preview

- Three.js 0.186.1: MIT, Copyright © 2010–2026 three.js authors.
- Source: https://github.com/mrdoob/three
- Included modules and license: `assets/roblox/world-ghosts/native/mesh/three/`.
- The bride mesh, skin weights, animations and silk texture are original project artwork; no external character models are included.

### Kenney Pirate Kit — Ocean Voyage (CC0)

이름: Kenney Pirate Kit (converted GLB, embedded textures)
종류: 3D 선박 / 항구 / 환경 / 대포
제작자: Kenney; GLB 변환: Hidencod/Tiny Game Engine
출처 사이트: Kenney, GitHub
원본 페이지: https://kenney.nl/assets/pirate-kit
재배포 저장소: https://github.com/Hidencod/tge-assets/tree/main/packs/pirate-kit
라이선스 원문: https://github.com/Hidencod/tge-assets/blob/main/LICENSE
라이선스: CC0-1.0
상업적 사용: 가능
저작자 표시: 불필요 (제작자 존중 표기)
수정 여부: 원본 GLB를 수정 없이 보존
다운로드/라이선스 확인 날짜: 2026-10-20
사용 위치 또는 게임: web-games/ocean-voyage/assets (11개 모델)
비고: 선박·항구·대포 모델은 원본 Kenney 3D 모델로, GLB 텍스처 내장판을 사용. 웹 렌더링·모바일·배포 검증은 별도 증거 필요.
