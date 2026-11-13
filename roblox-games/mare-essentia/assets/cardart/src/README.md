# 대항해시대 5대륙 전투카드 원화

- 기존 `BoardingCards.luau`의 5대륙 × 30장 = **150장** 전투 규칙·전투력·덱·저장 키·ID를 보존한다. 요청 목표는 **175장**이고 추가 25장 신규 제작은 아직 진행되지 않았다.
- **도형식 저품질 원화는 실물 GIF 등록·최종 통과 금지.** `me_01`(다우선), `me_24`(페트라), `nw_24`(마추픽추), `af_01`(므테페)는 재제작 품질에 도달하기 전까지 애니메이션 승인 목록에서 제외한다. 기존 카드 데이터와 대체 도판은 삭제하지 않는다.
- **현재 원화 검수용 7종**: `eu_03` 갈레온(함선), `eu_24` 스톤헨지(원더), `ea_02` 거북선(함선), `ea_18` 시베리아호랑이(동물), `me_21` 페르시아표범(동물), `nw_18` 재규어(동물), `af_18` 아프리카 코끼리(동물). 기존 스톤헨지 도형 대신 **자연적인 돌 질감·흐르는 안개·햇빛 움직임**이 있는 완성 원화 프레임을 새로 제작했다.
- **프레임 애니메이션**: 각 대상의 16개 완성 프레임 × 80ms, 반복 GIF(원화 재생 12.5fps). 4×4 PNG 시트는 `1024×1024`, 한 프레임 `256×256`. 단일 카드 장면만 보여 주며 부위별 UI 레이어·추가 렌더 루프는 없다.
- 로블록스는 GIF 자체를 재생하지 못하므로, **실제 승인·등록된** `CardArt/카드ID`가 있을 때만 기존 `NavalBattle.luau::animateCardArt`에서 `ImageLabel.ImageRectOffset`으로 프레임을 재생한다. 기존 카드 비율 `0.69`, 5대륙별 덱·분류 배지와 터치 확대 기능을 보존한다.
- 검수용 원화와 7개 스프라이트 시트는 이 대화의 `mare_motion_7.zip`에 있다. **GitHub 저장소에 PNG/GIF 바이너리 미업로드, Roblox 자산 ID 미등록, Studio 실제 시각 및 60fps 성능 검사 미실시.** 따라서 실제 게임에 원화가 표시됐거나 배포됐다는 완료 판정은 하지 않는다.
- 새 큐·새 워크플로·유료 서비스는 사용하지 않는다. 등록 시 기존 `tools/mare-essentia-upload-assets.mjs`의 승인 SHA·권한·실기기 QA를 그대로 적용한다.

## 기존 카드 자산 우선 사용 (2026-11-13 확인)

- 카드 실제 원화 저장 경로: `roblox-games/mare-essentia/assets/cardart/`; 지역별 SVG 원본: `assets/cardart/src/`. 새 그림 검색/재생성 전에 이 경로와 승인/등록 상태를 확인한다.
- **페트라 `me_24`**: `assets/cardart/event_petra.jpg`가 존재하고 기존 `AssetIds["CardArt/event_petra"]`로 등록되어 있다. 기존 `BoardingCards.luau` 원화 연결을 그대로 사용한다.
- **마추픽추 `nw_24`**: `assets/cardart/event_machu_picchu.jpg`가 존재하고 기존 `AssetIds["CardArt/event_machu_picchu"]`로 등록되어 있다. 기존 `BoardingCards.luau` 원화 연결을 그대로 사용한다.
- **아라비아 다우선 `me_01`·스와힐리 므테페 `af_01`**: `src/me_01.svg`·`src/af_01.svg` 기존 원본을 재검토하되, `event_chart_indian_ocean.jpg`(지도), `event_merchant_lamu.jpg`(사람·항구), `event_zanzibar.jpg`(여러 배·항구)를 단일 선박 실물 원화로 잘못 표시하거나 완료 처리하지 않는다.
- **주의**: 등록된 정적 원화가 있다고 해서 16프레임 GIF/스프라이트 재생이 승인된 것은 아니다. 원본 JPG를 변경하거나 우회 업로드하지 않는다. 실제 카드 GIF는 기존 승인 해시·아트 검수·Roblox 자산 등록·Studio 플레이 검증을 거쳐야 한다.
- `assets/cardart/DISABLED.md`에 따라 자동 위키 원화 수집은 중단 유지. 신규 이미지 등록은 사람의 승인 및 기존 `APPROVED_IMAGES.json` SHA 절차만 사용한다.
