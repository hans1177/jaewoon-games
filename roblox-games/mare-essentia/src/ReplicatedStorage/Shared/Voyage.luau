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
	{ "blockade", 5 }, -- 해상 봉쇄: 통행료
	{ "dolphins", 7 }, -- 돌고래 떼: 사기 상승, 도감
	{ "whale", 4 }, -- 고래 목격: 도감, 명성
}

-- rng: 0~1 사이 값을 돌려주는 함수
-- 날씨: 날짜와 항구로 정해지는 예보. 같은 날 같은 항구에서는 항상 같다.
export type Weather = { id: string, name: string, wind: number, hint: string }
local WEATHERS: { { any } } = {
	{ 18, "tail", "순풍", 1.2, "바람이 등을 밀어요. 빨리 갈 수 있어요" },
	{ 50, "clear", "맑음", 1.0, "항해하기 좋은 날씨예요" },
	{ 68, "head", "역풍", 0.85, "맞바람이에요. 시간이 더 걸려요" },
	{ 80, "calm", "무풍", 0.7, "바람이 거의 없어요. 매우 느려요" },
	{ 92, "rain", "비", 0.95, "비가 와요. 안개와 암초에 주의해요" },
	{ 100, "storm", "폭풍 접근", 0.9, "폭풍이 올 수 있어요. 하루 기다리는 것도 방법이에요" },
}
-- 게임 날짜를 반구별 계절로 변환한다. 1 겨울, 2 봄, 3 여름, 4 가을.
function Voyage.season(day: number, latitude: number): number
	local month = math.floor((day % 365) / (365 / 12))
	if latitude < 0 then month = (month + 6) % 12 end
	return math.floor(((month + 1) % 12) / 3) + 1
end

function Voyage.weather(day: number, portId: string): Weather
	local h = day * 131 + 7
	for i = 1, #portId do
		h = (h * 31 + string.byte(portId, i)) % 100003
	end
	h = (h * 7919 + day * 17) % 100
	for _, w in WEATHERS do
		if h < (w[1] :: number) then
			return { id = w[2] :: string, name = w[3] :: string, wind = w[4] :: number, hint = w[5] :: string }
		end
	end
	return { id = "clear", name = "맑음", wind = 1.0, hint = "" }
end

function Voyage.rollEvent(rng: () -> number, days: number, weatherId: string?): Event
	local chance = math.min(0.85, 0.35 + 0.04 * days)
	if rng() > chance then
		return { kind = "none", amount = 0 }
	end

	-- 날씨가 사건 확률을 바꾼다
	local boost: { [string]: number } = {}
	if weatherId == "storm" then
		boost = { storm = 4, pirates = 0.6 }
	elseif weatherId == "rain" then
		boost = { fog = 2.5, reef = 1.8, storm = 1.5 }
	elseif weatherId == "tail" then
		boost = { tailwind = 2, calm = 0.5 }
	elseif weatherId == "calm" then
		boost = { calm = 2, fever = 1.5 }
	end
	local total = 0
	for _, entry in EVENT_WEIGHTS do
		total += (entry[2] :: number) * (boost[entry[1] :: string] or 1)
	end
	local roll = rng() * total
	local picked = "calm"
	for _, entry in EVENT_WEIGHTS do
		roll -= (entry[2] :: number) * (boost[entry[1] :: string] or 1)
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
	elseif picked == "blockade" then
		amount = 0.05 + 0.05 * rng() -- 통행료 비율
	elseif picked == "dolphins" then
		amount = 5 -- 사기
	elseif picked == "whale" then
		amount = 4 -- 사기
	end
	return { kind = picked, amount = amount }
end

function Voyage.windMult(rng: () -> number): number
	return 0.8 + 0.4 * rng()
end

return Voyage
