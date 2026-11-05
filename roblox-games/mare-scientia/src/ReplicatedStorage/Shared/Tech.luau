--!strict
-- 증기 연구 트리. 지식 카드를 발견해야 연구할 수 있다.

export type Tech = {
	id: string,
	name: string,
	cost: number,
	requiresCards: { string },
	requiresTech: { string },
	summary: string,
	-- 효과 수치
	pumpReduction: number?, -- 선체 피해 감소 비율
	cargoMult: number?, -- 화물칸 증가 비율
	cannonMult: number?, -- 포격 피해 증가 비율
	skill: string?, -- 해금되는 자동스킬
}

local Tech: { [string]: Tech } = {
	steam_pump = {
		id = "steam_pump", name = "증기 펌프", cost = 800,
		requiresCards = { "relic_aeolipile" }, requiresTech = {},
		summary = "침수 피해 감소 (선체 피해 -10%)",
		pumpReduction = 0.10,
	},
	steam_winch = {
		id = "steam_winch", name = "증기 윈치", cost = 1200,
		requiresCards = { "phy_papin_digester" }, requiresTech = {},
		summary = "화물칸 +10%",
		cargoMult = 0.10,
	},
	steam_paddle = {
		id = "steam_paddle", name = "외륜 증기선", cost = 2500,
		requiresCards = { "phy_papin_digester" }, requiresTech = { "steam_pump" },
		summary = "외륜 증기선 구매 가능",
	},
	steam_hook = {
		id = "steam_hook", name = "증기 갈고리", cost = 1800,
		requiresCards = { "phy_savery_pump" }, requiresTech = {},
		summary = "백병전 자동스킬 '증기 갈고리' 해금",
		skill = "steam_hook",
	},
	steam_cannon = {
		id = "steam_cannon", name = "증기 대포", cost = 3000,
		requiresCards = { "phy_savery_pump" }, requiresTech = { "steam_winch" },
		summary = "포격 피해 +15%",
		cannonMult = 0.15,
	},
	steam_boiler = {
		id = "steam_boiler", name = "증기 보일러", cost = 5000,
		requiresCards = { "phy_newcomen_engine" }, requiresTech = { "steam_paddle" },
		summary = "철갑 증기 프리깃 구매 가능",
	},
}

local Order = { "steam_pump", "steam_winch", "steam_paddle", "steam_hook", "steam_cannon", "steam_boiler" }

return {
	Tech = Tech,
	Order = Order,
}
