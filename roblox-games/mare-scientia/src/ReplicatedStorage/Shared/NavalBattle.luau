--!nonstrict
-- 해전 연출 (클라이언트 전용). 서버가 자동 해전을 계산한 뒤 돌려준 전투 기록(log)을
-- 두 배의 포격·접현 장면으로 다시 보여 준다. 결과는 서버가 이미 정했고, 이 장면은 보기용이다.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

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
function NavalBattle.play(opts)
	local player = Players.LocalPlayer
	local old = workspace:FindFirstChild("BattleScene")
	if old then
		old:Destroy()
	end
	local folder = Instance.new("Folder")
	folder.Name = "BattleScene"
	folder.Parent = workspace

	-- 바다
	local sea = part(folder, Vector3.new(900, 2, 900), CFrame.new(ORIGIN + Vector3.new(0, -1, 0)), Color3.fromRGB(34, 112, 156), Enum.Material.Glass)
	sea.Transparency = 0.15
	sea.Reflectance = 0.08

	local playerAt = ORIGIN + Vector3.new(-34, 0, 0)
	local enemyAt = ORIGIN + Vector3.new(34, 0, 0)
	local me = placeShip(folder, PLAYER_SHIP[opts.shipId] or "ship-medium", playerAt, 40, 0, nil)
	local foe = placeShip(folder, if opts.isBoss then "ship-pirate-large" else "ship-pirate-medium", enemyAt, if opts.isBoss then 54 else 40, math.pi, nil)
	local mePivot, foePivot = me:GetPivot(), foe:GetPivot()

	local camBase = CFrame.lookAt(ORIGIN + Vector3.new(0, 24, 86), ORIGIN + Vector3.new(0, 7, 0))
	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	cam.FieldOfView = 56
	cam.CFrame = camBase

	-- 화면 UI
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
	local foeFill = bar("R", opts.enemyName or "적선")

	local subtitle = label(gui, "", 16)
	subtitle.AnchorPoint = Vector2.new(0.5, 1)
	subtitle.Position = UDim2.new(0.5, 0, 1, -24)
	subtitle.Size = UDim2.new(0.8, 0, 0, 40)
	subtitle.TextWrapped = true

	local banner = label(gui, "", 44)
	banner.AnchorPoint = Vector2.new(0.5, 0.5)
	banner.Position = UDim2.fromScale(0.5, 0.4)
	banner.Size = UDim2.fromOffset(400, 70)
	banner.TextTransparency = 1
	banner.TextStrokeTransparency = 1

	local finished = false
	local conns = {}
	local function finish()
		if finished then
			return
		end
		finished = true
		for _, c in conns do
			c:Disconnect()
		end
		gui:Destroy()
		folder:Destroy()
		if opts.onDone then
			opts.onDone()
		end
	end

	local skip = Instance.new("TextButton")
	skip.Text = "건너뛰기"
	skip.AnchorPoint = Vector2.new(0.5, 0)
	skip.Position = UDim2.new(0.5, 0, 0, 62)
	skip.Size = UDim2.fromOffset(96, 32)
	skip.BackgroundColor3 = Color3.fromRGB(70, 84, 104)
	skip.TextColor3 = Color3.new(1, 1, 1)
	skip.Font = Enum.Font.GothamBold
	skip.TextSize = 14
	skip.BorderSizePixel = 0
	skip.Parent = gui
	do
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 10)
		c.Parent = skip
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Parent = skip
	end
	skip.Activated:Connect(finish)

	-- 사건 목록과 체력 곡선
	local events = parseLog(opts.log or {})
	local dmgToMe, dmgToFoe = 0, 0
	for _, e in events do
		if e.kind == "fire" then
			if e.player then
				dmgToFoe += e.hull
			else
				dmgToMe += e.hull
			end
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
	local meDmgSoFar, foeDmgSoFar = 0, 0

	-- 대포 한 발: 포물선으로 날아가 명중하면 불꽃
	local function shoot(fromPlayer, delay)
		task.delay(delay, function()
			if finished then
				return
			end
			local from = (if fromPlayer then playerAt else enemyAt) + Vector3.new(0, 7, 0)
			local to = (if fromPlayer then enemyAt else playerAt) + Vector3.new((math.random() - 0.5) * 14, 6 + math.random() * 3, (math.random() - 0.5) * 5)
			local flash = part(folder, Vector3.new(3, 3, 3), CFrame.new(from), Color3.fromRGB(255, 200, 90), Enum.Material.Neon, Enum.PartType.Ball)
			task.delay(0.15, function()
				flash:Destroy()
			end)
			local ball = part(folder, Vector3.new(1.4, 1.4, 1.4), CFrame.new(from), Color3.fromRGB(30, 30, 34), Enum.Material.Metal, Enum.PartType.Ball)
			local t0 = os.clock()
			local dur = 0.75
			local conn
			conn = RunService.Heartbeat:Connect(function()
				local u = math.clamp((os.clock() - t0) / dur, 0, 1)
				local pos = from:Lerp(to, u) + Vector3.new(0, math.sin(u * math.pi) * 14, 0)
				ball.CFrame = CFrame.new(pos)
				if u >= 1 then
					conn:Disconnect()
					ball:Destroy()
					if finished then
						return
					end
					local boom = part(folder, Vector3.new(2, 2, 2), CFrame.new(to), Color3.fromRGB(255, 150, 60), Enum.Material.Neon, Enum.PartType.Ball)
					local smoke = part(folder, Vector3.new(2, 2, 2), CFrame.new(to + Vector3.new(0, 1, 0)), Color3.fromRGB(90, 90, 96), Enum.Material.SmoothPlastic, Enum.PartType.Ball)
					smoke.Transparency = 0.3
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
				end
			end)
			table.insert(conns, conn)
		end)
	end

	-- 가라앉는 배, 흔들리는 배, 카메라 흔들림
	local sinkStart = nil
	local loser = if opts.winner == "a" then "foe" elseif opts.winner == "b" then "me" else nil
	local shake = 0
	table.insert(conns, RunService.Heartbeat:Connect(function()
		local t = os.clock()
		local bobMe = CFrame.new(0, math.sin(t * 1.3) * 0.5, 0) * CFrame.Angles(0, 0, math.sin(t * 0.9) * 0.03)
		local bobFoe = CFrame.new(0, math.sin(t * 1.1 + 1) * 0.5, 0) * CFrame.Angles(0, 0, math.sin(t * 0.8 + 2) * 0.03)
		local meCf, foeCf = bobMe * mePivot, bobFoe * foePivot
		if sinkStart then
			local k = math.clamp((t - sinkStart) / 3.2, 0, 1)
			local sink = CFrame.new(0, -k * 12, 0) * CFrame.Angles(0, 0, (if loser == "me" then -1 else 1) * k * 0.5)
			if loser == "me" then
				meCf = sink * meCf
			elseif loser == "foe" then
				foeCf = sink * foeCf
			end
		end
		me:PivotTo(meCf)
		foe:PivotTo(foeCf)
		shake = math.max(0, shake - 0.05)
		cam.CFrame = camBase * CFrame.new((math.random() - 0.5) * shake, (math.random() - 0.5) * shake, 0) * CFrame.new(math.sin(t * 0.3) * 3, 0, 0)
		meFill.Size = UDim2.fromScale(meHp, 1)
		foeFill.Size = UDim2.fromScale(foeHp, 1)
	end))

	-- 시간표를 돌린다
	task.spawn(function()
		task.wait(0.8)
		local step = if #events > 12 then 0.7 else 0.95
		for i, e in events do
			if finished then
				return
			end
			subtitle.Text = e.text
			if e.kind == "fire" then
				local volley = math.clamp(math.floor(e.hull / 8) + 1, 1, 4)
				for k = 0, volley - 1 do
					shoot(e.player, k * 0.12)
				end
				task.delay(0.8, function()
					if finished then
						return
					end
					shake = 1.2
					if e.player then
						foeDmgSoFar += e.hull
						foeHp = math.clamp(1 - (1 - foeEnd) * (foeDmgSoFar / math.max(1, dmgToFoe)), foeEnd, 1)
					else
						meDmgSoFar += e.hull
						meHp = math.clamp(1 - (1 - meEnd) * (meDmgSoFar / math.max(1, dmgToMe)), meEnd, 1)
					end
				end)
			elseif e.kind == "board" then
				-- 두 배가 가까워진다
				playerAt = playerAt + Vector3.new(8, 0, 0)
				enemyAt = enemyAt - Vector3.new(8, 0, 0)
				mePivot = mePivot + Vector3.new(8, 0, 0)
				foePivot = foePivot - Vector3.new(8, 0, 0)
				shake = 0.8
			elseif e.kind == "melee" then
				shake = 0.6
				if e.player then
					foeHp = math.max(foeEnd, foeHp - 0.04)
				else
					meHp = math.max(meEnd, meHp - 0.04)
				end
			end
			task.wait(step)
		end
		if finished then
			return
		end
		meHp, foeHp = meEnd, foeEnd
		if loser then
			sinkStart = os.clock()
		end
		banner.Text = if opts.winner == "a" then "승리!" elseif opts.winner == "b" then "패배..." else "물러났다"
		banner.TextColor3 = if opts.winner == "a" then Color3.fromRGB(255, 214, 120) elseif opts.winner == "b" then Color3.fromRGB(230, 110, 100) else Color3.fromRGB(220, 220, 230)
		banner.TextTransparency = 0
		banner.TextStrokeTransparency = 0.3
		subtitle.Text = ""
		task.wait(3.2)
		finish()
	end)

	return { finish = finish }
end

return NavalBattle
