--!nonstrict
-- 전투 밸런스 확인용 표. 실행: tests/run.sh balance
-- 빌드(배, 전투 레벨, 연구)별 승률을 고정 레벨 적과 자동 매칭 적 기준으로 보여준다.

local D = {
	Ports = require("./Shared/Ports"),
	PortEras = require("./Shared/PortEras"),
	SeaCards = require("./Shared/SeaCards"),
	Ships = require("./Shared/Ships"),
	CultureRegions = require("./Shared/CultureRegions"),
	Tech = require("./Shared/Tech"),
	Skills = require("./Shared/Skills"),
	Cards = require("./Shared/KnowledgeCards"),
	Sites = require("./Shared/Sites"),
	Scholars = require("./Shared/Scholars"),
	Quests = require("./Shared/Quests"),
	TradeMath = require("./Shared/TradeMath"),
	Careers = require("./Shared/Careers"),
	Voyage = require("./Shared/Voyage"),
	Combat = require("./Shared/Combat"),
	Bosses = require("./Shared/Bosses"),
	Specialties = require("./Shared/Specialties"),
	CompanionTalk = require("./Shared/CompanionTalk"),
	Gear = require("./Shared/Gear"),
	Bounties = require("./Shared/Bounties"),
	Fields = require("./Shared/Fields"),
	Collection = require("./Shared/Collection"),
	CardArt = require("./Shared/CardArt"),
	Facilities = require("./Shared/Facilities"),
	Story = require("./Shared/Story"),
	Harbor = require("./Shared/Harbor"),
	SeaRoutes = require("./Shared/SeaRoutes"),
	TacticsData = require("./Shared/TacticsData"),
	Tactics = require("./Shared/Tactics"),
	TacticsMaps = require("./Shared/TacticsMaps"),
	KnowledgeTree = require("./Shared/KnowledgeTree"),
	HistoryEvents = require("./Shared/HistoryEvents"),
	Stocks = require("./Shared/Stocks"),
	WorldEvents = require("./Shared/WorldEvents"),
	People = require("./Shared/People"),
	PeopleTalk = require("./Shared/PeopleTalk"),
	PortOrder = require("./Shared/PortOrder"),
	RoomClock = require("./Shared/RoomClock"),
	WonderScenes = require("./Shared/WonderScenes"),
	PortBuildings = require("./Shared/PortBuildings"),
}
local Registry = require("./Services/Registry")(D)
local S = Registry.S

math.randomseed(4242)
local function rng()
	return math.random()
end

local function build(shipId, battleLv, techs, loadout, coal)
	local st = S.State.new("england", 1700)
	local def = D.Ships.Ships[shipId]
	st.ship = { id = shipId, hull = def.hull, crew = def.crew, supplies = 30 }
	st.careers.battle.level = battleLv
	for _, t in techs do
		st.tech[t] = true
	end
	if loadout then
		st.loadout = loadout
	end
	if coal then
		st.cargo.coal = coal
	end
	return st
end

local builds = {
	{ "캐러벨 Lv1", build("caravel", 1, {}) },
	{ "캐러벨 Lv5", build("caravel", 5, {}) },
	{ "플루트 Lv3", build("fluyt", 3, {}) },
	{ "프리깃 Lv5", build("frigate", 5, {}) },
	{ "갈레온 Lv8", build("galleon", 8, {}) },
	{ "외륜선 Lv8", build("paddle_steamer", 8, { "steam_pump", "steam_winch", "steam_paddle" }, { "steam_burst", "grapeshot", "cutlass_flurry", "pistol_volley" }, 10) },
	{ "철갑 Lv10", build("ironclad_frigate", 10, { "steam_pump", "steam_winch", "steam_paddle", "steam_hook", "steam_cannon", "steam_boiler" }, { "steam_burst", "grapeshot", "steam_hook", "cutlass_flurry" }, 10) },
}

local N = 400
local header = "빌드            "
for lv = 1, 12 do
	header ..= string.format("L%-3d ", lv)
end
print(header .. "| 자동매칭")
for _, entry in builds do
	local st = entry[2]
	local line = string.format("%-14s ", entry[1])
	for lv = 1, 12 do
		local wins = 0
		for _ = 1, N do
			local me = S.Battle.playerFighter(st)
			local r = D.Combat.run(me, D.Combat.pirate(lv, rng), rng)
			if r.winner == "a" then
				wins += 1
			end
		end
		line ..= string.format("%3d%% ", math.floor(wins / N * 100))
	end
	local wins, levels = 0, 0
	for _ = 1, N do
		local lv = S.Battle.enemyLevel(st, rng)
		levels += lv
		local me = S.Battle.playerFighter(st)
		local r = D.Combat.run(me, D.Combat.pirate(lv, rng), rng)
		if r.winner == "a" then
			wins += 1
		end
	end
	line ..= string.format("| %3d%% (적 평균 Lv%.1f)", math.floor(wins / N * 100), levels / N)
	print(line)
end
