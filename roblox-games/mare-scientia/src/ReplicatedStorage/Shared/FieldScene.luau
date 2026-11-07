--!nonstrict
-- 필드 탐험 장면 (클라이언트 전용). 탐험 지점에 도착하면 걸어 다니며 발견물을 조사하고,
-- 길을 막는 적을 공격 버튼으로 물리친다. 이 장면은 연출과 위험 부담이고,
-- 도감 카드 발견과 보상은 장면이 끝난 뒤 서버(Explore)가 판정한다.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Pose = require(script.Parent:WaitForChild("Pose"))

local FieldScene = {}

local ORIGIN = Vector3.new(3000, 0, 0) -- 항구 장면과 멀리 떨어진 곳
local SIZE = 200

local BIOMES = {
	{ words = { "해안", "갯벌", "바위", "절벽", "만", "섬", "부두", "어장", "군도" }, ground = Color3.fromRGB(196, 178, 128), mat = Enum.Material.Sand, trees = 4, rocks = 26,
		mobs = { { "해적", "Rogue_Hooded", 3, 8, 8.5 }, { "밀수꾼", "Rogue", 3, 7, 9.5 }, { "해적 두목", "Barbarian", 6, 12, 7.5, true } } },
	{ words = { "고지", "봉분", "평원", "열석", "들판", "돌" }, ground = Color3.fromRGB(110, 134, 82), mat = Enum.Material.Grass, trees = 8, rocks = 22,
		mobs = { { "산적", "Barbarian", 3, 8, 8.5 }, { "탈영병", "Knight", 4, 9, 7.5 }, { "산적 두목", "Barbarian", 7, 12, 7.5, true } } },
	{ words = { "광산", "탄광", "채석" }, ground = Color3.fromRGB(110, 108, 104), mat = Enum.Material.Slate, trees = 2, rocks = 40,
		mobs = { { "광산 도적", "Rogue", 3, 8, 9.5 }, { "갱 감독", "Knight", 5, 10, 7 }, { "도적 두목", "Barbarian", 7, 12, 7.5, true } } },
	{ words = { "숲", "과수원", "호수", "농장", "아마", "정원" }, ground = Color3.fromRGB(70, 118, 66), mat = Enum.Material.Grass, trees = 34, rocks = 8,
		mobs = { { "밀렵꾼", "Rogue_Hooded", 3, 8, 9 }, { "산적", "Barbarian", 3, 8, 8.5 }, { "숲의 사냥꾼", "Rogue", 4, 9, 10 }, { "산적 두목", "Knight", 7, 12, 7.5, true } } },
}
local DEFAULT_BIOME = { ground = Color3.fromRGB(96, 128, 72), mat = Enum.Material.Grass, trees = 16, rocks = 14,
	mobs = { { "산적", "Barbarian", 3, 8, 8.5 }, { "도적", "Rogue", 3, 8, 9.5 }, { "산적 두목", "Knight", 7, 12, 7.5, true } } }

local function biomeFor(name)
	for _, b in BIOMES do
		for _, w in b.words do
			if string.find(name, w, 1, true) then
				return b
			end
		end
	end
	return DEFAULT_BIOME
end

local function part(parent, size, cf, color, material, shape)
	local p = Instance.new("Part")
	p.Anchored = true
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

-- 등록된 CC0 모델을 놓는다. 없으면 nil.
local function placeModel(parent, kind, asset, bottom, desired, solid)
	local lib = ReplicatedStorage:FindFirstChild("MareAssets")
	local group = lib and lib:FindFirstChild(kind)
	local tpl = group and group:FindFirstChild(asset)
	if not tpl or not tpl:IsA("Model") then
		return nil
	end
	local m = tpl:Clone()
	local has = false
	for _, d in m:GetDescendants() do
		if d:IsA("BasePart") then
			has = true
			d.Anchored = true
			d.CanCollide = solid == true
			d.CanTouch = false
		end
	end
	if not has then
		m:Destroy()
		return nil
	end
	local ok = pcall(function()
		m.Parent = parent
		local _, ext = m:GetBoundingBox()
		local axis = if kind == "People" then ext.Y else math.max(ext.X, ext.Y, ext.Z)
		if axis < 0.01 then
			error("empty")
		end
		m:ScaleTo(desired / axis)
		local center, size = m:GetBoundingBox()
		local b = Vector3.new(center.Position.X, center.Position.Y - size.Y / 2, center.Position.Z)
		m:PivotTo(CFrame.new(bottom - b) * m:GetPivot())
		if kind == "People" then
			Pose.relaxArms(m)
		end
	end)
	if not ok then
		m:Destroy()
		return nil
	end
	return m
end

local function label(parent, text, size, color)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Text = text
	l.TextSize = size
	l.Font = Enum.Font.GothamBold
	l.TextColor3 = color or Color3.fromRGB(250, 236, 200)
	l.TextStrokeTransparency = 0.5
	l.Parent = parent
	return l
end

local function btn(parent, text, color, size, pos, anchor)
	local b = Instance.new("TextButton")
	b.Text = text
	b.Size = size
	b.Position = pos
	b.AnchorPoint = anchor or Vector2.new(0, 0)
	b.BackgroundColor3 = color
	b.TextColor3 = Color3.fromRGB(255, 255, 255)
	b.Font = Enum.Font.GothamBold
	b.TextSize = 16
	b.AutoButtonColor = true
	b.BorderSizePixel = 0
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 12)
	c.Parent = b
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(214, 170, 82)
	st.Thickness = 2
	st.Parent = b
	b.Parent = parent
	return b
end

-- opts: { name, nodes, danger, seed, onFinish(result) }  result: "clear" | "retreat" | "defeat"
function FieldScene.start(opts)
	local player = Players.LocalPlayer
	local old = workspace:FindFirstChild("FieldScene")
	if old then
		old:Destroy()
	end
	local folder = Instance.new("Folder")
	folder.Name = "FieldScene"
	folder.Parent = workspace
	local rng = Random.new(opts.seed or 7)
	local biome = biomeFor(opts.name or "")

	-- 땅과 보이지 않는 벽
	local ground = part(folder, Vector3.new(SIZE, 4, SIZE), CFrame.new(ORIGIN + Vector3.new(0, -2, 0)), biome.ground, biome.mat)
	ground.Name = "FieldGround"
	local half = SIZE / 2
	for _, w in {
		{ Vector3.new(SIZE, 50, 2), Vector3.new(0, 20, half) }, { Vector3.new(SIZE, 50, 2), Vector3.new(0, 20, -half) },
		{ Vector3.new(2, 50, SIZE), Vector3.new(half, 20, 0) }, { Vector3.new(2, 50, SIZE), Vector3.new(-half, 20, 0) },
	} do
		local p = part(folder, w[1], CFrame.new(ORIGIN + w[2]), Color3.new(1, 1, 1))
		p.Transparency = 1
		p.CanQuery = false
	end

	local spawn = ORIGIN + Vector3.new(0, 4, half - 14)
	-- 시작 지점 표지
	part(folder, Vector3.new(10, 0.3, 10), CFrame.new(ORIGIN + Vector3.new(0, 0.15, half - 14)), Color3.fromRGB(214, 170, 82), Enum.Material.Cobblestone, Enum.PartType.Cylinder).CFrame = CFrame.new(ORIGIN + Vector3.new(0, 0.2, half - 14)) * CFrame.Angles(0, 0, math.pi / 2)

	local function scatter(minR)
		for _ = 1, 20 do
			local x, z = rng:NextNumber(-half + 8, half - 8), rng:NextNumber(-half + 8, half - 30)
			if math.sqrt(x * x + (z - (half - 14)) ^ 2) > minR then
				return Vector3.new(x, 0, z)
			end
		end
		return Vector3.new(0, 0, 0)
	end

	-- 나무와 바위
	local treeNames = { "tree", "tree-crooked", "tree-high", "tree_large", "tree_tiny" }
	for _ = 1, biome.trees do
		local pos = ORIGIN + scatter(14)
		local h = rng:NextNumber(9, 15)
		if not placeModel(folder, "Town", treeNames[rng:NextInteger(1, #treeNames)], pos, h, false) then
			part(folder, Vector3.new(1.4, h * 0.45, 1.4), CFrame.new(pos + Vector3.new(0, h * 0.22, 0)), Color3.fromRGB(100, 70, 44), Enum.Material.Wood)
			part(folder, Vector3.new(h * 0.6, h * 0.6, h * 0.6), CFrame.new(pos + Vector3.new(0, h * 0.7, 0)), Color3.fromRGB(56, 112, 60), Enum.Material.Grass, Enum.PartType.Ball)
		end
	end
	local rockNames = { "rock-large", "rock-small", "rock-wide" }
	for _ = 1, biome.rocks do
		local pos = ORIGIN + scatter(10)
		if not placeModel(folder, "Town", rockNames[rng:NextInteger(1, #rockNames)], pos, rng:NextNumber(2.5, 6), true) then
			part(folder, Vector3.new(rng:NextNumber(2, 4), rng:NextNumber(1.5, 3), rng:NextNumber(2, 4)), CFrame.new(pos + Vector3.new(0, 1, 0)) * CFrame.Angles(0, rng:NextNumber(0, 3), 0), Color3.fromRGB(128, 126, 122), Enum.Material.Slate)
		end
	end

	-- 생산지·탐험 지역에 신규 CC0 자연 자산을 배치한다.
	-- 실제 모델이 등록되지 않았으면 배치를 생략하고 임시 원형/상자 대체물을 만들지 않는다.
	if string.find(opts.name or "", "농장", 1, true) or string.find(opts.name or "", "과수원", 1, true)
		or string.find(opts.name or "", "들판", 1, true) then
		local farmModels = { "crop-carrot", "crop-melon", "crop-turnip", "crops-cornstagec", "crops-wheatstagea" }
		for index, crop in farmModels do
			placeModel(folder, "Terrain", crop, ORIGIN + Vector3.new(-22 + index * 7, 0, -24), 3.8, false)
		end
	end
	if string.find(opts.name or "", "숲", 1, true) or string.find(opts.name or "", "고지", 1, true) then
		placeModel(folder, "Terrain", "campfire-logs", ORIGIN + Vector3.new(28, 0, -24), 3.4, false)
	end

	-- 상태
	local hp, maxHp = 100, 100
	local found = 0
	local nodeCount = math.max(1, opts.nodes or 1)
	local finished = false
	local enemies = {}
	local conns = {}

	local gui = Instance.new("ScreenGui")
	gui.Name = "FieldGui"
	gui.ResetOnSpawn = false
	gui.DisplayOrder = 20
	gui.Parent = player:WaitForChild("PlayerGui")

	local title = label(gui, "", 16)
	title.AnchorPoint = Vector2.new(0.5, 0)
	title.Position = UDim2.new(0.5, 0, 0, 58)
	title.Size = UDim2.fromOffset(320, 24)

	local hpBack = Instance.new("Frame")
	hpBack.AnchorPoint = Vector2.new(0.5, 0)
	hpBack.Position = UDim2.new(0.5, 0, 0, 86)
	hpBack.Size = UDim2.fromOffset(240, 14)
	hpBack.BackgroundColor3 = Color3.fromRGB(14, 24, 38)
	hpBack.BorderSizePixel = 0
	hpBack.Parent = gui
	do
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 7)
		c.Parent = hpBack
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 1.5
		st.Parent = hpBack
	end
	local hpFill = Instance.new("Frame")
	hpFill.Size = UDim2.fromScale(1, 1)
	hpFill.BackgroundColor3 = Color3.fromRGB(91, 181, 120)
	hpFill.BorderSizePixel = 0
	hpFill.Parent = hpBack
	do
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 7)
		c.Parent = hpFill
	end

	local note = label(gui, "", 14, Color3.fromRGB(255, 220, 160))
	note.AnchorPoint = Vector2.new(0.5, 0)
	note.Position = UDim2.new(0.5, 0, 0, 104)
	note.Size = UDim2.fromOffset(320, 22)

	local function refresh()
		title.Text = string.format("%s  발견 %d/%d  적 %d", opts.name or "탐험", found, nodeCount, #enemies)
		hpFill.Size = UDim2.fromScale(math.clamp(hp / maxHp, 0, 1), 1)
		hpFill.BackgroundColor3 = if hp / maxHp < 0.35 then Color3.fromRGB(214, 82, 76) else Color3.fromRGB(91, 181, 120)
	end
	local noteToken = 0
	local function say(text)
		noteToken += 1
		local mine = noteToken
		note.Text = text
		task.delay(2.2, function()
			if noteToken == mine then
				note.Text = ""
			end
		end)
	end

	local function finish(result)
		if finished then
			return
		end
		finished = true
		for _, c in conns do
			c:Disconnect()
		end
		gui:Destroy()
		folder:Destroy()
		if opts.onFinish then
			opts.onFinish(result)
		end
	end

	-- 발견물: 반짝이는 상자. 가까이 가서 조사한다.
	for i = 1, nodeCount do
		local pos = ORIGIN + scatter(30)
		local anchor = part(folder, Vector3.new(3, 3, 3), CFrame.new(pos + Vector3.new(0, 1.5, 0)), Color3.fromRGB(255, 214, 120), Enum.Material.Neon)
		anchor.Transparency = 0.35
		anchor.CanCollide = false
		anchor.Name = "Discovery" .. i
		placeModel(folder, "Naval", "chest", pos, 3.2, false)
		local light = Instance.new("PointLight")
		light.Color = Color3.fromRGB(255, 214, 120)
		light.Range = 18
		light.Brightness = 2
		light.Parent = anchor
		local pp = Instance.new("ProximityPrompt")
		pp.ActionText = "조사"
		pp.ObjectText = "발견물"
		pp.HoldDuration = 0.6
		pp.MaxActivationDistance = 12
		pp.RequiresLineOfSight = false
		pp.Parent = anchor
		pp.Triggered:Connect(function()
			if finished then
				return
			end
			found += 1
			anchor:Destroy()
			say(string.format("발견물을 조사했다 (%d/%d)", found, nodeCount))
			refresh()
			if found >= nodeCount then
				task.delay(0.8, function()
					finish("clear")
				end)
			end
		end)
	end

	-- 적: 가까이 오면 쫓아와 때린다
	local enemyCount = math.clamp(2 + math.floor((opts.danger or 1) / 2), 2, 6)
	for i = 1, enemyCount + 1 do
		-- 마지막 한 마리는 두목(위험이 높은 곳에서만 나온다)
		local isBoss = i == enemyCount + 1
		if isBoss and (opts.danger or 1) < 3 then
			break
		end
		local def
		if isBoss then
			def = biome.mobs[#biome.mobs]
		else
			def = biome.mobs[rng:NextInteger(1, math.max(1, #biome.mobs - 1))]
		end
		local pos = ORIGIN + scatter(36)
		local model = Pose.createR15(folder, pos, 0, nil, rng, def[2], if isBoss then 7.6 else 5.6)
		if not model then
			warn("[MareScientia] R15 적 모델 생성 불가", def[1])
			continue
		end
		model.Name = "FieldEnemy"
		local root = model:FindFirstChild("HumanoidRootPart")
		if not root then model:Destroy(); continue end
		local bb = Instance.new("BillboardGui")
		bb.Adornee = root
		bb.Size = UDim2.fromOffset(120, 34)
		bb.StudsOffset = Vector3.new(0, 4.5, 0)
		bb.AlwaysOnTop = true
		bb.MaxDistance = 80
		bb.Parent = root
		local tag = label(bb, def[1], if isBoss then 16 else 14, if isBoss then Color3.fromRGB(255, 190, 90) else Color3.fromRGB(255, 120, 110))
		tag.Size = UDim2.new(1, 0, 0, 16)
		local barBack = Instance.new("Frame")
		barBack.Position = UDim2.new(0.15, 0, 0, 20)
		barBack.Size = UDim2.new(0.7, 0, 0, 7)
		barBack.BackgroundColor3 = Color3.fromRGB(30, 30, 34)
		barBack.BorderSizePixel = 0
		barBack.Parent = bb
		local bar = Instance.new("Frame")
		bar.Size = UDim2.fromScale(1, 1)
		bar.BackgroundColor3 = Color3.fromRGB(214, 82, 76)
		bar.BorderSizePixel = 0
		bar.Parent = barBack
		table.insert(enemies, { model = model, root = root, hp = def[3], maxHp = def[3], dmg = def[4], speed = def[5], bar = bar, nextHit = 0, home = pos, boss = isBoss, swingAt = -10, hurtAt = -10, spawnT = os.clock() })
	end

	-- 입력 버튼
	local attackBtn = btn(gui, "공격", Color3.fromRGB(176, 60, 56), UDim2.fromOffset(96, 96), UDim2.new(1, -150, 0.5, -10), Vector2.new(0.5, 0.5))
	attackBtn.TextSize = 22
	local retreat = btn(gui, "철수", Color3.fromRGB(70, 84, 104), UDim2.fromOffset(72, 36), UDim2.new(1, -12, 0, 56), Vector2.new(1, 0))
	retreat.Activated:Connect(function()
		finish("retreat")
	end)

	local lastAttack = 0
	local function attack()
		if finished then
			return
		end
		local now = os.clock()
		if now - lastAttack < 0.45 then
			return
		end
		lastAttack = now
		local char = player.Character
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if not hrp then
			return
		end
		local best, bestD = nil, 10
		for _, e in enemies do
			local d = (e.root.Position - hrp.Position).Magnitude
			if d < bestD then
				best, bestD = e, d
			end
		end
		if not best then
			say("가까운 적이 없다")
			return
		end
		best.hp -= 1
		best.hurtAt = os.clock()
		best.bar.Size = UDim2.fromScale(math.max(best.hp, 0) / best.maxHp, 1)
		-- 밀려나는 연출
		local away = (best.root.Position - hrp.Position) * Vector3.new(1, 0, 1)
		if away.Magnitude > 0.1 then
			best.model:PivotTo(best.model:GetPivot() + away.Unit * 2.5)
		end
		if best.hp <= 0 then
			table.remove(enemies, table.find(enemies, best))
			local dying = best.model
			task.spawn(function()
				local t0 = os.clock()
				while dying.Parent and os.clock() - t0 < 0.7 do
					Pose.dieR15(dying, (os.clock() - t0) / 0.7)
					task.wait()
				end
				dying:Destroy()
			end)
			say(if best.boss then "두목을 쓰러뜨렸다!" else "적을 물리쳤다!")
		end
		refresh()
	end
	attackBtn.Activated:Connect(attack)

	-- 적 이동·공격
	table.insert(conns, RunService.Heartbeat:Connect(function(dt)
		if finished then
			return
		end
		local char = player.Character
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if not hrp then
			return
		end
		local now = os.clock()
		for _, e in enemies do
			local to = hrp.Position - e.root.Position
			local flat = Vector3.new(to.X, 0, to.Z)
			local dist = flat.Magnitude
			if dist < 38 and dist > 3.2 then
				local step = flat.Unit * math.min(e.speed * dt, dist - 3)
				local target = e.model:GetPivot().Position + step
				e.model:PivotTo(CFrame.new(target) * CFrame.Angles(0, math.atan2(-flat.Unit.X, -flat.Unit.Z) + math.pi, 0))
			elseif dist <= 3.6 and now >= e.nextHit then
				e.nextHit = now + 1.2
				e.swingAt = now
				hp = math.max(0, hp - e.dmg)
				say("공격을 받았다!")
				refresh()
				if hp <= 0 then
					task.defer(function()
						finish("defeat")
					end)
					return
				end
			end
			Pose.animateR15(e.model, {
				phase = (now - e.spawnT) * e.speed * 1.5,
				moving = dist < 38 and dist > 3.2,
				t = now - e.spawnT,
				attack = (now - e.swingAt) / 0.5,
				hurt = math.max(0, 1 - (now - e.hurtAt) / 0.3),
			})
		end
	end))

	-- 캐릭터를 필드로 옮긴다
	local char = player.Character or player.CharacterAdded:Wait()
	char:PivotTo(CFrame.new(spawn))
	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Custom
	cam.FieldOfView = 70
	local hum = char:FindFirstChildOfClass("Humanoid")
	if hum then
		cam.CameraSubject = hum
	end

	refresh()
	say("발견물을 찾아 조사하자. 적은 공격 버튼으로!")
	return { finish = finish }
end

return FieldScene
