--!nonstrict
-- 주점 의뢰 데이터 2: 지역 이야기(역사·문화·발전·학문·발견), 전설 의뢰(낮은 확률로 자동), 수상한 손님의 뒷골목 의뢰, 주점 소문.
-- 연도·사건은 게임 설정이며 구현 전 출처 확인이 필요하다 (docs/CATALOG.md).
-- 장소: ports(항구 id 목록) / region(Regions.List id) / any=true(어디서나). from~to 연도 안에서만 나온다.
-- shady=true: 수상한 손님 의뢰 (어렵고 보상이 크다, 실패·취소하면 명성 failFame 하락)
-- legend=true: 전설 의뢰 (술을 사면 낮은 확률로 주점 주인이 먼저 건넨다)
-- grand=true: 큰 사건 (그 지역·그 연도에 항구에 들어서면 자동으로 맡는다)

local M = {}

M.LOCAL = {
	-- ===== 납품: 학문·문화·발전 =====
	{ id = "amsterdam_lens", kind = "deliver", tag = "학문", name = "렌즈 장인의 유리", ports = { "amsterdam", "rotterdam" }, from = 1650, to = 1700, good = "glass", amount = 6, coins = 780, fame = 18,
		text = "렌즈를 갈아 아주 작은 세계를 들여다보는 장인이 좋은 유리를 찾는다. 그 세계를 처음 본 사람들은 말을 잇지 못한다." },
	{ id = "london_instruments", kind = "deliver", tag = "학문", name = "학회의 실험 기구", ports = { "london" }, from = 1662, to = 1750, good = "glass", amount = 5, coins = 850, fame = 20,
		text = "왕립학회의 회원들이 공기와 빛을 재는 실험 기구를 만든다. 유리병과 렌즈가 모자란다." },
	{ id = "edinburgh_club", kind = "deliver", tag = "문화", name = "토론 클럽의 와인", ports = { "edinburgh" }, from = 1740, to = 1800, good = "wine", amount = 6, coins = 700, fame = 16,
		text = "도시의 학자와 상인이 밤마다 모여 철학과 경제를 논한다. 토론이 길어질수록 와인이 빨리 비는 법." },
	{ id = "venice_furnace", kind = "deliver", tag = "문화", name = "유리 장인의 가마 석탄", ports = { "venice" }, from = 1600, to = 1750, good = "coal", amount = 8, coins = 650, fame = 12,
		text = "섬의 유리 가마가 밤낮으로 불을 땐다. 장인들은 기술이 밖으로 새어 나가는 걸 극도로 경계한다." },
	{ id = "istanbul_coffeehouse", kind = "deliver", tag = "문화", name = "커피하우스 개점", ports = { "istanbul", "smyrna" }, from = 1600, to = 1800, good = "coffee", amount = 6, coins = 760, fame = 14,
		text = "사람들이 모여 소식과 시를 나누는 커피하우스가 새로 문을 연다. 원두가 필요하다." },
	{ id = "seville_chocolate", kind = "deliver", tag = "문화", name = "수도원의 초콜릿", ports = { "seville", "cadiz", "lisbon" }, from = 1600, to = 1750, good = "cocoa", amount = 6, coins = 820, fame = 14,
		text = "신대륙에서 온 쓴 음료에 설탕을 넣어 마시는 유행이 궁정과 수도원에 퍼진다. 카카오가 달린다." },
	{ id = "bordeaux_bottles", kind = "deliver", tag = "발전", name = "포도주 병 유리", ports = { "bordeaux", "la_rochelle" }, from = 1700, to = 1830, good = "glass", amount = 8, coins = 760, fame = 12,
		text = "포도주를 오래 두고 마시려는 문화가 퍼지면서 튼튼한 병이 많이 필요해졌다." },
	{ id = "petersburg_founding", kind = "deliver", tag = "역사", name = "늪 위의 새 수도", ports = { "st_petersburg" }, from = 1703, to = 1740, good = "timber", amount = 12, coins = 1000, fame = 24, grand = true,
		text = "발트해 늪지 위에 계획 도시가 올라간다. 말뚝과 건축 목재가 끝없이 필요하다." },
	{ id = "batavia_cloth", kind = "deliver", tag = "발전", name = "상관 도시의 직물", ports = { "batavia", "malacca" }, from = 1650, to = 1800, good = "cloth", amount = 8, coins = 720, fame = 12,
		text = "향신료 무역의 중심 도시. 물건을 사려는 현지 상인에게 내놓을 유럽산 직물이 필요하다." },
	{ id = "edo_silk", kind = "deliver", tag = "문화", name = "에도 상인의 비단", ports = { "edo", "osaka" }, from = 1650, to = 1830, good = "silk", amount = 4, coins = 900, fame = 14,
		text = "큰 도시의 상인 가문이 연극과 축제에 쓸 고운 비단을 찾는다." },
	{ id = "capetown_provision", kind = "deliver", tag = "발전", name = "희망봉 보급 기지", ports = { "cape_town" }, from = 1650, to = 1830, good = "salt", amount = 8, coins = 640, fame = 14,
		text = "긴 항해 중간에 신선한 식량을 대 주는 기지. 육포와 절임에 쓸 소금이 달린다." },
	{ id = "mocha_silver", kind = "deliver", tag = "역사", name = "커피 항구의 은", ports = { "mocha", "aden" }, from = 1600, to = 1750, good = "silver", amount = 3, coins = 1000, fame = 16,
		text = "붉은 열매를 사려는 상인들이 은을 가득 들고 모여든다. 은이 귀하다." },
	{ id = "jeddah_pilgrims", kind = "deliver", tag = "역사", name = "순례자를 위한 곡식", ports = { "jeddah" }, from = 1600, to = 1830, good = "rice", amount = 8, coins = 600, fame = 30,
		text = "순례철이면 도시가 몇 배로 붐빈다. 먹을거리가 모자라면 큰일이다. 돈보다 이름을 남기는 일." },
	{ id = "hamburg_coffee", kind = "deliver", tag = "발전", name = "한자 도시의 커피", ports = { "hamburg", "lubeck" }, from = 1680, to = 1830, good = "coffee", amount = 6, coins = 700, fame = 12,
		text = "상인 조합의 도시에도 커피하우스가 늘어난다. 거래 소식이 가장 빨리 도는 곳." },
	{ id = "genoa_bank", kind = "deliver", tag = "역사", name = "은행가의 은화", ports = { "genoa" }, from = 1600, to = 1700, good = "silver", amount = 3, coins = 950, fame = 16,
		text = "왕들에게 돈을 빌려주는 은행가들이 새 은을 모은다. 이 도시의 돈은 바다 건너까지 움직인다." },
	-- ===== 소문·선택 =====
	{ id = "alexandria_stone", kind = "event", tag = "발견", name = "검은 돌의 글자", ports = { "alexandria", "damietta" }, from = 1798, to = 1802,
		text = "군대가 요새를 고치다 세 가지 글자가 새겨진 검은 돌을 찾았다고 한다. 학자들이 몰려든다. 그림 같은 글자가 풀릴지도 모른다.",
		choices = {
			{ label = "학자에게 필사를 부탁한다 (-100)", hint = "명성 +20", cost = 100, fame = 20, text = "글자를 베낀 종이를 받아 두었다. 뒷날 풀이가 이루어졌다." },
			{ label = "소문만 해도에 적어 둔다", hint = "+60코인, 명성 +5", coins = 60, fame = 5, text = "새 소식을 적어 두었다. 학자들이 사례했다." },
		} },
	{ id = "athens_sketch", kind = "event", tag = "문화", name = "무너진 신전의 스케치", ports = { "athens", "corfu" }, from = 1750, to = 1830,
		text = "먼 나라의 화가와 건축가가 폐허 위에서 기둥을 그려 간다. 스케치를 사 가려는 이도 있다.",
		choices = {
			{ label = "스케치를 산다 (-120)", hint = "50%: 명성 +25 / 50%: 평범한 그림", cost = 120, chance = { p = 0.5, win = { coins = 0, fame = 25, text = "정밀한 기둥 도면이었다. 건축가들이 감탄했다." }, lose = { coins = 0, fame = 3, text = "그저 평범한 그림이었다." } } },
			{ label = "안내를 자청한다", hint = "+80코인", coins = 80, text = "손님을 폐허까지 안내하고 사례를 받았다." },
		} },
	{ id = "capetown_botanist", kind = "event", tag = "발견", name = "곶의 식물 채집가", ports = { "cape_town" }, from = 1650, to = 1830,
		text = "세상에 없던 꽃을 말려 가는 채집가가 있다. 표본 상자를 배에 실어 줄 사람을 찾는다.",
		choices = {
			{ label = "표본 상자를 실어 준다 (-60)", hint = "명성 +16", cost = 60, fame = 16, text = "상자는 안전하게 옮겨졌다. 도감에 이름이 한 줄 올랐다." },
			{ label = "희귀한 꽃씨를 산다 (-90)", hint = "60%: +300코인 / 40%: 시들었다", cost = 90, chance = { p = 0.6, win = { coins = 300, fame = 0, text = "정원사들이 앞다투어 샀다." }, lose = { coins = 0, fame = 0, text = "꽃씨가 싹을 틔우지 못했다." } } },
		} },
	{ id = "amsterdam_microscope", kind = "event", tag = "학문", name = "물 한 방울의 세계", ports = { "amsterdam" }, from = 1670, to = 1700,
		text = "한 포목상이 직접 간 렌즈로 물 한 방울 속의 작은 생명을 보여 준다고 소문이 났다. 믿는 이도, 놀리는 이도 있다.",
		choices = {
			{ label = "직접 들여다본다 (-30)", hint = "명성 +12", cost = 30, fame = 12, text = "꿈틀거리는 것들을 보았다. 그 이야기를 오래 하게 될 것이다." },
			{ label = "렌즈를 한 알 산다 (-100)", hint = "+150코인 상당 평판", cost = 100, coins = 150, text = "나중에 항해 도구상에게 웃돈을 받고 넘겼다." },
		} },
	{ id = "longitude_rumor", kind = "event", tag = "학문", name = "경도를 재는 시계", ports = { "london", "plymouth", "lisbon", "amsterdam" }, from = 1714, to = 1775,
		text = "바다 위에서 자기 위치를 정확히 아는 방법을 찾으면 큰 상금이 걸려 있다. 시계 장인과 천문학자가 서로 옳다고 다툰다.",
		choices = {
			{ label = "장인의 시계 시험에 배를 빌려준다 (-80)", hint = "명성 +18", cost = 80, fame = 18, text = "시험 항해에 힘을 보탰다. 항해사들 사이에서 소문이 났다." },
			{ label = "논쟁을 구경하며 소식을 모은다", hint = "명성 +4, +40코인", coins = 40, fame = 4, text = "양쪽 의견을 두루 적어 두었다." },
		} },
	{ id = "venice_carnival", kind = "event", tag = "문화", name = "가면 축제의 밤", ports = { "venice" }, from = 1700, to = 1790,
		text = "도시 전체가 가면을 쓰고 밤새 놀이를 즐긴다. 가면 뒤의 누가 누구인지 알 수 없다.",
		choices = {
			{ label = "가면을 쓰고 어울린다 (-50)", hint = "50%: 인맥 명성 +14 / 50%: 지갑이 가벼워졌다", cost = 50, chance = { p = 0.5, win = { coins = 0, fame = 14, text = "뜻밖의 귀족과 이야기가 통했다." }, lose = { coins = -40, fame = 0, text = "정신을 차리니 지갑이 가벼웠다." } } },
			{ label = "가면 장수에게 물건을 대 준다", hint = "+90코인", coins = 90, text = "가면 장식용 깃털과 천을 팔아 이문을 남겼다." },
		} },
	{ id = "canton_tea_tales", kind = "event", tag = "문화", name = "찻잎 상인의 이야기", ports = { "canton", "macau", "amoy" }, from = 1700, to = 1830,
		text = "차 상인이 산지마다 맛이 다른 이유와 찻잎을 다루는 법을 이야기한다. 마음이 맞으면 시음용을 내준다.",
		choices = {
			{ label = "시음 차를 산다 (-70)", hint = "명성 +10", cost = 70, fame = 10, text = "맛과 향의 차이를 배웠다. 다음 흥정에서 큰 도움이 될 것이다." },
			{ label = "시세 소문만 듣는다", hint = "+60코인", coins = 60, text = "차 시세와 상관의 사정을 적어 두었다." },
		} },
	{ id = "batavia_company", kind = "event", tag = "역사", name = "무역 회사의 장부 감사", ports = { "batavia", "amsterdam" }, from = 1650, to = 1799,
		text = "큰 무역 회사의 장부를 두고 말이 많다. 감사관이 증인을 찾는다.",
		choices = {
			{ label = "아는 대로 증언한다", hint = "명성 +12", fame = 12, text = "정직한 증언으로 평판이 올랐다." },
			{ label = "입을 닫는다", hint = "+80코인", coins = 80, text = "누군가 조용히 사례를 건넸다." },
		} },
	{ id = "funchal_wine_fair", kind = "event", tag = "발전", name = "섬 포도주 상인", ports = { "funchal", "las_palmas", "ponta_delgada" }, from = 1650, to = 1830,
		text = "대서양 섬의 포도주 상인이 항해 중에도 맛이 변하지 않는 술이라며 자랑한다.",
		choices = {
			{ label = "한 통 사 본다 (-110)", hint = "60%: +330코인 / 40%: 시큼해졌다", cost = 110, chance = { p = 0.6, win = { coins = 330, fame = 0, text = "먼 항구에서 비싸게 팔렸다." }, lose = { coins = 0, fame = 0, text = "너무 오래 둔 통이라 시큼해졌다." } } },
			{ label = "맛만 보고 인사한다", hint = "명성 +4", fame = 4, text = "상인이 호탕하게 웃으며 배웅했다." },
		} },
	-- ===== 지역 전투 =====
	{ id = "channel_smugglers", kind = "hunt", tag = "지역", name = "해협의 밀수선", ports = { "plymouth", "la_rochelle", "rouen", "antwerp", "dublin" }, from = 1650, to = 1830, lvOffset = 0, enemy = "밀수선",
		text = "세금을 피해 물건을 실어 나르는 배가 어두운 밤 해협을 오간다. 세관이 해결사를 찾는다.", coins = 620, fame = 14 },
	{ id = "gulf_slaver_free", kind = "hunt", tag = "지역", name = "서아프리카 해안의 약탈선", region = "w_africa", from = 1650, to = 1830, lvOffset = 1, enemy = "해안 약탈선",
		text = "해안 마을과 상선을 노리는 약탈선이 출몰한다. 항구 관리가 현상금을 건다.", coins = 760, fame = 18 },
	{ id = "indian_ocean_raider", kind = "hunt", tag = "지역", name = "인도양의 무장 상선", region = "indian", from = 1650, to = 1830, lvOffset = 1, enemy = "무장 상선",
		text = "계절풍을 타고 오가는 상선단을 노리는 무장 상선이 있다. 상인 조합이 호송을 부탁한다.", coins = 820, fame = 18 },
	{ id = "pacific_islanders_help", kind = "hunt", tag = "지역", name = "먼바다의 표류 구조", region = "pacific", from = 1700, to = 1830, lvOffset = 1, enemy = "표류선을 노리는 약탈선",
		text = "섬 사이를 오가는 작은 배를 노리는 약탈선이 나타났다. 도움을 청하는 목소리가 항구까지 닿았다.", coins = 900, fame = 28 },
}

-- 낮은 확률로 주점 주인이 먼저 건네는 전설 의뢰 (술을 샀을 때)
M.LEGEND = {
	{ id = "legend_ghost_ship", kind = "hunt", tag = "전설", legend = true, name = "안개 속의 유령선", any = true, from = 1600, to = 1830, lvOffset = 2, enemy = "유령선",
		text = "안개가 낀 새벽, 돛이 다 찢어진 배가 소리 없이 지나간다는 오래된 이야기를 주인이 낮은 목소리로 꺼낸다. 직접 확인해 볼 사람을 찾는다.", coins = 3200, fame = 70, days = 40 },
	{ id = "legend_royal_charter", kind = "deliver", tag = "전설", legend = true, name = "궁정의 은밀한 주문", any = true, from = 1600, to = 1830, good = "silver", amount = 6, coins = 3600, fame = 80, days = 40,
		text = "손님 중 한 명이 지나가며 말한다. 궁정이 비밀리에 큰 은을 찾는다고. 입이 무거운 선장만 부른다고 한다." },
	{ id = "legend_lost_map", kind = "deliver", tag = "전설", legend = true, name = "전설의 해도 필사본", any = true, from = 1600, to = 1830, good = "gems", amount = 4, coins = 3000, fame = 90, days = 40,
		text = "늙은 항해사가 평생 모은 해도를 후대에 남기고 싶어 한다. 사례로 보석을 내놓으라는 학회의 조건이 붙었다." },
}

-- 수상한 손님: 불법·음모·배신. 어렵고, 보상이 크다. 실패·취소하면 명성이 떨어진다.
M.SHADY = {
	{ id = "shady_black_ledger", kind = "deliver", tag = "음모", shady = true, name = "검은 장부 운반", any = true, from = 1600, to = 1830, good = "silver", amount = 5, coins = 2600, fame = 16, failFame = 25, days = 20,
		text = "후드를 눌러 쓴 손님이 낮게 속삭인다. '장부를 태우려는 자들이 있소. 값을 치를 테니, 은 다섯 덩이를 지정한 곳에 대시오. 이유는 묻지 마시오.'" },
	{ id = "shady_gem_cache", kind = "deliver", tag = "밀매", shady = true, name = "보석 밀매 중개", any = true, from = 1600, to = 1830, good = "gems", amount = 3, coins = 3200, fame = 14, failFame = 30, days = 20,
		text = "손님이 비단 주머니를 살짝 연다. '세금을 피해 보석이 필요한 사람들이 있소. 세 개만 구해 오면 몇 배로 쳐 주지.'" },
	{ id = "shady_wine_evidence", kind = "deliver", tag = "음모", shady = true, name = "증거가 든 술통", any = true, from = 1600, to = 1830, good = "wine", amount = 6, coins = 2200, fame = 12, failFame = 20, days = 20,
		text = "'누군가의 비밀이 술통 바닥에 들어 있소. 상자를 안 열고 지정된 항구까지 가져다 놓으면 되오.' 손님이 웃지 않는다." },
	{ id = "shady_traitor", kind = "hunt", tag = "배신", shady = true, name = "배신한 부선장을 쫓아라", any = true, from = 1600, to = 1830, lvOffset = 2, enemy = "탈주한 무장선",
		text = "'내 부선장이 금고를 털어 배를 끌고 도망쳤소. 아직 이 해역을 벗어나진 못했을 거요. 돌아오지 않아도 좋소.'", coins = 3400, fame = 20, failFame = 30, days = 20 },
	{ id = "shady_double_agent", kind = "hunt", tag = "음모", shady = true, name = "이중 간첩의 밀항선", any = true, from = 1600, to = 1830, lvOffset = 2, enemy = "간첩 밀항선",
		text = "'양쪽 나라에 정보를 파는 자가 오늘 밤 배로 빠져나가오. 어느 쪽 사람인지는 알 필요 없소. 배만 멈춰 주시오.'", coins = 3600, fame = 22, failFame = 32, days = 20 },
	{ id = "shady_boss_rival", kind = "hunt", tag = "뒷골목", shady = true, name = "뒷골목 보스의 경쟁 선단", any = true, from = 1600, to = 1830, lvOffset = 3, enemy = "경쟁 조직 호위선",
		text = "항구 뒷골목을 쥔 사내가 손가락으로 탁자를 두드린다. '우리 물건을 가로채는 선단이 있어. 가서 정리하고 오면 앞으로 이 항구에서 장사가 편할 거다.'", coins = 4800, fame = 26, failFame = 40, days = 25 },
	{ id = "shady_masked_buyer", kind = "event", tag = "미스터리", shady = true, name = "가면 쓴 구매자", any = true, from = 1600, to = 1830, failFame = 15,
		text = "얼굴을 천으로 가린 손님이 말한다. '당신 배 선창에 아무도 모르게 짐 하나만 싣고 가 주시오. 무엇인지는 묻지 마시오. 약속만 지키면 되오.'",
		choices = {
			{ label = "수락한다", hint = "55%: +2800코인 / 45%: 함정, 명성 하락", chance = { p = 0.55, win = { coins = 2800, fame = 15, text = "짐은 무사히 넘겨졌다. 손님은 말없이 돈주머니를 건넸다." }, lose = { coins = -300, fame = -25, text = "함정이었다. 짐 속에서 나온 것 때문에 항구에 나쁜 소문이 돌았다." } } },
			{ label = "거절한다", hint = "변화 없음", text = "손님은 어깨를 으쓱하고 어둠 속으로 사라졌다." },
		} },
	{ id = "shady_betrayal_letter", kind = "event", tag = "배신", shady = true, name = "봉인된 밀서", any = true, from = 1600, to = 1830, failFame = 15,
		text = "'이 밀서를 총독의 정적에게 전해 주시오. 그러면 총독이 몰락하오.' 같은 손님이 반대편에서도 같은 말을 했다는 이야기가 얼핏 들린다.",
		choices = {
			{ label = "밀서를 전한다", hint = "50%: +3000코인 / 50%: 되려 이용당함", chance = { p = 0.5, win = { coins = 3000, fame = 10, text = "일이 계획대로 풀렸다. 두둑한 사례가 도착했다." }, lose = { coins = 0, fame = -28, text = "밀서는 가짜였고, 이름만 더럽혔다." } } },
			{ label = "밀서를 태운다", hint = "명성 +4", fame = 4, text = "아무도 모르게 불에 던져 넣었다. 마음이 한결 가벼웠다." },
		} },
}

-- 주점 주인이 들려주는 소문 (지역별 · 연도 무관)
M.RUMORS = {
	europe = {
		"북해 쪽에서는 청어 철이라 항구마다 소금이 동났다고들 한다.",
		"지중해에서는 해적 소동이 잦아 보험료가 올랐다더군.",
		"어느 도시에서는 학자들이 길거리에서 별을 재 보인다는 소문이야.",
		"한자 상인들이 곡물값을 올리려고 짜고 있다는 말이 있어.",
		"먼 나라 포도주 값이 올랐다네. 좋은 술을 쌓아 둔 이는 웃고 있겠지.",
	},
	w_africa = {
		"이쪽 바다는 바람이 잦아드는 때가 있으니 식수를 넉넉히 실으라고들 해.",
		"해안 마을마다 장이 서는 날이 달라. 날짜를 맞추면 값이 후하다더군.",
		"섬 항구에서는 대서양을 건너는 배들이 마지막으로 쉬어 간다.",
	},
	new_world = {
		"카리브에서는 설탕 값이 요동친다더군. 총독 눈치를 잘 봐야 해.",
		"어느 섬에는 폭풍 뒤에 배가 한 척씩 떠밀려 온다는 소문이 있어.",
		"은 선단이 돌아올 때는 길목에 항상 나쁜 놈들이 숨어 있지.",
	},
	indian = {
		"계절풍이 돌아서는 때를 놓치면 반년을 기다려야 해. 날짜를 잘 봐.",
		"향신료 항구마다 상관이 들어서면서 값이 오르락내리락한다더군.",
		"홍해 입구에는 요즘 해적선이 부쩍 늘었어.",
	},
	far_east = {
		"차와 도자기 상관 쪽은 허가받은 상인만 드나들 수 있다더군.",
		"작은 섬 하나가 바깥 세계와 이어진 유일한 문이라는 이야기가 있어.",
		"어느 해협에서는 해적이 선단 호송료를 직접 받아 간다더군.",
	},
	pacific = {
		"별과 파도를 읽어 먼바다를 오가는 뱃사람들이 있다더군. 한번 만나 보고 싶어.",
		"이름 없는 섬이 새로 해도에 올랐다는 소문이 돈다.",
	},
}

return M
