# 플랫폼 출시 로드맵

> 정책 원본은 `COMPANY_FLOW.md`다. 이 문서는 실행 이해용 미러이며 새 정책을 만들지 않는다. 중앙정책이 바뀌면 관련 작업 문서와 런타임 계약을 같은 작업에서 동기화한다.

## 현재 기본 우선순위

1. Roblox
2. Unity
3. Fortnite UEFN

이 순서는 기본 집중/경험 축적 우선순위다. 다른 플랫폼 개발을 잠그는 단계 게이트가 아니다.

## 플랫폼별 6분류 개발 세트

각 플랫폼은 서로 슬롯을 공유하지 않는 독립적인 6분류 대표 세트를 가진다. 6분류는 개발 다양성 기준이며 전체 게임 수 상한이 아니다. 기본적으로 분류당 대표 게임 1개를 두지만, 성과와 5개 부서 평가 근거가 있으면 같은 분류에 추가 게임을 확장할 수 있다.

### Unity

기존 6분류 세트는 그대로 보존한다.

- ACTION_SURVIVAL_ROGUELITE
- SINGLE_DEFENSE_STRATEGY
- PUZZLE
- CASUAL
- IDLE_GROWTH_RPG
- STORY_COMPLETE_RPG

Roblox 우선순위가 Unity 세트를 삭제·교체하거나 슬롯을 소비하지 않는다.

### Roblox

현재 메인 개발 세트다.

1. ROLEPLAY_LIFE_AVATAR
2. SIMULATOR_TYCOON_INCREMENTAL
3. BATTLEGROUND_FIGHTING_SHOOTER
4. SURVIVAL_HORROR_ESCAPE
5. OBBY_PARTY_MINIGAME
6. STORY_RPG_ADVENTURE_RPG

`STORY_RPG_ADVENTURE_RPG`는 필수 분류다. 해당 후보가 구조적 실패로 제외되더라도 분류 자체를 제거하지 않고 재설계하거나 같은 분류에서 새 후보를 seed한다.

6개 모두 개발 대상이며 6개 모두 출시 후보지만 **6/6 강제 출시는 아니다**. 각 게임은 자신의 실제 Roblox 런타임·QA·회귀·정확 리비전 근거로 독립적으로 출시 게이트를 통과해야 한다.

낮은 점수는 즉시 폐기 사유가 아니다. 기본 순서는 `수정 → 재평가 → 필요 시 HOLD → 재검증 → 구조적 실패 근거가 남을 때만 제외`다.

6개 seed/design은 동시에 진행할 수 있지만 실제 구현은 기본적으로 2~3개를 우선 병렬 진행한다. 이는 WIP 가이드일 뿐 포트폴리오 상한이 아니다.

Roblox 대표 세트는 가능한 한 다음 기술 경험이 포트폴리오 전체에 분산되도록 한다: DataStore/저장, 멀티플레이 서버-클라이언트 경계, PvP/경쟁, NPC/퀘스트, 라운드 또는 절차형 세션, 모바일 조작/UI. 모든 항목을 각 게임마다 강제하는 체크리스트는 아니다.

### Fortnite UEFN

독립적인 플랫폼 전용 6분류 세트를 사용한다. 정확한 6개 분류는 오너가 별도로 확정할 때까지 미정이며 Roblox/Unity 분류를 자동 복사하지 않는다.

## 세트 완료와 출시 완료

개발 세트 평가는 각 대표 후보가 `DEVELOPMENT_CONFIRMED`, 기록된 `HOLD`, 또는 근거 기반 제외 중 하나의 상태를 가질 때 완료로 볼 수 있다. 출시 완료는 별도이며, 출시 게이트를 통과한 게임만 출시한다.

## 현재 집중 상태

- 기본 집중: `ROBLOX_FAST_RELEASE_STABILIZATION`
- Roblox 원본: `roblox-games/`
- Roblox 실행 어댑터: `tools/vibe3-roblox-platform.mjs`
- 기본 게시 모드: Dry Run
- 실제 게시: 명시적 실행 + Open Cloud 인증 + 런타임/독립 QA/회귀/정확 리비전 근거 필요

## 기존 경로 보존

- 기존 Unity 개발은 계속 허용한다.
- Roblox 우선순위가 기존 Unity 프로젝트를 삭제하거나 교체하지 않는다.
- 기존 Web 공개판은 검증/보존 목적의 경로로 유지할 수 있다.
- 플랫폼별 성공 근거는 다른 플랫폼 성공으로 자동 이전하지 않는다.

## 학습 체인

Roblox/Unity/UEFN 모두 기존 V3/Vibe2 학습·검증 체인을 재사용한다. 플랫폼별 별도 증류 cron, shadow dataset, 별도 trainer를 만들지 않는다.
