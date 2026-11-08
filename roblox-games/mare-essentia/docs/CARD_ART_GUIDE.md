# 도감 카드 그림 가이드

## 현재 상태
- 카드에는 그림 자리(`CardArt.luau`)가 있고, 비어 있으면 분야 색의 임시 일러스트가 나온다.
- 실제 사진/그림은 아직 없다. Roblox는 이미지를 에셋으로 올려야 쓸 수 있고, 그 작업은 사람이 Creator Hub에서 하거나 Open Cloud API 키가 필요하다.

## 어떤 그림을 쓸까 (저작권)
인터넷에서 찾은 사진을 그대로 쓰면 안 된다. 아래처럼 **이용이 허락된 것만** 쓴다.
| 종류 | 출처 후보 | 비고 |
|---|---|---|
| 식물·동물·광물 사진 | Wikimedia Commons (Public Domain/CC0/CC BY), Biodiversity Heritage Library(옛 도판) | CC BY는 출처 표기 필수 |
| 천문 | NASA 이미지 (대부분 공개 도메인) | 미국 정부 저작물 |
| 유물·그림 | The Met, Rijksmuseum, Smithsonian 오픈 액세스 | CC0 표시 확인 |
| 옛 도판·지도 | 1920년 이전 출판물 스캔 (공개 도메인) | 이 게임 시대(1600~1700년대)와도 분위기가 맞는다 |
- "약간 수정"(자르기, 색감 통일)은 공개 도메인/CC0는 자유, CC BY는 출처 표기를 유지하면 허용된다. CC BY-SA/ND·"비상업 전용"은 쓰지 않는다.
- 사람 얼굴이 나오는 현대 사진, 상표가 보이는 사진은 피한다.
- 카드마다 `credit`(작가/출처 URL)와 `license`를 반드시 `CardArt.luau`에 적는다. 게임 안 카드 상세에도 출처가 표시된다.

## 작업 순서
1. 카드별로 이미지를 골라 폴더에 모으고 `목록.csv`(card_id,file,credit,license)를 만든다.
2. `python3 tools/prepare_card_art.py 원본폴더 목록.csv 출력폴더` — 4:3(512×384)으로 자르고 색감을 통일(채도 낮춤, 따뜻한 색조, 비네팅)한다.
3. Creator Hub → Assets에서 출력 PNG를 올리고 에셋 ID를 받는다. (또는 API 키를 주면 일괄 업로드를 자동화할 수 있다.)
4. `CardArt.snippet.luau`의 `rbxassetid://0`을 실제 ID로 바꿔 `src/ReplicatedStorage/Shared/CardArt.luau`에 붙인다.
5. Studio에서 도감 → 분야 → 카드 상세에서 그림과 출처가 나오는지 확인한다.

## 자동 업로드 (Open Cloud, 무료)
1. `python3 tools/gen_art_list.py 목록.csv` — 모든 카드의 양식 생성. file/credit/license 칸을 채운다 (name, field 열은 참고용).
2. `python3 tools/prepare_card_art.py 원본폴더 목록.csv 출력폴더`
3. Creator Hub → Open Cloud → API Keys에서 키 생성(Assets 읽기/쓰기). **키는 채팅/코드에 적지 말고 환경변수로만 사용.**
4. `export ROBLOX_API_KEY=... ROBLOX_USER_ID=...` 후 `python3 tools/upload_card_art.py 출력폴더 목록.csv` (먼저 `--dry-run`으로 확인).
5. 생성된 `CardArt.entries.luau`를 `CardArt.luau`의 Art 표에 붙여 넣는다. 이미 올린 카드는 `uploaded.json`에 기록되어 다시 올리지 않는다.
- 이미지는 Roblox 자동 검수를 거친다. 게임에서는 Decal ID를 `rbxthumb://` 주소로 불러온다.

## "실사 사진 vs 일러스트"
- 동식물·광물·유적은 실사 사진이 도감 느낌이 가장 좋다.
- 신화 괴물, 옛 장면, 사진이 없는 옛 발명품은 옛 판화/도판(공개 도메인) 또는 직접 그린 일러스트가 어울린다.
- 같은 분야 안에서는 색감과 비율을 통일해야 카드가 한 세트로 보인다 (위 스크립트가 그 역할).
