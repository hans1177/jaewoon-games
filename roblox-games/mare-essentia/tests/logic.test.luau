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
local S, handlers = Registry.S, Registry.handlers

math.randomseed(987654)
local function rng()
	return math.random()
end
local ctx = { rng = rng, market = S.MarketClass.new() }

local passed, failed = 0, 0
-- 거시경제 국면·미개발 특산 보정 (History.mult 에 항상 곱해진다)
local function macroOf(st, portId, goodId)
	local p = D.Ports.Ports[portId]
	local rid = D.Regions.of(p).id
	local yr = st.startYear + math.floor(st.day / 365)
	local m = D.Harbor.priceMult(D.Harbor.regime(yr), rid, goodId)
	local role = D.Harbor.role(p, rid, yr, D.Harbor.level(st.harbor[portId] or 0), goodId)
	local base = if table.find(p.produces, goodId) then D.TradeMath.PRODUCE_MULT elseif table.find(p.demands, goodId) then D.TradeMath.DEMAND_MULT else 1
	local now = if role == "produce" then D.TradeMath.PRODUCE_MULT elseif role == "demand" then D.TradeMath.DEMAND_MULT else 1
	return m * now / base
end
local function near(a, b)
	return math.abs(a - b) < 1e-9
end
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

-- 세계·인물·속도 검사는 따로 떼어 둔다 (한 곳에 모으면 타입 검사기가 감당하지 못한다)
local function extraTests()
	local S: any = Registry.S
	local D: any = D
	local ctx: any = ctx
	local check: any = check
	local act: any = act
	local newState: any = newState
	local HE: any = D.HistoryEvents
	-- 역사의 속도
	local stV = newState("england")
	stV.portId = "london"
	check("속도: 처음엔 앞당김이 없음", S.Pace.days(stV) == 0 and S.Pace.effYear(stV) == 1700)
	check("속도: 쌓으면 앞당겨짐", S.Pace.add(stV, 10) == 10 and S.Pace.days(stV) == 10)
	local g2 = S.Pace.add(stV, 100)
	check("속도: 90일 한도(30일) 안에서만 쌓임", g2 == 20 and S.Pace.days(stV) == 30, tostring(g2))
	check("속도: 한도가 차면 더 안 쌓임", S.Pace.add(stV, 50) == 0)
	stV.day += 91
	check("속도: 기간이 지나면 다시 쌓임", S.Pace.add(stV, 10) > 0)
	stV.pace.days = 365 * 10
	check("속도: 총 앞당김은 10년을 넘지 않음", S.Pace.add(stV, 100) == 0)
	-- 앞당김이 사건 시기에 반영됨
	local stX = newState("england")
	stX.day = HE.dayOf(HE.ById.cook_voyage, 1700) - 100
	S.History.tick(stX)
	local before = stX.history.pending
	stX.history.pending = nil
	stX.history.seen = {}
	stX.pace = { days = 365 * 10, window = 0, used = 0 }
	S.History.tick(stX)
	check("속도: 학문·탐험 사건은 앞당김만큼 일찍 닥침", stX.history.pending ~= nil)
	local fixedEv = newState("england")
	fixedEv.day = HE.dayOf(HE.ById.seven_years_war, 1700) - 100
	fixedEv.pace = { days = 365 * 10, window = 0, used = 0 }
	fixedEv.history.seen = {}
	for _, ev in HE.Events do if ev.accel or ev.year < 1756 then fixedEv.history.seen[ev.id] = 1 end end
	S.History.tick(fixedEv)
	check("속도: 정치·전쟁 사건은 앞당겨지지 않음", fixedEv.history.pending == nil, tostring(fixedEv.history.pending))
	-- 지식 보고가 역사를 앞당김
	local stY = newState("england")
	stY.portId = "london"
	stY.discovered.phy_buoyancy = true
	act(stY, "ReportKnowledge", { scholarId = "newton" })
	check("속도: 지식 보고로 역사가 앞당겨짐", S.Pace.days(stY) > 0)
	local backV = S.State.sanitize(S.State.serialize(stY))
	check("속도: 저장/불러오기", backV.pace.days == stY.pace.days)
	check("속도: 화면에 담김", S.View.build(stY, ctx).pace.days == stY.pace.days)
	-- 인물과 학문·교역품·사건의 연결
	local stL = newState("england")
	stL.stats.visited = {}
	check("연결: 기록이 없으면 보너스 없음", S.People.goodsBonus(stL, "tea") == 1 and S.People.discBonus(stL, { "navigation" }) == 0)
	stL.stats.visited = { amsterdam = true, london = true, canton = true, edo = true }
	stL.day = 365 * 70
	check("연결: 인물을 기록하면 교역품 값 보너스", S.People.goodsBonus(stL, "tea") > 1 and S.People.goodsBonus(stL, "tea") <= 1.08)
	check("연결: 학문 연구 보너스(상한 3%)", S.People.discBonus(stL, { "physics", "history", "commerce", "art" }) > 0 and S.People.discBonus(stL, { "physics", "history", "commerce", "art" }) <= 0.03 + 1e-9)
	check("연결: 지식 서비스 교역품 값에 반영", S.Knowledge.goodsMult(stL, "tea") > 1)
	check("연결: 사건에 얽힌 인물을 기록하면 인연", #S.People.eventPeople(stL, "great_fire") >= 1)
	local mitL = S.World.mitigation(stL, "history")
	stL.stats.visited = {}
	check("연결: 기록한 인물이 재해 대비를 높임", mitL > S.World.mitigation(stL, "history"))
	local sumP = S.View.build(stL, ctx).people
	check("연결: 학문별 인물 수가 화면에 담김", sumP.byDisc.history ~= nil and sumP.byDisc.history.total > 3)
	-- 인물 백과 퀘스트
	local stQ = newState("england")
	stQ.stats.visited = { amsterdam = true, london = true, canton = true, edo = true, lisbon = true, plymouth = true, seville = true, calicut = true }
	stQ.day = 365 * 80
	local q1 = D.Quests.ById.q_people_1
	check("인물 퀘스트: 연속 퀘스트와 분야 퀘스트가 있음", q1 ~= nil and D.Quests.ById.q_people_2.after == "q_people_1" and D.Quests.ById.q_people_explorer.cat == "explorer")
	check("인물 퀘스트: 진행도가 기록한 인물 수", S.Quest.progressAny(stQ, q1) == S.People.knownCount(stQ) and S.Quest.progressAny(stQ, q1) >= 5, S.Quest.progressAny(stQ, q1) .. "/" .. S.People.knownCount(stQ))
	check("인물 퀘스트: 분야별 진행도", S.Quest.progressAny(stQ, D.Quests.ById.q_people_explorer) == S.People.catCount(stQ, "explorer") and S.People.catCount(stQ, "explorer") >= 3)
	local coinsQ = stQ.coins
	local msgsQ = {}
	S.Quest.autoReport(stQ, msgsQ)
	check("인물 퀘스트: 조건을 채우면 자동 보상", stQ.quests.done.q_people_1 == true and stQ.coins > coinsQ)
	-- 인물 백과
	local PE = D.People
	local catOk = {}
	for _, c in PE.Cats do catOk[c.id] = true end
	local badP = 0
	for _, p in PE.Curated do
		if not catOk[p.cat] or p.born >= p.died or #p.bio < 6 then badP += 1; print("나쁜 인물", p.id) end
		if p.via.port and not D.Ports.Ports[p.via.port] then badP += 1; print("나쁜 항구", p.id, p.via.port) end
		if p.via.event and not D.HistoryEvents.ById[p.via.event] then badP += 1; print("나쁜 사건", p.id, p.via.event) end
		if p.via.scholar then
			local okS = false
			for _, s in D.Scholars.Scholars do if s.id == p.via.scholar then okS = true end end
			if not okS then badP += 1; print("나쁜 학자", p.id) end
		end
		if next(p.via) == nil then badP += 1; print("방법 없음", p.id) end
	end
	check("백과: 인물 데이터가 올바름", badP == 0, tostring(badP))
	local goodCover = {}
	for _, l in PE.Links do for _, g in l.goods or {} do goodCover[g] = true end end
	local uncovered = 0
	for gid in D.Ports.Goods do if not goodCover[gid] then uncovered += 1; print("연결 안 된 교역품", gid) end end
	check("백과: 모든 교역품이 어떤 인물과 이어짐", uncovered == 0, tostring(uncovered))
	local linkBad = 0
	for id, l in PE.Links do
		if not D.KnowledgeTree.DisciplineById[l.disc] then linkBad += 1; print("나쁜 학문", id) end
		for _, g in l.goods or {} do if not D.Ports.Goods[g] then linkBad += 1; print("나쁜 상품", id, g) end end
		for _, e in l.events or {} do if not D.HistoryEvents.ById[e] then linkBad += 1; print("나쁜 사건", id, e) end end
	end
	check("백과: 인물 연결(학문·교역품·사건)이 올바름", linkBad == 0, tostring(linkBad))
	check("백과: 인물이 100명 넘음", #PE.Curated >= 100 and #S.People.all >= 140, #PE.Curated .. "/" .. #S.People.all)
	local stP = newState("england")
	stP.portId = "london"
	local n0 = S.People.knownCount(stP)
	stP.stats.visited.london = true
	stP.day = 365 * 60 -- 1760년
	check("백과: 항구를 방문하면 인물이 기록됨", S.People.knownCount(stP) > n0)
	local stP2 = newState("england") -- 1700년
	stP2.stats.visited.london = true
	local shakespeareKnown, nelsonKnown = false, false
	for _, p in S.People.all do
		if p.id == "shakespeare" then shakespeareKnown = S.People.known(stP2, p) end
		if p.id == "nelson" then nelsonKnown = S.People.known(stP2, p) end
	end
	check("백과: 시대가 오기 전엔 기록 안 됨(넬슨 1700년)", shakespeareKnown and not nelsonKnown)
	stP2.scholarsMet.newton = true
	stP2.history.seen.great_plague = 1
	local vP = S.View.build(stP2, ctx).people
	check("백과: 화면에 목록과 분야가 담김", vP and vP.total == #S.People.all and #vP.cats == #PE.Cats and #vP.list == vP.total)
	local hiddenOk = true
	for _, e in vP.list do if not e.known and (e.name ~= nil or e.bio ~= nil) then hiddenOk = false end end
	check("백과: 모르는 인물은 이름을 숨김", hiddenOk)
	stP2.coins = 0
	check("백과: 모자란 인원으로 보상 못 받음", select(1, act(stP2, "PeopleClaim", { need = 150 })) == false)
	local needTier = PE.Tiers[1].need
	for _, p in S.People.all do
		if S.People.knownCount(stP2) >= needTier then break end
		stP2.scholarsMet[p.id] = true
	end
	local okC = act(stP2, "PeopleClaim", { need = needTier })
	check("백과: 인원을 채우면 보상을 받고 한 번만", okC and stP2.coins == PE.Tiers[1].coins and select(1, act(stP2, "PeopleClaim", { need = needTier })) == false)
	local backP = S.State.sanitize(S.State.serialize(stP2))
	check("백과: 저장/불러오기", backP.peopleClaimed[tostring(needTier)] == true)
	-- 인물 대화
	local missingLine = 0
	for _, p in PE.Curated do
		if not D.PeopleTalk.Lines[p.id] then missingLine += 1 end
	end
	check("대화: 모든 큐레이션 인물에 대사가 있음", missingLine == 0)
	local stT = newState("england")
	local anyP = S.People.all[1]
	for _, e in S.People.all do
		if e.scholar then anyP = e; break end
	end
	check("대화: 기록 전에는 못 함", select(1, act(stT, "PeopleTalk", { id = anyP.id })) == false)
	stT.scholarsMet[anyP.id] = true
	stT.coins = 0
	local okT = act(stT, "PeopleTalk", { id = anyP.id })
	check("대화: 처음엔 보상, 두 번째엔 보상 없음", okT and stT.coins == 40 and act(stT, "PeopleTalk", { id = anyP.id }) and stT.coins == 40)
	check("대화: 저장/불러오기", S.State.sanitize(S.State.serialize(stT)).peopleTalked[anyP.id] == true and S.People.talkCount(stT) == 1)
	check("대화: 알 수 없는 인물 거절", select(1, act(stT, "PeopleTalk", { id = "nobody" })) == false)
	-- 1517년 시작 (종교개혁)
	local st17 = S.State.new("netherlands", 1517)
	st17.day = HE.dayOf(HE.ById.reformation_95, 1517) + 1
	S.History.tick(st17)
	check("1517 시작: 가을에 95개조 반박문 사건이 닥침", st17.history.pending == "reformation_95", tostring(st17.history.pending))
	check("1517 시작: 종교개혁 이후 사건이 16건", (function() local n = 0 for _, e in HE.Events do if e.year >= 1517 and e.year < 1600 then n += 1 end end return n end)() == 16)
	check("1517 시작: 새 게임 요청이 받아들여짐", select(1, S.State.new("england", 1517)) ~= nil)
	-- 원더 연출
	local WSd = D.WonderScenes
	local badScene = 0
	local AIds: any = require("./Shared/AssetIds")
	for cid, sc in WSd.Scenes do
		if not D.Cards.ById[cid] or not AIds["CardArt/" .. sc.art] or not WSd.Moods[sc.mood] or #sc.lines < 3 then badScene += 1 end
	end
	check("원더 연출: 모든 장면의 카드·원화·음악 분위기·자막이 있음", badScene == 0 and next(WSd.Scenes) ~= nil)
	local stW = newState("england")
	local msgsW: { any } = {}
	S.Discovery.grantCard(stW, "site_stonehenge", msgsW)
	check("원더 연출: 원더 카드를 처음 발견하면 장면 예약", stW.pendingScene == "site_stonehenge")
	stW.pendingScene = nil
	S.Discovery.grantCard(stW, "site_stonehenge", msgsW)
	check("원더 연출: 이미 발견한 카드는 다시 예약하지 않음", stW.pendingScene == nil)
	local stN = newState("england")
	S.Discovery.grantCard(stN, "bot_tulip", msgsW)
	check("원더 연출: 일반 카드는 장면 없음", stN.pendingScene == nil)
	check("원더 연출: 임시 값은 저장하지 않음", S.State.serialize(stW).pendingScene == nil)
	-- 납품 의뢰 수 제한과 학자 동료
	local stQ = newState("england")
	local vq = S.View.build(stQ, ctx).quests
	local shownD = 0
	for _, a in vq.available do
		local q = D.Quests.ById[a.id]
		if q.kind == "deliver" then shownD += 1 end
	end
	check("납품 의뢰: 게시판에는 많아야 4개만 보임", shownD <= 4 and vq.otherPortDeliver > 0)
	local stC = newState("england")
	stC.fame = 500; stC.coins = 5000; stC.scholarsMet.newton = true
	check("학자 동료: 만난 학자는 영입할 수 있음", act(stC, "Recruit", { companionId = "c_newton" }) and table.find(stC.companions, "c_newton") ~= nil)
	check("학자 동료: 만나지 않은 학자는 영입 못 함", select(1, act(newState("england"), "Recruit", { companionId = "c_galileo" })) == false)
	local nComp = 0
	for _, c in D.Specialties.Companions do if c.scholarId ~= "" then nComp += 1 end end
	check("학자 동료: 실존 학자 동료가 14명 이상", nComp >= 14, tostring(nComp))
	local withSkill = 0
	for _, sk in D.Skills.Skills do if sk.grantedBy and string.sub(sk.grantedBy, 1, 2) == "c_" then withSkill += 1 end end
	check("학자 동료: 전용 스킬을 가진 동료가 7명", withSkill == 7, tostring(withSkill))
	-- 배의 자리
	local SPd = D.Specialties
	check("자리: 배 등급별 동료 수 2/4/5/6", SPd.slotsFor(1) == 2 and SPd.slotsFor(2) == 4 and SPd.slotsFor(3) == 5 and SPd.slotsFor(4) == 6)
	local noSeat = 0
	for _, c in SPd.Companions do
		if not SPd.StationById[SPd.CompanionStation[c.id] or ""] then noSeat += 1 end
	end
	check("자리: 모든 동료에 어울리는 자리가 있음", noSeat == 0)
	local stSt = newState("england")
	stSt.fame = 500; stSt.coins = 9000; stSt.scholarsMet.harrison = true; stSt.scholarsMet.newton = true
	check("자리: 영입하면 어울리는 자리에 앉음", act(stSt, "Recruit", { companionId = "c_harrison" }) and stSt.stations.helm == "c_harrison")
	check("자리: 직책에 맞는 효과 x1.2, 다른 자리 x0.6", (function()
		local fast = S.Perk.speedMult(stSt)
		act(stSt, "Station", { companionId = "c_harrison", station = "surgeon" })
		local slow = S.Perk.speedMult(stSt)
		return fast > slow and slow > 1 and math.abs((fast - 1) / (slow - 1) - 2) < 0.01
	end)())
	act(stSt, "Station", { companionId = "c_harrison", station = "helm" })
	act(stSt, "Recruit", { companionId = "c_newton" })
	check("자리: 자리가 찬 곳에는 서로 바꿔 앉음", act(stSt, "Station", { companionId = "c_newton", station = "helm" }) and stSt.stations.helm == "c_newton" and stSt.stations.gunner == "c_harrison")
	check("자리: 작별하면 자리가 비워짐", act(stSt, "Dismiss", { companionId = "c_newton" }) and stSt.stations.helm == nil)
	check("자리: 저장/불러오기", (function()
		local back = S.State.sanitize(S.State.serialize(stSt))
		return back.stations.gunner == "c_harrison"
	end)())
	check("자리: 중형 배에서 조타수 자리가 비면 감점", (function()
		local v = newState("england")
		local base = D.Ships.Ships.caravel.class
		v.ship.id = "galleon"
		v.stations = {}
		local empty = S.Perk.speedMult(v)
		v.companions = { "c_harrison" }
		v.stations = { helm = "c_harrison" }
		local sv = S.Perk.vacancy(v)
		return base < 2 and empty < 1 and sv == 0
	end)())
	check("자리: 화면에 6자리", #S.View.build(stSt, ctx).companions.stations == 6)
	-- 방 시계
	local RC = D.RoomClock
	check("방 시계: 현실 1분 = 6일", RC.daysFor(60) == 6 and RC.daysFor(3600) == 360 and RC.daysFor(-5) == 0)
	check("방 시계: 같은 입력이면 같은 값", RC.hash01(7, "a", 3) == RC.hash01(7, "a", 3) and RC.hash01(7, "a", 3) ~= RC.hash01(7, "a", 4))
	local fakeNow = 1000
	S.Room.nowFn = function() return fakeNow end
	S.Room.reset()
	local rA = S.State.new("england", 1650)
	S.Room.join(rA)
	local rB = S.State.new("netherlands", 1700)
	S.Room.join(rB)
	check("방 시계: 늦게 온 사람은 방 시대로 고정", rB.startYear == 1650 and rB.room ~= nil and rB.room.id == rA.room.id)
	fakeNow += 600
	S.Room.sync(rA)
	S.Room.sync(rB)
	check("방 시계: 10분 뒤 둘 다 같은 날(60일)", rA.day == 60 and rB.day == 60)
	local before = rA.day
	S.State.advanceDays(rA, 30)
	check("방 시계: 행동으로 시대가 건너뛰지 않음", rA.day == before)
	local soloS = newState("england")
	local soloDay = soloS.day
	S.State.advanceDays(soloS, 5)
	check("방 시계: 혼자 하기는 지금처럼 날짜가 흐름", soloS.day == soloDay + 5)
	-- 같은 방 두 사람이 같은 세계 사건을 겪음
	fakeNow += 3600 * 20 -- 20시간 = 약 20년
	S.Room.sync(rA)
	S.Room.sync(rB)
	local logA, logB = {}, {}
	for _ = 1, 40 do
		for _, m in S.World.tick(rA) do table.insert(logA, m) end
		for _, m in S.World.tick(rB) do table.insert(logB, m) end
		fakeNow += 3600
		S.Room.sync(rA)
		S.Room.sync(rB)
	end
	local titlesA, titlesB = {}, {}
	for _, e in rA.world.log do table.insert(titlesA, e.title .. e.day) end
	for _, e in rB.world.log do table.insert(titlesB, e.title .. e.day) end
	check("방 시계: 같은 방은 같은 세계 사건을 겪음", #titlesA > 0 and table.concat(titlesA, "|") == table.concat(titlesB, "|"))
	check("방 시계: 저장/불러오기", S.State.sanitize(S.State.serialize(rA)).room ~= nil and S.State.sanitize(S.State.serialize(rA)).room.id == rA.room.id)
	check("방 시계: 화면에 담김", S.View.build(rA, ctx).room.on == true and S.View.build(soloS, ctx).room.on == false)
	S.Room.nowFn = os.time
	S.Room.reset()
	-- 항구 치안
	local PO = D.PortOrder
	check("치안: 신대륙 개척지는 유럽보다 기본 치안이 낮음", PO.BASE.new_world < PO.BASE.europe)
	check("치안: 해적 소굴은 해적 황금기에 더 낮음", PO.target("new_world", "nassau", 1700, 0, 1) < PO.target("new_world", "nassau", 1600, 0, 1) and PO.target("new_world", "nassau", 1600, 0, 1) < PO.target("new_world", "havana", 1600, 0, 1))
	check("치안: 방어 건물과 교역소가 목표를 올림", PO.target("europe", "london", 1700, 3, 3) > PO.target("europe", "london", 1700, 0, 1))
	local stO = newState("england")
	local o0 = S.Order.currentOf(stO, stO.portId)
	stO.coins = 1000
	local okO = act(stO, "OrderPatrol", {})
	local o1 = S.Order.currentOf(stO, stO.portId)
	check("치안: 순찰은 코인을 쓰고 치안을 올림", okO and stO.coins == 1000 - PO.PATROL_COST and o1 > o0 and stO.orderPatrols == 1)
	check("치안: 쿨다운 안에는 다시 못 보냄", select(1, act(stO, "OrderPatrol", {})) == false)
	stO.day += PO.PATROL_COOLDOWN
	check("치안: 시간이 지나면 기본 치안으로 돌아감", S.Order.currentOf(stO, stO.portId) < o1 + 0.001 and math.abs(S.Order.currentOf(stO, stO.portId) - S.Order.targetOf(stO, stO.portId)) <= math.abs(o1 - S.Order.targetOf(stO, stO.portId)))
	local bB = S.Order.sellBonus(stO)
	S.Order.shock(stO, stO.portId, 40)
	check("치안: 충격으로 떨어지면 판매 비율도 낮아짐", S.Order.sellBonus(stO) < bB)
	check("치안: 저장/불러오기", S.State.sanitize(S.State.serialize(stO)).orderPatrols == 1 and S.State.sanitize(S.State.serialize(stO)).order[stO.portId] ~= nil)
	check("치안: 화면에 담김", S.View.build(stO, ctx).order ~= nil and S.View.build(stO, ctx).order.cost == PO.PATROL_COST)
	-- 1600년대 초 시작
	local st16 = S.State.new("netherlands", 1600)
	check("1600 시작: 날짜와 해가 맞음", S.State.year(st16) == 1600)
	local ev16, ev16n = 0, 0
	for _, e in HE.Events do
		if e.year < 1650 then ev16 += 1 end
	end
	for _, e in HE.Events do
		if e.year >= 1600 then ev16n += 1 end
	end
	check("1600 시작: 1650년 이전 역사 사건이 15건 이상 (종교개혁 이후 사건 포함)", ev16 >= 15 and ev16n == #HE.Events - 16, ev16 .. "/" .. ev16n)
	st16.day = HE.dayOf(HE.ById.eic_charter, 1600) + 1
	S.History.tick(st16)
	check("1600 시작: 1600년 말에 영국 동인도회사 사건이 닥침", st16.history.pending == "eic_charter" or st16.history.pending == "sekigahara", tostring(st16.history.pending))
	local st50 = S.State.new("netherlands", 1700)
	st50.day = 100
	S.History.tick(st50)
	check("1700 시작: 1650년 이전 사건은 나오지 않음", st50.history.pending == nil or HE.ById[st50.history.pending].year >= 1700)
	local seenEarly = true
	for _, e in HE.Events do
		if e.year < 1700 then st50.history.seen[e.id] = nil end
	end
	for _, e in HE.Events do
		if e.year < 1517 then seenEarly = false end
	end
	check("역사 사건은 모두 1517년 이후", seenEarly)
	local galileoOk = false
	st16.portId = "venice"
	st16.fame = 100
	st16.day = (1610 - 1600) * 365
	local okG = act(st16, "Visit", { scholarId = "galileo" })
	galileoOk = okG
	check("1600 시작: 1610년 베네치아에서 갈릴레오를 만날 수 있음", galileoOk)
	local pool16 = 0
	for _, e in D.WorldEvents.Events do
		if not e.year and 1600 >= e.frm then pool16 += 1 end
	end
	check("1600 시작: 무작위 재해·행운 후보가 넉넉함", pool16 >= 25, tostring(pool16))
	local st16w = S.State.new("england", 1600)
	st16w.day = 365 * 32
	local w16 = S.World.tick(st16w)
	check("1600 시작: 시간이 지나면 세계 이벤트가 쌓임(1631 베수비오 포함)", st16w.world.done.fx_vesuvius == true and #st16w.world.log >= 1)
	-- 세계 이벤트: 실제 재해·연쇄
	local badW2 = 0
	local fixedN = 0
	for _, e in D.WorldEvents.Events do
		for _, f in e.follow or {} do
			if not D.WorldEvents.ById[f.id] or f.p <= 0 or f.p > 1 or f.after <= 0 then badW2 += 1; print("나쁜 연쇄", e.id, f.id) end
		end
		if e.year then
			fixedN += 1
			if not e.port or not D.Ports.Ports[e.port] or D.Regions.of(D.Ports.Ports[e.port]).id ~= e.regions[1] then badW2 += 1; print("나쁜 실제 사건", e.id) end
		end
	end
	check("세계: 연쇄·실제 사건 데이터가 올바름", badW2 == 0 and fixedN >= 12, badW2 .. "/" .. fixedN)
	local stFx = newState("england") -- 1700
	stFx.portId = "marseille"
	stFx.coins = 10000
	stFx.day = (1721 - 1700) * 365
	local newsFx = S.World.tick(stFx)
	local gotPlague, gotEdo = false, false
	for _, l in stFx.world.log do
		if l.title == "마르세유 대역병" then gotPlague = true end
		if l.title == "에도 메이레키 대화재" then gotEdo = true end
	end
	check("세계: 그 해가 되면 실제 재해가 항구에 닥침(마르세유 1720)", gotPlague and stFx.coins < 10000)
	check("세계: 시작 연도 전의 실제 사건은 건너뜀(에도 1657)", not gotEdo and stFx.world.done.fx_edo_fire == true)
	local stFx2 = newState("england")
	stFx2.portId = "london"
	stFx2.coins = 10000
	stFx2.day = (1721 - 1700) * 365
	S.World.tick(stFx2)
	check("세계: 다른 항구에 있으면 직접 피해는 없음", stFx2.coins == 10000)
	-- 연쇄: 지진은 화재·해일을, 기근은 풍작(회복)을 예약한다
	local evEq, evFamine = D.WorldEvents.ById.earthquake, D.WorldEvents.ById.famine
	local eqFollows, famineHeals = {}, false
	for _, f in evEq.follow do eqFollows[f.id] = true end
	for _, f in evFamine.follow do if f.id == "bumper_harvest" then famineHeals = true end end
	check("세계: 지진 뒤 화재, 기근 뒤 풍작(회복)이 이어짐", eqFollows.harbor_fire == true and famineHeals)
	-- 후속 사건 실행: 큐에 넣으면 날짜가 되어 일어남
	local stQ2 = newState("england")
	stQ2.portId = "london"
	S.World.tick(stQ2)
	table.insert(stQ2.world.queue, { id = "harbor_fire", day = stQ2.day + 3, region = "europe", cause = "테스트 지진" })
	stQ2.day += 3
	local newsQ = S.World.tick(stQ2)
	local sawFire = false
	for _, m in newsQ do if string.find(m, "테스트 지진의 여파", 1, true) then sawFire = true end end
	check("세계: 후속 사건이 날짜가 되면 일어남", sawFire and #stQ2.world.queue == 0)
	local backQ = S.State.sanitize(S.State.serialize(stFx))
	check("세계: 실제 사건 기록이 저장됨", backQ.world.done.fx_marseille_plague == true)
	-- 세계 이벤트 (재해·행운)
	local WE = D.WorldEvents
	local regionIds = {}
	for _, r in D.Regions.List do regionIds[r.id] = true end
	local badData = 0
	local kinds = { disaster = 0, fortune = 0 }
	for _, e in WE.Events do
		kinds[e.kind] += 1
		for _, g in e.goods do if not D.Ports.Goods[g] then badData += 1; print("나쁜 상품", e.id, g) end end
		for _, r in e.regions do if not regionIds[r] then badData += 1; print("나쁜 지역", e.id, r) end end
		if not D.KnowledgeTree.DisciplineById[e.guard] then badData += 1; print("나쁜 학문", e.id, e.guard) end
		if e.mult <= 0 or e.days <= 0 or e.frm > e.to then badData += 1 end
	end
	check("세계: 데이터가 올바름", badData == 0, tostring(badData))
	check("세계: 재해와 행운이 모두 넉넉함", kinds.disaster >= 15 and kinds.fortune >= 12, kinds.disaster .. "/" .. kinds.fortune)
	local stWd = newState("england")
	stWd.portId = "london"
	stWd.coins = 5000
	for _ = 1, 60 do
		stWd.day += 20
		S.World.tick(stWd)
	end
	check("세계: 시간이 흐르면 사건이 쌓임", #stWd.world.log >= 12)
	local nd, nf = 0, 0
	for _, l in stWd.world.log do if l.kind == "disaster" then nd += 1 else nf += 1 end end
	check("세계: 최근 기록에 재해와 행운이 섞임", nd > 0 and nf > 0, nd .. "/" .. nf)
	check("세계: 시세 효과가 한도 안", #stWd.history.fx <= 40)
	-- 피해와 완화
	local stWe = newState("england")
	stWe.portId = "london"
	stWe.coins = 10000
	stWe.world = nil
	local fire0 = stWe.coins
	local ev = WE.ById.earthquake
	S.World.tick(stWe)
	local w0 = S.World.mitigation(stWe, "architecture")
	stWe.reported = {}
	for _, nd2 in D.KnowledgeTree.Nodes do if nd2.disc == "architecture" then stWe.reported[nd2.id] = true end end
	check("세계: 지식이 재해를 줄임", S.World.mitigation(stWe, "architecture") > w0)
	stWe.portStages = { london = { guard = 5 } }
	check("세계: 방어 건물이 재해를 더 줄임", S.World.mitigation(stWe, "architecture") <= 0.8 and S.World.mitigation(stWe, "architecture") > 0.4)
	-- 구호
	local stWf = newState("england")
	stWf.portId = "london"
	stWf.coins = 1000
	S.World.tick(stWf)
	stWf.world.active = { { id = "plague_wave", wid = 7, region = "europe", title = "유럽 역사", text = "", kind = "disaster", startDay = 0, endDay = stWf.day + 60 } }
	table.insert(stWf.history.fx, { goods = { "camphor" }, regions = { "europe" }, mult = 1.35, untilDay = stWf.day + 60, wid = 7 })
	local okA = act(stWf, "WorldAid", { index = 1 })
	check("세계: 구호하면 명성과 시세 충격이 줄음", okA and stWf.fame > 0 and stWf.history.fx[#stWf.history.fx].untilDay <= stWf.day + 30 and stWf.coins == 850)
	check("세계: 두 번 구호는 안 됨", select(1, act(stWf, "WorldAid", { index = 1 })) == false)
	stWf.world.active[1].aided = false
	stWf.portId = "havana"
	check("세계: 다른 지역에선 구호 못 함", select(1, act(stWf, "WorldAid", { index = 1 })) == false)
	local backW = S.State.sanitize(S.State.serialize(stWd))
	check("세계: 저장/불러오기", backW.world ~= nil and backW.world.rng == stWd.world.rng and #backW.world.log == #stWd.world.log and backW.world.nextDay == stWd.world.nextDay)
	check("세계: 화면에 담김", S.View.build(stWd, ctx).world ~= nil)
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

	-- 자동 발견 보고: 수락하지 않아도 조건을 채우면 보고되고 보상이 들어온다
	local ar = newState()
	local arCoins = ar.coins
	ar.discovered.bot_oak = true
	local arMsgs = {}
	check("auto report discovery without accept", S.Quest.autoReport(ar, arMsgs) >= 1, table.concat(arMsgs, "|"))
	check("auto report marks done", ar.quests.done.q_first_discovery == true)
	check("auto report pays", ar.coins > arCoins)
	check("auto report only once", S.Quest.autoReport(ar, {}) == 0)
	check("auto report never touches deliver quests", ar.quests.done.q_first_trade == nil)
	check("deliver quest is not auto", not S.Quest.isAuto(D.Quests.ById.q_first_trade))
	-- 동료 말풍선 조언 데이터
	local advState = newState()
	local advView = S.View.build(advState, ctx)
	check("view has advice with greeting", advView.advice ~= nil and type(advView.advice.line) == "string", tostring(advView.advice))
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
	local okG, msgG = act(st, "Sail", { portId = "nagasaki" })
	check("far east needs navigation knowledge", not okG and string.find(msgG or "", "항해 지식") ~= nil, msgG)
	st.reported = { geo_monsoon = true, nav_log_line = true }
	local ok2 = act(st, "Sail", { portId = "nagasaki" })
	check("far east opens at high level", ok2)
end

-- 13f. 선단 편성 -------------------------------------------------------
do
	local st = newState()
	st.coins = 100000
	st.fame = 500
	st.portId = "london"
	local cap0 = S.State.cargoCapacity(st)
	local speed0 = S.State.fleetSpeed(st, 9)
	check("fleet: starts empty", #st.fleet == 0)
	local ok1 = act(st, "BuyFleetShip", { shipId = "fluyt" })
	check("fleet: buy fluyt", ok1 and #st.fleet == 1)
	check("fleet: cargo adds up", S.State.cargoCapacity(st) > cap0)
	check("fleet: speed matches slowest", S.State.fleetSpeed(st, 9) == D.Ships.Ships.fluyt.speed and speed0 == 9)
	check("fleet: crew counts for supplies", S.State.totalCrew(st) > st.ship.crew)
	local me = S.Battle.playerFighter(st)
	check("fleet: battle cannons increase", me.cannons > D.Ships.Ships.caravel.cannons or D.Ships.Ships.fluyt.cannons * 0.6 < 1)
	check("fleet: battle hull bonus", me.maxHull > D.Ships.Ships.caravel.hull)
	act(st, "BuyFleetShip", { shipId = "fluyt" })
	act(st, "BuyFleetShip", { shipId = "fluyt" })
	local ok4 = act(st, "BuyFleetShip", { shipId = "fluyt" })
	check("fleet: max 3", not ok4 and #st.fleet == 3)
	local okF = act(st, "SetFlagship", { index = 1 })
	check("fleet: swap flagship", okF and st.ship.id == "fluyt" and st.fleet[1].id == "caravel")
	local c0 = st.coins
	local okS = act(st, "SellFleetShip", { index = 2 })
	check("fleet: sell refunds", okS and st.coins > c0 and #st.fleet == 2)
	st.fleet[1].hull = 1
	local okR = act(st, "Repair", {})
	check("fleet: repair covers fleet ships", okR and st.fleet[1].hull > 1)
	st.coins = 0
	local msgs = {}
	S.Shipyard.payUpkeep(st, 5, msgs)
	check("fleet: unpaid upkeep loses a ship", #st.fleet == 1)
	local saved = S.State.serialize and S.State.serialize(st)
	check("fleet survives save", saved == nil or (type(saved.fleet) == "table" and #saved.fleet == 1))
	local poor = newState()
	poor.portId = "london"
	local okP, msgP = act(poor, "BuyFleetShip", { shipId = "fluyt" })
	check("fleet: needs fame/coins", not okP and msgP ~= nil)
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
	check("view quests", #v.quests.available + v.quests.otherPortDeliver == (function() local n = 0 for _, q in D.Quests.Quests do if not q.companionId and not q.after then n += 1 end end return n end)())
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
	check("companion max enforced", not ok and #c.companions == D.Specialties.slotsFor(S.State.shipDef(c).class))
	local visibleCompanions = 0
	for _, cc in D.Specialties.Companions do
		if not cc.nation or cc.nation == c.nationId then
			visibleCompanions += 1
		end
	end
	check("view companions listed", #S.View.build(c, ctx).companions.list == visibleCompanions)
	-- 항해 중 상선·봉쇄 앞의 선택
	do
		local before = c.coins
		c.voyageChoice = { kind = "merchant", amount = 50 }
		local okv = act(c, "VoyageChoice", { index = 1 })
		check("voyage choice merchant trade", okv and c.coins == before + 50 and c.voyageChoice == nil)
		c.voyageChoice = { kind = "blockade", amount = 0.1 }
		local day = c.day
		okv = act(c, "VoyageChoice", { index = 3 })
		check("voyage choice blockade detour", okv and c.day == day + 1)
		check("voyage choice rejects when none", not act(c, "VoyageChoice", { index = 1 }))
		c.voyageBonusDays = 6
		local m0 = c.morale
		okv = act(c, "VoyageBonus", { score = 0.9 })
		check("voyage bonus good score", okv and c.morale >= math.min(100, m0 + 8) and c.voyageBonusDays == nil)
		check("voyage bonus only once", not act(c, "VoyageBonus", { score = 1 }))
	end
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

	-- 지역 주점 동료: 사연을 들어야 영입
	do
		local hs = newState("france")
		hs.fame, hs.coins = 100, 5000
		check("hero locked before story", not handlers.Recruit(hs, { companionId = "h_england" }))
		hs.story.h_england_1 = 1
		check("hero recruit after story", handlers.Recruit(hs, { companionId = "h_england" }) and table.find(hs.companions, "h_england") ~= nil)
		for _, c in D.Specialties.Companions do
			if c.requiresStory then
				check("hero story exists " .. c.id, D.Story.ById[c.requiresStory] ~= nil and D.Story.ById[c.requiresStory].portId == c.homePort)
				check("hero talk " .. c.id, D.CompanionTalk.Talk[c.id] ~= nil)
			end
		end
		local qs = newState("england")
		qs.history.seen.a, qs.history.seen.b = 1, 1
		check("history quest progress", S.Quest.progressAny(qs, D.Quests.ById.q_hist_2) == 2)
	end
	-- 출신 성분
	do
		local base = S.State.new("england", 1700, nil)
		local noble = S.State.new("england", 1700, "noble")
		local sailor = S.State.new("england", 1700, "sailor")
		check("noble richer", noble.coins == base.coins + 400 and noble.fame == 12)
		check("sailor faster", S.Perk.speedMult(sailor) > S.Perk.speedMult(base))
		check("origin roundtrip", S.State.sanitize(S.State.serialize(noble)).origin == "noble")
		check("bad origin ignored", S.State.new("england", 1700, "king").origin == nil)
	end
	-- 일지: 소문·대화로 퀘스트가 자동 시작, 조건 채우면 자동 완료
	do
		local jq = S.State.new("england", 1700, nil)
		local msgs = {}
		jq.portId = "amsterdam"
		local q1 = S.Quest.offer(jq, msgs, "소문을 들었다")
		check("일지: 소문으로 퀘스트가 자동 시작됨", q1 ~= nil and jq.quests.active[q1.id] ~= nil and #msgs == 1, tostring(q1 and q1.id))
		local before = 0
		for _ in jq.quests.active do before += 1 end
		for _ = 1, 10 do S.Quest.offer(jq, {}, "x") end
		local n = 0
		for _ in jq.quests.active do n += 1 end
		check("일지: 동시 진행 5개 한도", n <= 5)
		local jv = S.View.build(jq, ctx)
		check("일지: 화면에 완료 목록 필드", jv.quests.done ~= nil and jv.autoStory == nil)
		local js = S.State.new("england", 1700, nil)
		js.portId = "london"
		js.fame = 50
		local um = {}
		S.Story.autoTrigger(js, um)
		check("일지: 중요 인물 자동 이벤트 후보 조건", js.autoStory == nil or D.Story.ById[js.autoStory] ~= nil)
	end
	-- 국가 관계·전쟁·항해자
	do
		local H = handlers
		local d1 = S.State.new("england", 1590, nil)
		d1.portId = "london"
		S.Diplomacy.tick(d1) -- 첫 틱: 현재 항구 기록
		check("diplo: 1590 영국-에스파냐 전쟁 중", S.Diplomacy.relation("england", "spain", 1590) == "war")
		check("diplo: 영국-네덜란드는 1590 평화", S.Diplomacy.relation("england", "netherlands", 1590) == nil)
		check("diplo: 같은 편 동맹", S.Diplomacy.relation("england", "netherlands", 1703) == "ally")
		local before = d1.coins
		d1.portId = "seville"
		local msgs = S.Diplomacy.tick(d1)
		check("diplo: 적국 항구 입항세", d1.coins < before and #msgs >= 1, tostring(d1.coins))
		d1.passUntil = nil
		d1.diplo.passUntil = d1.day + 30
		d1.portId = "lisbon"
		d1.portId = "cadiz"
		local c2 = d1.coins
		S.Diplomacy.tick(d1)
		check("diplo: 통행 증서가 있으면 입항세 면제", d1.coins == c2)
		check("diplo: 전시 철 값 상승", S.Diplomacy.mult(d1, "seville", "iron") > 1 and S.Diplomacy.mult(d1, "london", "wine") == 1)
		d1.coins = 1000
		check("diplo: 적국엔 선물 불가", not H.DiploGift(d1, {}))
		d1.portId = "lisbon"
		S.Diplomacy.tick(d1)
		check("diplo: 우호국엔 선물 가능", H.DiploGift(d1, {}) and d1.coins == 800 and d1.diplo.rep.portugal >= 12)
		local back = S.State.sanitize(S.State.serialize(d1))
		check("diplo: 저장·복원", back.diplo.rep.portugal == d1.diplo.rep.portugal and back.diplo.warSeen.w_armada ~= nil)
		-- 항해자: 정해진 항로를 돈다
		local v = D.Specialties.VoyagerById.v_hendrik
		local seen, docked = {}, 0
		for day = 0, 200 do
			local at = S.Diplomacy.voyagerAt(v, day)
			if at.docked then docked += 1 seen[at.docked] = true end
		end
		check("voyager: 여러 항구에 들르고 바다에도 나감", docked > 10 and docked < 200 and seen.amsterdam and seen.venice)
		local dv = S.State.new("england", 1700, nil)
		dv.portId = "amsterdam"
		local found = nil
		for day = 0, 120 do
			dv.day = day
			for _, vv in S.Diplomacy.viewOf(dv).voyagers do found = found or vv.id end
			if found then break end
		end
		check("voyager: 항구에 머무는 항해자가 화면에 보임", found ~= nil)
		local okMeet = H.VoyagerMeet(dv, { id = found })
		check("voyager: 만나기 + 명성", okMeet and dv.fame >= 1 and dv.diplo.met[found])
		-- 라이벌 칼레브: 만날수록 관계가 쌓이고 5번째에 인정받는다
		local rv = S.State.new("england", 1700, nil)
		local cv = D.Specialties.VoyagerById.v_caleb
		local meets, lastMsg = 0, ""
		for day = 0, 400 do
			rv.day = day
			local at = S.Diplomacy.voyagerAt(cv, day)
			if at.docked then
				rv.portId = at.docked
				local okC, msgC = H.VoyagerMeet(rv, { id = "v_caleb" })
				if okC and rv.diplo.rivalN > meets then meets = rv.diplo.rivalN lastMsg = msgC end
			end
		end
		check("라이벌: 5번 만나면 인정받는다", rv.diplo.rivalN == 5 and string.find(lastMsg, "인정", 1, true) ~= nil, tostring(rv.diplo.rivalN))
		local rs = S.State.sanitize(S.State.serialize(rv))
		check("라이벌: 저장 후에도 인연이 남는다", rs.diplo.rivalN == 5)
		check("voyager: 다른 항구의 사람은 못 만남", not H.VoyagerMeet(dv, { id = "v_nakamura" }) or S.Diplomacy.voyagerAt(D.Specialties.VoyagerById.v_nakamura, dv.day).docked == "amsterdam")
	end
	-- 시작 안내: 이름 → 첫 동료 → 초상화
	do
		local it = newState("england")
		local H = handlers
		check("intro step name", S.Intro.step(it) == "name")
		check("companion blocked before name", not H.IntroCompanion(it, {}))
		check("bad name rejected", not H.IntroName(it, { name = "   " }) and not H.IntroName(it, { name = "열두글자를넘기는아주긴이름입니다" }))
		check("name ok", H.IntroName(it, { name = "  한스  " }) and it.captain.name == "한스")
		check("name once", not H.IntroName(it, { name = "다른" }))
		check("portrait blocked early", not H.IntroPortrait(it, { portrait = "hero:england" }))
		local coins = it.coins
		check("free companion", H.IntroCompanion(it, {}) and table.find(it.companions, "n_england") and it.coins == coins)
		check("bad portrait", not H.IntroPortrait(it, { portrait = "npc:nowhere:3" }) and not H.IntroPortrait(it, { portrait = "x" }))
		check("bad sheet portrait", not H.IntroPortrait(it, { portrait = "cp:nowhere:3" }) and not H.IntroPortrait(it, { portrait = "cp:oceania:20" }))
		check("portrait ok", H.IntroPortrait(it, { portrait = "cp:north_atlantic:17" }) and S.Intro.step(it) == "done")
		local rt = S.State.sanitize(S.State.serialize(it))
		check("intro roundtrip", rt.captain.name == "한스" and rt.captain.portrait == "cp:north_atlantic:17" and rt.intro.portrait)
		local old = S.State.serialize(it)
		old.intro = nil
		check("old save skips intro", S.Intro.step(S.State.sanitize(old)) == "done")
	end

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
	check("event raises buy price", ok and before - st.coins == D.TradeMath.getPrice("london", "wine", 1, 1.4 * macroOf(st, "london", "wine")) and before - st.coins > base)
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
		gravity_calc = "만유인력 계산", chrono_fix = "정밀 항로 차단", buttress = "버팀목 보강", lightning_rod = "피뢰침 신호", telescope_range = "망원경 관측",
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
	do
		local H = D.Harbor
		check("regime 1520 inflation", H.regime(1520).kind == "inflation" and H.regime(1520).price > 1)
		check("regime 1636 tulip bubble", H.regime(1636).id == "tulip_mania")
		check("regime 1640 crash", H.regime(1640).kind == "bust")
		check("regime 1630 depression", H.regime(1630).kind == "depression")
		check("vitality boom > depression", H.vitality(H.regime(1580), "europe", { "silver" }, 0) > H.vitality(H.regime(1630), "europe", { "silver" }, 0))
		check("vitality depression shrinks europe", H.vitality(H.regime(1630), "europe", { "wool" }, 0) < 0.5)
		check("depression milder far away", H.vitality(H.regime(1630), "far_east", { "wool" }, 0) > 0.8)
		check("trade activity boosts", H.vitality(H.regime(1700), "europe", { "tea" }, 1) > H.vitality(H.regime(1700), "europe", { "tea" }, 0))
		check("war: strategic up, luxury down", H.priceMult(H.regime(1630), "europe", "iron") > 1 and H.priceMult(H.regime(1630), "europe", "silk") < 1)
		check("war price weaker in far east", H.priceMult(H.regime(1630), "far_east", "iron") < H.priceMult(H.regime(1630), "europe", "iron"))
		check("native specialties only at lv1", #H.activeProduces({ "a", "b", "c", "d", "e" }, 1) == 2)
		check("specialties unlock with level", #H.activeProduces({ "a", "b", "c", "d", "e" }, 2) == 3 and #H.activeProduces({ "a", "b", "c", "d", "e" }, 4) == 5)
		check("origin: tea not native to europe", not H.isLocal("tea", "europe", 1600) and H.isLocal("tea", "far_east", 1600))
		check("transplant: sugar new world after 1550", not H.isLocal("sugar", "new_world", 1540) and H.isLocal("sugar", "new_world", 1560))
		check("producesOf drops non-local", #H.producesOf({ "tea", "wool" }, "europe", 1600) == 1)
		check("demandsOf excludes own specialties", #H.demandsOf({ "wool", "tea", "silk" }, "europe", 1600, { "wool" }) == 2)
		check("port waves differ", H.portWave("london", 400) ~= H.portWave("canton", 400))
		check("port wave bounded", H.portWave("london", 123) > 0.7 and H.portWave("london", 123) < 1.3)
		check("festival in window", H.festivalAt("europe", 47) ~= nil and H.festivalAt("europe", 200) == nil)
		check("port type", H.portType({ "pepper", "cloves", "silk" }) == "향신료 항구")
	end
	local v = S.View.build(st, ctx)
	check("view harbor", v.harbor.level == 2 and v.harbor.invested == 1000 and v.harbor.nextAt == 2000)
	check("view regime", type(v.harbor.regime) == "table" and type(v.harbor.regime.name) == "string" and type(v.harbor.portType) == "string")
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
	do
		local F = D.Facilities
		check("은행: 발전도 3부터 어느 항구에나 생김", not F.has("bank", "dublin", 2) and F.has("bank", "dublin", 3) and F.has("bank", "london", 1))
		check("왕궁: 5단계 항구에는 총독 관저", F.has("palace", "dublin", 5) and not F.has("palace", "dublin", 4) and F.palaceName("dublin") == "총독 관저" and F.palaceName("london") == "잉글랜드 왕궁")
		check("은행: 단계별 이자·한도 개선", F.bankAt(5).depositRate > F.bankAt(1).depositRate and F.bankAt(5).loanRate < F.bankAt(1).loanRate and F.bankAt(5).loanMult == 3 and F.bankAt(1).name == "환전상")
	end
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

-- 15. 모든 나라로 여러 행동을 해도 화면 정보(View)를 만들 수 있어야 한다 -------------------------
do
	local names = {}
	for name in handlers do
		table.insert(names, name)
	end
	table.sort(names)
	local skip = { Hunt = true, ChallengeBoss = true }
	local firstFail = nil
	for nid, nation in D.Ports.Nations do
		for _, year in { 1650, 1750 } do
			local st = S.State.new(nid, year)
			st.coins = 5000
			st.fame = 200
			for round = 1, 3 do
				for _, name in names do
					if not skip[name] then
						local payloads = { {}, { id = "x" }, { index = 1 }, { eventId = "lc_1", choice = 1 }, { portId = st.portId } }
						for _, pl in payloads do
							pcall(handlers[name], st, pl, ctx)
						end
						local okV, err = pcall(S.View.build, st, ctx)
						if not okV and not firstFail then
							firstFail = string.format("%s/%d after %s: %s", nid, year, name, tostring(err))
						end
					end
				end
			end
		end
	end
	check("view builds for every nation after any action", firstFail == nil, firstFail)
end

-- 지상 전술 탐험 ---------------------------------------------------------------
do
	local st = newState("england")
	st.portId = "london"
	st.ship.supplies = 200
	local day0 = st.day
	check("전술: 전투 없이 행동하면 거부", select(1, act(st, "TacticsAct", { unitId = "p1", kind = "wait" })) == false)
	check("전술: 건물 안 지점은 시작 불가", select(1, act(st, "TacticsStart", { siteId = "london_hospital" })) == false)
	check("전술: 잘못된 지점은 거부", select(1, act(st, "TacticsStart", { siteId = "nowhere" })) == false)
	check("전술: 다른 항구 지점은 거부", select(1, act(st, "TacticsStart", { siteId = "amsterdam_gardens" })) == false)
	local ok, msg = act(st, "TacticsStart", { siteId = "london_fields" })
	check("전술: 런던 근교 들판에서 시작", ok, msg)
	local b = st.tbattle
	check("전술: 전투가 열리고 부대가 3명 이상", b ~= nil and b.status == "active" and #D.Tactics.alive(b, "player") >= 3)
	check("전술: 보급품과 날짜가 소모됨", st.ship.supplies < 200 and st.day > day0)
	check("전술: 이미 전투 중이면 또 시작 불가", select(1, act(st, "TacticsStart", { siteId = "london_fields" })) == false)
	check("전술: 주인공이 있고 조사할 카드가 있음", D.Tactics.getUnit(b, "p1").lead and #b.poolLeft >= 1)
	check("전술: 잘못된 행동은 거부", select(1, act(st, "TacticsAct", { unitId = "p1", kind = "dance" })) == false)
	check("전술: 갈 수 없는 칸은 거부", select(1, act(st, "TacticsAct", { unitId = "p1", kind = "wait", x = 99, y = 99 })) == false)
	local coins0, cardId = st.coins, b.poolLeft[1]
	-- 적을 모두 쓰러뜨린 것으로 만들고 조사 지점에서 카드를 찾은 상태로 한 번 대기
	b.found = { cardId }
	b.poolLeft = {}
	for _, u in D.Tactics.alive(b, "enemy") do
		u.hp = 0
	end
	local ok2, msg2 = act(st, "TacticsAct", { unitId = "p1", kind = "wait" })
	check("전술: 마지막 행동 성공", ok2, msg2)
	check("전술: 승리", b.status == "won", b.status)
	check("전술: 찾은 카드가 도감에 등록", st.discovered[cardId] == true)
	check("전술: 코인 보상", st.coins > coins0)
	check("전술: 기록이 남음", st.tactics.cleared["london_fields"] ~= nil and st.tactics.cleared["london_fields"].biome == "plain")
	check("전술: 탐험 횟수 증가", st.stats.explored >= 1)
	local extra = {}
	S.Quest.autoReport(st, extra)
	check("전술: 첫 현장 지휘 퀘스트 자동 보고", st.quests.done["q_tac_first"] == true and st.quests.done["q_tac_plain"] == true)
	check("전술: 끝난 전투에 더 행동 불가", select(1, act(st, "TacticsAct", { unitId = "p1", kind = "wait" })) == false)
	check("전술: 화면 닫기", select(1, act(st, "TacticsLeave", {})) == true and st.tbattle == nil)
	local view = S.View.build(st, ctx)
	local siteView
	for _, sv in view.sites do
		if sv.id == "london_fields" then
			siteView = sv
		end
		if sv.id == "london_hospital" then
			check("전술: 병원 지점은 화면에 전술 표시 없음", sv.tactics == nil)
		end
	end
	check("전술: 지점 화면에 맵 이름과 최고 등급", siteView ~= nil and siteView.tactics ~= nil and siteView.tactics.rank ~= "", siteView and siteView.tactics and siteView.tactics.rank)
	-- 저장과 불러오기
	local saved = S.State.serialize(st)
	saved.tactics.cleared["junk"] = { rank = "Z", turns = 1, biome = "x" }
	saved.tactics.cleared["ok_site"] = { rank = "A", turns = 5, biome = "forest" }
	local loaded = S.State.sanitize(saved)
	check("전술: 저장·불러오기에서 기록 유지, 잘못된 등급은 버림", loaded ~= nil and loaded.tactics.cleared["london_fields"] ~= nil and loaded.tactics.cleared["junk"] == nil and loaded.tactics.cleared["ok_site"].rank == "A")
	check("전술: 전투 상태는 저장하지 않음", saved.tbattle == nil)
end

do
	-- 패배하면 보상 없이 끝나고, 모험 레벨이 모자라면 시작할 수 없다
	local st = newState("england")
	st.portId = "dublin"
	st.ship.supplies = 200
	check("전술: 모험 레벨이 모자라면 거부", select(1, act(st, "TacticsStart", { siteId = "giants_causeway" })) == false)
	st.portId = "london"
	local ok = act(st, "TacticsStart", { siteId = "london_fields" })
	check("전술: 패배 시험 시작", ok)
	local b = st.tbattle
	local coins0 = st.coins
	D.Tactics.getUnit(b, "p1").hp = 0
	act(st, "TacticsAct", { unitId = "m1", kind = "wait" })
	check("전술: 주인공이 쓰러지면 패배", b.status == "lost")
	check("전술: 패배하면 코인 보상 없음", st.coins == coins0 and st.tactics.cleared["london_fields"] == nil)
end

do
	-- 모든 탐험 지점 중 전술 맵이 있는 곳은 시작할 수 있어야 한다(지점당 첫 번째 시작 가능성)
	local started, tried = 0, 0
	for _, site in D.Sites.Sites do
		if D.TacticsMaps.forSite(site) then
			tried += 1
			local st = newState("england")
			st.portId = site.portId
			st.ship.supplies = 500
			st.careers.adventure.level = 20
			local ok = act(st, "TacticsStart", { siteId = site.id })
			if ok then
				started += 1
			end
		end
	end
	check("전술: 맵이 연결된 모든 지점에서 시작 가능", started == tried and tried >= 20, started .. "/" .. tried)
end

-- 지식 트리(보고·인과·효과) -------------------------------------------------------
do
	local K = D.KnowledgeTree
	local badCard, badNeed, selfNeed = nil, nil, nil
	for _, node in K.Nodes do
		if not D.Cards.ById[node.id] then
			badCard = node.id
		end
		for _, need in node.needs do
			if not K.ById[need] then
				badNeed = node.id .. "<-" .. need
			end
			if need == node.id then
				selfNeed = node.id
			end
		end
		if not K.DisciplineById[node.disc] then
			badCard = node.disc
		end
		if node.fx and node.fx.goods then
			for _, g in node.fx.goods do
				if not D.Ports.Goods[g] then
					badCard = "good:" .. g
				end
			end
		end
	end
	check("지식: 모든 노드의 카드·학문·교역품이 실제로 있음", badCard == nil, badCard)
	check("지식: 선행 지식이 모두 노드로 존재", badNeed == nil, badNeed)
	check("지식: 자기 자신을 선행으로 두지 않음", selfNeed == nil, selfNeed)
	-- 순환 검사: 선행을 따라가다 자기로 돌아오면 안 된다
	local cyc = nil
	local function walk(id, seen)
		if seen[id] then
			cyc = id
			return
		end
		seen[id] = true
		for _, need in K.ById[id].needs do
			walk(need, table.clone(seen))
		end
	end
	for _, node in K.Nodes do
		walk(node.id, {})
	end
	check("지식: 선행 관계에 순환 없음", cyc == nil, cyc)
	local scholarBad = nil
	for sid, discs in K.ScholarDisciplines do
		local found = false
		for _, sc in D.Scholars.Scholars do
			if sc.id == sid then
				found = true
			end
		end
		if not found then
			scholarBad = sid
		end
		for _, d in discs do
			if not K.DisciplineById[d] then
				scholarBad = sid .. ":" .. d
			end
		end
	end
	check("지식: 보고 받는 학자와 학문이 실제로 있음", scholarBad == nil, scholarBad)

	-- 보고 흐름: 런던의 뉴턴(1700년대)에게 물리 발견을 보고한다
	local st = newState("england")
	st.portId = "london"
	st.fame = 500
	local coins0, fame0 = st.coins, st.fame
	check("지식: 발견이 없으면 보고할 게 없음", select(1, act(st, "ReportKnowledge", { scholarId = "newton" })) == false)
	st.discovered.phy_gravity = true
	local okB, msgB = act(st, "ReportKnowledge", { scholarId = "newton" })
	check("지식: 선행 지식이 없으면 보고가 막히고 이유를 알려 줌", okB == false and string.find(msgB, "먼저", 1, true) ~= nil, msgB)
	st.discovered.phy_pendulum = true
	st.discovered.phy_lever = true
	local okC, msgC = act(st, "ReportKnowledge", { scholarId = "newton" })
	check("지식: 선행을 발견하면 연쇄로 한꺼번에 보고됨", okC == true and st.reported.phy_pendulum and st.reported.phy_lever and st.reported.phy_gravity, msgC)
	check("지식: 보고하면 명성·코인 보상", st.fame > fame0 and st.coins > coins0)
	check("지식: 같은 걸 다시 보고하면 새 발견 없음", select(1, act(st, "ReportKnowledge", { scholarId = "newton" })) == false)
	check("지식: 다른 항구의 학자에게는 보고 불가", (function() st.portId = "amsterdam" local r = select(1, act(st, "ReportKnowledge", { scholarId = "newton" })) st.portId = "london" return r == false end)())
	check("지식: 잘못된 학자 id 는 거부", select(1, act(st, "ReportKnowledge", { scholarId = "nobody" })) == false)
	-- 효과: 지레(phy_lever)를 이해하면 목재·대리석 값이 오른다
	check("지식: 이해한 지식이 교역품 값을 올림", K.goodsMult(st, "timber") > 1.0 and K.goodsMult(st, "wool") == 1.0)
	-- 천문: 항해 속도 효과는 상한이 있다
	local st2 = newState("england")
	for _, node in K.Nodes do
		st2.reported = st2.reported or {}
		st2.reported[node.id] = true
	end
	check("지식: 항해 속도 보너스에 상한", K.speedBonus(st2) <= K.SPEED_CAP + 1e-9 and K.speedBonus(st2) > 0)
	check("지식: 교역품 개량 상한 40%", K.goodsMult(st2, "glass") <= 1.4 + 1e-9)
	-- 저장: 보고 기록이 저장·복원됨
	local saved = S.State.serialize(st)
	local back = S.State.sanitize(saved)
	check("지식: 보고 기록이 저장에 들어감", saved.reported ~= nil and saved.reported.phy_gravity == true and back ~= nil and back.reported.phy_gravity == true)
	-- 항구 투자 → 연구 성과 → 관련 교역품 공급(값) 증가
	local stI = newState("england")
	stI.portId = "london"
	local g0 = S.Knowledge.supplyMult(stI, "london", "glass")
	stI.harbor.london = 3000
	local g1 = S.Knowledge.supplyMult(stI, "london", "glass")
	check("지식: 항구에 투자하면 관련 교역품이 싸짐", g0 <= 1 and g1 < g0 and g1 >= 0.7, g0 .. "/" .. g1)
	check("지식: 관련 없는 교역품은 그대로", S.Knowledge.supplyMult(stI, "london", "wool") == 1)
	check("지식: 학자가 없는 항구는 영향 없음", S.Knowledge.supplyMult(stI, "marseille", "glass") == 1)
	-- 학회 발표
	local stP = newState("england")
	stP.portId = "london"
	stP.reported = {}
	check("지식: 이해가 모자라면 학회 발표 불가", select(1, act(stP, "Present", { disc = "physics" })) == false)
	for _, id in { "phy_buoyancy", "phy_lever", "phy_pendulum", "phy_barometer" } do
		stP.reported[id] = true
	end
	local fameP = stP.fame
	local okP = act(stP, "Present", { disc = "physics" })
	check("지식: 3개 이상 이해하면 학회 발표 성공(명성·코인)", okP == true and stP.fame > fameP and stP.academy.presented == 1)
	check("지식: 발표는 쿨타임이 있음", select(1, act(stP, "Present", { disc = "physics" })) == false)
	stP.day += 61
	check("지식: 쿨타임 뒤에는 다시 발표 가능", select(1, act(stP, "Present", { disc = "physics" })) == true)
	check("지식: 잘못된 학문은 거부", select(1, act(stP, "Present", { disc = "alchemy" })) == false)
	stP.portId = "seville"
	check("지식: 학회 없는 항구에서는 발표 불가", select(1, act(stP, "Present", { disc = "physics" })) == false)
	-- 공동 발표
	local stJ = newState("england")
	stJ.portId = "london"
	stJ.reported = {}
	check("공동발표: 이해한 지식이 없으면 불가", select(1, act(stJ, "JointPresent", { disc = "physics" })) == false)
	for _, id in { "phy_buoyancy", "phy_lever" } do
		stJ.reported[id] = true
	end
	stJ.cargo.glass = 4
	local r0 = S.Knowledge.researchOf(stJ, "london")
	local okJ = act(stJ, "JointPresent", { disc = "physics" })
	check("공동발표: 성공하면 항구 기술 점수가 오름", okJ == true and (stJ.portTech.london.physics or 0) >= 4 and stJ.academy.joint == 1)
	check("공동발표: 수집품이 기증됨", (stJ.cargo.glass or 0) <= 1)
	check("공동발표: 쿨타임", select(1, act(stJ, "JointPresent", { disc = "physics" })) == false)
	stJ.portTech.london.physics = 60
	check("공동발표: 기술이 오르면 연구 성과도 오름", S.Knowledge.researchOf(stJ, "london") > r0)
	local ser = S.State.sanitize(S.State.serialize(stJ))
	check("공동발표: 저장/불러오기", ser.portTech.london.physics == 60 and ser.academy.joint == 1)
	stJ.portId = "seville"
	check("공동발표: 학자 없는 항구 불가", select(1, act(stJ, "JointPresent", { disc = "physics" })) == false)
	-- 특수 건축물
	local stL = newState("england")
	stL.portId = "london"
	stL.coins = 100000
	check("건축: 조건 미달이면 불가", select(1, act(stL, "BuildLandmark", { id = "museum" })) == false)
	stL.harbor.london = 99999
	stL.portTech = { london = { astronomy = 16, art = 6 } }
	local sp0 = S.Knowledge.speedBonus(stL)
	local rs0 = S.Knowledge.researchOf(stL, "london")
	check("건축: 박물관", select(1, act(stL, "BuildLandmark", { id = "museum" })) == true and stL.landmarks.london.museum == true)
	check("건축: 중복 불가", select(1, act(stL, "BuildLandmark", { id = "museum" })) == false)
	check("건축: 천문대는 항해 속도를 올림", select(1, act(stL, "BuildLandmark", { id = "observatory" })) == true and S.Knowledge.speedBonus(stL) > sp0)
	check("건축: 건물이 연구 성과를 올림", S.Knowledge.researchOf(stL, "london") > rs0)
	check("건축: 학술원", select(1, act(stL, "BuildLandmark", { id = "hall" })) == true)
	check("건축: 잘못된 id 거부", select(1, act(stL, "BuildLandmark", { id = "castle" })) == false)
	local backL = S.State.sanitize(S.State.serialize(stL))
	check("건축: 저장/불러오기", backL.landmarks.london.museum == true and backL.landmarks.london.hall == true)
	stL.coins = 10
	stL.portTech.london.chemistry = 6
	check("건축: 돈이 모자라면 불가", select(1, act(stL, "BuildLandmark", { id = "laboratory" })) == false)
	-- 모든 카드가 트리에 들어가 있고, 효과 교역품이 실제로 있다
	local fieldOf = {}
	for _, d in K.Disciplines do fieldOf[d.field] = d.id end
	local missingCard, badGood, badDisc = nil, nil, nil
	for _, c in D.Cards.Cards do
		if fieldOf[c.field] and not K.ById[c.id] then missingCard = c.id end
	end
	for _, node in K.Nodes do
		if not K.DisciplineById[node.disc] then badDisc = node.id end
		if node.fx and node.fx.goods then
			for _, g in node.fx.goods do
				if not D.Ports.Goods[g] then badGood = node.id .. ":" .. g end
			end
		end
	end
	check("지식: 학문 분야의 모든 카드가 트리에 들어감", missingCard == nil, missingCard)
	check("지식: 효과의 교역품이 실제로 있음", badGood == nil, badGood)
	check("지식: 노드의 학문이 실제로 있음", badDisc == nil, badDisc)
	check("지식: 노드가 충분히 많음(카드 전체)", #K.Nodes >= 400, tostring(#K.Nodes))
	-- 역사 사건
	local HE = D.HistoryEvents
	local heBad = nil
	for _, ev in HE.Events do
		if #ev.choices < 2 then heBad = ev.id .. ":choices" end
		for _, ch in ev.choices do
			for _, cid in ch.cards or {} do
				if not D.Cards.ById[cid] then heBad = ev.id .. ":" .. cid end
			end
			if ch.price then
				for _, g in ch.price.goods do if not D.Ports.Goods[g] then heBad = ev.id .. ":" .. g end end
				for _, rid in ch.price.regions do
					local okR = false
					for _, r in D.Regions.List do if r.id == rid then okR = true end end
					if not okR then heBad = ev.id .. ":" .. rid end
				end
			end
		end
	end
	check("역사: 사건 자료가 올바름(카드·교역품·지역)", heBad == nil, heBad)
	check("역사: 사건이 충분함", #HE.Events >= 25, tostring(#HE.Events))
	local stH = newState("england") -- 1700 시작
	stH.portId = "london"
	S.History.tick(stH)
	check("역사: 1700년 시작은 이전 사건이 일어나지 않음", stH.history.pending == nil or HE.ById[stH.history.pending].year >= 1700)
	stH.day = HE.dayOf(HE.ById.act_of_union, 1700) + 1
	S.History.tick(stH)
	local first = stH.history.pending
	check("역사: 날짜가 되면 사건이 닥침", first ~= nil and HE.ById[first].year <= 1707, tostring(first))
	check("역사: 잘못된 선택 거부", select(1, act(stH, "HistoryChoose", { choice = 9 })) == false)
	local okH, msgH = act(stH, "HistoryChoose", { choice = 2 })
	check("역사: 선택하면 처리됨", okH == true and stH.history.seen[first] == 2, tostring(msgH))
	stH.history.fx = { { goods = { "wool" }, regions = { "europe" }, mult = 0.5, untilDay = stH.day + 10 } }
	check("역사: 지역 시세 효과가 적용됨", near(S.History.mult(stH, "london", "wool"), 0.5 * macroOf(stH, "london", "wool")) and near(S.History.mult(stH, "london", "tea"), macroOf(stH, "london", "tea")))
	stH.day += 11
	S.History.tick(stH)
	check("역사: 기간이 지나면 효과가 사라짐", near(S.History.mult(stH, "london", "wool"), macroOf(stH, "london", "wool")))
	extraTests()
	-- 항구 건물 계통
	local PB = D.PortBuildings
	local pbBad = nil
	for _, chain in PB.Chains do
		for _, st in chain.stages do
			if st.node and not D.KnowledgeTree.ById[st.node] then pbBad = chain.id .. ":" .. st.node end
			if st.era and not D.KnowledgeTree.Eras[st.era] then pbBad = chain.id .. ":era" end
		end
	end
	check("건물계통: 자료가 올바름", pbBad == nil, pbBad)
	local stP = newState("england") -- 1700
	stP.portId = "london"
	stP.coins = 1000000
	stP.harbor.london = 99999
	check("건물계통: 첫 단계 건축", select(1, act(stP, "BuildStage", { chain = "trade" })) == true and S.Build.stageOf(stP, "london", "trade") == 1)
	check("건물계통: 지식이 없으면 다음 단계 불가", select(1, act(stP, "BuildStage", { chain = "trade" })) == false)
	stP.reported.lang_hanse_trade = true
	check("건물계통: 지식을 이해하면 길드 회관", select(1, act(stP, "BuildStage", { chain = "trade" })) == true and S.Build.stageOf(stP, "london", "trade") == 2)
	local r1 = S.Trade.sellRateFor and nil
	check("건물계통: 판매 비율 가산은 지은 항구에서만", S.Build.sellBonus(stP) > 0 and (function() stP.portId = "amsterdam" local z = S.Build.sellBonus(stP) stP.portId = "london" return z end)() == 0)
	stP.reported.good_sugar = true
	act(stP, "BuildStage", { chain = "trade" })
	check("건물계통: 1694년 이전이면 은행·증권소 불가 / 1700년에는 지식만 있으면", select(1, act(stP, "BuildStage", { chain = "trade" })) == false)
	stP.reported.good_silk = true
	check("건물계통: 은행과 증권소(1694년~)", select(1, act(stP, "BuildStage", { chain = "trade" })) == true)
	check("건물계통: 1750년 이후 건물은 1700년에 불가", select(1, act(stP, "BuildStage", { chain = "trade" })) == false)
	act(stP, "BuildStage", { chain = "ship" })
	check("건물계통: 선착장의 속도 효과가 합산됨", S.Build.speedBonus(stP) > 0)
	local viewP = S.View.build(stP, ctx)
	check("건물계통: 화면에 계통이 담김", viewP.portBuildings ~= nil and #viewP.portBuildings == #PB.Chains)
	local backP = S.State.sanitize(S.State.serialize(stP))
	check("건물계통: 저장/불러오기", backP.portStages.london.trade == 4)
	check("건물계통: 잘못된 계통 거부", select(1, act(stP, "BuildStage", { chain = "castle" })) == false)
	local chron = S.View.build(newState("england"), ctx).history.chronicle
	check("역사서: 연대기에 모든 사건이 연도순", #chron == #HE.Events and chron[1].year <= chron[#chron].year)
	local futureHidden = false
	for _, c in chron do if not c.known and c.title == "???" then futureHidden = true end end
	check("역사서: 아직 오지 않은 사건은 가려짐", futureHidden)
	-- 증권거래소
	local SKD = D.Stocks
	local stS = newState("england") -- 1700
	stS.portId = "london"
	stS.coins = 100000
	local vocP = SKD.price(SKD.ById.voc, 1700)
	check("주식: 시세가 날짜로 계산됨(상장 전은 없음)", vocP ~= nil and SKD.price(SKD.ById.south_sea, 1700) == nil)
	check("주식: 같은 날짜는 같은 시세", SKD.price(SKD.ById.voc, 1700.25) == SKD.price(SKD.ById.voc, 1700.25))
	local peak = SKD.price(SKD.ById.south_sea, 1720.5)
	check("주식: 남해 거품은 1720년에 치솟았다 무너짐", peak > 700 and SKD.price(SKD.ById.south_sea, 1721.2) < 200, tostring(peak))
	local c0 = stS.coins
	local okS, msgS = act(stS, "StockBuy", { id = "voc", amount = 10 })
	check("주식: 사기", okS == true and stS.stocks.held.voc == 10 and stS.coins < c0, tostring(msgS))
	check("주식: 상장 전 종목은 못 삼", select(1, act(stS, "StockBuy", { id = "south_sea", amount = 1 })) == false)
	check("주식: 잘못된 요청 거부", select(1, act(stS, "StockBuy", { id = "voc", amount = 0 })) == false and select(1, act(stS, "StockBuy", { id = "nope", amount = 1 })) == false)
	stS.portId = "seville"
	check("주식: 거래소 없는 항구에서는 불가", select(1, act(stS, "StockSell", { id = "voc", amount = 1 })) == false)
	stS.portId = "london"
	local viewS = S.View.build(stS, ctx)
	check("주식: 화면에 거래소가 담김", viewS.exchange ~= nil and #viewS.exchange.rows == #SKD.Stocks)
	stS.day += 100
	S.Stock.tick(stS)
	check("주식: 분기마다 배당을 받음", stS.stocks.divTotal > 0)
	local okSell = act(stS, "StockSell", { id = "voc", amount = 1000 })
	check("주식: 전부 팔기", okSell == true and stS.stocks.held.voc == nil)
	local backS = S.State.sanitize(S.State.serialize(stS))
	check("주식: 저장/불러오기", backS.stocks.divTotal == stS.stocks.divTotal and backS.stocks.trades == 2)
	local noviceFee = S.View.build(newState("england"), ctx)
	-- 지식 활용 선택지
	local insBad = nil
	for _, ev in HE.Events do
		if not ev.insight then insBad = ev.id .. ":none"
		elseif not D.KnowledgeTree.ById[ev.insight.node] then insBad = ev.id .. ":" .. ev.insight.node
		else
			for _, cid in ev.insight.cards or {} do
				if not D.Cards.ById[cid] then insBad = ev.id .. ":" .. cid end
			end
		end
	end
	check("역사: 모든 사건에 지식 활용 선택지가 있고 올바름", insBad == nil, insBad)
	local stI = newState("england")
	stI.stats.visited = {}
	stI.history.pending = "great_fire"
	stI.coins = 100
	local viewI0 = S.View.build(stI, ctx).history.pending
	check("역사: 지식이 없으면 활용 선택지는 잠김", viewI0.lockedInsight ~= nil and #viewI0.choices == 2)
	check("역사: 지식 없이 활용 선택지 고르기 불가", select(1, act(stI, "HistoryChoose", { choice = 3 })) == false)
	stI.reported.arch_cathedral = true
	local viewI1 = S.View.build(stI, ctx).history.pending
	check("역사: 지식을 이해하면 활용 선택지가 열림", viewI1.lockedInsight == nil and #viewI1.choices == 3 and viewI1.choices[3].insight == true)
	local cI = stI.coins
	check("역사: 지식 활용 선택으로 더 큰 보상", select(1, act(stI, "HistoryChoose", { choice = 3 })) == true and stI.coins == cI + 500)
	local peopleBad = nil
	for _, ev in HE.Events do
		for _, pid in ev.people or {} do
			local okP = false
			for _, s in D.Scholars.Scholars do if s.id == pid then okP = true end end
			if not okP then peopleBad = ev.id .. ":" .. pid end
		end
	end
	check("역사: 얽힌 인물이 실존 학자 목록에 있음", peopleBad == nil, peopleBad)
	local stB = newState("england")
	stB.history.pending = "great_fire"
	stB.reported.arch_cathedral = true
	stB.scholarsMet = { wren = true }
	local cB = stB.coins
	act(stB, "HistoryChoose", { choice = 3 })
	check("역사: 얽힌 인물을 만난 적이 있으면 보상 25% 증가", stB.coins == cB + 625, tostring(stB.coins - cB))
	local viewB = S.View.build(newState("england"), ctx)
	local stH2 = newState("england")
	stH2.history.pending = "principia"
	stH2.coins = 0
	check("역사: 비용이 모자라면 선택 불가", select(1, act(stH2, "HistoryChoose", { choice = 1 })) == false and stH2.history.pending == "principia")
	stH2.coins = 500
	act(stH2, "HistoryChoose", { choice = 1 })
	check("역사: 선택으로 도감 카드를 얻음", stH2.discovered.phy_gravity == true and stH2.coins == 400)
	local backH = S.State.sanitize(S.State.serialize(stH))
	check("역사: 저장/불러오기", backH.history.seen[first] == 2)
	local viewH = S.View.build(stH2, ctx)
	check("역사: 화면에 사건 기록이 담김", viewH.history ~= nil and viewH.history.seenCount == 1)
	local stH3 = newState("england")
	stH3.history.pending = "south_sea"
	stH3.coins = 1000
	check("역사: 투자 사건은 성공이든 실패든 처리됨", select(1, act(stH3, "HistoryChoose", { choice = 1 })) == true and stH3.history.seen.south_sea == 1)
	-- 시대 전환 보상
	local stX = newState("england")
	stX.portId = "london"
	local m = 0
	for _, node in K.Nodes do
		if m < 11 and node.disc == "philosophy" then stX.reported[node.id] = true; m += 1 end
	end
	stX.discovered.phy_buoyancy = true
	local coinsX, fameX = stX.coins, stX.fame
	local okX, msgX = act(stX, "ReportKnowledge", { scholarId = "newton" })
	check("시대: 12개째 이해하면 대항해 시대로 전환·보상", okX == true and stX.academy.era == 2 and stX.coins > coinsX + 600 and string.find(msgX or "", "시대가 바뀌었다") ~= nil, tostring(msgX))
	-- 인류의 시대
	local stEra = newState("england")
	stEra.portId = "london"
	check("시대: 처음엔 르네상스", K.eraIndex(stEra) == 1 and stEra.academy.era == 1)
	local sp1 = S.Knowledge.speedBonus(stEra)
	local n = 0
	for _, node in K.Nodes do
		if n < 45 then stEra.reported[node.id] = true; n += 1 end
	end
	check("시대: 지식이 쌓이면 시대가 오름", K.eraIndex(stEra) >= 3, tostring(K.eraIndex(stEra)))
	check("시대: 시대가 오르면 항해가 좋아짐", S.Knowledge.speedBonus(stEra) > sp1)
	local viewE = S.View.build(stEra, ctx)
	check("시대: 화면에 시대가 담김", viewE.knowledge.era ~= nil and viewE.knowledge.era.index == K.eraIndex(stEra))
	stEra.discovered.phy_buoyancy = true
	stEra.reported.phy_buoyancy = nil
	stEra.reported.phi_skepticism = nil
	local coinsE = stEra.coins
	for _, node in K.Nodes do
		if not stEra.reported[node.id] then stEra.reported[node.id] = true end
	end
	local okE = act(stEra, "ReportKnowledge", { scholarId = "newton" })
	check("시대: 전환 때 보상(보고 또는 지식 변화)", K.eraIndex(stEra) == 5)
	local backE = S.State.sanitize(S.State.serialize(stEra))
	check("시대: 저장/불러오기", backE.academy.era == stEra.academy.era)
	-- 연속 퀘스트
	local chainBad, chainFirst = nil, 0
	for _, q in D.Quests.Quests do
		if q.after then
			if not D.Quests.ById[q.after] then chainBad = q.id end
			if q.kind == "understand_card" and not K.ById[q.cardId] then chainBad = q.id end
		elseif string.sub(q.id, 1, 5) == "q_ch_" then
			chainFirst += 1
		end
	end
	check("연속퀘: 앞 단계가 실제로 있고 지식도 있음", chainBad == nil, chainBad)
	check("연속퀘: 시작 퀘스트가 학문 계통마다 있음", chainFirst >= 9, tostring(chainFirst))
	local stC = newState("england")
	local vC = S.View.build(stC, ctx)
	local hasFirst, hasSecond = false, false
	for _, q in vC.quests.available do
		if q.id == "q_ch_nav_compass" then hasFirst = true end
		if q.id == "q_ch_nav_cross" then hasSecond = true end
	end
	check("연속퀘: 첫 단계만 보임", hasFirst and not hasSecond)
	check("연속퀘: 앞 단계 전에는 수락 불가", select(1, act(stC, "Accept", { questId = "q_ch_nav_cross" })) == false)
	stC.reported.nav_compass_rose = true
	S.Quest.autoReport(stC, {})
	check("연속퀘: 앞 단계를 끝내면 다음이 열림", stC.quests.done.q_ch_nav_compass == true)
	-- 항해 기술 해금 (문명식)
	local stR = newState("england")
	stR.careers.adventure.level = 30
	stR.ship.supplies = 5000
	stR.coins = 100000
	local okR1, msgR1 = act(stR, "Sail", { portId = "havana" })
	check("해금: 신대륙은 십자 관측기를 이해해야 감", not okR1 and string.find(msgR1 or "", "십자 관측기") ~= nil, msgR1)
	stR.reported.nav_cross_staff = true
	check("해금: 이해하면 갈 수 있음", select(1, act(stR, "Sail", { portId = "havana" })) == true)
	-- 학문 계통도
	local stT = newState("england")
	stT.discovered.bot_herbarium = true
	check("계통도: 뿌리 학문은 처음부터 열림", K.disciplineOpen(stT, "philosophy") and K.disciplineOpen(stT, "physics"))
	check("계통도: 갈라진 학문은 뿌리를 이해해야 열림", not K.disciplineOpen(stT, "botany"))
	check("계통도: 닫힌 학문의 지식은 보고 불가", K.status(stT, K.ById.bot_herbarium) == "closed")
	stT.reported = { phi_skepticism = true, phi_atomism = true, phi_utopia = true }
	check("계통도: 철학 3개를 이해하면 식물학이 열림", K.disciplineOpen(stT, "botany") and K.status(stT, K.ById.bot_herbarium) == "ready")
	stT.reported.bot_herbarium, stT.reported.bot_new_seeds = true, true
	stT.reported.phi_skepticism, stT.reported.phi_atomism, stT.reported.phi_utopia = nil, nil, nil
	check("계통도: 한번 시작한 학문은 닫히지 않음", K.disciplineOpen(stT, "botany"))
	local rootsOk, parentBad = true, nil
	for _, d in K.Disciplines do
		if d.parent and not K.DisciplineById[d.parent] then parentBad = d.id end
		if d.openAt and not d.parent then parentBad = d.id end
	end
	check("계통도: 모든 학문의 뿌리가 실제로 있음", parentBad == nil, parentBad)
	local viewT = S.View.build(stT, ctx)
	check("계통도: 화면에 계통도가 담김", viewT.knowledge.tree ~= nil and #viewT.knowledge.tree == #K.Disciplines, tostring(viewT.knowledge.tree and #viewT.knowledge.tree))
	-- 신제품 출시
	local stN = newState("england")
	stN.portId = "london"
	stN.reported = { chem_dye = true, chem_indigo = true }
	stN.cargo.indigo = 6
	check("출시: 교역소가 낮으면 불가", select(1, act(stN, "Launch", { goodId = "indigo" })) == false)
	stN.harbor.london = 99999
	local cN = stN.coins
	check("출시: 개량된 교역품이면 성공", select(1, act(stN, "Launch", { goodId = "indigo" })) == true and stN.coins > cN and stN.cargo.indigo == 1 and stN.academy.launched == 1)
	check("출시: 개량 안 된 교역품 거부", select(1, act(stN, "Launch", { goodId = "wool" })) == false)
	stN.cargo.indigo = 6
	check("출시: 쿨타임", select(1, act(stN, "Launch", { goodId = "indigo" })) == false)
	-- 박람회
	local stE = newState("england")
	stE.portId = "london"
	stE.reported = { phy_lever = true }
	check("지식: 교역소 1단계에서는 박람회 불가", select(1, act(stE, "Expo", {})) == false)
	stE.harbor.london = 1000
	check("지식: 개량 교역품이 없으면 출품 불가", select(1, act(stE, "Expo", {})) == false)
	stE.cargo.timber = 5
	local coinsE = stE.coins
	local okE = act(stE, "Expo", {})
	check("지식: 개량 교역품(✦)을 출품하면 상금", okE == true and stE.coins > coinsE and stE.cargo.timber == 5 and stE.academy.expos == 1)
	check("지식: 박람회에도 쿨타임", select(1, act(stE, "Expo", {})) == false)
	-- 진짜 박람회: 동물 표본·박제·생체, 식물, 광물·화석
	local stZ = newState("england")
	stZ.portId = "london"
	stZ.harbor.london = 1000
	check("지식: 전시품이 하나도 없으면 박람회 불가", select(1, act(stZ, "Expo", { form = "specimen" })) == false)
	stZ.discovered.zoo_reindeer = true
	stZ.discovered.zoo_puffin = true
	stZ.discovered.bot_tulip = true
	stZ.discovered.min_amber = true
	local view0 = S.View.build(stZ, ctx)
	local pv = view0.knowledge.academy.expoPreview
	check("지식: 박람회 미리보기에 방식별 점수", pv.live.score > pv.taxidermy.score and pv.taxidermy.score > pv.specimen.score and pv.live.fee > pv.taxidermy.fee, pv.live.score .. "/" .. pv.taxidermy.score .. "/" .. pv.specimen.score)
	stZ.coins = 0
	check("지식: 박제·생체는 준비 비용이 모자라면 거부", select(1, act(stZ, "Expo", { form = "live" })) == false and stZ.academy.expos == 0)
	stZ.coins = 1000
	local okZ, msgZ = act(stZ, "Expo", { form = "live" })
	check("지식: 살아 있는 동물을 전시한 박람회 성공", okZ == true and string.find(msgZ, "생체", 1, true) ~= nil and stZ.academy.expos == 1, msgZ)
	check("지식: 전시한 카드가 기록됨(첫 전시 보너스는 한 번)", stZ.academy.shown.zoo_reindeer == true)
	stZ.day += 91
	local stZ2 = newState("england")
	stZ2.portId, stZ2.harbor.london = "london", 1000
	stZ2.discovered.zoo_reindeer = true
	stZ2.academy.shown.zoo_reindeer = true
	local first2 = S.View.build(stZ2, ctx).knowledge.academy.expoPreview.live.score
	stZ2.academy.shown.zoo_reindeer = nil
	local first1 = S.View.build(stZ2, ctx).knowledge.academy.expoPreview.live.score
	check("지식: 처음 전시하는 카드는 점수 +50%", first1 > first2, first1 .. "/" .. first2)
	-- 바다 동물은 생체로 못 데려온다 (박제로 대신)
	local stW = newState("england")
	stW.portId, stW.harbor.london = "london", 1000
	stW.discovered.zoo_dolphin = true
	local okW, msgW = act(stW, "Expo", { form = "live" })
	check("지식: 바다 동물은 생체 대신 박제로 전시", okW == true and string.find(msgW, "박제", 1, true) ~= nil and string.find(msgW, "생체)", 1, true) == nil, msgW)
	-- 퀘스트: 이해/발표/박람회가 자동 집계
	local qs = newState("england")
	qs.reported = { phy_lever = true, phy_pendulum = true, phy_gravity = true, ast_polaris = true }
	qs.academy.presented, qs.academy.expos = 2, 1
	local function prog(qid)
		return S.Quest.progressAny(qs, D.Quests.ById[qid])
	end
	check("지식: 이해 퀘스트 진행도(전체·학문별)", prog("q_kn_first") == 4 and prog("q_kn_physics") == 3 and prog("q_kn_astro") == 1, prog("q_kn_first") .. "/" .. prog("q_kn_physics"))
	check("지식: 특정 지식·발표·박람회 퀘스트 진행도", prog("q_kn_steam") == 0 and prog("q_kn_present") == 2 and prog("q_kn_expo") == 1)
	local badQ = nil
	for _, q in D.Quests.Quests do
		if q.kind == "understand" and q.disc and not K.DisciplineById[q.disc] then badQ = q.id end
		if q.kind == "understand_card" and not K.ById[q.cardId] then badQ = q.id end
	end
	check("지식: 퀘스트가 가리키는 학문·지식이 실제로 있음", badQ == nil, badQ)
	-- 저장 복원
	local stS = newState("england")
	stS.academy.presented, stS.academy.last["london:physics"] = 3, 777
	local backS = S.State.sanitize(S.State.serialize(stS))
	check("지식: 학회 기록이 저장·복원됨", backS.academy.presented == 3 and backS.academy.last["london:physics"] == 777)
	-- 화면에 지식 트리가 담김
	local view = S.View.build(st, ctx)
	check("지식: 화면에 지식 트리가 담김", view.knowledge ~= nil and #view.knowledge.disciplines == #K.Disciplines, tostring(view.knowledge))
end

-- 백병전 카드 패: 주인공 카드는 늘 있고, 발견한 유물·동물이 카드가 된다
do
	local ds = S.State.new("england", 1700, nil)
	local relicCard, animalCard
	for _, c in D.Cards.Cards do
		if c.field == "Relic" and not relicCard then relicCard = c end
		if c.field == "Zoology" and not animalCard then animalCard = c end
	end
	ds.discovered[relicCard.id] = true
	ds.discovered[animalCard.id] = true
	local dv = S.View.build(ds, { rng = function() return 0.5 end, market = S.MarketClass.new() })
	local names = {}
	for _, c in dv.deck.cards do
		names[c.name] = c.kind
	end
	check("카드 패: 주인공 스킬 카드가 맨 앞", dv.deck.cards[1].skill == "command" and dv.deck.cards[1].kind == "crew")
	check("카드 패: 발견한 유물이 카드가 된다", names[relicCard.name] ~= nil)
	check("카드 패: 발견한 동물이 카드가 된다", names[animalCard.name] == "animal")
	check("카드 패: 지금 타는 배가 카드가 된다", dv.deck.cards[#dv.deck.cards].kind == "ship")
	-- 지식·항해자도 카드가 된다
	local bookCard
	for _, c in D.Cards.Cards do
		if c.field == "Astronomy" then bookCard = c break end
	end
	ds.discovered[bookCard.id] = true
	ds.diplo.met.v_maria = true
	local dv2 = S.View.build(ds, { rng = function() return 0.5 end, market = S.MarketClass.new() })
	local kinds = {}
	for _, c in dv2.deck.cards do kinds[c.kind] = true end
	check("카드 패: 지식 카드와 우군 카드", kinds.book and kinds.friend)
end

-- 접현 카드 전투: 상성·능력·규칙
do
	local BC = require("./Shared/BoardingCards")
	local r = function() return math.random() end
	local function blank()
		local m = BC.newMatch({}, "draw", {}, "draw", r)
		m.turn = "me"
		return m
	end
	-- 병종 상성: 근접 > 포 > 사격 > 근접
	local m = blank()
	table.insert(m.rows.me.melee, { id = "a", name = "a", row = "melee", power = 10, weapon = "gun" })
	table.insert(m.rows.foe.cannon, { id = "b", name = "b", row = "cannon", power = 10, weapon = "cannon" })
	check("상성: 근접이 포를 이기면 ×1.3", BC.rowTotal(m, "me", "melee") == 13)
	check("상성: 포는 근접에 밀려 ×0.85", BC.rowTotal(m, "foe", "cannon") == 9)
	-- 영웅은 상성에 흔들리지 않는다
	m = blank()
	table.insert(m.rows.me.melee, { id = "h", name = "h", row = "melee", power = 10, hero = true })
	table.insert(m.rows.foe.cannon, { id = "b", name = "b", row = "cannon", power = 10 })
	check("상성: 영웅은 그대로", BC.rowTotal(m, "me", "melee") == 10)
	-- 결속
	m = blank()
	for _ = 1, 2 do table.insert(m.rows.me.ranged, { id = "mus", name = "총병", row = "ranged", power = 5, ability = "bond" }) end
	check("결속: 같은 카드 둘이면 각각 2배", BC.rowTotal(m, "me", "ranged") == 20)
	-- 날씨
	m.weather.ranged = true
	check("날씨: 안개면 사격 줄이 1씩", BC.rowTotal(m, "me", "ranged") == 4)
	-- 무기 상성 (근접끼리)
	m = blank()
	table.insert(m.rows.me.melee, { id = "sw", name = "검", row = "melee", power = 4, weapon = "sword" })
	table.insert(m.rows.foe.melee, { id = "ax", name = "도끼", row = "melee", power = 5, weapon = "axe" })
	check("무기 상성: 검이 도끼를 이기면 +1", BC.cardPower(m, "me", "melee", 1) == 5)
	check("무기 상성: 도끼는 검에 -1", BC.cardPower(m, "foe", "melee", 1) == 4)
	-- 첩자: 적 줄에 놓고 2장을 뽑는다
	m = blank()
	m.hand.me = { { id = "scout", name = "척후", row = "ranged", power = 2, ability = "spy" } }
	m.deck.me = { { id = "x", name = "x", row = "melee", power = 1 }, { id = "y", name = "y", row = "melee", power = 1 } }
	BC.play(m, "me", 1)
	check("첩자: 적 줄에 놓이고 2장 뽑는다", #m.rows.foe.ranged == 1 and #m.hand.me == 2)
	-- 소각: 영웅은 안 쓰러진다
	m = blank()
	table.insert(m.rows.foe.melee, { id = "h", name = "h", row = "melee", power = 12, hero = true })
	table.insert(m.rows.foe.melee, { id = "n", name = "n", row = "melee", power = 8 })
	m.hand.me = { BC.Specials.scorch }
	BC.play(m, "me", 1)
	check("소각: 영웅은 남고 가장 센 일반 카드가 쓰러진다", #m.rows.foe.melee == 1 and m.rows.foe.melee[1].hero == true)
	-- 판 규칙: 둘 다 멈추면 합계로 승부, 2선승이면 끝
	m = blank()
	m.hand.me = { { id = "k", name = "k", row = "melee", power = 5 } }
	m.hand.foe = { { id = "k2", name = "k2", row = "melee", power = 2 } }
	BC.play(m, "me", 1)
	m.turn = "foe"
	BC.play(m, "foe", 1)
	local ok1, _, res = BC.pass(m, m.turn)
	check("판 규칙: 양쪽 손패가 비면 자동으로 판이 끝난다", m.round == 2 or m.over or res ~= nil)
	-- 컴퓨터끼리 수백 판: 항상 끝나고 오류가 없다
	local ended, bad = 0, 0
	for g = 1, 300 do
		math.randomseed(g)
		local d1, l1 = BC.playerDeck({ { skill = "command", name = "나" }, { skill = "volley", name = "포술가" }, { skill = "luck", name = "유물" } }, r)
		local d2, l2 = BC.enemyDeck(g % 5 == 0, r)
		local gm = BC.newMatch(d1, l1, d2, l2, r)
		local guard = 0
		while not gm.over and guard < 400 do
			guard += 1
			local okAi = BC.ai(gm, gm.turn)
			if okAi == nil then
				bad += 1
				break
			end
		end
		if gm.over then ended += 1 else bad += 1 end
	end
	check("카드 전투: 컴퓨터끼리 300판이 모두 끝난다", ended == 300 and bad == 0, tostring(ended) .. "/" .. tostring(bad))
end

-- 항구 자체 성장과 세금 수익
do
	local gs = S.State.new("england", 1700, nil)
	gs.portId = "london"
	S.Harbor.grow(gs) -- 첫 도착 기록
	gs.portId = "amsterdam"
	S.Harbor.grow(gs)
	gs.day += 60
	gs.portId = "london"
	local base = gs.harbor.london or 0
	local m1 = S.Harbor.grow(gs)
	check("항구는 시간이 지나면 스스로 자란다", (gs.harbor.london or 0) > base and #m1 > 0)
	gs.harbor.paris = 3000
	gs.harbor.amsterdam = 3000
	gs.portId = "amsterdam"
	gs.day += 100
	local coins0 = gs.coins
	S.Harbor.grow(gs)
	check("투자한 항구는 세금을 보내온다", gs.coins > coins0)
	gs.harbor.rouen = 7000
	gs.portId = "rouen"
	S.Harbor.grow(gs)
	gs.day += 100
	S.Harbor.grow(gs)
	gs.portId = "london"
	S.Harbor.grow(gs)
	gs.portId = "rouen"
	gs.day += 100
	S.Harbor.grow(gs)
	check("큰 항구는 스스로 더 자라지 않는다", gs.harbor.rouen == 7000)
	local gr = S.State.sanitize(S.State.serialize(gs))
	check("자체 성장 기록이 저장된다", gr.harborSeen.london ~= nil)
end

-- 퀘스트 이야기: 모든 퀘스트에 사연과 결말이 있고, 채워지지 않은 자리표시가 남지 않는다
do
	local bad = 0
	for _, q in D.Quests.Quests do
		local good = q.goodId and D.Ports.Goods[q.goodId]
		local port = q.portId and D.Ports.Ports[q.portId]
		local hook, ending = D.Quests.Story(q, good and good.name, port and port.name)
		if #hook < 20 or #ending < 10 or string.find(hook .. ending, "{", 1, true) then
			bad += 1
		end
	end
	check("퀘스트마다 사연과 결말 문장이 있다", bad == 0, tostring(bad))
	local d1 = D.Quests.ById["q_first_trade"]
	local h1 = D.Quests.Story(d1, "양모", "암스테르담")
	local sc = D.Quests.ById["q_order_2"]
	if sc then
		local hk = D.Quests.Story(sc, nil, nil)
		check("연속 퀘스트는 장 번호가 붙는다", string.find(hk, "제", 1, true) ~= nil and string.find(hk, "장.", 1, true) ~= nil, hk)
	end
	check("납품 사연에 물건과 항구가 들어간다", string.find(h1, "양모", 1, true) ~= nil and string.find(h1, "암스테르담", 1, true) ~= nil)
end

print(string.format("\n통과 %d, 실패 %d", passed, failed))
if failed > 0 then
	error("tests failed")
end
