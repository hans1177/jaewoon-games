--!nonstrict
-- 클라이언트 UI: 서버(GameAction)가 보내 준 스냅샷(view)을 표시하고 요청만 보낸다.
-- 판정은 모두 서버가 하므로 여기서는 값을 계산해 믿지 않는다.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
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

-- 디자인 시스템: 짙은 남색 바탕 + 가죽빛 행 + 황동 테두리 + 양피지빛 글씨 (대항해시대 풍)
local COLORS = {
	text = Color3.fromRGB(246, 238, 220),
	muted = Color3.fromRGB(176, 166, 146),
	row = Color3.fromRGB(34, 36, 44),
	blue = Color3.fromRGB(58, 98, 150),
	green = Color3.fromRGB(70, 140, 92),
	red = Color3.fromRGB(168, 66, 58),
	gold = Color3.fromRGB(226, 176, 78),
	grey = Color3.fromRGB(70, 72, 82),
	steam = Color3.fromRGB(150, 110, 70),
}
local UI_BRASS = Color3.fromRGB(214, 170, 82)
local UI_BRASS_DARK = Color3.fromRGB(120, 92, 44)

local AMOUNTS = { 1, 5, 10 }
local TABS = {
	{ id = "status", name = "상태" },
	{ id = "trade", name = "교역" },
	{ id = "harbor", name = "항구" },
	{ id = "map", name = "지도" },
	{ id = "route", name = "항해" },
	{ id = "yard", name = "조선소" },
	{ id = "explore", name = "탐험" },
	{ id = "codex", name = "백과사전" },
	{ id = "tech", name = "연구" },
	{ id = "quest", name = "퀘스트" },
	{ id = "battle", name = "전투" },
}

-- 시설별 창: 건물에 들어가면 그 시설의 탭만 열린다
local GROUPS = {
	{ name = "교역소", keeper = "상인 길드", tabs = { "trade", "harbor" } },
	{ name = "항만청", keeper = "항만 관리관", tabs = { "route", "map" } },
	{ name = "조선소", keeper = "조선 장인", tabs = { "yard" } },
	{ name = "주점", keeper = "주점 주인", tabs = { "quest", "explore", "battle" } },
	{ name = "학자의 서재", keeper = "학자", tabs = { "codex", "tech" } },
	{ name = "선장실", keeper = "선장", tabs = { "status" } },
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
local overview = true -- 항구 전경(고정 시점) / 걷기 전환
local sceneSpawn = nil
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
local chosenYear = 1700
local newGameMode = false -- 저장된 게임이 있어도 새로 시작하는 선택 화면을 보여 준다

local gui = Instance.new("ScreenGui")
gui.Name = "MareEssentiaGui"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

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

-- 교역품: 상품 ID마다 전용 고해상도 그림을 사용한다. 다른 물건의 모델을 대체 표시하지 않는다.
local GOOD_ICON = {}
-- [내용 검수] 주류 자체를 묘사하지 않고 승인된 원료(보리·홉, 벼 이삭)만 표시한다.
-- 해당 이미지가 아직 체험에 등록되지 않았으면 일반 교역 아이콘을 사용한다.
local SAFE_INGREDIENT_ICON = { beer = "beer_grain", sake = "sake_rice" }
for id in PortData.Goods do
	local ingredient = SAFE_INGREDIENT_ICON[id]
	if ingredient then
		GOOD_ICON[id] = if AssetIds["Goods/" .. ingredient] then { "Goods", ingredient } else { "Menu", "trade" }
	else
		GOOD_ICON[id] = if id == "wine" or id == "tobacco" then { "Menu", "trade" } else { "Goods", id }
	end
end
-- 승인된 그림이 없는 상품 중, 같은 물건의 3D 모델이 있는 것은 그것을 쓴다
local WOOD = Color3.fromRGB(120, 78, 50)
for id, spec in {
	gold = { "Cargo", "gold-bar" }, silver = { "Cargo", "silver-bar" }, copper = { "Cargo", "copper-bar" },
	gems = { "Cargo", "gems-sack" }, jade = { "Cargo", "gem-medium", Color3.fromRGB(80, 170, 120) },
	pearl_shell = { "Cargo", "mussel-open" },
	mahogany = { "Cargo", "wood-log-a", Color3.fromRGB(110, 54, 40) }, ebony = { "Cargo", "wood-log-a", Color3.fromRGB(40, 32, 30) },
	kauri = { "Cargo", "wood-log-a", Color3.fromRGB(176, 132, 82) }, logwood = { "Cargo", "wood-log-a", Color3.fromRGB(120, 50, 70) },
	brazilwood = { "Cargo", "wood-log-a", Color3.fromRGB(160, 62, 48) }, sandalwood = { "Cargo", "wood-log-a", Color3.fromRGB(190, 150, 96) },
	sandalwood_hi = { "Cargo", "wood-log-a", Color3.fromRGB(200, 160, 100) },
	palm_oil = { "Cargo", "barrel-open" }, rum = { "Cargo", "barrel", Color3.fromRGB(104, 62, 36) },
	cocoa = { "Cargo", "chocolate" }, maize = { "Cargo", "corn" },
	-- 주류 묘사는 Roblox 기준상 제한되어, 술병·술잔 대신 재료(포도·보리·벼) 그림으로 보여 준다
	-- 술 종류는 모두 나무통으로 통일하고 색만 달리한다 (주류 묘사 제한)
	beer = { "Cargo", "barrel", Color3.fromRGB(196, 138, 46) }, wine = { "Cargo", "barrel", Color3.fromRGB(112, 32, 54) },
	sake = { "Cargo", "barrel", Color3.fromRGB(226, 214, 186) },
} do
	GOOD_ICON[id] = spec
end
-- [3D 교역품] 승인된 원본 Cargo 메시가 실제 상품과 일치할 때만 상세 아이콘에 재사용한다.
-- 작은 목록은 동일 상품의 원본 Image를 2.5D 카드로 표시해 모바일 렌더 부하를 제한한다.
for goodsId, cargoAsset in {
	cheese = "cheese", cloth = "textiles-a", coffee = "cup-coffee", fish = "fish",
	glass = "glass", iron = "iron-bars", olive_oil = "bottle-oil", pepper = "pepper-mill",
	salt = "shaker-salt", tea = "cup-tea", timber = "wood-log-stack",
} do
	if AssetIds["Cargo/" .. cargoAsset] and AssetIds["Goods/" .. goodsId] then
		GOOD_ICON[goodsId] = { "Cargo", cargoAsset, nil, "Goods/" .. goodsId }
	end
end

-- 줄 제목·부제 글자로 알맞은 아이콘을 고른다 (항구·퀘스트·도감 창)
local TITLE_ICONS = {
	{ "식물", "Cargo", "apple" }, { "동물", "Cargo", "fish-large" }, { "광물", "Relics", "coin" }, { "유물", "Relics", "pot" },
	{ "유적", "Castle", "tower-square-base" }, { "천문", "Relics", "key" }, { "화학", "Relics", "potion" }, { "물리", "Cargo", "bucket" },
	{ "지리", "Naval", "ship-small" }, { "철학", "Interior", "bookcaseclosed" }, { "의학", "Cargo", "mortar-pestle" }, { "신화", "Relics", "weapon-sword" },
	{ "항해술", "Naval", "ship-medium" }, { "기상", "Naval", "flag-pennant" }, { "건축", "Town", "house" }, { "예술", "Relics", "shield-round" },
	{ "교역품", "Cargo", "box-open" }, { "조선", "Naval", "ship-large" }, { "언어", "Interior", "bookcaseopenlow" },
}
local TEXT_ICONS = {
	{ "코인 투자", "Relics", "coin" }, { "예금", "Relics", "coin" }, { "→", "Cargo", "box-open" }, { "면허", "Relics", "shield-round" },
	{ "보험", "Relics", "shield-rectangle" }, { "알현", "Castle", "flag-banner-short" }, { "소문", "Cargo", "mug" },
	{ "납품", "Cargo", "box-open" }, { "해전", "Relics", "weapon-sword" }, { "승리", "Relics", "weapon-sword" }, { "방문", "Naval", "ship-small" },
	{ "연구", "Relics", "potion" }, { "도감 카드", "Relics", "key" }, { "카드", "Relics", "key" }, { "발견", "Relics", "key" },
	{ "이야기", "Relics", "key" },
}
local H: { [string]: any } = {}

function H.iconFor(title, subtitle)
	for _, t in TITLE_ICONS do
		if string.find(title, t[1], 1, true) then
			return t
		end
	end
	local both = title .. " " .. (subtitle or "")
	for _, t in TEXT_ICONS do
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

-- 아이템 표시 연출: 큰 3D 아이템은 천천히 회전(3D), 큰 상품 그림은 기울기·숨쉬기(2.5D 카드)로 입체감을 준다.
-- 화면에 남아 있는 것만, 최대 10개까지 한 곳에서 갱신해 모바일 부담을 막는다. (새 도형은 만들지 않고 기존 모델·그림만 움직인다)
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
				if e.model then
					local a = t * 0.8 + e.phase
					e.model:PivotTo(CFrame.new(e.center) * CFrame.Angles(0, a, 0) * CFrame.new(-e.center) * e.base)
				else
					e.gui.Rotation = math.sin(t * 1.3 + e.phase) * 3.5
					if e.scale then e.scale.Scale = 1 + math.sin(t * 1.9 + e.phase) * 0.03 end
				end
			end
		end
		if #itemMotion == 0 and itemMotionConn then
			itemMotionConn:Disconnect()
			itemMotionConn = nil
		end
	end)
end

local function modelIcon(parent, kind, asset, tint, px, labelText, smallArt, portraitOffset)
	if kind == "Portraits" and portraitOffset and AssetIds["Portraits/" .. asset] then
		local portrait = Instance.new("ImageLabel")
		portrait.Size = UDim2.fromOffset(px, px)
		portrait.BorderSizePixel = 0
		portrait.BackgroundTransparency = 1
		portrait.Image = "rbxassetid://" .. tostring(AssetIds["Portraits/" .. asset])
		portrait.ImageRectOffset = portraitOffset
		portrait.ImageRectSize = Vector2.new(256, 336)
		portrait.ScaleType = Enum.ScaleType.Crop
		corner(portrait, 8)
		portrait.Parent = parent
		return portrait
	end
	-- [3D 통일] 3D 모델이 있는 상품은 작은 목록과 상세 모두 같은 3D 모델로 보여 준다 (그림과 모델이 섞여 보이지 않게).
	if kind == "Goods" or kind == "Menu" then
		local card = Instance.new("Frame")
		card.Name = kind .. "_" .. asset
		card.Size = UDim2.fromOffset(px, px)
		card.BackgroundColor3 = Color3.fromRGB(24, 37, 53)
		card.BorderSizePixel = 0
		corner(card, 8)
		local gradient = Instance.new("UIGradient")
		gradient.Color = ColorSequence.new(Color3.fromRGB(39, 50, 65), Color3.fromRGB(17, 23, 35))
		gradient.Rotation = 90
		gradient.Parent = card
		local assetId = AssetIds[kind .. "/" .. asset]
		if assetId then
			-- [2.5D] 같은 승인 원본의 그림·그림자층만 겹친다. 파츠·가짜 모델 생성 없음.
			local imageId = "rbxassetid://" .. tostring(assetId)
			local depth = math.max(2, math.floor(px * 0.07))
			local shadow = Instance.new("ImageLabel")
			shadow.Name = "DepthShadow"
			shadow.Size = UDim2.new(1, -depth, 1, -depth)
			shadow.Position = UDim2.fromOffset(depth, depth)
			shadow.BackgroundTransparency = 1
			shadow.Image = imageId
			shadow.ImageColor3 = Color3.fromRGB(10, 12, 20)
			shadow.ImageTransparency = 0.35
			shadow.ScaleType = Enum.ScaleType.Fit
			shadow.Parent = card
			local art = Instance.new("ImageLabel")
			art.Name = "OriginalArt"
			art.Size = UDim2.new(1, -depth, 1, -depth)
			art.BackgroundTransparency = 1
			art.Image = imageId
			art.ScaleType = Enum.ScaleType.Fit
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
			nameTile.TextColor3 = Color3.fromRGB(232, 209, 154)
			local pad = Instance.new("UIPadding")
			pad.PaddingLeft, pad.PaddingRight, pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 5), UDim.new(0, 5), UDim.new(0, 8), UDim.new(0, 8)
			pad.Parent = nameTile
			nameTile.Parent = card
		end
		local stroke = Instance.new("UIStroke")
		stroke.Color = Color3.fromRGB(214, 170, 82)
		stroke.Transparency = 0.5
		stroke.Parent = card
		card.Parent = parent
		if px >= 60 and assetId then
			local sc = Instance.new("UIScale")
			sc.Parent = card
			addItemMotion({ gui = card, scale = sc })
		end
		return card
	end
	local vf = Instance.new("ViewportFrame")
	vf.Size = UDim2.fromOffset(px, px)
	vf.BackgroundColor3 = Color3.fromRGB(24, 37, 53)
	vf.Ambient = Color3.fromRGB(148, 160, 177)
	vf.LightColor = Color3.fromRGB(255, 237, 205)
	vf.LightDirection = Vector3.new(-1, -1.5, -0.6).Unit
	corner(vf, 8)
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(214, 170, 82)
	st.Thickness = 1.5
	st.Transparency = 0.3
	st.Parent = vf
	local cam = Instance.new("Camera")
	cam.FieldOfView = 35
	cam.Parent = vf
	vf.CurrentCamera = cam
	local lib = ReplicatedStorage:FindFirstChild("MareAssets")
	local group = kind and lib and lib:FindFirstChild(kind)
	local tpl = group and asset and group:FindFirstChild(asset)
	if tpl and tpl:IsA("Model") then
		local m = tpl:Clone()
		for _, d in m:GetDescendants() do
			if d:IsA("BasePart") then
				d.Anchored = true
				if tint and d:IsA("MeshPart") then
					d.Color = tint
				end
			end
		end
		local world = Instance.new("WorldModel")
		world.Name = "Display"
		world.Parent = vf
		m.Parent = world
		local cf, size = m:GetBoundingBox()
		-- 수직·수평 시야에 모델 전체가 들어오도록 바운딩 구로 거리를 계산한다.
		local radius = math.max(size.Magnitude * 0.5, 0.1)
		local reach = radius / math.sin(math.rad(cam.FieldOfView * 0.5)) * 1.08
		if kind == "People" then
			-- 동료 얼굴은 전신 도감이 아니라 반신 초상 구도로 보여 준다.
			local focus = cf.Position + Vector3.new(0, size.Y * 0.30, 0)
			cam.FieldOfView = 34
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.12, 0.08, 1).Unit * (size.Y * 0.88), focus)
		else
			cam.CFrame = CFrame.lookAt(cf.Position + Vector3.new(0.85, 0.65, 1.2).Unit * reach, cf.Position)
		end
		if px >= 60 then
			addItemMotion({ gui = vf, model = m, center = cf.Position, base = m:GetPivot() })
		end
	else
		local knownId = if kind and asset then AssetIds[kind .. "/" .. asset] else nil
		if knownId then
			local image = Instance.new("ImageLabel")
			image.Size = UDim2.fromScale(1, 1)
			image.BackgroundTransparency = 1
			image.Image = "rbxthumb://type=Asset&id=" .. tostring(knownId) .. "&w=150&h=150"
			image.ScaleType = Enum.ScaleType.Fit
			image.Parent = vf
		else
			local q = Instance.new("TextLabel")
			q.BackgroundTransparency = 1
			q.Size = UDim2.fromScale(1, 1)
			q.Text = labelText or "자산 준비"
			q.TextWrapped = true
			q.TextColor3 = Color3.fromRGB(232, 209, 154)
			q.Font = Enum.Font.GothamBold
			q.TextSize = math.min(14, math.max(10, px / 4))
			q.Parent = vf
		end
	end
	vf.Parent = parent
	return vf
end

-- 줄(row) 왼쪽에 아이콘을 붙이고 글자 상자를 오른쪽으로 민다
local function withIcon(row, kind, asset, tint, px, portraitOffset)
	local icon = modelIcon(row, kind, asset, tint, px, nil, nil, portraitOffset)
	icon.Position = UDim2.new(0, 8, 0.5, -px / 2)
	local box = row:FindFirstChildWhichIsA("Frame")
	if box then
		box.Position = UDim2.new(0, px + 16, 0, box.Position.Y.Offset)
		box.Size = UDim2.new(box.Size.X.Scale, box.Size.X.Offset - (px + 8), box.Size.Y.Scale, box.Size.Y.Offset)
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

local main, mainInner = CommonUI.CreatePanel({ name = "Main", size = UDim2.new(1, -16, 1, -16) })
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = Color3.fromRGB(16, 24, 36)
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
sizeLimit.MaxSize = Vector2.new(620, 900)
sizeLimit.Parent = main

local headerLabel = Instance.new("TextLabel")
headerLabel.BackgroundTransparency = 1
headerLabel.Position = UDim2.fromOffset(66, 4)
headerLabel.Size = UDim2.new(1, -216, 0, 44)
headerLabel.TextXAlignment = Enum.TextXAlignment.Left
headerLabel.TextYAlignment = Enum.TextYAlignment.Top
headerLabel.TextWrapped = true
headerLabel.TextSize = 13
headerLabel.Font = Enum.Font.GothamBold
headerLabel.TextColor3 = COLORS.text
headerLabel.Text = "불러오는 중..."
headerLabel.Parent = mainInner

-- 시설 주인 초상화 (대항해시대 온라인의 NPC 얼굴 창처럼)
local portraitFrame = Instance.new("ViewportFrame")
portraitFrame.Position = UDim2.fromOffset(8, 2)
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
portraitImage.Position = UDim2.fromOffset(8, 2)
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
	t_surgeon = "Doctor_Female_Young",
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
		local cell = (seed + rotation) % 10 + (if role == "tavern" then 10 else 0)
		return atlas, Vector2.new(cell % 5 * 200, math.floor(cell / 5) * 200), Vector2.new(200, 200)
	end
end

local function setPortrait(groupName)
	-- 새 게임 선택 중에는 선택한 주인공, 이어하기에서는 저장된 주인공의 얼굴을 유지한다.
	local heroNation = nil
	if groupName == "선장실" then
		heroNation = chosenNation
		if view and view.player and not newGameMode then
			for id, nation in PortData.Nations do
				if nation.name == view.player.nation then
					heroNation = id
					break
				end
			end
		end
	end
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

local coinChip, _, coinValue = CommonUI.CreateCurrencyChip({ name = "Coins", size = UDim2.fromOffset(132, 34), text = "0" })
coinChip.AnchorPoint = Vector2.new(1, 0)
coinChip.Position = UDim2.new(1, -8, 0, 4)
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

local menuToggle = CommonUI.CreatePrimaryButton({ name = "MenuToggle", text = "메뉴", size = UDim2.fromOffset(80, 40), minHeight = 40, minWidth = 60 })
menuToggle.AnchorPoint = Vector2.new(0, 0)
menuToggle.Position = UDim2.fromOffset(8, 8)
menuToggle.Visible = false
menuToggle.Parent = gui
menuToggle.Size = UDim2.fromOffset(0, 0) -- 옛 "메뉴" 버튼은 HUD가 대신한다 (표시 상태 신호만 사용)
menuToggle.BackgroundTransparency = 1
menuToggle.Text = ""

-- 대항해시대 온라인풍 HUD: 좌상단 선장 카드, 우상단 소지금, 하단 메뉴 독 -----------------
local NAVY = Color3.fromRGB(14, 24, 38)
local NAVY2 = Color3.fromRGB(28, 46, 70)
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
card.Size = UDim2.fromOffset(226, 66)
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

local hudName = hudText(card, UDim2.fromOffset(8, 4), UDim2.new(1, -16, 0, 16), 12, BRASS)
local hudCoin = hudText(card, UDim2.fromOffset(8, 4), UDim2.new(1, -16, 0, 16), 12, Color3.fromRGB(255, 226, 120), Enum.TextXAlignment.Right)
local hudPort = hudText(card, UDim2.fromOffset(8, 21), UDim2.new(1, -16, 0, 14), 11, COLORS.text)
local hullBack = Instance.new("Frame")
hullBack.BackgroundColor3 = Color3.fromRGB(8, 14, 22)
hullBack.Position = UDim2.fromOffset(8, 38)
hullBack.Size = UDim2.new(1, -16, 0, 7)
hullBack.Parent = card
corner(hullBack, 4)
local hullFill = Instance.new("Frame")
hullFill.BackgroundColor3 = COLORS.green
hullFill.Size = UDim2.fromScale(1, 1)
hullFill.Parent = hullBack
corner(hullFill, 4)
local hudShip = hudText(card, UDim2.fromOffset(8, 48), UDim2.new(1, -16, 0, 14), 10, COLORS.muted)

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

local DOCK = {
	{ "view", "걷기" }, { "trade", "교역" }, { "harbor", "항구" }, { "route", "항해" }, { "map", "지도" },
	{ "yard", "조선소" }, { "explore", "탐험" }, { "codex", "백과사전" }, { "tech", "연구" },
	{ "quest", "퀘스트" }, { "battle", "전투" }, { "status", "상태" },
}
for i, d in DOCK do
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
	local menuAssetId = AssetIds["Menu/" .. d[1]]
	if menuAssetId then
		local image = Instance.new("ImageLabel")
		image.Name = "Icon"
		image.BackgroundTransparency = 1
		image.AnchorPoint = Vector2.new(0.5, 0)
		image.Position = UDim2.new(0.5, 0, 0, 3)
		image.Size = UDim2.fromOffset(31, 31)
		image.ScaleType = Enum.ScaleType.Fit
		image.Image = "rbxassetid://" .. tostring(menuAssetId)
		image.Parent = b
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

function H.updateHud(p, ship)
	hudName.Text = string.format("%s · %d년", p.nation, p.year)
	hudPort.Text = "항구  " .. tostring(p.portName)
	hudBanner.Text = tostring(p.portName)
	hullFill.Size = UDim2.fromScale(math.clamp(ship.hull / math.max(1, ship.maxHull), 0, 1), 1)
	hullFill.BackgroundColor3 = if ship.hull / math.max(1, ship.maxHull) < 0.35 then COLORS.red else COLORS.green
	hudShip.Text = string.format("%s  화물 %d/%d  명성 %d", ship.name, ship.cargoUsed, ship.cargoCapacity, p.fame)
	hudCoin.Text = tostring(p.coins) .. " 코인"
end

-- 화면 중앙 상단 동료 말풍선: 게임을 시작하거나 새 항구에 닿으면 동료가 인사하고 앞으로 할 일을 조언한다.
local bubble = Instance.new("Frame")
bubble.Name = "CompanionBubble"
bubble.AnchorPoint = Vector2.new(0.5, 0)
bubble.Position = UDim2.new(0.5, 0, 0, 8)
bubble.Size = UDim2.new(0.42, 0, 0, 0)
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
	limit.MaxSize = Vector2.new(460, 1000)
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
local bubbleWho = bubbleLabel(1, 14, COLORS.gold)
local bubbleLine = bubbleLabel(2, 13, COLORS.text)
local bubbleAdvice = bubbleLabel(3, 13, Color3.fromRGB(190, 230, 200))
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
	bubbleWho.Text = "💬 " .. tostring(adv.who)
	bubbleLine.Text = "\"" .. tostring(adv.line or "") .. "\""
	bubbleAdvice.Text = "조언: " .. tostring(adv.text)
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
		elseif action == "Sell" or action == "Smuggle" or action == "MarketPost" then
			snd = "sfx_sell"
		elseif action == "TurnInBounty" or action == "MailClaim" or action == "Audience" or action == "Recruit" then
			snd = "sfx_fanfare"
		elseif action == "BuyGear" or action == "BuyShip" or action == "BuyEscort" or action == "Invest" or action == "Feast" then
			snd = "sfx_coin"
		elseif action == "Sail" then
			snd = "sfx_horn"
		end
		if snd then
			Sfx.play(snd)
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
		task.spawn(function()
			while audioLock and inField do
				Sfx.play("sfx_cannon", 0.55 + math.random() * 0.3)
				task.wait(0.8 + math.random() * 1.4)
				if math.random() < 0.4 then
					Sfx.play("sfx_hit", 0.5)
				end
			end
		end)
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
			onDone = function()
				if lb.pending and not resolved then
					resolved = true
					call("ResolveBattle", { flee = false })
				end
				inField = false
				audioLock = false
				Sfx.play(if lb.winner == "a" then "sfx_fanfare" else "sfx_error")
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
	local days, steam = 1, view.ship.steam
	for _, r in view.routes do
		if r.id == portId then
			days = r.days
		end
	end
	sceneHold = true
	audioLock = true
	Sfx.music("music_sea")
	Sfx.ambient({ "sfx_waves", "sfx_wind" })
	Sfx.play("sfx_sail")
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

-- 주인공 선택·항해 시작·에필로그에 같은 국가별 고유 초상을 사용한다.
local function heroPortrait(parent, nationId, w, h)
	local atlas, tile, size = H.heroPortraitAsset(nationId)
	if atlas and tile then
		local photo = Instance.new("ImageLabel")
		photo.Name = "HeroPortrait"
		photo.Size = UDim2.fromOffset(w, h)
		photo.BackgroundColor3 = Color3.fromRGB(30, 42, 62)
		photo.BorderSizePixel = 0
		photo.ScaleType = Enum.ScaleType.Crop
		photo.Image = "rbxassetid://" .. tostring(atlas)
		photo.ImageRectOffset = tile
		photo.ImageRectSize = size
		corner(photo, 10)
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 2
		st.Parent = photo
		photo.Parent = parent
		return photo
	end
	local vf = Instance.new("ViewportFrame")
	vf.Size = UDim2.fromOffset(w, h)
	vf.BackgroundColor3 = Color3.fromRGB(30, 42, 62)
	vf.Ambient = Color3.fromRGB(170, 170, 178)
	vf.LightColor = Color3.fromRGB(255, 236, 205)
	vf.LightDirection = Vector3.new(-0.6, -0.8, -1).Unit
	corner(vf, 10)
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(214, 170, 82)
	st.Thickness = 2
	st.Parent = vf
	local cam = Instance.new("Camera")
	cam.FieldOfView = 32
	cam.Parent = vf
	vf.CurrentCamera = cam
	local world = Instance.new("WorldModel")
	world.Parent = vf
	local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
	local tpl = lib and lib:FindFirstChild("People") and lib.People:FindFirstChild(storyPortraitModel("선장", nationId))
	local m = portraitPerson(world, "hero" .. nationId, "Rogue_Hooded", tpl)
	if m then
		local cf, size = m:GetBoundingBox()
		local focus = cf.Position + Vector3.new(0, size.Y * 0.3, 0)
		cam.FieldOfView = 36
		cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.2, 0.1, -1).Unit * (size.Y * 0.95), focus)
	end
	vf.Parent = parent
	return vf
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
	overlay.Destroying:Connect(function() task.defer(function() layer:Destroy() end) end)
	local picture = mkBox(overlay, UDim2.fromScale(0, 0), UDim2.fromScale(1, 0.56), Color3.new(0, 0, 0))
	picture.ClipsDescendants = true
	H.paintScene(picture, ev.art)

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
			return mkLabel(content, string.format("예금 %d (30일 이자 %.1f%%)\n대출 %d / 한도 %d (30일 이자 %d%%)", b.deposit, b.depositRate * 100, b.loan, b.limit, b.loanRate * 100), 13, COLORS.text, false)
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
	add(function() return mkHeader(content, string.format("배의 자리 (이 배는 동료 %d명까지)", view.companions.max)) end)
	add(function()
		return mkLabel(content, "동료는 자기 직책 자리에 앉으면 효과 x1.2, 다른 자리에 앉으면 x0.6이에요. 버튼을 누르면 다음 동료와 자리를 바꿔요.", 12, COLORS.muted, true)
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
		local say = (message ~= "" and message) or string.format("어서 오시오! %s 시세는 날마다 달라진다오.", p.portName)
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
			local nm = mkLabel(row, g.name .. (if g.upgraded then " ✦" else "") .. (if g.cheaper then " ▽" else "") .. (if g.trend == "up" then " ▲" elseif g.trend == "down" then " ▼" else ""), 20, if g.trend == "up" then COLORS.green elseif g.trend == "down" then COLORS.red else COLORS.text, true)
			nm.Position = UDim2.fromOffset(70, 8)
			nm.Size = UDim2.new(1, -230, 0, 26)
			nm.AutomaticSize = Enum.AutomaticSize.None
			local pr = mkLabel(row, string.format("사기 %d   팔기 %d   보유 %d", g.buy, g.sell, g.owned), 16, COLORS.muted, false)
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
			local nm = mkLabel(cardF, g.name .. (if g.upgraded then " ✦" else "") .. (if g.cheaper then " ▽" else "") .. (if g.trend == "up" then " ▲" elseif g.trend == "down" then " ▼" else ""), 18, COLORS.text, true)
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
	root.BackgroundColor3 = Color3.fromRGB(26, 32, 40)
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

function H.showCardDetail(card)
	local fieldDef = findField(card.field)
	local overlay = Instance.new("TextButton")
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.BackgroundColor3 = Color3.new(0, 0, 0)
	overlay.BackgroundTransparency = 0.45
	overlay.Text = ""
	overlay.AutoButtonColor = false
	overlay.ZIndex = 40
	local layer = overlayGui("Overlay", 20)
	overlay.Parent = layer
	overlay.Destroying:Connect(function() task.defer(function() layer:Destroy() end) end)
	local box = Instance.new("Frame")
	box.AnchorPoint = Vector2.new(0.5, 0.5)
	box.Position = UDim2.fromScale(0.5, 0.5)
	box.Size = UDim2.fromScale(0.9, 0.88)
	local bounds = Instance.new("UISizeConstraint")
	bounds.MaxSize = Vector2.new(560, 540)
	bounds.Parent = box
	box.BackgroundColor3 = COLORS.row
	box.ZIndex = 41
	corner(box, 14)
	box.Parent = overlay
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 3
	stroke.Color = if card.found then (RARITY_COLOR[card.rarity] or COLORS.muted) else COLORS.grey
	stroke.Parent = box
	local art = Instance.new("Frame")
	art.Position = UDim2.fromOffset(10, 10)
	art.Size = UDim2.new(1, -20, 0.46, 0)
	art.BackgroundColor3 = COLORS.grey
	art.ZIndex = 42
	corner(art, 10)
	art.Parent = box
	paintCardArt(art, card, fieldDef, true)
	for _, d in art:GetDescendants() do
		if d:IsA("GuiObject") then
			d.ZIndex = 43
		end
	end
	local body = Instance.new("ScrollingFrame")
	body.BackgroundTransparency = 1
	body.BorderSizePixel = 0
	body.Position = UDim2.new(0, 10, 0.46, 18)
	body.Size = UDim2.new(1, -20, 0.54, -76)
	body.CanvasSize = UDim2.new()
	body.AutomaticCanvasSize = Enum.AutomaticSize.Y
	body.ScrollBarThickness = 3
	body.ZIndex = 42
	body.Parent = box
	local lay = Instance.new("UIListLayout")
	lay.Padding = UDim.new(0, 4)
	lay.Parent = body
	local rarity = RARITY_NAMES[card.rarity] or card.rarity
	local title = mkLabel(body, string.format("%s  [%s · %s]", card.name, fieldDef.name, rarity), 17, if card.found then (RARITY_COLOR[card.rarity] or COLORS.text) else COLORS.muted, true)
	mkLabel(body, card.description, 14, COLORS.text, false)
	if card.found then
		mkLabel(body, string.format("발견 방법: %s\n도감 등록 보상: %d코인 · 명성 +%d", card.source, card.coins, card.fame), 12, COLORS.muted, false)
		if card.credit then
			mkLabel(body, "그림 출처: " .. card.credit, 11, COLORS.muted, false)
		end
	else
		mkLabel(body, "아직 발견하지 못한 카드예요. 분야 설명의 '모으는 방법'을 참고하세요.", 12, COLORS.muted, false)
	end
	for _, d in body:GetDescendants() do
		if d:IsA("GuiObject") then
			d.ZIndex = 43
		end
	end
	title.ZIndex = 43
	local replayScene = require(Shared:WaitForChild("WonderScenes")).Scenes[card.id]
	if card.found and replayScene then
		local rp = mkButton(body, "🎬 원더 연출 다시 보기", COLORS.blue, UDim2.new(1, 0, 0, 40), function()
			overlay:Destroy()
			H.playWonderScene(card.id)
		end, true)
		rp.ZIndex = 43
	end
	local close = mkButton(box, "닫기", COLORS.gold, UDim2.new(1, -20, 0, 44), function()
		overlay:Destroy()
	end, true)
	close.AnchorPoint = Vector2.new(0.5, 1)
	close.Position = UDim2.new(0.5, 0, 1, -8)
	close.ZIndex = 43
	overlay.Activated:Connect(function()
		overlay:Destroy()
	end)
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
		return mkLabel(content, string.format("세계 백과 %d / %d (%d%%)%s", cx.found, cx.total, math.floor(cx.found * 100 / math.max(1, cx.total)), if cx.rank then ("  ·  " .. cx.rank) else ""), 16, COLORS.gold, true)
	end)
	add(function()
		return mkLabel(content, "분야를 눌러 카드를 모아 보세요. 분야마다 25·50·75·100%를 채울 때 보상이 있어요.", 12, COLORS.muted, false)
	end)
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
			local stripe = Instance.new("Frame")
			stripe.Size = UDim2.new(0, 4, 1, -12)
			stripe.Position = UDim2.fromOffset(0, 6)
			stripe.BackgroundColor3 = fieldColor(f)
			stripe.BorderSizePixel = 0
			stripe.Parent = row
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
		g.CellSize = UDim2.new(0.333, -6, 0, 132)
		g.CellPadding = UDim2.fromOffset(6, 6)
		g.SortOrder = Enum.SortOrder.LayoutOrder
		g.Parent = grid
		local n = 0
		for _, c in view.codex.cards do
			if c.field == f.id then
				n += 1
				local tile = Instance.new("TextButton")
				tile.LayoutOrder = n
				tile.AutoButtonColor = false
				tile.Text = ""
				tile.BackgroundColor3 = COLORS.row
				corner(tile, 8)
				tile.Parent = grid
				local st = Instance.new("UIStroke")
				st.Thickness = 2
				st.Color = if c.found then (RARITY_COLOR[c.rarity] or COLORS.muted) else COLORS.grey
				st.Parent = tile
				local art = Instance.new("Frame")
				art.Position = UDim2.fromOffset(4, 4)
				art.Size = UDim2.new(1, -8, 0, 78)
				art.BackgroundColor3 = COLORS.grey
				corner(art, 6)
				art.Parent = tile
				paintCardArt(art, c, f)
				local nm = Instance.new("TextLabel")
				nm.BackgroundTransparency = 1
				nm.Position = UDim2.fromOffset(4, 84)
				nm.Size = UDim2.new(1, -8, 0, 28)
				nm.Font = Enum.Font.GothamBold
				nm.TextSize = 12
				nm.TextWrapped = true
				nm.TextColor3 = if c.found then COLORS.text else COLORS.muted
				nm.Text = c.name
				nm.Parent = tile
				local rr = Instance.new("TextLabel")
				rr.BackgroundTransparency = 1
				rr.Position = UDim2.new(0, 4, 1, -18)
				rr.Size = UDim2.new(1, -8, 0, 14)
				rr.Font = Enum.Font.Gotham
				rr.TextSize = 10
				rr.TextColor3 = if c.found then (RARITY_COLOR[c.rarity] or COLORS.muted) else COLORS.grey
				rr.Text = if c.found then (RARITY_NAMES[c.rarity] or c.rarity) else "미발견"
				rr.Parent = tile
				tile.Activated:Connect(function()
					H.showCardDetail(c)
				end)
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
	add(function() return mkHeader(content, "진행 중") end)
	if #view.quests.active == 0 then
		add(function() return mkLabel(content, "진행 중인 퀘스트가 없어요.", 13, COLORS.muted, false) end)
	end
	for _, q in view.quests.active do
		add(function()
			local buttons = {}
			if q.kind == "deliver" then
				table.insert(buttons, { text = "납품", color = COLORS.blue, onClick = function() call("TurnIn", { questId = q.id }) end })
			end
			table.insert(buttons, { text = "보상", color = COLORS.green, onClick = function() call("Claim", { questId = q.id }) end, enabled = q.progress >= q.amount })
			return mkRow(content, q.name, string.format("%s\n진행 %d/%d · 보상 %d코인", q.summary, math.min(q.progress, q.amount), q.amount, q.rewardCoins), buttons, 68)
		end)
	end
	add(function() return mkHeader(content, "받을 수 있는 퀘스트") end)
	if (view.quests.otherPortDeliver or 0) > 0 then
		add(function()
			return mkLabel(content, string.format("납품 의뢰는 지금 항구(%s)의 주점 게시판 것만 보여요. 다른 항구에도 %d개가 더 있어요.", view.player.portName, view.quests.otherPortDeliver), 12, COLORS.muted, true)
		end)
	end
	for _, q in view.quests.available do
		add(function()
			if q.auto then
				-- 발견·방문·연구 퀘스트는 수락하지 않아도 조건을 채우면 자동으로 보고되고 보상이 들어온다
				return mkRow(content, q.name, string.format("%s\n자동 보고 · 진행 %d/%d · 보상 %d코인", q.summary, math.min(q.progress or 0, q.amount or 0), q.amount or 0, q.rewardCoins), nil, 64)
			end
			return mkRow(content, q.name, string.format("%s\n보상 %d코인", q.summary, q.rewardCoins), {
				{ text = "수락", color = COLORS.blue, onClick = function() call("Accept", { questId = q.id }) end },
			}, 64)
		end)
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
local SEA_NAMES = {
	{ "북해", 56.2, 3.2 }, { "대서양", 47.5, -9 }, { "지중해", 38.6, 4 }, { "발트해", 57.3, 19.5 },
	{ "영국해협", 50.0, -2.0 }, { "비스케이만", 45.0, -5.2 }, { "티레니아해", 40.0, 11.8 }, { "아드리아해", 43.0, 15.6 },
	{ "아일랜드해", 53.9, -4.9 }, { "노르웨이해", 61.6, 1 }, { "이오니아해", 37.8, 18.5 }, { "리구리아해", 43.4, 8.3 },
}

-- 실제 위도·경도 위에 항구를 찍은 세계지도 (Natural Earth 해안선)
function RENDERERS.map()
	local cosLat = 0.66 -- 유럽 위도에서 가로를 줄여 비율을 맞춘다
	local function mapX(lon) return (lon - Geo.lonMin) / (Geo.lonMax - Geo.lonMin) end
	local function mapY(lat) return (Geo.latMax - lat) / (Geo.latMax - Geo.latMin) end
	add(function()
		local frame = Instance.new("Frame")
		-- 지도 비율(가로/세로)에 맞춰 높이를 직접 정한다 (UIAspectRatioConstraint는 스크롤 목록 안에서 높이가 0이 됐다)
		local mapW = math.max(200, content.AbsoluteSize.X - 10)
		frame.Size = UDim2.new(1, -6, 0, math.floor(mapW / ((Geo.cols * cosLat) / Geo.rows)))
		frame.BackgroundColor3 = Color3.fromRGB(38, 82, 120)
		frame.BorderSizePixel = 0
		frame.ClipsDescendants = true
		drawLand(frame)
		-- 해역 이름
		for _, sea in SEA_NAMES do
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
				local steps = math.max(1, math.floor(hypot(b[1] - a[1], b[2] - a[2]) / 0.35))
				for k = 0, steps do
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
			dot.Size = UDim2.fromOffset(if isHere then 18 else 14, if isHere then 18 else 14)
			dot.Text = ""
			dot.BackgroundColor3 = if isHere then COLORS.gold elseif id == selectedPort then COLORS.blue else COLORS.red
			dot.BorderSizePixel = 1
			dot.Parent = frame
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
		local b = mkButton(tabBar, TAB_NAME[id], if currentTab == id then COLORS.gold else COLORS.grey, UDim2.fromOffset(68, 38), function()
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
		local menuAssetId = AssetIds["Menu/" .. id]
		if menuAssetId then
			b.Text = ""
			local image = Instance.new("ImageLabel")
			image.Name = "Icon"
			image.BackgroundTransparency = 1
			image.Position = UDim2.new(0, 4, 0.5, -12)
			image.Size = UDim2.fromOffset(24, 24)
			image.ScaleType = Enum.ScaleType.Fit
			image.Image = "rbxassetid://" .. tostring(menuAssetId)
			image.Parent = b
			local label = Instance.new("TextLabel")
			label.Name = "Label"
			label.BackgroundTransparency = 1
			label.Position = UDim2.fromOffset(29, 0)
			label.Size = UDim2.new(1, -32, 1, 0)
			label.Font = b.Font
			label.TextSize = 11
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
	if not RS:GetAttribute("MareAssetsReady") then
		if not assetWaitStarted then
			assetWaitStarted = true
			task.spawn(function()
				local t0 = os.clock()
				while not RS:GetAttribute("MareAssetsReady") and os.clock() - t0 < 30 do
					task.wait(0.3)
				end
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
	local key = p.portId .. "|L" .. portLevel .. "|" .. ship.id .. "|" .. table.concat(view.facilities or {}, ",") .. "|" .. tostring(p.hasShipyard) .. "|" .. tostring(#(view.story or {}) > 0) .. "|" .. table.concat(crewIds, ",")
	if key == sceneKey then
		return
	end
	local ok, res = pcall(PortScene.build, {
		portId = p.portId,
		portName = p.portName,
		level = portLevel,
		shipId = ship.id,
		hasShipyard = p.hasShipyard,
		facilities = view.facilities,
		storyCount = #(view.story or {}),
		companions = crew,
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
			if root then
				char:PivotTo(CFrame.new(-200, 8, 0)) -- 마을 뒤에 숨겨 둔다
			end
		else
			camera.CameraType = Enum.CameraType.Custom
			camera.FieldOfView = 70
			local hum = char and char:FindFirstChildOfClass("Humanoid")
			if hum then
				camera.CameraSubject = hum
			end
			if char and sceneSpawn then
				char:PivotTo(sceneSpawn)
			end
		end
	end
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
local HELP_LINES = {
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
	win.BackgroundColor3 = Color3.fromRGB(14, 22, 36)
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
			local hl = mkLabel(body, table.concat(HELP_LINES, "\n"), 14, COLORS.text, false, nxt())
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
	Sfx.music(mood.music)
	Sfx.play(mood.sfx)

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
	local result = call("NewGame", { nationId = chosenNation, startYear = chosenYear, restart = restart, room = H.roomMode == true })
	if not (result and result.ok) then
		sceneHold = false
	end
	if not (result and result.ok) and restart then
		newGameMode = true
		render()
	end
	-- 시작 직후 프롤로그: 주인공이 왜 항해를 떠나는지 보여 준다
	if result and result.ok then
		local N = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared"):WaitForChild("Narrative"))
		local pro = N.Prologues[chosenNation] or N.Prologue
		local lines = {}
		for sentence in string.gmatch(pro.text, "[^%.]+%.?") do
			local t = string.gsub(sentence, "^%s+", "")
			if t ~= "" then
				table.insert(lines, t)
			end
		end
		task.spawn(function()
			-- 3D 오프닝: 시작 항구에서 가까운 바다로 나가는 항해 장면에 자막과 주인공 초상을 얹는다
			local startId = view.player.portId
			local sp = PortData.Ports[startId]
			local nearId, nearD = nil, math.huge
			for id, q in PortData.Ports do
				if id ~= startId then
					local d = (q.lat - sp.lat) ^ 2 + (q.lon - sp.lon) ^ 2
					if d < nearD then
						nearId, nearD = id, d
					end
				end
			end
			sceneHold = true
			audioLock = true
			main.Visible = false
			menuToggle.Visible = false
			Sfx.music("music_sea")
			Sfx.ambient({ "sfx_waves", "sfx_wind" })
			local days = math.clamp(math.ceil((#lines * 4.2 + 3 - 8) / 0.9), 4, 16)
			local nationId = chosenNation
			local ok, err = pcall(VoyageScene.play, {
				shipId = view.ship.id, steam = false, days = days,
				path = SeaRoutes.path(startId, nearId, PortData.Ports),
				fromName = "", toName = "",
				makeShip = PortScene.makeShip, place = PortScene.placeModel,
				intro = {
					title = pro.title, lines = lines,
					portrait = function(gui)
						local hp = heroPortrait(gui, nationId, 130, 168)
						hp.AnchorPoint = Vector2.new(0, 1)
						hp.Position = UDim2.new(0, 24, 1, -24)
						hp.ZIndex = 7
					end,
				},
			})
			if not ok then
				warn("[Game] 3D 오프닝 오류, 2D 연출로 대체:", err)
				local cam = workspace.CurrentCamera
				cam.CameraType = Enum.CameraType.Custom
				local g = player.PlayerGui:FindFirstChild("VoyageHud")
				if g then g:Destroy() end
				local vf = workspace:FindFirstChild("VoyageScene")
				if vf then vf:Destroy() end
				playEpilogue(nil, { title = pro.title, lines = lines, button = "⚓ 항해를 시작한다", hero = nationId })
			end
			arriveNext = true
			main.Visible = true
			menuToggle.Visible = false
			sceneHold = false
			sceneKey = nil
			audioLock = false
			render()
		end)
	end
end

-- 타이틀(새 게임) 화면 배경: 월드가 비치지 않게 가리고, 해 질 녘 바다와 배 실루엣, 게임 이름을 직접 그려 분위기를 만든다
local titleGui = overlayGui("TitleBackdrop", -5)
titleGui.Enabled = false
local titleShip
do
	local root = mkBox(titleGui, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.fromRGB(14, 20, 40))
	root.ClipsDescendants = true
	local sky = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 0.66), Color3.new(1, 1, 1))
	local g = Instance.new("UIGradient")
	g.Rotation = 90
	g.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(10, 16, 44)),
		ColorSequenceKeypoint.new(0.45, Color3.fromRGB(70, 44, 92)),
		ColorSequenceKeypoint.new(0.8, Color3.fromRGB(226, 112, 78)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 190, 110)),
	})
	g.Parent = sky
	local starRng = Random.new(7)
	for _ = 1, 40 do
		local st = mkBox(sky, UDim2.fromScale(starRng:NextNumber(), starRng:NextNumber() * 0.5), UDim2.fromOffset(2, 2), Color3.fromRGB(255, 244, 220), starRng:NextNumber(0.2, 0.7))
		st.ZIndex = 2
	end
	local sun = mkRound(root, UDim2.fromScale(0.2, 0.64), UDim2.fromOffset(120, 120), Color3.fromRGB(255, 214, 140), 0.05, Vector2.new(0.5, 0.5))
	sun.ZIndex = 2
	local sea = mkBox(root, UDim2.fromScale(0, 0.64), UDim2.fromScale(1, 0.36), Color3.new(1, 1, 1))
	sea.ZIndex = 3
	local sg = Instance.new("UIGradient")
	sg.Rotation = 90
	sg.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(190, 120, 96)),
		ColorSequenceKeypoint.new(0.25, Color3.fromRGB(44, 70, 110)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(8, 18, 38)),
	})
	sg.Parent = sea
	for i = 1, 9 do
		local w = mkBox(sea, UDim2.fromScale(0.04 + (i * 0.37) % 0.8, 0.08 + i * 0.09), UDim2.fromScale(0.1 + (i % 3) * 0.04, 0.012), Color3.fromRGB(255, 200, 150), 0.7)
		w.ZIndex = 4
	end
	-- 배 실루엣
	titleShip = mkBox(root, UDim2.fromScale(0.2, 0.655), UDim2.fromOffset(100, 12), Color3.fromRGB(14, 10, 12))
	titleShip.ZIndex = 5
	local m1 = mkBox(titleShip, UDim2.fromOffset(26, -52), UDim2.fromOffset(3, 52), Color3.fromRGB(14, 10, 12))
	local m2 = mkBox(titleShip, UDim2.fromOffset(62, -40), UDim2.fromOffset(3, 40), Color3.fromRGB(14, 10, 12))
	local s1 = mkBox(titleShip, UDim2.fromOffset(30, -49), UDim2.fromOffset(22, 32), Color3.fromRGB(34, 24, 26))
	local s2 = mkBox(titleShip, UDim2.fromOffset(66, -37), UDim2.fromOffset(17, 26), Color3.fromRGB(34, 24, 26))
	for _, f in { m1, m2, s1, s2 } do
		f.ZIndex = 5
	end
	-- 게임 이름
	local function titleText(text, y, size, color, font)
		local l = Instance.new("TextLabel")
		l.BackgroundTransparency = 1
		l.AnchorPoint = Vector2.new(0.5, 0)
		l.Position = UDim2.new(0.2, 0, y, 0)
		l.Size = UDim2.new(0.36, 0, 0, size + 8)
		l.Text = text
		l.TextSize = size
		l.Font = font
		l.TextColor3 = color
		l.TextStrokeTransparency = 0.5
		l.ZIndex = 8
		l.Parent = root
		return l
	end
	titleText("MARE ESSENTIA", 0.12, 38, Color3.fromRGB(246, 208, 130), Enum.Font.GothamBlack)
	titleText("학문의 바다", 0.12 + 0.11, 26, Color3.fromRGB(240, 232, 215), Enum.Font.GothamBold)
	titleText("지식을 싣고, 미지의 바다를 건너라", 0.12 + 0.2, 16, Color3.fromRGB(214, 200, 180), Enum.Font.Gotham)
	task.spawn(function()
		while true do
			task.wait(0.05)
			if titleGui.Enabled then
				local t = os.clock()
				titleShip.Position = UDim2.new(0.2 + math.sin(t * 0.12) * 0.008, -50, 0.655 + math.sin(t * 1.3) * 0.004, 0)
				titleShip.Rotation = math.sin(t * 0.9) * 1.5
			end
		end
	end)
end
-- 타이틀 오른쪽 선택 패널: 나라(3열 카드) → 시대(3칸) → 출항 버튼 순서로, 스크롤 없이 한눈에 보이게 짠다
local NATION_COLOR = {
	england = Color3.fromRGB(196, 44, 56), netherlands = Color3.fromRGB(232, 124, 36), france = Color3.fromRGB(56, 88, 180),
	portugal = Color3.fromRGB(44, 128, 78), ottoman = Color3.fromRGB(176, 32, 56), swahili = Color3.fromRGB(34, 146, 146),
	malabar = Color3.fromRGB(232, 164, 44), japan = Color3.fromRGB(214, 70, 82), new_spain = Color3.fromRGB(206, 168, 54),
}
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
titlePanel.BackgroundColor3 = Color3.fromRGB(12, 20, 34)
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
	table.sort(list, function(a, b) return a.id < b.id end)
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
	gl.CellSize = UDim2.new(1 / 3, -6, 0, 56)
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
		-- 국가 카드도 국가별 주인공 고유 얼굴을 표시한다. 자산이 없으면 기존 국명 배지를 유지한다.
		local faceAtlas, faceTile, faceSize = H.heroPortraitAsset(n.id)
		if faceAtlas and faceTile then
			local face = Instance.new("ImageLabel")
			face.Name = "NationHeroPortrait"
			face.Position = UDim2.fromOffset(8, 4)
			face.Size = UDim2.fromOffset(32, 42)
			face.BackgroundColor3 = Color3.fromRGB(25, 32, 45)
			face.BorderSizePixel = 0
			face.ScaleType = Enum.ScaleType.Crop
			face.Image = "rbxassetid://" .. tostring(faceAtlas)
			face.ImageRectOffset = faceTile
			face.ImageRectSize = faceSize
			face.ZIndex = 14
			corner(face, 6)
			face.Parent = card
		else
			local badge = mkRound(card, UDim2.fromOffset(8, 9), UDim2.fromOffset(32, 32), NATION_COLOR[n.id] or COLORS.blue, 0, Vector2.new(0, 0))
			badge.ZIndex = 14
			local ch = mkLabel(badge, string.sub(n.name, 1, 3), 15, Color3.new(1, 1, 1), true)
			ch.Size = UDim2.fromScale(1, 1)
			ch.AutomaticSize = Enum.AutomaticSize.None
			ch.TextXAlignment = Enum.TextXAlignment.Center
			ch.TextYAlignment = Enum.TextYAlignment.Center
			ch.ZIndex = 15
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
	box.BackgroundColor3 = Color3.fromRGB(20, 28, 42)
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
	local hero = if pro then string.match(pro.title, "·%s*(.+)$") else nil
	tLabel(info, cur.name .. (if hero then "  ·  " .. hero else ""), 17, GOLD, true)
	tLabel(info, "출발 항구  " .. PortData.Ports[cur.startPort].name, 12, COLORS.text, true)
	tLabel(info, cur.summary, 12, COLORS.muted, false)

	-- ② 시대
	tLabel(titleScroll, "② 어느 시대에서 시작할까요?", 15, COLORS.muted, true, nxt())
	local eras = {
		{ 1517, "1517년", "종교개혁의 시작" },
		{ 1600, "1600년", "동인도회사의 새벽" },
		{ 1625, "1625년", "30년 전쟁의 시대" },
		{ 1650, "1650년", "과학혁명의 시작" },
		{ 1700, "1700년 ★추천", "증기 기술의 새벽" },
		{ 1750, "1750년", "분류학의 시대" },
	}
	local rowF = Instance.new("Frame")
	rowF.BackgroundTransparency = 1
	rowF.Size = UDim2.new(1, 0, 0, 128)
	rowF.LayoutOrder = nxt()
	rowF.ZIndex = 12
	rowF.Parent = titleScroll
	local eg = Instance.new("UIGridLayout")
	eg.CellSize = UDim2.new(1 / 3, -6, 0, 60)
	eg.CellPadding = UDim2.fromOffset(8, 0)
	eg.SortOrder = Enum.SortOrder.LayoutOrder
	eg.Parent = rowF
	for i, e in eras do
		local selected = chosenYear == e[1]
		local b = Instance.new("TextButton")
		b.LayoutOrder = i
		b.AutoButtonColor = false
		b.BorderSizePixel = 0
		b.ZIndex = 13
		b.Text = e[2] .. "\n" .. e[3]
		b.TextWrapped = true
		b.Font = Enum.Font.GothamBold
		b.TextSize = 13
		b.TextColor3 = if selected then GOLD else COLORS.text
		b.BackgroundColor3 = if selected then Color3.fromRGB(58, 46, 22) else Color3.fromRGB(22, 32, 48)
		corner(b, 10)
		local st = Instance.new("UIStroke")
		st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		st.Thickness = if selected then 2.5 else 1
		st.Color = if selected then GOLD else Color3.fromRGB(64, 78, 98)
		st.Parent = b
		b.Activated:Connect(function()
			Sfx.play("sfx_click")
			chosenYear = e[1]
			renderTitle()
		end)
		b.Parent = rowF
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

local wasTitle = false
local titleMenuOpen = false
function H.setTitleMode(on)
	titleGui.Enabled = on or titleMenuOpen
	titlePanel.Visible = on and not titleMenuOpen
	if on then
		main.Visible = false
	elseif wasTitle then
		main.Visible = true
	end
	wasTitle = on
end

function render()
	order = 0
	H.clearContent()
	if not audioLock then
		Sfx.music(if view and currentTab == "trade" then "music_market" else "music_harbor")
		if view then
			Sfx.ambient({ "sfx_waves" })
		end
	end

	H.setTitleMode(not view or newGameMode)
	if not view or newGameMode then
		headerLabel.Text = "새 게임"
		setPortrait("선장실")
		tabBar.Visible = false
		content.Position = UDim2.fromOffset(8, 52)
		content.Size = UDim2.new(1, -16, 1, -60)
		if message ~= "" then
			add(function() return mkLabel(content, message, 13, if messageOk then COLORS.gold else COLORS.red, true) end)
		end
		renderTitle()
		return
	end

	tabBar.Visible = true
	content.Position = UDim2.fromOffset(8, 100)
	content.Size = UDim2.new(1, -16, 1, -108)

	local p, ship = view.player, view.ship
	local grp = groupOf(currentTab)
	setPortrait(grp.name)
	headerLabel.Text = string.format("%s · %s\n%s %s  선체 %d/%d  화물 %d/%d",
		grp.name, grp.keeper, p.portName, ship.name, ship.hull, ship.maxHull, ship.cargoUsed, ship.cargoCapacity)
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
	titleMenuOpen = true
	titleGui.Enabled = true
	titlePanel.Visible = false
	local function leave()
		titleMenuOpen = false
		layer:Destroy()
	end
	-- 시작 메뉴가 떠 있는 동안 게임 본 화면이 뒤에 비치지 않게 계속 숨긴다
	task.spawn(function()
		while titleMenuOpen do
			main.Visible = false
			task.wait(0.1)
		end
	end)
	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundTransparency = 1
	root.BorderSizePixel = 0
	root.Parent = layer

	local box = Instance.new("Frame")
	box.AnchorPoint = Vector2.new(1, 0.5)
	box.Position = UDim2.new(1, -18, 0.5, 0)
	box.Size = UDim2.new(0.4, 0, 0, 330)
	box.BackgroundColor3 = Color3.fromRGB(12, 20, 34)
	box.BackgroundTransparency = 0.1
	box.BorderSizePixel = 0
	box.Parent = root
	corner(box, 16)
	do
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(226, 182, 92)
		st.Thickness = 2
		st.Parent = box
		local lim = Instance.new("UISizeConstraint")
		lim.MaxSize = Vector2.new(440, 400)
		lim.MinSize = Vector2.new(280, 300)
		lim.Parent = box
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 16), UDim.new(0, 14)
		pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 18), UDim.new(0, 18)
		pad.Parent = box
		local lay = Instance.new("UIListLayout")
		lay.Padding = UDim.new(0, 10)
		lay.HorizontalAlignment = Enum.HorizontalAlignment.Center
		lay.SortOrder = Enum.SortOrder.LayoutOrder
		lay.Parent = box
	end
	local head = mkLabel(box, "항해를 시작합니다", 20, Color3.fromRGB(246, 208, 130), true, 1)
	head.Size = UDim2.new(1, 0, 0, 26)
	head.AutomaticSize = Enum.AutomaticSize.None
	head.TextXAlignment = Enum.TextXAlignment.Center

	local function big(label, color, order, height, onClick)
		local b = mkButton(box, label, color, UDim2.new(1, 0, 0, height), onClick, true)
		b.TextSize = 22
		b.LayoutOrder = order
		local st = Instance.new("UIStroke")
		st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		st.Color = Color3.fromRGB(255, 226, 150)
		st.Transparency = 0.4
		st.Thickness = 1.5
		st.Parent = b
		return b
	end
	if view then
		local cont = big(string.format("▶  이어하기\n%s · %d년 · %d코인", view.player.portName, view.player.year, view.player.coins), Color3.fromRGB(206, 154, 56), 2, 76, function()
			leave()
			titleGui.Enabled = false
			main.Visible = wasMain
			menuToggle.Visible = not wasMain
		end)
		cont.TextSize = 19
		cont.TextColor3 = Color3.fromRGB(22, 14, 4)
	end
	local confirmed = false
	local newBtn
	newBtn = big("⚓  새 게임", Color3.fromRGB(34, 52, 82), if view then 3 else 2, if view then 56 else 76, function()
		if view and not confirmed then
			confirmed = true
			newBtn.Text = "저장이 사라져요. 한 번 더 누르면 새로 시작"
			newBtn.TextSize = 15
			newBtn.BackgroundColor3 = COLORS.red
			return
		end
		leave()
		newGameMode = true
		render()
	end)
	local row = Instance.new("Frame")
	row.BackgroundTransparency = 1
	row.Size = UDim2.new(1, 0, 0, 44)
	row.LayoutOrder = 4
	row.Parent = box
	local rl = Instance.new("UIListLayout")
	rl.FillDirection = Enum.FillDirection.Horizontal
	rl.Padding = UDim.new(0, 8)
	rl.Parent = row
	local setBtn = mkButton(row, "⚙ 설정", Color3.fromRGB(44, 56, 74), UDim2.new(0.5, -4, 1, 0), function() openOptions() end, true)
	setBtn.TextSize = 15
	local function musicLabel()
		local on = Sfx.state()
		return if on then "🔊 음악 켜짐" else "🔇 음악 꺼짐"
	end
	local musicBtn
	musicBtn = mkButton(row, musicLabel(), Color3.fromRGB(44, 56, 74), UDim2.new(0.5, -4, 1, 0), function()
		local on = Sfx.state()
		Sfx.setMusicEnabled(not on)
		musicBtn.Text = musicLabel()
	end, true)
	musicBtn.TextSize = 15
	local foot = mkLabel(box, "진행은 자동으로 저장돼요 · 화면을 누르면 소리가 켜져요", 12, COLORS.muted, false, 5)
	foot.Size = UDim2.new(1, 0, 0, 18)
	foot.AutomaticSize = Enum.AutomaticSize.None
	foot.TextXAlignment = Enum.TextXAlignment.Center
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
			return
		end
		if result and not result.loading then
			return
		end
		task.wait(0.5)
	end
	message, messageOk = "서버에 연결하지 못했어요", false
	render()
end)

openTab = function(tabId)
	currentTab = tabId
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
	local function closePopup()
		if popupGui then
			popupGui:Destroy()
			popupGui = nil
			popupFor = nil
		end
	end
	local function openPopup(ev)
		closePopup()
		popupFor = ev.id
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
		win.BackgroundColor3 = Color3.fromRGB(14, 22, 36)
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
