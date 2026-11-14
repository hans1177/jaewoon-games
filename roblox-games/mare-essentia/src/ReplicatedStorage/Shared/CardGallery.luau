--!nonstrict
-- 내 카드 갤러리: 퀸트식 카드 타일 격자 + 큰 카드 보기. (표시만 다룬다 — 덱 규칙·저장은 CardBook/서버가 그대로 맡는다)
-- 타일: 그림·이름·점수 동그라미·보유 수·동은금 테두리. 금 카드는 은은히 반짝이고, 큰 카드 그림은 천천히 움직인다.
local TweenService = game:GetService("TweenService")
local Sfx = require(script.Parent:WaitForChild("Sfx"))

local Gallery = {}

local TIER_COLOR = { Color3.fromRGB(176, 112, 62), Color3.fromRGB(196, 202, 212), Color3.fromRGB(238, 196, 84) }
local CONT_NAME = { eu = "유럽", ea = "동아시아", me = "중동", nw = "신대륙", af = "아프리카", sa = "동남아", lo = "미지의 땅" }
local FILTERS = {
	{ id = "owned", text = "보유" },
	{ id = "all", text = "전체" },
	{ id = "hero", text = "영웅" },
	{ id = "special", text = "특수" },
	{ id = "eu", text = "유럽" }, { id = "ea", text = "동아시아" }, { id = "me", text = "중동" },
	{ id = "nw", text = "신대륙" }, { id = "af", text = "아프리카" }, { id = "sa", text = "동남아" }, { id = "lo", text = "미지의 땅" },
}
local PAGE = 48
local state = { filter = "owned", page = 1 }

local function corner(o, r)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, r)
	c.Parent = o
end

local function newLabel(parent, text, size, color, bold)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Text = text
	l.TextSize = size
	l.TextColor3 = color or Color3.fromRGB(250, 236, 200)
	l.Font = if bold then Enum.Font.GothamBold else Enum.Font.Gotham
	l.TextWrapped = true
	l.Parent = parent
	return l
end

-- 카드를 어디서 얻는지 (코드의 실제 규칙만 안내한다)
function Gallery.sourceText(ctx, id)
	local CB, BC = ctx.CB, ctx.BC
	local prefix = string.match(id, "^(%a%a)_%d%d$")
	if prefix == "lo" then
		return "미지의 땅 카드: 탐험·퀘스트·보물상자·두목 격파에서 가끔 나와요"
	end
	for _, grade in { "hero", "rare", "common" } do
		for _, pid in CB.POOLS[grade] do
			if pid == id then
				local names = {}
				for src, w in CB.SOURCES do
					if w[grade] > 0 then table.insert(names, { n = CB.SOURCE_NAME[src], w = w[grade] }) end
				end
				table.sort(names, function(a, b) return a.w > b.w end)
				local out = {}
				for _, x in names do table.insert(out, x.n) end
				return "얻는 곳: " .. table.concat(out, " · ") .. (if grade == "hero" then " (아주 드물어요)" elseif grade == "rare" then " (드물어요)" else "")
			end
		end
	end
	if prefix and CONT_NAME[prefix] then
		return CONT_NAME[prefix] .. " 문화권 카드: 그 문화권으로 시작하면 처음부터 가져요"
	end
	return "특별한 보상으로 얻어요"
end

local function inFilter(ctx, id, d, f, owned)
	if f == "owned" then return owned > 0 end
	if f == "all" then return true end
	if f == "hero" then return d.hero == true end
	if f == "special" then return ctx.BC.Specials[id] ~= nil end
	return string.match(id, "^(%a%a)_") == f
end

-- 큰 카드 보기 (창 위에 띄운다)
local function showDetail(ctx, id)
	local old = ctx.overlay:FindFirstChild("CardDetail")
	if old then old:Destroy() end
	if not id then return end
	local book, want = ctx.getBook(), ctx.getWant()
	local d = ctx.CB.def(id)
	local owned = book.owned[id] or 0
	local tier = book.tier[id] or 1

	local shade = Instance.new("TextButton")
	shade.Name = "CardDetail"
	shade.Text = ""
	shade.AutoButtonColor = false
	shade.Size = UDim2.fromScale(1, 1)
	shade.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
	shade.BackgroundTransparency = 0.35
	shade.BorderSizePixel = 0
	shade.ZIndex = 50
	shade.Parent = ctx.overlay
	shade.Activated:Connect(function() showDetail(ctx, nil) end)

	local card = Instance.new("Frame")
	card.AnchorPoint = Vector2.new(0.5, 0.5)
	card.Position = UDim2.fromScale(0.5, 0.5)
	card.Size = UDim2.new(0.9, 0, 0, 330)
	card.BackgroundColor3 = Color3.fromRGB(34, 26, 20)
	card.BorderSizePixel = 0
	card.ZIndex = 51
	card.Parent = shade
	corner(card, 12)
	local lim = Instance.new("UISizeConstraint")
	lim.MaxSize = Vector2.new(560, 330)
	lim.Parent = card
	local stroke = Instance.new("UIStroke")
	stroke.Color = TIER_COLOR[tier]
	stroke.Thickness = 3
	stroke.Parent = card
	local sink = Instance.new("TextButton") -- 카드 안을 눌러도 닫히지 않게
	sink.Text = ""
	sink.BackgroundTransparency = 1
	sink.Size = UDim2.fromScale(1, 1)
	sink.ZIndex = 51
	sink.Parent = card

	local frame = Instance.new("Frame")
	frame.Position = UDim2.fromOffset(12, 12)
	frame.Size = UDim2.new(0, 190, 1, -24)
	frame.BackgroundColor3 = Color3.fromRGB(70, 52, 38)
	frame.ClipsDescendants = true
	frame.BorderSizePixel = 0
	frame.ZIndex = 52
	frame.Parent = card
	corner(frame, 8)
	local art = Instance.new("ImageLabel")
	art.AnchorPoint = Vector2.new(0.5, 0.5)
	art.Position = UDim2.fromScale(0.46, 0.52)
	art.Size = UDim2.fromScale(1.3, 1.3)
	art.BackgroundTransparency = 1
	art.ScaleType = Enum.ScaleType.Crop
	local key = ctx.artKey(d)
	art.Image = if ctx.AssetIds[key] then "rbxassetid://" .. tostring(ctx.AssetIds[key]) else ""
	art.ImageColor3 = if owned > 0 then Color3.new(1, 1, 1) else Color3.fromRGB(70, 70, 80)
	art.ZIndex = 52
	art.Parent = frame
	-- 움직이는 그림: 천천히 좌우로 흐른다
	TweenService:Create(art, TweenInfo.new(7, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { Position = UDim2.fromScale(0.54, 0.48) }):Play()

	local right = Instance.new("Frame")
	right.BackgroundTransparency = 1
	right.Position = UDim2.fromOffset(212, 10)
	right.Size = UDim2.new(1, -224, 1, -20)
	right.ZIndex = 52
	right.Parent = card
	local lay = Instance.new("UIListLayout")
	lay.Padding = UDim.new(0, 5)
	lay.Parent = right
	local title = newLabel(right, string.format("[%s] %s", ctx.CB.TIER_NAME[tier], d.name), 20, TIER_COLOR[tier], true)
	title.Size = UDim2.new(1, 0, 0, 28)
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.ZIndex = 52
	local kind = if ctx.BC.Specials[id] then "특수 카드" elseif d.hero then "영웅" else string.format("%s 줄 · 점수 %d", ctx.BC.ROW_NAME[d.row], d.power + tier - 1)
	local info = newLabel(right, kind .. (if d.category then " · " .. d.category else "") .. string.format("\n보유 %d장 · 덱 %d장", owned, want[id] or 0), 14, Color3.fromRGB(235, 220, 185))
	info.Size = UDim2.new(1, 0, 0, 40)
	info.TextXAlignment = Enum.TextXAlignment.Left
	info.ZIndex = 52
	local src = newLabel(right, Gallery.sourceText(ctx, id), 13, Color3.fromRGB(180, 200, 220))
	src.Size = UDim2.new(1, 0, 0, 52)
	src.TextXAlignment = Enum.TextXAlignment.Left
	src.TextYAlignment = Enum.TextYAlignment.Top
	src.ZIndex = 52
	local up = ctx.CB.upgradeInfo(book, id)
	if up and owned > 0 then
		local u = newLabel(right, string.format("강화 → %s: 같은 카드 %d장+1 보유, %d코인", ctx.CB.TIER_NAME[tier + 1], up.copies, up.coins), 13, Color3.fromRGB(240, 210, 130))
		u.Size = UDim2.new(1, 0, 0, 36)
		u.TextXAlignment = Enum.TextXAlignment.Left
		u.ZIndex = 52
	end
	if owned > 0 then
		local row = Instance.new("Frame")
		row.BackgroundTransparency = 1
		row.Size = UDim2.new(1, 0, 0, 40)
		row.ZIndex = 52
		row.Parent = right
		local rl = Instance.new("UIListLayout")
		rl.FillDirection = Enum.FillDirection.Horizontal
		rl.Padding = UDim.new(0, 6)
		rl.Parent = row
		local function btn(text, color, enabled, fn)
			local b = Instance.new("TextButton")
			b.Text = text
			b.Size = UDim2.new(0, 84, 1, 0)
			b.BackgroundColor3 = color
			b.BackgroundTransparency = if enabled then 0 else 0.6
			b.TextColor3 = Color3.fromRGB(250, 240, 215)
			b.Font = Enum.Font.GothamBold
			b.TextSize = 15
			b.BorderSizePixel = 0
			b.ZIndex = 53
			b.Parent = row
			corner(b, 6)
			if enabled then b.Activated:Connect(fn) end
		end
		btn("덱에 +", Color3.fromRGB(52, 120, 70), (want[id] or 0) < owned, function() Sfx.play("sfx_ui_confirm", 0.5, 1, "sfx_click") ctx.onWant(id, 1) showDetail(ctx, id) end)
		btn("덱에서 −", Color3.fromRGB(130, 58, 52), (want[id] or 0) > 0, function() Sfx.play("sfx_click", 0.5, 0.9) ctx.onWant(id, -1) showDetail(ctx, id) end)
		btn("강화", Color3.fromRGB(150, 118, 40), up ~= nil and owned >= up.copies + 1, function() Sfx.play("sfx_card_coin", 0.7, 1, "sfx_coin") ctx.onUpgrade(id) showDetail(ctx, nil) end)
	end
	local close = Instance.new("TextButton")
	close.Text = "✕"
	close.AnchorPoint = Vector2.new(1, 0)
	close.Position = UDim2.new(1, -8, 0, 8)
	close.Size = UDim2.fromOffset(30, 30)
	close.BackgroundTransparency = 1
	close.TextColor3 = Color3.fromRGB(250, 236, 200)
	close.TextSize = 20
	close.Font = Enum.Font.GothamBold
	close.ZIndex = 54
	close.Parent = card
	close.Activated:Connect(function() showDetail(ctx, nil) end)
end

-- parent 안에 [필터 줄 + 카드 격자]를 만든다. ctx 설명은 Game.client 의 호출부 참고.
function Gallery.build(parent, ctx, order)
	local book, want = ctx.getBook(), ctx.getWant()
	local box = Instance.new("Frame")
	box.BackgroundTransparency = 1
	box.Size = UDim2.new(1, -6, 0, 0)
	box.AutomaticSize = Enum.AutomaticSize.Y
	box.Parent = parent
	local bl = Instance.new("UIListLayout")
	bl.Padding = UDim.new(0, 6)
	bl.SortOrder = Enum.SortOrder.LayoutOrder
	bl.Parent = box

	-- 모은 정도
	local total, have = 0, 0
	for _, id in order do
		total += 1
		if (book.owned[id] or 0) > 0 then have += 1 end
	end
	local prog = newLabel(box, string.format("카드 수집 %d / %d", have, total), 16, Color3.fromRGB(246, 208, 130), true)
	prog.Size = UDim2.new(1, 0, 0, 22)
	prog.TextXAlignment = Enum.TextXAlignment.Left
	prog.LayoutOrder = 1

	-- 필터 칩
	local chips = Instance.new("ScrollingFrame")
	chips.BackgroundTransparency = 1
	chips.BorderSizePixel = 0
	chips.Size = UDim2.new(1, 0, 0, 38)
	chips.ScrollingDirection = Enum.ScrollingDirection.X
	chips.AutomaticCanvasSize = Enum.AutomaticSize.X
	chips.CanvasSize = UDim2.new()
	chips.ScrollBarThickness = 0
	chips.LayoutOrder = 2
	chips.Parent = box
	local cl = Instance.new("UIListLayout")
	cl.FillDirection = Enum.FillDirection.Horizontal
	cl.Padding = UDim.new(0, 5)
	cl.Parent = chips

	local grid = Instance.new("Frame")
	grid.BackgroundTransparency = 1
	grid.Size = UDim2.new(1, 0, 0, 0)
	grid.AutomaticSize = Enum.AutomaticSize.Y
	grid.LayoutOrder = 3
	grid.Parent = box
	local gl = Instance.new("UIGridLayout")
	gl.CellSize = UDim2.fromOffset(104, 146)
	gl.CellPadding = UDim2.fromOffset(8, 8)
	gl.SortOrder = Enum.SortOrder.LayoutOrder
	gl.Parent = grid

	local function rebuild()
		for _, ch in grid:GetChildren() do
			if not ch:IsA("UIGridLayout") then ch:Destroy() end
		end
		local shown, n = 0, 0
		for _, id in order do
			local d = ctx.CB.def(id)
			local owned = book.owned[id] or 0
			if d and inFilter(ctx, id, d, state.filter, owned) then
				n += 1
				if n <= state.page * PAGE then
					shown += 1
					local tier = book.tier[id] or 1
					local tile = Instance.new("TextButton")
					tile.Text = ""
					tile.AutoButtonColor = false
					tile.LayoutOrder = shown
					tile.BackgroundColor3 = if d.hero then Color3.fromRGB(107, 72, 40) else Color3.fromRGB(58, 44, 32)
					tile.BorderSizePixel = 0
					tile.Parent = grid
					corner(tile, 8)
					local st = Instance.new("UIStroke")
					st.Color = if owned > 0 then TIER_COLOR[tier] else Color3.fromRGB(80, 74, 70)
					st.Thickness = if owned > 0 and tier == 3 then 3 else 2
					st.Parent = tile
					local img = Instance.new("ImageLabel")
					img.Position = UDim2.fromOffset(4, 4)
					img.Size = UDim2.new(1, -8, 0.68, -4)
					img.BackgroundColor3 = Color3.fromRGB(88, 67, 46)
					img.ScaleType = Enum.ScaleType.Crop
					local key = ctx.artKey(d)
					img.Image = if ctx.AssetIds[key] then "rbxassetid://" .. tostring(ctx.AssetIds[key]) else ""
					img.ImageColor3 = if owned > 0 then Color3.new(1, 1, 1) else Color3.fromRGB(55, 55, 65) -- 못 얻은 카드는 어둡게
					img.Parent = tile
					corner(img, 6)
					local nm = newLabel(tile, if owned > 0 then d.name else "???", 13, Color3.fromRGB(255, 237, 188), true)
					nm.Position = UDim2.new(0, 3, 0.7, 0)
					nm.Size = UDim2.new(1, -6, 0.3, 0)
					nm.TextScaled = true
					local lim = Instance.new("UITextSizeConstraint")
					lim.MaxTextSize = 14
					lim.MinTextSize = 8
					lim.Parent = nm
					if owned > 0 then
						local badge = newLabel(tile, tostring(if ctx.BC.Specials[id] then "★" else d.power + tier - 1), 15, Color3.fromRGB(255, 232, 170), true)
						badge.Position = UDim2.fromOffset(6, 6)
						badge.Size = UDim2.fromOffset(26, 26)
						badge.BackgroundTransparency = 0
						badge.BackgroundColor3 = Color3.fromRGB(32, 24, 18)
						corner(badge, 13)
						local own = newLabel(tile, "×" .. owned, 12, Color3.fromRGB(250, 240, 215), true)
						own.AnchorPoint = Vector2.new(1, 0)
						own.Position = UDim2.new(1, -6, 0, 6)
						own.Size = UDim2.fromOffset(30, 20)
						own.BackgroundTransparency = 0.2
						own.BackgroundColor3 = Color3.fromRGB(32, 24, 18)
						corner(own, 6)
						if (want[id] or 0) > 0 then
							local dk = newLabel(tile, "덱 " .. want[id], 11, Color3.fromRGB(20, 40, 20), true)
							dk.AnchorPoint = Vector2.new(0, 1)
							dk.Position = UDim2.new(0, 6, 0.7, -4)
							dk.Size = UDim2.fromOffset(38, 18)
							dk.BackgroundTransparency = 0
							dk.BackgroundColor3 = Color3.fromRGB(150, 225, 150)
							corner(dk, 6)
						end
						if tier == 3 then -- 금 카드: 빛이 지나간다
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
					tile.Activated:Connect(function() Sfx.play("sfx_ui_select", 0.5, 1, "sfx_click") showDetail(ctx, id) end)
				end
			end
		end
		if n > state.page * PAGE then
			local more = Instance.new("TextButton")
			more.Text = string.format("더 보기 (%d장 더)", n - state.page * PAGE)
			more.LayoutOrder = 100000
			more.BackgroundColor3 = Color3.fromRGB(60, 80, 100)
			more.TextColor3 = Color3.fromRGB(250, 240, 215)
			more.Font = Enum.Font.GothamBold
			more.TextSize = 14
			more.BorderSizePixel = 0
			more.Parent = grid
			corner(more, 8)
			more.Activated:Connect(function() Sfx.play("sfx_card_page", 0.5, 1, "sfx_book_turn") state.page += 1 rebuild() end)
		elseif n == 0 then
			local e = newLabel(grid, "이 분류에는 아직 카드가 없어요", 14)
			e.Size = UDim2.fromOffset(300, 30)
		end
	end

	local chipBtns = {}
	local function paintChips()
		for fid, b in chipBtns do
			b.BackgroundColor3 = if fid == state.filter then Color3.fromRGB(214, 160, 70) else Color3.fromRGB(58, 52, 60)
		end
	end
	for i, f in FILTERS do
		local b = Instance.new("TextButton")
		b.Text = f.text
		b.Size = UDim2.new(0, 14 * #f.text / 3 + 52, 1, -4)
		b.LayoutOrder = i
		b.TextColor3 = Color3.fromRGB(250, 240, 215)
		b.Font = Enum.Font.GothamBold
		b.TextSize = 14
		b.BorderSizePixel = 0
		b.Parent = chips
		corner(b, 15)
		chipBtns[f.id] = b
		b.Activated:Connect(function()
			Sfx.play("sfx_card_page", 0.5, 1, "sfx_book_turn")
			state.filter, state.page = f.id, 1
			paintChips()
			rebuild()
		end)
	end
	paintChips()
	rebuild()
	return box
end

return Gallery
