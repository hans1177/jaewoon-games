--!nonstrict
-- 클라이언트 UI: 서버(GameAction)가 보내 준 스냅샷(view)을 표시하고 요청만 보낸다.
-- 판정은 모두 서버가 하므로 여기서는 값을 계산해 믿지 않는다.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
-- 캐릭터와 로딩 표시는 모듈·서버 대기보다 먼저 준비한다.
local overview = true -- 항구 전경(고정 시점) / 걷기 전환
local sceneSpawn = nil
local H: { [string]: any } = {} -- 화면 보조 상태는 사용 전 먼저 준비한다. 제목/아이콘 런타임 오류 방지.
local gui = Instance.new("ScreenGui")
gui.Name = "MareEssentiaGui"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

-- [시작 화면] 서버 상태를 받는 동안 공중 캐릭터와 빈 하늘이 노출되지 않도록 UI를 즉시 덮는다.
-- 월드/저장 데이터는 손대지 않고 서버 응답 직후 기존 시작 메뉴로 넘긴다.
H.startupCover = Instance.new("Frame")
H.startupCover.Name = "StartLoading"
H.startupCover.Size = UDim2.fromScale(1, 1)
H.startupCover.BackgroundColor3 = Color3.fromRGB(24, 58, 89)
H.startupCover.BorderSizePixel = 0
H.startupCover.ZIndex = 200
H.startupCover.Parent = gui
H.startupLabel = Instance.new("TextLabel")
H.startupLabel.Name = "LoadingMessage"
H.startupLabel.AnchorPoint = Vector2.new(0.5, 0.5)
H.startupLabel.Position = UDim2.fromScale(0.5, 0.5)
H.startupLabel.Size = UDim2.fromScale(0.88, 0.2)
H.startupLabel.BackgroundTransparency = 1
H.startupLabel.Text = "학문의 바다\n항구와 항해 기록을 불러오는 중..."
H.startupLabel.Font = Enum.Font.GothamBold
H.startupLabel.TextColor3 = Color3.fromRGB(253, 226, 166)
H.startupLabel.TextScaled = true
H.startupLabel.TextWrapped = true
H.startupLabel.ZIndex = 201
H.startupLabel.Parent = H.startupCover
do
	local size = Instance.new("UITextSizeConstraint")
	size.MaxTextSize = 27
	size.MinTextSize = 13
	size.Parent = H.startupLabel
end

-- [캐릭터 스폰] 항구가 클라이언트에 만들어지기 전에는 바닥이 없으므로 추락을 막는다.
-- 실제 걸어 다니는 시점에는 아래 applyView에서 고정을 해제한다.
function H.placeCharacterOnSpawn(character)
	local root = character:WaitForChild("HumanoidRootPart", 10)
	if not root then return end
	if sceneSpawn and not overview then
		character:PivotTo(sceneSpawn)
		root.Anchored = false
	else
		root.Anchored = true
	end
end
player.CharacterAdded:Connect(H.placeCharacterOnSpawn)
if player.Character then
	task.defer(H.placeCharacterOnSpawn, player.Character)
end


local Shared = ReplicatedStorage:WaitForChild("Shared")
local CommonUI = require(Shared:WaitForChild("Common"):WaitForChild("RobloxCommonUI"))
local PortData = require(Shared:WaitForChild("Ports"))
local Geo = require(Shared:WaitForChild("Geo"))
local SeaRoutes = require(Shared:WaitForChild("SeaRoutes"))
local PortScene = require(Shared:WaitForChild("PortScene"))
local VoyageScene = require(Shared:WaitForChild("VoyageScene"))
local FieldScene = require(Shared:WaitForChild("FieldScene"))
local Pose = require(Shared:WaitForChild("Pose"))
local Sfx = require(Shared:WaitForChild("Sfx"))
local audioLock = false -- 해전·항해 중에는 장면이 음악을 정한다
local NavalBattle = require(Shared:WaitForChild("NavalBattle"))
local AssetIds = require(Shared:WaitForChild("AssetIds"))
local remote = ReplicatedStorage:WaitForChild("GameAction")
local DEBUG_LOG = true -- 개발 중에는 서버 응답을 출력창에 남긴다 (출시 전에 false)

-- 기본 채팅창이 게임 창 위 탭을 가려서 끈다 (이 게임은 채팅이 필요 없다)
pcall(function()
	game:GetService("StarterGui"):SetCoreGuiEnabled(Enum.CoreGuiType.Chat, false)
end)
pcall(function()
	local tcs = game:GetService("TextChatService")
	tcs.ChatWindowConfiguration.Enabled = false
	tcs.ChatInputBarConfiguration.Enabled = false
end)

-- 백과사전 공통 표지와 본문 색
local COLORS = {
	cover = Color3.fromRGB(26, 34, 40),
	coverRaised = Color3.fromRGB(49, 57, 60),
	leather = Color3.fromRGB(56, 43, 35),
	paper = Color3.fromRGB(237, 222, 188),
	ink = Color3.fromRGB(51, 37, 25),
	brown = Color3.fromRGB(114, 75, 43),
	text = Color3.fromRGB(246, 238, 220),
	muted = Color3.fromRGB(176, 166, 146),
	row = Color3.fromRGB(49, 45, 40),
	blue = Color3.fromRGB(50, 83, 106),
	green = Color3.fromRGB(66, 116, 93),
	red = Color3.fromRGB(144, 63, 48),
	gold = Color3.fromRGB(226, 176, 78),
	grey = Color3.fromRGB(83, 74, 62),
	steam = Color3.fromRGB(150, 110, 70),
}
local UI_BRASS = Color3.fromRGB(214, 170, 82)
local UI_BRASS_DARK = Color3.fromRGB(120, 92, 44)

local AMOUNTS = { 1, 5, 10 }
local TABS = {
	{ id = "quest", name = "퀘스트" },
	{ id = "route", name = "항해" },
	{ id = "trade", name = "교역" },
	{ id = "cards", name = "백과" },
	{ id = "status", name = "상태" },
	{ id = "harbor", name = "항구" },
	{ id = "crew", name = "동료" },
	{ id = "yard", name = "조선소" },
	{ id = "codex", name = "백과사전" },
	{ id = "tech", name = "연구" },
	{ id = "map", name = "일지" },
	{ id = "explore", name = "탐험" },
	{ id = "battle", name = "전투" },
}

-- 시설별 창: 건물에 들어가면 그 시설의 탭만 열린다
local GROUPS = {
	{ name = "교역소", keeper = "상인 길드", tabs = { "trade", "harbor" } },
	{ name = "항만청", keeper = "항만 관리관", tabs = { "route", "map" } },
	{ name = "조선소", keeper = "조선 장인", tabs = { "yard" } },
	{ name = "주점", keeper = "주점 주인", tabs = { "quest", "explore", "battle" } },
	{ name = "학자의 서재", keeper = "학자", tabs = { "codex", "tech" } },
	{ name = "선장실", keeper = "선장", tabs = { "status", "crew" } },
}
local function groupOf(tabId)
	for _, g in GROUPS do
		if table.find(g.tabs, tabId) then
			return g
		end
	end
	return GROUPS[1]
end
local TAB_NAME = {}
for _, t in TABS do
	TAB_NAME[t.id] = t.name
end

local view = nil -- 서버가 보낸 최신 스냅샷
local currentTab = "status"
local syncScene
local openTab
local applyView
local inField = false -- 필드 탐험 장면 중에는 항구 전경 카메라를 멈춘다
local assetWaitStarted = false
local sceneKey = nil
local sceneCtl = nil -- 현재 3D 장면의 제어(출항 연출 등)
local sceneHold = false -- 항해 중에는 장면을 바꾸지 않는다
local arriveNext = false -- 다음 장면은 입항 연출로 시작
local amountIndex = 1
local message = ""
local messageOk = true
local ranking = nil
local mailBox, marketList = nil, nil
local mailDraft = { to = "", coins = "", text = "" }
local postPrice = {}
local busy = false
local equipped = nil -- 자동스킬 편집 중인 목록
local chosenNation = "england"
local chosenYear = 1517
local newGameMode = false -- 저장된 게임이 있어도 새로 시작하는 선택 화면을 보여 준다

-- 전체 화면 장면(항해 연출, 이야기, 카드 상세)은 별도 ScreenGui에 띄운다.
-- 같은 화면에 두면 ZIndex 규칙 때문에 장면의 그림이 배경 뒤로 숨는 문제가 있었다.
local function overlayGui(name, order)
	local g = Instance.new("ScreenGui")
	g.Name = name
	g.ResetOnSpawn = false
	g.IgnoreGuiInset = true
	g.DisplayOrder = order
	g.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	g.Parent = player:WaitForChild("PlayerGui")
	return g
end

-- UI 도우미 ---------------------------------------------------------------

local function corner(obj, radius)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius)
	c.Parent = obj
end

local function mkLabel(parent, text, size, color, bold, order)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Size = UDim2.new(1, -8, 0, 0)
	l.AutomaticSize = Enum.AutomaticSize.Y
	l.Text = text
	l.TextWrapped = true
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.TextYAlignment = Enum.TextYAlignment.Top
	l.TextSize = size or 14
	l.TextColor3 = color or COLORS.text
	l.Font = if bold then Enum.Font.GothamBold else Enum.Font.Gotham
	if order then
		l.LayoutOrder = order
	end
	l.Parent = parent
	return l
end

-- 교역품: 일반 상품은 승인된 전용 원본을 쓴다. 표현 제한 상품만 기존 중립 화물 외형을 사용한다.
local GOOD_ICON = {}
-- [표현 제한] 술 4종은 동일한 승인 나무통 메시의 색상만 변경한다.
-- Roblox 연령/지역 제한 및 표현 검수는 외형 변경만으로 면제되지 않는다.
local RESTRICTED_CARGO_ICON = {
	beer = { "Cargo", "barrel", Color3.fromRGB(174, 115, 48) }, -- 맥주: 황토색
	sake = { "Cargo", "barrel", Color3.fromRGB(196, 181, 150) }, -- 청주: 미색
	wine = { "Cargo", "barrel", Color3.fromRGB(112, 45, 64) }, -- 와인: 자주색
	rum = { "Cargo", "barrel", Color3.fromRGB(96, 56, 39) }, -- 럼주: 진갈색
}
for id in PortData.Goods do
	local neutral = RESTRICTED_CARGO_ICON[id]
	if neutral then
		-- 기존 허가된 메시가 보이지 않으면 제한 품목 전용 이미지 대신 일반 교역 표시를 유지한다.
		GOOD_ICON[id] = if AssetIds[neutral[1] .. "/" .. neutral[2]] then neutral else { "Menu", "trade" }
	else
		GOOD_ICON[id] = { "Goods", id }
	end
end
-- 승인된 그림이 없는 상품 중, 같은 물건의 3D 모델이 있는 것은 그것을 쓴다
for id, spec in {
	gold = { "Cargo", "gold-bar" }, silver = { "Cargo", "silver-bar" }, copper = { "Cargo", "copper-bar" },
	gems = { "Cargo", "gems-sack" }, jade = { "Cargo", "gem-medium", Color3.fromRGB(80, 170, 120) },
	pearl_shell = { "Cargo", "mussel-open" },
	mahogany = { "Cargo", "wood-log-a", Color3.fromRGB(110, 54, 40) }, ebony = { "Cargo", "wood-log-a", Color3.fromRGB(40, 32, 30) },
	kauri = { "Cargo", "wood-log-a", Color3.fromRGB(176, 132, 82) }, logwood = { "Cargo", "wood-log-a", Color3.fromRGB(120, 50, 70) },
	brazilwood = { "Cargo", "wood-log-a", Color3.fromRGB(160, 62, 48) }, sandalwood = { "Cargo", "wood-log-a", Color3.fromRGB(190, 150, 96) },
	sandalwood_hi = { "Cargo", "wood-log-a", Color3.fromRGB(200, 160, 100) },
	palm_oil = { "Cargo", "barrel-open" },
	cocoa = { "Cargo", "chocolate" }, maize = { "Cargo", "corn" },
} do
	GOOD_ICON[id] = spec
end
-- [3D 교역품] 승인된 원본 Cargo 메시가 실제 상품과 일치할 때만 상세 아이콘에 재사용한다.
-- 교역품 목록과 상세 화면은 동일한 승인 3D 모델을 사용한다.
for goodsId, cargoAsset in {
	cheese = "cheese", cloth = "textiles-a", coffee = "cup-coffee", fish = "fish",
	glass = "glass", iron = "iron-bars", olive_oil = "bottle-oil", pepper = "pepper-mill",
	salt = "shaker-salt", tea = "cup-tea", timber = "wood-log-stack",
	-- [교역품 3D 확대] 등록된 동일 품목 실물만 추가한다. 새 도형/임의 모델 없음.
	maize = "corn", copper = "copper-bar", silver = "silver-bar", gems = "gems-sack",
} do
	if AssetIds["Cargo/" .. cargoAsset] and AssetIds["Goods/" .. goodsId] then
		GOOD_ICON[goodsId] = { "Cargo", cargoAsset, nil, "Goods/" .. goodsId }
	end
end
-- [교역품 자동 3D 연결] 기존 등록기가 동일 상품 이름으로 만든 전용 Cargo 모델을 인식한다.
-- 체험 권한·원본 검증은 기존 업로더와 서버 AssetLoader가 담당한다. 미등록은 승인 원화 유지.
-- 제한 상품은 위 RESTRICTED_CARGO_ICON의 승인된 중립 화물 표현을 유지한다.
for goodsId in PortData.Goods do
	if not RESTRICTED_CARGO_ICON[goodsId]
		and AssetIds["Cargo/" .. goodsId] and AssetIds["Goods/" .. goodsId] then
		GOOD_ICON[goodsId] = { "Cargo", goodsId, nil, "Goods/" .. goodsId }
	end
end

-- 줄 제목·부제 글자로 알맞은 아이콘을 고른다 (항구·퀘스트·도감 창)
H.TITLE_ICONS = {
	{ "식물", "Cargo", "apple" }, { "동물", "Cargo", "fish-large" }, { "광물", "Relics", "coin" }, { "유물", "Relics", "pot" },
	{ "유적", "Castle", "tower-square-base" }, { "천문", "Relics", "key" }, { "화학", "Relics", "potion" }, { "물리", "Cargo", "bucket" },
	{ "지리", "Naval", "ship-small" }, { "철학", "Interior", "bookcaseclosed" }, { "의학", "Cargo", "mortar-pestle" }, { "신화", "Relics", "weapon-sword" },
	{ "항해술", "Naval", "ship-medium" }, { "기상", "Naval", "flag-pennant" }, { "건축", "Town", "house" }, { "예술", "Relics", "shield-round" },
	{ "교역품", "Cargo", "box-open" }, { "조선", "Naval", "ship-large" }, { "언어", "Interior", "bookcaseopenlow" },
}
H.TEXT_ICONS = {
	{ "코인 투자", "Relics", "coin" }, { "예금", "Relics", "coin" }, { "→", "Cargo", "box-open" }, { "면허", "Relics", "shield-round" },
	{ "보험", "Relics", "shield-rectangle" }, { "알현", "Castle", "flag-banner-short" }, { "소문", "Cargo", "mug" },
	{ "납품", "Cargo", "box-open" }, { "해전", "Relics", "weapon-sword" }, { "승리", "Relics", "weapon-sword" }, { "방문", "Naval", "ship-small" },
	{ "연구", "Relics", "potion" }, { "도감 카드", "Relics", "key" }, { "카드", "Relics", "key" }, { "발견", "Relics", "key" },
	{ "이야기", "Relics", "key" },
}
function H.iconFor(title, subtitle)
	for _, t in H.TITLE_ICONS do
		if string.find(title, t[1], 1, true) then
			return t
		end
	end
	local both = title .. " " .. (subtitle or "")
	for _, t in H.TEXT_ICONS do
		if string.find(both, t[1], 1, true) then
			return t
		end
	end
	return nil
end
local SHIP_ICON = {
	caravel = { "Naval", "ship-small" }, fluyt = { "Naval", "ship-medium" }, frigate = { "Naval", "ship-large" },
	galleon = { "Naval", "ship-pirate-large" }, paddle_steamer = { "Naval", "ship-medium", Color3.fromRGB(70, 70, 78) },
	ironclad_frigate = { "Naval", "ship-large", Color3.fromRGB(96, 102, 112) },
}

-- 화면에 남아 있는 큰 입체 표본만 최대 10개까지 회전시킨다.
local itemMotion = {}
local itemMotionConn
local function addItemMotion(entry)
	if #itemMotion >= 10 then return end
	entry.phase = (#itemMotion * 1.7) % 6.28
	table.insert(itemMotion, entry)
	if itemMotionConn then return end
	itemMotionConn = game:GetService("RunService").RenderStepped:Connect(function()
		local t = os.clock()
		for i = #itemMotion, 1, -1 do
			local e = itemMotion[i]
			if not e.gui.Parent or not e.gui:IsDescendantOf(game) then
				table.remove(itemMotion, i)
			elseif e.gui.AbsoluteSize.X > 0 then
				local a = t * 0.8 + e.phase
				e.model:PivotTo(CFrame.new(e.center) * CFrame.Angles(0, a, 0) * CFrame.new(-e.center) * e.base)
			end
		end
		if #itemMotion == 0 and itemMotionConn then
			itemMotionConn:Disconnect()
			itemMotionConn = nil
		end
	end)
end

-- 삽화·초상·입체 표본은 같은 백과사전 받침 위에 표시한다.
function H.iconPaper(gui, px)
	gui.BackgroundColor3 = COLORS.paper
	gui.BackgroundTransparency = 0
	gui.BorderSizePixel = 0
	gui.ClipsDescendants = true
	corner(gui, if px < 36 then 4 else 6)
	local wash = Instance.new("UIGradient")
	wash.Color = ColorSequence.new(Color3.fromRGB(255, 254, 247), Color3.fromRGB(216, 195, 160))
	wash.Rotation = 90
	wash.Parent = gui
	local border = Instance.new("UIStroke")
	border.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	border.Color = COLORS.brown
	border.Thickness = 1
	border.Transparency = 0.18
	border.Parent = gui
end

local function modelIcon(parent, kind, asset, tint, px, labelText, smallArt, portraitOffset)
	if kind == "Portraits" and AssetIds["Portraits/" .. asset] then
		local portrait = Instance.new("ImageLabel")
		portrait.Size = UDim2.fromOffset(px, px)
		portrait.Image = "rbxassetid://" .. tostring(AssetIds["Portraits/" .. asset])
		if portraitOffset then
			portrait.ImageRectOffset = portraitOffset
			portrait.ImageRectSize = Vector2.new(256, 336)
		end
		portrait.ScaleType = if portraitOffset then Enum.ScaleType.Crop else Enum.ScaleType.Fit
		H.iconPaper(portrait, px)
		portrait.Parent = parent
		return portrait
	end
	-- [3D 통일] 3D 모델이 있는 상품은 작은 목록과 상세 모두 같은 3D 모델로 보여 준다 (그림과 모델이 섞여 보이지 않게).
	if kind == "Goods" or kind == "Menu" then
		local card = Instance.new("Frame")
		card.Name = kind .. "_" .. asset
		card.Size = UDim2.fromOffset(px, px)
		H.iconPaper(card, px)
		local assetId = AssetIds[kind .. "/" .. asset]
		if assetId then
			local inset = math.max(2, math.floor(px * 0.12))
			local art = Instance.new("ImageLabel")
			art.Name = "OriginalArt"
			art.Size = UDim2.new(1, -2 * inset, 1, -2 * inset)
			art.Position = UDim2.fromOffset(inset, inset)
			art.BackgroundTransparency = 1
			art.Image = "rbxassetid://" .. tostring(assetId)
			art.ScaleType = Enum.ScaleType.Fit
			if kind == "Menu" then art.ImageColor3 = COLORS.brown end
			art.Parent = card
		else
			-- 등록된 그림이 없는 경우 기존 상품 이름을 보존한다.
			local nameTile = Instance.new("TextLabel")
			nameTile.Size = UDim2.fromScale(1, 1)
			nameTile.BackgroundTransparency = 1
			nameTile.Text = labelText or tostring(asset)
			nameTile.TextWrapped = true
			nameTile.TextScaled = true
			nameTile.Font = Enum.Font.GothamBold
			nameTile.TextColor3 = COLORS.ink
			local pad = Instance.new("UIPadding")
			pad.PaddingLeft, pad.PaddingRight, pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 5), UDim.new(0, 5), UDim.new(0, 8), UDim.new(0, 8)
			pad.Parent = nameTile
			nameTile.Parent = card
		end
		card.Parent = parent
		return card
	end
	-- [교역품 3D] 승인된 Cargo 모델만 표시하고, 지연 로딩 동안에는 동일 상품 원화를 유지한다.
	local vf = Instance.new("ViewportFrame")
	vf.Size = UDim2.fromOffset(px, px)
	H.iconPaper(vf, px)
	vf.Ambient = Color3.fromRGB(184, 173, 154)
	vf.LightColor = Color3.fromRGB(255, 238, 204)
	vf.LightDirection = Vector3.new(-0.8, -1.6, -0.55).Unit
	local cam = Instance.new("Camera")
	cam.FieldOfView = 35
	cam.Parent = vf
	vf.CurrentCamera = cam
	local world = Instance.new("WorldModel")
	world.Name = "Display"
	world.Parent = vf
	local lib = ReplicatedStorage:FindFirstChild("MareAssets")
	local group = kind and lib and lib:FindFirstChild(kind)
	local currentModel, readyConnection, fallback = nil, nil, nil

	-- [모델 적용] 등록된 실제 모델의 메시·텍스처를 유지하며 복제한다.
	local function showRegisteredModel(template)
		if currentModel or not template or not template:IsA("Model") or not template:FindFirstChildWhichIsA("BasePart", true) then
			return false
		end
		local model = template:Clone()
		for _, part in model:GetDescendants() do
			if part:IsA("BasePart") then
				part.Anchored = true
				if tint and part:IsA("MeshPart") then part.Color = tint end
			end
		end
		model.Parent = world
		local cf, size = model:GetBoundingBox()
		local radius = math.max(size.Magnitude * 0.5, 0.1)
		local reach = radius / math.sin(math.rad(cam.FieldOfView * 0.5)) * 1.08
		if kind == "People" then
			local focus = cf.Position + Vector3.new(0, size.Y * 0.30, 0)
			cam.FieldOfView = 34
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.12, 0.08, 1).Unit * (size.Y * 0.88), focus)
		else
			cam.CFrame = CFrame.lookAt(cf.Position + Vector3.new(0.85, 0.65, 1.2).Unit * reach, cf.Position)
		end
		currentModel = model
		if fallback then fallback:Destroy(); fallback = nil end
		if readyConnection then readyConnection:Disconnect(); readyConnection = nil end
		if px >= 60 then
			addItemMotion({ gui = vf, model = model, center = cf.Position, base = model:GetPivot() })
		end
		return true
	end

	local template = group and asset and group:FindFirstChild(asset)
	if not showRegisteredModel(template) then
		-- [원화 대기] 정확히 동일한 교역품 승인 PNG 우선. 임의 상품 그림은 사용하지 않는다.
		local originalId = if type(smallArt) == "string" then AssetIds[smallArt] else nil
		local knownId = if kind and asset then AssetIds[kind .. "/" .. asset] else nil
		if originalId or knownId then
			local image = Instance.new("ImageLabel")
			image.Name = if originalId then "ApprovedGoodsArt" else "RegisteredModelThumbnail"
			local inset = math.max(2, math.floor(px * 0.10))
			image.Size = UDim2.new(1, -2 * inset, 1, -2 * inset)
			image.Position = UDim2.fromOffset(inset, inset)
			image.BackgroundTransparency = 1
			image.Image = if originalId then "rbxassetid://" .. tostring(originalId)
				else "rbxthumb://type=Asset&id=" .. tostring(knownId) .. "&w=150&h=150"
			image.ScaleType = Enum.ScaleType.Fit
			image.Parent = vf
			fallback = image
		else
			local nameTile = Instance.new("TextLabel")
			nameTile.Name = "UnregisteredAssetLabel"
			nameTile.BackgroundTransparency = 1
			nameTile.Size = UDim2.fromScale(1, 1)
			nameTile.Text = labelText or "자산 준비"
			nameTile.TextWrapped = true
			nameTile.TextColor3 = COLORS.ink
			nameTile.Font = Enum.Font.GothamBold
			nameTile.TextSize = math.min(14, math.max(10, px / 4))
			nameTile.Parent = vf
			fallback = nameTile
		end
		-- [지연 전환] 등록 메시가 도착하면 열린 카드의 그림을 3D로 바꾼다.
		if kind == "Cargo" and group and asset and knownId then
			readyConnection = group.ChildAdded:Connect(function(child)
				if child.Name == asset then showRegisteredModel(child) end
			end)
			vf.Destroying:Connect(function()
				if readyConnection then readyConnection:Disconnect(); readyConnection = nil end
			end)
			showRegisteredModel(group:FindFirstChild(asset))
		end
	end
	vf.Parent = parent
	return vf
end

-- 줄(row) 왼쪽에 아이콘을 붙이고 글자 상자를 오른쪽으로 민다
local function withIcon(row, kind, asset, tint, px, portraitOffset)
	local previous = row:FindFirstChild("RowIcon")
	if previous then previous:Destroy() end
	local icon = modelIcon(row, kind, asset, tint, px, nil, nil, portraitOffset)
	icon.Name = "RowIcon"
	icon.Position = UDim2.new(0, 8, 0.5, -px / 2)
	local box = row:FindFirstChild("RowText")
	if box then
		local inset = px + 16
		local delta = inset - box.Position.X.Offset
		box.Position = UDim2.fromOffset(inset, box.Position.Y.Offset)
		box.Size = UDim2.new(box.Size.X.Scale, box.Size.X.Offset - delta, box.Size.Y.Scale, box.Size.Y.Offset)
	end
	return icon
end

local function mkButton(parent, text, color, size, onClick, enabled)
	local b = Instance.new("TextButton")
	b.Text = text
	b.Size = size
	b.BackgroundColor3 = if enabled == false then COLORS.grey else color
	b.TextColor3 = COLORS.text
	b.Font = Enum.Font.GothamBold
	b.TextSize = 13
	b.TextWrapped = true
	b.AutoButtonColor = enabled ~= false
	b.BorderSizePixel = 0
	corner(b, 7)
	b.Parent = parent
	do
		local grad = Instance.new("UIGradient")
		grad.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255), Color3.fromRGB(196, 196, 196))
		grad.Rotation = 90
		grad.Parent = b
		local bs = Instance.new("UIStroke")
		bs.Color = if enabled == false then Color3.fromRGB(100, 100, 108) else UI_BRASS
		bs.Thickness = 1.2
		bs.Transparency = if enabled == false then 0.5 else 0.15
		bs.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		bs.Parent = b
	end
	if enabled ~= false and onClick then
		b.Activated:Connect(function()
			Sfx.play("sfx_click")
			onClick()
		end)
	end
	return b
end

-- 제목, 부제, 오른쪽 버튼들로 이루어진 한 줄
local function mkRow(parent, title, subtitle, buttons, height)
	local row = Instance.new("Frame")
	row.Size = UDim2.new(1, -6, 0, height or 60)
	row.BackgroundColor3 = COLORS.row
	row.BorderSizePixel = 0
	corner(row, 6)
	row.Parent = parent
	do
		local rs = Instance.new("UIStroke")
		rs.Color = UI_BRASS_DARK
		rs.Thickness = 1
		rs.Transparency = 0.45
		rs.Parent = row
		local grad = Instance.new("UIGradient")
		grad.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255), Color3.fromRGB(205, 205, 210))
		grad.Rotation = 90
		grad.Parent = row
		local bar = Instance.new("Frame")
		bar.Name = "AccentBar"
		bar.BackgroundColor3 = UI_BRASS
		bar.BorderSizePixel = 0
		bar.Size = UDim2.new(0, 3, 1, -12)
		bar.Position = UDim2.fromOffset(0, 6)
		bar.Parent = row
	end

	local btnCount = buttons and #buttons or 0
	local btnWidth = btnCount * 68 + 8

	local textBox = Instance.new("Frame")
	textBox.Name = "RowText"
	textBox.BackgroundTransparency = 1
	textBox.Position = UDim2.fromOffset(8, 4)
	textBox.Size = UDim2.new(1, -(btnWidth + 12), 1, -8)
	textBox.Parent = row
	local layout = Instance.new("UIListLayout")
	layout.Parent = textBox
	mkLabel(textBox, title, 14, COLORS.text, true)
	if subtitle and subtitle ~= "" then
		mkLabel(textBox, subtitle, 12, COLORS.muted, false)
	end

	if buttons then
		for i, spec in buttons do
			local b = mkButton(row, spec.text, spec.color or COLORS.blue, UDim2.fromOffset(62, 36), spec.onClick, spec.enabled)
			b.AnchorPoint = Vector2.new(1, 0.5)
			b.Position = UDim2.new(1, -6 - (btnCount - i) * 68, 0.5, 0)
		end
	end
	local ic = H.iconFor(title, subtitle)
	if ic and (height or 60) >= 50 then
		withIcon(row, ic[2], ic[3], nil, math.min(46, (height or 60) - 10))
	end
	return row
end

local function mkHeader(parent, text)
	local l = mkLabel(parent, "◆ " .. text, 15, COLORS.gold, true)
	l.Size = UDim2.new(1, -8, 0, 24)
	l.AutomaticSize = Enum.AutomaticSize.None
	l.TextYAlignment = Enum.TextYAlignment.Center
	local rule = Instance.new("Frame")
	rule.Name = "Rule"
	rule.BackgroundColor3 = UI_BRASS
	rule.BackgroundTransparency = 0.45
	rule.BorderSizePixel = 0
	rule.AnchorPoint = Vector2.new(0, 1)
	rule.Position = UDim2.new(0, 0, 1, 0)
	rule.Size = UDim2.new(1, 0, 0, 1)
	rule.Parent = l
	return l
end

-- 메인 화면 구조 ------------------------------------------------------------

H.bookTheme = CommonUI.CreateTheme({
	Panel = COLORS.cover, PanelRaised = COLORS.coverRaised, PanelInset = COLORS.leather,
	Border = UI_BRASS_DARK, BorderBright = UI_BRASS, Text = COLORS.text, MutedText = COLORS.muted,
	Primary = COLORS.blue, PrimaryTop = Color3.fromRGB(69, 106, 128), PrimaryBottom = COLORS.cover,
	Accent = COLORS.gold, Positive = COLORS.green, Danger = COLORS.red,
})
local main, mainInner = CommonUI.CreatePanel({ name = "Main", size = UDim2.new(1, -16, 1, -16), theme = H.bookTheme })
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = COLORS.cover
main.Parent = gui
do
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(214, 170, 82)
	st.Thickness = 2.5
	st.Parent = main
	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255), Color3.fromRGB(190, 190, 200))
	grad.Rotation = 90
	grad.Parent = main
	-- 안쪽 가는 테두리 (액자 느낌)
	local inset = Instance.new("Frame")
	inset.Name = "InnerFrame"
	inset.BackgroundTransparency = 1
	inset.Position = UDim2.fromOffset(5, 5)
	inset.Size = UDim2.new(1, -10, 1, -10)
	inset.ZIndex = 0
	inset.Parent = main
	local ist = Instance.new("UIStroke")
	ist.Color = Color3.fromRGB(120, 92, 44)
	ist.Thickness = 1
	ist.Transparency = 0.3
	ist.Parent = inset
	local ic = Instance.new("UICorner")
	ic.CornerRadius = UDim.new(0, 8)
	ic.Parent = inset
end
local sizeLimit = Instance.new("UISizeConstraint")
sizeLimit.MaxSize = Vector2.new(1020, 900)
sizeLimit.Parent = main

-- 항해 기록의 표제지: 시설 이름, 현재 항구와 선박 정보를 분리한다.
H.pageMasthead = Instance.new("Frame")
H.pageMasthead.Name = "BookMasthead"
H.pageMasthead.Position = UDim2.fromOffset(4, 4)
H.pageMasthead.Size = UDim2.new(1, -8, 0, 74)
H.pageMasthead.BackgroundColor3 = COLORS.paper
H.pageMasthead.BorderSizePixel = 0
H.pageMasthead.Parent = mainInner
corner(H.pageMasthead, 7)
local function pageRule(parent, position, size)
	local rule = Instance.new("Frame")
	rule.BorderSizePixel = 0
	rule.BackgroundColor3 = UI_BRASS_DARK
	rule.BackgroundTransparency = 0.35
	rule.Position = position
	rule.Size = size
	rule.Parent = parent
	return rule
end
pageRule(H.pageMasthead, UDim2.new(0, 64, 1, -5), UDim2.new(1, -72, 0, 1))
H.pageDetails = mkLabel(H.pageMasthead, "", 11, COLORS.brown, true)
H.pageDetails.AutomaticSize = Enum.AutomaticSize.None
H.pageDetails.Position = UDim2.fromOffset(65, 36)
H.pageDetails.Size = UDim2.new(1, -74, 0, 32)
H.pageDetails.TextTruncate = Enum.TextTruncate.AtEnd

local headerLabel = Instance.new("TextLabel")
headerLabel.BackgroundTransparency = 1
headerLabel.Position = UDim2.fromOffset(69, 8)
headerLabel.Size = UDim2.new(1, -174, 0, 29)
headerLabel.TextXAlignment = Enum.TextXAlignment.Left
headerLabel.TextYAlignment = Enum.TextYAlignment.Top
headerLabel.TextScaled = true
headerLabel.TextTruncate = Enum.TextTruncate.AtEnd
headerLabel.TextSize = 23
headerLabel.Font = Enum.Font.GothamBold
headerLabel.TextColor3 = COLORS.ink
local mastheadSize = Instance.new("UITextSizeConstraint")
mastheadSize.MaxTextSize = 23
mastheadSize.Parent = headerLabel
headerLabel.Text = "불러오는 중..."
headerLabel.Parent = mainInner

-- 시설 주인 초상화 (대항해시대 온라인의 NPC 얼굴 창처럼)
local portraitFrame = Instance.new("ViewportFrame")
portraitFrame.Position = UDim2.fromOffset(11, 12)
portraitFrame.Size = UDim2.fromOffset(52, 52)
portraitFrame.BackgroundColor3 = Color3.fromRGB(40, 56, 80)
portraitFrame.Ambient = Color3.fromRGB(190, 190, 200)
portraitFrame.LightColor = Color3.fromRGB(255, 244, 220)
portraitFrame.Parent = mainInner
do
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 8)
	c.Parent = portraitFrame
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(214, 170, 82)
	st.Thickness = 2
	st.Parent = portraitFrame
end
local portraitCam = Instance.new("Camera")
portraitCam.FieldOfView = 30
portraitCam.Parent = portraitFrame
portraitFrame.CurrentCamera = portraitCam
-- 등록된 실사 NPC 초상화가 있으면 기존 3D 초상 위에 표시한다.
local portraitImage = Instance.new("ImageLabel")
portraitImage.Name = "NpcPortrait"
portraitImage.Position = UDim2.fromOffset(11, 12)
portraitImage.Size = UDim2.fromOffset(52, 52)
portraitImage.BackgroundColor3 = Color3.fromRGB(40, 56, 80)
portraitImage.BorderSizePixel = 0
portraitImage.ScaleType = Enum.ScaleType.Crop
portraitImage.Visible = false
portraitImage.Parent = mainInner
do
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 8)
	c.Parent = portraitImage
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(214, 170, 82)
	st.Thickness = 2
	st.Parent = portraitImage
end
local portraitKey = nil
local PORTRAIT_ROLE = {
	["교역소"] = "Rogue", ["항만청"] = "Knight", ["조선소"] = "Barbarian",
	["주점"] = "Barbarian", ["학자의 서재"] = "Mage", ["선장실"] = "Rogue_Hooded",
}
-- 동료별 실제 등록된 인물 모델. 기존 3D 원본과 역할을 재사용하며 저장 데이터는 건드리지 않는다.
-- 문화권·성별이 맞지 않는 공용 2D 얼굴을 다른 사람에게 강제로 할당하지 않는다.
local COMPANION_MODEL = {
	c_merian = "Casual3_Female", c_halley = "OldClassy_Male", c_leeuwenhoek = "Doctor_Male_Old",
	c_linnaeus = "Doctor_Male_Young", c_boyle = "Casual2_Male", c_papin = "Worker_Male",
	t_navigator = "Pirate_Male", t_gunner = "Pirate_Female", t_purser = "OldClassy_Male",
	t_surgeon = "Doctor_Female_Young", t_helmsman = "Pirate_Male", t_mate = "Casual3_Female",
	t_boatswain = "Worker_Male", t_master_gunner = "Pirate_Female",
	n_england = "Casual3_Male", n_netherlands = "Casual2_Male", n_france = "OldClassy_Male",
	n_portugal = "Casual_Male", n_ottoman = "Casual2_Male", n_swahili = "Worker_Male",
	n_malabar = "Worker_Male", n_japan = "Soldier_Male", n_new_spain = "Worker_Male",
}
-- 초상화 시트: 왼쪽부터 상인·항만 관리관·조선 장인 / 주점 주인·학자·항해가.
-- 나이와 직업이 다른 인물을 사용한다. 나라·역할이 맞지 않으면 기존 인물 모델을 보존한다.
-- 새 시설 NPC 초상화는 등록·권한 승인된 ID가 있을 때만 사용한다.
-- 등록 전에는 기존 초상화 시트를 그대로 표시하므로 화면이 비지 않는다.
local PORTRAIT_ATLAS = AssetIds["Portraits/npcs_new"] or AssetIds["Portraits/characters"]
local PORTRAIT_SIZE = Vector2.new(256, 336)
local PORTRAIT_TILE = {
	merchant = Vector2.new(0, 0),
	harbor = Vector2.new(PORTRAIT_SIZE.X, 0),
	yard = Vector2.new(PORTRAIT_SIZE.X * 2, 0),
	tavern = Vector2.new(0, PORTRAIT_SIZE.Y),
	scholar = Vector2.new(PORTRAIT_SIZE.X, PORTRAIT_SIZE.Y),
	hero = Vector2.new(PORTRAIT_SIZE.X * 2, PORTRAIT_SIZE.Y),
}
local FACILITY_ATLAS = AssetIds["Portraits/crew_facilities"]
local FACILITY_TILE = {
	merchant = Vector2.new(256, 336), harbor = Vector2.new(512, 336),
	yard = Vector2.new(0, 672), tavern = Vector2.new(256, 672), scholar = Vector2.new(512, 672),
}
local COMPANION_PORTRAIT = {}
for atlas, ids in {
	crew_facilities = { "t_navigator", "t_gunner", "t_purser", "t_surgeon" },
	crew_nations = { "n_england", "n_netherlands", "n_france", "n_portugal", "n_ottoman", "n_swahili", "n_malabar", "n_japan", "n_new_spain" },
} do
	if AssetIds["Portraits/" .. atlas] then
		for index, id in ids do
			local cell = index - 1
			COMPANION_PORTRAIT[id] = { atlas = atlas, offset = Vector2.new(cell % 3 * 256, math.floor(cell / 3) * 336) }
		end
	end
end
-- 동료 초상: 새 시트(5열)의 칸을 배정한다. 아랫줄(15~19)은 여성, 윗줄은 남성 인물 위주.
for id, spec in {
	t_helmsman = { "mediterranean", 4 }, t_mate = { "mediterranean", 16 }, t_boatswain = { "west_africa", 2 }, t_master_gunner = { "north_atlantic", 17 },
	h_england = { "north_atlantic", 15 }, h_netherlands = { "north_atlantic", 1 }, h_france = { "north_atlantic", 16 },
	h_ottoman = { "mediterranean", 19 }, h_swahili = { "east_africa_red_sea", 5 }, h_malabar = { "indian", 1 },
	h_japan = { "pacific", 15 }, h_new_spain = { "americas", 3 }, h_portugal = { "mediterranean", 15 },
	t_priest = { "faith_christian", 0 }, t_nun = { "faith_christian", 16 }, t_monk = { "faith_buddhist", 3 }, t_bhikkhuni = { "faith_buddhist", 17 },
	t_scribe = { "faith_indian_ocean", 3 }, t_pilgrim = { "faith_indian_ocean", 4 },
} do
	if AssetIds["Portraits/companions_" .. spec[1]] then
		COMPANION_PORTRAIT[id] = { atlas = "companions_" .. spec[1], offset = Vector2.new(spec[2] % 5 * 256, math.floor(spec[2] / 5) * 336) }
	end
end
-- 초상 배정표: 한 칸은 한 사람만 쓴다. 이미 동료가 쓰는 칸은 H.portraitUsed 에 적어 두고,
-- 국가 고향 동료(n_*)와 주인공 후보는 그 나라 시트의 빈 칸에서 겹치지 않게 고른다.
-- 나라마다 먼저 쓰는 시트(어울리는 지역 순서). 칸이 모자라면 다른 시트의 빈 칸으로 넘어간다.
do
local PortraitSheetsN = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared"):WaitForChild("Specialties")).PortraitSheets
H.NATION_SHEET = {
	england = { "north_atlantic", "atlantic" }, netherlands = { "north_atlantic", "atlantic" }, denmark = { "north_atlantic" }, sweden = { "north_atlantic" },
	france = { "atlantic", "north_atlantic" }, spain = { "atlantic", "mediterranean" }, portugal = { "atlantic", "africa" }, new_spain = { "americas" },
	venice = { "mediterranean" }, ottoman = { "mediterranean", "east_africa_red_sea" }, swahili = { "east_africa_red_sea", "africa" }, malabar = { "indian" },
	china = { "pacific", "oceania" }, japan = { "pacific", "oceania" }, korea = { "pacific", "oceania" },
}
local SHEET_FALLBACK = { "west_africa", "africa", "oceania", "indian", "americas", "pacific", "mediterranean", "atlantic", "east_africa_red_sea", "north_atlantic" }
H.portraitUsed = {}
for _, spec in {
	{ "mediterranean", 4 }, { "mediterranean", 16 }, { "west_africa", 2 }, { "north_atlantic", 17 },
	{ "north_atlantic", 15 }, { "north_atlantic", 1 }, { "north_atlantic", 16 }, { "mediterranean", 19 }, { "east_africa_red_sea", 5 },
	{ "indian", 1 }, { "pacific", 15 }, { "americas", 3 }, { "mediterranean", 15 },
	{ "faith_christian", 0 }, { "faith_christian", 16 }, { "faith_buddhist", 3 }, { "faith_buddhist", 17 }, { "faith_indian_ocean", 3 }, { "faith_indian_ocean", 4 },
} do
	H.portraitUsed[spec[1] .. ":" .. spec[2]] = true
end
-- 나라의 시트 목록(+ 예비 시트)에서 아직 아무도 안 쓴 칸 하나를 집는다. 집은 칸은 바로 사용 처리된다.
function H.freeCell(nid, from, to)
	local lists = { H.NATION_SHEET[nid] or {}, SHEET_FALLBACK }
	for _, list in lists do
		for _, sheet in list do
			if AssetIds["Portraits/companions_" .. sheet] and PortraitSheetsN[sheet] then
				for c = from, math.min(to, PortraitSheetsN[sheet] - 1) do
					local key = sheet .. ":" .. c
					if not H.portraitUsed[key] then
						H.portraitUsed[key] = true
						return sheet, c
					end
				end
			end
		end
	end
	return nil, nil
end
local NATION_LIST = { "england", "netherlands", "france", "spain", "portugal", "denmark", "sweden", "venice", "ottoman", "swahili", "malabar", "china", "japan", "korea", "new_spain" }
for _, nid in NATION_LIST do
	local sheet, cell = H.freeCell(nid, 0, 14)
	if sheet then
		COMPANION_PORTRAIT["n_" .. nid] = { atlas = "companions_" .. sheet, offset = Vector2.new(cell % 5 * 256, math.floor(cell / 5) * 336) }
	end
end
-- 주인공 후보 6칸: 남성풍 윗줄 4칸 + 여성풍 아랫줄 2칸 (동료가 쓰는 칸은 빼고, 한 번 고른 칸은 다른 국가 후보와도 겹치지 않는다)
H.captainChoices = {}
for _, nid in NATION_LIST do
	local out = {}
	for i = 1, 6 do
		local sheet, c
		if i <= 4 then
			sheet, c = H.freeCell(nid, 0, 14)
		else
			sheet, c = H.freeCell(nid, 15, 19)
		end
		if not sheet and i > 4 then sheet, c = H.freeCell(nid, 0, 14) end
		if sheet then table.insert(out, "cp:" .. sheet .. ":" .. c) end
	end
	H.captainChoices[nid] = out
end
end
local PORTRAIT_GROUP = {
	["교역소"] = "merchant", ["항만청"] = "harbor", ["조선소"] = "yard",
	["주점"] = "tavern", ["학자의 서재"] = "scholar",
}
-- 국가별 주인공 9명은 3x3 시트의 서로 다른 실제 인물 사진/원화를 사용한다.
-- 이 시트를 기존 초상화 컴포넌트에서 공유하므로 새 UI 구조는 필요 없다.
local HERO_ATLAS = AssetIds["Portraits/heroes"]
local HERO_SIZE = Vector2.new(256, 336)
-- 제작 원화와 직업·문화권이 맞는 주인공부터 새 초상화로 교체한다.
-- 외형이 안 맞는 국가 주인공은 기존에 등록된 고유 초상화를 보존한다.
local HERO_PERIOD_ATLAS = AssetIds["Portraits/heroes_period"]
local HERO_NEW_ATLAS = HERO_PERIOD_ATLAS or AssetIds["Portraits/heroes_new"]
local HERO_NEW_SIZE = Vector2.new(256, 336)
local HERO_NEW_TILE = {
	england = Vector2.new(0, 0), -- 엘리너: 해류 관측 학자
	netherlands = Vector2.new(256, 336), -- 얀: 젊은 상사 설립자
	france = Vector2.new(256, 672), -- 마리온: 몰락 귀족 가문
	swahili = Vector2.new(0, 672), -- 아민: 잔지바르 선장
	new_spain = Vector2.new(512, 672), -- 디에고: 광산 마을 출신
}
local HERO_TILE = {
	england = Vector2.new(0, 0), -- 엘리너 렌
	netherlands = Vector2.new(256, 0), -- 얀 데 흐로트
	france = Vector2.new(512, 0), -- 마리온 델라크루아
	ottoman = Vector2.new(0, 336), -- 레일라 하미디
	swahili = Vector2.new(256, 336), -- 아민 살림
	malabar = Vector2.new(512, 336), -- 라마 나이르
	japan = Vector2.new(0, 672), -- 사쿠라이 하루카
	new_spain = Vector2.new(256, 672), -- 디에고 모랄레스
	portugal = Vector2.new(512, 672), -- 이네스 카브랄
}
-- 연도와 항구에 맞는 승인·등록 초상을 고른다.
function H.heroPortraitAsset(nationId)
	local year = if view and view.player and not newGameMode then view.player.year else chosenYear
	local atlas = if year and year >= 1700 then AssetIds["Portraits/heroes_color"]
		elseif year and year < 1600 then AssetIds["Portraits/heroes_1517"] else nil
	local tile = HERO_TILE[nationId]
	if atlas and tile then
		return atlas, tile, HERO_SIZE
	end
	local oldTile = if HERO_NEW_ATLAS then (if HERO_PERIOD_ATLAS then HERO_TILE else HERO_NEW_TILE)[nationId] else nil
	if oldTile then
		return HERO_NEW_ATLAS, oldTile, HERO_NEW_SIZE
	end
	return HERO_ATLAS, tile, HERO_SIZE
end

do
	local countries = {
		atlantic_europe = { "france", "spain", "portugal", "ireland", "madeira", "azores", "canary" },
		mediterranean = { "italy", "venice", "tuscany", "naples", "sicily", "malta", "greece", "levant", "ottoman", "ragusa", "crete", "rhodes", "cyprus", "dalmatia", "papal", "mallorca", "sardinia", "corsica" },
		red_sea = { "egypt", "yemen", "hejaz", "oman" },
		west_africa = { "senegal", "guinea", "sierra_leone", "gold_coast", "dahomey", "benin", "niger_delta" },
		americas = { "canada", "newfoundland", "new_france", "new_england", "new_netherland", "pennsylvania", "carolina", "louisiana",
			"bahamas", "cuba", "new_spain", "jamaica", "hispaniola", "puerto_rico", "barbados", "trinidad", "venezuela", "new_granada",
			"panama", "suriname", "brazil", "rio_de_la_plata", "quito", "peru", "chile" },
		north_sea = { "england", "netherlands", "denmark", "sweden", "norway", "scotland", "germany" },
		east_africa = { "swahili", "somalia", "mozambique" },
		east_asia = { "china", "japan", "korea", "macau", "formosa" },
		south_asia = { "gujarat", "portuguese_india", "malabar", "ceylon", "coromandel", "bengal" },
		southeast_asia = { "malay", "vietnam", "java", "celebes", "moluccas", "borneo" },
	}
	local mediterraneanPorts = { marseille = true, toulon = true, barcelona = true, valencia = true, cartagena = true, malaga = true }
	local regionByCountry = {}
	for region, ids in countries do
		for _, id in ids do
			regionByCountry[id] = region
		end
	end

	-- 항구가 속한 해역 id (초상화 시트 고르기용)
	function H.regionOfPort(portId)
		local port = portId and PortData.Ports[portId]
		if not port then
			return nil
		end
		return if mediterraneanPorts[portId] then "mediterranean" else regionByCountry[port.country]
	end

	-- 화가가 그려 주는 초상 후보: 그 지역 교역소 사람들 10칸 (1700년 이후 화풍)
	function H.npcCellAsset(portId, cell)
		local port = portId and PortData.Ports[portId]
		if not port then
			return nil
		end
		local region = if mediterraneanPorts[portId] then "mediterranean" else regionByCountry[port.country]
		local atlas = region and AssetIds["Portraits/npc_" .. region]
		if not atlas or type(cell) ~= "number" or cell < 0 or cell > 9 then
			return nil
		end
		return atlas, Vector2.new(cell % 5 * 200, math.floor(cell / 5) * 200), Vector2.new(200, 200)
	end

	local RegionSheetOf = require(Shared:WaitForChild("Specialties")).RegionSheets
	function H.facilityPortraitAsset(portId, role)
		local playerView = view and view.player
		local port = portId and PortData.Ports[portId]
		if not port or not playerView or (playerView.year or 0) < 1700 or (role ~= "merchant" and role ~= "tavern") then
			return nil
		end
		local region = if mediterraneanPorts[portId] then "mediterranean" else regionByCountry[port.country]
		local atlas = region and AssetIds["Portraits/npc_" .. region]
		if not atlas then
			return nil
		end
		local seed = 0
		for index = 1, #portId do
			seed = (seed * 31 + string.byte(portId, index)) % 101
		end
		local rotation = math.floor((playerView.day or 0) / 30)
		-- 격달로 새 지역 인물 시트의 젊은 인물이 가게를 맡는다
		local sheet = RegionSheetOf and RegionSheetOf[region]
		local fresh = sheet and AssetIds["Portraits/companions_" .. sheet]
		if fresh and (seed + rotation) % 2 == 1 then
			local c = (seed * 7 + rotation * 3 + (if role == "tavern" then 11 else 0)) % 20
			return fresh, Vector2.new(c % 5 * 256, math.floor(c / 5) * 336), Vector2.new(256, 336)
		end
		local cell = (seed + rotation) % 10 + (if role == "tavern" then 10 else 0)
		-- 술잔을 든 칸(북해 주점 19번)은 술 그림 금지 규칙에 따라 건너뛴다.
		if region == "north_sea" and cell == 19 then
			cell = 18
		end
		return atlas, Vector2.new(cell % 5 * 200, math.floor(cell / 5) * 200), Vector2.new(200, 200)
	end
end

local function setPortrait(groupName)
	local heroNation = nil
	local tile = PORTRAIT_GROUP[groupName]
	local portId = view and view.player and view.player.portId
	local regionalId, regionalOffset, regionalSize = H.facilityPortraitAsset(portId, tile)
	local heroId, heroOffset, heroSize
	if heroNation then
		heroId, heroOffset, heroSize = H.heroPortraitAsset(heroNation)
	end
	local imageId = heroId or regionalId
		or (if tile and FACILITY_ATLAS then FACILITY_ATLAS
			elseif tile and PORTRAIT_ATLAS then PORTRAIT_ATLAS
			elseif tile == "merchant" then AssetIds["Portraits/merchant"] else nil)
	local offset = heroOffset or regionalOffset
		or (if imageId and imageId == FACILITY_ATLAS and tile then FACILITY_TILE[tile]
			elseif imageId and imageId == PORTRAIT_ATLAS and tile then PORTRAIT_TILE[tile] else nil)
	local identity = groupName .. ":" .. tostring(heroNation or portId or "") .. ":" .. tostring(imageId) .. ":" .. tostring(offset)
	if portraitKey == identity then
		return
	end
	portraitKey = identity
	portraitImage.Visible = imageId ~= nil
	portraitFrame.Visible = imageId == nil
	portraitImage.Image = if imageId then "rbxassetid://" .. tostring(imageId) else ""
	portraitImage.ImageRectOffset = offset or Vector2.zero
	portraitImage.ImageRectSize = heroSize or regionalSize or (if offset then PORTRAIT_SIZE else Vector2.zero)
	-- 이미지 전환 시 이전 3D 모델까지 정리해 불필요한 뷰포트 객체가 남지 않도록 한다.
	for _, c in portraitFrame:GetChildren() do
		if c:IsA("Model") then
			c:Destroy()
		end
	end
	if imageId then
		return
	end
	local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
	local people = lib and lib:FindFirstChild("People")
	local tpl = people and people:FindFirstChild("KayKit_" .. (PORTRAIT_ROLE[groupName] or "Knight"))
	if not tpl then
		portraitKey = nil -- 모델이 아직 없으면 다음 갱신에서 다시 시도한다
		return
	end
	local m = tpl:Clone()
	for _, d in m:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = true
		end
	end
	m.Parent = portraitFrame
	Pose.relaxArms(m)
	local cf, size = m:GetBoundingBox()
	local head = cf.Position + Vector3.new(0, size.Y * 0.32, 0)
	portraitCam.CFrame = CFrame.lookAt(head + Vector3.new(0, 0.2, size.Y * 1.2), head)
end

local coinChip, _, coinValue = CommonUI.CreateCurrencyChip({ name = "Coins", size = UDim2.fromOffset(94, 28), text = "0", theme = H.bookTheme })
coinChip.AnchorPoint = Vector2.new(1, 0)
coinChip.Position = UDim2.new(1, -10, 0, 7)
coinChip.Parent = mainInner

local tabBar = Instance.new("Frame")
tabBar.BackgroundTransparency = 1
tabBar.BorderSizePixel = 0
tabBar.Position = UDim2.fromOffset(8, 52)
tabBar.Size = UDim2.new(1, -16, 0, 40) -- 시설별로 관련 탭만 한 줄에 보여준다
tabBar.Parent = mainInner
local tabLayout = Instance.new("UIGridLayout")
tabLayout.CellSize = UDim2.new(0.25, -5, 0, 38)
tabLayout.CellPadding = UDim2.fromOffset(5, 0)
tabLayout.SortOrder = Enum.SortOrder.LayoutOrder
tabLayout.Parent = tabBar

local content = Instance.new("ScrollingFrame")
content.BackgroundTransparency = 1
content.BorderSizePixel = 0
content.Position = UDim2.fromOffset(8, 100)
content.Size = UDim2.new(1, -16, 1, -108)
content.CanvasSize = UDim2.new()
content.AutomaticCanvasSize = Enum.AutomaticSize.Y
content.ScrollBarThickness = 4
content.Parent = mainInner
local contentLayout = Instance.new("UIListLayout")
contentLayout.Padding = UDim.new(0, 5)
contentLayout.SortOrder = Enum.SortOrder.LayoutOrder
contentLayout.Parent = content

-- 넓은 화면은 왼쪽 책갈피, 좁은 화면은 상단 한 줄 목차를 사용한다.
H.bookSpine = pageRule(mainInner, UDim2.fromOffset(132, 86), UDim2.new(0, 1, 1, -94))
function H.layoutBook()
	local wide = mainInner.AbsoluteSize.X >= 610
	local tabs = tabBar.Visible
	H.bookSpine.Visible = tabs and wide
	if tabs and wide then
		tabBar.Position = UDim2.fromOffset(8, 86)
		tabBar.Size = UDim2.new(0, 116, 1, -94)
		tabLayout.CellSize = UDim2.new(1, 0, 0, 44)
		tabLayout.CellPadding = UDim2.fromOffset(0, 6)
		content.Position = UDim2.fromOffset(142, 86)
		content.Size = UDim2.new(1, -150, 1, -94)
	else
		tabBar.Position = UDim2.fromOffset(8, 86)
		tabBar.Size = UDim2.new(1, -16, 0, 40)
		tabLayout.CellSize = UDim2.new(0.25, -4, 0, 40)
		tabLayout.CellPadding = UDim2.fromOffset(5, 0)
		local top = if tabs then 134 else 86
		content.Position = UDim2.fromOffset(8, top)
		content.Size = UDim2.new(1, -16, 1, -top - 8)
	end
end
mainInner:GetPropertyChangedSignal("AbsoluteSize"):Connect(H.layoutBook)
tabBar:GetPropertyChangedSignal("Visible"):Connect(H.layoutBook)
H.layoutBook()

local menuToggle = CommonUI.CreatePrimaryButton({ name = "MenuToggle", text = "메뉴", size = UDim2.fromOffset(80, 40), minHeight = 40, minWidth = 60 })
menuToggle.AnchorPoint = Vector2.new(0, 0)
menuToggle.Position = UDim2.fromOffset(8, 8)
menuToggle.Visible = false
menuToggle.Parent = gui
menuToggle.Size = UDim2.fromOffset(0, 0) -- 옛 "메뉴" 버튼은 HUD가 대신한다 (표시 상태 신호만 사용)
menuToggle.BackgroundTransparency = 1
menuToggle.Text = ""

-- 대항해시대 온라인풍 HUD: 좌상단 선장 카드, 우상단 소지금, 하단 메뉴 독 -----------------
local NAVY = COLORS.cover
local NAVY2 = COLORS.coverRaised
local BRASS = Color3.fromRGB(214, 170, 82)

local function hudStroke(obj, thickness)
	local st = Instance.new("UIStroke")
	st.Color = BRASS
	st.Thickness = thickness or 1.5
	st.Parent = obj
end

local hud = Instance.new("Frame")
hud.Name = "Hud"
hud.BackgroundTransparency = 1
hud.Size = UDim2.fromScale(1, 1)
hud.Visible = false
hud.Parent = gui

local card = Instance.new("Frame")
card.BackgroundColor3 = NAVY
card.BackgroundTransparency = 0.08
card.Position = UDim2.fromOffset(8, 8)
card.Size = UDim2.fromOffset(250, 66)
H.hudCard = card
card.Parent = hud
corner(card, 10)
hudStroke(card, 2)
do
	local g = Instance.new("UIGradient")
	g.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255), Color3.fromRGB(190, 190, 200))
	g.Rotation = 90
	g.Parent = card
end

local function hudText(parent, pos, size, textSize, color, align)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Position = pos
	l.Size = size
	l.Font = Enum.Font.GothamBold
	l.TextSize = textSize
	l.TextColor3 = color
	l.TextXAlignment = align or Enum.TextXAlignment.Left
	l.Text = ""
	l.Parent = parent
	return l
end

H.hudName = hudText(card, UDim2.fromOffset(62, 4), UDim2.new(1, -70, 0, 16), 12, BRASS)
H.hudCoin = hudText(card, UDim2.fromOffset(62, 4), UDim2.new(1, -70, 0, 16), 12, Color3.fromRGB(255, 226, 120), Enum.TextXAlignment.Right)
H.hudPort = hudText(card, UDim2.fromOffset(62, 21), UDim2.new(1, -70, 0, 14), 11, COLORS.text)
local hullBack = Instance.new("Frame")
hullBack.BackgroundColor3 = Color3.fromRGB(8, 14, 22)
hullBack.Position = UDim2.fromOffset(62, 38)
hullBack.Size = UDim2.new(1, -70, 0, 7)
hullBack.Parent = card
corner(hullBack, 4)
local hullFill = Instance.new("Frame")
hullFill.BackgroundColor3 = COLORS.green
hullFill.Size = UDim2.fromScale(1, 1)
hullFill.Parent = hullBack
corner(hullFill, 4)
H.hudShip = hudText(card, UDim2.fromOffset(62, 48), UDim2.new(1, -70, 0, 14), 10, COLORS.muted)

-- 상단 중앙 항구 현판 (대항해시대 온라인의 항구 이름 리본처럼)
local banner = Instance.new("Frame")
banner.AnchorPoint = Vector2.new(0.5, 0)
banner.Position = UDim2.new(0.5, 0, 0, 8)
banner.Size = UDim2.fromOffset(130, 28)
banner.BackgroundColor3 = Color3.fromRGB(90, 62, 28)
banner.Parent = hud
banner.Visible = false -- 상단 중앙 항구 이름은 쓰지 않는다
corner(banner, 8)
hudStroke(banner, 2)
local hudBanner = hudText(banner, UDim2.new(), UDim2.fromScale(1, 1), 20, Color3.fromRGB(255, 240, 200), Enum.TextXAlignment.Center)
hudBanner.TextSize = 15

local coinCard = Instance.new("Frame")
coinCard.BackgroundColor3 = NAVY
coinCard.BackgroundTransparency = 0.08
coinCard.AnchorPoint = Vector2.new(1, 0)
coinCard.Position = UDim2.new(1, -8, 0, 8)
coinCard.Size = UDim2.fromOffset(120, 30)
coinCard.Parent = hud
coinCard.Visible = false -- 코인은 왼쪽 카드에 표시
corner(coinCard, 10)
hudStroke(coinCard, 2)

local dock = Instance.new("ScrollingFrame")
dock.Name = "Dock"
dock.BackgroundColor3 = NAVY
dock.BackgroundTransparency = 0.15
dock.BorderSizePixel = 0
dock.AnchorPoint = Vector2.new(1, 0)
dock.Position = UDim2.new(1, -8, 0, -50) -- 상단 인셋(약 57)만큼 올려 화면 맨 위에 붙인다 -- 오른쪽 위: 왼쪽 조이스틱과 점프 버튼을 피한다
dock.Size = UDim2.fromOffset(112, 232)
dock.CanvasSize = UDim2.new()
dock.AutomaticCanvasSize = Enum.AutomaticSize.Y
dock.ScrollBarThickness = 2
dock.ScrollingDirection = Enum.ScrollingDirection.Y
dock.Parent = hud
corner(dock, 10)
hudStroke(dock, 1.5)
local dockLayout = Instance.new("UIGridLayout")
dockLayout.CellSize = UDim2.fromOffset(48, 54)
dockLayout.CellPadding = UDim2.fromOffset(4, 4)
dockLayout.SortOrder = Enum.SortOrder.LayoutOrder
dockLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
dockLayout.Parent = dock
local dockPad = Instance.new("UIPadding")
dockPad.PaddingTop, dockPad.PaddingBottom = UDim.new(0, 5), UDim.new(0, 5)
dockPad.Parent = dock

H.DOCK = {
	{ "view", "걷기" }, { "trade", "교역" }, { "crew", "동료" }, { "route", "항해" }, { "map", "일지" },
	{ "yard", "조선소" }, { "explore", "탐험" }, { "codex", "백과사전" }, { "tech", "연구" },
	{ "quest", "퀘스트" }, { "battle", "전투" }, { "status", "상태" },
}
for i, d in H.DOCK do
	local b = Instance.new("TextButton")
	b.Name = "Menu_" .. d[1]
	b.LayoutOrder = i
	b.Size = UDim2.fromOffset(48, 54)
	b.BackgroundColor3 = NAVY2
	b.AutoButtonColor = true
	b.Font = Enum.Font.GothamBold
	b.TextSize = 11
	b.TextColor3 = Color3.fromRGB(250, 236, 200)
	b.Text = ""
	b.Parent = dock
	-- 메뉴 그림과 이름은 함께 유지해서 터치와 읽기를 지원한다.
	local menuLabel = Instance.new("TextLabel")
	menuLabel.Name = "Label"
	menuLabel.BackgroundTransparency = 1
	menuLabel.Position = UDim2.fromOffset(1, 35)
	menuLabel.Size = UDim2.new(1, -2, 0, 17)
	menuLabel.Font = Enum.Font.GothamBold
	menuLabel.TextSize = 10
	menuLabel.TextColor3 = Color3.fromRGB(250, 236, 200)
	menuLabel.Text = d[2]
	menuLabel.Parent = b
	local menuKey = if d[1] == "crew" and not AssetIds["Menu/crew"] then "harbor" else d[1]
	if AssetIds["Menu/" .. menuKey] then
		local icon = modelIcon(b, "Menu", menuKey, nil, 31)
		icon.Name = "Icon"
		icon.AnchorPoint = Vector2.new(0.5, 0)
		icon.Position = UDim2.new(0.5, 0, 0, 3)
	end
	corner(b, 8)
	do
		local g = Instance.new("UIGradient")
		g.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255), Color3.fromRGB(170, 170, 180))
		g.Rotation = 90
		g.Parent = b
	end
	local bs = Instance.new("UIStroke")
	bs.Color = BRASS
	bs.Thickness = 1
	bs.Transparency = 0.35
	bs.Parent = b
	b.Activated:Connect(function()
		if d[1] == "view" then
			overview = not overview
			menuLabel.Text = if overview then "걷기" else "전경"
			applyView()
		else
			openTab(d[1])
		end
	end)
end

-- 설정 창 (대항해 계열 게임의 시스템 메뉴처럼): 소리 · 화면 · 도움말 · 게임 관리를 한 창에 모았다 ------------------
local render
local openOptions
local gear = Instance.new("TextButton")
gear.Name = "OptionsButton"
gear.AnchorPoint = Vector2.new(1, 0)
gear.Position = UDim2.new(1, -8, 0, 188)
gear.Size = UDim2.fromOffset(112, 38)
gear.BackgroundColor3 = NAVY2
gear.Font = Enum.Font.GothamBold
gear.TextSize = 14
gear.TextColor3 = Color3.fromRGB(250, 236, 200)
gear.Text = "⚙ 설정"
gear.Parent = hud
corner(gear, 10)
hudStroke(gear, 1.5)
gear.Activated:Connect(function()
	Sfx.play("sfx_click")
	openOptions()
end)

-- 개인 카드 창: 내가 가진 카드(주인공·동료·지식·유물·동물·우군·배)와 지도자 능력을 보여 준다 (오른쪽 위 버튼)
do
	local BC = require(Shared:WaitForChild("BoardingCards"))
	local KIND = { crew = "🃏 인물", relic = "💎 유물", animal = "🐾 동물", book = "📖 지식", friend = "🤝 우군", ship = "⚓ 배" }
	local deckBtn = Instance.new("TextButton")
	deckBtn.Name = "DeckButton"
	deckBtn.AnchorPoint = Vector2.new(1, 0)
	deckBtn.Position = UDim2.new(1, -128, 0, 8)
	deckBtn.Size = UDim2.fromOffset(100, 34)
	deckBtn.BackgroundColor3 = NAVY2
	deckBtn.Font = Enum.Font.GothamBold
	deckBtn.TextSize = 14
	deckBtn.TextColor3 = Color3.fromRGB(250, 236, 200)
	deckBtn.Text = "🃏 내 카드"
	deckBtn.Parent = hud
	corner(deckBtn, 10)
	hudStroke(deckBtn, 1.5)
	local open = nil
	function H.openDeck()
		if open then
			open:Destroy()
			open = nil
			return
		end
		local layer = overlayGui("DeckWindow", 56)
		open = layer
		local dim = Instance.new("TextButton")
		dim.Size = UDim2.fromScale(1, 1)
		dim.BackgroundColor3 = Color3.new(0, 0, 0)
		dim.BackgroundTransparency = 0.5
		dim.Text = ""
		dim.AutoButtonColor = false
		dim.Parent = layer
		dim.Activated:Connect(function()
			layer:Destroy()
			open = nil
		end)
		local win = Instance.new("Frame")
		win.AnchorPoint = Vector2.new(0.5, 0.5)
		win.Position = UDim2.fromScale(0.5, 0.5)
		win.Size = UDim2.fromScale(0.96, 0.94)
		win.BackgroundColor3 = NAVY
		win.BorderSizePixel = 0
		win.Parent = layer
		corner(win, 14)
		hudStroke(win, 2)
		local cons = Instance.new("UISizeConstraint")
		cons.MaxSize = Vector2.new(760, 820)
		cons.Parent = win
		local deck = view and view.deck
		local cards = (deck and deck.cards) or {}
		local title = mkLabel(win, string.format("🃏 내 카드 (%d장) — 접현 카드전에서 쓰여요", #cards), 18, Color3.fromRGB(246, 208, 130), true)
		title.Position = UDim2.fromOffset(14, 10)
		title.Size = UDim2.new(1, -28, 0, 26)
		title.AutomaticSize = Enum.AutomaticSize.None
		local list = Instance.new("ScrollingFrame")
		list.Position = UDim2.fromOffset(10, 44)
		list.Size = UDim2.new(1, -20, 1, -54)
		list.BackgroundTransparency = 1
		list.BorderSizePixel = 0
		list.ScrollBarThickness = 5
		list.AutomaticCanvasSize = Enum.AutomaticSize.Y
		list.CanvasSize = UDim2.new()
		list.Parent = win
		local lay = Instance.new("UIListLayout")
		lay.Padding = UDim.new(0, 5)
		lay.Parent = list
		for _, c in cards do
			local info = BC.SkillInfo[c.skill]
			local unitId = BC.SkillCard[c.skill]
			local unit = unitId and (BC.Units[unitId] or BC.Specials[unitId])
			local unitText = ""
			if unit then
				unitText = if unit.special then "특수 카드" else string.format("%s 줄 · 전투력 %d%s", BC.ROW_NAME[unit.row], unit.power, if unit.hero then " · 영웅" else "")
			end
			local row = mkLabel(list, string.format("%s  %s\n스킬: %s — %s\n%s", KIND[c.kind] or "🃏", c.name, info and info.name or c.skill, info and info.text or "", unitText), 13, COLORS.text, false)
			row.AutomaticSize = Enum.AutomaticSize.Y
			row.Size = UDim2.new(1, -8, 0, 0)
			row.TextWrapped = true
			row.TextXAlignment = Enum.TextXAlignment.Left
			row.BackgroundTransparency = 0.2
			row.BackgroundColor3 = NAVY2
			corner(row, 8)
			if unit then
				mkButton(list, "전투 카드 펼치기", COLORS.blue, UDim2.new(1, -8, 0, 36), function()
					H.showCombatCard(unit, c.name, info)
				end)
			end
		end
		local note = mkLabel(list, "병종 상성: 근접 > 포 > 사격 > 근접. 유리한 줄은 ×1.3, 불리한 줄은 ×0.85. 새 지식·유물·동물·항해자를 만날수록 카드가 늘어요.", 12, COLORS.muted, false)
		note.TextWrapped = true
		note.Size = UDim2.new(1, -8, 0, 0)
		note.AutomaticSize = Enum.AutomaticSize.Y
	end
	deckBtn.Activated:Connect(function()
		Sfx.play("sfx_click")
		H.openDeck()
	end)
end

function H.updateHud(p, ship)
	H.hudName.Text = string.format("%s · %d년", p.nation, p.year)
	H.hudPort.Text = "항구  " .. tostring(p.portName)
	hudBanner.Text = tostring(p.portName)
	hullFill.Size = UDim2.fromScale(math.clamp(ship.hull / math.max(1, ship.maxHull), 0, 1), 1)
	hullFill.BackgroundColor3 = if ship.hull / math.max(1, ship.maxHull) < 0.35 then COLORS.red else COLORS.green
	H.hudShip.Text = string.format("%s  화물 %d/%d  명성 %d", ship.name, ship.cargoUsed, ship.cargoCapacity, p.fame)
	H.hudCoin.Text = tostring(p.coins) .. " 코인"
end

-- 화면 중앙 상단 동료 말풍선: 게임을 시작하거나 새 항구에 닿으면 동료가 인사하고 앞으로 할 일을 조언한다.
local bubble = Instance.new("Frame")
bubble.Name = "CompanionBubble"
bubble.AnchorPoint = Vector2.new(0.5, 0)
bubble.Position = UDim2.new(0.5, 0, 0, 8)
bubble.Size = UDim2.new(0.34, 0, 0, 0)
bubble.AutomaticSize = Enum.AutomaticSize.Y
bubble.BackgroundColor3 = NAVY
bubble.BackgroundTransparency = 0.05
bubble.Visible = false
bubble.Active = true
bubble.ZIndex = 20
bubble.Parent = hud
corner(bubble, 12)
hudStroke(bubble, 2)
do
	local limit = Instance.new("UISizeConstraint")
	limit.MinSize = Vector2.new(220, 0)
	limit.MaxSize = Vector2.new(380, 1000)
	limit.Parent = bubble
	local pad = Instance.new("UIPadding")
	pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 8), UDim.new(0, 8), UDim.new(0, 10), UDim.new(0, 10)
	pad.Parent = bubble
	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 3)
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = bubble
end
local function bubbleLabel(order, textSize, color)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Size = UDim2.new(1, 0, 0, 0)
	l.AutomaticSize = Enum.AutomaticSize.Y
	l.Font = Enum.Font.GothamMedium
	l.TextSize = textSize
	l.TextColor3 = color
	l.TextWrapped = true
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.RichText = false
	l.Text = ""
	l.LayoutOrder = order
	l.ZIndex = 21
	l.Parent = bubble
	return l
end
H.bubbleWho = bubbleLabel(1, 14, COLORS.gold)
H.bubbleLine = bubbleLabel(2, 13, COLORS.text)
H.bubbleAdvice = bubbleLabel(3, 13, Color3.fromRGB(190, 230, 200))
local bubbleNext = bubbleLabel(4, 12, COLORS.muted)
local bubbleKey, bubbleToken = nil, 0
function H.hideBubble()
	bubbleToken += 1
	bubble.Visible = false
end
bubble.InputBegan:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
		H.hideBubble()
	end
end)
local function refreshBubble()
	local adv = view and view.advice
	if not adv or not hud.Visible then
		return
	end
	local key = tostring(adv.who) .. "|" .. tostring(view.player and view.player.portName)
	if key == bubbleKey then
		return
	end
	local first = bubbleKey == nil
	bubbleKey = key
	H.bubbleWho.Text = "💬 " .. tostring(adv.who)
	H.bubbleLine.Text = "\"" .. tostring(adv.line or "") .. "\""
	H.bubbleAdvice.Text = "조언: " .. tostring(adv.text)
	bubbleNext.Text = if adv.next then "▶ 다음 할 일: " .. adv.next else ""
	bubbleNext.Visible = adv.next ~= nil
	bubbleToken += 1
	local token = bubbleToken
	bubble.Visible = true
	task.delay(if first then 16 else 10, function()
		if bubbleToken == token then
			bubble.Visible = false
		end
	end)
end

menuToggle:GetPropertyChangedSignal("Visible"):Connect(function()
	hud.Visible = menuToggle.Visible
	if hud.Visible then
		refreshBubble()
	end
end)

function H.clearContent()
	for _, child in content:GetChildren() do
		if not child:IsA("UIListLayout") then
			child:Destroy()
		end
	end
end

-- 서버 호출 -----------------------------------------------------------------

local tradeHallRefresh -- 교역소 별도 화면이 열려 있으면 서버 응답 뒤에 다시 그린다

local lastCallAt = 0
local function call(action, payload)
	-- 앞선 요청이 끝나길 잠깐 기다린다 (버튼을 눌렀는데 아무 반응이 없던 문제 방지). 너무 오래 걸리면 풀어 준다.
	local waited = 0
	while busy and waited < 8 do
		task.wait(0.1)
		waited += 0.1
	end
	-- 서버는 0.1초 안에 온 요청을 거절하므로 간격을 둔다
	local gap = os.clock() - lastCallAt
	if gap < 0.13 then
		task.wait(0.13 - gap)
	end
	busy = true
	local done, ok, result = false, false, nil
	task.spawn(function()
		ok, result = pcall(function()
			return remote:InvokeServer(action, payload or {})
		end)
		done = true
	end)
	local t = 0
	while not done and t < 15 do
		task.wait(0.05)
		t += 0.05
	end
	busy = false
	lastCallAt = os.clock()
	if not done then
		message, messageOk = "서버 응답이 늦어요. 잠시 후 다시 눌러 주세요", false
		render()
		return nil
	end
	if DEBUG_LOG then print("[Game] call", action, ok, type(result) == "table" and result.ok, type(result) == "table" and result.message or result) end
	if not ok or type(result) ~= "table" then
		message, messageOk = "서버와 연결하지 못했어요", false
		render()
		return nil
	end
	do
		local good = result.ok
		local snd = nil
		if not good then
			snd = if result.message and result.message ~= "" and result.message ~= "너무 빨라요" then "sfx_error" else nil
		elseif action == "Buy" or action == "MarketBuy" then
			snd = "sfx_buy"
			task.delay(0.18, Sfx.play, "sfx_cargo_drop", 0.7) -- 짐 싣는 소리
		elseif action == "Sell" or action == "Smuggle" or action == "MarketPost" then
			snd = "sfx_sell"
			task.delay(0.12, Sfx.play, "sfx_coin_pouch", 0.7) -- 동전 주머니
		elseif action == "TurnInContract" then
			snd = "sfx_contract_stamp"
		elseif action == "TurnInBounty" or action == "MailClaim" or action == "Audience" or action == "Recruit" then
			snd = "sfx_fanfare"
		elseif action == "BuyGear" or action == "ToggleGear" then
			snd = "sfx_equipment_wear"
		elseif action == "BuyShip" or action == "BuyEscort" or action == "Invest" or action == "Feast" then
			snd = "sfx_coin"
		elseif action == "Repair" then
			snd = "sfx_workshop_chop" -- 조선소 망치질
		elseif action == "Sail" or action == "HistoryChoose" then
			snd = "sfx_horn"
			if action == "Sail" then
				task.delay(0.2, Sfx.play, "sfx_rope_pull", 0.8) -- 닻줄·돛줄 당기는 소리
			end
		elseif action == "Accept" then
			snd = "sfx_quest_accept"
		elseif action == "PlayStory" then
			snd = "sfx_bell" -- 이야기의 시작을 알리는 종
		elseif action == "Claim" or action == "TurnIn" then
			snd = "sfx_quest_reward" -- 퀘스트 완료
		elseif action == "IntroCompanion" then
			snd = "sfx_fanfare" -- 새 동료
		elseif action == "IntroName" then
			snd = "sfx_buy" -- 장부에 도장 찍는 소리
		end
		local msg = result.message or ""
		if not snd and string.find(msg, "퀘스트 조건 달성", 1, true) then
			snd = "sfx_bell"
		elseif (action == "Claim" or action == "Accept") and string.find(msg, "+", 1, true) and string.find(msg, "코인", 1, true) then
			task.delay(0.5, Sfx.play, "sfx_coin") -- 보상 코인이 들어오는 소리
		end
		if snd then
			Sfx.play(snd)
		end
		if good and string.find(msg, "보물", 1, true) then
			task.delay(0.4, Sfx.play, "sfx_treasure_chest", 0.8)
		end
	end
	if result.scene then
		task.defer(H.playWonderScene, result.scene)
	end
	if result.ranking then
		ranking = result.ranking
	end
	if result.mail then
		mailBox = result.mail
	end
	if result.market then
		marketList = result.market
	end
	if result.view then
		view = result.view
		if currentTab ~= "battle" then
			equipped = nil
		end
		refreshBubble()
	end
	if result.message and result.message ~= "" then
		message, messageOk = result.message, result.ok
	end
	render()
	if tradeHallRefresh then
		tradeHallRefresh()
	end
	-- 해전을 했다면 전투 기록을 3D 장면으로 보여 준다
	if result.ok and (action == "Hunt" or action == "ChallengeBoss") and view and view.lastBattle and not inField then
		local lb = view.lastBattle
		local resolved = false
		inField = true
		main.Visible = false
		audioLock = true
		Sfx.music("music_battle")
		-- 포격·착탄·파도·선체 충격음은 실제 해전 3D 장면에 맞춰 재생한다.
		NavalBattle.play({
			shipId = view.ship and view.ship.id,
			shipName = view.ship and view.ship.name,
			fleet = (function()
				local names = {}
				for _, f in (view.fleet and view.fleet.ships) or {} do
					table.insert(names, f.name)
				end
				for _ = 1, (view.fleet and view.fleet.escorts) or 0 do
					table.insert(names, "호위함")
				end
				return names
			end)(),
			weatherName = view.weather and view.weather.name,
			wind = view.weather and view.weather.wind,
			windAngle = ((view.weather and string.byte(view.weather.id or "x", 1) or 0) * 47) % 360,
			enemyName = lb.enemy,
			deck = view.deck,
			log = lb.log,
			winner = lb.winner,
			reason = lb.reason,
			isBoss = action == "ChallengeBoss",
			canFlee = lb.canFlee == true,
			onFlee = function()
				resolved = true
				call("ResolveBattle", { flee = true })
				return view ~= nil and view.lastBattle ~= nil and view.lastBattle.fled == true
			end,
			onDone = function(flairScore)
				if flairScore and flairScore > 0 and not lb.pending then
					task.spawn(function()
						call("BattleFlair", { score = flairScore })
					end)
				end
				if lb.pending and not resolved then
					resolved = true
					call("ResolveBattle", { flee = false })
				end
				inField = false
				audioLock = false
				Sfx.play(if lb.winner == "a" then "sfx_fanfare" else "sfx_error")
				Sfx.music(if lb.winner == "a" then Sfx.questEndMusic(true) else Sfx.questEndMusic(false))
				applyView()
				main.Visible = true
				render()
			end,
		})
	end
	return result
end

local function amount()
	return AMOUNTS[amountIndex]
end

-- 항해 연출: 바다 위를 달리는 배, 날아다니는 갈매기, 일렁이는 파도 ----------------------

local RunService = game:GetService("RunService")

local function hypot(a, b) -- Luau에는 math.hypot이 없다
	return math.sqrt(a * a + b * b)
end

local function mkBox(parent, pos, size, color, alpha)
	local f = Instance.new("Frame")
	f.Position = pos
	f.Size = size
	f.BackgroundColor3 = color
	f.BackgroundTransparency = alpha or 0
	f.BorderSizePixel = 0
	f.Parent = parent
	return f
end

local MAP_RATIO = (Geo.cols * 0.66) / Geo.rows
local function geoX(lon) return (lon - Geo.lonMin) / (Geo.lonMax - Geo.lonMin) end
local function geoY(lat) return (Geo.latMax - lat) / (Geo.latMax - Geo.latMin) end

local function drawLand(frame)
	for _, st in Geo.landStrips do
		local land = Instance.new("Frame")
		land.Position = UDim2.fromScale(st[2] / Geo.cols, st[1] / Geo.rows)
		land.Size = UDim2.fromScale((st[3] - st[2]) / Geo.cols, 1 / Geo.rows + 0.002)
		land.BackgroundColor3 = Color3.fromRGB(122, 140, 96)
		land.BorderSizePixel = 0
		land.Parent = frame
	end
end

function H.playVoyage(fromName, toName, days, steam, path)
	local overlay = Instance.new("TextButton") -- 누르면 건너뛰기
	overlay.Name = "VoyageScene"
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.Text = ""
	overlay.AutoButtonColor = false
	overlay.BackgroundColor3 = Color3.fromRGB(120, 180, 225)
	overlay.BorderSizePixel = 0
	overlay.ZIndex = 50
	local layer = overlayGui("Overlay", 20)
	overlay.Parent = layer
	overlay.Destroying:Connect(function() task.defer(function() layer:Destroy() end) end)

	-- 하늘 위쪽, 바다 아래쪽
	mkBox(overlay, UDim2.fromScale(0, 0.5), UDim2.fromScale(1, 0.5), Color3.fromRGB(34, 96, 150))
	mkBox(overlay, UDim2.fromScale(0, 0.5), UDim2.new(1, 0, 0, 2), Color3.fromRGB(220, 240, 255), 0.3)
	mkBox(overlay, UDim2.fromScale(0.78, 0.12), UDim2.fromOffset(46, 46), Color3.fromRGB(255, 236, 170)).Parent = overlay -- 해
	local sun = overlay:GetChildren()[#overlay:GetChildren()]
	local sc = Instance.new("UICorner")
	sc.CornerRadius = UDim.new(1, 0)
	sc.Parent = sun

	-- 구름
	local clouds = {}
	for i = 1, 3 do
		local c = mkBox(overlay, UDim2.fromScale(0.2 * i + 0.1, 0.08 + 0.07 * i), UDim2.fromOffset(70 + 20 * i, 16), Color3.new(1, 1, 1), 0.25)
		local cc = Instance.new("UICorner")
		cc.CornerRadius = UDim.new(1, 0)
		cc.Parent = c
		table.insert(clouds, c)
	end

	-- 파도 줄무늬
	local waves = {}
	for i = 1, 14 do
		local w = mkBox(overlay, UDim2.fromScale((i * 0.37) % 1, 0.54 + (i % 7) * 0.065), UDim2.fromOffset(40 + (i % 3) * 18, 3), Color3.new(1, 1, 1), 0.6)
		table.insert(waves, { f = w, speed = 0.12 + (i % 4) * 0.05 })
	end

	-- 배 (도형으로 그린 범선)
	local ship = Instance.new("Frame")
	ship.AnchorPoint = Vector2.new(0.5, 0.8)
	ship.Position = UDim2.fromScale(0.5, 0.56)
	ship.Size = UDim2.fromOffset(150, 120)
	ship.BackgroundTransparency = 1
	ship.Parent = overlay
	local hull = mkBox(ship, UDim2.fromOffset(10, 86), UDim2.fromOffset(130, 26), Color3.fromRGB(110, 70, 40))
	local hc = Instance.new("UICorner")
	hc.CornerRadius = UDim.new(0.45, 0)
	hc.Parent = hull
	mkBox(ship, UDim2.fromOffset(10, 90), UDim2.fromOffset(130, 3), Color3.fromRGB(224, 170, 69))
	mkBox(ship, UDim2.fromOffset(72, 8), UDim2.fromOffset(4, 80), Color3.fromRGB(70, 45, 28)) -- 돛대
	mkBox(ship, UDim2.fromOffset(78, 14), UDim2.fromOffset(46, 34), Color3.fromRGB(245, 238, 220))
	mkBox(ship, UDim2.fromOffset(78, 52), UDim2.fromOffset(52, 30), Color3.fromRGB(235, 226, 204))
	mkBox(ship, UDim2.fromOffset(30, 34), UDim2.fromOffset(38, 46), Color3.fromRGB(240, 232, 212))
	mkBox(ship, UDim2.fromOffset(76, 2), UDim2.fromOffset(18, 8), Color3.fromRGB(214, 82, 76)) -- 깃발
	local smoke = {}
	if steam then
		mkBox(ship, UDim2.fromOffset(112, 56), UDim2.fromOffset(12, 30), Color3.fromRGB(60, 60, 66))
		for i = 1, 4 do
			local p = mkBox(ship, UDim2.fromOffset(112, 50), UDim2.fromOffset(14, 14), Color3.fromRGB(190, 190, 195), 0.3)
			local pc = Instance.new("UICorner")
			pc.CornerRadius = UDim.new(1, 0)
			pc.Parent = p
			table.insert(smoke, p)
		end
	end

	-- 갈매기: 두 날개(회전하는 얇은 막대)가 퍼덕인다
	local gulls = {}
	for i = 1, 5 do
		local g = Instance.new("Frame")
		g.BackgroundTransparency = 1
		g.AnchorPoint = Vector2.new(0.5, 0.5)
		g.Size = UDim2.fromOffset(34, 14)
		g.Parent = overlay
		local l = mkBox(g, UDim2.fromOffset(0, 6), UDim2.fromOffset(18, 3), Color3.new(1, 1, 1))
		local r = mkBox(g, UDim2.fromOffset(16, 6), UDim2.fromOffset(18, 3), Color3.new(1, 1, 1))
		l.AnchorPoint, r.AnchorPoint = Vector2.new(1, 0.5), Vector2.new(0, 0.5)
		l.Position, r.Position = UDim2.fromOffset(17, 7), UDim2.fromOffset(17, 7)
		table.insert(gulls, { f = g, l = l, r = r, y = 0.1 + 0.07 * i, phase = i * 1.3, speed = 0.09 + 0.03 * (i % 3), x0 = (i * 0.23) % 1 })
	end

	-- 오른쪽 위 작은 지도: 바닷길을 따라 배 표시가 움직인다
	local inset = mkBox(overlay, UDim2.new(1, -10, 0, 46), UDim2.fromOffset(190, 190 / MAP_RATIO), Color3.fromRGB(38, 82, 120))
	inset.AnchorPoint = Vector2.new(1, 0)
	inset.ClipsDescendants = true
	inset.ZIndex = 52
	drawLand(inset)
	local cum, total = { 0 }, 0
	for i = 1, #path - 1 do
		total += hypot((path[i + 1][1] - path[i][1]), (path[i + 1][2] - path[i][2]) * 0.66)
		cum[i + 1] = total
		for kk = 0, 6 do
			local f = kk / 6
			local dp = mkBox(inset, UDim2.fromScale(geoX(path[i][2] + (path[i + 1][2] - path[i][2]) * f), geoY(path[i][1] + (path[i + 1][1] - path[i][1]) * f)), UDim2.fromOffset(2, 2), Color3.fromRGB(255, 226, 120))
			dp.AnchorPoint = Vector2.new(0.5, 0.5)
		end
	end
	local marker = mkBox(inset, UDim2.fromScale(geoX(path[1][2]), geoY(path[1][1])), UDim2.fromOffset(9, 9), COLORS.red)
	marker.AnchorPoint = Vector2.new(0.5, 0.5)
	marker.ZIndex = 53
	local mc = Instance.new("UICorner")
	mc.CornerRadius = UDim.new(1, 0)
	mc.Parent = marker

	-- 안내 글자와 진행 막대
	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Position = UDim2.new(0, 0, 0, 14)
	title.Size = UDim2.new(1, 0, 0, 26)
	title.Font = Enum.Font.GothamBold
	title.TextSize = 20
	title.TextColor3 = Color3.new(1, 1, 1)
	title.Text = string.format("%s → %s", fromName, toName)
	title.ZIndex = 51
	title.Parent = overlay
	local dayLabel = Instance.new("TextLabel")
	dayLabel.BackgroundTransparency = 1
	dayLabel.Position = UDim2.new(0, 0, 1, -60)
	dayLabel.Size = UDim2.new(1, 0, 0, 20)
	dayLabel.Font = Enum.Font.Gotham
	dayLabel.TextSize = 14
	dayLabel.TextColor3 = Color3.fromRGB(230, 240, 250)
	dayLabel.ZIndex = 51
	dayLabel.Parent = overlay
	local barBack = mkBox(overlay, UDim2.new(0.1, 0, 1, -34), UDim2.new(0.8, 0, 0, 6), Color3.fromRGB(20, 50, 80))
	local bar = mkBox(barBack, UDim2.fromScale(0, 0), UDim2.fromScale(0, 1), Color3.fromRGB(224, 170, 69))
	local hint = Instance.new("TextLabel")
	hint.BackgroundTransparency = 1
	hint.Position = UDim2.new(0, 0, 1, -22)
	hint.Size = UDim2.new(1, 0, 0, 16)
	hint.Font = Enum.Font.Gotham
	hint.TextSize = 11
	hint.TextColor3 = Color3.fromRGB(200, 215, 230)
	hint.Text = "화면을 누르면 건너뛰어요"
	hint.ZIndex = 51
	hint.Parent = overlay

	local DURATION = math.clamp(2 + days * 0.4, 3, 6)
	local skipped = false
	overlay.Activated:Connect(function() skipped = true end)
	local t = 0
	while t < DURATION and not skipped and overlay.Parent do
		local dt = RunService.Heartbeat:Wait()
		t += dt
		local k = math.clamp(t / DURATION, 0, 1)
		bar.Size = UDim2.fromScale(k, 1)
		do -- 지도 위 배 위치: 누적 길이로 구간을 찾는다
			local target = k * total
			for i = 1, #path - 1 do
				if target <= cum[i + 1] or i == #path - 1 then
					local seg = cum[i + 1] - cum[i]
					local f = if seg > 0 then math.clamp((target - cum[i]) / seg, 0, 1) else 1
					marker.Position = UDim2.fromScale(
						geoX(path[i][2] + (path[i + 1][2] - path[i][2]) * f),
						geoY(path[i][1] + (path[i + 1][1] - path[i][1]) * f)
					)
					break
				end
			end
		end
		dayLabel.Text = string.format("%d / %d일째", math.max(1, math.ceil(k * days)), days)
		ship.Position = UDim2.new(0.5, 0, 0.56 + math.sin(t * 2.2) * 0.008, 0)
		ship.Rotation = math.sin(t * 1.7) * 3
		for i, w in waves do
			local x = (w.f.Position.X.Scale - w.speed * dt) % 1.1
			w.f.Position = UDim2.new(x - 0.05, 0, w.f.Position.Y.Scale, 0)
		end
		for _, c in clouds do
			c.Position = UDim2.new((c.Position.X.Scale + 0.01 * dt) % 1.2 - 0.1, 0, c.Position.Y.Scale, 0)
		end
		for i, p in smoke do
			local q = (t * 0.8 + i * 0.25) % 1
			p.Position = UDim2.fromOffset(112 - q * 38, 50 - q * 46)
			p.BackgroundTransparency = 0.3 + q * 0.7
		end
		for _, g in gulls do
			local x = (g.x0 + t * g.speed) % 1.2 - 0.1
			g.f.Position = UDim2.new(x, 0, g.y + math.sin(t * 1.5 + g.phase) * 0.02, 0)
			local flap = math.sin(t * 9 + g.phase) * 28
			g.l.Rotation = -flap
			g.r.Rotation = flap
		end
	end
	overlay:Destroy()
end

local playStory
local renderTitle
local sailManual = false
local epilogueMessage = nil

local function sail(portId)
	local from = view.player.portName
	local fromId = view.player.portId
	local departureDay = view.player.day
	local days, steam = 1, view.ship.steam
	for _, r in view.routes do
		if r.id == portId then
			days = r.days
		end
	end
	sceneHold = true
	audioLock = true
	-- 항해 중에도 목적지 해역의 승인된 지역 테마곡을 들려준다.
	-- 별도 해역곡을 받을 수 없을 때만 기존 항해곡을 유지한다.
	local destination = PortData.Ports[portId]
	if destination then
		Sfx.portMusic(destination, false)
	else
		Sfx.music("music_sea")
	end
	Sfx.ambient({ "sfx_waves", "sfx_wind" })
	Sfx.play("sfx_sail")
	Sfx.play("sfx_sail_fabric", 0.25) -- CC0 돛천 효과음, 미등록 상태에서는 기존 출항음만 재생
	local result = call("Sail", { portId = portId })
	if result and result.ok then
		local vk = view and view.voyageEvent and view.voyageEvent.kind
		if vk == "dolphins" or vk == "whale" then
			task.delay(4, function()
				Sfx.play("sfx_splash")
				task.wait(1.2)
				Sfx.play("sfx_splash", 0.5)
			end)
		end
		-- 바다 위의 소리: 갈매기와 삐걱거리는 선체가 가끔 들린다
		task.spawn(function()
			local names = { "sfx_gull", "sfx_creak", "sfx_bell", "sfx_gull" }
			local n = 0
			while audioLock and n < 8 do
				task.wait(3 + math.random() * 3)
				if audioLock then
					Sfx.play(names[1 + n % #names], 0.45)
				end
				n += 1
			end
		end)
		-- 1) 3D 항구에서 배가 실제로 부두를 떠나는 장면 (카메라가 배를 따라간다)
		pcall(function()
			if not sceneCtl then
				return
			end
			local dur = sceneCtl.depart(5)
			local cam = workspace.CurrentCamera
			local hull = sceneCtl.hull()
			local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
			main.Visible = false
			-- 배 진행 방향(+X, 바다 쪽)을 따라가는 추적 카메라: 배 뒤쪽 위에서 바라본다
			local RS = game:GetService("RunService")
			local camName = "MareDepartCam"
			if cam and hull then
				workspace:SetAttribute("VoyageActive", true)
				pcall(function() RS:UnbindFromRenderStep(camName) end)
				local t0 = os.clock()
				RS:BindToRenderStep(camName, Enum.RenderPriority.Last.Value + 1, function()
					local c = workspace.CurrentCamera
					if not (c and hull.Parent) then
						return
					end
					local p = hull.Position
					local k = math.clamp((os.clock() - t0) / dur, 0, 1)
					-- 처음엔 부두 쪽 옆에서, 점점 뒤쪽으로 돌아가며 멀어지는 배를 보여 준다
					local back = 34 + k * 26
					local side = 22 * (1 - k * 0.7)
					c.CameraType = Enum.CameraType.Scriptable
					c.FieldOfView = 62
					c.CFrame = CFrame.lookAt(p + Vector3.new(-back, 13 + k * 5, side), p + Vector3.new(16, 2, 0))
				end)
			end
			task.wait(dur)
			pcall(function() RS:UnbindFromRenderStep(camName) end)
			workspace:SetAttribute("VoyageActive", nil)
			if cam and hum then
				cam.CameraType = Enum.CameraType.Custom
				cam.CameraSubject = hum
			end
		end)
		-- 3D 바다 항해 (끝날 때까지 메뉴는 숨겨 둔다). 실패하면 예전 2D 연출로 대신한다.
		local ok, err = pcall(VoyageScene.play, {
			shipId = view.ship.id,
			steam = steam,
			days = days,
			departureDay = departureDay,
			path = SeaRoutes.path(fromId, portId, PortData.Ports),
			fromName = from,
			toName = view.player.portName,
			makeShip = PortScene.makeShip,
			place = PortScene.placeModel,
			escorts = math.min(3, (view.fleet and view.fleet.escorts or 0) + (view.fleet and view.fleet.ships and #view.fleet.ships or 0)),
			weatherId = view.weather and view.weather.id,
			event = view.voyageEvent,
			helm = player:GetAttribute("ManualHelm") == true, -- 설정에서 켠 수동 항해
		})
		if not ok then
			warn("[Game] 3D 항해 오류, 2D로 대체:", err)
			local cam = workspace.CurrentCamera
			cam.CameraType = Enum.CameraType.Custom
			for _, n in { "VoyageHud" } do
				local g = player.PlayerGui:FindFirstChild(n)
				if g then g:Destroy() end
			end
			local vf = workspace:FindFirstChild("VoyageScene")
			if vf then vf:Destroy() end
			ok, err = pcall(H.playVoyage, from, view.player.portName, days, steam, SeaRoutes.path(fromId, portId, PortData.Ports))
		end
		if not ok then
			warn("[Game] voyage scene error:", err)
			for _, g in player.PlayerGui:GetChildren() do
				if g.Name == "Overlay" then
					g:Destroy()
				end
			end
		end
		-- 2) 도착한 항구의 3D 장면: 배가 먼 바다에서 들어와 정박
		arriveNext = true
	end
	main.Visible = true
	menuToggle.Visible = false
	sceneHold = false
	sceneKey = nil
	audioLock = false
	if view and view.voyageChoice then
		local vc = view.voyageChoice
		vc.id = "voyage"
		vc.submit = function(i) return call("VoyageChoice", { index = i }) end
		playStory(vc)
	end
	Sfx.play("sfx_bell")
	Sfx.ambient({ "sfx_waves" })
	syncScene()
end


-- 출항 준비 화면: 항로·일수·보급·날씨를 확인하고 닻을 올린다 -----------------------------------
local function confirmSail(r)
	if r.locked then
		sail(r.id)
		return
	end
	local layer = overlayGui("DepartConfirm", 25)
	local dim = mkBox(layer, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.new(0, 0, 0), 0.45)
	dim.ZIndex = 50
	local card = mkBox(dim, UDim2.fromScale(0.5, 0.5), UDim2.fromOffset(420, 300), Color3.fromRGB(24, 28, 38))
	card.AnchorPoint = Vector2.new(0.5, 0.5)
	card.ZIndex = 51
	local cc = Instance.new("UICorner")
	cc.CornerRadius = UDim.new(0, 10)
	cc.Parent = card
	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Position = UDim2.fromOffset(14, 10)
	title.Size = UDim2.new(1, -28, 0, 26)
	title.Font = Enum.Font.GothamBold
	title.TextSize = 20
	title.TextColor3 = COLORS.gold
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Text = string.format("출항 준비 · %s → %s", view.player.portName, r.name)
	title.ZIndex = 52
	title.Parent = card
	local enough = view.ship.supplies >= (r.supplies or 0)
	local lines = {
		string.format("해역: %s · 거리 약 %d km · 예상 %d일", r.region or "", r.distanceKm or 0, r.days or 1),
		string.format("보급품: %d / 필요 약 %d%s", view.ship.supplies, r.supplies or 0, if enough then "" else "  ⚠ 부족해요"),
		string.format("선원: %d / %d · 선체: %d / %d", view.ship.crew, view.ship.maxCrew, view.ship.hull, view.ship.maxHull),
		string.format("날씨: %s · 사기: %s", view.weather and view.weather.name or "맑음", tostring(view.morale or "-")),
		"닻을 올리면 항해가 시작돼요. 바다에서 무슨 일이 생길지 아무도 몰라요.",
	}
	local info = Instance.new("TextLabel")
	info.BackgroundTransparency = 1
	info.Position = UDim2.fromOffset(14, 46)
	info.Size = UDim2.new(1, -28, 0, 130)
	info.Font = Enum.Font.Gotham
	info.TextSize = 15
	info.TextWrapped = true
	info.TextXAlignment = Enum.TextXAlignment.Left
	info.TextYAlignment = Enum.TextYAlignment.Top
	info.TextColor3 = COLORS.text
	info.Text = table.concat(lines, "\n")
	info.ZIndex = 52
	info.Parent = card
	local modeBtn
	local function paintMode()
		modeBtn.Text = if sailManual then "항해 방식: 직접 항해 (바람 띠 따라가기)" else "항해 방식: 자동 항해"
		modeBtn.BackgroundColor3 = if sailManual then COLORS.gold else COLORS.blue
	end
	modeBtn = mkButton(card, "", COLORS.blue, UDim2.new(1, -28, 0, 34), function()
		sailManual = not sailManual
		paintMode()
	end, true)
	modeBtn.Position = UDim2.fromOffset(14, 182)
	modeBtn.ZIndex = 52
	paintMode()
	local go = mkButton(card, "⚓ 닻 올리기", COLORS.green, UDim2.new(0.5, -20, 0, 40), function()
		layer:Destroy()
		sail(r.id)
	end, true)
	go.Position = UDim2.new(0, 14, 1, -54)
	go.ZIndex = 52
	local cancel = mkButton(card, "취소", COLORS.red, UDim2.new(0.5, -20, 0, 40), function()
		layer:Destroy()
	end, true)
	cancel.Position = UDim2.new(0.5, 6, 1, -54)
	cancel.ZIndex = 52
end

-- 이야기 장면: 코드로 그린 일러스트 + 대화 + 선택지 ----------------------------------------

local function mkRound(parent, pos, size, color, alpha, anchor)
	local f = mkBox(parent, pos, size, color, alpha)
	if anchor then
		f.AnchorPoint = anchor
	end
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(1, 0)
	c.Parent = f
	return f
end

local ART = {
	palace = { sky = Color3.fromRGB(235, 214, 170), floor = Color3.fromRGB(120, 60, 60) },
	tavern = { sky = Color3.fromRGB(90, 56, 38), floor = Color3.fromRGB(60, 38, 26) },
	harbor = { sky = Color3.fromRGB(240, 170, 110), floor = Color3.fromRGB(46, 96, 140) },
	ruins = { sky = Color3.fromRGB(170, 150, 140), floor = Color3.fromRGB(88, 80, 74) },
	observatory = { sky = Color3.fromRGB(16, 22, 52), floor = Color3.fromRGB(40, 44, 60) },
	storm = { sky = Color3.fromRGB(52, 62, 78), floor = Color3.fromRGB(28, 52, 80) },
	library = { sky = Color3.fromRGB(110, 76, 50), floor = Color3.fromRGB(70, 46, 32) },
	epilogue = { sky = Color3.fromRGB(246, 150, 96), floor = Color3.fromRGB(34, 62, 110) },
}

function H.paintScene(parent, art, t)
	local pal = ART[art] or ART.harbor
	parent.BackgroundColor3 = pal.sky
	mkBox(parent, UDim2.fromScale(0, 0.62), UDim2.fromScale(1, 0.38), pal.floor)
	if art == "palace" then
		for i = 0, 3 do
			mkBox(parent, UDim2.fromScale(0.08 + i * 0.28, 0.1), UDim2.fromScale(0.06, 0.52), Color3.fromRGB(245, 235, 210))
			mkBox(parent, UDim2.fromScale(0.07 + i * 0.28, 0.08), UDim2.fromScale(0.08, 0.03), Color3.fromRGB(224, 190, 110))
		end
		mkBox(parent, UDim2.fromScale(0.3, 0.12), UDim2.fromScale(0.4, 0.4), Color3.fromRGB(170, 200, 230))
		mkBox(parent, UDim2.fromScale(0.42, 0.04), UDim2.fromScale(0.16, 0.16), Color3.fromRGB(150, 30, 40))
		mkBox(parent, UDim2.fromScale(0.28, 0.62), UDim2.fromScale(0.44, 0.38), Color3.fromRGB(150, 30, 40))
	elseif art == "tavern" then
		for i = 0, 6 do
			mkBox(parent, UDim2.fromScale(i / 7, 0), UDim2.fromScale(0.005, 0.62), Color3.fromRGB(60, 38, 26))
		end
		mkRound(parent, UDim2.fromScale(0.82, 0.22), UDim2.fromOffset(60, 60), Color3.fromRGB(255, 210, 110), 0.35, Vector2.new(0.5, 0.5))
		mkBox(parent, UDim2.fromScale(0.8, 0.22), UDim2.fromOffset(6, 18), Color3.fromRGB(255, 240, 200))
		for i = 0, 2 do
			mkBox(parent, UDim2.fromScale(0.05 + i * 0.1, 0.5), UDim2.fromScale(0.08, 0.2), Color3.fromRGB(120, 80, 46))
		end
		mkBox(parent, UDim2.fromScale(0, 0.7), UDim2.fromScale(1, 0.06), Color3.fromRGB(130, 88, 52))
	elseif art == "harbor" then
		mkRound(parent, UDim2.fromScale(0.72, 0.3), UDim2.fromOffset(64, 64), Color3.fromRGB(255, 226, 150), 0, Vector2.new(0.5, 0.5))
		mkBox(parent, UDim2.fromScale(0, 0.6), UDim2.fromScale(1, 0.02), Color3.fromRGB(255, 220, 180), 0.4)
		for i = 0, 2 do
			mkBox(parent, UDim2.fromScale(0.1 + i * 0.12, 0.3 - i * 0.03), UDim2.fromOffset(4, 90), Color3.fromRGB(70, 45, 28))
			mkBox(parent, UDim2.fromScale(0.1 + i * 0.12, 0.34 - i * 0.03), UDim2.fromOffset(34, 38), Color3.fromRGB(245, 238, 220))
		end
		mkBox(parent, UDim2.fromScale(0, 0.78), UDim2.fromScale(0.5, 0.04), Color3.fromRGB(110, 80, 56))
	elseif art == "epilogue" then
		-- 석양, 수평선 위의 하얀 돛배, 날아가는 새
		mkRound(parent, UDim2.fromScale(0.5, 0.5), UDim2.fromOffset(120, 120), Color3.fromRGB(255, 226, 150), 0.1, Vector2.new(0.5, 0.5))
		mkBox(parent, UDim2.fromScale(0, 0.6), UDim2.fromScale(1, 0.02), Color3.fromRGB(255, 214, 160), 0.3)
		mkBox(parent, UDim2.fromScale(0.58, 0.5), UDim2.fromOffset(5, 80), Color3.fromRGB(60, 40, 28))
		mkBox(parent, UDim2.fromScale(0.59, 0.5), UDim2.fromOffset(46, 52), Color3.fromRGB(250, 244, 226))
		mkBox(parent, UDim2.fromScale(0.55, 0.62), UDim2.fromOffset(72, 14), Color3.fromRGB(100, 62, 40))
		for i = 0, 2 do
			mkBox(parent, UDim2.fromScale(0.2 + i * 0.07, 0.22 + (i % 2) * 0.05), UDim2.fromOffset(16, 3), Color3.fromRGB(70, 50, 50))
		end
	elseif art == "ruins" then
		for i = 0, 4 do
			mkBox(parent, UDim2.fromScale(0.08 + i * 0.19, 0.62 - (0.16 + (i % 3) * 0.08)), UDim2.fromScale(0.07, 0.16 + (i % 3) * 0.08), Color3.fromRGB(200, 190, 175))
		end
		local v = mkBox(parent, UDim2.fromScale(0.6, 0.12), UDim2.fromScale(0.36, 0.5), Color3.fromRGB(80, 66, 62))
		v.Rotation = 0
		mkRound(parent, UDim2.fromScale(0.78, 0.1), UDim2.fromOffset(70, 40), Color3.fromRGB(110, 100, 100), 0.3, Vector2.new(0.5, 0.5))
	elseif art == "observatory" then
		for i = 1, 26 do
			mkBox(parent, UDim2.fromScale((i * 0.137) % 1, (i * 0.091) % 0.55), UDim2.fromOffset(2, 2), Color3.new(1, 1, 1), 0.2)
		end
		mkRound(parent, UDim2.fromScale(0.18, 0.18), UDim2.fromOffset(44, 44), Color3.fromRGB(240, 236, 210), 0, Vector2.new(0.5, 0.5))
		local dome = mkRound(parent, UDim2.fromScale(0.7, 0.62), UDim2.fromOffset(190, 150), Color3.fromRGB(86, 90, 112), 0, Vector2.new(0.5, 1))
		mkBox(dome, UDim2.fromScale(0.45, 0), UDim2.fromScale(0.1, 0.6), Color3.fromRGB(20, 24, 40))
	elseif art == "storm" then
		for i = 0, 3 do
			mkRound(parent, UDim2.fromScale(0.1 + i * 0.25, 0.1 + (i % 2) * 0.07), UDim2.fromOffset(150, 46), Color3.fromRGB(34, 40, 52), 0.1, Vector2.new(0.5, 0.5))
		end
		mkBox(parent, UDim2.fromScale(0.62, 0.15), UDim2.fromOffset(5, 80), Color3.fromRGB(255, 245, 180))
		for i = 1, 12 do
			mkBox(parent, UDim2.fromScale((i * 0.19) % 1, 0.64 + (i % 5) * 0.06), UDim2.fromOffset(46, 3), Color3.new(1, 1, 1), 0.5)
		end
	elseif art == "library" then
		for i = 0, 3 do
			mkBox(parent, UDim2.fromScale(0.04 + i * 0.25, 0.08), UDim2.fromScale(0.2, 0.54), Color3.fromRGB(88, 56, 36))
			for r = 0, 3 do
				mkBox(parent, UDim2.fromScale(0.05 + i * 0.25, 0.12 + r * 0.13), UDim2.fromScale(0.18, 0.09), Color3.fromRGB(150 - i * 14, 100 + r * 20, 70))
			end
		end
	end
end

-- 초상화용 인물: 색·재질이 있는 R15 모델을 우선 쓰고, 만들 수 없으면 승인된 People 모델을 쓴다
local function portraitPerson(world, key, role, tpl)
	local seed = 0
	for i = 1, #key do
		seed = (seed * 31 + string.byte(key, i)) % 100000
	end
	local m = Pose.createR15(world, Vector3.zero, 0, nil, Random.new(seed), role, 6)
	if m then
		for _, d in m:GetDescendants() do
			if d:IsA("BasePart") then
				d.Anchored = true
			end
		end
		pcall(Pose.animateR15, m, { phase = 0, moving = false, t = 0.6 })
		return m
	end
	if tpl then
		local c = tpl:Clone()
		for _, d in c:GetDescendants() do
			if d:IsA("BasePart") then
				d.Anchored = true
			end
		end
		c.Parent = world
		pcall(Pose.relaxArms, c)
		return c
	end
	return nil
end

-- 이야기 속 인물 → 승인된 People 모델. 직함 낱말로 고르고, 없으면 이름으로 항상 같은 사람을 고른다.
local STORY_PEOPLE = {
	{ { "해적", "사략", "뱃사람", "선원", "선장", "항해사" }, { "Pirate_Male", "Pirate_Female" } },
	{ { "학자", "박사", "의사", "약", "연금" }, { "Doctor_Male_Old", "Doctor_Female_Old", "Doctor_Male_Young" } },
	{ { "여왕", "왕", "귀족", "총독", "제독", "백작", "공작", "대사" }, { "OldClassy_Male", "OldClassy_Female" } },
	{ { "병사", "수비", "군인", "근위" }, { "Soldier_Male", "Soldier_Female", "BlueSoldier_Male" } },
	{ { "주조", "대장", "목수", "상인", "장인", "어부", "정비" }, { "Worker_Male", "Worker_Female" } },
	{ { "요리", "주방", "포도주", "양조" }, { "Chef_Male", "Chef_Female" } },
}
local STORY_DEFAULT = { "Casual_Male", "Casual2_Female", "Casual3_Male", "Casual_Female", "Casual2_Male", "Casual3_Female" }
local function storyPortraitModel(npcName, id)
	local seed = 0
	for i = 1, #npcName + #id do
		seed = (seed * 31 + string.byte((npcName .. id), i)) % 9973
	end
	for _, row in STORY_PEOPLE do
		for _, kw in row[1] do
			if string.find(npcName, kw, 1, true) then
				return row[2][seed % #row[2] + 1]
			end
		end
	end
	return STORY_DEFAULT[seed % #STORY_DEFAULT + 1]
end

-- 주인공 초상 대신 국가 국기를 보여 준다 (선택 화면·오프닝·에필로그)
local function heroPortrait(parent, nationId, w, h)
	return require(Shared:WaitForChild("Flags")).build(parent, nationId, w, math.floor(w * 0.68))
end

local function playEpilogue(msg, opts)
	opts = opts or {}
	local TweenService = game:GetService("TweenService")
	local layer = overlayGui("Epilogue", 30)
	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = Color3.new(0, 0, 0)
	root.BorderSizePixel = 0
	root.Parent = layer
	-- 프롤로그·에필로그의 배경은 임의 도형 범선 대신 기존 승인된 항해선 모델을 사용한다.
	-- 광원 색과 카메라 움직임만 UI/ViewportFrame에서 처리하며 새 Part는 만들지 않는다.
	local scene = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.fromRGB(30, 48, 69))
	scene.ClipsDescendants = true
	local sky = Instance.new("UIGradient")
	sky.Rotation = 90
	sky.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(24, 38, 64)),
		ColorSequenceKeypoint.new(0.52, Color3.fromRGB(173, 104, 83)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(31, 59, 87)),
	})
	sky.Parent = scene

	local voyageView = Instance.new("ViewportFrame")
	voyageView.Name = "IntroApprovedShip"
	voyageView.Size = UDim2.fromScale(1, 1)
	voyageView.BackgroundTransparency = 1
	voyageView.Ambient = Color3.fromRGB(175, 160, 155)
	voyageView.LightColor = Color3.fromRGB(255, 218, 163)
	voyageView.LightDirection = Vector3.new(-0.55, -0.72, -0.43).Unit
	voyageView.Parent = scene
	local shipWorld = Instance.new("WorldModel")
	shipWorld.Parent = voyageView
	local shipCamera = Instance.new("Camera")
	shipCamera.FieldOfView = 40
	shipCamera.Parent = voyageView
	voyageView.CurrentCamera = shipCamera

	local library = ReplicatedStorage:FindFirstChild("MareAssets")
	local naval = library and library:FindFirstChild("Naval")
	if naval and not naval:FindFirstChild("ship-large") then
		naval:WaitForChild("ship-large", 6)
	end
	-- placeModel은 기존 등록 Mesh를 복제하며, 없으면 nil을 반환한다.
	local vessel = PortScene.placeModel(shipWorld, "Naval", "ship-large", Vector3.zero, 44)
		or PortScene.placeModel(shipWorld, "Naval", "ship-medium", Vector3.zero, 38)
		or PortScene.placeModel(shipWorld, "Naval", "boat-sail-a", Vector3.zero, 34)
	if vessel then
		local cf, size = vessel:GetBoundingBox()
		local focus = cf.Position + Vector3.new(0, size.Y * 0.06, 0)
		local camera = workspace.CurrentCamera
		local aspect = if camera then camera.ViewportSize.X / math.max(camera.ViewportSize.Y, 1) else 1
		local distance = math.max(size.X, size.Y, size.Z) * (if aspect < 0.9 then 3 else 1.9)
		shipCamera.CFrame = CFrame.lookAt(focus + Vector3.new(distance * 0.6, size.Y * 0.65, distance), focus)
		TweenService:Create(shipCamera, TweenInfo.new(22, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
			CFrame = CFrame.lookAt(focus + Vector3.new(distance * 0.37, size.Y * 0.37, distance * 0.78), focus),
			FieldOfView = 37,
		}):Play()
	end
	if opts.hero then
		local hp = heroPortrait(root, opts.hero, 150, 190)
		hp.AnchorPoint = Vector2.new(0, 0.5)
		hp.Position = UDim2.new(0, 28, 0.5, 0)
		hp.ZIndex = 9
	end
	-- 위아래 검은 띠 (영화 같은 화면 비율)
	local top = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 0.12), Color3.new(0, 0, 0))
	local bot = mkBox(root, UDim2.fromScale(0, 0.88), UDim2.fromScale(1, 0.12), Color3.new(0, 0, 0))
	top.ZIndex, bot.ZIndex = 5, 5
	local shade = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.new(0, 0, 0))
	shade.ZIndex = 4
	local function say(text, y, size, color, hold)
		local l = mkLabel(root, text, size, color, true)
		l.AutomaticSize = Enum.AutomaticSize.None
		l.Size = UDim2.new(if opts.hero then 0.62 else 0.8, 0, 0, size * 3)
		l.AnchorPoint = Vector2.new(0.5, 0)
		l.Position = UDim2.fromScale(if opts.hero then 0.6 else 0.5, y)
		l.TextXAlignment = Enum.TextXAlignment.Center
		l.TextTransparency = 1
		l.ZIndex = 8
		local st = Instance.new("UIStroke")
		st.Thickness = 1.5
		st.Color = Color3.new(0, 0, 0)
		st.Transparency = 1
		st.Parent = l
		TweenService:Create(l, TweenInfo.new(1.2), { TextTransparency = 0 }):Play()
		TweenService:Create(st, TweenInfo.new(1.2), { Transparency = 0.3 }):Play()
		task.wait(hold or 3)
		return l
	end
	-- 검은 화면에서 서서히 실제 범선 연출이 드러난다.
	TweenService:Create(shade, TweenInfo.new(2.5), { BackgroundTransparency = 0.45 }):Play()
	task.wait(1.5)
	if opts.lines then
		say(opts.title or "프롤로그", 0.16, 28, Color3.fromRGB(240, 200, 120), 2.5)
		for i, line in opts.lines do
			local l = say(line, 0.3, 19, COLORS.text, 3.8)
			if i < #opts.lines then
				TweenService:Create(l, TweenInfo.new(0.8), { TextTransparency = 1 }):Play()
				task.wait(0.8)
				l:Destroy()
			end
		end
	else
		local p = view and view.player
		say("에필로그", 0.2, 30, Color3.fromRGB(240, 200, 120), 2.5)
		say(tostring(msg or ""), 0.32, 18, COLORS.text, 4.5)
		if p then
			say(string.format("항해 %d일 · 명성 %d · 보유 코인 %d", p.day or 0, math.floor(p.fame or 0), math.floor(p.coins or 0)), 0.5, 16, Color3.fromRGB(190, 200, 215), 3.5)
		end
		say("그러나 바다는 끝나지 않는다.\n당신의 항해는 계속된다.", 0.62, 18, Color3.fromRGB(240, 200, 120), 2.5)
	end
	local finished = false
	local b = mkButton(root, opts.button or "계속 항해하기", COLORS.gold, UDim2.fromOffset(200, 48), function() finished = true end, true)
	b.AnchorPoint = Vector2.new(0.5, 0)
	b.Position = UDim2.fromScale(0.5, 0.78)
	b.ZIndex = 9
	b.TextSize = 17
	local t0 = os.clock()
	while not finished and os.clock() - t0 < 120 do
		task.wait(0.2)
	end
	TweenService:Create(shade, TweenInfo.new(1), { BackgroundTransparency = 0 }):Play()
	task.wait(1)
	layer:Destroy()
end

function playStory(ev)
	local overlay = Instance.new("Frame")
	overlay.Name = "StoryScene"
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.BackgroundColor3 = Color3.new(0, 0, 0)
	overlay.BorderSizePixel = 0
	overlay.ZIndex = 60
	local layer = overlayGui("Overlay", 20)
	overlay.Parent = layer
	-- 스토리 성격에 맞춰 기존 오디오 제어기에서 BGM·시작 효과음을 선택한다.
	local prevStoryMusic = Sfx.currentName()
	Sfx.music(Sfx.storyMusic(ev))
	Sfx.play(Sfx.storyCue(ev), 0.38)
	overlay.Destroying:Connect(function()
		if prevStoryMusic then
			Sfx.music(prevStoryMusic)
		end
		task.defer(function() layer:Destroy() end)
	end)
	local picture = mkBox(overlay, UDim2.fromScale(0, 0), UDim2.fromScale(1, 0.56), Color3.new(0, 0, 0))
	picture.ClipsDescendants = true
	H.paintScene(picture, ev.art)
	-- 일러스트 연출: 장면 종류에 맞는 그림을 깔고 천천히 다가가는 카메라 효과를 준다 (그림이 없으면 위의 단순 배경)
	do
		local ILLUST = { tavern = "event_festival", harbor = "event_trade_boom", storm = "event_storm", palace = "event_royal_charter", ruins = "event_stonehenge", observatory = "event_principia", library = "event_principia" }
		local img = AssetIds["CardArt/" .. (ILLUST[ev.art or ""] or "none")]
		if img then
			local bg = Instance.new("ImageLabel")
			bg.Name = "Illustration"
			bg.AnchorPoint = Vector2.new(0.5, 0.5)
			bg.Position = UDim2.fromScale(0.5, 0.5)
			bg.Size = UDim2.fromScale(1.02, 1.02)
			bg.BackgroundTransparency = 1
			bg.ScaleType = Enum.ScaleType.Crop
			bg.Image = "rbxassetid://" .. tostring(img)
			bg.Parent = picture
			local shade = Instance.new("UIGradient")
			shade.Rotation = 90
			shade.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(1, 0.25) })
			shade.Parent = bg
			game:GetService("TweenService"):Create(bg, TweenInfo.new(20, Enum.EasingStyle.Sine), { Size = UDim2.fromScale(1.14, 1.14) }):Play()
		end
	end

	-- 등장 인물: 승인된 3D 인물 모델을 반신 초상으로 보여 준다 (모델이 없으면 실루엣)
	local portraitModel = storyPortraitModel(ev.npc or "", ev.id or "")
	local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
	local tpl = portraitModel and lib and lib:FindFirstChild("People") and lib.People:FindFirstChild(portraitModel)
	-- 이야기 대화는 인물의 직업·나이를 우선한다. 이름만으로 맞지 않는 외형을 강제하지 않는다.
	local npcName = ev.npc or ""
	local tile = nil
	if string.find(npcName, "늙", 1, true) or string.find(npcName, "노인", 1, true) then
		tile = "tavern"
	elseif string.find(npcName, "주조", 1, true) or string.find(npcName, "조선", 1, true)
		or string.find(npcName, "목수", 1, true) or string.find(npcName, "장인", 1, true) then
		tile = "yard"
	elseif string.find(npcName, "항만청", 1, true) or string.find(npcName, "제독", 1, true)
		or string.find(npcName, "총독", 1, true) or string.find(npcName, "장교", 1, true) then
		tile = "harbor"
	elseif string.find(npcName, "학자", 1, true) or string.find(npcName, "학회", 1, true)
		or string.find(npcName, "서기", 1, true) or string.find(npcName, "천문", 1, true)
		or string.find(npcName, "지도", 1, true) or string.find(npcName, "연구", 1, true) then
		tile = "scholar"
	elseif string.find(npcName, "상인", 1, true) or string.find(npcName, "중개", 1, true)
		or string.find(npcName, "무역", 1, true) then
		tile = "merchant"
	elseif string.find(npcName, "항해사", 1, true) or string.find(npcName, "선장", 1, true)
		or string.find(npcName, "도선사", 1, true) then
		tile = "hero"
	elseif string.find(npcName, "주점", 1, true) or string.find(npcName, "선술집", 1, true) then
		tile = "tavern"
	end
	-- 서로 다른 문화권의 인물에게 유럽형 얼굴을 무리하게 재사용하지 않는다.
	if string.find(npcName, "인도", 1, true) or string.find(npcName, "일본", 1, true)
		or string.find(npcName, "오사카", 1, true) or string.find(npcName, "킬와", 1, true)
		or string.find(npcName, "스와힐리", 1, true) or string.find(npcName, "오스만", 1, true) then
		tile = nil
	end
	-- 동료 사연이면 그 동료의 그린 초상을 쓴다
	local cid = ev.id and string.match(ev.id, "^(h_[%w_]+)_%d+$")
	local cport = cid and COMPANION_PORTRAIT[cid]
	if cport then
		local ph = Instance.new("ImageLabel")
		ph.Name = "NpcPortrait"
		ph.AnchorPoint = Vector2.new(0.5, 1)
		ph.Position = UDim2.fromScale(0.5, 1)
		ph.Size = UDim2.new(0, 250, 1, -14)
		ph.BackgroundTransparency = 1
		ph.ScaleType = Enum.ScaleType.Crop
		ph.Image = "rbxassetid://" .. tostring(AssetIds["Portraits/" .. cport.atlas])
		ph.ImageRectOffset = cport.offset
		ph.ImageRectSize = Vector2.new(256, 336)
		corner(ph, 10)
		local pst = Instance.new("UIStroke")
		pst.Color = Color3.fromRGB(214, 170, 82)
		pst.Thickness = 3
		pst.Parent = ph
		ph.Parent = picture
		tile = nil
		tpl = nil
	end
	local storyImageId = if PORTRAIT_ATLAS and tile then PORTRAIT_ATLAS
		elseif tile == "merchant" then AssetIds["Portraits/merchant"] else nil
	if storyImageId then
		local photo = Instance.new("ImageLabel")
		photo.Name = "NpcPortrait"
		photo.AnchorPoint = Vector2.new(0.5, 1)
		photo.Position = UDim2.fromScale(0.5, 1)
		photo.Size = UDim2.new(0, 330, 1, 6)
		photo.BackgroundTransparency = 1
		photo.BorderSizePixel = 0
		photo.ScaleType = Enum.ScaleType.Crop
		photo.Image = "rbxassetid://" .. tostring(storyImageId)
		photo.ImageRectOffset = if PORTRAIT_ATLAS and tile and storyImageId == PORTRAIT_ATLAS then PORTRAIT_TILE[tile] else Vector2.zero
		photo.ImageRectSize = if PORTRAIT_ATLAS and tile and storyImageId == PORTRAIT_ATLAS then PORTRAIT_SIZE else Vector2.zero
		photo.Parent = picture
	elseif cport then
		-- 그린 초상을 이미 올렸다
	elseif tpl then
		local vf = Instance.new("ViewportFrame")
		vf.BackgroundTransparency = 1
		vf.AnchorPoint = Vector2.new(0.5, 1)
		vf.Position = UDim2.fromScale(0.5, 1)
		vf.Size = UDim2.new(0, 330, 1, 6)
		vf.Ambient = Color3.fromRGB(170, 170, 178)
		vf.LightColor = Color3.fromRGB(255, 236, 205)
		vf.LightDirection = Vector3.new(-0.6, -0.8, -1).Unit
		vf.Parent = picture
		local cam = Instance.new("Camera")
		cam.FieldOfView = 32
		cam.Parent = vf
		vf.CurrentCamera = cam
		local world = Instance.new("WorldModel")
		world.Parent = vf
		local m = tpl:Clone()
		for _, d in m:GetDescendants() do
			if d:IsA("BasePart") then
				d.Anchored = true
			end
		end
		m.Parent = world
		pcall(Pose.relaxArms, m)
		local cf, size = m:GetBoundingBox()
		local head = m:FindFirstChild("Head", true)
		if head and head:IsA("BasePart") then
			-- 머리와 어깨가 보이게: 머리 높이를 기준으로 가까이 잡는다
			local hp = head.Position
			local focus = hp - Vector3.new(0, head.Size.Y * 0.9, 0)
			cam.FieldOfView = 30
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.25, 0.1, -1).Unit * (head.Size.Y * 7.5), focus)
		else
			local focus = cf.Position + Vector3.new(0, size.Y * 0.2, 0)
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.3, 0.12, -1).Unit * (size.Y * 1.05), focus)
		end
	else
		local npc = mkBox(picture, UDim2.fromScale(0.5, 0.95), UDim2.fromOffset(90, 150), Color3.new(0, 0, 0), 1)
		npc.AnchorPoint = Vector2.new(0.5, 1)
		local body = mkBox(npc, UDim2.fromOffset(10, 56), UDim2.fromOffset(70, 94), Color3.fromRGB(58, 44, 70))
		local bc = Instance.new("UICorner")
		bc.CornerRadius = UDim.new(0.3, 0)
		bc.Parent = body
		mkRound(npc, UDim2.fromOffset(45, 34), UDim2.fromOffset(40, 40), Color3.fromRGB(232, 196, 160), 0, Vector2.new(0.5, 0.5))
	end

	local chapter = Instance.new("TextLabel")
	chapter.BackgroundTransparency = 1
	chapter.Position = UDim2.fromOffset(0, 14)
	chapter.Size = UDim2.new(1, 0, 0, 22)
	chapter.Font = Enum.Font.GothamBold
	chapter.TextSize = 15
	chapter.TextXAlignment = Enum.TextXAlignment.Center
	chapter.TextColor3 = Color3.new(1, 1, 1)
	chapter.TextStrokeTransparency = 0.4
	chapter.Text = (if ev.chapter then ev.chapter .. " · " else "") .. ev.title
	chapter.ZIndex = 61
	chapter.Parent = overlay

	-- 대화창
	local box = mkBox(overlay, UDim2.fromScale(0, 0.56), UDim2.fromScale(1, 0.44), Color3.fromRGB(24, 28, 38))
	local nameTag = Instance.new("TextLabel")
	nameTag.BackgroundTransparency = 1
	nameTag.Position = UDim2.fromOffset(14, 6)
	nameTag.Size = UDim2.new(1, -28, 0, 20)
	nameTag.Font = Enum.Font.GothamBold
	nameTag.TextSize = 14
	nameTag.TextXAlignment = Enum.TextXAlignment.Left
	nameTag.TextColor3 = COLORS.gold
	nameTag.Text = ev.npc
	nameTag.Parent = box
	local text = Instance.new("TextLabel")
	text.BackgroundTransparency = 1
	text.Position = UDim2.fromOffset(14, 30)
	text.Size = UDim2.new(1, -28, 1, -40)
	text.Font = Enum.Font.Gotham
	text.TextSize = 15
	text.TextWrapped = true
	text.TextXAlignment = Enum.TextXAlignment.Left
	text.TextYAlignment = Enum.TextYAlignment.Top
	text.TextColor3 = COLORS.text
	text.Parent = box
	local next = Instance.new("TextButton")
	next.BackgroundTransparency = 1
	next.Size = UDim2.fromScale(1, 1)
	next.Text = ""
	next.ZIndex = 2
	next.Parent = box
	local hint = Instance.new("TextLabel")
	hint.BackgroundTransparency = 1
	hint.Position = UDim2.new(0, 0, 1, -20)
	hint.Size = UDim2.new(1, -12, 0, 16)
	hint.Font = Enum.Font.Gotham
	hint.TextSize = 11
	hint.TextXAlignment = Enum.TextXAlignment.Right
	hint.TextColor3 = COLORS.muted
	hint.Text = "화면을 누르면 다음"
	hint.Parent = box

	local function typeLine(line)
		text.Text = line
		text.MaxVisibleGraphemes = 0
		local n = utf8.len(line) or #line
		for i = 1, n do
			if not overlay.Parent then
				return
			end
			text.MaxVisibleGraphemes = i
			task.wait(0.015)
		end
		text.MaxVisibleGraphemes = -1
	end

	local done = false
	local function close()
		done = true
		overlay:Destroy()
	end
	local idx = 1
	local advancing = false
	local function showChoices()
		next:Destroy()
		hint.Text = ""
		text.Size = UDim2.new(1, -28, 0, 40)
		text.Text = ev.lines[#ev.lines]
		text.TextSize = 13
		local list = Instance.new("Frame")
		list.BackgroundTransparency = 1
		list.Position = UDim2.fromOffset(14, 70)
		list.Size = UDim2.new(1, -28, 1, -76)
		list.Parent = box
		local lay = Instance.new("UIListLayout")
		lay.Padding = UDim.new(0, 5)
		lay.Parent = list
		for _, ch in ev.choices do
			local label = ch.text
			local b = mkButton(list, label, COLORS.blue, UDim2.new(1, 0, 0, 36), function()
				local result = if ev.submit then ev.submit(ch.index) else call("PlayStory", { eventId = ev.id, choice = ch.index })
				if not result then
					hint.Text = "잠시 후 다시 눌러 주세요"
				elseif not result.ok then
					-- 실패 이유를 대화창 안에 바로 보여 준다
					hint.Text = tostring(result.message or "처리하지 못했어요")
					hint.TextColor3 = COLORS.red
					hint.TextSize = 14
				end
				if result and result.ok then
					for _, c in list:GetChildren() do
						if c:IsA("TextButton") then
							c:Destroy()
						end
					end
					nameTag.Text = ""
					text.TextSize = 14
					text.Size = UDim2.new(1, -28, 1, -80)
					text.Text = result.message
					text.MaxVisibleGraphemes = -1
					if ev.art == "epilogue" then
						epilogueMessage = result.message
					end
					local ok = mkButton(list, "닫기", COLORS.gold, UDim2.new(1, 0, 0, 36), close, true)
					ok.LayoutOrder = 9
					list.Position = UDim2.new(0, 14, 1, -46)
					list.Size = UDim2.new(1, -28, 0, 40)
				end
			end, true)
			b.TextSize = 13
		end
	end
	next.Activated:Connect(function()
		if advancing then
			return
		end
		advancing = true
		idx += 1
		if idx > #ev.lines then
			showChoices()
		else
			typeLine(ev.lines[idx])
		end
		advancing = false
	end)
	task.spawn(function()
		typeLine(ev.lines[1])
	end)
	while not done and overlay.Parent do
		task.wait(0.2)
	end
	if epilogueMessage then
		local m = epilogueMessage
		epilogueMessage = nil
		task.wait(0.3)
		playEpilogue(m)
	end
end

-- 탭 화면 -------------------------------------------------------------------

local order = 0
function H.nextOrder()
	order += 1
	return order
end

local function add(builder)
	local obj = builder()
	obj.LayoutOrder = H.nextOrder()
	if obj.Parent == nil then
		obj.Parent = content -- 직접 만든 프레임(지도, 카드 격자)도 목록에 넣는다
	end
	return obj
end

local intelName
local addRumorPanel
local RENDERERS: { [string]: any } = {}

function RENDERERS.harbor()
	local h = view.harbor
	add(function() return mkHeader(content, view.player.portName .. " · " .. h.name .. " (" .. h.level .. "단계)") end)
	add(function()
		return mkLabel(content, string.format("특산: %s\n수요: %s", table.concat(h.produces, ", "), table.concat(h.demands, ", ")), 16, COLORS.text, true)
	end)
	if h.economy then
		add(function()
			local e = h.economy
			local lines = {
				string.format("경제 국면: %s · %s", e.regimeName, h.portType or ""),
				string.format("경기지수 %d (100=평시) · 물가지수 %d · 최근 거래 %d개", e.index, e.priceIndex, e.trade),
				string.format("실업률 %d%% · 임금지수 %d · 금리 %.1f%%", e.unemployment, e.wage, e.interest),
				string.format("%s 가치 %d (100=기준) · 인구 %s%d", e.currency.name, e.currency.index, if e.migration >= 0 then "유입 +" else "유출 ", e.migration),
				string.format("학자 기술 합계 %d → 단계 %d개 이상 열린 품목에 반영", e.techSum, math.floor(e.techSum / 6)),
			}
			if e.festival then table.insert(lines, "축제: " .. e.festival) end
			for _, b in e.boosts or {} do
				table.insert(lines, string.format("부흥: %s (%d일 남음)", b.name, b.left))
			end
			for _, ev in e.events or {} do
				table.insert(lines, string.format("%s: %s (%d일 남음)", if ev.kind == "disaster" then "재해" else "행운", ev.title, ev.left))
			end
			for i, n in e.news or {} do
				if i <= 4 then table.insert(lines, "📰 " .. n) end
			end
			if h.nextProduce then table.insert(lines, string.format("다음 특산 %s: %d단계 또는 관련 학문 기술", h.nextProduce.name, h.nextProduce.level)) end
			return mkLabel(content, table.concat(lines, "\n"), 15, COLORS.text, true)
		end)
	end
	add(function()
		local nextText = if h.nextAt then string.format("다음 단계까지 %d 더 투자", h.nextAt - h.invested) else "최고 단계예요"
		return mkLabel(content, string.format("누적 투자 %d · %s\n혜택: 이 항구에서 팔 때 +%d%%, 수리·고용·보급 비용 -%d%%", h.invested, nextText, math.floor(h.sellBonus * 100 + 0.5), math.floor(h.discount * 100 + 0.5)), 13, COLORS.text, false)
	end)
	local function section(title)
		add(function() return mkHeader(content, title) end)
	end
	local fac = {}
	for _, k in view.facilities do
		fac[k] = true
	end

	if #view.story > 0 then
		section("이야기")
		for _, ev in view.story do
			add(function()
				return mkRow(content, ev.title, (if ev.chapter then ev.chapter .. " · " else "") .. ev.npc, {
					{ text = "듣기", color = COLORS.gold, onClick = function() playStory(ev) end },
				}, 52)
			end)
		end
	end

	if fac.bank then
		local b = view.bank
		section("은행")
		add(function()
			return mkLabel(content, string.format("%s (항구 %d단계) — 발전할수록 이자·한도가 좋아져요\n예금 %d (30일 이자 %.2f%%)\n대출 %d / 한도 %d (30일 이자 %.2f%%)", b.name or "은행", b.level or 1, b.deposit, b.depositRate * 100, b.loan, b.limit, b.loanRate * 100), 13, COLORS.text, false)
		end)
		for _, amt in { 100, 1000, 10000 } do
			add(function()
				return mkRow(content, string.format("%d 코인", amt), "예금 / 인출 / 대출 / 상환", {
					{ text = "예금", color = COLORS.green, onClick = function() call("Deposit", { amount = amt }) end },
					{ text = "인출", color = COLORS.grey, onClick = function() call("Withdraw", { amount = amt }) end },
					{ text = "대출", color = COLORS.gold, onClick = function() call("Borrow", { amount = amt }) end },
					{ text = "상환", color = COLORS.blue, onClick = function() call("Repay", { amount = amt }) end },
				}, 56)
			end)
		end
	end

	if view.exchange then
		local ex = view.exchange
		section(ex.name)
		add(function()
			return mkLabel(content, string.format("주식은 날짜에 따라 실제 역사처럼 오르내려요. 수수료 %.1f%% (상업·경제학 지식을 이해할수록 줄어요) · 다음 배당까지 %d일 · 지금까지 배당 %d코인", ex.fee, ex.nextDividend, ex.divTotal), 12, COLORS.muted, false)
		end)
		for _, r in ex.rows do
			if r.listed then
				add(function()
					local arrow = if r.change > 0 then "▲" elseif r.change < 0 then "▼" else "－"
					local sub = string.format("%s %d%% (30일)  ·  배당 연 %d%%  ·  보유 %d주%s\n%s", arrow, math.abs(r.change), r.dividend, r.held, if r.held > 0 then string.format(" (평균 %d)", r.avg) else "", r.summary)
					return mkRow(content, string.format("%s  %d코인", r.name, r.price), sub, {
						{ text = "10주 사기", color = COLORS.green, onClick = function() call("StockBuy", { id = r.id, amount = 10 }) end },
						{ text = "전부 팔기", color = COLORS.red, onClick = function() call("StockSell", { id = r.id, amount = 1000000 }) end, enabled = r.held > 0 },
					}, 76)
				end)
			end
		end
	end

	if view.portBuildings then
		section("항구 건물 계통 (상인 조합소에서 은행까지, 항구도 단계마다 발전해요)")
		for _, ch in view.portBuildings do
			add(function()
				local sub = string.format("%d / %d단계%s", ch.stage, ch.total, if ch.built ~= "" then " · " .. ch.built else "")
				if ch.next then
					sub ..= string.format("\n다음: %s (%d코인) — %s\n%s", ch.next.name, ch.next.cost, if ch.next.can then "지을 수 있어요" else tostring(ch.next.why), ch.next.lore)
				end
				return mkRow(content, ch.name, sub, {
					{ text = "건축", color = COLORS.gold, onClick = function() call("BuildStage", { chain = ch.id }) end, enabled = ch.next ~= nil and ch.next.can },
				}, 112)
			end)
		end
	end

	if fac.guild then
		section("상인 길드")
		local g = view.guild
		if g.contract then
			local c = g.contract
			add(function()
				return mkRow(content, string.format("진행 중: %s %d개 → %s", c.goodName, c.amount, c.toPortName), string.format("보상 %d · 남은 %d일 · 보유 %d", c.reward, c.daysLeft, c.have), {
					{ text = "납품", color = COLORS.green, onClick = function() call("TurnInContract", {}) end },
					{ text = "포기", color = COLORS.red, onClick = function() call("AbandonContract", {}) end },
				}, 60)
			end)
		end
		for _, o in g.offers do
			add(function()
				return mkRow(content, string.format("%s %d개 → %s", o.goodName, o.amount, o.toPortName), string.format("보상 %d코인 · 명성 +%d", o.reward, o.fame), {
					{ text = "계약", color = COLORS.blue, onClick = function() call("AcceptContract", { index = o.index }) end },
				}, 56)
			end)
		end
	end

	if fac.harbormaster then
		local hm = view.harbormaster
		section("항만청")
		add(function()
			local lic = if hm.nextLicense then string.format("다음 면허 '%s': 명성 %d · 수수료 %d", hm.nextLicense.name, hm.nextLicense.fame, hm.nextLicense.fee) else "최고 면허를 받았어요"
			return mkLabel(content, string.format("현재 면허: %s\n%s\n등급 N+1 배를 사려면 면허 N단계가 필요해요.", hm.license or "없음", lic), 13, COLORS.text, false)
		end)
		if hm.nextLicense then
			add(function()
				return mkRow(content, hm.nextLicense.name, string.format("명성 %d · 수수료 %d코인", hm.nextLicense.fame, hm.nextLicense.fee), {
					{ text = "발급", color = COLORS.gold, onClick = function() call("BuyLicense", {}) end },
				}, 52)
			end)
		end
		add(function()
			return mkRow(content, "해상 보험", if hm.insured then "가입 중 (패배 손실을 한 번 막아 줘요)" else string.format("보험료 %d코인 · 패배 시 코인·화물 손실 방지 1회", hm.insurancePrice), {
				{ text = if hm.insured then "가입중" else "가입", color = COLORS.blue, onClick = function() call("BuyInsurance", {}) end, enabled = not hm.insured },
			}, 56)
		end)
	end

	if fac.palace then
		local pl = view.palace
		section(pl.name)
		add(function()
			local t = if pl.nextTitle then string.format("다음 작위 '%s': 명성 %d 필요 (보상 %d코인)", pl.nextTitle, pl.nextFame, pl.nextCoins) else "최고 작위를 받았어요"
			return mkLabel(content, string.format("현재 작위: %s\n%s", pl.title or "없음", t), 13, COLORS.text, false)
		end)
		if pl.nextTitle then
			add(function()
				return mkRow(content, "알현하기", "명성이 충분하면 작위를 받아요", {
					{ text = "알현", color = COLORS.gold, onClick = function() call("Audience", {}) end },
				}, 52)
			end)
		end
	end

	add(function() return mkHeader(content, "길드 의뢰 보드 (7일마다 바뀌어요)") end)
	for _, b in view.board or {} do
		add(function()
			local sub = string.format("보상 %d코인 · 명성 %d%s", b.coins, b.fame, if b.progress then string.format(" · 진행 %d/%d", b.progress, b.count) else "")
			local btn
			if b.state == "done" then
				btn = { text = "완료", color = COLORS.grey, enabled = false, onClick = function() end }
			elseif b.state == "taken" then
				btn = { text = "제출", color = COLORS.green, onClick = function() call("TurnInBounty", { bountyId = b.id }) end }
			else
				btn = { text = "수락", color = COLORS.blue, onClick = function() call("AcceptBounty", { bountyId = b.id }) end }
			end
			local brow = mkRow(content, b.title, sub, { btn }, 60)
			withIcon(brow, "Cargo", if b.kind == "hunt" then "box-open" else "crate" , nil, 44)
			return brow
		end)
	end
	add(function() return mkHeader(content, "항구 보급 (조선소가 없어도 돼요)") end)
	add(function()
		local m = view.morale or 80
		local mText = if m >= 70 then "높음" elseif m >= 40 then "보통" elseif m >= 25 then "낮음 ⚠" else "바닥 ⚠ 탈영 위험"
		return mkLabel(content, string.format("선원 %d/%d · 보급품 %d/%d · 사기 %d (%s)\n선원 %d코인/명 · 보급품 %d코인/개", view.ship.crew, view.ship.maxCrew, view.ship.supplies, view.supplyMax or 100, m, mText, view.shipyard.hireCost, view.shipyard.supplyCost), 16, COLORS.text, true)
	end)
	add(function()
		return mkRow(content, "선원 충원", "부족한 만큼 고용해요", {
			{ text = "+5", color = COLORS.blue, onClick = function() call("HireCrew", { amount = 5 }) end },
			{ text = "+10", color = COLORS.blue, onClick = function() call("HireCrew", { amount = 10 }) end },
			{ text = "가득", color = COLORS.green, onClick = function() call("Resupply", { what = "crew" }) end },
		}, 64)
	end)
	add(function()
		return mkRow(content, "보급품 채우기", "항해일수 × 선원 수만큼 쓰여요", {
			{ text = "+20", color = COLORS.blue, onClick = function() call("BuySupplies", { amount = 20 }) end },
			{ text = "+50", color = COLORS.blue, onClick = function() call("BuySupplies", { amount = 50 }) end },
			{ text = "가득", color = COLORS.green, onClick = function() call("Resupply", { what = "supplies" }) end },
		}, 64)
	end)
	add(function()
		return mkRow(content, "한 번에 모두 채우기", "선원과 보급품을 가득", {
			{ text = "모두", color = COLORS.gold, onClick = function() call("Resupply", { what = "both" }) end },
		}, 52)
	end)
	add(function()
		local on = view.auto and view.auto.supplies
		return mkRow(content, "자동 보급 " .. (if on then "● 켜짐" else "○ 꺼짐"), "항구에 도착할 때마다 보급품을 채워요", {
			{ text = if on then "끄기" else "켜기", color = if on then COLORS.red else COLORS.green, onClick = function() call("SetAuto", { key = "supplies", value = not on }) end },
		}, 56)
	end)
	add(function()
		local on = view.auto and view.auto.crew
		return mkRow(content, "자동 선원 충원 " .. (if on then "● 켜짐" else "○ 꺼짐"), "항구에 도착할 때마다 빈 자리를 고용해요", {
			{ text = if on then "끄기" else "켜기", color = if on then COLORS.red else COLORS.green, onClick = function() call("SetAuto", { key = "crew", value = not on }) end },
		}, 56)
	end)
	add(function() return mkHeader(content, "교역소 투자") end)
	for _, amt in h.options do
		add(function()
			return mkRow(content, string.format("%d 코인 투자", amt), string.format("명성 +%d", math.floor(amt / 100)), {
				{ text = "투자", color = COLORS.gold, onClick = function() call("Invest", { amount = amt }) end },
			}, 52)
		end)
	end
	add(function()
		local o = view.order
		if not o then return mkLabel(content, "", 4, COLORS.text, false) end
		local sub = string.format("치안 %d (%s) · 기본 %d · 판매 비율 %+.1f%%", o.value, o.label, o.target, o.sellBonus * 100)
		local btn = if o.cooldownLeft > 0 then string.format("%d일 뒤", o.cooldownLeft) else string.format("순찰 %d코인", o.cost)
		return mkRow(content, "항구 치안", sub .. "\n순찰을 보내면 치안 +" .. o.gain .. " (재해가 닥치면 떨어지고, 방어 건물·교역소 투자로 기본이 올라요)", {
			{ text = btn, color = COLORS.gold, enabled = o.cooldownLeft <= 0, onClick = function() call("OrderPatrol", {}) end },
		}, 88)
	end)
	add(function() return mkHeader(content, "주점") end)
	add(function()
		return mkRow(content, "소문 듣기", string.format("술값 %d · 지금 여기서 사서 다른 항구에 팔면 남는 상품\n(지금 정보 수준: %s)", h.rumorCost, intelName(view.intel or 0)), {
			{ text = "듣기", color = COLORS.blue, onClick = function() call("Rumor", {}) end },
		}, 72)
	end)
	addRumorPanel()
	add(function()
		return mkRow(content, "선원 회식", string.format("%d코인 · 사기 +30 (사기가 낮으면 탈영하고, 긴 항해에는 괴혈병이 돌아요)", view.feastCost or 30), {
			{ text = "한턱", color = COLORS.gold, onClick = function() call("Feast", {}) end },
		}, 72)
	end)
	add(function()
		local names = {}
		for _, m in view.maps or {} do
			table.insert(names, m.toName)
		end
		local mrow = mkRow(content, "보물지도 사기", string.format("200코인 · 가진 지도 %d/3%s\n표시된 항구로 가면 보물을 찾아요", #names, if #names > 0 then (": " .. table.concat(names, ", ")) else ""), {
			{ text = "구입", color = COLORS.gold, onClick = function() call("BuyMap", {}) end },
		}, 72)
		withIcon(mrow, "Relics", "map-rolled", nil, 52)
		return mrow
	end)
	add(function() return mkHeader(content, "주점 동료 (직능)") end)
	for _, c in view.companions.list do
		if c.role then
			add(function()
				local sub = string.format("%s\n영입 %d코인 · 호감도 %d%s", c.summary, c.fee, c.affinity, if c.blocked and not c.joined then " · " .. c.blocked else "")
				local btn = if c.joined
					then { text = "작별", color = COLORS.red, onClick = function() call("Dismiss", { companionId = c.id }) end }
					else { text = "영입", color = COLORS.green, enabled = c.blocked == nil, onClick = function() call("Recruit", { companionId = c.id }) end }
				local btns = { btn }
				if c.joined then
					table.insert(btns, 1, { text = "대화", color = COLORS.blue, onClick = function() call("Talk", { companionId = c.id }) end })
				end
				local row = mkRow(content, string.format("[%s] %s%s", c.role, c.name, if c.joined then "  ✔" else ""), sub, btns, 84)
				local model = COMPANION_MODEL[c.id]
				local scholarId = string.match(c.id, "^c_(.+)$")
				-- 실존 학자는 검증되어 등록된 당대 초상화가 있으면 모델보다 우선한다.
				local portrait = COMPANION_PORTRAIT[c.id]
				if portrait then
					withIcon(row, "Portraits", portrait.atlas, nil, 56, portrait.offset)
				elseif scholarId and AssetIds["Portraits/scholar_" .. scholarId] then
					withIcon(row, "Portraits", "scholar_" .. scholarId, nil, 56)
				elseif model then
					withIcon(row, "People", model, nil, 56)
				end
				return row
			end)
		end
	end
end

local trainingMember
local choosingCaptainClass = false
function RENDERERS.crew()
	add(function() return mkHeader(content, "지상전 병종과 개인 장비") end)
	for _, member in view.partyTraining or {} do
		add(function()
			local mastery = if member.maxLevel then "최대 숙련" else string.format("숙련 %d/%d", member.xp, member.xpNext)
			local sub = string.format("%s · Lv.%d · %s", member.class, member.level, mastery)
			return mkRow(content, member.name, sub, { {
				text = if trainingMember == member.id then "닫기" else "장비·승급",
				color = COLORS.blue, onClick = function()
					trainingMember = if trainingMember == member.id then nil else member.id
					render()
				end,
			} }, 66)
		end)
		if trainingMember == member.id then
			if member.classes then
				add(function()
					return mkButton(content, if choosingCaptainClass then "병종 목록 닫기" else "주인공 병종 바꾸기", COLORS.blue,
						UDim2.new(1, -6, 0, 44), function()
							choosingCaptainClass = not choosingCaptainClass
							render()
						end, true)
				end)
				if choosingCaptainClass then
					for _, class in member.classes do
						add(function()
							return mkRow(content, class.name, string.format("%s · 기본 이동 %d", class.weapon, class.move), { {
								text = if class.selected then "선택됨" else "선택", color = COLORS.blue, enabled = not class.selected,
								onClick = function() call("PartyTraining", { memberId = member.id, class = class.id }) end,
							} }, 60)
						end)
					end
				end
			end
			if member.canPromote then
				add(function()
					return mkRow(content, member.promotion, "승급 기술 · " .. member.promotionSkill, { {
						text = "승급", color = COLORS.green,
						onClick = function() call("PartyTraining", { memberId = member.id, promote = true }) end,
					} }, 66)
				end)
			end
			for _, slot in { "weapon", "armor" } do
				for _, item in member.gear[slot] do
					add(function()
						local hint = string.format("%s · 병종 Lv.%d%s", item.stats, item.level, if item.price > 0 then " · " .. item.price .. "코인" else "")
						return mkRow(content, item.name, hint, { {
							text = if item.equipped then "장착 중" elseif item.price > 0 then "구매·장착" else "장착",
							color = COLORS.blue, enabled = not item.equipped and member.level >= item.level,
							onClick = function() call("PartyTraining", { memberId = member.id, slot = slot, tier = item.tier }) end,
						} }, 66)
					end)
				end
			end
		end
	end
	add(function() return mkHeader(content, "동료와 대화") end)
	add(function()
		return mkLabel(content, "배에 탄 동료의 [대화] 버튼을 누르면 이야기를 나눌 수 있어요. 대화할수록 호감도가 올라 새 이야기와 선물이 열려요.", 13, COLORS.muted, true)
	end)
	add(function() return mkHeader(content, string.format("배의 자리 (이 배는 동료 %d명까지)", view.companions.max)) end)
	add(function()
		local vac = view.companions.vacancy
		local warn = ""
		if vac and (vac.speed < 0 or vac.cannon < 0) then
			warn = "\n⚠ 조타수/포술장 자리가 비어 있어 " .. (if vac.speed < 0 then "항해 속도 -2% " else "") .. (if vac.cannon < 0 then "포격 -2%" else "")
		end
		return mkLabel(content, "동료는 자기 직책 자리에 앉으면 효과 x1.2, 다른 자리에 앉으면 x0.6이에요. 버튼을 누르면 자리를 바꿔요." .. warn, 12, COLORS.muted, true)
	end)
	for _, st in view.companions.stations do
		add(function()
			local joined = {}
			for _, c in view.companions.list do
				if c.joined and c.id ~= st.seatId then
					table.insert(joined, c)
				end
			end
			H.stationPick = H.stationPick or {}
			local idx = (H.stationPick[st.id] or 0) % math.max(1, #joined) + 1
			local nxt = joined[idx]
			local seatText = if st.seatName then (st.seatName .. (if st.matched then "  ✔ 딱 맞음" else "  (다른 직책)")) else "비어 있음"
			local btns = {}
			local fit = nil
			for _, c in joined do
				if c.bestSeat == st.name then fit = c; break end
			end
			if fit and fit ~= nxt then
				table.insert(btns, { text = "★ " .. fit.name, color = COLORS.green or COLORS.blue, onClick = function()
					call("Station", { companionId = fit.id, station = st.id })
				end })
			end
			if nxt then
				table.insert(btns, { text = "▶ " .. nxt.name, color = COLORS.blue, onClick = function()
					H.stationPick[st.id] = idx
					call("Station", { companionId = nxt.id, station = st.id })
				end })
			end
			return mkRow(content, st.name .. " · " .. seatText, st.summary, btns, 60)
		end)
	end
	add(function() return mkHeader(content, "동료") end)
	if view.talk then
		add(function()
			-- 실제 동료 대화에 기존 등록 초상화를 연결한다. 호감도·대화·저장은 그대로 둔다.
			local talkId = nil
			for _, companion in view.companions.list do
				if companion.name == view.talk.name then
					talkId = companion.id
					break
				end
			end
			local row = mkRow(content, view.talk.name, "\"" .. view.talk.line .. "\"\n" .. (view.talk.note or ""), nil, 136)
			local scholarId = if talkId then string.match(talkId, "^c_(.+)$") else nil
			local portrait = COMPANION_PORTRAIT[talkId]
			if portrait then
				withIcon(row, "Portraits", portrait.atlas, nil, 68, portrait.offset)
			elseif scholarId and AssetIds["Portraits/scholar_" .. scholarId] then
				withIcon(row, "Portraits", "scholar_" .. scholarId, nil, 68)
			elseif talkId and COMPANION_MODEL[talkId] then
				withIcon(row, "People", COMPANION_MODEL[talkId], nil, 68)
			end
			return row
		end)
	end
	if view.talk and view.talk.options then
		add(function()
			return mkLabel(content, view.talk.question or "", 16, COLORS.gold, true)
		end)
		for i, text in view.talk.options do
			add(function()
				return mkRow(content, text, "", { { text = "대답", color = COLORS.green, onClick = function() call("TalkChoice", { index = i }) end } }, 48)
			end)
		end
	end
	for _, c in view.companions.list do
		add(function()
			local sub = string.format("%s\n어울리는 자리 %s · 영입 %d코인 · 호감도 %d (%s)%s", c.summary, c.bestSeat, c.fee, c.affinity, ({ "낯선 사이", "믿는 사이", "오랜 벗" })[c.tier], if c.blocked and not c.joined then " · " .. c.blocked else "")
			local btn = if c.joined
				then { text = "작별", color = COLORS.red, onClick = function() call("Dismiss", { companionId = c.id }) end }
				else { text = "영입", color = COLORS.green, enabled = c.blocked == nil, onClick = function() call("Recruit", { companionId = c.id }) end }
			local btns = { btn }
			if c.joined then
				table.insert(btns, 1, { text = "대화", color = COLORS.blue, onClick = function() call("Talk", { companionId = c.id }) end })
			end
			local row = mkRow(content, c.name .. (if c.joined then "  ✔" else ""), sub, btns, 76)
			local model = COMPANION_MODEL[c.id]
			local scholarId = string.match(c.id, "^c_(.+)$")
			local portrait = COMPANION_PORTRAIT[c.id]
			if portrait then
				withIcon(row, "Portraits", portrait.atlas, nil, 52, portrait.offset)
			elseif scholarId and AssetIds["Portraits/scholar_" .. scholarId] then
				withIcon(row, "Portraits", "scholar_" .. scholarId, nil, 52)
			elseif model then
				withIcon(row, "People", model, nil, 52)
			end
			return row
		end)
	end
end

function RENDERERS.status()
	local p, ship = view.player, view.ship
	add(function() return mkHeader(content, "선박") end)
	add(function()
		return mkRow(content, string.format("%s%s", ship.name, if ship.steam then " (증기)" else ""),
			string.format("선체 %d/%d · 선원 %d/%d · 포 %d · 속도 %d\n화물 %d/%d · 보급품 %d · 석탄 %d",
				ship.hull, ship.maxHull, ship.crew, ship.maxCrew, ship.cannons, ship.speed,
				ship.cargoUsed, ship.cargoCapacity, ship.supplies, ship.coal), nil, 76)
	end)
	add(function() return mkHeader(content, "직업") end)
	for _, c in view.careers do
		add(function()
			return mkRow(content, string.format("%s Lv.%d", c.name, c.level), string.format("경험치 %d / %d", c.xp, c.nextXp), nil, 48)
		end)
	end
	add(function() return mkHeader(content, "항해 방식") end)
	add(function()
		local manualOn = player:GetAttribute("ManualHelm") == true
		return mkRow(content, "수동 항해", if manualOn then "켜짐: 스틱·WASD로 직접 조종, 바람을 읽어 가요" else "꺼짐: 자동 항해", {
			{ text = if manualOn then "자동으로" else "직접 조종", color = if manualOn then COLORS.grey else COLORS.blue, onClick = function()
				player:SetAttribute("ManualHelm", not manualOn)
				render()
			end },
		}, 60)
	end)
	add(function() return mkHeader(content, "소리") end)
	add(function()
		local musicOn, sfxOn = Sfx.state()
		return mkRow(content, "음악", if musicOn then "켜짐" else "꺼짐", {
			{ text = if musicOn then "끄기" else "켜기", color = if musicOn then COLORS.grey else COLORS.blue, onClick = function()
				Sfx.setMusicEnabled(not musicOn)
				render()
			end },
		}, 52)
	end)
	add(function()
		local musicOn, sfxOn = Sfx.state()
		return mkRow(content, "효과음", if sfxOn then "켜짐" else "꺼짐", {
			{ text = if sfxOn then "끄기" else "켜기", color = if sfxOn then COLORS.grey else COLORS.blue, onClick = function()
				Sfx.setSfxEnabled(not sfxOn)
				render()
			end },
		}, 52)
	end)
	add(function()
		local ml, sl = Sfx.levels()
		return mkRow(content, string.format("음악 크기 %d%%", math.floor(ml / 1.5 * 100 + 0.5)), "소리가 작으면 크게를 눌러 보세요", {
			{ text = "작게", color = COLORS.grey, onClick = function() Sfx.stepMusic(-1); render() end },
			{ text = "크게", color = COLORS.blue, onClick = function() Sfx.stepMusic(1); render() end },
		}, 52)
	end)
	add(function()
		local ml, sl = Sfx.levels()
		return mkRow(content, string.format("효과음 크기 %d%%", math.floor(sl / 1.5 * 100 + 0.5)), nil, {
			{ text = "작게", color = COLORS.grey, onClick = function() Sfx.stepSfx(-1); render() end },
			{ text = "크게", color = COLORS.blue, onClick = function() Sfx.stepSfx(1); render() end },
		}, 52)
	end)
	add(function() return mkHeader(content, "시작 가이드") end)
	add(function()
		return mkLabel(content, "메뉴·상품 그림: Lorc · Delapouite · Lord Berandas · Skoll / game-icons.net / CC BY 3.0\n사프란: Tiny Speck·Bart / CC0 · 대추야자·건포도: 게임 전용 벡터 원화\n색상·재질 편집 및 이미지 변환: 마리 에센시아", 10, COLORS.muted, false)
	end)
	add(function()
		return mkLabel(content, "1) 교역: 특산(싸게)을 사서 수요(비싸게) 항구에 팔아요. ▲▼는 시장 사건으로 값이 움직이는 품목이에요.\n2) 항해: 항구를 옮기면 날짜가 지나고 보급품이 줄어요. 증기선은 석탄을 태워요.\n3) 탐험·도감: 항구 근처에서 카드를 발견하면 명성과 코인을 얻고, 학자를 만나 지식을 전수받아요.\n4) 연구: 증기 지식을 모으면 증기선과 증기 스킬이 열려요.\n5) 전투: 사략선 사냥으로 경험을 쌓고, 레벨이 오르면 신화 괴물에 도전해요.", 12, COLORS.muted, false)
	end)
	add(function() return mkHeader(content, "전문 분야") end)
	for _, sp in view.specialties.list do
		add(function()
			local mine = view.specialties.current == sp.id
			local sub = sp.summary .. string.format(" · 전문 Lv.%d", sp.level) .. (if sp.nextXp > 0 then string.format(" (%d/%d)", sp.xp, sp.nextXp) else " (최대)")
			if view.specialties.current and not mine then
				sub ..= string.format(" · 변경 %d코인", view.specialties.changeFee)
			end
			return mkRow(content, sp.name .. (if mine then "  ✔" else ""), sub, {
				{ text = if mine then "선택됨" else "선택", color = if mine then COLORS.gold else COLORS.blue, enabled = not mine,
					onClick = function() call("SetSpecialty", { specialtyId = sp.id }) end },
			}, 56)
		end)
	end
	add(function() return mkHeader(content, string.format("항해 장비 (장착 최대 %d개)", view.gear.slots)) end)
	for _, g in view.gear.list do
		add(function()
			local btn
			if g.owned then
				btn = { text = if g.equipped then "해제" else "장착", color = if g.equipped then COLORS.red else COLORS.green, onClick = function() call("ToggleGear", { gearId = g.id }) end }
			else
				local okFame = view.player.fame >= g.minFame
				btn = { text = tostring(g.price), color = if okFame then COLORS.gold else COLORS.grey, onClick = function()
					if not okFame then
						message, messageOk = string.format("명성이 부족해요 (필요 %d / 현재 %d). 퀘스트·이야기·발견으로 명성을 모으세요", g.minFame, view.player.fame), false
						render()
						return
					end
					call("BuyGear", { gearId = g.id })
				end }
			end
			local grow = mkRow(content, g.name .. (if g.equipped then "  ✔" else ""), g.summary .. (if not g.owned then string.format(" · 명성 %d 필요", g.minFame) else ""), { btn }, 60)
			local gi = ({
				sextant = { "Relics", "compass-base" }, brass_telescope = { "Relics", "magnifying-glass" }, ledger = { "Relics", "journal-closed" },
				medicine_chest = { "Cargo", "mortar" }, lucky_charm = { "Cargo", "gem-medium" }, naval_chart = { "Relics", "map-rolled" },
			})[g.id]
			if gi then
				withIcon(grow, gi[1], gi[2], nil, 44)
			end
			return grow
		end)
	end
	add(function() return mkHeader(content, "명성 랭킹 (서버 전체 상위 10)") end)
	add(function()
		return mkRow(content, "랭킹 보기", "다른 항해자들의 명성 순위를 불러와요", {
			{ text = "보기", color = COLORS.blue, onClick = function() call("Ranking", {}) end },
		}, 52)
	end)
	if ranking then
		add(function()
			if #ranking == 0 then
				return mkLabel(content, "아직 기록이 없어요 (저장 후 반영돼요)", 15, COLORS.muted, false)
			end
			local lines = {}
			for _, r in ranking do
				table.insert(lines, string.format("%d위  %s  ·  명성 %d", r.rank, r.name, r.fame))
			end
			return mkLabel(content, table.concat(lines, "\n"), 16, COLORS.gold, true)
		end)
	end
	add(function() return mkHeader(content, "기록") end)
	add(function()
		return mkRow(content, string.format("%s · %d년 (항해 %d일째)", p.nation, p.year, p.day),
			string.format("명성 %d · 도감 %d/%d · 완료한 퀘스트 %d", p.fame, view.codex.found, view.codex.total, view.quests.doneCount), nil, 52)
	end)
end

function intelName(level)
	if level >= 3 then
		return "정확한 수치"
	elseif level >= 1 then
		return "대략적인 범위"
	end
	return "감만 잡는 힌트"
end

-- 이야기와 조언: 프롤로그, 새 해역의 막, 동료의 한마디
function H.addStoryPanel()
	if view.prologue then
		add(function() return mkHeader(content, view.prologue.title) end)
		add(function() return mkLabel(content, view.prologue.text, 16, COLORS.gold, true) end)
	end
	if view.actIntro then
		add(function() return mkHeader(content, view.actIntro.title) end)
		add(function() return mkLabel(content, view.actIntro.text .. "\n목표: " .. view.actIntro.goal, 16, COLORS.gold, true) end)
	elseif view.act then
		add(function() return mkLabel(content, view.act.title .. " — 목표: " .. view.act.goal, 15, COLORS.gold, true) end)
	end
	if view.guide then
		add(function() return mkHeader(content, "🧭 " .. view.guide.title) end)
		add(function()
			local lines = {}
			for _, st in view.guide.steps do
				table.insert(lines, st.mark .. " " .. st.text)
			end
			return mkLabel(content, table.concat(lines, "\n"), 15, COLORS.text, true)
		end)
	end
	if view.advice then
		add(function() return mkLabel(content, string.format("💬 %s의 조언\n\"%s\"", view.advice.who, view.advice.text), 16, COLORS.gold, true) end)
	end
end

-- 뱃사람 귀띔: 크게, 눈에 잘 띄게
function addRumorPanel()
	local r = view.rumor
	if not r then
		return
	end
	add(function() return mkHeader(content, "뱃사람 귀띔 · " .. intelName(r.level)) end)
	add(function()
		return mkLabel(content, "· " .. table.concat(r.lines, "\n· "), 17, COLORS.gold, true)
	end)
end


-- 교역소 별도 화면: 상인과 마주 보고 물건을 고르고, 수량을 정하고, 흥정하고, 사고판다 ------------------
local hallQty = 1
local hallGood = nil
local function closeTradeHall()
	local g = player.PlayerGui:FindFirstChild("TradeHallGui")
	if g then
		g:Destroy()
	end
	tradeHallRefresh = nil
	main.Visible = true
end

local function openTradeHall()
	Sfx.play("sfx_bell")
	closeTradeHall()
	-- 상인이 교역소 입장 시 현지어로 짧게 인사한다. 별도 인사 자막은 넣지 않는다.
	if view and view.player then
		Sfx.merchantGreeting(PortData.Ports[view.player.portId])
	end
	local layer = overlayGui("TradeHallGui", 15)
	main.Visible = false
	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = Color3.fromRGB(34, 26, 20)
	root.BorderSizePixel = 0
	root.Parent = layer
	local lastScroll = 0

	local function build()
		if not layer.Parent or not view then
			return
		end
		for _, c in root:GetChildren() do
			if c:IsA("ScrollingFrame") then
				lastScroll = c.CanvasPosition.Y
			end
			c:Destroy()
		end
		local goods = view.goods or {}
		if not hallGood or not (function() for _, g in goods do if g.id == hallGood then return true end end return false end)() then
			hallGood = goods[1] and goods[1].id
		end
		local sel
		for _, g in goods do
			if g.id == hallGood then
				sel = g
			end
		end
		local p, ship = view.player, view.ship

		-- 윗줄: 항구 이름, 코인, 화물칸, 나가기
		local top = mkBox(root, UDim2.fromOffset(0, 0), UDim2.new(1, 0, 0, 54), Color3.fromRGB(58, 42, 30))
		local title = mkLabel(top, string.format("교역소 · %s", p.portName), 24, COLORS.gold, true)
		title.Position = UDim2.fromOffset(18, 12)
		local hold = mkLabel(top, string.format("코인 %d    화물 %d/%d", p.coins, ship.cargoUsed, ship.cargoCapacity), 20, COLORS.text, true)
		hold.AnchorPoint = Vector2.new(1, 0)
		hold.Position = UDim2.new(1, -140, 0, 14)
		hold.Size = UDim2.fromOffset(420, 28)
		hold.AutomaticSize = Enum.AutomaticSize.None
		hold.TextXAlignment = Enum.TextXAlignment.Right
		title.Size = UDim2.fromOffset(420, 30)
		title.AutomaticSize = Enum.AutomaticSize.None
		local leave = mkButton(top, "나가기", COLORS.red, UDim2.fromOffset(110, 38), closeTradeHall, true)
		leave.AnchorPoint = Vector2.new(1, 0.5)
		leave.Position = UDim2.new(1, -12, 0.5, 0)
		leave.TextSize = 18

		-- 왼쪽: 상인 초상과 말풍선
		local left = mkBox(root, UDim2.fromOffset(0, 54), UDim2.new(0, 250, 1, -54), Color3.fromRGB(46, 34, 26))
		local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
		local tpl = lib and lib:FindFirstChild("People") and lib.People:FindFirstChild(storyPortraitModel("상인", p.portId or ""))
		local regionalId, regionalOffset, regionalSize = H.facilityPortraitAsset(p.portId, "merchant")
		local merchantImageId = regionalId or FACILITY_ATLAS or PORTRAIT_ATLAS or AssetIds["Portraits/merchant"]
		if merchantImageId then
			local photo = Instance.new("ImageLabel")
			photo.Name = "MerchantPortrait"
			photo.Size = UDim2.new(1, 0, 1, -150)
			photo.Position = UDim2.fromOffset(0, 0)
			photo.BackgroundTransparency = 1
			photo.BorderSizePixel = 0
			photo.ScaleType = Enum.ScaleType.Crop
			photo.Image = "rbxassetid://" .. tostring(merchantImageId)
			photo.ImageRectOffset = regionalOffset or (if FACILITY_ATLAS then FACILITY_TILE.merchant elseif PORTRAIT_ATLAS then PORTRAIT_TILE.merchant else Vector2.zero)
			photo.ImageRectSize = regionalSize or (if FACILITY_ATLAS or PORTRAIT_ATLAS then PORTRAIT_SIZE else Vector2.zero)
			photo.Parent = left
		else
			local vf = Instance.new("ViewportFrame")
			vf.BackgroundTransparency = 1
			vf.Size = UDim2.new(1, 0, 1, -150)
			vf.Position = UDim2.fromOffset(0, 0)
			vf.Ambient = Color3.fromRGB(170, 170, 178)
			vf.LightColor = Color3.fromRGB(255, 236, 205)
			vf.LightDirection = Vector3.new(-0.6, -0.8, -1).Unit
			vf.Parent = left
			local cam = Instance.new("Camera")
			cam.FieldOfView = 32
			cam.Parent = vf
			vf.CurrentCamera = cam
			local world = Instance.new("WorldModel")
			world.Parent = vf
			local m = portraitPerson(world, "merchant" .. (p.portId or ""), "Rogue", tpl)
			if not m then
				vf:Destroy()
			end
			local cf, size = CFrame.new(), Vector3.new(4, 6, 2)
			if m then
				cf, size = m:GetBoundingBox()
			end
			local focus = cf.Position + Vector3.new(0, size.Y * 0.1, 0)
			cam.FieldOfView = 40
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.25, 0.08, -1).Unit * (math.max(size.X, size.Y, size.Z) * 1.7), focus)
		end
		local bubble = mkBox(left, UDim2.new(0, 10, 1, -146), UDim2.new(1, -20, 0, 136), Color3.fromRGB(240, 228, 200))
		corner(bubble, 12)
		local say = (message ~= "" and message) or string.format("%s 시세는 날마다 달라진다오.", p.portName)
		local sl = mkLabel(bubble, say, 16, Color3.fromRGB(50, 36, 24), true)
		sl.Position = UDim2.fromOffset(10, 8)
		sl.Size = UDim2.new(1, -20, 1, -16)
		sl.AutomaticSize = Enum.AutomaticSize.None
		sl.TextWrapped = true
		sl.TextYAlignment = Enum.TextYAlignment.Top

		-- 가운데: 물품 목록
		local list = Instance.new("ScrollingFrame")
		list.Position = UDim2.fromOffset(258, 62)
		list.Size = UDim2.new(1, -258 - 330, 1, -70)
		list.BackgroundTransparency = 1
		list.BorderSizePixel = 0
		list.ScrollBarThickness = 6
		list.AutomaticCanvasSize = Enum.AutomaticSize.Y
		list.CanvasSize = UDim2.new()
		list.Parent = root
		local ll = Instance.new("UIListLayout")
		ll.Padding = UDim.new(0, 6)
		ll.SortOrder = Enum.SortOrder.LayoutOrder
		ll.Parent = list
		for i, g in goods do
			local row = Instance.new("TextButton")
			row.Text = ""
			row.LayoutOrder = i
			row.Size = UDim2.new(1, -8, 0, 68)
			row.BackgroundColor3 = if g.id == hallGood then Color3.fromRGB(86, 64, 40) else COLORS.row
			row.BorderSizePixel = 0
			row.AutoButtonColor = true
			corner(row, 10)
			row.Parent = list
			row.Activated:Connect(function()
				hallGood = g.id
				Sfx.play("sfx_click")
				build()
			end)
			local gi = GOOD_ICON[g.id]
			local icon = if gi then modelIcon(row, gi[1], gi[2], gi[3], 52, g.name, gi[4]) else modelIcon(row, nil, nil, nil, 52, g.name)
			icon.Position = UDim2.fromOffset(8, 8)
			local nm = mkLabel(row, g.name .. (if g.upgraded then " (신상)" else "") .. (if g.cheaper then " (할인)" else "") .. (if g.trend == "up" then " ▲" elseif g.trend == "down" then " ▼" else ""), 20, if g.trend == "up" then COLORS.green elseif g.trend == "down" then COLORS.red else COLORS.text, true)
			nm.Position = UDim2.fromOffset(70, 8)
			nm.Size = UDim2.new(1, -230, 0, 26)
			nm.AutomaticSize = Enum.AutomaticSize.None
			local pr = mkLabel(row, string.format("사기 %d · 팔기 %d%s", g.buy, g.sell, if g.owned > 0 then " · 보유 " .. g.owned else ""), 14, COLORS.muted, false)
			pr.TextTruncate = Enum.TextTruncate.AtEnd
			pr.Position = UDim2.fromOffset(70, 38)
			pr.Size = UDim2.new(1, -80, 0, 22)
			pr.AutomaticSize = Enum.AutomaticSize.None
			if g.tag ~= "" then
				local badge = Instance.new("TextLabel")
				badge.Text = g.tag
				badge.TextSize = 16
				badge.Font = Enum.Font.GothamBold
				badge.TextColor3 = Color3.new(1, 1, 1)
				badge.BackgroundColor3 = if g.tag == "특산" then COLORS.green else COLORS.gold
				badge.Size = UDim2.fromOffset(56, 26)
				badge.AnchorPoint = Vector2.new(1, 0)
				badge.Position = UDim2.new(1, -10, 0, 8)
				corner(badge, 6)
				badge.Parent = row
			end
		end
		list.CanvasPosition = Vector2.new(0, lastScroll)

		-- 오른쪽: 선택한 물품의 거래 상자
		local right = mkBox(root, UDim2.new(1, -322, 0, 62), UDim2.new(0, 314, 1, -70), Color3.fromRGB(46, 34, 26))
		corner(right, 12)
		if sel then
			local gi = GOOD_ICON[sel.id]
			local big = if gi then modelIcon(right, gi[1], gi[2], gi[3], 96, sel.name, gi[4]) else modelIcon(right, nil, nil, nil, 96, sel.name)
			big.Position = UDim2.fromOffset(12, 12)
			local hn = mkLabel(right, sel.name, 24, COLORS.gold, true)
			hn.Position = UDim2.fromOffset(120, 16)
			hn.Size = UDim2.new(1, -130, 0, 30)
			hn.AutomaticSize = Enum.AutomaticSize.None
			local note = if sel.tag == "특산" then "산지라 값이 싸요. 수요 항구에 가져가면 이익이에요."
				elseif sel.tag == "수요" then "이 항구에서 잘 팔려요. 비싸게 받을 수 있어요."
				else "평범한 시세예요."
			local hnote = mkLabel(right, note, 14, COLORS.muted, false)
			hnote.Position = UDim2.fromOffset(120, 48)
			hnote.Size = UDim2.new(1, -130, 0, 60)
			hnote.AutomaticSize = Enum.AutomaticSize.None
			local qty = math.clamp(hallQty, 1, 20)
			local free = ship.cargoCapacity - ship.cargoUsed
			local deal = view.haggle and view.haggle.deal
			local dealPct = (deal and deal.goodId == sel.id) and deal.pct or 0
			local unitBuy = math.floor(sel.buy * (1 - dealPct / 100))
			local info = mkLabel(right, string.format("사기 %d%s   팔기 %d\n보유 %d   빈 화물칸 %d", unitBuy, if dealPct > 0 then string.format(" (흥정 -%d%%)", dealPct) else "", sel.sell, sel.owned, free), 18, COLORS.text, true)
			info.Position = UDim2.fromOffset(14, 122)
			info.Size = UDim2.new(1, -28, 0, 56)
			info.AutomaticSize = Enum.AutomaticSize.None
			-- 수량 조절
			local ql = mkLabel(right, "수량", 16, COLORS.muted, true)
			ql.Position = UDim2.fromOffset(14, 192)
			local minus = mkButton(right, "-", COLORS.grey, UDim2.fromOffset(44, 40), function() hallQty = math.max(1, qty - 1) build() end, true)
			minus.Position = UDim2.fromOffset(70, 184)
			minus.TextSize = 24
			local qv = mkLabel(right, tostring(qty), 24, COLORS.text, true)
			qv.Position = UDim2.fromOffset(124, 190)
			qv.Size = UDim2.fromOffset(50, 30)
			qv.AutomaticSize = Enum.AutomaticSize.None
			qv.TextXAlignment = Enum.TextXAlignment.Center
			local plus = mkButton(right, "+", COLORS.grey, UDim2.fromOffset(44, 40), function() hallQty = math.min(20, qty + 1) build() end, true)
			plus.Position = UDim2.fromOffset(180, 184)
			plus.TextSize = 24
			local maxB = mkButton(right, "최대", COLORS.blue, UDim2.fromOffset(64, 40), function()
				local byCoins = if unitBuy > 0 then math.floor(p.coins / unitBuy) else 20
				hallQty = math.clamp(math.min(free, byCoins), 1, 20)
				build()
			end, true)
			maxB.Position = UDim2.fromOffset(234, 184)
			local tot = mkLabel(right, string.format("예상 금액 약 %d 코인", unitBuy * qty), 16, COLORS.gold, true)
			tot.Position = UDim2.fromOffset(14, 232)
			-- 거래 버튼
			local buy = mkButton(right, "구매", COLORS.blue, UDim2.new(0.5, -18, 0, 52), function() call("Buy", { goodId = sel.id, amount = qty }) end, true)
			buy.Position = UDim2.fromOffset(12, 262)
			buy.TextSize = 20
			local sell = mkButton(right, "판매", COLORS.green, UDim2.new(0.5, -18, 0, 52), function() call("Sell", { goodId = sel.id, amount = math.min(qty, sel.owned) }) end, sel.owned > 0)
			sell.Position = UDim2.new(0.5, 6, 0, 262)
			sell.TextSize = 20
			local tried = view.haggle and view.haggle.tried and view.haggle.tried[sel.id]
			local hg = mkButton(right, if tried then "흥정 끝" else "흥정하기", COLORS.gold, UDim2.new(0.5, -18, 0, 44), function() call("Haggle", { goodId = sel.id }) end, not tried)
			hg.Position = UDim2.fromOffset(12, 324)
			hg.TextSize = 18
			local sm = mkButton(right, "암시장 판매", COLORS.red, UDim2.new(0.5, -18, 0, 44), function() call("Smuggle", { goodId = sel.id, amount = math.min(qty, sel.owned) }) end, sel.owned > 0)
			sm.Position = UDim2.new(0.5, 6, 0, 324)
			sm.TextSize = 16
			local allB = mkButton(right, "보유분 전부 팔기", COLORS.grey, UDim2.new(1, -24, 0, 40), function() call("Sell", { goodId = sel.id, amount = math.min(20, sel.owned) }) end, sel.owned > 0)
			allB.Position = UDim2.fromOffset(12, 372)
			allB.TextSize = 16
			do
				local top = view.compare and view.compare[sel.id]
				local lines = {}
				if top then
					for _, t in top do
						table.insert(lines, if t.sell then string.format("%s  %d", t.name, t.sell) else t.name)
					end
				end
				local cmpText = if (view.intel or 0) <= 0 then "다른 항구 시세: 장사 감각이 있는 동료가 필요해요"
					elseif #lines == 0 then "다른 항구 시세 정보 없음"
					else (if view.intel >= 2 then "비싸게 팔리는 항구 (팔기 시세)\n" else "비싸게 팔릴 듯한 항구\n") .. table.concat(lines, "\n")
				local cl = mkLabel(right, cmpText, 15, COLORS.text, false)
				cl.Position = UDim2.fromOffset(14, 414)
				cl.Size = UDim2.new(1, -28, 0, 78)
				cl.AutomaticSize = Enum.AutomaticSize.None
			end
			local hint = mkLabel(right, string.format("동료 장사 감각 %s · 흥정은 물건마다 한 번, 성공하면 다음 구매가 싸져요.", intelName(view.intel or 0)), 12, COLORS.muted, false)
			hint.Position = UDim2.fromOffset(14, 494)
			hint.Size = UDim2.new(1, -28, 0, 34)
			hint.AutomaticSize = Enum.AutomaticSize.None
		end
	end
	tradeHallRefresh = build
	build()
end

function RENDERERS.trade()
	if view.guide then
		add(function()
			return mkLabel(content, "💡 교역 요령: 이 항구의 특산품은 싸게 사고, '수요'가 높은 다른 항구에 가서 팔면 이익이 남아요. 지도 탭에서 갈 곳을 고르세요.", 14, COLORS.gold, true)
		end)
	end
	add(function()
		return mkRow(content, "교역소 입장 (별도 화면)", "상인과 마주 보고 물건을 고르고 흥정해요", {
			{ text = "입장", color = COLORS.gold, onClick = function() openTradeHall() end },
		}, 60)
	end)
	add(function()
		return mkLabel(content, "‘암’ 버튼 = 암시장 판매: 관세 없이 +10%, 하지만 들키면 압수와 벌금(우호도가 높을수록 덜 들켜요)", 12, COLORS.muted, false)
	end)
	if view.rep then
		add(function()
			return mkLabel(content, string.format("%s 우호도 %d/100 · 되파는 비율 +%.1f%% (이 나라에 팔수록 올라요) · 관세 %.1f%%", view.rep.name, view.rep.value, view.rep.bonus * 100, view.rep.tariff * 100), 15, COLORS.text, true)
		end)
	end
	add(function()
		return mkLabel(content, string.format("동료의 장사 감각: %s (동료가 있으면 시장·귀띔 정보가 정확해져요)", intelName(view.intel or 0)), 14, COLORS.muted, false)
	end)
	H.addStoryPanel()
	if view.news and #view.news > 0 then
		add(function() return mkHeader(content, "시장 소식") end)
		add(function() return mkLabel(content, table.concat(view.news, "\n"), 16, COLORS.gold, true) end)
	end
	addRumorPanel()
	add(function()
		local frame = Instance.new("Frame")
		frame.BackgroundTransparency = 1
		frame.Size = UDim2.new(1, -6, 0, 40)
		local lbl = mkLabel(frame, string.format("수량 선택 (되파는 비율 %d%%)", math.floor(view.sellRate * 100 + 0.5)), 12, COLORS.muted, false)
		lbl.Size = UDim2.new(0.5, 0, 1, 0)
		lbl.AutomaticSize = Enum.AutomaticSize.None
		lbl.TextYAlignment = Enum.TextYAlignment.Center
		for i, a in AMOUNTS do
			local b = mkButton(frame, tostring(a), if i == amountIndex then COLORS.gold else COLORS.grey, UDim2.fromOffset(52, 34), function()
				amountIndex = i
				render()
			end, true)
			b.AnchorPoint = Vector2.new(1, 0.5)
			b.Position = UDim2.new(1, -6 - (#AMOUNTS - i) * 58, 0.5, 0)
		end
		frame.Parent = content
		return frame
	end)
	-- 우편·거래소 (아래쪽에서 이어서 그린다)
	-- 상품 카드 격자: 한눈에 보고 바로 사고판다 (대항해시대 온라인 교역소처럼)
	add(function()
		local grid = Instance.new("Frame")
		grid.BackgroundTransparency = 1
		grid.Size = UDim2.new(1, -6, 0, 0)
		grid.AutomaticSize = Enum.AutomaticSize.Y
		local gl = Instance.new("UIGridLayout")
		gl.CellSize = UDim2.new(0.5, -4, 0, 128)
		gl.CellPadding = UDim2.fromOffset(6, 6)
		gl.SortOrder = Enum.SortOrder.LayoutOrder
		gl.Parent = grid
		for i, g in view.goods do
			local cardF = Instance.new("Frame")
			cardF.LayoutOrder = i
			cardF.BackgroundColor3 = COLORS.row
			cardF.BorderSizePixel = 0
			corner(cardF, 10)
			cardF.Parent = grid
			local st = Instance.new("UIStroke")
			st.Color = if g.trend == "up" then COLORS.green elseif g.trend == "down" then COLORS.red else Color3.fromRGB(70, 84, 104)
			st.Thickness = 1.5
			st.Parent = cardF
			local gi = GOOD_ICON[g.id]
			local icon = if gi then modelIcon(cardF, gi[1], gi[2], gi[3], 60, g.name, gi[4])
				else modelIcon(cardF, nil, nil, nil, 60, g.name)
			icon.Position = UDim2.fromOffset(8, 8)
			local nm = mkLabel(cardF, g.name .. (if g.upgraded then " (신상)" else "") .. (if g.cheaper then " (할인)" else "") .. (if g.trend == "up" then " ▲" elseif g.trend == "down" then " ▼" else ""), 18, COLORS.text, true)
			nm.Position = UDim2.fromOffset(76, 6)
			nm.Size = UDim2.new(1, -150, 0, 24)
			nm.AutomaticSize = Enum.AutomaticSize.None
			if g.tag ~= "" then
				local badge = Instance.new("TextLabel")
				badge.Text = g.tag
				badge.TextSize = 15
				badge.Font = Enum.Font.GothamBold
				badge.TextColor3 = Color3.new(1, 1, 1)
				badge.BackgroundColor3 = if g.tag == "특산" then COLORS.green else COLORS.gold
				badge.Size = UDim2.fromOffset(52, 24)
				badge.AnchorPoint = Vector2.new(1, 0)
				badge.Position = UDim2.new(1, -8, 0, 6)
				corner(badge, 6)
				badge.Parent = cardF
			end
			local info = mkLabel(cardF, string.format("사기 %d · 팔기 %d\n보유 %d", g.buy, g.sell, g.owned), 16, COLORS.text, false)
			info.Position = UDim2.fromOffset(76, 34)
			info.Size = UDim2.new(1, -84, 0, 44)
			info.AutomaticSize = Enum.AutomaticSize.None
			local buy = mkButton(cardF, "구매", COLORS.blue, UDim2.new(0.5, -10, 0, 36), function() call("Buy", { goodId = g.id, amount = amount() }) end, true)
			buy.Position = UDim2.new(0, 6, 1, -42)
			local sell = mkButton(cardF, "판매", COLORS.green, UDim2.new(0.5, -10, 0, 36), function() call("Sell", { goodId = g.id, amount = amount() }) end, g.owned > 0)
			sell.Position = UDim2.new(0.5, 4, 1, -42)
			if g.owned > 0 then
				local sm = mkButton(cardF, "암", COLORS.red, UDim2.fromOffset(34, 24), function() call("Smuggle", { goodId = g.id, amount = amount() }) end, true)
				sm.AnchorPoint = Vector2.new(1, 0)
				sm.Position = UDim2.new(1, -8, 0, 34)
			end
		end
		return grid
	end)

	-- 거래소 게시판: 다른 항해자와 고정가로 사고판다 (수수료 5%)
	local function mkInput(parent, placeholder, text, width, onChanged)
		local box = Instance.new("TextBox")
		box.Size = UDim2.new(0, width, 0, 34)
		box.BackgroundColor3 = Color3.fromRGB(30, 40, 56)
		box.TextColor3 = COLORS.text
		box.PlaceholderText = placeholder
		box.PlaceholderColor3 = COLORS.muted
		box.Text = text
		box.TextSize = 15
		box.Font = Enum.Font.Gotham
		box.ClearTextOnFocus = false
		corner(box, 6)
		box.FocusLost:Connect(function()
			onChanged(box.Text)
		end)
		box.Parent = parent
		return box
	end
	add(function() return mkHeader(content, "거래소 게시판 (다른 항해자와 거래)") end)
	add(function()
		return mkRow(content, "게시판 보기", "다른 항해자가 올린 물건을 불러와요", {
			{ text = "새로고침", color = COLORS.blue, onClick = function() call("MarketList", {}) end },
		}, 52)
	end)
	for _, l in marketList or {} do
		add(function()
			local mine = l.sellerId == player.UserId
			local btn = if mine
				then { text = "취소", color = COLORS.red, onClick = function() call("MarketCancel", { id = l.id }) end }
				else { text = "구매", color = COLORS.green, onClick = function() call("MarketBuy", { id = l.id }) end }
			local name = (PortData.Goods[l.goodId] and PortData.Goods[l.goodId].name) or l.goodId
			return mkRow(content, string.format("%s %d개 · %d코인", name, l.amount, l.price), string.format("판매자 %s", l.sellerName), { btn }, 52)
		end)
	end
	for _, g in view.goods do
		if g.owned > 0 then
			add(function()
				local frame = Instance.new("Frame")
				frame.Size = UDim2.new(1, -6, 0, 44)
				frame.BackgroundColor3 = COLORS.row
				frame.BorderSizePixel = 0
				corner(frame, 8)
				local lbl = mkLabel(frame, string.format("%s (보유 %d)", g.name, g.owned), 14, COLORS.text, true)
				lbl.Position = UDim2.fromOffset(8, 12)
				lbl.Size = UDim2.new(0.4, 0, 0, 20)
				lbl.AutomaticSize = Enum.AutomaticSize.None
				local qty = math.min(amount(), g.owned)
				local input = mkInput(frame, "총 가격", tostring(postPrice[g.id] or (g.sell * qty)), 90, function(t) postPrice[g.id] = tonumber(t) end)
				input.AnchorPoint = Vector2.new(1, 0.5)
				input.Position = UDim2.new(1, -86, 0.5, 0)
				local post = mkButton(frame, "등록", COLORS.gold, UDim2.fromOffset(70, 34), function()
					call("MarketPost", { goodId = g.id, amount = qty, price = tonumber(input.Text) or 0 })
				end, true)
				post.AnchorPoint = Vector2.new(1, 0.5)
				post.Position = UDim2.new(1, -8, 0.5, 0)
				frame.Parent = content
				return frame
			end)
		end
	end

	-- 우편
	add(function() return mkHeader(content, "우편 (코인·쪽지 보내기)") end)
	add(function()
		local count = if mailBox then #mailBox else nil
		return mkRow(content, "내 우편함", if count then string.format("받을 우편 %d통", count) else "열어서 확인해요", {
			{ text = "열기", color = COLORS.blue, onClick = function() call("MailInbox", {}) end },
			{ text = "받기", color = COLORS.green, onClick = function() call("MailClaim", {}) end },
		}, 56)
	end)
	add(function()
		local frame = Instance.new("Frame")
		frame.Size = UDim2.new(1, -6, 0, 86)
		frame.BackgroundColor3 = COLORS.row
		frame.BorderSizePixel = 0
		corner(frame, 8)
		local a = mkInput(frame, "받는 사람 이름", mailDraft.to, 150, function(t) mailDraft.to = t end)
		a.Position = UDim2.fromOffset(8, 6)
		local b = mkInput(frame, "코인", mailDraft.coins, 80, function(t) mailDraft.coins = t end)
		b.Position = UDim2.fromOffset(166, 6)
		local c = mkInput(frame, "한마디 (60자)", mailDraft.text, 240, function(t) mailDraft.text = t end)
		c.Position = UDim2.fromOffset(8, 46)
		local send = mkButton(frame, "보내기", COLORS.gold, UDim2.fromOffset(80, 34), function()
			call("MailSend", { to = a.Text, coins = tonumber(b.Text) or 0, text = c.Text })
		end, true)
		send.Position = UDim2.fromOffset(256, 46)
		frame.Parent = content
		return frame
	end)
end

function RENDERERS.route()
	local ship = view.ship
	if view.weather then
		add(function()
			local fc = ""
			if view.forecast and #view.forecast > 0 then
				local parts = {}
				for _, f in view.forecast do
					table.insert(parts, string.format("%d일 뒤 %s", f.inDays, f.name))
				end
				fc = "\n항해사의 예보: " .. table.concat(parts, " · ")
			end
			return mkLabel(content, string.format("오늘 날씨: %s (바람 x%.2f) — %s%s", view.weather.name, view.weather.wind, view.weather.hint, fc), 16, COLORS.gold, true)
		end)
		add(function()
			return mkRow(content, "하루 기다리기", "날씨가 나쁘면 하루 쉬었다 떠나요 (사기 +2)", {
				{ text = "대기", color = COLORS.blue, onClick = function() call("WaitDay", {}) end },
			}, 56)
		end)
	end
	add(function()
		return mkLabel(content, string.format("보급품 %d · 석탄 %d%s", ship.supplies, ship.coal, if ship.steam then " (증기선은 석탄을 태워요)" else ""), 13, COLORS.muted, false)
	end)
	for _, r in view.routes do
		add(function()
			local warn = ""
			if r.supplies > ship.supplies then
				warn = " ⚠ 보급품 부족"
			elseif ship.steam and r.coal == 0 then
				warn = " ⚠ 석탄 없음"
			end
			if r.locked then
				return mkRow(content, r.name, string.format("%s · 🔒 %s", r.region, r.locked), {
					{ text = "잠김", color = COLORS.grey, onClick = function() message = r.region .. " 해역은 " .. r.locked; messageOk = false; render() end },
				}, 56)
			end
			return mkRow(content, r.name, string.format("%s · %d일 · %d km · 보급품 %d%s%s", r.region, r.days, r.distanceKm, r.supplies, if r.coal > 0 then (" · 석탄 " .. r.coal) else "", warn), {
				{ text = "출항", color = COLORS.blue, onClick = function() confirmSail(r) end },
			}, 56)
		end)
	end
end

local function renderYard()
	local yard = view.shipyard
	add(function()
		return mkRow(content, "정비와 보급", string.format("수리 %d코인/1 · 선원 %d코인/명 · 보급품 %d코인/개", yard.repairCost, yard.hireCost, yard.supplyCost), {
			{ text = "수리", color = COLORS.green, onClick = function() call("Repair") end, enabled = yard.available },
			{ text = "선원+5", color = COLORS.blue, onClick = function() call("HireCrew", { amount = 5 }) end },
			{ text = "보급+20", color = COLORS.blue, onClick = function() call("BuySupplies", { amount = 20 }) end },
		}, 64)
	end)
	if not yard.available then
		add(function() return mkLabel(content, "이 항구에는 조선소가 없어서 배를 살 수 없어요. 수리도 조선소가 있는 항구에서만 할 수 있어요.", 13, COLORS.gold, false) end)
	end
	local rf = view.refit
	add(function()
		return mkRow(content, string.format("선단 · 호위함 %d/3척", view.fleet.escorts), string.format("고용 %d코인 · 명성 %d 필요\n포격 +8%%/척 · 속도 -3%%/척 · 유지비 15코인/척/일", view.fleet.price, view.fleet.needFame), {
			{ text = "고용", color = COLORS.blue, enabled = yard.available and view.fleet.escorts < 3, onClick = function() call("BuyEscort") end },
			{ text = "해산", color = COLORS.red, enabled = view.fleet.escorts > 0, onClick = function() call("DismissEscort") end },
		}, 84)
	end)
	-- 선단 편성: 기함 외에 실제 배를 최대 3척 거느린다
	add(function() return mkHeader(content, string.format("선단 편성 (기함 + %d/%d척)", #view.fleet.ships, view.fleet.max)) end)
	add(function()
		return mkLabel(content, string.format("화물칸이 더해져요(+%d) · 속도는 가장 느린 배에 맞춰져요(%d) · 해전에서 포와 선체가 보태져요 · 유지비 %d코인/척/일 · 다음 배는 명성 %d 필요", view.fleet.cargo, view.fleet.speed, view.fleet.upkeep, view.fleet.fameNeed), 12, COLORS.muted, false)
	end)
	for _, f in view.fleet.ships do
		add(function()
			return mkRow(content, string.format("%d번함 · %s", f.index, f.name), string.format("선체 %d/%d · 포 %d · 화물 %d · 속도 %d", f.hull, f.maxHull, f.cannons, f.cargo, f.speed), {
				{ text = "기함으로", color = COLORS.blue, onClick = function() call("SetFlagship", { index = f.index }) end },
				{ text = string.format("매각 %d", f.sell), color = COLORS.red, onClick = function() call("SellFleetShip", { index = f.index }) end },
			}, 72)
		end)
	end
	if #view.fleet.ships < view.fleet.max then
		for _, s in yard.ships do
			if not s.locked and s.price > 0 then
				add(function()
					return mkRow(content, string.format("선단에 추가: %s", s.name), string.format("포 %d · 화물 %d · 속도 %d · 선체 %d", s.cannons, s.cargo, s.speed, s.hull), {
						{ text = tostring(s.price), color = COLORS.green, enabled = yard.available, onClick = function() call("BuyFleetShip", { shipId = s.id }) end },
					}, 56)
				end)
			end
		end
	end
	add(function() return mkHeader(content, string.format("개조 (우리 배: 등급 %d · %s)", rf.class, rf.className)) end)
	add(function()
		return mkLabel(content, "새 배를 사면 대포와 보강은 초기화돼요. 대포가 무거울수록 화물칸이 줄어요.", 12, COLORS.muted, false)
	end)
	for _, c in rf.cannons do
		add(function()
			local sub = string.format("%s\n위력 +%d%% · 무게 화물 -%d%%", c.summary, math.floor(c.mult * 100 + 0.5), math.floor(c.weight * 100 + 0.5))
			if c.locked then
				sub ..= "\n" .. c.locked
			end
			local crow = mkRow(content, c.name, sub, {
				{ text = if c.owned then "장착중" else (if c.price == 0 then "기본" else tostring(c.price)), color = COLORS.steam, onClick = function() call("BuyCannon", { cannonId = c.id }) end,
					enabled = yard.available and not c.owned and not c.locked },
			}, 80)
			withIcon(crow, "Naval", if c.id == "basic" then "cannon" else "cannon-mobile", if c.id == "steam_gun" then Color3.fromRGB(150, 110, 70) else nil, 56)
			return crow
		end)
	end
	if rf.nextPlating then
		local np = rf.nextPlating
		add(function()
			local sub = string.format("선체 +%d%% · 무게 화물 -%d%% (현재 %d단계)", math.floor(np.hull * 100 + 0.5), math.floor(np.weight * 100 + 0.5), rf.plating)
			if np.locked then
				sub ..= "\n" .. np.locked
			end
			return mkRow(content, "선체 보강: " .. np.name, sub, {
				{ text = tostring(np.price), color = COLORS.green, onClick = function() call("BuyPlating", {}) end, enabled = yard.available and not np.locked },
			}, 70)
		end)
	end
	add(function() return mkHeader(content, "배 목록") end)
	local maxCargo, maxSpeed, maxHull = 1, 1, 1
	for _, s in yard.ships do
		maxCargo, maxSpeed, maxHull = math.max(maxCargo, s.cargo), math.max(maxSpeed, s.speed), math.max(maxHull, s.hull)
	end
	for _, s in yard.ships do
		add(function()
			local sub = string.format("%s\n포 %d · 선원 %d", s.summary, s.cannons, s.crew)
			if s.locked then
				sub ..= "\n" .. s.locked
			end
			local label = if s.owned then "보유중" else (if s.price == 0 then "기본" else tostring(s.price))
			local row = mkRow(content, string.format("[등급%d] ", s.class) .. s.name .. (if s.steam then " (증기)" else ""), sub, {
				{ text = label, color = if s.steam then COLORS.steam else COLORS.blue, onClick = function() call("BuyShip", { shipId = s.id }) end,
					enabled = yard.available and not s.owned and not s.locked },
			}, 128)
			local si = SHIP_ICON[s.id]
			if si then
				withIcon(row, si[1], si[2], si[3], 72)
			end
			-- 성능 막대: 화물·속도·선체를 한눈에 비교
			local stats = { { "화물", s.cargo, maxCargo, COLORS.gold }, { "속도", s.speed, maxSpeed, COLORS.blue }, { "선체", s.hull, maxHull, COLORS.green } }
			for i, st in stats do
				local y = 76 + (i - 1) * 16
				local lb = mkLabel(row, string.format("%s %d", st[1], st[2]), 11, COLORS.muted, false)
				lb.Position = UDim2.fromOffset(88, y - 2)
				lb.Size = UDim2.fromOffset(70, 14)
				lb.AutomaticSize = Enum.AutomaticSize.None
				local back = Instance.new("Frame")
				back.BackgroundColor3 = Color3.fromRGB(8, 14, 22)
				back.BorderSizePixel = 0
				back.Position = UDim2.new(0, 162, 0, y)
				back.Size = UDim2.new(1, -250, 0, 8)
				back.Parent = row
				corner(back, 4)
				local fill = Instance.new("Frame")
				fill.BackgroundColor3 = st[4]
				fill.BorderSizePixel = 0
				fill.Size = UDim2.fromScale(math.clamp(st[2] / st[3], 0.03, 1), 1)
				fill.Parent = back
				corner(fill, 4)
			end
			return row
		end)
	end
end


-- 조선소 별도 화면: 조선 장인과 마주 보고 정비·보급·배 구입·개조를 한다 (기존 조선소 목록을 큰 화면에 그대로 쓴다)
local function openYardHall()
	Sfx.play("sfx_creak")
	closeTradeHall()
	local layer = overlayGui("TradeHallGui", 15)
	main.Visible = false
	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = COLORS.cover
	root.BorderSizePixel = 0
	root.Parent = layer
	local scroll = Instance.new("ScrollingFrame")
	scroll.Position = UDim2.fromOffset(258, 62)
	scroll.Size = UDim2.new(1, -266, 1, -70)
	scroll.BackgroundTransparency = 1
	scroll.BorderSizePixel = 0
	scroll.ScrollBarThickness = 6
	scroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
	scroll.CanvasSize = UDim2.new()
	scroll.Parent = root
	local sl = Instance.new("UIListLayout")
	sl.Padding = UDim.new(0, 8)
	sl.SortOrder = Enum.SortOrder.LayoutOrder
	sl.Parent = scroll
	local lastScroll = 0

	local function build()
		if not layer.Parent or not view then
			return
		end
		lastScroll = scroll.CanvasPosition.Y
		for _, c in root:GetChildren() do
			if c ~= scroll then
				c:Destroy()
			end
		end
		for _, c in scroll:GetChildren() do
			if not c:IsA("UIListLayout") then
				c:Destroy()
			end
		end
		local p, ship = view.player, view.ship
		local top = mkBox(root, UDim2.fromOffset(0, 0), UDim2.new(1, 0, 0, 54), Color3.fromRGB(40, 50, 62))
		local title = mkLabel(top, string.format("조선소 · %s", p.portName), 24, COLORS.gold, true)
		title.Position = UDim2.fromOffset(18, 12)
		title.Size = UDim2.fromOffset(420, 30)
		title.AutomaticSize = Enum.AutomaticSize.None
		local hold = mkLabel(top, string.format("코인 %d    %s 선체 %d/%d", p.coins, ship.name, ship.hull, ship.maxHull), 20, COLORS.text, true)
		hold.AnchorPoint = Vector2.new(1, 0)
		hold.Position = UDim2.new(1, -140, 0, 14)
		hold.Size = UDim2.fromOffset(520, 28)
		hold.AutomaticSize = Enum.AutomaticSize.None
		hold.TextXAlignment = Enum.TextXAlignment.Right
		local leave = mkButton(top, "나가기", COLORS.red, UDim2.fromOffset(110, 38), closeTradeHall, true)
		leave.AnchorPoint = Vector2.new(1, 0.5)
		leave.Position = UDim2.new(1, -12, 0.5, 0)
		leave.TextSize = 18

		local left = mkBox(root, UDim2.fromOffset(0, 54), UDim2.new(0, 250, 1, -54), Color3.fromRGB(32, 40, 50))
		local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
		local tpl = lib and lib:FindFirstChild("People") and lib.People:FindFirstChild(storyPortraitModel("조선 장인", p.portId or ""))
		local yardImageId = FACILITY_ATLAS or PORTRAIT_ATLAS
		if yardImageId then
			local photo = Instance.new("ImageLabel")
			photo.Name = "ShipwrightPortrait"
			photo.Size = UDim2.new(1, 0, 1, -150)
			photo.BackgroundTransparency = 1
			photo.BorderSizePixel = 0
			photo.ScaleType = Enum.ScaleType.Crop
			photo.Image = "rbxassetid://" .. tostring(yardImageId)
			photo.ImageRectOffset = if FACILITY_ATLAS then FACILITY_TILE.yard else PORTRAIT_TILE.yard
			photo.ImageRectSize = PORTRAIT_SIZE
			photo.Parent = left
		else
			local vf = Instance.new("ViewportFrame")
			vf.BackgroundTransparency = 1
			vf.Size = UDim2.new(1, 0, 1, -150)
			vf.Ambient = Color3.fromRGB(170, 170, 178)
			vf.LightColor = Color3.fromRGB(255, 236, 205)
			vf.LightDirection = Vector3.new(-0.6, -0.8, -1).Unit
			vf.Parent = left
			local cam = Instance.new("Camera")
			cam.FieldOfView = 40
			cam.Parent = vf
			vf.CurrentCamera = cam
			local world = Instance.new("WorldModel")
			world.Parent = vf
			local m = portraitPerson(world, "yard" .. (p.portId or ""), "Knight", tpl)
			if not m then
				vf:Destroy()
			end
			local cf, size = CFrame.new(), Vector3.new(4, 6, 2)
			if m then
				cf, size = m:GetBoundingBox()
			end
			local focus = cf.Position + Vector3.new(0, size.Y * 0.1, 0)
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.25, 0.08, -1).Unit * (math.max(size.X, size.Y, size.Z) * 1.7), focus)
		end
		local bubble = mkBox(left, UDim2.new(0, 10, 1, -146), UDim2.new(1, -20, 0, 136), Color3.fromRGB(240, 228, 200))
		corner(bubble, 12)
		local say = (message ~= "" and message) or "어서 오게. 배는 뱃사람의 목숨이지. 손볼 데가 있나?"
		local sayL = mkLabel(bubble, say, 16, Color3.fromRGB(50, 36, 24), true)
		sayL.Position = UDim2.fromOffset(10, 8)
		sayL.Size = UDim2.new(1, -20, 1, -16)
		sayL.AutomaticSize = Enum.AutomaticSize.None
		sayL.TextWrapped = true
		sayL.TextYAlignment = Enum.TextYAlignment.Top

		-- 기존 조선소 화면 내용을 이 스크롤 영역에 그린다
		local saved = content
		content = scroll
		local ok, err = pcall(renderYard)
		content = saved
		if not ok then
			warn("[Game] 조선소 화면 오류", err)
		end
		scroll.CanvasPosition = Vector2.new(0, lastScroll)
	end
	tradeHallRefresh = build
	build()
end

function H.startField(s)
	if inField then
		return
	end
	inField = true
	main.Visible = false
	FieldScene.start({
		name = s.name,
		nodes = math.clamp(s.days, 1, 3),
		danger = s.minLevel,
		seed = #s.id * 31 + s.days,
		onFinish = function(result)
			inField = false
			applyView()
			main.Visible = true
			if result == "clear" then
				call("Explore", { siteId = s.id })
			else
				message = if result == "defeat" then "산적에게 쫓겨 탐험을 접었어요" else "탐험을 중단하고 항구로 돌아왔어요"
				messageOk = false
				render()
			end
		end,
	})
end

function RENDERERS.explore()
	-- 지상 전술 탐험: 격자 맵 턴제 전투. 서버가 전투를 만들어 주면 전술 화면을 연다.
	local function openTactics()
		if inField or not (view and view.tactics) then
			return
		end
		inField = true
		main.Visible = false
		require(Shared:WaitForChild("TacticsView")).open({
			battle = view.tactics,
			invoke = function(action, payload)
				return call(action, payload)
			end,
			onClose = function()
				inField = false
				applyView()
				main.Visible = true
				render()
			end,
		})
	end

	local function startTactics(s)
		local result = call("TacticsStart", { siteId = s.id })
		if result and result.ok and view and view.tactics then
			openTactics()
		end
	end
	add(function() return mkHeader(content, "탐험 지점") end)
	if view.tactics and view.tactics.status == "active" then
		add(function()
			return mkRow(content, "진행 중인 전술 탐험", view.tactics.siteName .. " · " .. view.tactics.name, {
				{ text = "이어하기", color = COLORS.gold, onClick = openTactics, enabled = true },
			}, 54)
		end)
	end
	if #view.sites == 0 then
		add(function() return mkLabel(content, "이 항구 근처에는 탐험 지점이 없어요.", 13, COLORS.muted, false) end)
	end
	for _, s in view.sites do
		add(function()
			local sub = if s.left == 0 then "모두 조사했어요" else string.format("발견 가능 %d · %d일 · 모험 Lv.%d 이상", s.left, s.days, s.minLevel)
			local actions = {
				{ text = "탐험", color = COLORS.green, onClick = function() H.startField(s) end, enabled = s.unlocked and s.left > 0 },
			}
			if s.tactics then
				sub = sub .. string.format(" · 전술 맵 ‘%s’%s", s.tactics.mapName, if s.tactics.rank ~= "" then " (최고 " .. s.tactics.rank .. ")" else "")
				table.insert(actions, { text = "전술", color = COLORS.blue, onClick = function() startTactics(s) end, enabled = s.unlocked and s.left > 0 and not (view.tactics and view.tactics.status == "active") })
			end
			return mkRow(content, s.name, sub, actions, 54)
		end)
	end
	add(function() return mkHeader(content, "이 항구의 학자") end)
	if #view.scholars == 0 then
		add(function() return mkLabel(content, "지금 이 항구에는 학자가 없어요.", 13, COLORS.muted, false) end)
	end
	for _, sc in view.scholars do
		add(function()
			local sub = if sc.status == "ready" then "만날 수 있어요" elseif sc.status == "met" then "지식을 전수받았어요" else sc.status
			local srow = mkRow(content, sc.name, sub, {
				{ text = "방문", color = COLORS.gold, onClick = function() call("Visit", { scholarId = sc.id }) end, enabled = sc.status == "ready" },
					{ text = if (sc.reportable or 0) > 0 then string.format("보고 (%d)", sc.reportable) else "보고", color = COLORS.green, onClick = function() call("ReportKnowledge", { scholarId = sc.id }) end, enabled = (sc.reportable or 0) > 0 },
				}, 60)
			-- 실존 학자의 퍼블릭 도메인 초상(자동 수집·등록된 것만)
			if AssetIds["Portraits/scholar_" .. sc.id] then
				withIcon(srow, "Portraits", "scholar_" .. sc.id, nil, 50)
			end
						return srow
					end)
				end
				local ac = view.knowledge and view.knowledge.academy
				if ac and #ac.disciplines > 0 then
					add(function() return mkHeader(content, string.format("학술 행사 · 이 항구의 연구 성과 %d%%", ac.research)) end)
					add(function()
						return mkLabel(content, string.format("이 항구의 학문: %s. 항구에 투자할수록 학자들의 연구가 늘어 관련 교역품이 싸져요 (교역소 %d단계). 지금까지 발표 %d회 · 박람회 %d회.", table.concat(ac.disciplines, ", "), ac.harborLevel, ac.presented, ac.expos), 12, COLORS.muted, false)
					end)
					for _, pr in ac.present do
						add(function()
							local sub = string.format("이해한 지식 %d개 (%d개 이상 필요)%s", pr.understood, ac.presentMin, if pr.wait > 0 then string.format(" · %d일 뒤 가능", pr.wait) else "")
							return mkRow(content, "학회 발표 — " .. pr.name, sub, {
								{ text = "발표", color = COLORS.gold, onClick = function() call("Present", { disc = pr.disc }) end, enabled = pr.understood >= ac.presentMin and pr.wait == 0 },
							}, 56)
						end)
						if pr.jointScholar then
							add(function()
								local sub = string.format("%s 학자와 함께 · 기술 %d단계 (%d점%s) · 이해한 지식, 관련 교역품 기증, 퀘스트가 기여로 인정%s", pr.jointScholar, pr.techLevel, pr.techPoints, if pr.techNext then "/" .. pr.techNext else " 최고", if pr.jointWait > 0 then string.format(" · %d일 뒤 가능", pr.jointWait) else "")
								return mkRow(content, "공동 발표 — " .. pr.name, sub, {
									{ text = "함께 발표", color = COLORS.gold, onClick = function() call("JointPresent", { disc = pr.disc }) end, enabled = pr.understood >= 1 and pr.jointWait == 0 },
								}, 64)
							end)
						end
					end
					for _, lr in ac.launch do
						add(function()
							local sub = string.format("개량 +%d%% · 싣고 있는 %d개 (%d개 필요)%s", lr.up, lr.have, lr.need, if not lr.open then " · 교역소 3단계 이상" elseif lr.wait > 0 then string.format(" · %d일 뒤 가능", lr.wait) else "")
							return mkRow(content, "신제품 출시 — " .. lr.name .. " ✦", sub, {
								{ text = "출시", color = COLORS.gold, onClick = function() call("Launch", { goodId = lr.goodId }) end, enabled = lr.open and lr.wait == 0 and lr.have >= lr.need },
							}, 56)
						end)
					end
					for _, b in ac.buildings do
						add(function()
							local sub = if b.built then b.summary .. " (건축 완료)" else string.format("%s · 건축비 %d코인%s", b.summary, b.cost, if b.can then "" else " · " .. tostring(b.why))
							return mkRow(content, "특수 건축물 — " .. b.name, sub, {
								{ text = if b.built then "완료" else "건축", color = COLORS.gold, onClick = function() call("BuildLandmark", { id = b.id }) end, enabled = b.can },
							}, 64)
						end)
					end
					add(function()
					local pv = ac.expoPreview
					local sub = if not ac.expoOpen then "교역소 2단계 이상에서 열려요" elseif ac.expoWait > 0 then string.format("%d일 뒤 열려요", ac.expoWait) else string.format("발견한 동물·식물·광물·화석·유물 중 가치 높은 %d점 + 개량 교역품(✦). 수상 %d회", ac.expoSlots, ac.medals)
					if pv and ac.expoOpen and ac.expoWait == 0 then
						sub ..= string.format("\n예상 점수 표본 %d · 박제 %d(-%d코인) · 생체 %d(-%d코인)", pv.specimen.score, pv.taxidermy.score, pv.taxidermy.fee, pv.live.score, pv.live.fee)
					end
					local can = ac.expoOpen and ac.expoWait == 0
					return mkRow(content, "박람회 출품", sub, {
						{ text = "표본", color = COLORS.green, onClick = function() call("Expo", { form = "specimen" }) end, enabled = can },
						{ text = "박제", color = COLORS.gold, onClick = function() call("Expo", { form = "taxidermy" }) end, enabled = can },
						{ text = "생체", color = COLORS.blue, onClick = function() call("Expo", { form = "live" }) end, enabled = can },
					}, 72)
					end)
				end
			end

local RARITY_COLOR = {
	Common = COLORS.muted, Uncommon = COLORS.green, Rare = COLORS.blue, Epic = Color3.fromRGB(170, 110, 210), Legendary = COLORS.gold,
}
local RARITY_NAMES = { Common = "일반", Uncommon = "고급", Rare = "희귀", Epic = "영웅", Legendary = "전설" }
local codexField = nil -- nil이면 분야 목록, 값이 있으면 그 분야의 카드 화면

local function fieldColor(f)
	return Color3.fromRGB(f.color[1], f.color[2], f.color[3])
end

local function findField(id)
	for _, f in view.codex.fields do
		if f.id == id then
			return f
		end
	end
	return nil
end

-- 카드 그림: 등록된 이미지가 표시될 때까지 분야 색과 이름을 보여준다.
local function paintCardArt(parent, card, fieldDef, fitImage)
	parent.ClipsDescendants = true
	local base = if card.found then fieldColor(fieldDef) else Color3.fromRGB(46, 52, 64)
	parent.BackgroundColor3 = base
	local shade = Instance.new("UIGradient")
	shade.Color = ColorSequence.new(base:Lerp(Color3.new(1, 1, 1), 0.25), base:Lerp(Color3.new(0, 0, 0), 0.45))
	shade.Rotation = 90
	shade.Parent = parent
	local mark = Instance.new("TextLabel")
	mark.BackgroundTransparency = 1
	mark.Size = UDim2.fromScale(1, 1)
	mark.Font = Enum.Font.GothamBold
	mark.TextScaled = true
	mark.TextTransparency = 0.35
	mark.TextColor3 = Color3.new(1, 1, 1)
	mark.Text = if card.found then fieldDef.name else "?"
	local pad = Instance.new("UIPadding")
	pad.PaddingTop, pad.PaddingBottom = UDim.new(0.2, 0), UDim.new(0.2, 0)
	pad.Parent = mark
	pad.PaddingLeft, pad.PaddingRight = UDim.new(0.08, 0), UDim.new(0.08, 0)
	mark.Parent = parent
	if card.found and type(card.image) == "string" and card.image ~= "" then
		local img = Instance.new("ImageLabel")
		img.Size = UDim2.fromScale(1, 1)
		img.BackgroundTransparency = 1
		img.ScaleType = if fitImage then Enum.ScaleType.Fit else Enum.ScaleType.Crop
		img.Image = card.image
		img.Parent = parent
		img:GetPropertyChangedSignal("IsLoaded"):Connect(function()
			mark.Visible = not img.IsLoaded
		end)
		mark.Visible = not img.IsLoaded
	end
end

function H.combatCardImage(unit)
	local artKey = if unit.special == "scorch" then "event_harbor_fire"
		elseif unit.special == "weather" then "event_storm" else "event_calm_seas"
	return "rbxassetid://" .. AssetIds["CardArt/" .. artKey]
end

function H.codexCardTile(grid, card, field, badge, tint, onClick)
	local tile = Instance.new("TextButton")
	tile.AutoButtonColor = false
	tile.Text = ""
	tile.BackgroundColor3 = COLORS.row
	tile.BorderSizePixel = 0
	corner(tile, 8)
	local stroke = Instance.new("UIStroke")
	stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	stroke.Thickness = 2
	stroke.Color = tint
	stroke.Parent = tile

	local art = Instance.new("Frame")
	art.Position = UDim2.fromOffset(5, 5)
	art.Size = UDim2.new(1, -10, 1, -46)
	corner(art, 5)
	art.Parent = tile
	paintCardArt(art, card, field)
	local name = mkLabel(tile, card.name, 13, if card.found then COLORS.text else COLORS.muted, true)
	name.AutomaticSize = Enum.AutomaticSize.None
	name.Position = UDim2.new(0, 5, 1, -40)
	name.Size = UDim2.new(1, -10, 0, 24)
	name.TextScaled = true
	name.TextXAlignment = Enum.TextXAlignment.Center
	name.TextYAlignment = Enum.TextYAlignment.Center
	local size = Instance.new("UITextSizeConstraint")
	size.MaxTextSize = 13
	size.Parent = name
	local rank = mkLabel(tile, badge, 11, tint, true)
	rank.AutomaticSize = Enum.AutomaticSize.None
	rank.Position = UDim2.new(0, 5, 1, -16)
	rank.Size = UDim2.new(1, -10, 0, 14)
	rank.TextXAlignment = Enum.TextXAlignment.Center
	tile.Activated:Connect(onClick)
	tile.Parent = grid
	return tile
end

function H.showCardDetail(card)
	local fieldDef = if card.combat then { name = "접현 전투 카드", color = { 70, 92, 96 } } else findField(card.field)
	local article = if card.found then require(Shared:WaitForChild("KnowledgeCards")).Articles[card.id] else nil
	local tweens = game:GetService("TweenService")
	local paper, ink, brown = COLORS.paper, COLORS.ink, COLORS.brown
	local overlay = Instance.new("TextButton")
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.BackgroundColor3 = Color3.new(0, 0, 0)
	overlay.BackgroundTransparency = 1
	overlay.Text = ""
	overlay.AutoButtonColor = false
	overlay.ZIndex = 40
	local layer = overlayGui("Overlay", 60)
	overlay.Parent = layer
	overlay.Destroying:Connect(function() task.defer(function() layer:Destroy() end) end)

	local box = Instance.new("Frame")
	box.AnchorPoint = Vector2.new(0.5, 0.5)
	box.Position = UDim2.fromScale(0.5, 0.5)
	box.Size = UDim2.fromScale(0.18, 0.94)
	box.BackgroundColor3 = brown
	box.BorderSizePixel = 0
	box.ClipsDescendants = true
	box.ZIndex = 41
	local bounds = Instance.new("UISizeConstraint")
	bounds.MaxSize = Vector2.new(920, 960)
	bounds.Parent = box
	corner(box, 8)
	box.Parent = overlay

	local body = Instance.new("ScrollingFrame")
	body.Position = UDim2.fromOffset(8, 8)
	body.Size = UDim2.new(1, -16, 1, -62)
	body.BackgroundColor3 = paper
	body.BorderSizePixel = 0
	body.CanvasSize = UDim2.new()
	body.AutomaticCanvasSize = Enum.AutomaticSize.Y
	body.ScrollingDirection = Enum.ScrollingDirection.Y
	body.ScrollBarThickness = 4
	body.ScrollBarImageColor3 = brown
	body.ZIndex = 42
	body.Parent = box
	local margin = Instance.new("UIPadding")
	margin.PaddingTop = UDim.new(0, 14)
	margin.PaddingBottom = UDim.new(0, 14)
	margin.PaddingLeft = UDim.new(0, 14)
	margin.PaddingRight = UDim.new(0, 10)
	margin.Parent = body
	local lay = Instance.new("UIListLayout")
	lay.Padding = UDim.new(0, 7)
	lay.SortOrder = Enum.SortOrder.LayoutOrder
	lay.Parent = body

	local rarity = RARITY_NAMES[card.rarity] or card.rarity
	mkLabel(body, fieldDef.name .. "  ·  " .. rarity, 13, brown, true, 1)
	mkLabel(body, card.name, 25, ink, true, 2)
	local art = Instance.new("Frame")
	art.LayoutOrder = 3
	local camera = workspace.CurrentCamera
	local viewportHeight = if camera then camera.ViewportSize.Y else 600
	art.Size = UDim2.new(1, -8, 0, math.clamp(math.floor(viewportHeight * 0.43), 140, 410))
	local artBorder = Instance.new("UIStroke")
	artBorder.Color = brown
	artBorder.Parent = art
	corner(art, 5)
	art.Parent = body
	paintCardArt(art, card, fieldDef, true)

	mkLabel(body, card.description, 16, ink, false, 4)
	if card.combat then
		mkLabel(body, "전투에서 하는 일", 16, brown, true, 5)
		mkLabel(body, card.combat.effect, 15, ink, false, 6)
		if card.combat.origin then
			mkLabel(body, "연결된 카드  " .. card.combat.origin, 13, brown, false, 7)
		end
	elseif card.found then
		if article then
			mkLabel(body, "특징과 원리", 16, brown, true, 5)
			mkLabel(body, article.details, 15, ink, false, 6)
			mkLabel(body, "쓰임과 배경", 16, brown, true, 7)
			mkLabel(body, article.context, 15, ink, false, 8)
		end
		mkLabel(body, "게임 속 발견 기록", 16, brown, true, 9)
		mkLabel(body, string.format("발견 방법  %s\n등록 보상  %d코인 · 명성 +%d", card.source, card.coins, card.fame), 13, ink, false, 10)
		if article then
			local topic = article.topic:gsub("_", " "):gsub("%%27", "'")
			mkLabel(body, "본문 참고  위키백과 · " .. topic, 12, brown, false, 11)
		end
		if card.credit then
			mkLabel(body, "삽화 출처  " .. card.credit, 11, brown, false, 12)
		end
	else
		mkLabel(body, "발견하면 이 항목의 삽화와 해설을 읽을 수 있어요.", 13, brown, false, 5)
	end

	local replayScene = require(Shared:WaitForChild("WonderScenes")).Scenes[card.id]
	if not card.combat and card.found and replayScene then
		local replay = mkButton(body, "원더 연출 다시 보기", COLORS.blue, UDim2.new(1, -8, 0, 40), function()
			overlay:Destroy()
			H.playWonderScene(card.id)
		end, true)
		replay.LayoutOrder = 13
	end
	for _, child in body:GetDescendants() do
		if child:IsA("GuiObject") then
			child.ZIndex = 43
		end
	end
	local close = mkButton(box, "책 덮기", COLORS.gold, UDim2.new(1, -16, 0, 42), function()
		overlay:Destroy()
	end, true)
	close.AnchorPoint = Vector2.new(0.5, 1)
	close.Position = UDim2.new(0.5, 0, 1, -7)
	close.ZIndex = 43
	overlay.Activated:Connect(function()
		overlay:Destroy()
	end)

	-- 책등 폭에서 펼쳐지며 종이 위로 접힌 면의 그림자가 스쳐 간다.
	local fold = Instance.new("Frame")
	fold.Size = UDim2.fromScale(1, 1)
	fold.BackgroundColor3 = brown
	fold.BorderSizePixel = 0
	fold.ZIndex = 44
	fold.Parent = box
	local foldGradient = Instance.new("UIGradient")
	foldGradient.Transparency = NumberSequence.new(0.16, 1)
	foldGradient.Parent = fold
	tweens:Create(overlay, TweenInfo.new(0.22), { BackgroundTransparency = 0.44 }):Play()
	tweens:Create(box, TweenInfo.new(0.32, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), { Size = UDim2.fromScale(0.97, 0.95) }):Play()
	local reveal = tweens:Create(fold, TweenInfo.new(0.36, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Position = UDim2.fromScale(1, 0), BackgroundTransparency = 1,
	})
	reveal.Completed:Once(function() fold:Destroy() end)
	reveal:Play()
end

function H.showCombatCard(unit, origin, skill)
	local BC = require(Shared:WaitForChild("BoardingCards"))
	local effects = {
		bond = "같은 이름의 결속 카드가 같은 줄에 모이면 위력이 커져요.",
		morale = "같은 줄의 다른 아군 카드에 위력 1을 더해요.",
		spy = "적군 줄에 배치하고 내 손패에 카드 두 장을 뽑아요.",
		medic = "버린 일반 카드 가운데 위력이 가장 높은 카드를 되살려요.",
	}
	local effect = unit.text or effects[unit.ability] or "지정된 병종 줄에 배치해 전투력을 더해요."
	if unit.hero then
		effect ..= "\n영웅은 날씨와 소각의 영향을 받지 않아요."
	end
	if skill then
		effect ..= "\n" .. skill.name .. " · " .. skill.text
	end
	H.showCardDetail({
		id = unit.id,
		name = unit.name,
		found = true,
		rarity = if unit.special then "특수" elseif unit.hero then "영웅" else "병종",
		description = if unit.special then "접현전에서 즉시 효과를 내는 카드예요."
			else string.format("%s 줄  ·  기본 전투력 %d", BC.ROW_NAME[unit.row], unit.power),
		image = H.combatCardImage(unit),
		combat = { effect = effect, origin = origin },
	})
end

local function tierRows(list: { any }, scope: string, labelFmt: string)
	for _, t in list do
		add(function()
			local sub = string.format("%d개 이상 · +%d코인 · 명성 +%d", t.need, t.coins, t.fame)
			if t.title then
				sub ..= " · 칭호 '" .. t.title .. "'"
			end
			return mkRow(content, string.format(labelFmt, t.pct), sub, {
				{
					text = if t.claimed then "받음" else "받기",
					color = if t.claimed then COLORS.grey else COLORS.gold,
					enabled = t.claimable,
					onClick = function() call("ClaimCollection", { scope = scope, tier = t.tier }) end,
				},
			}, 52)
		end)
	end
end

local function renderCodexOverview()
	local cx = view.codex
	add(function()
		local cover = Instance.new("Frame")
		cover.Size = UDim2.new(1, -6, 0, 126)
		cover.BackgroundColor3 = COLORS.paper
		cover.BorderSizePixel = 0
		cover.ClipsDescendants = true
		corner(cover, 8)
		local illustration = Instance.new("ImageLabel")
		illustration.BackgroundTransparency = 1
		illustration.Size = UDim2.fromScale(0.35, 1)
		illustration.Image = "rbxassetid://" .. AssetIds["CardArt/event_calm_seas"]
		illustration.ScaleType = Enum.ScaleType.Crop
		illustration.Parent = cover
		pageRule(cover, UDim2.fromScale(0.35, 0), UDim2.new(0, 2, 1, 0))
		local title = mkLabel(cover, "세계 백과", 23, COLORS.ink, true)
		title.Position = UDim2.new(0.35, 13, 0, 13)
		title.Size = UDim2.new(0.65, -22, 0, 30)
		title.AutomaticSize = Enum.AutomaticSize.None
		local status = mkLabel(cover, string.format("발견 %d / %d", cx.found, cx.total), 15, COLORS.brown, true)
		status.Position = UDim2.new(0.35, 13, 0, 51)
		status.Size = UDim2.new(0.65, -22, 0, 22)
		status.AutomaticSize = Enum.AutomaticSize.None
		local track = pageRule(cover, UDim2.new(0.35, 13, 0, 81), UDim2.new(0.65, -26, 0, 4))
		local fill = pageRule(track, UDim2.fromOffset(0, 0), UDim2.fromScale(math.clamp(cx.found / math.max(1, cx.total), 0, 1), 1))
		fill.BackgroundColor3 = COLORS.brown
		fill.BackgroundTransparency = 0
		if cx.rank then
			local rank = mkLabel(cover, cx.rank, 12, COLORS.ink, false)
			rank.Position = UDim2.new(0.35, 13, 0, 93)
			rank.Size = UDim2.new(0.65, -22, 0, 22)
			rank.AutomaticSize = Enum.AutomaticSize.None
		end
		return cover
	end)

	add(function()
		local row = mkRow(content, "접현 전투 카드", "병종·영웅·특수 카드의 위력과 효과", {
			{ text = "열기", color = COLORS.blue, onClick = function() codexField = "boarding"; render() end },
		}, 60)
		withIcon(row, "Menu", "battle", nil, 44)
		return row
	end)
	local samples = {}
	for _, card in cx.cards do
		if card.found and card.image and card.image ~= "" and not samples[card.field] then
			samples[card.field] = card
		end
	end
	for _, f in cx.fields do
		add(function()
			local claimable = 0
			for _, t in f.tiers do
				if t.claimable then
					claimable += 1
				end
			end
			local row = mkRow(content, string.format("%s  %d / %d%s", f.name, f.found, f.total, if claimable > 0 then "  ★보상" else ""), f.summary, {
				{ text = "열기", color = fieldColor(f), onClick = function() codexField = f.id; render() end },
			}, 64)
			row.AccentBar.BackgroundColor3 = fieldColor(f)
			if samples[f.id] then
				local old = row:FindFirstChild("RowIcon")
				if old then old:Destroy() end
				local art = Instance.new("Frame")
				art.Position = UDim2.fromOffset(8, 6)
				art.Size = UDim2.fromOffset(52, 48)
				corner(art, 5)
				art.Parent = row
				paintCardArt(art, samples[f.id], f)
				local box = row.RowText
				local delta = 68 - box.Position.X.Offset
				box.Position = UDim2.fromOffset(68, box.Position.Y.Offset)
				box.Size = UDim2.new(1, box.Size.X.Offset - delta, 1, -8)
			end
			local barBack = Instance.new("Frame")
			barBack.AnchorPoint = Vector2.new(0, 1)
			barBack.Position = UDim2.new(0, 8, 1, -3)
			barBack.Size = UDim2.new(1, -90, 0, 4)
			barBack.BackgroundColor3 = COLORS.grey
			barBack.BorderSizePixel = 0
			barBack.Parent = row
			local bar = Instance.new("Frame")
			bar.Size = UDim2.fromScale(f.found / math.max(1, f.total), 1)
			bar.BackgroundColor3 = fieldColor(f)
			bar.BorderSizePixel = 0
			bar.Parent = barBack
			return row
		end)
	end
	add(function() return mkHeader(content, "지식 트리 (발견 → 보고 → 이해 → 효과)") end)
	add(function()
		return mkLabel(content, "발견한 카드를 이 항구의 학자에게 보고하면 이해한 지식이 돼요. 선행 지식을 이해해야 다음 지식을 보고할 수 있고, 이해한 지식은 항해 속도·포격·교역품 값에 효과를 줘요.", 12, COLORS.muted, false)
	end)
	if view.knowledge and view.knowledge.era then
		local er = view.knowledge.era
		add(function() return mkHeader(content, string.format("인류의 시대 — %s", er.name)) end)
		add(function()
			local nxt = if er.nextName then string.format(" 다음 시대(%s)까지 이해한 지식 %d/%d개.", er.nextName, er.count, er.nextNeed) else " 마지막 시대에 이르렀어요."
			return mkLabel(content, er.story .. nxt .. " 시대가 오를수록 항해와 항구 연구가 조금씩 좋아져요.", 12, COLORS.muted, false)
		end)
	end
	if view.pace then
		local pc = view.pace
		add(function() return mkHeader(content, "역사의 속도") end)
		add(function()
			return mkLabel(content, string.format("건물과 기술 사건은 시대순으로 열려요. 일찍 발견하고 보고하고, 학회·박람회·공동 발표를 하고, 어려운 퀘스트를 해내면 역사가 앞당겨져요. 지금 %.1f년 앞섬 (최대 %d년) · 이번 %d일 동안 앞당길 수 있는 양 %d/%d일. 앞서 갈수록, 짧은 기간에 몰아칠수록 덜 쌓여요.", pc.years, math.floor(pc.capDays / 365), pc.windowDays, pc.windowLeft, pc.windowCap), 12, COLORS.muted, false)
		end)
	end
	if view.people then
		local PEOPLE_CAT_RELIC = { ruler = "shield-round", explorer = "map-rolled", military = "weapon-spear", science = "magnifying-glass", inventor = "hammer", thought = "journal-open",
			art = "chisel", letters = "journal-closed", merchant = "coin", pirate = "weapon-sword", faith = "lantern" }
		local pv = view.people
		add(function() return mkHeader(content, string.format("인물 백과 (기록 %d / %d명)", pv.known, pv.total)) end)
		add(function() return mkLabel(content, "항구를 찾아가거나 학자를 만나거나 역사 사건을 겪으면 그 시대의 인물이 백과에 기록돼요. 분야를 열어 보세요.", 12, COLORS.muted, false) end)
		for _, t in pv.tiers do
			add(function()
				local label = string.format("%d명 기록 보상: %d코인 · 명성 %d", t.need, t.coins, t.fame)
				return mkRow(content, label, if t.claimed then "받았어요" elseif t.ready then "받을 수 있어요" else string.format("%d명 더 기록하면 열려요", math.max(0, t.need - pv.known)), {
					{ text = if t.claimed then "완료" else "받기", color = COLORS.gold, onClick = function() call("PeopleClaim", { need = t.need }) end, enabled = t.ready },
				}, 52)
			end)
		end
		for _, c in pv.cats do
			add(function()
				local row = mkRow(content, string.format("%s  %d / %d", c.name, c.known, c.total), "", {
					{ text = "열기", color = COLORS.blue, onClick = function() codexField = "p:" .. c.id; render() end },
				}, 56)
				withIcon(row, "Relics", PEOPLE_CAT_RELIC[c.id] or "key", nil, 40)
				return row
			end)
		end
	end
	if view.world then
		local wv = view.world
		add(function() return mkHeader(content, string.format("세계 소식 · 재해와 행운 (구호 %d번)", wv.aided or 0)) end)
		add(function() return mkLabel(content, "20일마다 세계 어딘가에서 재해나 행운이 닥쳐요. 그 지역 항구에 있으면 피해나 이득을 직접 받고, 아니어도 시세가 변해요. 해당 학문 지식과 방어 건물이 재해 피해를 줄여요.", 12, COLORS.muted, false) end)
		if #wv.active == 0 then
			add(function() return mkLabel(content, "지금 진행 중인 세계 사건이 없어요.", 12, COLORS.muted, false) end)
		end
		for _, a in wv.active do
			add(function()
				local sub = string.format("%s · %s — %d일 남음\n%s", a.region, if a.kind == "disaster" then "재해" else "행운", a.left, a.text)
				if a.here and a.kind == "disaster" and a.cut then
					sub ..= string.format("\n이 항구라면 대비로 피해 %d%% 감소", a.cut)
				end
				local btn = {}
				if a.kind == "disaster" then
					table.insert(btn, { text = if a.aided then "구호함" else string.format("구호 %d코인", wv.aidCost), color = COLORS.green, onClick = function() call("WorldAid", { index = a.index }) end, enabled = a.canAid })
				end
				return mkRow(content, (if a.kind == "disaster" then "⚠ " else "★ ") .. a.title .. (if a.here then "  [여기]" else ""), sub, btn, 100)
			end)
		end
		for _, l in wv.log do
			add(function() return mkLabel(content, string.format("%d년 %s (%s) — %s", l.year, l.title, if l.kind == "disaster" then "재해" else "행운", l.result), 12, COLORS.muted, false) end)
		end
	end
	if view.history then
		local hv = view.history
		add(function() return mkHeader(content, string.format("역사의 분기점 (겪은 사건 %d / %d)", hv.seenCount or 0, hv.total or 0)) end)
		if hv.pending then
			add(function() return mkLabel(content, string.format("⚑ 지금 기다리는 사건: %d년 %s — 화면에 뜨는 선택 창에서 정하세요.", hv.pending.year, hv.pending.title), 13, COLORS.gold, true) end)
		end
		for _, r in hv.recent do
			add(function() return mkLabel(content, string.format("%d년 %s — %s", r.year, r.title, r.choice), 12, COLORS.muted, false) end)
		end
		add(function() return mkHeader(content, "역사서 · 연대기 (시대가 지나야 읽을 수 있어요)") end)
		for _, ch in hv.chronicle or {} do
			add(function()
				local sub = if ch.known then ch.text .. (if ch.choice then "\n▶ 나의 선택: " .. ch.choice else "") else ch.text
				return mkRow(content, string.format("%d년 · %s%s", ch.year, ch.title, if ch.tag then "  [" .. ch.tag .. "]" else ""), sub, {}, if ch.known then 84 else 44)
			end)
		end
		for _, e in hv.effects do
			add(function() return mkLabel(content, string.format("진행 중인 시세 변화: %s (%d일 남음)", e.title or "", e.left), 12, COLORS.green, false) end)
		end
	end
	add(function() return mkHeader(content, "먼 바다로 가는 길 (항해 지식을 이해해야 열려요)") end)
	for _, g in (view.knowledge and view.knowledge.gates or {}) do
		add(function()
			local parts = {}
			for _, nd in g.need do
				table.insert(parts, (if nd.done then "✔ " else "✖ ") .. nd.name)
			end
			return mkLabel(content, g.region .. (if g.open then " (열림)" else "") .. " — " .. table.concat(parts, "  "), 13, if g.open then COLORS.green else COLORS.text, false)
		end)
	end
	add(function() return mkHeader(content, "학문 계통도 (뿌리에서 갈라져 나온 순서)") end)
	for _, t in (view.knowledge and view.knowledge.tree or {}) do
		add(function()
			local sub = if t.open then "열림" else string.format("잠김 — %s 지식 %d/%d개 이해하면 열려요", t.parentName or "", t.parentDone, t.openAt or 0)
			return mkLabel(content, string.rep("    ", t.depth) .. (if t.depth > 0 then "└ " else "") .. t.name .. "  · " .. sub, 13, if t.open then COLORS.text else COLORS.muted, false)
		end)
	end
	for _, d in (view.knowledge and view.knowledge.disciplines or {}) do
		add(function()
			local sub = d.summary
			if not d.open then
				sub = string.format("[잠김: %s 지식 %d/%d개] ", d.parentName or "", d.parentDone, d.openAt or 0) .. sub
			end
			return mkRow(content, string.format("%s  이해 %d / %d", d.name, d.done, d.total), sub, {
				{ text = "열기", color = COLORS.blue, onClick = function() codexField = "k:" .. d.id; render() end },
			}, 64)
		end)
	end
	add(function() return mkHeader(content, "전체 도감 보상") end)
	tierRows(cx.overall, "all", "전체 %d%% 달성")
	end

function H.renderCodexField()
if codexField == "boarding" then
	local BC = require(Shared:WaitForChild("BoardingCards"))
	add(function()
		return mkRow(content, "접현 전투 카드", "근접은 포, 포는 사격, 사격은 근접에 유리해요.", {
			{ text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end },
		}, 58)
	end)
	for _, rowId in { "melee", "ranged", "cannon", "special" } do
		local units = {}
		for _, unit in (if rowId == "special" then BC.Specials else BC.Units) do
			if rowId == "special" or unit.row == rowId then table.insert(units, unit) end
		end
		table.sort(units, function(a, b) return a.name < b.name end)
		add(function() return mkLabel(content, BC.ROW_NAME[rowId] or "특수 카드", 16, COLORS.gold, true) end)
		add(function()
			local grid = Instance.new("Frame")
			grid.BackgroundTransparency = 1
			grid.Size = UDim2.new(1, -6, 0, 0)
			grid.AutomaticSize = Enum.AutomaticSize.Y
			local layout = Instance.new("UIGridLayout")
			layout.CellSize = UDim2.new(1 / 3, -5, 0, 106)
			layout.CellPadding = UDim2.fromOffset(5, 5)
			layout.SortOrder = Enum.SortOrder.LayoutOrder
			layout.Parent = grid
			local field = { name = BC.ROW_NAME[rowId] or "특수", color = { 70, 92, 96 } }
			for index, unit in units do
				local badge = if unit.special then "특수" elseif unit.hero then "영웅 · " .. unit.power else "위력 " .. unit.power
				local tint = if unit.hero then COLORS.gold elseif unit.special then Color3.fromRGB(193, 166, 221) else Color3.fromRGB(176, 201, 215)
				local tile = H.codexCardTile(grid, { name = unit.name, found = true, image = H.combatCardImage(unit) },
					field, badge, tint, function() H.showCombatCard(unit) end)
				tile.LayoutOrder = index
			end
			return grid
		end)
	end
	return
end
if string.sub(codexField, 1, 2) == "p:" then
	local cid = string.sub(codexField, 3)
	local cat = nil
	for _, c in (view.people and view.people.cats or {}) do
		if c.id == cid then
			cat = c
		end
	end
	if not cat then
		codexField = nil
		renderCodexOverview()
		return
	end
	add(function()
		return mkRow(content, "← 분야 목록", "", { { text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end } }, 44)
	end)
	add(function() return mkLabel(content, string.format("인물 백과 · %s  %d / %d", cat.name, cat.known, cat.total), 17, COLORS.gold, true) end)
	local PEOPLE_RELIC = { ruler = "shield-round", explorer = "map-rolled", military = "weapon-spear", science = "magnifying-glass", inventor = "hammer", thought = "journal-open",
		art = "chisel", letters = "journal-closed", merchant = "coin", pirate = "weapon-sword", faith = "lantern" }
	local n = 0
	for _, p in view.people.list do
		if p.cat == cid then
			n += 1
			add(function()
				if p.known then
					local sub = p.bio .. (if p.legacy ~= "" then "\n" .. p.legacy else "") .. (if p.rel then "\n" .. p.rel else "")
					local talkLabel = if p.talked then "다시 듣기" else "대화 (+40)"
					local row = mkRow(content, p.name .. "  (" .. p.years .. ")", sub, { { text = talkLabel, color = COLORS.blue or COLORS.gold, onClick = function() call("PeopleTalk", { id = p.id }) end } }, 104)
					-- 등록된 초상이 있으면 초상, 없으면 분야 유물 그림 (학자: scholar_<id>, 그 밖의 인물: person_<id>)
					local key = if AssetIds["Portraits/scholar_" .. p.id] then "scholar_" .. p.id elseif AssetIds["Portraits/person_" .. p.id] then "person_" .. p.id else nil
					if key then
						withIcon(row, "Portraits", key, nil, 72)
					else
						withIcon(row, "Relics", PEOPLE_RELIC[cid] or "key", nil, 56)
					end
					return row
				end
				local row = mkRow(content, string.format("??? #%d", n), p.hint, {}, 60)
				withIcon(row, "Relics", "key", nil, 44)
				return row
			end)
		end
	end
	return
end
if string.sub(codexField, 1, 2) == "k:" then
	local did = string.sub(codexField, 3)
	local disc = nil
	for _, d in (view.knowledge and view.knowledge.disciplines or {}) do
		if d.id == did then
			disc = d
		end
	end
	if not disc then
		codexField = nil
		renderCodexOverview()
		return
	end
	add(function()
		return mkRow(content, "← 분야 목록", "", { { text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end } }, 44)
	end)
	add(function() return mkLabel(content, string.format("%s  이해 %d / %d", disc.name, disc.done, disc.total), 17, COLORS.gold, true) end)
	add(function() return mkLabel(content, disc.summary, 13, COLORS.text, false) end)
	local pd = view.people and view.people.byDisc and view.people.byDisc[disc.id]
	if pd then
		add(function() return mkLabel(content, string.format("이 학문과 이어진 인물 %d / %d명 기록 — 인물을 기록할수록 이 학문의 연구가 조금씩 빨라져요.", pd.known, pd.total), 12, COLORS.green, false) end)
	end
	local kv = view.knowledge
	add(function()
		return mkLabel(content, string.format("지금 효과: 항해 속도 +%d%% · 포격 +%d%%", math.floor(kv.speedBonus * 100 + 0.5), math.floor(kv.cannonBonus * 100 + 0.5)), 12, COLORS.green, false)
	end)
	if (disc.hidden or 0) > 0 then
		add(function() return mkLabel(content, string.format("아직 발견하지 못한 지식 %d개는 발견하면 이곳에 나타나요.", disc.hidden), 12, COLORS.muted, false) end)
	end
	for _, nd in disc.nodes do
		add(function()
			local mark, col
			if nd.status == "done" then
				mark, col = "✔ 이해함", COLORS.green
			elseif nd.status == "ready" then
				mark, col = "● 보고 가능", COLORS.gold
			elseif nd.status == "blocked" then
				mark, col = "✖ 선행 필요", COLORS.red
			elseif nd.status == "closed" then
				mark, col = "🔒 학문이 아직 열리지 않음", COLORS.muted
			else
				mark, col = "? 아직 발견 못 함", COLORS.muted
			end
			local sub = mark
			if #nd.needs > 0 then
				sub ..= "  ·  선행: " .. table.concat(nd.needs, ", ")
			end
			if nd.effect then
				sub ..= "\n효과: " .. nd.effect
			end
			local row = mkRow(content, nd.name, sub, {}, if nd.effect then 64 else 52)
			local stripe = Instance.new("Frame")
			stripe.Size = UDim2.new(0, 4, 1, -12)
			stripe.Position = UDim2.fromOffset(0, 6)
			stripe.BackgroundColor3 = col
			stripe.BorderSizePixel = 0
			stripe.Parent = row
			return row
		end)
	end
	return
end
local f = findField(codexField)
	if not f then
		codexField = nil
		renderCodexOverview()
		return
	end
	add(function()
		return mkRow(content, "← 분야 목록", "", { { text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end } }, 44)
	end)
	add(function()
		return mkLabel(content, string.format("%s  %d / %d", tostring(f.name), f.found, f.total), 17, fieldColor(f), true)
	end)
	add(function() return mkLabel(content, f.detail, 13, COLORS.text, false) end)
	add(function() return mkLabel(content, "모으는 방법: " .. f.tip, 12, COLORS.gold, false) end)
	add(function() return mkHeader(content, "완성 보상") end)
	tierRows(f.tiers, f.id, f.name .. " %d%% 달성")
	add(function() return mkHeader(content, "카드") end)
	add(function()
		local grid = Instance.new("Frame")
		grid.BackgroundTransparency = 1
		grid.Size = UDim2.new(1, -6, 0, 0)
		grid.AutomaticSize = Enum.AutomaticSize.Y
		local g = Instance.new("UIGridLayout")
		g.CellSize = UDim2.new(1 / 3, -6, 0, 118)
		g.CellPadding = UDim2.fromOffset(6, 6)
		g.SortOrder = Enum.SortOrder.LayoutOrder
		g.Parent = grid
		local n = 0
		for _, c in view.codex.cards do
			if c.field == f.id then
				n += 1
				local tint = if c.found then (RARITY_COLOR[c.rarity] or COLORS.muted) else COLORS.grey
				local badge = if c.found then (RARITY_NAMES[c.rarity] or c.rarity) else "미발견"
				local tile = H.codexCardTile(grid, c, f, badge, tint, function() H.showCardDetail(c) end)
				tile.LayoutOrder = n
			end
		end
		return grid
	end)
end

function RENDERERS.codex()
	if codexField then
		H.renderCodexField()
	else
		renderCodexOverview()
	end
end

function RENDERERS.tech()
	add(function()
		return mkLabel(content, "증기 연구: 지식 카드를 발견하고 코인으로 연구해요. 증기 장비는 석탄을 태워요.", 13, COLORS.muted, false)
	end)
	for _, t in view.tech do
		add(function()
			local sub = t.summary
			if t.owned then
				sub ..= "\n연구 완료"
			elseif t.blocked then
				sub ..= "\n" .. t.blocked
			end
			return mkRow(content, t.name, sub, {
				{ text = if t.owned then "완료" else tostring(t.cost), color = COLORS.steam, onClick = function() call("Research", { techId = t.id }) end,
					enabled = not t.owned and t.blocked == nil },
			}, 76)
		end)
	end
end

function RENDERERS.quest()
	-- 일지: 모든 퀘스트가 여기 기록된다. 소문을 듣거나 사람을 만나 이야기하면 저절로 올라오고, 조건을 채우면 저절로 보상이 들어온다.
	local STRAND = { companion = "동료 이야기", history = "역사의 현장", person = "인물과 연구" }
	local function strandText(q)
		return (if q.strand then "[" .. STRAND[q.strand] .. "] " else "") .. q.summary .. (if q.story then "\n" .. q.story else "")
	end
	add(function() return mkHeader(content, string.format("📖 일지 · 진행 중 %d", #view.quests.active)) end)
	if #view.quests.active == 0 then
		add(function() return mkLabel(content, "아직 적힌 이야기가 없어요. 항구에서 소문을 듣거나 사람들과 이야기를 나눠 보세요.", 13, COLORS.muted, true) end)
	end
	for _, q in view.quests.active do
		add(function()
			local buttons = {}
			if q.kind == "deliver" then
				table.insert(buttons, { text = "납품", color = COLORS.blue, onClick = function() call("TurnIn", { questId = q.id }) end })
			end
			return mkRow(content, q.name, string.format("%s\n진행 %d/%d · 보상 %d코인 (조건을 채우면 자동 지급)", strandText(q), math.min(q.progress, q.amount), q.amount, q.rewardCoins), buttons, if q.story then 124 else 76)
		end)
	end
	-- 자동으로 기록되는 발견·방문·연구 목표 (진행도만 보여 준다)
	local autos = {}
	for _, q in view.quests.available do
		if q.auto then table.insert(autos, q) end
	end
	if #autos > 0 then
		add(function() return mkHeader(content, "자동 기록 중인 목표") end)
		for _, q in autos do
			add(function()
				return mkRow(content, q.name, string.format("%s\n진행 %d/%d · 보상 %d코인", strandText(q), math.min(q.progress or 0, q.amount or 0), q.amount or 0, q.rewardCoins), nil, if q.story then 116 else 64)
			end)
		end
	end
	if (view.quests.otherPortDeliver or 0) > 0 or #view.quests.available > #autos then
		add(function()
			return mkLabel(content, "아직 모르는 의뢰와 이야기가 더 있어요. 다른 항구의 소문과 사람들에게서 듣게 돼요.", 12, COLORS.muted, true)
		end)
	end
	if #view.quests.done > 0 then
		add(function() return mkHeader(content, string.format("완료한 기록 %d", #view.quests.done)) end)
		for _, q in view.quests.done do
			add(function()
				return mkLabel(content, "✔ " .. q.name .. " — " .. q.summary .. (if q.ending then "\n   " .. q.ending else ""), 12, COLORS.muted, true)
			end)
		end
	end
end

function RENDERERS.battle()
	local lo = view.loadout
	if not equipped then
		equipped = table.clone(lo.equipped)
	end
	add(function()
		return mkRow(content, "사략선 사냥", "바다에서 해적을 찾아 자동 해전을 벌여요 (1일 소요)", {
			{ text = "출격", color = COLORS.red, onClick = function() call("Hunt") end },
		}, 56)
	end)
	add(function() return mkHeader(content, "신화 괴물") end)
	for _, b in view.bosses do
		add(function()
			local sub = string.format("%s\n격파 %d회%s", b.summary, b.defeated, if b.blocked then " · " .. b.blocked else "")
			return mkRow(content, b.name, sub, {
				{ text = "도전", color = COLORS.red, enabled = b.blocked == nil, onClick = function() call("ChallengeBoss", { bossId = b.id }) end },
			}, 76)
		end)
	end
	add(function()
		return mkLabel(content, string.format("자동스킬 슬롯 %d개 · 위에 있을수록 먼저 발동해요 (현재 %d개 선택)", lo.slots, #equipped), 13, COLORS.muted, false)
	end)

	local function indexOf(id)
		for i, v in equipped do
			if v == id then
				return i
			end
		end
		return nil
	end

	for _, s in lo.skills do
		add(function()
			local idx = indexOf(s.id)
			local sub = string.format("%s · 쿨타임 %d라운드%s", s.summary, s.cooldown, if s.steamOnly then " · 증기선 전용(석탄)" else "")
			if s.locked then
				sub ..= "\n" .. s.locked
			end
			local title = (if idx then string.format("%d. ", idx) else "") .. s.name
			local buttons = {
				{ text = if idx then "해제" else "장착", color = if idx then COLORS.red else COLORS.blue, enabled = not s.locked,
					onClick = function()
						if idx then
							table.remove(equipped, idx)
						elseif #equipped < lo.slots then
							table.insert(equipped, s.id)
						else
							message, messageOk = "슬롯이 가득 찼어요", false
						end
						render()
					end },
			}
			if idx and idx > 1 then
				table.insert(buttons, { text = "위로", color = COLORS.grey, onClick = function()
					equipped[idx], equipped[idx - 1] = equipped[idx - 1], equipped[idx]
					render()
				end })
			end
			return mkRow(content, title, sub, buttons, 76)
		end)
	end
	add(function()
		local b = mkButton(content, "자동스킬 저장", COLORS.green, UDim2.new(1, -6, 0, 40), function()
			call("SetLoadout", { skills = equipped })
		end, true)
		return b
	end)

	if view.lastBattle then
		add(function() return mkHeader(content, "최근 해전: " .. view.lastBattle.enemy) end)
		for _, line in view.lastBattle.log do
			add(function() return mkLabel(content, line, 12, COLORS.muted, false) end)
		end
	end
end

local selectedPort = nil
H.selectedChart = nil
H.showChartPicker = false
H.CHART_REGIONS = {
	{ "north_sea", "북해" }, { "west_europe", "서유럽" },
	{ "mediterranean", "지중해" }, { "west_africa", "서아프리카" },
	{ "indian_ocean", "인도양" }, { "southeast_asia", "동남아시아" },
	{ "east_asia", "동아시아" }, { "caribbean", "카리브해·북아메리카" },
	{ "south_america", "남아메리카" }, { "pacific", "태평양" },
}
H.CHART_BY_PORT_REGION = {
	north_sea = "north_sea", atlantic_europe = "west_europe", mediterranean = "mediterranean",
	west_africa = "west_africa", east_africa = "indian_ocean", red_sea = "indian_ocean",
	south_asia = "indian_ocean", southeast_asia = "southeast_asia", east_asia = "east_asia",
}

function H.chartForPort(portId)
	local pt = PortData.Ports[portId]
	if not pt then return nil end
	local region = H.regionOfPort(portId)
	if region == "americas" then
		-- 남아메리카의 태평양 연안 항구도 태평양 해역도에서 고를 수 있다.
		if pt.lat < 12 and pt.lon < -70 then return "pacific", "south_america" end
		return if pt.lat < 12 then "south_america" else "caribbean"
	end
	return H.CHART_BY_PORT_REGION[region or ""]
end

H.SEA_NAMES = {
	{ "북해", 56.2, 3.2 }, { "대서양", 47.5, -9 }, { "지중해", 38.6, 4 }, { "발트해", 57.3, 19.5 },
	{ "영국해협", 50.0, -2.0 }, { "비스케이만", 45.0, -5.2 }, { "티레니아해", 40.0, 11.8 }, { "아드리아해", 43.0, 15.6 },
	{ "아일랜드해", 53.9, -4.9 }, { "노르웨이해", 61.6, 1 }, { "이오니아해", 37.8, 18.5 }, { "리구리아해", 43.4, 8.3 },
}

-- 실제 위도·경도 위에 항구를 찍은 세계지도 (Natural Earth 해안선)
function RENDERERS.map()
	-- 일지: 지금 어디서 무엇을 하는지, 겪은 사건, 기다리는 사건을 먼저 보여 주고 아래에 항해 지도를 둔다
	do
		local p = view.player
		add(function() return mkHeader(content, "항해 일지") end)
		add(function()
			return mkLabel(content, string.format("%s · %d년 %d일째 · %s에 정박 중\n코인 %d · 명성 %d · 동료 %d명", p.nation, p.year, p.day, p.portName, p.coins, p.fame or 0, #(view.companions and view.companions.list and (function() local n = {} for _, c in view.companions.list do if c.joined then table.insert(n, c) end end return n end)() or {})), 14, COLORS.text, true)
		end)
		local hv = view.history
		if hv then
			if hv.pending then
				add(function() return mkLabel(content, string.format("⚑ 기다리는 사건: %d년 %s", hv.pending.year, hv.pending.title), 13, COLORS.gold, true) end)
			end
			for _, r in hv.recent or {} do
				add(function() return mkLabel(content, string.format("%d년 %s — %s", r.year, r.title, r.choice), 12, COLORS.muted, false) end)
			end
		end
		add(function() return mkHeader(content, "항해 지도") end)
	end
	-- 한 번에 현재 보고 있는 지도 한 장만 화면에 붙인다.
	local chartImage = H.selectedChart and AssetIds["CardArt/event_chart_" .. H.selectedChart]
	add(function()
		local controls = Instance.new("Frame")
		controls.Size = UDim2.new(1, -6, 0, 44)
		controls.BackgroundTransparency = 1
		mkButton(controls, "세계지도", if chartImage then COLORS.grey else COLORS.blue, UDim2.new(0.5, -3, 1, 0), function()
			H.selectedChart = nil
			H.showChartPicker = false
			render()
		end)
		local regions = mkButton(controls, if H.showChartPicker then "해역 목록 닫기" else "해역 선택", COLORS.blue, UDim2.new(0.5, -3, 1, 0), function()
			H.showChartPicker = not H.showChartPicker
			render()
		end)
		regions.Position = UDim2.new(0.5, 3, 0, 0)
		return controls
	end)
	if H.showChartPicker then
		for _, entry in H.CHART_REGIONS do
			local key, label = entry[1], entry[2]
			if AssetIds["CardArt/event_chart_" .. key] then
				add(function()
					return mkButton(content, label, if key == H.selectedChart then COLORS.gold else COLORS.grey, UDim2.new(1, -6, 0, 44), function()
						H.selectedChart = key
						selectedPort = nil
						H.showChartPicker = false
						render()
					end)
				end)
			end
		end
	end

	if chartImage then
		for _, entry in H.CHART_REGIONS do
			if entry[1] == H.selectedChart then
				add(function() return mkHeader(content, entry[2]) end)
				break
			end
		end
		add(function()
			local pic = Instance.new("ImageLabel")
			local mapW = math.max(200, content.AbsoluteSize.X - 10)
			pic.Size = UDim2.new(1, -6, 0, math.floor(mapW * 992 / 1586))
			pic.BackgroundTransparency = 1
			pic.Image = "rbxassetid://" .. tostring(chartImage)
			pic.ScaleType = Enum.ScaleType.Fit
			corner(pic, 8)
			return pic
		end)
	else
		local cosLat = 0.66 -- 유럽 위도에서 가로를 줄여 비율을 맞춘다
		-- 손으로 그린 세계지도(1587x991, 지도 영역 x 31~1553, y 98~920)가 있으면 그 위에 항구를 얹는다
		local worldImg = AssetIds["CardArt/event_chart_world"]
		local function mapX(lon)
			if worldImg then
				return (31 + (lon + 180) / 360 * 1522) / 1587
			end
			return (lon - Geo.lonMin) / (Geo.lonMax - Geo.lonMin)
		end
		local function mapY(lat)
			if worldImg then
				return (98 + (80.6 - lat) / 145.4 * 822) / 991
			end
			return (Geo.latMax - lat) / (Geo.latMax - Geo.latMin)
		end
		add(function()
			local frame = Instance.new("Frame")
			-- 지도 비율(가로/세로)에 맞춰 높이를 직접 정한다 (UIAspectRatioConstraint는 스크롤 목록 안에서 높이가 0이 됐다)
			local mapW = math.max(200, content.AbsoluteSize.X - 10)
			frame.Size = UDim2.new(1, -6, 0, if worldImg then math.floor(mapW * 991 / 1587) else math.floor(mapW / ((Geo.cols * cosLat) / Geo.rows)))
			frame.BackgroundColor3 = Color3.fromRGB(38, 82, 120)
			frame.BorderSizePixel = 0
			frame.ClipsDescendants = true
			if worldImg then
				local bg = Instance.new("ImageLabel")
				bg.Size = UDim2.fromScale(1, 1)
				bg.BackgroundTransparency = 1
				bg.Image = "rbxassetid://" .. tostring(worldImg)
				bg.ScaleType = Enum.ScaleType.Stretch
				bg.Parent = frame
				local compass = AssetIds["Menu/chart_compass"]
				if compass then
					local c = Instance.new("ImageLabel")
					c.AnchorPoint = Vector2.new(1, 1)
					c.Position = UDim2.new(1, -8, 1, -8)
					c.Size = UDim2.fromOffset(46, 46)
					c.BackgroundTransparency = 1
					c.Image = "rbxassetid://" .. tostring(compass)
					c.Parent = frame
				end
			else
				drawLand(frame)
			end
			-- 해역 이름
			for _, sea in (if worldImg then {} else H.SEA_NAMES) do
				local lb = Instance.new("TextLabel")
				lb.AnchorPoint = Vector2.new(0.5, 0.5)
				lb.Position = UDim2.fromScale(mapX(sea[3]), mapY(sea[2]))
				lb.Size = UDim2.fromOffset(70, 14)
				lb.BackgroundTransparency = 1
				lb.Text = sea[1]
				lb.Font = Enum.Font.GothamMedium
				lb.TextSize = 11
				lb.TextColor3 = Color3.fromRGB(160, 205, 240)
				lb.TextTransparency = 0.15
				lb.Parent = frame
			end
			-- 선택한 항구까지의 항로선 (실제 해안선을 피한 바닷길)
			if selectedPort and selectedPort ~= view.player.portId then
				local path = SeaRoutes.path(view.player.portId, selectedPort, PortData.Ports)
				for i = 1, #path - 1 do
					local a, b = path[i], path[i + 1]
					local dx = (mapX(b[2]) - mapX(a[2])) * mapW
					local dy = (mapY(b[1]) - mapY(a[1])) * frame.Size.Y.Offset
					local steps = math.max(1, math.ceil(hypot(dx, dy) / 6))
					for k = 1, steps do
						local t = k / steps
						local dotm = Instance.new("Frame")
						dotm.AnchorPoint = Vector2.new(0.5, 0.5)
						dotm.Position = UDim2.fromScale(mapX(a[2] + (b[2] - a[2]) * t), mapY(a[1] + (b[1] - a[1]) * t))
						dotm.Size = UDim2.fromOffset(4, 4)
						dotm.BackgroundColor3 = Color3.fromRGB(255, 226, 120)
						dotm.BorderSizePixel = 0
						dotm.Parent = frame
					end
				end
			end
			for id, pt in PortData.Ports do
				local isHere = (id == view.player.portId)
				local dot = Instance.new("TextButton")
				dot.AnchorPoint = Vector2.new(0.5, 0.5)
				dot.Position = UDim2.fromScale(mapX(pt.lon), mapY(pt.lat))
				local small = worldImg ~= nil
				dot.Size = UDim2.fromOffset(if isHere then (if small then 12 else 18) else (if small then 8 else 14), if isHere then (if small then 12 else 18) else (if small then 8 else 14))
				dot.Text = ""
				dot.BackgroundColor3 = if isHere then COLORS.gold elseif id == selectedPort then COLORS.blue else COLORS.red
				dot.BorderSizePixel = 1
				dot.Parent = frame
				-- 현재 항구는 닻 아이콘으로 크게 표시
				local anchorIcon = if isHere and worldImg then AssetIds["Menu/chart_anchor"] else nil
				if anchorIcon then
					local ai = Instance.new("ImageLabel")
					ai.AnchorPoint = Vector2.new(0.5, 0.5)
					ai.Position = UDim2.fromScale(0.5, 0.5)
					ai.Size = UDim2.fromOffset(30, 30)
					ai.BackgroundTransparency = 1
					ai.Image = "rbxassetid://" .. tostring(anchorIcon)
					ai.ZIndex = 5
					ai.Parent = dot
				end
				local corner = Instance.new("UICorner")
				corner.CornerRadius = UDim.new(1, 0)
				corner.Parent = dot
				local tag = Instance.new("TextLabel")
				tag.BackgroundTransparency = 1
				tag.Position = UDim2.fromOffset(12, -8)
				tag.Size = UDim2.fromOffset(60, 14)
				tag.Text = pt.name
				tag.Font = Enum.Font.GothamBold
				tag.TextSize = 10
				tag.TextColor3 = Color3.new(1, 1, 1)
				tag.TextXAlignment = Enum.TextXAlignment.Left
				tag.Parent = dot
				dot.Activated:Connect(function()
					selectedPort = id
					render()
				end)
			end
			return frame
		end)
		add(function()
			return mkLabel(content, "금색=현재 항구 · 빨강=항구 · 항구를 누르면 항로 정보가 나와요", 12, COLORS.muted, false)
		end)
	end
	-- 국가 관계·전쟁·다른 항해자
	if view.diplo then
		local dp = view.diplo
		local STATUS = { war = "⚔ 전쟁", hostile = "적대", neutral = "중립", friend = "우호", ally = "동맹", own = "우리" }
		add(function()
			return mkLabel(content, string.format("🏳 국가 관계 — 우리는 %s%s", dp.power.name, if dp.here and dp.here.power then string.format(" · 이 항구: %s (%s)", dp.here.power, STATUS[dp.here.status] or "") else " · 이 항구: 자유 항구"), 15, COLORS.gold, true)
		end)
		if #dp.wars == 0 then
			add(function() return mkLabel(content, "지금은 큰 전쟁이 없어요. 항구들이 평화롭게 오가요.", 12, COLORS.muted, false) end)
		end
		for _, w in dp.wars do
			add(function()
				return mkRow(content, (if w.mine then "⚔ [우리 편 연루] " else "⚔ ") .. w.title, string.format("%s 대 %s · %d년까지\n%s", w.a, w.b, w.until_, w.text), {}, 84)
			end)
		end
		add(function()
			local parts = {}
			for _, r in dp.rel do
				table.insert(parts, string.format("%s %s(%d)", r.name, STATUS[r.status] or "", r.rep))
			end
			return mkLabel(content, table.concat(parts, "  ·  "), 11, COLORS.muted, false)
		end)
		add(function()
			return mkRow(content, "외교", string.format("선물로 호감을 쌓거나, 통행 증서(%d일)로 적국 항구의 입항세를 면해요.%s", 60, if dp.here and dp.here.passLeft > 0 then string.format(" 증서 %d일 남음", dp.here.passLeft) else ""), {
				{ text = string.format("선물 %d", dp.giftCost), color = COLORS.green, onClick = function() call("DiploGift", {}) end, enabled = dp.here ~= nil and dp.here.canGift == true },
				{ text = string.format("증서 %d", dp.passCost), color = COLORS.blue, onClick = function() call("DiploPass", {}) end, enabled = true },
			}, 84)
		end)
		add(function()
			return mkLabel(content, "⚓ 이 항구의 항해자", 14, COLORS.gold, true)
		end)
		if #dp.voyagers == 0 then
			add(function() return mkLabel(content, "지금 이 항구에 머무는 다른 항해자는 없어요.", 12, COLORS.muted, false) end)
		end
		for _, v in dp.voyagers do
			add(function()
				return mkRow(content, string.format("%s · %s (%s)", v.name, v.role, v.power), v.text, {
					{ text = if v.met then "대화" else "인사", color = COLORS.green, onClick = function() call("VoyagerMeet", { id = v.id }) end, enabled = true },
				}, 96)
			end)
		end
		if #dp.sea > 0 then
			add(function()
				local lines = {}
				for _, v in dp.sea do
					table.insert(lines, string.format("%s(%s) %s → %s %d%%", v.name, v.role, v.from, v.to, v.pct))
				end
				return mkLabel(content, "🌊 항해 중: " .. table.concat(lines, " · "), 11, COLORS.muted, false)
			end)
		end
	end
	local function addSelectedRoute()
		if selectedPort and selectedPort ~= view.player.portId then
			for _, r in view.routes do
				if r.id == selectedPort then
					add(function()
						if r.locked then
							return mkRow(content, r.name, string.format("%s · 🔒 %s", r.region, r.locked), {
								{ text = "잠김", color = COLORS.grey, onClick = function() message = r.region .. " 해역은 " .. r.locked; messageOk = false; render() end },
							}, 56)
						end
						return mkRow(content, r.name, string.format("%s · %d일 · %d km · 보급품 %d%s", r.region, r.days, r.distanceKm, r.supplies, if r.coal > 0 then (" · 석탄 " .. r.coal) else ""), {
							{ text = "출항", color = COLORS.blue, onClick = function() selectedPort = nil; confirmSail(r) end },
						}, 56)
					end)
				end
			end
		end
	end
	if chartImage then
		local ports = {}
		for id, port in PortData.Ports do
			local primary, secondary = H.chartForPort(id)
			if primary == H.selectedChart or secondary == H.selectedChart then
				table.insert(ports, { id = id, name = port.name })
			end
		end
		table.sort(ports, function(a, b)
			if a.name == b.name then return a.id < b.id end
			return a.name < b.name
		end)
		for _, port in ports do
			add(function()
				local label = if port.id == view.player.portId then port.name .. " · 현재 항구" else port.name
				return mkButton(content, label, if port.id == selectedPort then COLORS.blue else COLORS.grey, UDim2.new(1, -6, 0, 44), function()
					selectedPort = port.id
					render()
				end)
			end)
			if port.id == selectedPort then addSelectedRoute() end
		end
		if #ports == 0 then
			add(function() return mkLabel(content, "이 해역에는 선택할 항구가 없어요.", 13, COLORS.muted, false) end)
		end
	elseif selectedPort then
		addSelectedRoute()
		local chart = H.chartForPort(selectedPort)
		if chart and AssetIds["CardArt/event_chart_" .. chart] then
			add(function()
				return mkButton(content, "선택한 항구의 해역 확대", COLORS.blue, UDim2.new(1, -6, 0, 44), function()
					H.selectedChart = chart
					H.showChartPicker = false
					render()
				end)
			end)
		end
	end
end

RENDERERS.yard = renderYard

-- 새 게임 선택 화면 -------------------------------------------------------------

-- 전체 그리기 -----------------------------------------------------------------

function H.renderTabs()
	for _, child in tabBar:GetChildren() do
		if child:IsA("TextButton") then
			child:Destroy()
		end
	end
	local g = groupOf(currentTab)
	for i, id in g.tabs do
		local b = mkButton(tabBar, TAB_NAME[id], if currentTab == id then COLORS.gold else COLORS.leather, UDim2.fromOffset(68, 38), function()
			currentTab = id
			if id ~= "battle" then
				equipped = nil
			end
			render()
		end, true)
		b.LayoutOrder = i
		if currentTab == id then
			b.TextColor3 = Color3.fromRGB(32, 22, 8)
		end
		if AssetIds["Menu/" .. id] then
			b.Text = ""
			local icon = modelIcon(b, "Menu", id, nil, 24)
			icon.Name = "Icon"
			icon.Position = UDim2.new(0, 4, 0.5, -12)
			local label = Instance.new("TextLabel")
			label.Name = "Label"
			label.BackgroundTransparency = 1
			label.Position = UDim2.fromOffset(29, 0)
			label.Size = UDim2.new(1, -32, 1, 0)
			label.Font = b.Font
			label.TextSize = 12
			label.TextWrapped = true
			label.TextXAlignment = Enum.TextXAlignment.Left
			label.TextColor3 = b.TextColor3
			label.Text = TAB_NAME[id]
			label.Parent = b
		end
	end
	local fold = mkButton(tabBar, "닫기", COLORS.red, UDim2.fromOffset(60, 38), function()
		main.Visible = false
		menuToggle.Visible = true
	end, true)
	fold.LayoutOrder = #g.tabs + 1
end

-- 3D 항구 장면: 항구나 배가 바뀔 때만 다시 만든다
syncScene = function()
	if sceneHold then
		return
	end
	-- 서버가 CC0 모델을 불러오는 동안(최대 약 25초) 기다렸다가 장면을 만든다
	local RS = game:GetService("ReplicatedStorage")
	if not RS:GetAttribute("MareAssetsReady") and not H.assetWaitDone then
		if not assetWaitStarted then
			assetWaitStarted = true
			task.spawn(function()
				local t0 = os.clock()
				while not RS:GetAttribute("MareAssetsReady") and os.clock() - t0 < 45 do
					task.wait(0.3)
				end
				H.assetWaitDone = true -- 모델이 덜 와도 장면은 만든다 (하늘에 캐릭터만 뜨는 것 방지)
				sceneKey = nil
				if view then
					syncScene()
				end
			end)
		end
		return
	end
	local p, ship = view.player, view.ship
	local crew = {}
	for _, c in (view.companions and view.companions.list) or {} do
		if c.joined then
			table.insert(crew, { id = c.id, name = c.name })
		end
	end
	local crewIds = {}
	for _, c in crew do
		table.insert(crewIds, c.id)
	end
	local portLevel = (view.harbor and view.harbor.level) or 1
	-- 발전도가 오르면 마을이 바로 바뀌지 않고, 공사 기간(일꾼이 짓는 모습)을 거친 뒤 새 단계로 바뀐다
	H.shownLv = H.shownLv or {}
	H.buildDue = H.buildDue or {}
	local shownLv = H.shownLv[p.portId]
	if shownLv == nil or portLevel < shownLv then
		shownLv = portLevel
		H.shownLv[p.portId] = portLevel
	end
	local construction = nil
	if portLevel > shownLv then
		local secs = math.clamp(40 * (portLevel - shownLv), 40, 120)
		construction = { to = portLevel, seconds = secs }
		if not H.buildDue[p.portId] then
			H.buildDue[p.portId] = true
			local pid = p.portId
			task.delay(secs, function()
				H.buildDue[pid] = nil
				H.shownLv[pid] = nil -- 다음 동기화에서 현재 단계로 확정
				sceneKey = nil
				if syncScene then pcall(syncScene) end
			end)
		end
		portLevel = shownLv
	end
	local econKind = view.harbor and view.harbor.regime and view.harbor.regime.kind or "normal"
	local eco = view.harbor and view.harbor.economy or {}
	local boostIds = {}
	for _, b in eco.boosts or {} do
		table.insert(boostIds, b.id or b.name)
	end
	local econBucket = tostring(math.floor((eco.index or 100) / 25)) .. "u" .. tostring(math.floor((eco.unemployment or 12) / 5)) .. table.concat(boostIds, "+")
	local key = p.portId .. "|Y" .. tostring(p.year) .. "|E" .. econKind .. econBucket .. "|L" .. portLevel .. (if construction then "|C" else "") .. "|" .. ship.id .. "|" .. table.concat(view.facilities or {}, ",") .. "|" .. tostring(p.hasShipyard) .. "|" .. tostring(#(view.story or {}) > 0) .. "|" .. table.concat(crewIds, ",") .. "|v" .. #((view.diplo and view.diplo.voyagers) or {})
	if key == sceneKey then
		if sceneCtl and sceneCtl.setDay then sceneCtl.setDay(p.day) end
		return
	end
	local ok, res = pcall(PortScene.build, {
		portId = p.portId,
		portName = p.portName,
		level = portLevel,
		construction = construction,
		econ = econKind,
		econIndex = eco.index,
		unemployment = eco.unemployment,
		vacancy = eco.vacancy,
		migration = eco.migration,
		boosts = boostIds,
		shipId = ship.id,
		hasShipyard = p.hasShipyard,
		facilities = view.facilities,
		palaceName = view.palace and view.palace.name,
		year = p.year,
		day = p.day,
		storyCount = #(view.story or {}),
		companions = crew,
		voyagers = view.diplo and view.diplo.voyagers,
		arrive = arriveNext,
	}, function(tab)
		currentTab = tab
		menuToggle.Visible = false
		if tab == "trade" then
			openTradeHall()
		elseif tab == "yard" then
			openYardHall()
		else
			main.Visible = true
			render()
		end
	end)
	if not ok then
		warn("[Game] 항구 장면 오류", res)
		return
	end
	sceneKey = key
	sceneCtl = res.controls
	arriveNext = false
	sceneSpawn = res.spawn
	local char = player.Character
	if char and char:FindFirstChild("HumanoidRootPart") then
		char:PivotTo(res.spawn)
	end
	applyView()
end

-- 항구 전경: 대항해시대 온라인처럼 항구 전체를 보여 주는 고정 시점 (천천히 흔들린다)
do
	local camBase = CFrame.lookAt(Vector3.new(72, 20, 54), Vector3.new(-28, 9, -4))
	applyView = function()
		local camera = workspace.CurrentCamera
		local char = player.Character
		local root = char and char:FindFirstChild("HumanoidRootPart")
		if overview then
			camera.CameraType = Enum.CameraType.Scriptable
			camera.FieldOfView = 62
			if root and sceneSpawn then
				-- 전경에서도 캐릭터를 실제 항구 바닥에 세운다. 허공(-200, 8, 0) 대기를 금지한다.
				char:PivotTo(sceneSpawn)
				root.Anchored = true
			end
		else
			camera.CameraType = Enum.CameraType.Custom
			camera.FieldOfView = 70
			local hum = char and char:FindFirstChildOfClass("Humanoid")
			if hum then
				camera.CameraSubject = hum
			end
			if char and root and sceneSpawn then
				char:PivotTo(sceneSpawn)
				root.Anchored = false -- 실제 항구 바닥에 옮긴 뒤 걷기 조작 복구
			end
		end
	end
	-- 바다·바닥 아래로 떨어지면 항구 시작 지점으로 되돌린다 (걷다가 물에 빠지는 사고 방지)
	task.spawn(function()
		while true do
			task.wait(0.4)
			local char = player.Character
			local root = char and char:FindFirstChild("HumanoidRootPart")
			if root and sceneSpawn and not inField and not workspace:GetAttribute("VoyageActive") then
				local p = root.Position
				if p.Y < -3 and p.X < 400 and p.X > -900 then
					root.AssemblyLinearVelocity = Vector3.zero
					char:PivotTo(sceneSpawn)
				end
			end
		end
	end)
	game:GetService("RunService").RenderStepped:Connect(function()
		local camera = workspace.CurrentCamera
		if workspace:GetAttribute("ShotCF") or workspace:GetAttribute("VoyageActive") then
			return -- 개발용 캡처 카메라(devloop-studio)가 켜져 있으면 전경 카메라는 양보한다
		end
		if overview and not inField and not sceneHold and camera.CameraType == Enum.CameraType.Scriptable then
			local t = os.clock()
			camera.CFrame = camBase * CFrame.new(math.sin(t * 0.25) * 5, math.sin(t * 0.4) * 0.7, 0)
		end
	end)
end

local optionsGui = nil
local function closeOptions()
	if optionsGui then
		optionsGui:Destroy()
		optionsGui = nil
	end
end
H.HELP_LINES = {
	"⚓ 기본 흐름",
	"1. 교역소에서 특산품을 싸게 삽니다.",
	"2. 항만청(지도)에서 수요가 높은 항구로 출항합니다.",
	"3. 도착한 항구에서 팔아 이익을 남깁니다.",
	"4. 주점에서 동료를 영입하고 의뢰를 받습니다.",
	"5. 명성과 모험 레벨이 오르면 먼 바다가 열려요.",
	"",
	"🧭 조작",
	"· 오른쪽 메뉴 버튼으로 교역·항해·조선소 등 화면을 엽니다.",
	"· '걷기' 버튼으로 항구 전경과 걷기 시점을 바꿉니다.",
	"· 항해 중 화면을 누르면 연출을 건너뜁니다.",
}
openOptions = function()
	closeOptions()
	local layer = overlayGui("Options", 60)
	optionsGui = layer
	local helpOpen, confirmNew = false, false
	local dim = Instance.new("TextButton")
	dim.Size = UDim2.fromScale(1, 1)
	dim.BackgroundColor3 = Color3.new(0, 0, 0)
	dim.BackgroundTransparency = 0.45
	dim.Text = ""
	dim.AutoButtonColor = false
	dim.BorderSizePixel = 0
	dim.Parent = layer
	dim.Activated:Connect(closeOptions)
	local win = Instance.new("Frame")
	win.AnchorPoint = Vector2.new(0.5, 0.5)
	win.Position = UDim2.fromScale(0.5, 0.5)
	win.Size = UDim2.new(0, 540, 0.86, 0)
	win.BackgroundColor3 = COLORS.cover
	win.BorderSizePixel = 0
	win.Parent = layer
	corner(win, 16)
	local wst = Instance.new("UIStroke")
	wst.Color = BRASS
	wst.Thickness = 2.5
	wst.Parent = win
	local limit = Instance.new("UISizeConstraint")
	limit.MaxSize = Vector2.new(560, 520)
	limit.MinSize = Vector2.new(300, 200)
	limit.Parent = win
	local bar = mkBox(win, UDim2.fromScale(0, 0), UDim2.new(1, 0, 0, 46), Color3.fromRGB(40, 32, 18))
	corner(bar, 16)
	local ttl = mkLabel(bar, "⚙  설정", 20, Color3.fromRGB(246, 208, 130), true)
	ttl.Position = UDim2.fromOffset(16, 9)
	ttl.Size = UDim2.new(1, -70, 0, 28)
	ttl.AutomaticSize = Enum.AutomaticSize.None
	local x = mkButton(bar, "X", Color3.fromRGB(150, 54, 54), UDim2.fromOffset(38, 32), closeOptions, true)
	x.AnchorPoint = Vector2.new(1, 0.5)
	x.Position = UDim2.new(1, -8, 0.5, 0)
	x.TextSize = 16
	local body = Instance.new("ScrollingFrame")
	body.BackgroundTransparency = 1
	body.BorderSizePixel = 0
	body.Position = UDim2.fromOffset(12, 54)
	body.Size = UDim2.new(1, -24, 1, -64)
	body.ScrollBarThickness = 4
	body.AutomaticCanvasSize = Enum.AutomaticSize.Y
	body.CanvasSize = UDim2.new()
	body.Parent = win
	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 8)
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = body

	local function draw()
		for _, c in body:GetChildren() do
			if not c:IsA("UIListLayout") then
				c:Destroy()
			end
		end
		local order = 0
		local function nxt()
			order += 1
			return order
		end
		local function section(text)
			local l = mkLabel(body, text, 14, Color3.fromRGB(226, 182, 92), true, nxt())
			l.Size = UDim2.new(1, 0, 0, 22)
			l.AutomaticSize = Enum.AutomaticSize.None
		end
		-- 한 줄: 이름 + 오른쪽 버튼들
		local function row(name, sub, buttons)
			local r = mkBox(body, UDim2.new(), UDim2.new(1, -4, 0, 52), Color3.fromRGB(24, 34, 50))
			r.LayoutOrder = nxt()
			corner(r, 10)
			local n = mkLabel(r, name, 15, COLORS.text, true)
			n.Position = UDim2.fromOffset(12, if sub then 7 else 15)
			n.Size = UDim2.new(1, -24 - #buttons * 76, 0, 20)
			n.AutomaticSize = Enum.AutomaticSize.None
			if sub then
				local sl = mkLabel(r, sub, 12, COLORS.muted, false)
				sl.Position = UDim2.fromOffset(12, 28)
				sl.Size = UDim2.new(1, -24 - #buttons * 76, 0, 18)
				sl.AutomaticSize = Enum.AutomaticSize.None
			end
			for i, b in buttons do
				local btn = mkButton(r, b.text, b.color or COLORS.blue, UDim2.fromOffset(68, 36), b.onClick, true)
				btn.AnchorPoint = Vector2.new(1, 0.5)
				btn.Position = UDim2.new(1, -8 - (#buttons - i) * 76, 0.5, 0)
				btn.TextSize = 13
			end
		end
		section("⛵ 항해 방식")
		do
			local manualOn = player:GetAttribute("ManualHelm") == true
			row("수동 항해", if manualOn then "켜짐: 스틱·WASD로 직접 조종" else "꺼짐: 자동 항해", {
				{ text = if manualOn then "자동으로" else "직접 조종", color = if manualOn then COLORS.grey else COLORS.green, onClick = function() player:SetAttribute("ManualHelm", not manualOn); draw() end },
			})
		end
		section("🔊 소리")
		do
			local musicOn, sfxOn = Sfx.state()
			local ml, sl = Sfx.levels()
			row("음악  " .. math.floor(ml / 1.5 * 100 + 0.5) .. "%", if musicOn then "켜짐" else "꺼짐", {
				{ text = if musicOn then "끄기" else "켜기", color = if musicOn then COLORS.grey else COLORS.green, onClick = function() Sfx.setMusicEnabled(not musicOn); draw() end },
				{ text = "－", color = COLORS.grey, onClick = function() Sfx.stepMusic(-1); draw() end },
				{ text = "＋", color = COLORS.blue, onClick = function() Sfx.stepMusic(1); draw() end },
			})
			row("효과음  " .. math.floor(sl / 1.5 * 100 + 0.5) .. "%", if sfxOn then "켜짐" else "꺼짐", {
				{ text = if sfxOn then "끄기" else "켜기", color = if sfxOn then COLORS.grey else COLORS.green, onClick = function() Sfx.setSfxEnabled(not sfxOn); draw() end },
				{ text = "－", color = COLORS.grey, onClick = function() Sfx.stepSfx(-1); draw() end },
				{ text = "＋", color = COLORS.blue, onClick = function() Sfx.stepSfx(1); draw() end },
			})
		end
		section("🖥 화면")
		row("항구 보기", if overview then "전경 시점" else "걷기 시점", {
			{ text = if overview then "걷기" else "전경", color = COLORS.blue, onClick = function() overview = not overview; applyView(); draw() end },
		})
		section("📖 도움말")
		row("게임 방법", "교역 · 항해 · 의뢰의 기본 흐름", {
			{ text = if helpOpen then "접기" else "보기", color = COLORS.blue, onClick = function() helpOpen = not helpOpen; draw() end },
		})
		if helpOpen then
			local hl = mkLabel(body, table.concat(H.HELP_LINES, "\n"), 14, COLORS.text, false, nxt())
			hl.Size = UDim2.new(1, -16, 0, 0)
		end
		section("🗂 게임")
		row("저장", "진행은 자동으로 저장돼요", {})
		if view then
			if confirmNew then
				row("정말 새로 시작할까요?", "지금 진행 상황은 사라져요", {
					{ text = "취소", color = COLORS.grey, onClick = function() confirmNew = false; draw() end },
					{ text = "시작", color = COLORS.red, onClick = function()
						closeOptions()
						newGameMode = true
						render()
					end },
				})
			else
				row("새 게임", "나라와 시대를 다시 고릅니다", {
					{ text = "새 게임", color = COLORS.red, onClick = function() confirmNew = true; draw() end },
				})
			end
		end
		local back = mkButton(body, "게임으로 돌아가기", COLORS.gold, UDim2.new(1, -4, 0, 46), closeOptions, true)
		back.LayoutOrder = nxt()
		back.TextSize = 17
		back.TextColor3 = Color3.fromRGB(22, 14, 4)
	end
	draw()
end

-- 원더 연출: 큰 원화가 연필 스케치 → 채색 순서로 스스로 그려지고 음악이 흐른다 (약 10초, 눌러서 건너뛰기)
function H.playWonderScene(cardId)
	local WS = require(Shared:WaitForChild("WonderScenes"))
	local sc = WS.Scenes[cardId]
	local assetId = sc and AssetIds["CardArt/" .. sc.art]
	if not sc or not assetId or H.sceneBusy then
		return
	end
	H.sceneBusy = true
	local TS = game:GetService("TweenService")
	local mood = WS.Moods[sc.mood] or WS.Moods.temple
	local prevMusic = Sfx.current()
	local layer = overlayGui("WonderScene", 60)
	local alive = true
	local root = Instance.new("TextButton")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = Color3.fromRGB(10, 8, 6)
	root.BackgroundTransparency = 1
	root.Text = ""
	root.AutoButtonColor = false
	root.ZIndex = 100
	root.Parent = layer
	TS:Create(root, TweenInfo.new(0.8), { BackgroundTransparency = 0 }):Play()
	-- 16:9 액자
	local frame = Instance.new("Frame")
	frame.AnchorPoint = Vector2.new(0.5, 0.5)
	frame.Position = UDim2.fromScale(0.5, 0.46)
	frame.Size = UDim2.fromScale(0.94, 0.94)
	frame.BackgroundColor3 = Color3.fromRGB(236, 222, 190)
	frame.BackgroundTransparency = 0
	frame.ZIndex = 101
	frame.ClipsDescendants = true
	frame.Parent = root
	local ratio = Instance.new("UIAspectRatioConstraint")
	ratio.AspectRatio = 16 / 9
	ratio.Parent = frame
	local fstroke = Instance.new("UIStroke")
	fstroke.Thickness = 3
	fstroke.Color = Color3.fromRGB(212, 168, 74)
	fstroke.Parent = frame
	local image = "rbxthumb://type=Asset&id=" .. tostring(assetId) .. "&w=768&h=432"
	local N = 14
	local zoom = Instance.new("Frame") -- 천천히 다가가는 화면 (Ken Burns)
	zoom.AnchorPoint = Vector2.new(0.5, 0.5)
	zoom.Position = UDim2.fromScale(0.5, 0.5)
	zoom.Size = UDim2.fromScale(1, 1)
	zoom.BackgroundTransparency = 1
	zoom.ZIndex = 102
	zoom.Parent = frame
	-- 두 겹: 스케치(바랜 갈색, 윗줄부터 붓질처럼) → 채색(왼쪽에서 오른쪽으로 번져 가며)
	local strips = {}
	for i = 1, N do
		local x0 = (i - 1) / N
		local sk = Instance.new("Frame") -- 스케치 줄
		sk.Position = UDim2.fromScale(x0, 0)
		sk.Size = UDim2.new(1 / N + 0.002, 0, 0, 0)
		sk.BackgroundTransparency = 1
		sk.ClipsDescendants = true
		sk.ZIndex = 103
		sk.Parent = zoom
		local ski = Instance.new("ImageLabel")
		ski.BackgroundTransparency = 1
		ski.Image = image
		ski.ImageColor3 = Color3.fromRGB(150, 120, 86)
		ski.ImageTransparency = 0.5
		ski.Position = UDim2.fromScale(-x0 * N, 0)
		ski.Size = UDim2.fromScale(N, 1)
		ski.ZIndex = 103
		ski.Parent = sk
		sk:SetAttribute("full", 1)
		local co = Instance.new("Frame") -- 채색 줄
		co.Position = UDim2.fromScale(x0, 0)
		co.Size = UDim2.new(1 / N + 0.002, 0, 1, 0)
		co.BackgroundTransparency = 1
		co.ClipsDescendants = true
		co.ZIndex = 104
		co.Parent = zoom
		local coi = Instance.new("ImageLabel")
		coi.BackgroundTransparency = 1
		coi.Image = image
		coi.ImageTransparency = 1
		coi.Position = UDim2.fromScale(-x0 * N, 0)
		coi.Size = UDim2.fromScale(N, 1)
		coi.ZIndex = 104
		coi.Parent = co
		strips[i] = { sk = sk, coi = coi }
	end
	local D = WS.Duration
	-- 자막
	local cap = Instance.new("TextLabel")
	cap.AnchorPoint = Vector2.new(0.5, 1)
	cap.Position = UDim2.fromScale(0.5, 0.985)
	cap.Size = UDim2.new(0.9, 0, 0, 74)
	cap.BackgroundTransparency = 1
	cap.TextColor3 = Color3.fromRGB(246, 232, 200)
	cap.TextStrokeTransparency = 0.4
	cap.Font = Enum.Font.Gotham
	cap.TextSize = 17
	cap.TextWrapped = true
	cap.Text = ""
	cap.ZIndex = 110
	cap.Parent = root
	local ttl = Instance.new("TextLabel")
	ttl.AnchorPoint = Vector2.new(0.5, 0)
	ttl.Position = UDim2.fromScale(0.5, 0.02)
	ttl.Size = UDim2.new(0.9, 0, 0, 40)
	ttl.BackgroundTransparency = 1
	ttl.TextTransparency = 1
	ttl.TextColor3 = Color3.fromRGB(246, 214, 120)
	ttl.TextStrokeTransparency = 1
	ttl.Font = Enum.Font.GothamBold
	ttl.TextSize = 28
	ttl.Text = sc.title
	ttl.ZIndex = 110
	ttl.Parent = root
	local hint = Instance.new("TextLabel")
	hint.AnchorPoint = Vector2.new(1, 0)
	hint.Position = UDim2.new(1, -12, 0, 8)
	hint.Size = UDim2.fromOffset(140, 20)
	hint.BackgroundTransparency = 1
	hint.TextColor3 = Color3.fromRGB(180, 168, 140)
	hint.Font = Enum.Font.Gotham
	hint.TextSize = 12
	hint.TextXAlignment = Enum.TextXAlignment.Right
	hint.Text = "화면을 누르면 건너뛰기"
	hint.ZIndex = 110
	hint.Parent = root
	Sfx.music(Sfx.wonderMusic(sc.mood, mood.music))
	Sfx.play(Sfx.wonderCue(sc.mood, mood.sfx))

	local function finish()
		if not alive then
			return
		end
		alive = false
		H.sceneBusy = false
		Sfx.play("sfx_fanfare", 0.6)
		Sfx.music(prevMusic)
		local tw = TS:Create(root, TweenInfo.new(0.6), { BackgroundTransparency = 1 })
		tw:Play()
		for _, d in root:GetDescendants() do
			if d:IsA("ImageLabel") then
				TS:Create(d, TweenInfo.new(0.6), { ImageTransparency = 1 }):Play()
			elseif d:IsA("TextLabel") then
				TS:Create(d, TweenInfo.new(0.6), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
			end
		end
		task.delay(0.7, function()
			layer:Destroy()
		end)
	end
	root.Activated:Connect(finish)

	task.spawn(function()
		task.wait(0.8)
		-- 1) 스케치: 줄마다 위에서 아래로 붓질 (약 3.5초, 줄은 엇갈려 시작)
		for i, s in strips do
			local delay = (i - 1) * 0.12
			task.delay(delay, function()
				if alive then
					TS:Create(s.sk, TweenInfo.new(1.6, Enum.EasingStyle.Sine, Enum.EasingDirection.Out), { Size = UDim2.new(1 / N + 0.002, 0, 1, 0) }):Play()
				end
			end)
		end
		-- 2) 채색: 왼쪽에서 오른쪽으로 색이 번진다 (3초부터 약 4.5초)
		task.delay(3, function()
			for i, s in strips do
				task.delay((i - 1) * 0.2, function()
					if alive then
						TS:Create(s.coi, TweenInfo.new(1.4, Enum.EasingStyle.Sine), { ImageTransparency = 0 }):Play()
					end
				end)
			end
		end)
		-- 천천히 다가가기
		TS:Create(zoom, TweenInfo.new(D, Enum.EasingStyle.Linear), { Size = UDim2.fromScale(1.1, 1.1) }):Play()
		-- 3) 제목과 자막
		task.delay(4.5, function()
			if alive then
				TS:Create(ttl, TweenInfo.new(1), { TextTransparency = 0, TextStrokeTransparency = 0.5 }):Play()
			end
		end)
		for i, line in sc.lines do
			task.delay(5.5 + (i - 1) * 1.4, function()
				if alive then
					cap.Text = line
					cap.TextTransparency = 1
					TS:Create(cap, TweenInfo.new(0.5), { TextTransparency = 0 }):Play()
				end
			end)
		end
		task.wait(D)
		finish()
	end)
end

function H.startNewGame()
	local restart = view ~= nil
	newGameMode = false
	sceneHold = true -- 오프닝이 끝날 때까지 마을 장면을 먼저 짓지 않는다
	local result = call("NewGame", { nationId = chosenNation, startYear = chosenYear, origin = H.chosenOrigin, restart = restart, room = H.roomMode == true })
	if not (result and result.ok) then
		sceneHold = false
	end
	if not (result and result.ok) and restart then
		newGameMode = true
		render()
	end
	-- 프롤로그 없이 곧바로 시작 항구에서 시작한다 (플레이어는 3인칭 이야기 속 새 선장)
	if result and result.ok then
		arriveNext = false
		sceneKey = nil
		sceneHold = false
		main.Visible = true
		menuToggle.Visible = false
		H.openingPending = true
		H.tutorialHidden = false
		render()
	end
end

-- 시작 화면: 백과사전 원화와 표지 제목
local titleGui = overlayGui("TitleBackdrop", -5)
titleGui.Enabled = false
do
	local root = mkBox(titleGui, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), COLORS.cover)
	root.ClipsDescendants = true
	local picture = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), COLORS.cover)
	picture.ClipsDescendants = true
	local art = Instance.new("ImageLabel")
	art.Name = "TitleVoyageIllustration"
	art.AnchorPoint = Vector2.new(0.5, 0.5)
	art.Position = UDim2.fromScale(0.5, 0.5)
	art.Size = UDim2.fromScale(1.06, 1.06)
	art.BackgroundTransparency = 1
	art.Image = "rbxassetid://" .. AssetIds["CardArt/event_calm_seas"]
	art.ScaleType = Enum.ScaleType.Crop
	art.Parent = picture

	local veil = mkBox(picture, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), COLORS.cover)
	veil.ZIndex = 2
	local fade = Instance.new("UIGradient")
	fade.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.54, 1),
		NumberSequenceKeypoint.new(0.78, 0.48), NumberSequenceKeypoint.new(1, 0),
	})
	fade.Parent = veil
	local shade = mkBox(picture, UDim2.fromScale(0, 0), UDim2.fromScale(1, 0.35), Color3.fromRGB(18, 26, 32))
	shade.ZIndex = 2
	local shadeFade = Instance.new("UIGradient")
	shadeFade.Rotation = 90
	shadeFade.Transparency = NumberSequence.new(0.12, 1)
	shadeFade.Parent = shade

	local heading = mkLabel(root, "마레 에센시아", 46, COLORS.paper, true)
	heading.AutomaticSize = Enum.AutomaticSize.None
	heading.TextScaled = true
	heading.TextWrapped = false
	heading.TextStrokeColor3 = COLORS.ink
	heading.TextStrokeTransparency = 0.48
	heading.ZIndex = 4
	local headingLimit = Instance.new("UITextSizeConstraint")
	headingLimit.MaxTextSize = 46
	headingLimit.Parent = heading
	local subtitle = mkLabel(root, "학문의 바다", 19, Color3.fromRGB(251, 223, 167), true)
	subtitle.AutomaticSize = Enum.AutomaticSize.None
	subtitle.TextStrokeColor3 = COLORS.ink
	subtitle.TextStrokeTransparency = 0.45
	subtitle.ZIndex = 4

	local function layout()
		local size = root.AbsoluteSize
		local portrait = size.X < size.Y
		picture.Size = if portrait then UDim2.fromScale(1, 0.72) else UDim2.fromScale(0.70, 1)
		fade.Rotation = if portrait then 90 else 0
		heading.Position = if portrait then UDim2.fromScale(0.07, 0.045) else UDim2.fromScale(0.055, 0.075)
		heading.Size = if portrait then UDim2.new(0.86, 0, 0, 46) else UDim2.new(0.51, 0, 0, 61)
		heading.TextXAlignment = if portrait then Enum.TextXAlignment.Center else Enum.TextXAlignment.Left
		subtitle.Position = heading.Position + UDim2.fromOffset(0, heading.Size.Y.Offset + 2)
		subtitle.Size = UDim2.new(heading.Size.X.Scale, 0, 0, 26)
		subtitle.TextXAlignment = heading.TextXAlignment
	end
	root:GetPropertyChangedSignal("AbsoluteSize"):Connect(layout)
	layout()

	local drift = game:GetService("TweenService"):Create(art, TweenInfo.new(14, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {
		Size = UDim2.fromScale(1.13, 1.13),
		Position = UDim2.fromScale(0.49, 0.49),
	})
	titleGui:GetPropertyChangedSignal("Enabled"):Connect(function()
		if titleGui.Enabled then drift:Play() else drift:Pause() end
	end)
end
-- 타이틀 오른쪽 선택 패널: 나라(3열 카드) → 시대(3칸) → 출항 버튼 순서로, 스크롤 없이 한눈에 보이게 짠다
local GOLD = Color3.fromRGB(226, 182, 92)
local titlePanel = Instance.new("Frame")
titlePanel.Name = "TitlePanel"
titlePanel.AnchorPoint = Vector2.new(1, 0.5)
titlePanel.Position = UDim2.new(1, -14, 0.5, 0)
titlePanel.Size = UDim2.new(0.58, 0, 1, -28)
do
	local lim = Instance.new("UISizeConstraint")
	lim.MaxSize = Vector2.new(720, 9999)
	lim.Parent = titlePanel
end
titlePanel.BackgroundColor3 = COLORS.cover
titlePanel.BackgroundTransparency = 0.08
titlePanel.BorderSizePixel = 0
titlePanel.Visible = false
titlePanel.ZIndex = 10
titlePanel.Parent = titleGui
corner(titlePanel, 16)
do
	local st = Instance.new("UIStroke")
	st.Color = GOLD
	st.Thickness = 2
	st.Parent = titlePanel
end
local titleScroll = Instance.new("ScrollingFrame")
titleScroll.BackgroundTransparency = 1
titleScroll.BorderSizePixel = 0
titleScroll.Size = UDim2.new(1, -8, 1, -8)
titleScroll.Position = UDim2.fromOffset(4, 4)
titleScroll.ScrollBarThickness = 4
titleScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
titleScroll.CanvasSize = UDim2.new()
titleScroll.ZIndex = 11
titleScroll.Parent = titlePanel
do
	local pad = Instance.new("UIPadding")
	pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 12), UDim.new(0, 12)
	pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 14), UDim.new(0, 14)
	pad.Parent = titleScroll
	local ly = Instance.new("UIListLayout")
	ly.Padding = UDim.new(0, 8)
	ly.SortOrder = Enum.SortOrder.LayoutOrder
	ly.Parent = titleScroll
end

local function tLabel(parent, text, size, color, bold, order)
	local l = mkLabel(parent, text, size, color, bold, order)
	l.Size = UDim2.new(1, 0, 0, 0)
	l.ZIndex = 12
	return l
end

renderTitle = function()
	for _, c in titleScroll:GetChildren() do
		if not c:IsA("UIListLayout") and not c:IsA("UIPadding") then
			c:Destroy()
		end
	end
	local order = 0
	local function nxt()
		order += 1
		return order
	end
	local list = {}
	for id, n in PortData.Nations do
		if not n.hidden then
			table.insert(list, n)
		end
	end
	local NATION_ORDER = { "england", "netherlands", "france", "spain", "portugal", "denmark", "sweden", "venice", "ottoman", "swahili", "malabar", "china", "japan", "korea", "new_spain" }
	table.sort(list, function(a, b)
		local ia, ib = table.find(NATION_ORDER, a.id) or 99, table.find(NATION_ORDER, b.id) or 99
		if ia ~= ib then return ia < ib end
		return a.id < b.id
	end)
	local cur = PortData.Nations[chosenNation]
	if not cur or cur.hidden then
		chosenNation = list[1].id
		cur = list[1]
	end

	local head = tLabel(titleScroll, "⚓  항해를 시작하세요  ⚓", 24, GOLD, true, nxt())
	head.TextXAlignment = Enum.TextXAlignment.Center
	do
		local rule = Instance.new("Frame")
		rule.Size = UDim2.new(1, 0, 0, 2)
		rule.BackgroundColor3 = GOLD
		rule.BackgroundTransparency = 0.35
		rule.BorderSizePixel = 0
		rule.LayoutOrder = nxt()
		rule.ZIndex = 12
		rule.Parent = titleScroll
	end
	if message ~= "" then
		tLabel(titleScroll, message, 13, if messageOk then GOLD else COLORS.red, true, nxt())
	end

	-- ① 나라
	tLabel(titleScroll, "① 어느 나라의 항해자로 출발할까요?", 15, COLORS.muted, true, nxt())
	local grid = Instance.new("Frame")
	grid.BackgroundTransparency = 1
	grid.Size = UDim2.new(1, 0, 0, 0)
	grid.AutomaticSize = Enum.AutomaticSize.Y
	grid.LayoutOrder = nxt()
	grid.ZIndex = 12
	grid.Parent = titleScroll
	local gl = Instance.new("UIGridLayout")
	gl.CellSize = UDim2.new(if workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize.Y > workspace.CurrentCamera.ViewportSize.X then 0.5 else 1 / 3, -6, 0, 60)
	gl.CellPadding = UDim2.fromOffset(8, 8)
	gl.SortOrder = Enum.SortOrder.LayoutOrder
	gl.Parent = grid
	for i, n in list do
		local selected = chosenNation == n.id
		local card = Instance.new("TextButton")
		card.LayoutOrder = i
		card.Text = ""
		card.AutoButtonColor = false
		card.BorderSizePixel = 0
		card.ZIndex = 13
		card.BackgroundColor3 = if selected then Color3.fromRGB(58, 46, 22) else Color3.fromRGB(22, 32, 48)
		corner(card, 10)
		local st = Instance.new("UIStroke")
		st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		st.Thickness = if selected then 2.5 else 1
		st.Color = if selected then GOLD else Color3.fromRGB(64, 78, 98)
		st.Parent = card
		local flag = require(Shared:WaitForChild("Flags")).build(card, n.id, 34, 24)
		flag.Position = UDim2.fromOffset(8, 13)
		flag.ZIndex = 14
		for _, d in flag:GetDescendants() do
			if d:IsA("GuiObject") then
				d.ZIndex = 15
			end
		end
		local nm = mkLabel(card, n.name, 15, if selected then GOLD else COLORS.text, true)
		nm.Position = UDim2.fromOffset(48, 6)
		nm.Size = UDim2.new(1, -52, 0, 20)
		nm.AutomaticSize = Enum.AutomaticSize.None
		nm.ZIndex = 14
		local sub = mkLabel(card, "⚓ " .. PortData.Ports[n.startPort].name, 11, COLORS.muted, false)
		sub.Position = UDim2.fromOffset(48, 27)
		sub.Size = UDim2.new(1, -52, 0, 16)
		sub.AutomaticSize = Enum.AutomaticSize.None
		sub.ZIndex = 14
		card.Activated:Connect(function()
			Sfx.play("sfx_click")
			chosenNation = n.id
			renderTitle()
		end)
		card.Parent = grid
	end

	-- 선택한 나라의 주인공 소개
	local box = Instance.new("Frame")
	box.Size = UDim2.new(1, 0, 0, 0)
	box.AutomaticSize = Enum.AutomaticSize.Y
	box.BackgroundColor3 = COLORS.row
	box.BorderSizePixel = 0
	box.LayoutOrder = nxt()
	box.ZIndex = 12
	corner(box, 12)
	do
		local st = Instance.new("UIStroke")
		st.Color = GOLD
		st.Transparency = 0.55
		st.Parent = box
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 8), UDim.new(0, 8)
		pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 8), UDim.new(0, 10)
		pad.Parent = box
		local hl = Instance.new("UIListLayout")
		hl.FillDirection = Enum.FillDirection.Horizontal
		hl.Padding = UDim.new(0, 10)
		hl.Parent = box
	end
	local hp = heroPortrait(box, cur.id, 78, 98)
	hp.ZIndex = 13
	local info = Instance.new("Frame")
	info.BackgroundTransparency = 1
	info.Size = UDim2.new(1, -92, 0, 0)
	info.AutomaticSize = Enum.AutomaticSize.Y
	info.ZIndex = 13
	info.Parent = box
	do
		local ll = Instance.new("UIListLayout")
		ll.Padding = UDim.new(0, 3)
		ll.Parent = info
	end
	local N = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared"):WaitForChild("Narrative"))
	local pro = N.Prologues[cur.id]
	tLabel(info, cur.name, 17, GOLD, true)
	tLabel(info, "출발 항구  " .. PortData.Ports[cur.startPort].name, 12, COLORS.text, true)
	tLabel(info, cur.summary, 12, COLORS.muted, false)

	-- ② 출신 성분
	tLabel(titleScroll, "② 어떤 집안에서 자랐나요?", 15, COLORS.muted, true, nxt())
	do
		local Sp = require(Shared:WaitForChild("Specialties"))
		H.chosenOrigin = H.chosenOrigin or "merchant"
		local og = Instance.new("Frame")
		og.BackgroundTransparency = 1
		og.Size = UDim2.new(1, 0, 0, 0)
		og.AutomaticSize = Enum.AutomaticSize.Y
		og.LayoutOrder = nxt()
		og.ZIndex = 12
		local ogl = Instance.new("UIGridLayout")
		ogl.CellSize = UDim2.new(0.5, -4, 0, 62)
		ogl.CellPadding = UDim2.fromOffset(8, 8)
		ogl.SortOrder = Enum.SortOrder.LayoutOrder
		ogl.Parent = og
		for i, o in Sp.Origins do
			local sel = H.chosenOrigin == o.id
			local b = Instance.new("TextButton")
			b.LayoutOrder = i
			b.Text = ""
			b.AutoButtonColor = false
			b.BorderSizePixel = 0
			b.ZIndex = 13
			b.BackgroundColor3 = if sel then Color3.fromRGB(58, 46, 22) else Color3.fromRGB(22, 32, 48)
			corner(b, 10)
			local bst = Instance.new("UIStroke")
			bst.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			bst.Thickness = if sel then 2.5 else 1
			bst.Color = if sel then GOLD else Color3.fromRGB(64, 78, 98)
			bst.Parent = b
			local n1 = mkLabel(b, o.name, 14, if sel then GOLD else COLORS.text, true)
			n1.Position = UDim2.fromOffset(8, 4)
			n1.Size = UDim2.new(1, -12, 0, 18)
			n1.AutomaticSize = Enum.AutomaticSize.None
			n1.ZIndex = 14
			local n2 = mkLabel(b, o.perkText, 11, COLORS.muted, false)
			n2.Position = UDim2.fromOffset(8, 23)
			n2.Size = UDim2.new(1, -12, 0, 36)
			n2.AutomaticSize = Enum.AutomaticSize.None
			n2.TextWrapped = true
			n2.TextYAlignment = Enum.TextYAlignment.Top
			n2.ZIndex = 14
			b.Activated:Connect(function()
				Sfx.play("sfx_click")
				H.chosenOrigin = o.id
				renderTitle()
			end)
			b.Parent = og
		end
		og.Parent = titleScroll
		local cur2 = Sp.OriginById[H.chosenOrigin]
		if cur2 then
			tLabel(titleScroll, cur2.story, 12, COLORS.muted, false, nxt())
		end
	end

	-- 같이 하기 (방 시계)
	do
		local on = H.roomMode == true
		local ri = H.roomInfo
		local sub = if on then
			(if ri then string.format("지금 열린 방은 %d년 시대예요 (현재 %d년). 같은 시대만 고를 수 있어요.", ri.startYear, ri.year) else "첫 번째로 방을 열어요. 고른 시대로 시작하고, 다른 사람이 들어오면 같은 시계를 써요.")
			else "혼자 하기: 항해할 때마다 날짜가 흘러요."
		local row = mkRow(titleScroll, if on then "같이 하기 · 켜짐" else "같이 하기 · 꺼짐", sub .. "\n(켜면 시대가 현실 시간으로 흘러요: 현실 1분 = 게임 6일)", {
			{ text = if on then "끄기" else "켜기", color = if on then COLORS.grey else COLORS.gold, onClick = function()
				H.roomMode = not on
				if H.roomMode and H.roomInfo then chosenYear = H.roomInfo.startYear end
				renderTitle()
			end },
		}, 88)
		row.LayoutOrder = nxt()
		row.ZIndex = 12
	end

	-- 출발
	local actions = Instance.new("Frame")
	actions.BackgroundTransparency = 1
	actions.Size = UDim2.new(1, 0, 0, 60)
	actions.LayoutOrder = nxt()
	actions.ZIndex = 12
	actions.Parent = titleScroll
	local al = Instance.new("UIListLayout")
	al.FillDirection = Enum.FillDirection.Horizontal
	al.Padding = UDim.new(0, 8)
	al.Parent = actions
	if view then
		local cancel = mkButton(actions, "이어서 하기", Color3.fromRGB(44, 56, 74), UDim2.new(0.28, 0, 1, 0), function()
			newGameMode = false
			render()
		end, true)
		cancel.ZIndex = 13
		cancel.TextSize = 14
	end
	local go = mkButton(actions, "⚓  출항하기", Color3.fromRGB(206, 154, 56), UDim2.new(if view then 0.72 else 1, if view then -8 else 0, 1, 0), H.startNewGame, true)
	go.ZIndex = 13
	go.TextSize = 22
	go.TextColor3 = Color3.fromRGB(22, 14, 4)
	do
		local gst = Instance.new("UIStroke")
		gst.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		gst.Color = Color3.fromRGB(255, 226, 150)
		gst.Thickness = 2
		gst.Parent = go
	end
end

H.wasTitle = false
H.titleMenuOpen = false
function H.setTitleMode(on)
	titleGui.Enabled = on or H.titleMenuOpen
	titlePanel.Visible = on and not H.titleMenuOpen
	local currentCamera = workspace.CurrentCamera
	local screen = if currentCamera then currentCamera.ViewportSize else Vector2.new(1280, 720)
	local portrait = screen.Y > screen.X
	titlePanel.AnchorPoint = if portrait then Vector2.new(0.5, 1) else Vector2.new(1, 0.5)
	titlePanel.Position = if portrait then UDim2.new(0.5, 0, 1, -8) else UDim2.new(1, -14, 0.5, 0)
	titlePanel.Size = if portrait then UDim2.new(0.94, 0, 0.70, 0) else UDim2.new(0.58, 0, 1, -28)
	if on then
		main.Visible = false
	elseif H.wasTitle then
		main.Visible = true
	end
	H.wasTitle = on
end

function render()
	order = 0
	H.clearContent()
	if not audioLock then
		Sfx.portMusic(view and view.player and PortData.Ports[view.player.portId],
			view ~= nil and currentTab == "trade")
		if view then
			Sfx.portAmbient(PortData.Ports[view.player.portId])
		end
	end

	H.setTitleMode(not view or newGameMode)
	if not view or newGameMode then
		headerLabel.Text = "새 게임"
		setPortrait("선장실")
		tabBar.Visible = false
		H.pageDetails.Text = ""
		H.layoutBook()
		if message ~= "" then
			add(function() return mkLabel(content, message, 13, if messageOk then COLORS.gold else COLORS.red, true) end)
		end
		renderTitle()
		return
	end

	tabBar.Visible = true
	H.layoutBook()

	local p, ship = view.player, view.ship
	local grp = groupOf(currentTab)
	setPortrait(grp.name)
	headerLabel.Text = grp.name
	H.pageDetails.Text = string.format("%s · %s\n%s · 선체 %d/%d · 화물 %d/%d",
		p.portName, grp.keeper, ship.name, ship.hull, ship.maxHull, ship.cargoUsed, ship.cargoCapacity)
	coinValue.Text = tostring(p.coins)
	H.updateHud(p, ship)
	H.renderTabs()
	syncScene()

	if message ~= "" then
		add(function() return mkLabel(content, message, 13, if messageOk then COLORS.gold else COLORS.red, true) end)
	end
	RENDERERS[currentTab]()
end

-- 시작 화면: 이어하기 / 새 게임 / 소리 ---------------------------------------------

function H.showTitle()
	local layer = overlayGui("TitleGui", 40)
	local wasMain = main.Visible
	main.Visible = false
	menuToggle.Visible = false
	H.titleMenuOpen = true
	titleGui.Enabled = true
	titlePanel.Visible = false
	local visibility = main:GetPropertyChangedSignal("Visible"):Connect(function()
		if H.titleMenuOpen and main.Visible then main.Visible = false end
	end)
	layer.Destroying:Connect(function() visibility:Disconnect() end)
	local function leave()
		H.titleMenuOpen = false
		layer:Destroy()
	end

	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundTransparency = 1
	root.Parent = layer
	local box = Instance.new("Frame")
	box.BackgroundColor3 = COLORS.leather
	box.BackgroundTransparency = 0.04
	box.BorderSizePixel = 0
	box.Parent = root
	corner(box, 11)
	local edge = Instance.new("UIStroke")
	edge.Color = UI_BRASS
	edge.Thickness = 1.5
	edge.Parent = box
	local bounds = Instance.new("UISizeConstraint")
	bounds.MaxSize = Vector2.new(460, if view then 318 else 230)
	bounds.Parent = box

	local pages = Instance.new("ScrollingFrame")
	pages.Size = UDim2.new(1, -12, 1, -12)
	pages.Position = UDim2.fromOffset(6, 6)
	pages.BackgroundColor3 = COLORS.paper
	corner(pages, 6)
	pages.BorderSizePixel = 0
	pages.ScrollBarThickness = 3
	pages.ScrollBarImageColor3 = UI_BRASS
	pages.ScrollingDirection = Enum.ScrollingDirection.Y
	pages.AutomaticCanvasSize = Enum.AutomaticSize.Y
	pages.CanvasSize = UDim2.new()
	pages.Parent = box
	local pad = Instance.new("UIPadding")
	pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 5), UDim.new(0, 8)
	pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 15), UDim.new(0, 15)
	pad.Parent = pages
	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 8)
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = pages

	local function placeMenu()
		local portrait = root.AbsoluteSize.Y > root.AbsoluteSize.X
		box.AnchorPoint = if portrait then Vector2.new(0.5, 1) else Vector2.new(1, 0.5)
		box.Position = if portrait then UDim2.new(0.5, 0, 1, -22) else UDim2.new(1, -20, 0.53, 0)
		box.Size = if portrait then UDim2.fromScale(0.92, 0.47) else UDim2.new(0.41, 0, 0.84, 0)
	end
	root:GetPropertyChangedSignal("AbsoluteSize"):Connect(placeMenu)
	placeMenu()

	local head = Instance.new("Frame")
	head.LayoutOrder = 1
	head.Size = UDim2.new(1, 0, 0, 52)
	head.BackgroundTransparency = 1
	head.BorderSizePixel = 0
	head.Parent = pages
	pageRule(head, UDim2.new(0, 2, 1, -3), UDim2.new(1, -4, 0, 1))
	local seal = Instance.new("ImageLabel")
	seal.Size = UDim2.fromOffset(34, 34)
	seal.Position = UDim2.fromOffset(10, 9)
	seal.BackgroundTransparency = 1
	seal.ScaleType = Enum.ScaleType.Fit
	seal.Image = "rbxassetid://" .. AssetIds["Menu/chart_compass"]
	seal.ImageColor3 = COLORS.brown
	seal.Parent = head
	local title = mkLabel(head, "선장의 항해 일지", 22, COLORS.ink, true)
	title.Position = UDim2.fromOffset(53, 0)
	title.Size = UDim2.new(1, -60, 1, 0)
	title.AutomaticSize = Enum.AutomaticSize.None
	title.TextYAlignment = Enum.TextYAlignment.Center

	if view then
		local resume = mkButton(pages, "이어하기", COLORS.gold, UDim2.new(1, 0, 0, 50), function()
			leave()
			titleGui.Enabled = false
			main.Visible = wasMain
			menuToggle.Visible = not wasMain
		end)
		resume.LayoutOrder = 2
		resume.TextSize = 18
		resume.TextColor3 = COLORS.ink
		local log = mkLabel(pages, string.format("%s · %d년 · %d코인", view.player.portName, view.player.year, view.player.coins), 13, COLORS.brown, true, 3)
		log.TextXAlignment = Enum.TextXAlignment.Center
	end
	local confirmed = false
	local newBtn
	newBtn = mkButton(pages, "새로운 항해", if view then COLORS.leather else COLORS.gold, UDim2.new(1, 0, 0, 50), function()
		if view and not confirmed then
			confirmed = true
			newBtn.Text = "저장이 사라져요. 한 번 더 누르면 새로 시작"
			newBtn.TextColor3 = COLORS.text
			newBtn.TextSize = 14
			newBtn.BackgroundColor3 = COLORS.red
			return
		end
		leave()
		newGameMode = true
		render()
	end)
	newBtn.LayoutOrder = 4
	newBtn.TextSize = 18
	if not view then newBtn.TextColor3 = COLORS.ink end

	local controls = Instance.new("Frame")
	controls.BackgroundTransparency = 1
	controls.Size = UDim2.new(1, 0, 0, 44)
	controls.LayoutOrder = 5
	controls.Parent = pages
	local horizontal = Instance.new("UIListLayout")
	horizontal.FillDirection = Enum.FillDirection.Horizontal
	horizontal.Padding = UDim.new(0, 8)
	horizontal.Parent = controls
	mkButton(controls, "설정", COLORS.leather, UDim2.new(0.5, -4, 1, 0), function() openOptions() end)
	local function musicLabel()
		return if Sfx.state() then "음악 켜짐" else "음악 꺼짐"
	end
	local musicBtn
	musicBtn = mkButton(controls, musicLabel(), COLORS.leather, UDim2.new(0.5, -4, 1, 0), function()
		Sfx.setMusicEnabled(not Sfx.state())
		musicBtn.Text = musicLabel()
	end)
	Sfx.music("music_harbor")
end

-- 시작 --------------------------------------------------------------------

task.spawn(function()
	for _ = 1, 30 do
		local result = call("State")
		if result and (result.view or result.needsNewGame) then
			H.roomInfo = result.room
			message = ""
			render()
			H.showTitle()
			-- 실제 시작 메뉴가 완성된 뒤에만 로딩 화면을 닫는다.
			if H.startupCover then
				H.startupCover:Destroy()
				H.startupCover = nil
			end
			return
		end
		-- 그 밖의 응답(너무 빨라요 등)은 멈추지 말고 다시 시도한다
		task.wait(0.5)
	end
	message, messageOk = "서버에 연결하지 못했어요", false
	if H.startupLabel then
		H.startupLabel.Text = "서버 연결에 실패했어.\n재접속해서 다시 시도해 줘."
	end
	warn("[MareEssentia] 시작 상태 수신 실패: 게임 시작 메뉴를 열지 않음")
end)

openTab = function(tabId)
	currentTab = tabId
	-- 지도·서책·선장실은 등록된 CC0 효과음이 있을 때만 추가 연출한다.
	if tabId == "map" then
		Sfx.play("sfx_chart_unfold", 0.28)
	elseif tabId == "codex" or tabId == "quest" then
		Sfx.play("sfx_book_turn", 0.24)
	elseif tabId == "crew" then
		Sfx.play("sfx_ship_cabin_door", 0.25)
	end
	if tabId ~= "battle" then
		equipped = nil
	end
	main.Visible = true
	menuToggle.Visible = false
	render()
end

menuToggle.Activated:Connect(function()
	main.Visible = true
	menuToggle.Visible = false
end)


-- 역사 사건: 게임 날짜가 실제 사건의 해에 닿으면 선택 창이 뜬다. 고를 때까지 다른 행동은 계속할 수 있다 (창은 닫기만 하면 잠시 숨는다).
do
	local popupFor, popupGui = nil, nil
	local dismissed = {}
	local histPrev = nil
	local function closePopup()
		if popupGui then
			popupGui:Destroy()
			popupGui = nil
			popupFor = nil
			if histPrev then
				Sfx.music(histPrev)
				histPrev = nil
			end
		end
	end
	local function openPopup(ev)
		closePopup()
		popupFor = ev.id
		histPrev = Sfx.currentName()
		Sfx.music(Sfx.historyMusic(ev)) -- 사건의 종류(전쟁·재난·교역·탐험 등)에 맞는 곡으로 전환
		Sfx.play(Sfx.historyCue(ev), 0.4)
		local layer = overlayGui("HistoryEvent", 55)
		popupGui = layer
		local dim = Instance.new("Frame")
		dim.Size = UDim2.fromScale(1, 1)
		dim.BackgroundColor3 = Color3.new(0, 0, 0)
		dim.BackgroundTransparency = 0.5
		dim.BorderSizePixel = 0
		dim.Parent = layer
		local win = Instance.new("Frame")
		win.AnchorPoint = Vector2.new(0.5, 0.5)
		win.Position = UDim2.fromScale(0.5, 0.5)
		win.Size = UDim2.new(0, 520, 0, 0)
		win.AutomaticSize = Enum.AutomaticSize.Y
		win.BackgroundColor3 = COLORS.cover
		win.BorderSizePixel = 0
		win.Parent = layer
		corner(win, 16)
		local wst = Instance.new("UIStroke")
		wst.Color = BRASS
		wst.Thickness = 2.5
		wst.Parent = win
		local limit = Instance.new("UISizeConstraint")
		limit.MaxSize = Vector2.new(560, 640)
		limit.MinSize = Vector2.new(280, 200)
		limit.Parent = win
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 14), UDim.new(0, 14), UDim.new(0, 16), UDim.new(0, 16)
		pad.Parent = win
		local list = Instance.new("UIListLayout")
		list.Padding = UDim.new(0, 10)
		list.SortOrder = Enum.SortOrder.LayoutOrder
		list.Parent = win
		mkLabel(win, string.format("%d년 · %s", ev.year, ev.tag or "역사"), 13, COLORS.muted, false, 1)
		mkLabel(win, ev.title, 22, Color3.fromRGB(246, 208, 130), true, 2)
		mkLabel(win, ev.text, 15, COLORS.text, false, 3)
		for i, ch in ev.choices do
			local row = Instance.new("Frame")
			row.BackgroundTransparency = 1
			row.Size = UDim2.new(1, 0, 0, 0)
			row.AutomaticSize = Enum.AutomaticSize.Y
			row.LayoutOrder = 3 + i
			row.Parent = win
			local rl = Instance.new("UIListLayout")
			rl.Padding = UDim.new(0, 2)
			rl.Parent = row
			local ok = (view and view.player and view.player.coins or 0) >= ch.cost
			local b = mkButton(row, ch.label, COLORS.gold, UDim2.new(1, 0, 0, 40), function()
				closePopup()
				call("HistoryChoose", { choice = ch.index })
			end, ok)
			b.LayoutOrder = 1
			local hint = mkLabel(row, ch.hint or "", 12, COLORS.muted, false, 2)
			hint.LayoutOrder = 2
		end
		if ev.lockedInsight then
			mkLabel(win, string.format("🔒 %s (지식 필요: %s)", ev.lockedInsight.label, ev.lockedInsight.need), 12, COLORS.muted, false, 18)
		end
		if ev.relatedDisc or (ev.relatedGoods and ev.relatedGoods ~= "") then
			mkLabel(win, string.format("이어진 것 — 학문: %s · 교역품: %s", ev.relatedDisc or "-", if ev.relatedGoods ~= "" then ev.relatedGoods else "-"), 12, COLORS.muted, false, 19)
		end
		if ev.people and #ev.people > 0 then
			local names = {}
			for _, pp in ev.people do
				table.insert(names, pp.name .. (if pp.met then " (만난 적 있음)" else ""))
			end
			mkLabel(win, "얽힌 인물: " .. table.concat(names, ", ") .. " — 만난 적이 있으면 지식 활용 보상이 커져요", 12, COLORS.muted, false, 17)
		end
		local later = mkButton(win, "나중에 정하기", COLORS.grey, UDim2.new(1, 0, 0, 34), function()
			dismissed[ev.id] = true
			closePopup()
		end, true)
		later.LayoutOrder = 20
	end
	task.spawn(function()
		while true do
			task.wait(0.8)
			local hv = view and view.history
			local pend = hv and hv.pending
			if pend and not dismissed[pend.id] and popupFor ~= pend.id and not newGameMode then
				openPopup(pend)
			elseif not pend and popupGui then
				closePopup()
			end
		end
	end)
end

-- 시작 안내: 교역소(이름) → 주점(첫 동료) → 화가(초상화) / 선장 초상 칩
(function()
	local TweenService = game:GetService("TweenService")
	local dlg = nil
	local function closeDlg()
		H.introDlgStep = nil
		if dlg then
			dlg:Destroy()
			dlg = nil
		end
	end
	-- value: "hero:국가" | "npc:항구:칸" → 이미지, 오프셋, 크기
	function H.capPortraitAsset(value)
		if type(value) ~= "string" then
			return nil
		end
		local sheet, idx = string.match(value, "^cp:([%w_]+):(%d+)$")
		if sheet then
			local atlas = AssetIds["Portraits/companions_" .. sheet]
			local c = tonumber(idx)
			if not atlas or not c then
				return nil
			end
			-- 1280x1344 시트는 로블록스가 1024 높이로 줄여 쓰므로 칸 좌표도 같은 비율로 줄인다
			local k = 1024 / 1344
			return atlas, Vector2.new(c % 5 * 256 * k, math.floor(c / 5) * 336 * k), Vector2.new(256 * k, 336 * k)
		end
		local nation = string.match(value, "^hero:([%w_]+)$")
		if nation then
			return H.heroPortraitAsset(nation)
		end
		local port, cell = string.match(value, "^npc:([%w_]+):(%d)$")
		if port then
			return H.npcCellAsset(port, tonumber(cell))
		end
		return nil
	end
	local function portraitImg(parent, value, w, h)
		local atlas, off, size = H.capPortraitAsset(value)
		if not atlas then
			return nil
		end
		local im = Instance.new("ImageLabel")
		im.Size = UDim2.fromOffset(w, h)
		im.BackgroundColor3 = Color3.fromRGB(30, 42, 62)
		im.BorderSizePixel = 0
		im.ScaleType = Enum.ScaleType.Crop
		im.Image = "rbxassetid://" .. tostring(atlas)
		im.ImageRectOffset = off
		im.ImageRectSize = size
		corner(im, 8)
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 2
		st.Parent = im
		im.Parent = parent
		return im
	end

	-- spec: speaker, role, text, input(placeholder), choices(list of {label,value}), portraits(list of values), button
	local function openDlg(spec, onDone)
		closeDlg()
		local layer = overlayGui("IntroDialog", 58)
		dlg = layer
		local dim = Instance.new("Frame")
		dim.Size = UDim2.fromScale(1, 1)
		dim.BackgroundColor3 = Color3.new(0, 0, 0)
		dim.BackgroundTransparency = 0.55
		dim.BorderSizePixel = 0
		dim.Active = true -- 대화 뒤의 탭·버튼이 눌리지 않게 입력을 막는다
		dim.Parent = layer
		local win = Instance.new("Frame")
		win.AnchorPoint = Vector2.new(0.5, 1)
		win.Position = UDim2.new(0.5, 0, 1, -24)
		win.Size = UDim2.new(0, 540, 0, 0)
		win.AutomaticSize = Enum.AutomaticSize.Y
		win.BackgroundColor3 = COLORS.cover
		win.BorderSizePixel = 0
		win.Parent = layer
		corner(win, 16)
		local wst = Instance.new("UIStroke")
		wst.Color = BRASS
		wst.Thickness = 2.5
		wst.Parent = win
		local lim = Instance.new("UISizeConstraint")
		lim.MaxSize = Vector2.new(580, 700)
		lim.MinSize = Vector2.new(280, 120)
		lim.Parent = win
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 14), UDim.new(0, 14), UDim.new(0, 16), UDim.new(0, 16)
		pad.Parent = win
		local list = Instance.new("UIListLayout")
		list.Padding = UDim.new(0, 10)
		list.SortOrder = Enum.SortOrder.LayoutOrder
		list.Parent = win
		mkLabel(win, spec.speaker .. (if spec.role then "  ·  " .. spec.role else ""), 18, Color3.fromRGB(246, 208, 130), true, 1)
		mkLabel(win, spec.text, 15, COLORS.text, false, 2)
		local box
		if spec.input then
			box = Instance.new("TextBox")
			box.Size = UDim2.new(1, 0, 0, 40)
			box.BackgroundColor3 = Color3.fromRGB(26, 38, 58)
			box.BorderSizePixel = 0
			box.TextColor3 = COLORS.text
			box.PlaceholderText = spec.input
			box.PlaceholderColor3 = COLORS.muted
			box.Text = ""
			box.TextSize = 18
			box.Font = Enum.Font.GothamBold
			box.ClearTextOnFocus = false
			box.LayoutOrder = 3
			corner(box, 8)
			box.Parent = win
		end
		local picked = nil
		if spec.portraits then
			local grid = Instance.new("Frame")
			grid.BackgroundTransparency = 1
			grid.Size = UDim2.new(1, 0, 0, 0)
			grid.AutomaticSize = Enum.AutomaticSize.Y
			grid.LayoutOrder = 3
			local gl = Instance.new("UIGridLayout")
			gl.CellSize = UDim2.fromOffset(84, 84)
			gl.CellPadding = UDim2.fromOffset(8, 8)
			gl.SortOrder = Enum.SortOrder.LayoutOrder
			gl.Parent = grid
			local frames = {}
			for i, v in spec.portraits do
				local cell = Instance.new("TextButton")
				cell.LayoutOrder = i
				cell.Text = ""
				cell.AutoButtonColor = false
				cell.BackgroundTransparency = 1
				cell.BorderSizePixel = 0
				local im = portraitImg(cell, v, 84, 84)
				local st = im and im:FindFirstChildOfClass("UIStroke")
				frames[v] = st
				cell.Activated:Connect(function()
					Sfx.play("sfx_click")
					picked = v
					for pv, pst in frames do
						pst.Color = if pv == v then Color3.fromRGB(120, 230, 140) else Color3.fromRGB(214, 170, 82)
						pst.Thickness = if pv == v then 4 else 2
					end
				end)
				cell.Parent = grid
			end
			grid.Parent = win
		end
		local note = mkLabel(win, "", 13, Color3.fromRGB(240, 150, 120), false, 4)
		local submit
		local go = mkButton(win, spec.button or "확인", COLORS.gold, UDim2.new(1, 0, 0, 42), function() submit() end, true)
		function submit()
			local value = nil
			if box then
				value = box.Text
				-- Studio 자동 점검은 글자를 입력할 수 없다: 비워 두면 기본 이름으로 진행한다
				if (value == nil or string.match(value, "^%s*$")) and game:GetService("RunService"):IsStudio() then
					value = "새 선장"
				end
			elseif spec.portraits then
				value = picked
				if not value and game:GetService("RunService"):IsStudio() and spec.portraits[1] then
					value = spec.portraits[1] -- Studio 자동 점검은 초상을 고를 수 없어 첫 초상으로 진행
				end
				if not value then
					note.Text = "마음에 드는 초상을 골라 주세요"
					return
				end
			end
			local okCall, ok, msg = pcall(onDone, value)
			if not okCall then
				-- 서버에는 이미 반영됐을 수 있으니 화면이 멈추지 않게 다음 단계로 넘어갈 수 있게 한다
				warn("[Game] 시작 안내 대화 오류:", ok)
				note.Text = "화면 처리 중 문제가 생겼어요. 다시 눌러 주세요."
				if view and view.captain and view.captain.portrait and spec.portraits then
					closeDlg()
				end
			elseif ok == nil then
				note.Text = "서버 응답이 늦어요. 잠시 후 다시 눌러 주세요."
			elseif ok == false and msg == "너무 빨라요" and (spec.retries or 0) < 5 then
				spec.retries = (spec.retries or 0) + 1
				note.Text = ""
				task.delay(0.7, function() if dlg == layer then submit() end end) -- 조용히 몇 번 더
			elseif ok == false then
				note.Text = tostring(msg or "")
				if msg == "이미 초상화를 받았어요" or msg == "이미 장부에 올렸어요" then
					closeDlg()
				end
			end
		end
		go.LayoutOrder = 5
		if workspace:GetAttribute("QAAutoIntro") then
			-- Studio 자동 점검: 클릭 좌표가 어긋나도 안내 대화가 스스로 넘어가게 한다
			task.spawn(function()
				for _ = 1, 4 do
					task.wait(1.2)
					if dlg ~= layer then return end
					submit()
				end
			end)
		end
		if box then
			-- 엔터로도 확인한다
			box.FocusLost:Connect(function(enterPressed)
				if enterPressed and dlg == layer then
					submit()
				end
			end)
		end
	end

	-- 화면 왼쪽 선장 초상 칩 (초상화를 받으면 얼굴, 그 전에는 국기). 위쪽 정보창 아래에 둔다.
	local chipGui = overlayGui("CaptainChip", 12)
	local chip = Instance.new("Frame")
	chip.AnchorPoint = Vector2.new(0, 0)
	chip.Position = UDim2.fromOffset(5, 5)
	chip.Size = UDim2.fromOffset(52, 56)
	chip.BackgroundColor3 = COLORS.cover
	chip.BackgroundTransparency = 0
	chip.BorderSizePixel = 0
	chip.Visible = false
	chip.Parent = H.hudCard
	corner(chip, 8)
	do
		local cst = Instance.new("UIStroke")
		cst.Color = BRASS
		cst.Thickness = 1.5
		cst.Parent = chip
	end
	local chipKey = nil
	local chipName = mkLabel(chip, "", 13, Color3.fromRGB(246, 208, 130), true)
	chipName.AnchorPoint = Vector2.new(0.5, 0)
	chipName.Visible = false
	chipName.Position = UDim2.new(0.5, 0, 0, 104)
	chipName.Size = UDim2.new(1, -8, 0, 18)
	chipName.AutomaticSize = Enum.AutomaticSize.None
	chipName.TextXAlignment = Enum.TextXAlignment.Center
	chipName.TextTruncate = Enum.TextTruncate.AtEnd
	local chipSub = mkLabel(chip, "", 10, COLORS.muted, false)
	chipSub.AnchorPoint = Vector2.new(0.5, 0)
	chipSub.Visible = false
	chipSub.Position = UDim2.new(0.5, 0, 0, 123)
	chipSub.Size = UDim2.new(1, -8, 0, 16)
	chipSub.AutomaticSize = Enum.AutomaticSize.None
	chipSub.TextXAlignment = Enum.TextXAlignment.Center
	chipSub.TextTruncate = Enum.TextTruncate.AtEnd
	chipSub.TextColor3 = Color3.fromRGB(150, 205, 255)
	local chipSub2 = mkLabel(chip, "", 10, COLORS.muted, false)
	chipSub2.AnchorPoint = Vector2.new(0.5, 0)
	chipSub2.Visible = false
	chipSub2.Position = UDim2.new(0.5, 0, 0, 142)
	chipSub2.Size = UDim2.new(1, -8, 0, 16)
	chipSub2.AutomaticSize = Enum.AutomaticSize.None
	chipSub2.TextXAlignment = Enum.TextXAlignment.Center
	chipSub2.TextTruncate = Enum.TextTruncate.AtEnd
	local function refreshChip()
		local c = view and view.captain
		local show = c ~= nil and not newGameMode
		chip.Visible = show
		if not show then
			return
		end
		local key = tostring(c.portrait) .. "|" .. tostring(c.name) .. "|" .. tostring(view.player and view.player.nation) .. "|" .. tostring(view.player and view.player.year)
		if key == chipKey then
			return
		end
		chipKey = key
		for _, ch in chip:GetChildren() do
			if ch.Name == "ChipFace" then
				ch:Destroy()
			end
		end
		chipName.Text = c.name or "선장"
		chipSub.Text = "🏳 " .. tostring(view.player.nation)
		chipSub2.Text = if c.origin then c.origin.name else ""
		local face = portraitImg(chip, c.portrait, 52, 56)
		if not face then
			local nid = nil
			for id, n in PortData.Nations do
				if n.name == view.player.nation then
					nid = id
				end
			end
			face = require(Shared:WaitForChild("Flags")).build(chip, nid, 48, 34)
			face.Position = UDim2.fromOffset(2, 11)
		else
			face.Position = UDim2.fromOffset(0, 0)
		end
		face.Name = "ChipFace"
	end

	-- 화가가 완성한 초상을 크게 보여 준 뒤 칩으로 줄어든다
	local function reveal(value, name)
		local layer = overlayGui("PortraitReveal", 59)
		local big = portraitImg(layer, value, 240, 300)
		Sfx.play("sfx_fanfare", 0.6)
		if big then
			big.AnchorPoint = Vector2.new(0.5, 0.5)
			big.Position = UDim2.fromScale(0.3, 0.45)
			local cap = mkLabel(layer, name, 22, Color3.fromRGB(246, 208, 130), true)
			cap.AnchorPoint = Vector2.new(0.5, 0)
			cap.Position = UDim2.new(0.3, 0, 0.45, 170)
			cap.Size = UDim2.fromOffset(300, 30)
			cap.AutomaticSize = Enum.AutomaticSize.None
			cap.TextXAlignment = Enum.TextXAlignment.Center
			task.wait(2.4)
			TweenService:Create(big, TweenInfo.new(0.6), { Size = UDim2.fromOffset(90, 96), Position = UDim2.new(0, 60, 0.4, 55) }):Play()
			task.wait(0.7)
		end
		layer:Destroy()
	end

	local function nationPortraits()
		local out = {}
		local nid = nil
		for id, n in PortData.Nations do
			if n.name == view.player.nation then
				nid = id
			end
		end
		for _, v in H.captainChoices[nid or ""] or {} do
			table.insert(out, v)
		end
		if #out == 0 then
			for id in PortData.Nations do
				table.insert(out, "hero:" .. id)
			end
			table.sort(out)
		end
		return out
	end

	local function runStep(step)
		task.defer(function() H.introDlgStep = step end) -- 안내창이 열린 뒤에 기록한다 (closeDlg가 지우므로)
		local c = view.captain
		local role = if step == "name" then "상인 길드" elseif step == "companion" then "주점" else "떠돌이 화가"
		if step == "name" then
			openDlg({ speaker = "길드 서기", role = role, input = "이름을 적으세요 (12글자까지)", button = "장부에 올린다",
				text = "(배에서 내리는 당신에게 상인 길드의 서기가 다가온다) 처음 보는 얼굴이군요. 이 항구에서 거래하려면 거래 장부에 이름이 있어야 합니다. 값을 치르고 영수증을 받는 사람의 이름이니까요. 뭐라고 적을까요?" },
				function(v)
					local r = call("IntroName", { name = v })
					if r and r.ok then
						closeDlg()
					end
					return r and r.ok, r and r.message
				end)
		elseif step == "companion" then
			local who = c.companion
			if not who then
				call("IntroCompanion", {})
				return
			end
			openDlg({ speaker = who.name, role = who.role, button = "함께 가자",
				text = string.format("(주점 구석에서 다가온다) 당신이 새로 온 선장이군요. 소문을 들었어요. 대가는 필요 없습니다. 같은 고향 사람끼리, 항해에 보탬이 되고 싶어요. 저를 태워 주시겠어요? (%s)", who.role) },
				function()
					local r = call("IntroCompanion", {})
					if r and r.ok then
						closeDlg()
					end
					return r and r.ok, r and r.message
				end)
		else
			openDlg({ speaker = "떠돌이 화가", role = role, portraits = nationPortraits(), button = "이 얼굴로 그려 주세요",
				text = string.format("%s 선장님이시죠? 저는 항구를 떠돌며 항해자 화첩을 만들고 있어요. 바다로 나간 사람들의 얼굴을 남기면, 훗날 그들의 이야기가 사라지지 않거든요. 대가는 받지 않을게요. 어떤 모습으로 그려 드릴까요?", c.name or "선장") },
				function(v)
					local name = c.name or "선장"
					local r = call("IntroPortrait", { portrait = v })
					if r and r.ok then
						closeDlg()
						task.spawn(function()
							reveal(v, name)
						end)
					end
					return r and r.ok, r and r.message
				end)
		end
	end

	-- 오프닝 이벤트 장면: 시작 항구에 닿자마자 3인칭 서술로 이야기를 열고, 곧바로 이름·동료·초상 안내로 이어진다
	function H.openingScene()
		local pro = require(Shared:WaitForChild("Narrative")).Prologues[chosenNation]
		local portName = view and view.player and PortData.Ports[view.player.portId] and PortData.Ports[view.player.portId].name or "항구"
		openDlg({ speaker = "이야기", role = (pro and pro.title) or ("프롤로그 · " .. portName),
			text = (pro and pro.text) or (portName .. " 부두에 새 선장이 첫발을 디딘다."), button = "항해를 시작한다" },
			function()
				closeDlg()
				Sfx.play("sfx_fanfare", 0.5)
				H.openingPending = false
				return true
			end)
	end

	-- 첫걸음 안내 띠: 지금 할 일을 한 줄로 보여 준다 (끝나면 사라진다)
	local goalGui = overlayGui("TutorialGoal", 11)
	local goalBar = Instance.new("TextButton")
	goalBar.AnchorPoint = Vector2.new(0.5, 0)
	goalBar.Position = UDim2.new(0.5, 0, 0, 6)
	goalBar.Size = UDim2.fromOffset(430, 28)
	goalBar.BackgroundColor3 = COLORS.cover
	goalBar.BackgroundTransparency = 0.1
	goalBar.AutoButtonColor = false
	goalBar.Font = Enum.Font.GothamBold
	goalBar.TextSize = 13
	goalBar.TextColor3 = Color3.fromRGB(246, 208, 130)
	goalBar.TextStrokeTransparency = 1 -- 작은 글자에 테두리가 겹쳐 번져 보이던 문제
	goalBar.TextTruncate = Enum.TextTruncate.AtEnd
	goalBar.Text = ""
	goalBar.Visible = false
	goalBar.Parent = goalGui
	corner(goalBar, 14)
	do
		local gs = Instance.new("UIStroke")
		gs.Color = BRASS
		gs.Thickness = 1.5
		gs.Parent = goalBar
	end
	goalBar.Activated:Connect(function()
		H.tutorialHidden = true
	end)
	local function refreshGoal()
		local c = view and view.captain
		if not c or newGameMode or H.tutorialHidden or H.openingPending or dlg then -- 안내 창이 열려 있으면 같은 말을 띠로 또 보이지 않는다
			goalBar.Visible = false
			return
		end
		local p, ship = view.player, view.ship
		local sailed = p and (p.day or 0) > 0
		local goals = {
			{ done = c.step ~= "name", text = "상인 길드 서기에게 이름을 올리세요" },
			{ done = c.step == "portrait" or c.step == "done", text = "주점 동료를 맞이하세요" },
			{ done = c.step == "done", text = "떠돌이 화가에게 초상을 받으세요" },
			{ done = sailed or (ship and ship.cargoUsed or 0) > 0, text = "교역 탭에서 이 항구의 특산품을 사세요" },
			{ done = sailed, text = "지도 탭에서 다른 항구로 출항하세요" },
		}
		local n, next_ = 0, nil
		for _, g in goals do
			if g.done then n += 1 elseif not next_ then next_ = g end
		end
		if not next_ then
			H.tutorialHidden = true
			goalBar.Visible = false
			return
		end
		goalBar.Visible = main.Visible
		goalBar.Text = string.format("▶ 첫걸음 %d/%d · %s  (눌러서 닫기)", n, #goals, next_.text)
	end

	task.spawn(function()
		local last = nil
		local openingShown = false
		while true do
			task.wait(0.7)
			pcall(refreshChip)
			pcall(refreshGoal)
			-- 중요 인물이 항구에서 찾아오면 일러스트 연출 장면이 저절로 열린다
			if view and view.autoStory and view.autoStory ~= H.autoStoryShown and not newGameMode and not sceneHold and not dlg and not H.openingPending and main.Visible and not workspace:FindFirstChild("StoryScene", true) then
				for _, ev in view.story or {} do
					if ev.id == view.autoStory then
						H.autoStoryShown = ev.id
						pcall(playStory, ev)
						break
					end
				end
			end
			if H.openingPending and not openingShown and view and not newGameMode and not sceneHold and not dlg and main.Visible then
				openingShown = true
				pcall(H.openingScene)
			end
			if not H.openingPending then
				openingShown = false
			end
			local c = view and view.captain
			-- 서버에서 이미 다음 단계로 넘어갔는데 옛 안내창이 남아 있으면 닫는다 (화면에 갇히지 않게)
			if dlg and c and H.introDlgStep and c.step ~= H.introDlgStep and not H.openingPending then
				H.introDlgStep = nil
				closeDlg()
			end
			if c and not newGameMode and not sceneHold and not dlg and c.step ~= "done" then
				local want = main.Visible and not H.openingPending
				if want and last ~= c.step then
					last = c.step
					task.wait(0.4)
					if view and view.captain and view.captain.step == c.step and not dlg then
						local ok, err = pcall(runStep, c.step)
						if not ok then
							warn("[Game] 시작 안내 오류:", err)
						end
					end
				elseif not want then
					last = nil
				end
			end
		end
	end)
end)()

-- 개발 캡처용: 로컬에서 "DevCall" 속성에 State 를 넣으면 화면을 서버 상태로 새로 그린다 (읽기 전용 요청만)
task.spawn(function()
	while true do
		task.wait(1)
		if workspace:GetAttribute("DevCall") == "State" then
			workspace:SetAttribute("DevCall", nil)
			call("State")
		end
		if workspace:GetAttribute("DevCall") == "StoryPick" then
			workspace:SetAttribute("DevCall", nil)
			local ok, err = pcall(function()
				return call("PlayStory", { eventId = view.story[1].id, choice = 1 })
			end)
			workspace:SetAttribute("DevResult", tostring(ok) .. " " .. tostring(if type(err) == "table" then err.message else err))
		end
		if workspace:GetAttribute("DevCall") == "Hall" then
			workspace:SetAttribute("DevCall", nil)
			openTradeHall()
		end
		local dc = workspace:GetAttribute("DevCall")
		if dc == "Yard" then
			workspace:SetAttribute("DevCall", nil)
			openYardHall()
		elseif dc == "Options" then
			workspace:SetAttribute("DevCall", nil)
			openOptions()
		elseif dc == "Tactics" then
			-- 개발 캡처용: 서버에 열려 있는 지상 전술 전투 화면을 바로 연다(탐험 탭을 거치지 않는다)
			workspace:SetAttribute("DevCall", nil)
			if view and view.tactics then
				local okOpen, errOpen = pcall(function()
					require(Shared:WaitForChild("TacticsView")).open({
						battle = view.tactics,
						invoke = function(a, p)
							return call(a, p)
						end,
						onClose = function() end,
					})
				end)
				workspace:SetAttribute("DevResult", "TACTICS_OPEN " .. tostring(okOpen) .. " " .. tostring(errOpen))
			else
				workspace:SetAttribute("DevResult", "TACTICS_OPEN no battle in view")
			end
		elseif type(dc) == "string" and string.sub(dc, 1, 7) == "CodexK_" then
			-- 개발 캡처용: 백과사전의 지식 트리 화면(개요 또는 학문 상세)을 바로 연다
			workspace:SetAttribute("DevCall", nil)
			local which = string.sub(dc, 8)
			codexField = if which == "overview" then nil else "k:" .. which
			openTab("codex")
		elseif type(dc) == "string" and string.sub(dc, 1, 4) == "Tab_" then
			workspace:SetAttribute("DevCall", nil)
			openTab(string.sub(dc, 5))
		end
	end
end)

-- 시작 직후(항구 정보가 오기 전)에도 고정 시점 카메라를 쓰고 캐릭터를 치워, 빈 하늘에 캐릭터만 떠 보이지 않게 한다
task.spawn(function()
	for _ = 1, 40 do
		if player.Character and player.Character:FindFirstChild("HumanoidRootPart") then break end
		task.wait(0.25)
	end
	local ok, err = pcall(applyView)
	if not ok then warn("[Game] 시작 시점 설정 실패", err) end
end)
