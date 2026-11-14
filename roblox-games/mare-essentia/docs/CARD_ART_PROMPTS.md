# 지식카드 그림 제작 규칙 (GPT·에이전트용)

카드 그림을 만들기 전에 **이 문서를 먼저 읽는다.** 읽지 못했으면 그림을 만들지 말고 알린다.
저장소: `hans1177/jaewoon-games` · 경로: `roblox-games/mare-essentia/`

## 화풍 (모든 카드 공통)
- 17세기 동판화 도판 느낌, **세피아 톤**, 낡은 양피지 질감, 가는 선 음영
- 가로 4:3, 한 장에 대상 하나, 중앙에 크게
- 글자·숫자·서명·워터마크·테두리 **금지** (금테는 게임 준비 단계에서 입힌다)
- 현대 물건, 실존 인물 얼굴, 상표 금지
- 같은 분야는 같은 느낌으로 통일

## 카드별 프롬프트
- 전체 목록: `docs/card_art_prompts.csv` (card_id, name, field, prompt). 카드가 늘면 `python3 tools/gen_card_prompts.py > docs/card_art_prompts.csv` 로 다시 만든다.
- 목록의 `prompt` 칸을 그대로 쓴다. 임의로 소재를 바꾸지 않는다.

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
화풍: 17세기 동판화 도판 느낌, 세피아 톤, 낡은 양피지 질감, 가는 선 음영, 4:3 가로, 대상 하나를 중앙에 크게.
금지: 글자·숫자·서명·워터마크·테두리, 현대 물건, 실존 인물 얼굴, 상표.
카드 이름과 설명을 받으면 그 소재만 그린다. 임의로 바꾸지 않는다.
파일 이름은 카드id.png. 저장소 hans1177/jaewoon-games 의 roblox-games/mare-essentia/docs/CARD_ART_PROMPTS.md 를 읽을 수 있으면 먼저 읽고 따른다.
```

## 이벤트(이야기) 장면 그림
- 목록: `docs/story_art_prompts.csv` (event_id, title, place, prompt). 카드 그림과 달리 **컬러 일러스트, 16:9 가로**.
- 파일 이름은 `story_<event_id>.png`, 위치는 `assets/inbox/CardArt/`, `.license.json` 은 카드 그림과 같은 방식.
- 등록되면 `CardArt/story_<event_id>` 가 이벤트 장면 배경으로 자동 사용된다. 그림이 없는 이벤트는 도형 대신 그 항구의 3D 풍경을 어둡게 깔아 보여 준다.
