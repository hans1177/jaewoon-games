--!nonstrict
-- 서버 진입점: GameAction(RemoteFunction) 하나로 모든 요청을 받는다.
-- 판정(가격, 전투, 보상, 저장)은 전부 서버가 하고, 클라이언트는 요청과 표시만 한다.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")

-- [초기화 진단] 서버가 어느 기존 초기화 단계에서 대기하는지 확인한다.
ReplicatedStorage:SetAttribute("MareCoreStartStage", "require-shared")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local ServicesFolder = script.Parent:WaitForChild("Services")

ReplicatedStorage:SetAttribute("MareCoreStartStage", "require-game-data")
local D = {
	Ports = require(Shared:WaitForChild("Ports")),
	PortEras = require(Shared:WaitForChild("PortEras")),
	SeaCards = require(Shared:WaitForChild("SeaCards")),
	Ships = require(Shared:WaitForChild("Ships")),
	CultureRegions = require(Shared:WaitForChild("CultureRegions")),
	Tech = require(Shared:WaitForChild("Tech")),
	Skills = require(Shared:WaitForChild("Skills")),
	Cards = require(Shared:WaitForChild("KnowledgeCards")),
	Sites = require(Shared:WaitForChild("Sites")),
	Weapons = require(Shared:WaitForChild("Weapons")),
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
	KnowledgeTree = require(Shared:WaitForChild("KnowledgeTree")),
	HistoryEvents = require(Shared:WaitForChild("HistoryEvents")),
	WorldChronicle = require(Shared:WaitForChild("WorldChronicle")),
	EconomyBuildings = require(Shared:WaitForChild("EconomyBuildings")),
	DisciplineFacilities = require(Shared:WaitForChild("DisciplineFacilities")),
	CultureRegions = require(Shared:WaitForChild("CultureRegions")),
	ProductionChains = require(Shared:WaitForChild("ProductionChains")),
	Stocks = require(Shared:WaitForChild("Stocks")),
	People = require(Shared:WaitForChild("People")),
	PeopleTalk = require(Shared:WaitForChild("PeopleTalk")),
	PortOrder = require(Shared:WaitForChild("PortOrder")),
	RoomClock = require(Shared:WaitForChild("RoomClock")),
	WonderScenes = require(Shared:WaitForChild("WonderScenes")),
	WorldEvents = require(Shared:WaitForChild("WorldEvents")),
	PortBuildings = require(Shared:WaitForChild("PortBuildings")),
	TradeFun = require(Shared:WaitForChild("TradeFun")),
	Economy = require(Shared:WaitForChild("Economy")),
}

ReplicatedStorage:SetAttribute("MareCoreStartStage", "require-services")
local Registry = require(ServicesFolder:WaitForChild("Registry"))(D)
local S = Registry.S
local QUEST_WATCH = { Explore = true, Hunt = true, ChallengeBoss = true, Research = true, StartResearch = true, Buy = true, ReportKnowledge = true, HistoryChoose = true, StockBuy = true, BuildStage = true, StockSell = true, Present = true, Expo = true, JointPresent = true, BuildLandmark = true, Launch = true, PeopleTalk = true, PeopleClaim = true, OrderPatrol = true }
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

ReplicatedStorage:SetAttribute("MareCoreStartStage", "require-social")
local Social = require(script.Parent:WaitForChild("Social"))(D, S)

-- 플레이어별 세션. state가 nil이면 새 게임 선택 전이다.
local sessions = {}

-- [선장 초상화 연동 복식] 기존 캡틴 초상 ID로 R15에 시대·지역별 외투를 입힌다. 관절·물리·저장은 유지한다.
local CAPTAIN_CLOTH = {
	north_atlantic = { 47, 68, 94 }, atlantic = { 92, 63, 69 }, mediterranean = { 116, 71, 57 },
	west_africa = { 119, 82, 52 }, africa = { 115, 80, 60 }, east_africa_red_sea = { 69, 104, 101 },
	indian = { 101, 71, 125 }, pacific = { 58, 91, 104 }, oceania = { 69, 111, 90 }, americas = { 101, 75, 58 },
	faith_buddhist = { 117, 83, 51 }, faith_christian = { 75, 73, 92 }, faith_indian_ocean = { 82, 96, 84 },
}
local CAPTAIN_REGION = {
	england = "north_atlantic", netherlands = "north_atlantic", denmark = "north_atlantic", sweden = "north_atlantic",
	france = "atlantic", spain = "mediterranean", portugal = "atlantic", venice = "mediterranean", ottoman = "mediterranean",
	swahili = "east_africa_red_sea", malabar = "indian", china = "pacific", japan = "pacific", korea = "pacific",
	new_spain = "americas",
}
local function applyCaptainAppearance(player, character)
	local session = sessions[player]
	local state = session and session.state
	local portrait = state and state.captain and state.captain.portrait
	if not character or character ~= player.Character or not character.Parent then return end
	local old = character:FindFirstChild("CaptainOutfit")
	if type(portrait) ~= "string" or portrait == "" then
		if old then old:Destroy() end
		character:SetAttribute("CaptainPortraitLook", nil)
		return
	end
	if old and old:GetAttribute("PortraitId") == portrait then return end
	local human = character:FindFirstChildOfClass("Humanoid")
	local chest, waist, head = character:FindFirstChild("UpperTorso"), character:FindFirstChild("LowerTorso"), character:FindFirstChild("Head")
	if not human or human.RigType ~= Enum.HumanoidRigType.R15 or not chest or not waist or not head then return end
	if old then old:Destroy() end
	-- 기존 초상화 세 가지 형식 cp:시트:칸 / hero:국가 / npc:항구:칸.
	local sheet, index = portrait:match("^cp:([%w_]+):(%d+)$")
	if not sheet then
		local nation = portrait:match("^hero:([%w_]+)$")
		if nation then
			sheet = CAPTAIN_REGION[nation]
		else
			local port = portrait:match("^npc:([%w_]+):%d$")
			local where = port and D.Ports.Ports[port]
			sheet = where and CAPTAIN_REGION[where.country]
		end
	end
	local rgb = CAPTAIN_CLOTH[sheet or ""] or CAPTAIN_CLOTH.atlantic
	local coat = Color3.fromRGB(rgb[1], rgb[2], rgb[3])
	local variant = (tonumber(index) or 0) % 4
	if variant == 1 then coat = coat:Lerp(Color3.fromRGB(36, 45, 62), 0.28)
	elseif variant == 2 then coat = coat:Lerp(Color3.fromRGB(165, 101, 71), 0.27)
	elseif variant == 3 then coat = coat:Lerp(Color3.fromRGB(55, 97, 77), 0.26) end
	local trim = Color3.fromRGB(217, 183, 113)
	local ivory = Color3.fromRGB(231, 216, 182)
	local costume = Instance.new("Model")
	costume.Name = "CaptainOutfit"
	costume:SetAttribute("PortraitId", portrait)
	costume:SetAttribute("CultureSheet", sheet or "atlantic")
	costume.Parent = character
	local function piece(name, body, size, offset, color, material, shape)
		local p = Instance.new("Part")
		p.Name, p.Size, p.Shape = name, size, shape or Enum.PartType.Block
		p.CFrame = body.CFrame * offset
		p.Color, p.Material = color, material or Enum.Material.Fabric
		p.Anchored, p.CanCollide, p.CanTouch, p.CanQuery, p.Massless, p.CastShadow = false, false, false, false, true, false
		p.TopSurface, p.BottomSurface = Enum.SurfaceType.Smooth, Enum.SurfaceType.Smooth
		p.Parent = costume
		local weld = Instance.new("WeldConstraint")
		weld.Part0, weld.Part1 = body, p
		weld.Parent = p
	end
	local w, h, d = chest.Size.X, chest.Size.Y, chest.Size.Z
	piece("CaptainCoat", chest, Vector3.new(w * 0.90, h * 0.92, 0.10), CFrame.new(0, -h * 0.03, -d * 0.5 - 0.07), coat)
	piece("CaptainVest", chest, Vector3.new(w * 0.36, h * 0.77, 0.11), CFrame.new(0, -h * 0.05, -d * 0.5 - 0.14), ivory)
	for side = -1, 1, 2 do
		piece("CaptainLapel" .. side, chest, Vector3.new(w * 0.14, h * 0.75, 0.075),
			CFrame.new(side * w * 0.27, h * 0.06, -d * 0.5 - 0.14) * CFrame.Angles(0, 0, side * -0.14), trim)
		piece("CaptainTail" .. side, waist, Vector3.new(waist.Size.X * 0.45, waist.Size.Y * 0.84, 0.09),
			CFrame.new(side * waist.Size.X * 0.24, -waist.Size.Y * 0.06, -waist.Size.Z * 0.5 - 0.05), coat)
	end
	piece("CaptainBelt", waist, Vector3.new(waist.Size.X * 0.93, 0.17, 0.12),
		CFrame.new(0, waist.Size.Y * 0.21, -waist.Size.Z * 0.5 - 0.09), Color3.fromRGB(68, 47, 36), Enum.Material.Leather)
	for i = 0, 2 do
		piece("CaptainButton" .. i, chest, Vector3.new(0.10, 0.10, 0.10),
			CFrame.new(0, h * (0.18 - i * 0.25), -d * 0.5 - 0.23), trim, Enum.Material.Metal, Enum.PartType.Ball)
	end
	-- 1517년 시대 고증: 후대 삼각모 대신 지역별 천/선원모로 처리한다.
	local eastern = sheet == "pacific" or sheet == "indian" or sheet == "faith_buddhist"
	piece("CaptainHatBand", head, Vector3.new(0.09, head.Size.X * 1.16, head.Size.Z * 1.16),
		CFrame.new(0, head.Size.Y * 0.48, 0) * CFrame.Angles(0, 0, math.pi / 2), trim, Enum.Material.Fabric, Enum.PartType.Cylinder)
	piece("CaptainHat", head, Vector3.new(head.Size.X * 1.08, head.Size.Y * 0.52, head.Size.Z * 1.08),
		CFrame.new(0, head.Size.Y * 0.68, 0), if eastern then ivory else coat, Enum.Material.Fabric, Enum.PartType.Ball)
	character:SetAttribute("CaptainPortraitLook", portrait)
end

local store = nil
do
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(STORE_NAME)
	end)
	if ok then
		store = result
	end
end

-- [공통 문명 세계] 별도 DataStore에 경제 스냅샷만 저장한다.
-- 플레이어 저장소 MareEssentia_v2와 기존 저장·보상 흐름은 그대로 둔다.
local okWorld, worldStore = pcall(function()
	return DataStoreService:GetDataStore("MareEssentia_EconomyWorld_v1")
end)
if okWorld and S.Econ.bindStore then
	S.Econ.bindStore(worldStore, game.JobId)
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
	ReplicatedStorage:SetAttribute("MareCoreStartStage", "loading-save")
	local session = { state = nil, lastAction = 0, canSave = true, ready = false, dirty = false, saving = false, closing = false, finalSaved = false }
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
	-- [자산 우선순위] 검증된 저장 항구만 서버 전용 속성으로 전달한다.
	script:SetAttribute("MareAssetPort_" .. player.UserId, session.state and session.state.portId or nil)
	ReplicatedStorage:SetAttribute("MareCoreStartStage", "session-ready")
	if player.Character then task.defer(applyCaptainAppearance, player, player.Character) end
end

-- [자동저장·종료 저장] 같은 플레이어의 저장 요청은 한 번에 하나만 실행한다.
-- 이전 스냅샷의 지연 완료가 더 최신 탐험 진행을 덮어쓰지 못하도록 기존 저장 함수에서 직렬화한다.
local function saveSession(player, final)
	local session = sessions[player]
	if not session or not session.state or not session.canSave or not store then
		return
	end
	if final then
		session.closing = true
		while session.saving and sessions[player] == session do
			task.wait()
		end
		if sessions[player] ~= session or (session.finalSaved and not session.dirty) then return end
	elseif session.saving or session.closing then
		return -- dirty는 유지하고 기존 자동저장 주기에서 다시 시도한다.
	end
	session.saving = true
	session.dirty = false
	local fame
	local ok, err = pcall(function()
		-- 보류된 해전(도망 대기 중)은 저장 전에 확정한다: 접속을 끊어 패배를 피하지 못하게
		if session.state.pendingBattle then
			pcall(S.Battle.resolve, session.state, ctx, false)
		end
		local data = S.State.serialize(session.state)
		fame = math.max(0, math.floor(session.state.fame))
		store:SetAsync(keyFor(player), data)
	end)
	if rankStore and fame ~= nil then
		pcall(function()
			rankStore:SetAsync(tostring(player.UserId), fame)
		end)
	end
	if not ok then
		session.dirty = true -- 저장 실패 시 기존 15초 자동저장 루프에서 재시도
		warn("[Core] save failed:", err)
	elseif final then
		session.finalSaved = true
	end
	session.saving = false -- 실패 또는 성공 모두 다음 저장을 허용한다.
end

local function reply(state, ok, message)
	local result = { ok = ok, message = message or "" }
	if state then
		S.History.tick(state)
		S.Stock.tick(state)
		S.Econ.advance(state)
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
	if session and session.closing then
		return { ok = false, message = "게임을 저장하고 있어요" }
	end
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
		-- 모든 게임은 1517년에 시작한다 (시대 선택 없음). 요청의 startYear 는 무시한다.
		local year = 1517
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
		script:SetAttribute("MareAssetPort_" .. player.UserId, newState.portId)
		task.defer(applyCaptainAppearance, player, player.Character)
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

	local ok, success, message, fieldRunId = pcall(handler, state, payload, ctx)
	if not ok then
		warn("[Core] handler error:", action, success)
		return reply(state, false, "오류가 발생했어요")
	end
	if action == "FieldCheckpoint" then
		if success then session.dirty = true end
		return { ok = success, message = message or "" } -- 기존 자동저장만 사용, 보상/세계 틱을 단계마다 실행하지 않음
	end
	if success then
		-- [자산 우선순위] 서버가 확정한 항구 이동만 반영한다. 저장·원격 요청 계약은 그대로다.
		local portAttribute = "MareAssetPort_" .. player.UserId
		if script:GetAttribute(portAttribute) ~= state.portId then
			script:SetAttribute(portAttribute, state.portId)
		end
		-- [숙련 입장] 임시 입장 확인은 영구 상태를 바꾸지 않아 저장하지 않는다.
		if action ~= "FieldPracticeBegin" then
			session.dirty = true -- 저장은 자동저장 루프가 모아서 한다 (응답을 막지 않는다)
		end
		if action == "IntroPortrait" then task.defer(applyCaptainAppearance, player, player.Character) end
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
	local response = reply(state, success, message)
	if action == "FieldPracticeBegin" and success then response.fieldRunId = fieldRunId end
	return response
end
remote.OnServerInvoke = onInvoke
ReplicatedStorage:SetAttribute("MareCoreStartStage", "remote-ready")

-- Studio 전용: 자동 점검(StudioQA)이 같은 서버 함수를 호출할 수 있게 하는 통로. 라이브 서버에는 만들지 않는다.
if game:GetService("RunService"):IsStudio() then
	local qa = Instance.new("BindableFunction")
	qa.Name = "StudioQAInvoke"
	qa.OnInvoke = function(player, action, payload)
		local session = sessions[player]
		if session then
			session.lastAction = -100 -- 점검은 요청 간격 제한을 받지 않는다
			if action == "QAKnowledge" and session.state then
				-- 개발 캡처용: 지식 트리·학술 행사 화면을 채워서 보여 주기 위한 상태 (Studio 전용)
				local st = session.state
				st.coins, st.fame = 1e9, math.max(st.fame or 0, 1000)
				st.portId = "london"
				script:SetAttribute("MareAssetPort_" .. player.UserId, st.portId)
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
	-- 기본 로블록스 아바타 로딩 이후 기존 초상 ID 외형을 다시 적용한다.
	player.CharacterAppearanceLoaded:Connect(function(character)
		task.defer(applyCaptainAppearance, player, character)
	end)
	task.spawn(loadSession, player)
end)
for _, player in Players:GetPlayers() do
	player.CharacterAppearanceLoaded:Connect(function(character)
		task.defer(applyCaptainAppearance, player, character)
	end)
	task.spawn(loadSession, player)
end

Players.PlayerRemoving:Connect(function(player)
	-- 마지막 이용자가 나가면 빈 서버가 종료되기 전에 세계경제 기록을 확정한다.
	local lastPlayer = true
	for other in sessions do
		if other ~= player then lastPlayer = false; break end
	end
	local session = sessions[player]
	if lastPlayer and session and session.state then
		S.Econ.sync(session.state, true)
	end
	saveSession(player, true)
	sessions[player] = nil
	script:SetAttribute("MareAssetPort_" .. player.UserId, nil)
end)

game:BindToClose(function()
	-- [영구 세계] 마지막 연구·교역이 5분 주기 저장 전에 유실되지 않게 1회 확정한다.
	local worldSaved = false
	for player, session in sessions do
		if not worldSaved and session.state then
			S.Econ.sync(session.state, true)
			worldSaved = true
		end
		saveSession(player, true)
	end
end)

-- 자동 저장
task.spawn(function()
	while true do
		task.wait(AUTOSAVE_INTERVAL)
		for player, session in sessions do
			if session.dirty and not session.saving and not session.closing then
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
		-- [문명 경제시계] 기존 1분 세계 틱에서 실시간 도시 발전을 갱신한다.
		-- 플레이어 날짜·저장 키는 변경하지 않고 Econ.advance의 45일 상한을 재사용한다.
		for _, session in sessions do
			if session.state then
				S.Econ.advance(session.state)
				S.Econ.sync(session.state)
				break
			end
		end
	end
end)
