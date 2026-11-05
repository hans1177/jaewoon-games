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
	{ id = "codex", name = "도감" },
	{ id = "tech", name = "연구" },
	{ id = "quest", name = "퀘스트" },
	{ id = "battle", name = "전투" },
}

local view = nil -- 서버가 보낸 최신 스냅샷
local currentTab = "status"
local syncScene
local sceneKey = nil
local sceneCtl = nil -- 현재 3D 장면의 제어(출항 연출 등)
local sceneHold = false -- 항해 중에는 장면을 바꾸지 않는다
local arriveNext = false -- 다음 장면은 입항 연출로 시작
local amountIndex = 1
local message = ""
local messageOk = true
local busy = false
local equipped = nil -- 자동스킬 편집 중인 목록
local chosenNation = "england"
local chosenYear = 1700

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
		b.Activated:Connect(onClick)
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
main.Parent = gui
local sizeLimit = Instance.new("UISizeConstraint")
sizeLimit.MaxSize = Vector2.new(560, 900)
sizeLimit.Parent = main

local headerLabel = Instance.new("TextLabel")
headerLabel.BackgroundTransparency = 1
headerLabel.Position = UDim2.fromOffset(8, 4)
headerLabel.Size = UDim2.new(1, -150, 0, 44)
headerLabel.TextXAlignment = Enum.TextXAlignment.Left
headerLabel.TextYAlignment = Enum.TextYAlignment.Top
headerLabel.TextWrapped = true
headerLabel.TextSize = 13
headerLabel.Font = Enum.Font.GothamBold
headerLabel.TextColor3 = COLORS.text
headerLabel.Text = "불러오는 중..."
headerLabel.Parent = mainInner

local coinChip, _, coinValue = CommonUI.CreateCurrencyChip({ name = "Coins", size = UDim2.fromOffset(132, 34), text = "0" })
coinChip.AnchorPoint = Vector2.new(1, 0)
coinChip.Position = UDim2.new(1, -8, 0, 4)
coinChip.Parent = mainInner

local tabBar = Instance.new("Frame")
tabBar.BackgroundTransparency = 1
tabBar.BorderSizePixel = 0
tabBar.Position = UDim2.fromOffset(8, 52)
tabBar.Size = UDim2.new(1, -16, 0, 124) -- 세 줄 (탭이 많아 한 줄에 다 안 들어간다)
tabBar.Parent = mainInner
local tabLayout = Instance.new("UIGridLayout")
tabLayout.CellSize = UDim2.new(0.2, -5, 0, 36)
tabLayout.CellPadding = UDim2.fromOffset(5, 6)
tabLayout.SortOrder = Enum.SortOrder.LayoutOrder
tabLayout.Parent = tabBar

local content = Instance.new("ScrollingFrame")
content.BackgroundTransparency = 1
content.BorderSizePixel = 0
content.Position = UDim2.fromOffset(8, 182)
content.Size = UDim2.new(1, -16, 1, -190)
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

local function clearContent()
	for _, child in content:GetChildren() do
		if not child:IsA("UIListLayout") then
			child:Destroy()
		end
	end
end

-- 서버 호출 -----------------------------------------------------------------

local render

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
	local result = call("Sail", { portId = portId })
	if result and result.ok then
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

	-- 등장 인물 (실루엣): 머리, 몸, 두건
	local npc = mkBox(picture, UDim2.fromScale(0.5, 0.95), UDim2.fromOffset(90, 150), Color3.new(0, 0, 0), 1)
	npc.AnchorPoint = Vector2.new(0.5, 1)
	local body = mkBox(npc, UDim2.fromOffset(10, 56), UDim2.fromOffset(70, 94), Color3.fromRGB(58, 44, 70))
	local bc = Instance.new("UICorner")
	bc.CornerRadius = UDim.new(0.3, 0)
	bc.Parent = body
	mkBox(npc, UDim2.fromOffset(2, 66), UDim2.fromOffset(86, 6), Color3.fromRGB(224, 170, 69))
	mkRound(npc, UDim2.fromOffset(45, 34), UDim2.fromOffset(40, 40), Color3.fromRGB(232, 196, 160), 0, Vector2.new(0.5, 0.5))
	local hat = mkBox(npc, UDim2.fromOffset(20, 6), UDim2.fromOffset(50, 18), Color3.fromRGB(40, 30, 52))
	local hc = Instance.new("UICorner")
	hc.CornerRadius = UDim.new(0.5, 0)
	hc.Parent = hat

	local chapter = Instance.new("TextLabel")
	chapter.BackgroundTransparency = 1
	chapter.Position = UDim2.fromOffset(110, 14)
	chapter.Size = UDim2.new(1, -122, 0, 22)
	chapter.Font = Enum.Font.GothamBold
	chapter.TextSize = 15
	chapter.TextXAlignment = Enum.TextXAlignment.Left
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
		return mkLabel(content, string.format("특산: %s\n수요: %s", table.concat(h.produces, ", "), table.concat(h.demands, ", ")), 13, COLORS.muted, false)
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
		return mkRow(content, "소문 듣기", string.format("술값 %d · 지금 여기서 사서 다른 항구에 팔면 남는 상품", h.rumorCost), {
			{ text = "듣기", color = COLORS.blue, onClick = function() call("Rumor", {}) end },
		}, 56)
	end)
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
	add(function() return mkHeader(content, "시작 가이드") end)
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
	add(function() return mkHeader(content, string.format("동료 (최대 %d명)", view.companions.max)) end)
	for _, c in view.companions.list do
		add(function()
			local sub = string.format("%s\n영입 %d코인 · 호감도 %d (%s)%s", c.summary, c.fee, c.affinity, ({ "낯선 사이", "믿는 사이", "오랜 벗" })[c.tier], if c.blocked and not c.joined then " · " .. c.blocked else "")
			local btn = if c.joined
				then { text = "작별", color = COLORS.red, onClick = function() call("Dismiss", { companionId = c.id }) end }
				else { text = "영입", color = COLORS.green, enabled = c.blocked == nil, onClick = function() call("Recruit", { companionId = c.id }) end }
			return mkRow(content, c.name .. (if c.joined then "  ✔" else ""), sub, { btn }, 76)
		end)
	end
	add(function() return mkHeader(content, "기록") end)
	add(function()
		return mkRow(content, string.format("%s · %d년 (항해 %d일째)", p.nation, p.year, p.day),
			string.format("명성 %d · 도감 %d/%d · 완료한 퀘스트 %d", p.fame, view.codex.found, view.codex.total, view.quests.doneCount), nil, 52)
	end)
end

local function renderTrade()
	if view.news and #view.news > 0 then
		add(function() return mkLabel(content, "시장 소식\n" .. table.concat(view.news, "\n"), 12, COLORS.gold, false) end)
	end
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
	for _, g in view.goods do
		add(function()
			local tag = if g.tag ~= "" then (" [" .. g.tag .. "]") else ""
			return mkRow(content, g.name .. tag .. (if g.trend == "up" then " ▲" elseif g.trend == "down" then " ▼" else ""), string.format("사기 %d · 팔기 %d · 보유 %d", g.buy, g.sell, g.owned), {
				{ text = "구매", color = COLORS.blue, onClick = function() call("Buy", { goodId = g.id, amount = amount() }) end },
				{ text = "판매", color = COLORS.green, onClick = function() call("Sell", { goodId = g.id, amount = amount() }) end, enabled = g.owned > 0 },
			}, 56)
		end)
	end
end

local function renderRoute()
	local ship = view.ship
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
			return mkRow(content, r.name, string.format("%d일 · %d km · 보급품 %d%s%s", r.days, r.distanceKm, r.supplies, if r.coal > 0 then (" · 석탄 " .. r.coal) else "", warn), {
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
			return mkRow(content, c.name, sub, {
				{ text = if c.owned then "장착중" else (if c.price == 0 then "기본" else tostring(c.price)), color = COLORS.steam, onClick = function() call("BuyCannon", { cannonId = c.id }) end,
					enabled = yard.available and not c.owned and not c.locked },
			}, 80)
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
	for _, s in yard.ships do
		add(function()
			local sub = string.format("%s\n화물 %d · 속도 %d · 선체 %d · 포 %d · 선원 %d", s.summary, s.cargo, s.speed, s.hull, s.cannons, s.crew)
			if s.locked then
				sub ..= "\n" .. s.locked
			end
			local label = if s.owned then "보유중" else (if s.price == 0 then "기본" else tostring(s.price))
			return mkRow(content, string.format("[등급%d] ", s.class) .. s.name .. (if s.steam then " (증기)" else ""), sub, {
				{ text = label, color = if s.steam then COLORS.steam else COLORS.blue, onClick = function() call("BuyShip", { shipId = s.id }) end,
					enabled = yard.available and not s.owned and not s.locked },
			}, 92)
		end)
	end
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
				{ text = "탐험", color = COLORS.green, onClick = function() call("Explore", { siteId = s.id }) end, enabled = s.unlocked and s.left > 0 },
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
					return mkRow(content, r.name, string.format("%d일 · %d km · 보급품 %d%s", r.days, r.distanceKm, r.supplies, if r.coal > 0 then (" · 석탄 " .. r.coal) else ""), {
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
			call("NewGame", { nationId = chosenNation, startYear = chosenYear })
		end, true)
	end)
end

-- 전체 그리기 -----------------------------------------------------------------

local function renderTabs()
	for _, child in tabBar:GetChildren() do
		if child:IsA("TextButton") then
			child:Destroy()
		end
	end
	for i, t in TABS do
		local b = mkButton(tabBar, t.name, if currentTab == t.id then COLORS.gold else COLORS.grey, UDim2.fromOffset(68, 36), function()
			currentTab = t.id
			if t.id ~= "battle" then
				equipped = nil
			end
			render()
		end, true)
		b.LayoutOrder = i
	end
	local fold = mkButton(tabBar, "접기", COLORS.red, UDim2.fromOffset(60, 36), function()
		main.Visible = false
		menuToggle.Visible = true
	end, true)
	fold.LayoutOrder = #TABS + 1
end

-- 3D 항구 장면: 항구나 배가 바뀔 때만 다시 만든다
syncScene = function()
	if sceneHold then
		return
	end
	local p, ship = view.player, view.ship
	local key = p.portId .. "|" .. ship.id .. "|" .. table.concat(view.facilities or {}, ",") .. "|" .. tostring(p.hasShipyard) .. "|" .. tostring(#(view.story or {}) > 0)
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
		arrive = arriveNext,
	}, function(tab)
		currentTab = tab
		main.Visible = true
		menuToggle.Visible = false
		render()
	end)
	if not ok then
		warn("[Game] 항구 장면 오류", res)
		return
	end
	sceneKey = key
	sceneCtl = res.controls
	arriveNext = false
	local char = player.Character
	if char and char:FindFirstChild("HumanoidRootPart") then
		char:PivotTo(res.spawn)
	end
end

function render()
	order = 0
	clearContent()

	if not view then
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
	content.Position = UDim2.fromOffset(8, 182)
	content.Size = UDim2.new(1, -16, 1, -190)

	local p, ship = view.player, view.ship
	headerLabel.Text = string.format("%s · %d년 · %s\n%s  선체 %d/%d  화물 %d/%d  명성 %d",
		p.nation, p.year, p.portName, ship.name, ship.hull, ship.maxHull, ship.cargoUsed, ship.cargoCapacity, p.fame)
	coinValue.Text = tostring(p.coins)
	renderTabs()
	syncScene()

	if message ~= "" then
		add(function() return mkLabel(content, message, 13, if messageOk then COLORS.gold else COLORS.red, true) end)
	end
	RENDERERS[currentTab]()
end

-- 시작 --------------------------------------------------------------------

task.spawn(function()
	for _ = 1, 30 do
		local result = call("State")
		if result and (result.view or result.needsNewGame) then
			message = ""
			render()
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

menuToggle.Activated:Connect(function()
	main.Visible = true
	menuToggle.Visible = false
end)
