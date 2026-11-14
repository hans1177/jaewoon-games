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
check("지식=전투: 보상은 모두 지식 카드", newOnes == 20)
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
	local allKnowledge = #pb.ids >= 18
	for _, id in pb.ids do
		local d = D.BoardingCards.Units[id] or D.BoardingCards.Specials[id]
		if not (d and d.knowledge) then allKnowledge = false end
	end
	check("연습전: 기본 덱은 모두 새 지식 카드", allKnowledge)
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

print(string.format("지식=전투 테스트: 통과 %d, 실패 %d", pass, fail))
if fail > 0 then error("지식=전투 테스트 실패") end
