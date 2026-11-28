--!strict
-- 서막 메인 퀘스트: 시작 국가별 4장 (사연 → 길 → 목표 → 학자). 자동 생성: tools/gen_prologue.py 로 만든 뒤 다듬는다.
-- 시작 국가의 첫 동료와 함께 가는 이야기. nation 이 다르면 보이지 않는다.
local Q: { any } = {}
local HAND: { [string]: { string } } = {}

table.insert(Q, { id = "pr_england_1", loreCardId = "clothing_wool_cloak", name = "논문에 오르지 못한 이름", summary = "서막 · 이름 없는 숫자들 — 양모 6개를 플리머스에 납품", kind = "deliver", goodId = "wool", portId = "plymouth", amount = 6, nation = "england", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "adventure", rewardXp = 40 })
HAND["pr_england_1"] = { [==[양모를 짜는 마을에서 자란 윌은 학자의 관측 기록에 자신의 이름이 빠진 것을 발견한다. 폭풍이 지난 밤의 풍향표에는 서로 어긋나는 화살표가 있다. 플리머스 도선사에게 기록을 보여 주기로 하고 양모 6개 납품을 맡는다.]==], [==[양모 주문을 마쳤다. 도선사는 윌의 기록을 보고 다른 항구의 관측도 찾아보라고 권한다. 윌은 이름을 되찾기 전에 숫자가 무엇을 뜻하는지 알고 싶어진다.]==] }
table.insert(Q, { id = "pr_england_2", loreCardId = "wx_great_storm", name = "바람을 이어 붙이는 밤", summary = "서막 · 이름 없는 숫자들 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "england", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "adventure", rewardXp = 70, after = "pr_england_1" })
HAND["pr_england_2"] = { [==[윌은 풍향이 모두 한쪽으로만 불었다는 설명을 의심한다. 항구를 돌아다니며 폭풍의 기록을 비교할 경험을 쌓으려 한다. 1703년 대폭풍 자료는 이런 연구의 역사적 배경이다.]==], [==[항구 방문 목표를 채웠다. 윌은 원형으로 바람이 움직였을 가능성을 노트에 적되 관측이 부족한 곳은 빈칸으로 둔다. 리스본 선주에게 보낼 기록을 준비한다.]==] }
table.insert(Q, { id = "pr_england_3", loreCardId = "goods_linen", name = "리스본에 보내는 답례", summary = "서막 · 이름 없는 숫자들 — 직물 8개를 리스본에 납품", kind = "deliver", goodId = "cloth", portId = "lisbon", amount = 8, nation = "england", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "adventure", rewardXp = 120, after = "pr_england_2" })
HAND["pr_england_3"] = { [==[리스본 선주는 폭풍에 관한 윌의 자료를 읽어 보겠다고 한다. 윌을 키운 마을의 직물 주문도 함께 맡겼다. 직물 8개를 리스본에 납품하자.]==], [==[직물 납품이 기록됐다. 윌은 마을에 고마움을 전하는 편지를 쓴다. 선주는 폭풍에 관한 설명이 실제 자료로 검토될 수 있도록 학자를 소개한다.]==] }
table.insert(Q, { id = "pr_england_4", loreCardId = "geo_trade_winds", name = "폭풍의 눈", summary = "서막 · 이름 없는 숫자들 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "england", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "adventure", rewardXp = 200, after = "pr_england_3" })
HAND["pr_england_4"] = { [==[학자는 바람의 방향과 그 변화에 관한 기록을 펼쳐 놓고 윌의 원형 그림이 아직 가설이라고 말한다. 지식 세 가지를 이해하며 관측의 근거와 빈칸을 구별해 보자.]==], [==[윌은 세 지식의 보고를 마친다. 자기 이름이 적힌 관측표를 접고 핼리의 바람 연구를 찾아갈 준비를 한다. 빈칸은 틀렸다는 표시가 아니라 다음 질문이다.]==] }
table.insert(Q, { id = "pr_netherlands_1", loreCardId = "good_cheese", name = "쓰지 않은 줄", summary = "서막 · 정해진 줄, 고르는 손 — 치즈 6개를 로테르담에 납품", kind = "deliver", goodId = "cheese", portId = "rotterdam", amount = 6, nation = "netherlands", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "trade", rewardXp = 40 })
HAND["pr_netherlands_1"] = { [==[피터는 쓰지 않은 미래 날짜의 장부에 자신의 필체로 로테르담 치즈 주문이 적혀 있는 것을 발견한다. 예정된 운명인지 누군가의 장난인지 확인하고 싶어 치즈 6개 납품을 맡는다.]==], [==[치즈 주문을 마쳤다. 피터는 장부의 예측과 실제 거래가 닮았다는 점을 기록한다. 한 번 맞았다는 사실만으로 운명이 정해졌다고 말할 수는 없다.]==] }
table.insert(Q, { id = "pr_netherlands_2", loreCardId = "finance_bill_exchange", name = "틀린 줄도 있다", summary = "서막 · 정해진 줄, 고르는 손 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "netherlands", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "trade", rewardXp = 70, after = "pr_netherlands_1" })
HAND["pr_netherlands_2"] = { [==[피터는 장부의 다른 줄도 확인하려 한다. 여러 항구의 거래 경험을 모아 맞은 예측과 틀린 예측을 함께 살펴보자.]==], [==[방문 목표를 달성했다. 피터는 맞은 줄만 기억했던 자신의 습관을 발견한다. 런던의 향신료 주문은 이번에는 예측이 아니라 계약을 기준으로 준비한다.]==] }
table.insert(Q, { id = "pr_netherlands_3", loreCardId = "geo_spice_islands", name = "반만 거는 용기", summary = "서막 · 정해진 줄, 고르는 손 — 향신료 8개를 런던에 납품", kind = "deliver", goodId = "spice", portId = "london", amount = 8, nation = "netherlands", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "trade", rewardXp = 120, after = "pr_netherlands_2" })
HAND["pr_netherlands_3"] = { [==[피터는 향신료 값이 오른다는 장부의 문장을 읽고도 모든 것을 걸지 않기로 한다. 런던의 확정된 향신료 8개 주문을 마치자.]==], [==[납품을 완료했다. 피터는 예측한 시장 가격이 아니라 실제 계약 이행을 장부에 기록한다. 불확실함을 이해할 학자의 조언이 필요하다.]==] }
table.insert(Q, { id = "pr_netherlands_4", loreCardId = "phy_pendulum", name = "확률이라는 이름", summary = "서막 · 정해진 줄, 고르는 손 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "netherlands", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 200, after = "pr_netherlands_3" })
HAND["pr_netherlands_4"] = { [==[학자는 앞날을 맞히는 일과 시간이나 가능성을 계산하는 일은 다르다고 말한다. 세 가지 지식을 보고하며 피터의 장부를 다시 읽어 보자.]==], [==[지식 목표를 채웠다. 피터는 장부 다음 줄을 자신의 손으로 쓴다. 하위헌스의 연구를 통해 아직 모르는 가능성을 알아보고 싶다.]==] }
table.insert(Q, { id = "pr_france_1", loreCardId = "goods_linen", name = "부두 상자 속의 반지", summary = "서막 · 불탄 영지의 편지 — 직물 6개를 라로셸에 납품", kind = "deliver", goodId = "cloth", portId = "la_rochelle", amount = 6, nation = "france", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "trade", rewardXp = 40 })
HAND["pr_france_1"] = { [==[불탄 영지의 시종 로랑은 라로셸 부두에서 사라진 가문의 인장 반지가 발견됐다는 편지를 받는다. 직물 6개 주문을 맡은 선주에게 반지의 사연도 물어보려 한다.]==], [==[직물 납품을 마쳤다. 선주는 이야기 속 반지의 출처가 가문 자체가 아니라 익명의 의뢰인이라고 전한다. 로랑은 반지 안쪽의 지명을 살펴본다.]==] }
table.insert(Q, { id = "pr_france_2", loreCardId = "nav_portolan", name = "안쪽에 새겨진 이름들", summary = "서막 · 불탄 영지의 편지 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "france", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "trade", rewardXp = 70, after = "pr_france_1" })
HAND["pr_france_2"] = { [==[반지에 새겨진 지명들은 가문과 거래한 사람들의 기록과 닮았다. 로랑은 영지의 명예를 되찾을 단서를 찾으려 항구 방문 경험을 쌓는다.]==], [==[방문 목표를 채웠다. 로랑은 가문을 기억하는 사람들의 사연을 조사할 실마리를 정리한다. 런던에서 마지막 증서를 보관한다는 소식을 듣는다.]==] }
table.insert(Q, { id = "pr_france_3", loreCardId = "good_wine", name = "런던의 마지막 수신인", summary = "서막 · 불탄 영지의 편지 — 와인 8개를 런던에 납품", kind = "deliver", goodId = "wine", portId = "london", amount = 8, nation = "france", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "trade", rewardXp = 120, after = "pr_france_2" })
HAND["pr_france_3"] = { [==[영지의 포도밭을 기억하는 로랑에게 런던 상인이 포도주 8개 주문을 보냈다. 그는 납품을 마치고 가문의 증서가 말하는 과거를 확인하고 싶다.]==], [==[포도주 주문을 마쳤다. 이야기 속 증서는 영지의 화재가 의도적인 결정이었을 가능성을 보여 준다. 로랑은 아버지의 명예를 위해서라도 문서의 진위를 검토하려 한다.]==] }
table.insert(Q, { id = "pr_france_4", loreCardId = "lang_manuscript_reading", name = "먹이 말해 주는 것", summary = "서막 · 불탄 영지의 편지 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "france", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 200, after = "pr_france_3" })
HAND["pr_france_4"] = { [==[로랑은 증서의 날짜와 가문의 기록이 맞지 않는 것을 발견한다. 세 가지 지식을 이해해 필사본과 문서의 근거를 비교하자.]==], [==[지식 보고를 마쳤다. 증서가 후대에 덧쓰였을 가능성을 남겼다. 로랑은 카시니의 관측 기록과 비교해 다음 조사를 준비한다.]==] }
table.insert(Q, { id = "pr_portugal_1", loreCardId = "good_salt_trade", name = "아버지의 필체로 적힌 새 장", summary = "서막 · 사우다드의 계산표 — 소금 6개를 포르투에 납품", kind = "deliver", goodId = "salt", portId = "porto", amount = 6, nation = "portugal", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "adventure", rewardXp = 40 })
HAND["pr_portugal_1"] = { [==[바다에서 돌아오지 않은 아버지를 기다리던 페드루는 일지에서 실종 뒤 날짜가 적힌 계산표를 발견한다. 포르투 도선사에게 보여 주기로 하고 소금 6개 주문을 맡는다.]==], [==[소금 납품을 마쳤다. 도선사는 이 표가 미래 날짜를 미리 적은 관측 계획일 수 있다고 말한다. 페드루는 아버지의 옛 항로를 더 알고 싶다.]==] }
table.insert(Q, { id = "pr_portugal_2", loreCardId = "nav_cross_staff", name = "표식이 찍힌 항구들", summary = "서막 · 사우다드의 계산표 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "portugal", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "adventure", rewardXp = 70, after = "pr_portugal_1" })
HAND["pr_portugal_2"] = { [==[페드루는 일지의 항구 표식과 천체 그림이 어떤 관계인지 궁금하다. 여러 항구의 방문 경험을 쌓으며 옛 도선사의 관측 기록을 비교할 준비를 한다.]==], [==[방문 목표를 채웠다. 아버지가 해와 별의 움직임을 연구했을 가능성을 기록한다. 마지막 장의 리스본 후추 주문을 살펴본다.]==] }
table.insert(Q, { id = "pr_portugal_3", loreCardId = "good_pepper", name = "후추를 고향으로", summary = "서막 · 사우다드의 계산표 — 후추 6개를 리스본에 납품", kind = "deliver", goodId = "pepper", portId = "lisbon", amount = 6, nation = "portugal", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "adventure", rewardXp = 120, after = "pr_portugal_2" })
HAND["pr_portugal_3"] = { [==[일지에 남은 리스본 후추 주문은 아버지가 마치지 못했던 항해를 떠올리게 한다. 페드루는 후추 6개를 리스본에 납품하기로 한다.]==], [==[후추 주문을 마쳤다. 페드루는 아버지가 남긴 표와 실제 납품 기록을 따로 보관한다. 표의 날짜가 일식 예측인지 학자에게 물어볼 차례다.]==] }
table.insert(Q, { id = "pr_portugal_4", loreCardId = "ast_solar_eclipse", name = "그리움이 남긴 표", summary = "서막 · 사우다드의 계산표 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "portugal", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "adventure", rewardXp = 200, after = "pr_portugal_3" })
HAND["pr_portugal_4"] = { [==[페드루는 일식 기록과 계산표를 펼쳐 놓고 아버지의 마지막 항해를 이해하고 싶다. 세 가지 지식을 보고하며 예측표와 실제 사건 기록을 구별하자.]==], [==[지식 목표를 마쳤다. 페드루는 사후의 기적보다 생전에 기록한 아버지의 노력을 기억한다. 누녜스의 항해 수학을 배울 다음 길이 열린다.]==] }
table.insert(Q, { id = "pr_ottoman_1", loreCardId = "goods_linen", name = "세 번째의 우물", summary = "서막 · 환대의 우물 — 융단 5개를 이즈미르에 납품", kind = "deliver", goodId = "carpet", portId = "smyrna", amount = 5, nation = "ottoman", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "trade", rewardXp = 40 })
HAND["pr_ottoman_1"] = { [==[카심은 대상이 같은 우물로 되돌아온 뒤 지도의 방향을 의심한다. 이즈미르 지도상에게 융단 5개를 납품하면서 지도에 남은 이상한 선을 알아보고 싶다.]==], [==[융단 납품이 기록됐다. 지도상은 서로 다른 방향 기준으로 그린 지도를 비교해 보라고 권한다. 카심은 우물이 사라졌다는 설명을 보류한다.]==] }
table.insert(Q, { id = "pr_ottoman_2", loreCardId = "nav_portolan", name = "같은 곳, 다른 자리", summary = "서막 · 환대의 우물 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "ottoman", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "trade", rewardXp = 70, after = "pr_ottoman_1" })
HAND["pr_ottoman_2"] = { [==[카심은 항구마다 해도의 방향과 표기가 다른 이유를 묻는다. 항구 방문 목표를 수행하며 지도 읽기의 여러 관점을 알아볼 토대를 마련하자.]==], [==[방문 목표를 채웠다. 같은 장소라도 지도에 표현되는 방식이 다를 수 있음을 일지에 남겼다. 베네치아 지도 공방의 주문을 준비한다.]==] }
table.insert(Q, { id = "pr_ottoman_3", loreCardId = "good_coffee", name = "베네치아의 새 지도", summary = "서막 · 환대의 우물 — 커피 6개를 베네치아 공화국에 납품", kind = "deliver", goodId = "coffee", portId = "venice", amount = 6, nation = "ottoman", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "trade", rewardXp = 120, after = "pr_ottoman_2" })
HAND["pr_ottoman_3"] = { [==[베네치아 지도 공방에서 커피 주문이 왔다. 카심은 사막에서 길 잃은 여행자를 맞던 가족의 환대 전통을 떠올리며 커피 6개를 납품하려 한다.]==], [==[커피 주문을 마쳤다. 카심은 자신의 여행기를 지도 공방에 전한다. 새 지도가 정확하다고 단정하기 전에 학자의 검토를 받기로 한다.]==] }
table.insert(Q, { id = "pr_ottoman_4", loreCardId = "lang_manuscript_reading", name = "우물이 있던 자리", summary = "서막 · 환대의 우물 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "ottoman", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 200, after = "pr_ottoman_3" })
HAND["pr_ottoman_4"] = { [==[카심은 우물의 위치를 적은 지도와 필사본을 비교한다. 세 가지 지식을 이해하며 기록의 방향과 기준에 관한 문제를 살펴보자.]==], [==[지식 목표를 채웠다. 우물의 기적을 증명하는 대신 지도에 관한 질문을 정리했다. 카티프 첼레비의 지리 문헌을 찾아가려 한다.]==] }
table.insert(Q, { id = "pr_swahili_1", loreCardId = "geo_monsoon", name = "바람이 약속을 어긴 날", summary = "서막 · 할머니의 노래 — 상아 5개를 몸바사에 납품", kind = "deliver", goodId = "ivory", portId = "mombasa", amount = 5, nation = "swahili", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "adventure", rewardXp = 40 })
HAND["pr_swahili_1"] = { [==[주마는 할머니에게 배운 바람 노래와 올해의 항해 기록이 맞지 않아 당황한다. 몸바사의 선원들이 간직한 다른 소절을 듣고 싶어 기존 상아 5개 주문을 맡는다. 상아 교역의 역사와 동물의 삶도 구별해 기록하자.]==], [==[상아 납품을 마쳤다. 주마는 바람 노래의 여러 판본에 관심을 갖는다. 이 역사적 교역을 오늘날의 거래 권유로 기록하지 않는다.]==] }
table.insert(Q, { id = "pr_swahili_2", loreCardId = "culture_oral_history", name = "노래가 달력이었다", summary = "서막 · 할머니의 노래 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "swahili", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "adventure", rewardXp = 70, after = "pr_swahili_1" })
HAND["pr_swahili_2"] = { [==[항구마다 전해지는 항해 노래에는 서로 다른 기억이 담겨 있다. 주마는 할머니의 노래를 틀렸다고 지우지 않고 여러 항구의 방문 경험을 쌓으려 한다.]==], [==[방문 목표를 채웠다. 주마는 한 소절이 모든 계절을 설명하지는 않는다고 적는다. 캘리컷의 노래꾼이 알고 있다는 다른 판본이 다음 단서다.]==] }
table.insert(Q, { id = "pr_swahili_3", loreCardId = "bot_clove_tree", name = "바다 건너의 남은 소절", summary = "서막 · 할머니의 노래 — 정향 6개를 캘리컷에 납품", kind = "deliver", goodId = "cloves", portId = "calicut", amount = 6, nation = "swahili", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "adventure", rewardXp = 120, after = "pr_swahili_2" })
HAND["pr_swahili_3"] = { [==[캘리컷 상인의 정향 6개 주문을 맡자. 주마는 인도양을 오가던 향신료와 항해 지식의 교류를 기억하며 노래꾼에게 전해 줄 편지를 준비한다.]==], [==[정향 납품을 마쳤다. 주마는 다른 소절을 전해 들었다는 이야기와 실제 바람의 기록을 구별한다. 학자에게 노래를 보여 줄 차례다.]==] }
table.insert(Q, { id = "pr_swahili_4", loreCardId = "geo_monsoon", name = "노래를 적는 학자", summary = "서막 · 할머니의 노래 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "swahili", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "adventure", rewardXp = 200, after = "pr_swahili_3" })
HAND["pr_swahili_4"] = { [==[주마는 노래를 글로 옮기면 할머니의 목소리가 사라질까 걱정한다. 세 지식을 이해해 계절풍의 기록과 구술 전통을 함께 살펴보자.]==], [==[지식 목표를 채웠다. 주마는 노래를 바람의 정확한 예언으로 바꾸지 않고 항해 경험을 전하는 기억으로 남겼다. 이븐 마지드의 항해 시를 찾아가려 한다.]==] }
table.insert(Q, { id = "pr_malabar_1", loreCardId = "good_pepper", name = "하루 먼저 우는 종", summary = "서막 · 먼저 우는 종 — 후추 6개를 코친에 납품", kind = "deliver", goodId = "pepper", portId = "cochin", amount = 6, nation = "malabar", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "trade", rewardXp = 40 })
HAND["pr_malabar_1"] = { [==[쿠티의 마을에서 배가 오기 전에 종소리가 들린다는 전승이 있다. 그는 믿음을 조롱하지 않고 소리가 들리는 환경을 궁금해한다. 코친에 후추 6개를 납품하며 항구 이야기를 살펴보려 한다.]==], [==[후추 주문을 마쳤다. 쿠티는 종소리와 배의 접근 시각을 비교할 필요가 있다고 적는다. 실제 원인을 알아냈다고 단정하지 않는다.]==] }
table.insert(Q, { id = "pr_malabar_2", loreCardId = "geo_monsoon", name = "바다가 먼저 말한다", summary = "서막 · 먼저 우는 종 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "malabar", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "trade", rewardXp = 70, after = "pr_malabar_1" })
HAND["pr_malabar_2"] = { [==[쿠티는 여러 항구의 바람과 물길에 관한 이야기를 들으며 종소리 전승이 어떻게 전해졌는지 궁금해한다. 항구 방문 경험을 쌓아 조사할 범위를 넓히자.]==], [==[방문 목표를 채웠다. 쿠티는 바다의 환경과 소리의 관측을 비교할 질문을 마련했다. 리스본 후추 거래를 맡을 차례다.]==] }
table.insert(Q, { id = "pr_malabar_3", loreCardId = "bot_pepper_vine", name = "리스본이 사는 소식", summary = "서막 · 먼저 우는 종 — 후추 8개를 리스본에 납품", kind = "deliver", goodId = "pepper", portId = "lisbon", amount = 8, nation = "malabar", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "trade", rewardXp = 120, after = "pr_malabar_2" })
HAND["pr_malabar_3"] = { [==[쿠티는 종소리 덕분에 시장을 예측할 수 있다고 주장하는 상인의 말을 의심한다. 후추 농가와의 약속에 따라 리스본에 후추 8개를 납품하자.]==], [==[납품을 마쳤다. 쿠티는 예언이 아니라 실제 계약을 지킨 일을 기록한다. 소리에 관한 질문을 학자와 검토하려 한다.]==] }
table.insert(Q, { id = "pr_malabar_4", loreCardId = "phi_scientific_method", name = "소리의 이치", summary = "서막 · 먼저 우는 종 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "malabar", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 200, after = "pr_malabar_3" })
HAND["pr_malabar_4"] = { [==[마을의 종소리를 믿는 노인과 관측을 원하는 쿠티의 의견은 다르다. 세 가지 지식을 이해하며 전승과 검증 가능한 설명을 나누어 보자.]==], [==[지식 목표를 채웠다. 쿠티는 마을의 이야기를 존중하면서도 원인에 관한 가설을 남겼다. 이티 아추탄의 자연 지식으로 다음 연구를 이어 가려 한다.]==] }
table.insert(Q, { id = "pr_japan_1", loreCardId = "good_wine", name = "울음을 터뜨린 칼", summary = "서막 · 한 번뿐인 만남 — 청주 5개를 오사카에 납품", kind = "deliver", goodId = "sake", portId = "osaka", amount = 5, nation = "japan", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "adventure", rewardXp = 40 })
HAND["pr_japan_1"] = { [==[주인을 잃은 겐지는 오사카에서 칼이 낮게 울었다는 기이한 경험을 기록한다. 납품할 청주 5개를 준비하고 대장장이에게 칼의 사연을 보여 주고 싶다.]==], [==[청주 납품을 마쳤다. 대장장이는 칼의 울음에 대한 여러 설명을 제시한다. 겐지는 전승을 믿기 전에 관찰할 자료가 필요하다고 생각한다.]==] }
table.insert(Q, { id = "pr_japan_2", loreCardId = "phy_magnetism", name = "끌리는 쪽", summary = "서막 · 한 번뿐인 만남 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "japan", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "adventure", rewardXp = 70, after = "pr_japan_1" })
HAND["pr_japan_2"] = { [==[겐지는 칼이 특정 방향을 가리킨다는 이야기와 오래된 나침반의 원리를 비교하고 싶다. 여러 항구를 방문하며 방향 기록을 조사할 경험을 쌓자.]==], [==[방문 목표를 채웠다. 겐지는 방향이 겹치는 것만으로 바다 아래의 물체를 증명할 수 없다고 적는다. 광저우의 금속 상인을 찾으려 한다.]==] }
table.insert(Q, { id = "pr_japan_3", loreCardId = "min_copper_ingot", name = "광저우의 구리 상인", summary = "서막 · 한 번뿐인 만남 — 구리 6개를 광저우에 납품", kind = "deliver", goodId = "copper", portId = "canton", amount = 6, nation = "japan", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "adventure", rewardXp = 120, after = "pr_japan_2" })
HAND["pr_japan_3"] = { [==[광저우 금속 상인이 구리 6개를 주문했다. 겐지는 금속 거래를 마치고 칼의 현상과 다른 금속의 성질을 비교할 자료를 알아보려 한다.]==], [==[구리 납품을 완료했다. 겐지는 구리와 자성을 띠는 물질을 같은 것으로 보지 않고 관련 지식을 찾기로 한다.]==] }
table.insert(Q, { id = "pr_japan_4", loreCardId = "phy_magnetism", name = "돌이 쇠를 부르는 이치", summary = "서막 · 한 번뿐인 만남 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "japan", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "adventure", rewardXp = 200, after = "pr_japan_3" })
HAND["pr_japan_4"] = { [==[학자는 쇠와 자석의 성질을 설명하며 칼이 실제로 울었다는 기록은 별도의 검토가 필요하다고 말한다. 지식 세 가지를 이해하자.]==], [==[지식 목표를 마쳤다. 겐지는 칼을 주인의 귀환을 예고하는 물건으로 보지 않기로 한다. 세키 다카카즈의 수학을 통해 자신의 방향 기록을 다시 읽고 싶다.]==] }
table.insert(Q, { id = "pr_china_1", loreCardId = "good_tea", name = "바늘이 어긋난 이유", summary = "서막 · 어머니 같은 바다의 신 — 차 6개를 샤먼에 납품", kind = "deliver", goodId = "tea", portId = "amoy", amount = 6, nation = "china", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "trade", rewardXp = 40 })
HAND["pr_china_1"] = { [==[샤먼 앞바다에서 나침반이 어긋났다는 린의 기록은 마조 신앙의 이야기와 얽혀 있다. 차 6개 주문을 맡고 나침반 장인에게 원인을 물어보려 한다.]==], [==[차 납품을 마쳤다. 장인은 나침반의 상태와 지리적 차이를 모두 검토할 필요가 있다고 말한다. 린은 바다의 여신을 탓하지 않는다.]==] }
table.insert(Q, { id = "pr_china_2", loreCardId = "relic_compass", name = "항구마다 다른 각도", summary = "서막 · 어머니 같은 바다의 신 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "china", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "trade", rewardXp = 70, after = "pr_china_1" })
HAND["pr_china_2"] = { [==[린은 여러 항구의 방향 기록이 서로 다르다는 사실에 관심을 가진다. 항구 방문 경험을 쌓으며 나침반과 실제 해도의 관계를 조사할 토대를 마련하자.]==], [==[방문 목표를 채웠다. 린은 관측값이 다를 수 있다는 질문을 일지에 남겼다. 리스본의 자기 주문을 준비한다.]==] }
table.insert(Q, { id = "pr_china_3", loreCardId = "good_porcelain", name = "리스본의 자기 값", summary = "서막 · 어머니 같은 바다의 신 — 도자기 8개를 리스본에 납품", kind = "deliver", goodId = "porcelain", portId = "lisbon", amount = 8, nation = "china", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "trade", rewardXp = 120, after = "pr_china_2" })
HAND["pr_china_3"] = { [==[리스본의 교역상은 자기 8개를 주문했다. 린은 바다를 건너는 물품과 항해 지식의 교류를 떠올리며 거래를 마치려 한다.]==], [==[자기 납품을 완료했다. 린은 물품 장부와 방향 기록을 따로 보관한다. 자북과 진북의 차이를 학자에게 물어볼 차례다.]==] }
table.insert(Q, { id = "pr_china_4", loreCardId = "phy_magnetism", name = "북쪽의 두 얼굴", summary = "서막 · 어머니 같은 바다의 신 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "china", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 200, after = "pr_china_3" })
HAND["pr_china_4"] = { [==[학자는 나침반의 방향과 지리적 북쪽이 항상 같지 않은 이유를 설명한다. 세 가지 지식을 이해하며 린의 관측 가설을 살펴보자.]==], [==[지식 목표를 채웠다. 린은 관측과 신앙을 서로 적으로 만들지 않기로 한다. 송응성의 기술 기록을 찾아가려 한다.]==] }
table.insert(Q, { id = "pr_spain_1", loreCardId = "min_silver_ore", name = "모르는 각인", summary = "서막 · 가난한 손이 캔 도시 — 은 5개를 카디스에 납품", kind = "deliver", goodId = "silver", portId = "cadiz", amount = 5, nation = "spain", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "battle", rewardXp = 40 })
HAND["pr_spain_1"] = { [==[은광에서 자란 알론소는 은괴의 낯선 각인을 보고 그 물건의 출처와 광부의 삶을 궁금해한다. 카디스에 은 5개를 납품하고 감정 기록을 알아보려 한다.]==], [==[은 주문을 마쳤다. 감정사는 각인만으로 광산을 특정하기 어렵다고 말한다. 알론소는 은이 지나온 여러 항구의 역사를 조사하려 한다.]==] }
table.insert(Q, { id = "pr_spain_2", loreCardId = "am_silver_ore_potosi", name = "각인이 있는 항구들", summary = "서막 · 가난한 손이 캔 도시 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "spain", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "battle", rewardXp = 70, after = "pr_spain_1" })
HAND["pr_spain_2"] = { [==[알론소는 은이 다른 항구에서 어떤 값으로 거래되는지 알고 싶다. 항구 방문 경험을 쌓으며 광산에서 시장까지 이어진 역사와 노동을 생각하자.]==], [==[방문 목표를 채웠다. 알론소는 모든 은괴를 추적했다고 주장하지 않고 교역과 노동의 관계를 질문으로 남긴다. 안트베르펜 주문이 다음이다.]==] }
table.insert(Q, { id = "pr_spain_3", loreCardId = "chem_indigo", name = "안트베르펜의 감정", summary = "서막 · 가난한 손이 캔 도시 — 코치닐 6개를 안트베르펀에 납품", kind = "deliver", goodId = "cochineal", portId = "antwerp", amount = 6, nation = "spain", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "battle", rewardXp = 120, after = "pr_spain_2" })
HAND["pr_spain_3"] = { [==[안트베르펜 상인이 코치닐 6개를 주문했다. 알론소는 염료의 가치 뒤에 놓인 생산자의 노동을 생각하며 기존 거래를 마치려 한다.]==], [==[코치닐 납품을 완료했다. 알론소는 염료와 은의 장부를 구분하며 생산자의 기록을 더 살펴보기로 한다.]==] }
table.insert(Q, { id = "pr_spain_4", loreCardId = "min_silver_ore", name = "은의 족보", summary = "서막 · 가난한 손이 캔 도시 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "spain", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "battle", rewardXp = 200, after = "pr_spain_3" })
HAND["pr_spain_4"] = { [==[학자는 각인과 광석 성분에 관한 자료가 있어도 정확한 출처를 단정하려면 더 많은 근거가 필요하다고 말한다. 세 지식을 이해하자.]==], [==[지식 목표를 채웠다. 알론소는 광산의 위치보다 그곳에서 일한 사람들의 삶을 잊지 않기로 한다. 아코스타의 기록을 찾아갈 준비를 한다.]==] }
table.insert(Q, { id = "pr_korea_1", loreCardId = "bot_ginseng_root", name = "배가 없는 바다의 포성", summary = "서막 · 들리지 않는 곳에 닿는 소리 — 인삼 5개를 인천에 납품", kind = "deliver", goodId = "ginseng", portId = "incheon", amount = 5, nation = "korea", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "battle", rewardXp = 40 })
HAND["pr_korea_1"] = { [==[도현은 안개 낀 바다에서 배가 보이지 않는데도 포성이 들렸던 일을 잊지 못한다. 인천의 어민이 남긴 소리 기록을 알아보기 위해 인삼 5개 주문을 맡는다.]==], [==[인삼 주문을 마쳤다. 어민의 이야기에서 날씨와 소리의 관계라는 질문을 얻었다. 도현은 잃은 동료의 기억과 실제 관측을 나누어 적는다.]==] }
table.insert(Q, { id = "pr_korea_2", loreCardId = "wx_thunderstorm", name = "소리가 오는 길", summary = "서막 · 들리지 않는 곳에 닿는 소리 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "korea", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "battle", rewardXp = 70, after = "pr_korea_1" })
HAND["pr_korea_2"] = { [==[도현은 같은 소리가 여러 항구에서 들렸다는 소문을 확인하고 싶다. 항구를 방문하며 바람과 기상 조건의 기록을 비교할 토대를 마련하자.]==], [==[방문 목표를 채웠다. 소리가 들린 원인을 확정하지 않고 기상과 소리의 관계를 질문으로 남긴다. 나가사키의 인삼 주문을 준비한다.]==] }
table.insert(Q, { id = "pr_korea_3", loreCardId = "bot_ginseng_root", name = "나가사키의 포대", summary = "서막 · 들리지 않는 곳에 닿는 소리 — 인삼 6개를 나가사키에 납품", kind = "deliver", goodId = "ginseng", portId = "nagasaki", amount = 6, nation = "korea", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "battle", rewardXp = 120, after = "pr_korea_2" })
HAND["pr_korea_3"] = { [==[나가사키에서 인삼 6개 주문이 들어왔다. 도현은 교역을 마치고 그곳 사람들이 간직한 소리와 항해의 이야기도 듣고 싶다.]==], [==[인삼 납품을 완료했다. 도현은 이웃 항구의 기록과 자신의 추억을 구분한다. 서로 다른 설명을 학자와 검토할 차례다.]==] }
table.insert(Q, { id = "pr_korea_4", loreCardId = "phi_scientific_method", name = "휘어지는 소리", summary = "서막 · 들리지 않는 곳에 닿는 소리 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "korea", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "battle", rewardXp = 200, after = "pr_korea_3" })
HAND["pr_korea_4"] = { [==[학자는 기상 조건에 따라 소리가 다르게 전해질 가능성을 이야기한다. 도현은 포성의 출처를 단정하지 않고 세 가지 지식을 이해하려 한다.]==], [==[지식 목표를 채웠다. 도현은 동료를 기억하는 마음과 소리의 원인을 알아보는 일이 함께 갈 수 있다고 적는다. 허준의 의학 기록을 찾을 준비를 한다.]==] }
table.insert(Q, { id = "pr_new_spain_1", loreCardId = "am_cacao_pod", name = "돌에 새겨진 점들", summary = "서막 · 죽은 이들의 하늘 — 카카오 6개를 캄페체에 납품", kind = "deliver", goodId = "cocoa", portId = "campeche", amount = 6, nation = "new_spain", strand = "main",
	rewardCoins = 300, rewardFame = 8, rewardCareer = "adventure", rewardXp = 40 })
HAND["pr_new_spain_1"] = { [==[마테오는 서로 다른 집안의 문화 속에서 자랐다. 돌에 새겨진 점들이 하늘을 그린 것인지 궁금해 캄페체 석공을 찾아가려 한다. 카카오 6개 주문부터 마치자.]==], [==[카카오 주문을 마쳤다. 석공은 문양의 해석에 여러 가능성이 있다고 설명한다. 마테오는 조상의 기록을 존중하며 다른 유물을 알아보고 싶다.]==] }
table.insert(Q, { id = "pr_new_spain_2", loreCardId = "am_maya_stela", name = "하늘이 새겨진 곳들", summary = "서막 · 죽은 이들의 하늘 — 서로 다른 항구 4곳 방문", kind = "visit", amount = 4, nation = "new_spain", strand = "main",
	rewardCoins = 500, rewardFame = 12, rewardCareer = "adventure", rewardXp = 70, after = "pr_new_spain_1" })
HAND["pr_new_spain_2"] = { [==[마테오는 마야 석비와 별 그림을 비교하며 문양의 의미를 알아보고자 한다. 여러 항구를 방문해 서로 다른 문화의 기록을 조사할 경험을 쌓자.]==], [==[방문 목표를 채웠다. 돌의 점을 모두 해독했다고 말하지 않고 천문과 문자에 관한 질문을 남긴다. 세비야의 은 주문을 준비한다.]==] }
table.insert(Q, { id = "pr_new_spain_3", loreCardId = "am_silver_ore_potosi", name = "세비야의 눈", summary = "서막 · 죽은 이들의 하늘 — 은 8개를 세비야에 납품", kind = "deliver", goodId = "silver", portId = "seville", amount = 8, nation = "new_spain", strand = "main",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "adventure", rewardXp = 120, after = "pr_new_spain_2" })
HAND["pr_new_spain_3"] = { [==[세비야 상인의 은 8개 주문을 맡은 마테오는 은 교역이 두 지역을 이은 역사와 그 과정에서 일한 사람들을 떠올린다. 돌의 그림은 별도의 연구 자료로 간직한다.]==], [==[은 납품을 완료했다. 마테오는 거래 장부와 천문 자료를 나누어 보관한다. 두 문화의 기록을 학자와 비교할 차례다.]==] }
table.insert(Q, { id = "pr_new_spain_4", loreCardId = "ast_old_observer", name = "돌에 적힌 천문", summary = "서막 · 죽은 이들의 하늘 — 지식 3가지를 학자에게 보고해 이해", kind = "understand", amount = 3, nation = "new_spain", strand = "main",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "adventure", rewardXp = 200, after = "pr_new_spain_3" })
HAND["pr_new_spain_4"] = { [==[학자는 문양과 실제 천체의 관계를 확인하려면 시대와 유물의 맥락이 필요하다고 말한다. 마테오는 세 가지 지식을 이해하며 해석의 근거를 찾아보려 한다.]==], [==[지식 목표를 채웠다. 마테오는 조상의 하늘을 모두 해독했다는 주장 대신 더 배울 질문을 남겼다. 시구엔사 이 공고라의 천문 연구를 찾아가려 한다.]==] }

return { Quests = Q, Hand = HAND }
