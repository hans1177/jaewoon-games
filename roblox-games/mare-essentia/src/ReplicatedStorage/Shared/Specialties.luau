--!strict
-- 전문 분야(직업 성향)와 동료(실존 학자·박물학자) 데이터. 효과는 숫자 보너스로만 표현한다.
-- 전문 분야는 한 번에 하나를 고르고, 동료는 최대 슬롯 수만큼 함께 항해한다.

export type Perk = {
	discoverFields: { string }?, -- 이 분야 카드를 찾을 확률 보너스를 받는 카드 분야
	discoverBonus: number?, -- 위 분야 발견 확률 +
	coinFields: { string }?, -- 이 분야 카드 등록 코인 보너스
	coinMult: number?, -- 위 분야 등록 코인 배율 (0.5 = +50%)
	speedMult: number?, -- 항해 속도 +
	sellBonus: number?, -- 되파는 비율 +
	cannonMult: number?, -- 포격 +
	healMult: number?, -- 열병·괴혈병·사기 하락 감소 (0.5 = 절반)
}

export type Specialty = { id: string, name: string, summary: string, perk: Perk, xpOn: { string } } -- xpOn: 경험치를 주는 카드 분야 또는 "voyage"/"trade"

export type Companion = {
	id: string,
	name: string,
	scholarId: string, -- 먼저 이 학자를 만나 지식을 전수받아야 한다 ("" = 주점에서 바로 영입)
	role: string?, -- 항해사·포수·회계사·의사 (주점 동료)
	fee: number, -- 영입 비용
	minFame: number,
	requiresStory: string?, -- 이 지역 주점 이야기를 본 뒤에야 영입할 수 있다
	homePort: string?, -- 이 동료를 만나는 항구
	summary: string,
	perk: Perk,
	battleLine: string, -- 전투가 시작될 때 하는 말
	winLine: string, -- 이겼을 때 하는 말
	nation: string?, -- 이 나라 주인공의 동료 (첫 항해에서 자동 합류)
}

local Specialties: { Specialty } = {
	{ id = "botanist", name = "식물학자", summary = "식물·약용·의학 카드 발견 확률 +25%",
		perk = { discoverFields = { "Botany", "Medicine" }, discoverBonus = 0.25 }, xpOn = { "Botany", "Medicine" } },
	{ id = "zoologist", name = "동물학자", summary = "동물 카드 발견 확률 +25%",
		perk = { discoverFields = { "Zoology" }, discoverBonus = 0.25 }, xpOn = { "Zoology" } },
	{ id = "collector", name = "유물수집가", summary = "유물·유적·광물·예술·건축·언어 카드 등록 코인 +50%",
		perk = { coinFields = { "Relic", "Site", "Mineral", "Art", "Architecture", "Language" }, coinMult = 0.5 }, xpOn = { "Relic", "Site", "Mineral", "Art", "Architecture", "Language" } },
	{ id = "cartographer", name = "지도제작자", summary = "항해 속도 +10%",
		perk = { speedMult = 0.1 }, xpOn = { "voyage", "Geography", "Astronomy", "Navigation", "Weather", "Shipbuilding" } },
	{ id = "merchant", name = "무역가", summary = "되파는 비율 +2%",
		perk = { sellBonus = 0.02 }, xpOn = { "trade", "Goods" } },
}

local Companions: { Companion } = {
	{ id = "c_merian", name = "마리아 메리안", scholarId = "merian", fee = 300, minFame = 60,
		summary = "곤충·식물을 정밀하게 그리는 박물화가. 동물·식물 카드 발견 +15%",
		perk = { discoverFields = { "Zoology", "Botany" }, discoverBonus = 0.15 },
		battleLine = "적 배 갑판 위의 벌레까지 그리고 싶지만... 지금은 몸부터 지켜요!",
		winLine = "무사해서 다행이에요. 이 장면도 스케치해 둘게요." },
	{ id = "c_halley", name = "에드먼드 핼리", scholarId = "halley", fee = 500, minFame = 80,
		summary = "천문·항해에 밝은 학자. 항해 속도 +8%, 천문·지리 카드 발견 +15%",
		perk = { speedMult = 0.08, discoverFields = { "Astronomy", "Geography" }, discoverBonus = 0.15 },
		battleLine = "풍향과 별을 계산했네. 지금 쏘면 맞을 걸세!",
		winLine = "계산대로군. 오늘 밤 하늘 관측도 기대되는걸." },
	{ id = "c_leeuwenhoek", name = "안톤 판 레이우엔훅", scholarId = "leeuwenhoek", fee = 400, minFame = 70,
		summary = "현미경 관찰의 대가. 물리·화학·의학 카드 발견 +15%",
		perk = { discoverFields = { "Physics", "Chemistry", "Medicine" }, discoverBonus = 0.15 },
		battleLine = "렌즈 상자는 안전한 곳에 두었다오. 어서 싸웁시다!",
		winLine = "전투 중에 튄 물방울도 현미경으로 봐야겠소." },
	{ id = "c_linnaeus", name = "카를 린네", scholarId = "linnaeus", fee = 600, minFame = 120,
		summary = "식물 분류의 아버지. 식물·광물·동물 카드 발견 +20%",
		perk = { discoverFields = { "Botany", "Mineral", "Zoology" }, discoverBonus = 0.2 },
		battleLine = "전투 중에도 분류는 계속된다네. 저 배는 '해적속'이지.",
		winLine = "해적속 하나를 정리했군. 다음엔 식물 차례일세." },
	{ id = "c_boyle", name = "로버트 보일", scholarId = "boyle", fee = 450, minFame = 60,
		summary = "실험 화학자. 화학 카드 발견 +20%, 유리·와인 교역 이문에 밝아 되파는 비율 +1%",
		perk = { discoverFields = { "Chemistry" }, discoverBonus = 0.2, sellBonus = 0.01 },
		battleLine = "화약의 연소를 직접 볼 기회군. 침착하게 합시다.",
		winLine = "결과는 실험으로 확인되었소. 우리가 이겼소." },
	{ id = "c_newton", name = "아이작 뉴턴", scholarId = "newton", fee = 900, minFame = 180,
		summary = "운동의 법칙을 세운 학자. 포격 +8%, 물리·천문 카드 발견 +15%. 전용 스킬: 만유인력 계산",
		perk = { cannonMult = 0.08, discoverFields = { "Physics", "Astronomy" }, discoverBonus = 0.15 },
		battleLine = "포탄의 궤적은 계산할 수 있소. 내가 각도를 부르겠소!",
		winLine = "작용이 있으면 반작용이 있는 법이오. 우리가 이긴 것도 같은 이치요." },
	{ id = "c_huygens", name = "크리스티안 하위헌스", scholarId = "huygens", fee = 600, minFame = 80,
		summary = "진자시계와 토성의 고리를 연구한 학자. 항해 속도 +6%, 천문·물리 카드 발견 +15%",
		perk = { speedMult = 0.06, discoverFields = { "Astronomy", "Physics" }, discoverBonus = 0.15 },
		battleLine = "흔들리는 갑판에서도 시계는 정확해야 하오. 박자를 맞춥시다!",
		winLine = "시간을 재 두었소. 오늘은 우리 쪽이 더 빨랐소." },
	{ id = "c_harrison", name = "존 해리슨", scholarId = "harrison", fee = 700, minFame = 120,
		summary = "해상 시계를 만든 시계공. 항해 속도 +12%. 전용 스킬: 정밀 항로 차단",
		perk = { speedMult = 0.12 },
		battleLine = "배가 흔들려도 내 시계는 틀리지 않소. 위치는 정확하오!",
		winLine = "한 치의 오차도 없었소. 시계가 승리를 알렸소." },
	{ id = "c_banks", name = "조지프 뱅크스", scholarId = "banks", fee = 800, minFame = 140,
		summary = "남태평양을 다녀온 박물학자. 식물·동물 카드 발견 +20%, 등록 코인 +10%",
		perk = { discoverFields = { "Botany", "Zoology" }, discoverBonus = 0.2, coinFields = { "Botany", "Zoology" }, coinMult = 0.1 },
		battleLine = "표본 상자는 선창에 단단히 묶어 두었소. 이제 싸웁시다!",
		winLine = "먼 바다에서도 무사하다니, 이 항해는 기록할 가치가 있소." },
	{ id = "c_lind", name = "제임스 린드", scholarId = "lind", fee = 350, minFame = 60,
		summary = "괴혈병에 귤류를 처방한 해군 의사. 열병·괴혈병·사기 하락 절반으로 줄인다",
		perk = { healMult = 0.5 },
		battleLine = "다친 선원은 제가 맡겠습니다. 갑판에서 물러서지 마십시오!",
		winLine = "귤을 챙겨 둔 보람이 있군요. 모두 무사합니다." },
	{ id = "c_wren", name = "크리스토퍼 렌", scholarId = "wren", fee = 650, minFame = 90,
		summary = "런던 재건을 이끈 건축가. 포격 +4%, 건축·조선 카드 발견 +15%. 전용 스킬: 버팀목 보강",
		perk = { cannonMult = 0.04, discoverFields = { "Architecture", "Shipbuilding" }, discoverBonus = 0.15 },
		battleLine = "선체의 하중을 보았소. 무너지기 전에 버팀목을 대겠소!",
		winLine = "튼튼하게 지은 배는 쉽게 가라앉지 않소." },
	{ id = "c_franklin", name = "벤저민 프랭클린", scholarId = "franklin", fee = 700, minFame = 100,
		summary = "번개를 연구한 인쇄업자이자 학자. 물리·기상 카드 발견 +15%, 되파는 비율 +1%. 전용 스킬: 피뢰침 신호",
		perk = { discoverFields = { "Physics", "Weather" }, discoverBonus = 0.15, sellBonus = 0.01 },
		battleLine = "번개는 길을 찾는 법이라네. 우리도 길을 찾아봅시다!",
		winLine = "작은 지혜가 큰 배를 이겼군. 오늘 일은 신문에 실어도 되겠네." },
	{ id = "c_galileo", name = "갈릴레오 갈릴레이", scholarId = "galileo", fee = 750, minFame = 90,
		summary = "망원경으로 하늘을 본 학자. 천문·물리 카드 발견 +20%. 전용 스킬: 망원경 관측",
		perk = { discoverFields = { "Astronomy", "Physics" }, discoverBonus = 0.2 },
		battleLine = "망원경으로 보니 적 배의 약한 곳이 보이는군. 저쪽을 쏘게!",
		winLine = "그래도 바다는 우리 편이었군. 하늘만큼 바다도 관측해 볼 만하네." },
	{ id = "c_papin", name = "드니 파팽", scholarId = "papin", fee = 500, minFame = 60,
		summary = "증기 장치 기술자. 포격 +5%",
		perk = { cannonMult = 0.05 },
		battleLine = "압력 게이지를 확인했소. 증기는 언제든 준비되어 있소!",
		winLine = "압력이 아주 잘 버텨 줬소. 뿌듯하군." },
	-- 주점에서 영입하는 직능 동료 (학자 전수 불필요)
	{ id = "t_priest", name = "신부 안셀모", scholarId = "", role = "성직자", fee = 300, minFame = 25,
		summary = "병든 선원의 곁을 지키는 성직자. 열병·사기 하락 20% 감소",
		perk = { healMult = 0.2 },
		battleLine = "상처 입은 이를 먼저 데려오게!", winLine = "주여, 모두 무사히 돌아왔습니다." },
	{ id = "t_nun", name = "수녀 아녜스", scholarId = "", role = "수녀", fee = 300, minFame = 25,
		summary = "병상과 기도를 오가는 수녀. 열병·사기 하락 25% 감소",
		perk = { healMult = 0.25 },
		battleLine = "환자는 제가 맡겠어요, 걱정 마세요!", winLine = "오늘도 모두 살아 있네요. 감사한 일이에요." },
	{ id = "t_monk", name = "승려 도겐", scholarId = "", role = "승려", fee = 320, minFame = 30,
		summary = "고요히 바다를 읽는 승려. 사기 하락 12% 감소, 항해 속도 +2%",
		perk = { healMult = 0.12, speedMult = 0.02 },
		battleLine = "마음이 흔들리면 키도 흔들립니다. 고요히!", winLine = "승패는 구름 같은 것. 그래도 이겨서 다행입니다." },
	{ id = "t_bhikkhuni", name = "비구니 묘선", scholarId = "", role = "비구니", fee = 320, minFame = 30,
		summary = "약초와 염불로 선원을 돌보는 비구니. 열병·사기 하락 20% 감소",
		perk = { healMult = 0.2 },
		battleLine = "아픈 이를 돌보는 것이 저의 싸움입니다.", winLine = "모두 무사하니 부처님께 감사드립니다." },
	{ id = "t_scribe", name = "필사자 이브라힘", scholarId = "", role = "필사자", fee = 340, minFame = 30,
		summary = "낯선 문자와 이야기를 옮겨 적는 필사자. 신화·지리 카드 발견 +10%",
		perk = { discoverFields = { "Myth", "Geography" }, discoverBonus = 0.1 },
		battleLine = "붓을 잡은 손으로도 방패는 들 수 있소!", winLine = "이 승리도 한 줄의 기록이 되겠구려." },
	{ id = "t_pilgrim", name = "순례자 하산", scholarId = "", role = "순례자", fee = 300, minFame = 25,
		summary = "먼 길을 걸어온 순례자. 항해 속도 +3%, 되파는 비율 +1%",
		perk = { speedMult = 0.03, sellBonus = 0.01 },
		battleLine = "먼 길을 걸었소. 이 정도 파도는 두렵지 않소!", winLine = "길 위의 모든 만남에 감사하오." },
	{ id = "t_navigator", name = "항해사 마르코", scholarId = "", role = "항해사", fee = 250, minFame = 20,
		summary = "별과 바람을 읽는 노련한 항해사. 항해 속도 +6%",
		perk = { speedMult = 0.06 },
		battleLine = "바람을 등지게 키를 돌리겠습니다!", winLine = "항로는 흔들리지 않았습니다, 선장님." },
	{ id = "t_gunner", name = "포수 아나", scholarId = "", role = "포수", fee = 300, minFame = 30,
		summary = "포대를 지휘하는 베테랑 포수. 포격 +8%",
		perk = { cannonMult = 0.08 },
		battleLine = "장전 완료! 신호만 주세요!", winLine = "적선 돛대가 부러지는 소리, 언제 들어도 좋군요." },
	{ id = "t_purser", name = "회계사 얀", scholarId = "", role = "회계사", fee = 280, minFame = 25,
		summary = "장부에 밝은 사무장. 되파는 비율 +2%",
		perk = { sellBonus = 0.02 },
		battleLine = "전투 비용은 나중에 청구하겠습니다... 지금은 숨으세요!", winLine = "노획품 목록은 제가 정리하겠습니다." },
	{ id = "t_surgeon", name = "의사 엘레나", scholarId = "", role = "의사", fee = 320, minFame = 35,
		summary = "선상 외과의. 열병·괴혈병 피해와 사기 하락이 절반",
		perk = { healMult = 0.5 },
		battleLine = "다친 사람은 제게 데려오세요!", winLine = "부상자 모두 무사합니다. 오늘은 운이 좋았어요." },
	{ id = "t_helmsman", name = "조타수 디에고", scholarId = "", role = "조타수", fee = 450, minFame = 50,
		summary = "키를 손에 익힌 베테랑 조타수. 항해 속도 +8%",
		perk = { speedMult = 0.08 },
		battleLine = "키를 꽉 잡았습니다. 파도 사이로 빠져나가겠습니다!", winLine = "배가 한 번도 휘청이지 않았죠." },
	{ id = "t_mate", name = "부선장 카트린", scholarId = "", role = "부선장", fee = 480, minFame = 55,
		summary = "선장 대신 배를 챙기는 부선장. 항해 속도 +3%, 되파는 비율 +1.5%",
		perk = { speedMult = 0.03, sellBonus = 0.015 },
		battleLine = "지휘는 제가 받겠습니다. 선장님은 앞만 보세요!", winLine = "선원들 모두 제자리에 있습니다, 선장님." },
	{ id = "t_boatswain", name = "갑판장 바스코", scholarId = "", role = "갑판장", fee = 420, minFame = 45,
		summary = "돛줄과 갑판을 호령하는 갑판장. 항해 속도 +3%, 포격 +3%",
		perk = { speedMult = 0.03, cannonMult = 0.03 },
		battleLine = "전원 갑판으로! 밧줄 단단히 잡아라!", winLine = "갑판이 엉망이군. 하지만 우리가 이겼다!" },
	{ id = "t_master_gunner", name = "포술장 이사벨", scholarId = "", role = "포술장", fee = 650, minFame = 65,
		summary = "수십 문의 포를 지휘하는 포술장. 포격 +12%",
		perk = { cannonMult = 0.12 },
		battleLine = "전 포문 조준! 제 신호에 맞춰 쏩니다!", winLine = "포열이 뜨겁군요. 오늘 포는 제 몫을 했습니다." },
	{ id = "h_england", name = "엘리너 렌", scholarId = "", role = "해류 학자", fee = 300, minFame = 10, requiresStory = "h_england_1", homePort = "london",
		summary = "왕립학회에서 논문을 거절당한 해류 학자. 꿈은 '증거를 바다에서 가져오는 것'. 항해 속도 +5%, 지리 카드 발견 +10%",
		perk = { speedMult = 0.05, discoverFields = { "Geography" }, discoverBonus = 0.1 },
		battleLine = "물살이 바뀝니다. 키를 왼쪽으로!", winLine = "관측 값이 정확했어요. 논문에 한 줄 더 쓸 수 있겠네요." },
	{ id = "h_netherlands", name = "얀 데 흐로트", scholarId = "", role = "독립 상인", fee = 320, minFame = 10, requiresStory = "h_netherlands_1", homePort = "amsterdam",
		summary = "회사 서기의 아들. 길드의 독점을 뚫고 자기 상사를 세우려는 꿈이 있다. 되파는 비율 +4%",
		perk = { sellBonus = 0.04 },
		battleLine = "비용은 제가 계산하겠습니다!", winLine = "이번 전리품 장부, 제가 정리하죠." },
	{ id = "h_france", name = "마리온 델라크루아", scholarId = "", role = "몰락 귀족", fee = 330, minFame = 12, requiresStory = "h_france_1", homePort = "rouen",
		summary = "빚으로 영지를 잃은 귀족 가문의 딸. 꿈은 가문의 깃발을 다시 거는 것. 되파는 비율 +3%, 사기 하락 10% 감소",
		perk = { sellBonus = 0.03, healMult = 0.1 },
		battleLine = "가문의 이름을 걸고 물러서지 않겠어요!", winLine = "영지의 깃발이 한 걸음 가까워졌군요." },
	{ id = "h_ottoman", name = "레일라 하미디", scholarId = "", role = "향신료 상인", fee = 320, minFame = 10, requiresStory = "h_ottoman_1", homePort = "istanbul",
		summary = "향신료 가문의 딸. 막힌 홍해 길 대신 직접 항로를 여는 것이 꿈. 되파는 비율 +3%, 항해 속도 +2%",
		perk = { sellBonus = 0.03, speedMult = 0.02 },
		battleLine = "상인의 눈으로 허점을 보죠!", winLine = "향신료 향이 승리의 냄새 같군요." },
	{ id = "h_swahili", name = "아민 살림", scholarId = "", role = "계절풍 선장", fee = 300, minFame = 10, requiresStory = "h_swahili_1", homePort = "zanzibar",
		summary = "계절풍을 읽는 젊은 선장. 바람의 이름으로 인도양에 길을 내는 것이 꿈. 항해 속도 +7%",
		perk = { speedMult = 0.07 },
		battleLine = "돛을 올려라! 바람이 우리 편이다!", winLine = "바람이 우리를 지켜 줬군요." },
	{ id = "h_malabar", name = "라마 나이르", scholarId = "", role = "후추 농부", fee = 300, minFame = 10, requiresStory = "h_malabar_1", homePort = "calicut",
		summary = "풍년인데도 값이 후려쳐지는 현실을 바꾸려는 농부. 되파는 비율 +4%, 열병·사기 하락 10% 감소",
		perk = { sellBonus = 0.04, healMult = 0.1 },
		battleLine = "마을의 땀이 걸렸다, 물러설 수 없소!", winLine = "이 후추 한 알에 마을의 희망이 있소." },
	{ id = "h_japan", name = "사쿠라이 하루카", scholarId = "", role = "지식 여행자", fee = 330, minFame = 12, requiresStory = "h_japan_1", homePort = "nagasaki",
		summary = "닫힌 항구에서 바다 너머를 바라보는 여행자. 꿈은 바다 건너 지식을 가지고 돌아오는 것. 식물·지리 카드 발견 +12%",
		perk = { discoverFields = { "Botany", "Geography" }, discoverBonus = 0.12 },
		battleLine = "조용히, 그리고 정확하게!", winLine = "새로운 풍경이 또 하나 늘었네요." },
	{ id = "h_new_spain", name = "페르난도 모랄레스", scholarId = "", role = "은광 감독", fee = 330, minFame = 12, requiresStory = "h_new_spain_1", homePort = "veracruz",
		summary = "은광 마을 출신. 은이 본국으로만 흘러가는 현실을 바꾸려는 꿈이 있다. 포격 +5%, 되파는 비율 +2%",
		perk = { cannonMult = 0.05, sellBonus = 0.02 },
		battleLine = "광산에서 배운 건 버티는 거요!", winLine = "은의 길이 조금 더 열렸군." },
	{ id = "h_portugal", name = "이네스 카브랄", scholarId = "", role = "항해학교 수석", fee = 320, minFame = 10, requiresStory = "h_portugal_1", homePort = "lisbon",
		summary = "항해학교를 갓 졸업한 수석. 아프리카 서안에서 끊긴 선배들의 일지를 인도까지 잇는 것이 꿈. 항해 속도 +5%, 지리 카드 발견 +8%",
		perk = { speedMult = 0.05, discoverFields = { "Geography" }, discoverBonus = 0.08 },
		battleLine = "도선 규칙대로 갑니다!", winLine = "끊겼던 일지가 한 줄 늘었어요." },
	{ id = "n_england", name = "조수 윌", scholarId = "", role = "관측 조수", fee = 0, minFame = 0, nation = "england",
		summary = "관측 기구를 든 어린 조수. 항해 속도 +4%",
		perk = { speedMult = 0.04 },
		battleLine = "바람 방향 기록했습니다, 선장님!", winLine = "관측 값이 정확했어요. 논문에 넣을 수 있겠어요." },
	{ id = "n_netherlands", name = "장부원 피터", scholarId = "", role = "장부원", fee = 0, minFame = 0, nation = "netherlands",
		summary = "숫자에 밝은 젊은 장부원. 되파는 비율 +2%",
		perk = { sellBonus = 0.02 },
		battleLine = "전투 비용은 제가 기록하겠습니다!", winLine = "노획품 정리는 제 몫이죠." },
	{ id = "n_france", name = "시종 로랑", scholarId = "", role = "옛 영지 시종", fee = 0, minFame = 0, nation = "france",
		summary = "가문을 모시던 충직한 시종. 열병·사기 하락 30% 감소",
		perk = { healMult = 0.3 },
		battleLine = "선장님, 제 뒤로 서세요!", winLine = "선장님이 무사하시니 그걸로 충분합니다." },
	{ id = "n_portugal", name = "도선사 페드루", scholarId = "", role = "동기 도선사", fee = 0, minFame = 0, nation = "portugal",
		summary = "항해학교 동기 도선사. 항해 속도 +5%",
		perk = { speedMult = 0.05 },
		battleLine = "키는 제게 맡겨!", winLine = "우리가 해냈어, 선장!" },
	{ id = "n_ottoman", name = "대상 상인 카심", scholarId = "", role = "베테랑 대상 상인", fee = 0, minFame = 0, nation = "ottoman",
		summary = "사막과 바다를 오간 노련한 상인. 되파는 비율 +2%",
		perk = { sellBonus = 0.02 },
		battleLine = "상인이라고 칼을 못 쥐는 건 아니오!", winLine = "전리품은 공정하게 나눕시다." },
	{ id = "n_swahili", name = "젊은 선원 주마", scholarId = "", role = "다우선 선원", fee = 0, minFame = 0, nation = "swahili",
		summary = "계절풍을 몸으로 아는 선원. 항해 속도 +5%",
		perk = { speedMult = 0.05 },
		battleLine = "돛을 올려라! 바람이 우리 편이다!", winLine = "바람이 우릴 지켜줬어!" },
	{ id = "n_malabar", name = "후추 농부 쿠티", scholarId = "", role = "농부 대표", fee = 0, minFame = 0, nation = "malabar",
		summary = "마을의 후추를 맡긴 농부 대표. 되파는 비율 +3%",
		perk = { sellBonus = 0.03 },
		battleLine = "고향 마을을 생각하면 겁날 게 없소!", winLine = "이 후추 한 알에 마을의 희망이 있소." },
	{ id = "n_japan", name = "사무라이 겐지", scholarId = "", role = "낭인 무사", fee = 0, minFame = 0, nation = "japan",
		summary = "항구에서 만난 낭인 무사. 포격 +8%",
		perk = { cannonMult = 0.08 },
		battleLine = "칼은 바다에서도 무뎌지지 않소!", winLine = "승패는 병가지상사. 하지만 오늘은 이겼소." },
	{ id = "n_new_spain", name = "광부 출신 마테오", scholarId = "", role = "광산 출신 선원", fee = 0, minFame = 0, nation = "new_spain",
		summary = "광산에서 단련된 힘센 선원. 포격 +6%",
		perk = { cannonMult = 0.06 },
		battleLine = "곡괭이 대신 대포를 잡아도 힘은 같소!", winLine = "이 정도면 광산 폭발보다 쉽소." },
}

local SpecialtyById: { [string]: Specialty } = {}
for _, s in Specialties do
	SpecialtyById[s.id] = s
end
-- 배의 자리: 한 자리에 동료 한 명. 자기 직책에 앉으면 효과 x1.2, 엉뚱한 자리에 앉으면 x0.6.
export type Station = { id: string, name: string, summary: string }
local Stations: { Station } = {
	{ id = "helm", name = "조타수", summary = "키를 잡는 자리. 항해와 길 찾기에 어울려요" },
	{ id = "mate", name = "부선장", summary = "선장을 돕는 자리. 장부·보급·사람 관리에 어울려요" },
	{ id = "boatswain", name = "갑판장", summary = "갑판 일과 선원들을 이끄는 자리. 백병전과 사기에 어울려요" },
	{ id = "gunner", name = "포술장", summary = "포와 전투를 맡는 자리. 포격과 전투 계산에 어울려요" },
	{ id = "surgeon", name = "선의", summary = "선원의 몸을 돌보는 자리. 열병·괴혈병에 어울려요" },
	{ id = "scholar", name = "학자", summary = "관찰과 기록을 맡는 자리. 발견과 도감에 어울려요" },
}
local StationById: { [string]: Station } = {}
for _, st in Stations do
	StationById[st.id] = st
end
-- 동료마다 가장 잘 맞는 자리 (게임 설정)
local CompanionStation: { [string]: string } = {
	c_merian = "scholar", c_halley = "helm", c_leeuwenhoek = "surgeon", c_linnaeus = "scholar", c_boyle = "scholar",
	c_papin = "gunner", c_newton = "gunner", c_huygens = "helm", c_harrison = "helm", c_banks = "scholar",
	c_lind = "surgeon", c_wren = "boatswain", c_franklin = "scholar", c_galileo = "gunner",
	t_navigator = "helm", t_gunner = "gunner", t_purser = "mate", t_surgeon = "surgeon",
	h_england = "mate", h_netherlands = "mate", h_france = "mate", h_ottoman = "mate", h_swahili = "helm", h_malabar = "boatswain", h_japan = "mate", h_new_spain = "gunner", h_portugal = "helm",
	t_priest = "mate", t_nun = "mate", t_monk = "boatswain", t_bhikkhuni = "mate", t_scribe = "mate", t_pilgrim = "helm",
	t_helmsman = "helm", t_mate = "mate", t_boatswain = "boatswain", t_master_gunner = "gunner",
	n_england = "scholar", n_netherlands = "mate", n_france = "mate", n_portugal = "helm", n_ottoman = "mate",
	n_swahili = "boatswain", n_malabar = "boatswain", n_japan = "boatswain", n_new_spain = "boatswain",
}

local CompanionById: { [string]: Companion } = {}
for _, c in Companions do
	CompanionById[c.id] = c
end

-- 출신 성분: 새 게임에서 하나를 고른다. 시작 자금·명성과 평생 가는 작은 혜택이 달라진다.
local Origins: { { id: string, name: string, story: string, perkText: string, coins: number, fame: number, supplies: number?, perk: { [string]: any }? } } = {
	{ id = "farmer", name = "농부 집안", story = "흙과 계절을 알고, 굶주림을 견딘다", perkText = "치료 효과 +8% · 식량 +15", coins = 0, fame = 0, supplies = 15, perk = { healMult = 0.08 } },
	{ id = "noble", name = "몰락한 귀족 집안", story = "가문의 이름과 남은 재산이 있다", perkText = "시작 자금 +400 · 명성 +12", coins = 400, fame = 12 },
	{ id = "merchant", name = "상인 집안", story = "어릴 때부터 장부와 흥정에 익숙하다", perkText = "판매 값 +4% · 시작 자금 +100", coins = 100, fame = 0, perk = { sellBonus = 0.04 } },
	{ id = "sailor", name = "뱃사람 집안", story = "바람과 파도를 읽는 눈이 있다", perkText = "항해 속도 +4%", coins = 0, fame = 0, perk = { speedMult = 0.04 } },
	{ id = "soldier", name = "군인 집안", story = "화약과 규율을 안다", perkText = "대포 위력 +8%", coins = 0, fame = 0, perk = { cannonMult = 0.08 } },
	{ id = "scholar", name = "학자 집안", story = "책과 편지 속에서 자랐다", perkText = "식물·동물·지리 카드 발견 +10% · 명성 +5", coins = 0, fame = 5, perk = { discoverFields = { "Botany", "Zoology", "Geography" }, discoverBonus = 0.1 } },
	{ id = "cook", name = "요리사 집안", story = "부엌에서 자라 식량 다루는 법을 안다", perkText = "식량 +25 · 사기 하락 10% 감소", coins = 0, fame = 0, supplies = 25, perk = { healMult = 0.1 } },
	{ id = "doctor", name = "의사 집안", story = "약초와 붕대 냄새 속에서 자랐다", perkText = "치료 효과 +20%", coins = 0, fame = 0, perk = { healMult = 0.2 } },
	{ id = "craftsman", name = "장인 집안", story = "대장간과 목공소에서 손기술을 익혔다", perkText = "항해 속도 +2% · 대포 위력 +3% · 시작 자금 +150", coins = 150, fame = 0, perk = { speedMult = 0.02, cannonMult = 0.03 } },
	{ id = "clergy", name = "성직자 집안", story = "교회와 사원의 종소리 속에서 자랐다", perkText = "명성 +8 · 치료 효과 +8%", coins = 0, fame = 8, perk = { healMult = 0.08 } },
}
local OriginById = {}
for _, o in Origins do
	OriginById[o.id] = o
end

-- 동료·인물 초상화 시트 (5열, 칸 256x336). 값은 칸 수. 시트 이름은 Portraits/companions_<이름>
local PortraitSheets = {
	north_atlantic = 20, mediterranean = 20, west_africa = 20, east_africa_red_sea = 20, oceania = 20,
	faith_christian = 20, faith_buddhist = 20, faith_indian_ocean = 10,
	africa = 20, americas = 20, atlantic = 20, indian = 20, pacific = 20,
}
-- 해역(Regions)별로 어울리는 시트
local RegionSheets = {
	north_sea = "north_atlantic", atlantic_europe = "north_atlantic", mediterranean = "mediterranean",
	west_africa = "west_africa", east_africa = "east_africa_red_sea", red_sea = "east_africa_red_sea",
	americas = "americas", south_asia = "indian", east_asia = "pacific", southeast_asia = "pacific",
}

-- 국가(세력)와 역사 속 전쟁, 그리고 바다를 오가는 다른 항해자들 -----------------------------
-- 세력: 항구의 country 가 어느 세력에 속하는지. 속하지 않은 곳은 중립(자유 항구)이다.
local Powers = {
	{ id = "england", name = "영국" }, { id = "spain", name = "에스파냐" }, { id = "portugal", name = "포르투갈" },
	{ id = "netherlands", name = "네덜란드" }, { id = "france", name = "프랑스" }, { id = "ottoman", name = "오스만 제국" },
	{ id = "venice", name = "베네치아" }, { id = "denmark", name = "덴마크" }, { id = "sweden", name = "스웨덴" },
	{ id = "hanse", name = "한자 도시" }, { id = "japan", name = "일본" }, { id = "china", name = "중국·조선" },
	{ id = "swahili", name = "스와힐리·오만" }, { id = "malabar", name = "말라바르" },
}
local PowerName: { [string]: string } = {}
for _, p in Powers do
	PowerName[p.id] = p.name
end
local PowerCountries: { [string]: { string } } = {
	england = { "england", "scotland", "ireland", "new_england", "pennsylvania", "carolina", "jamaica", "barbados", "bahamas" },
	spain = { "spain", "new_spain", "cuba", "hispaniola", "puerto_rico", "venezuela", "new_granada", "panama", "quito", "peru", "chile", "rio_de_la_plata", "philippines", "canary", "mallorca", "sardinia", "naples", "sicily" },
	portugal = { "portugal", "brazil", "madeira", "azores", "cape_verde", "sao_tome", "angola", "mozambique", "portuguese_india", "macau" },
	netherlands = { "netherlands", "new_netherland", "suriname" },
	france = { "france", "new_france", "louisiana" },
	ottoman = { "ottoman", "egypt", "levant", "tunisia", "algeria", "tripoli", "greece", "rhodes", "cyprus", "hejaz", "yemen", "mesopotamia" },
	venice = { "venice", "dalmatia" },
	denmark = { "denmark", "norway" },
	sweden = { "sweden", "finland", "estonia", "livonia" },
	hanse = { "germany", "gotland" },
	japan = { "japan" },
	china = { "china", "korea", "formosa" },
	swahili = { "swahili", "somalia", "oman" },
	malabar = { "malabar" },
}
local CountryPower: { [string]: string } = {}
for power, list in PowerCountries do
	for _, c in list do
		CountryPower[c] = power
	end
end
-- 게임 속 출신 국가 → 세력 (누에바 에스파냐는 에스파냐 편)
local NationPower = { new_spain = "spain" }

-- 전쟁: a 편과 b 편의 세력들, 시작·끝 해(from~to). 전쟁 중에는 양쪽 세력의 항구에서 무기·건축 자재 수요가 늘고,
-- 우리 세력과 싸우는 나라의 항구에 들어가면 입항세를 문다.
local Wars = {
	{ id = "w_eighty", title = "에스파냐-네덜란드 80년 전쟁", a = { "spain" }, b = { "netherlands" }, from = 1568, to = 1648, text = "바다 거지들이 에스파냐의 항구와 은 함대를 노린다." },
	{ id = "w_armada", title = "영국-에스파냐 전쟁", a = { "england" }, b = { "spain" }, from = 1585, to = 1604, text = "무적함대가 영국 해협으로 향하고, 사략선이 대서양을 가른다." },
	{ id = "w_ottoman_venice1", title = "프레베자·키프로스 전쟁", a = { "ottoman" }, b = { "venice", "spain" }, from = 1537, to = 1573, text = "지중해의 패권을 놓고 갤리 함대가 맞붙는다. 레판토 해전이 그 끝자락이다." },
	{ id = "w_dutch_port", title = "네덜란드-포르투갈 해상 전쟁", a = { "netherlands" }, b = { "portugal" }, from = 1602, to = 1661, text = "향신료 항구마다 동인도회사와 포르투갈 요새가 맞선다." },
	{ id = "w_thirty", title = "30년 전쟁", a = { "france", "sweden", "netherlands" }, b = { "spain" }, from = 1618, to = 1648, text = "유럽 대륙의 전쟁이 곡물과 철 값을 흔든다." },
	{ id = "w_danish_swedish", title = "덴마크-스웨덴 발트 전쟁", a = { "denmark" }, b = { "sweden" }, from = 1611, to = 1721, text = "발트해의 해협 통행권을 놓고 두 왕국이 거듭 싸운다." },
	{ id = "w_ottoman_venice2", title = "크레타 전쟁", a = { "ottoman" }, b = { "venice" }, from = 1645, to = 1669, text = "칸디아 요새를 둘러싼 25년의 포위전." },
	{ id = "w_anglo_dutch", title = "영국-네덜란드 전쟁", a = { "england" }, b = { "netherlands" }, from = 1652, to = 1674, text = "항해법을 둘러싸고 두 상업 강국이 북해에서 싸운다." },
	{ id = "w_franco_dutch", title = "프랑스-네덜란드 전쟁", a = { "france" }, b = { "netherlands" }, from = 1672, to = 1678, text = "프랑스 군이 저지대를 치고, 암스테르담은 제방을 터뜨려 맞선다." },
	{ id = "w_nine_years", title = "9년 전쟁", a = { "france" }, b = { "england", "netherlands", "spain" }, from = 1689, to = 1697, text = "대동맹이 프랑스의 해군과 상선을 노린다." },
	{ id = "w_succession", title = "에스파냐 왕위 계승 전쟁", a = { "france", "spain" }, b = { "england", "netherlands", "portugal" }, from = 1702, to = 1713, text = "왕위를 둘러싸고 유럽 전체가 편을 갈랐다. 지브롤터가 영국 손에 넘어간다." },
	{ id = "w_great_northern", title = "대북방 전쟁", a = { "sweden" }, b = { "denmark", "hanse" }, from = 1700, to = 1721, text = "카를 12세의 스웨덴이 발트해 패권을 걸고 싸운다." },
	{ id = "w_jenkins", title = "젱킨스의 귀 전쟁", a = { "england" }, b = { "spain" }, from = 1739, to = 1748, text = "카리브해에서 밀수 단속선과 영국 상선이 충돌한다." },
	{ id = "w_seven_years", title = "7년 전쟁", a = { "england", "portugal" }, b = { "france", "spain" }, from = 1756, to = 1763, text = "북미·카리브·인도까지 번진 최초의 세계 전쟁." },
	{ id = "w_american", title = "미국 독립 전쟁", a = { "england" }, b = { "france", "spain", "netherlands" }, from = 1778, to = 1783, text = "프랑스 함대가 영국 해상 보급선을 끊으려 한다." },
	{ id = "w_swahili_portugal1", title = "포르투갈의 동아프리카 정복", a = { "portugal" }, b = { "swahili" }, from = 1505, to = 1512, text = "킬와와 몸바사가 포르투갈 함대의 포격을 받는다." },
	{ id = "w_malabar_portugal", title = "사무티리-포르투갈 전쟁", a = { "portugal" }, b = { "malabar" }, from = 1500, to = 1513, text = "캘리컷의 사무티리가 후추 항구를 지키려 포르투갈과 싸운다." },
	{ id = "w_oman_portugal", title = "오만-포르투갈 전쟁", a = { "portugal" }, b = { "swahili" }, from = 1650, to = 1698, text = "오만 함대가 무스카트에서 몸바사까지 포르투갈 요새를 하나씩 무너뜨린다." },
	{ id = "w_imjin", title = "임진왜란", a = { "japan" }, b = { "china" }, from = 1592, to = 1598, text = "일본군이 조선에 상륙하고, 이순신의 수군이 남해를 막아선다." },
}
-- 전쟁 때 값이 오르는 물자
local WarGoods = { "iron", "timber", "coal", "cloth" }

-- 다른 항해자들: 정해진 항로를 돌며 항구에 머문다 (날짜만으로 위치가 정해져 누구에게나 같다).
-- circuit: 오가는 항구들, stay: 항구에 머무는 날, leg: 한 구간 항해 날수, from/to: 활동 연도(게임 속)
local Voyagers = {
	{ id = "v_hendrik", name = "헨드릭 판 데르 불", role = "merchant", power = "netherlands", circuit = { "amsterdam", "lisbon", "venice", "istanbul" }, stay = 5, leg = 14 },
	{ id = "v_maria", name = "마리아 데 소사", role = "merchant", power = "portugal", circuit = { "lisbon", "luanda", "salvador", "lisbon" }, stay = 6, leg = 20 },
	{ id = "v_giovanni", name = "조반니 모체니고", role = "merchant", power = "venice", circuit = { "venice", "alexandria", "istanbul", "ragusa" }, stay = 5, leg = 12 },
	{ id = "v_ahmed", name = "아흐메드 레이스", role = "merchant", power = "ottoman", circuit = { "istanbul", "alexandria", "jeddah", "aden" }, stay = 5, leg = 14 },
	{ id = "v_nakamura", name = "나카무라 젠에몬", role = "merchant", power = "japan", circuit = { "nagasaki", "macau", "hoi_an", "nagasaki" }, stay = 6, leg = 16 },
	{ id = "v_suleiman", name = "술레이만 알 하르티", role = "merchant", power = "swahili", circuit = { "zanzibar", "mombasa", "muscat", "calicut" }, stay = 5, leg = 15 },
	{ id = "v_vasco", name = "바스쿠 아폰수", role = "explorer", power = "portugal", circuit = { "lisbon", "funchal", "cape_town", "mozambique", "goa" }, stay = 4, leg = 24, from = 1500 },
	{ id = "v_anne", name = "앤 윌러비", role = "explorer", power = "england", circuit = { "plymouth", "st_johns", "boston", "kingston" }, stay = 4, leg = 22 },
	{ id = "v_cartier", name = "자크 드 라 로셸", role = "explorer", power = "france", circuit = { "la_rochelle", "quebec", "new_orleans", "la_rochelle" }, stay = 4, leg = 22 },
	{ id = "v_diego", name = "디에고 데 라 베가", role = "soldier", power = "spain", circuit = { "seville", "havana", "veracruz", "cartagena_indias" }, stay = 7, leg = 22 },
	{ id = "v_hartmann", name = "하르트만 소령", role = "soldier", power = "sweden", circuit = { "stockholm", "riga", "gdansk", "gothenburg" }, stay = 6, leg = 9 },
	{ id = "v_james", name = "제임스 퀸 대위", role = "soldier", power = "england", circuit = { "hull", "gibraltar", "valletta", "plymouth" }, stay = 6, leg = 12 },
	{ id = "v_beatrice", name = "베아트리스 드 몽모랑시", role = "soldier", power = "france", circuit = { "toulon", "algiers", "marseille", "rouen" }, stay = 5, leg = 10 },
	{ id = "v_barbarossa", name = "카라 알리 레이스", role = "privateer", power = "ottoman", circuit = { "algiers", "tunis", "tripoli", "valletta" }, stay = 4, leg = 7 },
	{ id = "v_drake", name = "에드워드 퍼셀", role = "privateer", power = "england", circuit = { "plymouth", "las_palmas", "nassau", "kingston" }, stay = 4, leg = 16 },
	{ id = "v_dirk", name = "디르크 데 즈바르트", role = "privateer", power = "netherlands", circuit = { "rotterdam", "cadiz", "cape_town", "batavia" }, stay = 4, leg = 22 },
	{ id = "v_red", name = "붉은 수염 안젤로", role = "pirate", power = "none", circuit = { "nassau", "port_of_spain", "bridgetown", "santo_domingo" }, stay = 3, leg = 8 },
	{ id = "v_jade", name = "옥빛 장 부인", role = "pirate", power = "none", circuit = { "canton", "macau", "hoi_an", "malacca" }, stay = 3, leg = 10 },
	{ id = "v_tomas", name = "토마스 신부", role = "pilgrim", power = "spain", circuit = { "seville", "manila", "macau", "nagasaki" }, stay = 8, leg = 30 },
}
local VoyagerById = {}
for _, v in Voyagers do
	VoyagerById[v.id] = v
end

return {
	Powers = Powers, PowerName = PowerName, CountryPower = CountryPower, NationPower = NationPower, Wars = Wars, WarGoods = WarGoods,
	Voyagers = Voyagers, VoyagerById = VoyagerById,
	PortraitSheets = PortraitSheets,
	RegionSheets = RegionSheets,
	Origins = Origins,
	OriginById = OriginById,
	Specialties = Specialties,
	SpecialtyById = SpecialtyById,
	Companions = Companions,
	CompanionById = CompanionById,
	Stations = Stations,
	StationById = StationById,
	CompanionStation = CompanionStation,
	STATION_MATCH = 1.2,
	VACANT_SPEED = -0.02,
	VACANT_CANNON = -0.02,
	STATION_MISMATCH = 0.6,
	MAX_SLOTS = 6,
	-- 배 등급별로 함께할 수 있는 동료 수 (캐러벨·플루트 2, 프리깃·갈레온 4, 증기선 5, 철갑선 6)
	slotsFor = function(shipClass: number): number
		if shipClass >= 4 then
			return 6
		elseif shipClass == 3 then
			return 5
		elseif shipClass == 2 then
			return 4
		end
		return 2
	end,
	MAX_AFFINITY = 100,
	-- 호감도 단계: 0~29 낯선 사이(x1.0), 30~69 믿는 사이(x1.15), 70 이상 오랜 벗(x1.3)
	affinityTier = function(affinity: number): number
		if affinity >= 70 then
			return 3
		elseif affinity >= 30 then
			return 2
		end
		return 1
	end,
	affinityMult = function(affinity: number): number
		if affinity >= 70 then
			return 1.3
		elseif affinity >= 30 then
			return 1.15
		end
		return 1
	end,
	MAX_LEVEL = 5,
	SKILL_LEVEL = 3, -- 전문 분야 전용 스킬이 열리는 전문 레벨
	-- 전문 레벨 L 의 보너스 배율: 1.0, 1.2, 1.4, 1.6, 1.8
	levelMult = function(level: number): number
		return 1 + 0.2 * (math.clamp(level, 1, 5) - 1)
	end,
	xpForNext = function(level: number): number
		return math.floor(40 * level ^ 1.5)
	end,
	CHANGE_FEE = 200, -- 전문 분야를 바꿀 때의 비용 (처음 고를 때는 무료)
	MAX_COMPANIONS = 2,
}
