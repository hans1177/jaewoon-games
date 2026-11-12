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
	{ id = "reformation_95", year = 1517, month = 10, title = "95개조 반박문", tag = "정치·종교",
		text = "비텐베르크 성당 문에 면죄부를 비판하는 글이 붙는다. 인쇄기가 글을 사방으로 퍼뜨리고 유럽의 신앙과 정치가 갈라지기 시작한다.",
		choices = {
			{ label = "인쇄소에 투자한다", hint = "-200코인, 명성 +25", coins = -200, fame = 25 },
			{ label = "전쟁 물자를 미리 사 둔다", hint = "+200코인", coins = 200 },
		} },
	{ id = "magellan_circum", year = 1519, month = 9, title = "마젤란 선단의 세계 일주 출항", tag = "탐험",
		text = "다섯 척의 선단이 세비야를 떠나 서쪽으로 향한다. 이 항해는 지구가 둥글고 바다가 이어져 있음을 증명하게 된다.",
		choices = {
			{ label = "보급품을 대어 준다", hint = "-150코인, 명성 +25, 정향 값이 내린다", coins = -150, fame = 25, price = price({ "cloves", "nutmeg" }, 0.9, 80, { "europe", "indian" }) },
			{ label = "소식만 전한다", hint = "+150코인", coins = 150 },
		} },
	{ id = "tenochtitlan", year = 1521, month = 8, title = "테노치티틀란 함락", tag = "정치·전쟁",
		text = "호수 위의 도시가 스페인 연합군에게 무너진다. 신대륙의 산물이 유럽과 처음으로 크게 이어진다.",
		choices = {
			{ label = "신대륙 물산을 사들인다", hint = "-200코인, 은 값이 내린다", coins = -200, price = price({ "silver" }, 0.92, 70, { "new_world", "europe" }) },
			{ label = "관망한다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "copernicus_heliocentric", year = 1543, month = 5, title = "코페르니쿠스 『천구의 회전에 대하여』", tag = "학문",
		text = "태양이 우주의 중심이라는 책이 나온다. 별을 읽어 바다를 건너던 항해사들도 하늘을 새롭게 보기 시작한다.",
		choices = {
			{ label = "책을 사서 읽는다", hint = "-100코인, 명성 +20", coins = -100, fame = 20 },
			{ label = "항해 일지에 별 기록을 남긴다", hint = "명성 +10, +100코인", coins = 100, fame = 10 },
		} },
	{ id = "potosi_silver", year = 1545, month = 1, title = "포토시 은광 발견", tag = "경제",
		text = "안데스의 산 하나가 은으로 이루어져 있다. 은이 유럽과 중국으로 쏟아지며 세계 시세가 흔들리기 시작한다.",
		choices = {
			{ label = "은 거래에 뛰어든다", hint = "-250코인, 은 값이 내린다", coins = -250, price = price({ "silver" }, 0.85, 90, { "new_world", "europe" }) },
			{ label = "은 가격이 오르기를 기다린다", hint = "+250코인", coins = 250 },
		} },
	{ id = "mercator_projection", year = 1569, month = 1, title = "메르카토르 도법 세계 지도", tag = "학문·항해",
		text = "바다에서 일정한 방향으로 가는 길이 직선으로 그려지는 지도가 나온다. 항해사들의 침로 계산이 쉬워진다.",
		choices = {
			{ label = "지도를 사서 항로를 그린다", hint = "-150코인, 명성 +20", coins = -150, fame = 20 },
			{ label = "기존 해도를 고수한다", hint = "+150코인", coins = 150 },
		} },
	{ id = "lepanto", year = 1571, month = 10, title = "레판토 해전", tag = "전쟁",
		text = "지중해에서 기독교 연합 함대와 오스만 함대가 맞붙는다. 갤리선 시대의 마지막 대해전이다.",
		choices = {
			{ label = "전쟁 물자를 대 준다", hint = "-200코인, 명성 +20", coins = -200, fame = 20 },
			{ label = "지중해 항로를 피해 돌아간다", hint = "+200코인", coins = 200 },
		} },
	{ id = "manila_galleon", year = 1571, month = 5, title = "마닐라 대형 범선 무역", tag = "경제·무역",
		text = "마닐라와 아카풀코를 잇는 태평양 항로가 열린다. 중국 비단과 아메리카 은이 바다를 건너 오간다.",
		choices = {
			{ label = "태평양 항로에 투자한다", hint = "-200코인, 비단 값이 내린다", coins = -200, price = price({ "silk" }, 0.9, 80, { "pacific", "new_world" }) },
			{ label = "대서양 교역에 집중한다", hint = "+200코인", coins = 200 },
		} },
	{ id = "imjin_war", year = 1592, month = 4, title = "임진왜란", tag = "정치·전쟁",
		text = "일본군이 바다를 건너 조선을 침공한다. 동아시아의 바다에서 큰 수군 전투가 이어진다.",
		choices = {
			{ label = "극동 항로 상황을 살핀다", hint = "명성 +15", fame = 15 },
			{ label = "전쟁 물자를 대 준다", hint = "-150코인, 명성 +20", coins = -150, fame = 20 },
		} },
	{ id = "dutch_revolt", year = 1581, month = 7, title = "네덜란드 독립 선언", tag = "정치",
		text = "북쪽 일곱 주가 스페인 왕에 대한 충성을 거둔다. 암스테르담이 상업의 중심으로 떠오른다.",
		choices = {
			{ label = "암스테르담에 거점을 둔다", hint = "-200코인, 명성 +20", coins = -200, fame = 20 },
			{ label = "기존 거래를 이어 간다", hint = "+200코인", coins = 200 },
		} },
	{ id = "drake_circum", year = 1580, month = 9, title = "드레이크 세계 일주 귀환", tag = "탐험",
		text = "금은을 가득 실은 배가 영국 플리머스로 돌아온다. 여왕이 직접 배에 올라 기사 작위를 내린다.",
		choices = {
			{ label = "다음 원정에 출자한다", hint = "-250코인, 명성 +25", coins = -250, fame = 25 },
			{ label = "소식을 듣고 사략을 경계한다", hint = "+150코인", coins = 150 },
		} },
	{ id = "gregorian_calendar", year = 1582, month = 10, title = "그레고리력 도입", tag = "학문",
		text = "교황이 새 달력을 선포해 열흘을 건너뛴다. 나라마다 날짜가 달라 항구에서 계약일을 놓고 말썽이 인다.",
		choices = {
			{ label = "새 달력에 맞춰 계약을 고친다", hint = "-50코인, 명성 +15", coins = -50, fame = 15 },
			{ label = "옛 달력을 고수한다", hint = "+100코인", coins = 100 },
		} },
	{ id = "armada", year = 1588, month = 7, title = "스페인 무적함대 패배", tag = "전쟁",
		text = "거대한 함대가 영국 해협에서 폭풍과 화공선 앞에 무너진다. 바다의 주도권이 서서히 북쪽으로 옮겨 간다.",
		choices = {
			{ label = "영국 쪽 상선단에 합류한다", hint = "-150코인, 명성 +25", coins = -150, fame = 25 },
			{ label = "남쪽 항구에 머문다", hint = "+200코인", coins = 200 },
		} },
	{ id = "dutch_first_voyage", year = 1595, month = 4, title = "네덜란드 첫 동인도 원정", tag = "경제·무역",
		text = "포르투갈의 독점을 깨고 네덜란드 선단이 희망봉을 돌아 자바로 간다. 향신료 항로에 새 경쟁자가 나타난다.",
		choices = {
			{ label = "원정 선단에 출자한다", hint = "-250코인, 후추 값이 내린다", coins = -250, price = price({ "pepper" }, 0.88, 80, { "europe", "indian" }) },
			{ label = "지켜본다", hint = "+200코인", coins = 200 },
		} },
	{ id = "nantes_edict", year = 1598, month = 4, title = "낭트 칙령", tag = "정치·종교",
		text = "프랑스가 신교도에게 제한된 신앙의 자유를 허락한다. 종교 전쟁이 잠시 가라앉고 항구 도시가 살아난다.",
		choices = {
			{ label = "프랑스 항구 거래를 늘린다", hint = "-100코인, 명성 +15", coins = -100, fame = 15 },
			{ label = "중립을 지킨다", hint = "+100코인", coins = 100 },
		} },
	{ id = "globe_theatre", year = 1599, month = 1, title = "글로브 극장 개관", tag = "문화",
		text = "템스 강변에 둥근 극장이 문을 연다. 항구 사람들이 선원 이야기와 먼 나라 소문에 귀를 기울인다.",
		choices = {
			{ label = "극장 후원자가 된다", hint = "-150코인, 명성 +25", coins = -150, fame = 25 },
			{ label = "구경만 한다", hint = "명성 +5", fame = 5 },
		} },
	{ id = "navigation_acts", year = 1651, month = 10, title = "항해 조례", tag = "정치·무역",
		text = "잉글랜드 의회가 자국 배만 식민지 물건을 실어 나를 수 있다는 항해 조례를 통과시켰다. 네덜란드 중개 상인들이 술렁인다.",
		choices = {
			{ label = "조례를 따른다", hint = "명성 +10, 설탕 값이 오른다", fame = 10, price = price({ "sugar" }, 1.1, 60, { "europe", "new_world" }) },
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
			{ label = "중립 교역을 이어 간다", hint = "설탕 값이 오른다", price = price({ "sugar" }, 1.2, 70, { "new_world", "indian" }) },
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
			{ label = "신생국과 교역한다", hint = "+300코인, 면화 값이 내린다", coins = 300, price = price({ "cotton" }, 0.9, 80, { "new_world" }) },
			{ label = "왕실 편에 선다", hint = "명성 +15", fame = 15 },
		} },
	{ id = "french_revolution", year = 1789, month = 7, title = "프랑스 혁명", tag = "정치·혁명",
		text = "바스티유가 무너지고 왕정이 흔들린다. 귀족은 망명하고 새 정부는 낡은 특권과 길드를 없앤다.",
		choices = {
			{ label = "망명 귀족을 실어 나른다", hint = "+500코인", coins = 500 },
			{ label = "혁명 정부와 교역한다", hint = "포도주 값이 내린다", price = price({ "wine" }, 0.85, 80, { "europe" }) },
		} },
	{ id = "great_storm_1703", year = 1703, month = 11, title = "1703년의 대폭풍", tag = "재난·기상",
		text = "영국 남부를 덮친 폭풍이 군함과 상선 수천 척을 부수고 템스 강의 배를 뭍으로 밀어 올렸다. 목재와 돛천이 부족하다.",
		choices = {
			{ label = "수리용 목재를 대량으로 들여온다", hint = "+300코인, 목재 값이 오른다", coins = 300, price = price({ "timber", "linen" }, 1.3, 60, { "europe" }) },
			{ label = "피해 선원들을 돕는다", hint = "명성 +20", fame = 20 },
		} },
	{ id = "taiwan_qing", year = 1683, month = 8, title = "청의 타이완 편입", tag = "정치·전쟁",
		text = "정성공의 후손이 항복하고 타이완이 청에 편입된다. 동남 해안의 해적과 반청 세력의 거점이 사라지고 항구마다 새 규칙이 들어선다.",
		choices = {
			{ label = "청의 공인 상인으로 등록한다", hint = "+300코인, 설탕·쌀 값이 내린다", coins = 300, price = price({ "sugar", "rice" }, 0.9, 70, { "far_east" }) },
			{ label = "밀무역 항구를 찾는다", hint = "+400코인", coins = 400 },
		} },
	{ id = "nerchinsk", year = 1689, month = 9, title = "네르친스크 조약", tag = "정치·외교",
		text = "러시아와 청이 아무르 강 유역의 국경을 정한다. 시베리아 모피와 중국 차가 오가는 육상 교역로가 열린다.",
		choices = {
			{ label = "시베리아 모피를 사들인다", hint = "모피 값이 내린다", price = price({ "fur" }, 0.85, 80, { "europe" }) },
			{ label = "차를 먼저 확보한다", hint = "+250코인, 차 값이 오른다", coins = 250, price = price({ "tea" }, 1.1, 60, { "europe", "far_east" }) },
		} },
	{ id = "aurangzeb_death", year = 1707, month = 3, title = "아우랑제브의 죽음", tag = "정치·왕정",
		text = "무굴 제국을 반세기 다스린 황제가 죽자 지방 총독과 상인 가문이 독자 세력을 키운다. 면직물 산지의 거래 질서가 흔들린다.",
		choices = {
			{ label = "지방 영주와 직거래한다", hint = "+300코인, 면화·인디고 값이 내린다", coins = 300, price = price({ "cotton", "indigo" }, 0.88, 70, { "indian" }) },
			{ label = "혼란을 피해 물러선다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "smallpox_boston", year = 1721, month = 6, title = "보스턴의 천연두 접종 논쟁", tag = "재난·의학",
		text = "천연두가 번진 보스턴에서 목사 코튼 매더와 의사 보일스턴이 접종을 시도한다. 도시는 찬반으로 갈린다.",
		choices = {
			{ label = "접종을 후원한다", hint = "-200코인, 명성 +30", coins = -200, fame = 30 },
			{ label = "백신 대신 약재를 판다", hint = "+250코인", coins = 250 },
		} },
	{ id = "nader_shah", year = 1739, month = 3, title = "나디르 샤의 델리 약탈", tag = "전쟁·정치",
		text = "페르시아의 나디르 샤가 델리를 점령하고 공작 옥좌와 막대한 보석을 가져간다. 인도양 서쪽의 교역 질서가 흔들린다.",
		choices = {
			{ label = "보석과 융단을 사들인다", hint = "보석·융단 값이 내린다", price = price({ "gems", "carpet" }, 0.85, 70, { "indian" }) },
			{ label = "페르시아 만 항로를 지킨다", hint = "+350코인", coins = 350 },
		} },
	{ id = "jenkins_ear", year = 1739, month = 10, title = "젠킨스의 귀 전쟁", tag = "전쟁·식민",
		text = "스페인 해안경비대에 귀를 잘렸다는 영국 선장의 이야기가 의회를 달군다. 카리브해의 밀무역과 스페인 은 함대가 표적이 된다.",
		choices = {
			{ label = "사략 면허를 받는다", hint = "+450코인", coins = 450 },
			{ label = "중립 상선으로 은을 나른다", hint = "은 값이 내린다", price = price({ "silver" }, 0.88, 60, { "new_world", "europe" }) },
		} },
	{ id = "franklin_kite", year = 1752, month = 6, title = "프랭클린의 번개 실험", tag = "학문·과학",
		text = "벤저민 프랭클린이 번개가 전기임을 보이려 연을 날린다. 피뢰침은 뾰족한 쇠막대 하나로 배와 건물을 지켜 줄 것이다.",
		choices = {
			{ label = "피뢰침을 배에 단다", hint = "-150코인, 명성 +25", coins = -150, fame = 25 },
			{ label = "실험 이야기를 퍼뜨린다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "canton_system", year = 1757, month = 11, title = "광저우 일구통상", tag = "정치·무역",
		text = "청이 서양과의 무역을 광저우 한 곳으로 제한한다. 공행이라 불리는 특허 상인만이 거래를 맡는다.",
		choices = {
			{ label = "공행과 장기 계약을 맺는다", hint = "+350코인, 차·비단·도자기 값이 내린다", coins = 350, price = price({ "tea", "silk", "porcelain" }, 0.92, 80, { "far_east", "europe" }) },
			{ label = "다른 항구를 시험한다", hint = "+200코인, 명성 +10", coins = 200, fame = 10 },
		} },
	{ id = "harrison_h4", year = 1761, month = 11, title = "해리슨의 H4 시험 항해", tag = "학문·항해",
		text = "시계공 존 해리슨의 해상 시계가 자메이카까지 긴 항해에서 거의 오차 없이 시간을 지켰다. 경도 문제가 풀릴 수 있다.",
		choices = {
			{ label = "시계 제작을 후원한다", hint = "-250코인, 명성 +30", coins = -250, fame = 30 },
			{ label = "경도 상금 소식을 퍼뜨린다", hint = "명성 +15", fame = 15 },
		} },
	{ id = "treaty_paris", year = 1763, month = 2, title = "파리 조약", tag = "정치·전쟁",
		text = "7년 전쟁이 끝나고 프랑스가 캐나다와 인도의 거점을 내준다. 북미 모피와 카리브 설탕 거래가 새 주인을 맞는다.",
		choices = {
			{ label = "새 영토의 모피를 확보한다", hint = "모피 값이 내린다", price = price({ "fur" }, 0.85, 80, { "new_world" }) },
			{ label = "설탕 섬 상인과 손잡는다", hint = "+300코인", coins = 300 },
		} },
	{ id = "tupac_revolt", year = 1780, month = 11, title = "투팍 아마루 2세의 봉기", tag = "정치·식민",
		text = "안데스의 원주민 지도자가 광산 노역 강제 배정에 맞서 봉기한다. 포토시의 은 수송이 끊긴다.",
		choices = {
			{ label = "은 수송을 호위한다", hint = "+400코인", coins = 400 },
			{ label = "상황을 지켜본다", hint = "은 값이 오른다", price = price({ "silver" }, 1.12, 60, { "new_world", "europe" }) },
		} },
	{ id = "laki_eruption", year = 1783, month = 6, title = "라키 화산의 분화", tag = "재난·기상",
		text = "아이슬란드 라키 화산이 몇 달 동안 독한 안개를 뿜는다. 유럽의 여름이 흐려지고 이듬해 흉작이 든다.",
		choices = {
			{ label = "곡식과 생선을 비축해 둔다", hint = "+250코인, 생선 값이 오른다", coins = 250, price = price({ "fish", "cheese" }, 1.2, 70, { "europe" }) },
			{ label = "굶주린 항구에 구호품을 보낸다", hint = "명성 +25", fame = 25 },
		} },
	{ id = "first_fleet", year = 1788, month = 1, title = "제1함대의 시드니 입항", tag = "탐험·식민",
		text = "영국 죄수 이송선단 11척이 보터니 만에 닿아 시드니에 정착지를 세운다. 대양주에 새 항구가 생겼다.",
		choices = {
			{ label = "보급선 계약을 맺는다", hint = "+400코인", coins = 400 },
			{ label = "고래와 물개 사냥 거점을 알아본다", hint = "고래기름 값이 내린다", price = price({ "whale_oil", "sealskin" }, 0.85, 80, { "pacific" }) },
		} },
	{ id = "eic_charter", year = 1600, month = 12, title = "영국 동인도회사 특허", tag = "정치·무역",
		text = "엘리자베스 1세가 런던 상인들에게 동인도 무역의 독점 특허장을 내린다. 향신료를 둘러싼 경쟁에 잉글랜드가 뛰어든다.",
		choices = {
			{ label = "주주로 참여한다", hint = "-250코인, 명성 +20, 후추 값이 내린다", coins = -250, fame = 20, price = price({ "pepper" }, 0.9, 80, { "europe" }) },
			{ label = "독점 밖에서 사무역을 한다", hint = "+250코인", coins = 250 },
		} },
	{ id = "sekigahara", year = 1600, month = 10, title = "세키가하라 전투", tag = "정치·전쟁",
		text = "일본의 패권을 건 대전투에서 도쿠가와 이에야스가 이겨 새 질서의 문을 연다. 항구마다 무사와 상인의 지위가 다시 정해진다.",
		choices = {
			{ label = "승자 쪽 상인과 손잡는다", hint = "+300코인, 은·구리 값이 내린다", coins = 300, price = price({ "silver", "copper" }, 0.9, 70, { "far_east" }) },
			{ label = "중립을 지킨다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "voc_founding", year = 1602, month = 3, title = "네덜란드 동인도회사 설립", tag = "경제·무역",
		text = "여러 무역 회사가 하나로 합쳐 세계 최초의 주식회사가 된다. 암스테르담 거리에서 주식 증서가 사고팔린다.",
		choices = {
			{ label = "첫 주식을 산다", hint = "-300코인, 명성 +25", coins = -300, fame = 25 },
			{ label = "향신료 항로 정보를 판다", hint = "+300코인, 정향·육두구 값이 내린다", coins = 300, price = price({ "cloves", "nutmeg" }, 0.88, 80, { "europe" }) },
		} },
	{ id = "jamestown", year = 1607, month = 5, title = "제임스타운 건설", tag = "탐험·식민",
		text = "영국 이주민 백여 명이 체서피크 만에 첫 영구 정착지를 세운다. 굶주림과 질병 속에 식량 작물과 교역로를 찾아 나선다.",
		choices = {
			{ label = "보급선을 보낸다", hint = "-150코인, 명성 +20", coins = -150, fame = 20 },
			{ label = "옥수수 종자를 사들인다", hint = "옥수수 값이 내린다", price = price({ "maize" }, 0.88, 90, { "new_world", "europe" }) },
		} },
	{ id = "quebec_founded", year = 1608, month = 7, title = "퀘벡 건설", tag = "탐험·식민",
		text = "사뮈엘 드 샹플랭이 세인트로렌스 강가에 교역소를 세운다. 모피를 실은 카누가 상류에서 내려오기 시작한다.",
		choices = {
			{ label = "모피 교역에 합류한다", hint = "+300코인, 모피 값이 내린다", coins = 300, price = price({ "fur" }, 0.88, 80, { "new_world", "europe" }) },
			{ label = "원주민 동맹을 돕는다", hint = "명성 +20", fame = 20 },
		} },
	{ id = "galileo_telescope", year = 1609, month = 8, title = "갈릴레오의 망원경", tag = "학문·천문",
		text = "베네치아에서 망원경 소식을 들은 갈릴레오가 직접 렌즈를 갈아 하늘로 향한다. 달의 산과 목성의 위성이 보이기 시작한다.",
		choices = {
			{ label = "렌즈를 사 주며 후원한다", hint = "-150코인, 명성 +25, 목성의 위성 지식 획득", coins = -150, fame = 25, cards = { "ast_jupiter_moons" } },
			{ label = "해군에 망원경을 소개한다", hint = "+250코인", coins = 250 },
		} },
	{ id = "thirty_years_war", year = 1618, month = 5, title = "30년 전쟁의 시작", tag = "전쟁",
		text = "프라하에서 시작된 종교 분쟁이 유럽 전역의 전쟁으로 번진다. 용병과 군수품 값이 오르고 한자 도시의 교역이 위험해진다.",
		choices = {
			{ label = "군수품을 공급한다", hint = "+400코인, 철·화약 재료 값이 오른다", coins = 400, price = price({ "iron", "coal" }, 1.15, 70, { "europe" }) },
			{ label = "중립 항구에서 곡물을 판다", hint = "+200코인, 명성 +10", coins = 200, fame = 10 },
		} },
	{ id = "batavia_founded", year = 1619, month = 5, title = "바타비아 건설", tag = "경제·식민",
		text = "얀 피터르스존 쿤이 자카르타를 부수고 그 자리에 네덜란드 동인도회사의 아시아 본부를 세운다.",
		choices = {
			{ label = "바타비아 창고에 납품한다", hint = "+350코인", coins = 350 },
			{ label = "향신료 밀무역 항구를 찾는다", hint = "정향·후추 값이 오른다", price = price({ "cloves", "pepper" }, 1.1, 60, { "far_east", "indian" }) },
		} },
	{ id = "mayflower", year = 1620, month = 11, title = "메이플라워호의 도착", tag = "탐험·식민",
		text = "신앙의 자유를 찾아 떠난 청교도 백여 명이 케이프코드에 닿아 플리머스 식민지를 시작한다.",
		choices = {
			{ label = "겨울 보급품을 나른다", hint = "-100코인, 명성 +20", coins = -100, fame = 20 },
			{ label = "어장과 모피를 알아본다", hint = "+250코인", coins = 250 },
		} },
	{ id = "new_amsterdam", year = 1626, month = 5, title = "뉴암스테르담 건설", tag = "경제·식민",
		text = "네덜란드 서인도 회사가 맨해튼 섬에 교역소를 세운다. 허드슨 강의 모피가 암스테르담으로 흘러든다.",
		choices = {
			{ label = "모피 교역소와 계약한다", hint = "+300코인, 모피 값이 내린다", coins = 300, price = price({ "fur" }, 0.88, 80, { "new_world", "europe" }) },
			{ label = "서인도 회사 주식을 산다", hint = "-200코인, 명성 +20", coins = -200, fame = 20 },
		} },
	{ id = "vasa_sinks", year = 1628, month = 8, title = "바사호의 침몰", tag = "재난·조선",
		text = "스웨덴 왕의 자랑이던 거대한 군함 바사호가 처녀항해 첫 바람에 기울어 스톡홀름 항구에서 가라앉는다.",
		choices = {
			{ label = "인양과 수리를 맡는다", hint = "+250코인", coins = 250 },
			{ label = "설계 오류를 기록해 둔다", hint = "명성 +15", fame = 15 },
		} },
	{ id = "harvey_circulation", year = 1628, month = 6, title = "하비의 『심장의 운동에 관하여』", tag = "학문·의학",
		text = "윌리엄 하비가 혈액이 몸 안을 순환한다고 발표한다. 의학계가 크게 술렁인다.",
		choices = {
			{ label = "책을 선원 의사들에게 돌린다", hint = "-100코인, 명성 +25", coins = -100, fame = 25 },
			{ label = "해부 실험을 후원한다", hint = "-150코인, 명성 +20, 혈액 순환 지식 획득", coins = -150, fame = 20, cards = { "med_circulation" } },
		} },
	{ id = "tulip_mania", year = 1637, month = 2, title = "튤립 투기 열풍", tag = "경제·투기",
		text = "튤립 구근 한 뿌리가 집 한 채 값에 팔린다는 소문이 돈다. 어느 날 갑자기 사겠다는 사람이 사라진다.",
		choices = {
			{ label = "고점에서 손을 턴다", hint = "+400코인", coins = 400 },
			{ label = "구근에 걸어 본다", hint = "-300코인, 이기면 크게 번다", coins = -300, chance = { p = 0.3, win = { coins = 1500 }, lose = { coins = 0 } } },
		} },
	{ id = "sakoku", year = 1639, month = 7, title = "일본의 쇄국령", tag = "정치·무역",
		text = "막부가 포르투갈 배의 입항을 금지하고 해외 왕래를 엄하게 제한한다. 이듬해부터 네덜란드 상관만 나가사키의 데지마에 남는다.",
		choices = {
			{ label = "데지마 무역권을 노린다", hint = "+400코인, 은·구리 값이 내린다", coins = 400, price = price({ "silver", "copper" }, 0.88, 80, { "far_east", "europe" }) },
			{ label = "다른 항구로 옮겨 간다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "portugal_independence", year = 1640, month = 12, title = "포르투갈의 독립 회복", tag = "정치·왕정",
		text = "60년 만에 포르투갈이 스페인에서 떨어져 나와 새 왕을 맞는다. 브라질과 아프리카 해안 거점의 주인이 다시 가려진다.",
		choices = {
			{ label = "새 왕실과 계약한다", hint = "+350코인, 설탕 값이 내린다", coins = 350, price = price({ "sugar" }, 0.9, 70, { "europe", "new_world" }) },
			{ label = "네덜란드 쪽 거점을 지원한다", hint = "명성 +15", fame = 15 },
		} },
	{ id = "malacca_dutch", year = 1641, month = 1, title = "네덜란드의 말라카 점령", tag = "전쟁·식민",
		text = "네덜란드가 포르투갈의 말라카를 포위 끝에 점령한다. 해협의 통행세와 향신료 거래권이 새 주인에게 넘어간다.",
		choices = {
			{ label = "해협 통행권을 협상한다", hint = "+450코인", coins = 450 },
			{ label = "향신료를 사재기한다", hint = "정향·육두구 값이 오른다", price = price({ "cloves", "nutmeg" }, 1.12, 60, { "far_east", "indian" }) },
		} },
	{ id = "english_civil_war", year = 1642, month = 8, title = "잉글랜드 내전의 시작", tag = "정치·전쟁",
		text = "왕과 의회가 칼을 맞대자 런던 상인과 항구 도시는 대부분 의회 편에 선다. 해군도 의회로 기운다.",
		choices = {
			{ label = "의회 해군에 군수를 댄다", hint = "+400코인", coins = 400 },
			{ label = "프랑스 항구로 물자를 돌린다", hint = "+250코인, 모직 값이 내린다", coins = 250, price = price({ "wool", "cloth" }, 0.9, 60, { "europe" }) },
		} },
	{ id = "torricelli_barometer", year = 1643, month = 6, title = "토리첼리의 수은 기둥", tag = "학문·물리",
		text = "토리첼리가 수은을 채운 유리관을 세워 대기에 무게가 있음을 보인다. 날씨를 재는 기압계의 시작이다.",
		choices = {
			{ label = "실험 기구를 구해 준다", hint = "-120코인, 명성 +20, 기압계 지식 획득", coins = -120, fame = 20, cards = { "phy_barometer" } },
			{ label = "항해사들에게 소문을 낸다", hint = "명성 +10", fame = 10 },
		} },
	{ id = "qing_beijing", year = 1644, month = 6, title = "청의 베이징 입성", tag = "정치·왕정",
		text = "명나라가 무너지고 만주 청군이 베이징에 들어온다. 남쪽 해안에서는 명을 잇자는 세력이 바다로 나선다.",
		choices = {
			{ label = "새 왕조의 관허 상인이 된다", hint = "+350코인", coins = 350 },
			{ label = "명 유민 선단과 거래한다", hint = "+300코인, 명성 -5", coins = 300, fame = -5 },
		} },
	{ id = "westphalia", year = 1648, month = 10, title = "베스트팔렌 조약", tag = "정치·외교",
		text = "30년 전쟁이 끝나고 네덜란드의 독립이 공식으로 인정된다. 라인 강과 발트 해 교역이 다시 열린다.",
		choices = {
			{ label = "발트 해 교역을 다시 연다", hint = "+400코인, 목재 값이 내린다", coins = 400, price = price({ "timber" }, 0.88, 70, { "europe" }) },
			{ label = "평화 기념 연회에 참석한다", hint = "명성 +25", fame = 25 },
		} },
	{ id = "charles1_executed", year = 1649, month = 1, title = "찰스 1세의 처형", tag = "정치·왕정",
		text = "잉글랜드가 왕의 목을 베고 공화국을 선포한다. 왕당파 항구와 해외 식민지가 갈라진다.",
		choices = {
			{ label = "공화국 정부와 계약한다", hint = "+300코인", coins = 300 },
			{ label = "왕당파 피난민을 태운다", hint = "+250코인, 명성 +5", coins = 250, fame = 5 },
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
	great_storm_1703 = { node = "wx_gale", label = "강풍 경험으로 미리 피항해 배를 지킨다", hint = "+300코인, 명성 +20", coins = 300, fame = 20 },
	taiwan_qing = { node = "geo_south_china_sea", label = "남중국해 해도로 새 항로를 연다", hint = "+350코인", coins = 350 },
	nerchinsk = { node = "good_fur", label = "모피 등급 지식으로 좋은 가죽만 고른다", hint = "+400코인", coins = 400 },
	aurangzeb_death = { node = "bot_cotton_plant", label = "면화 재배 지식으로 산지 농가와 직거래한다", hint = "+400코인, 면화 값이 크게 내린다", coins = 400, price = price({ "cotton" }, 0.8, 80, { "indian" }) },
	smallpox_boston = { node = "med_inoculation", label = "접종 지식을 도시 의사들과 나눈다", hint = "+150코인, 명성 +45", coins = 150, fame = 45 },
	nader_shah = { node = "geo_persian_gulf", label = "페르시아 만 지식으로 안전한 항구를 찾는다", hint = "+450코인", coins = 450 },
	jenkins_ear = { node = "am_silver_ore_potosi", label = "은광 지식으로 은 시세를 읽고 거래한다", hint = "+600코인", coins = 600 },
	franklin_kite = { node = "wx_thunderstorm", label = "뇌우를 이해하고 피뢰침을 설계에 보탠다", hint = "+200코인, 명성 +40", coins = 200, fame = 40 },
	canton_system = { node = "good_porcelain", label = "자기 감정 지식으로 최상품만 확보한다", hint = "+500코인, 도자기 값이 내린다", coins = 500, price = price({ "porcelain" }, 0.85, 80, { "far_east", "europe" }) },
	harrison_h4 = { node = "nav_chronometer", label = "해상 시계 지식으로 시험 항해를 돕는다", hint = "명성 +50, 경도 문제 지식 획득", fame = 50, cards = { "nav_longitude_problem" } },
	treaty_paris = { node = "geo_newfoundland_banks", label = "어장 지식으로 대구 거래를 늘린다", hint = "+450코인", coins = 450 },
	tupac_revolt = { node = "min_silver_ore", label = "은광 지식으로 대체 광산을 찾아 연결한다", hint = "+500코인", coins = 500 },
	laki_eruption = { node = "geo_volcano_island", label = "화산 지식으로 피해 지역을 예측한다", hint = "+300코인, 명성 +30", coins = 300, fame = 30 },
	first_fleet = { node = "bot_pacific_plants", label = "남태평양 식물 지식으로 새 작물을 심는다", hint = "+300코인, 명성 +30", coins = 300, fame = 30 },
	eic_charter = { node = "bot_pepper_vine", label = "후추 덩굴 지식으로 산지 직거래를 연다", hint = "+400코인, 후추 값이 크게 내린다", coins = 400, price = price({ "pepper" }, 0.8, 80, { "europe" }) },
	sekigahara = { node = "good_silk", label = "비단 거래 지식으로 새 권력의 상인과 잇는다", hint = "+450코인", coins = 450 },
	voc_founding = { node = "lang_ledger", label = "장부 기록으로 주식 거래의 이치를 꿰뚫는다", hint = "+400코인, 명성 +30", coins = 400, fame = 30 },
	jamestown = { node = "good_sugar", label = "신대륙 작물의 교역 지식을 전수한다", hint = "+400코인, 명성 +20", coins = 400, fame = 20 },
	quebec_founded = { node = "good_fur", label = "모피 등급 지식으로 상품만 골라 산다", hint = "+400코인", coins = 400 },
	galileo_telescope = { node = "phy_refraction", label = "빛의 굴절 지식으로 렌즈 연마를 돕는다", hint = "명성 +45", fame = 45 },
	thirty_years_war = { node = "lang_cipher", label = "암호문 해독으로 봉쇄를 피해 간다", hint = "+500코인", coins = 500 },
	batavia_founded = { node = "bot_clove_tree", label = "정향나무 지식으로 재배지를 알아본다", hint = "+450코인", coins = 450 },
	mayflower = { node = "bot_cranberry", label = "크랜베리 지식으로 겨울을 넘기게 돕는다", hint = "명성 +35, +100코인", coins = 100, fame = 35 },
	new_amsterdam = { node = "geo_estuary", label = "강 하구 지식으로 안전한 정박지를 잡는다", hint = "+400코인", coins = 400 },
	vasa_sinks = { node = "ship_galleon_design", label = "갈레온 설계 지식으로 복원 계획을 낸다", hint = "+400코인, 명성 +25", coins = 400, fame = 25 },
	harvey_circulation = { node = "med_anatomy", label = "해부학 지식으로 하비의 실험을 돕는다", hint = "명성 +45", fame = 45 },
	tulip_mania = { node = "bot_tulip", label = "튤립의 진짜 가치를 알아보고 거품 전에 정리한다", hint = "+600코인", coins = 600 },
	sakoku = { node = "lang_dictionary", label = "사전과 통역으로 데지마 협상을 돕는다", hint = "+500코인", coins = 500 },
	portugal_independence = { node = "geo_cape_good_hope", label = "희망봉 항로 지식으로 새 왕실 선단에 합류한다", hint = "+500코인", coins = 500 },
	malacca_dutch = { node = "geo_malacca_strait", label = "말라카 해협 지식으로 안전한 통과 시기를 읽는다", hint = "+550코인", coins = 550 },
	english_civil_war = { node = "ship_planks", label = "선체 외판 지식으로 전함 수리를 맡는다", hint = "+500코인", coins = 500 },
	torricelli_barometer = { node = "phy_boyle_law", label = "기체의 성질 지식으로 실험을 해석한다", hint = "명성 +45", fame = 45 },
	qing_beijing = { node = "good_tea", label = "차 거래 지식으로 새 왕조 관청과 잇는다", hint = "+450코인", coins = 450 },
	westphalia = { node = "lang_latin", label = "라틴어 조약문을 읽고 유리한 조항을 짚는다", hint = "+450코인, 명성 +20", coins = 450, fame = 20 },
	reformation_95 = { node = "lang_printing_press", label = "인쇄기 지식으로 소책자 인쇄를 돕는다", hint = "+400코인, 명성 +25", coins = 400, fame = 25 },
	magellan_circum = { node = "geo_straits_magellan", label = "마젤란 해협 지식으로 항로를 짚어 준다", hint = "명성 +45", fame = 45 },
	tenochtitlan = { node = "good_cocoa", label = "카카오 거래 지식으로 새 상품을 알아본다", hint = "+450코인", coins = 450 },
	copernicus_heliocentric = { node = "phi_scientific_method", label = "관측과 논증 지식으로 새 이론을 해설한다", hint = "명성 +45", fame = 45 },
	potosi_silver = { node = "min_silver_ore", label = "은광석 지식으로 좋은 광맥을 알아본다", hint = "+500코인", coins = 500 },
	mercator_projection = { node = "nav_mercator", label = "도법 지식으로 해도에 직선 항로를 긋는다", hint = "명성 +45", fame = 45 },
	lepanto = { node = "arch_arsenal", label = "조선소 지식으로 함대 수리를 돕는다", hint = "+450코인", coins = 450 },
	manila_galleon = { node = "geo_pacific_vast", label = "태평양의 넓이를 아는 지식으로 순풍 시기를 읽는다", hint = "+450코인", coins = 450 },
	imjin_war = { node = "arch_star_fort", label = "성과 방어 지식으로 항구 방비를 돕는다", hint = "+400코인", coins = 400 },
	dutch_revolt = { node = "lang_ledger", label = "장부 지식으로 새 공화국의 상인과 손잡는다", hint = "+450코인, 명성 +20", coins = 450, fame = 20 },
	drake_circum = { node = "geo_pirate_waters", label = "해적 해역 지식으로 습격 시기를 읽는다", hint = "+400코인", coins = 400 },
	gregorian_calendar = { node = "nav_portolan", label = "해도와 날짜 지식으로 계약 혼선을 푼다", hint = "명성 +35, +100코인", coins = 100, fame = 35 },
	armada = { node = "lang_flag_signals", label = "깃발 신호 지식으로 선단 연락을 돕는다", hint = "+450코인, 명성 +20", coins = 450, fame = 20 },
	dutch_first_voyage = { node = "geo_spice_islands", label = "향신료 제도 지식으로 거점을 알아본다", hint = "+500코인", coins = 500 },
	nantes_edict = { node = "phi_skepticism", label = "관용과 회의의 지식으로 두 진영을 잇는다", hint = "명성 +40", fame = 40 },
	globe_theatre = { node = "art_theater", label = "연극 지식으로 대본을 다듬는다", hint = "명성 +40", fame = 40 },
	charles1_executed = { node = "phi_natural_law", label = "자연법 논쟁을 중재해 양쪽의 신뢰를 얻는다", hint = "명성 +45", fame = 45 },
}
-- 학문·기술·탐험 사건은 플레이어의 앞당김만큼 일찍 닥칠 수 있다 (정치·전쟁·재난은 제때)
for _, id in { "magellan_circum", "copernicus_heliocentric", "mercator_projection", "gregorian_calendar", "cape_colony", "restoration", "principia", "peters_embassy", "dutch_learning", "industrial_start", "cook_voyage", "fontainebleau", "franklin_kite", "harrison_h4", "smallpox_boston", "galileo_telescope", "harvey_circulation", "torricelli_barometer" } do
	E.ById[id].accel = true
end
for id, ins in I do
	E.ById[id].insight = ins
end

-- 사건과 얽힌 실존 인물 (Scholars 의 id). 그 인물을 만난 적이 있으면 지식 활용 선택의 보상이 커진다. (인물 → 사건 → 학문·교역품의 인과)
local P = {
	anglo_dutch_war = { "witsen" }, cape_colony = { "blaeu" }, restoration = { "boyle", "wren" }, colbert = { "huygens" },
	great_plague = { "newton" }, great_fire = { "wren" }, principia = { "newton", "halley" }, glorious_revolution = { "newton" },
	bank_of_england = { "newton" }, peters_embassy = { "witsen" }, fontainebleau = { "papin" }, south_sea = { "newton" },
	industrial_start = { "newcomen", "savery" }, cook_voyage = { "banks" }, boston_tea = { "franklin" }, independence = { "franklin" },
	franklin_kite = { "franklin" }, harrison_h4 = { "harrison" },
	galileo_telescope = { "galileo" }, harvey_circulation = { "harvey" }, torricelli_barometer = { "torricelli" }, voc_founding = { "witsen" }, tulip_mania = { "rembrandt" }, great_storm_1703 = { "wren" }, first_fleet = { "banks" },
}
for id, list in P do
	E.ById[id].people = list
end

-- 사건이 일어나는 게임 일수 (startYear 기준)
function E.dayOf(ev, startYear)
	return (ev.year - startYear) * 365 + ((ev.month or 6) - 1) * 30
end

return E
