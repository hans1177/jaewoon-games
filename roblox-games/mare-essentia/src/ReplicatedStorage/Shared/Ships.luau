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
	class: number, -- 배 등급 (1~4). 등급 2 이상은 항만청 면허가 필요하다
	summary: string,
}

local Ships: { [string]: ShipDef } = {
	caravel = {
		id = "caravel", class = 1, name = "캐러벨", steam = false, price = 0,
		cargo = 20, speed = 7, hull = 100, cannons = 4, crew = 20, fuelPerDay = 0,
		summary = "시작 배. 균형형 범선",
	},
	fluyt = {
		id = "fluyt", class = 1, name = "플루트선", steam = false, price = 1800,
		cargo = 45, speed = 6, hull = 120, cannons = 4, crew = 15, fuelPerDay = 0,
		summary = "화물이 많은 교역형 범선",
	},
	frigate = {
		id = "frigate", class = 2, name = "프리깃", steam = false, price = 5000,
		cargo = 25, speed = 9, hull = 170, cannons = 12, crew = 36, fuelPerDay = 0,
		summary = "빠르고 포가 많은 전투형 범선",
	},
	galleon = {
		id = "galleon", class = 2, name = "갈레온", steam = false, price = 6000,
		cargo = 40, speed = 6, hull = 220, cannons = 10, crew = 38, fuelPerDay = 0,
		summary = "튼튼한 대형 범선",
	},
	paddle_steamer = {
		id = "paddle_steamer", class = 3, name = "외륜 증기선", steam = true, price = 9000,
		cargo = 35, speed = 8, hull = 200, cannons = 10, crew = 34, fuelPerDay = 1, techReq = "steam_paddle",
		summary = "바람을 타지 않는 증기선. 석탄 소모",
	},
	ironclad_frigate = {
		id = "ironclad_frigate", class = 4, name = "철갑 증기 프리깃", steam = true, price = 20000,
		cargo = 30, speed = 10, hull = 380, cannons = 16, crew = 50, fuelPerDay = 2, techReq = "steam_boiler",
		summary = "최강 전투형 증기선. 석탄을 많이 태운다",
	},
}

-- 항만청 면허: 등급 N+1 배를 사려면 면허 N단계가 필요하다.
local Licenses = {
	{ name = "연안 항해 면허", fame = 30, fee = 300 },
	{ name = "원양 항해 면허", fame = 150, fee = 1500 },
	{ name = "제독 면허", fame = 400, fee = 5000 },
}
local ClassNames = { "소형 상선", "중형선", "대형 증기선", "주력함" }

-- 대포 교체: mult는 대포 위력 보너스, weight는 화물칸이 줄어드는 비율.
export type Cannon = { id: string, name: string, price: number, mult: number, weight: number, techReq: string?, storyReq: string?, summary: string }
local Cannons: { Cannon } = {
	{ id = "basic", name = "철제 6파운드포", price = 0, mult = 0, weight = 0, summary = "기본 대포" },
	{ id = "culverin", name = "장거리 컬버린", price = 1200, mult = 0.08, weight = 0.02, summary = "멀리 나가는 긴 포신" },
	{ id = "demi", name = "데미 캐논", price = 3500, mult = 0.18, weight = 0.05, summary = "무겁고 강한 중포" },
	{ id = "carronade", name = "카로네이드", price = 6000, mult = 0.30, weight = 0.07, storyReq = "smith_1", summary = "짧고 굵은 근거리 대포 (스톡홀름 주조공의 비법)" },
	{ id = "steam_gun", name = "증기 압축포", price = 12000, mult = 0.50, weight = 0.10, techReq = "steam_cannon", summary = "증기압으로 쏘는 신형 대포" },
}
local CannonById: { [string]: Cannon } = {}
for _, c in Cannons do
	CannonById[c.id] = c
end

-- 선체 보강: 레벨이 오를수록 내구도가 늘고 무거워진다.
local Plating = {
	{ name = "목재 보강", price = 800, hull = 0.08, weight = 0.01, speed = 0 },
	{ name = "구리 피복", price = 2500, hull = 0.16, weight = 0.02, speed = 0.03 },
	{ name = "철판 장갑", price = 7000, hull = 0.30, weight = 0.06, speed = -0.04, techReq = "steam_boiler" },
}

-- 개조가 반영된 배 정보를 돌려준다 (기본 상태면 원본 그대로).
local function refit(def: ShipDef, cannonId: string?, plating: number?): ShipDef
	local cn = CannonById[cannonId or "basic"] or CannonById.basic
	local pl = Plating[plating or 0]
	if cn.id == "basic" and not pl then
		return def
	end
	local out = table.clone(def)
	local weight = cn.weight + (if pl then pl.weight else 0)
	out.cargo = math.floor(def.cargo * (1 - weight))
	if pl then
		out.hull = math.floor(def.hull * (1 + pl.hull))
		out.speed = def.speed * (1 + pl.speed)
	end
	return out
end

-- 조선소에 진열되는 순서
local Order = { "caravel", "fluyt", "frigate", "galleon", "paddle_steamer", "ironclad_frigate" }

return {
	Ships = Ships,
	Order = Order,
	Licenses = Licenses,
	ClassNames = ClassNames,
	Cannons = Cannons,
	CannonById = CannonById,
	Plating = Plating,
	refit = refit,
}
