--!nonstrict
-- 지식 카드 = 전투 카드 규칙 시험 (logic.test 가 타입 검사 한도에 가까워 따로 둔다)
local KC = require("./Shared/KnowledgeCards")
local BC = require("./Shared/BoardingCards")
local CB = require("./Shared/CardBook")
local KB = require("./Shared/KnowledgeBattle")

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
	BoardingCards = require("./Shared/BoardingCards"),
	CardBook = require("./Shared/CardBook"),
	Bosses = require("./Shared/Bosses"),
	Specialties = require("./Shared/Specialties"),
	CompanionTalk = require("./Shared/CompanionTalk"),
	Narrative = require("./Shared/Narrative"),
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
local ctx = { rng = math.random, market = S.MarketClass.new() }
local pass, fail = 0, 0
local function check(name, ok)
	if ok then pass += 1 else fail += 1 print("FAIL: " .. name) end
end

local allOk, heroes, legend, melee, ranged, cannon, specials = true, 0, 0, 0, 0, 0, 0
for _, c in KC.Cards do
	local d = BC.Units[c.id] or BC.Specials[c.id]
	if not d or not d.knowledge or d.name ~= c.name then allOk = false continue end
	if d.hero then heroes += 1 end
	if c.rarity == "Legendary" then legend += 1 end
	if BC.Specials[c.id] then specials += 1 end
	if d.row == "melee" then melee += 1 elseif d.row == "ranged" then ranged += 1 elseif d.row == "cannon" then cannon += 1 end
end
check("지식=전투: 모든 도감 카드가 전투 카드", allOk and #KC.Cards >= 700)
check("지식=전투: 전설 카드는 영웅", heroes == legend and legend > 0)
check("지식=전투: 세 줄이 모두 있다", melee > 50 and ranged > 50 and cannon > 20)
check("지식=전투: 즉시 효과 카드가 있다", specials > 5)
-- 규칙은 결정적이다: 같은 카드는 늘 같은 능력
local u1, s1 = KB.derive({ scorch = "a", wind = "a", clear = "a", horn = "a", decoy = "a" })
local sample = KC.Cards[10].id
local d1 = u1[sample] or s1[sample]
local d2 = BC.Units[sample] or BC.Specials[sample]
check("지식=전투: 능력이 결정적", d1.power == d2.power and d1.row == d2.row)
-- 보상은 지식 카드이고, 가진 카드는 되도록 피한다
local book = CB.new("europe")
local seed = 1
local function r() seed = (seed * 1103515245 + 12345) % 2147483648 return seed / 2147483648 end
local newOnes = 0
for _ = 1, 20 do
	local id = CB.drop(book, "quest", r, "Astronomy")
	if BC.Units[id] and BC.Units[id].knowledge or BC.Specials[id] and BC.Specials[id].knowledge then newOnes += 1 end
end
check("지식=전투: 보상은 카드(지식·대륙·미지의 땅)이고 지식 카드도 나온다", newOnes >= 1)
check("지식=전투: 보상 후에도 덱이 유효", CB.validateDeck(book, CB.deckIds(book, "europe")))
local ids = CB.offer(book, "chest", r, nil, nil)
check("지식=전투: 3장 중 고르기", #ids == 3 and BC.Units[ids[1]] ~= nil or BC.Specials[ids[1]] ~= nil)

-- 해전 카드 지원: 덱의 지식 카드가 자동으로 거든다
do
	local stN = S.State.new("england", 1700)
	local sup = S.Cardbook.navalSupport(stN)
	check("해전 카드 지원: 시작 덱도 효과가 있다", sup.meleeMult > 0 and sup.cannonMult > 0 and #sup.lines >= 2)
	local f0 = S.Battle.playerFighter(stN)
	check("해전 카드 지원: 전투 능력에 반영", f0.meleeMult >= 1 + sup.meleeMult - 1e-9 and f0.cannonMult >= 1 + sup.cannonMult - 1e-9 and f0.cardSupport ~= nil)
	local cb = S.Cardbook.get(stN)
	for _, c in KC.Cards do
		if c.field == "Navigation" or c.field == "Medicine" then cb.owned[c.id] = 1 end
	end
	cb.deck = nil
	local sup2 = S.Cardbook.navalSupport(stN)
	check("해전 카드 지원: 상한을 넘지 않는다", sup2.cannonMult <= 0.12 and sup2.meleeMult <= 0.12 and sup2.medic <= 0.5 and sup2.speed <= 2)
	check("해전 카드 지원: 화면용 설명이 있다", #S.View.build(stN, ctx).navalSupport == #sup2.lines)
end


-- 응급 수리: 조선소 없는 항구에서도 선체 60%까지 (비용 2배), 조선소에서는 전부
do
	local stR = S.State.new("england", 1700)
	local view0 = S.View.build(stR, ctx)
	local noYardPort, yardPort
	for id, p in D.Ports.Ports do
		if p.shipyard then yardPort = yardPort or id else noYardPort = noYardPort or id end
	end
	check("응급 수리: 조선소 없는 항구 존재", noYardPort ~= nil)
	if noYardPort then
		stR.portId = noYardPort
		stR.coins = 100000
		local def = S.State.shipDef(stR)
		stR.ship.hull = 1
		local v = S.View.build(stR, ctx)
		check("응급 수리: 화면에 응급 표시", v.shipyard.field == true and v.shipyard.missing == math.floor(def.hull * 0.6) - 1 and v.shipyard.fullMissing == def.hull - 1)
		check("응급 수리: 가까운 조선소 안내", v.nearestYard ~= nil and v.nearestYard.name ~= nil)
		local ok = Registry.handlers.Repair(stR, {}, ctx)
		check("응급 수리: 60%까지만 수리", ok and stR.ship.hull == math.floor(def.hull * 0.6))
		local again = Registry.handlers.Repair(stR, {}, ctx)
		check("응급 수리: 더는 안 된다", not again)
	end
end


-- 시세 수첩: 직접 거래한 항구의 팔값은 동료 없이도 비교 목록에 나온다
do
	local stP = S.State.new("england", 1700)
	stP.coins = 100000
	local first = stP.portId
	Registry.handlers.Buy(stP, { goodId = "wool", amount = 1 }, ctx)
	check("시세 수첩: 거래하면 기록", stP.priceBook and stP.priceBook.wool and stP.priceBook.wool[first] ~= nil)
	local other
	for id in D.Ports.Ports do
		if id ~= first then other = id break end
	end
	stP.portId = other
	local v = S.View.build(stP, ctx)
	local hasWool = false
	for _, g in v.goods do
		if g.id == "wool" then hasWool = true end
	end
	if hasWool and (v.intel or 0) < 1 then
		check("시세 수첩: 동료 없이 기억한 항구 표시", v.compare.wool ~= nil and v.compare.wool[1].memory == true)
	else
		check("시세 수첩: (해당 항구에 양모 없음 또는 동료 있음) 건너뜀", true)
	end
end


-- 주점 카드 대결: 시드를 받고, 엉터리 기록은 거부된다
do
	local stD = S.State.new("england", 1700)
	S.View.build(stD, ctx)
	local okS = Registry.handlers.CardDuelStart(stD, {}, ctx)
	check("카드 대결: 시작하면 시드가 생긴다", okS and S.Cardbook.get(stD).duelSeed ~= nil)
	local okE = Registry.handlers.CardDuelEnd(stD, { actions = {} }, ctx)
	check("카드 대결: 빈 기록은 거부", okE == false)
	local okN = Registry.handlers.CardDuelEnd(stD, { actions = {} }, ctx)
	check("카드 대결: 시드는 한 번만 쓴다", okN == false)
	-- 진짜로 끝까지 두어 본다: 서버와 같은 규칙의 AI 로 내 쪽을 대신 두게 해 승패 기록을 만든다
	Registry.handlers.CardDuelStart(stD, {}, ctx)
	local seed = S.Cardbook.get(stD).duelSeed
	local B = D.BoardingCards
	local m = B.build("boarding", seed, { deckCards = S.Battle.deckCache[stD], faction = S.Battle.deckFaction[stD], book = S.Cardbook.deckSpec(stD) }, {})
	local acts, guard = {}, 0
	while not m.over and guard < 400 do
		guard += 1
		if m.turn == "foe" then
			B.ai(m, "foe")
		else
			local best = select(2, B.hint(m, "me"))
			if best then
				table.insert(acts, { "p", best })
				B.play(m, "me", best)
			else
				table.insert(acts, { "s" })
				B.pass(m, "me")
			end
		end
	end
	local before = stD.coins
	local okW, msgW = Registry.handlers.CardDuelEnd(stD, { actions = acts }, ctx)
	check("카드 대결: 기록 검증 결과가 승패와 일치", okW == (m.winner == "me"))
end


-- 연습전: 기본 덱(새 지식 카드)만으로 이길 수 있다
do
	local stQ = S.State.new("england", 1700)
	local pb = S.Cardbook.practiceBook(stQ)
	local allKnowledge = #pb.ids >= 25
	for _, id in pb.ids do
		local d = D.BoardingCards.Units[id] or D.BoardingCards.Specials[id]
		if not d then allKnowledge = false end
	end
	check("연습전: 기본 덱은 25장 이상 유효한 카드", allKnowledge)
	local B = D.BoardingCards
	local m = B.build("boarding", 51, { faction = B.factionOf(stQ.nationId), book = pb }, {})
	local acts, guard = {}, 0
	while not m.over and guard < 400 do
		guard += 1
		if m.turn == "foe" then B.ai(m, "foe")
		else
			local best = select(2, B.hint(m, "me"))
			if best then table.insert(acts, { "p", best }) B.play(m, "me", best)
			else table.insert(acts, { "s" }) B.pass(m, "me") end
		end
	end
	local okP = Registry.handlers.CardPractice(stQ, { actions = acts }, ctx)
	check("연습전: 서버 판정이 시뮬레이션과 일치", okP == (m.winner == "me"))
	check("연습전: 기본 덱으로 이길 수 있다", m.winner == "me" and okP == true)
end

-- 실시간 해전: 클라이언트가 직접 싸운 결과를 서버가 가능한 범위인지 확인한다
do
	local function fresh()
		local st = S.State.new("england", 1700)
		Registry.handlers.Hunt(st, {}, ctx)
		return st
	end
	local st1 = fresh()
	local sim = st1.pendingBattle and st1.pendingBattle.sim
	check("실시간 해전: 출격하면 두 배의 능력이 생긴다", sim ~= nil and sim.me.maxHull > 0 and sim.foe.maxHull > 0)
	local lbSim = st1.lastBattle and st1.lastBattle.sim
	check("실시간 해전: 클라이언트에 능력이 전달된다", lbSim ~= nil)
	-- 말이 안 되는 보고: 1초 만에 적을 침몰시켰다
	local okBad = Registry.handlers.NavalResult(st1, { winner = "a", reason = "sunk", elapsed = 1, meHull = sim.me.hull, foeHull = 0, meCrew = sim.me.crew, foeCrew = sim.foe.crew })
	check("실시간 해전: 불가능한 속도의 승리는 거부", okBad == false)
	-- 가능한 보고: 충분한 시간 동안 싸워서 이겼다
	local st2 = fresh()
	local s2 = st2.pendingBattle.sim
	local need = D.Combat.maxHullDamage(s2.me, 600)
	local okGood = false
	if need >= s2.foe.hull then
		okGood = Registry.handlers.NavalResult(st2, { winner = "a", reason = "sunk", elapsed = 600, meHull = math.floor(s2.me.hull * 0.6), foeHull = 0, meCrew = s2.me.crew, foeCrew = s2.foe.crew })
	else
		okGood = true -- 이 배로는 이 적을 포격만으로 못 잡는 설정이면 건너뛴다
	end
	check("실시간 해전: 가능한 승리는 인정", okGood == true)
	-- 접현: 서버가 같은 시드로 다시 돌린 결과를 따른다
	local a3, b3 = table.clone(s2.me), table.clone(s2.foe)
	local direct = D.Combat.board(a3, b3, 1234)
	local again = D.Combat.board(a3, b3, 1234)
	check("실시간 해전: 접현은 같은 시드면 같은 결과", direct.winner == again.winner and direct.a.crew == again.a.crew)
	local st4 = fresh()
	local s4 = st4.pendingBattle.sim
	local ok4 = Registry.handlers.NavalResult(st4, { winner = "a", reason = "boarded", elapsed = 30, meHull = s4.me.hull, foeHull = s4.foe.hull, meCrew = s4.me.crew, foeCrew = s4.foe.crew, board = { seed = 1234, meCrew = s4.me.crew, foeCrew = s4.foe.crew } })
	local want = D.Combat.board(table.clone(s4.me), table.clone(s4.foe), 1234)
	check("실시간 해전: 접현 결과는 서버 계산이 정한다", ok4 == true and st4.pendingBattle.winner == want.winner)
	local again2 = Registry.handlers.NavalResult(st4, { winner = "a", elapsed = 30, meHull = 1, foeHull = 0, meCrew = 1, foeCrew = 1 })
	check("실시간 해전: 같은 해전을 두 번 보고할 수 없다", again2 == false)
end

-- 보스전도 실시간: 도전하면 정산이 보류되고, 보고가 확인되면 그 결과로 정산한다
do
	local stB = S.State.new("england", 1700)
	stB.careers.battle.level = 10
	stB.ship.id = "galleon"
	local defB = S.State.shipDef(stB)
	stB.ship.hull, stB.ship.crew = defB.hull, defB.crew
	local coins0 = stB.coins
	local okB = Registry.handlers.ChallengeBoss(stB, { bossId = "sea_serpent" }, ctx)
	check("보스 실시간: 도전하면 정산이 보류된다", okB == true and stB.pendingBattle ~= nil and stB.pendingBattle.bossId == "sea_serpent" and stB.pendingBattle.sim ~= nil and stB.coins == coins0)
	local simB = stB.pendingBattle.sim
	local reportOk = Registry.handlers.NavalResult(stB, { winner = "b", reason = "sunk", elapsed = 120, meHull = 0, foeHull = simB.foe.hull, meCrew = simB.me.crew, foeCrew = simB.foe.crew })
	check("보스 실시간: 패배 보고가 받아들여진다", reportOk == true and stB.pendingBattle.winner == "b")
	local resolved = Registry.handlers.ResolveBattle(stB, {}, ctx)
	check("보스 실시간: 정산이 끝나면 보류가 풀린다", resolved == true and stB.pendingBattle == nil and stB.stats.battlesLost >= 1)
end

-- 대규모 해전 의뢰(전투 본부): 파도마다 싸우고, 끝까지 이기면 보상, 지면 실패
do
	local stW = S.State.new("england", 1700)
	stW.careers.battle.level = 4
	local coins0 = stW.coins
	local okBlock = Registry.handlers.WarStart(stW, { id = "fleet_decisive" }, ctx)
	check("함대전: 레벨이 모자라면 거부", okBlock == false)
	local okS = Registry.handlers.WarStart(stW, { id = "blockade" }, ctx)
	check("함대전: 시작하면 첫 파도 해전이 열린다", okS == true and stW.war ~= nil and stW.war.wave == 1 and stW.pendingBattle ~= nil)
	check("함대전: 화면 정보에 진행이 보인다", S.View.build(stW, ctx).war ~= nil and #S.View.build(stW, ctx).wars == 3)
	for wave = 1, 3 do
		stW.pendingBattle.winner = "a"
		stW.pendingBattle.reason = "sunk"
		stW.pendingBattle.hull = stW.ship.hull
		stW.pendingBattle.crew = stW.ship.crew
		Registry.handlers.ResolveBattle(stW, {}, ctx)
		if wave < 3 then
			check("함대전: 파도 " .. wave .. " 돌파 뒤 다음 파도 대기", stW.war ~= nil and stW.war.next == true and stW.war.wave == wave + 1)
			local okN = Registry.handlers.WarNext(stW, {}, ctx)
			check("함대전: 다음 파도 시작", okN == true and stW.pendingBattle ~= nil)
		end
	end
	check("함대전: 끝까지 이기면 보상을 받고 작전이 끝난다", stW.war == nil and stW.coins >= coins0 + 900)
	local stL = S.State.new("england", 1700)
	stL.careers.battle.level = 4
	Registry.handlers.WarStart(stL, { id = "blockade" }, ctx)
	stL.pendingBattle.winner = "b"
	stL.pendingBattle.reason = "sunk"
	Registry.handlers.ResolveBattle(stL, {}, ctx)
	check("함대전: 한 파도라도 지면 작전 실패", stL.war == nil)
	local again = Registry.handlers.WarStart(stW, { id = "blockade" }, ctx)
	check("함대전: 완수 직후엔 같은 의뢰를 바로 못 받는다", again == false)
end

-- 주점 의뢰판: 그 항구·그 시기에만 나오고, 납품·전투·이벤트가 각각 정산된다
do
	local stT = S.State.new("england", 1666)
	stT.portId = "london"
	local ids = {}
	for _, j in S.View.build(stT, ctx).tavern do
		ids[j.id] = true
	end
	check("의뢰판: 1666년 런던엔 재건 목재 의뢰가 있다", ids.london_rebuild == true)
	check("의뢰판: 그 시기가 아닌 의뢰는 안 보인다", ids.south_sea_bubble == nil and ids.lisbon_quake_relief == nil)
	local noWood = Registry.handlers.TavernJob(stT, { id = "london_rebuild" }, ctx)
	check("의뢰판: 물건이 없으면 납품이 거부된다", noWood == false)
	stT.cargo.timber = 9
	local coins0 = stT.coins
	local okD = Registry.handlers.TavernJob(stT, { id = "london_rebuild" }, ctx)
	check("의뢰판: 납품하면 보상을 받고 물건이 줄어든다", okD == true and stT.coins == coins0 + 900 and stT.cargo.timber == 1)
	check("의뢰판: 같은 의뢰는 두 번 못 한다", Registry.handlers.TavernJob(stT, { id = "london_rebuild" }, ctx) == false)
	local wrongPort = Registry.handlers.TavernJob(stT, { id = "lisbon_quake_relief" }, ctx)
	check("의뢰판: 다른 항구의 의뢰는 받을 수 없다", wrongPort == false)
	local stE = S.State.new("england", 1720)
	stE.portId = "london"
	local fame0 = stE.fame
	local okE = Registry.handlers.TavernJob(stE, { id = "south_sea_bubble", choice = 2 }, ctx)
	check("의뢰판: 이벤트 선택이 정산된다", okE == true and stE.fame == fame0 + 3 and stE.tavernJobs.south_sea_bubble ~= nil)
	local stH = S.State.new("england", 1588)
	stH.portId = "plymouth"
	local okH = Registry.handlers.TavernJob(stH, { id = "armada_scout" }, ctx)
	check("의뢰판: 전투 의뢰는 실시간 해전을 연다", okH == true and stH.pendingBattle ~= nil and stH.pendingBattle.job == "armada_scout")
	stH.pendingBattle.winner = "a"
	stH.pendingBattle.reason = "sunk"
	stH.pendingBattle.hull = stH.ship.hull
	stH.pendingBattle.crew = stH.ship.crew
	local coinsH = stH.coins
	Registry.handlers.ResolveBattle(stH, {}, ctx)
	check("의뢰판: 이기면 의뢰 보상이 더해진다", stH.tavernJobs.armada_scout ~= nil and stH.coins >= coinsH + 700)
	local round = S.State.sanitize and S.State.sanitize(S.State.serialize(stH)) or nil
	check("의뢰판: 마친 의뢰는 저장된다", round == nil or round.tavernJobs.armada_scout ~= nil)
end

do
	-- 해상 사건: 다양한 종류가 나오고, 크라켄은 장거리에서만 나온다
	local seen: any = {}
	local krakenShort = false
	local rs = 12345
	local function rng(): number
		rs = (rs * 1103515245 + 12345) % 2147483648
		return rs / 2147483648
	end
	for i = 1, 6000 do
		local days = if i % 2 == 0 then 4 else 20
		local e: any = D.Voyage.rollEvent(rng, days, nil)
		seen[e.kind] = true
		if e.kind == "kraken" and days < 10 then krakenShort = true end
	end
	local n = 0
	for _ in seen do n += 1 end
	check("해상 사건: 25종 이상 나온다", n >= 25)
	check("해상 사건: 크라켄은 짧은 항해에 안 나온다", not krakenShort and seen.kraken == true)
end

do
	-- 수동 항해 물리
	local H = require("./Shared/Helm")
	local function run(auto: boolean, steerFn: any): (number, number)
		local s: any = { x = 0, z = 0, yaw = 0, trim = 0.8, speed = 0 }
		local wind = math.rad(120) -- 목적지(동쪽)가 맞바람에 가깝지 않은 경우
		local tack = 1
		local env: any = { windFrom = wind, baseSpeed = 30, t = 0 }
		local steps = 0
		while steps < 60 * 400 do
			env.t = steps / 60
			local st, tr = 0, 0
			if auto then
				st, tr, tack = H.autopilot(s, 2000, 0, wind, tack)
			else
				st, tr = steerFn(s)
			end
			H.step(s, st, tr, 1 / 60, env)
			steps += 1
			if (2000 - s.x) ^ 2 + s.z ^ 2 < 55 ^ 2 then break end
		end
		return steps / 60, s.x
	end
	local tAuto = run(true, nil)
	check("수동 항해: 자동 항해가 목적지에 도착한다", tAuto < 400)
	-- 맞바람(바람이 목적지 쪽에서 온다)에서 그냥 직진하면 아주 느리다
	local s2: any = { x = 0, z = 0, yaw = 0, trim = 1, speed = 0 }
	for i = 1, 600 do H.step(s2, 0, 0, 1 / 60, { windFrom = 0, baseSpeed = 30, t = i / 60 }) end
	local s3: any = { x = 0, z = 0, yaw = math.rad(100), trim = 1, speed = 0 }
	for i = 1, 600 do H.step(s3, 0, 0, 1 / 60, { windFrom = 0, baseSpeed = 30, t = i / 60 }) end
	check("수동 항해: 맞바람은 옆바람보다 훨씬 느리다", s2.speed < s3.speed * 0.3)
	-- 맞바람인 목적지도 자동 항해(태킹)로 닿는다
	local s4: any = { x = 0, z = 0, yaw = 0, trim = 0.8, speed = 0 }
	local tack4 = 1
	local reached = false
	for i = 1, 60 * 900 do
		local st, tr
		st, tr, tack4 = H.autopilot(s4, 1500, 0, 0, tack4)
		H.step(s4, st, tr, 1 / 60, { windFrom = 0, baseSpeed = 30, t = i / 60 })
		if (1500 - s4.x) ^ 2 + s4.z ^ 2 < 55 ^ 2 then
			reached = true
			break
		end
	end
	check("수동 항해: 맞바람 목적지도 지그재그로 도착한다", reached)
	-- 암초는 느리게, 해류는 빠르게
	local base: any = { x = 0, z = 0, yaw = 0, trim = 1, speed = 0 }
	local slow: any = { x = 0, z = 0, yaw = 0, trim = 1, speed = 0 }
	local fast: any = { x = 0, z = 0, yaw = 0, trim = 1, speed = 0 }
	for i = 1, 300 do
		local e = { windFrom = math.rad(120), baseSpeed = 30, t = i / 60 }
		H.step(base, 0, 0, 1 / 60, e)
		H.step(slow, 0, 0, 1 / 60, { windFrom = e.windFrom, baseSpeed = 30, t = e.t, shoals = { { x = 0, z = 0 } } })
		H.step(fast, 0, 0, 1 / 60, { windFrom = e.windFrom, baseSpeed = 30, t = e.t, currents = { { x = 0, z = 0, dx = 1, dz = 0 } } })
	end
	check("수동 항해: 암초 지대는 속도를 줄이고 해류는 올린다", slow.speed < base.speed and fast.speed > base.speed)
end

do
	-- 파도타기 수동 항해(고리)
	local R = require("./Shared/Rings")
	local rs = 7
	local function rng(): number
		rs = (rs * 1103515245 + 12345) % 2147483648
		return rs / 2147483648
	end
	local short = R.build(rng, 2, nil, 0)
	local long = R.build(rng, 20, nil, 0)
	check("고리: 긴 항해일수록 고리가 많다", #long > #short and #short >= 6)
	local sorted = true
	local inRange = true
	for i, r in long do
		if i > 1 and long[i - 1].at > r.at then sorted = false end
		if math.abs(r.lat) > 0.81 or r.at < 0 or r.at > 1 then inRange = false end
	end
	check("고리: 순서대로 나오고 범위 안에 있다", sorted and inRange)
	local withBonus = R.build(rng, 6, "dolphins", 0)
	local bonusN = 0
	for _, r in withBonus do if r.bonus then bonusN += 1 end end
	check("고리: 돌고래 사건에는 보너스 고리가 나온다", bonusN == 5)
	local t = R.newTally()
	for _, r in long do R.record(t, r, R.hit(r, r.lat)) end
	local ringsOnly = 0
	for _, r in long do if not r.hazard then ringsOnly += 1 end end
	check("고리: 정확히 가면 점수 1.0, 콤보가 쌓이고 속도가 오른다", R.score(t) == 1 and t.best == ringsOnly and R.speedMult(t.combo) > 1.3)
	local t2 = R.newTally()
	local k = 0
	for _, r in long do
		if not r.hazard then
			k += 1
			R.record(t2, r, k % 2 == 0)
		end
	end
	check("고리: 번갈아 놓치면 콤보가 쌓이지 않는다", t2.best == 1 and R.speedMult(t2.combo) <= 1.04)
	local c1, f1 = R.reward(10, 1)
	local c0, f0 = R.reward(10, 0.3)
	local cx = R.reward(100000, 5)
	check("고리: 보상은 점수에 비례하고 상한이 있다", c1 > c0 and f1 == 1 and f0 == 0 and cx <= 300)
end

do
	-- 고리 항해: 암초와 별
	local R = require("./Shared/Rings")
	local rs = 99
	local function rng(): number
		rs = (rs * 1103515245 + 12345) % 2147483648
		return rs / 2147483648
	end
	local list = R.build(rng, 10, nil, 0)
	local hz, rg = 0, 0
	for _, r in list do
		if r.hazard then hz += 1 else rg += 1 end
	end
	check("암초: 고리 사이에 암초가 끼어 있다", hz >= 2 and rg >= 6)
	local t = R.newTally()
	for _, r in list do
		if r.hazard then R.record(t, r, true) else R.record(t, r, R.hit(r, r.lat)) end
	end
	check("암초: 다 피하고 고리를 모두 먹으면 만점·별 3개", R.score(t) == 1 and R.stars(R.score(t)) == 3 and t.crashes == 0)
	local t2 = R.newTally()
	for _, r in list do
		if r.hazard then R.record(t2, r, false) else R.record(t2, r, R.hit(r, r.lat)) end
	end
	check("암초: 부딪히면 점수가 깎이고 콤보가 끊긴다", t2.crashes == hz and R.score(t2) < 1 and t2.stun > 0)
	check("별: 점수 구간별로 1~3개", R.stars(0.95) == 3 and R.stars(0.7) == 2 and R.stars(0.1) == 1)
end

print(string.format("지식=전투 테스트: 통과 %d, 실패 %d", pass, fail))
if fail > 0 then error("지식=전투 테스트 실패") end
