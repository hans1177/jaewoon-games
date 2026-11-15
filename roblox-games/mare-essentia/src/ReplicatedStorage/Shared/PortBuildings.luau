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
}

-- 발전도(항구 레벨)에 따라 마을에 저절로 들어서는 시설. 분야별로 나뉘며, 레벨이 오르면 공사 기간을 거쳐 완공된다.
-- (순서가 곧 배치 우선순위. 자리는 항구마다 무작위로 배정된다. 등록된 실제 3D 모델만 쓴다.)
B.CategoryNames = { culture = "문화", commerce = "상업·금융", science = "과학", industry = "산업·기술", religion = "종교" }
B.Landmarks = {
	{ id = "theater", name = "야외 극장", category = "culture", minLevel = 2 },
	{ id = "exchange", name = "증권거래소", category = "commerce", minLevel = 3, tab = "trade" },
	{ id = "museum", name = "박물관", category = "culture", minLevel = 3, tab = "codex" },
	{ id = "botanic", name = "식물원", category = "science", minLevel = 4 },
	{ id = "observatory", name = "천문대", category = "science", minLevel = 4, tab = "tech" },
	{ id = "academy", name = "학술원", category = "science", minLevel = 4, tab = "tech" },
	{ id = "zoo", name = "왕립 동물원", category = "culture", minLevel = 5 },
	{ id = "ironworks", name = "제철소·증기 공방", category = "industry", minLevel = 5 },
}

B.ById = {}
for _, c in B.Chains do
	B.ById[c.id] = c
end

return B
