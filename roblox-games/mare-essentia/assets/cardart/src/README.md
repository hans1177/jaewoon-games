# 해상전투 지역별 오브젝트 카드 원화

기존 `BoardingCards.luau` 의 `eu_01`~`af_30` 150장에 대응하는 신규 원본 벡터 삽화(SVG)다.

- 유럽·동아시아·중동·신대륙·아프리카 각 30장(선박 10·유물 7·동물 6·지형·원더 7).
- **사람·초상화는 포함하지 않는다.** 원화 구분 정보, 역사 소재 설명, 스킬/모션은 `../region-art.json` 참조.
- 상업 외부 이미지 무단 사용 없음. 작업용 원본 저작물: `PROJECT_ORIGINAL_ART`.
- 이 폴더는 원화 **소스**다. SVG를 등록 가능한 PNG로 변환하고 미술 검수·자산 검증 후, 기존 `tools/mare-essentia-upload-assets.mjs` 경로로 등록해야 게임에서 표시된다. 등록 완료·실제 재생·배포를 주장하지 않는다.
- 기존 카드 밸런스, 저장 식별자, 카드 덱 최대치 30장, 전투 엔진은 이 원화 추가로 변경하지 않는다.

## 해전 카드게임판 배경 (원본 단일 이미지)

- 16:9 `1536×864` JPG `assets/cardart/battle_board.jpg` 원화 시안이 2026-11-13 제작됐다. 배치: 푸른 황금 대리석 전장, 6개 배치 줄에 맞는 나침반, 범선·항구·횃불 장식. 캐릭터·카드·버튼·글자 없는 **배경 전용** 이미지다.
- 생성 결과는 현재 대화 파일 `mare_battle_board.jpg`(SHA-256: `8673d3c0400c070031b10bc38bb941015a52d002f4a95c556cbdcc6d3fbe1b44`)이다. PNG 원화도 별도 보관.
- **아직 GitHub에 실제 JPG 바이너리 미업로드, `APPROVED_IMAGES.json`에 SHA 미등록, Roblox AssetIds에 `CardArt/battle_board` 미등록**. 이미 등록됐거나 게임이 새 원화로 동작했다고 주장하지 않는다.
- 기존 `NavalBattle.luau`의 단일 `CardArt/battle_board` 키로만 연결한다. 등록 전에는 기존 승인 `CardArt/event_chart_world`를 깔고 6개 전투 줄·손패 금속 테두리·색상 대비를 같은 함수 안에서 보여 준다.
- 승인 시 실제 JPG를 **기존 `assets/cardart/`에 직접 저장**하고 기존 `tools/mare-essentia-upload-assets.mjs`와 `assets/APPROVED_IMAGES.json` 승인 경로를 그대로 사용해야 한다. 승인 우회·새 업로더·자동 공개 배포는 금지.
- 전투 규칙·카드 150장·덱 제한·저장 구조 및 터치 확대 변경 없음. 배경 실화면 품질·폰에서의 가독성·Roblox Studio 검증 전에는 품질 완료로 표시하지 않는다.
