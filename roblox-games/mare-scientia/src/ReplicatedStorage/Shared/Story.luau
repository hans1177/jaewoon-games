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

-- 연작 '아버지의 항적': 여섯 바다마다 세 장면. 앞 장면을 봐야 다음이 열린다.
-- 각 항: id, 항구, 그림, 인물, 제목, 필요 명성, 대사들, 선택지 {글, 결과, 명성, 코인, 호감, 비용}
local Father: { { any } } = {
	{ "fa_1a", "lisbon", "tavern", "빚쟁이 선주", "아버지의 외상 장부", 0,
		{ "리스본 부두. 굵은 목소리의 선주가 낡은 장부를 탁 내려놓는다.", "\"로페스 선장 아들이냐? 아버지는 내게 은화 팔백을 빚지고 떠났다. 하지만 이 장부 마지막 장을 봐라.\"", "마지막 장에는 서툰 글씨로 '여섯 바다, 세 조각'이라고만 적혀 있다." },
		{ { "빚을 갚겠다고 약속한다", "선주가 고개를 끄덕였다. '약속은 장부보다 무겁지.' 그가 작은 선금을 쥐여 줬다.", 3, 80, 0, 0 }, { "아버지를 변호한다", "선주가 한숨을 쉬었다. '네 아버지 같은 눈을 하는군.'", 2, 0, 1, 0 } } },
	{ "fa_1b", "cadiz", "harbor", "늙은 수부", "서쪽으로 간 배", 15,
		{ "카디스 방파제 끝에서 늙은 수부가 그물을 깁는다.", "\"하얀 돛 로페스? 마지막으로 본 날, 그는 별도 없는 서쪽으로 키를 꺾었지.\"", "\"무모하다고 했더니 웃더군. '아는 곳으로만 가면 바다가 좁아지잖소.' 그게 마지막 말이었어.\"" },
		{ { "그 말을 가슴에 새긴다", "수부가 말했다. '그럼 너도 서쪽으로 가겠군.' 그가 낡은 해도 한 귀퉁이를 주었다.", 2, 0, 2, 0 }, { "수부에게 술을 산다 (20코인)", "취한 수부가 더 많은 이야기를 쏟아냈다. 아버지는 아프리카 쪽 이름을 되뇌었다고 한다.", 1, 0, 1, 20 } } },
	{ "fa_1c", "amsterdam", "library", "지도 상인", "찢어진 해도", 30,
		{ "암스테르담 지도상의 작업실. 먼지 쌓인 양피지가 책상 위에 펼쳐진다.", "\"이 가장자리... 같은 사람이 그린 조각이 세 장 더 있을 거요. 여섯 바다에 한 조각씩이오.\"", "\"해도는 보물을 가리키는 게 아니오. 바다의 '모양'을 그리고 있소.\"" },
		{ { "조각 값을 치르고 탁본을 사 간다 (60코인)", "탁본에는 첫 바다와 두 번째 바다 사이의 해류가 그려져 있었다.", 4, 0, 0, 60 }, { "그냥 이야기를 듣고 간다", "지도 상인은 혼잣말처럼 지도 읽는 법을 가르쳐 주었다.", 3, 0, 1, 0 } } },

	{ "fa_2a", "elmina", "market", "황금 상인 아부", "아버지를 기억하는 상인", 45,
		{ "엘미나 성채 아래 시장. 금빛 천을 두른 상인이 눈을 가늘게 뜬다.", "\"로페스? 그분은 거래를 하러 온 게 아니었소. 우리 별자리 이야기를 듣고 싶어 했지.\"", "\"대신 이 부적을 남기셨소. '아들이 오면 전해 달라'고.\"" },
		{ { "부적을 받는다", "부적 안쪽에 '다음은 루안다, 별이 거꾸로 보이는 곳'이라 새겨져 있다.", 4, 0, 1, 0 }, { "금 거래를 제안한다", "아부가 껄껄 웃었다. '아들은 장사꾼이군!' 짭짤한 거래가 성사되었다.", 2, 160, 0, 0 } } },
	{ "fa_2b", "luanda", "ruins", "난파선 생존자", "섬에 닿은 편지", 60,
		{ "루안다 해안. 햇볕에 그을린 사내가 낡은 병 하나를 건넨다.", "\"3년 전 이 병이 해안에 밀려왔소. 안엔 편지가... 읽을 수는 없어 가지고만 있었소.\"", "편지는 아버지의 글씨다. '지식은 항구에 없다. 아무도 보지 않는 바다에 있다.'" },
		{ { "편지를 소중히 간직한다", "아버지가 살아 있었다는 단서다. 가슴이 뛴다.", 5, 0, 2, 0 }, { "생존자에게 사례한다 (50코인)", "생존자가 눈물을 글썽였다. '살아 계셨으면 좋겠구려.'", 3, 0, 1, 50 } } },
	{ "fa_2c", "bissau", "harbor", "눈먼 어부", "별이 거꾸로 선 밤", 75,
		{ "비사우 만. 눈먼 어부가 별이 없는 하늘을 올려다본다.", "\"우리는 별을 보지 않소. 파도의 결을 읽지. 당신 아버지에게 이렇게 가르쳤소.\"", "\"서쪽 끝, 길고 하얀 해안. 그곳에서 두 번째 조각을 본 사람이 있다고 들었소.\"" },
		{ { "파도 읽는 법을 배운다", "한 시간 만에 파도의 결이 보이기 시작했다. 항해가 조금 쉬워질 것 같다.", 4, 0, 2, 0 }, { "사례로 코인을 남긴다 (40코인)", "어부가 손을 내저으며 웃었다. '그럼 다음 파도에 안전하시오.'", 3, 0, 1, 40 } } },

	{ "fa_3a", "cartagena", "market", "해적 출신 상인", "엘도라도의 소문", 100,
		{ "카르타헤나 선술집. 흉터 있는 사내가 금화를 손가락으로 튕긴다.", "\"로페스? 그 하얀 돛이 정글 강 하구로 들어갔지. 금 때문이 아니라 식물 때문이라더군.\"", "\"식물 하나에 배 한 척 값을? 미친 학자들이지.\"" },
		{ { "식물 이야기를 더 묻는다", "그는 약초 이름 몇 가지를 알려 줬다. 어딘가 도움이 될 것 같다.", 4, 0, 1, 0 }, { "정보료를 낸다 (80코인)", "그가 바다 지도를 펼쳐 하구 위치를 짚어 줬다.", 5, 0, 0, 80 } } },
	{ "fa_3b", "havana", "tavern", "무전 선원들", "하바나의 아버지 이야기", 120,
		{ "아바나 술집이 갑자기 조용해진다. '하얀 돛의 아들'이라는 속삭임이 퍼진다.", "\"당신 아버지는 우릴 바다에서 구했소. 폭풍 속에 닻을 던져 주었지.\"", "\"그분 이름 한 번 부르면 이 도시 술이 공짜요.\"" },
		{ { "선원들과 건배한다", "밤새 노래가 이어졌다. 선원들의 신뢰가 한층 두터워졌다.", 5, 0, 2, 0 }, { "아버지의 항해 일지를 구한다 (100코인)", "한 선원이 아버지의 일지 한 쪽을 내밀었다. 마지막 줄은 '두 번째 조각은 하얀 모래 위'.", 4, 0, 1, 100 } } },
	{ "fa_3c", "bridgetown", "garden", "식물 화가", "두 번째 조각", 140,
		{ "바베이도스 정원. 화가가 스케치북에서 접힌 양피지를 꺼낸다.", "\"당신 아버지가 그림 값으로 남기고 가셨소. 그림은 팔았지만 이건 팔 수 없었소.\"", "펼쳐 보니 해도의 두 번째 조각이다! 바다의 모양이 한결 선명해진다." },
		{ { "조각을 받아 든다", "손끝이 떨렸다. 이제 세 조각 중 둘이 맞춰지고 있다.", 8, 0, 2, 0 }, { "화가에게 그림을 부탁한다 (80코인)", "화가가 선장의 초상을 스케치해 주었다. 이야기가 한층 가까워졌다.", 6, 0, 2, 80 } } },

	{ "fa_4a", "cape_town", "storm", "폭풍의 곶 등대지기", "폭풍의 곶", 170,
		{ "케이프타운 등대. 늙은 등대지기가 사나운 파도를 가리킨다.", "\"저기가 '폭풍의 곶'이오. 당신 아버지가 하룻밤 사이 돌았소. 배가 부서질 뻔했지.\"", "\"그날 아침 그가 말하더군. '바다는 이겨야 할 적이 아니라 배워야 할 스승이오.'\"" },
		{ { "그 말을 곱씹는다", "등대지기가 만족스럽게 고개를 끄덕였다. '그럼 곶을 건널 자격이 있소.'", 6, 0, 2, 0 }, { "등대 수리비를 낸다 (100코인)", "등대지기가 고마워하며 항로 꿀팁을 알려 줬다.", 5, 0, 1, 100 } } },
	{ "fa_4b", "zanzibar", "market", "향신료 도매상", "바람의 법칙", 200,
		{ "잔지바르 향신료 시장. 도매상이 우유 빛 안개 속에서 손짓한다.", "\"계절풍은 거짓말을 하지 않소. 반년은 동으로, 반년은 서로. 당신 아버지는 이걸 장부로 만들었소.\"", "\"그 장부 사본을 가져왔소. 무료는 아니지만.\"" },
		{ { "사본을 산다 (120코인)", "계절풍 장부를 읽자 인도양 항해가 한층 선명해졌다.", 7, 0, 1, 120 }, { "도매상의 이야기를 끝까지 듣는다", "도매상이 눈을 반짝이며 바람의 법칙을 풀어 주었다.", 5, 0, 2, 0 } } },
	{ "fa_4c", "calicut", "library", "인도 천문학자", "세 번째 조각의 그림자", 230,
		{ "캘리컷 천문대. 학자가 별판 위에 해도 조각을 대 본다.", "\"이 곡선은 바다의 해류와 별의 길을 겹쳐 그린 거요. 이 조각은 마지막 퍼즐 두 장 중 하나요.\"", "\"세 번째 조각은 가장 먼 바다에 있소. 그걸 찾으면 당신 아버지가 무엇을 찾고 있었는지 알게 될 거요.\"" },
		{ { "별판을 배우고 싶다고 청한다", "학자가 하룻밤 별판 읽는 법을 가르쳐 주었다.", 7, 0, 2, 0 }, { "연구비를 기부한다 (150코인)", "학자가 감사의 뜻으로 조각의 사본을 건넸다.", 8, 0, 1, 150 } } },

	{ "fa_5a", "malacca", "market", "해협의 중개상", "아버지의 마지막 항구", 260,
		{ "말라카 해협. 중개상이 목소리를 낮춘다.", "\"당신 아버지는 5년 전 여기서 배를 새로 샀소. 먼 곳으로 가신다더군.\"", "\"행선지는 안 알려 줬지만, 선원들이 '이름 없는 바다'라고 수군거렸소.\"" },
		{ { "선원들의 이름을 묻는다", "중개상이 선원 몇 명의 이름을 일러 주었다. 어디선가 마주칠지도 모른다.", 7, 0, 1, 0 }, { "정보료를 낸다 (150코인)", "중개상이 종이 한 장을 건넸다. 아버지 배의 마지막 입항 기록이다.", 9, 0, 0, 150 } } },
	{ "fa_5b", "macau", "palace", "마카오 총독의 서기", "비단길의 서신", 300,
		{ "마카오 총독부. 서기가 서랍에서 봉인된 편지를 꺼낸다.", "\"이 서신은 당신 아버지 이름으로 4년 전 도착했소. 수취인이 나타나지 않아 보관해 왔소.\"", "봉인을 뜯자 '아들아, 이 편지를 읽는다면 너는 내가 가지 못한 곳까지 온 것이다'로 시작한다." },
		{ { "끝까지 읽는다", "편지는 마지막 바다의 위치를 암시하며 끝났다. 눈물이 났다.", 10, 0, 3, 0 }, { "소리 내어 선원들과 함께 읽는다", "선원들이 말없이 눈시울을 붉혔다. 항해의 의미가 한층 깊어졌다.", 8, 0, 3, 0 } } },
	{ "fa_5c", "nagasaki", "harbor", "데지마 통역관", "이름 없는 바다", 340,
		{ "나가사키 데지마. 통역관이 낡은 지도를 펼친다.", "\"여기서 동쪽으로 석 달. 사람들은 아무것도 없다고 하지만, 항해사 눈엔 별빛이 하나 더 보이는 곳이오.\"", "\"당신 아버지가 마지막으로 들른 항구는 이곳이오. 그 뒤로는 소식이 없소.\"" },
		{ { "항로를 베껴 적는다", "마지막 바다의 방향이 정해졌다. 이제 되돌릴 수 없다.", 10, 0, 2, 0 }, { "통역관에게 감사 선물을 한다 (150코인)", "통역관이 비밀 항로 하나를 더 알려 주었다.", 8, 0, 1, 150 } } },

	{ "fa_6a", "tahiti", "garden", "섬의 장로", "별을 읽는 사람들", 380,
		{ "타히티 해변. 장로가 파도 위에 별 모양 돌을 놓는다.", "\"우리는 문자가 아니라 노래로 바다를 기억하오. 당신 아버지는 그 노래를 일곱 번 외우고 떠났소.\"", "\"그 노래를 당신에게도 가르쳐 주겠소.\"" },
		{ { "노래를 배운다", "밤새 노래를 익혔다. 별과 파도가 하나로 이어진다.", 10, 0, 3, 0 }, { "섬 사람들과 잔치를 연다 (200코인)", "잔치가 사흘 밤낮으로 이어졌다. 사람들의 신뢰를 얻었다.", 12, 0, 2, 200 } } },
	{ "fa_6b", "honolulu", "ruins", "하와이 항해사", "마지막 조각", 420,
		{ "호놀룰루 해안 동굴. 항해사가 조각을 꺼내 불빛 아래 비춘다.", "\"이 조각은 당신 아버지가 '다음 사람을 위해' 맡긴 거요. 당신이 첫 번째로 이걸 가지러 온 사람이오.\"", "세 번째 조각이 맞춰지자 해도에 한 문장이 드러난다. '바다는 팔 물건이 아니라 배울 것이다.'" },
		{ { "조각을 받는다", "해도가 완성되었다. 가슴이 벅차오른다.", 15, 0, 3, 0 }, { "항해사와 항해 노래를 부른다", "두 사람의 노래가 밤바다에 번졌다. 오래 기억될 밤이었다.", 12, 0, 3, 0 } } },
	{ "fa_6c", "sydney", "harbor", "낯선 노선장", "아버지의 마지막 항적", 460,
		{ "시드니 항. 새하얀 수염의 노선장이 낡은 하얀 돛을 가리킨다.", "\"선장, 오랜만이오. 아니, 아들이구려. 눈매가 꼭 닮았소.\"", "\"당신 아버지는 여기서 평온하게 마지막 지도를 그리다 가셨소. 이 해도는 이제 당신 것이오. 완성은 당신이 하시오.\"" },
		{ { "아버지의 해도를 이어받는다", "에필로그: 바다는 아직 끝나지 않았다. 새로운 항해가 시작된다.", 30, 500, 5, 0 }, { "아버지의 배를 고쳐 함께 출항한다 (300코인)", "에필로그: 하얀 돛이 다시 바다로 나아갔다. 전설은 끝나지 않는다.", 30, 0, 5, 300 } } },
}
for i, f in Father do
	local lines = f[7]
	local ch = {}
	for _, c in f[8] do
		local eff: Effect = { fame = c[3], coins = if c[4] > 0 then c[4] else nil, affinity = if c[5] > 0 then c[5] else nil }
		table.insert(ch, { text = c[1], effect = eff, result = c[2], cost = if c[6] > 0 then c[6] else nil })
	end
	table.insert(Events, {
		id = f[1], chapter = "아버지의 항적", title = f[5], portId = f[2], art = f[3], npc = f[4],
		lines = lines, choices = ch, minFame = f[6],
		requires = if i > 1 then { { id = Father[i - 1][1] } } else nil,
	})
end

local ById: { [string]: Event } = {}
for _, e in Events do
	ById[e.id] = e
end

return {
	Events = Events,
	ById = ById,
}
