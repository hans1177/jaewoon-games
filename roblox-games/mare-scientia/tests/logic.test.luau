--!nonstrict
-- Roblox 없이 Luau CLI로 돌리는 로직 테스트. 실행: tests/run.sh

local D = {
	Ports = require("./Shared/Ports"),
	Ships = require("./Shared/Ships"),
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
}
local Registry = require("./Services/Registry")(D)
local S, handlers = Registry.S, Registry.handlers

math.randomseed(987654)
local function rng()
	return math.random()
end
local ctx = { rng = rng, market = S.MarketClass.new() }

local passed, failed = 0, 0
local function check(name, cond, detail)
	if cond then
		passed += 1
	else
		failed += 1
		print("FAIL: " .. name .. (detail and (" -> " .. tostring(detail)) or ""))
	end
end

local function act(state, action, payload)
	local ok, msg = handlers[action](state, payload or {}, ctx)
	return ok, msg
end

local function newState(nation)
	return S.State.new(nation or "england", 1700)
end

-- 1. 데이터 무결성 ---------------------------------------------------
do
	local produced, demanded = {}, {}
	for portId, port in D.Ports.Ports do
		check("port id matches key " .. portId, port.id == portId)
		check("port country is a known place " .. portId, type(port.country) == "string")
		for _, g in port.produces do
			produced[g] = true
			check("good exists " .. g, D.Ports.Goods[g] ~= nil)
		end
		for _, g in port.demands do
			demanded[g] = true
			check("good exists " .. g, D.Ports.Goods[g] ~= nil)
			check("no good both produced and demanded at " .. portId .. "/" .. g, not table.find(port.produces, g))
		end
	end
	for goodId in D.Ports.Goods do
		check("good produced somewhere " .. goodId, produced[goodId] == true)
		check("good demanded somewhere " .. goodId, demanded[goodId] == true)
	end
	for id, n in D.Ports.Nations do
		check("nation start port exists " .. id, D.Ports.Ports[n.startPort] ~= nil)
	end
	local seen = {}
	for _, c in D.Cards.Cards do
		check("card id unique " .. c.id, not seen[c.id])
		seen[c.id] = true
	end
	for _, site in D.Sites.Sites do
		check("site port exists " .. site.id, D.Ports.Ports[site.portId] ~= nil)
		for _, cid in site.pool do
			check("site card exists " .. site.id .. "/" .. cid, D.Cards.ById[cid] ~= nil)
		end
	end
	for _, sc in D.Scholars.Scholars do
		check("scholar port exists " .. sc.id, D.Ports.Ports[sc.portId] ~= nil)
		check("scholar card exists " .. sc.id, D.Cards.ById[sc.cardId] ~= nil)
		check("scholar years ordered " .. sc.id, sc.fromYear < sc.toYear)
	end
	for id, t in D.Tech.Tech do
		for _, cid in t.requiresCards do
			check("tech card exists " .. id .. "/" .. cid, D.Cards.ById[cid] ~= nil)
		end
		for _, tid in t.requiresTech do
			check("tech prereq exists " .. id .. "/" .. tid, D.Tech.Tech[tid] ~= nil)
		end
		if t.skill then
			check("tech skill exists " .. id, D.Skills.Skills[t.skill] ~= nil)
		end
	end
	for id, ship in D.Ships.Ships do
		if ship.techReq then
			check("ship tech exists " .. id, D.Tech.Tech[ship.techReq] ~= nil)
		end
		check("steam ship burns fuel " .. id, ship.steam == (ship.fuelPerDay > 0))
	end
	for _, q in D.Quests.Quests do
		if q.goodId then
			check("quest good exists " .. q.id, D.Ports.Goods[q.goodId] ~= nil)
		end
		if q.portId then
			check("quest port exists " .. q.id, D.Ports.Ports[q.portId] ~= nil)
		end
		if q.techId then
			check("quest tech exists " .. q.id, D.Tech.Tech[q.techId] ~= nil)
		end
	end
	for _, id in D.Skills.DefaultLoadout do
		check("default skill exists " .. id, D.Skills.Skills[id] ~= nil)
	end
	-- 모든 연구는 지식 카드를 발견할 방법이 있어야 한다 (학자 또는 탐험)
	local obtainable = {}
	for _, sc in D.Scholars.Scholars do
		obtainable[sc.cardId] = true
	end
	for _, site in D.Sites.Sites do
		for _, cid in site.pool do
			obtainable[cid] = true
		end
	end
	for id, t in D.Tech.Tech do
		for _, cid in t.requiresCards do
			check("tech card obtainable " .. id .. "/" .. cid, obtainable[cid] == true)
		end
	end
	-- 모든 카드는 얻을 길이 있어야 한다 (학자, 탐험 지점, 또는 장거리 항해의 해류 기록)
	obtainable.geo_gulfstream = true
	for _, b in D.Bosses.Bosses do
		obtainable[b.cardId] = true
	end
	for _, c in D.Cards.Cards do
		check("card has an acquisition path " .. c.id, obtainable[c.id] == true)
	end
end

-- 2. 같은 항구에서 사고 바로 파는 차익거래가 없어야 한다 -----------------
do
	local arb = 0
	local rate = D.TradeMath.MAX_SELL_RATE
	for portId in D.Ports.Ports do
		for goodId in D.Ports.Goods do
			for _, start in { 0.5, 0.8, 1.0, 1.5, 1.98 } do
				for _, n in { 1, 5, 10, 20 } do
					local m, cost = start, 0
					for _ = 1, n do
						cost += D.TradeMath.getPrice(portId, goodId, m)
						m = D.TradeMath.nextStockMult(m, 1, true)
					end
					local rev = 0
					for _ = 1, n do
						rev += D.TradeMath.sellPrice(portId, goodId, m, rate)
						m = D.TradeMath.nextStockMult(m, 1, false)
					end
					if rev > cost then
						arb += 1
					end
				end
			end
		end
	end
	check("no same-port arbitrage", arb == 0, arb)
	check("sell rate capped", D.TradeMath.sellRate(1) == D.TradeMath.MAX_SELL_RATE)
	check("sell rate floored", D.TradeMath.sellRate(-1) == D.TradeMath.BASE_SELL_RATE)
end

-- 3. 교역 -------------------------------------------------------------
do
	local st = newState()
	local c0 = st.coins
	local ok = act(st, "Buy", { goodId = "wool", amount = 5 })
	check("buy ok", ok)
	check("coins decreased", st.coins < c0)
	check("cargo has wool", st.cargo.wool == 5)
	ok = act(st, "Buy", { goodId = "wool", amount = 20 })
	check("buy over capacity blocked", ok == false)
	ok = act(st, "Buy", { goodId = "nope", amount = 1 })
	check("buy unknown good blocked", ok == false)
	ok = act(st, "Buy", { goodId = "wool", amount = -3 })
	check("buy negative blocked", ok == false)
	ok = act(st, "Buy", { goodId = "wool", amount = 0 / 0 })
	check("buy NaN blocked", ok == false)
	local c1 = st.coins
	ok = act(st, "Sell", { goodId = "wool", amount = 5 })
	check("sell ok", ok)
	check("sell at same port loses money", st.coins < c0, st.coins .. " vs " .. c0)
	check("cargo cleared", st.cargo.wool == nil and st.basis.wool == nil)
	ok = act(st, "Sell", { goodId = "wool", amount = 1 })
	check("sell without stock blocked", ok == false)
	check("coins never negative", st.coins >= 0 and c1 >= 0)
	-- 코인 부족
	local poor = newState()
	poor.coins = 10
	ok = act(poor, "Buy", { goodId = "spice", amount = 1 })
	check("buy without coins blocked", ok == false)
end

-- 4. 항구 간 교역으로 이익을 낼 수 있어야 한다 ------------------------------
do
	local st = newState()
	st.coins = 5000
	local fresh = S.MarketClass.new()
	local c = { rng = rng, market = fresh }
	local ok = handlers.Buy(st, { goodId = "wool", amount = 20 }, c)
	local spent = 5000 - st.coins
	check("bought 20 wool", ok)
	st.portId = "amsterdam"
	handlers.Sell(st, { goodId = "wool", amount = 20 }, c)
	local profit = st.coins - 5000
	check("cross-port trade profitable", profit > 0, profit)
	check("trade xp gained", st.careers.trade.xp > 0 or st.careers.trade.level > 1)
	print(string.format("  info: 양모 20개 런던→암스테르담 이익 %d (투자 %d)", profit, spent))
end

-- 5. 항해 -------------------------------------------------------------
do
	local st = newState()
	local sup0 = st.ship.supplies
	local ok, msg = act(st, "Sail", { portId = "amsterdam" })
	check("sail ok", ok, msg)
	check("port changed", st.portId == "amsterdam")
	check("days advanced", st.day >= 1)
	check("visited recorded", st.stats.visited.amsterdam == true)
	check("supplies used", st.ship.supplies < sup0 or st.ship.crew < 20)
	check("hull stays positive", st.ship.hull >= 1)
	ok = act(st, "Sail", { portId = "amsterdam" })
	check("sail to same port blocked", ok == false)
	ok = act(st, "Sail", { portId = "atlantis" })
	check("sail to unknown blocked", ok == false)

	-- 보급품이 없으면 선원을 잃고, 최소 1명은 남는다
	local starve = newState()
	starve.ship.supplies = 0
	act(starve, "Sail", { portId = "lisbon" })
	check("starvation costs crew", starve.ship.crew < 20)
	check("crew never below 1", starve.ship.crew >= 1)

	-- 먼 항구일수록 오래 걸린다
	local near = S.Sailing.preview(newState(), "amsterdam")
	local far = S.Sailing.preview(newState(), "lisbon")
	check("farther takes longer", far.days > near.days, near.days .. " vs " .. far.days)
	print(string.format("  info: 런던→암스테르담 %d일, 런던→리스본 %d일", near.days, far.days))

	-- 장거리 항해에서 해류 카드를 발견할 수 있다
	local gotStream = false
	for _ = 1, 60 do
		local far = newState()
		far.ship.supplies = 300
		act(far, "Sail", { portId = "lisbon" })
		if far.discovered.geo_gulfstream then
			gotStream = true
			break
		end
	end
	check("long voyage can discover the gulf stream", gotStream)
	local shortTrip = newState()
	for _ = 1, 30 do
		shortTrip.portId = "london"
		act(shortTrip, "Sail", { portId = "amsterdam" })
	end
	check("short trips never find the gulf stream", shortTrip.discovered.geo_gulfstream == nil)

	-- 선체가 너무 상하면 출항 불가
	local wreck = newState()
	wreck.ship.hull = 5
	ok = act(wreck, "Sail", { portId = "amsterdam" })
	check("damaged ship cannot sail", ok == false)
end

-- 6. 증기선: 연구 → 구매 → 석탄 소모 ---------------------------------------
do
	local st = newState()
	st.coins = 100000
	local ok = act(st, "BuyShip", { shipId = "paddle_steamer" })
	check("steam ship locked without tech", ok == false)

	-- 카드 발견 없이는 연구 불가
	ok = act(st, "Research", { techId = "steam_pump" })
	check("research blocked without card", ok == false)
	st.discovered.relic_aeolipile = true
	ok = act(st, "Research", { techId = "steam_paddle" })
	check("research blocked without prereq", ok == false)
	ok = act(st, "Research", { techId = "steam_pump" })
	check("research steam_pump", ok and st.tech.steam_pump)
	ok = act(st, "Research", { techId = "steam_pump" })
	check("research twice blocked", ok == false)
	st.discovered.phy_papin_digester = true
	ok = act(st, "Research", { techId = "steam_paddle" })
	check("research steam_paddle", ok and st.tech.steam_paddle)

	ok = act(st, "BuyShip", { shipId = "paddle_steamer" })
	check("buy steamer", ok and st.ship.id == "paddle_steamer")
	local hullFull = D.Ships.Ships.paddle_steamer.hull
	check("new ship full hull", st.ship.hull == hullFull)

	-- 석탄이 있으면 태우고, 없으면 돛으로 간다
	st.cargo.coal = 10
	st.basis.coal = 14
	local before = st.cargo.coal
	local plan = S.Sailing.preview(st, "amsterdam")
	check("steam plan burns coal", plan.coal > 0, plan.coal)
	act(st, "Sail", { portId = "amsterdam" })
	check("coal consumed on voyage", (st.cargo.coal or 0) < before)

	local noCoal = S.State.new("england", 1700)
	noCoal.tech.steam_paddle = true
	noCoal.coins = 100000
	noCoal.tech.steam_pump = true
	act(noCoal, "BuyShip", { shipId = "paddle_steamer" })
	local slow = S.Sailing.preview(noCoal, "lisbon")
	noCoal.cargo.coal = 20
	local fast = S.Sailing.preview(noCoal, "lisbon")
	check("steamship without coal is slower", slow.days > fast.days, slow.days .. " vs " .. fast.days)
	print(string.format("  info: 증기선 런던→리스본 석탄 있음 %d일 / 없음 %d일", fast.days, slow.days))

	-- 펌프 효과
	check("pump reduces hull damage", S.State.techSum(st, "pumpReduction") > 0)
end

-- 7. 자동 전투 ---------------------------------------------------------
do
	local function mk(shipId, battleLv, techs, loadout, coal)
		local st = newState()
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

	local function winRate(st, fixedLevel, n)
		local wins = 0
		for _ = 1, n do
			local me = S.Battle.playerFighter(st)
			local lv = fixedLevel or S.Battle.enemyLevel(st, rng)
			local r = D.Combat.run(me, D.Combat.pirate(lv, rng), rng)
			check("hull non-negative", r.a.hull >= 0 and r.b.hull >= 0)
			check("crew non-negative", r.a.crew >= 0 and r.b.crew >= 0)
			check("winner valid", r.winner == "a" or r.winner == "b" or r.winner == "draw")
			check("log not empty", #r.log > 0)
			if r.winner == "a" then
				wins += 1
			end
		end
		return wins / n
	end

	local starter = mk("caravel", 1, {})
	local w1, w2, w3 = winRate(starter, 1, 300), winRate(starter, 2, 300), winRate(starter, 3, 300)
	check("harder pirates are harder", w1 > w2 and w2 > w3, w1 .. "/" .. w2 .. "/" .. w3)
	check("starter beats level 1 pirates", w1 > 0.9, w1)

	local steamTechs = { "steam_pump", "steam_winch", "steam_paddle", "steam_hook", "steam_cannon", "steam_boiler" }
	local matched = {
		{ "caravel Lv1", mk("caravel", 1, {}), 0.5, 0.95 },
		{ "frigate Lv5", mk("frigate", 5, {}), 0.5, 0.95 },
		{ "galleon Lv8", mk("galleon", 8, {}), 0.5, 0.97 },
		{ "paddle Lv8", mk("paddle_steamer", 8, { "steam_pump", "steam_winch", "steam_paddle" }, { "steam_burst", "grapeshot", "cutlass_flurry", "pistol_volley" }, 10), 0.5, 0.95 },
		{ "ironclad Lv10", mk("ironclad_frigate", 10, steamTechs, { "steam_burst", "grapeshot", "steam_hook", "cutlass_flurry" }, 10), 0.7, 1.0 },
	}
	for _, m in matched do
		local w = winRate(m[2], nil, 300)
		print(string.format("  info: %s 매칭 승률 %.0f%%", m[1], w * 100))
		check("matched win rate sane " .. m[1], w >= m[3] and w <= m[4], w)
	end

	-- 스킬 효과: 산탄이 있으면 선원 손실로 백병전이 유리해진다
	local with = mk("caravel", 1, {}, { "grapeshot", "cutlass_flurry", "pistol_volley" })
	local without = mk("caravel", 1, {}, { "repair", "rally", "surgeon" })
	check("good loadout beats weak loadout", winRate(with, 2, 300) > winRate(without, 2, 300))

	-- 슬롯 수만큼만 장착한 스킬이 쓰인다
	local over = mk("caravel", 1, {}, { "broadside", "grapeshot", "ram", "repair", "rally" })
	check("battle uses only unlocked slots", #S.Battle.playerFighter(over).skills == 3)

	-- 증기 스킬은 석탄이 없으면 발동하지 않는다
	local nocoal = mk("ironclad_frigate", 1, {}, { "steam_burst" })
	check("no coal => no steam fuel", S.Battle.playerFighter(nocoal).fuel == 0)

	-- 전투 결과 반영
	local st = newState()
	local msgs = {}
	local won = S.Battle.encounter(st, ctx, msgs)
	check("encounter returns boolean", type(won) == "boolean")
	check("lastBattle recorded", st.lastBattle ~= nil and #st.lastBattle.log > 0)
	check("hull stays >= 1 after battle", st.ship.hull >= 1 and st.ship.crew >= 1)

	-- 승패에 따라 보상/손실이 다르다
	local win = newState()
	local c0 = win.coins
	local wins = 0
	for _ = 1, 30 do
		local m = {}
		win.ship.hull = 100
		win.ship.crew = 20
		if S.Battle.encounter(win, ctx, m) then
			wins += 1
		end
	end
	check("victories pay coins", wins == 0 or win.coins > c0)
	check("battle stats tracked", win.stats.battlesWon == wins and win.stats.battlesWon + win.stats.battlesLost <= 30)

	-- 스킬 장착 검증
	local ls = newState()
	local ok = act(ls, "SetLoadout", { skills = { "broadside", "ram" } })
	check("set loadout", ok and ls.loadout[2] == "ram")
	ok = act(ls, "SetLoadout", { skills = { "broadside", "broadside" } })
	check("duplicate skill blocked", ok == false)
	ok = act(ls, "SetLoadout", { skills = { "steam_hook" } })
	check("tech-locked skill blocked", ok == false)
	ok = act(ls, "SetLoadout", { skills = { "broadside", "ram", "repair", "rally", "surgeon" } })
	check("too many slots blocked", ok == false)
	ok = act(ls, "SetLoadout", { skills = {} })
	check("empty loadout blocked", ok == false)
	ok = act(ls, "SetLoadout", { skills = { "nope" } })
	check("unknown skill blocked", ok == false)
end

-- 8. 탐험, 학자, 도감 ---------------------------------------------------
do
	local st = newState()
	st.ship.supplies = 300
	local found = 0
	for _ = 1, 30 do
		local ok = act(st, "Explore", { siteId = "london_fields" })
		if not ok then
			break
		end
	end
	found = S.State.countDiscovered(st)
	check("explore discovers cards", found >= 1, found)
	check("adventure xp gained", st.careers.adventure.xp > 0 or st.careers.adventure.level > 1)

	local ok = act(st, "Explore", { siteId = "amsterdam_gardens" })
	check("explore at wrong port blocked", ok == false)
	ok = act(st, "Explore", { siteId = "salisbury_plain" })
	check("explore needs adventure level", ok == false)

	-- 학자: 명성과 연도 조건
	local sc = newState()
	sc.startYear = 1700
	ok = act(sc, "Visit", { scholarId = "newton" })
	check("scholar needs fame", ok == false)
	sc.fame = 200
	ok = act(sc, "Visit", { scholarId = "newton" })
	check("newton visit works in 1700", ok and sc.discovered.phy_gravity)
	ok = act(sc, "Visit", { scholarId = "newton" })
	check("scholar only once", ok == false)
	ok = act(sc, "Visit", { scholarId = "linnaeus" })
	check("scholar wrong port blocked", ok == false)
	local early = S.State.new("england", 1600)
	early.fame = 500
	ok = act(early, "Visit", { scholarId = "newton" })
	check("newton absent in 1600", ok == false)
	check("year advances with days", S.State.year({ startYear = 1700, day = 400 }) == 1701)

	-- 증기 연구 지식을 학자에게서 얻을 수 있다
	local steamy = newState()
	steamy.fame = 500
	steamy.startYear = 1700
	for _, id in { "papin", "savery", "newcomen" } do
		local good = act(steamy, "Visit", { scholarId = id })
		check("steam scholar available " .. id, good)
	end
	check("steam cards from scholars", steamy.discovered.phy_papin_digester and steamy.discovered.phy_savery_pump and steamy.discovered.phy_newcomen_engine)
end

-- 9. 퀘스트 -----------------------------------------------------------
do
	local st = newState()
	local ok = act(st, "Accept", { questId = "q_first_trade" })
	check("accept quest", ok)
	ok = act(st, "Accept", { questId = "q_first_trade" })
	check("accept twice blocked", ok == false)
	ok = act(st, "Claim", { questId = "q_first_trade" })
	check("claim before done blocked", ok == false)
	ok = act(st, "TurnIn", { questId = "q_first_trade" })
	check("turn in without goods blocked", ok == false)
	act(st, "Buy", { goodId = "wool", amount = 6 })
	ok = act(st, "TurnIn", { questId = "q_first_trade" })
	check("turn in at wrong port blocked", ok == false)
	st.portId = "amsterdam"
	ok = act(st, "TurnIn", { questId = "q_first_trade" })
	check("turn in works", ok and st.quests.active.q_first_trade.delivered == 5, st.quests.active.q_first_trade.delivered)
	check("one wool left", st.cargo.wool == 1)
	local c0 = st.coins
	ok = act(st, "Claim", { questId = "q_first_trade" })
	check("claim works", ok and st.coins == c0 + 150)
	check("quest marked done", st.quests.done.q_first_trade == true and st.quests.active.q_first_trade == nil)
	ok = act(st, "Accept", { questId = "q_first_trade" })
	check("cannot redo quest", ok == false)

	-- 동시 진행 제한
	local many = newState()
	local accepted = 0
	for _, q in D.Quests.Quests do
		if act(many, "Accept", { questId = q.id }) then
			accepted += 1
		end
	end
	check("active quest cap", accepted == 5, accepted)

	-- 발견 퀘스트
	local disc = newState()
	act(disc, "Accept", { questId = "q_first_discovery" })
	check("discover quest not done at start", S.Quest.progress(disc, D.Quests.ById.q_first_discovery) == 0)
	disc.discovered.bot_oak = true
	check("discover quest progresses", S.Quest.progress(disc, D.Quests.ById.q_first_discovery) == 1)
end

-- 10. 조선소 ------------------------------------------------------------
do
	local st = newState()
	st.coins = 10000
	local ok = act(st, "BuyShip", { shipId = "fluyt" })
	check("buy fluyt", ok and st.ship.id == "fluyt")
	check("trade-in applied", st.coins == 10000 - 1800 + 0, st.coins)
	ok = act(st, "BuyShip", { shipId = "fluyt" })
	check("same ship blocked", ok == false)
	st.portId = "antwerp"
	ok = act(st, "BuyShip", { shipId = "galleon" })
	check("no shipyard blocked", ok == false)
	st.portId = "london"
	st.cargo.wool = 45
	ok = act(st, "BuyShip", { shipId = "frigate" })
	check("cargo too large for smaller ship blocked", ok == false)
	st.cargo = {}
	st.ship.hull = 50
	ok = act(st, "Repair", {})
	check("repair works", ok and st.ship.hull > 50)
	st.ship.crew = 5
	local c0 = st.coins
	ok = act(st, "HireCrew", { amount = 100 })
	check("hire crew capped", ok and st.ship.crew == D.Ships.Ships.fluyt.crew and st.coins < c0)
	ok = act(st, "BuySupplies", { amount = 100000 })
	check("supplies capped", ok and st.ship.supplies <= S.State.maxSupplies())
end

-- 11. 증기 윈치: 화물칸 증가 -------------------------------------------------
do
	local st = newState()
	local base = S.State.cargoCapacity(st)
	st.tech.steam_winch = true
	check("winch increases capacity", S.State.cargoCapacity(st) > base)
end

-- 12. 성장 ------------------------------------------------------------
do
	local c = D.Careers.new()
	local gained = D.Careers.addXp(c, "trade", 100000)
	check("levels capped", c.trade.level == D.Careers.MAX_LEVEL and gained >= 1)
	check("loadout slots grow", D.Careers.loadoutSlots(1) == 3 and D.Careers.loadoutSlots(30) == 6)
	check("sell bonus capped", D.Careers.sellBonus(100) <= 0.07 + 1e-9)
	check("negative xp ignored", D.Careers.addXp(D.Careers.new(), "trade", -5) == 0)
	-- 나라 보너스
	local fr = S.State.new("france", 1700)
	local en = S.State.new("england", 1700)
	check("france starts richer", fr.coins == en.coins + 200)
	check("starts at nation port", fr.portId == "rouen" and en.portId == "london")
end

-- 13. 저장 / 불러오기 ----------------------------------------------------
do
	local st = newState("sweden")
	st.coins = 4321
	st.cargo.iron = 7
	st.basis.iron = 30
	st.discovered.bot_oak = true
	st.tech.steam_pump = true
	st.fame = 77
	st.day = 400
	st.quests.active.q_first_trade = { delivered = 2, baseWins = 0 }
	st.quests.done.q_spices = true
	st.stats.visited.london = true
	st.scholarsMet.newton = true
	st.lastBattle = { log = { "x" } }

	local data = S.State.serialize(st)
	check("temp fields not saved", data.lastBattle == nil)
	local back = S.State.sanitize(data)
	check("sanitize roundtrip", back ~= nil)
	check("coins kept", back.coins == 4321 and back.fame == 77 and back.day == 400)
	check("cargo kept", back.cargo.iron == 7 and back.basis.iron == 30)
	check("codex kept", back.discovered.bot_oak == true and back.tech.steam_pump == true)
	check("quest kept", back.quests.active.q_first_trade.delivered == 2 and back.quests.done.q_spices == true)
	check("scholars kept", back.scholarsMet.newton == true)
	check("nation kept", back.nationId == "sweden" and back.portId == "gothenburg" or back.portId == st.portId)

	-- 변조되거나 깨진 데이터는 걸러진다
	local evil = S.State.sanitize({
		nationId = "england",
		coins = -50,
		fame = 0 / 0,
		portId = "narnia",
		ship = { id = "death_star", hull = 1e9 },
		cargo = { wool = 1e9, fake = 5, iron = -3 },
		discovered = { fake_card = true, bot_oak = "yes" },
		tech = { nope = true },
		loadout = { "nope", "broadside", "broadside" },
		quests = { active = { fake = {} }, done = { fake = true } },
	})
	check("evil data sanitized", evil ~= nil)
	check("negative coins fixed", evil.coins >= 0)
	check("NaN fame fixed", evil.fame == 0)
	check("unknown port reset", D.Ports.Ports[evil.portId] ~= nil)
	check("unknown ship reset", evil.ship.id == "caravel")
	check("fake cargo removed", evil.cargo.fake == nil and evil.cargo.iron == nil)
	check("fake cards removed", next(evil.discovered) == nil)
	check("fake tech removed", next(evil.tech) == nil)
	check("loadout cleaned", #evil.loadout == 1 and evil.loadout[1] == "broadside")
	check("fake quests removed", next(evil.quests.active) == nil and next(evil.quests.done) == nil)
	check("garbage rejected", S.State.sanitize("hello") == nil and S.State.sanitize({ nationId = "mars" }) == nil)
end

-- 14. 화면 스냅샷 -------------------------------------------------------
do
	local st = newState()
	local v = S.View.build(st, ctx)
	check("view has player", v.player.portName == "런던" and v.player.year == 1700)
	check("view goods", #v.goods == 16)
	check("view routes", #v.routes == (function() local n = 0 for _ in D.Ports.Ports do n += 1 end return n - 1 end)())
	check("view codex", v.codex.total == #D.Cards.Cards and v.codex.found == 0)
	check("view hides unfound names", v.codex.cards[1].name == "???")
	check("view tech", #v.tech == 6)
	check("view quests", #v.quests.available == #D.Quests.Quests)
	check("view loadout", v.loadout.slots == 3)
	check("view shipyard", v.shipyard.available == true and #v.shipyard.ships == 6)
	check("view scholars at london", #v.scholars >= 4)
	check("view careers", #v.careers == 3)
end

-- 15. 긴 플레이 시뮬레이션: 오류 없이 오래 굴러가는지 -----------------------
do
	local st = newState()
	st.coins = 5000
	local actions = 0
	local portIds = {}
	for id in D.Ports.Ports do
		table.insert(portIds, id)
	end
	table.sort(portIds)
	for i = 1, 600 do
		local r = rng()
		if r < 0.25 then
			act(st, "Buy", { goodId = ({ "wool", "coal", "spice", "wine", "iron" })[1 + i % 5], amount = 1 + i % 4 })
		elseif r < 0.5 then
			for goodId, qty in st.cargo do
				act(st, "Sell", { goodId = goodId, amount = math.min(qty, 5) })
				break
			end
		elseif r < 0.7 then
			act(st, "Sail", { portId = portIds[1 + math.floor(rng() * #portIds)] })
		elseif r < 0.8 then
			act(st, "Hunt", {})
		elseif r < 0.9 then
			act(st, "Repair", {})
			act(st, "BuySupplies", { amount = 20 })
			act(st, "HireCrew", { amount = 5 })
		else
			local sites = S.View.build(st, ctx).sites
			if #sites > 0 then
				act(st, "Explore", { siteId = sites[1 + math.floor(rng() * #sites)].id })
			end
		end
		actions += 1
		-- 불변식
		assert(st.coins >= 0, "coins negative at step " .. i)
		assert(st.ship.hull >= 1 and st.ship.crew >= 1, "ship invalid at step " .. i)
		assert(st.ship.supplies >= 0, "supplies negative")
		assert(S.State.cargoUsed(st) <= S.State.cargoCapacity(st), "cargo overflow at step " .. i)
		for goodId, qty in st.cargo do
			assert(qty >= 1 and D.Ports.Goods[goodId], "bad cargo")
		end
		ctx.market:recover(5)
	end
	check("long simulation survived", actions == 600)
	print(string.format("  info: 600 스텝 후 코인 %d, 명성 %d, 일수 %d, 도감 %d장, 전투 %d승 %d패",
		st.coins, st.fame, st.day, S.State.countDiscovered(st), st.stats.battlesWon, st.stats.battlesLost))
end

-- 신화 보스 ---------------------------------------------------------
do
	for _, b in D.Bosses.Bosses do
		check("boss card exists " .. b.id, D.Cards.ById[b.cardId] ~= nil)
		for _, pid in b.portIds do
			check("boss port exists " .. b.id .. pid, D.Ports.Ports[pid] ~= nil)
		end
		for _, sk in b.skills do
			check("boss skill exists " .. sk, D.Skills.Skills[sk] ~= nil)
		end
	end

	local st = newState("england") -- 런던 시작
	local ok, msg = act(st, "ChallengeBoss", { bossId = "nope" })
	check("boss unknown rejected", not ok)
	ok, msg = act(st, "ChallengeBoss", { bossId = "kraken" })
	check("kraken wrong port rejected", not ok, msg)
	ok, msg = act(st, "ChallengeBoss", { bossId = "sea_serpent" })
	check("serpent low level rejected", not ok, msg)

	-- 강한 상태로 도전: 전투 레벨 10, 큰 배
	st.careers.battle.level = 10
	st.ship.id = "galleon"
	local def = S.State.shipDef(st)
	st.ship.hull, st.ship.crew = def.hull, def.crew
	local day0 = st.day
	ok, msg = act(st, "ChallengeBoss", { bossId = "sea_serpent" })
	check("serpent challenge runs", ok, msg)
	check("boss advanced days", st.day == day0 + 2)
	check("boss record saved", st.bosses.sea_serpent ~= nil and st.bosses.sea_serpent.lastDay == st.day)
	ok, msg = act(st, "ChallengeBoss", { bossId = "sea_serpent" })
	check("boss cooldown blocks", not ok, msg)
	check("view lists bosses", #S.View.build(st, ctx).bosses == #D.Bosses.Bosses)

	-- 저장 왕복과 변조 방어
	local saved = S.State.serialize(st)
	local back = S.State.sanitize(saved)
	check("boss roundtrip", back and back.bosses.sea_serpent and back.bosses.sea_serpent.lastDay == st.bosses.sea_serpent.lastDay)
	saved.bosses = { sea_serpent = { defeated = -5, lastDay = "x" }, fake = {}, [3] = true }
	back = S.State.sanitize(saved)
	check("boss tamper sanitized", back and back.bosses.fake == nil and back.bosses.sea_serpent.defeated == 0)

	-- 승률 측정 (참고)
	local function rate(shipId, bossId)
		local wins, n = 0, 300
		for _ = 1, n do
			local s2 = newState("england")
			s2.careers.battle.level = 10
			s2.ship.id = shipId
			local d = S.State.shipDef(s2)
			s2.ship.hull, s2.ship.crew = d.hull, d.crew
			if d.steam then
				s2.cargo.coal = 30
			end
			s2.tech = { steam_hook = true, steam_cannon = true }
			local r = S.Battle.playerFighter(s2)
			local foe = D.Combat.boss(D.Bosses.ById[bossId], r.steam)
			if D.Combat.run(r, foe, rng).winner == "a" then
				wins += 1
			end
		end
		return wins / n
	end
	for _, bossId in { "sea_serpent", "kraken" } do
		for _, id in { "frigate", "galleon", "paddle_steamer", "ironclad_frigate" } do
			print(string.format("  info: %s 승률 %s %.0f%%", bossId, id, rate(id, bossId) * 100))
		end
	end
end

-- 전문 분야와 동료 ---------------------------------------------------
do
	for _, c in D.Specialties.Companions do
		check("companion scholar exists " .. c.id, (function()
			for _, sc in D.Scholars.Scholars do
				if sc.id == c.scholarId then
					return true
				end
			end
			return false
		end)())
	end

	local st = newState("england")
	local ok, msg = act(st, "SetSpecialty", { specialtyId = "nope" })
	check("bad specialty rejected", not ok)
	local coins0 = st.coins
	ok = act(st, "SetSpecialty", { specialtyId = "botanist" })
	check("first specialty free", ok and st.coins == coins0 and st.specialty == "botanist")
	ok = act(st, "SetSpecialty", { specialtyId = "botanist" })
	check("same specialty rejected", not ok)
	ok = act(st, "SetSpecialty", { specialtyId = "cartographer" })
	check("change specialty costs", ok and st.coins == coins0 - D.Specialties.CHANGE_FEE)
	st.coins = 0
	ok = act(st, "SetSpecialty", { specialtyId = "collector" })
	check("change without coins rejected", not ok and st.specialty == "cartographer")

	-- 항해 속도 보너스: 지도제작자 -> 일수가 줄거나 같다
	local base = newState("england")
	local planBase = S.Sailing.preview(base, "lisbon")
	local carto = newState("england")
	carto.specialty = "cartographer"
	local planCarto = S.Sailing.preview(carto, "lisbon")
	check("cartographer faster", planCarto.days <= planBase.days)

	-- 동료 영입 조건
	local c = newState("england")
	c.coins = 5000
	ok, msg = act(c, "Recruit", { companionId = "c_halley" })
	check("recruit needs scholar met", not ok, msg)
	c.scholarsMet.halley = true
	ok, msg = act(c, "Recruit", { companionId = "c_halley" })
	check("recruit needs fame", not ok, msg)
	c.fame = 500
	ok, msg = act(c, "Recruit", { companionId = "c_halley" })
	check("recruit works", ok and #c.companions == 1 and c.coins == 5000 - 500, msg)
	ok = act(c, "Recruit", { companionId = "c_halley" })
	check("recruit twice rejected", not ok)
	c.scholarsMet.merian, c.scholarsMet.boyle = true, true
	act(c, "Recruit", { companionId = "c_merian" })
	ok = act(c, "Recruit", { companionId = "c_boyle" })
	check("companion max enforced", not ok and #c.companions == D.Specialties.MAX_COMPANIONS)
	check("view companions listed", #S.View.build(c, ctx).companions.list == #D.Specialties.Companions)
	check("perk speed with companion", S.Perk.speedMult(c) > 1)
	ok = act(c, "Dismiss", { companionId = "c_halley" })
	check("dismiss works", ok and #c.companions == 1)
	ok = act(c, "Dismiss", { companionId = "c_halley" })
	check("dismiss unknown rejected", not ok)

	-- 발견 보너스 (전문 분야 + 동료)
	local d = newState("england")
	d.specialty = "botanist"
	check("botanist bonus", S.Perk.discoverBonus(d, "Botany") > 0 and S.Perk.discoverBonus(d, "Physics") == 0)
	local coll = newState("england")
	coll.specialty = "collector"
	check("collector coin mult", S.Perk.coinMult(coll, "Site") > 1 and S.Perk.coinMult(coll, "Botany") == 1)

	-- 저장 왕복과 변조 방어
	local saved = S.State.serialize(c)
	local back = S.State.sanitize(saved)
	check("companions roundtrip", back and back.companions[1] == c.companions[1])
	saved.companions = { "c_merian", "c_merian", "ghost", "c_boyle", "c_linnaeus" }
	saved.specialty = "hacker"
	back = S.State.sanitize(saved)
	check("companions sanitized", back and #back.companions == 2 and back.companions[1] == "c_merian" and back.companions[2] == "c_boyle")
	check("bad specialty dropped", back and back.specialty == nil)

	-- 발견 확률이 실제로 오르는지 (식물학자가 식물 카드 탐험에서 더 자주 발견)
	local function hits(spec)
		local n = 0
		for i = 1, 400 do
			local s2 = newState("england")
			s2.specialty = spec
			s2.ship.supplies = 99
			local ok2 = act(s2, "Explore", { siteId = "amsterdam_gardens" })
			if not ok2 then
				s2.portId = "amsterdam"
				act(s2, "Explore", { siteId = "amsterdam_gardens" })
			end
			if S.State.countDiscovered(s2) > 0 then
				n += 1
			end
		end
		return n
	end
	local plain, botan = hits(nil), hits("botanist")
	check("botanist finds more", botan > plain, string.format("%d vs %d", botan, plain))
	print(string.format("  info: 정원 탐험 발견 횟수 일반 %d / 식물학자 %d (400회)", plain, botan))
end

-- 시장 사건 ---------------------------------------------------------
do
	local portIds, goodIds = { "london", "amsterdam" }, { "wool", "wine", "spice" }
	local m = S.MarketClass.new()
	check("no events at start", #m:activeEvents() == 0 and m:eventMult("london", "wool") == 1)
	for i = 1, 60 do
		m:tickEvents(rng, portIds, goodIds)
		assert(#m:activeEvents() <= m.MAX_EVENTS, "too many events")
	end
	check("events respect cap", #m:activeEvents() <= m.MAX_EVENTS)
	-- 사건 하나를 직접 넣어 가격 반영을 확인
	local m2 = S.MarketClass.new()
	table.insert(m2.events, { portId = "london", goodId = "wine", mult = 1.4, text = "%s", ticks = 2 })
	local c2 = { rng = rng, market = m2 }
	local st = newState("england")
	st.coins = 100000
	local base = D.TradeMath.getPrice("london", "wine", 1, 1)
	local before = st.coins
	local ok = handlers.Buy(st, { goodId = "wine", amount = 1 }, c2)
	check("event raises buy price", ok and before - st.coins == D.TradeMath.getPrice("london", "wine", 1, 1.4) and before - st.coins > base)
	local v = S.View.build(st, c2)
	local wine
	for _, g in v.goods do
		if g.id == "wine" then
			wine = g
		end
	end
	check("view marks trend up", wine and wine.trend == "up")
	check("view news lists event", #v.news == 1)
	m2:tickEvents(function() return 0.99 end, portIds, goodIds)
	m2:tickEvents(function() return 0.99 end, portIds, goodIds)
	check("event expires", m2:eventMult("london", "wine") == 1)
	-- 같은 항구에서 사고 바로 팔아 이득을 볼 수 없다 (사건 중에도)
	for _, ev in { 0.7, 1.4 } do
		local m3 = S.MarketClass.new()
		table.insert(m3.events, { portId = "london", goodId = "wool", mult = ev, text = "%s", ticks = 5 })
		local c3 = { rng = rng, market = m3 }
		local s3 = newState("england")
		s3.coins = 100000
		local coins0 = s3.coins
		handlers.Buy(s3, { goodId = "wool", amount = 10 }, c3)
		handlers.Sell(s3, { goodId = "wool", amount = 10 }, c3)
		check("no same-port arbitrage with event " .. ev, s3.coins < coins0)
	end
end

print(string.format("\n통과 %d, 실패 %d", passed, failed))
if failed > 0 then
	error("tests failed")
end
