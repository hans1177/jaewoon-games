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
- 2026-11-08: 지역 점검표 도구 추가(`node tools/fantasy-region-report.mjs --write` → docs/devloop/QUALITY.md, 테스트 qa/fantasy-region-report.test.mjs). 세계수·화산·오아시스는 캠프 콘텐츠가 있는데 Status가 Planned라 월드 탭에 '준비 중'으로 보임 — 실제 이동·지형이 되는지 화면 확인 후 라벨 정리 필요.
- 2026-11-08: 인간형 몹(KayKit 리그: handslot/kneeIK 뼈) 관절 축 보정 + 무기 공격 팔 동작(내려치기·휩쓸기·방패 치기·석궁·베기) 추가, 길 구불구불+가장자리 자갈/풀, 완만한 언덕(보호 구역 밖 습지·숲 가장자리), 몹 지면 보간·경사 기울기. 모두 화면 미확인 — 스튜디오 캡처로 확인 필요(특히 인간형 팔 방향, 언덕에 묻힌 물체).
- 2026-11-08: 사진 캡처 스크립트 `tools/devloop/studio-scripts/fantasy-visual-check.json`(동료·길·언덕·인간형 몹) 추가. 확인: 동료 원형 배치 OK, 언덕은 낮아서 거의 안 보임. **한계: Studio 재생에서는 서버에 몹(Species 모델)이 0개** — 프로필(DataStore)이 없어 몹 스폰이 안 되는 것으로 추정. 몹 모습은 실제 게임 스샷으로만 확인 가능(또는 Studio 전용 스폰 플래그 필요).
