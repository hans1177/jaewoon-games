# 지식카드 그림 제작 규칙 (GPT·에이전트용)

> **드롭박스 올리는 곳 (필독)**
> - `/Vibe2Transfer/inbox/CardArt/<카드id>.png` — 대륙 카드는 세로 7:10, 1049×1499 이상(자동으로 1400×2000), 지식·사건 원화는 자동 JPG 변환
> - 메뉴창 원화 배너: `/Vibe2Transfer/inbox/CardArt/menu_<메뉴>_<번호>.jpg`
> - 올린 뒤에는 자동 검사(이름·형식·크기·256색 금지·중복) → 자동 등록 → 자동 배치. 결과·거부 이유는 `docs/assets/dropbox_inbox_report.md`. 규칙 전체: `docs/ASSET_MANAGEMENT.md` 2-1절, 파일 이름 전체 목록: `docs/AUTO_PLACEMENT.md`.

> **필독:** 원화는 풀컬러(24/32비트)만 등록한다. **256색(팔레트·감색) 원화는 절대 등록 금지** — `docs/ASSET_MANAGEMENT.md` 1절. 등록기가 자동 거부한다.

카드 그림을 만들기 전에 **이 문서를 먼저 읽는다.** 읽지 못했으면 그림을 만들지 말고 알린다.
저장소: `hans1177/jaewoon-games` · 경로: `roblox-games/mare-essentia/`

**카드배틀 후속 작업자 필독:** [CARD_BATTLE_HANDOFF.md](./CARD_BATTLE_HANDOFF.md)에서 직전 작업 이력·신규 원화 화풍·등록 완료/미완료·기존 등록 절차를 확인한다. 중앙정책과 이 문서를 읽지 않고 원화 생성·승인·자산등록을 시작하지 않는다. 실제 등록상태는 최신 `main` 기준으로 갱신해 판단한다.


## 지식카드 전용 화풍 (대륙 카드에는 적용하지 않음)
- 17세기 동판화 도판 느낌, **세피아 톤**, 낡은 양피지 질감, 가는 선 음영
- 가로 4:3, 한 장에 대상 하나, 중앙에 크게
- 글자·숫자·서명·워터마크·테두리 **금지** (금테는 게임 준비 단계에서 입힌다)
- 현대 물건, 실존 인물 얼굴, 상표 금지
- 같은 분야는 같은 느낌으로 통일

## 카드별 프롬프트
- 전체 목록: `docs/card_art_prompts.csv` (card_id, name, field, prompt). 카드가 늘면 `python3 tools/gen_card_prompts.py > docs/card_art_prompts.csv` 로 다시 만든다.
- 목록의 `prompt` 칸을 그대로 쓴다. 임의로 소재를 바꾸지 않는다.

## 대륙 카드(유럽·동아시아·중동·신대륙·아프리카·동남아·미지의 땅) · 지도자
- **기존 등록된 게임 원화가 기준**: 사실적인 컬러 역사 회화·입체적인 재질·맑은 바다와 하늘·문화권별 선박 형상. 지식카드용 세피아 동판화 지시를 적용하지 않는다.
- **대륙 카드 세로 7:10, 권장 1400×2000 PNG**. 등록기는 가로·세로 각 768~4096픽셀을 허용한다. 기존 정사각형 등록 원본은 보존하고 새로 제작하는 카드부터 적용한다. 기존 게임의 카드 테두리는 UI에서 별도로 입힌다. 원화에는 글자·금테·엠블럼·카드 모음·스프라이트 시트를 넣지 않는다.
- 인물·선박·동물·유물 등 카드 ID가 지정한 단일 주제를 정확히 표현하고, 시대착오·다른 카드 소재 혼합을 금지한다.
- 개별 그림 시각검수·원본 해시·기존 승인표 검증 후 기존 등록기로만 승격한다. 화풍 또는 내용이 다른 시안은 승인·업로드하지 않는다.
- **원화 그대로 등록(2026-11-23 오너 지시):** 대륙 전투카드 신규·교체 이미지는 실제 제작한 8비트 RGB/RGBA 풀컬러 PNG의 바이트를 그대로 `assets/cardart/src/<카드ID>-original.png`에 저장한다. P 모드·256색 양자화본, 해당 파일의 RGB 재변환본, 인위적 업스케일본은 원본으로 인정하지 않는다. 권장 1400×2000이지만 실제 7:10 원본이 조금 작으면 임의 확대하지 않고 검수/권한 관문에서 판단한다.
- **기존 등록 교체:** 실제 교체 원본 SHA-256을 `APPROVED_IMAGES.json`의 승인 해시 및 `modelOriginals`에 적고, 기존 번호와 이전 해시를 `replacesAssetId`·`replacesSha256`에 증빙한다. 기존 `owner-mare-essentia-assets.yml`과 `mare-essentia-upload-assets.mjs`만 이용한다. 신규 Roblox 자산번호·Universe 권한·게임 연결 검증 전에는 기존 카드 ID·자산번호·파일을 제거하지 않는다. 등록 실패/심사 대기는 완료로 표시하지 않는다.
- 대륙 카드 244장: `docs/continent_card_art_prompts.csv` (card_id, name, category, 현재 그림, 게임 안 움직임, prompt). 현재 그림이 "없음"인 카드부터 만든다.
- 지도자 21명: `docs/leader_art_prompts.csv` (세로 7:10 전신, 역동적인 자세).
- 다시 만들기: `python3 tools/gen_continent_card_prompts.py`
- 그림은 **개별 컬러 세로 7:10 단일 완성 원화 한 장**으로 만든다. 대륙 전투카드는 사진·도감풍 정지 자세보다 돌진·질주·포말·흙먼지 등 **장면 속 동세가 살아 있는 역동적인 회화**를 우선한다. 게임 내 움직임(안개·빛·3D 소품)은 기존 엔진에 맡기며 임의로 바꾸지 않는다.
- 인물 카드는 얼굴을 또렷하게 그리지 않는다(뒷모습·실루엣·투구). 지도자 카드는 기존 컬러 회화 화풍의 세로 전신 초상화로 제작한다.

## 올리는 방법
1. 파일 이름은 `카드id.png` (예: `myth_siren.png`)
2. 위치: `roblox-games/mare-essentia/assets/inbox/CardArt/`
3. 같은 이름의 `카드id.png.license.json` 도 함께: `{"license": "PROJECT_ORIGINAL_ART", "author": "AI generated (도구 이름)", "source": "ai-generated"}`
4. 등록과 승인(`assets/APPROVED_IMAGES.json`)은 코딩 에이전트가 한다. 올리기만 하면 된다.

## 하지 말 것
- 이미 사진이 있는 카드(`assets/cardart/`)를 덮어쓰지 않는다.
- 만들지 못한 카드를 만든 것처럼 보고하지 않는다.

## GPT 지침 칸에 붙여 넣을 글 (저장소를 못 읽는 채팅용)
```
너는 지식카드 그림 제작 담당이다.
화풍: 지식카드는 17세기 세피아 동판화·가로 4:3. 대륙 카드배틀은 기존 등록 원화와 동일한 컬러 역사 회화·세로 7:10 (1400×2000), 대상 하나를 중앙에 크게. 카드 모음·테두리는 금지.
금지: 글자·숫자·서명·워터마크·테두리, 현대 물건, 실존 인물 얼굴, 상표.
카드 이름과 설명을 받으면 그 소재만 그린다. 임의로 바꾸지 않는다.
파일 이름은 카드id.png. 저장소 hans1177/jaewoon-games 의 roblox-games/mare-essentia/docs/CARD_ART_PROMPTS.md 를 읽을 수 있으면 먼저 읽고 따른다.
```

## 이벤트(이야기) 장면 그림
- 목록: `docs/story_art_prompts.csv` (event_id, title, place, prompt). 카드 그림과 달리 **컬러 일러스트, 16:9 가로**.
- 파일 이름은 `story_<event_id>.png`, 위치는 `assets/inbox/CardArt/`, `.license.json` 은 카드 그림과 같은 방식.
- 등록되면 `CardArt/story_<event_id>` 가 이벤트 장면 배경으로 자동 사용된다. 그림이 없는 이벤트는 도형 대신 그 항구의 3D 풍경을 어둡게 깔아 보여 준다.
