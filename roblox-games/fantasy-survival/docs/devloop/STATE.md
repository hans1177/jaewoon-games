# 개발 루프 기억 파일 (마력숲 생존기 / fantasy-survival)

> 사람이나 AI가 이어받을 때 가장 먼저 읽는다. 한 바퀴 끝날 때마다 "최근 기록"을 갱신한다.
> 작성 표준은 `roblox-games/mare-scientia/docs/devloop/STATE.md` 를 따른다.

## 규칙
- 작업 범위: `roblox-games/fantasy-survival` 안만. 다른 에이전트가 동시에 작업하므로 작은 변경을 자주 푸시하고 `git pull --rebase` 후 푸시한다.
- 에셋: `CC0-ASSET-REGISTRY.json` 에 등록된 승인 에셋만. 도형 조립 외형 금지.
- 화면 확인: `devloop-studio.yml` (game=fantasy-survival) → 브랜치 `fantasy-survival-studio-frames`. 스크립트가 없으면 오프닝 캡처를 한다.
- 거짓 보고 금지: 못 본 것은 못 봤다고 쓴다.

## 할 일
- [오류 발견 2026-11-07] 오프닝 캡처 콘솔에 `Game:12462: attempt to index nil with 'AbsolutePosition'` 가 37회 반복(GameClient 스크립트). UI 객체(예: 튜토리얼 화살표 `center(o)`, `guiRoot`, `questTracker` 주변)가 nil일 때 `.AbsolutePosition`을 읽는 것으로 보임. 해당 코드는 현재 다른 작업자가 수정 중이므로 충돌을 피해 작은 수정으로 nil 가드 추가. 수정 후 `devloop-studio.yml`(game=fantasy-survival)로 다시 캡처해 콘솔 오류 0 확인.
- [화면] 오프닝 일러스트(복면 인물, 숲 지도 장면)는 품질 양호. 인게임 월드 장면은 아직 캡처하지 않았다. `qa/studio-scripts/*.json`(예: 모험 시작 클릭 → 대기 → 카메라 캡처)을 참고해 `tools/devloop/studio-scripts/default.json` 을 만들면 인게임도 자동 확인된다.

## 최근 기록
- 2026-11-07: 개발 루프 틀(devloop.json, STATE.md, 공통 사진 캡처) 추가.
- 2026-11-08: 튜토리얼 화살표의 AbsolutePosition 오류 대응 — 화면 기준점을 안전하게 읽는 `meadowArt.origin` 으로 교체(원인 위치는 로그 없이 추정, 캡처로 재확인 필요). 크래시 3건(applySkillTreeIcon 선언 순서, questTracker/guidePrompts 범위) 수정, 호감도 저장, 타격감(흔들림·번쩍임·히트스톱), 대화 줌, 노드별 스킬 아이콘 추가.
