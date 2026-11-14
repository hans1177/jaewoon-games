# 초상화·이벤트 장면 그림 제작 규격 (제작 시 참고)

| 종류 | 비율 | 권장 크기 | 형식 | 이름 규칙 | 코드에서 쓰는 곳 |
|---|---|---|---|---|---|
| 인물 초상(NPC·학자) | 3:4 세로 | 768×1024 (최소 384×512) | PNG 또는 JPG | `assets/portraits/<종류>_<번호>_<설명>.png`, 학자는 `scholar_<id>.jpg` | 항구 NPC 패널, 탐험 "이 항구의 학자" |
| 이벤트 장면 | 16:9 가로 | 1280×720 (최소 960×540) | PNG 또는 JPG | `assets/story/<event_id>.png` (event_id는 `docs/story_art_prompts.csv` 첫 열) | 이야기 장면 `playStory` 배경(`UIAspectRatioConstraint` 16:9) |
| 도감 카드 | 4:3 | 512×384 | JPG | `assets/cardart/<card_id>.jpg` | 도감 카드 상세 |

## 공통 규칙
- 글자·숫자·서명·테두리·현대 물건 금지. 실존 인물 얼굴 금지(학자 초상은 공개 도메인 그림만).
- 인물은 얼굴이 가운데 위쪽 1/3에 오게(UI가 아래쪽을 가린다). 장면은 중요한 피사체를 가운데 70% 안에.
- 업로드 후 에셋 ID를 `AssetIds.luau`와 `assets-registered.json`에 등록해야 게임에서 쓴다(미등록 이미지는 쓰지 않음).
- 이벤트 장면의 프롬프트는 `docs/story_art_prompts.csv`에 이미 있다(가로 16:9 명시).
- 초상 번호는 고정이다. 새 초상은 기존 번호를 바꾸지 말고 다음 번호로 추가한다.
