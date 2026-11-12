--!strict
-- 퀘스트 데이터. 진행도는 플레이어 상태에서 계산한다 (Quest 서비스 참고).

export type Quest = {
	id: string,
	name: string,
	summary: string,
	kind: string, -- "deliver" | "discover" | "win" | "visit" | "research" | "field" | "tactics" | "tactics_biome" | "tactics_rank" | "tactics_goal" | "understand" | "understand_card" | "present" | "expo" | "joint" | "port_tech" | "landmark" | "launch" | "era" | "stock" | "dividend" | "order_patrol"
	goodId: string?,
	portId: string?,
	techId: string?,
	amount: number,
	rewardCoins: number,
	rewardFame: number,
	rewardCareer: string?, -- "trade" | "adventure" | "battle"
	rewardXp: number,
	fieldId: string?, -- kind "field": 이 분야의 도감 카드 수
	objective: string?, -- kind "tactics_goal": 이 목표(rout/boss/survive/reach)로 깬 지점 수
	disc: string?, -- kind "understand": 이 학문(astronomy/physics/chemistry/art)에서 이해한 지식 수 (없으면 전체)
	cardId: string?, -- kind "understand_card": 이 지식을 이해해야 달성
	biome: string?, -- kind "tactics_biome": 이 장소 종류(TacticsMaps 의 biome)의 지상 전술 탐험을 깬 지점 수
	companionId: string?, -- 이 동료와 호감도가 minAffinity 이상일 때만 나타난다
	minAffinity: number?,
	after: string?, -- 이 퀘스트를 먼저 끝내야 보인다 (연속 퀘스트)
	rewardCardId: string?, -- 완료 보상으로 받는 도감 카드
	strand: string?, -- 스토리 갈래: companion(동료) | history(역사) | person(인물)
	story: string?, -- 왜 이 일을 하는가 (이야기)
	cat: string?, -- kind "people": 이 분야(People.Cats)의 기록한 인물 수 (없으면 전체)
}

local Quests: { Quest } = {
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
		amount = 3, rewardCoins = 500, rewardFame = 15, rewardCareer = "battle", rewardXp = 120 },
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
		amount = 10, rewardCoins = 2000, rewardFame = 60, rewardCareer = "battle", rewardXp = 300 },
	{ id = "q_mediterranean", name = "지중해 순항", summary = "서로 다른 항구 15곳 방문", kind = "visit",
		amount = 15, rewardCoins = 2500, rewardFame = 80, rewardCareer = "adventure", rewardXp = 300 },
	{ id = "q_silk_road", name = "비단 교역", summary = "비단 5개를 런던에 납품", kind = "deliver", goodId = "silk", portId = "london",
		amount = 5, rewardCoins = 1400, rewardFame = 30, rewardCareer = "trade", rewardXp = 160 },
	{ id = "q_whale_lamps", name = "고래기름 납품", summary = "고래기름 8개를 런던에 납품", kind = "deliver", goodId = "whale_oil", portId = "london", amount = 8, rewardCoins = 1100, rewardFame = 25, rewardCareer = "trade", rewardXp = 140 },
	{ id = "q_porcelain_hamburg", name = "도자기 주문", summary = "도자기 4개를 함부르크에 납품", kind = "deliver", goodId = "porcelain", portId = "hamburg", amount = 4, rewardCoins = 1800, rewardFame = 40, rewardCareer = "trade", rewardXp = 200 },
	{ id = "q_tin_venice", name = "주석 수출", summary = "주석 10개를 베네치아에 납품", kind = "deliver", goodId = "tin", portId = "venice", amount = 10, rewardCoins = 900, rewardFame = 20, rewardCareer = "trade", rewardXp = 120 },
	{ id = "q_coffee_stockholm", name = "북쪽의 커피", summary = "커피 6개를 스톡홀름에 납품", kind = "deliver", goodId = "coffee", portId = "stockholm", amount = 6, rewardCoins = 1300, rewardFame = 28, rewardCareer = "trade", rewardXp = 150 },
	{ id = "q_linen_seville", name = "돛과 셔츠", summary = "리넨 10개를 세비야에 납품", kind = "deliver", goodId = "linen", portId = "seville", amount = 10, rewardCoins = 800, rewardFame = 18, rewardCareer = "trade", rewardXp = 110 },
	{ id = "q_field_botany", name = "약초 도감", summary = "식물 카드 6장 발견", kind = "field", fieldId = "Botany", amount = 6, rewardCoins = 900, rewardFame = 30, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "q_field_zoology", name = "북해의 동물들", summary = "동물 카드 6장 발견", kind = "field", fieldId = "Zoology", amount = 6, rewardCoins = 900, rewardFame = 30, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "q_field_site", name = "유적 순례", summary = "유적 카드 5장 발견", kind = "field", fieldId = "Site", amount = 5, rewardCoins = 1400, rewardFame = 45, rewardCareer = "adventure", rewardXp = 200 },
	{ id = "q_field_geo", name = "바다의 지도", summary = "지리 카드 5장 발견", kind = "field", fieldId = "Geography", amount = 5, rewardCoins = 1000, rewardFame = 32, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "q_field_myth", name = "전설을 쫓아서", summary = "신화 카드 4장 발견", kind = "field", fieldId = "Myth", amount = 4, rewardCoins = 1200, rewardFame = 40, rewardCareer = "adventure", rewardXp = 180 },
	{ id = "q_collector_2", name = "대수집가", summary = "도감 카드 40장 발견", kind = "discover", amount = 40, rewardCoins = 6000, rewardFame = 150, rewardCareer = "adventure", rewardXp = 700 },
	{ id = "q_collector_3", name = "백과의 주인", summary = "도감 카드 80장 발견", kind = "discover", amount = 80, rewardCoins = 15000, rewardFame = 300, rewardCareer = "adventure", rewardXp = 1500 },
	{ id = "q_sea_wolf_2", name = "북해의 지배자", summary = "해전에서 20번 승리", kind = "win", amount = 20, rewardCoins = 4500, rewardFame = 100, rewardCareer = "battle", rewardXp = 500 },
	{ id = "q_sea_wolf_3", name = "전설의 제독", summary = "해전에서 40번 승리", kind = "win", amount = 40, rewardCoins = 10000, rewardFame = 200, rewardCareer = "battle", rewardXp = 1000 },
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
		amount = 8, companionId = "c_merian", minAffinity = 50,
		rewardCoins = 2500, rewardFame = 70, rewardCareer = "adventure", rewardXp = 400 },
	{ id = "cq2_halley", name = "별 지도 완성", summary = "천문 카드 8장 발견", kind = "field", fieldId = "Astronomy",
		amount = 8, companionId = "c_halley", minAffinity = 50,
		rewardCoins = 2600, rewardFame = 75, rewardCareer = "adventure", rewardXp = 420 },
	{ id = "cq2_leeuwenhoek", name = "작은 세계", summary = "물리 카드 8장 발견", kind = "field", fieldId = "Physics",
		amount = 8, companionId = "c_leeuwenhoek", minAffinity = 50,
		rewardCoins = 2600, rewardFame = 75, rewardCareer = "adventure", rewardXp = 420 },
	{ id = "cq2_linnaeus", name = "식물 대탐사", summary = "식물 카드 8장 발견", kind = "field", fieldId = "Botany",
		amount = 8, companionId = "c_linnaeus", minAffinity = 50,
		rewardCoins = 3000, rewardFame = 85, rewardCareer = "adventure", rewardXp = 480 },
	{ id = "cq2_boyle", name = "항해자의 호위", summary = "해전에서 10번 승리", kind = "win",
		amount = 10, companionId = "c_boyle", minAffinity = 50,
		rewardCoins = 2800, rewardFame = 80, rewardCareer = "battle", rewardXp = 450 },
	{ id = "cq2_papin", name = "증기 항로 개척", summary = "서로 다른 항구 25곳 방문", kind = "visit",
		amount = 25, companionId = "c_papin", minAffinity = 50,
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
	{ id = "q_tac_first", name = "첫 현장 지휘", summary = "지상 전술 탐험 1곳 성공", kind = "tactics", amount = 1, rewardCoins = 300, rewardFame = 10, rewardCareer = "battle", rewardXp = 60 },
	{ id = "q_tac_five", name = "노련한 탐험대장", summary = "서로 다른 지상 전술 탐험 5곳 성공", kind = "tactics", amount = 5, rewardCoins = 1500, rewardFame = 40, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "q_tac_fifteen", name = "대륙을 누빈 지휘관", summary = "서로 다른 지상 전술 탐험 15곳 성공", kind = "tactics", amount = 15, rewardCoins = 8000, rewardFame = 150, rewardCareer = "battle", rewardXp = 400 },
	{ id = "q_tac_rank_s", name = "빈틈없는 작전", summary = "지상 전술 탐험 3곳을 S 등급으로 성공", kind = "tactics_rank", amount = 3, rewardCoins = 2500, rewardFame = 60, rewardCareer = "battle", rewardXp = 200 },
	{ id = "q_tac_forest", name = "숲의 사냥꾼들", summary = "숲 지점 지상 전술 탐험 2곳 성공", kind = "tactics_biome", biome = "forest", amount = 2, rewardCoins = 900, rewardFame = 25, rewardCareer = "adventure", rewardXp = 90, rewardCardId = "zoo_reindeer" },
	{ id = "q_tac_coast", name = "해적 소탕", summary = "해안 지점 지상 전술 탐험 2곳 성공", kind = "tactics_biome", biome = "coast", amount = 2, rewardCoins = 900, rewardFame = 25, rewardCareer = "battle", rewardXp = 90 },
	{ id = "q_tac_mine", name = "갱도의 불빛", summary = "광산 지점 지상 전술 탐험 1곳 성공", kind = "tactics_biome", biome = "mine", amount = 1, rewardCoins = 1200, rewardFame = 30, rewardCareer = "adventure", rewardXp = 100, rewardCardId = "min_swedish_iron" },
	{ id = "q_tac_stones", name = "열석의 수호자", summary = "고대 열석·선돌 지점 지상 전술 탐험 1곳 성공", kind = "tactics_biome", biome = "stones", amount = 1, rewardCoins = 1200, rewardFame = 35, rewardCareer = "adventure", rewardXp = 110 },
	{ id = "q_tac_ruins", name = "유물을 지켜라", summary = "발굴 유적 지점 지상 전술 탐험 1곳 성공", kind = "tactics_biome", biome = "ruins", amount = 1, rewardCoins = 1400, rewardFame = 40, rewardCareer = "adventure", rewardXp = 120, rewardCardId = "relic_roman_coin" },
	{ id = "q_tac_volcano", name = "불의 산을 넘어", summary = "화산 지점 지상 전술 탐험 1곳 성공", kind = "tactics_biome", biome = "volcano", amount = 1, rewardCoins = 1500, rewardFame = 45, rewardCareer = "battle", rewardXp = 130 },
	{ id = "q_tac_wall", name = "옛 방벽의 파수꾼", summary = "옛 방벽 지점 지상 전술 탐험 1곳 성공", kind = "tactics_biome", biome = "wall", amount = 1, rewardCoins = 1500, rewardFame = 45, rewardCareer = "battle", rewardXp = 130 },
	{ id = "q_tac_cliff", name = "벼랑길 돌파", summary = "절벽 지점 지상 전술 탐험 1곳 성공", kind = "tactics_biome", biome = "cliff", amount = 1, rewardCoins = 1300, rewardFame = 35, rewardCareer = "adventure", rewardXp = 110 },
	{ id = "q_tac_marsh", name = "안개 속의 밀수꾼", summary = "석호·간척지 지점 지상 전술 탐험 1곳 성공", kind = "tactics_biome", biome = "marsh", amount = 1, rewardCoins = 1000, rewardFame = 28, rewardCareer = "battle", rewardXp = 100 },
	{ id = "q_tac_garden", name = "수확철의 불청객", summary = "정원·과수원 지점 지상 전술 탐험 1곳 성공", kind = "tactics_biome", biome = "garden", amount = 1, rewardCoins = 700, rewardFame = 18, rewardCareer = "adventure", rewardXp = 70 },
	{ id = "q_tac_quarry", name = "하얀 돌 비탈", summary = "채석장 지점 지상 전술 탐험 1곳 성공", kind = "tactics_biome", biome = "quarry", amount = 1, rewardCoins = 1200, rewardFame = 30, rewardCareer = "adventure", rewardXp = 100, rewardCardId = "min_marble" },
	{ id = "q_tac_plain", name = "들판의 길목", summary = "들판 지점 지상 전술 탐험 1곳 성공", kind = "tactics_biome", biome = "plain", amount = 1, rewardCoins = 500, rewardFame = 12, rewardCareer = "battle", rewardXp = 60 },
	{ id = "q_tac_reach", name = "적진 돌파", summary = "도착 지점에 닿는 지상 전술 탐험 2곳 성공", kind = "tactics_goal", objective = "reach", amount = 2, rewardCoins = 1600, rewardFame = 40, rewardCareer = "adventure", rewardXp = 140 },
	{ id = "q_tac_survive", name = "끝까지 버텨라", summary = "버티기 지상 전술 탐험 2곳 성공", kind = "tactics_goal", objective = "survive", amount = 2, rewardCoins = 1800, rewardFame = 45, rewardCareer = "battle", rewardXp = 150 },
	{ id = "q_tac_boss", name = "두목 사냥", summary = "두목을 쓰러뜨리는 지상 전술 탐험 4곳 성공", kind = "tactics_goal", objective = "boss", amount = 4, rewardCoins = 3000, rewardFame = 70, rewardCareer = "battle", rewardXp = 220 },
	{ id = "q_tac_rout", name = "깨끗이 소탕", summary = "적을 모두 물리치는 지상 전술 탐험 4곳 성공", kind = "tactics_goal", objective = "rout", amount = 4, rewardCoins = 2600, rewardFame = 60, rewardCareer = "battle", rewardXp = 200 },
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

local ById: { [string]: Quest } = {}
for _, q in Quests do
	ById[q.id] = q
end

return {
	Quests = Quests,
	ById = ById,
}
