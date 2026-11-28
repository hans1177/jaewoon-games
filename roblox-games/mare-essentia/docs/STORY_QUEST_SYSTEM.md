# 이야기 퀘스트 시스템 (틀)

> **인물 사실 묘사 공통 필수 규칙 (2026-11-28 오너 지시):** 인물이 등장할 때 미남·미녀로 획일화하거나 미화하지 않는다. 나이·직업·생활환경에 맞는 얼굴형, 체형, 피부 결, 주름, 비대칭, 머리와 손, 자연스러운 표정과 자세를 사실적으로 묘사한다. 현대 모델 같은 외모·보정 피부·과장된 미형·문화권 고정관념을 피하고 인물마다 개성을 살린다. 기존 역사 고증·회화 화풍·실존 인물 얼굴 제한을 지키며 인물이 없는 소재에는 사람을 억지로 추가하지 않는다.

스토리 내용은 나중에 `src/ReplicatedStorage/Shared/Quests.luau` 데이터만 추가하면 된다. 코드 수정 불필요.

| 기능 | 퀘스트 필드 | 동작 |
|---|---|---|
| 연속 | `after = "앞 퀘스트 id"` | 앞 퀘스트 완료 후 보임 (기존) |
| 선택 분기 | `kind = "choice"`, `choices = { {value, label, result?} }`, `choiceKey?` | 일지에 선택 버튼. 한 번만 선택, `stats.storyChoices`에 저장 |
| 분기 조건 | `needChoice = "키=값"` | 그 선택을 한 플레이어에게만 보임 |
| 지도자 대결 | `kind = "duel_leader"`, `leaderId`, `duelFaction?` | 일지 "대결" 버튼 → 그 지도자 덱과 카드 대결. 이기면 `stats.duelWins[leaderId]` +1 |
| 이야기 함대전 | Battle `WARS` 항목에 `questOnly = "퀘스트 id"` + 퀘스트 `kind = "war_clear"`, `warId` | 해당 퀘스트 진행 중에만 작전 목록에 나타남. 완수 시 `stats.warClears[warId]` +1 |
| 해역 함대전 | `kind = "war_clear"`, `regionId` | 해역별 완수 횟수 |
| 지상 퀘스트 | `exploreSite`, `portId` | 기존 현장 탐험 |
| 카드 이야기 | `loreCardId`, `loreText` | 완료하면 그 카드 상세에 "이야기 · 퀘스트명 (가상의 이야기)" 단락 |
| 인물 말풍선 | `speaker`, `speakerRole?`, `line` | 진행 중이면 동료 말풍선 자리에 인물 대사 (닫기 가능) |
| 보상 | `rewardCardId`, `rewardCoins` … | 기존 |

예시 (지중해, 내용은 임시):

```lua
{ id = "q_lamp_1", name = "깨진 등불", summary = "베네치아에서 소문 듣기", kind = "visit", amount = 1, strand = "history",
  speaker = "엘레나", line = "아버지의 등불이 바다에 떠다녔어요.", rewardCoins = 100, rewardFame = 2, rewardXp = 20 },
{ id = "q_lamp_3", name = "두 개의 깃발", summary = "누구를 믿을까", kind = "choice", amount = 1, after = "q_lamp_2",
  choices = { { value = "kasim", label = "카심을 믿는다" }, { value = "mocenigo", label = "감찰관을 믿는다" } }, rewardCoins = 0, rewardFame = 0, rewardXp = 0 },
{ id = "q_lamp_4k", name = "갑판 위의 카드판", summary = "술레이만 덱을 이겨라", kind = "duel_leader", leaderId = "suleiman", amount = 1,
  after = "q_lamp_3", needChoice = "q_lamp_3=kasim", loreCardId = "eu_12", loreText = "…", rewardCoins = 800, rewardFame = 10, rewardXp = 200 },
```

저장: 모든 기록은 `state.stats` 아래(통째 저장)라 저장 구조 변경 없음. 판정 로직은 `Shared/StoryKit.luau`.
