--!nonstrict
-- 시대의 분기점: 실제 역사 사건이 그 해에 닥친다. 사건마다 선택지가 있고, 선택에 따라 코인·명성·도감 카드·지역 시세가 달라진다.
-- 게임 시작 연도(1650/1700/1750) 이후 사건만 일어난다. 연도와 월은 게임 설정이며 구현 전 출처 확인이 필요하다 (docs/CATALOG.md).
-- 선택지 효과: coins(+/-), fame(+/-), cards{카드 id}, price{ goods, mult, days, regions }, chance{ p, win{...}, lose{...} }
-- 지역(regions): europe, w_africa, new_world, indian, far_east, pacific (Regions.List 의 id)

local E = {}

local function price(goods, mult, days, regions)
	return { goods = goods, mult = mult, days = days, regions = regions }
end

E.Events = {
	{ id = "navigation_acts", year = 1651, month = 10, title = "항해 조례", tag = "정치·무역",
		text = "잉글랜드 의회가 자국 배만 식민지 물건을 실어 나를 수 있다는 항해 조례를 통과시켰다. 네덜란드 중개 상인들이 술렁인다.",
		choices = {
			{ label = "조례를 따른다", hint = "명성 +10, 설탕·담배 값이 오른다", fame = 10, price = price({ "sugar", "tobacco" }, 1.1, 60, { "europe", "new_world" }) },
			{ label = "밀무역으로 돌파", hint = "+300코인", coins = 300 },
		} },
	{ id = "anglo_dutch_war", year = 1652, month = 7, title = "제1차 영란 전쟁", tag = "전쟁",
		text = "해상 패권을 두고 잉글랜드와 네덜란드의 함대가 맞붙었다. 북해와 영국 해협의 항로가 위험해진다.",
		choices = {
			{ label = "사략 면허를 받는다", hint = "+400코인", coins = 400 },
			{ label = "중립 교역을 이어 간다", hint = "모직·옷감 값이 오른다", price = price({ "wool", "cloth" }, 1.15, 50, { "europe" }) },
		} },
	{ id = "cape_colony", year = 1652, month = 4, title = "케이프 식민지 건설", tag = "탐험·식민",
		text = "네덜란드 동인도회사가 희망봉 아래에 보급 기지를 세운다. 인도양으로 가는 길목에 신선한 물과 채소가 생긴다.",
		choices = {
			{ label = "보급 계약을 맺는다", hint = "희망봉 지식 획득, +200코인", cards = { "geo_cape_good_hope" }, coins = 200 },
			{ label = "지켜본다", hint = "명성 +5", fame = 5 },
		} },
	{ id = "restoration", year = 1660, month = 5, title = "영국 왕정복고와 왕립학회", tag = "정치·학문",
		text = "찰스 2세가 돌아와 왕정이 복고된다. 같은 해 런던에서는 실험을 중시하는 학자들이 모여 왕립학회의 첫걸음을 뗀다.",
		choices = {
			{ label = "왕실에 헌금한다", hint = "-300코인, 명성 +25", coins = -300, fame = 25 },
			{ label = "학회를 후원한다", hint = "-200코인, 학회 후원 증서 획득", coins = -200, fame = 15, cards = { "relic_royal_charter" } },
		} },
	{ id = "colbert", year = 1661, month = 3, title = "루이 14세의 친정과 콜베르", tag = "정치·왕정",
		text = "태양왕이 직접 나라를 다스리고, 재무총감 콜베르가 공장과 해군을 키우는 중상주의 정책을 펼친다.",
		choices = {
			{ label = "프랑스 공방과 손잡는다", hint = "비단·도자기 값이 내린다", price = price({ "silk", "porcelain" }, 0.9, 80, { "europe" }) },
			{ label = "독립 상사를 지킨다", hint = "+250코인", coins = 250 },
		} },
	{ id = "great_plague", year = 1665, month = 7, title = "런던 대역병", tag = "재난·의학",
		text = "역병이 런던을 휩쓸어 항구가 한적해진다. 약재 값이 치솟고 검역 이야기가 오간다.",
		choices = {
			{ label = "방역 물자를 기부한다", hint = "-300코인, 검역 지식 획득", coins = -300, fame = 20, cards = { "med_plague_quarantine" } },
			{ label = "약재를 실어 나른다", hint = "장뇌·인삼 값이 크게 오른다", price = price({ "camphor", "ginseng" }, 1.3, 50, { "europe" }) },
		} },
	{ id = "great_fire", year = 1666, month = 9, title = "런던 대화재", tag = "재난·건축",
		text = "사흘 밤낮 번진 불이 런던의 옛 시가지를 삼켰다. 크리스토퍼 렌 같은 건축가들이 돌과 돔으로 새 도시를 그리기 시작한다.",
		choices = {
			{ label = "재건 기금을 낸다", hint = "-400코인, 바로크 건축 지식 획득", coins = -400, fame = 30, cards = { "arch_baroque" } },
			{ label = "목재를 실어 나른다", hint = "+200코인, 목재 값이 오른다", coins = 200, price = price({ "timber" }, 1.3, 60, { "europe" }) },
		} },
	{ id = "vienna", year = 1683, month = 9, title = "빈 포위전과 커피하우스", tag = "전쟁·문화",
		text = "오스만의 빈 포위가 풀리고, 남겨진 커피콩이 유럽에 퍼진다. 도시마다 커피하우스에서 학자와 상인이 토론한다.",
		choices = {
			{ label = "커피를 들여온다", hint = "커피 지식 획득, 커피 값이 내린다", cards = { "good_coffee" }, price = price({ "coffee" }, 0.8, 90, { "europe" }) },
			{ label = "커피하우스에서 정보를 산다", hint = "+200코인, 명성 +10", coins = 200, fame = 10 },
		} },
	{ id = "qing_maritime", year = 1684, month = 1, title = "청의 해금 완화", tag = "정치·무역",
		text = "청나라가 바다를 막았던 해금을 풀고 항구를 연다. 차와 비단, 도자기가 더 많이 쏟아져 나온다.",
		choices = {
			{ label = "첫 배를 보낸다", hint = "차·비단·도자기 값이 내린다", price = price({ "tea", "silk", "porcelain" }, 0.85, 90, { "far_east", "indian" }) },
			{ label = "독점 상인과 계약한다", hint = "+300코인", coins = 300 },
		} },
	{ id = "fontainebleau", year = 1685, month = 10, title = "낭트 칙령 폐지와 위그노 망명", tag = "종교·정치",
		text = "프랑스 왕이 신교도의 자유를 인정한 칙령을 거두자 위그노 장인들이 비단·시계·유리 기술을 안고 국경을 넘는다.",
		choices = {
			{ label = "위그노 장인을 받아들인다", hint = "-200코인, 비단 지식 획득", coins = -200, fame = 20, cards = { "good_silk" } },
			{ label = "항의 서한을 보낸다", hint = "명성 +5", fame = 5 },
		} },
	{ id = "principia", year = 1687, month = 7, title = "프린키피아 출간", tag = "학문",
		text = "뉴턴이 만유인력과 운동 법칙을 담은 책을 펴낸다. 하늘과 땅의 법칙이 하나로 이어진다는 생각이 퍼진다.",
		choices = {
			{ label = "책을 구해 읽는다", hint = "-100코인, 중력 지식 획득", coins = -100, fame = 15, cards = { "phy_gravity" } },
			{ label = "관측 자료를 학회에 보낸다", hint = "명성 +20", fame = 20 },
		} },
	{ id = "glorious_revolution", year = 1688, month = 11, title = "명예혁명", tag = "정치·왕정",
		text = "의회가 왕을 바꾸고 권리 장전으로 왕권을 묶는다. 왕이 아닌 의회와 상인이 나라를 움직이는 시대가 열린다.",
		choices = {
			{ label = "새 정부와 계약한다", hint = "+300코인", coins = 300 },
			{ label = "중립을 지킨다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "brazil_gold", year = 1693, month = 6, title = "브라질 금광 발견", tag = "탐험·경제",
		text = "미나스 제라이스의 강바닥에서 금이 쏟아져 나온다. 포르투갈로 향하는 금이 늘어 금값이 흔들린다.",
		choices = {
			{ label = "금을 사 모은다", hint = "금 값이 내린다", price = price({ "gold" }, 0.8, 80, { "new_world", "europe" }) },
			{ label = "광부 보급품을 판다", hint = "+300코인", coins = 300 },
		} },
	{ id = "bank_of_england", year = 1694, month = 7, title = "영란은행 설립", tag = "정치·경제",
		text = "전쟁 비용을 대려는 정부가 상인들의 출자로 은행을 세운다. 국채와 어음의 시대가 열린다.",
		choices = {
			{ label = "출자한다", hint = "-500코인, 배당 +700코인, 명성 +25", coins = 200, fame = 25 },
			{ label = "현금을 쥐고 있는다", hint = "명성 +5", fame = 5 },
		} },
	{ id = "peters_embassy", year = 1697, month = 8, title = "표트르 대제의 대사절단", tag = "정치·왕정",
		text = "러시아 황제가 신분을 숨기고 암스테르담과 런던의 조선소에서 직접 망치를 든다. 먼 북쪽 나라가 바다로 눈을 돌린다.",
		choices = {
			{ label = "조선 기술을 안내한다", hint = "+300코인, 플루트선 설계 지식 획득", coins = 300, fame = 20, cards = { "ship_fluyt_design" } },
			{ label = "러시아 모피를 사 둔다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "zanzibar", year = 1698, month = 12, title = "오만의 잔지바르 장악", tag = "정치·식민",
		text = "오만의 술탄이 동아프리카 해안의 포르투갈 거점을 밀어내고 잔지바르를 차지한다. 정향 재배가 번창한다.",
		choices = {
			{ label = "오만 상인과 거래한다", hint = "정향 값이 내린다", price = price({ "cloves" }, 0.8, 90, { "indian", "w_africa" }) },
			{ label = "유럽 거점을 지킨다", hint = "+200코인", coins = 200 },
		} },
	{ id = "act_of_union", year = 1707, month = 5, title = "잉글랜드와 스코틀랜드의 합병", tag = "정치·왕정",
		text = "두 왕국이 하나의 그레이트브리튼이 된다. 스코틀랜드 상인에게도 식민지 교역의 문이 열린다.",
		choices = {
			{ label = "교역망을 넓힌다", hint = "양모 값이 내린다", price = price({ "wool" }, 0.9, 70, { "europe" }) },
			{ label = "지켜본다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "utrecht", year = 1713, month = 4, title = "위트레흐트 조약", tag = "정치·전쟁",
		text = "스페인 계승 전쟁이 끝나고 유럽의 세력 균형이 다시 그려진다. 노예 무역과 식민지 교역 특허가 영국으로 넘어간다.",
		choices = {
			{ label = "새 특허 상인과 손잡는다", hint = "+300코인, 설탕 값이 오른다", coins = 300, price = price({ "sugar" }, 1.2, 70, { "new_world" }) },
			{ label = "평화 교역에 집중한다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "south_sea", year = 1720, month = 9, title = "남해 회사 거품", tag = "경제",
		text = "남해 회사 주식이 하늘 모르고 치솟다 한꺼번에 무너진다. 런던과 파리의 투자자들이 파산한다.",
		choices = {
			{ label = "주식에 투자한다 (500코인)", hint = "절반의 확률로 큰 수익, 아니면 손실", coins = -500, chance = { p = 0.5, win = { coins = 1700, fame = 15 }, lose = { fame = -5 } } },
			{ label = "관망한다", hint = "명성 +5", fame = 5 },
		} },
	{ id = "dutch_learning", year = 1720, month = 3, title = "일본의 서양서 수입 완화", tag = "정치·학문",
		text = "도쿠가와 요시무네가 네덜란드 책의 수입 금지를 풀어 서양 학문이 나가사키 데지마를 통해 스며든다.",
		choices = {
			{ label = "서적을 구해 간다", hint = "-150코인, 번역서 지식 획득", coins = -150, fame = 10, cards = { "lang_translation" } },
			{ label = "도자기를 사 간다", hint = "도자기 값이 내린다", price = price({ "porcelain" }, 0.9, 70, { "far_east" }) },
		} },
	{ id = "lisbon_quake", year = 1755, month = 11, title = "리스본 대지진", tag = "재난",
		text = "만성절 아침 큰 지진과 해일이 리스본을 무너뜨린다. 도시는 격자 모양의 새 거리로 다시 세워진다.",
		choices = {
			{ label = "구호 물자를 보낸다", hint = "-400코인, 명성 +30", coins = -400, fame = 30 },
			{ label = "건축 자재를 실어 나른다", hint = "목재·대리석 값이 오른다", price = price({ "timber", "marble" }, 1.4, 70, { "europe" }) },
		} },
	{ id = "seven_years_war", year = 1756, month = 5, title = "7년 전쟁", tag = "전쟁",
		text = "유럽에서 인도와 북아메리카까지, 세계 곳곳에서 영국과 프랑스가 맞붙는다. 바다는 사략선과 호송 함대로 가득하다.",
		choices = {
			{ label = "사략 면허를 받는다", hint = "+500코인", coins = 500 },
			{ label = "중립 교역을 이어 간다", hint = "설탕·담배 값이 오른다", price = price({ "sugar", "tobacco" }, 1.2, 70, { "new_world", "indian" }) },
		} },
	{ id = "plassey", year = 1757, month = 6, title = "플라시 전투", tag = "정치·식민",
		text = "벵골에서 영국 동인도회사가 지방 태수의 군대를 꺾는다. 인도의 직물과 향료 무역이 회사의 손에 들어간다.",
		choices = {
			{ label = "회사와 계약한다", hint = "+400코인", coins = 400 },
			{ label = "현지 상인을 돕는다", hint = "명성 +15, 비단 값이 내린다", fame = 15, price = price({ "silk" }, 0.9, 70, { "indian" }) },
		} },
	{ id = "industrial_start", year = 1760, month = 4, title = "산업 혁명의 시작", tag = "경제·기술",
		text = "영국의 탄광과 방직 공장에서 증기와 기계가 일손을 대신한다. 석탄과 철이 모자랄 정도로 팔린다.",
		choices = {
			{ label = "광산에 투자한다", hint = "-400코인, 석탄·철 값이 내린다", coins = -400, fame = 15, price = price({ "coal", "iron" }, 0.85, 90, { "europe" }) },
			{ label = "공장에 석탄을 판다", hint = "+300코인", coins = 300 },
		} },
	{ id = "cook_voyage", year = 1768, month = 8, title = "쿡의 첫 항해와 뱅크스", tag = "탐험·학문",
		text = "쿡 선장이 금성 관측과 남태평양 탐사에 나선다. 식물학자 뱅크스는 낯선 식물을 한 아름 싣고 돌아온다.",
		choices = {
			{ label = "채집 기록을 사들인다", hint = "-300코인, 남태평양 식물 지식 획득", coins = -300, fame = 25, cards = { "bot_pacific_plants" } },
			{ label = "항해 후원 기금을 낸다", hint = "명성 +20", fame = 20 },
		} },
	{ id = "boston_tea", year = 1773, month = 12, title = "보스턴 차 사건", tag = "정치·식민",
		text = "식민지 사람들이 동인도회사의 차 상자를 바다에 던진다. 신대륙의 차 시장이 크게 흔들린다.",
		choices = {
			{ label = "밀수 차를 실어 나른다", hint = "+200코인, 차 값이 오른다", coins = 200, price = price({ "tea" }, 1.3, 60, { "new_world" }) },
			{ label = "공식 교역을 지킨다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "independence", year = 1776, month = 7, title = "미국 독립 선언", tag = "정치·혁명",
		text = "열세 식민지가 왕의 통치를 거부하고 독립을 선언한다. 새로운 나라가 바다 건너 교역에 뛰어든다.",
		choices = {
			{ label = "신생국과 교역한다", hint = "+300코인, 담배·면화 값이 내린다", coins = 300, price = price({ "tobacco", "cotton" }, 0.9, 80, { "new_world" }) },
			{ label = "왕실 편에 선다", hint = "명성 +15", fame = 15 },
		} },
	{ id = "french_revolution", year = 1789, month = 7, title = "프랑스 혁명", tag = "정치·혁명",
		text = "바스티유가 무너지고 왕정이 흔들린다. 귀족은 망명하고 새 정부는 낡은 특권과 길드를 없앤다.",
		choices = {
			{ label = "망명 귀족을 실어 나른다", hint = "+500코인", coins = 500 },
			{ label = "혁명 정부와 교역한다", hint = "포도주 값이 내린다", price = price({ "wine" }, 0.85, 80, { "europe" }) },
		} },
}

E.ById = {}
for _, e in E.Events do
	E.ById[e.id] = e
end

-- 지식 활용 선택지: 그 지식을 이해하고 있으면 사건에서 더 좋은 길이 하나 더 열린다. (학문 → 사건 → 교역품·도감의 인과)
-- node: 필요한 지식(도감 카드 id, KnowledgeTree 노드)
local I = {
	navigation_acts = { node = "good_sugar", label = "설탕 정제 지식으로 정제 상인과 계약", hint = "+400코인, 설탕 값이 내린다", coins = 400, price = price({ "sugar" }, 0.9, 70, { "europe", "new_world" }) },
	anglo_dutch_war = { node = "ship_fluyt_design", label = "플루트선으로 호송 없이 돌파", hint = "+600코인", coins = 600 },
	cape_colony = { node = "med_lime_scurvy", label = "라임과 채소를 비축해 장기 항해에 나선다", hint = "+300코인, 명성 +20, 계절풍 지식 획득", coins = 300, fame = 20, cards = { "geo_monsoon" } },
	restoration = { node = "phi_scientific_method", label = "학회에 실험 보고서를 낸다", hint = "명성 +40, 공기 펌프 지식 획득", fame = 40, cards = { "che_air_pump" } },
	colbert = { node = "good_silk", label = "비단 공방과 합작한다", hint = "+500코인, 비단 값이 내린다", coins = 500, price = price({ "silk" }, 0.85, 80, { "europe" }) },
	great_plague = { node = "med_anatomy", label = "의사를 배에 태워 방역을 돕는다", hint = "+200코인, 명성 +35, 기나나무 약재 지식 획득", coins = 200, fame = 35, cards = { "med_cinchona" } },
	great_fire = { node = "arch_cathedral", label = "건축 지식으로 재건 설계를 자문한다", hint = "+500코인, 명성 +30", coins = 500, fame = 30 },
	vienna = { node = "lang_lingua_franca", label = "공용어로 오스만 상인과 직거래한다", hint = "+400코인, 커피 값이 크게 내린다", coins = 400, price = price({ "coffee" }, 0.75, 90, { "europe" }) },
	qing_maritime = { node = "nav_mercator", label = "정확한 해도로 새 항로를 연다", hint = "+300코인, 차 값이 크게 내린다", coins = 300, price = price({ "tea" }, 0.8, 90, { "far_east", "indian" }) },
	fontainebleau = { node = "chem_glass", label = "유리 기술자를 데려온다", hint = "-100코인, 명성 +20, 유리 값이 내린다", coins = -100, fame = 20, price = price({ "glass" }, 0.85, 80, { "europe" }) },
	principia = { node = "phy_pendulum", label = "진자 실험 기록을 학회에 보태 준다", hint = "+200코인, 명성 +30", coins = 200, fame = 30 },
	glorious_revolution = { node = "phi_social_contract", label = "사회 계약 이론으로 새 정부를 지지한다", hint = "명성 +40", fame = 40 },
	brazil_gold = { node = "geo_trade_winds", label = "무역풍 항로로 금 운송 계약을 맺는다", hint = "+500코인", coins = 500 },
	bank_of_england = { node = "good_sugar", label = "상업 지식으로 어음 거래에 나선다", hint = "+500코인, 명성 +20", coins = 500, fame = 20 },
	peters_embassy = { node = "ship_dry_dock", label = "건선거 설계를 전수한다", hint = "+600코인, 명성 +30", coins = 600, fame = 30 },
	zanzibar = { node = "bot_clove_tree", label = "정향 재배 지식을 나눈다", hint = "+300코인, 정향 값이 크게 내린다", coins = 300, price = price({ "cloves" }, 0.7, 90, { "indian", "w_africa" }) },
	act_of_union = { node = "lang_hanse_trade", label = "한자 상업어 인맥으로 스코틀랜드 상인과 잇는다", hint = "+250코인, 양모 값이 내린다", coins = 250, price = price({ "wool" }, 0.85, 70, { "europe" }) },
	utrecht = { node = "geo_cape_good_hope", label = "항로 지식으로 특허 선단에 합류한다", hint = "+400코인", coins = 400 },
	south_sea = { node = "phi_skepticism", label = "의심하며 장부를 따져 폭락 뒤 헐값에 사들인다", hint = "+300코인, 명성 +20 (잃을 위험 없음)", coins = 300, fame = 20 },
	dutch_learning = { node = "lang_dictionary", label = "사전을 끼고 번역서를 직접 읽는다", hint = "명성 +20, 렌즈 연마 지식 획득", fame = 20, cards = { "phy_lens_grinding" } },
	lisbon_quake = { node = "arch_dome", label = "내진 설계를 조언한다", hint = "+300코인, 명성 +30, 대리석 값이 오른다", coins = 300, fame = 30, price = price({ "marble" }, 1.3, 70, { "europe" }) },
	seven_years_war = { node = "nav_backstaff", label = "정확한 항법으로 봉쇄를 뚫는다", hint = "+700코인", coins = 700 },
	plassey = { node = "geo_monsoon", label = "계절풍 달력으로 선단에 합류한다", hint = "+500코인", coins = 500 },
	industrial_start = { node = "phy_newcomen_engine", label = "증기 기관 광산에 출자한다", hint = "-200코인, 명성 +30, 석탄·철 값이 크게 내린다", coins = -200, fame = 30, price = price({ "coal", "iron" }, 0.75, 90, { "europe" }) },
	cook_voyage = { node = "ast_jupiter_moons", label = "경도 관측 계산에 참여한다", hint = "명성 +40, 금성 관측 지식 획득", fame = 40, cards = { "ast_venus" } },
	boston_tea = { node = "good_tea", label = "차 유통 지식으로 밀수 차를 크게 푼다", hint = "+400코인", coins = 400 },
	independence = { node = "phi_enlightenment", label = "계몽 사상으로 신생국을 지지한다", hint = "+200코인, 명성 +50", coins = 200, fame = 50 },
	french_revolution = { node = "phi_natural_law", label = "인권 선언의 논의를 지켜보고 중재한다", hint = "+300코인, 명성 +20", coins = 300, fame = 20 },
}
for id, ins in I do
	E.ById[id].insight = ins
end

-- 사건과 얽힌 실존 인물 (Scholars 의 id). 그 인물을 만난 적이 있으면 지식 활용 선택의 보상이 커진다. (인물 → 사건 → 학문·교역품의 인과)
local P = {
	anglo_dutch_war = { "witsen" }, cape_colony = { "blaeu" }, restoration = { "boyle", "wren" }, colbert = { "huygens" },
	great_plague = { "newton" }, great_fire = { "wren" }, principia = { "newton", "halley" }, glorious_revolution = { "newton" },
	bank_of_england = { "newton" }, peters_embassy = { "witsen" }, fontainebleau = { "papin" }, south_sea = { "newton" },
	industrial_start = { "newcomen", "savery" }, cook_voyage = { "banks" }, boston_tea = { "franklin" }, independence = { "franklin" },
}
for id, list in P do
	E.ById[id].people = list
end

-- 사건이 일어나는 게임 일수 (startYear 기준)
function E.dayOf(ev, startYear)
	return (ev.year - startYear) * 365 + ((ev.month or 6) - 1) * 30
end

return E
