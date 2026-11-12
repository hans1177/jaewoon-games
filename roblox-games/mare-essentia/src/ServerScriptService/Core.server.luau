--!nonstrict
-- 서버 진입점: GameAction(RemoteFunction) 하나로 모든 요청을 받는다.
-- 판정(가격, 전투, 보상, 저장)은 전부 서버가 하고, 클라이언트는 요청과 표시만 한다.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local ServicesFolder = script.Parent:WaitForChild("Services")

local D = {
	Ports = require(Shared:WaitForChild("Ports")),
	Ships = require(Shared:WaitForChild("Ships")),
	Tech = require(Shared:WaitForChild("Tech")),
	Skills = require(Shared:WaitForChild("Skills")),
	Cards = require(Shared:WaitForChild("KnowledgeCards")),
	Sites = require(Shared:WaitForChild("Sites")),
	Scholars = require(Shared:WaitForChild("Scholars")),
	Quests = require(Shared:WaitForChild("Quests")),
	TradeMath = require(Shared:WaitForChild("TradeMath")),
	Careers = require(Shared:WaitForChild("Careers")),
	Voyage = require(Shared:WaitForChild("Voyage")),
	Combat = require(Shared:WaitForChild("Combat")),
	BoardingCards = require(Shared:WaitForChild("BoardingCards")),
	CardBook = require(Shared:WaitForChild("CardBook")),
	Bosses = require(Shared:WaitForChild("Bosses")),
	Specialties = require(Shared:WaitForChild("Specialties")),
	CompanionTalk = require(Shared:WaitForChild("CompanionTalk")),
	Narrative = require(Shared:WaitForChild("Narrative")),
	Gear = require(Shared:WaitForChild("Gear")),
	Bounties = require(Shared:WaitForChild("Bounties")),
	Fields = require(Shared:WaitForChild("Fields")),
	Collection = require(Shared:WaitForChild("Collection")),
	CardArt = require(Shared:WaitForChild("CardArt")),
	Facilities = require(Shared:WaitForChild("Facilities")),
	Story = require(Shared:WaitForChild("Story")),
	Harbor = require(Shared:WaitForChild("Harbor")),
	SeaRoutes = require(Shared:WaitForChild("SeaRoutes")),
	Regions = require(Shared:WaitForChild("Regions")),
	TacticsData = require(Shared:WaitForChild("TacticsData")),
	Tactics = require(Shared:WaitForChild("Tactics")),
	TacticsMaps = require(Shared:WaitForChild("TacticsMaps")),
	KnowledgeTree = require(Shared:WaitForChild("KnowledgeTree")),
	HistoryEvents = require(Shared:WaitForChild("HistoryEvents")),
	Stocks = require(Shared:WaitForChild("Stocks")),
	People = require(Shared:WaitForChild("People")),
	PeopleTalk = require(Shared:WaitForChild("PeopleTalk")),
	PortOrder = require(Shared:WaitForChild("PortOrder")),
	RoomClock = require(Shared:WaitForChild("RoomClock")),
	WonderScenes = require(Shared:WaitForChild("WonderScenes")),
	WorldEvents = require(Shared:WaitForChild("WorldEvents")),
	PortBuildings = require(Shared:WaitForChild("PortBuildings")),
}

local Registry = require(ServicesFolder:WaitForChild("Registry"))(D)
local S = Registry.S
local QUEST_WATCH = { Explore = true, TacticsAct = true, TacticsCard = true, TacticsEnd = true, Hunt = true, ChallengeBoss = true, Research = true, StartResearch = true, Buy = true, ReportKnowledge = true, HistoryChoose = true, StockBuy = true, BuildStage = true, StockSell = true, Present = true, Expo = true, JointPresent = true, BuildLandmark = true, Launch = true, PeopleTalk = true, PeopleClaim = true, OrderPatrol = true }
local handlers = Registry.handlers

-- [중요] DataStore 이름은 게임 이름이 바뀌어도, 유니버스가 바뀌어도 임의로 바꾸지 않는다. 바꾸면 플레이어 저장이 빈 저장소로 읽혀 전부 초기화된다.
-- 2026-11-08 새 유니버스(10775310508)에서 이 이름으로 저장이 시작됐다. 이름을 바꾸려면 기존 저장 이전(마이그레이션)을 먼저 구현한다.
local STORE_NAME = "MareEssentia_v2"
local RATE_LIMIT = 0.1
local AUTOSAVE_INTERVAL = 15 -- DataStore 쓰기 제한(키당 6초에 1회)을 넘지 않도록 변경된 세션만 이 주기로 저장
local MARKET_INTERVAL = 5
local START_YEARS = { [1517] = true, [1600] = true, [1625] = true, [1650] = true, [1700] = true, [1750] = true }

local random = Random.new()
local market = S.MarketClass.new()
local ctx = {
	rng = function()
		return random:NextNumber()
	end,
	market = market,
}

local Social = require(script.Parent:WaitForChild("Social"))(D, S)

-- 플레이어별 세션. state가 nil이면 새 게임 선택 전이다.
local sessions = {}

local store = nil
do
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(STORE_NAME)
	end)
	if ok then
		store = result
	end
end

-- 명성 랭킹 (서버 전체, OrderedDataStore)
local rankStore = nil
do
	local ok, result = pcall(function()
		return DataStoreService:GetOrderedDataStore("MareFameRank")
	end)
	if ok then
		rankStore = result
	end
end
local rankCache = { at = 0, list = {} }
local nameCache = {}
local function rankingList()
	if os.clock() - rankCache.at < 60 or not rankStore then
		return rankCache.list
	end
	rankCache.at = os.clock()
	local ok, pages = pcall(function()
		return rankStore:GetSortedAsync(false, 10)
	end)
	if not ok then
		return rankCache.list
	end
	local list = {}
	for i, entry in pages:GetCurrentPage() do
		local uid = tonumber(entry.key)
		if uid then
			if not nameCache[uid] then
				local okN, name = pcall(function()
					return Players:GetNameFromUserIdAsync(uid)
				end)
				nameCache[uid] = if okN then name else ("플레이어" .. uid)
			end
			table.insert(list, { rank = i, name = nameCache[uid], fame = entry.value })
		end
	end
	rankCache.list = list
	return list
end

local remote = Instance.new("RemoteFunction")
remote.Name = "GameAction"
remote.Parent = ReplicatedStorage

local function keyFor(player)
	return "P_" .. player.UserId
end

local function loadSession(player)
	local session = { state = nil, lastAction = 0, canSave = true, ready = false }
	if store then
		local ok, saved
		for attempt = 1, 3 do
			ok, saved = pcall(function()
				return store:GetAsync(keyFor(player))
			end)
			if ok then
				break
			end
			task.wait(attempt)
		end
		if ok then
			if saved ~= nil then
				local okS, st = pcall(S.State.sanitize, saved)
				if okS then
					session.state = st
				else
					session.canSave = false
					warn("[Core] sanitize failed:", st)
				end
			end
		else
			-- 읽기에 실패했다면 기존 데이터를 덮어쓰지 않도록 이번 접속은 저장하지 않는다.
			session.canSave = false
			warn("[Core] load failed for", player.Name)
		end
	end
	session.ready = true
	sessions[player] = session
end

local function saveSession(player)
	local session = sessions[player]
	if not session or not session.state or not session.canSave or not store then
		return
	end
	session.dirty = false
	-- 보류된 해전(도망 대기 중)은 저장 전에 확정한다: 접속을 끊어 패배를 피하지 못하게
	if session.state.pendingBattle then
		pcall(S.Battle.resolve, session.state, ctx, false)
	end
	local data = S.State.serialize(session.state)
	local ok, err = pcall(function()
		store:SetAsync(keyFor(player), data)
	end)
	if rankStore then
		pcall(function()
			rankStore:SetAsync(tostring(player.UserId), math.max(0, math.floor(session.state.fame)))
		end)
	end
	if not ok then
		warn("[Core] save failed:", err)
	end
end

local function reply(state, ok, message)
	local result = { ok = ok, message = message or "" }
	if state then
		S.History.tick(state)
		S.Stock.tick(state)
		local news = S.World.tick(state)
		for _, m in S.Diplomacy.tick(state) do
			table.insert(news, m)
		end
		for _, m in S.Harbor.grow(state) do
			table.insert(news, m)
		end
		if #news > 0 then
			result.message = (if result.message ~= "" then result.message .. "\n" else "") .. table.concat(news, "\n")
		end
		if state.pendingScene then
			result.scene = state.pendingScene
			state.pendingScene = nil
		end
		result.view = S.View.build(state, ctx)
	end
	return result
end

local function onInvoke(player, action, payload)
	local session = sessions[player]
	if not session or not session.ready then
		return { ok = false, message = "불러오는 중이에요", loading = true }
	end
	if type(action) ~= "string" then
		return { ok = false, message = "잘못된 요청" }
	end
	if type(payload) ~= "table" then
		payload = {}
	end

	local now = os.clock()
	-- 화면 갱신용 읽기 요청(State)은 속도 제한에서 뺀다: 이것이 직전 클릭을 "너무 빨라요"로 막던 원인
	-- 시작 안내(Intro*)는 한 번만 되는 검증된 동작이라 제한에서 뺀다: 다른 요청과 겹쳐도 막히지 않게
	if action ~= "State" and string.sub(action, 1, 5) ~= "Intro" then
		if now - session.lastAction < RATE_LIMIT then
			return reply(session.state, false, "너무 빨라요")
		end
		session.lastAction = now
	end

	-- 새 게임: 나라와 시작 연도 선택
	if action == "NewGame" then
		if session.state and payload.restart ~= true then
			return reply(session.state, false, "이미 진행 중인 게임이 있어요")
		end
		local nationId = payload.nationId
		local year = payload.startYear
		if type(nationId) ~= "string" or not D.Ports.Nations[nationId] or not START_YEARS[year] then
			return { ok = false, message = "잘못된 선택이에요" }
		end
		local originId = if type(payload.origin) == "string" and D.Specialties.OriginById[payload.origin] then payload.origin else "merchant"
		local newState = S.State.new(nationId, year, originId)
		if D.Specialties.OriginById[originId].supplies then
			newState.ship.supplies += D.Specialties.OriginById[originId].supplies
		end
		if payload.room == true then
			-- 방 시계: 이미 열린 방이 있으면 그 시대로만 들어갈 수 있다
			local info = S.Room.info
			if info and info.startYear ~= year then
				return { ok = false, message = string.format("지금 열린 방은 %d년 시대예요. 같은 시대를 고르거나 혼자 하기를 선택하세요", info.startYear), room = S.Room.publicInfo() }
			end
			S.Room.join(newState)
		end
		session.state = newState
		session.dirty = true
		return reply(session.state, true, string.format("%d년, %s에서 항해를 시작합니다!%s", S.State.year(newState), D.Ports.Ports[newState.portId].name, if newState.room then " (같이 하기: 시대가 현실 시간으로 흘러요)" else ""))
	end

	local state = session.state
	if not state then
		return { ok = false, message = "먼저 나라를 선택하세요", needsNewGame = true, room = S.Room.publicInfo() }
	end
	S.Room.sync(state)

	if action == "State" then
		return reply(state, true, "")
	end

	if Social[action] then
		local ok, success, message, extra = pcall(Social[action], player, state, payload)
		if not ok then
			warn("[Core] social error:", action, success)
			return reply(state, false, "오류가 발생했어요")
		end
		if success and (action == "MailSend" or action == "MailClaim" or action == "MarketPost" or action == "MarketBuy" or action == "MarketCancel") then
			session.dirty = true
		end
		local result = reply(state, success, message)
		if extra then
			for k, v in extra do
				result[k] = v
			end
		end
		return result
	end

	if action == "Ranking" then
		local result = reply(state, true, "")
		result.ranking = rankingList()
		return result
	end

	local handler = handlers[action]
	if not handler then
		return reply(state, false, "알 수 없는 요청")
	end

	local ok, success, message = pcall(handler, state, payload, ctx)
	if not ok then
		warn("[Core] handler error:", action, success)
		return reply(state, false, "오류가 발생했어요")
	end
	if success then
		session.dirty = true -- 저장은 자동저장 루프가 모아서 한다 (응답을 막지 않는다)
		-- 탐험·전투·연구 등으로 퀘스트 조건을 채우면 바로 알려 준다
		local extra = {}
		if QUEST_WATCH[action] then
			S.Quest.autoDeliver(state, extra)
		end
		-- 도감 발견·항구 방문·연구는 퀘스트를 수락하지 않아도 자동으로 보고하고 보상을 준다
		S.Quest.autoReport(state, extra)
		if #extra > 0 then
			message = (message and message ~= "" and (message .. "\n") or "") .. table.concat(extra, "\n")
		end
	end
	return reply(state, success, message)
end
remote.OnServerInvoke = onInvoke

-- Studio 전용: 자동 점검(StudioQA)이 같은 서버 함수를 호출할 수 있게 하는 통로. 라이브 서버에는 만들지 않는다.
if game:GetService("RunService"):IsStudio() then
	local qa = Instance.new("BindableFunction")
	qa.Name = "StudioQAInvoke"
	qa.OnInvoke = function(player, action, payload)
		local session = sessions[player]
		if session then
			session.lastAction = -100 -- 점검은 요청 간격 제한을 받지 않는다
			if action == "QATactics" and session.state then
				-- 지상 전술 화면 점검용: 항구·레벨과 상관없이 지정한 맵으로 전투를 연다(저장·보상 없음)
				local map = D.TacticsMaps.ById[type(payload) == "table" and payload.mapId or "plain_road"] or D.TacticsMaps.ById.plain_road
				local b = D.Tactics.newBattle(map, S.Tactics.buildParty(session.state), { enemyLevel = 1, pool = { "qa_card" } })
				b.siteId, b.siteName, b.biome = "qa_" .. map.id, "점검 맵", map.biome
				session.state.tbattle = b
				return reply(session.state, true, map.intro)
			end
			if action == "QATacticsDump" and session.state and session.state.tbattle then
				local b = session.state.tbattle
				local parts = { string.format("turn=%d phase=%s status=%s", b.turn, b.phase, b.status) }
				for _, u in b.units do
					if u.team == "player" then
						table.insert(parts, string.format("%s(%d,%d)%s", u.id, u.x, u.y, u.acted and "A" or "-"))
					end
				end
				return { ok = true, message = table.concat(parts, " ") }
			end
			if action == "QAKnowledge" and session.state then
				-- 개발 캡처용: 지식 트리·학술 행사 화면을 채워서 보여 주기 위한 상태 (Studio 전용)
				local st = session.state
				st.coins, st.fame = 1e9, math.max(st.fame or 0, 1000)
				st.portId = "london"
				st.harbor.london = 99999
				st.reported = st.reported or {}
				for _, id in { "phi_skepticism", "phi_atomism", "phi_utopia", "phi_rationalism", "phi_empiricism", "phy_buoyancy", "phy_lever", "phy_pendulum", "phy_barometer", "phy_refraction", "ast_polaris", "ast_orion", "chem_dye", "chem_indigo", "geo_trade_winds", "nav_compass_rose" } do
					st.discovered[id] = true
					st.reported[id] = true
				end
				for _, id in { "bot_herbarium", "art_oil_painting", "med_anatomy", "nav_cross_staff" } do
					st.discovered[id] = true
				end
				st.portTech = { london = { physics = 20, art = 7 } }
				st.cargo.indigo = 6
				return { ok = true, message = "knowledge staged" }
			end
			if action == "QAGrant" and session.state then
				session.state.coins = 1e9
				session.state.fame = math.max(session.state.fame or 0, 1000)
				return { ok = true, message = "granted" }
			end
		end
		return onInvoke(player, action, payload)
	end
	qa.Parent = game:GetService("ServerStorage")
end

Players.PlayerAdded:Connect(function(player)
	task.spawn(loadSession, player)
end)
for _, player in Players:GetPlayers() do
	task.spawn(loadSession, player)
end

Players.PlayerRemoving:Connect(function(player)
	saveSession(player)
	sessions[player] = nil
end)

game:BindToClose(function()
	for player in sessions do
		saveSession(player)
	end
end)

-- 자동 저장
task.spawn(function()
	while true do
		task.wait(AUTOSAVE_INTERVAL)
		for player, session in sessions do
			if session.dirty then
				task.spawn(saveSession, player)
			end
		end
	end
end)

-- 항구 가격은 시간이 지나면 기준으로 돌아온다
task.spawn(function()
	while true do
		task.wait(MARKET_INTERVAL)
		market:recover(MARKET_INTERVAL)
	end
end)

-- 시장 사건 (풍년·흉작 등): 1분마다 갱신
task.spawn(function()
	local portIds, goodIds = {}, {}
	for id in D.Ports.Ports do
		table.insert(portIds, id)
	end
	for id in D.Ports.Goods do
		table.insert(goodIds, id)
	end
	table.sort(portIds)
	table.sort(goodIds)
	while true do
		task.wait(60)
		market:tickEvents(ctx.rng, portIds, goodIds)
	end
end)
