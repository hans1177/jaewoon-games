--!nonstrict
-- 항구 3D 장면 (클라이언트 전용, 보기용). 도형(Part)으로 항구 마을·부두·배·갈매기를 만든다.
-- 항구마다 지역 양식(북유럽 / 지중해)과 시설(교역소, 조선소, 은행, 길드, 왕궁, 항만청)이 달라진다.
-- 판정에는 쓰이지 않는다. 시설 앞의 ProximityPrompt를 누르면 onFacility(탭 id)가 불린다.

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local PortScene = {}

local MED = { lisbon = true, seville = true, marseille = true, genoa = true, venice = true, livorno = true, naples = true }

local STYLE = {
	north = {
		walls = { Color3.fromRGB(150, 74, 56), Color3.fromRGB(196, 170, 130), Color3.fromRGB(120, 90, 70), Color3.fromRGB(220, 210, 190), Color3.fromRGB(170, 110, 80) },
		roofs = { Color3.fromRGB(60, 52, 50), Color3.fromRGB(110, 50, 40), Color3.fromRGB(70, 70, 80) },
		roofPitch = 1.0,
		ground = Color3.fromRGB(96, 128, 72),
		street = Color3.fromRGB(120, 116, 110),
	},
	med = {
		walls = { Color3.fromRGB(240, 232, 214), Color3.fromRGB(226, 196, 140), Color3.fromRGB(214, 150, 100), Color3.fromRGB(246, 240, 230), Color3.fromRGB(200, 170, 120) },
		roofs = { Color3.fromRGB(184, 92, 60), Color3.fromRGB(170, 80, 54), Color3.fromRGB(196, 110, 70) },
		roofPitch = 0.45,
		ground = Color3.fromRGB(176, 160, 110),
		street = Color3.fromRGB(196, 186, 160),
	},
}

local SHIP_LOOK = {
	caravel = { scale = 1.0, masts = 2, hull = Color3.fromRGB(110, 70, 40) },
	fluyt = { scale = 1.15, masts = 3, hull = Color3.fromRGB(96, 66, 44) },
	frigate = { scale = 1.3, masts = 3, hull = Color3.fromRGB(60, 50, 44), stripe = Color3.fromRGB(224, 170, 69) },
	galleon = { scale = 1.5, masts = 3, hull = Color3.fromRGB(120, 60, 36), stripe = Color3.fromRGB(200, 40, 40), castle = true },
	paddle_steamer = { scale = 1.3, masts = 1, hull = Color3.fromRGB(40, 40, 46), funnel = true, paddle = true },
	ironclad_frigate = { scale = 1.5, masts = 2, hull = Color3.fromRGB(90, 96, 104), funnel = true, metal = true },
}

-- 같은 항구는 늘 같은 마을이 되도록 항구 id로 난수를 만든다
local function seeded(id)
	local h = 0
	for i = 1, #id do
		h = (h * 31 + string.byte(id, i)) % 2147483647
	end
	return Random.new(h)
end

local function part(parent, size, cf, color, material, shape)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = true
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	if shape then
		p.Shape = shape
	end
	p.Parent = parent
	return p
end

local function wedge(parent, size, cf, color, material)
	local w = Instance.new("WedgePart")
	w.Anchored = true
	w.Size = size
	w.CFrame = cf
	w.Color = color
	w.Material = material or Enum.Material.SmoothPlastic
	w.TopSurface = Enum.SurfaceType.Smooth
	w.BottomSurface = Enum.SurfaceType.Smooth
	w.Parent = parent
	return w
end

-- 박공 지붕: 용마루가 X축을 따라간다. (w = X 길이, d = Z 깊이, h = 높이)
local function gableRoof(parent, center, w, d, h, color)
	wedge(parent, Vector3.new(w, h, d / 2), CFrame.new(center + Vector3.new(0, h / 2, -d / 4)), color)
	wedge(parent, Vector3.new(w, h, d / 2), CFrame.new(center + Vector3.new(0, h / 2, d / 4)) * CFrame.Angles(0, math.pi, 0), color)
end

local function sign(parent, adornee, text, color, height)
	local bb = Instance.new("BillboardGui")
	bb.Adornee = adornee
	bb.Size = UDim2.fromOffset(200, 44)
	bb.StudsOffset = Vector3.new(0, (height or 4) + 2.5, 0)
	bb.AlwaysOnTop = false
	bb.LightInfluence = 0
	bb.MaxDistance = 55
	local l = Instance.new("TextLabel")
	l.Size = UDim2.fromScale(1, 1)
	l.BackgroundColor3 = color or Color3.fromRGB(30, 34, 44)
	l.BackgroundTransparency = 0.05
	l.TextColor3 = Color3.new(1, 1, 1)
	l.Font = Enum.Font.GothamBold
	l.TextScaled = true
	l.TextWrapped = false
	l.Text = text
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(230, 196, 120)
	st.Thickness = 1.5
	st.Parent = l
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 8)
	c.Parent = l
	local pad = Instance.new("UIPadding")
	pad.PaddingLeft, pad.PaddingRight, pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 6), UDim.new(0, 6), UDim.new(0, 4), UDim.new(0, 4)
	pad.Parent = l
	l.Parent = bb
	bb.Parent = parent
	return bb
end

local function prompt(parent, at, objectText, actionText, tab, onFacility)
	local anchor = part(parent, Vector3.new(2, 2, 2), CFrame.new(at), Color3.new(1, 1, 1))
	anchor.Transparency = 1
	anchor.CanCollide = false
	local pp = Instance.new("ProximityPrompt")
	pp.ObjectText = objectText
	pp.ActionText = actionText
	pp.HoldDuration = 0
	pp.MaxActivationDistance = 12
	pp.RequiresLineOfSight = false
	pp.Parent = anchor
	pp.Triggered:Connect(function()
		onFacility(tab)
	end)
	return anchor
end

-- 공식 Studio Importer로 수입한 실제 GLB/OBJ/FBX 모델 우선 사용
-- 원본: roblox-games/mare-scientia/assets/, 수입본: ReplicatedStorage/MareAssets
local SHIP_MESH = {
	caravel = "ship-small", fluyt = "ship-medium",
	frigate = "ship-pirate-medium", galleon = "ship-large",
	paddle_steamer = "ship-pirate-small", ironclad_frigate = "ship-pirate-medium",
}

local function importedModel(parent, kind, asset, bottomPosition, desiredSize, solid, tint)
	local library = ReplicatedStorage:FindFirstChild("MareAssets")
	local group = library and library:FindFirstChild(kind)
	local template = group and group:FindFirstChild(asset)
	if not template or not template:IsA("Model") then return nil end
	local m = template:Clone()
	local hasParts = false
	for _, p in m:GetDescendants() do
		if p:IsA("BasePart") then
			hasParts = true
			p.Anchored = true
			p.CanCollide = solid == true
			p.CanTouch = false
			if tint and p:IsA("MeshPart") then p.Color = tint end
		end
	end
	if not hasParts then m:Destroy(); return nil end
	local ok, err = pcall(function()
		m.Parent = parent
		local _, ext = m:GetBoundingBox()
		local axis = if kind == "People" or asset == "chimney" then ext.Y else math.max(ext.X, ext.Z)
		if axis < 0.01 then error("빈 모델") end
		local scale = desiredSize / axis
		if scale < 0.01 or scale > 100 then error("비정상적인 모델 배율") end
		m:ScaleTo(scale)
		if kind ~= "People" then
			local _, size = m:GetBoundingBox()
			if size.Z > size.X then m:PivotTo(CFrame.Angles(0, math.pi / 2, 0) * m:GetPivot()) end
		end
		local center, size = m:GetBoundingBox()
		local bottom = Vector3.new(center.Position.X, center.Position.Y - size.Y / 2, center.Position.Z)
		m:PivotTo(CFrame.new(bottomPosition - bottom) * m:GetPivot())
	end)
	if not ok then
		warn("[MareScientia] 모델 수입본 배치 오류", kind, asset, err)
		m:Destroy()
		return nil
	end
	return m
end

-- 주민 NPC: 다리·몸통·팔·머리·얼굴·모자를 나눠 만든 사람 모양
local SKINS = { Color3.fromRGB(242, 205, 170), Color3.fromRGB(214, 165, 125), Color3.fromRGB(176, 125, 90), Color3.fromRGB(128, 88, 62) }
local HAIRS = { Color3.fromRGB(40, 28, 20), Color3.fromRGB(96, 62, 34), Color3.fromRGB(176, 130, 66), Color3.fromRGB(150, 150, 150), Color3.fromRGB(20, 18, 18) }
local PEOPLE_ROLES = { "Pirate_Male", "Pirate_Female", "Worker_Male", "Worker_Female", "Casual_Male", "Casual_Female", "OldClassy_Male", "OldClassy_Female" }
local KEEPER_ROLE = {
	["교역소"] = "Rogue", ["주점"] = "Barbarian", ["항만청"] = "Knight", ["은행"] = "Mage",
	["상인 길드"] = "Rogue_Hooded", ["학자의 서재"] = "Mage", ["도서관 (도감)"] = "Mage",
}
local function villager(parent, pos, facing, coat, rng, role)
	-- 직업 NPC(시설 담당·이야기 손님)는 등록된 KayKit CC0 모델을 쓰고, 없으면 아래 코드 모양을 쓴다
	role = role or ({ "Knight", "Barbarian", "Mage", "Rogue", "Rogue_Hooded" })[rng:NextInteger(1, 5)]
	if role then
		local figure = importedModel(parent, "People", "KayKit_" .. role, pos, 5.8, false)
		if figure then
			figure.Name = "Villager"
			figure:PivotTo(figure:GetPivot() * CFrame.Angles(0, facing + math.pi, 0))
			return figure
		end
	end
	local m = Instance.new("Model")
	m.Name = "Villager"
	local skin = SKINS[rng:NextInteger(1, #SKINS)]
	local hair = HAIRS[rng:NextInteger(1, #HAIRS)]
	local pants = Color3.fromRGB(rng:NextInteger(36, 90), rng:NextInteger(32, 76), rng:NextInteger(30, 70))
	local base = CFrame.new(pos) * CFrame.Angles(0, facing, 0)
	local function at(x, y, z)
		return base * CFrame.new(x, y, z)
	end
	-- 다리와 신발
	part(m, Vector3.new(0.85, 1.7, 0.95), at(-0.5, 1.15, 0), pants, Enum.Material.Fabric)
	part(m, Vector3.new(0.85, 1.7, 0.95), at(0.5, 1.15, 0), pants, Enum.Material.Fabric)
	part(m, Vector3.new(0.95, 0.5, 1.25), at(-0.5, 0.25, -0.1), Color3.fromRGB(38, 28, 22), Enum.Material.Leather)
	part(m, Vector3.new(0.95, 0.5, 1.25), at(0.5, 0.25, -0.1), Color3.fromRGB(38, 28, 22), Enum.Material.Leather)
	-- 몸통(겉옷), 허리띠, 옷깃
	part(m, Vector3.new(2.1, 2.1, 1.15), at(0, 3.05, 0), coat, Enum.Material.Fabric)
	part(m, Vector3.new(2.2, 0.35, 1.25), at(0, 2.2, 0), Color3.fromRGB(70, 48, 28), Enum.Material.Leather)
	part(m, Vector3.new(0.5, 0.5, 0.2), at(0, 2.2, -0.65), Color3.fromRGB(214, 170, 82), Enum.Material.Metal)
	part(m, Vector3.new(1.5, 0.45, 1.25), at(0, 4.15, 0), Color3.fromRGB(235, 232, 222), Enum.Material.Fabric)
	-- 팔과 손
	part(m, Vector3.new(0.75, 1.9, 0.85), at(-1.5, 3.0, 0), coat, Enum.Material.Fabric)
	part(m, Vector3.new(0.75, 1.9, 0.85), at(1.5, 3.0, 0), coat, Enum.Material.Fabric)
	part(m, Vector3.new(0.7, 0.7, 0.7), at(-1.5, 1.85, 0), skin, Enum.Material.SmoothPlastic, Enum.PartType.Ball)
	part(m, Vector3.new(0.7, 0.7, 0.7), at(1.5, 1.85, 0), skin, Enum.Material.SmoothPlastic, Enum.PartType.Ball)
	-- 머리, 얼굴, 머리카락
	local head = part(m, Vector3.new(1.55, 1.55, 1.55), at(0, 5.0, 0), skin, Enum.Material.SmoothPlastic, Enum.PartType.Ball)
	local face = Instance.new("Decal")
	face.Texture = "rbxasset://textures/face.png"
	face.Face = Enum.NormalId.Front
	face.Parent = head
	part(m, Vector3.new(1.62, 0.9, 1.62), at(0, 5.35, 0.12), hair, Enum.Material.SmoothPlastic, Enum.PartType.Ball)
	-- 모자: 삼각모, 챙모자, 두건 중 하나
	local hat = rng:NextInteger(1, 4)
	local hatColor = Color3.fromRGB(rng:NextInteger(24, 70), rng:NextInteger(22, 56), rng:NextInteger(22, 56))
	if hat == 1 then
		part(m, Vector3.new(2.5, 0.25, 2.5), at(0, 5.75, 0), hatColor, Enum.Material.Fabric)
		part(m, Vector3.new(1.5, 0.7, 1.5), at(0, 6.1, 0), hatColor, Enum.Material.Fabric)
		part(m, Vector3.new(2.5, 0.25, 0.3), at(0, 5.9, -1.2), Color3.fromRGB(214, 170, 82), Enum.Material.Metal)
	elseif hat == 2 then
		part(m, Vector3.new(1.9, 0.2, 1.9), at(0, 5.65, 0), hatColor, Enum.Material.Fabric)
		part(m, Vector3.new(1.45, 0.6, 1.45), at(0, 5.95, 0), hatColor, Enum.Material.Fabric)
	elseif hat == 3 then
		part(m, Vector3.new(1.75, 0.8, 1.75), at(0, 5.55, 0.05), Color3.fromRGB(190, 60, 50), Enum.Material.Fabric, Enum.PartType.Ball)
	end
	m.Parent = parent
	return m
end

local function house(parent, pos, w, d, floors, style, rng, wallColor)
	-- 벽 색을 먼저 정해, 수입한 집 메쉬 전체에 같은 따뜻한 색을 입힌다 (회색 맨몸 집 방지)
	local tintColor = wallColor or style.walls[rng:NextInteger(1, #style.walls)]
	local mesh = importedModel(parent, "Town", "house", pos, math.max(w, d), true, tintColor)
	if mesh then
		mesh.Name = "HarborHouse"
		return mesh:FindFirstChildWhichIsA("BasePart", true)
	end
	local wall = style.walls[rng:NextInteger(1, #style.walls)]
	local roof = style.roofs[rng:NextInteger(1, #style.roofs)]
	local h = floors * 6
	local body = part(parent, Vector3.new(w, h, d), CFrame.new(pos + Vector3.new(0, h / 2, 0)), wall, Enum.Material.Brick)
	if style == STYLE.med then
		body.Material = Enum.Material.Concrete
	end
	gableRoof(parent, pos + Vector3.new(0, h, 0), w + 1, d + 1, d * 0.5 * style.roofPitch, roof)
	-- 창문과 문
	for f = 1, floors do
		for i = -1, 1, 2 do
			part(parent, Vector3.new(1.4, 1.8, 0.2), CFrame.new(pos + Vector3.new(i * w / 4, (f - 1) * 6 + 3.6, -d / 2 - 0.1)), Color3.fromRGB(60, 80, 100), Enum.Material.Glass)
		end
	end
	part(parent, Vector3.new(1.8, 3.2, 0.2), CFrame.new(pos + Vector3.new(0, 1.6, -d / 2 - 0.1)), Color3.fromRGB(80, 50, 30), Enum.Material.Wood)
	return body
end

-- 배 모델 (부두 옆에 정박). 배 종류마다 크기·돛대·굴뚝이 다르다.
local function buildShip(parent, shipId, at)
	local look = SHIP_LOOK[shipId] or SHIP_LOOK.caravel
	local s = look.scale
	local bottom = Vector3.new(at.X, at.Y - 2 * s, at.Z)
	-- 선박 ID별 완제품 Mesh가 있으면 그것을 우선한다. 없으면 원본 선체와 실제 Mesh 소품을 조합한다.
	local dedicated = importedModel(parent, "Ships", shipId, bottom, 26 * s, false, look.metal and look.hull or nil)
	local shipMesh = dedicated or importedModel(parent, "Naval", SHIP_MESH[shipId] or "ship-small", bottom, 26 * s, false, look.metal and look.hull or nil)
	if shipMesh then
		shipMesh.Name = "Ship"
		if not dedicated then
			-- 대포, 선루, 굴뚝, 장갑판 모두 실제 수입한 3D Mesh 모델을 조합한다.
			if shipId == "frigate" or shipId == "galleon" or shipId == "ironclad_frigate" then
				for side = -1, 1, 2 do
					for i = -1, 1 do
						importedModel(shipMesh, "Naval", "cannon", at + Vector3.new(i * 7 * s, 2 * s, side * 4.6 * s), 3.3 * s, false)
					end
				end
			end
			if look.funnel then
				local funnelPositions = if look.metal then { -5, 4 } else { -2 }
				for _, x in funnelPositions do
					local position = at + Vector3.new(x * s, 2.8 * s, 0)
					local chimney = importedModel(shipMesh, "Town", "chimney", position, (if look.metal then 6 else 8) * s, false, look.hull)
					local emitterPart = chimney and chimney:FindFirstChildWhichIsA("BasePart", true)
					if emitterPart then
						local smoke = Instance.new("Smoke")
						smoke.Name = "EngineSmoke"
						smoke.Color = Color3.fromRGB(88, 86, 83)
						smoke.Size = (if look.metal then 3.5 else 4.5) * s
						smoke.Opacity = 0.27
						smoke.RiseVelocity = 5
						smoke.Parent = emitterPart
					end
				end
			end
			if shipId == "paddle_steamer" then
				-- 외륜 증기선: 별도 조타실 + 좌우 두 외륜.
				-- 링은 Kenney 분수 Mesh를 세워 회전시키고, 목재 날개는 난간 Mesh를 방사상으로 재배열한다.
				importedModel(shipMesh, "Town", "wall-window-shutters", at + Vector3.new(-7 * s, 3 * s, 0), 8 * s, false, Color3.fromRGB(178, 151, 116))
				for side = -1, 1, 2 do
					local center = at + Vector3.new(1.5 * s, 1.1 * s, side * 5.3 * s)
					local wheel = Instance.new("Model")
					wheel.Name = if side == -1 then "PaddleWheelPort" else "PaddleWheelStarboard"
					wheel.Parent = shipMesh
					local rim = importedModel(wheel, "Town", "fountain-round", center, 8 * s, false, Color3.fromRGB(140, 92, 55))
					if rim then
						local rimCenter = rim:GetBoundingBox()
						rim:PivotTo(CFrame.new(center) * CFrame.Angles(math.pi / 2, 0, 0) * CFrame.new(-rimCenter.Position) * rim:GetPivot())
					end
					local paddleCount = 8
					for i = 0, paddleCount - 1 do
						local blade = importedModel(wheel, "Town", "fence", center, 5.5 * s, false, Color3.fromRGB(125, 74, 42))
						if blade then
							local bladeCenter = blade:GetBoundingBox()
							local angle = i * (math.pi * 2 / paddleCount)
							blade:PivotTo(CFrame.new(center) * CFrame.Angles(0, 0, angle) * CFrame.new(3.2 * s, 0, 0)
								* CFrame.Angles(0, 0, math.pi / 2) * CFrame.new(-bladeCenter.Position) * blade:GetPivot())
						end
					end
					if #wheel:GetChildren() > 0 then
						wheel.WorldPivot = CFrame.new(center)
					else
						wheel:Destroy()
					end
				end
			elseif shipId == "ironclad_frigate" then
				-- 철갑 증기 프리깃: 실제 석재 벽 Mesh를 철색 장갑판으로 변형해 선측에 배치한다.
				-- 복제 Mesh만 사용하므로 대포 위력·선체 체력·속도·저장 데이터는 바꾸지 않는다.
				local armor = Color3.fromRGB(91, 103, 112)
				for side = -1, 1, 2 do
					for i = -1, 1 do
						importedModel(shipMesh, "Town", "wall",
							at + Vector3.new(i * 9 * s, -0.8 * s, side * 5.1 * s), 10.2 * s, false, armor)
					end
				end
				importedModel(shipMesh, "Town", "wall-window-shutters", at + Vector3.new(-9 * s, 3.7 * s, 0), 8 * s, false, armor)
			end
		end
		return shipMesh
	end
	-- 미수입 환경에서는 기존 외형과 플레이 기능을 보존한다.
	local m = Instance.new("Model")
	m.Name = "Ship"
	local L, W, H = 26 * s, 8 * s, 4 * s
	local base = CFrame.new(at)
	local mat = if look.metal then Enum.Material.DiamondPlate else Enum.Material.WoodPlanks
	local hull = part(m, Vector3.new(L, H, W), base * CFrame.new(0, 0, 0), look.hull, mat)
	m.PrimaryPart = hull
	-- 뱃머리(+X)와 고물
	wedge(m, Vector3.new(W, H, 6 * s), base * CFrame.new(L / 2 + 3 * s, 0, 0) * CFrame.Angles(0, -math.pi / 2, 0), look.hull, mat)
	part(m, Vector3.new(L, 0.4, W - 0.6), base * CFrame.new(0, H / 2 + 0.2, 0), Color3.fromRGB(176, 140, 96), Enum.Material.WoodPlanks)
	if look.stripe then
		part(m, Vector3.new(L + 0.2, 0.5, W + 0.2), base * CFrame.new(0, H / 4, 0), look.stripe)
	end
	if look.castle then
		part(m, Vector3.new(6 * s, 3 * s, W), base * CFrame.new(-L / 2 + 3 * s, H / 2 + 1.5 * s, 0), look.hull, mat)
	end
	-- 대포 구멍
	for i = 1, 4 do
		for side = -1, 1, 2 do
			part(m, Vector3.new(1, 0.8, 0.2), base * CFrame.new(-L / 2 + i * L / 5, 0.3, side * (W / 2 + 0.05)), Color3.fromRGB(20, 20, 20))
		end
	end
	-- 돛대와 돛
	local mastH = 22 * s
	for i = 1, look.masts do
		local x = if look.masts == 1 then 0 else (-L / 2 + 4 * s) + (i - 1) * (L - 8 * s) / (look.masts - 1)
		part(m, Vector3.new(mastH, 0.9, 0.9), base * CFrame.new(x, H / 2 + mastH / 2, 0) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(70, 46, 30), Enum.Material.Wood, Enum.PartType.Cylinder)
		if not look.funnel or i > 1 or look.masts > 1 then
			for k = 0, 1 do
				local sw = (W + 6 * s) * (1 - k * 0.2)
				part(m, Vector3.new(0.3, 6 * s, sw), base * CFrame.new(x + 0.5, H / 2 + 6 * s + k * 7 * s, 0), Color3.fromRGB(240, 234, 216), Enum.Material.Fabric)
				part(m, Vector3.new(0.6, 0.6, sw + 1), base * CFrame.new(x + 0.4, H / 2 + 9.2 * s + k * 7 * s, 0), Color3.fromRGB(70, 46, 30), Enum.Material.Wood)
			end
		end
		if i == 1 then
			part(m, Vector3.new(0.2, 1.4, 2.4), base * CFrame.new(x, H / 2 + mastH + 0.6, 1.2), Color3.fromRGB(200, 40, 40), Enum.Material.Fabric)
		end
	end
	if look.funnel then
		part(m, Vector3.new(7 * s, 2.4 * s, 2.4 * s), base * CFrame.new(L * 0.1, H / 2 + 3.5 * s, 0) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(30, 30, 34), Enum.Material.Metal, Enum.PartType.Cylinder)
		part(m, Vector3.new(0.6, 2.5 * s, 2.5 * s), base * CFrame.new(L * 0.1, H / 2 + 7 * s, 0) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(200, 40, 40), Enum.Material.Metal, Enum.PartType.Cylinder)
	end
	if look.paddle then
		for side = -1, 1, 2 do
			part(m, Vector3.new(2, 9 * s, 9 * s), base * CFrame.new(0, 0.5, side * (W / 2 + 1)) * CFrame.Angles(0, math.pi / 2, 0), Color3.fromRGB(150, 40, 40), Enum.Material.Wood, Enum.PartType.Cylinder)
		end
	end
	for _, p in m:GetDescendants() do
		if p:IsA("BasePart") then
			p.CanCollide = false
		end
	end
	m.Parent = parent
	return m
end

-- 장면 만들기. info: { portId, portName, shipId, hasShipyard, facilities = { "bank", ... }, storyCount }
-- 돌려주는 값: { folder, spawn = 캐릭터를 둘 위치, stop = 애니메이션 정지 함수 }
function PortScene.build(info, onFacility)
	local old = workspace:FindFirstChild("PortScene")
	if old then
		old:Destroy()
	end
	local folder = Instance.new("Folder")
	folder.Name = "PortScene"
	local style = if MED[info.portId] then STYLE.med else STYLE.north
	local rng = seeded(info.portId)
	local fac = {}
	for _, k in info.facilities or {} do
		fac[k] = true
	end

	local plate = workspace:FindFirstChild("Baseplate")
	if plate then
		plate.Color = style.ground
		plate.Material = Enum.Material.Grass
	else
		-- 로블록스 기본 Baseplate가 없는 빌드: 항구 땅(서쪽)과 바다 밑바닥을 직접 만든다
		local land = part(folder, Vector3.new(900, 4, 900), CFrame.new(-430, -2, 0), style.ground, Enum.Material.Grass)
		land.Name = "Ground"
		part(folder, Vector3.new(1400, 4, 1000), CFrame.new(430, -12, 0), Color3.fromRGB(176, 160, 120), Enum.Material.Sand)
	end

	-- 바다(동쪽, x > 20)와 부두
	local water = part(folder, Vector3.new(240, 1, 512), CFrame.new(140, 0.3, 0), Color3.fromRGB(32, 118, 160), Enum.Material.Glass)
	water.Transparency = 0.28
	water.Reflectance = 0.1
	water.CanCollide = false
	part(folder, Vector3.new(8, 2, 300), CFrame.new(18, 0, 0), Color3.fromRGB(130, 126, 120), Enum.Material.Cobblestone)
	local dock = part(folder, Vector3.new(60, 0.8, 10), CFrame.new(50, 1.6, 0), Color3.fromRGB(150, 110, 70), Enum.Material.WoodPlanks)
	if false and importedModel(folder, "Naval", "structure-platform-dock", Vector3.new(50, 1.6, 0), 60, false) then
		-- 실제 메쉬를 보여주면서 기존 부두의 안전한 보행 판정은 유지.
		dock.Transparency = 1
	end
	for x = 24, 78, 9 do
		for side = -1, 1, 2 do
			part(folder, Vector3.new(1.2, 6, 1.2), CFrame.new(x, -1, side * 4.6), Color3.fromRGB(90, 64, 40), Enum.Material.Wood, Enum.PartType.Cylinder).CFrame = CFrame.new(x, -1, side * 4.6) * CFrame.Angles(0, 0, math.pi / 2)
		end
	end
	-- 바다 쪽 보이지 않는 벽: 해안선과 부두 옆·끝을 막아 바닷속으로 떨어지지 않게 한다
	do
		local function wall(size, cf)
			local w = part(folder, size, cf, Color3.new(1, 1, 1))
			w.Transparency = 1
			w.CanQuery = false
			w.CastShadow = false
		end
		wall(Vector3.new(1, 40, 440), CFrame.new(22.5, 18, 225.5))
		wall(Vector3.new(1, 40, 440), CFrame.new(22.5, 18, -225.5))
		wall(Vector3.new(66, 40, 1), CFrame.new(56, 18, 5.6))
		wall(Vector3.new(66, 40, 1), CFrame.new(56, 18, -5.6))
		wall(Vector3.new(1, 40, 12), CFrame.new(89.5, 18, 0))
		wall(Vector3.new(1, 40, 900), CFrame.new(-600, 18, 0))
		wall(Vector3.new(1200, 40, 1), CFrame.new(0, 18, 440))
		wall(Vector3.new(1200, 40, 1), CFrame.new(0, 18, -440))
	end
	-- 화물(상자, 통)
	for i = 1, 8 do
		local x = rng:NextNumber(24, 74)
		local z = rng:NextNumber(-3.5, 3.5)
		if rng:NextNumber() < 0.5 then
			part(folder, Vector3.new(2.2, 2.2, 2.2), CFrame.new(x, 3.1, z) * CFrame.Angles(0, rng:NextNumber(0, 1), 0), Color3.fromRGB(160, 120, 70), Enum.Material.WoodPlanks)
		else
			part(folder, Vector3.new(2.4, 1.8, 1.8), CFrame.new(x, 3.2, z) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(120, 76, 44), Enum.Material.Wood, Enum.PartType.Cylinder)
		end
	end
	-- 등대 (부두 끝)
	local lh = part(folder, Vector3.new(18, 6, 6), CFrame.new(84, 9, 0) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(236, 232, 224), Enum.Material.Concrete, Enum.PartType.Cylinder)
	part(folder, Vector3.new(10, 8, 10), CFrame.new(84, -1, 0), Color3.fromRGB(130, 126, 120), Enum.Material.Slate)
	part(folder, Vector3.new(3, 5, 5), CFrame.new(84, 19.5, 0) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(255, 230, 140), Enum.Material.Neon, Enum.PartType.Cylinder)
	part(folder, Vector3.new(6.5, 1, 6.5), CFrame.new(84, 22.5, 0), Color3.fromRGB(180, 40, 40))
	_ = lh

	-- 항구 이름 간판 (부두 입구)
	local gate = part(folder, Vector3.new(1, 10, 1), CFrame.new(22, 5, -6), Color3.fromRGB(90, 64, 40), Enum.Material.Wood)
	part(folder, Vector3.new(1, 10, 1), CFrame.new(22, 5, 6), Color3.fromRGB(90, 64, 40), Enum.Material.Wood)
	part(folder, Vector3.new(1.2, 1.2, 13), CFrame.new(22, 10, 0), Color3.fromRGB(90, 64, 40), Enum.Material.Wood)
	sign(folder, gate, info.portName, Color3.fromRGB(150, 110, 40), 7)
	prompt(folder, Vector3.new(60, 4, 0), "부두", "출항 준비 (지도)", "map", onFacility)

	-- 내 배
	local ship = buildShip(folder, info.shipId, Vector3.new(50, 1.2, 16))

	-- 광장
	part(folder, Vector3.new(36, 0.3, 36), CFrame.new(-6, 0.15, 0), style.street, Enum.Material.Cobblestone)
	part(folder, Vector3.new(130, 0.25, 10), CFrame.new(-80, 0.13, 0), style.street, Enum.Material.Cobblestone)
	-- 시설 앞 큰 광장과 주택가 골목: 동선이 눈에 보이도록 돌바닥을 깐다
	part(folder, Vector3.new(96, 0.3, 50), CFrame.new(-34, 0.14, 0), style.street, Enum.Material.Cobblestone)
	for _, sz in { 57, -57 } do
		part(folder, Vector3.new(120, 0.25, 6), CFrame.new(-92, 0.12, sz), style.street, Enum.Material.Cobblestone)
	end
	for _, sx in { -50, -90, -130 } do
		part(folder, Vector3.new(5, 0.25, 130), CFrame.new(sx, 0.12, 0), style.street, Enum.Material.Cobblestone)
	end
	-- 광장 분수도 CC0 수입 메쉬 우선
	if true then
		part(folder, Vector3.new(2, 8, 8), CFrame.new(-8, 1, 0) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(200, 196, 186), Enum.Material.Marble, Enum.PartType.Cylinder)
		part(folder, Vector3.new(2.2, 6.5, 6.5), CFrame.new(-8, 1.2, 0) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(80, 150, 200), Enum.Material.Glass, Enum.PartType.Cylinder)
	end

	-- 시설 건물: { 이름, 탭, 위치, 크기, 벽색 }
	local facilities = {
		{ name = "교역소", tab = "trade", pos = Vector3.new(-10, 0, 28), w = 20, d = 12, floors = 1, color = Color3.fromRGB(176, 120, 60), always = true },
		{ name = "주점", tab = "quest", pos = Vector3.new(-10, 0, -28), w = 14, d = 12, floors = 2, color = Color3.fromRGB(120, 76, 44), always = true },
		{ name = "항만청", tab = "route", pos = Vector3.new(6, 0, 46), w = 12, d = 10, floors = 2, color = Color3.fromRGB(90, 110, 140), key = "harbormaster" },
		{ name = "은행", tab = "harbor", pos = Vector3.new(-34, 0, 28), w = 14, d = 12, floors = 2, color = Color3.fromRGB(220, 214, 200), key = "bank" },
		{ name = "상인 길드", tab = "trade", pos = Vector3.new(-34, 0, -28), w = 14, d = 12, floors = 2, color = Color3.fromRGB(150, 120, 90), key = "guild" },
		{ name = "학자의 서재", tab = "tech", pos = Vector3.new(-58, 0, 28), w = 14, d = 12, floors = 2, color = Color3.fromRGB(120, 100, 140), always = true },
		{ name = "도서관 (도감)", tab = "codex", pos = Vector3.new(-58, 0, -28), w = 14, d = 12, floors = 2, color = Color3.fromRGB(100, 120, 110), always = true },
	}
	for _, f in facilities do
		if f.always or (f.key and fac[f.key]) then
			local body = house(folder, f.pos, f.w, f.d, f.floors, style, rng, f.color)
			-- 문이 광장(가운데 길) 쪽을 보도록: 위쪽 줄은 -Z, 아래쪽 줄은 +Z 방향 입구
			local doorZ = if f.pos.Z > 0 then f.pos.Z - f.d / 2 - 2 else f.pos.Z + f.d / 2 + 2
			sign(folder, body, f.name, nil, f.floors * 3 + 6)
			prompt(folder, Vector3.new(f.pos.X, 3, doorZ), f.name, "들어가기", f.tab, onFacility)
			villager(folder, Vector3.new(f.pos.X + 3, 0, doorZ), if f.pos.Z > 0 then 0 else math.pi, Color3.fromRGB(rng:NextInteger(60, 160), rng:NextInteger(50, 120), rng:NextInteger(40, 110)), rng, KEEPER_ROLE[f.name] or "Knight")
		end
	end

	-- 조선소: 남쪽 물가의 경사 선대와 짓고 있는 배의 뼈대
	if info.hasShipyard then
		part(folder, Vector3.new(30, 1, 14), CFrame.new(24, 0.6, -48) * CFrame.Angles(0, 0, math.rad(-6)), Color3.fromRGB(140, 104, 66), Enum.Material.WoodPlanks)
		for i = 0, 6 do
			part(folder, Vector3.new(0.8, 8, 0.8), CFrame.new(14 + i * 3, 4.5, -48) * CFrame.Angles(math.rad(90), 0, 0) * CFrame.Angles(0, 0, 0), Color3.fromRGB(110, 76, 44), Enum.Material.Wood)
		end
		part(folder, Vector3.new(22, 1, 1), CFrame.new(23, 1.6, -48), Color3.fromRGB(110, 76, 44), Enum.Material.Wood)
		local shed = house(folder, Vector3.new(0, 0, -50), 14, 12, 2, style, rng, Color3.fromRGB(150, 118, 84))
		sign(folder, shed, "조선소", Color3.fromRGB(90, 60, 30), 12)
		prompt(folder, Vector3.new(8, 3, -50), "조선소", "들어가기", "yard", onFacility)
	end

	-- 왕궁: 큰길 끝
	if fac.palace then
		local px = -150
		local body = part(folder, Vector3.new(30, 18, 50), CFrame.new(px, 9, 0), Color3.fromRGB(236, 228, 210), Enum.Material.Marble)
		part(folder, Vector3.new(32, 1.5, 52), CFrame.new(px, 18.7, 0), Color3.fromRGB(200, 170, 110), Enum.Material.Marble)
		for z = -20, 20, 8 do
			part(folder, Vector3.new(16, 2, 2), CFrame.new(px + 16, 8, z) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(246, 242, 232), Enum.Material.Marble, Enum.PartType.Cylinder)
		end
		part(folder, Vector3.new(14, 14, 14), CFrame.new(px, 22, 0) * CFrame.Angles(0, 0, 0), Color3.fromRGB(110, 140, 170), Enum.Material.Metal, Enum.PartType.Ball)
		part(folder, Vector3.new(0.4, 6, 4), CFrame.new(px, 33, 2), Color3.fromRGB(180, 30, 40), Enum.Material.Fabric)
		sign(folder, body, "왕궁", Color3.fromRGB(150, 110, 40), 16)
		prompt(folder, Vector3.new(px + 20, 3, 0), "왕궁", "알현하기", "harbor", onFacility)
	end

	-- 성당 종탑
	do
		local cx, cz = -84, 40
		part(folder, Vector3.new(8, 30, 8), CFrame.new(cx, 15, cz), if style == STYLE.med then Color3.fromRGB(230, 214, 180) else Color3.fromRGB(140, 130, 120), Enum.Material.Brick)
		wedge(folder, Vector3.new(8, 10, 4), CFrame.new(cx, 35, cz - 2), Color3.fromRGB(60, 80, 70))
		wedge(folder, Vector3.new(8, 10, 4), CFrame.new(cx, 35, cz + 2) * CFrame.Angles(0, math.pi, 0), Color3.fromRGB(60, 80, 70))
		part(folder, Vector3.new(16, 14, 24), CFrame.new(cx - 12, 7, cz), if style == STYLE.med then Color3.fromRGB(236, 224, 196) else Color3.fromRGB(150, 140, 128), Enum.Material.Brick)
	end

	-- 암스테르담·안트베르펀·함부르크에는 풍차
	if info.portId == "amsterdam" or info.portId == "antwerp" or info.portId == "hamburg" then
		local mx, mz = -100, -60
		part(folder, Vector3.new(14, 10, 10), CFrame.new(mx, 7, mz) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(110, 80, 60), Enum.Material.WoodPlanks, Enum.PartType.Cylinder)
		local hub = part(folder, Vector3.new(1, 1, 1), CFrame.new(mx + 5.5, 12, mz), Color3.fromRGB(60, 40, 30))
		hub.Name = "MillHub"
		for k = 0, 3 do
			local blade = part(folder, Vector3.new(0.4, 12, 2.2), CFrame.new(mx + 5.8, 12, mz) * CFrame.Angles(math.rad(k * 90), 0, 0) * CFrame.new(0, 6, 0), Color3.fromRGB(230, 220, 200), Enum.Material.Fabric)
			blade.Name = "MillBlade"
		end
	end

	-- 주택가: 큰길 양옆과 뒤쪽 블록
	for row = 0, 3 do
		for col = 0, 6 do
			local x = -30 - col * 16
			local z = (if row < 2 then 1 else -1) * (48 + (row % 2) * 18)
			if rng:NextNumber() < 0.85 then
				local w = if info.portId == "amsterdam" then rng:NextNumber(6, 8) else rng:NextNumber(9, 13)
				house(folder, Vector3.new(x + rng:NextNumber(-2, 2), 0, z), w, rng:NextNumber(8, 11), rng:NextInteger(1, 3), style, rng)
			end
		end
	end

	-- 광장의 이야기 NPC
	if (info.storyCount or 0) > 0 then
		local n = villager(folder, Vector3.new(2, 0, -8), math.pi / 2, Color3.fromRGB(150, 40, 60), rng, "Rogue_Hooded")
		local npcPart = n:FindFirstChildWhichIsA("BasePart", true)
		if npcPart then sign(folder, npcPart, "! 이야기", Color3.fromRGB(180, 120, 30), 4) end
		prompt(folder, Vector3.new(2, 3, -8), "수상한 손님", "이야기 듣기", "harbor", onFacility)
	end
	-- 광장을 오가는 주민
	for _ = 1, 5 do
		villager(folder, Vector3.new(rng:NextNumber(-20, 8), 0, rng:NextNumber(-14, 14)), rng:NextNumber(0, math.pi * 2), Color3.fromRGB(rng:NextInteger(60, 200), rng:NextInteger(60, 160), rng:NextInteger(40, 140)), rng)
	end
	-- 가로등
	for x = -40, 10, 25 do
		for side = -1, 1, 2 do
			part(folder, Vector3.new(0.5, 7, 0.5), CFrame.new(x, 3.5, side * 7), Color3.fromRGB(40, 40, 44), Enum.Material.Metal)
			local bulb = part(folder, Vector3.new(1, 1, 1), CFrame.new(x, 7.2, side * 7), Color3.fromRGB(255, 220, 140), Enum.Material.Neon)
			local glow = Instance.new("PointLight")
			glow.Color = Color3.fromRGB(255, 214, 140)
			glow.Range = 24
			glow.Brightness = 1.4
			glow.Parent = bulb
		end
	end

	-- 항구 다듬기 -------------------------------------------------------------
	-- 하늘·빛: 늦은 오후의 따뜻한 바다 분위기
	do
		local Lighting = game:GetService("Lighting")
		Lighting.ClockTime = 13.5
		Lighting.Brightness = 2.6
		Lighting.Ambient = Color3.fromRGB(96, 98, 110)
		Lighting.OutdoorAmbient = Color3.fromRGB(122, 124, 138)
		Lighting.ColorShift_Top = Color3.fromRGB(255, 255, 255)
		Lighting.GlobalShadows = true
		local atmos = Lighting:FindFirstChild("MareAtmosphere")
		if not atmos then
			atmos = Instance.new("Atmosphere")
			atmos.Name = "MareAtmosphere"
			atmos.Parent = Lighting
		end
		atmos.Density = 0.28
		atmos.Offset = 0.2
		atmos.Color = Color3.fromRGB(199, 214, 235)
		atmos.Decay = Color3.fromRGB(120, 140, 170)
		atmos.Glare = 0.35
		atmos.Haze = 1.4
		if not Lighting:FindFirstChild("MareGrade") then
			local cc = Instance.new("ColorCorrectionEffect")
			cc.Name = "MareGrade"
			cc.Saturation = 0.12
			cc.Contrast = 0.08
			cc.TintColor = Color3.fromRGB(255, 255, 255)
			cc.Parent = Lighting
			local bloom = Instance.new("BloomEffect")
			bloom.Name = "MareBloom"
			bloom.Intensity = 0.35
			bloom.Size = 28
			bloom.Threshold = 1.6
			bloom.Parent = Lighting
			local rays = Instance.new("SunRaysEffect")
			rays.Name = "MareRays"
			rays.Intensity = 0.08
			rays.Spread = 0.6
			rays.Parent = Lighting
		end
	end
	-- 물가: 거품 띠와 바위
	do
		local foam = part(folder, Vector3.new(3, 0.2, 300), CFrame.new(21.5, 0.45, 0), Color3.fromRGB(240, 246, 250), Enum.Material.SmoothPlastic)
		foam.Transparency = 0.45
		foam.CanCollide = false
		for _, z in { -120, -70, 70, 120 } do
			if not importedModel(folder, "Town", "rock-large", Vector3.new(15, 0, z), 7, true) then
				part(folder, Vector3.new(6, 4, 6), CFrame.new(15, 1, z), Color3.fromRGB(120, 118, 112), Enum.Material.Slate, Enum.PartType.Ball)
			end
		end
		for _, z in { -34, 34, -96, 96 } do
			importedModel(folder, "Town", "rock-small", Vector3.new(16.5, 0, z), 3.5, false)
		end
		-- 종려나무 (부두 앞 해안)
		for _, z in { -16, 16, -32, 32 } do
			importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(13, 0, z), 6.5, false)
		end
	end
	-- 부두: 짐과 대포
	do
		for i, x in { 30, 36, 44, 52 } do
			importedModel(folder, "Naval", "chest", Vector3.new(x, 2, if i % 2 == 0 then 3.4 else -3.4), 2.4, false)
		end
		importedModel(folder, "Naval", "cannon", Vector3.new(40, 2, -3.6), 3.4, false)
		importedModel(folder, "Naval", "cannon", Vector3.new(58, 2, 3.6), 3.4, false)
	end
	-- 광장: 시장 가판대, 우물, 수레, 벤치
	do
		for _, spot in { Vector3.new(-18, 0, -13), Vector3.new(-18, 0, 13), Vector3.new(2, 0, 14) } do
			importedModel(folder, "Town", "stall", spot, 6.5, false)
		end
		importedModel(folder, "Town", "village-well", Vector3.new(-30, 0, 15), 5.5, true)
		importedModel(folder, "Town", "cart", Vector3.new(-24, 0, 19), 5.5, false)
		importedModel(folder, "Town", "cart", Vector3.new(-26, 0, -19), 5.5, false)
		importedModel(folder, "Town", "bench_A", Vector3.new(-8, 0, 9), 4.5, false)
		importedModel(folder, "Town", "bench_B", Vector3.new(-8, 0, -9), 4.5, false)
		for _, x in { -52, -74, -96, -118, -138 } do
			for side = -1, 1, 2 do
				local pick = ({ "tree", "tree-high", "tree-crooked", "tree_large", "tree_tiny" })[rng:NextInteger(1, 5)]
				local kind = if pick == "tree_large" or pick == "tree_tiny" then "Town" else "Town"
				importedModel(folder, kind, pick, Vector3.new(x + rng:NextNumber(-3, 3), 0, side * rng:NextNumber(10, 13)), rng:NextNumber(6, 9), false)
			end
		end
		for _, z in { -44, 44 } do
			importedModel(folder, "Town", "foliage_A", Vector3.new(-2, 0, z), 5, false)
			importedModel(folder, "Town", "foliage_B", Vector3.new(-16, 0, z), 5, false)
		end
		-- 성곽풍 길목 문 (큰길 입구)
		importedModel(folder, "Town", "gate_double_left", Vector3.new(-46, 0, -5.5), 6, false)
		importedModel(folder, "Town", "gate_double_right", Vector3.new(-46, 0, 5.5), 6, false)
	end

	-- 갈매기 (항구 위를 맴돈다)
	local gulls = {}
	for i = 1, 6 do
		local g = Instance.new("Model")
		local body = part(g, Vector3.new(1.4, 0.5, 0.5), CFrame.new(), Color3.new(1, 1, 1))
		local l = part(g, Vector3.new(0.6, 0.15, 2), CFrame.new(), Color3.fromRGB(235, 235, 240))
		local r = part(g, Vector3.new(0.6, 0.15, 2), CFrame.new(), Color3.fromRGB(235, 235, 240))
		for _, p in { body, l, r } do
			p.CanCollide = false
		end
		g.Parent = folder
		table.insert(gulls, { body = body, l = l, r = r, radius = rng:NextNumber(14, 34), height = rng:NextNumber(18, 30), speed = rng:NextNumber(0.25, 0.5), phase = i * 1.1, cx = rng:NextNumber(30, 70), cz = rng:NextNumber(-20, 20) })
	end

	folder.Parent = workspace

	-- 움직임: 배 흔들림, 갈매기, 풍차
	local shipBase = ship:GetPivot()
	-- 선체의 잔물결 움직임과 외륜 회전을 독립적으로 합성한다.
	local wheels = {}
	for _, name in { "PaddleWheelPort", "PaddleWheelStarboard" } do
		local wheel = ship:FindFirstChild(name)
		if wheel and wheel:IsA("Model") then
			table.insert(wheels, { model = wheel, relative = shipBase:ToObjectSpace(wheel:GetPivot()) })
		end
	end
	local mill = {}
	for _, p in folder:GetChildren() do
		if p.Name == "MillBlade" then
			table.insert(mill, { part = p, base = p.CFrame })
		end
	end
	local hub = folder:FindFirstChild("MillHub")
	local t0 = os.clock()
	-- 항해 연출: 출항(부두 -> 먼 바다)과 입항(먼 바다 -> 부두)
	local SEA_DIST = 420
	local anim = nil -- { kind = "depart" | "arrive", start = 시각, dur = 초 }
	if info.arrive then
		anim = { kind = "arrive", start = os.clock(), dur = 7 }
	end
	local function smooth(x)
		x = math.clamp(x, 0, 1)
		return x * x * (3 - 2 * x)
	end
	local conn = RunService.Heartbeat:Connect(function()
		local t = os.clock() - t0
		local shipPose = shipBase * CFrame.new(0, math.sin(t * 1.2) * 0.35, 0) * CFrame.Angles(math.sin(t * 0.9) * 0.025, 0, math.sin(t * 0.7) * 0.012)
		if anim then
			local a = math.clamp((os.clock() - anim.start) / anim.dur, 0, 1)
			if anim.kind == "depart" then
				-- 천천히 출발해 점점 빨라진다 (바다 쪽 +X 로 진행)
				local d = a * a * SEA_DIST
				shipPose = shipPose * CFrame.new(d, 0, 0) * CFrame.Angles(0, 0, math.sin(t * 1.4) * 0.02)
			else
				-- 먼 바다에서 들어와 감속하고, 끝에서 뱃머리를 바다 쪽으로 돌려 정박한다
				local remain = 1 - smooth(a)
				local turn = smooth((a - 0.7) / 0.3)
				local lateral = (1 - turn) * 28
				shipPose = shipPose * CFrame.new(remain * SEA_DIST, 0, lateral * remain) * CFrame.Angles(0, math.pi * (1 - turn), 0)
				if a >= 1 then
					anim = nil
				end
			end
			if anim and not anim.done then
				-- 항적 파도: 배가 달릴 때 물보라가 따라온다
				if not ship:FindFirstChild("Wake") then
					local hull = ship.PrimaryPart or ship:FindFirstChildWhichIsA("BasePart", true)
					if hull then
						local att = Instance.new("Attachment")
						att.Name = "Wake"
						att.Position = Vector3.new(0, -2, 0)
						att.Parent = hull
						local em = Instance.new("ParticleEmitter")
						em.Name = "WakeFoam"
						em.Rate = 30
						em.Lifetime = NumberRange.new(2, 3)
						em.Speed = NumberRange.new(2, 4)
						em.SpreadAngle = Vector2.new(60, 10)
						em.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 2), NumberSequenceKeypoint.new(1, 6) })
						em.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.3), NumberSequenceKeypoint.new(1, 1) })
						em.Color = ColorSequence.new(Color3.fromRGB(235, 245, 255))
						em.Parent = att
					end
				end
			end
		end
		ship:PivotTo(shipPose)
		for _, wheel in wheels do
			wheel.model:PivotTo(shipPose * wheel.relative * CFrame.Angles(0, 0, t * 1.65))
		end
		for _, g in gulls do
			local a = t * g.speed + g.phase
			local pos = Vector3.new(g.cx + math.cos(a) * g.radius, g.height + math.sin(t * 0.8 + g.phase) * 2, g.cz + math.sin(a) * g.radius)
			local cf = CFrame.lookAt(pos, pos + Vector3.new(-math.sin(a), 0, math.cos(a))) * CFrame.Angles(0, math.pi / 2, 0)
			local flap = math.sin(t * 8 + g.phase) * 0.6
			g.body.CFrame = cf
			g.l.CFrame = cf * CFrame.new(0, 0, -1) * CFrame.Angles(flap, 0, 0) * CFrame.new(0, 0, -0.6)
			g.r.CFrame = cf * CFrame.new(0, 0, 1) * CFrame.Angles(-flap, 0, 0) * CFrame.new(0, 0, 0.6)
		end
		if hub then
			for _, b in mill do
				local center = hub.Position
				b.part.CFrame = CFrame.new(center) * CFrame.Angles(t * 0.8, 0, 0) * (CFrame.new(center):Inverse() * b.base)
			end
		end
	end)
	folder.Destroying:Connect(function()
		conn:Disconnect()
	end)

	local controls = {}
	-- 출항 연출 시작. 배가 부두를 떠난다. 걸리는 시간(초)을 돌려준다.
	function controls.depart(dur)
		anim = { kind = "depart", start = os.clock(), dur = dur or 5 }
		return anim.dur
	end
	-- 카메라가 따라갈 선체
	function controls.hull()
		return ship.PrimaryPart or ship:FindFirstChildWhichIsA("BasePart", true)
	end
	function controls.sailing()
		return anim ~= nil
	end

	return { folder = folder, spawn = CFrame.new(-2, 4, 10) * CFrame.Angles(0, math.rad(90), 0), controls = controls }
end

-- 항해 장면(VoyageScene)에서 같은 배 모델을 쓰기 위해 내보낸다
PortScene.makeShip = buildShip

return PortScene
