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
	afterAny: { string }?, -- 앞 장의 선택 분기 중 하나의 결말을 완료하면 열린다
	rewardCardId: string?, -- 완료 보상으로 받는 도감 카드
	strand: string?, -- 스토리 갈래: main(서막) | companion(동료) | history(역사) | person(인물)
	story: string?, -- 왜 이 일을 하는가 (이야기)
	routeId: string?, -- 10대 이야기 항로의 안정된 식별자
	routeName: string?, -- 지역별 연속 탐험 갈래
	leadSource: string?, -- 소문·발견·사건·기록 등 단서가 전해진 형태
	-- [이야기 퀘스트 시스템] 내용은 나중에 채운다. 모두 선택 필드.
	warId: string?, -- kind "war_clear": 이 함대전 id 완수 횟수
	backdrop: string?, -- 기존 해역·탐험지 배경 식별자
	leaderId: string?, -- kind "duel_leader": 이 지도자 덱을 카드 대결에서 이긴 횟수
	duelFaction: string?, -- kind "duel_leader": 상대 진영(없으면 지도자 진영)
	choiceKey: string?, -- kind "choice": 선택 결과 저장 키(없으면 퀘스트 id)
	choices: { { value: string, label: string, result: string? } }?, -- kind "choice": 고를 수 있는 선택지
	needChoice: string?, -- "key=value": 이 선택을 한 플레이어에게만 보인다(분기)
	loreCardId: string?, -- 완료하면 이 카드 상세에 이야기 단락이 열린다
	loreText: string?,
	speaker: string?, -- 진행 중이면 이 인물이 동료 말풍선으로 line 을 말한다
	speakerRole: string?,
	line: string?,
	regionId: string?, -- kind "war_clear": 이 해역(Regions id)의 함대전 완수 횟수 (없으면 전체)
	cat: string?, -- kind "people": 이 분야(People.Cats)의 기록한 인물 수 (없으면 전체)
	-- [인과관계 · 2026-11-28] 화면 안내용(판정 무관): 지금 문제·원인·하면 바뀌는 것·장 제목·안내 인물
	problem: string?,
	cause: string?,
	result: string?,
	chapter: string?,
	guide: string?,
	afterPrologue: boolean?, -- 시작 국가 서막(pr_<국가>_4)을 마쳐야 보인다
	rewardPermit: string?, -- 완료하면 이 항구 길드 허가증(특산품·명품 거래 열림)
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
	-- [해상 연속 퀘스트] 해역별 함대전을 완수하면 이어서 열린다. 해역마다 이야기와 보상이 다르다.
	{ id = "q_war_europe", name = "지중해의 방패", summary = "지중해 해상 봉쇄전을 1번 완수", kind = "war_clear", regionId = "europe", amount = 1, rewardCoins = 1200, rewardFame = 20, rewardCareer = "battle", rewardXp = 300, story = "사략 함대가 항로를 막으면 상인들이 먼저 쓰러진다. 함대로 길을 열어 주면 항구가 숨을 쉰다." },
	{ id = "q_war_w_africa", name = "대서양 항로 감시", summary = "서아프리카 노예선단 차단을 1번 완수", kind = "war_clear", regionId = "w_africa", amount = 1, after = "q_war_europe", rewardCoins = 2000, rewardFame = 30, rewardCareer = "battle", rewardXp = 500, story = "대서양 섬들을 잇는 항로는 길고 외롭다. 이곳을 지키는 함대가 있어야 먼바다로 나갈 수 있다." },
	{ id = "q_war_new_world", name = "카리브의 파수꾼", summary = "카리브 보물선단 습격을 1번 완수", kind = "war_clear", regionId = "new_world", amount = 1, after = "q_war_w_africa", rewardCoins = 3500, rewardFame = 45, rewardCareer = "battle", rewardXp = 800, story = "은과 설탕이 오가는 카리브는 해적과 함대가 맞서는 바다다. 이기는 쪽이 항로를 얻는다." },
	{ id = "q_war_indian", name = "몬순 항로의 수호자", summary = "인도양 향신료 항로 수호를 1번 완수", kind = "war_clear", regionId = "indian", amount = 1, after = "q_war_new_world", rewardCoins = 5000, rewardFame = 60, rewardCareer = "battle", rewardXp = 1100, story = "몬순을 타고 향신료 배가 오간다. 바람이 바뀌기 전에 항로를 지켜야 한다." },
	{ id = "q_war_far_east", name = "해협의 질서", summary = "동남아 해협 수비전을 1번 완수", kind = "war_clear", regionId = "far_east", amount = 1, after = "q_war_indian", rewardCoins = 7500, rewardFame = 85, rewardCareer = "battle", rewardXp = 1700, story = "좁은 해협을 쥔 쪽이 동서 교역을 쥔다. 해적 연합을 꺾으면 항로가 열린다." },
	{ id = "q_war_pacific", name = "먼바다의 제독", summary = "태평양 원정 함대전을 1번 완수", kind = "war_clear", regionId = "pacific", amount = 1, after = "q_war_far_east", rewardCoins = 12000, rewardFame = 130, rewardCareer = "battle", rewardXp = 2600, story = "육지가 보이지 않는 바다에서 함대를 이끈다. 모든 해역의 함대전을 이긴 제독만 설 수 있는 자리다." },
	{ id = "q_sea_wolf_3", name = "전설의 제독", summary = "해전에서 40번 승리", kind = "win", amount = 40, rewardCoins = 10000, rewardFame = 200, rewardCareer = "battle", rewardXp = 1000, rewardCardId = "nav_star_compass" },
	{ id = "q_grand_tour_3", name = "북·서유럽 완전 일주", summary = "서로 다른 항구 18곳 방문", kind = "visit", amount = 18, rewardCoins = 3500, rewardFame = 100, rewardCareer = "adventure", rewardXp = 400 },
	-- 스토리 퀘스트: 동료 이야기 / 역사 참여 / 인물과 연구
	{ id = "cq_h_england", name = "바다가 내놓는 증거", summary = "도감 카드 8장 발견", kind = "discover", amount = 8, companionId = "h_england", minAffinity = 20, strand = "companion",
		story = "엘리너는 학회에서 돌려받은 원고의 여백을 손가락으로 가린다. 예전에는 남의 이름으로 자신의 관찰을 발표해야 했지만, 이번에는 자기 이름으로 기록을 내고 싶다. \"선장, 제 편을 들 필요는 없어요. 틀린 곳도 찾아낼 수 있게 발견 기록을 모아 주세요.\"",
		problem = "엘리너는 자신의 이름으로 연구를 발표할 근거가 부족하다.", cause = "과거의 관찰 기록이 다른 사람의 명성에 묻혔다.", result = "발견 기록이 독립적인 원고의 근거가 된다.",
		rewardCoins = 1000, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_netherlands", name = "독립 상사의 첫 이문", summary = "증권 거래 3번", kind = "stock", amount = 3, companionId = "h_netherlands", minAffinity = 20, strand = "companion",
		story = "얀은 견습 시절 장부를 베끼던 손으로 빈 거래 장부를 펼친다. 큰 길드의 이름이 없으면 계약 상대조차 만나기 어려웠고, 손실이 생길까 두려워 독립을 미뤄 왔다. \"이번에는 남의 도장이 아니라 제 판단으로 거래하겠소. 거래소에서 첫 기록을 함께 남겨 주시오.\"",
		problem = "얀의 독립 상사에는 직접 거래한 기록이 없다.", cause = "오랫동안 길드의 이름과 보증에 의존했다.", result = "증권 거래 기록으로 자기 판단의 첫 근거를 만든다.",
		rewardCoins = 1000, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_france", name = "깃발을 되찾는 설탕", summary = "설탕 8개를 루앙에 납품", kind = "deliver", goodId = "sugar", portId = "rouen", amount = 8, companionId = "h_france", minAffinity = 20, strand = "companion",
		story = "마리온은 낡은 가문의 깃발을 접어 설탕 견본 옆에 놓는다. 예전 영지의 빚 때문에 집안을 떠났지만, 문장을 다시 얻으려다 일하는 사람들까지 잃고 싶지는 않다. \"루앙의 설탕 주문을 먼저 지켜 주세요. 우리 가문의 자랑보다 저 창고의 일손이 먼저예요.\"",
		problem = "마리온은 영지의 빚을 갚을 거래 기반이 필요하다.", cause = "가문의 명예를 지키려다 거래와 일손을 잃었다.", result = "설탕 납품이 거래처의 신뢰를 되찾는 첫걸음이 된다.",
		rewardCoins = 1300, rewardFame = 40, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_ottoman", name = "끊긴 향기의 길", summary = "후추 6개를 이스탄불에 납품", kind = "deliver", goodId = "pepper", portId = "istanbul", amount = 6, companionId = "h_ottoman", minAffinity = 20, strand = "companion",
		story = "레일라는 어머니가 쓰던 후추 저울의 접시를 닦는다. 가게를 물려받던 날 외상 장부가 더 두꺼웠고, 빈 선반을 이웃에게 보이는 일이 부끄러웠다. \"이스탄불에 후추를 들여와 주세요. 이번에는 오래된 단골에게 떳떳하게 무게를 달고 싶어요.\"",
		problem = "레일라가 물려받은 향신료 가게에 후추가 부족하다.", cause = "외상 부담과 공급 부족으로 거래를 이어가기 어려웠다.", result = "후추 납품으로 가게의 거래를 재개할 발판을 마련한다.",
		rewardCoins = 1300, rewardFame = 40, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_swahili", name = "바람의 이름을 찾아서", summary = "서로 다른 항구 8곳 방문", kind = "visit", amount = 8, companionId = "h_swahili", minAffinity = 20, strand = "companion",
		story = "아민은 바람의 방향을 적은 낡은 표를 펼친다. 어릴 적 어른들의 항해법을 외웠지만, 자기 판단이 틀릴까 두려워 한 항로만 고집했다. \"항구마다 바람을 읽는 말이 다르오. 여러 부두를 돌아 내가 아는 것과 모르는 것을 구별해 보겠소.\"",
		problem = "아민의 항해 경험이 익숙한 항로에 치우쳐 있다.", cause = "실수를 두려워해 다른 항구의 지식을 배우지 못했다.", result = "새 항구 방문 기록으로 계절풍 지식을 넓힌다.",
		rewardCoins = 1000, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_malabar", name = "제값을 받는 길", summary = "후추 8개를 암스테르담에 납품", kind = "deliver", goodId = "pepper", portId = "amsterdam", amount = 8, companionId = "h_malabar", minAffinity = 20, strand = "companion",
		story = "라마는 후추 자루에 묶였던 농가의 낡은 표식을 꺼낸다. 어린 시절 풍작에도 중간 상인의 가격만 받아들여야 했던 기억이 남아 있다. \"암스테르담까지 직접 납품해 보세. 우리 손에서 자란 후추가 어느 시장에 닿는지부터 알아야 하네.\"",
		problem = "라마의 농가는 먼 시장의 거래 정보를 얻기 어렵다.", cause = "중간 거래에 의존해 후추의 유통 경로를 알기 힘들었다.", result = "직접 납품 기록이 다음 가격 협상의 근거가 된다.",
		rewardCoins = 1300, rewardFame = 40, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_japan", name = "바다 너머의 책장", summary = "식물 카드 3장 발견", kind = "field", fieldId = "Botany", amount = 3, companionId = "h_japan", minAffinity = 20, strand = "companion",
		story = "하루카는 집안 서재에서 베껴 온 약초 그림을 꺼낸다. 익숙한 식물의 이름은 줄줄 외웠지만 낯선 잎 앞에서는 틀릴까 두려워 책을 덮곤 했다. \"바다 건너 식물 기록을 찾아 주세요. 이름을 모른다는 것도 책에 적어도 되겠지요?\"",
		problem = "하루카의 식물 기록에는 낯선 지역의 관찰이 부족하다.", cause = "기존 서적의 이름에 의존하고 실수를 두려워했다.", result = "식물 카드가 새로운 비교 연구의 첫 장을 이룬다.",
		rewardCoins = 1000, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_new_spain", name = "마을로 돌아가는 은", summary = "은 5개를 세비야에 납품", kind = "deliver", goodId = "silver", portId = "seville", amount = 5, companionId = "h_new_spain", minAffinity = 20, strand = "companion",
		story = "페르난도는 마을 사람들의 이름이 적힌 종이를 은 견본 곁에 둔다. 은을 캐는 사람들의 몫이 장부에서 사라지는 모습을 보고도 어릴 때는 묻지 못했다. \"세비야까지 은을 보내 주시오. 적어도 이 은이 어디로 향하는지, 누구의 손에서 나왔는지는 잊지 맙시다.\"",
		problem = "페르난도는 은을 생산한 마을의 몫을 확인하고 싶다.", cause = "먼 시장과 생산지가 분리되어 거래 기록이 불투명했다.", result = "은 납품의 경로를 기록해 다음 협상의 근거를 남긴다.",
		rewardCoins = 1300, rewardFame = 40, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_h_portugal", name = "끊긴 일지의 다음 쪽", summary = "서로 다른 항구 12곳 방문", kind = "visit", amount = 12, companionId = "h_portugal", minAffinity = 20, strand = "companion",
		story = "이네스는 아버지의 항해 일지에서 끊긴 마지막 문장을 펼친다. 한때는 그가 남긴 길을 그대로 따라야만 약속을 지킬 수 있다고 믿었고, 다른 항구로 향하는 일도 두려웠다. \"선장, 여러 항구를 돌아 우리 시대의 항해를 적어 줘요. 아버지의 빈칸에 거짓말을 채우고 싶지는 않아요.\"",
		problem = "이네스는 끝나지 않은 아버지의 항해 기록에 얽매여 있다.", cause = "과거의 약속을 지키려다 자신의 항로를 선택하지 못했다.", result = "새 항구 방문 기록이 이네스 자신의 항해 일지를 만든다.",
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
		problem = "곤충의 변태를 설명할 관찰 기록이 부족하다.", cause = "완성된 모습만으로는 성장 과정의 관계를 보여 주기 어렵다.", result = "동물 기록이 변태 연구의 비교 자료가 된다.",
		rewardCoins = 800, rewardFame = 30, rewardCareer = "adventure", rewardXp = 150 },
	{ id = "cq_halley", name = "혜성의 귀환", summary = "천문 카드 3장 발견", kind = "field", fieldId = "Astronomy",
		amount = 3, companionId = "c_halley", minAffinity = 20, rewardCardId = "ast_halley_prediction",
		problem = "핼리의 혜성 예측을 비교할 천문 기록이 부족하다.", cause = "서로 다른 시대의 관측을 연결해야 한다.", result = "천문 카드가 예측을 검토할 자료가 된다.",
		rewardCoins = 900, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_leeuwenhoek", name = "렌즈와 빛", summary = "물리 카드 4장 발견", kind = "field", fieldId = "Physics",
		amount = 4, companionId = "c_leeuwenhoek", minAffinity = 20, rewardCardId = "phy_lens_grinding",
		problem = "레이우엔훅의 관찰을 전달할 물리적 설명이 부족하다.", cause = "정밀 렌즈의 관찰은 맨눈의 경험과 크게 다르다.", result = "물리 기록이 렌즈와 관찰 원리를 설명하는 근거가 된다.",
		rewardCoins = 900, rewardFame = 35, rewardCareer = "adventure", rewardXp = 160 },
	{ id = "cq_linnaeus", name = "자연의 체계", summary = "식물 카드 4장 발견", kind = "field", fieldId = "Botany",
		amount = 4, companionId = "c_linnaeus", minAffinity = 20, rewardCardId = "bot_systema_naturae",
		problem = "린네의 분류 체계에는 비교할 식물 기록이 더 필요하다.", cause = "지역마다 이름과 관찰 기준이 달라 혼동이 생긴다.", result = "식물 카드가 분류 기준을 검토하는 자료가 된다.",
		rewardCoins = 1200, rewardFame = 45, rewardCareer = "adventure", rewardXp = 200 },
	{ id = "cq_boyle", name = "공기 펌프 실험", summary = "유리 6개를 런던에 납품", kind = "deliver", goodId = "glass", portId = "london",
		amount = 6, companionId = "c_boyle", minAffinity = 20, rewardCardId = "che_air_pump",
		problem = "공기 펌프 실험에 필요한 유리가 모자란다.", cause = "실험 기구 제작에 필요한 재료 공급이 부족하다.", result = "유리 납품으로 실험 준비를 이어갈 수 있다.",
		rewardCoins = 1000, rewardFame = 35, rewardCareer = "trade", rewardXp = 150 },
	{ id = "cq_papin", name = "안전 밸브", summary = "증기 윈치 연구 완료", kind = "research", techId = "steam_winch",
		amount = 1, companionId = "c_papin", minAffinity = 20, rewardCardId = "phy_safety_valve",
		problem = "파팽은 증기 동력을 안전하게 이용할 연구 자료가 필요하다.", cause = "압력을 제어하지 못하면 기계의 활용이 어렵다.", result = "완료된 증기 윈치 연구가 안전 구상 검토의 근거가 된다.",
		rewardCoins = 1000, rewardFame = 40, rewardCareer = "adventure", rewardXp = 170 },
	-- 동료 전용 2단계 (호감도 50 이상)
	{ id = "cq2_merian", name = "열대의 변태 기록", summary = "동물 카드 8장 발견", kind = "field", fieldId = "Zoology",
		amount = 8, companionId = "c_merian", minAffinity = 50, after = "cq_merian",
		problem = "메리안의 변태 기록을 넓은 생태 자료와 비교할 필요가 있다.", cause = "개별 곤충의 성장만으로 환경과의 관계를 설명하기 어렵다.", result = "동물 기록이 서로 다른 생태와 성장 과정을 비교할 자료가 된다.",
		rewardCoins = 2500, rewardFame = 70, rewardCareer = "adventure", rewardXp = 400 },
	{ id = "cq2_halley", name = "별 지도 완성", summary = "천문 카드 8장 발견", kind = "field", fieldId = "Astronomy",
		amount = 8, companionId = "c_halley", minAffinity = 50, after = "cq_halley",
		problem = "핼리는 여러 관측을 함께 검토할 추가 천문 자료가 필요하다.", cause = "한 시대와 한 지역의 관측만으로는 비교 범위가 좁다.", result = "새 천문 카드가 후속 별 지도 연구 자료가 된다.",
		rewardCoins = 2600, rewardFame = 75, rewardCareer = "adventure", rewardXp = 420 },
	{ id = "cq2_leeuwenhoek", name = "작은 세계", summary = "물리 카드 8장 발견", kind = "field", fieldId = "Physics",
		amount = 8, companionId = "c_leeuwenhoek", minAffinity = 50, after = "cq_leeuwenhoek",
		problem = "작은 세계의 관찰을 검토할 물리 지식이 더 필요하다.", cause = "관찰 결과와 관찰 방법을 함께 설명해야 재검토할 수 있다.", result = "새 물리 기록이 관찰법을 비교할 자료를 보완한다.",
		rewardCoins = 2600, rewardFame = 75, rewardCareer = "adventure", rewardXp = 420 },
	{ id = "cq2_linnaeus", name = "식물 대탐사", summary = "식물 카드 8장 발견", kind = "field", fieldId = "Botany",
		amount = 8, companionId = "c_linnaeus", minAffinity = 50, after = "cq_linnaeus",
		problem = "린네의 분류를 더 다양한 식물에 대조할 필요가 있다.", cause = "한정된 기록에서 만든 기준을 일반화할 위험이 있다.", result = "추가 식물 카드가 분류의 적용 범위를 검토할 자료가 된다.",
		rewardCoins = 3000, rewardFame = 85, rewardCareer = "adventure", rewardXp = 480 },
	{ id = "cq2_boyle", name = "항해자의 호위", summary = "해전에서 10번 승리", kind = "win",
		amount = 10, companionId = "c_boyle", minAffinity = 50, after = "cq_boyle",
		problem = "보일의 연구 재료는 위험한 해상 운송에 의존한다.", cause = "실험실은 항해자의 위험을 직접 겪지 않기 쉽다.", result = "해전 승리 기록이 항해 안전을 위한 노력의 근거가 된다.",
		rewardCoins = 2800, rewardFame = 80, rewardCareer = "battle", rewardXp = 450 },
	{ id = "cq2_papin", name = "증기 항로 개척", summary = "서로 다른 항구 25곳 방문", kind = "visit",
		amount = 25, companionId = "c_papin", minAffinity = 50, after = "cq_papin",
		problem = "파팽의 증기 기술 구상에는 항구의 실제 이용 조건이 부족하다.", cause = "기계 연구만으로는 부두와 보급 환경을 알 수 없다.", result = "항구 방문 기록이 증기 항로 구상의 조사 자료가 된다.",
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
-- 지역 대장정의 고유 사건 제목(기존 목표와 저장 키는 그대로).
local RegionalStoryTitles: { [string]: string } = {
	["north_sea"] = "거꾸로 그린 방벽",
	["atlantic_europe"] = "물에 잠긴 종소리",
	["mediterranean"] = "불에 남은 도면",
	["red_sea"] = "등대지기의 빈 목록",
	["west_africa"] = "지워진 이름의 장부",
	["east_africa"] = "바람이 지운 날짜",
	["south_asia"] = "녹슬지 않는 약속",
	["southeast_asia"] = "해협의 세 번째 지도",
	["east_asia"] = "은 장부의 빈 도장",
	["americas"] = "황금이 아닌 도시",
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
			id = id, name = rname .. " · " .. RegionalStoryTitles[rid] .. " — " .. st[1], after = prev, rewardCareer = "adventure",
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
		local quest: Quest = {
			id = id, name = route[2] .. " · " .. mission[1],
			routeId = route[1], routeName = route[2],
			leadSource = (RouteLeads[route[1]] or {})[stage] or "탐험 소식",
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

-- 인과관계로 이어지는 장 이야기 (교역 → 탐험 → 해전 → 선택 → 결과)
local Chapters = require(script.Parent.StoryChapters)
for _, cq in Chapters.Quests do
	table.insert(Quests, cq :: Quest)
end

-- [길드 허가증 의뢰 · 2026-11-28 오너 지시] 항구마다: 그 항구가 필요로 하는 물건을 가져다주면 길드가 믿고 특산품·명품을 판다.
-- (특산품 잠금 규칙: Services/Trade.luau lockOf). 주점 게시판에서 그 항구에 있을 때 보인다.
do
	local PortsData = require(script.Parent.Ports) :: any
	local ids = {}
	for id in PortsData.Ports do table.insert(ids, id) end
	table.sort(ids)
	for _, portId in ids do
		local port = PortsData.Ports[portId]
		if type(port.produces) == "table" and #port.produces >= 1 and type(port.demands) == "table" then
			local need = nil
			for _, g in port.demands do
				if not table.find(port.produces, g) and PortsData.Goods[g] then need = g; break end
			end
			if need then
				local goodName = PortsData.Goods[need].name
				local special = PortsData.Goods[port.produces[1]] and PortsData.Goods[port.produces[1]].name or "특산품"
				table.insert(Quests, {
					id = "permit_" .. portId, name = port.name .. " 길드 허가증",
					summary = string.format("길드 허가증 — %s 6개를 %s에 납품", goodName, port.name), kind = "deliver",
					goodId = need, portId = portId, amount = 6, rewardPermit = portId, afterPrologue = true,
					problem = string.format("%s 상인 길드는 낯선 선장에게 %s 같은 특산품을 넘기지 않는다.", port.name, special),
					cause = string.format("믿을 만한 거래 기록이 없다. 마침 길드는 %s이(가) 모자라 애를 먹고 있다.", goodName),
					result = string.format("길드 허가증을 받아 %s의 특산품과 명품을 살 수 있다.", port.name),
					story = string.format("%s 길드 서기가 장부를 덮는다. \"우리 특산품은 아무에게나 안 팔아요. 다만 요즘 %s이(가) 모자라서… 그걸 구해 오는 선장이라면 믿을 수 있겠죠.\"", port.name, goodName),
					rewardCoins = 200, rewardFame = 8, rewardCareer = "trade", rewardXp = 50,
				} :: Quest)
			end
		end
	end
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
	cq_merian = { "메리안은 알과 애벌레와 번데기를 그린 스케치북을 펼친다. 곤충의 변태를 기록하는 일에는 오랜 관찰이 필요하지만, 아름다운 그림만으로는 그 관계를 설명하기 어렵다. \"예쁜 모습만 남기면 중요한 과정이 사라져요. 동물 기록을 함께 모아 주세요.\"", "메리안은 새로운 동물 기록을 스케치 옆에 놓고 관찰하지 못한 부분을 빈칸으로 남겼다. \"이제 그림을 더 정확하게 그릴 수 있겠어요. 다음에는 곤충이 살아가는 환경까지 비교해 봐요.\"" },
	cq_halley = { "핼리는 서로 다른 해의 혜성 기록을 책상 위에 나란히 놓는다. 과거 관측의 공통점을 계산해 같은 혜성이 다시 돌아올 수 있다고 예측했지만, 먼 미래의 귀환은 자신의 눈으로 확인하지 못할 수도 있다. \"제 말을 믿는 것으로 끝내지 맙시다. 천문 기록을 모아 다음 사람이 다시 계산할 수 있게 해 주세요.\"", "핼리는 새 천문 기록을 예측 계산과 함께 보관했다. \"결과를 볼 수 없더라도 검증할 길은 남길 수 있겠군요. 다음에는 더 넓은 하늘의 기록을 모읍시다.\"" },
	cq_leeuwenhoek = { "레이우엔훅은 손바닥만 한 렌즈를 천으로 닦는다. 작은 유리알을 연마해 눈에 보이지 않던 세계를 관찰했지만, 보이는 것을 다른 사람이 이해할 수 있게 전달하는 일은 또 다른 문제였다. \"놀랐다는 말은 증거가 아니오. 빛과 렌즈에 관한 물리 기록을 모아 주시오.\"", "그는 렌즈 옆에 물리 기록을 펼쳐 관찰 조건을 다시 적었다. \"내 눈만 믿으라고 할 일이 아니었소. 이제 다른 눈으로도 확인할 방법을 더 찾아봅시다.\"" },
	cq_linnaeus = { "린네는 같은 식물에 서로 다른 이름을 붙인 기록을 보여 준다. 자연을 일정한 체계로 정리하려 하지만, 이름이 정연해 보인다고 서로 다른 생물을 한데 묶을 수는 없다. \"표본에 먼저 귀 기울여야 합니다. 식물 기록을 더 모아 제가 세운 구분부터 시험해 주세요.\"", "린네는 식물 기록을 비교하며 구분하기 어려운 부분에 표시를 남겼다. \"질서를 만든다는 건 모르는 것을 지우는 일이 아니군요. 다음에는 더 먼 지역의 기록과 대조합시다.\"" },
	cq_boyle = { "보일은 공기 펌프에 쓸 유리 기구의 설계 기록을 펼친다. 공기의 성질을 실험으로 설명하려면 투명하고 적합한 기구가 필요한데, 준비한 재료가 모자란다. \"훌륭한 가설도 기구 없이는 시험할 수 없습니다. 런던에 유리를 보내 실험 준비를 도와주십시오.\"", "유리가 런던에 도착하자 보일은 실험 준비 장부의 부족분을 지웠다. \"학문은 혼자 하는 일이 아니군요. 다음에는 이 기구를 나르는 항로가 안전해야겠습니다.\"" },
	cq_papin = { "파팽은 증기의 압력과 밸브를 다룬 도면을 펼친다. 압력을 이용하는 기술은 유용하지만 통제하지 못한 힘은 작업자를 위험에 빠뜨릴 수 있다. \"힘을 키우는 것만 연구라고 부르지 맙시다. 증기 윈치 연구를 마쳐 제 구상을 다시 검토할 근거를 주세요.\"", "파팽은 완료된 연구 기록과 밸브 도면을 비교하며 안전 조건에 밑줄을 그었다. \"이제 힘의 크기보다 제어하는 법을 먼저 생각하겠소. 다음에는 그 기술이 쓰일 항구들을 알아봅시다.\"" },
	cq2_merian = { "메리안은 앞서 모은 기록 곁에 곤충과 식물을 함께 그린 그림을 놓는다. 알에서 성충까지의 변화뿐 아니라 어떤 환경에서 살아가는지도 기록해야 한다고 말한다. \"제 그림을 믿으라고 강요하지 않을래요. 서로 다른 동물 기록을 더 모아 생명의 다양성을 비교해요.\"", "메리안은 새 동물 기록을 그림의 빈자리와 비교하고 아직 모르는 관계를 따로 표시했다. \"한 장의 그림으로 모든 생명을 설명할 수는 없군요. 그 사실을 숨기지 않는 기록을 남기겠어요.\"" },
	cq2_halley = { "핼리는 이전 예측 자료를 묶은 뒤 새 천문 기록을 펼친다. 한 관측자의 기록만으로 하늘 전체를 이해했다고 말하는 대신 다른 시대와 장소의 관측을 함께 검토하려 한다. \"제가 그린 별자리보다 아직 모르는 하늘이 훨씬 넓습니다. 천문 기록을 더 모아 주세요.\"", "핼리는 추가 자료를 별 지도 작업 기록에 정리하며 서로 다른 관측을 대조할 자리를 남겼다. \"후대의 항해자가 우리 기록을 고칠 수 있다면, 그것도 성공이겠군요.\"" },
	cq2_leeuwenhoek = { "레이우엔훅은 앞서 정리한 렌즈 연구를 다시 읽는다. 작은 세계를 발견하는 기쁨에만 매달리면 관찰의 한계와 오차를 지나치기 쉽다는 점을 깨달았다. \"물리 기록을 더 모으세. 우리가 보는 것뿐 아니라 왜 그렇게 보이는지도 설명해야 하오.\"", "레이우엔훅은 새 물리 기록을 관찰 노트와 나란히 묶었다. \"처음에는 남들이 내 발견을 믿기만 바랐소. 이제는 다른 사람도 의심하고 확인할 수 있기를 바라오.\"" },
	cq2_linnaeus = { "린네는 첫 분류 기록의 여백을 다시 펼친다. 먼 지역의 식물을 한 번도 직접 보지 않고 익숙한 기준만으로 구분한다면 잘못된 이름을 남길 수 있다. \"이번에는 이름을 붙이는 속도보다 차이를 발견하는 일을 중시합시다. 식물 기록을 더 모아 주세요.\"", "린네는 새 식물 기록의 공통점과 차이를 나눠 적었다. \"분류는 끝난 책이 아니라 다음 관찰자가 고칠 수 있는 약속이어야 합니다.\"" },
	cq2_boyle = { "보일은 유리 납품 장부를 덮지 못하고 그 옆에 항해 기록을 둔다. 바다에서 재료가 오지 않으면 실험실의 기구도 쓸 수 없는데, 연구자는 그 위험을 선원에게만 떠넘기기 쉽다. \"해전에서 맞서야 할 일이 있다면 연구실도 그 무게를 잊지 않겠습니다. 항로의 안전을 위해 싸워 주세요.\"", "보일은 해전 승리 기록을 실험실의 공급 장부 옆에 보관했다. \"승리의 횟수만으로 모든 바다가 안전해졌다고 말하지 않겠습니다. 우리가 기대는 사람들의 위험부터 기억하겠소.\"" },
	cq2_papin = { "파팽은 안전 밸브와 증기 윈치 연구 기록을 접고 항구 지도를 펼친다. 기술이 작업장을 벗어나려면 실제 부두와 공급망을 먼저 이해해야 한다고 생각한다. \"증기만 있으면 어디든 갈 수 있다고 장담하지 않겠소. 여러 항구를 방문하며 기술을 쓸 곳부터 알아봅시다.\"", "파팽은 방문 기록을 지도와 함께 묶고 항구마다 검토할 조건을 남겼다. \"기계를 꿈꾸는 것과 사람들이 쓸 수 있는 기계를 만드는 것은 다르군요. 이제 그 차이를 잊지 않겠소.\"" },
	cq_h_england = { "", "엘리너는 발견 기록을 원고 옆에 펼치고 확신할 수 없는 문장부터 지웠다. \"이름을 인정받는 것보다 제 이름으로 틀릴 용기를 얻은 게 더 기뻐요.\"" },
	cq_h_netherlands = { "", "얀은 거래가 남긴 기록을 수익과 손실에 관계없이 장부에 옮겼다. \"독립이란 매번 이기는 게 아니었군. 내 판단의 결과를 숨기지 않는 거였소.\"" },
	cq_h_france = { "", "루앙에 설탕 주문이 들어오자 마리온은 장부에 가문 이름보다 거래처 이름을 먼저 적었다. \"깃발은 아직 돌아오지 않았어요. 하지만 이제 무엇을 지켜야 할지는 알아요.\"" },
	cq_h_ottoman = { "", "후추가 도착하자 레일라는 저울을 다시 맞추고 첫 거래 장부를 펼쳤다. \"문을 닫았던 날도 제 역사예요. 이제 그걸 숨기지 않고 다시 시작할래요.\"" },
	cq_h_swahili = { "", "아민은 방문 기록을 계절풍 표 옆에 두고 서로 다른 항해법을 비교할 자리를 남겼다. \"스승에게 배운 길을 버리는 게 아니오. 그 길 밖에도 배울 것이 있음을 인정하는 거지.\"" },
	cq_h_malabar = { "", "납품 기록을 본 라마는 농가 표식과 먼 시장의 이름을 한 장부에 적었다. \"이번 거래가 모두를 구했다는 말은 하지 않겠네. 하지만 다음 흥정에서 무엇을 물어야 할지는 알겠어.\"" },
	cq_h_japan = { "", "하루카는 새 식물 기록 옆에 비교할 특징과 아직 모르는 부분을 적었다. \"이제 책은 제가 아는 것을 뽐내는 곳이 아니라 더 배울 자리가 되었어요.\"" },
	cq_h_new_spain = { "", "세비야 납품 기록에 페르난도는 마을의 이름을 함께 적었다. \"이 장부 한 권으로 빚이 사라지지는 않소. 이제 침묵하지 않고 다음 거래의 몫을 물을 수 있겠군.\"" },
	cq_h_portugal = { "", "이네스는 방문 기록을 아버지 일지의 빈칸이 아닌 새 장에 옮겨 적었다. \"아버지의 길을 대신 끝내는 게 아니었어요. 제가 살아갈 길을 찾는 일이었군요.\"" },
}
for hid, hand in Prologue.Hand do
	HAND[hid] = hand
end
for hid, hand in ScholarQ.Hand do
	HAND[hid] = hand
end
for hid, hand in Chapters.Hand do
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
-- 후속 관계는 기존 after/afterAny 데이터에서 생성한다. 분기와 합류를 모두 보존한다.
local NEXT_OF: { [string]: string } = {}
local FOLLOWUPS: { [string]: { string } } = {}
for _, qq in Quests do
	local parents: { string } = if qq.after then { qq.after } else {}
	for _, parent in qq.afterAny or {} do
		if not table.find(parents, parent) then table.insert(parents, parent) end
	end
	for _, parent in parents do
		local list = FOLLOWUPS[parent]
		if not list then
			list = {}
			FOLLOWUPS[parent] = list
		end
		table.insert(list, qq.id)
		-- 기존 단일 후속 참조는 호환용으로 유지한다.
		if qq.after == parent then NEXT_OF[parent] = qq.id end
	end
end
local CHAPTER_END: { [string]: boolean } = {}
for _, chapter in Chapters.Chapters do
	for _, id in chapter.last do CHAPTER_END[id] = true end
end

local StoryCardName: { [string]: string } = {}
local function Story(q: Quest, goodName: string?, portName: string?): (string, string)
	local related = StoryCardName[q.id]
	local cardLine = if related then "\n관련 백과: " .. related .. " (참고 기록)." else ""
	-- 허가증은 일반 납품 결말이 아니라 실제 특산품 거래 해금 결과를 보여 준다.
	if q.rewardPermit then
		local hand = HAND[q.id]
		local hook = if hand and hand[1] ~= "" then hand[1] else (q.story or q.summary)
		local ending = if hand and hand[2] ~= "" then hand[2] .. "\n길드 허가증을 획득했다." else (q.result or "길드 허가증을 획득했다.")
		return hook .. cardLine, ending
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
		local tag = if q.chapter then "" else string.format("제%d단계. ", depth)
		if HAND[q.id] then
			return tag .. (if HAND[q.id][1] ~= "" then HAND[q.id][1] else base) .. cardLine, HAND[q.id][2]
		end
		return tag .. base .. cardLine, fill(c[2], vars)
	end
	local hand = HAND[q.id]
	local hook = (if hand and hand[1] ~= "" then hand[1] else nil) or q.story or fill(t[1], vars)
	return hook .. cardLine, (if hand then hand[2] else fill(t[2], vars))
end

-- [전체 의뢰·지식카드 연계] 기존 발견·보상·상품·지역·학문 데이터를 우선 사용한다.
-- 관련 기록은 완료 조건이나 보상이 아니다. 기존 카드 상세의 이야기 색인으로만 연결한다.
local CardsData = require(script.Parent.KnowledgeCards) :: any
local PortsData = require(script.Parent.Ports) :: any
local RegionCard: { [string]: string } = {
	north_sea = "myth_selkie", atlantic_europe = "myth_ys", mediterranean = "myth_siren",
	red_sea = "geo_red_sea", west_africa = "site_goree", east_africa = "site_kilwa",
	south_asia = "geo_monsoon", southeast_asia = "geo_malacca_strait",
	east_asia = "site_dejima", americas = "lost_el_dorado", pacific = "pac_navigation_stick",
	europe = "nation_venice", w_africa = "site_elmina_castle", new_world = "geo_caribbean_sea",
	indian = "geo_monsoon", far_east = "geo_malacca_strait",
}
local NationCard: { [string]: string } = {
	england = "ast_halley_prediction", netherlands = "phy_pendulum", france = "ast_jupiter_moons",
	portugal = "nav_cross_staff", ottoman = "lang_manuscript_reading", swahili = "geo_monsoon",
	malabar = "bot_pepper_vine", japan = "math_place_value", china = "relic_woodblock",
	spain = "nav_portolan", korea = "med_herb_garden", new_spain = "am_maya_stela",
}
local CompanionCard: { [string]: string } = {
	h_england = "phi_scientific_method", h_netherlands = "finance_bill_exchange", h_france = "good_sugar",
	h_ottoman = "good_pepper", h_swahili = "geo_monsoon", h_malabar = "bot_pepper_vine",
	h_japan = "bot_herbarium", h_new_spain = "am_silver_ore_potosi", h_portugal = "relic_ship_log",
	c_merian = "zoo_metamorphosis", c_halley = "ast_halley_prediction", c_leeuwenhoek = "phy_microscope",
	c_linnaeus = "bot_systema_naturae", c_boyle = "phy_boyle_law", c_papin = "phy_papin_digester",
}
local SubjectCard: { [string]: string } = {
	Botany = "bot_herbarium", Zoology = "zoo_metamorphosis", Mineral = "min_quartz", Relic = "relic_ship_log",
	Site = "site_stonehenge", Geography = "nav_portolan", Myth = "myth_selkie", Mystery = "mys_voynich",
	Lost = "lost_terra_australis", Astronomy = "ast_polaris", Physics = "phy_pendulum",
	Architecture = "arch_arsenal", Language = "lang_translation", Medicine = "med_ship_surgeon", Art = "art_engraving",
	astronomy = "ast_halley_prediction", medicine = "med_ship_surgeon", geography = "nav_portolan",
	navigation = "nav_cross_staff", commerce = "finance_bill_exchange", history = "culture_oral_history",
	architecture = "arch_gothic_arch", physics = "phy_pendulum", chemistry = "chem_distillation", art = "art_engraving",
	explorer = "nav_portolan", science = "phi_scientific_method", merchant = "finance_bill_exchange",
	pirate = "geo_pirate_waters", ruler = "pol_institution_records", letters = "lang_printing_press",
}
local SpecificCard: { [string]: string } = {
	ch1_1 = "myth_selkie", ch1_3 = "geo_pirate_waters", ch1_4 = "law_code_interpretation",
	ch1_5a = "finance_marine_insurance", ch1_5b = "myth_selkie",
	ch2_1 = "chem_glass", ch2_3 = "nation_venice", ch2_4 = "institution_venetian_senate",
	ch2_5a = "chem_glass", ch2_5b = "institution_venetian_senate",
	ch3_1 = "good_pepper", ch3_3 = "geo_monsoon", ch3_4 = "finance_bill_exchange",
	ch3_5a = "bot_pepper_vine", ch3_5b = "geo_monsoon",
	ch4_1 = "site_dejima", ch4_3 = "geo_south_china_sea", ch4_4 = "lang_translation",
	ch4_5a = "site_dejima", ch4_5b = "min_copper_ingot",
	q_ch_nav_pirates = "geo_pirate_waters", q_ch_geo_spice = "good_pepper",
	q_ch_steam_coal = "min_coal_seam", q_ch_alchemy_battle = "finance_marine_insurance",
	q_ch_nature_explore = "bot_herbarium",
	q_steam_dawn = "phy_savery_pump", q_steam_ship = "ship_steam_engine", q_steam_winch = "arch_harbor_crane",
	q_grand_tour = "org_hanseatic_league", q_grand_tour_2 = "nav_portolan",
	q_grand_tour_3 = "geo_north_notes", q_mediterranean = "geo_med_currents",
	q_med_tour = "lang_lingua_franca", q_world_tour = "relic_world_map_old", q_world_tour2 = "nav_mercator",
	q_west_africa_tour = "geo_guinea_gulf", q_indian_tour = "geo_monsoon",
	q_east_asia_tour = "geo_south_china_sea", q_americas_tour = "geo_caribbean_sea", q_pacific_tour = "geo_pacific_vast",
	q_era_2 = "ship_caravel", q_era_3 = "phi_scientific_method", q_era_4 = "phi_enlightenment", q_era_5 = "phy_newcomen_engine",
}
local KindCard: { [string]: string } = {
	deliver = "finance_bill_exchange", discover = "bot_herbarium", discover_card = "culture_oral_history",
	win = "geo_pirate_waters", visit = "nav_portolan", research = "phi_scientific_method",
	field = "bot_herbarium", chronicle = "culture_oral_history", chron_draft = "lang_manuscript_reading",
	chron_paper = "lang_printing_press", war_clear = "finance_marine_insurance",
	stock = "finance_bill_exchange", dividend = "lang_ledger", history = "culture_oral_history",
	people = "culture_oral_history", people_talk = "lang_port_interview", present = "phi_scientific_method",
	understand = "phi_scientific_method", understand_card = "phi_scientific_method",
	expo = "art_engraving", joint = "phi_scientific_method", port_tech = "industry_watermill",
	landmark = "arch_arsenal", launch = "finance_bill_exchange", order_patrol = "law_code_interpretation",
	era = "phi_enlightenment", choice = "law_code_interpretation", duel_leader = "relic_ship_log",
}
local GoodCard: { [string]: string } = {
	wool = "org_hanseatic_league", fish = "zoo_cod", saffron = "chem_dye", carpet = "art_tapestry",
	incense = "culture_festival_observation", gum_arabic = "bot_acacia", camphor = "chem_distillation",
	cochineal = "chem_dye", copper = "min_copper_ingot",
}
local PortCard: { [string]: string } = {}
-- 실제 방문 등록 카드가 있는 항구만 사용한다. 임의 지역 매칭 금지.
for _, card in CardsData.Cards do
	if card.visitPort and not PortCard[card.visitPort] then PortCard[card.visitPort] = card.id end
end
for _, q in Quests do
	local region = q.regionId or q.routeId or string.match(q.id, "^q_rg_(.+)_%d+$")
	local good = q.goodId and PortsData.Goods[q.goodId]
	local permitCard = if q.rewardPermit then PortCard[q.rewardPermit] else nil
	local id = q.loreCardId or q.cardId or q.rewardCardId or SpecificCard[q.id]
		or (region and RegionCard[region]) or (q.nation and NationCard[q.nation])
		or (q.companionId and CompanionCard[q.companionId]) or permitCard
		or (q.goodId and GoodCard[q.goodId]) or (good and good.knowledgeId)
		or (q.fieldId and SubjectCard[q.fieldId]) or (q.disc and SubjectCard[q.disc])
		or (q.cat and SubjectCard[q.cat]) or KindCard[q.kind]
	local card = id and CardsData.ById[id]
	if not card then
		-- 기존 데이터의 관련 카드가 없을 때만 종류별 검증된 기록으로 연결한다.
		id = KindCard[q.kind]
		card = id and CardsData.ById[id]
	end
	assert(card and id, "퀘스트 관련 지식카드 누락: " .. q.id)
	q.loreCardId = id
	StoryCardName[q.id] = card.name
	if not q.loreText then
		local _, ending = Story(q, good and good.name, q.portId and PortsData.Ports[q.portId] and PortsData.Ports[q.portId].name)
		q.loreText = ending
	end
end

local Kit = require(script.Parent.StoryKit) :: any
Kit.LORE = Kit.loreIndex(Quests, require(script.Parent.Story).Events, require(script.Parent.HistoryEvents).Events)

return {
	Quests = Quests,
	ById = ById,
	Grade = Grade,
	Story = Story,
	NextOf = NEXT_OF, -- 기존 단일 후속 참조 호환
	Followups = FOLLOWUPS, -- 분기 및 합류 포함 전체 후속 관계
	ChapterEnd = CHAPTER_END,
	Chapters = Chapters.Chapters,
	Kit = Kit, -- [이야기 퀘스트 시스템] 선택 분기·지도자 대결·이야기 함대전·카드 이야기·인물 말풍선
}
