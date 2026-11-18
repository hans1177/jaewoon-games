--!strict
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
	arc: string?, -- 대항해 연대기 10대 전문 항로
	continent: string?, -- 현실의 7대륙; 아스테리아는 가상 신화
	sagaPort: string?, -- 실제 항구에서 지식을 제출해야 완료
	minYear: number?, -- 시대가 도달해야 진행 가능
	major: boolean?, -- 대서사 분기점만 특별 연출
	ending: string?, -- 이 이야기만의 결말
	newsSource: string?, -- 선술집 소문·인쇄물·현장 발견·역사 사건·학자 편지 등 시작 방식
	story: string?, -- 왜 이 일을 하는가 (이야기)
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
local RegionalFieldQuests: { { any } } = {
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
		local quest: Quest = {
			id = id, name = route[2] .. " · " .. mission[1],
			kind = "discover_card", exploreSite = mission[2], portId = mission[3], cardId = mission[4],
			amount = 1, after = prev, difficulty = stage, strand = "history",
			summary = string.format("지역 현장 %d/5 · %s에서 %s 발견", stage, mission[5], mission[6]),
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

-- [대항해 연대기] 10대 전문 항로 → 7대륙 교차 → 사라진 세계해도.
-- 기존 퀘스트 ID·저장·보상은 유지하고, 새 ID는 완료 기록에 그대로 저장한다.
	table.insert(Quests, { id = "q_saga_pirate_1", name = "검은 돛의 구조 신호", summary = "아바나에서 해적 해역의 숨은 항로를 조사", kind = "discover_card", cardId = "geo_pirate_waters", portId = "havana", newsSource = "항구의 비밀 쪽지", sagaPort = "havana", amount = 1, arc = "검은 돛의 전설", continent = "북아메리카", strand = "history", story = "선술집에서 소년이 피 묻은 항해일지를 내민다. 아버지의 배는 돌아오지 않았는데 항만청에는 출항 기록조차 없다. 바다에 남겨진 검은 돛의 신호를 해독해야 한다.", ending = "검은 돛의 선장은 약탈자가 아니라 조난자들을 구하려던 사람이었다. 그러나 마지막 항해의 이유는 여전히 감춰져 있다.", rewardCoins = 220, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_saga_pirate_2", name = "침몰선의 마지막 증인", summary = "베라크루스에서 갈레온 보물상자를 확인", kind = "discover_card", cardId = "am_spanish_galleon_chest", portId = "veracruz", newsSource = "침몰선 생존자 증언", sagaPort = "veracruz", amount = 1, arc = "검은 돛의 전설", continent = "북아메리카", strand = "history", after = "q_saga_pirate_1", major = true, story = "경매장에 같은 문장이 새겨진 보물상자가 나타난다. 군함의 습격 기록과 해적들의 증언이 엇갈리고, 누군가 살아 있는 증인을 침묵시키려 한다.", ending = "상자 밑바닥에는 금이 아니라 피난민들의 명단이 들어 있었다. 소년은 아버지의 이름을 찾았고, 해적이라는 말의 의미가 흔들렸다.", rewardCoins = 650, rewardFame = 38, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "lost_cibola" } :: Quest)
	table.insert(Quests, { id = "q_saga_navy_1", name = "왕립 군함의 빈 선실", summary = "런던에서 갈레온 설계 기록 조사", kind = "discover_card", cardId = "ship_galleon_design", portId = "london", newsSource = "군항의 작전문서", sagaPort = "london", amount = 1, arc = "제국의 깃발", continent = "유럽", strand = "history", story = "해군 조선소에서 설계도 한 장이 불태워진다. 포격으로 사라진 선원들의 가족은 기록을 요구하지만 왕실은 침묵한다.", ending = "지워진 칸은 포실이 아니라 구조정의 자리였다. 함대가 감춘 것은 승리의 값이었다.", rewardCoins = 220, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_saga_navy_2", name = "포성 뒤에 남은 선택", summary = "스톡홀름에서 성곽 방어 기술 조사", kind = "discover_card", cardId = "arch_star_fort", portId = "stockholm", newsSource = "요새의 긴급 보고", sagaPort = "stockholm", amount = 1, arc = "제국의 깃발", continent = "유럽", strand = "history", after = "q_saga_navy_1", major = true, story = "장교는 조선소 포격 명령을 받았다. 그러나 표적 옆에는 민간인 대피소가 있다. 성곽의 구조를 읽으면 다른 길이 보일지도 모른다.", ending = "포성이 멈췄을 때 살아남은 사람들의 명단이 훈장보다 길었다. 장교는 그 이름들을 먼저 기록했다.", rewardCoins = 650, rewardFame = 38, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "lang_flag_signals" } :: Quest)
	table.insert(Quests, { id = "q_saga_trade_1", name = "후추 한 알의 값", summary = "캘리컷에서 후추 산지와 가격 조사", kind = "discover_card", cardId = "good_pepper", portId = "calicut", newsSource = "시장 가격 이상 소식", sagaPort = "calicut", amount = 1, arc = "황금 항로", continent = "아시아", strand = "history", story = "한 상인이 후추 한 알을 저울에 올린다. 이 한 알을 얻으려 먼 바다에서는 사람이 죽는다. 그녀가 내민 장부의 마지막 줄은 찢겨 있다.", ending = "찢겨 나간 가격표는 거대한 운송 계약의 첫 장이었다. 물건을 거래하던 일이 사람의 생사를 가르는 항로가 되었다.", rewardCoins = 220, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_saga_trade_2", name = "돌아오지 않는 향신료 선단", summary = "잔지바르에서 계절풍 항로 조사", kind = "discover_card", cardId = "geo_monsoon", portId = "zanzibar", newsSource = "계절풍 실종선 통보", sagaPort = "zanzibar", amount = 1, arc = "황금 항로", continent = "아시아", strand = "history", after = "q_saga_trade_1", major = true, story = "바람이 거꾸로 불기 시작하자 선단이 사라졌다. 부두에는 소식을 기다리는 가족들만 남았다. 금보다 중요한 것을 구하려면 바람부터 이해해야 한다.", ending = "돌아온 선원들은 계절풍의 방향을 증언했다. 시장의 종은 울렸지만, 돌아오지 못한 이름도 장부에 남았다.", rewardCoins = 650, rewardFame = 38, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "wx_monsoon" } :: Quest)
	table.insert(Quests, { id = "q_saga_guild_1", name = "불타는 장부의 숫자", summary = "암스테르담에서 환어음 기록을 조사", kind = "discover_card", cardId = "finance_bill_exchange", portId = "amsterdam", newsSource = "상인 길드 장부", sagaPort = "amsterdam", amount = 1, arc = "바다의 상인 연맹", continent = "유럽", strand = "history", story = "창고가 불탄 밤, 회계사의 딸이 잿더미에서 환어음을 발견한다. 기근 구호금이 비밀 계좌로 새고 있었다.", ending = "숫자만 보던 회계사는 장부에 적히지 않은 사람들을 찾아 나섰다.", rewardCoins = 220, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_saga_guild_2", name = "일곱 도장의 밀약", summary = "베네치아에서 해상보험 계약 조사", kind = "discover_card", cardId = "finance_marine_insurance", portId = "venice", newsSource = "봉인된 보험 계약", sagaPort = "venice", amount = 1, arc = "바다의 상인 연맹", continent = "유럽", strand = "history", after = "q_saga_guild_1", major = true, story = "원로원 뒤편에서 경쟁 상단들의 인장이 같은 계약서에 찍힌다. 누군가는 배가 침몰할수록 더 많은 돈을 번다.", ending = "일곱 도장은 약탈의 공모일 수도, 새로운 상호 보증의 시작일 수도 있었다. 계약서를 쥔 손에 세계의 운명이 걸렸다.", rewardCoins = 650, rewardFame = 38, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "org_hanseatic_league" } :: Quest)
	table.insert(Quests, { id = "q_saga_scholar_1", name = "지도에서 지워진 섬", summary = "베네치아의 고지도와 항로를 비교", kind = "discover_card", cardId = "nav_portolan", portId = "venice", newsSource = "서고의 고지도", sagaPort = "venice", amount = 1, arc = "세상의 모든 지식", continent = "유럽", strand = "history", story = "연구자는 마지막 지도를 내밀면서 경고한다. 이 섬을 공개하면 누군가 그곳을 정복할 것이다. 학자에게 발견은 누구의 것인가.", ending = "지워진 섬은 빈땅이 아니었다. 그곳에 살아온 사람들의 기록이 지도 가장자리에서 되살아났다.", rewardCoins = 220, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_saga_scholar_2", name = "별이 증명하는 거짓말", summary = "런던에서 목성 위성 관측 자료 비교", kind = "discover_card", cardId = "ast_jupiter_moons", portId = "london", newsSource = "천문학자의 서신", sagaPort = "london", amount = 1, arc = "세상의 모든 지식", continent = "유럽", strand = "history", after = "q_saga_scholar_1", major = true, story = "왕립학회의 강연에서 두 학자가 충돌한다. 젊은 관측자의 기록이 빼앗길 위기다. 작은 별 네 개가 진실을 결정한다.", ending = "망원경의 희미한 점 네 개가 평생의 연구를 증명했다. 박수는 늦게 왔지만 기록은 살아남았다.", rewardCoins = 650, rewardFame = 38, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "relic_telescope_brass" } :: Quest)
	table.insert(Quests, { id = "q_saga_explorer_1", name = "폭풍의 곶에 남은 불빛", summary = "희망봉의 해안과 항로 기록 조사", kind = "discover_card", cardId = "geo_cape_good_hope", portId = "cape_town", newsSource = "등대지기의 구조 신호", sagaPort = "cape_town", amount = 1, arc = "지도 끝의 세계", continent = "아프리카", strand = "history", story = "등대가 사흘째 꺼져 있다. 밤마다 세 번의 불빛이 보인다는 소문이 돈다. 구조 신호일까, 밀수선의 속임수일까.", ending = "꺼진 등대에서 찾은 일지에는 조난선의 마지막 항로가 있었다. 누군가 끝까지 불빛을 지키고 있었다.", rewardCoins = 220, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_saga_explorer_2", name = "두 대양을 잇는 증언", summary = "잔지바르에서 무역풍과 현지 해로 비교", kind = "discover_card", cardId = "geo_trade_winds", portId = "zanzibar", newsSource = "현지 도선사의 증언", sagaPort = "zanzibar", amount = 1, arc = "지도 끝의 세계", continent = "아프리카", strand = "history", after = "q_saga_explorer_1", major = true, story = "유럽 지도에는 없는 길을 항구 도선사가 가리킨다. 외지 학자는 믿지 못하지만 이곳 사람들은 세대째 같은 바다를 건너왔다.", ending = "해도에 선을 새로 그었지만 최초 발견자라는 이름을 붙이지 않았다. 항로는 사람들의 기억 속에 먼저 있었다.", rewardCoins = 650, rewardFame = 38, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "lost_terra_incognita" } :: Quest)
	table.insert(Quests, { id = "q_saga_diplomat_1", name = "보스포루스의 세 인장", summary = "이스탄불에서 해협의 통행 기록 조사", kind = "discover_card", cardId = "geo_bosphorus", portId = "istanbul", newsSource = "사절단의 외교문서", sagaPort = "istanbul", amount = 1, arc = "왕관과 조약", continent = "아시아", strand = "history", story = "세 나라의 사절이 서로 다른 통행권을 주장한다. 단어 하나를 잘못 번역하면 해협에서 포성이 울릴 것이다.", ending = "세 인장이 찍힌 문서에 같은 약속이 세 언어로 쓰였다. 해협의 문이 다시 열렸다.", rewardCoins = 220, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_saga_diplomat_2", name = "성벽 안팎의 목소리", summary = "마닐라에서 성벽도시의 역사와 외교 기록 조사", kind = "discover_card", cardId = "site_manila_intramuros", portId = "manila", newsSource = "성벽 밖 주민의 청원", sagaPort = "manila", amount = 1, arc = "왕관과 조약", continent = "아시아", strand = "history", after = "q_saga_diplomat_1", major = true, story = "성벽 안에서는 교역 계약을 맺지만 바깥의 주민들에게는 서명할 자리도 없다. 누구의 평화인가를 묻는 목소리가 들린다.", ending = "서명란 아래에 새 줄이 생겼다. 항구의 역사는 왕실의 이름만으로 쓰이지 않는다는 것을 사절이 배웠다.", rewardCoins = 650, rewardFame = 38, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "information_cipher" } :: Quest)
	table.insert(Quests, { id = "q_saga_shipwright_1", name = "부서진 용골의 비밀", summary = "리스본에서 캐러벨의 구조 조사", kind = "discover_card", cardId = "ship_caravel", portId = "lisbon", newsSource = "조선소의 사고 보고", sagaPort = "lisbon", amount = 1, arc = "바다를 만드는 사람들", continent = "오세아니아", strand = "history", story = "조선공이 출항 직전 배를 부쉈다. 숨겨진 균열을 발견했지만 선주는 그를 반역자로 부른다.", ending = "부서진 용골에서 결함이 드러났다. 한 척을 잃어 수십 명을 살렸다.", rewardCoins = 220, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_saga_shipwright_2", name = "남쪽 항구의 첫 건선거", summary = "시드니에서 선체 수리와 조선 기술 연구", kind = "discover_card", cardId = "ship_galleon_design", portId = "sydney", newsSource = "난파선 구조 소식", sagaPort = "sydney", amount = 1, arc = "바다를 만드는 사람들", continent = "오세아니아", strand = "history", after = "q_saga_shipwright_1", minYear = 1788, major = true, story = "폭풍을 맞은 배가 좌초했다. 현지의 해안 지식과 조선공의 기술이 만나지 않으면 배도 사람도 구할 수 없다.", ending = "배가 다시 뜨자 도움을 준 사람들의 이름이 설계도에 새겨졌다. 기술은 함께 쌓여 가는 기록이었다.", rewardCoins = 650, rewardFame = 38, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "ship_dry_dock" } :: Quest)
	table.insert(Quests, { id = "q_saga_navigator_1", name = "태평양의 밤하늘", summary = "호놀룰루에서 태평양 항해 기록 조사", kind = "discover_card", cardId = "geo_pacific_vast", portId = "honolulu", newsSource = "섬 항해사의 전언", sagaPort = "honolulu", amount = 1, arc = "별을 읽는 자", continent = "오세아니아", strand = "history", story = "별이 구름에 가려지자 외지 선장은 길을 잃었다. 섬의 길잡이는 파도와 바람으로 방향을 찾는다. 서로 다른 항해술을 믿을 수 있을까.", ending = "길잡이는 항로를 찾았고 선장은 새로운 방법을 일지에 적었다. 별을 읽는 데 하늘만 필요한 것은 아니었다.", rewardCoins = 220, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_saga_navigator_2", name = "빙벽 너머의 대륙", summary = "호바트에서 남방 대륙 가설과 남극권 기록 비교", kind = "discover_card", cardId = "lost_terra_australis", portId = "hobart", newsSource = "남극권 항해일지", sagaPort = "hobart", amount = 1, arc = "별을 읽는 자", continent = "남극", strand = "history", after = "q_saga_navigator_1", minYear = 1804, major = true, story = "남쪽 끝에서 얼음벽을 보았다는 항해일지가 도착했다. 누군가는 황금 대륙이라 부르고 누군가는 죽음의 바다라 부른다. 소문과 실제 관측을 구별해야 한다.", ending = "1773년 쿡의 남극권 항해 기록과 오래된 남방 대륙 가설을 대조했다. 얼음은 금의 증거가 아니라 더 많은 질문의 시작이었다.", rewardCoins = 650, rewardFame = 38, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "geo_antarctic_circle" } :: Quest)
	table.insert(Quests, { id = "q_saga_culture_1", name = "강의 이름을 지킨 사람", summary = "리우에서 아마존 강어귀의 기록 조사", kind = "discover_card", cardId = "geo_amazon_mouth", portId = "rio", newsSource = "강가 주민의 지도 증언", sagaPort = "rio", amount = 1, arc = "만남이 만든 역사", continent = "남아메리카", strand = "history", story = "지도 제작자는 강에 새로운 이름을 붙이려 한다. 그러나 강가 사람들은 세대에 걸쳐 부르던 이름이 있다고 말한다. 누구의 이름을 역사에 남길까.", ending = "두 이름이 함께 기록됐다. 지도는 소유 증서가 아니라 이야기를 듣는 도구가 되었다.", rewardCoins = 220, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_saga_culture_2", name = "황금의 소문, 사람의 기록", summary = "발파라이소에서 안데스 산맥의 기록 조사", kind = "discover_card", cardId = "geo_andes", portId = "valparaiso", newsSource = "황금 도시 탐험대의 소문", sagaPort = "valparaiso", amount = 1, arc = "만남이 만든 역사", continent = "남아메리카", strand = "history", after = "q_saga_culture_1", major = true, story = "황금 도시의 소문을 따라 원정대가 떠난다. 기록자는 금보다 길을 알려 준 주민들의 삶이 더 중요하다는 것을 깨닫는다.", ending = "황금 지도는 완성되지 않았다. 대신 길을 알려 준 공동체의 이야기와 산맥의 모습이 오래 남았다.", rewardCoins = 650, rewardFame = 38, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "lost_el_dorado" } :: Quest)
	table.insert(Quests, { id = "q_saga_convergence", name = "일곱 대륙, 하나의 바다", summary = "전문 항로의 대서사 사건 3개를 해결한 뒤 리스본에서 기록 합치기", kind = "saga_chapters", amount = 3, sagaPort = "lisbon", portId = "lisbon", arc = "사라진 세계해도", continent = "일곱 대륙", strand = "history", major = true, story = "리스본의 낡은 지도실에는 일곱 칸의 서랍이 있다. 해적의 증언과 학자의 그림, 상인의 장부가 하나의 섬을 가리키지만 어느 기록도 완전하지 않다.", ending = "세 갈래의 기록을 겹치자 빈 지도에 하나의 문양이 나타났다. 아무도 발견하지 못한 땅이 아니라 서로 다른 사람들이 감춰 둔 진실의 이름이었다.", rewardCoins = 1500, rewardFame = 85, rewardCareer = "adventure", rewardXp = 260 } :: Quest)

-- [실존 역사 사건 조사] 과거의 문헌은 후대 항구에서 다시 검증할 수 있다. 소문/기록 분리.
	table.insert(Quests, { id = "q_case_fire_1", name = "불길 속의 봉인된 증언", summary = "런던에서 1666년 대화재와 재건 기록을 조사", kind = "discover_card", cardId = "arch_cathedral", sagaPort = "london", portId = "london", newsSource = "화재 현장 소식", amount = 1, arc = "역사 미스터리 · 런던 대화재", continent = "유럽", strand = "history", minYear = 1666, story = "대화재에서 살아남은 인쇄공은 누군가 창고에 불을 놓았다고 주장한다. 그러나 증언마다 시간이 어긋난다. 불탄 대성당의 기록부터 살펴야 한다.", ending = "피난민의 증언과 화재 기록이 모였지만 방화자를 입증할 자료는 없었다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "history_fire_london_1666" } :: Quest)
	table.insert(Quests, { id = "q_case_fire_2", name = "누가 런던에 불을 질렀나", summary = "암스테르담에서 1666년 방화 음모설과 외교 소문 비교", kind = "discover_card", cardId = "history_fire_london_1666", sagaPort = "amsterdam", portId = "amsterdam", newsSource = "전쟁 중 외교 의혹", amount = 1, arc = "역사 미스터리 · 런던 대화재", continent = "유럽", strand = "history", after = "q_case_fire_1", minYear = 1666, major = true, story = "전쟁 중이던 영국에서 네덜란드와 프랑스가 불을 질렀다는 소문이 퍼졌다. 암스테르담의 상인은 자신이 범인으로 지목된 편지를 내민다.", ending = "당시의 외국인 혐오와 정치적 공포가 사실을 뒤덮었다. 기록에는 사고 조사와 근거 없는 비난을 구분해 남겼다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150, rewardCardId = "history_fire_rumor_1666" } :: Quest)
	table.insert(Quests, { id = "q_case_tulip_1", name = "한 송이 꽃의 과장된 값", summary = "암스테르담에서 1637년 튤립 거래 장부를 조사", kind = "discover_card", cardId = "bot_tulip", sagaPort = "amsterdam", portId = "amsterdam", newsSource = "시장 계약 폭등 소식", amount = 1, arc = "경제 미스터리 · 튤립 광풍", continent = "유럽", strand = "history", minYear = 1637, story = "시장에서 튤립 한 알 값으로 집을 샀다는 이야기가 돈다. 그러나 실제 경매 장부의 숫자는 다르다. 먼저 계약서를 살펴봐야 한다.", ending = "선물 거래와 전매가 급증했다는 사실은 남았지만 전 국민이 파산했다는 소문은 증명되지 않았다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "history_tulip_contract_1637" } :: Quest)
	table.insert(Quests, { id = "q_case_tulip_2", name = "거품의 목격자들은 어디에", summary = "런던에서 네덜란드 투기 소문과 실제 기록 비교", kind = "discover_card", cardId = "history_tulip_contract_1637", sagaPort = "london", portId = "london", newsSource = "선술집의 파산 괴담", amount = 1, arc = "경제 미스터리 · 튤립 광풍", continent = "유럽", strand = "history", after = "q_case_tulip_1", minYear = 1637, major = true, story = "런던 선술집에서 네덜란드 튤립 파산자의 비극을 연극처럼 떠든다. 조롱 뒤에 가려진 계약 당사자들의 기록을 찾아야 한다.", ending = "극적인 소문과 장부의 사실이 서로 다른 페이지에 실렸다. 공포가 돈을 움직인다는 사실만은 남았다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150 } :: Quest)
	table.insert(Quests, { id = "q_case_roanoke_1", name = "사라진 정착지의 한 단어", summary = "아바나에서 로어노크 식민지와 크로아토안 표식 조사", kind = "discover_card", cardId = "mys_roanoke", sagaPort = "havana", portId = "havana", newsSource = "실종 식민지 소문", amount = 1, arc = "미해결 역사 · 로어노크", continent = "북아메리카", strand = "history", minYear = 1590, story = "북아메리카 소식을 전하던 선원은 1590년에 사람이 사라진 정착지의 표식 이야기를 들려준다. 섬에는 초자연적인 흔적이 있었던 것일까.", ending = "남겨진 글자는 실제 장소와 사람을 가리키는 단서였다. 하지만 이주가 실제로 어떻게 이뤄졌는지는 확인되지 않았다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "history_roanoke_croatoan_1590" } :: Quest)
	table.insert(Quests, { id = "q_case_roanoke_2", name = "로어노크의 마지막 항해일지", summary = "런던에서 존 화이트의 귀환 기록 대조", kind = "discover_card", cardId = "history_roanoke_croatoan_1590", sagaPort = "london", portId = "london", newsSource = "귀환 탐험가의 기록", amount = 1, arc = "미해결 역사 · 로어노크", continent = "북아메리카", strand = "history", after = "q_case_roanoke_1", minYear = 1590, major = true, story = "런던의 서고에는 사라진 사람들을 찾던 항해자의 기록이 있다. 정착민들이 죽었다는 주장과 이주했다는 주장이 서로 충돌한다.", ending = "어느 한쪽 가설도 끝까지 입증되지 않았다. 진짜 수수께끼는 사라진 사람들이 아니라 남겨진 증거의 빈칸이었다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150 } :: Quest)
	table.insert(Quests, { id = "q_case_salem_1", name = "보이지 않는 증인의 법정", summary = "보스턴에서 1692년 세일럼 재판과 증거 기준 조사", kind = "discover_card", cardId = "phi_skepticism", sagaPort = "boston", portId = "boston", newsSource = "재판소 고발문", amount = 1, arc = "정치·종교 미스터리 · 세일럼", continent = "북아메리카", strand = "history", minYear = 1692, story = "세일럼의 재판에서 피고인을 해쳤다는 보이지 않는 영혼의 증언이 받아들여졌다. 잘못된 증거가 사람을 죽음으로 몰았다.", ending = "재판 기록에는 공포와 압박이 남았다. 초자연적 혐의는 검증된 사실이 아니었다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "history_salem_trial_1692" } :: Quest)
	table.insert(Quests, { id = "q_case_salem_2", name = "마녀를 만든 것은 무엇인가", summary = "플리머스에서 세일럼 재판 기록과 당시 종교·정치 갈등 조사", kind = "discover_card", cardId = "history_salem_trial_1692", sagaPort = "plymouth", portId = "plymouth", newsSource = "교회 기록과 반론", amount = 1, arc = "정치·종교 미스터리 · 세일럼", continent = "북아메리카", strand = "history", after = "q_case_salem_1", minYear = 1692, major = true, story = "항구에 도착한 재판 문서를 두고 사람들이 다툰다. 마법이 존재했다는 주장보다 누가 어떤 증거를 믿었는지 살펴야 한다.", ending = "희생자의 이름과 법정의 잘못이 기록됐다. 누군가 공포를 이용했다는 단정 대신 확인 가능한 책임을 남겼다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150 } :: Quest)
	table.insert(Quests, { id = "q_case_southsea_1", name = "왕실의 보증과 거품", summary = "런던에서 남해회사 주식과 금융 기록 조사", kind = "discover_card", cardId = "finance_bill_exchange", sagaPort = "london", portId = "london", newsSource = "주식시장의 호외", amount = 1, arc = "정치·금융 미스터리 · 남해회사", continent = "유럽", strand = "history", minYear = 1720, story = "1720년 런던에서 모두가 큰돈을 벌었다는 소문을 듣는다. 국채와 회사의 계약서에 정치인들의 서명이 겹친다.", ending = "가격의 폭등과 추락은 장부에서 확인됐다. 사라진 돈을 단순한 마법처럼 설명할 수는 없었다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "history_south_sea_bubble_1720" } :: Quest)
	table.insert(Quests, { id = "q_case_southsea_2", name = "금융 거품의 공범들", summary = "암스테르담에서 남해회사 투기와 대륙 금융시장 비교", kind = "discover_card", cardId = "history_south_sea_bubble_1720", sagaPort = "amsterdam", portId = "amsterdam", newsSource = "금융인의 내부 증언", amount = 1, arc = "정치·금융 미스터리 · 남해회사", continent = "유럽", strand = "history", after = "q_case_southsea_1", minYear = 1720, major = true, story = "런던의 주식 열풍이 바다를 건너자 암스테르담 상인이 사라진 채권 증서를 내민다. 책임은 누구에게 있었을까.", ending = "비밀 결사 하나가 모든 돈을 움직였다는 이야기는 입증되지 않았다. 대신 실제 계약과 제도가 남긴 위험이 보였다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150 } :: Quest)
	table.insert(Quests, { id = "q_case_lisbon_1", name = "만성절 아침의 무너진 도시", summary = "리스본에서 1755년 지진과 재건 기록 조사", kind = "discover_card", cardId = "arch_dome", sagaPort = "lisbon", portId = "lisbon", newsSource = "지진·해일 현장 소식", amount = 1, arc = "재난·철학 · 리스본의 심판", continent = "유럽", strand = "history", minYear = 1755, story = "성당의 종이 울리던 아침, 땅이 갈라지고 바닷물이 밀려온다. 살아남은 사람들은 재난이 신의 벌인지 자연 현상인지 다투기 시작한다.", ending = "지진·해일·화재는 역사적 사실이다. 원인을 초자연적 응징으로 단정할 근거는 없었다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "history_lisbon_quake_1755" } :: Quest)
	table.insert(Quests, { id = "q_case_lisbon_2", name = "신의 분노인가, 땅의 움직임인가", summary = "세비야에서 리스본 재난의 증언과 철학적 논쟁 비교", kind = "discover_card", cardId = "history_lisbon_quake_1755", sagaPort = "seville", portId = "seville", newsSource = "철학자의 재난 편지", amount = 1, arc = "재난·철학 · 리스본의 심판", continent = "유럽", strand = "history", after = "q_case_lisbon_1", minYear = 1755, major = true, story = "이베리아의 지식인들은 재난을 해석하는 글을 서로에게 보낸다. 도시를 구할 방법을 찾는 사람에게 철학은 무엇을 할 수 있을까.", ending = "관측 기록과 복구 대책이 남았다. 논쟁이 끝나진 않았지만 재난을 이해하려는 새로운 시대가 열렸다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150 } :: Quest)
	table.insert(Quests, { id = "q_case_boston_1", name = "세금 없는 독점의 역설", summary = "보스턴에서 차 세금과 동인도회사 기록 조사", kind = "discover_card", cardId = "good_tea", sagaPort = "boston", portId = "boston", newsSource = "항구의 차세금 시위", amount = 1, arc = "정치·교역 · 차 상자의 밤", continent = "북아메리카", strand = "history", minYear = 1773, story = "1773년 보스턴의 항구에는 차를 실은 배들이 닻을 내렸다. 세금뿐 아니라 독점권과 정치적 대표권을 둘러싼 다툼이 커진다.", ending = "1773년 차법은 단순히 새 세금을 매긴 사건이 아니었다. 차를 둘러싼 독점과 식민지 정치 갈등을 기록했다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "history_boston_tea_1773" } :: Quest)
	table.insert(Quests, { id = "q_case_boston_2", name = "342개의 상자, 하나의 제국", summary = "런던에서 보스턴 차 사건에 대한 의회 기록 조사", kind = "discover_card", cardId = "history_boston_tea_1773", sagaPort = "london", portId = "london", newsSource = "왕실 의회 보고", amount = 1, arc = "정치·교역 · 차 상자의 밤", continent = "북아메리카", strand = "history", after = "q_case_boston_1", minYear = 1773, major = true, story = "바다에 던져진 차 상자 소식이 런던 의회에 도착했다. 반란인가 저항인가. 서로 다른 이름의 사건이 더 큰 전쟁으로 번져 간다.", ending = "사건의 해석은 갈렸지만 기록에는 날짜와 정책, 참여자들의 행동이 남았다. 역사는 승자의 이름만으로 설명되지 않았다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150 } :: Quest)
	table.insert(Quests, { id = "q_case_dejima_1", name = "바다로 열린 단 하나의 창", summary = "나가사키에서 1641년 데지마 상관 기록 조사", kind = "discover_card", cardId = "good_tea", sagaPort = "nagasaki", portId = "nagasaki", newsSource = "동아시아 선원의 전언", amount = 1, arc = "동아시아 정치 · 닫히지 않은 문", continent = "아시아", strand = "history", minYear = 1641, story = "외부의 배를 제한하던 시대, 나가사키의 작은 인공섬에는 해외 상인들의 발걸음이 계속된다. 완전히 닫혔다는 소문과 달리 장부는 움직이고 있다.", ending = "교역 제한과 모든 교류의 단절은 다른 말이었다. 데지마의 기록에서 사람과 지식의 흐름이 확인됐다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "history_dejima_exchange_1641" } :: Quest)
	table.insert(Quests, { id = "q_case_dejima_2", name = "봉쇄와 교역의 틈", summary = "마닐라에서 동아시아 해상 교역망과 데지마 기록 비교", kind = "discover_card", cardId = "history_dejima_exchange_1641", sagaPort = "manila", portId = "manila", newsSource = "외국 상관의 무역 장부", amount = 1, arc = "동아시아 정치 · 닫히지 않은 문", continent = "아시아", strand = "history", after = "q_case_dejima_1", minYear = 1641, major = true, story = "마닐라 상인은 일본이 바다 문을 완전히 닫았다는 말을 반복한다. 하지만 데지마의 장부에는 여전히 교역이 적혀 있다.", ending = "서로 다른 제도가 해역을 나눴지만 해상 교류는 다양한 경로로 이어졌다. 단절의 신화 뒤에 실제 사람들이 있었다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150 } :: Quest)
	table.insert(Quests, { id = "q_case_atlantis_1", name = "플라톤이 그린 섬", summary = "베네치아에서 아틀란티스와 고전 문헌 대조", kind = "discover_card", cardId = "myth_atlantis", sagaPort = "venice", portId = "venice", newsSource = "골동품 시장의 고지도", amount = 1, arc = "신화의 진실 · 아틀란티스", continent = "유럽", strand = "history", minYear = 1517, story = "고서점 주인은 바다 아래 황금 도시의 지도를 비싸게 팔려 한다. 그러나 지도에 적힌 지명은 플라톤의 글에서 가져온 것이다.", ending = "책 속 섬의 이야기는 남았지만 실제 위치를 증명하는 해도는 없었다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "myth_plato_atlantis_record" } :: Quest)
	table.insert(Quests, { id = "q_case_atlantis_2", name = "잃어버린 도시의 증거", summary = "리스본에서 아틀란티스 문헌과 항해 기록 비교", kind = "discover_card", cardId = "myth_plato_atlantis_record", sagaPort = "lisbon", portId = "lisbon", newsSource = "학자의 고전 문헌", amount = 1, arc = "신화의 진실 · 아틀란티스", continent = "유럽", strand = "history", after = "q_case_atlantis_1", minYear = 1517, major = true, story = "리스본의 선주가 고전의 한 문장을 실제 탐험의 증거라 주장한다. 기록자가 진실과 상상을 구별하지 못하면 사람들은 실존하지 않는 섬을 찾아 죽을 수 있다.", ending = "문헌의 아름다움은 남기고 실재 여부는 미확인으로 표시했다. 전설은 숨기지 않았지만 사실로 둔갑시키지도 않았다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150 } :: Quest)
	table.insert(Quests, { id = "q_case_hybrasil_1", name = "안개 속의 섬", summary = "런던에서 하이 브라실 고지도 조사", kind = "discover_card", cardId = "lost_hy_brasil", sagaPort = "london", portId = "london", newsSource = "선원의 안개 속 섬 목격담", amount = 1, arc = "신화의 진실 · 하이 브라실", continent = "유럽", strand = "history", minYear = 1517, story = "아일랜드 서쪽에서 안개가 걷히면 섬이 나타난다는 해도가 들어왔다. 항구 사람들은 누군가 섬에서 돌아왔다며 다투기 시작한다.", ending = "오래된 해도에 섬은 있었지만, 현장에서 실재를 확인했다는 증거는 없었다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "lost_antillia" } :: Quest)
	table.insert(Quests, { id = "q_case_hybrasil_2", name = "지도에만 남은 땅", summary = "리스본에서 실재하지 않는 섬의 해도와 항로 비교", kind = "discover_card", cardId = "lost_antillia", sagaPort = "lisbon", portId = "lisbon", newsSource = "지도 제작자의 고문서", amount = 1, arc = "신화의 진실 · 하이 브라실", continent = "유럽", strand = "history", after = "q_case_hybrasil_1", minYear = 1517, major = true, story = "서로 다른 시대의 지도마다 섬의 모양이 바뀐다. 항해사는 말한다. 지도도 소문을 따라 움직일 수 있다고.", ending = "실재하지 않는 섬의 이야기를 지운 것이 아니라 고지도와 신화의 칸에 정직하게 보관했다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150 } :: Quest)
	table.insert(Quests, { id = "q_case_kraken_1", name = "섬처럼 떠오른 괴물", summary = "스톡홀름에서 크라켄 목격담과 괴물 전승 조사", kind = "discover_card", cardId = "myth_kraken", sagaPort = "stockholm", portId = "stockholm", newsSource = "어부의 바다 괴물 목격담", amount = 1, arc = "신화의 진실 · 크라켄", continent = "유럽", strand = "history", minYear = 1517, story = "북해의 선원은 바다에서 섬처럼 솟는 괴물을 봤다며 떨고 있다. 하지만 생물학자는 거대한 해양 동물과 파도를 먼저 살펴보자고 한다.", ending = "선원들의 공포는 진짜였지만 괴물의 정체는 별개의 질문이었다.", rewardCoins = 240, rewardFame = 12, rewardCareer = "adventure", rewardXp = 60, rewardCardId = "myth_leviathan" } :: Quest)
	table.insert(Quests, { id = "q_case_kraken_2", name = "심해에 남겨진 목격담", summary = "런던에서 크라켄과 리바이어던 전승을 비교", kind = "discover_card", cardId = "myth_leviathan", sagaPort = "london", portId = "london", newsSource = "해양 생물 삽화와 전승", amount = 1, arc = "신화의 진실 · 크라켄", continent = "유럽", strand = "history", after = "q_case_kraken_1", minYear = 1517, major = true, story = "서로 다른 문화의 바다 괴물 이야기가 같은 그림으로 인쇄된다. 전설을 확인하기 위해 무엇이 증거가 되는지 결정해야 한다.", ending = "전설은 사람을 바다로 이끌지만, 생물과 신화를 혼동하지 않는 기록도 함께 남았다.", rewardCoins = 680, rewardFame = 38, rewardCareer = "adventure", rewardXp = 150 } :: Quest)

-- [드라큘라 사건 파일] 문서 → 인쇄물 → 전승 → 1725년 사건 → 1897년 문학.

-- [7대륙 지역 퀘스트] 소식 → 증거 수집 → 지역 백과사전 카드.
	table.insert(Quests, { id = "q_region_eu_ireland_1", name = "고대 거석의 비밀", summary = "고대 유적 발견 — dublin에서 확인", kind = "discover_card", cardId = "site_newgrange", portId = "dublin", sagaPort = "dublin", newsSource = "고대 유적 발견", amount = 1, arc = "아일랜드와 켈트 전승", continent = "유럽", strand = "history", story = "보인 계곡의 거석에서 해와 별의 흐름을 가리킨다는 무늬가 발견됐다. 누가 만들었는지 조사한다.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_eu_ireland_2", name = "물개 처녀를 보았다는 증언", summary = "선술집의 바다 전설 — edinburgh에서 확인", kind = "discover_card", cardId = "myth_selkie", portId = "edinburgh", sagaPort = "edinburgh", newsSource = "선술집의 바다 전설", amount = 1, arc = "아일랜드와 켈트 전승", continent = "유럽", strand = "history", after = "q_region_eu_ireland_1", story = "스코틀랜드 어부들은 물개가 사람이 된다는 전설을 전한다. 옛 유물의 기록과 구전이 뒤섞였다.", ending = "뉴그레인지 거석은 실재 유산이고 셀키는 전승이다. 서로 다른 근거로 기록했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_eu_ireland" } :: Quest)
	table.insert(Quests, { id = "q_region_eu_northsea_1", name = "바다의 거대한 그림자", summary = "포경선 목격담 — bergen에서 확인", kind = "discover_card", cardId = "zoo_whale", portId = "bergen", sagaPort = "bergen", newsSource = "포경선 목격담", amount = 1, arc = "북해와 스칸디나비아", continent = "유럽", strand = "history", story = "베르겐의 선원은 검은 섬이 움직였다고 말한다. 고래의 생태를 먼저 조사한다.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_eu_northsea_2", name = "하늘에서 춤추는 녹색 불", summary = "천문대 관측 — stockholm에서 확인", kind = "discover_card", cardId = "ast_aurora", portId = "stockholm", sagaPort = "stockholm", newsSource = "천문대 관측", amount = 1, arc = "북해와 스칸디나비아", continent = "유럽", strand = "history", after = "q_region_eu_northsea_1", story = "스톡홀름에서는 밤하늘의 빛을 괴물의 신호라 부른다. 천문 관측 기록을 비교한다.", ending = "거대한 동물과 오로라가 모두 자연 현상이라는 사실을 확인했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_eu_northsea" } :: Quest)
	table.insert(Quests, { id = "q_region_eu_pompeii_1", name = "화산재 아래의 마지막 아침", summary = "발굴 현장 통보 — naples에서 확인", kind = "discover_card", cardId = "site_pompeii", portId = "naples", sagaPort = "naples", newsSource = "발굴 현장 통보", amount = 1, arc = "이탈리아 로마 유산", continent = "유럽", strand = "history", minYear = 1748, story = "나폴리에서 고대 도시의 유적이 발견됐다. 화산재가 덮은 하루의 기록을 찾아야 한다.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_eu_pompeii_2", name = "사라진 조각의 행방", summary = "수집가의 비밀 거래 — livorno에서 확인", kind = "discover_card", cardId = "min_marble", portId = "livorno", sagaPort = "livorno", newsSource = "수집가의 비밀 거래", amount = 1, arc = "이탈리아 로마 유산", continent = "유럽", strand = "history", after = "q_region_eu_pompeii_1", minYear = 1748, major = true, story = "리보르노의 수집가가 발굴품을 숨기고 있다. 석재와 거래 기록을 비교한다.", ending = "서기 79년의 재난은 역사이며 유적에 걸린 저주라는 이야기는 증명되지 않았다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_eu_pompeii" } :: Quest)
	table.insert(Quests, { id = "q_region_as_redsea_1", name = "붉은 바다의 사라진 계약", summary = "상단 연락 두절 — aden에서 확인", kind = "discover_card", cardId = "geo_red_sea", portId = "aden", sagaPort = "aden", newsSource = "상단 연락 두절", amount = 1, arc = "홍해와 예멘", continent = "아시아", strand = "history", story = "아덴의 상단 장부가 중간에서 끊겼다. 홍해의 해로를 조사해야 한다.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_as_redsea_2", name = "커피 한 잔이 만든 항로", summary = "커피 상인의 제안 — mocha에서 확인", kind = "discover_card", cardId = "good_coffee", portId = "mocha", sagaPort = "mocha", newsSource = "커피 상인의 제안", amount = 1, arc = "홍해와 예멘", continent = "아시아", strand = "history", after = "q_region_as_redsea_1", story = "모카 상인은 커피의 유통을 둘러싼 소문을 전한다. 시장과 여행자의 기록을 비교한다.", ending = "홍해 항로와 커피 교역이 세계 여러 항구의 문화와 경제를 연결했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_as_redsea" } :: Quest)
	table.insert(Quests, { id = "q_region_as_malacca_1", name = "바다 길목을 막은 사람들", summary = "도선사의 긴급 소식 — malacca에서 확인", kind = "discover_card", cardId = "geo_malacca_strait", portId = "malacca", sagaPort = "malacca", newsSource = "도선사의 긴급 소식", amount = 1, arc = "말라카와 동남아시아", continent = "아시아", strand = "history", story = "말라카 해협에 배가 줄었다. 해적 때문인지 통행 규칙 때문인지 기록을 조사한다.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_as_malacca_2", name = "운하 옆에 남은 수상한 장부", summary = "운하 창고 사건 — batavia에서 확인", kind = "discover_card", cardId = "site_batavia_canal", portId = "batavia", sagaPort = "batavia", newsSource = "운하 창고 사건", amount = 1, arc = "말라카와 동남아시아", continent = "아시아", strand = "history", after = "q_region_as_malacca_1", major = true, story = "바타비아 운하에서 사라진 화물의 장부가 발견됐다. 해협과 도시의 교역을 연결한다.", ending = "해협 지리와 무역 독점의 실제 기록을 구분했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_as_malacca" } :: Quest)
	table.insert(Quests, { id = "q_region_as_japan_1", name = "닫힌 나라의 열린 서고", summary = "데지마 통관 기록 — nagasaki에서 확인", kind = "discover_card", cardId = "site_dejima", portId = "nagasaki", sagaPort = "nagasaki", newsSource = "데지마 통관 기록", amount = 1, arc = "일본과 데지마", continent = "아시아", strand = "history", story = "나가사키의 상관에는 해외 문서가 들어오고 있었다. 교역이 완전히 끊겼다는 소문과 다르다.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_as_japan_2", name = "목판에 새겨진 낯선 배", summary = "인쇄소의 신간 — osaka에서 확인", kind = "discover_card", cardId = "relic_woodblock", portId = "osaka", sagaPort = "osaka", newsSource = "인쇄소의 신간", amount = 1, arc = "일본과 데지마", continent = "아시아", strand = "history", after = "q_region_as_japan_1", story = "오사카 인쇄소에서 외국 배를 그린 목판을 찾았다. 교역 장부와 그림을 비교하자.", ending = "교역 제한 아래에서도 물품과 지식이 움직였음을 기록했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_as_japan" } :: Quest)
	table.insert(Quests, { id = "q_region_af_goree_1", name = "섬에서 지워진 사람들의 이름", summary = "역사 증언 — dakar에서 확인", kind = "discover_card", cardId = "site_goree", portId = "dakar", sagaPort = "dakar", newsSource = "역사 증언", amount = 1, arc = "세네갈과 비사고스", continent = "아프리카", strand = "history", story = "고레 섬의 역사 문서에서 강제로 이송된 사람들의 흔적을 발견한다. 사람을 화물처럼 취급한 기록을 바로 읽어야 한다.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_af_goree_2", name = "뿌리가 숨긴 해안의 길", summary = "해안 생태 발견 — bissau에서 확인", kind = "discover_card", cardId = "bot_mangrove", portId = "bissau", sagaPort = "bissau", newsSource = "해안 생태 발견", amount = 1, arc = "세네갈과 비사고스", continent = "아프리카", strand = "history", after = "q_region_af_goree_1", major = true, story = "비사우의 맹그로브 숲에는 물때에 따라 길이 나타난다. 주민들이 지켜 온 해안 지식을 배우자.", ending = "인간의 역사와 생태 지식 모두 현지의 기록을 중심에 놓았다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_af_goree" } :: Quest)
	table.insert(Quests, { id = "q_region_af_zanzibar_1", name = "돌의 도시에 도착한 편지", summary = "상인 가문의 편지 — zanzibar에서 확인", kind = "discover_card", cardId = "site_zanzibar_stone", portId = "zanzibar", sagaPort = "zanzibar", newsSource = "상인 가문의 편지", amount = 1, arc = "스와힐리 해안", continent = "아프리카", strand = "history", story = "잔지바르의 도시에서 서로 다른 문화의 오래된 편지를 찾는다.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_af_zanzibar_2", name = "성채에서 바뀐 깃발", summary = "성채 보고서 — mombasa에서 확인", kind = "discover_card", cardId = "site_fort_jesus", portId = "mombasa", sagaPort = "mombasa", newsSource = "성채 보고서", amount = 1, arc = "스와힐리 해안", continent = "아프리카", strand = "history", after = "q_region_af_zanzibar_1", story = "몸바사의 요새에 남은 전쟁 기록은 누구의 승리였다는 말만 하지 않는다. 주민의 흔적도 찾아야 한다.", ending = "스와힐리 해안의 교역과 정치 역사를 여러 관점에서 기록했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_af_zanzibar" } :: Quest)
	table.insert(Quests, { id = "q_region_af_niger_1", name = "사람처럼 숨 쉬는 바다 동물", summary = "어부의 신기한 목격 — bissau에서 확인", kind = "discover_card", cardId = "zoo_manatee", portId = "bissau", sagaPort = "bissau", newsSource = "어부의 신기한 목격", amount = 1, arc = "니제르 강과 서아프리카", continent = "아프리카", strand = "history", story = "비사우 어부들은 물 위로 나타난 동물을 인어라 부른다. 바다소의 실제 모습을 관찰하자.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_af_niger_2", name = "밤의 강에서 들린 큰 울음", summary = "주민의 밤낮 관찰 — calabar에서 확인", kind = "discover_card", cardId = "zoo_hippo", portId = "calabar", sagaPort = "calabar", newsSource = "주민의 밤낮 관찰", amount = 1, arc = "니제르 강과 서아프리카", continent = "아프리카", strand = "history", after = "q_region_af_niger_1", story = "칼라바르에서는 강에서 거대한 생물이 울부짖었다는 소식이 돈다. 하마의 습성을 조사한다.", ending = "바다소와 하마의 생물학적 특징을 전설과 구별했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_af_niger" } :: Quest)
	table.insert(Quests, { id = "q_region_na_cod_1", name = "끝없이 나오는 대구의 수수께끼", summary = "어부의 주장 — st_johns에서 확인", kind = "discover_card", cardId = "am_cod_grand", portId = "st_johns", sagaPort = "st_johns", newsSource = "어부의 주장", amount = 1, arc = "뉴펀들랜드와 래브라도", continent = "북아메리카", strand = "history", story = "대구가 끝없이 나온다는 선원들의 소문을 조사한다. 실제 어장과 생태에는 한계가 있다.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_na_cod_2", name = "차가운 바다가 숨긴 답", summary = "기상 관측 기록 — halifax에서 확인", kind = "discover_card", cardId = "geo_labrador_current", portId = "halifax", sagaPort = "halifax", newsSource = "기상 관측 기록", amount = 1, arc = "뉴펀들랜드와 래브라도", continent = "북아메리카", strand = "history", after = "q_region_na_cod_1", story = "핼리팩스 기상 기록에는 찬 해류가 어장과 항로를 바꾼다는 사실이 남았다.", ending = "대구와 해류의 관계는 확인됐고 자원이 무한하다는 믿음은 반증됐다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_na_cod" } :: Quest)
	table.insert(Quests, { id = "q_region_na_maya_1", name = "태양석이 예고한 종말?", summary = "유물 경매 소문 — veracruz에서 확인", kind = "discover_card", cardId = "am_aztec_calendar", portId = "veracruz", sagaPort = "veracruz", newsSource = "유물 경매 소문", amount = 1, arc = "멕시코와 마야", continent = "북아메리카", strand = "history", story = "베라크루스 경매장에 아즈텍 유물이 등장했다. 종말 예언이라는 주장은 어디서 생겼을까?", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_na_maya_2", name = "밀림이 숨긴 글자", summary = "밀림 유적 발견 — campeche에서 확인", kind = "discover_card", cardId = "am_maya_stela", portId = "campeche", sagaPort = "campeche", newsSource = "밀림 유적 발견", amount = 1, arc = "멕시코와 마야", continent = "북아메리카", strand = "history", after = "q_region_na_maya_1", major = true, story = "캄페체 밀림에서 마야 석비가 발견됐다. 해독할 수 없는 글을 저주로 부르는 상인을 막아야 한다.", ending = "메소아메리카 문명의 실제 달력과 문자를 역사 지식으로 기록했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_na_maya" } :: Quest)
	table.insert(Quests, { id = "q_region_sa_amazon_1", name = "배를 감은 물속의 그림자", summary = "강 어부의 목격담 — belem에서 확인", kind = "discover_card", cardId = "am_anaconda", portId = "belem", sagaPort = "belem", newsSource = "강 어부의 목격담", amount = 1, arc = "아마존과 수리남", continent = "남아메리카", strand = "history", story = "벨렝의 어부는 배보다 큰 뱀이 있었다고 주장한다. 아나콘다의 실제 생태를 조사하자.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_sa_amazon_2", name = "사라진 발자국의 주인", summary = "밀림의 현장 증거 — paramaribo에서 확인", kind = "discover_card", cardId = "am_jaguar", portId = "paramaribo", sagaPort = "paramaribo", newsSource = "밀림의 현장 증거", amount = 1, arc = "아마존과 수리남", continent = "남아메리카", strand = "history", after = "q_region_sa_amazon_1", story = "수리남의 밀림에서는 자취만 남기는 재규어가 목격됐다. 괴담과 야생동물의 행동을 구분한다.", ending = "아나콘다와 재규어가 자연사 도감에 기록됐다. 괴물 소문은 미확인으로 남았다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_sa_amazon" } :: Quest)
	table.insert(Quests, { id = "q_region_sa_inca_1", name = "매듭이 전한 마지막 숫자", summary = "탐험가의 매듭 — buenos_aires에서 확인", kind = "discover_card", cardId = "am_inca_quipu", portId = "buenos_aires", sagaPort = "buenos_aires", newsSource = "탐험가의 매듭", amount = 1, arc = "안데스와 잉카", continent = "남아메리카", strand = "history", story = "안데스의 기록자가 문자 대신 매듭으로 남긴 장부를 보여 준다. 누가 읽을 수 있는지 조사하자.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_sa_inca_2", name = "구름 위에 남은 도시", summary = "고산 유적 소식 — callao에서 확인", kind = "discover_card", cardId = "site_machu_picchu", portId = "callao", sagaPort = "callao", newsSource = "고산 유적 소식", amount = 1, arc = "안데스와 잉카", continent = "남아메리카", strand = "history", after = "q_region_sa_inca_1", major = true, story = "카야오의 선주는 산 위에 잊힌 황금 도시가 있다고 주장한다. 실재 유적과 금의 전설을 분리한다.", ending = "키푸와 안데스의 도시 유산은 실재하며 보물 전설은 별도 분류했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_sa_inca" } :: Quest)
	table.insert(Quests, { id = "q_region_oc_australia_1", name = "두 발로 뛰는 낯선 동물", summary = "동물 목격담 — sydney에서 확인", kind = "discover_card", cardId = "pac_kangaroo", portId = "sydney", sagaPort = "sydney", newsSource = "동물 목격담", amount = 1, arc = "오스트레일리아 동물", continent = "오세아니아", strand = "history", story = "시드니로 들어온 선원이 주머니 달린 동물 이야기를 한다. 현장에서 관찰하자.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_oc_australia_2", name = "산호 아래의 물고기 색", summary = "자연학자의 표본 — perth에서 확인", kind = "discover_card", cardId = "pac_great_barrier_fish", portId = "perth", sagaPort = "perth", newsSource = "자연학자의 표본", amount = 1, arc = "오스트레일리아 동물", continent = "오세아니아", strand = "history", after = "q_region_oc_australia_1", story = "서해안으로 온 자연학자는 산호초 생물을 그린 표본집을 보여 준다. 서식지와 분류를 확인해야 한다.", ending = "오스트레일리아의 육상동물과 산호초 어류를 실제 생물학으로 기록했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_oc_australia" } :: Quest)
	table.insert(Quests, { id = "q_region_oc_islands_1", name = "수백 년 산다는 나무", summary = "숲 지킴이의 편지 — auckland에서 확인", kind = "discover_card", cardId = "pac_kauri_tree", portId = "auckland", sagaPort = "auckland", newsSource = "숲 지킴이의 편지", amount = 1, arc = "뉴질랜드와 피지", continent = "오세아니아", strand = "history", story = "오클랜드의 숲 지킴이가 나무가 인간보다 오래 산다고 말한다. 생장 기록을 조사하자.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_oc_islands_2", name = "섬마다 달라지는 붉은 꽃", summary = "현지 식물 관찰 — suva에서 확인", kind = "discover_card", cardId = "pac_hibiscus", portId = "suva", sagaPort = "suva", newsSource = "현지 식물 관찰", amount = 1, arc = "뉴질랜드와 피지", continent = "오세아니아", strand = "history", after = "q_region_oc_islands_1", major = true, story = "수바 주민은 같은 꽃에도 여러 이름이 있다고 말한다. 식물을 현지 지식과 대조해 분류한다.", ending = "카우리와 히비스커스가 각각의 식물학 자료로 정리됐다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_oc_islands" } :: Quest)
	table.insert(Quests, { id = "q_region_an_ice_1", name = "세계지도 아래 지워진 땅", summary = "지도 제작자의 가설 — amsterdam에서 확인", kind = "discover_card", cardId = "lost_terra_australis", portId = "amsterdam", sagaPort = "amsterdam", newsSource = "지도 제작자의 가설", amount = 1, arc = "남극권과 남방 대륙", continent = "남극", strand = "history", minYear = 1773, story = "고지도에는 남쪽에 거대한 대륙이 그려져 있다. 탐험가들의 가설을 조사하자.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_an_ice_2", name = "얼음 앞에서 멈춘 항해일지", summary = "극지 항해의 문서 — hobart에서 확인", kind = "discover_card", cardId = "geo_antarctic_circle", portId = "hobart", sagaPort = "hobart", newsSource = "극지 항해의 문서", amount = 1, arc = "남극권과 남방 대륙", continent = "남극", strand = "history", after = "q_region_an_ice_1", minYear = 1773, major = true, story = "호바트의 서고에 1773년 남극권을 넘은 항해 기록이 도착했다. 얼음을 본 것과 대륙에 닿은 것은 다르다.", ending = "남방 대륙의 가설과 실제 남극권 항해를 구분했다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_an_ice" } :: Quest)
	table.insert(Quests, { id = "q_region_an_ocean_1", name = "세상의 끝에서 사라진 배", summary = "선단의 조난 신호 — montevideo에서 확인", kind = "discover_card", cardId = "geo_cape_horn", portId = "montevideo", sagaPort = "montevideo", newsSource = "선단의 조난 신호", amount = 1, arc = "남극 바다와 두 대양", continent = "남극", strand = "history", story = "몬테비데오의 선단이 케이프혼의 폭풍 속에서 사라졌다. 실제 항로와 조류를 조사한다.", ending = "첫 번째 증거를 확보했다. 다른 항구에서 두 번째 증언을 확인해야 한다.", rewardCoins = 200, rewardFame = 10, rewardCareer = "adventure", rewardXp = 55 } :: Quest)
	table.insert(Quests, { id = "q_region_an_ocean_2", name = "두 곶의 바람을 비교하라", summary = "등대지기의 기상 기록 — cape_town에서 확인", kind = "discover_card", cardId = "geo_cape_good_hope", portId = "cape_town", sagaPort = "cape_town", newsSource = "등대지기의 기상 기록", amount = 1, arc = "남극 바다와 두 대양", continent = "남극", strand = "history", after = "q_region_an_ocean_1", story = "케이프타운의 등대지기는 희망봉의 바람이 바뀌었다고 전한다. 남쪽 바다의 지리를 비교한다.", ending = "남극 주변 남방 항로의 위험을 실증 기록으로 남겼다.", rewardCoins = 650, rewardFame = 32, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "region_an_ocean" } :: Quest)

-- [추가 지역 전문 조사] 기존 항구·탐험지 재사용.
	table.insert(Quests, { id = "q_region_eu_baltic_1", name = "크레인 밑의 낙인", summary = "도난 화물 신고 — 그단스크 조사", kind = "discover_card", cardId = "site_gdansk_crane", portId = "gdansk", sagaPort = "gdansk", newsSource = "도난 화물 신고", amount = 1, arc = "발트해 한자동맹", continent = "유럽", strand = "history", story = "그단스크 부두에 주인 없는 상자가 도착했다. 상자에 찍힌 한자 상인들의 낙인이 서로 다르다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_eu_baltic_2", name = "길드 장부의 암호", summary = "길드의 숨은 장부 — 뤼베크 조사", kind = "discover_card", cardId = "lang_hanse_trade", portId = "lubeck", sagaPort = "lubeck", newsSource = "길드의 숨은 장부", amount = 1, arc = "발트해 한자동맹", continent = "유럽", strand = "history", after = "q_region_eu_baltic_1", story = "뤼베크 길드의 장부에는 여러 항구의 상업어가 섞여 있다. 누가 거래를 숨겼는지 찾아야 한다.", ending = "발트해 상업조직과 항구 언어가 사건을 설명했다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_eu_baltic" } :: Quest)
	table.insert(Quests, { id = "q_region_eu_brittany_1", name = "거석들이 선 이유", summary = "고고학자의 의뢰 — 보르도 조사", kind = "discover_card", cardId = "site_carnac", portId = "bordeaux", sagaPort = "bordeaux", newsSource = "고고학자의 의뢰", amount = 1, arc = "브르타뉴 고대 신화", continent = "유럽", strand = "history", story = "브르타뉴 거석이 달과 해를 가리킨다는 보고를 현장에서 확인한다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_eu_brittany_2", name = "잠긴 도시 이스의 종", summary = "어부의 기묘한 소문 — 루앙 조사", kind = "discover_card", cardId = "myth_ys", portId = "rouen", sagaPort = "rouen", newsSource = "어부의 기묘한 소문", amount = 1, arc = "브르타뉴 고대 신화", continent = "유럽", strand = "history", after = "q_region_eu_brittany_1", major = true, story = "어부가 물에 잠긴 도시의 종소리를 들었다고 한다. 고대 유산과 전설을 구별한다.", ending = "거석은 실재 유적이고 가라앉은 도시는 전설이다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_eu_brittany" } :: Quest)
	table.insert(Quests, { id = "q_region_eu_runes_1", name = "룬이 새긴 마지막 이름", summary = "농부의 유물 신고 — 예테보리 조사", kind = "discover_card", cardId = "relic_runestone", portId = "gothenburg", sagaPort = "gothenburg", newsSource = "농부의 유물 신고", amount = 1, arc = "북유럽 바이킹 시대", continent = "유럽", strand = "history", story = "들판의 룬석을 두고 저주라는 이야기가 퍼진다. 글자의 뜻부터 알아야 한다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_eu_runes_2", name = "바다에서 건진 옛 선박", summary = "난파선 인양 — 베르겐 조사", kind = "discover_card", cardId = "relic_viking_ship", portId = "bergen", sagaPort = "bergen", newsSource = "난파선 인양", amount = 1, arc = "북유럽 바이킹 시대", continent = "유럽", strand = "history", after = "q_region_eu_runes_1", story = "베르겐 항구에서 발견한 배 유물은 여러 세대의 이동을 증언한다.", ending = "룬 문자와 선박은 실제 북유럽 역사 자료로 분류됐다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_eu_runes" } :: Quest)
	table.insert(Quests, { id = "q_region_as_korea_1", name = "물때가 숨긴 해로", summary = "도선사의 관측 — 부산 조사", kind = "discover_card", cardId = "geo_tidal_flats", portId = "busan", sagaPort = "busan", newsSource = "도선사의 관측", amount = 1, arc = "조선 해전과 해안", continent = "아시아", strand = "history", story = "부산의 도선사는 조수 때문에 배가 좌초했다고 말한다. 기록을 대조하자.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_as_korea_2", name = "전쟁 기록 속 화차", summary = "군사 기록 — 인천 조사", kind = "discover_card", cardId = "mil_hwacha", portId = "incheon", sagaPort = "incheon", newsSource = "군사 기록", amount = 1, arc = "조선 해전과 해안", continent = "아시아", strand = "history", after = "q_region_as_korea_1", major = true, story = "인천에는 옛 화차를 그린 문서가 전해진다. 전설보다 병기의 구조를 살핀다.", ending = "해안 지형과 군사기술이 시대의 기록으로 남았다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_as_korea" } :: Quest)
	table.insert(Quests, { id = "q_region_as_malabar_1", name = "후추 한 알을 둘러싼 거래", summary = "향신료 시장 소문 — 캘리컷 조사", kind = "discover_card", cardId = "good_pepper", portId = "calicut", sagaPort = "calicut", newsSource = "향신료 시장 소문", amount = 1, arc = "인도 말라바르", continent = "아시아", strand = "history", story = "후추 값이 오르자 상단들은 서로 음모를 의심한다. 실제 생산지를 조사해야 한다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_as_malabar_2", name = "해변의 거대한 그물", summary = "어부의 기술 발견 — 코친 조사", kind = "discover_card", cardId = "site_cochin_nets", portId = "cochin", sagaPort = "cochin", newsSource = "어부의 기술 발견", amount = 1, arc = "인도 말라바르", continent = "아시아", strand = "history", after = "q_region_as_malabar_1", story = "코친 어부가 바다에서 들어 올리는 그물을 보여 준다. 현지의 오래된 기술을 기록하자.", ending = "향신료 교역과 어로기술이 인도양의 역사를 만들었다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_as_malabar" } :: Quest)
	table.insert(Quests, { id = "q_region_as_persian_1", name = "요새에 남은 포탄", summary = "요새의 보고서 — 무스카트 조사", kind = "discover_card", cardId = "site_muscat_forts", portId = "muscat", sagaPort = "muscat", newsSource = "요새의 보고서", amount = 1, arc = "아라비아와 페르시아만", continent = "아시아", strand = "history", story = "무스카트의 성벽에 다른 나라의 포탄 자국이 남아 있다. 여러 전투 기록이 충돌한다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_as_persian_2", name = "수로에서 사라진 문서", summary = "수로 관리인의 증언 — 바스라 조사", kind = "discover_card", cardId = "site_basra_canals", portId = "basra", sagaPort = "basra", newsSource = "수로 관리인의 증언", amount = 1, arc = "아라비아와 페르시아만", continent = "아시아", strand = "history", after = "q_region_as_persian_1", story = "바스라 운하의 장부에는 화물의 목적지가 지워져 있다. 수로와 상권을 조사한다.", ending = "요새와 운하의 기록은 군사와 무역의 접점이었다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_as_persian" } :: Quest)
	table.insert(Quests, { id = "q_region_as_spice_1", name = "사라진 육두구 지도", summary = "지도 도난 사건 — 반다 조사", kind = "discover_card", cardId = "geo_spice_islands", portId = "banda", sagaPort = "banda", newsSource = "지도 도난 사건", amount = 1, arc = "향신료 제도", continent = "아시아", strand = "history", story = "반다의 지도 제작자가 자신의 해도가 도난당했다고 말한다. 향신료가 왜 그토록 비쌌을까?", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_as_spice_2", name = "정향 섬의 바람", summary = "상인의 계절풍 기록 — 테르나테 조사", kind = "discover_card", cardId = "geo_monsoon", portId = "ternate", sagaPort = "ternate", newsSource = "상인의 계절풍 기록", amount = 1, arc = "향신료 제도", continent = "아시아", strand = "history", after = "q_region_as_spice_1", major = true, story = "테르나테의 항해사는 계절풍 때문에 거래 시기가 바뀐다고 말한다. 지리와 독점 거래를 확인하자.", ending = "향신료 제도의 지리와 무역 독점의 역사적 배경이 정리됐다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_as_spice" } :: Quest)
	table.insert(Quests, { id = "q_region_af_elmina_1", name = "숫자로 적힌 사람들", summary = "요새 장부 발견 — 엘미나 조사", kind = "discover_card", cardId = "site_elmina_castle", portId = "elmina", sagaPort = "elmina", newsSource = "요새 장부 발견", amount = 1, arc = "서아프리카 요새의 기록", continent = "아프리카", strand = "history", story = "엘미나 요새의 장부에는 사람을 화물처럼 적은 기록이 남아 있다. 이름을 되찾아야 한다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_af_elmina_2", name = "닫힌 문을 연 쇠열쇠", summary = "유물의 출처 조사 — 위다 조사", kind = "discover_card", cardId = "relic_slave_fort_key", portId = "ouidah", sagaPort = "ouidah", newsSource = "유물의 출처 조사", amount = 1, arc = "서아프리카 요새의 기록", continent = "아프리카", strand = "history", after = "q_region_af_elmina_1", major = true, story = "위다에 도착한 쇠열쇠의 출처를 확인하자. 억압의 역사를 거래 이야기로 가릴 수 없다.", ending = "강제 이송과 노예무역의 역사를 피해자의 기록과 함께 보존했다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_af_elmina" } :: Quest)
	table.insert(Quests, { id = "q_region_af_cape_1", name = "폭풍 속의 하얀 돛", summary = "등대의 이상 소식 — 케이프타운 조사", kind = "discover_card", cardId = "geo_cape_good_hope", portId = "cape_town", sagaPort = "cape_town", newsSource = "등대의 이상 소식", amount = 1, arc = "희망봉과 남인도양", continent = "아프리카", strand = "history", story = "희망봉의 등대지기는 유령선을 봤다고 말한다. 실제 실종 선박의 기록을 대조하자.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_af_cape_2", name = "바람을 타고 돌아온 사람들", summary = "조난선의 항해일지 — 포트루이 조사", kind = "discover_card", cardId = "geo_trade_winds", portId = "port_louis", sagaPort = "port_louis", newsSource = "조난선의 항해일지", amount = 1, arc = "희망봉과 남인도양", continent = "아프리카", strand = "history", after = "q_region_af_cape_1", story = "포트루이의 항해사는 무역풍의 변화가 생사를 갈랐다고 증언한다.", ending = "유령선은 전설로, 폭풍과 무역풍은 자연 지식으로 정리됐다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_af_cape" } :: Quest)
	table.insert(Quests, { id = "q_region_af_delta_1", name = "강이 바다에서 사라지는 이유", summary = "도선사의 수로 조사 — 칼라바르 조사", kind = "discover_card", cardId = "geo_niger_delta", portId = "calabar", sagaPort = "calabar", newsSource = "도선사의 수로 조사", amount = 1, arc = "니제르강의 맹그로브", continent = "아프리카", strand = "history", story = "칼라바르에서 바다가 강의 물길을 바꿨다는 신고가 들어온다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_af_delta_2", name = "바닷물 속에서 자라는 나무", summary = "해안 생태 발견 — 라고스 조사", kind = "discover_card", cardId = "bot_mangrove", portId = "lagos", sagaPort = "lagos", newsSource = "해안 생태 발견", amount = 1, arc = "니제르강의 맹그로브", continent = "아프리카", strand = "history", after = "q_region_af_delta_1", story = "라고스의 해안 숲은 물에 잠겨도 살아 있다. 맹그로브가 해안 환경에 미치는 영향을 조사한다.", ending = "강 하구와 맹그로브의 자연사가 기록됐다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_af_delta" } :: Quest)
	table.insert(Quests, { id = "q_region_na_pirates_1", name = "검은 수염의 깃발", summary = "해적 유물 경매 — 나소 조사", kind = "discover_card", cardId = "am_blackbeard_flag", portId = "nassau", sagaPort = "nassau", newsSource = "해적 유물 경매", amount = 1, arc = "바하마와 포트로열", continent = "북아메리카", strand = "history", minYear = 1692, story = "나소의 술집에서 해적 깃발의 진위를 놓고 다툼이 벌어진다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_na_pirates_2", name = "바닷속에 가라앉은 도시", summary = "침수 유적 목격 — 킹스턴 조사", kind = "discover_card", cardId = "site_port_royal", portId = "kingston", sagaPort = "kingston", newsSource = "침수 유적 목격", amount = 1, arc = "바하마와 포트로열", continent = "북아메리카", strand = "history", after = "q_region_na_pirates_1", minYear = 1692, major = true, story = "킹스턴에서는 1692년 지진으로 무너진 포트로열의 유적이 드러났다. 보물 소문과 실제 재난을 비교하자.", ending = "해적과 재난의 기록은 확인됐지만 숨겨진 보물은 미확인이다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_na_pirates" } :: Quest)
	table.insert(Quests, { id = "q_region_na_republic_1", name = "새벽의 경고 신호", summary = "기이한 경고 소문 — 보스턴 조사", kind = "discover_card", cardId = "site_old_north_church", portId = "boston", sagaPort = "boston", newsSource = "기이한 경고 소문", amount = 1, arc = "미국 동부의 혁명", continent = "북아메리카", strand = "history", minYear = 1776, story = "보스턴의 교회에 전해진 밤의 신호 이야기를 조사하자. 전승과 당시 기록이 다르다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_na_republic_2", name = "서명을 기다린 문서", summary = "의회 서기관의 편지 — 필라델피아 조사", kind = "discover_card", cardId = "site_independence_hall", portId = "philadelphia", sagaPort = "philadelphia", newsSource = "의회 서기관의 편지", amount = 1, arc = "미국 동부의 혁명", continent = "북아메리카", strand = "history", after = "q_region_na_republic_1", minYear = 1776, major = true, story = "필라델피아의 회의장에는 새 나라의 정치적 선택을 둘러싼 기록이 남았다.", ending = "혁명의 역사와 후대의 영웅담을 분리했다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_na_republic" } :: Quest)
	table.insert(Quests, { id = "q_region_na_fur_1", name = "모피 하나가 바꾼 숲", summary = "상인의 모피 호외 — 퀘벡 조사", kind = "discover_card", cardId = "am_beaver", portId = "quebec", sagaPort = "quebec", newsSource = "상인의 모피 호외", amount = 1, arc = "캐나다 모피 교역", continent = "북아메리카", strand = "history", story = "퀘벡에서 비버 모피 거래로 숲과 주민의 생활이 달라졌다는 소식이 들린다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_na_fur_2", name = "경계 없는 토지 문서", summary = "증서 분쟁 — 뉴욕 조사", kind = "discover_card", cardId = "am_colonial_deed", portId = "new_york", sagaPort = "new_york", newsSource = "증서 분쟁", amount = 1, arc = "캐나다 모피 교역", continent = "북아메리카", strand = "history", after = "q_region_na_fur_1", story = "뉴욕의 토지 문서에는 이곳에 살던 사람들의 경계가 빠져 있다. 원래 기록을 비교해야 한다.", ending = "모피 교역과 토지 문서의 영향을 역사와 생태로 함께 기록했다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_na_fur" } :: Quest)
	table.insert(Quests, { id = "q_region_sa_silver_1", name = "성벽 뒤의 사라진 사람들", summary = "요새 보수 문서 — 카르타헤나 데 인디아스 조사", kind = "discover_card", cardId = "site_cartagena_walls", portId = "cartagena_indias", sagaPort = "cartagena_indias", newsSource = "요새 보수 문서", amount = 1, arc = "카르타헤나와 포토시 은", continent = "남아메리카", strand = "history", story = "카르타헤나의 성벽에는 전쟁을 겪은 사람들의 이름이 남아 있지 않다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_sa_silver_2", name = "은광석을 실어 온 사람은 누구인가", summary = "은 수송 장부 — 포르토벨로 조사", kind = "discover_card", cardId = "am_silver_ore_potosi", portId = "portobelo", sagaPort = "portobelo", newsSource = "은 수송 장부", amount = 1, arc = "카르타헤나와 포토시 은", continent = "남아메리카", strand = "history", after = "q_region_sa_silver_1", major = true, story = "포르토벨로의 은 장터에서 포토시 광산의 강제 노동을 기록한 장부를 찾는다.", ending = "요새와 은 무역의 번영 이면에 존재한 강제 노동의 역사를 남겼다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_sa_silver" } :: Quest)
	table.insert(Quests, { id = "q_region_sa_horn_1", name = "끝의 바다에서 사라진 배", summary = "조난선의 신호 — 몬테비데오 조사", kind = "discover_card", cardId = "geo_cape_horn", portId = "montevideo", sagaPort = "montevideo", newsSource = "조난선의 신호", amount = 1, arc = "케이프혼과 안데스", continent = "남아메리카", strand = "history", story = "몬테비데오의 선단이 케이프혼에서 사라졌다. 폭풍 기록을 대조하자.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_sa_horn_2", name = "산을 넘은 편지", summary = "산맥 측량 보고 — 발파라이소 조사", kind = "discover_card", cardId = "geo_andes", portId = "valparaiso", sagaPort = "valparaiso", newsSource = "산맥 측량 보고", amount = 1, arc = "케이프혼과 안데스", continent = "남아메리카", strand = "history", after = "q_region_sa_horn_1", story = "발파라이소 항해사가 안데스 때문에 바람의 방향이 달라졌다고 말한다. 지형을 조사해야 한다.", ending = "케이프혼과 안데스의 실증 지리가 항해 기록으로 남았다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_sa_horn" } :: Quest)
	table.insert(Quests, { id = "q_region_sa_brazilwood_1", name = "돌아오는 바다거북", summary = "어부의 발견 — 헤시피 조사", kind = "discover_card", cardId = "am_turtle_green", portId = "recife", sagaPort = "recife", newsSource = "어부의 발견", amount = 1, arc = "브라질 해안 생태", continent = "남아메리카", strand = "history", story = "헤시피 어부는 매년 같은 해변에 거북이 돌아온다고 말한다. 산란지를 조사하자.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_sa_brazilwood_2", name = "사라지는 붉은 숲", summary = "벌목 장부의 소식 — 살바도르 조사", kind = "discover_card", cardId = "am_brazilwood_tree", portId = "salvador", sagaPort = "salvador", newsSource = "벌목 장부의 소식", amount = 1, arc = "브라질 해안 생태", continent = "남아메리카", strand = "history", after = "q_region_sa_brazilwood_1", story = "살바도르의 붉은 나무가 교역 때문에 줄어들고 있다. 무역과 자연의 관계를 조사한다.", ending = "바다거북의 생태와 브라질나무의 교역사가 기록됐다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_sa_brazilwood" } :: Quest)
	table.insert(Quests, { id = "q_region_oc_melanesia_1", name = "오래된 뿌리 작물", summary = "마을의 농경 소식 — 포트모르즈비 조사", kind = "discover_card", cardId = "pac_taro", portId = "port_moresby", sagaPort = "port_moresby", newsSource = "마을의 농경 소식", amount = 1, arc = "멜라네시아와 괌", continent = "오세아니아", strand = "history", story = "포트모르즈비의 마을에서 타로가 중요한 식량이라는 사실을 조사하자.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_oc_melanesia_2", name = "산호는 돌이 아니다", summary = "해안 생물 발견 — 괌 조사", kind = "discover_card", cardId = "pac_coral_white", portId = "guam", sagaPort = "guam", newsSource = "해안 생물 발견", amount = 1, arc = "멜라네시아와 괌", continent = "오세아니아", strand = "history", after = "q_region_oc_melanesia_1", story = "괌의 바닷가에는 흰 산호가 있다. 광물로 팔려는 상인에게 실제 생태를 설명해야 한다.", ending = "태평양 섬의 농업과 산호 생태를 구분해 기록했다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_oc_melanesia" } :: Quest)
	table.insert(Quests, { id = "q_region_oc_moai_1", name = "바다 너머의 거대한 얼굴", summary = "탐험가의 그림 — 발파라이소 조사", kind = "discover_card", cardId = "site_easter_island", portId = "valparaiso", sagaPort = "valparaiso", newsSource = "탐험가의 그림", amount = 1, arc = "라파누이 모아이", continent = "오세아니아", strand = "history", story = "발파라이소에 모아이 그림이 도착했다. 외계인이 세웠다는 소문과 실제 유산을 구분하자.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_oc_moai_2", name = "검은 돌의 정체", summary = "유물상의 증언 — 호놀룰루 조사", kind = "discover_card", cardId = "pac_obsidian_easter", portId = "honolulu", sagaPort = "honolulu", newsSource = "유물상의 증언", amount = 1, arc = "라파누이 모아이", continent = "오세아니아", strand = "history", after = "q_region_oc_moai_1", major = true, story = "호놀룰루의 유물상은 라파누이에서 왔다는 흑요석을 내민다. 재료의 산지와 제작법을 조사한다.", ending = "모아이는 라파누이 사람들의 유산이며 외계인 제작설은 입증되지 않았다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_oc_moai" } :: Quest)
	table.insert(Quests, { id = "q_region_oc_hobart_1", name = "표본에 붙은 틀린 지명", summary = "표본 관리인의 신고 — 호바트 조사", kind = "discover_card", cardId = "pac_emu", portId = "hobart", sagaPort = "hobart", newsSource = "표본 관리인의 신고", amount = 1, arc = "태즈메이니아 표본", continent = "오세아니아", strand = "history", story = "호바트의 동물 표본 상자에 잘못된 채집지가 적혀 있다. 어느 지역에서 왔는지 밝혀야 한다.", ending = "단서를 확보했다. 다음 지역에 사건의 새로운 기록이 있다.", rewardCoins = 220, rewardFame = 11, rewardCareer = "adventure", rewardXp = 60 } :: Quest)
	table.insert(Quests, { id = "q_region_oc_hobart_2", name = "나무 위의 조용한 동물", summary = "숲 안내인의 발견 — 시드니 조사", kind = "discover_card", cardId = "pac_koala", portId = "sydney", sagaPort = "sydney", newsSource = "숲 안내인의 발견", amount = 1, arc = "태즈메이니아 표본", continent = "오세아니아", strand = "history", after = "q_region_oc_hobart_1", story = "시드니의 숲에 나무 위에서 사는 코알라가 목격됐다. 실제 먹이와 서식지를 조사한다.", ending = "남방 동물의 생태와 표본 출처를 정확히 기록했다.", rewardCoins = 650, rewardFame = 35, rewardCareer = "adventure", rewardXp = 135, rewardCardId = "region_oc_hobart" } :: Quest)

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
	-- [연대기 고유 서사] 기존 공용 문장 대신 각 항구의 실제 사건과 인물 결말 사용.
	if q.arc and q.ending then
		return string.format("「%s」 %s", q.arc, q.story or ""), q.ending
	end
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
