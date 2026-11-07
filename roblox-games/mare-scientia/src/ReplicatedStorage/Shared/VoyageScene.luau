--!nonstrict
-- 항해 장면 (3D 바다). 항구에서 멀리 떨어진 빈 공간에 바다를 만들고,
-- 내 배가 항로(위도·경도 점들)를 따라 실제로 달린다. 카메라가 배를 돌며 비춘다.
-- 낮에서 해질녘으로 시간이 흐르고, 구름·갈매기·물보라가 따라온다. 화면을 누르면 건너뛴다.

local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")

local VoyageScene = {}
local Sfx = require(script.Parent:WaitForChild("Sfx"))

local ORIGIN = Vector3.new(0, 0, 20000) -- 항구와 겹치지 않는 먼 곳
local SPEED = 70 -- 스터드/초
local STREAKS = 0 -- 곧은 흰 막대는 어색해서 쓰지 않는다
local CLOUDS = 0 -- 공 모양 구름은 바다에 어두운 그림자 얼룩을 만들어서 쓰지 않는다(하늘 구름은 스카이박스)

local function part(parent, size, cf, color, material, shape)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanTouch = false
	p.CanQuery = false
	p.CastShadow = false
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	if shape then
		p.Shape = shape
	end
	p.Parent = parent
	return p
end

-- 항로를 월드 좌표 점들로 바꾼다. 전체 길이가 time*SPEED 가 되도록 늘리거나 줄인다.
local function worldPath(path, length)
	local pts = {}
	if type(path) == "table" and #path >= 2 then
		local lat0 = path[1][1]
		local k = math.cos(math.rad(lat0))
		for _, p in path do
			-- 동쪽 = +X, 북쪽 = -Z
			table.insert(pts, Vector3.new((p[2] - path[1][2]) * k, 0, -(p[1] - path[1][1])))
		end
	else
		pts = { Vector3.zero, Vector3.new(1, 0, -0.2) }
	end
	local total = 0
	for i = 2, #pts do
		total += (pts[i] - pts[i - 1]).Magnitude
	end
	if total < 1e-6 then
		pts = { Vector3.zero, Vector3.new(1, 0, 0) }
		total = 1
	end
	local scale = length / total
	local cum = { 0 }
	for i = 1, #pts do
		pts[i] = ORIGIN + pts[i] * scale
		if i > 1 then
			cum[i] = cum[i - 1] + (pts[i] - pts[i - 1]).Magnitude
		end
	end
	return pts, cum, cum[#cum]
end

local function positionAt(pts, cum, d)
	for i = 1, #pts - 1 do
		if d <= cum[i + 1] or i == #pts - 1 then
			local seg = cum[i + 1] - cum[i]
			local f = if seg > 0 then math.clamp((d - cum[i]) / seg, 0, 1) else 1
			local dir = (pts[i + 1] - pts[i])
			return pts[i]:Lerp(pts[i + 1], f), dir.Unit
		end
	end
	return pts[#pts], Vector3.new(1, 0, 0)
end

local function yawOf(dir)
	-- 뱃머리는 모델의 +X 쪽
	return math.atan2(-dir.Z, dir.X)
end

-- info: { shipId, steam, days, path, fromName, toName, makeShip, event = { kind, won } }
function VoyageScene.play(info)
	local player = Players.LocalPlayer
	local camera = workspace.CurrentCamera
	local duration = math.clamp(8 + info.days * 0.9, 10, 24)
	local pts, cum, total = worldPath(info.path, duration * SPEED * (if info.steam then 1.25 else 1))
	local speedNow = total / duration
	local ev = info.event or { kind = "none" }
	if ev.kind == "tailwind" then
		speedNow *= 1.25
	elseif ev.kind == "calm" then
		speedNow *= 0.8
	end

	local folder = Instance.new("Folder")
	folder.Name = "VoyageScene"
	folder.Parent = workspace

	-- 화면 UI
	local gui = Instance.new("ScreenGui")
	gui.Name = "VoyageHud"
	gui.DisplayOrder = 30
	gui.IgnoreGuiInset = true
	gui.ResetOnSpawn = false
	gui.Parent = player:WaitForChild("PlayerGui")
	local skip = Instance.new("TextButton")
	skip.Size = UDim2.fromScale(1, 1)
	skip.BackgroundTransparency = 1
	skip.Text = ""
	skip.ZIndex = 1
	skip.Parent = gui
	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Position = UDim2.new(0, 0, 0, 36)
	title.Size = UDim2.new(1, 0, 0, 34)
	title.Font = Enum.Font.GothamBold
	title.TextSize = 24
	title.TextColor3 = Color3.new(1, 1, 1)
	title.TextStrokeTransparency = 0.4
	title.Text = string.format("%s  →  %s", info.fromName, info.toName)
	title.ZIndex = 2
	title.Parent = gui
	local dayLabel = title:Clone()
	dayLabel.Position = UDim2.new(0, 0, 0, 72)
	dayLabel.Size = UDim2.new(1, 0, 0, 22)
	dayLabel.TextSize = 16
	dayLabel.Font = Enum.Font.Gotham
	dayLabel.Parent = gui
	local barBack = Instance.new("Frame")
	barBack.Position = UDim2.new(0.1, 0, 1, -44)
	barBack.Size = UDim2.new(0.8, 0, 0, 6)
	barBack.BackgroundColor3 = Color3.fromRGB(20, 50, 80)
	barBack.BackgroundTransparency = 0.3
	barBack.BorderSizePixel = 0
	barBack.ZIndex = 2
	barBack.Parent = gui
	local bar = Instance.new("Frame")
	bar.Size = UDim2.fromScale(0, 1)
	bar.BackgroundColor3 = Color3.fromRGB(224, 170, 69)
	bar.BorderSizePixel = 0
	bar.ZIndex = 3
	bar.Parent = barBack
	local hint = title:Clone()
	hint.Position = UDim2.new(0, 0, 1, -34)
	hint.Size = UDim2.new(1, 0, 0, 18)
	hint.TextSize = 12
	hint.Font = Enum.Font.Gotham
	hint.Text = "화면을 누르면 건너뛰어요"
	hint.Parent = gui
	local fade = Instance.new("Frame")
	fade.Size = UDim2.fromScale(1, 1)
	fade.BackgroundColor3 = Color3.new(0, 0, 0)
	fade.BorderSizePixel = 0
	fade.ZIndex = 10
	fade.Parent = gui
	local skipped = false
	skip.Activated:Connect(function()
		skipped = true
	end)

	-- 조명 저장 후 바다 분위기로 바꾼다
	local saved = {
		clock = Lighting.ClockTime, fogEnd = Lighting.FogEnd, fogStart = Lighting.FogStart, fogColor = Lighting.FogColor,
		ambient = Lighting.Ambient, camType = camera.CameraType, camFov = camera.FieldOfView,
	}
	local atmosphere = Instance.new("Atmosphere")
	atmosphere.Name = "VoyageAtmosphere"
	atmosphere.Density = 0.25
	atmosphere.Offset = 0.2
	atmosphere.Color = Color3.fromRGB(190, 210, 230)
	atmosphere.Decay = Color3.fromRGB(240, 200, 160)
	atmosphere.Parent = Lighting
	-- 색감·빛번짐을 살려 바다를 덜 밋밋하게
	local grade = Instance.new("ColorCorrectionEffect")
	grade.Saturation = 0.18
	grade.Contrast = 0.08
	grade.TintColor = Color3.fromRGB(255, 248, 238)
	grade.Parent = Lighting
	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.35
	bloom.Size = 28
	bloom.Threshold = 1.1
	bloom.Parent = Lighting
	local rays = Instance.new("SunRaysEffect")
	rays.Intensity = 0.12
	rays.Spread = 0.6
	rays.Parent = Lighting
	Lighting.FogColor = Color3.fromRGB(176, 205, 232)
	Lighting.FogStart = 600
	Lighting.FogEnd = 2600
	Lighting.ClockTime = 8

	-- 바다: 배를 따라다니는 큰 판
	local sea = part(folder, Vector3.new(7000, 2, 7000), CFrame.new(ORIGIN + Vector3.new(0, -1.6, 0)), Color3.fromRGB(28, 88, 140), Enum.Material.SmoothPlastic)
	sea.Name = "Sea"
	sea.Reflectance = 0.12

	-- 물결치는 진짜 물(지형 물)을 배 주변에만 깐다. 실패하면 위의 판이 바다를 맡는다.
	local terrain = workspace.Terrain
	local savedWater = { c = terrain.WaterColor, t = terrain.WaterTransparency, r = terrain.WaterReflectance, ws = terrain.WaterWaveSize, wsp = terrain.WaterWaveSpeed }
	sea.Position = Vector3.new(sea.Position.X, -3.2, sea.Position.Z)
	local waterOk = pcall(function()
		terrain.WaterColor = Color3.fromRGB(22, 96, 150)
		terrain.WaterTransparency = 0.25
		terrain.WaterReflectance = 0.55
		terrain.WaterWaveSize = 0.45
		terrain.WaterWaveSpeed = 16
	end)
	local CH = 240
	local filledChunks = {}
	local function fillChunksAround(center, maxNew)
		if not waterOk then
			return
		end
		local cx0, cz0 = math.floor(center.X / CH), math.floor(center.Z / CH)
		local made = 0
		for r = 0, 2 do
			for dx = -r, r do
				for dz = -r, r do
					if math.max(math.abs(dx), math.abs(dz)) == r then
						local key = (cx0 + dx) .. "," .. (cz0 + dz)
						if not filledChunks[key] and made < maxNew then
							filledChunks[key] = CFrame.new((cx0 + dx) * CH + CH / 2, -4, (cz0 + dz) * CH + CH / 2)
							pcall(function()
								terrain:FillBlock(filledChunks[key], Vector3.new(CH, 8, CH), Enum.Material.Water)
							end)
							made += 1
						end
					end
				end
			end
		end
	end
	fillChunksAround(ORIGIN, 25)

	-- 내 배
	local ship = info.makeShip(folder, info.shipId, ORIGIN + Vector3.new(0, 1.2, 0))
	pcall(function() ship:ScaleTo(1.7) end)
	ship.Name = "VoyageShip"
	local shipBase = ship:GetPivot()
	-- 배 바닥이 수면 아래로 잠기도록 높이를 맞춘다 (떠 있는 느낌 제거)
	local function restY(model)
		local bcf, bsize = model:GetBoundingBox()
		local bottomRel = (bcf.Position.Y - bsize.Y / 2) - model:GetPivot().Position.Y
		return math.clamp(-0.9 - bottomRel, -6, 6), math.max(bsize.X, bsize.Z)
	end
	local baseY, shipLen = restY(ship)
	local heel = 0
	local wheels = {}
	for _, name in { "PaddleWheelPort", "PaddleWheelStarboard" } do
		local w = ship:FindFirstChild(name)
		if w and w:IsA("Model") then
			table.insert(wheels, { model = w, relative = shipBase:ToObjectSpace(w:GetPivot()) })
		end
	end
	local function shipPose(pos, yaw, t)
		return CFrame.new(pos.X, baseY + math.sin(t * 1.3) * 0.45 + math.sin(t * 2.7) * 0.12, pos.Z) * CFrame.Angles(0, yaw, 0)
			* CFrame.Angles(heel + math.sin(t * 1.1) * 0.035, 0, math.sin(t * 0.9) * 0.05 + math.sin(t * 1.9) * 0.015)
	end
	local rot0 = CFrame.new(-shipBase.Position) * shipBase -- 모델의 원래 방향(회전만)
	local function applyShip(pos, yaw, t)
		local pivot = shipPose(pos, yaw, t) * rot0
		ship:PivotTo(pivot)
		for _, w in wheels do
			w.model:PivotTo(pivot * w.relative * CFrame.Angles(0, 0, t * 2.2))
		end
	end

	-- 물보라 줄무늬 (달리는 느낌을 준다)
	local rng = Random.new(os.time())
	local streaks = {}
	for _ = 1, STREAKS do
		local s = part(folder, Vector3.new(rng:NextNumber(5, 12), 0.15, rng:NextNumber(0.5, 1.1)), CFrame.new(ORIGIN), Color3.fromRGB(235, 245, 255), Enum.Material.SmoothPlastic)
		s.Transparency = 0.55
		table.insert(streaks, s)
	end
	local function scatter(s, center, yaw, ahead)
		local a = rng:NextNumber(0, math.pi * 2)
		local r = rng:NextNumber(30, 420)
		local ox, oz = math.cos(a) * r, math.sin(a) * r
		if ahead then
			-- 진행 방향 앞쪽으로 다시 뿌린다
			ox = math.cos(yaw) * rng:NextNumber(260, 420) + math.cos(a) * 120
			oz = -math.sin(yaw) * rng:NextNumber(260, 420) + math.sin(a) * 120
		end
		s.CFrame = CFrame.new(center.X + ox, 0.1, center.Z + oz) * CFrame.Angles(0, rng:NextNumber(0, math.pi), 0)
	end
	for _, s in streaks do
		scatter(s, ORIGIN, 0, false)
	end

	-- 구름
	local clouds = {}
	for _ = 1, CLOUDS do
		local m = Instance.new("Model")
		local base = Vector3.new(rng:NextNumber(-1500, 1500), rng:NextNumber(150, 260), rng:NextNumber(-1500, 1500))
		for _ = 1, 4 do
			local b = part(m, Vector3.new(1, 1, 1) * rng:NextNumber(40, 80), CFrame.new(base + Vector3.new(rng:NextNumber(-50, 50), rng:NextNumber(-8, 8), rng:NextNumber(-30, 30))), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, Enum.PartType.Ball)
			b.Transparency = 0.2
			b.Size = Vector3.new(b.Size.X * 1.6, b.Size.Y * 0.5, b.Size.Z)
		end
		m.Parent = folder
		table.insert(clouds, { model = m, offset = base })
	end

	-- 갈매기: 출발 직후 따라오다가 먼 바다에서 사라진다
	local gulls = {}
	for i = 1, 5 do
		local g = Instance.new("Model")
		local body = part(g, Vector3.new(1.4, 0.5, 0.5), CFrame.new(), Color3.new(1, 1, 1))
		local l = part(g, Vector3.new(0.6, 0.15, 2), CFrame.new(), Color3.fromRGB(235, 235, 240))
		local r = part(g, Vector3.new(0.6, 0.15, 2), CFrame.new(), Color3.fromRGB(235, 235, 240))
		g.Parent = folder
		table.insert(gulls, { model = g, body = body, l = l, r = r, radius = rng:NextNumber(18, 38), height = rng:NextNumber(14, 26), speed = rng:NextNumber(0.5, 0.9), phase = i * 1.3 })
	end

	-- 사건 연출 ------------------------------------------------------------
	local evSoundDone = false
	local nextGull = 4
	local EVENT_AT = 0.42 -- 항해의 이 지점에서 사건이 시작된다
	local EVENT_LEN = 0.26
	local rain = nil
	local enemy = nil
	local enemyY = 1.2
	local barrel = nil
	if ev.kind == "storm" then
		-- 비: 배 위쪽에서 따라다니는 파티클 판
		local sky = part(folder, Vector3.new(160, 1, 160), CFrame.new(ORIGIN + Vector3.new(0, 90, 0)), Color3.new(0, 0, 0))
		sky.Transparency = 1
		local em = Instance.new("ParticleEmitter")
		em.Rate = 0
		em.Lifetime = NumberRange.new(0.8, 1.1)
		em.Speed = NumberRange.new(110, 140)
		em.EmissionDirection = Enum.NormalId.Bottom
		em.SpreadAngle = Vector2.new(6, 6)
		em.Size = NumberSequence.new(0.35)
		em.Transparency = NumberSequence.new(0.35)
		em.Color = ColorSequence.new(Color3.fromRGB(190, 205, 225))
		em.Parent = sky
		rain = { part = sky, emitter = em }
	elseif ev.kind == "pirates" then
		enemy = info.makeShip(folder, "frigate", ORIGIN + Vector3.new(0, 1.2, 0))
		enemy.Name = "PirateShip"
		pcall(function() enemy:ScaleTo(1.7) end)
		-- 검은 돛 느낌: 선체 색을 어둡게
		for _, d in enemy:GetDescendants() do
			if d:IsA("MeshPart") then
				d.Color = d.Color:Lerp(Color3.new(0.05, 0.05, 0.06), 0.55)
			end
		end
		enemyY = restY(enemy)
		enemy:PivotTo(enemy:GetPivot() + Vector3.new(0, -500, 0)) -- 아직 숨김
	elseif ev.kind == "drift" then
		barrel = part(folder, Vector3.new(3, 2.6, 3), CFrame.new(ORIGIN), Color3.fromRGB(120, 76, 44), Enum.Material.Wood, Enum.PartType.Cylinder)
	end
	local enemyBase = enemy and enemy:GetPivot()
	local enemyRot = enemyBase and (CFrame.new(-enemyBase.Position) * enemyBase)
	local flashes = {}
	local function cannonFlash(at)
		local f = part(folder, Vector3.new(4, 4, 4), CFrame.new(at), Color3.fromRGB(255, 200, 90), Enum.Material.Neon, Enum.PartType.Ball)
		f.Transparency = 0.1
		local pl = Instance.new("PointLight")
		pl.Brightness = 6
		pl.Range = 40
		pl.Color = Color3.fromRGB(255, 190, 90)
		pl.Parent = f
		table.insert(flashes, { part = f, born = os.clock() })
	end
	local nextShot = 0
	local lightning = 0

	-- 항적: 선미 거품, 뱃머리 물보라, V자 물결
	local function emitterPart(rate, life, speed, spread, sizeFrom, sizeTo, accel, dir)
		local p = part(folder, Vector3.new(1, 1, 1), CFrame.new(ORIGIN), Color3.new(1, 1, 1))
		p.Transparency = 1
		local em = Instance.new("ParticleEmitter")
		em.Rate = rate
		em.Lifetime = NumberRange.new(life * 0.7, life)
		em.Speed = NumberRange.new(speed * 0.6, speed)
		em.SpreadAngle = Vector2.new(spread, spread)
		em.EmissionDirection = dir or Enum.NormalId.Top
		em.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, sizeFrom), NumberSequenceKeypoint.new(1, sizeTo) })
		em.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.25), NumberSequenceKeypoint.new(1, 1) })
		em.Color = ColorSequence.new(Color3.fromRGB(240, 248, 255))
		em.Acceleration = accel or Vector3.zero
		em.LockedToPart = false
		em.Parent = p
		return p, em
	end
	local FOAM = "rbxasset://textures/particles/smoke_main.dds"
	local sternPart, sternEm = emitterPart(22, 3.2, 3, 90, 5, 16, Vector3.zero, Enum.NormalId.Top)
	sternEm.Texture = FOAM
	sternEm.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.55), NumberSequenceKeypoint.new(1, 1) })
	local bowPart, bowEm = emitterPart(34, 1.1, 12, 30, 2, 6, Vector3.new(0, -26, 0), Enum.NormalId.Top)
	bowEm.Texture = FOAM
	bowEm.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.35), NumberSequenceKeypoint.new(1, 1) })
	-- 선미 양옆에서 이어지는 하얀 항적 띠
	local trailParts = {}
	for i = 1, 2 do
		local tp = part(folder, Vector3.new(0.5, 0.5, 0.5), CFrame.new(ORIGIN), Color3.new(1, 1, 1))
		tp.Transparency = 1
		local a0, a1 = Instance.new("Attachment"), Instance.new("Attachment")
		a0.Position, a1.Position = Vector3.new(0, 0, -1.2), Vector3.new(0, 0, 1.2)
		a0.Parent, a1.Parent = tp, tp
		local tr = Instance.new("Trail")
		tr.Attachment0, tr.Attachment1 = a0, a1
		tr.Lifetime = 2.4
		tr.Texture = FOAM
		tr.TextureMode = Enum.TextureMode.Stretch
		tr.MinLength = 0.2
		tr.FaceCamera = false
		tr.Color = ColorSequence.new(Color3.fromRGB(235, 246, 255))
		tr.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.8), NumberSequenceKeypoint.new(0.4, 0.88), NumberSequenceKeypoint.new(1, 1) })
		tr.WidthScale = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(1, 5) })
		tr.LightEmission = 0.25
		tr.Parent = tp
		table.insert(trailParts, tp)
	end
	local wakes = {}

	-- 사건 소품: 지나가는 상선, 암초, 섬, 유령선 등 (승인된 모델만)
	local props = {}
	local fish = {}
	local function addProp(kind, asset, size, side, along, extraYaw, y)
		if not info.place then
			return nil
		end
		local m = info.place(folder, kind, asset, ORIGIN + Vector3.new(0, 0, 0), size)
		if not m then
			return nil
		end
		local bcf, bsize = m:GetBoundingBox()
		local off = (bcf.Position.Y - bsize.Y / 2) - m:GetPivot().Position.Y
		local rec = { m = m, side = side, along = along, yaw = extraYaw or 0, y = (y or 0) - off }
		table.insert(props, rec)
		return rec
	end
	-- 물보라·물기둥: 돌고래 떼와 고래 장면. 모델 없이 입자만 쓴다.
	local function addSpray(side, along, speed, rate, size)
		local part = Instance.new("Part")
		part.Name = "Spray"
		part.Anchored = true
		part.CanCollide = false
		part.CanQuery = false
		part.CanTouch = false
		part.Transparency = 1
		part.Size = Vector3.new(1, 1, 1)
		part.Parent = folder
		local e = Instance.new("ParticleEmitter")
		e.Rate = rate
		e.Lifetime = NumberRange.new(0.9, 1.5)
		e.Speed = NumberRange.new(speed * 0.8, speed * 1.2)
		e.SpreadAngle = Vector2.new(14, 14)
		e.EmissionDirection = Enum.NormalId.Top
		e.Acceleration = Vector3.new(0, -speed * 1.1, 0)
		e.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, size * 0.4), NumberSequenceKeypoint.new(1, size) })
		e.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.1), NumberSequenceKeypoint.new(1, 1) })
		e.Color = ColorSequence.new(Color3.fromRGB(240, 248, 255))
		e.LightEmission = 0.3
		e.Parent = part
		local rec = { m = part, side = side, along = along, yaw = 0, y = 0.5 }
		table.insert(props, rec)
		return rec
	end
	local eventBanner = {
		dolphins = "돌고래 떼!", whale = "고래다!",
		school = "물고기떼 발견!", merchant = "상선을 만났다", fog = "짙은 안개", reef = "암초 조심!", rescue = "표류자 발견!",
		island = "미지의 섬!", ghost = "유령선...", blockade = "해상 봉쇄!", storm = "폭풍!", pirates = "해적선 출현!", drift = "표류물 발견", fever = "열병 발생", tailwind = "순풍!", calm = "잔잔한 바다",
	}
	local banner = title:Clone()
	banner.Position = UDim2.new(0, 0, 0.22, 0)
	banner.Size = UDim2.new(1, 0, 0, 44)
	banner.TextSize = 34
	banner.TextColor3 = Color3.fromRGB(255, 220, 120)
	banner.Text = eventBanner[ev.kind] or ""
	banner.TextTransparency = 1
	banner.TextStrokeTransparency = 1
	banner.Parent = gui
	if ev.kind == "dolphins" then
		addSpray(18, 0.46, 16, 40, 3)
		addSpray(-22, 0.5, 18, 40, 3)
		addSpray(30, 0.54, 15, 40, 3)
		addSpray(-34, 0.58, 17, 40, 3)
	elseif ev.kind == "whale" then
		addSpray(40, 0.5, 34, 60, 7)
		addSpray(43, 0.5, 26, 30, 5)
	elseif ev.kind == "merchant" then
		addProp("Naval", "ship-medium", 16, -70, 0.55, math.pi)
		addProp("Naval", "boat-sail-a", 9, -110, 0.4, math.pi)
	elseif ev.kind == "reef" then
		for i = 1, 4 do
			addProp("Town", "rock-wide", 11 + i * 2, 30 + i * 9, 0.5 - i * 0.04, i, -2.5)
		end
		addProp("Naval", "buoy", 5, 22, 0.5, 0, 0)
	elseif ev.kind == "rescue" then
		local raft = addProp("Terrain", "canoe", 9, 26, 0.5, math.pi / 2, 0) or addProp("Naval", "boat-row-small", 9, 26, 0.5, math.pi / 2, 0)
		local who = addProp("People", "Worker_Male", 4, 26, 0.5, 0, 1.2)
		if raft and who then
			who.follow = raft
		end
	elseif ev.kind == "island" then
		addProp("Terrain", "cliff-rock", 70, 150, 0.12, 0, -3)
		addProp("Terrain", "campfire-stones", 5, 128, 0.12, 0, 0.5)
		addProp("Terrain", "log-stack", 6, 124, 0.12, 0.5, 0.5)
		addProp("Terrain", "canoe", 9, 118, 0.12, 1.2, 0)
		for i = 1, 4 do
			addProp("Naval", "palm-detailed-straight", 16, 135 + i * 7, 0.12 + i * 0.006, i, -1)
		end
	elseif ev.kind == "ghost" then
		addProp("Naval", "ship-ghost", 18, -80, 0.35, math.pi, 0)
	elseif ev.kind == "blockade" then
		addProp("Naval", "ship-large", 20, -50, 0.45, math.pi, 0)
		addProp("Naval", "ship-medium", 16, 55, 0.45, math.pi, 0)
		addProp("Naval", "flag-high", 6, -50, 0.45, 0, 4)
	elseif ev.kind == "school" and info.place then
		for i = 1, 8 do
			local m = info.place(folder, "Cargo", "fish-large", ORIGIN, 4)
			if m then
				table.insert(fish, { m = m, side = 18 + (i % 4) * 9, phase = i * 0.8, along = (i - 4) * 14 })
			end
		end
	end

	-- 선단: 호위함이 뒤와 양옆에서 따라온다
	local escorts = {}
	for i = 1, math.min(3, info.escorts or 0) do
		local es = info.makeShip(folder, "caravel", ORIGIN + Vector3.new(0, 1.2, 0))
		pcall(function() es:ScaleTo(1.4) end)
		local ebase = es:GetPivot()
		local ey = restY(es)
		table.insert(escorts, { m = es, rot = CFrame.new(-ebase.Position) * ebase, y = ey, back = 34 + i * 12, side = ({ 28, -28, 52 })[i], phase = i * 1.7 })
	end
	-- 날씨 연출: 비·폭풍 예보면 처음부터 가랑비가 내리고 흐리다
	local wRain = nil
	if (info.weatherId == "rain" or info.weatherId == "storm") and not rain then
		local sky = part(folder, Vector3.new(160, 1, 160), CFrame.new(ORIGIN + Vector3.new(0, 90, 0)), Color3.new(0, 0, 0))
		sky.Transparency = 1
		local em = Instance.new("ParticleEmitter")
		em.Rate = if info.weatherId == "storm" then 600 else 260
		em.Lifetime = NumberRange.new(0.8, 1.1)
		em.Speed = NumberRange.new(110, 140)
		em.EmissionDirection = Enum.NormalId.Bottom
		em.SpreadAngle = Vector2.new(6, 6)
		em.Size = NumberSequence.new(0.3)
		em.Transparency = NumberSequence.new(0.4)
		em.Color = ColorSequence.new(Color3.fromRGB(190, 205, 225))
		em.Parent = sky
		wRain = sky
		Lighting.FogEnd = 1500
		Lighting.FogColor = Color3.fromRGB(150, 165, 180)
	end

	-- 카메라
	workspace:SetAttribute("VoyageActive", true)
	camera.CameraType = Enum.CameraType.Scriptable
	camera.FieldOfView = 66

	local function ui(k, t)
		bar.Size = UDim2.fromScale(k, 1)
		local day = math.clamp(math.ceil(k * info.days), 1, math.max(info.days, 1))
		dayLabel.Text = string.format("항해 %d일째 / %d일", day, info.days)
		Lighting.ClockTime = 8 + k * math.clamp(info.days * 1.6, 3, 11)
		_ = t
	end

	-- 페이드 인
	task.spawn(function()
		for i = 1, 12 do
			fade.BackgroundTransparency = i / 12
			task.wait(0.03)
		end
		fade.Visible = false
	end)

	local t = 0
	local yaw = yawOf(select(2, positionAt(pts, cum, 0)))
	local dist = 0
	local fading = false
	while not skipped and dist < total and gui.Parent do
		local dt = RunService.Heartbeat:Wait()
		t += dt
		dist = math.min(total, dist + speedNow * dt * (0.25 + 0.75 * math.min(t / 2, 1)))
		local pos, dir = positionAt(pts, cum, dist)
		-- 뱃머리는 부드럽게 항로 방향으로 돈다
		local targetYaw = yawOf(dir)
		local diff = (targetYaw - yaw + math.pi) % (math.pi * 2) - math.pi
		yaw += diff * math.min(1, dt * 2.2)
		heel += (math.clamp(diff, -0.6, 0.6) * 0.22 - heel) * math.min(1, dt * 2)
		applyShip(pos, yaw, t)
		do
			local fwd = Vector3.new(math.cos(yaw), 0, -math.sin(yaw))
			local rgt = Vector3.new(math.sin(yaw), 0, math.cos(yaw))
			sternPart.CFrame = CFrame.new(pos - fwd * shipLen * 0.45 + Vector3.new(0, 0.2, 0))
			bowPart.CFrame = CFrame.new(pos + fwd * shipLen * 0.5 + Vector3.new(0, 0.1, 0))
			bowEm.Rate = 20 + 30 * math.min(1, speedNow / 20)
			for i, tp in trailParts do
				local sgn = if i == 1 then 1 else -1
				tp.CFrame = CFrame.new(pos - fwd * shipLen * 0.4 + rgt * sgn * shipLen * 0.22 + Vector3.new(0, 0.12, 0)) * CFrame.Angles(0, yaw, 0)
			end
			fillChunksAround(pos, 1)
		end
		sea.CFrame = CFrame.new(pos.X, -1.6, pos.Z)

		for _, s in streaks do
			local d = s.Position - pos
			if d.X * d.X + d.Z * d.Z > 460 * 460 then
				scatter(s, pos, yaw, true)
			end
		end
		for _, c in clouds do
			c.offset += Vector3.new(6 * dt, 0, 0)
			local rel = c.offset
			-- 구름은 배 주변에서 다시 순환한다
			local p = Vector3.new(pos.X + ((rel.X + 1500) % 3000) - 1500, rel.Y, pos.Z + rel.Z)
			c.model:PivotTo(CFrame.new(p))
		end
		local k = dist / total
		if t > nextGull and k < 0.4 then
			nextGull = t + rng:NextNumber(6, 12)
			Sfx.play("sfx_gull", 0.35)
		end
		for _, g in gulls do
			local visible = k < 0.3
			g.model.Parent = if visible then folder else nil
			if visible then
				local a = t * g.speed + g.phase
				local gp = pos + Vector3.new(math.cos(a) * g.radius, g.height + math.sin(t + g.phase) * 2, math.sin(a) * g.radius)
				local cf = CFrame.lookAt(gp, gp + Vector3.new(-math.sin(a), 0, math.cos(a))) * CFrame.Angles(0, math.pi / 2, 0)
				local flap = math.sin(t * 8 + g.phase) * 0.6
				g.body.CFrame = cf
				g.l.CFrame = cf * CFrame.new(0, 0, -1) * CFrame.Angles(flap, 0, 0) * CFrame.new(0, 0, -0.6)
				g.r.CFrame = cf * CFrame.new(0, 0, 1) * CFrame.Angles(-flap, 0, 0) * CFrame.new(0, 0, 0.6)
			end
		end

		-- 사건
		local ek = (k - EVENT_AT) / EVENT_LEN
		local active = ek > 0 and ek < 1
		if active and not evSoundDone then
			evSoundDone = true
			local k2 = ev.kind
			if k2 == "pirates" then
				Sfx.play("sfx_horn")
			elseif k2 == "storm" then
				Sfx.play("sfx_creak")
			elseif k2 == "ghost" then
				Sfx.play("sfx_bell", 0.5, 0.7)
			elseif k2 == "merchant" or k2 == "blockade" then
				Sfx.play("sfx_horn", 0.6, 1.1)
			elseif k2 == "island" or k2 == "school" then
				Sfx.play("sfx_gull")
			elseif k2 == "reef" then
				Sfx.play("sfx_creak")
				Sfx.play("sfx_splash", 0.5)
			elseif k2 == "rescue" then
				Sfx.play("sfx_bell", 0.5)
			end
		end
		local intensity = if active then math.sin(ek * math.pi) else 0
		local right = Vector3.new(math.sin(yaw), 0, math.cos(yaw)) -- 뱃머리 기준 오른쪽(+Z 쪽)
		if rain then
			rain.emitter.Rate = intensity * 900
			rain.part.CFrame = CFrame.new(pos + Vector3.new(0, 90, 0))
			Lighting.FogEnd = 2600 - intensity * 1700
			Lighting.FogColor = Color3.fromRGB(176, 205, 232):Lerp(Color3.fromRGB(70, 80, 95), intensity)
			Lighting.ClockTime = 8 + k * 6 - intensity * 3
			sea.Color = Color3.fromRGB(28, 88, 140):Lerp(Color3.fromRGB(20, 44, 66), intensity)
			if intensity > 0.3 and t > lightning then
				lightning = t + rng:NextNumber(1.2, 3)
				task.spawn(function()
					Lighting.Ambient = Color3.fromRGB(255, 255, 255)
					task.wait(0.07)
					Lighting.Ambient = saved.ambient
				end)
			end
			-- 큰 파도에 배가 크게 흔들린다
			local rock = intensity
			ship:PivotTo(ship:GetPivot() * CFrame.Angles(math.sin(t * 2.1) * 0.09 * rock, 0, math.sin(t * 1.7) * 0.12 * rock))
		end
		if enemy then
			if active then
				-- 적선이 오른쪽 뒤에서 접근해 나란히 달린다
				local gap = 120 - 85 * math.min(1, ek * 2.2)
				local epos = pos + right * gap - Vector3.new(math.cos(yaw), 0, -math.sin(yaw)) * (40 * (1 - math.min(1, ek * 2)))
				local epose = CFrame.new(epos.X, enemyY + math.sin(t * 1.2) * 0.4, epos.Z) * CFrame.Angles(0, yaw + math.rad(8) * (1 - intensity), 0) * enemyRot
				enemy:PivotTo(epose)
				if ek > 0.35 and t > nextShot then
					nextShot = t + rng:NextNumber(0.25, 0.6)
					local fromEnemy = rng:NextNumber() < 0.5
					local at = if fromEnemy then epos - right * 6 + Vector3.new(0, 4, rng:NextNumber(-8, 8)) else pos + right * 6 + Vector3.new(0, 4, rng:NextNumber(-8, 8))
					cannonFlash(at)
					Sfx.play("sfx_cannon", 0.5 + rng:NextNumber() * 0.3)
				end
				if ev.won == false and ek > 0.8 then
					-- 패배: 적이 가까이에 남는다
				end
			else
				-- 사건이 끝나면 승리는 적선이 가라앉고, 패배는 곁을 지나쳐 멀어진다
				if k >= EVENT_AT + EVENT_LEN then
					local sink = math.clamp((k - EVENT_AT - EVENT_LEN) / 0.12, 0, 1)
					local epos = pos + right * 35 - Vector3.new(math.cos(yaw), 0, -math.sin(yaw)) * (if ev.won then 20 else 20 + sink * 300)
					local drop = if ev.won then sink * 18 else 0
					enemy:PivotTo(CFrame.new(epos.X, enemyY - drop, epos.Z) * CFrame.Angles(if ev.won then sink * 0.6 else 0, yaw, 0) * enemyRot)
				else
					enemy:PivotTo(CFrame.new(pos.X, -500, pos.Z) * enemyRot)
				end
			end
		end
		if barrel then
			-- 표류물: 진행 방향 앞에서 다가왔다 뒤로 지나간다
			local front = (EVENT_AT + EVENT_LEN / 2 - k) * total * 0.5
			local bp = pos + Vector3.new(math.cos(yaw), 0, -math.sin(yaw)) * front + right * 14
			barrel.CFrame = CFrame.new(bp.X, 0.3 + math.sin(t * 2) * 0.25, bp.Z) * CFrame.Angles(t * 0.4, t * 0.2, math.pi / 2)
		end
		for _, e in escorts do
			local fwd = Vector3.new(math.cos(yaw), 0, -math.sin(yaw))
			local rgt = Vector3.new(math.sin(yaw), 0, math.cos(yaw))
			local ep = pos - fwd * e.back + rgt * e.side
			e.m:PivotTo(CFrame.new(ep.X, e.y + math.sin(t * 1.2 + e.phase) * 0.4, ep.Z) * CFrame.Angles(0, yaw, 0) * CFrame.Angles(math.sin(t + e.phase) * 0.03, 0, math.sin(t * 0.8 + e.phase) * 0.05) * e.rot)
		end
		if wRain then
			wRain.CFrame = CFrame.new(pos + Vector3.new(0, 90, 0))
		end
		-- 사건 소품: 사건 구간에 가까워질 때만 보인다
		do
			local fwd = Vector3.new(math.cos(yaw), 0, -math.sin(yaw))
			local near = ek > -0.25 and ek < 1.25
			for _, pr in props do
				local target = pr.follow or pr
				local front = (EVENT_AT + EVENT_LEN / 2 - k) * total * target.along
				local p = pos + fwd * front + right * target.side
				if near then
					local y = pr.y + math.sin(t * 1.4 + target.side) * 0.3
					if pr.follow then
						y = pr.y + math.sin(t * 1.4 + target.side) * 0.3
					end
					pr.m:PivotTo(CFrame.new(p.X, y, p.Z) * CFrame.Angles(0, yaw + pr.yaw, 0))
				else
					pr.m:PivotTo(CFrame.new(p.X, -500, p.Z))
				end
			end
			for _, f in fish do
				local u = (t * 0.9 + f.phase) % 3 -- 3초 주기로 한 번 뛴다
				local jump = if u < 1 and active then math.sin(u * math.pi) else -1
				local p = pos + fwd * (f.along + (EVENT_AT + EVENT_LEN / 2 - k) * total * 0.3) + right * f.side
				f.m:PivotTo(CFrame.new(p.X, if jump >= 0 then jump * 7 + 0.5 else -500, p.Z) * CFrame.Angles(0, yaw + math.pi / 2, -(1 - jump) * 0.8))
			end
			if ev.kind == "fog" or ev.kind == "ghost" then
				Lighting.FogEnd = 2600 - intensity * (if ev.kind == "fog" then 2300 else 1900)
				Lighting.FogColor = Color3.fromRGB(176, 205, 232):Lerp(if ev.kind == "fog" then Color3.fromRGB(205, 210, 215) else Color3.fromRGB(110, 130, 150), intensity)
				atmosphere.Density = 0.25 + intensity * 0.4
			end
			banner.TextTransparency = 1 - math.clamp(intensity * 2.2, 0, 1)
			banner.TextStrokeTransparency = 1 - math.clamp(intensity * 1.6, 0, 0.6)
		end
		for i = #flashes, 1, -1 do
			local f = flashes[i]
			local age = os.clock() - f.born
			if age > 0.18 then
				f.part:Destroy()
				table.remove(flashes, i)
			else
				f.part.Transparency = 0.1 + age * 5
			end
		end

		-- 카메라: 배 뒤쪽 위에서 천천히 좌우로 돌며 비춘다
		camera = workspace.CurrentCamera or camera
		if camera.CameraType ~= Enum.CameraType.Scriptable then
			camera.CameraType = Enum.CameraType.Scriptable
		end
		camera.FieldOfView = 66
		local sway = math.sin(t * 0.25) * 0.9
		local back = CFrame.new(pos) * CFrame.Angles(0, yaw + sway, 0) * CFrame.new(-54, 19, 0)
		camera.CFrame = CFrame.lookAt(back.Position + Vector3.new(0, math.sin(t * 1.3) * 0.5, 0), pos + Vector3.new(0, 7 + math.sin(t * 1.3 + 0.6) * 0.4, 0))
		ui(k, t)

		if k > 0.93 and not fading then
			fading = true
			fade.Visible = true
			task.spawn(function()
				for i = 1, 10 do
					fade.BackgroundTransparency = 1 - i / 10
					task.wait(0.03)
				end
			end)
		end
	end

	-- 정리
	workspace:SetAttribute("VoyageActive", nil)
	camera.CameraType = saved.camType
	camera.FieldOfView = saved.camFov
	Lighting.ClockTime = saved.clock
	Lighting.FogEnd = saved.fogEnd
	Lighting.FogStart = saved.fogStart
	Lighting.FogColor = saved.fogColor
	Lighting.Ambient = saved.ambient
	atmosphere:Destroy()
	grade:Destroy()
	bloom:Destroy()
	rays:Destroy()
	-- 깔았던 물을 걷어 낸다
	for _, cf in filledChunks do
		pcall(function()
			terrain:FillBlock(cf, Vector3.new(CH, 8, CH), Enum.Material.Air)
		end)
	end
	pcall(function()
		terrain.WaterColor, terrain.WaterTransparency, terrain.WaterReflectance = savedWater.c, savedWater.t, savedWater.r
		terrain.WaterWaveSize, terrain.WaterWaveSpeed = savedWater.ws, savedWater.wsp
	end)
	folder:Destroy()
	gui:Destroy()
end

return VoyageScene
