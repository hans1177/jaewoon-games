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
tabBar.Size = UDim2.new(1, -16, 0, 80) -- 두 줄 (탭이 10개라 한 줄에 다 안 들어간다)
tabBar.Parent = mainInner
local tabLayout = Instance.new("UIGridLayout")
tabLayout.CellSize = UDim2.new(0.2, -5, 0, 36)
tabLayout.CellPadding = UDim2.fromOffset(5, 6)
tabLayout.SortOrder = Enum.SortOrder.LayoutOrder
tabLayout.Parent = tabBar

local content = Instance.new("ScrollingFrame")
content.BackgroundTransparency = 1
content.BorderSizePixel = 0
content.Position = UDim2.fromOffset(8, 138)
content.Size = UDim2.new(1, -16, 1, -146)
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

local function playVoyage(fromName, toName, days, steam)
	local overlay = Instance.new("TextButton") -- 누르면 건너뛰기
	overlay.Name = "VoyageScene"
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.Text = ""
	overlay.AutoButtonColor = false
	overlay.BackgroundColor3 = Color3.fromRGB(120, 180, 225)
	overlay.BorderSizePixel = 0
	overlay.ZIndex = 50
	overlay.Parent = gui

	-- 하늘 위쪽, 바다 아래쪽
	local sea = mkBox(overlay, UDim2.fromScale(0, 0.5), UDim2.fromScale(1, 0.5), Color3.fromRGB(34, 96, 150))
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
	local days, steam = 1, view.ship.steam
	for _, r in view.routes do
		if r.id == portId then
			days = r.days
		end
	end
	local result = call("Sail", { portId = portId })
	if result and result.ok then
		playVoyage(from, view.player.portName, days, steam)
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
	return obj
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
	for _, s in yard.ships do
		add(function()
			local sub = string.format("%s\n화물 %d · 속도 %d · 선체 %d · 포 %d · 선원 %d", s.summary, s.cargo, s.speed, s.hull, s.cannons, s.crew)
			if s.locked then
				sub ..= "\n" .. s.locked
			end
			local label = if s.owned then "보유중" else (if s.price == 0 then "기본" else tostring(s.price))
			return mkRow(content, s.name .. (if s.steam then " (증기)" else ""), sub, {
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
local FIELD_NAMES = {
	Botany = "식물", Zoology = "동물", Mineral = "광물", Relic = "유물", Site = "유적", Astronomy = "천문",
	Chemistry = "화학", Myth = "신화", Physics = "물리", Geography = "지리", Philosophy = "철학", Medicine = "의학",
}

local function renderCodex()
	add(function()
		return mkLabel(content, string.format("세계 백과 %d / %d", view.codex.found, view.codex.total), 15, COLORS.gold, true)
	end)
	for _, c in view.codex.cards do
		add(function()
			local row = mkRow(content, string.format("[%s] %s · %s", FIELD_NAMES[c.field] or c.field, c.name, c.rarity), c.description, nil, 68)
			if not c.found then
				row.BackgroundTransparency = 0.4
			else
				local bar = Instance.new("Frame")
				bar.Size = UDim2.new(0, 4, 1, -12)
				bar.Position = UDim2.fromOffset(0, 6)
				bar.BackgroundColor3 = RARITY_COLOR[c.rarity] or COLORS.muted
				bar.BorderSizePixel = 0
				bar.Parent = row
			end
			return row
		end)
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

-- 실제 위도·경도 위에 항구를 찍은 세계지도 (Natural Earth 해안선)
local function renderMap()
	local cosLat = 0.66 -- 유럽 위도에서 가로를 줄여 비율을 맞춘다
	local function mapX(lon) return (lon - Geo.lonMin) / (Geo.lonMax - Geo.lonMin) end
	local function mapY(lat) return (Geo.latMax - lat) / (Geo.latMax - Geo.latMin) end
	add(function()
		local frame = Instance.new("Frame")
		frame.Size = UDim2.new(1, 0, 0, 300)
		frame.BackgroundColor3 = Color3.fromRGB(38, 82, 120)
		frame.BorderSizePixel = 0
		frame.ClipsDescendants = true
		local ratio = Instance.new("UIAspectRatio")
		ratio.AspectRatio = (Geo.cols * cosLat) / Geo.rows
		ratio.Parent = frame
		for _, st in Geo.landStrips do
			local r, c0, c1 = st[1], st[2], st[3]
			local land = Instance.new("Frame")
			land.Position = UDim2.fromScale((c0) / Geo.cols, (r - 1) / Geo.rows)
			land.Size = UDim2.fromScale((c1 - c0) / Geo.cols, 1 / Geo.rows + 0.002)
			land.BackgroundColor3 = Color3.fromRGB(122, 140, 96)
			land.BorderSizePixel = 0
			land.Parent = frame
		end
		local routeDays = {}
		for _, rt in view.routes do
			routeDays[rt.id] = rt
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
	map = renderMap, status = renderStatus, trade = renderTrade, route = renderRoute, yard = renderYard, explore = renderExplore,
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
	content.Position = UDim2.fromOffset(8, 138)
	content.Size = UDim2.new(1, -16, 1, -146)

	local p, ship = view.player, view.ship
	headerLabel.Text = string.format("%s · %d년 · %s\n%s  선체 %d/%d  화물 %d/%d  명성 %d",
		p.nation, p.year, p.portName, ship.name, ship.hull, ship.maxHull, ship.cargoUsed, ship.cargoCapacity, p.fame)
	coinValue.Text = tostring(p.coins)
	renderTabs()

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
