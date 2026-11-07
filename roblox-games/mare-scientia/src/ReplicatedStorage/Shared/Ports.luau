--!strict
-- 항구, 상품, 나라 데이터. 좌표는 위도/경도(도)이며 항해 거리 계산에 쓴다.

export type Good = {
	id: string,
	name: string,
	basePrice: number,
}

export type Port = {
	id: string,
	name: string,
	country: string,
	lat: number,
	lon: number,
	produces: { string }, -- 싸게 파는 품목
	demands: { string }, -- 비싸게 사는 품목
	shipyard: boolean,
}

export type Nation = {
	id: string,
	name: string,
	startPort: string,
	summary: string,
	speedMult: number, -- 항해 속도 배율
	sellBonus: number, -- 판매 비율 추가
	startCoins: number, -- 시작 코인 추가
	adventureXpMult: number,
	battleXpMult: number,
	hidden: boolean?, -- 새 게임 선택에서 숨김 (옛 저장 호환용)
}

local Goods: { [string]: Good } = {
	wool = { id = "wool", name = "양모", basePrice = 40 },
	coal = { id = "coal", name = "석탄", basePrice = 20 },
	spice = { id = "spice", name = "향신료", basePrice = 120 },
	cheese = { id = "cheese", name = "치즈", basePrice = 35 },
	wine = { id = "wine", name = "와인", basePrice = 80 },
	cloth = { id = "cloth", name = "직물", basePrice = 60 },
	amber = { id = "amber", name = "호박", basePrice = 150 },
	fish = { id = "fish", name = "생선", basePrice = 15 },
	iron = { id = "iron", name = "철", basePrice = 50 },
	timber = { id = "timber", name = "목재", basePrice = 25 },
	salt = { id = "salt", name = "소금", basePrice = 18 },
	fur = { id = "fur", name = "모피", basePrice = 110 },
	glass = { id = "glass", name = "유리", basePrice = 70 },
	beer = { id = "beer", name = "맥주", basePrice = 30 },
	sugar = { id = "sugar", name = "설탕", basePrice = 65 },
	tea = { id = "tea", name = "차", basePrice = 130 },
	olive_oil = { id = "olive_oil", name = "올리브유", basePrice = 55 },
	silk = { id = "silk", name = "비단", basePrice = 160 },
	linen = { id = "linen", name = "리넨", basePrice = 55 },
	whale_oil = { id = "whale_oil", name = "고래기름", basePrice = 75 },
	tin = { id = "tin", name = "주석", basePrice = 60 },
	porcelain = { id = "porcelain", name = "도자기", basePrice = 170 },
	coffee = { id = "coffee", name = "커피", basePrice = 100 },
	tobacco = { id = "tobacco", name = "담배", basePrice = 90 },
	marble = { id = "marble", name = "대리석", basePrice = 85 },
	coral = { id = "coral", name = "산호", basePrice = 140 },
	saffron = { id = "saffron", name = "사프란", basePrice = 190 },
	carpet = { id = "carpet", name = "융단", basePrice = 120 },
	incense = { id = "incense", name = "유향", basePrice = 150 },
	dates = { id = "dates", name = "대추야자", basePrice = 45 },
	raisins = { id = "raisins", name = "건포도", basePrice = 50 },
	pearls = { id = "pearls", name = "진주", basePrice = 220 },
	ivory = { id = "ivory", name = "상아", basePrice = 200 },
	pepper = { id = "pepper", name = "후추", basePrice = 140 },
	cotton = { id = "cotton", name = "면화", basePrice = 45 },
	leather = { id = "leather", name = "가죽", basePrice = 60 },
	gold = { id = "gold", name = "금가루", basePrice = 260 },
	palm_oil = { id = "palm_oil", name = "야자유", basePrice = 55 },
	gum_arabic = { id = "gum_arabic", name = "아라비아 고무", basePrice = 80 },
	ebony = { id = "ebony", name = "흑단", basePrice = 130 },
	feathers = { id = "feathers", name = "타조 깃털", basePrice = 110 },
	cloves = { id = "cloves", name = "정향", basePrice = 230 },
	nutmeg = { id = "nutmeg", name = "육두구", basePrice = 240 },
	cinnamon = { id = "cinnamon", name = "계피", basePrice = 160 },
	indigo = { id = "indigo", name = "인디고", basePrice = 110 },
	rice = { id = "rice", name = "쌀", basePrice = 35 },
	gems = { id = "gems", name = "보석", basePrice = 320 },
	lacquer = { id = "lacquer", name = "칠기", basePrice = 150 },
	camphor = { id = "camphor", name = "장뇌", basePrice = 120 },
	sake = { id = "sake", name = "청주", basePrice = 70 },
	jade = { id = "jade", name = "옥", basePrice = 300 },
	ginseng = { id = "ginseng", name = "인삼", basePrice = 210 },
	copper = { id = "copper", name = "구리", basePrice = 75 },
	silver = { id = "silver", name = "은", basePrice = 250 },
	sandalwood = { id = "sandalwood", name = "백단향", basePrice = 170 },
	cocoa = { id = "cocoa", name = "카카오", basePrice = 120 },
	mahogany = { id = "mahogany", name = "마호가니", basePrice = 140 },
	rum = { id = "rum", name = "럼", basePrice = 65 },
	logwood = { id = "logwood", name = "로그우드", basePrice = 95 },
	cochineal = { id = "cochineal", name = "코치닐", basePrice = 260 },
	maize = { id = "maize", name = "옥수수", basePrice = 30 },
	vanilla = { id = "vanilla", name = "바닐라", basePrice = 270 },
	brazilwood = { id = "brazilwood", name = "브라질나무", basePrice = 110 },
	kauri = { id = "kauri", name = "카우리 목재", basePrice = 100 },
	sealskin = { id = "sealskin", name = "물개 가죽", basePrice = 120 },
	sandalwood_hi = { id = "sandalwood_hi", name = "하와이 백단", basePrice = 190 },
	pearl_shell = { id = "pearl_shell", name = "진주 자개", basePrice = 130 },
	guano = { id = "guano", name = "구아노", basePrice = 50 },
	nitrate = { id = "nitrate", name = "초석", basePrice = 70 },
	ambergris = { id = "ambergris", name = "용연향", basePrice = 280 },
}

local Ports: { [string]: Port } = {
	london = {
		id = "london", name = "런던", country = "england", lat = 51.51, lon = -0.13,
		produces = { "wool", "coal", "tin" }, demands = { "spice", "wine", "amber", "tea", "silk", "porcelain", "whale_oil", "marble", "coral", "saffron", "carpet", "dates", "raisins", "cotton", "leather", "ivory", "pepper", "pearls", "gold", "palm_oil", "gum_arabic", "ebony", "feathers", "cloves", "nutmeg", "cinnamon", "indigo", "rice", "gems", "ambergris", "lacquer", "camphor", "jade", "ginseng", "copper", "sandalwood", "cocoa", "mahogany", "rum", "logwood", "cochineal", "maize", "vanilla", "brazilwood", "kauri", "sealskin", "pearl_shell", "guano", "nitrate" }, shipyard = true,
	},
	amsterdam = {
		id = "amsterdam", name = "암스테르담", country = "netherlands", lat = 52.37, lon = 4.90,
		produces = { "spice", "cheese", "tea", "porcelain" }, demands = { "wool", "timber", "iron", "tobacco", "whale_oil", "marble", "coral", "carpet", "dates", "cotton", "leather", "ivory", "pepper", "pearls", "gold", "palm_oil", "gum_arabic", "ebony", "feathers", "cloves", "nutmeg", "cinnamon", "indigo", "rice", "gems", "ambergris", "lacquer", "camphor", "ginseng", "copper", "sandalwood", "cocoa", "mahogany", "rum", "logwood", "cochineal", "vanilla", "brazilwood", "kauri", "sealskin", "pearl_shell", "guano", "nitrate" }, shipyard = true,
	},
	rouen = {
		id = "rouen", name = "루앙", country = "france", lat = 49.44, lon = 1.10,
		produces = { "wine", "cloth", "salt", "tin" }, demands = { "coal", "fish", "iron", "incense", "cotton", "leather", "palm_oil", "indigo", "ambergris", "logwood", "cochineal", "vanilla", "brazilwood", "guano", "nitrate" }, shipyard = true,
	},
	copenhagen = {
		id = "copenhagen", name = "코펜하겐", country = "denmark", lat = 55.68, lon = 12.57,
		produces = { "amber", "fish", "beer", "whale_oil" }, demands = { "wine", "cloth", "spice", "porcelain", "marble", "carpet", "leather", "pepper", "ebony", "nutmeg", "mahogany" }, shipyard = true,
	},
	gothenburg = {
		id = "gothenburg", name = "예테보리", country = "sweden", lat = 57.71, lon = 11.97,
		produces = { "iron", "timber", "fish" }, demands = { "cheese", "wine", "cloth", "tobacco" }, shipyard = true,
	},
	antwerp = {
		id = "antwerp", name = "안트베르펀", country = "netherlands", lat = 51.22, lon = 4.40,
		produces = { "glass", "cloth", "linen" }, demands = { "wool", "wine", "sugar", "saffron", "incense", "cotton", "gum_arabic", "camphor", "logwood", "nitrate" }, shipyard = false,
	},
	hamburg = {
		id = "hamburg", name = "함부르크", country = "germany", lat = 53.55, lon = 9.99,
		produces = { "beer", "cloth" }, demands = { "fish", "fur", "sugar", "olive_oil", "whale_oil", "porcelain", "marble", "saffron", "carpet", "dates", "cotton", "pepper", "palm_oil", "cloves", "indigo", "copper", "cocoa", "kauri", "guano", "nitrate" }, shipyard = false,
	},
	bergen = {
		id = "bergen", name = "베르겐", country = "norway", lat = 60.39, lon = 5.32,
		produces = { "fish", "fur", "whale_oil" }, demands = { "salt", "wine", "cloth", "olive_oil", "coffee", "saffron", "dates", "raisins", "rum" }, shipyard = false,
	},
	edinburgh = {
		id = "edinburgh", name = "에든버러", country = "scotland", lat = 55.95, lon = -3.19,
		produces = { "coal", "wool", "linen" }, demands = { "glass", "wine", "raisins", "rum" }, shipyard = false,
	},
	dublin = {
		id = "dublin", name = "더블린", country = "ireland", lat = 53.35, lon = -6.26,
		produces = { "wool", "beer" }, demands = { "iron", "sugar", "tobacco", "raisins" }, shipyard = false,
	},
	bordeaux = {
		id = "bordeaux", name = "보르도", country = "france", lat = 44.84, lon = -0.58,
		produces = { "wine", "salt" }, demands = { "wool", "timber", "coal" }, shipyard = false,
	},
	stockholm = {
		id = "stockholm", name = "스톡홀름", country = "sweden", lat = 59.33, lon = 18.07,
		produces = { "iron", "fur" }, demands = { "wine", "sugar", "cloth", "coffee", "porcelain", "carpet", "raisins", "cinnamon", "copper" }, shipyard = false,
	},
	gdansk = {
		id = "gdansk", name = "그단스크", country = "poland", lat = 54.35, lon = 18.65,
		produces = { "amber", "timber", "beer" }, demands = { "wine", "cloth", "spice", "coffee", "incense", "leather", "pepper", "copper" }, shipyard = false,
	},
	seville = {
		id = "seville", name = "세비야", country = "spain", lat = 37.39, lon = -5.98,
		produces = { "wine", "sugar", "tobacco", "leather", "pepper" }, demands = { "wool", "fur", "iron", "linen", "incense", "ebony", "rice", "lacquer", "sandalwood", "cocoa", "cochineal", "maize" }, shipyard = false,
	},
	marseille = {
		id = "marseille", name = "마르세유", country = "france", lat = 43.30, lon = 5.37,
		produces = { "olive_oil", "salt", "coffee" }, demands = { "wool", "timber", "tea", "tin" }, shipyard = true,
	},
	genoa = {
		id = "genoa", name = "제노바", country = "italy", lat = 44.41, lon = 8.93,
		produces = { "silk", "olive_oil", "coral" }, demands = { "wool", "iron", "beer", "tin", "ivory" }, shipyard = false,
	},
	venice = {
		id = "venice", name = "베네치아", country = "venice", lat = 45.44, lon = 12.32,
		produces = { "glass", "silk", "coffee" }, demands = { "wool", "fur", "iron", "tin", "coral", "ivory", "pearls", "gold", "gum_arabic", "feathers", "cloves", "nutmeg", "cinnamon", "gems", "ambergris", "lacquer", "camphor", "jade", "ginseng", "cocoa", "cochineal", "vanilla", "pearl_shell" }, shipyard = true,
	},
	livorno = {
		id = "livorno", name = "리보르노", country = "tuscany", lat = 43.55, lon = 10.31,
		produces = { "olive_oil", "wine", "marble" }, demands = { "coal", "fish", "fur" }, shipyard = false,
	},
	naples = {
		id = "naples", name = "나폴리", country = "naples", lat = 40.85, lon = 14.27,
		produces = { "wine", "silk", "coral" }, demands = { "iron", "timber", "coal", "linen" }, shipyard = false,
	},
	lisbon = {
		id = "lisbon", name = "리스본", country = "portugal", lat = 38.72, lon = -9.14,
		produces = { "salt", "sugar", "spice", "porcelain", "tobacco", "pepper" }, demands = { "fur", "timber", "iron", "beer", "linen", "coral", "incense", "gold", "cloves", "cinnamon", "rice", "sandalwood", "maize", "brazilwood" }, shipyard = true,
	},
	rotterdam = {
		id = "rotterdam", name = "로테르담", country = "netherlands", lat = 51.92, lon = 4.48,
		produces = { "cheese", "linen", "beer" }, demands = { "wool", "iron", "timber", "whale_oil" }, shipyard = true,
	},
	plymouth = {
		id = "plymouth", name = "플리머스", country = "england", lat = 50.37, lon = -4.14,
		produces = { "tin", "fish", "salt" }, demands = { "wine", "sugar", "tobacco", "timber", "mahogany", "kauri" }, shipyard = true,
	},
	hull = {
		id = "hull", name = "헐", country = "england", lat = 53.74, lon = -0.33,
		produces = { "wool", "coal", "whale_oil" }, demands = { "timber", "iron", "wine", "linen" }, shipyard = false,
	},
	glasgow = {
		id = "glasgow", name = "글래스고", country = "scotland", lat = 55.86, lon = -4.25,
		produces = { "linen", "coal", "iron" }, demands = { "tobacco", "sugar", "wine", "tea" }, shipyard = true,
	},
	lubeck = {
		id = "lubeck", name = "뤼베크", country = "germany", lat = 53.87, lon = 10.69,
		produces = { "salt", "beer", "timber" }, demands = { "fish", "whale_oil", "wine", "fur" }, shipyard = false,
	},
	oslo = {
		id = "oslo", name = "오슬로", country = "norway", lat = 59.91, lon = 10.75,
		produces = { "timber", "fish", "iron" }, demands = { "salt", "cloth", "glass", "coffee" }, shipyard = false,
	},
	la_rochelle = {
		id = "la_rochelle", name = "라로셸", country = "france", lat = 46.16, lon = -1.15,
		produces = { "salt", "wine", "olive_oil" }, demands = { "fish", "timber", "wool", "coal" }, shipyard = false,
	},
	porto = {
		id = "porto", name = "포르투", country = "portugal", lat = 41.15, lon = -8.61,
		produces = { "wine", "olive_oil", "salt" }, demands = { "fish", "wool", "timber", "linen" }, shipyard = false,
	},
	cadiz = {
		id = "cadiz", name = "카디스", country = "spain", lat = 36.53, lon = -6.29,
		produces = { "salt", "wine", "tobacco", "sugar", "pepper" }, demands = { "fur", "timber", "cloth", "coal" }, shipyard = true,
	},
	barcelona = {
		id = "barcelona", name = "바르셀로나", country = "spain", lat = 41.38, lon = 2.17,
		produces = { "wool", "olive_oil", "wine", "saffron" }, demands = { "fish", "iron", "sugar", "cloth" }, shipyard = true,
	},
	valencia = {
		id = "valencia", name = "발렌시아", country = "spain", lat = 39.47, lon = -0.38,
		produces = { "olive_oil", "silk", "salt", "saffron" }, demands = { "wool", "timber", "coal", "fur" }, shipyard = false,
	},
	algiers = {
		id = "algiers", name = "알제", country = "algeria", lat = 36.75, lon = 3.06,
		produces = { "olive_oil", "salt", "wool", "coral", "dates", "leather" }, demands = { "cloth", "iron", "timber", "glass" }, shipyard = false,
	},
	tunis = {
		id = "tunis", name = "튀니스", country = "tunisia", lat = 36.80, lon = 10.18,
		produces = { "olive_oil", "salt", "fish", "coral", "carpet", "cotton" }, demands = { "cloth", "iron", "glass", "wine" }, shipyard = false,
	},
	tripoli = {
		id = "tripoli", name = "트리폴리", country = "tripoli", lat = 32.90, lon = 13.18,
		produces = { "olive_oil", "salt", "dates", "ivory" }, demands = { "cloth", "iron", "timber", "glass" }, shipyard = false,
	},
	palermo = {
		id = "palermo", name = "팔레르모", country = "sicily", lat = 38.12, lon = 13.36,
		produces = { "wine", "salt", "olive_oil", "sugar" }, demands = { "iron", "timber", "coal", "cloth" }, shipyard = false,
	},
	valletta = {
		id = "valletta", name = "발레타", country = "malta", lat = 35.90, lon = 14.51,
		produces = { "salt", "cloth", "fish" }, demands = { "timber", "iron", "wool", "wine" }, shipyard = true,
	},
	ragusa = {
		id = "ragusa", name = "라구사", country = "ragusa", lat = 42.65, lon = 18.09,
		produces = { "salt", "wine", "olive_oil", "marble" }, demands = { "wool", "cloth", "iron", "fur" }, shipyard = false,
	},
	athens = {
		id = "athens", name = "아테네", country = "greece", lat = 37.94, lon = 23.65,
		produces = { "olive_oil", "wine", "silk", "marble" }, demands = { "wool", "iron", "timber", "glass" }, shipyard = false,
	},
	istanbul = {
		id = "istanbul", name = "이스탄불", country = "ottoman", lat = 41.01, lon = 28.98,
		produces = { "silk", "spice", "coffee", "porcelain", "saffron", "carpet", "pearls" }, demands = { "wool", "fur", "iron", "glass", "amber", "gold", "gems", "jade", "sandalwood", "sandalwood_hi" }, shipyard = true,
	},
	alexandria = {
		id = "alexandria", name = "알렉산드리아", country = "egypt", lat = 31.20, lon = 29.92,
		produces = { "spice", "coffee", "sugar", "silk", "carpet", "incense", "dates", "cotton", "pearls" }, demands = { "wool", "timber", "iron", "glass", "wine" }, shipyard = false,
	},
	tangier = {
		id = "tangier", name = "탕헤르", country = "morocco", lat = 35.78, lon = -5.80,
		produces = { "olive_oil", "salt", "fish", "sugar", "leather", "ivory" }, demands = { "cloth", "iron", "timber", "tea" }, shipyard = false,
	},
	riga = {
		id = "riga", name = "리가", country = "livonia", lat = 56.95, lon = 24.10,
		produces = { "timber", "fur", "linen" }, demands = { "salt", "wine", "cloth", "whale_oil" }, shipyard = false,
	},
	tallinn = {
		id = "tallinn", name = "탈린", country = "estonia", lat = 59.44, lon = 24.75,
		produces = { "timber", "fur", "fish" }, demands = { "salt", "wine", "cloth", "glass" }, shipyard = false,
	},
	helsinki = {
		id = "helsinki", name = "헬싱키", country = "finland", lat = 60.17, lon = 24.94,
		produces = { "fish", "timber", "iron" }, demands = { "salt", "wine", "cloth", "coffee" }, shipyard = false,
	},
	st_petersburg = {
		id = "st_petersburg", name = "상트페테르부르크", country = "russia", lat = 59.93, lon = 30.30,
		produces = { "fur", "timber", "iron", "linen" }, demands = { "wine", "glass", "sugar", "tea", "porcelain", "marble", "carpet", "pearls", "feathers", "gems", "jade", "sealskin" }, shipyard = true,
	},
	koenigsberg = {
		id = "koenigsberg", name = "쾨니히스베르크", country = "prussia", lat = 54.71, lon = 20.51,
		produces = { "amber", "timber", "linen" }, demands = { "wine", "cloth", "spice", "coffee" }, shipyard = false,
	},
	visby = {
		id = "visby", name = "비스뷔", country = "gotland", lat = 57.64, lon = 18.30,
		produces = { "fish", "salt", "wool" }, demands = { "wine", "iron", "cloth", "beer" }, shipyard = false,
	},
	las_palmas = {
		id = "las_palmas", name = "라스팔마스", country = "canary", lat = 28.12, lon = -15.41,
		produces = { "wine", "sugar", "salt" }, demands = { "cloth", "iron", "timber", "coal" }, shipyard = false,
	},
	funchal = {
		id = "funchal", name = "푼샬", country = "madeira", lat = 32.65, lon = -16.91,
		produces = { "wine", "sugar" }, demands = { "wool", "cloth", "timber", "iron" }, shipyard = false,
	},
	ponta_delgada = {
		id = "ponta_delgada", name = "퐁타델가다", country = "azores", lat = 37.74, lon = -25.67,
		produces = { "fish", "wine", "salt" }, demands = { "cloth", "iron", "timber", "wool" }, shipyard = false,
	},
	palma = {
		id = "palma", name = "팔마", country = "mallorca", lat = 39.57, lon = 2.65,
		produces = { "olive_oil", "salt", "wine" }, demands = { "wool", "timber", "iron", "cloth" }, shipyard = false,
	},
	cagliari = {
		id = "cagliari", name = "카글리아리", country = "sardinia", lat = 39.22, lon = 9.12,
		produces = { "salt", "wool", "olive_oil" }, demands = { "cloth", "iron", "timber", "glass" }, shipyard = false,
	},
	ajaccio = {
		id = "ajaccio", name = "아자치오", country = "corsica", lat = 41.92, lon = 8.74,
		produces = { "wine", "timber", "olive_oil" }, demands = { "cloth", "iron", "salt", "glass" }, shipyard = false,
	},
	toulon = {
		id = "toulon", name = "툴롱", country = "france", lat = 43.12, lon = 5.93,
		produces = { "wine", "salt", "olive_oil" }, demands = { "coal", "timber", "iron", "fish" }, shipyard = true,
	},
	syracuse = {
		id = "syracuse", name = "시라쿠사", country = "sicily", lat = 37.07, lon = 15.29,
		produces = { "olive_oil", "wine", "salt" }, demands = { "cloth", "iron", "timber", "coal" }, shipyard = false,
	},
	ancona = {
		id = "ancona", name = "안코나", country = "papal", lat = 43.62, lon = 13.52,
		produces = { "wool", "wine", "olive_oil" }, demands = { "fish", "timber", "iron", "spice" }, shipyard = false,
	},
	split = {
		id = "split", name = "스플리트", country = "dalmatia", lat = 43.51, lon = 16.44,
		produces = { "wine", "olive_oil", "salt", "marble" }, demands = { "cloth", "iron", "wool", "glass" }, shipyard = false,
	},
	thessaloniki = {
		id = "thessaloniki", name = "테살로니키", country = "ottoman", lat = 40.64, lon = 22.94,
		produces = { "silk", "wool", "tobacco", "raisins" }, demands = { "cloth", "iron", "fish", "glass" }, shipyard = false,
	},
	candia = {
		id = "candia", name = "칸디아", country = "crete", lat = 35.34, lon = 25.14,
		produces = { "olive_oil", "wine", "salt", "raisins" }, demands = { "cloth", "iron", "timber", "wool" }, shipyard = true,
	},
	rhodes = {
		id = "rhodes", name = "로도스", country = "rhodes", lat = 36.43, lon = 28.22,
		produces = { "olive_oil", "wine", "silk" }, demands = { "timber", "iron", "wool", "cloth" }, shipyard = false,
	},
	famagusta = {
		id = "famagusta", name = "파마구스타", country = "cyprus", lat = 35.13, lon = 33.94,
		produces = { "sugar", "wine", "salt", "silk", "incense" }, demands = { "cloth", "iron", "timber", "glass" }, shipyard = false,
	},
	smyrna = {
		id = "smyrna", name = "이즈미르", country = "ottoman", lat = 38.42, lon = 27.14,
		produces = { "silk", "spice", "olive_oil", "tobacco", "carpet", "raisins", "cotton" }, demands = { "wool", "iron", "fur", "glass" }, shipyard = true,
	},
	acre = {
		id = "acre", name = "아크레", country = "levant", lat = 32.92, lon = 35.07,
		produces = { "spice", "silk", "sugar", "olive_oil", "incense", "cotton" }, demands = { "wool", "iron", "timber", "glass" }, shipyard = false,
	},
	oran = {
		id = "oran", name = "오랑", country = "algeria", lat = 35.70, lon = -0.63,
		produces = { "wool", "salt", "olive_oil", "leather" }, demands = { "cloth", "iron", "timber", "glass" }, shipyard = false,
	},
	benghazi = {
		id = "benghazi", name = "벵가지", country = "tripoli", lat = 32.12, lon = 20.07,
		produces = { "wool", "olive_oil", "salt", "dates" }, demands = { "cloth", "iron", "timber", "glass" }, shipyard = false,
	},
	malaga = {
		id = "malaga", name = "말라가", country = "spain", lat = 36.72, lon = -4.42,
		produces = { "raisins", "olive_oil", "wine" }, demands = { "wool", "timber", "iron", "cloth" }, shipyard = false,
	},
	gibraltar = {
		id = "gibraltar", name = "지브롤터", country = "gibraltar", lat = 36.14, lon = -5.35,
		produces = { "salt", "fish", "leather" }, demands = { "wool", "timber", "coal", "cloth" }, shipyard = false,
	},
	cartagena = {
		id = "cartagena", name = "카르타헤나", country = "spain", lat = 37.60, lon = -0.98,
		produces = { "salt", "leather", "silk" }, demands = { "wool", "timber", "iron", "fur" }, shipyard = true,
	},
	trieste = {
		id = "trieste", name = "트리에스테", country = "austria", lat = 45.65, lon = 13.77,
		produces = { "glass", "salt", "wine" }, demands = { "wool", "fur", "iron", "coffee" }, shipyard = false,
	},
	messina = {
		id = "messina", name = "메시나", country = "sicily", lat = 38.19, lon = 15.55,
		produces = { "silk", "wine", "coral" }, demands = { "iron", "timber", "coal", "cloth" }, shipyard = false,
	},
	corfu = {
		id = "corfu", name = "코르푸", country = "venice", lat = 39.62, lon = 19.92,
		produces = { "olive_oil", "salt", "wine" }, demands = { "cloth", "iron", "timber", "glass" }, shipyard = false,
	},
	beirut = {
		id = "beirut", name = "베이루트", country = "levant", lat = 33.89, lon = 35.50,
		produces = { "silk", "cotton", "spice" }, demands = { "wool", "iron", "timber", "glass" }, shipyard = false,
	},
	damietta = {
		id = "damietta", name = "다미에타", country = "egypt", lat = 31.42, lon = 31.81,
		produces = { "cotton", "dates", "sugar" }, demands = { "wool", "timber", "iron", "wine" }, shipyard = false,
	},
	bone = {
		id = "bone", name = "본", country = "algeria", lat = 36.90, lon = 7.77,
		produces = { "coral", "wool", "leather" }, demands = { "cloth", "iron", "timber", "glass" }, shipyard = false,
	},
	casablanca = {
		id = "casablanca", name = "카사블랑카", country = "morocco", lat = 33.59, lon = -7.60,
		produces = { "wool", "leather", "salt" }, demands = { "cloth", "iron", "timber", "tea" }, shipyard = false,
	},
	safi = {
		id = "safi", name = "사피", country = "morocco", lat = 32.30, lon = -9.24,
		produces = { "leather", "dates", "carpet" }, demands = { "cloth", "iron", "timber", "glass" }, shipyard = false,
	},
	agadir = {
		id = "agadir", name = "아가디르", country = "morocco", lat = 30.42, lon = -9.60,
		produces = { "gum_arabic", "dates", "salt" }, demands = { "cloth", "iron", "timber", "tea" }, shipyard = false,
	},
	praia = {
		id = "praia", name = "프라이아", country = "cape_verde", lat = 14.92, lon = -23.51,
		produces = { "salt", "cotton", "fish" }, demands = { "cloth", "iron", "timber", "wine" }, shipyard = true,
	},
	saint_louis = {
		id = "saint_louis", name = "생루이", country = "senegal", lat = 16.03, lon = -16.50,
		produces = { "gum_arabic", "leather", "feathers" }, demands = { "cloth", "iron", "wine", "glass" }, shipyard = false,
	},
	dakar = {
		id = "dakar", name = "다카르", country = "senegal", lat = 14.69, lon = -17.45,
		produces = { "fish", "gum_arabic", "ivory" }, demands = { "cloth", "iron", "wine", "glass" }, shipyard = false,
	},
	bissau = {
		id = "bissau", name = "비사우", country = "guinea", lat = 11.86, lon = -15.60,
		produces = { "ivory", "cotton", "palm_oil" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = false,
	},
	freetown = {
		id = "freetown", name = "프리타운", country = "sierra_leone", lat = 8.48, lon = -13.23,
		produces = { "ivory", "ebony", "palm_oil" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = false,
	},
	elmina = {
		id = "elmina", name = "엘미나", country = "gold_coast", lat = 5.08, lon = -1.35,
		produces = { "gold", "ivory", "palm_oil" }, demands = { "cloth", "iron", "wine", "glass" }, shipyard = true,
	},
	ouidah = {
		id = "ouidah", name = "위다", country = "dahomey", lat = 6.37, lon = 2.09,
		produces = { "palm_oil", "cotton", "ivory" }, demands = { "cloth", "iron", "wine", "glass" }, shipyard = false,
	},
	lagos = {
		id = "lagos", name = "라고스", country = "benin", lat = 6.45, lon = 3.39,
		produces = { "palm_oil", "ivory", "ebony", "pepper" }, demands = { "cloth", "iron", "wine", "glass" }, shipyard = false,
	},
	calabar = {
		id = "calabar", name = "칼라바르", country = "niger_delta", lat = 4.95, lon = 8.32,
		produces = { "palm_oil", "ebony", "pepper" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = false,
	},
	sao_tome = {
		id = "sao_tome", name = "상투메", country = "sao_tome", lat = 0.34, lon = 6.73,
		produces = { "sugar" }, demands = { "cloth", "iron", "wine", "timber" }, shipyard = true,
	},
	luanda = {
		id = "luanda", name = "루안다", country = "angola", lat = -8.84, lon = 13.23,
		produces = { "ivory", "ebony", "cotton", "sugar" }, demands = { "cloth", "iron", "wine", "glass" }, shipyard = true,
	},
	benguela = {
		id = "benguela", name = "벵겔라", country = "angola", lat = -12.58, lon = 13.41,
		produces = { "ivory", "feathers", "salt" }, demands = { "cloth", "iron", "wine", "glass" }, shipyard = false,
	},
	st_helena = {
		id = "st_helena", name = "세인트헬레나", country = "st_helena", lat = -15.94, lon = -5.70,
		produces = { "fish", "salt" }, demands = { "cloth", "iron", "timber", "wine" }, shipyard = false,
	},
	cape_town = {
		id = "cape_town", name = "케이프타운", country = "cape", lat = -33.92, lon = 18.42,
		produces = { "wine", "feathers", "fish", "wool" }, demands = { "cloth", "iron", "timber", "spice" }, shipyard = true,
	},
	mozambique = {
		id = "mozambique", name = "모잠비크", country = "mozambique", lat = -15.03, lon = 40.73,
		produces = { "ivory", "gold", "ebony" }, demands = { "cloth", "iron", "porcelain", "glass" }, shipyard = true,
	},
	kilwa = {
		id = "kilwa", name = "킬와", country = "swahili", lat = -8.95, lon = 39.51,
		produces = { "gold", "ivory", "ebony" }, demands = { "cloth", "iron", "glass", "porcelain" }, shipyard = false,
	},
	mombasa = {
		id = "mombasa", name = "몸바사", country = "swahili", lat = -4.06, lon = 39.67,
		produces = { "ivory", "cloves", "dates" }, demands = { "cloth", "iron", "glass", "porcelain" }, shipyard = false,
	},
	zanzibar = {
		id = "zanzibar", name = "잔지바르", country = "swahili", lat = -6.16, lon = 39.19,
		produces = { "cloves", "ivory", "ambergris" }, demands = { "cloth", "iron", "glass", "rice" }, shipyard = false,
	},
	mogadishu = {
		id = "mogadishu", name = "모가디슈", country = "somalia", lat = 2.05, lon = 45.34,
		produces = { "ambergris", "incense", "ivory" }, demands = { "cloth", "iron", "dates", "rice" }, shipyard = false,
	},
	aden = {
		id = "aden", name = "아덴", country = "yemen", lat = 12.78, lon = 45.04,
		produces = { "coffee", "incense", "gum_arabic" }, demands = { "cloth", "iron", "rice", "porcelain" }, shipyard = true,
	},
	mocha = {
		id = "mocha", name = "모카", country = "yemen", lat = 13.32, lon = 43.25,
		produces = { "coffee", "dates", "gum_arabic" }, demands = { "cloth", "iron", "rice", "glass" }, shipyard = false,
	},
	jeddah = {
		id = "jeddah", name = "제다", country = "hejaz", lat = 21.49, lon = 39.17,
		produces = { "coffee", "incense", "pearls" }, demands = { "cloth", "iron", "rice", "spice" }, shipyard = false,
	},
	muscat = {
		id = "muscat", name = "무스카트", country = "oman", lat = 23.61, lon = 58.59,
		produces = { "dates", "pearls", "incense" }, demands = { "cloth", "iron", "rice", "spice" }, shipyard = true,
	},
	bandar_abbas = {
		id = "bandar_abbas", name = "반다르아바스", country = "persia", lat = 27.18, lon = 56.27,
		produces = { "carpet", "pearls", "dates", "silk" }, demands = { "cloth", "iron", "spice", "sugar" }, shipyard = false,
	},
	basra = {
		id = "basra", name = "바스라", country = "mesopotamia", lat = 29.95, lon = 48.80,
		produces = { "dates", "carpet", "pearls" }, demands = { "cloth", "iron", "spice", "rice" }, shipyard = false,
	},
	diu = {
		id = "diu", name = "디우", country = "gujarat", lat = 20.71, lon = 70.98,
		produces = { "cotton", "indigo", "gems" }, demands = { "cloth", "iron", "wine", "coffee" }, shipyard = true,
	},
	surat = {
		id = "surat", name = "수라트", country = "gujarat", lat = 21.17, lon = 72.83,
		produces = { "cotton", "indigo", "silk", "gems" }, demands = { "wool", "iron", "wine", "coffee", "gold" }, shipyard = true,
	},
	goa = {
		id = "goa", name = "고아", country = "portuguese_india", lat = 15.50, lon = 73.83,
		produces = { "pepper", "rice", "gems", "cinnamon" }, demands = { "wine", "iron", "cloth", "timber" }, shipyard = true,
	},
	calicut = {
		id = "calicut", name = "캘리컷", country = "malabar", lat = 11.25, lon = 75.77,
		produces = { "pepper", "cinnamon", "ivory", "cotton" }, demands = { "wine", "iron", "cloth", "gold" }, shipyard = false,
	},
	cochin = {
		id = "cochin", name = "코친", country = "malabar", lat = 9.97, lon = 76.24,
		produces = { "pepper", "cinnamon", "rice", "ebony" }, demands = { "wine", "iron", "cloth", "glass" }, shipyard = true,
	},
	colombo = {
		id = "colombo", name = "콜롬보", country = "ceylon", lat = 6.93, lon = 79.85,
		produces = { "cinnamon", "gems", "pearls", "ivory" }, demands = { "wine", "iron", "cloth", "rice" }, shipyard = true,
	},
	madras = {
		id = "madras", name = "마드라스", country = "coromandel", lat = 13.08, lon = 80.29,
		produces = { "cotton", "indigo", "rice", "gems" }, demands = { "wine", "iron", "wool", "gold" }, shipyard = true,
	},
	calcutta = {
		id = "calcutta", name = "캘커타", country = "bengal", lat = 22.17, lon = 88.30,
		produces = { "silk", "cotton", "indigo", "rice" }, demands = { "wine", "iron", "wool" }, shipyard = true,
	},
	malacca = {
		id = "malacca", name = "말라카", country = "malay", lat = 2.19, lon = 102.25,
		produces = { "pepper", "cloves", "nutmeg", "gold" }, demands = { "cotton", "iron", "porcelain", "rice" }, shipyard = true,
	},
	port_louis = {
		id = "port_louis", name = "포트루이", country = "mauritius", lat = -20.16, lon = 57.50,
		produces = { "ebony", "sugar", "rice" }, demands = { "cloth", "iron", "wine", "timber" }, shipyard = false,
	},
	manila = {
		id = "manila", name = "마닐라", country = "philippines", lat = 14.60, lon = 120.97,
		produces = { "silver", "sugar", "rice", "sandalwood" }, demands = { "silk", "porcelain", "cloth", "iron" }, shipyard = true,
	},
	macau = {
		id = "macau", name = "마카오", country = "macau", lat = 22.19, lon = 113.55,
		produces = { "tea", "porcelain", "silk" }, demands = { "silver", "cloth", "iron", "wine", "sandalwood_hi" }, shipyard = true,
	},
	canton = {
		id = "canton", name = "광저우", country = "china", lat = 22.90, lon = 113.60,
		produces = { "tea", "porcelain", "silk", "lacquer" }, demands = { "silver", "wool", "cotton", "iron", "sealskin", "sandalwood_hi", "pearl_shell" }, shipyard = true,
	},
	amoy = {
		id = "amoy", name = "샤먼", country = "china", lat = 24.44, lon = 118.08,
		produces = { "tea", "porcelain", "sugar" }, demands = { "silver", "wool", "cotton", "pepper" }, shipyard = false,
	},
	ningbo = {
		id = "ningbo", name = "닝보", country = "china", lat = 29.90, lon = 121.90,
		produces = { "tea", "silk", "porcelain" }, demands = { "silver", "cotton", "pepper", "iron" }, shipyard = false,
	},
	shanghai = {
		id = "shanghai", name = "상하이", country = "china", lat = 31.10, lon = 121.90,
		produces = { "silk", "cotton", "tea", "porcelain" }, demands = { "silver", "wool", "iron", "pepper", "sandalwood_hi" }, shipyard = true,
	},
	tianjin = {
		id = "tianjin", name = "톈진", country = "china", lat = 38.90, lon = 117.90,
		produces = { "jade", "ginseng", "silk" }, demands = { "silver", "wool", "iron", "pepper" }, shipyard = false,
	},
	nagasaki = {
		id = "nagasaki", name = "나가사키", country = "japan", lat = 32.74, lon = 129.87,
		produces = { "copper", "silver", "lacquer", "porcelain" }, demands = { "silk", "sugar", "ginseng", "spice" }, shipyard = true,
	},
	osaka = {
		id = "osaka", name = "오사카", country = "japan", lat = 34.62, lon = 135.42,
		produces = { "rice", "sake", "copper", "lacquer" }, demands = { "silk", "sugar", "cotton", "fish" }, shipyard = true,
	},
	edo = {
		id = "edo", name = "에도", country = "japan", lat = 35.60, lon = 139.80,
		produces = { "rice", "sake", "silk", "lacquer" }, demands = { "copper", "sugar", "cotton", "tea" }, shipyard = true,
	},
	hakodate = {
		id = "hakodate", name = "하코다테", country = "japan", lat = 41.75, lon = 140.75,
		produces = { "fish", "timber", "fur" }, demands = { "rice", "sake", "cotton", "iron" }, shipyard = false,
	},
	busan = {
		id = "busan", name = "부산", country = "korea", lat = 35.08, lon = 129.05,
		produces = { "ginseng", "rice", "fish", "cotton" }, demands = { "copper", "silk", "sugar", "pepper" }, shipyard = false,
	},
	incheon = {
		id = "incheon", name = "인천", country = "korea", lat = 37.40, lon = 126.55,
		produces = { "ginseng", "rice", "silk" }, demands = { "copper", "cloth", "sugar", "pepper" }, shipyard = false,
	},
	tainan = {
		id = "tainan", name = "타이난", country = "formosa", lat = 22.95, lon = 120.10,
		produces = { "sugar", "rice", "camphor", "leather" }, demands = { "silk", "silver", "iron", "cloth" }, shipyard = false,
	},
	hoi_an = {
		id = "hoi_an", name = "호이안", country = "vietnam", lat = 15.90, lon = 108.40,
		produces = { "silk", "sugar", "cinnamon", "ebony" }, demands = { "silver", "copper", "porcelain", "iron" }, shipyard = false,
	},
	bangkok = {
		id = "bangkok", name = "방콕", country = "siam", lat = 13.40, lon = 100.40,
		produces = { "rice", "sugar", "sandalwood", "ivory", "gems" }, demands = { "silver", "cotton", "porcelain", "iron" }, shipyard = false,
	},
	rangoon = {
		id = "rangoon", name = "양곤", country = "burma", lat = 16.50, lon = 96.30,
		produces = { "rice", "gems", "ivory", "ebony" }, demands = { "cotton", "silver", "iron", "porcelain" }, shipyard = false,
	},
	singapore = {
		id = "singapore", name = "싱가포르", country = "malay", lat = 1.20, lon = 103.85,
		produces = { "pepper", "nutmeg", "cloves", "rice" }, demands = { "cotton", "iron", "porcelain", "silver" }, shipyard = true,
	},
	batavia = {
		id = "batavia", name = "바타비아", country = "java", lat = -6.10, lon = 106.80,
		produces = { "pepper", "cloves", "rice", "sugar", "coffee" }, demands = { "silver", "cotton", "iron", "cloth" }, shipyard = true,
	},
	makassar = {
		id = "makassar", name = "마카사르", country = "celebes", lat = -5.14, lon = 119.40,
		produces = { "nutmeg", "cloves", "sandalwood", "ebony" }, demands = { "cotton", "iron", "porcelain", "silver" }, shipyard = false,
	},
	ternate = {
		id = "ternate", name = "테르나테", country = "moluccas", lat = 0.78, lon = 127.38,
		produces = { "cloves", "nutmeg", "ambergris" }, demands = { "cotton", "iron", "porcelain", "rice" }, shipyard = false,
	},
	ambon = {
		id = "ambon", name = "암본", country = "moluccas", lat = -3.70, lon = 128.18,
		produces = { "cloves", "nutmeg", "sandalwood" }, demands = { "cotton", "iron", "porcelain", "rice" }, shipyard = false,
	},
	banda = {
		id = "banda", name = "반다", country = "moluccas", lat = -4.52, lon = 129.90,
		produces = { "nutmeg", "cloves" }, demands = { "cotton", "iron", "rice", "cloth" }, shipyard = false,
	},
	brunei = {
		id = "brunei", name = "브루나이", country = "borneo", lat = 4.95, lon = 114.95,
		produces = { "camphor", "pepper", "ebony", "gold" }, demands = { "cotton", "iron", "porcelain", "silver" }, shipyard = false,
	},
	halifax = {
		id = "halifax", name = "핼리팩스", country = "canada", lat = 44.60, lon = -63.50,
		produces = { "fish", "timber", "fur" }, demands = { "rum", "cloth", "iron", "sugar" }, shipyard = true,
	},
	st_johns = {
		id = "st_johns", name = "세인트존스", country = "newfoundland", lat = 47.50, lon = -52.60,
		produces = { "fish", "fur" }, demands = { "cloth", "iron", "rum", "salt" }, shipyard = false,
	},
	quebec = {
		id = "quebec", name = "퀘벡", country = "new_france", lat = 47.00, lon = -70.90,
		produces = { "fur", "timber", "fish" }, demands = { "wine", "cloth", "iron", "rum" }, shipyard = true,
	},
	boston = {
		id = "boston", name = "보스턴", country = "new_england", lat = 42.30, lon = -70.90,
		produces = { "fish", "timber", "rum", "whale_oil" }, demands = { "sugar", "cloth", "iron", "tea" }, shipyard = true,
	},
	new_york = {
		id = "new_york", name = "뉴욕", country = "new_netherland", lat = 40.55, lon = -73.95,
		produces = { "fur", "timber", "maize", "whale_oil" }, demands = { "sugar", "cloth", "iron", "tea", "rum" }, shipyard = true,
	},
	philadelphia = {
		id = "philadelphia", name = "필라델피아", country = "pennsylvania", lat = 39.60, lon = -75.20,
		produces = { "maize", "timber", "iron" }, demands = { "sugar", "cloth", "tea", "rum" }, shipyard = true,
	},
	charleston = {
		id = "charleston", name = "찰스턴", country = "carolina", lat = 32.60, lon = -79.80,
		produces = { "rice", "cotton", "indigo", "leather" }, demands = { "cloth", "iron", "rum", "tea" }, shipyard = false,
	},
	new_orleans = {
		id = "new_orleans", name = "뉴올리언스", country = "louisiana", lat = 29.10, lon = -89.30,
		produces = { "fur", "cotton", "sugar", "timber" }, demands = { "wine", "cloth", "iron", "rum" }, shipyard = false,
	},
	nassau = {
		id = "nassau", name = "나소", country = "bahamas", lat = 25.04, lon = -77.30,
		produces = { "salt", "rum", "ambergris" }, demands = { "cloth", "iron", "timber", "wine" }, shipyard = false,
	},
	havana = {
		id = "havana", name = "아바나", country = "cuba", lat = 23.17, lon = -82.35,
		produces = { "sugar", "tobacco", "mahogany", "rum" }, demands = { "cloth", "iron", "wine", "timber" }, shipyard = true,
	},
	veracruz = {
		id = "veracruz", name = "베라크루스", country = "new_spain", lat = 19.15, lon = -96.10,
		produces = { "silver", "cochineal", "vanilla", "cocoa" }, demands = { "cloth", "iron", "wine" }, shipyard = true,
	},
	campeche = {
		id = "campeche", name = "캄페체", country = "new_spain", lat = 19.90, lon = -90.60,
		produces = { "logwood", "mahogany", "cotton" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = false,
	},
	kingston = {
		id = "kingston", name = "킹스턴", country = "jamaica", lat = 17.90, lon = -76.75,
		produces = { "sugar", "rum", "mahogany", "logwood" }, demands = { "cloth", "iron", "wine", "timber" }, shipyard = true,
	},
	santo_domingo = {
		id = "santo_domingo", name = "산토도밍고", country = "hispaniola", lat = 18.40, lon = -69.85,
		produces = { "sugar", "tobacco", "leather", "mahogany" }, demands = { "cloth", "iron", "wine", "timber" }, shipyard = false,
	},
	san_juan = {
		id = "san_juan", name = "산후안", country = "puerto_rico", lat = 18.45, lon = -66.10,
		produces = { "sugar", "rum", "tobacco" }, demands = { "cloth", "iron", "wine", "timber" }, shipyard = false,
	},
	bridgetown = {
		id = "bridgetown", name = "브리지타운", country = "barbados", lat = 13.05, lon = -59.60,
		produces = { "sugar", "rum", "cotton" }, demands = { "cloth", "iron", "timber", "wine" }, shipyard = true,
	},
	port_of_spain = {
		id = "port_of_spain", name = "포트오브스페인", country = "trinidad", lat = 10.65, lon = -61.60,
		produces = { "cocoa", "sugar", "tobacco" }, demands = { "cloth", "iron", "wine", "timber" }, shipyard = false,
	},
	la_guaira = {
		id = "la_guaira", name = "라과이라", country = "venezuela", lat = 10.60, lon = -66.90,
		produces = { "cocoa", "tobacco", "leather", "pearls" }, demands = { "cloth", "iron", "wine", "timber" }, shipyard = false,
	},
	cartagena_indias = {
		id = "cartagena_indias", name = "카르타헤나 데 인디아스", country = "new_granada", lat = 10.40, lon = -75.55,
		produces = { "gold", "gems", "pearls", "silver" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = true,
	},
	portobelo = {
		id = "portobelo", name = "포르토벨로", country = "panama", lat = 9.55, lon = -79.65,
		produces = { "gold", "silver", "pearls" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = false,
	},
	paramaribo = {
		id = "paramaribo", name = "파라마리보", country = "suriname", lat = 5.90, lon = -55.10,
		produces = { "sugar", "cocoa", "rice", "mahogany" }, demands = { "cloth", "iron", "wine", "timber" }, shipyard = false,
	},
	belem = {
		id = "belem", name = "벨렝", country = "brazil", lat = -1.40, lon = -48.40,
		produces = { "cocoa", "brazilwood", "rice", "feathers" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = false,
	},
	recife = {
		id = "recife", name = "헤시피", country = "brazil", lat = -8.00, lon = -34.80,
		produces = { "sugar", "brazilwood", "cotton" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = true,
	},
	salvador = {
		id = "salvador", name = "살바도르", country = "brazil", lat = -13.00, lon = -38.45,
		produces = { "sugar", "tobacco", "brazilwood", "gold" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = true,
	},
	rio = {
		id = "rio", name = "리우데자네이루", country = "brazil", lat = -22.95, lon = -43.10,
		produces = { "sugar", "gold", "gems", "brazilwood" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = true,
	},
	montevideo = {
		id = "montevideo", name = "몬테비데오", country = "rio_de_la_plata", lat = -34.90, lon = -56.10,
		produces = { "leather", "salt", "wool" }, demands = { "cloth", "iron", "wine", "sugar" }, shipyard = false,
	},
	buenos_aires = {
		id = "buenos_aires", name = "부에노스아이레스", country = "rio_de_la_plata", lat = -34.60, lon = -58.20,
		produces = { "leather", "silver", "wool" }, demands = { "cloth", "iron", "wine", "sugar" }, shipyard = true,
	},
	sydney = {
		id = "sydney", name = "시드니", country = "australia", lat = -33.90, lon = 151.30,
		produces = { "wool", "timber", "sealskin" }, demands = { "cloth", "iron", "rum", "tea" }, shipyard = true,
	},
	hobart = {
		id = "hobart", name = "호바트", country = "tasmania", lat = -42.90, lon = 147.40,
		produces = { "sealskin", "whale_oil", "timber" }, demands = { "cloth", "iron", "rum", "tea" }, shipyard = false,
	},
	perth = {
		id = "perth", name = "퍼스", country = "australia", lat = -32.10, lon = 115.60,
		produces = { "wool", "pearl_shell", "sandalwood_hi" }, demands = { "cloth", "iron", "rum", "tea" }, shipyard = false,
	},
	darwin = {
		id = "darwin", name = "다윈", country = "australia", lat = -12.40, lon = 130.80,
		produces = { "pearl_shell", "ebony" }, demands = { "cloth", "iron", "rum", "rice" }, shipyard = false,
	},
	auckland = {
		id = "auckland", name = "오클랜드", country = "new_zealand", lat = -36.80, lon = 174.80,
		produces = { "kauri", "sealskin", "timber" }, demands = { "cloth", "iron", "rum", "tea" }, shipyard = false,
	},
	port_moresby = {
		id = "port_moresby", name = "포트모르즈비", country = "new_guinea", lat = -9.50, lon = 147.20,
		produces = { "feathers", "sandalwood_hi", "pearl_shell" }, demands = { "cloth", "iron", "rice", "porcelain" }, shipyard = false,
	},
	suva = {
		id = "suva", name = "수바", country = "fiji", lat = -18.10, lon = 178.40,
		produces = { "sandalwood_hi", "pearl_shell" }, demands = { "cloth", "iron", "rice", "rum" }, shipyard = false,
	},
	tahiti = {
		id = "tahiti", name = "파페에테", country = "polynesia", lat = -17.50, lon = -149.60,
		produces = { "pearl_shell", "sandalwood_hi" }, demands = { "cloth", "iron", "rum", "glass" }, shipyard = false,
	},
	honolulu = {
		id = "honolulu", name = "호놀룰루", country = "hawaii", lat = 21.30, lon = -157.90,
		produces = { "sandalwood_hi", "pearl_shell", "whale_oil" }, demands = { "cloth", "iron", "rum", "porcelain" }, shipyard = true,
	},
	guam = {
		id = "guam", name = "괌", country = "marianas", lat = 13.40, lon = 144.60,
		produces = { "sandalwood_hi", "pearl_shell", "silver" }, demands = { "cloth", "iron", "wine", "rice" }, shipyard = false,
	},
	acapulco = {
		id = "acapulco", name = "아카풀코", country = "new_spain", lat = 16.80, lon = -99.90,
		produces = { "silver", "cocoa", "cochineal" }, demands = { "silk", "porcelain", "cloth", "iron" }, shipyard = true,
	},
	panama = {
		id = "panama", name = "파나마", country = "panama", lat = 8.90, lon = -79.50,
		produces = { "gold", "silver", "pearls" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = true,
	},
	guayaquil = {
		id = "guayaquil", name = "과야킬", country = "quito", lat = -2.30, lon = -79.90,
		produces = { "cocoa", "timber", "rice" }, demands = { "cloth", "iron", "wine", "salt" }, shipyard = false,
	},
	callao = {
		id = "callao", name = "카야오", country = "peru", lat = -12.10, lon = -77.20,
		produces = { "silver", "gold", "guano", "cotton" }, demands = { "cloth", "iron", "wine" }, shipyard = true,
	},
	valparaiso = {
		id = "valparaiso", name = "발파라이소", country = "chile", lat = -33.00, lon = -71.70,
		produces = { "nitrate", "copper", "wool", "wine" }, demands = { "cloth", "iron", "sugar", "tea" }, shipyard = true,
	},
	san_francisco = {
		id = "san_francisco", name = "샌프란시스코", country = "california", lat = 37.80, lon = -122.50,
		produces = { "fur", "sealskin", "timber" }, demands = { "cloth", "iron", "wine", "rum" }, shipyard = false,
	},
	sitka = {
		id = "sitka", name = "싯카", country = "russian_america", lat = 57.00, lon = -135.40,
		produces = { "fur", "sealskin", "fish" }, demands = { "cloth", "iron", "rum", "tea" }, shipyard = false,
	},
	vancouver = {
		id = "vancouver", name = "밴쿠버", country = "pacific_northwest", lat = 49.30, lon = -123.30,
		produces = { "fur", "timber", "fish" }, demands = { "cloth", "iron", "rum", "tea" }, shipyard = false,
	},
}

local Nations: { [string]: Nation } = {
	england = {
		id = "england", name = "영국", startPort = "london",
		summary = "항해술 우수 (항해 속도 +5%)",
		speedMult = 1.05, sellBonus = 0, startCoins = 0, adventureXpMult = 1, battleXpMult = 1, hidden = true,
	},
	netherlands = {
		id = "netherlands", name = "네덜란드", startPort = "amsterdam",
		summary = "교역 수완 (판매 비율 +2%)",
		speedMult = 1, sellBonus = 0.02, startCoins = 0, adventureXpMult = 1, battleXpMult = 1, hidden = true,
	},
	france = {
		id = "france", name = "프랑스", startPort = "rouen",
		summary = "귀족 후원 (시작 코인 +200)",
		speedMult = 1, sellBonus = 0, startCoins = 200, adventureXpMult = 1, battleXpMult = 1, hidden = true,
	},
	denmark = {
		id = "denmark", name = "덴마크", startPort = "copenhagen",
		summary = "북해 해군 전통 (전투 경험 +20%)",
		speedMult = 1, sellBonus = 0, startCoins = 0, adventureXpMult = 1, battleXpMult = 1.2, hidden = true,
	},
	sweden = {
		id = "sweden", name = "스웨덴", startPort = "gothenburg",
		summary = "자연 연구 (모험 경험 +20%)",
		speedMult = 1, sellBonus = 0, startCoins = 0, adventureXpMult = 1.2, battleXpMult = 1, hidden = true,
	},
	venice = {
		id = "venice", name = "베네치아 공화국", startPort = "venice",
		summary = "지중해 무역 전통 (판매 비율 +3%, 시작 코인 -100)",
		speedMult = 1, sellBonus = 0.03, startCoins = -100, adventureXpMult = 1, battleXpMult = 1,
	},
	ottoman = {
		id = "ottoman", name = "오스만 제국", startPort = "istanbul",
		summary = "제국의 후원 (시작 코인 +100, 판매 비율 +1%)",
		speedMult = 1, sellBonus = 0.01, startCoins = 100, adventureXpMult = 1, battleXpMult = 1,
	},
	swahili = {
		id = "swahili", name = "스와힐리 해안", startPort = "zanzibar",
		summary = "계절풍의 아이 (항해 속도 +8%) · 인도양 시작",
		speedMult = 1.08, sellBonus = 0, startCoins = 0, adventureXpMult = 1, battleXpMult = 1,
	},
	malabar = {
		id = "malabar", name = "말라바르 해안", startPort = "calicut",
		summary = "향신료 항구 출신 (판매 비율 +4%, 시작 코인 -100) · 인도양 시작",
		speedMult = 1, sellBonus = 0.04, startCoins = -100, adventureXpMult = 1, battleXpMult = 1,
	},
	japan = {
		id = "japan", name = "일본", startPort = "nagasaki",
		summary = "무사 전통 (전투 경험 +25%) · 극동 시작",
		speedMult = 1, sellBonus = 0, startCoins = 0, adventureXpMult = 1, battleXpMult = 1.25,
	},
	new_spain = {
		id = "new_spain", name = "누에바 에스파냐", startPort = "veracruz",
		summary = "신대륙 탐험 (모험 경험 +25%) · 신대륙 시작",
		speedMult = 1, sellBonus = 0, startCoins = 0, adventureXpMult = 1.25, battleXpMult = 1,
	},
}

return {
	Goods = Goods,
	Ports = Ports,
	Nations = Nations,
}
