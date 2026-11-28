# 👉 GPT·모든 AI 작업자: 이 파일부터 (1분)

> 이 저장소: `hans1177/jaewoon-games`, 브랜치 `main`.
> 어떤 파일이든 **raw 주소로 읽으면 크기와 상관없이 다 보인다**:
> `https://raw.githubusercontent.com/hans1177/jaewoon-games/main/<경로>`

## 1. 정책(중앙문서) 4종은 **있다**. 여기서 읽는다

| # | 파일 | 크기 | 읽는 법 |
|---|---|---|---|
| 1 | `company-learning/platform-release-roadmap.json` | 약 1.3MB | 커넥터에서 "비어 있음"으로 보여도 **비어 있지 않다**. 먼저 요약본 `company-learning/platform-release-roadmap.brief.json`(33KB)을 읽고, 전체는 raw 주소로 |
| 2 | `company-learning/company-log-map.json` | 약 110KB | 그대로 |
| 3 | `company-learning/company-architecture-map.json` | 약 300KB | 그대로 |
| 4 | `company-learning/security-immune-system.json` | 약 70KB | 그대로 |

- 전체 raw 주소: `https://raw.githubusercontent.com/hans1177/jaewoon-games/main/company-learning/platform-release-roadmap.json`
- 작업 규칙 정본: `AGENTS.md` (루트). 게임 `mare-essentia`는 `roblox-games/mare-essentia/docs/READ_FIRST.md` + 거기 표의 해당 지시서.

## 2. 이런 말로 멈추지 않는다 (금지 문장 → 대신 할 일)

| 하면 안 되는 말 | 사실 | 대신 할 일 |
|---|---|---|
| "중앙 정책이 없다 / 못 찾았다" | 위 1절 4개 파일이 main 에 있다 | 위 경로·raw 주소로 읽는다 |
| "정책 파일이 비어 있어 검증 불가" | 1MB 넘어 커넥터가 안 보여 줄 뿐 | 요약본(brief) → raw 주소 |
| "중앙 검증기 실행 환경에 연결 못 해 수정 보류" | 검증기는 PR 의 GitHub 검사가 돌린다 | 4종 읽기 → main SHA 기록 → 수정 → PR |
| "깃허브 주소 해석 오류(DNS)·네트워크 차단·git clone 실패로 중앙 검증기를 실행 못 했다" | GPT 코드 실행창(파이썬 샌드박스)은 **원래 인터넷이 막혀 있다.** 그건 고장도 사전점검 실패도 아니다. 검증기는 거기서 돌리는 게 아니다 | 실행창에서 clone·node 하지 말고, **GitHub 커넥터(또는 raw 주소)로 읽고 → 커넥터로 브랜치·커밋·PR.** 검증기는 PR 의 GitHub 검사가 돌린다 |
| "main 쓰기 권한이 없어 못 한다" | main 직접 푸시는 원래 금지 | 새 브랜치 + PR. 검사 통과 시 기존 경로로 병합 |
| "어느 지시서를 봐야 할지 모르겠다" | 표가 있다 | `READ_FIRST.md` 2절 표에서 작업 종류로 찾는다 |
| "Studio 로 확인 못 해서 완료 못 함" | 확인 못 한 것은 미검증으로 적으면 된다 | 수정·PR 은 하고, "미검증"으로 보고 |

사전점검(preflight)의 뜻: **최신 main 에서 4종을 읽고 읽은 커밋 SHA 를 PR 본문에 적는 것.** 자세히는 `AGENTS.md` "중앙 사전점검이 뜻하는 것".
**오류 종류는 상관없다.** 주소 해석·DNS·네트워크·타임아웃·권한·"환경 연결 실패" 등 실행 환경 문제는 전부 같은 답: 실행창 대신 커넥터로 읽고 PR 을 낸다. 못 돌린 검사는 PR 본문 "미검증 항목"에 적는다.
진짜 멈춰야 할 때는 둘뿐: ① 4종을 raw 로도 못 읽음 ② 오너 요청이 중앙정책과 정면 충돌.

## 3. 오너가 "진행·적용·넣어·수정·구현·게속"이라고 하면

1. 위 4종 + `AGENTS.md` + 해당 게임 `READ_FIRST.md`·지시서 읽기
2. 기존 책임 소스를 직접 고치기 (새 파이프라인·래퍼 금지)
3. 새 브랜치 → PR (`.github/pull_request_template.md` 칸 채우기: 읽은 main SHA, 검증 증거, 미검증 항목)
4. 기존 검사 통과 → 병합 → 배포·화면 확인은 따로 보고
5. 푸시 전 `python3 tools/devloop/lint_luau.py <게임폴더> --diff origin/main` — 바뀐 Luau 파일 컴파일(R5)까지 잡는다

## 4. 지시서 찾기 (mare-essentia)

**`roblox-games/mare-essentia/docs/BRIEF_MAP.md` = 지시서 지도**(만드는 것별 정본 1개·드롭박스·파일 이름). 규칙·금지는 `READ_FIRST.md`.
자주 찾는 것: 항구·주민 `docs/PORT_VILLAGE_PROMPTS.md` · 원화·자산 `docs/ASSET_MANAGEMENT.md` · 메뉴 UI `docs/MENU_UI_BRIEF.md` · 백과 `docs/ENCYCLOPEDIA_BRIEF.md` · 초상·비주얼 `docs/VISUAL_REMAKE_BRIEF.md` · 해전 `docs/NAVAL_QUEST_EXPANSION_BRIEF.md` · 퀘스트 `docs/STORY_CAUSALITY.md` · 드롭박스 올리는 곳 `READ_FIRST.md` 3-2절.
