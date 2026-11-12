--!nonstrict
-- 해전 연출 (클라이언트 전용). 서버가 자동 해전을 계산한 뒤 돌려준 전투 기록(log)을
-- 두 배의 포격·접현 장면으로 다시 보여 준다. 결과는 서버가 이미 정했고, 이 장면은 보기용이다.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Sfx = require(script.Parent:WaitForChild("Sfx"))

local NavalBattle = {}

local ORIGIN = Vector3.new(6000, 0, 0)

local PLAYER_SHIP = {
	caravel = "ship-small", fluyt = "ship-medium", frigate = "ship-large", galleon = "ship-pirate-large",
	paddle_steamer = "ship-medium", ironclad_frigate = "ship-large",
}

local function part(parent, size, cf, color, material, shape)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	if shape then
		p.Shape = shape
	end
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

local function placeShip(parent, asset, at, length, yaw, tint)
	local lib = ReplicatedStorage:FindFirstChild("MareAssets")
	local group = lib and lib:FindFirstChild("Naval")
	local tpl = group and group:FindFirstChild(asset)
	if tpl and tpl:IsA("Model") then
		local m = tpl:Clone()
		for _, d in m:GetDescendants() do
			if d:IsA("BasePart") then
				d.Anchored = true
				d.CanCollide = false
				d.CanQuery = false
				if tint and d:IsA("MeshPart") then
					d.Color = tint
				end
			end
		end
		m.Parent = parent
		local ok = pcall(function()
			local _, ext = m:GetBoundingBox()
			local axis = math.max(ext.X, ext.Z)
			m:ScaleTo(length / math.max(axis, 0.01))
			local _, size = m:GetBoundingBox()
			-- 긴 쪽이 X축(옆면이 카메라를 향함)이 되도록 맞춘다
			if size.Z > size.X then
				m:PivotTo(CFrame.Angles(0, math.pi / 2, 0) * m:GetPivot())
			end
			m:PivotTo(CFrame.Angles(0, yaw, 0) * m:GetPivot())
			local center, sz = m:GetBoundingBox()
			local bottom = Vector3.new(center.Position.X, center.Position.Y - sz.Y / 2, center.Position.Z)
			m:PivotTo(CFrame.new(at - bottom) * m:GetPivot())
		end)
		if ok then
			return m
		end
		m:Destroy()
	end
	-- 모델이 없으면 간단한 도형 배
	local m = Instance.new("Model")
	part(m, Vector3.new(length, 4, 9), CFrame.new(at + Vector3.new(0, 2, 0)), Color3.fromRGB(110, 70, 40), Enum.Material.Wood)
	part(m, Vector3.new(1, 22, 1), CFrame.new(at + Vector3.new(0, 14, 0)), Color3.fromRGB(90, 64, 40), Enum.Material.Wood)
	part(m, Vector3.new(0.4, 14, 14), CFrame.new(at + Vector3.new(0, 15, 0)), Color3.fromRGB(240, 236, 226), Enum.Material.Fabric)
	m.Parent = parent
	return m
end

local function label(parent, text, size, color, bold)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Text = text
	l.TextSize = size
	l.Font = if bold == false then Enum.Font.Gotham else Enum.Font.GothamBold
	l.TextColor3 = color or Color3.fromRGB(250, 236, 200)
	l.TextStrokeTransparency = 0.45
	l.Parent = parent
	return l
end

-- 전투 기록을 장면 단위 사건으로 풀어 낸다
local function parseLog(log)
	local events = {}
	for _, line in log do
		local round, who, text = string.match(line, "^%[(%d+)%] (.-): (.+)$")
		if who then
			local hull = tonumber(string.match(text, "선체 %-(%d+)"))
			local crew = tonumber(string.match(text, "선원 %-(%d+)"))
			local melee = string.find(text, "적 선원", 1, true) ~= nil
			table.insert(events, { kind = if melee then "melee" else "fire", player = who == "우리 배", hull = hull or 0, crew = crew or 0, text = line })
		elseif string.find(line, "접현", 1, true) then
			table.insert(events, { kind = "board", text = line })
		elseif string.find(line, "항복", 1, true) or string.find(line, "이탈", 1, true) then
			table.insert(events, { kind = "note", text = line })
		else
			table.insert(events, { kind = "note", text = line })
		end
	end
	return events
end

-- opts: { shipId, enemyName, log, winner, reason, isBoss, onDone }
-- 직접 조종하는 해전: 왼쪽·오른쪽으로 배를 돌리고 가속하면, 사정거리 안에서 대포가 자동으로 나간다.
-- 맞는 순서와 피해량은 서버가 계산한 전투 기록을 따르므로 결과는 서버 판정과 같다.
function NavalBattle.play(opts)
	local player = Players.LocalPlayer
	local old = workspace:FindFirstChild("BattleScene")
	if old then
		old:Destroy()
	end
	local folder = Instance.new("Folder")
	folder.Name = "BattleScene"
	folder.Parent = workspace

	-- 해전 전용 파도·바람·폭풍 환경음. 포격을 가리지 않도록 배경 음량을 낮춘다.
	local weather = string.lower(tostring(opts.weatherName or ""))
	local roughSeas = string.find(weather, "폭풍", 1, true) ~= nil
		or string.find(weather, "태풍", 1, true) ~= nil
		or string.find(weather, "폭우", 1, true) ~= nil
		or string.find(weather, "storm", 1, true) ~= nil
		or string.find(weather, "squall", 1, true) ~= nil
	Sfx.ambient(if roughSeas then { "sfx_ambience_storm", "sfx_waves" } else { "sfx_waves", "sfx_wind" }, 0.55)

	local sea = part(folder, Vector3.new(1200, 2, 1200), CFrame.new(ORIGIN + Vector3.new(0, -1, 0)), Color3.fromRGB(34, 112, 156), Enum.Material.Glass)
	sea.Transparency = 0.15
	sea.Reflectance = 0.08

	-- 배들: 위치, 방향(θ), 속도를 우리가 직접 움직인다
	local function newShip(asset, length, pos, theta, tint)
		local m = placeShip(folder, asset, ORIGIN + pos, length, 0, tint)
		local base = m:GetPivot()
		local rot = base - base.Position
		return { model = m, pos = pos, theta = theta, speed = 0, rot = rot, y = base.Position.Y - ORIGIN.Y, length = length }
	end
	local me = newShip(PLAYER_SHIP[opts.shipId] or "ship-medium", 40, Vector3.new(-45, 0, 30), 0)
	local foe = newShip(if opts.isBoss then "ship-pirate-large" else "ship-pirate-medium", if opts.isBoss then 54 else 40, Vector3.new(45, 0, -30), math.pi)
	-- 해적 호위선: 연출용 (싸움 결과에는 영향 없음)
	local escorts = {}
	local escortCount = if opts.isBoss then 0 else 2
	for i = 1, escortCount do
		local e = newShip("ship-pirate-small", 28, Vector3.new(80 + i * 40, 0, -70 + i * 80), math.pi + (i - 1.5) * 0.4)
		e.speed = 5
		table.insert(escorts, e)
	end

	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	cam.FieldOfView = 62

	local gui = Instance.new("ScreenGui")
	gui.Name = "BattleGui"
	gui.ResetOnSpawn = false
	gui.DisplayOrder = 30
	gui.Parent = player:WaitForChild("PlayerGui")

	local function bar(side, name)
		local back = Instance.new("Frame")
		back.AnchorPoint = Vector2.new(if side == "L" then 0 else 1, 0)
		back.Position = UDim2.new(if side == "L" then 0 else 1, if side == "L" then 16 else -16, 0, 62)
		back.Size = UDim2.fromOffset(230, 16)
		back.BackgroundColor3 = Color3.fromRGB(14, 24, 38)
		back.BorderSizePixel = 0
		back.Parent = gui
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 8)
		c.Parent = back
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 1.5
		st.Parent = back
		local fill = Instance.new("Frame")
		fill.Size = UDim2.fromScale(1, 1)
		fill.BackgroundColor3 = if side == "L" then Color3.fromRGB(91, 181, 120) else Color3.fromRGB(214, 82, 76)
		fill.BorderSizePixel = 0
		fill.Parent = back
		local c2 = Instance.new("UICorner")
		c2.CornerRadius = UDim.new(0, 8)
		c2.Parent = fill
		local nm = label(gui, name, 14)
		nm.AnchorPoint = Vector2.new(if side == "L" then 0 else 1, 0)
		nm.Position = UDim2.new(if side == "L" then 0 else 1, if side == "L" then 16 else -16, 0, 40)
		nm.Size = UDim2.fromOffset(230, 20)
		nm.TextXAlignment = if side == "L" then Enum.TextXAlignment.Left else Enum.TextXAlignment.Right
		return fill
	end
	local meFill = bar("L", "우리 배")
	local foeFill = bar("R", opts.enemyName or "해적선")

	-- 선단 카드: 대항해시대 온라인처럼 우리 배와 적 배를 카드로 늘어놓고, 배마다 선체 막대를 보여 준다
	local function cardRow(anchorX, posX, posY, color)
		local row = Instance.new("Frame")
		row.AnchorPoint = Vector2.new(anchorX, 0)
		row.Position = UDim2.new(posX, 0, 0, posY)
		row.Size = UDim2.fromOffset(0, 46)
		row.AutomaticSize = Enum.AutomaticSize.X
		row.BackgroundTransparency = 1
		row.Parent = gui
		local l = Instance.new("UIListLayout")
		l.FillDirection = Enum.FillDirection.Horizontal
		l.Padding = UDim.new(0, 6)
		l.HorizontalAlignment = if anchorX == 1 then Enum.HorizontalAlignment.Right else Enum.HorizontalAlignment.Left
		l.Parent = row
		return row
	end
	local function card(row, name, color, star)
		local f = Instance.new("Frame")
		f.Size = UDim2.fromOffset(if star then 96 else 82, 46)
		f.BackgroundColor3 = Color3.fromRGB(14, 24, 38)
		f.BackgroundTransparency = 0.15
		f.BorderSizePixel = 0
		f.Parent = row
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 8)
		c.Parent = f
		local st = Instance.new("UIStroke")
		st.Color = if star then Color3.fromRGB(240, 205, 120) else Color3.fromRGB(110, 120, 140)
		st.Thickness = if star then 2 else 1
		st.Parent = f
		local nm = label(f, (if star then "★ " else "") .. name, 12, Color3.fromRGB(250, 236, 200))
		nm.Position = UDim2.fromOffset(4, 3)
		nm.Size = UDim2.new(1, -8, 0, 16)
		local back = Instance.new("Frame")
		back.Position = UDim2.new(0, 6, 0, 28)
		back.Size = UDim2.new(1, -12, 0, 8)
		back.BackgroundColor3 = Color3.fromRGB(40, 48, 62)
		back.BorderSizePixel = 0
		back.Parent = f
		local bc = Instance.new("UICorner")
		bc.CornerRadius = UDim.new(0, 4)
		bc.Parent = back
		local fill = Instance.new("Frame")
		fill.Size = UDim2.fromScale(1, 1)
		fill.BackgroundColor3 = color
		fill.BorderSizePixel = 0
		fill.Parent = back
		local fc = Instance.new("UICorner")
		fc.CornerRadius = UDim.new(0, 4)
		fc.Parent = fill
		return { frame = f, fill = fill, name = nm, color = color }
	end
	local myCards, foeCards = {}, {}
	do
		local mine = cardRow(0, 0, 112)
		table.insert(myCards, { c = card(mine, opts.shipName or "기함", Color3.fromRGB(91, 181, 120), true), share = 1 })
		for _, f in opts.fleet or {} do
			table.insert(myCards, { c = card(mine, f, Color3.fromRGB(91, 181, 120), false), share = 0.5 })
		end
		local theirs = cardRow(1, 1, 112)
		table.insert(foeCards, { c = card(theirs, opts.enemyName or "해적선", Color3.fromRGB(214, 82, 76), true), share = 1 })
		for i = 1, if opts.isBoss then 0 else 2 do
			table.insert(foeCards, { c = card(theirs, "호위선", Color3.fromRGB(214, 120, 76), false), share = 0.4 })
		end
	end
	-- 바람 표시: 날씨와 바람 세기를 위쪽 가운데에 보여 준다
	do
		local wind = Instance.new("Frame")
		wind.AnchorPoint = Vector2.new(0.5, 0)
		wind.Position = UDim2.new(0.5, 0, 0, 24)
		wind.Size = UDim2.fromOffset(190, 34)
		wind.BackgroundColor3 = Color3.fromRGB(14, 24, 38)
		wind.BackgroundTransparency = 0.15
		wind.BorderSizePixel = 0
		wind.Parent = gui
		local wc = Instance.new("UICorner")
		wc.CornerRadius = UDim.new(0, 8)
		wc.Parent = wind
		local arrow = label(wind, "➤", 22, Color3.fromRGB(150, 220, 255))
		arrow.Position = UDim2.fromOffset(6, 3)
		arrow.Size = UDim2.fromOffset(28, 28)
		arrow.Rotation = opts.windAngle or 0
		local wl = label(wind, string.format("%s · 바람 %d%%", opts.weatherName or "맑음", math.floor((opts.wind or 1) * 100 + 0.5)), 14, Color3.fromRGB(250, 236, 200))
		wl.Position = UDim2.fromOffset(38, 6)
		wl.Size = UDim2.new(1, -44, 0, 22)
		wl.TextXAlignment = Enum.TextXAlignment.Left
	end

	-- 돛 조종: 바람을 등지면 빠르고 맞바람이면 느리다 (바람 방향은 화살표와 같다)
	local windRad = math.rad(opts.windAngle or 0)
	local windPower = math.clamp(opts.wind or 1, 0.4, 1.6)
	local function windFactor(theta)
		-- 배의 진행 방향과 바람이 불어가는 방향이 같으면 +1(순풍), 반대면 -1(맞바람)
		local c = math.cos(theta - windRad)
		return 1 + c * 0.32 * windPower
	end
	local sailLabel = label(gui, "", 14, Color3.fromRGB(150, 220, 255))
	sailLabel.AnchorPoint = Vector2.new(0.5, 0)
	sailLabel.Position = UDim2.new(0.5, 0, 0, 62)
	sailLabel.Size = UDim2.fromOffset(190, 20)
	-- 기동 점수: 포탄 낙하 경고를 피하면 올라간다 (결과와는 별개로 명성 보너스만 준다)
	local flair, combo, dodged = 0, 0, 0
	local comboLabel = label(gui, "", 22, Color3.fromRGB(255, 226, 120))
	comboLabel.AnchorPoint = Vector2.new(0.5, 0)
	comboLabel.Position = UDim2.new(0.5, 0, 0, 200)
	comboLabel.Size = UDim2.fromOffset(300, 30)

	local subtitle = label(gui, "", 16)
	subtitle.AnchorPoint = Vector2.new(0.5, 1)
	subtitle.Position = UDim2.new(0.5, 0, 1, -76)
	subtitle.Size = UDim2.new(0.7, 0, 0, 40)
	subtitle.TextWrapped = true

	local hint = label(gui, "가까이 가면 대포가 자동으로 나가고, 배가 맞닿으면 백병전! 해역 가장자리까지 달리면 도망칠 수 있어요.", 14, Color3.fromRGB(255, 226, 170))
	hint.AnchorPoint = Vector2.new(0.5, 0)
	hint.Position = UDim2.new(0.5, 0, 0, 164)
	hint.Size = UDim2.new(0.8, 0, 0, 36)
	hint.TextWrapped = true

	local banner = label(gui, "", 44)
	banner.AnchorPoint = Vector2.new(0.5, 0.5)
	banner.Position = UDim2.fromScale(0.5, 0.4)
	banner.Size = UDim2.fromOffset(400, 70)
	banner.TextTransparency = 1
	banner.TextStrokeTransparency = 1

	local finished = false
	local conns = {}
	-- 모바일: 기본 이동 스틱/점프 버튼이 조종 버튼을 가리므로 해전 중에는 끈다
	local controls = nil
	pcall(function()
		controls = require(player:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule")):GetControls()
		controls:Disable()
	end)
	local function finish()
		if finished then
			return
		end
		finished = true
		if controls then
			pcall(function()
				controls:Enable()
			end)
		end
		for _, c in conns do
			c:Disconnect()
		end
		gui:Destroy()
		folder:Destroy()
		if opts.onDone then
			opts.onDone(math.floor(flair))
		end
	end

	local function mkBtn(text, pos, size, anchor)
		local b = Instance.new("TextButton")
		b.Text = text
		b.AnchorPoint = anchor or Vector2.new(0, 1)
		b.Position = pos
		b.Size = size
		b.BackgroundColor3 = Color3.fromRGB(28, 46, 70)
		b.TextColor3 = Color3.fromRGB(250, 236, 200)
		b.Font = Enum.Font.GothamBold
		b.TextSize = 26
		b.BorderSizePixel = 0
		b.Parent = gui
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 14)
		c.Parent = b
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 2
		st.Parent = b
		return b
	end
	local steerDir, throttle = 0, 1
	local speedBtn = mkBtn("가속", UDim2.new(1, -24, 1, -24), UDim2.fromOffset(120, 70), Vector2.new(1, 1))
	speedBtn.TextSize = 18
	local skip = mkBtn("건너뛰기", UDim2.new(0.5, 0, 0, 62), UDim2.fromOffset(96, 30), Vector2.new(0.5, 0))
	skip.TextSize = 14
	skip.Activated:Connect(finish)
	-- 가상 스틱: 좌우 = 방향 전환, 위/아래 = 속도 (모바일 중심)
	local stickBase = Instance.new("Frame")
	stickBase.AnchorPoint = Vector2.new(0, 1)
	stickBase.Position = UDim2.new(0, 28, 1, -28)
	stickBase.Size = UDim2.fromOffset(170, 170)
	stickBase.BackgroundColor3 = Color3.fromRGB(20, 34, 54)
	stickBase.BackgroundTransparency = 0.35
	stickBase.BorderSizePixel = 0
	stickBase.Parent = gui
	do
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(1, 0)
		c.Parent = stickBase
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 2
		st.Parent = stickBase
	end
	local knob = Instance.new("Frame")
	knob.AnchorPoint = Vector2.new(0.5, 0.5)
	knob.Position = UDim2.fromScale(0.5, 0.5)
	knob.Size = UDim2.fromOffset(72, 72)
	knob.BackgroundColor3 = Color3.fromRGB(240, 205, 120)
	knob.BorderSizePixel = 0
	knob.Parent = stickBase
	do
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(1, 0)
		c.Parent = knob
	end
	local stickTouch = nil
	local stickThrottle = nil
	local function stickUpdate(pos)
		local center = stickBase.AbsolutePosition + stickBase.AbsoluteSize / 2
		local d = Vector2.new(pos.X, pos.Y) - center
		local r = stickBase.AbsoluteSize.X / 2
		if d.Magnitude > r then
			d = d.Unit * r
		end
		knob.Position = UDim2.new(0.5, d.X, 0.5, d.Y)
		local nx, ny = d.X / r, -d.Y / r
		steerDir = if math.abs(nx) < 0.12 then 0 else -nx
		stickThrottle = math.clamp(0.6 + ny * 0.5, 0.1, 1)
	end
	local function stickRelease()
		stickTouch = nil
		stickThrottle = nil
		steerDir = 0
		knob.Position = UDim2.fromScale(0.5, 0.5)
	end
	stickBase.InputBegan:Connect(function(i)
		if i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseButton1 then
			stickTouch = i
			stickUpdate(i.Position)
		end
	end)
	table.insert(conns, game:GetService("UserInputService").InputChanged:Connect(function(i)
		if stickTouch and (i == stickTouch or (stickTouch.UserInputType == Enum.UserInputType.MouseButton1 and i.UserInputType == Enum.UserInputType.MouseMovement)) then
			stickUpdate(i.Position)
		end
	end))
	table.insert(conns, game:GetService("UserInputService").InputEnded:Connect(function(i)
		if stickTouch and (i == stickTouch or i.UserInputType == Enum.UserInputType.MouseButton1) then
			stickRelease()
		end
	end))
	speedBtn.Activated:Connect(function()
		throttle = if throttle >= 1 then 0.45 elseif throttle > 0.4 then 0 else 1
		speedBtn.Text = if throttle >= 1 then "가속" elseif throttle > 0.4 then "순항" else "정지"
	end)
	-- 키보드(PC): A/D 또는 방향키
	local UIS = game:GetService("UserInputService")
	table.insert(conns, UIS.InputBegan:Connect(function(i, gp)
		if gp then
			return
		end
		if i.KeyCode == Enum.KeyCode.A or i.KeyCode == Enum.KeyCode.Left then
			steerDir = 1
		elseif i.KeyCode == Enum.KeyCode.D or i.KeyCode == Enum.KeyCode.Right then
			steerDir = -1
		end
	end))
	table.insert(conns, UIS.InputEnded:Connect(function(i)
		if i.KeyCode == Enum.KeyCode.A or i.KeyCode == Enum.KeyCode.Left or i.KeyCode == Enum.KeyCode.D or i.KeyCode == Enum.KeyCode.Right then
			steerDir = 0
		end
	end))

	-- 전투 기록: 서로 순서대로 맞는 포격 큐와 마무리 백병전 큐
	local events = parseLog(opts.log or {})
	local meQueue, foeQueue, meleeQueue = {}, {}, {}
	local dmgToMe, dmgToFoe = 0, 0
	for _, e in events do
		if e.kind == "fire" then
			if e.player then
				table.insert(meQueue, e)
				dmgToFoe += e.hull
			else
				table.insert(foeQueue, e)
				dmgToMe += e.hull
			end
		elseif e.kind == "melee" then
			table.insert(meleeQueue, e)
		end
	end
	local meEnd, foeEnd = 1, 1
	if opts.winner == "a" then
		foeEnd = 0
		meEnd = math.clamp(1 - dmgToMe / math.max(1, dmgToMe + dmgToFoe * 0.6), 0.2, 1)
	elseif opts.winner == "b" then
		meEnd = 0
		foeEnd = math.clamp(1 - dmgToFoe / math.max(1, dmgToFoe + dmgToMe * 0.6), 0.2, 1)
	else
		meEnd, foeEnd = 0.45, 0.45
	end
	local meHp, foeHp = 1, 1
	local meDone, foeDone = 0, 0 -- 소비한 포격 수

	local function applyHit(toPlayer, e)
		if toPlayer then
			meDone += 1
			meHp = math.clamp(1 - (1 - meEnd) * (meDone / math.max(1, #foeQueue)), meEnd, 1)
		else
			foeDone += 1
			foeHp = math.clamp(1 - (1 - foeEnd) * (foeDone / math.max(1, #meQueue)), foeEnd, 1)
		end
		subtitle.Text = e.text
	end

	local shake = 0
	-- 접현 카드 전투: 배가 맞닿으면 화면이 카드판으로 바뀐다. 규칙은 BoardingCards (3줄 × 3판 2선승, 병종 상성).
	-- 전투 결과 자체는 서버 판정 그대로이고, 카드전의 승패는 기동 점수(명성 보너스)에만 반영된다.
	local BC = require(script.Parent:WaitForChild("BoardingCards"))
	local boardingOn = false
	local ROW_ICON = { melee = "⚔", ranged = "🔫", cannon = "💣" }
	local function startBoarding(onEnd)
		boardingOn = true
		local TweenService = game:GetService("TweenService")
		local rng = function()
			return math.random()
		end
		local myDeck, myLeader = BC.playerDeck(opts.deck and opts.deck.cards, rng)
		local foeDeck, foeLeader = BC.enemyDeck(opts.isBoss == true, rng)
		local m = BC.newMatch(myDeck, myLeader, foeDeck, foeLeader, rng)

		local g = Instance.new("ScreenGui")
		g.Name = "BoardingGui"
		g.ResetOnSpawn = false
		g.DisplayOrder = 40
		g.Parent = player:WaitForChild("PlayerGui")
		table.insert(conns, { Disconnect = function()
			if g.Parent then
				g:Destroy()
			end
		end })
		local bg = Instance.new("Frame")
		bg.Size = UDim2.fromScale(1, 1)
		bg.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
		bg.BorderSizePixel = 0
		bg.Parent = g
		TweenService:Create(bg, TweenInfo.new(0.6), { BackgroundColor3 = Color3.fromRGB(26, 20, 16) }):Play()

		local header = label(g, "", 18, Color3.fromRGB(246, 208, 130))
		header.Position = UDim2.fromScale(0.02, 0.01)
		header.Size = UDim2.fromScale(0.7, 0.07)
		header.TextXAlignment = Enum.TextXAlignment.Left
		local info = label(g, "", 15, Color3.fromRGB(250, 236, 200))
		info.Position = UDim2.fromScale(0.02, 0.08)
		info.Size = UDim2.fromScale(0.96, 0.05)
		info.TextXAlignment = Enum.TextXAlignment.Left
		info.TextTruncate = Enum.TextTruncate.AtEnd

		local boardFrame = Instance.new("Frame")
		boardFrame.Position = UDim2.fromScale(0.02, 0.14)
		boardFrame.Size = UDim2.fromScale(0.96, 0.56)
		boardFrame.BackgroundTransparency = 1
		boardFrame.Parent = g
		local handFrame = Instance.new("Frame")
		handFrame.Position = UDim2.fromScale(0.02, 0.72)
		handFrame.Size = UDim2.fromScale(0.74, 0.26)
		handFrame.BackgroundTransparency = 1
		handFrame.Parent = g
		local handLay = Instance.new("UIListLayout")
		handLay.FillDirection = Enum.FillDirection.Horizontal
		handLay.Padding = UDim.new(0, 5)
		handLay.Parent = handFrame

		local function mkSide(text, y, color, onClick)
			local b = Instance.new("TextButton")
			b.Text = text
			b.Position = UDim2.fromScale(0.78, y)
			b.Size = UDim2.fromScale(0.2, 0.075)
			b.BackgroundColor3 = color
			b.TextColor3 = Color3.fromRGB(250, 236, 200)
			b.Font = Enum.Font.GothamBold
			b.TextScaled = true
			b.BorderSizePixel = 0
			b.Parent = g
			local c = Instance.new("UICorner")
			c.CornerRadius = UDim.new(0, 10)
			c.Parent = b
			b.Activated:Connect(onClick)
			return b
		end

		local render
		local auto = false
		local function afterAction(ok, msg, res)
			if not ok then
				info.Text = msg or ""
				return
			end
			info.Text = msg or ""
			if res then
				info.Text = string.format("%d판 결과 — 우리 %d : 해적 %d  %s", res.round, res.me, res.foe, if res.winner == "me" then "(우리가 이겼다!)" elseif res.winner == "foe" then "(해적이 이겼다)" else "(무승부)")
				Sfx.play(if res.winner == "me" then "sfx_fanfare" else "sfx_hit", 0.6, 1)
				Sfx.play("sfx_metal_clash", 0.7, 1)
			else
				Sfx.play("sfx_boarding_draw", 0.7, 1) -- 카드를 내는 손짓(칼 뽑는 소리)
			end
			render()
		end
		local passBtn = mkSide("멈추기", 0.72, Color3.fromRGB(100, 54, 44), function()
			if m.turn == "me" and not m.over then
				afterAction(BC.pass(m, "me"))
			end
		end)
		local leaderBtn = mkSide("지도자 능력", 0.81, Color3.fromRGB(70, 56, 90), function()
			if m.turn == "me" and not m.over then
				afterAction(BC.useLeader(m, "me"))
			end
		end)
		mkSide("자동 진행", 0.9, Color3.fromRGB(44, 64, 78), function()
			auto = true
		end)

		local function chip(parent, c, w, h, power)
			local f = Instance.new("TextLabel")
			f.Size = UDim2.new(0, w, 1, 0)
			f.BackgroundColor3 = if c.hero then Color3.fromRGB(120, 90, 30) elseif c.special then Color3.fromRGB(70, 56, 90) else Color3.fromRGB(58, 44, 34)
			f.TextColor3 = Color3.fromRGB(250, 236, 200)
			f.Font = Enum.Font.GothamBold
			f.TextScaled = true
			f.BorderSizePixel = 0
			f.Text = string.format("%s\n%s", c.name, tostring(power or c.power or ""))
			f.Parent = parent
			local cc = Instance.new("UICorner")
			cc.CornerRadius = UDim.new(0, 6)
			cc.Parent = f
			return f
		end
		local ABIL = { bond = "결속", morale = "사기", spy = "첩자", medic = "치료" }

		render = function()
			for _, ch in boardFrame:GetChildren() do
				ch:Destroy()
			end
			for _, ch in handFrame:GetChildren() do
				if ch:IsA("TextButton") then
					ch:Destroy()
				end
			end
			local weather = {}
			for _, row in BC.ROWS do
				if m.weather[row] then
					table.insert(weather, BC.ROW_NAME[row] .. " 약화")
				end
			end
			header.Text = string.format("⚔ 접현 카드전  %d판   우리 %s  해적 %s   점수 %d : %d   %s   손패 %d / 해적 %d   %s",
				m.round, string.rep("●", m.wins.me) .. string.rep("○", 2 - math.min(2, m.wins.me)), string.rep("●", m.wins.foe) .. string.rep("○", 2 - math.min(2, m.wins.foe)),
				BC.total(m, "me"), BC.total(m, "foe"), if #weather > 0 then "🌫 " .. table.concat(weather, ", ") else "", #m.hand.me, #m.hand.foe,
				if m.turn == "me" and not m.over then "▶ 내 차례" else "해적 차례")
			-- 줄: 위 3줄은 해적(포·사격·근접), 아래 3줄은 우리(근접·사격·포)
			local order = { { "foe", "cannon" }, { "foe", "ranged" }, { "foe", "melee" }, { "me", "melee" }, { "me", "ranged" }, { "me", "cannon" } }
			for k, o in order do
				local side, row = o[1], o[2]
				local rf = Instance.new("Frame")
				rf.Position = UDim2.fromScale(0, (k - 1) / 6)
				rf.Size = UDim2.fromScale(1, 1 / 6 - 0.012)
				rf.BackgroundColor3 = if side == "me" then Color3.fromRGB(34, 44, 34) else Color3.fromRGB(48, 30, 28)
				rf.BorderSizePixel = 0
				rf.Parent = boardFrame
				local mult, adv, dis = BC.rowMatchup(m, side, row)
				local tag = label(rf, string.format("%s %s\n%d%s", ROW_ICON[row], BC.ROW_NAME[row], BC.rowTotal(m, side, row), if adv and dis then " ▲▼" elseif adv then " ▲상성" elseif dis then " ▼불리" else ""), 13, Color3.fromRGB(246, 208, 130))
				tag.Position = UDim2.fromOffset(4, 0)
				tag.Size = UDim2.new(0, 96, 1, 0)
				tag.TextXAlignment = Enum.TextXAlignment.Left
				tag.TextColor3 = if adv and not dis then Color3.fromRGB(150, 235, 150) elseif dis and not adv then Color3.fromRGB(240, 150, 130) else Color3.fromRGB(246, 208, 130)
				local cards = Instance.new("Frame")
				cards.Position = UDim2.fromOffset(104, 3)
				cards.Size = UDim2.new(1, -108, 1, -6)
				cards.BackgroundTransparency = 1
				cards.Parent = rf
				local lay = Instance.new("UIListLayout")
				lay.FillDirection = Enum.FillDirection.Horizontal
				lay.Padding = UDim.new(0, 4)
				lay.Parent = cards
				for idx, c in m.rows[side][row] do
					chip(cards, c, 62, 0, BC.cardPower(m, side, row, idx))
				end
			end
			-- 손패
			for i, c in m.hand.me do
				local b = Instance.new("TextButton")
				b.Size = UDim2.new(0, 84, 1, 0)
				b.BackgroundColor3 = if c.hero then Color3.fromRGB(120, 90, 30) elseif c.special then Color3.fromRGB(70, 56, 90) else Color3.fromRGB(58, 44, 34)
				b.TextColor3 = Color3.fromRGB(250, 236, 200)
				b.Font = Enum.Font.GothamBold
				b.TextScaled = true
				b.BorderSizePixel = 0
				b.BackgroundTransparency = if m.turn == "me" then 0 else 0.5
				local sub = if c.special then c.text else string.format("%s %s%s", ROW_ICON[c.row], BC.ROW_NAME[c.row], if c.ability then " · " .. (ABIL[c.ability] or "") else "")
				b.Text = string.format("%s\n%s\n%s", c.name, tostring(c.power or "✦"), sub)
				b.Parent = handFrame
				local cc = Instance.new("UICorner")
				cc.CornerRadius = UDim.new(0, 8)
				cc.Parent = b
				b.Activated:Connect(function()
					if m.turn == "me" and not m.over then
						afterAction(BC.play(m, "me", i))
					end
				end)
			end
			passBtn.BackgroundTransparency = if m.turn == "me" then 0 else 0.5
			leaderBtn.Text = if m.leaderUsed.me then "지도자 (사용함)" else "지도자: " .. BC.Leaders[m.leader.me].name
			leaderBtn.BackgroundTransparency = if m.leaderUsed.me then 0.6 else 0
		end
		render()
		info.Text = string.format("병종 상성 — 근접 > 포 > 사격 > 근접. 지도자: %s (%s)", BC.Leaders[m.leader.me].name, BC.Leaders[m.leader.me].text)

		task.spawn(function()
			task.wait(1.0)
			local guard = 0
			while not m.over and not finished and guard < 600 do
				guard += 1
				if m.turn == "foe" then
					task.wait(0.9)
					local ok, msg, res = BC.ai(m, "foe")
					if ok then
						afterAction(ok, "해적: " .. (msg or ""), res)
					end
				elseif auto then
					task.wait(0.5)
					local ok, msg, res = BC.ai(m, "me")
					if ok then
						afterAction(ok, msg, res)
					end
				else
					task.wait(0.1)
				end
			end
			if finished then
				return
			end
			local wonMatch = m.winner == "me"
			flair += m.wins.me * 40 + (if wonMatch then 110 else 0)
			info.Text = if wonMatch then "갑판을 제압했다!" elseif m.winner == "foe" then "갑판에서 밀렸다..." else "승부가 나지 않았다."
			task.wait(1.8)
			TweenService:Create(bg, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
			task.wait(0.5)
			g:Destroy()
			boardingOn = false
			onEnd()
		end)
	end

	-- 적 포탄 낙하 경고: 바다 위 붉은 원. 포탄이 떨어질 때 원 밖에 있으면 "회피"로 콤보가 쌓인다.
	local function warnRing(center)
		local ring = part(folder, Vector3.new(0.4, 26, 26), CFrame.new(ORIGIN + center + Vector3.new(0, 0.6, 0)) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(235, 60, 50), Enum.Material.Neon, Enum.PartType.Cylinder)
		ring.Transparency = 0.45
		local t0 = os.clock()
		local conn
		conn = RunService.Heartbeat:Connect(function()
			local k = (os.clock() - t0) / 0.9
			if k >= 1 or finished then
				conn:Disconnect()
				ring:Destroy()
				return
			end
			ring.Transparency = 0.45 + k * 0.5
			ring.Size = Vector3.new(0.4, 26 - k * 8, 26 - k * 8)
		end)
		task.delay(0.9, function()
			if finished then
				return
			end
			if (me.pos - center).Magnitude > 20 then
				dodged += 1
				combo += 1
				flair += 10 + combo * 2
				comboLabel.Text = string.format("회피! 콤보 x%d", combo)
				Sfx.play("sfx_click", 0.6, 1.2 + combo * 0.05)
				task.delay(1.2, function()
					if comboLabel.Text:sub(1, 6) == "회피!" then
						comboLabel.Text = ""
					end
				end)
			else
				combo = 0
				comboLabel.Text = ""
			end
		end)
	end
	-- 대포 한 발
	local function shoot(fromPos, toPos, fx)
		local from = ORIGIN + fromPos + Vector3.new(0, 8, 0)
		-- 서버 기록의 확정 타격만 선체에 맞히고, 나머지 포탄은 수면에 떨어뜨린다.
		local hullHit = fx ~= nil
		local to = ORIGIN + toPos + Vector3.new(
			(math.random() - 0.5) * 10,
			if hullHit then 6 + math.random() * 3 else 0.4,
			(math.random() - 0.5) * 6
		)
		Sfx.play("sfx_cannon", 0.82, 0.92 + math.random() * 0.16)
		if hullHit then
			task.delay(0.9, function()
				if not finished then
					Sfx.play("sfx_cannon_reload", 0.34, 0.95 + math.random() * 0.1)
				end
			end)
		end
		local flash = part(folder, Vector3.new(3, 3, 3), CFrame.new(from), Color3.fromRGB(255, 200, 90), Enum.Material.Neon, Enum.PartType.Ball)
		task.delay(0.15, function()
			flash:Destroy()
		end)
		local ball = part(folder, Vector3.new(1.5, 1.5, 1.5), CFrame.new(from), Color3.fromRGB(30, 30, 34), Enum.Material.Metal, Enum.PartType.Ball)
		local t0 = os.clock()
		local dur = 0.5
		local conn
		conn = RunService.Heartbeat:Connect(function()
			local u = math.clamp((os.clock() - t0) / dur, 0, 1)
			ball.CFrame = CFrame.new(from:Lerp(to, u) + Vector3.new(0, math.sin(u * math.pi) * 14, 0))
			if u >= 1 then
				conn:Disconnect()
				ball:Destroy()
				if finished then
					return
				end
				-- 착탄과 물보라를 실제 포탄 충돌 프레임에 맞춰 별도 재생한다.
				if hullHit then
					Sfx.play("sfx_hit", 0.78, 0.88 + math.random() * 0.2)
					if math.random() < 0.4 then
						Sfx.play("sfx_creak", 0.3, 0.85 + math.random() * 0.18)
					end
				else
					Sfx.play("sfx_splash", 0.55, 0.9 + math.random() * 0.22)
				end
				local boom = part(folder, Vector3.new(2, 2, 2), CFrame.new(to),
					if hullHit then Color3.fromRGB(255, 150, 60) else Color3.fromRGB(150, 225, 245),
					Enum.Material.Neon, Enum.PartType.Ball)
				local smoke = part(folder, Vector3.new(2, 2, 2), CFrame.new(to + Vector3.new(0, 1, 0)),
					if hullHit then Color3.fromRGB(90, 90, 96) else Color3.fromRGB(205, 232, 240),
					Enum.Material.SmoothPlastic, Enum.PartType.Ball)
				smoke.Transparency = if hullHit then 0.3 else 0.52
				local s0 = os.clock()
				local c2
				c2 = RunService.Heartbeat:Connect(function()
					local k = (os.clock() - s0) / 1.0
					if k >= 1 or finished then
						c2:Disconnect()
						boom:Destroy()
						smoke:Destroy()
						return
					end
					boom.Size = Vector3.new(1, 1, 1) * (2 + k * 8)
					boom.Transparency = k
					smoke.Size = Vector3.new(1, 1, 1) * (3 + k * 10)
					smoke.Position = to + Vector3.new(0, 1 + k * 6, 0)
					smoke.Transparency = 0.3 + k * 0.7
				end)
				if fx then
					fx()
				end
			end
		end)
	end

	local function forward(theta)
		return Vector3.new(math.cos(theta), 0, math.sin(theta))
	end
	local function poseShip(sh, t, extra)
		local bob = CFrame.new(0, math.sin(t * 1.3 + sh.length) * 0.5, 0) * CFrame.Angles(0, 0, math.sin(t * 0.9 + sh.length) * 0.03)
		local cf = CFrame.new(ORIGIN + Vector3.new(sh.pos.X, sh.y, sh.pos.Z)) * CFrame.Angles(0, -sh.theta, 0) * bob * sh.rot
		if extra then
			cf = extra * cf
		end
		sh.model:PivotTo(cf)
	end

	local function steerToward(sh, targetTheta, dt, rate)
		local diff = (targetTheta - sh.theta + math.pi) % (math.pi * 2) - math.pi
		sh.theta += math.clamp(diff, -rate * dt, rate * dt)
	end

	local sinkStart = nil
	local loser = if opts.winner == "a" then "foe" elseif opts.winner == "b" then "me" else nil
	local phase = "duel" -- duel → board → end (도주 중엔 fleeing)
	local fleeProgress, fleeTried = 0, false
	local nextMeFire, nextFoeFire = os.clock() + 0.9, os.clock() + 1.7
	local boardStart = nil
	local endAt = nil
	local melIdx = 0
	local lastT = os.clock()
	local escortFire = os.clock() + 3
	local nextHullSound = os.clock() + 5

	table.insert(conns, RunService.Heartbeat:Connect(function()
		if finished then
			return
		end
		local now = os.clock()
		local dt = math.min(now - lastT, 0.1)
		lastT = now

		if phase == "duel" or phase == "board" then
			-- 우리 배: 방향키로 돌리고 가속 설정만큼 앞으로
			me.theta += steerDir * 1.5 * dt
			-- 조종 보조: 스틱을 놓고 있으면 적선에 옆면(포 방향)을 자동으로 맞춘다
			if steerDir == 0 and phase == "duel" then
				local dv = foe.pos - me.pos
				if dv.Magnitude < 110 then
					local ang = math.atan2(dv.Z, dv.X)
					local a1, a2 = ang + math.pi / 2, ang - math.pi / 2
					local function gap(t)
						return math.abs((t - me.theta + math.pi) % (math.pi * 2) - math.pi)
					end
					steerToward(me, if gap(a1) < gap(a2) then a1 else a2, dt, 0.8)
				end
			end
			local wf = windFactor(me.theta)
			me.speed = 19 * (stickThrottle or throttle) * wf
			sailLabel.Text = if wf > 1.12 then "⛵ 순풍 — 속도 증가" elseif wf < 0.88 then "⛵ 맞바람 — 속도 감소" else "⛵ 옆바람"
			sailLabel.TextColor3 = if wf > 1.12 then Color3.fromRGB(130, 235, 150) elseif wf < 0.88 then Color3.fromRGB(240, 150, 130) else Color3.fromRGB(150, 220, 255)
			me.pos += forward(me.theta) * me.speed * dt

			-- 적선: 우리 배와 거리를 유지하며 옆면을 대려고 맴돈다
			local toMe = me.pos - foe.pos
			local dist = toMe.Magnitude
			local bearing = math.atan2(toMe.Z, toMe.X)
			local want = bearing + (if dist > 55 then 0.15 elseif dist < 32 then -1.9 else 1.45)
			steerToward(foe, want, dt, 1.1)
			foe.speed = (if dist > 55 then 17 else 11) * windFactor(foe.theta)
			foe.pos += forward(foe.theta) * foe.speed * dt
			if phase == "board" then
				-- 접현: 서로 가까이 붙는다
				foe.pos = foe.pos:Lerp(me.pos + Vector3.new(0, 0, -16), dt * 1.6)
			end
			-- 함선이 파도를 가르는 목재·돛천 소리: 5~9초에 한 번만 재생한다.
			if now >= nextHullSound then
				nextHullSound = now + 5 + math.random() * 4
				if me.speed > 5 then
					Sfx.play(if math.random() < 0.7 then "sfx_creak" else "sfx_sail_fabric",
						0.24, 0.88 + math.random() * 0.16)
				end
			end
			-- 경계 밖으로 나가지 않게 가운데로 되돌린다
			for _, sh in (if opts.canFlee and not fleeTried then { foe } else { me, foe }) do
				if sh.pos.Magnitude > 260 then
					steerToward(sh, math.atan2(-sh.pos.Z, -sh.pos.X), dt, 1.5)
				end
			end

			-- 도주: 해역 가장자리 밖으로 몇 초 버티면 도망 시도 (서버가 성공 여부를 판정)
			if phase == "duel" and opts.canFlee and not fleeTried then
				if me.pos.Magnitude > 230 then
					fleeProgress += dt
					hint.Text = string.format("도주 중... %d%%", math.floor(math.min(1, fleeProgress / 2.5) * 100))
					if fleeProgress >= 2.5 then
						fleeTried = true
						phase = "fleeing"
						subtitle.Text = "돛을 올리고 전속력으로 도주한다!"
						task.spawn(function()
							local ok = opts.onFlee and opts.onFlee()
							if finished then
								return
							end
							if ok then
								phase = "end"
								endAt = os.clock()
								banner.Text = "도망 성공!"
								banner.TextColor3 = Color3.fromRGB(150, 220, 255)
								banner.TextTransparency = 0
								banner.TextStrokeTransparency = 0.3
								subtitle.Text = ""
							else
								subtitle.Text = "도망 실패! 해적이 따라붙었다"
								me.pos = me.pos * 0.35
								phase = "duel"
								hint.Text = ""
							end
						end)
					end
				else
					fleeProgress = math.max(0, fleeProgress - dt * 2)
					if fleeProgress == 0 and hint.Text:sub(1, 3) == "도주" then
						hint.Text = ""
					end
				end
			end
			if phase == "duel" then
				local d = (foe.pos - me.pos).Magnitude
				-- 자동 포격: 사정거리 안이면 쿨타임마다 한 발씩 기록을 소비한다
				if d < 95 and now >= nextMeFire and meDone + 0 < #meQueue and foeDone + meDone >= 0 then
					nextMeFire = now + 1.15
					local idx = #meQueue - (#meQueue - (meDone - (0)) ) -- 순서대로
					local e = meQueue[math.min(foeDone, #meQueue) + 0 > 0 and (foeDone + 0 == 0 and 1 or foeDone) or 1]
					e = meQueue[math.min(#meQueue, (foeDone + 1))]
					local volley = math.clamp(math.floor((e and e.hull or 8) / 8) + 1, 1, 4)
					for k = 0, volley - 1 do
						task.delay(k * 0.08, function()
							if not finished then
								shoot(me.pos, foe.pos, if k == volley - 1 then function()
									shake = 1.2
									applyHit(false, e)
								end else nil)
							end
						end)
					end
				end
				if d < 95 and now >= nextFoeFire and meDone < #foeQueue then
					nextFoeFire = now + 1.45
					warnRing(me.pos + forward(me.theta) * me.speed * 0.9)
					local e = foeQueue[math.min(#foeQueue, meDone + 1)]
					local volley = math.clamp(math.floor((e and e.hull or 8) / 8) + 1, 1, 4)
					for k = 0, volley - 1 do
						task.delay(k * 0.08, function()
							if not finished then
								shoot(foe.pos, me.pos, if k == volley - 1 then function()
									shake = 1.6
									applyHit(true, e)
								end else nil)
							end
						end)
					end
				end
				-- 두 배가 맞닿으면 바로 접현 (백병전)
				if d < 30 or (foeDone >= #meQueue and meDone >= #foeQueue) then
					phase = "board"
					boardStart = now
					hint.Text = ""
					subtitle.Text = "두 배가 접현했다! 백병전!"
					shake = 2.2
					if #meleeQueue > 0 then
						task.delay(1.2, function()
							if not finished and phase == "board" and not boardingOn then
								startBoarding(function()
									melIdx = #meleeQueue
									boardStart = os.clock() - 100
								end)
							end
						end)
					end
					Sfx.play("sfx_horn")
					Sfx.play("sfx_boarding_slash", 0.9, 1)
					Sfx.play("sfx_creak", 0.9, 0.8)
					Sfx.play("sfx_hit", 1, 0.7)
				end
			else
				-- 백병전: 남은 기록을 차례로 보여 준다
				if boardingOn then
					-- 카드 대결 장면이 진행 중이다
				elseif now - boardStart > 0.7 + melIdx * 0.55 and melIdx < #meleeQueue and #meleeQueue == 0 then
					melIdx += 1
					local e = meleeQueue[melIdx]
					shake = 1.4
					-- 칼날 부딪히는 소리: 효과음 한 가지를 높낮이를 바꿔 겹쳐 백병전 소리로 쓴다
					Sfx.play("sfx_hit", 0.9, 1.25 + math.random() * 0.35)
					task.delay(0.14, function()
						if not finished then
							Sfx.play("sfx_hit", 0.7, 1.55 + math.random() * 0.4)
						end
					end)
					if melIdx % 2 == 0 then
						Sfx.play("sfx_creak", 0.5, 1.2)
					end
					subtitle.Text = e.text
					if e.player then
						foeHp = math.max(foeEnd, foeHp - 0.05)
					else
						meHp = math.max(meEnd, meHp - 0.05)
					end
				end
				if melIdx >= #meleeQueue and now - boardStart > 1.6 + #meleeQueue * 0.55 then
					phase = "end"
					endAt = now
					meHp, foeHp = meEnd, foeEnd
					if loser then
						sinkStart = now
						-- 침몰 장면의 목재 울림과 큰 물보라를 한 번만 재생한다.
						Sfx.play("sfx_creak", 0.6, 0.74)
						Sfx.play("sfx_splash", 0.62, 0.8)
					end
					banner.Text = if opts.winner == "a" then "승리!" elseif opts.winner == "b" then "패배..." else "물러났다"
					banner.TextColor3 = if opts.winner == "a" then Color3.fromRGB(255, 214, 120) elseif opts.winner == "b" then Color3.fromRGB(230, 110, 100) else Color3.fromRGB(220, 220, 230)
					banner.TextTransparency = 0
					banner.TextStrokeTransparency = 0.3
					subtitle.Text = ""
				end
			end
		elseif phase == "end" then
			if now - endAt > 2.4 then
				finish()
				return
			end
		end

		-- 호위선: 적 주변을 돌며 가끔 대포를 쏜다 (연출)
		for i, e in escorts do
			local center = foe.pos + Vector3.new(math.cos(now * 0.2 + i * 2.4) * 80, 0, math.sin(now * 0.2 + i * 2.4) * 80)
			steerToward(e, math.atan2(center.Z - e.pos.Z, center.X - e.pos.X), dt, 0.5)
			e.pos += forward(e.theta) * 6 * dt
		end
		if now >= escortFire and #escorts > 0 and phase == "duel" then
			escortFire = now + 2.8
			local e = escorts[math.random(1, #escorts)]
			if (e.pos - me.pos).Magnitude < 150 then
				shoot(e.pos, me.pos + Vector3.new((math.random() - 0.5) * 60, 0, (math.random() - 0.5) * 60), nil)
			end
		end

		-- 배 그리기 (침몰 연출 포함)
		local meExtra, foeExtra
		if sinkStart then
			local k = math.clamp((now - sinkStart) / 2.2, 0, 1)
			local sink = CFrame.new(0, -k * 12, 0) * CFrame.Angles(0, 0, (if loser == "me" then -1 else 1) * k * 0.5)
			if loser == "me" then
				meExtra = sink
			else
				foeExtra = sink
			end
		end
		poseShip(me, now, meExtra)
		poseShip(foe, now, foeExtra)
		for _, e in escorts do
			poseShip(e, now, nil)
		end
		meFill.Size = UDim2.fromScale(meHp, 1)
		foeFill.Size = UDim2.fromScale(foeHp, 1)
		-- 배 카드: 기함은 전체 막대를, 선단 배는 피해의 절반만 받은 것으로 보여 준다
		for _, mc in myCards do
			local v = 1 - (1 - meHp) * mc.share
			mc.c.fill.Size = UDim2.fromScale(math.clamp(v, 0, 1), 1)
			mc.c.fill.BackgroundColor3 = if v < 0.35 then Color3.fromRGB(214, 82, 76) else mc.c.color
			if loser == "me" and sinkStart and mc.share == 1 then
				mc.c.frame.BackgroundTransparency = 0.6
			end
		end
		for _, fc in foeCards do
			local v = 1 - (1 - foeHp) * fc.share
			fc.c.fill.Size = UDim2.fromScale(math.clamp(v, 0, 1), 1)
			if loser == "foe" and sinkStart and fc.share == 1 then
				fc.c.frame.BackgroundTransparency = 0.6
			end
		end

		-- 카메라: 우리 배 뒤쪽 위에서 따라간다
		shake = math.max(0, shake - 0.06)
		local killZoom = if sinkStart then -math.clamp((now - sinkStart) / 1.2, 0, 1) * 10 else 0
		cam.FieldOfView = 62 + math.min(shake, 2.5) * 2.2 + (me.speed / 19) * 6 + killZoom
		local f = forward(me.theta)
		local focus = ORIGIN + me.pos + (foe.pos - me.pos) * 0.35
		local camPos = ORIGIN + me.pos - f * 52 + Vector3.new(0, 30, 0)
		cam.CFrame = CFrame.lookAt(camPos + Vector3.new((math.random() - 0.5) * shake, (math.random() - 0.5) * shake, 0), focus + Vector3.new(0, 4, 0))
	end))

	-- 일정 시간 안에 끝나지 않으면 자동으로 마무리한다
	task.delay(130, function()
		if not finished then
			finish()
		end
	end)

	return { finish = finish }
end

return NavalBattle
