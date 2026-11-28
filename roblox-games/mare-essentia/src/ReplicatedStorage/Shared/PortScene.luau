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

-- [3D 초기화 진단] 엔진에서 모듈 로딩이 지연되는 정확한 하위 모듈을 기록한다.
ReplicatedStorage:SetAttribute("MarePortSceneStage", "require-Pose")
local Pose = require(script.Parent:WaitForChild("Pose"))
ReplicatedStorage:SetAttribute("MarePortSceneStage", "require-Voyage")
local Voyage = require(script.Parent:WaitForChild("Voyage"))
ReplicatedStorage:SetAttribute("MarePortSceneStage", "require-Ports")
local PortData = require(script.Parent:WaitForChild("Ports"))
ReplicatedStorage:SetAttribute("MarePortSceneStage", "require-AssetIds")
local AssetIds = require(script.Parent:WaitForChild("AssetIds"))
ReplicatedStorage:SetAttribute("MarePortSceneStage", "require-PortBuildings")
local PortBuildings = require(script.Parent:WaitForChild("PortBuildings"))
ReplicatedStorage:SetAttribute("MarePortSceneStage", "require-ProductionChains")
local Chains = require(script.Parent:WaitForChild("ProductionChains"))

local PortScene = {}

ReplicatedStorage:SetAttribute("MarePortSceneStage", "require-PortCultures")
local Cultures = require(script.Parent:WaitForChild("PortCultures"))
local PortIdentity = require(script.Parent:WaitForChild("PortIdentity")) -- [항구 정체성] 항구별 길·땅·상징·조명 표
local MED, STYLE, REGION, PROFILE, OUTFIT = Cultures.MED, Cultures.STYLE, Cultures.REGION, Cultures.PROFILE, Cultures.OUTFIT
local C = Color3.fromRGB
local PORT_CLOCK_EPOCH = os.clock()

-- 특산품 진열용 3D 모델 (없는 상품은 상자로 대신한다)
local GOOD_MESH = {
	cheese = { "Cargo", "cheese" }, wine = { "Cargo", "wine-red" }, beer = { "Cargo", "mug" }, sake = { "Cargo", "barrel", Color3.fromRGB(196, 181, 150) }, fish = { "Cargo", "fish-large" }, wool = { "Cargo", "textiles-stack-small" },
	cloth = { "Cargo", "textiles-a" }, silk = { "Cargo", "textiles-stack-large-colored" }, grain = { "Cargo", "food-flour" },
	iron = { "Cargo", "iron-bars" }, coal = { "Cargo", "coal" }, tin = { "Cargo", "tin" },
	copper = { "Cargo", "copper-bar" }, silver = { "Cargo", "silver-bar" }, gold = { "Cargo", "gold-bar" },
	gems = { "Cargo", "gems-sack" }, pearls = { "Cargo", "gem-small" }, honey = { "Cargo", "honey" }, pepper = { "Cargo", "pepper-mill" },
	olive_oil = { "Cargo", "bottle-oil" }, timber = { "Cargo", "wood-log-stack" }, mahogany = { "Cargo", "wood-log-a", Color3.fromRGB(110, 54, 40) },
	coffee = { "Cargo", "cup-coffee" }, tea = { "Cargo", "cup-tea" }, cocoa = { "Cargo", "chocolate" }, rum = { "Cargo", "barrel", Color3.fromRGB(96, 56, 39) },
	salt = { "Cargo", "shaker-salt" }, sugar = { "Cargo", "sugar" }, fruit = { "Cargo", "grapes" }, grapes = { "Cargo", "grapes" },
	lemon = { "Cargo", "lemon" }, maize = { "Cargo", "corn" }, coconut = { "Cargo", "coconut" }, meat = { "Cargo", "whole-ham" },
	-- 이름이 같은 모델이 없어 열린 상자로 보이던 교역품: 등록된 CC0 Cargo 모델로 구분한다 (기름류는 통 색으로, 수지는 자루로)
	palm_oil = { "Cargo", "barrel-open", Color3.fromRGB(170, 96, 44) }, whale_oil = { "Cargo", "barrel", Color3.fromRGB(176, 150, 96) },
	gum_arabic = { "Cargo", "bag" }, pearl_shell = { "Cargo", "pearls" }, sandalwood_hi = { "Cargo", "sandalwood" },
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
	pearl_shell = 0.8, gum_arabic = 0.9, palm_oil = 1.1, whale_oil = 1.2,
	gems = 0.75, pearls = 0.7, pepper = 0.8, salt = 0.8, olive_oil = 0.9, coffee = 0.75, tea = 0.75, cocoa = 0.8, honey = 0.8, lemon = 0.8, coconut = 0.85,
	wine = 1.0, beer = 0.9, sake = 1.2, rum = 1.2, timber = 1.3, mahogany = 1.25, cloth = 1.2, silk = 1.2, grain = 1.1, sugar = 1.1,
}
-- [게임 스크립트 권한] SurfaceAppearance의 ColorMap 등 맵 속성은 플러그인 권한에서만 읽힌다.
-- 게임에서 읽으면 "lacking capability Plugin" 오류로 함수가 중단된다(Studio 실행 44894900062 콘솔 오류).
-- 읽을 수 없으면 등록된 PBR 원본(SurfaceAppearance 자체가 있음)으로 보고 원본 재질을 보존한다.
local function surfaceHasMaps(sa: Instance?): boolean
	if not sa then return false end
	local ok, mapped = pcall(function()
		local s = sa :: any
		return s.ColorMap ~= "" or s.MetalnessMap ~= "" or s.RoughnessMap ~= "" or s.NormalMap ~= ""
	end)
	return (not ok) or mapped == true
end
local function surfaceHasColorMap(sa: Instance?): boolean
	if not sa then return false end
	local ok, mapped = pcall(function() return (sa :: any).ColorMap ~= "" end)
	return (not ok) or mapped == true
end

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
	-- [모바일 간판] 장식용 3D 뷰포트 갱신만 최대 30Hz로 제한한다. 실제 시설 입력은 그대로다.
	local signElapsed, lastSignUpdate = 0, os.clock()
	signLoop = RunService.Heartbeat:Connect(function(dt)
		local mobile = UserInputService.TouchEnabled
		if mobile then
			signElapsed += dt
			if signElapsed < 1 / 30 then return end
			signElapsed %= 1 / 30
		end
		local camera = workspace.CurrentCamera
		if not camera then return end
		local t = os.clock()
		local scaleBlend = if mobile then 1 - 0.88 ^ (math.max(0, t - lastSignUpdate) * 60) else 0.12
		lastSignUpdate = t
		local eye = camera.CFrame.Position
		local sailing = workspace:GetAttribute("VoyageActive") == true
		for i = #signAnims, 1, -1 do
			local a = signAnims[i]
			if not a.bb.Parent then
				table.remove(signAnims, i)
			elseif not sailing then
				local d = (a.base - eye).Magnitude
				if d < SIGN_ACTIVE then
					local ang = t * 0.9 + a.phase
					local dir = Vector3.new(math.sin(ang) * 0.95, 0.6, math.cos(ang) * 1.1).Unit
					a.cam.CFrame = CFrame.lookAt(a.center + dir * a.reach, a.center)
					a.bb.StudsOffset = Vector3.new(0, a.height + math.sin(t * 1.8 + a.phase) * 0.35, 0)
					local want = if d < SIGN_NEAR then 1.18 else 1
					a.scale += (want - a.scale) * scaleBlend
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
		-- [간판 로딩] 제거된 간판의 재시도 스레드와 모델 참조를 즉시 정리한다.
		local signCleanup
		local signThread = task.defer(function()
			for _ = 1, 40 do
				task.wait(1)
				if not bb.Parent or not adornee.Parent then break end
				if tryShow() then break end
			end
			signCleanup:Disconnect()
		end)
		signCleanup = bb.Destroying:Once(function()
			if coroutine.status(signThread) == "suspended" then task.cancel(signThread) end
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
		-- [방문 경로] 건물 이름은 화면 표시용으로만 전달한다. 실제 이동은 기존 탭 함수가 처리한다.
		onFacility(tab, objectText)
	end)
	return anchor
end

-- 공식 Studio Importer로 수입한 실제 GLB/OBJ/FBX 모델 우선 사용
-- 원본: roblox-games/mare-essentia/assets/, 수입본: ReplicatedStorage/MareAssets
local BLUEPRINT_SHIP_SIZE = {} -- 제작 전용 선박 외형 크기. 구매·능력치·저장 정보는 건드리지 않는다.
local V5_SHIP_LENGTH = {} -- 5차 원본의 검증된 목표 길이. 기존 선박 외형 크기는 유지한다.
ReplicatedStorage:SetAttribute("MarePortSceneStage", "ship-setup")
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
-- [지역 건축] 실제 항구 문화권을 수입 건축 메시와 기존 집 생성에서 함께 참조한다.
local currentKey = "north"
-- [항구별 원본 메시 색] 수입 모델 함수에서도 같은 항구 ID를 읽는다.
local scenePortId: string? = nil
-- [항구 생성 분할] 큰 모델 복제·R15 인물 생성 사이에 프레임을 양보해 클라이언트가 수 초씩 멈추지 않게 한다.
-- 한 프레임에 30ms까지만 만들고 다음 프레임으로 넘긴다(약 30fps 유지). 12ms에서는 첫 항구 생성이 6초+로 길어져
-- 시작 안내 진행이 QA 대기(21초) 안에 끝나지 않는 회차가 생겼다(실행 44912240071 INTRO_STUCK). 양보할 수 없는 호출(테스트·비동기 불가 문맥)에서는 그대로 한 번에 만든다.
local SLICE_BUDGET = 0.03
local sliceStart = os.clock()
-- [멈춤 원인 실측] 양보 없이 이어진 가장 긴 구간 3개를 "앞 지점→뒤 지점"으로 기록한다(추정 대신 실측).
local spanAt, spanFrom, spans = os.clock(), "start", {}
local function sliceMark(label: string)
	local now = os.clock()
	local d = now - spanAt
	if d > 0.02 then
		table.insert(spans, { ms = math.floor(d * 1000), at = spanFrom .. ">" .. label })
		table.sort(spans, function(a, b) return a.ms > b.ms end)
		if #spans > 3 then table.remove(spans) end
	end
	spanAt, spanFrom = now, label
end
-- [양보 중 외부 지연 실측] 양보(task.wait) 동안 다른 작업·렌더 준비가 오래 걸린 프레임도 따로 기록한다.
-- 생성 구간(spans)에 없는 멈춤이 어느 지점 직후의 렌더·물리·다른 스크립트에서 생기는지 찾는다.
local yieldGapMax, yieldGapAt = 0, ""
local function sliceYield(label: string?)
	if os.clock() - sliceStart > SLICE_BUDGET and coroutine.isyieldable() then
		sliceMark(label or "?")
		local before = os.clock()
		-- [측정] 긴 프레임이 Lua 메모리 정리(GC) 때문인지 가리기 위해 양보 전후 Lua 힙(KB)을 기록한다(동작 불변).
		local heapBefore = collectgarbage("count")
		task.wait()
		sliceStart = os.clock()
		local gap = sliceStart - before
		if gap > yieldGapMax then
			yieldGapMax, yieldGapAt = gap, (label or "?") .. string.format(" heap%+dKB", math.floor(collectgarbage("count") - heapBefore))
		end
		spanAt = sliceStart
	end
end
local function importedModel(parent, kind, asset, bottomPosition, desiredSize, solid, tint, buildDelay)
	sliceYield(tostring(kind) .. "/" .. tostring(asset))
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
	m:SetAttribute("ImportedAsset", tostring(kind) .. "/" .. tostring(asset)) -- [같은 소품 개수 제한] 종류 판별용
	local distantHills = kind == "Castle" and asset == "ground-hills" and not solid and desiredSize >= 80
	-- [흰색 건물 수정] 등록된 건물의 텍스처 없는 흰 메시만 지역별 벽·지붕·목재·석조로 복원한다.
	local architecture = (kind == "Town" and (asset:find("house", 1, true)
		or asset:find("temple", 1, true) or asset:find("church", 1, true)
		or asset:find("tower", 1, true) or asset:find("wall", 1, true)
		or asset:find("roof", 1, true) or asset:find("kenney_", 1, true)
		or asset:find("quaternius_", 1, true) or asset:find("windmill", 1, true)
		or asset:find("arch", 1, true) or asset:find("door", 1, true)
		or asset:find("floor", 1, true) or asset:find("stall", 1, true)))
		or (kind == "Castle" and not (asset:find("flag", 1, true) or asset:find("banner", 1, true)))
		or (kind == "Terrain" and (asset:find("ground-", 1, true) or asset:find("ruins", 1, true)
			or asset:find("bridge", 1, true) or asset:find("column", 1, true)))
		or (kind == "Naval" and (asset:find("dock", 1, true) or asset:find("platform", 1, true)))
		or kind == "Town" or kind == "Terrain" or kind == "Interior"
	local east = currentKey == "japan" or currentKey == "china" or currentKey == "seasia"
	local sandy = currentKey == "desert" or currentKey == "ottoman"
		or currentKey == "swahili" or currentKey == "wafrica" or currentKey == "malabar"
	local mediterranean = currentKey == "iberia" or currentKey == "italy" or currentKey == "med"
		or currentKey == "creole"
	local wallColor = if sandy then C(189, 161, 124)
		elseif east then C(186, 172, 150) elseif mediterranean then C(207, 176, 147)
		else C(156, 148, 138)
	local roofColor = if east then C(76, 82, 82) elseif mediterranean then C(155, 79, 56)
		elseif sandy then C(162, 128, 98) else C(100, 105, 110)
	-- [181개 항구 건축색] 같은 승인된 건물 메시여도 포트별 실제 벽/기와색을 적용한다.
	-- 색상지도가 있는 원본 메시에는 아래 기존 표면 보존 검사가 우선 적용된다.
	if architecture and kind == "Town" and scenePortId and parent.Name == "PortScene" then
		wallColor, roofColor = PortIdentity.appearance(scenePortId, wallColor, roofColor, wallColor, Color3)
	end
	local hasParts, restoredSurfaces = false, 0
	for _, p in m:GetDescendants() do
		if p:IsA("BasePart") then
			hasParts = true
			p.Anchored = true
			p.CanCollide = solid == true
			p.CanTouch = false
			local low = math.min(p.Color.R, p.Color.G, p.Color.B)
			local high = math.max(p.Color.R, p.Color.G, p.Color.B)
			local importedWhite = low >= 0.78 and high - low <= 0.14
			-- 기본 회색 플라스틱도 복원한다. 정상 회색 석재·금속은 보호한다.
			local importedGray = low >= 0.35 and high - low <= 0.10
				and (p.Material == Enum.Material.Plastic or p.Material == Enum.Material.SmoothPlastic)
			-- [원본 재질 우선] 이미 텍스처/법선/거칠기/MaterialVariant를 가진 건축 메시에는
			-- 강제 단색 Tint를 곱하지 않는다. 판넬·기와·벽화의 명암과 원래 광택을 보존한다.
			local surfaceMap = p:FindFirstChildOfClass("SurfaceAppearance")
			local preserveArchitectureTexture = architecture and (
				(p:IsA("MeshPart") and p.TextureID ~= "")
				or p.MaterialVariant ~= ""
				or surfaceHasMaps(surfaceMap))
			if architecture and not preserveArchitectureTexture then
				for _, mesh in p:GetChildren() do
					if (mesh:IsA("SpecialMesh") and mesh.TextureId ~= "")
						or ((mesh:IsA("Decal") or mesh:IsA("Texture")) and mesh.Texture ~= "") then
						preserveArchitectureTexture = true
						break
					end
				end
			end
			-- 건축 표면은 아래 부위별 복원에서만 색을 변경한다. 원래 색이 있는 지붕·문틀은 보존한다.
			if tint and not architecture and not preserveArchitectureTexture then
				if kind == "Animals" then
					-- [원본 동물 재질] 텍스처·PBR·품종 무늬는 손대지 않고 색이 유실된 단색 몸통만 복원한다.
					local sa = p:FindFirstChildOfClass("SurfaceAppearance")
					local textured = (p:IsA("MeshPart") and p.TextureID ~= "") or surfaceHasColorMap(sa)
						or p.MaterialVariant ~= "" or surfaceHasMaps(sa)
					for _, ch in p:GetChildren() do
						if ch:IsA("SpecialMesh") and ch.TextureId ~= "" then textured = true end
						if (ch:IsA("Decal") or ch:IsA("Texture")) and ch.Texture ~= "" then textured = true end
					end
					local partName = p.Name:lower()
					local detail = partName:find("eye", 1, true) or partName:find("pupil", 1, true)
						or partName:find("hoof", 1, true) or partName:find("horn", 1, true)
						or partName:find("mane", 1, true) or partName:find("tail", 1, true)
						or partName:find("beak", 1, true) or partName:find("saddle", 1, true)
						or partName:find("muzzle", 1, true) or partName:find("nose", 1, true)
						or partName:find("snout", 1, true) or partName:find("ear", 1, true)
						or partName:find("udder", 1, true) or partName:find("tusk", 1, true)
						or partName:find("patch", 1, true) or partName:find("spot", 1, true)
						or partName:find("stripe", 1, true) or partName:find("whisker", 1, true)
					if textured and not detail then
						-- 원본 색상지도/PBR/TextureID의 색은 복원 대상이 아니다.
						if sa and surfaceHasColorMap(sa) then
							-- 기존 SurfaceAppearance.Color와 Part.Color 모두 보존한다.
						end
					elseif not textured and not detail then
						local low = math.min(p.Color.R, p.Color.G, p.Color.B)
						local high = math.max(p.Color.R, p.Color.G, p.Color.B)
						local faded = high - low <= 0.14 and high >= 0.58
						-- 유실된 회백색 몸통만 보정하고 원본 갈색·얼룩·코·눈은 보존한다.
						if sa and not surfaceHasColorMap(sa) then
							sa.Color = sa.Color:Lerp(tint, if faded then 0.7 else 0)
						else
							p.Color = p.Color:Lerp(tint, if faded then 0.82 else 0)
						end
						if not sa then
							p.Material = if faded and (p.Material == Enum.Material.SmoothPlastic or p.Material == Enum.Material.Plastic)
								and (asset == "sheep" or asset == "llama") then Enum.Material.Fabric else p.Material
							-- 이미 지정된 Enum.Material.Leather/Enum.Material.Concrete 역시 원본 그대로 유지한다.
							-- 원본 가죽·피부·주름 재질을 가축 종별 재질로 강제 치환하지 않는다.
							if p.Material == Enum.Material.Leather or p.Material == Enum.Material.Concrete then
								p.Reflectance = math.min(p.Reflectance, 0.02)
							end
						end
					elseif not textured and not sa and (partName:find("mane", 1, true) or partName:find("tail", 1, true)) then
						p.Material = Enum.Material.Fabric
					end
				else
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
			-- [원경 언덕] 무채색 기본 플라스틱만 자연 지형 재질로 복원하며 원본 텍스처는 유지한다.
			if architecture and (importedWhite or importedGray or (distantHills and high - low <= 0.14
				and (p.Material == Enum.Material.Plastic or p.Material == Enum.Material.SmoothPlastic)))
				and p.Material ~= Enum.Material.Glass and p.Material ~= Enum.Material.Metal
				and p.Material ~= Enum.Material.Neon and p.Transparency < 0.95 then
				local sa = p:FindFirstChildOfClass("SurfaceAppearance")
				local textured = preserveArchitectureTexture or (p:IsA("MeshPart") and p.TextureID ~= "")
					or p.MaterialVariant ~= "" or surfaceHasMaps(sa)
				for _, child in p:GetChildren() do
					if child:IsA("SpecialMesh") and child.TextureId ~= "" then textured = true end
				end
				if not textured then
					-- 벽/지붕/문틀/돌계단을 구별한다. 원본 무늬 메시와 문화권별 집 색은 보존한다.
					-- [부위별 재질] 완성형 건물의 이름보다 실제 메시 부위명을 우선한다.
					-- 예: 목조 주택의 석조 기단·벽돌 외벽, 지붕 자산의 목조 들보를 같은 재질로 덮지 않는다.
					local role = p.Name:lower()
					local name = (asset .. " " .. p.Name):lower()
					if architecture then
						for _, key in { "glass", "windowpane", "glazing", "hinge", "iron", "metal", "latch",
							"awning", "canvas", "cloth", "fabric", "rug", "flag", "banner", "roof", "tile", "gable", "shingle", "wood", "timber",
							"beam", "door", "frame", "fence", "bench", "cart", "table", "bookcase", "crate", "floor", "stone", "column", "wall", "brick", "plaster",
							"trunk", "bark", "branch", "stump", "log", "leaf", "leaves", "foliage", "grass", "moss", "rock", "cliff", "sand", "snow" } do
							if role:find(key, 1, true) then name = role; break end
						end
					end
					local material, paint = Enum.Material.Brick, wallColor
					if sandy or mediterranean then material = Enum.Material.Plaster end
					if distantHills then
						local stone = role:find("rock", 1, true) or role:find("stone", 1, true) or role:find("cliff", 1, true)
						material = if stone then Enum.Material.Rock elseif sandy then Enum.Material.Sand else Enum.Material.Grass
						paint = if stone then C(126, 126, 113) elseif sandy then C(173, 151, 112) else C(112, 133, 91)
					elseif name:find("trunk", 1, true) or name:find("bark", 1, true) or name:find("branch", 1, true) or name:find("stump", 1, true) or name:find("log", 1, true) then
						material, paint = Enum.Material.Wood, C(116, 83, 53)
					elseif name:find("leaf", 1, true) or name:find("leaves", 1, true) or name:find("foliage", 1, true) or name:find("tree", 1, true) or name:find("bush", 1, true) or name:find("grass", 1, true) or name:find("moss", 1, true) or name:find("plant", 1, true) then
						material, paint = Enum.Material.Grass, tint or C(87, 137, 65)
					elseif name:find("snow", 1, true) or name:find("ice", 1, true) then
						material, paint = Enum.Material.Snow, C(225, 234, 239)
					elseif name:find("sand", 1, true) then
						material, paint = Enum.Material.Sand, tint or C(194, 168, 122)
					elseif name:find("rock", 1, true) or name:find("cliff", 1, true) then
						material, paint = Enum.Material.Rock, tint or C(137, 126, 105)
					elseif name:find("fence", 1, true) or name:find("bench", 1, true) or name:find("cart", 1, true) or name:find("table", 1, true) or name:find("bookcase", 1, true) or name:find("crate", 1, true) then
						material, paint = Enum.Material.WoodPlanks, tint or C(129, 91, 60)
					elseif name:find("rug", 1, true) or name:find("flag", 1, true) or name:find("banner", 1, true) then
						material, paint = Enum.Material.Fabric, tint or C(144, 75, 55)
					elseif name:find("glass", 1, true) or name:find("windowpane", 1, true)
						or name:find("glazing", 1, true) then
						-- [유리] 무늬가 없는 수입 흰 창만 원재질을 살린다.
						material, paint = Enum.Material.Glass, C(194, 218, 222)
					elseif name:find("hinge", 1, true) or name:find("iron", 1, true)
						or name:find("metal", 1, true) or name:find("latch", 1, true) then
						-- [철물] 경첩/문고리/철제 난간은 저반사 철제 표면.
						material, paint = Enum.Material.Metal, C(100, 105, 108)
					elseif name:find("awning", 1, true) or name:find("canvas", 1, true)
						or name:find("cloth", 1, true) or name:find("fabric", 1, true) then
						material, paint = Enum.Material.Fabric, if tint then tint else C(171, 125, 88)
					elseif name:find("roof", 1, true) or name:find("tile", 1, true)
						or name:find("gable", 1, true) or name:find("shingle", 1, true) then
						material, paint = Enum.Material.Slate, roofColor
						if sandy then material = Enum.Material.Plaster
						elseif east or mediterranean then material = Enum.Material.ClayRoofTiles
						else material = Enum.Material.RoofShingles end
						-- 주택 전체에 전달한 외벽색으로 기와색을 덮지 않는다. 지붕 전용 모듈만 지정색 사용.
						if tint and asset:find("roof", 1, true) and not asset:find("house", 1, true) then
							paint = paint:Lerp(tint, 0.8)
						end
					elseif name:find("wood", 1, true) or name:find("timber", 1, true)
						or name:find("beam", 1, true) or name:find("door", 1, true)
						or name:find("frame", 1, true) or name:find("floor", 1, true)
						or name:find("dock", 1, true) or name:find("platform", 1, true) then
						material, paint = Enum.Material.WoodPlanks, C(117, 87, 62)
						if tint then paint = paint:Lerp(tint, 0.32) end
					elseif name:find("stone", 1, true) or name:find("grey", 1, true)
						or name:find("column", 1, true) or name:find("castle", 1, true)
						or name:find("tower", 1, true) or name:find("ruin", 1, true)
						or name:find("bridge", 1, true) or name:find("ground-", 1, true) then
						material = if sandy then Enum.Material.Sandstone elseif mediterranean then Enum.Material.Limestone else Enum.Material.Cobblestone
						paint = wallColor:Lerp(C(122, 119, 113), if sandy then 0.18 else 0.48)
						if tint then paint = paint:Lerp(tint, 0.42) end
					elseif name:find("plaster", 1, true) then
						material, paint = Enum.Material.Plaster, wallColor
					elseif name:find("brick", 1, true) then
						material, paint = Enum.Material.Brick, wallColor
					elseif kind == "Terrain" then
						material, paint = Enum.Material.Ground, tint or C(137, 113, 78)
					elseif kind == "Interior" then
						material, paint = Enum.Material.WoodPlanks, tint or C(126, 92, 64)
					elseif tint then
						paint = paint:Lerp(tint, 0.86)
					end
					-- [소재별 반사] 유리는 밝은 창빛, 금속은 제한적 광택. 석재·나무·천은 무광.
					p.Material, p.Color, p.Reflectance = material, paint,
						if material == Enum.Material.Glass then 0.045
						elseif material == Enum.Material.Metal then 0.02 else 0
					if sa and not surfaceHasColorMap(sa) then sa.Color = paint end
					-- 원래 무텍스처 메시의 이중 색 곱셈을 막고 지정된 돌/벽돌 색을 그대로 표시한다.
					for _, child in p:GetChildren() do
						if child:IsA("SpecialMesh") then child.VertexColor = Vector3.new(1, 1, 1) end
					end
					restoredSurfaces += 1
				end
			end
		end
	end
	if not hasParts then m:Destroy(); return nil end
	if architecture then
		m:SetAttribute("ArchitectureRestoredSurfaces", restoredSurfaces)
		m:SetAttribute("ArchitectureCulture", currentKey)
		-- [모바일 건축 LOD] 실행 중 LevelOfDetail 쓰기는 PluginOrOpenCloud 권한 오류를 일으킨다.
		-- 등록된 원본 모델의 LOD 설정을 복제본에서 그대로 보존해 항구 생성 중단을 막는다.
	end
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
		-- [실제 Studio 경고 복구] 원경의 비충돌 절벽·언덕은 수입 원본 단위가 커도/작아도 목표 폭으로 보정한다.
		-- 181개 항구가 사용하는 기존 Terrain·Castle 원본만 대상으로 하고 일반 시설·배·충돌 모델의 제한은 그대로 둔다.
		local distantBackdrop = not solid and desiredSize >= 80 and (kind == "Terrain" or kind == "Castle")
		-- [원경 절벽 실루엣] 폭 기준 확대 시 세로로 긴 절벽 원본이 거대한 회색 벽처럼 보이는 현상 제한.
		-- 승인 원본의 비율·재질·위치·개수는 유지하며 비충돌 원경 절벽만 균일 축소한다.
		local cliffHeightLimit = if distantBackdrop and kind == "Terrain" and string.sub(asset, 1, 6) == "cliff-"
			then math.clamp(desiredSize * 0.28, 24, 52) else nil
		local reliefHeightLimit = cliffHeightLimit or (if distantHills then math.clamp(desiredSize * 0.22, 28, 56) else nil)
		if reliefHeightLimit and ext.Y > 0.01 then
			desiredSize = math.min(desiredSize, axis * reliefHeightLimit / ext.Y)
			ratio = desiredSize / axis
		end
		if not isAnimal and not distantBackdrop and (ratio < 0.01 or ratio > 100) then
			error("비정상적인 모델 배율")
		end
		-- ScaleTo는 절대 배율이다. 수입 원본 모델이 이미 가진 배율을 비충돌 원경에도 반영한다.
		local scale = if isAnimal or distantBackdrop then m:GetScale() * ratio else ratio
		if scale ~= scale or scale <= 0 or scale == math.huge then error("비정상적인 모델 배율") end
		m:ScaleTo(scale)
		if isAnimal or distantBackdrop then
			local _, actualSize = m:GetBoundingBox()
			local actualAxis = if isAnimal then math.max(actualSize.X, actualSize.Y, actualSize.Z)
				else math.max(actualSize.X, actualSize.Z)
			if math.abs(actualAxis - desiredSize) > desiredSize * 0.2 then
				error(if isAnimal then "동물 수입본 목표 크기 불일치" else "원경 지형 목표 크기 불일치")
			end
		end
		if kind ~= "People" and kind ~= "Animals" then
			local _, size = m:GetBoundingBox()
			-- 월드 원점을 기준으로 모델을 회전하면 수입된 가축이 엉뚱한 곳으로 이동한다.
			-- 장식용 메시만 제자리 중심을 기준으로 방향을 맞춘다.
			if size.Z > size.X then m:PivotTo(m:GetPivot() * CFrame.Angles(0, math.pi / 2, 0)) end
		end
		local center, size = m:GetBoundingBox()
		-- [동물 발바닥·건축 기초 접지] 투명한 루트/보조 경계가 아니라 보이는 부품의 회전된 최저점을 사용한다.
		-- 기존 필지의 지정 높이만 맞춘다. 완성형 주택의 내부 층고, 처마, 충돌 및 원래 배치 XZ는 유지한다.
		local groundArchitecture = kind == "Town" and (
			(solid == true and (asset:find("house", 1, true) ~= nil or asset == "eastasia-base"))
			or asset == "eastasia-stairs" or asset == "eastasia-column-base")
		local visibleBottomY = math.huge
		if isAnimal or groundArchitecture then
			for _, piece in m:GetDescendants() do
				if piece:IsA("BasePart") and piece.Transparency < 0.98 then
					local half = piece.Size * 0.5
					local pose = piece.CFrame
					local lowY = pose.Position.Y - math.abs(pose.RightVector.Y) * half.X
						- math.abs(pose.UpVector.Y) * half.Y - math.abs(pose.LookVector.Y) * half.Z
					visibleBottomY = math.min(visibleBottomY, lowY)
				end
			end
		end
		local bottom = Vector3.new(center.Position.X,
			if visibleBottomY < math.huge then visibleBottomY else center.Position.Y - size.Y / 2, center.Position.Z)
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
	-- [항구 자산 실측] 배치에 성공한 등록 모델에만 원본 키를 남긴다. 로딩/등록 성공과 구분한다.
	-- 실제 Studio 감사 전용이며 일반 플레이의 모델 속성·부하를 변경하지 않는다.
	if RunService:IsStudio() and AssetIds[kind .. "/" .. asset] then
		m:SetAttribute("PortPlacedAssetKey", kind .. "/" .. asset)
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
			-- [설치 타이머] 모델이 제거되면 대기 중인 설치 작업도 즉시 정리한다.
			local installCleanup
			local installThread = task.delay(buildDelay, function()
				-- 장면이 Workspace에 배치되기 전에 설치 모션이 사라지지 않도록 부착 완료를 기다린다.
				local deadline = os.clock() + 25
				while m.Parent and not parent.Parent and os.clock() < deadline do task.wait(0.12) end
				if not m.Parent then installCleanup:Disconnect() return end
				if not parent.Parent then
					-- 타임아웃에는 숨김·위치·원래 충돌을 복원해 완성 자산이 사라지지 않게 한다.
					for _, piece in pieces do
						if piece.part.Parent then
							piece.part.CFrame, piece.part.Transparency, piece.part.CanCollide = piece.final, piece.alpha, piece.solid
						end
					end
					m:SetAttribute("BuildVisualState", "complete")
					installCleanup:Disconnect()
					return
				end
				local timing = TweenInfo.new(0.72, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
				for _, piece in pieces do
					if piece.part.Parent then
						TweenService:Create(piece.part, timing, { CFrame = piece.final, Transparency = piece.alpha }):Play()
					end
				end
				task.wait(0.76)
				installCleanup:Disconnect()
				if not m.Parent or not parent.Parent then return end
				for _, piece in pieces do
					if piece.part.Parent then piece.part.CanCollide = piece.solid end
				end
				m:SetAttribute("BuildVisualState", "complete")
			end)
			installCleanup = m.Destroying:Once(function()
				if coroutine.status(installThread) == "suspended" then task.cancel(installThread) end
			end)
		else
			m:SetAttribute("BuildVisualState", "complete")
		end
	end
	return m
end

-- [자동 배치 보정 · 2026-11-28] 보정표(PlacementOverrides)의 제외·폰 숨김·배율·회전·높이를 모든 항구 배치에 적용한다.
-- 같은 지역 변수에 다시 넣어 기존 호출부(importedModel)는 그대로 둔다(최상위 local 추가 없음).
do
	local okOv, Overrides = pcall(function() return require(script.Parent:WaitForChild("PlacementOverrides", 3)) end)
	if okOv and Overrides then
		local raw = importedModel
		importedModel = function(parent, kind, asset, bottomPosition, desiredSize, solid, tint, buildDelay)
			local ov = Overrides.get(kind, asset)
			if ov and (ov.disabled or (ov.mobileHide and game:GetService("UserInputService").TouchEnabled)) then return nil end
			local m = raw(parent, kind, asset, bottomPosition, desiredSize * ((ov and ov.scale) or 1), solid, tint, buildDelay)
			if m and ov then Overrides.apply(m, ov) end
			-- 이름 규칙으로 자동 들어온 항구·문화권 슬롯만 겹침 피하기·지역색을 적용한다(기존 정본 배치는 그대로).
			local name = tostring(asset)
			local portSlot = scenePortId and string.sub(name, 1, #scenePortId + 1) == scenePortId .. "_"
			local cultureSlot = not portSlot and string.sub(name, 1, #tostring(currentKey) + 1) == tostring(currentKey) .. "_"
			if m and kind == "Town" and (portSlot or cultureSlot) then
				Overrides.avoidOverlap(m)
				if cultureSlot and scenePortId then Overrides.regionTint(m, scenePortId) end
			end
			return m
		end
	end
end

-- [문화권 공통 대체 · 2026-11-28] 항구 전용 <항구>_<슬롯> 이 없으면 같은 문화권 공통 <문화권>_<슬롯> 을 쓴다.
-- 주택·가로등·우물·시장·방앗간·광장·공방·가판대만. 대표 경관(landmark)은 다른 곳 것을 쓰지 않는다(사칭 금지).
function PortScene.cultureSlot(name: string?): string?
	if not name or AssetIds["Town/" .. name] or not scenePortId then return name end
	local prefix = scenePortId .. "_"
	if string.sub(name, 1, #prefix) ~= prefix then return name end
	local slot = string.sub(name, #prefix + 1)
	if string.find(slot, "landmark", 1, true) then return name end
	local alt = tostring(currentKey) .. "_" .. slot
	return if AssetIds["Town/" .. alt] then alt else name
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
local currentYear = 1700
local function villager(parent, pos, facing, coat, rng, role, keepCoat, extra)
	sliceYield("villager:" .. tostring(role))
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
	-- [1650년대 주민 외형] 이름 또는 항구·직업·고정 좌표를 해시해 재방문 시 같은 얼굴/복식을 유지한다.
	-- 기존 배치 난수, 경제, 저장을 변경하지 않고 승인된 머리·의상만 선택한다.
	if year >= 1500 and not outfit.companion then
		local identity = if extra and type(extra.identity) == "string" then extra.identity
			else ("%s:%s:%d:%d"):format(currentKey, outfit.profession or role, math.floor(pos.X * 4), math.floor(pos.Z * 4))
		local hash = 17
		for i = 1, #identity do hash = (hash * 33 + string.byte(identity, i)) % 2147483647 end
		outfit.identity = identity
		outfit.persona = hash % 3 + 1
		if not keepCoat and o and o.coats and #o.coats > 0 then
			coat = o.coats[(math.floor(hash / 7) % #o.coats) + 1]
			if currentKey == "tropic" or currentKey == "pacific" or currentKey == "seasia" then
				coat = coat:Lerp(C(240, 224, 191), 0.14)
			end
		end
		if outfit.age ~= "elder" then
			local hairColors = if currentKey == "korea" or currentKey == "china" or currentKey == "japan"
				then { C(34, 31, 30), C(55, 44, 38), C(69, 56, 46) }
				elseif currentKey == "ottoman" or currentKey == "swahili" or currentKey == "wafrica" or currentKey == "malabar"
				then { C(35, 30, 29), C(52, 39, 32), C(75, 51, 37) }
				else { C(43, 33, 29), C(82, 56, 40), C(122, 82, 53), C(58, 51, 44), C(173, 132, 83) }
			outfit.hairColor = hairColors[(math.floor(hash / 13) % #hairColors) + 1]
		end
		if outfit.gender == "male" then
			local sailor = outfit.profession == "sailor" or outfit.profession == "boatswain" or outfit.profession == "fisher"
			outfit.hair = if sailor and hash % 4 == 0 then "long" else "short"
		elseif outfit.age ~= "child" then
			outfit.hair = if hash % 4 == 0 then "short" elseif hash % 2 == 0 then "bun" else "long"
		end
		-- 외부 기후가 실제 입력된 경우 비/폭풍, 또는 기존 계절이 겨울일 때 서유럽 외투를 선택한다.
		local weather = parent:GetAttribute("PortVisualWeather")
		local winter = parent:GetAttribute("CitySeasonIndex") == 1
		local coldRegion = currentKey == "north" or currentKey == "nordic" or currentKey == "hanse"
			or currentKey == "britain" or currentKey == "france" or currentKey == "stone"
		outfit.weatherLayer = if weather == "rain" or weather == "storm" or weather == "snow"
			or (winter and coldRegion) then "outer_coat" else "normal"
	end
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
		-- [수입 건물 원본 재질] 유리·금속·발광/원본 PBR·컬러맵·OBJ 텍스처는 덮지 않는다.
		if p:IsA("BasePart") and p.Material ~= Enum.Material.Glass
			and p.Material ~= Enum.Material.Metal and p.Material ~= Enum.Material.Neon then
			local sa = p:FindFirstChildOfClass("SurfaceAppearance")
			local textured = sa ~= nil or p.MaterialVariant ~= ""
				or (p:IsA("MeshPart") and p.TextureID ~= "")
			for _, ch in p:GetChildren() do
				if ch:IsA("SpecialMesh") and ch.TextureId ~= "" then textured = true end
			end
			-- 복원된 석재·기와·목재 및 원본의 명시적 재질은 다시 덮지 않는다.
			local low = math.min(p.Color.R, p.Color.G, p.Color.B)
			local high = math.max(p.Color.R, p.Color.G, p.Color.B)
			if not textured and (p.Material == Enum.Material.Plastic or p.Material == Enum.Material.SmoothPlastic)
				and low >= 0.78 and high - low <= 0.14 then
				local role = p.Name:lower()
				local selected = mat
				if not surface then
					if role:find("roof", 1, true) or role:find("tile", 1, true) then
						selected = (architecture and architecture.roofMat) or Enum.Material.RoofShingles
					elseif role:find("beam", 1, true) or role:find("timber", 1, true) or role:find("wood", 1, true) then
						selected = (architecture and architecture.trimMat) or Enum.Material.WoodPlanks
					elseif role:find("door", 1, true) or role:find("frame", 1, true) then
						selected = (architecture and architecture.entryMat) or Enum.Material.WoodPlanks
					end
				end
				p.Material = selected
			end
		end
	end
end

local vacancyRate = 0 -- 빈집 비율 (PortScene.build 가 정한다)
-- [모듈 실물 건축] 등록된 Kenney 모듈 키트(벽·창·문·지붕)를 실제 크기로 재서 격자로 조립한다.
-- 기본 상자 대신 실물 메시만 보이게 한다. 부품 크기를 코드에 고정하지 않고 실행 중 경계 상자로 간격을 정한다.
-- set = { wall=, window=, door=, roof= } (Town 키트 이름), 정면은 +X(frontSign=1) 방향.
local function modularHall(parent, cx, cz, sizeX, sizeZ, floors, set, tint, roofTint)
	local placed = 0
	local function piece(asset, pos, unit, rotY, color)
		local m = importedModel(parent, "Town", asset, pos, unit, true, color)
		if not m then return nil, 0 end
		if rotY ~= 0 then
			local c = m:GetBoundingBox()
			m:PivotTo(CFrame.new(c.Position) * CFrame.Angles(0, rotY, 0) * CFrame.new(c.Position):Inverse() * m:GetPivot())
		end
		local _, size = m:GetBoundingBox()
		placed += 1
		return m, size.Y
	end
	-- 모바일 부담: 실측(정밀검사 44983384848) 생성 6.4→9.2초. 긴 변의 1/5 간격(14~40)으로 부품 수를 줄인다.
	local unit = math.clamp(math.max(sizeX, sizeZ) / 5, 14, 40)
	local nZ = math.max(2, math.floor(sizeZ / unit))
	local nX = math.max(2, math.floor(sizeX / unit))
	local spanZ, spanX = nZ * unit, nX * unit
	local floorH = nil
	for floor = 0, math.max(1, floors) - 1 do
		local y = (floorH or 0) * floor
		-- 정면·후면(x 고정, z 방향으로 이어짐): 부품을 90도 돌려 얇은 면이 바깥을 향하게 한다.
		for side = -1, 1, 2 do
			local x = cx + side * spanX / 2
			for i = 1, nZ do
				local z = cz - spanZ / 2 + unit * (i - 0.5)
				local mid = i == math.ceil(nZ / 2)
				local asset = if floor == 0 and side == 1 and mid then set.door
					elseif (i + floor) % 2 == 0 then set.window else set.wall
				local _, h = piece(asset, Vector3.new(x, y, z), unit, math.pi / 2, tint)
				if not floorH and h and h > 0 then floorH = h end
			end
		end
		-- 양 측면(z 고정, x 방향으로 이어짐)
		for side = -1, 1, 2 do
			local z = cz + side * spanZ / 2
			for i = 1, nX do
				local x = cx - spanX / 2 + unit * (i - 0.5)
				local asset = if (i + floor) % 2 == 0 then set.window else set.wall
				local _, h = piece(asset, Vector3.new(x, y, z), unit, 0, tint)
				if not floorH and h and h > 0 then floorH = h end
			end
		end
		if not floorH then break end
	end
	-- 지붕: 실물 지붕 조각을 상면 격자에 얹는다(용마루는 z 방향).
	local top = (floorH or 8) * math.max(1, floors)
	-- 지붕: 격자로 깔면 톱니·틈이 생기고 너무 높았다(Studio 44983383153). 실물 지붕 모델 하나를
	-- 건물 크기에 맞춰 축별로 늘리고 경사 높이는 짧은 변의 30%(최대 24)로 낮춘다.
	if set.roof then
		local roof = piece(set.roof, Vector3.new(cx, top, cz), math.max(spanX, spanZ), 0, roofTint)
		if roof then
			local box, size = roof:GetBoundingBox()
			local want = Vector3.new(spanX + 2, math.min(24, math.min(spanX, spanZ) * 0.3), spanZ + 2)
			local k = Vector3.new(want.X / size.X, want.Y / size.Y, want.Z / size.Z)
			local base = box.Position - Vector3.new(0, size.Y / 2, 0)
			for _, p in roof:GetDescendants() do
				if p:IsA("BasePart") then
					local lk = p.CFrame:VectorToObjectSpace(k)
					p.Size = p.Size * Vector3.new(math.abs(lk.X), math.abs(lk.Y), math.abs(lk.Z))
					p.Position = base + (p.Position - base) * k
				end
			end
			local box2, size2 = roof:GetBoundingBox()
			roof:PivotTo(CFrame.new(Vector3.new(cx, top, cz) - (box2.Position - Vector3.new(0, size2.Y / 2, 0))) * roof:GetPivot())
		end
	end
	return placed, top, spanX, spanZ
end

-- [항구별 외형] 주택 생성 함수가 PortScene.build의 현재 항구 참조를 직접 읽도록 같은 로컬 스코프에서 선언한다.
-- [항구 ID] 상단에 선언되어 수입 모델과 주택이 함께 참조한다.
local function house(parent, pos, w, d, floors, style, rng, wallColor)
	-- [광장 건축 금지] 향후 시설 추가에서도 중앙광장의 빈 보행 공간은 유지한다.
	if parent.Name == "PortScene" then
		local dx, dz = pos.X + 6, pos.Z
		if dx * dx + dz * dz < CENTRAL_PLAZA_RADIUS * CENTRAL_PLAZA_RADIUS then return nil end
	end
	-- 벽 색을 먼저 정해, 수입한 집 메쉬 전체에 같은 따뜻한 색을 입힌다 (회색 맨몸 집 방지)
	-- 마을 전체가 한 팔레트로 보이도록: 지역 대표색(첫 색)에 가깝게 모으고 집마다 아주 조금만 다르게 한다
	local tintColor = wallColor or style.walls[1]:Lerp(style.walls[rng:NextInteger(1, #style.walls)], 0.3)
	-- [181항구 외벽·지붕] 15개 고증 원색은 고정, 나머지 166개는 문화권 색에서 항구별 고유 팔레트 사용.
	-- 원본 컬러맵/PBR 보존, 시설 전용 벽색과 기존 필지·경제·저장 흐름 유지.
	local portFacade, portRoof = PortIdentity.appearance(scenePortId, style.walls[1], style.roofs[1], style.street, Color3)
	if scenePortId and not wallColor then
		tintColor = tintColor:Lerp(portFacade, 0.74)
	end
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
	-- [항구 전용 주택] 해당 항구의 승인된 실물 원본이 등록된 경우에만 사용.
	-- 등록 전에는 기존 문화권 주택 제작을 그대로 보존하며 저장·경제 값은 변경하지 않는다.
	local originalHouseTier = if houseTier >= 5 and (floors or 1) >= 3 then 3
		elseif houseTier >= 3 and (floors or 1) >= 2 then 2 else 1
	local originalHouse = if scenePortId then PortScene.cultureSlot(scenePortId .. "_house_" .. tostring(originalHouseTier)) else nil
	-- [런던 주거 실물] 기존 1~3단계 정본을 우선하고, 아직 단계 전용본이 없을 때만
	-- 실제로 등록된 노동자·장인 주택을 일부 필지에 적용한다. 미등록 파일은 표시하지 않는다.
	-- [런던 연립 주택] 2단계의 일부 필지에만 승인된 실제 연립 주택을 쓰며 주거·저장 구조는 유지한다.
	local londonResidence = if scenePortId == "london" and originalHouseTier == 1
		and seed % 7 == 2 then "london_bld_hut"
		elseif scenePortId == "london" and originalHouseTier == 2
		and seed % 5 == 1 then "london_bld_house_row"
		elseif scenePortId == "london" and seed % 3 == 0 then
		(if originalHouseTier == 1 then "london_house_worker"
			elseif originalHouseTier == 2 then "london_house_artisan" else nil) else nil
	-- [런던 독립 주택] 실물 자산번호가 있을 때만 고급 필지에 상인 주택·저택·정원 빌라를 사용한다.
	-- 기존 주거 층수, 필지, 저장 키는 바꾸지 않고 원래 단계 주택은 그 밖의 필지에 유지한다.
	local londonEstate = if scenePortId == "london" and houseTier >= 5 and seed % 11 == 1
		then "london_house_villa"
		elseif scenePortId == "london" and houseTier >= 4 and seed % 9 == 2
		then "london_house_mansion"
		elseif scenePortId == "london" and houseTier >= 3 and seed % 7 == 3
		then "london_house_merchant" else nil
	local selectedHouse = if londonEstate and AssetIds["Town/" .. londonEstate] then londonEstate
		elseif originalHouse and AssetIds["Town/" .. originalHouse] then originalHouse
		elseif londonResidence and AssetIds["Town/" .. londonResidence] then londonResidence else nil
	if selectedHouse then
		local houseModel = importedModel(parent, "Town", selectedHouse, pos,
			math.max(w, d) * variation * HOUSE_SCALE, true)
		if houseModel then
			houseModel.Name = "HarborHouse"
			houseModel:SetAttribute("PortOriginalHouse", selectedHouse)
			return houseModel:FindFirstChildWhichIsA("BasePart", true)
		end
	end
	-- [항구별 건축] 런던·루앙에만 등록된 16~18세기 유럽 완성형 주택을 사용. 다른 문화권에는 혼용하지 않는다.
	if scenePortId == "london" or scenePortId == "rouen" then
		local variants = if scenePortId == "london"
			then { "village-house-2", "village-house-3", "village-house-4", "village-house-1" }
			else { "village-house-1", "village-house-4", "village-house-2", "village-house-3" }
		local originalName = variants[(seed + math.clamp(floors or 1, 1, 3) - 1) % #variants + 1]
		if AssetIds["Town/" .. originalName] then
			local building = importedModel(parent, "Town", originalName, pos, math.max(w, d) * variation * HOUSE_SCALE, true)
			if building then
				building.Name = "HarborHouse"
				building:SetAttribute("PortOriginalHouse", originalName)
				building:SetAttribute("CityHistoricPort", scenePortId)
				return building:FindFirstChildWhichIsA("BasePart", true)
			end
		end
	end
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
			-- [한중일 차별화] 같은 기와라도 처마 폭과 지붕 실루엣은 지역마다 다르다.
			local roofSpan = if currentKey == "china" then 1.32 elseif currentKey == "japan" then 1.15 else 1.22
			local roofColor = style.roofs[rng:NextInteger(1, #style.roofs)]
			if scenePortId then roofColor = roofColor:Lerp(portRoof, 0.78) end
			local roof = importedModel(parent, "Town", "eastasia-roof", Vector3.new(pos.X, top, pos.Z), size * roofSpan, false, roofColor)
			if roof then
				roof.Name = "HarborRoof"
				uniformMaterial(roof, style, "roof")
			end
			-- [동아시아 발전 주택] 승인된 계단은 유지하고, 3단계부터 현관 주춧돌 실물 메시를 제한 배치한다.
			-- 조선·중국·일본 각국 전용 기와 모델이 없는 상태에서 다른 문화권 궁전 외형을 섞지 않는다.
			if architecture.eastAsiaEntry and not vacant and houseTier >= 2 and seed % 3 == 0 then
				local stairs = importedModel(parent, "Town", "eastasia-stairs",
					pos + Vector3.new(0, 0, front * size * 0.48), size * 0.34, false)
				if stairs then stairs.Name = "HarborEntrance" end
			end
			if architecture.eastAsiaEntry and not vacant and houseTier >= 3
				and seed % (if UserInputService.TouchEnabled then 13 else 7) == 2
				and AssetIds["Town/eastasia-column-base"] then
				for _, side in { -1, 1 } do
					local column = importedModel(parent, "Town", "eastasia-column-base",
						pos + Vector3.new(side * size * 0.26, 0, front * size * 0.44),
						size * 0.2, false, tintColor)
					if column then
						column.Name = "HarborPorchFoundation"
						uniformMaterial(column, style, "entry")
					end
				end
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
		if scenePortId then roofColor = roofColor:Lerp(portRoof, 0.72) end
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
			if form == "carved" and houseTier >= 3 and seed % (if UserInputService.TouchEnabled then 9 else 5) == 0 then
				-- [스와힐리 석조 현관] 기존 단순 막대 문틀을 승인된 실제 석재 아치 메시로 교체한다.
				local portal = importedModel(parent, "Town", "kenney_grey_arch_01",
					pos + Vector3.new(0, 0, front * (dd * 0.5 + 0.45)), math.min(ww * 0.58, 7), false, tintColor)
				if portal then portal.Name = "HarborStonePortal" end
			end
		end
		if lifted and houseTier >= 3 and not vacant
			and seed % (if UserInputService.TouchEnabled then 11 else 7) == 0
			and AssetIds["Town/kenney_wood_railing_01"] then
			-- [동남아·태평양] 고상식 마루 끝에 기등록 목재 난간을 1개만 배치한다.
			local rail = importedModel(parent, "Town", "kenney_wood_railing_01",
				pos + Vector3.new(0, lift, front * (dd * 0.5 + 1.3)), ww * 0.68, false)
			if rail then rail.Name = "HarborStiltVeranda" end
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
		-- [건축 장식 접합] 마을이 아직 workspace에 연결되기 전에도 실제 부품의 경계를 사용한다.
		local facadeDetails = {}
		if architecture.roof and not vacant and seed % (if houseTier >= 3 then 3 else 4) == 0 then
			local roofColor = style.roofs[rng:NextInteger(1, #style.roofs)]
			if scenePortId then roofColor = roofColor:Lerp(portRoof, 0.72) end
			local roof = importedModel(parent, "Town", architecture.roof,
				pos + Vector3.new(0, ext.Y * 0.78, front * ext.Z * 0.28),
				ext.X * 0.45, false, roofColor)
			if roof then
				roof.Name = "HarborRoofDetail"
				uniformMaterial(roof, style, "roof")
				table.insert(facadeDetails, { model = roof, top = true, multi = true })
			end
		end
		-- [입면 정밀 배치] 기존 승인 창호·현관만 실제 주택 표면에 맞춘다.
		-- 모델의 두께/피벗 차이로 벽 속에 묻히거나 바깥에 떠 있는 문제를 방지한다.
		if architecture.trim and not vacant and seed % (if houseTier >= 3 then 2 else 3) == 0 then
			local trim = importedModel(parent, "Town", architecture.trim,
				pos + Vector3.new(ext.X * 0.2, ext.Y * 0.40, front * ext.Z * 0.51),
				ext.X * 0.26, false, style.roofs[1]:Lerp(tintColor, 0.3))
			if trim then
				trim.Name = "HarborWindowDetail"
				uniformMaterial(trim, style, "trim")
				table.insert(facadeDetails, { model = trim })
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
				table.insert(facadeDetails, { model = doorway })
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
			if chim then
				chim.Name = "HarborChimney"
				uniformMaterial(chim, style)
				table.insert(facadeDetails, { model = chim, top = true, multi = true })
			end
		end
		if architecture.balcony and houseTier >= 3 and not vacant and seed % 3 == 0 and (floors or 1) >= 2 then
			local bal = importedModel(parent, "Town", "balcony-wall-fence", pos + Vector3.new(0, size * 0.55, front * size * 0.52), size * 0.7, false, tintColor)
			if bal then
				bal.Name = "HarborBalcony"
				uniformMaterial(bal, style, "trim")
				table.insert(facadeDetails, { model = bal, multi = true })
			end
		end
		-- [입면·지붕 정밀 배치] 생성 중 실제 부품의 회전 경계로 접점을 추정한다.
		-- 지붕·굴뚝은 바닥 중앙/양축, 발코니는 벽 접합 좌우를 검사한다. 메시 표면은 Studio에서 검증한다.
		if #facadeDetails > 0 then
			local houseCF, houseSize = mesh:GetBoundingBox()
			local reach = houseSize.Magnitude + 2
			local visibleParts = {}
			for _, piece in mesh:GetDescendants() do
				if piece:IsA("BasePart") and piece.Transparency < 0.98 then
					table.insert(visibleParts, piece)
				end
			end
			for _, item in facadeDetails do
				local detail = item.model
				local detailCF, detailSize = detail:GetBoundingBox()
				local direction = if item.top then Vector3.new(0, -1, 0) else Vector3.new(0, 0, -front)
				local centerOrigin = if item.top
					then Vector3.new(detailCF.Position.X, houseCF.Position.Y + reach, detailCF.Position.Z)
					else Vector3.new(detailCF.Position.X, detailCF.Position.Y, houseCF.Position.Z + front * reach)
				local halfDepth = (math.abs(detailCF.RightVector:Dot(direction)) * detailSize.X
					+ math.abs(detailCF.UpVector:Dot(direction)) * detailSize.Y
					+ math.abs(detailCF.LookVector:Dot(direction)) * detailSize.Z) * 0.5
				local origins = { centerOrigin }
				if item.multi then
					local spanX = (math.abs(detailCF.RightVector.X) * detailSize.X
						+ math.abs(detailCF.UpVector.X) * detailSize.Y
						+ math.abs(detailCF.LookVector.X) * detailSize.Z) * 0.30
					table.insert(origins, centerOrigin + Vector3.new(-spanX, 0, 0))
					table.insert(origins, centerOrigin + Vector3.new(spanX, 0, 0))
					if item.top then
						local spanZ = (math.abs(detailCF.RightVector.Z) * detailSize.X
							+ math.abs(detailCF.UpVector.Z) * detailSize.Y
							+ math.abs(detailCF.LookVector.Z) * detailSize.Z) * 0.30
						table.insert(origins, centerOrigin + Vector3.new(0, 0, -spanZ))
						table.insert(origins, centerOrigin + Vector3.new(0, 0, spanZ))
					end
				end
				local centerDistance, farthest, closest, supported = math.huge, 0, math.huge, 0
				for sample, origin in origins do
					local nearest = math.huge
					for _, piece in visibleParts do
						local rayOrigin = piece.CFrame:PointToObjectSpace(origin)
						local rayDir = piece.CFrame:VectorToObjectSpace(direction)
						local half = piece.Size * 0.5
						local enter, exit = 0, reach * 2
						for _, axis in { "X", "Y", "Z" } do
							local o, v, h = rayOrigin[axis], rayDir[axis], half[axis]
							if math.abs(v) < 0.000001 then
								if math.abs(o) > h then enter = math.huge; break end
							else
								local lo, hi = (-h - o) / v, (h - o) / v
								enter = math.max(enter, math.min(lo, hi))
								exit = math.min(exit, math.max(lo, hi))
								if enter > exit then break end
							end
						end
						if enter <= exit then nearest = math.min(nearest, enter) end
					end
					if sample == 1 then centerDistance = nearest end
					if nearest < math.huge then
						supported += 1
						closest = math.min(closest, nearest)
						farthest = math.max(farthest, nearest)
					end
				end
				-- 충분한 지지가 있는 평면만 깊은 접점을 사용한다. 경사가 큰 곳의 과도한 매몰은 금지.
				local contactDistance = centerDistance
				local maxEmbed = math.min(0.35, halfDepth * 0.30)
				if item.multi and supported >= 3 and farthest - closest <= maxEmbed then
					contactDistance = farthest
				end
				if contactDistance < math.huge then
					local contact = centerOrigin + direction * contactDistance
					local target = contact - direction * math.max(0, halfDepth - 0.08)
					-- 원래 회전을 유지하고 접합축 방향으로만 이동한다.
					detail:PivotTo(CFrame.new(target - detailCF.Position) * detail:GetPivot())
				elseif item.multi and supported == 0 and #visibleParts > 0 then
					-- 다중 검사에서 본체 지지면이 전혀 없는 신규 비충돌 장식만 제거한다.
					detail:Destroy()
				end
			end
		end
		-- [유럽·지중해·남아시아] 동일한 기본 주택 메시에 지역별 골조/박공/회랑/현관을 얹는다.
		-- 상세 장식은 일부 주택에만 출력하여 모바일 장면의 파트 수를 제한한다.
		-- [문화권 실물 입면] 기존 도형 파츠 장식 대신 승인된 CC0 석재/목재 모듈을 직접 배치한다.
		-- 실제 주택 본체·출입·경제 판정은 그대로 유지. 단계 2의 외벽부터 단계 3의 차양·회랑으로 발전한다.
		if not vacant and houseTier >= 2 and seed % 4 == 1 then
			local form = architecture.form
			local facadeZ = front * (ext.Z * 0.5 + 0.15)
			if form == "stepped" then
				-- 한자 상가: 승인된 짧은 석재 벽 모듈을 3단으로 얹어 박공지붕의 높이선을 구분한다.
				for j = -1, 1 do
					local level = 2 - math.abs(j)
					local gable = importedModel(parent, "Town", "kenney_grey_short_wall_01",
						pos + Vector3.new(j * ext.X * 0.27, ext.Y * (0.78 + level * 0.08),
							front * ext.Z * 0.47), ext.X * (0.32 + level * 0.05), false,
						tintColor:Lerp(style.roofs[1], 0.34))
					if gable then gable.Name = "HarborSteppedGable" end
				end
				if houseTier >= 4 and seed % 8 == 1 and AssetIds["Town/quaternius_wall_bricks"] then
					-- [한자 상가 4단계] 원래 3단 실제 석재 박공을 보존하면서 붉은 벽돌 입면을 강조한다.
					local face = importedModel(parent, "Town", "quaternius_wall_bricks",
						pos + Vector3.new(0, 0, facadeZ), ext.X * 0.8, false, tintColor)
					if face then face.Name = "HarborBrickFacade" end
				end
			elseif form == "timber" then
				-- 영국·북유럽: 단순 가로세로 막대 대신 목골 프레임 실물 메시를 전면에 붙인다.
				local frame = importedModel(parent, "Town", "kenney_wood_wall_double_cross_01",
					pos + Vector3.new(0, ext.Y * 0.20, facadeZ), ext.X * 0.76, false, C(89, 65, 47))
				if frame then frame.Name = "HarborTimberFacade" end
			elseif form == "arcade" or form == "loggia" then
				-- 이베리아·이탈리아: 기존 실물 석주 위에 진짜 아치 메시를 연결한다.
				for _, dx in { -0.32, 0.32 } do
					importedModel(parent, "Terrain", "column",
						pos + Vector3.new(ext.X * dx, 0, front * (ext.Z * 0.52 + 0.85)),
						ext.Y * 0.58, false)
				end
				if houseTier >= 3 then
					local arcade = importedModel(parent, "Town", "kenney_grey_arch_01",
						pos + Vector3.new(0, ext.Y * 0.32, front * (ext.Z * 0.5 + 0.75)),
						ext.X * 0.70, false, tintColor)
					if arcade then arcade.Name = "HarborArcade" end
				end
			elseif form == "veranda" then
				-- 크리올·식민 항구: 승인된 적색 지붕 패널과 목주 메시로 베란다를 구성한다.
				local awning = importedModel(parent, "Town", "kenney_roof_straight_red_01",
					pos + Vector3.new(0, ext.Y * 0.64, front * (ext.Z * 0.5 + 0.85)),
					ext.X * 0.89, false, style.roofs[1])
				if awning then awning.Name = "HarborVerandaRoof" end
				if houseTier >= 3 then
					for _, dx in { -0.38, 0.38 } do
						local support = importedModel(parent, "Town", "kenney_wood_pole_01",
							pos + Vector3.new(ext.X * dx, 0, front * (ext.Z * 0.5 + 1.75)),
							ext.Y * 0.62, false, C(89, 65, 47))
						if support then support.Name = "HarborVerandaPost" end
					end
					if houseTier >= 4 and seed % (if UserInputService.TouchEnabled then 12 else 8) == 1
						and AssetIds["Town/kenney_wood_railing_01"] then
						-- [식민지·크리올 4단계] 기존 실물 기와 차양·목재 기둥 아래 난간만 추가한다.
						local fence = importedModel(parent, "Town", "kenney_wood_railing_01",
							pos + Vector3.new(0, 0, front * (ext.Z * 0.5 + 1.45)), ext.X * 0.78, false)
						if fence then fence.Name = "HarborProsperousVeranda" end
					end
				end
			elseif form == "mansard" then
				-- 프랑스: 기존 승인된 지붕창 실물 메시는 유지한다.
				for _, dx in { -0.26, 0.26 } do
					importedModel(parent, "Town", "roof-high-window",
						pos + Vector3.new(ext.X * dx, ext.Y * 0.83, front * ext.Z * 0.25),
						ext.X * 0.27, false)
				end
			elseif form == "coastal" then
				-- 말라바르: 해안 목조 주택의 처마는 승인된 경사지붕 실물 모델로 표현한다.
				local eave = importedModel(parent, "Town", "kenney_roof_straight_red_01",
					pos + Vector3.new(0, ext.Y * 0.79, 0), ext.X * 0.95, false, style.roofs[1])
				if eave then eave.Name = "HarborCoastalEave" end
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
	if style.cultureKey == "med" or style == STYLE.med then
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
	-- [181항구 고유 팔레트] PortScene.build가 복사한 지역 양식도 원래 문화권의 길·집·복식 규칙을 유지한다.
	if style.cultureKey and STYLE[style.cultureKey] then return style.cultureKey end
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
-- [표시 단계 1~6] 기존 1~5 배열은 sceneLevel로 그대로 읽고, 원본 마을 발전도 6(최고)일 때만 6을 쓴다.
local cityTier = 1
-- [항구 정체성] scenePortId는 house() 위에서 선언해 집·길·랜드마크가 동일한 항구 ID를 사용한다.
-- 정체성 표의 { 재질 이름, R, G, B } → { Enum.Material, Color3 }
local function identityLook(raw)
	if not raw then return nil end
	return { Enum.Material[raw[1]], Color3.fromRGB(raw[2], raw[3], raw[4]) }
end
local function identityStreet()
	local name = scenePortId and PortIdentity.streetAt(scenePortId, sceneLevel)
	return name and identityLook(PortIdentity.STREET_LOOK[name])
end
local function roadMat()
	local look = identityStreet()
	if look then return look[1] end
	-- 발전도별 바닥: 흙 → 자갈 → 포석 → 화강암 → 대리석
	return if sceneLevel <= 1 then Enum.Material.Sand
		elseif sceneLevel == 2 then Enum.Material.Pebble
		elseif sceneLevel == 3 then Enum.Material.Cobblestone
		elseif sceneLevel == 4 then Enum.Material.Granite
		else Enum.Material.Marble
end
local function roadColor(style)
	local look = identityStreet()
	if look then return look[2]:Lerp(style.street, 0.25) end
	-- [181항구 거리] 원래 발전 단계의 길 재질은 보존하고 항구마다 표면의 지역색만 구분한다.
	local _, _, streetTone = PortIdentity.appearance(scenePortId, style.walls[1], style.roofs[1], style.street, Color3)
	if sceneLevel <= 1 then
		return streetTone:Lerp(Color3.fromRGB(176, 146, 104), 0.65)
	end
	return streetTone
end
local function strip(folder, style, cx, cz, sx, sz)
	local p = part(folder, Vector3.new(sx, 0.2, sz), CFrame.new(cx, 0.1, cz), roadColor(style), roadMat())
	p.CanCollide = false
	p.CanQuery = false
	p:SetAttribute("RoadStrip", true) -- [작은 마을 정리] 실제 집 범위 밖 빈 길을 잘라내기 위한 표시
	-- [항구별 날씨] 새로운 도형·효과 인스턴스를 만들지 않고 지시서의 기존 길 표면만 갱신한다.
	local identity = scenePortId and PortIdentity.get(scenePortId)
	if identity then
		local weather = folder:GetAttribute("PortVisualWeather")
		local condition = if type(weather) == "string" then string.lower(weather) else ""
		local wet = string.find(condition, "rain", 1, true) or string.find(condition, "storm", 1, true)
			or string.find(condition, "monsoon", 1, true)
		if wet and (identity.weatherGround == "puddles" or identity.weatherGround == "monsoon_mud") then
			p.Color = p.Color:Lerp(Color3.fromRGB(70, 81, 82), 0.27)
			p.Reflectance = 0.06
			if identity.weatherGround == "monsoon_mud" and sceneLevel <= 2 then p.Material = Enum.Material.Mud end
		elseif not wet and identity.weatherGround == "dust" and (condition == "clear" or condition == "sunny") then
			p.Color = p.Color:Lerp(Color3.fromRGB(194, 154, 107), 0.17)
		end
		if identity.weatherGround == "snow" and folder:GetAttribute("PortSeasonWinterGround") == true then
			p.Color = p.Color:Lerp(Color3.fromRGB(218, 227, 232), 0.38)
		end
	end
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
local NIGHT_DUTY = { "patrol", "scan", "watch", "scan_horizon", "look", "warm" }
local NIGHT_REST = { "yawn", "warm", "lean", "look" }
local EVENING_REST = { "yawn", "warm", "lean" }
local IDLE_POOL = { "talk", "lean", "point", "wave", "write", "inspect", "count", "stretch", "drink", "listen", "salute", "gossip", "warm", "yawn", "clap", "cheer", "scan" } -- 멈춰 선 주민이 상황과 시간에 따라 다른 동작을 한다
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

local function spawnJobs(folder, info, rng, lvl, walkers, key, houseSpots)
	local year = info.year or currentYear
	local o = OUTFIT[key] or OUTFIT.north or {}
	local function person(pos, facing, spec, profession)
		local extra = { year = year, age = spec.age or "adult", profession = spec.profession or profession or spec.role or "villager" }
		local female = if type(spec.female) == "boolean" then spec.female else rng:NextNumber() < 0.47
		extra.female = female
		local old = extra.age == "elder"
		local hairColor = if old then GRAY_HAIR else SKIN_HAIR[rng:NextInteger(1, #SKIN_HAIR)]
		extra.hairColor = hairColor
		-- [개인별 외형] 기존 R15 비율·등록 헤어를 쓰면서 같은 직업도 체격, 걸음새, 헤어가 다르다.
		extra.persona = rng:NextInteger(1, 3)
		extra.height = spec.height or (if extra.age == "child" then rng:NextNumber(5.55, 5.92)
			elseif old then rng:NextNumber(5.55, 5.85) else rng:NextNumber(5.54, 6.06))
		local professionId = extra.profession
		extra.bodyType = spec.bodyType or (if professionId == "farmer" or professionId == "docker"
			or professionId == "construction_worker" then "heavy"
			elseif professionId == "guard" or professionId == "sailor" or professionId == "fisher" then "athletic"
			elseif professionId == "tailor" or professionId == "teacher" then "slim" else nil)
		extra.motionStyle = spec.motionStyle or (if professionId == "guard" then "disciplined"
			elseif professionId == "sailor" or professionId == "docker" then "heavy"
			elseif professionId == "merchant" or professionId == "official" then "scholar"
			elseif professionId == "fisher" or professionId == "craftsman" then "nimble" else nil)
		extra.hair = if female then (if extra.age == "child" then "long"
			elseif rng:NextNumber() < 0.44 then "bun" else "long") else "short"
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
			if t.home then t.home += lift end
			t.lastPos = t.base.Position
			t.lastFacing = t.base.LookVector
		end
		t.phase = t.phase or rng:NextNumber(0, 10)
		-- [개인 생태] 주민마다 고정된 행동 속도와 사회적 리듬. 경제/저장과 분리.
		t.personality = rng:NextInteger(0, 6)
		t.activitySpan = rng:NextNumber(8.5, 21)
		t.socialSpan = rng:NextNumber(29, 53)
		fig:SetAttribute("LivingTempo", t.activitySpan)
		-- [NPC 직업 소품] 기존 승인된 모델을 손 관절에 연결한다. 가상 손동작이 아니라 실제 도구를 사용한다.
		-- 짐·잔·망치·삽은 생성 시 단 한 번만 붙여 모바일 프레임당 소품 생성 비용이 없다.
		local spec = if t.kind == "carry" then { group = "Cargo", asset = if t.goodId and AssetIds["Cargo/" .. t.goodId] then t.goodId else "box-open", mount = "UpperTorso", size = 1.05, offset = CFrame.new(0, -0.35, -1.0) }
			elseif t.kind == "drink" then { group = "Cargo", asset = "mug", mount = "RightHand", size = 0.45, offset = CFrame.new(0, -0.2, -0.25) }
			elseif t.kind == "hammer" then { group = "Relics", asset = "hammer", mount = "RightHand", size = 1.05, offset = CFrame.new(0, -0.45, -0.15) * CFrame.Angles(0, 0, math.rad(80)) }
			elseif t.kind == "hoe" then { group = "Naval", asset = "tool-shovel", mount = "RightHand", size = 1.6, offset = CFrame.new(0, -0.8, -0.3) * CFrame.Angles(math.rad(80), 0, 0) }
			-- [개별 근무 도구] 일과형 주민은 t.kind 없이 출근하므로 실제 직업에서 승인된 기존 소품을 선택한다.
			-- 같은 소품을 교대마다 다시 만들지 않고 휴식 중에는 숨긴다.
			elseif t.mode == "schedule" and (t.job == "merchant" or t.job == "laborer") then { group = "Cargo", asset = "box-open", mount = "UpperTorso", size = 0.82, offset = CFrame.new(0, -0.35, -0.9) }
			elseif t.mode == "schedule" and t.job == "sailor" then { group = "Relics", asset = "rope-bundle-a", mount = "UpperTorso", size = 0.8, offset = CFrame.new(0, -0.35, -0.9) }
			elseif t.mode == "schedule" and t.job == "guard" then { group = "Relics", asset = "weapon-sword", mount = "RightHand", size = 1.0, offset = CFrame.new(0, -0.45, -0.1) * CFrame.Angles(0, 0, math.rad(75)) }
			elseif t.mode == "schedule" and t.job == "craftsman" then { group = "Relics", asset = "hammer", mount = "RightHand", size = 1.0, offset = CFrame.new(0, -0.45, -0.15) * CFrame.Angles(0, 0, math.rad(80)) }
			elseif t.mode == "schedule" and t.job == "farmer" then { group = "Naval", asset = "tool-shovel", mount = "RightHand", size = 1.5, offset = CFrame.new(0, -0.8, -0.3) * CFrame.Angles(math.rad(80), 0, 0) }
			elseif t.mode == "schedule" and t.job == "fisher" then { group = "Naval", asset = "fishing-net", mount = "UpperTorso", size = 0.84, offset = CFrame.new(0, -0.4, -0.9) }
			elseif t.mode == "schedule" and t.job == "official" then { group = "Relics", asset = "map-rolled", mount = "RightHand", size = 0.7, offset = CFrame.new(0, -0.35, -0.1) }
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
					mesh:SetAttribute("WorkPropOriginalTransparency", mesh.Transparency)
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
			if not ok then
				held:Destroy()
			else
				t.workProp = held
				fig:SetAttribute("WorkPropId", spec.group .. "/" .. spec.asset)
			end
		end
		table.insert(walkers, t)
	end
	local function stay(pos, target, kind, spec)
		spec = spec or {}
		local fig = person(pos, faceTo(pos, target), spec, kind)
		addTask(fig, { kind = kind, mode = "stay", job = spec.profession, workKinds = spec.workKinds, tradeKinds = spec.tradeKinds, leisureKinds = spec.leisureKinds, socialKinds = spec.socialKinds })
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
	local touchJobs = game:GetService("UserInputService").TouchEnabled
	local residents = if info.sim then math.max(0, math.floor(tonumber(info.sim.residents) or 0)) else 20 + lvl * 12
	local employment = info.sim and info.sim.jobs
	-- [직업별 시간표] 경제 직업 ID와 실제 고용 인원만 사용한다. 생활 단계와 위치는 연출 전용.
	local dayJobs = {
		{ job = "merchant", role = "Rogue", wake = 6.6, market = 9.4, leave = 17.2, home = 21.8,
			work = { "pack", "count", "ledger", "weigh" }, trade = { "offer", "receive", "bargain", "stall" }, rest = { "gossip", "drink", "listen" } },
		{ job = "sailor", role = "Barbarian", wake = 5.2, market = 9.8, leave = 16.8, home = 21.0,
			work = { "knot", "chart", "check_compass", "haul_rope" }, trade = { "unload", "offer", "inspect" }, rest = { "stretch", "cheer", "talk" } },
		{ job = "guard", role = "Knight", wake = 5.8, market = 10.6, leave = 16.4, home = 22.1,
			work = { "patrol", "scan", "salute", "watch" }, trade = { "guide", "look", "patrol" }, rest = { "warm", "lean", "yawn" } },
		{ job = "craftsman", role = "Barbarian", wake = 6.2, market = 10.7, leave = 16.7, home = 21.0,
			work = { "saw", "carve", "inspect", "plane_wood" }, trade = { "pack", "count", "offer" }, rest = { "stretch", "gossip", "drink" } },
		{ job = "farmer", role = "Barbarian", wake = 5.0, market = 10.4, leave = 15.7, home = 20.7,
			work = { "hoe", "harvest", "sow", "water" }, trade = { "sort_crop", "offer", "receive" }, rest = { "stretch", "drink", "listen" } },
		{ job = "fisher", role = "Barbarian", wake = 4.8, market = 10.0, leave = 16.2, home = 20.5,
			work = { "fish", "net", "reel", "mend_net" }, trade = { "offer", "receive", "weigh" }, rest = { "drink", "talk", "stretch" } },
		{ job = "official", role = "Mage", wake = 7.0, market = 11.0, leave = 16.3, home = 21.1,
			work = { "seal", "write", "read", "count" }, trade = { "guide", "ledger", "point" }, rest = { "read", "talk", "listen" } },
		{ job = "laborer", role = "Rogue", wake = 5.6, market = 10.2, leave = 16.0, home = 20.9,
			work = { "carry", "lift", "stack", "sweep" }, trade = { "unload", "pack", "offer" }, rest = { "stretch", "drink", "gossip" } },
		{ job = "clergy", role = "Mage", wake = 6.8, market = 11.2, leave = 16.0, home = 20.6,
			work = { "pray", "read", "bless", "bell" }, trade = { "listen", "guide", "talk" }, rest = { "read", "warm", "look" } },
	}
	local remainingJobs, dayJobCount = {}, 0
	for _, duty in dayJobs do
		local employed = if employment then math.max(0, math.floor(tonumber(employment[duty.job]) or 0))
			else math.max(1, lvl)
		remainingJobs[duty.job] = employed
		dayJobCount += employed
	end
	local livingCount = math.min(residents, dayJobCount,
		if touchJobs then math.min(6, 1 + lvl + math.floor(residents / 24))
		else math.min(12, 2 + lvl * 2 + math.floor(residents / 16)))
	local scheduledPeople = {}
	for i = 1, livingCount do
		-- [고용 명수] 1명을 여러 직업에 재사용하지 않고 각 직업의 실제 보유 슬롯을 소진한다.
		local duty
		for offset = 0, #dayJobs - 1 do
			local candidate = dayJobs[(i + offset - 1) % #dayJobs + 1]
			if remainingJobs[candidate.job] > 0 then
				duty = candidate
				remainingJobs[candidate.job] -= 1
				break
			end
		end
		if not duty then break end
		local side = if i % 2 == 0 then 1 else -1
		local work = Vector3.new(-56 - i * 5, 0, side * 22)
		local market = Vector3.new(-44 - i * 4, 0, side * 12)
		local evening = if side > 0 then Vector3.new(-26 - i * 3, 0, 12)
			else Vector3.new(-18 - i * 2, 0, -24)
		-- [귀가] 작업장과 분리된 근처 주거 골목. 기존 도로를 횡단하지 않는 같은 쪽 동선.
		local home = work + Vector3.new(0, 0, side * 10)
		-- [각자의 생활 · 2026-11-29 오너: "중앙 광장에만 모여 있다, 주민들 각자 생활하라고, 현실처럼"]
		-- 예전엔 모든 주민의 일터·시장·저녁·집이 광장 옆 좁은 칸(x -18~-116, z ±24)에 몰렸다.
		-- 이제 집 = 실제 지어진 집 앞 골목, 일터 = 직업별 실제 장소(부두·교역소·항만청·길드·서재·마을 가장자리 밭),
		-- 저녁 = 주점 앞, 시장 = 광장 가장자리 원 위 각자 다른 자리. 같은 장소도 사람마다 몇 걸음씩 다르게.
		do
			local function fac(tab: string): Vector3?
				local v = folder:GetAttribute("CityFacilityPosition_" .. tab)
				return if typeof(v) == "Vector3" then v else nil
			end
			local jitter = Vector3.new(rng:NextNumber(-5, 5), 0, rng:NextNumber(-5, 5))
			local dock = Vector3.new(rng:NextNumber(24, 66), 0, rng:NextNumber(-26, 26))
			local edgeX = -120 - lvl * 18
			local workAt = {
				merchant = fac("trade"), sailor = dock, fisher = dock + Vector3.new(0, 0, 8), laborer = dock,
				guard = fac("route"), official = fac("harbor") or fac("route"), craftsman = fac("market"),
				clergy = fac("codex") or fac("tech"), farmer = Vector3.new(edgeX, 0, side * rng:NextNumber(30, 90)),
			}
			local w = workAt[duty.job]
			if w then work = w + jitter end
			local angle = (i * 2.399) % (2 * math.pi) -- 황금각: 시장 원 위에 겹치지 않게 흩어짐
			market = Vector3.new(-6 + math.cos(angle) * 31, 0, math.sin(angle) * 31)
			local tavern = fac("board")
			if tavern then evening = tavern + Vector3.new(rng:NextNumber(-7, 7), 0, rng:NextNumber(4, 9) * (if tavern.Z >= 0 then -1 else 1)) end
			local spots = houseSpots or {}
			if #spots > 0 then
				local spot = spots[(i - 1) % #spots + 1]
				-- 집 앞 골목(길 가장자리)에 선다. 집 몸체 안으로 들어가지 않는다.
				local doorZ = spot.side * (spot.laneZ + spot.laneW * 0.5 + 1)
				home = Vector3.new(spot.pos.X + rng:NextNumber(-3, 3), 0, doorZ)
			end
		end
		local shift = rng:NextNumber(-0.32, 0.32)
		local marketAt = duty.market + shift
		local marketEnd = duty.leave + shift
		local homeAt = duty.home + shift
		-- [복장 다양화] 일괄 선원모를 제거하고 지역 전통모자·직업별 모자·장년층 머리색을 활용한다.
		local attire = { role = duty.role, profession = duty.job }
		if duty.job == "farmer" or duty.job == "fisher" then
			attire.hat = "straw"
		elseif duty.job == "sailor" or duty.job == "laborer" then
			attire.hat = "cap"
		elseif duty.job == "clergy" then
			attire.hat = false
		end
		if (duty.job == "merchant" or duty.job == "official" or duty.job == "clergy") and i % 5 == 0 then
			attire.age = "elder"
		end
		local fig = person(work, faceTo(work, market), attire, duty.job)
		addTask(fig, { mode = "schedule", morning = work, market = market, evening = evening, home = home,
			job = duty.job, workKinds = duty.work, tradeKinds = duty.trade, leisureKinds = duty.rest,
			phase = rng:NextNumber(0, 10), socialKind = duty.rest[(i - 1) % #duty.rest + 1],
			wakeAt = duty.wake + shift, marketAt = marketAt, marketEnd = marketEnd, homeAt = homeAt,
			breakAt = math.min(marketEnd - 1.3, marketAt + 1.8 + rng:NextNumber(0.4, 1.2)),
			breakSpan = rng:NextNumber(0.5, 0.9),
			travelPace = rng:NextNumber(0.83, 1.12), travelOffset = rng:NextNumber(-1.3, 1.3) })
		if fig then
			fig:SetAttribute("Job", duty.job)
			fig:SetAttribute("DailyRoutine", "work")
			local this = walkers[#walkers]
			if this and this.model == fig then
				-- [동선·만남] 같은 시장 골목에서 출퇴근하는 두 직업을 고정 파트너로 묶는다.
				-- 홀/짝 Z측 골목을 넘어 순간이동하지 않도록 두 칸 떨어진 주민만 짝을 맺는다.
				local previous = (i % 4 == 3 or i % 4 == 0) and scheduledPeople[i - 2] or nil
				if previous and previous.model.Parent then
					this.socialPartner, previous.socialPartner = previous, this
					this.socialLead, previous.socialLead = false, true
				end
				table.insert(scheduledPeople, this)
			end
		end
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
	-- [완공 축하] 최근 완공한 건물이 있으면 광장 쪽에 깃발 줄을 세운다(승인된 깃발 에셋만, 3일간).
	if info.celebrate then
		local spots = { Vector3.new(-28, 0, 22), Vector3.new(-28, 0, -22), Vector3.new(-52, 0, 26), Vector3.new(-52, 0, -26), Vector3.new(-76, 0, 22), Vector3.new(-76, 0, -22) }
		for _, at in spots do
			importedModel(folder, "Castle", "flag-banner-short", at, 7, false)
		end
		folder:SetAttribute("BuildCelebrate", tostring(info.celebrate.name))
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
		local animalVisual = PortBuildings.AnimalVisual
		local KIND = {
			duck = { 1.35, "peck" },
			cow = { animalVisual.cow.size, "graze" }, horse = { animalVisual.horse.size, "graze" },
			sheep = { animalVisual.sheep.size, "graze" }, pig = { animalVisual.pig.size, "peck" },
			llama = { animalVisual.llama.size, "graze" }, donkey = { animalVisual.donkey.size, "graze" },
			elephant = { animalVisual.elephant.size, "still" }, chicken = { animalVisual.chicken.size, "peck" },
			dog = { animalVisual["dog-pug"].size, "tail" }, cat = { animalVisual.cat.size, "still" },
		}
		local list = SPECIES[key] or SPECIES.britain
		local function animal(species, pos)
			local k = KIND[species]
			local asset = if species == "dog" then "dog-pug" else species
			local skin = animalVisual[asset]
			-- [품종별 코트] 직업·서식지·사육량을 바꾸지 않도록 기존 RNG 소비 없이 좌표로만 품종을 선택한다.
			local coatIndex = if skin then 1 + math.floor(math.abs(pos.X * 0.21 + pos.Z * 0.39 + #walkers * 0.67)) % #skin.coats else 0
			local coat = if skin then Color3.fromRGB(table.unpack(skin.coats[coatIndex])) else nil
			-- [승인 모델만 표시] 오리 실물 자산이 없는 상태에서 금지된 구체 파츠로 대체하지 않는다.
			local m = if k and AssetIds["Animals/" .. asset]
				then importedModel(folder, "Animals", asset, pos, k[1], false, coat) else nil
			if not m then return end
			-- [시각 진단] 실제 동물 몸체 스케일과 털색 품종. 저장 키·경제 가축 수가 아니다.
			m:SetAttribute("AnimalSpecies", species)
			m:SetAttribute("AnimalVisualSize", k and k[1] or 1.35)
			m:SetAttribute("AnimalCoatIndex", coatIndex)
			-- 가축은 월드 기준 회전이나 X/Z 축 기울기를 적용하지 않는다. 원본 방향을 제자리에서만 정규화한다.
			local origin = m:GetPivot()
			local forward = origin.LookVector
			local upright = if math.abs(forward.X) + math.abs(forward.Z) > 0.01
				then CFrame.lookAt(origin.Position, origin.Position + Vector3.new(forward.X, 0, forward.Z))
				else CFrame.new(origin.Position)
			local yaw = rng:NextNumber(-math.pi, math.pi)
			m:PivotTo(upright * CFrame.Angles(0, yaw, 0))
			-- [회전 후 실측 접지] 수입 모델의 기준점이 몸 중앙에 있어도 회전 후 실제 발바닥이 지면에 남는다.
			local lowestY = math.huge
			for _, footPart in m:GetDescendants() do
				if footPart:IsA("BasePart") and footPart.Transparency < 0.98 then
					local half = footPart.Size * 0.5
					local pose = footPart.CFrame
					lowestY = math.min(lowestY, pose.Position.Y
						- math.abs(pose.RightVector.Y) * half.X - math.abs(pose.UpVector.Y) * half.Y
						- math.abs(pose.LookVector.Y) * half.Z)
				end
			end
			if lowestY < math.huge then
				m:PivotTo(CFrame.new(0, pos.Y - lowestY, 0) * m:GetPivot())
			end
			-- [외부 가축 원본 관절] 스킨 본·모터 또는 분리된 사지 메시만 수집한다.
			-- 원본 한 덩어리 메시의 형상을 무리하게 뒤틀거나 새 관절·메시를 생성하지 않는다.
			local animalJoints, animalParts = {}, {}
			local basePivot = m:GetPivot()
			local occupiedParts, drivenParts = {}, {}
			for _, node in m:GetDescendants() do
				if node:IsA("Motor6D") then
					if node.Part1 then occupiedParts[node.Part1] = true end
				elseif node:IsA("AnimationConstraint") then
					local target = node.Attachment1 and node.Attachment1.Parent
					if target and target:IsA("BasePart") then occupiedParts[target] = true end
				end
			end
			local rigBox, rigBounds = m:GetBoundingBox()
			-- [가축 관절] 수입 모델의 본 로컬 X축은 좌우 다리마다 다를 수 있다.
			-- 실제 머리 방향에서 몸의 좌우축을 얻고, 다리 분류도 몸 기준 좌표로 한다.
			local rigRight, rigForward, facingKnown
			local biped = species == "chicken" or species == "duck"
			local legHinges = {}
			do
				local front, rear, heads, tails = Vector3.zero, Vector3.zero, 0, 0
				for _, node in m:GetDescendants() do
					local point = if node:IsA("Bone") then node.WorldPosition
						elseif node:IsA("BasePart") then node.Position else nil
					if point then
						local name = node.Name:lower()
						if name:find("head", 1, true) or name:find("muzzle", 1, true) or name:find("beak", 1, true) then
							front += point; heads += 1
						elseif name:find("tail", 1, true) then rear += point; tails += 1 end
					end
				end
				local axis = if heads > 0 then (front / heads - (if tails > 0 then rear / tails else rigBox.Position)) * Vector3.new(1, 0, 1) else Vector3.zero
				facingKnown = axis.Magnitude > math.max(0.08, rigBounds.Magnitude * 0.02)
				rigForward = if facingKnown then axis.Unit else basePivot.LookVector
				rigRight = rigForward:Cross(Vector3.yAxis).Unit
			end
			local bodyExtent = math.max(rigBounds.X, rigBounds.Y, rigBounds.Z)
			for _, node in m:GetDescendants() do
				-- 관절 자체 이름이 일반적일 때 실제 움직이는 사지의 파츠 이름까지 확인한다.
				local name = string.lower(node.Name)
				if node:IsA("Motor6D") and node.Part1 then
					name = name .. " " .. string.lower(node.Part1.Name)
				elseif node:IsA("AnimationConstraint") and node.Attachment1 and node.Attachment1.Parent then
					name = name .. " " .. string.lower(node.Attachment1.Parent.Name)
				end
				local leg = name:find("leg", 1, true) or name:find("hoof", 1, true)
					or name:find("paw", 1, true) or name:find("foot", 1, true)
					or name:find("knee", 1, true) or name:find("hock", 1, true) or name:find("toe", 1, true)
				local head = name:find("head", 1, true) or name:find("neck", 1, true)
				local tail = name:find("tail", 1, true)
				local ear = name:find("ear", 1, true) and not name:find("heart", 1, true)
				local wing = name:find("wing", 1, true)
				local trunk = name:find("trunk", 1, true)
				local kind = if leg then "leg" elseif head then "head" elseif tail then "tail"
					elseif ear then "ear" elseif wing then "wing" elseif trunk then "trunk" else nil
				if kind then
					local left = name:find("left", 1, true) or name:find("_l", 1, true)
						or name:sub(1, 2) == "l_"
					local rear = name:find("hind", 1, true) or name:find("rear", 1, true)
						or name:find("back", 1, true)
					local targetPart = if node:IsA("Motor6D") then node.Part1
						elseif node:IsA("AnimationConstraint") then node.Attachment1 and node.Attachment1.Parent else nil
					local legFrame, legChild
					if kind == "leg" then
						legFrame = if node:IsA("Bone") then node.WorldCFrame
							elseif node:IsA("Motor6D") and node.Part0 then node.Part0.CFrame * node.C0
							elseif node:IsA("AnimationConstraint") and node.Attachment0 then node.Attachment0.WorldCFrame
							elseif node:IsA("BasePart") then node.CFrame else nil
						if legFrame and facingKnown then
							local rel = (if targetPart and targetPart:IsA("BasePart") then targetPart.Position else legFrame.Position) - rigBox.Position
							left, rear = rel:Dot(rigRight) < 0, rel:Dot(rigForward) < 0
						end
						if biped then rear = false end
						-- 하위 본에는 상위 본의 회전이 이미 전달된다. 발목에 보폭을 다시 더하지 않는다.
						local ancestor = if node:IsA("Bone") then node.Parent
							elseif node:IsA("Motor6D") then node.Part0
							elseif node:IsA("AnimationConstraint") and node.Attachment0 then node.Attachment0.Parent else nil
						while ancestor and ancestor ~= m do
							local n = ancestor.Name:lower()
							if n:find("leg", 1, true) or n:find("hoof", 1, true) or n:find("foot", 1, true)
								or n:find("knee", 1, true) or n:find("hock", 1, true) then legChild = true; break end
							if not ancestor:IsA("Bone") then break end
							ancestor = ancestor.Parent
						end
					end
					local side = if left then 1 else -1
					-- [사족 보행] 소·말·양은 네 발 순서대로 딛고, 개·고양이는 대각선 보폭을 사용한다.
					local fourBeat = species == "cow" or species == "horse" or species == "donkey"
						or species == "sheep" or species == "llama" or species == "elephant" or species == "pig"
					local phaseOffset = if kind ~= "leg" then 0 elseif fourBeat then
						(if rear then (if left then math.pi * 1.5 else math.pi * 0.5)
						else (if left then 0 else math.pi))
						else (if rear then (if left then math.pi else 0) else (if left then 0 else math.pi))
					-- [중복 관절 제거] 한 다리의 무릎·발목은 서로 다른 보행 다리로 집계하지 않는다.
					local legGroup = if kind == "leg" then (if rear then "rear" else "front")
						.. (if left then "_left" else "_right") else nil
					if node:IsA("Bone") and #animalJoints < 14 then
						-- 스킨 메시는 원본 Bone.Transform으로만 변형한다.
						table.insert(animalJoints, { joint = node, base = node.Transform,
							kind = kind, side = side, phase = phaseOffset, group = legGroup,
							legAxis = legFrame and legFrame:VectorToObjectSpace(rigRight), legChild = legChild })
					elseif targetPart and targetPart:IsA("BasePart") then
						if targetPart.Anchored then
							-- [외부 FBX 실제 표시] 가져온 동물은 모든 파츠가 고정된다.
							-- 고정된 Motor6D/AnimationConstraint는 관절값만 갱신해도 사지가 이동하지 않으므로
							-- 실제 Part1 메시를 기존 Model:PivotTo 뒤에만 보간한다.
							if not drivenParts[targetPart] and #animalParts < 12
								and math.max(targetPart.Size.X, targetPart.Size.Y, targetPart.Size.Z) < bodyExtent * 0.77 then
								table.insert(animalParts, { part = targetPart, base = basePivot:ToObjectSpace(targetPart.CFrame),
									kind = kind, side = side, phase = phaseOffset, group = legGroup,
									hinge = math.min(targetPart.Size.Y * 0.34, 0.65) })
								drivenParts[targetPart] = true
							end
						elseif #animalJoints < 14 then
							table.insert(animalJoints, { joint = node, base = node.Transform,
								kind = kind, side = side, phase = phaseOffset, group = legGroup,
								legAxis = legFrame and legFrame:VectorToObjectSpace(rigRight), legChild = legChild })
						end
					elseif node:IsA("BasePart") and not occupiedParts[node] and not drivenParts[node]
						and #animalParts < 12
						and math.max(node.Size.X, node.Size.Y, node.Size.Z) < bodyExtent * 0.77 then
						-- 한 덩어리 전신 메시를 다리나 고개로 오인해 회전시키지 않는다.
						table.insert(animalParts, { part = node, base = basePivot:ToObjectSpace(node.CFrame),
							kind = kind, side = side, phase = phaseOffset, group = legGroup,
							hinge = math.min(node.Size.Y * 0.34, 0.65) })
						drivenParts[node] = true
					end
				end
			end
			-- [가축 분리 메시] 발굽·정강이가 따로 수입돼도 다리 전체가 하나의 상단 회전점을 공유한다.
			do
				for _, limb in animalParts do
					if limb.group then
						local part = limb.part
						local cf, half = part.CFrame, part.Size * 0.5
						local top = cf.Position + Vector3.yAxis * (math.abs(cf.RightVector.Y) * half.X
							+ math.abs(cf.UpVector.Y) * half.Y + math.abs(cf.LookVector.Y) * half.Z)
						local current = legHinges[limb.group]
						if not current or top.Y > current.Y then legHinges[limb.group] = top end
					end
				end
				for _, limb in animalParts do
					if limb.group then
						limb.legHinge = basePivot:PointToObjectSpace(legHinges[limb.group])
						limb.legAxis = basePivot:VectorToObjectSpace(rigRight)
					end
				end
			end
			local gaitOf = { dog = 15, cat = 11, duck = 17, chicken = 17, pig = 9, sheep = 8,
				cow = 5.5, horse = 6.5, donkey = 7, llama = 7, elephant = 4 }
			local stepOf = { dog = 2.2, cat = 1.9, duck = 1.1, chicken = 1.0, pig = 2.5, sheep = 2.6,
				cow = 3.8, horse = 4.3, donkey = 3.2, llama = 3.4, elephant = 4.8 }
			m:SetAttribute("AnimalRigParts", #animalParts)
			m:SetAttribute("AnimalRigJoints", #animalJoints)
			-- [보행 오판 방지] 무릎·발목이 많은 한쪽 다리만으로 걷기 리그를 판정하지 않는다.
			local legGroups, legCount = {}, 0
			for _, limb in animalJoints do
				if limb.group and not legGroups[limb.group] then
					legGroups[limb.group] = true
					legCount += 1
				end
			end
			for _, limb in animalParts do
				if limb.group and not legGroups[limb.group] then
					legGroups[limb.group] = true
					legCount += 1
				end
			end
			local requiredLegs = if biped then 2 else 4
			local canWalk = facingKnown and legCount == requiredLegs
			m:SetAttribute("AnimalFacing", if facingKnown then "ANATOMICAL_FORWARD" else "UNVERIFIED_STATIC")
			m:SetAttribute("AnimalLegGroups", legCount)
			m:SetAttribute("AnimalRequiredLegGroups", requiredLegs)
			m:SetAttribute("AnimalMotionRig", if canWalk and #animalJoints > 0 then "JOINTED_WALK"
				elseif canWalk then "SEGMENTED_WALK"
				elseif #animalJoints + #animalParts > 0 then "IDLE_ONLY" else "STATIC_UNRIGGED")
			table.insert(walkers, { model = m, base = basePivot, mode = "animal",
				akind = k[2], phase = rng:NextNumber(0, 10), gait = gaitOf[species] or 7,
				stepSize = stepOf[species] or 2.5, hd = 0, animalType = species,
				animalJoints = animalJoints, animalParts = animalParts, canWalk = canWalk, homeFloor = pos.Y,
				forward = rigForward,
				groundOffset = 0, groundTarget = 0, groundCheckAt = 0, travelPhase = 0 })
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
			-- [단계별·가축별 방목 · 2026-11-29 오너: "목장 목축업 단계별 방목, 가축별로 다르고, 지역마다 달라야"]
			-- 1단계 울타리 없는 작은 방목 → 2단계 말뚝 → 3단계 나무 울타리·축사 → 4~5단계 넓은 목장(돌담 문화권은 돌담).
			-- 땅 색·무리 모양·마릿수 배율이 가축마다 다르다. 경제 가축 수·저장은 그대로(화면만).
			local stage = math.clamp(lvl, 1, 5)
			local stageScale = ({ 0.4, 0.55, 0.7, 0.85, 1 })[stage]
			local halfX = (if sp == "pig" then rural.pigHalfX else rural.pastureHalfX) * stageScale
			local halfZ = (if sp == "pig" then rural.pigHalfZ else rural.pastureHalfZ) * stageScale
			local SPECIES_GROUND = {
				pig = { C(124, 100, 72), Enum.Material.Mud }, sheep = { C(132, 154, 96), Enum.Material.Grass },
				cow = { C(88, 136, 70), Enum.Material.Grass }, horse = { C(100, 132, 76), Enum.Material.Grass },
				donkey = { C(158, 140, 98), Enum.Material.Ground }, llama = { C(164, 146, 102), Enum.Material.Ground },
				elephant = { C(150, 104, 76), Enum.Material.Ground },
			}
			local groundLook = SPECIES_GROUND[sp or ""] or { C(105, 139, 82), Enum.Material.Grass }
			local grass = part(folder, Vector3.new(halfX * 2, 0.12, halfZ * 2), CFrame.new(c.X, 0.26, c.Z),
				groundLook[1], groundLook[2])
			grass:SetAttribute("PastureStage", stage)
			grass:SetAttribute("PastureSpecies", sp or "none")
			grass.Name = if sp == "pig" then "PigYard" else "OpenPasture"
			grass.CanCollide = false
			-- [실물 지면] 비충돌 잔디·흙 바닥도 동물의 접지 레이캐스트에는 포함한다.
			grass.CanQuery = true
			grass:SetAttribute("BuildPlotId", info.portId .. ":pasture:" .. i)
			grass:SetAttribute("BuildType", "farm")
			grass:SetAttribute("BuildAuthority", "VISUAL_ONLY")
			grass:SetAttribute("PlotHalfWidth", halfX)
			grass:SetAttribute("PlotHalfDepth", halfZ)
			grass:SetAttribute("EconomicFarmCount", tonumber(farmCount) or -1)
			-- [울타리 최적화] 26스튜드 단위로 길이별 기존 실물 레일을 확대해 넓은 둘레를 적은 메시로 감싼다.
			-- 단계별: 1 없음(목동이 지킴) · 2 말뚝 · 3 나무 레일 · 4~5 돌담 문화권은 돌담, 그 외 긴 나무 울타리.
			local stoneCulture = key == "britain" or key == "nordic" or key == "hanse" or key == "stone"
				or key == "med" or key == "iberia" or key == "italy"
			local fenceAsset = if stage <= 1 then nil elseif stage == 2 then "fence_post"
				elseif stage >= 4 and stoneCulture and AssetIds["Town/kenney_grey_short_wall_01"] then "kenney_grey_short_wall_01"
				elseif stage >= 4 and AssetIds["Town/fence_straight_long"] then "fence_straight_long" else "fence_rails_long"
			grass:SetAttribute("PastureFence", fenceAsset or "open")
			local xSections = math.ceil(halfX * 2 / rural.fenceSegmentMax)
			local xStep = halfX * 2 / xSections
			for k = 1, xSections do
				local x = -halfX + (k - 0.5) * xStep
				for _, dz in { -halfZ, halfZ } do
					if fenceAsset then importedModel(folder, "Town", fenceAsset, c + Vector3.new(x, 0, dz), if fenceAsset == "fence_post" then 2.6 else xStep * 0.98, false) end
				end
			end
			local zSections = math.ceil(halfZ * 2 / rural.fenceSegmentMax)
			local zStep = halfZ * 2 / zSections
			for k = 1, zSections do
				local z = -halfZ + (k - 0.5) * zStep
				for _, dx in { -halfX, halfX } do
					local at = c + Vector3.new(dx, 0, z)
					local rail = fenceAsset and importedModel(folder, "Town", fenceAsset, at, if fenceAsset == "fence_post" then 2.6 else zStep * 0.98, false)
					if rail then rotateAround(rail, at, math.pi / 2) end
				end
			end
			-- 사육지 안쪽 급수통은 승인된 Cargo 메시 1개만 쓰고 경제 수량에는 반영하지 않는다.
			local trough = importedModel(folder, "Cargo", "bucket", c + Vector3.new(halfX - 15, 0, -halfZ + 15), 3.4, false)
			if trough then trough.Name = "PastureWater_" .. i end
			-- [단계별 목장 시설] 2단계부터 건초 더미, 3단계부터 축사(소·말·당나귀·양).
			if sp and stage >= 2 and sp ~= "pig" and AssetIds["Terrain/village-hay"] then
				importedModel(folder, "Terrain", "village-hay", c + Vector3.new(-halfX + 10, 0, halfZ - 10), 4.5, false)
				if stage >= 4 then importedModel(folder, "Terrain", "village-hay", c + Vector3.new(-halfX + 17, 0, halfZ - 9), 4.2, false) end
			end
			if sp and stage >= 3 and (sp == "cow" or sp == "horse" or sp == "donkey" or sp == "sheep")
				and AssetIds["Town/village-stable"] then
				local stable = importedModel(folder, "Town", "village-stable", c + Vector3.new(halfX - 16, 0, halfZ - 14), 15, true)
				if stable then stable.Name = "PastureStable_" .. sp end
			end
			if sp then
				-- 가축별 무리: 양은 한데 모여 다니고, 말은 둘씩, 소는 넓게 흩어지고, 돼지는 물통 근처.
				local herdMul = ({ sheep = 1.7, cow = 1.0, horse = 0.7, pig = 1.2, donkey = 0.6, llama = 1.1 })[sp] or 1
				local herd = math.max(1, math.floor(grazeCount * herdMul * (0.6 + 0.1 * stage) + 0.5))
				local flockAt = c + Vector3.new(rng:NextNumber(-halfX * 0.3, halfX * 0.3), 0, rng:NextNumber(-halfZ * 0.3, halfZ * 0.3))
				if sp == "elephant" then
					animal(sp, c)
				else
					for k = 1, herd do
						local at = if sp == "sheep" then flockAt + Vector3.new(rng:NextNumber(-9, 9), 0, rng:NextNumber(-7, 7))
							elseif sp == "pig" then c + Vector3.new(halfX - 15, 0, -halfZ + 15) + Vector3.new(rng:NextNumber(-12, 4), 0, rng:NextNumber(-4, 12))
							elseif sp == "horse" and k % 2 == 0 then flockAt + Vector3.new(rng:NextNumber(-3, 3), 0, rng:NextNumber(-3, 3))
							else c + Vector3.new(rng:NextNumber(-halfX * 0.65, halfX * 0.65), 0, rng:NextNumber(-halfZ * 0.58, halfZ * 0.58))
						if sp == "horse" and k % 2 == 1 then flockAt = at end
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
			-- [중앙광장 공터] 개 집 위치(+왕복 6스터드)가 광장 반경 26 안으로 들어오지 않게 광장 밖에 둔다.
			roam("dog", Vector3.new(-2, 0, 35), 6)
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
			farmer = { name = "농부", kinds = { "hoe", "harvest", "sow", "weed", "inspect", "plant", "water", "sort_crop" }, rest = { "stretch", "gossip", "drink", "warm", "yawn" }, spec = { role = "Barbarian", hat = "straw" }, tint = C(110, 125, 76) },
			fisher = { name = "어부", kinds = { "fish", "net", "reel", "lift", "inspect", "mend_net", "haul_rope" }, rest = { "drink", "talk", "stretch", "scan", "warm" }, spec = { role = "Barbarian", hat = "knit" }, tint = C(70, 106, 146) },
			craftsman = { name = "장인", kinds = { craft, "carve", "plane", "inspect", "count", "hammer", "sharpen", "plane_wood", "measure" }, rest = { "stretch", "drink", "gossip", "polish" }, spec = { role = "Barbarian", hat = "cap" }, tint = C(146, 99, 57) },
			merchant = { name = "상인", kinds = { "stall", "weigh", "bargain", "pack", "count", "offer", "receive", "ledger" }, rest = { "gossip", "drink", "listen", "clap" }, spec = { role = "Rogue" }, prop = { "Town", "stall", 6.5 }, tint = C(121, 71, 132) },
			sailor = { name = "선원", kinds = { "knot", "chart", "unload", "lift", "carry", "scan", "salute", "haul_rope", "scrub_deck", "check_compass" }, rest = { "drink", "cheer", "talk", "stretch" }, spec = { role = "Barbarian", hat = "cap" }, tint = C(59, 92, 138) },
			guard = { name = "경비병", kinds = { "patrol", "scan", "drill", "salute", "look", "point", "scan_horizon", "lock_gate", "watch" }, rest = { "lean", "warm", "stretch", "yawn" }, spec = { role = "Knight", hat = false }, tint = C(69, 78, 111) },
			official = { name = "관리", kinds = { "seal", "write", "read", "count", "guide", "point", "ledger", "roll_call" }, rest = { "talk", "listen", "drink", "gossip" }, spec = { role = "Mage", hat = "wide" }, tint = C(108, 78, 134) },
			clergy = { name = "성직자", kinds = { "pray", "kneel", "bless", "read", "bell" }, rest = { "talk", "listen", "look", "warm" }, spec = { role = "Mage", hat = false }, tint = C(96, 87, 80) },
			laborer = { name = "일꾼", kinds = { "unload", "carry", "lift", "scrub", "sweep", "polish", "stack", "push_cart" }, rest = { "stretch", "drink", "gossip", "yawn" }, spec = { role = "Rogue", hat = "cap" }, tint = C(119, 104, 79) },
		}
		local ORDER = { "farmer", "fisher", "craftsman", "merchant", "sailor", "guard", "official", "clergy", "laborer" }
		local jobs = info.sim and info.sim.jobs
		if not jobs then
			jobs = { farmer = 3, fisher = 1, craftsman = 3, merchant = 2, sailor = 2, guard = 1, official = lvl >= 3 and 1 or 0, clergy = 1, laborer = 1 }
		end
		local total = 0
		for _, j in ipairs(ORDER) do total += jobs[j] or 0 end
		-- [현지 고용 표본] 주민 수·실제 직종 고용·도시 단계에 따라 표시 인원만 증가.
		-- 모바일과 PC 별도 인원 상한. 경제 고용 숫자보다 많은 직업 모델을 생성하지 않는다.
		local residents = if info.sim then math.max(0, math.floor(tonumber(info.sim.residents) or 0)) else 16 + lvl * 14
		local touch = game:GetService("UserInputService").TouchEnabled
		local cap = if touch then math.min(30, 9 + lvl * 4) else math.min(48, 12 + lvl * 8)
		local N = math.min(cap, residents, math.floor(total))
		local quota, used = {}, 0
		for _, j in ipairs(ORDER) do
			local share = (jobs[j] or 0) / math.max(total, 1)
			if j == "farmer" or j == "laborer" then share = math.min(share, 0.2) end
			quota[j] = math.min(math.max(0, math.floor(tonumber(jobs[j]) or 0)), math.floor(N * share + 0.5))
			if not info.sim and (jobs[j] or 0) > 0 and quota[j] == 0 then quota[j] = 1 end
			used += quota[j]
		end
		local lanes = { 38, -38, 57, -57, 73, -73, 87, -87 }
		local slot = 0
		for _, j in ipairs(ORDER) do
			local yard = JOB_YARD[j]
			for k = 1, quota[j] do
				slot += 1
				if slot > cap then break end
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
					then { "bargain", "offer", "receive", "pack", "count", "talk", "inspect" } else yard.kinds
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
		-- [방문 건물 재배치에 맞춘 전문 인력] 기존 고용 숫자·직무는 그대로 두고 직업 장소만 이동한다.
		local scholar = folder:GetAttribute("CityFacilityPosition_tech")
		local office = folder:GetAttribute("CityFacilityPosition_route")
		local bank = folder:GetAttribute("CityFacilityPosition_harbor")
		local scholarAt = if typeof(scholar) == "Vector3" then scholar + Vector3.new(0, 0, if scholar.Z > 0 then -17 else 17) else Vector3.new(-86, 0, 21)
		local clerkAt = if typeof(office) == "Vector3" then office + Vector3.new(0, 0, if office.Z > 0 then -15 else 15) else Vector3.new(-110, 0, 21)
		local bankerAt = if typeof(bank) == "Vector3" then bank + Vector3.new(0, 0, if bank.Z > 0 then -15 else 15) else Vector3.new(-54, 0, 18)
		local available = {
			{ name = "대장장이", job = "smith", group = "craftsman", need = built("workshop", 2) and (made.iron or made.copper or made.tin), at = Vector3.new(-160, 0, -114), prop = { "Town", "workbench-anvil", 4 }, work = { "forge", "hammer", "carve", "inspect", "seal", "sharpen" }, rest = { "stretch", "drink", "warm" }, color = C(129, 72, 53) },
			{ name = "재단사", job = "tailor", group = "craftsman", need = built("workshop", 2) and (made.cloth or made.silk or made.wool), at = Vector3.new(-188, 0, -114), prop = { "Cargo", "textiles-stack-large-colored", 3 }, work = { "sew", "fold", "carve", "inspect", "pack", "measure" }, rest = { "talk", "drink", "gossip" }, color = C(117, 86, 148) },
			{ name = "제빵사", job = "baker", group = "craftsman", need = built("workshop", 2) and (made.grain or made.maize or made.beer), at = Vector3.new(-214, 0, -114), prop = { "Cargo", "food-flour", 3 }, work = { "knead", "stir", "pack", "inspect", "offer", "serve", "taste" }, rest = { "drink", "talk", "warm" }, color = C(180, 130, 85) },
			{ name = "목수", job = "carpenter", group = "craftsman", need = built("workshop", 2) and (made.timber or made.mahogany or made.kauri), at = Vector3.new(-124, 0, -113), prop = { "Cargo", "resource-planks", 3 }, work = { "saw", "plane", "hammer", "inspect", "lift", "plane_wood", "repair" }, rest = { "stretch", "drink", "talk" }, color = C(136, 101, 67) },
			{ name = "조선공", job = "shipwright", group = "sailor", need = lvl >= 3 and info.hasShipyard, at = Vector3.new(-19, 0, -106), prop = { "Cargo", "resource-planks", 3.5 }, work = { "knot", "plane", "hammer", "unload", "inspect", "repair", "haul_rope" }, rest = { "talk", "stretch", "cheer" }, color = C(79, 103, 134) },
			{ name = "목장지기", job = "herder", group = "farmer", need = built("farm", 2), at = Vector3.new(-660, 0, 0), prop = { "Cargo", "wood-log-a", 3 }, work = { "look", "milk", "sow", "inspect", "scan", "feed" }, rest = { "drink", "lean", "warm" }, color = C(130, 121, 83) },
			{ name = "교사", job = "teacher", group = "official", need = built("school", 3), at = scholarAt, prop = { "Interior", "bookcaseclosed", 4.2 }, work = { "teach", "read", "write", "guide", "point" }, rest = { "talk", "listen", "clap" }, color = C(80, 115, 108) },
			{ name = "서기관", job = "clerk", group = "official", need = built("hall", 3), at = clerkAt, prop = { "Interior", "bookcaseclosed", 3.8 }, work = { "seal", "write", "count", "read", "inspect", "ledger" }, rest = { "talk", "listen", "yawn" }, color = C(91, 89, 131) },
			{ name = "은행원", job = "banker", group = "merchant", need = lvl >= 4 and built("market", 2) and table.find(info.facilities or {}, "bank") ~= nil, at = bankerAt, prop = { "Cargo", "gold-bars", 2.1 }, work = { "count", "seal", "write", "bargain", "offer", "ledger" }, rest = { "talk", "read", "gossip" }, color = C(105, 75, 119) },
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
local SIG_ANCHOR = Vector3.new(-42, 0, 0) -- [모든 항구 새 랜드마크 구획]
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
ReplicatedStorage:SetAttribute("MarePortSceneStage", "port-signatures")
local SIG = {}
do
	local function one(kind, asset, size, dx, dz, y, tint, waterfront)
		return { kind = kind, asset = asset, size = size, dx = dx, dz = dz,
			y = y or 0, tint = tint, waterfront = waterfront == true }
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
	-- [런던] 기존 등록 실물 석교와 양안 상점가. 미등록 역사 원본으로 오인하지 않는다.
	SIG.london = cat(one("Terrain", "bridge-stone", 34, -1, 0),
		one("Town", "village-house-2", 16, -22, -15),
		one("Town", "village-house-3", 18, -5, -15),
		one("Town", "village-house-1", 16, 13, -15))
	SIG.edinburgh = cat(one("Town", "rock-wide", 40, 0, 0), keep(26))
	-- [암스테르담] 운하 통로의 개폐교·운하변 창고·풍차. 기존 승인된 건축 메쉬만 사용.
	SIG.amsterdam = cat(one("Castle", "bridge-draw", 29, -7, -5),
		one("Town", "house", 18, -22, 15), one("Town", "house", 19, 9, 15),
		one("Town", "windmill", 23, 25, -14))
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
	-- [하바나] 해안 요새와 신호탑 옆에 등록된 현지 주택을 넣어 역사 항구 실루엣을 구분한다.
	SIG.havana = cat(one("Castle", "fortress", 30, 0, 0),
		stack("Castle", { "tower-square-base", "tower-square-mid", "tower-square-roof" }, 10, 18, 0),
		one("Town", "havana_house_1", 18, -22, 13))
	SIG.veracruz = cat(one("Castle", "fortress", 30, 0, 0), palms(20))
	SIG.rio = rock
	SIG.salvador = mission
	SIG.goa = mission
	SIG.malacca = cat(one("Castle", "gate", 22, 0, 0), stack("Castle", { "tower-square-base", "tower-square-mid", "tower-square-roof" }, 12, 16, 0), palms(-18))
	SIG.calicut = cat(one("Town", "temple-stone", 28, 0, 0), palms(18))
	-- [잔지바르] 산호석 궁전 원본 미등록. 유럽 성탑을 궁전으로 대체하지 않고 승인된 항만·범선·해안 식생만 배치한다.
	SIG.zanzibar = cat(one("Naval", "dock-side", 23, 22, 28, 0.9, nil, true),
		one("Naval", "boat-sail-a", 18, 52, -25, 1.2, nil, true), palms(19))
	-- [광저우] 십삼행 상관 거리는 사원 탑이 아니라 실제 등록된 무역관 주택과 부두·깃발로 구분한다.
	-- 13개 역사 원본을 사칭하지 않으며, 확정 원본 모델은 등록 전까지 누락으로 유지한다.
	SIG.canton = cat(
		one("Town", "eastasia-base", 18, -24, -3), one("Town", "eastasia-roof", 19, -24, -3, 9),
		one("Town", "eastasia-base", 20, -5, -3), one("Town", "eastasia-roof", 21, -5, -3, 10),
		one("Town", "eastasia-base", 18, 15, -3), one("Town", "eastasia-roof", 19, 15, -3, 9),
		one("Castle", "flag-banner-long", 9, -25, 12),
		one("Castle", "flag-banner-long", 9, 15, 12),
		one("Naval", "dock-side", 18, 30, 28, 0.9, nil, true))
	SIG.macau = cat(pagoda, one("Town", "temple-stone", 18, 20, 8)) -- 동아시아 항구: 서양식 성당 대신 탑과 사원
	SIG.shanghai = cat(pagoda, one("Town", "eastasia-bell", 18, -22, 8))
	-- [나가사키] 데지마 교역 부두를 암시하는 교량·창고 거리. 전용 부채꼴 섬 원본은 별도 등록.
	SIG.nagasaki = cat(one("Terrain", "bridge-stone", 26, -8, 11),
		one("Town", "eastasia-base", 18, -18, -10), one("Town", "eastasia-roof", 19, -18, -10, 9),
		one("Town", "eastasia-base", 18, 15, -10), one("Town", "eastasia-roof", 19, 15, -10, 9))
	SIG.osaka = cat(one("Castle", "wall", 24, 0, 14), stack("Town", { "eastasia-base", "eastasia-roof", "eastasia-base", "eastasia-roof", "eastasia-base", "eastasia-roof" }, 13, 0, 0))
	-- [에도] 같은 일본 문화권이라도 오사카의 성곽 윤곽과 복제하지 않고 원본 승인 모델의 배치를 달리한다.
	SIG.edo = cat(stack("Town", { "eastasia-base", "eastasia-roof", "eastasia-base", "eastasia-roof" }, 12, -6, 0),
		one("Castle", "gate", 20, 20, 9), one("Town", "eastasia-bell", 13, -23, 12))
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
	SIG.naples = cat(one("Town", "rock-wide", 48, -22, 0), one("Castle", "fortress", 26, 16, 6))
	SIG.marseille = cat(one("Town", "rock-wide", 30, 0, 0), one("Town", "church", 22, 0, 0, 12), one("Castle", "fortress", 20, 26, 8))
	SIG.barcelona = cat(spire(HEX, 9, -12, 0), spire(HEX, 11, 0, 0), spire(HEX, 9, 12, 0), one("Town", "church", 24, 0, 16))
	SIG.bordeaux = cathedral()
	SIG.rouen = cathedral()
	SIG.porto = cat(spire(SQ, 11, 0, 0), one("Town", "church", 22, 18, 6))
	SIG.cadiz = cat(fort(26), lighthouse)
	SIG.dublin = cat(spire(HEX, 10, 0, 0), one("Town", "church", 24, 18, 6))
	SIG.glasgow = walledChurch()
	-- [코펜하겐] 사각 성채 대신 원형 천문탑에 더 가까운 다각 탑의 정면 윤곽과 항구 주택.
	-- 나선형 내부 경사로는 전용 원본이 없으므로 허위 모델로 만들지 않는다.
	SIG.copenhagen = cat(spire(HEX, 11, 0, 0),
		one("Town", "house", 17, -21, 9), one("Town", "house", 16, 21, 8))
	SIG.stockholm = cat(one("Castle", "fortress", 28, 0, 0), one("Town", "church", 22, 22, 6))
	-- 베르겐 브뤼겐 목조 창고: 서로 다른 붉은색·황토색·청색 박공 줄.
	SIG.bergen = cat(
		one("Town", "house", 17, -22, 0, 0, C(166, 66, 49)),
		one("Town", "house", 17, -4, 0, 0, C(214, 166, 74)),
		one("Town", "house", 17, 14, 0, 0, C(88, 126, 146)),
		one("Town", "bell-tower", 25, 0, -24)
	)
	-- [오슬로] 지시서의 북유럽 목조 주택과 첨탑 실루엣을 사용한다.
	-- 전용 목조 교회/구리첨탑 원본이 등록되기 전에는 실물 역사 원본으로 표기하지 않는다.
	SIG.oslo = cat(one("Town", "bell-tower", 29, 0, 0),
		one("Town", "house", 18, -25, 8, 0, C(184, 78, 58)),
		one("Town", "house", 18, 24, 7, 0, C(214, 190, 119)),
		one("Terrain", "tree-pinedefaulta", 15, -23, -16))
	SIG.helsinki = cat(one("Town", "church", 28, 0, 0), one("Castle", "wall", 24, 0, 16))
	SIG.st_petersburg = cat(one("Castle", "fortress", 30, 0, 0), spire(SQ, 10, 22, 0))
	SIG.gdansk = cat(one("Naval", "tower-watch", 26, 0, 0), one("Town", "church", 26, 20, 6))
	SIG.riga = walledChurch()
	SIG.tallinn = walledChurch()
	SIG.lubeck = cat(cathedral(), one("Castle", "gate", 22, 0, 20))
	SIG.koenigsberg = cat(one("Castle", "fortress", 26, 0, 0), one("Town", "church", 22, 22, 6))
	SIG.visby = walledChurch()
	SIG.antwerp = cat(spire(SQ, 12, 0, 0), one("Town", "church", 26, 20, 6))
	SIG.rotterdam = cat(one("Town", "windmill", 25, 0, 0),
		one("Naval", "tower-watch", 24, -20, 7), one("Town", "house", 16, 22, 8))
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
	-- [킹스턴] 해안 성채 + 현지 주택 + 제재소로 목재·조선 항구를 표현한다.
	SIG.kingston = cat(one("Castle", "fortress", 25, 0, 0),
		one("Naval", "tower-watch", 18, -21, -7),
		one("Town", "kingston_house_1", 19, 19, 7),
		one("Town", "village-sawmill", 16, -22, 13), palms(20))
	-- [브리지타운] 교역소와 직물시장, 해안 요새를 동일 규모의 기존 메시로 배치한다.
	SIG.bridgetown = cat(one("Castle", "fortress", 23, 0, -6),
		one("Town", "house", 19, -20, 8),
		one("Town", "stall-green", 13, 10, 10),
		one("Town", "stall-red", 12, 24, 12), palms(-22))
	-- [나소] 성채와 현지 주택, 소형 어선과 부두가 함께 보이는 어업 항구.
	SIG.nassau = cat(one("Castle", "fortress", 23, 0, -8),
		one("Town", "nassau_house_1", 20, -21, 5),
		one("Naval", "boat-fishing-small", 14, 18, 13),
		one("Naval", "dock-side", 17, -5, 18), palms(23))
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
	SIG.hoi_an = cat(one("Town", "temple-tower", 26, -7, 0),
		one("Town", "eastasia-base", 17, 17, 7), one("Naval", "palm-detailed-straight", 13, -20, 10))
	-- [브루나이] 무관한 임시 공사 지지대 대신 완성된 부두와 작은 목선을 놓는다.
	SIG.brunei = cat(one("Naval", "structure-platform-dock", 25, -8, 0),
		one("Naval", "boat-row-small", 13, 12, 10), palms(16))
	SIG.ternate = fortPalms(24)
	SIG.banda = fortPalms(22)
	SIG.tianjin = cat(pagoda, one("Naval", "tower-watch", 21, 21, 8))
	SIG.ningbo = cat(shrine, one("Town", "eastasia-bell", 14, -22, 10))
	SIG.amoy = cat(one("Town", "temple-tower", 29, -7, 0),
		one("Town", "eastasia-base", 17, 19, 8), one("Town", "eastasia-roof", 19, 19, 12))
	-- [부산] 조선 해안 성곽과 기와 누각 윤곽. 전용 관아 원본으로 표기하지 않는다.
	SIG.busan = cat(one("Castle", "wall", 23, -16, 8), one("Castle", "wall", 23, 9, 8),
		one("Town", "eastasia-base", 18, 0, -9), one("Town", "eastasia-roof", 19, 0, -9, 9))
	SIG.incheon = cat(one("Town", "eastasia-bell", 24, -6, 0),
		one("Town", "eastasia-base", 18, 18, 8), one("Town", "eastasia-roof", 19, 18, 13))
	SIG.hakodate = cat(one("Castle", "fortress", 24, 0, 0), one("Terrain", "tree-pinedefaulta", 12, 20, 6))
	-- [시드니 코브] 기존 승인된 실물 부두·소형 목선만 배치한다. 시대에 맞지 않는 풍차·등대는 사용하지 않는다.
	SIG.sydney = cat(one("Naval", "structure-platform-dock", 26, 22, 25, 0.9, nil, true),
		one("Naval", "boat-row-small", 16, 48, 22, 1.2, nil, true),
		one("Naval", "dock-side", 20, 34, -30, 0.9, nil, true))
	-- [호놀룰루] 기존 반복 석상 대신 어선, 어획물 적재 부두, 열대 나무.
	SIG.honolulu = cat(one("Naval", "dock-side", 24, -11, 0),
		one("Naval", "boat-fishing-small", 15, 15, 9),
		one("Cargo", "food-barrel-fish", 9, -17, 14), palms(20))
	-- [타히티] 소형 부두와 돛배·노 젓는 배를 다른 방향으로 둔 교역 항구.
	SIG.tahiti = cat(one("Naval", "structure-platform-dock-small", 25, -8, 0),
		one("Naval", "boat-sail-a", 18, 17, 10),
		one("Naval", "boat-row-small", 12, -21, 13), palms(23))
	-- [오클랜드] 태평양 도서 석상과 야자수 반복 대신 온대 목조 항구 원본 조합.
	SIG.auckland = cat(one("Town", "house", 21, -17, 0),
		one("Naval", "dock-side", 24, 12, 11),
		one("Naval", "boat-row-large", 15, -17, 13),
		one("Town", "tree-high", 14, 26, -12))
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
	-- [예테보리] 3D 언덕 성채 윤곽을 먼저 보여 주고, 아래에 팔룬 붉은 목조 주택을 둔다.
	-- 실제 크라운 요새 전용 원본은 별도 등록 전까지 미완료로 남는다.
	SIG.gothenburg = cat(one("Town", "rock-wide", 29, 0, 0),
		one("Castle", "fortress", 27, 0, 0, 7),
		one("Town", "house", 17, -25, 10, 0, C(178, 66, 53)),
		one("Town", "house", 16, 22, 12, 0, C(196, 97, 64)))
	SIG.hull = cat(one("Castle", "gate", 23, 0, 0), one("Town", "bell-tower", 25, 18, 6))
	SIG.la_rochelle = cat(spire(SQ, 11, -12, 0), spire(SQ, 11, 12, 0), one("Castle", "gate", 20, 0, 8))
	SIG.valencia = cat(one("Town", "church", 27, 0, 0), spire(HEX, 9, -18, 0), one("Town", "fountain-square", 12, 16, 12))
	SIG.malaga = cat(one("Castle", "fortress", 27, -12, 0), one("Town", "church", 22, 16, 4))
	SIG.cartagena = cat(one("Castle", "fortress", 28, 0, 0), spire(SQ, 9, 20, 5))
	SIG.toulon = cat(fort(25), one("Naval", "tower-watch", 19, 20, -8))
	SIG.livorno = cat(lighthouse, one("Castle", "wall", 18, 18, 12))
	SIG.trieste = cat(one("Town", "church", 26, 0, 0), spire(SQ, 9, -16, 0))
	SIG.ancona = cat(spire(SQ, 10, 0, 0), one("Town", "church", 24, 18, 4))
	-- [항구별 빠진 52개 대표경관] 현재 등록된 실물 모델을 각 항구에 다른 배치·높이로 재조합한다.
	SIG.athens = cat(one("Terrain", "greek-ruins-a", 27, -6, 0), one("Terrain", "column", 14, 17, 1), one("Town", "church", 20, -20, 9))
	SIG.tangier = cat(one("Castle", "fortress", 27, -8, 0), one("Town", "temple-stone", 25, 19, 7), one("Terrain", "column", 10, -20, 13))
	SIG.las_palmas = cat(one("Naval", "tower-watch", 26, -6, 0), one("Naval", "palm-detailed-straight", 15, 17, 3), one("Castle", "wall", 16, -20, 12))
	SIG.funchal = cat(one("Town", "church", 28, -7, 0), one("Town", "windmill", 19, 21, 10), one("Naval", "palm-detailed-straight", 11, -25, 13))
	SIG.ponta_delgada = cat(one("Town", "bell-tower", 28, -8, -2), one("Castle", "wall", 22, 15, 10), one("Town", "church", 19, -20, 12))
	SIG.palma = cat(one("Town", "church", 31, -10, 0), one("Castle", "tower-hexagon-roof", 15, 19, 3), one("Terrain", "column", 12, -22, 12))
	SIG.cagliari = cat(one("Castle", "fortress", 29, -9, 2), one("Town", "bell-tower", 24, 18, 0), one("Castle", "wall", 18, -22, 12))
	SIG.ajaccio = cat(one("Castle", "wall", 26, -6, 2), one("Naval", "tower-watch", 25, 17, 8), one("Town", "church", 19, -21, 12))
	SIG.thessaloniki = cat(one("Town", "temple-stone", 29, -7, 0), one("Castle", "tower-hexagon-base", 19, 19, 6), one("Castle", "gate", 17, -22, 14))
	SIG.rhodes = cat(one("Castle", "fortress", 31, -6, 0), one("Castle", "wall", 24, 20, 6), one("Naval", "tower-watch", 18, -22, 12))
	SIG.famagusta = cat(one("Castle", "gate", 26, -5, 0), one("Castle", "wall", 24, 20, 10), one("Town", "church", 19, -21, 8))
	SIG.oran = cat(one("Town", "temple-stone", 28, -11, 0), one("Castle", "fortress", 22, 19, 9), one("Terrain", "column", 11, -24, 13))
	SIG.benghazi = cat(one("Town", "temple-stone", 26, -6, 0), one("Castle", "gate", 22, 19, 10), one("Naval", "palm-detailed-straight", 13, -22, 8))
	SIG.gibraltar = cat(one("Town", "rock-wide", 42, -8, 0), one("Castle", "fortress", 29, 11, 5), one("Naval", "tower-watch", 17, -25, 9))
	SIG.messina = cat(one("Town", "church", 28, -8, 0), one("Town", "bell-tower", 31, 17, 6), one("Town", "fountain-round", 8, -19, 14))
	SIG.damietta = cat(one("Naval", "tower-watch", 29, -7, 0), one("Town", "temple-stone", 23, 18, 7), one("Castle", "wall", 20, -18, 13))
	SIG.bone = cat(one("Castle", "fortress", 26, -8, 0), one("Town", "temple-stone", 23, 18, 6), one("Terrain", "column", 10, -21, 14))
	SIG.safi = cat(one("Castle", "fortress", 28, -9, 0), one("Castle", "wall", 24, 16, 9), one("Town", "temple-stone", 18, -23, 12))
	SIG.agadir = cat(one("Castle", "fortress", 27, -8, 0), one("Castle", "gate", 21, 20, 5), one("Naval", "palm-detailed-straight", 12, -24, 13))
	SIG.praia = cat(one("Town", "rock-wide", 32, -11, 0), one("Town", "bell-tower", 24, 17, 7), one("Naval", "palm-detailed-straight", 12, -22, 10))
	SIG.saint_louis = cat(one("Town", "house", 22, -12, 0), one("Naval", "tower-watch", 23, 15, 6), one("Naval", "palm-detailed-straight", 12, -23, 11))
	SIG.bissau = cat(one("Town", "house", 24, -8, 0), one("Naval", "palm-detailed-straight", 16, 19, 4), one("Castle", "wall", 18, -23, 12))
	SIG.freetown = cat(one("Town", "church", 26, -8, 0), one("Naval", "tower-watch", 25, 19, 9), one("Naval", "palm-detailed-straight", 11, -24, 13))
	SIG.ouidah = cat(one("Town", "temple-stone", 24, -8, 0), one("Naval", "palm-detailed-straight", 16, 18, 7), one("Castle", "wall", 20, -24, 12))
	-- [칼라바르] 일반 벤치·감시탑 조합보다 향신료 하역 부두와 목선을 우선한다.
	SIG.calabar = cat(one("Naval", "dock-side", 25, -9, 0),
		one("Cargo", "spice", 13, 17, 8),
		one("Naval", "boat-row-small", 14, -21, 13))
	SIG.sao_tome = cat(one("Town", "church", 26, -8, 0), one("Naval", "palm-detailed-straight", 15, 16, 5), one("Castle", "fortress", 18, -23, 12))
	SIG.benguela = cat(one("Castle", "fortress", 28, -10, 0), one("Town", "bell-tower", 25, 19, 8), one("Naval", "palm-detailed-straight", 12, -22, 11))
	SIG.st_helena = cat(one("Town", "rock-wide", 36, -12, 0), one("Castle", "fortress", 24, 12, 7), one("Naval", "tower-watch", 20, -25, 13))
	SIG.mozambique = cat(one("Castle", "fortress", 29, -8, 0), one("Town", "temple-stone", 24, 20, 6), one("Naval", "palm-detailed-straight", 13, -23, 12))
	SIG.mocha = cat(one("Town", "temple-stone", 29, -11, 0), one("Castle", "tower-hexagon-mid", 22, 18, 5), one("Town", "bench_B", 9, -22, 13))
	SIG.bandar_abbas = cat(one("Town", "temple-stone", 29, -8, 0), one("Castle", "fortress", 22, 19, 10), one("Castle", "tower-hexagon-roof", 16, -20, 12))
	SIG.diu = cat(one("Castle", "fortress", 30, -10, 0), one("Town", "temple-stone", 23, 19, 10), one("Town", "church", 17, -23, 12))
	SIG.port_louis = cat(one("Castle", "fortress", 27, -9, 0), one("Town", "church", 24, 18, 6), one("Naval", "palm-detailed-straight", 13, -22, 12))
	SIG.tainan = cat(one("Town", "eastasia-base", 26, -9, 0), one("Town", "eastasia-roof", 28, -9, 0, 11), one("Terrain", "gate-overhang", 16, 20, 11))
	SIG.makassar = cat(one("Castle", "fortress", 27, -8, 0), one("Town", "temple-stone", 22, 19, 9), one("Naval", "palm-detailed-straight", 13, -24, 12))
	-- [암본] 무관한 석상 대신 향신료 교역 부두·적재물·열대 나무 원본을 사용한다.
	SIG.ambon = cat(one("Naval", "dock-side", 24, -10, 0),
		one("Cargo", "spice", 14, 12, 9), one("Naval", "palm-detailed-straight", 16, -23, 11))
	SIG.campeche = cat(one("Castle", "fortress", 29, -8, 0), one("Town", "church", 24, 19, 9), one("Castle", "wall", 18, -22, 12))
	SIG.port_of_spain = cat(one("Town", "church", 26, -8, 0), one("Naval", "palm-detailed-straight", 15, 18, 9), one("Castle", "flag-banner-long", 13, -22, 12))
	SIG.la_guaira = cat(one("Castle", "fortress", 27, -8, 0), one("Town", "church", 24, 20, 7), one("Naval", "tower-watch", 17, -23, 13))
	SIG.portobelo = cat(one("Castle", "gate", 27, -8, 0), one("Castle", "fortress", 24, 17, 7), one("Town", "bell-tower", 18, -23, 13))
	SIG.paramaribo = cat(one("Town", "house", 23, -11, 0), one("Town", "house", 21, 10, 6), one("Naval", "tower-watch", 24, -22, 12))
	SIG.belem = cat(one("Town", "church", 28, -8, 0), one("Naval", "palm-detailed-straight", 16, 18, 8), one("Terrain", "column", 13, -24, 12))
	SIG.recife = cat(one("Town", "house", 24, -9, 0), one("Town", "church", 26, 18, 9), one("Naval", "palm-detailed-straight", 12, -23, 12))
	SIG.hobart = cat(one("Castle", "tower-square-base", 25, -9, 0), one("Town", "house", 21, 18, 9), one("Terrain", "tree-pinedefaulta", 15, -24, 14))
	SIG.perth = cat(one("Naval", "tower-watch", 28, -8, 0), one("Castle", "tower-square-roof", 21, 17, 8), one("Town", "house", 18, -23, 12))
	SIG.darwin = cat(one("Naval", "tower-watch", 27, -10, 0), one("Naval", "palm-detailed-straight", 19, 20, 6), one("Town", "house", 21, -23, 13))
	-- [포트모르즈비] 무관한 벤치 대신 실제 부두·목선·해안 나무.
	SIG.port_moresby = cat(one("Naval", "structure-platform-dock", 25, -9, 0),
		one("Naval", "boat-row-large", 17, 18, 9),
		one("Naval", "palm-detailed-straight", 17, -24, 13))
	-- [수바] 돌 원형 장식 대신 실물 부두·목선·야자수로 피지 해안 교역을 구분한다.
	SIG.suva = cat(one("Naval", "structure-platform-dock", 24, -10, 0),
		one("Naval", "boat-row-small", 14, 18, 8),
		one("Naval", "palm-detailed-straight", 16, -23, 12))
	SIG.guam = cat(one("Castle", "fortress", 26, -8, 0), one("Naval", "palm-detailed-straight", 17, 19, 8), one("Naval", "tower-watch", 19, -24, 12))
	SIG.guayaquil = cat(one("Naval", "tower-watch", 27, -8, 0), one("Town", "house", 22, 19, 8), one("Town", "bell-tower", 17, -23, 12))
	SIG.sitka = cat(one("Town", "house", 23, -9, 0), one("Terrain", "tree-pinedefaulta", 18, 19, 8), one("Naval", "tower-watch", 27, -23, 13))
	SIG.vancouver = cat(one("Town", "house", 24, -11, 0), one("Terrain", "tree-pinedefaulta", 18, 17, 10), one("Naval", "tower-watch", 26, -23, 12))
end

-- [지상전 공유] 실제 항구 경관 정본. 복제 테이블이나 신규 모델 없이 읽기 전용으로 참조한다.
PortScene.Signatures = SIG
ReplicatedStorage:SetAttribute("MarePortSceneStage", "defining-build")
local function placeSignature(folder, info)
	-- [모든 항구 랜드마크 재배치] 실제 승인 모델과 부속 경관을 각기 다른 내륙 지구로 옮긴다.
	local civicRng = seeded(info.portId .. ":civic-quarter-reposition-v2")
	local identity = PortIdentity.get(info.portId)
	local reflow = identity and identity.reflow
	local civicOffset = if reflow then reflow.plaza else civicRng:NextInteger(-10, 9)
	local civicSide = if (PortData.Ports[info.portId] or {}).shipyard then 1
		elseif reflow then reflow.side elseif civicRng:NextInteger(0, 1) == 0 then -1 else 1
	local civicDepth = if reflow then reflow.lane * 0.5 else civicRng:NextInteger(-6, 6)
	local signatureCenter = SIG_ANCHOR + Vector3.new(civicOffset, 0, civicSide * (103 + civicDepth))
	local list = SIG[info.portId]
	local port = PortData.Ports[info.portId]
	local nation = port and port.country or ""
	local european = COUNTRY_PLAN[nation] ~= nil and currentKey ~= "ottoman"
	-- [항구 대표경관] 등록된 항구 전용 역사 모델을 우선 설치한다.
	-- 미등록이면 원본 건물을 사칭하는 대체물을 만들지 않고, 기존에 승인된 SIG 자산으로
	-- 항구별 실제 3D 부두·마을 경관을 그린다. 이는 전용 원본 완성과 별개다.
	-- [성장 단계 유지] 개척 1단계에는 완성형·기초형 대표경관을 짓지 않는다.
	if sceneLevel < 2 then
		folder:SetAttribute("CityPortSceneryPlacedCount", 0)
		return
	end
	if sceneLevel >= 2 then
		local stageName = if sceneLevel >= 4 then "full" else "base"
		local landmarkAsset = info.portId .. "_landmark_" .. stageName
		if AssetIds["Town/" .. landmarkAsset] then
			local landmark = importedModel(folder, "Town", landmarkAsset, signatureCenter,
				if sceneLevel >= 4 then 40 else 28, true)
			if landmark then
				landmark.Name = "RegionalLandmarkOriginal"
				landmark:SetAttribute("PortOriginalLandmark", landmarkAsset)
				landmark:SetAttribute("BuildAuthority", "VISUAL_ONLY")
				folder:SetAttribute("CityPortOriginalLandmarkPlaced", true)
				return
			end
		end
		if identity then folder:SetAttribute("CityPortMissingLandmark", landmarkAsset) end
	end
	if not list and not european then return end
	-- [181개 항구 실물 변경] 같은 승인 모델 목록을 공유하더라도 항구마다
	-- 각 건축 덩어리의 높이·방향·간격을 고유하게 바꾼다. 같은 좌표의 탑 층은 한 덩어리로 변형한다.
	-- 1개 표시(2단계) / 기존 전체 수량(3단계 이상)을 유지해 모바일 모델 수는 늘리지 않는다.
	local visualGroups = {}
	local sceneryCount = 0
	local sceneryExpected = 0
	local sceneryFailed = if RunService:IsStudio() then {} else nil
	-- [항구 실루엣] 같은 등록 모델의 배치라도 항구별 간격과 방향은 고유하게 구성한다.
	local layoutRng = seeded(info.portId .. ":signature-layout")
	local layoutAngle = math.rad(layoutRng:NextInteger(-20, 20))
	local layoutWidth = 0.90 + layoutRng:NextInteger(0, 20) / 100
	local layoutCos, layoutSin = math.cos(layoutAngle), math.sin(layoutAngle)
	if list then
		for index, e in list do
			if sceneLevel < 3 and index > 1 then break end
			local groupKey = tostring(e.dx) .. ":" .. tostring(e.dz)
			local variation = visualGroups[groupKey]
			if not variation then
				local r = seeded(info.portId .. ":port-silhouette:" .. groupKey)
				variation = {
					shiftX = r:NextInteger(-5, 5),
					shiftZ = r:NextInteger(-5, 5),
					scale = 0.82 + r:NextInteger(0, 36) * 0.01,
					yaw = math.rad(r:NextInteger(-21, 21)),
				}
				visualGroups[groupKey] = variation
			end
			local early = sceneLevel == 2
			local span = if early then 0.5 else 1
			-- [항구별 실제 수변] 항만·선박은 내륙의 역사 건축 랜드마크 자리가 아닌 동쪽 바다에 배치한다.
			-- 원본 모델·수량과 보행 경계는 유지하며, 수변 경관은 충돌 없는 시각 자산으로만 둔다.
			local at = if e.waterfront then Vector3.new(
				54 + e.dx + variation.shiftX * 0.2, e.y * variation.scale,
				e.dz + variation.shiftZ * 0.2)
				else signatureCenter + Vector3.new(
					(e.dx * layoutCos - e.dz * layoutSin) * layoutWidth * span + variation.shiftX,
					e.y * variation.scale,
					(e.dx * layoutSin + e.dz * layoutCos) * layoutWidth * span + variation.shiftZ)
			local size = (if early then math.min(16, e.size * 0.58) else e.size) * variation.scale
			sceneryExpected += 1
			local m = importedModel(folder, e.kind, e.asset, at, size, not early and not e.waterfront, e.tint)
			if not m and sceneryFailed then sceneryFailed[e.kind .. "/" .. e.asset] = true end
			if m then
				m.Name = if early then "EarlyRegionalScenery" else "RegionalScenery_" .. tostring(index)
				m:SetAttribute("PortSceneryAsset", e.kind .. "/" .. e.asset)
				m:SetAttribute("PortSceneryFor", info.portId)
				m:SetAttribute("BuildAuthority", "VISUAL_ONLY")
				rotateAround(m, at, variation.yaw + layoutAngle)
				sceneryCount += 1
			end
		end
	elseif sceneLevel == 2 and european and not identity then
		-- 기존 등록 건축물만 가능한 항구를 위한 2단계 일반 부두 경관.
		local asset = if nation == "netherlands" then "windmill"
			elseif nation == "norway" or nation == "sweden" or nation == "finland" then "house"
			elseif nation == "germany" or nation == "poland" or nation == "prussia" then "bell-tower"
			else "church"
		sceneryExpected += 1
		local m = importedModel(folder, "Town", asset, signatureCenter, 16, true)
		if m then sceneryCount += 1 elseif sceneryFailed then sceneryFailed["Town/" .. asset] = true end
	end
	folder:SetAttribute("CityPortSceneryPlacedCount", sceneryCount)
	if sceneryFailed then
		local failedKeys = {}
		for key in sceneryFailed do table.insert(failedKeys, key) end
		table.sort(failedKeys)
		folder:SetAttribute("CityPortSceneryExpectedCount", sceneryExpected)
		folder:SetAttribute("CityPortSceneryFailedCount", sceneryExpected - sceneryCount)
		folder:SetAttribute("CityPortSceneryFailedKeys", table.concat(failedKeys, ";"))
	end
	if sceneLevel < 3 then return end
	-- [항구 대표경관] 각 대륙의 상징 건물 주위에 3~5단계의 같은 문화권 부속 경관을 추가한다.
	-- 멀리서는 지붕·탑 실루엣, 가까이에서는 현관·정원·시장의 순서로 디테일이 드러난다.
	-- [대표 경관 광장] 기본 직육면체 Part 대신 이미 등록된 3D 건축 바닥 메시를 설치한다.
	-- 자산 템플릿이 실제 로드되지 않았으면 도형을 새로 만들지 않는다.
	local landmarkFloor = importedModel(folder, "Town", "floor_base",
		signatureCenter + Vector3.new(-12, 0, 0), 43, false,
		if currentKey == "desert" or currentKey == "wafrica" then C(190, 169, 123) else C(166, 152, 139))
	if landmarkFloor then
		landmarkFloor.Name = "RegionalLandmarkCourt"
		landmarkFloor:SetAttribute("Culture", currentKey)
		landmarkFloor:SetAttribute("Tier", sceneLevel)
		landmarkFloor:SetAttribute("BuildAuthority", "VISUAL_ONLY")
	end
	if sceneLevel >= 4 then
		local east = currentKey == "japan" or currentKey == "china"
		local humid = currentKey == "seasia" or currentKey == "pacific" or currentKey == "tropic" or currentKey == "malabar"
		local islamic = currentKey == "ottoman" or currentKey == "desert" or currentKey == "swahili" or currentKey == "wafrica"
		local mediterranean = currentKey == "iberia" or currentKey == "italy" or currentKey == "med" or currentKey == "creole"
		local x, z = signatureCenter.X, signatureCenter.Z
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
				importedModel(folder, "Castle", "flag-banner-long", signatureCenter + Vector3.new(dx, 0, -23), 9, false)
			end
		end
	end
	-- [6단계 대도시 경관] 승인 모델만 사용: 대표경관 앞 등불 열주와 깃발 한 쌍(비충돌, 광장 밖).
	if cityTier >= 6 then
		for _, dx in { -32, -20, 20, 32 } do
			importedModel(folder, "Town", "kenney_lightpost_01", signatureCenter + Vector3.new(dx, 0, -27), 7, false)
		end
		for _, dx in { -38, 38 } do
			importedModel(folder, "Castle", "flag-banner-long", signatureCenter + Vector3.new(dx, 0, -21), 11, false)
		end
		if landmarkFloor then landmarkFloor:SetAttribute("Tier", cityTier) end
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
		-- [대표 경관 재배치] 부속 시설도 같은 항구별 상징 중심을 따른다.
		local frontSign = if signatureCenter.Z > 0 then 1 else -1
		importedModel(folder, kind, asset, signatureCenter + Vector3.new(22, 0, frontSign * 44), 15, false)
		if sceneLevel >= 5 then
			importedModel(folder, "Castle", "flag-banner-long", signatureCenter + Vector3.new(12, 0, frontSign * 25), 10, false)
			importedModel(folder, "Castle", "flag-banner-long", signatureCenter + Vector3.new(32, 0, frontSign * 25), 10, false)
		end
	end
end

local LM_SITES = {
	-- [전 항구 재배치] 구 랜드마크 8개 필지 삭제. 항구별 고정 시드로 이동할 새 전용 대지.
	-- x=-118/-183 구획은 왕궁·항만 시설·외곽 시장과 분리되어 기존 경관 실물만 배치한다.
	Vector3.new(-118, 0, 201), Vector3.new(-183, 0, 201),
	Vector3.new(-118, 0, -201), Vector3.new(-183, 0, -201),
	Vector3.new(-118, 0, 266), Vector3.new(-183, 0, 266),
	Vector3.new(-118, 0, -266), Vector3.new(-183, 0, -266),
}

local function densify(folder, info, style, rng, walkers, made, onFacility, landmarkSites)
	local key = styleKeyOf(style)
	local palm = palmOk(info.portId, style)
	local cold = not palm
	local port = PortData.Ports[info.portId]
	local nation = port and port.country or ""
	local countryPlan = COUNTRY_PLAN[nation]
	local big = (port and port.shipyard) or false
	local P = PROFILE[key] or PROFILE.north
	-- [항구별 마을] 지시서의 운하·골목·바둑판·계단식 구획을 기존 필지 안에서만 적용한다.
	local identity = PortIdentity.get(info.portId)
	local reflow = identity and identity.reflow
	local villageLayout = identity and identity.layout or nil
	-- [전 항구 시설 실제 좌표] 고정된 옛 건물 보호 박스를 버리고 새 방문 시설과 광장 위치를 사용한다.
	local facilityLocations = {}
	for _, tab in { "trade", "board", "route", "harbor", "market", "tech", "codex" } do
		local location = folder:GetAttribute("CityFacilityPosition_" .. tab)
		if typeof(location) == "Vector3" then table.insert(facilityLocations, location) end
	end
	local plazaLocation = folder:GetAttribute("CityPortPlazaLocation")
	local lvl = sceneLevel
	-- [자동 장식 건축] 실제 건설된 시장·농장·교회·공방·관청과 번영도를 읽어 단계별 실물 소품을 선택한다.
	-- 시설 수나 생산량을 늘리는 경제 효과는 없고, 모바일 최대 7개 / PC 최대 13개만 배치한다.
	local decor = PortBuildings.decorativeVisual(lvl, info.sim and info.sim.buildings, info.sim and info.sim.prosperity)
	local previousDecor = lastDecorationGrowth[info.portId]
	local decorPlaced, decorAnimated, decorBuilders = 0, 0, 0
	local touchDecor = game:GetService("UserInputService").TouchEnabled
	-- [항구 장식 상한] 중복 공용 소품을 줄여 항구 고유 건축을 먼저 보여 준다.
	local decorLimit = if identity then (if touchDecor then 4 else 6) else (if touchDecor then 7 else 13)
	local animationLimit = if touchDecor then 3 else 6
	-- [건설 조직] 실제 고용된 일꾼·장인의 수를 넘지 않고 사이트마다 여러 직무로 분산한다.
	-- 성능 예산은 도시 등급에 따라 커지지만 모바일은 동시 4명까지만 렌더링한다.
	local jobs = info.sim and info.sim.jobs
	local availableBuilders = if info.sim then math.max(0, math.min(
		math.floor(tonumber(info.sim.residents) or 0),
		math.floor(tonumber(jobs and jobs.laborer) or 0) + math.floor(tonumber(jobs and jobs.craftsman) or 0)
	)) else 9
	local builderLimit = math.min(availableBuilders, if touchDecor then math.min(4, lvl + 1) else math.min(9, lvl * 2))
	local hasBuilders = builderLimit > 0

	-- [성장 장식 시공] 모든 구역이 동일한 설치·비계 제거·목수 점검 과정을 사용한다.
	-- 처음 방문한 기존 완공물과 즉시 설치된 대형 메시는 재시공하지 않는다.
	local function stageDecoration(item, site, buildDelay)
		if not item or item:GetAttribute("BuildVisualState") ~= "installing" then return end
		item:SetAttribute("BuildState", "constructing")
		local scaffold = importedModel(folder, "Terrain", "wood-support", site + Vector3.new(-3, 0, 0), 5, false)
		if scaffold then
			scaffold.Name = "CityDecorationScaffold"
			scaffold:SetAttribute("BuildPlotId", item:GetAttribute("BuildPlotId"))
			scaffold:SetAttribute("BuildAuthority", "VISUAL_ONLY")
			scaffold:SetAttribute("ShowcaseOnly", true)
		end
		local crew = {}
		if hasBuilders and decorBuilders < builderLimit then
			local teamSize = math.min(if touchDecor then 2 else 3, builderLimit - decorBuilders)
			for index = 1, teamSize do
				-- [공정 분담] 목공 조립·자재 운반·안전 점검을 한 현장에 모은다.
				local offset = if index == 1 then Vector3.new(6, 0, 5)
					elseif index == 2 then Vector3.new(-6, 0, 5) else Vector3.new(3, 0, -7)
				local workerAt = site + offset
				local kind = if index == 1 then "hammer" elseif index == 2 then "lift" else "inspect"
				local profession = if index == 1 then "carpenter" else "construction_worker"
				local worker = villager(folder, workerAt, faceTo(workerAt, site),
					C(143, 109, 73), rng, "Barbarian", true,
					{ profession = profession, hat = "cap", year = info.year or currentYear })
				if worker then
					decorBuilders += 1
					worker.Name = "CityBuilder_" .. tostring(decorBuilders)
					worker:SetAttribute("Job", profession)
					worker:SetAttribute("Activity", kind)
					worker:SetAttribute("ShowcaseOnly", true)
					worker:SetAttribute("BuildPlotId", item:GetAttribute("BuildPlotId"))
					local duty = { model = worker, base = worker:GetPivot(), mode = "stay", kind = kind,
						phase = rng:NextNumber(0, 5) }
					table.insert(walkers, duty)
					table.insert(crew, { model = worker, duty = duty })
				end
			end
		end
		local crewCleanup
		local crewThread = task.defer(function()
			-- [항구 로딩 보호] Workspace 부착 전에는 작업 시간을 소모하지 않는다.
			local deadline = os.clock() + 25
			while item.Parent and not folder.Parent and os.clock() < deadline do task.wait(0.12) end
			if not item.Parent or not folder.Parent then
				if item.Parent then item:SetAttribute("BuildState", "complete") end
				if scaffold and scaffold.Parent then scaffold:Destroy() end
				for _, member in crew do
					if member.model.Parent then member.model:Destroy() end
				end
				crewCleanup:Disconnect()
				return
			end
			-- [시공 연출] 비계는 공정 완료까지 남고, 점검 후 모든 작업자가 철수한다.
			task.wait((buildDelay or 0) + 2.5)
			if item.Parent then item:SetAttribute("BuildState", "complete") end
			if scaffold and scaffold.Parent then scaffold:Destroy() end
			for _, member in crew do
				if member.model.Parent then
					member.duty.kind = "inspect"
					member.model:SetAttribute("Activity", "inspect")
				end
			end
			task.wait(1.2)
			for _, member in crew do
				if member.model.Parent then member.model:Destroy() end
			end
			crewCleanup:Disconnect()
		end)
		crewCleanup = folder.Destroying:Once(function()
			if coroutine.status(crewThread) == "suspended" then task.cancel(crewThread) end
		end)
	end
	-- 도시마다 고정된 지형 시드로 구획 방향·필지 크기·외곽 폭을 달리한다. 재진입해도 같은 항구는 같은 형태다.
	local districtSeed = seeded(info.portId .. ":complete-city-reposition-v2")
	local districtOffset = districtSeed:NextNumber(-17, 17)
	local lotVariance = districtSeed:NextNumber(0.98, 1.02)
	local coastForm = folder:GetAttribute("CoastForm") or "plain"
	-- [181항구 주거 재구획] 지시서가 없는 항구도 해안선·문화권에 맞는 골목을 생성한다.
	if not villageLayout then
		local layoutRng = seeded(info.portId .. ":coast-layout-reposition-v2")
		villageLayout = if coastForm == "canal" or coastForm == "lagoon" or coastForm == "delta" then "canal"
			elseif coastForm == "hill" or coastForm == "strait" then "terrace"
			elseif key == "colonial" or key == "creole" or key == "iberia" then "grid"
			elseif coastForm == "river" and layoutRng:NextInteger(0, 1) == 1 then "canal"
			else "organic"
	end
	folder:SetAttribute("CityPortVillageLayout", villageLayout)
	-- [지형 맞춤 골목] 기존 해안선·운하·언덕 분류를 마을 골목 방향에 재사용한다.
	local terrainLaneShift = if coastForm == "hill" then 3.5 elseif coastForm == "river" or coastForm == "delta" then -2.5
		elseif coastForm == "lagoon" or coastForm == "canal" then 2 else 0
	local laneOffset = districtSeed:NextNumber(-28, 28) + terrainLaneShift + (if reflow then reflow.lane else 0)
	if reflow then folder:SetAttribute("CityPortManualReflow", "PORT_MANUAL_REPOSITION_V1") end
	folder:SetAttribute("CityPortLayoutRevision", "WHOLE_PORT_REPOSITION_V2")
	folder:SetAttribute("CityPortLaneOffset", laneOffset)
	folder:SetAttribute("CityRoadTerrain", coastForm)
	local streetsX = P.streets
	local function nearStreet(x, w)
		for _, sx in streetsX do
			if math.abs(x - sx) < w / 2 + 3.5 then return true end
		end
		return false
	end

	-- 1) 마을 구획: 큰길 앞 두 줄 + 골목마다 등을 맞댄 두 줄. 집 크기·간격·층수·골목 짜임은 지역 프로필을 따르고,
	--    항구 발전도가 오를수록 구획(줄)이 늘고 길이 포장되며 집이 높아진다.
	-- [마을 땅 크기] 집 모형 크기·경제·저장값은 보존하고, 발전 단계에 맞춰 실제 마을 지면만 조절한다.
	local isRoyalCity = table.find(info.facilities or {}, "palace") ~= nil
	local royalPlots = PortBuildings.RoyalCityPlots
	local royalLot = if isRoyalCity then royalPlots.plotScale[lvl] else 1
	local royalArea = if isRoyalCity then royalPlots.districtScale[lvl] else 1
	local lotGrowth = PortBuildings.CityPlots.plotScale[lvl] * royalLot
	local areaGrowth = PortBuildings.CityPlots.areaScale[lvl] * royalArea
	local S = P.S * (countryPlan and countryPlan.lot or 1) * lotGrowth * lotVariance
	-- [화면 실측] 발전도 필지 규격이 실제 주거/골목 좌표와 동기화됐는지 기록한다.
	folder:SetAttribute("TownPlotScale", lotGrowth)
	folder:SetAttribute("TownAreaScale", areaGrowth)
	folder:SetAttribute("TownPlotSpacing", S)
	local fw = P.S * (countryPlan and countryPlan.lot or 1) / (HOUSE_SCALE * 1.08)
	local laneWidth = math.max(if isRoyalCity then 13 else 9, P.alley * (if isRoyalCity then 2.1 else 1.8))
	local laneL = 2 * S + laneWidth + 12
	local pairsN = math.min(2, math.max(1, math.floor((395 - 151) / laneL)), 1 + math.floor(lvl * 0.6))
	local localBlocks = info.development and info.development.blocks
	local economicDensity = if localBlocks then math.clamp(0.8 + math.sqrt(math.max(0, localBlocks)) / 60, 0.76, 1.18) else 1
	local moodDensity = if info.sim and info.sim.mood == "slump" then 0.88 else 1
	-- 6단계(최고 발전)는 외곽 미개발 필지가 주거로 채워지도록 밀도를 한 단계 더 올린다.
	local dens = math.clamp((0.5 + 0.1 * lvl) * P.dens * (countryPlan and countryPlan.density or 1)
		* economicDensity * moodDensity * (if cityTier >= 6 then 1.08 else 1), 0.3, 0.97)
	-- 실제 건설된 주택이 부족한 항구는 주거 필지를 비워 두고 경제 데이터는 그대로 둔다.
	if info.sim and info.sim.buildings then
		local target = ({ 40, 130, 430, 1600, 4000 })[lvl]
		dens *= math.clamp((info.sim.buildings.house or 0) / target, 0.3, 1)
	end
	local smokers = 0
	-- [지리적 미개발지] 주택·경제가 빈 구획만 실제 지형별 입체 에셋으로 채운다.
	-- 기존 필지·도로·왕궁·랜드마크 경계, 방문별 시드, 저장 키는 그대로 유지한다.
	local wildernessTouch = game:GetService("UserInputService").TouchEnabled
	local wildernessQuota = math.min(({ 36, 29, 23, 17, 12 })[lvl],
		if wildernessTouch then ({ 22, 19, 16, 13, 9 })[lvl] else 36)
	-- [6단계 외곽 확장] 최고 발전 도시는 미개발 표본을 절반으로 줄여 외곽이 시가지로 이어지게 한다.
	if cityTier >= 6 then wildernessQuota = math.min(wildernessQuota, if wildernessTouch then 5 else 6) end
	local wildernessPlaced, wildernessDetails, wildernessFringe, wildernessRejected = 0, 0, 0, 0
	if identity then wildernessQuota = math.min(wildernessQuota, if wildernessTouch then 8 else 12) end
	local wildernessRng = seeded(info.portId .. ":open-land")
	-- [입체 지형 팔레트] 자산 번호가 존재하는 무료 기존 모델만 사용한다. 허허벌판을 건물로 위장하지 않는다.
	local openLandAssets = {
		arid = { { "Terrain", "arid-cactus-short", 5 }, { "Terrain", "arid-cactus-tall", 7 },
			{ "Terrain", "mystic-sand-dune", 8 }, { "Naval", "rocks-sand-a", 7 }, { "Terrain", "Rock_2", 5 } },
		-- [다운로드 원본] 같은 실물 슬롯에서만 강변 물길과 둔덕을 바꾼다. 미등록이면 기존 소품을 사용.
		wetland = { { "Terrain", "river-stone-bank", 7 }, { "Terrain", AssetIds["Terrain/ground-rivercorner"] and "ground-rivercorner" or "coast-grass-patch", 6 },
			{ "Terrain", "forest-bush-detailed", 5 }, { "Terrain", "Grass_Small", 4 } },
		coastal = { { "Terrain", "tropical-palm-short", 8 }, { "Terrain", "coast-grass-patch", 6 },
			{ "Terrain", AssetIds["Terrain/plant-bushtriangle"] and "plant-bushtriangle" or "forest-flower-yellow", 4 }, { "Naval", "rocks-sand-a", 6 } },
		hillside = { { "Terrain", AssetIds["Terrain/cliff-blockhalf-rock"] and "cliff-blockhalf-rock" or "Rock_2", 7 },
			{ "Terrain", "north-pine-fall", 9 }, { "Terrain", "tree-pinedefaulta", 10 },
			{ "Terrain", "forest-bush-detailed", 5 },
			-- [구릉 측벽과 오르막] 승인된 실제 계단 모서리·바위면·흙길로 기존 슬롯만 교체한다.
			{ "Terrain", AssetIds["Terrain/cliff-stepscorner-rock"] and "cliff-stepscorner-rock" or "cliff-steps-rock", 11 },
			{ "Terrain", AssetIds["Terrain/ground-pathcorner"] and "ground-pathcorner" or "ground-pathrocks", 7 } },
		bamboo = { { "Terrain", "east-bamboo-grove", 9 }, { "Terrain", "coast-grass-patch", 5 },
			{ "Terrain", "forest-flower-yellow", 4 }, { "Terrain", "forest-bush-detailed", 5 } },
		orchard = { { "Terrain", "tree-oak", 9 }, { "Terrain", "forest-flower-yellow", 4 },
			{ "Terrain", "forest-flower-purple", 4 }, { "Terrain", "forest-bush-detailed", 5 } },
		fallow = { { "Terrain", "crops-wheatstagea", 5 }, { "Terrain", "Grass_Small", 4 },
			{ "Terrain", "coast-grass-patch", 5 }, { "Terrain", "crops-wheatstageb", 5 },
			{ "Terrain", AssetIds["Terrain/ground-pathcross"] and "ground-pathcross" or "ground-pathstraight", 7 } },
		-- [미개발 주거 녹지] 원래의 4개 생태 표본을 나무·관목·풀로 다양화한다. 건축 필지는 그대로.
		woodland = { { "Terrain", "tree-oak", 10 }, { "Terrain", "forest-bush-detailed", 5 },
			{ "Terrain", "Bush_Small", 3.6 }, { "Terrain", "Grass_Small", 2.5 } },
	}
	local agricultural = table.find(made or {}, "grain") ~= nil or table.find(made or {}, "wheat") ~= nil
		or table.find(made or {}, "rice") ~= nil or table.find(made or {}, "maize") ~= nil
	local orchard = table.find(made or {}, "fruit") ~= nil or table.find(made or {}, "grapes") ~= nil
		or table.find(made or {}, "olive_oil") ~= nil
	local baseLandBiome = if key == "desert" or key == "ottoman" then "arid"
		elseif coastForm == "river" or coastForm == "delta" or coastForm == "lagoon" or coastForm == "canal" then "wetland"
		elseif coastForm == "hill" or coastForm == "strait" then "hillside"
		elseif palm then "coastal"
		elseif key == "japan" or key == "china" or key == "korea" or key == "seasia" then "bamboo"
		else "woodland"
	-- 도시 전체 외곽을 단계별로 서쪽으로 넓혀 구시가지와 신시가지를 분리한다.
	local X_END = -math.min(490, 190 + math.floor(110 * math.sqrt(areaGrowth)) + math.floor(districtOffset * 3))
	local placedLots = {}
	local streetsOuter = {}
	for x = -235, X_END, -(S * 2.7 + laneWidth + 12) do
		table.insert(streetsOuter, x)
	end
	-- [181항구 구역 변경] 기존 ±86 고정 중심을 버리고 종교·시장·농장 구획을 분리한다.
	-- 원본 건설 수치와 왕궁·길·랜드마크에 대한 충돌 검사는 유지한다.
	-- [181항구 독립 구획] 종교/시장과 농업을 옛 도심에서 분리해 서로 다른 실제 땅으로 옮긴다.
	local dz = seeded(info.portId .. ":district-reposition-v3")
	local firstSide = if reflow then reflow.side elseif dz:NextInteger(0, 1) == 0 then -1 else 1
	local districtX = -138 + (if reflow then reflow.district else dz:NextInteger(-8, 8))
	local districtZ = 358 + dz:NextInteger(0, 14)
	local farmX = -357 + (if reflow then reflow.district else dz:NextInteger(-12, 12))
	local farmZ = 379 + dz:NextInteger(0, 9)
	local slots = {
		Vector3.new(districtX, 0, firstSide * districtZ),
		Vector3.new(districtX, 0, -firstSide * districtZ),
		Vector3.new(farmX, 0, firstSide * farmZ),
	}
	local districts = {}
	local districtMoved, districtRejected = 0, 0
	local districtSeed = seeded(info.portId .. ":district-collision-reposition-v2")
	local districtKinds = { "religious", "market", "farm" }
	for index, kind in districtKinds do
		-- 시장·종교는 해안 도시 외곽, 농장은 서쪽 농촌의 실제 넓은 부지에 분리 배치한다.
		local hx, hz = if kind == "farm" then 82 else 41, if kind == "farm" then 51 else 43
		local side = if index == 2 then -firstSide else firstSide
		local proposedZ = if kind == "farm" then farmZ else districtZ
		local proposedX = if kind == "farm" then farmX else districtX
		local candidates = {
			slots[index],
			Vector3.new(proposedX + (if kind == "farm" then -24 else 20), 0, side * proposedZ),
			Vector3.new(proposedX + (if kind == "farm" then -35 else -20), 0, side * proposedZ),
		}
		for candidateIndex, at in candidates do
			local x, z = at.X, at.Z
			local clear = math.abs(z) + hz <= 440
			-- [방문 건물/중앙 광장] 실제 새 좌표의 충돌 반경을 피한다.
			if clear then
				for _, site in facilityLocations do
					if math.abs(x - site.X) < hx + 25 and math.abs(z - site.Z) < hz + 25 then
						clear = false
						break
					end
				end
			end
			if clear and typeof(plazaLocation) == "Vector3"
				and math.abs(x - plazaLocation.X) < hx + 25
				and math.abs(z - plazaLocation.Z) < hz + 25 then clear = false end
			if clear and isRoyalCity and x - hx < -215 and x + hx > -630 and math.abs(z) < 320 + hz then clear = false end
			if clear and math.abs(z) < 165 + hz and math.abs(x + 212) < hx + 9 then clear = false end
			if clear and math.abs(z) < 68 + hz then
				for _, sx in streetsX do
					if math.abs(x - sx) < hx + 7 then clear = false break end
				end
			end
			-- [서쪽 농촌] 외곽 도로의 X열이 겹치더라도 먼 농업 필지 Z를 지우지 않는다.
			if clear and kind ~= "farm" then
				for _, sx in streetsOuter do
					if math.abs(x - sx) < hx + laneWidth * 0.5 + 4 then clear = false break end
				end
			end
			if clear then
				for _, landmark in landmarkSites do
					if math.abs(x - landmark.X) < hx + 35 and math.abs(z - landmark.Z) < hz + 35 then
						clear = false
						break
					end
				end
			end
			if clear then
				for _, other in districts do
					if math.abs(x - other.at.X) < hx + other.hx + 6
						and math.abs(z - other.at.Z) < hz + other.hz + 6 then
						clear = false
						break
					end
				end
			end
			if clear then
				table.insert(districts, { kind = kind, at = at, hx = hx, hz = hz })
				if candidateIndex > 1 then districtMoved += 1 end
				break
			end
			districtRejected += 1
		end
	end
	-- 기존 장면에만 기록하는 진단 값이며 신규 저장·교역·마을경제 데이터는 생성하지 않는다.
	folder:SetAttribute("CityDistrictLayoutMode", "WHOLE_PORT_REPOSITION_COLLISION_CHECK")
	folder:SetAttribute("CityDistrictPlaced", #districts)
	folder:SetAttribute("CityDistrictMoved", districtMoved)
	folder:SetAttribute("CityDistrictRejectedCandidates", districtRejected)
	local function reserved(x, z, halfX, halfZ)
		-- 시설·지역별 시장/농장·랜드마크·문명 산업 필지를 주택과 분리한다.
		-- [새 도시 예약] 방문 시설·광장·왕궁의 실제 배치 좌표와 주거 충돌을 검증한다.
		halfZ = halfZ or halfX
		for _, site in facilityLocations do
			if math.abs(x - site.X) < halfX + 25 and math.abs(z - site.Z) < halfZ + 25 then return true end
		end
		if typeof(plazaLocation) == "Vector3"
			and math.abs(x - plazaLocation.X) < halfX + 25
			and math.abs(z - plazaLocation.Z) < halfZ + 25 then return true end
		if x < -211 + halfX and math.abs(z) < 145 + halfZ then return true end
		if isRoyalCity and x < -215 + halfX and x > -630 - halfX and math.abs(z) < 320 + halfZ then return true end
		for _, d in districts do
			if math.abs(x - d.at.X) < d.hx + halfX and math.abs(z - d.at.Z) < d.hz + halfZ then return true end
		end
		for _, a in landmarkSites do
			if math.abs(x - a.X) < 29 + halfX and math.abs(z - a.Z) < 29 + halfZ then return true end
		end
		for _, lot in placedLots do
			if math.abs(x - lot.X) < halfX + (lot.HX or lot.H) + 2
				and math.abs(z - lot.Z) < halfZ + (lot.HZ or lot.H) + 2 then return true end
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
						-- [항구 지시서 공방] 해당 항구의 정확한 2단계 대장간·목공소만 기존 필지에서 선택한다.
						-- 런던 기존 연출 유지. 등록 또는 실제 복제 실패 시 기존 개방형 공방을 유지한다.
						local portWorkshop = if c[1] == "workshop" and (lvl >= 2 or info.portId == "london")
							then info.portId .. (if n % 2 == 0 then "_bld_carpenter" else "_bld_smithy") else nil
						if portWorkshop and not AssetIds["Town/" .. portWorkshop] then portWorkshop = nil end
						local ground = if portWorkshop then importedModel(folder, "Town", portWorkshop, at, 21, true, c[6]) else nil
						if not ground then
							portWorkshop = nil
							ground = importedModel(folder, "Town", "floor_base", at, 21, false, c[6])
						end
						if ground then
							ground.Name = "EconomySite_" .. c[1]
							ground:SetAttribute("IndustryGood", c[7] or "")
							if portWorkshop then ground:SetAttribute("PortOriginalIndustry", portWorkshop) end
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
							local back = nil
							if not portWorkshop then
								back = importedModel(folder, "Town", wallName, at + Vector3.new(0, 0, -face * 8), 19, true, c[6])
								for _, dx in { -9, 9 } do
									local sideAt = at + Vector3.new(dx, 0, 0)
									local sideWall = importedModel(folder, "Town", wallName, sideAt, 17, true, c[6])
									if sideWall then rotateAround(sideWall, sideAt, math.pi * 0.5) end
								end
								if lvl >= 3 then
									importedModel(folder, "Town", if wallName == "kenney_wood_wall_01" then "kenney_roof_straight_green_01" else "kenney_roof_straight_red_01",
										at + Vector3.new(0, 9, 0), 21, false)
								end
							end
							local anchor = back and back:FindFirstChildWhichIsA("BasePart", true)
								or ground:FindFirstChildWhichIsA("BasePart", true)
							if anchor then sign(folder, anchor, c[2], C(151, 110, 51), 10) end
							-- [내부 설비] 업종에 맞는 실제 실내가구·장비·원료를 기존 개방형 실내에 놓는다.
							if not portWorkshop then
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
					if newGrade then stageDecoration(prop, at + Vector3.new(13, 0, face * 11), delay) end
								end
							end
							prompt(folder, at + Vector3.new(0, 3, face * 7), c[2], "시설 이용", c[8], onFacility)
						end
					end
				end
			end
		end
	end
	-- [시각 전용 주택 등급] 같은 지역도 작은 민가부터 큰 상가·저택까지 섞는다.
	-- 상위 발전도에서도 작은 집이 남고, 승인된 기존 모델·필지 수·경제 값은 그대로 쓴다.
	local houseSizeBands = {
		{ 0.62, 0.73, 0.84, 0.94, 1.02 },
		{ 0.66, 0.79, 0.92, 1.08, 1.18 },
		{ 0.69, 0.84, 1.00, 1.19, 1.36 },
		{ 0.71, 0.88, 1.07, 1.31, 1.53 },
		{ 0.73, 0.92, 1.14, 1.42, 1.72 },
	}
	-- [항구별 진단] 주택 배치 수량은 화면용 정수만 장면에 기록한다. DB·경제·전투 수치에는 영향이 없다.
	local homeCandidates, homePlaced, homeShifted, homePlotRejected, homeModelRejected = 0, 0, 0, 0, 0
	local homeSizeCounts = { 0, 0, 0, 0, 0 }
	local oldTownHomes, newTownHomes, nightWindows = 0, 0, 0
	-- [발전도별 필지] 6/10/14/18/24 필지를 골목 행에 나누어 배치. 경제/저장과 무관한 화면용 수만 제한.
	local portPlotLimit = if identity then PortIdentity.tier(lvl).plots else math.huge
	local rowPlotLimit = if identity then math.max(1, math.ceil(portPlotLimit / (4 * pairsN))) else math.huge
	if identity then folder:SetAttribute("CityPortPlannedPlots", portPlotLimit) end
	-- [문화권 주거 발전 입면] 단계별 추가 실물 부재는 각 주택에 한 번만 부착한다.
	local villageAccents, villageCrowns = 0, 0
	local touchHousing = game:GetService("UserInputService").TouchEnabled
	local villageAccentCap = if touchHousing then 4 else 9
	local villageCrownCap = if touchHousing then 2 else 5
	local nightWindowLimit = if touchHousing then 5 else 11
	-- 한 항구의 주택 후보 전부가 같은 5개 인접 위치를 사용해 재방문 배치를 재현한다.
	local homeShifts = { Vector3.zero, Vector3.new(-2.4, 0, 0), Vector3.new(2.4, 0, 0),
		Vector3.new(0, 0, -2.4), Vector3.new(0, 0, 2.4) }
	-- 한 줄 채우기: z = 줄의 중심, t = 0(항구 쪽)~1(성벽 쪽)
	-- [주거 구획] 항구·대로 측면·주거 행·칸 번호 조합으로 재진입 시 같은 필지 키를 쓴다.
	local residentialDecorationPlaced = false
	local homeRejectRoad, homeRejectStreet, homeRejectReserved = 0, 0, 0
	local houseSpots = {}
	local function fillRow(z, t, xStart, side, laneIndex, rowIndex)
		local x = xStart
		local slotIndex, rowPlaced = 0, 0
		while x > X_END do
			slotIndex += 1
			local plotId = ("%s:home:%d:%d:%d:%d"):format(info.portId, side, laneIndex, rowIndex, slotIndex)
			-- [도시 성장] 항구 쪽 오래된 구획과 발전 후 새로 열린 외곽 구획을 구분한다.
			local quarter = if laneIndex == 0 then "old" elseif lvl >= 3 then "new" else "edge"
			if rng:NextNumber() < dens and homePlaced < portPlotLimit and rowPlaced < rowPlotLimit then
				homeCandidates += 1
				local sz = S * rng:NextNumber(0.9, 1.08)
				-- [주택 정렬] 바둑판·운하는 곧게, 구시가지 골목은 불규칙하게, 언덕은 층차형으로.
				-- 기존 난수 소비 횟수와 필지 개수·충돌 검사 순서는 보존한다.
				local jitterX = if villageLayout == "grid" or villageLayout == "canal" then 0.22
					elseif villageLayout == "terrace" then 0.60 elseif villageLayout == "organic" then 1.12 else 1
				local jitterZ = if villageLayout == "grid" or villageLayout == "canal" then 0.24
					elseif villageLayout == "terrace" then 0.55 elseif villageLayout == "organic" then 1.10 else 1
				local pos = Vector3.new(x + rng:NextNumber(-1, 1) * P.jx * jitterX,
					0, z + rng:NextNumber(-1, 1) * P.jz * jitterZ)
				-- 같은 필지는 같은 크기 등급을 선택한다. 공용 랜덤 흐름을 소비하지 않아 다른 건물 배치를 흔들지 않는다.
				local sizeRng = seeded(plotId .. ":house-size")
				local roll = sizeRng:NextInteger(1, 100)
				-- [지역별 크기 비율] 기존 문화권 배치 프로필에서 소형 민가~대형 상관의 비율을 결정한다.
				-- 항구 시드가 같으면 방문할 때마다 동일한 규모 분포가 복원된다.
				local mix = P.sizeWeights
				local sizeClass = if roll <= mix[1] then 1 elseif roll <= mix[1] + mix[2] then 2
					elseif roll <= mix[1] + mix[2] + mix[3] then 3
					elseif roll <= mix[1] + mix[2] + mix[3] + mix[4] then 4 else 5
				-- [시장·창고 성장] 실제 상업시설이 늘어난 신시가지에서만 일부 상가를 한 등급 크게 만든다.
				local built = info.sim and info.sim.buildings
				local merchantGrowth = built and ((built.market or 0) >= 3 or (built.warehouse or 0) >= 4)
				if merchantGrowth and lvl >= 3 and quarter == "new"
					and sizeClass == 3 and roll % 3 == 0 then sizeClass = 4 end
				local sizeJitter = sizeRng:NextNumber(0.97, 1.03)
				-- 폭/깊이도 지역 프로필을 재사용해 운하 상가·목조 민가·중정 주택의 실루엣을 구분한다.
				local widthBase = fw * (sz / S) * (P.wMul or 1)
				local depthBase = math.max(widthBase * 0.72, widthBase + (P.dAdd or 0))
				local sizeScale = houseSizeBands[lvl][sizeClass] * sizeJitter
				-- 집 본체뿐 아니라 동아시아 처마·서양 별채·베란다·계단도 여유 폭에 포함한다.
				-- 기존 필지 점유 반경보다 작게 잡지 않아 모바일 건물 수가 증가하지 않는다.
				local roofFactor = if style.kit == "eastasia" then 1.62 else 1.46
				local projectedHalf = math.max(widthBase, depthBase) * sizeScale * HOUSE_SCALE * (style.sizeMul or 1)
					* roofFactor * 0.5 + 3.5
				local rowClearance = S * 0.5 + 4
				-- 도로와 맞닿는 대형 주택은 같은 필지에서 한 단계 작은 형태를 선택한다.
				while sizeClass > 1 and projectedHalf > rowClearance do
					sizeClass -= 1
					sizeScale = houseSizeBands[lvl][sizeClass] * sizeJitter
					projectedHalf = math.max(widthBase, depthBase) * sizeScale * HOUSE_SCALE * (style.sizeMul or 1)
						* roofFactor * 0.5 + 3.5
				end
				local half = math.max(sz * 0.62, projectedHalf)
				-- [기존 필지 내 재배치] 중앙 자리만 사전 검사하면 옆자리 2.4칸이 비어도 주택이 사라진다.
				-- 전체 모델을 복제하기 전에 가까운 5곳의 기존 예약 경계부터 가볍게 검사한다.
				local canFitPlot = false
				if projectedHalf <= rowClearance then
					for _, shift in homeShifts do
						local at = pos + Vector3.new(shift.X, 0, shift.Z * side)
						if not onStreet(at.X, half) and not reserved(at.X, at.Z, half) then
							canFitPlot = true
							break
						end
					end
				end
				if canFitPlot then
					local fl = P.fl0 + math.floor(t * P.flGrow + 0.5) + (if lvl >= 4 then 1 else 0) - (if lvl <= 1 then 1 else 0)
					if rng:NextNumber() < 0.15 then fl += (if rng:NextNumber() < 0.5 then -1 else 1) end
					-- 대형 저택 옆에 단층 작은 집이 남도록 지붕 높이도 크기 등급에 맞춘다.
					if sizeClass == 1 and lvl >= 3 then fl -= 1 end
					if sizeClass == 5 and lvl >= 3 then fl += 1 end
					fl = math.clamp(fl, 1, P.flMax)
					local ww = widthBase * sizeScale
					local dd = depthBase * sizeScale * rng:NextNumber(0.85, 1)
					-- [실물 건물 외곽 검사] 기존 house()를 임시 Model에서 한 번만 생성한다.
					-- 실제 처마·별채·계단을 포함한 BoundingBox를 확인한 후 안전한 경우에만 장면에 옮긴다.
					-- Part 기준 개별 충돌 루프를 만들지 않아 모바일 프레임과 기존 자산 구성을 지킨다.
					local staged = Instance.new("Model")
					staged.Name = "PortScene"
					local body = house(staged, pos, ww, dd, fl, style, rng)
					if body then
						-- [구시가지 회백색 풍화·신시가지 회칠] PBR 및 원본 텍스처는 유지.
						for _, surface in staged:GetDescendants() do
							if surface:IsA("BasePart") and surface.Material ~= Enum.Material.Glass
								and surface.Material ~= Enum.Material.Metal and surface.Material ~= Enum.Material.Neon then
								local appearance = surface:FindFirstChildOfClass("SurfaceAppearance")
								local painted = appearance ~= nil or surface.MaterialVariant ~= ""
									or (surface:IsA("MeshPart") and surface.TextureID ~= "")
								for _, child in surface:GetChildren() do
									if child:IsA("SpecialMesh") and child.TextureId ~= "" then painted = true break end
								end
								if not painted then
									local winterRoof = (math.abs((port and port.lat) or 0) >= 39) and not palm
										and folder:GetAttribute("CitySeasonIndex") == 1
									local roofSurface = surface:IsA("WedgePart") or surface.Name == "FlatRoof"
										or surface:FindFirstAncestor("HarborRoof") ~= nil
									if winterRoof and roofSurface then
										-- [겨울 기와·석조 지붕] 원본 PBR이 없는 부분만 얇게 눈색을 덮는다.
										-- 문화권 기와 모델의 텍스처·ColorMap은 그대로 남긴다.
										surface.Material = Enum.Material.Snow
										surface.Color = surface.Color:Lerp(C(230, 237, 241), 0.76)
										surface:SetAttribute("CityWinterRoof", true)
									else
										surface.Color = if quarter == "old" then surface.Color:Lerp(C(139, 130, 117), 0.16)
											elseif quarter == "new" then surface.Color:Lerp(style.walls[1], 0.12) else surface.Color
									end
								end
							end
						end
						local bounds, dimensions = staged:GetBoundingBox()
						-- 회전된 BoundingBox의 각 축을 월드 도로축에 투영한다. 90도 회전/비대칭 처마까지 포함한다.
						local worldHalfX = (math.abs(bounds.RightVector.X) * dimensions.X
							+ math.abs(bounds.UpVector.X) * dimensions.Y
							+ math.abs(bounds.LookVector.X) * dimensions.Z) * 0.5
						local worldHalfZ = (math.abs(bounds.RightVector.Z) * dimensions.X
							+ math.abs(bounds.UpVector.Z) * dimensions.Y
							+ math.abs(bounds.LookVector.Z) * dimensions.Z) * 0.5
						local measuredHalfX = math.abs(bounds.Position.X - pos.X) + worldHalfX + 2.5
						local measuredHalfZ = math.abs(bounds.Position.Z - pos.Z) + worldHalfZ + 2.5
						-- 이웃 필지는 기존 여유 폭을 보존하지만, 도로는 실제 처마 외곽으로만 판정한다.
						-- 필지 예약 반경을 도로 판정에 중복 적용하면 모든 주택이 사라질 수 있다.
						local actualHalfX = math.max(half, measuredHalfX)
						local actualHalfZ = math.max(half, measuredHalfZ)
						-- [도로·주택 축 동기화] 구불구불한 골목도 양쪽 차로 실측 좌표로 판정한다.
						local nearBend = if villageLayout == "organic" then (if laneIndex % 2 == 0 then -3 else 3)
							elseif villageLayout == "terrace" then laneIndex * 2 else 0
						local farBend = if villageLayout == "organic" then (if (laneIndex + 1) % 2 == 0 then -3 else 3)
							elseif villageLayout == "terrace" then (laneIndex + 1) * 2 else 0
						local laneNear = 152 + laneOffset + laneIndex * laneL + nearBend
						local laneFar = 152 + laneOffset + (laneIndex + 1) * laneL + farBend
						local chosenShift
						-- 원래 자리에서 시작해 같은 필지 안에서만 조금 이동한다. 다른 건물은 건드리지 않는다.
						-- [집 배치 실패 수정 · 2026-11-29 오너: "중앙 광장만 모여 있다"] 예전엔 ±2.4만 옮겨 보고 길에 닿으면 포기해
						-- L3~L4 항구에 집이 3~6채만 지어졌다(목표 14~18). 이제 두 길 사이 남는 폭 안에서 필요한 만큼 밀어 넣는다.
						local nearLimit = laneNear + laneWidth * 0.5 + 1.5
						local farLimit = laneFar - laneWidth * 0.5 - 1.5
						for _, direction in homeShifts do
							local shift = Vector3.new(direction.X, 0, direction.Z * side)
							local at = pos + shift
							local signedZ = at.Z * side
							if 2 * measuredHalfZ <= farLimit - nearLimit then
								local dz = 0
								if signedZ - measuredHalfZ <= nearLimit then dz = nearLimit - (signedZ - measuredHalfZ) + 0.1
								elseif signedZ + measuredHalfZ >= farLimit then dz = farLimit - (signedZ + measuredHalfZ) - 0.1 end
								if dz ~= 0 then
									shift += Vector3.new(0, 0, dz * side)
									at = pos + shift
									signedZ = at.Z * side
								end
							end
							local clearRoad = signedZ - measuredHalfZ > nearLimit and signedZ + measuredHalfZ < farLimit
							if not clearRoad then
								homeRejectRoad += 1
							elseif onStreet(at.X, measuredHalfX) then
								homeRejectStreet += 1
							elseif reserved(at.X, at.Z, actualHalfX, actualHalfZ) then
								homeRejectReserved += 1
							else
								chosenShift = shift
								break
							end
						end
						if chosenShift then
							if chosenShift.Magnitude > 0 then staged:PivotTo(CFrame.new(chosenShift) * staged:GetPivot()) end
							pos += chosenShift
							for _, object in staged:GetChildren() do object.Parent = folder end
							homePlaced += 1
							table.insert(houseSpots, { pos = pos, side = side, laneZ = laneNear, laneW = laneWidth })
							rowPlaced += 1
							if chosenShift.Magnitude > 0 then homeShifted += 1 end
							homeSizeCounts[sizeClass] += 1
							if quarter == "old" then oldTownHomes += 1 elseif quarter == "new" then newTownHomes += 1 end
							-- 실제 주거 입주·증축 판단은 기존 경제의 주택 수·발전도가 담당한다.
							body:SetAttribute("BuildPlotId", plotId)
							body:SetAttribute("BuildType", "house")
							body:SetAttribute("BuildPhase", 4)
							body:SetAttribute("BuildState", "complete")
							body:SetAttribute("BuildTier", fl)
							body:SetAttribute("BuildAuthority", "VISUAL_ONLY")
							body:SetAttribute("BuildingSizeClass", sizeClass)
							body:SetAttribute("BuildingSizeScale", sizeScale)
							body:SetAttribute("BuildingClearance", math.max(actualHalfX, actualHalfZ))
							body:SetAttribute("BuildingFootprintX", actualHalfX * 2)
							body:SetAttribute("BuildingFootprintZ", actualHalfZ * 2)
							body:SetAttribute("CityQuarter", quarter)
							body:SetAttribute("CityResidenceType", if sizeClass <= 2 then "cottage"
								elseif sizeClass >= 4 then "merchant_manor" else "town_house")
							body:SetAttribute("CityArchitectureCulture", key)
							body:SetAttribute("CityMerchantGrowth", merchantGrowth == true)
							-- [발전 마을 외관] 아노의 단계별 주택 입면/매너 로즈의 필지 확장은 배치 방식만 참고.
							-- 기존 PortCultures의 문화권 실물 건축 부재를 읽으며, 왕궁·시장·전투·건설 판정은 변경하지 않는다.
							local homeArch = style.house or {}
							local facadeFront = if pos.Z > 0 then -1 else 1
							local anchor = bounds.Position + chosenShift
							local accentName = homeArch.growthAccent
							if lvl >= 2 and villageAccents < villageAccentCap and accentName
								and AssetIds["Town/" .. accentName] and homePlaced % (if touchHousing then 13 else 9) == 2 then
								local at = Vector3.new(anchor.X, pos.Y + math.max(1.2, dimensions.Y * 0.24),
									anchor.Z + facadeFront * dimensions.Z * 0.34)
								local accent = importedModel(folder, "Town", accentName, at,
									math.min(5.8, dimensions.X * 0.31), false,
									if key == "japan" or key == "china" or key == "korea" then style.walls[1] else nil)
								if accent then
									accent.Name = "CityCulturalHouseFront"
									accent:SetAttribute("CityArchitectureCulture", key)
									accent:SetAttribute("CityQuarter", quarter)
									accent:SetAttribute("CityDevelopmentTier", lvl)
									accent:SetAttribute("BuildPlotId", plotId)
									accent:SetAttribute("BuildAuthority", "VISUAL_ONLY")
									villageAccents += 1
								end
							end
							-- [상업 주택 지붕 성장] 4단계 이상 신시가지 중 실제 상가 성장 조건을 충족한 주택만.
							-- 평지붕·고상가옥·동아시아 기와에는 유럽식 박공을 혼용하지 않는다.
							local crownName = homeArch.growthCrown
							if lvl >= 4 and quarter == "new" and merchantGrowth and sizeClass >= 3
								and villageCrowns < villageCrownCap and crownName
								and AssetIds["Town/" .. crownName] and homePlaced % (if touchHousing then 17 else 11) == 3 then
								local at = Vector3.new(anchor.X, pos.Y + dimensions.Y * 0.77,
									anchor.Z + facadeFront * dimensions.Z * 0.16)
								local crown = importedModel(folder, "Town", crownName, at,
									math.min(6.5, dimensions.X * 0.35), false, style.roofs[1])
								if crown then
									crown.Name = "CityMerchantRoofGrowth"
									crown:SetAttribute("CityArchitectureCulture", key)
									crown:SetAttribute("CityDevelopmentTier", lvl)
									crown:SetAttribute("BuildPlotId", plotId)
									crown:SetAttribute("BuildAuthority", "VISUAL_ONLY")
									villageCrowns += 1
								end
							end
							-- [밤이 밝아지는 창] 기존 주야 조명의 PointLight 갱신 경로에 자동 연결된다.
							-- 모바일 5곳/PC 11곳만 만들고 야간 시간에만 조도가 강해진다.
							if lvl >= 2 and nightWindows < nightWindowLimit and homePlaced % 13 == 1 then
								local streetFront = if pos.Z > 0 then -1 else 1
								-- 창을 건물 중앙이 아닌 전면 실제 외곽 바로 앞에 놓아 외벽 속에 묻히지 않게 한다.
								local lampAt = Vector3.new(bounds.Position.X, pos.Y + math.clamp(dimensions.Y * 0.37, 2.5, 4.8),
									bounds.Position.Z + streetFront * (dimensions.Z * 0.5 + 0.15)) + chosenShift
								local window = part(folder, Vector3.new(1.15, 1.35, 0.12), CFrame.new(lampAt),
									C(243, 200, 135), Enum.Material.Neon)
								window.Name = "CityNightWindow"
								window.CanCollide, window.CanTouch, window.CanQuery, window.CastShadow = false, false, false, false
								window.Transparency = 0.92 -- 기존 밤낮 갱신에서 해질 때만 밝아지는 창
								window:SetAttribute("CityQuarter", quarter)
								local glow = Instance.new("PointLight")
								glow.Color, glow.Range, glow.Brightness = C(255, 204, 134), 12, 0.48
								glow.Shadows = false
								glow.Parent = window
								nightWindows += 1
							end
							-- [주거 성장] 이미 존재하는 주택 앞에 주민 휴식 시설·우물을 하나만 건설한다.
							-- 첫 세대에 보이면 완공 상태로, 도시 발전 중 새로 해금된 경우에만 설치 모션을 사용한다.
							if not residentialDecorationPlaced and decor.residential > 0 and decorPlaced < decorLimit then
								local newGrade = previousDecor and decor.residential > (previousDecor.residential or 0)
									and decorAnimated < animationLimit
								local originalWell = PortScene.cultureSlot(info.portId .. "_bld_well")
								local itemName = if decor.residential >= 3 and AssetIds["Town/" .. originalWell] then originalWell
									elseif decor.residential >= 3 then "village-well" else "bench_A"
								local front = if pos.Z > 0 then -1 else 1
								local placeAt = pos + Vector3.new(ww * 0.28, 0, front * (ww * 0.45 + 4))
								local delay = if newGrade then 0.28 + decorAnimated * 0.36 else nil
								local detail = importedModel(folder, "Town", itemName, placeAt, 4.5, false, nil, delay)
								if not detail and itemName == originalWell then
									detail = importedModel(folder, "Town", "village-well", placeAt, 4.5, false, nil, delay)
								end
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
									if newGrade then stageDecoration(detail, placeAt, delay) end
								end
							end
							table.insert(placedLots, { X = pos.X, Z = pos.Z,
								H = math.max(actualHalfX, actualHalfZ), HX = actualHalfX, HZ = actualHalfZ })
							if smokers < 28 and rng:NextNumber() < 0.22 then
								smokers += 1
								smokeOn(folder, pos + Vector3.new(ww * 0.2, fl * 6 + 4, 0))
							end
						else
							homeModelRejected += 1
						end -- [실제 외곽 검사] 안전한 경우만 본 장면으로 반영
					else
						homeModelRejected += 1
					end
					staged:Destroy()
				else
					homePlotRejected += 1
				end
			else
				-- [미개발 주거 필지] 도시 발전 전에는 지형·농업 생산·해안 위치에 맞는 자연 소품만 표시한다.
				-- 기존 경제의 주택 수/필지 ID와 실제 건축 가능성은 변경하지 않는다.
				if wildernessQuota > 0 and wildernessRng:NextNumber() < 0.72 then
					local plotRng = seeded(plotId .. ":geographic-land")
					local z0 = z + plotRng:NextNumber(-S * 0.16, S * 0.16)
					local half = math.min(9, S * 0.27)
					if not onStreet(x, half) and not reserved(x, z0, half) then
						-- 강변/구릉/사막/죽림/해안과 마을 외곽 과수원·휴경지를 섞되 지형 정체성을 우선한다.
						local biome = baseLandBiome
						if biome == "woodland" and orchard and plotRng:NextInteger(1, 3) == 1 then
							biome = "orchard"
						elseif (biome == "woodland" or biome == "bamboo") and agricultural and quarter == "edge"
							and plotRng:NextInteger(1, 3) == 1 then
							biome = "fallow"
						end
						local palette = openLandAssets[biome]
						local selectIndex = plotRng:NextInteger(1, #palette)
						local spec = palette[selectIndex]
						if AssetIds[spec[1] .. "/" .. spec[2]] then
							local at = Vector3.new(x, 0, z0)
							local model = importedModel(folder, spec[1], spec[2], at,
								spec[3] * plotRng:NextNumber(0.91, 1.09), false)
							if model then
								rotateAround(model, at, plotRng:NextNumber(-math.pi, math.pi))
								model.Name = "Undeveloped_" .. spec[2]
								model:SetAttribute("BuildPlotId", plotId)
								model:SetAttribute("BuildType", "house")
								model:SetAttribute("BuildPhase", 0)
								model:SetAttribute("BuildState", "vacant")
								model:SetAttribute("BuildTier", 0)
								model:SetAttribute("BuildAuthority", "VISUAL_ONLY")
								model:SetAttribute("CityOpenLandBiome", biome)
								model:SetAttribute("CityOpenLandTerrain", coastForm)
								model:SetAttribute("CityOpenLandCulture", key)
								model:SetAttribute("ShowcaseOnly", true)
								wildernessQuota -= 1
								wildernessPlaced += 1
								table.insert(placedLots, { X = x, Z = z0, H = half })
								-- [근경 밀도] 고성능 PC는 작은 꽃·풀 한 개만 추가. 모바일은 원본 1개로 제한.
								if not wildernessTouch and plotRng:NextInteger(1, 3) == 1 then
									local accent = if biome == "arid" then "arid-cactus-short"
										elseif biome == "wetland" or biome == "coastal" then "coast-grass-patch"
										elseif biome == "hillside" then "Grass_Small"
										else "forest-flower-yellow"
									if AssetIds["Terrain/" .. accent] then
										local detailAt = at + Vector3.new(plotRng:NextNumber(-2.8, 2.8), 0,
											plotRng:NextNumber(-2.8, 2.8))
										local detail = importedModel(folder, "Terrain", accent, detailAt, 2.8, false)
										if detail then
											detail.Name = "UndevelopedDetail_" .. accent
											detail:SetAttribute("ShowcaseOnly", true)
											detail:SetAttribute("BuildAuthority", "VISUAL_ONLY")
											detail:SetAttribute("CityOpenLandBiome", biome)
											wildernessDetails += 1
										end
									end
								end
							end
						else
							wildernessRejected += 1
						end
					else
						wildernessRejected += 1
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
			-- [항구 골목] 기존 해안선·필지·도로 중심을 함께 옮겨 보행 동선을 보존한다.
			local laneBend = if villageLayout == "organic" then (if p % 2 == 0 then -3 else 3)
				elseif villageLayout == "terrace" then p * 2 else 0
			local laneZ = 152 + laneOffset + p * laneL + laneBend
			-- [항구별 물길] 운하 도시 이외에는 수로 대신 보행 골목.
			local waterLane = if identity then villageLayout == "canal" else P.canal or info.portId == "venice"
			if waterLane and p % 2 == 1 then
				local canal = part(folder, Vector3.new(360, 0.3, laneWidth + 1), CFrame.new(-365, 0.05, side * laneZ), Color3.fromRGB(70, 120, 150), Enum.Material.Glass)
				canal.Transparency = 0.25
				canal.CanCollide = false
				canal.CanQuery = false
			else
				strip(folder, style, (X_END - 235) / 2, side * laneZ, 235 - X_END, laneWidth)
				-- [해안선과 거리] 강·삼각주에는 목재 보행 가장자리, 언덕은 석조 가장자리를 얹는다.
				-- 기존 골목 중심·폭·보행판정은 그대로 유지하는 가벼운 비충돌 시각 경계다.
				if coastForm == "hill" or coastForm == "strait" or coastForm == "river"
					or coastForm == "delta" or coastForm == "lagoon" then
					local riverEdge = coastForm == "river" or coastForm == "delta" or coastForm == "lagoon"
					local edge = part(folder, Vector3.new(235 - X_END, 0.14, 1.05),
						CFrame.new((X_END - 235) / 2, 0.27, side * (laneZ + laneWidth * 0.36)),
						if riverEdge then C(146, 112, 78) else C(148, 143, 135),
						if riverEdge then Enum.Material.WoodPlanks else Enum.Material.Cobblestone)
					edge.Name = "CityTerrainStreetEdge"
					edge.CanCollide, edge.CanQuery, edge.CanTouch = false, false, false
					edge.CastShadow = false
				end
			end
			if p < pairsN then
				local t = (p + 0.5) / math.max(1, pairsN)
				-- [계단식·골목형] 동일한 주택 수를 유지한 채 행 시작점만 교차 배치한다.
				local rowShift = if villageLayout == "terrace" and p % 2 == 1 then -4
					elseif villageLayout == "organic" and p % 2 == 1 then 3 else 0
				fillRow(side * (laneZ + laneWidth / 2 + 6 + S / 2), t, -260 + rowShift, side, p, 1)
				local nextBend = if villageLayout == "organic" then (if (p + 1) % 2 == 0 then -3 else 3)
					elseif villageLayout == "terrace" then (p + 1) * 2 else 0
				local nextLaneZ = 152 + laneOffset + (p + 1) * laneL + nextBend
				fillRow(side * (nextLaneZ - laneWidth / 2 - 6 - S / 2), t, -260 - rowShift, side, p, 2)
			end
		end
	end
	-- [도시 외곽 자연 완충지] 마지막 주택 골목 바깥의 실제 빈땅만 기존 지형 팔레트로 채운다.
	-- 근접 건물/도로/시장/왕궁/랜드마크와 겹치면 건너뛰며 주택 건축 슬롯은 점유하지 않는다.
	local fringeBudget = if wildernessTouch then 7 else 13
	local outerBend = if villageLayout == "organic" then (if pairsN % 2 == 0 then -3 else 3)
		elseif villageLayout == "terrace" then pairsN * 2 else 0
	local outerEdgeZ = 152 + laneOffset + pairsN * laneL + outerBend + laneWidth * 0.5 + 15
	-- [발전별 실제 마을 땅] 표준화한 주거·골목·외곽 경계에 맞춰 TownFloor 실물 판의 폭·깊이를 축소한다.
	-- 왕궁은 이미 커진 실물 본관·별관을 덮을 최소 폭을 보장하고 농촌 바닥은 건드리지 않는다.
	local townFloor = folder:FindFirstChild("TownFloor")
	if townFloor and townFloor:IsA("BasePart") then
		local townLeft = if isRoyalCity then -635 else math.min(-475, X_END - 32)
		local townRight = 35 -- 기존 항구 해안선과 접한 동쪽 가장자리를 유지한다.
		local townHalfZ = math.min(360 + lvl * 80 + 14, math.max(442, outerEdgeZ + 52))
		-- [빈 땅 줄이기 · 2026-11-28 오너: "이스탄불 등 넓은 맨땅에 집이 띄엄띄엄"]
		-- 지시서 항구는 단계별 집 수 상한(6~24채)이 있는데 땅은 510×880 그대로라 텅 비었다.
		-- 실제 놓인 집·시설·광장 범위 + 40 으로 땅을 줄이고, 그 밖으로 뻗은 빈 길 띠도 잘라낸다.
		-- 왕궁 도시는 기존 최소 폭 유지. 농촌 바닥·집 배치·저장은 바꾸지 않는다(보이는 땅·길만).
		if identity and not isRoyalCity and #placedLots > 0 then
			local bx0, bz0, bz1 = 0, -40, 40
			for _, lot in placedLots do
				local hx = lot.HX or lot.H or 8
				local hz = lot.HZ or lot.H or 8
				bx0 = math.min(bx0, lot.X - hx)
				bz0 = math.min(bz0, lot.Z - hz)
				bz1 = math.max(bz1, lot.Z + hz)
			end
			for _, at in facilityLocations do
				bx0 = math.min(bx0, at.X - 24)
				bz0 = math.min(bz0, at.Z - 24)
				bz1 = math.max(bz1, at.Z + 24)
			end
			local compactLeft = math.max(townLeft, bx0 - 40)
			local compactHalfZ = math.min(townHalfZ, math.max(-bz0, bz1) + 40)
			if compactLeft > townLeft + 20 or compactHalfZ < townHalfZ - 20 then
				townLeft, townHalfZ = compactLeft, compactHalfZ
				local trimmed = 0
				for _, road in folder:GetChildren() do
					if road:IsA("BasePart") and road:GetAttribute("RoadStrip") then
						local p, sz = road.Position, road.Size
						local x0, x1 = math.max(p.X - sz.X / 2, townLeft), math.min(p.X + sz.X / 2, townRight + 60)
						local z0, z1 = math.max(p.Z - sz.Z / 2, -townHalfZ), math.min(p.Z + sz.Z / 2, townHalfZ)
						if math.abs(p.Z) < 20 and sz.X > sz.Z then
							-- 농촌으로 이어지는 중심 큰길은 그대로 둔다.
						elseif x1 - x0 < 2 or z1 - z0 < 2 then
							road:Destroy()
							trimmed += 1
						elseif x1 - x0 < sz.X - 1 or z1 - z0 < sz.Z - 1 then
							road.Size = Vector3.new(x1 - x0, sz.Y, z1 - z0)
							road.Position = Vector3.new((x0 + x1) / 2, p.Y, (z0 + z1) / 2)
							trimmed += 1
						end
					end
				end
				folder:SetAttribute("TownCompactRoadsTrimmed", trimmed)
			end
		end
		townFloor.Size = Vector3.new(townRight - townLeft, townFloor.Size.Y, 2 * townHalfZ)
		townFloor.Position = Vector3.new((townLeft + townRight) * 0.5, townFloor.Position.Y, 0)
		folder:SetAttribute("TownLandWidth", math.floor(townRight - townLeft))
		folder:SetAttribute("TownLandDepth", math.floor(2 * townHalfZ))
		folder:SetAttribute("TownLandTier", cityTier)
	end
	if outerEdgeZ < 360 + lvl * 80 - 20 then
		for side = -1, 1, 2 do
			for row = 1, 3 do
				local z = side * (outerEdgeZ + row * 11)
				if math.abs(z) < 360 + lvl * 80 - 18 then
					for col = 1, 8 do
						if fringeBudget <= 0 then break end
						local x = -262 + (X_END + 262) * (col - 0.5) / 8
						local half = 6
						if not onStreet(x, half) and not reserved(x, z, half) then
							local fringeId = ("%s:fringe:%d:%d:%d"):format(info.portId, side, row, col)
							local fringeRng = seeded(fringeId .. ":geographic-land")
							local biome = baseLandBiome
							if biome == "woodland" and orchard and row == 1 then biome = "orchard"
							elseif (biome == "woodland" or biome == "bamboo") and agricultural and row == 2 then biome = "fallow" end
							local palette = openLandAssets[biome]
							local spec = palette[fringeRng:NextInteger(1, #palette)]
							if AssetIds[spec[1] .. "/" .. spec[2]] then
								local at = Vector3.new(x, 0, z)
								local model = importedModel(folder, spec[1], spec[2], at, spec[3], false)
								if model then
									rotateAround(model, at, fringeRng:NextNumber(-math.pi, math.pi))
									model.Name = "UndevelopedFringe_" .. spec[2]
									model:SetAttribute("BuildPlotId", fringeId)
									model:SetAttribute("BuildType", "landscape")
									model:SetAttribute("BuildPhase", 0)
									model:SetAttribute("BuildState", "vacant")
									model:SetAttribute("BuildAuthority", "VISUAL_ONLY")
									model:SetAttribute("ShowcaseOnly", true)
									model:SetAttribute("CityOpenLandBiome", biome)
									table.insert(placedLots, { X = x, Z = z, H = half })
									fringeBudget -= 1
									wildernessFringe += 1
								end
							end
						end
						end
					end
				end
		end
	end
	-- [재진입 QA] 경제/세이브를 변경하지 않고 항구 지리·빈땅 피복 상태만 표시한다.
	folder:SetAttribute("CityOpenLandBaseBiome", baseLandBiome)
	folder:SetAttribute("CityOpenLandTerrain", coastForm)
	folder:SetAttribute("CityOpenLandPlots", wildernessPlaced)
	folder:SetAttribute("CityOpenLandDetails", wildernessDetails)
	folder:SetAttribute("CityOpenLandFringe", wildernessFringe)
	folder:SetAttribute("CityOpenLandRejected", wildernessRejected)
	folder:SetAttribute("CityOpenLandMode", "GEOGRAPHY_VISUAL_ONLY")
	-- [항구별 시각 QA] 배치 성공·이동·실패 사유를 기존 PortScene 폴더에만 공개한다.
	-- 모바일에서는 추가 스캔·영구 저장 없이 이 집계만 읽어 항구별 빈집/밀집 원인을 확인한다.
	folder:SetAttribute("CityHousingPort", info.portId)
	folder:SetAttribute("CityHousingCulture", key)
	folder:SetAttribute("CityHousingCandidates", homeCandidates)
	folder:SetAttribute("CityHousingRejectRoad", homeRejectRoad)
	folder:SetAttribute("CityHousingRejectStreet", homeRejectStreet)
	folder:SetAttribute("CityHousingRejectReserved", homeRejectReserved)
	folder:SetAttribute("CityHousingPlaced", homePlaced)
	folder:SetAttribute("CityOldTownHomes", oldTownHomes)
	folder:SetAttribute("CityNewTownHomes", newTownHomes)
	folder:SetAttribute("CityNightWindowCount", nightWindows)
	folder:SetAttribute("CityCulturalHousingAccents", villageAccents)
	folder:SetAttribute("CityCulturalHousingRoofs", villageCrowns)
	folder:SetAttribute("CityHousingShifted", homeShifted)
	folder:SetAttribute("CityHousingPlotRejected", homePlotRejected)
	folder:SetAttribute("CityHousingModelRejected", homeModelRejected)
	folder:SetAttribute("CityHousingPlacedPercent", if homeCandidates > 0
		then math.floor(homePlaced * 100 / homeCandidates + 0.5) else 0)
	folder:SetAttribute("CityHousingLayoutState", if homeCandidates == 0 then "NO_ECONOMIC_CANDIDATE"
		elseif homePlaced == 0 then "NO_SAFE_HOUSING_PLOT" else "COMPUTED_NOT_VISUALLY_VERIFIED")
	for sizeClass = 1, 5 do
		folder:SetAttribute("CityHousingSize" .. sizeClass, homeSizeCounts[sizeClass])
	end
	for _, sx in streetsOuter do
		strip(folder, style, sx, 0, laneWidth, 2 * (152 + math.abs(laneOffset) + pairsN * laneL) + 30)
	end
	-- 기존 항구 중심 도로는 유지하고 서쪽 외곽도로로 진입로를 연결한다.
	strip(folder, style, -212, 0, 9, 320)
	-- [마을 길 실물화] 기존 보행 도로의 위에 승인된 CC0 포장·목재 판로 메시를 소량 배치한다.
	-- 구도심 흙길 → 지역별 포석/물가 목재길로 발전한다. 도로 충돌·건축 필지·경제 원본은 그대로 둔다.
	local streetTouch = UserInputService.TouchEnabled
	local stoneStreet = key == "iberia" or key == "italy" or key == "med" or key == "france"
		or key == "britain" or key == "hanse" or key == "brick" or key == "stone"
		or key == "north" or key == "colonial" or key == "creole" or key == "ottoman"
	local timberStreet = key == "malabar" or key == "seasia" or key == "pacific"
		or key == "tropic" or key == "nordic"
	-- [항구별 길] 기존 PortIdentity 5단계 도로 재질에 맞는 승인 실물 메시만 추가한다.
	-- 벽돌·모래 길은 기존 기본 길 재질을 그대로 드러내고 잘못된 포석 원본을 덮지 않는다.
	local streetName = PortIdentity.streetAt(info.portId, lvl)
	local pathKind = if streetName == "brick" or streetName == "sand" then nil
		elseif streetName == "plank" then "Naval"
		elseif streetName == "cobble" or streetName == "flagstone" or streetName == "paved" then "Town"
		elseif streetName then "Terrain"
		elseif lvl <= 2 then "Terrain" elseif timberStreet then "Naval"
		elseif stoneStreet then "Town" else "Terrain"
	local pathAsset = if streetName == "brick" or streetName == "sand" then nil
		elseif streetName == "plank" then "platform-planks"
		elseif streetName == "cobble" then "cobblestones"
		elseif streetName == "flagstone" or streetName == "paved" then "kenney_plate_pavement_01"
		elseif streetName == "gravel" then "ground-pathrocks"
		elseif streetName == "dirt" or streetName == "red_earth" then "ground-pathstraight"
		elseif lvl <= 2 then "ground-pathstraight" elseif timberStreet then "platform-planks"
		elseif stoneStreet then "cobblestones" else "ground-pathrocks"
	local streetPatches, streetLanterns = 0, 0
	-- [깨끗한 길] 무작위로 바닥 조각을 흩뿌리지 않고 기존 골목과 만나는 교차점에만 배치.
	local patchLimit = if streetTouch then 4 else 8
	if pathKind and pathAsset and AssetIds[pathKind .. "/" .. pathAsset] then
		for i, sx in streetsOuter do
			if streetPatches >= patchLimit then break end
			local laneRow = math.min(pairsN, i - 1)
			local laneBend = if villageLayout == "organic" then (if laneRow % 2 == 0 then -3 else 3)
				elseif villageLayout == "terrace" then laneRow * 2 else 0
			local side = if i % 2 == 0 then 1 else -1
			local roadAt = Vector3.new(sx, 0.25, side * (152 + laneOffset + laneRow * laneL + laneBend))
			local paving = importedModel(folder, pathKind, pathAsset, roadAt,
				math.min(10, laneWidth * 0.76), false)
			if paving then
				paving.Name = "CityRegionalStreetPaving"
				paving:SetAttribute("CityArchitectureCulture", key)
				paving:SetAttribute("CityDevelopmentTier", lvl)
				paving:SetAttribute("BuildAuthority", "VISUAL_ONLY")
				paving:SetAttribute("ShowcaseOnly", true)
				streetPatches += 1
			end
		end
	end
	-- [항구별 가로등] 각 도시의 유형/발전도/모바일 예산을 따른다.
	-- 종이초롱·석등·모스크 등을 서양 등주로 속이지 않고 정확한 원본이 없으면 보류한다.
	if lvl >= 2 then
		local lampStyle = if identity then identity.lamp else "oil_lantern"
		-- [15항구 전용 등] 등록된 종이초롱·석등·모스크등은 정확한 항구 원본만 사용한다.
		-- 미등록 원본을 서양 가로등으로 속이지 않으며, 기존 서양 기름등 모델만 재사용한다.
		local originalLamp = PortScene.cultureSlot(info.portId .. "_street_lamp")
		local lampAsset = if originalLamp and AssetIds["Town/" .. originalLamp] then originalLamp
			elseif lampStyle == "oil_lantern" then "kenney_lightpost_01" else nil
		local lampSpacing = PortIdentity.tier(lvl).lampEvery
		local lampLimit = math.min(#streetsOuter, if streetTouch then 2 else 4)
		if lampAsset and AssetIds["Town/" .. lampAsset] then
			for i = 1, lampLimit do
				if lampSpacing == 0 or (i - 1) % lampSpacing == 0 then
					local side = if i % 2 == 0 then 1 else -1
					local lampAt = Vector3.new(streetsOuter[i] + laneWidth * 0.36, 0,
						side * (152 + laneOffset + laneL * 0.5))
					local lamp = importedModel(folder, "Town", lampAsset, lampAt, 5.6, false)
					if lamp then
						lamp.Name = "CityRegionalStreetLantern"
						lamp:SetAttribute("PortLampStyle", lampStyle)
						if originalLamp and lampAsset == originalLamp then lamp:SetAttribute("PortOriginalLamp", originalLamp) end
						-- [런던 기름등] 승인된 실물 유리 케이스 높이에만 기존 야간 조명 규모로 빛을 건다.
						if lampAsset == "london_street_lamp" then
							local anchor = lamp:FindFirstChildWhichIsA("BasePart", true)
							if anchor then
								local lampBox, lampSize = lamp:GetBoundingBox()
								local mount = Instance.new("Attachment")
								mount.Name = "OilLampGlow"
								mount.Parent = anchor
								mount.WorldPosition = lampBox.Position + Vector3.new(0, lampSize.Y * 0.39, 0)
								local glow = Instance.new("PointLight")
								glow.Color = Color3.fromRGB(255, 205, 130)
								glow.Range, glow.Brightness, glow.Shadows = 12, 0.4, false
								glow.Parent = mount
							end
						end
						lamp:SetAttribute("BuildAuthority", "VISUAL_ONLY")
						streetLanterns += 1
					end
				end
			end
		elseif identity then
			folder:SetAttribute("CityPortMissingLamp", info.portId .. "_street_lamp")
		end
	elseif identity then
		folder:SetAttribute("CityPortMissingLamp", info.portId .. "_torch")
	end
	folder:SetAttribute("CityRegionalStreetPavingCount", streetPatches)
	folder:SetAttribute("CityRegionalStreetLanternCount", streetLanterns)
	folder:SetAttribute("CityRegionalStreetAsset", if pathKind and pathAsset then pathKind .. "/" .. pathAsset
		else "PORT_IDENTITY_MATERIAL_ONLY")
	if streetName then folder:SetAttribute("CityPortVillageStreet", streetName) end
	-- 구역 내용 (등록된 실제 3D 모델만 사용)
	do
		local function put(kind, asset, size, x, z, solid, yaw, buildDelay)
			local m = importedModel(folder, kind, asset, Vector3.new(x, 0, z), size, solid == true, nil, buildDelay)
			if m and yaw then rotateAround(m, Vector3.new(x, 0, z), yaw) end
			return m
		end
		local hotKey = key == "ottoman" or key == "swahili" or key == "malabar" or key == "colonial" or key == "desert" or key == "tropic" or key == "seasia" or key == "pacific" or key == "wafrica" or key == "creole"
		-- [실제 도시 구획] 경제의 건물·주민·고용을 읽기만 한다. 기존 필지 좌표 및 시드 유지.
		-- 1단계부터 동일한 가판대 10개/작물 119개를 뿌리지 않고 시설이 성장할 때 단계적으로 채운다.
		local districtBuildings = info.sim and info.sim.buildings
		local districtJobs = info.sim and info.sim.jobs
		local districtTouch = game:GetService("UserInputService").TouchEnabled
		for _, d in districts do
			local cx, cz = d.at.X, d.at.Z
			local face = if cz > 0 then 0 else math.pi
			if d.kind == "religious" then
				-- [종교 시설] 문화권 대표 건물은 유지하고 부속탑·가로등은 발전도와 실제 종사 인력에 맞춰 개방.
				local clergyAvailable = not districtJobs or (tonumber(districtJobs.clergy) or 0) > 0
				-- [지역 종교 원본] 예배당/신사 1단계, 사원/성당 3단계의 정확한 현지 모델만 사용.
				local originalReligious = info.portId .. (if lvl <= 2 then "_bld_chapel" else "_bld_temple")
				local placedOriginal = AssetIds["Town/" .. originalReligious]
					and put("Town", originalReligious, if lvl <= 2 then 22 else 30, cx, cz, true, face)
				if key == "japan" or key == "china" or key == "korea" then
					if not placedOriginal then put("Town", "temple-tower", 26, cx, cz, true, face) end
					if lvl >= 3 and clergyAvailable then
						put("Town", "temple-stone", 14, cx + 14, cz + (if cz > 0 then -8 else 8), true, face)
					end
				elseif key == "ottoman" or key == "swahili" or key == "malabar" or key == "desert" or key == "tropic" or key == "seasia" or key == "pacific" or key == "wafrica" then
					if not placedOriginal then put("Town", "temple-stone", 28, cx, cz, true, face) end
					if lvl >= 4 and clergyAvailable then put("Terrain", "pillar-obelisk", 14, cx + 15, cz, true) end
				else
					if not placedOriginal then put("Town", "church", 30, cx, cz, true, face) end
					if lvl >= 3 and clergyAvailable then
						put("Town", "bell-tower", 22, cx - 16, cz + (if cz > 0 then -6 else 6), true)
					end
				end
				-- [지역 예식 조명] 초롱·모스크 등·석등이 없는 동안 범용 서양 등불을 대신 세우지 않는다.
				if lvl >= 3 and clergyAvailable and (not identity or identity.lamp == "oil_lantern") then
					for k = -1, 1, 2 do
						lantern(folder, Vector3.new(cx + k * 9, 0, cz + (if cz > 0 then -17 else 17)), 3)
					end
				end
			elseif d.kind == "market" then
				-- [시장] 실제 상업 시설이 없는 항구에 가짜 10개 가판대를 배치하지 않는다.
				local marketBuilt = if districtBuildings then math.max(0, math.floor(tonumber(districtBuildings.market) or 0)) else lvl * 2
				local warehouseBuilt = if districtBuildings then math.max(0, math.floor(tonumber(districtBuildings.warehouse) or 0)) else lvl
				local stalls = math.min(if districtTouch then 4 else 6, lvl + 1,
					if marketBuilt > 0 then 1 + math.floor(math.sqrt(marketBuilt)) else 0)
				-- [런던 지시서] 기존 Harbor 지역 축제·정기시 판정만 따라 장날을 표시하며 경제·저장은 그대로 둔다.
				local londonMarketDay = info.portId == "london" and type(info.day) == "number"
					and require(script.Parent:WaitForChild("Harbor")).festivalAt("europe", info.day) ~= nil
				local londonExtraStalls = 0
				-- [시장 보행축] 중앙 통로는 비우고 기본 가판대와 장날 추가 가판대 사이도 띄운다.
				-- 시장의 예약 필지(반폭 41/43) 안에서만 기존 전시물을 옮긴다.
				local stallRowZ = 11
				local festivalRowZ = 22
				local cargoEdgeZ = cz - 33
				local displayEdgeZ = cz + 33
				for k = 1, stalls do
					local x = cx + (k - (stalls + 1) / 2) * 10
					local side = if k % 2 == 0 then -1 else 1
					local localMarket = PortScene.cultureSlot(info.portId .. "_bld_market_stalls")
					local fallbackStall = if (k + lvl) % 2 == 0 then "stall-red" else "stall-green"
					local stallAsset = if lvl >= 2 and k == 1 and AssetIds["Town/" .. localMarket] then localMarket else fallbackStall
					local originalStall = put("Town", stallAsset, 7, x, cz + side * stallRowZ, false,
						if side > 0 then face else face + math.pi)
					if not originalStall and stallAsset == localMarket then
						stallAsset = fallbackStall
						originalStall = put("Town", stallAsset, 7, x, cz + side * stallRowZ, false,
							if side > 0 then face else face + math.pi)
					end
					if originalStall then originalStall.Name = "CityMarketStall" end
					if londonMarketDay and originalStall then
						local extra = put("Town", stallAsset, 7, x, cz + side * festivalRowZ, false,
							if side > 0 then face else face + math.pi)
						if extra then
							extra.Name = "CityMarketStall"
							londonExtraStalls += 1
						end
					end
				end
				if stalls >= 2 and warehouseBuilt > 0 then
					-- [등록 원본 자동 검증] 같은 항구의 정확한 역할 원본만 기존 시장 슬롯에서 평가한다.
					-- 원본 등록 전용 자산은 Studio 후보이며, 실제 플레이의 승인된 소품은 유지한다.
					local cartSource = info.portId .. "-wheelbarrow-source"
					local crateSource = info.portId .. "-wooden-produce-crate-source"
					if not (RunService:IsStudio() and AssetIds["Town/" .. cartSource]
						and put("Town", cartSource, 4, cx - 14, cargoEdgeZ, false)) then
						put("Town", "cart", 4, cx - 14, cargoEdgeZ, false)
					end
					if not (RunService:IsStudio() and AssetIds["Town/" .. crateSource]
						and put("Town", crateSource, 2.4, cx + 13, cargoEdgeZ, false)) then
						put("Cargo", "box-open", 2.4, cx + 13, cargoEdgeZ, false)
					end
				end
				-- [장날] 런던만 같은 승인 가판대를 두 줄로 진열, 다른 항구는 기존 연출을 보존한다.
				if stalls > 0 then
					if info.portId == "london" and londonMarketDay then
						folder:SetAttribute("CityMarketStalls", stalls + londonExtraStalls)
					else
						folder:SetAttribute("CityMarketStalls", stalls)
					end
				end
				if info.portId == "london" then folder:SetAttribute("CityLondonMarketDay", londonMarketDay) end
				-- [런던 특산품] 양모·석탄·주석 모두 승인된 Cargo 실물로 시장에 놓는다.
				local marketGoods = if info.portId == "london" then { "wool", "coal", "tin" }
					else Chains.showcaseGoods(info.portId, made,
						if game:GetService("UserInputService").TouchEnabled then 1 else 2)
				for i, good in marketGoods do
					-- 실물 시장 0개인 도시에는 교역품이 허공에 진열되지 않는다.
					local mesh = if stalls > 0 then GOOD_MESH[good] else nil
					if mesh and AssetIds[mesh[1] .. "/" .. mesh[2]] then
						local item = put(mesh[1], mesh[2], goodSize(good, 2.5),
							cx + (i - (#marketGoods + 1) / 2) * 18, displayEdgeZ, false)
						if item then
							item.Name = "MarketSpecialtyDisplay_" .. good
							item:SetAttribute("LocalProduct", good)
							item:SetAttribute("ShowcaseOnly", true)
						end
					end
				end
			else -- farm
				-- [항구별 자원 농촌] 실제 생산품에 맞는 식재 모델만 배치. 논·차밭·후추밭에 밀/옥수수 대용 금지.
				local ruralProduct = if table.find(made, "rice") then "rice"
					elseif table.find(made, "maize") then "maize"
					elseif table.find(made, "grain") or table.find(made, "wheat") then "grain"
					elseif table.find(made, "wool") or table.find(made, "cheese") then "pasture"
					elseif table.find(made, "tea") or table.find(made, "pepper") or table.find(made, "spice") then "special_crop"
					else "other"
				local farmAsset = if ruralProduct == "grain" then (if lvl >= 3 then "crops-wheatstageb" else "crops-wheatstagea")
					elseif ruralProduct == "maize" then "crops-cornstagec" else nil
				folder:SetAttribute("CityPortRuralProduct", ruralProduct)
				folder:SetAttribute("CityPortRuralCropAsset", farmAsset or "MISSING_EXACT_3D_CROP")
				-- [농업 지구] 실제 경작 농장 수량·도시 발전도에 비례한 경작 줄만 표현한다.
				-- 과거 고정 119개 작물+19개 울타리를 줄이고 농지 내부의 보행 여백을 확보한다.
				local farmsBuilt = if districtBuildings then math.max(0, math.floor(tonumber(districtBuildings.farm) or 0)) else lvl * 7
				local cropRows = if farmsBuilt <= 0 or not farmAsset then 0 else math.min(2, lvl, math.max(1, math.floor(math.sqrt(farmsBuilt) / 2)))
				local cropColumns = if districtTouch then math.min(3, lvl + 1) else math.min(5, lvl + 1)
				for row = -cropRows, cropRows do
					if cropRows > 0 then
						for k = -cropColumns, cropColumns, 2 do
							put("Terrain", farmAsset, 5, cx + k * 7, cz + row * 8, false)
						end
					end
				end
				if farmsBuilt > 0 then
					-- [정돈된 농촌] 긴 울타리 9개를 3개로 줄이고 실제 생산품에 맞는 승인된 작업장 1개만.
					for k = -2, 2, 2 do
						put("Town", "fence", 5, cx + k * 12, cz + (if cz > 0 then 29 else -29), false)
					end
					if lvl >= 3 and farmsBuilt >= 5 then
						local europeanFarm = key == "britain" or key == "france" or key == "north"
							or key == "nordic" or key == "hanse" or key == "brick"
						-- 산림 제재·철 대장간·곡물 제분처럼 실제 용도가 일치할 때만 사용한다.
						-- 목장용 축사나 탄광 건물로 유럽식 말 마구간·대장간을 위장하지 않는다.
						local workshop = if europeanFarm and table.find(made, "timber") then "village-sawmill"
							elseif europeanFarm and table.find(made, "iron") then "village-blacksmith"
							elseif europeanFarm and ruralProduct == "grain" then
							(if AssetIds["Town/" .. PortScene.cultureSlot(info.portId .. "_bld_mill")]
								then PortScene.cultureSlot(info.portId .. "_bld_mill") else "village-mill") else nil
						if workshop and AssetIds["Town/" .. workshop] then
							local building = put("Town", workshop, 22, cx + 62, cz, true, face)
							if not building and workshop == PortScene.cultureSlot(info.portId .. "_bld_mill") then
								workshop = "village-mill"
								building = put("Town", workshop, 22, cx + 62, cz, true, face)
							end
							if building then building:SetAttribute("CityPortRuralWorkshop", workshop) end
						end
					end
				end
				folder:SetAttribute("CityFarmRows", if cropRows > 0 then cropRows * 2 + 1 else 0)
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
							stageDecoration(obj, Vector3.new(cx + row[4], 0, cz + row[5]), delay)
						end
					end
				end
			end
			-- [시설 이용 주민] 각 구역을 실제 근무처로 연결한다. 가짜 경제 인원·저장·고용 생성은 하지 않는다.
			local job = if d.kind == "religious" then "clergy" elseif d.kind == "market" then "merchant" else "farmer"
			local employed = if districtJobs then math.max(0, math.floor(tonumber(districtJobs[job]) or 0)) else 2 + lvl
			local buildingCount = if districtBuildings then math.max(0,
				math.floor(tonumber(districtBuildings[if d.kind == "religious" then "school"
					elseif d.kind == "market" then "market" else "farm"]) or 0)) else lvl
			local workersLimit = math.min(employed, if districtTouch then 3 else 5,
				if buildingCount > 0 then 1 + math.floor(math.sqrt(buildingCount)) else 0)
			local districtResidents = 0
			local activity = if d.kind == "religious" then { "pray", "read", "bell", "bless" }
				elseif d.kind == "market" then { "stall", "weigh", "offer", "receive", "count" }
				else { "hoe", "harvest", "sow", "water", "inspect" }
			local leisure = if d.kind == "religious" then { "listen", "talk", "look" }
				elseif d.kind == "market" then { "talk", "bargain", "gossip" }
				else { "stretch", "drink", "gossip" }
			local function npc(dx, dz, yaw, kind, mode, spec)
				if districtResidents >= workersLimit then return end
				local outfit = if spec and spec.extra then table.clone(spec.extra) else {}
				outfit.profession, outfit.year = job, info.year or currentYear
				outfit.female = districtResidents % 2 == 1
				outfit.persona = (districtResidents % 3) + 1
				-- [구역별 실제 인상] 농부의 밀짚모자·시장 상인의 머리·나이 든 성직자를 구분한다.
				outfit.age = if job == "clergy" and districtResidents == 0 then "elder" else "adult"
				outfit.hair = if outfit.female then (if districtResidents % 3 == 0 then "bun" else "long") else "short"
				outfit.bodyType = if job == "farmer" then "heavy" elseif job == "merchant" then "slim" else "average"
				outfit.motionStyle = if job == "farmer" then "heavy" elseif job == "merchant" then "nimble" else "scholar"
				if job == "farmer" then outfit.hat = "straw" end
				if job == "clergy" then outfit.noHat = true end
				local m = villager(folder, Vector3.new(cx + dx, 0, cz + dz), yaw,
					Color3.fromRGB(rng:NextInteger(60, 190), rng:NextInteger(60, 150), rng:NextInteger(40, 130)),
					rng, spec and spec.role or "Rogue", false, outfit)
				if not m then return end
				districtResidents += 1
				m:SetAttribute("Job", job)
				m:SetAttribute("Workplace", d.kind)
				local w = { model = m, base = m:GetPivot(), kind = kind, mode = mode, phase = rng:NextNumber(0, 10) }
				-- [구역별 교대근무] 정지/이동 근로자 모두 동일한 직업별 근무표를 따른다.
				w.districtDuty = true
				w.shiftStart = (if job == "farmer" then 5 elseif job == "merchant" then 7 else 6) + rng:NextNumber(-0.4, 0.4)
				w.shiftEnd = (if job == "farmer" then 18 elseif job == "merchant" then 20 else 21) + rng:NextNumber(-0.4, 0.4)
				if mode == "path" then
					w.len = spec.len
					w.speed = rng:NextNumber(1.2, 1.9)
					w.idleKind = spec.idle
					w.districtJob = job
				else
					w.job = job
					w.workKinds, w.tradeKinds, w.leisureKinds = activity, activity, leisure
					w.activitySpan = rng:NextNumber(9, 19)
					w.socialSpan = rng:NextNumber(30, 46)
					w.personality = rng:NextInteger(0, 4)
				end
				table.insert(walkers, w)
			end
			if d.kind == "religious" then
				local doorZ = if cz > 0 then -19 else 19
				npc(-4, doorZ, face, "bell", "stay", { role = "Mage" })
				npc(5, doorZ, face + math.pi, "pray", "stay", { role = "Mage" })
				npc(-22, doorZ, -math.pi / 2, "look", "path", { role = "Rogue", len = 22, idle = "look" })
			elseif d.kind == "market" then
				for k = -2, 2, 2 do
					npc(k * 8, (if cz > 0 then -11 else 11), face + math.pi, "stall", "stay", { role = "Rogue" })
				end
				npc(-18, 0, -math.pi / 2, "carry", "path", { role = "Rogue", len = 36, idle = "talk" })
				npc(18, 3, math.pi / 2, "look", "path", { role = "Rogue", len = 30, idle = "look" })
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
			if newGrade then stageDecoration(warehouseDisplay, Vector3.new(-31, 0, 222), delay) end
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
		local specialtyPlaced, specialtyRejected, specialtyReflowed = 0, 0
		-- [도시 경계] 발전도 1~5단계의 기존 마을 바닥판 끝보다 8스터드 안쪽으로만 공방을 배치한다.
		local industryLimitZ = 360 + lvl * 80 - 8
		for k = 1, n do
			local good = goods[k]
			local mesh = GOOD_MESH[good]
			-- [생산품별 건축] 기존 항구 생산품만 읽어 어업·직물·광산·목재·농산·공예·무역 건축형을 선택한다.
			local family = if table.find({ "fish", "pearls", "whale_oil", "pearl_shell" }, good) then "fishery"
				elseif table.find({ "wool", "cloth", "linen", "silk", "cotton" }, good) then "textile"
				elseif table.find({ "coal", "iron", "tin", "copper", "silver", "gold", "marble" }, good) then "mineral"
				elseif table.find({ "timber", "mahogany", "kauri", "ebony", "brazilwood" }, good) then "timber"
				elseif table.find({ "porcelain", "glass", "lacquer", "gems" }, good) then "craft"
				elseif table.find({ "rice", "tea", "coffee", "spice", "sugar", "maize", "pepper", "cocoa" }, good) then "farm"
				else "trade"
			local width = if family == "fishery" then 13 elseif family == "mineral" then 18
				elseif family == "textile" then 16 elseif family == "timber" then 17 else 15
			local depth = if family == "mineral" or family == "craft" then 14
				elseif family == "farm" then 12 else 11
			local floorCount = if lvl >= 4 and (family == "trade" or family == "textile" or family == "craft") then 2 else 1
			local baseColor = if family == "fishery" then C(149, 171, 166)
				elseif family == "mineral" then C(138, 129, 123)
				elseif family == "textile" then C(183, 160, 128)
				elseif family == "timber" then C(150, 118, 89)
				elseif family == "farm" then C(187, 173, 128)
				elseif family == "craft" then C(193, 177, 155) else C(190, 170, 140)
			local wall = baseColor:Lerp(style.walls[1], rng:NextNumber(0.18, 0.34))
			-- [산업 구역 재배치] 기존 시장·농장·왕궁·랜드마크 및 먼저 지어진 주택과 실제 외곽이 겹치지 않는 위치만 사용.
			local candidates = {
				origin + Vector3.new((k - (n + 1) / 2) * 30, 0, 0),
				Vector3.new(-90 - (k - 1) * 58, 0, -234),
				Vector3.new(-90 - (k - 1) * 58, 0, 234),
				Vector3.new(-101, 0, -317 - (k - 1) * 54),
				Vector3.new(-101, 0, 317 + (k - 1) * 54),
				Vector3.new(-172, 0, -345),
				Vector3.new(-172, 0, 345),
			}
			local chosen
			for _, candidate in candidates do
				if math.abs(candidate.Z) + 27 <= industryLimitZ
					and not onStreet(candidate.X, 27) and not reserved(candidate.X, candidate.Z, 27) then
					chosen = candidate
					break
				end
			end
			if chosen and mesh and AssetIds[mesh[1] .. "/" .. mesh[2]] then
				local staged = Instance.new("Model")
				staged.Name = "PortScene"
				-- [항구별 특산 공방] CSV의 <항구>_workshop_<상품> 실물 원본이 등록된 경우
				-- 기존 주택 외관 대신 승인된 공방을 사용한다. 없는 원본을 일반 집으로 가장하지 않는다.
				local workshopName = PortScene.cultureSlot(info.portId .. "_workshop_" .. good)
				local workshop = if lvl >= 3 and AssetIds["Town/" .. workshopName]
					then importedModel(staged, "Town", workshopName, chosen, math.max(width, depth) * HOUSE_SCALE, true)
					else nil
				local body = workshop and workshop:FindFirstChildWhichIsA("BasePart", true)
				if not body then
					if workshop then workshop:Destroy(); workshop = nil end
					body = house(staged, chosen, width, depth, floorCount, style, rng, wall)
				end
				if body then
					local bounds, ext = staged:GetBoundingBox()
					local hx = math.max(27, math.abs(bounds.Position.X - chosen.X) + ext.X * 0.5 + 2)
					local hz = math.max(27, math.abs(bounds.Position.Z - chosen.Z) + ext.Z * 0.5 + 2)
					-- [실측 재탐색] 처음 선택한 위치에 지붕·별채가 걸려도 나머지 항구 후보를 모두 재검사한다.
					-- 건물은 한 번만 생성하고 임시 모델만 이동해 비용 증가 없이 안전한 곳을 찾는다.
					local safeSite
					for _, candidate in candidates do
						if math.abs(candidate.Z) + hz <= industryLimitZ
							and not onStreet(candidate.X, hx) and not reserved(candidate.X, candidate.Z, hx, hz) then
							safeSite = candidate
							break
						end
					end
					if safeSite then
						if safeSite ~= chosen then
							staged:PivotTo(CFrame.new(safeSite - chosen) * staged:GetPivot())
							specialtyReflowed += 1
						end
						chosen = safeSite
						for _, object in staged:GetChildren() do object.Parent = folder end
						body:SetAttribute("BuildPlotId", ("%s:specialty:%d"):format(info.portId, k))
						body:SetAttribute("BuildType", "specialty")
						body:SetAttribute("BuildPhase", 4)
						body:SetAttribute("BuildState", "complete")
						body:SetAttribute("BuildAuthority", "VISUAL_ONLY")
						body:SetAttribute("IndustryGood", good)
						body:SetAttribute("IndustryFamily", family)
						if workshop then
							workshop.Name = "CityPortOriginalWorkshop_" .. good
							workshop:SetAttribute("PortOriginalWorkshop", workshopName)
						end
						body:SetAttribute("BuildingFootprintX", hx * 2)
						body:SetAttribute("BuildingFootprintZ", hz * 2)
						table.insert(placedLots, { X = chosen.X, Z = chosen.Z, HX = hx, HZ = hz, H = math.max(hx, hz) })
						specialtyPlaced += 1
						-- 기존 생산품 3D 전시·간판과 동일한 수량 상한을 유지한다.
						for j = -1, 1 do
							importedModel(folder, mesh[1], mesh[2], chosen + Vector3.new(j * 3.2, 0, 8.6),
								goodSize(good, 2.8), false, mesh[3])
						end
						-- [항구 특산품 소품] Luau 조건식은 복수 반환값을 허용하지 않으므로 기존 선택 순서를 직접 분기한다.
						local propGroup, propName
						if family == "fishery" then
							propGroup, propName = "Town", "stall-green"
						elseif family == "mineral" then
							propGroup, propName = "Cargo", "iron-bars"
						elseif family == "timber" then
							propGroup, propName = "Cargo", "resource-planks"
						elseif family == "textile" or family == "craft" then
							propGroup, propName = "Town", "workbench-anvil"
						elseif family == "farm" then
							propGroup, propName = "Cargo", "bag"
						else
							propGroup, propName = "Cargo", "box-open"
						end
						-- [항구별 장터] 전용 가판대 원본이 있으면 기존 공방 앞 한 슬롯만 교체한다.
						local stallName = PortScene.cultureSlot(info.portId .. "_stall_" .. good)
						local stall = if lvl >= 2 and AssetIds["Town/" .. stallName]
							then importedModel(folder, "Town", stallName, chosen + Vector3.new(7, 0, 7.4), 5, false)
							else nil
						if stall then
							stall.Name = "CityPortOriginalStall_" .. good
							stall:SetAttribute("PortOriginalStall", stallName)
							stall:SetAttribute("BuildAuthority", "VISUAL_ONLY")
						else
							importedModel(folder, propGroup, propName, chosen + Vector3.new(7, 0, 7.4), 3.2, false)
						end
						importedModel(folder, "Cargo", "box-open", chosen + Vector3.new(-7.6, 0, 7.4), 2.4, false)
						sign(folder, body, SPECIAL_NAME[good] or "특산품 공방",
							C(150, 110, 40), floorCount * 3 + 6, false, { mesh[1], mesh[2] })
					else
						specialtyRejected += 1
					end
				else
					specialtyRejected += 1
				end
				staged:Destroy()
			else
				specialtyRejected += 1
			end
		end
		folder:SetAttribute("CitySpecialtyPlaced", specialtyPlaced)
		folder:SetAttribute("CitySpecialtyRejected", specialtyRejected)
		folder:SetAttribute("CitySpecialtyReflowed", specialtyReflowed)
		folder:SetAttribute("CitySpecialtyBoundaryZ", industryLimitZ)
		folder:SetAttribute("CitySpecialtyBuildingMode", "PRODUCTION_VISUAL_READ_ONLY")
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
			local firewoodSource = info.portId .. "-firewood-01-source"
			if RunService:IsStudio() and AssetIds["Town/" .. firewoodSource] then
				for x = -112, -180, -30 do
					if not one("Town", firewoodSource, 3, x, 0, 7.4) then
						one("Terrain", "log-stack", 3, x, 0, 7.4)
					end
				end
			else
				rowOf("Terrain", "log-stack", 3, -112, -180, 30, 7.4)
			end
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
			-- [런던 광물 하역장] 실제 석탄·주석을 구분하되 다른 항구의 기존 1종 선택 규칙은 유지.
			if info.portId == "london" then
				for index, mineral in { "coal", "tin" } do
					if table.find((port and port.produces) or {}, mineral)
						and AssetIds["Cargo/" .. mineral] then
						local cargo = one("Cargo", mineral, 3.4, 8 + index * 7, 0, lay.freightZ + 9)
						if cargo then cargo:SetAttribute("LocalProduct", mineral) end
					end
				end
			else
				for _, mineral in { "iron", "coal", "tin", "copper", "gold", "silver", "gems" } do
					if table.find((port and port.produces) or {}, mineral) and AssetIds["Cargo/" .. mineral] then
						one("Cargo", mineral, 3.4, 10, 0, lay.freightZ + 9)
						break
					end
				end
			end
			one("Town", "workbench-anvil", 3.4, 2, 0, lay.freightZ + 9)
		end
		-- [런던 조선항] 기존 등록 밧줄 소품을 원자재 필지에 놓고 전용 공장으로 위장하지 않는다.
		if lay.freight and lay.shipyardBuilt then
			local ropeSource = info.portId .. "-rope-twist-02-source"
			local rope = if RunService:IsStudio() and AssetIds["Town/" .. ropeSource]
				then one("Town", ropeSource, 3, -4, 0, lay.freightZ - 12) else nil
			if not rope and info.portId == "london" and AssetIds["Relics/rope-bundle-a"] then
				rope = one("Relics", "rope-bundle-a", 3, -4, 0, lay.freightZ - 12)
			end
			if rope and info.portId == "london" then rope:SetAttribute("LondonHarborRopeSupply", true) end
		end
		-- [지역 특산품 하역] 이 항구가 실제 생산하고 등록된 품목만 원자재 필지에 놓는다.
		-- 주류·담배·약물 시각 자산은 새로 사용하지 않는다.
		if lay.freight then
			-- [런던 실제 부두 창고·등대] 등록된 CC0 실물만 기존 원자재 필지·해안 경계에 설치한다.
			local dockShedAsset = if info.portId == "london" and lvl >= 2
				and AssetIds["Town/london_bld_dock_shed"] then "london_bld_dock_shed" else nil
			if dockShedAsset then
				local shed = one("Town", dockShedAsset, 15, -23, 0, lay.freightZ - 13, true)
				if shed then
					shed.Name = "LondonDockShed"
					shed:SetAttribute("HarborPlot", "freight")
					shed:SetAttribute("BuildAuthority", "VISUAL_ONLY")
				end
			end
			local lighthouseAsset = if info.portId == "london" and lvl >= 3
				and AssetIds["Town/london_bld_lighthouse"] then "london_bld_lighthouse" else nil
			if lighthouseAsset then
				local tower = one("Town", lighthouseAsset, 20, 36, 0, lay.freightZ - 15, true)
				if tower then
					tower.Name = "LondonCoastalLighthouse"
					tower:SetAttribute("HarborPlot", "freight")
					tower:SetAttribute("BuildAuthority", "VISUAL_ONLY")
				end
			end
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
			-- [런던 해안 망루] 실제 자산 번호가 등록된 경우만 승인된 해안 감시탑으로 대체한다.
			local londonTower = info.portId == "london" and AssetIds["Town/london_bld_watchtower"] ~= nil
			one(if londonTower then "Town" else "Naval",
				if londonTower then "london_bld_watchtower" else "tower-watch", 12, 6, 0, lay.fortZ, true)
			-- [런던 4단계 해안 방벽] 승인된 석벽+포대 실물에 대포가 포함되므로 중복 장식을 막는다.
			local londonFortWall = if info.portId == "london" and lvl >= 4
				and AssetIds["Town/london_bld_fort_wall"] then "london_bld_fort_wall" else nil
			if londonFortWall then
				local wall = one("Town", londonFortWall, 24, 14, 0, lay.fortZ, true)
				if wall then
					wall.Name = "LondonHarborFortWall"
					wall:SetAttribute("HarborPlot", "defense")
					wall:SetAttribute("BuildAuthority", "VISUAL_ONLY")
				end
			end
			if lvl >= 3 then
				if not londonFortWall then
					for _, offset in { -9, 9 } do
						one("Naval", "cannon", 3.4, 14, 0, lay.fortZ + offset)
					end
				end
				one("Castle", "flag-banner-long", 9, 2, 0, lay.fortZ)
			end
			if lvl >= 5 then
				one(if londonTower then "Town" else "Naval",
					if londonTower then "london_bld_watchtower" else "tower-watch", 12, 6, 0,
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
			local at = Vector3.new(26 + i * 4.2, 2, 46 + (if i % 2 == 0 then 1.6 else -1.6))
			local barrelSource = info.portId .. "-wood-barrel-source"
			if not (c[1] == "Cargo" and c[2] == "barrel" and RunService:IsStudio()
				and AssetIds["Town/" .. barrelSource] and importedModel(folder, "Town", barrelSource, at, 2.6, false)) then
				importedModel(folder, c[1], c[2], at, 2.6, false)
			end
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
			local benchAt = Vector3.new(x - 14, 0, side * 41.6)
			local benchSource = info.portId .. (if side > 0 then "-column-leg-bench-source" else "-curved-stone-bench-source")
			if not (RunService:IsStudio() and x == -30 and AssetIds["Town/" .. benchSource]
				and importedModel(folder, "Town", benchSource, benchAt, 3.8, false)) then
				importedModel(folder, "Town", "bench_A", benchAt, 3.8, false)
			end
		end
		for x = -20, -160, -10 do
			importedModel(folder, "Town", "fence_straight", Vector3.new(x, 0, side * 130), 8, false)
		end
	end
	importedModel(folder, "Terrain", "campfire-logs", Vector3.new(-80, 0, 30.5), 4, false)

	-- 5) 움직임: 일하는 주민(직업별 모션)과 골목을 오가는 주민
	spawnJobs(folder, info, rng, lvl, walkers, key, houseSpots)
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
	-- [문화권별 대형 입체 원경] 기존 도시 경계·보행·주택 필지는 그대로 두고 바깥의 승인된 지형 메시만 대폭 확대한다.
	-- 발헤임식 지형 높이층과 아노식 도시 발전 실루엣은 배치 원리만 참고한다. 타 게임 모델을 복제하지 않는다.
	local vistaMobile = UserInputService.TouchEnabled
	local rockyCoast = key == "iberia" or key == "italy" or key == "med" or key == "swahili"
		or key == "ottoman" or key == "pacific" or key == "japan" or key == "korea"
	local northernLand = key == "nordic" or key == "hanse" or key == "britain"
		or key == "stone" or key == "north" or key == "france"
	local ridgePool = if northernLand then { "cliff-large-stone", "cliff-steps-rock", "cliff-blockslope-rock" }
		elseif rockyCoast then { "cliff-diagonal-rock", "cliff-cornerinnerlarge-rock", "cliff-large-rock" }
		else { "cliff-blockslope-rock", "cliff-diagonal-rock", "cliff-large-rock" }
	local rimRocks = if lvl >= 4 then 24 else 32
	local ridgePlaced = 0
	local ridgeLimit = if vistaMobile then 8 else 12
	for i = 1, rimRocks do
		local side = if i % 2 == 0 then 1 else -1
		-- [좌우 균형] 짝수에만 절벽을 놓지 않고, 외곽 2~3겹 실루엣을 형성한다.
		local ridge = i % 3 ~= 0 and ridgePlaced < ridgeLimit
		-- [3층 단차] 승인된 절벽 메시를 3개 거리띠의 다른 기슭 높이에 배치한다.
		local ridgeBand = 1 + (math.floor((i - 1) / 2) % 3)
		local at = if ridge then Vector3.new(rng:NextNumber(-620, -170), -2 - ridgeBand * 2,
			side * rng:NextNumber(WZ + 65 + ridgeBand * 45, WZ + 115 + ridgeBand * 55))
			else Vector3.new(rng:NextNumber(-420, -45), 0,
				side * rng:NextNumber(WZ + 26, WZ + 100))
		local rockName = if ridge then ridgePool[(i - 1) % #ridgePool + 1] else "rock-large"
		local rockKind = if ridge then "Terrain" else "Town"
		if AssetIds[rockKind .. "/" .. rockName] then
			local size = if ridge then rng:NextNumber(145, 215) + (if lvl >= 4 then 20 else 0)
				else rng:NextNumber(12, 20)
			local rock = importedModel(folder, rockKind, rockName, at, size, false)
			if rock then
				-- [3층 원근] 기존 지형 모델의 원근 레이어만 지정한다.
				rock:SetAttribute("PortDepthLayer", if ridge then "FAR" else "NEAR")
				if ridge then
					rock.Name = "PortBackdropRidge"
					rock:SetAttribute("BackdropCulture", key)
					rock:SetAttribute("BackdropTier", lvl)
					rock:SetAttribute("PortReliefBand", ridgeBand)
					-- [푸른 대기 원근] 등록 원본 PBR/텍스처는 지키고 무텍스처 메시만 거리별로 톤을 낮춘다.
					for _, stone in rock:GetDescendants() do
						if stone:IsA("BasePart") and stone.MaterialVariant == ""
							and (not stone:IsA("MeshPart") or stone.TextureID == "")
							and not stone:FindFirstChildOfClass("SurfaceAppearance") then
							stone.Color = stone.Color:Lerp(Color3.fromRGB(145, 177, 204), 0.08 + ridgeBand * 0.07)
						end
					end
					ridgePlaced += 1
				end
			end
		end
		if i % 3 == 0 then
			-- [마을-야산 경계] 기존 작은 바위 자리만 지역의 실물 관목으로 교체해 모델 수를 늘리지 않는다.
			local brush = if palm then "plant-bushlargetriangle"
				elseif key == "japan" or key == "china" or key == "korea" then "plant-bushsmall"
				elseif not northernLand then "plant-bushlarge" else nil
			if brush and AssetIds["Terrain/" .. brush] then
				local shrub = importedModel(folder, "Terrain", brush, at + Vector3.new(9, 0, 8), 7, false)
				if shrub then shrub.Name = "PortBackdropUndergrowth" end
			else
				importedModel(folder, "Town", "rock-small", at + Vector3.new(9, 0, 8), 7, false)
			end
		end
	end
	folder:SetAttribute("PortBackdropRidgeCount", ridgePlaced)
	-- [자연 생물군계] 등록·권한 확인된 수목만 기존 외곽 나무 개수에 섞는다.
	-- 북방 침엽수/동아시아 혼합림/열대 야자/서유럽 활엽림으로 수관 높낮이를 구분한다.
	-- [거리별 계절 수관] 기존 3개 수목 슬롯만 유지하며 무료 원본이 등록된 지역에서만 대체한다.
	local detailedTrees = if northernLand then { "tree-pinetallc-detailed", "tree-pinetallb-detailed",
		AssetIds["Terrain/tree-pinetalld-detailed"] and "tree-pinetalld-detailed" or "tree-tall" }
		elseif palm then { "tree-palmbend", "tree-palmdetailedtall", "tree-tall" }
		elseif key == "japan" or key == "china" or key == "korea" then { "tree-plateau", "tree-tall",
		AssetIds["Terrain/tree-detailed-dark"] and "tree-detailed-dark" or "tree-oak-dark" }
		else { "tree-oak-dark", "tree-tall",
		Voyage.season(tonumber(info.day) or 0, (PortData.Ports[info.portId] or {}).lat or 0) == 4 and AssetIds["Terrain/tree-plateau-fall"] and "tree-plateau-fall" or "tree-plateau" }
	local forestCount = if lvl >= 4 then 60 else 94
	local trees = if key == "japan" or cold then { "tree-high", "tree", "tree-crooked" }
		elseif palm then { "palm-detailed-straight", "tree-crooked", "tree-high" }
		else { "tree-high", "tree-crooked", "tree" }
	local canopyPlaced = 0
	for i = 1, forestCount do
		local side = if i % 2 == 0 then 1 else -1
		local at = Vector3.new(rng:NextNumber(-440, -40), 0, side * rng:NextNumber(WZ + 26, WZ + 120))
		local useDetailed = i % (if vistaMobile then 11 else 6) == 0
		local chosen = if useDetailed then detailedTrees[(math.floor(i / (if vistaMobile then 11 else 6)) - 1) % #detailedTrees + 1] else nil
		local pick = if chosen and AssetIds["Terrain/" .. chosen] then chosen else trees[rng:NextInteger(1, #trees)]
		local kind = if chosen and pick == chosen then "Terrain"
			elseif pick:find("palm", 1, true) then "Naval" else "Town"
		local size = if kind == "Terrain" then rng:NextNumber(14, 20) else rng:NextNumber(8, 14)
		local tree = importedModel(folder, kind, pick, at, size, false)
		if tree then
			tree:SetAttribute("PortDepthLayer", "MID")
			if kind == "Terrain" then
				tree.Name = "PortBackdropCanopy"
				tree:SetAttribute("BackdropCulture", key)
				canopyPlaced += 1
			end
		end
	end
	folder:SetAttribute("PortBackdropCanopyCount", canopyPlaced)
	-- [근경/바닥 경계] 승인된 풀·관목·암석을 도시의 외곽에만 배치한다.
	-- 주민 경로, 기존 도로/필지, 생성 난수, 충돌과 경제 수치는 변경하지 않는다.
	local foregroundAssets = {
		{ "grass-large", 13 }, { "plant-bushlarge", 15 },
		{ AssetIds["Terrain/grass-leafs"] and "grass-leafs" or "grass-leafslarge", 12 }, { "Rock_2", 12 },
		{ "coast-grass-patch", 10 }, { "plant-bushlarge", 14 },
	}
	local foregroundPlaced = 0
	local swayingFoliage = {}
	for i = 1, (if vistaMobile then 4 else 8) do
		local entry = foregroundAssets[(i - 1) % #foregroundAssets + 1]
		if AssetIds["Terrain/" .. entry[1]] then
			local side = if i % 2 == 0 then 1 else -1
			-- [전경 가림] 처음 두 수풀은 중심 광장에서 떨어진 양옆 산책로, 나머지는 성벽 바깥.
			local at = if i <= 2 then Vector3.new(-132, 0, side * 116)
				else Vector3.new(-65 - ((i * 53) % 280), 0, side * (WZ + 11 + (i % 3) * 7))
			local model = importedModel(folder, "Terrain", entry[1], at, entry[2], false)
			if model then
				local foliage = entry[1] ~= "Rock_2"
				model.Name = if foliage then "PortForegroundFoliage" else "PortForegroundRock"
				model:SetAttribute("PortDepthLayer", "NEAR")
				model:SetAttribute("PortSway", foliage)
				if foliage and not vistaMobile and #swayingFoliage < 3 then
					table.insert(swayingFoliage, { model = model, rest = model:GetPivot() })
				end
				foregroundPlaced += 1
				-- [바람 먼지] 데스크톱의 앞쪽 두 풀에서만 기존 입자 텍스처를 재사용한다.
				if foliage and not vistaMobile and foregroundPlaced <= 2 then
					local anchor = model:FindFirstChildWhichIsA("BasePart", true)
					if anchor then
						local dust = Instance.new("ParticleEmitter")
						dust.Name = "PortWindDust"
						dust.Texture = "rbxasset://textures/particles/smoke_main.dds"
						dust.Rate = 0.3
						dust.Lifetime = NumberRange.new(1.4, 2.3)
						dust.Speed = NumberRange.new(0.2, 0.7)
						dust.Acceleration = Vector3.new(0.45, 0.12, 0.08)
						dust.Size = NumberSequence.new(0.6, 1.3)
						dust.Transparency = NumberSequence.new(0.65, 1)
						dust.Color = ColorSequence.new(Color3.fromRGB(194, 179, 148))
						dust.Parent = anchor
					end
				end
			end
		end
	end
	folder:SetAttribute("PortBackdropForegroundCount", foregroundPlaced)
	-- [땅 색 경계] 기존 등록 흙길·풀·야생화 실물 메시만 비충돌로 섞는다.
	local terrainPatches = { "ground-pathrocks", "coast-grass-patch", "forest-flower-yellow" }
	local groundPatchesPlaced = 0
	for i = 1, (if vistaMobile then 4 else 9) do
		local asset = terrainPatches[(i - 1) % #terrainPatches + 1]
		if AssetIds["Terrain/" .. asset] then
			local side = if i % 2 == 0 then 1 else -1
			local at = Vector3.new(-135 - i * 28, 0.18, side * (WZ + 10 + (i % 3) * 5))
			local patch = importedModel(folder, "Terrain", asset, at, if asset == "ground-pathrocks" then 10 else 7, false)
			if patch then
				patch.Name = "PortGroundVariation"
				patch:SetAttribute("PortDepthLayer", "NEAR")
				patch:SetAttribute("ShowcaseOnly", true)
				groundPatchesPlaced += 1
			end
		end
	end
	folder:SetAttribute("PortGroundVariationCount", groundPatchesPlaced)
	-- [바람] 기존 승인 수풀 3개 이하만 회전. 모바일·항해 중에는 갱신하지 않는다.
	if #swayingFoliage > 0 then
		local swayAt, swayConn = 0, nil
		swayConn = RunService.Heartbeat:Connect(function()
			if not folder.Parent or folder:GetAttribute("PortSceneActive") ~= true then return end
			local now = os.clock()
			if now < swayAt or workspace:GetAttribute("VoyageActive") then return end
			swayAt = now + 0.22
			for index, target in swayingFoliage do
				if target.model.Parent then
					target.model:PivotTo(target.rest * CFrame.Angles(0, 0, math.sin(now * 0.9 + index) * 0.024))
				end
			end
		end)
		folder.Destroying:Connect(function() swayConn:Disconnect() end)
	end
	-- [마을 발전 실루엣] 기등록된 문화권 적합 실물 건축만 3단계 이후 외곽에 소량 표시한다.
	-- 정식 건물·사업장으로 오인되지 않게 모든 모델은 충돌·경제·저장 없이 배경 전용으로 둔다.
	local vistaBuilding = ({
		iberia = "bell-tower", italy = "bell-tower", med = "bell-tower",
		france = "quaternius_large_simple_tower", britain = "quaternius_pointy_tower",
		stone = "quaternius_pointy_tower", north = "quaternius_watch_tower_wroof",
		nordic = "quaternius_watch_tower_wroof",
		hanse = "quaternius_lg_sq_tower_brick", brick = "quaternius_lg_sq_tower_brick",
		colonial = "bell-tower", creole = "bell-tower",
		japan = "temple-tower", china = "temple-tower",
	})[key]
	local skylinePlaced = 0
	if lvl >= 3 and vistaBuilding and AssetIds["Town/" .. vistaBuilding] then
		local budget = math.min(lvl - 2, if vistaMobile then 2 else 3)
		for i = 1, budget do
			local side = if i % 2 == 0 then 1 else -1
			local at = Vector3.new(-180 - i * 78, 0, side * (WZ + 155 + (i % 2) * 15))
			local model = importedModel(folder, "Town", vistaBuilding, at, 17 + 4 * lvl + i * 3, false)
			if model then
				model.Name = "PortDistantArchitecture"
				model:SetAttribute("BackdropCulture", key)
				model:SetAttribute("BackdropTier", lvl)
				model:SetAttribute("BuildAuthority", "VISUAL_ONLY")
				skylinePlaced += 1
			end
		end
	end
	folder:SetAttribute("PortBackdropArchitectureCount", skylinePlaced)
	-- [기존 외곽 원경 보호] 먼 수목은 원래 수량/범위를 유지한다.
	for i = 1, (if lvl >= 4 then 9 else 14) do
		local at = Vector3.new(-1005 + rng:NextNumber(-16, 16), 0, rng:NextNumber(-WZ, WZ))
		importedModel(folder, "Town", "tree-high", at, rng:NextNumber(8, 12), false)
	end
end

-- 발전도 랜드마크: 레벨 조건을 채운 시설이 자리에 들어선다. 등록된 모델과 기존 house()만 쓴다(새 도형 금지).
local function placeLandmarks(folder, info, style, rng, onFacility, walkers, landmarkSites)
	local lvl = sceneLevel
	local key = styleKeyOf(style)
	local year = (info.sim and info.sim.year) or info.year or 1700
	local adopted = {}
	for _, node in ipairs((info.sim and info.sim.technology and info.sim.technology.rows) or {}) do
		if node.status == "adopted" then adopted[node.id] = true end
	end
	local order = {}
	for i = 1, #landmarkSites do order[i] = i end
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
		local at = landmarkSites[order[idx]]
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
					local species = beasts[k]
					local visual = PortBuildings.AnimalVisual[species]
					local m = importedModel(folder, "Animals", species,
						Vector3.new(x - 9 + (k % 2) * 18, 0, z - 9 + (k // 2) * 14),
						visual.size, false, Color3.fromRGB(table.unpack(visual.coats[(k - 1) % #visual.coats + 1])))
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
	sliceStart = os.clock()
	spanAt, spanFrom, spans = sliceStart, "start", {}
	yieldGapMax, yieldGapAt = 0, ""
	-- [분할 생성 중 화면 유지] 새 항구가 다 만들어질 때까지 기존 항구를 그대로 보여 주고, 교체 직전에 지운다.
	local old = workspace:FindFirstChild("PortScene")
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
	-- [전체 181항구 외형] 문화권 기본형은 유지하면서 항구 ID별로 고정되는 실제 색상·지붕·건물 비례를 만든다.
	-- 새 메시·Part·저장 키는 추가하지 않고 원래 승인된 건축물만 서로 다른 현지 팔레트로 표현한다.
	local style = table.clone(if culture and STYLE[culture] then STYLE[culture] elseif MED[info.portId] then STYLE.med else STYLE.north)
	-- [Luau 레지스터 보호] 항구색 계산 임시값은 장면 생성 후까지 유지하지 않는다.
	do
	local cultureKey = if culture and STYLE[culture] then culture elseif MED[info.portId] then "med" else "north"
	local regionalStyle = STYLE[cultureKey]
	style.cultureKey = cultureKey
	local portLook = PortIdentity.get(info.portId)
	local visualRng = seeded(info.portId .. ":historical-city-palette")
	local wallShade = visualRng:NextNumber(-0.13, 0.13)
	local roofShade = visualRng:NextNumber(-0.12, 0.12)
	local warmTint = visualRng:NextNumber(-0.045, 0.045)
	local wallSignature = portLook and C(portLook.facade[1], portLook.facade[2], portLook.facade[3])
	local roofSignature = portLook and C(portLook.roofTint[1], portLook.roofTint[2], portLook.roofTint[3])
	style.walls, style.roofs = {}, {}
	for i, color in regionalStyle.walls do
		local base = if wallSignature then color:Lerp(wallSignature, 0.52) else color
		local localShade = wallShade * (if i == 1 then 1 else 0.78)
		style.walls[i] = Color3.new(
			math.clamp(base.R * (1 + localShade) + warmTint, 0, 1),
			math.clamp(base.G * (1 + localShade), 0, 1),
			math.clamp(base.B * (1 + localShade) - warmTint, 0, 1))
	end
	for i, color in regionalStyle.roofs do
		local base = if roofSignature then color:Lerp(roofSignature, 0.62) else color
		style.roofs[i] = Color3.new(
			math.clamp(base.R * (1 + roofShade) + warmTint * 0.45, 0, 1),
			math.clamp(base.G * (1 + roofShade), 0, 1),
			math.clamp(base.B * (1 + roofShade) - warmTint * 0.45, 0, 1))
	end
	style.street = regionalStyle.street:Lerp(style.walls[1], 0.09)
	style.sizeMul = (regionalStyle.sizeMul or 1) * visualRng:NextNumber(0.97, 1.03)
	style.roofPitch = regionalStyle.roofPitch * visualRng:NextNumber(0.95, 1.05)
	folder:SetAttribute("CityPortVisualIdentity", info.portId)
	folder:SetAttribute("CityPortVisualCulture", cultureKey)
	folder:SetAttribute("CityPortWallRGB", Vector3.new(
		math.floor(style.walls[1].R * 255 + 0.5), math.floor(style.walls[1].G * 255 + 0.5), math.floor(style.walls[1].B * 255 + 0.5)))
	folder:SetAttribute("CityPortRoofRGB", Vector3.new(
		math.floor(style.roofs[1].R * 255 + 0.5), math.floor(style.roofs[1].G * 255 + 0.5), math.floor(style.roofs[1].B * 255 + 0.5)))
	end
	local rng = seeded(info.portId)
	sceneLevel = math.clamp(math.floor(info.level or 1), 1, 5)
	-- [시뮬 우선] 마을 외형은 실물경제 시뮬의 발전 단계(인구·번영)가 정한다.
	-- 플레이어 항구 투자는 보조: 투자 단계가 시뮬 단계보다 높으면 최대 +1만 더하고, 낮다고 외형을 깎지 않는다.
	if info.sim and type(info.sim.stage) == "number" then
		local simStage = math.clamp(math.floor(info.sim.stage), 1, 5)
		local investBonus = if sceneLevel > simStage then 1 else 0
		sceneLevel = math.clamp(simStage + investBonus, 1, 5)
		folder:SetAttribute("CitySimStage", simStage)
		folder:SetAttribute("CityInvestBonus", investBonus)
	end
	houseTier = sceneLevel
	scenePortId = info.portId
	-- [181개 항구 외형 증거] 기존 문화권·위치·소유·성장 데이터와 독립된 읽기 전용 진단.
	local localFacade, localRoof, localStreet = PortIdentity.appearance(
		info.portId, style.walls[1], style.roofs[1], style.street, Color3)
	folder:SetAttribute("PortUniqueAppearance", info.portId)
	folder:SetAttribute("PortUniqueFacade", localFacade)
	folder:SetAttribute("PortUniqueRoof", localRoof)
	folder:SetAttribute("PortUniqueStreet", localStreet)
	local identity = PortIdentity.get(info.portId)
	if identity then
		folder:SetAttribute("PortIdentityLandmark", identity.landmark.id)
		folder:SetAttribute("PortIdentityLayout", identity.layout)
		folder:SetAttribute("PortIdentityPlaza", identity.plaza)
		folder:SetAttribute("PortIdentityStreet", PortIdentity.streetAt(info.portId, sceneLevel))
		folder:SetAttribute("PortIdentityLamp", identity.lamp)
		folder:SetAttribute("PortIdentityGround", identity.ground)
		folder:SetAttribute("PortIdentityWeather", identity.weatherGround)
		-- 위도 제한 없는 지면 계절: 부산도 겨울 눈길을 볼 수 있도록 복식과 독립해 계산.
		local seasonLatitude = (PortData.Ports[info.portId] or {}).lat or 0
		folder:SetAttribute("PortSeasonWinterGround",
			identity.weatherGround == "snow"
				and Voyage.season(tonumber(info.day) or 0, seasonLatitude) == 1)
	end
	-- [원본 발전도 6단계 연결] Village.portDev(1~6)는 서버 계산 그대로 받는다. 평균값(1~5)이 최고인데
	-- 원본도 6이면 표시 단계 6으로 구별한다. 저장값·발전 계산·기존 1~5 배열 접근은 바뀌지 않는다.
	local sourceLevel = info.development and tonumber(info.development.level)
	cityTier = if sourceLevel and sourceLevel >= 6 and sceneLevel >= 5 then 6 else sceneLevel
	folder:SetAttribute("CitySourceLevel", sourceLevel)
	folder:SetAttribute("CityDisplayTier", cityTier)
	-- [계절 복식] 기존 일자·위도로 겨울만 판단한다. 저장 없이 마을 주민 외관에서만 읽는다.
	local clothingLatitude = (PortData.Ports[info.portId] or {}).lat or 0
	local initialWinterCoat = math.abs(clothingLatitude) >= 39
		and Voyage.season(tonumber(info.day) or 0, clothingLatitude) == 1
	folder:SetAttribute("PortWinterCoat", initialWinterCoat)
	-- [향후 건축 시뮬] 기존 경제 건설·증축 알고리즘을 정본으로 두고, 지금은 도시 외형만 자동 갱신한다.
	folder:SetAttribute("CityBuildingMode", "AUTO_VISUAL_READ_ONLY")
	folder:SetAttribute("CityDevelopmentTier", sceneLevel)
	folder:SetAttribute("CityConstructionCanPurchase", false)
	-- 실제 날씨 데이터가 있을 때만 주민 실물 외투 조건에 전달한다.
	if type(info.weather) == "string" then folder:SetAttribute("PortVisualWeather", info.weather) end
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
	-- [이동·농촌 안전 범위] 바다의 충돌벽과 농촌 안전망은 기존 좌표를 유지하고, 실제 보이는 마을 땅만 따로 축소한다.
	local CITY_LIMIT_Z = 360 + sceneLevel * 80
	currentKey = styleKeyOf(style)
	currentYear = year
	local fac = {}
	for _, k in info.facilities or {} do
		fac[k] = true
	end

	-- [실제 Roblox 지면 규격] 발전도 1~6단계별 작은 Baseplate로 폭·깊이를 직접 조정한다.
	-- 농촌 경계(-1325), 기존 왕궁·항구·이동·저장 구조는 유지하며 새 지면 모델을 만들지 않는다.
	local farLandLeft = -1380 - (cityTier - 1) * 25
	local farLandRight = 20
	local farLandWidth = farLandRight - farLandLeft
	local farLandDepth = 2 * (CITY_LIMIT_Z + 180)
	local farLandCenter = (farLandLeft + farLandRight) * 0.5
	folder:SetAttribute("PortLandWidth", farLandWidth)
	folder:SetAttribute("PortLandDepth", farLandDepth)
	local farGround = style.ground:Lerp(Color3.fromRGB(122, 164, 84), 0.7)
	local plate = workspace:FindFirstChild("Baseplate")
	-- [항구 정체성] 길 밖 땅은 기후에 맞는 재질(풀·모래·진흙·붉은 흙·논)로 보이게 한다.
	local identityGround = (function()
		local id = PortIdentity.get(info.portId)
		return id and identityLook(PortIdentity.GROUND_LOOK[id.ground])
	end)()
	if identityGround then
		farGround = farGround:Lerp(identityGround[2], 0.6)
	end
	if plate then
		plate.Color = farGround
		-- [발전도별 기존 지면 조정] 실제 땅 크기를 1~6단계별로 변경한다.
		plate.Size = Vector3.new(farLandWidth, plate.Size.Y, farLandDepth)
		plate.Position = Vector3.new(farLandCenter, plate.Position.Y, 0)
		plate.Material = if identityGround then identityGround[1] else Enum.Material.SmoothPlastic
	else
		-- 로블록스 기본 Baseplate가 없는 빌드: 항구 땅(서쪽)과 바다 밑바닥을 직접 만든다
		local land = part(folder, Vector3.new(farLandWidth, 4, farLandDepth),
			CFrame.new(farLandCenter, -2, 0), farGround, Enum.Material.SmoothPlastic)
		land.Name = "Ground"
		part(folder, Vector3.new(1400, 4, 1000), CFrame.new(430, -12, 0), Color3.fromRGB(176, 160, 120), Enum.Material.Sand)
	end

	-- 마을 바닥판: 기존 재질 발전은 유지하고, 주거 배치가 확정되면 densify()에서 땅 크기 자체를 다시 줄인다.
	do
		local lvlColor = {
			Color3.fromRGB(176, 146, 104), Color3.fromRGB(170, 158, 140), Color3.fromRGB(160, 156, 150),
			Color3.fromRGB(168, 166, 170), Color3.fromRGB(226, 222, 214),
		}
		-- 도시는 돌길, 목장·밭은 자연 토지로 명확히 분리하여 농촌을 포장도로로 덮지 않는다.
		-- [항구 정체성] 정체성 표가 있는 항구는 마을 바닥을 '길 밖 땅'으로 두고, 길은 strip 으로만 포장한다.
		local floor = part(folder, Vector3.new(650, 0.3, 2 * (CITY_LIMIT_Z + 14)), CFrame.new(-290, 0.02, 0),
			if identityGround then style.ground:Lerp(identityGround[2], 0.55) else style.ground:Lerp(lvlColor[sceneLevel], if sceneLevel <= 1 then 0.8 else 0.65),
			if identityGround then identityGround[1] else roadMat())
		floor.Name = "TownFloor"
		floor.CanCollide = true
		floor.CanQuery = true
		-- [농촌 확장] 왕궁·주거 바닥과 겹치지 않는 서쪽 전용 지형에 목장과 경작지를 모두 수용한다.
		local rural = PortBuildings.RuralPlots
		local farmGround = part(folder, Vector3.new(rural.groundWidth, 0.3, 2 * (CITY_LIMIT_Z + 14)),
			CFrame.new(rural.groundCenterX, 0.02, 0),
			style.ground:Lerp(C(112, 143, 83), 0.55), Enum.Material.Grass)
		farmGround.Name = "RuralGround"
		-- [쌀 재배 항구] 정확한 벼 3D가 없더라도 농촌 지면은 논의 진흙·젖은 토양으로 구분한다.
		local localGoods = (PortData.Ports[info.portId] or {}).produces or {}
		if identity and table.find(localGoods, "rice") then
			farmGround.Material = Enum.Material.Mud
			farmGround.Color = Color3.fromRGB(103, 123, 91)
			farmGround.Reflectance = 0.025
			farmGround:SetAttribute("CityRuralPaddyGround", true)
		end
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
			-- [촬영 항구 해안 지시서] 승인된 기존 해안 바위 메시를 배치하는 bay 분류만 지정한다.
			-- 섬·강 프리미티브를 신설하거나 수변 보행·선박 항로·경제 지형을 수정하지 않는다.
			zanzibar = "bay", calicut = "bay", veracruz = "bay",
			sydney = "bay", cartagena_indias = "bay",
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
	-- [CC0 해안 배경] 등록·검증된 실물 메시만 사용하며 해안 바위 3개와 원경 대형 절벽 3~5개를 배치한다.
	-- 신규 Roblox 자산 번호가 없으면 생략한다. 기존 보행·저장·전투 판정에 영향을 주지 않는다.
	local warmShore = palmOk(info.portId, style)
	local coastalRocks = if warmShore then { "rocks-sand-a", "rocks-sand-b", "rocks-sand-c" } else { "rocks-a", "rocks-b" }
	-- [해안 높이층] 기존 연안 바위 3개를 보존하고 멀리 실제 절벽 3~5개를 크게 띄운다.
	-- 섬·항로 판정은 기존 물·보행 경계가 담당하고 지형은 충돌 없는 승인된 메시만 쓴다.
	local coastCliffs = if warmShore then { "cliff-cornerinnerlarge-rock", "cliff-diagonal-rock" }
		else { "cliff-cornerlarge-stone", "cliff-large-stone" }
	local coastRelief = 0
	for i = 1, (if UserInputService.TouchEnabled then 6 else 8) do
		local highRelief = i >= 4
		local name = if highRelief then coastCliffs[(i - 4) % #coastCliffs + 1] else coastalRocks[(i - 1) % #coastalRocks + 1]
		local group = if highRelief then "Terrain" else "Naval"
		if AssetIds[group .. "/" .. name] then
			local side = if i % 2 == 0 then 1 else -1
			local at = if highRelief then Vector3.new(120 + 32 * i, 0.5, side * (155 + 35 * i))
				else Vector3.new(100 + 27 * i, 0.5, side * (108 + 19 * i))
			local seaRock = importedModel(folder, group, name, at,
				if highRelief then 100 + sceneLevel * 8 + (i - 4) * 10
				else (if warmShore then 19 else 23), false)
			if seaRock then
				seaRock.Name = if highRelief then "DistantCliff_" .. i else "DistantCoast_" .. i
				if highRelief then coastRelief += 1 end
			end
		end
	end
	folder:SetAttribute("PortCoastCliffDepthCount", coastRelief)
	if warmShore and AssetIds["Naval/patch-sand-foliage"] then
		for _, z in { -116, 116 } do
			local patch = importedModel(folder, "Naval", "patch-sand-foliage", Vector3.new(13, 0.1, z), 11, false)
			if patch then patch.Name = "SandyShore" end
		end
	end
	-- [원경 언덕] 기존 CC0 언덕을 좌우 외곽에 2~3겹 낮은 자연 실루엣으로 배치한다.
	-- 마을 경계 밖의 비충돌 장면 전용 모델이라 기존 도로·저장·게임 규칙은 불변.
	if not warmShore and AssetIds["Castle/ground-hills"] then
		for _, side in { -1, 1 } do
			for depth = 1, (if UserInputService.TouchEnabled then 2 else 3) do
				local at = Vector3.new(-350 - depth * 110, -2 - depth * 2,
					side * (CITY_LIMIT_Z + 150 + (depth - 1) * 150))
				local hills = importedModel(folder, "Castle", "ground-hills", at, 155 + depth * 35, false)
				if hills then
					hills.Name = "DistantHills"
					hills:SetAttribute("BackdropLayer", depth)
					hills:SetAttribute("PortDepthLayer", "FAR")
				end
			end
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
	-- [항만 투자와 실물 디테일] 기존 부두 통행판·선박 동선은 그대로 두고
	-- 실제 dock 건설 실적이 허용한 발전 단계부터 승인된 3D 목재 접안 측면·모서리를 표시한다.
	local pierMeshes = 0
	if dockGrowth.tier >= 2 then
		local trimLimit = if UserInputService.TouchEnabled then 2
			elseif dockGrowth.tier >= 4 then 4 else 2
		for i = 1, trimLimit do
			local asset = if i <= 2 then "dock-side" else "dock-corner"
			if AssetIds["Naval/" .. asset] then
				local x = if i <= 2 then 37 + 18 * (i - 1) else 76
				local z = if i % 2 == 0 then 5.9 else -5.9
				local at = Vector3.new(x, 0.9, z)
				local trim = importedModel(folder, "Naval", asset, at, if i <= 2 then 10 else 8, false)
				if trim then
					trim.Name = "HarborInvestedPierMesh"
					trim:SetAttribute("HarborVisualTier", dockGrowth.tier)
					trim:SetAttribute("BuildAuthority", "VISUAL_ONLY")
					trim:SetAttribute("ShowcaseOnly", true)
					pierMeshes += 1
				end
			end
		end
	end
	folder:SetAttribute("HarborInvestedPierMeshCount", pierMeshes)
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
	-- [실촬영 항구 특산물] 별도 검수된 항구 정체성에만 기존 승인된 상품 3D를 추가한다.
	-- 상품·수량·가격·재고·저장 구조에는 관여하지 않는 부두 전시물이며, 없는 원본은 대체하지 않는다.
	if identity then
		cargoModels.wool = "wool"
		cargoModels.coal = "coal"
		cargoModels.tin = "tin"
		cargoModels.spice = "spice"
		cargoModels.porcelain = "porcelain"
		cargoModels.sugar = "sugar"
		cargoModels.silk = "silk"
		cargoModels.saffron = "saffron"
		cargoModels.carpet = "carpet"
		cargoModels.pearls = "pearls"
		cargoModels.cloves = "cloves"
		cargoModels.ivory = "ivory"
		cargoModels.ambergris = "ambergris"
		cargoModels.cinnamon = "cinnamon"
		cargoModels.cotton = "cotton"
		cargoModels.copper = "copper-bars"
		cargoModels.silver = "silver-bars"
		cargoModels.lacquer = "lacquer"
		cargoModels.cochineal = "cochineal"
		cargoModels.vanilla = "vanilla"
		cargoModels.cocoa = "cocoa"
		cargoModels.ginseng = "ginseng"
		cargoModels.rice = "rice"
		cargoModels.sealskin = "sealskin"
		cargoModels.gold = "gold-bars"
		cargoModels.gems = "gems-chest"
	end
	local port = PortData.Ports[info.portId]
	local cargoIndex = 0
	for _, id in (if port then port.produces else {}) do
		-- [모바일 성능] 검증 항구는 최대 4개만 배치하고 기존 다른 항구의 전시는 그대로 둔다.
		if identity and cargoIndex >= 4 then break end
		local mesh = cargoModels[id]
		if mesh and AssetIds["Cargo/" .. mesh] then
			cargoIndex += 1
			local model = importedModel(folder, "Cargo", mesh,
				Vector3.new(25 + cargoIndex * 5, 2, if cargoIndex % 2 == 0 then 3.2 else -3.2), 2.4, false)
			if model then
				model.Name = "TradeCargo_" .. id
				model:SetAttribute("PortShowcaseGoodsId", id)
			end
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
	-- [항구 간판] 클라이언트가 전달한 영문 ID 대신 기존 항구 정본의 현지화 이름을 표시한다.
	sign(folder, gate, (port and port.name or info.portName or info.portId) .. " · " .. dockGrowth.name,
		Color3.fromRGB(150, 110, 40), 7)
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
	-- [항구별 광장] 공통 원형 도형/가짜 분수를 제거하고 진짜 승인 모델 하나만 문화거리에 배치한다.
	-- 중앙 광장은 자유 보행 공간, 부두형·연병장형은 장애물 없는 개방 광장으로 유지한다.
	do
		local plazaKind = if identity then identity.plaza
			elseif folder:GetAttribute("CoastForm") == "canal" or folder:GetAttribute("CoastForm") == "river" then "quay"
			elseif currentKey == "britain" or currentKey == "hanse" or currentKey == "north" then "market"
			elseif currentKey == "colonial" or currentKey == "creole" then "parade"
			else "fountain"
		-- [전체 항구 시민 광장 재배치] 등록된 랜드마크 구역과 반대편으로 이동한다.
		local civicRng = seeded(info.portId .. ":civic-quarter-reposition-v2")
		local reflow = identity and identity.reflow
		local civicOffset = if reflow then reflow.plaza else civicRng:NextInteger(-10, 9)
		local landmarkSide = if (PortData.Ports[info.portId] or {}).shipyard then 1
			elseif reflow then reflow.side elseif civicRng:NextInteger(0, 1) == 0 then -1 else 1
		local civicDepth = if reflow then reflow.lane * 0.5 else civicRng:NextInteger(-6, 6)
		local plazaAt = Vector3.new(-140 + civicOffset * 0.45 + (if reflow then reflow.district * 0.55 else 0), 0, -landmarkSide * (113 + civicDepth))
		-- [문화권 고증] 유럽 노점을 부산·캘리컷 장시로, 유럽식 분수를 오스만 세정시설로 쓰지 않는다.
		local europeanMarket = not identity or info.portId == "london" or info.portId == "rouen"
		-- [항구별 원본 광장] 15항구 전용 승인 원화가 있으면 기존 동일 광장 슬롯에서 우선 사용한다.
		local originalPlaza = PortScene.cultureSlot(info.portId .. "_plaza_center")
		local asset = if sceneLevel < 2 then nil
			elseif originalPlaza and AssetIds["Town/" .. originalPlaza] then originalPlaza
			elseif plazaKind == "market" and europeanMarket then
				(if sceneLevel == 2 then "village-well-cc0" else "village-market-stand-1")
			elseif plazaKind == "fountain" then (if sceneLevel >= 4 then "fountain-round" else "village-well-cc0")
			else nil
		folder:SetAttribute("CityPortPlazaType", plazaKind)
		folder:SetAttribute("CityPortPlazaLocation", plazaAt)
		-- [새 광장 접근로] 기존 도로 시공 함수로 항구 중심 도로에서 새 광장까지 연결한다.
		strip(folder, style, plazaAt.X, plazaAt.Z * 0.5, 9, math.abs(plazaAt.Z) + 15)
		folder:SetAttribute("CityPortPlazaAccessConnected", true)
		if asset and AssetIds["Town/" .. asset] then
			local center = importedModel(folder, "Town", asset, plazaAt,
				if plazaKind == "market" then 8 else 10, false)
			if center then
				center.Name = "CityPortPlazaCenter"
				center:SetAttribute("BuildAuthority", "VISUAL_ONLY")
				center:SetAttribute("PortPlazaType", plazaKind)
				folder:SetAttribute("CityPortPlazaAsset", asset)
				if originalPlaza and asset == originalPlaza then center:SetAttribute("PortOriginalPlaza", originalPlaza) end
			end
		else
			folder:SetAttribute("CityPortPlazaAsset", "OPEN_SQUARE")
		end
	end

	-- [자동 증축 작업] 기존 경제 정본에서 단계가 처음 올라갈 때만 승인된 공사용 실물 메시를 설치한다.
	local previousFacilityGrowth = lastFacilityGrowth[info.portId]
	local currentFacilityGrowth = {}
	local facilityUpgradeAnimations, facilityUpgradeBuilders = 0, 0
	local touchFacility = game:GetService("UserInputService").TouchEnabled
	local facilityAnimationCap = if touchFacility then 1 else 3
	-- [공정별 공사 인력] 실제 고용·주민·시설 발전 단계에서 정해지는 시각 표시 상한.
	local facilityJobs = info.sim and info.sim.jobs
	local facilityWorkers = if info.sim then math.max(0, math.min(
		math.floor(tonumber(info.sim.residents) or 0),
		math.floor(tonumber(facilityJobs and facilityJobs.laborer) or 0)
			+ math.floor(tonumber(facilityJobs and facilityJobs.craftsman) or 0))) else 8
	local facilityBuilderCap = math.min(facilityWorkers,
		if touchFacility then math.min(4, sceneLevel + 1) else math.min(8, sceneLevel * 2))
	-- 시설 건물: { 이름, 탭, 위치, 크기, 벽색 }
	local facilities = {
		{ name = "교역소", tab = "trade", pos = Vector3.new(-12, 0, 36), w = 20, d = 12, floors = 1, color = Color3.fromRGB(176, 120, 60), economy = "market", always = true },
		{ name = "주점", tab = "board", pos = Vector3.new(-12, 0, -36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(120, 76, 44), economy = "tavern", always = true },
		{ name = "항만청", tab = "route", pos = Vector3.new(8, 0, 58), w = 12, d = 10, floors = 2, color = Color3.fromRGB(90, 110, 140), economy = "dock", key = "harbormaster" },
		{ name = "은행", tab = "harbor", pos = Vector3.new(-50, 0, 36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(220, 214, 200), economy = "market", key = "bank" },
		{ name = "상인 길드", tab = "market", pos = Vector3.new(-50, 0, -36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(150, 120, 90), economy = "warehouse", key = "guild" },
		{ name = "학자의 서재", tab = "tech", pos = Vector3.new(-88, 0, 36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(120, 100, 140), economy = "school", always = true },
		{ name = "도서관 (도감)", tab = "codex", pos = Vector3.new(-88, 0, -36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(100, 120, 110), economy = "school", always = true },
	}
	-- [181항구 방문 시설 실제 재배치] 원래 7개 고정 슬롯을 폐기하고
	-- 기존 상호작용 프롬프트와 원본 건물을 포트별 북·남 구역에 새로 배정한다.
	do
		local facilityRng = seeded(info.portId .. ":facility-block-reposition-v2")
		local reflow = identity and identity.reflow
	local facilitySites = {
		Vector3.new(-18, 0, 46), Vector3.new(-18, 0, -46),
		Vector3.new(-49, 0, 46), Vector3.new(-49, 0, -46),
		Vector3.new(-80, 0, 46), Vector3.new(-80, 0, -46),
		Vector3.new(-112, 0, 46),
	}
	local rotation = if reflow then reflow.facility else facilityRng:NextInteger(1, #facilitySites - 1)
	local reflection = if reflow then reflow.side elseif facilityRng:NextInteger(0, 1) == 0 then -1 else 1
	for index, f in facilities do
		local site = facilitySites[(index + rotation - 1) % #facilitySites + 1]
		f.pos = Vector3.new(site.X + facilityRng:NextInteger(-2, 2), 0, site.Z * reflection)
		folder:SetAttribute("CityFacilityPosition_" .. f.tab, f.pos)
	end
	end -- 방문 시설 슬롯 배치 완료, 임시 시드·슬롯 해제
	folder:SetAttribute("CityFacilityLayoutMode", "WHOLE_PORT_REPOSITION_V2")
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
			-- [항구별 방문 시설] 지시서의 <항구>_<시설>_<외형 단계> 정식 키를 모든 항구에서 사용한다.
			-- 기존 경제/해금 판정을 보존한다. 다른 항구 모델을 가져오거나 미등록 모델을 요청하지 않는다.
			local facilityKind = if f.tab == "trade" then "trade" elseif f.tab == "board" then "tavern"
				elseif f.tab == "route" then "harbor" elseif f.tab == "harbor" then "bank"
				elseif f.tab == "market" then "guild" elseif f.tab == "tech" then "scholar" else nil
			local originalFacility = if identity and facilityKind then info.portId .. "_" .. facilityKind .. "_"
				.. tostring(if facilityTier >= 5 then 3 elseif facilityTier >= 3 then 2 else 1) else nil
			if originalFacility then
				folder:SetAttribute("CityPortExpectedFacility_" .. f.tab, originalFacility)
				-- 점령 이후 문화권이 바뀐 항구의 옛 현지 원본은 새 시대의 시설로 자동 승격하지 않는다.
				if culture ~= REGION[info.portId] then
					folder:SetAttribute("CityPortFacilityEraMismatch_" .. f.tab, originalFacility)
					originalFacility = nil
				elseif not AssetIds["Town/" .. originalFacility] then
					folder:SetAttribute("CityPortMissingFacility_" .. f.tab, originalFacility)
					originalFacility = nil
				end
			end
			local signatureAsset = if localArchitecture then nil
				elseif f.name == "학자의 서재" then "quaternius_large_square_tower"
				elseif f.name == "도서관 (도감)" then "temple-stone"
				else nil
			if originalFacility then signatureAsset = originalFacility end
			local signature = signatureAsset and importedModel(folder, "Town", signatureAsset, f.pos,
				math.max(f.w, f.d) * grow * HOUSE_SCALE * (1 + math.max(0, facilityTier - 2) * 0.055),
				true, if originalFacility then nil else tone)
			if originalFacility and not signature then
				folder:SetAttribute("CityPortMissingFacility_" .. f.tab, originalFacility)
			end
			if signature then
				signature.Name = if originalFacility then
					(if info.portId == "london" then "LondonFacility_" else "PortFacility_") .. f.tab
					elseif f.name == "학자의 서재" then "ScholarStudyTower" else "HarborLibraryHall"
				signature:SetAttribute("FacilityIdentity", f.tab)
				if originalFacility then
					signature:SetAttribute("PortOriginalFacility", originalFacility)
					folder:SetAttribute("CityPortAppliedFacility_" .. f.tab, originalFacility)
				end
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
					local scaffoldSource = info.portId .. (if facilityTier >= 4 then "-wall-open-scaffold-source" else "-building-scaffolding-source")
					local scaffold = if RunService:IsStudio() and AssetIds["Town/" .. scaffoldSource]
						then importedModel(folder, "Town", scaffoldSource, at(-14, 4), 6.5, false, nil, delay) else nil
					if not scaffold then
						scaffold = importedModel(folder, "Terrain", "wood-structure", at(-14, 4), 6.5, false, nil, delay)
					end
					if scaffold then
						scaffold.Name = "FacilityUpgradeScaffold_" .. f.tab
						scaffold:SetAttribute("BuildPlotId", info.portId .. ":facility:" .. f.name)
						scaffold:SetAttribute("BuildType", f.economy)
						scaffold:SetAttribute("BuildTier", facilityTier)
						scaffold:SetAttribute("BuildPhase", 2)
						scaffold:SetAttribute("BuildState", "constructing")
						scaffold:SetAttribute("BuildAuthority", "VISUAL_ONLY")
						facilityUpgradeAnimations += 1
						local hasWorkers = facilityBuilderCap > facilityUpgradeBuilders
						if hasWorkers then
							local crewSize = math.min(if touchFacility then 3 else 4,
								facilityBuilderCap - facilityUpgradeBuilders)
							for index = 1, crewSize do
								-- [현장 업무] 골조 망치질, 자재 운반, 목재 다듬기, 완공 점검.
								local workerPos = if index == 1 then at(-12, 6)
									elseif index == 2 then at(-18, 7)
									elseif index == 3 then at(-11, 11) else at(-16, 11)
								local taskKind = if index == 1 then "hammer" elseif index == 2 then "lift"
									elseif index == 3 then "plane" else "inspect"
								local trade = if index == 2 then "laborer"
									elseif index == 3 then "carpenter" else "construction_worker"
								local builder = villager(folder, workerPos, faceTo(workerPos, at(-14, 4)),
									Color3.fromRGB(144, 115, 82), rng, "Barbarian", true,
									{ profession = trade, hat = "cap", year = info.year or currentYear })
								if builder then
									facilityUpgradeBuilders += 1
									builder.Name = "FacilityBuilder_" .. f.tab .. "_" .. index
									builder:SetAttribute("Job", "construction_worker")
									builder:SetAttribute("ConstructionTrade", trade)
									builder:SetAttribute("BuildPlotId", info.portId .. ":facility:" .. f.name)
									builder:SetAttribute("Activity", taskKind)
									builder:SetAttribute("ShowcaseOnly", true)
									local duty = { model = builder, base = builder:GetPivot(), mode = "stay",
										kind = taskKind, phase = rng:NextNumber(0, 5) }
									table.insert(walkers, duty)
									-- [시설 공사] 작업자 삭제 시 대기 중인 공정 연출을 취소한다.
									local builderCleanup
									local builderThread = task.defer(function()
										local deadline = os.clock() + 25
										while builder.Parent and not folder.Parent and os.clock() < deadline do task.wait(0.12) end
										if not folder.Parent or not builder.Parent then builderCleanup:Disconnect() return end
										task.wait(delay + 2.6)
										if builder.Parent then
											duty.kind = "inspect"
											builder:SetAttribute("Activity", "inspect")
											task.wait(1.2)
										end
										builderCleanup:Disconnect()
										if builder.Parent then builder:Destroy() end
									end)
									builderCleanup = builder.Destroying:Once(function()
										if coroutine.status(builderThread) == "suspended" then task.cancel(builderThread) end
									end)
								end
							end
						end
						local scaffoldCleanup
						local scaffoldThread = task.defer(function()
							local deadline = os.clock() + 25
							while scaffold.Parent and not folder.Parent and os.clock() < deadline do task.wait(0.12) end
							if not folder.Parent or not scaffold.Parent then scaffoldCleanup:Disconnect() return end
							task.wait(delay + 3.2)
							scaffoldCleanup:Disconnect()
							if scaffold.Parent then scaffold:Destroy() end
						end)
						scaffoldCleanup = scaffold.Destroying:Once(function()
							if coroutine.status(scaffoldThread) == "suspended" then task.cancel(scaffoldThread) end
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
					local awningSource = info.portId .. (if lv % 2 == 0 then "-awning-02-source" else "-awning-01-source")
					if not (RunService:IsStudio() and AssetIds["Town/" .. awningSource]
						and importedModel(folder, "Town", awningSource, at(0, 3), 10.5, false)) then
						importedModel(folder, "Town", "overhang", at(0, 3), 10.5, false, style.roofs[1])
					end
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
	-- [대형 왕궁] 본관·측랑을 주변 건물보다 확실히 크게 보이도록 확대하되, 기존 왕궁 보호 구역과 동선을 유지한다.
	local palaceCourt = nil
	if fac.palace then
		-- [181항구 왕궁 신배치] 왕궁 본관부터 근위·서고·접견 위치까지 같은 항구 ID를 기준으로 이동.
		local royalLayoutRng = seeded(info.portId .. ":royal-district-reposition-v3")
		local px = -425 + royalLayoutRng:NextInteger(-22, 22)
		local key = currentKey
		local royalSeed = seeded(info.portId .. ":royal-court")
		-- [왕궁 발전별 규모] 1~6 발전 단계마다 가로폭이 확실히 증가한다. 기존 모듈만 재사용한다.
		-- 본관 최대 355스터드, 서측 농장 경계보다 동쪽. 부속 건물은 왕궁 보호 구역 내에 유지한다.
		local scale = 2.08 + (cityTier - 1) * 0.11 + royalSeed:NextNumber(0, 0.02)
		local wide, deep = 134 * scale, 138 * scale
		local tall = 48 + sceneLevel * 12
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
		-- [왕궁 시각 단계] 별관·탑·층수가 기존 경제 발전도에 따라 달라진다(저장값 불변).
		main:SetAttribute("RoyalVisualStage", if palaceTier == 1 then "ROYAL_RESIDENCE"
			elseif palaceTier == 2 then "ROYAL_COURT" elseif palaceTier == 3 then "ROYAL_PALACE"
			elseif palaceTier == 4 then "ROYAL_COMPLEX" else "ROYAL_CAPITAL")
		-- [궁정 건축] 궁전 등급도 기존 발전도와 통일된 표시용 필지 규약으로 공개한다.
		main:SetAttribute("BuildPlotId", info.portId .. ":royal:main")
		main:SetAttribute("BuildType", "palace")
		main:SetAttribute("BuildPhase", 4)
		main:SetAttribute("BuildState", "complete")
		main:SetAttribute("BuildTier", palaceTier)
		main:SetAttribute("BuildAuthority", "VISUAL_ONLY")
		main:SetAttribute("RoyalPlotScale", PortBuildings.RoyalCityPlots.plotScale[sceneLevel])
		local mainRoof = part(folder, Vector3.new(wide + 6, 3.2, deep * 0.77 + 6), CFrame.new(px, tall + 1.6, 0), roofColor, if east or tropical then Enum.Material.WoodPlanks else Enum.Material.Slate)
		-- [본관 실물화] 상자 본체 대신 등록된 모듈 실물 부품으로 문화권별 입면을 조립한다.
		-- 조립에 성공하면 상자·지붕판은 투명한 충돌/발판으로만 남겨 이름·속성·알현 위치를 보존한다.
		local hallSet = if east then { wall = "kenney_wood_wall_01", window = "kenney_wood_window_square_01", door = "kenney_wood_door_01", roof = "kenney_roof_straight_green_01" }
			elseif islamic then { wall = "kenney_grey_wall_01", window = "kenney_grey_arch_01", door = "kenney_grey_door_round_01" }
			elseif indian or southeast or tropical or westAfrican then { wall = "kenney_wood_wall_01", window = "kenney_wood_window_square_01", door = "kenney_wood_door_01", roof = "kenney_roof_straight_red_01" }
			else { wall = "kenney_grey_wall_01", window = "kenney_grey_window_square_01", door = "kenney_grey_door_round_01", roof = "kenney_roof_straight_red_01" }
		local hallFloors = if palaceTier <= 2 then 2 elseif palaceTier <= 4 then 3 else 4
		local hallPieces, hallTop, hallX, hallZ = modularHall(folder, px, 0, wide * 0.92, deep * 0.72, hallFloors, hallSet, baseColor, roofColor)
		main:SetAttribute("RoyalVisualFloors", hallFloors)
		main:SetAttribute("ModularHallPieces", hallPieces)
		-- [부속 건물 역할별 실물 조립] 같은 주택 하나를 반복하지 않고 역할마다 형태를 다르게 조립한다.
		-- 마구간=목조 단층, 근위소=창 적은 좁은 3층(탑형), 서고=창 많은 2층, 행정청=본관과 같은 입면 2층.
		-- 조립 실패 시에만 기존 house()로 짓는다. 이름·위치·상호작용은 그대로.
		local stableSet = { wall = "kenney_wood_wall_01", window = "kenney_wood_wall_01", door = "kenney_wood_door_01",
			roof = if east then "kenney_roof_straight_green_01" else "kenney_roof_straight_red_01" }
		local guardSet = { wall = hallSet.wall, window = hallSet.wall, door = hallSet.door, roof = hallSet.roof }
		local librarySet = { wall = hallSet.window, window = hallSet.window, door = hallSet.door, roof = hallSet.roof }
		local function royalAnnex(name, pos, sx, sz, floors, set, tint)
			local holder = Instance.new("Model")
			holder.Name = name
			holder.Parent = folder
			if modularHall(holder, pos.X, pos.Z, sx, sz, floors, set, tint, roofColor) > 0 then
				return holder
			end
			holder:Destroy()
			local fallback = house(folder, pos, sx, sz, floors, style, royalSeed, tint)
			if fallback then fallback.Name = name end
			return fallback
		end
		if hallPieces > 0 then
			-- [실내 채움] 창·아치 너머가 비어 보이지 않게 기존 본체를 벽 바로 안쪽 크기의 어두운 실내로 쓴다.
			main.Size = Vector3.new(hallX - 1.4, hallTop - 0.4, hallZ - 1.4)
			main.CFrame = CFrame.new(px, (hallTop - 0.4) / 2, 0)
			main.Color = baseColor:Lerp(Color3.new(0, 0, 0), 0.62)
			main.Material = Enum.Material.SmoothPlastic
			mainRoof.Transparency = 1
			mainRoof.CanCollide = false
		end
		for _, side in { -1, 1 } do
			local z = side * (deep * 0.41 + 20)
			local wing = part(folder, Vector3.new(wide * 0.74, tall * 0.72, 30), CFrame.new(px - 8, tall * 0.36, z), baseColor, surface)
			local wingRoof = part(folder, Vector3.new(wide * 0.78, 3.5, 34), CFrame.new(px - 8, tall * 0.72 + 1.5, z), roofColor, Enum.Material.Slate)
			-- [측랑 실물화] 본관 규모에 비례한 넓은 2층 측랑을 같은 문화권 승인 모듈로 조립한다.
			if hallPieces > 0 then
				local wingFloors = if palaceTier >= 4 then 3 else 2
				local wingPieces, wingTop, wingX, wingZ = modularHall(folder, px - 8, z, wide * 0.7, 28, wingFloors, hallSet, baseColor, roofColor)
				if wingPieces > 0 then
					wing.Size = Vector3.new(wingX - 1.4, wingTop - 0.4, wingZ - 1.4)
					wing.CFrame = CFrame.new(px - 8, (wingTop - 0.4) / 2, z)
					wing.Color = baseColor:Lerp(Color3.new(0, 0, 0), 0.62)
					wing.Material = Enum.Material.SmoothPlastic
					wingRoof.Transparency = 1
					wingRoof.CanCollide = false
				end
			end
			-- 지역 양식에 따라 관문 탑·첨탑·누각으로 실루엣을 다르게 한다.
			-- [문화권 탑] 유럽식 성곽 탑은 유럽·지중해 관저에만 둔다(동아시아·이슬람·남아시아·열대 궁정에 붙이지 않음).
			-- 탑 몸체는 기본 파츠 대신 승인된 성곽 탑 실물 부품(기단+창문층)으로 쌓는다.
			local europeanCourt = not (east or indian or southeast or islamic or westAfrican or tropical)
			if palaceTier >= 2 and europeanCourt then
				local zTower = side * (deep * 0.47 + 23)
				local tx = px - wide * 0.34
				-- [높은 왕궁 탑] 3층 본관보다 충분히 높은 승인된 성곽 메시를 기존 탑 위치에만 쌓는다.
				local tbase = importedModel(folder, "Castle", "tower-square-base", Vector3.new(tx, 0, zTower), 26, true, baseColor)
				if tbase then tbase.Name = "RoyalTower" end
				local towerLevels = math.clamp(palaceTier, 2, 4)
				for level = 1, towerLevels do
					importedModel(folder, "Castle", "tower-square-mid-windows", Vector3.new(tx, level * 26, zTower), 26, true, baseColor)
				end
				importedModel(folder, "Castle", "tower-square-top-roof", Vector3.new(tx, (towerLevels + 1) * 26, zTower), 29, false)
			end
			if palaceTier >= 2 then
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
			-- [실측 결함 제거] Town/eastasia-roof 원본은 두께 0.15 평판(RoomRoof)이라 지붕 위에 붉은 판으로만 보였다
			-- (Studio mare-palaces 44970048347). 기와지붕 대체가 아니므로 왕궁에서는 쓰지 않는다(assets-wanted 등록).
			if palaceTier >= 2 then
				for _, z in { -36, -18, 18, 36 } do
					importedModel(folder, "Town", "eastasia-column-base", Vector3.new(facadeX + 12, 0, z), 7, false)
				end
			end
		elseif indian or southeast then
			-- 말라바르 해안과 동남아는 중국식 기와 궁전을 재사용하지 않고 목조 경사 지붕을 사용한다.
			for _, z in { -deep * 0.23, deep * 0.23 } do
				importedModel(folder, "Town", "roof-gable", Vector3.new(px, tall + 3, z), 31, false, roofColor)
			end
		elseif islamic then
			-- [기본 도형 금지] 기본 구체 파츠 돔 3개를 제거한다. 승인된 돔 실물 모델은 assets-wanted에 등록해 확보 후 적용.
			-- 회랑 입구는 승인·등록된 이집트 신전 아치 실물 모델로 정면에 둔다.
			if palaceTier >= 3 then
				for _, z in { -30, 30 } do
					importedModel(folder, "Terrain", "egypt-temple-arch-a", Vector3.new(facadeX + 10, 0, z), 16, false)
				end
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
			-- [실물 부속 건물] 상자·지붕판 대신 지역 양식 주택 실물 모델(house)로 짓는다. 위치·이름은 그대로.
			local stable = royalAnnex("RoyalStable", Vector3.new(px - wide * 0.38, 0, deep * 0.62 + 30), 30, 18, 1, stableSet, C(142, 111, 80))
			importedModel(folder, "Town", "cart", Vector3.new(px - wide * 0.38 - 18, 0, deep * 0.62 + 30), 7, false)
			local guardroom = royalAnnex("RoyalGuardHouse", Vector3.new(px - wide * 0.38, 0, -(deep * 0.62 + 30)), 20, 19, 3, guardSet, baseColor)
		end
		if palaceTier >= 3 then
			-- 정원 분수·정원 벤치와 왕실 학문 서고.
			for _, z in { -38, 38 } do
				importedModel(folder, "Town", "fountain-round", Vector3.new(frontX + 29, 0, z), 10, false)
				importedModel(folder, "Town", "bench_A", Vector3.new(frontX + 38, 0, z + (if z > 0 then 14 else -14)), 5, false)
			end
			local library = royalAnnex("RoyalLibrary", Vector3.new(px - wide * 0.28, 0, deep * 0.62 + 65), 30, 20, 2, librarySet, baseColor)
		end
		if palaceTier >= 4 then
			-- 행정청과 의전 깃발. 관문 폭은 최종 단계까지 보존한다.
			local office = royalAnnex("RoyalAdministration", Vector3.new(px - wide * 0.28, 0, -(deep * 0.62 + 65)), 30, 20, 2, hallSet, baseColor)
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
		sign(folder, main, palaceTitle .. " · " .. courtStyle, C(153, 114, 61),
			if hallPieces > 0 then math.max(36, hallTop * 0.82) else tall * 0.78)
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
			-- [성체 군마] 기마 근위는 사람보다 작은 말이 아닌 실제 성체 실루엣·서로 다른 털색을 쓴다.
			local cavalryHorse = PortBuildings.AnimalVisual.horse
			local coat = Color3.fromRGB(table.unpack(cavalryHorse.coats[if i == 1 then 2 else 4]))
			local horse = if AssetIds["Animals/horse"] then importedModel(folder, "Animals", "horse", at,
				cavalryHorse.size, false, coat) else nil
			local saddleY = 0
			if horse then
				local box, span = horse:GetBoundingBox()
				saddleY = math.max(1.5, box.Position.Y + span.Y * 0.13)
				horse.Name = "RoyalLightCavalryHorse_" .. i
				horse:SetAttribute("ShowcaseOnly", true)
				horse:SetAttribute("AnimalSpecies", "horse")
				horse:SetAttribute("AnimalVisualSize", cavalryHorse.size)
				horse:SetAttribute("AnimalCoatIndex", if i == 1 then 2 else 4)
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
		part(folder, Vector3.new(8, 30, 8), CFrame.new(cx, 15, cz), if style.cultureKey == "med" or style == STYLE.med then Color3.fromRGB(230, 214, 180) else Color3.fromRGB(140, 130, 120), Enum.Material.Brick)
		wedge(folder, Vector3.new(8, 10, 4), CFrame.new(cx, 35, cz - 2), Color3.fromRGB(60, 80, 70))
		wedge(folder, Vector3.new(8, 10, 4), CFrame.new(cx, 35, cz + 2) * CFrame.Angles(0, math.pi, 0), Color3.fromRGB(60, 80, 70))
		part(folder, Vector3.new(16, 14, 24), CFrame.new(cx - 12, 7, cz), if style.cultureKey == "med" or style == STYLE.med then Color3.fromRGB(236, 224, 196) else Color3.fromRGB(150, 140, 128), Enum.Material.Brick)
	end

	-- [항구 풍차] 파츠 조립 가짜 풍차 대신 승인된 완성형 3D 풍차 한 채.
	if info.portId == "amsterdam" or info.portId == "antwerp" or info.portId == "hamburg" then
		if AssetIds["Town/windmill"] then
			local mill = importedModel(folder, "Town", "windmill", Vector3.new(-209, 0, -87), 25, true)
			if mill then mill.Name = "CityHistoricWindmill" end
		end
	end

	-- (수상한 손님은 이제 주점에서 만난다)
	-- 광장 인구는 세계경제 거주자 표본을 그대로 사용한다.
	local plazaStartIndex = #walkers
	-- [현실 주민수] 실제 주민이 없는 항구에 유령 주민을 만들지 않는다.
	local plazaResidents = if info.sim then math.clamp(math.floor(math.max(0, tonumber(info.sim.residents) or 0) / 12), 0, 4) else 4
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
	-- [가축 발 접지] 승인된 실제 항구 바닥·목초지·기본 지면만 사용한다. 동물·소품·보이지 않는 안전판은 제외한다.
	local animalGround = RaycastParams.new()
	local animalFloors = {}
	local baseplate = workspace:FindFirstChild("Baseplate")
	if baseplate and baseplate:IsA("BasePart") then table.insert(animalFloors, baseplate) end
	for _, surface in folder:GetChildren() do
		if surface:IsA("BasePart") and (surface.Name == "Ground" or surface.Name == "TownFloor"
			or surface.Name == "RuralGround" or surface.Name == "OpenPasture" or surface.Name == "PigYard") then
			table.insert(animalFloors, surface)
		end
	end
	animalGround.FilterType = Enum.RaycastFilterType.Include
	animalGround.FilterDescendantsInstances = animalFloors
	animalGround.RespectCanCollide = false
	-- 주민이 광장을 천천히 오간다 (끝에서 몸을 돌려 되돌아온다)
	-- 공식 Motor6D.Transform 적용 시점: Animator 갱신 후, 물리 처리 직전.
	local walkConn = RunService.PreSimulation:Connect(function(deltaTime)
		-- [모바일 최적화] 먼 바다에서 항해하는 동안 항구 주민/가축 관절을 계산하지 않는다.
		-- NPC 시간표는 아래의 절대 시각으로 복귀 즉시 다시 계산하며 게임 상태는 변경하지 않는다.
		if not folder.Parent or workspace:GetAttribute("VoyageActive") then return end
		if folder:GetAttribute("PortSceneActive") ~= true then return end
		local now = os.clock()
		local dt = math.clamp(tonumber(deltaTime) or 1 / 60, 0, 0.1)
		-- [항구 모션 거리] 카메라·거리 기준은 프레임당 한 번만 읽는다. 실측 스튜디오 모션 검사는 보존한다.
		local motionCamera = workspace.CurrentCamera
		local motionEye = motionCamera and motionCamera.CFrame.Position
		local motionRange = if UserInputService.TouchEnabled then 135 else 180
		local fullMotion = RunService:IsStudio() or not motionEye
		for _, w in walkers do
			-- [주민 이동 접지] 생성 시 확인한 발판의 높이를 기준으로 근거리 이동 주민만 분산 질의한다.
			-- 시간표·이동거리·회전의 원래 좌표에는 보정 높이를 누적하지 않는다.
			if w.contactFloorY ~= nil and w.model.Parent then
				local at = w.model:GetPivot().Position
				if (fullMotion or (motionEye - at).Magnitude < motionRange) and now >= w.contactCheckAt then
					w.contactCheckAt = now + 0.20 + (w.phase % 0.10)
					local ground = workspace:Raycast(Vector3.new(at.X, w.contactFloorY + 3, at.Z),
						Vector3.new(0, -6, 0), animalGround)
					if ground and ground.Normal.Y > 0.7 and math.abs(ground.Position.Y - w.contactFloorY) <= 1.25 then
						w.contactTarget = ground.Position.Y - w.contactFloorY
					end
				end
				w.contactOffset += (w.contactTarget - w.contactOffset) * (1 - math.exp(-9 * dt))
			end
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
				-- [Studio QA] 관절 측정 중에 자동 대련 루프가 같은 관절의 위상과 자세를 덮어쓰지 않는다.
				-- 2명 대련 모델에만 적용하며 실제 게임/다른 주민의 모션 갱신은 그대로 유지한다.
				if not (RunService:IsStudio() and folder:GetAttribute("R15MotionProbe") == true) then
					if not Pose.makeR15Action(w.model, action, progress, now) and not w.motionWarned then
						w.motionWarned = true
						warn("[MareEssentia] 항구 R15 대련 모션 적용 실패:", w.model.Name)
					end
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
					-- [개인 하루 흐름] 직업별 시간표와 각자의 시차를 재사용한다.
					-- 집→일터→시장→여가→귀가, 야간 초병·점심휴식까지 실제 위치와 자세가 함께 변한다.
					local hour = game:GetService("Lighting").ClockTime
					local home = w.home or w.morning
					local wakeAt, marketAt = w.wakeAt or 6, w.marketAt or 10
					local marketEnd, homeAt = w.marketEnd or 17, w.homeAt or 22
					local where, routine, route, progress
					local commuteSpan = 0.8
					if w.job == "guard" and (hour >= 22.5 or hour < 4.8) then
						where, routine = w.morning, "night_watch"
					elseif hour < wakeAt then
						where, routine = home, "rest"
					elseif hour < wakeAt + commuteSpan then
						progress = (hour - wakeAt) / commuteSpan
						where, routine, route = home:Lerp(w.morning, progress), "commute", w.morning - home
					elseif hour < marketAt then
						where, routine = w.morning, "work"
					elseif hour < marketAt + commuteSpan then
						progress = (hour - marketAt) / commuteSpan
						where, routine, route = w.morning:Lerp(w.market, progress), "commute", w.market - w.morning
					elseif hour < marketEnd then
						where = w.market
						routine = if hour >= (w.breakAt or 13) and hour < (w.breakAt or 13) + (w.breakSpan or 0.65)
							then "break" else "trade"
					elseif hour < marketEnd + commuteSpan then
						progress = (hour - marketEnd) / commuteSpan
						where, routine, route = w.market:Lerp(w.evening, progress), "commute", w.evening - w.market
					elseif hour < homeAt then
						where, routine = w.evening, "leisure"
					elseif hour < homeAt + commuteSpan then
						progress = (hour - homeAt) / commuteSpan
						where, routine, route = w.evening:Lerp(home, progress), "commute", home - w.evening
					else
						where, routine = home, "rest"
					end
					-- [개인별 골목 폭] 같은 거리에서도 바퀴 자국처럼 미세하게 다른 보행 궤적.
					-- 통로 양 끝점은 고정, 최대 1.3스터드 오프셋만 허용해 건물 침범 방지.
					if route and route.Magnitude > 0.05 and progress then
						local lateral = Vector3.new(-route.Z, 0, route.X).Unit
						where += lateral * math.sin(progress * math.pi) * (w.travelOffset or 0)
					end
					-- [걷기 전환] 시간 동기화가 튀어도 한 프레임에 순간이동하지 않는다.
					local previous = w.lastPos or where
					local alpha = 1 - math.exp(-math.max(2.4, (w.travelPace or 1) * 5) * dt)
					where = previous:Lerp(where, alpha)
					local delta = where - previous
					local moving = delta.Magnitude > 0.025
					-- [마을 주민 정면] 멈춘 사람은 마지막 이동 방향을 유지한다.
					-- 월드 +Z로 강제 회전하면 일부 주민이 앞서 바라보던 방향과 반대로 서게 된다.
					local forward = if moving then delta.Unit else (w.lastFacing or w.base.LookVector)
					if moving then w.lastFacing = forward end
					-- [만남 동선] 둘 다 장터에 멈춰 있고 서로 가까우면 상대를 바라본다.
					local partner = w.socialPartner
					local facingPartner = false
					if not moving and routine == "trade" and partner and partner.model.Parent then
						local other = partner.lastPos or partner.market
						local toward = other - where
						if toward.Magnitude > 0.5 and toward.Magnitude < 12 then
							forward = toward.Unit
							facingPartner = true
						end
					end
					local contact = Vector3.new(0, w.contactOffset or 0, 0)
					w.model:PivotTo(CFrame.lookAt(where + contact, where + forward + contact))
					w.lastPos = where
					if w.lastRoutine ~= routine then
						w.lastRoutine = routine
						w.model:SetAttribute("DailyRoutine", routine)
					end
					-- [근무 소품] 작업·장터·출퇴근에만 보이고 집·주점·휴식에는 숨긴다.
					-- 시각 상태가 바뀔 때만 실제 MeshPart 투명도를 조절해 모바일 프레임당 순회를 피한다.
					local showWorkProp = routine == "work" or routine == "trade" or routine == "commute"
					if w.workProp and w.workProp.Parent and w.workPropVisible ~= showWorkProp then
						w.workPropVisible = showWorkProp
						for _, mesh in w.workProp:GetDescendants() do
							if mesh:IsA("BasePart") then
								mesh.Transparency = if showWorkProp then (mesh:GetAttribute("WorkPropOriginalTransparency") or 0) else 1
							end
						end
					end
					local camera = workspace.CurrentCamera
					if not camera or (camera.CFrame.Position - where).Magnitude < 180 then
						if moving then
							w.travelled = (w.travelled or 0) + delta.Magnitude
							Pose.makeR15Action(w.model, "walk", 0, w.travelled * (2 * math.pi / 5.2))
						else
							local roster = if routine == "work" then w.workKinds
								elseif routine == "trade" then w.tradeKinds
								elseif routine == "leisure" or routine == "break" then w.leisureKinds
								elseif routine == "night_watch" then NIGHT_DUTY else EVENING_REST
							roster = roster or { w.socialKind or "look" }
							local period = math.floor((now + w.phase * 2.1) / (w.activitySpan or 16))
							local kind = roster[((period + (w.personality or 0)) % #roster) + 1]
							if routine == "break" then
								-- [점심 휴식] 개인별 휴식 시간을 맞춰 작업복 상태로 물·식사·이웃 대화.
								local interval = math.floor((now + w.phase) / 5) % 4
								kind = if interval == 0 then "drink" elseif interval == 1 then "talk"
									elseif interval == 2 then "stretch" else "listen"
							end
							if facingPartner then
								-- [인사→거래→반응→작별] 짝끼리 같은 시계로 동작을 맞추되 역할을 나눠 자연스럽게 연출.
								local scene = math.floor(now / 4.2) % 6
								local lead = w.socialLead == true
								kind = if scene == 0 then (if lead then "wave" else "nod")
									elseif scene == 1 then (if lead then "offer" else "receive")
									elseif scene == 2 then (if lead then "bargain" else "inspect")
									elseif scene == 3 then (if lead then "listen" else "talk")
									elseif scene == 4 then (if lead then "clap" else "cheer")
									else (if lead then "talk" else "listen")
							end
							if w.lastActivity ~= kind then w.lastActivity = kind; w.model:SetAttribute("Activity", kind) end
							if w.lastSocialScene ~= facingPartner then
								w.lastSocialScene = facingPartner
								w.model:SetAttribute("SocialInteraction", if facingPartner then "market_meeting" else "none")
							end
							Pose.work(w.model, kind, now + w.phase)
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
					if (w.kind == "talk" or (w.job and w.workKinds)) and w.socialPartner == nil then
						w.socialPartner = false
						for _, other in walkers do
							if other ~= w and other.mode == "stay" and (other.kind == "talk" or other.job) and other.model.Parent
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
						-- [개인 일과] 직업·근무시간·개인별 템포·근처 주민과의 소통을 합친다.
						local hour = game:GetService("Lighting").ClockTime
						local morning = hour >= 5 and hour < 11
						local trading = hour >= 11 and hour < 18
						local night = hour >= 22 or hour < 5
						local watching = w.royalDuty and w.nightKinds and (hour >= 19 or hour < 6)
						local royalDay = w.royalDuty and hour >= 6 and hour < 19
						-- [영업 종료] 고정 시설 직원도 영업시간 이후엔 업무 모션을 멈춘다.
						local offShift = w.districtDuty and (hour < (w.shiftStart or 6) or hour >= (w.shiftEnd or 20))
						local nightWorker = w.job == "guard" or w.job == "sailor" or w.job == "royal_guard"
						local period = math.floor((now + w.phase * 2.1) / (w.activitySpan or 16))
						local nightRoster = if nightWorker then NIGHT_DUTY else NIGHT_REST
						local roster = if offShift then NIGHT_REST elseif watching then w.nightKinds elseif night then nightRoster
							elseif royalDay or morning then w.workKinds
							elseif trading then w.tradeKinds or w.workKinds else w.leisureKinds
						kind = roster[((period + (w.personality or 0)) % #roster) + 1]
						local pulse = (now + w.phase * 3.7) % (w.socialSpan or 39)
						if not watching and not night and not offShift and pulse < 3 and kind ~= "sit" then
							kind = if morning then "stretch" elseif trading then "inspect" else "look"
						end
						-- 인접 주민끼리만 교환 손짓. 경제·재고·저장·실제 관계 판정에는 미관여.
						if partner and partner.model.Parent and not watching and not night and not offShift
							and (trading or not morning) and pulse >= 3 and pulse < 9 then
							local speaker = p0.X < partner.base.Position.X
							kind = if trading then (if speaker then "offer" else "receive")
								else (if speaker then "gossip" else "listen")
						elseif nearGuest and not offShift and (w.job == "merchant" or w.job == "guard" or w.job == "official")
							and pulse >= 9 and pulse < 11 then
							kind = if w.job == "guard" then "salute" else "guide"
						end
						local routine = if offShift then "rest" elseif watching then "night_watch"
							elseif night then (if nightWorker then "night_watch" else "rest")
							elseif royalDay or morning then "work" elseif trading then "trade" else "leisure"
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
					-- 궁정·공방은 멀리 있을 때 인구·직업 속성은 유지하되 관절 업데이트만 생략.
					if not motionEye or (motionEye - p0).Magnitude < motionRange then
						if kind == "stoop" then
							-- 허리를 굽히기만 하는 모션이 이전 인사 자세의 팔을 남기지 않게 초기화.
							Pose.makeR15Action(w.model, "idle", 0, now + w.phase)
						end
						Pose.work(w.model, kind, now + w.phase)
					end
				end
			elseif w.mode == "animal" then
				if w.model.Parent then
					local t = now + w.phase
					local u = if w.span then t * w.rate else 0
					-- [스키 이동 방지] 사지 리그 없는 원본은 통째로 미끄러지게 이동시키지 않는다.
					local hasGait = w.canWalk == true
					local targetD = if w.span and hasGait then math.sin(u) * w.span else 0
					-- 실제 남은 이동량과 몸의 정면이 일치해야 한다. 최초 위치에서 시작해 순간 이동을 막는다.
					local d = w.travelD or 0
					local delta = targetD - d
					local want = if not hasGait then 0 elseif delta < -0.025 then math.pi
						elseif delta > 0.025 then 0 else w.targetHd or 0
					w.targetHd = want
					if not w.headingStarted then
						w.hd, w.headingStarted = want, true
					end
					local turn = math.atan2(math.sin(want - w.hd), math.cos(want - w.hd))
					w.hd += turn * (1 - math.exp(-5.5 * dt))
					-- [뒤돌기/접지] 실제 몸 방향이 반대로 돌아가는 동안 뒷걸음질하거나 미끄러지지 않도록 감속.
					local alignment = if math.abs(turn) < 0.12 then 1 else 0
					if w.span then
						d += delta * (1 - math.exp(-8 * dt)) * alignment
						w.travelD = d
					end
					local walked = math.abs(d - (w.lastD or 0))
					w.lastD = d
					local speed = if dt > 0 then walked / dt else 0
					local moving = hasGait and w.span ~= nil and alignment > 0.25 and speed > 0.08
					if moving then
						w.travelPhase += walked * (2 * math.pi / w.stepSize)
					end
					-- [가축별 생활] 정지 시 먹이·물·정리·휴식·귀 움직임, 이동 중 실제 보행.
					local cycle = (t * 0.56) % 21
					local action
					if not hasGait then action = "rest"
					elseif moving then action = "walk"
					elseif w.akind == "graze" then
						action = if cycle < 5 then "graze" elseif cycle < 8 then "chew"
							elseif cycle < 11 then "look" elseif cycle < 14 then "drink"
							elseif cycle < 17 then "shake" else "rest"
					elseif w.akind == "peck" then
						action = if cycle < 6 then "peck" elseif cycle < 10 then "scratch"
							elseif cycle < 14 then "look" elseif cycle < 18 then "preen" else "rest"
					elseif w.akind == "tail" then
						action = if cycle < 5 then "sniff" elseif cycle < 9 then "wag"
							elseif cycle < 13 then "look" elseif cycle < 17 then "stretch" else "rest"
					else
						action = if cycle < 6 then "look" elseif cycle < 11 then "groom"
							elseif cycle < 16 then "stretch" else "rest"
					end
					if action ~= w.lastAnimalAction then
						w.lastAnimalAction = action
						w.model:SetAttribute("AnimalActivity", action)
					end
					local destination = w.base.Position + w.forward * d
					local close = not motionEye or (motionEye - destination).Magnitude < (if UserInputService.TouchEnabled then 105 else 155)
					-- [지면 접촉] 타일·경사·부두 높이를 0.18초마다 확인하고 실제 높이로 지수 보간한다.
					-- 원본 모델 발-몸통 간격과 축은 그대로 보존한다. 레이캐스트 실패 시 원래 높이를 따른다.
					if close and now >= w.groundCheckAt then
						w.groundCheckAt = now + 0.18 + (w.phase % 0.08)
						local ground = workspace:Raycast(
							Vector3.new(destination.X, w.homeFloor + 7, destination.Z),
							Vector3.new(0, -14, 0), animalGround)
						if ground and ground.Normal.Y > 0.7 and math.abs(ground.Position.Y - w.homeFloor) < 1.4 then
							w.groundTarget = ground.Position.Y - w.homeFloor
						end
					end
					w.groundOffset += (w.groundTarget - w.groundOffset) * (1 - math.exp(-9 * dt))
					-- [접지 보행] 몸 전체를 뒤집지 않고 실제 전진 거리로 작은 체중 이동만 준다.
					local step = w.travelPhase
					local bob = if not hasGait then 0
						elseif moving then math.abs(math.sin(step)) * (if w.akind == "peck" then 0.025 else 0.042)
						elseif action == "peck" then math.sin(t * 5) * 0.009
						elseif action == "shake" then math.sin(t * 9) * 0.013
						else math.sin(t * 1.3) * 0.009
					local pivot = CFrame.new(destination + Vector3.new(0, w.groundOffset + bob, 0))
						* CFrame.Angles(0, w.hd, 0) * w.base.Rotation
					w.model:PivotTo(pivot)
					if close then
						-- [원본 관절] 다리·목·꼬리·귀·날개가 실제로 분리된 가축만 별도 움직임을 준다.
						-- 관절이 없는 단일 FBX 메시는 현재 원형을 보존하고 걷기·접지·회전만 적용한다.
						local swing = if moving then (if w.animalType == "horse" or w.animalType == "donkey" then 0.26
							elseif w.animalType == "dog" or w.animalType == "cat" then 0.30 else 0.20)
							* math.clamp(speed / 2.5, 0.20, 1) else 0
						local nod = if moving then math.sin(step * 2 + 0.4) * 0.035
							elseif action == "graze" or action == "drink" then 0.22 + math.sin(t * 1.5) * 0.08
							elseif action == "peck" then 0.17 + math.max(0, math.sin(t * 5)) * 0.16
							elseif action == "sniff" then 0.14 + math.sin(t * 3) * 0.06
							elseif action == "chew" then math.sin(t * 2.3) * 0.065
							elseif action == "shake" then math.sin(t * 9) * 0.12
							elseif action == "stretch" then -0.14 + math.sin(t * 0.75) * 0.04
							elseif action == "preen" or action == "groom" then -0.10
							elseif action == "rest" then -0.05 else math.sin(t * 0.9) * 0.045
						local headYaw = if action == "shake" then math.sin(t * 9) * 0.14
							elseif action == "look" then math.sin(t * 0.8) * 0.20 else math.sin(t * 0.42) * 0.055
						local wag = if action == "wag" or action == "walk" then math.sin(t * (w.gait or 7)) * 0.30
							else math.sin(t * 1.4) * 0.08
						local blend = 1 - math.exp(-11 * dt)
						local legSwingScale = if w.animalType == "sheep" or w.animalType == "elephant" then 0.65
							elseif w.animalType == "chicken" or w.animalType == "duck" then 0.80 else 0.75
						for _, limb in w.animalJoints do
							local pitch, yaw, roll, footLift = 0, 0, 0, 0
							if limb.kind == "leg" then
								-- [발 접지] 60% 지지·40% 들어 올림. 코사인 완화로 발끝 방향과 착지 충격을 부드럽게 이어준다.
								local gait = ((step + limb.phase) % (math.pi * 2)) / (math.pi * 2)
								if moving then
									local stance = 0.6
									pitch = (if gait < stance then math.cos(gait / stance * math.pi)
										else -math.cos((gait - stance) / (1 - stance) * math.pi)) * swing
									if gait >= stance then
										footLift = math.sin((gait - stance) / (1 - stance) * math.pi)
											* (if w.animalType == "horse" or w.animalType == "dog" then 0.09 else 0.055)
									end
								elseif action == "scratch" then
									pitch = (if limb.side > 0 then 0.23 + math.sin(t * 6.5) * 0.17 else 0)
									footLift = if limb.side > 0 then 0.035 else 0
								elseif action == "stretch" then
									pitch = math.sin(t * 0.7 + limb.phase) * 0.095
								end
							elseif limb.kind == "head" then pitch, yaw = nod, headYaw
							elseif limb.kind == "tail" or limb.kind == "trunk" then yaw = wag * limb.side
							elseif limb.kind == "ear" then roll = math.sin(t * 2.1) * 0.07 * limb.side
							elseif limb.kind == "wing" then roll = if action == "preen" or action == "shake"
							then math.sin(t * 5) * 0.15 * limb.side else 0
							end
							local targetPose
							if limb.legAxis then
								-- 하위 관절은 원본 상대 자세 유지, 상위 본만 몸 좌우축으로 작은 보폭.
								targetPose = CFrame.fromAxisAngle(limb.legAxis, if limb.legChild then 0 else pitch * legSwingScale)
							else
								targetPose = CFrame.new(0, footLift, 0) * CFrame.Angles(pitch, yaw, roll)
							end
							limb.pose = (limb.pose or CFrame.identity):Lerp(targetPose, blend)
							limb.joint.Transform = limb.base * limb.pose
						end
						for _, limb in w.animalParts do
							local pitch, yaw, roll, footLift = 0, 0, 0, 0
							if limb.kind == "leg" then
								-- [발 접지] 60% 지지·40% 들어 올림. 코사인 완화로 발끝 방향과 착지 충격을 부드럽게 이어준다.
								local gait = ((step + limb.phase) % (math.pi * 2)) / (math.pi * 2)
								if moving then
									local stance = 0.6
									pitch = (if gait < stance then math.cos(gait / stance * math.pi)
										else -math.cos((gait - stance) / (1 - stance) * math.pi)) * swing
									if gait >= stance then
										footLift = math.sin((gait - stance) / (1 - stance) * math.pi)
											* (if w.animalType == "horse" or w.animalType == "dog" then 0.09 else 0.055)
									end
								elseif action == "scratch" then
									pitch = (if limb.side > 0 then 0.23 + math.sin(t * 6.5) * 0.17 else 0)
									footLift = if limb.side > 0 then 0.035 else 0
								elseif action == "stretch" then
									pitch = math.sin(t * 0.7 + limb.phase) * 0.095
								end
							elseif limb.kind == "head" then pitch, yaw = nod, headYaw
							elseif limb.kind == "tail" or limb.kind == "trunk" then yaw = wag * limb.side
							elseif limb.kind == "ear" then roll = math.sin(t * 2.1) * 0.07 * limb.side
							elseif limb.kind == "wing" then roll = if action == "preen" or action == "shake"
							then math.sin(t * 5) * 0.15 * limb.side else 0
							end
							if limb.legHinge then
								limb.pose = (limb.pose or CFrame.identity):Lerp(CFrame.fromAxisAngle(limb.legAxis, pitch * legSwingScale), blend)
								limb.part.CFrame = pivot * CFrame.new(limb.legHinge) * limb.pose * CFrame.new(-limb.legHinge) * limb.base
							else
								limb.pose = (limb.pose or CFrame.identity):Lerp(
									CFrame.new(0, footLift, 0) * CFrame.Angles(pitch, yaw, roll), blend)
								-- 별도 메시의 윗부분을 축으로 돌려 발·고개·꼬리가 몸체에서 뜨지 않게 한다.
								limb.part.CFrame = pivot * limb.base * CFrame.new(0, limb.hinge, 0)
									* limb.pose * CFrame.new(0, -limb.hinge, 0)
							end
						end
					end
				end
			elseif w.mode == "circle" then
				if w.model.Parent then
					local a = (now + w.phase) * w.speed / w.r
					-- [아이 발 접지] 분수 주변 달리기의 중심 Y를 바닥(0)이 아닌 최초 R15 리그 중심으로 유지한다.
					local floorY = w.base.Position.Y + (w.contactOffset or 0)
					local pos = Vector3.new(w.cx + math.cos(a) * w.r, floorY, w.cz + math.sin(a) * w.r)
					local hop = 0
					local ahead = Vector3.new(w.cx + math.cos(a + 0.1) * w.r, floorY, w.cz + math.sin(a + 0.1) * w.r)
					w.model:PivotTo(CFrame.lookAt(pos + Vector3.new(0, hop, 0), ahead + Vector3.new(0, hop, 0)))
					if fullMotion or (motionEye - pos).Magnitude < motionRange then
						Pose.makeR15Action(w.model, "walk", 0, (now + w.phase) * w.speed * (2 * math.pi / 5.2))
						-- [아이 생활동작] 걷기 관절은 유지하고 손짓·주변 시선만 드물게 얹는다.
						local play = (now + w.phase * 1.9) % 21
						if play < 1.8 then
							Pose.work(w.model, "wave", now + w.phase, true)
						elseif play < 3.8 then
							Pose.work(w.model, "look", now + w.phase, true)
						end
					end
				end
			elseif w.model.Parent then
				-- [작업 교대] 시설 근로자도 출퇴근 시간에 맞춰 원래 위치에서 휴식한다.
				local hour = game:GetService("Lighting").ClockTime
				local offDuty = (w.goodId and (hour < 6 or hour >= 20))
					or (w.districtJob and (hour < (w.shiftStart or 6) or hour >= (w.shiftEnd or 20)))
				if offDuty then
					if w.districtJob and w.lastRoutine ~= "rest" then
						w.lastRoutine = "rest"
						w.model:SetAttribute("DailyRoutine", "rest")
					end
					w.model:PivotTo(w.base + Vector3.new(0, w.contactOffset or 0, 0))
					if fullMotion or (motionEye - w.base.Position).Magnitude < motionRange then
						Pose.makeR15Action(w.model, "idle", 0, now + w.phase)
						Pose.work(w.model, "stretch", now + w.phase)
					end
				else
				if w.districtJob and w.lastRoutine ~= "work" then
					w.lastRoutine = "work"
					w.model:SetAttribute("DailyRoutine", "work")
				end
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
				local bob = w.contactOffset or 0 -- 지면 높이만 보정하고 걸음 모션의 자체 높이는 보존한다
				w.model:PivotTo(CFrame.new(pos + Vector3.new(0, bob, 0)) * CFrame.Angles(0, yaw, 0) * rot)
				-- [주민 출발·정지] 출발/도착 지점에서 실제로 멈췄으면 제자리 발질을 하지 않는다.
				local walked = math.abs(d - (w.lastD or d))
				w.lastD = d
				moving = moving and walked > 0.006
				if moving then
					w.trav = (w.trav or 0) + walked
				end
				-- 원거리에서도 위치·보행 누적 거리는 유지하고 관절만 생략한다.
				if fullMotion or (motionEye - pos).Magnitude < motionRange then
					if moving then
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
	-- [측정] 실측 최장 프레임(239~246ms)이 3회 모두 같은 지점(조명·대기 설정 직후, 가판대 생성 전)에서 났다.
	-- 원인 구간을 가리려고 조명 설정 전·setDay 후에 한 번씩 양보 지점을 둔다(동작 불변, 프레임 2개).
	sliceStart = 0
	sliceYield("beforeLighting")
	Lighting.GlobalShadows = true
	-- [측광] 기존 해 방향을 유지하고 그림자의 계조만 부드럽게 한다.
	Lighting.ShadowSoftness = 0.32
	local atmos = Lighting:FindFirstChild("MareAtmosphere")
	if not atmos then
		atmos = Instance.new("Atmosphere")
		atmos.Name = "MareAtmosphere"
		atmos.Parent = Lighting
	end
	atmos.Offset = 0.2
	atmos.Decay = Color3.fromRGB(108, 143, 185)
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
	-- [천천히 흐르는 원경 구름] 기존 장면의 구름은 건드리지 않고 전용 구름만 생명주기에 묶는다.
	local skyTerrain = workspace:FindFirstChildOfClass("Terrain")
	local portClouds = nil
	local existingClouds = skyTerrain and skyTerrain:FindFirstChildOfClass("Clouds")
	if skyTerrain and (not existingClouds or existingClouds.Name == "MarePortClouds") then
		if existingClouds then existingClouds:Destroy() end
		portClouds = Instance.new("Clouds")
		portClouds.Name = "MarePortClouds"
		portClouds.Cover = if UserInputService.TouchEnabled then 0.16 else 0.26
		portClouds.Density = 0.24
		portClouds.Color = Color3.fromRGB(235, 241, 249)
		portClouds.Parent = skyTerrain
		folder.Destroying:Connect(function()
			if portClouds.Parent then portClouds:Destroy() end
		end)
	end

	-- 안전망: 어떤 이유로든 바다나 허공으로 떨어지면 광장으로 되돌린다
	do
		local conn
		conn = RunService.Heartbeat:Connect(function()
			-- [항구 생명주기] 분할 생성 중에는 대기하고, 실제 제거 시에만 연결을 해제한다.
			if not folder.Parent or folder:GetAttribute("PortSceneActive") ~= true then return end
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
		folder.Destroying:Connect(function() conn:Disconnect() end)
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
		-- [계절 경계] 겨울 의복만 바뀔 때 기존 NPC 재단복 장착 함수를 호출한다.
		-- 날짜 변경은 드물며, 평소 프레임 루프에는 새 연산을 추가하지 않는다.
		local winterCoat = cold and index == 1
		if folder:GetAttribute("PortWinterCoat") ~= winterCoat then
			folder:SetAttribute("PortWinterCoat", winterCoat)
			for _, subject in folder:GetDescendants() do
				if subject:IsA("Model") and subject:GetAttribute("NpcAssetProfile") then
					Pose.applyRegisteredMobOutfit(subject)
				end
			end
		end
		-- [기존 계절 흐름] 항구 구역과 같은 계절 단계로 눈·거리·주택 연출이 동기화된다.
		folder:SetAttribute("CitySeasonIndex", index)
		folder:SetAttribute("CityWinterRoofTone", if cold and index == 1 then "SNOW" else "REGIONAL_MATERIAL")
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
	sliceStart = 0
	sliceYield("afterSetDay")

	local grade = Lighting:FindFirstChild("MareGrade")
	local bloom = Lighting:FindFirstChild("MareBloom")
	-- [모바일 후처리] 항구에서는 터치 기기의 기존 심도/블룸 모두 비활성화한다.
	if bloom then bloom.Enabled = not UserInputService.TouchEnabled end
	if UserInputService.TouchEnabled then
		for _, effect in Lighting:GetChildren() do
			if effect:IsA("DepthOfFieldEffect") or effect:IsA("BloomEffect") then effect.Enabled = false end
		end
	end
	local rays = Lighting:FindFirstChild("MareRays")
	local lights = {}
	local function registerLight(item)
		if item:IsA("PointLight") then
			table.insert(lights, { light = item, brightness = item.Brightness, range = item.Range })
		end
	end
	for _, item in folder:GetDescendants() do registerLight(item) end
	local lightConn = folder.DescendantAdded:Connect(registerLight)
	local updateAt, cloudUpdateAt = 0, 0
	local climateConn = RunService.Heartbeat:Connect(function()
		if folder:GetAttribute("PortSceneActive") ~= true then return end
		local now = os.clock()
		if now < updateAt then return end
		updateAt = now + 0.10
		-- [날씨 소유권] 항해 장면은 같은 구름을 사용하므로 항구 구름 갱신보다 먼저 중단한다.
		if workspace:GetAttribute("VoyageActive") or workspace:GetAttribute("ShotCF") or workspace:FindFirstChild("FieldScene") then
			if snow and snow.Rate ~= 0 then snow.Rate = 0 end
			return
		end
		-- [원경 구름 움직임] 항구에서만 기존 구름 덮임을 2.5초마다 미세 변화시킨다.
		if portClouds and portClouds.Parent and now >= cloudUpdateAt then
			cloudUpdateAt = now + 2.5
			portClouds.Cover = (if UserInputService.TouchEnabled then 0.16 else 0.26) + math.sin(now / 48) * 0.025
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
		-- [GPU/메모리] 항구에서 제거된 조명을 기존 목록에서 즉시 해제해 반복 갱신을 막는다.
		for index = #lights, 1, -1 do
			local entry = lights[index]
			if not entry.light:IsDescendantOf(folder) then
				table.remove(lights, index)
			else
				entry.light.Brightness = entry.brightness * (0.16 + 2.15 * night)
				entry.light.Range = entry.range * (0.82 + 0.6 * night)
				-- [밤에만 창문 발광] 기존 0.1초 주야 갱신에 편승하며 일반 등불에는 영향을 주지 않는다.
				local window = entry.light.Parent
				if window and window:IsA("BasePart") and window.Name == "CityNightWindow" then
					entry.light.Enabled = night > 0.15
					window.Transparency = math.clamp(0.92 - night * 0.78, 0.14, 0.92)
				end
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
				-- 원래 암석 메시가 누락돼도 구형 Part 대체 금지. 권한 확인된 같은 종류의 실제 연안 암석만 사용.
				local coastRock = if warmShore then "rocks-sand-a" else "rocks-a"
				if AssetIds["Naval/" .. coastRock] then
					importedModel(folder, "Naval", coastRock, Vector3.new(15, 0, z), 7, true)
				end
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
			if folder:GetAttribute("PortSceneActive") ~= true then return end
			local now = os.clock()
			local dt = math.clamp(tonumber(deltaTime) or 1 / 60, 0, 0.1)
			-- [중복 소환 방지] 항해·탐험에서는 항구 동료의 지면 질의와 관절 계산을 멈춘다.
			if workspace:GetAttribute("VoyageActive") or workspace:FindFirstChild("FieldScene") then return end
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


	-- [181항구 실제 랜드마크 재설계] 항구의 8개 위치를 새 고정 시드로 계산한다.
	-- 주택 예약·시가지 충돌 검사와 랜드마크 배치는 같은 8개 좌표를 소비한다.
	do
		local landmarkRng = seeded(info.portId .. ":landmark-sites-reposition-v3")
		local reflow = identity and identity.reflow
		local shiftX = if reflow then reflow.landmarkX else landmarkRng:NextInteger(-5, 5)
		local shiftZ = if reflow then reflow.landmarkZ else landmarkRng:NextInteger(-5, 5)
		local landmarkSites = {}
		for i, oldSite in LM_SITES do
			landmarkSites[i] = Vector3.new(oldSite.X + shiftX, 0,
				oldSite.Z + (if oldSite.Z > 0 then shiftZ else -shiftZ))
		end
		folder:SetAttribute("CityLandmarkReflowCount", #landmarkSites)
		densify(folder, info, style, rng, walkers,
			(PortData.Ports[info.portId] and PortData.Ports[info.portId].produces) or {},
			onFacility, landmarkSites)
		placeLandmarks(folder, info, style, rng, onFacility, walkers, landmarkSites)
	end
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

	-- [광장 실제 점유] 중심점뿐 아니라 회전된 경계의 광장 가장자리 침범도 검사한다.
	-- 기존 중심점 제거 정책은 유지하고, 가장자리의 필수 시설/본체는 삭제하지 않고 별도 진단한다.
	local plazaRemoved, plazaEdgeBlocked = 0, 0
	for _, obj in folder:GetChildren() do
		if obj:IsA("Model") and not obj:FindFirstChildOfClass("Humanoid") and not obj:FindFirstChildOfClass("AnimationController") then
			local ok, box, ext = pcall(obj.GetBoundingBox, obj)
			if ok and box and ext then
				local dx, dz = box.Position.X + 6, box.Position.Z
				local radius2 = CENTRAL_PLAZA_RADIUS * CENTRAL_PLAZA_RADIUS
				if dx * dx + dz * dz < radius2 then
					obj:Destroy()
					plazaRemoved += 1
				else
					local hx = (math.abs(box.RightVector.X) * ext.X + math.abs(box.UpVector.X) * ext.Y
						+ math.abs(box.LookVector.X) * ext.Z) * 0.5
					local hz = (math.abs(box.RightVector.Z) * ext.X + math.abs(box.UpVector.Z) * ext.Y
						+ math.abs(box.LookVector.Z) * ext.Z) * 0.5
					local nearX, nearZ = math.max(0, math.abs(dx) - hx), math.max(0, math.abs(dz) - hz)
					if nearX * nearX + nearZ * nearZ < radius2 then
						if obj.Name == "HarborRoofDetail" or obj.Name == "HarborWindowDetail"
							or obj.Name == "HarborChimney" or obj.Name == "HarborBalcony"
							or obj.Name == "CityCulturalHouseFront" or obj.Name == "CityMerchantRoofGrowth" then
							obj:Destroy()
							plazaRemoved += 1
						else
							plazaEdgeBlocked += 1
						end
					end
				end
			end
		end
	end
	folder:SetAttribute("CentralPlazaRemovedStructures", plazaRemoved)
	folder:SetAttribute("CentralPlazaEdgeCandidates", plazaEdgeBlocked)
	sliceMark("beforeDestroyOld")
	-- [교체 분할] 실측(44926863645): 기존 항구 한 번에 삭제 529ms + 새 항구 한 번에 workspace 연결 584ms가
	-- 같은 프레임에 몰려 최대 1.46초 멈춤. 최상위 묶음 단위로 나눠 프레임 예산 안에서 지우고 붙인다.
	-- (양보할 수 없는 문맥에서는 sliceYield가 그대로 진행해 기존처럼 한 번에 처리된다.)
	-- [삭제 방식 원복] 강제 프레임 양보(500·1500개 단위) 시험은 프레임마다 엔진 해제 비용이 커서 전체 전환이
	-- 길어져 정밀검사 233단계(4초 대기)를 넘겼다(44968230194, 44969891132). 기존 최상위 묶음 단위 삭제로 되돌린다.
	if old and old.Parent then
		-- [이전 항구 정리] 분할 삭제 중에는 이전 장면의 모션·조명·낙하 복구를 멈춘다.
		old:SetAttribute("PortSceneActive", false)
		local destroyedCount = #old:GetDescendants()
		for _, child in old:GetChildren() do
			child:Destroy()
			sliceYield("destroyOld")
		end
		old:Destroy()
		folder:SetAttribute("PortOldDestroyedInstances", destroyedCount) -- 측정용(판정·저장 무관)
	end
	sliceMark("destroyOld")
	-- 새 항구는 빈 폴더를 먼저 연결하고, 묶음을 차례로 옮겨 붙인다(렌더·물리 등록 비용 분산).
	local staged = folder:GetChildren()
	local holder = Instance.new("Folder")
	for _, child in staged do child.Parent = holder end
	folder.Parent = workspace
	for _, child in staged do
		child.Parent = folder
		sliceYield("parentToWorkspace")
	end
	holder:Destroy()
	-- 모든 모델을 배치한 뒤 새 장면의 모션·조명·낙하 복구를 시작한다.
	folder:SetAttribute("PortSceneActive", true)
	sliceMark("parentToWorkspace")

	-- [오브젝트 겹침 정리 · 2026-11-28 오너: "오브젝트 겹치고 항구마다 개판"]
	-- 이전에는 마을을 workspace 밖에서 지은 뒤 겹침 검사를 해서 아무것도 못 찾았다(공간 질의는 workspace 안에서만 동작).
	-- 이제 연결된 직후 한 번: ① 자동 슬롯 모델 겹침 피하기 ② 땅에 놓인 작은 소품(통·상자·수레·가판·나무 등)이
	-- 큰 건물 안에 박혀 있으면 주변 8스터드 안 빈자리로 옮기고, 빈자리가 없으면 숨긴다. 건물·상징물·주민은 옮기지 않는다.
	local propOk, propError = pcall(function()
		local okOv, Overrides = pcall(function() return require(script.Parent:WaitForChild("PlacementOverrides", 3)) end)
		if okOv and Overrides and Overrides.flush then Overrides.flush() end
		local params = OverlapParams.new()
		params.FilterType = Enum.RaycastFilterType.Include
		params.FilterDescendantsInstances = { folder }
		local SKIP = { "sign", "lantern", "lamp", "chimney", "roof", "window", "door", "balcony", "detail",
			"flag", "banner", "landmark", "palace", "castle", "wall", "house", "temple", "church", "tower",
			"ship", "boat", "pier", "dock", "bridge", "fence", "stall", "market", "display", "workshop",
			"well", "fountain", "statue", "interior", "furniture", "counter", "shelf" }
		local function skipName(name)
			local l = string.lower(name)
			for _, k in SKIP do
				if string.find(l, k, 1, true) then return true end
			end
			return false
		end
		local function embedded(prop, cf, size)
			local bottom = cf.Position.Y - size.Y / 2
			local box = CFrame.new(cf.Position.X, bottom + math.min(size.Y, 4) / 2 + 0.3, cf.Position.Z)
			local probe = Vector3.new(math.max(1, size.X * 0.6), math.max(1, math.min(size.Y, 4) - 0.6), math.max(1, size.Z * 0.6))
			for _, hit in workspace:GetPartBoundsInBox(box, probe, params) do
				if not hit:IsDescendantOf(prop) and hit.Anchored and hit.Transparency < 0.9
					and hit.Size.Y >= 6 and hit.Size.X >= 6 and hit.Size.Z >= 6 then
					local l = string.lower(hit.Name)
					if not (string.find(l, "ground", 1, true) or string.find(l, "floor", 1, true)
						or string.find(l, "water", 1, true) or string.find(l, "road", 1, true)
						or string.find(l, "plaza", 1, true) or string.find(l, "terrain", 1, true)) then
						local owner = hit:FindFirstAncestorOfClass("Model")
						if not (owner and owner:FindFirstChildOfClass("Humanoid")) then return true end
					end
				end
			end
			return false
		end
		local moved, hidden, checked = 0, 0, 0
		local propBoxes, propSpread, propStackHidden = {}, 0, 0
		for _, child in folder:GetChildren() do
			if child:IsA("Model") and not child:FindFirstChildOfClass("Humanoid") and not skipName(child.Name) then
				local okBox, cf, size = pcall(function() return child:GetBoundingBox() end)
				if okBox and math.max(size.X, size.Z) <= 12 and size.Y <= 14 then
					checked += 1
					if embedded(child, cf, size) then
						local fixed = false
						for _, d in { Vector3.new(4, 0, 0), Vector3.new(-4, 0, 0), Vector3.new(0, 0, 4), Vector3.new(0, 0, -4),
							Vector3.new(8, 0, 0), Vector3.new(-8, 0, 0), Vector3.new(0, 0, 8), Vector3.new(0, 0, -8) } do
							if not embedded(child, cf + d, size) then
								child:PivotTo(child:GetPivot() + d)
								child:SetAttribute("PropOverlapNudge", tostring(d))
								moved += 1
								fixed = true
								break
							end
						end
						if not fixed then
							child:SetAttribute("PropOverlapHidden", true)
							child.Parent = nil -- 건물 속에 박힌 장식만 뺀다(저장·경제·충돌벽 무관)
							hidden += 1
						end
					end
					-- [소품끼리 겹침 · 2026-11-29 오너: "오브젝트 겹침"] 깔개 위 의자, 상자 속 상자처럼 작은 소품끼리
					-- 바닥 면적이 40% 넘게 겹치면 뒤에 놓인 쪽을 옆 빈자리로 옮기고, 자리가 없으면 뺀다.
					if child.Parent then
						local p = child:GetPivot().Position
						local hx, hz = size.X * 0.5, size.Z * 0.5
						local function clash(cx: number, cz: number)
							for _, o in propBoxes do
								local ox = math.min(cx + hx, o[1] + o[3]) - math.max(cx - hx, o[1] - o[3])
								local oz = math.min(cz + hz, o[2] + o[4]) - math.max(cz - hz, o[2] - o[4])
								if ox > 0 and oz > 0 and ox * oz > 0.4 * math.min(4 * hx * hz, 4 * o[3] * o[4]) then return true end
							end
							return false
						end
						if clash(p.X, p.Z) then
							local placed = false
							for _, d in { Vector3.new(hx * 2 + 1, 0, 0), Vector3.new(-hx * 2 - 1, 0, 0),
								Vector3.new(0, 0, hz * 2 + 1), Vector3.new(0, 0, -hz * 2 - 1) } do
								if not clash(p.X + d.X, p.Z + d.Z) and not embedded(child, cf + d, size) then
									child:PivotTo(child:GetPivot() + d)
									p += d
									placed = true
									propSpread += 1
									break
								end
							end
							if not placed then
								child:SetAttribute("PropStackHidden", true)
								child.Parent = nil
								propStackHidden += 1
							end
						end
						if child.Parent then table.insert(propBoxes, { p.X, p.Z, hx, hz }) end
					end
				end
			end
		end
		folder:SetAttribute("PropSpread", propSpread)
		folder:SetAttribute("PropStackHidden", propStackHidden)
		-- [같은 소품 개수 제한 · 2026-11-29 오너: "소품도 같은 종류 오브젝트 개수 제한"]
		-- 같은 원본(ImportedAsset)이 한 항구에 너무 많으면 광장에서 먼 것부터 뺀다.
		-- 건물(Town·Castle)·사람·동물·배는 대상 아님. 나무·풀 같은 자연물은 넉넉히, 통·상자 등 소품은 6개까지.
		local CAP_PROP, CAP_NATURE = 6, 14
		local byAsset = {}
		for _, child in folder:GetChildren() do
			local key = child:IsA("Model") and child:GetAttribute("ImportedAsset")
			if type(key) == "string" then
				local kind = string.match(key, "^([^/]+)/")
				if kind ~= "Town" and kind ~= "Castle" and kind ~= "People" and kind ~= "Animals" and kind ~= "Naval"
					and not child:FindFirstChildOfClass("Humanoid") and not skipName(child.Name) then
					byAsset[key] = byAsset[key] or {}
					table.insert(byAsset[key], child)
				end
			end
		end
		local capped = 0
		for key, list in byAsset do
			local lower = string.lower(key)
			local nature = string.find(lower, "tree", 1, true) or string.find(lower, "bush", 1, true)
				or string.find(lower, "grass", 1, true) or string.find(lower, "plant", 1, true)
				or string.find(lower, "rock", 1, true) or string.find(lower, "flower", 1, true)
			local cap = if nature then CAP_NATURE else CAP_PROP
			if #list > cap then
				table.sort(list, function(a, b)
					local pa, pb = a:GetPivot().Position, b:GetPivot().Position
					return (pa.X + 6) ^ 2 + pa.Z ^ 2 < (pb.X + 6) ^ 2 + pb.Z ^ 2
				end)
				for i = cap + 1, #list do
					list[i]:SetAttribute("PropCapHidden", key)
					list[i].Parent = nil
					capped += 1
				end
			end
		end
		folder:SetAttribute("PropCapHidden", capped)
		folder:SetAttribute("PropOverlapChecked", checked)
		folder:SetAttribute("PropOverlapMoved", moved)
		folder:SetAttribute("PropOverlapHidden", hidden)
	end)
	folder:SetAttribute("PropOverlapAudit", if propOk then "PASS" else "FAIL:" .. tostring(propError))
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
				-- 비충돌 승인 가판대와 특산품도 주민이 시각적으로 관통하지 않도록 기존 생성 직후 검사에 포함한다.
				local visualMarket = hit:FindFirstAncestor("CityMarketStall") ~= nil
					or (owner and string.find(owner.Name, "MarketSpecialtyDisplay_", 1, true) == 1)
				-- [관통 방지 · 2026-11-28 오너: "주민들 동선 끼임"] 충돌을 끈 장식 건물·나무 줄기도 눈에 보이면 막힘으로 본다.
				local lname = string.lower(hit.Name)
				local flatName = string.find(lname, "water", 1, true) or string.find(lname, "sea", 1, true)
					or string.find(lname, "canal", 1, true) or string.find(lname, "road", 1, true)
					or string.find(lname, "street", 1, true) or string.find(lname, "path", 1, true)
					or string.find(lname, "plaza", 1, true) or string.find(lname, "grass", 1, true)
					or string.find(lname, "soil", 1, true) or string.find(lname, "furrow", 1, true)
					or string.find(lname, "floor", 1, true) or string.find(lname, "ground", 1, true)
				local visualSolid = not hit.CanCollide and not flatName and hit.Transparency < 0.6
					and hit.Size.Y >= 3 and hit.Size.X >= 1.2 and hit.Size.Z >= 1.2
				if (hit.CanCollide or visualMarket or visualSolid) and hit.Name ~= "Ground" and hit.Name ~= "TownFloor"
					and hit.Name ~= "SafetyFloor" and hit.Size.Y >= (if visualMarket then 0.5 else 2)
					and not (actor and hit:IsDescendantOf(actor))
					and not (owner and owner:FindFirstChildOfClass("Humanoid")) then
					return true
				end
			end
			return false
		end
		local relocated, stopped, inspected = 0, 0, 0
		-- [주민끼리 겹침 방지] 제자리 주민은 서로 2.4스터드 안에 서지 않는다(한 몸에 두 사람 겹침 방지).
		local claimed = {}
		local function crowded(pos)
			for _, other in claimed do
				local d = other - pos
				if d.X * d.X + d.Z * d.Z < 2.4 * 2.4 then return true end
			end
			return false
		end
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
					-- [집-직장-시장-여가-집] 주거 경유지까지 한 번에 장애물 검사·위치 보정한다.
					local home = (walker.home or walker.morning) + offset
					local morning, market, evening = walker.morning + offset, walker.market + offset, walker.evening + offset
					local function clearSegment(a, b)
						local step = b - a
						return step.Magnitude < 0.01 or not blocked(CFrame.lookAt(a, b), step.Magnitude, walker.model)
					end
					if not blocked(CFrame.new(home), 0, walker.model)
						and not blocked(CFrame.new(morning), 0, walker.model)
						and not blocked(CFrame.new(market), 0, walker.model)
						and not blocked(CFrame.new(evening), 0, walker.model)
						and clearSegment(home, morning) and clearSegment(morning, market)
						and clearSegment(market, evening) and clearSegment(evening, home) then
						safe = candidate
						walker.home, walker.morning, walker.market, walker.evening = home, morning, market, evening
						break
					end
				elseif not blocked(candidate, if moving then walker.len else 0, walker.model)
					and (moving or not crowded(candidate.Position)) then
					safe = candidate
					break
				end
			end
			if not safe then
				-- 이동 경로가 막혔으면 빈 정지 위치를 찾고, 그것도 없으면 시각 NPC만 숨긴다.
				for _, offset in offsets do
					local candidate = original + offset
					if not blocked(candidate, 0, walker.model) and not crowded(candidate.Position) then
						safe = candidate
						walker.mode, walker.kind = "stay", "look"
						stopped += 1
						break
					end
				end
			end
			if safe then
				if not (moving or scheduled or circling) or walker.mode == "stay" then table.insert(claimed, safe.Position) end
				if (safe.Position - original.Position).Magnitude > 0.1 then relocated += 1 end
				walker.base = safe
				-- [주민 첫 화면] 항구 재입장 시 게임 시각에 맞는 일터·시장·집에서 출발한다.
				-- 기존 경로 검사에 통과한 위치만 재사용하며 추가 인스턴스는 생성하지 않는다.
				local startAt = safe.Position
				if walker.mode == "schedule" then
					local hour = game:GetService("Lighting").ClockTime
					local wakeAt, marketAt = walker.wakeAt or 6, walker.marketAt or 10
					local marketEnd, homeAt = walker.marketEnd or 17, walker.homeAt or 22
					startAt = if walker.job == "guard" and (hour >= 22.5 or hour < 4.8) then walker.morning
						elseif hour < wakeAt then walker.home
						elseif hour < marketAt then walker.morning
						elseif hour < marketEnd then walker.market
						elseif hour < homeAt then walker.evening else walker.home
				end
				-- [원형 동선 시작점] 첫 프레임 전에 분수 중심이 아닌 검증된 원 바깥 첫 발판에 놓는다.
				if walker.mode == "circle" then
					walker.model:PivotTo(CFrame.new(walker.cx + walker.r, safe.Position.Y, walker.cz) * (safe - safe.Position))
				else
					walker.model:PivotTo(CFrame.new(startAt) * (safe - safe.Position))
				end
				-- [주민 최초 접지] 실제 회전된 양발 최저점과 승인된 바닥의 차이만 보정한다.
				-- 기마·착석·높은 작업대와 대련은 원래 위치를 보존한다.
				if walker.mode ~= "royal_rider" and walker.kind ~= "sit" then
					local left = walker.model:FindFirstChild("LeftFoot")
					local right = walker.model:FindFirstChild("RightFoot")
					if left and right and left:IsA("BasePart") and right:IsA("BasePart") then
						local bottom = math.huge
						for _, foot in { left, right } do
							local cf, half = foot.CFrame, foot.Size * 0.5
							bottom = math.min(bottom, cf.Position.Y - math.abs(cf.RightVector.Y) * half.X
								- math.abs(cf.UpVector.Y) * half.Y - math.abs(cf.LookVector.Y) * half.Z)
						end
						local at = walker.model:GetPivot().Position
						local ground = workspace:Raycast(Vector3.new(at.X, bottom + 1.5, at.Z),
							Vector3.new(0, -3, 0), animalGround)
						if ground and ground.Normal.Y > 0.7 and math.abs(ground.Position.Y - bottom) <= 0.75 then
							local lift = Vector3.new(0, ground.Position.Y - bottom + 0.015, 0)
							walker.model:PivotTo(walker.model:GetPivot() + lift)
							walker.base += lift
							startAt += lift
							if scheduled then
								walker.morning += lift
								walker.market += lift
								walker.evening += lift
								if walker.home then walker.home += lift end
							end
							if moving or scheduled or circling then
								walker.contactFloorY = ground.Position.Y
								walker.contactOffset, walker.contactTarget = 0, 0
								walker.contactCheckAt = 0
							end
						end
					end
				end
				walker.lastPos = startAt
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

	-- [주민 직업 실물 장비] People·Cargo·Relics 등록 경로 그대로 활용하며 최종 인입 시 누락 부착만 재검사한다.
	do
		local shelf = ReplicatedStorage:FindFirstChild("MareAssets")
		local people = shelf and shelf:FindFirstChild("People")
		if people then
			local queued, refreshReady = false, false
			local outfitThread
			local function refreshOutfits(includeReady)
				-- [자산 지연 입고] 원래 완성된 주민도 승인된 신규 머리/장신구 도착 때 재선택한다.
				-- 기존 0.08초 배치와 원본 R15 착용 함수를 재사용한다.
				if folder:GetAttribute("PortSceneActive") ~= true then return end
				if includeReady == true then refreshReady = true end
				if queued then return end
				queued = true
				outfitThread = task.delay(0.08, function()
					outfitThread = nil
					queued = false
					if not folder.Parent or folder:GetAttribute("PortSceneActive") ~= true then return end
					local includeCompleted = refreshReady
					refreshReady = false
					for _, subject in folder:GetDescendants() do
						if subject:IsA("Model") and subject:GetAttribute("NpcAssetProfile")
						and (includeCompleted or subject:GetAttribute("NpcAppearanceState") ~= "ready") then
							Pose.applyRegisteredMobOutfit(subject)
						end
					end
				end)
			end
			local outfitConn = people.ChildAdded:Connect(function(asset)
				if not asset:IsA("Model") or not AssetIds["People/" .. asset.Name] then return end
				if not (string.find(asset.Name, "peasant", 1, true) or string.find(asset.Name, "ranger", 1, true)
					or string.sub(asset.Name, 1, 5) == "hair_" or string.sub(asset.Name, 1, 4) == "acc_"
					or string.sub(asset.Name, 1, 7) == "outfit_") then return end
				refreshOutfits(string.sub(asset.Name, 1, 5) == "hair_"
					or string.sub(asset.Name, 1, 4) == "acc_")
			end)
			-- [직업용 장비] Cargo·Relics 원본이 늦게 도착해도 기존 주민에게 다시 장착한다.
			local gearConns = {}
			for kind in { Cargo = true, Relics = true } do
				local group = shelf:FindFirstChild(kind)
				if group then
					table.insert(gearConns, group.ChildAdded:Connect(function(asset)
						if asset:IsA("Model") and AssetIds[kind .. "/" .. asset.Name] then refreshOutfits() end
					end))
				end
			end
			local readyConn = ReplicatedStorage:GetAttributeChangedSignal("MareAssetsReady"):Connect(function()
				if ReplicatedStorage:GetAttribute("MareAssetsReady") then refreshOutfits(true) end
			end)
			-- 장면보다 먼저 모델 로드가 끝난 경우에도 누락/헤어 후보를 한 번 재검사한다.
			if ReplicatedStorage:GetAttribute("MareAssetsReady") then refreshOutfits(true) end
			folder.Destroying:Connect(function()
				if outfitThread and coroutine.status(outfitThread) == "suspended" then task.cancel(outfitThread) end
				outfitThread = nil
				outfitConn:Disconnect()
				readyConn:Disconnect()
				for _, conn in gearConns do conn:Disconnect() end
			end)
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
	-- [기존 움직임 루프] 전경 풀만 매우 약하게 흔들어 별도 프레임 루프를 만들지 않는다.
	local windPlants = {}
	for _, child in folder:GetChildren() do
		if child:IsA("Model") and child:GetAttribute("PortSway") == true then
			table.insert(windPlants, { model = child, pivot = child:GetPivot(), phase = #windPlants * 1.7 })
		end
	end
	local nextWindStep = 0
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
		-- [입자 갱신] 정박 중 0 또는 동일한 정수 방출률을 매 프레임 다시 쓰지 않는다.
		local jetRate, sternRate = math.floor(flow * 26), math.floor(flow * 18)
		for _, em in f.jets do
			if em.Rate ~= jetRate then em.Rate = jetRate end
		end
		if f.stern.Rate ~= sternRate then f.stern.Rate = sternRate end
	end
	-- [모바일 항구 연출] 항해 진입 시에만 입자를 멈추며 항해 중 같은 Rate를 매 프레임 쓰지 않는다.
	local wasVoyageActive = false
	local conn = RunService.Heartbeat:Connect(function()
		if not folder.Parent then return end
		if folder:GetAttribute("PortSceneActive") ~= true then return end
		if workspace:GetAttribute("VoyageActive") then
			if not wasVoyageActive then
				setFoam(0)
				wasVoyageActive = true
			end
			return
		end
		wasVoyageActive = false
		local t = os.clock() - t0
		if t >= nextWindStep then
			nextWindStep = t + (if UserInputService.TouchEnabled then 0.22 else 0.14)
			for _, plant in windPlants do
				if plant.model.Parent then
					plant.model:PivotTo(plant.pivot * CFrame.Angles(0, 0, math.sin(t * 0.9 + plant.phase) * 0.026))
				end
			end
		end
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
	sliceMark("routeCheck")
	-- 성능: 작은 장식 부품(가장 긴 변 4칸 미만)은 그림자를 만들지 않는다. 큰 건물·나무 그림자는 그대로 둔다.
	for _, d in folder:GetDescendants() do
		if d:IsA("BasePart") and d.CastShadow then
			local sz = d.Size
			if math.max(sz.X, sz.Y, sz.Z) < 4 then
				d.CastShadow = false
			end
		end
	end
	sliceMark("shadowPass")
	-- [전 항구 배치 감사] 최종 장면에 남은 실제 모델의 등록 키를 집계한다.
	-- 발전도별 대체 모델과 원본 부품은 미배치만으로 실패/승인 처리하지 않는다.
	-- 이 증거는 장면 구성 확인이며 화면 품질·충돌·모바일 성능 승인과 별개다.
	if RunService:IsStudio() then
		local registered, placed, unplaced, sourcePending = {}, {}, {}, {}
		local underscore = "Town/" .. info.portId .. "_"
		local hyphen = "Town/" .. info.portId .. "-"
		for assetKey in AssetIds do
			if assetKey:sub(1, #underscore) == underscore or assetKey:sub(1, #hyphen) == hyphen then
				registered[assetKey] = true
			end
		end
		local observed, allObserved = {}, {}
		for _, model in folder:GetDescendants() do
			if model:IsA("Model") then
				local assetKey = model:GetAttribute("PortPlacedAssetKey")
				if assetKey and AssetIds[assetKey] then
					allObserved[assetKey] = true
					if registered[assetKey] then observed[assetKey] = true end
				end
			end
		end
		local allKeys = {}
		for key in allObserved do table.insert(allKeys, key) end
		table.sort(allKeys)
		folder:SetAttribute("PortAssetObservedImportKeys", table.concat(allKeys, ";"))
		folder:SetAttribute("PortAssetObservedImportCount", #allKeys)
		folder:SetAttribute("PortAssetObservedImportScope", "IMPORTED_MODEL_SCENE_CONSTRUCTION_ONLY")
		print(("[QA] PORT_ASSET_IMPORT_OBSERVED port=%s level=%d unique=%d sceneryExpected=%s sceneryFailed=%s missingLandmark=%s"):format(
			info.portId, sceneLevel, #allKeys, tostring(folder:GetAttribute("CityPortSceneryExpectedCount")),
			tostring(folder:GetAttribute("CityPortSceneryFailedCount")), tostring(folder:GetAttribute("CityPortMissingLandmark"))))
		for assetKey in registered do
			if observed[assetKey] then
				table.insert(placed, assetKey)
			elseif assetKey:sub(-7) == "-source" then
				table.insert(sourcePending, assetKey)
			else
				table.insert(unplaced, assetKey)
			end
		end
		table.sort(placed)
		table.sort(unplaced)
		table.sort(sourcePending)
		folder:SetAttribute("PortAssetPlacedKeys", table.concat(placed, ";"))
		folder:SetAttribute("PortAssetUnplacedKeys", table.concat(unplaced, ";"))
		folder:SetAttribute("PortAssetUnplacedSourceKeys", table.concat(sourcePending, ";"))
		folder:SetAttribute("PortAssetRegisteredCount", #placed + #unplaced + #sourcePending)
		folder:SetAttribute("PortAssetPlacedCount", #placed)
		folder:SetAttribute("PortAssetAuditScope", "STUDIO_SCENE_CONSTRUCTION_ONLY")
		print(("[QA] PORT_ASSET_PLACEMENT port=%s level=%d registered=%d placed=%d unplaced=%d unplacedSource=%d"):format(
			info.portId, sceneLevel, #placed + #unplaced + #sourcePending, #placed, #unplaced, #sourcePending))
	end
	local spanText = {}
	for _, row in spans do table.insert(spanText, row.ms .. "ms@" .. row.at) end
	folder:SetAttribute("BuildMaxSpanMs", if spans[1] then spans[1].ms else 0)
	folder:SetAttribute("BuildSpans", table.concat(spanText, ";"))
	folder:SetAttribute("BuildMaxYieldGap", math.floor(yieldGapMax * 1000) .. "ms@" .. yieldGapAt)
	return { folder = folder, spawn = CFrame.new(spawnPos) * CFrame.Angles(0, math.rad(90), 0), controls = controls }
end

-- 항해 장면(VoyageScene)에서 같은 배 모델을 쓰기 위해 내보낸다
PortScene.makeShip = buildShip
-- 항해 장면 등에서 승인된 모델 하나를 놓는다 (없으면 nil)
function PortScene.placeModel(parent, kind, asset, pos, size)
	return importedModel(parent, kind, asset, pos, size, false)
end

ReplicatedStorage:SetAttribute("MarePortSceneStage", "ready")
return PortScene

