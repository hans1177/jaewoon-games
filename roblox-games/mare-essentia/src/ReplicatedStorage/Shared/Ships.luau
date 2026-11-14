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
	regions: { string }?, -- 이 문화권(CultureRegions)의 조선소에서만 살 수 있다 (없으면 어디서나)
	nation: string?, -- 이 나라 주인공만 살 수 있는 전용 배 (어느 조선소에서나)
	visual: string?, -- 입체 모델·그림을 빌려 올 기본 배 id
	tint: { number }?, -- 선체 색 {r,g,b} (지역·나라의 특징)
	rowed: boolean?, -- 노로 움직이는 배: 바람이 없어도 속도를 잃지 않는다
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

	-- ───── 지역 전통 배 (그 문화권 조선소에서만 판매) ─────
	galley = { id = "galley", class = 1, name = "갤리선", steam = false, price = 2200, cargo = 28, speed = 8, hull = 110, cannons = 6, crew = 40, fuelPerDay = 0,
		regions = { "mediterranean" }, visual = "caravel", tint = { 150, 60, 40 }, rowed = true, summary = "[지중해] 노로 움직이는 배. 무풍에도 빠르고 노잡이가 많다" },
	xebec = { id = "xebec", class = 2, name = "제벡", steam = false, price = 4200, cargo = 30, speed = 9, hull = 150, cannons = 10, crew = 34, fuelPerDay = 0,
		regions = { "mediterranean", "red_sea" }, visual = "frigate", tint = { 70, 90, 120 }, summary = "[지중해·홍해] 삼각돛과 노를 함께 쓰는 날쌘 해적·상선" },
	cog = { id = "cog", class = 1, name = "코그선", steam = false, price = 1500, cargo = 50, speed = 5, hull = 130, cannons = 3, crew = 14, fuelPerDay = 0,
		regions = { "north_sea" }, visual = "fluyt", tint = { 96, 82, 60 }, summary = "[북해] 둥글고 깊은 짐배. 느리지만 화물이 많다" },
	carrack = { id = "carrack", class = 2, name = "캐랙", steam = false, price = 5200, cargo = 62, speed = 5, hull = 200, cannons = 8, crew = 36, fuelPerDay = 0,
		regions = { "atlantic_europe" }, visual = "galleon", tint = { 100, 64, 40 }, summary = "[대서양 유럽] 높은 선수루의 대형 원양 화물선" },
	brigantine = { id = "brigantine", class = 1, name = "브리간틴", steam = false, price = 2600, cargo = 32, speed = 8, hull = 105, cannons = 6, crew = 22, fuelPerDay = 0,
		regions = { "americas" }, visual = "caravel", tint = { 80, 100, 70 }, summary = "[아메리카] 카리브해를 누비는 빠르고 다재다능한 배" },
	dhow = { id = "dhow", class = 1, name = "다우선", steam = false, price = 1400, cargo = 36, speed = 7, hull = 90, cannons = 2, crew = 14, fuelPerDay = 0,
		regions = { "red_sea", "south_asia", "east_africa" }, visual = "caravel", tint = { 190, 160, 110 }, summary = "[인도양] 삼각돛 하나로 계절풍을 타고 먼 거리를 간다" },
	baghlah = { id = "baghlah", class = 2, name = "바글라", steam = false, price = 3600, cargo = 56, speed = 6, hull = 140, cannons = 6, crew = 28, fuelPerDay = 0,
		regions = { "red_sea", "south_asia" }, visual = "fluyt", tint = { 160, 120, 70 }, summary = "[홍해·인도] 큰 다우. 향신료와 커피를 가득 싣는다" },
	mtepe = { id = "mtepe", class = 1, name = "음테페", steam = false, price = 1200, cargo = 30, speed = 7, hull = 80, cannons = 1, crew = 12, fuelPerDay = 0,
		regions = { "east_africa" }, visual = "caravel", tint = { 205, 175, 120 }, summary = "[동아프리카] 못 없이 끈으로 엮어 만든 스와힐리 배" },
	pirogue = { id = "pirogue", class = 1, name = "대형 카누", steam = false, price = 900, cargo = 22, speed = 7, hull = 70, cannons = 1, crew = 16, fuelPerDay = 0,
		regions = { "west_africa" }, visual = "caravel", tint = { 130, 90, 50 }, summary = "[서아프리카] 통나무를 파서 만든 연안 카누. 얕은 강어귀에 강하다" },
	junk = { id = "junk", class = 2, name = "정크선", steam = false, price = 3800, cargo = 58, speed = 6, hull = 190, cannons = 6, crew = 30, fuelPerDay = 0,
		regions = { "east_asia" }, visual = "galleon", tint = { 140, 40, 30 }, summary = "[동아시아] 칸막이 선창과 대나무 돛. 구멍이 나도 잘 가라앉지 않는다" },
	geobukseon = { id = "geobukseon", class = 2, name = "거북선", steam = false, price = 5500, cargo = 15, speed = 6, hull = 260, cannons = 14, crew = 60, fuelPerDay = 0,
		regions = { "east_asia" }, visual = "galleon", tint = { 70, 76, 70 }, rowed = true, summary = "[동아시아] 지붕을 씌운 돌격선. 단단하고 포가 많다" },
	prau = { id = "prau", class = 1, name = "프라우", steam = false, price = 1100, cargo = 18, speed = 10, hull = 70, cannons = 2, crew = 10, fuelPerDay = 0,
		regions = { "southeast_asia" }, visual = "caravel", tint = { 200, 120, 60 }, summary = "[동남아] 한쪽에 부재를 단 날렵한 배. 아주 빠르다" },
	pattamar = { id = "pattamar", class = 1, name = "파타마르", steam = false, price = 1900, cargo = 34, speed = 8, hull = 95, cannons = 3, crew = 16, fuelPerDay = 0,
		regions = { "south_asia" }, visual = "caravel", tint = { 120, 150, 110 }, summary = "[인도 서해안] 말라바르의 빠른 연안 상선" },

	-- ───── 나라 전용 배 (그 나라 주인공만, 어느 조선소에서나) ─────
	privateer = { id = "privateer", class = 1, name = "사략선", steam = false, price = 2800, cargo = 20, speed = 8, hull = 100, cannons = 8, crew = 24, fuelPerDay = 0,
		nation = "england", visual = "caravel", tint = { 40, 50, 80 }, summary = "[영국 전용] 포가 많은 날쌘 무장 상선" },
	east_indiaman = { id = "east_indiaman", class = 2, name = "동인도선", steam = false, price = 5200, cargo = 70, speed = 5, hull = 190, cannons = 8, crew = 36, fuelPerDay = 0,
		nation = "netherlands", visual = "fluyt", tint = { 60, 70, 100 }, summary = "[네덜란드 전용] 화물이 가장 많은 대형 무역선" },
	corvette = { id = "corvette", class = 1, name = "코르벳", steam = false, price = 3000, cargo = 24, speed = 9, hull = 100, cannons = 8, crew = 26, fuelPerDay = 0,
		nation = "france", visual = "frigate", tint = { 200, 200, 210 }, summary = "[프랑스 전용] 작지만 빠르고 포가 있는 호위선" },
	nau = { id = "nau", class = 2, name = "인도 항로 나우", steam = false, price = 5400, cargo = 66, speed = 6, hull = 210, cannons = 10, crew = 40, fuelPerDay = 0,
		nation = "portugal", visual = "galleon", tint = { 180, 40, 40 }, summary = "[포르투갈 전용] 희망봉을 도는 튼튼한 원양 대형선" },
	kadirga = { id = "kadirga", class = 2, name = "카디르가", steam = false, price = 3800, cargo = 22, speed = 8, hull = 150, cannons = 10, crew = 50, fuelPerDay = 0,
		nation = "ottoman", visual = "frigate", tint = { 120, 30, 40 }, rowed = true, summary = "[오스만 전용] 노잡이가 많은 술탄의 갤리" },
	jahazi = { id = "jahazi", class = 1, name = "자하지", steam = false, price = 1700, cargo = 40, speed = 7, hull = 100, cannons = 3, crew = 18, fuelPerDay = 0,
		nation = "swahili", visual = "fluyt", tint = { 220, 190, 130 }, summary = "[스와힐리 전용] 계절풍을 타는 큰 돛배" },
	kotia = { id = "kotia", class = 1, name = "코티아", steam = false, price = 2000, cargo = 40, speed = 7, hull = 110, cannons = 4, crew = 18, fuelPerDay = 0,
		nation = "malabar", visual = "fluyt", tint = { 110, 140, 90 }, summary = "[말라바르 전용] 후추 무역용 튼튼한 상선" },
	sekibune = { id = "sekibune", class = 1, name = "세키부네", steam = false, price = 2600, cargo = 28, speed = 8, hull = 120, cannons = 6, crew = 36, fuelPerDay = 0,
		nation = "japan", visual = "caravel", tint = { 60, 60, 66 }, rowed = true, summary = "[일본 전용] 방패 판자를 두른 빠른 노선" },
	manila_galleon = { id = "manila_galleon", class = 2, name = "마닐라 갈레온", steam = false, price = 6500, cargo = 85, speed = 5, hull = 240, cannons = 8, crew = 40, fuelPerDay = 0,
		nation = "new_spain", visual = "galleon", tint = { 150, 110, 40 }, summary = "[누에바 에스파냐 전용] 태평양을 건너는 은과 비단의 거대 화물선" },
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
local Order = {
	"caravel", "fluyt", "frigate", "galleon",
	"galley", "xebec", "cog", "carrack", "brigantine", "dhow", "baghlah", "mtepe", "pirogue", "junk", "geobukseon", "prau", "pattamar",
	"privateer", "east_indiaman", "corvette", "nau", "kadirga", "jahazi", "kotia", "sekibune", "manila_galleon",
	"paddle_steamer", "ironclad_frigate",
}

-- 이 배를 지금 살 수 없는 이유 (살 수 있으면 nil). regionId = 현재 항구의 문화권, nationId = 주인공 나라.
local RegionNames: { [string]: string } = {
	mediterranean = "지중해", red_sea = "홍해·중동", north_sea = "북해·발트", atlantic_europe = "대서양 유럽", americas = "아메리카",
	west_africa = "서아프리카", east_africa = "동아프리카", south_asia = "남아시아", southeast_asia = "동남아·오세아니아", east_asia = "동아시아",
}
local function saleBlock(def: ShipDef, regionId: string?, nationId: string?): string?
	if def.nation and def.nation ~= nationId then
		return "다른 나라 전용 배예요"
	end
	if def.regions and (regionId == nil or not table.find(def.regions, regionId)) then
		local names = {}
		for _, r in def.regions do
			table.insert(names, RegionNames[r] or r)
		end
		return "이 지역 조선소에서는 팔지 않아요 (" .. table.concat(names, "·") .. "에서 판매)"
	end
	return nil
end

-- 입체 모델·그림을 빌려 올 기본 배 id
local function visualOf(shipId: string): string
	local d = Ships[shipId]
	return if d and d.visual then d.visual else shipId
end

return {
	Ships = Ships,
	Order = Order,
	Licenses = Licenses,
	ClassNames = ClassNames,
	Cannons = Cannons,
	CannonById = CannonById,
	Plating = Plating,
	refit = refit,
	saleBlock = saleBlock,
	RegionNames = RegionNames,
	visualOf = visualOf,
}
