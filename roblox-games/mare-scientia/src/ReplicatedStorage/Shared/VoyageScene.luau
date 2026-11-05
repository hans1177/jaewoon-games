--!nonstrict
-- 항해 장면 (3D 바다). 항구에서 멀리 떨어진 빈 공간에 바다를 만들고,
-- 내 배가 항로(위도·경도 점들)를 따라 실제로 달린다. 카메라가 배를 돌며 비춘다.
-- 낮에서 해질녘으로 시간이 흐르고, 구름·갈매기·물보라가 따라온다. 화면을 누르면 건너뛴다.

local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")

local VoyageScene = {}

local ORIGIN = Vector3.new(0, 0, 20000) -- 항구와 겹치지 않는 먼 곳
local SPEED = 70 -- 스터드/초
local STREAKS = 90
local CLOUDS = 16

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

-- info: { shipId, steam, days, path, fromName, toName, makeShip }
function VoyageScene.play(info)
	local player = Players.LocalPlayer
	local camera = workspace.CurrentCamera
	local duration = math.clamp(8 + info.days * 0.9, 10, 24)
	local pts, cum, total = worldPath(info.path, duration * SPEED * (if info.steam then 1.25 else 1))
	local speedNow = total / duration

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
	Lighting.FogColor = Color3.fromRGB(176, 205, 232)
	Lighting.FogStart = 600
	Lighting.FogEnd = 2600
	Lighting.ClockTime = 8

	-- 바다: 배를 따라다니는 큰 판
	local sea = part(folder, Vector3.new(7000, 2, 7000), CFrame.new(ORIGIN + Vector3.new(0, -1.6, 0)), Color3.fromRGB(28, 88, 140), Enum.Material.SmoothPlastic)
	sea.Name = "Sea"
	sea.Reflectance = 0.12

	-- 내 배
	local ship = info.makeShip(folder, info.shipId, ORIGIN + Vector3.new(0, 1.2, 0))
	ship.Name = "VoyageShip"
	local shipBase = ship:GetPivot()
	local wheels = {}
	for _, name in { "PaddleWheelPort", "PaddleWheelStarboard" } do
		local w = ship:FindFirstChild(name)
		if w and w:IsA("Model") then
			table.insert(wheels, { model = w, relative = shipBase:ToObjectSpace(w:GetPivot()) })
		end
	end
	local function shipPose(pos, yaw, t)
		return CFrame.new(pos.X, 1.2 + math.sin(t * 1.3) * 0.5, pos.Z) * CFrame.Angles(0, yaw, 0)
			* CFrame.Angles(math.sin(t * 0.9) * 0.03, 0, math.sin(t * 1.1) * 0.04)
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

	-- 카메라
	camera.CameraType = Enum.CameraType.Scriptable
	camera.FieldOfView = 62

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
		applyShip(pos, yaw, t)
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

		-- 카메라: 배 뒤쪽 위에서 천천히 좌우로 돌며 비춘다
		local sway = math.sin(t * 0.25) * 0.9
		local back = CFrame.new(pos) * CFrame.Angles(0, yaw + sway, 0) * CFrame.new(-60, 24, 0)
		camera.CFrame = CFrame.lookAt(back.Position, pos + Vector3.new(0, 7, 0))
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
	camera.CameraType = saved.camType
	camera.FieldOfView = saved.camFov
	Lighting.ClockTime = saved.clock
	Lighting.FogEnd = saved.fogEnd
	Lighting.FogStart = saved.fogStart
	Lighting.FogColor = saved.fogColor
	Lighting.Ambient = saved.ambient
	atmosphere:Destroy()
	folder:Destroy()
	gui:Destroy()
end

return VoyageScene
