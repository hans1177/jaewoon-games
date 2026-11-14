--!nonstrict
-- 내 카드(덱 구성) 화면: 카드 게임 컬렉션처럼 [왼쪽 카드 격자 | 오른쪽 덱 목록] 두 칸 + 위 상태줄 + 아래 큰 행동 버튼.
-- 규칙·저장은 CardBook/서버가 그대로 맡고, 여기서는 보여 주고 누르는 일만 한다 (ctx 로 동작을 받는다).
--   카드 누르기 = 덱에 1장 넣기 · ⓘ = 큰 카드 보기 · 덱 줄의 − = 1장 빼기
local TweenService = game:GetService("TweenService")
local Sfx = require(script.Parent:WaitForChild("Sfx"))
local Gallery = require(script.Parent:WaitForChild("CardGallery"))

local DeckBuilder = {}

local INK = Color3.fromRGB(250, 236, 200)
local GOLD = Color3.fromRGB(246, 208, 130)
local PANEL = Color3.fromRGB(34, 27, 22)
local PANEL2 = Color3.fromRGB(48, 38, 30)
local TIER_COLOR = { Color3.fromRGB(176, 112, 62), Color3.fromRGB(196, 202, 212), Color3.fromRGB(238, 196, 84) }
local ROW_COLOR = { melee = Color3.fromRGB(190, 84, 62), ranged = Color3.fromRGB(96, 150, 84), cannon = Color3.fromRGB(84, 124, 176) }
local ROW_SHORT = { melee = "근", ranged = "사", cannon = "포" }
local ROW_ORDER = { melee = 1, ranged = 2, cannon = 3 }
local FILTERS = {
	{ id = "owned", text = "보유" }, { id = "all", text = "전체" }, { id = "hero", text = "영웅" }, { id = "special", text = "특수" },
	{ id = "eu", text = "유럽" }, { id = "ea", text = "동아시아" }, { id = "me", text = "중동" }, { id = "nw", text = "신대륙" },
	{ id = "af", text = "아프리카" }, { id = "sa", text = "동남아" }, { id = "lo", text = "미지의 땅" },
	{ id = "crew", text = "동료" },
}
local PAGE = 60

local function corner(o, r)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, r)
	c.Parent = o
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
	return string.match(id, "^(%a%a)_") == f
end

-- parent(창) 전체를 쓰는 화면을 만든다. 반환: { refresh = 다시 그리기 }
function DeckBuilder.build(parent, ctx)
	local CB, BC = ctx.CB, ctx.BC
	local state = { filter = "owned", page = 1 }
	local cur = { ids = {}, okDeck = false, slots = {}, saveMode = false, leaderStep = nil }
	local recPop -- 추천 덱 선택 창 (아래에서 만든다)
	local root = Instance.new("Frame")
	root.Name = "DeckBuilder"
	root.BackgroundTransparency = 1
	root.Size = UDim2.fromScale(1, 1)
	root.Parent = parent

	-- ── 위 상태줄 ──
	local top = Instance.new("Frame")
	top.Size = UDim2.new(1, -16, 0, 46)
	top.Position = UDim2.fromOffset(8, 6)
	top.BackgroundColor3 = PANEL
	top.BorderSizePixel = 0
	top.Parent = root
	corner(top, 10)
	local title = text(top, "내 카드", 22, GOLD, true)
	title.Position = UDim2.fromOffset(12, 0)
	title.Size = UDim2.new(0.2, 0, 1, 0)
	title.TextXAlignment = Enum.TextXAlignment.Left
	local collect = text(top, "", 15, INK, true)
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
	local closeBtn = button(top, "닫기", Color3.fromRGB(110, 54, 46), 16, function() ctx.onClose() end)
	closeBtn.AnchorPoint = Vector2.new(1, 0.5)
	closeBtn.Position = UDim2.new(1, -8, 0.5, 0)
	closeBtn.Size = UDim2.fromOffset(64, 34)

	-- ── 아래 행동 버튼 ──
	local bottom = Instance.new("Frame")
	bottom.AnchorPoint = Vector2.new(0, 1)
	bottom.Position = UDim2.new(0, 8, 1, -6)
	bottom.Size = UDim2.new(1, -16, 0, 52)
	bottom.BackgroundTransparency = 1
	bottom.Parent = root
	local bl = Instance.new("UIListLayout")
	bl.FillDirection = Enum.FillDirection.Horizontal
	bl.Padding = UDim.new(0, 8)
	bl.HorizontalFlex = Enum.UIFlexAlignment.Fill
	bl.Parent = bottom
	local duelBtn = button(bottom, "", Color3.fromRGB(176, 62, 52), 18, function() ctx.startDuel() end)
	local practiceBtn = button(bottom, "", Color3.fromRGB(70, 130, 84), 18, function() ctx.startPractice() end)
	local tavernBtn = button(bottom, "용병 고용 180", Color3.fromRGB(176, 136, 52), 16, function() ctx.act("CardTavern") end)
	for _, b in { duelBtn, practiceBtn, tavernBtn } do b.Size = UDim2.new(0, 100, 1, 0) end

	-- ── 가운데: 왼쪽 컬렉션 / 오른쪽 덱 ──
	local body = Instance.new("Frame")
	body.BackgroundTransparency = 1
	body.Position = UDim2.fromOffset(8, 58)
	body.Size = UDim2.new(1, -16, 1, -58 - 64)
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

	-- 오른쪽: 지도자 + 덱 목록 + 균형 + 도구
	local leaderBox = Instance.new("Frame")
	leaderBox.Position = UDim2.fromOffset(6, 6)
	leaderBox.Size = UDim2.new(1, -12, 0, 62)
	leaderBox.BackgroundColor3 = PANEL2
	leaderBox.BorderSizePixel = 0
	leaderBox.Parent = right
	corner(leaderBox, 8)
	local leaderName = text(leaderBox, "", 16, GOLD, true)
	leaderName.Position = UDim2.fromOffset(40, 2)
	leaderName.Size = UDim2.new(1, -80, 0, 22)
	leaderName.TextXAlignment = Enum.TextXAlignment.Left
	local leaderText = text(leaderBox, "", 13, INK, false)
	leaderText.Position = UDim2.fromOffset(40, 24)
	leaderText.Size = UDim2.new(1, -80, 0, 36)
	leaderText.TextXAlignment = Enum.TextXAlignment.Left
	leaderText.TextYAlignment = Enum.TextYAlignment.Top
	local prevLeader = button(leaderBox, "<", Color3.fromRGB(90, 72, 52), 16, function() if cur.leaderStep then cur.leaderStep(-1) end end)
	prevLeader.Position = UDim2.fromOffset(4, 14)
	prevLeader.Size = UDim2.fromOffset(32, 34)
	local nextLeader = button(leaderBox, ">", Color3.fromRGB(90, 72, 52), 16, function() if cur.leaderStep then cur.leaderStep(1) end end)
	nextLeader.AnchorPoint = Vector2.new(1, 0)
	nextLeader.Position = UDim2.new(1, -4, 0, 14)
	nextLeader.Size = UDim2.fromOffset(32, 34)

	local balance = Instance.new("Frame") -- 줄 균형 막대 3개
	balance.Position = UDim2.fromOffset(6, 74)
	balance.Size = UDim2.new(1, -12, 0, 22)
	balance.BackgroundTransparency = 1
	balance.Parent = right
	local balLayout = Instance.new("UIListLayout")
	balLayout.FillDirection = Enum.FillDirection.Horizontal
	balLayout.Padding = UDim.new(0, 6)
	balLayout.HorizontalFlex = Enum.UIFlexAlignment.Fill
	balLayout.Parent = balance
	local balLabels = {}
	for _, row in { "melee", "ranged", "cannon" } do
		local l = text(balance, "", 14, Color3.new(1, 1, 1), true)
		l.BackgroundTransparency = 0
		l.BackgroundColor3 = ROW_COLOR[row]
		l.Size = UDim2.new(0, 60, 1, 0)
		corner(l, 6)
		balLabels[row] = l
	end

	local deckScroll = Instance.new("ScrollingFrame")
	deckScroll.BackgroundTransparency = 1
	deckScroll.BorderSizePixel = 0
	deckScroll.Position = UDim2.fromOffset(6, 102)
	deckScroll.Size = UDim2.new(1, -12, 1, -102 - 118)
	deckScroll.ScrollBarThickness = 5
	deckScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
	deckScroll.CanvasSize = UDim2.new()
	deckScroll.Parent = right
	local dl = Instance.new("UIListLayout")
	dl.Padding = UDim.new(0, 3)
	dl.SortOrder = Enum.SortOrder.LayoutOrder
	dl.Parent = deckScroll

	local tools = Instance.new("Frame")
	tools.AnchorPoint = Vector2.new(0, 1)
	tools.Position = UDim2.new(0, 6, 1, -6)
	tools.Size = UDim2.new(1, -12, 0, 110)
	tools.BackgroundTransparency = 1
	tools.Parent = right
	local statusLine = text(tools, "", 14, Color3.fromRGB(150, 225, 150), true)
	statusLine.Size = UDim2.new(1, 0, 0, 34)
	statusLine.TextXAlignment = Enum.TextXAlignment.Left
	statusLine.TextYAlignment = Enum.TextYAlignment.Top
	local row1 = Instance.new("Frame")
	row1.BackgroundTransparency = 1
	row1.Position = UDim2.fromOffset(0, 36)
	row1.Size = UDim2.new(1, 0, 0, 34)
	row1.Parent = tools
	local r1 = Instance.new("UIListLayout")
	r1.FillDirection = Enum.FillDirection.Horizontal
	r1.Padding = UDim.new(0, 5)
	r1.HorizontalFlex = Enum.UIFlexAlignment.Fill
	r1.Parent = row1
	local saveBtn = button(row1, "덱 저장", Color3.fromRGB(52, 120, 70), 16, function()
		if cur.okDeck then
			Sfx.play("sfx_ui_confirm", 0.5, 1, "sfx_click")
			ctx.act("CardSetDeck", { ids = cur.ids })
		else
			Sfx.play("sfx_error", 0.4, 1)
		end
	end)
	local autoBtn = button(row1, "자동 덱", Color3.fromRGB(60, 96, 140), 15, function() ctx.act("CardAutoDeck") end)
	local recBtn = button(row1, "추천 덱", Color3.fromRGB(110, 90, 60), 15, function() recPop.Visible = not recPop.Visible end)
	for _, b in { saveBtn, autoBtn, recBtn } do b.Size = UDim2.new(0, 60, 1, 0) end
	local row2 = Instance.new("Frame")
	row2.BackgroundTransparency = 1
	row2.Position = UDim2.fromOffset(0, 74)
	row2.Size = UDim2.new(1, 0, 0, 34)
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
	recPop.AnchorPoint = Vector2.new(0, 1)
	recPop.Position = UDim2.new(0, 6, 1, -118)
	recPop.Size = UDim2.new(1, -12, 0, 44)
	recPop.BackgroundColor3 = Color3.fromRGB(26, 20, 16)
	recPop.BorderSizePixel = 0
	recPop.Visible = false
	recPop.ZIndex = 30
	recPop.Parent = right
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
			ctx.act("CardRecommend", { style = r[1] })
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
		if tile and tile.Parent then
			local st = tile:FindFirstChildOfClass("UIStroke")
			if st then
				st.Color = Color3.fromRGB(150, 230, 150)
				TweenService:Create(st, TweenInfo.new(0.5), { Color = TIER_COLOR[book.tier[id] or 1] }):Play()
			end
		end
		refresh(true)
	end

	local function makeTile(id, order)
		local book, want = ctx.getBook(), ctx.getWant()
		local d = CB.def(id)
		local owned = book.owned[id] or 0
		local tier = book.tier[id] or 1
		local tile = Instance.new("TextButton")
		tile.Text = ""
		tile.AutoButtonColor = false
		tile.LayoutOrder = order
		tile.BackgroundColor3 = if d.hero then Color3.fromRGB(107, 72, 40) else Color3.fromRGB(58, 44, 32)
		tile.BorderSizePixel = 0
		tile.Parent = gridScroll
		corner(tile, 8)
		local st = Instance.new("UIStroke")
		st.Color = if owned > 0 then TIER_COLOR[tier] else Color3.fromRGB(80, 74, 70)
		st.Thickness = if owned > 0 and tier == 3 then 3 else 2
		st.Parent = tile
		local img = Instance.new("ImageLabel")
		img.Position = UDim2.fromOffset(4, 4)
		img.Size = UDim2.new(1, -8, 0.7, -4)
		img.BackgroundColor3 = Color3.fromRGB(88, 67, 46)
		img.ScaleType = Enum.ScaleType.Crop
		local key = ctx.artKey(d)
		img.Image = if ctx.AssetIds[key] then "rbxassetid://" .. tostring(ctx.AssetIds[key]) else ""
		img.ImageColor3 = if owned > 0 then Color3.new(1, 1, 1) else Color3.fromRGB(55, 55, 65)
		img.Parent = tile
		corner(img, 6)
		local nm = text(tile, if owned > 0 then d.name else "???", 14, Color3.fromRGB(255, 237, 188), true)
		nm.Position = UDim2.new(0, 3, 0.72, 0)
		nm.Size = UDim2.new(1, -6, 0.28, 0)
		nm.TextScaled = true
		local lim = Instance.new("UITextSizeConstraint")
		lim.MaxTextSize = 15
		lim.MinTextSize = 10
		lim.Parent = nm
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
		-- ⓘ: 큰 카드 보기 / 타일 누르기: 덱에 넣기
		local info = button(tile, "i", Color3.fromRGB(32, 24, 18), 15, function()
			Sfx.play("sfx_ui_select", 0.5, 1, "sfx_click")
			Gallery.showDetail(ctx.galleryCtx, id)
		end)
		info.AnchorPoint = Vector2.new(1, 1)
		info.Position = UDim2.new(1, -4, 1, -4)
		info.Size = UDim2.fromOffset(26, 26)
		info.ZIndex = 5
		tile.Activated:Connect(function()
			if owned > 0 then addCard(id, tile) else Gallery.showDetail(ctx.galleryCtx, id) end
		end)
		return tile
	end

	rebuildGrid = function()
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
		local shown, n = 0, 0
		for _, id in ctx.catalog do
			local d = CB.def(id)
			local owned = book.owned[id] or 0
			if d and inFilter(ctx, id, d, state.filter, owned) then
				n += 1
				if n <= state.page * PAGE then
					shown += 1
					makeTile(id, shown)
				end
			end
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
			b.BackgroundColor3 = if fid == state.filter then Color3.fromRGB(214, 160, 70) else Color3.fromRGB(70, 60, 66)
			b.TextColor3 = if fid == state.filter then Color3.fromRGB(40, 28, 18) else INK
		end
	end
	for i, f in FILTERS do
		local b = button(chips, f.text, Color3.fromRGB(70, 60, 66), 15, function()
			Sfx.play("sfx_card_page", 0.5, 1, "sfx_book_turn")
			state.filter, state.page = f.id, 1
			paintChips()
			rebuildGrid()
		end)
		b.Size = UDim2.new(0, 16 * utf8.len(f.text) + 28, 1, -4)
		b.LayoutOrder = i
		chipBtns[f.id] = b
	end

	-- 덱 목록 줄
	local function rebuildDeckList()
		for _, ch in deckScroll:GetChildren() do
			if not ch:IsA("UIListLayout") then ch:Destroy() end
		end
		local want = ctx.getWant()
		local list = {}
		for id, n in want do
			local d = CB.def(id)
			if d then table.insert(list, { id = id, d = d, n = n }) end
		end
		table.sort(list, function(a, b)
			local ka = if a.d.hero then 0 elseif a.d.special then 4 else ROW_ORDER[a.d.row] or 3
			local kb = if b.d.hero then 0 elseif b.d.special then 4 else ROW_ORDER[b.d.row] or 3
			if ka ~= kb then return ka < kb end
			if (a.d.power or 0) ~= (b.d.power or 0) then return (a.d.power or 0) > (b.d.power or 0) end
			return a.id < b.id
		end)
		if #list == 0 then
			local e = text(deckScroll, "덱이 비었어요.\n왼쪽 카드를 눌러 넣거나 '자동 덱'을 눌러요.", 15, Color3.fromRGB(190, 175, 150), false)
			e.Size = UDim2.new(1, 0, 0, 60)
			return
		end
		local book = ctx.getBook()
		for i, e in list do
			local tier = book.tier[e.id] or 1
			local row = Instance.new("Frame")
			row.LayoutOrder = i
			row.Size = UDim2.new(1, -6, 0, 34)
			row.BackgroundColor3 = if e.d.hero then Color3.fromRGB(88, 62, 36) else PANEL2
			row.BorderSizePixel = 0
			row.Parent = deckScroll
			corner(row, 6)
			local bar = Instance.new("Frame") -- 줄 색 띠
			bar.Size = UDim2.new(0, 5, 1, -8)
			bar.Position = UDim2.fromOffset(3, 4)
			bar.BackgroundColor3 = ROW_COLOR[e.d.row] or Color3.fromRGB(150, 120, 190)
			bar.BorderSizePixel = 0
			bar.Parent = row
			local pw = text(row, tostring(if e.d.special then "★" else e.d.power + tier - 1), 16, Color3.fromRGB(255, 232, 170), true)
			pw.Position = UDim2.fromOffset(12, 4)
			pw.Size = UDim2.fromOffset(26, 26)
			pw.BackgroundTransparency = 0
			pw.BackgroundColor3 = Color3.fromRGB(32, 24, 18)
			corner(pw, 13)
			local nm = text(row, e.d.name, 15, TIER_COLOR[tier], true)
			nm.Position = UDim2.fromOffset(44, 0)
			nm.Size = UDim2.new(1, -44 - 84, 1, 0)
			nm.TextXAlignment = Enum.TextXAlignment.Left
			nm.TextTruncate = Enum.TextTruncate.AtEnd
			nm.TextWrapped = false
			local cnt = text(row, "×" .. e.n, 15, INK, true)
			cnt.AnchorPoint = Vector2.new(1, 0)
			cnt.Position = UDim2.new(1, -44, 0, 0)
			cnt.Size = UDim2.fromOffset(34, 34)
			local minus = button(row, "-", Color3.fromRGB(130, 58, 52), 20, function()
				Sfx.play("sfx_click", 0.5, 0.9)
				ctx.onWant(e.id, -1)
				refresh(true)
			end)
			minus.AnchorPoint = Vector2.new(1, 0.5)
			minus.Position = UDim2.new(1, -4, 0.5, 0)
			minus.Size = UDim2.fromOffset(36, 28)
			local clickable = Instance.new("TextButton") -- 이름을 누르면 큰 카드 보기
			clickable.Text = ""
			clickable.BackgroundTransparency = 1
			clickable.Position = nm.Position
			clickable.Size = nm.Size
			clickable.Parent = row
			clickable.Activated:Connect(function() Gallery.showDetail(ctx.galleryCtx, e.id) end)
		end
	end

	-- 승리 보상: 카드 한 장 고르기 (화면 가운데에 큰 안내)
	local function rebuildPick()
		if pickBanner then pickBanner:Destroy(); pickBanner = nil end
		local bk = ctx.getBook()
		if not bk.pick then return end
		pickBanner = Instance.new("Frame")
		pickBanner.AnchorPoint = Vector2.new(0.5, 0.5)
		pickBanner.Position = UDim2.fromScale(0.5, 0.5)
		pickBanner.Size = UDim2.new(0.92, 0, 0, 180)
		pickBanner.BackgroundColor3 = Color3.fromRGB(30, 24, 20)
		pickBanner.BorderSizePixel = 0
		pickBanner.ZIndex = 40
		pickBanner.Parent = root
		corner(pickBanner, 12)
		local st = Instance.new("UIStroke")
		st.Color = GOLD
		st.Thickness = 3
		st.Parent = pickBanner
		local hd = text(pickBanner, "승리 보상! 카드 1장을 고르세요", 20, GOLD, true)
		hd.Size = UDim2.new(1, 0, 0, 34)
		hd.ZIndex = 41
		local rowF = Instance.new("Frame")
		rowF.BackgroundTransparency = 1
		rowF.Position = UDim2.fromOffset(10, 40)
		rowF.Size = UDim2.new(1, -20, 1, -50)
		rowF.ZIndex = 41
		rowF.Parent = pickBanner
		local rl = Instance.new("UIListLayout")
		rl.FillDirection = Enum.FillDirection.Horizontal
		rl.Padding = UDim.new(0, 10)
		rl.HorizontalFlex = Enum.UIFlexAlignment.Fill
		rl.Parent = rowF
		for i, id in bk.pick do
			local cd = CB.def(id)
			local b = button(rowF, (cd and cd.name or id) .. (if cd and cd.power then string.format("\n점수 %d", cd.power) else ""), Color3.fromRGB(176, 136, 52), 17, function()
				Sfx.play("sfx_card_coin", 0.7, 1, "sfx_coin")
				ctx.act("CardPick", { index = i })
			end)
			b.ZIndex = 42
			b.Size = UDim2.new(0, 100, 1, 0)
		end
	end

	-- 전체 다시 그리기. keepGrid=true 면 격자는 그대로 두고 숫자·덱만 갱신한다 (스크롤 위치 보존)
	refresh = function(keepGrid)
		local book = ctx.getBook()
		local ids = wantIds()
		local okDeck, why = CB.validateDeck(book, ids)
		local heroes, specials = 0, 0
		local rowCount = { melee = 0, ranged = 0, cannon = 0 }
		for _, id in ids do
			if CB.isHero(id) then heroes += 1 end
			if CB.isSpecial(id) then specials += 1 end
			local d = CB.def(id)
			if d and d.row and rowCount[d.row] then rowCount[d.row] += 1 end
		end
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
		countPill.Text = string.format("덱 %d장 (%d~%d)", #ids, CB.MIN_DECK, CB.MAX_DECK)
		local countOk = #ids >= CB.MIN_DECK and #ids <= CB.MAX_DECK
		countPill.BackgroundColor3 = if countOk then Color3.fromRGB(150, 225, 150) else Color3.fromRGB(240, 170, 130)
		balLabels.melee.Text = "근접 " .. rowCount.melee
		balLabels.ranged.Text = "사격 " .. rowCount.ranged
		balLabels.cannon.Text = "포격 " .. rowCount.cannon
		statusLine.Text = if okDeck then string.format("싸울 수 있어요 · 영웅 %d/%d · 특수 %d/%d", heroes, CB.MAX_HEROES, specials, CB.MAX_SPECIALS)
			else "덱을 고쳐 주세요: " .. tostring(why)
		statusLine.TextColor3 = if okDeck then Color3.fromRGB(150, 225, 150) else Color3.fromRGB(245, 160, 130)

		saveBtn.BackgroundTransparency = if okDeck then 0 else 0.6
		saveBtn.Text = "덱 저장"
		local view = ctx.getView()
		local duelLeft = (view and view.duelLeft) or 0 -- view = view.cardbook
		duelBtn.Text = string.format("카드 대결\n(보상 %d회)", duelLeft)
		duelBtn.BackgroundTransparency = if okDeck then 0 else 0.6
		practiceBtn.Text = if book.practiceDone then "연습전\n(보상 받음)" else "연습전\n(규칙 배우기)"

		-- 지도자
		local fac = BC.Factions[book.faction or ""]
		if fac and fac.leaders then
			local curLeader = book.leader or fac.leader
			local cd = BC.Leaders[curLeader]
			leaderName.Text = "지도자 · " .. (cd and cd.name or "?")
			leaderText.Text = string.format("%s · 보급 +%d", cd and cd.text or "", cd and cd.provision or 0)
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
		slotSaveBtn.Text = if cur.saveMode then "취소" else "칸에 저장"
		slotSaveBtn.BackgroundColor3 = if cur.saveMode then Color3.fromRGB(176, 120, 52) else Color3.fromRGB(52, 100, 70)
		if cur.saveMode then statusLine.Text = "저장할 칸을 누르세요"; statusLine.TextColor3 = GOLD end

		if not keepGrid then rebuildGrid() end
		rebuildDeckList()
		rebuildPick()
	end

	paintChips()
	refresh(false)
	return { refresh = refresh, root = root }
end

return DeckBuilder
