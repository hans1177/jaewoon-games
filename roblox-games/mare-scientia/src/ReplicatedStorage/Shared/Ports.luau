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
}

local Ports: { [string]: Port } = {
	london = {
		id = "london", name = "런던", country = "england", lat = 51.51, lon = -0.13,
		produces = { "wool", "coal" }, demands = { "spice", "wine", "amber", "tea" }, shipyard = true,
	},
	amsterdam = {
		id = "amsterdam", name = "암스테르담", country = "netherlands", lat = 52.37, lon = 4.90,
		produces = { "spice", "cheese", "tea" }, demands = { "wool", "timber", "iron" }, shipyard = true,
	},
	rouen = {
		id = "rouen", name = "루앙", country = "france", lat = 49.44, lon = 1.10,
		produces = { "wine", "cloth", "salt" }, demands = { "coal", "fish", "iron" }, shipyard = true,
	},
	copenhagen = {
		id = "copenhagen", name = "코펜하겐", country = "denmark", lat = 55.68, lon = 12.57,
		produces = { "amber", "fish", "beer" }, demands = { "wine", "cloth", "spice" }, shipyard = true,
	},
	gothenburg = {
		id = "gothenburg", name = "예테보리", country = "sweden", lat = 57.71, lon = 11.97,
		produces = { "iron", "timber", "fish" }, demands = { "cheese", "wine", "cloth" }, shipyard = true,
	},
	antwerp = {
		id = "antwerp", name = "안트베르펀", country = "netherlands", lat = 51.22, lon = 4.40,
		produces = { "glass", "cloth" }, demands = { "wool", "wine", "sugar" }, shipyard = false,
	},
	hamburg = {
		id = "hamburg", name = "함부르크", country = "germany", lat = 53.55, lon = 9.99,
		produces = { "beer", "cloth" }, demands = { "fish", "fur", "sugar" }, shipyard = false,
	},
	bergen = {
		id = "bergen", name = "베르겐", country = "norway", lat = 60.39, lon = 5.32,
		produces = { "fish", "fur" }, demands = { "salt", "wine", "cloth" }, shipyard = false,
	},
	edinburgh = {
		id = "edinburgh", name = "에든버러", country = "scotland", lat = 55.95, lon = -3.19,
		produces = { "coal", "wool" }, demands = { "glass", "wine" }, shipyard = false,
	},
	dublin = {
		id = "dublin", name = "더블린", country = "ireland", lat = 53.35, lon = -6.26,
		produces = { "wool", "beer" }, demands = { "iron", "sugar" }, shipyard = false,
	},
	bordeaux = {
		id = "bordeaux", name = "보르도", country = "france", lat = 44.84, lon = -0.58,
		produces = { "wine", "salt" }, demands = { "wool", "timber", "coal" }, shipyard = false,
	},
	lisbon = {
		id = "lisbon", name = "리스본", country = "portugal", lat = 38.72, lon = -9.14,
		produces = { "salt", "sugar", "spice" }, demands = { "fur", "timber", "iron", "beer" }, shipyard = true,
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
}

return {
	Goods = Goods,
	Ports = Ports,
	Nations = Nations,
}
