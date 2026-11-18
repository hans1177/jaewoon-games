--!nonstrict
-- 항구 건물 계통: 초기 상인 교역에서 길드·거래소·은행으로 발전했듯, 항구 건물도 단계마다 다음 모습으로 발전한다.
-- 단계 조건: 교역소 단계(harbor), 그 해(since, 실제 역사에서 그 건물이 나타난 때), 지식(node), 시대(era)
-- 효과: sell(판매 비율 가산, 지은 항구에서), speed/cannon(지은 곳마다 합산), research(지은 항구의 연구 성과)
-- 연도와 설명은 게임 설정이며 구현 전 출처 확인이 필요하다 (docs/CATALOG.md).

local B = {}

B.Chains = {
	{ id = "trade", name = "교역 계통", summary = "시장에서 시작해 조합·길드·거래소·은행으로 커 가는 상업의 길.",
		stages = {
			{ name = "상인 조합소", cost = 800, harbor = 1, since = 1600, sell = 0.01,
				lore = "중세 한자 도시의 상인들은 위험을 나누고 값을 맞추려고 조합을 만들었다. 조합소는 창고와 회의실을 한 지붕 아래 두었다." },
			{ name = "길드 회관", cost = 2500, harbor = 2, since = 1600, node = "lang_hanse_trade", sell = 0.015,
				lore = "길드는 품질을 보증하고 외지 상인을 견제했다. 회관의 큰 홀에서 도량형과 값이 정해졌다." },
			{ name = "상품 거래소", cost = 6000, harbor = 3, since = 1600, node = "good_sugar", sell = 0.02,
				lore = "앤트워프와 암스테르담의 거래소에서는 물건을 직접 보지 않고도 견본과 어음으로 사고팔았다." },
			{ name = "은행과 증권소", cost = 12000, harbor = 4, since = 1694, node = "good_silk", sell = 0.025,
				lore = "정부와 회사의 빚이 증서가 되어 거래되는 시대. 은행은 예금과 어음을 맡고 증권소는 주식의 값을 매긴다." },
			{ name = "국제 상사 본부", cost = 25000, harbor = 5, since = 1750, era = 4, sell = 0.03,
				lore = "대륙과 대륙을 잇는 지사망이 하나의 장부로 움직인다. 본부의 한 줄 지시가 바다 건너 항구의 값을 바꾼다." },
		} },
	{ id = "ship", name = "조선·항만 계통", summary = "부두에서 건선거와 증기 조선소로 커 가는 배의 길.",
		stages = {
			{ name = "선착장", cost = 700, harbor = 1, since = 1600, speed = 0.002,
				lore = "나무 말뚝 위에 판자를 깐 간단한 부두. 물때에 맞춰 배를 대고 짐을 내렸다." },
			{ name = "조선소", cost = 2200, harbor = 2, since = 1600, node = "ship_lateen", speed = 0.003,
				lore = "경사로와 톱질 구덩이를 갖춘 조선소. 설계가 도제에게서 도제에게 이어졌다." },
			{ name = "건선거", cost = 6500, harbor = 3, since = 1660, node = "ship_dry_dock", speed = 0.004,
				lore = "물을 빼고 배를 통째로 말리는 큰 구덩이. 선체 밑바닥을 마음 놓고 고칠 수 있게 되었다." },
			{ name = "해군 공창", cost = 14000, harbor = 4, since = 1690, node = "arch_arsenal", speed = 0.005,
				lore = "베네치아 조선소에서 배운 조립식 건조. 부품을 미리 만들어 두어 군함을 빠르게 뽑아낸다." },
			{ name = "증기 조선소", cost = 30000, harbor = 5, since = 1750, node = "ship_steam_engine", era = 5, speed = 0.007,
				lore = "철판과 증기 기관. 돛 없이 달리는 배를 만드는 새 시대의 조선소." },
		} },
	{ id = "learn", name = "학문 계통", summary = "학당에서 도서관·학회·대학으로 커 가는 앎의 길.",
		stages = {
			{ name = "학당", cost = 700, harbor = 1, since = 1600, research = 0.01,
				lore = "수도원과 교회 학교의 이웃. 글을 읽고 셈을 배우는 작은 방." },
			{ name = "도서관", cost = 2400, harbor = 2, since = 1600, node = "lang_dictionary", research = 0.015,
				lore = "인쇄술이 책값을 내리자 도시마다 서고가 생겼다. 지도와 항해서가 가장 많이 읽혔다." },
			{ name = "학회 회관", cost = 6000, harbor = 3, since = 1660, node = "phi_scientific_method", research = 0.02,
				lore = "실험을 함께 보고 논문을 돌려 읽는 모임. 1660년 런던의 왕립학회가 본보기가 되었다." },
			{ name = "대학", cost = 13000, harbor = 4, since = 1660, node = "phi_enlightenment", era = 4, research = 0.03,
				lore = "강의와 연구실과 천문대를 한데 묶은 학문의 집. 학자가 학자를 길러 낸다." },
		} },
	{ id = "guard", name = "방어 계통", summary = "감시탑에서 요새와 해군 기지로 커 가는 지킴의 길.",
		stages = {
			{ name = "감시탑", cost = 800, harbor = 1, since = 1600, cannon = 0.002,
				lore = "항구 입구의 높은 탑에서 불을 피워 해적과 적선을 알렸다." },
			{ name = "포대", cost = 2600, harbor = 2, since = 1600, node = "chem_saltpeter", cannon = 0.003,
				lore = "성벽 위에 대포를 걸어 둔 포대. 화약의 질이 방어의 힘이 되었다." },
			{ name = "별 모양 요새", cost = 7000, harbor = 3, since = 1650, node = "arch_star_fort", cannon = 0.004,
				lore = "각진 보루로 포탄을 비껴내는 설계. 어느 쪽에서 쏴도 사각이 없다." },
			{ name = "해군 기지", cost = 16000, harbor = 4, since = 1700, node = "ship_dry_dock", cannon = 0.006,
				lore = "함대가 정박하고 보급과 수리를 받는 항구. 바다를 지키는 힘이 한곳에 모인다." },
		} },
	{ id = "health", name = "의료 계통", summary = "약초원에서 선원 병원·검역소·의학원으로 커 가는 돌봄의 길. 건강한 선원은 배를 빠르게 몬다.",
		stages = {
			{ name = "약초원", cost = 750, harbor = 1, since = 1600, node = "med_herb_garden", speed = 0.001,
				lore = "수도원 뜰의 약초밭에서 시작했다. 선원들은 출항 전에 약초 꾸러미를 챙겼다." },
			{ name = "선원 병원", cost = 2400, harbor = 2, since = 1600, node = "med_ship_surgeon", speed = 0.002,
				lore = "다친 선원과 병든 선원을 받는 항구 병원. 배 의사가 이곳에서 길러졌다." },
			{ name = "검역소", cost = 6200, harbor = 3, since = 1600, node = "med_surgery", speed = 0.003,
				lore = "역병이 도는 배를 먼저 격리하는 곳. 항구 도시가 병에서 스스로를 지키는 첫 제도였다." },
			{ name = "의학원", cost = 13500, harbor = 4, since = 1660, node = "med_circulation", era = 4, speed = 0.004,
				lore = "해부와 실험으로 몸의 원리를 가르치는 학교. 병을 이름 붙이고 치료법을 견주어 본다." },
		} },
	{ id = "science", name = "관측·실험 계통", summary = "관측소에서 천문대·실험실로 커 가는 과학의 길. 연구 성과가 늘어난다.",
		stages = {
			{ name = "관측소", cost = 780, harbor = 1, since = 1600, node = "ast_polaris", research = 0.008,
				lore = "지붕 위에 관측대를 얹은 작은 방. 북극성의 높이를 재어 위도를 기록했다." },
			{ name = "천문대", cost = 2500, harbor = 2, since = 1600, node = "ast_solar_eclipse", research = 0.012,
				lore = "돔 지붕과 큰 망원경을 갖춘 천문대. 일식과 월식을 예측해 달력을 바로잡았다." },
			{ name = "화학 실험실", cost = 6300, harbor = 3, since = 1600, node = "chem_distillation", research = 0.016,
				lore = "증류기와 화로를 갖춘 실험실. 염료와 약, 화약의 질을 높이는 곳이다." },
			{ name = "왕립 관측·실험소", cost = 14000, harbor = 4, since = 1675, node = "chem_oxygen", era = 4, research = 0.025,
				lore = "정밀 시계와 실험 기구를 갖춘 국가 연구소. 경도를 재는 방법도 이곳에서 다듬어졌다." },
		} },
	{ id = "print", name = "인쇄·신문 계통", summary = "인쇄 공방에서 신문사와 학술지로 커 가는 소식의 길. 소식이 빠를수록 시세를 잘 읽고 연구가 널리 퍼진다.",
		stages = {
			{ name = "인쇄 공방", cost = 760, harbor = 1, since = 1600, node = "lang_printing_press", research = 0.006, sell = 0.004,
				lore = "활자를 짜 맞춰 책과 전단을 찍는 공방. 한 번 짠 활자로 같은 글을 수백 장 찍어 낸다." },
			{ name = "서적상과 전단 가게", cost = 2300, harbor = 2, since = 1600, node = "lang_dictionary", research = 0.008, sell = 0.006,
				lore = "항구마다 해도와 항해서, 사건을 알리는 전단이 팔렸다. 글을 읽는 사람이 늘수록 소식도 빨라졌다." },
			{ name = "주간 신문사", cost = 5800, harbor = 3, since = 1605, node = "lang_translation", sell = 0.012,
				lore = "1605년 스트라스부르에서 정기 신문이 나온 뒤 유럽의 도시마다 주간 소식지가 생겼다. 시세와 배 소식이 실렸다." },
			{ name = "학술지 출판사", cost = 12500, harbor = 4, since = 1665, node = "phi_scientific_method", research = 0.02,
				lore = "1665년 런던과 파리에서 학술지가 창간되어 관찰과 실험이 정기적으로 실렸다. 논문이 나라 밖 학자에게 닿는다." },
			{ name = "일간 신문사", cost = 22000, harbor = 5, since = 1702, era = 4, sell = 0.018,
				lore = "1702년 런던에서 일간 신문이 나왔다. 매일 바뀌는 시세와 소식이 상인의 판단을 돕는다." },
		} },
}

-- 발전도(항구 레벨)에 따라 마을에 저절로 들어서는 시설. 분야별로 나뉘며, 레벨이 오르면 공사 기간을 거쳐 완공된다.
-- (순서가 곧 배치 우선순위. 자리는 항구마다 무작위로 배정된다. 등록된 실제 3D 모델만 쓴다.)
-- 도시 외형 공통 규격: 주택 필지와 개방 가능한 도시 구역은 서로 다른 값으로 확장한다.
-- 실제 인구·거래·건축 저장값은 Economy/Village가 유지하고, 이 값은 시각 구획에만 사용한다.
B.CityPlots = { plotScale = { 1.5, 1.65, 1.8, 2.0, 2.2 }, areaScale = { 1.5, 2, 3, 4.5, 6 } }
-- 왕궁 보유 도시 전용 상위 구획 배율: 일반 도시 필지에서 추가 확장, 왕궁 판정이 없는 항구에는 영향 없음.
-- 왕실 건축은 화면용이고 경제·항구 투자·건설 저장 구조는 수정하지 않는다.
B.RoyalCityPlots = { plotScale = { 1.2, 1.25, 1.3, 1.35, 1.4 }, districtScale = { 1.0, 1.08, 1.14, 1.22, 1.3 } }
-- [농촌 필지 규격] 항구와 주거지 서쪽에 독립된 대형 농장·목장 구획을 둔다.
-- 면적 확대는 화면과 향후 건축 필지 전용이다. 기존 실제 농업 생산·가축·저장·시설 수량은 변경하지 않는다.
B.RuralPlots = {
	centerX = -785, penSpacing = 280,
	pastureHalfX = 130, pastureHalfZ = 104, pigHalfX = 88, pigHalfZ = 72,
	cropOffsetX = -320, cropWidth = 320, cropDepth = 220,
	groundCenterX = -975, groundWidth = 700, fenceSegmentMax = 26,
	maxCropRowsTouch = 6, maxCropRowsDesktop = 9,
	cropColumnsTouch = 7, cropColumnsDesktop = 10,
}
-- [왕궁 실제 주민 표본] 기존 세계경제 거주자 수와 번영도로만 화면에 표시할 궁정 인원 결정.
-- 단계별 목표는 최대치일 뿐 실제 세계 인구를 추가하지 않는다. 서버 화면과 클라이언트 장면이 동일 계산 사용.
B.RoyalCourtTargets = { 2, 4, 6, 9, 12 }
function B.royalPopulation(residents, prosperity, tier)
	local target = B.RoyalCourtTargets[math.clamp(math.floor(tonumber(tier) or 1), 1, 5)]
	if type(residents) ~= "number" then return target end
	local available = math.max(0, math.floor(residents))
	if available == 0 then return 0 end
	local workers = math.min(target, math.max(1, math.floor(available / 5)))
	if available >= 2 then workers = math.max(2, workers) end
	if (prosperity or 100) < 75 then workers = math.max(1, math.floor(workers * 0.6)) end
	return math.min(available, workers)
end

-- [특산품 건축] ProductionChains 원료 분류가 사용하는 기존 건물과 승인된 실내 장비.
-- 경제 효과나 건설 조건은 이 표가 정하지 않고, PortScene은 실제 항구 생산·건물 수만 읽는다.
B.SpecialtyFacilities = {
	mineral = { building = "workshop", name = "광물 제련소", kind = "Town", asset = "workbench-anvil", tint = { 145, 133, 122 } },
	gem = { building = "market", name = "보석·해산물 상점", kind = "Cargo", asset = "gems-chest", tint = { 137, 142, 166 } },
	animal = { building = "farm", name = "목축·어물 공방", kind = "Cargo", asset = "food-barrel-fish", tint = { 164, 139, 109 } },
	farm = { building = "farm", name = "농산·향신료 작업장", kind = "Cargo", asset = "mortar-pestle", tint = { 180, 146, 96 } },
	forest = { building = "workshop", name = "벌목·목재 공방", kind = "Cargo", asset = "wood-planks-stack-small", tint = { 128, 113, 84 } },
	fiber = { building = "workshop", name = "염색·직조 공방", kind = "Cargo", asset = "textiles-stack-small", tint = { 146, 117, 151 } },
	crafted = { building = "workshop", name = "유리·도자기 공예 공방", kind = "Town", asset = "workbench-grind", tint = { 157, 155, 160 } },
	drink = { building = "workshop", name = "양조·숙성 공방", kind = "Cargo", asset = "barrel", tint = { 138, 99, 70 } },
	fishery = { building = "market", name = "어시장·생선 건조장", kind = "Cargo", asset = "food-barrel-fish", tint = { 127, 150, 162 } },
	dairy = { building = "farm", name = "치즈 숙성 공방", kind = "Cargo", asset = "cheese", tint = { 189, 166, 119 } },
}
-- [항구 단계별 실물 시각화] 이미 승인된 항만 메시의 배치 상한만 정한다.
-- 경제/저장/선박 스탯의 단계가 아니며 실제 건설된 dock/warehouse 수가 더 적으면 줄여 표시한다.
B.HarborGrowth = {
	{ name = "소형 어촌 선착장", pierLength = 0, cargo = 2, boats = 1, hoists = 0, signals = 0, porters = 1 },
	{ name = "연안 교역항", pierLength = 44, cargo = 4, boats = 3, hoists = 0, signals = 1, porters = 1 },
	{ name = "지역 상업항", pierLength = 60, cargo = 6, boats = 4, hoists = 1, signals = 2, porters = 2 },
	{ name = "대형 무역항", pierLength = 76, cargo = 8, boats = 6, hoists = 2, signals = 3, porters = 3 },
	{ name = "국제 무역항", pierLength = 92, cargo = 10, boats = 8, hoists = 3, signals = 4, porters = 3 },
}
function B.harborVisual(level, buildings)
	local cityTier = math.clamp(math.floor(tonumber(level) or 1), 1, 5)
	local dock = if buildings then math.max(0, tonumber(buildings.dock) or 0) else nil
	local warehouse = if buildings then math.max(0, tonumber(buildings.warehouse) or 0) else nil
	-- 도시 발전이 5단계여도 실제 부두 투자가 0이면 소형 항구로 남는다.
	-- 경제 저장값은 읽기만 하고, 항만 단계별 외형은 기존 건설 실적을 넘지 않는다.
	local builtTier = if dock == nil then cityTier elseif dock >= 8 then 5 elseif dock >= 4 then 4
		elseif dock >= 2 then 3 elseif dock >= 1 then 2 else 1
	local tier = math.min(cityTier, builtTier)
	local plan = B.HarborGrowth[tier]
	local sidePier = plan.pierLength > 0
	local boats = math.min(plan.boats, if dock ~= nil then 1 + math.floor(math.sqrt(dock) * 1.8) else plan.boats)
	local cargo = math.min(plan.cargo, if warehouse ~= nil then 2 + math.floor(math.sqrt(warehouse) * 2) else plan.cargo)
	local hoists = if not sidePier then 0 else math.min(plan.hoists,
		if dock ~= nil then math.floor((dock + 2) / 3) else plan.hoists)
	local signals = if not sidePier then 0 else math.min(plan.signals, math.max(1, boats))
	return {
		tier = tier, cityTier = cityTier, name = plan.name, sidePier = sidePier,
		pierLength = if sidePier then plan.pierLength else 0,
		boats = math.max(1, boats), cargo = math.max(2, cargo), hoists = hoists,
		signals = signals, porters = plan.porters,
	}
end

-- [항만 필지] 모든 항구가 동일 좌표 체계를 사용한다. 중심/반폭은 장면 표시만 바꾸며 저장·토지 매입을 추가하지 않는다.
-- 접안/조선은 기존 시설 원위치, 어항/원자재/경비 필지는 공용 해안도로 밖 독립된 구역이다.
B.HarborPlotBounds = {
	quay = { label = "접안·출항 구역", x = 49, z = 0, halfX = 36, halfZ = 16 },
	shipyard = { label = "조선·수리 구역", x = 6, z = -79, halfX = 38, halfZ = 38 },
	fishery = { label = "어업·건조 구역", x = -2, z = 128, halfX = 18, halfZ = 22 },
	freight = { label = "원자재·창고 구역", x = -2, z = 209, halfX = 18, halfZ = 22 },
	defense = { label = "해안 경비 구역", x = -2, z = 169, halfX = 18, halfZ = 20 },
}

-- 도로 표면은 PortScene의 기존 roadMat/roadColor가 유지하고 가로등·광장 장식만 단계별로 늘린다.
B.StreetGrowth = {
	{ lampStep = 0, plazaLamps = 0, fountain = false },
	{ lampStep = 50, plazaLamps = 4, fountain = true },
	{ lampStep = 36, plazaLamps = 6, fountain = true },
	{ lampStep = 25, plazaLamps = 8, fountain = true },
	{ lampStep = 19, plazaLamps = 10, fountain = true },
}

-- [경제 기반 자동 장식 건축] 기존 시가지 발전도와 실물경제의 건설된 시설 수만 읽는다.
-- 새 장식 투자/재고/저장키는 생성하지 않으며, 경제 침체 시 최상급 장식만 보류한다.
function B.decorativeVisual(level, buildings, prosperity)
	local stage = math.clamp(math.floor(tonumber(level) or 1), 1, 5)
	local healthy = (tonumber(prosperity) or 100) >= 90
	local function grade(id, unlock)
		if stage < unlock then return 0 end
		local count = if buildings then math.max(0, tonumber(buildings[id]) or 0) else stage * 2
		if count < 1 then return 0 end
		local tier = 1
		if stage >= 3 and count >= 3 then tier = 2 end
		if stage >= 4 and count >= 6 then tier = 3 end
		if stage >= 5 and count >= 12 and healthy then tier = 4 end
		return tier
	end
	return {
		market = grade("market", 2),
		religious = grade("church", 2),
		farm = grade("farm", 2),
		civic = grade("hall", 3),
		industry = grade("workshop", 2),
		residential = grade("house", 2),
		harbor = grade("warehouse", 2),
	}
end

B.CategoryNames = { culture = "문화", commerce = "상업·금융", science = "과학", industry = "산업·기술", religion = "종교" }
B.Landmarks = {
	{ id = "theater", name = "야외 극장", category = "culture", minLevel = 2, since = 1600 },
	{ id = "exchange", name = "증권거래소", category = "commerce", minLevel = 3, since = 1605, tech = "guild_accounting", tab = "trade" },
	{ id = "museum", name = "박물관", category = "culture", minLevel = 3, since = 1683, tech = "public_schools", tab = "codex" },
	{ id = "botanic", name = "식물원", category = "science", minLevel = 4, since = 1600, tech = "crop_rotation" },
	{ id = "observatory", name = "천문대", category = "science", minLevel = 4, since = 1675, tech = "navigation_charts", tab = "tech" },
	{ id = "academy", name = "학술원", category = "science", minLevel = 4, since = 1660, tech = "public_schools", tab = "tech" },
	{ id = "zoo", name = "왕립 동물원", category = "culture", minLevel = 5, since = 1750, tech = "public_schools" },
	{ id = "ironworks", name = "제철소·증기 공방", category = "industry", minLevel = 5, since = 1750, tech = "industrial_metallurgy" },
}

B.ById = {}
for _, c in B.Chains do
	B.ById[c.id] = c
end

-- [가축 실물 규격·품종 팔레트] 항구 목장/왕궁 말/탐험 야생동물이 공유하는 시각 정본.
-- size는 세 축 중 최대 실측 길이(스터드). 실제 사육 수·경제·전투·저장에는 전혀 영향이 없다.
-- 신규 에셋을 만들지 않고 이미 승인된 Animals 메시의 비무늬 영역만 자연색으로 보정한다.
-- [공통 설정·타입 검사] 원래 RGB 3채널을 보관하고 실제 장면에서만 Color3로 변환한다.
B.AnimalVisual = {
	horse = { size = 8.8, coats = { { 132, 78, 45 }, { 63, 48, 39 },
		{ 49, 46, 45 }, { 195, 185, 169 }, { 172, 131, 79 } } },
	cow = { size = 7.3, coats = { { 155, 108, 72 }, { 79, 68, 60 },
		{ 218, 205, 183 }, { 184, 129, 87 } } },
	donkey = { size = 6.5, coats = { { 126, 116, 100 }, { 110, 88, 72 },
		{ 170, 151, 120 } } },
	llama = { size = 7.0, coats = { { 218, 193, 151 }, { 156, 117, 87 },
		{ 231, 219, 197 } } },
	sheep = { size = 3.8, coats = { { 235, 228, 207 }, { 177, 168, 151 },
		{ 112, 99, 86 } } },
	pig = { size = 4.1, coats = { { 222, 156, 148 }, { 179, 126, 107 },
		{ 91, 79, 75 } } },
	elephant = { size = 13.5, coats = { { 126, 121, 115 }, { 109, 114, 114 } } },
	["dog-pug"] = { size = 2.6, coats = { { 174, 136, 96 }, { 125, 100, 80 } } },
	cat = { size = 1.8, coats = { { 96, 91, 88 }, { 168, 132, 91 },
		{ 215, 203, 181 } } },
	chicken = { size = 1.55, coats = { { 231, 223, 202 }, { 165, 109, 71 },
		{ 74, 69, 65 } } },
}

return B
