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
	Regions = require("./Shared/Regions"),
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
	for _, q in D.Quests.Quests do
		if q.rewardCardId then
			obtainable[q.rewardCardId] = true
		end
	end
	for _, b in D.Bosses.Bosses do
		obtainable[b.cardId] = true
	end
	for _, e in D.Story.Events do
		for _, c in e.choices do
			if c.effect.cardId then
				obtainable[c.effect.cardId] = true
			end
		end
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
	st.license = 3
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
	noCoal.license = 3
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

	-- 도망: 해전은 보류되고, ResolveBattle로 확정된다
	local fl = newState()
	local d2 = S.State.shipDef(fl)
	fl.ship.hull, fl.ship.crew = d2.hull, d2.crew
	local coins0 = fl.coins
	act(fl, "Hunt", {})
	check("hunt defers result", fl.pendingBattle ~= nil and fl.coins == coins0 and fl.lastBattle.canFlee == true)
	fl.pendingBattle.fleeChance = 1
	local okF = act(fl, "ResolveBattle", { flee = true })
	check("flee succeeds", okF and fl.pendingBattle == nil and fl.lastBattle.fled == true and fl.coins == coins0)
	act(fl, "Hunt", {})
	fl.pendingBattle.fleeChance = 0
	act(fl, "ResolveBattle", { flee = true })
	check("flee failure settles battle", fl.pendingBattle == nil and fl.lastBattle.fled == false)
	check("resolve without battle fails", not (act(fl, "ResolveBattle", {})))

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
	st.license = 1
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

-- 13b. 보급 / 자동 충원 / 동료 대화 / 교역 힌트 ---------------------------
do
	local st = newState()
	st.coins = 1000
	st.ship.crew = 1
	st.ship.supplies = 0
	local ok = act(st, "Resupply", { what = "both" })
	check("resupply fills crew and supplies", ok and st.ship.crew == S.State.shipDef(st).crew and st.ship.supplies > 0)
	check("resupply bad arg rejected", not act(st, "Resupply", { what = "x" }))
	check("set auto on", act(st, "SetAuto", { key = "crew", value = true }) and st.auto.crew == true)
	check("auto survives save", S.State.sanitize(S.State.serialize(st)).auto.crew == true)
	st.ship.crew = 1
	st.coins = 1000
	local msgs = {}
	S.Shipyard.autoTopUp(st, msgs)
	check("auto top up crew on arrival", st.ship.crew == S.State.shipDef(st).crew and #msgs >= 1)
	check("talk needs companion", not act(st, "Talk", { companionId = "c_boyle" }))
	st.companions = { "c_boyle" }
	local a0 = st.affinity.c_boyle or 0
	local okT = act(st, "Talk", { companionId = "c_boyle" })
	check("talk gives affinity once per day", okT and st.affinity.c_boyle == a0 + 2 and st.talk.name ~= nil)
	act(st, "Talk", { companionId = "c_boyle" })
	check("second talk same day no more affinity", st.affinity.c_boyle == a0 + 2)
	check("boyle gives exact intel", S.Harbor.intel(st) >= 3)
	do
		local v = S.View.build(st, ctx)
		local anyGood = v.goods[1]
		local top = v.compare and v.compare[anyGood.id]
		check("compare lists other ports with intel", top ~= nil and #top >= 1 and top[1].sell ~= nil, tostring(top))
		check("compare sorted by sell", top and (#top < 2 or top[1].sell >= top[2].sell))
		local low = newState()
		check("no compare without intel", next(S.View.build(low, ctx).compare) == nil)
	end
	st.coins = 500
	act(st, "Rumor", {})
	check("exact rumor has numbers", string.find(st.rumor.lines[1], "%d") ~= nil)
end

-- 13c. 사기·괴혈병·주점 동료·새 항해 사건 ---------------------------------
do
	local st = newState()
	st.coins = 2000
	st.morale = 40
	check("feast raises morale", act(st, "Feast", {}) and st.morale == 70)
	st.fame = 100
	check("tavern companion recruitable without scholar", act(st, "Recruit", { companionId = "t_surgeon" }) and table.find(st.companions, "t_surgeon") ~= nil)
	check("surgeon heal reduction", S.Perk.healReduction(st) >= 0.5)
	local seen = {}
	local n = 0
	for i = 1, 4000 do
		local e = D.Voyage.rollEvent(function() return math.random() end, 10)
		seen[e.kind] = true
	end
	for _, k in { "school", "merchant", "fog", "reef", "rescue", "island", "ghost", "storm", "pirates" } do
		if seen[k] then n += 1 end
	end
	check("all new voyage events roll", n == 9)
	check("morale survives save", S.State.sanitize(S.State.serialize(st)).morale == st.morale)
end

-- 13d. 날씨 ------------------------------------------------------------
do
	local st = newState()
	local a = D.Voyage.weather(10, "london")
	local b = D.Voyage.weather(10, "london")
	check("weather deterministic", a.id == b.id and a.wind == b.wind)
	local kinds = {}
	for d = 1, 200 do kinds[D.Voyage.weather(d, "lisbon").id] = true end
	local nk = 0 for _ in kinds do nk += 1 end
	check("weather varies", nk >= 5)
	local d0 = st.day
	check("wait a day", act(st, "WaitDay", {}) and st.day == d0 + 1)
	local v = S.View.build(st, ctx)
	check("view has weather", v.weather ~= nil and v.forecast ~= nil)
end

-- 13d. 해역 단계 -------------------------------------------------------
do
	local st = newState()
	st.coins = 100000
	local ok, msg = act(st, "Sail", { portId = "nagasaki" })
	check("far east locked at lv1", not ok and string.find(msg or "", "모험 Lv") ~= nil)
	check("regions: london=1 nagasaki=5 cape_town=4 lima-ish callao=6", D.Regions.of(D.Ports.Ports.london) == D.Regions.List[1] and D.Regions.of(D.Ports.Ports.nagasaki) == D.Regions.List[5] and D.Regions.of(D.Ports.Ports.cape_town) == D.Regions.List[4] and D.Regions.of(D.Ports.Ports.callao) == D.Regions.List[6])
	check("regions: caribbean=3, dakar=2", D.Regions.of(D.Ports.Ports.havana) == D.Regions.List[3] and D.Regions.of(D.Ports.Ports.dakar) == D.Regions.List[2])
	st.careers.adventure.level = 30
	st.ship.supplies = 5000
	local ok2 = act(st, "Sail", { portId = "nagasaki" })
	check("far east opens at high level", ok2)
end

-- 13e. 보물지도 --------------------------------------------------------
do
	local st = newState()
	st.coins = 1000
	check("buy map", act(st, "BuyMap", {}) and #st.maps == 1)
	local target = st.maps[1].to
	local c0 = st.coins
	st.coins = c0
	local okS = act(st, "Sail", { portId = target })
	check("treasure found on arrival", okS and #st.maps == 0 and st.coins > c0 - 500)
	check("maps survive save", (function()
		local s2 = newState()
		s2.maps = { { to = "lisbon", reward = 400 } }
		return #S.State.sanitize(S.State.serialize(s2)).maps == 1
	end)())
end

-- 13f. 장비와 동료 이야기 -----------------------------------------------
do
	local st = newState()
	st.coins = 5000
	st.fame = 100
	local sp0 = S.Perk.speedMult(st)
	check("buy gear equips", act(st, "BuyGear", { gearId = "sextant" }) and #st.gear.equipped == 1)
	check("gear boosts speed", S.Perk.speedMult(st) > sp0)
	check("gear toggle off", act(st, "ToggleGear", { gearId = "sextant" }) and #st.gear.equipped == 0)
	act(st, "BuyGear", { gearId = "ledger" })
	act(st, "BuyGear", { gearId = "naval_chart" })
	act(st, "BuyGear", { gearId = "lucky_charm" })
	check("gear slots capped", #st.gear.equipped <= D.Gear.SLOTS)
	check("gear survives save", #S.State.sanitize(S.State.serialize(st)).gear.owned == #st.gear.owned)
	st.companions = { "c_boyle" }
	st.affinity.c_boyle = 40
	local c0 = st.coins
	act(st, "Talk", { companionId = "c_boyle" })
	check("companion story gives reward once", st.storySeen.c_boyle_2 == true and st.talk.note:find("이야기") ~= nil)
	st.day += 1
	act(st, "Talk", { companionId = "c_boyle" })
	check("story not repeated", st.talk.note:find("이야기") == nil)
	check("storySeen survives save", S.State.sanitize(S.State.serialize(st)).storySeen.c_boyle_2 == true)
end

-- 13g. 국가 우호도 -----------------------------------------------------
do
	local st = newState()
	local r0 = S.Trade.sellRateFor(st)
	local port = D.Ports.Ports[st.portId]
	st.rep[port.country] = 100
	check("rep raises sell rate", S.Trade.sellRateFor(st) > r0)
	check("rep survives save", S.State.sanitize(S.State.serialize(st)).rep[port.country] == 100)
	local v = S.View.build(st, ctx)
	check("view has rep", v.rep ~= nil and v.rep.value == 100)
end

-- 13h. 선단 ------------------------------------------------------------
do
	local st = newState()
	st.coins = 5000
	st.fame = 100
	local c0 = S.Perk.cannonBonus(st)
	check("escort buy needs shipyard port", D.Ports.Ports[st.portId].shipyard == false or act(st, "BuyEscort", {}))
	if D.Ports.Ports[st.portId].shipyard then
		check("escort raises cannon", S.Perk.cannonBonus(st) > c0 and st.escorts == 1)
		local m = {}
		S.Shipyard.payUpkeep(st, 2, m)
		check("upkeep charged", #m == 1 and st.coins < 5000 - 1200)
		check("escorts survive save", S.State.sanitize(S.State.serialize(st)).escorts == 1)
		check("dismiss escort", act(st, "DismissEscort", {}) and st.escorts == 0)
	end
end

-- 13i. 관세·암시장·봉쇄 --------------------------------------------------
do
	local st = newState()
	local home = D.Ports.Ports[st.portId].country
	check("no tariff at home nation", S.Trade.tariffRate(st) == 0 or home ~= st.nationId)
	st.portId = "lisbon"
	st.rep = {}
	check("tariff at foreign port", S.Trade.tariffRate(st) > 0 or D.Ports.Ports.lisbon.country == st.nationId)
	st.rep[D.Ports.Ports.lisbon.country] = 100
	check("tariff 0 at max rep", S.Trade.tariffRate(st) == 0)
	st.cargo.wool = 5
	local rngLow = { rng = function() return 0.99 end, market = ctx.market }
	local okSm, msgSm = S.Trade.handlers.Smuggle(st, { goodId = "wool", amount = 5 }, rngLow)
	check("smuggle sells when not caught", okSm and (st.cargo.wool or 0) == 0, msgSm)
	st.cargo.wool = 5
	local rngHigh = { rng = function() return 0 end, market = ctx.market }
	st.rep[D.Ports.Ports.lisbon.country] = 50
	local okC, msgC = S.Trade.handlers.Smuggle(st, { goodId = "wool", amount = 5 }, rngHigh)
	check("smuggle caught confiscates", okC and (st.cargo.wool or 0) == 0 and st.rep[D.Ports.Ports.lisbon.country] == 42, msgC)
	-- 도착하면 납품 퀘스트 물건을 자동으로 넘긴다
	do
		local qs = newState()
		local q
		for _, x in D.Quests.Quests do
			if x.kind == "deliver" and not x.companionId then
				q = x
				break
			end
		end
		qs.portId = q.portId
		qs.coins = 100000
		check("quest accept", act(qs, "Accept", { questId = q.id }))
		qs.cargo[q.goodId] = q.amount
		local msgs = {}
		S.Quest.autoDeliver(qs, msgs)
		check("auto deliver delivered", qs.quests.active[q.id].delivered == q.amount, tostring(qs.quests.active[q.id].delivered))
		check("auto deliver notifies completion", #msgs >= 2)
		check("claim after auto deliver", act(qs, "Claim", { questId = q.id }))
	end
	-- 흥정: 한 항구·물건당 한 번, 성공하면 다음 구매 한 번만 싸다
	do
		local hs = newState()
		hs.coins = 100000
		local win = { rng = function() return 0 end, market = ctx.market }
		local lose = { rng = function() return 0.999 end, market = ctx.market }
		local okH, msgH = S.Trade.handlers.Haggle(hs, { goodId = "wool" }, win)
		check("haggle success", okH, msgH)
		check("haggle once per good", not S.Trade.handlers.Haggle(hs, { goodId = "wool" }, win))
		local before = hs.coins
		S.Trade.handlers.Buy(hs, { goodId = "wool", amount = 1 }, win)
		local paid1 = before - hs.coins
		before = hs.coins
		S.Trade.handlers.Buy(hs, { goodId = "wool", amount = 1 }, win)
		local paid2 = before - hs.coins
		check("haggle discount applies once", paid1 < paid2 and hs.haggle.deal == nil, paid1 .. "/" .. paid2)
		check("haggle fail gives no deal", not S.Trade.handlers.Haggle(hs, { goodId = "silk" }, lose) and hs.haggle.deal == nil)
		check("haggle bad good rejected", not S.Trade.handlers.Haggle(hs, { goodId = "zzz" }, win))
	end
	local seenB = false
	for _ = 1, 5000 do
		if D.Voyage.rollEvent(function() return math.random() end, 10).kind == "blockade" then seenB = true break end
	end
	check("blockade event rolls", seenB)
end

-- 13j. 길드 의뢰 보드 ----------------------------------------------------
do
	local st = newState()
	local b1 = D.Bounties.board(st.portId, st.day, D.Ports.Goods, (function() local t = {} for id in D.Ports.Goods do table.insert(t, id) end table.sort(t) return t end)())
	check("board has 3", #b1 == 3 and b1[3].kind == "hunt")
	local deliver = b1[1]
	check("accept bounty", act(st, "AcceptBounty", { bountyId = deliver.id }))
	check("no double accept", not act(st, "AcceptBounty", { bountyId = deliver.id }))
	check("turn in needs goods", not act(st, "TurnInBounty", { bountyId = deliver.id }))
	st.cargo[deliver.goodId] = deliver.count
	local c0 = st.coins
	check("turn in pays", act(st, "TurnInBounty", { bountyId = deliver.id }) and st.coins == c0 + deliver.coins)
	check("done not repeatable", not act(st, "AcceptBounty", { bountyId = deliver.id }))
	check("fake id rejected", not act(st, "AcceptBounty", { bountyId = "x:1:1" }))
	check("bounty survives save", S.State.sanitize(S.State.serialize(st)).bounty.done[deliver.id] == true)
	local hunt = b1[3]
	act(st, "AcceptBounty", { bountyId = hunt.id })
	st.stats.battlesWon += hunt.count
	check("hunt bounty completes", act(st, "TurnInBounty", { bountyId = hunt.id }))
end

-- 14. 화면 스냅샷 -------------------------------------------------------
do
	local st = newState()
	local v = S.View.build(st, ctx)
	check("view has player", v.player.portName == "런던" and v.player.year == 1700)
	check("view goods only local specialties/demands/owned", #v.goods >= 4 and #v.goods < (function() local n = 0 for _ in D.Ports.Goods do n += 1 end return n end)() + 1 and v.goods[1].tag == "특산")
	check("view routes", #v.routes == (function() local n = 0 for _ in D.Ports.Ports do n += 1 end return n - 1 end)())
	check("view codex", v.codex.total == #D.Cards.Cards and v.codex.found == 0)
	check("view hides unfound names", v.codex.cards[1].name == "???")
	check("view tech", #v.tech == 6)
	check("view quests", #v.quests.available == (function() local n = 0 for _, q in D.Quests.Quests do if not q.companionId then n += 1 end end return n end)())
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
		check("companion scholar exists " .. c.id, c.scholarId == "" and c.role ~= nil or (function()
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

-- 전문 분야·동료 전용 스킬 -----------------------------------------------
do
	local granted = {}
	for _, id in D.Skills.Order do
		local sk = D.Skills.Skills[id]
		check("skill in order exists " .. id, sk ~= nil)
		if sk.grantedBy then
			granted[id] = true
			check("grantedBy valid " .. id, D.Specialties.SpecialtyById[sk.grantedBy] ~= nil or D.Specialties.CompanionById[sk.grantedBy] ~= nil)
		end
	end
	local st = newState("england")
	st.careers.battle.level = 12
	local ok, msg = act(st, "SetLoadout", { skills = { "herbal_remedy" } })
	check("specialty skill locked without specialty", not ok, msg)
	st.specialty = "botanist"
	ok, msg = act(st, "SetLoadout", { skills = { "herbal_remedy", "broadside" } })
	check("specialty skill needs spec level 3", not ok, msg)
	st.specLevels.botanist = { level = D.Specialties.SKILL_LEVEL, xp = 0 }
	ok = act(st, "SetLoadout", { skills = { "herbal_remedy", "broadside" } })
	check("specialty skill equips with specialty", ok)
	check("fighter has specialty skill", table.find(S.Battle.playerFighter(st).skills, "herbal_remedy") ~= nil)
	st.specialty = "zoologist"
	check("fighter drops skill after change", table.find(S.Battle.playerFighter(st).skills, "herbal_remedy") == nil)
	ok = act(st, "SetLoadout", { skills = { "star_fix" } })
	check("companion skill locked", not ok)
	st.companions = { "c_halley" }
	ok = act(st, "SetLoadout", { skills = { "star_fix", "pressure_valve" } })
	check("pressure_valve needs papin", not ok)
	ok = act(st, "SetLoadout", { skills = { "star_fix" } })
	check("companion skill equips", ok)
	local view = S.View.build(st, ctx)
	local lockedCount = 0
	for _, s in view.loadout.skills do
		if s.locked then
			lockedCount += 1
		end
	end
	check("view marks locked skills", lockedCount >= 5)

	-- 각 전용 스킬이 실제로 전투에서 발동한다 (로그에 이름이 남는다)
	local names = {
		herbal_remedy = "약초 치료", predator_decoy = "맹수 울음", relic_ward = "유물의 가호", chart_course = "해도 항로 차단",
		bribe_gunners = "뇌물 공작", star_fix = "별자리 조준", pressure_valve = "압력 밸브 방출",
	}
	for id, name in names do
		local me = S.Battle.playerFighter(newState("england"))
		me.skills = { id }
		me.crew, me.maxCrew = 40, 60
		me.hull, me.maxHull = 60, 100
		local used = false
		for _ = 1, 20 do
			local r = D.Combat.run(me, D.Combat.pirate(3, rng), rng)
			for _, line in r.log do
				if string.find(line, name, 1, true) then
					used = true
				end
			end
			if used then
				break
			end
		end
		check("skill fires in battle " .. id, used)
	end
end

-- 동료 대사 ---------------------------------------------------------
do
	for _, c in D.Specialties.Companions do
		check("companion has lines " .. c.id, #c.battleLine > 0 and #c.winLine > 0)
	end
	local st = newState("england")
	check("no lines without companions", #S.Perk.companionLines(st, "battle") == 0)
	st.companions = { "c_halley", "c_papin" }
	check("lines per companion", #S.Perk.companionLines(st, "battle") == 2 and #S.Perk.companionLines(st, "win") == 2)
	st.careers.battle.level = 10
	st.ship.id = "galleon"
	local d = S.State.shipDef(st)
	st.ship.hull, st.ship.crew = d.hull, d.crew
	local ok, msg = act(st, "Hunt", {})
	check("hunt message has companion line", ok and string.find(msg, "에드먼드 핼리", 1, true) ~= nil, msg)
end

-- 전문 분야 레벨과 호감도 -------------------------------------------
do
	local Sp = D.Specialties
	local st = newState("england")
	check("gainSpec without specialty ignored", S.Perk.gainSpec(st, "Botany", 100) == false)
	st.specialty = "botanist"
	check("gainSpec wrong kind ignored", S.Perk.gainSpec(st, "trade", 100) == false)
	check("level 1 mult is 1", S.Perk.discoverBonus(st, "Botany") == 0.25)
	local msgs = {}
	S.Perk.gainSpec(st, "Botany", Sp.xpForNext(1), msgs)
	check("level up on enough xp", st.specLevels.botanist.level == 2 and #msgs == 1)
	check("level 2 bonus scales", math.abs(S.Perk.discoverBonus(st, "Botany") - 0.25 * 1.2) < 1e-9)
	for _ = 1, 30 do
		S.Perk.gainSpec(st, "Medicine", 5000)
	end
	check("level capped", st.specLevels.botanist.level == Sp.MAX_LEVEL and st.specLevels.botanist.xp == 0)
	-- 분야를 바꿔도 레벨은 보존된다
	st.coins = 1000
	act(st, "SetSpecialty", { specialtyId = "merchant" })
	act(st, "SetSpecialty", { specialtyId = "botanist" })
	check("spec level kept after switching", st.specLevels.botanist.level == Sp.MAX_LEVEL)

	-- 탐험으로 전문 경험치가 쌓인다
	local g = newState("england")
	g.specialty = "botanist"
	g.portId = "london"
	for _ = 1, 200 do
		g.ship.supplies = 99
		act(g, "Explore", { siteId = "london_fields" })
	end
	check("exploring grants specialty xp", g.specLevels.botanist ~= nil and (g.specLevels.botanist.level > 1 or g.specLevels.botanist.xp > 0))

	-- 호감도
	local a = newState("england")
	a.companions = { "c_halley" }
	local base = S.Perk.speedMult(a)
	local m2 = {}
	S.Perk.addAffinity(a, 30, m2)
	check("affinity tier up message", #m2 == 1 and a.affinity.c_halley == 30)
	check("affinity raises perk", S.Perk.speedMult(a) > base)
	S.Perk.addAffinity(a, 500)
	check("affinity capped", a.affinity.c_halley == Sp.MAX_AFFINITY)
	a.companions = {}
	S.Perk.addAffinity(a, 10)
	check("no affinity without companion", a.affinity.c_halley == Sp.MAX_AFFINITY)

	-- 해전 승리로 호감도가 오른다
	local b = newState("england")
	b.companions = { "c_papin" }
	b.careers.battle.level = 15
	b.ship.id = "galleon"
	local d = S.State.shipDef(b)
	b.ship.hull, b.ship.crew = d.hull, d.crew
	for _ = 1, 10 do
		b.ship.hull, b.ship.crew = d.hull, d.crew
		act(b, "Hunt", {})
	end
	check("battle wins raise affinity", (b.affinity.c_papin or 0) >= 2)

	-- 저장 왕복과 변조 방어
	local saved = S.State.serialize(st)
	local back = S.State.sanitize(saved)
	check("specLevels roundtrip", back and back.specLevels.botanist.level == Sp.MAX_LEVEL)
	local s2 = S.State.serialize(a)
	s2.specLevels = { botanist = { level = 99, xp = -5 }, ghost = { level = 3 }, merchant = "x" }
	s2.affinity = { c_halley = 9999, ghost = 5, c_papin = -3 }
	back = S.State.sanitize(s2)
	check("specLevels sanitized", back and back.specLevels.botanist.level == Sp.MAX_LEVEL and back.specLevels.ghost == nil and back.specLevels.merchant == nil)
	check("affinity sanitized", back and back.affinity.c_halley == Sp.MAX_AFFINITY and back.affinity.ghost == nil and back.affinity.c_papin == 0)
end

-- 동료 퀘스트 -------------------------------------------------------
do
	for _, q in D.Quests.Quests do
		if q.companionId then
			check("companion quest companion exists " .. q.id, D.Specialties.CompanionById[q.companionId] ~= nil)
			check("companion quest card exists " .. q.id, q.rewardCardId == nil or D.Cards.ById[q.rewardCardId] ~= nil)
		end
		if q.kind == "field" then
			check("field quest has field " .. q.id, q.fieldId ~= nil)
		end
	end
	local st = newState("england")
	local ok, msg = act(st, "Accept", { questId = "cq_merian" })
	check("companion quest hidden at low affinity", not ok, msg)
	st.affinity.c_merian = 20
	local names = {}
	for _, q in S.View.build(st, ctx).quests.available do
		names[q.id] = true
	end
	check("companion quest visible at affinity", names.cq_merian == true and names.cq_halley == nil)
	ok = act(st, "Accept", { questId = "cq_merian" })
	check("companion quest accepted", ok)
	ok = act(st, "Claim", { questId = "cq_merian" })
	check("claim blocked without progress", not ok)
	st.discovered.zoo_reindeer, st.discovered.zoo_puffin, st.discovered.zoo_metamorphosis = true, true, true
	local coins0 = st.coins
	ok, msg = act(st, "Claim", { questId = "cq_merian" })
	check("field quest claim works", ok and st.quests.done.cq_merian and st.discovered.zoo_surinam_insects == true, msg)
	check("field quest rewards coins", st.coins > coins0 + 800)
	-- 모든 동료 퀘스트의 카드는 중복 없이 발견 목록에 들어간다
	local s2 = newState("england")
	s2.affinity.c_boyle = 50
	act(s2, "Accept", { questId = "cq_boyle" })
	s2.portId = "london"
	s2.cargo.glass = 6
	act(s2, "TurnIn", { questId = "cq_boyle" })
	ok = act(s2, "Claim", { questId = "cq_boyle" })
	check("deliver companion quest works", ok and s2.discovered.che_air_pump == true)
end

-- 항구 투자와 주점 소문
do
	local st = newState("england")
	st.coins = 10000
	local ok = act(st, "Invest", { amount = 123 })
	check("invest bad amount rejected", not ok)
	local fame0 = st.fame
	ok = act(st, "Invest", { amount = 1000 })
	check("invest works", ok and st.coins == 9000 and st.harbor[st.portId] == 1000 and st.fame == fame0 + 10)
	check("harbor level 2 at 1000", S.Harbor.level(st) == 2)
	check("harbor sell bonus", S.Harbor.sellBonus(st) == 0.01)
	local v = S.View.build(st, ctx)
	check("view harbor", v.harbor.level == 2 and v.harbor.invested == 1000 and v.harbor.nextAt == 2000)
	check("view discounted supply cost", v.shipyard.supplyCost == math.floor(S.Shipyard.SUPPLY_COST * 0.95) or v.shipyard.supplyCost == math.max(1, math.floor(S.Shipyard.SUPPLY_COST * 0.95)))
	for _ = 1, 3 do
		act(st, "Invest", { amount = 3000 })
	end
	check("harbor level 4", S.Harbor.level(st) == 4)
	local other = newState("england")
	check("other port unaffected", S.Harbor.level(other) == 1)
	st.coins = 10
	ok = act(st, "Invest", { amount = 300 })
	check("invest without coins rejected", not ok)
	ok = act(st, "Rumor", {})
	check("rumor without coins rejected", not ok)
	st.coins = 100
	local ok2, msg2 = act(st, "Rumor", {})
	check("rumor works and costs", ok2 and st.coins == 60 and S.View.build ~= nil and st.rumor ~= nil and #st.rumor.lines >= 3 and string.find(st.rumor.lines[1], "%d") == nil, msg2)
	local back = S.State.sanitize(S.State.serialize(st))
	check("harbor survives save", back.harbor[st.portId] == st.harbor[st.portId])
	local evil = S.State.sanitize({ nationId = "england", startYear = 1700, harbor = { nowhere = 5, london = -9, dublin = 77 } })
	check("harbor sanitized", evil.harbor.nowhere == nil and evil.harbor.london == 0 and evil.harbor.dublin == 77)
end

-- 시설: 은행, 길드, 왕궁, 이야기
do
	local function at(portId)
		local st = newState("england")
		st.portId = portId
		st.coins = 5000
		st.fame = 500
		return st
	end
	-- 은행
	local st = at("london")
	check("bank at london", act(st, "Deposit", { amount = 1000 }) and st.bank.deposit == 1000 and st.coins == 4000)
	check("deposit more than owned clamps", act(st, "Deposit", { amount = 999999 }) and st.coins == 0)
	st.day += 60
	act(st, "Withdraw", { amount = 100 })
	check("deposit interest after 60 days", st.bank.deposit > 5000 - 100, st.bank.deposit)
	check("bad amount rejected", not act(st, "Deposit", { amount = -5 }) and not act(st, "Deposit", { amount = 0 / 0 }))
	local st2 = at("dublin")
	check("no bank at dublin", not act(st2, "Deposit", { amount = 10 }))
	st2 = at("london")
	st2.fame = 0
	check("loan limit by fame", not act(st2, "Borrow", { amount = D.Facilities.BANK.LOAN_BASE + 1 }) == false)
	check("loan capped", st2.bank.loan == D.Facilities.BANK.LOAN_BASE)
	st2.day += 90
	act(st2, "Repay", { amount = 1 })
	check("loan interest grows", st2.bank.loan > D.Facilities.BANK.LOAN_BASE)
	local debt = st2.bank.loan
	st2.coins = 99999
	act(st2, "Repay", { amount = 999999 })
	check("repay clears", st2.bank.loan == 0 and st2.coins == 99999 - debt)
	-- 길드 계약
	local g = at("london")
	local offers = S.Facility.offers(g)
	check("3 guild offers", #offers == 3)
	check("offers are stable", S.Facility.offers(g)[1].goodId == offers[1].goodId and S.Facility.offers(g)[2].toPortId == offers[2].toPortId)
	check("no offers without guild", #S.Facility.offers(at("naples")) == 0)
	check("accept contract", act(g, "AcceptContract", { index = 1 }) and g.contract ~= nil)
	check("second contract rejected", not act(g, "AcceptContract", { index = 2 }))
	check("turn in wrong port rejected", not act(g, "TurnInContract", {}))
	g.portId = g.contract.toPortId
	check("turn in without goods rejected", not act(g, "TurnInContract", {}))
	g.cargo[g.contract.goodId] = g.contract.amount
	local reward, coins0 = g.contract.reward, g.coins
	check("turn in pays", act(g, "TurnInContract", {}) and g.coins == coins0 + reward and g.contract == nil)
	g.portId = "london"
	act(g, "AcceptContract", { index = 1 })
	g.day += D.Facilities.GUILD.DEADLINE_DAYS + 1
	g.portId = g.contract.toPortId
	g.cargo[g.contract.goodId] = 99
	check("expired contract rejected", not act(g, "TurnInContract", {}))
	-- 왕궁
	local pal = at("london")
	pal.fame = 10
	check("title needs fame", not act(pal, "Audience", {}))
	pal.fame = 60
	local c0 = pal.coins
	check("knight title", act(pal, "Audience", {}) and pal.title == 1 and pal.coins == c0 + D.Facilities.TITLES[1].coins)
	check("title sell bonus", S.Facility.titleBonus(pal) == D.Facilities.TITLE_SELL_BONUS)
	check("next title needs more fame", not act(pal, "Audience", {}))
	check("no palace at dublin", not act(at("dublin"), "Audience", {}))
	-- 이야기
	local s1 = at("london")
	s1.fame = 0
	check("story needs choice", not act(s1, "PlayStory", { eventId = "lc_1" }))
	check("story wrong port", not act(s1, "PlayStory", { eventId = "lc_2", choice = 1 }))
	check("story chapter 1", act(s1, "PlayStory", { eventId = "lc_1", choice = 1 }) and s1.story.lc_1 == 1)
	check("story not repeatable", not act(s1, "PlayStory", { eventId = "lc_1", choice = 1 }))
	local v = S.View.build(s1, ctx)
	check("view story hides seen", (function() for _, e in v.story do if e.id == "lc_1" then return false end end return true end)())
	s1.portId = "lisbon"
	check("chapter 2 available", (function() for _, e in S.View.build(s1, ctx).story do if e.id == "lc_2" then return true end end return false end)())
	check("chapter 2 gives card", act(s1, "PlayStory", { eventId = "lc_2", choice = 1 }) and s1.discovered.relic_lostchart_1 == true)
	-- 거절 선택은 후속 이야기를 막는다
	local s2 = at("london")
	act(s2, "PlayStory", { eventId = "lc_1", choice = 2 })
	s2.portId = "lisbon"
	check("declined path blocks chapter 2", not act(s2, "PlayStory", { eventId = "lc_2", choice = 1 }))
	-- 선택 조건
	local s3 = at("venice")
	s3.story = { lc_1 = 1, lc_2 = 1 }
	s3.fame = 50
	check("fame-gated choice rejected", not act(s3, "PlayStory", { eventId = "lc_3", choice = 2 }))
	check("paid choice needs coins", (function() s3.coins = 100 return not act(s3, "PlayStory", { eventId = "lc_3", choice = 1 }) end)())
	-- 마지막 장은 세 조각이 필요하다
	local s5 = at("amsterdam")
	s5.story = { lc_1 = 1, lc_2 = 1, lc_3 = 1, lc_4 = 1 }
	check("finale needs cards", not act(s5, "PlayStory", { eventId = "lc_5", choice = 1 }))
	for _, c in { "relic_lostchart_1", "relic_lostchart_2", "relic_lostchart_3" } do
		s5.discovered[c] = true
	end
	check("finale works", act(s5, "PlayStory", { eventId = "lc_5", choice = 1 }) and s5.discovered.relic_lostchart == true)
	-- 저장
	local back = S.State.sanitize(S.State.serialize(g))
	check("facility state survives save", back.title == g.title and back.bank.deposit == g.bank.deposit)
	local back2 = S.State.sanitize(S.State.serialize(s5))
	check("story survives save", back2.story.lc_5 == 1)
	local evil = S.State.sanitize({ nationId = "england", startYear = 1700, title = 99, story = { nope = 1, lc_1 = 9 }, bank = { deposit = -5, loan = "x" }, contract = { goodId = "nope" } })
	check("facility sanitized", evil.title == #D.Facilities.TITLES and evil.story.nope == nil and evil.story.lc_1 == nil and evil.bank.deposit == 0 and evil.contract == nil)
end

-- 항만청, 면허, 보험, 대포·선체 개조
do
	local st = newState("england")
	st.coins = 100000
	st.fame = 0
	check("license needs fame", not act(st, "BuyLicense", {}))
	st.fame = 40
	check("license 1", act(st, "BuyLicense", {}) and st.license == 1)
	check("license 2 needs more fame", not act(st, "BuyLicense", {}))
	local sy = newState("england")
	sy.portId = "dublin"
	check("no harbormaster at dublin", not act(sy, "BuyLicense", {}) and not act(sy, "BuyInsurance", {}))
	-- 면허 없이 중형선 불가
	local lic = newState("england")
	lic.coins = 100000
	check("frigate needs license", not act(lic, "BuyShip", { shipId = "frigate" }))
	lic.license = 1
	check("frigate with license", act(lic, "BuyShip", { shipId = "frigate" }))
	check("ship classes exist", D.Ships.Ships.caravel.class == 1 and D.Ships.Ships.ironclad_frigate.class == 4)
	-- 보험
	local ins = newState("england")
	ins.coins = 5000
	check("insurance bought", act(ins, "BuyInsurance", {}) and ins.insured == true and ins.coins < 5000)
	check("double insurance rejected", not act(ins, "BuyInsurance", {}))
	-- 대포
	local cn = newState("england")
	cn.coins = 100000
	local cargo0 = S.State.cargoCapacity(cn)
	local m0 = S.Shipyard.cannonMult(cn)
	check("buy culverin", act(cn, "BuyCannon", { cannonId = "culverin" }) and cn.ship.cannon == "culverin")
	check("culverin raises mult", S.Shipyard.cannonMult(cn) > m0)
	check("cannon weight lowers cargo", S.State.cargoCapacity(cn) < cargo0)
	check("same cannon rejected", not act(cn, "BuyCannon", { cannonId = "culverin" }))
	check("carronade needs story", not act(cn, "BuyCannon", { cannonId = "carronade" }))
	cn.story.smith_1 = 1
	check("carronade after story", act(cn, "BuyCannon", { cannonId = "carronade" }))
	check("steam gun needs tech", not act(cn, "BuyCannon", { cannonId = "steam_gun" }))
	cn.portId = "dublin"
	check("cannon needs shipyard", not act(cn, "BuyCannon", { cannonId = "demi" }))
	cn.portId = "london"
	local full = newState("england")
	full.coins = 100000
	full.cargo.wool = S.State.cargoCapacity(full)
	check("heavy cannon blocked by full cargo", not act(full, "BuyCannon", { cannonId = "demi" }))
	-- 선체 보강
	local pl = newState("england")
	pl.coins = 100000
	local def0 = S.State.shipDef(pl)
	check("plating 1", act(pl, "BuyPlating", {}) and pl.ship.plating == 1)
	local def1 = S.State.shipDef(pl)
	check("plating raises hull", def1.hull > def0.hull and pl.ship.hull == def1.hull)
	act(pl, "BuyPlating", {})
	check("plating 3 needs tech", not act(pl, "BuyPlating", {}) and pl.ship.plating == 2)
	pl.tech.steam_boiler = true
	check("plating 3 with tech", act(pl, "BuyPlating", {}))
	check("plating max", not act(pl, "BuyPlating", {}))
	-- 새 배를 사면 개조는 초기화
	pl.license = 3
	act(pl, "BuyShip", { shipId = "galleon" })
	check("refit resets on new ship", pl.ship.plating == 0 and pl.ship.cannon == "basic")
	-- 저장/위변조
	local back = S.State.sanitize(S.State.serialize(cn))
	check("refit survives save", back.ship.cannon == "carronade", tostring(back.ship.cannon) .. "/" .. tostring(cn.ship.cannon))
	local evil = S.State.sanitize({ nationId = "england", startYear = 1700, ship = { id = "caravel", cannon = "bogus", plating = 99 }, license = 99, insured = "yes" })
	check("refit sanitized", evil.ship.cannon == "basic" and evil.ship.plating == #D.Ships.Plating and evil.license == #D.Ships.Licenses and evil.insured == false)
	-- 보험이 패배 손실을 막는다
	local lose = newState("england")
	lose.coins = 1000
	lose.cargo.wool = 10
	lose.insured = true
	local enemy = { hull = 1e9, crew = 1e9, cannons = 50, cannonMult = 50, meleeMult = 50, skills = {}, level = 1 }
	check("view refit", S.View.build(lose, ctx).refit.cannons[1].id == "basic" and S.View.build(lose, ctx).harbormaster.insured == true)
	_ = enemy
end

-- 도감 분류 설명과 완성 보상
do
	for _, c in D.Cards.Cards do
		if not D.Fields.ById[c.field] then
			check("card field has description " .. c.id .. "/" .. c.field, false)
		end
	end
	for _, f in D.Fields.Fields do
		check("field detail long enough " .. f.id, #f.detail > 60 and #f.tip > 10 and #f.summary > 5)
		local n = 0
		for _, c in D.Cards.Cards do
			if c.field == f.id then
				n += 1
			end
		end
		check("field has enough cards " .. f.id, n >= 15, n)
	end
	local st = newState("england")
	local v = S.View.build(st, ctx)
	check("codex view fields", #v.codex.fields == #D.Fields.Fields and #v.codex.overall == #D.Collection.OVERALL_TIERS)
	check("claim needs progress", not act(st, "ClaimCollection", { scope = "Botany", tier = 1 }))
	check("claim bad scope", not act(st, "ClaimCollection", { scope = "Nope", tier = 1 }) and not act(st, "ClaimCollection", { scope = "Botany", tier = 99 }))
	-- 식물 카드를 전부 발견
	local total = 0
	for _, c in D.Cards.Cards do
		if c.field == "Botany" then
			st.discovered[c.id] = true
			total += 1
		end
	end
	local coins0, fame0 = st.coins, st.fame
	check("claim botany 25%", act(st, "ClaimCollection", { scope = "Botany", tier = 1 }) and st.coins == coins0 + D.Collection.FIELD_TIERS[1].coins and st.fame == fame0 + D.Collection.FIELD_TIERS[1].fame)
	check("claim only once", not act(st, "ClaimCollection", { scope = "Botany", tier = 1 }))
	check("claim botany 100%", act(st, "ClaimCollection", { scope = "Botany", tier = 4 }))
	check("other field not claimable", not act(st, "ClaimCollection", { scope = "Zoology", tier = 1 }))
	-- 전체 진행도
	for _, c in D.Cards.Cards do
		st.discovered[c.id] = true
	end
	check("overall 100% claim", act(st, "ClaimCollection", { scope = "all", tier = 5 }))
	check("rank title", S.Codex.rankTitle(st) == "세계 백과의 완성자")
	check("view rank", S.View.build(st, ctx).codex.rank == "세계 백과의 완성자")
	local back = S.State.sanitize(S.State.serialize(st))
	check("collection survives save", back.collected["Botany:1"] == true and back.collected["ALL:5"] == true)
	local evil = S.State.sanitize({ nationId = "england", startYear = 1700, collected = { ["Botany:1"] = true, ["bad key"] = true, ["x:1"] = "yes" } })
	check("collection sanitized", evil.collected["Botany:1"] == true and evil.collected["bad key"] == nil and evil.collected["x:1"] == nil)
end

-- 바닷길: 모든 항구 쌍에 경로가 있고 양 끝이 항구 근처이며 방향이 뒤집힌다
do
	local ids = {}
	for id in D.Ports.Ports do
		table.insert(ids, id)
	end
	local okAll, okEnds = true, true
	for _, a in ids do
		for _, b in ids do
			if a ~= b then
				local path = D.SeaRoutes.path(a, b, D.Ports.Ports)
				local first, last = path[1], path[#path]
				local pa, pb = D.Ports.Ports[a], D.Ports.Ports[b]
				if #path < 2 then
					okAll = false
				end
				if math.abs(first[1] - pa.lat) > 1.2 or math.abs(first[2] - pa.lon) > 1.2 or math.abs(last[1] - pb.lat) > 1.2 or math.abs(last[2] - pb.lon) > 1.2 then
					okEnds = false
				end
			end
		end
	end
	check("sea routes exist for all port pairs", okAll)
	check("sea routes start/end near ports", okEnds)
end

print(string.format("\n통과 %d, 실패 %d", passed, failed))
if failed > 0 then
	error("tests failed")
end
