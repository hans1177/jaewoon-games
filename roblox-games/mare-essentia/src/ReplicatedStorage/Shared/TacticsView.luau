--!nonstrict
-- 파일명: TacticsView.luau
-- 지상 탐험 턴제 전술 화면 (클라이언트 전용). 파이어 엠블럼처럼 격자 위에서 유닛을 눌러 이동·공격·대기한다.
-- 판정은 전부 서버가 한다. 이 화면은 같은 규칙(Tactics)으로 이동 범위·사거리·예상 피해를 미리 보여 주고,
-- 행동은 invoke("TacticsAct", ...)로 서버에 요청한 뒤 돌려받은 전투 상태로 다시 그린다.

local Players = game:GetService("Players")

local Rules = require(script.Parent:WaitForChild("Tactics"))
local Data = require(script.Parent:WaitForChild("TacticsData"))

local TacticsView = {}

local TILE_COLOR = {
	["."] = Color3.fromRGB(104, 138, 82), f = Color3.fromRGB(58, 100, 62), h = Color3.fromRGB(140, 126, 86),
	s = Color3.fromRGB(206, 190, 140), w = Color3.fromRGB(96, 150, 186), ["~"] = Color3.fromRGB(86, 110, 80),
	r = Color3.fromRGB(150, 146, 134), ["+"] = Color3.fromRGB(190, 170, 96), x = Color3.fromRGB(104, 138, 82),
	G = Color3.fromRGB(104, 138, 82), ["#"] = Color3.fromRGB(70, 66, 62), W = Color3.fromRGB(40, 78, 124),
	m = Color3.fromRGB(96, 88, 80), l = Color3.fromRGB(88, 62, 52),
}
local TILE_MARK = { f = "숲", h = "언덕", w = "물", ["~"] = "늪", r = "터", ["+"] = "진지", ["#"] = "", W = "" }
local TEXT = Color3.fromRGB(246, 238, 220)
local COVER = Color3.fromRGB(26, 34, 40)
local LEATHER = Color3.fromRGB(56, 43, 35)
local PAPER = Color3.fromRGB(237, 222, 188)
local INK = Color3.fromRGB(51, 37, 25)
local BRASS = Color3.fromRGB(158, 113, 59)
local PLAYER_COLOR = Color3.fromRGB(70, 120, 200)
local ENEMY_COLOR = Color3.fromRGB(190, 70, 64)

local function make(class, props, parent)
	local o = Instance.new(class)
	for k, v in props do
		o[k] = v
	end
	o.Parent = parent
	return o
end

local function label(parent, text, size, color, pos, sz, align)
	return make("TextLabel", {
		BackgroundTransparency = 1, Text = text, TextSize = size, TextColor3 = color or TEXT, Font = Enum.Font.GothamMedium,
		Position = pos, Size = sz, TextWrapped = true, TextXAlignment = align or Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top,
	}, parent)
end

local function button(parent, text, color, pos, sz, onClick)
	local b = make("TextButton", {
		Text = text, TextSize = 15, TextColor3 = TEXT, Font = Enum.Font.GothamBold, BackgroundColor3 = color, AutoButtonColor = true,
		Position = pos, Size = sz, BorderSizePixel = 0,
	}, parent)
	make("UICorner", { CornerRadius = UDim.new(0, 6) }, b)
	make("UIStroke", { ApplyStrokeMode = Enum.ApplyStrokeMode.Border, Color = BRASS }, b)
	b.Activated:Connect(onClick)
	return b
end

-- opts: { battle = 전투 상태, invoke = function(action, payload) -> 결과표, onClose = function() }
function TacticsView.open(opts)
	local battle = opts.battle
	local invoke = opts.invoke
	local gui = make("ScreenGui", { Name = "TacticsView", ResetOnSpawn = false, IgnoreGuiInset = true, DisplayOrder = 80, ZIndexBehavior = Enum.ZIndexBehavior.Sibling }, Players.LocalPlayer:WaitForChild("PlayerGui"))
	local root = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = COVER, BorderSizePixel = 0 }, gui)

	local topBar = make("Frame", { Size = UDim2.new(1, 0, 0, 44), BackgroundColor3 = PAPER, BorderSizePixel = 0 }, root)
	local title = label(topBar, "", 16, INK, UDim2.fromOffset(12, 5), UDim2.new(1, -24, 0, 34))
	title.TextYAlignment = Enum.TextYAlignment.Center
	make("UIStroke", { ApplyStrokeMode = Enum.ApplyStrokeMode.Border, Color = BRASS }, topBar)

	local screenH = gui.AbsoluteSize.Y > 0 and gui.AbsoluteSize.Y or 600
	local bottomH = if screenH < 560 then 112 else 150
	local handH = if battle.hand then (if screenH < 560 then 60 else 74) else 0
	local boardHolder = make("Frame", { Position = UDim2.fromOffset(0, 44), Size = UDim2.new(1, 0, 1, -44 - bottomH - handH), BackgroundTransparency = 1, ClipsDescendants = true }, root)
	local bottom = make("Frame", { AnchorPoint = Vector2.new(0, 1), Position = UDim2.fromScale(0, 1), Size = UDim2.new(1, 0, 0, bottomH), BackgroundColor3 = LEATHER, BorderSizePixel = 0 }, root)
	local info = label(bottom, "", 14, TEXT, UDim2.fromOffset(10, 6), UDim2.new(0.58, -14, 1, -12))
	local logLabel = label(bottom, "", 13, Color3.fromRGB(190, 182, 160), UDim2.new(0.58, 0, 0, 6), UDim2.new(0.42, -10, 0, 74))
	local btnRow = make("Frame", { AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -10, 1, -8), Size = UDim2.new(0.42, -10, 0, math.min(64, bottomH - 16)), BackgroundTransparency = 1 }, bottom)
	make("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), HorizontalAlignment = Enum.HorizontalAlignment.Right, VerticalAlignment = Enum.VerticalAlignment.Center }, btnRow)

	local handBar = make("ScrollingFrame", { AnchorPoint = Vector2.new(0, 1), Position = UDim2.new(0, 0, 1, -bottomH), Size = UDim2.new(1, 0, 0, handH), BackgroundColor3 = Color3.fromRGB(40, 32, 27), BorderSizePixel = 0, ScrollBarThickness = 0, CanvasSize = UDim2.new(0, 0, 0, 0), AutomaticCanvasSize = Enum.AutomaticSize.X, ScrollingDirection = Enum.ScrollingDirection.X, Visible = handH > 0 }, root)
	make("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), VerticalAlignment = Enum.VerticalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }, handBar)
	make("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8) }, handBar)
	local cardSel = nil -- 고른 손패 번호
	local selected = nil -- 고른 내 유닛 id
	local pending = nil -- { x, y }: 이동하기로 정한 칸
	local aimId = nil -- 공격(치료)하려고 고른 대상 id
	local notice = ""
	local busy = false
	local tiles, unitViews = {}, {}
	local rebuild

	local function closeAll()
		gui:Destroy()
		if opts.onClose then
			opts.onClose()
		end
	end

	local function unitById(id)
		return id and Rules.getUnit(battle, id) or nil
	end

	local lastSend = 0
	local function send(action, payload)
		-- 같은 버튼이 연달아 눌려도 한 번만 보낸다. 서버가 "너무 빨라요"로 거절하면 잠깐 뒤 한 번 더 보낸다.
		if busy or os.clock() - lastSend < 0.3 then
			return
		end
		busy = true
		lastSend = os.clock()
		local result = invoke(action, payload)
		if type(result) == "table" and result.ok == false and result.message == "너무 빨라요" then
			task.wait(0.4)
			result = invoke(action, payload)
		end
		busy = false
		lastSend = os.clock()
		if type(result) == "table" then
			local v = result.view and result.view.tactics
			if v then
				battle = v
			end
			notice = result.message or ""
		end
		selected, pending, aimId, cardSel = nil, nil, nil, nil
		rebuild()
	end

	local function clearBoard()
		-- 이전에 그린 것이 하나도 남지 않게 판 전체를 비운다
		boardHolder:ClearAllChildren()
		tiles, unitViews = {}, {}
	end

	local function drawInfo()
		local lines = {}
		local u = unitById(aimId) or unitById(selected)
		local sel = unitById(selected)
		if u then
			local c = Data.Classes[u.class]
			local sk = {}
			for _, s in u.skills do
				table.insert(sk, (Data.Skills[s] and Data.Skills[s].name) or s)
			end
			table.insert(lines, string.format("%s  [%s] Lv.%d  HP %d/%d", u.name, c and c.name or u.class, u.level, u.hp, u.maxHp))
			table.insert(lines, string.format("공격 %d · 방어 %d · 속도 %d · 이동 %d · 사거리 %d-%d", u.atk, u.def, u.spd, u.move, u.rangeMin, u.rangeMax))
			if #sk > 0 then
				table.insert(lines, "스킬: " .. table.concat(sk, ", "))
			end
			if sel and aimId and unitById(aimId) and not sel.heal then
				local t = unitById(aimId)
				local from = pending or { x = sel.x, y = sel.y }
				local ox, oy, om = sel.x, sel.y, sel.movedDist
				sel.x, sel.y = from.x, from.y
				sel.movedDist = (Rules.reachable(battle, sel)[from.x .. "," .. from.y]) or 0
				local dmg = Rules.damage(battle, sel, t, false)
				local dd = math.abs(from.x - t.x) + math.abs(from.y - t.y)
				local back = ""
				if t.hp > dmg and dd >= t.rangeMin and dd <= t.rangeMax and not t.heal then
					back = string.format(" / 반격 %d", Rules.damage(battle, t, sel, true))
				end
				sel.x, sel.y, sel.movedDist = ox, oy, om
				table.insert(lines, string.format("예상 피해 %d%s", dmg, back))
			end
		else
			table.insert(lines, "내 유닛을 눌러 고르세요. 파란 칸으로 이동하고, 빨간 칸의 적을 공격해요.")
			table.insert(lines, "‘?’ 칸에서 대기하면 도감 카드를 찾을 수 있어요.")
		end
		info.Text = table.concat(lines, "\n")
		-- 최근 기록
		local recent = {}
		for i = math.max(1, #battle.log - 3), #battle.log do
			table.insert(recent, battle.log[i])
		end
		logLabel.Text = (if notice ~= "" then notice .. "\n" else "") .. table.concat(recent, "\n")
	end

	local function drawHand()
		for _, c in handBar:GetChildren() do
			if c:IsA("GuiObject") then
				c:Destroy()
			end
		end
		if not battle.hand or battle.status ~= "active" then
			return
		end
		local en = make("TextLabel", { BackgroundTransparency = 1, Size = UDim2.fromOffset(46, handH - 14), Text = string.format("에너지\n%d/%d", battle.energy or 0, Rules.ENERGY), TextSize = 14, TextColor3 = Color3.fromRGB(255, 226, 120), Font = Enum.Font.GothamBold, LayoutOrder = 0 }, handBar)
		en.TextWrapped = true
		for i, id in battle.hand do
			local fx = Rules.cardFx(id, battle.tiers and battle.tiers[id])
			if fx then
				local usable = (battle.energy or 0) >= fx.cost and battle.phase == "player"
				local chosen = cardSel == i
				local c = make("TextButton", {
					Size = UDim2.fromOffset(104, handH - 12), LayoutOrder = i, AutoButtonColor = true, BorderSizePixel = 0,
					BackgroundColor3 = if chosen then Color3.fromRGB(226, 190, 100) else PAPER, BackgroundTransparency = if usable then 0 else 0.45,
					Text = string.format("%s  (%d)\n%s", fx.name, fx.cost, fx.text), TextSize = 12, TextWrapped = true, TextColor3 = INK, Font = Enum.Font.GothamMedium,
				}, handBar)
				make("UICorner", { CornerRadius = UDim.new(0, 6) }, c)
				make("UIStroke", { ApplyStrokeMode = Enum.ApplyStrokeMode.Border, Color = if chosen then Color3.fromRGB(255, 226, 120) else BRASS, Thickness = 2 }, c)
				c.Activated:Connect(function()
					if not usable or busy then
						return
					end
					if fx.target == "none" then
						cardSel = nil
						send("TacticsCard", { index = i })
					else
						cardSel = if chosen then nil else i
						notice = if cardSel then (if fx.target == "ally" then "카드를 쓸 아군을 누르세요" else "카드를 쓸 적을 누르세요") else ""
						rebuild()
					end
				end)
			end
		end
	end

	local function drawButtons()
		for _, c in btnRow:GetChildren() do
			if c:IsA("TextButton") then
				c:Destroy()
			end
		end
		local sel = unitById(selected)
		local sz = UDim2.new(0, 70, 0, math.min(52, bottomH - 24))
		if battle.status ~= "active" then
			return
		end
		if sel and not sel.acted then
			if aimId then
				button(btnRow, if sel.heal then "치료!" else "공격!", Color3.fromRGB(144, 63, 48), UDim2.new(), sz, function()
					local from = pending or { x = sel.x, y = sel.y }
					send("TacticsAct", { unitId = sel.id, kind = if sel.heal then "heal" else "attack", x = from.x, y = from.y, targetId = aimId })
				end)
			end
			button(btnRow, "대기", Color3.fromRGB(50, 83, 106), UDim2.new(), sz, function()
				local from = pending or { x = sel.x, y = sel.y }
				send("TacticsAct", { unitId = sel.id, kind = "wait", x = from.x, y = from.y })
			end)
			button(btnRow, "취소", Color3.fromRGB(83, 74, 62), UDim2.new(), sz, function()
				selected, pending, aimId = nil, nil, nil
				rebuild()
			end)
		else
			button(btnRow, "턴 종료", Color3.fromRGB(66, 116, 93), UDim2.new(), sz, function()
				send("TacticsEnd", {})
			end)
			button(btnRow, "후퇴", Color3.fromRGB(83, 74, 62), UDim2.new(), sz, function()
				send("TacticsLeave", {})
				closeAll()
			end)
		end
	end

	local function drawResult()
		if battle.status == "active" then
			return
		end
		local won = battle.status == "won"
		local oldShade = root:FindFirstChild("ResultShade")
		if oldShade then
			oldShade:Destroy()
		end
		local shade = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, BorderSizePixel = 0, ZIndex = 20, Name = "ResultShade" }, root)
		local card = make("Frame", { AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.new(0.86, 0, 0, 230), BackgroundColor3 = COVER, BorderSizePixel = 0, ZIndex = 21 }, shade)
		make("UICorner", { CornerRadius = UDim.new(0, 12) }, card)
		local head = label(card, if won then "승리!" else "패배…", 26, if won then Color3.fromRGB(226, 176, 78) else Color3.fromRGB(190, 70, 64), UDim2.fromOffset(16, 12), UDim2.new(1, -32, 0, 36))
		head.ZIndex = 22
		local body = label(card, notice, 14, TEXT, UDim2.fromOffset(16, 54), UDim2.new(1, -32, 0, 110))
		body.ZIndex = 22
		local b = button(card, "닫기", Color3.fromRGB(66, 116, 93), UDim2.new(0.5, -60, 1, -56), UDim2.fromOffset(120, 44), function()
			send("TacticsLeave", {})
			closeAll()
		end)
		b.ZIndex = 22
	end

	local building, again = false, false
	rebuild = function()
		-- 그리는 도중에 다시 불리면(화면 크기 변경 등) 끝난 뒤 한 번만 다시 그린다
		if building then
			again = true
			return
		end
		building = true
		clearBoard()
		local W, H = boardHolder.AbsoluteSize.X, boardHolder.AbsoluteSize.Y
		if W < 10 or H < 10 then
			W, H = 360, 360
		end
		local ts = math.max(20, math.floor(math.min((W - 8) / battle.w, (H - 8) / battle.h)))
		local ox = math.floor((W - ts * battle.w) / 2)
		local oy = math.floor((H - ts * battle.h) / 2)
		title.Text = string.format("%s — %s   |   %s   |   %d/%d턴 (%s)", battle.siteName or "", battle.name, (Data.Objectives[battle.objective] or {}).name or "", math.min(battle.turn, battle.turnLimit), battle.turnLimit, if battle.phase == "player" then "내 턴" else "적 턴")

		local sel = unitById(selected)
		local moveSet, aimSet = {}, {}
		if sel and not sel.acted and battle.status == "active" then
			moveSet = Rules.reachable(battle, sel)
			local from = pending or { x = sel.x, y = sel.y }
			for _, o in Rules.targetsFrom(battle, sel, from.x, from.y) do
				aimSet[o.x .. "," .. o.y] = o.id
			end
		end

		for y = 1, battle.h do
			for x = 1, battle.w do
				local ch = string.sub(battle.tiles[y], x, x)
				local k = x .. "," .. y
				local color = TILE_COLOR[ch] or Color3.fromRGB(100, 100, 100)
				local mark = TILE_MARK[ch] or ""
				if ch == "x" and not battle.searched[k] then
					mark = "?"
				elseif ch == "G" then
					mark = "★"
				end
				if moveSet[k] and not aimSet[k] then
					color = color:Lerp(Color3.fromRGB(70, 140, 255), 0.55)
				end
				if pending and pending.x == x and pending.y == y then
					color = Color3.fromRGB(110, 190, 255)
				end
				if aimSet[k] then
					color = color:Lerp(Color3.fromRGB(255, 70, 60), 0.6)
				end
				local t = make("TextButton", {
					Position = UDim2.fromOffset(ox + (x - 1) * ts, oy + (y - 1) * ts), Size = UDim2.fromOffset(ts - 1, ts - 1),
					BackgroundColor3 = color, BorderSizePixel = 0, Text = mark, TextSize = math.max(10, math.floor(ts * 0.34)),
					TextColor3 = if mark == "?" or mark == "★" then Color3.fromRGB(255, 226, 120) else Color3.fromRGB(230, 226, 210), Font = Enum.Font.GothamBold, AutoButtonColor = false,
				}, boardHolder)
				table.insert(tiles, t)
				t.Activated:Connect(function()
					if battle.status ~= "active" or battle.phase ~= "player" or busy then
						return
					end
					local occ = Rules.unitAt(battle, x, y)
					if sel and not sel.acted then
						if aimSet[k] then
							aimId = aimSet[k]
							rebuild()
							return
						end
						if moveSet[k] and (not occ or occ == sel) then
							pending = { x = x, y = y }
							aimId = nil
							rebuild()
							return
						end
					end
					if occ and occ.team == "player" and not occ.acted then
						selected, pending, aimId = occ.id, nil, nil
					elseif occ then
						aimId = nil
						notice = string.format("%s: 공격 %d · 방어 %d · HP %d/%d", occ.name, occ.atk, occ.def, occ.hp, occ.maxHp)
					else
						selected, pending, aimId = nil, nil, nil
					end
					rebuild()
				end)
			end
		end

		for _, u in battle.units do
			if u.hp > 0 then
				local px, py = u.x, u.y
				if sel and u == sel and pending then
					px, py = pending.x, pending.y
				end
				local c = Data.Classes[u.class]
				local isPlayer = u.team == "player"
				local d = ts - 6
				local b = make("TextButton", {
					Position = UDim2.fromOffset(ox + (px - 1) * ts + 2, oy + (py - 1) * ts + 2), Size = UDim2.fromOffset(d, d),
					BackgroundColor3 = if isPlayer then PLAYER_COLOR else ENEMY_COLOR, BackgroundTransparency = if isPlayer and u.acted then 0.55 else 0,
					Text = string.sub(c and c.name or "?", 1, 3), TextSize = math.max(10, math.floor(ts * 0.36)), TextColor3 = TEXT, Font = Enum.Font.GothamBold, BorderSizePixel = 0, ZIndex = 5, AutoButtonColor = false,
				}, boardHolder)
				make("UICorner", { CornerRadius = UDim.new(1, 0) }, b)
				if u.boss or u.lead or u.id == selected then
					make("UIStroke", { Color = if u.id == selected then Color3.fromRGB(255, 255, 255) else Color3.fromRGB(226, 176, 78), Thickness = 2 }, b)
				end
				local bar = make("Frame", { Position = UDim2.new(0, 0, 1, -4), Size = UDim2.new(1, 0, 0, 4), BackgroundColor3 = Color3.fromRGB(30, 30, 30), BorderSizePixel = 0, ZIndex = 6 }, b)
				make("Frame", { Size = UDim2.new(math.clamp(u.hp / u.maxHp, 0, 1), 0, 1, 0), BackgroundColor3 = if u.hp / u.maxHp > 0.4 then Color3.fromRGB(90, 200, 100) else Color3.fromRGB(230, 110, 70), BorderSizePixel = 0, ZIndex = 7 }, bar)
				table.insert(unitViews, b)
				b.Activated:Connect(function()
					if battle.status ~= "active" or battle.phase ~= "player" or busy then
						return
					end
					if cardSel then
						local idx = cardSel
						cardSel = nil
						send("TacticsCard", { index = idx, targetId = u.id })
						return
					end
					local selNow = unitById(selected)
					if selNow and not selNow.acted then
						local key = u.x .. "," .. u.y
						if aimSet[key] then
							aimId = aimSet[key]
							rebuild()
							return
						end
					end
					if isPlayer and not u.acted then
						selected, pending, aimId = u.id, nil, nil
					else
						aimId = nil
						notice = string.format("%s: 공격 %d · 방어 %d · HP %d/%d", u.name, u.atk, u.def, u.hp, u.maxHp)
					end
					rebuild()
				end)
			end
		end

		drawInfo()
		drawHand()
		drawButtons()
		drawResult()
		building = false
		if again then
			again = false
			rebuild()
		end
	end

	boardHolder:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
		if gui.Parent then
			rebuild()
		end
	end)
	notice = battle.intro or ""
	rebuild()
	return gui
end

return TacticsView
