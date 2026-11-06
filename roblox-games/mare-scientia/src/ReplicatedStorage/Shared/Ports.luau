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
}

local Ports: { [string]: Port } = {
	london = {
		id = "london", name = "런던", country = "england", lat = 51.51, lon = -0.13,
		produces = { "wool", "coal", "tin" }, demands = { "spice", "wine", "amber", "tea", "silk", "porcelain", "whale_oil", "marble", "coral", "saffron", "carpet", "dates", "raisins", "cotton", "leather", "ivory", "pepper", "pearls", "gold", "palm_oil", "gum_arabic", "ebony", "feathers" }, shipyard = true,
	},
	amsterdam = {
		id = "amsterdam", name = "암스테르담", country = "netherlands", lat = 52.37, lon = 4.90,
		produces = { "spice", "cheese", "tea", "porcelain" }, demands = { "wool", "timber", "iron", "tobacco", "whale_oil", "marble", "coral", "carpet", "dates", "cotton", "leather", "ivory", "pepper", "pearls", "gold", "palm_oil", "gum_arabic", "ebony", "feathers" }, shipyard = true,
	},
	rouen = {
		id = "rouen", name = "루앙", country = "france", lat = 49.44, lon = 1.10,
		produces = { "wine", "cloth", "salt", "tin" }, demands = { "coal", "fish", "iron", "incense", "cotton", "leather", "palm_oil" }, shipyard = true,
	},
	copenhagen = {
		id = "copenhagen", name = "코펜하겐", country = "denmark", lat = 55.68, lon = 12.57,
		produces = { "amber", "fish", "beer", "whale_oil" }, demands = { "wine", "cloth", "spice", "porcelain", "marble", "carpet", "leather", "pepper", "ebony" }, shipyard = true,
	},
	gothenburg = {
		id = "gothenburg", name = "예테보리", country = "sweden", lat = 57.71, lon = 11.97,
		produces = { "iron", "timber", "fish" }, demands = { "cheese", "wine", "cloth", "tobacco" }, shipyard = true,
	},
	antwerp = {
		id = "antwerp", name = "안트베르펀", country = "netherlands", lat = 51.22, lon = 4.40,
		produces = { "glass", "cloth", "linen" }, demands = { "wool", "wine", "sugar", "saffron", "incense", "cotton", "gum_arabic" }, shipyard = false,
	},
	hamburg = {
		id = "hamburg", name = "함부르크", country = "germany", lat = 53.55, lon = 9.99,
		produces = { "beer", "cloth" }, demands = { "fish", "fur", "sugar", "olive_oil", "whale_oil", "porcelain", "marble", "saffron", "carpet", "dates", "cotton", "pepper", "palm_oil" }, shipyard = false,
	},
	bergen = {
		id = "bergen", name = "베르겐", country = "norway", lat = 60.39, lon = 5.32,
		produces = { "fish", "fur", "whale_oil" }, demands = { "salt", "wine", "cloth", "olive_oil", "coffee", "saffron", "dates", "raisins" }, shipyard = false,
	},
	edinburgh = {
		id = "edinburgh", name = "에든버러", country = "scotland", lat = 55.95, lon = -3.19,
		produces = { "coal", "wool", "linen" }, demands = { "glass", "wine", "raisins" }, shipyard = false,
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
		produces = { "iron", "fur" }, demands = { "wine", "sugar", "cloth", "coffee", "porcelain", "carpet", "raisins" }, shipyard = false,
	},
	gdansk = {
		id = "gdansk", name = "그단스크", country = "poland", lat = 54.35, lon = 18.65,
		produces = { "amber", "timber", "beer" }, demands = { "wine", "cloth", "spice", "coffee", "incense", "leather", "pepper" }, shipyard = false,
	},
	seville = {
		id = "seville", name = "세비야", country = "spain", lat = 37.39, lon = -5.98,
		produces = { "wine", "sugar", "tobacco", "leather", "pepper" }, demands = { "wool", "fur", "iron", "linen", "incense", "ebony" }, shipyard = false,
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
		produces = { "glass", "silk", "coffee" }, demands = { "wool", "fur", "iron", "tin", "coral", "ivory", "pearls", "gold", "gum_arabic", "feathers" }, shipyard = true,
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
		produces = { "salt", "sugar", "spice", "porcelain", "tobacco", "pepper" }, demands = { "fur", "timber", "iron", "beer", "linen", "coral", "incense", "gold" }, shipyard = true,
	},
	rotterdam = {
		id = "rotterdam", name = "로테르담", country = "netherlands", lat = 51.92, lon = 4.48,
		produces = { "cheese", "linen", "beer" }, demands = { "wool", "iron", "timber", "whale_oil" }, shipyard = true,
	},
	plymouth = {
		id = "plymouth", name = "플리머스", country = "england", lat = 50.37, lon = -4.14,
		produces = { "tin", "fish", "salt" }, demands = { "wine", "sugar", "tobacco", "timber" }, shipyard = true,
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
		produces = { "silk", "spice", "coffee", "porcelain", "saffron", "carpet", "pearls" }, demands = { "wool", "fur", "iron", "glass", "amber", "gold" }, shipyard = true,
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
		produces = { "fur", "timber", "iron", "linen" }, demands = { "wine", "glass", "sugar", "tea", "porcelain", "marble", "carpet", "pearls", "feathers" }, shipyard = true,
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
}

local Nations: { [string]: Nation } = {
	england = {
		id = "england", name = "영국", startPort = "london",
		summary = "항해술 우수 (항해 속도 +5%)",
		speedMult = 1.05, sellBonus = 0, startCoins = 0, adventureXpMult = 1, battleXpMult = 1,
	},
	netherlands = {
		id = "netherlands", name = "네덜란드", startPort = "amsterdam",
		summary = "교역 수완 (판매 비율 +2%)",
		speedMult = 1, sellBonus = 0.02, startCoins = 0, adventureXpMult = 1, battleXpMult = 1,
	},
	france = {
		id = "france", name = "프랑스", startPort = "rouen",
		summary = "귀족 후원 (시작 코인 +200)",
		speedMult = 1, sellBonus = 0, startCoins = 200, adventureXpMult = 1, battleXpMult = 1,
	},
	denmark = {
		id = "denmark", name = "덴마크", startPort = "copenhagen",
		summary = "북해 해군 전통 (전투 경험 +20%)",
		speedMult = 1, sellBonus = 0, startCoins = 0, adventureXpMult = 1, battleXpMult = 1.2,
	},
	sweden = {
		id = "sweden", name = "스웨덴", startPort = "gothenburg",
		summary = "자연 연구 (모험 경험 +20%)",
		speedMult = 1, sellBonus = 0, startCoins = 0, adventureXpMult = 1.2, battleXpMult = 1,
	},
	venice = {
		id = "venice", name = "베네치아 공화국", startPort = "venice",
		summary = "지중해 무역 전통 (판매 비율 +3%, 시작 코인 -100)",
		speedMult = 1, sellBonus = 0.03, startCoins = -100, adventureXpMult = 1, battleXpMult = 1,
	},
}

return {
	Goods = Goods,
	Ports = Ports,
	Nations = Nations,
}
