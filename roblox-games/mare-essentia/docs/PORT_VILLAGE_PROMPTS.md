# 항구 마을 구현 프롬프트 (항구 정체성 + 발전도 + 자원)

> **배치 숫자(거리·간격·구도·길 폭)는 `docs/VILLAGE_LAYOUT_SPEC.md`가 우선한다.** 이 문서는 양식·재질·프롬프트.

> **드롭박스 올리는 곳 (필독)**
> - `/Vibe2Transfer/inbox/Town/<항구id>_<슬롯>.glb` (슬롯은 `docs/ports/README.md` 맨 위 참고)
> - 올린 뒤에는 자동 검사(이름·형식·크기·256색 금지·중복) → 자동 등록 → 자동 배치. 결과·거부 이유는 `docs/assets/dropbox_inbox_report.md`. 규칙 전체: `docs/ASSET_MANAGEMENT.md` 2-1절, 파일 이름 전체 목록: `docs/AUTO_PLACEMENT.md`.

데이터: `src/ReplicatedStorage/Shared/PortIdentity.luau` · 대상: 시작 항구 15곳(이후 같은 틀로 확장)
용도: 3D 원본(Roblox Studio `generate_mesh`/외부 3D 도구) · 바닥 텍스처 · 배치 기준. 생성물은 승인·등록 후 `AssetIds`에 넣는다.
시대: 1500~1800년대. 실존 건축 양식을 참고하되 특정 건물 복제가 아닌 "그 양식의 대표형"으로 만든다.

---

## 1. 공통 프롬프트 (모든 항구 앞에 붙인다)

```
Stylized-realistic low-poly game asset for Roblox, early-modern era (1500–1800),
hand-painted PBR look, readable silhouette from 40–80 studs, clean topology,
pivot at ground center, no text/logos, no modern objects, neutral daylight,
scale: 1 stud ≈ 0.28 m, doors 7–8 studs tall,
separate meshes for roof / walls / trim so colors can be tinted in-engine.
```

### 공통 규칙
- 항구 3D 에셋은 고정 삼각형 수 상한을 적용하지 않는다. 과거 항구별 문서·CSV의 폴리곤 숫자(≤ 표기 포함)는 참고치이며 거절 기준이 아니다. 원본 디테일을 보존하고 모바일 실측 프레임·메모리·로딩·LOD로 최적화한다. 플랫폼 자체 제한 및 기존 권한·보안·품질 검사는 유지한다.
| 항목 | 규칙 |
|---|---|
| 구획 | 필지는 큰길에 면한다. 집은 등을 맞대 두 줄. 광장은 항구와 마을 사이 한 곳 |
| 밀도 | 중앙(광장)에서 멀어질수록 낮고 성기게. 외곽은 농지·목장 |
| 땅 | 길과 길 밖 땅을 반드시 구분 (길=포장 재질, 밖=풀·흙·모래·진흙) |
| 날씨 | 비: 길 웅덩이·젖은 반사 / 건기: 흙먼지 / 겨울: 지붕·길가 눈 / 몬순: 진흙 바퀴자국 |
| 밤 | 등 종류는 항구별, 개수는 발전도별(아래 표). 창문 불빛은 1/3 집만 |
| 사실성 | 같은 모델 반복 금지: 높이·색·문 위치 3종 이상 변형. 지붕 이끼·벽 얼룩 같은 낡음 1단계 |

---

## 2. 발전도별 마을 (모든 항구 공통 틀)

| 단계 | 필지 | 광장 | 길 | 밤 조명 | 농촌·목장 |
|---|---|---|---|---|---|
| 1 개척 | 6칸, 오두막·창고 | 없음(공터) | 흙길, 바퀴자국 | 횃불 2~3 | 텃밭 2, 울타리 목초지 1 (가축 2~3) |
| 2 마을 | 10칸 | 우물·공터 광장 | 자갈길 큰길만 | 등 4~6 | 밭 4, 목초지 2, 건초더미 |
| 3 읍 | 14칸, 구역 분리(시장·종교·주거) | 상징물 기초 + 시장 노점 | 큰길 포석, 골목 자갈 | 길 3칸마다 등 | 밭 6, 목장 3(축사·사일로), 풍차·물레방아 1 |
| 4 도시 | 18칸, 2~3층 | 상징물 완성, 분수/기념비 | 돌길·배수로 | 2칸마다 등 | 목장 4, 과수원, 가공소(치즈·양모·제분) |
| 5 대도시 | 24칸 + 외곽 구역 | 열주·관청 면 | 전면 포장, 보도 | 모든 길 가로등 줄 | 외곽 농장 마을, 운반 수레 길 |

---

## 3. 자원별 농촌·목장 묘사 (항구 `produces` 기준 자동 선택)

| 자원 | 1~2단계 | 3단계 | 4~5단계 | 프롬프트 키워드 |
|---|---|---|---|---|
| wool(양모) | 돌담 목초지, 양 5 | 양털 깎는 헛간 | 직조 공방·염색 통 | dry-stone walls, sheep pasture, shearing barn |
| cheese(치즈) | 젖소 목초지 | 낙농 헛간 | 치즈 계량소·저장 선반 | dairy cows, polder meadow, cheese weigh house |
| wine(포도주) | 계단 포도밭 | 압착장 | 지하 저장고 입구·통 쌓기 | terraced vineyard, wine press, barrel cellar |
| salt(소금) | 갯벌 | 증발 염전 칸 | 소금 창고·흰 더미 | salt evaporation pans, white salt mounds |
| fish/whale_oil | 그물 건조대 | 훈제·염장 헛간 | 고래기름 정제 가마 | drying nets, smokehouse, try-works |
| timber/iron | 벌채지·통나무 | 제재소(수차) | 용광로·숯가마 | sawmill waterwheel, charcoal kiln, bloomery |
| silk | 뽕나무 밭 | 양잠 헛간 | 견직 공방 | mulberry orchard, silkworm racks |
| spice/pepper/cloves/cinnamon | 향신료 밭 | 건조 멍석 | 향신료 창고·포대 | pepper vines on poles, clove drying mats |
| tea | 차밭 이랑 | 덖는 가마 | 차 상자 창고 | terraced tea rows, tea roasting pans |
| rice | 논(물 반사) | 정미 물방아 | 쌀 창고(고상) | flooded rice paddies, water mill, raised granary |
| sugar | 사탕수수 밭 | 압착 방아 | 정제소 굴뚝 | sugarcane field, cane crusher, boiling house |
| cotton/cloth | 목화밭 | 조면 헛간 | 염색 작업장·천 건조 | cotton field, dye vats, cloth drying lines |
| coffee/cocoa/vanilla | 그늘 재배 밭 | 건조장 | 볶는 가마·자루 | shade-grown plantation, drying patio |
| silver/copper/coal/tin | 갱도 입구 | 광석 운반 수레 | 제련 굴뚝 | mine adit, ore carts, smelter chimney |
| ginseng | 차광막 밭 | 건조 선반 | 약재 시장 | ginseng shade beds, herb drying racks |
| glass/porcelain/lacquer | 점토 채취장 | 가마 | 공방 거리 | kiln, potter's workshop, lacquer drying shelves |

---

## 4. 항구별 프롬프트

각 항구: **상징물(2단계 기초 → 4단계 완성)** · **건축 세트** · **구획** · **광장** · **길(1→5단계)** · **조명** · **땅·날씨** · **구역 특산 건물** · **농촌(자원)**.

### 런던 (영국)
- 상징물: `London-Bridge-style medieval stone bridge lined with timber shops, 16th c., 8 arches` (fallback: 탑)
- 건축: 벽돌 박공지붕 2~4층, 하층 석조·상층 목골조, 철 난간 창, 굴뚝 다수
- 구획: 골목형(구불), 강 쪽으로 창고 줄 / 광장: 시장
- 길: 흙 → 자갈 → 포석 → 포석+배수로 → 포장 / 조명: 기름 랜턴(철 기둥)
- 땅·날씨: 풀·진흙, 잦은 비 웅덩이, 안개
- 특산: 왕립 거래소(열주 안뜰), 양조장(통·굴뚝), 해군 공창(건조대)
- 농촌: 양 목초지·돌담 → 양털 헛간 → 직조 공방 / 탄광 갱도(석탄)

### 암스테르담 (네덜란드)
- 상징물: `Dutch canal lock gate with weigh house (Waag), brick, stepped gables`
- 건축: 좁고 높은 계단식·종 모양 박공, 붉은 벽돌, 흰 창틀, 짐 올리는 도르래 들보
- 구획: 운하(물길 따라 집 한 줄씩) / 광장: 부두
- 길: 판자 → 벽돌 → 벽돌 → 벽돌 → 포장 / 조명: 기름 랜턴(운하 난간)
- 땅·날씨: 간척지 진흙·풀, 비 웅덩이
- 특산: 동인도회사 상관, 풍차 제분소, 거래소
- 농촌: 간척 목초지 젖소 → 낙농 헛간 → 치즈 계량소 / 튤립·채소 밭

### 루앙 (프랑스)
- 상징물: `Gothic cathedral spire with flying buttresses, Rouen style`
- 건축: 목골조(하프팀버) 3층, 돌출 상층, 슬레이트 지붕
- 구획: 골목형 / 광장: 시장(대시계 문루 옆)
- 길: 흙 → 자갈 → 포석 → 판석 → 포장 / 조명: 기름 랜턴
- 땅·날씨: 풀, 비 웅덩이
- 특산: 직물 시장, 대시계 문루, 포도주 저장고
- 농촌: 포도밭 → 압착장 → 저장고 / 염전 / 직물 염색장

### 코펜하겐 (덴마크)
- 상징물: `Round brick observatory tower (Rundetaarn style) with spiral ramp`
- 건축: 회반죽 벽(노랑·주황·크림), 박공, 녹색 구리 지붕 포인트
- 구획: 운하 / 광장: 부두
- 길: 흙 → 자갈 → 포석 → 포석 → 포장 / 조명: 기름 랜턴
- 땅·날씨: 풀, 겨울 눈
- 특산: 해협 세관, 증권거래소(용 꼬리 첨탑), 목조 창고
- 농촌: 어망 건조·훈제 → 맥주 양조(홉 밭) / 호박 가공

### 예테보리 (스웨덴)
- 상징물: `Hilltop star fort with crown-shaped tower, Swedish 17th c.`
- 건축: 팔룬 레드 목조(붉은 벽·흰 테두리), 잔디 지붕 일부
- 구획: 운하 / 광장: 부두
- 길: 흙 → 자갈 → 자갈 → 포석 → 포장 / 조명: 기름 랜턴
- 땅·날씨: 바위·풀, 겨울 눈
- 특산: 동인도회사 창고, 수차 제재소, 목조 교회
- 농촌: 벌채지 → 제재소 → 용광로·숯가마(철) / 어망

### 베네치아 (베네치아 공화국)
- 상징물: `Venetian brick campanile with pyramid spire beside an arcaded piazza`
- 건축: 회반죽(분홍·황토), 아치 창·로지아, 굴뚝(깔때기형), 모임지붕
- 구획: 운하 / 광장: 분수(우물머리) 광장
- 길: 판자 → 판석(전 단계) / 조명: 기름 랜턴(벽 부착)
- 땅·날씨: 석호 진흙, 물웅덩이(아쿠아 알타)
- 특산: 유리 공방(가마 불빛), 검역소, 베네치아 공창
- 농촌: 석호 섬 채소밭 / 유리 가마 / 뽕나무·견직

### 이스탄불 (오스만 제국)
- 상징물: `Ottoman imperial mosque with central dome, half domes, 4 slender minarets`
- 건축: 석조 하층·목조 돌출 상층, 마슈라비야 격자창, 붉은 기와
- 구획: 계단식(언덕) / 광장: 사원 앞마당(분수)
- 길: 흙 → 자갈 → 포석 → 판석 → 판석 / 조명: 모스크 등(유리 매단 등)
- 땅·날씨: 붉은 흙, 건기 먼지
- 특산: 그랜드 바자르(돔 지붕 줄), 함맘, 카라반사라이
- 농촌: 사프란·과수원 → 양잠 → 커피 볶는 집 / 양탄자 직조

### 잔지바르 (스와힐리 해안)
- 상징물: `Swahili coral-stone palace with carved wooden doors and veranda`
- 건축: 산호석 흰 벽, 평지붕, 조각 대문, 나무 격자 발코니
- 구획: 골목형(좁은 미로) / 광장: 부두
- 길: 모래 → 모래 → 자갈 → 판석 → 판석 / 조명: 기름 랜턴
- 땅·날씨: 모래, 몬순 진흙
- 특산: 정향 창고, 다우선 선착장, 산호석 모스크
- 농촌: 정향 밭 → 건조 멍석 → 향신료 창고 / 코코넛 숲

### 캘리컷 (말라바르 해안)
- 상징물: `Kerala wooden temple gateway with tiered sloping roofs`
- 건축: 라테라이트·회반죽 벽, 깊은 처마 경사 지붕, 나무 격자
- 구획: 골목형 / 광장: 시장
- 길: 붉은 흙 → 붉은 흙 → 자갈 → 판석 → 포장 / 조명: 기름 램프(놋쇠)
- 땅·날씨: 붉은 흙, 몬순 진흙
- 특산: 후추 교역소, 면직 공방, 조선 작업장
- 농촌: 후추 덩굴 기둥 밭 → 건조 → 창고 / 계피·목화 / 코끼리 운반

### 나가사키 (일본)
- 상징물: `Dejima fan-shaped artificial island trading post with warehouses and bridge`
- 건축: 목조 처마, 기와, 흰 회벽(창고), 격자 창
- 구획: 계단식(언덕) / 광장: 부두
- 길: 흙 → 자갈 → 자갈 → 판석 → 판석 / 조명: 석등
- 땅·날씨: 풀, 비 웅덩이
- 특산: 도자기 가마(오름 가마), 쌀 창고, 신사 도리이
- 농촌: 계단 논 → 정미 물방아 → 쌀 창고 / 구리 광산 / 옻 건조 선반

### 베라크루스 (누에바 에스파냐)
- 상징물: `Spanish colonial coral-stone sea fortress (San Juan de Ulúa style)`
- 건축: 회반죽 평지붕, 철 발코니, 안뜰형 주택
- 구획: 바둑판 / 광장: 연병장(아르마스 광장)
- 길: 모래 → 흙 → 자갈 → 포석 → 포장 / 조명: 기름 랜턴
- 땅·날씨: 모래, 건기 먼지
- 특산: 은 선적 부두, 세관, 대성당
- 농촌: 카카오·바닐라 그늘 밭 → 건조장 / 코치닐 선인장 밭 / 은 운반 노새 길

### 광저우 (중국)
- 상징물: `Thirteen Factories waterfront row of Western-style hongs with flags, Canton`
- 건축: 회색 벽돌, 곡선 처마 기와, 나무 격자 창, 문 위 현판(무문자)
- 구획: 바둑판 / 광장: 부두
- 길: 흙 → 자갈 → 판석 → 판석 → 포장 / 조명: 종이 초롱
- 땅·날씨: 논·진흙, 몬순 진흙
- 특산: 차 시장, 도자기 상점, 관창
- 농촌: 논 → 차밭 이랑 → 뽕나무·양잠 / 칠기 공방

### 세비야 (에스파냐)
- 상징물: `Giralda-style brick bell tower over a former minaret base`
- 건축: 흰·황토 회반죽, 모임지붕, 철 격자창, 안뜰(파티오)
- 구획: 골목형 / 광장: 분수
- 길: 흙 → 자갈 → 포석 → 판석 → 포장 / 조명: 기름 랜턴
- 땅·날씨: 붉은 흙, 건기 먼지
- 특산: 인도 무역원, 올리브 압착소, 황금탑 부두
- 농촌: 올리브 과수원 → 포도밭 → 사탕수수·무두질장

### 부산 (조선)
- 상징물: `Joseon coastal stone fortress wall with gate pavilion (Busanjin style)`
- 건축: 회벽·목조 기와집(처마 곡선), 초가 외곽, 돌담
- 구획: 계단식 / 광장: 장터
- 길: 흙 → 흙 → 자갈 → 판석 → 판석 / 조명: 종이 초롱
- 땅·날씨: 풀, 겨울 눈
- 특산: 판옥선 조선소, 장시, 향교
- 농촌: 논 → 인삼 차광 밭 → 목화밭 / 어망·염장

### 리스본 (포르투갈)
- 상징물: `Manueline fortified tower on the river (Belém style), ornate stone`
- 건축: 회반죽(파스텔), 모임지붕, 아줄레주 타일 벽 포인트, 철 발코니
- 구획: 계단식(언덕) / 광장: 연병장(강변 광장)
- 길: 흙 → 자갈 → 포석 → 포석(물결 무늬) → 포장 / 조명: 기름 랜턴
- 땅·날씨: 붉은 흙, 비 웅덩이
- 특산: 항해 학교, 향신료 창고, 수도원
- 농촌: 염전 → 포도밭 → 사탕수수 창고 / 코르크 숲

---

## 5. 바닥 텍스처 프롬프트 (공통, 타일링)

```
Seamless tileable PBR ground texture, 1024x1024, top-down, early-modern street,
{material}: dirt with wheel ruts / loose gravel / rounded cobblestones /
large flagstones / dressed paving with gutter / wooden planks / red brick herringbone,
optional wet variant with puddles, optional dusty variant, optional light snow variant.
```

## 6. 구현 연결
- `PortIdentity.streetAt(portId, lvl)` → 길 재질 (적용됨)
- `identity.ground` → 길 밖 땅·마을 바닥 재질 (적용됨)
- 상징물·특산 건물·밤 조명·날씨 바닥·자원 농촌은 3D 원본 등록 후 단계별 배치 (다음 단계)

---

## 7. 항구별 3D 에셋 제작 지시서 (CSV)

파일: `docs/port_asset_prompts.csv` (300줄 = 15항구 × 약 20종). 생성기: `python3 tools/gen_port_asset_prompts.py`

| 열 | 뜻 |
|---|---|
| asset_id | `<항구>_<종류>` (예: `venice_workshop_glass`). 업로드 파일 이름도 이걸로 |
| category | landmark · house · district · plaza · lamp · sign · goods · workshop |
| tier | 이 단계부터 마을에 나타남 |
| size_studs / tris | 목표 크기(가로x깊이x높이)와 기존 참고 삼각형 수(상한 아님) |
| prompt_en | 3D 생성 도구에 그대로 붙여 넣는 영어 프롬프트(공통 문구 포함) |
| notes_ko | 한글 메모 |

**항구당 에셋 구성**
- 상징물 2종: 공사 중(2단계) → 완성(4단계)
- 주택 3종: 1층 오두막(1단계) / 2층 상점 주택(3단계) / 3층 부유 상인 주택(5단계), 색 슬롯 3개
- 구역 특산 건물 3종 (3단계)
- 광장 중심물 1, 가로등 1(밤 발광 재질 슬롯), 그림 간판 세트 1
- 특산물마다: 진열 가판대 + 공방
- 창고 마당 재고 3단계(적음·보통·가득)

**만드는 순서 (추천)**
1. 시작 항구 5곳(런던·암스테르담·베네치아·이스탄불·나가사키)의 상징물 완성 + 주택 3종
2. 같은 5곳의 가판대·공방
3. 나머지 10곳
4. 가로등·간판·창고 (전 항구 공통 사용 가능)

**넣는 곳**: `assets/inbox/Town/<asset_id>.fbx|glb` → 승인 → `AssetIds["Town/<asset_id>"]` 등록 → 마을이 자동 사용(없으면 기존 에셋으로 대체).

---

## 8. 작업자(ChatGPT 등) 공통 지시
1. 먼저 `docs/RULES.md`(에셋·라이선스·코드 한도)를 읽는다.
2. `Game.client.luau` 맨 바깥에 `local` 추가 금지 → `do` 블록·`H` 테이블. 넘치면 화면이 안 뜬다. 자동 조절 `tools/luau_local_budget.py fix`.
3. 지상전·마을 나무·덤불: 옅은 청록 단색 금지, 잎·줄기·그늘 색 구분 + 지역 기후 색.
4. 저장 데이터·경제 수치·보행 충돌벽은 바꾸지 않는다.
6. 3D 에셋은 **승인 원본(Kenney 등 CC0 등록 에셋)을 가공**해서 만든다(프롬프트는 가공 목표 설명). `.license.json`에 원본 이름·URL·“derived”·가공 내용 기록. 원본 없이 처음부터 AI 생성은 보류.
5. 끝나면 `tests/run.sh` 통과 + Studio `mare-town.json` 항공·광장 사진 확인.
