# 이벤트씬·사건 원화 지시서 (2026-11-28 오너 지시, 모두 필독)

> **인물 사실 묘사 공통 필수 규칙 (2026-11-28 오너 지시):** 인물이 등장할 때 미남·미녀로 획일화하거나 미화하지 않는다. 나이·직업·생활환경에 맞는 얼굴형, 체형, 피부 결, 주름, 비대칭, 머리와 손, 자연스러운 표정과 자세를 사실적으로 묘사한다. 현대 모델 같은 외모·보정 피부·과장된 미형·문화권 고정관념을 피하고 인물마다 개성을 살린다. 기존 역사 고증·회화 화풍·실존 인물 얼굴 제한을 지키며 인물이 없는 소재에는 사람을 억지로 추가하지 않는다.

> 드롭박스 올리는 곳: `/Vibe2Transfer/inbox/CardArt/event_<id>.jpg` — 이름만 맞추면 자동 검사 → 등록 → 게임이 자동 연결(`H.eventArtFor`).
> **256색 금지**(풀컬러 RGB, `ASSET_MANAGEMENT.md` 1절). 가로 16:9, 1920×1080 이상 권장, jpg.

## 어디에 나오나

| 장면 | 쓰는 원화 | 없을 때 |
|---|---|---|
| 세계 사건 알림씬(재해·행운 시작 때 3초, 영화 띠·글자 한 자씩) | `CardArt/event_<세계사건 id>` | 낱말이 비슷한 원화(역병→plague_wave, 화산→volcano 등) → 재해 `event_storm` / 행운 `event_calm_seas` |
| 역사 사건 창(연도·선택지) 맨 위 띠 | `CardArt/event_<사건 art 또는 id>` | 같은 낱말 규칙 → 세계 해도 `event_chart_world` |
| 불가사의 카드 첫 습득 | `WonderScenes.luau` 의 art | 원더씬 없이 카드 습득 연출만 |
| 퀘스트 받을 때 | 일러스트 없음(실제 3D 세계 연출씬) | — |

## 그림 규칙

- 한 장면 한 순간, 그 사건이 한눈에 보이게(역병=텅 빈 부두·약재 상인, 화산=잿빛 하늘·멈춘 항구).
- 1500~1800년 고증. 글자·로고·워터마크·UI 넣지 않기. 아래 1/3은 글자가 얹히니 너무 복잡하지 않게.
- 재해는 어둡고 차가운 빛, 행운은 따뜻한 금빛(게임이 색을 살짝 덧씌움).

## 아직 없는 세계 사건 원화 (33장) — 만들면 바로 자동 연결

| 파일 | 종류 | 제목 | 장면 설명 |
|---|---|---|---|
| `CardArt/event_yellow_fever.jpg` | 재해 · 전염병 | 황열병 | 더운 바다의 항구마다 열병이 번져 선원들이 쓰러진다. |
| `CardArt/event_smallpox.jpg` | 재해 · 전염병 | 천연두 | 마을마다 두창이 돌아 장터가 닫힌다. 접종 이야기가 오간다. |
| `CardArt/event_scurvy.jpg` | 재해 · 전염병 | 긴 항해의 괴혈병 | 오래 바다에 머문 선원들이 잇몸이 붓고 쓰러진다. 신선한 과일이 금값이다. |
| `CardArt/event_blockade.jpg` | 재해 · 전쟁 | 해상 봉쇄 | 교전국 함대가 항구를 막았다. 몰래 뚫는 배만 돈을 번다. |
| `CardArt/event_embargo.jpg` | 재해 · 정치 | 통상 금지령 | 왕실이 외국 배의 입항을 막았다. 관세 장벽에 상인들이 한숨짓는다. |
| `CardArt/event_uprising.jpg` | 재해 · 정치 | 민중 봉기 | 세금에 성난 사람들이 항구 관청을 점거했다. |
| `CardArt/event_regime_change.jpg` | 재해 · 정치 | 왕위 교체 | 새 왕이 오르자 옛 특허장이 휴지가 되었다. 상인들은 새 줄을 찾는다. |
| `CardArt/event_bank_crash.jpg` | 재해 · 경제 | 투기 거품 붕괴 | 한창 오르던 투기 열풍이 꺼지고 장부가 무너졌다. |
| `CardArt/event_mutiny.jpg` | 재해 · 사고 | 선원 반란 | 월급이 밀려 선원들이 항구에서 등을 돌렸다. |
| `CardArt/event_sunk_cargo.jpg` | 재해 · 사고 | 에서 침몰한 화물선 | 큰 화물선이 암초에 걸려 가라앉았다. 시장에 물건이 줄어든다. |
| `CardArt/event_gold_rush.jpg` | 행운 · 발견 | 새 금광 | 산골짜기에서 사금이 발견되었다는 소문이 퍼졌다. |
| `CardArt/event_silver_fleet.jpg` | 행운 · 교역 | 은 함대 도착 | 은을 가득 실은 배가 들어와 장터가 활기를 띤다. |
| `CardArt/event_royal_patron.jpg` | 행운 · 후원 | 왕실 후원 | 왕실이 항구의 상인과 학자를 후원하겠다고 선언했다. |
| `CardArt/event_peace_treaty.jpg` | 행운 · 정치 | 평화 조약 | 오랜 전쟁이 끝나 항로가 다시 열렸다. 쌓여 있던 물건이 한꺼번에 풀린다. |
| `CardArt/event_scholars_arrive.jpg` | 행운 · 학문 | 학자들의 방문 | 이름난 학자들이 항구에 내려 강연을 연다. 도시가 지식에 들뜬다. |
| `CardArt/event_fx_edo_fire.jpg` | 재해 · 실제 재해 | 에도 메이레키 대화재 | 사흘 동안 번진 불이 에도 성과 시가지 대부분을 태웠다. 재건에 쓸 목재가 날개 돋친 듯 팔린다. |
| `CardArt/event_fx_port_royal.jpg` | 재해 · 실제 재해 | 포트로열 대지진 | 카리브 해적의 수도라 불리던 포트로열이 지진으로 바닷속에 가라앉았다. 킹스턴에 새 항구가 세워진다. |
| `CardArt/event_fx_fuji.jpg` | 재해 · 실제 재해 | 후지산 호에이 분화 | 후지산이 폭발해 에도에 화산재가 눈처럼 내렸다. 논밭이 덮이고 쌀 값이 오른다. |
| `CardArt/event_fx_marseille_plague.jpg` | 재해 · 실제 재해 | 마르세유 대역병 | 레반트에서 온 상선 한 척이 역병을 옮겼다. 항구가 봉쇄되고 지중해 교역이 흔들린다. |
| `CardArt/event_fx_calcutta_cyclone.jpg` | 재해 · 실제 재해 | 캘커타 대형 사이클론 | 벵골 만을 덮친 폭풍이 갠지스 하구의 배 수십 척을 부쉈다. |
| `CardArt/event_fx_irish_famine.jpg` | 재해 · 실제 재해 | 아일랜드의 혹한과 대기근 | 혹독한 겨울과 흉작이 이어져 아일랜드가 굶주린다. 곡식과 소금 절임이 귀하다. |
| `CardArt/event_fx_bengal_famine.jpg` | 재해 · 실제 재해 | 벵골 대기근 | 몬순이 실패하고 세금이 겹쳐 벵골의 곡창지대가 굶주렸다. 쌀 값이 폭등한다. |
| `CardArt/event_fx_great_hurricane.jpg` | 재해 · 실제 재해 | 1780년의 대허리케인 | 카리브 해를 휩쓸어 수만 명의 목숨을 앗아간 가장 치명적인 대서양 허리케인. 설탕 섬이 폐허가 되었다. |
| `CardArt/event_fx_calabria_quake.jpg` | 재해 · 실제 재해 | 칼라브리아 대지진 | 시칠리아 해협을 따라 연이어 지진이 일어나 메시나와 해안 마을이 무너졌다. |
| `CardArt/event_fx_mocha_boom.jpg` | 행운 · 실제 호재 | 모카 커피 붐 | 예멘 모카 항에 유럽 상선이 줄을 잇는다. 아라비아 커피가 한꺼번에 풀린다. |
| `CardArt/event_fx_nystad.jpg` | 행운 · 실제 호재 | 니스타드 조약 | 대북방 전쟁이 끝나고 발트 해 항로가 열린다. 러시아의 목재와 모피가 쏟아져 나온다. |
| `CardArt/event_fx_diamantina.jpg` | 행운 · 실제 호재 | 브라질 다이아몬드 발견 | 미나스 제라이스에서 다이아몬드가 발견되었다. 리우 항구에 보석 상인이 몰려든다. |
| `CardArt/event_fx_huaynaputina.jpg` | 재해 · 실제 재해 | 와이나푸티나 화산 폭발 | 페루 남부에서 남미 역사상 가장 큰 화산이 터졌다. 재가 하늘을 덮어 이듬해 세계 곳곳의 날씨가 어긋났다. |
| `CardArt/event_fx_venice_plague.jpg` | 재해 · 실제 재해 | 1630년 베네치아 역병 | 밀라노에서 번진 역병이 베네치아까지 닿아 도시 사람 셋 중 하나가 목숨을 잃었다. 도시는 구원을 빌며 살루테 성당을 세운다. |
| `CardArt/event_fx_vesuvius.jpg` | 재해 · 실제 재해 | 1631년 베수비오 분화 | 오래 잠잠하던 베수비오 화산이 폭발해 나폴리 일대 마을이 용암과 화산재에 묻혔다. |
| `CardArt/event_fx_chile_quake.jpg` | 재해 · 실제 재해 | 1647년 칠레 대지진 | 산티아고를 무너뜨린 대지진의 여파가 해안 항구까지 닿았다. 부두와 창고가 갈라졌다. |
| `CardArt/event_fx_bank_amsterdam.jpg` | 행운 · 실제 호재 | 암스테르담 은행 설립 | 시 당국이 세운 은행이 각지의 어지러운 동전을 믿을 만한 예금으로 바꿔 준다. 상인들이 몰려든다. |
| `CardArt/event_fx_madras_founded.jpg` | 행운 · 실제 호재 | 마드라스 요새 건설 | 영국 동인도회사가 코로만델 해안에 성조지 요새를 세운다. 면직물 공방과의 거래가 열린다. |

## 이미 있는 세계 사건 원화 (24장)

`event_plague_wave`, `event_storm`, `event_hurricane`, `event_monsoon_fail`, `event_earthquake`, `event_tsunami`, `event_volcano`, `event_harbor_fire`, `event_hard_winter`, `event_famine`, `event_locusts`, `event_shipworm`, `event_drought`, `event_piracy`, `event_bumper_harvest`, `event_trade_boom`, `event_festival`, `event_calm_seas`, `event_new_route`, `event_treasure_wreck`, `event_fish_shoal`, `event_new_plant`, `event_canal_opened`, `event_royal_charter`

## 다시 만들 것(256색 옛 자산)

- `CardArt/event_title_parchment`, `CardArt/event_title_ship` — 풀컬러로 다시 저장해 같은 이름으로 올리기.
