--!nonstrict
-- 파일명: PortScene.luau
-- 항구 3D 장면 (클라이언트 전용, 보기용). 승인된 3D 모델로 문화권별 마을과 시설을 표현한다.
-- 주택은 PortCultures의 지역별 석조·벽돌·목조 재질과 지붕·창호·증축 규칙을 따른다.
-- 판정에는 쓰이지 않는다. 시설 앞의 ProximityPrompt를 누르면 onFacility(탭 id)가 불린다.

local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")

local Pose = require(script.Parent:WaitForChild("Pose"))
local Voyage = require(script.Parent:WaitForChild("Voyage"))
local PortData = require(script.Parent:WaitForChild("Ports"))
local AssetIds = require(script.Parent:WaitForChild("AssetIds"))
local PortBuildings = require(script.Parent:WaitForChild("PortBuildings"))
local Chains = require(script.Parent:WaitForChild("ProductionChains"))

local PortScene = {}

local Cultures = require(script.Parent:WaitForChild("PortCultures"))
local MED, STYLE, REGION, PROFILE, OUTFIT = Cultures.MED, Cultures.STYLE, Cultures.REGION, Cultures.PROFILE, Cultures.OUTFIT
local C = Color3.fromRGB
local PORT_CLOCK_EPOCH = os.clock()

-- 특산품 진열용 3D 모델 (없는 상품은 상자로 대신한다)
local GOOD_MESH = {
	cheese = { "Cargo", "cheese" }, wine = { "Cargo", "wine-red" }, beer = { "Cargo", "mug" }, sake = { "Cargo", "barrel", Color3.fromRGB(196, 181, 150) }, fish = { "Cargo", "fish-large" }, wool = { "Cargo", "textiles-stack-small" },
	cloth = { "Cargo", "textiles-a" }, silk = { "Cargo", "textiles-stack-large-colored" }, grain = { "Cargo", "food-flour" },
	iron = { "Cargo", "iron-bars" }, copper = { "Cargo", "copper-bar" }, silver = { "Cargo", "silver-bar" }, gold = { "Cargo", "gold-bar" },
	gems = { "Cargo", "gems-sack" }, pearls = { "Cargo", "gem-small" }, honey = { "Cargo", "honey" }, pepper = { "Cargo", "pepper-mill" },
	olive_oil = { "Cargo", "bottle-oil" }, timber = { "Cargo", "wood-log-stack" }, mahogany = { "Cargo", "wood-log-a", Color3.fromRGB(110, 54, 40) },
	coffee = { "Cargo", "cup-coffee" }, tea = { "Cargo", "cup-tea" }, cocoa = { "Cargo", "chocolate" }, rum = { "Cargo", "barrel", Color3.fromRGB(96, 56, 39) },
	salt = { "Cargo", "shaker-salt" }, sugar = { "Cargo", "sugar" }, fruit = { "Cargo", "grapes" }, grapes = { "Cargo", "grapes" },
	lemon = { "Cargo", "lemon" }, maize = { "Cargo", "corn" }, coconut = { "Cargo", "coconut" }, meat = { "Cargo", "whole-ham" },
}
-- 통은 사케·럼만 쓴다: 와인은 병(wine-red), 맥주는 잔(mug)으로 모양 자체를 달리해 통 네 가지가 똑같아 보이던 문제를 줄인다 (모두 등록된 CC0 원본).
-- 표에 없는 교역품은 같은 이름의 3D 모델(등록돼 있으면)을, 그것도 없으면 열린 상자를 쓴다
setmetatable(GOOD_MESH, { __index = function(_, good)
	if type(good) == "string" and AssetIds["Cargo/" .. good] then
		return { "Cargo", good }
	end
	return { "Cargo", "box-open" }
end })
-- 상품 종류별 진열 크기 배율: 작은 물건(보석·향신료·찻잔)은 작게, 큰 물건(통·목재·천 더미)은 크게 보여 종류가 한눈에 구분되게 한다.
local GOOD_SIZE = {
	gems = 0.75, pearls = 0.7, pepper = 0.8, salt = 0.8, olive_oil = 0.9, coffee = 0.75, tea = 0.75, cocoa = 0.8, honey = 0.8, lemon = 0.8, coconut = 0.85,
	wine = 1.0, beer = 0.9, sake = 1.2, rum = 1.2, timber = 1.3, mahogany = 1.25, cloth = 1.2, silk = 1.2, grain = 1.1, sugar = 1.1,
}
local function goodSize(good, size)
	return size * (GOOD_SIZE[good] or 1)
end
-- 줄 제목·부제 글자로 알맞은 아이콘을 고른다 (항구·퀘스트·도감 창)
local TITLE_ICONS = {
	{ "식물", "Cargo", "apple" }, { "동물", "Cargo", "fish-large" }, { "광물", "Relics", "coin" }, { "유물", "Relics", "pot" },
	{ "유적", "Castle", "tower-square-base" }, { "천문", "Relics", "key" }, { "화학", "Relics", "potion" }, { "물리", "Cargo", "bucket" },
	{ "지리", "Naval", "ship-small" }, { "철학", "Interior", "bookcaseclosed" }, { "의학", "Cargo", "mortar-pestle" }, { "신화", "Relics", "weapon-sword" },
	{ "항해술", "Naval", "ship-medium" }, { "기상", "Naval", "flag-pennant" }, { "건축", "Town", "house" }, { "예술", "Relics", "shield-round" },
	{ "교역품", "Cargo", "box-open" }, { "조선", "Naval", "ship-large" }, { "언어", "Interior", "bookcaseopenlow" },
}

local SHIP_LOOK = {
	caravel = { scale = 1.0, masts = 2, hull = Color3.fromRGB(110, 70, 40) },
	fluyt = { scale = 1.15, masts = 3, hull = Color3.fromRGB(96, 66, 44) },
	frigate = { scale = 1.3, masts = 3, hull = Color3.fromRGB(60, 50, 44), stripe = Color3.fromRGB(224, 170, 69) },
	galleon = { scale = 1.5, masts = 3, hull = Color3.fromRGB(120, 60, 36), stripe = Color3.fromRGB(200, 40, 40), castle = true },
	paddle_steamer = { scale = 1.3, masts = 1, hull = Color3.fromRGB(40, 40, 46), funnel = true, paddle = true },
	ironclad_frigate = { scale = 1.5, masts = 2, hull = Color3.fromRGB(90, 96, 104), funnel = true, metal = true },
}
-- 지역·나라 전용 배: 기본 배의 모양에 그 지역의 선체 색을 입힌다
do
	local ShipsMod = require(script.Parent:WaitForChild("Ships"))
	for id, def in ShipsMod.Ships do
		if def.visual and SHIP_LOOK[def.visual] and not SHIP_LOOK[id] then
			local look = table.clone(SHIP_LOOK[def.visual])
			if def.tint then
				look.hull = Color3.fromRGB(def.tint[1], def.tint[2], def.tint[3])
			end
			look.scale = look.scale * math.clamp(0.8 + def.hull / 700, 0.85, 1.12)
			SHIP_LOOK[id] = look
		end
	end
end

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

local SIGN_ICONS = {
	{ "증권", "📈" }, { "박물관", "🏛️" }, { "극장", "🎭" }, { "식물원", "🌿" }, { "천문대", "🔭" }, { "학술원", "🎓" }, { "동물원", "🦁" }, { "제철", "⚙️" }, { "교역", "💰" }, { "주점", "🍺" }, { "항만", "⚓" }, { "은행", "🏦" }, { "길드", "📜" }, { "서재", "🔬" },
	{ "도서관", "📚" }, { "조선", "🔨" }, { "왕궁", "👑" }, { "총독", "👑" }, { "이야기", "❗" },
}
local function signIcon(text)
	for _, e in SIGN_ICONS do
		if text:find(e[1], 1, true) then return e[2] end
	end
	return "⛵"
end

-- 간판 3D 아이콘: 승인된 MareAssets 모델 (없으면 이모지로 대체)
local SIGN_MODELS = {
	{ "증권", "Cargo", "gold-bars" }, { "박물관", "Cargo", "jade" }, { "극장", "Relics", "shield-round" }, { "식물원", "Cargo", "pineapple" },
	{ "천문대", "Relics", "magnifying-glass" }, { "학술원", "Relics", "journal-open" }, { "동물원", "Cargo", "ivory" }, { "제철", "Cargo", "iron-bars" },
	{ "교역", "Cargo", "chest" }, { "주점", "Cargo", "barrel" }, { "항만", "Relics", "rope-bundle-a" }, { "은행", "Cargo", "gems-chest" },
	{ "길드", "Relics", "map-rolled" }, { "서재", "Relics", "drafting-compass" }, { "도서관", "Relics", "journal-closed" }, { "조선", "Relics", "hammer" },
	{ "왕궁", "Cargo", "gold" }, { "총독", "Cargo", "gold" }, { "이야기", "Relics", "key" }, { "공사", "Relics", "saw" }, { "마굿간", "Cargo", "bucket" }, { "축사", "Cargo", "wool" },
}
local function signModel(text)
	for _, e in SIGN_MODELS do
		if text:find(e[1], 1, true) then return e[2], e[3] end
	end
	return "Relics", "compass-base"
end

-- 방문시설 간판 움직임: 3D 아이콘이 천천히 돌고(카메라가 모델 둘레를 돈다), 위아래로 떠다니고, 가까이 가면 커진다.
-- 연결은 하나만 둔다. 간판이 사라지면(항구를 떠나면) 목록에서 빠지고, 카메라와 멀리 있는 간판은 건드리지 않는다.
local signAnims = {}
local signLoop = nil
local SIGN_NEAR, SIGN_ACTIVE = 26, 140
local function animateSign(rec)
	table.insert(signAnims, rec)
	if signLoop then return end
	signLoop = RunService.Heartbeat:Connect(function()
		local camera = workspace.CurrentCamera
		if not camera then return end
		local t = os.clock()
		local eye = camera.CFrame.Position
		for i = #signAnims, 1, -1 do
			local a = signAnims[i]
			if not a.bb.Parent then
				table.remove(signAnims, i)
			else
				local d = (a.base - eye).Magnitude
				if d < SIGN_ACTIVE then
					local ang = t * 0.9 + a.phase
					local dir = Vector3.new(math.sin(ang) * 0.95, 0.6, math.cos(ang) * 1.1).Unit
					a.cam.CFrame = CFrame.lookAt(a.center + dir * a.reach, a.center)
					a.bb.StudsOffset = Vector3.new(0, a.height + math.sin(t * 1.8 + a.phase) * 0.35, 0)
					local want = if d < SIGN_NEAR then 1.18 else 1
					a.scale += (want - a.scale) * 0.12
					a.bb.Size = UDim2.fromScale(a.w * a.scale, a.h * a.scale)
				end
			end
		end
		if #signAnims == 0 then
			signLoop:Disconnect()
			signLoop = nil
		end
	end)
end

-- 방문시설 간판: 큰 3D 아이콘 + 아래 작은 이름표 (멀리서도 무슨 건물인지 보이게)
local function sign(parent, adornee, text, color, height, compact, iconModel)
	if compact then
		-- [모바일 NPC 표식] 화면을 가리던 7스터드 이름판 대신 근접 시에만 보이는 투명 소형 표식.
		local nb = Instance.new("BillboardGui")
		nb.Name = "NpcRoleTag"
		nb.Adornee = adornee
		nb.Size = UDim2.fromOffset(68, 18)
		nb.StudsOffset = Vector3.new(0, (height or 4) + 0.6, 0)
		nb.AlwaysOnTop = false
		nb.LightInfluence = 0
		nb.MaxDistance = 25
		local pl = Instance.new("TextLabel")
		pl.Size = UDim2.fromScale(1, 1)
		pl.BackgroundTransparency = 1
		pl.TextColor3 = color or Color3.fromRGB(255, 244, 214)
		pl.Font = Enum.Font.GothamBold
		pl.TextScaled = false
		pl.TextSize = 12
		pl.TextTruncate = Enum.TextTruncate.AtEnd
		pl.TextStrokeTransparency = 0.5
		pl.Text = text
		pl.Parent = nb
		nb.Parent = if adornee:IsA("BasePart") then adornee else parent
		return nb
	end
	local bb = Instance.new("BillboardGui")
	bb.Adornee = adornee
	bb.Size = UDim2.fromScale(9, 9.5) -- 스터드 단위: 멀수록 자연스럽게 작아진다
	bb.StudsOffset = Vector3.new(0, (height or 4) + 5, 0)
	bb.AlwaysOnTop = false
	bb.LightInfluence = 0
	bb.MaxDistance = 130
	-- 3D 아이콘 (위쪽 80%)
	local kind, asset = signModel(text)
	if iconModel then kind, asset = iconModel[1], iconModel[2] end
	local vf = Instance.new("ViewportFrame")
	vf.Size = UDim2.fromScale(1, 0.78)
	vf.BackgroundTransparency = 1
	vf.Ambient = Color3.fromRGB(205, 198, 184)
	vf.LightColor = Color3.fromRGB(255, 247, 224)
	vf.LightDirection = Vector3.new(-0.8, -1.6, -0.55).Unit
	local cam = Instance.new("Camera")
	cam.FieldOfView = 32
	cam.Parent = vf
	vf.CurrentCamera = cam
	vf.Parent = bb
	local world = Instance.new("WorldModel")
	world.Parent = vf
	-- 모델은 서버가 늦게 올릴 수 있어서 뜰 때까지 기다린다. 그동안은 이모지가 자리를 채운다.
	local em = Instance.new("TextLabel")
	em.Size = UDim2.fromScale(1, 0.78)
	em.BackgroundTransparency = 1
	em.Text = signIcon(text)
	em.TextScaled = true
	em.Font = Enum.Font.GothamBold
	em.TextColor3 = Color3.new(1, 1, 1)
	em.Parent = bb
	local function tryShow()
		local lib = ReplicatedStorage:FindFirstChild("MareAssets")
		local group = lib and lib:FindFirstChild(kind)
		local template = group and group:FindFirstChild(asset)
		if not (template and template:IsA("Model") and template:FindFirstChildWhichIsA("BasePart", true)) then return false end
		local m = template:Clone()
		for _, p in m:GetDescendants() do
			if p:IsA("BasePart") then p.Anchored = true end
		end
		m.Parent = world
		local cf, size = m:GetBoundingBox()
		local reach = math.max(size.Magnitude * 0.5, 0.1) / math.sin(math.rad(cam.FieldOfView * 0.5)) * 1.05
		cam.CFrame = CFrame.lookAt(cf.Position + Vector3.new(0.85, 0.65, 1.2).Unit * reach, cf.Position)
		em:Destroy()
		local at = if adornee:IsA("BasePart") then adornee.Position else adornee:GetPivot().Position
		animateSign({ bb = bb, cam = cam, center = cf.Position, reach = reach, phase = (at.X * 0.37 + at.Z * 0.23) % 6.28,
			base = at + Vector3.new(0, (height or 4) + 5, 0), height = (height or 4) + 5, w = 9, h = 9.5, scale = 1 })
		return true
	end
	if not tryShow() then
		task.spawn(function()
			for _ = 1, 40 do
				task.wait(1)
				if not bb.Parent then return end
				if tryShow() then return end
			end
		end)
	end
	-- 작은 이름표 (아래쪽)
	local plate = Instance.new("Frame")
	plate.AnchorPoint = Vector2.new(0.5, 1)
	plate.Position = UDim2.fromScale(0.5, 1)
	plate.Size = UDim2.fromScale(1, 0.2)
	plate.BackgroundColor3 = Color3.fromRGB(62, 42, 30)
	plate.BorderSizePixel = 0
	local st = Instance.new("UIStroke")
	st.Color = color and color:Lerp(Color3.fromRGB(232, 190, 96), 0.5) or Color3.fromRGB(232, 190, 96)
	st.Thickness = 2
	st.Parent = plate
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 8)
	c.Parent = plate
	local l = Instance.new("TextLabel")
	l.Size = UDim2.fromScale(0.94, 0.8)
	l.Position = UDim2.fromScale(0.03, 0.1)
	l.BackgroundTransparency = 1
	l.TextColor3 = Color3.fromRGB(255, 244, 214)
	l.Font = Enum.Font.GothamBold
	l.TextScaled = true
	l.Text = text
	local lim = Instance.new("UITextSizeConstraint")
	lim.MaxTextSize = 40
	lim.MinTextSize = 6
	lim.Parent = l
	l.Parent = plate
	plate.Parent = bb
	-- 간판은 건물(Adornee) 자신의 자식으로 둔다: 폴더 아래에 두면 화면에 안 뜰 수 있고, 건물이 지워질 때 함께 사라진다
	bb.Parent = if adornee:IsA("BasePart") then adornee else parent
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
-- 원본: roblox-games/mare-essentia/assets/, 수입본: ReplicatedStorage/MareAssets
local BLUEPRINT_SHIP_SIZE = {} -- 제작 전용 선박 외형 크기. 구매·능력치·저장 정보는 건드리지 않는다.
local V5_SHIP_LENGTH = {} -- 5차 원본의 검증된 목표 길이. 기존 선박 외형 크기는 유지한다.
local SHIP_MESH = {
	caravel = "ship-small", fluyt = "ship-medium",
	frigate = "ship-pirate-medium", galleon = "ship-large",
	paddle_steamer = "ship-pirate-small", ironclad_frigate = "ship-pirate-medium",
}
do
	local ShipsMod = require(script.Parent:WaitForChild("Ships"))
	for id, def in ShipsMod.Ships do
		if def.visual and not SHIP_MESH[id] then
			SHIP_MESH[id] = SHIP_MESH[def.visual]
		end
	end
	-- [7대륙 36척 전용 실물] 각 설계는 본인 등록번호가 실제 있는 고유 GLB만 선택한다.
	-- 다른 함종 메시는 대체하지 않는다. 등록·권한 검증 전에는 기존 선박 규칙과 저장값을 유지한다.
	for _, blueprint in ShipsMod.Blueprints do
		V5_SHIP_LENGTH[blueprint.id] = blueprint.targetLengthStuds
		if not ShipsMod.Ships[blueprint.id] then
			local meshName = blueprint.id .. "-custom"
			if AssetIds["Naval/" .. meshName] then
				SHIP_MESH[blueprint.id] = meshName
				BLUEPRINT_SHIP_SIZE[blueprint.id] = blueprint.targetLengthStuds
			end
		end
	end
end
-- [함종 고유 원본] 프리깃 등록 메시를 프리깃에만 연결한다. 다른 visual 별칭은 기존 공용 배를 유지한다.
if AssetIds["Naval/frigate"] then
	SHIP_MESH.frigate = "frigate"
end
-- [실제 갈레온 원형] CC BY 4.0 작가 완성 모델의 선체·삭구·돛·장식만 갈레온에 연결한다.
-- 캐랙·마닐라 갈레온 등 visual 별칭 배는 종전 모델을 유지해 서로 다른 역사 함종을 오표기하지 않는다.
if AssetIds["Naval/galleon-heritage"] then
	SHIP_MESH.galleon = "galleon-heritage"
end
-- [함종별 고유 선체] 신규 개조 모델은 등록번호가 확인될 때만 기존 선박과 교체한다.
-- 사략선·마닐라 갈레온·외륜 증기선·장갑 프리깃은 다른 함종의 visual 별칭을 상속하지 않는다.
local CUSTOM_SHIP_FALLBACK = {
	privateer = "ship-pirate-medium",
	manila_galleon = "ship-pirate-large",
	paddle_steamer = "ship-medium",
	ironclad_frigate = "ship-pirate-large",
}
local ShipDefs = require(script.Parent:WaitForChild("Ships"))
for shipId in ShipDefs.Ships do
	local meshName = shipId .. "-custom"
	if AssetIds["Naval/" .. meshName] then
		-- [등록된 함종 전체] 기존 기본 선체를 보존한 뒤 고유 개조 메시를 우선 연결한다.
		CUSTOM_SHIP_FALLBACK[shipId] = CUSTOM_SHIP_FALLBACK[shipId] or SHIP_MESH[shipId] or "ship-small"
		SHIP_MESH[shipId] = meshName
	end
end

-- 색이 입혀지지 않은 수입 모델(회색·옅은 파랑으로 보임)에 자연스러운 색을 입힌다.
local ANIMAL_TINT = {
	cow = Color3.fromRGB(168, 118, 84), horse = Color3.fromRGB(136, 88, 58), sheep = Color3.fromRGB(240, 236, 224),
	pig = Color3.fromRGB(238, 170, 160), llama = Color3.fromRGB(214, 192, 152), donkey = Color3.fromRGB(128, 116, 104),
	["dog-pug"] = Color3.fromRGB(196, 156, 104), cat = Color3.fromRGB(86, 80, 76), chicken = Color3.fromRGB(250, 246, 236),
	elephant = Color3.fromRGB(128, 126, 130),
}
-- 질감 팔레트가 청록색인 나무: 질감을 지우고 초록 단색으로 칠한 뒤 갈색 줄기를 덧댄다
local SOLID_TREES = {
	tree = Color3.fromRGB(86, 142, 64), ["tree-high"] = Color3.fromRGB(62, 118, 66), ["tree-crooked"] = Color3.fromRGB(96, 146, 60),
}
-- 질감 팔레트가 푸른빛이라 색 곱셈이 먹지 않는 바위·풍차: 질감을 지우고 단색으로 칠한다
local function solidTint(asset)
	if string.find(asset, "rocks-sand", 1, true) then return Color3.fromRGB(196, 176, 140) end
	if string.find(asset, "rock", 1, true) then return Color3.fromRGB(150, 144, 134) end
	if asset == "windmill" then return Color3.fromRGB(176, 142, 104) end
	return nil
end
local ASSET_TINT = {
	["tree-oak"] = Color3.fromRGB(88, 138, 62), ["tree-pinedefaulta"] = Color3.fromRGB(255, 238, 120), ["tree-default-fall"] = Color3.fromRGB(204, 118, 48),
	windmill = Color3.fromRGB(238, 220, 186),
	["plant-bush"] = Color3.fromRGB(78, 128, 58), -- 수입 나무의 잎 질감이 청록색이라, 노란 기운을 곱해 자연스러운 초록으로 만든다
	-- [원본 재질] Quaternius OBJ 회색 기본 재질의 품목별 색만 기존 메시 착색 경로에서 지정한다.
	["Grass_Small"] = Color3.fromRGB(134, 188, 88), ["Bush_Small"] = Color3.fromRGB(82, 146, 72),
	["Rock_2"] = Color3.fromRGB(153, 148, 134),
	tree_large = Color3.fromRGB(78, 132, 66), tree_tiny = Color3.fromRGB(84, 138, 70), tree = Color3.fromRGB(255, 238, 120),
	["tree-high"] = Color3.fromRGB(255, 238, 120), ["tree-crooked"] = Color3.fromRGB(255, 238, 120),
	["crops-wheatstagea"] = Color3.fromRGB(216, 184, 92), ["crops-wheatstageb"] = Color3.fromRGB(176, 190, 92), ["crops-cornstagec"] = Color3.fromRGB(150, 172, 72),
	["crop-carrot"] = Color3.fromRGB(230, 128, 48), ["crop-melon"] = Color3.fromRGB(110, 168, 78), ["crop-pumpkin"] = Color3.fromRGB(230, 138, 40), ["crop-turnip"] = Color3.fromRGB(226, 214, 232),
}
local function assetTint(kind, asset)
	if kind == "Animals" then return ANIMAL_TINT[asset] end
	if ASSET_TINT[asset] then return ASSET_TINT[asset] end
	if string.find(asset, "fence", 1, true) then return Color3.fromRGB(142, 102, 64) end
	if string.find(asset, "rocks-sand", 1, true) then return Color3.fromRGB(196, 176, 140) end
	if string.find(asset, "rock", 1, true) then return Color3.fromRGB(148, 142, 134) end
	return nil
end

-- [중앙광장 영구 공터] 중심(-6, 0), 바닥 반경 24를 비워두고 여유 2스터드를 확보한다.
-- 기존 승인된 건축·소품·생산물 모델만 이 구역 안에서 막는다. 인물/동물은 계속 출입할 수 있다.
local CENTRAL_PLAZA_RADIUS = 26
local function importedModel(parent, kind, asset, bottomPosition, desiredSize, solid, tint, buildDelay)
	if parent.Name == "PortScene" and kind ~= "People" and kind ~= "Animals" then
		local dx, dz = bottomPosition.X + 6, bottomPosition.Z
		if dx * dx + dz * dz < CENTRAL_PLAZA_RADIUS * CENTRAL_PLAZA_RADIUS then return nil end
	end
	tint = tint or assetTint(kind, asset)
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
			if tint then
				p.Color = tint
				-- 질감이 있는 메시는 UsePartColor 를 켜야 Color 가 질감에 곱해진다(없는 속성이면 무시)
				pcall(function() (p :: any).UsePartColor = true end)
				local sc = SOLID_TREES[asset] or solidTint(asset)
				if sc and p:IsA("MeshPart") then
					p.TextureID = ""
					p.Color = sc
				end
				-- Part + SpecialMesh 형태로 수입된 모델은 메시의 VertexColor 로 곱한다
				for _, ch in p:GetChildren() do
					if ch:IsA("SpecialMesh") then ch.VertexColor = Vector3.new(tint.R, tint.G, tint.B) end
				end
				-- 질감(SurfaceAppearance)이 있는 모델은 MeshPart.Color 가 무시되므로 질감 쪽 색도 함께 곱한다
				local sa = p:FindFirstChildOfClass("SurfaceAppearance")
				if sa then sa.Color = tint end
			end
		end
	end
	if not hasParts then m:Destroy(); return nil end
	local ok, err = pcall(function()
		m.Parent = parent
		local _, ext = m:GetBoundingBox()
		local isPalm = string.find(asset, "palm", 1, true) ~= nil
		local isAnimal = kind == "Animals"
		-- FBX 가축은 가져온 단위·축이 다른 경우가 있다. 기존 야외 장면처럼 세 축의 최대 크기로 맞춘다.
		local axis = if kind == "People" or asset == "chimney" or isPalm then ext.Y
			elseif isAnimal then math.max(ext.X, ext.Y, ext.Z)
			else math.max(ext.X, ext.Z)
		if axis < 0.01 then error("빈 모델") end
		-- 야자나무는 잎이 넓어 가로 기준으로 줄이면 줄기가 뒤틀려 보인다: 높이 기준으로 맞춘다.
		local ratio = desiredSize * (if isPalm then 1.5 else 1) / axis
		-- 일반 시설·선박은 기존 배율 제한을 보존한다. 동물은 결과 실측 크기로 검증한다.
		if not isAnimal and (ratio < 0.01 or ratio > 100) then error("비정상적인 모델 배율") end
		-- ScaleTo는 상대 배율이 아니라 모델의 절대 배율을 받는다. 수입본의 기존 배율을 반영한다.
		local scale = if isAnimal then m:GetScale() * ratio else ratio
		if scale ~= scale or scale <= 0 or scale == math.huge then error("비정상적인 모델 배율") end
		m:ScaleTo(scale)
		if isAnimal then
			local _, actualSize = m:GetBoundingBox()
			local actualAxis = math.max(actualSize.X, actualSize.Y, actualSize.Z)
			if math.abs(actualAxis - desiredSize) > desiredSize * 0.2 then
				error("동물 수입본 목표 크기 불일치")
			end
		end
		if kind ~= "People" and kind ~= "Animals" then
			local _, size = m:GetBoundingBox()
			-- 월드 원점을 기준으로 모델을 회전하면 수입된 가축이 엉뚱한 곳으로 이동한다.
			-- 장식용 메시만 제자리 중심을 기준으로 방향을 맞춘다.
			if size.Z > size.X then m:PivotTo(m:GetPivot() * CFrame.Angles(0, math.pi / 2, 0)) end
		end
		local center, size = m:GetBoundingBox()
		local bottom = Vector3.new(center.Position.X, center.Position.Y - size.Y / 2, center.Position.Z)
		m:PivotTo(CFrame.new(bottomPosition - bottom) * m:GetPivot())
		if kind == "People" then
			Pose.relaxArms(m)
		end
		if SOLID_TREES[asset] then
			local c2, sz = m:GetBoundingBox()
			local w = math.max(sz.X, sz.Z) * 0.2
			local h = sz.Y * 0.4
			local trunk = Instance.new("Part")
			trunk.Shape = Enum.PartType.Cylinder
			trunk.Size = Vector3.new(h, w, w)
			trunk.CFrame = CFrame.new(c2.Position.X, c2.Position.Y - sz.Y / 2 + h / 2, c2.Position.Z) * CFrame.Angles(0, 0, math.pi / 2)
			trunk.Color = Color3.fromRGB(122, 86, 54)
			trunk.Material = Enum.Material.Wood
			trunk.Anchored = true
			trunk.CanCollide = false
			trunk.CanTouch = false
			trunk.Parent = m
		end
	end)
	if not ok then
		warn("[MareEssentia] 모델 수입본 배치 오류", kind, asset, err)
		m:Destroy()
		return nil
	end
	-- [실제 3D 설치 모션] 요청된 장식과 공사 단계에만 적용한다. 원본 메시의 최종 좌표·충돌을 복원한다.
	-- 보이는 파츠가 너무 많은 원본은 모바일 드로콜/트윈 폭증을 피하기 위해 즉시 설치한다.
	if type(buildDelay) == "number" and buildDelay >= 0 then
		local pieces = {}
		for _, piece in m:GetDescendants() do
			if piece:IsA("BasePart") then
				table.insert(pieces, { part = piece, final = piece.CFrame, alpha = piece.Transparency, solid = piece.CanCollide })
				if #pieces > 24 then break end
			end
		end
		if #pieces > 0 and #pieces <= 24 then
			local _, span = m:GetBoundingBox()
			local drop = math.clamp(span.Y * 0.4, 0.9, 3.4)
			for _, piece in pieces do
				piece.part.CanCollide = false
				piece.part.Transparency = 1
				piece.part.CFrame = piece.final + Vector3.new(0, -drop, 0)
			end
			m:SetAttribute("BuildVisualState", "installing")
			task.delay(buildDelay, function()
				-- 장면이 Workspace에 배치되기 전에 설치 모션이 사라지지 않도록 부착 완료를 기다린다.
				local deadline = os.clock() + 25
				while m.Parent and not parent.Parent and os.clock() < deadline do task.wait(0.12) end
				if not m.Parent then return end
				if not parent.Parent then
					-- 타임아웃에는 숨김·위치·원래 충돌을 복원해 완성 자산이 사라지지 않게 한다.
					for _, piece in pieces do
						if piece.part.Parent then
							piece.part.CFrame, piece.part.Transparency, piece.part.CanCollide = piece.final, piece.alpha, piece.solid
						end
					end
					m:SetAttribute("BuildVisualState", "complete")
					return
				end
				local timing = TweenInfo.new(0.72, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
				for _, piece in pieces do
					if piece.part.Parent then
						TweenService:Create(piece.part, timing, { CFrame = piece.final, Transparency = piece.alpha }):Play()
					end
				end
				task.delay(0.76, function()
					if not m.Parent or not parent.Parent then return end
					for _, piece in pieces do
						if piece.part.Parent then piece.part.CanCollide = piece.solid end
					end
					m:SetAttribute("BuildVisualState", "complete")
				end)
			end)
		else
			m:SetAttribute("BuildVisualState", "complete")
		end
	end
	return m
end

-- 등불: 승인된 Town/lantern 위에 불빛을 단다 (낮엔 약하고 밤엔 밝아진다)
local function lantern(parent, pos, size)
	local m = importedModel(parent, "Town", "lantern", pos, size, false)
	local base = m and m:FindFirstChildWhichIsA("BasePart", true)
	if base then
		local light = Instance.new("PointLight")
		light.Color = Color3.fromRGB(255, 205, 130)
		light.Range = 12
		light.Brightness = 0.4
		light.Parent = base
	end
	return m
end

-- 항구 주민·시설 NPC: 공통 R15 Humanoid 관절 모델 사용.
local KEEPER_ROLE = {
	["교역소"] = "Rogue", ["주점"] = "Barbarian", ["항만청"] = "Knight", ["은행"] = "Mage",
	["상인 길드"] = "Rogue_Hooded", ["학자의 서재"] = "Mage", ["도서관 (도감)"] = "Mage",
}
local OC = Color3.fromRGB
local currentKey = "north"
local currentYear = 1700
local function villager(parent, pos, facing, coat, rng, role, keepCoat, extra)
	role = role or ({ "Knight", "Barbarian", "Mage", "Rogue", "Rogue_Hooded" })[rng:NextInteger(1, 5)]
	local o = OUTFIT[currentKey]
	local year = if extra and type(extra.year) == "number" then extra.year else currentYear
	local outfit
	if o then
		outfit = {
			hat = if role == "Rogue_Hooded" or role == "Knight" then nil else o.hat,
			hatColor = o.hats[rng:NextInteger(1, #o.hats)],
			trousers = if o.trousers then o.trousers[rng:NextInteger(1, #o.trousers)] else nil,
		}
		if not keepCoat then
			coat = o.coats[rng:NextInteger(1, #o.coats)]
		end
	end
	if extra then
		outfit = outfit or {}
		for k, v in extra do
			outfit[k] = v
		end
	end
	outfit = outfit or {}
	outfit.year = year
	outfit.culture = currentKey
	outfit.profession = if extra and extra.profession then extra.profession else role
	-- [남녀 외형] 기존 문화권 복장색·연도는 유지하고 남녀별 머리/체형/주민복을 지정한다.
	local female = if extra and type(extra.female) == "boolean" then extra.female else rng:NextNumber() < 0.47
	outfit.gender = if female then "female" else "male"
	if year >= 1500 then
		if female then
			outfit.hair = outfit.hair or (if rng:NextNumber() < 0.52 then "bun" else "long")
			if not outfit.companion then
				outfit.skirt = outfit.skirt or coat
				outfit.skirtLong = true
			end
		else
			outfit.hair = outfit.hair or "short"
		end
	end
	if outfit.companion then outfit.hat = nil end
	-- 15세기: 후대 모자뿐 아니라 Part 조립으로 만들어진 가짜 의상·머리카락은 새로 붙이지 않는다.
	-- 실제 승인된 15세기 R15 복식·머리 메시의 장착 검증이 끝나면 그 메시만 사용한다.
	if year < 1500 then
		outfit.hat = nil
		outfit.hair = nil
		outfit.skirt = nil
	elseif outfit.hat == "tricorn" and year < 1680 then
		outfit.hat = "wide"
	end
	if extra and extra.noHat then outfit.hat = nil end
	local figure = Pose.createR15(parent, pos, facing, coat, rng, role,
		if extra and type(extra.height) == "number" then extra.height else 5.8, outfit)
	if figure then figure.Name = "Villager" end
	return figure
end

-- 캐릭터(약 5스터드)에 비해 집이 장난감처럼 작아 보여서 전체적으로 키운다 (대신 간격도 같이 넓힌다)
local HOUSE_SCALE = 1.28

-- 건물 발전도는 낡음/증축으로 표현한다. 지역의 석조·벽돌·목조 재질을 다른 문화권의 목재로 덮지 않는다.
local houseTier = 1 -- 발전 단계 (PortScene.build 가 정한다)
local function uniformMaterial(m, style, surface)
	local architecture = style.house
	local mat = if surface == "roof" then (architecture and architecture.roofMat) or style.mat
		elseif surface == "trim" then (architecture and architecture.trimMat) or style.mat
		elseif surface == "entry" then (architecture and architecture.entryMat) or style.mat
		else style.mat
	if not (m and mat) then return end
	for _, p in m:GetDescendants() do
		-- 수입 원본의 유리창·금속 장식·발광등을 석조/목조로 덮지 않는다.
		if p:IsA("BasePart") and p.Material ~= Enum.Material.Glass
			and p.Material ~= Enum.Material.Metal and p.Material ~= Enum.Material.Neon then
			p.Material = mat
		end
	end
end

local vacancyRate = 0 -- 빈집 비율 (PortScene.build 가 정한다)
local function house(parent, pos, w, d, floors, style, rng, wallColor)
	-- [광장 건축 금지] 향후 시설 추가에서도 중앙광장의 빈 보행 공간은 유지한다.
	if parent.Name == "PortScene" then
		local dx, dz = pos.X + 6, pos.Z
		if dx * dx + dz * dz < CENTRAL_PLAZA_RADIUS * CENTRAL_PLAZA_RADIUS then return nil end
	end
	-- 벽 색을 먼저 정해, 수입한 집 메쉬 전체에 같은 따뜻한 색을 입힌다 (회색 맨몸 집 방지)
	-- 마을 전체가 한 팔레트로 보이도록: 지역 대표색(첫 색)에 가깝게 모으고 집마다 아주 조금만 다르게 한다
	local tintColor = wallColor or style.walls[1]:Lerp(style.walls[rng:NextInteger(1, #style.walls)], 0.3)
	-- 빈집: 위치로 정한 일부 집은 색이 바래고 앞에 판자 울타리가 쳐진다
	if houseTier <= 1 then
		tintColor = tintColor:Lerp(Color3.fromRGB(176, 150, 100), 0.25) -- 초가·통나무 느낌으로 바랜 색
	end
	local vacant = vacancyRate > 0 and ((math.floor(math.abs(pos.X * 11 + pos.Z * 17)) % 100) / 100) < vacancyRate
	if vacant then
		tintColor = tintColor:Lerp(Color3.fromRGB(96, 94, 92), 0.55)
	end
	-- 위치로 정한 크기 변주(0.86~1.08배)와 180도 뒤집기로 같은 집이 반복돼 보이지 않게 한다
	local seed = math.floor(math.abs(pos.X * 3 + pos.Z * 5))
	local architecture = style.house or {}
	local front = if pos.Z > 0 then -1 else 1
	local variation = 0.86 + (seed % 7) * 0.037
	-- 층수가 높을수록 집도 키워서 1·2·3층이 실루엣으로 구분되게 한다 (0.92~1.12배)
	variation *= 0.92 + (math.clamp(floors or 2, 1, 3) - 1) * 0.1
	variation *= style.sizeMul or 1
	-- (Town/house_chimney, house_door 는 집 전체가 아니라 굴뚝·문 부품이라 집 본체로 쓰지 않는다)
	-- 동아시아 건축 세트: 등록된 eastasia 몸체를 층수만큼 쌓고 처마 지붕을 얹어 일반 집과 실루엣이 다르다
	if style.kit == "eastasia" then
		local size = math.max(w, d) * variation * HOUSE_SCALE
		local base = importedModel(parent, "Town", "eastasia-base", pos, size, true, tintColor)
		if base then
			base.Name = "HarborHouse"
			uniformMaterial(base, style)
			local _, ext = base:GetBoundingBox()
			local top = pos.Y + ext.Y
			for _ = 2, math.clamp(floors or 1, 1, 3) do
				local upper = importedModel(parent, "Town", "eastasia-base", Vector3.new(pos.X, top, pos.Z), size * 0.94, true, tintColor)
				if not upper then break end
				upper.Name = "HarborHouse"
				uniformMaterial(upper, style)
				local _, e2 = upper:GetBoundingBox()
				top += e2.Y
			end
			local roof = importedModel(parent, "Town", "eastasia-roof", Vector3.new(pos.X, top, pos.Z), size * 1.22, false, style.roofs[rng:NextInteger(1, #style.roofs)])
			if roof then
				roof.Name = "HarborRoof"
				uniformMaterial(roof, style, "roof")
			end
			-- 동아시아의 집 앞은 기존 승인된 계단 메시로 구분한다. 시설 출입 판정은 바꾸지 않는다.
			if architecture.eastAsiaEntry and not vacant and houseTier >= 2 and seed % 3 == 0 then
				local stairs = importedModel(parent, "Town", "eastasia-stairs",
					pos + Vector3.new(0, 0, front * size * 0.48), size * 0.34, false)
				if stairs then stairs.Name = "HarborEntrance" end
			end
			if vacant then
				for k = -1, 1 do
					importedModel(parent, "Town", "fence_straight", pos + Vector3.new(k * 4, 0, if pos.Z > 0 then -size * 0.7 else size * 0.7), 4, false)
				end
			end
			return base:FindFirstChildWhichIsA("BasePart", true)
		end
	end
	-- [대륙 실루엣] 평지붕 석조집/중정집/열대 고상식 주택은 기존 북유럽 박공지붕
	-- 원본을 색만 바꿔 쓰지 않는다. 소수의 로컬 Part로 입면 자체를 다른 구조로 조립한다.
	local form = architecture.form
	if form == "flat" or form == "courtyard" or form == "carved" or form == "stilt" then
		local ww = w * variation * HOUSE_SCALE * 0.94
		local dd = d * variation * HOUSE_SCALE * 0.94
		local hh = math.max(6, (floors or 1) * 5.6)
		local lifted = form == "stilt"
		local lift = if lifted then 3.2 else 0
		local material = if lifted then Enum.Material.WoodPlanks else (style.mat or Enum.Material.Sandstone)
		local building = part(parent, Vector3.new(ww, hh, dd), CFrame.new(pos + Vector3.new(0, lift + hh * 0.5, 0)), tintColor, material)
		building.Name = "HarborHouse"
		building:SetAttribute("Architecture", form)
		local roofColor = style.roofs[(seed % #style.roofs) + 1]
		if lifted then
			-- 바닥을 올리고 네 기둥과 깊은 처마를 배치: 동남아·태평양 수변가옥/통풍형 주택.
			local floor = part(parent, Vector3.new(ww + 1.3, 0.45, dd + 2.2), CFrame.new(pos + Vector3.new(0, lift - 0.3, 0)), C(112, 88, 59), Enum.Material.WoodPlanks)
			floor.Name = "StiltDeck"
			for _, dx in { -1, 1 } do
				for _, dz in { -1, 1 } do
					local pole = part(parent, Vector3.new(0.65, lift + 0.2, 0.65), CFrame.new(pos + Vector3.new(dx * ww * 0.42, lift * 0.5, dz * dd * 0.43)), C(93, 71, 48), Enum.Material.Wood)
					pole.Name = "StiltSupport"
				end
			end
			gableRoof(parent, pos + Vector3.new(0, lift + hh + 0.35, 0), ww + 3.6, dd + 4, dd * 0.34, roofColor)
			local landing = part(parent, Vector3.new(ww * 0.42, 0.4, 2.9), CFrame.new(pos + Vector3.new(0, lift - 0.3, front * (dd * 0.5 + 1))), C(130, 101, 69), Enum.Material.WoodPlanks)
			landing.CanCollide = false
		else
			-- 이슬람권·동서아프리카의 평지붕과 낮은 난간: 역사 지역별 재료만 다르게.
			local roof = part(parent, Vector3.new(ww + 1.5, 0.6, dd + 1.5), CFrame.new(pos + Vector3.new(0, hh + 0.32, 0)), roofColor:Lerp(tintColor, 0.44), material)
			roof.Name = "FlatRoof"
			for _, dx in { -1, 1 } do
				local parapet = part(parent, Vector3.new(0.7, 1.3, dd + 1.5), CFrame.new(pos + Vector3.new(dx * (ww * 0.5 + 0.5), hh + 1.05, 0)), tintColor, material)
				parapet.CanCollide = false
			end
			if houseTier >= 2 then
				local lip = part(parent, Vector3.new(ww + 1.5, 1.1, 0.7), CFrame.new(pos + Vector3.new(0, hh + 0.94, -front * (dd * 0.5 + 0.46))), tintColor, material)
				lip.CanCollide = false
			end
			if form == "courtyard" and houseTier >= 3 and seed % 3 == 0 then
				-- 주택 안쪽 중정을 직접 열 수 없는 경우 외벽 안쪽의 그늘막으로 표현한다.
				local canopy = part(parent, Vector3.new(ww * 0.48, 0.4, dd * 0.24), CFrame.new(pos + Vector3.new(0, hh * 0.62, front * (dd * 0.5 + 0.55))), C(154, 118, 78), Enum.Material.WoodPlanks)
				canopy.CanCollide = false
			end
		end
		if not vacant and houseTier >= 2 then
			local entry = if form == "carved" then "kenney_wood_door_round_01"
				elseif lifted then "kenney_wood_door_square_01" else "kenney_grey_door_round_01"
			local door = importedModel(parent, "Town", entry, pos + Vector3.new(0, lift, front * (dd * 0.5 + 0.2)), math.min(ww * 0.38, 5), false)
			if door then door.Name = "HarborEntrance" end
			if form == "carved" and houseTier >= 3 then
				-- 스와힐리 석조집: 깊은 목조 문틀·양쪽 기둥으로 아프리카 동해안 입면을 구분한다.
				for _, side in { -1, 1 } do
					local trim = part(parent, Vector3.new(0.45, hh * 0.56, 0.55), CFrame.new(pos + Vector3.new(side * ww * 0.18, lift + hh * 0.29, front * (dd * 0.5 + 0.4))), C(93, 61, 38), Enum.Material.Wood)
					trim.CanCollide = false
				end
			end
		end
		return building
	end
	local variant = "house"
	local mesh = importedModel(parent, "Town", variant, pos, math.max(w, d) * variation * HOUSE_SCALE, true, tintColor)
	if mesh then
		mesh.Name = "HarborHouse"
		uniformMaterial(mesh, style)
		if (seed // 7) % 2 == 1 then
			local c = mesh:GetBoundingBox().Position
			mesh:PivotTo(CFrame.new(c) * CFrame.Angles(0, math.pi, 0) * CFrame.new(-c) * mesh:GetPivot())
		end
		if vacant then
			for k = -1, 1 do
				importedModel(parent, "Town", "fence_straight", pos + Vector3.new(k * 4, 0, 0) + Vector3.new(0, 0, if pos.Z > 0 then -math.max(w, d) * 0.7 else math.max(w, d) * 0.7), 4, false)
			end
		end
		-- 문화권별 승인된 지붕창·박공·창호 메시를 일부 주택에만 올려 주택 형태를 차별화한다.
		-- 기존 본체 메시와 충돌하지 않도록 장식만 비충돌로 두고, 주택/시설의 고유 판정은 유지한다.
		local _, ext = mesh:GetBoundingBox()
		if architecture.roof and not vacant and seed % (if houseTier >= 3 then 3 else 4) == 0 then
			local roof = importedModel(parent, "Town", architecture.roof,
				pos + Vector3.new(0, ext.Y * 0.78, front * ext.Z * 0.28),
				ext.X * 0.45, false, style.roofs[rng:NextInteger(1, #style.roofs)])
			if roof then
				roof.Name = "HarborRoofDetail"
				uniformMaterial(roof, style, "roof")
			end
		end
		if architecture.trim and not vacant and seed % (if houseTier >= 3 then 2 else 3) == 0 then
			local trim = importedModel(parent, "Town", architecture.trim,
				pos + Vector3.new(ext.X * 0.2, ext.Y * 0.40, front * ext.Z * 0.51),
				ext.X * 0.26, false, style.roofs[1]:Lerp(tintColor, 0.3))
			if trim then
				trim.Name = "HarborWindowDetail"
				uniformMaterial(trim, style, "trim")
			end
		end
		-- 승인된 문의 둥근 아치/목재 형태로 집 입면을 구분한다.
		-- 고정된 일부 주택에만 비충돌 장식으로 두어 모바일 객체 수와 기존 출입 기능을 보호한다.
		if architecture.entry and not vacant and seed % 3 == 1 then
			local doorway = importedModel(parent, "Town", architecture.entry,
				pos + Vector3.new(0, 0, front * ext.Z * 0.52),
				ext.X * 0.29, false)
			if doorway then
				doorway.Name = "HarborDoorDetail"
				uniformMaterial(doorway, style, "entry")
			end
		end
		local size = math.max(w, d) * variation
		-- 별채·굴뚝·발코니는 해당 문화권의 건축형식과 건조 환경에 맞는 곳에만 배치한다.
		if architecture.annex and seed % 4 == 1 then
			local annex = importedModel(parent, "Town", "house", pos + Vector3.new(size * 0.58, 0, size * 0.18), size * 0.32 * HOUSE_SCALE, false, tintColor)
			if annex then
				annex.Name = "HarborAnnex"
				uniformMaterial(annex, style)
			end
		end
		if architecture.chimney and houseTier >= 2 and (houseTier >= 3 or math.floor(math.abs(pos.X * 7 + pos.Z * 13)) % 2 == 0) then
			local chim = importedModel(parent, "Town", "chimney", pos + Vector3.new(0, size * 0.7, 0), size * 0.4, false, Color3.fromRGB(122, 98, 84))
			if chim then chim.Name = "HarborChimney" uniformMaterial(chim, style) end
		end
		if architecture.balcony and houseTier >= 3 and not vacant and seed % 3 == 0 and (floors or 1) >= 2 then
			local bal = importedModel(parent, "Town", "balcony-wall-fence", pos + Vector3.new(0, size * 0.55, front * size * 0.52), size * 0.7, false, tintColor)
			if bal then
				bal.Name = "HarborBalcony"
				uniformMaterial(bal, style, "trim")
			end
		end
		-- [유럽·지중해·남아시아] 동일한 기본 주택 메시에 지역별 골조/박공/회랑/현관을 얹는다.
		-- 상세 장식은 일부 주택에만 출력하여 모바일 장면의 파트 수를 제한한다.
		if not vacant and houseTier >= 2 and seed % 4 == 1 then
			local form = architecture.form
			local decor = C(89, 65, 47)
			if form == "stepped" then
				-- 한자동맹: 계단형 정면 박공 실루엣.
				for j = -2, 2 do
					local h = (3 - math.abs(j)) * ext.Y * 0.095
					local gable = part(parent, Vector3.new(ext.X * 0.19, h, 0.52), CFrame.new(pos + Vector3.new(j * ext.X * 0.18, ext.Y + h * 0.35, front * ext.Z * 0.48)), tintColor:Lerp(style.roofs[1], 0.44), Enum.Material.Brick)
					gable.CanCollide = false
				end
			elseif form == "timber" then
				-- 북유럽·영국: 기둥과 가로보가 드러나는 목골조.
				for _, dx in { -0.35, 0.35 } do
					local beam = part(parent, Vector3.new(0.38, ext.Y * 0.68, 0.38), CFrame.new(pos + Vector3.new(ext.X * dx, ext.Y * 0.43, front * (ext.Z * 0.5 + 0.15))), decor, Enum.Material.Wood)
					beam.CanCollide = false
				end
				local brace = part(parent, Vector3.new(ext.X * 0.8, 0.38, 0.4), CFrame.new(pos + Vector3.new(0, ext.Y * 0.75, front * (ext.Z * 0.5 + 0.15))), decor, Enum.Material.Wood)
				brace.CanCollide = false
			elseif form == "arcade" or form == "loggia" then
				-- 이베리아/이탈리아: 돌기둥 회랑과 발코니 돌출 처마.
				for _, dx in { -0.32, 0.32 } do
					importedModel(parent, "Terrain", "column", pos + Vector3.new(ext.X * dx, 0, front * (ext.Z * 0.52 + 0.85)), ext.Y * 0.58, false)
				end
				if houseTier >= 3 then
					local veranda = part(parent, Vector3.new(ext.X * 0.85, 0.42, 2.4), CFrame.new(pos + Vector3.new(0, ext.Y * 0.52, front * (ext.Z * 0.5 + 0.9))), tintColor, Enum.Material.Limestone)
					veranda.CanCollide = false
				end
			elseif form == "veranda" then
				-- 크리올·식민 항구: 넓은 전면 베란다와 차양.
				local awning = part(parent, Vector3.new(ext.X * 0.95, 0.35, 3), CFrame.new(pos + Vector3.new(0, ext.Y * 0.62, front * (ext.Z * 0.5 + 0.9))), style.roofs[1], Enum.Material.WoodPlanks)
				awning.CanCollide = false
				for _, dx in { -0.4, 0.4 } do
					local post = part(parent, Vector3.new(0.4, ext.Y * 0.6, 0.4), CFrame.new(pos + Vector3.new(ext.X * dx, ext.Y * 0.3, front * (ext.Z * 0.5 + 1.9))), decor, Enum.Material.Wood)
					post.CanCollide = false
				end
			elseif form == "mansard" then
				-- 프랑스: 지붕창과 작은 처마가 비대칭으로 솟는 석조 시가지.
				for _, dx in { -0.26, 0.26 } do
					importedModel(parent, "Town", "roof-high-window", pos + Vector3.new(ext.X * dx, ext.Y * 0.83, front * ext.Z * 0.25), ext.X * 0.27, false)
				end
			elseif form == "coastal" then
				-- 인도 서해안: 넓고 낮은 목조 처마.
				local eave = part(parent, Vector3.new(ext.X + 3, 0.4, ext.Z + 3), CFrame.new(pos + Vector3.new(0, ext.Y * 0.78, 0)), style.roofs[1], Enum.Material.WoodPlanks)
				eave.CanCollide = false
			end
		end
		-- 번성한 항구(4단계↑)엔 집 옆에 수레(Town/cart)를 세워 장사하는 분위기를 낸다
		if houseTier >= 4 and not vacant and seed % 5 == 2 then
			importedModel(parent, "Town", "cart", pos + Vector3.new(size * 0.8, 0, if pos.Z > 0 then -size * 0.7 else size * 0.7), 4, false)
		end
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
	local modelLength = BLUEPRINT_SHIP_SIZE[shipId] or 26 * s
	local bottom = Vector3.new(at.X, at.Y - 2 * s, at.Z)
	-- [5차 선박 원본] 기존 자산 업로더가 승인·등록한 실제 GLB만 사용한다.
	-- 터치 기기에는 경량판 우선. 미등록·로딩 지연 시 기존 수입본을 보존한다.
	local fullName, mobileName = shipId .. "-v5", shipId .. "-v5-mobile"
	local hasMobile = UserInputService.TouchEnabled and AssetIds["Naval/" .. mobileName] ~= nil
	local preferredName = if hasMobile then mobileName elseif AssetIds["Naval/" .. fullName] then fullName else nil
	local upgraded = if preferredName then importedModel(parent, "Naval", preferredName, bottom, V5_SHIP_LENGTH[shipId] or modelLength, false) else nil
	if not upgraded and hasMobile and AssetIds["Naval/" .. fullName] then
		preferredName = fullName
		upgraded = importedModel(parent, "Naval", fullName, bottom, V5_SHIP_LENGTH[shipId] or modelLength, false)
	end
	-- 선박 ID별 기존 완제품·전용 GLB·공용 선체를 순서대로 유지한다.
	local dedicated = if upgraded then nil else importedModel(parent, "Ships", shipId, bottom, modelLength, false, look.metal and look.hull or nil)
	local meshAsset = SHIP_MESH[shipId] or "ship-small"
	local shipMesh = upgraded or dedicated or importedModel(parent, "Naval", meshAsset, bottom, modelLength, false, look.metal and look.hull or nil)
	-- 신규 상세 갈레온이 아직 스트리밍되지 않았다면 운영 중인 기존 범선 모델을 보존한다.
	if not shipMesh and shipId == "galleon" and SHIP_MESH.galleon == "galleon-heritage" then
		meshAsset = "ship-large"
		shipMesh = importedModel(parent, "Naval", meshAsset, bottom, 26 * s, false)
	elseif not shipMesh and shipId == "frigate" and SHIP_MESH.frigate == "frigate" then
		-- [기존 항구 보존] 프리깃 완성 모델을 못 읽으면 종전 공용 범선으로 복구한다.
		meshAsset = "ship-pirate-medium"
		shipMesh = importedModel(parent, "Naval", meshAsset, bottom, 26 * s, false)
	elseif not shipMesh and CUSTOM_SHIP_FALLBACK[shipId] then
		-- [로딩 지연 복구] 모든 함종에서 고유 메시가 미수입·권한 거부면 이전 공용 선체를 사용한다.
		meshAsset = CUSTOM_SHIP_FALLBACK[shipId]
		shipMesh = importedModel(parent, "Naval", meshAsset, bottom, 26 * s, false)
	end
	if shipMesh then
		shipMesh.Name = "Ship"
		if upgraded then shipMesh:SetAttribute("MareShipV5Model", preferredName) end
		if not upgraded and not dedicated and meshAsset ~= shipId .. "-custom" then
			-- [외형 중복 방지] 완성 고유 메시에는 기존 대포·외륜·굴뚝·갑판 조합을 다시 추가하지 않는다.
			-- 대포, 선루, 굴뚝, 장갑판 모두 실제 수입한 3D Mesh 모델을 조합한다.
			-- 완성 원형 메시에는 함포·선루 중복 모델을 추가하지 않는다.
			if (shipId == "frigate" or shipId == "galleon" or shipId == "ironclad_frigate")
				and meshAsset ~= "frigate" and meshAsset ~= "galleon-heritage" then
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

-- 마을 밀도·외곽 --------------------------------------------------------------
local function styleKeyOf(style)
	for k, v in STYLE do
		if v == style then return k end
	end
	return "north"
end

-- 성당 종탑 문화권(유럽·식민지). 오스만·일본·스와힐리·말라바르는 각자의 건축물을 세운다.
local CHURCH_KEYS = { iberia = true, italy = true, france = true, britain = true, brick = true, hanse = true, nordic = true, colonial = true, creole = true, north = true, med = true }

local function rotateAround(m, pos, yaw)
	if m then
		m:PivotTo(CFrame.new(pos) * CFrame.Angles(0, yaw, 0) * CFrame.new(-pos) * m:GetPivot())
	end
end

-- 항구 발전도(1~5)와 지역별 마을 배치 ------------------------------------------
local sceneLevel = 1
local function roadMat()
	-- 발전도별 바닥: 흙 → 자갈 → 포석 → 화강암 → 대리석
	return if sceneLevel <= 1 then Enum.Material.Sand
		elseif sceneLevel == 2 then Enum.Material.Pebble
		elseif sceneLevel == 3 then Enum.Material.Cobblestone
		elseif sceneLevel == 4 then Enum.Material.Granite
		else Enum.Material.Marble
end
local function roadColor(style)
	if sceneLevel <= 1 then
		return style.street:Lerp(Color3.fromRGB(176, 146, 104), 0.65)
	end
	return style.street
end
local function strip(folder, style, cx, cz, sx, sz)
	local p = part(folder, Vector3.new(sx, 0.2, sz), CFrame.new(cx, 0.1, cz), roadColor(style), roadMat())
	p.CanCollide = false
	p.CanQuery = false
end

local function smokeOn(folder, pos)
	local s = part(folder, Vector3.new(1, 1, 1), CFrame.new(pos), Color3.new(1, 1, 1))
	s.Transparency = 1
	s.CanCollide = false
	s.CanQuery = false
	local sm = Instance.new("Smoke")
	sm.Color = Color3.fromRGB(200, 200, 200)
	sm.Size = 1.6
	sm.Opacity = 0.2
	sm.RiseVelocity = 3
	sm.Parent = s
end

-- 야자수는 위도 36도 이하(또는 열대/사막)에서만. 프랑스 등 북·서유럽은 참나무·소나무.
local function palmOk(portId, style)
	local p = PortData.Ports[portId]
	if p and p.country == "france" then return false end
	if p and p.lat > 36 then return false end
	return true
end

-- 마을 주민의 일: 직업마다 일터와 모션이 있고, 항구 발전도가 오를수록 일하는 사람이 늘어난다.
local IDLE_POOL = { "talk", "lean", "point", "wave", "write", "inspect", "count", "stretch", "drink", "listen", "salute" } -- 멈춰 선 주민이 상황과 시간에 따라 다른 동작을 한다
local stallSpots = {}
-- [경제 건축 연출] 현재 세션의 항구별 장식 단계만 기억한다. 게임 저장·서버 경제에는 쓰지 않는다.
local lastDecorationGrowth = {}
-- [시설 자동 증축] 실제 경제 건축 단계만 항구별 세션에 기억한다. 저장·구매 로직과 무관하다.
local lastFacilityGrowth = {}
local SKIN_HAIR = { Color3.fromRGB(48, 36, 30), Color3.fromRGB(86, 60, 40), Color3.fromRGB(150, 110, 60), Color3.fromRGB(30, 28, 30) }
local GRAY_HAIR = Color3.fromRGB(206, 204, 200)
local function faceTo(from, to)
	local d = to - from
	return math.atan2(-d.X, -d.Z)
end
-- 손에 든 짐: 승인된 3D 소품을 윗몸 앞에 붙인다 (실패하면 빈손)
local function holdProp(fig, kind, asset, size)
	local torso = fig and fig:FindFirstChild("UpperTorso")
	if not torso then return end
	local ok = pcall(function()
		local m = importedModel(fig, kind, asset, torso.Position, size, false)
		if not m then return end
		m:PivotTo(torso.CFrame * CFrame.new(0, -0.2, -1.6))
		local main
		for _, p in m:GetDescendants() do
			if p:IsA("BasePart") then
				p.Anchored = false
				p.Massless = true
				p.CanCollide = false
				main = main or p
			end
		end
		if main then
			local w = Instance.new("WeldConstraint")
			w.Part0, w.Part1 = torso, main
			w.Parent = main
			for _, p in m:GetDescendants() do
				if p:IsA("BasePart") and p ~= main then
					local w2 = Instance.new("WeldConstraint")
					w2.Part0, w2.Part1 = main, p
					w2.Parent = p
				end
			end
		end
	end)
	return ok
end

-- 항구 구역 계획: 항구가 만드는 물건(생산품)과 발전도로 구역의 크기·종류가 달라진다.
-- 농원(가축 울타리) · 어항(건조대·쪽배) · 광산·벌목 하역장 · 해안 포대(군사)가 항구마다 다르게 선다.
local function zoneLayout(portId, lvl, shipyardBuilt, buildings)
	local port = PortData.Ports[portId]
	local prod = {}
	for _, g in (port and port.produces) or {} do
		prod[g] = true
	end
	local function any(list)
		for _, g in list do
			if prod[g] then return true end
		end
		return false
	end
	local zr = seeded(portId .. "zone")
	local lay = {
		fish = any({ "fish", "whale_oil", "salt", "amber" }),
		farm = any({ "wool", "cheese", "wine", "olive_oil", "rice", "maize", "cotton", "beer", "leather", "dates", "sugar" }),
		timber = any({ "timber", "mahogany", "kauri", "logwood", "brazilwood", "sandalwood" }),
		mine = any({ "iron", "coal", "tin", "copper", "gold", "silver", "gems" }),
		fort = lvl >= 4 or (shipyardBuilt == true and lvl >= 3),
		trader = port ~= nil and #port.produces >= 4,
		side = zr:NextInteger(0, 1) * 2 - 1,
	}
	-- [항만 실제 필지] 어항·자재 적치·경비 구역을 조선소와 분리한다.
	-- 기존 조선소는 남쪽 -48~-108, 세관·항만청은 중앙, 접안 잔교는 바다 x>=22.
	-- 같은 항구·단계에 언제나 같은 위치. 선박 항로와 시장·주택 필지를 침범하지 않는다.
	local shore = if shipyardBuilt then 1 else -lay.side
	local bounds = PortBuildings.HarborPlotBounds
	lay.fishZ = shore * bounds.fishery.z
	lay.freightZ = shore * bounds.freight.z
	lay.fortZ = if shipyardBuilt then -bounds.defense.z else lay.side * bounds.fishery.z
	lay.shipyardBuilt = shipyardBuilt == true
	lay.freight = lvl >= 2 and (lay.timber or lay.mine or buildings == nil or (buildings.warehouse or 0) > 0)
	-- [구역 경계] 실제 접안/조선/어업/원자재/경비 필지의 부지 폭과 좌표를 기록한다.
	-- 실제 도로/조선소와 접하는 구역만 활성화하며 다른 종류를 같은 부지에 세우지 않는다.
	lay.plots = {
		{ id = "quay", label = bounds.quay.label, x = bounds.quay.x, z = bounds.quay.z,
			halfX = bounds.quay.halfX, halfZ = bounds.quay.halfZ, active = true },
		{ id = "shipyard", label = bounds.shipyard.label, x = bounds.shipyard.x, z = bounds.shipyard.z,
			halfX = bounds.shipyard.halfX, halfZ = bounds.shipyard.halfZ, active = lay.shipyardBuilt },
		{ id = "fishery", label = bounds.fishery.label, x = bounds.fishery.x, z = lay.fishZ,
			halfX = bounds.fishery.halfX, halfZ = bounds.fishery.halfZ, active = lay.fish },
		{ id = "freight", label = bounds.freight.label, x = bounds.freight.x, z = lay.freightZ,
			halfX = bounds.freight.halfX, halfZ = bounds.freight.halfZ, active = lay.freight },
		{ id = "defense", label = bounds.defense.label, x = bounds.defense.x, z = lay.fortZ,
			halfX = bounds.defense.halfX, halfZ = bounds.defense.halfZ, active = lay.fort },
	}
	-- 별도 축사 없이 발전 단계에 따라 열린 목장 구역이 늘어난다(기존 세계경제 저장값 불변).
	lay.pens = math.clamp(1 + math.floor(lvl / 2) + (if lay.farm then 1 else 0), 1, 4)
	return lay
end
-- [대형 농촌 구획] 농장·목장의 중앙선을 통일해 4개까지 독립 필지가 겹치지 않는다.
-- 도시·궁전·항구는 동쪽, 경작지는 서쪽으로 분리한다. 경제·저장 기준 좌표가 아니다.
local function penAt(i, n)
	local rural = PortBuildings.RuralPlots
	return Vector3.new(rural.centerX, 0, (i - (n + 1) / 2) * rural.penSpacing)
end

local function spawnJobs(folder, info, rng, lvl, walkers, key)
	local year = info.year or currentYear
	local o = OUTFIT[key] or OUTFIT.north or {}
	local function person(pos, facing, spec, profession)
		local extra = { year = year, age = spec.age or "adult", profession = spec.profession or profession or spec.role or "villager" }
		local female = if type(spec.female) == "boolean" then spec.female else rng:NextNumber() < 0.47
		extra.female = female
		local old = extra.age == "elder"
		local hairColor = if old then GRAY_HAIR else SKIN_HAIR[rng:NextInteger(1, #SKIN_HAIR)]
		extra.hairColor = hairColor
		extra.hair = if female then (if extra.age == "child" then "long" elseif rng:NextNumber() < 0.5 then "bun" else "long") else "short"
		if female and extra.age ~= "child" then
			extra.skirt = spec.skirt or (o.coats and o.coats[rng:NextInteger(1, #o.coats)]) or Color3.fromRGB(120, 90, 70)
			extra.skirtLong = true
		end
		if spec.hat ~= false then
			extra.hat = spec.hat or (if female and extra.age ~= "child" then nil else o.hat)
			extra.hatColor = spec.hatColor or (if o.hats then o.hats[rng:NextInteger(1, #o.hats)] else nil)
		else
			extra.noHat = true
		end
		-- villager() 는 지역 복식표의 모자를 기본으로 쓰므로 hat=nil 이면 모자 없이 만들도록 표시
		local fig = villager(folder, pos, facing, spec.coat, rng, spec.role or "Rogue", spec.coat ~= nil, extra)
		return fig
	end
	local function addTask(fig, t)
		if not fig then return end
		t.model = fig
		t.elder = fig:GetAttribute("Age") == "elder"
		t.base = fig:GetPivot()
		-- [마을 지면 오프셋] 일과형 경유지는 지면 Y, PivotTo는 허리 높이의 리그 중심 Y를 사용한다.
		-- 출근·시장·휴식 좌표의 XZ는 보존하고 최초 발바닥 접지 높이만 전 경유지에 유지한다.
		if t.mode == "schedule" and t.morning and t.market and t.evening then
			local lift = Vector3.new(0, t.base.Position.Y - t.morning.Y, 0)
			t.morning += lift
			t.market += lift
			t.evening += lift
		end
		t.phase = t.phase or rng:NextNumber(0, 10)
		-- [NPC 직업 소품] 기존 승인된 모델을 손 관절에 연결한다. 가상 손동작이 아니라 실제 도구를 사용한다.
		-- 짐·잔·망치·삽은 생성 시 단 한 번만 붙여 모바일 프레임당 소품 생성 비용이 없다.
		local spec = if t.kind == "carry" then { group = "Cargo", asset = if t.goodId and AssetIds["Cargo/" .. t.goodId] then t.goodId else "box-open", mount = "UpperTorso", size = 1.05, offset = CFrame.new(0, -0.35, -1.0) }
			elseif t.kind == "drink" then { group = "Cargo", asset = "mug", mount = "RightHand", size = 0.45, offset = CFrame.new(0, -0.2, -0.25) }
			elseif t.kind == "hammer" then { group = "Relics", asset = "hammer", mount = "RightHand", size = 1.05, offset = CFrame.new(0, -0.45, -0.15) * CFrame.Angles(0, 0, math.rad(80)) }
			elseif t.kind == "hoe" then { group = "Naval", asset = "tool-shovel", mount = "RightHand", size = 1.6, offset = CFrame.new(0, -0.8, -0.3) * CFrame.Angles(math.rad(80), 0, 0) }
			else nil
		local mount = spec and fig:FindFirstChild(spec.mount, true)
		local assets = ReplicatedStorage:FindFirstChild("MareAssets")
		local group = spec and assets and assets:FindFirstChild(spec.group)
		local template = spec and group and group:FindFirstChild(spec.asset)
		if template and template:IsA("Model") and mount and mount:IsA("BasePart") then
			local held = template:Clone()
			local ok = pcall(function()
				local parts = {}
				for _, mesh in held:GetDescendants() do
					if mesh:IsA("BasePart") then table.insert(parts, mesh) end
				end
				if #parts == 0 or #parts > 12 then error("NPC_PROP_PART_LIMIT") end
				local _, bounds = held:GetBoundingBox()
				local axis = math.max(bounds.X, bounds.Y, bounds.Z)
				if axis < 0.01 then error("NPC_PROP_EMPTY") end
				held:ScaleTo(held:GetScale() * (spec.size / axis))
				held.Name = "NpcWorkProp"
				held.Parent = fig
				held:PivotTo(mount.CFrame * spec.offset)
				for _, mesh in parts do
					mesh.Anchored = false
					mesh.CanCollide = false
					mesh.CanTouch = false
					mesh.CanQuery = false
					mesh.Massless = true
					local joint = Instance.new("WeldConstraint")
					joint.Part0, joint.Part1 = mount, mesh
					joint.Parent = mesh
				end
			end)
			if not ok then held:Destroy() end
		end
		table.insert(walkers, t)
	end
	local function stay(pos, target, kind, spec)
		spec = spec or {}
		local fig = person(pos, faceTo(pos, target), spec, kind)
		addTask(fig, { kind = kind, mode = "stay", job = spec.profession, workKinds = spec.workKinds, tradeKinds = spec.tradeKinds, leisureKinds = spec.leisureKinds })
		return fig
	end
	local function path(a, b, kind, speed, spec, over)
		local fig = person(a, faceTo(a, b), spec or {}, kind)
		local len = (b - a).Magnitude
		if fig then
			local p = fig:GetPivot().Position
			fig:PivotTo(CFrame.lookAt(p, p + (b - a).Unit * Vector3.new(1, 0, 1)))
		end
		addTask(fig, { kind = kind, mode = "path", len = len, speed = speed, over = over, goodId = spec and spec.goodId })
		return fig
	end
	local function pick(list) return list[rng:NextInteger(1, #list)] end

	-- [주민 일상 동선] 기존 직업 주민 중 소수만 작업장→시장→주점/광장으로 이동한다.
	-- 모바일은 2명 상한이며 카메라에서 멀면 관절 연출만 생략한다. 경제 및 저장 상태에는 관여하지 않는다.
	local livingCount = if game:GetService("UserInputService").TouchEnabled then 2 else math.min(4, 1 + lvl)
	if info.sim and (info.sim.residents or 0) < 4 then livingCount = 0 end
	for i = 1, livingCount do
		local side = if i % 2 == 0 then 1 else -1
		local work = Vector3.new(-55 - i * 5, 0, side * 22)
		local market = Vector3.new(-43 - i * 4, 0, side * 12)
		local evening = if side > 0 then Vector3.new(-26 - i * 3, 0, 12)
			else Vector3.new(-18 - i * 2, 0, -24)
		local fig = person(work, faceTo(work, market), { role = if i % 2 == 0 then "Rogue" else "Barbarian", profession = "merchant", hat = "cap" }, "merchant")
		addTask(fig, { mode = "schedule", morning = work, market = market, evening = evening,
			phase = rng:NextNumber(0, 10), socialKind = if side > 0 then "talk" else "drink" })
		if fig then fig:SetAttribute("DailyRoutine", "work") end
	end

	-- [지역 물류] 현재 항구에서 실제 생산하는 품목만 작업장→시장→부두 보행으로 운송한다.
	-- 운송 자체는 순수 연출이며 가격·재고·체결·저장 데이터는 수정하지 않는다.
	if lvl >= 2 then
		local made = (PortData.Ports[info.portId] and PortData.Ports[info.portId].produces) or {}
		local n = if game:GetService("UserInputService").TouchEnabled then 1 else math.min(2, #made)
		for i = 1, n do
			local good = made[i]
			if good and AssetIds["Cargo/" .. good] then
				local z = if i == 1 then 10 else -10
				-- 서쪽 생산 구역에서 중앙 시장까지, 시장에서 부두까지 기존 도로를 따른다.
				local a = if i == 1 then Vector3.new(-240, 0, z) else Vector3.new(-104, 0, z)
				local b = if i == 1 then Vector3.new(-62, 0, z) else Vector3.new(6, 0, z)
				path(a, b, "carry", 1.6, { role = "Barbarian", hat = "cap", profession = "merchant", goodId = good })
			end
		end
	end

	-- [광장 바깥 조리터] 모닥불·솥·요리 주민을 같이 옮겨 기존 조리 모션과 생활 연출을 유지한다.
	importedModel(folder, "Terrain", "campfire-stones", Vector3.new(-82, 0, -26), 3.6, false)
	importedModel(folder, "Cargo", "pot-stew", Vector3.new(-82, 1.2, -26), 2.2, false)
	stay(Vector3.new(-82, 0, -23.2), Vector3.new(-82, 0, -26), "stir", { female = true, role = "Rogue", hat = false })
	if lvl >= 3 then
		stay(Vector3.new(-85, 0, -24), Vector3.new(-82, 0, -26), "stir", { female = true, role = "Rogue", hat = false, age = "elder" })
	end
	-- 경제 국면 연출: 호황·버블엔 상점 증축 비계와 활기, 불황·붕괴엔 문 닫은 가게(판자 울타리·빈 통)
	do
		local econ = info.econ
		local boomy = econ == "boom" or econ == "bubble"
		local bleak = econ == "depression" or econ == "bust" or econ == "recession" or econ == "deflation"
		local spots = { Vector3.new(-40, 0, 20), Vector3.new(-40, 0, -20), Vector3.new(-74, 0, 20), Vector3.new(-74, 0, -20), Vector3.new(-100, 0, 20), Vector3.new(-100, 0, -20) }
		local n = if econ == "bust" or econ == "depression" or econ == "bubble" then 4 elseif boomy or bleak then 2 else 0
		for i = 1, n do
			local at = spots[i]
			if boomy then
				importedModel(folder, "Terrain", "wood-structure", at, 9, false)
				importedModel(folder, "Cargo", "barrel", at + Vector3.new(4, 0, 0), 2.4, false)
				importedModel(folder, "Terrain", "log-stack", at + Vector3.new(-4, 0, 0), 3.2, false)
			else
				for k = -1, 1 do
					importedModel(folder, "Town", "fence_straight", at + Vector3.new(k * 5, 0, 0), 5, false)
				end
				importedModel(folder, "Cargo", "barrel", at + Vector3.new(0, 0, if at.Z > 0 then -3 else 3), 2.4, false)
			end
		end
	end
	-- 경제 지표 연출: 실업자는 광장 가장자리에서 서성이고, 호황엔 짐꾼이 오가며 장터가 커진다.
	-- 부흥 사건은 눈에 띄는 상징물(문화=조각상·깃발, 학술=오벨리스크, 박람회=천막 장터, 해양=항구 깃발)을 세운다.
	do
		local idx = info.econIndex or 100
		local unemp = info.unemployment or 12
		local idle = math.min(5, math.floor(math.clamp(unemp - 8, 0, 24) / 4))
		for i = 1, idle do
			local z = if i % 2 == 0 then 15 else -15
			local at = Vector3.new(-14 - i * 3.5, 0, z)
			stay(at, Vector3.new(-26, 0, 0), "talk", { role = "Rogue", hat = i % 2 == 0, age = "elder" })
		end
		local busy = math.min(4, math.floor(math.clamp(idx - 105, 0, 80) / 20))
		for i = 1, busy do
			local pz = if i % 2 == 0 then 10 + i else -10 - i
			path(Vector3.new(14, 0, pz), Vector3.new(-40, 0, pz), "carry", 1.6, { role = "Barbarian", hat = false })
		end
		if idx >= 130 then
			for k = 1, 2 do
				importedModel(folder, "Town", if k == 1 then "stall-red" else "stall-green", Vector3.new(-18 - k * 9, 0, 13), 7, false)
				importedModel(folder, "Town", if k == 1 then "stall-green" else "stall-red", Vector3.new(-18 - k * 9, 0, -13), 7, false)
			end
		end
		local has = {}
		for _, b in info.boosts or {} do
			has[b] = true
		end
		if has.culture then
			for _, z in { -17, 17 } do
				importedModel(folder, "Terrain", "statue-column", Vector3.new(-12, 0, z), 12, true)
				importedModel(folder, "Castle", "flag-banner-long", Vector3.new(-16, 0, z), 10, false)
			end
			stay(Vector3.new(-14, 0, 6), Vector3.new(-26, 0, 0), "talk", { role = "Mage", hat = true })
		end
		if has.scholarly then
			-- [문화 기념비 이전] 중앙광장 외곽 기념구역으로 옮겨 학문 관련 실물 상징물은 유지한다.
			importedModel(folder, "Terrain", "pillar-obelisk", Vector3.new(-190, 0, 128), 16, true)
			importedModel(folder, "Terrain", "statue-obelisk", Vector3.new(-190, 0, -128), 14, true)
		end
		if has.fair then
			for k = 0, 3 do
				importedModel(folder, "Terrain", "tent-detailedopen", Vector3.new(-30 - k * 10, 0, 27), 9, false)
				importedModel(folder, "Terrain", "tent-detailedopen", Vector3.new(-30 - k * 10, 0, -27), 9, false)
			end
		end
		if (info.migration or 0) >= 25 then
			-- 이민자 천막촌: 성벽 밖 빈터에 천막과 모닥불
			for k = 0, 2 do
				importedModel(folder, "Terrain", "tent-detailedopen", Vector3.new(-176, 0, -30 + k * 30), 9, false)
			end
			importedModel(folder, "Terrain", "campfire-stones", Vector3.new(-168, 0, 0), 3.6, false)
		end
		if has.maritime or has.economic then
			for _, z in { -12, 12 } do
				importedModel(folder, "Castle", "flag-banner-long", Vector3.new(38, 0, z), 12, false)
			end
		end
	end
	-- 발전도 상승 공사: 새 단계가 열리면 바로 바뀌지 않고, 공사 기간 동안 비계·자재 더미와
	-- 망치질·자재 나르는 일꾼이 보인다. (공사가 끝나면 클라이언트가 새 단계 장면으로 다시 짓는다)
	if info.construction then
		local sites = { Vector3.new(-40, 0, 17), Vector3.new(-40, 0, -17), Vector3.new(-74, 0, 17), Vector3.new(-74, 0, -17), Vector3.new(-100, 0, 17), Vector3.new(-100, 0, -17) }
		local types = { "house", "workshop", "farm", "warehouse", "market", "hall" }
		local maxSites = if game:GetService("UserInputService").TouchEnabled then 3 else 6
		-- [실제 경제 공사] 서버가 지출·부족량을 확인한 시설만 공사장에 배치한다.
		-- 수동 개발 단계 전환만 전달된 경우에는 기존 발전 공사장 배치를 유지한다.
		local liveConstruction = info.sim and info.sim.construction
		local activeSites = {}
		if liveConstruction then
			for index, id in types do
				if (tonumber(liveConstruction[id]) or 0) > 0.01 then
					table.insert(activeSites, index)
				end
			end
		end
		if #activeSites == 0 then
			local count = math.min(#sites, 2 * math.max(1, (info.construction.to or lvl + 1) - lvl) + 2)
			for index = 1, count do table.insert(activeSites, index) end
		end
		local n = math.min(#activeSites, maxSites)
		for slot = 1, n do
			local i = activeSites[slot]
			local at = sites[i]
			local zs = if at.Z > 0 then 1 else -1
			importedModel(folder, "Terrain", "wood-structure", at, 10, false)
			importedModel(folder, "Terrain", "wood-support", at + Vector3.new(6, 0, 0), 7, false)
			importedModel(folder, "Terrain", "log-stack", at + Vector3.new(-6, 0, zs * 2), 4, false)
			importedModel(folder, "Cargo", "wood-planks-stack-small", at + Vector3.new(-3, 0, -zs * 5), 2.8, false)
			importedModel(folder, "Town", "cart", at + Vector3.new(9, 0, -zs * 5), 4, false)
			importedModel(folder, "Town", "workbench-anvil", at + Vector3.new(-9, 0, -zs * 3), 3, false)
			-- [실제 공사 단계] 현재 경제의 건설 부족분 대비 이미 건축된 비율로 기초→벽→지붕을 표시한다.
			-- 원본 저장값이나 공사 완료 판정은 수정하지 않으며, 승인된 3D 건축 메시만 사용한다.
			local buildingType = types[i]
			local liveStock = info.sim and info.sim.buildings
			local buildNeed = info.sim and info.sim.construction
			local builtCount = tonumber(liveStock and liveStock[buildingType]) or 0
			local unfinished = tonumber(buildNeed and buildNeed[buildingType]) or 0
			local progress = tonumber(info.construction.progress)
			if progress == nil and unfinished > 0 then progress = builtCount / (builtCount + unfinished) end
			local phase = math.clamp(math.floor(math.clamp(progress or 0, 0, 1) * 3 + 0.001), 0, 3)
			-- [공정 1→2→3] 바닥·벽체·지붕을 실제 건축 진행도 순서로 세우는 모션.
			-- 실물경제가 허용한 공정 외에는 모델을 추가하지 않는다.
			if phase >= 1 then importedModel(folder, "Town", "floor_base", at, 13, false, nil, 0.14) end
			if phase >= 2 then importedModel(folder, "Town", "kenney_wood_wall_01", at + Vector3.new(0, 0, zs * 4), 12, false, nil, 0.85) end
			if phase >= 3 then importedModel(folder, "Town", "kenney_roof_straight_red_01", at + Vector3.new(0, 7, zs * 4), 13, false, nil, 1.55) end
			local mark = part(folder, Vector3.new(1, 1, 1), CFrame.new(at + Vector3.new(0, 0, 0)), Color3.new(1, 1, 1))
			mark:SetAttribute("ConstructionPhase", phase)
			mark:SetAttribute("ConstructionWork", buildingType)
			-- [건축 필지] 경제 엔진의 기존 공사 상태를 읽는 표시 전용 값. 추후 직접 건축과 동일 키를 사용한다.
			mark.Name = "ConstructionPlot_" .. buildingType
			mark:SetAttribute("BuildPlotId", info.portId .. ":construction:" .. buildingType)
			mark:SetAttribute("BuildType", buildingType)
			mark:SetAttribute("BuildPhase", phase)
			mark:SetAttribute("BuildState", "constructing")
			mark:SetAttribute("BuildTier", lvl)
			mark:SetAttribute("BuildAuthority", "VISUAL_ONLY")
			mark:SetAttribute("EconomicConstructionSpending", tonumber(liveConstruction and liveConstruction.spending) or 0)
			mark:SetAttribute("EconomicConstructionNeed", unfinished)
			mark.Transparency = 1
			mark.CanCollide = false
			sign(folder, mark, "🚧 공사 중", Color3.fromRGB(200, 120, 30), 9)
			for k = 1, 3 do
				local wp = at + Vector3.new(-3 + k * 3, 0, -zs * 3.2)
				stay(wp, at + Vector3.new(0, 0, 0), if k == 2 then "stoop" else "hammer", { role = "Barbarian", hat = "cap" })
			end
			path(at + Vector3.new(-8, 0, -zs * 8), at + Vector3.new(10, 0, -zs * 8), "carry", 1.7, { role = "Barbarian", hat = "cap" })
		end
	end
	-- 건축: 널빤지를 쌓고 벽을 세우는 목수 (2단계부터)
	if lvl >= 2 then
		importedModel(folder, "Town", "wall-wood", Vector3.new(-52, 0, 11.5), 8, false)
		importedModel(folder, "Cargo", "wood-planks-stack-small", Vector3.new(-46, 0, 12), 2.6, false)
		importedModel(folder, "Cargo", "resource-wood", Vector3.new(-58, 0, 12.5), 2.4, false)
		stay(Vector3.new(-54, 0, 8.6), Vector3.new(-52, 0, 11.5), "hammer", { role = "Barbarian", hat = "cap" })
		if lvl >= 3 then
			stay(Vector3.new(-50, 0, 8.8), Vector3.new(-52, 0, 11.5), "hammer", { role = "Barbarian", hat = "cap" })
		end
	end
	-- 농사: 마을 바깥 밭에서 괭이질 (1단계 1명, 단계마다 늘어난다). 밭은 큰길 끝 너머에 있다.
	do
		local fx = -222
		for r = -2, 2 do
			for x = 0, 5 do
				importedModel(folder, "Terrain", if (r + x) % 2 == 0 then "crops-wheatstagea" else "crops-wheatstageb", Vector3.new(fx - x * 5, 0, r * 6), 3.4, false)
			end
		end
		for z = -16, 16, 8 do
			importedModel(folder, "Town", "fence_straight", Vector3.new(fx + 6, 0, z), 8, false)
		end
		local farmers = ({ 1, 2, 2, 3, 4 })[lvl]
		for i = 1, farmers do
			local p = Vector3.new(fx - 3 - i * 5, 0, (i % 2 == 0 and 3 or -3))
			stay(p, p + Vector3.new(0, 0, if i % 2 == 0 then 4 else -4), "hoe", { role = "Barbarian", hat = "straw", hatColor = Color3.fromRGB(196, 164, 100), female = i % 2 == 0 })
		end
		if lvl >= 3 then
			importedModel(folder, "Town", "cart", Vector3.new(fx + 2, 0, -20), 5, false)
			importedModel(folder, "Cargo", "food-crate-large-apples", Vector3.new(fx + 2, 1.4, -20), 2.2, false)
		end
	end
	-- 동물: 지역마다 키우는 가축과 마을 동물 (풀을 뜯고, 모이를 쪼고, 꼬리를 흔든다). 모델이 없으면 건너뛴다.
	do
		local SPECIES = {
			iberia = { "sheep", "donkey", "pig", "chicken", "dog", "duck" }, italy = { "donkey", "chicken", "cat", "dog" },
			france = { "cow", "sheep", "chicken", "dog" }, britain = { "sheep", "cow", "horse", "dog" },
			brick = { "cow", "horse", "cat", "chicken" }, hanse = { "horse", "pig", "dog", "chicken" },
			nordic = { "sheep", "horse", "cow", "dog" }, tropic = { "pig", "chicken", "dog", "cat" },
			desert = { "donkey", "cat", "chicken" }, med = { "donkey", "cat", "chicken", "sheep" },
			ottoman = { "donkey", "cat", "sheep", "chicken" }, swahili = { "donkey", "chicken", "cat", "cow" },
			malabar = { "elephant", "cow", "chicken", "cat" }, japan = { "cat", "chicken", "pig", "dog" },
			colonial = { "llama", "horse", "pig", "chicken", "dog" },
			creole = { "horse", "chicken", "dog", "cat" }, china = { "pig", "chicken", "dog", "cat" },
			seasia = { "cow", "pig", "chicken", "dog" }, pacific = { "pig", "chicken", "dog" },
			wafrica = { "cow", "sheep", "chicken", "dog" },
		}
		-- 크기(길이 기준), 움직임(graze 풀뜯기 / peck 쪼기 / tail 꼬리·귀 / still 거의 가만히)
		local KIND = {
			duck = { 1.35, "peck" },
			cow = { 3.4, "graze" }, horse = { 3.8, "graze" }, sheep = { 2.3, "graze" }, pig = { 2.2, "peck" }, llama = { 3.2, "graze" },
			donkey = { 3.2, "graze" }, elephant = { 6.5, "still" }, chicken = { 1, "peck" }, dog = { 1.5, "tail" }, cat = { 1.1, "still" },
		}
		local list = SPECIES[key] or SPECIES.britain
		local function animal(species, pos)
			local k = KIND[species]
			local m = if species == "duck" then nil else k and importedModel(folder, "Animals", if species == "dog" then "dog-pug" else species, pos, k[1], false)
			if species == "duck" then
				-- 오리: 승인된 외부 메시가 아직 없으므로 기존 파트로 가벼운 입체 모델을 직접 제작한다.
				m = Instance.new("Model")
				m.Name = "Duck"
				m.Parent = folder
				local feathers = if rng:NextNumber() < 0.55 then C(232, 224, 190) else C(138, 113, 83)
				local function piece(size, offset, color, shape)
					local p = part(m, size, CFrame.new(pos + offset), color, Enum.Material.SmoothPlastic, shape)
					p.CanCollide = false
					p.CanTouch = false
					p.CanQuery = false
					return p
				end
				piece(Vector3.new(1.45, 0.7, 0.85), Vector3.new(0, 0.62, 0), feathers, Enum.PartType.Ball)
				piece(Vector3.new(0.63, 0.58, 0.6), Vector3.new(0, 1.1, -0.38), feathers, Enum.PartType.Ball)
				piece(Vector3.new(0.55, 0.16, 0.32), Vector3.new(0, 1.01, -0.81), C(227, 150, 55))
				for _, side in { -1, 1 } do
					piece(Vector3.new(0.7, 0.22, 0.15), Vector3.new(0, 0.78, side * 0.43), feathers:Lerp(C(90, 90, 73), 0.18), Enum.PartType.Ball)
					piece(Vector3.new(0.11, 0.11, 0.11), Vector3.new(side * 0.2, 1.2, -0.61), C(35, 34, 31), Enum.PartType.Ball)
					piece(Vector3.new(0.18, 0.12, 0.32), Vector3.new(side * 0.28, 0.16, 0.05), C(213, 148, 57))
				end
			end
			if not m then return end
			-- 가축은 월드 기준 회전이나 X/Z 축 기울기를 적용하지 않는다. 원본 방향을 제자리에서만 정규화한다.
			local origin = m:GetPivot()
			local forward = origin.LookVector
			local upright = if math.abs(forward.X) + math.abs(forward.Z) > 0.01
				then CFrame.lookAt(origin.Position, origin.Position + Vector3.new(forward.X, 0, forward.Z))
				else CFrame.new(origin.Position)
			local yaw = rng:NextNumber(-math.pi, math.pi)
			m:PivotTo(upright * CFrame.Angles(0, yaw, 0))
			local gaitOf = { dog = 15, cat = 11, duck = 17, chicken = 17, pig = 9, sheep = 8, cow = 5.5, horse = 6.5, donkey = 7, llama = 7 }
			table.insert(walkers, { model = m, base = m:GetPivot(), mode = "animal", akind = k[2], phase = rng:NextNumber(0, 10), gait = gaitOf[species] or 7, hd = 0, animalType = species })
		end
		local lay = zoneLayout(info.portId, lvl, info.hasShipyard, info.sim and info.sim.buildings)
		local has = {}
		for _, sp in list do
			has[sp] = true
		end
		-- 마을 동물은 가만히 서 있지 않고 제자리 근처를 오간다 (span: 오가는 거리)
		local function roam(species, pos, span)
			local n0 = #walkers
			animal(species, pos)
			local w = walkers[#walkers]
			if #walkers > n0 and w then
				w.span = span
				w.rate = rng:NextNumber(0.3, 0.6)
			end
		end
		local stock = {}
		for _, sp in list do
			if sp == "cow" or sp == "sheep" or sp == "pig" or sp == "horse" or sp == "llama" or sp == "donkey" or sp == "elephant" then
				table.insert(stock, sp)
			end
		end
		-- 1) 초대형 방목지: 소·양·말 초지 260x208, 돼지 사육지 176x144.
		-- 실제 농장 수와 가축 수는 기존 경제·지역 생물종 그대로, 울타리 세그먼트 수만 최적화한다.
		local farmCount = info.sim and info.sim.buildings and info.sim.buildings.farm
		local grazeCount = if farmCount then math.clamp(2 + math.floor(math.sqrt(math.max(0, farmCount)) / 5), 2, 7) else math.clamp(2 + lvl, 3, 7)
		local rural = PortBuildings.RuralPlots
		for i = 1, lay.pens do
			local c = penAt(i, lay.pens)
			local sp = if #stock > 0 then stock[(i - 1) % #stock + 1] else nil
			local halfX = if sp == "pig" then rural.pigHalfX else rural.pastureHalfX
			local halfZ = if sp == "pig" then rural.pigHalfZ else rural.pastureHalfZ
			local grass = part(folder, Vector3.new(halfX * 2, 0.12, halfZ * 2), CFrame.new(c.X, 0.26, c.Z),
				if sp == "pig" then C(139, 118, 88) else C(105, 139, 82), if sp == "pig" then Enum.Material.Ground else Enum.Material.Grass)
			grass.Name = if sp == "pig" then "PigYard" else "OpenPasture"
			grass.CanCollide = false
			grass.CanQuery = false
			grass:SetAttribute("BuildPlotId", info.portId .. ":pasture:" .. i)
			grass:SetAttribute("BuildType", "farm")
			grass:SetAttribute("BuildAuthority", "VISUAL_ONLY")
			grass:SetAttribute("PlotHalfWidth", halfX)
			grass:SetAttribute("PlotHalfDepth", halfZ)
			grass:SetAttribute("EconomicFarmCount", tonumber(farmCount) or -1)
			-- [울타리 최적화] 26스튜드 단위로 길이별 기존 실물 레일을 확대해 넓은 둘레를 적은 메시로 감싼다.
			local xSections = math.ceil(halfX * 2 / rural.fenceSegmentMax)
			local xStep = halfX * 2 / xSections
			for k = 1, xSections do
				local x = -halfX + (k - 0.5) * xStep
				for _, dz in { -halfZ, halfZ } do
					importedModel(folder, "Town", "fence_rails_long", c + Vector3.new(x, 0, dz), xStep * 0.98, false)
				end
			end
			local zSections = math.ceil(halfZ * 2 / rural.fenceSegmentMax)
			local zStep = halfZ * 2 / zSections
			for k = 1, zSections do
				local z = -halfZ + (k - 0.5) * zStep
				for _, dx in { -halfX, halfX } do
					local at = c + Vector3.new(dx, 0, z)
					local rail = importedModel(folder, "Town", "fence_rails_long", at, zStep * 0.98, false)
					rotateAround(rail, at, math.pi / 2)
				end
			end
			-- 사육지 안쪽 급수통은 승인된 Cargo 메시 1개만 쓰고 경제 수량에는 반영하지 않는다.
			local trough = importedModel(folder, "Cargo", "bucket", c + Vector3.new(halfX - 15, 0, -halfZ + 15), 3.4, false)
			if trough then trough.Name = "PastureWater_" .. i end
			if sp then
				if sp == "elephant" then
					animal(sp, c)
				else
					for k = 1, grazeCount do
						local at = c + Vector3.new(rng:NextNumber(-halfX * 0.65, halfX * 0.65), 0, rng:NextNumber(-halfZ * 0.58, halfZ * 0.58))
						local n0 = #walkers
						animal(sp, at)
						local w = walkers[#walkers]
						if #walkers > n0 and w then
							w.span = rng:NextNumber(2, if sp == "pig" then 7 else 11)
							w.rate = rng:NextNumber(0.12, 0.28)
						end
					end
				end
			end
			if i == 1 and (lay.farm or lay.fish or has.chicken) then
				-- 오리 연못은 양/소 초지의 외곽에 놓고 울타리와 겹치지 않는다.
				local pond = c + Vector3.new(-halfX - 25, 0, 0)
				local water = part(folder, Vector3.new(29, 0.15, 18), CFrame.new(pond + Vector3.new(0, 0.14, 0)), C(67, 130, 147), Enum.Material.Glass)
				water.Name = "DuckPond"
				water.CanCollide, water.CanQuery = false, false
				for k = 1, math.min(lvl + 1, 4) do
					roam("duck", pond + Vector3.new(rng:NextNumber(-7, 7), 0.16, rng:NextNumber(-5, 5)), 2)
				end
			end
		end
		-- 2) 상업구역: 수레를 끄는 짐승이 장터 옆에 묶여 있다
		if lvl >= 2 then
			for _, sp in { "horse", "donkey", "llama", "cow" } do
				if has[sp] then
					animal(sp, Vector3.new(-127, 0, 11))
					break
				end
			end
			if lvl >= 3 and has.elephant then
				animal("elephant", Vector3.new(-136, 0, -13))
			end
		end
		-- 3) 주거구역: 골목을 어슬렁거리는 개·고양이·닭
		local pets = {}
		for _, sp in list do
			if sp == "chicken" or sp == "dog" or sp == "cat" then
				table.insert(pets, sp)
			end
		end
		for i = 1, math.min(lvl + 2, 6) do
			if #pets > 0 then
				local sd = if i % 2 == 0 then 1 else -1
				roam(pets[(i - 1) % #pets + 1], Vector3.new(-44 - i * 15 + rng:NextNumber(-3, 3), 0, sd * (34.5 + rng:NextNumber(0, 2))), 5)
			end
		end
		-- 4) 항만구역: 생선 통 곁 고양이, 부두를 지키는 개
		if has.cat or lay.fish then
			for i = 1, if lay.fish then 2 else 1 do
				roam("cat", Vector3.new(30 + i * 5, 2, -5.4), 3)
			end
		end
		if has.dog then
			roam("dog", Vector3.new(-2, 0, 24), 6)
		end
	end
	-- 순찰: 큰길을 오가며 두리번거리는 경비 (2단계부터)
	local guards = ({ 0, 1, 1, 2, 3 })[lvl]
	for i = 1, guards do
		local z = if i % 2 == 0 then -3.2 else 3.2
		path(Vector3.new(-24 - i * 10, 0, z), Vector3.new(-172, 0, z), "look", 1.7, { role = "Knight", hat = false })
	end
	-- [항구 주민 일자리] 기존 짐꾼 동선만 1~5단계에 맞춰 확대한다. 신규 경제 직군은 만들지 않는다.
	do
		local porters = PortBuildings.harborVisual(lvl, info.sim and info.sim.buildings).porters
		if info.sim and info.sim.jobs and (info.sim.jobs.laborer or 0) <= 0 then porters = 0 end
		if info.sim and type(info.sim.residents) == "number" then
			porters = math.min(porters, math.max(0, math.floor(info.sim.residents / 5)))
		end
		if game:GetService("UserInputService").TouchEnabled then porters = math.min(porters, 2) end
		for i = 1, porters do
			local pz = 24 + i * 3
			local fig = path(Vector3.new(14, 0, pz), Vector3.new(-6, 0, pz - 6), "carry", 1.5,
				{ role = "Barbarian", hat = false, profession = "docker" })
			if fig then
				fig:SetAttribute("Job", "docker")
				fig:SetAttribute("Workplace", "부두 하역장")
				holdProp(fig, "Cargo", pick({ "box-open", "barrel", "bag" }), 2.2)
			end
		end
	end
	-- 낚시: 부두 가장자리에 앉아 낚싯대를 던지는 사람 (1단계부터)
	do
		importedModel(folder, "Cargo", "food-barrel-fish", Vector3.new(36, 2, 4.6), 2.4, false)
		stay(Vector3.new(32, 2.4, 4.5), Vector3.new(32, 2.4, 20), "fish", { role = "Rogue", hat = if palmOk(info.portId, nil) then "straw" else "knit", hatColor = Color3.fromRGB(196, 164, 100) })
		if lvl >= 4 then
			stay(Vector3.new(44, 2.4, -4.5), Vector3.new(44, 2.4, -20), "fish", { role = "Rogue", female = true })
		end
	end
	-- 장사: 가판대 뒤에서 손님을 부르는 상인 (가판대가 선 만큼)
	for i, spot in stallSpots do
		local back = Vector3.new(spot.X, 0, spot.Z + (if spot.Z > 0 then 3.4 else -3.4))
		stay(back, spot, "stall", { role = "Rogue", female = i % 2 == 0 })
	end
	-- 이야기: 둘이 마주 서서 이야기하는 이웃 (2단계부터)
	if lvl >= 2 then
		local a, b = Vector3.new(-22, 0, 6), Vector3.new(-22, 0, 8.6)
		stay(a, b, "talk", { role = "Mage", female = true })
		stay(b, a, "talk", { role = "Rogue", age = "elder" })
	end
	-- 노인: 광장 벤치에서 쉰다 (2단계부터)
	if lvl >= 2 then
		importedModel(folder, "Town", "bench_A", Vector3.new(-32, 0, 11), 3.8, false)
		stay(Vector3.new(-32, 0.3, 11), Vector3.new(-32, 0, 0), "sit", { role = "Mage", age = "elder", female = lvl % 2 == 0 })
	end
	-- 아이들: 분수 둘레를 뛰어다닌다 (2단계 1명, 단계마다 늘어난다)
	for i = 1, ({ 0, 1, 2, 3, 4 })[lvl] do
		local fig = person(Vector3.new(-8, 0, 0), 0, { age = "child", female = i % 2 == 0, role = "Rogue", hat = false })
		addTask(fig, { kind = "child", mode = "circle", cx = -8, cz = 0, r = 6 + i * 1.3, speed = 1.5 + i * 0.2 })
	end
	-- 노인 느린 산책 (3단계부터)
	if lvl >= 3 then
		path(Vector3.new(-20, 0, 12.5), Vector3.new(-70, 0, 12.5), "stoop", 0.8, { role = "Mage", age = "elder" })
	end
	-- 직업별 일터: 마을 경제 시뮬의 직업 비율대로 주민이 자기 일터에서 직업마다 다른 동작을 한다.
	-- 일터는 건물 종류와 맞춘다(시장=장터 동작, 부두=짐 나르기, 교회=기도·종, 관청=문서, 공방=망치질 …).
	do
		-- 직업별 실제 업무/휴식 순환. 지역 의상 팔레트 안에서 작업복·예복을 구분한다.
		local made = {}
		for _, good in (PortData.Ports[info.portId] and PortData.Ports[info.portId].produces) or {} do made[good] = true end
		local craft = if made.iron or made.copper or made.tin then "forge"
			elseif made.cloth or made.silk or made.wool then "sew"
			elseif made.grain or made.beer or made.sugar then "knead" else "hammer"
		local JOB_YARD = {
			farmer = { name = "농부", kinds = { "hoe", "harvest", "stoop", "inspect" }, rest = { "stretch", "talk", "drink" }, spec = { role = "Barbarian", hat = "straw" }, tint = C(110, 125, 76) },
			fisher = { name = "어부", kinds = { "fish", "lift", "inspect" }, rest = { "drink", "talk", "stretch" }, spec = { role = "Barbarian", hat = "knit" }, tint = C(70, 106, 146) },
			craftsman = { name = "장인", kinds = { craft, "inspect", "count", "hammer" }, rest = { "stretch", "drink", "talk" }, spec = { role = "Barbarian", hat = "cap" }, tint = C(146, 99, 57) },
			merchant = { name = "상인", kinds = { "stall", "weigh", "count", "offer", "receive" }, rest = { "talk", "drink", "listen" }, spec = { role = "Rogue" }, prop = { "Town", "stall", 6.5 }, tint = C(121, 71, 132) },
			sailor = { name = "선원", kinds = { "lift", "carry", "inspect", "salute" }, rest = { "drink", "talk", "stretch" }, spec = { role = "Barbarian", hat = "cap" }, tint = C(59, 92, 138) },
			guard = { name = "경비병", kinds = { "salute", "look", "point", "inspect" }, rest = { "lean", "look", "stretch" }, spec = { role = "Knight", hat = false }, tint = C(69, 78, 111) },
			official = { name = "관리", kinds = { "write", "read", "count", "point" }, rest = { "talk", "listen", "drink" }, spec = { role = "Mage", hat = "wide" }, tint = C(108, 78, 134) },
			clergy = { name = "성직자", kinds = { "pray", "kneel", "read", "bell" }, rest = { "talk", "listen", "look" }, spec = { role = "Mage", hat = false }, tint = C(96, 87, 80) },
			laborer = { name = "일꾼", kinds = { "carry", "lift", "sweep", "polish" }, rest = { "stretch", "drink", "talk" }, spec = { role = "Rogue", hat = "cap" }, tint = C(119, 104, 79) },
		}
		local ORDER = { "farmer", "fisher", "craftsman", "merchant", "sailor", "guard", "official", "clergy", "laborer" }
		local jobs = info.sim and info.sim.jobs
		if not jobs then
			jobs = { farmer = 3, fisher = 1, craftsman = 3, merchant = 2, sailor = 2, guard = 1, official = lvl >= 3 and 1 or 0, clergy = 1, laborer = 1 }
		end
		local total = 0
		for _, j in ipairs(ORDER) do total += jobs[j] or 0 end
		local N = if info.sim then math.clamp(math.floor((info.sim.residents or 6) * 0.3), 1, 18) else ({ 6, 8, 10, 12, 14 })[lvl]
		local quota, used = {}, 0
		for _, j in ipairs(ORDER) do
			local share = (jobs[j] or 0) / math.max(total, 1)
			if j == "farmer" or j == "laborer" then share = math.min(share, 0.2) end
			quota[j] = math.floor(N * share + 0.5)
			if not info.sim and (jobs[j] or 0) > 0 and quota[j] == 0 then quota[j] = 1 end
			used += quota[j]
		end
		local lanes = { 38, -38, 57, -57, 73, -73, 87, -87 }
		local slot = 0
		for _, j in ipairs(ORDER) do
			local yard = JOB_YARD[j]
			for k = 1, quota[j] do
				slot += 1
				if slot > 24 then break end
				local lane = lanes[(slot - 1) % #lanes + 1]
				local x = -46 - math.floor((slot - 1) / #lanes) * 22 - ((slot - 1) % 3) * 7
				local side = if lane > 0 then 1 else -1
				local pos = Vector3.new(x, 0, lane + side * 2.4)
				local target = Vector3.new(x, 0, lane + side * 5)
				if yard.prop then
					importedModel(folder, yard.prop[1], yard.prop[2], target, yard.prop[3], false)
				end
				local spec = table.clone(yard.spec)
				spec.profession = j
				spec.workKinds, spec.leisureKinds = yard.kinds, yard.rest
				-- 시장 거래 시간에는 생산·선원·상인 직업의 물건 확인/협상 모션을 사용한다.
				spec.tradeKinds = if j == "merchant" or j == "craftsman" or j == "fisher"
					or j == "sailor" or j == "laborer" or j == "farmer"
					then { "offer", "receive", "count", "talk" } else yard.kinds
				if o.coats and #o.coats > 0 then
					spec.coat = o.coats[(slot - 1) % #o.coats + 1]:Lerp(yard.tint, 0.42)
				end
				local fig = stay(pos, target, yard.kinds[(k - 1) % #yard.kinds + 1], spec)
				if fig then
					fig:SetAttribute("Job", j)
					fig:SetAttribute("Activity", yard.kinds[1])
					local head = fig:FindFirstChild("Head")
					if head then
						local bb = Instance.new("BillboardGui")
						bb.Size = UDim2.fromOffset(70, 18)
						bb.StudsOffset = Vector3.new(0, 1.9, 0)
						bb.MaxDistance = 55
						bb.Adornee = head
						bb.Parent = head
						local tl = Instance.new("TextLabel")
						tl.Size = UDim2.fromScale(1, 1)
						tl.BackgroundTransparency = 1
						tl.Text = yard.name
						tl.TextSize = 13
						tl.Font = Enum.Font.GothamBold
						tl.TextColor3 = Color3.fromRGB(255, 240, 200)
						tl.TextStrokeTransparency = 0.4
						tl.Parent = bb
					end
				end
			end
		end
		-- 세계경제는 기존 9개 고용 직군을 그대로 계산한다. 그 아래 세부 직업은 실제 작업장,
		-- 생산품·경제 시설·발전도를 만족할 때만 생기며 경제 수치/저장에는 관여하지 않는다.
		local stock = (info.sim and info.sim.buildings) or {}
		local function built(id, stage)
			return lvl >= stage and (if info.sim then (stock[id] or 0) >= 1 else true)
		end
		local available = {
			{ name = "대장장이", job = "smith", group = "craftsman", need = built("workshop", 2) and (made.iron or made.copper or made.tin), at = Vector3.new(-160, 0, -114), prop = { "Town", "workbench-anvil", 4 }, work = { "forge", "inspect", "hammer" }, rest = { "stretch", "drink" }, color = C(129, 72, 53) },
			{ name = "재단사", job = "tailor", group = "craftsman", need = built("workshop", 2) and (made.cloth or made.silk or made.wool), at = Vector3.new(-188, 0, -114), prop = { "Cargo", "textiles-stack-large-colored", 3 }, work = { "sew", "fold", "inspect" }, rest = { "talk", "drink" }, color = C(117, 86, 148) },
			{ name = "제빵사", job = "baker", group = "craftsman", need = built("workshop", 2) and (made.grain or made.maize or made.beer), at = Vector3.new(-214, 0, -114), prop = { "Cargo", "food-flour", 3 }, work = { "knead", "stir", "inspect" }, rest = { "drink", "talk" }, color = C(180, 130, 85) },
			{ name = "목수", job = "carpenter", group = "craftsman", need = built("workshop", 2) and (made.timber or made.mahogany or made.kauri), at = Vector3.new(-124, 0, -113), prop = { "Cargo", "resource-planks", 3 }, work = { "hammer", "inspect", "lift" }, rest = { "stretch", "drink" }, color = C(136, 101, 67) },
			{ name = "조선공", job = "shipwright", group = "sailor", need = lvl >= 3 and info.hasShipyard, at = Vector3.new(-19, 0, -106), prop = { "Cargo", "resource-planks", 3.5 }, work = { "hammer", "inspect", "carry" }, rest = { "talk", "stretch" }, color = C(79, 103, 134) },
			{ name = "목장지기", job = "herder", group = "farmer", need = built("farm", 2), at = Vector3.new(-660, 0, 0), prop = { "Cargo", "wood-log-a", 3 }, work = { "look", "milk", "inspect" }, rest = { "drink", "lean" }, color = C(130, 121, 83) },
			{ name = "교사", job = "teacher", group = "official", need = built("school", 3), at = Vector3.new(-86, 0, 21), prop = { "Interior", "bookcaseclosed", 4.2 }, work = { "read", "write", "point" }, rest = { "talk", "listen" }, color = C(80, 115, 108) },
			{ name = "서기관", job = "clerk", group = "official", need = built("hall", 3), at = Vector3.new(-110, 0, 21), prop = { "Interior", "bookcaseclosed", 3.8 }, work = { "write", "count", "read" }, rest = { "talk", "listen" }, color = C(91, 89, 131) },
			{ name = "은행원", job = "banker", group = "merchant", need = lvl >= 4 and built("market", 2) and table.find(info.facilities or {}, "bank") ~= nil, at = Vector3.new(-54, 0, 18), prop = { "Cargo", "gold-bars", 2.1 }, work = { "count", "write", "offer" }, rest = { "talk", "read" }, color = C(105, 75, 119) },
		}
		local specialistLimit = if info.sim then math.clamp(math.floor((info.sim.residents or 0) / 10), 0, 7) else lvl + 1
		local specialistCount = 0
		for _, job in ipairs(available) do
			if specialistCount >= specialistLimit then break end
			if job.need and (jobs[job.group] or 0) > 0 then
				specialistCount += 1
				local spec = { role = if job.group == "official" then "Mage" else "Barbarian", profession = job.job,
					workKinds = job.work, leisureKinds = job.rest, hat = if job.group == "farmer" then "straw" else "cap" }
				local palette = o.coats or { C(160, 130, 100) }
				spec.coat = palette[(specialistCount - 1) % #palette + 1]:Lerp(job.color, 0.52)
				importedModel(folder, job.prop[1], job.prop[2], job.at + Vector3.new(0, 0, -3), job.prop[3], false)
				local fig = stay(job.at + Vector3.new(0, 0, 4.5), job.at, job.work[1], spec)
				if fig then
					fig:SetAttribute("Job", job.job)
					fig:SetAttribute("Workplace", job.name)
					fig:SetAttribute("Activity", job.work[1])
					local head = fig:FindFirstChild("Head")
					if head then
						local bb = Instance.new("BillboardGui")
						bb.Name = "JobTitle"
						bb.Size = UDim2.fromOffset(76, 18)
						bb.StudsOffset = Vector3.new(0, 1.9, 0)
						bb.MaxDistance = 55
						bb.Adornee = head
						bb.Parent = head
						local label = Instance.new("TextLabel")
						label.Size = UDim2.fromScale(1, 1)
						label.BackgroundTransparency = 1
						label.Text = job.name
						label.TextSize = 13
						label.Font = Enum.Font.GothamBold
						label.TextColor3 = C(237, 229, 205)
						label.TextStrokeTransparency = 0.4
						label.Parent = bb
					end
				end
			end
		end
	end
end

-- 발전도 랜드마크 자리(양쪽 큰길 뒤). 집은 이 자리를 피해 짓는다.
-- 주요 항구의 상징 건축물: 광장 맞은편(개요 카메라에 보이는 자리)에 그 도시를 알아볼 수 있는 실루엣을 세운다.
-- 등록된 실제 CC0 모델만 조합한다 (직접 만든 도형 없음). 좌표는 앵커(-30, 0, -66) 기준.
local SIG_ANCHOR = Vector3.new(-30, 0, -66)
-- [유럽 항구] 실제 Ports.country를 사용한다. 저장된 국가·항구·발전도 값은 변경하지 않는다.
-- lot/gap/density는 배경 구획과 집의 모양에만 적용한다. 경제·시설 해금에는 관여하지 않는다.
local COUNTRY_PLAN = {
	portugal = { lot = 0.94, gap = 0.9, density = 1.06 }, spain = { lot = 1.04, gap = 1.05, density = 0.94 },
	canary = { lot = 1.04, gap = 1.05, density = 0.94 }, madeira = { lot = 0.94, gap = 0.9, density = 1.06 },
	azores = { lot = 0.94, gap = 0.9, density = 1.06 }, mallorca = { lot = 1.04, gap = 1.05, density = 0.94 },
	netherlands = { lot = 0.88, gap = 0.76, density = 1.06 },
	italy = { lot = 0.94, gap = 0.94, density = 1.05 }, venice = { lot = 0.88, gap = 0.82, density = 1.06 },
	tuscany = { lot = 0.94, gap = 0.94, density = 1.05 }, naples = { lot = 0.94, gap = 0.94, density = 1.05 },
	sicily = { lot = 0.94, gap = 0.94, density = 1.05 }, sardinia = { lot = 0.94, gap = 0.94, density = 1.05 },
	ragusa = { lot = 0.94, gap = 0.94, density = 1.05 }, papal = { lot = 0.94, gap = 0.94, density = 1.05 },
	dalmatia = { lot = 0.94, gap = 0.94, density = 1.05 }, austria = { lot = 0.94, gap = 0.94, density = 1.05 },
	france = { lot = 1.06, gap = 1.12, density = 0.94 }, corsica = { lot = 0.96, gap = 1.05, density = 0.98 },
	england = { lot = 0.97, gap = 1.06, density = 0.99 },
	scotland = { lot = 1.02, gap = 1.10, density = 0.97 }, ireland = { lot = 1.02, gap = 1.10, density = 0.97 },
	germany = { lot = 0.91, gap = 0.86, density = 1.04 }, poland = { lot = 0.91, gap = 0.86, density = 1.04 },
	prussia = { lot = 0.91, gap = 0.86, density = 1.04 }, livonia = { lot = 0.91, gap = 0.86, density = 1.04 },
	estonia = { lot = 0.91, gap = 0.86, density = 1.04 }, gotland = { lot = 0.91, gap = 0.86, density = 1.04 },
	norway = { lot = 1.05, gap = 1.14, density = 0.92 }, sweden = { lot = 1.05, gap = 1.14, density = 0.92 },
	denmark = { lot = 1.02, gap = 1.08, density = 0.95 }, finland = { lot = 1.05, gap = 1.14, density = 0.92 },
	russia = { lot = 1.02, gap = 1.08, density = 0.95 }, malta = { lot = 0.96, gap = 0.98, density = 1.01 },
}
local SIG = {}
do
	local function one(kind, asset, size, dx, dz, y, tint)
		return { kind = kind, asset = asset, size = size, dx = dx, dz = dz, y = y or 0, tint = tint }
	end
	local function stack(kind, parts, size, dx, dz)
		local out = {}
		for i, a in parts do
			table.insert(out, one(kind, a, size, dx, dz, (i - 1) * size * 0.9))
		end
		return out
	end
	local function cat(...)
		local out = {}
		for _, list in { ... } do
			if list.kind then
				table.insert(out, list)
			else
				for _, e in list do table.insert(out, e) end
			end
		end
		return out
	end
	local flagAt = function(dx, dz) return one("Castle", "flag-banner-long", 10, dx, dz) end
	local palms = function(dx) return cat(one("Naval", "palm-detailed-straight", 14, dx, -14), one("Naval", "palm-detailed-straight", 14, dx + 6, 14)) end
	local pagoda = stack("Town", { "eastasia-base", "eastasia-roof", "eastasia-base", "eastasia-roof", "eastasia-base", "eastasia-roof" }, 11, 0, 0)
	local minarets = function(r) return cat(stack("Castle", { "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-mid", "tower-hexagon-roof" }, 7, -r, -r), stack("Castle", { "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-mid", "tower-hexagon-roof" }, 7, r, -r), stack("Castle", { "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-mid", "tower-hexagon-roof" }, 7, -r, r), stack("Castle", { "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-mid", "tower-hexagon-roof" }, 7, r, r)) end
	local keep = function(big) return cat(one("Castle", "fortress", big, 0, 0), stack("Castle", { "tower-square-base", "tower-square-mid", "tower-square-roof" }, 11, -big * 0.6, 0), stack("Castle", { "tower-square-base", "tower-square-mid", "tower-square-roof" }, 11, big * 0.6, 0), flagAt(0, big * 0.5)) end
	local lighthouse = stack("Castle", { "tower-square-base", "tower-square-mid", "tower-square-mid", "tower-square-mid", "tower-square-roof" }, 12, 0, 0)
	local campanile = function(size) return cat(stack("Castle", { "tower-square-base", "tower-square-mid", "tower-square-mid", "tower-square-mid", "tower-square-top-roof" }, size, 0, 0), one("Town", "church", 22, 18, 6)) end
	local windmills = cat(one("Town", "windmill", 24, -12, 0), one("Town", "windmill", 22, 14, 6), one("Town", "bell-tower", 26, 0, -16))
	local belem = cat(one("Naval", "tower-complete-large", 30, 0, 0), one("Naval", "tower-complete-small", 14, 14, 10), flagAt(-10, 0))
	local mission = cat(one("Town", "church", 30, 0, 0), one("Town", "bell-tower", 26, -16, 6), palms(18))
	local rock = cat(one("Town", "rock-wide", 52, 0, 0), one("Town", "rock-wide", 34, 22, 8))
	SIG.london = keep(34)
	SIG.edinburgh = cat(one("Town", "rock-wide", 40, 0, 0), keep(26))
	SIG.amsterdam = windmills
	SIG.hamburg = cat(one("Town", "church", 28, 0, 0), one("Town", "bell-tower", 30, -16, 0))
	SIG.lisbon = belem
	SIG.seville = cat(stack("Town", { "bell-tower", "bell-tower" }, 22, 0, 0), one("Castle", "wall", 20, 18, 0), one("Castle", "wall", 20, -18, 0))
	SIG.venice = cat(campanile(12), one("Terrain", "column", 14, -14, 14), one("Terrain", "column", 14, -22, 14))
	SIG.genoa = lighthouse
	SIG.valletta = cat(one("Castle", "fortress", 36, 0, 0), one("Castle", "wall", 22, 20, 12), one("Castle", "wall", 22, -20, 12))
	SIG.istanbul = cat(one("Town", "temple-stone", 36, 0, 0), minarets(18))
	SIG.alexandria = cat(stack("Castle", { "tower-square-base", "tower-square-mid", "tower-square-mid", "tower-square-mid", "tower-square-mid", "tower-hexagon-top" }, 12, 0, 0), flagAt(10, 0))
	SIG.cape_town = keep(32)
	SIG.cartagena_indias = cat(one("Castle", "fortress", 34, 0, 0), one("Castle", "wall", 22, 20, 8), one("Castle", "wall", 22, -20, 8))
	SIG.havana = cat(one("Castle", "fortress", 30, 0, 0), stack("Castle", { "tower-square-base", "tower-square-mid", "tower-square-roof" }, 10, 18, 0), flagAt(0, 14))
	SIG.veracruz = cat(one("Castle", "fortress", 30, 0, 0), palms(20))
	SIG.rio = rock
	SIG.salvador = mission
	SIG.goa = mission
	SIG.malacca = cat(one("Castle", "gate", 22, 0, 0), stack("Castle", { "tower-square-base", "tower-square-mid", "tower-square-roof" }, 12, 16, 0), palms(-18))
	SIG.calicut = cat(one("Town", "temple-stone", 28, 0, 0), palms(18))
	SIG.zanzibar = cat(stack("Castle", { "tower-square-base", "tower-square-mid", "tower-square-mid", "tower-square-roof" }, 12, 0, 0), flagAt(10, 0), palms(18))
	SIG.canton = cat(pagoda, one("Town", "temple-stone", 18, 18, 8))
	SIG.macau = cat(pagoda, one("Town", "temple-stone", 18, 20, 8)) -- 동아시아 항구: 서양식 성당 대신 탑과 사원
	SIG.shanghai = pagoda
	SIG.nagasaki = cat(stack("Town", { "eastasia-base", "eastasia-roof", "eastasia-base", "eastasia-roof" }, 11, 0, 0), one("Terrain", "gate-overhang", 14, 20, 0))
	SIG.osaka = cat(one("Castle", "wall", 24, 0, 14), stack("Town", { "eastasia-base", "eastasia-roof", "eastasia-base", "eastasia-roof", "eastasia-base", "eastasia-roof" }, 13, 0, 0))
	SIG.edo = SIG.osaka
	SIG.batavia = cat(one("Town", "bell-tower", 30, 0, 0), one("Town", "church", 22, 18, 6), palms(-18))
	SIG.manila = cat(one("Castle", "fortress", 30, 0, 0), one("Town", "church", 22, 22, 6))
	-- 그 밖의 주요 항구
	local spire = function(parts, size, dx, dz) return stack("Castle", parts, size, dx, dz) end
	local SQ = { "tower-square-base", "tower-square-mid", "tower-square-mid", "tower-square-mid", "tower-square-top-roof" }
	local HEX = { "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-mid", "tower-hexagon-mid", "tower-hexagon-roof" }
	local fort = function(size) return cat(one("Castle", "fortress", size, 0, 0), one("Castle", "wall", 22, size * 0.6, 10), one("Castle", "wall", 22, -size * 0.6, 10), flagAt(0, size * 0.5)) end
	local fortPalms = function(size) return cat(fort(size), palms(size * 0.8)) end
	local cathedral = function() return cat(one("Town", "church", 32, 0, 0), one("Town", "bell-tower", 34, -18, 0), one("Town", "bell-tower", 28, 18, 0)) end
	local walledChurch = function() return cat(one("Town", "church", 26, 0, 0), one("Town", "bell-tower", 26, -16, 0), one("Castle", "wall", 24, 0, 18), one("Castle", "wall", 24, 20, 18), one("Castle", "wall", 24, -20, 18)) end
	local colonialChurch = function() return cat(one("Town", "church", 26, 0, 0), one("Town", "bell-tower", 28, -16, 0)) end
	local mosque = function(minaretSize) return cat(one("Town", "temple-stone", 30, 0, 0), spire(HEX, minaretSize, 18, -8), spire(HEX, minaretSize, 18, 8)) end
	local shrine = cat(one("Town", "temple-stone", 22, 0, 0), stack("Town", { "eastasia-base", "eastasia-roof", "eastasia-base", "eastasia-roof" }, 10, 18, 0))
	local pacificSet = cat(one("Terrain", "statue-ring", 16, -12, 0), one("Terrain", "statue-ring", 16, 0, 0), one("Terrain", "statue-ring", 16, 12, 0), palms(20))
	SIG.naples = cat(one("Town", "rock-wide", 48, -22, 0), one("Castle", "fortress", 26, 16, 6))
	SIG.marseille = cat(one("Town", "rock-wide", 30, 0, 0), one("Town", "church", 22, 0, 0, 12), one("Castle", "fortress", 20, 26, 8))
	SIG.barcelona = cat(spire(HEX, 9, -12, 0), spire(HEX, 11, 0, 0), spire(HEX, 9, 12, 0), one("Town", "church", 24, 0, 16))
	SIG.bordeaux = cathedral()
	SIG.rouen = cathedral()
	SIG.porto = cat(spire(SQ, 11, 0, 0), one("Town", "church", 22, 18, 6))
	SIG.cadiz = cat(fort(26), lighthouse)
	SIG.dublin = cat(spire(HEX, 10, 0, 0), one("Town", "church", 24, 18, 6))
	SIG.glasgow = walledChurch()
	SIG.copenhagen = cat(spire(SQ, 10, 0, 0), one("Castle", "fortress", 24, 20, 8))
	SIG.stockholm = cat(one("Castle", "fortress", 28, 0, 0), one("Town", "church", 22, 22, 6))
	-- 베르겐 브뤼겐 목조 창고: 서로 다른 붉은색·황토색·청색 박공 줄.
	SIG.bergen = cat(
		one("Town", "house", 17, -22, 0, 0, C(166, 66, 49)),
		one("Town", "house", 17, -4, 0, 0, C(214, 166, 74)),
		one("Town", "house", 17, 14, 0, 0, C(88, 126, 146)),
		one("Town", "bell-tower", 25, 0, -24)
	)
	SIG.oslo = fort(28)
	SIG.helsinki = cat(one("Town", "church", 28, 0, 0), one("Castle", "wall", 24, 0, 16))
	SIG.st_petersburg = cat(one("Castle", "fortress", 30, 0, 0), spire(SQ, 10, 22, 0))
	SIG.gdansk = cat(one("Naval", "tower-watch", 26, 0, 0), one("Town", "church", 26, 20, 6))
	SIG.riga = walledChurch()
	SIG.tallinn = walledChurch()
	SIG.lubeck = cat(cathedral(), one("Castle", "gate", 22, 0, 20))
	SIG.koenigsberg = cat(one("Castle", "fortress", 26, 0, 0), one("Town", "church", 22, 22, 6))
	SIG.visby = walledChurch()
	SIG.antwerp = cat(spire(SQ, 12, 0, 0), one("Town", "church", 26, 20, 6))
	SIG.rotterdam = windmills
	SIG.plymouth = cat(lighthouse, fort(24))
	SIG.boston = colonialChurch()
	SIG.new_york = cat(one("Town", "windmill", 22, -10, 0), fort(24))
	SIG.philadelphia = cat(one("Town", "bell-tower", 30, 0, 0), one("Town", "church", 22, 18, 6))
	SIG.charleston = cat(colonialChurch(), palms(18))
	SIG.new_orleans = cat(colonialChurch(), palms(18))
	SIG.quebec = cat(fort(30), one("Town", "church", 22, 22, 8))
	SIG.halifax = fort(28)
	SIG.st_johns = fort(24)
	SIG.san_francisco = mission
	SIG.kingston = fortPalms(24)
	SIG.bridgetown = fortPalms(22)
	SIG.nassau = fortPalms(22)
	SIG.santo_domingo = cat(colonialChurch(), fort(24))
	SIG.san_juan = cat(fort(34), palms(22))
	SIG.panama = mission
	SIG.callao = fort(26)
	SIG.valparaiso = mission
	SIG.buenos_aires = cat(colonialChurch(), one("Town", "fountain-round", 10, 18, 8))
	SIG.montevideo = fort(24)
	SIG.acapulco = fortPalms(28)
	SIG.lagos = cat(one("Terrain", "tent-detailedopen", 14, 0, 0), palms(14))
	SIG.luanda = fortPalms(26)
	SIG.dakar = cat(one("Terrain", "pillar-obelisk", 24, 0, 0), palms(16))
	SIG.elmina = fortPalms(34)
	SIG.mombasa = fort(32)
	SIG.kilwa = cat(one("Terrain", "greek-ruins-a", 20, 0, 0), one("Terrain", "pillar-obelisk", 22, 18, 6), palms(-16))
	SIG.mogadishu = mosque(8)
	SIG.aden = cat(one("Castle", "fortress", 24, 0, 0), spire(SQ, 10, 20, 0))
	SIG.muscat = cat(one("Castle", "fortress", 24, -14, 0), one("Castle", "fortress", 22, 16, 4), one("Naval", "tower-watch", 22, 0, 18))
	SIG.jeddah = mosque(8)
	SIG.basra = cat(one("Town", "temple-stone", 24, 0, 0), palms(16))
	SIG.surat = fort(28)
	SIG.cochin = cat(one("Town", "church", 26, 0, 0), palms(16))
	SIG.colombo = fortPalms(26)
	SIG.madras = fort(28)
	SIG.calcutta = cat(fort(28), one("Town", "church", 22, 24, 6))
	SIG.rangoon = cat(spire(HEX, 9, 0, 0), one("Town", "temple-stone", 22, 16, 8), spire(HEX, 6, -14, 0), spire(HEX, 6, 14, -6))
	SIG.bangkok = cat(one("Town", "temple-tower", 30, 0, 0), one("Town", "temple-stone", 20, 18, 8))
	SIG.singapore = cat(one("Town", "temple-tower", 26, 0, 0), palms(16)) -- 동남아 항구: 종탑 대신 사원 탑
	SIG.hoi_an = shrine
	SIG.brunei = cat(one("Terrain", "wood-support", 8, -8, 0), one("Terrain", "wood-support", 8, 8, 0), palms(14))
	SIG.ternate = fortPalms(24)
	SIG.banda = fortPalms(22)
	SIG.tianjin = pagoda
	SIG.ningbo = shrine
	SIG.amoy = shrine
	SIG.busan = shrine
	SIG.incheon = shrine
	SIG.hakodate = cat(one("Castle", "fortress", 24, 0, 0), one("Terrain", "tree-pinedefaulta", 12, 20, 6))
	SIG.sydney = cat(lighthouse, one("Town", "windmill", 20, 16, 6))
	SIG.honolulu = pacificSet
	SIG.tahiti = pacificSet
	SIG.auckland = pacificSet
	SIG.tunis = mosque(8)
	SIG.algiers = cat(one("Castle", "fortress", 28, 0, 0), one("Town", "temple-stone", 20, 22, 6))
	SIG.tripoli = fort(26)
	SIG.casablanca = cat(one("Town", "temple-stone", 34, 0, 0), spire({ "tower-square-base", "tower-square-mid", "tower-square-mid", "tower-square-mid", "tower-square-mid", "tower-square-mid", "tower-square-top-roof" }, 9, 22, 0))
	SIG.beirut = fort(24)
	SIG.acre = cat(fort(26), one("Castle", "wall", 24, 0, 20))
	SIG.smyrna = cat(one("Town", "temple-stone", 24, 0, 0), one("Castle", "fortress", 22, 22, 6))
	SIG.syracuse = cat(one("Terrain", "greek-ruins-a", 22, 0, 0), one("Town", "church", 22, 20, 6))
	SIG.palermo = cat(one("Town", "church", 28, 0, 0), one("Terrain", "greek-ruins-a", 16, 20, 6))
	SIG.split = cat(one("Castle", "wall", 24, 0, 0), one("Castle", "wall", 24, 22, 0), one("Terrain", "column", 12, -14, 8), one("Town", "bell-tower", 26, 0, 14))
	SIG.ragusa = cat(one("Castle", "wall", 24, 0, 0), one("Castle", "wall", 24, 22, 0), one("Castle", "wall", 24, -22, 0), one("Castle", "fortress", 22, 0, 16), one("Town", "bell-tower", 24, 14, 10))
	SIG.corfu = fort(26)
	SIG.candia = fort(26)
	-- 기존 아이콘이 없던 유럽 해항도 도시가 고유한 성곽·시청·종탑 윤곽을 갖는다.
	SIG.gothenburg = cat(one("Town", "house", 18, -18, 0, 0, C(178, 66, 53)), one("Town", "house", 18, 0, 0, 0, C(222, 195, 120)), one("Naval", "tower-watch", 24, 20, 0))
	SIG.hull = cat(one("Castle", "gate", 23, 0, 0), one("Town", "bell-tower", 25, 18, 6))
	SIG.la_rochelle = cat(spire(SQ, 11, -12, 0), spire(SQ, 11, 12, 0), one("Castle", "gate", 20, 0, 8))
	SIG.valencia = cat(one("Town", "church", 27, 0, 0), spire(HEX, 9, -18, 0), one("Town", "fountain-square", 12, 16, 12))
	SIG.malaga = cat(one("Castle", "fortress", 27, -12, 0), one("Town", "church", 22, 16, 4))
	SIG.cartagena = cat(one("Castle", "fortress", 28, 0, 0), spire(SQ, 9, 20, 5))
	SIG.toulon = cat(fort(25), one("Naval", "tower-watch", 19, 20, -8))
	SIG.livorno = cat(lighthouse, one("Castle", "wall", 18, 18, 12))
	SIG.trieste = cat(one("Town", "church", 26, 0, 0), spire(SQ, 9, -16, 0))
	SIG.ancona = cat(spire(SQ, 10, 0, 0), one("Town", "church", 24, 18, 4))
	SIG.oslo = cat(one("Castle", "fortress", 28, 0, 0), one("Town", "house", 17, -24, 0, 0, C(184, 78, 58)), one("Town", "house", 17, 24, 0, 0, C(214, 190, 119)))
end

local function placeSignature(folder, info)
	local list = SIG[info.portId]
	local port = PortData.Ports[info.portId]
	local nation = port and port.country or ""
	local european = COUNTRY_PLAN[nation] ~= nil and currentKey ~= "ottoman"
	if not list and not european then return end
	-- 모든 대륙: 1단계는 항구촌, 2단계는 표지/소형 탑, 3단계는 온전한 지역 랜드마크.
	-- 유럽만 작은 도시로 시작하던 기존 불균형을 없애되 시설 소유/경제 잠금에는 영향이 없다.
	if sceneLevel < 3 then
		if sceneLevel == 2 then
			if list and #list > 0 then
				local marker = list[1]
				local m = importedModel(folder, marker.kind, marker.asset, SIG_ANCHOR + Vector3.new(marker.dx * 0.5, 0, marker.dz * 0.5), math.min(16, marker.size * 0.58), false, marker.tint)
				if m then m.Name = "EarlyRegionalLandmark" end
			elseif european then
				local asset = if nation == "netherlands" then "windmill"
					elseif nation == "norway" or nation == "sweden" or nation == "finland" then "house"
					elseif nation == "germany" or nation == "poland" or nation == "prussia" then "bell-tower"
					else "church"
				importedModel(folder, "Town", asset, SIG_ANCHOR, 16, true)
			end
		end
		return
	end
	if list then
		for _, e in list do
			importedModel(folder, e.kind, e.asset, SIG_ANCHOR + Vector3.new(e.dx, e.y, e.dz), e.size, true, e.tint)
		end
	end
	-- [항구 대표경관] 각 대륙의 상징 건물 주위에 3~5단계의 같은 문화권 부속 경관을 추가한다.
	-- 멀리서는 지붕·탑 실루엣, 가까이에서는 현관·정원·시장의 순서로 디테일이 드러난다.
	local landmarkFloor = part(folder, Vector3.new(43, 0.18, 28), CFrame.new(SIG_ANCHOR + Vector3.new(-12, 0.09, 0)),
		if currentKey == "desert" or currentKey == "wafrica" then C(190, 169, 123) else C(166, 152, 139),
		if currentKey == "desert" or currentKey == "wafrica" then Enum.Material.Sandstone else Enum.Material.Cobblestone)
	landmarkFloor.Name = "RegionalLandmarkCourt"
	landmarkFloor.CanCollide, landmarkFloor.CanQuery = false, false
	landmarkFloor:SetAttribute("Culture", currentKey)
	landmarkFloor:SetAttribute("Tier", sceneLevel)
	if sceneLevel >= 4 then
		local east = currentKey == "japan" or currentKey == "china"
		local humid = currentKey == "seasia" or currentKey == "pacific" or currentKey == "tropic" or currentKey == "malabar"
		local islamic = currentKey == "ottoman" or currentKey == "desert" or currentKey == "swahili" or currentKey == "wafrica"
		local mediterranean = currentKey == "iberia" or currentKey == "italy" or currentKey == "med" or currentKey == "creole"
		local x, z = SIG_ANCHOR.X, SIG_ANCHOR.Z
		if east then
			for _, dx in { -26, 26 } do
				importedModel(folder, "Town", "eastasia-column-base", Vector3.new(x + dx, 0, z - 17), 7, false)
			end
			importedModel(folder, "Terrain", "gate-overhang", Vector3.new(x - 3, 0, z - 20), 12, false)
		elseif humid then
			for _, dx in { -26, 26 } do
				importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(x + dx, 0, z - 18), 9, false)
			end
			importedModel(folder, "Town", "bench_A", Vector3.new(x - 12, 0, z - 20), 4, false)
		elseif islamic then
			for _, dx in { -24, 24 } do
				importedModel(folder, "Terrain", "egypt-column", Vector3.new(x + dx, 0, z - 20), 8, false)
			end
			importedModel(folder, "Town", "fountain-square", Vector3.new(x - 12, 0, z - 20), 8, false)
		elseif mediterranean then
			for _, dx in { -24, 24 } do
				importedModel(folder, "Terrain", "column", Vector3.new(x + dx, 0, z - 20), 8, false)
			end
			importedModel(folder, "Town", "fountain-round", Vector3.new(x - 10, 0, z - 20), 7, false)
		else
			for _, dx in { -24, 24 } do
				importedModel(folder, "Town", "tree-high", Vector3.new(x + dx, 0, z - 19), 9, false)
			end
			importedModel(folder, "Town", "bench_B", Vector3.new(x - 12, 0, z - 19), 4, false)
		end
	end
	if sceneLevel >= 5 and info.sim then
		local bld = info.sim.buildings or {}
		if (bld.hall or 0) > 0 or (bld.market or 0) >= 3 then
			for _, dx in { -16, 16 } do
				importedModel(folder, "Castle", "flag-banner-long", SIG_ANCHOR + Vector3.new(dx, 0, -23), 9, false)
			end
		end
	end
	if european and sceneLevel >= 4 then
		-- 바닷가 건물은 기존 모델을 국별로 골라 쓴다. 새 자산·충돌하는 랜드마크 생성은 없다.
		local kind, asset = "Town", "fountain-square"
		if nation == "portugal" or nation == "spain" or nation == "canary" then
			kind, asset = "Castle", "tower-square-base"
		elseif nation == "netherlands" then
			asset = "windmill"
		elseif nation == "england" or nation == "scotland" or nation == "ireland" then
			kind, asset = "Naval", "tower-watch"
		elseif nation == "germany" or nation == "poland" or nation == "prussia" or nation == "livonia" or nation == "estonia" then
			kind, asset = "Castle", "gate"
		elseif nation == "norway" or nation == "sweden" or nation == "denmark" or nation == "finland" then
			asset = "house"
		elseif nation == "italy" or nation == "venice" or nation == "tuscany" or nation == "naples" or nation == "sicily" then
			kind, asset = "Terrain", "statue-column"
		end
		importedModel(folder, kind, asset, Vector3.new(-8, 0, -112), 15, false)
		if sceneLevel >= 5 then
			importedModel(folder, "Castle", "flag-banner-long", Vector3.new(-18, 0, -128), 10, false)
			importedModel(folder, "Castle", "flag-banner-long", Vector3.new(2, 0, -128), 10, false)
		end
	end
end

local LM_SITES = {
	-- 대로 시설·지역 산업과 별도 구획에 놓고 주택 건설에서 이곳을 예약한다.
	Vector3.new(-112, 0, 166), Vector3.new(-112, 0, -166), Vector3.new(-160, 0, 166), Vector3.new(-160, 0, -166),
	Vector3.new(-208, 0, 181), Vector3.new(-208, 0, -181), Vector3.new(-263, 0, 181), Vector3.new(-263, 0, -181),
}

local function densify(folder, info, style, rng, walkers, made, onFacility)
	local key = styleKeyOf(style)
	local palm = palmOk(info.portId, style)
	local cold = not palm
	local port = PortData.Ports[info.portId]
	local nation = port and port.country or ""
	local countryPlan = COUNTRY_PLAN[nation]
	local big = (port and port.shipyard) or false
	local P = PROFILE[key] or PROFILE.north
	local lvl = sceneLevel
	-- [자동 장식 건축] 실제 건설된 시장·농장·교회·공방·관청과 번영도를 읽어 단계별 실물 소품을 선택한다.
	-- 시설 수나 생산량을 늘리는 경제 효과는 없고, 모바일 최대 7개 / PC 최대 13개만 배치한다.
	local decor = PortBuildings.decorativeVisual(lvl, info.sim and info.sim.buildings, info.sim and info.sim.prosperity)
	local previousDecor = lastDecorationGrowth[info.portId]
	local decorPlaced, decorAnimated, decorBuilders = 0, 0, 0
	local touchDecor = game:GetService("UserInputService").TouchEnabled
	local decorLimit = if game:GetService("UserInputService").TouchEnabled then 7 else 13
	local animationLimit = if touchDecor then 3 else 6
	local builderLimit = if touchDecor then 1 else 2
	local jobs = info.sim and info.sim.jobs
	local hasBuilders = not info.sim or (jobs and ((jobs.laborer or 0) + (jobs.craftsman or 0)) > 0)
	-- 도시마다 고정된 지형 시드로 구획 방향·필지 크기·외곽 폭을 달리한다. 재진입해도 같은 항구는 같은 형태다.
	local districtSeed = seeded(info.portId .. ":city-plan")
	local districtOffset = districtSeed:NextNumber(-7, 7)
	local lotVariance = districtSeed:NextNumber(0.94, 1.06)
	local laneOffset = districtSeed:NextNumber(-9, 9)
	local streetsX = P.streets
	local function nearStreet(x, w)
		for _, sx in streetsX do
			if math.abs(x - sx) < w / 2 + 3.5 then return true end
		end
		return false
	end

	-- 1) 마을 구획: 큰길 앞 두 줄 + 골목마다 등을 맞댄 두 줄. 집 크기·간격·층수·골목 짜임은 지역 프로필을 따르고,
	--    항구 발전도가 오를수록 구획(줄)이 늘고 길이 포장되며 집이 높아진다.
	-- 기본 필지 1.5배, 최대 2.2배. 건물 본체는 기존 크기를 유지하고 넓어진 필지를 보행·정원에 쓴다.
	local isRoyalCity = table.find(info.facilities or {}, "palace") ~= nil
	local royalPlots = PortBuildings.RoyalCityPlots
	local royalLot = if isRoyalCity then royalPlots.plotScale[lvl] else 1
	local royalArea = if isRoyalCity then royalPlots.districtScale[lvl] else 1
	local lotGrowth = PortBuildings.CityPlots.plotScale[lvl] * royalLot
	local areaGrowth = PortBuildings.CityPlots.areaScale[lvl] * royalArea
	local S = P.S * (countryPlan and countryPlan.lot or 1) * lotGrowth * lotVariance
	local fw = P.S * (countryPlan and countryPlan.lot or 1) / (HOUSE_SCALE * 1.08)
	local laneWidth = math.max(if isRoyalCity then 13 else 9, P.alley * (if isRoyalCity then 2.1 else 1.8))
	local laneL = 2 * S + laneWidth + 12
	local pairsN = math.min(3, math.max(1, math.floor((395 - 151) / laneL)), 1 + math.floor(lvl * 0.6))
	local localBlocks = info.development and info.development.blocks
	local economicDensity = if localBlocks then math.clamp(0.8 + math.sqrt(math.max(0, localBlocks)) / 60, 0.76, 1.18) else 1
	local moodDensity = if info.sim and info.sim.mood == "slump" then 0.88 else 1
	local dens = math.clamp((0.5 + 0.1 * lvl) * P.dens * (countryPlan and countryPlan.density or 1)
		* economicDensity * moodDensity, 0.3, 0.97)
	-- 실제 건설된 주택이 부족한 항구는 주거 필지를 비워 두고 경제 데이터는 그대로 둔다.
	if info.sim and info.sim.buildings then
		local target = ({ 40, 130, 430, 1600, 4000 })[lvl]
		dens *= math.clamp((info.sim.buildings.house or 0) / target, 0.3, 1)
	end
	local smokers = 0
	local wildernessQuota = ({ 36, 29, 23, 17, 12 })[lvl]
	-- 빈 필지는 건축을 가장하지 않고 원생 숲·수풀·돌밭으로 남겨 둔다. 모바일 자산 수를 단계별로 제한한다.
	local wildernessRng = seeded(info.portId .. ":open-land")
	-- 도시 전체 외곽을 단계별로 서쪽으로 넓혀 구시가지와 신시가지를 분리한다.
	local X_END = -math.min(565, 210 + math.floor(130 * math.sqrt(areaGrowth)) + math.floor(districtOffset * 3))
	local placedLots = {}
	local streetsOuter = {}
	for x = -235, X_END, -(S * 2.7 + laneWidth + 12) do
		table.insert(streetsOuter, x)
	end
	-- 구역(상업·주거·종교·농장): 항구마다 네 자리에 종류를 무작위로 배정한다. 시설 거리(큰길 양옆)는 집을 비운다.
	local dz = seeded(info.portId .. "district")
	local slots = {
		Vector3.new(-134 + districtOffset, 0, 86 + laneOffset * 0.4),
		Vector3.new(-134 + districtOffset, 0, -86 + laneOffset * 0.4),
		Vector3.new(-178 - districtOffset, 0, 86 - laneOffset * 0.4),
		Vector3.new(-178 - districtOffset, 0, -86 - laneOffset * 0.4),
	}
	for i = #slots, 2, -1 do
		local j = dz:NextInteger(1, i)
		slots[i], slots[j] = slots[j], slots[i]
	end
	local districts = { { kind = "religious", at = slots[1] }, { kind = "market", at = slots[2] }, { kind = "farm", at = slots[3] } } -- slots[4] 는 주거지 그대로
	local function reserved(x, z, half)
		-- 시설·지역별 시장/농장·랜드마크·문명 산업 필지를 주택과 분리한다.
		if x > -108 - half and math.abs(z) > 17 - half and math.abs(z) < 59 + half then return true end
		if x < -211 + half and math.abs(z) < 145 + half then return true end
		if isRoyalCity and x < -235 + half and x > -570 - half and math.abs(z) < 265 + half then return true end
		for _, d in districts do
			if math.abs(x - d.at.X) < (if d.kind == "farm" then 69 else 28) + half and math.abs(z - d.at.Z) < (if d.kind == "farm" then 33 else 26) + half then return true end
		end
		for _, a in LM_SITES do
			if math.abs(x - a.X) < 29 + half and math.abs(z - a.Z) < 29 + half then return true end
		end
		for _, lot in placedLots do
			if math.abs(x - lot.X) < half + lot.H + 2 and math.abs(z - lot.Z) < half + lot.H + 2 then return true end
		end
		return false
	end
	local function onStreet(x, half)
		for _, sx in streetsOuter do
			if math.abs(x - sx) < half + laneWidth / 2 + 3 then return true end
		end
		return false
	end
	-- [실물경제 마을] 기존 생산·시설 저장값으로 실제 공개형 작업장/실내를 만든다.
	-- 신규 도형이나 독립 경제를 만들지 않고 승인된 Kenney 건축 메시와 가구만 배치한다.
	do
		local stock = info.sim and info.sim.buildings
		local civic = {
			{ "workshop", "공방 거리", 2, "Town", "workbench-anvil", C(148, 108, 77), nil, "harbor" },
			{ "warehouse", "창고 구역", 2, "Cargo", "resource-planks", C(129, 112, 87), nil, "trade" },
			{ "market", "시장 거리", 2, "Town", "stall-green", C(178, 134, 78), nil, "trade" },
			{ "school", "학교 구역", 3, "Interior", "bookcaseclosed", C(111, 120, 147), nil, "tech" },
			{ "hall", "행정 구역", 3, "Interior", "bookcaseopenlow", C(165, 156, 139), nil, "harbor" },
			{ "tavern", "여가 거리", 3, "Interior", "tablecloth", C(125, 93, 78), nil, "quest" },
		}
		-- 항구별 원료 분류는 기존 ProductionChains.ClassOf만 사용한다.
		-- 모바일도 특산품 시설 2곳을 우선 노출하고 전체 건물 수는 기존 7/10개 상한으로 제한한다.
		local made = (PortData.Ports[info.portId] and PortData.Ports[info.portId].produces) or {}
		local goodsByClass = PortBuildings.SpecialtyFacilities
		-- [가공품 특산물] 원료는 ProductionChains.ClassOf를 따르고,
		-- 기존 Ports.Goods.resourceKind의 가공품도 해당 도시의 고유 건물로 표시한다.
		local prepared = {
			textile = "fiber", energy = "mineral", ore = "mineral", stone = "mineral",
			gem = "gem", marine = "gem", animal = "animal", food = "farm",
			spice = "farm", crops = "farm", oil = "farm",
			timber = "forest", chemical = "crafted", crafted = "crafted", drink = "drink",
		}
		local specialties = 0
		for _, good in Chains.showcaseGoods(info.portId, made, 8) do
			if specialties >= 2 then break end
			local definition = PortData.Goods[good]
			local kind = Chains.ClassOf[good] or (definition and prepared[definition.resourceKind])
			kind = if good == "fish" then "fishery" elseif good == "cheese" then "dairy" else kind
			local detail = goodsByClass[kind]
			local mesh = GOOD_MESH[good]
			if definition and detail and mesh and AssetIds[mesh[1] .. "/" .. mesh[2]] then
				-- 생산 원료와 등록된 메시가 모두 있을 때만 기존 건물 저장량으로 전문 시설을 표시한다.
				specialties += 1
				table.insert(civic, specialties, {
					detail.building, definition.name .. " " .. detail.name, 2,
					detail.kind, detail.asset, C(detail.tint[1], detail.tint[2], detail.tint[3]), good, "trade",
				})
			end
		end
		local placed = 0
		local maxSites = if game:GetService("UserInputService").TouchEnabled then 7 else 10
		for index, c in ipairs(civic) do
			local count = if stock then stock[c[1]] or 0 else math.max(0, lvl - c[3] + 1)
			if lvl >= c[3] and count > 0 then
				local quota = if c[7] then 1 else math.min(3, math.max(1, math.floor(math.sqrt(count) / 2.8 + 0.5)))
				for n = 1, quota do
					if placed >= maxSites then break end
					local row = math.floor((index - 1) / 3)
					local side = if row == 0 then 1 else -1
					local z = side * (if isRoyalCity then 330 else 246) + side * (n - 1) * 44
					local x = -286 - ((index - 1) % 3) * 63
					if c[7] then
						-- 특산품 두 채는 기존 외곽 건축 구획에서 도로·궁전·일반 주거 필지를 피한다.
						z = (if index % 2 == 0 then 1 else -1) * (if isRoyalCity then 365 else 310)
						x = -278 - (index - 1) * 56
					end
					if onStreet(x, 14) then x += math.max(25, S * 0.6) end
					if not reserved(x, z, 18) then
						local at = Vector3.new(x, 0, z)
						local face = if z > 0 then -1 else 1
						local wallName = if key == "japan" or key == "china" or key == "seasia" or key == "malabar"
							or key == "pacific" or key == "swahili" or key == "wafrica" then "kenney_wood_wall_01" else "kenney_grey_wall_01"
						local ground = importedModel(folder, "Town", "floor_base", at, 21, false, c[6])
						if ground then
							ground.Name = "EconomySite_" .. c[1]
							ground:SetAttribute("IndustryGood", c[7] or "")
							ground:SetAttribute("PortId", info.portId)
							ground:SetAttribute("DevelopmentTier", lvl)
							-- [경제↔건축] 현재 시설 숫자만 읽어 준공 및 증축 가능 등급을 표시한다. 건설비·저장값 변경 없음.
							local visualTier = math.clamp(1 + math.floor(math.sqrt(math.max(0, count)) / 3), 1, lvl)
							ground:SetAttribute("BuildPlotId", ("%s:industry:%d:%d"):format(info.portId, index, n))
							ground:SetAttribute("BuildType", c[1])
							ground:SetAttribute("BuildPhase", 4)
							ground:SetAttribute("BuildState", "complete")
							ground:SetAttribute("BuildTier", visualTier)
							ground:SetAttribute("BuildEconomicCount", count)
							ground:SetAttribute("BuildAuthority", "VISUAL_ONLY")
							placed += 1
							table.insert(placedLots, { X = x, Z = z, H = 18 })
							-- 한쪽이 실제로 열린 3면 작업장: 승인된 벽·지붕을 사용해 안에 들어갈 수 있다.
							local back = importedModel(folder, "Town", wallName, at + Vector3.new(0, 0, -face * 8), 19, true, c[6])
							for _, dx in { -9, 9 } do
								local sideAt = at + Vector3.new(dx, 0, 0)
								local sideWall = importedModel(folder, "Town", wallName, sideAt, 17, true, c[6])
								if sideWall then rotateAround(sideWall, sideAt, math.pi * 0.5) end
							end
							if lvl >= 3 then
								importedModel(folder, "Town", if wallName == "kenney_wood_wall_01" then "kenney_roof_straight_green_01" else "kenney_roof_straight_red_01",
									at + Vector3.new(0, 9, 0), 21, false)
							end
							local anchor = back and back:FindFirstChildWhichIsA("BasePart", true)
								or ground:FindFirstChildWhichIsA("BasePart", true)
							if anchor then sign(folder, anchor, c[2], C(151, 110, 51), 10) end
							-- [내부 설비] 업종에 맞는 실제 실내가구·장비·원료를 기존 개방형 실내에 놓는다.
							local fixture = importedModel(folder, c[4], c[5], at + Vector3.new(-4, 0, -face * 2), 4.5, false)
							if fixture then fixture.Name = "FacilityEquipment_" .. c[1] end
							importedModel(folder, "Interior", if c[1] == "warehouse" or c[1] == "hall" or c[1] == "school"
								then "bookcaseopenlow" elseif c[1] == "tavern" then "tablecloth" else "tablecross",
								at + Vector3.new(3, 0, -face * 2), 4, false)
							if c[1] == "tavern" or c[1] == "school" or c[1] == "hall" then
								importedModel(folder, "Interior", "stoolbar", at + Vector3.new(5, 0, face * 3), 2.5, false)
							elseif c[1] == "workshop" or c[1] == "warehouse" then
								importedModel(folder, "Cargo", "resource-planks", at + Vector3.new(5, 0, face * 3), 3.4, false)
							end
							-- [실물 창고·식료품점] 이미 건설된 시장/창고의 개방형 공간에 지역 생산품만 진열한다.
							-- 판매 가격·교역재고·건물 수는 변경하지 않는 시각 전시다. 주류·담배·약물 제외.
							if c[1] == "warehouse" or c[1] == "market" then
								local displayed = 0
								local maxProducts = if game:GetService("UserInputService").TouchEnabled then 1 else 2
								for _, good in made do
									if displayed >= maxProducts then break end
									local food = table.find({ "grain", "fish", "maize", "fruit", "grapes", "lemon",
										"meat", "cheese", "honey", "salt", "sugar", "coconut", "dates" }, good) ~= nil
									if c[1] == "warehouse" or food then
										if good ~= "beer" and good ~= "wine" and good ~= "rum" and good ~= "sake"
											and good ~= "tobacco" and good ~= "opium" then
											local mesh = GOOD_MESH[good]
											if mesh and AssetIds[mesh[1] .. "/" .. mesh[2]] then
												local goodsAt = at + Vector3.new(-5 + displayed * 5, 0, face * 3)
												local cargo = importedModel(folder, mesh[1], mesh[2], goodsAt, goodSize(good, 2.3), false, mesh[3])
												if cargo then
													displayed += 1
													cargo.Name = if c[1] == "market" then "MarketFoodShop_" .. good else "HarborWarehouseGoods_" .. good
													cargo:SetAttribute("LocalProduct", good)
													cargo:SetAttribute("ShowcaseOnly", true)
													cargo:SetAttribute("PortId", info.portId)
												end
											end
										end
									end
								end
								if c[1] == "market" and displayed > 0 then
									local signPart = ground:FindFirstChildWhichIsA("BasePart", true)
									if signPart then sign(folder, signPart, "식료품점 · 지역 농수산물", C(227, 191, 126), 8, true) end
								end
							end
							if c[7] then
								local mesh = GOOD_MESH[c[7]]
								local item = importedModel(folder, mesh[1], mesh[2], at + Vector3.new(0, 0, face * 2), goodSize(c[7], 3.2), false, mesh[3])
								if item then item.Name = "SpecialtyProduct_" .. c[7] end
							end
							-- [산업·행정 장식] 실제 보유 공방·관청에서만 높은 등급의 간판·기념 장식이 자란다.
							local grade = if c[1] == "hall" then decor.civic elseif c[1] == "workshop" then decor.industry else 0
							if grade >= 2 and decorPlaced < decorLimit then
								local kind = if c[1] == "hall" then "Terrain" else "Town"
								local asset = if c[1] == "hall" then "column" else "bench_B"
								local newGrade = previousDecor and grade > (previousDecor[if c[1] == "hall" then "civic" else "industry"] or 0)
									and decorAnimated < animationLimit
								local delay = if newGrade then 0.2 + decorAnimated * 0.36 else nil
								local prop = importedModel(folder, kind, asset, at + Vector3.new(13, 0, face * 11), 5, false, nil, delay)
								if prop then
									if newGrade then decorAnimated += 1 end
									decorPlaced += 1
									prop.Name = "CityGrowthDecoration_" .. c[1] .. "_" .. n
									prop:SetAttribute("BuildPlotId", ("%s:decor:%d:%d"):format(info.portId, index, n))
									prop:SetAttribute("BuildType", "decoration")
									prop:SetAttribute("BuildTier", grade)
									prop:SetAttribute("BuildState", "complete")
									prop:SetAttribute("BuildAuthority", "VISUAL_ONLY")
									prop:SetAttribute("ShowcaseOnly", true)
								end
							end
							prompt(folder, at + Vector3.new(0, 3, face * 7), c[2], "시설 이용", c[8], onFacility)
						end
					end
				end
			end
		end
	end
	-- 한 줄 채우기: z = 줄의 중심, t = 0(항구 쪽)~1(성벽 쪽)
	-- [주거 구획] 항구·대로 측면·주거 행·칸 번호 조합으로 재진입 시 같은 필지 키를 쓴다.
	local residentialDecorationPlaced = false
	local function fillRow(z, t, xStart, side, laneIndex, rowIndex)
		local x = xStart
		local slotIndex = 0
		while x > X_END do
			slotIndex += 1
			local plotId = ("%s:home:%d:%d:%d:%d"):format(info.portId, side, laneIndex, rowIndex, slotIndex)
			if rng:NextNumber() < dens then
				local sz = S * rng:NextNumber(0.9, 1.08)
				local pos = Vector3.new(x + rng:NextNumber(-1, 1) * P.jx, 0, z + rng:NextNumber(-1, 1) * P.jz)
				local half = sz * 0.62
				if not onStreet(pos.X, half) and not reserved(pos.X, pos.Z, half) then
				local fl = P.fl0 + math.floor(t * P.flGrow + 0.5) + (if lvl >= 4 then 1 else 0) - (if lvl <= 1 then 1 else 0)
				if rng:NextNumber() < 0.15 then fl += (if rng:NextNumber() < 0.5 then -1 else 1) end
				fl = math.clamp(fl, 1, P.flMax)
				local ww = fw * (sz / S)
				local body = house(folder, pos, ww, ww * rng:NextNumber(0.85, 1), fl, style, rng)
				if body then
					-- 실제 주거 입주·증축 판단은 기존 경제의 주택 수·발전도가 담당한다.
					body:SetAttribute("BuildPlotId", plotId)
					body:SetAttribute("BuildType", "house")
					body:SetAttribute("BuildPhase", 4)
					body:SetAttribute("BuildState", "complete")
					body:SetAttribute("BuildTier", fl)
					body:SetAttribute("BuildAuthority", "VISUAL_ONLY")
					-- [주거 성장] 이미 존재하는 주택 앞에 주민 휴식 시설·우물을 하나만 건설한다.
					-- 첫 세대에 보이면 완공 상태로, 도시 발전 중 새로 해금된 경우에만 설치 모션을 사용한다.
					if not residentialDecorationPlaced and decor.residential > 0 and decorPlaced < decorLimit then
						local newGrade = previousDecor and decor.residential > (previousDecor.residential or 0)
							and decorAnimated < animationLimit
						local itemName = if decor.residential >= 3 then "village-well" else "bench_A"
						local front = if pos.Z > 0 then -1 else 1
						local placeAt = pos + Vector3.new(ww * 0.28, 0, front * (ww * 0.45 + 4))
						local detail = importedModel(folder, "Town", itemName, placeAt, 4.5, false, nil,
							if newGrade then 0.28 + decorAnimated * 0.36 else nil)
						if detail then
							residentialDecorationPlaced = true
							decorPlaced += 1
							if newGrade then decorAnimated += 1 end
							detail.Name = "CityGrowthDecoration_residential"
							detail:SetAttribute("BuildPlotId", plotId .. ":decor")
							detail:SetAttribute("BuildType", "decoration")
							detail:SetAttribute("BuildTier", decor.residential)
							detail:SetAttribute("BuildPhase", 4)
							detail:SetAttribute("BuildState", "complete")
							detail:SetAttribute("BuildAuthority", "VISUAL_ONLY")
							detail:SetAttribute("ShowcaseOnly", true)
						end
					end
					table.insert(placedLots, { X = pos.X, Z = pos.Z, H = half })
					if smokers < 28 and rng:NextNumber() < 0.22 then
						smokers += 1
						smokeOn(folder, pos + Vector3.new(ww * 0.2, fl * 6 + 4, 0))
					end
				end
				end
			else
				-- 빈 구획: 아직 경제 시뮬에서 주택이 건설되지 않은 부분에 자연물을 남긴다.
				-- 미래 건축 구획·왕궁·도로·랜드마크를 비워 놓고 한 구획당 소품 1개 이하.
				if wildernessQuota > 0 and wildernessRng:NextNumber() < 0.42 then
					local z0 = z + wildernessRng:NextNumber(-S * 0.16, S * 0.16)
					local half = math.min(9, S * 0.27)
					if not onStreet(x, half) and not reserved(x, z0, half) then
						local at = Vector3.new(x, 0, z0)
						local roll = wildernessRng:NextInteger(1, 7)
						local biome = if key == "desert" or key == "ottoman" then "arid"
							elseif palm then "coastal" elseif cold then "woodland" else "lowland"
						local group, asset, size = "Terrain", "tree-oak", 10
						-- [무료 실물 조경] 기존 빈 구획 한 자리만 사용해 파츠 수·건물 밀도를 늘리지 않는다.
						if roll == 1 then group, asset, size = "Terrain", "Rock_2", 6
						elseif roll == 2 and biome ~= "arid" then group, asset, size = "Terrain", "Bush_Small", 3.2
						elseif roll == 3 and biome ~= "arid" then group, asset, size = "Terrain", "Grass_Small", 2.2
						elseif biome == "arid" then group, asset, size = "Naval", "rocks-sand-a", 8
						elseif biome == "coastal" then group, asset, size = "Naval", "palm-detailed-straight", 10
						elseif biome == "woodland" then group, asset, size = "Terrain", "tree-pinedefaulta", 11
						end
						local model = importedModel(folder, group, asset, at, size, false)
						if model then
							model.Name = "Undeveloped_" .. asset
							-- 미개발지는 건물을 자동으로 짓지 않고 미래 건축 메뉴가 읽을 필지 상태만 공개한다.
							model:SetAttribute("BuildPlotId", plotId)
							model:SetAttribute("BuildType", "house")
							model:SetAttribute("BuildPhase", 0)
							model:SetAttribute("BuildState", "vacant")
							model:SetAttribute("BuildTier", 0)
							model:SetAttribute("BuildAuthority", "VISUAL_ONLY")
							wildernessQuota -= 1
							table.insert(placedLots, { X = x, Z = z0, H = half })
						end
					end
				end
			end
			x -= S * (1 + P.gapf * (countryPlan and countryPlan.gap or 1) * rng:NextNumber(0.6, 1.4))
		end
	end
	for _, side in { 1, -1 } do
		-- 큰길(가운데 길) 앞 두 줄: 광장과 시설을 지나 안쪽부터
		-- 구시가지 시설 옆 주거 건설을 중단하고 신도시 외곽의 독립 주거 구역으로 확장한다.
		for p = 0, pairsN do
			local laneZ = 152 + laneOffset + p * laneL
			if (P.canal or info.portId == "venice") and p % 2 == 1 then
				local canal = part(folder, Vector3.new(360, 0.3, laneWidth + 1), CFrame.new(-365, 0.05, side * laneZ), Color3.fromRGB(70, 120, 150), Enum.Material.Glass)
				canal.Transparency = 0.25
				canal.CanCollide = false
				canal.CanQuery = false
			else
				strip(folder, style, (X_END - 235) / 2, side * laneZ, 235 - X_END, laneWidth)
			end
			if p < pairsN then
				local t = (p + 0.5) / math.max(1, pairsN)
				fillRow(side * (laneZ + laneWidth / 2 + 6 + S / 2), t, -260, side, p, 1)
				fillRow(side * (laneZ + laneL - laneWidth / 2 - 6 - S / 2), t, -260, side, p, 2)
			end
		end
	end
	for _, sx in streetsOuter do
		strip(folder, style, sx, 0, laneWidth, 2 * (152 + pairsN * laneL) + 6)
	end
	-- 기존 항구 중심 도로는 유지하고 서쪽 외곽도로로 진입로를 연결한다.
	strip(folder, style, -212, 0, 9, 320)
	-- 구역 내용 (등록된 실제 3D 모델만 사용)
	do
		local function put(kind, asset, size, x, z, solid, yaw, buildDelay)
			local m = importedModel(folder, kind, asset, Vector3.new(x, 0, z), size, solid == true, nil, buildDelay)
			if m and yaw then rotateAround(m, Vector3.new(x, 0, z), yaw) end
			return m
		end
		local hotKey = key == "ottoman" or key == "swahili" or key == "malabar" or key == "colonial" or key == "desert" or key == "tropic" or key == "seasia" or key == "pacific" or key == "wafrica" or key == "creole"
		for _, d in districts do
			local cx, cz = d.at.X, d.at.Z
			local face = if cz > 0 then 0 else math.pi
			if d.kind == "religious" then
				if key == "japan" or key == "china" or key == "korea" then
					put("Town", "temple-tower", 26, cx, cz, true, face)
					put("Town", "temple-stone", 14, cx + 14, cz + (if cz > 0 then -8 else 8), true, face)
				elseif key == "ottoman" or key == "swahili" or key == "malabar" or key == "desert" or key == "tropic" or key == "seasia" or key == "pacific" or key == "wafrica" then
					put("Town", "temple-stone", 28, cx, cz, true, face)
					put("Terrain", "pillar-obelisk", 14, cx + 15, cz, true)
				else
					put("Town", "church", 30, cx, cz, true, face)
					put("Town", "bell-tower", 22, cx - 16, cz + (if cz > 0 then -6 else 6), true)
				end
				for k = -1, 1, 2 do
					lantern(folder, Vector3.new(cx + k * 9, 0, cz + (if cz > 0 then -17 else 17)), 3)
				end
			elseif d.kind == "market" then
				for k = -2, 2 do
					put("Town", if k % 2 == 0 then "stall-red" else "stall-green", 7, cx + k * 8, cz + (if cz > 0 then -8 else 8), false, face)
					put("Town", if k % 2 == 0 then "stall-green" else "stall-red", 7, cx + k * 8, cz + (if cz > 0 then 8 else -8), false, face + math.pi)
				end
				put("Town", "cart", 4, cx - 14, cz, false)
				put("Cargo", "barrel", 2.6, cx + 14, cz + 2, false)
				put("Cargo", "box-open", 2.4, cx + 12, cz - 2, false)
				put("Town", "bench_A", 3.6, cx, cz, false)
				put("Town", "fountain-round", 7, cx, cz + (if cz > 0 then -15 else 15), true)
			else -- farm
				-- 지역에 맞는 작물: 동아시아는 벼·양배추·가지, 더운 지방은 옥수수·호박·멜론, 그 밖은 밀·양배추·당근
				local crops
				if key == "japan" or key == "china" or key == "korea" or key == "seasia" then
					crops = { { "Terrain", "crops-wheatstageb", 5 }, { "Cargo", "cabbage", 2.8 }, { "Cargo", "eggplant", 2.6 } }
				elseif hotKey then
					crops = { { "Cargo", "corn", 3.2 }, { "Cargo", "pumpkin", 2.8 }, { "Terrain", "crop-melon", 5 } }
				else
					crops = { { "Terrain", "crops-wheatstagea", 5 }, { "Cargo", "cabbage", 2.8 }, { "Cargo", "carrot", 2.8 } }
				end
				-- 매우 넓은 농경지: 7줄 x 17칸, 줄마다 다른 작물
				for row = -3, 3 do
					local cr = crops[(row + 3) % #crops + 1]
					for k = -8, 8 do
						put(cr[1], cr[2], cr[3], cx + k * 6, cz + row * 8, false)
					end
				end
				for k = -9, 9 do
					put("Town", "fence", 5, cx + k * 5.5, cz + (if cz > 0 then 29 else -29), false)
				end
				put("Town", if key == "iberia" or key == "north" or key == "med" then "windmill" else "watermill", 30, cx + 62, cz, true, face)
				put("Terrain", "log-stack", 4, cx - 56, cz + 4, false)
			end
			-- [구역 자동 장식] 2~5단계의 실제 시설과 번영 기준으로만 장식이 완공된다.
			-- 나중에 직접 건축할 수 있도록 주거 필지와 구별되는 안정적인 장식 필지 번호를 부여한다.
			local grade = decor[d.kind] or 0
			if grade > 0 then
				local decorations = if d.kind == "market" then {
					{ "Cargo", "food-crate-large-apples", 3, -31, 35 },
					{ "Town", "bench_B", 4, 30, 35 },
					{ "Town", "fountain-square", 8, 31, -34 },
					{ "Castle", "flag-banner-short", 9, -31, -34 },
				} elseif d.kind == "religious" then {
					{ "Town", "bench_A", 4.5, -31, 33 },
					{ "Town", "village-well", 7, 32, 33 },
					{ if key == "japan" or key == "china" or key == "korea" then "Town" else "Terrain",
						if key == "japan" or key == "china" or key == "korea" then "eastasia-column-base" else "column", 7, -33, -34 },
					{ "Castle", "flag-banner-short", 9, 33, -34 },
				} else {
					{ "Town", "cart", 5, -60, 40 },
					{ "Cargo", "food-crate-large-apples", 3.5, 60, 40 },
					{ "Town", "village-well", 7, -60, -40 },
					{ "Cargo", "resource-planks", 4.5, 60, -40 },
				}
				for tier = 1, math.min(grade, #decorations) do
					if decorPlaced >= decorLimit then break end
					local row = decorations[tier]
					local newGrade = previousDecor and tier > (previousDecor[d.kind] or 0)
						and decorAnimated < animationLimit
					local delay = if newGrade then 0.24 + decorAnimated * 0.36 else nil
					local obj = put(row[1], row[2], row[3], cx + row[4], cz + row[5], false, nil, delay)
					if obj then
						decorPlaced += 1
						if newGrade then decorAnimated += 1 end
						obj.Name = "CityGrowthDecoration_" .. d.kind .. "_" .. tier
						obj:SetAttribute("BuildPlotId", ("%s:decor:%s:%d"):format(info.portId, d.kind, tier))
						obj:SetAttribute("BuildType", "decoration")
						obj:SetAttribute("BuildTier", tier + 1)
						obj:SetAttribute("BuildPhase", 4)
						obj:SetAttribute("BuildState", "complete")
						obj:SetAttribute("BuildAuthority", "VISUAL_ONLY")
						obj:SetAttribute("ShowcaseOnly", true)
						if newGrade then
							-- [시공 현장] 장식 기초를 잡는 임시 비계는 완공 후 사라지고, 실제 R15 목수가 망치질한다.
							local installAt = Vector3.new(cx + row[4], 0, cz + row[5])
							local scaffold = importedModel(folder, "Terrain", "wood-support",
								installAt + Vector3.new(-3, 0, 0), 5, false)
							if scaffold then
								scaffold.Name = "CityDecorationScaffold"
								scaffold:SetAttribute("ShowcaseOnly", true)
								task.spawn(function()
									local deadline = os.clock() + 25
									while scaffold.Parent and not folder.Parent and os.clock() < deadline do task.wait(0.12) end
									if not scaffold.Parent or not folder.Parent then return end
									task.wait(delay + 1.4)
									if scaffold.Parent then scaffold:Destroy() end
								end)
							end
							if hasBuilders and decorBuilders < builderLimit then
								local workerAt = installAt + Vector3.new(6, 0, 5)
								local worker = villager(folder, workerAt, faceTo(workerAt, installAt),
									C(143, 109, 73), rng, "Barbarian", true,
									{ profession = "carpenter", hat = "cap", year = info.year or currentYear })
								if worker then
									decorBuilders += 1
									worker:SetAttribute("Job", "construction_worker")
									worker:SetAttribute("ShowcaseOnly", true)
									worker:SetAttribute("BuildPlotId", obj:GetAttribute("BuildPlotId"))
									local duty = { model = worker, base = worker:GetPivot(), mode = "stay",
										kind = "hammer", phase = rng:NextNumber(0, 5) }
									table.insert(walkers, duty)
									task.spawn(function()
										local deadline = os.clock() + 25
										while worker.Parent and not folder.Parent and os.clock() < deadline do task.wait(0.12) end
										if not worker.Parent or not folder.Parent then return end
										task.wait(delay + 1.6)
										if worker.Parent and folder.Parent then
											duty.kind = "inspect"
											worker:SetAttribute("Activity", "inspect")
										end
									end)
								end
							end
						end
					end
				end
			end
			-- 구역별 주민: 하는 일이 다르다 (광장에만 몰려 있지 않게)
			local function npc(dx, dz, yaw, kind, mode, spec)
				local m = villager(folder, Vector3.new(cx + dx, 0, cz + dz), yaw, Color3.fromRGB(rng:NextInteger(60, 190), rng:NextInteger(60, 150), rng:NextInteger(40, 130)), rng, spec and spec.role or "Rogue", false, spec and spec.extra)
				if not m then return end
				local w = { model = m, base = m:GetPivot(), kind = kind, mode = mode, phase = rng:NextNumber(0, 10) }
				if mode == "path" then
					w.len = spec.len
					w.speed = rng:NextNumber(1.2, 1.9)
					w.idleKind = spec.idle
				end
				table.insert(walkers, w)
			end
			if d.kind == "religious" then
				local doorZ = if cz > 0 then -19 else 19
				npc(-4, doorZ, face, "bell", "stay", { role = "Knight" })
				npc(5, doorZ, face + math.pi, "talk", "stay", { role = "Rogue" })
				npc(-22, doorZ, -math.pi / 2, nil, "path", { role = "Rogue", len = 22, idle = "look" })
			elseif d.kind == "market" then
				for k = -2, 2, 2 do
					npc(k * 8, (if cz > 0 then -11 else 11), face + math.pi, "stall", "stay", { role = "Barbarian" })
				end
				npc(-18, 0, -math.pi / 2, "carry", "path", { role = "Rogue", len = 36, idle = "talk" })
				npc(18, 3, math.pi / 2, nil, "path", { role = "Rogue", len = 30, idle = "look" })
			else
				for k = -1, 1 do
					npc(k * 10 - 2, k * 7, face, "hoe", "stay", { role = "Barbarian", extra = { hat = "straw" } })
				end
				npc(-18, 10, -math.pi / 2, "carry", "path", { role = "Rogue", len = 34, idle = "stoop" })
			end
		end
	end
	-- [항만 창고 장식] 실제 경제에 창고가 세워진 경우에만 화물 보호·가로 소품이 자란다.
	if decor.harbor > 0 and decorPlaced < decorLimit then
		local newGrade = previousDecor and decor.harbor > (previousDecor.harbor or 0)
			and decorAnimated < animationLimit
		local delay = if newGrade then 0.25 + decorAnimated * 0.36 else nil
		local warehouseDisplay = importedModel(folder, "Cargo",
			if decor.harbor >= 3 then "resource-planks" else "box-open",
			Vector3.new(-31, 0, 222), 4, false, nil, delay)
		if warehouseDisplay then
			decorPlaced += 1
			if newGrade then decorAnimated += 1 end
			warehouseDisplay.Name = "CityGrowthDecoration_harbor"
			warehouseDisplay:SetAttribute("BuildPlotId", info.portId .. ":harbor:decoration")
			warehouseDisplay:SetAttribute("BuildType", "decoration")
			warehouseDisplay:SetAttribute("BuildTier", decor.harbor)
			warehouseDisplay:SetAttribute("BuildPhase", 4)
			warehouseDisplay:SetAttribute("BuildState", "complete")
			warehouseDisplay:SetAttribute("BuildAuthority", "VISUAL_ONLY")
			warehouseDisplay:SetAttribute("ShowcaseOnly", true)
		end
	end
	if info.sim and info.sim.buildings then lastDecorationGrowth[info.portId] = decor end
	folder:SetAttribute("CityDecorationVisible", decorPlaced)
	folder:SetAttribute("CityDecorationInstalledThisVisit", decorAnimated)
	folder:SetAttribute("CityDecorationBuilders", decorBuilders)
	folder:SetAttribute("CityDecorationGrowthMode", "ECONOMY_READ_ONLY")
	-- 특산품 구역: 이 항구의 생산품마다 관련 건물(공방·양조장·제재소 …)을 세우고, 지붕 위 간판에 그 상품의 3D 아이콘을 단다.
	do
		local SPECIAL_NAME = {
			wool = "양모 공방", coal = "탄광 사무소", tin = "주석 광산", spice = "향신료 창고", cheese = "치즈 공방", tea = "다원",
			porcelain = "도자기 가마", wine = "와이너리", cloth = "직물 공방", salt = "염전", amber = "호박 공방", fish = "어시장",
			beer = "양조장", whale_oil = "고래기름 공장", iron = "제철소", timber = "제재소", copper = "구리 광산", silver = "은광",
			gold = "금광", sugar = "제당소", coffee = "커피 농원", silk = "비단 공방", pearls = "진주 양식장", olive_oil = "올리브 압착장",
			honey = "양봉장", sake = "사케 양조장", rum = "럼 증류소", grain = "제분소", cocoa = "카카오 농원", mahogany = "목재소",
			gems = "보석 세공소", sugar_cane = "제당소", fruit = "과수원", grapes = "포도원", lemon = "레몬 농원", maize = "옥수수 농장",
			coconut = "코코넛 농원", meat = "햄 공방", pepper = "후추 농원",
		}
		local goods = Chains.showcaseGoods(info.portId, made, if lvl >= 5 then 3 elseif lvl >= 3 then 2 else 1)
		local n = #goods
		local origin = Vector3.new(-178, 0, -86)
		local face = math.pi
		for k = 1, n do
			local good = goods[k]
			local at = origin + Vector3.new((k - (n + 1) / 2) * 20, 0, 0)
			local wall = Color3.fromRGB(190, 170, 140):Lerp(Color3.fromRGB(150, 120, 90), rng:NextNumber(0, 0.5))
			local body = house(folder, at, 14, 11, if lvl >= 4 then 2 else 1, style, rng, wall)
			local mesh = GOOD_MESH[good]
			-- 문 앞 진열: 상품 3D 모델 더미와 통
			for j = -1, 1 do
				importedModel(folder, mesh[1], mesh[2], at + Vector3.new(j * 3.2, 0, 8.6), goodSize(good, 2.8), false, mesh[3])
			end
			importedModel(folder, "Cargo", "barrel", at + Vector3.new(7.6, 0, 7.4), 2.6, false)
			importedModel(folder, "Cargo", "box-open", at + Vector3.new(-7.6, 0, 7.4), 2.4, false)
			if body then
				sign(folder, body, SPECIAL_NAME[good] or "특산품 공방", Color3.fromRGB(150, 110, 40), (if lvl >= 4 then 2 else 1) * 3 + 6, false, { mesh[1], mesh[2] })
			end
		end
	end
	-- 문화권 소품: 지역 건축·생활에 맞는 오브젝트 (발전도가 오를수록 늘어난다)
	do
		local function rowOf(kind, asset, size, x0, x1, step, z, solid)
			local x = x0
			while x > x1 do
				importedModel(folder, kind, asset, Vector3.new(x + rng:NextNumber(-1.5, 1.5), 0, z + rng:NextNumber(-0.6, 0.6)), size * rng:NextNumber(0.9, 1.1), solid == true)
				x -= step
			end
		end
		local function one(kind, asset, size, x, y, z, solid)
			return importedModel(folder, kind, asset, Vector3.new(x, y, z), size, solid == true)
		end
		local canalZ = 38 + laneL
		if key == "iberia" then
			one("Town", "village-well", 6, -100, 0, 8)
			one("Town", "village-well", 6, -152, 0, -8)
			if lvl >= 2 then
				one("Town", "fountain-square", 9, -122, 0, 0)
			end
			rowOf("Cargo", "barrel", 2.4, -100, -180, 18, 7.4)
			rowOf("Cargo", "food-crate-large-apples", 2.2, -108, -180, 22, -7.4)
		elseif key == "italy" then
			rowOf("Terrain", "column", 8, -100, -176, 14, 7.5)
			rowOf("Terrain", "column", 8, -100, -176, 14, -7.5)
			if lvl >= 2 then
				one("Terrain", "statue-column", 12, -122, 0, 0)
			end
			if info.portId == "venice" then
				for _, sd in { 1, -1 } do
					for _, bx in { -70, -110, -150 } do
						local b = one("Naval", "boat-row-small", 7, bx, 0.3, sd * canalZ)
						rotateAround(b, Vector3.new(bx, 0, sd * canalZ), math.pi / 2)
					end
				end
			end
		elseif key == "france" then
			rowOf("Terrain", "tree-oak", 9, -100, -182, 14, 10)
			rowOf("Terrain", "tree-oak", 9, -100, -182, 14, -10)
			rowOf("Town", "foliage_A", 3, -96, -182, 7, 7.2)
			rowOf("Town", "foliage_A", 3, -96, -182, 7, -7.2)
			if lvl >= 2 then
				one("Town", "fountain-round", 9, -122, 0, 0)
			end
			for x = -100, -180, -20 do
				lantern(folder, Vector3.new(x, 0, 5.6), 3)
				lantern(folder, Vector3.new(x, 0, -5.6), 3)
			end
		elseif key == "britain" then
			rowOf("Town", "cart", 5, -100, -180, 26, 8)
			rowOf("Cargo", "barrel", 2.4, -104, -180, 16, -7.4)
			rowOf("Terrain", "log-stack", 3, -112, -180, 30, 7.4)
			one("Town", "stall-green", 6.5, -110, 0, -10)
			one("Town", "bench_A", 3.8, -140, 0, 7)
		elseif key == "brick" then
			if pairsN >= 1 then
				for _, sd in { 1, -1 } do
					for _, sx in streetsX do
						local br = one("Terrain", "bridge-wood", 7, sx, 0.2, sd * canalZ)
						rotateAround(br, Vector3.new(sx, 0, sd * canalZ), math.pi / 2)
					end
					for _, bx in { -64, -90, -116, -142 } do
						local b = one("Naval", "boat-row-small", 6, bx + 8, 0.3, sd * canalZ)
						rotateAround(b, Vector3.new(bx + 8, 0, sd * canalZ), math.pi / 2)
					end
					rowOf("Naval", "crate", 2, -60, -176, 20, sd * (canalZ + 3.4))
				end
			end
		elseif key == "hanse" then
			-- 한자 항구: 부두의 하역 기중기와 곡물·모직 더미
			for _, z in { 30, -30, 58, -58 } do
				if lvl >= 2 or math.abs(z) < 40 then
					one("Naval", "mast", 16, 58, 2, z, true)
					one("Naval", "pulley-crate", 4.6, 58, 12, z)
					one("Naval", "cargo-pile-a", 4.5, 46, 2, z + 3)
					one("Naval", "cargo-pile-b", 4.5, 36, 2, z - 3)
				end
			end
			rowOf("Cargo", "barrel", 2.4, 30, 22, 4, 36)
			rowOf("Cargo", "textiles-stack-large", 2.6, -100, -180, 24, 7.4)
		elseif key == "nordic" then
			rowOf("Terrain", "log-stack", 3, -100, -180, 18, 7.2)
			rowOf("Cargo", "food-barrel-fish", 2.6, -108, -180, 22, -7.2)
			rowOf("Terrain", "tree-pinedefaulta", 9, -100, -182, 24, 11)
			for x = -110, -170, -30 do
				one("Town", "fence_rails", 4, x, 0, -9)
				one("Cargo", "fish-large", 2, x, 3.4, -9)
			end
		elseif key == "ottoman" then
			-- 바자르: 천막 가판, 카펫·향신료 자루, 분수
			rowOf("Terrain", "tent-detailedopen", 9, -104, -180, 30, 9.5)
			rowOf("Cargo", "textiles-stack-large-colored", 2.6, -100, -180, 20, -7.4)
			rowOf("Cargo", "bag", 2.2, -108, -180, 16, 7.4)
			one("Town", "fountain-round", 9, -122, 0, 0)
			if lvl >= 3 then
				for _, z in { -30, 30 } do
					one("Castle", "tower-hexagon-base", 7, -150, 0, z, true)
					one("Castle", "tower-hexagon-mid", 7, -150, 6, z, true)
					one("Castle", "tower-hexagon-top", 7, -150, 12, z, true)
				end
			end
		elseif key == "swahili" then
			-- 다우선·그물·코코넛, 산호석 마을 우물
			rowOf("Naval", "palm-detailed-straight", 11, -100, -182, 16, 9.5)
			rowOf("Naval", "palm-detailed-straight", 11, -100, -182, 16, -9.5)
			rowOf("Cargo", "coconut", 2, -104, -180, 12, 7.4)
			rowOf("Cargo", "food-basket-a-berries", 2.4, -108, -180, 22, -7.4)
			one("Town", "village-well", 6, -110, 0, 8)
			for _, bx in { 24, 34 } do
				one("Naval", "boat-sail-a", 12, bx, 0.6, 30 + (bx - 24) * 3)
			end
		elseif key == "malabar" then
			-- 후추 자루·카누·초록 가판, 빽빽한 야자
			rowOf("Naval", "palm-detailed-straight", 12, -100, -182, 12, 9.5)
			rowOf("Naval", "palm-detailed-straight", 12, -100, -182, 12, -9.5)
			rowOf("Cargo", "bag", 2.4, -100, -180, 14, 7.4)
			rowOf("Cargo", "pepper-mill", 2.2, -108, -180, 24, -7.4)
			one("Town", "stall-green", 6.5, -100, 0, 10)
			one("Town", "stall-green", 6.5, -130, 0, -10)
			one("Terrain", "canoe", 8, 40, 0.5, 20)
			one("Terrain", "canoe", 8, 52, 0.5, -22)
		elseif key == "japan" then
			-- 도리이식 문, 석등, 울타리, 술통
			one("Terrain", "gate-overhang", 12, -60, 0, 0)
			for _, x in { -100, -130, -160 } do
				lantern(folder, Vector3.new(x, 0, 4.6), 3)
				lantern(folder, Vector3.new(x, 0, -4.6), 3)
			end
			rowOf("Town", "fence_straight", 6, -100, -180, 24, 8.4)
			rowOf("Cargo", "barrel", 2.4, -108, -180, 20, -7.4)
			rowOf("Terrain", "tree-pinedefaulta", 9, -100, -182, 22, 11)
		elseif key == "china" then
			-- 패루 문, 등롱, 붉은 가판, 소나무
			one("Terrain", "gate-overhang", 12, -60, 0, 0)
			for _, x in { -100, -130, -160 } do
				lantern(folder, Vector3.new(x, 0, 4.6), 3)
				lantern(folder, Vector3.new(x, 0, -4.6), 3)
			end
			rowOf("Town", "stall-red", 7, -100, -180, 24, 9)
			rowOf("Cargo", "barrel", 2.4, -108, -180, 20, -7.4)
			rowOf("Terrain", "tree-pinedefaulta", 9, -100, -182, 22, 11)
		elseif key == "seasia" then
			-- 수상가옥풍 말뚝, 쪽배, 야자, 향신료 자루
			rowOf("Terrain", "wood-support", 5, -100, -180, 26, 9)
			rowOf("Cargo", "bag", 2.2, -108, -180, 18, -7.4)
			rowOf("Naval", "palm-detailed-straight", 11, -100, -182, 24, 12)
			one("Town", "village-well", 6, -120, 0, 8)
		elseif key == "pacific" then
			-- 해변 마을: 야자 숲, 통나무 더미, 천막
			rowOf("Naval", "palm-detailed-straight", 12, -90, -190, 20, 10)
			rowOf("Terrain", "log-stack", 4, -110, -170, 30, -9)
			rowOf("Terrain", "tent-detailedopen", 9, -100, -160, 40, 12)
		elseif key == "wafrica" then
			-- 시장 천막, 곡식자루, 큰 나무 그늘
			rowOf("Terrain", "tent-detailedopen", 9, -100, -170, 30, 9)
			rowOf("Cargo", "bag", 2.2, -108, -170, 18, -7.4)
			rowOf("Terrain", "crops-cornstagec", 5, -112, -182, 20, -11)
			rowOf("Town", "tree_large", 14, -100, -182, 40, 14)
		elseif key == "creole" then
			-- 파스텔 광장: 분수, 야자, 수레, 통
			one("Town", "fountain-round", 10, -100, 0, 0)
			rowOf("Naval", "palm-detailed-straight", 11, -100, -182, 22, 10)
			rowOf("Town", "cart", 5, -104, -180, 30, -8)
			rowOf("Cargo", "barrel", 2.4, -108, -180, 22, 7.4)
		elseif key == "colonial" then
			-- 광장 분수, 옥수수밭·호박, 수레와 통
			one("Town", "fountain-round", 10, -100, 0, 0)
			rowOf("Terrain", "crops-cornstagec", 5, -112, -182, 18, 10)
			rowOf("Terrain", "crop-pumpkin", 2.6, -112, -182, 18, -10)
			rowOf("Town", "cart", 5, -104, -180, 28, 7.6)
			rowOf("Cargo", "barrel", 2.4, -108, -180, 22, -7.4)
			rowOf("Naval", "palm-detailed-straight", 11, -100, -182, 26, -12)
		end
		-- [유럽 국가별 생활 구역] 같은 문화권이어도 포르투갈·스페인, 각 북유럽 국가의 골목 표정은 다르다.
		-- 기존 주거·장터 구획 바깥(-54~-80, ±112)에 작은 구성만 배치해 동선을 지킨다.
		if countryPlan and lvl >= 2 and key ~= "ottoman" then
			if nation == "portugal" or nation == "madeira" or nation == "azores" then
				house(folder, Vector3.new(-54, 0, -114), 13, 12, 2, style, rng, C(238, 228, 210))
				one("Town", "fountain-square", 8, -80, 0, -116, true)
				if lvl >= 4 then one("Terrain", "column", 10, -73, 0, -99) end
			elseif nation == "spain" or nation == "canary" or nation == "mallorca" then
				one("Town", "church", 19, -54, 0, -112, true)
				if lvl >= 3 then one("Town", "bell-tower", 18, -77, 0, -112, true) end
				if lvl >= 4 then one("Castle", "wall", 16, -55, 0, -132, true) end
			elseif nation == "netherlands" then
				house(folder, Vector3.new(-52, 0, -114), 12, 11, 3, style, rng, C(150, 70, 54))
				if lvl >= 3 then house(folder, Vector3.new(-74, 0, -114), 12, 11, 3, style, rng, C(190, 130, 85)) end
			elseif nation == "france" or nation == "corsica" then
				one("Town", "fountain-round", 8, -58, 0, -114, true)
				for _, z in { -125, -101 } do one("Terrain", "tree-oak", 10, -78, 0, z) end
				if lvl >= 4 then one("Town", "bell-tower", 19, -54, 0, -132, true) end
			elseif nation == "england" or nation == "scotland" or nation == "ireland" then
				house(folder, Vector3.new(-54, 0, -114), 14, 12, 2, style, rng, C(170, 160, 142))
				if lvl >= 3 then one("Castle", "gate", 18, -78, 0, -114, true) end
			elseif nation == "germany" or nation == "poland" or nation == "prussia" or nation == "livonia" or nation == "estonia" or nation == "gotland" then
				house(folder, Vector3.new(-54, 0, -114), 13, 13, 3, style, rng, C(158, 62, 48))
				if lvl >= 3 then one("Cargo", "textiles-stack-large", 4, -78, 0, -114) end
				if lvl >= 4 then one("Town", "windmill", 18, -78, 0, -130, true) end
			elseif nation == "norway" or nation == "sweden" or nation == "denmark" or nation == "finland" then
				house(folder, Vector3.new(-54, 0, -114), 13, 12, 2, style, rng, C(172, 61, 49))
				if lvl >= 3 then house(folder, Vector3.new(-76, 0, -114), 13, 12, 2, style, rng, C(214, 183, 86)) end
				if lvl >= 4 then one("Town", "fence_rails", 8, -58, 0, -133) end
			elseif nation == "italy" or nation == "venice" or nation == "tuscany" or nation == "naples" or nation == "sicily" or nation == "sardinia" or nation == "ragusa" or nation == "papal" or nation == "dalmatia" or nation == "austria" then
				one("Town", "fountain-round", 8, -54, 0, -114, true)
				if lvl >= 3 then
					for _, x in { -70, -78, -86 } do one("Terrain", "column", 9, x, 0, -116) end
				end
			elseif nation == "malta" then
				one("Castle", "fortress", 23, -54, 0, -114, true)
			end
		end
		-- 지역을 대표하는 건축물 (발전도 2단계부터 선다): 성당 종탑, 첨탑, 사원탑, 신사 등
		if lvl >= 2 then
			local lx, lz = -84, -44
			if CHURCH_KEYS[key] then
				one("Town", "church", 16, lx, 0, lz, true)
				one("Town", "bell-tower", 13, lx - 14, 0, lz, true)
				if key == "italy" and lvl >= 3 then
					one("Terrain", "greek-ruins-a", 10, lx - 36, 0, lz)
					one("Terrain", "greek-statue", 6, lx - 50, 0, lz)
				elseif (key == "brick" or key == "hanse" or key == "nordic") and lvl >= 3 then
					one("Town", "windmill", 14, lx - 40, 0, lz, true)
				end
			elseif key == "ottoman" then
				-- 미나레: 육각 탑을 쌓아 올린다 (높아질수록 한 층 더)
				local parts = { "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-mid", "tower-hexagon-top" }
				if lvl >= 4 then table.insert(parts, 3, "tower-hexagon-mid") end
				for i, nm in parts do
					one("Castle", nm, 7, lx, (i - 1) * 6, lz, true)
				end
				one("Castle", "tower-hexagon-roof", 7, lx, #parts * 6, lz)
				if lvl >= 3 then
					one("Terrain", "egypt-obelisk", 12, lx - 24, 0, lz)
				end
			elseif key == "japan" then
				one("Town", "temple-tower", 14, lx, 0, lz, true)
				one("Town", "eastasia-bell", 5, lx - 14, 0, lz)
				if lvl >= 4 then
					one("Terrain", "gate-overhang", 12, lx - 26, 0, lz)
				end
			elseif key == "malabar" then
				one("Town", "temple-tower", 15, lx, 0, lz, true)
				if lvl >= 4 then
					one("Town", "fountain-square", 9, lx - 18, 0, lz)
				end
			elseif key == "swahili" then
				one("Town", "temple-stone", 13, lx, 0, lz, true)
				if lvl >= 4 then
					one("Terrain", "egypt-column", 8, lx - 14, 0, lz)
				end
			end
		end
		-- ===== 구역 배치: 발전도와 생산품에 따라 항구마다 다르게 선다 =====
		local lay = zoneLayout(info.portId, lvl, info.hasShipyard, info.sim and info.sim.buildings)
		-- [항만 필지 경계] 각 필지의 좌표·용도를 장면에 공개하고 승인된 실물 경계 기둥으로 구분한다.
		-- 경계 자산은 비충돌 처리해 어항·조선소 보행/입출항 루트를 막지 않는다.
		local plotCount = 0
		local touch = game:GetService("UserInputService").TouchEnabled
		for _, plot in lay.plots do
			if plot.active then
				plotCount += 1
				folder:SetAttribute("HarborPlot_" .. plot.id, ("%d,%d,%d,%d"):format(plot.x, plot.z, plot.halfX, plot.halfZ))
				local corners = if touch or plot.id == "shipyard" or plot.id == "quay" then 2 else 4
				for i = 1, corners do
					-- 조선소 경계는 물속이 아닌 육지 쪽 모서리만, 접안구역은 항로 부표만 쓴다.
					local cx = if plot.id == "quay" then plot.x + plot.halfX
						elseif plot.id == "shipyard" then plot.x - plot.halfX
						else plot.x + (if i % 2 == 0 then plot.halfX else -plot.halfX)
					local cz = plot.z + (if i <= 2 then -plot.halfZ else plot.halfZ)
					if corners == 2 then cz = plot.z + (if i == 1 then -plot.halfZ else plot.halfZ) end
					local marker = importedModel(folder,
						if plot.id == "quay" then "Naval" else "Town",
						if plot.id == "quay" then "buoy" else "fence_post",
						Vector3.new(cx, if plot.id == "quay" then 0.8 else 0, cz),
						if plot.id == "quay" then 2.8 else 3.1, false)
					if marker then
						marker.Name = "HarborPlot_" .. plot.id .. "_Boundary_" .. i
						marker:SetAttribute("HarborPlot", plot.id)
						marker:SetAttribute("PortId", info.portId)
						marker:SetAttribute("BuildPlotId", info.portId .. ":harbor:" .. plot.id)
						marker:SetAttribute("BuildType", plot.id)
						marker:SetAttribute("BuildPhase", 4)
						marker:SetAttribute("BuildState", "complete")
						marker:SetAttribute("BuildTier", lvl)
						marker:SetAttribute("BuildAuthority", "VISUAL_ONLY")
						marker:SetAttribute("PlotCenterX", plot.x)
						marker:SetAttribute("PlotCenterZ", plot.z)
						marker:SetAttribute("PlotHalfWidth", plot.halfX)
						marker:SetAttribute("PlotHalfDepth", plot.halfZ)
						if i == 1 then
							local anchor = marker:FindFirstChildWhichIsA("BasePart", true)
							if anchor then sign(folder, anchor, plot.label, C(237, 215, 157), 3, true) end
						end
					end
				end
			end
		end
		folder:SetAttribute("HarborPlotCount", plotCount)
		folder:SetAttribute("HarborPlotOwnership", "VISUAL_ONLY")
		-- [초대형 실경작지] 방목지 서쪽의 별도 농지 320x220에 고랑·작물을 펼친다.
		-- 모바일에서 한 필지 최대 6x7, PC 최대 9x10 포기만 사용해 기존 메시 부하를 넘기지 않는다.
		-- 항구 지역 생산품에 옥수수가 있을 때만 옥수수 작물을 배치한다. 생산·재고 계산은 읽기 전용이다.
		if lay.farm then
			local farmland = if info.sim and info.sim.buildings then info.sim.buildings.farm or 0 else lvl * 4
			local rural = PortBuildings.RuralPlots
			local touch = game:GetService("UserInputService").TouchEnabled
			local rows = math.clamp(math.floor(4 + math.sqrt(math.max(0, farmland)) / 3), 4,
				if touch then rural.maxCropRowsTouch else rural.maxCropRowsDesktop)
			local columns = if touch then rural.cropColumnsTouch else rural.cropColumnsDesktop
			local produced = (PortData.Ports[info.portId] and PortData.Ports[info.portId].produces) or {}
			local maize = table.find(produced, "maize") ~= nil
			for i = 1, lay.pens do
				local c = penAt(i, lay.pens)
				local center = c + Vector3.new(rural.cropOffsetX, 0, 0)
				local soil = part(folder, Vector3.new(rural.cropWidth, 0.14, rural.cropDepth),
					CFrame.new(center.X, 0.21, center.Z), C(105, 84, 57), Enum.Material.Ground)
				soil.Name = "GrandFarmTract"
				soil.CanCollide = false
				soil.CanQuery = false
				soil:SetAttribute("BuildPlotId", info.portId .. ":farmland:" .. i)
				soil:SetAttribute("BuildType", "farm")
				soil:SetAttribute("BuildAuthority", "VISUAL_ONLY")
				soil:SetAttribute("PlotHalfWidth", rural.cropWidth / 2)
				soil:SetAttribute("PlotHalfDepth", rural.cropDepth / 2)
				soil:SetAttribute("EconomicFarmCount", tonumber(farmland) or -1)
				-- 길게 뻗은 관개 수로가 넓은 경작지의 경계를 한눈에 구분해 준다.
				local water = part(folder, Vector3.new(rural.cropWidth - 12, 0.12, 5),
					CFrame.new(center.X, 0.30, center.Z - rural.cropDepth / 2 + 8), C(69, 131, 153), Enum.Material.Glass)
				water.Name = "FarmIrrigationChannel"
				water.CanCollide = false
				water.CanQuery = false
				for rz = 1, rows do
					local z = center.Z + (rz - (rows + 1) / 2) * (rural.cropDepth - 38) / rows
					local furrow = part(folder, Vector3.new(rural.cropWidth - 18, 0.17, 5.5),
						CFrame.new(center.X, 0.35, z), C(88, 62, 40), Enum.Material.Ground)
					furrow.Name = "FarmFurrow"
					furrow.CanCollide = false
					furrow.CanQuery = false
					for k = 1, columns do
						local x = center.X + (k - (columns + 1) / 2) * (rural.cropWidth - 54) / (columns - 1)
						local crop = if maize then "crops-cornstagec"
							elseif (k + rz) % 3 == 0 then "crops-wheatstageb" else "crops-wheatstagea"
						one("Terrain", crop, 5.5, x, 0, z)
					end
				end
			end
		end
		-- 상업구역(큰길 안쪽): 수레와 장터. 생산품이 많은 무역 항구일수록 가판이 늘어난다.
		if lvl >= 2 then
			one("Town", "cart", 5, -118, 0, 11)
		end
		local shops = math.min(lvl - 1, if lay.trader then 4 else 2)
		for i = 1, shops do
			local x = -104 - 15 * i
			local z = if i % 2 == 0 then -14 else 14
			one("Town", if i % 2 == 0 then "stall-red" else "stall-green", 6.5, x, 0, z)
			local good = made[(i % math.max(1, #made)) + 1] or "cheese"
			local mesh = GOOD_MESH[good]
			if mesh then
				for kk = 1, 3 do
					importedModel(folder, mesh[1], mesh[2], Vector3.new(x + (kk - 2) * 1.8, 2.5, z), goodSize(good, 1.8), false, mesh[3])
				end
			end
		end
		-- 종교구역: 성당 뒤 묘지, 사원·신사의 제단
		if lvl >= 3 then
			if CHURCH_KEYS[key] then
				one("Terrain", "crypt-large", 9, -146, 0, -44)
			elseif key == "ottoman" or key == "japan" or key == "malabar" or key == "swahili" then
				one("Terrain", "altar-stone", 5, -84, 0, -30)
			end
		end
		-- 항만구역: 어항은 건조대와 쪽배, 광산·벌목 항구는 하역장, 그 반대쪽 해안엔 포대(군사구역)
		-- [항구 필지] 북쪽 어항·바깥 자재 적치장·반대편 해안 경비구역을 명확히 나눈다.
		-- 기존 조선소(-48 남쪽)의 진입로와 겹치지 않도록 조선소 운영 시 필지 방향을 고정한다.
		-- [지역별 어항] 기존 등록된 선박 중 지역 해안 환경에 맞는 범용 소형 선체만 선택한다.
		-- 정확한 조선 통신선/정크선/다우선/곤돌라 원본이 없으므로 역사적 실선으로 오표시하지 않는다.
		local nation = port and port.country or ""
		local regionalHarbor = if nation == "korea" then "korean_tidal"
			elseif key == "japan" then "japanese_quay"
			elseif key == "china" then "chinese_quay"
			elseif key == "hanse" or key == "brick" then "hanseatic"
			elseif key == "nordic" then "cold_fishing"
			elseif key == "italy" then "lagoon_stone"
			elseif key == "ottoman" or key == "desert" then "mediterranean_bazaar"
			elseif key == "swahili" or key == "malabar" then "indian_ocean"
			elseif key == "seasia" or key == "pacific" then "tropical_inlet"
			elseif key == "wafrica" or key == "creole" or key == "colonial" then "atlantic_tropical"
			else "commercial_coast"
		folder:SetAttribute("HarborRegionLayout", regionalHarbor)
		if lay.fish then
			for x = 12, -12, -8 do
				one("Town", "fence_straight", 5, x, 0, lay.fishZ)
				one("Cargo", "fish-large", 2, x, 3, lay.fishZ)
			end
			-- [어항 생활 자산] 등록·권한 확인된 전통 어망과 부표만 기존 어업 필지에 배치한다.
			-- 승인 모델이 로드되지 않으면 배치만 생략하고 어업·경제·저장 흐름은 유지한다.
			local fishingNet = one("Naval", "fishing-net", 8, -11, 0, lay.fishZ + 12)
			if fishingNet then fishingNet.Name = "HarborFishingNet" end
			local netFloats = one("Naval", "net-floats", 4, 4, 0, lay.fishZ + 15)
			if netFloats then netFloats.Name = "HarborNetFloats" end
			local localBoat = if regionalHarbor == "indian_ocean" then "boat-sail-a"
				elseif regionalHarbor == "tropical_inlet" or regionalHarbor == "chinese_quay" then "boat-row-large"
				elseif regionalHarbor == "cold_fishing" or regionalHarbor == "hanseatic" then "boat-fishing-small"
				else "boat-row-small"
			local boatSize = if localBoat == "boat-sail-a" then 11 elseif localBoat == "boat-fishing-small" then 9 else 7
			for _, offset in { -9, 9 } do
				local craft = one("Naval", localBoat, boatSize, 34, 0.3, lay.fishZ + offset)
				if craft then craft.Name = "HarborFishery_" .. regionalHarbor end
			end
			if regionalHarbor == "tropical_inlet" and AssetIds["Terrain/canoe"] then
				one("Terrain", "canoe", 7, 39, 0.3, lay.fishZ + 33)
			elseif regionalHarbor == "korean_tidal" or regionalHarbor == "japanese_quay" or regionalHarbor == "chinese_quay" then
				one("Town", "fence_rails", 5, -17, 0, lay.fishZ + 14)
			end
		end
		if lay.freight and lay.timber then
			one("Terrain", "log-stack", 4, 8, 0, lay.freightZ - 8)
			one("Terrain", "log-stack", 4, 0, 0, lay.freightZ - 8)
			one("Cargo", "resource-planks", 3, 8, 0, lay.freightZ - 2)
		end
		if lay.freight and lay.mine then
			-- 광물 항구도 없는 철광석을 임의로 적치하지 않는다: 실제 지역 생산품을 골라 쓴다.
			for _, mineral in { "iron", "coal", "tin", "copper", "gold", "silver", "gems" } do
				if table.find((port and port.produces) or {}, mineral) and AssetIds["Cargo/" .. mineral] then
					one("Cargo", mineral, 3.4, 10, 0, lay.freightZ + 9)
					break
				end
			end
			one("Town", "workbench-anvil", 3.4, 2, 0, lay.freightZ + 9)
		end
		-- [지역 특산품 하역] 이 항구가 실제 생산하고 등록된 품목만 원자재 필지에 놓는다.
		-- 주류·담배·약물 시각 자산은 새로 사용하지 않는다.
		if lay.freight then
			local shown = 0
			for _, good in (port and port.produces) or {} do
				if shown >= (if touch then 1 else 3) then break end
				if good ~= "beer" and good ~= "wine" and good ~= "rum" and good ~= "sake"
					and good ~= "tobacco" and good ~= "opium" and AssetIds["Cargo/" .. good] then
					shown += 1
					local cargo = one("Cargo", good, 3.5, -12 + (shown - 1) * 9, 0, lay.freightZ + 4)
					if cargo then
						cargo.Name = "HarborRegionalCargo_" .. good
						cargo:SetAttribute("LocalProduct", good)
						cargo:SetAttribute("HarborPlot", "freight")
						cargo:SetAttribute("ShowcaseOnly", true) -- 항구 특산품 전시이며 실제 창고 재고 확정 아님
					end
				end
			end
			if regionalHarbor == "hanseatic" and lvl >= 3 then
				one("Naval", "pulley-crate", 4, 10, 0, lay.freightZ - 8)
			elseif regionalHarbor == "indian_ocean" or regionalHarbor == "tropical_inlet" then
				one("Naval", "palm-detailed-straight", 9, -15, 0, lay.freightZ - 18)
			elseif regionalHarbor == "lagoon_stone" and lvl >= 3 then
				one("Naval", "anchor", 4, 11, 0, lay.freightZ - 9)
			elseif regionalHarbor == "mediterranean_bazaar" then
				one("Naval", "detail-crate-ropes", 3, 11, 0, lay.freightZ - 9)
			end
		end
		-- [지역 필지 종사자] 실제 세계경제 직업 수가 양수일 때 기존 주민+작업 모션만 배치.
		-- 신규 고용/저장값은 만들지 않고 모바일은 최대 1명, 그 밖은 최대 2명.
		local simJobs = info.sim and info.sim.jobs
		local residents = info.sim and info.sim.residents
		local visibleWorkers = 0
		local workerLimit = if touch then 1 else 2
		for _, work in {
			{ active = lay.fish, role = "fisher", job = "fisher", label = "어항", z = lay.fishZ, kind = "fish" },
			{ active = lay.freight, role = "laborer", job = "docker", label = "원자재 하역장", z = lay.freightZ, kind = "carry" },
		} do
			if visibleWorkers >= workerLimit then break end
			if work.active and simJobs and (simJobs[work.role] or 0) > 0
				and type(residents) == "number" and residents >= 5 * (visibleWorkers + 1) then
				local at = Vector3.new(-11, 0, work.z + (if work.z > 0 then -6 else 6))
				local npc = villager(folder, at, 0, C(126, 118, 105), rng, "Rogue")
				if npc then
					visibleWorkers += 1
					npc.Name = "HarborWorker_" .. work.job
					npc:SetAttribute("Job", work.job)
					npc:SetAttribute("Workplace", work.label)
					npc:SetAttribute("HarborPlot", if work.job == "fisher" then "fishery" else "freight")
					table.insert(walkers, { model = npc, base = npc:GetPivot(), mode = "stay", kind = work.kind,
						phase = rng:NextNumber(0, 10), job = work.job,
						workKinds = { work.kind, "inspect" }, leisureKinds = { "talk", "look" } })
				end
			end
		end
		if lay.fort then
			one("Naval", "tower-watch", 12, 6, 0, lay.fortZ, true)
			if lvl >= 3 then
				for _, offset in { -9, 9 } do
					one("Naval", "cannon", 3.4, 14, 0, lay.fortZ + offset)
				end
				one("Castle", "flag-banner-long", 9, 2, 0, lay.fortZ)
			end
			if lvl >= 5 then
				one("Naval", "tower-watch", 12, 6, 0,
					lay.fortZ + (if lay.fortZ > 0 then 1 else -1) * (PortBuildings.HarborPlotBounds.defense.halfZ - 7), true)
			end
		end
	end
	-- 골목 모퉁이: 덤불·화분·통·상자 더미
	local clutter = { { "Cargo", "barrel" }, { "Naval", "crate" }, { "Naval", "cargo-pile-a" }, { "Naval", "cargo-pile-b" }, { "Cargo", "box-open" }, { "Town", "foliage_A" }, { "Town", "foliage_B" }, { "Town", "fence_post" } }
	for _, side in { 1, -1 } do
		for x = -30, -160, -9 do
			local c = clutter[rng:NextInteger(1, #clutter)]
			importedModel(folder, c[1], c[2], Vector3.new(x + rng:NextNumber(-2, 2), 0, side * (35.2 + rng:NextNumber(0, 1))), rng:NextNumber(2.2, 3.4), false)
			if rng:NextNumber() < 0.5 then
				local c2 = clutter[rng:NextInteger(1, #clutter)]
				importedModel(folder, c2[1], c2[2], Vector3.new(x + rng:NextNumber(-3, 3), 0, side * (54.2 + rng:NextNumber(0, 1))), rng:NextNumber(2.2, 3.2), false)
			end
		end
		-- 골목 가로등
		if lvl >= 3 then
			for x = -40, -150, -44 do
				lantern(folder, Vector3.new(x, 0, side * 40.8), 3)
			end
		end
	end

	-- [중앙광장 비움] 기존 동상·석주·깃발은 서쪽 기념구역/시장거리로 옮겨 문화권 자산을 유지한다.
	if lvl >= 2 then
		importedModel(folder, "Terrain", "statue-column", Vector3.new(-124, 0, 126), 12, true)
		for _, c in { Vector3.new(-134, 0, 134), Vector3.new(-114, 0, 134),
			Vector3.new(-134, 0, 118), Vector3.new(-114, 0, 118) } do
			importedModel(folder, "Town", "pillar-stone", c, 5, false)
		end
	end
	if lvl >= 3 then
		for _, z in { -32, 32 } do
			for _, x in { -108, -128, -148, -168 } do
				importedModel(folder, "Castle", "flag-banner-short", Vector3.new(x, 0, z), 7, false)
			end
		end
	end
	local extraStalls = { Vector3.new(-44, 0, 13), Vector3.new(-44, 0, -13), Vector3.new(-70, 0, 13), Vector3.new(-70, 0, -13), Vector3.new(-94, 0, -13), Vector3.new(-94, 0, 13) }
	local stallMax = if lvl <= 1 then 2 elseif lvl == 2 then 4 else #extraStalls
	if info.sim and info.sim.buildings then
		stallMax = math.clamp(math.floor(1 + math.sqrt(math.max(0, info.sim.buildings.market or 0))), 1, #extraStalls)
	end
	table.clear(stallSpots)
	for i, spot in extraStalls do
		if i > stallMax then break end
		table.insert(stallSpots, spot)
		importedModel(folder, "Town", if i % 2 == 0 then "stall-red" else "stall-green", spot, 6.5, false)
		for k = 1, 4 do
			local good = made[(i + k) % math.max(1, #made) + 1] or "cheese"
			local mesh = GOOD_MESH[good]
			importedModel(folder, mesh[1], mesh[2], spot + Vector3.new((k - 2.5) * 1.7, 2.5, 0), goodSize(good, 1.8), false, mesh[3])
		end
	end

	-- 3) 항구별 항만 단계: 실물 메시 잔교·정박선·하역시설을 발전도/실제 투자량에 맞춰 성장시킨다.
	-- 신규 기본 도형 외형은 만들지 않고, 둘째 잔교의 투명 보행 충돌체만 기존대로 유지한다.
	local growth = PortBuildings.harborVisual(lvl, info.sim and info.sim.buildings)
	local touch = game:GetService("UserInputService").TouchEnabled
	local visibleBoats = if touch then math.min(growth.boats, 5) else growth.boats
	local visibleCargo = if touch then math.min(growth.cargo, 6) else growth.cargo
	if growth.sidePier then
		local pierEnd = 22 + growth.pierLength
		local pier = part(folder, Vector3.new(growth.pierLength, 0.8, 7), CFrame.new(22 + growth.pierLength * 0.5, 1.6, 46),
			Color3.fromRGB(150, 110, 70), Enum.Material.WoodPlanks)
		pier.CanCollide = true
		pier.Transparency = 1
		for x = 30, pierEnd - 4, 16 do
			importedModel(folder, "Naval", "structure-platform-dock-small", Vector3.new(x, 0.8, 46), 14, false)
		end
	end
	-- 기존 Kenney 화물 메시만 사용한다. 내용이 불명확한 병 상자는 제외한다.
	local dockCargo = {
		{ "Naval", "crate" }, { "Cargo", "barrel" }, { "Naval", "cargo-pile-a" },
		{ "Naval", "cargo-pile-b" }, { "Naval", "chest" },
		{ "Naval", "detail-crate-small" }, { "Naval", "detail-crate-ropes" },
	}
	if growth.sidePier then
		for i = 0, visibleCargo - 1 do
			local c = dockCargo[i % #dockCargo + 1]
			importedModel(folder, c[1], c[2], Vector3.new(26 + i * 4.2, 2, 46 + (if i % 2 == 0 then 1.6 else -1.6)), 2.6, false)
		end
	end
	local mainCargo = math.min(5, math.max(1, math.floor(visibleCargo / 2)))
	for i = 0, mainCargo - 1 do
		local c = dockCargo[(i + 2) % #dockCargo + 1]
		importedModel(folder, c[1], c[2], Vector3.new(26 + i * 12, 2, if i % 2 == 0 then 4.2 else -4.2), 2.6, false)
	end
	-- 3단계부터 하역 도르래, 2단계부터 항로 신호. 모두 실제 승인된 완제품.
	for i = 1, math.min(growth.hoists, if touch then 2 else 3) do
		importedModel(folder, "Naval", "pulley-crate",
			Vector3.new(52 + (i - 1) * 18, 2, 46 + (if i % 2 == 0 then -2 else 2)), 4.6, false)
	end
	if growth.signals > 0 then
		local markerX = 22 + growth.pierLength - 5
		importedModel(folder, "Naval", "mast", Vector3.new(markerX, 2, 44), 12, false)
		importedModel(folder, "Naval", "flag-pennant", Vector3.new(markerX, 14, 44), 3, false)
		for i = 2, growth.signals do
			importedModel(folder, "Naval", "flag-high-pennant", Vector3.new(25 + i * 16, 0, 57), 8, false)
		end
	end
	local boats = {
		{ "boat-sail-a", 14 }, { "boat-sail-b", 14 }, { "boat-fishing-small", 10 },
		{ "boat-row-large", 8 }, { "boat-row-small", 6 },
		{ "boat-fishing-small", 10 }, { "boat-sail-b", 13 }, { "boat-sail-a", 14 },
	}
	local spots = {
		{ 40, 60 }, { 70, 64 }, { 100, 78 }, { 52, -64 },
		{ 86, -70 }, { 120, -92 }, { 130, 100 }, { 38, 34 },
	}
	for i, spot in ipairs(spots) do
		if i <= visibleBoats then
			local b = boats[i]
			local m = importedModel(folder, "Naval", b[1], Vector3.new(spot[1], 0.8, spot[2]), b[2], false)
			if m then rotateAround(m, Vector3.new(spot[1], 0, spot[2]), rng:NextNumber(-0.5, 0.5)) end
		end
	end

	-- 4) 생활감 소품: 담장, 수레, 통, 횃불
	for _, side in { 1, -1 } do
		for x = -30, -150, -24 do
			importedModel(folder, "Town", "cart", Vector3.new(x - 6, 0, side * 36.2), 5, false)
			importedModel(folder, "Town", "bench_A", Vector3.new(x - 14, 0, side * 41.6), 3.8, false)
		end
		for x = -20, -160, -10 do
			importedModel(folder, "Town", "fence_straight", Vector3.new(x, 0, side * 130), 8, false)
		end
	end
	importedModel(folder, "Terrain", "campfire-logs", Vector3.new(-80, 0, 30.5), 4, false)

	-- 5) 움직임: 일하는 주민(직업별 모션)과 골목을 오가는 주민
	spawnJobs(folder, info, rng, lvl, walkers, key)
	local wanderers = ({ 4, 6, 8, 10, 12 })[lvl]
	if info.sim and type(info.sim.residents) == "number" then
		wanderers = math.clamp(math.floor(info.sim.residents / 6), 0, 14) -- 역병·기근 후 빈 거리도 실제로 표시한다
	end
	for i = 1, wanderers do
		local sideZ = ({ 38, -38, 57, -57, 73, -73, 87, -87 })[(i - 1) % 8 + 1]
		local v = villager(folder, Vector3.new(rng:NextNumber(-140, -30), 0, sideZ + rng:NextNumber(-0.8, 0.8)), 0, Color3.fromRGB(rng:NextInteger(60, 200), rng:NextInteger(60, 160), rng:NextInteger(50, 150)), rng)
		if v then
			local p = v:GetPivot().Position
			v:PivotTo(CFrame.lookAt(p, p + Vector3.new(if i % 2 == 0 then 1 else -1, 0, 0)))
			table.insert(walkers, { model = v, base = v:GetPivot(), len = rng:NextNumber(14, 30), speed = rng:NextNumber(1.4, 2.4), phase = rng:NextNumber(0, 10) })
		end
	end

	-- 6) 항구마다 랜드마크 (왕궁 뒤)
	local lx = -186
	if lvl < 3 then
		-- 작은 항구: 큰 랜드마크 대신 소박한 표지
	elseif key == "med" or key == "iberia" or key == "italy" then
		for z = -24, 24, 8 do
			importedModel(folder, "Terrain", "column", Vector3.new(lx, 0, z), 12, true)
		end
		importedModel(folder, "Terrain", "statue-head", Vector3.new(lx - 10, 0, 0), 14, true)
	elseif key == "ottoman" then
		-- 모스크: 중앙 돔 건물과 미나레트 두 기
		importedModel(folder, "Castle", "tower-square-base", Vector3.new(lx, 0, 0), 28, true)
		importedModel(folder, "Naval", "tower-complete-small", Vector3.new(lx + 4, 0, 0), 22, true)
		for _, z in { -26, 26 } do
			importedModel(folder, "Castle", "tower-hexagon-base", Vector3.new(lx, 0, z), 7, true)
			importedModel(folder, "Castle", "tower-hexagon-mid", Vector3.new(lx, 6, z), 7, true)
			importedModel(folder, "Castle", "tower-hexagon-mid", Vector3.new(lx, 12, z), 7, true)
			importedModel(folder, "Castle", "tower-hexagon-roof", Vector3.new(lx, 18, z), 7, true)
		end
	elseif key == "swahili" then
		importedModel(folder, "Terrain", "pillar-obelisk", Vector3.new(lx, 0, 0), 22, true)
		for _, z in { -18, 18 } do
			importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(lx + 8, 0, z), 15, false)
		end
		importedModel(folder, "Terrain", "tent-detailedopen", Vector3.new(lx + 14, 0, 0), 12, false)
	elseif key == "malabar" then
		importedModel(folder, "Terrain", "statue-ring", Vector3.new(lx, 0, 0), 16, true)
		for _, z in { -22, -11, 11, 22 } do
			importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(lx + 8, 0, z), 15, false)
		end
	elseif key == "japan" then
		-- 성곽 천수각과 해자 쪽 망루
		importedModel(folder, "Naval", "tower-complete-large", Vector3.new(lx, 0, 0), 30, true)
		for _, z in { -26, 26 } do
			importedModel(folder, "Naval", "tower-complete-small", Vector3.new(lx, 0, z), 14, true)
			importedModel(folder, "Castle", "flag-banner-long", Vector3.new(lx + 10, 0, z / 2), 10, false)
		end
		importedModel(folder, "Terrain", "gate-overhang", Vector3.new(lx + 18, 0, 0), 14, false)
	elseif key == "china" then
		-- 탑과 패루
		importedModel(folder, "Town", "temple-tower", Vector3.new(lx, 0, 0), 30, true)
		for _, z in { -18, 18 } do
			importedModel(folder, "Town", "temple-stone", Vector3.new(lx + 4, 0, z), 12, true)
		end
		importedModel(folder, "Terrain", "gate-overhang", Vector3.new(lx + 18, 0, 0), 14, false)
	elseif key == "seasia" then
		importedModel(folder, "Town", "temple-tower", Vector3.new(lx, 0, 0), 26, true)
		for _, z in { -16, 16 } do
			importedModel(folder, "Terrain", "statue-ring", Vector3.new(lx + 8, 0, z), 10, true)
		end
		for _, z in { -24, -8, 8, 24 } do
			importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(lx + 14, 0, z), 13, false)
		end
	elseif key == "pacific" then
		for _, z in { -14, 0, 14 } do
			importedModel(folder, "Terrain", "statue-ring", Vector3.new(lx, 0, z), 16, true)
		end
		for _, z in { -24, -12, 12, 24 } do
			importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(lx + 10, 0, z), 15, false)
		end
	elseif key == "wafrica" then
		-- 대서양 노예무역·교역 요새풍
		importedModel(folder, "Castle", "fortress", Vector3.new(lx, 0, 0), 30, true)
		importedModel(folder, "Terrain", "pillar-obelisk", Vector3.new(lx + 14, 0, 12), 20, true)
		importedModel(folder, "Terrain", "tent-detailedopen", Vector3.new(lx + 14, 0, -12), 14, false)
	elseif key == "creole" then
		importedModel(folder, "Town", "church", Vector3.new(lx, 0, 0), 22, true)
		importedModel(folder, "Naval", "tower-complete-small", Vector3.new(lx + 14, 0, 0), 16, true)
		for _, z in { -16, 16 } do
			importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(lx + 4, 0, z), 14, false)
		end
	elseif key == "colonial" then
		-- 성당 종탑
		importedModel(folder, "Castle", "tower-square-base", Vector3.new(lx, 0, 0), 24, true)
		importedModel(folder, "Naval", "tower-complete-small", Vector3.new(lx + 3, 0, 0), 20, true)
		importedModel(folder, "Castle", "flag-banner-long", Vector3.new(lx + 12, 0, 12), 10, false)
	elseif key == "desert" then
		importedModel(folder, "Terrain", "pillar-obelisk", Vector3.new(lx, 0, 0), 34, true)
		for _, z in { -22, 22 } do
			importedModel(folder, "Terrain", "statue-obelisk", Vector3.new(lx, 0, z), 18, true)
		end
		importedModel(folder, "Terrain", "tent-detailedopen", Vector3.new(lx + 12, 0, 12), 14, false)
		importedModel(folder, "Terrain", "tent-detailedopen", Vector3.new(lx + 12, 0, -12), 14, false)
	elseif key == "tropic" then
		importedModel(folder, "Terrain", "statue-ring", Vector3.new(lx, 0, 0), 18, true)
		for _, z in { -20, -10, 10, 20 } do
			importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(lx + 8, 0, z), 14, false)
		end
		importedModel(folder, "Terrain", "tent-detailedopen", Vector3.new(lx + 14, 0, 0), 14, false)
	else
		importedModel(folder, "Naval", "tower-complete-large", Vector3.new(lx, 0, 0), 32, true)
		for _, z in { -24, 24 } do
			importedModel(folder, "Naval", "tower-complete-small", Vector3.new(lx, 0, z), 16, true)
			importedModel(folder, "Castle", "flag-banner-long", Vector3.new(lx + 10, 0, z / 2), 10, false)
		end
	end

	-- [지역 상징물 이전] 중앙광장은 비우고 서쪽 문화구역으로 상징탑을 옮긴다.
	do
		local ax, az = -160, -128
		local function big(kind, asset, size) return importedModel(folder, kind, asset, Vector3.new(ax, 0, az), size, true) end
		if key == "med" or key == "iberia" or key == "italy" then
			big("Terrain", "statue-column", 20)
		elseif key == "ottoman" then
			for k, part_ in { "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-mid", "tower-hexagon-roof" } do
				importedModel(folder, "Castle", part_, Vector3.new(ax, (k - 1) * 8, az), 9, true)
			end
		elseif key == "swahili" then
			big("Terrain", "pillar-obelisk", 24)
		elseif key == "malabar" or key == "tropic" or key == "pacific" or key == "seasia" then
			big("Terrain", "statue-ring", 20)
		elseif key == "wafrica" then
			big("Terrain", "pillar-obelisk", 22)
		elseif key == "creole" then
			big("Terrain", "statue-column", 18)
		elseif key == "japan" or key == "china" or key == "seasia" then
			big("Town", "temple-tower", 24)
		elseif key == "desert" then
			big("Terrain", "egypt-obelisk", 28)
		else
			big("Town", "bell-tower", 24)
		end
	end

	-- 7) 외곽: 도시의 실제 발전 구획 바깥으로 성벽과 숲을 이동한다.
	-- 예전 -204, ±150 고정 성벽이 확장 도로·주택을 가로막던 문제를 직접 수정한다.
	local wallStep = if lvl >= 4 then 20 else 16
	local WZ = math.ceil((152 + pairsN * laneL + 55) / wallStep) * wallStep
	local WX = math.floor(math.min(X_END - 58, if isRoyalCity then -615 else -470) / wallStep) * wallStep
	local walled = lvl >= 3
	local wallSize = wallStep + 0.4
	for _, side in { 1, -1 } do
		if walled then
			local x = -22
			while x > WX do
				local m = importedModel(folder, "Castle", "wall", Vector3.new(x, 0, side * WZ), wallSize, true)
				if not m then importedModel(folder, "Naval", "castle-wall", Vector3.new(x, 0, side * WZ), wallSize, true) end
				x -= wallStep
			end
		end
		if lvl >= 2 then
			for _, tx in { -22, -140, WX } do
				importedModel(folder, "Naval", "tower-watch", Vector3.new(tx, 0, side * WZ), 16, true)
			end
		end
	end
	if walled then
		for z = -WZ, WZ, wallStep do
			local at = Vector3.new(WX, 0, z)
			-- 목장으로 나가는 출입문은 동쪽 마을에서 오갈 수 있도록 가운데에 배치.
			local asset = if math.abs(z) <= wallStep / 2 then "wall-narrow-gate" else "wall"
			local m = importedModel(folder, "Castle", asset, at, wallSize, true)
			if not m then m = importedModel(folder, "Naval", "castle-wall", at, wallSize, true) end
			rotateAround(m, at, math.pi / 2)
		end
		importedModel(folder, "Naval", "tower-watch", Vector3.new(WX, 0, 0), 16, true)
	end
	-- 도시 안에 바위와 나무를 세우지 않는다. 자연 배경은 외곽 숲과 돌산만 남긴다.
	-- 식생/암석 수는 발전된 항구일수록 줄여 모바일 프레임을 보호한다.
	local rimRocks = if lvl >= 4 then 16 else 25
	for i = 1, rimRocks do
		local side = if i % 2 == 0 then 1 else -1
		local at = Vector3.new(rng:NextNumber(-420, -45), 0, side * rng:NextNumber(WZ + 26, WZ + 100))
		importedModel(folder, "Town", "rock-large", at, rng:NextNumber(12, 20), false)
		if i % 3 == 0 then
			importedModel(folder, "Town", "rock-small", at + Vector3.new(9, 0, 8), 7, false)
		end
	end
	local forestCount = if lvl >= 4 then 60 else 94
	local trees = if key == "japan" or cold then { "tree-high", "tree", "tree-crooked" }
		elseif palm then { "palm-detailed-straight", "tree-crooked", "tree-high" }
		else { "tree-high", "tree-crooked", "tree" }
	for i = 1, forestCount do
		local side = if i % 2 == 0 then 1 else -1
		local at = Vector3.new(rng:NextNumber(-440, -40), 0, side * rng:NextNumber(WZ + 26, WZ + 120))
		local pick = trees[rng:NextInteger(1, #trees)]
		local kind = if pick:find("palm", 1, true) then "Naval" else "Town"
		importedModel(folder, kind, pick, at, rng:NextNumber(8, 14), false)
	end
	for i = 1, (if lvl >= 4 then 9 else 14) do
		local at = Vector3.new(-1005 + rng:NextNumber(-16, 16), 0, rng:NextNumber(-WZ, WZ))
		importedModel(folder, "Town", "tree-high", at, rng:NextNumber(8, 12), false)
	end
end

-- 발전도 랜드마크: 레벨 조건을 채운 시설이 자리에 들어선다. 등록된 모델과 기존 house()만 쓴다(새 도형 금지).
local function placeLandmarks(folder, info, style, rng, onFacility, walkers)
	local lvl = sceneLevel
	local key = styleKeyOf(style)
	local year = (info.sim and info.sim.year) or info.year or 1700
	local adopted = {}
	for _, node in ipairs((info.sim and info.sim.technology and info.sim.technology.rows) or {}) do
		if node.status == "adopted" then adopted[node.id] = true end
	end
	local order = {}
	for i = 1, #LM_SITES do order[i] = i end
	local pr = seeded(info.portId .. "landmarks")
	for i = #order, 2, -1 do
		local j = pr:NextInteger(1, i)
		order[i], order[j] = order[j], order[i]
	end
	local function put(kind, asset, size, x, z, solid, yaw)
		local m = importedModel(folder, kind, asset, Vector3.new(x, 0, z), size, solid == true)
		if m and yaw then rotateAround(m, Vector3.new(x, 0, z), yaw) end
		return m
	end
	local landmarkStaff = 0
	local staffCap = if game:GetService("UserInputService").TouchEnabled then 3 else 6
	local function ring(cx, cz, hx, hz, fence)
		for k = -hx, hx, 5 do
			put("Town", fence, 5, cx + k, cz + hz, false)
			put("Town", fence, 5, cx + k, cz - hz, false)
		end
		for k = -hz + 5, hz - 5, 5 do
			put("Town", fence, 5, cx + hx, cz + k, false, math.pi / 2)
			put("Town", fence, 5, cx - hx, cz + k, false, math.pi / 2)
		end
	end
	for idx, lm in PortBuildings.Landmarks do
		local at = LM_SITES[order[idx]]
		if at and lvl >= lm.minLevel and year >= (lm.since or 0) and (not lm.tech or adopted[lm.tech]) then
			local x, z = at.X, at.Z
			local face = if z > 0 then 0 else math.pi
			local front = if z > 0 then -1 else 1
			local tint = Color3.fromRGB(226, 218, 200)
			local body
			if lm.id == "theater" then
				body = put("Terrain", "greek-amphitheater", 30, x, z, true, face)
			elseif lm.id == "exchange" then
				body = house(folder, Vector3.new(x, 0, z), 26, 18, 3, style, rng, Color3.fromRGB(214, 206, 186))
				for k = -2, 2 do put("Terrain", "column", 9, x + k * 5, z + front * 12, false) end
				put("Castle", "flag-banner-long", 10, x + 14, z + front * 11, false)
			elseif lm.id == "museum" then
				body = house(folder, Vector3.new(x, 0, z), 26, 18, 2, style, rng, tint)
				for k = -1, 1, 2 do put("Terrain", "column", 9, x + k * 6, z + front * 12, false) end
				put("Terrain", "statue-column", 12, x + 14, z + front * 12, true)
				put("Terrain", "statue-head", 8, x - 14, z + front * 12, true)
			elseif lm.id == "botanic" then
				ring(x, z, 15, 15, "fence")
				-- [식물원] 기존 식재 위치 9곳 안에서 승인된 메시 식생을 조합한다.
				local plants = {
					{ "Town", "tree_large", 9 }, { "Terrain", "tree-oak", 9 },
					{ "Terrain", "Bush_Small", 3.6 }, { "Town", "tree-crooked", 9 },
					{ "Terrain", "Grass_Small", 2.4 },
				}
				for k = 1, 9 do
					local plant = plants[(k - 1) % #plants + 1]
					put(plant[1], plant[2], plant[3], x - 11 + (k % 3) * 11, z - 11 + (k // 3) * 11, false)
				end
				put("Town", "fountain-round", 7, x, z, true)
				body = put("Terrain", "crop-pumpkin", 3, x + 4, z + 4, false)
			elseif lm.id == "observatory" then
				for k, part_ in { "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-mid", "tower-hexagon-top" } do
					body = importedModel(folder, "Castle", part_, Vector3.new(x, (k - 1) * 8, z), 10, true) or body
				end
				put("Town", "bench_A", 3.6, x + 8, z + front * 8, false)
			elseif lm.id == "academy" then
				body = house(folder, Vector3.new(x, 0, z), 28, 20, 3, style, rng, Color3.fromRGB(196, 184, 170))
				put("Town", if key == "japan" or key == "china" or key == "seasia" then "temple-stone" else "bell-tower", 20, x + 17, z, true)
				for k = -1, 1, 2 do put("Terrain", "column", 9, x + k * 7, z + front * 13, false) end
			elseif lm.id == "zoo" then
				ring(x, z, 17, 17, "fence_straight")
				local beasts = { "elephant", "llama", "horse", "donkey" }
				for k = 1, 4 do
					local m = importedModel(folder, "Animals", beasts[k], Vector3.new(x - 9 + (k % 2) * 18, 0, z - 9 + (k // 2) * 14), if beasts[k] == "elephant" then 8 else 5, false)
					if m then rotateAround(m, Vector3.new(x - 9 + (k % 2) * 18, 0, z - 9 + (k // 2) * 14), rng:NextNumber(0, math.pi * 2)) end
				end
				put("Town", "stall-red", 6, x, z + front * 19, false, face)
				body = put("Terrain", "tree-oak", 9, x, z, false)
			elseif lm.id == "ironworks" then
				body = put("Town", "watermill", 24, x, z, true, face)
				put("Town", "workbench-anvil", 3.4, x + 12, z + front * 6, false)
				put("Town", "workbench-grind", 3.4, x + 15, z + front * 6, false)
				put("Cargo", "iron-bars-stack-large", 3, x - 12, z + front * 7, false)
				for k = -1, 1 do
					importedModel(folder, "Town", "chimney", Vector3.new(x + k * 6, 15, z), 7, false)
					smokeOn(folder, Vector3.new(x + k * 6, 23, z))
				end
			end
			-- 시설마다 일하는/둘러보는 사람들
			local function npc(dx, dz, yaw, kind, mode, role, len, idle)
				local m = villager(folder, Vector3.new(x + dx, 0, z + dz), yaw, Color3.fromRGB(rng:NextInteger(70, 190), rng:NextInteger(60, 150), rng:NextInteger(40, 130)), rng, role or "Rogue")
				if not m then return end
				local w = { model = m, base = m:GetPivot(), kind = kind, mode = mode, phase = rng:NextNumber(0, 10) }
				if mode == "path" then
					w.len, w.speed, w.idleKind = len, rng:NextNumber(1.1, 1.7), idle
				end
				table.insert(walkers, w)
			end
			local toward = face + math.pi
			if lm.id == "exchange" then
				npc(-6, front * 16, toward, "talk", "stay", "Knight")
				npc(4, front * 17, face, "talk", "stay", "Rogue")
				npc(-14, front * 20, -math.pi / 2, "carry", "path", "Rogue", 28, "talk")
			elseif lm.id == "museum" or lm.id == "academy" then
				npc(-5, front * 17, toward, "look", "stay", "Mage")
				npc(-16, front * 21, -math.pi / 2, nil, "path", "Rogue", 30, "look")
			elseif lm.id == "observatory" then
				npc(8, front * 12, toward, "look", "stay", "Mage")
			elseif lm.id == "theater" then
				for k = -1, 1 do npc(k * 6, front * -4, face, "sit", "stay", "Rogue") end
			elseif lm.id == "zoo" then
				npc(0, front * 22, -math.pi / 2, "sweep", "path", "Barbarian", 16, "talk")
				npc(6, front * 24, toward, "look", "stay", "Rogue")
			elseif lm.id == "ironworks" then
				npc(10, front * 9, face, "hammer", "stay", "Barbarian")
				npc(-10, front * 9, -math.pi / 2, "carry", "path", "Barbarian", 20, "stoop")
			elseif lm.id == "botanic" then
				npc(-8, front * 8, face, "stoop", "stay", "Rogue")
				npc(-18, front * 20, -math.pi / 2, nil, "path", "Rogue", 30, "look")
			end
			-- [랜드마크 지구] 기술·연도·발전도 해금 조건은 유지한 채, 건립된 시설 주위에
			-- 고유 문화권의 보도/안뜰/수목·장식·부속 상점을 단계별로 배치한다.
			-- 각 지구는 원래 예약된 58x58 필지에만 세워져 주거/도로 충돌을 줄인다.
			if lvl >= 3 then
				local sandstone = key == "ottoman" or key == "desert" or key == "wafrica" or key == "swahili"
				local timber = key == "malabar" or key == "seasia" or key == "pacific" or key == "tropic"
				local surface = if sandstone then Enum.Material.Sandstone elseif timber then Enum.Material.WoodPlanks else Enum.Material.Cobblestone
				local tile = part(folder, Vector3.new(52, 0.16, 50), CFrame.new(x, 0.08, z),
					if sandstone then C(198, 173, 133) elseif timber then C(148, 128, 97) else C(161, 156, 145), surface)
				tile.Name = "LandmarkPrecinct_" .. lm.id
				tile.CanCollide, tile.CanQuery = false, false
				tile:SetAttribute("Culture", key)
				tile:SetAttribute("Tier", lvl)
				local economics = (info.sim and info.sim.buildings) or {}
				local grown = (economics.market or 0) >= 2 or (economics.hall or 0) >= 1 or (economics.school or 0) >= 1
				if lvl >= 4 then
					local garden = if sandstone then { "Terrain", "plant-bush" }
						elseif timber then { "Naval", "palm-detailed-straight" } else { "Town", "tree_tiny" }
					for _, dx in { -22, 22 } do
						put(garden[1], garden[2], 6.5, x + dx, z - front * 19, false)
					end
					if lm.id ~= "zoo" and lm.id ~= "botanic" then
						put("Town", "bench_A", 4, x + 18, z + front * 19, false)
					end
				end
				if lvl >= 5 and grown then
					if lm.id == "academy" or lm.id == "museum" or lm.id == "observatory" then
						put(if key == "china" or key == "japan" then "Town" else "Terrain",
							if key == "china" or key == "japan" then "eastasia-column-base" else "statue-column", 8, x - 20, z + front * 20, false)
					elseif lm.id == "exchange" or lm.id == "ironworks" then
						put("Cargo", "barrel", 2.4, x + 21, z + front * 19, false)
					else
						put("Castle", "flag-banner-short", 8, x + 20, z + front * 18, false)
					end
				end
			end
			-- 보유·실물경제에 따라 랜드마크의 업종과 활기를 시각적으로 변화시킨다.
			local stock = (info.sim and info.sim.buildings) or {}
			if lm.id == "ironworks" and (stock.workshop or 0) >= 5 then
				put("Cargo", "iron-bars-stack-large", 4, x + 14, z - front * 10, false)
			elseif lm.id == "exchange" and (stock.market or 0) >= 2 then
				put("Town", "stall-green", 6, x - 17, z - front * 14, false)
			elseif lm.id == "academy" and (stock.school or 0) >= 2 then
				put("Town", "bell-tower", 14, x - 20, z + front * 4, false)
			end
			local owned = info.builtLandmarks or {}
			if owned[lm.id] == true or (lm.id == "academy" and owned.hall == true) then
				put("Castle", "flag-banner-long", 10, x + 17, z + front * 17, false)
			end
			local adorn = body
			if typeof(body) == "Instance" and not body:IsA("BasePart") then adorn = body:FindFirstChildWhichIsA("BasePart", true) end
			if adorn then
				sign(folder, adorn, lm.name, nil, 18)
			end
			-- [준공·랜드마크 운영] 실제 해금·건축 완료된 시설에서 주민들이 순찰·안내·점검한다.
			if body and landmarkStaff < staffCap then
				landmarkStaff += 1
				local pos = Vector3.new(x + 12, 0, z + front * 16)
				local fig = villager(folder, pos, faceTo(pos, Vector3.new(x, 0, z)),
					Color3.fromRGB(137, 107, 76), rng, "Rogue")
				if fig then
					fig:SetAttribute("Job", "landmark")
					fig:SetAttribute("Workplace", lm.name)
					table.insert(walkers, { model = fig, base = fig:GetPivot(), mode = "stay", kind = "inspect",
						phase = rng:NextNumber(0, 10), job = "landmark",
						workKinds = { "inspect", "point", "wave", "salute" },
						leisureKinds = { "talk", "look", "listen" } })
				end
			end
			if lm.tab then
				prompt(folder, Vector3.new(x, 3, z + front * 14), lm.name, "들어가기", lm.tab, onFacility)
			end
		end
	end
end

-- 장면 만들기. info: { portId, portName, shipId, hasShipyard, facilities = { "bank", ... }, storyCount }
-- 돌려주는 값: { folder, spawn = 캐릭터를 둘 위치, stop = 애니메이션 정지 함수 }
function PortScene.build(info, onFacility)
	vacancyRate = info.vacancy or 0
	local old = workspace:FindFirstChild("PortScene")
	if old then
		old:Destroy()
	end
	local folder = Instance.new("Folder")
	folder.Name = "PortScene"
	-- [중앙광장 영구 예약] 시각 시설물은 외곽에, 광장 중앙에는 보행·집회만 허용한다.
	folder:SetAttribute("CentralPlazaClearRadius", CENTRAL_PLAZA_RADIUS)
	folder:SetAttribute("CentralPlazaReserved", true)
	-- [왕궁/광장/작업장] 모든 NPC가 같은 기존 애니메이션 목록을 사용하도록 먼저 초기화한다.
	local walkers = {}
	-- [지역별 건축] 기존 항구 문화권을 따르되, 로도스·파마구스타는 점령 연도 이후 오스만 양식으로 전환한다.
	-- 건축·복식에만 적용하며 교역·경제·저장 데이터는 그대로 유지한다.
	local year = if type(info.year) == "number" then info.year else 1700
	local culture = REGION[info.portId]
	if (info.portId == "rhodes" and year >= 1522)
		or (info.portId == "famagusta" and year >= 1571) then
		culture = "ottoman"
	end
	local style = if culture and STYLE[culture] then STYLE[culture] elseif MED[info.portId] then STYLE.med else STYLE.north
	local rng = seeded(info.portId)
	sceneLevel = math.clamp(math.floor(info.level or 1), 1, 5)
	-- 실물경제 시뮬의 발전 단계가 있으면 투자 단계와 평균해 마을 외형을 정한다 (인구·번영이 외형을 키운다)
	if info.sim and type(info.sim.stage) == "number" then
		sceneLevel = math.clamp(math.floor((sceneLevel + info.sim.stage) / 2 + 0.5), 1, 5)
	end
	houseTier = sceneLevel
	-- [향후 건축 시뮬] 기존 경제 건설·증축 알고리즘을 정본으로 두고, 지금은 도시 외형만 자동 갱신한다.
	folder:SetAttribute("CityBuildingMode", "AUTO_VISUAL_READ_ONLY")
	folder:SetAttribute("CityDevelopmentTier", sceneLevel)
	folder:SetAttribute("CityConstructionCanPurchase", false)
	-- [항만 단계] 장면과 항만 표지·투명 보행 경계가 같은 1~5단계 결과를 쓴다.
	local dockGrowth = PortBuildings.harborVisual(sceneLevel, info.sim and info.sim.buildings)
	folder:SetAttribute("HarborVisualTier", dockGrowth.tier)
	folder:SetAttribute("HarborVisualName", dockGrowth.name)
	folder:SetAttribute("HarborPierLength", dockGrowth.pierLength)
	folder:SetAttribute("HarborVisualBoats", math.min(dockGrowth.boats,
		if game:GetService("UserInputService").TouchEnabled then 5 else 8))
	folder:SetAttribute("HarborVisualCargo", math.min(dockGrowth.cargo,
		if game:GetService("UserInputService").TouchEnabled then 6 else 10))
	if not info.construction and info.sim and info.sim.construction and info.sim.construction.active then
		-- 실제 건설비가 지출되는 항구만 기존 건설 현장/목수 모션으로 표시한다.
		info.construction = { to = math.min(5, sceneLevel + 1) }
	end
	-- 발전 단계별 신도시 외곽 도로·왕궁 별관을 포함하는 안전 경계. 파트 수 증가 없이 바닥만 확장한다.
	local CITY_LIMIT_Z = 360 + sceneLevel * 80
	currentKey = styleKeyOf(style)
	currentYear = year
	local fac = {}
	for _, k in info.facilities or {} do
		fac[k] = true
	end

	-- 먼 땅: 잔디 질감은 어둡게 보여서, 색을 밝은 풀색 쪽으로 옮긴다
	local farGround = style.ground:Lerp(Color3.fromRGB(122, 164, 84), 0.7)
	local plate = workspace:FindFirstChild("Baseplate")
	if plate then
		plate.Color = farGround
		-- 항공 시점에서 땅 모서리가 보이지 않게 넓힌다 (바다는 x>20 이라 서쪽으로만 확장)
		plate.Size = Vector3.new(2600, plate.Size.Y, 2600)
		plate.Position = Vector3.new(-1280, plate.Position.Y, 0)
		plate.Material = Enum.Material.SmoothPlastic
	else
		-- 로블록스 기본 Baseplate가 없는 빌드: 항구 땅(서쪽)과 바다 밑바닥을 직접 만든다
		local land = part(folder, Vector3.new(2600, 4, 2600), CFrame.new(-1280, -2, 0), farGround, Enum.Material.SmoothPlastic)
		land.Name = "Ground"
		part(folder, Vector3.new(1400, 4, 1000), CFrame.new(430, -12, 0), Color3.fromRGB(176, 160, 120), Enum.Material.Sand)
	end

	-- 마을 바닥판: 땅 사이 구멍이 보이지 않게 마을 전체를 한 장으로 덮고, 발전도에 따라 흙→자갈→포석→화강암→대리석으로 바뀐다.
	do
		local lvlColor = {
			Color3.fromRGB(176, 146, 104), Color3.fromRGB(170, 158, 140), Color3.fromRGB(160, 156, 150),
			Color3.fromRGB(168, 166, 170), Color3.fromRGB(226, 222, 214),
		}
		-- 도시는 돌길, 목장·밭은 자연 토지로 명확히 분리하여 농촌을 포장도로로 덮지 않는다.
		local floor = part(folder, Vector3.new(650, 0.3, 2 * (CITY_LIMIT_Z + 14)), CFrame.new(-290, 0.02, 0),
			style.ground:Lerp(lvlColor[sceneLevel], if sceneLevel <= 1 then 0.8 else 0.65), roadMat())
		floor.Name = "TownFloor"
		floor.CanCollide = true
		floor.CanQuery = true
		-- [농촌 확장] 왕궁·주거 바닥과 겹치지 않는 서쪽 전용 지형에 목장과 경작지를 모두 수용한다.
		local rural = PortBuildings.RuralPlots
		local farmGround = part(folder, Vector3.new(rural.groundWidth, 0.3, 2 * (CITY_LIMIT_Z + 14)),
			CFrame.new(rural.groundCenterX, 0.02, 0),
			style.ground:Lerp(C(112, 143, 83), 0.55), Enum.Material.Grass)
		farmGround.Name = "RuralGround"
		farmGround.CanCollide = true
		farmGround.CanQuery = true
	end

	-- 바다(동쪽, x > 20)와 부두
	local water = part(folder, Vector3.new(1300, 1, 1000), CFrame.new(670, 0.3, 0), Color3.fromRGB(32, 118, 160), Enum.Material.Glass)
	water.Transparency = 0.28
	water.Reflectance = 0.1
	water.CanCollide = false
	-- [도시 지형] 항구마다 고정된 만·운하·삼각주·섬·해협·언덕 실루엣을 동쪽 바다에 배치한다.
	-- 도시 구조나 보행 판정은 건드리지 않고, 입체 배경 최대 8개로 모바일 부담을 제한한다.
	do
		local coastSeed = seeded(info.portId .. ":coast-form")
		local shapes = {
			venice = "lagoon", amsterdam = "canal", lisbon = "hill", porto = "hill",
			istanbul = "strait", busan = "hill", nagasaki = "hill", rio = "bay",
			havana = "bay", hong_kong = "hill", alexandria = "delta", cairo = "delta",
			rotterdam = "delta", antwerp = "river", genoa = "hill", naples = "bay",
			marseille = "bay", osaka = "river", calcutta = "delta",
		}
		local choices = if currentKey == "japan" or currentKey == "nordic" then { "hill", "bay", "river" }
			elseif currentKey == "pacific" or currentKey == "seasia" then { "lagoon", "bay", "delta" }
			elseif currentKey == "desert" or currentKey == "ottoman" then { "bay", "hill", "plain" }
			else { "plain", "river", "bay", "hill", "delta" }
		local form = shapes[info.portId] or choices[coastSeed:NextInteger(1, #choices)]
		folder:SetAttribute("CoastForm", form)
		for _, side in { -1, 1 } do
			for i = 1, 3 do
				local x = 130 + 19 * i
				local z = side * (140 + 54 * i + coastSeed:NextInteger(-8, 8))
				if form == "lagoon" or form == "delta" or form == "canal" or form == "river" then
					local island = part(folder, Vector3.new(24 + i * 7, 0.4, 15 + i * 8), CFrame.new(x, 0.89, z),
						if form == "lagoon" then style.ground else C(185, 170, 132), Enum.Material.Sand)
					island.Name = "CoastIsland"
					island.CanCollide, island.CanQuery = false, false
					if i == 2 then importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(x, 1.15, z), 9, false) end
				elseif form == "hill" or form == "strait" then
					importedModel(folder, "Town", "rock-wide", Vector3.new(x, 0.9, z), 24 + i * 3, false)
				elseif form == "bay" and i ~= 2 then
					importedModel(folder, "Naval", "rocks-a", Vector3.new(x, 0.9, z), 17 + i * 2, false)
				end
			end
		end
	end
	-- [CC0 해안 배경] 등록·검증된 실물 메시만 사용하며 멀리 최대 6개를 배치한다.
	-- 신규 Roblox 자산 번호가 없으면 생략한다. 기존 보행·저장·전투 판정에 영향을 주지 않는다.
	local warmShore = palmOk(info.portId, style)
	local coastalRocks = if warmShore then { "rocks-sand-a", "rocks-sand-b", "rocks-sand-c" } else { "rocks-a", "rocks-b" }
	for i = 1, 4 do
		local name = coastalRocks[(i - 1) % #coastalRocks + 1]
		if AssetIds["Naval/" .. name] then
			local side = if i % 2 == 0 then 1 else -1
			local seaRock = importedModel(folder, "Naval", name,
				Vector3.new(100 + 27 * i, 0.5, side * (108 + 19 * i)), if warmShore then 19 else 23, false)
			if seaRock then seaRock.Name = "DistantCoast_" .. i end
		end
	end
	if warmShore and AssetIds["Naval/patch-sand-foliage"] then
		for _, z in { -116, 116 } do
			local patch = importedModel(folder, "Naval", "patch-sand-foliage", Vector3.new(13, 0.1, z), 11, false)
			if patch then patch.Name = "SandyShore" end
		end
	elseif not warmShore and AssetIds["Castle/ground-hills"] then
		for _, z in { -(CITY_LIMIT_Z + 90), CITY_LIMIT_Z + 90 } do
			local hills = importedModel(folder, "Castle", "ground-hills", Vector3.new(-330, 0, z), 76, false)
			if hills then hills.Name = "DistantHills" end
		end
	end
	part(folder, Vector3.new(8, 2, 300), CFrame.new(18, 0, 0), Color3.fromRGB(130, 126, 120), Enum.Material.Cobblestone)
	local dock = part(folder, Vector3.new(60, 0.8, 10), CFrame.new(50, 1.6, 0), Color3.fromRGB(150, 110, 70), Enum.Material.WoodPlanks)
	if importedModel(folder, "Naval", "structure-platform-dock", Vector3.new(40, 0.8, 0), 22, false) then
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
		-- [확장 잔교 안전망] 잔교를 실제 투자 조건에 따라 열고, 확장 길이에 맞춰 낙하 방지 벽도 연장한다.
		if dockGrowth.sidePier then
			local endX = 22 + dockGrowth.pierLength
			wall(Vector3.new(1, 40, 36.9), CFrame.new(22.5, 18, 24.05))
			wall(Vector3.new(1, 40, CITY_LIMIT_Z - 49.5), CFrame.new(22.5, 18, (CITY_LIMIT_Z + 49.5) / 2))
			wall(Vector3.new(endX - 21, 40, 1), CFrame.new((22 + endX) * 0.5, 18, 42))
			wall(Vector3.new(endX - 21, 40, 1), CFrame.new((22 + endX) * 0.5, 18, 50))
			wall(Vector3.new(1, 40, 8), CFrame.new(endX + 1.5, 18, 46))
		else
			-- 1단계 또는 실제 부두 투자가 없는 곳은 둘째 잔교 입구를 열지 않는다.
			wall(Vector3.new(1, 40, CITY_LIMIT_Z - 5.6), CFrame.new(22.5, 18, (CITY_LIMIT_Z + 5.6) * 0.5))
		end
		-- 안전망: 어떤 이유로 땅에 틈이 생겨도 육지 구역은 보이지 않는 바닥이 받쳐 바다로 떨어지지 않는다
		do
			local floor = part(folder, Vector3.new(1120, 2, 2 * CITY_LIMIT_Z), CFrame.new(-520, -1, 0), Color3.new(1, 1, 1))
			floor.Name = "SafetyFloor"
			floor.Transparency = 1
			floor.CanQuery = false
			floor.CastShadow = false
		end
		wall(Vector3.new(1, 40, CITY_LIMIT_Z - 5.6), CFrame.new(22.5, 18, -(CITY_LIMIT_Z + 5.6) / 2))
		wall(Vector3.new(66, 40, 1), CFrame.new(56, 18, 5.6))
		wall(Vector3.new(66, 40, 1), CFrame.new(56, 18, -5.6))
		wall(Vector3.new(1, 40, 12), CFrame.new(89.5, 18, 0))
		wall(Vector3.new(1, 40, 2 * CITY_LIMIT_Z), CFrame.new(-1060, 18, 0))
		wall(Vector3.new(1600, 40, 1), CFrame.new(-260, 18, CITY_LIMIT_Z))
		wall(Vector3.new(1600, 40, 1), CFrame.new(-260, 18, -CITY_LIMIT_Z))
	end
	-- 부두 화물: 등록된 실제 상품 모델을 쓰며 생산품·가격·보행 판정에는 영향을 주지 않는다.
	local cargoModels = {
		iron = "iron-bars", timber = "wood-log-stack", cloth = "textiles-stack-large-colored",
		fish = "food-barrel-fish", cheese = "cheese", wine = "barrel",
		olive_oil = "bottle-oil", tea = "cup-tea", coffee = "cup-coffee",
	}
	local port = PortData.Ports[info.portId]
	local cargoIndex = 0
	for _, id in (if port then port.produces else {}) do
		local mesh = cargoModels[id]
		if mesh then
			cargoIndex += 1
			local model = importedModel(folder, "Cargo", mesh,
				Vector3.new(25 + cargoIndex * 5, 2, if cargoIndex % 2 == 0 then 3.2 else -3.2), 2.4, false)
			if model then model.Name = "TradeCargo_" .. id end
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
	sign(folder, gate, info.portName .. " · " .. dockGrowth.name, Color3.fromRGB(150, 110, 40), 7)
	prompt(folder, Vector3.new(60, 4, 0), "부두", "출항 준비 (지도)", "map", onFacility)

	-- 내 배
	local ship = buildShip(folder, info.shipId, Vector3.new(50, 1.2, 16))

	-- 광장
	part(folder, Vector3.new(36, 0.3, 36), CFrame.new(-6, 0.15, 0), roadColor(style), roadMat())
	part(folder, Vector3.new(130, 0.25, 22 + 1.5 * (sceneLevel - 1)), CFrame.new(-80, 0.13, 0), roadColor(style), roadMat())
	-- 시설 앞 큰 광장과 주택가 골목: 동선이 눈에 보이도록 돌바닥을 깐다
	part(folder, Vector3.new(100, 0.3, 74), CFrame.new(-38, 0.14, 0), roadColor(style), roadMat())
	for _, sz in { 57, -57 } do
		part(folder, Vector3.new(120, 0.25, 8 + sceneLevel), CFrame.new(-92, 0.12, sz), roadColor(style), roadMat())
	end
	for _, sx in (PROFILE[styleKeyOf(style)] or PROFILE.north).streets do
		part(folder, Vector3.new(6 + (sceneLevel - 1), 0.25, 130), CFrame.new(sx, 0.12, 0), roadColor(style), roadMat())
	end
	-- [분수 이전] 중앙광장은 포장 바닥만 남기고 분수 구조물은 서쪽 문화거리로 옮긴다.
	if PortBuildings.StreetGrowth[sceneLevel].fountain then
		part(folder, Vector3.new(2, 8, 8), CFrame.new(-106, 1, 122) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(200, 196, 186), Enum.Material.Marble, Enum.PartType.Cylinder)
		part(folder, Vector3.new(2.2, 6.5, 6.5), CFrame.new(-106, 1.2, 122) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(80, 150, 200), Enum.Material.Glass, Enum.PartType.Cylinder)
	end

	-- 마을 광장: 중앙 분수를 둘러싼 원형 광장. 발전도가 오를수록 바닥이 흙 → 자갈 → 포석 → 화강암 → 대리석으로 고급스러워진다.
	do
		local plazaMat = { Enum.Material.Ground, Enum.Material.Pebble, Enum.Material.Cobblestone, Enum.Material.Granite, Enum.Material.Marble }
		local plazaCol = {
			Color3.fromRGB(190, 158, 112), Color3.fromRGB(176, 164, 146), Color3.fromRGB(166, 160, 152),
			Color3.fromRGB(176, 174, 178), Color3.fromRGB(232, 228, 218),
		}
		local function disc(radius, y, color, mat)
			local d = part(folder, Vector3.new(0.3, radius * 2, radius * 2), CFrame.new(-6, y, 0) * CFrame.Angles(0, 0, math.pi / 2), color, mat, Enum.PartType.Cylinder)
			d.CanCollide = true
			return d
		end
		disc(24, 0.17, plazaCol[sceneLevel], plazaMat[sceneLevel])
		if sceneLevel >= 2 then disc(19, 0.2, plazaCol[sceneLevel]:Lerp(Color3.new(0.3, 0.26, 0.22), 0.25), plazaMat[math.max(1, sceneLevel - 1)]) end
		if sceneLevel >= 3 then disc(13, 0.23, plazaCol[sceneLevel]:Lerp(Color3.new(1, 1, 1), 0.2), plazaMat[sceneLevel]) end
		if sceneLevel >= 4 then disc(10.5, 0.26, Color3.fromRGB(214, 170, 82), Enum.Material.Metal) end
		if sceneLevel >= 4 then disc(10, 0.29, plazaCol[sceneLevel], plazaMat[sceneLevel]) end
		local plazaLamps = PortBuildings.StreetGrowth[sceneLevel].plazaLamps
		if plazaLamps > 0 then
			-- [광장 공터] 기존 조명 수는 유지하되 광장 안쪽 원형 배치를 서쪽 거리로 이전한다.
			for i = 0, plazaLamps - 1 do
				lantern(folder, Vector3.new(-94 - math.floor(i / 2) * 18, 0, if i % 2 == 0 then 30 else -30), 3)
			end
		end
	end

	-- [자동 증축 작업] 기존 경제 정본에서 단계가 처음 올라갈 때만 승인된 공사용 실물 메시를 설치한다.
	local previousFacilityGrowth = lastFacilityGrowth[info.portId]
	local currentFacilityGrowth = {}
	local facilityUpgradeAnimations, facilityUpgradeBuilders = 0, 0
	local touchFacility = game:GetService("UserInputService").TouchEnabled
	local facilityAnimationCap = if touchFacility then 1 else 3
	local facilityBuilderCap = if touchFacility then 1 else 2
	-- 시설 건물: { 이름, 탭, 위치, 크기, 벽색 }
	local facilities = {
		{ name = "교역소", tab = "trade", pos = Vector3.new(-12, 0, 36), w = 20, d = 12, floors = 1, color = Color3.fromRGB(176, 120, 60), economy = "market", always = true },
		{ name = "주점", tab = "quest", pos = Vector3.new(-12, 0, -36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(120, 76, 44), economy = "tavern", always = true },
		{ name = "항만청", tab = "route", pos = Vector3.new(8, 0, 58), w = 12, d = 10, floors = 2, color = Color3.fromRGB(90, 110, 140), economy = "dock", key = "harbormaster" },
		{ name = "은행", tab = "harbor", pos = Vector3.new(-50, 0, 36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(220, 214, 200), economy = "market", key = "bank" },
		{ name = "상인 길드", tab = "trade", pos = Vector3.new(-50, 0, -36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(150, 120, 90), economy = "warehouse", key = "guild" },
		{ name = "학자의 서재", tab = "tech", pos = Vector3.new(-88, 0, 36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(120, 100, 140), economy = "school", always = true },
		{ name = "도서관 (도감)", tab = "codex", pos = Vector3.new(-88, 0, -36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(100, 120, 110), economy = "school", always = true },
	}
	for _, f in facilities do
		if f.always or (f.key and fac[f.key]) then
			-- [경제 발전도 직결] 실제 마을 시설 건설 수량이 없으면 높은 단계 외형을 선물하지 않는다.
			-- SceneLevel은 항구 투자+실물경제 stage의 정본이고, 시설 실적은 기존 Econ.town buildings를 읽기만 한다.
			local built = info.sim and info.sim.buildings
			local count = if built then math.max(0, math.floor(tonumber(built[f.economy]) or 0)) else nil
			-- sqrt(count) 구간(1/4/9/16)과 기존 클라이언트 건설 스탬프를 일치시켜 성장 때만 재배치한다.
			local builtTier = if count == nil then sceneLevel elseif count >= 16 then 5
				elseif count >= 9 then 4 elseif count >= 4 then 3 elseif count >= 1 then 2 else 1
			local facilityTier = math.min(sceneLevel, builtTier)
			-- 실물경제가 침체하면 최고급 5단계 증축만 보류한다. 경제 수치·건설 상태는 그대로 둔다.
			if info.sim and (tonumber(info.sim.prosperity) or 100) < 90 then
				facilityTier = math.min(facilityTier, 4)
			end
			currentFacilityGrowth[f.name] = facilityTier
			local upgrade = previousFacilityGrowth and previousFacilityGrowth[f.name]
				and facilityTier > previousFacilityGrowth[f.name] and facilityUpgradeAnimations < facilityAnimationCap
			local grow = 1.21 + 0.025 * (facilityTier - 1)
			local visualFloors = math.min(3, f.floors + (if facilityTier >= 4 then 1 else 0))
			local tone = f.color:Lerp(style.walls[1], 0.5):Lerp(Color3.fromRGB(90, 80, 70),
				if facilityTier <= 1 then 0.18 else 0):Lerp(Color3.new(1, 1, 1), 0.05 * (facilityTier - 1))
			-- [시설 고유 건축] 서재=학문탑, 도서관=열주 학술관.
			-- 지역 양식을 지켜야 할 한옥·중정·고상식 건물은 기존 현지 주택을 쓰고 주변 실물 부속으로 차별화한다.
			local form = (style.house or {}).form
			local localArchitecture = style.kit == "eastasia" or form == "flat" or form == "courtyard"
				or form == "carved" or form == "stilt" or form == "coastal"
			local signatureAsset = if localArchitecture then nil
				elseif f.name == "학자의 서재" then "quaternius_large_square_tower"
				elseif f.name == "도서관 (도감)" then "temple-stone"
				else nil
			local signature = signatureAsset and importedModel(folder, "Town", signatureAsset, f.pos,
				math.max(f.w, f.d) * grow * HOUSE_SCALE * (1 + math.max(0, facilityTier - 2) * 0.055), true, tone)
			if signature then
				signature.Name = if f.name == "학자의 서재" then "ScholarStudyTower" else "HarborLibraryHall"
				signature:SetAttribute("FacilityIdentity", f.tab)
			end
			local body = (signature and signature:FindFirstChildWhichIsA("BasePart", true))
				or house(folder, f.pos, f.w * grow, f.d * grow, visualFloors, style, rng, tone)
			-- [자동 완공 증거] 단일 책임 장면의 읽기 전용 표식. 기존 저장·구매·건설 판정은 건드리지 않는다.
			if body then
				body:SetAttribute("FacilityVisualTier", facilityTier)
				body:SetAttribute("FacilityCityTier", sceneLevel)
				body:SetAttribute("FacilityEconomyKind", f.economy)
				body:SetAttribute("FacilityEconomicCount", count or 0)
				body:SetAttribute("BuildAuthority", "VISUAL_ONLY")
			end
			if signature then
				signature:SetAttribute("FacilityVisualTier", facilityTier)
				signature:SetAttribute("FacilityEconomicCount", count or 0)
			end
			-- 문이 광장(가운데 길) 쪽을 보도록: 위쪽 줄은 -Z, 아래쪽 줄은 +Z 방향 입구
			local doorZ = if f.pos.Z > 0 then f.pos.Z - f.d * grow / 2 - 2 else f.pos.Z + f.d * grow / 2 + 2
			local signHeight = (visualFloors * 3 + 6) * grow
			if signature then
				local _, ext = signature:GetBoundingBox()
				signHeight = math.max(signHeight, ext.Y * 0.64)
			end
			sign(folder, body, f.name, nil, signHeight)
			do
				-- 시설별 외형 단계 (승인된 기존 3D 소품만): 2단계 생활 소품, 3단계 장식, 4단계 깃발·기둥, 5단계 상징물
				local lv = facilityTier
				local zs = if f.pos.Z > 0 then -1 else 1
				local fx, fz = f.pos.X, doorZ
				local function at(dx, dz) return Vector3.new(fx + dx, 0, fz + zs * dz) end
				-- [실제 증축 시공] 이미 있는 건설 비계·R15 망치 모션을 재사용한다. 새 경제 저장 키나 시설은 만들지 않는다.
				-- 장면 첫 방문/같은 단계 재입항/하락 단계에서는 시공을 재생하지 않는다.
				if upgrade then
					local delay = 0.15 + facilityUpgradeAnimations * 0.38
					local scaffold = importedModel(folder, "Terrain", "wood-structure", at(-14, 4), 6.5, false, nil, delay)
					if scaffold then
						scaffold.Name = "FacilityUpgradeScaffold_" .. f.tab
						scaffold:SetAttribute("BuildPlotId", info.portId .. ":facility:" .. f.name)
						scaffold:SetAttribute("BuildType", f.economy)
						scaffold:SetAttribute("BuildTier", facilityTier)
						scaffold:SetAttribute("BuildAuthority", "VISUAL_ONLY")
						facilityUpgradeAnimations += 1
						local jobs = info.sim and info.sim.jobs
						local hasWorkers = not info.sim or (jobs and ((jobs.laborer or 0) + (jobs.craftsman or 0)) > 0)
						if hasWorkers and facilityUpgradeBuilders < facilityBuilderCap then
							local workerPos = at(-12, 6)
							local builder = villager(folder, workerPos, faceTo(workerPos, at(-14, 4)),
								Color3.fromRGB(144, 115, 82), rng, "Barbarian", true, { profession = "construction_worker", hat = "cap" })
							if builder then
								facilityUpgradeBuilders += 1
								builder.Name = "FacilityBuilder_" .. f.tab
								builder:SetAttribute("Job", "construction_worker")
								builder:SetAttribute("BuildPlotId", info.portId .. ":facility:" .. f.name)
								builder:SetAttribute("ShowcaseOnly", true)
								table.insert(walkers, { model = builder, base = builder:GetPivot(), mode = "stay", kind = "hammer", phase = rng:NextNumber(0, 5) })
								task.delay(delay + 4, function()
									if builder.Parent then builder:Destroy() end
								end)
							end
						end
						task.spawn(function()
							local deadline = os.clock() + 25
							while scaffold.Parent and not folder.Parent and os.clock() < deadline do task.wait(0.12) end
							if not folder.Parent then return end
							task.wait(delay + 3.2)
							if scaffold.Parent then scaffold:Destroy() end
						end)
					end
				end
				-- [항구 시설별 실물 윤곽] 첫 발전 단계부터 서로 다른 건축물로 인식되게 한다.
				-- 같은 저장·시설탭·출입 좌표를 그대로 두며 등록된 CC0 실물 모델만 재사용한다.
				if f.name == "교역소" then
					importedModel(folder, "Town", "stall-green", at(-9, 2.5), 7, false)
					importedModel(folder, "Town", "cart", at(10, 2), 4.5, false)
					if lv >= 2 then importedModel(folder, "Cargo", "barrel", at(-6, 0), 2.4, false) importedModel(folder, "Cargo", "box-open", at(-8, 0.5), 2.2, false) end
					if lv >= 3 then importedModel(folder, "Town", "stall-red", at(9, 2), 6, false) end
					if lv >= 4 then importedModel(folder, "Castle", "flag-banner-short", at(-10, 1), 8, false) end
					if lv >= 5 then importedModel(folder, "Cargo", "textiles-stack-large-colored", at(7, 0), 2.6, false) importedModel(folder, "Cargo", "gold-bars-stack-large", at(11, 0), 2.2, false) end
				elseif f.name == "주점" then
					-- 굴뚝 솟은 비대칭 여관 본관 + 넓은 식사 차양: 시장이나 학술관과 다른 실루엣.
					importedModel(folder, "Town", "overhang", at(0, 3), 10.5, false, style.roofs[1])
					importedModel(folder, "Town", "chimney", f.pos + Vector3.new(-3.6, visualFloors * 6.8 * grow, 0), 4.8, false)
					importedModel(folder, "Cargo", "barrel", at(-8, 1), 2.7, false)
					importedModel(folder, "Town", "bench_A", at(8, 2), 4.2, false)
					if lv >= 2 then lantern(folder, at(-5, 0), 3) end
					if lv >= 3 then
						importedModel(folder, "Town", "stall-red", at(10, 4), 5.5, false)
						if not localArchitecture then
							importedModel(folder, "Town", "roof-high-window",
								f.pos + Vector3.new(0, visualFloors * 5.8 * grow, 0), 5.5, false, style.roofs[1])
						end
					end
					if lv >= 4 then lantern(folder, at(5, 0), 3) importedModel(folder, "Castle", "flag-banner-short", at(-8, 1), 7, false) end
					if lv >= 5 then importedModel(folder, "Cargo", "pot-stew", at(9, 0), 2.2, false) end
				elseif f.name == "항만청" then
					-- 항만 관제탑과 신호 깃발로 교역소·은행과 구분한다.
					importedModel(folder, "Town", "quaternius_watch_tower_wroof", f.pos + Vector3.new(10, 0, 1.5), 10, false, tone)
					importedModel(folder, "Naval", "flag-high", at(-7, 2), 8, false)
					if lv >= 3 then importedModel(folder, "Castle", "flag-banner-long", at(-8, 0), 9, false) end
					if lv >= 4 then
						for k, part_ in { "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-top" } do
							importedModel(folder, "Castle", part_, Vector3.new(fx + 11, (k - 1) * 6, f.pos.Z), 7, true)
						end
					end
				elseif f.name == "은행" then
					-- 대리석 현관과 출납 금고 상징: 주점과 달리 정면 좌우가 대칭인 금융 건축.
					for _, dx in { -5.4, 5.4 } do
						importedModel(folder, "Terrain", "column", at(dx, 1.1), 9, false, Color3.fromRGB(205, 199, 184))
					end
					importedModel(folder, "Town", "kenney_grey_arch_01", at(0, 1.8), 7.5, false)
				elseif f.name == "상인 길드" then
					-- 간판만 다른 주택이 아니라 긴 출입 회랑을 둔 상인 회관.
					importedModel(folder, "Town", "kenney_wood_arch_01", at(0, 2.3), 8, false)
					importedModel(folder, "Town", "quaternius_wall_entrance_bricks", at(-9, 2.6), 8, false, tone)
					importedModel(folder, "Town", "stall-green", at(9.5, 3), 5.6, false)
					if lv >= 3 then importedModel(folder, "Castle", "flag-banner-long", at(-8, 0), 9, false) end
					if lv >= 4 then for _, dx in { -4, 4 } do importedModel(folder, "Terrain", "column", at(dx, 1.5), 6, false) end end
				elseif f.name == "학자의 서재" then
					-- 학자의 관측탑/서재 출입구에 책과 천문 기구를 배치한다.
					importedModel(folder, "Interior", "bookcaseclosed", at(-7, 1.5), 4.5, false)
					importedModel(folder, "Relics", "journal-open", at(7, 1.5), 2.2, false)
					importedModel(folder, "Relics", "magnifying-glass", at(9, 2.7), 2.4, false)
					if lv >= 2 then lantern(folder, at(-5, 0), 3) end
					if lv >= 4 then importedModel(folder, "Town", "quaternius_small_square_tower", f.pos + Vector3.new(11, 0, -2), 8, false, tone) end
				elseif f.name == "도서관 (도감)" then
					-- 학문탑과는 반대로 넓고 낮은 열주 서고, 책이 가득한 현관으로 구분한다.
					for _, dx in { -6, 6 } do
						importedModel(folder, "Terrain", "column", at(dx, 1.4), 7.5, false, tone)
					end
					importedModel(folder, "Interior", "bookcaseopenlow", at(-9, 1.8), 4.3, false)
					importedModel(folder, "Interior", "bookcaseclosed", at(9, 1.8), 4.3, false)
					if lv >= 2 then lantern(folder, at(-5, 0), 3) end
					if lv >= 3 and not localArchitecture then
						importedModel(folder, "Town", "kenney_grey_window_round_01",
							f.pos + Vector3.new(-5, visualFloors * 2.5, -1), 5, false)
					end
					if lv >= 5 then importedModel(folder, "Terrain", "statue-column", at(12, 2.5), 9, false) end
				end
			end
			-- 은행은 항구 발전도에 따라 커진다: 3단계 기둥, 4단계 깃발, 5단계 금괴 더미
			if f.key == "bank" then
				if facilityTier >= 3 then
					for _, dx in { -5, 0, 5 } do
						importedModel(folder, "Terrain", "column", Vector3.new(f.pos.X + dx, 0, doorZ + (if f.pos.Z > 0 then -1.5 else 1.5)), 6, false)
					end
				end
				if facilityTier >= 4 then
					importedModel(folder, "Castle", "flag-banner-long", Vector3.new(f.pos.X + 8, 0, doorZ), 9, false)
					importedModel(folder, "Castle", "flag-banner-long", Vector3.new(f.pos.X - 8, 0, doorZ), 9, false)
				end
				if facilityTier >= 5 then
					importedModel(folder, "Cargo", "gold-bars-stack-large", Vector3.new(f.pos.X + 4, 0, doorZ + (if f.pos.Z > 0 then -3 else 3)), 2.4, false)
				end
			end
			prompt(folder, Vector3.new(f.pos.X, 3, doorZ), f.name, "들어가기", f.tab, onFacility)
			villager(folder, Vector3.new(f.pos.X + 3, 0, doorZ), if f.pos.Z > 0 then 0 else math.pi, Color3.fromRGB(rng:NextInteger(60, 160), rng:NextInteger(50, 120), rng:NextInteger(40, 110)), rng, KEEPER_ROLE[f.name] or "Knight")
		end
	end
	if info.sim and info.sim.buildings then lastFacilityGrowth[info.portId] = currentFacilityGrowth end
	folder:SetAttribute("FacilityUpgradesThisVisit", facilityUpgradeAnimations)
	folder:SetAttribute("FacilityUpgradeBuilders", facilityUpgradeBuilders)
	folder:SetAttribute("FacilityUpgradeMode", "ECONOMY_VISUAL_ONLY")

	-- 조선소: 남쪽 물가의 경사 선대와 짓고 있는 배의 뼈대
	if info.hasShipyard then
		local simDock = info.sim and info.sim.buildings and info.sim.buildings.dock or 0
		local dockScale = math.clamp(1 + math.sqrt(math.max(0, simDock)) / 14, 1, 1.6)
		local shipFrames = math.clamp(math.floor(4 + math.sqrt(math.max(0, simDock)) / 3), 4, 9)
		part(folder, Vector3.new(30 * dockScale, 1, 14), CFrame.new(24 + (dockScale - 1) * 11, 0.6, -48) * CFrame.Angles(0, 0, math.rad(-6)), Color3.fromRGB(140, 104, 66), Enum.Material.WoodPlanks)
		for i = 0, shipFrames do
			part(folder, Vector3.new(0.8, 8, 0.8), CFrame.new(14 + i * 3, 4.5, -48) * CFrame.Angles(math.rad(90), 0, 0) * CFrame.Angles(0, 0, 0), Color3.fromRGB(110, 76, 44), Enum.Material.Wood)
		end
		part(folder, Vector3.new(22, 1, 1), CFrame.new(23, 1.6, -48), Color3.fromRGB(110, 76, 44), Enum.Material.Wood)
		local shed = house(folder, Vector3.new(-4, 0, -88), 14 * 1.2, 12 * 1.2, 2, style, rng, Color3.fromRGB(150, 118, 84))
		sign(folder, shed, "조선소", Color3.fromRGB(90, 60, 30), 12)
		prompt(folder, Vector3.new(8, 3, -79), "조선소", "들어가기", "yard", onFacility)
		-- 수출·수리 수요가 증가하면 기존 자산으로 조선소 뒤편 목재와 작업 창고를 늘린다.
		local storage = math.clamp(math.floor(1 + math.sqrt(math.max(0, simDock)) / 4), 1, 5)
		for i = 1, storage do
			importedModel(folder, "Terrain", "log-stack", Vector3.new(9 + i * 8, 0, -69), 4.5, false)
			if i % 2 == 0 then importedModel(folder, "Cargo", "resource-planks", Vector3.new(9 + i * 8, 0, -76), 3.5, false) end
		end
	end

	-- 왕궁·궁정 구역: 시장·공업·외곽 주거 구역과 분리한 서쪽 중앙 축에만 짓는다.
	-- 최소 가로/세로 140스터드급: 일반 주택 약 12~16스터드보다 10배 이상 크다.
	local palaceCourt = nil
	if fac.palace then
		local px = -425
		local key = currentKey
		local royalSeed = seeded(info.portId .. ":royal-court")
		-- 왕도 발전에 따른 왕궁 폭·깊이 확장. 별관·근위대·정원까지 하나의 구획으로 확보한다.
		local scale = 1.34 + (sceneLevel - 1) * 0.1 + royalSeed:NextNumber(0, 0.025) -- 초기 폭 약 180, 최고 약 240: 일반 주택 대비 10배급
		local wide, deep = 134 * scale, 138 * scale
		local tall = 30 + sceneLevel * 4
		-- [지역 관저 판별] 지역 문화 키만으로 통치 체계가 달라지는 항구를 같은 왕궁으로 묶지 않는다.
		-- 조선은 기존 포트 문화 테이블에서 stone으로 분류돼 있으므로 국가 데이터를 먼저 본다.
		local homePort = PortData.Ports[info.portId]
		local nation = homePort and homePort.country or ""
		local korean = nation == "korea"
		local east = korean or key == "china" or key == "japan"
		local indian = key == "malabar"
		local southeast = key == "seasia"
		local islamic = key == "ottoman" or key == "desert" or key == "swahili"
		local westAfrican = key == "wafrica"
		local tropical = key == "tropic" or key == "pacific" or key == "creole" or key == "colonial"
		local renaissance = key == "italy" or key == "med" or key == "iberia"
		local courtStyle = if korean then "조선 관아" elseif key == "china" then "중국 관아"
			elseif key == "japan" then "일본 관저·성곽" elseif indian then "말라바르 관저"
			elseif southeast then "동남아 궁정" elseif key == "ottoman" then "오스만 궁정"
			elseif key == "swahili" then "스와힐리 궁정" elseif westAfrican then "서아프리카 관저"
			elseif islamic then "연안 중정 관저" elseif key == "france" then "프랑스 왕실 관저"
			elseif key == "britain" then "영국 왕실 관저" elseif key == "hanse" then "한자 도시 관청"
			elseif key == "italy" then "이탈리아 궁정" elseif key == "iberia" then "이베리아 관저"
			elseif tropical then "열대 관저·총독부" elseif renaissance then "지중해 궁정" else "지역 관저"
		local prosperity = if info.sim then math.clamp((info.sim.prosperity or 100) / 100, 0.25, 1.4) else 1
		local palaceTier = math.max(1, math.min(sceneLevel, math.floor(sceneLevel * (0.72 + prosperity * 0.28) + 0.5)))
		local baseColor = if korean then C(212, 202, 174) elseif key == "china" then C(176, 129, 88)
			elseif east then C(176, 154, 126) elseif indian or southeast then C(186, 151, 108)
			elseif islamic then C(231, 209, 172) elseif westAfrican then C(173, 129, 86)
			elseif tropical then C(229, 203, 161) elseif renaissance then C(228, 219, 197) else C(199, 198, 197)
		local roofColor = if korean then C(57, 65, 59) elseif key == "china" then C(171, 125, 56)
			elseif east then C(74, 87, 79) elseif indian or southeast then C(114, 79, 56)
			elseif islamic then C(65, 135, 141) elseif westAfrican then C(120, 79, 55)
			elseif tropical then C(146, 83, 60) elseif renaissance then C(159, 77, 65) else C(80, 93, 115)
		local surface = if east or indian or southeast or tropical then Enum.Material.WoodPlanks
			elseif islamic or westAfrican then Enum.Material.Sandstone else Enum.Material.Marble
		local palaceTitle = info.palaceName or "왕궁"
		local facadeX = px + wide * 0.5
		local frontX = facadeX + 18
		-- 왕궁 본체와 양쪽 측랑: 축척을 한 번에 확장하며 장식만 비충돌로 둔다.
		local main = part(folder, Vector3.new(wide, tall, deep * 0.74), CFrame.new(px, tall / 2, 0), baseColor, surface)
		main.Name = "RoyalPalace"
		main:SetAttribute("RoyalStyle", courtStyle)
		main:SetAttribute("RoyalNation", nation)
		main:SetAttribute("RoyalCulture", key)
		main:SetAttribute("PortId", info.portId)
		main:SetAttribute("FootprintRatio", 10)
		main:SetAttribute("RoyalTier", palaceTier)
		-- [궁정 건축] 궁전 등급도 기존 발전도와 통일된 표시용 필지 규약으로 공개한다.
		main:SetAttribute("BuildPlotId", info.portId .. ":royal:main")
		main:SetAttribute("BuildType", "palace")
		main:SetAttribute("BuildPhase", 4)
		main:SetAttribute("BuildState", "complete")
		main:SetAttribute("BuildTier", palaceTier)
		main:SetAttribute("BuildAuthority", "VISUAL_ONLY")
		main:SetAttribute("RoyalPlotScale", PortBuildings.RoyalCityPlots.plotScale[sceneLevel])
		part(folder, Vector3.new(wide + 6, 3.2, deep * 0.77 + 6), CFrame.new(px, tall + 1.6, 0), roofColor, if east or tropical then Enum.Material.WoodPlanks else Enum.Material.Slate)
		for _, side in { -1, 1 } do
			local z = side * (deep * 0.41 + 20)
			part(folder, Vector3.new(wide * 0.74, tall * 0.72, 30), CFrame.new(px - 8, tall * 0.36, z), baseColor, surface)
			part(folder, Vector3.new(wide * 0.78, 3.5, 34), CFrame.new(px - 8, tall * 0.72 + 1.5, z), roofColor, Enum.Material.Slate)
			-- 지역 양식에 따라 관문 탑·첨탑·누각으로 실루엣을 다르게 한다.
			if palaceTier >= 2 then
				local tower = if east then "tower-square-roof" elseif islamic then "tower-hexagon-roof" else "tower-square-top-roof"
				local zTower = side * (deep * 0.47 + 23)
				local tx = px - wide * 0.34
				local tbase = part(folder, Vector3.new(16, tall * 0.72, 16), CFrame.new(tx, tall * 0.36, zTower), baseColor, surface)
				tbase.Name = "RoyalTower"
				importedModel(folder, "Castle", tower, Vector3.new(tx, tall * 0.72, zTower), 20, false)
				importedModel(folder, "Castle", "flag-banner-long", Vector3.new(facadeX + 5, 0, side * (deep * 0.4 + 7)), 12, false)
			end
			-- 궁정 담장·정원은 본체와 겹치지 않으며 거주구역보다 낮은 밀도로 배치한다.
			if palaceTier >= 2 then
				for k = 1, 4 do
					local x = facadeX + 15 + (k - 1) * 12
					importedModel(folder, "Town", "fence_straight", Vector3.new(x, 0, side * (deep * 0.45 + 28)), 7, false)
				end
			end
			if palaceTier >= 3 then
				for k = 1, 3 do
					local at = Vector3.new(facadeX + 16 + k * 12, 0, side * (deep * 0.32 + 24))
					if tropical or islamic then
						importedModel(folder, "Naval", "palm-detailed-straight", at, 12, false)
					else
						importedModel(folder, "Terrain", "tree-oak", at, 11, false)
					end
				end
			end
		end
		-- [검증된 지역 외관 부재] 등록된 문화권 전용 지붕/기둥/아치만 사용한다.
		-- 기존 상자형 본체를 새 파츠로 덮지 않는다. 완성형 전용 궁전 메시가 없는 지역은 추후 실물 자산 등록 필요.
		if east then
			for _, z in { -deep * 0.26, 0, deep * 0.26 } do
				importedModel(folder, "Town", "eastasia-roof", Vector3.new(px, tall + 3, z), 34, false, roofColor)
			end
			-- 조선/중국/일본의 정면 행각은 승인된 동아시아 기둥과 처마 모델을 사용한다.
			if palaceTier >= 2 then
				for _, z in { -36, -18, 18, 36 } do
					importedModel(folder, "Town", "eastasia-column-base", Vector3.new(facadeX + 12, 0, z), 7, false)
				end
				importedModel(folder, "Town", "eastasia-roof", Vector3.new(facadeX + 10, tall * 0.8, 0), 23, false, roofColor)
			end
		elseif indian or southeast then
			-- 말라바르 해안과 동남아는 중국식 기와 궁전을 재사용하지 않고 목조 경사 지붕을 사용한다.
			for _, z in { -deep * 0.23, deep * 0.23 } do
				importedModel(folder, "Town", "roof-gable", Vector3.new(px, tall + 3, z), 31, false, roofColor)
			end
		elseif islamic then
			for _, z in { -deep * 0.3, 0, deep * 0.3 } do
				part(folder, Vector3.new(28, 18, 28), CFrame.new(px, tall + 8, z), roofColor, Enum.Material.SmoothPlastic, Enum.PartType.Ball)
			end
		elseif tropical then
			for k = -4, 4 do
				part(folder, Vector3.new(2.4, 16, 2.4), CFrame.new(facadeX + 7, 8, k * 13), C(227, 214, 186), Enum.Material.Wood)
			end
		else
			for k = -4, 4 do
				local z = k * 13
				part(folder, Vector3.new(3.2, tall * 0.72, 3.2), CFrame.new(facadeX + 4, tall * 0.36, z), C(230, 224, 207), Enum.Material.Marble)
			end
			for _, z in { -deep * 0.24, deep * 0.24 } do
				importedModel(folder, "Castle", "tower-square-roof", Vector3.new(px, tall + 3, z), 18, false)
			end
		end
		-- 유럽 관저 역시 문화권별로 등록된 외관 장식을 달리한다. 왕궁 필지 외부로 확장하지 않는다.
		if palaceTier >= 3 and (key == "france" or key == "italy" or key == "iberia") then
			for _, z in { -40, 40 } do
				importedModel(folder, "Terrain", "column", Vector3.new(facadeX + 15, 0, z), 10, false)
			end
		elseif palaceTier >= 3 and key == "britain" then
			for _, z in { -58, 58 } do
				importedModel(folder, "Castle", "tower-square-mid-windows", Vector3.new(facadeX + 13, 0, z), 13, false)
			end
		elseif palaceTier >= 3 and westAfrican then
			for _, z in { -36, 36 } do
				importedModel(folder, "Town", "kenney_wood_door_round_01", Vector3.new(facadeX + 12, 0, z), 8, false)
			end
		end
		-- 왕실 출입구·광장·문장·분수·군수 마차·궁정 서고/마구간.
		local entry = part(folder, Vector3.new(4, 13, 12), CFrame.new(facadeX + 3, 6.5, 0), C(89, 59, 44), Enum.Material.Wood)
		entry.Name = "RoyalEntrance"
		part(folder, Vector3.new(75, 0.4, 26), CFrame.new(frontX + 25, 0.24, 0), C(166, 158, 148), Enum.Material.Cobblestone)
		if palaceTier >= 2 then
			-- 별관 서비스 필지: 남쪽 마구간, 북쪽 근위병영.
			local stable = part(folder, Vector3.new(30, 13, 18), CFrame.new(px - wide * 0.38, 6.5, deep * 0.62 + 30), C(142, 111, 80), Enum.Material.WoodPlanks)
			stable.Name = "RoyalStable"
			importedModel(folder, "Town", "cart", Vector3.new(px - wide * 0.38 - 18, 0, deep * 0.62 + 30), 7, false)
			local guardroom = part(folder, Vector3.new(34, 16, 19), CFrame.new(px - wide * 0.38, 8, -(deep * 0.62 + 30)), baseColor, surface)
			guardroom.Name = "RoyalGuardHouse"
			part(folder, Vector3.new(36, 2, 21), CFrame.new(px - wide * 0.38, 17, -(deep * 0.62 + 30)), roofColor, Enum.Material.Slate)
		end
		if palaceTier >= 3 then
			-- 정원 분수·정원 벤치와 왕실 학문 서고.
			for _, z in { -38, 38 } do
				importedModel(folder, "Town", "fountain-round", Vector3.new(frontX + 29, 0, z), 10, false)
				importedModel(folder, "Town", "bench_A", Vector3.new(frontX + 38, 0, z + (if z > 0 then 14 else -14)), 5, false)
			end
			local library = part(folder, Vector3.new(27, 15, 20), CFrame.new(px - wide * 0.28, 7.5, deep * 0.62 + 65), baseColor, surface)
			library.Name = "RoyalLibrary"
			part(folder, Vector3.new(30, 2.5, 22), CFrame.new(px - wide * 0.28, 16.2, deep * 0.62 + 65), roofColor, Enum.Material.Slate)
		end
		if palaceTier >= 4 then
			-- 행정청과 의전 깃발. 관문 폭은 최종 단계까지 보존한다.
			local office = part(folder, Vector3.new(27, 16, 20), CFrame.new(px - wide * 0.28, 8, -(deep * 0.62 + 65)), baseColor, surface)
			office.Name = "RoyalAdministration"
			part(folder, Vector3.new(30, 2.5, 22), CFrame.new(px - wide * 0.28, 17, -(deep * 0.62 + 65)), roofColor, Enum.Material.Slate)
			for _, z in { -38, 38 } do
				importedModel(folder, "Castle", "flag-banner-long", Vector3.new(frontX + 8, 0, z), 13, false)
			end
		end
		if palaceTier >= 5 then
			-- 왕실 퍼레이드용 광장 포장과 조각상: 기존 출입 동선·분수 사이를 피한다.
			part(folder, Vector3.new(60, 0.25, 23), CFrame.new(frontX + 55, 0.23, 0), C(190, 176, 147), Enum.Material.Marble)
			for _, z in { -60, 60 } do
				importedModel(folder, "Terrain", "statue-column", Vector3.new(frontX + 46, 0, z), 13, false)
			end
		end
		sign(folder, main, palaceTitle .. " · " .. courtStyle, C(153, 114, 61), 23)
		prompt(folder, Vector3.new(frontX + 9, 3, 0), palaceTitle, "알현하기", "harbor", onFacility)
		-- [궁정 인력] 실제 거주자·번영도·궁정 등급만 읽는다. 경제 직군/거주자/저장 키를 추가하지 않는다.
		local courtStaff = PortBuildings.royalPopulation(info.sim and info.sim.residents, info.sim and info.sim.prosperity, palaceTier)
		palaceCourt = { front = frontX, name = courtStyle, tint = roofColor, subjects = courtStaff }
		local royalClothes = if korean then OUTFIT.korea else (OUTFIT[currentKey] or OUTFIT.brick)
		local royalPosts = {
			gate = Vector3.new(frontX + 11, 0, 0),
			entrance = Vector3.new(frontX + 14, 0, 21),
			barracks = Vector3.new(px - wide * 0.38 + 18, 0, -(deep * 0.62 + 30)),
			stable = Vector3.new(px - wide * 0.38 + 18, 0, deep * 0.62 + 30),
			garden = Vector3.new(frontX + 28, 0, 42),
			library = Vector3.new(px - wide * 0.28 + 18, 0, deep * 0.62 + 65),
			office = Vector3.new(px - wide * 0.28 + 18, 0, -(deep * 0.62 + 65)),
		}
		-- 기존 왕궁의 실제 건립된 부속 시설에만 배정한다. 새 시설·기본 도형을 만들지 않는다.
		local royalRoles = {
			{ name = "근위병", job = "royal_guard", tier = 1, post = "gate", dz = -15, role = "Knight", work = { "salute", "inspect", "look" }, rest = { "inspect", "look" }, night = { "look", "inspect" }, tint = C(63, 77, 124) },
			{ name = "궁정 시종", job = "royal_servant", tier = 1, post = "entrance", dz = 0, role = "Rogue", work = { "polish", "carry", "inspect" }, rest = { "talk", "stretch" }, tint = C(133, 104, 82) },
			{ name = "성문 경비", job = "royal_gate_guard", tier = 2, post = "barracks", dz = -9, role = "Knight", work = { "salute", "look", "inspect" }, rest = { "inspect", "look" }, night = { "look", "inspect" }, tint = C(64, 87, 133) },
			{ name = "마구간 관리", job = "royal_stablehand", tier = 2, post = "stable", dz = 6, role = "Barbarian", work = { "sweep", "carry", "inspect" }, rest = { "stretch", "look" }, tint = C(131, 105, 81) },
			{ name = "궁정 정원사", job = "royal_gardener", tier = 3, post = "garden", dz = 6, role = "Rogue", work = { "hoe", "stoop", "inspect" }, rest = { "stretch", "talk" }, tint = C(76, 112, 84) },
			{ name = "궁정 학자", job = "royal_scholar", tier = 3, post = "library", dz = 6, role = "Mage", work = { "read", "write", "inspect" }, rest = { "listen", "talk" }, tint = C(104, 124, 113) },
			{ name = "왕실 서기", job = "royal_scribe", tier = 4, post = "office", dz = 5, role = "Mage", work = { "write", "count", "read" }, rest = { "listen", "stretch" }, tint = C(109, 84, 138) },
			{ name = "궁정 전령", job = "royal_messenger", tier = 4, post = "office", dz = -7, role = "Rogue", work = { "carry", "point", "salute" }, rest = { "talk", "listen" }, tint = C(115, 102, 76) },
			{ name = "행정 관리", job = "royal_administrator", tier = 4, post = "office", dz = 16, role = "Mage", work = { "write", "read", "inspect" }, rest = { "listen", "talk" }, tint = C(106, 85, 124) },
			{ name = "의전 근위병", job = "royal_ceremonial_guard", tier = 5, post = "gate", dz = 21, role = "Knight", work = { "salute", "look", "inspect" }, rest = { "inspect", "look" }, night = { "look", "inspect" }, tint = C(139, 99, 66) },
			{ name = "왕실 기록관", job = "royal_archivist", tier = 5, post = "library", dz = -9, role = "Mage", work = { "read", "write", "count" }, rest = { "talk", "listen" }, tint = C(87, 108, 111) },
			{ name = "궁정 의전관", job = "royal_court_officer", tier = 5, post = "entrance", dz = -17, role = "Rogue", work = { "point", "salute", "inspect" }, rest = { "talk", "look" }, tint = C(138, 111, 90) },
		}
		local courtVisible = 0
		local visibleCap = if game:GetService("UserInputService").TouchEnabled then 6 else 12
		for _, spec in ipairs(royalRoles) do
			if courtVisible >= math.min(courtStaff, visibleCap) then break end
			if palaceTier >= spec.tier then
				local pos = royalPosts[spec.post] + Vector3.new(0, 0, spec.dz)
				local coat = (royalClothes.coats and royalClothes.coats[(courtVisible % #royalClothes.coats) + 1] or C(200, 196, 186)):Lerp(spec.tint, 0.6)
				local figure = villager(folder, pos, faceTo(pos, Vector3.new(facadeX, 0, 0)), coat, rng, spec.role, true, {
					year = info.year or currentYear, profession = spec.job, hat = royalClothes.hat,
				})
				if figure then
					courtVisible += 1
					figure.Name = "RoyalStaff_" .. spec.job
					figure:SetAttribute("Job", spec.job)
					figure:SetAttribute("Workplace", spec.name)
					figure:SetAttribute("Activity", spec.work[1])
					figure:SetAttribute("RoyalTier", palaceTier)
					local head = figure:FindFirstChild("Head")
					if head then
						local label = Instance.new("BillboardGui")
						label.Size = UDim2.fromOffset(92, 20)
						label.StudsOffset = Vector3.new(0, 1.9, 0)
						label.MaxDistance = 52
						label.Adornee = head
						label.Parent = head
						local title = Instance.new("TextLabel")
						title.Size = UDim2.fromScale(1, 1)
						title.BackgroundTransparency = 1
						title.Text = spec.name
						title.TextSize = 13
						title.Font = Enum.Font.GothamBold
						title.TextColor3 = C(255, 236, 200)
						title.TextStrokeTransparency = 0.4
						title.Parent = label
					end
					table.insert(walkers, { model = figure, base = figure:GetPivot(), mode = "stay", kind = spec.work[1],
						phase = rng:NextNumber(0, 10), job = spec.job, workKinds = spec.work,
						tradeKinds = spec.work, leisureKinds = spec.rest, royalDuty = true, nightKinds = spec.night })
				end
			end
		end
		folder:SetAttribute("RoyalCourtVisible", courtVisible)
		folder:SetAttribute("RoyalDistrictStyle", courtStyle)
		folder:SetAttribute("RoyalDistrictWidth", math.floor(wide))
		folder:SetAttribute("RoyalDistrictTier", palaceTier)
		folder:SetAttribute("RoyalCourtPopulation", courtStaff)
		-- [왕궁 경기병 2명] 이미 등록된 말 모델을 이용해 기마 경호 실루엣을 만든다.
		-- 두 명은 지역별 복색의 순수 연출 근위대이며 세계경제 인구·군사 유닛·저장값에는 포함되지 않는다.
		local cavalryTitle = if korean then "조선 기마 근위" elseif key == "japan" then "성곽 기마 호위"
			elseif key == "china" then "관아 기마 호위" elseif islamic then "궁정 기마 친위"
			elseif indian or southeast then "왕실 기마 호위" else "궁정 경기병"
		local cavalryCoat = if korean or key == "china" then C(53, 78, 108)
			elseif key == "japan" then C(81, 65, 98) elseif islamic then C(52, 113, 101)
			elseif westAfrican or tropical then C(148, 94, 52) else C(68, 89, 125)
		local cavalryVisible, mountedVisible = 0, 0
		for i, side in { -1, 1 } do
			local at = Vector3.new(frontX + 62, 0, side * 49)
			local horse = if AssetIds["Animals/horse"] then importedModel(folder, "Animals", "horse", at, 4.1, false) else nil
			local saddleY = 0
			if horse then
				local box, span = horse:GetBoundingBox()
				saddleY = math.max(1.5, box.Position.Y + span.Y * 0.13)
				horse.Name = "RoyalLightCavalryHorse_" .. i
				horse:SetAttribute("ShowcaseOnly", true)
			end
			local rider = villager(folder, at + Vector3.new(0, saddleY, 0), math.pi, cavalryCoat, rng, "Knight", true, {
				year = info.year or currentYear, profession = "royal_light_cavalry", companion = true,
				female = i == 2, bodyType = "athletic", motionStyle = "disciplined", noHat = true,
			})
			if rider then
				cavalryVisible += 1
				if horse then mountedVisible += 1 end
				rider.Name = "RoyalLightCavalry_" .. i
				rider:SetAttribute("Job", "royal_light_cavalry")
				rider:SetAttribute("Workplace", cavalryTitle)
				rider:SetAttribute("CavalryMounted", horse ~= nil)
				rider:SetAttribute("ShowcaseOnly", true)
				local headPart = rider:FindFirstChild("Head")
				if headPart then sign(folder, headPart, cavalryTitle, C(228, 213, 177), 4, true) end
				table.insert(walkers, { model = rider, base = rider:GetPivot(), mode = if horse then "royal_rider" else "stay",
					kind = if horse then "sit" else "salute", phase = i * 2.3 })
			end
		end
		folder:SetAttribute("RoyalLightCavalryVisible", cavalryVisible)
		folder:SetAttribute("RoyalLightCavalryMounted", mountedVisible)
	end

	-- 성당 종탑 (유럽·식민지 문화권만. 다른 문화권은 지역 대표 건축물을 따로 세운다)
	if CHURCH_KEYS[currentKey] and sceneLevel < 2 then
		local cx, cz = -215, 42
		part(folder, Vector3.new(8, 30, 8), CFrame.new(cx, 15, cz), if style == STYLE.med then Color3.fromRGB(230, 214, 180) else Color3.fromRGB(140, 130, 120), Enum.Material.Brick)
		wedge(folder, Vector3.new(8, 10, 4), CFrame.new(cx, 35, cz - 2), Color3.fromRGB(60, 80, 70))
		wedge(folder, Vector3.new(8, 10, 4), CFrame.new(cx, 35, cz + 2) * CFrame.Angles(0, math.pi, 0), Color3.fromRGB(60, 80, 70))
		part(folder, Vector3.new(16, 14, 24), CFrame.new(cx - 12, 7, cz), if style == STYLE.med then Color3.fromRGB(236, 224, 196) else Color3.fromRGB(150, 140, 128), Enum.Material.Brick)
	end

	-- 암스테르담·안트베르펀·함부르크에는 풍차
	if info.portId == "amsterdam" or info.portId == "antwerp" or info.portId == "hamburg" then
		local mx, mz = -209, -87
		part(folder, Vector3.new(14, 10, 10), CFrame.new(mx, 7, mz) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(110, 80, 60), Enum.Material.WoodPlanks, Enum.PartType.Cylinder)
		local hub = part(folder, Vector3.new(1, 1, 1), CFrame.new(mx + 5.5, 12, mz), Color3.fromRGB(60, 40, 30))
		hub.Name = "MillHub"
		for k = 0, 3 do
			local blade = part(folder, Vector3.new(0.4, 12, 2.2), CFrame.new(mx + 5.8, 12, mz) * CFrame.Angles(math.rad(k * 90), 0, 0) * CFrame.new(0, 6, 0), Color3.fromRGB(230, 220, 200), Enum.Material.Fabric)
			blade.Name = "MillBlade"
		end
	end

	-- (수상한 손님은 이제 주점에서 만난다)
	-- 광장 인구는 세계경제 거주자 표본을 그대로 사용한다.
	local plazaStartIndex = #walkers
	local plazaResidents = if info.sim then math.clamp(math.floor((info.sim.residents or 6) / 12), 1, 4) else 4
	for _ = 1, plazaResidents do
		local v = villager(folder, Vector3.new(rng:NextNumber(-60, 8), 0, rng:NextNumber(-14, 14)), rng:NextNumber(0, math.pi * 2), Color3.fromRGB(rng:NextInteger(60, 200), rng:NextInteger(60, 160), rng:NextInteger(40, 140)), rng)
		if v then
			table.insert(walkers, { model = v, base = v:GetPivot(), len = rng:NextNumber(8, 18), speed = rng:NextNumber(1.6, 2.6), phase = rng:NextNumber(0, 10) })
		end
	end
	-- [Studio 전용] 기존 광장 주민 2명을 활용한 R15 모션 대련 테스트.
	-- 실제 전투 판정·체력·저장·경제에는 영향을 주지 않으며 라이브에서는 실행하지 않는다.
	local sparring = if RunService:IsStudio() and #walkers - plazaStartIndex >= 2
		then { walkers[plazaStartIndex + 1], walkers[plazaStartIndex + 2] } else nil
	if sparring then
		folder:SetAttribute("R15SparringTest", true)
		-- 스튜디오 전용 독립 모션 무대: 항구 장애물과 분리하고 기존 주민 모델만 재사용한다.
		folder:SetAttribute("R15SparringStage", Vector3.new(0, 120, 0))
		for _, fighter in sparring do
			fighter.mode = "sparring"
		end
		print("[MareEssentia] 항구 R15 대련 테스트 시작: 기존 주민 2명")
	elseif RunService:IsStudio() then
		warn("[MareEssentia] 항구 R15 대련 테스트 불가: 주민 모델 2명 미만")
	end
	-- 주민이 광장을 천천히 오간다 (끝에서 몸을 돌려 되돌아온다)
	-- 공식 Motor6D.Transform 적용 시점: Animator 갱신 후, 물리 처리 직전.
	local walkConn = RunService.PreSimulation:Connect(function(deltaTime)
		local now = os.clock()
		local dt = math.clamp(tonumber(deltaTime) or 1 / 60, 0, 0.1)
		for _, w in walkers do
			if w.mode == "sparring" and w.model.Parent and sparring then
				local side = if w == sparring[1] then -1 else 1
				local center = folder:GetAttribute("R15SparringStage") or ((sparring[1].base.Position + sparring[2].base.Position) * 0.5)
				local offset = Vector3.new(side * 2.5, 0, 0)
				local position = Vector3.new(center.X + offset.X, center.Y, center.Z)
				local target = Vector3.new(center.X - offset.X, position.Y, center.Z)
				w.model:PivotTo(CFrame.lookAt(position, target))
				-- 두 주민이 한 번씩 번갈아 공격하고 상대는 방어·피격 반응을 한다.
				local showcase = folder:GetAttribute("R15MotionShowcase")
				local selected = folder:GetAttribute("R15MotionState")
				local cycle = now % 3.2
				local attacking = if cycle < 1.6 then side < 0 else side > 0
				local phase = cycle % 1.6
				local action = if attacking then (if phase < 0.35 then "guard" elseif phase < 1.05 then "attack" else "guard") else (if phase < 0.7 then "guard" elseif phase < 1.1 then "hurt" else "guard")
				local progress = if action == "attack" then (phase - 0.35) / 0.7 elseif action == "hurt" then (phase - 0.7) / 0.4 else 0
				if showcase and type(selected) == "string" then
					action = selected
					progress = (math.sin(now * 2.5) + 1) * 0.5
				end
				if not Pose.makeR15Action(w.model, action, progress, now) and not w.motionWarned then
					w.motionWarned = true
					warn("[MareEssentia] 항구 R15 대련 모션 적용 실패:", w.model.Name)
				end
			elseif w.mode == "royal_rider" then
				-- [경기병 착석] 정지 기마 경호는 R15 관절만 갱신하고 말·동선·판정을 이동시키지 않는다.
				if w.model.Parent then
					local camera = workspace.CurrentCamera
					if not camera or (camera.CFrame.Position - w.base.Position).Magnitude < 180 then
						Pose.work(w.model, "sit", now + w.phase)
					end
				end
			elseif w.mode == "schedule" then
				if w.model.Parent then
					local hour = game:GetService("Lighting").ClockTime
					local where, routine
					if hour < 10 then
						where, routine = w.morning, if hour >= 6 then "work" else "rest"
					elseif hour < 12 then
						where, routine = w.morning:Lerp(w.market, (hour - 10) / 2), "trade"
					elseif hour < 17 then
						where, routine = w.market, "trade"
					elseif hour < 19 then
						where, routine = w.market:Lerp(w.evening, (hour - 17) / 2), "leisure"
					elseif hour < 22 then
						where, routine = w.evening, "leisure"
					elseif hour < 23 then
						where, routine = w.evening:Lerp(w.morning, hour - 22), "rest"
					else
						where, routine = w.morning, "rest"
					end
					local delta = where - (w.lastPos or where)
					local moving = delta.Magnitude > 0.025
					-- [마을 주민 정면] 멈춘 사람은 마지막 이동 방향을 유지한다.
					-- 월드 +Z로 강제 회전하면 일부 주민이 앞서 바라보던 방향과 반대로 서게 된다.
					local forward = if moving then delta.Unit else (w.lastFacing or w.base.LookVector)
					if moving then w.lastFacing = forward end
					w.model:PivotTo(CFrame.lookAt(where, where + forward))
					w.lastPos = where
					if w.lastRoutine ~= routine then
						w.lastRoutine = routine
						w.model:SetAttribute("DailyRoutine", routine)
					end
					local camera = workspace.CurrentCamera
					if not camera or (camera.CFrame.Position - where).Magnitude < 180 then
						if moving then
							Pose.makeR15Action(w.model, "walk", 0, (now + w.phase) * 3)
						else
							Pose.work(w.model, if routine == "work" then "count" elseif routine == "trade" then "offer"
								elseif routine == "leisure" then w.socialKind else "stretch", now + w.phase)
						end
					end
				end
			elseif w.mode == "stay" then
				if w.model.Parent then
					-- [주민 시선] 실제 플레이어가 다가오면 얼굴을 돌린다. 스튜디오 사진 구도에서는 카메라를 향한다.
					-- 기존 대화·직업 행동은 유지하고, 화면 카메라가 멀리 있는 3인칭 시점에서도 주민이 등을 돌리지 않는다.
					local kind, target = w.kind, 0
					local cam = workspace.CurrentCamera
					local character = Players.LocalPlayer and Players.LocalPlayer.Character
					local guestRoot = character and character:FindFirstChild("HumanoidRootPart")
					local focus = if workspace:GetAttribute("ShotCF") and cam then cam.CFrame.Position
						elseif guestRoot then guestRoot.Position elseif cam then cam.CFrame.Position else nil
					local p0 = w.base.Position
					local flat = if focus then Vector3.new(focus.X - p0.X, 0, focus.Z - p0.Z) else Vector3.zero
					-- 마을 주민끼리 실제로 가까이 서 있는 쌍만 대화와 물건 주고받기 모션을 맞춘다.
					-- 짝 탐색은 모델마다 최초 한 번만 한다(모바일에서 매 프레임 전체 탐색 금지).
					if w.kind == "talk" and w.socialPartner == nil then
						w.socialPartner = false
						for _, other in walkers do
							if other ~= w and other.mode == "stay" and other.kind == "talk" and other.model.Parent
								and (other.base.Position - p0).Magnitude < 11 then
								w.socialPartner = other
								break
							end
						end
					end
					local direction = flat
					local partner = w.socialPartner
					if partner and partner.model.Parent then
						local toward = partner.base.Position - p0
						direction = Vector3.new(toward.X, 0, toward.Z)
						target = 0.82
						-- 같은 위상으로 두 주민이 주는 사람/받는 사람 역할을 나눠 움직인다.
						local give = p0.X < partner.base.Position.X or (p0.X == partner.base.Position.X and p0.Z < partner.base.Position.Z)
						local social = now % 20
						kind = if social < 6 then (if give then "talk" else "nod")
							elseif social < 10 then (if give then "offer" else "receive")
							elseif social < 16 then (if give then "listen" else "talk")
							else "inspect"
					end
					-- [주민 정면] 대화·장터 주민은 가까운 플레이어를 향해 자연스럽게 돌아선다.
					-- 이동·일손(농사·대장간·요리)의 본래 진행 방향은 보존하고, 대화 상대가 있으면 더 가까운 손님에게만 인사한다.
					local nearGuest = flat.Magnitude > 1 and flat.Magnitude < 26
					local canFaceGuest = w.kind == "talk" or w.kind == "stall" or w.kind == "look" or w.kind == nil
					if nearGuest and canFaceGuest and (not partner or flat.Magnitude < 12) then
						target, direction = 1, flat
						if (now + w.phase * 1.7) % 13 < 2.6 then kind = "wave" end
					elseif nearGuest and (now + w.phase * 1.7) % 13 < 2.6 then
						kind, target, direction = "wave", 0.85, flat
					end
					-- [주민 시선·몸통 회전] 화면 초당 프레임과 무관한 감속 회전.
					w.ga = (w.ga or 0) + (target - (w.ga or 0)) * (1 - math.exp(-6 * dt))
					if w.ga > 0.01 and direction.Magnitude > 0.01 then
						w.model:PivotTo(w.base:Lerp(CFrame.lookAt(p0, p0 + direction.Unit), w.ga))
					elseif w.ga ~= 0 and target == 0 then
						w.ga = 0
						w.model:PivotTo(w.base)
					end
					if kind == "talk" and not partner then
						local social = (now + w.phase * 2.3) % 19
						kind = if social < 5 then "talk" elseif social < 9 then "listen" elseif social < 12 then "point" elseif social < 15 then "inspect" else "talk"
					elseif kind == "look" then
						local cycle = (now + w.phase * 4) % 23
						kind = if cycle < 2.0 then "salute"
							elseif cycle < 5.0 then "look"
							elseif cycle < 7.2 then "listen" else "look"
					end
					-- [하루 일과] 같은 사람은 같은 직업을 유지하고 출근/작업/점검/휴식/여가 동작만 교대한다.
					-- 현재 항구의 게임 시각을 사용하고 매 프레임 자산/소품을 다시 생성하지 않는다.
					if w.job and w.workKinds and w.leisureKinds then
						local hour = game:GetService("Lighting").ClockTime
						local morning = hour >= 6 and hour < 11
						local trading = hour >= 11 and hour < 18
						local period = math.floor((now + w.phase * 2.1) / 16)
						local watching = w.royalDuty and w.nightKinds and (hour >= 19 or hour < 6)
						local royalDay = w.royalDuty and hour >= 6 and hour < 19
						local roster = if watching then w.nightKinds elseif royalDay or morning then w.workKinds
							elseif trading then w.tradeKinds or w.workKinds else w.leisureKinds
						kind = roster[(period % #roster) + 1]
						if morning and not w.royalDuty and (now + w.phase) % 73 > 61 then kind = "stretch" end
						local routine = if watching then "night_watch" elseif royalDay or morning then "work"
							elseif trading then "trade" else "leisure"
						if w.lastRoutine ~= routine then
							w.lastRoutine = routine
							w.model:SetAttribute("DailyRoutine", routine)
						end
						if w.lastActivity ~= kind then
							w.lastActivity = kind
							w.model:SetAttribute("Activity", kind)
						end
					elseif w.kind == "hammer" or w.kind == "hoe" or w.kind == "stir" or w.kind == "sweep" or w.kind == "write" then
						local workCycle = (now + w.phase * 1.7) % 17
						if workCycle >= 14.5 then kind = "stretch"
						elseif workCycle >= 12.5 then kind = "inspect" end
					end
					if kind == "stoop" then
						-- 허리를 굽히기만 하는 모션이 이전 인사 자세의 팔을 남기지 않게 초기화.
						Pose.makeR15Action(w.model, "idle", 0, now + w.phase)
					end
					-- 궁정·공방은 멀리 있을 때 인구·직업 속성은 유지하되 관절 업데이트만 생략.
					if not (w.industryDuty or w.royalDuty) or not cam or (cam.CFrame.Position - p0).Magnitude < 170 then
						Pose.work(w.model, kind, now + w.phase)
					end
				end
			elseif w.mode == "animal" then
				if w.model.Parent then
					local t = now + w.phase
					-- 가축 전신을 앞뒤로 숙이면 FBX별 기준축 차이 때문에 뒤집히므로 Y축 회전만 사용한다.
					local bob = math.abs(math.sin(t * (w.gait or 7))) * 0.055
					if w.akind == "graze" then bob *= 0.35 end
					if w.span then
						local u = t * w.rate
						local v = math.cos(u)
						local go = math.abs(v)
						local want = if v < 0 then math.pi else 0
						-- 최단 회전 호를 사용하여 뒤돌 때 360도 회전/역주행이 생기지 않는다.
						local hd = w.hd or 0
						local angle = math.atan2(math.sin(want - hd), math.cos(want - hd))
						hd += angle * math.clamp(dt * 6, 0, 1)
						w.hd = hd
						w.model:PivotTo(w.base * CFrame.new(0, bob * go, -math.sin(u) * w.span) * CFrame.Angles(0, hd, 0))
					else
						w.model:PivotTo(w.base * CFrame.new(0, bob * 0.5, 0))
					end
				end
			elseif w.mode == "circle" then
				if w.model.Parent then
					local a = (now + w.phase) * w.speed / w.r
					-- [아이 발 접지] 분수 주변 달리기의 중심 Y를 바닥(0)이 아닌 최초 R15 리그 중심으로 유지한다.
					local floorY = w.base.Position.Y
					local pos = Vector3.new(w.cx + math.cos(a) * w.r, floorY, w.cz + math.sin(a) * w.r)
					local hop = 0
					local ahead = Vector3.new(w.cx + math.cos(a + 0.1) * w.r, floorY, w.cz + math.sin(a + 0.1) * w.r)
					w.model:PivotTo(CFrame.lookAt(pos + Vector3.new(0, hop, 0), ahead + Vector3.new(0, hop, 0)))
					Pose.makeR15Action(w.model, "walk", 0, (now + w.phase) * w.speed * (2 * math.pi / 5.2))
					-- [아이 생활동작] 걷기 관절은 유지하고 손짓·주변 시선만 드물게 얹는다.
					local play = (now + w.phase * 1.9) % 21
					if play < 1.8 then
						Pose.work(w.model, "wave", now + w.phase, true)
					elseif play < 3.8 then
						Pose.work(w.model, "look", now + w.phase, true)
					end
				end
			elseif w.model.Parent then
				-- [교역로 생활시간] 실제 화물 짐꾼은 낮에 일하고 야간에는 원래 위치에서 쉰다.
				local hour = game:GetService("Lighting").ClockTime
				if w.goodId and (hour < 6 or hour >= 20) then
					w.model:PivotTo(w.base)
					Pose.makeR15Action(w.model, "idle", 0, now + w.phase)
					Pose.work(w.model, "stretch", now + w.phase)
				else
				-- 끝에 닿으면 잠시 멈춰 서서(대화·둘러보기) 천천히 몸을 돌린 뒤 되돌아간다
				local cycle = w.len / w.speed
				local dwell = w.dwell or 2.2
				local total = (cycle + dwell) * 2
				local t = (now + w.phase) % total
				local d, yaw, moving = 0, 0, true
				local function ease(x) x = math.clamp(x, 0, 1) return x * x * (3 - 2 * x) end
				-- 출발·멈춤 때 속도가 갑자기 튀지 않게 천천히 가속·감속한다(속도는 가운데에서 가장 빠름)
				local function sm(x) x = math.clamp(x, 0, 1) return x * x * x * (x * (x * 6 - 15) + 10) end
				if t < cycle then
					d = sm(t / cycle) * w.len
				elseif t < cycle + dwell then
					d, yaw, moving = w.len, math.pi * ease((t - cycle) / (dwell * 0.6)), false
				elseif t < 2 * cycle + dwell then
					d, yaw = (1 - sm((t - cycle - dwell) / cycle)) * w.len, math.pi
				else
					d, yaw, moving = 0, math.pi + math.pi * ease((t - 2 * cycle - dwell) / (dwell * 0.6)), false
				end
				local rot = w.base - w.base.Position
				local pos = w.base.Position + w.base.LookVector * d
				local bob = 0 -- 위아래 흔들림은 걸음 모션(Pose)이 발걸음과 맞춰 처리한다
				w.model:PivotTo(CFrame.new(pos + Vector3.new(0, bob, 0)) * CFrame.Angles(0, yaw, 0) * rot)
				-- [주민 출발·정지] 출발/도착 지점에서 실제로 멈췄으면 제자리 발질을 하지 않는다.
				local walked = math.abs(d - (w.lastD or d))
				w.lastD = d
				moving = moving and walked > 0.006
				if moving then
					w.trav = (w.trav or 0) + walked
					Pose.makeR15Action(w.model, "walk", 0, w.trav * (2 * math.pi / 5.2))
				else
					Pose.makeR15Action(w.model, "idle", 0, now * w.speed + w.phase)
				end
				if not moving then
					Pose.work(w.model, w.idleKind or IDLE_POOL[(math.floor((now + w.phase * 7) / 7) % #IDLE_POOL) + 1], now + w.phase)
				elseif w.kind then
					Pose.work(w.model, w.kind, now + w.phase, true)
				elseif w.elder then
					-- [노인 보행] 굽은 자세만 합성하고 양쪽 다리·발목의 이동거리 기반 보행을 유지한다.
					Pose.work(w.model, "stoop", now, true)
				end
				end -- 새벽·야간 휴식, 기존 보행 동작은 낮에만 실행
			end
		end
	end)
	folder.Destroying:Connect(function()
		walkConn:Disconnect()
	end)
	-- 발전도에 맞춰 큰길 가로등 간격을 좁힌다. 1단계는 등불 없이 유지한다.
	local streetLampStep = PortBuildings.StreetGrowth[sceneLevel].lampStep
	if streetLampStep > 0 then
	for x = -40, 10, streetLampStep do
		for side = -1, 1, 2 do
			part(folder, Vector3.new(0.5, 7, 0.5), CFrame.new(x, 3.5, side * 7), Color3.fromRGB(40, 40, 44), Enum.Material.Metal)
			local bulb = part(folder, Vector3.new(1, 1, 1), CFrame.new(x, 7.2, side * 7), Color3.fromRGB(255, 220, 140), Enum.Material.Neon)
			local glow = Instance.new("PointLight")
			glow.Color = Color3.fromRGB(255, 214, 140)
			glow.Range = 14
			glow.Brightness = 0.5
			glow.Parent = bulb
		end
	end
	end

	-- 항구 다듬기 -------------------------------------------------------------
	-- 지역 하늘색을 일출·한낮·황혼·밤의 전환과 함께 보존한다.
	local Lighting = game:GetService("Lighting")
	local LOOK = {
		north = { amb = Color3.fromRGB(116, 122, 140), haze = Color3.fromRGB(192, 206, 226), dens = 0.36 },
		med = { amb = Color3.fromRGB(132, 124, 118), haze = Color3.fromRGB(224, 214, 196), dens = 0.28 },
		iberia = { amb = Color3.fromRGB(138, 122, 108), haze = Color3.fromRGB(236, 210, 176), dens = 0.28 },
		italy = { amb = Color3.fromRGB(134, 124, 114), haze = Color3.fromRGB(230, 212, 188), dens = 0.28 },
		ottoman = { amb = Color3.fromRGB(142, 120, 100), haze = Color3.fromRGB(240, 206, 160), dens = 0.30 },
		swahili = { amb = Color3.fromRGB(136, 122, 100), haze = Color3.fromRGB(236, 214, 168), dens = 0.30 },
		malabar = { amb = Color3.fromRGB(134, 122, 104), haze = Color3.fromRGB(238, 208, 160), dens = 0.32 },
		japan = { amb = Color3.fromRGB(128, 116, 126), haze = Color3.fromRGB(218, 200, 214), dens = 0.40 },
		colonial = { amb = Color3.fromRGB(122, 122, 118), haze = Color3.fromRGB(210, 220, 214), dens = 0.30 },
		desert = { amb = Color3.fromRGB(140, 124, 100), haze = Color3.fromRGB(240, 220, 176), dens = 0.30 },
		tropic = { amb = Color3.fromRGB(104, 124, 116), haze = Color3.fromRGB(186, 230, 224), dens = 0.26 },
		china = { amb = Color3.fromRGB(132, 116, 112), haze = Color3.fromRGB(230, 200, 196), dens = 0.36 },
		seasia = { amb = Color3.fromRGB(108, 124, 108), haze = Color3.fromRGB(200, 226, 196), dens = 0.34 },
		pacific = { amb = Color3.fromRGB(110, 128, 132), haze = Color3.fromRGB(190, 232, 236), dens = 0.20 },
		wafrica = { amb = Color3.fromRGB(132, 116, 96), haze = Color3.fromRGB(236, 200, 150), dens = 0.30 },
		creole = { amb = Color3.fromRGB(128, 122, 120), haze = Color3.fromRGB(240, 214, 200), dens = 0.28 },
	}
	local look = LOOK[currentKey] or LOOK.med
	do
		local econ = info.econ
		if econ == "depression" or econ == "bust" then
			look = { amb = look.amb:Lerp(Color3.fromRGB(110, 112, 118), 0.5), haze = look.haze:Lerp(Color3.fromRGB(170, 172, 180), 0.55), dens = look.dens + 0.08 }
		end
	end
	Lighting.GlobalShadows = true
	local atmos = Lighting:FindFirstChild("MareAtmosphere")
	if not atmos then
		atmos = Instance.new("Atmosphere")
		atmos.Name = "MareAtmosphere"
		atmos.Parent = Lighting
	end
	atmos.Offset = 0.2
	atmos.Decay = Color3.fromRGB(120, 140, 170)
	if not Lighting:FindFirstChild("MareGrade") then
		local cc = Instance.new("ColorCorrectionEffect")
		cc.Name = "MareGrade"
		cc.Parent = Lighting
		local bloom = Instance.new("BloomEffect")
		bloom.Name = "MareBloom"
		bloom.Size = 28
		bloom.Parent = Lighting
		local rays = Instance.new("SunRaysEffect")
		rays.Name = "MareRays"
		rays.Spread = 0.6
		rays.Parent = Lighting
	end

	-- 안전망: 어떤 이유로든 바다나 허공으로 떨어지면 광장으로 되돌린다
	do
		local conn
		conn = RunService.Heartbeat:Connect(function()
			if not folder.Parent then
				conn:Disconnect()
				return
			end
			if workspace:GetAttribute("VoyageActive") or workspace:GetAttribute("ShotCF") then
				return
			end
			local char = Players.LocalPlayer and Players.LocalPlayer.Character
			local hrp = char and char:FindFirstChild("HumanoidRootPart")
			if hrp and hrp.Position.Y < -12 and hrp.Position.X < 1000 then
				hrp.AssemblyLinearVelocity = Vector3.zero
				char:PivotTo(CFrame.new(-6, 6, 10))
			end
		end)
	end
	-- 한낮의 열기, 새벽 해무, 황혼의 따뜻한 빛과 야간 등불을 같은 시간축에 맞춘다.
	local latitude = (PortData.Ports[info.portId] or {}).lat or 0
	local temperate = math.abs(latitude) >= 25 and not warmShore
	local cold = math.abs(latitude) >= 39 and not warmShore
	local seasons = {
		{ tint = C(221, 236, 255), ground = C(190, 207, 211), sea = C(47, 83, 109), sun = 0.065, day = 9.3, haze = 1.55 },
		{ tint = C(240, 255, 233), ground = C(102, 141, 78), sea = C(41, 125, 145), sun = 0.12, day = 12, haze = 1.18 },
		{ tint = C(255, 238, 200), ground = C(138, 140, 80), sea = C(34, 126, 169), sun = 0.26, day = 14.4, haze = 1.8 },
		{ tint = C(255, 220, 186), ground = C(158, 113, 64), sea = C(46, 100, 130), sun = 0.11, day = 11.5, haze = 1.4 },
	}
	local seasonIndex, season
	local ground = plate or folder:FindFirstChild("Ground")
	local snowAnchor, snow
	if cold then
		snowAnchor = part(folder, Vector3.new(60, 0.25, 60), CFrame.new(0, 24, 0), Color3.new(1, 1, 1))
		snowAnchor.Transparency = 1
		snowAnchor.CanCollide, snowAnchor.CanQuery, snowAnchor.CanTouch = false, false, false
		snowAnchor.CastShadow = false
		snow = Instance.new("ParticleEmitter")
		snow.Texture = "rbxasset://textures/particles/smoke_main.dds"
		snow.Rate = 0
		snow.Lifetime = NumberRange.new(2, 3.5)
		snow.Speed = NumberRange.new(3, 7)
		snow.Acceleration = Vector3.new(4, -3.8, 1)
		snow.EmissionDirection = Enum.NormalId.Bottom
		snow.SpreadAngle = Vector2.new(25, 25)
		snow.Size = NumberSequence.new(0.33, 0.18)
		snow.Transparency = NumberSequence.new(0.25, 0.9)
		snow.Color = ColorSequence.new(C(229, 243, 255))
		snow.LightEmission = 0.15
		snow.Parent = snowAnchor
	end

	local function setDay(day)
		local index = Voyage.season(tonumber(day) or 0, latitude)
		if seasonIndex == index then return end
		seasonIndex = index
		season = seasons[index]
		if ground and ground:IsA("BasePart") then
			local frosted = cold and index == 1
			-- 잔디 질감은 멀리서 어두운 회색으로 보여서 매끈한 재질에 밝은 풀색을 쓴다(눈 덮인 계절만 눈 질감)
			ground.Material = if frosted then Enum.Material.Snow else Enum.Material.SmoothPlastic
			local base = if frosted then season.ground elseif temperate then style.ground:Lerp(season.ground, 0.48) else style.ground
			ground.Color = if frosted then base else base:Lerp(Color3.fromRGB(122, 164, 84), 0.7)
		end
		water.Color = if temperate then season.sea else C(32, 118, 160):Lerp(season.sea, 0.25)
	end
	setDay(info.day)

	local grade = Lighting:FindFirstChild("MareGrade")
	local bloom = Lighting:FindFirstChild("MareBloom")
	local rays = Lighting:FindFirstChild("MareRays")
	local lights = {}
	local function registerLight(item)
		if item:IsA("PointLight") then
			table.insert(lights, { light = item, brightness = item.Brightness, range = item.Range })
		end
	end
	for _, item in folder:GetDescendants() do registerLight(item) end
	local lightConn = folder.DescendantAdded:Connect(registerLight)
	local updateAt = 0
	local climateConn = RunService.Heartbeat:Connect(function()
		local now = os.clock()
		if now < updateAt then return end
		updateAt = now + 0.10
		-- [조명 충돌 방지] 지상 탐험이 진행 중이면 항구의 주야 주기가 필드 조명을 덮어쓰지 않는다.
		if workspace:GetAttribute("VoyageActive") or workspace:GetAttribute("ShotCF") or workspace:FindFirstChild("FieldScene") then
			if snow then snow.Rate = 0 end
			return
		end
		local clock = (8.2 + (now - PORT_CLOCK_EPOCH) * 24 / 600) % 24
		local daylight = if temperate then season.day else 12
		local sunrise, sunset = 12 - daylight / 2, 12 + daylight / 2
		local day = math.clamp(math.min(clock - sunrise, sunset - clock) + 0.55, 0, 1)
		local night = 1 - day
		local dawn = math.max(0, 1 - math.abs(clock - sunrise) / 2)
		local dusk = math.max(0, 1 - math.abs(clock - sunset) / 2)
		local noon = math.max(0, 1 - math.abs(clock - 12) / 4)
		Lighting.ClockTime = clock
		Lighting.Brightness = 0.46 + 1.52 * day + season.sun * noon
		Lighting.Ambient = C(37, 44, 72):Lerp(look.amb, day * 0.62)
		Lighting.OutdoorAmbient = C(43, 52, 87):Lerp(look.amb, day)
		Lighting.ColorShift_Top = C(244, 248, 255):Lerp(C(255, 190, 136), dusk * 0.72)
		atmos.Color = C(79, 92, 127):Lerp(look.haze, day):Lerp(C(241, 177, 137), dusk * 0.43)
		atmos.Density = look.dens + dawn * 0.12 + (if cold and seasonIndex == 1 then 0.07 else 0)
		atmos.Glare = season.sun * day * noon
		atmos.Haze = season.haze + dawn * 1.5
		if grade then
			grade.TintColor = C(193, 214, 253):Lerp(season.tint, day):Lerp(C(255, 220, 192), dusk * 0.35)
			grade.Saturation = 0.09 - night * 0.16
			grade.Contrast = 0.04
		end
		if bloom then
			bloom.Threshold = 2.2 - night * 0.55
			bloom.Intensity = 0.17 + night * 0.12 + season.sun * noon
		end
		if rays then rays.Intensity = season.sun * day * (0.38 + noon * 0.62) end
		for _, entry in lights do
			if entry.light.Parent then
				entry.light.Brightness = entry.brightness * (0.16 + 2.15 * night)
				entry.light.Range = entry.range * (0.82 + 0.6 * night)
			end
		end
		if snow then
			local character = Players.LocalPlayer and Players.LocalPlayer.Character
			local root = character and character:FindFirstChild("HumanoidRootPart")
			if root then
				local center = root.Position
				snowAnchor.Position = Vector3.new(math.min(center.X, 18), 23, center.Z)
			end
			snow.Rate = if seasonIndex == 1 then 18 + dawn * 9 else 0
		end
	end)
	folder.Destroying:Connect(function()
		lightConn:Disconnect()
		climateConn:Disconnect()
	end)

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
			if palmOk(info.portId, style) then
				importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(13, 0, z), 6.5, false)
				importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(17, 0, z + 5), 6, false)
			else
				importedModel(folder, "Terrain", "tree-oak", Vector3.new(13, 0, z), 7, false)
				importedModel(folder, "Town", "tree", Vector3.new(17, 0, z + 5), 7, false)
			end
			importedModel(folder, "Naval", "grass-plant", Vector3.new(20, 0, z - 4), 2, false)
		end
	end
	-- [중앙 선착장] 같은 화물·도르래·초소를 모든 단계에 얹지 않고 실제 항만 발전에 맞춰 표시한다.
	do
		local cargoQuota = math.min(dockGrowth.cargo, if game:GetService("UserInputService").TouchEnabled then 6 else 10)
		for i, x in ipairs({ 30, 36, 44, 52 }) do
			if i > cargoQuota then break end
			importedModel(folder, "Naval", "chest", Vector3.new(x, 2, if i % 2 == 0 then 3.4 else -3.4), 2.4, false)
		end
		-- 3단계부터 상업 하역 설비가 늘어나며 4단계부터만 항만 경비포를 놓는다.
		if dockGrowth.tier >= 4 and dockGrowth.sidePier then
			importedModel(folder, "Naval", "cannon", Vector3.new(40, 2, -3.6), 3.4, false)
			if dockGrowth.tier >= 5 then
				importedModel(folder, "Naval", "cannon", Vector3.new(58, 2, 3.6), 3.4, false)
			end
		end
		if dockGrowth.hoists >= 1 then
			importedModel(folder, "Naval", "pulley-crate", Vector3.new(66, 2, 3.5), 4.2, false)
		end
		if dockGrowth.hoists >= 2 then
			importedModel(folder, "Naval", "pulley", Vector3.new(74, 2, -3.5), 4.8, false)
		end
		if cargoQuota >= 4 then
			importedModel(folder, "Naval", "cargo-pile-a", Vector3.new(28, 2, -3.2), 3.6, false)
		end
		if cargoQuota >= 6 then
			importedModel(folder, "Naval", "cargo-pile-b", Vector3.new(70, 2, 3.1), 3.8, false)
		end
		if cargoQuota >= 8 then
			importedModel(folder, "Cargo", "barrel", Vector3.new(82, 2, 3.3), 3.1, false)
		end
		if cargoQuota >= 10 then
			importedModel(folder, "Cargo", "barrel", Vector3.new(87, 2, -3.3), 2.8, false)
		end
		if dockGrowth.tier >= 2 then
			importedModel(folder, "Naval", "buoy", Vector3.new(105, 0.8, -25), 2.5, false)
		end
		if dockGrowth.tier >= 3 then
			importedModel(folder, "Naval", "buoy-flag", Vector3.new(112, 0.8, 25), 2.5, false)
		end
		if dockGrowth.boats >= 6 then
			importedModel(folder, "Naval", "boat-sail-a", Vector3.new(112, 0.8, 48), 14, false)
		end
		if dockGrowth.boats >= 8 then
			importedModel(folder, "Naval", "boat-fishing-small", Vector3.new(116, 0.8, -48), 10, false)
		end
	end
	-- 광장: 시장 가판대, 우물, 수레, 벤치
	do
		-- [장터 이전] 중앙광장 가판대 3개를 기존 서쪽 상업거리로 이동한다.
		for i, spot in { Vector3.new(-114, 0, -14), Vector3.new(-114, 0, 14), Vector3.new(-136, 0, 14) } do
			local marketStyle = if i % 2 == 0 then "stall-red" else "stall-green"
			if not importedModel(folder, "Town", marketStyle, spot, 6.5, false) then
				importedModel(folder, "Town", "stall", spot, 6.5, false)
			end
		end
		-- 가판대에는 이 항구의 특산품을 3D 모델로 진열한다 (교역 가격·재고·판정은 그대로).
		local made = (PortData.Ports[info.portId] and PortData.Ports[info.portId].produces) or {}
		local showcase = {}
		for i = 1, 12 do
			showcase[i] = made[(i - 1) % math.max(1, #made) + 1] or "cheese"
		end
		local stalls = { Vector3.new(-114, 2.5, -14), Vector3.new(-114, 2.5, 14), Vector3.new(-136, 2.5, 14) }
		for index, good in showcase do
			local stand = stalls[math.ceil(index / 4)]
			local mesh = GOOD_MESH[good]
			importedModel(folder, mesh[1], mesh[2], stand + Vector3.new(((index - 1) % 4 - 1.5) * 1.7, 0, 0), goodSize(good, 1.8), false, mesh[3])
		end
		-- 큰길 가로등과 울타리, 광장 분수
		if sceneLevel >= 3 then
			for _, x in { -30, -75, -120 } do
				lantern(folder, Vector3.new(x, 0, 7), 3)
				lantern(folder, Vector3.new(x, 0, -7), 3)
			end
		end
		if PortBuildings.StreetGrowth[sceneLevel].fountain then
			importedModel(folder, "Town", "fountain-square", Vector3.new(-108, 0, 122), 7, true)
		end
		importedModel(folder, "Town", "stall-bench", Vector3.new(-122, 0, 28), 4, false)
		importedModel(folder, "Town", "stall-stool", Vector3.new(-140, 0, 28), 2, false)
		-- 4~5단계 조선항 전용 경비탑: 둘째 잔교와 겹치지 않는 육지 쪽 위치에 배치.
		if PortData.Ports[info.portId] and PortData.Ports[info.portId].shipyard
			and dockGrowth.sidePier and dockGrowth.tier >= 4 then
			importedModel(folder, "Naval", "tower-complete-small", Vector3.new(10, 0, -75), 12, true)
			if dockGrowth.tier >= 5 then
				importedModel(folder, "Naval", "tower-complete-large", Vector3.new(10, 0, 75), 15, true)
			end
			importedModel(folder, "Castle", "flag-banner-long", Vector3.new(10, 0, -61), 5, false)
			if dockGrowth.tier >= 5 then
				importedModel(folder, "Castle", "flag-banner-long", Vector3.new(10, 0, 61), 5, false)
			end
		end
		-- [외곽 장터·우물] 중앙광장 소품도 전부 외곽 거리로 이동해 주민 이동 구역을 비운다.
		importedModel(folder, "Interior", "tablecrosscloth", Vector3.new(-148, 0, -32), 4.8, false)
		importedModel(folder, "Interior", "coatrack", Vector3.new(-36, 0, -45), 3.4, false)
		importedModel(folder, "Interior", "rugrounded", Vector3.new(-152, 0, -38), 4.8, false)
		importedModel(folder, "Town", "village-well", Vector3.new(-126, 0, 32), 5.5, true)
		importedModel(folder, "Town", "cart", Vector3.new(-158, 0, 32), 5.5, false)
		importedModel(folder, "Town", "cart", Vector3.new(-176, 0, -32), 5.5, false)
		importedModel(folder, "Town", "bench_A", Vector3.new(-100, 0, 30), 4.5, false)
		importedModel(folder, "Town", "bench_B", Vector3.new(-100, 0, -30), 4.5, false)
		for _, x in { -52, -74, -96, -118, -138 } do
			for side = -1, 1, 2 do
				-- 사막·열대·지중해 마을에는 소나무 대신 야자나무
				local warm = palmOk(info.portId, style)
				local pick = ({ "tree", "tree-high", "tree-crooked", "tree_large", "tree_tiny" })[rng:NextInteger(1, 5)]
				local at = Vector3.new(x + rng:NextNumber(-3, 3), 0, side * rng:NextNumber(10, 13))
				if warm then
					importedModel(folder, "Naval", "palm-detailed-straight", at, rng:NextNumber(5.5, 8), false)
				else
					importedModel(folder, "Town", pick, at, rng:NextNumber(6, 9), false)
				end
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

	-- 동료: 영입한 인물은 주인공과 같은 실제 머리~발 크기로 표시한다(서버 능력·저장 불변).
	local followers = {}
	do
		local hero = game:GetService("Players").LocalPlayer.Character
		local head = hero and hero:FindFirstChild("Head")
		local foot = hero and (hero:FindFirstChild("LeftFoot") or hero:FindFirstChild("RightFoot"))
		local heroHeight = if head and foot then math.clamp(
			(head.Position.Y + head.Size.Y * 0.5) - (foot.Position.Y - foot.Size.Y * 0.5), 5.3, 7.2) else 5.8
		local looks = {
			c_merian = { "Rogue", Color3.fromRGB(176, 96, 120), "inspect" }, c_halley = { "Knight", Color3.fromRGB(60, 80, 140), "point" },
			c_leeuwenhoek = { "Mage", Color3.fromRGB(110, 90, 70), "write" }, c_linnaeus = { "Rogue_Hooded", Color3.fromRGB(70, 120, 84), "inspect" },
			c_boyle = { "Mage", Color3.fromRGB(130, 70, 70), "count" }, c_papin = { "Barbarian", Color3.fromRGB(96, 100, 110), "stretch" },
			t_navigator = { "Knight", Color3.fromRGB(40, 90, 120), "salute" }, t_gunner = { "Barbarian", Color3.fromRGB(120, 60, 50), "salute" },
			t_purser = { "Rogue", Color3.fromRGB(90, 80, 50), "count" }, t_surgeon = { "Mage", Color3.fromRGB(230, 230, 235), "inspect" },
			t_helmsman = { "Knight", Color3.fromRGB(50, 70, 110), "look" }, t_mate = { "Rogue", Color3.fromRGB(120, 60, 80), "point" },
			t_boatswain = { "Barbarian", Color3.fromRGB(90, 70, 50), "stretch" }, t_master_gunner = { "Barbarian", Color3.fromRGB(140, 50, 50), "salute" },
		}
		for i, c in info.companions or {} do
			local look = looks[c.id] or { "Rogue", Color3.fromRGB(120, 100, 80) }
			local v = villager(folder, Vector3.new(-6 - i * 3, 0.18, 8 + i * 2), math.pi / 2,
				look[2], rng, look[1], true, {
					height = heroHeight, companion = true, profession = c.role,
					-- 명시된 성별 또는 기존 인물의 성별. 동료 능력/저장값은 그대로 둔다.
					female = c.female == true or c.gender == "female" or c.id == "c_merian"
						or c.id == "t_nun" or c.id == "t_bhikkhuni"
						or c.id == "t_mate" or c.id == "t_surgeon",
					bodyType = "athletic", noHat = true,
				})
			if v then
				v.Name = "Companion_" .. c.id
				v:SetAttribute("CompanionId", c.id) -- 항구에서만 동료 전용 달리기 관절을 강화한다.
				local tag = v:FindFirstChild("Head") or v:FindFirstChildWhichIsA("BasePart", true)
				-- [동료 이름표] 번호·직업 대신 영입 동료 이름을 표시한다.
				if tag then sign(folder, tag, tostring(c.name or c.role or "동료"), if i % 2 == 1 then Color3.fromRGB(125, 224, 255) else Color3.fromRGB(245, 207, 110), 4, true) end
				local at = v:GetPivot().Position
				table.insert(followers, { model = v, index = i, pos = Vector3.new(at.X, 0, at.Z), baseY = at.Y,
					footOffset = at.Y - 0.18, phase = i * 1.7, idleKind = look[3] or "look", gait = i * 0.3,
					speed = 0, heading = v:GetPivot().Rotation,
					leftFoot = v:FindFirstChild("LeftFoot"), rightFoot = v:FindFirstChild("RightFoot") })
			end
		end
	end
	-- 항구에 머무는 다른 항해자(상인·탐험가·군인 등): 광장 한쪽에 서 있다
	for i, v in info.voyagers or {} do
		if i > 3 then break end
		local look = if v.role == "탐험가" then { "Knight", Color3.fromRGB(70, 110, 90) }
			elseif v.role == "군인" then { "Barbarian", Color3.fromRGB(110, 60, 60) }
			elseif v.role == "순례 사제" then { "Mage", Color3.fromRGB(200, 190, 160) }
			elseif v.role == "해적" or v.role == "사략선장" then { "Barbarian", Color3.fromRGB(40, 40, 50) }
			else { "Rogue", Color3.fromRGB(150, 110, 60) }
		if v.id == "v_caleb" then look = { "Rogue_Hooded", Color3.fromRGB(30, 30, 38) } end
		local m = villager(folder, Vector3.new(16 + i * 5, 0, 14 - i * 3), -math.pi / 2, look[2], rng, look[1])
		if m then
			m.Name = "Voyager_" .. tostring(v.id)
			local tag = m:FindFirstChild("Head") or m:FindFirstChildWhichIsA("BasePart", true)
			if tag then sign(folder, tag, v.name .. " (" .. v.role .. ")", Color3.fromRGB(110, 80, 30), 4, true) end
		end
	end
	local followConn
	if #followers > 0 then
		local Players = game:GetService("Players")
		-- [항구 동료 지면 추적] 다른 NPC와 물·장식은 밟지 않고 실제 충돌 가능한 길·다리·선착장만 접지한다.
		local groundRay = RaycastParams.new()
		groundRay.FilterType = Enum.RaycastFilterType.Exclude
		groundRay.RespectCanCollide = true
		-- [동료 R15] 주민/전투와 동일한 공식 관절 적용 시점에서 보행·대기 모션을 갱신한다.
		followConn = RunService.PreSimulation:Connect(function(deltaTime)
			local now = os.clock()
			local dt = math.clamp(tonumber(deltaTime) or 1 / 60, 0, 0.1)
			-- [중복 소환 방지] 항구의 시각 동료는 탐험 중 추적을 멈춘다. 탐험용 FieldAlly만 전장에 존재한다.
			if workspace:FindFirstChild("FieldScene") then return end
			local char = Players.LocalPlayer and Players.LocalPlayer.Character
			local root = char and char:FindFirstChild("HumanoidRootPart")
			if not root then return end
			groundRay.FilterDescendantsInstances = { char }
			local look = Vector3.new(root.CFrame.LookVector.X, 0, root.CFrame.LookVector.Z)
			if look.Magnitude < 0.01 then look = Vector3.new(1, 0, 0) end
			look = look.Unit
			local right = Vector3.new(-look.Z, 0, look.X)
			for _, f in followers do
				if f.model.Parent then
					local side = if f.index % 2 == 0 then 1 else -1
					local target = root.Position - look * (4 + f.index * 1.6) + right * side * (2.6 + (f.index - 1) * 0.6)
					target = Vector3.new(target.X, 0, target.Z)
					local delta = target - f.pos
					local dist = delta.Magnitude
					-- [항구 동료 관성 추적] 시작·정지에 가감속을 넣어 실제 보폭과 몸 이동이 일치하게 한다.
					local desiredSpeed = if dist > 0.8 then math.min(16, 6 + dist * 1.5) else 0
					local acceleration = if desiredSpeed > f.speed then 5.5 else 9
					f.speed += (desiredSpeed - f.speed) * (1 - math.exp(-acceleration * dt))
					local walked = 0
					if dist > 60 then
						f.pos = target
						f.speed = 0
					elseif dist > 0.8 then
						walked = math.min(math.max(0, dist - 0.65), f.speed * dt)
						f.pos += delta.Unit * walked
					end
					local moving = walked > 0.005
					local faceDir = if moving then delta.Unit else look
					-- [발 접지] 주인공을 쫓는 경로의 바닥을 매 프레임 샘플링한다. 급경사·큰 장애물은 발판으로 보지 않는다.
					local surface = workspace:Raycast(Vector3.new(f.pos.X, f.baseY + 5, f.pos.Z),
						Vector3.new(0, -14, 0), groundRay)
					if surface and surface.Normal.Y > 0.7 then
						local wantedY = surface.Position.Y + f.footOffset + 0.015
						if math.abs(wantedY - f.baseY) < 2.5 then
							-- [실제 발 디딤] 양발 가운데 지면에 가까운 쪽이 뜨거나 잠기면 얕게 자세를 낮춘다.
							local soleCorrection = 0
							if f.leftFoot and f.rightFoot and f.leftFoot.Parent and f.rightFoot.Parent then
							local lowestSole = math.min(f.leftFoot.Position.Y - f.leftFoot.Size.Y * 0.5,
								f.rightFoot.Position.Y - f.rightFoot.Size.Y * 0.5)
							soleCorrection = math.clamp(surface.Position.Y + 0.015 - lowestSole, -0.14, 0.14)
							end
							f.baseY += (wantedY - f.baseY) * (1 - math.exp(-11 * dt))
								+ soleCorrection * (1 - math.exp(-7 * dt)) * 0.55
						end
					end
					local at = f.pos + Vector3.new(0, f.baseY, 0)
					-- [동료 추적] 몸 회전과 골반 방향은 급격히 꺾지 않도록 실제 이동 방향에 지연 보간한다.
					f.heading = f.heading:Lerp(CFrame.lookAt(Vector3.zero, faceDir).Rotation, 1 - math.exp(-6 * dt))
					f.model:PivotTo(CFrame.new(at) * f.heading)
					if moving then f.gait += walked * (2 * math.pi / 5.2) end
					-- [동료 걷기/달리기] 실측 이동속도로 달리기/걷기를 전환한다.
					local pace = if moving then walked / math.max(dt, 0.008) else 0
					Pose.makeR15Action(f.model, if not moving then "idle" elseif pace > 9 then "run" else "walk",
						0, if moving then f.gait else now + f.phase,
						if moving then math.clamp(pace / (if pace > 9 then 16 else 9), 0.15, 1) else 0)
					if not moving then
						local cycle = (now + f.phase * 3) % 26
						local idleKind = if cycle < 2.4 then "look"
							elseif cycle < 4.0 and f.index % 2 == 0 then "salute"
							elseif cycle > 22 and f.index % 2 == 1 then "stretch" else f.idleKind
						Pose.work(f.model, idleKind, now + f.phase)
					end
				end
			end
		end)
		folder.Destroying:Connect(function()
			followConn:Disconnect()
		end)
	end

	densify(folder, info, style, rng, walkers, (PortData.Ports[info.portId] and PortData.Ports[info.portId].produces) or {}, onFacility)
	placeLandmarks(folder, info, style, rng, onFacility, walkers)
	placeSignature(folder, info)

	-- [학문별 자동 3D 발전] 백과 기술이 실제 도입된 항구에만 기존 승인 모델로 산업·학술 구역을 조성한다.
	-- 지형·보행 도로·기존 시설 밖(-220 서쪽)의 고정 필지에 최대 8개만 설치해 모바일 부하를 제한한다.
	-- 모델이 미등록이면 기존 지역 건축 house 함수를 재사용한다. 신규 자산·저장키는 만들지 않는다.
	local techRows = info.sim and info.sim.technology and info.sim.technology.rows
	if type(techRows) == "table" then
		local models = {
			crop_rotation = { "Town", "watermill", 20 },
			guild_accounting = { "Town", "stall-red", 13 },
			navigation_charts = { "Naval", "tower-watch", 24 },
			public_schools = { "Town", "bell-tower", 23 },
			glassmaking = { "Town", "house", 19 },
			dry_dock = { "Naval", "structure-platform-dock", 23 },
			quarantine = { "Town", "house", 19 },
			merchant_banking = { "Town", "house", 21 },
			steam_pumping = { "Town", "watermill", 25 },
			scientific_farming = { "Town", "watermill", 20 },
			civic_hospitals = { "Town", "house", 24 },
			industrial_metallurgy = { "Town", "watermill", 28 },
			international_banking = { "Town", "house", 24 },
		}
		local shown = 0
		for idx = #techRows, 1, -1 do
			local node = techRows[idx]
			if node.status == "adopted" and models[node.id] and shown < 8 then
				local model = models[node.id]
				local col = shown % 4
				local row = math.floor(shown / 4)
				local at = Vector3.new(-232 - row * 31, 0, -111 + col * 74)
				-- 건선거는 기존 부둣가 바깥에 놓고, 다른 기술은 서쪽 산업지구에서 발전시킨다.
				if node.id == "dry_dock" then at = Vector3.new(72, 0, -137) end
				local body = importedModel(folder, model[1], model[2], at, model[3], true)
				if not body then
					body = house(folder, at, 19, 15, if node.id == "international_banking" then 3 else 2, style, rng)
				end
				if body then
					body.Name = "Civilization_" .. node.id
					local anchor = if body:IsA("BasePart") then body else body:FindFirstChildWhichIsA("BasePart", true)
					if anchor then sign(folder, anchor, node.name, nil, 13, true) end
				end
				if node.id == "steam_pumping" or node.id == "industrial_metallurgy" or node.id == "glassmaking" then
					local pipe = importedModel(folder, "Town", "chimney", at + Vector3.new(8, 11, 0), 9, false)
					if pipe then smokeOn(folder, at + Vector3.new(8, 19, 0)) end
				end
				shown += 1
			end
		end
	end


	-- [지역 브랜드 실제 건축] 기존 산업 2~4단계에 따라 실물 작업장 골조·실내·수출 하역이 성장한다.
	-- 원료/산업/시세는 Economy에서 온 상태만 읽고, 기존 원가/저장/상품 ID에는 관여하지 않는다.
	local industryLot = 0
	local industryBudget = if game:GetService("UserInputService").TouchEnabled then 3 else 6
	for _, industry in ipairs((info.sim and info.sim.industries) or {}) do
		if (tonumber(industry.stage) or 0) >= 2 and industryLot < industryBudget then
			industryLot += 1
			local row, col = math.floor((industryLot - 1) / 4), (industryLot - 1) % 4
			local at = Vector3.new(-175 + col * 35, 0, -280 - row * 40)
			local materialClass = Chains.ClassOf[industry.source]
			local brand = Chains.BrandById[industry.id]
			local recipe = brand and Chains.ById[brand.recipe]
			-- 실제 원료 유형과 기존 공정에 대응하는 등록된 작업 장비만 사용한다.
			local equipment = if materialClass == "mineral" then { "Town", "workbench-anvil" }
				elseif materialClass == "forest" then { "Town", "workbench-grind" }
				elseif materialClass == "farm" then { "Cargo", "mortar-pestle" }
				elseif materialClass == "fiber" or materialClass == "animal" then { "Cargo", "textiles-stack-small" }
				else { "Interior", "tablecross" }
			local sourceMesh = industry.source and GOOD_MESH[industry.source]
			-- 실제 가공품의 외관과 일치하는 등록된 메시만 완제품으로 표시한다.
			local finishedByRecipe = {
				r_cloth_wool = { "Cargo", "textiles-stack-small" },
				r_cloth_cotton = { "Cargo", "textiles-stack-small" },
				r_leather = { "Cargo", "leather" },
				r_aged_cheese = { "Cargo", "cheese" },
				r_fine_glass = { "Cargo", "glass" },
				r_vintage_wine = { "Cargo", "wine-red" },
				r_ginseng_medicine = { "Cargo", "ginseng" },
			}
			local finishedMesh = recipe and finishedByRecipe[recipe.id]
			local frame = importedModel(folder, "Town", "floor_base", at, 23, false)
			if frame then
				frame.Name = "LocalIndustry_" .. industry.id
				frame:SetAttribute("SourceGood", industry.source or "")
				frame:SetAttribute("IndustryStage", industry.stage)
				frame:SetAttribute("RawStock", industry.rawStock or 0)
				frame:SetAttribute("ProcessedStock", industry.processedStock or 0)
				frame:SetAttribute("Exported", industry.exported or 0)
				frame:SetAttribute("Produced", industry.produced or 0)
				frame:SetAttribute("ProcessRecipe", recipe and recipe.id or "")
				frame:SetAttribute("ProductionFlow", "raw-workshop-market-port")
				local wall = importedModel(folder, "Town", "kenney_wood_wall_01", at + Vector3.new(0, 0, -9), 20, true)
				for _, dx in { -10, 10 } do
					local wp = at + Vector3.new(dx, 0, 0)
					local side = importedModel(folder, "Town", "kenney_wood_wall_01", wp, 18, true)
					if side then rotateAround(side, wp, math.pi * 0.5) end
				end
				if industry.stage >= 3 then
					importedModel(folder, "Town", "kenney_roof_straight_green_01", at + Vector3.new(0, 9, 0), 22, false)
				end
				importedModel(folder, equipment[1], equipment[2], at + Vector3.new(5, 0, 0), 4.2, false)
				importedModel(folder, "Interior", "tablecross", at + Vector3.new(-4, 0, 0), 4.3, false)
				-- 입고 중인 진짜 원료 재고가 있을 때만 원료 진열을 만든다.
				if (industry.rawStock or 0) > 0 and sourceMesh and sourceMesh[2] ~= "box-open"
					-- 음료 잔·찻잔은 재배/입고 원료 모습이 아니므로 실제 원료로 표시하지 않는다.
					and industry.source ~= "coffee" and industry.source ~= "tea" and industry.source ~= "cocoa"
					and industry.source ~= "pepper" and industry.source ~= "beer"
					and AssetIds[sourceMesh[1] .. "/" .. sourceMesh[2]] then
					local goods = importedModel(folder, sourceMesh[1], sourceMesh[2],
						at + Vector3.new(-5, 0, 4), goodSize(industry.source, 3), false, sourceMesh[3])
					if goods then goods.Name = "IndustryRawMaterial_" .. industry.source end
				end
				-- 실제 가공품이 창고에 존재할 때만 그 가공품과 맞는 등록된 모델을 보여 준다.
				if industry.stage >= 3 and (industry.processedStock or 0) > 0 and finishedMesh
					and AssetIds[finishedMesh[1] .. "/" .. finishedMesh[2]] then
					local finished = importedModel(folder, finishedMesh[1], finishedMesh[2], at + Vector3.new(8, 0, 5), 2.8, false)
					if finished then
						finished.Name = "IndustryProcessed_" .. recipe.id
						finished:SetAttribute("ProcessedName", industry.processed or "")
					end
				end
				local anchor = wall and wall:FindFirstChildWhichIsA("BasePart", true)
					or frame:FindFirstChildWhichIsA("BasePart", true)
				if anchor then sign(folder, anchor, if industry.stage >= 3 then industry.name else industry.processed, nil, 12, true) end
				prompt(folder, at + Vector3.new(0, 3, 8), industry.name or "지역 산업", "공방 살펴보기", "trade", onFacility)
				-- 승인된 공방 장비 앞에서 실제 생산품에 해당하는 직업 모션으로 일한다.
				-- 산업마다 한 명만 생성하고 카메라 밖에서는 관절 애니메이션을 생략한다.
				local workKind = if materialClass == "mineral" then "forge" elseif materialClass == "fiber" then "sew"
					elseif materialClass == "forest" then "hammer" elseif recipe and recipe.disc == "brewing" then "stir"
					elseif materialClass == "farm" then "knead" else "inspect"
				local workPos = at + Vector3.new(5, 0, 5)
				local clothes = if PortData.Ports[info.portId] and PortData.Ports[info.portId].country == "korea" then OUTFIT.korea else (OUTFIT[currentKey] or OUTFIT.brick)
				local coat = (clothes.coats and clothes.coats[1]) or C(133, 106, 82)
				local worker = villager(folder, workPos, faceTo(workPos, at + Vector3.new(5, 0, 0)),
					coat, rng, if workKind == "forge" or workKind == "hammer" then "Barbarian" else "Rogue", true,
					{ year = info.year or currentYear, profession = "industry_artisan", hat = clothes.hat })
				if worker then
					worker.Name = "IndustryWorker_" .. industry.id
					worker:SetAttribute("Job", "industry_artisan")
					worker:SetAttribute("Workplace", industry.name or "지역 산업")
					worker:SetAttribute("SourceGood", industry.source or "")
					worker:SetAttribute("Activity", workKind)
					table.insert(walkers, { model = worker, base = worker:GetPivot(), mode = "stay", kind = workKind,
						phase = rng:NextNumber(0, 10), job = "industry_artisan", industryDuty = true,
						workKinds = { workKind, "inspect", "count" },
						tradeKinds = { "offer", "receive", "count" }, leisureKinds = { "stretch", "talk" } })
				end
				if industry.stage >= 3 then importedModel(folder, "Town", "cart", at + Vector3.new(-14, 0, 0), 6.5, false) end
				if industry.stage >= 4 then
					importedModel(folder, "Town", "cart", at + Vector3.new(15, 0, 0), 6.5, false)
					importedModel(folder, "Castle", "flag-banner-long", at + Vector3.new(0, 0, 11), 9, false)
				end
			end
		end
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

	-- [마을 주민·건축물 간섭] 완성된 마을에서 초기 위치와 실제 이동 궤적을 확인한다.
	-- 이동형·고정형·일과형 모두 생성 직후 한 번만 검사한다(프레임별 공간 질의 금지).
	local routeOk, routeError = pcall(function()
		local params = OverlapParams.new()
		params.FilterType = Enum.RaycastFilterType.Include
		params.FilterDescendantsInstances = { folder }
		local offsets = {
			Vector3.zero, Vector3.new(7, 0, 0), Vector3.new(-7, 0, 0),
			Vector3.new(14, 0, 0), Vector3.new(-14, 0, 0),
			Vector3.new(0, 0, 7), Vector3.new(0, 0, -7),
		}
		local function blocked(cf, length, actor)
			local half = math.max(0, length) / 2
			local box = cf * CFrame.new(0, 3.1, -half)
			for _, hit in workspace:GetPartBoundsInBox(box, Vector3.new(4.4, 5, length + 4), params) do
				local owner = hit:FindFirstAncestorOfClass("Model")
				if hit.CanCollide and hit.Name ~= "Ground" and hit.Name ~= "TownFloor"
					and hit.Name ~= "SafetyFloor" and hit.Size.Y >= 2
					and not (actor and hit:IsDescendantOf(actor))
					and not (owner and owner:FindFirstChildOfClass("Humanoid")) then
					return true
				end
			end
			return false
		end
		local relocated, stopped, inspected = 0, 0, 0
		for _, walker in walkers do
			if not walker.model.Parent or walker.mode == "sparring" or walker.mode == "animal" then
				continue
			end
			inspected += 1
			local original = walker.base
			local moving = walker.len and walker.len > 0 and (walker.mode == "path" or walker.mode == nil)
			local scheduled = walker.mode == "schedule" and walker.morning and walker.market and walker.evening
			local circling = walker.mode == "circle" and walker.cx and walker.cz and walker.r
			local safe
			for _, offset in offsets do
				-- [좌표 정합] 주민 위치와 일과형 경유지를 모두 세계 좌표로 평행 이동한다.
				local candidate = original + offset
				if circling then
					-- [아이·주민 원형 동선] 기존 8개 발걸음 위치를 한 번 검사해 분수·난간·가판대 안으로 들어가지 않는다.
					local clear = true
					for sample = 0, 7 do
						local angle = sample * math.pi / 4
						local point = CFrame.new(walker.cx + offset.X + math.cos(angle) * walker.r,
							candidate.Position.Y, walker.cz + offset.Z + math.sin(angle) * walker.r)
						if blocked(point, 0, walker.model) then clear = false; break end
					end
					if clear then
						safe = candidate
						walker.cx += offset.X
						walker.cz += offset.Z
						break
					end
				elseif scheduled then
					local morning, market, evening = walker.morning + offset, walker.market + offset, walker.evening + offset
					local function clearSegment(a, b)
						local step = b - a
						return step.Magnitude < 0.01 or not blocked(CFrame.lookAt(a, b), step.Magnitude, walker.model)
					end
					if not blocked(CFrame.new(morning), 0, walker.model)
						and not blocked(CFrame.new(market), 0, walker.model)
						and not blocked(CFrame.new(evening), 0, walker.model)
						and clearSegment(morning, market) and clearSegment(market, evening)
						and clearSegment(evening, morning) then
						safe = candidate
						walker.morning, walker.market, walker.evening = morning, market, evening
						break
					end
				elseif not blocked(candidate, if moving then walker.len else 0, walker.model) then
					safe = candidate
					break
				end
			end
			if not safe then
				-- 이동 경로가 막혔으면 빈 정지 위치를 찾고, 그것도 없으면 시각 NPC만 숨긴다.
				for _, offset in offsets do
					local candidate = original + offset
					if not blocked(candidate, 0, walker.model) then
						safe = candidate
						walker.mode, walker.kind = "stay", "look"
						stopped += 1
						break
					end
				end
			end
			if safe then
				if (safe.Position - original.Position).Magnitude > 0.1 then relocated += 1 end
				walker.base = safe
				-- [원형 동선 시작점] 첫 프레임 전에 분수 중심이 아닌 검증된 원 바깥 첫 발판에 놓는다.
				if walker.mode == "circle" then
					walker.model:PivotTo(CFrame.new(walker.cx + walker.r, safe.Position.Y, walker.cz) * (safe - safe.Position))
				else
					walker.model:PivotTo(safe)
				end
				walker.lastPos = safe.Position
			else
				walker.model:Destroy()
				stopped += 1
			end
		end
		folder:SetAttribute("NpcRouteChecked", inspected)
		folder:SetAttribute("NpcRouteRelocated", relocated)
		folder:SetAttribute("NpcRouteBlocked", stopped)
	end)
	-- [진단] 질의가 실패하면 성공으로 간주하지 않고 스튜디오에서 확인할 수 있게 보존한다.
	folder:SetAttribute("NpcRouteAudit", if routeOk then "PASS" else "FAIL")
	if not routeOk then folder:SetAttribute("NpcRouteFailure", tostring(routeError)) end

	-- [기존 People 등록 모델 지연 로딩] 주민과 동료의 미완성 복장만 기존 장착 책임 함수로 갱신한다.
	-- 이벤트 묶음은 한 번만 조회하고 장면 파괴 시 연결을 즉시 끊는다.
	do
		local shelf = ReplicatedStorage:FindFirstChild("MareAssets")
		local people = shelf and shelf:FindFirstChild("People")
		if people then
			local queued = false
			local outfitConn = people.ChildAdded:Connect(function(asset)
				if not asset:IsA("Model") or not AssetIds["People/" .. asset.Name] then return end
				if not (string.find(asset.Name, "peasant", 1, true) or string.find(asset.Name, "ranger", 1, true)
					or string.sub(asset.Name, 1, 5) == "hair_") then return end
				if queued then return end
				queued = true
				task.delay(0.08, function()
					queued = false
					if not folder.Parent then return end
					for _, subject in folder:GetDescendants() do
						if subject:IsA("Model") and subject:GetAttribute("NpcAssetProfile")
							and subject:GetAttribute("NpcAppearanceState") ~= "ready" then
							Pose.applyRegisteredMobOutfit(subject)
						end
					end
				end)
			end)
			folder.Destroying:Connect(function() outfitConn:Disconnect() end)
		end
	end

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
	-- 배 모델의 기준 방향은 회전돼 있어서 모델 로컬 +X 가 월드 +X 가 아니다. 이동은 월드 좌표로 하고,
	-- 뱃머리는 바다 쪽(+X)이다(바다 장면 VoyageScene 도 같은 모델을 뱃머리 +X 로 쓴다).
	local basePos = shipBase.Position
	local function yawAbout(angle)
		return CFrame.new(basePos) * CFrame.Angles(0, angle, 0) * CFrame.new(-basePos)
	end
	-- 월드 축 기준 선체 범위: 물보라를 선미·뱃머리·양옆에 붙이려고 한 번 잰다.
	local minX, maxX, minY, minZ, maxZ = math.huge, -math.huge, math.huge, math.huge, -math.huge
	for _, d in ship:GetDescendants() do
		if d:IsA("BasePart") and d.Transparency < 1 then
			local h = d.Size / 2
			for sx = -1, 1, 2 do
				for sy = -1, 1, 2 do
					for sz = -1, 1, 2 do
						local c = d.CFrame:PointToWorldSpace(Vector3.new(h.X * sx, h.Y * sy, h.Z * sz))
						minX, maxX = math.min(minX, c.X), math.max(maxX, c.X)
						minY = math.min(minY, c.Y)
						minZ, maxZ = math.min(minZ, c.Z), math.max(maxZ, c.Z)
					end
				end
			end
		end
	end
	if minX == math.huge then
		minX, maxX, minY, minZ, maxZ = basePos.X - 12, basePos.X + 12, basePos.Y - 2, basePos.Z - 4, basePos.Z + 4
	end
	local waterY = minY + 1.2
	local midZ = (minZ + maxZ) / 2
	local halfBeam = (maxZ - minZ) / 2
	local foamParts = nil
	local function ensureFoam()
		if foamParts then
			return foamParts
		end
		local hull = ship.PrimaryPart or ship:FindFirstChildWhichIsA("BasePart", true)
		if not hull then
			return nil
		end
		local function emitter(worldPos, lookAt, life, size, alpha, accel, spread)
			local att = Instance.new("Attachment")
			att.Name = "Wake"
			att.Parent = hull
			att.WorldCFrame = CFrame.lookAt(worldPos, lookAt)
			local em = Instance.new("ParticleEmitter")
			em.Texture = "rbxasset://textures/particles/smoke_main.dds"
			em.Rate = 0
			em.Lifetime = life
			em.Size = size
			em.Transparency = alpha
			em.Acceleration = accel
			em.EmissionDirection = Enum.NormalId.Front
			em.SpreadAngle = spread
			em.Color = ColorSequence.new(Color3.fromRGB(246, 252, 255), Color3.fromRGB(158, 206, 225))
			em.LightEmission = 0.22
			em.LockedToPart = false
			em.Parent = att
			return em
		end
		foamParts = { jets = {} }
		-- 뱃머리 양옆: 앞 + 바깥 + 위로 튀는 물방울
		for _, side in { -1, 1 } do
			local p = Vector3.new(maxX - 3, waterY, midZ + side * halfBeam * 0.85)
			local em = emitter(p, p + Vector3.new(0.26, 0.58, side * 0.78), NumberRange.new(0.4, 0.7), NumberSequence.new(0.7, 1.9),
				NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.15), NumberSequenceKeypoint.new(0.35, 0.4), NumberSequenceKeypoint.new(1, 1) }),
				Vector3.new(0, -40, 0), Vector2.new(22, 16))
			em.Speed = NumberRange.new(6, 12)
			table.insert(foamParts.jets, em)
		end
		-- 선미: 뒤로 번지는 하얀 항적
		local sp = Vector3.new(minX + 1, waterY, midZ)
		foamParts.stern = emitter(sp, sp + Vector3.new(-1, 0.14, 0), NumberRange.new(0.9, 1.6), NumberSequence.new(2.4, 7),
			NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.35), NumberSequenceKeypoint.new(0.5, 0.6), NumberSequenceKeypoint.new(1, 1) }),
			Vector3.zero, Vector2.new(38, 5))
		foamParts.stern.Speed = NumberRange.new(2, 5)
		return foamParts
	end
	local function setFoam(flow)
		local f = if flow > 0.02 then ensureFoam() else foamParts
		if not f then
			return
		end
		for _, em in f.jets do
			em.Rate = math.floor(flow * 26)
		end
		f.stern.Rate = math.floor(flow * 18)
	end
	local conn = RunService.Heartbeat:Connect(function()
		local t = os.clock() - t0
		local shipPose = shipBase * CFrame.new(0, math.sin(t * 1.2) * 0.35, 0) * CFrame.Angles(math.sin(t * 0.9) * 0.025, 0, math.sin(t * 0.7) * 0.012)
		local flow = 0
		if anim then
			local a = math.clamp((os.clock() - anim.start) / anim.dur, 0, 1)
			if anim.kind == "depart" then
				-- 뱃머리가 바다(+X)를 향한 채 천천히 출발해 점점 빨라진다. 월드 +X 로 이동하므로 옆으로 미끄러지지 않는다.
				local run = a * a
				local d = run * SEA_DIST
				local heel = math.sin(math.min(a * 3, 1) * math.pi / 2) * 0.05
				shipPose = CFrame.new(d, 0, 0) * shipPose * CFrame.Angles(0, 0, math.sin(t * 1.4) * 0.02 + heel)
				flow = math.clamp(a * 2.2, 0, 1)
			else
				-- 먼 바다에서 뱃머리를 항구 쪽(-X)으로 돌려 들어와 감속하고, 끝에서 바다 쪽으로 돌아서 정박한다
				local remain = 1 - smooth(a)
				local turn = smooth((a - 0.7) / 0.3)
				local lateral = (1 - turn) * 28
				shipPose = CFrame.new(remain * SEA_DIST, 0, lateral * remain) * yawAbout(math.pi * (1 - turn)) * shipPose
				flow = math.clamp(remain * 1.6, 0, 1)
				if a >= 1 then
					anim = nil
				end
			end
		end
		setFoam(if anim then flow else 0)
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

	local controls = { setDay = setDay }
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

	-- 시작 위치: 건물·벽 안에 서지 않도록 큰길 중앙부터 후보를 훑어 비어 있는 곳을 고른다
	local spawnPos = Vector3.new(-2, 4, 10)
	pcall(function()
		local overlap = OverlapParams.new()
		overlap.FilterType = Enum.RaycastFilterType.Include
		overlap.FilterDescendantsInstances = { folder }
		local ground = workspace:FindFirstChild("Baseplate") or folder:FindFirstChild("Ground")
		local floorPart = folder:FindFirstChild("SafetyFloor")
		local function blocked(pos)
			for _, hit in workspace:GetPartBoundsInBox(CFrame.new(pos + Vector3.new(0, 4, 0)), Vector3.new(5, 7, 5), overlap) do
				if hit.CanCollide and hit ~= ground and hit ~= floorPart and hit.Name ~= "SafetyFloor" and hit.Size.Y < 200 then
					return true
				end
			end
			return false
		end
		local found = false
		for _, z in { 0, 3, -3, 6, -6, 10, -10, 14, -14 } do
			for _, x in { -2, -10, 6, -18, -26, -40 } do
				local candidate = Vector3.new(x, 4, z)
				if not blocked(candidate) then
					spawnPos, found = candidate, true
					break
				end
			end
			if found then break end
		end
	end)
	-- 성능: 작은 장식 부품(가장 긴 변 4칸 미만)은 그림자를 만들지 않는다. 큰 건물·나무 그림자는 그대로 둔다.
	for _, d in folder:GetDescendants() do
		if d:IsA("BasePart") and d.CastShadow then
			local sz = d.Size
			if math.max(sz.X, sz.Y, sz.Z) < 4 then
				d.CastShadow = false
			end
		end
	end
	return { folder = folder, spawn = CFrame.new(spawnPos) * CFrame.Angles(0, math.rad(90), 0), controls = controls }
end

-- 항해 장면(VoyageScene)에서 같은 배 모델을 쓰기 위해 내보낸다
PortScene.makeShip = buildShip
-- 항해 장면 등에서 승인된 모델 하나를 놓는다 (없으면 nil)
function PortScene.placeModel(parent, kind, asset, pos, size)
	return importedModel(parent, kind, asset, pos, size, false)
end

return PortScene

