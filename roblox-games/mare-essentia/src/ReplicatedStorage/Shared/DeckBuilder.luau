--!nonstrict
-- 내 카드(덱 구성) 화면: 카드 게임 컬렉션처럼 [왼쪽 카드 격자 | 오른쪽 덱 목록] 두 칸 + 위 상태줄 + 아래 큰 행동 버튼.
-- 규칙·저장은 CardBook/서버가 그대로 맡고, 여기서는 보여 주고 누르는 일만 한다 (ctx 로 동작을 받는다).
--   카드 누르기 = 큰 카드 보기 · + = 덱에 1장 넣기 · 덱 줄의 − = 1장 빼기
local TweenService = game:GetService("TweenService")
local Sfx = require(script.Parent:WaitForChild("Sfx"))
local CardTheme = require(script.Parent:WaitForChild("CardTheme"))
local CardSymbols = require(script.Parent:WaitForChild("CardSymbols"))
local Gallery = require(script.Parent:WaitForChild("CardGallery"))

local DeckBuilder = {}

local INK = CardTheme.cream
local GOLD = CardTheme.gold
local PANEL = CardTheme.leather
local PANEL2 = CardTheme.panel
local BINDING = CardTheme.brass
local PAPER = CardTheme.parchment
local SEPIA = CardTheme.ink
local ADD = CardTheme.confirm
local REMOVE = CardTheme.danger
local SAVE = Color3.fromRGB(32, 44, 78)
local TIER_COLOR = { Color3.fromRGB(176, 112, 62), Color3.fromRGB(196, 202, 212), Color3.fromRGB(238, 196, 84) }
local ROW_COLOR = { melee = Color3.fromRGB(190, 84, 62), ranged = Color3.fromRGB(96, 150, 84), cannon = Color3.fromRGB(84, 124, 176) }
local ROW_SHORT = { melee = "근", ranged = "사", cannon = "포" }
local FELT = CardTheme.allied
local FORMATION = { { "melee", "전열" }, { "ranged", "후열" }, { "special", "전술" } }
-- [카드 원화] 지역별 박물관 테두리는 카드 ID만 읽으며 카드 수치와 저장에는 관여하지 않는다.
local REGION_FRAME = { eu = "ui_frame_europe", ea = "ui_frame_east_asia", me = "ui_frame_middle_east", nw = "ui_frame_new_world", af = "ui_frame_africa", sa = "ui_frame_southeast_asia" }
local FILTERS = {
	{ id = "owned", text = "보유" }, { id = "all", text = "전체" }, { id = "combo", text = "대표 조합" },
	{ id = "melee", text = "전열" }, { id = "ranged", text = "후열" }, { id = "special", text = "전술" },
	{ id = "lo", text = "중립" }, { id = "hero", text = "영웅" },
	{ id = "eu", text = "유럽" }, { id = "ea", text = "동아시아" }, { id = "me", text = "중동" }, { id = "nw", text = "신대륙" },
	{ id = "af", text = "아프리카" }, { id = "sa", text = "동남아" },
	{ id = "crew", text = "동료" },
}
local PAGE = 60

local function corner(o, r)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, r)
	c.Parent = o
	if o:IsA("TextButton") or o:IsA("Frame") then
		local edge = Instance.new("UIStroke")
		edge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		edge.Color = BINDING
		edge.Transparency = 0.2
		edge.Parent = o
	end
end

local function text(parent, str, size, color, bold)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Text = str
	l.TextSize = size
	l.TextColor3 = color or INK
	l.Font = if bold then Enum.Font.GothamBold else Enum.Font.Gotham
	l.TextWrapped = true
	l.Parent = parent
	return l
end

local function button(parent, str, color, size, fn)
	local b = Instance.new("TextButton")
	b.Text = str
	b.BackgroundColor3 = color
	b.TextColor3 = INK
	b.Font = Enum.Font.GothamBold
	b.TextSize = size or 16
	b.TextWrapped = true
	b.BorderSizePixel = 0
	b.AutoButtonColor = true
	b.Parent = parent
	corner(b, 8)
	if fn then b.Activated:Connect(fn) end
	return b
end

local function inFilter(ctx, id, d, f, owned)
	if f == "owned" then return owned > 0 end
	if f == "all" then return true end
	if f == "hero" then return d.hero == true end
	if f == "special" then return ctx.BC.Specials[id] ~= nil end
	if f == "melee" or f == "ranged" then return not d.special and d.row ~= nil and ctx.BC.lane(d) == f end
	if f == "combo" then
		local opening = ctx.BC.PracticeOpening[ctx.getBook().faction]
		return opening ~= nil and table.find(opening, id) ~= nil
	end
	return ctx.BC.cardRegionPrefix(id) == f
end

-- parent(창) 전체를 쓰는 화면을 만든다. 반환: { refresh = 다시 그리기 }
function DeckBuilder.build(parent, ctx)
	local CB, BC = ctx.CB, ctx.BC
	local state = { filter = "owned", page = 1 }
	local cur = { ids = {}, okDeck = false, slots = {}, saveMode = false, leaderStep = nil }
	local recPop -- 추천 덱 선택 창 (아래에서 만든다)
	local root = Instance.new("Frame")
	root.Name = "DeckBuilder"
	root.BackgroundColor3 = CardTheme.leather
	root.BorderSizePixel = 0
	root.AutoLocalize = true
	root.Size = UDim2.fromScale(1, 1)
	root.Parent = parent
	-- [배경] 오늘 만든 양피지 원화를 등록된 ID가 있을 때만 표시한다.
	local parchmentAsset = ctx.AssetIds["CardArt/ui_parchment"] or ctx.AssetIds["CardArt/battle_parchment"]
	if parchmentAsset then
		local parchment = Instance.new("ImageLabel")
		parchment.Name = "CardDeckParchment"
		parchment.Size = UDim2.fromScale(1, 1)
		parchment.BackgroundTransparency = 1
		parchment.ScaleType = Enum.ScaleType.Crop
		parchment.Image = "rbxassetid://" .. tostring(parchmentAsset)
		parchment.ImageTransparency = 0
		parchment.Parent = root
	end

	-- ── 위 상태줄 ──
	local top = Instance.new("Frame")
	top.Size = UDim2.new(1, -16, 0, 40)
	top.Position = UDim2.fromOffset(8, 6)
	top.BackgroundColor3 = PAPER
	top.BorderSizePixel = 0
	top.Parent = root
	corner(top, 10)
	local title = text(top, "내 카드", 22, SEPIA, true)
	title.Position = UDim2.fromOffset(12, 0)
	title.Size = UDim2.new(0.2, 0, 1, 0)
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Font = Enum.Font.Antique
	local collect = text(top, "", 15, SEPIA, true)
	collect.Position = UDim2.fromScale(0.2, 0)
	collect.Size = UDim2.fromScale(0.2, 1)
	-- 보급 막대: 덱 비용이 한도에 얼마나 찼는지 한눈에
	local provBack = Instance.new("Frame")
	provBack.Position = UDim2.fromScale(0.42, 0.28)
	provBack.Size = UDim2.fromScale(0.26, 0.44)
	provBack.BackgroundColor3 = Color3.fromRGB(22, 18, 15)
	provBack.BorderSizePixel = 0
	provBack.Parent = top
	corner(provBack, 6)
	local provFill = Instance.new("Frame")
	provFill.Size = UDim2.fromScale(0, 1)
	provFill.BackgroundColor3 = Color3.fromRGB(120, 190, 120)
	provFill.BorderSizePixel = 0
	provFill.Parent = provBack
	corner(provFill, 6)
	local provText = text(provBack, "", 14, Color3.new(1, 1, 1), true)
	provText.Size = UDim2.fromScale(1, 1)
	provText.ZIndex = 2
	local countPill = text(top, "", 17, Color3.fromRGB(20, 40, 20), true)
	countPill.AnchorPoint = Vector2.new(0, 0.5)
	countPill.Position = UDim2.fromScale(0.70, 0.5)
	countPill.Size = UDim2.fromScale(0.16, 0.7)
	countPill.BackgroundTransparency = 0
	countPill.BackgroundColor3 = Color3.fromRGB(150, 225, 150)
	corner(countPill, 8)
	local closeBtn = button(top, "←", SAVE, 20)
	closeBtn.AnchorPoint = Vector2.new(1, 0.5)
	closeBtn.Position = UDim2.new(1, -8, 0.5, 0)
	closeBtn.Size = UDim2.fromOffset(44, 36)
	local function layoutHeader()
		local compact = top.AbsoluteSize.X < 440
		title.TextSize = if compact then 17 else 22
		collect.TextSize = if compact then 12 else 15
		provText.TextSize = if compact then 11 else 14
		countPill.TextSize = if compact then 13 else 17
		countPill.Size = UDim2.new(0.30, -56, 0.7, 0)
		if compact then countPill.Position = UDim2.fromScale(0.66, 0.5) else countPill.Position = UDim2.fromScale(0.70, 0.5) end
		provBack.Size = UDim2.fromScale(if compact then 0.22 else 0.26, 0.44)
	end
	top:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutHeader)
	layoutHeader()

	-- ── 아래 행동 버튼 ──
	local bottom = Instance.new("Frame")
	bottom.AnchorPoint = Vector2.new(0, 1)
	bottom.Position = UDim2.new(0, 8, 1, -6)
	bottom.Size = UDim2.new(1, -16, 0, 44)
	bottom.BackgroundTransparency = 1
	bottom.Parent = root
	local bl = Instance.new("UIListLayout")
	bl.FillDirection = Enum.FillDirection.Horizontal
	bl.Padding = UDim.new(0, 8)
	bl.HorizontalFlex = Enum.UIFlexAlignment.Fill
	bl.Parent = bottom
	local practicePanel
	local tavernBtn = button(bottom, "용병 고용 180", Color3.fromRGB(176, 136, 52), 16, function() ctx.act("CardTavern") end)
	tavernBtn.LayoutOrder = 6
	bl.SortOrder = Enum.SortOrder.LayoutOrder

	-- [연습게임 창] 실제 카드 규칙을 바꾸지 않는 터치 안내·시작 확인 UI.
	practicePanel = Instance.new("Frame")
	practicePanel.Name = "CardPracticeWindow"
	practicePanel.AnchorPoint = Vector2.new(0.5, 0.5)
	practicePanel.Position = UDim2.fromScale(0.5, 0.49)
	practicePanel.Size = UDim2.fromScale(0.91, 0.70)
	practicePanel.BackgroundColor3 = PAPER
	practicePanel.BorderSizePixel = 0
	practicePanel.Visible = false
	practicePanel.ZIndex = 35
	practicePanel.Parent = root
	local practiceLimit = Instance.new("UISizeConstraint")
	practiceLimit.MaxSize = Vector2.new(520, 310)
	practiceLimit.Parent = practicePanel
	corner(practicePanel, 12)
	local practiceArtId = ctx.AssetIds["CardArt/ui_parchment"]
	if practiceArtId then
		local practiceArt = Instance.new("ImageLabel")
		practiceArt.Name = "PracticeParchment"
		practiceArt.Size = UDim2.fromScale(1, 1)
		practiceArt.BackgroundTransparency = 1
		practiceArt.Image = "rbxassetid://" .. tostring(practiceArtId)
		practiceArt.ScaleType = Enum.ScaleType.Crop
		practiceArt.ImageTransparency = 0.1
		practiceArt.ZIndex = 35
		practiceArt.Parent = practicePanel
	end
	local practiceTitle = text(practicePanel, "카드배틀 연습전", 23, SEPIA, true)
	practiceTitle.Font = Enum.Font.Antique
	practiceTitle.Position = UDim2.fromScale(0.05, 0.065)
	practiceTitle.Size = UDim2.fromScale(0.9, 0.15)
	practiceTitle.ZIndex = 37
	local practiceHelp = text(practicePanel, "① 내 손패를 누르면 카드 설명을 볼 수 있어요.\n② 다시 눌러 근접·사격 줄에 카드를 놓아요.\n③ 점수와 상대 카드를 보고 '멈추기'를 선택해요.\n④ 3판 중 2판을 먼저 이기면 승리해요.", 17, SEPIA, false)
	practiceHelp.Position = UDim2.fromScale(0.07, 0.25)
	practiceHelp.Size = UDim2.fromScale(0.86, 0.48)
	practiceHelp.TextXAlignment = Enum.TextXAlignment.Left
	practiceHelp.TextYAlignment = Enum.TextYAlignment.Top
	practiceHelp.ZIndex = 37
	local practiceCancel = button(practicePanel, "돌아가기", REMOVE, 16, function() practicePanel.Visible = false end)
	practiceCancel.Position = UDim2.fromScale(0.07, 0.79)
	practiceCancel.Size = UDim2.fromScale(0.37, 0.15)
	practiceCancel.ZIndex = 38
	local practiceGo = button(practicePanel, "연습전 시작", ADD, 17, function()
		practicePanel.Visible = false
		ctx.startPractice()
	end)
	practiceGo.Position = UDim2.fromScale(0.52, 0.79)
	practiceGo.Size = UDim2.fromScale(0.41, 0.15)
	practiceGo.ZIndex = 38
	-- [원화 버튼] 텍스트와 터치 동작은 기존 버튼이 맡는다.
	local function buttonArt(target, key)
		local asset = ctx.AssetIds["CardArt/" .. key]
		if not asset then return nil end
		local art = Instance.new("ImageLabel")
		art.Name = "ButtonArtwork"
		art.BackgroundTransparency = 1
		art.Size = UDim2.fromScale(1, 1)
		art.Image = "rbxassetid://" .. tostring(asset)
		art.ScaleType = Enum.ScaleType.Stretch
		art.ZIndex = math.max(1, target.ZIndex - 1)
		art.Parent = target
		target.BackgroundTransparency = 1
		local outline = target:FindFirstChildOfClass("UIStroke")
		if outline then outline:Destroy() end
		local rounded = target:FindFirstChildOfClass("UICorner")
		if rounded then rounded:Destroy() end
		return art
	end
	buttonArt(closeBtn, "ui_button_ink")
	buttonArt(practiceGo, "ui_button_ink")
	buttonArt(practiceCancel, "ui_button_ink")

	-- ── 가운데: 왼쪽 컬렉션 / 오른쪽 덱 ──
	local body = Instance.new("Frame")
	body.BackgroundTransparency = 1
	body.Position = UDim2.fromOffset(8, 52)
	body.Size = UDim2.new(1, -16, 1, -52 - 56)
	body.Parent = root

	local left = Instance.new("Frame")
	left.BackgroundColor3 = PANEL
	left.BorderSizePixel = 0
	left.Size = UDim2.fromScale(0.6, 1)
	left.Parent = body
	corner(left, 10)
	local right = Instance.new("Frame")
	right.BackgroundColor3 = PANEL
	right.BorderSizePixel = 0
	right.AnchorPoint = Vector2.new(1, 0)
	right.Position = UDim2.fromScale(1, 0)
	right.Size = UDim2.new(0.4, -8, 1, 0)
	right.Parent = body
	corner(right, 10)

	-- [작전실] 현재 덱을 보고 출항하거나 목적에 맞는 화면으로 이동한다.
	local selectedTab = ctx.initialTab or "hub"
	local addingToFormation = false
	local pickerLane = nil
	local layoutPicker
	local hub = Instance.new("Frame")
	hub.Name = "OperationsRoom"
	hub.BackgroundTransparency = 1
	hub.Size = UDim2.fromScale(1, 1)
	hub.Parent = body

	local deckCover = Instance.new("ImageLabel")
	deckCover.Name = "ActiveDeckCover"
	deckCover.AnchorPoint = Vector2.new(0.5, 0)
	deckCover.Position = UDim2.fromScale(0.5, 0.02)
	deckCover.Size = UDim2.fromScale(0.44, 0.58)
	deckCover.BackgroundTransparency = 1
	deckCover.ScaleType = Enum.ScaleType.Fit
	deckCover.Parent = hub

	local deckSummary = text(hub, "", 17, SEPIA, true)
	deckSummary.Position = UDim2.fromScale(0.18, 0.61)
	deckSummary.Size = UDim2.fromScale(0.64, 0.15)
	local chartId = ctx.AssetIds["CardArt/ui_ops_chart"]
	local albumId = ctx.AssetIds["CardArt/ui_card_vault_album"]
	local tableId = ctx.AssetIds["CardArt/ui_fleet_table"]
	local chart = Instance.new("ImageLabel")
	chart.Name = "OperationsChart"
	chart.Size = UDim2.fromScale(1, 1)
	chart.BackgroundTransparency = 1
	chart.ScaleType = Enum.ScaleType.Crop
	chart.Image = if chartId then "rbxassetid://" .. tostring(chartId) else ""
	chart.Parent = root
	if chartId or tableId or albumId then
		top.ZIndex, body.ZIndex = 2, 2
		deckSummary.BackgroundColor3 = PAPER
		deckSummary.BackgroundTransparency = 0
		deckSummary.Font = Enum.Font.Antique
	end
	local battle = Instance.new("Frame")
	battle.Name = "Departure"
	battle.BackgroundTransparency = 1
	battle.Size = UDim2.fromScale(1, 1)
	battle.Parent = body
	local mode = "practice"
	local modeCards = {}
	local deckLabel = ""
	local modeHint = text(battle, "", 14, INK, true)
	modeHint.Position = UDim2.fromScale(0.08, 0.77)
	modeHint.Size = UDim2.new(0.84, 0, 0.10, 0)
	local departureSummary = text(battle, "", 15, INK, true)
	departureSummary.Position = UDim2.fromScale(0.05, 0.88)
	departureSummary.Size = UDim2.new(0.59, 0, 0.12, 0)
	departureSummary.BackgroundColor3 = PANEL
	departureSummary.BackgroundTransparency = 0.12
	local start = button(battle, "시작", SAVE, 19, function()
		if mode == "practice" then
			practicePanel.Visible = true
		elseif cur.okDeck and not cur.dirty then
			ctx.startDuel()
		end
	end)
	start.AnchorPoint = Vector2.new(0, 1)
	start.Position = UDim2.fromScale(0.68, 1)
	start.Size = UDim2.new(0.27, 0, 0, 44)
	local startArt = buttonArt(start, "ui_button_ink")

	local function updateDeparture()
		local book = ctx.getBook()
		local blocked = mode == "duel" and (not cur.okDeck or cur.dirty)
		for key, card in modeCards do
			local selected = key == mode
			card.stroke.Color = if selected then GOLD else BINDING
			card.stroke.Thickness = if selected then 3 else 1
			card.art.ImageColor3 = if selected then Color3.new(1, 1, 1) else Color3.fromRGB(182, 182, 182)
			card.button.Position = UDim2.fromScale(card.x, if selected then 0.02 else 0.055)
		end
		modeHint.Text = if mode == "practice" then (if book.practiceDone then "연습전 보상 받음" else "규칙 배우기")
			elseif cur.dirty then "덱을 저장한 뒤 대결할 수 있어요"
			elseif not cur.okDeck then "덱 편성을 확인해 주세요"
			else string.format("대결 보상 %d회", book.duelLeft or 0)
		departureSummary.Text = if mode == "practice" then string.format("연습용 덱 · %d장", #(book.practiceIds or {}))
			else "사용할 덱  |  " .. deckLabel
		start.Active = not blocked
		start.AutoButtonColor = not blocked
		if startArt then startArt.ImageTransparency = if blocked then 0.55 else 0 end
	end
	for index, option in { { "practice", "연습전", "ui_departure_practice" }, { "duel", "대결", "ui_departure_duel" } } do
		local key = option[1]
		local control = button(battle, "", PAPER, 16, function()
			mode = key
			updateDeparture()
		end)
		control.AnchorPoint = Vector2.new(0.5, 0)
		control.Size = UDim2.fromScale(0.36, 0.70)
		control.Rotation = if index == 1 then -4 else 4
		local aspect = Instance.new("UIAspectRatioConstraint")
		aspect.AspectRatio = 0.75
		aspect.AspectType = Enum.AspectType.FitWithinMaxSize
		aspect.Parent = control
		local art = Instance.new("ImageLabel")
		art.BackgroundTransparency = 1
		art.Size = UDim2.new(1, 0, 1, -28)
		art.ScaleType = Enum.ScaleType.Crop
		local asset = ctx.AssetIds["CardArt/" .. option[3]]
		art.Image = if asset then "rbxassetid://" .. tostring(asset) else ""
		art.Parent = control
		local label = text(control, option[2], 17, SEPIA, true)
		label.Position = UDim2.new(0, 0, 1, -28)
		label.Size = UDim2.new(1, 0, 0, 28)
		local stroke = control:FindFirstChildOfClass("UIStroke")
		modeCards[key] = { button = control, stroke = stroke, art = art, x = if index == 1 then 0.30 else 0.70 }
	end

	local function layoutBody()
		hub.Visible = selectedTab == "hub"
		local vault = selectedTab == "collection" and not addingToFormation
		local surface = if vault then albumId elseif selectedTab == "deck" or selectedTab == "battle" then tableId
			elseif hub.Visible or addingToFormation then chartId else nil
		chart.ScaleType = if vault then Enum.ScaleType.Stretch else Enum.ScaleType.Crop
		chart.Visible = surface ~= nil
		chart.Image = if surface then "rbxassetid://" .. tostring(surface) else ""
		left.Visible = selectedTab == "collection"
		right.Visible = selectedTab == "deck"
		right.BackgroundColor3 = FELT
		right.BackgroundTransparency = if tableId then 1 else 0
		battle.Visible = selectedTab == "battle"
		if battle.Visible then updateDeparture() end
		bottom.Visible = selectedTab == "deck"
		title.Text = if hub.Visible then "해상 작전실" elseif left.Visible then "카드 보관소"
			elseif right.Visible then "함대 편성" else "출항 준비"
		if addingToFormation then title.Text = ({ melee = "전열", ranged = "후열", special = "전술" })[pickerLane] .. " 카드 추가" end
		if layoutPicker then layoutPicker() end
		closeBtn.Text = "←"
		if recPop then recPop.Visible = false end
	end
	closeBtn.Activated:Connect(function()
		if selectedTab == "hub" then
			ctx.onClose()
		else
			selectedTab = if addingToFormation then "deck" else "hub"
			addingToFormation = false
			practicePanel.Visible = false
			layoutBody()
		end
	end)
	for _, action in {
		{ "함대 편성", "deck", 0.025, 0.45, 0.25, "ui_ops_formation", 420 / 311 },
		{ "카드 보관소", "collection", 0.725, 0.45, 0.25, "ui_ops_vault", 420 / 311 },
		{ "출항", "battle", 0.32, 0.96, 0.36, "ui_ops_depart", 550 / 202 },
	} do
		local control = button(hub, action[1], SAVE, if action[2] == "battle" then 21 else 16, function()
			selectedTab = action[2]
			Sfx.play("sfx_card_page", 0.5, 1, "sfx_book_turn")
			layoutBody()
		end)
		control.Size = UDim2.new(action[5], 0, 0, 44)
		local art = buttonArt(control, action[6])
		if art then
			local isDeparture = action[2] == "battle"
			control.AnchorPoint = Vector2.new(0, if isDeparture then 1 else 0)
			control.Position = UDim2.fromScale(action[3], action[4])
			control.Size = UDim2.fromScale(action[5], if isDeparture then 0.20 else 0.40)
			local aspect = Instance.new("UIAspectRatioConstraint")
			aspect.AspectRatio = action[7]
			aspect.AspectType = Enum.AspectType.FitWithinMaxSize
			aspect.Parent = control
			local label = text(control, action[1], if isDeparture then 23 else 16, INK, true)
			label.Name = "ActionLabel"
			label.Font = Enum.Font.Antique
			label.ZIndex = art.ZIndex + 1
			label.Position = if isDeparture then UDim2.fromScale(0.23, 0.13) else UDim2.fromScale(0.06, 0.74)
			label.Size = if isDeparture then UDim2.fromScale(0.61, 0.70) else UDim2.fromScale(0.88, 0.21)
			control.TextTransparency = 1
		else
			control.Position = UDim2.fromScale(action[3], if action[2] == "battle" then 0.79 else 0.39)
			buttonArt(control, "ui_button_ink")
		end
	end
	left.Size = UDim2.fromScale(1, 1)
	right.Size = left.Size
	layoutBody()


	-- 왼쪽: 필터 칩 + 격자
	local chips = Instance.new("ScrollingFrame")
	chips.BackgroundTransparency = 1
	chips.BorderSizePixel = 0
	chips.Position = UDim2.fromOffset(6, 6)
	chips.Size = UDim2.new(1, -12, 0, 38)
	chips.ScrollingDirection = Enum.ScrollingDirection.X
	chips.AutomaticCanvasSize = Enum.AutomaticSize.X
	chips.CanvasSize = UDim2.new()
	chips.ScrollBarThickness = 0
	chips.Parent = left
	local cl = Instance.new("UIListLayout")
	cl.FillDirection = Enum.FillDirection.Horizontal
	cl.Padding = UDim.new(0, 6)
	cl.Parent = chips
	local gridScroll = Instance.new("ScrollingFrame")
	gridScroll.BackgroundTransparency = 1
	gridScroll.BorderSizePixel = 0
	gridScroll.Position = UDim2.fromOffset(6, 50)
	gridScroll.Size = UDim2.new(1, -12, 1, -56)
	gridScroll.ScrollBarThickness = 5
	gridScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
	gridScroll.CanvasSize = UDim2.new()
	gridScroll.Parent = left
	local gl = Instance.new("UIGridLayout")
	gl.CellSize = UDim2.fromOffset(100, 138)
	gl.CellPadding = UDim2.fromOffset(8, 8)
	gl.SortOrder = Enum.SortOrder.LayoutOrder
	gl.HorizontalAlignment = Enum.HorizontalAlignment.Center
	gl.Parent = gridScroll
	local function layoutCardGrid()
		local width = math.max(1, gridScroll.AbsoluteSize.X - gridScroll.ScrollBarThickness)
		local columns = math.max(2, math.floor((width + 8) / 128))
		local cell = math.floor((width - (columns - 1) * 8) / columns)
		if cell < 1 then return end
		gl.FillDirectionMaxCells = columns
		gl.CellSize = UDim2.fromOffset(cell, math.floor(cell * 4 / 3))
	end
	gridScroll:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutCardGrid)
	layoutCardGrid()

	local extra = Instance.new("ScrollingFrame") -- 동료 카드 칸 (필터 '동료')
	extra.BackgroundTransparency = 1
	extra.BorderSizePixel = 0
	extra.Position = gridScroll.Position
	extra.Size = gridScroll.Size
	extra.ScrollBarThickness = 5
	extra.AutomaticCanvasSize = Enum.AutomaticSize.Y
	extra.CanvasSize = UDim2.new()
	extra.Visible = false
	extra.Parent = left

	-- [지도자 카드] 일반 카드와 동일한 100×138 도판·이름 띠. 별도 얼굴 아이콘은 사용하지 않는다.
	local leaderBox = Instance.new("Frame")
	leaderBox.Position = UDim2.fromOffset(6, 6)
	leaderBox.Size = UDim2.new(1, -12, 0, 150)
	leaderBox.BackgroundColor3 = CardTheme.panel
	leaderBox.BorderSizePixel = 0
	leaderBox.Parent = right
	corner(leaderBox, 8)
	local leaderCard = button(leaderBox, "", Color3.fromRGB(58, 44, 32), 14, nil)
	leaderCard.Name = "FullBodyLeaderCard"
	leaderCard.Size = UDim2.fromOffset(100, 138)
	leaderCard.Position = UDim2.fromOffset(6, 6)
	local leaderImage = Instance.new("ImageLabel")
	leaderImage.Name = "LeaderPainting"
	leaderImage.Position = UDim2.fromOffset(4, 4)
	leaderImage.Size = UDim2.new(1, -8, 0.7, -4)
	leaderImage.BackgroundColor3 = Color3.fromRGB(88, 67, 46)
	leaderImage.BorderSizePixel = 0
	leaderImage.ScaleType = Enum.ScaleType.Fit -- 전신 절단 방지
	leaderImage.Parent = leaderCard
	corner(leaderImage, 6)
	local leaderCardName = text(leaderCard, "", 13, INK, true)
	leaderCardName.Position = UDim2.new(0, 3, 0.72, 0)
	leaderCardName.Size = UDim2.new(1, -6, 0.28, 0)
	leaderCardName.TextScaled = true
	leaderCardName.Font = Enum.Font.Antique
	local leaderCardNameLimit = Instance.new("UITextSizeConstraint")
	leaderCardNameLimit.MaxTextSize = 15
	leaderCardNameLimit.MinTextSize = 9
	leaderCardNameLimit.Parent = leaderCardName
	local leaderName = text(leaderBox, "", 16, GOLD, true)
	leaderName.Position = UDim2.fromOffset(114, 7)
	leaderName.Size = UDim2.new(1, -120, 0, 30)
	leaderName.TextXAlignment = Enum.TextXAlignment.Left
	leaderName.Font = Enum.Font.Antique
	local leaderText = text(leaderBox, "", 12, INK, false)
	leaderText.Position = UDim2.fromOffset(114, 40)
	leaderText.Size = UDim2.new(1, -120, 0, 62)
	leaderText.TextXAlignment = Enum.TextXAlignment.Left
	leaderText.TextYAlignment = Enum.TextYAlignment.Top
	local prevLeader = button(leaderBox, "◀", Color3.fromRGB(90, 72, 52), 16, function() if cur.leaderStep then cur.leaderStep(-1) end end)
	prevLeader.Position = UDim2.fromOffset(114, 108)
	prevLeader.Size = UDim2.fromOffset(36, 34)
	local nextLeader = button(leaderBox, "▶", Color3.fromRGB(90, 72, 52), 16, function() if cur.leaderStep then cur.leaderStep(1) end end)
	nextLeader.AnchorPoint = Vector2.new(1, 0)
	nextLeader.Position = UDim2.new(1, -6, 0, 108)
	nextLeader.Size = UDim2.fromOffset(36, 34)

	-- [전신 확대] 작은 모바일 화면에서도 기존 카드 비율과 원화 전체를 확인한다.
	local leaderPreview = Instance.new("TextButton")
	leaderPreview.Name = "LeaderCardDetail"
	leaderPreview.Size = UDim2.fromScale(1, 1)
	leaderPreview.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
	leaderPreview.BackgroundTransparency = 0.3
	leaderPreview.Text = ""
	leaderPreview.AutoButtonColor = false
	leaderPreview.Visible = false
	leaderPreview.ZIndex = 40
	leaderPreview.Parent = root
	leaderPreview.Activated:Connect(function() leaderPreview.Visible = false end)
	local leaderFull = Instance.new("TextButton")
	leaderFull.Name = "EnlargedLeaderCard"
	leaderFull.AnchorPoint = Vector2.new(0.5, 0.5)
	leaderFull.Position = UDim2.fromScale(0.5, 0.5)
	leaderFull.BackgroundColor3 = CardTheme.leather
	leaderFull.BorderSizePixel = 0
	leaderFull.Text = ""
	leaderFull.ZIndex = 41
	leaderFull.Parent = leaderPreview
	corner(leaderFull, 8)
	local leaderFullImage = Instance.new("ImageLabel")
	leaderFullImage.Position = UDim2.fromScale(0.03, 0.03)
	leaderFullImage.Size = UDim2.fromScale(0.94, 0.68)
	leaderFullImage.BackgroundTransparency = 1
	leaderFullImage.ScaleType = Enum.ScaleType.Fit
	leaderFullImage.ZIndex = 42
	leaderFullImage.Parent = leaderFull
	local leaderFullName = text(leaderFull, "", 20, GOLD, true)
	leaderFullName.Position = UDim2.fromScale(0.04, 0.72)
	leaderFullName.Size = UDim2.fromScale(0.92, 0.09)
	leaderFullName.Font = Enum.Font.Antique
	leaderFullName.TextScaled = true
	leaderFullName.ZIndex = 42
	local leaderFullText = text(leaderFull, "", 14, INK, false)
	leaderFullText.Position = UDim2.fromScale(0.05, 0.82)
	leaderFullText.Size = UDim2.fromScale(0.90, 0.16)
	leaderFullText.TextScaled = true
	leaderFullText.ZIndex = 42
	local leaderClose = button(leaderFull, "×", REMOVE, 20, function() leaderPreview.Visible = false end)
	leaderClose.AnchorPoint = Vector2.new(1, 0)
	leaderClose.Position = UDim2.new(1, -5, 0, 5)
	leaderClose.Size = UDim2.fromOffset(34, 34)
	leaderClose.ZIndex = 43
	local function layoutLeaderPreview()
		local size = root.AbsoluteSize
		local height = math.floor(math.max(156, math.min(size.Y * 0.81, size.X * 0.78 / 0.69, 480)))
		leaderFull.Size = UDim2.fromOffset(math.floor(height * 0.69), height)
	end
	root:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutLeaderPreview)
	layoutLeaderPreview()
	leaderCard.Activated:Connect(function()
		Sfx.play("sfx_card_page", 0.5, 1, "sfx_book_turn")
		leaderPreview.Visible = true
	end)

	local balance = Instance.new("Frame") -- 전열·후열·전술·중립 요약
	balance.Position = UDim2.fromOffset(6, 56)
	balance.Size = UDim2.new(1, -12, 0, 20)
	balance.BackgroundTransparency = 1
	balance.Parent = right
	local balLayout = Instance.new("UIListLayout")
	balLayout.FillDirection = Enum.FillDirection.Horizontal
	balLayout.Padding = UDim.new(0, 6)
	balLayout.HorizontalFlex = Enum.UIFlexAlignment.Fill
	balLayout.Parent = balance
	local balLabels = {}
	for _, row in { "melee", "ranged", "special", "neutral" } do
		local l = text(balance, "", 14, Color3.new(1, 1, 1), true)
		l.BackgroundTransparency = 0
		l.BackgroundColor3 = ROW_COLOR[row] or (if row == "neutral" then Color3.fromRGB(91, 63, 119) else Color3.fromRGB(112, 74, 46))
		l.TextScaled = true
		local limit = Instance.new("UITextSizeConstraint")
		limit.MaxTextSize = 13
		limit.Parent = l
		l.Size = UDim2.new(0, 42, 1, 0)
		corner(l, 6)
		balLabels[row] = l
	end

	local comboButton = button(right, "", PANEL2, 13)
	comboButton.Size = UDim2.new(1, -12, 0, 23)
	comboButton.TextXAlignment = Enum.TextXAlignment.Left
	local comboInset = Instance.new("UIPadding")
	comboInset.PaddingLeft = UDim.new(0, 6)
	comboInset.Parent = comboButton

	local deckScroll = Instance.new("ScrollingFrame")
	deckScroll.BackgroundTransparency = 1
	deckScroll.BorderSizePixel = 0
	deckScroll.Position = UDim2.fromOffset(6, 182)
	deckScroll.Size = UDim2.new(1, -12, 1, -182 - 64)
	deckScroll.ScrollBarThickness = 5
	deckScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
	deckScroll.CanvasSize = UDim2.new()
	deckScroll.Parent = right
	-- [모바일] 화면 높이가 낮으면 지도자 카드는 축소 표시하고 눌러 원본 크기로 확대한다.
	local function layoutLeaderCard()
		local tall = right.AbsoluteSize.Y >= 640
		leaderBox.Size = UDim2.new(1, -12, 0, if tall then 150 else 50)
		leaderCard.Size = if tall then UDim2.fromOffset(100, 138) else UDim2.fromOffset(34, 44)
		leaderCard.Position = if tall then UDim2.fromOffset(6, 6) else UDim2.fromOffset(4, 3)
		leaderCardName.Visible = tall
		leaderName.Position = if tall then UDim2.fromOffset(114, 7) else UDim2.fromOffset(44, 2)
		leaderName.Size = if tall then UDim2.new(1, -120, 0, 30) else UDim2.new(1, -90, 0, 20)
		leaderName.TextSize = if tall then 16 else 13
		leaderText.Position = if tall then UDim2.fromOffset(114, 40) else UDim2.fromOffset(44, 21)
		leaderText.Size = if tall then UDim2.new(1, -120, 0, 62) else UDim2.new(1, -90, 0, 27)
		leaderText.TextSize = if tall then 12 else 10
		prevLeader.Position = if tall then UDim2.fromOffset(114, 108) else UDim2.new(1, -78, 0, 8)
		nextLeader.Position = if tall then UDim2.new(1, -6, 0, 108) else UDim2.new(1, -4, 0, 8)
		prevLeader.Size = if tall then UDim2.fromOffset(36, 34) else UDim2.fromOffset(32, 34)
		nextLeader.Size = if tall then UDim2.fromOffset(36, 34) else UDim2.fromOffset(32, 34)
		balance.Position = UDim2.fromOffset(6, if tall then 156 else 56)
		comboButton.Position = UDim2.fromOffset(6, if tall then 179 else 79)
		local scrollTop = if tall then 207 else 107
		deckScroll.Position = UDim2.fromOffset(6, scrollTop)
		deckScroll.Size = UDim2.new(if right.AbsoluteSize.X >= 530 then 0.66 else 1, -12, 1, -scrollTop - 64)
	end
	right:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutLeaderCard)
	layoutLeaderCard()
	local dl = Instance.new("UIListLayout")
	dl.Padding = UDim.new(0, 3)
	dl.SortOrder = Enum.SortOrder.LayoutOrder
	dl.Parent = deckScroll

	local tools = Instance.new("Frame")
	tools.AnchorPoint = Vector2.new(0, 1)
	tools.Position = UDim2.new(0, 6, 1, -6)
	tools.Size = UDim2.new(1, -12, 0, 58)
	tools.BackgroundTransparency = 1
	tools.Parent = right
	local statusLine = text(tools, "", 14, Color3.fromRGB(150, 225, 150), true)
	statusLine.Size = UDim2.new(1, 0, 0, 20)
	statusLine.TextXAlignment = Enum.TextXAlignment.Left
	statusLine.TextYAlignment = Enum.TextYAlignment.Top
	local saveBtn = button(bottom, "덱 저장", SAVE, 15, function()
		if cur.okDeck then
			Sfx.play("sfx_ui_confirm", 0.5, 1, "sfx_click")
			ctx.act("CardSetDeck", { ids = cur.ids })
		else
			Sfx.play("sfx_error", 0.4, 1)
		end
	end)
	local autoBtn = button(bottom, "기본덱", Color3.fromRGB(60, 96, 140), 15, function()
		selectedTab = "deck"
		layoutBody()
		ctx.onReplace(CB.autoDeck(ctx.getBook()))
	end)
	local recBtn = button(bottom, "추천 덱", Color3.fromRGB(110, 90, 60), 15, function() recPop.Visible = not recPop.Visible end)
	for i, b in { saveBtn, autoBtn, recBtn } do
		b.Size = UDim2.new(0, 100, 1, 0)
		b.LayoutOrder = 2 + i
	end
	local saveArt = buttonArt(saveBtn, "ui_button_ink")
	buttonArt(autoBtn, "ui_button_ink")
	buttonArt(recBtn, "ui_button_ink")
	buttonArt(tavernBtn, "ui_button_ink")
	local function layoutFooter()
		local compact = bottom.AbsoluteSize.X < 490
		bl.Padding = UDim.new(0, if compact then 4 else 8)
		for _, b in { saveBtn, autoBtn, recBtn, tavernBtn } do
			b.TextSize = if compact then 12 else 15
			b.Size = UDim2.new(0, 0, 1, 0)
		end
	end
	bottom:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutFooter)
	layoutFooter()
	local row2 = Instance.new("Frame")
	row2.BackgroundTransparency = 1
	row2.Position = UDim2.fromOffset(0, 24)
	row2.Size = UDim2.new(1, 0, 0, 32)
	row2.Parent = tools
	local r2 = Instance.new("UIListLayout")
	r2.FillDirection = Enum.FillDirection.Horizontal
	r2.Padding = UDim.new(0, 5)
	r2.HorizontalFlex = Enum.UIFlexAlignment.Fill
	r2.Parent = row2
	local slotBtns = {}
	for slot = 1, CB.SLOTS do
		local b = button(row2, "", Color3.fromRGB(70, 66, 84), 14, nil)
		b.Size = UDim2.new(0, 60, 1, 0)
		slotBtns[slot] = b
	end
	local slotSaveBtn = button(row2, "칸에 저장", Color3.fromRGB(52, 100, 70), 14, nil)
	slotSaveBtn.Size = UDim2.new(0, 60, 1, 0)
	-- 추천 덱 선택 (눌렀을 때만 뜨는 작은 창)
	recPop = Instance.new("Frame")
	recPop.AnchorPoint = Vector2.new(0.5, 1)
	recPop.Position = UDim2.new(0.5, 0, 1, -54)
	recPop.Size = UDim2.new(1, -16, 0, 44)
	local recSize = Instance.new("UISizeConstraint")
	recSize.MaxSize = Vector2.new(480, 44)
	recSize.Parent = recPop
	recPop.BackgroundColor3 = CardTheme.inset
	recPop.BorderSizePixel = 0
	recPop.Visible = false
	recPop.ZIndex = 30
	recPop.Parent = root
	corner(recPop, 8)
	local rpl = Instance.new("UIListLayout")
	rpl.FillDirection = Enum.FillDirection.Horizontal
	rpl.Padding = UDim.new(0, 6)
	rpl.HorizontalFlex = Enum.UIFlexAlignment.Fill
	rpl.VerticalAlignment = Enum.VerticalAlignment.Center
	rpl.Parent = recPop
	for _, r in { { "rush", "돌격(근접)", Color3.fromRGB(176, 62, 52) }, { "gun", "포격(사격·포)", Color3.fromRGB(60, 96, 140) }, { "balance", "운영(균형)", Color3.fromRGB(70, 130, 84) } } do
		local b = button(recPop, r[2], r[3], 14, function()
			recPop.Visible = false
			local ids = CB.recommend(ctx.getBook(), r[1])
			if ids then
				selectedTab = "deck"
				layoutBody()
				ctx.onReplace(ids)
			end
		end)
		b.Size = UDim2.new(0, 60, 0, 34)
		b.ZIndex = 31
	end

	local refresh
	for slot = 1, CB.SLOTS do
		slotBtns[slot].Activated:Connect(function()
			if cur.saveMode then
				if cur.okDeck then
					Sfx.play("sfx_ui_confirm", 0.5, 1, "sfx_click")
					cur.saveMode = false
					ctx.act("CardSlotSave", { slot = slot, ids = cur.ids, name = string.format("덱 %d", slot) })
				else
					Sfx.play("sfx_error", 0.4, 1)
				end
			elseif cur.slots[slot] then
				Sfx.play("sfx_card_deal", 0.5, 1, "sfx_book_turn")
				ctx.act("CardSlotUse", { slot = slot })
			else
				cur.saveMode = true
				refresh(true)
			end
		end)
	end
	slotSaveBtn.Activated:Connect(function()
		cur.saveMode = not cur.saveMode
		refresh(true)
	end)
	local pickBanner -- 승리 보상 카드 고르기
	local chipBtns = {}
	local rebuildGrid
	local search = Instance.new("TextBox")
	search.Name = "CollectionSearch"
	search.Position = UDim2.fromOffset(6, 48)
	search.Size = UDim2.new(1, -12, 0, 38)
	search.BackgroundColor3 = CardTheme.inset
	search.TextColor3 = INK
	search.PlaceholderColor3 = Color3.fromRGB(183, 173, 152)
	search.PlaceholderText = "카드 이름 검색"
	search.Text = ""
	search.Font = Enum.Font.Gotham
	search.TextSize = 15
	search.ClearTextOnFocus = false
	search.Parent = left
	corner(search, 6)
	search:GetPropertyChangedSignal("Text"):Connect(function()
		if selectedTab ~= "collection" or addingToFormation then return end
		state.page = 1
		rebuildGrid()
		gridScroll.CanvasPosition = Vector2.zero
	end)

	local function wantIds()
		local ids = {}
		for id, n in ctx.getWant() do
			for _ = 1, n do table.insert(ids, id) end
		end
		table.sort(ids)
		return ids
	end

	local function addCard(id, tile)
		local book = ctx.getBook()
		local want = ctx.getWant()
		if (book.owned[id] or 0) <= (want[id] or 0) then
			Sfx.play("sfx_error", 0.4, 1)
			return
		end
		Sfx.play("sfx_card_place", 0.5, 1.1, "sfx_click")
		ctx.onWant(id, 1)
		if addingToFormation then rebuildGrid() end
		if tile and tile.Parent then
			local st = tile:FindFirstChildOfClass("UIStroke")
			if st then
				st.Color = Color3.fromRGB(150, 230, 150)
				TweenService:Create(st, TweenInfo.new(0.5), { Color = TIER_COLOR[book.tier[id] or 1] }):Play()
			end
		end
		refresh(true)
	end

	-- [카드 추가] 넓은 화면에서는 선택과 편입을 같은 화면에서 처리한다.
	local selectedCard
	local tileStrokes = {}
	local detail = Instance.new("Frame")
	detail.BackgroundColor3 = PAPER
	detail.Position = UDim2.fromScale(0.67, 0)
	detail.Size = UDim2.new(0.33, -6, 1, -6)
	detail.Parent = left
	corner(detail, 8)
	local preview = Instance.new("ImageLabel")
	preview.BackgroundTransparency = 1
	preview.Position = UDim2.fromScale(0.05, 0.04)
	preview.Size = UDim2.fromScale(0.90, 0.37)
	preview.ScaleType = Enum.ScaleType.Fit
	preview.Parent = detail
	local detailTitle = text(detail, "카드를 골라요", 16, SEPIA, true)
	detailTitle.Position = UDim2.fromScale(0.05, 0.41)
	detailTitle.Size = UDim2.fromScale(0.90, 0.12)
	local effect = text(detail, "", 13, SEPIA, false)
	effect.Position = UDim2.fromScale(0.05, 0.54)
	effect.Size = UDim2.fromScale(0.90, 0.23)
	local enlist = button(detail, "편입", SAVE, 16, function()
		if not selectedCard then return end
		if selectedTab == "deck" then
			ctx.onWant(selectedCard, -1)
		elseif addingToFormation then
			addCard(selectedCard)
		else
			Gallery.showDetail(ctx.galleryCtx, selectedCard)
		end
	end)
	enlist.AnchorPoint = Vector2.new(0, 1)
	enlist.Position = UDim2.fromScale(0.08, 0.96)
	enlist.Size = UDim2.new(0.84, 0, 0, 44)
	buttonArt(enlist, "ui_button_ink")
	local function selectCard(id)
		local prior = selectedCard and tileStrokes[selectedCard]
		if prior then prior.stroke.Color, prior.stroke.Thickness = prior.color, prior.width end
		selectedCard = id
		local selected = id and tileStrokes[id]
		if selected then selected.stroke.Color, selected.stroke.Thickness = GOLD, 3 end
		local d = id and CB.def(id)
		local book = ctx.getBook()
		local vault = selectedTab == "collection" and not addingToFormation
		local owned = if id then book.owned[id] or 0 else 0
		if vault and owned == 0 then d = nil end
		local art = d and ctx.AssetIds[ctx.artKey(d)]
		preview.Image = if art then "rbxassetid://" .. tostring(art) else ""
		detailTitle.Text = if not d then "카드를 골라요" elseif d.special then d.name else
			string.format("%s · 전력 %d", d.name, (d.power or 0) + (book.tier[id] or 1) - 1)
		if vault and d then
			local lane = if BC.Specials[id] then "전술" elseif BC.lane(d) == "melee" then "전열" else "후열"
			effect.Text = string.format("보유 %d장 · %s\n%s", owned, lane, d.text or d.lore or "")
		else
			effect.Text = if d then d.text or "" else ""
		end
		effect.TextColor3 = if vault then INK else SEPIA
		detailTitle.TextColor3 = effect.TextColor3
		local count = if id then ctx.getWant()[id] or 0 else 0
		enlist.Text = if selectedTab == "deck" then "덱에서 빼기" elseif vault then "카드 상세" else "편입"
		enlist.Visible = d ~= nil and (if selectedTab == "deck" then count > 0
			elseif vault then true else not d.archiveOnly and owned > count)
	end
	layoutPicker = function()
		local wide = body.AbsoluteSize.X >= 530
		local formation = selectedTab == "deck"
		local vault = selectedTab == "collection" and not addingToFormation
		local showFormationDetail = wide and formation
		local showVaultDetail = wide and vault and state.filter ~= "crew"
		local charcoal = Color3.fromRGB(24, 34, 44)
		left.BackgroundColor3 = if vault then charcoal else PANEL
		detail.BackgroundColor3 = if vault then charcoal else PAPER
		local showAlbum = vault and albumId ~= nil
		left.BackgroundTransparency = if showAlbum and showVaultDetail then 1 elseif showAlbum then 0.20 else 0
		detail.BackgroundTransparency = if showAlbum then 1 else 0
		for _, panel in { left, detail } do
			local edge = panel:FindFirstChildOfClass("UIStroke")
			if edge then edge.Enabled = not showAlbum end
		end
		search.Visible = vault and state.filter ~= "crew"
		detail.Parent = if formation then right else left
		detail.Visible = wide and (formation or addingToFormation) or showVaultDetail
		detail.Position = if formation then UDim2.new(0.67, 0, 0, 54) else UDim2.fromScale(if showAlbum then 0.65 else 0.67, 0)
		detail.Size = if formation then UDim2.new(0.33, -6, 1, -118)
			else UDim2.new(0.33, -6, 1, -6)
		deckScroll.Size = UDim2.new(if showFormationDetail then 0.66 else 1, -12, deckScroll.Size.Y.Scale, deckScroll.Size.Y.Offset)
		local width = if showAlbum and showVaultDetail then 0.62
			elseif (wide and addingToFormation) or showVaultDetail then 0.66 else 1
		chips.Size = UDim2.new(width, -12, 0, 38)
		search.Size = UDim2.new(width, -12, 0, 38)
		local gridTop = if search.Visible then 92 else 50
		gridScroll.Position = UDim2.fromOffset(6, gridTop)
		gridScroll.Size = UDim2.new(width, -12, 1, -gridTop - 6)
		if formation then
			selectCard(if selectedCard and (ctx.getWant()[selectedCard] or 0) > 0 then selectedCard else cur.ids[1])
		elseif not addingToFormation and not vault then
			selectCard(nil)
		end
	end
	body:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutPicker)
	layoutPicker()

	local function makeTile(id, order)
		local book, want = ctx.getBook(), ctx.getWant()
		local d = CB.def(id)
		local owned = book.owned[id] or 0
		local tier = book.tier[id] or 1
		local tile = Instance.new("TextButton")
		tile.Text = ""
		tile.AutoButtonColor = false
		tile.LayoutOrder = order
		tile.BackgroundColor3 = PAPER
		tile.BorderSizePixel = 0
		tile.Parent = gridScroll
		corner(tile, 8)
		local st = Instance.new("UIStroke")
		st.Color = if owned > 0 then TIER_COLOR[tier] else Color3.fromRGB(80, 74, 70)
		st.Thickness = if owned > 0 and tier == 3 then 3 else 2
		st.Parent = tile
		tileStrokes[id] = { stroke = st, color = st.Color, width = st.Thickness }
		local img = Instance.new("ImageLabel")
		img.Position = UDim2.fromOffset(4, 4)
		img.Size = UDim2.new(1, -8, 0.5625, -4)
		img.BackgroundColor3 = Color3.fromRGB(88, 67, 46)
		img.ScaleType = Enum.ScaleType.Crop
		local key = ctx.artKey(d)
		img.Image = if ctx.AssetIds[key] then "rbxassetid://" .. tostring(ctx.AssetIds[key]) else ""
		img.ImageColor3 = if owned > 0 then Color3.new(1, 1, 1) else Color3.fromRGB(55, 55, 65)
		img.Parent = tile
		corner(img, 6)
		-- [6대륙 카드 테두리] 보유 카드 원화 위에 투명 프레임만 얹는다.
		local regionPrefix = ctx.BC.cardRegionPrefix(id)
		local frameKey = regionPrefix and REGION_FRAME[regionPrefix]
		local frameId = frameKey and ctx.AssetIds["CardArt/" .. frameKey]
		if frameId then
			local borderArt = Instance.new("ImageLabel")
			borderArt.Name = "RegionCardFrame"
			borderArt.Size = UDim2.fromScale(1, 1)
			borderArt.BackgroundTransparency = 1
			borderArt.Image = "rbxassetid://" .. tostring(frameId)
			borderArt.ScaleType = Enum.ScaleType.Stretch
			borderArt.ZIndex = 3
			borderArt.Parent = tile
		end
		local nm = text(tile, if owned > 0 then d.name else "???", 14, Color3.fromRGB(255, 237, 188), true)
		nm.Position = UDim2.new(0, 3, 0.73, 0)
		nm.Size = UDim2.new(1, -6, 0.23, 0)
		nm.TextColor3 = SEPIA
		nm.ZIndex = 4
		nm.TextScaled = true
		local lim = Instance.new("UITextSizeConstraint")
		lim.MaxTextSize = 15
		lim.MinTextSize = 10
		lim.Parent = nm
		local ability = BC.cardAbilitySymbol(d)
		if ability then
			local abilityMark = text(tile, ability, 13, Color3.fromRGB(255, 239, 204), true)
			abilityMark.AnchorPoint = Vector2.new(0, 1)
			abilityMark.Position = UDim2.new(0, 5, 0.72, -27)
			abilityMark.Size = UDim2.fromOffset(34, 20)
			abilityMark.BackgroundColor3 = Color3.fromRGB(32, 24, 18)
			abilityMark.BackgroundTransparency = 0.15
			abilityMark.ZIndex = 5
			corner(abilityMark, 5)
			CardSymbols.apply(abilityMark, ability)
		end
		if owned > 0 then
			local badge = text(tile, tostring(if BC.Specials[id] then "★" else d.power + tier - 1), 17, Color3.fromRGB(255, 232, 170), true)
			badge.Position = UDim2.fromOffset(6, 6)
			badge.Size = UDim2.fromOffset(28, 28)
			badge.BackgroundTransparency = 0
			badge.BackgroundColor3 = Color3.fromRGB(32, 24, 18)
			corner(badge, 14)
			if d.row and ROW_SHORT[d.row] then
				local rowTag = text(tile, ROW_SHORT[d.row], 13, Color3.new(1, 1, 1), true)
				rowTag.AnchorPoint = Vector2.new(0, 1)
				rowTag.Position = UDim2.new(0, 6, 0.72, -4)
				rowTag.Size = UDim2.fromOffset(22, 22)
				rowTag.BackgroundTransparency = 0
				rowTag.BackgroundColor3 = ROW_COLOR[d.row]
				corner(rowTag, 11)
			end
			local own = text(tile, "×" .. owned, 13, Color3.fromRGB(250, 240, 215), true)
			own.AnchorPoint = Vector2.new(1, 0)
			own.Position = UDim2.new(1, -6, 0, 6)
			own.Size = UDim2.fromOffset(32, 22)
			own.BackgroundTransparency = 0.15
			own.BackgroundColor3 = Color3.fromRGB(32, 24, 18)
			corner(own, 6)
			if (want[id] or 0) > 0 then -- 덱에 들어간 수만큼 초록 점
				local pips = text(tile, string.rep("•", math.min(5, want[id])), 12, Color3.fromRGB(150, 230, 150), true)
				pips.AnchorPoint = Vector2.new(1, 1)
				pips.Position = UDim2.new(1, -6, 0.72, -3)
				pips.Size = UDim2.fromOffset(60, 18)
				pips.TextXAlignment = Enum.TextXAlignment.Right
			end
			if tier == 3 then
				local shine = Instance.new("UIGradient")
				shine.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255))
				shine.Transparency = NumberSequence.new({
					NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.45, 1),
					NumberSequenceKeypoint.new(0.5, 0.7), NumberSequenceKeypoint.new(0.55, 1), NumberSequenceKeypoint.new(1, 1),
				})
				shine.Rotation = 25
				shine.Offset = Vector2.new(-1, 0)
				shine.Parent = img
				TweenService:Create(shine, TweenInfo.new(2.6, Enum.EasingStyle.Linear, Enum.EasingDirection.In, -1, false, 1.2), { Offset = Vector2.new(1, 0) }):Play()
			end
		end
		if not detail.Visible and owned > (want[id] or 0) and not d.archiveOnly then
			local add = button(tile, "+", ADD, 20, function() addCard(id, tile) end)
			add.Name = "QuickAdd"
			add.AnchorPoint = Vector2.new(1, 1)
			add.Position = UDim2.new(1, -4, 0.7, -4)
			add.Size = UDim2.fromOffset(42, 42)
			add.ZIndex = 5
		end
		tile.Activated:Connect(function()
			Sfx.play("sfx_ui_select", 0.5, 1, "sfx_click")
			if detail.Visible and owned > 0 then selectCard(id) else Gallery.showDetail(ctx.galleryCtx, id) end
		end)
		return tile
	end

	rebuildGrid = function()
		table.clear(tileStrokes)
		for _, ch in gridScroll:GetChildren() do
			if not ch:IsA("UIGridLayout") then ch:Destroy() end
		end
		local isCrew = state.filter == "crew"
		gridScroll.Visible = not isCrew
		extra.Visible = isCrew
		if isCrew then
			for _, ch in extra:GetChildren() do ch:Destroy() end
			ctx.buildExtra(extra)
			return
		end
		local book = ctx.getBook()
		local want = ctx.getWant()
		local query = if selectedTab == "collection" and not addingToFormation
			then string.lower((search.Text:match("^%s*(.-)%s*$") or "")) else ""
		local shown, n = 0, 0
		for _, id in ctx.catalog do
			local d = CB.def(id)
			local owned = book.owned[id] or 0
			local matches = query == "" or (owned > 0 and d and
				(string.find(string.lower(d.name), query, 1, true) or string.find(string.lower(d.nameEn or ""), query, 1, true)))
			if d and matches and inFilter(ctx, id, d, state.filter, owned) and (not addingToFormation or (owned > (want[id] or 0) and not d.archiveOnly and inFilter(ctx, id, d, pickerLane, owned))) then
				n += 1
				if n <= state.page * PAGE then
					shown += 1
					makeTile(id, shown)
				end
			end
		end
		if selectedTab == "collection" and detail.Visible then
			selectCard(if selectedCard and tileStrokes[selectedCard] then selectedCard else nil)
		end
		if n > state.page * PAGE then
			local more = button(gridScroll, string.format("더 보기 (%d장)", n - state.page * PAGE), Color3.fromRGB(60, 80, 100), 15, function()
				state.page += 1
				rebuildGrid()
			end)
			more.LayoutOrder = 100000
		elseif n == 0 then
			local e = text(gridScroll, "이 분류에는 아직 카드가 없어요", 15, INK, false)
			e.Size = UDim2.fromOffset(240, 30)
		end
	end

	local function paintChips()
		for fid, b in chipBtns do
			b.BackgroundColor3 = if fid == state.filter then PAPER else PANEL2
			b.TextColor3 = if fid == state.filter then Color3.fromRGB(40, 28, 18) else INK
		end
	end
	for i, f in FILTERS do
		local b = button(chips, f.text, Color3.fromRGB(70, 60, 66), 15, function()
			Sfx.play("sfx_card_page", 0.5, 1, "sfx_book_turn")
			if addingToFormation and f.id ~= pickerLane and f.id ~= "lo" and f.id ~= "owned" then return end
			state.filter, state.page = f.id, 1
			layoutPicker()
			paintChips()
			rebuildGrid()
		end)
		b.Size = UDim2.new(0, 16 * utf8.len(f.text) + 28, 1, -4)
		b.LayoutOrder = i
		chipBtns[f.id] = b
	end

	comboButton.Activated:Connect(function()
		selectedTab = "collection"
		addingToFormation = false
		state.filter, state.page = "combo", 1
		layoutBody()
		paintChips()
		rebuildGrid()
	end)

	-- 덱 목록 줄
	local function rebuildDeckList()
		for _, ch in deckScroll:GetChildren() do
			if not ch:IsA("UIListLayout") then ch:Destroy() end
		end
		local want = ctx.getWant()
		local groups = { melee = {}, ranged = {}, special = {} }
		local counts = { melee = 0, ranged = 0, special = 0 }
		for id, n in want do
			local d = CB.def(id)
			if d then
				local lane = if BC.Specials[id] then "special" else BC.lane(d)
				table.insert(groups[lane], { id = id, d = d, n = n })
				counts[lane] += n
			end
		end
		local order = 0
		for _, group in FORMATION do
			local lane, name = group[1], group[2]
			local list = groups[lane]
			table.sort(list, function(a, b)
				if (a.d.power or 0) ~= (b.d.power or 0) then return (a.d.power or 0) > (b.d.power or 0) end
				return a.id < b.id
			end)
			order += 1
			local lanePanel = Instance.new("Frame")
			lanePanel.LayoutOrder = order
			lanePanel.Size = UDim2.new(1, -6, 0, 104)
			lanePanel.BackgroundTransparency = 1
			lanePanel.Parent = deckScroll
			local heading = text(lanePanel, string.format("%s\n%d장", name, counts[lane]), 14, INK, true)
			heading.Size = UDim2.fromOffset(52, 104)
			local add = button(lanePanel, "+ 추가", SAVE, 14, function()
				selectedTab, addingToFormation, pickerLane = "collection", true, lane
				state.filter, state.page = lane, 1
				selectCard(nil)
				layoutBody()
				paintChips()
				rebuildGrid()
				gridScroll.CanvasPosition = Vector2.zero
			end)
			add.AnchorPoint = Vector2.new(1, 0.5)
			add.Position = UDim2.new(1, -5, 0.5, 0)
			add.Size = UDim2.fromOffset(76, 50)
			buttonArt(add, "ui_button_ink")
			local strip = Instance.new("ScrollingFrame")
			strip.Position = UDim2.fromOffset(54, 2)
			strip.Size = UDim2.new(1, -138, 1, -8)
			strip.BackgroundTransparency = 1
			strip.BorderSizePixel = 0
			strip.ScrollBarThickness = 3
			strip.ScrollingDirection = Enum.ScrollingDirection.X
			strip.CanvasSize = UDim2.fromOffset(if #list == 0 then 0 else (#list - 1) * 52 + 72, 0)
			strip.Parent = lanePanel
			for index, e in list do
				local card = button(strip, "", PAPER, 14, function()
					if detail.Visible then selectCard(e.id) else Gallery.showDetail(ctx.galleryCtx, e.id) end
				end)
				card.Position = UDim2.fromOffset((index - 1) * 52 + 2, 4)
				card.Size = UDim2.fromOffset(68, 90)
				card.ZIndex = index * 2 + 1
				card.Rotation = ((index - 1) % 3 - 1) * 3
				local shadow = Instance.new("Frame")
				shadow.BackgroundColor3 = Color3.fromRGB(6, 11, 11)
				shadow.BackgroundTransparency = 0.42
				shadow.BorderSizePixel = 0
				shadow.Position = card.Position + UDim2.fromOffset(3, 4)
				shadow.Size = card.Size
				shadow.Rotation = card.Rotation
				shadow.ZIndex = card.ZIndex - 1
				shadow.Parent = strip
				local art = ctx.AssetIds[ctx.artKey(e.d)]
				local image = Instance.new("ImageLabel")
				image.BackgroundTransparency = 1
				image.Size = UDim2.new(1, 0, 1, -19)
				image.Image = if art then "rbxassetid://" .. tostring(art) else ""
				image.ScaleType = Enum.ScaleType.Crop
				image.ZIndex = card.ZIndex
				image.Parent = card
				local caption = text(card, e.d.name .. " ×" .. e.n, 11, SEPIA, true)
				caption.Position = UDim2.new(0, 3, 1, -19)
				caption.Size = UDim2.new(1, -6, 0, 19)
				caption.ZIndex = card.ZIndex
				caption.TextWrapped = false
				caption.TextTruncate = Enum.TextTruncate.AtEnd
			end
		end
	end

	-- 승리 보상: 카드 한 장 고르기 (화면 가운데에 큰 안내)
	-- [선택 보상] 후보 선택과 서버 지급을 별개 터치로 처리한다.
	local function rebuildPick()
		if pickBanner then pickBanner:Destroy(); pickBanner = nil end
		local candidates = ctx.getBook().pick
		if not candidates or #candidates == 0 then return end
		local panel = Instance.new("Frame")
		pickBanner = panel
		panel.Name = "RewardCardChoice"
		panel.Size = UDim2.fromScale(1, 1)
		panel.BackgroundColor3 = CardTheme.leather
		panel.BorderSizePixel = 0
		panel.Active = true
		panel.ZIndex = 40
		panel.Parent = root

		local seaId = ctx.AssetIds["CardArt/ui_battle_dawn"]
		if seaId then
			local sea = Instance.new("ImageLabel")
			sea.BackgroundTransparency = 1
			sea.Size = UDim2.fromScale(1, 1)
			sea.Image = "rbxassetid://" .. tostring(seaId)
			sea.ScaleType = Enum.ScaleType.Crop
			sea.ZIndex = 40
			sea.Parent = panel
		end
		local heading = text(panel, "보상 카드 선택", 24, INK, true)
		heading.Position = UDim2.fromScale(0.05, 0.04)
		heading.Size = UDim2.fromScale(0.90, 0.12)
		heading.ZIndex = 41

		local selected
		local confirming = false
		local highlights = {}
		local confirm = button(panel, "이 카드 받기", PAPER, 17, function()
			if not selected or confirming then return end
			confirming = true
			Sfx.play("sfx_card_coin", 0.7, 1, "sfx_coin")
			ctx.act("CardPick", { index = selected })
			confirming = false
		end)
		confirm.AnchorPoint = Vector2.new(0.5, 1)
		confirm.Position = UDim2.fromScale(0.5, 0.96)
		confirm.Size = UDim2.new(0.42, 0, 0, 44)
		confirm.TextColor3 = SEPIA
		confirm.ZIndex = 42
		confirm.Active = false
		confirm.AutoButtonColor = false
		confirm.BackgroundTransparency = 0.4
		buttonArt(confirm, "ui_button_paper")
		local confirmArt = confirm:FindFirstChild("ButtonArtwork")
		if confirmArt then confirmArt.ImageTransparency = 0.4 end

		for i, id in candidates do
			local card = CB.def(id)
			local candidate = button(panel, "", PAPER, 16, function()
				if confirming then return end
				selected = i
				for index, stroke in highlights do
					stroke.Color = if index == selected then GOLD else BINDING
					stroke.Thickness = if index == selected then 3 else 1
				end
				confirm.Active = true
				confirm.AutoButtonColor = true
				confirm.BackgroundTransparency = if confirmArt then 1 else 0
				if confirmArt then confirmArt.ImageTransparency = 0 end
				Sfx.play("sfx_ui_select", 0.5, 1, "sfx_click")
			end)
			candidate.AnchorPoint = Vector2.new(0.5, 0.5)
			candidate.Position = UDim2.fromScale(0.05 + 0.90 * (i - 0.5) / #candidates, 0.48)
			candidate.Size = UDim2.fromScale(0.85 / #candidates, 0.59)
			candidate.ZIndex = 42
			highlights[i] = candidate:FindFirstChildOfClass("UIStroke")
			local ratio = Instance.new("UIAspectRatioConstraint")
			ratio.AspectRatio = 3 / 4
			ratio.AspectType = Enum.AspectType.FitWithinMaxSize
			ratio.Parent = candidate
			local art = Instance.new("ImageLabel")
			art.BackgroundTransparency = 1
			art.Position = UDim2.fromScale(0.025, 0.025)
			art.Size = UDim2.fromScale(0.95, 0.73)
			art.ScaleType = Enum.ScaleType.Crop
			art.ZIndex = 43
			local artId = card and ctx.AssetIds[ctx.artKey(card)]
			art.Image = if artId then "rbxassetid://" .. tostring(artId) else ""
			art.Parent = candidate
			local name = text(candidate, card and card.name or id, 15, SEPIA, true)
			name.Position = UDim2.fromScale(0.04, 0.76)
			name.Size = UDim2.fromScale(0.92, 0.23)
			name.TextScaled = true
			name.ZIndex = 43
			local limit = Instance.new("UITextSizeConstraint")
			limit.MaxTextSize = 16
			limit.Parent = name
		end
	end

	-- 전체 다시 그리기. keepGrid=true 면 격자는 그대로 두고 숫자·덱만 갱신한다 (스크롤 위치 보존)
	refresh = function(keepGrid)
		local book = ctx.getBook()
		local ids = wantIds()
		local okDeck, why = CB.validateDeck(book, ids)
		local summary = CB.deckOverview(ids, book.faction)
		local saved = table.clone(book.ids or {})
		table.sort(saved)
		local dirty = #saved ~= #ids
		if not dirty then
			for i, id in ids do if saved[i] ~= id then dirty = true; break end end
		end
		cur.dirty = dirty
		local have, total = 0, 0
		for _, id in ctx.catalog do
			total += 1
			if (book.owned[id] or 0) > 0 then have += 1 end
		end
		collect.Text = string.format("수집 %d/%d", have, total)
		local cost, limit = CB.deckCost(ids), CB.provisionLimit(book.faction, book.leader)
		provFill.Size = UDim2.fromScale(math.clamp(cost / math.max(1, limit), 0, 1), 1)
		provFill.BackgroundColor3 = if cost > limit then Color3.fromRGB(200, 90, 70) else Color3.fromRGB(110, 180, 110)
		provText.Text = string.format("보급 %d/%d", cost, limit)
		countPill.Text = string.format("%d / %d", #ids, CB.MAX_DECK)
		local countOk = #ids >= CB.MIN_DECK and #ids <= CB.MAX_DECK
		countPill.BackgroundColor3 = if countOk then Color3.fromRGB(150, 225, 150) else Color3.fromRGB(240, 170, 130)
		balLabels.melee.Text = "전열 " .. summary.melee
		balLabels.ranged.Text = "후열 " .. summary.ranged
		balLabels.special.Text = "전술 " .. summary.special .. "/" .. CB.MAX_SPECIALS
		balLabels.neutral.Text = "중립 " .. summary.neutral .. "/" .. CB.LOST_MAX
		comboButton.Visible = summary.comboTotal > 0
		comboButton.Text = string.format("대표 조합 %d/%d · 카드 보기", summary.combo, summary.comboTotal)
		comboButton.TextColor3 = if summary.combo == summary.comboTotal then Color3.fromRGB(158, 231, 175) else GOLD
		statusLine.Text = if okDeck then string.format("%s · 영웅 %d/%d", if dirty then "저장 전" else "전투 가능", summary.heroes, CB.MAX_HEROES)
			else "덱을 고쳐 주세요: " .. tostring(why)
		statusLine.TextColor3 = if okDeck then Color3.fromRGB(150, 225, 150) else Color3.fromRGB(245, 160, 130)

		saveBtn.BackgroundTransparency = if saveArt then 1 elseif okDeck then 0 else 0.6
		if saveArt then saveArt.ImageTransparency = if okDeck then 0 else 0.55 end
		saveBtn.Text = "덱 저장"
		saveBtn.Active = okDeck
		saveBtn.AutoButtonColor = okDeck
		local view = ctx.getView()

		-- 지도자
		local fac = BC.Factions[book.faction or ""]
		if fac and fac.leaders then
			local curLeader = book.leader or fac.leader
			local cd = BC.Leaders[curLeader]
			leaderName.Text = "지도자 · " .. (cd and cd.name or "?")
			leaderText.Text = string.format("%s%s · 보급 +%d", if cd then (BC.cardAbilitySymbol(cd) or "◆") .. " " else "", cd and cd.text or "", cd and cd.provision or 0)
			leaderCardName.Text = cd and cd.name or "지도자"
			leaderFullName.Text = leaderName.Text
			leaderFullText.Text = leaderText.Text
			-- 등록된 지도자 전신 원화를 절단하지 않고 일반 카드의 70% 그림 영역에 표시한다.
			local artKey = "CardArt/leader_" .. curLeader
			local artId = ctx.AssetIds[artKey]
			if not artId and curLeader == "napoleon" then artId = ctx.AssetIds["Portraits/person_napoleon"] end
			if not artId and curLeader == "elizabeth" then artId = ctx.AssetIds["Portraits/person_elizabeth1"] end
			local leaderImageId = if artId then "rbxassetid://" .. tostring(artId) else ""
			leaderImage.Image = leaderImageId
			leaderFullImage.Image = leaderImageId
			local coverId = artId or ctx.AssetIds["CardArt/battle_card_back"]
			deckCover.Image = if coverId then "rbxassetid://" .. tostring(coverId) else ""
			local label = string.format("%s · %d장", cd and cd.name or "지도자", #saved)
			deckSummary.Text = label .. (if dirty then " · 저장 전" elseif okDeck then " · 출항 가능" else " · 편성 필요")
			deckLabel = label
			local idx = table.find(fac.leaders, curLeader) or 1
			cur.leaderStep = function(delta)
				local nxt = fac.leaders[((idx - 1 + delta) % #fac.leaders) + 1]
				Sfx.play("sfx_card_page", 0.5, 1, "sfx_book_turn")
				ctx.act("CardSetLeader", { id = nxt })
			end
			prevLeader.Visible = #fac.leaders > 1
			nextLeader.Visible = #fac.leaders > 1
		end

		-- 저장 칸
		local slots = (view and view.slots) or {}
		for slot = 1, CB.SLOTS do
			local sl = slots[slot]
			slotBtns[slot].Text = if sl then string.format("칸%d·%d장", slot, #sl.ids) else string.format("칸%d·비어", slot)
			slotBtns[slot].BackgroundColor3 = if sl then Color3.fromRGB(70, 96, 130) else Color3.fromRGB(70, 66, 84)
		end
		cur.ids, cur.okDeck, cur.slots = ids, okDeck, slots
		updateDeparture()
		slotSaveBtn.Text = if cur.saveMode then "취소" else "칸에 저장"
		slotSaveBtn.BackgroundColor3 = if cur.saveMode then Color3.fromRGB(176, 120, 52) else Color3.fromRGB(52, 100, 70)
		if cur.saveMode then statusLine.Text = "저장할 칸을 누르세요"; statusLine.TextColor3 = GOLD end

		if not keepGrid then rebuildGrid() end
		rebuildDeckList()
		if selectedTab == "deck" then
			selectCard(if selectedCard and (ctx.getWant()[selectedCard] or 0) > 0 then selectedCard else ids[1])
		end
		rebuildPick()
	end

	paintChips()
	refresh(false)
	return { refresh = refresh, root = root }
end

return DeckBuilder
