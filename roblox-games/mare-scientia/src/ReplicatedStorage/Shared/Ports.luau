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
}

local Ports: { [string]: Port } = {
	london = {
		id = "london", name = "런던", country = "england", lat = 51.51, lon = -0.13,
		produces = { "wool", "coal", "tin" }, demands = { "spice", "wine", "amber", "tea", "silk", "porcelain", "whale_oil" }, shipyard = true,
	},
	amsterdam = {
		id = "amsterdam", name = "암스테르담", country = "netherlands", lat = 52.37, lon = 4.90,
		produces = { "spice", "cheese", "tea", "porcelain" }, demands = { "wool", "timber", "iron", "tobacco", "whale_oil" }, shipyard = true,
	},
	rouen = {
		id = "rouen", name = "루앙", country = "france", lat = 49.44, lon = 1.10,
		produces = { "wine", "cloth", "salt", "tin" }, demands = { "coal", "fish", "iron" }, shipyard = true,
	},
	copenhagen = {
		id = "copenhagen", name = "코펜하겐", country = "denmark", lat = 55.68, lon = 12.57,
		produces = { "amber", "fish", "beer", "whale_oil" }, demands = { "wine", "cloth", "spice", "porcelain" }, shipyard = true,
	},
	gothenburg = {
		id = "gothenburg", name = "예테보리", country = "sweden", lat = 57.71, lon = 11.97,
		produces = { "iron", "timber", "fish" }, demands = { "cheese", "wine", "cloth", "tobacco" }, shipyard = true,
	},
	antwerp = {
		id = "antwerp", name = "안트베르펀", country = "netherlands", lat = 51.22, lon = 4.40,
		produces = { "glass", "cloth", "linen" }, demands = { "wool", "wine", "sugar" }, shipyard = false,
	},
	hamburg = {
		id = "hamburg", name = "함부르크", country = "germany", lat = 53.55, lon = 9.99,
		produces = { "beer", "cloth" }, demands = { "fish", "fur", "sugar", "olive_oil", "whale_oil", "porcelain" }, shipyard = false,
	},
	bergen = {
		id = "bergen", name = "베르겐", country = "norway", lat = 60.39, lon = 5.32,
		produces = { "fish", "fur", "whale_oil" }, demands = { "salt", "wine", "cloth", "olive_oil", "coffee" }, shipyard = false,
	},
	edinburgh = {
		id = "edinburgh", name = "에든버러", country = "scotland", lat = 55.95, lon = -3.19,
		produces = { "coal", "wool", "linen" }, demands = { "glass", "wine" }, shipyard = false,
	},
	dublin = {
		id = "dublin", name = "더블린", country = "ireland", lat = 53.35, lon = -6.26,
		produces = { "wool", "beer" }, demands = { "iron", "sugar", "tobacco" }, shipyard = false,
	},
	bordeaux = {
		id = "bordeaux", name = "보르도", country = "france", lat = 44.84, lon = -0.58,
		produces = { "wine", "salt" }, demands = { "wool", "timber", "coal" }, shipyard = false,
	},
	stockholm = {
		id = "stockholm", name = "스톡홀름", country = "sweden", lat = 59.33, lon = 18.07,
		produces = { "iron", "fur" }, demands = { "wine", "sugar", "cloth", "coffee", "porcelain" }, shipyard = false,
	},
	gdansk = {
		id = "gdansk", name = "그단스크", country = "poland", lat = 54.35, lon = 18.65,
		produces = { "amber", "timber", "beer" }, demands = { "wine", "cloth", "spice", "coffee" }, shipyard = false,
	},
	seville = {
		id = "seville", name = "세비야", country = "spain", lat = 37.39, lon = -5.98,
		produces = { "wine", "sugar", "tobacco" }, demands = { "wool", "fur", "iron", "linen" }, shipyard = false,
	},
	marseille = {
		id = "marseille", name = "마르세유", country = "france", lat = 43.30, lon = 5.37,
		produces = { "olive_oil", "salt", "coffee" }, demands = { "wool", "timber", "tea", "tin" }, shipyard = true,
	},
	genoa = {
		id = "genoa", name = "제노바", country = "italy", lat = 44.41, lon = 8.93,
		produces = { "silk", "olive_oil" }, demands = { "wool", "iron", "beer", "tin" }, shipyard = false,
	},
	venice = {
		id = "venice", name = "베네치아", country = "venice", lat = 45.44, lon = 12.32,
		produces = { "glass", "silk", "coffee" }, demands = { "wool", "fur", "iron", "tin" }, shipyard = true,
	},
	livorno = {
		id = "livorno", name = "리보르노", country = "tuscany", lat = 43.55, lon = 10.31,
		produces = { "olive_oil", "wine" }, demands = { "coal", "fish", "fur" }, shipyard = false,
	},
	naples = {
		id = "naples", name = "나폴리", country = "naples", lat = 40.85, lon = 14.27,
		produces = { "wine", "silk" }, demands = { "iron", "timber", "coal", "linen" }, shipyard = false,
	},
	lisbon = {
		id = "lisbon", name = "리스본", country = "portugal", lat = 38.72, lon = -9.14,
		produces = { "salt", "sugar", "spice", "porcelain", "tobacco" }, demands = { "fur", "timber", "iron", "beer", "linen" }, shipyard = true,
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
		produces = { "salt", "wine", "tobacco", "sugar" }, demands = { "fur", "timber", "cloth", "coal" }, shipyard = true,
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
