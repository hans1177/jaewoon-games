--!strict
-- 해상 도감 카드: 항해 중 바다에서 만나 얻는다. (항구 탐험으로 얻는 카드와 별개)
-- box = { 남위/북위 최소, 최대, 서경/동경 최소, 최대 } — 항로 중간 지점이 이 구역 안이면 후보가 된다.
-- event 가 있으면 그 항해 사건이 일어났을 때만 후보가 된다.

export type Row = { id: string, box: { number }?, event: string?, chance: number }

local ATLANTIC_N = { 45, 72, -35, 15 }
local NORTH_SEA = { 50, 62, -5, 12 }
local ARCTIC = { 62, 85, -60, 40 }
local MED = { 30, 46, -6, 36 }
local TROP_ATL = { -25, 30, -80, -10 }
local CARIB = { 8, 30, -92, -55 }
local SARGASSO = { 20, 36, -75, -30 }
local EQ_ATL = { -8, 10, -40, 15 }
local INDIAN = { -35, 25, 35, 100 }
local SE_ASIA = { -12, 25, 95, 135 }
local EAST_ASIA = { 15, 40, 105, 165 }
local PACIFIC = { -50, 55, 140, 180 }
local PACIFIC_E = { -50, 55, -180, -75 }
local SOUTH = { -60, -30, -180, 180 }
local ANY = { -80, 85, -180, 180 }

local Rows: { Row } = {
	-- 북해·북대서양
	{ id = "zoo_orca", box = ATLANTIC_N, chance = 0.14 },
	{ id = "zoo_gannet", box = NORTH_SEA, chance = 0.2 },
	{ id = "zoo_puffin", box = ATLANTIC_N, chance = 0.16 },
	{ id = "zoo_herring", box = NORTH_SEA, chance = 0.2 },
	{ id = "zoo_mackerel", box = ATLANTIC_N, chance = 0.16 },
	{ id = "geo_north_sea_swell", box = NORTH_SEA, chance = 0.2 },
	{ id = "geo_iceberg", box = { 48, 72, -60, -20 }, chance = 0.2 },
	{ id = "geo_pack_ice", box = ARCTIC, chance = 0.2 },
	{ id = "zoo_walrus", box = ARCTIC, chance = 0.16 },
	{ id = "zoo_narwhal", box = ARCTIC, chance = 0.12 },
	{ id = "geo_maelstrom", box = { 62, 72, 5, 20 }, chance = 0.14 },
	{ id = "myth_selkie", box = { 50, 66, -12, 0 }, chance = 0.1 },
	-- 지중해
	{ id = "zoo_tuna", box = MED, chance = 0.2 },
	{ id = "zoo_swordfish", box = MED, chance = 0.14 },
	{ id = "zoo_octopus", box = MED, chance = 0.16 },
	{ id = "zoo_cuttlefish", box = MED, chance = 0.16 },
	{ id = "geo_med_currents", box = MED, chance = 0.2 },
	{ id = "myth_atlantis", box = { 30, 40, -35, -5 }, chance = 0.08 },
	-- 열대 대서양·카리브
	{ id = "zoo_flying_fish", box = TROP_ATL, chance = 0.22 },
	{ id = "zoo_sea_turtle", box = TROP_ATL, chance = 0.16 },
	{ id = "zoo_manatee", box = CARIB, chance = 0.14 },
	{ id = "zoo_mahi", box = TROP_ATL, chance = 0.16 },
	{ id = "zoo_barracuda", box = CARIB, chance = 0.16 },
	{ id = "zoo_frigatebird", box = TROP_ATL, chance = 0.16 },
	{ id = "geo_sargasso", box = SARGASSO, chance = 0.22 },
	{ id = "geo_doldrums", box = EQ_ATL, chance = 0.22 },
	{ id = "geo_hurricane", box = CARIB, event = "storm", chance = 0.45 },
	{ id = "geo_trade_winds", box = TROP_ATL, event = "tailwind", chance = 0.4 },
	-- 인도양·동남아
	{ id = "zoo_whale_shark", box = INDIAN, chance = 0.12 },
	{ id = "zoo_manta", box = INDIAN, chance = 0.14 },
	{ id = "zoo_dugong", box = SE_ASIA, chance = 0.12 },
	{ id = "zoo_sea_snake", box = INDIAN, chance = 0.14 },
	{ id = "geo_monsoon", box = INDIAN, event = "tailwind", chance = 0.4 },
	{ id = "geo_typhoon", box = EAST_ASIA, event = "storm", chance = 0.45 },
	{ id = "geo_kuroshio", box = { 20, 40, 120, 160 }, chance = 0.2 },
	-- 태평양·남쪽 바다
	{ id = "zoo_giant_clam", box = PACIFIC, chance = 0.12 },
	{ id = "geo_pacific_vast", box = PACIFIC_E, chance = 0.25 },
	{ id = "zoo_albatross", box = SOUTH, chance = 0.2 },
	{ id = "geo_roaring_forties", box = SOUTH, chance = 0.2 },
	{ id = "geo_southern_cross", box = { -60, 0, -180, 180 }, chance = 0.2 },
	-- 어디서든
	{ id = "zoo_sperm_whale", box = ANY, chance = 0.08 },
	{ id = "zoo_blue_whale", box = ANY, chance = 0.05 },
	{ id = "geo_green_flash", box = ANY, event = "calm", chance = 0.3 },
	{ id = "geo_sea_fog", box = ATLANTIC_N, event = "fog", chance = 0.4 },
	{ id = "geo_waterspout", box = ANY, event = "storm", chance = 0.2 },
	{ id = "geo_st_elmo", box = ANY, event = "storm", chance = 0.25 },
	-- 전설: 항해 사건과 이어진다 (폭풍·안개·유령선)
	{ id = "myth_st_elmo", box = ANY, event = "storm", chance = 0.2 },
	{ id = "myth_ghost_light", box = ANY, event = "fog", chance = 0.25 },
	{ id = "myth_dutchman", box = ANY, event = "ghost", chance = 0.5 },
	{ id = "myth_leviathan", box = { 25, 45, 25, 45 }, event = "storm", chance = 0.08 },
}

local function contains(box: { number }, lat: number, lon: number): boolean
	return lat >= box[1] and lat <= box[2] and lon >= box[3] and lon <= box[4]
end

-- 항해 한 번에 후보 중 하나를 굴린다. 못 만나면 nil. discovered: 이미 얻은 카드 표.
local function roll(fromLat: number, fromLon: number, toLat: number, toLon: number, eventKind: string, days: number, rng: () -> number, discovered: { [string]: boolean }): string?
	local lat, lon = (fromLat + toLat) / 2, (fromLon + toLon) / 2
	if math.abs(fromLon - toLon) > 180 then -- 날짜변경선을 건너는 항로
		lon = (fromLon + toLon + 360) / 2
		if lon > 180 then
			lon -= 360
		end
	end
	local pool: { Row } = {}
	for _, row in Rows do
		if not discovered[row.id] and (row.event == nil or row.event == eventKind) and row.box and contains(row.box, lat, lon) then
			table.insert(pool, row)
		end
	end
	if #pool == 0 then
		return nil
	end
	local pick = pool[1 + math.floor(rng() * #pool) % #pool]
	local scale = if days >= 10 then 1.5 elseif days >= 5 then 1 else 0.6 -- 먼 항해일수록 많이 본다
	if rng() < pick.chance * scale then
		return pick.id
	end
	return nil
end

return { Rows = Rows, roll = roll, contains = contains }
