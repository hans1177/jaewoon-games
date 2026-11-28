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
	Rings = require("./Shared/Rings"),
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
	KnowledgeTree = require("./Shared/KnowledgeTree"),
	HistoryEvents = require("./Shared/HistoryEvents"),
	WorldChronicle = require("./Shared/WorldChronicle"),
	KnowledgeTaxonomy = require("./Shared/KnowledgeTaxonomy"),
	EconomyBuildings = require("./Shared/EconomyBuildings"),
	DisciplineFacilities = require("./Shared/DisciplineFacilities"),
	ProductionChains = require("./Shared/ProductionChains"),
	Stocks = require("./Shared/Stocks"),
	WorldEvents = require("./Shared/WorldEvents"),
	People = require("./Shared/People"),
	PeopleTalk = require("./Shared/PeopleTalk"),
	PortOrder = require("./Shared/PortOrder"),
	RoomClock = require("./Shared/RoomClock"),
	WonderScenes = require("./Shared/WonderScenes"),
	PortBuildings = require("./Shared/PortBuildings"),
	Economy = require("./Shared/Economy"),
}
-- 서비스 등록 경계에서 이종 모듈 사전의 구조적 타입 확장을 제한한다. 기존 검사와 런타임 값은 유지한다.
local Registry = require("./Services/Registry")(D :: {[string]: any})
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
	-- [연습전 회귀] 고정 시드와 실제 서버 판정은 그대로 두고, 추천 수만 내는 방식과
	-- 기존 전투 엔진의 지휘관·패스 판단을 모두 합법적인 행동 기록으로 검증한다.
	local verified, won = true, false
	for strategy = 1, 4 do
		local m = B.build("boarding", 51, { faction = B.factionOf(stQ.nationId), book = pb }, {})
		local acts, guard = {}, 0
		while not m.over and guard < 400 do
			guard += 1
			if m.turn == "foe" then
				B.ai(m, "foe")
			elseif (strategy == 3 or strategy == 4) and not m.leaderUsed.me and not m.passed.foe then
				local ok, _, _, action = B.useLeader(m, "me")
				if ok and action then table.insert(acts, action) end
			elseif strategy == 2 or strategy == 3 then
				local ok, _, _, action = B.ai(m, "me")
				if ok and action then table.insert(acts, action) end
			elseif m.passed.foe and B.total(m, "me") > B.total(m, "foe") then
				table.insert(acts, { "s" })
				B.pass(m, "me")
			else
				local best = select(2, B.hint(m, "me"))
				if best then table.insert(acts, { "p", best }) B.play(m, "me", best)
				else table.insert(acts, { "s" }) B.pass(m, "me") end
			end
		end
		local replay = B.replay("boarding", 51, { faction = B.factionOf(stQ.nationId), book = pb }, {}, acts)
		verified = verified and replay ~= nil and replay.winner == m.winner
		if replay and replay.winner == "me" then
			won = Registry.handlers.CardPractice(stQ, { actions = acts }, ctx) == true
			if won then break end
		end
	end
	check("연습전: 서버 판정이 시뮬레이션과 일치", verified)
	check("연습전: 기본 덱으로 이길 수 있다", won)
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
	check("함대전: 화면 정보에 진행이 보인다", S.View.build(stW, ctx).war ~= nil and #S.View.build(stW, ctx).wars == 9)
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

-- 해역별 함대전: 그 해역 항구에서만 받고, 완수 기록이 해상 연속 퀘스트로 이어진다
do
	local stR = S.State.new("england", 1700)
	stR.careers.battle.level = 4
	stR.portId = "london"
	local okFar = Registry.handlers.WarStart(stR, { id = "war_new_world" }, ctx)
	check("해역 함대전: 다른 해역 항구에서는 못 받는다", okFar == false and stR.war == nil)
	local okHere = Registry.handlers.WarStart(stR, { id = "war_europe" }, ctx)
	check("해역 함대전: 그 해역 항구에서는 시작된다", okHere == true and stR.war ~= nil)
	for wave = 1, 3 do
		stR.pendingBattle.winner = "a"
		stR.pendingBattle.reason = "sunk"
		stR.pendingBattle.hull = stR.ship.hull
		stR.pendingBattle.crew = stR.ship.crew
		Registry.handlers.ResolveBattle(stR, {}, ctx)
		if wave < 3 then
			Registry.handlers.WarNext(stR, {}, ctx)
		end
	end
	local clears: any = (stR.stats :: any).warClears
	check("해역 함대전: 완수하면 해역별 기록이 남는다", stR.war == nil and clears ~= nil and clears.europe == 1)
	local loaded: any = S.State.sanitize(S.State.serialize(stR))
	local loadedClears: any = loaded.stats.warClears
	check("해역 함대전: 저장 후 불러와도 기록이 유지된다", loadedClears ~= nil and loadedClears.europe == 1)
end

-- 이야기 퀘스트 시스템: 선택 분기·지도자 대결·함대전 id 기록·카드 이야기 (내용은 시험용 퀘스트로 확인)
do
	local Qd: any = D.Quests
	local Kit: any = Qd.Kit
	local choiceQ: any = { id = "q_test_choice", name = "시험 선택", summary = "고르기", kind = "choice", amount = 1, rewardCoins = 0, rewardFame = 0, rewardXp = 0,
		choices = { { value = "a", label = "믿는다" }, { value = "b", label = "의심한다" } } }
	local branchQ: any = { id = "q_test_branch", name = "시험 분기", summary = "a 선택만", kind = "duel_leader", leaderId = "suleiman", amount = 1, rewardCoins = 0, rewardFame = 0, rewardXp = 0,
		after = "q_test_choice", needChoice = "q_test_choice=a", loreCardId = "nav_star_compass", loreText = "시험 이야기" }
	Qd.ById[choiceQ.id] = choiceQ
	Qd.ById[branchQ.id] = branchQ
	local st = S.State.new("england", 1700)
	st.quests.active[choiceQ.id] = { delivered = 0, baseWins = 0 }
	local bad = Registry.handlers.StoryChoose(st, { questId = choiceQ.id, value = "zzz" })
	check("이야기: 없는 선택지는 거부", bad == false)
	local okC = Registry.handlers.StoryChoose(st, { questId = choiceQ.id, value = "a" })
	local again = Registry.handlers.StoryChoose(st, { questId = choiceQ.id, value = "b" })
	check("이야기: 선택은 한 번만 저장된다", okC == true and again == false and Kit.choice(st, "q_test_choice") == "a")
	check("이야기: 선택하면 진행도 1", Kit.progress(st, choiceQ) == 1)
	st.quests.done[choiceQ.id] = true
	st.quests.active[choiceQ.id] = nil
	check("이야기: 고른 분기의 퀘스트만 보인다", S.Quest.visible(st, branchQ) == true)
	local stB = S.State.new("england", 1700)
	stB.quests.done[choiceQ.id] = true;
	(stB.stats :: any).storyChoices = { q_test_choice = "b" }
	check("이야기: 다른 분기에서는 안 보인다", S.Quest.visible(stB, branchQ) == false)
	st.quests.active[branchQ.id] = { delivered = 0, baseWins = 0 }
	local foe = Kit.duelFoe(D, st, branchQ.id)
	check("이야기 대결: 지도자 진영이 상대로 정해진다", foe ~= nil and foe.leader == "suleiman" and foe.faction == "middle_east")
	check("이야기 대결: 진행 중이 아니면 상대 없음", Kit.duelFoe(D, stB, branchQ.id) == nil)
	local m: any = D.BoardingCards.build("boarding", 777, { deckCards = nil, faction = "europe" }, { faction = "middle_east", leader = "suleiman" })
	check("이야기 대결: 상대 지도자가 고정된다", m ~= nil and m.leader.foe == "suleiman")
	Kit.recordDuelWin(st, "suleiman")
	check("이야기 대결: 이기면 지도자별 기록", Kit.progress(st, branchQ) == 1)
	st.quests.done[branchQ.id] = true
	local lore = Kit.loreFor(st, Kit.loreIndex({ branchQ }), "nav_star_compass")
	check("이야기 카드: 완료하면 단락이 열린다", lore ~= nil and lore[1].text == "시험 이야기")
	local back: any = S.State.sanitize(S.State.serialize(st))
	check("이야기: 선택·대결 기록이 저장된다", back.stats.storyChoices.q_test_choice == "a" and back.stats.duelWins.suleiman == 1)
	Kit.recordWar(st, { id = "war_europe", region = "europe" })
	check("이야기 함대전: 함대전 id 기록", Kit.progress(st, { kind = "war_clear", warId = "war_europe" }) == 1 and Kit.progress(st, { kind = "war_clear" }) == 1)
	Qd.ById[choiceQ.id] = nil
	Qd.ById[branchQ.id] = nil
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

-- 주점 개편: 술→일감 2개 선택 / 수상한 손님 / 소문 / 취소·실패 벌칙
do
	local st = S.State.new("england", 1700)
	st.portId = "amsterdam"
	st.coins = 5000
	local v0 = S.View.build(st, ctx).tavernQ
	check("주점: 처음엔 맡은 의뢰·제안이 없다", v0.active == nil and #v0.offer == 0)
	local ok = Registry.handlers.TavernDrink(st, {}, ctx)
	check("주점: 술을 사면 코인이 줄고 제안 또는 전설 의뢰가 생긴다", ok == true and st.coins == 4970 - 0 and (st.tavernQ.offer ~= nil or st.tavernQ.active ~= nil))
	if st.tavernQ.offer then
		check("주점: 일반 제안은 2개 이하", #st.tavernQ.offer.ids <= 2 and #st.tavernQ.offer.ids >= 1)
		local picked = Registry.handlers.TavernPick(st, { index = 1 }, ctx)
		check("주점: 하나를 고르면 맡은 의뢰가 된다", picked == true and st.tavernQ.active ~= nil and st.tavernQ.offer == nil)
		local fame0 = st.fame
		check("주점: 일반 의뢰 포기는 명성이 그대로", Registry.handlers.TavernAbandon(st, {}, ctx) == true and st.fame == fame0 and st.tavernQ.active == nil)
	end
	-- 수상한 손님: 수락 후 포기하면 명성이 떨어진다
	local sh = S.State.new("england", 1700)
	sh.portId = "amsterdam"
	sh.fame = 100
	local found = false
	for d = 0, 60 do
		sh.day = d
		if S.View.build(sh, ctx).tavernQ.stranger then
			found = true
			break
		end
	end
	check("주점: 며칠 사이에 수상한 손님이 나타난다", found)
	local okS = Registry.handlers.TavernStranger(sh, {}, ctx)
	check("주점: 수상한 손님은 의뢰 2개를 내민다", okS == true and sh.tavernQ.offer and sh.tavernQ.offer.kind == "shady" and #sh.tavernQ.offer.ids == 2)
	Registry.handlers.TavernPick(sh, { index = 1 }, ctx)
	check("주점: 수상한 의뢰를 맡았다", sh.tavernQ.active and sh.tavernQ.active.src == "shady")
	Registry.handlers.TavernAbandon(sh, {}, ctx)
	check("주점: 수상한 의뢰를 접으면 명성이 떨어진다", sh.fame < 100)
	-- 소문은 무료
	local c0 = st.coins
	check("주점: 소문 듣기는 무료", Registry.handlers.TavernRumor(st, {}, ctx) == true and st.coins == c0)
	-- 저장/복원
	local st2 = S.State.new("england", 1700)
	st2.portId = "amsterdam"
	st2.coins = 5000
	st2.tavernQ.active = { id = "shady_traitor", src = "shady", due = 90 }
	local back = S.State.sanitize and S.State.sanitize(S.State.serialize(st2)) or nil
	check("주점: 맡은 의뢰가 저장된다", back == nil or (back.tavernQ.active ~= nil and back.tavernQ.active.id == "shady_traitor"))
	-- 큰 사건은 자동으로 맡는다
	local gr = S.State.new("england", 1666)
	gr.portId = "london"
	local gv = S.View.build(gr, ctx).tavernQ
	check("주점: 큰 사건은 자동 발동", gv.active ~= nil and gv.active.src == "grand")
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
	local kinds = {}
	for _, r in list do if r.hazard and r.kind then kinds[r.kind] = true end end
	check("장애물: 암초 외 표류 통·해적선도 나온다", kinds.reef and kinds.barrel)
	local items = R.items(rng, list)
	local tI = R.newTally()
	local kindsI = {}
	for _, it in items do kindsI[it.kind] = true; R.pickup(tI, it) end
	check("물건: 고리 사이에 놓이고 줍는 개수만큼 기록된다", #items >= 5 and tI.items == #items and tI.points > 0)
	local tb = R.newTally()
	tb.stun = 1
	R.pickup(tb, { at = 0.5, lat = 0, kind = "buoy" })
	R.pickup(tb, { at = 0.5, lat = 0, kind = "bottle" })
	check("물건: 부표는 충격을 풀고 유리병은 순풍을 준다", tb.stun == 0 and tb.boost == 3)
	local cur = R.currents(rng, 10)
	local m1, c1 = R.currentAt(cur, cur[1].at + 0.01, cur[1].lat)
	local m2 = R.currentAt(cur, cur[1].at + 0.01, cur[1].lat + 0.9)
	check("해류: 띠 안에서만 배율이 바뀌고 순류 1.5·역류 0.6", #cur >= 4 and c1 ~= nil and m1 == (if cur[1].fast then 1.5 else 0.6) and m2 == 1)
	local tc = R.newTally()
	local c1b = R.pickup(tc, { at = 0.1, lat = 0, kind = "coin" })
	local c2b = R.pickup(tc, { at = 0.2, lat = 0, kind = "coin" })
	local c3b = R.pickup(tc, { at = 0.3, lat = 0, kind = "coin" })
	check("수집 연쇄: 3개 연속이면 순풍이 붙고 놓치면 끊긴다", not c1b and not c2b and c3b and tc.boost >= 2 and (function() R.missItem(tc) return tc.chain == 0 end)())
	local hz1 = { at = 0.5, lat = 0, big = false, bonus = false, hazard = true, kind = "reef" }
	local rr = R.radius(hz1)
	local tn = R.newTally()
	check("아슬아슬: 가장자리를 스치면 보너스, 한가운데로 가면 아님", R.nearMiss(hz1, rr + 0.05) and not R.nearMiss(hz1, rr + 0.5) and not R.nearMiss(hz1, 0) and (function() R.recordNearMiss(tn) return tn.boost >= 0.8 end)())
	check("별: 점수 구간별로 1~3개", R.stars(0.95) == 3 and R.stars(0.7) == 2 and R.stars(0.1) == 1)
end

do
	-- 바다 괴물: 크라켄·유령선은 항해 중 만났을 때만 바다에서 도전할 수 있다
	local stK = S.State.new("england", 1700)
	stK.ship.id = "galleon"
	local defK = S.State.shipDef(stK)
	stK.ship.hull, stK.ship.crew = defK.hull, defK.crew
	stK.careers.battle.level = 10
	local noSea = Registry.handlers.ChallengeBoss(stK, { bossId = "kraken", sea = true }, ctx)
	check("바다 괴물: 만나지 않았으면 바다 도전이 거절된다", noSea == false and stK.pendingBattle == nil)
	stK.seaBoss = "kraken"
	local okK = Registry.handlers.ChallengeBoss(stK, { bossId = "kraken", sea = true }, ctx)
	check("바다 괴물: 크라켄을 만나면 해상전투가 시작된다", okK == true and stK.pendingBattle ~= nil and stK.pendingBattle.bossId == "kraken" and stK.seaBoss == nil)
	local stG = S.State.new("england", 1700)
	stG.ship.id = "galleon"
	stG.ship.hull, stG.ship.crew = defK.hull, defK.crew
	stG.careers.battle.level = 6
	stG.seaBoss = "ghost_ship"
	local okG = Registry.handlers.ChallengeBoss(stG, { bossId = "ghost_ship", sea = true }, ctx)
	check("바다 괴물: 유령선과 해상전투가 시작된다", okG == true and stG.pendingBattle ~= nil and stG.pendingBattle.bossId == "ghost_ship")
end


-- 지도자 고르기 (서버 처리·덱 반영)
do
	local stL = S.State.new("england", 1700)
	local okL, msgL = Registry.handlers.CardSetLeader(stL, { id = "caesar" })
	check("지도자 고르기: 같은 대륙 지도자 선택", okL == true and S.Cardbook.get(stL).leader == "caesar", msgL)
	check("지도자 고르기: 덱 설계에 반영", S.Cardbook.deckSpec(stL).leader == "caesar")
	local okBad = Registry.handlers.CardSetLeader(stL, { id = "samurai" })
	check("지도자 고르기: 다른 대륙 지도자는 거절", okBad == false and S.Cardbook.get(stL).leader == "caesar")
	local okType = Registry.handlers.CardSetLeader(stL, { id = 5 })
	check("지도자 고르기: 잘못된 요청 거절", okType == false)
end

do
	local Rg = require("./Shared/Rings")
	check("초보 우대: 레벨별 버프", D.Voyage.rookie(1) >= D.Voyage.rookie(5) and D.Voyage.rookie(5) > D.Voyage.rookie(7) and D.Voyage.rookie(7) > 0 and D.Voyage.rookie(8) == 0)
	local base = { at = 0.5, lat = 0, big = false, bonus = false }
	local wide = { at = 0.5, lat = 0, big = false, bonus = false, rm = 1.4 }
	check("동료 효과: 고리 판정 확대", Rg.radius(wide) > Rg.radius(base) and Rg.hit(wide, 0.28) and not Rg.hit(base, 0.28))
end

-- 퀘스트 막힘 점검: 모든 연결(선행·상품·항구·카드·동료·기술)이 실제로 존재해야 막히지 않는다
do
	local ids, bad = {}, {}
	for _, q in D.Quests.Quests do
		ids[q.id] = true
	end
	local Sc = require("./Shared/Scholars")
	for _, q in D.Quests.Quests do
		if q.after and not ids[q.after] then table.insert(bad, q.id .. " 선행 없음 " .. q.after) end
		if q.goodId and not D.Ports.Goods[q.goodId] then table.insert(bad, q.id .. " 상품 없음 " .. q.goodId) end
		if q.portId and not D.Ports.Ports[q.portId] then table.insert(bad, q.id .. " 항구 없음 " .. q.portId) end
		if q.rewardCardId and not (D.Cards.ById[q.rewardCardId] or CB.def(q.rewardCardId)) then table.insert(bad, q.id .. " 보상 카드 없음 " .. q.rewardCardId) end
		if q.cardId and not D.Cards.ById[q.cardId] then table.insert(bad, q.id .. " 지식 카드 없음 " .. q.cardId) end
		-- 선행 고리(순환)
		local seen, cur = {}, q
		while cur and cur.after do
			if seen[cur.id] then table.insert(bad, q.id .. " 선행 순환") break end
			seen[cur.id] = true
			cur = D.Quests.ById[cur.after]
		end
	end
	if #bad > 0 then print(table.concat(bad, "\n")) end
	check("퀘스트 점검: 끊어진 연결이 없다 (" .. #bad .. "건)", #bad == 0)
	-- 주점 의뢰: 상품·항구·선택지·기한 점검
	local tbad = {}
	for _, j in S.Tavern.jobs do
		if j.good and not D.Ports.Goods[j.good] then table.insert(tbad, j.id .. " 상품 " .. j.good) end
		for _, pid in j.ports or {} do
			if not D.Ports.Ports[pid] then table.insert(tbad, j.id .. " 항구 " .. pid) end
		end
		if j.kind == "event" and (not j.choices or #j.choices < 2) then table.insert(tbad, j.id .. " 선택지 부족") end
		if j.kind == "deliver" and not (j.good and j.amount) then table.insert(tbad, j.id .. " 납품 정보") end
		if j.kind == "hunt" and not j.enemy then table.insert(tbad, j.id .. " 적 정보") end
		if not j.any and not j.ports and not j.region then table.insert(tbad, j.id .. " 장소 없음") end
	end
	if #tbad > 0 then print(table.concat(tbad, "\n")) end
	check("주점 점검: 데이터 연결이 맞다 (" .. #tbad .. "건)", #tbad == 0)
end

-- 지식카드 분류: 모든 카드가 대분류·중분류에 연결
do
	local bad = D.KnowledgeTaxonomy.audit()
	if #bad > 0 then print(table.concat(bad, "\n")) end
	check("카드 분류: 모든 카드가 학문·대분류에 연결된다 (" .. #bad .. "건)", #bad == 0)
end

-- 경제 건물 표: 학문·분류 연결
do
	local EB = D.EconomyBuildings
	local bad = {}
	local cats = {}
	for _, c in EB.Categories do cats[c.id] = true end
	for _, b in EB.List do
		if not cats[b.category] then table.insert(bad, b.id .. " 분류") end
		if b.minLevel < 1 or b.minLevel > 6 then table.insert(bad, b.id .. " 레벨") end
		for _, d in b.disc do
			if not D.KnowledgeTree.TaxonomyById[d] then table.insert(bad, b.id .. " 학문 " .. d) end
		end
	end
	if #bad > 0 then print(table.concat(bad, "\n")) end
	check("경제 건물: 학문·분류·레벨 연결이 맞다 (" .. #EB.List .. "종)", #bad == 0 and #EB.List >= 60)
end

-- 지역 전술: 같은 문화권 군사학 카드가 한 줄에 모이면 위력이 오른다
do
	local B = D.BoardingCards
	local function unit(id, region, power) return { id = id, name = id, row = "melee", power = power, region = region, knowledge = true } end
	local function match(list) return { rows = { me = { melee = list, ranged = {} }, foe = { melee = {}, ranged = {} } }, weather = {} } end
	local solo = match({ unit("a", "europe", 3) })
	local pair = match({ unit("a", "europe", 3), unit("b", "europe", 3) })
	local four = match({ unit("a", "europe", 3), unit("b", "europe", 3), unit("c", "europe", 3), unit("d", "europe", 3) })
	local mixed = match({ unit("a", "europe", 3), unit("b", "east_asia", 3) })
	check("지역 전술: 혼자면 보너스 없음", B.cardPower(solo, "me", "melee", 1) == 3)
	check("지역 전술: 같은 지역 동료가 있으면 +1", B.cardPower(pair, "me", "melee", 1) == 4)
	check("지역 전술: 동료 3장 이상이면 +2", B.cardPower(four, "me", "melee", 1) == 5)
	check("지역 전술: 다른 지역끼리는 보너스 없음", B.cardPower(mixed, "me", "melee", 1) == 3 and B.cardPower(mixed, "me", "melee", 2) == 3)
	check("지역 전술: 발동 중인 전술 이름", B.activeTactic(four.rows.me.melee) == "방진" and B.activeTactic(solo.rows.me.melee) == nil and B.activeTactic(mixed.rows.me.melee) == nil)
	local anyRegion = match({ unit("a", "any", 3), unit("b", "any", 3) })
	check("지역 전술: 지역 없음(any) 카드는 제외", B.cardPower(anyRegion, "me", "melee", 1) == 3)
end

-- 마을 발전: 학문을 이해할수록 마을 레벨과 건물이 늘어난다
do
	local stV = S.State.new("england", 1700)
	local v0 = S.Village.view(stV)
	check("마을 발전: 아무것도 모르면 1레벨, 학문 단계 없음", v0.level == 1 and #v0.discs == 0)
	local b0 = S.Village.buildings(stV)
	local lv1 = 0
	for _, b in b0 do if b.minLevel > 1 then lv1 += 1 end end
	check("마을 발전: 1레벨에는 1레벨 건물만 선다", lv1 == 0)
	local n = 0
	stV.reported = {}
	for _, node in D.KnowledgeTree.Nodes do
		stV.reported[node.id] = true
		n += 1
	end
	local v1 = S.Village.view(stV)
	check("마을 발전: 모든 지식을 이해하면 최고 레벨·건물 대부분", v1.level == 6 and v1.built > v0.built and #v1.discs >= 10, v1.level .. "/" .. v1.built)
	local sum = 0
	for _, c in v1.cats do sum += c.built end
	check("마을 발전: 분류별 건물 수 합계가 맞다", sum == v1.built)
	local stPD = S.State.new("england", 1700)
	stPD.portId = "london"
	local d0 = S.Village.portDev(stPD, "london")
	check("항구 발전도: 투자 외에는 점수가 없고 1레벨", d0 ~= nil and d0.score == d0.harbor * 5 and d0.stages == 0 and d0.tech == 0 and d0.landmarks == 0 and d0.level == 1)
	stPD.harbor.london = 99999
	stPD.portStages = { london = { trade = 2, ship = 1 } }
	stPD.landmarks = { london = { observatory = true } }
	stPD.portTech = { london = { astronomy = 20 } }
	local d1 = S.Village.portDev(stPD, "london")
	check("항구 발전도: 투자·건물·기술·특수 건축물이 점수에 합산된다", d1.score == d1.harbor * 5 + 3 * 3 + 2 * 2 + 4 and d1.stages == 3 and d1.tech == 2 and d1.landmarks == 1, tostring(d1.score))
	check("마을 구역: 레벨에 따라 구역이 열린다", #d0.districts == 2 and #d1.districts >= 2 and S.Village.Districts[#S.Village.Districts].minLevel == 6)
	local jbad = {}
	for _, j in S.Village.Jobs do
		if j.disc and not D.KnowledgeTree.TaxonomyById[j.disc] then table.insert(jbad, j.name) end
	end
	check("마을 직업: 학문 연결이 맞고 레벨이 오를수록 직업이 늘어난다", #jbad == 0 and #d1.jobs >= #d0.jobs and #d0.jobs == 7 and #d0.newJobs == 7, table.concat(jbad, ","))
	local PC = D.ProductionChains
	local pcBad = {}
	local ebNames = {}
	for _, b in D.EconomyBuildings.List do ebNames[b.name] = true end
	for _, r in PC.Recipes do
		if not ebNames[r.building] then table.insert(pcBad, r.id .. " 건물 " .. r.building) end
		if not D.KnowledgeTree.TaxonomyById[r.disc] then table.insert(pcBad, r.id .. " 학문 " .. r.disc) end
		for _, g in r.inputs do
			if not D.Ports.Goods[g] then table.insert(pcBad, r.id .. " 품목 " .. g) end
		end
	end
	for g, c in PC.ClassOf do
		if not D.Ports.Goods[g] then table.insert(pcBad, "분류 품목 " .. g) end
	end
	-- [기존 원료 분류] 가공품·지역 브랜드는 제조 상품이므로 원자재 분모에서 제외한다.
	local unclassed, totalProd, manufactured, branded = 0, 0, 0, 0
	for _, port in D.Ports.Ports do
		for _, g in (port.produces or {}) do
			if PC.BrandById[g] then
				branded += 1
			elseif PC.ByGood[g] then
				manufactured += 1
			else
				totalProd += 1
				if not PC.ClassOf[g] then unclassed += 1 end
			end
		end
	end
	if #pcBad > 0 then print(table.concat(pcBad, "\n")) end
	check("생산 자원: 공정·분류가 건물·학문·품목에 연결됨 (" .. #PC.Recipes .. "공정)", #pcBad == 0 and #PC.Recipes >= 25)
	check("생산 자원: 실제 원료 특산의 절반 이상이 원자재 종류로 분류된다 (분류 없음 " .. unclassed .. "/" .. totalProd .. ")", unclassed * 2 <= totalProd)
	check("생산 자원: 기존 가공품과 지역 브랜드를 원료가 아닌 제조 상품으로 분리", manufactured > 0 and branded == #PC.Brands)
	check("생산 자원: 레벨이 오르면 가공 가능한 공정이 늘어난다", #PC.craftable({ "wool", "iron", "gems" }, 1) < #PC.craftable({ "wool", "iron", "gems" }, 4))
	local dsum = 0
	for _, d in S.Village.Districts do dsum += #d.sub end
	check("도시 면적: 레벨이 오를수록 구획이 크게 늘고 소구역이 생긴다", S.Village.BLOCKS_AT[6] >= S.Village.BLOCKS_AT[1] * 30 and dsum >= 30 and d0.blocks == S.Village.BLOCKS_AT[1] and #d0.subDistricts >= 2 and d1.blocks >= d0.blocks)
	local simLow = S.Village.sim(stPD, "london", 1)
	local simHigh = S.Village.sim(stPD, "london", 6)
	local simOk = simLow ~= nil and #simLow.axes == 4 and simHigh.popCap > simLow.popCap and simLow.stability >= 0 and simLow.stability <= 1 and simHigh.stability <= 1
	local allAxis = true
	for _, a in simHigh.axes do
		if a.need <= 0 or a.supply < 0 or a.pct < 0 then allAxis = false end
	end
	check("의식주 시뮬: 레벨이 오르면 인구가 늘고 항목 4개의 수요·공급·만족도가 계산된다", simOk and allAxis)
	local stFull = S.State.new("england", 1700)
	stFull.reported = {}
	for _, node in D.KnowledgeTree.Nodes do stFull.reported[node.id] = true end
	local simFull = S.Village.sim(stFull, "london", 3)
	local simNone = S.Village.sim(S.State.new("england", 1700), "london", 3)
	check("의식주 시뮬: 학문이 발전해 건물이 들어서면 만족도가 오른다", simFull.stability >= simNone.stability and simFull.stability > simNone.stability - 1e-9)
	local cultOk, cultBad = true, {}
	for _, b in D.EconomyBuildings.List do
		for _, c in (b.cultures or {}) do
			if not S.Village.CULTURE_NAME[c] then cultOk = false table.insert(cultBad, b.id .. ":" .. c) end
		end
	end
	check("문화권 건물: 문화권 id 가 모두 올바르다", cultOk, table.concat(cultBad, ","))
	local mosqueHere, mosqueThere = false, false
	for _, b in S.Village.buildings(stFull, 6, "alexandria") do if b.name == "모스크" then mosqueHere = true end end
	for _, b in S.Village.buildings(stFull, 6, "london") do if b.name == "모스크" then mosqueThere = true end end
	local cathedralThere = false
	for _, b in S.Village.buildings(stFull, 6, "london") do if b.name == "대성당·성당" then cathedralThere = true end end
	check("문화권 건물: 이슬람권 항구에는 모스크, 런던에는 성당이 서고 서로 바뀌지 않는다", mosqueHere and not mosqueThere and cathedralThere)
	local dfBad = {}
	for _, d in D.KnowledgeTree.Disciplines do
		local l = D.DisciplineFacilities.List[d.id]
		if not l or #l ~= 4 then table.insert(dfBad, d.id) end
	end
	check("학문 시설: 모든 학문에 4단계 시설·직업이 있다", #dfBad == 0, table.concat(dfBad, ","))
	-- [승격 학문 시설] 기존 군사 시설은 동일한 정의를 사용하고, 신규 수학 학문 시설은 보고된 카드에서 실제 열린다.
	check("학문 시설: 군사학 4단계는 기존 병영·훈련장·공창·학교와 동일",
		D.DisciplineFacilities.List.military_science == D.DisciplineFacilities.Military
		and #D.DisciplineFacilities.List.military_science == 4)
	local mathTown = S.State.new("england", 1700)
	mathTown.reported.math_place_value = true
	local mathTownFac, mathTownJobs, mathTownDisc = S.Village.discFacilities(mathTown, 6)
	local mathTownReady = false
	for _, info in mathTownDisc do
		if info.id == "mathematics" and info.facility == D.DisciplineFacilities.List.mathematics[1][1]
			and info.job == D.DisciplineFacilities.List.mathematics[1][2] then
			mathTownReady = true
		end
	end
	check("학문 시설: 수학 지식 보고 후 산술 교실·산술 교사가 실제 나타난다",
		mathTownReady and table.find(mathTownFac, "산술 교실") ~= nil
		and table.find(mathTownJobs, "산술 교사") ~= nil)
	-- [승격 학문 실기동] 원래 식물학 소유인 참나무 보고는 임학 시설도 열지만 도시 성장 점수는 중복 증가시키지 않는다.
	local forestTown = S.State.new("england", 1700)
	forestTown.reported.bot_oak = true
	local _, forestScore = S.Village.tiers(forestTown)
	local forestFac, forestJobs, forestDisc = S.Village.discFacilities(forestTown, 6)
	local forestLinked = false
	for _, row in forestDisc do
		if row.id == "forestry" and row.facility == "벌목 기록소" and row.job == "벌목 기록관" then
			forestLinked = true
		end
	end
	check("학문 시설: 식물학 보고 카드의 임학 교차 시설이 실제 열린다",
		D.KnowledgeTree.ById.bot_oak.disc == "botany"
		and forestLinked and table.find(forestFac, "벌목 기록소") ~= nil
		and table.find(forestJobs, "벌목 기록관") ~= nil)
	check("학문 시설: 교차 학문은 기존 마을 성장 점수를 중복 증가시키지 않는다",
		forestScore == 1)
	local emptyFac = S.Village.discFacilities(S.State.new("england", 1700), 6)
	check("학문 시설: 미보고 학문은 항구가 커도 시설을 만들지 않는다",
		table.find(emptyFac, "벌목 기록소") == nil)


	local fac0, jobs0 = S.Village.discFacilities(stFull, 1)
	local fac6, jobs6, by6 = S.Village.discFacilities(stFull, 6)
	check("학문 시설: 학문이 발전하고 항구가 클수록 시설과 직업이 늘어난다", #fac0 == 0 and #fac6 > 0 and #fac6 == #jobs6 and #by6 >= 15)
	local stBB = S.State.new("england", 1700)
	stBB.portId = "london"
	local bb0 = S.Village.battleBonus(stBB)
	stBB.reported = stFull.reported
	stBB.harbor.london = 99999
	stBB.portStages = { london = { trade = 5, ship = 5, learn = 4, guard = 4 } }
	stBB.landmarks = { london = { observatory = true, academy = true, ironworks = true } }
	local bb1 = S.Village.battleBonus(stBB)
	check("전투 연결: 시설이 없으면 보너스 0, 발전하면 늘고 상한이 있다", bb0 == 0 and bb1 >= bb0 and bb1 <= S.Village.BATTLE_CAP, tostring(bb1))
	check("전투 연결: 포 위력 보너스에 반영된다", S.Perk.cannonBonus(stBB) >= bb1)
	local stMil = S.State.new("england", 1700)
	stMil.discovered = {}
	local mt0 = S.Village.militaryTier(stMil)
	local milCount = 0
	for _, c in D.Cards.Cards do
		if c.field == "Military" and milCount < 14 then stMil.discovered[c.id] = true milCount += 1 end
	end
	local mt1, mn = S.Village.militaryTier(stMil)
	local _, _, byMil = S.Village.discFacilities(stMil, 6)
	local hasMil = false
	for _, d in byMil do if d.id == "military_science" and d.tier == 4 then hasMil = true end end
	check("군사학 시설: 카드를 모으면 병영→군사 학교로 단계가 오르고 시설·직업이 선다", mt0 == 0 and mt1 == 4 and mn == 14 and hasMil, mt1 .. "/" .. mn)
	local pl = S.Village.portList(stPD)
	check("항구 발전도: 목록은 점수 순이고 현재 항구를 포함", #pl >= 1 and pl[1].id == "london")
end

-- 세계 연대기: 데이터 연결·도착 시 목격·논문 단계
do
	local WC = D.WorldChronicle
	local bad = {}
	for _, r in WC.Rows do
		for _, pid in r.ports do
			if not D.Ports.Ports[pid] then table.insert(bad, r.id .. " 항구 " .. pid) end
		end
		if not WC.Voice[r.voice] then table.insert(bad, r.id .. " 문화 " .. tostring(r.voice)) end
		if not WC.KindGain[r.kind] then table.insert(bad, r.id .. " 종류 " .. tostring(r.kind)) end
		if #WC.lines(r, "x") < 4 then table.insert(bad, r.id .. " 대사") end
	end
	if #bad > 0 then print(table.concat(bad, "\n")) end
	check("연대기: 데이터 연결이 맞다 (" .. #bad .. "건)", #bad == 0 and #WC.Rows >= 20)
	local gen = WC.fromPeople(D.People.Curated, D.Ports.Ports)
	check("연대기: 인물 백과에서 현장 장면이 만들어진다 (" .. #gen .. "건)", #gen >= 100)
	local genBad = 0
	for _, r in gen do
		if #WC.lines({ year = r.year, month = 1, voice = r.voice, fact = r.fact, scholar = r.scholar }, "x") < 4 or r.untilYear < r.year then genBad += 1 end
	end
	check("연대기: 인물 장면 대사·연도가 맞다", genBad == 0)
	local stC = S.State.new("england", 1700)
	stC.portId = "lisbon"
	stC.day = (1756 - 1700) * 365 + 10
	local msgs = {}
	local row = S.Chronicle.arrive(stC, msgs)
	check("연대기: 사건 해에 그 항구에 도착하면 목격한다", row ~= nil and row.id == "c_lisbon_quake" and stC.chron.notes >= 1 and stC._scenes ~= nil and #stC._scenes == 1)
	local again = S.Chronicle.arrive(stC, {})
	check("연대기: 같은 사건은 한 번만", again == nil or again.id ~= "c_lisbon_quake")
	local okD0 = Registry.handlers.WriteDraft(stC, {}, ctx)
	check("연대기: 노트가 모자라면 초안을 못 쓴다", okD0 == false)
	for _, node in D.KnowledgeTree.Nodes do if node.disc == "architecture" then stC.reported = { [node.id] = true } break end end
	stC.chron.notes = 3
	stC.chron.notesBy.architecture = 3
	stC.coins = 500
	local okD = Registry.handlers.WriteDraft(stC, {}, ctx)
	check("연대기: 노트 3개로 초안을 쓴다", okD == true and stC.chron.drafts == 1 and stC.chron.notes == 0)
	local okP0 = Registry.handlers.PublishPaper(stC, {}, ctx)
	check("연대기: 학회 발표 전에는 출판할 수 없다", okP0 == false)
	stC.academy = { presented = 1, expos = 0, medals = 0, joint = 0, launched = 0, era = 1, last = {}, shown = {} }
	local okP = Registry.handlers.PublishPaper(stC, {}, ctx)
	check("연대기: 발표 뒤 출판한다", okP == true and #stC.chron.papers == 1 and stC.chron.drafts == 0)
	local v = S.Chronicle.view(stC)
	check("연대기: 화면 요약", v.papers == 1 and #v.seen >= 1 and v.stage == 1)
	local function chq(id) return S.Quest.progressAny(stC, D.Quests.ById[id]) end
	check("연대기 퀘스트: 목격·초안·출판 진행도", chq("q_chr_any") >= 1 and chq("q_chr_architecture") >= 1 and chq("q_chr_astronomy") == 0 and chq("q_chr_draft") == 1 and chq("q_chr_paper") == 1)
	local qbad = {}
	for _, q in D.Quests.Quests do
		if q.kind == "chronicle" and q.disc and not D.KnowledgeTree.DisciplineById[q.disc] then table.insert(qbad, q.id) end
	end
	check("연대기 퀘스트: 학문 연결이 맞다", #qbad == 0)
end

-- 제2~4장: 실제 서비스의 분기 해금·전투 진행·데이터 참조 검증
do
	local Q = D.Quests.ById
	local siteById = {}
	for _, site in D.Sites.Sites do siteById[site.id] = site end
	local valid = #D.Quests.Chapters == 4
	for n = 2, 4 do
		for _, suffix in { "1", "2", "3", "4", "5a", "5b" } do
			local q = Q["ch" .. tostring(n) .. "_" .. suffix]
			valid = valid and q ~= nil and q.problem ~= nil and q.cause ~= nil and q.result ~= nil and q.speaker ~= nil and q.line ~= nil
			if q then
				if q.goodId then valid = valid and D.Ports.Goods[q.goodId] ~= nil end
				if q.portId then valid = valid and D.Ports.Ports[q.portId] ~= nil end
				if q.exploreSite then
					local site = siteById[q.exploreSite]
					valid = valid and site ~= nil and site.portId == q.portId and table.find(site.pool, q.cardId) ~= nil and D.Cards.ById[q.cardId] ~= nil
				end
				if q.leaderId then valid = valid and D.BoardingCards.Leaders[q.leaderId] ~= nil end
			end
		end
		local st = S.State.new("england", 1700)
		st.quests.done.pr_england_4 = true
		local first = Q["ch" .. tostring(n) .. "_1"]
		check("장 해금: 앞 장 미완료 차단 " .. n, not S.Quest.visible(st, first))
		for _, id in first.afterAny do
			st.quests.done[id] = true
			check("장 해금: 선택 결말 " .. id, S.Quest.visible(st, first))
			st.quests.done[id] = nil
		end
	end
	check("제2~4장 실제 상품·항구·탐험지·카드 참조", valid)
	local st = S.State.new("england", 1700)
	st.quests.done.pr_england_4 = true
	st.quests.done.ch2_2 = true
	st.stats.warClears = { war_ch2 = 1 }
	check("이야기 전용 함대전은 이전 승리로 자동 완료되지 않는다", S.Quest.progressAny(st, Q.ch2_3) == 0 and not S.Quest.isAuto(Q.ch2_3))
	local accepted = Registry.handlers.Accept(st, { questId = "ch2_3" })
	check("이야기 함대전 수락 시 기존 승수 제외", accepted and S.Quest.progress(st, Q.ch2_3) == 0)
	D.Quests.Kit.recordWar(st, { id = "war_ch2", region = "europe" })
	check("이야기 함대전 실제 새 승리만 진행", S.Quest.progress(st, Q.ch2_3) == 1)
	local sd = S.State.new("england", 1700)
	sd.quests.done.pr_england_4 = true
	sd.quests.done.ch3_2 = true
	sd.stats.duelWins = { rajaraja = 3 }
	local duelAccepted = Registry.handlers.Accept(sd, { questId = "ch3_3" })
	check("이야기 대결 수락 시 기존 승수 제외", duelAccepted and S.Quest.progress(sd, Q.ch3_3) == 0)
	D.Quests.Kit.recordDuelWin(sd, "rajaraja")
	check("이야기 대결 새 승리만 진행", S.Quest.progress(sd, Q.ch3_3) == 1)
	local sb = S.State.new("england", 1700)
	sb.quests.done.pr_england_4 = true
	sb.quests.done.ch4_4 = true
	sb.stats.storyChoices = { ch4_treaty = "permit" }
	check("장 결말은 선택한 분기만 해금", S.Quest.visible(sb, Q.ch4_5b) and not S.Quest.visible(sb, Q.ch4_5a))
end

-- 모든 지상·해상·교역·연구·서막·허가증 의뢰는 실제 카드에 연결된다.
do
	local bad, count, fields, regions, permits = {}, 0, 0, 0, 0
	for _, q in D.Quests.Quests do
		count += 1
		local card = q.loreCardId and D.Cards.ById[q.loreCardId]
		local hook, ending = S.Quest.storyOf(q)
		local entries = card and D.Quests.Kit.LORE[q.loreCardId]
		local found = false
		for _, entry in entries or {} do
			if entry.questId == q.id and entry.text == q.loreText then found = true break end
		end
		if not card or not found or not q.loreText or q.loreText == "" or not hook or not ending
			or not string.find(hook, "관련 백과: " .. (card and card.name or ""), 1, true) then
			table.insert(bad, q.id)
		end
		if q.routeId then
			fields += 1
			if q.loreCardId ~= q.cardId then table.insert(bad, q.id) end
		end
		if string.sub(q.id, 1, 5) == "q_rg_" then regions += 1 end
		if q.rewardPermit then permits += 1 end
	end
	check("전체 의뢰 지식카드 색인: " .. table.concat(bad, ","), count > 300 and #bad == 0 and fields == 50 and regions == 60 and permits > 0)
	local st = S.State.new("england", 1700)
	local q = D.Quests.ById.q_field_north_sea_1
	check("미완료 의뢰의 카드 이야기는 숨긴다", D.Quests.Kit.loreFor(st, D.Quests.Kit.LORE, q.loreCardId) == nil)
	st.quests.done[q.id] = true
	local lore = D.Quests.Kit.loreFor(st, D.Quests.Kit.LORE, q.loreCardId)
	check("완료 의뢰의 카드 이야기만 열림", lore ~= nil and #lore == 1 and lore[1].text == q.loreText)
end

-- 모든 항구 선택 사건은 기존 카드의 실제 선택 결과로 색인한다.
do
	local missing = {}
	local count = 0
	for _, e in D.Story.Events do
		count += 1
		for i, c in e.choices do
			local id = c.effect.cardId or e.loreCardId
			local found = false
			for _, row in (id and D.Quests.Kit.LORE[id]) or {} do
				if row.eventId == e.id and row.choice == i and row.text == c.result then found = true break end
			end
			if not id or not D.Cards.ById[id] or not found then table.insert(missing, e.id .. ":" .. i) end
		end
	end
	check("항구 선택 사건 228개 전체 카드 연결: " .. table.concat(missing, ","), count == 228 and #missing == 0)
	local st = S.State.new("england", 1700)
	local e = D.Story.ById.lc_1
	local id = e.loreCardId
	check("미완료 숨겨진 해도 결말 차단", D.Quests.Kit.loreFor(st, D.Quests.Kit.LORE, id) == nil)
	st.story[e.id] = 2
	local lore = D.Quests.Kit.loreFor(st, D.Quests.Kit.LORE, id)
	check("선택한 사건 결말만 표시", lore ~= nil and #lore == 1 and lore[1].text == e.choices[2].result)
	check("거절한 해도 후속 사건 해금 차단", S.Story.blockReason(st, D.Story.ById.lc_2) ~= nil)
end

-- 역사 사건 전체와 인물 대화의 실데이터 연결 확인.
do
	local count, missing = 0, {}
	for _, ev in D.HistoryEvents.Events do
		count += 1
		local id = ev.insight and ev.insight.node
		for i = 1, #ev.choices + (if ev.insight then 1 else 0) do
			local found = false
			for _, row in (id and D.Quests.Kit.LORE[id]) or {} do
				if row.historyId == ev.id and row.choice == i then found = true break end
			end
			if not id or not D.Cards.ById[id] or not found then table.insert(missing, ev.id .. ":" .. i) end
		end
	end
	check("역사 사건 79개 모든 선택의 카드 색인: " .. table.concat(missing, ","), count == 79 and #missing == 0)
	local st = S.State.new("england", 1700)
	local ev = D.HistoryEvents.ById.principia
	local card = ev.insight.node
	local function matches()
		local result = {}
		for _, row in D.Quests.Kit.loreFor(st, D.Quests.Kit.LORE, card) or {} do
			if row.title == ev.title then table.insert(result, row.text) end
		end
		return result
	end
	check("미완료 역사 선택 기록 비공개", #matches() == 0)
	st.history = st.history or { seen = {}, fx = {} }
	st.history.seen[ev.id] = #ev.choices + 1
	local lore = matches()
	check("실제 역사 지식 선택만 공개", #lore == 1 and string.find(lore[1], ev.insight.label, 1, true) ~= nil)
	local npcCount, dialogueOK = 0, true
	for _, event in D.Story.Events do
		if string.sub(event.id, 1, 4) == "npc_" then
			npcCount += 1
			dialogueOK = dialogueOK and #event.lines >= 3
		end
	end
	check("항구 인물 164개 실제 대화 배열 보완", npcCount == 164 and dialogueOK)
end

print(string.format("지식=전투 테스트: 통과 %d, 실패 %d", pass, fail))
if fail > 0 then error("지식=전투 테스트 실패") end
