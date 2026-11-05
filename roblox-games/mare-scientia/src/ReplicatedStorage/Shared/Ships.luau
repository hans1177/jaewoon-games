--!strict
-- 선박 데이터. steam = true 인 배는 석탄(화물칸의 coal)을 태운다.

export type ShipDef = {
	id: string,
	name: string,
	steam: boolean,
	price: number,
	cargo: number, -- 화물칸
	speed: number, -- 노트
	hull: number, -- 내구도
	cannons: number,
	crew: number, -- 최대 선원
	fuelPerDay: number, -- 증기선 하루 석탄 소모
	techReq: string?, -- 구매에 필요한 기술
	summary: string,
}

local Ships: { [string]: ShipDef } = {
	caravel = {
		id = "caravel", name = "캐러벨", steam = false, price = 0,
		cargo = 20, speed = 7, hull = 100, cannons = 4, crew = 20, fuelPerDay = 0,
		summary = "시작 배. 균형형 범선",
	},
	fluyt = {
		id = "fluyt", name = "플루트선", steam = false, price = 1800,
		cargo = 45, speed = 6, hull = 120, cannons = 4, crew = 15, fuelPerDay = 0,
		summary = "화물이 많은 교역형 범선",
	},
	frigate = {
		id = "frigate", name = "프리깃", steam = false, price = 5000,
		cargo = 25, speed = 9, hull = 170, cannons = 12, crew = 36, fuelPerDay = 0,
		summary = "빠르고 포가 많은 전투형 범선",
	},
	galleon = {
		id = "galleon", name = "갈레온", steam = false, price = 6000,
		cargo = 40, speed = 6, hull = 220, cannons = 10, crew = 38, fuelPerDay = 0,
		summary = "튼튼한 대형 범선",
	},
	paddle_steamer = {
		id = "paddle_steamer", name = "외륜 증기선", steam = true, price = 9000,
		cargo = 35, speed = 8, hull = 200, cannons = 10, crew = 34, fuelPerDay = 1, techReq = "steam_paddle",
		summary = "바람을 타지 않는 증기선. 석탄 소모",
	},
	ironclad_frigate = {
		id = "ironclad_frigate", name = "철갑 증기 프리깃", steam = true, price = 20000,
		cargo = 30, speed = 10, hull = 380, cannons = 16, crew = 50, fuelPerDay = 2, techReq = "steam_boiler",
		summary = "최강 전투형 증기선. 석탄을 많이 태운다",
	},
}

-- 조선소에 진열되는 순서
local Order = { "caravel", "fluyt", "frigate", "galleon", "paddle_steamer", "ironclad_frigate" }

return {
	Ships = Ships,
	Order = Order,
}
