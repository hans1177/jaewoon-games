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
}

local ById: { [string]: Event } = {}
for _, e in Events do
	ById[e.id] = e
end

return {
	Events = Events,
	ById = ById,
}
