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
	Bosses = require(Shared:WaitForChild("Bosses")),
	Specialties = require(Shared:WaitForChild("Specialties")),
	CompanionTalk = require(Shared:WaitForChild("CompanionTalk")),
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
}

local Registry = require(ServicesFolder:WaitForChild("Registry"))(D)
local S = Registry.S
local QUEST_WATCH = { Explore = true, Hunt = true, ChallengeBoss = true, Research = true, StartResearch = true, Buy = true }
local handlers = Registry.handlers

local STORE_NAME = "MareScientia_v2"
local RATE_LIMIT = 0.1
local AUTOSAVE_INTERVAL = 15 -- DataStore 쓰기 제한(키당 6초에 1회)을 넘지 않도록 변경된 세션만 이 주기로 저장
local MARKET_INTERVAL = 5
local START_YEARS = { [1650] = true, [1700] = true, [1750] = true }

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
				session.state = S.State.sanitize(saved)
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
		result.view = S.View.build(state, ctx)
	end
	return result
end

remote.OnServerInvoke = function(player, action, payload)
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
	if now - session.lastAction < RATE_LIMIT then
		return reply(session.state, false, "너무 빨라요")
	end
	session.lastAction = now

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
		session.state = S.State.new(nationId, year)
		session.dirty = true
		return reply(session.state, true, string.format("%d년, %s에서 항해를 시작합니다!", year, D.Ports.Ports[session.state.portId].name))
	end

	local state = session.state
	if not state then
		return { ok = false, message = "먼저 나라를 선택하세요", needsNewGame = true }
	end

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
		if QUEST_WATCH[action] then
			local extra = {}
			S.Quest.autoDeliver(state, extra)
			if #extra > 0 then
				message = (message and message ~= "" and (message .. "\n") or "") .. table.concat(extra, "\n")
			end
		end
	end
	return reply(state, success, message)
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
