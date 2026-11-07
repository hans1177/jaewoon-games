--!strict
-- 항해 계산: 거리, 소요일, 보급품, 석탄, 항해 사건.

local Voyage = {}

local SEA_ROUTE_FACTOR = 1.25 -- 직선거리보다 바닷길이 더 길다
local KM_PER_KNOT_DAY = 1.852 * 24 * 0.5 -- 1노트로 하루 가는 거리 (효율 50%)
local SAIL_FALLBACK = 0.4 -- 석탄이 떨어진 증기선의 속도 배율

export type Plan = {
	distanceKm: number,
	days: number,
	supplies: number,
	coal: number,
}

export type Event = {
	kind: string, -- none | calm | tailwind | storm | pirates | drift | fever
	amount: number,
}

function Voyage.distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number
	local r = 6371
	local p1 = math.rad(lat1)
	local p2 = math.rad(lat2)
	local dp = math.rad(lat2 - lat1)
	local dl = math.rad(lon2 - lon1)
	local a = math.sin(dp / 2) ^ 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ^ 2
	return 2 * r * math.asin(math.min(1, math.sqrt(a))) * SEA_ROUTE_FACTOR
end

function Voyage.suppliesPerDay(crew: number): number
	return math.max(1, math.ceil(crew / 10))
end

-- windMult: 범선만 바람의 영향을 받는다 (0.8 ~ 1.2). 증기선은 석탄이 있으면 바람과 무관.
function Voyage.plan(
	speedKnots: number,
	steam: boolean,
	fuelPerDay: number,
	coalAvailable: number,
	crew: number,
	distanceKm: number,
	windMult: number
): Plan
	local kmPerDay = speedKnots * KM_PER_KNOT_DAY
	local days = 1
	local coal = 0

	if steam and fuelPerDay > 0 then
		local fullDays = math.max(1, math.ceil(distanceKm / kmPerDay))
		local needed = fuelPerDay * fullDays
		if coalAvailable >= needed then
			days = fullDays
			coal = needed
		else
			local steamDays = math.floor(coalAvailable / fuelPerDay)
			local covered = steamDays * kmPerDay
			local remaining = math.max(0, distanceKm - covered)
			local sailPerDay = kmPerDay * SAIL_FALLBACK * windMult
			days = math.max(1, steamDays + math.ceil(remaining / sailPerDay))
			coal = steamDays * fuelPerDay
		end
	else
		days = math.max(1, math.ceil(distanceKm / (kmPerDay * windMult)))
	end

	return {
		distanceKm = distanceKm,
		days = days,
		supplies = Voyage.suppliesPerDay(crew) * days,
		coal = coal,
	}
end

local EVENT_WEIGHTS = {
	{ "calm", 20 },
	{ "tailwind", 15 },
	{ "storm", 20 },
	{ "pirates", 25 },
	{ "drift", 10 },
	{ "fever", 8 },
	{ "school", 9 }, -- 물고기떼: 식량을 얻는다
	{ "merchant", 10 }, -- 상선 조우: 물물교환 이문
	{ "fog", 8 }, -- 짙은 안개: 하루 지연
	{ "reef", 6 }, -- 암초: 선체 손상
	{ "rescue", 6 }, -- 조난자 구조
	{ "island", 5 }, -- 미지의 섬
	{ "ghost", 3 }, -- 유령선 목격
}

-- rng: 0~1 사이 값을 돌려주는 함수
function Voyage.rollEvent(rng: () -> number, days: number): Event
	local chance = math.min(0.85, 0.35 + 0.04 * days)
	if rng() > chance then
		return { kind = "none", amount = 0 }
	end

	local total = 0
	for _, entry in EVENT_WEIGHTS do
		total += entry[2] :: number
	end
	local roll = rng() * total
	local picked = "calm"
	for _, entry in EVENT_WEIGHTS do
		roll -= entry[2] :: number
		if roll <= 0 then
			picked = entry[1] :: string
			break
		end
	end

	local amount = 0
	if picked == "storm" then
		amount = 0.05 + 0.10 * rng() -- 선체 피해 비율
	elseif picked == "drift" then
		amount = math.floor(20 + 60 * rng()) -- 표류물 코인
	elseif picked == "fever" then
		amount = 1 + math.floor(2 * rng()) -- 선원 손실
	elseif picked == "tailwind" then
		amount = 1 -- 하루 단축
	elseif picked == "school" then
		amount = 10 + math.floor(15 * rng()) -- 보급품
	elseif picked == "merchant" then
		amount = math.floor(40 + 90 * rng()) -- 코인
	elseif picked == "fog" then
		amount = 1 -- 하루 지연
	elseif picked == "reef" then
		amount = 0.03 + 0.05 * rng() -- 선체 피해 비율
	elseif picked == "rescue" then
		amount = 1 + math.floor(3 * rng()) -- 합류 선원
	elseif picked == "island" then
		amount = math.floor(60 + 140 * rng()) -- 코인
	elseif picked == "ghost" then
		amount = 2 -- 명성
	end
	return { kind = picked, amount = amount }
end

function Voyage.windMult(rng: () -> number): number
	return 0.8 + 0.4 * rng()
end

return Voyage
