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

local COLORS = {
	text = Color3.fromRGB(240, 243, 247),
	muted = Color3.fromRGB(173, 181, 192),
	row = Color3.fromRGB(21, 25, 30),
	blue = Color3.fromRGB(76, 120, 183),
	green = Color3.fromRGB(91, 181, 120),
	red = Color3.fromRGB(214, 82, 76),
	gold = Color3.fromRGB(224, 170, 69),
	grey = Color3.fromRGB(80, 88, 98),
	steam = Color3.fromRGB(150, 110, 70),
}

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
gui.Name = "MareScientiaGui"
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
for id in PortData.Goods do
	GOOD_ICON[id] = if id == "wine" or id == "tobacco" then { "Menu", "trade" } else { "Goods", id }
end
-- 승인된 그림이 없는 상품 중, 같은 물건의 3D 모델이 있는 것은 그것을 쓴다
local WOOD = Color3.fromRGB(120, 78, 50)
for id, spec in {
	gold = { "Cargo", "gold-bar" }, silver = { "Cargo", "silver-bar" }, copper = { "Cargo", "copper-bar" },
	gems = { "Cargo", "gems-sack" }, jade = { "Cargo", "gem-medium", Color3.fromRGB(80, 170, 120) },
	pearl_shell = { "Cargo", "mussel-open" }, wine = { "Cargo", "glass-wine" },
	mahogany = { "Cargo", "wood-log-a", Color3.fromRGB(110, 54, 40) }, ebony = { "Cargo", "wood-log-a", Color3.fromRGB(40, 32, 30) },
	kauri = { "Cargo", "wood-log-a", Color3.fromRGB(176, 132, 82) }, logwood = { "Cargo", "wood-log-a", Color3.fromRGB(120, 50, 70) },
	brazilwood = { "Cargo", "wood-log-a", Color3.fromRGB(160, 62, 48) }, sandalwood = { "Cargo", "wood-log-a", Color3.fromRGB(190, 150, 96) },
	sandalwood_hi = { "Cargo", "wood-log-a", Color3.fromRGB(200, 160, 100) },
	palm_oil = { "Cargo", "barrel-open" }, rum = { "Cargo", "barrel-open", Color3.fromRGB(110, 70, 40) },
} do
	GOOD_ICON[id] = spec
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
local function iconFor(title, subtitle)
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

local function modelIcon(parent, kind, asset, tint, px, labelText)
	-- 등록된 상품·메뉴 그림은 3D 모델을 복제하지 않아 모바일 화면의 렌더 비용을 줄인다.
	if kind == "Goods" or kind == "Menu" then
		local image = Instance.new("ImageLabel")
		image.Name = kind .. "_" .. asset
		image.Size = UDim2.fromOffset(px, px)
		image.BackgroundColor3 = Color3.fromRGB(24, 37, 53)
		image.ScaleType = Enum.ScaleType.Fit
		local assetId = AssetIds[kind .. "/" .. asset]
		if assetId then
			image.Image = "rbxthumb://type=Asset&id=" .. tostring(assetId) .. "&w=420&h=420"
		else
			-- 승인된 그림이 아직 없는 상품: 빈 칸 대신 이름 타일로 표시한다
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
			nameTile.Parent = image
		end
		corner(image, 8)
		local stroke = Instance.new("UIStroke")
		stroke.Color = Color3.fromRGB(214, 170, 82)
		stroke.Transparency = 0.5
		stroke.Parent = image
		image.Parent = parent
		return image
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
		cam.CFrame = CFrame.lookAt(cf.Position + Vector3.new(0.85, 0.65, 1.2).Unit * reach, cf.Position)
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
local function withIcon(row, kind, asset, tint, px)
	local icon = modelIcon(row, kind, asset, tint, px)
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
	corner(b, 8)
	b.Parent = parent
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
	corner(row, 8)
	row.Parent = parent

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
	local ic = iconFor(title, subtitle)
	if ic and (height or 60) >= 50 then
		withIcon(row, ic[2], ic[3], nil, math.min(46, (height or 60) - 10))
	end
	return row
end

local function mkHeader(parent, text)
	local l = mkLabel(parent, text, 15, COLORS.gold, true)
	l.Size = UDim2.new(1, -8, 0, 22)
	l.AutomaticSize = Enum.AutomaticSize.None
	return l
end

-- 메인 화면 구조 ------------------------------------------------------------

local main, mainInner = CommonUI.CreatePanel({ name = "Main", size = UDim2.new(1, -16, 1, -16) })
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = Color3.fromRGB(14, 24, 38)
main.Parent = gui
do
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(214, 170, 82)
	st.Thickness = 2
	st.Parent = main
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
local portraitKey = nil
local PORTRAIT_ROLE = {
	["교역소"] = "Rogue", ["항만청"] = "Knight", ["조선소"] = "Barbarian",
	["주점"] = "Barbarian", ["학자의 서재"] = "Mage", ["선장실"] = "Rogue_Hooded",
}
local function setPortrait(groupName)
	if portraitKey == groupName then
		return
	end
	portraitKey = groupName
	for _, c in portraitFrame:GetChildren() do
		if c:IsA("Model") then
			c:Destroy()
		end
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
		image.Image = "rbxthumb://type=Asset&id=" .. tostring(menuAssetId) .. "&w=420&h=420"
		image.Parent = b
	end
	corner(b, 8)
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

local function updateHud(p, ship)
	hudName.Text = string.format("%s · %d년", p.nation, p.year)
	hudPort.Text = "항구  " .. tostring(p.portName)
	hudBanner.Text = tostring(p.portName)
	hullFill.Size = UDim2.fromScale(math.clamp(ship.hull / math.max(1, ship.maxHull), 0, 1), 1)
	hullFill.BackgroundColor3 = if ship.hull / math.max(1, ship.maxHull) < 0.35 then COLORS.red else COLORS.green
	hudShip.Text = string.format("%s  화물 %d/%d  명성 %d", ship.name, ship.cargoUsed, ship.cargoCapacity, p.fame)
	hudCoin.Text = tostring(p.coins) .. " 코인"
end

menuToggle:GetPropertyChangedSignal("Visible"):Connect(function()
	hud.Visible = menuToggle.Visible
end)

local function clearContent()
	for _, child in content:GetChildren() do
		if not child:IsA("UIListLayout") then
			child:Destroy()
		end
	end
end

-- 서버 호출 -----------------------------------------------------------------

local render
local tradeHallRefresh -- 교역소 별도 화면이 열려 있으면 서버 응답 뒤에 다시 그린다

local function call(action, payload)
	if busy then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return remote:InvokeServer(action, payload or {})
	end)
	busy = false
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

local function playVoyage(fromName, toName, days, steam, path)
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
			if cam and hull then
				cam.CameraSubject = hull
			end
			task.wait(dur)
			if cam and hum then
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
			ok, err = pcall(playVoyage, from, view.player.portName, days, steam, SeaRoutes.path(fromId, portId, PortData.Ports))
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
	Sfx.play("sfx_bell")
	Sfx.ambient({ "sfx_waves" })
	syncScene()
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
}

local function paintScene(parent, art, t)
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

local function playStory(ev)
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
	paintScene(picture, ev.art)

	-- 등장 인물: 승인된 3D 인물 모델을 반신 초상으로 보여 준다 (모델이 없으면 실루엣)
	local portraitModel = storyPortraitModel(ev.npc or "", ev.id or "")
	local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
	local tpl = portraitModel and lib and lib:FindFirstChild("People") and lib.People:FindFirstChild(portraitModel)
	if tpl then
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
		local focus = cf.Position + Vector3.new(0, size.Y * 0.2, 0)
		cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.3, 0.12, -1).Unit * (size.Y * 1.05), focus)
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
				local result = call("PlayStory", { eventId = ev.id, choice = ch.index })
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
end

-- 탭 화면 -------------------------------------------------------------------

local order = 0
local function nextOrder()
	order += 1
	return order
end

local function add(builder)
	local obj = builder()
	obj.LayoutOrder = nextOrder()
	if obj.Parent == nil then
		obj.Parent = content -- 직접 만든 프레임(지도, 카드 격자)도 목록에 넣는다
	end
	return obj
end

local function renderHarbor()
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
				return mkRow(content, string.format("[%s] %s%s", c.role, c.name, if c.joined then "  ✔" else ""), sub, btns, 84)
			end)
		end
	end
end

local function renderStatus()
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
				btn = { text = tostring(g.price), color = COLORS.gold, enabled = view.player.fame >= g.minFame, onClick = function() call("BuyGear", { gearId = g.id }) end }
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
	add(function() return mkHeader(content, string.format("동료 (최대 %d명)", view.companions.max)) end)
	if view.talk then
		add(function()
			return mkLabel(content, string.format("%s\n\"%s\"\n%s", view.talk.name, view.talk.line, view.talk.note or ""), 16, COLORS.gold, true)
		end)
	end
	for _, c in view.companions.list do
		add(function()
			local sub = string.format("%s\n영입 %d코인 · 호감도 %d (%s)%s", c.summary, c.fee, c.affinity, ({ "낯선 사이", "믿는 사이", "오랜 벗" })[c.tier], if c.blocked and not c.joined then " · " .. c.blocked else "")
			local btn = if c.joined
				then { text = "작별", color = COLORS.red, onClick = function() call("Dismiss", { companionId = c.id }) end }
				else { text = "영입", color = COLORS.green, enabled = c.blocked == nil, onClick = function() call("Recruit", { companionId = c.id }) end }
			local btns = { btn }
			if c.joined then
				table.insert(btns, 1, { text = "대화", color = COLORS.blue, onClick = function() call("Talk", { companionId = c.id }) end })
			end
			return mkRow(content, c.name .. (if c.joined then "  ✔" else ""), sub, btns, 76)
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

local function intelName(level)
	if level >= 3 then
		return "정확한 수치"
	elseif level >= 1 then
		return "대략적인 범위"
	end
	return "감만 잡는 힌트"
end

-- 뱃사람 귀띔: 크게, 눈에 잘 띄게
local function addRumorPanel()
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
		do
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
			local icon = if gi then modelIcon(row, gi[1], gi[2], gi[3], 52, g.name) else modelIcon(row, nil, nil, nil, 52, g.name)
			icon.Position = UDim2.fromOffset(8, 8)
			local nm = mkLabel(row, g.name .. (if g.trend == "up" then " ▲" elseif g.trend == "down" then " ▼" else ""), 20, if g.trend == "up" then COLORS.green elseif g.trend == "down" then COLORS.red else COLORS.text, true)
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
			local big = if gi then modelIcon(right, gi[1], gi[2], gi[3], 96, sel.name) else modelIcon(right, nil, nil, nil, 96, sel.name)
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

local function renderTrade()
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
			local icon = if gi then modelIcon(cardF, gi[1], gi[2], gi[3], 60, g.name)
				else modelIcon(cardF, nil, nil, nil, 60, g.name)
			icon.Position = UDim2.fromOffset(8, 8)
			local nm = mkLabel(cardF, g.name .. (if g.trend == "up" then " ▲" elseif g.trend == "down" then " ▼" else ""), 18, COLORS.text, true)
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

local function renderRoute()
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
				{ text = "출항", color = COLORS.blue, onClick = function() sail(r.id) end },
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
		do
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

local function startField(s)
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

local function renderExplore()
	add(function() return mkHeader(content, "탐험 지점") end)
	if #view.sites == 0 then
		add(function() return mkLabel(content, "이 항구 근처에는 탐험 지점이 없어요.", 13, COLORS.muted, false) end)
	end
	for _, s in view.sites do
		add(function()
			local sub = if s.left == 0 then "모두 조사했어요" else string.format("발견 가능 %d · %d일 · 모험 Lv.%d 이상", s.left, s.days, s.minLevel)
			return mkRow(content, s.name, sub, {
				{ text = "탐험", color = COLORS.green, onClick = function() startField(s) end, enabled = s.unlocked and s.left > 0 },
			}, 54)
		end)
	end
	add(function() return mkHeader(content, "이 항구의 학자") end)
	if #view.scholars == 0 then
		add(function() return mkLabel(content, "지금 이 항구에는 학자가 없어요.", 13, COLORS.muted, false) end)
	end
	for _, sc in view.scholars do
		add(function()
			local sub = if sc.status == "ready" then "만날 수 있어요" elseif sc.status == "met" then "지식을 전수받았어요" else sc.status
			return mkRow(content, sc.name, sub, {
				{ text = "방문", color = COLORS.gold, onClick = function() call("Visit", { scholarId = sc.id }) end, enabled = sc.status == "ready" },
			}, 54)
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

-- 카드 그림: 이미지가 있으면 이미지, 없으면 분야 색의 임시 일러스트
local function paintCardArt(parent, card, fieldDef)
	parent.ClipsDescendants = true
	if card.found and card.image then
		local img = Instance.new("ImageLabel")
		img.Size = UDim2.fromScale(1, 1)
		img.BackgroundTransparency = 1
		img.Image = card.image
		img.ScaleType = Enum.ScaleType.Crop
		img.Parent = parent
		return
	end
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
	mark.Text = if card.found then string.sub(fieldDef.name, 1, 3) else "?"
	local pad = Instance.new("UIPadding")
	pad.PaddingTop, pad.PaddingBottom = UDim.new(0.2, 0), UDim.new(0.2, 0)
	pad.Parent = mark
	mark.Parent = parent
end

local function showCardDetail(card)
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
	box.Size = UDim2.new(0.9, 0, 0, 440)
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
	art.Size = UDim2.new(1, -20, 0, 150)
	art.BackgroundColor3 = COLORS.grey
	art.ZIndex = 42
	corner(art, 10)
	art.Parent = box
	paintCardArt(art, card, fieldDef)
	for _, d in art:GetDescendants() do
		if d:IsA("GuiObject") then
			d.ZIndex = 43
		end
	end
	local body = Instance.new("ScrollingFrame")
	body.BackgroundTransparency = 1
	body.BorderSizePixel = 0
	body.Position = UDim2.fromOffset(10, 168)
	body.Size = UDim2.new(1, -20, 1, -218)
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
	local close = mkButton(box, "닫기", COLORS.gold, UDim2.new(1, -20, 0, 36), function()
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
	add(function() return mkHeader(content, "전체 도감 보상") end)
	tierRows(cx.overall, "all", "전체 %d%% 달성")
end

local function renderCodexField()
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
					showCardDetail(c)
				end)
			end
		end
		return grid
	end)
end

local function renderCodex()
	if codexField then
		renderCodexField()
	else
		renderCodexOverview()
	end
end

local function renderTech()
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

local function renderQuest()
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
	for _, q in view.quests.available do
		add(function()
			return mkRow(content, q.name, string.format("%s\n보상 %d코인", q.summary, q.rewardCoins), {
				{ text = "수락", color = COLORS.blue, onClick = function() call("Accept", { questId = q.id }) end },
			}, 64)
		end)
	end
end

local function renderBattle()
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
local function renderMap()
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
						{ text = "출항", color = COLORS.blue, onClick = function() selectedPort = nil; sail(r.id) end },
					}, 56)
				end)
			end
		end
	end
end

local RENDERERS = {
	map = renderMap, harbor = renderHarbor, status = renderStatus, trade = renderTrade, route = renderRoute, yard = renderYard, explore = renderExplore,
	codex = renderCodex, tech = renderTech, quest = renderQuest, battle = renderBattle,
}

-- 새 게임 선택 화면 -------------------------------------------------------------

local function renderNewGame()
	add(function() return mkHeader(content, "나라를 선택하세요") end)
	local list = {}
	for id, n in PortData.Nations do
		table.insert(list, n)
	end
	table.sort(list, function(a, b) return a.id < b.id end)
	for _, n in list do
		add(function()
			local selected = chosenNation == n.id
			local row = mkRow(content, n.name .. (if selected then "  ✔" else ""),
				string.format("시작 항구: %s\n%s", PortData.Ports[n.startPort].name, n.summary), {
					{ text = if selected then "선택됨" else "선택", color = if selected then COLORS.gold else COLORS.blue, onClick = function()
						chosenNation = n.id
						render()
					end },
				}, 72)
			return row
		end)
	end
	add(function() return mkHeader(content, "시대를 선택하세요") end)
	local eras = {
		{ 1650, "1650년", "과학혁명의 시작. 증기 연구는 천천히 시작해요" },
		{ 1700, "1700년 (추천)", "증기 기술의 새벽. 파팽·세이버리·뉴턴을 모두 만날 수 있어요" },
		{ 1750, "1750년", "분류학의 시대. 린네를 만날 수 있어요" },
	}
	for _, e in eras do
		add(function()
			local selected = chosenYear == e[1]
			return mkRow(content, e[2] .. (if selected then "  ✔" else ""), e[3], {
				{ text = if selected then "선택됨" else "선택", color = if selected then COLORS.gold else COLORS.blue, onClick = function()
					chosenYear = e[1]
					render()
				end },
			}, 64)
		end)
	end
	add(function()
		return mkButton(content, "출항!", COLORS.green, UDim2.new(1, -6, 0, 48), function()
			local restart = view ~= nil
			newGameMode = false
			local result = call("NewGame", { nationId = chosenNation, startYear = chosenYear, restart = restart })
			if not (result and result.ok) and restart then
				newGameMode = true
				render()
			end
		end, true)
	end)
	if view then
		add(function()
			return mkButton(content, "취소 (이어서 하기)", COLORS.grey, UDim2.new(1, -6, 0, 40), function()
				newGameMode = false
				render()
			end, true)
		end)
	end
end

-- 전체 그리기 -----------------------------------------------------------------

local function renderTabs()
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
		local menuAssetId = AssetIds["Menu/" .. id]
		if menuAssetId then
			b.Text = ""
			local image = Instance.new("ImageLabel")
			image.Name = "Icon"
			image.BackgroundTransparency = 1
			image.Position = UDim2.new(0, 4, 0.5, -12)
			image.Size = UDim2.fromOffset(24, 24)
			image.ScaleType = Enum.ScaleType.Fit
			image.Image = "rbxthumb://type=Asset&id=" .. tostring(menuAssetId) .. "&w=420&h=420"
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
	local key = p.portId .. "|" .. ship.id .. "|" .. table.concat(view.facilities or {}, ",") .. "|" .. tostring(p.hasShipyard) .. "|" .. tostring(#(view.story or {}) > 0) .. "|" .. table.concat(crewIds, ",")
	if key == sceneKey then
		return
	end
	local ok, res = pcall(PortScene.build, {
		portId = p.portId,
		portName = p.portName,
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

function render()
	order = 0
	clearContent()
	if not audioLock then
		Sfx.music(if view and currentTab == "trade" then "music_market" else "music_harbor")
		if view then
			Sfx.ambient({ "sfx_waves" })
		end
	end

	if not view or newGameMode then
		headerLabel.Text = "새 게임"
		tabBar.Visible = false
		content.Position = UDim2.fromOffset(8, 52)
		content.Size = UDim2.new(1, -16, 1, -60)
		if message ~= "" then
			add(function() return mkLabel(content, message, 13, if messageOk then COLORS.gold else COLORS.red, true) end)
		end
		renderNewGame()
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
	updateHud(p, ship)
	renderTabs()
	syncScene()

	if message ~= "" then
		add(function() return mkLabel(content, message, 13, if messageOk then COLORS.gold else COLORS.red, true) end)
	end
	RENDERERS[currentTab]()
end

-- 시작 화면: 이어하기 / 새 게임 / 소리 ---------------------------------------------

local function showTitle()
	local layer = overlayGui("TitleGui", 40)
	local wasMain = main.Visible
	main.Visible = false
	menuToggle.Visible = false
	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = Color3.fromRGB(8, 16, 30)
	root.BackgroundTransparency = 0.18
	root.BorderSizePixel = 0
	root.Parent = layer
	local grad = Instance.new("UIGradient")
	grad.Rotation = 90
	grad.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.35), NumberSequenceKeypoint.new(1, 0) })
	grad.Parent = root

	local box = Instance.new("Frame")
	box.AnchorPoint = Vector2.new(0.5, 0.5)
	box.Position = UDim2.fromScale(0.5, 0.5)
	box.Size = UDim2.fromOffset(420, 460)
	box.BackgroundTransparency = 1
	box.Parent = root
	local lay = Instance.new("UIListLayout")
	lay.Padding = UDim.new(0, 12)
	lay.HorizontalAlignment = Enum.HorizontalAlignment.Center
	lay.SortOrder = Enum.SortOrder.LayoutOrder
	lay.Parent = box

	local function text(str, size, color, h, order)
		local l = Instance.new("TextLabel")
		l.BackgroundTransparency = 1
		l.Size = UDim2.new(1, 0, 0, h)
		l.Text = str
		l.TextSize = size
		l.TextColor3 = color
		l.Font = Enum.Font.GothamBold
		l.TextWrapped = true
		l.TextStrokeTransparency = 0.5
		l.LayoutOrder = order
		l.Parent = box
		return l
	end
	text("MARE SCIENTIA", 40, COLORS.gold, 50, 1)
	text("과학의 바다 · 대항해시대", 20, COLORS.text, 28, 2)

	local function big(label, color, order, enabled, onClick)
		local b = mkButton(box, label, color, UDim2.new(1, 0, 0, 58), onClick, enabled)
		b.TextSize = 24
		b.LayoutOrder = order
		return b
	end
	local continueText = "이어하기"
	if view then
		continueText = string.format("이어하기\n%s · %d코인", view.player.portName, view.player.coins)
	end
	local cont = big(continueText, COLORS.green, 3, view ~= nil, function()
		layer:Destroy()
		main.Visible = wasMain
		menuToggle.Visible = not wasMain
	end)
	cont.TextSize = if view then 20 else 24
	local confirmed = false
	local newBtn
	newBtn = big("새 게임", COLORS.blue, 4, true, function()
		if view and not confirmed then
			confirmed = true
			newBtn.Text = "정말 새로 시작할까요? (저장이 사라져요) 한 번 더 누르세요"
			newBtn.TextSize = 16
			newBtn.BackgroundColor3 = COLORS.red
			return
		end
		layer:Destroy()
		newGameMode = true
		main.Visible = true
		menuToggle.Visible = false
		render()
	end)

	-- 소리
	local snd = Instance.new("Frame")
	snd.BackgroundTransparency = 1
	snd.Size = UDim2.new(1, 0, 0, 44)
	snd.LayoutOrder = 5
	snd.Parent = box
	local sl = Instance.new("UIListLayout")
	sl.FillDirection = Enum.FillDirection.Horizontal
	sl.Padding = UDim.new(0, 8)
	sl.HorizontalAlignment = Enum.HorizontalAlignment.Center
	sl.VerticalAlignment = Enum.VerticalAlignment.Center
	sl.Parent = snd
	local function small(label, color, w, onClick)
		local b = mkButton(snd, label, color, UDim2.fromOffset(w, 40), onClick, true)
		b.TextSize = 15
		return b
	end
	local musicBtn
	local function musicLabel()
		local on = Sfx.state()
		local ml = Sfx.levels()
		return string.format("음악 %s %d%%", if on then "켜짐" else "꺼짐", math.floor(ml / 1.5 * 100 + 0.5))
	end
	musicBtn = small(musicLabel(), COLORS.grey, 150, function()
		local on = Sfx.state()
		Sfx.setMusicEnabled(not on)
		musicBtn.Text = musicLabel()
	end)
	small("음량 -", COLORS.grey, 80, function()
		Sfx.stepMusic(-1)
		Sfx.stepSfx(-1)
		musicBtn.Text = musicLabel()
	end)
	small("음량 +", COLORS.blue, 80, function()
		Sfx.stepMusic(1)
		Sfx.stepSfx(1)
		musicBtn.Text = musicLabel()
	end)
	text("모험 Lv와 명성이 쌓이면 먼 바다가 열려요", 14, COLORS.muted, 24, 6)
	Sfx.music("music_harbor")
end

-- 시작 --------------------------------------------------------------------

task.spawn(function()
	for _ = 1, 30 do
		local result = call("State")
		if result and (result.view or result.needsNewGame) then
			message = ""
			render()
			showTitle()
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


-- 개발 캡처용: 로컬에서 "DevCall" 속성에 State 를 넣으면 화면을 서버 상태로 새로 그린다 (읽기 전용 요청만)
task.spawn(function()
	while true do
		task.wait(1)
		if workspace:GetAttribute("DevCall") == "State" then
			workspace:SetAttribute("DevCall", nil)
			call("State")
		end
		if workspace:GetAttribute("DevCall") == "Hall" then
			workspace:SetAttribute("DevCall", nil)
			openTradeHall()
		end
	end
end)
