# 저장소 작업 지침

이 저장소에서 작업하는 모든 GPT·코딩 에이전트는 작업 전에 최신 main의 다음 중앙문서를 읽어야 한다.

- company-learning/platform-release-roadmap.json
  - **주의:** 이 파일은 1MB 초과라 GitHub Contents API·일부 커넥터에서 내용이 "비어 있음(encoding:none)"으로 보인다. 비어 있는 것이 아니다. 작은 요약본 `company-learning/platform-release-roadmap.brief.json`을 먼저 읽고, 전체는 raw URL(raw.githubusercontent.com/hans1177/jaewoon-games/main/company-learning/platform-release-roadmap.json)이나 git clone으로 읽는다. "중앙 배포 정책이 비어 있어 검증 불가"로 멈추지 않는다.
- company-learning/company-log-map.json
- company-learning/company-architecture-map.json
- company-learning/security-immune-system.json

## 오너 전역 게임 제작 필수 규칙: 파츠·원형·임의 생성물 금지

**이 규칙은 오너와 진행하는 모든 게임 제작, 후속 한방패치, Roblox Luau, F0~F9 자동개발, 에셋 모듈 제작, 웹/Unity 게임 및 이 저장소를 사용하는 모든 GPT·코딩 에이전트에 공통 적용한다.** 다른 GPT나 자동작업도 착수 전에 이 항목을 확인해야 한다.

- **기본 파츠 외형 금지:** `Part`, `Ball`, `Cylinder`, `WedgePart` 등 도형 조립·원형 파츠·기본 도형을 캐릭터/건물/나무/아이템/장식 모델로 사용하는 것을 금지한다. 이름만 MeshPart로 바꾼 단순 형태, 단순 구체·상자 덩어리로 보이는 대체 모델도 금지한다.
- **GPT 임의 제작물·임의 대체 금지:** 사용자가 정하지 않은 몬스터, 구조물, 캐릭터, 무기, 임시 모델 또는 임의 외형·임의 자산 선택을 추가하지 않는다. 없는 모델을 대충 비슷한 원형/상자/생물로 때우거나 무관한 종으로 바꾸지 않는다. **별도 승인이 없는 절차형 GLB 자동 생성, trimesh/Blender 도형 합성, AI 임의 모델 제작으로 위 금지를 우회하지 않는다.**
- **에셋 출처 우선:** 실제 제작 완료된 고품질 모델·모듈 중 사용자가 승인한 것, 게임에 적합하고 라이선스/CC0 원본·해시·Roblox Universe 개별 사용 권한이 확인된 것만 사용한다. 카탈로그의 설계상 이름이나 `productionVerified:false`는 사용 가능한 모델이라는 증거가 아니다.
- **제작 정지 조건:** 해당 역할/종류와 맞는 승인된 실제 모델이 없으면 자동 파츠·임의 모델을 생성하거나 기존 게임에 배포하지 말고 정확한 부족 자산을 기록한다. 게시 성공·라이선스 검증·실물 모델 적용 성공을 지어내지 않는다.
- **기존 게임 보호:** 이미 운영 중인 다른 게임/저장 키/경제/배포 대상은 요청 없이 수정하지 않는다. 과거 코드의 파츠가 존재한다는 이유로 신규 파츠를 더 만들거나 잘못된 대체 모델로 교체하지 않는다.
- **실행 규칙:** 게임 생성기·공용 모듈 선택기·디자인 프롬프트·실제 Luau 책임 코드·게시 워크플로 모두 이 규칙을 우선한다. 최신 사용자가 명확하게 예외를 허용한 **특정 요소** 외에는 금지 상태를 유지한다.
- **공유 범위:** 이 지침은 GitHub 공용 main에서 읽는 에이전트에게 전달되는 작업 규칙이다. 별도 채팅의 GPT가 저장소를 읽지 않았다면 자동으로 숙지했다고 주장하지 않는다.

## 카드배틀·지식카드 원화 작업 필독 (mare-essentia)

**이 저장소에서 `mare-essentia` 카드배틀 신규 원화 제작·변경·승인·Roblox 자산등록·후속 “계속” 작업을 수행하는 모든 GPT/Claude/코딩 에이전트는 작업 전에 다음 문서를 모두 필수로 읽고, 최신 `main`과 대조해야 한다.** 중앙정책 4종 선로드가 먼저이며 충돌 시 중앙정책이 우선한다.

1. `roblox-games/mare-essentia/docs/CARD_ART_PROMPTS.md` — 대륙 전투카드·지식카드·지도자 화풍과 규격.
2. `roblox-games/mare-essentia/docs/CARD_BATTLE_HANDOFF.md` — **2026-11-22 오너 지시, 동적인 회화 원화 품질, 이전 실제 등록·미등록 이력(항상 최신 main 재조회), 검수·승인·GitHub/Roblox 기존 등록 경로, 실패 사례, 후속 우선순위.**
3. `roblox-games/mare-essentia/docs/ASSET_MANAGEMENT.md` — **256색(팔레트·감색) 원화·UI 자산 등록 절대 금지**, 등록 경로·규격·관리 체크리스트.

대륙 전투카드는 **사진·도감풍 정지 장면이 아니라 역동적인 세로 7:10 컬러 회화 원화**다. PNG 없는 승인·이미지 생성 대시보드의 가짜 번호·검증되지 않은 Studio/게시 결과는 등록 증거로 인정하지 않는다. 새로운 워크플로·유료 API 없이 기존 canonical 등록기를 사용하고, 게임 규칙·저장 구조를 보존한다. 문서를 읽지 못한 작업자는 읽었다고 주장하거나 등록 완료를 보고하지 않는다. (2D 원화 절차이며 3D 모델 금지 규칙을 우회하는 예외가 아니다.)

## 비주얼·마을·전투·배·주민 작업 필독 (mare-essentia)

**모든 외부 AI·바이브코딩 도구 포함: 먼저 `roblox-games/mare-essentia/docs/READ_FIRST.md`(전체 지시서 목록·HUD 효과 규칙)를 읽는다. 거기 적힌 지시서는 모두 필독이다. 원화·UI 자산은 256색 등록 절대 금지(`docs/ASSET_MANAGEMENT.md`).**

**`mare-essentia`의 마을·건물·항구 배치, 해전·지상전 배경, 배, 주민(NPC) 외형·모션, 카드배틀, 아이콘·HUD, 원화를 만들거나 바꾸는 모든 GPT/Claude/코딩 에이전트는 작업 전에 아래를 반드시 읽는다.** 읽지 않았으면 읽었다고 주장하지 않는다. 중앙정책·위 전역 금지 규칙이 우선한다.

1. `roblox-games/mare-essentia/docs/RULES.md` — 에셋 출처·원본 가공 허용·오너 제작 원화·코드 한도(Game.client 최상위 local 금지)
2. `roblox-games/mare-essentia/docs/PORT_VILLAGE_PROMPTS.md` + `docs/ports/<항구>.md` — 항구 테마·왕궁·발전도별 건물·건축 시뮬·구획·주민 동선·날씨
3. `roblox-games/mare-essentia/docs/battle_backdrops/README.md` + 해당 파일 — 해역·지상전·퀘스트별 배경
4. `roblox-games/mare-essentia/docs/ships/README.md` + `grades.md` + `<배>.md` — 배 디테일·질감·등급 기능
5. `roblox-games/mare-essentia/docs/residents/README.md` + `jobs.md` + `<문화권>.md` — 주민 헤어·복장·악세·재질·모션
6. `roblox-games/mare-essentia/docs/card_battle/README.md` + `screens.md`·`effects.md`·`card_text.md`·`factions.md` — 카드배틀 시스템·분위기·진행·메뉴·이펙트·카드 설명
7. 카드 원화는 위 "카드배틀·지식카드 원화 작업 필독" 절을 따른다.
8. HUD·아이콘·버튼 효과는 `roblox-games/mare-essentia/docs/READ_FIRST.md` 3절(청동 원화 시트만, 반짝이 금지, 맥동만, 해상·지상 동일)
9. `roblox-games/mare-essentia/docs/discoveries/README.md` + `MISSING.md` — 백과 실물(식물·동물·광물·유물·유적)의 지상 탐험 외형·대표 모양·부족 모델
10. `roblox-games/mare-essentia/docs/discoveries/ANIMAL_RIG_MOTION.md` — 동물 표준 뼈대·애니메이션 이름·리액션 규칙·몬스터 재사용(변형 층)
11. `roblox-games/mare-essentia/docs/AUTO_PLACEMENT.md` + `auto_placement_needed.csv` — 항구·지상·해전·항해 자동 배치 슬롯과 만들 파일 이름 전체 목록(드롭박스 자동 인입과 연결)
12. **드롭박스 분류:** 모든 그림·모델은 `/Vibe2Transfer/inbox/<종류>/<이름>` 으로 올린다 — 종류·이름 표는 `roblox-games/mare-essentia/docs/READ_FIRST.md` 3-2절. 각 지시서 맨 위에도 '드롭박스 올리는 곳'이 있다.

작업 후 `roblox-games/mare-essentia/tests/run.sh` 통과(최상위 local 여유 검사 포함)와 Studio 촬영 확인 전에는 완료로 보고하지 않는다.

## 한방패치

중앙정책 fixedAutonomousDevelopmentOperatingContract.ownerRequestedVibeOneShotPatch를 따른다.

직접 수정 → main 자동 병합 → 즉시 배포 → 배포 후 검증

- 사용자의 실제 코딩 요청은 에이전트가 기존 책임 함수에서 직접 구현한다. 자동개발 큐에 지시만 넣고 끝내지 않는다.
- main 병합은 기본 작업에 포함된다. 병합만으로 완료라고 보고하지 않는다.
- 일반 웹게임은 기존 magic-forest-pages.yml의 GitHub Pages 게시 경로를 사용한다. Cloudflare나 새 우회 배포 구조를 만들지 않는다.
- 로블록스 오너 한방패치는 실제 책임 Luau 소스를 직접 수정해 main에 병합하고 기존 Roblox source-drift-sync → F0~F9 → 기존 비공개/전용 Place 게시 → 게시 후 동일 버전 QA → 다음 F0의 반복 경로를 따른다. F9 전 정식 게시·공개 전환은 금지한다.
- F9 직후 다음 개발을 먼저 시작하지 않는다. 게시 성공과 동일 Place/버전 배포 후 검증이 성공하면 기존 F0 재시작 경로에 전달한다. 실패·미검증은 그 회차의 복구·재검증 대상이다.
- 일반 웹 한방패치의 QA·모바일·런타임 검증은 배포 후 수행한다. 사전 QA 점수나 F0~F9 완료 대기를 새 조건으로 붙이지 않는다.
- 중앙정책 확인, 인증정보 보호, 게임 저장·규칙·밸런스 보존, 네이티브 플랫폼의 기존 게시 권한·필수 조건은 유지한다.
- 후속 F0 및 기존 개발과정은 한방패치가 반영된 최신 main과 사용자 요구를 기준으로 영향받는 단계부터 이어간다. 옛 소스로 되돌리거나 새 파이프라인을 만들지 않는다.
- 한방패치는 오너의 명시적 지시만 유효하다. 개발 대기열 승인·F0~F9 완료를 기다리지 않고 기존 책임 소스에서 먼저 수정해 main에 반영한다. 기존 보안·권한 검증은 생략하지 않는다.
- 오너가 **게임 개발중지**를 명령하면 `game-catalog.json`의 `ownerStoppedGameIds`에 정확한 게임 ID를 기록하고 해당 게임에 `ownerDevelopmentStopped:true`, `lifecycleState:OWNER_STOPPED`를 지정한다. 게임 원본·세이브·과거 플레이 버전을 삭제하지 않으며, 설계·예약·복구·출시·홈페이지 타이틀 자동생성에서 격리한다.
- 오너가 그 게임의 개발 재개를 **명시적으로** 지시하기 전에는 자동으로 중지 플래그를 풀거나 다른 게임의 버그 복구 명목으로 재등록하지 않는다. 기존 영구삭제 목록은 그대로 보호한다.
- 실제 배포 리비전과 실행 결과를 확인한다. 검증하지 못한 부분은 미검증으로, 실패는 실패로 보고하고 원인 소스를 직접 수정한다.
- 기존 공용 자산 라이브러리를 먼저 사용한다. 외부 자산은 라이선스·원본·해시를 기록하고 실행 검증 전에는 검증된 게임 자산으로 승격하지 않는다.

상세 작업 기준은 DIRECT_DEV.md를 따른다. 문서와 중앙정책이 충돌하면 최신 사용자 요청과 최신 중앙정책에 맞춰 기존 책임 코드를 정리한다.
