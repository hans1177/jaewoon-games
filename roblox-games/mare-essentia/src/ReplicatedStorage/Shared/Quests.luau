--!strict
-- 파일명: Quests.luau · 연속 퀘스트와 10대 항로 저널 데이터
-- 퀘스트 데이터. 진행도는 플레이어 상태에서 계산한다 (Quest 서비스 참고).

export type Quest = {
	id: string,
	name: string,
	summary: string,
	kind: string, -- "discover_card"(특정 카드 획득) | "deliver" | "discover" | "win" | "visit" | "research" | "field" | "understand" | "understand_card" | "present" | "expo" | "joint" | "port_tech" | "landmark" | "launch" | "era" | "stock" | "dividend" | "order_patrol"
	goodId: string?,
	portId: string?,
	exploreSite: string?, -- 지역 현장 퀘스트 대상 기존 탐험지 id
	difficulty: number?, -- 신규 현장 탐험 1~5단 등급
	techId: string?,
	amount: number,
	rewardCoins: number,
	rewardFame: number,
	rewardCareer: string?, -- "trade" | "adventure" | "battle"
	rewardXp: number,
	fieldId: string?, -- kind "field": 이 분야의 도감 카드 수
	disc: string?, -- kind "understand": 이 학문(astronomy/physics/chemistry/art)에서 이해한 지식 수 (없으면 전체)
	cardId: string?, -- kind "understand_card": 이 지식을 이해해야 달성
	companionId: string?, -- 이 동료와 호감도가 minAffinity 이상일 때만 나타난다
	nation: string?, -- 이 시작 국가로 시작한 플레이어에게만 보인다 (서막 메인 퀘스트)
	minAffinity: number?,
	after: string?, -- 이 퀘스트를 먼저 끝내야 보인다 (연속 퀘스트)
	rewardCardId: string?, -- 완료 보상으로 받는 도감 카드
	strand: string?, -- 스토리 갈래: main(서막) | companion(동료) | history(역사) | person(인물)
	story: string?, -- 왜 이 일을 하는가 (이야기)
	journal: { speaker: string, theme: string, basis: string, opening: string, question: string, ending: string, stage: number }?, -- 지역별 집필 저널. 백과의 사실 정의와 구분
	routeId: string?, -- 10대 이야기 항로의 안정된 식별자
	routeName: string?, -- 지역별 연속 탐험 갈래
	leadSource: string?, -- 소문·발견·사건·기록 등 단서가 전해진 형태
	cat: string?, -- kind "people": 이 분야(People.Cats)의 기록한 인물 수 (없으면 전체)
}

local Quests: { Quest } = {
	-- [버드나무 연속 연구] 16세기 현장 관찰 → 수도원 기록 비교 → 약방 검증 및 의학 보고.
	-- 기존 연구·퀘스트의 저장 키와 보상 구조를 그대로 사용한다.
	{ id = "q_willow_field", name = "강변의 버드나무", summary = "안트베르펜 강변에서 버드나무 표본을 채집", kind = "discover_card", cardId = "bot_willow",
		amount = 1, strand = "person", story = "강변에서 잎과 껍질을 함께 채집하고 다른 나무와 구별해 본다. 직업과 무관하게 누구나 시작하는 식물 조사다.",
		rewardCoins = 90, rewardFame = 4, rewardCareer = "adventure", rewardXp = 25 },
	{ id = "q_willow_notes", name = "수도원 약초원 기록", summary = "버드나무 표본을 비교해 기록", kind = "discover_card", cardId = "bot_willow_notes", after = "q_willow_field",
		amount = 1, strand = "person", story = "수도원 약초원에서 표본을 말리고 잎과 껍질을 비교한다. 약방에서 쓰기 전에 식물 기록을 먼저 완성하자.",
		rewardCoins = 140, rewardFame = 7, rewardCareer = "adventure", rewardXp = 40 },
	{ id = "q_willow_medicine", name = "약방의 의학 검증", summary = "버드나무 껍질 의학 연구 기록을 확보", kind = "discover_card", cardId = "med_willow_bark", after = "q_willow_notes",
		amount = 1, strand = "person", story = "의학에 밝은 동료나 약초원 지식을 바탕으로 약방의 기록을 완성한다. 카드에 적힌 전통적 사용은 현대 의학적 효과와 구별하고, 추후 학자에게 보고해 지식을 발전시킨다.",
		rewardCoins = 450, rewardFame = 20, rewardCareer = "adventure", rewardXp = 90 },
	{ id = "q_first_trade", name = "첫 납품", summary = "양모 5개를 암스테르담에 납품", kind = "deliver",
		goodId = "wool", portId = "amsterdam", amount = 5, rewardCoins = 150, rewardFame = 5, rewardCareer = "trade", rewardXp = 40 },
	{ id = "q_spices", name = "향신료 주문", summary = "향신료 5개를 런던에 납품", kind = "deliver",
		goodId = "spice", portId = "london", amount = 5, rewardCoins = 400, rewardFame = 10, rewardCareer = "trade", rewardXp = 60 },
	{ id = "q_coal_run", name = "석탄 수송", summary = "석탄 10개를 루앙에 납품", kind = "deliver",
		goodId = "coal", portId = "rouen", amount = 10, rewardCoins = 300, rewardFame = 8, rewardCareer = "trade", rewardXp = 50 },
	{ id = "q_first_discovery", name = "첫 발견", summary = "도감 카드 1장 발견", kind = "discover",
		amount = 1, rewardCoins = 100, rewardFame = 5, rewardCareer = "adventure", rewardXp = 40 },
	{ id = "q_naturalist", name = "박물학자", summary = "도감 카드 5장 발견", kind = "discover",
		amount = 5, rewardCoins = 400, rewardFame = 20, rewardCareer = "adventure", rewardXp = 100 },
	{ id = "q_collector", name = "수집가", summary = "도감 카드 12장 발견", kind = "discover",
		amount = 12, rewardCoins = 1500, rewardFame = 60, rewardCareer = "adventure", rewardXp = 250 },
	{ id = "q_pirate_hunt", name = "사략선 사냥", summary = "해전에서 3번 승리", kind = "win",
		amount = 3, rewardCoins = 500, rewardFame = 15, rewardCareer = "battle", rewardXp = 120, rewardCardId = "geo_pirate_waters" },
	{ id = "q_grand_tour", name = "북해 순회", summary = "서로 다른 항구 6곳 방문", kind = "visit",
		amount = 6, rewardCoins = 600, rewardFame = 20, rewardCareer = "adventure", rewardXp = 100 },
	{ id = "q_steam_dawn", name = "증기의 새벽", summary = "증기 펌프 연구 완료", kind = "research",
		techId = "steam_pump", amount = 1, rewardCoins = 500, rewardFame = 30, rewardCareer = "adventure", rewardXp = 120 },
	{ id = "q_steam_ship", name = "첫 증기선", summary = "외륜 증기선 연구 완료", kind = "research",
		techId = "steam_paddle", amount = 1, rewardCoins = 1500, rewardFame = 60, rewardCareer = "battle", rewardXp = 200 },
	{ id = "q_amber_road", name = "호박 길", summary = "호박 5개를 런던에 납품", kind = "deliver",
		goodId = "amber", portId = "london", amount = 5, rewardCoins = 900, rewardFame = 20, rewardCareer = "trade", rewardXp = 120 },
	{ id = "q_grand_tour_2", name = "유럽 일주", summary = "서로 다른 항구 10곳 방문", kind = "visit",
		amount = 10, rewardCoins = 1500, rewardFame = 50, rewardCareer = "adventure", rewardXp = 200 },
	{ id = "q_scholar_circle", name = "학자들의 모임", summary = "도감 카드 20장 발견", kind = "discover",
		amount = 20, rewardCoins = 3000, rewardFame = 100, rewardCareer = "adventure", rewardXp = 400 },
	{ id = "q_sea_wolf", name = "바다의 늑대", summary = "해전에서 10번 승리", kind = "win",
		amount = 10, rewardCoins = 2000, rewardFame = 60, rewardCareer = "battle", rewardXp = 300, rewardCardId = "relic_ship_log" },
	{ id = "q_mediterranean", name = "지중해 순항", summary = "서로 다른 항구 15곳 방문", kind = "visit",
		amount = 15, rewardCoins = 2500, rewardFame = 80, rewardCareer = "adventure", rewardXp = 300 },
	{ id = "q_silk_road", name = "비단 교역", summary = "비단 5개를 런던에 납품", kind = "deliver", goodId = "silk", portId = "london",
		amount = 5, rewardCoins = 1400, rewardFame = 30, rewardCareer = "trade", rewardXp = 160 },
	{ id = "q_whale_lamps", name = "고래기름 납품", summary = "고래기름 8개를 런던에 납품", kind = "deliver", goodId = "whale_oil", portId = "london", amount = 8, rewardCoins = 1100, rewardFame = 25, rewardCareer = "trade", rewardXp = 140 },
	{ id = "q_porcelain_hamburg", name = "도자기 주문", summary = "도자기 4개를 함부르크에 납품", kind = "deliver", goodId = "porcelain", portId = "hamburg", amount = 4, rewardCoins = 1800, rewardFame = 40, rewardCareer = "trade", rewardXp = 200 },
	{ id = "q_tin_venice", name = "주석 수출", summary = "주석 10개를 베네치아에 납품", kind = "deliver", goodId = "tin", portId = "venice", amount = 10, rewardCoins = 900, rewardFame = 20, rewardCareer = "trade", rewardXp = 120 },
	{ id = "q_coffee_stockholm", name = "북쪽의 커피", summary = "커피 6개를 스톡홀름에 납품", kind = "deliver", goodId = "coffee", portId = "stockholm", amount = 6, rewardCoins = 1300, rewardFame = 28, rewardCareer = "trade", rewardXp = 150 },
	{ id = "q_logwood_amsterdam", name = "염료 목재 상회", summary = "로그우드 8개를 암스테르담에 납품", kind = "deliver", goodId = "logwood", portId = "amsterdam", amount = 8, rewardCoins = 1200, rewardFame = 26, rewardCareer = "trade", rewardXp = 140 },
	{ id = "q_linen_seville", name = "돛과 셔츠", summary = "리넨 10개를 세비야에 납품", kind = "deliver", goodId = "linen", portId = "seville", amount = 10, rewardCoins = 800, rewardFame = 18, rewardCareer = "trade", rewardXp = 110 },
	{ id = "q_field_botany", name = "약초 도감", summary = "식물 카드 6장 발견", kind = "field", fieldId = "Botany", amount = 6, rewardCoins = 900, rewardFame = 30, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "q_field_zoology", name = "북해의 동물들", summary = "동물 카드 6장 발견", kind = "field", fieldId = "Zoology", amount = 6, rewardCoins = 900, rewardFame = 30, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "q_field_site", name = "유적 순례", summary = "유적 카드 5장 발견", kind = "field", fieldId = "Site", amount = 5, rewardCoins = 1400, rewardFame = 45, rewardCareer = "adventure", rewardXp = 200 },
	{ id = "q_field_geo", name = "바다의 지도", summary = "지리 카드 5장 발견", kind = "field", fieldId = "Geography", amount = 5, rewardCoins = 1000, rewardFame = 32, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "q_field_myth", name = "전설을 쫓아서", summary = "신화 카드 4장 발견", kind = "field", fieldId = "Myth", amount = 4, rewardCoins = 1200, rewardFame = 40, rewardCareer = "adventure", rewardXp = 180 },
	{ id = "q_field_mystery", name = "풀리지 않는 이야기", summary = "미스터리 카드 5장 발견", kind = "field", fieldId = "Mystery", amount = 5, rewardCoins = 1500, rewardFame = 45, rewardCareer = "adventure", rewardXp = 200, strand = "person", story = "기록은 남았는데 답이 없는 이야기가 있다. 사실과 소문을 가려 한 줄씩 적어 보자." },
	{ id = "q_field_lost", name = "지도의 빈 곳을 찾아서", summary = "잃어버린 대륙 카드 6장 발견", kind = "field", fieldId = "Lost", amount = 6, rewardCoins = 2500, rewardFame = 70, rewardCareer = "adventure", rewardXp = 260, strand = "person", story = "옛 지도의 가장자리에는 아직 아무도 가 보지 못한 땅이 그려져 있다. 그 땅들의 이야기를 하나씩 모아 보자." },
	{ id = "q_chr_any", name = "역사의 증인", summary = "역사의 현장 3곳 목격", kind = "chronicle", amount = 3, rewardCoins = 800, rewardFame = 25, rewardCareer = "adventure", rewardXp = 120, strand = "history", story = "항구에서 들려오는 실제 사건의 현장을 찾아가 기록으로 남기자. 사실은 사실대로, 소문은 소문대로 적는다." },
	{ id = "q_chr_astronomy", name = "하늘의 사건을 기록하다", summary = "천문학 사건 현장 2곳 목격", kind = "chronicle", disc = "astronomy", amount = 2, rewardCoins = 900, rewardFame = 28, rewardCareer = "adventure", rewardXp = 130, strand = "history", story = "항구에서 들려오는 실제 사건의 현장을 찾아가 기록으로 남기자. 사실은 사실대로, 소문은 소문대로 적는다." },
	{ id = "q_chr_medicine", name = "역병과 치료의 현장", summary = "의학 사건 현장 2곳 목격", kind = "chronicle", disc = "medicine", amount = 2, rewardCoins = 900, rewardFame = 28, rewardCareer = "adventure", rewardXp = 130, strand = "history", story = "항구에서 들려오는 실제 사건의 현장을 찾아가 기록으로 남기자. 사실은 사실대로, 소문은 소문대로 적는다." },
	{ id = "q_chr_geography", name = "새 바다가 열린 날", summary = "지리 사건 현장 2곳 목격", kind = "chronicle", disc = "geography", amount = 2, rewardCoins = 900, rewardFame = 28, rewardCareer = "adventure", rewardXp = 130, strand = "history", story = "항구에서 들려오는 실제 사건의 현장을 찾아가 기록으로 남기자. 사실은 사실대로, 소문은 소문대로 적는다." },
	{ id = "q_chr_navigation", name = "항해술이 바뀐 순간", summary = "항해술 사건 현장 2곳 목격", kind = "chronicle", disc = "navigation", amount = 2, rewardCoins = 900, rewardFame = 28, rewardCareer = "adventure", rewardXp = 130, strand = "history", story = "항구에서 들려오는 실제 사건의 현장을 찾아가 기록으로 남기자. 사실은 사실대로, 소문은 소문대로 적는다." },
	{ id = "q_chr_commerce", name = "시장이 뒤집힌 날", summary = "상업 사건 현장 2곳 목격", kind = "chronicle", disc = "commerce", amount = 2, rewardCoins = 900, rewardFame = 28, rewardCareer = "adventure", rewardXp = 130, strand = "history", story = "항구에서 들려오는 실제 사건의 현장을 찾아가 기록으로 남기자. 사실은 사실대로, 소문은 소문대로 적는다." },
	{ id = "q_chr_history", name = "전쟁과 정치의 현장", summary = "역사 사건 현장 4곳 목격", kind = "chronicle", disc = "history", amount = 4, rewardCoins = 1100, rewardFame = 32, rewardCareer = "adventure", rewardXp = 150, strand = "history", story = "항구에서 들려오는 실제 사건의 현장을 찾아가 기록으로 남기자. 사실은 사실대로, 소문은 소문대로 적는다." },
	{ id = "q_chr_architecture", name = "무너지고 다시 선 도시", summary = "건축 사건 현장 2곳 목격", kind = "chronicle", disc = "architecture", amount = 2, rewardCoins = 900, rewardFame = 28, rewardCareer = "adventure", rewardXp = 130, strand = "history", story = "항구에서 들려오는 실제 사건의 현장을 찾아가 기록으로 남기자. 사실은 사실대로, 소문은 소문대로 적는다." },
	{ id = "q_chr_10", name = "연대기 수집가", summary = "역사의 현장 10곳 목격", kind = "chronicle", amount = 10, rewardCoins = 3500, rewardFame = 90, rewardCareer = "adventure", rewardXp = 400, strand = "history", story = "항구에서 들려오는 실제 사건의 현장을 찾아가 기록으로 남기자. 사실은 사실대로, 소문은 소문대로 적는다." },
	{ id = "q_chr_draft", name = "첫 논문 초안", summary = "논문 초안 1편 쓰기", kind = "chron_draft", amount = 1, rewardCoins = 1200, rewardFame = 40, rewardCareer = "adventure", rewardXp = 200, strand = "person", story = "관찰 노트가 쌓였다면 이제 글로 엮을 차례다. 본 것과 들은 것을 가려 논문 초안을 써 보자." },
	{ id = "q_chr_paper", name = "학회지에 이름을", summary = "논문 1편 출판", kind = "chron_paper", amount = 1, rewardCoins = 3000, rewardFame = 100, rewardCareer = "adventure", rewardXp = 400, strand = "person", after = "q_chr_draft", story = "학회에서 발표를 마친 연구가 인쇄되어 퍼진다. 학자로서 첫 걸음이다." },
	{ id = "q_collector_2", name = "대수집가", summary = "도감 카드 40장 발견", kind = "discover", amount = 40, rewardCoins = 6000, rewardFame = 150, rewardCareer = "adventure", rewardXp = 700 },
	{ id = "q_collector_3", name = "백과의 주인", summary = "도감 카드 80장 발견", kind = "discover", amount = 80, rewardCoins = 15000, rewardFame = 300, rewardCareer = "adventure", rewardXp = 1500 },
	{ id = "q_sea_wolf_2", name = "북해의 지배자", summary = "해전에서 20번 승리", kind = "win", amount = 20, rewardCoins = 4500, rewardFame = 100, rewardCareer = "battle", rewardXp = 500, rewardCardId = "nav_portolan" },
	{ id = "q_sea_wolf_3", name = "전설의 제독", summary = "해전에서 40번 승리", kind = "win", amount = 40, rewardCoins = 10000, rewardFame = 200, rewardCareer = "battle", rewardXp = 1000, rewardCardId = "nav_star_compass" },
	{ id = "q_grand_tour_3", name = "북·서유럽 완전 일주", summary = "서로 다른 항구 18곳 방문", kind = "visit", amount = 18, rewardCoins = 3500, rewardFame = 100, rewardCareer = "adventure", rewardXp = 400 },
	-- 스토리 퀘스트: 동료 이야기 / 역사 참여 / 인물과 연구
	{ id = "cq_h_england", name = "바다가 내놓는 증거", summary = "도감 카드 8장 발견", kind = "discover", amount = 8, companionId = "h_england", minAffinity = 20, strand = "companion",
		story = "엘리너의 논문 마감이 다가온다. 학회는 숫자와 표본을 원한다. 바다에서 건진 발견 하나하나가 그녀를 지켜 줄 증거가 된다.",
		rewardCoins = 1000, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_netherlands", name = "독립 상사의 첫 이문", summary = "증권 거래 3번", kind = "stock", amount = 3, companionId = "h_netherlands", minAffinity = 20, strand = "companion",
		story = "얀은 길드의 독점에 맞서려 한다. 독립 상사로 인정받으려면 시장이 먼저 얀의 이름을 알아야 한다. 거래소에서 첫 거래를 쌓아 이름을 새기자.",
		rewardCoins = 1000, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_france", name = "깃발을 되찾는 설탕", summary = "설탕 8개를 루앙에 납품", kind = "deliver", goodId = "sugar", portId = "rouen", amount = 8, companionId = "h_france", minAffinity = 20, strand = "companion",
		story = "마리온의 영지는 설탕 값으로 되찾을 수 있다. 루앙 부두에 닿는 첫 설탕 배는 그녀에게 깃발 한 조각이다.",
		rewardCoins = 1300, rewardFame = 40, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_ottoman", name = "끊긴 향기의 길", summary = "후추 6개를 이스탄불에 납품", kind = "deliver", goodId = "pepper", portId = "istanbul", amount = 6, companionId = "h_ottoman", minAffinity = 20, strand = "companion",
		story = "레일라의 가게는 선반이 비었다. 이스탄불에 후추가 다시 들어오는 날, 삼 대째 이어진 문이 다시 열린다.",
		rewardCoins = 1300, rewardFame = 40, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_swahili", name = "바람의 이름을 찾아서", summary = "서로 다른 항구 8곳 방문", kind = "visit", amount = 8, companionId = "h_swahili", minAffinity = 20, strand = "companion",
		story = "아민의 계절풍 표는 항구를 돌수록 한 장씩 채워진다. 낯선 바다의 바람에 이름을 붙이는 항해다.",
		rewardCoins = 1000, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_malabar", name = "제값을 받는 길", summary = "후추 8개를 암스테르담에 납품", kind = "deliver", goodId = "pepper", portId = "amsterdam", amount = 8, companionId = "h_malabar", minAffinity = 20, strand = "companion",
		story = "라마의 마을은 후추를 제값에 판 적이 없다. 먼 시장에 직접 가져가 값을 받아 와야 마을이 숨을 쉰다.",
		rewardCoins = 1300, rewardFame = 40, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_japan", name = "바다 너머의 책장", summary = "식물 카드 3장 발견", kind = "field", fieldId = "Botany", amount = 3, companionId = "h_japan", minAffinity = 20, strand = "companion",
		story = "하루카는 돌아가서 책 한 권을 쓰고 싶어 한다. 낯선 땅의 식물 한 포기가 그 책의 첫 장이 된다.",
		rewardCoins = 1000, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_new_spain", name = "마을로 돌아가는 은", summary = "은 5개를 세비야에 납품", kind = "deliver", goodId = "silver", portId = "seville", amount = 5, companionId = "h_new_spain", minAffinity = 20, strand = "companion",
		story = "페르난도는 열한 명의 이름 앞에서 약속했다. 은이 마을로 돌아가는 길을 만들겠다고. 세비야에서 제값을 받아야 첫 길이 열린다.",
		rewardCoins = 1300, rewardFame = 40, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_portugal", name = "끊긴 일지의 다음 쪽", summary = "서로 다른 항구 12곳 방문", kind = "visit", amount = 12, companionId = "h_portugal", minAffinity = 20, strand = "companion",
		story = "이네스의 일지는 서안에서 끊겨 있다. 항구를 하나씩 건널 때마다 빈 쪽이 채워지고, 선배들이 못 이룬 길이 이어진다.",
		rewardCoins = 1300, rewardFame = 40, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "q_hist_1", name = "역사의 목격자", summary = "역사 사건 1번 겪기", kind = "history", amount = 1, strand = "history",
		story = "역사는 항구에서 먼저 들린다. 한 번이라도 큰 사건의 한복판에 서 보면, 바다 위의 일이 곧 세상의 일임을 알게 된다.",
		rewardCoins = 600, rewardFame = 25, rewardCareer = "adventure", rewardXp = 200 },
	{ id = "q_hist_2", name = "시대의 증인", summary = "역사 사건 3번 겪기", kind = "history", amount = 3, strand = "history",
		story = "사건 하나는 소문이지만 셋이 모이면 시대가 된다. 당신의 선택이 훗날 연대기에 한 줄로 남는다.",
		rewardCoins = 1200, rewardFame = 45, rewardCareer = "adventure", rewardXp = 200 },
	{ id = "q_hist_3", name = "연대기에 이름을", summary = "역사 사건 6번 겪기", kind = "history", amount = 6, strand = "history",
		story = "사람들은 사건을 기억하고, 선택한 사람을 기억한다. 당신의 배는 이제 역사의 현장을 지나는 배가 되었다.",
		rewardCoins = 2500, rewardFame = 80, rewardCareer = "adventure", rewardXp = 200 },
	{ id = "q_hist_4", name = "시대를 건넌 선장", summary = "역사 사건 10번 겪기", kind = "history", amount = 10, strand = "history",
		story = "흔들리는 시대를 열 번 건넌 선장. 항구마다 당신의 이름을 아는 노인이 한 명씩은 있다.",
		rewardCoins = 5000, rewardFame = 150, rewardCareer = "adventure", rewardXp = 200 },
	{ id = "q_person_1", name = "낯선 얼굴들", summary = "항구 인물 3명과 대화", kind = "people_talk", amount = 3, strand = "person",
		story = "한 도시를 이해하려면 장부보다 사람을 먼저 만나야 한다. 선술집 노인, 부두 아이, 약초 파는 여인. 모두 지도에 없는 이야기를 쥐고 있다.",
		rewardCoins = 500, rewardFame = 20, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "q_person_2", name = "믿을 만한 벗", summary = "인물 8명과 대화", kind = "people_talk", amount = 8, strand = "person",
		story = "몇 번의 대화가 신뢰가 되고, 신뢰가 학자의 서재 문을 연다. 사람을 얻는 자가 지식을 얻는다.",
		rewardCoins = 1200, rewardFame = 40, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "q_person_3", name = "연구를 돕는 손", summary = "학회에서 연구 발표 1회", kind = "present", amount = 1, strand = "person",
		story = "인물들과 나눈 이야기는 발표문이 되고, 발표는 학회의 문을 두드린다. 당신이 모은 이야기가 연구가 된다.",
		rewardCoins = 1500, rewardFame = 50, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "q_person_4", name = "지식의 후원자", summary = "이해한 지식 10개", kind = "understand", amount = 10, strand = "person",
		story = "만난 학자들의 지식을 하나하나 이해해 나간다. 한 사람의 호기심이 항해의 목적이 되는 순간이다.",
		rewardCoins = 3000, rewardFame = 100, rewardCareer = "adventure", rewardXp = 150 },
	-- 동료 전용 퀘스트 (호감도가 쌓이면 나타난다)
	{ id = "cq_merian", name = "메리안의 스케치북", summary = "동물 카드 3장 발견", kind = "field", fieldId = "Zoology",
		amount = 3, companionId = "c_merian", minAffinity = 20, rewardCardId = "zoo_surinam_insects",
		rewardCoins = 800, rewardFame = 30, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "cq_halley", name = "혜성의 귀환", summary = "천문 카드 3장 발견", kind = "field", fieldId = "Astronomy",
		amount = 3, companionId = "c_halley", minAffinity = 20, rewardCardId = "ast_halley_prediction",
		rewardCoins = 900, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_leeuwenhoek", name = "렌즈와 빛", summary = "물리 카드 4장 발견", kind = "field", fieldId = "Physics",
		amount = 4, companionId = "c_leeuwenhoek", minAffinity = 20, rewardCardId = "phy_lens_grinding",
		rewardCoins = 900, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_linnaeus", name = "자연의 체계", summary = "식물 카드 4장 발견", kind = "field", fieldId = "Botany",
		amount = 4, companionId = "c_linnaeus", minAffinity = 20, rewardCardId = "bot_systema_naturae",
		rewardCoins = 1200, rewardFame = 45, rewardCareer = "adventure", rewardXp = 200 },
	{ id = "cq_boyle", name = "공기 펌프 실험", summary = "유리 6개를 런던에 납품", kind = "deliver", goodId = "glass", portId = "london",
		amount = 6, companionId = "c_boyle", minAffinity = 20, rewardCardId = "che_air_pump",
		rewardCoins = 1000, rewardFame = 35, rewardCareer = "trade", rewardXp = 150 },
	{ id = "cq_papin", name = "안전 밸브", summary = "증기 윈치 연구 완료", kind = "research", techId = "steam_winch",
		amount = 1, companionId = "c_papin", minAffinity = 20, rewardCardId = "phy_safety_valve",
		rewardCoins = 1000, rewardFame = 40, rewardCareer = "adventure", rewardXp = 170 },
	-- 동료 전용 2단계 (호감도 50 이상)
	{ id = "cq2_merian", name = "열대의 변태 기록", summary = "동물 카드 8장 발견", kind = "field", fieldId = "Zoology",
		amount = 8, companionId = "c_merian", minAffinity = 50, after = "cq_merian",
		rewardCoins = 2500, rewardFame = 70, rewardCareer = "adventure", rewardXp = 400 },
	{ id = "cq2_halley", name = "별 지도 완성", summary = "천문 카드 8장 발견", kind = "field", fieldId = "Astronomy",
		amount = 8, companionId = "c_halley", minAffinity = 50, after = "cq_halley",
		rewardCoins = 2600, rewardFame = 75, rewardCareer = "adventure", rewardXp = 420 },
	{ id = "cq2_leeuwenhoek", name = "작은 세계", summary = "물리 카드 8장 발견", kind = "field", fieldId = "Physics",
		amount = 8, companionId = "c_leeuwenhoek", minAffinity = 50, after = "cq_leeuwenhoek",
		rewardCoins = 2600, rewardFame = 75, rewardCareer = "adventure", rewardXp = 420 },
	{ id = "cq2_linnaeus", name = "식물 대탐사", summary = "식물 카드 8장 발견", kind = "field", fieldId = "Botany",
		amount = 8, companionId = "c_linnaeus", minAffinity = 50, after = "cq_linnaeus",
		rewardCoins = 3000, rewardFame = 85, rewardCareer = "adventure", rewardXp = 480 },
	{ id = "cq2_boyle", name = "항해자의 호위", summary = "해전에서 10번 승리", kind = "win",
		amount = 10, companionId = "c_boyle", minAffinity = 50, after = "cq_boyle",
		rewardCoins = 2800, rewardFame = 80, rewardCareer = "battle", rewardXp = 450 },
	{ id = "cq2_papin", name = "증기 항로 개척", summary = "서로 다른 항구 25곳 방문", kind = "visit",
		amount = 25, companionId = "c_papin", minAffinity = 50, after = "cq_papin",
		rewardCoins = 3000, rewardFame = 85, rewardCareer = "adventure", rewardXp = 480 },
	{ id = "q_cod_bergen", name = "대구 납품", summary = "생선 12개를 베르겐에 납품", kind = "deliver", goodId = "fish", portId = "bergen", amount = 12, rewardCoins = 700, rewardFame = 15, rewardCareer = "trade", rewardXp = 90 },
	{ id = "q_linen_antwerp", name = "플랑드르 리넨", summary = "리넨 8개를 런던에 납품", kind = "deliver", goodId = "linen", portId = "london", amount = 8, rewardCoins = 800, rewardFame = 18, rewardCareer = "trade", rewardXp = 100 },
	{ id = "q_wine_london", name = "포도주 주문", summary = "포도주 10개를 런던에 납품", kind = "deliver", goodId = "wine", portId = "london", amount = 10, rewardCoins = 900, rewardFame = 20, rewardCareer = "trade", rewardXp = 100 },
	{ id = "q_timber_edinburgh", name = "목재 수송", summary = "목재 12개를 에든버러에 납품", kind = "deliver", goodId = "timber", portId = "edinburgh", amount = 12, rewardCoins = 700, rewardFame = 15, rewardCareer = "trade", rewardXp = 90 },
	{ id = "q_beer_copenhagen", name = "맥주 축제", summary = "맥주 10개를 코펜하겐에 납품", kind = "deliver", goodId = "beer", portId = "copenhagen", amount = 10, rewardCoins = 600, rewardFame = 12, rewardCareer = "trade", rewardXp = 80 },
	{ id = "q_olive_london", name = "지중해의 기름", summary = "올리브유 8개를 런던에 납품", kind = "deliver", goodId = "olive_oil", portId = "london", amount = 8, rewardCoins = 900, rewardFame = 20, rewardCareer = "trade", rewardXp = 100 },
	{ id = "q_silk_istanbul", name = "동방 비단", summary = "비단 5개를 암스테르담에 납품", kind = "deliver", goodId = "silk", portId = "amsterdam", amount = 5, rewardCoins = 1800, rewardFame = 40, rewardCareer = "trade", rewardXp = 160 },
	{ id = "q_amber_riga", name = "발트의 황금", summary = "호박 6개를 함부르크에 납품", kind = "deliver", goodId = "amber", portId = "hamburg", amount = 6, rewardCoins = 1300, rewardFame = 28, rewardCareer = "trade", rewardXp = 120 },
	{ id = "q_furs_petersburg", name = "북쪽의 모피", summary = "모피 6개를 베네치아에 납품", kind = "deliver", goodId = "fur", portId = "venice", amount = 6, rewardCoins = 1600, rewardFame = 32, rewardCareer = "trade", rewardXp = 140 },
	{ id = "q_wine_porto", name = "항해용 포도주", summary = "와인 10개를 런던에 납품", kind = "deliver", goodId = "wine", portId = "london", amount = 10, rewardCoins = 1000, rewardFame = 22, rewardCareer = "trade", rewardXp = 110 },
	{ id = "q_sugar_cadiz", name = "신대륙의 설탕", summary = "설탕 8개를 암스테르담에 납품", kind = "deliver", goodId = "sugar", portId = "amsterdam", amount = 8, rewardCoins = 1100, rewardFame = 24, rewardCareer = "trade", rewardXp = 110 },
	{ id = "q_salt_lubeck", name = "소금 길", summary = "소금 12개를 뤼베크에 납품", kind = "deliver", goodId = "salt", portId = "lubeck", amount = 12, rewardCoins = 700, rewardFame = 14, rewardCareer = "trade", rewardXp = 90 },
	{ id = "q_logwood_oslo", name = "북쪽의 염료", summary = "로그우드 6개를 오슬로에 납품", kind = "deliver", goodId = "logwood", portId = "oslo", amount = 6, rewardCoins = 1000, rewardFame = 22, rewardCareer = "trade", rewardXp = 110 },
	{ id = "q_med_tour", name = "지중해 대순항", summary = "서로 다른 항구 25곳 방문", kind = "visit", amount = 25, rewardCoins = 5000, rewardFame = 90, rewardCareer = "adventure", rewardXp = 420 },
	{ id = "q_world_tour", name = "유럽의 모든 항구", summary = "서로 다른 항구 40곳 방문", kind = "visit", amount = 40, rewardCoins = 9000, rewardFame = 160, rewardCareer = "adventure", rewardXp = 700 },
	{ id = "q_marble_london", name = "하얀 돌", summary = "대리석 6개를 런던에 납품", kind = "deliver", goodId = "marble", portId = "london", amount = 6, rewardCoins = 1200, rewardFame = 26, rewardCareer = "trade", rewardXp = 120 },
	{ id = "q_coral_venice", name = "붉은 보석", summary = "산호 5개를 베네치아에 납품", kind = "deliver", goodId = "coral", portId = "venice", amount = 5, rewardCoins = 1500, rewardFame = 30, rewardCareer = "trade", rewardXp = 130 },
	{ id = "q_saffron_london", name = "황금빛 향", summary = "사프란 4개를 런던에 납품", kind = "deliver", goodId = "saffron", portId = "london", amount = 4, rewardCoins = 1700, rewardFame = 34, rewardCareer = "trade", rewardXp = 140 },
	{ id = "q_carpet_amsterdam", name = "동방의 융단", summary = "융단 6개를 암스테르담에 납품", kind = "deliver", goodId = "carpet", portId = "amsterdam", amount = 6, rewardCoins = 1400, rewardFame = 28, rewardCareer = "trade", rewardXp = 130 },
	{ id = "q_incense_seville", name = "성당의 향", summary = "유향 6개를 세비야에 납품", kind = "deliver", goodId = "incense", portId = "seville", amount = 6, rewardCoins = 1300, rewardFame = 26, rewardCareer = "trade", rewardXp = 120 },
	{ id = "q_dates_hamburg", name = "사막의 단맛", summary = "대추야자 10개를 함부르크에 납품", kind = "deliver", goodId = "dates", portId = "hamburg", amount = 10, rewardCoins = 800, rewardFame = 16, rewardCareer = "trade", rewardXp = 90 },
	{ id = "q_raisins_bergen", name = "북쪽의 건포도", summary = "건포도 10개를 베르겐에 납품", kind = "deliver", goodId = "raisins", portId = "bergen", amount = 10, rewardCoins = 850, rewardFame = 16, rewardCareer = "trade", rewardXp = 90 },
	{ id = "q_cotton_rouen", name = "가벼운 천", summary = "면화 12개를 루앙에 납품", kind = "deliver", goodId = "cotton", portId = "rouen", amount = 12, rewardCoins = 800, rewardFame = 16, rewardCareer = "trade", rewardXp = 90 },
	{ id = "q_leather_amsterdam", name = "질긴 가죽", summary = "가죽 10개를 암스테르담에 납품", kind = "deliver", goodId = "leather", portId = "amsterdam", amount = 10, rewardCoins = 900, rewardFame = 18, rewardCareer = "trade", rewardXp = 100 },
	{ id = "q_pepper_hamburg", name = "검은 황금", summary = "후추 6개를 함부르크에 납품", kind = "deliver", goodId = "pepper", portId = "hamburg", amount = 6, rewardCoins = 1400, rewardFame = 28, rewardCareer = "trade", rewardXp = 130 },
	{ id = "q_gold_london", name = "황금 해안의 금", summary = "금가루 4개를 런던에 납품", kind = "deliver", goodId = "gold", portId = "london", amount = 4, rewardCoins = 2600, rewardFame = 50, rewardCareer = "trade", rewardXp = 200 },
	{ id = "q_palmoil_hamburg", name = "기름의 길", summary = "야자유 10개를 함부르크에 납품", kind = "deliver", goodId = "palm_oil", portId = "hamburg", amount = 10, rewardCoins = 900, rewardFame = 18, rewardCareer = "trade", rewardXp = 100 },
	{ id = "q_gum_amsterdam", name = "아라비아 고무", summary = "아라비아 고무 8개를 암스테르담에 납품", kind = "deliver", goodId = "gum_arabic", portId = "amsterdam", amount = 8, rewardCoins = 1000, rewardFame = 20, rewardCareer = "trade", rewardXp = 110 },
	{ id = "q_ebony_london", name = "검은 목재", summary = "흑단 6개를 런던에 납품", kind = "deliver", goodId = "ebony", portId = "london", amount = 6, rewardCoins = 1300, rewardFame = 26, rewardCareer = "trade", rewardXp = 120 },
	{ id = "q_feathers_venice", name = "귀부인의 깃털", summary = "타조 깃털 6개를 베네치아에 납품", kind = "deliver", goodId = "feathers", portId = "venice", amount = 6, rewardCoins = 1500, rewardFame = 30, rewardCareer = "trade", rewardXp = 130 },
	{ id = "q_ivory_amsterdam", name = "하얀 금", summary = "상아 5개를 암스테르담에 납품", kind = "deliver", goodId = "ivory", portId = "amsterdam", amount = 5, rewardCoins = 1800, rewardFame = 36, rewardCareer = "trade", rewardXp = 150 },
	{ id = "q_west_africa_tour", name = "서아프리카 순항", summary = "서로 다른 항구 55곳 방문", kind = "visit", amount = 55, rewardCoins = 12000, rewardFame = 200, rewardCareer = "adventure", rewardXp = 800 },
	{ id = "q_cloves_london", name = "향신료 섬의 정향", summary = "정향 4개를 런던에 납품", kind = "deliver", goodId = "cloves", portId = "london", amount = 4, rewardCoins = 2800, rewardFame = 52, rewardCareer = "trade", rewardXp = 220 },
	{ id = "q_nutmeg_amsterdam", name = "귀한 씨앗", summary = "육두구 4개를 암스테르담에 납품", kind = "deliver", goodId = "nutmeg", portId = "amsterdam", amount = 4, rewardCoins = 2900, rewardFame = 54, rewardCareer = "trade", rewardXp = 230 },
	{ id = "q_cinnamon_venice", name = "실론의 계피", summary = "계피 6개를 베네치아에 납품", kind = "deliver", goodId = "cinnamon", portId = "venice", amount = 6, rewardCoins = 1800, rewardFame = 36, rewardCareer = "trade", rewardXp = 160 },
	{ id = "q_indigo_rouen", name = "푸른 염료", summary = "인디고 8개를 루앙에 납품", kind = "deliver", goodId = "indigo", portId = "rouen", amount = 8, rewardCoins = 1500, rewardFame = 30, rewardCareer = "trade", rewardXp = 140 },
	{ id = "q_gems_istanbul", name = "궁정의 보석", summary = "보석 3개를 이스탄불에 납품", kind = "deliver", goodId = "gems", portId = "istanbul", amount = 3, rewardCoins = 3500, rewardFame = 64, rewardCareer = "trade", rewardXp = 260 },
	{ id = "q_ambergris_london", name = "바다의 향", summary = "용연향 2개를 런던에 납품", kind = "deliver", goodId = "ambergris", portId = "london", amount = 2, rewardCoins = 3200, rewardFame = 60, rewardCareer = "trade", rewardXp = 240 },
	{ id = "q_rice_lisbon", name = "인도의 쌀", summary = "쌀 15개를 리스본에 납품", kind = "deliver", goodId = "rice", portId = "lisbon", amount = 15, rewardCoins = 800, rewardFame = 16, rewardCareer = "trade", rewardXp = 90 },
	{ id = "q_pepper_goa", name = "후추 항로", summary = "후추 8개를 암스테르담에 납품", kind = "deliver", goodId = "pepper", portId = "amsterdam", amount = 8, rewardCoins = 1900, rewardFame = 38, rewardCareer = "trade", rewardXp = 170 },
	{ id = "q_indian_tour", name = "인도양 대순항", summary = "서로 다른 항구 75곳 방문", kind = "visit", amount = 75, rewardCoins = 20000, rewardFame = 300, rewardCareer = "adventure", rewardXp = 1200 },
	{ id = "q_tea_london", name = "동방의 잎", summary = "차 12개를 런던에 납품", kind = "deliver", goodId = "tea", portId = "london", amount = 12, rewardCoins = 2200, rewardFame = 44, rewardCareer = "trade", rewardXp = 190 },
	{ id = "q_porcelain_amsterdam", name = "청화 자기", summary = "자기 8개를 암스테르담에 납품", kind = "deliver", goodId = "porcelain", portId = "amsterdam", amount = 8, rewardCoins = 2400, rewardFame = 46, rewardCareer = "trade", rewardXp = 200 },
	{ id = "q_silk_venice", name = "비단길 끝", summary = "비단 8개를 베네치아에 납품", kind = "deliver", goodId = "silk", portId = "venice", amount = 8, rewardCoins = 2500, rewardFame = 48, rewardCareer = "trade", rewardXp = 210 },
	{ id = "q_lacquer_london", name = "윤나는 상자", summary = "칠기 6개를 런던에 납품", kind = "deliver", goodId = "lacquer", portId = "london", amount = 6, rewardCoins = 2000, rewardFame = 40, rewardCareer = "trade", rewardXp = 180 },
	{ id = "q_copper_amsterdam", name = "일본의 구리", summary = "구리 12개를 암스테르담에 납품", kind = "deliver", goodId = "copper", portId = "amsterdam", amount = 12, rewardCoins = 1800, rewardFame = 36, rewardCareer = "trade", rewardXp = 160 },
	{ id = "q_jade_istanbul", name = "푸른 돌", summary = "옥 3개를 이스탄불에 납품", kind = "deliver", goodId = "jade", portId = "istanbul", amount = 3, rewardCoins = 3800, rewardFame = 70, rewardCareer = "trade", rewardXp = 280 },
	{ id = "q_ginseng_venice", name = "신비한 뿌리", summary = "인삼 4개를 베네치아에 납품", kind = "deliver", goodId = "ginseng", portId = "venice", amount = 4, rewardCoins = 3200, rewardFame = 60, rewardCareer = "trade", rewardXp = 240 },
	{ id = "q_sandalwood_seville", name = "향기나는 나무", summary = "백단향 6개를 세비야에 납품", kind = "deliver", goodId = "sandalwood", portId = "seville", amount = 6, rewardCoins = 2100, rewardFame = 42, rewardCareer = "trade", rewardXp = 180 },
	{ id = "q_camphor_antwerp", name = "장뇌의 길", summary = "장뇌 6개를 안트베르펜에 납품", kind = "deliver", goodId = "camphor", portId = "antwerp", amount = 6, rewardCoins = 1800, rewardFame = 36, rewardCareer = "trade", rewardXp = 160 },
	{ id = "q_east_asia_tour", name = "동아시아 대순항", summary = "서로 다른 항구 100곳 방문", kind = "visit", amount = 100, rewardCoins = 30000, rewardFame = 400, rewardCareer = "adventure", rewardXp = 1600 },
	{ id = "q_world_tour2", name = "세계일주", summary = "서로 다른 항구 120곳 방문", kind = "visit", amount = 120, rewardCoins = 50000, rewardFame = 600, rewardCareer = "adventure", rewardXp = 2400 },
	{ id = "q_cocoa_seville", name = "신대륙의 음료", summary = "카카오 8개를 세비야에 납품", kind = "deliver", goodId = "cocoa", portId = "seville", amount = 8, rewardCoins = 1800, rewardFame = 36, rewardCareer = "trade", rewardXp = 160 },
	{ id = "q_mahogany_london", name = "붉은 목재", summary = "마호가니 6개를 런던에 납품", kind = "deliver", goodId = "mahogany", portId = "london", amount = 6, rewardCoins = 2000, rewardFame = 40, rewardCareer = "trade", rewardXp = 180 },
	{ id = "q_rum_edinburgh", name = "카리브의 술", summary = "럼 10개를 에든버러에 납품", kind = "deliver", goodId = "rum", portId = "edinburgh", amount = 10, rewardCoins = 1400, rewardFame = 28, rewardCareer = "trade", rewardXp = 130 },
	{ id = "q_logwood_antwerp", name = "보라색 염료", summary = "로그우드 8개를 안트베르펜에 납품", kind = "deliver", goodId = "logwood", portId = "antwerp", amount = 8, rewardCoins = 1500, rewardFame = 30, rewardCareer = "trade", rewardXp = 140 },
	{ id = "q_cochineal_venice", name = "붉은 가루", summary = "코치닐 3개를 베네치아에 납품", kind = "deliver", goodId = "cochineal", portId = "venice", amount = 3, rewardCoins = 3000, rewardFame = 56, rewardCareer = "trade", rewardXp = 240 },
	{ id = "q_vanilla_rouen", name = "신대륙의 향", summary = "바닐라 3개를 루앙에 납품", kind = "deliver", goodId = "vanilla", portId = "rouen", amount = 3, rewardCoins = 3200, rewardFame = 60, rewardCareer = "trade", rewardXp = 250 },
	{ id = "q_maize_lisbon", name = "신대륙의 곡식", summary = "옥수수 20개를 리스본에 납품", kind = "deliver", goodId = "maize", portId = "lisbon", amount = 20, rewardCoins = 900, rewardFame = 18, rewardCareer = "trade", rewardXp = 100 },
	{ id = "q_brazilwood_amsterdam", name = "붉은 나무", summary = "브라질나무 8개를 암스테르담에 납품", kind = "deliver", goodId = "brazilwood", portId = "amsterdam", amount = 8, rewardCoins = 1700, rewardFame = 34, rewardCareer = "trade", rewardXp = 150 },
	{ id = "q_sugar_london2", name = "달콤한 부", summary = "설탕 15개를 런던에 납품", kind = "deliver", goodId = "sugar", portId = "london", amount = 15, rewardCoins = 1800, rewardFame = 34, rewardCareer = "trade", rewardXp = 150 },
	{ id = "q_logwood_amsterdam2", name = "염료 목재 수출", summary = "로그우드 12개를 암스테르담에 납품", kind = "deliver", goodId = "logwood", portId = "amsterdam", amount = 12, rewardCoins = 1700, rewardFame = 32, rewardCareer = "trade", rewardXp = 150 },
	{ id = "q_americas_tour", name = "신대륙 대순항", summary = "서로 다른 항구 150곳 방문", kind = "visit", amount = 150, rewardCoins = 70000, rewardFame = 800, rewardCareer = "adventure", rewardXp = 3000 },
	{ id = "q_kauri_london", name = "거대한 돛대감", summary = "카우리 목재 8개를 런던에 납품", kind = "deliver", goodId = "kauri", portId = "london", amount = 8, rewardCoins = 2200, rewardFame = 44, rewardCareer = "trade", rewardXp = 190 },
	{ id = "q_sealskin_canton", name = "광저우의 모피", summary = "물개 가죽 8개를 광저우에 납품", kind = "deliver", goodId = "sealskin", portId = "canton", amount = 8, rewardCoins = 2400, rewardFame = 48, rewardCareer = "trade", rewardXp = 200 },
	{ id = "q_sandal_canton", name = "섬의 향나무", summary = "하와이 백단 6개를 광저우에 납품", kind = "deliver", goodId = "sandalwood_hi", portId = "canton", amount = 6, rewardCoins = 2600, rewardFame = 52, rewardCareer = "trade", rewardXp = 210 },
	{ id = "q_guano_hamburg", name = "밭의 비료", summary = "구아노 12개를 함부르크에 납품", kind = "deliver", goodId = "guano", portId = "hamburg", amount = 12, rewardCoins = 1600, rewardFame = 32, rewardCareer = "trade", rewardXp = 140 },
	{ id = "q_nitrate_london", name = "화약의 재료", summary = "초석 12개를 런던에 납품", kind = "deliver", goodId = "nitrate", portId = "london", amount = 12, rewardCoins = 1800, rewardFame = 36, rewardCareer = "trade", rewardXp = 150 },
	{ id = "q_pearlshell_venice", name = "무지갯빛 자개", summary = "진주 자개 8개를 베네치아에 납품", kind = "deliver", goodId = "pearl_shell", portId = "venice", amount = 8, rewardCoins = 2000, rewardFame = 40, rewardCareer = "trade", rewardXp = 180 },
	{ id = "q_pacific_tour", name = "태평양 대순항", summary = "서로 다른 항구 200곳 방문", kind = "visit", amount = 200, rewardCoins = 120000, rewardFame = 1200, rewardCareer = "adventure", rewardXp = 5000 },
	{ id = "q_gibraltar_cloth", name = "지브롤터 옷감 납품", summary = "옷감 6개를 지브롤터에 납품", kind = "deliver", goodId = "cloth", portId = "gibraltar", amount = 6, rewardCoins = 220, rewardFame = 6, rewardCareer = "trade", rewardXp = 45 },
	{ id = "q_gibraltar_iron", name = "지브롤터 철 납품", summary = "철 4개를 지브롤터에 납품", kind = "deliver", goodId = "iron", portId = "gibraltar", amount = 4, rewardCoins = 260, rewardFame = 7, rewardCareer = "trade", rewardXp = 50 },
	{ id = "q_banda_cloth", name = "반다 옷감 납품", summary = "옷감 6개를 반다에 납품", kind = "deliver", goodId = "cloth", portId = "banda", amount = 6, rewardCoins = 220, rewardFame = 6, rewardCareer = "trade", rewardXp = 45 },
	{ id = "q_banda_iron", name = "반다 철 납품", summary = "철 4개를 반다에 납품", kind = "deliver", goodId = "iron", portId = "banda", amount = 4, rewardCoins = 260, rewardFame = 7, rewardCareer = "trade", rewardXp = 50 },
	{ id = "q_darwin_cloth", name = "다윈 옷감 납품", summary = "옷감 6개를 다윈에 납품", kind = "deliver", goodId = "cloth", portId = "darwin", amount = 6, rewardCoins = 220, rewardFame = 6, rewardCareer = "trade", rewardXp = 45 },
	{ id = "q_darwin_iron", name = "다윈 철 납품", summary = "철 4개를 다윈에 납품", kind = "deliver", goodId = "iron", portId = "darwin", amount = 4, rewardCoins = 260, rewardFame = 7, rewardCareer = "trade", rewardXp = 50 },
	{ id = "q_st_helena_cloth", name = "세인트헬레나 옷감 납품", summary = "옷감 6개를 세인트헬레나에 납품", kind = "deliver", goodId = "cloth", portId = "st_helena", amount = 6, rewardCoins = 220, rewardFame = 6, rewardCareer = "trade", rewardXp = 45 },
	{ id = "q_st_helena_iron", name = "세인트헬레나 철 납품", summary = "철 4개를 세인트헬레나에 납품", kind = "deliver", goodId = "iron", portId = "st_helena", amount = 4, rewardCoins = 260, rewardFame = 7, rewardCareer = "trade", rewardXp = 50 },
	{ id = "q_st_johns_cloth", name = "세인트존스 옷감 납품", summary = "옷감 6개를 세인트존스에 납품", kind = "deliver", goodId = "cloth", portId = "st_johns", amount = 6, rewardCoins = 220, rewardFame = 6, rewardCareer = "trade", rewardXp = 45 },
	{ id = "q_st_johns_iron", name = "세인트존스 철 납품", summary = "철 4개를 세인트존스에 납품", kind = "deliver", goodId = "iron", portId = "st_johns", amount = 4, rewardCoins = 260, rewardFame = 7, rewardCareer = "trade", rewardXp = 50 },
	{ id = "q_suva_cloth", name = "수바 옷감 납품", summary = "옷감 6개를 수바에 납품", kind = "deliver", goodId = "cloth", portId = "suva", amount = 6, rewardCoins = 220, rewardFame = 6, rewardCareer = "trade", rewardXp = 45 },
	{ id = "q_suva_iron", name = "수바 철 납품", summary = "철 4개를 수바에 납품", kind = "deliver", goodId = "iron", portId = "suva", amount = 4, rewardCoins = 260, rewardFame = 7, rewardCareer = "trade", rewardXp = 50 },
	{ id = "q_tahiti_cloth", name = "파페에테 옷감 납품", summary = "옷감 6개를 파페에테에 납품", kind = "deliver", goodId = "cloth", portId = "tahiti", amount = 6, rewardCoins = 220, rewardFame = 6, rewardCareer = "trade", rewardXp = 45 },
	{ id = "q_tahiti_iron", name = "파페에테 철 납품", summary = "철 4개를 파페에테에 납품", kind = "deliver", goodId = "iron", portId = "tahiti", amount = 4, rewardCoins = 260, rewardFame = 7, rewardCareer = "trade", rewardXp = 50 },
	{ id = "q_sao_tome_cloth", name = "상투메 옷감 납품", summary = "옷감 6개를 상투메에 납품", kind = "deliver", goodId = "cloth", portId = "sao_tome", amount = 6, rewardCoins = 220, rewardFame = 6, rewardCareer = "trade", rewardXp = 45 },
	{ id = "q_sao_tome_iron", name = "상투메 철 납품", summary = "철 4개를 상투메에 납품", kind = "deliver", goodId = "iron", portId = "sao_tome", amount = 4, rewardCoins = 260, rewardFame = 7, rewardCareer = "trade", rewardXp = 50 },
	-- 지상 전술 탐험 퀘스트 (자동 보고: 조건을 채우면 알아서 보상)
	{ id = "q_kn_first", name = "첫 보고", summary = "발견한 지식 1개를 학자에게 보고해 이해하기", kind = "understand", amount = 1, rewardCoins = 200, rewardFame = 8, rewardCareer = "adventure", rewardXp = 50 },
	{ id = "q_kn_astro", name = "별을 읽는 항해사", summary = "천문학 지식 5개 이해하기", kind = "understand", disc = "astronomy", amount = 5, rewardCoins = 1200, rewardFame = 40, rewardCareer = "adventure", rewardXp = 120 },
	{ id = "q_kn_physics", name = "법칙을 찾는 사람", summary = "물리학 지식 6개 이해하기", kind = "understand", disc = "physics", amount = 6, rewardCoins = 1500, rewardFame = 45, rewardCareer = "adventure", rewardXp = 140 },
	{ id = "q_kn_chem", name = "연금술에서 화학으로", summary = "화학 지식 5개 이해하기", kind = "understand", disc = "chemistry", amount = 5, rewardCoins = 1200, rewardFame = 40, rewardCareer = "adventure", rewardXp = 120 },
	{ id = "q_kn_art", name = "거장의 공방", summary = "예술 지식 5개 이해하기", kind = "understand", disc = "art", amount = 5, rewardCoins = 1200, rewardFame = 40, rewardCareer = "adventure", rewardXp = 120 },
	{ id = "q_kn_masterpiece", name = "걸작이 완성되기까지", summary = "거장의 걸작 지식까지 이해하기 (안료·유화·초상·풍경을 차례로)", kind = "understand_card", cardId = "art_masterpiece", amount = 1, rewardCoins = 2800, rewardFame = 90, rewardCareer = "adventure", rewardXp = 220 },
	{ id = "q_kn_steam", name = "증기의 이치", summary = "뉴커먼 기관까지 이해하기 (선행 지식을 차례로 보고)", kind = "understand_card", cardId = "phy_newcomen_engine", amount = 1, rewardCoins = 2500, rewardFame = 80, rewardCareer = "adventure", rewardXp = 200 },
	{ id = "q_kn_halley", name = "하늘의 약속", summary = "핼리 혜성의 귀환 예측까지 이해하기", kind = "understand_card", cardId = "ast_halley_prediction", amount = 1, rewardCoins = 2200, rewardFame = 70, rewardCareer = "adventure", rewardXp = 180 },
	{ id = "q_kn_dye", name = "쪽빛의 비밀", summary = "쪽빛 염료 지식을 이해해 염료 교역품을 개량하기", kind = "understand_card", cardId = "chem_indigo", amount = 1, rewardCoins = 900, rewardFame = 30, rewardCareer = "trade", rewardXp = 90 },
	{ id = "q_kn_present", name = "학회 연단에 서다", summary = "학회에서 연구 발표 2번 하기", kind = "present", amount = 2, rewardCoins = 1800, rewardFame = 60, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "q_kn_expo", name = "박람회의 수상자", summary = "박람회에 개량 교역품 출품 2번 하기", kind = "expo", amount = 2, rewardCoins = 2000, rewardFame = 60, rewardCareer = "trade", rewardXp = 160 },
	{ id = "q_kn_joint", name = "학자와 나란히", summary = "학자와 함께 공동 발표 3번 하기", kind = "joint", amount = 3, rewardCoins = 2000, rewardFame = 70, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "q_kn_porttech", name = "항구의 기술을 키워라", summary = "공동 발표로 어느 항구의 한 학문 기술을 3단계까지 올리기", kind = "port_tech", amount = 3, rewardCoins = 3500, rewardFame = 100, rewardCareer = "adventure", rewardXp = 250 },
	{ id = "q_kn_landmark", name = "도시의 얼굴", summary = "항구에 박물관·천문대 같은 특수 건축물 1개 세우기", kind = "landmark", amount = 1, rewardCoins = 1500, rewardFame = 60, rewardCareer = "trade", rewardXp = 140 },
	{ id = "q_kn_launch", name = "신제품 출시", summary = "개량된 교역품으로 신제품 출시 행사 2번 열기", kind = "launch", amount = 2, rewardCoins = 2200, rewardFame = 70, rewardCareer = "trade", rewardXp = 170 },
	{ id = "q_kn_all", name = "계몽의 시대", summary = "지식 트리에서 지식 20개 이해하기", kind = "understand", amount = 20, rewardCoins = 6000, rewardFame = 150, rewardCareer = "adventure", rewardXp = 400 },
}

-- 연속 퀘스트(문명식 기술 계통): 앞 단계를 끝내야 다음 단계가 열린다. 쉬운 지식에서 어려운 지식으로, 사이사이 해전·교역·탐험 과제가 끼어든다.
-- 단계: { id, 이름, 설명, 종류, ...옵션 }  (kind "card": 그 지식 이해, "win": 해전 승리, "deliver": 납품, "discover": 도감 카드 발견)
local Chains: { { any } } = {
	{ "nav", "대양의 길잡이", {
		{ "compass", "나침반의 방향", "나침반 장미를 이해하기", "card", "nav_compass_rose" },
		{ "cross", "별의 높이를 재다", "십자 관측기를 이해하기 (대서양 횡단의 첫걸음)", "card", "nav_cross_staff" },
		{ "pirates", "길목을 지켜라", "해전에서 5번 승리", "win", 5 },
		{ "staff", "해를 등지고", "백스태프를 이해하기", "card", "nav_backstaff" },
		{ "mercator", "굽은 땅을 평평하게", "메르카토르 도법을 이해하기", "card", "nav_mercator" },
		{ "longitude", "경도를 풀어라", "경도 문제를 이해하기 (태평양 항해의 열쇠)", "card", "nav_longitude_problem" },
		{ "chrono", "흔들리지 않는 시계", "해상 시계를 이해하기", "card", "nav_chronometer" },
	} },
	{ "geo", "바람과 해류를 따라", {
		{ "trade", "무역풍을 타다", "무역풍을 이해하기", "card", "geo_trade_winds" },
		{ "cape", "희망의 곶", "희망봉을 이해하기 (인도양 항해의 열쇠)", "card", "geo_cape_good_hope" },
		{ "monsoon", "계절풍의 달력", "계절풍을 이해하기 (동남아 항해의 열쇠)", "card", "geo_monsoon" },
		{ "spice", "향신료를 싣고", "후추 20개를 암스테르담에 납품", "deliver", "pepper", "amsterdam", 20 },
		{ "magellan", "마젤란의 물길", "마젤란 해협을 이해하기", "card", "geo_straits_magellan" },
		{ "horn", "세상의 끝", "케이프혼을 이해하기", "card", "geo_cape_horn" },
	} },
	{ "steam", "증기의 시대", {
		{ "pendulum", "흔들리는 추", "진자를 이해하기", "card", "phy_pendulum" },
		{ "gravity", "떨어지는 사과", "중력을 이해하기", "card", "phy_gravity" },
		{ "boyle", "공기의 탄성", "보일의 법칙을 이해하기", "card", "phy_boyle_law" },
		{ "papin", "솥 안의 증기", "파팽의 증기 솥을 이해하기", "card", "phy_papin_digester" },
		{ "coal", "화력의 연료", "석탄 15개를 루앙에 납품", "deliver", "coal", "rouen", 15 },
		{ "engine", "증기가 바다로", "뉴커먼 기관을 이해하기", "card", "phy_newcomen_engine" },
		{ "engine_ship", "스스로 가는 배", "선박용 증기기관을 이해하기", "card", "ship_steam_engine" },
	} },
	{ "sky", "하늘의 법칙", {
		{ "polaris", "북극성", "북극성을 이해하기", "card", "ast_polaris" },
		{ "observer", "옛 관측자의 기록", "옛 관측자의 기록을 이해하기", "card", "ast_old_observer" },
		{ "jupiter", "목성의 달", "목성의 달을 이해하기", "card", "ast_jupiter_moons" },
		{ "comet", "혜성의 정체", "혜성을 이해하기", "card", "ast_comet" },
		{ "halley", "76년의 약속", "핼리의 혜성 예측을 이해하기", "card", "ast_halley_prediction" },
	} },
	{ "alchemy", "연금술에서 화학으로", {
		{ "distill", "증류의 불", "증류를 이해하기", "card", "chem_distillation" },
		{ "acid", "산과 염기", "산과 염기를 이해하기", "card", "chem_acid_base" },
		{ "powder", "화약을 다듬다", "정제 화약을 이해하기", "card", "chem_gunpowder_refine" },
		{ "battle", "새 화약의 시험", "해전에서 8번 승리", "win", 8 },
		{ "glass", "투명한 유리", "유리 제조를 이해하기", "card", "chem_glass" },
		{ "oxygen", "숨의 공기", "산소를 이해하기", "card", "chem_oxygen" },
	} },
	{ "med", "선원을 살리는 학문", {
		{ "anatomy", "몸속의 지도", "해부학을 이해하기", "card", "med_anatomy" },
		{ "surgeon", "배 위의 의사", "선상 의사를 이해하기", "card", "med_ship_surgeon" },
		{ "scurvy", "괴혈병과 라임", "괴혈병과 라임을 이해하기", "card", "med_lime_scurvy" },
		{ "quarantine", "항구의 방역", "검역을 이해하기", "card", "med_plague_quarantine" },
		{ "inoculation", "천연두를 이기다", "천연두 접종을 이해하기", "card", "med_inoculation" },
	} },
	{ "phi", "이성의 계단", {
		{ "skeptic", "의심하는 법", "회의주의를 이해하기", "card", "phi_skepticism" },
		{ "reason", "생각하는 이성", "합리주의를 이해하기", "card", "phi_rationalism" },
		{ "method", "실험하는 이성", "과학적 방법을 이해하기", "card", "phi_scientific_method" },
		{ "contract", "사회 계약", "사회 계약을 이해하기", "card", "phi_social_contract" },
		{ "light", "계몽의 빛", "계몽을 이해하기", "card", "phi_enlightenment" },
	} },
	{ "ship", "바다를 가르는 설계", {
		{ "lateen", "삼각돛", "삼각돛을 이해하기", "card", "ship_lateen" },
		{ "fluyt", "플루트선", "플루트선의 설계를 이해하기", "card", "ship_fluyt_design" },
		{ "crane", "항만 크레인", "항만 크레인을 이해하기", "card", "arch_harbor_crane" },
		{ "arsenal", "조선소 건물", "조선소 건물을 이해하기", "card", "arch_arsenal" },
		{ "dock", "건선거", "건선거를 이해하기", "card", "ship_dry_dock" },
		{ "copper", "구리를 입힌 배", "구리 피복을 이해하기", "card", "ship_copper_sheathing" },
	} },
	{ "nature", "자연의 체계", {
		{ "herbarium", "식물 표본집", "식물 표본집을 이해하기", "card", "bot_herbarium" },
		{ "binomial", "이름 붙이기", "이명법을 이해하기", "card", "bot_binomial" },
		{ "explore", "먼 나라의 식물", "도감 카드 25장 발견", "discover", 25 },
		{ "anatomy", "식물의 속", "식물 해부도를 이해하기", "card", "bot_plant_anatomy" },
		{ "systema", "자연의 체계", "자연의 체계를 이해하기", "card", "bot_systema_naturae" },
	} },
}
for _, ch in Chains do
	local prev: string? = nil
	for i, st in ch[3] do
		local id = "q_ch_" .. ch[1] .. "_" .. st[1]
		local q: any = {
			id = id, name = st[2], summary = ch[2] .. " " .. i .. "/" .. #ch[3] .. " — " .. st[3], after = prev,
			rewardCoins = 400 * i + 300, rewardFame = 15 * i + 10, rewardCareer = "adventure", rewardXp = 60 + 35 * i,
		}
		if st[4] == "card" then
			q.kind, q.cardId, q.amount = "understand_card", st[5], 1
		elseif st[4] == "win" then
			q.kind, q.amount = "win", st[5]
		elseif st[4] == "deliver" then
			q.kind, q.goodId, q.portId, q.amount = "deliver", st[5], st[6], st[7]
		else
			q.kind, q.amount = "discover", st[5]
		end
		table.insert(Quests, q :: Quest)
		prev = id
	end
end

-- 지역 대장정: 10개 해역마다 6단계 연속 퀘스트. 단계 보상으로 그 지역의 대표 유산(에픽 3장)을 받고, 마지막에 전설 유산을 얻는다.
-- 이 유산 카드는 항구 탐험으로는 나오지 않는다 (대장정을 끝내야 얻는다). 교역·학문·해전·발견·항해가 두루 필요하다.
local RegionalChains: { { any } } = {
	{ "north_sea", "북해", "amsterdam", "wool", 8, "hamburg", "porcelain", 8, "Physics", "물리", { "site_hadrian_wall", "site_skara_brae", "site_brodgar" }, "site_stonehenge" },
	{ "atlantic_europe", "대서양 연안", "lisbon", "iron", 8, "seville", "wool", 8, "Zoology", "동물", { "site_carnac", "site_newgrange", "site_rouen_cathedral" }, "site_giants_causeway" },
	{ "mediterranean", "지중해", "venice", "iron", 10, "istanbul", "glass", 8, "Architecture", "건축", { "site_pompeii", "site_pont_du_gard", "site_hagia_sophia" }, "site_parthenon" },
	{ "red_sea", "홍해와 북아프리카", "alexandria", "glass", 8, "aden", "rice", 10, "Language", "언어", { "site_petra", "site_pharos", "site_sphinx" }, "site_pyramid" },
	{ "west_africa", "서아프리카", "elmina", "cloth", 8, "ouidah", "wine", 6, "Relic", "유물", { "relic_ife_head", "site_timbuktu", "relic_benin_bronzes" }, "relic_mansa_musa" },
	{ "east_africa", "동아프리카", "kilwa", "cloth", 8, "zanzibar", "glass", 8, "Geography", "지리", { "site_kilwa", "relic_kilwa_coins", "site_cape_table" }, "site_great_zimbabwe" },
	{ "south_asia", "남아시아", "calicut", "cloth", 8, "goa", "iron", 8, "Medicine", "의학", { "site_taj_agra", "site_hampi", "site_sanchi" }, "relic_iron_pillar" },
	{ "southeast_asia", "동남아시아", "malacca", "porcelain", 8, "banda", "rice", 10, "Botany", "식물", { "site_borobudur", "site_bagan", "site_malacca_fort" }, "site_angkor" },
	{ "east_asia", "동아시아", "canton", "silver", 6, "osaka", "silk", 8, "Art", "예술", { "site_himeji", "relic_zheng_he_fleet", "relic_scroll_painting" }, "site_forbidden_city" },
	{ "americas", "아메리카", "havana", "cloth", 8, "portobelo", "iron", 8, "Mineral", "광물", { "site_tenochtitlan", "site_chichen_itza", "site_teotihuacan" }, "site_machu_picchu" },
}
for _, rc in RegionalChains do
	local rid, rname, p1, g1, a1, p2, g2, a2, fld, fname, epics, legend = rc[1], rc[2], rc[3], rc[4], rc[5], rc[6], rc[7], rc[8], rc[9], rc[10], rc[11], rc[12]
	local steps = {
		{ "첫 짐", "deliver", g1, p1, a1 },
		{ "지식", "field", fld, 3, epics[1] },
		{ "파도", "win", 4 },
		{ "큰 장", "deliver", g2, p2, a2, epics[2] },
		{ "기록", "discover", 15, epics[3] },
		{ "유산", "visit", 10, legend },
	}
	local prev: string? = nil
	for i, st in steps do
		local id = "q_rg_" .. rid .. "_" .. i
		local q: any = {
			id = id, name = rname .. "의 " .. st[1], after = prev, rewardCareer = "adventure",
			rewardCoins = if i == 6 then 8000 else 500 * i + 400, rewardFame = if i == 6 then 200 else 20 * i + 10,
			rewardXp = if i == 6 then 500 else 70 + 40 * i,
		}
		local title = rname .. " 대장정 " .. i .. "/6 — "
		if st[2] == "deliver" then
			q.kind, q.goodId, q.portId, q.amount = "deliver", st[3], st[4], st[5]
			q.summary = title .. "교역품을 " .. tostring(st[4]) .. "에 납품"
			q.rewardCardId = st[6]
		elseif st[2] == "field" then
			q.kind, q.fieldId, q.amount = "field", st[3], st[4]
			q.summary = title .. fname .. " 도감 카드 " .. st[4] .. "장 발견"
			q.rewardCardId = st[5]
		elseif st[2] == "win" then
			q.kind, q.amount = "win", st[3]
			q.summary = title .. "해전에서 " .. st[3] .. "번 승리"
		elseif st[2] == "discover" then
			q.kind, q.amount = "discover", st[3]
			q.summary = title .. "도감 카드 " .. st[3] .. "장 발견"
			q.rewardCardId = st[4]
		else
			q.kind, q.amount = "visit", st[3]
			q.summary = title .. "서로 다른 항구 " .. st[3] .. "곳 방문 (마지막 단계: 전설 유산)"
			q.rewardCardId = st[4]
		end
		table.insert(Quests, q :: Quest)
		prev = id
	end
end

-- [지역 현장 탐험 1~5단] 기존 지점·카드·서버 보상/저장 규칙을 그대로 사용한다.
-- 각 단계는 해당 항구에서만 열리고, 이전 단계의 기록을 완료해야 다음 항구 의뢰가 열린다.
-- [항로별 역사 단서] 10개 이야기 항로는 기존 6개 해역 해금 규칙과 별도로 분류한다.
-- 같은 지역에서도 소문·발견·인물 증언·기록·역사 사건이 서로 다른 진입점이 된다.
local RouteLeads: { [string]: { string } } = {
	north_sea = { "선술집 소문", "고대 유적 발견", "항구 기록", "지역 증언", "항해 일지" },
	baltic = { "교역소 소식", "선원의 구술", "광산 장부", "천문 관측", "현장 발견" },
	red_sea = { "항구 소문", "고대 화폐 발견", "낡은 해도", "선원의 증언", "역사 유적" },
	west_africa = { "계절풍 관측", "생태 조사", "역사 기록", "항구 사건", "내륙 탐험" },
	east_africa = { "어민 제보", "현지 구술", "고문서", "박물학자의 요청", "항해 지도" },
	south_asia = { "장인의 증언", "향신료 거래 소식", "사원 기록", "보석상 제보", "내륙 여행기" },
	southeast_asia = { "항구 사건", "장인의 기록", "종교 유적", "상인 소문", "현장 목격" },
	east_asia = { "갯벌 관찰", "교역소 소식", "외교 교류 기록", "측량 일지", "기상 경보" },
	americas = { "선원의 증언", "식물 표본", "고대 문명 기록", "항해 지도", "탐험가의 일지" },
	pacific = { "항구 소문", "원주민의 전승", "식물학 발견", "포경선 소식", "원정대의 기록" },
}
-- [저널 본문] 10대 항로마다 독립된 인물·갈등·반증·결말을 집필한다.
-- 실재 유적·지식카드는 도감이 정의한다. 저널의 인물과 사적인 음모·대사는 창작이며 역사적 사실로 저장하지 않는다.
-- 각 장: { 사건의 시작, 조사할 의문, 발견 후 바뀌는 판단 }. 기존 탐험·카드 보상·저장 키 불변.
local RouteJournal: { [string]: any } = {
	north_sea = {
		speaker = "해도 수리공 메이브", theme = "예언으로 팔리는 지도", basis = "고고학·해양 관측을 바탕으로 만든 가상 수사극",
		episodes = {
			{ "에든버러의 메이브가 젖은 해도를 펴 놓고 묻는다. '물범이 사라진 날, 어선도 길을 잃었어요. 누군가는 바다가 경고한 거라더군요.' 부두의 보험업자는 그 말로 항해료를 올리려 한다.", "물범의 이동과 배의 조난을 같은 원인으로 묶어도 되는가?", "해안의 생명은 징조가 아니라 환경에 반응한다. 메이브는 '바다가 화났다는 문구부터 지우죠'라며 증언 옆에 관찰 날짜를 적었다." },
			{ "메이브의 경쟁자가 돌기둥이 그려진 지도를 들고 찾아온다. '고대인들이 미래의 조수를 예언했으니 우리 해도가 틀렸다는 거요.' 사본에는 원본을 본 사람의 이름이 빠져 있다.", "스톤헨지의 실제 배치와 후대가 덧씌운 예언을 구별할 수 있는가?", "돌의 배치는 남았지만 그 목적을 단정할 답은 없다. 메이브는 반박할 수 없는 소문을 사실 칸에서 지우고, 검증하지 못한 가설로 옮겼다." },
			{ "런던의 선장들이 서로 다른 조수 시각표를 들고 싸운다. 메이브가 낮게 말한다. '한 사람은 돌을 믿고, 다른 사람은 계산을 믿어요. 그 배에는 둘 다 타고 있죠.'", "실측 조수 기록은 해도에 적힌 확신을 얼마나 뒤집는가?", "측정값에는 오차가 있어도 반복해서 확인할 길이 있다. 메이브는 거짓 예언의 인쇄판을 멈추게 했지만, 누가 그 예언을 퍼뜨렸는지는 남았다." },
			{ "북쪽 방벽의 오래된 이름을 두고 두 관리가 서로 다른 역사를 주장한다. 메이브는 승자의 지도에 지워진 경계를 보며 묻는다. '지도에서 없어졌다고 사람이 없어진 건 아니잖아요.'", "로마의 경계 기록과 지금의 해상 국경을 하나로 설명할 수 있는가?", "방벽은 과거 권력의 흔적일 뿐 오늘의 바다를 지배한다는 증거는 아니다. 메이브는 지도 가장자리에 '해석은 시대마다 바뀐다'고 썼다." },
			{ "도장이 찍힌 마지막 해도는 수리공에게까지 압수 명령이 내려온다. 메이브는 낡은 측량 기구를 탁자에 올린다. '그들이 빼앗을 수 없는 건 재는 방법이에요.'", "권위의 도장보다 재현 가능한 관측을 우선할 수 있는가?", "새 측량 기록이 만들어지자 예언으로 장사하던 사람의 힘은 약해진다. 메이브는 지도를 되찾지만 승리를 선언하지 않는다. '다음 항해가 틀렸다면 그때 또 고치면 되죠.' 이것이 그녀의 첫 번째 진짜 해도다." },
		},
	},
	baltic = {
		speaker = "항구 장부지기 리사", theme = "장부에서 사라진 뱃사람들", basis = "북유럽 해양·광업사를 바탕으로 만든 가상 미스터리",
		episodes = {
			{ "코펜하겐 세관에 똑같은 호박 상자 두 개가 도착했다. 가격은 같은데 하나엔 운송한 선원의 이름이 없다. 장부지기 리사는 그것을 지워 버리라는 지시를 받는다.", "호박의 산지와 운송 기록을 따라가면 지워진 이름의 이유를 알 수 있는가?", "호박은 해안이 기억한 물질이고 장부는 사람이 고른 기록이다. 리사는 '값은 같은데 누가 위험을 감수했는지는 다르네요'라며 장부를 덮었다." },
			{ "베르겐의 배 수리공이 뱃머리의 옛 무늬를 가리킨다. '이 문양은 유령 배 이야기가 아니라 사람 손의 흔적이오.' 리사는 호박 장부와 오래된 항해술을 비교한다.", "바이킹의 배를 전설이 아닌 기술과 이동의 증거로 읽을 수 있는가?", "선박 유산은 영웅담의 소품이 아니었다. 누가 바다를 건넜고 무엇을 나눴는지 묻기 시작하자, 지워진 사람들에 대한 리사의 질문도 구체적이 된다." },
			{ "스톡홀름의 철상인은 장부의 빈칸을 보고 어깨를 으쓱한다. '쇳값은 남겨도 광부의 이름까지 남길 필요는 없잖소.' 리사는 그 문장을 그대로 인용해 적는다.", "철의 생산과 선박의 번영 사이에서 누가 기록 밖으로 밀려났는가?", "철은 항로를 지탱했지만 그 무게를 견딘 사람은 가격표에 없었다. 리사는 '부자였던 항구'라는 표현 옆에 '누구에게?'라는 물음을 달았다." },
			{ "겨울밤 표류선의 유족이 별을 보고 배가 돌아오던 날을 기억한다. 리사는 숫자뿐인 항해일지에 처음으로 한 사람의 목소리를 옮겨 적는다.", "별의 위치를 재는 기술과 돌아오길 기다린 사람의 기억은 어떻게 다른가?", "별자리는 항해의 방향을 설명할 수 있으나 기다림을 대신 설명하지는 못한다. 리사는 두 기록을 한 장에 담되 서로 같은 증거인 양 섞지 않았다." },
			{ "팔룬 광산에서 발견한 오래된 작업 기록에는 장부의 빈칸과 닮은 생략이 있다. 리사는 서명을 강요받은 서기에게 증언을 요구하지 않는다. 대신 빠진 항목을 표시하고 원본을 보존한다.", "광산의 번영을 서술할 때 잊힌 노동의 흔적도 남길 수 있는가?", "리사는 장부의 빈칸을 채운 척하지 않았다. 누군지 확인되지 않은 사람에게 거짓 이름을 주지 않는 것도 기록자의 책임이다. 팔룬의 구리와 북쪽 바닷길은 그렇게 한 장의 정직한 역사로 이어졌다." },
		},
	},
	red_sea = {
		speaker = "해도 해독가 사피야", theme = "사라진 바다의 이름", basis = "고대 지중해·홍해 교역의 실재 무대를 사용한 허구 추적극",
		episodes = {
			{ "오랑의 절벽에서 배를 기다리던 사피야는 물새들이 향하는 방향을 말하는 노인을 만난다. 노인은 그 바다의 이름을 다른 말로 부른다. 사피야가 배운 지도엔 없는 이름이다.", "바다를 부르는 이름은 누가 정하며, 오래된 길은 무엇으로 남는가?", "철새의 경로를 본 사피야는 새가 왕국의 경계선을 모른다는 것을 깨닫는다. 그녀는 해도의 여백에 첫 번째 다른 이름을 적었다." },
			{ "튀니스의 낡은 동전에 찍힌 무늬를 두고 상인과 사제가 서로 자기 조상의 표식이라 다툰다. 사피야는 '물건 하나가 한 사람의 증언을 독점하진 않아요'라고 잘라 말한다.", "카르타고의 물질 자료와 후대의 자랑은 어디에서 갈라지는가?", "동전은 교환과 권력의 흔적을 남기지만 발행자의 모든 속마음을 증언하지는 않는다. 사피야는 무늬를 베끼고 추측의 주인을 따로 적었다." },
			{ "아덴에서 뱃사람이 건네는 해도엔 한 물길이 두 번 지워져 있다. 길드 대표는 위험해서 그렇다고 하고, 선장은 독점을 위해 지웠다고 말한다. 둘 다 남의 속마음을 단정한다.", "실제 홍해의 지형과 항로가 소문을 얼마나 검증하는가?", "물길의 형태는 기록할 수 있었지만 해도의 삭제 이유는 미해결로 남았다. 사피야는 지운 흔적을 복원하되 범인을 지어내지 않았다." },
			{ "제다 어부가 거대한 물고기를 괴물이라 부르자 선원들이 공포에 휩싸인다. 사피야는 어부를 비웃지 않고 물의 깊이와 동물의 움직임부터 기록한다.", "해양 동물에 관한 공포는 관찰을 통해 어디까지 설명할 수 있는가?", "고래상어의 기록은 괴담을 다르게 읽을 단서를 준다. 그러나 사피야는 현지인이 경계해 온 바다의 위험까지 우습게 여기지 않았다." },
			{ "페르세폴리스에서 먼 나라의 왕과 길에 관한 설명을 듣는다. 사피야는 자신이 모은 바다의 이름들을 펼친다. 왕들의 길과 뱃사람의 길은 한 장에서 맞닿지만, 어느 쪽도 다른 쪽을 전부 설명하지 못한다.", "제국의 기록에 없는 길과 사람을 역사에서 지워도 되는가?", "사피야는 지워진 이름을 모두 찾아냈다고 주장하지 않는다. 대신 유적·화폐·지형·생물의 기록을 서로 다른 목소리로 엮는다. 바다의 역사는 한 나라가 소유한 지도가 아니라는 결론이다." },
		},
	},
	west_africa = {
		speaker = "기록 보관인 아와", theme = "기억을 값을 매기지 않는 항해", basis = "대서양 교역·강제 이주와 기억의 역사를 다룬 허구의 조사 기록",
		episodes = {
			{ "세네갈 강어귀에서 바람을 읽는 아와는 항로 보험인이 가져온 낡은 일지를 거절한다. '이 종이엔 바람만 있고, 바람에 떠밀린 사람은 없네요.' 그녀는 먼저 하르마탄의 계절을 직접 확인하자고 한다.", "자연의 힘을 기록하면서 사람의 책임까지 날씨 탓으로 돌리지는 않았는가?", "마른 바람은 실제 항해 조건에 영향을 준다. 하지만 어떤 배를 어디로 보낼지는 인간의 선택이었다. 아와는 기상 칸과 책임 칸을 분리했다." },
			{ "비사고스의 맹그로브에서 길을 아는 노젓는 이가 말한다. '낯선 사람은 이 뿌리를 장애물이라 부르지만 우리에겐 돌아올 길이오.' 아와는 외부 해도에 없는 길을 듣는다.", "어떤 사람의 지도는 다른 사람의 삶을 지워 버리는가?", "맹그로브의 뿌리는 해안을 지탱한다. 아와는 현지 길잡이의 허락 없이 지도를 팔지 않기로 한다. 기록은 발견자의 소유라는 생각이 흔들린다." },
			{ "고레 섬에서 아와가 오래된 벽을 손으로 짚는다. 함께 온 상인은 거래 숫자를 알고 싶어 하지만 그녀는 먼저 침묵한 채 이름 없는 이들의 흔적을 기록한다.", "건물과 사료가 말해 주는 사실과 우리가 상상으로 메우고 싶은 공백은 어디서 갈라지는가?", "고레 섬의 기억을 하나의 숫자나 영웅담으로 줄일 수는 없다. 아와는 확인되지 않은 개인의 운명을 창작으로 덧씌우지 않겠다고 선언한다." },
			{ "엘미나의 오래된 요새 앞에서 한 서기가 '그때는 모두 거래였지'라고 변명한다. 아와는 요새의 문과 창을 가리킨다. '건물이 남았다는 건 누가 지었고 누가 갇혔는지 물을 책임도 남았다는 뜻이에요.'", "교역 시설과 권력·강제의 역사를 분리해 설명해도 되는가?", "아와의 기록은 가격표가 아니라 사람들의 선택과 피해를 중심에 둔다. 일부 기록이 사라졌다는 사실도 지우지 않는다." },
			{ "베닌 내륙 길의 코끼리 발자국을 따라가며 아와는 출항지에서 시작했던 질문을 다시 펼친다. 바람, 숲, 요새, 내륙의 길은 모두 사람의 행방을 다르게 보여 준다.", "바다가 중심이 아닌 곳에서도 한 시대의 세계사를 이어 읽을 수 있는가?", "아와는 알 수 없는 이름을 발명하지 않았다. 대신 지금 확인된 자연·건축·기억의 사실을 나란히 두고 '모르는 것'을 남긴다. 이 항로의 결말은 승리가 아니라 지워진 삶을 함부로 소비하지 않겠다는 약속이다." },
		},
	},
	east_africa = {
		speaker = "스와힐리 필경사 자라", theme = "외부인이 발견했다고 부르는 도시", basis = "인도양의 스와힐리 해상 교역사와 자연 관찰을 바탕으로 한 창작",
		episodes = {
			{ "몸바사 앞바다에서 낯선 배가 산호초를 위험한 빈 바다라 표시한다. 필경사 자라는 웃지 않는다. '빈 곳이라면 우리 어부들은 어떻게 돌아오겠어요?' 그녀는 바다뱀의 이동부터 관찰하자고 한다.", "외부 해도의 공백이 실제로도 공백이라는 뜻인가?", "산호초와 생물은 오랜 해상 생활의 조건이었다. 자라는 표본 옆에 현지 어부의 말도 함께 적는다." },
			{ "잔지바르의 골목에서 유럽인이 '우리가 이곳을 발견했다'고 말하자 자라는 이미 낡은 문턱을 가리킨다. '누가 이 돌을 먼저 닳게 했을까요?' 발자국을 따라가면 이야기가 달라진다.", "항구 도시의 역사를 방문자의 시선 하나로 설명할 수 있는가?", "도시의 길과 건물은 방문 이전에도 사람들이 살고 교류했음을 보여 준다. 자라는 '발견'이라는 단어에 누가 말하는지 기록했다." },
			{ "킬와의 조각 문 앞에서 낯선 상인이 중국의 물건을 보았다는 말로 도시 전체를 자기 나라의 창고라고 우긴다. 자라는 문의 조각을 살핀다. '이 집에서 살던 사람들의 솜씨는 어디 갔죠?'", "먼 곳의 교역품이 있다는 사실만으로 지역 문화의 주인을 바꿀 수 있는가?", "조각된 문은 스와힐리 장인의 손과 인도양 교역의 교차점을 보여 준다. 자라는 무역의 연결과 현지 문화의 주체성을 함께 적는다." },
			{ "희망봉으로 가는 길에 자라는 낯선 꽃의 표본을 받는다. 동행이 '이제 새로운 대륙의 비밀을 가졌다'고 외치자 그녀가 말한다. '표본을 가졌다고 땅까지 가진 건 아니죠.'", "자연을 관찰하는 행위와 소유권을 주장하는 행위는 같은가?", "프로테아의 기록이 남았다. 자라는 현지 자연과 그곳 사람을 설명하는 문장을 분리하고, 둘을 같은 물건으로 취급하지 않는다." },
			{ "희망봉 앞에서 선장은 이 물길이 처음 열린 길이라고 선언하려 한다. 자라가 해도를 고쳐 건넨다. '우리보다 먼저 이 바다를 건넌 이야기부터 읽어 주세요.'", "지도의 굵은 선 하나로 인도양과 아프리카 해안의 수많은 역사를 덮어도 되는가?", "항로는 길을 만드는 동시에 다른 기록을 지우기도 한다. 자라는 측량치를 마무리하고 해도 아래에 여러 목소리의 출처를 적었다. 그제야 이 지도는 여행자의 전리품이 아니라 함께 읽는 기록이 된다." },
		},
	south_asia = {
		speaker = "코친의 어망 장인 미라", theme = "누가 지식을 소유하는가", basis = "인도양의 어업·향신료·공예사를 무대로 한 창작 갈등극",
		episodes = {
			{ "코친에서 미라는 오래된 어망을 새 선주에게 팔기를 거절한다. '그물은 실만 사면 되지만 물때를 아는 사람은 살 수 없어요.' 선주는 그녀의 기술을 자기 특허처럼 떠벌린다.", "어망의 구조와 물때를 아는 경험은 누구의 지식인가?", "어망의 원리가 드러나자 선주는 도면을 독차지할 수 없음을 깨닫는다. 미라는 바다를 아는 이들의 이름을 도면 아래에 새로 적는다." },
			{ "캘리컷의 후추값이 오르자 미라의 조카는 수확량을 늘리라는 상인의 협박을 받는다. 미라는 '향신료가 사람을 먹일 수도, 가난하게 만들 수도 있지'라고 말한다.", "후추 덩굴의 생육과 가격을 같은 원리로 설명할 수 있는가?", "농사의 현실은 상인의 장부와 달랐다. 미라는 식물의 성장 기록과 교역 계약을 따로 적었고, 조카는 처음으로 자신의 조건을 말한다." },
			{ "해안 사원에서 장인은 청동상을 보며 '이 손길은 값으로 적을 수 없다'고 한다. 상인은 금속의 무게만 묻는다. 미라는 두 사람이 같은 물건을 보며 다른 것을 읽고 있다는 걸 안다.", "유물의 재료와 종교·예술의 의미 중 어느 한쪽만 남겨도 충분한가?", "청동의 제작 흔적은 물질의 증거다. 신앙의 의미는 사람들이 이어 온 설명 속에 있다. 미라는 어느 한쪽을 다른 한쪽의 거짓으로 몰지 않았다." },
			{ "실론 광산의 보석상은 사파이어를 보여 주며 선주의 후원 편지를 펼친다. 미라는 그 편지보다 광부가 들려준 작업 이야기에 귀를 기울인다.", "보석의 성질과 보석을 둘러싼 권력이 어떻게 다른 기록을 남기는가?", "사파이어는 광물로 분류할 수 있지만 가치를 만든 노동과 거래의 조건은 또 다른 이야기였다. 미라는 처음의 어망 도면에 적었던 이름들을 떠올린다." },
			{ "아그라로 이어지는 육로에서 미라는 코끼리를 따라 이동하는 사람들의 이야기를 듣는다. 바다에서 시작한 장인의 지식이 내륙의 길과 만나는 순간이다.", "동물·기술·경제·예술을 한 분야의 소유물처럼 취급할 수 있는가?", "미라는 마침내 선주에게 도면을 건넨다. 다만 맨 위엔 그 기술을 전해 온 사람들의 이름이 있다. 다섯 장의 기록은 물건을 모은 목록이 아니라 누가 세계를 일궜는지 보여 주는 증언이 되었다." },
		},
	southeast_asia = {
		speaker = "칠기 장인의 딸 란", theme = "향신료로 봉인된 편지", basis = "동남아 항만 도시·공예·향신료 교역의 역사적 배경에 창작 인물을 얹은 사건극",
		episodes = {
			{ "마닐라 성벽 안에서 란은 찢어진 편지를 줍는다. '이 상자를 연 사람은 다음 배를 믿지 마라.' 발신인의 이름은 지워졌고, 배의 화물 목록만 남아 있다.", "성벽과 항구 기록으로 편지의 출처를 어디까지 추적할 수 있는가?", "성벽은 누가 드나들 수 있었는지 보여 주지만 편지의 주인을 말해 주진 않는다. 란은 성급히 범인을 정하지 않고 화물 상자의 무늬를 베낀다." },
			{ "호이안의 칠기 장인이 그 무늬를 알아본다. '옛날 우리 공방에서 쓰던 방식이구나.' 그러나 장인은 상자 안쪽의 글씨를 보는 순간 입을 다문다.", "칠기의 제작 흔적은 상자의 여정을 어떻게 바꾸어 읽게 하는가?", "상자는 귀중품이 아니라 편지를 숨기는 용기였을지도 모른다. 란은 장인의 침묵을 죄의 증거로 몰지 않고 다음 기록을 찾는다." },
			{ "양곤의 파고다 앞에서 란은 성물과 교역품을 같은 목록에 적은 낡은 장부를 본다. 사원의 관리자는 낮게 말한다. '사람들이 산 물건과 믿은 것을 섞지 마세요.'", "건축·신앙·시장 기록을 하나의 소유 목록으로 줄일 수 있는가?", "란은 성스러운 공간과 상인의 욕망이 겹쳐 보이는 순간을 기록한다. 그러나 장부의 표기가 사원의 의미 전체를 설명한다고 생각하지 않는다." },
			{ "반다의 육두구 숲에서 화물 목록의 값이 갑자기 이해된다. 단순한 향신료 상자를 두고 배들이 다투었던 것이다. 란은 편지의 경고가 괴담보다 더 인간적인 공포였음을 느낀다.", "육두구의 경제적 가치가 왜 사람들을 위험에 빠뜨렸는가?", "란은 향신료의 생산을 식물 지식에, 거래와 폭력의 기억을 역사 기록에 각각 남긴다. 누가 편지를 썼는지는 여전히 단정할 수 없다." },
			{ "코모도 섬 근해에서 선원들이 괴물 이야기를 꺼낸다. 란은 숨겨 둔 편지를 마지막으로 펼친다. '무서운 건 도마뱀이 아니라 자기 욕망을 감추는 사람이었어.'", "기괴한 동물의 실재와 인간이 만들어 낸 공포를 구별할 수 있는가?", "괴물은 관찰 가능한 생명으로 남았고, 향신료를 둘러싼 인간의 탐욕은 별도 기록으로 남았다. 란은 찢어진 편지를 다시 봉하지 않는다. 다음 사람이 같은 함정에 빠지지 않도록 저널의 첫 장에 붙인다." },
		},
	east_asia = {
		speaker = "항해 기록관 윤", theme = "바람이 지우지 못한 편지", basis = "동아시아 해상 교류·자연 관찰·데지마 교역의 배경으로 만든 허구",
		episodes = {
			{ "인천 갯벌에서 기록관 윤은 오래된 편지의 마지막 줄을 읽는다. '바람이 바뀌면 그들이 돌아올 거다.' 동행은 예언이라고 하지만 윤은 철새가 드나드는 시기를 먼저 살핀다.", "동물의 이동을 사람의 귀환에 대한 예언으로 삼아도 되는가?", "두루미의 이동은 자연의 기록으로 남았다. 편지의 주인이 기다린 사람이 돌아왔는지는 다른 증거가 필요하다. 윤은 서둘러 희망을 사실로 만들지 않는다." },
			{ "광저우 차밭의 상인이 윤에게 밀봉된 상자를 내민다. '이 차가 바다를 건너면 답장을 받을 수 있어요.' 그러나 상자엔 수신인이 아닌 가격만 적혀 있다.", "차나무의 재배와 편지의 행방을 같은 거래 장부로 추적할 수 있는가?", "윤은 찻잎이 자라는 조건을 기록하고 편지의 이동은 따로 추적한다. 값을 매긴 물건의 기록은 사람의 안부를 대신하지 못한다." },
			{ "나가사키의 데지마에서 윤은 여러 언어가 섞인 항해 기록을 만난다. 한 문장을 둘러싸고 통역인 둘이 상반된 번역을 내놓는다. 서로가 속임수를 쓴다고 주장하지만 그 누구도 원본을 완전히 읽지 못했다.", "교류가 제한된 항구에서 전해진 번역을 어느 정도 믿을 수 있는가?", "윤은 번역을 하나로 합치지 않고 서로 다른 판본을 나란히 둔다. 편지의 의미는 선명해지는 대신 더 복잡해졌지만, 그게 정직한 진전이었다." },
			{ "에도에서 윤은 후지 산을 그린 그림과 측량 기록을 비교한다. 화가는 기억대로, 측량사는 수치대로 산을 표현한다. 둘 다 원본이라 주장하지 않는다.", "그림에 담긴 기억과 지형 관측은 서로를 부정해야 하는가?", "후지 산의 지형이 기록되자 윤은 편지의 '돌아올 길'이 실제 산줄기와 바닷길을 뜻했을 가능성을 적는다. 확정은 아니다." },
			{ "마카오 앞바다에 태풍 경보가 돈다. 윤은 마지막 항로를 기다리는 사람들을 떠올리고 예언처럼 적힌 편지 대신 관측값을 선장에게 건넨다.", "모르는 미래 앞에서 믿어야 할 것은 운명인가, 확인할 수 있는 위험인가?", "배를 돌릴지 결정하는 데 도움이 된 것은 확인한 기상 정보였다. 편지의 주인과 답장은 끝내 밝혀지지 않았다. 윤은 미해결을 기록하고도 이야기를 끝낼 수 있음을 배운다." },
		},
	americas = {
		speaker = "지도 제작자 이사벨", theme = "지도의 빈칸에 살던 사람들", basis = "아메리카의 서로 다른 자연·문화 지역을 토대로 구성한 가상 탐험기",
		episodes = {
			{ "헤시피에서 이사벨은 '아무도 살지 않는 해안'이라고 적힌 지도를 받는다. 바로 그 앞에 어부가 배를 묶고 있다. 그는 바다거북이 돌아오는 계절을 누구보다 잘 안다.", "누가 지도를 그렸기에 살아 있는 항구가 빈칸이 되었는가?", "거북의 이동을 적은 뒤 이사벨은 지도에서 '무인'이라는 글자를 지운다. 빈칸은 해안의 문제가 아니라 지도를 그린 사람의 한계였다." },
			{ "베네수엘라 해안의 카카오를 두고 상인이 '새로 발견한 황금'이라 외친다. 현지 안내자는 그 말을 듣고 오래전부터 알던 나무를 가리킨다.", "교역품의 새 가격이 곧 그 식물의 첫 역사인가?", "카카오의 생태를 기록하며 이사벨은 '우리에게 처음'과 '세상에서 처음'을 구분한다. 안내자는 처음으로 자기 말이 지도에 적힌 것을 본다." },
			{ "캄페체의 석비 앞에서 동행 학자는 문자를 다 읽지도 못하면서 몰락한 왕의 유언이라 발표하려 한다. 이사벨은 손을 잡는다. '여기 적힌 것을 먼저 읽을 수 있어야죠.'", "마야 석비의 존재와 그 내용에 대한 추측을 따로 남길 수 있는가?", "이사벨은 석비의 형태를 옮기고 해독되지 않은 문장을 미해결로 둔다. 누군가의 역사를 극적으로 꾸미는 것보다 빈칸을 인정하는 일이 어렵다." },
			{ "벨렝에 도착하자 선장이 강과 바다가 만나는 곳을 '문명 끝'이라 부른다. 배에 오른 강의 길잡이는 아무 말 없이 여러 물길을 짚어 보여 준다.", "큰 강의 지형을 한 줄짜리 해안선으로 그릴 수 있는가?", "아마존 하구는 지도보다 복잡했다. 이사벨은 물길을 수정하고 동행한 이의 이름을 함께 적는다. 문명의 끝이라던 말은 부끄러운 흔적으로 지운다." },
			{ "안데스의 긴 산줄기 앞에서 이사벨의 지도 종이가 모자란다. 여백을 접는 순간, 한때 빈칸이라 여겼던 장소들이 모두 제 목소리를 갖고 있음을 깨닫는다.", "한 사람의 지도는 세계 전체를 다 담을 수 있는가?", "이사벨은 완벽한 지도를 만들겠다는 약속을 포기한다. 대신 누가 관찰했고 무엇을 확인하지 못했는지 적은 지도를 남긴다. 여백은 정복해야 할 공백이 아니라 아직 배워야 할 세계다." },
		},
	pacific = {
		speaker = "장거리 항해사 노아", theme = "서로 다른 섬을 한 이름으로 부르지 마라", basis = "태평양과 오세아니아의 자연·지역별 지식에 가상의 항해자를 연결한 이야기",
		episodes = {
			{ "시드니에 도착한 노아는 먼 곳에서 온 선원들이 캥거루를 상상의 동물이라 비웃는 장면을 본다. 현지 길잡이는 대답 대신 발자국과 풀을 보여 준다.", "낯선 생물을 믿지 않는 것과 존재하지 않는다고 단정하는 것은 같은가?", "캥거루의 흔적이 남자 선원은 더 말하지 못한다. 노아는 '내가 모르는 생명'이라는 새 칸을 항해일지에 만든다." },
			{ "포트모르즈비에서 노아는 타로를 가꾸는 가족과 만난다. 배의 요리사는 이를 그저 낯선 곡식으로만 부른다. 가족은 흙과 물을 다루는 오랜 시간을 보여 준다.", "먹을거리의 이름만 기록하면 그곳 사람들의 지식도 함께 남는가?", "타로의 생육을 기록한 노아는 씨앗 옆에 농사의 기술을 적는다. 그들이 알려 준 일을 자기 발견으로 독점하지 않으려 한다." },
			{ "수바에선 꽃 이름을 놓고 선원 둘이 다툰다. 서로 다른 땅에서 배운 이름이 다르기 때문이다. 노아는 둘 중 하나만 정답이라 지우려던 손을 멈춘다.", "식물의 분류와 지역에서 부르는 이름을 함께 기록할 수 있는가?", "히비스커스가 도감에 들어가고 여러 이름은 일지에 남는다. 노아는 언어가 다르다는 사실이 관찰을 방해할 필요는 없다는 것을 배운다." },
			{ "다윈 앞바다에서 고래가 보이자 선원은 옛 괴물 그림을 펼친다. 노아는 단번에 비웃지 않는다. 위험한 바다에서 살아남은 사람들의 두려움도 기록할 가치가 있기 때문이다.", "동물의 실재 모습과 그 주위에 생긴 전승을 어디서 구분해야 하는가?", "혹등고래는 실제 생물로, 괴물 그림은 사람이 만든 이야기로 구분됐다. 두 기록을 남겨도 어느 쪽을 다른 쪽의 증거로 가장하지 않았다." },
			{ "오클랜드의 카우리 숲에 이르자 노아는 항로 전부에 '미지의 섬'이란 이름을 적었던 옛 지도를 꺼낸다. 그 이름 하나로 얼마나 많은 다른 삶을 뭉개 왔는지 뒤늦게 느낀다.", "서로 다른 지역의 자연·문화·언어를 하나의 낭만적 전설로 합쳐도 되는가?", "카우리의 기록까지 마치자 노아는 지도를 찢지 않고 주석을 단다. 사람들에겐 이미 각자의 이름과 지식이 있었다. 자신은 그것을 배우고 출처를 적은 방문자였을 뿐이다." },
		},
	},
}

local RegionalFieldQuests: { { any } } = {
-- [북해·브리튼] 바다의 소문이 고대 유적·조수 관측·로마 방벽 조사로 이어진다.
	{ "north_sea", "북해·브리튼", {
		{ "포스 만의 증언", "edinburgh_coast", "edinburgh", "zoo_seal", "포스 만 해안", "물범", "에든버러 부두에 어부가 나타나 물범이 사라진 물길을 묻는다. 실제로 해안을 살펴 해류와 생태의 첫 증거를 기록해." },
		{ "솔즈베리의 돌", "salisbury_plain", "london", "site_stonehenge", "솔즈베리 평원", "스톤헨지", "바다에서 모은 기록을 확인하던 중 고대 돌기둥의 방향을 표시한 지도가 발견된다. 런던에서 내륙으로 들어가 배치와 전승을 구별해 조사해." },
		{ "조수의 계산", "auto_geography_london_low", "london", "geo_tides", "런던 해안 관찰", "조수", "유적의 방향을 두고 논쟁이 벌어진다. 런던의 조수 기록과 관측값을 모아 실제 바다의 주기를 먼저 확인해." },
		{ "방벽 뒤의 이름", "hadrian_hills", "edinburgh", "site_hadrian_wall", "북쪽 로마 방벽", "하드리아누스 방벽", "북쪽 경계에 남은 로마의 돌과 항해 기록이 같은 지도를 가리킨다. 권력의 흔적과 유적의 실제 역사를 조사해." },
		{ "바다를 재는 도구", "auto_relic_london_low", "london", "relic_sextant", "런던 유물 조사", "육분의", "서로 다른 시대의 해안 기록을 맞춰 보려면 도구 자체의 원리를 확인해야 한다. 런던에서 측량 기구를 조사해 항로의 마지막 빈칸을 채워." },
	} },
	-- [발트·스칸디나비아] 교역 소문에서 바이킹 유산과 광산·천문 관측으로 확대된다.
	{ "baltic", "발트·스칸디나비아", {
		{ "호박이 흘러온 곳", "copenhagen_shore", "copenhagen", "min_amber", "외레순 해안", "호박", "코펜하겐 교역소의 호박 장부에 원산지가 빠져 있다. 해안에서 실제 표본을 찾아 바닷길의 출발점을 기록해." },
		{ "바이킹의 뱃머리", "viking_harbor", "bergen", "relic_viking_ship", "옛 바이킹 항구", "바이킹 배", "호박 운송 이야기를 따라간 선원이 오래된 북쪽 항구의 배를 증언한다. 베르겐에서 선박 구조와 역사 기록을 비교해." },
		{ "철의 가격표", "stockholm_mine", "stockholm", "min_swedish_iron", "스톡홀름 철광", "스웨덴 철", "선박 장인의 증언은 철 공급과 연결된다. 스톡홀름 광산을 조사해 무역의 변화가 실제 기술에 미친 영향을 기록해." },
		{ "북쪽 밤의 별", "auto_astronomy_copenhagen_low", "copenhagen", "ast_orion", "코펜하겐 천문 관측", "오리온자리", "장거리 항로를 설명하려면 광산과 바닷길뿐 아니라 밤하늘의 기준이 필요하다. 별을 관측하고 이전 항해 일지를 대조해." },
		{ "붉은 광산의 증거", "falun_mine", "stockholm", "min_falun_copper", "팔룬 광산", "팔룬 구리", "상인에게서 오래된 광산 장부가 도착한다. 팔룬에서 구리의 흔적을 확인하고 북쪽 세계의 교역·자원·항해 기록을 완성해." },
	} },
		{ "red_sea", "홍해·북아프리카", {
		{ "절벽의 홍학", "oran_cliffs", "oran", "zoo_flamingo", "오랑 해안 절벽", "홍학", "오랑 해안에서 물새 무리의 이동과 먹이활동을 조사해." },
		{ "카르타고 항구의 동전", "tunis_ruins2", "tunis", "relic_carthage_coin", "카르타고 항구 터", "카르타고 동전", "카르타고 옛 항구에 남은 동전의 무늬와 거래 흔적을 기록해." },
		{ "홍해의 물길", "aden_crater", "aden", "geo_red_sea", "아덴 분화구 저수지", "홍해", "아덴의 화산 지형을 따라 인도양과 이어지는 바닷길을 확인해." },
		{ "산호초의 거인", "jeddah_reef", "jeddah", "zoo_whale_shark", "홍해 산호초", "고래상어", "제다 앞 산호초에서 고래상어의 이동을 관찰해." },
		{ "페르세폴리스 원정", "muscat_persepolis", "muscat", "site_persepolis", "페르시아 내륙 원정 (페르세폴리스)", "페르세폴리스", "무스카트에서 내륙으로 떠나 고대 왕궁의 기둥과 터를 답사해." },
	} },
	{ "west_africa", "서아프리카", {
		{ "세네갈의 마른 바람", "saint_louis_river", "saint_louis", "geo_harmattan", "세네갈 강 어귀", "하르마탄", "세네갈 강 어귀에서 하르마탄 바람과 항해 조건을 관측해." },
		{ "비사고스 뿌리 숲", "bissau_mangrove", "bissau", "bot_mangrove", "비사고스 맹그로브", "맹그로브", "맹그로브의 뿌리와 바닷물의 흐름을 기록해." },
		{ "고레 섬의 기억", "goree_island", "dakar", "site_goree", "고레 섬", "고레 섬", "고레 섬의 장소와 사람들의 역사를 조사해." },
		{ "엘미나 요새 조사", "elmina_castle", "elmina", "site_elmina_castle", "엘미나 성 탐방", "엘미나 성", "해안 요새의 구조와 이곳에서 벌어진 역사를 기록해." },
		{ "베닌 내륙 길", "lagos_benin_road", "lagos", "zoo_elephant", "베닌 왕국 가는 길", "아프리카코끼리", "내륙 숲길로 향해 아프리카코끼리의 발자국을 추적해." },
	} },
	{ "east_africa", "동아프리카·희망봉", {
		{ "몸바사 산호초", "mombasa_reef", "mombasa", "zoo_sea_snake", "산호초 해안", "바다뱀", "동아프리카 산호초를 지나는 바다뱀의 움직임을 관찰해." },
		{ "스톤 타운의 골목", "zanzibar_stone", "zanzibar", "site_zanzibar_stone", "스톤 타운", "스톤 타운", "잔지바르의 옛 항구와 교역의 흔적을 조사해." },
		{ "킬와의 조각 문", "kilwa_ruins", "kilwa", "relic_swahili_door", "킬와 옛 궁전 터", "조각된 문", "킬와 옛 궁전의 스와힐리 조각 문을 기록해." },
		{ "테이블 산의 꽃", "cape_table_mountain", "cape_town", "bot_protea", "테이블 산", "프로테아", "테이블 산의 독특한 프로테아 식물을 관찰해." },
		{ "희망봉 측량", "cape_good_hope", "cape_town", "geo_cape_good_hope", "희망봉", "희망봉", "두 바다가 만나는 희망봉의 바람과 해안을 기록해." },
	} },
	{ "south_asia", "남아시아·실론", {
		{ "코친의 어망", "cochin_nets", "cochin", "site_cochin_nets", "코친 중국식 어망", "코친 중국식 어망", "코친의 고정식 어망 구조와 물때를 관찰해." },
		{ "말라바르의 후추", "calicut_pepper", "calicut", "bot_pepper_vine", "캘리컷 후추밭", "후추 덩굴", "캘리컷의 후추 덩굴과 향신료 생산 현장을 조사해." },
		{ "해안 사원의 청동상", "madras_temple", "madras", "relic_brahma_statue", "마말라푸람 해안 사원", "청동 신상", "해안 사원에 남은 청동상의 제작 흔적을 기록해." },
		{ "실론의 푸른 보석", "colombo_gems", "colombo", "min_sapphire", "라트나푸라 보석 광산", "사파이어", "라트나푸라 광산에서 사파이어를 조사해." },
		{ "아그라의 코끼리", "surat_agra", "surat", "zoo_indian_elephant", "아그라 가는 길", "인도코끼리", "수라트에서 내륙으로 향해 인도코끼리를 관찰해." },
	} },
	{ "southeast_asia", "동남아시아", {
		{ "마닐라의 성벽", "manila_walls", "manila", "site_manila_intramuros", "인트라무로스", "인트라무로스", "마닐라의 옛 성벽과 항구의 흔적을 답사해." },
		{ "호이안의 칠기", "hoi_an_lanterns", "hoi_an", "relic_lacquer_box", "호이안 옛 거리", "칠기 상자", "호이안에서 칠기 상자의 제작 기법을 조사해." },
		{ "양곤의 파고다", "rangoon_shwedagon", "rangoon", "site_shwedagon", "쉐다곤 파고다", "쉐다곤 파고다", "쉐다곤 파고다의 역사와 건축을 기록해." },
		{ "반다의 육두구", "banda_nutmeg", "banda", "bot_nutmeg_tree", "반다 육두구 숲", "육두구나무", "반다 제도에서 육두구나무의 열매를 관찰해." },
		{ "코모도 섬 탐사", "komodo_island", "makassar", "zoo_komodo", "코모도 섬", "코모도왕도마뱀", "먼 섬에서 코모도왕도마뱀을 안전하게 관찰해." },
	} },
	{ "east_asia", "동아시아", {
		{ "서해 갯벌의 두루미", "incheon_flats", "incheon", "zoo_crane", "서해 갯벌", "두루미", "인천 갯벌에서 두루미의 이동과 먹이활동을 관찰해." },
		{ "광저우의 차밭", "canton_tea", "canton", "bot_tea_plant", "차밭 언덕", "차나무", "광저우 언덕에서 차나무와 재배 방식을 조사해." },
		{ "데지마의 항해 기록", "nagasaki_dejima", "nagasaki", "site_dejima", "데지마", "데지마", "나가사키 데지마의 교류 흔적을 답사해." },
		{ "후지 산의 지형", "edo_fuji", "edo", "geo_fuji", "후지 산 전망", "후지 산", "에도에서 후지 산의 지형을 기록해." },
		{ "동아시아 태풍 관측", "typhoon_sea", "macau", "geo_typhoon", "태풍 해역", "태풍", "마카오 앞바다에서 태풍과 거친 파도를 관측해." },
	} },
	{ "americas", "아메리카", {
		{ "헤시피의 바다거북", "recife_reef", "recife", "am_turtle_green", "헤시피 암초", "푸른바다거북", "헤시피의 암초에서 푸른바다거북을 관찰해." },
		{ "카카오 해안", "laguaira_coast", "la_guaira", "am_cacao_pod", "베네수엘라 해안", "카카오 꼬투리", "베네수엘라 해안의 카카오 열매를 기록해." },
		{ "마야의 석비", "campeche_maya", "campeche", "am_maya_stela", "마야 해안 유적", "마야 석비", "캄페체 해안 유적의 마야 석비를 조사해." },
		{ "아마존 하구", "belem_amazon", "belem", "geo_amazon_mouth", "아마존 하구", "아마존 강 어귀", "벨렝에서 거대한 강과 바다가 만나는 지형을 측량해." },
		{ "안데스 횡단", "andes_route", "buenos_aires", "geo_andes", "안데스 횡단", "안데스 산맥", "남미 산줄기를 넘어 안데스의 지형을 기록해." },
	} },
	{ "pacific", "태평양·오세아니아", {
		{ "호주 해안의 캥거루", "pac_survey_00", "sydney", "pac_kangaroo", "시드니 일대 탐사 1", "캥거루", "시드니 해안의 캥거루 서식지를 찾아 관찰해." },
		{ "파푸아의 타로", "pac_survey_05", "port_moresby", "pac_taro", "포트모르즈비 일대 탐사 6", "타로", "포트모르즈비 주변의 타로 작물을 조사해." },
		{ "피지의 꽃", "pac_survey_06", "suva", "pac_hibiscus", "수바 일대 탐사 7", "히비스커스", "수바 주변 열대 숲의 히비스커스를 기록해." },
		{ "북부 바다의 고래", "pac_survey_03", "darwin", "pac_humpback", "다윈 일대 탐사 4", "혹등고래", "다윈 북부 해안에서 혹등고래를 관찰해." },
		{ "카우리 숲 원정", "pac_survey_04", "auckland", "pac_kauri_tree", "오클랜드 일대 탐사 5", "카우리 나무", "오클랜드의 카우리 숲으로 장거리 답사를 떠나." },
	} },
}
for _, route in RegionalFieldQuests do
	local prev: string? = nil
	for stage, mission in route[3] do
		local id = "q_field_" .. route[1] .. "_" .. tostring(stage)
		local routeStory = RouteJournal[route[1]]
		local chapter = routeStory and routeStory.episodes[stage]
		local journal = if chapter then {
			speaker = routeStory.speaker, theme = routeStory.theme, basis = routeStory.basis,
			opening = chapter[1], question = chapter[2], ending = chapter[3], stage = stage,
		} else nil
		local quest: Quest = {
			id = id, name = route[2] .. " · " .. mission[1],
			routeId = route[1], routeName = route[2],
			leadSource = (RouteLeads[route[1]] or {})[stage] or "탐험 소식",
			journal = journal,
			kind = "discover_card", exploreSite = mission[2], portId = mission[3], cardId = mission[4],
			amount = 1, after = prev, difficulty = stage, strand = "history",
			summary = string.format("제%d장/5 · %s · 확인할 증거: %s", stage, journal and journal.question or mission[7], mission[6]),
			story = mission[7],
			rewardCoins = 90 + stage * 115, rewardFame = 4 + stage * 4,
			rewardCareer = "adventure", rewardXp = 25 + stage * 24,
		}
		table.insert(Quests, quest)
		prev = id
	end
end

-- 증권거래소: 주식을 거래하고 배당을 받는 연속 퀘스트
table.insert(Quests, { id = "q_stock_1", name = "첫 주주", summary = "증권거래소에서 주식 거래 3번 하기 (암스테르담·런던)", kind = "stock", amount = 3, rewardCoins = 600, rewardFame = 20, rewardCareer = "trade", rewardXp = 90 } :: Quest)
table.insert(Quests, { id = "q_stock_2", name = "배당의 맛", summary = "주식 배당으로 코인 1000 받기", kind = "dividend", amount = 1000, after = "q_stock_1", rewardCoins = 1500, rewardFame = 40, rewardCareer = "trade", rewardXp = 160 } :: Quest)
table.insert(Quests, { id = "q_stock_3", name = "큰손", summary = "주식 거래 20번 하기", kind = "stock", amount = 20, after = "q_stock_2", rewardCoins = 4000, rewardFame = 90, rewardCareer = "trade", rewardXp = 300 } :: Quest)

-- 인물 백과: 항구·학자·사건으로 인물을 기록하는 연속 퀘스트와 분야별 퀘스트
do
	local chain = {
		{ n = 5, name = "백과의 첫 쪽", coins = 300, fame = 10 },
		{ n = 20, name = "세계의 이름들", coins = 900, fame = 30 },
		{ n = 50, name = "살아 있는 역사책", coins = 2500, fame = 70 },
		{ n = 100, name = "인류의 초상", coins = 6000, fame = 150 },
	}
	local prev: string? = nil
	for i, c in chain do
		local id = "q_people_" .. i
		table.insert(Quests, { id = id, name = c.name, summary = string.format("인물 백과에 인물 %d명 기록하기", c.n), kind = "people", amount = c.n, after = prev, rewardCoins = c.coins, rewardFame = c.fame, rewardCareer = "adventure", rewardXp = 60 + i * 60 } :: Quest)
		prev = id
	end
	local cats = {
		{ cat = "explorer", name = "바다 너머의 이름들", label = "탐험가·항해가", n = 6, coins = 1200, fame = 40 },
		{ cat = "science", name = "별과 지도를 그린 사람들", label = "과학자·지도 제작자", n = 8, coins = 1500, fame = 50 },
		{ cat = "merchant", name = "돈이 흐르는 길", label = "상인·금융가", n = 5, coins = 1200, fame = 40 },
		{ cat = "pirate", name = "깃발 아래의 사람들", label = "해적·사략선장", n = 5, coins = 1200, fame = 40 },
		{ cat = "ruler", name = "왕관과 항구", label = "군주·정치가", n = 10, coins = 1800, fame = 60 },
		{ cat = "letters", name = "펜과 악보의 시대", label = "문학·음악가", n = 6, coins = 1200, fame = 40 },
	}
	for _, c in cats do
		table.insert(Quests, { id = "q_people_" .. c.cat, name = c.name, summary = string.format("%s %d명 기록하기", c.label, c.n), kind = "people", cat = c.cat, amount = c.n, rewardCoins = c.coins, rewardFame = c.fame, rewardCareer = "adventure", rewardXp = 120 } :: Quest)
	end
end

-- 인물과의 대화: 기록한 인물을 찾아 이야기를 듣는 연속 퀘스트
do
	local talks = {
		{ n = 5, name = "이야기 한 자락", coins = 300, fame = 10 },
		{ n = 20, name = "객석의 단골", coins = 1000, fame = 30 },
		{ n = 50, name = "살아 있는 구술사", coins = 3000, fame = 80 },
	}
	local prev: string? = nil
	for i, c in talks do
		local id = "q_talk_" .. i
		table.insert(Quests, { id = id, name = c.name, summary = string.format("기록한 인물 %d명과 대화하기", c.n), kind = "people_talk", amount = c.n, after = prev, rewardCoins = c.coins, rewardFame = c.fame, rewardCareer = "adventure", rewardXp = 50 + i * 50 } :: Quest)
		prev = id
	end
end

-- 항구 치안: 순찰로 항구를 안정시키는 연속 퀘스트
do
	local rounds = {
		{ n = 3, name = "순찰의 첫걸음", coins = 400, fame = 12 },
		{ n = 10, name = "항구의 파수꾼", coins = 1500, fame = 40 },
		{ n = 25, name = "바다의 치안관", coins = 4000, fame = 100 },
	}
	local prev: string? = nil
	for i, c in rounds do
		local id = "q_order_" .. i
		table.insert(Quests, { id = id, name = c.name, summary = string.format("항구 순찰대 %d번 보내기", c.n), kind = "order_patrol", amount = c.n, after = prev, rewardCoins = c.coins, rewardFame = c.fame, rewardCareer = "adventure", rewardXp = 60 + i * 60 } :: Quest)
		prev = id
	end
end

-- 시대의 증인: 인류의 시대가 넘어가는 순간을 따라간다 (연속 퀘스트)
do
	local names = { "대항해의 문", "과학 혁명의 증인", "계몽의 빛", "증기의 새벽" }
	local prev: string? = nil
	for i, nm in names do
		local id = "q_era_" .. (i + 1)
		table.insert(Quests, {
			id = id, name = nm, summary = "시대의 증인 " .. i .. "/" .. #names .. " — 인류의 시대가 " .. nm .. "에 이르기까지 지식을 이해하기 (지식 트리)",
			kind = "era", amount = i + 1, after = prev, rewardCoins = 1500 * i, rewardFame = 40 * i, rewardCareer = "adventure", rewardXp = 150 * i,
		} :: Quest)
		prev = id
	end
end

-- 서막 메인 퀘스트: 시작 국가별 4장 (PrologueQuests.luau)
local Prologue = require(script.Parent.PrologueQuests)
for _, pq in Prologue.Quests do
	table.insert(Quests, pq :: Quest)
end
-- 시작 국가별 학자 이야기 (서막 4장 이후)
local ScholarQ = require(script.Parent.ScholarQuests)
for _, sq in ScholarQ.Quests do
	table.insert(Quests, sq :: Quest)
end

local ById: { [string]: Quest } = {}
for _, q in Quests do
	ById[q.id] = q
end

-- [퀘스트 난이도 1~5단] 기존 완료 조건·보상·저장 키를 바꾸지 않고 실제 목표 규모를 기준으로 분류한다.
-- 종류별 단위가 달라 납품량·방문 항구 수·전투 승수·발견 수를 각각 판정한다.
local function Grade(q: Quest): number
	if q.difficulty then return math.clamp(math.floor(q.difficulty), 1, 5) end
	local n = math.max(0, q.amount or 0)
	local g = 1
	if q.kind == "win" then
		g = if n <= 3 then 1 elseif n <= 6 then 2 elseif n <= 10 then 3 elseif n <= 20 then 4 else 5
	elseif q.kind == "visit" then
		g = if n <= 3 then 1 elseif n <= 7 then 2 elseif n <= 15 then 3 elseif n <= 25 then 4 else 5
	elseif q.kind == "discover" or q.kind == "field" or q.kind == "people" or q.kind == "history" or q.kind == "chronicle" then
		g = if n <= 2 then 1 elseif n <= 6 then 2 elseif n <= 12 then 3 elseif n <= 25 then 4 else 5
	elseif q.kind == "deliver" then
		g = if q.rewardCoins < 400 then 1 elseif q.rewardCoins < 950 then 2 elseif q.rewardCoins < 1800 then 3 elseif q.rewardCoins < 3200 then 4 else 5
		if n >= 20 then g = math.max(g, 4) elseif n >= 12 then g = math.max(g, 3) end
	else
		g = if q.rewardCoins < 400 then 1 elseif q.rewardCoins < 1000 then 2 elseif q.rewardCoins < 2200 then 3 elseif q.rewardCoins < 5000 then 4 else 5
		if n >= 15 then g = math.max(g, 4) elseif n >= 6 then g = math.max(g, 3) end
	end
	if q.after then
		g = math.max(g, 2) -- 연속 이야기의 두 번째 장부터는 초보 임무로 표시하지 않는다.
	end
	return math.clamp(g, 1, 5)
end

-- 동료 전용 퀘스트: 동료의 목소리로 쓴 사연(hook)과 결말(ending). 직접 쓴 것이라 틀 문장보다 우선한다.
local HAND: { [string]: { string } } = {
	cq_merian = { "메리안이 스케치북을 펼친다. \"애벌레가 나비가 되는 걸 아무도 믿지 않아요. 그림으로 보여 주면 믿겠죠. 살아 있는 걸 더 찾아 주세요.\"", "스케치북의 마지막 쪽에 나비가 날아올랐다. 메리안이 조용히 말했다. \"이제 아무도 이게 마법이라고 하지 못해요.\"" },
	cq_halley = { "핼리가 밤하늘을 가리킨다. \"저 별은 76년 뒤 다시 옵니다. 내가 죽은 뒤일 테니, 당신이 증거를 모아 줘야 합니다.\"", "핼리가 별 지도를 접으며 웃었다. \"76년 뒤 누군가 이 지도를 펴고 내 이름을 부르겠군요. 고맙습니다, 선장.\"" },
	cq_leeuwenhoek = { "레이우엔훅이 렌즈를 닦으며 속삭인다. \"물 한 방울 속에 도시가 있소. 아무도 내 말을 믿지 않으니 증거가 필요하오.\"", "렌즈 속에서 작은 생명이 헤엄쳤다. 레이우엔훅의 손이 떨렸다. \"보시오. 내가 미친 게 아니었소.\"" },
	cq_linnaeus = { "린네가 이름표를 한 아름 안고 말한다. \"세상 모든 풀에 이름을 붙이겠습니다. 이름이 없으면 질서도 없지요. 표본이 더 필요합니다.\"", "마지막 이름표가 붙었다. 린네는 한동안 말이 없다가 말했다. \"혼돈에 질서가 생겼습니다. 당신 덕분에.\"" },
	cq_boyle = { "보일이 유리 기구를 늘어놓으며 말한다. \"공기에도 무게가 있다고 하면 다들 웃습니다. 유리가 와야 증명할 수 있습니다.\"", "유리 종 속의 촛불이 꺼졌다. 보일이 눈을 빛냈다. \"공기가 없으면 불도 못 삽니다. 이제 아무도 웃지 못할 겁니다.\"" },
	cq_papin = { "파팽이 증기 솥을 두드린다. \"압력을 못 다스리면 솥이 터집니다. 이 밸브만 완성되면 배가 바람 없이 가요. 도와주십시오.\"", "밸브가 칙 소리를 내며 증기를 뱉었다. 파팽이 웃었다. \"터지지 않는군요. 바람 없는 바다를 우리가 건널 겁니다.\"" },
	cq2_merian = { "메리안이 열대의 일지를 가져온다. \"알에서 나비까지 한 줄로 이어 보고 싶어요. 빠진 칸이 아직 많아요.\"", "변태 기록이 한 권의 책이 되었다. 메리안이 속표지에 당신의 이름을 작게 적어 넣었다." },
	cq2_halley = { "핼리가 빈 하늘 지도를 펼친다. \"남쪽 하늘은 아직 비어 있습니다. 그곳에 이름을 붙이는 것이 제 마지막 꿈입니다.\"", "남쪽 하늘이 지도 위에 채워졌다. 핼리가 말했다. \"별은 늘 거기 있었군요. 이제 우리가 알 뿐이지요.\"" },
	cq2_leeuwenhoek = { "레이우엔훅이 새 렌즈를 내민다. \"더 작은 것이 있소. 눈에 안 보이는 곳에 세계가 있다는 걸 모두에게 보여 주고 싶소.\"", "수많은 작은 생명이 기록되었다. 레이우엔훅이 중얼거렸다. \"세상은 내가 생각한 것보다 훨씬 컸소.\"" },
	cq2_linnaeus = { "린네가 지도를 펼친다. \"대륙마다 풀의 얼굴이 다릅니다. 모두 보고 싶습니다. 당신의 배가 저의 눈이 되어 주세요.\"", "식물 대탐사의 기록이 완성되었다. 린네가 이름을 하나씩 낭독했다. 그 목소리는 기도 같았다." },
	cq2_boyle = { "보일이 정색하고 말한다. \"실험실은 안전한 바다가 있어야 돌아갑니다. 항로를 지켜 주세요. 호위가 곧 연구입니다.\"", "열 번째 승리의 소식이 실험실에 닿았다. 보일이 말없이 당신의 잔에 술을 따랐다." },
	cq2_papin = { "파팽이 도면을 펼친다. \"증기선이 닿을 항구들이 이어져야 합니다. 길이 있어야 배도 의미가 있지요.\"", "증기 항로가 지도 위에 이어졌다. 파팽이 도면 위에 손을 얹고 눈을 감았다." },
	cq_h_england = { "", "엘리너의 논문이 학회를 통과했다. \"증거가 이야기를 이겼어요. 당신 덕분이에요.\"" },
	cq_h_netherlands = { "", "얀의 이름이 거래소 칠판에 올랐다. 길드의 노인들이 처음으로 모자를 벗었다." },
	cq_h_france = { "", "루앙 부두에 설탕 배가 닿자 마리온이 깃발을 올렸다. 영지가 돌아왔다." },
	cq_h_ottoman = { "", "이스탄불 시장에 후추 향이 돌아왔다. 레일라의 가게 문이 삼 대 만에 다시 활짝 열렸다." },
	cq_h_swahili = { "", "계절풍 표의 마지막 칸이 채워졌다. 아민이 바다를 보며 낮게 바람의 이름을 불렀다." },
	cq_h_malabar = { "", "제값을 받은 후추 자루 앞에서 상인이 처음으로 웃었다. \"이제 속지 않겠소.\"" },
	cq_h_japan = { "", "책장에 바다 건너의 식물도감이 꽂혔다. 오래 닫혀 있던 서재가 환해졌다." },
	cq_h_new_spain = { "", "은이 마을로 돌아가던 날, 광산 사람들이 길가에 서서 말없이 손을 흔들었다." },
	cq_h_portugal = { "", "끊겼던 일지의 다음 쪽에 당신의 항해가 이어 적혔다. 아버지의 필체와 나란히." },
}
for hid, hand in Prologue.Hand do
	HAND[hid] = hand
end
for hid, hand in ScholarQ.Hand do
	HAND[hid] = hand
end
-- 퀘스트마다 따로 쓴 이야기 (납품·방문·전투·지식·지역 대장정)
for hid, hand in require(script.Parent.QuestStories) do
	HAND[hid] = hand
end

-- 퀘스트 이야기: 단순한 모으기가 아니라 "누가, 왜, 무엇이 걸렸나"가 있는 사연으로 보여 준다.
-- 직접 쓴 story 가 있으면 그것을 쓰고, 없으면 종류별 사연 틀에서 퀘스트 id 로 정해 고른다 (같은 퀘스트는 늘 같은 사연).
local GIVERS = { "늙은 선주 마르타", "젊은 서기 피에트로", "과부 안나", "의사 하산", "수도원 서기 이그나티우스", "선술집 주인 보르", "견습 항해사 루카", "세관 관리 도메니코", "약종상 리라", "조선공 엘리아스" }
local function pick(id: string, list: { string }): string
	local h = 0
	for i = 1, #id do
		h += string.byte(id, i) * i
	end
	return list[h % #list + 1]
end
local function fill(t: string, v: { [string]: string }): string
	return (string.gsub(t, "{(%w+)}", function(k)
		return v[k] or ""
	end))
end

local DELIVER = {
	{ "{giver}의 창고는 비었고 빚쟁이는 {port} 부두에서 기다린다. {good} {n}개가 제때 닿아야 가게 문이 열려 있다.", "{good}이(가) {port}에 닿자 {giver}가 말없이 손을 잡았다. \"이제 한 계절은 더 버팁니다.\"" },
	{ "{port}의 혼례 연회가 사흘 뒤다. {giver}는 {good} {n}개 없이는 체면을 잃는다고 한숨짓는다.", "연회는 성대했다. {giver}가 당신 몫의 자리를 맨 앞에 마련해 두었다." },
	{ "겨울이 오기 전 {port}에 {good} {n}개가 닿아야 한다. {giver}는 이 한 번의 뱃길에 가문의 이름을 걸었다.", "{port}의 눈이 내리기 직전에 닿았다. {giver}는 \"당신이 우리를 살렸어요\"라고 적은 쪽지를 남겼다." },
	{ "검은 깃발 상회의 칼레브가 {port}의 {good}을(를) 싹쓸이하려 한다. {giver}가 속삭인다. \"그자보다 먼저 {n}개를 대 주세요.\"", "칼레브의 창고는 헛걸음이었다. 부두에서 마주친 그는 모자 끝만 슬쩍 올리며 말했다. \"다음엔 안 집니다, 선장.\"" },
	{ "{port} 부두에 소문이 돈다. 칼레브의 상회가 {giver}의 거래처를 하나씩 빼앗고 있다고. {good} {n}개가 반격의 첫 수다.", "{giver}의 거래처가 돌아왔다. 칼레브가 보낸 사람이 멀리서 이 광경을 지켜보다 사라졌다." },
	{ "경쟁 상인이 {port}의 {good} 시세를 노리고 있다. {giver}는 한발 앞서 {n}개를 풀어 값을 지키고 싶어 한다.", "시세는 당신 덕에 지켜졌다. 경쟁 상인은 부두에서 이를 갈았고, {giver}는 웃었다." },
}
local STORY_KIND: { [string]: { { string } } } = {
	discover = {
		{ "연구자들은 증거를 기다린다. 당신이 바다에서 건진 것 하나가 오래된 논쟁의 한쪽 편을 들어 줄지도 모른다.", "당신이 가져온 기록은 학회 탁자 위에서 오래 돌려 읽혔다. 누군가 조용히 \"믿어도 되겠군\"이라고 말했다." },
		{ "낡은 항해 일지 한 귀퉁이에 \"그곳에서 본 것을 아무도 믿지 않았다\"고 적혀 있다. 확인할 사람은 당신뿐이다.", "당신의 발견으로 그 일지의 마지막 문장이 거짓이 아니었음이 밝혀졌다." },
	},
	field = {
		{ "한 학자가 평생의 분야를 채워 줄 마지막 조각들을 찾고 있다. 항구마다 흩어진 표본이 당신의 손을 기다린다.", "표본 상자가 닫히던 날, 늙은 학자는 오래 말이 없다가 \"이제 눈을 감아도 되겠네\"라며 웃었다." },
		{ "도감의 빈칸은 누군가의 못다 한 꿈이다. 그 빈칸을 하나씩 채울 때마다 이름 없던 항해가 기록이 된다.", "도감의 마지막 칸이 채워졌다. 첫 장에는 당신의 이름이 작게 적혔다." },
	},
	visit = {
		{ "지도 위의 빈 항구들이 당신을 부른다. 낯선 부두마다 새 얼굴과 새 소문이 기다린다.", "마지막 항구의 등대가 켜지던 밤, 당신은 처음 지도를 펼치던 날의 자신을 떠올렸다." },
		{ "한 늙은 선원이 말한다. \"배는 항구에서 늙고, 사람은 길에서 자란다네.\" 그의 지도에는 아직 못 가 본 곳이 남아 있다.", "당신이 다 돌아본 항구들은 이제 늙은 선원의 지도에 붉은 점으로 이어졌다." },
	},
	win = {
		{ "해적 깃발이 항로를 막고 있다. 상인들은 보험료를 올렸고 선원들은 밤마다 불안해한다.", "항로가 다시 열렸다. 부두 사람들이 당신 배가 들어올 때 모자를 벗었다." },
		{ "약탈당한 배의 생존자가 당신의 손을 붙잡고 말한다. \"그놈들이 아직도 바다에 있어요.\"", "마지막 적함이 가라앉았다. 어딘가에서 생존자가 오래 숨을 내쉬었을 것이다." },
	},
	research = {
		{ "공방의 불빛은 밤새 꺼지지 않는다. 기술자들은 당신의 연구비가 도착하기만을 기다린다.", "시운전의 증기가 올랐다. 기술자들이 서로 얼싸안았고 한 사람은 울었다." },
	},
	understand = {
		{ "책 속의 한 줄을 이해하는 데 한 세기가 걸리기도 한다. 당신은 그 줄 뒤에 숨은 사람의 고집을 따라가야 한다.", "이해가 닿는 순간 한 줄의 문장이 눈앞의 세계를 바꿔 놓았다." },
	},
	people = {
		{ "항구마다 이름 없는 장인과 학자가 있다. 누군가 기억하지 않으면 그들은 사라진다. 당신이 그 기록자가 된다.", "당신의 장부에 이름이 적힌 사람들은 오래 기억될 것이다." },
	},
	history = {
		{ "역사는 항구에서 먼저 소문으로 온다. 당신은 그 현장에 있어야 한다.", "훗날 사람들이 책에서 읽을 사건을 당신은 눈으로 보았다." },
	},
	default = {
		{ "작은 일처럼 보이지만 누군가의 하루가 여기에 걸려 있다.", "일이 끝나자 부두에 작은 박수가 일었다." },
	},
}
local KIND_ALIAS = { field = "field", discover = "discover", understand_card = "understand", people_talk = "people" }

-- 연속 퀘스트(after 로 이어진 줄)는 장(章)의 위치에 따라 이야기가 쌓인다: 도입 → 고비 → 결말
local CHAIN: { [string]: { { string } } } = {
	first = {
		{ "이야기의 시작이다. 이 일이 어디로 이어질지는 아직 아무도 모른다. 다만 한 번 발을 들이면 되돌리기 어렵다는 예감이 든다.", "첫 장이 끝났다. 탁자 위에 다음 장을 암시하는 봉인된 편지가 놓여 있었다." },
		{ "처음엔 사소한 부탁이었다. 그러나 부탁한 사람의 눈빛에는 사소하지 않은 무언가가 있었다.", "일은 끝났지만 의문이 남았다. 그 사람은 왜 그렇게 서둘렀을까." },
	},
	mid = {
		{ "일은 예상보다 커졌다. 돌아설 수도 있지만, 여기까지 온 이상 끝을 보고 싶어진다.", "고비를 하나 넘겼다. 그러나 누군가가 이 모든 것을 지켜보고 있다는 낌새가 짙어졌다." },
		{ "앞선 일의 여파가 돌아왔다. 처음의 약속이 이제 더 무거운 책임이 되었다.", "한 매듭이 풀리자 더 큰 매듭이 드러났다. 이야기는 이제 당신 손을 떠나 흐르기 시작했다." },
	},
	last = {
		{ "긴 이야기의 끝자락이다. 지금까지 쌓은 모든 것이 이 마지막 일에서 시험대에 오른다.", "모든 것이 맞물렸다. 시작할 때는 몰랐던 이 일의 의미가 이제야 선명해졌다. 이야기는 당신의 이름으로 닫혔다." },
		{ "마지막 장이 열렸다. 처음 이 일을 맡을 때의 그 망설임이 지금은 아득하게 느껴진다.", "끝이 왔다. 되돌아보면 모든 길이 이곳으로 이어져 있었다." },
	},
}
local NEXT_OF: { [string]: string } = {}
for _, qq in Quests do
	if qq.after then
		NEXT_OF[qq.after] = qq.id
	end
end

local function Story(q: Quest, goodName: string?, portName: string?): (string, string)
	-- [저널=이야기] 10대 항로는 반복 문장 대신 집필한 사건·반증·결말을 읽는다.
	-- [백과=기록지식] 실제 사료의 사실 여부는 KnowledgeCards의 근거 분류가 판정한다.
	if q.journal then
		local j = q.journal
		local opening = string.format("제%d장 · %s\n%s: %s\n남은 의문: %s", j.stage, j.theme, j.speaker, j.opening, j.question)
		local ending = j.ending
		local nextId = NEXT_OF[q.id]
		if nextId and ById[nextId] then
			ending ..= "\n새 단서가 다음 장을 열었다: " .. ById[nextId].name
		else
			ending ..= "\n이 항로의 사건은 마무리됐다. 증거의 사실과 이야기의 해석은 각각 백과와 저널에 남는다."
		end
		return opening, ending
	end
	local vars = { giver = pick(q.id, GIVERS), good = goodName or "물건", port = portName or "그 항구", n = tostring(q.amount) }
	local set: { { string } } = STORY_KIND.default
	if q.kind == "deliver" then
		set = DELIVER
	else
		local found = STORY_KIND[KIND_ALIAS[q.kind] or q.kind]
		if found then
			set = found
		end
	end
	local h = 0
	for i = 1, #q.id do
		h += string.byte(q.id, i) * 3
	end
	local t = set[h % #set + 1]
	if q.after or NEXT_OF[q.id] then
		-- 장 번호와 위치 (앞으로 거슬러 센다)
		local depth, cur = 1, q
		while cur.after and ById[cur.after] and depth < 20 do
			cur = ById[cur.after]
			depth += 1
		end
		local role = if not q.after then "first" elseif NEXT_OF[q.id] then "mid" else "last"
		local list = CHAIN[role]
		local c = list[h % #list + 1]
		local base = q.story or fill(t[1], vars)
		local tag = string.format("제%d장. ", depth)
		if HAND[q.id] then
			return tag .. (if HAND[q.id][1] ~= "" then HAND[q.id][1] else base), HAND[q.id][2]
		end
		return tag .. base, fill(c[2], vars)
	end
	local hand = HAND[q.id]
	local hook = (if hand and hand[1] ~= "" then hand[1] else nil) or q.story or fill(t[1], vars)
	return hook, (if hand then hand[2] else fill(t[2], vars))
end

return {
	Quests = Quests,
	ById = ById,
	Grade = Grade,
	Story = Story,
}
