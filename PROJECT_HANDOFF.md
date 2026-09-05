# 재운게임즈 프로젝트 인수인계

## 프로젝트 정체성

**우리는 바이브 전문 게임개발팀이다.**

재운게임즈 개발에서는 빠르게 만들되 기존 게임을 깨지 않는 것을 최우선으로 한다. 공통 시스템을 구축해 새 게임 제작 속도를 높이고, 실제 게임에 적용할 때는 기존 규칙·밸런스·저장 구조·진행 데이터를 보존한다.

---

## 최우선 개발 원칙

1. **보존 우선**
   - 기존 게임의 체력, 공격력, 웨이브, 보상, 드랍률, 진행도, 저장 키를 임의로 바꾸지 않는다.
   - 새 공통 시스템 도입을 이유로 기존 게임 구조를 대규모 자동 변환하지 않는다.

2. **기존 코드 먼저 확인**
   - 수정 전 현재 파일과 구조를 먼저 읽는다.
   - 이미 구현된 기능은 재사용하고 중복 시스템을 만들지 않는다.

3. **직접 수정 우선**
   - 임시 래퍼, 덮어쓰기, 중복 패치보다 원본 구조를 직접 수정한다.
   - 임시 테스트 파일/워크플로는 검증 후 삭제한다.

4. **모바일 우선**
   - 터치, 버튼 크기, 조이스틱, 스크롤, 화면 잘림, 가로/세로, 로딩을 먼저 확인한다.
   - 새 웹게임은 가능하면 키보드와 터치를 모두 지원한다.

5. **그래픽과 로직 분리**
   - 게임 규칙/상태/저장 로직과 화면/그래픽을 가능한 한 분리한다.
   - 그래픽 교체 때문에 게임 규칙이 흔들리지 않게 한다.

6. **작은 단위 추가 + 회귀 방지**
   - 공통 시스템은 작은 단위로 추가하고 각각 테스트한다.
   - 새 기능 추가 후 기존 기능이 깨지지 않았는지 확인한다.

7. **저장 호환성 보호**
   - 저장 구조를 깨는 변경은 버전 마이그레이션을 작성한다.
   - 기존 세이브를 자동으로 덮어쓰거나 버리지 않는다.

8. **서버/멀티플레이 권한 분리**
   - 룸/매치/인증/동기화는 서버 계층에서 관리한다.
   - 게임 규칙의 서버 권한화는 실제 게임이 준비된 뒤 게임별로 적용한다.

9. **AI 사용 원칙**
   - 로컬 AI가 이동/공격/회피/힐/타겟/명령을 담당한다.
   - Gemini는 NPC 대화/성격/고수준 판단용으로 제한한다.
   - 매 프레임 Gemini를 호출하지 않는다.
   - AI 오류/오프라인 상태가 게임 진행을 막지 않게 한다.

10. **무료/오픈 에셋 우선**
    - 기존 저장소 에셋을 먼저 재사용한다.
    - 부족하면 CC0/상업 이용 가능/명확한 라이선스 에셋을 필요한 것만 가져온다.
    - 실제 사용한 에셋은 출처와 라이선스를 기록한다.
    - NC/불명확/재배포 제한이 애매한 에셋은 사용하지 않는다.

11. **불필요한 파일 금지**
    - 대형 카탈로그 통째 저장 금지.
    - 필요 없는 폴더/테스트/임시 파일/중복 파일을 만들지 않는다.
    - 파일 100MB 이상 금지.

12. **QA 우선순위**
    - 로딩
    - 시작
    - 진행 막힘
    - 버튼/터치
    - 저장/불러오기
    - 일시정지/재시작
    - 콘솔 오류
    - 성능
    - 모바일 화면

---

## 저장소 / 배포 기준

- GitHub: `hans1177/jaewoon-games`
- 기본 브랜치: `main`
- `main` 업데이트 시 Cloudflare Pages 자동 배포
- 운영 사이트: `https://jaewoon-games.pages.dev`

기본 구조:

```text
index.html
assets/
web-games/
godot-games/
builds/
```

규칙:

- 웹게임: `web-games/<slug>/index.html`
- Godot: `godot-games/<slug>/project.godot`
- 빌드: `builds/<slug>/`
- 이름: lowercase ASCII kebab-case
- `.godot/` 저장 금지
- 공용 에셋만 `/assets/`
- 게임 전용 에셋은 해당 게임 폴더

---

# 현재까지 완료된 공통 시스템

## 1. 프로젝트 기반

- `ASSET_RULES.md`
- `LICENSES.md`
- `assets/asset-manifest.json`
- `GAME_RULES.md`
- Vibe QA GitHub Actions

## 2. 웹 공통 런타임

### `assets/vibe-runtime.js`
- 저장/불러오기
- 지연 자동저장
- 음악/SFX
- 볼륨
- 일시정지
- 화면 숨김 감지
- 전체화면
- 진동
- 터치/키보드 보조
- 오류 감지
- boot/destroy 수명주기

### `assets/game-config.js`
- 중앙 설정값
- dot-path get/set
- 최소/최대/정수/허용값 검증
- 밸런스 값을 임의 보정하지 않고 잘못된 값을 오류로 탐지

## 3. 장르 자동 구성

### `assets/game-presets.js`
지원 장르:
- RPG
- 디펜스
- 생존
- 전략
- 액션
- 어드벤처
- 퍼즐

지원:
- `mixGenres`
- `extras`
- `remove`
- multiplayer 옵션
- AI companion 옵션
- NPC dialogue 옵션
- d20/턴제/성장/인벤토리/퀘스트/스킬/경제/제작/업적/버전 저장 조합

### `assets/game-blueprint.js`
- 장르 → 시스템 추천
- 게임 키트 구성
- 에셋 종류 계획
- 라이선스 정책 계획
- QA 계획
- 기존 밸런스/저장 보호 계획

## 4. 게임 실행/세션 기반

### `assets/game-kit.js`
공통 시스템 조합 관리자.

### `assets/game-session.js`
- 블루프린트
- 게임 키트
- 런타임
- 게임 루프
- 입력
- 씬
- 상태 머신
- 타이머
- 웨이브
- 낮/밤
- 자원
- 상태이상
- 전투 체력
- 타겟
- 전투 액션
- 저장/복원
을 하나의 세션으로 묶음.

### `assets/game-loop.js`
- fixed-step update
- render 분리
- frame drop 보정
- 과도한 catch-up 방지
- pause/resume
- manual step

### `assets/input-actions.js`
- 키보드
- 터치 버튼
- 조이스틱 축
- press/hold/release
- 여러 입력원을 하나의 게임 액션으로 통합

### `assets/scene-flow.js`
- 씬 등록
- 전환
- 뒤로가기
- 체크포인트
- 씬 상태 저장/복원

### `assets/state-machine.js`
- 상태 등록
- 허용 전환
- canEnter/canExit
- enter/exit/update
- 히스토리
- 컨텍스트
- 저장/복원

### `assets/game-timers.js`
- 일반/반복 타이머
- 스폰/웨이브/보스 주기
- pause/resume
- catch-up
- 저장/복원

---

# RPG / 전투 / 성장 공통 시스템

### `assets/d20-rules.js`
- d20 판정
- 이점/불리점
- 능력 보정치
- 숙련 보너스
- 스킬 체크
- 내성
- 선제권
- 명중
- 치명타
- 대항 판정

### `assets/turn-combat.js`
- 턴 순서
- 라운드
- 사망 스킵
- 피해/회복
- 상태 조건
- 전투 종료
- 전투 로그

### `assets/character-progression.js`
- XP
- 레벨
- 능력치
- 스탯 포인트
- 스킬 포인트
- HP/MP 같은 자원
- 스냅샷/복원

### `assets/inventory-equipment.js`
- 인벤토리
- 스택
- 장비 슬롯
- 장착/해제
- 재화

### `assets/quest-dialogue.js`
- 퀘스트
- 목표 진행
- 완료
- 플래그
- NPC 상태
- 조건부 대화

### `assets/skill-effects.js`
- 스킬 비용
- 쿨타임
- 버프/디버프
- 스택
- 지속시간

### `assets/economy-loot-shop.js`
- 드랍
- 보상
- 지갑
- 구매
- 판매

### `assets/save-versioning.js`
- 세이브 버전
- 게임 ID
- 마이그레이션 체인
- 미래 버전 거부

### `assets/stat-modifiers.js`
- 기본 스탯
- flat 증가
- % 증가
- 배율
- 최소/최대
- 출처별 보정 제거
- 장비/버프/디버프용 공통 계산

### `assets/crafting-recipes.js`
- 레시피
- 재료 검사
- 재화 비용
- 대량 제작
- 잠금/해금
- 제작 기록
- 실패 시 재료/돈 롤백

### `assets/achievements-unlocks.js`
- 카운터 조건
- 플래그 조건
- 업적 해금
- 1회 보상
- 중복 지급 방지
- 저장/복원

---

# 생존 / 디펜스 공통 시스템

### `assets/wave-spawner.js`
- 웨이브
- 시작 지연
- 적 그룹
- 스폰 간격
- 최대 동시 적
- 처치 수
- 클리어
- 다음 웨이브
- 저장/복원

### `assets/day-night-cycle.js`
- 낮/밤
- 날짜
- 배속
- pause/resume
- 저장/복원

### `assets/resource-gathering.js`
- 나무/돌/광석 등 채집
- 채집 횟수
- 고갈
- 리스폰
- 낮/밤 조건
- 날짜 조건
- 플래그 조건
- 저장/복원

### `assets/status-effects.js`
- 독/출혈/화상/회복 등 틱 효과
- 지속시간
- 틱 간격
- stack/refresh/replace
- 최대 중첩
- 출처별 제거
- 만료
- 저장/복원

### `assets/combat-vitals.js`
- HP
- max HP
- shield
- 무적
- 피해
- 회복
- 사망
- 부활
- 저장/복원

### `assets/targeting-system.js`
- nearest/farthest
- lowest/highest HP
- highest/lowest threat
- highest/lowest priority
- random
- 사거리
- 팀
- 태그
- 죽은 대상 제외
- targetable 필터
- 저장/복원

### `assets/combat-actions.js`
- 공격 데미지
- 사거리 검사
- 쿨타임
- 명중/빗나감
- 치명타
- 아군 공격 방지
- 방패 무시
- 무적 무시
- 적중 시 상태이상
- 쿨타임 저장/복원

전투 흐름:

```text
타겟 선택
→ 사거리 검사
→ 공격 가능 여부
→ 명중/치명타
→ HP/방패 피해
→ 상태이상 적용
→ 타겟 HP 동기화
→ 쿨타임
→ 저장/복원
```

---

# 멀티플레이 기반

폴더:

```text
multiplayer/
├─ worker.js
├─ wrangler.toml
├─ README.md
├─ multiplayer_client.gd
└─ multiplayer-client.js
```

구성:
- Supabase Auth
- Cloudflare Worker API
- Durable Objects
- WebSocket
- 친구 비공개 방
- 빠른 매칭
- 협동 최대 4명
- PvP 기본 2명
- 재대결
- reconnect 클라이언트 로직
- 세션 정리
- 게임별 `gameId` 분리

중요:
- 실제 특정 게임에 아직 연결하지 않는다.
- 특정 게임이 완성된 뒤 게임별 권한 검증/동기화 규칙을 붙인다.
- reconnect는 클라이언트 재시도는 있으나 완전한 슬롯 예약/복구 E2E 검증은 추가 필요.

---

# AI / NPC 기반

### Godot
- `godot-games/common-ai.gd`
- `godot-games/gemini-ai.gd`

### Web
- `assets/common-ai.js`

### Cloudflare Pages
- `_worker.js`
- `POST /api/ai/gemini`
- `GET /api/ai/status`

원칙:
- 이동/공격/회피/힐/타겟/명령은 로컬 AI
- Gemini는 대화/성격/고수준 전략
- Gemini 실패 시 로컬 fallback
- 실제 게임 규칙, 피해, 인벤토리, 보상, 저장은 게임/서버가 최종 권한

주의:
- 실제 Gemini 생성 POST E2E는 아직 별도 검증 필요.
- Godot 파일들은 실제 Godot 바이너리 문법/런타임 검증이 아직 충분하지 않다.

---

# 에셋 정책

등록된 소스:
- Kenney
- Poly Haven
- ambientCG
- Pixabay
- Mixkit
- OpenGameArt
- Freesound
- itch.io Game Assets
- Free Music Archive
- Quaternius
- KayKit
- CraftPix
- Game-icons.net
- OpenMoji
- Google Fonts
- Font Awesome Free

흐름:

```text
게임 제작
→ 필요한 재료 판단
→ 기존 저장소 재료 우선 재사용
→ 부족하면 승인된 무료 소스 검색
→ 실제 개별 에셋 라이선스 확인
→ 필요한 파일만 저장
→ 게임에 연결
→ LICENSES.md 기록
→ 안 쓰는 파일 제거
```

---

# 최근 검증 상태

최근 추가된 `combat-actions` 전용 통합 테스트는 성공했고, 정식 Vibe QA도 성공 상태까지 확인했다.

최근 확인된 기준 커밋 흐름:
- 전투 액션 구현 및 세션/프리셋 연결
- Vibe QA에 전투 액션 검사 연결
- 임시 테스트 워크플로 삭제

최신 정리 기준 커밋:

```text
1aa4a71f6c9b2e0f7501c4e67355e283926e1ffb
```

이 문서 추가 이후에는 `main` 최신 커밋을 다시 확인하고 작업을 이어간다.

---

# 아직 하지 않은 것 / 과장 금지

- 기존 모든 게임에 공통 시스템 일괄 적용하지 않음
- 특정 완성 게임에 멀티플레이/AI 실제 연결 아직 안 함
- 브라우저 실제 모바일 E2E 자동화는 제한적
- Godot 바이너리 문법/런타임 전체 검증 안 됨
- Gemini 실제 생성 POST E2E 별도 검증 필요
- 서버 권한 전투 시뮬레이션은 게임별 구현 필요
- Godot 공통 툴킷은 Web 시스템과 완전 동일 기능이 아님

---

# 앞으로 작업 우선순위

## 1순위 — 공통 전투 파이프라인 완성

다음 후보:
- projectile / 투사체 시스템
- 범위 공격 / AoE
- 공격 속도 / 자동공격
- 넉백 / 이동 방해
- 스턴 / 침묵 / 슬로우 같은 상태효과를 상태 머신과 연동
- 죽음 → 웨이브 처치 카운트 → 보상/드랍 연결
- 전투 로그 이벤트 표준화

## 2순위 — 생존 시스템 확장

- 음식/허기/갈증
- 체온/환경 위험
- 도구 내구도
- 설치형 구조물/건축
- 자원 노드와 인벤토리 자동 연결
- 제작 결과와 장비 스탯 자동 연결

## 3순위 — 디펜스 시스템 확장

- 포탑 설치/철거/판매
- 포탑 사거리
- 포탑 공격속도
- 포탑 업그레이드
- projectile 연동
- 웨이브 보상
- 보스 패턴
- 최대 설치 수

## 4순위 — RPG 시스템 확장

- progression 상태를 game-kit 공통 snapshot에 더 깊게 포함
- 장비 → stat-modifiers 자동 적용
- 퀘스트 보상 → economy/inventory/xp 자동 연결
- 스킬 → combat-actions/status-effects 자동 연결
- NPC 대화와 퀘스트 플래그 연결

## 5순위 — Godot 공통 시스템 강화

현재 Web 쪽보다 기능이 적으므로 다음을 보강:
- 장착/해제
- 퀘스트 목표 진행/완료
- 스킬 사용/효과
- 상점 구매/판매
- 보상
- d20 Godot 버전
- 턴제 전투 Godot 버전
- 성장 Godot 버전
- 실제 Godot 바이너리 검사

## 6순위 — 멀티플레이 강화

특정 게임이 완성된 뒤:
- 서버 권한 이동/전투 검증
- 플레이어 슬롯 예약
- 완전한 reconnect E2E
- 게임별 상태 snapshot
- 치팅 방지
- 친구 목록/초대 UX
- 관전/재대결 고도화

## 7순위 — 실제 게임 적용

사용자가 게임을 하나 지정하면:

```text
현재 게임 코드 확인
→ 기존 규칙/밸런스/저장 구조 기록
→ 필요한 공통 시스템만 선택
→ 기존 구현 재사용
→ 최소 변경으로 연결
→ 모바일/저장/진행/오류 테스트
→ 배포
```

기존 게임 전체를 한 번에 바꾸지 않는다.

---

# 다음 작업자에게 주는 필수 지시

1. 시작 전에 `PROJECT_HANDOFF.md`, `GAME_RULES.md`, `ASSET_RULES.md`, `LICENSES.md`를 읽는다.
2. `main` 최신 상태와 현재 Vibe QA 결과를 확인한다.
3. 기존 파일을 읽지 않고 새 시스템부터 만들지 않는다.
4. 기존 밸런스/저장/진행 데이터를 절대 추측으로 바꾸지 않는다.
5. 공통 시스템 추가 시 전용 테스트 → 정식 Vibe QA 반영 → 임시 테스트 삭제 순서를 지킨다.
6. 새 파일은 실제 공용 재사용 가치가 있을 때만 만든다.
7. 특정 게임이 준비되지 않았으면 멀티플레이/AI를 게임에 억지로 연결하지 않는다.
8. 답변에서 실제 검증한 것과 아직 검증하지 않은 것을 구분한다.
9. 프로젝트 정체성은 항상 다음 문장으로 유지한다.

**우리는 바이브 전문 게임개발팀이다.**
