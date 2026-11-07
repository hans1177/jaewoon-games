--!strict
-- 이야기 이벤트. 항구에서 일러스트 장면(art)과 대화(lines)로 보여 주고, 선택지(choices)에 따라 보상이 갈린다.
-- 일러스트는 지금은 코드로 그린 장면이고, 나중에 art 이름에 맞는 이미지로 바꿀 수 있다.
-- requires: 먼저 끝내야 하는 이벤트 { id, choice? }.

export type Effect = { coins: number?, fame: number?, cardId: string?, affinity: number? }
export type Choice = { text: string, minFame: number?, cost: number?, effect: Effect, result: string }
export type Event = {
	id: string,
	title: string,
	chapter: string?, -- 연작 이름
	portId: string,
	art: string, -- palace | tavern | harbor | ruins | observatory | storm | library
	npc: string,
	lines: { string },
	choices: { Choice },
	minFame: number?,
	minYear: number?,
	requires: { { id: string, choice: number? } }?,
	requiresCards: { string }?,
	nation: string?, -- 이 나라 주인공만 볼 수 있다
}

local Events: { Event } = {
	{
		id = "lc_1", chapter = "잃어버린 해도", title = "왕립학회의 밀사", portId = "london", art = "palace", npc = "학회 밀사",
		lines = {
			"런던의 한 응접실. 두꺼운 외투를 입은 사내가 문을 닫고 목소리를 낮춘다.",
			"\"옛 항해 기록에 세 조각으로 쪼개진 해도가 있다고 하오. 대서양 너머로 이어지는 항로가 적혀 있다더군.\"",
			"\"학회는 조각을 모아 줄 모험가를 찾고 있소. 보수는 넉넉히 드리겠소.\"",
		},
		choices = {
			{ text = "의뢰를 받는다", effect = { coins = 200, fame = 5 }, result = "밀사가 사례금을 건넸다. 첫 조각은 리스본에 있다고 한다." },
			{ text = "정중히 거절한다", effect = { fame = 1 }, result = "밀사는 아쉬운 얼굴로 물러났다. 마음이 바뀌면 다시 찾아오라고 한다." },
		},
	},
	{
		id = "lc_2", chapter = "잃어버린 해도", title = "리스본 선술집의 늙은 항해사", portId = "lisbon", art = "tavern", npc = "늙은 항해사",
		requires = { { id = "lc_1", choice = 1 } },
		lines = {
			"항구 선술집 구석에서 한쪽 눈이 흐릿한 노인이 파도 소리를 닮은 목소리로 말한다.",
			"\"해도 조각? 허허, 아직도 그 얘기를 하는 사람이 있었군.\"",
			"\"젊을 땐 바다 끝이 궁금했지. 이 조각이 너를 거기까지 데려다 줄지도 모르겠네.\"",
		},
		choices = {
			{ text = "술 한 잔을 대접한다 (30코인)", cost = 30, effect = { cardId = "relic_lostchart_1", affinity = 1 }, result = "노인이 낡은 양피지를 꺼내 건넸다. 해도의 첫 조각이다!" },
			{ text = "경의를 표하고 이야기를 듣는다", effect = { cardId = "relic_lostchart_1", fame = 3 }, result = "노인은 오래도록 항해 이야기를 들려주고 조각을 내주었다." },
		},
	},
	{
		id = "lc_3", chapter = "잃어버린 해도", title = "총독궁의 수집가", portId = "venice", art = "library", npc = "귀족 수집가",
		requires = { { id = "lc_2" } }, minFame = 40,
		lines = {
			"베네치아 총독궁 가까운 서재. 유리 장식장 속에 지도와 나침반이 빼곡하다.",
			"\"세 조각 해도라... 둘째는 내 장식장에 있소. 하지만 거저 줄 순 없지.\"",
		},
		choices = {
			{ text = "500코인을 내고 산다", cost = 500, effect = { cardId = "relic_lostchart_2" }, result = "거래가 끝났다. 수집가가 정중히 조각을 포장해 주었다." },
			{ text = "명성을 걸고 설득한다 (명성 80 필요)", minFame = 80, effect = { cardId = "relic_lostchart_2", fame = 5 }, result = "당신의 이름을 알아본 수집가가 흔쾌히 조각을 내주었다." },
		},
	},
	{
		id = "lc_4", chapter = "잃어버린 해도", title = "화산 아래의 집터", portId = "naples", art = "ruins", npc = "발굴 책임자",
		requires = { { id = "lc_3" } }, minFame = 60,
		lines = {
			"나폴리 인근 발굴지. 검은 재 속에서 벽화가 드러나 있다.",
			"\"이 집 서재에서 지도 조각이 나왔소. 학회에서 온 사람에게만 보여 주기로 했지.\"",
		},
		choices = {
			{ text = "학회 이름으로 조각을 받는다", effect = { cardId = "relic_lostchart_3", fame = 5 }, result = "셋째 조각을 손에 넣었다. 이제 세 조각이 모였다!" },
			{ text = "발굴을 돕고 보수로 받는다", effect = { cardId = "relic_lostchart_3", coins = -100 }, result = "하루 종일 삽질을 도운 끝에 조각을 받았다." },
		},
	},
	{
		id = "lc_5", chapter = "잃어버린 해도", title = "세 조각이 맞물릴 때", portId = "amsterdam", art = "harbor", npc = "지도 제작자",
		requires = { { id = "lc_4" } }, requiresCards = { "relic_lostchart_1", "relic_lostchart_2", "relic_lostchart_3" },
		lines = {
			"암스테르담 항구가 보이는 제도실. 지도 제작자가 세 조각을 탁자 위에 맞춘다.",
			"\"이어졌소! 이 항로의 끝은… 지도에 없는 바다요. 당신이 첫 항해자가 되겠구려.\"",
		},
		choices = {
			{ text = "해도를 학회에 기증한다", effect = { cardId = "relic_lostchart", fame = 60, coins = 1500 }, result = "학회가 후한 사례를 했고, 당신의 이름이 해도의 서문에 실렸다." },
			{ text = "해도를 사본으로 남기고 간직한다", effect = { cardId = "relic_lostchart", fame = 20, coins = 400 }, result = "사본 한 부를 학회에 넘기고, 원본은 선장실에 걸었다." },
		},
	},
	{
		id = "hm_1", chapter = "항만청 사건부", title = "수상한 화물 명세서", portId = "london", art = "harbor", npc = "항만청 서기",
		lines = {
			"부두 옆 항만청 사무실. 서기가 장부 한 장을 탁자에 펼친다.",
			"\"명세서와 실제 화물이 맞지 않는 배가 있소. 누군가 세금을 빼돌린 것 같은데, 당신이 입회해 주겠소?\"",
		},
		choices = {
			{ text = "입회해서 장부를 대조한다", effect = { fame = 8, coins = 150 }, result = "대조 끝에 밀수 정황이 드러났다. 항만청이 사례금을 건넸다." },
			{ text = "바쁘다며 사양한다", effect = { fame = 1 }, result = "서기는 아쉬운 듯 장부를 덮었다." },
		},
	},
	{
		id = "smith_1", chapter = "조선소와 대포", title = "스톡홀름의 주조공", portId = "stockholm", art = "tavern", npc = "늙은 주조공",
		lines = {
			"쇳물 냄새가 가득한 주조장. 그을린 얼굴의 노인이 짧고 굵은 포신을 두드려 보인다.",
			"\"긴 대포만 대포인 줄 아나? 가까이서 쏘면 이 녀석이 훨씬 무섭소.\"",
			"\"쓰는 법을 아는 선장에게만 이걸 팔겠소.\"",
		},
		choices = {
			{ text = "주조 과정을 지켜보며 배운다", effect = { fame = 5 }, result = "주조공이 비법을 일러 주었다. 이제 카로네이드를 살 수 있다!" },
			{ text = "술 한 잔 사며 부탁한다 (40코인)", cost = 40, effect = { affinity = 1 }, result = "주조공이 웃으며 카로네이드 제작을 허락했다." },
		},
	},
	{
		id = "royal_1", chapter = "왕궁의 의뢰", title = "해협 측량 의뢰", portId = "copenhagen", art = "palace", npc = "왕실 서기관", minFame = 60,
		lines = {
			"덴마크 왕궁의 회랑. 서기관이 양피지 두루마리를 펼친다.",
			"\"이 좁은 해협은 나라의 목줄이오. 수심과 암초를 정확히 재어 주면 왕께서 크게 치하하시겠소.\"",
		},
		choices = {
			{ text = "측량을 맡아 해도를 만든다", effect = { cardId = "geo_sound_survey", fame = 10, coins = 300 }, result = "며칠에 걸쳐 측량을 마쳤다. 왕실이 후한 포상을 내렸다." },
			{ text = "측량은 사양하고 자문만 한다", effect = { fame = 3, coins = 50 }, result = "의견만 남기고 물러났다." },
		},
	},
	{
		id = "royal_2", chapter = "왕궁의 의뢰", title = "북쪽 바다의 소문", portId = "stockholm", art = "palace", npc = "궁정 학자", minFame = 90,
		lines = {
			"스웨덴 왕궁 도서실. 학자가 북쪽 해안에서 온 보고서를 내민다.",
			"\"얼음 낀 바다와 오로라, 그리고 한낮에도 어두운 하늘... 이 기록을 정리해 줄 사람이 필요하오.\"",
		},
		choices = {
			{ text = "기록을 정리하고 해석한다", effect = { cardId = "geo_north_notes", fame = 10 }, result = "기록을 해석해 학회에 보낼 보고서를 완성했다." },
			{ text = "사례만 받고 사본을 챙긴다", effect = { cardId = "geo_north_notes", coins = 200 }, result = "사본 한 부를 얻고 사례를 받았다." },
		},
	},
	{
		id = "royal_3", chapter = "왕궁의 의뢰", title = "학회 후원 증서", portId = "london", art = "palace", npc = "왕실 후원관", minFame = 150,
		lines = {
			"잉글랜드 왕궁의 접견실. 후원관이 봉랍 찍힌 증서를 두 손으로 든다.",
			"\"왕실은 지식을 찾는 자를 후원합니다. 당신의 이름을 증서에 올려도 되겠소?\"",
		},
		choices = {
			{ text = "영광스럽게 받는다", effect = { cardId = "relic_royal_charter", fame = 20, coins = 800 }, result = "후원 증서와 후원금이 내려왔다. 왕실의 눈에 들었다." },
			{ text = "학회에 대신 넘긴다", effect = { cardId = "relic_royal_charter", fame = 35 }, result = "증서를 학회에 기증해 학자들 사이에서 이름을 높였다." },
		},
	},
	{
		id = "npc_gardener", title = "세비야의 정원사", portId = "seville", art = "library", npc = "정원사",
		lines = {
			"햇살 가득한 정원. 흙 묻은 손으로 정원사가 작은 천 꾸러미를 흔든다.",
			"\"먼 항구에서 온 씨앗들이라오. 싹이 틀지는 모르지만, 키워 줄 사람을 찾고 있소.\"",
		},
		choices = {
			{ text = "씨앗을 받아 도감에 기록한다", effect = { cardId = "bot_new_seeds" }, result = "낯선 씨앗들을 꼼꼼히 기록했다." },
			{ text = "정원 일을 도와준다", effect = { cardId = "bot_new_seeds", fame = 3 }, result = "땀 흘려 도운 끝에 씨앗을 나눠 받았다." },
		},
	},
	{
		id = "npc_pirate", title = "마르세유의 퇴역 해적", portId = "marseille", art = "tavern", npc = "퇴역 해적", minFame = 30,
		lines = {
			"구석 자리에서 흉터 난 사내가 컵을 비운다.",
			"\"이제는 칼 대신 술잔만 든다오. 그래도 매복하기 좋은 바다는 눈 감고도 그리지.\"",
		},
		choices = {
			{ text = "해역 이야기를 기록한다", effect = { cardId = "geo_pirate_waters", fame = 3 }, result = "해적이 알려 준 위험 해역을 해도에 표시했다." },
			{ text = "술을 사 주고 친구가 된다 (30코인)", cost = 30, effect = { cardId = "geo_pirate_waters", affinity = 2 }, result = "해적이 껄껄 웃으며 비밀 항로까지 알려 주었다." },
		},
	},
	{
		id = "npc_observer", title = "천문대의 노학자", portId = "copenhagen", art = "observatory", npc = "노학자", minFame = 20,
		lines = {
			"한밤의 천문대. 큰 관측 기구 옆에서 백발의 학자가 하늘을 올려다본다.",
			"\"별은 거짓말을 하지 않는다네. 매일 밤 적은 기록이 항해자의 길이 되지.\"",
		},
		choices = {
			{ text = "기록을 베껴 가도 되는지 묻는다", effect = { cardId = "ast_old_observer", affinity = 1 }, result = "노학자가 웃으며 관측 기록 한 권을 빌려 주었다." },
			{ text = "별 이야기를 밤새 듣는다", effect = { fame = 5, cardId = "ast_old_observer" }, result = "새벽이 올 때까지 이야기를 듣고 기록의 사본을 받았다." },
		},
	},
	{
		id = "npc_fisher", title = "베르겐의 어부", portId = "bergen", art = "storm", npc = "늙은 어부",
		lines = {
			"비바람이 몰아치는 부두. 그물을 손보던 어부가 먼 바다를 가리킨다.",
			"\"깊은 바다엔 배보다 큰 그림자가 산다네. 그것이 지나가면 물이 소용돌이친다지.\"",
		},
		choices = {
			{ text = "그림자 이야기를 자세히 기록한다", effect = { cardId = "geo_fisherman_tale", fame = 3 }, result = "어부들의 오래된 이야기를 수첩에 옮겼다." },
			{ text = "생선 한 바구니를 사 준다 (20코인)", cost = 20, effect = { cardId = "geo_fisherman_tale", affinity = 1 }, result = "어부가 고마워하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tulip_trader", title = "로테르담의 튤립 상인", portId = "rotterdam", art = "garden", npc = "튤립 상인",
		lines = {
			"\"이 알뿌리 하나가 집 한 채 값이라니, 미친 세상이지요?\"",
			"상인이 비단 천에 싼 알뿌리를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_tulip", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_tulip", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_plymouth_captain", title = "플리머스의 늙은 선장", portId = "plymouth", art = "storm", npc = "늙은 선장",
		lines = {
			"\"대서양을 건너려면 먼저 이 만의 바람부터 읽을 줄 알아야 하네.\"",
			"선장이 낡은 항해 일지를 내민다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_dogger_bank", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_dogger_bank", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_hull_whaler", title = "헐의 포경선 선원", portId = "hull", art = "storm", npc = "포경선 선원",
		lines = {
			"\"북쪽 얼음 사이에서 뿔 달린 고래를 봤어. 거짓말 아니야!\"",
			"선원이 흥분해서 손짓을 한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_narwhal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_narwhal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_glasgow_weaver", title = "글래스고의 직공", portId = "glasgow", art = "market", npc = "리넨 직공",
		lines = {
			"\"클라이드 강물로 헹구면 리넨이 더 하얘진다오.\"",
			"직공이 막 짠 천을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_flax", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_flax", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_lubeck_clerk", title = "뤼베크의 한자 서기", portId = "lubeck", art = "library", npc = "한자 서기",
		lines = {
			"\"우리 도시들은 칼 대신 계약으로 바다를 지키지요.\"",
			"서기가 납 인장이 찍힌 문서를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_hansa_seal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_hansa_seal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_oslo_smith", title = "오슬로의 대장장이", portId = "oslo", art = "forge", npc = "대장장이",
		lines = {
			"\"옛 조상들의 투구 모양을 본떠 만든 거라오. 눈가리개가 멋지지?\"",
			"대장장이가 쇠를 두드리다 고개를 든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_viking_helm", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_viking_helm", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_rochelle_salter", title = "라로셸의 염전 일꾼", portId = "la_rochelle", art = "market", npc = "염전 일꾼",
		lines = {
			"\"바닷물을 가두고 해를 기다리면 하얀 보석이 된다우.\"",
			"일꾼이 소금 한 줌을 손에 쥐어 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_tidal_flat", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_tidal_flat", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_porto_vintner", title = "포르투의 포도주 장인", portId = "porto", art = "tavern", npc = "포도주 장인",
		lines = {
			"\"배에 오래 실어도 상하지 않게 브랜디를 섞는 비법이지요.\"",
			"장인이 오크통을 두드려 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_hops", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_hops", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cadiz_pilot", title = "카디스의 도선사", portId = "cadiz", art = "storm", npc = "도선사",
		lines = {
			"\"보물 함대는 이 만에서 닻을 올렸지. 모래톱 위치는 아무에게나 안 알려 주네.\"",
			"도선사가 낡은 해도를 접는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_astrolabe", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_astrolabe", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_barcelona_shipwright", title = "바르셀로나의 조선공", portId = "barcelona", art = "forge", npc = "조선공",
		lines = {
			"\"갤리선이든 범선이든, 뼈대가 곧 배의 목숨이오.\"",
			"조선공이 거대한 용골 앞에서 손을 털었다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_birch", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_birch", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_algiers_corsair", title = "알제의 옛 사략선원", portId = "algiers", art = "tavern", npc = "옛 사략선원",
		lines = {
			"\"바다에서 제일 무서운 건 폭풍이 아니라 깃발 없는 배지.\"",
			"그가 낮은 목소리로 웃었다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_maelstrom", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_maelstrom", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tunis_digger", title = "튀니스의 발굴꾼", portId = "tunis", art = "ruins", npc = "발굴꾼",
		lines = {
			"\"모래 아래엔 아직도 옛 도시가 잠들어 있소.\"",
			"발굴꾼이 깨진 항아리 조각을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_pewter_plate", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_pewter_plate", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_palermo_monk", title = "팔레르모의 수도사", portId = "palermo", art = "library", npc = "수도사",
		lines = {
			"\"이곳엔 세 문명의 책이 한 서가에 꽂혀 있지요.\"",
			"수도사가 두꺼운 필사본을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_hansa_seal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_hansa_seal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_valletta_knight", title = "발레타의 기사", portId = "valletta", art = "palace", npc = "성채 기사",
		lines = {
			"\"이 성채는 바다를 지키려고 바위를 깎아 세웠다오.\"",
			"기사가 투구를 벗고 인사한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_viking_helm", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_viking_helm", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ragusa_merchant", title = "라구사의 상인", portId = "ragusa", art = "market", npc = "라구사 상인",
		lines = {
			"\"우리는 누구와도 싸우지 않고 모두와 거래하지요.\"",
			"상인이 소금 가마를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_chalk", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_chalk", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_athens_scholar", title = "아테네의 학자", portId = "athens", art = "ruins", npc = "학자",
		lines = {
			"\"이 돌기둥들은 아직도 철학자들의 말소리를 기억한다오.\"",
			"학자가 대리석 조각을 쓰다듬는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_ogham_stone", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_ogham_stone", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_istanbul_trader", title = "이스탄불의 향신료 상인", portId = "istanbul", art = "market", npc = "향신료 상인",
		lines = {
			"\"동쪽의 길은 이 도시를 지나야만 서쪽으로 이어지지요.\"",
			"상인이 향신료 자루를 열어 향을 맡게 한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_amber_room", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_amber_room", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_alexandria_sage", title = "알렉산드리아의 현자", portId = "alexandria", art = "library", npc = "현자",
		lines = {
			"\"불타 사라진 책들도 사람들의 기억 속에는 남았다네.\"",
			"현자가 별자리 그림을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_astrolabe", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_astrolabe", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tangier_guide", title = "탕헤르의 길잡이", portId = "tangier", art = "harbor", npc = "길잡이",
		lines = {
			"\"헤라클레스의 기둥을 지나면 이제 바다가 끝없이 이어지지.\"",
			"길잡이가 수평선을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_maelstrom", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_maelstrom", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_riga_timber", title = "리가의 목재상", portId = "riga", art = "market", npc = "목재상",
		lines = {
			"\"이 돛대감은 발트의 숲에서 강을 타고 내려온 것이오.\"",
			"목재상이 곧게 뻗은 통나무를 두드린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_birch", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_birch", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tallinn_watch", title = "탈린의 파수꾼", portId = "tallinn", art = "palace", npc = "파수꾼",
		lines = {
			"\"성벽 위에서 보면 상인의 배와 해적의 배가 한눈에 구분되지.\"",
			"파수꾼이 망원경을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_hansa_seal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_hansa_seal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_helsinki_pilot", title = "헬싱키의 군도 도선사", portId = "helsinki", art = "storm", npc = "군도 도선사",
		lines = {
			"\"수천 개의 섬 사이를 지나려면 바위 이름을 모두 외워야 하오.\"",
			"도선사가 손으로 섬들을 헤아린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_skerries", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_skerries", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_petersburg_tsar", title = "페테르부르크의 건설 감독", portId = "st_petersburg", art = "palace", npc = "건설 감독",
		lines = {
			"\"늪 위에 도시를 세우다니, 황제의 고집은 못 말리지.\"",
			"감독이 설계도를 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_estuary", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_estuary", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_koenigsberg_amber", title = "쾨니히스베르크의 호박 세공사", portId = "koenigsberg", art = "market", npc = "호박 세공사",
		lines = {
			"\"이 안에 갇힌 벌레는 수천 년 전부터 그대로라오.\"",
			"세공사가 호박을 빛에 비춘다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_amber_raw", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_amber_raw", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_visby_monk", title = "비스뷔의 수도사", portId = "visby", art = "ruins", npc = "수도사",
		lines = {
			"\"무너진 성당들은 이곳이 얼마나 부유했는지 말해 주지요.\"",
			"수도사가 돌 부스러기를 쓸어낸다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_rune_stone", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_rune_stone", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_palmas_sailor", title = "라스팔마스의 항해사", portId = "las_palmas", art = "harbor", npc = "항해사",
		lines = {
			"\"여기서 서쪽으로 닷새만 가면 새로운 땅이 있다는 소문이 있소.\"",
			"항해사가 서쪽 수평선을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_dogger_bank", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_dogger_bank", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_funchal_vintner", title = "푼샬의 포도주 상인", portId = "funchal", art = "tavern", npc = "포도주 상인",
		lines = {
			"\"배에서 흔들릴수록 맛이 깊어지는 술이라오.\"",
			"상인이 잔을 기울인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_hops", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_hops", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_azores_whaler", title = "아조레스의 고래잡이", portId = "ponta_delgada", art = "storm", npc = "고래잡이",
		lines = {
			"\"산 위 망루에서 고래를 보면 종을 울리지.\"",
			"고래잡이가 작살을 어깨에 멘다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_orca", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_orca", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_palma_fisher", title = "팔마의 어부", portId = "palma", art = "harbor", npc = "어부",
		lines = {
			"\"문어는 항아리에 숨는 걸 좋아해서 쉽게 잡힌다오.\"",
			"어부가 토기 항아리를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_octopus", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_octopus", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cagliari_saltman", title = "카글리아리의 염부", portId = "cagliari", art = "market", npc = "염부",
		lines = {
			"\"홍학이 오면 소금이 잘 익은 거라오.\"",
			"염부가 소금 산을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_flamingo", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_flamingo", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ajaccio_shepherd", title = "코르시카의 양치기", portId = "ajaccio", art = "ruins", npc = "양치기",
		lines = {
			"\"이 섬의 관목숲은 도망자들의 오랜 은신처지.\"",
			"양치기가 지팡이에 기대어 웃는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_cork_oak", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_cork_oak", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_toulon_shipwright", title = "툴롱의 선박 목수", portId = "toulon", art = "forge", npc = "선박 목수",
		lines = {
			"\"송진이 마르기 전에 틈을 메워야 한다오.\"",
			"목수가 역청 통을 휘젓는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_pine_resin", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_pine_resin", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_syracuse_actor", title = "시라쿠사의 배우", portId = "syracuse", art = "ruins", npc = "늙은 배우",
		lines = {
			"\"이 돌 객석에서 수천 년 전에도 박수가 터졌소.\"",
			"배우가 극장 무대 위에서 인사한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_mosaic", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_mosaic", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ancona_notary", title = "안코나의 공증인", portId = "ancona", art = "library", npc = "공증인",
		lines = {
			"\"계약서는 바다가 변해도 변하지 않는 유일한 약속이오.\"",
			"공증인이 잉크병을 정리한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_hansa_seal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_hansa_seal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_split_mason", title = "스플리트의 석공", portId = "split", art = "forge", npc = "석공",
		lines = {
			"\"황제의 궁전 안에 사람들이 집을 짓고 사는 곳이오.\"",
			"석공이 대리석 조각을 쓰다듬는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_marble", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_marble", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_salonica_priest", title = "테살로니키의 사제", portId = "thessaloniki", art = "library", npc = "사제",
		lines = {
			"\"이 도시의 성화는 천 년 동안 바뀌지 않았소.\"",
			"사제가 촛불을 켠다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_icon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_icon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_candia_diver", title = "칸디아의 잠수부", portId = "candia", art = "harbor", npc = "해면 잠수부",
		lines = {
			"\"바닷속에는 옛 항아리가 가득 쌓여 있지요.\"",
			"잠수부가 젖은 항아리 조각을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_amphora", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_amphora", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_rhodes_knight", title = "로도스의 기사", portId = "rhodes", art = "palace", npc = "기사",
		lines = {
			"\"한때 이 항구 입구에 청동 거인이 서 있었다고 하오.\"",
			"기사가 항구 입구를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_carthage_coin", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_carthage_coin", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cyprus_miner", title = "키프로스의 광부", portId = "famagusta", art = "forge", npc = "광부",
		lines = {
			"\"구리라는 말이 이 섬 이름에서 나왔다오.\"",
			"광부가 구릿빛 돌을 쥐어 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_tin_ore", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_tin_ore", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_smyrna_dealer", title = "이즈미르의 융단 상인", portId = "smyrna", art = "market", npc = "융단 상인",
		lines = {
			"\"한 땀 한 땀 짠 융단이니 값을 깎지 마시오.\"",
			"상인이 붉은 융단을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_sundial", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_sundial", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_acre_templar", title = "아크레의 옛 기사", portId = "acre", art = "palace", npc = "옛 기사",
		lines = {
			"\"성벽은 무너져도 이 땅을 지키려던 맹세는 남았소.\"",
			"기사가 낡은 십자 문장을 만진다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_icon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_icon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_oran_potter", title = "오랑의 도공", portId = "oran", art = "market", npc = "도공",
		lines = {
			"\"붉은 흙을 구우면 이렇게 단단한 항아리가 되지요.\"",
			"도공이 물레를 멈춘다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_amphora", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_amphora", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_benghazi_nomad", title = "벵가지의 유목민", portId = "benghazi", art = "ruins", npc = "유목민",
		lines = {
			"\"사막의 모래 아래엔 옛 그리스인의 도시가 잠들어 있소.\"",
			"유목민이 낙타 고삐를 쥔다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_camel", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_camel", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_malaga_raisin", title = "말라가의 건포도 농부", portId = "malaga", art = "market", npc = "농부",
		lines = {
			"\"햇볕에 말린 포도는 먼 북쪽에서도 귀한 대접을 받지요.\"",
			"농부가 건포도 한 줌을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_grape", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_grape", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_gibraltar_guard", title = "지브롤터의 경비병", portId = "gibraltar", art = "palace", npc = "경비병",
		lines = {
			"\"이 바위가 지켜보는 한 해협은 아무도 몰래 지나갈 수 없소.\"",
			"경비병이 해협 쪽을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_strait_gibraltar", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_strait_gibraltar", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cartagena_miner", title = "카르타헤나의 광부", portId = "cartagena", art = "forge", npc = "광부",
		lines = {
			"\"로마 시절 갱도가 아직도 산속에 이어져 있다오.\"",
			"광부가 등불을 높이 든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_lead", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_lead", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_trieste_clerk", title = "트리에스테의 서기", portId = "trieste", art = "library", npc = "서기",
		lines = {
			"\"항구에 닿는 화물은 모두 장부에 한 줄씩 남지요.\"",
			"서기가 장부를 넘긴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_hansa_seal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_hansa_seal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_messina_fisher", title = "메시나의 창고기잡이", portId = "messina", art = "harbor", npc = "어부",
		lines = {
			"\"좁은 해협에서는 거대한 물고기를 작살로 잡소.\"",
			"어부가 긴 작살을 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_tuna", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_tuna", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_corfu_priest", title = "코르푸의 사제", portId = "corfu", art = "library", npc = "사제",
		lines = {
			"\"섬의 성인은 이 항구를 몇 번이나 지켰다고 하오.\"",
			"사제가 성화 앞에 촛불을 켠다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_icon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_icon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_beirut_cedar", title = "베이루트의 삼나무 장수", portId = "beirut", art = "market", npc = "나무 장수",
		lines = {
			"\"배의 돛대는 레바논의 삼나무가 제일이지.\"",
			"장수가 향긋한 나무토막을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_pine_resin", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_pine_resin", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_damietta_farmer", title = "다미에타의 농부", portId = "damietta", art = "garden", npc = "농부",
		lines = {
			"\"강물이 불어났다 빠지면 땅이 저절로 기름지다오.\"",
			"농부가 진흙 묻은 손을 턴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_date_palm", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_date_palm", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_bone_coral", title = "본의 산호 채취꾼", portId = "bone", art = "harbor", npc = "산호 채취꾼",
		lines = {
			"\"붉은 산호는 바닷속 보석이라 귀부인들이 탐내지요.\"",
			"채취꾼이 붉은 가지를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_octopus", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_octopus", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_casablanca_merchant", title = "카사블랑카의 곡물 상인", portId = "casablanca", art = "market", npc = "곡물 상인",
		lines = {
			"\"대서양 쪽 항구는 사하라 대상의 마지막 목적지지요.\"",
			"상인이 낙타 짐 보따리를 풀어 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_harmattan", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_harmattan", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_safi_potter", title = "사피의 도공", portId = "safi", art = "market", npc = "도공",
		lines = {
			"\"푸른 유약은 바다색을 훔친 거라오.\"",
			"도공이 갓 구운 접시를 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_mask", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_mask", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_agadir_herder", title = "아가디르의 염소지기", portId = "agadir", art = "garden", npc = "염소지기",
		lines = {
			"\"아르간 열매를 먹은 염소가 나무 위에 올라간다오.\"",
			"염소지기가 나무를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_acacia", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_acacia", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_praia_sailor", title = "프라이아의 늙은 항해사", portId = "praia", art = "harbor", npc = "늙은 항해사",
		lines = {
			"\"여기서 서쪽 바다는 아무도 끝을 본 적이 없다네.\"",
			"항해사가 수평선을 오래 바라본다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_canary_current", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_canary_current", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_stlouis_trader", title = "생루이의 고무 상인", portId = "saint_louis", art = "market", npc = "고무 상인",
		lines = {
			"\"아카시아 수액이 이렇게 비싸게 팔릴 줄 누가 알았겠소.\"",
			"상인이 투명한 덩어리를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_acacia", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_acacia", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_dakar_fisher", title = "다카르의 어부", portId = "dakar", art = "harbor", npc = "어부",
		lines = {
			"\"바다는 풍성하지만 물살은 거칠고 무자비하오.\"",
			"어부가 형형색색 카누를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_canary_current", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_canary_current", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_bissau_guide", title = "비사우의 강 안내인", portId = "bissau", art = "garden", npc = "강 안내인",
		lines = {
			"\"맹그로브 숲은 길을 잃기 딱 좋은 미로라오.\"",
			"안내인이 긴 장대를 들어 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_mangrove", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_mangrove", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_freetown_doctor", title = "프리타운의 의사", portId = "freetown", art = "library", npc = "의사",
		lines = {
			"\"이 땅의 열병은 약초와 인내로만 이길 수 있소.\"",
			"의사가 말린 약초 다발을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_kola", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_kola", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_elmina_factor", title = "엘미나의 상관장", portId = "elmina", art = "palace", npc = "상관장",
		lines = {
			"\"금가루 한 줌의 무게가 곧 이 성의 가치요.\"",
			"상관장이 작은 저울을 만진다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_gold_weights", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_gold_weights", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ouidah_priest", title = "위다의 사제", portId = "ouidah", art = "ruins", npc = "사제",
		lines = {
			"\"숲에는 조상의 목소리가 깃들어 있다오.\"",
			"사제가 가면을 쓰다듬는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_mask", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_mask", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_lagos_weaver", title = "라고스의 직공", portId = "lagos", art = "market", npc = "직공",
		lines = {
			"\"우리 천은 한 가닥도 같은 무늬가 없지요.\"",
			"직공이 직물을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_kente", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_kente", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_calabar_pilot", title = "칼라바르의 강 도선사", portId = "calabar", art = "harbor", npc = "도선사",
		lines = {
			"\"삼각주의 물길은 매 계절 모양이 달라진다오.\"",
			"도선사가 손으로 물길을 그린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_niger_delta", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_niger_delta", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_saotome_planter", title = "상투메의 농장주", portId = "sao_tome", art = "garden", npc = "농장주",
		lines = {
			"\"화산토에서는 사탕수수가 두 배로 자라지요.\"",
			"농장주가 밭을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_kola", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_kola", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_luanda_trader", title = "루안다의 상인", portId = "luanda", art = "market", npc = "상인",
		lines = {
			"\"내륙의 구리와 상아가 이 항구로 모입니다.\"",
			"상인이 구릿빛 돌을 쥐여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_copper_ore", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_copper_ore", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_benguela_hunter", title = "벵겔라의 사냥꾼", portId = "benguela", art = "ruins", npc = "사냥꾼",
		lines = {
			"\"타조 깃털은 사막에서 가장 가벼운 재산이오.\"",
			"사냥꾼이 깃털 다발을 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_ostrich", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_ostrich", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_helena_keeper", title = "세인트헬레나의 등대지기", portId = "st_helena", art = "harbor", npc = "등대지기",
		lines = {
			"\"이 섬은 바다 한가운데 유일한 쉼터라오.\"",
			"등대지기가 차를 따라 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_doldrums", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_doldrums", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cape_pilot", title = "케이프타운의 도선사", portId = "cape_town", art = "storm", npc = "도선사",
		lines = {
			"\"두 대양이 만나는 곶에서는 파도가 산처럼 일지요.\"",
			"도선사가 먼 곶을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_cape_good_hope", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_cape_good_hope", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_mozambique_gov", title = "모잠비크의 총독", portId = "mozambique", art = "palace", npc = "총독",
		lines = {
			"\"이 성은 인도로 가는 모든 배의 중간 기착지요.\"",
			"총독이 항구를 내려다본다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_fort_jesus", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_fort_jesus", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_kilwa_chronicler", title = "킬와의 기록관", portId = "kilwa", art = "library", npc = "기록관",
		lines = {
			"\"한때 이 도시의 금이 바다 건너까지 소문났다오.\"",
			"기록관이 낡은 두루마리를 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_swahili_door", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_swahili_door", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_mombasa_dhow", title = "몸바사의 다우선 선장", portId = "mombasa", art = "harbor", npc = "다우선 선장",
		lines = {
			"\"겨울 계절풍을 타면 인도까지 한 달이오.\"",
			"선장이 삼각돛을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_monsoon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_monsoon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_zanzibar_clove", title = "잔지바르의 정향 농부", portId = "zanzibar", art = "garden", npc = "정향 농부",
		lines = {
			"\"꽃봉오리가 붉어지기 전에 따야 향이 좋다오.\"",
			"농부가 말린 꽃봉오리를 쥐여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_clove_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_clove_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_mogadishu_trader", title = "모가디슈의 상인", portId = "mogadishu", art = "market", npc = "상인",
		lines = {
			"\"용연향 한 조각이 배 한 척 값이라오.\"",
			"상인이 회색 덩어리를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_dhow_model", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_dhow_model", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_aden_guard", title = "아덴의 경비병", portId = "aden", art = "palace", npc = "경비병",
		lines = {
			"\"홍해로 드나드는 배는 모두 이 문을 지나야 하오.\"",
			"경비병이 바위 절벽을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_red_sea", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_red_sea", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_mocha_merchant", title = "모카의 커피 상인", portId = "mocha", art = "market", npc = "커피 상인",
		lines = {
			"\"우리 커피 열매는 한 알도 밖으로 못 나가던 보물이었소.\"",
			"상인이 볶은 열매를 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_prayer_beads", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_prayer_beads", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_jeddah_pilgrim", title = "제다의 순례자", portId = "jeddah", art = "ruins", npc = "순례자",
		lines = {
			"\"먼 곳에서 온 이들이 이 항구에서 첫 기도를 올린다오.\"",
			"순례자가 염주를 만진다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_prayer_beads", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_prayer_beads", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_muscat_diver", title = "무스카트의 진주잠수부", portId = "muscat", art = "harbor", npc = "진주 잠수부",
		lines = {
			"\"숨을 오래 참을수록 큰 진주를 만나지요.\"",
			"잠수부가 조개를 쥔다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_pearl_oyster", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_pearl_oyster", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_hormuz_navigator", title = "호르무즈의 항해사", portId = "bandar_abbas", art = "storm", npc = "항해사",
		lines = {
			"\"좁은 입구에서는 바람보다 해류가 무섭지요.\"",
			"항해사가 해도를 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_persian_gulf", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_persian_gulf", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_basra_gardener", title = "바스라의 정원사", portId = "basra", art = "garden", npc = "정원사",
		lines = {
			"\"대추야자는 발은 물에, 머리는 불 속에 둔다고들 하지요.\"",
			"정원사가 야자를 올려다본다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_date_palm", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_date_palm", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_diu_captain", title = "디우의 요새 대장", portId = "diu", art = "palace", npc = "요새 대장",
		lines = {
			"\"이 요새는 바다 위의 마지막 방벽이었소.\"",
			"대장이 성벽을 두드린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_dhow_model", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_dhow_model", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_surat_banker", title = "수라트의 환전상", portId = "surat", art = "market", npc = "환전상",
		lines = {
			"\"먼 나라 돈도 이 저울 위에서는 모두 같지요.\"",
			"환전상이 금화를 저울에 올린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_saltpeter", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_saltpeter", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_goa_priest", title = "고아의 신부", portId = "goa", art = "library", npc = "신부",
		lines = {
			"\"이 땅의 향신료 냄새가 기도 속에도 스며든다오.\"",
			"신부가 성당 문을 연다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_goa_church", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_goa_church", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_calicut_zamorin", title = "캘리컷의 상인 대표", portId = "calicut", art = "market", npc = "상인 대표",
		lines = {
			"\"후추 한 자루에 수많은 항로가 얽혀 있다오.\"",
			"대표가 후추 열매를 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_pepper_vine", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_pepper_vine", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cochin_fisher", title = "코친의 어부", portId = "cochin", art = "harbor", npc = "어부",
		lines = {
			"\"이 거대한 그물은 여러 사람이 함께 내려야 하오.\"",
			"어부가 지렛대를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_cochin_nets", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_cochin_nets", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_colombo_gem", title = "콜롬보의 보석상", portId = "colombo", art = "market", npc = "보석상",
		lines = {
			"\"사파이어는 빛을 받아야 속살을 보여 준다오.\"",
			"보석상이 푸른 돌을 빛에 비춘다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_sapphire", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_sapphire", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_madras_weaver", title = "마드라스의 직공", portId = "madras", art = "market", npc = "직공",
		lines = {
			"\"한 폭의 천에 꽃밭이 들어 있지요.\"",
			"직공이 인쇄 천을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_indigo_plant", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_indigo_plant", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_calcutta_clerk", title = "캘커타의 서기", portId = "calcutta", art = "library", npc = "서기",
		lines = {
			"\"강물처럼 장부도 끝없이 이어진다오.\"",
			"서기가 붓을 내려놓는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_ganges_delta", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_ganges_delta", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_malacca_harbor", title = "말라카의 항만 관리", portId = "malacca", art = "palace", npc = "항만 관리",
		lines = {
			"\"동서의 모든 배가 이 좁은 물길에서 만나지.\"",
			"관리가 해협을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_malacca_strait", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_malacca_strait", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_louis_sailor", title = "포트루이의 선원", portId = "port_louis", art = "harbor", npc = "선원",
		lines = {
			"\"이 섬에는 날지 못하는 커다란 새가 살았다고 하오.\"",
			"선원이 해변을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_mozambique_channel", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_mozambique_channel", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_manila_friar", title = "마닐라의 수도사", portId = "manila", art = "library", npc = "수도사",
		lines = {
			"\"갈레온은 해마다 은을 싣고 태평양을 건너오지요.\"",
			"수도사가 낡은 해도를 편다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_manila_intramuros", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_manila_intramuros", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_macau_trader", title = "마카오의 무역상", portId = "macau", art = "market", npc = "무역상",
		lines = {
			"\"도자기와 차는 이 작은 반도에서 서쪽으로 흘러가오.\"",
			"무역상이 푸른 접시를 올려놓는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_ming_vase", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_ming_vase", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_canton_hong", title = "광저우의 행상인", portId = "canton", art = "market", npc = "행상인",
		lines = {
			"\"서양 상인은 이 열세 개 상관 안에서만 거래할 수 있소.\"",
			"행상인이 장부를 넘긴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_lacquer_box", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_lacquer_box", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_amoy_junk", title = "샤먼의 정크선 선장", portId = "amoy", art = "harbor", npc = "정크선 선장",
		lines = {
			"\"우리 배는 대나무 돛으로 바람을 비스듬히도 탄다오.\"",
			"선장이 돛을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_south_china_sea", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_south_china_sea", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ningbo_monk", title = "닝보의 승려", portId = "ningbo", art = "ruins", npc = "승려",
		lines = {
			"\"차 한 잔의 시간이 바다 몇 날보다 길 때도 있지요.\"",
			"승려가 찻잔을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_tea_plant", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_tea_plant", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_shanghai_weaver", title = "상하이의 직공", portId = "shanghai", art = "market", npc = "직공",
		lines = {
			"\"누에가 천천히 뽑은 실이 빛나는 천이 되지요.\"",
			"직공이 비단을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_mulberry", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_mulberry", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tianjin_boatman", title = "톈진의 뱃사공", portId = "tianjin", art = "harbor", npc = "뱃사공",
		lines = {
			"\"이 물길로 쌀과 비단이 황제의 도성까지 올라가오.\"",
			"뱃사공이 노를 짚는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_great_wall", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_great_wall", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_nagasaki_interpreter", title = "나가사키의 통역관", portId = "nagasaki", art = "library", npc = "통역관",
		lines = {
			"\"서양 책은 이 작은 섬을 통해서만 들어옵니다.\"",
			"통역관이 네덜란드 책을 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_dejima", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_dejima", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_osaka_merchant", title = "오사카의 쌀 상인", portId = "osaka", art = "market", npc = "쌀 상인",
		lines = {
			"\"이 도시에서는 쌀 한 가마가 곧 돈이오.\"",
			"상인이 쌀 영수증을 흔든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_rice_paddy", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_rice_paddy", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_edo_samurai", title = "에도의 무사", portId = "edo", art = "palace", npc = "무사",
		lines = {
			"\"검은 마음을 지키기 위해 허리에 찬다오.\"",
			"무사가 조용히 인사한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_samurai_helm", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_samurai_helm", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_hakodate_fisher", title = "하코다테의 어부", portId = "hakodate", art = "storm", npc = "어부",
		lines = {
			"\"북쪽 바다는 오징어가 달처럼 떠오르지요.\"",
			"어부가 등불을 흔든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_squid_giant", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_squid_giant", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_busan_envoy", title = "부산의 왜관 관리", portId = "busan", art = "palace", npc = "왜관 관리",
		lines = {
			"\"인삼이 이 길로 바다를 건너가지요.\"",
			"관리가 인삼 뿌리를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_ginseng_root", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_ginseng_root", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_incheon_clam", title = "인천의 조개잡이", portId = "incheon", art = "harbor", npc = "조개잡이",
		lines = {
			"\"썰물에 갯벌이 드러나면 온 마을이 나서지요.\"",
			"조개잡이가 호미를 든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_crane", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_crane", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tainan_planter", title = "타이난의 농장주", portId = "tainan", art = "garden", npc = "농장주",
		lines = {
			"\"사탕수수와 장뇌가 이 섬의 재산이오.\"",
			"농장주가 밭을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_bamboo", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_bamboo", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_hoian_lantern", title = "호이안의 등불 장수", portId = "hoi_an", art = "market", npc = "등불 장수",
		lines = {
			"\"밤이 되면 강 전체가 등불 바다가 된다오.\"",
			"장수가 색색 등을 흔든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_lacquer_box", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_lacquer_box", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_bangkok_abbot", title = "방콕의 주지", portId = "bangkok", art = "ruins", npc = "주지",
		lines = {
			"\"사원의 금은 이 땅 사람들의 믿음이라오.\"",
			"주지가 합장한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_buddha_head", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_buddha_head", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_rangoon_pilgrim", title = "양곤의 순례자", portId = "rangoon", art = "ruins", npc = "순례자",
		lines = {
			"\"황금 탑은 멀리서도 길을 알려 주지요.\"",
			"순례자가 탑을 올려다본다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_shwedagon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_shwedagon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_singapore_harbor", title = "싱가포르의 항만 관리", portId = "singapore", art = "harbor", npc = "항만 관리",
		lines = {
			"\"여기는 동서 항로의 목구멍 같은 곳이오.\"",
			"관리가 해협을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_malacca_strait", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_malacca_strait", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_batavia_burgher", title = "바타비아의 시민", portId = "batavia", art = "palace", npc = "시민",
		lines = {
			"\"고향의 운하를 열대에 옮겨 놓았지요.\"",
			"시민이 운하를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_batavia_canal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_batavia_canal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_makassar_sailor", title = "마카사르의 부기 선원", portId = "makassar", art = "harbor", npc = "선원",
		lines = {
			"\"우리는 바람을 읽는 데 평생을 쓴다오.\"",
			"선원이 별을 올려다본다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_pearl_oyster", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_pearl_oyster", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ternate_sultan", title = "테르나테의 술탄 사자", portId = "ternate", art = "palace", npc = "술탄의 사자",
		lines = {
			"\"정향은 이 작은 섬의 하늘이 준 선물이오.\"",
			"사자가 정향 가지를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_clove_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_clove_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ambon_farmer", title = "암본의 농부", portId = "ambon", art = "garden", npc = "농부",
		lines = {
			"\"꽃봉오리를 따는 아침이 일 년 중 가장 바쁘지요.\"",
			"농부가 광주리를 든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_nutmeg_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_nutmeg_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_banda_planter", title = "반다의 농장주", portId = "banda", art = "garden", npc = "농장주",
		lines = {
			"\"한 알의 씨앗이 금보다 귀한 섬이라오.\"",
			"농장주가 육두구를 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_nutmeg_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_nutmeg_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_brunei_boatman", title = "브루나이의 뱃사공", portId = "brunei", art = "harbor", npc = "뱃사공",
		lines = {
			"\"우리는 물 위에 집을 짓고 산다오.\"",
			"뱃사공이 수상 가옥을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_orangutan", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_orangutan", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_halifax_fisher", title = "핼리팩스의 어부", portId = "halifax", art = "harbor", npc = "어부",
		lines = {
			"\"대구는 안개 속에서 가장 많이 잡히지요.\"",
			"어부가 그물을 풀어 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_cod_grand", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_cod_grand", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_stjohns_skipper", title = "세인트존스의 선장", portId = "st_johns", art = "storm", npc = "어선 선장",
		lines = {
			"\"빙산이 오면 그해 고기잡이는 끝이오.\"",
			"선장이 먼 수평선을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_labrador_current", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_labrador_current", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_quebec_trapper", title = "퀘벡의 사냥꾼", portId = "quebec", art = "market", npc = "모피 사냥꾼",
		lines = {
			"\"비버 가죽 한 장이 여기서는 장화 한 켤레 값이오.\"",
			"사냥꾼이 가죽을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_beaver", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_beaver", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_boston_printer", title = "보스턴의 인쇄공", portId = "boston", art = "library", npc = "인쇄공",
		lines = {
			"\"이 작은 활자가 바다 건너 소식을 실어 나르오.\"",
			"인쇄공이 잉크 묻은 손을 턴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_old_north_church", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_old_north_church", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_newyork_trader", title = "뉴욕의 모피 상인", portId = "new_york", art = "market", npc = "모피 상인",
		lines = {
			"\"허드슨 강을 따라 내륙의 가죽이 모두 이리로 내려오오.\"",
			"상인이 장부를 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_beaver", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_beaver", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_philly_printer", title = "필라델피아의 학자", portId = "philadelphia", art = "library", npc = "학자",
		lines = {
			"\"이 도시는 책과 토론으로 자랐소.\"",
			"학자가 서가를 정리한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_independence_hall", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_independence_hall", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_charleston_planter", title = "찰스턴의 농장주", portId = "charleston", art = "garden", npc = "농장주",
		lines = {
			"\"쌀과 인디고가 이 땅을 먹여 살리오.\"",
			"농장주가 논을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_tomato", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_tomato", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_neworleans_trader", title = "뉴올리언스의 상인", portId = "new_orleans", art = "market", npc = "상인",
		lines = {
			"\"강물이 모든 물건을 이 항구로 데려오지요.\"",
			"상인이 강을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_mississippi", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_mississippi", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_nassau_pirate", title = "나소의 늙은 해적", portId = "nassau", art = "tavern", npc = "늙은 해적",
		lines = {
			"\"깃발 아래서는 모두가 평등했지, 몫도 똑같았고.\"",
			"해적이 럼 잔을 들어 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_pirate_code", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_pirate_code", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_havana_guard", title = "아바나의 요새 경비", portId = "havana", art = "palace", npc = "경비병",
		lines = {
			"\"보물 함대는 이 항구에서 모여 함께 출발하오.\"",
			"경비병이 쇠사슬을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_castillo_havana", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_castillo_havana", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_veracruz_clerk", title = "베라크루스의 서기", portId = "veracruz", art = "library", npc = "서기",
		lines = {
			"\"은 한 상자가 도착할 때마다 장부가 한 장 늘지요.\"",
			"서기가 붓을 든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_aztec_calendar", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_aztec_calendar", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_campeche_cutter", title = "캄페체의 벌목꾼", portId = "campeche", art = "forge", npc = "로그우드 벌목꾼",
		lines = {
			"\"이 나무는 붉은색보다 더 짙은 보라를 낸다오.\"",
			"벌목꾼이 톱을 내려놓는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_logwood_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_logwood_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_kingston_merchant", title = "킹스턴의 상인", portId = "kingston", art = "market", npc = "상인",
		lines = {
			"\"설탕과 럼이 이 섬의 통화라오.\"",
			"상인이 럼 통을 두드린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_port_royal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_port_royal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_santodomingo_monk", title = "산토도밍고의 수사", portId = "santo_domingo", art = "library", npc = "수사",
		lines = {
			"\"신대륙에서 가장 먼저 세워진 도시지요.\"",
			"수사가 오래된 성당을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_amber_dominican", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_amber_dominican", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_sanjuan_gunner", title = "산후안의 포병", portId = "san_juan", art = "palace", npc = "포병",
		lines = {
			"\"이 요새는 몇 번의 포위에도 무너지지 않았소.\"",
			"포병이 대포를 쓰다듬는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_fortress_morro", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_fortress_morro", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_bridgetown_planter", title = "브리지타운의 농장주", portId = "bridgetown", art = "garden", npc = "농장주",
		lines = {
			"\"설탕 한 통이 금 한 통과 같다오.\"",
			"농장주가 사탕수수를 꺾는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_sugar_mill", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_sugar_mill", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_trinidad_guide", title = "포트오브스페인의 안내인", portId = "port_of_spain", art = "garden", npc = "안내인",
		lines = {
			"\"이 섬엔 카카오가 숲처럼 자란다오.\"",
			"안내인이 열매를 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_cacao_pod", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_cacao_pod", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_laguaira_diver", title = "라과이라의 진주잠수부", portId = "la_guaira", art = "harbor", npc = "진주 잠수부",
		lines = {
			"\"카리브 진주는 바다의 눈물이라 불리지요.\"",
			"잠수부가 조개를 쥔다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_pearl_carib", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_pearl_carib", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cartagena_gov", title = "카르타헤나의 총독", portId = "cartagena_indias", art = "palace", npc = "총독",
		lines = {
			"\"보물 함대가 이 성벽 아래서 쉬어 갑니다.\"",
			"총독이 성벽을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_cartagena_walls", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_cartagena_walls", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_portobelo_factor", title = "포르토벨로의 상관장", portId = "portobelo", art = "market", npc = "상관장",
		lines = {
			"\"해마다 한 번 장터가 열리면 도시가 일어서지요.\"",
			"상관장이 은화를 센다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_silver_ore_potosi", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_silver_ore_potosi", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_paramaribo_guide", title = "파라마리보의 길잡이", portId = "paramaribo", art = "garden", npc = "길잡이",
		lines = {
			"\"밀림에는 길이 없어서 물길이 곧 길이오.\"",
			"길잡이가 노를 내민다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_jaguar", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_jaguar", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_belem_rubber", title = "벨렝의 고무 채취꾼", portId = "belem", art = "garden", npc = "채취꾼",
		lines = {
			"\"흰 수액을 모으면 공처럼 튀는 물건이 되오.\"",
			"채취꾼이 고무 공을 튕긴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_rubber_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_rubber_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_recife_sailor", title = "헤시피의 뱃사람", portId = "recife", art = "harbor", npc = "뱃사람",
		lines = {
			"\"여기서 아프리카까지는 바람만 타면 금방이오.\"",
			"뱃사람이 동쪽을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_turtle_green", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_turtle_green", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_salvador_priest", title = "살바도르의 신부", portId = "salvador", art = "library", npc = "신부",
		lines = {
			"\"이 도시는 한때 신대륙의 수도였소.\"",
			"신부가 종탑을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_brazilwood_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_brazilwood_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_rio_fisher", title = "리우의 어부", portId = "rio", art = "harbor", npc = "어부",
		lines = {
			"\"이 만은 1월에 발견되어 강 이름이 붙었지요.\"",
			"어부가 설탕빵 산을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_sugarloaf", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_sugarloaf", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_montevideo_gaucho", title = "몬테비데오의 가우초", portId = "montevideo", art = "market", npc = "가우초",
		lines = {
			"\"끝없는 초원에서 말과 소가 곧 재산이오.\"",
			"가우초가 말고삐를 당긴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_rio_plata", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_rio_plata", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ba_trader", title = "부에노스아이레스의 상인", portId = "buenos_aires", art = "market", npc = "상인",
		lines = {
			"\"가죽과 은이 이 항구를 통해 바다를 건너지요.\"",
			"상인이 가죽 더미를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_llama", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_llama", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_sydney", title = "시드니의 안내인", portId = "sydney", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_kangaroo", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_kangaroo", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_hobart", title = "호바트의 안내인", portId = "hobart", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_emu", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_emu", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_perth", title = "퍼스의 안내인", portId = "perth", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_tasmanian_devil", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_tasmanian_devil", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_darwin", title = "다윈의 안내인", portId = "darwin", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_marine_iguana", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_marine_iguana", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_auckland", title = "오클랜드의 안내인", portId = "auckland", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_birdwing", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_birdwing", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_port_moresby", title = "포트모르즈비의 안내인", portId = "port_moresby", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_breadfruit", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_breadfruit", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_suva", title = "수바의 안내인", portId = "suva", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_hibiscus", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_hibiscus", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_tahiti", title = "타히티의 안내인", portId = "tahiti", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_kelp_forest", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_kelp_forest", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_honolulu", title = "호놀룰루의 안내인", portId = "honolulu", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_black_pearl", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_black_pearl", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_guam", title = "괌의 안내인", portId = "guam", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_coral_white", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_coral_white", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_acapulco", title = "아카풀코의 안내인", portId = "acapulco", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_moai", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_moai", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_panama", title = "파나마의 안내인", portId = "panama", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_boomerang", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_boomerang", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_guayaquil", title = "과야킬의 안내인", portId = "guayaquil", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_conch_horn", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_conch_horn", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_callao", title = "카야오의 안내인", portId = "callao", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_fur_trade_pelt", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_fur_trade_pelt", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_valparaiso", title = "발파라이소의 안내인", portId = "valparaiso", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_uluru", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_uluru", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_san_francisco", title = "샌프란시스코의 안내인", portId = "san_francisco", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_panama_viejo", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_panama_viejo", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_sitka", title = "싯카의 안내인", portId = "sitka", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_sitka_church", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_sitka_church", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_vancouver", title = "밴쿠버의 안내인", portId = "vancouver", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_tasman_sea", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_tasman_sea", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
}

-- 나라마다 다른 주인공 이야기. nation 이 같은 사람만 본다. 앞 장면을 봐야 다음이 열린다.
local NationStories: { [string]: { chapter: string, events: { { any } } } } = {
	england = { chapter = "엘리너 렌의 항해", events = {
		{ "england_lon", "london", "palace", "학회 서기", "거절당한 논문", 0, { "런던 왕립학회 계단. 서기가 엘리너의 논문을 되돌려 준다.", "\"여성이 쓴 해류 관측이라니, 증거가 부족합니다. 바다에서 직접 재 오시지요.\"", "엘리너는 종이를 말아 쥐었다. 증거를 가져오겠다. 바다 끝까지라도." }, { { "관측 기구를 사 들고 출항한다 (50코인)", "서기가 말없이 눈을 피했다. 엘리너는 첫 관측 기구를 배에 실었다.", 3, 0, 1, 50 }, { "논문을 다시 쓰며 후원자를 찾는다", "후원자 한 명이 이름을 적어 보냈다. 이것이 첫 걸음이다.", 2, 60, 0, 0 } } },
		{ "england_cdz", "cadiz", "harbor", "스페인 도선사", "대서양의 첫 측정", 30, { "카디스 부두. 도선사가 엘리너의 해류병을 신기한 듯 들여다본다.", "\"이 병을 띄우면 어디로 흘러가는지 안다고? 선원들이 웃을 걸세. 하지만 나는 안 웃네.\"", "첫 해류병이 서쪽으로 흘러갔다. 증거의 시작이다." }, { { "매일 기록을 남긴다", "관측 일지가 두툼해졌다. 엘리너의 손끝이 단단해졌다.", 3, 0, 2, 0 }, { "도선사에게 사례한다 (30코인)", "도선사가 해류가 빠른 철을 일러 주었다.", 2, 0, 1, 30 } } },
		{ "england_cap", "cape_town", "storm", "등대지기", "폭풍의 곶에서", 110, { "케이프타운 등대. 폭풍의 곶이 포효한다.", "\"저기를 건너려면 배 한 척 값은 각오하시오. 학회 학자 중에도 돌아온 이가 없소.\"", "엘리너는 관측 기구를 단단히 묶으며 말했다. '그래서 저기가 중요한 거예요.'" }, { { "폭풍 속에서 관측을 강행한다", "거센 파도 속에서도 기록은 끝났다. 선원들의 눈빛이 달라졌다.", 6, 0, 2, 0 }, { "안전한 날을 기다린다 (80코인)", "기다림은 길었지만 자료는 더 정확했다.", 4, 0, 1, 80 } } },
		{ "england_cal", "calicut", "library", "인도 천문학자", "별과 해류", 220, { "캘리컷 천문대. 학자가 엘리너의 기록을 별판에 겹쳐 본다.", "\"해류와 별이 한 장의 그림 안에 있군요. 당신은 바다를 읽는 법을 새로 쓰고 있소.\"", "엘리너는 처음으로 논문 속 문장이 자신 있게 느껴졌다." }, { { "공동 연구를 제안한다", "학자가 기꺼이 동의했다. 지식은 나눌수록 넓어진다.", 7, 0, 2, 0 }, { "기록 사본을 교환한다 (100코인)", "서로의 기록이 맞물려 정확도가 크게 높아졌다.", 6, 0, 1, 100 } } },
		{ "england_syd", "sydney", "library", "시드니 항해사", "증거를 들고", 400, { "시드니 항. 수평선 너머로 지구의 곡선이 느껴진다.", "엘리너의 일지는 이제 세 바다의 해류를 담았다. 학회에 가져갈 증거다.", "\"이걸 제출하면 그들도 인정할 거예요.\" 엘리너가 미소 지었다." }, { { "논문을 학회에 부친다", "에필로그: 몇 달 뒤 학회에서 답장이 왔다. '당신을 초대합니다.'", 20, 300, 3, 0 }, { "먼저 더 멀리 간다", "에필로그: 엘리너는 증명보다 더 큰 질문을 향해 키를 돌렸다.", 20, 0, 5, 0 } } },
	} },
	netherlands = { chapter = "얀 데 흐로트의 장부", events = {
		{ "netherlands_ams", "amsterdam", "market", "상인 길드장", "길드의 문전박대", 0, { "암스테르담 상인 길드. 길드장이 팔짱을 낀다.", "\"서기의 아들이 독립 상사를? 장부는 잘 써도 바다는 못 쓰네.\"", "얀은 낡은 장부를 가슴에 안았다. 바다에서 증명하겠다." }, { { "작은 거래부터 시작한다", "첫 거래에서 소소한 이문이 남았다.", 3, 80, 0, 0 }, { "길드에 도전장을 낸다", "길드장이 코웃음을 쳤지만 소문은 퍼졌다.", 2, 0, 1, 0 } } },
		{ "netherlands_lis", "lisbon", "market", "포르투갈 중개상", "향신료 시세의 비밀", 30, { "리스본 부두. 중개상이 향신료 값을 속삭인다.", "\"인도에서 사 온 후추가 여기선 열 배요. 하지만 선단 없이는 소용없소.\"", "얀의 눈에서 숫자가 춤추기 시작했다." }, { { "시세표를 만든다", "얀의 장부가 한 권 더 늘었다. 거래 감이 날카로워졌다.", 3, 0, 2, 0 }, { "중개상에게 수수료를 낸다 (40코인)", "중개상이 숨은 항로를 슬쩍 알려 주었다.", 2, 0, 1, 40 } } },
		{ "netherlands_cap", "cape_town", "market", "케이프 상인", "중간 기착지", 110, { "케이프타운 시장. 상인이 신선한 식량을 쌓아 둔다.", "\"여기를 거치지 않고는 동인도에 못 가오. 이 항구가 곧 길목이오.\"", "얀은 길목의 값어치를 장부에 적었다." }, { { "식량 계약을 맺는다 (80코인)", "안정적인 보급로가 생겼다.", 5, 0, 1, 80 }, { "선원들과 함께 쉰다", "선원들의 사기가 올랐다.", 4, 0, 2, 0 } } },
		{ "netherlands_bat", "batavia", "market", "동인도 회사 직원", "독점의 벽", 220, { "바타비아 상관. 직원이 계약서를 밀어낸다.", "\"독립 상인은 이 바다에서 설 자리가 없소. 회사에 들어오시오.\"", "얀은 계약서를 읽고 천천히 고개를 저었다." }, { { "독립을 고수한다", "직원이 놀란 눈으로 물러났다. 소문이 번졌다.", 7, 0, 2, 0 }, { "조건을 협상한다 (100코인)", "타협안이 나왔다. 독립 상선의 길이 열렸다.", 6, 0, 1, 100 } } },
		{ "netherlands_nag", "nagasaki", "harbor", "데지마 통역관", "독립 상사의 깃발", 400, { "나가사키 데지마. 통역관이 상관 입구를 가리킨다.", "\"한 곳에서만 장사하는 이는 없소. 당신은 세계를 장부로 삼는구려.\"", "얀의 상사에 첫 깃발이 걸렸다." }, { { "깃발을 올린다", "에필로그: '흐로트 상사'가 설립되었다. 길드는 더는 코웃음치지 않았다.", 20, 300, 3, 0 }, { "동료들에게 지분을 나눈다", "에필로그: 선원들이 주주가 되었다. 상사는 가족처럼 자랐다.", 20, 0, 5, 0 } } },
	} },
	france = { chapter = "마리온 델라크루아의 영지", events = {
		{ "france_rou", "rouen", "palace", "공증인", "빼앗긴 영지", 0, { "루앙 공증인 사무실. 서류가 책상에 펼쳐진다.", "\"영지는 빚 대신 넘어갔습니다. 되찾으려면 은화 이만을 한 번에 내야 합니다.\"", "마리온은 서류를 접고 조용히 말했다. '그럼 벌어 오겠어요.'" }, { { "바다로 나갈 배를 산다 (60코인)", "첫 배에 가문의 문장을 달았다.", 3, 0, 1, 60 }, { "옛 영지 사람들을 찾는다", "옛 소작인들이 선원으로 합류하겠다고 나섰다.", 2, 40, 1, 0 } } },
		{ "france_cdz", "cadiz", "tavern", "스페인 상인", "설탕의 길", 30, { "카디스 선술집. 상인이 설탕 항로를 그린다.", "\"카리브의 설탕이 유럽에선 금값이오. 위험하지만 이문이 크지.\"", "마리온의 눈에 처음으로 불이 켜졌다." }, { { "카리브행을 결심한다", "마리온은 키를 서쪽으로 돌렸다.", 3, 0, 2, 0 }, { "보험을 든다 (50코인)", "상인이 믿을 만한 보험사를 소개했다.", 2, 0, 1, 50 } } },
		{ "france_hav", "havana", "market", "설탕 농장주", "신대륙의 이문", 110, { "아바나 항구. 농장주가 달콤한 향을 풍기는 자루를 내민다.", "\"계약은 계약이오. 하지만 당신 같은 선장에게는 선금을 걸겠소.\"", "마리온의 배 안이 설탕 자루로 가득 찼다." }, { { "고가에 사들인다 (100코인)", "귀국 후 이문이 클 것 같다.", 5, 0, 1, 100 }, { "농장주와 장기 계약을 맺는다", "안정적 공급선이 생겼다.", 6, 60, 2, 0 } } },
		{ "france_tah", "tahiti", "garden", "섬의 장로", "잊힌 정원", 220, { "타히티 섬. 장로가 마리온에게 꽃 한 송이를 꽂아 준다.", "\"당신은 영지를 찾아 여기까지 왔구려. 땅은 돈으로만 사는 게 아니오.\"", "마리온은 처음으로 영지가 아닌 '땅'의 의미를 생각했다." }, { { "섬의 이야기를 듣는다", "마리온의 목표가 조금 더 넓어졌다.", 6, 0, 2, 0 }, { "섬 사람들과 거래한다 (80코인)", "진귀한 물건을 얻었다.", 5, 0, 1, 80 } } },
		{ "france_rou2", "rouen", "palace", "공증인", "영지를 되찾다", 400, { "루앙 공증인 사무실. 마리온이 금화 자루를 책상에 올린다.", "\"... 이만 은화가 맞군요. 서류에 서명하시지요.\"", "마리온은 펜을 들었다. 손이 떨리지 않았다." }, { { "영지를 되찾는다", "에필로그: 델라크루아의 영지에 다시 깃발이 올랐다.", 20, 300, 3, 0 }, { "영지를 소작인들에게 나눈다", "에필로그: 마리온은 땅을 나누고 다시 바다로 떠났다.", 20, 0, 5, 0 } } },
	} },
	denmark = { chapter = "라스 올센의 항로", events = {
		{ "denmark_cop", "copenhagen", "harbor", "어부 노인", "사라진 동생", 0, { "코펜하겐 어시장. 노인이 라스의 어깨를 두드린다.", "\"네 동생의 배는 북해에서 마지막으로 보였다. 폭풍이 지나가자 흔적도 없었지.\"", "라스는 말없이 고개를 끄덕였다. 찾을 것이다." }, { { "동생이 쓰던 닻을 챙긴다", "닻이 무겁다. 하지만 그 무게가 이정표가 된다.", 3, 0, 1, 0 }, { "어부들에게 수소문한다 (30코인)", "어부 하나가 남쪽을 가리켰다.", 2, 0, 1, 30 } } },
		{ "denmark_ber", "bergen", "harbor", "노르웨이 선장", "북쪽 바다의 소문", 30, { "베르겐 부두. 선장이 언 손을 비빈다.", "\"남쪽에서 온 배가 누군가를 구했다더군. 청년 하나가 열병에 걸려 있었다고.\"", "라스의 눈이 번쩍였다. 그건 동생일지도 모른다." }, { { "남쪽으로 항로를 잡는다", "라스는 남쪽 바다로 키를 돌렸다.", 3, 0, 2, 0 }, { "선장에게 사례한다 (40코인)", "선장이 항로 정보를 더 풀어 주었다.", 2, 0, 1, 40 } } },
		{ "denmark_elm", "elmina", "market", "금 상인", "더운 바다에서", 110, { "엘미나 시장. 상인이 낯선 이름을 듣고 고개를 갸웃한다.", "\"북쪽 청년이라... 한 해 전에 병으로 쓰러진 이를 치료해 주었소.\"", "라스의 심장이 빨리 뛰었다." }, { { "청년의 행방을 묻는다", "상인이 동쪽을 가리켰다. 단서다.", 5, 0, 2, 0 }, { "정보료를 낸다 (80코인)", "상인이 선원 명부를 보여 주었다.", 5, 0, 1, 80 } } },
		{ "denmark_mal", "malacca", "tavern", "해협의 중개상", "동쪽 끝에서", 220, { "말라카 선술집. 중개상이 낡은 선원증을 꺼낸다.", "\"이 이름이 당신 동생이오? 살아 있소. 지금은 광둥으로 가는 배의 갑판장이오.\"", "라스는 오랜만에 소리 내어 웃었다." }, { { "광둥으로 서둘러 향한다", "라스의 배는 바람을 가르며 나아갔다.", 7, 0, 2, 0 }, { "중개상에게 후사한다 (100코인)", "중개상이 더 빠른 항로를 알려 주었다.", 6, 0, 1, 100 } } },
		{ "denmark_mac", "macau", "harbor", "갑판장 올센", "형제의 재회", 400, { "마카오 항. 갑판장이 고개를 돌린다. 오랜만에 보는 얼굴이다.", "\"형, 살아 있었네.\" \"그건 내가 할 말이야.\"", "두 사람은 한참 말없이 서로를 끌어안았다." }, { { "함께 귀향한다", "에필로그: 두 형제가 한 배로 코펜하겐에 돌아왔다.", 20, 300, 3, 0 }, { "함께 항해를 이어간다", "에필로그: 형제의 이름은 먼 바다에서 전설이 되었다.", 20, 0, 5, 0 } } },
	} },
	sweden = { chapter = "잉그리드 베리만의 광맥", events = {
		{ "sweden_got", "gothenburg", "market", "광산 감독", "구리와 철", 0, { "예테보리 부두. 감독이 쌓아 둔 구리 덩어리를 가리킨다.", "\"스웨덴 구리는 유럽에서 제일 좋소. 하지만 팔 길이 막혔소.\"", "잉그리드는 구리 한 덩이를 손에 올렸다. 길은 만들면 된다." }, { { "직접 팔러 나선다", "첫 항해에 구리를 싣고 나섰다.", 3, 0, 1, 0 }, { "광산 사람들을 선원으로 모은다", "억센 사내들이 합류했다.", 2, 40, 1, 0 } } },
		{ "sweden_ams", "amsterdam", "market", "암스테르담 무역상", "구리의 값", 30, { "암스테르담 시장. 상인이 구리 덩어리의 순도를 재 본다.", "\"... 순도가 높군. 이 값이면 사겠소.\"", "첫 큰 거래가 성사되었다. 잉그리드가 장부를 펼쳤다." }, { { "시세를 기록한다", "시세 기록이 쌓일수록 감이 붙는다.", 3, 0, 2, 0 }, { "상인과 계약을 맺는다 (50코인)", "정기 거래처가 생겼다.", 2, 0, 1, 50 } } },
		{ "sweden_cal", "calicut", "market", "인도 향신료 상인", "동방의 향", 110, { "캘리컷 시장. 향신료 향이 코를 찌른다.", "\"구리와 향신료를 맞바꿉시다. 북쪽 사람들은 구리를 귀히 여기지 않소?\"", "잉그리드는 처음으로 구리 이상의 가치를 보았다." }, { { "교환 계약을 맺는다 (80코인)", "교환 거래로 이문이 두 배가 되었다.", 5, 0, 1, 80 }, { "향신료를 한 자루 선물받는다", "상인의 호의로 귀한 향신료를 얻었다.", 6, 0, 2, 0 } } },
		{ "sweden_can", "canton", "market", "광둥 상인", "비단과 철", 220, { "광둥 시장. 상인이 철제 연장을 쓰다듬는다.", "\"이 철은 좋소. 우리 대장장이들이 탐내오.\"", "잉그리드의 눈이 반짝였다. 철도 팔릴 것이다." }, { { "철제 연장을 대량 계약한다", "정기 철 수출 계약이 성사되었다.", 7, 0, 2, 0 }, { "대장장이와 기술을 교환한다 (100코인)", "기술 교환으로 제련이 한층 나아졌다.", 6, 0, 1, 100 } } },
		{ "sweden_got2", "gothenburg", "palace", "예테보리 시장", "동인도 회사", 400, { "예테보리 시청. 시장이 두꺼운 서류를 내민다.", "\"스웨덴에도 동인도 회사를 세웁시다. 당신이 초대 이사요.\"", "잉그리드는 서류에 서명했다. 광맥이 바다에 닿았다." }, { { "회사를 맡는다", "에필로그: 스웨덴 동인도 회사의 깃발이 올랐다.", 20, 300, 3, 0 }, { "광산 마을에 수익을 돌린다", "에필로그: 마을이 번성했고 잉그리드는 다시 바다로 떠났다.", 20, 0, 5, 0 } } },
	} },
	venice = { chapter = "카테리나 로레단의 유리", events = {
		{ "venice_ven", "venice", "forge", "유리공 장인", "불 꺼진 화덕", 0, { "베네치아 무라노 섬. 화덕은 식어 있다.", "\"동방 향신료 독점이 무너지고 가문 유리가 안 팔리오.\"", "카테리나는 식은 화덕에 손을 얹었다. 다시 불을 지피겠다." }, { { "유리 견본을 싣고 출항한다 (50코인)", "유리 상자가 배에 실렸다.", 3, 0, 1, 50 }, { "장인들과 함께 새 문양을 만든다", "새로운 문양이 나왔다.", 2, 50, 1, 0 } } },
		{ "venice_ale", "alexandria", "market", "이집트 상인", "동방으로 가는 문", 30, { "알렉산드리아 시장. 상인이 유리병을 햇빛에 비춘다.", "\"이 색, 사막에서도 본 적 없소. 홍해를 건너는 대상에게 추천하겠소.\"", "카테리나는 미소를 지었다. 길이 열린다." }, { { "대상과 연결된다", "첫 동방 거래처가 생겼다.", 3, 0, 2, 0 }, { "상인에게 선물한다 (40코인)", "상인이 길을 안내해 주었다.", 2, 0, 1, 40 } } },
		{ "venice_ade", "aden", "market", "홍해 중개상", "향신료의 관문", 110, { "아덴 항. 중개상이 후추 자루를 쓰다듬는다.", "\"유리와 후추를 맞바꿉시다. 베네치아 사람은 믿을 만하오.\"", "카테리나의 배가 향신료로 가득 찼다." }, { { "교환 계약을 맺는다 (80코인)", "유리와 후추가 교환되었다.", 5, 0, 1, 80 }, { "중개상과 우정을 쌓는다", "중개상이 인도양 항로를 알려 주었다.", 6, 0, 2, 0 } } },
		{ "venice_cal", "calicut", "market", "인도 상인", "독점을 깨다", 220, { "캘리컷 시장. 상인이 유리 거울을 들고 감탄한다.", "\"이 거울은 이곳 왕실이 탐낼 것이오. 가격은 부르는 대로 받으시오.\"", "카테리나는 처음으로 독점 대신 경쟁을 즐겼다." }, { { "왕실에 거울을 판매한다", "큰 이문이 남았다.", 7, 200, 1, 0 }, { "인도 장인들과 기술을 나눈다", "새로운 기법이 들어왔다.", 6, 0, 2, 0 } } },
		{ "venice_ven2", "venice", "forge", "유리공 장인", "다시 타오르는 불", 400, { "베네치아 무라노 섬. 화덕에 불이 지펴진다.", "\"당신이 돌아오니 화덕이 살아났소. 이제 어떤 유리를 만들겠소?\"", "카테리나는 불꽃을 바라보며 답했다." }, { { "동서양을 잇는 유리를 만든다", "에필로그: 카테리나의 유리는 두 대륙의 상징이 되었다.", 20, 300, 3, 0 }, { "장인 길드를 다시 연다", "에필로그: 무라노 섬에 새 길드가 열렸다.", 20, 0, 5, 0 } } },
	} },
	ottoman = { chapter = "레일라 하미디의 향신료", events = {
		{ "ottoman_ist", "istanbul", "market", "그랜드 바자르 상인", "끊긴 향신료 길", 0, { "이스탄불 그랜드 바자르. 상인이 텅 빈 향신료 가판대를 가리킨다.", "\"홍해 길목이 막혀 후추가 안 들어온 지 석 달이오. 하미디 가문 상점도 곧 문을 닫소.\"", "레일라는 빈 자루를 접었다. 길이 막혔다면 직접 열 것이다." }, { { "배를 빌려 출항한다 (50코인)", "낡은 배 한 척이 레일라를 기다렸다.", 3, 0, 1, 50 }, { "가문 상인들에게 투자를 청한다", "몇몇 상인이 소액을 보탰다.", 2, 60, 0, 0 } } },
		{ "ottoman_ale", "alexandria", "harbor", "이집트 도선사", "홍해로 가는 길", 30, { "알렉산드리아 항. 도선사가 지도를 펼친다.", "\"홍해 입구에서 해적이 설치고 있소. 하지만 돌아가면 이문이 반으로 줄지.\"", "레일라는 지도의 한 점을 손가락으로 짚었다." }, { { "해적 소굴을 피해 우회한다", "안전한 우회로를 찾았다.", 3, 0, 2, 0 }, { "도선사를 고용한다 (40코인)", "도선사가 길을 안내했다.", 2, 0, 1, 40 } } },
		{ "ottoman_ade", "beirut", "market", "대상 중개상", "후추의 관문", 110, { "베이루트 항. 중개상이 후추 자루를 건넨다.", "\"당신 같은 상인에게 먼저 팔고 싶었소. 가문 이름을 들었소.\"", "레일라의 배가 향신료로 가득 찼다." }, { { "크게 사들인다 (100코인)", "이스탄불에서 높은 이문이 남을 것이다.", 5, 0, 1, 100 }, { "중개상과 우정을 쌓는다", "중개상이 동방 소식을 알려 주었다.", 5, 0, 2, 0 } } },
		{ "ottoman_mal", "venice", "market", "베네치아 중개상", "서쪽의 큰 시장", 220, { "베네치아 부두. 중개상이 정향 자루를 쓰다듬는다.", "\"이 정향은 본토 값의 열 배요. 하지만 선단 없이는 못 가져가오.\"", "레일라는 장부에 가장 큰 숫자를 적었다." }, { { "선단 후원자를 찾는다", "후원자를 구해 선단을 꾸렸다.", 7, 0, 2, 0 }, { "직접 모험을 걸어 본다 (100코인)", "위험을 감수한 대가로 큰 이문이 났다.", 6, 200, 1, 100 } } },
		{ "ottoman_ist2", "istanbul", "market", "그랜드 바자르 상인", "다시 향기로운 바자르", 400, { "이스탄불 그랜드 바자르. 가판대가 다시 향신료로 차오른다.", "\"하미디 가문이 돌아왔소!\" 상인들이 환호한다.", "레일라는 첫 번째 자루를 풀어 향을 맡았다." }, { { "가문 상점을 되살린다", "에필로그: 하미디 향신료 상점이 제국에서 가장 큰 가게가 되었다.", 20, 300, 3, 0 }, { "무역로를 모두에게 나눈다", "에필로그: 레일라의 항로는 모두의 길이 되었다.", 20, 0, 5, 0 } } },
	} },
	swahili = { chapter = "아민 살림의 계절풍", events = {
		{ "swahili_zan", "zanzibar", "harbor", "늙은 선장", "계절풍의 아이", 0, { "잔지바르 항구. 늙은 선장이 모래 위에 바람 방향을 그린다.", "\"아민, 오늘은 동쪽 바람이다. 하지만 거긴 이미 포르투갈 배가 지키고 있다.\"", "아민은 바람 소리에 귀를 기울였다. 바람은 편을 가리지 않는다." }, { { "계절풍 표를 만든다", "바람표가 한 장 늘었다. 항해 감이 날카로워졌다.", 3, 0, 2, 0 }, { "선원을 모집한다 (30코인)", "젊은 선원들이 모여들었다.", 2, 0, 1, 30 } } },
		{ "swahili_kil", "kilwa", "market", "킬와 상인", "금과 상아", 30, { "킬와 시장. 상인이 상아를 쓰다듬는다.", "\"인도 상인들이 상아를 목마르게 찾소. 당신 배가 건너 주면 좋겠소.\"", "아민은 상아를 배에 실었다. 첫 외해 항해다." }, { { "인도로 출항한다", "바람이 도왔다. 항해가 순조로웠다.", 3, 0, 2, 0 }, { "상인에게 선금을 건넨다 (40코인)", "상인이 감사하며 부두를 열었다.", 2, 0, 1, 40 } } },
		{ "swahili_ade", "aden", "market", "홍해 중개상", "문 열린 홍해", 110, { "아덴 항. 중개상이 아랍 지도를 보여 준다.", "\"당신의 계절풍 표는 우리에게도 값지오. 거래합시다.\"", "아민은 처음으로 자신의 지식을 팔았다." }, { { "계절풍 표를 거래한다", "지식도 상품이 된다는 것을 알았다.", 5, 150, 1, 0 }, { "지도를 교환한다", "귀한 지도 한 장을 얻었다.", 6, 0, 2, 0 } } },
		{ "swahili_goa", "goa", "palace", "포르투갈 관리", "낯선 깃발 아래서", 220, { "고아 총독부. 관리가 거만하게 내려다본다.", "\"이 바다는 포르투갈의 허가가 필요하오. 통행증 값을 내시오.\"", "아민은 조용히 고개를 들었다. 바다는 누구의 것도 아니다." }, { { "통행증을 사고 항해를 이어 간다 (100코인)", "돈은 나갔지만 자유는 얻었다.", 6, 0, 1, 100 }, { "정중히 항의한다", "관리는 곤란한 표정을 지었다. 소문이 번졌다.", 7, 0, 2, 0 } } },
		{ "swahili_zan2", "zanzibar", "harbor", "늙은 선장", "바람의 이름", 400, { "잔지바르 항구. 늙은 선장이 모래 위에 마지막 방향을 그린다.", "\"아민, 이제 이 바다의 바람은 네 이름으로 불릴 것이다.\"", "아민은 모래 위에 자신의 항로를 새겼다." }, { { "바람의 노래를 가르친다", "에필로그: 아민의 항해술이 해안 모든 항구에 전해졌다.", 20, 300, 3, 0 }, { "먼 바다로 새로 떠난다", "에필로그: 아민은 바람을 따라 세상 끝으로 떠났다.", 20, 0, 5, 0 } } },
	} },
	malabar = { chapter = "라마 나이르의 후추", events = {
		{ "malabar_cal", "calicut", "market", "후추 농부", "이문 없는 풍년", 0, { "캘리컷 시장. 후추 농부가 한숨을 쉰다.", "\"올해는 풍년인데 값이 반토막이오. 중개상들이 값을 후려치오.\"", "라마는 후추 한 줌을 손에 쥐었다. 직접 팔아야 한다." }, { { "직접 항해에 나선다 (50코인)", "라마의 첫 항해가 시작되었다.", 3, 0, 1, 50 }, { "농부들과 힘을 합친다", "농부들이 후추를 맡겼다.", 2, 50, 1, 0 } } },
		{ "malabar_coc", "cochin", "harbor", "코친 선주", "배를 빌리다", 30, { "코친 부두. 선주가 낡은 배를 가리킨다.", "\"이 배, 한 번만 쓰겠소? 값은 후추로 치르시오.\"", "라마는 배에 후추를 가득 실었다." }, { { "조건을 협상한다", "선주가 한발 물러섰다.", 3, 0, 2, 0 }, { "선금을 낸다 (40코인)", "선주가 선원까지 붙여 주었다.", 2, 0, 1, 40 } } },
		{ "malabar_mal", "zanzibar", "market", "잔지바르 중개상", "서쪽의 값", 110, { "잔지바르 항. 중개상이 후추 값을 부른다.", "\"여기선 값이 두 배요. 하지만 아랍 상인과 직접 거래하면 세 배요.\"", "라마의 머릿속에서 숫자가 맞춰지기 시작했다." }, { { "아랍 상인을 만난다", "새 거래선이 열렸다.", 5, 0, 2, 0 }, { "수수료를 내고 소개받는다 (80코인)", "확실한 거래선을 얻었다.", 5, 0, 1, 80 } } },
		{ "malabar_can", "aden", "market", "아덴 상인", "유향과 커피", 220, { "아덴 시장. 상인이 유향을 보여 준다.", "\"후추와 유향을 교환합시다. 서쪽에서 유향은 금값이오.\"", "라마의 배가 유향으로 가득 찼다." }, { { "교환 계약을 맺는다 (100코인)", "장기 계약이 성사되었다.", 7, 0, 1, 100 }, { "우정의 선물로 후추를 건넨다", "상인의 호의를 샀다.", 6, 0, 2, 0 } } },
		{ "malabar_cal2", "calicut", "market", "후추 농부", "값을 되찾다", 400, { "캘리컷 시장. 농부들이 환호한다.", "\"라마 덕에 이문이 세 배요! 중개상도 이제 우릴 얕보지 못하오.\"", "라마는 농부들 앞에 서서 말했다." }, { { "협동조합을 만든다", "에필로그: 말라바르 후추 조합이 생겼다. 농부들의 삶이 바뀌었다.", 20, 300, 3, 0 }, { "새 항로를 열러 떠난다", "에필로그: 라마의 배는 더 먼 바다로 나갔다.", 20, 0, 5, 0 } } },
	} },
	japan = { chapter = "사쿠라이 하루카의 바다", events = {
		{ "japan_nag", "nagasaki", "harbor", "도선사", "닫힌 바다 앞에서", 0, { "나가사키 항. 도선사가 먼 수평선을 가리킨다.", "\"이 바다 너머에는 은과 비단과 지식이 있소. 하지만 이 나라는 아직 문을 열지 않았소.\"", "하루카는 배의 키를 어루만졌다. 그래도 가 볼 것이다." }, { { "허가를 받아 소규모 항해에 나선다 (50코인)", "작은 배로 첫 항해가 시작되었다.", 3, 0, 1, 50 }, { "조용히 출항 준비를 한다", "선원 몇이 합류했다.", 2, 40, 1, 0 } } },
		{ "japan_osa", "osaka", "market", "오사카 상인", "은과 비단", 30, { "오사카 시장. 상인이 은괴를 보여 준다.", "\"이 은은 중국에서 비단과 바뀌오. 위험하지만 이문은 크오.\"", "하루카의 배에 은괴가 실렸다." }, { { "중국으로 향한다", "순풍이 불었다.", 3, 0, 2, 0 }, { "상인에게 보증을 선다 (40코인)", "상인의 신뢰를 얻었다.", 2, 0, 1, 40 } } },
		{ "japan_can", "canton", "market", "광둥 상인", "바다 건너의 지식", 110, { "광둥 시장. 학자가 책을 건넨다.", "\"이 책은 별 보는 법이오. 배에도 쓸모가 있을 거요.\"", "하루카의 눈에 새 세계가 열렸다." }, { { "책을 번역한다", "항해술이 한 단계 올랐다.", 5, 0, 2, 0 }, { "책값을 치른다 (80코인)", "귀한 책 한 권을 얻었다.", 5, 0, 1, 80 } } },
		{ "japan_mal", "malacca", "tavern", "해협의 중개상", "서쪽 상인들", 220, { "말라카 선술집. 서양 선원들이 시끄럽게 떠든다.", "\"이쪽 바다는 이제 우리 거요.\" \"그건 모를 일이지.\"", "하루카는 조용히 술잔을 기울였다." }, { { "대화에 끼어든다", "서양 선원이 항로 지식을 풀어 주었다.", 7, 0, 2, 0 }, { "정보를 사들인다 (100코인)", "귀한 정보를 얻었다.", 6, 0, 1, 100 } } },
		{ "japan_edo", "edo", "palace", "쇼군의 사자", "열린 바다", 400, { "에도 성. 사자가 하루카를 불러 세운다.", "\"당신이 본 바다 이야기를 들려주시오. 막부가 귀 기울이고 있소.\"", "하루카는 선원들과 지도를 펼쳤다." }, { { "항해 지식을 나눈다", "에필로그: 하루카의 항해록이 일본 항해술의 새 출발이 되었다.", 20, 300, 3, 0 }, { "먼 바다로 다시 떠난다", "에필로그: 하루카는 바다 너머의 바다로 향했다.", 20, 0, 5, 0 } } },
	} },
	new_spain = { chapter = "디에고 모랄레스의 은", events = {
		{ "new_spain_ver", "veracruz", "harbor", "은 감독관", "은광의 바다", 0, { "베라크루스 항. 감독관이 은괴를 세어 본다.", "\"은은 본국으로 가지만 이 항구에는 먼지만 남소. 우리 쪽 상인이 직접 팔 길이 필요하오.\"", "디에고는 은괴를 손에 쥐었다. 길은 바다에 있다." }, { { "배를 마련한다 (50코인)", "디에고의 첫 배가 닻을 올렸다.", 3, 0, 1, 50 }, { "광산 사람들을 선원으로 모은다", "억센 사내들이 합류했다.", 2, 40, 1, 0 } } },
		{ "new_spain_hav", "havana", "tavern", "쿠바 선장", "카리브의 규칙", 30, { "아바나 술집. 선장이 건배를 청한다.", "\"이 바다에서 은 실은 배는 해적 눈에 띄오. 호위가 필요하오.\"", "디에고는 선장의 잔을 받았다." }, { { "선장과 함께 항해한다", "든든한 동료가 생겼다.", 3, 0, 2, 0 }, { "호위비를 낸다 (40코인)", "안전한 호위를 얻었다.", 2, 0, 1, 40 } } },
		{ "new_spain_cad", "cadiz", "market", "스페인 상인", "본국의 시장", 110, { "카디스 시장. 상인이 은괴를 저울에 올린다.", "\"이 순도는 최고요. 하지만 왕실이 세금을 걷어 가오.\"", "디에고는 세금과 이문을 장부에 적었다." }, { { "세금을 내고 정직하게 판다 (80코인)", "정직한 거래로 신뢰를 샀다.", 5, 0, 1, 80 }, { "길드와 새 계약을 맺는다", "길드의 보호가 생겼다.", 5, 0, 2, 0 } } },
		{ "new_spain_aca", "cartagena", "harbor", "콜롬비아 선원", "남쪽 바다 건너편", 220, { "카르타헤나 항. 선원이 에메랄드 자루를 내려놓는다.", "\"콜롬비아에서 온 에메랄드요. 은 한 자루와 바꾸면 이문이 열 배요.\"", "디에고의 눈이 남쪽 바다 너머를 바라보았다." }, { { "남쪽 바다 항로에 도전한다", "새로운 바다의 문이 열렸다.", 7, 0, 2, 0 }, { "에메랄드 거래를 시작한다 (100코인)", "첫 에메랄드 거래가 성사되었다.", 6, 0, 1, 100 } } },
		{ "new_spain_ver2", "veracruz", "harbor", "은 감독관", "은이 가는 길", 400, { "베라크루스 항. 감독관이 눈을 크게 뜬다.", "\"당신의 배가 처음으로 이 항구에서 은을 팔았소.\"", "디에고는 항구 사람들 앞에서 말했다." }, { { "항구 상인 조합을 만든다", "에필로그: 베라크루스 상인 조합이 생겨 은이 이곳에서 팔리게 되었다.", 20, 300, 3, 0 }, { "남쪽 바다로 더 나아간다", "에필로그: 디에고는 은과 보석의 길을 끝까지 이었다.", 20, 0, 5, 0 } } },
	} },
}
for _, nid in { "england", "netherlands", "france", "denmark", "sweden", "venice", "ottoman", "swahili", "malabar", "japan", "new_spain" } do
	local def = NationStories[nid]
	for i, f in def.events do
		local ch = {}
		for _, c in f[8] do
			local eff: Effect = { fame = c[3], coins = if c[4] > 0 then c[4] else nil, affinity = if c[5] > 0 then c[5] else nil }
			table.insert(ch, { text = c[1], effect = eff, result = c[2], cost = if c[6] > 0 then c[6] else nil })
		end
		table.insert(Events, {
			id = f[1], chapter = def.chapter, title = f[5], portId = f[2], art = f[3], npc = f[4],
			lines = f[7], choices = ch, minFame = f[6], nation = nid,
			requires = if i > 1 then { { id = def.events[i - 1][1] } } else nil,
		})
	end
end


local ById: { [string]: Event } = {}
for _, e in Events do
	ById[e.id] = e
end

return {
	Events = Events,
	ById = ById,
}
