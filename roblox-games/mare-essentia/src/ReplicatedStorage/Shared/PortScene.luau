--!nonstrict
-- 파일명: PortScene.luau
-- 항구 3D 장면 (클라이언트 전용, 보기용). 도형(Part)으로 항구 마을·부두·배·갈매기를 만든다.
-- 항구마다 지역 양식(북유럽 / 지중해)과 시설(교역소, 조선소, 은행, 길드, 왕궁, 항만청)이 달라진다.
-- 판정에는 쓰이지 않는다. 시설 앞의 ProximityPrompt를 누르면 onFacility(탭 id)가 불린다.

local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Pose = require(script.Parent:WaitForChild("Pose"))
local Voyage = require(script.Parent:WaitForChild("Voyage"))
local PortData = require(script.Parent:WaitForChild("Ports"))
local AssetIds = require(script.Parent:WaitForChild("AssetIds"))
local PortBuildings = require(script.Parent:WaitForChild("PortBuildings"))

local PortScene = {}

local Cultures = require(script.Parent:WaitForChild("PortCultures"))
local MED, STYLE, REGION, PROFILE, OUTFIT = Cultures.MED, Cultures.STYLE, Cultures.REGION, Cultures.PROFILE, Cultures.OUTFIT
local C = Color3.fromRGB
local PORT_CLOCK_EPOCH = os.clock()

-- 특산품 진열용 3D 모델 (없는 상품은 상자로 대신한다)
local GOOD_MESH = {
	cheese = { "Cargo", "cheese" }, wine = { "Cargo", "barrel", Color3.fromRGB(112, 32, 54) }, beer = { "Cargo", "barrel", Color3.fromRGB(196, 138, 46) }, sake = { "Cargo", "barrel", Color3.fromRGB(226, 214, 186) }, fish = { "Cargo", "fish-large" }, wool = { "Cargo", "textiles-stack-small" },
	cloth = { "Cargo", "textiles-stack-large" }, silk = { "Cargo", "textiles-stack-large-colored" }, grain = { "Cargo", "food-flour" },
	iron = { "Cargo", "iron-bars" }, copper = { "Cargo", "copper-bars" }, silver = { "Cargo", "silver-bars" }, gold = { "Cargo", "gold-bars" },
	gems = { "Cargo", "gems-pile-small" }, pearls = { "Cargo", "gem-small" }, honey = { "Cargo", "honey" }, pepper = { "Cargo", "pepper-mill" },
	olive_oil = { "Cargo", "bottle-oil" }, timber = { "Cargo", "wood-log-stack" }, mahogany = { "Cargo", "wood-planks-stack-small" },
	coffee = { "Cargo", "cup-coffee" }, tea = { "Cargo", "cup-tea" }, cocoa = { "Cargo", "chocolate" }, rum = { "Cargo", "barrel", Color3.fromRGB(104, 62, 36) },
	salt = { "Cargo", "shaker-salt" }, sugar = { "Cargo", "bag" }, fruit = { "Cargo", "grapes" }, grapes = { "Cargo", "grapes" },
	lemon = { "Cargo", "lemon" }, maize = { "Cargo", "corn" }, coconut = { "Cargo", "coconut" }, meat = { "Cargo", "whole-ham" },
}
setmetatable(GOOD_MESH, { __index = function() return { "Cargo", "box-open" } end })
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

-- 방문시설 간판: 짙은 목판 + 금테 + 둥근 아이콘 배지 + 굵은 글씨 (멀리서도 읽히게 크게)
local function sign(parent, adornee, text, color, height)
	local bb = Instance.new("BillboardGui")
	bb.Adornee = adornee
	bb.Size = UDim2.fromScale(13, 3) -- 스터드 단위: 멀수록 자연스럽게 작아진다
	bb.StudsOffset = Vector3.new(0, (height or 4) + 2.5, 0)
	bb.AlwaysOnTop = false
	bb.LightInfluence = 0
	bb.MaxDistance = 110
	local plate = Instance.new("Frame")
	plate.Size = UDim2.fromScale(1, 1)
	plate.BackgroundColor3 = Color3.fromRGB(62, 42, 30)
	plate.BorderSizePixel = 0
	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new(Color3.fromRGB(96, 66, 44), Color3.fromRGB(46, 30, 22))
	grad.Rotation = 90
	grad.Parent = plate
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(232, 190, 96)
	st.Thickness = 2.5
	st.Parent = plate
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 12)
	c.Parent = plate
	local badge = Instance.new("TextLabel")
	badge.Size = UDim2.fromScale(0.2, 0.84)
	badge.Position = UDim2.fromScale(0.03, 0.08)
	badge.BackgroundColor3 = color or Color3.fromRGB(150, 110, 40)
	badge.Text = signIcon(text)
	badge.TextScaled = true
	badge.Font = Enum.Font.GothamBold
	badge.TextColor3 = Color3.new(1, 1, 1)
	local bc = Instance.new("UICorner")
	bc.CornerRadius = UDim.new(1, 0)
	bc.Parent = badge
	local bs = Instance.new("UIStroke")
	bs.Color = Color3.fromRGB(232, 190, 96)
	bs.Thickness = 2
	bs.Parent = badge
	badge.Parent = plate
	local l = Instance.new("TextLabel")
	l.Size = UDim2.fromScale(0.72, 0.8)
	l.Position = UDim2.fromScale(0.26, 0.1)
	l.BackgroundTransparency = 1
	l.TextColor3 = Color3.fromRGB(255, 244, 214)
	l.Font = Enum.Font.GothamBlack
	l.TextScaled = true
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.Text = text
	local ts = Instance.new("UIStroke")
	ts.Color = Color3.fromRGB(30, 18, 10)
	ts.Thickness = 2
	ts.Parent = l
	local lim = Instance.new("UITextSizeConstraint")
	lim.MaxTextSize = 60
	lim.MinTextSize = 8
	lim.Parent = l
	l.Parent = plate
	plate.Parent = bb
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
-- 원본: roblox-games/mare-essentia/assets/, 수입본: ReplicatedStorage/MareAssets
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
		if kind ~= "People" then
			local _, size = m:GetBoundingBox()
			if size.Z > size.X then m:PivotTo(CFrame.Angles(0, math.pi / 2, 0) * m:GetPivot()) end
		end
		local center, size = m:GetBoundingBox()
		local bottom = Vector3.new(center.Position.X, center.Position.Y - size.Y / 2, center.Position.Z)
		m:PivotTo(CFrame.new(bottomPosition - bottom) * m:GetPivot())
		if kind == "People" then
			Pose.relaxArms(m)
		end
	end)
	if not ok then
		warn("[MareEssentia] 모델 수입본 배치 오류", kind, asset, err)
		m:Destroy()
		return nil
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
	local figure = Pose.createR15(parent, pos, facing, coat, rng, role, 5.8, outfit)
	if figure then figure.Name = "Villager" end
	return figure
end

-- 캐릭터(약 5스터드)에 비해 집이 장난감처럼 작아 보여서 전체적으로 키운다 (대신 간격도 같이 넓힌다)
local HOUSE_SCALE = 1.45

-- 한 마을의 건물은 재질을 하나로 통일한다 (벽·별채·굴뚝이 제각각 다른 재질로 보이지 않게)
local houseTier = 1 -- 발전 단계 (PortScene.build 가 정한다): 낮을수록 가난한 목조, 높을수록 그 문화권의 번듯한 재료
local STONE_MATS = { [Enum.Material.Brick] = true, [Enum.Material.Cobblestone] = true, [Enum.Material.Slate] = true, [Enum.Material.Limestone] = true }
local function uniformMaterial(m, style)
	local mat = style.mat
	-- 돌·벽돌 문화권도 초기엔 목조 오두막으로 시작해, 발전하면서 석조로 바뀐다
	if mat and STONE_MATS[mat] then
		if houseTier <= 1 then mat = Enum.Material.Wood elseif houseTier == 2 then mat = Enum.Material.WoodPlanks end
	end
	if not (m and mat) then return end
	for _, p in m:GetDescendants() do
		if p:IsA("BasePart") then
			p.Material = mat
		end
	end
end

-- 문화권별 건축 특성: 기후·실제 건축 전통에 따라 굴뚝·발코니·수레·고상(高床)·천막·야자수가 다르다
local function setOf(...) local s = {} for _, k in { ... } do s[k] = true end return s end
local TRAIT = {
	chimney = setOf("north", "brick", "stone", "nordic", "britain", "hanse", "france", "japan"), -- 추운 곳만 난로 굴뚝
	balcony = setOf("iberia", "italy", "france", "creole", "colonial", "med", "malabar"), -- 지중해·식민지풍 발코니
	cart = setOf("hanse", "italy", "ottoman", "malabar", "china", "swahili", "seasia", "med"), -- 장터 수레
	stilt = setOf("seasia", "pacific"), -- 고상식 집(기둥 위에 지음)
	tent = setOf("desert", "ottoman", "swahili", "wafrica", "pacific"), -- 초기엔 천막 야영
	palm = setOf("tropic", "seasia", "pacific", "creole", "wafrica", "swahili", "malabar", "colonial"),
}
local STYLE_KEY = {}
for k, v in STYLE do STYLE_KEY[v] = k end
local vacancyRate = 0 -- 빈집 비율 (PortScene.build 가 정한다)
local function house(parent, pos, w, d, floors, style, rng, wallColor)
	-- 벽 색을 먼저 정해, 수입한 집 메쉬 전체에 같은 따뜻한 색을 입힌다 (회색 맨몸 집 방지)
	local tintColor = wallColor or style.walls[rng:NextInteger(1, #style.walls)]
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
				uniformMaterial(roof, style)
			end
			if vacant then
				for k = -1, 1 do
					importedModel(parent, "Town", "fence_straight", pos + Vector3.new(k * 4, 0, if pos.Z > 0 then -size * 0.7 else size * 0.7), 4, false)
				end
			end
			return base:FindFirstChildWhichIsA("BasePart", true)
		end
	end
	local variant = "house"
	local ckey = STYLE_KEY[style]
	if ckey and TRAIT.stilt[ckey] and not vacant then
		for sx = -1, 1, 2 do
			for sz = -1, 1, 2 do
				importedModel(parent, "Town", "fence_post", pos + Vector3.new(sx * w * 0.32, 0, sz * d * 0.32), 3.2, false)
			end
		end
		pos = pos + Vector3.new(0, 2.6, 0)
	end
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
		-- 집마다 같은 실루엣이 되지 않게, 위치로 정한 일부 집 용마루에 승인된 굴뚝(Town/chimney)을 얹는다
		local size = math.max(w, d) * variation
		-- 네 채 중 한 채는 옆에 작은 별채를 붙여 ㄱ자 집처럼 보이게 한다
		if seed % 4 == 1 then
			local annex = importedModel(parent, "Town", "house", pos + Vector3.new(size * 0.95, 0, size * 0.25), size * 0.62 * HOUSE_SCALE, true, tintColor)
			if annex then
				annex.Name = "HarborAnnex"
				uniformMaterial(annex, style)
			end
		end
		if variant ~= "house_chimney" and ckey and TRAIT.chimney[ckey] and houseTier >= 2 and (houseTier >= 3 or math.floor(math.abs(pos.X * 7 + pos.Z * 13)) % 2 == 0) then
			local chim = importedModel(parent, "Town", "chimney", pos + Vector3.new(0, size * 0.7, 0), size * 0.4, false, Color3.fromRGB(122, 98, 84))
			if chim then chim.Name = "HarborChimney" uniformMaterial(chim, style) end
		end
		-- 발전한 항구(3단계↑)에선 일부 집 앞에 발코니(Town/balcony-wall-fence)를 달아 실루엣을 다양하게 한다
		if houseTier >= 3 and ckey and TRAIT.balcony[ckey] and not vacant and seed % 3 == 0 and (floors or 1) >= 2 then
			local bal = importedModel(parent, "Town", "balcony-wall-fence", pos + Vector3.new(0, size * 0.55, if pos.Z > 0 then -size * 0.52 else size * 0.52), size * 0.7, false, tintColor)
			if bal then
				bal.Name = "HarborBalcony"
				uniformMaterial(bal, style)
			end
		end
		-- 번성한 항구(4단계↑)엔 집 옆에 수레(Town/cart)를 세워 장사하는 분위기를 낸다
		if houseTier >= 3 and ckey and TRAIT.cart[ckey] and not vacant and seed % 5 == 2 then
			importedModel(parent, "Town", "cart", pos + Vector3.new(size * 0.8, 0, if pos.Z > 0 then -size * 0.7 else size * 0.7), 4, false)
		end
		if ckey and TRAIT.tent[ckey] and houseTier <= 2 and seed % 3 == 1 then
			importedModel(parent, "Terrain", "tent-detailedopen", pos + Vector3.new(size * 0.9, 0, -size * 0.6), 6, false)
		end
		if ckey and TRAIT.palm[ckey] and houseTier >= 2 and seed % 3 == 2 then
			importedModel(parent, "Naval", "palm-bend", pos + Vector3.new(-size * 0.8, 0, size * 0.6), 9, false)
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
	return if sceneLevel <= 1 then Enum.Material.Ground else Enum.Material.Cobblestone
end
local function roadColor(style)
	if sceneLevel <= 1 then
		return style.street:Lerp(Color3.fromRGB(120, 96, 66), 0.65)
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
local stallSpots = {}
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
local function zoneLayout(portId, lvl)
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
		fort = (port and port.shipyard) or lvl >= 4,
		trader = port ~= nil and #port.produces >= 4,
		side = zr:NextInteger(0, 1) * 2 - 1, -- 포대가 서는 쪽 (반대쪽은 어항·하역장)
	}
	lay.pens = math.clamp(5 - lvl + (if lay.farm then 1 else 0) - (if lay.fish then 1 else 0), 1, 4)
	return lay
end
-- 가축 울타리 중심 (마을 서쪽 끝, 16x12)
local function penAt(i, n)
	return Vector3.new(-214, 0, (i - (n + 1) / 2) * 24)
end

local function spawnJobs(folder, info, rng, lvl, walkers, key)
	local year = info.year or currentYear
	local o = OUTFIT[key] or OUTFIT.north or {}
	local function person(pos, facing, spec, profession)
		local extra = { year = year, age = spec.age or "adult", profession = spec.profession or profession or spec.role or "villager" }
		local female = spec.female
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
		t.phase = t.phase or rng:NextNumber(0, 10)
		table.insert(walkers, t)
	end
	local function stay(pos, target, kind, spec)
		local fig = person(pos, faceTo(pos, target), spec or {}, kind)
		addTask(fig, { kind = kind, mode = "stay" })
		return fig
	end
	local function path(a, b, kind, speed, spec, over)
		local fig = person(a, faceTo(a, b), spec or {}, kind)
		local len = (b - a).Magnitude
		if fig then
			local p = fig:GetPivot().Position
			fig:PivotTo(CFrame.lookAt(p, p + (b - a).Unit * Vector3.new(1, 0, 1)))
		end
		addTask(fig, { kind = kind, mode = "path", len = len, speed = speed, over = over })
		return fig
	end
	local function pick(list) return list[rng:NextInteger(1, #list)] end

	-- 요리: 광장 한쪽 모닥불 솥을 젓는 아낙 (1단계부터), 단계가 오르면 한 명 더
	importedModel(folder, "Terrain", "campfire-stones", Vector3.new(-26, 0, -14), 3.6, false)
	importedModel(folder, "Cargo", "pot-stew", Vector3.new(-26, 1.2, -14), 2.2, false)
	stay(Vector3.new(-26, 0, -11.2), Vector3.new(-26, 0, -14), "stir", { female = true, role = "Rogue", hat = false })
	if lvl >= 3 then
		stay(Vector3.new(-29, 0, -12), Vector3.new(-26, 0, -14), "stir", { female = true, role = "Rogue", hat = false, age = "elder" })
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
			importedModel(folder, "Terrain", "pillar-obelisk", Vector3.new(-12, 0, 24), 16, true)
			importedModel(folder, "Terrain", "statue-obelisk", Vector3.new(-12, 0, -24), 14, true)
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
		local n = math.min(#sites, 2 * math.max(1, (info.construction.to or lvl + 1) - lvl) + 2)
		for i = 1, n do
			local at = sites[i]
			local zs = if at.Z > 0 then 1 else -1
			importedModel(folder, "Terrain", "wood-structure", at, 10, false)
			importedModel(folder, "Terrain", "wood-support", at + Vector3.new(6, 0, 0), 7, false)
			importedModel(folder, "Terrain", "log-stack", at + Vector3.new(-6, 0, zs * 2), 4, false)
			importedModel(folder, "Cargo", "wood-planks-stack-small", at + Vector3.new(-3, 0, -zs * 5), 2.8, false)
			importedModel(folder, "Town", "cart", at + Vector3.new(9, 0, -zs * 5), 4, false)
			importedModel(folder, "Town", "workbench-anvil", at + Vector3.new(-9, 0, -zs * 3), 3, false)
			local mark = part(folder, Vector3.new(1, 1, 1), CFrame.new(at + Vector3.new(0, 0, 0)), Color3.new(1, 1, 1))
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
			iberia = { "sheep", "donkey", "pig", "chicken", "dog" }, italy = { "donkey", "chicken", "cat", "dog" },
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
			cow = { 3.4, "graze" }, horse = { 3.8, "graze" }, sheep = { 2.3, "graze" }, pig = { 2.2, "peck" }, llama = { 3.2, "graze" },
			donkey = { 3.2, "graze" }, elephant = { 6.5, "still" }, chicken = { 1, "peck" }, dog = { 1.5, "tail" }, cat = { 1.1, "still" },
		}
		local list = SPECIES[key] or SPECIES.britain
		local function animal(species, pos)
			local k = KIND[species]
			local m = k and importedModel(folder, "Animals", if species == "dog" then "dog-pug" else species, pos, k[1], false)
			if not m then
				return
			end
			m:PivotTo(CFrame.new(m:GetPivot().Position) * CFrame.Angles(0, rng:NextNumber(0, math.pi * 2), 0) * (m:GetPivot() - m:GetPivot().Position))
			table.insert(walkers, { model = m, base = m:GetPivot(), mode = "animal", akind = k[2], phase = rng:NextNumber(0, 10) })
		end
		local lay = zoneLayout(info.portId, lvl)
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
		-- 1) 농원구역: 울타리 안의 가축 (울타리가 많은 작은 마을일수록 가축이 많다)
		for i = 1, lay.pens do
			local c = penAt(i, lay.pens)
			if #stock > 0 then
				local sp = stock[(i - 1) % #stock + 1]
				if sp == "elephant" then
					animal(sp, c)
				else
					for k = 1, math.min(2 + (lvl % 2), 3) do
						animal(sp, c + Vector3.new(rng:NextNumber(-5, 5), 0, rng:NextNumber(-3, 3)))
					end
				end
			end
			if has.chicken and i == 1 then
				for _ = 1, 2 do
					animal("chicken", c + Vector3.new(rng:NextNumber(-12, -10), 0, rng:NextNumber(-4, 4)))
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
	-- 짐꾼: 부두에서 교역소까지 짐을 나른다 (1단계 1명, 3단계 2명)
	do
		local porters = if lvl >= 3 then 2 else 1
		for i = 1, porters do
			local pz = 24 + i * 3
			local fig = path(Vector3.new(14, 0, pz), Vector3.new(-6, 0, pz - 6), "carry", 1.5, { role = "Barbarian", hat = false })
			if fig then
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
end

-- 발전도 랜드마크 자리(양쪽 큰길 뒤). 집은 이 자리를 피해 짓는다.
-- 주요 항구의 상징 건축물: 광장 맞은편(개요 카메라에 보이는 자리)에 그 도시를 알아볼 수 있는 실루엣을 세운다.
-- 등록된 실제 CC0 모델만 조합한다 (직접 만든 도형 없음). 좌표는 앵커(-30, 0, -66) 기준.
local SIG_ANCHOR = Vector3.new(-30, 0, -66)
local SIG = {}
do
	local function one(kind, asset, size, dx, dz, y)
		return { kind = kind, asset = asset, size = size, dx = dx, dz = dz, y = y or 0 }
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
	SIG.macau = cat(one("Town", "church", 26, 0, 0), stack("Town", { "eastasia-base", "eastasia-roof", "eastasia-base", "eastasia-roof" }, 10, 22, 4))
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
	SIG.bergen = cat(one("Town", "church", 24, 0, 0), one("Castle", "wall", 24, 18, 12), one("Castle", "wall", 24, -18, 12))
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
	SIG.singapore = cat(one("Town", "bell-tower", 26, 0, 0), palms(16))
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
end

local function placeSignature(folder, info)
	local list = SIG[info.portId]
	if not list then
		return
	end
	for _, e in list do
		importedModel(folder, e.kind, e.asset, SIG_ANCHOR + Vector3.new(e.dx, e.y, e.dz), e.size, true)
	end
end

local LM_SITES = {
	Vector3.new(-112, 0, 34), Vector3.new(-112, 0, -34), Vector3.new(-150, 0, 46), Vector3.new(-150, 0, -46),
	Vector3.new(-190, 0, 40), Vector3.new(-190, 0, -40), Vector3.new(-72, 0, 72), Vector3.new(-72, 0, -72),
}

local function densify(folder, info, style, rng, walkers, made)
	local key = styleKeyOf(style)
	local palm = palmOk(info.portId, style)
	local cold = not palm
	local port = PortData.Ports[info.portId]
	local big = (port and port.shipyard) or false
	local P = PROFILE[key] or PROFILE.north
	local lvl = sceneLevel
	local streetsX = P.streets
	local function nearStreet(x, w)
		for _, sx in streetsX do
			if math.abs(x - sx) < w / 2 + 3.5 then return true end
		end
		return false
	end

	-- 1) 마을 구획: 큰길 앞 두 줄 + 골목마다 등을 맞댄 두 줄. 집 크기·간격·층수·골목 짜임은 지역 프로필을 따르고,
	--    항구 발전도가 오를수록 구획(줄)이 늘고 길이 포장되며 집이 높아진다.
	local S = P.S -- 집 한 채가 차지하는 한 변(스터드). house()의 최종 크기 = max(w,d)*변주*HOUSE_SCALE
	local fw = S / HOUSE_SCALE
	local laneL = 2 * S + P.alley + 3
	local pairsMax = math.max(1, math.floor((136 - 38) / laneL))
	local pairsN = math.min(pairsMax, math.ceil(lvl * 0.8))
	local dens = math.clamp((0.5 + 0.1 * lvl) * P.dens, 0.3, 0.97)
	local smokers = 0
	local X_END = -190
	-- 구역(상업·주거·종교·농장): 항구마다 네 자리에 종류를 무작위로 배정한다. 시설 거리(큰길 양옆)는 집을 비운다.
	local dz = seeded(info.portId .. "district")
	local slots = { Vector3.new(-134, 0, 86), Vector3.new(-134, 0, -86), Vector3.new(-178, 0, 86), Vector3.new(-178, 0, -86) }
	for i = #slots, 2, -1 do
		local j = dz:NextInteger(1, i)
		slots[i], slots[j] = slots[j], slots[i]
	end
	local districts = { { kind = "religious", at = slots[1] }, { kind = "market", at = slots[2] }, { kind = "farm", at = slots[3] } } -- slots[4] 는 주거지 그대로
	local function reserved(x, z)
		if x > -104 and math.abs(z) > 20 and math.abs(z) < 54 then return true end
		for _, d in districts do
			if math.abs(x - d.at.X) < 24 and math.abs(z - d.at.Z) < 22 then return true end
		end
		for _, a in LM_SITES do
			if math.abs(x - a.X) < 20 and math.abs(z - a.Z) < 20 then return true end
		end
		return false
	end
	local function onStreet(x)
		for _, sx in streetsX do
			if math.abs(x - sx) < S / 2 + P.alley / 2 + 1 then
				return true
			end
		end
		return false
	end
	-- 한 줄 채우기: z = 줄의 중심, t = 0(항구 쪽)~1(성벽 쪽)
	local function fillRow(z, t, xStart)
		local x = xStart
		while x > X_END do
			if not onStreet(x) and not reserved(x, z) and rng:NextNumber() < dens then
				local sz = S * rng:NextNumber(0.9, 1.08)
				local pos = Vector3.new(x + rng:NextNumber(-1, 1) * P.jx, 0, z + rng:NextNumber(-1, 1) * P.jz)
				local fl = P.fl0 + math.floor(t * P.flGrow + 0.5) + (if lvl >= 4 then 1 else 0) - (if lvl <= 1 then 1 else 0)
				if rng:NextNumber() < 0.15 then fl += (if rng:NextNumber() < 0.5 then -1 else 1) end
				fl = math.clamp(fl, 1, P.flMax)
				local ww = fw * (sz / S)
				house(folder, pos, ww, ww * rng:NextNumber(0.85, 1), fl, style, rng)
				if smokers < 28 and rng:NextNumber() < 0.22 then
					smokers += 1
					smokeOn(folder, pos + Vector3.new(ww * 0.2, fl * 6 + 4, 0))
				end
			end
			x -= S * (1 + P.gapf * rng:NextNumber(0.6, 1.4))
		end
	end
	for _, side in { 1, -1 } do
		-- 큰길(가운데 길) 앞 두 줄: 광장과 시설을 지나 안쪽부터
		fillRow(side * (6 + S / 2 + 1), 0, -92)
		fillRow(side * (6 + S + 2 + S / 2 + 1), 0.15, -92)
		for p = 0, pairsN do
			local laneZ = 38 + p * laneL
			if (P.canal or info.portId == "venice") and p % 2 == 1 then
				local canal = part(folder, Vector3.new(140, 0.3, P.alley + 1), CFrame.new(-100, 0.05, side * laneZ), Color3.fromRGB(70, 120, 150), Enum.Material.Glass)
				canal.Transparency = 0.25
				canal.CanCollide = false
				canal.CanQuery = false
			else
				strip(folder, style, -100, side * laneZ, 140, P.alley)
			end
			if p < pairsN then
				local t = (p + 0.5) / math.max(1, pairsN)
				fillRow(side * (laneZ + P.alley / 2 + 0.8 + S / 2), t, -26)
				fillRow(side * (laneZ + laneL - P.alley / 2 - 0.8 - S / 2), t, -26)
			end
		end
	end
	for _, sx in streetsX do
		strip(folder, style, sx, 0, P.alley, 2 * (38 + pairsN * laneL) + 6)
	end
	-- 구역 내용 (등록된 실제 3D 모델만 사용)
	do
		local function put(kind, asset, size, x, z, solid, yaw)
			local m = importedModel(folder, kind, asset, Vector3.new(x, 0, z), size, solid == true)
			if m and yaw then rotateAround(m, Vector3.new(x, 0, z), yaw) end
			return m
		end
		local hotKey = key == "ottoman" or key == "swahili" or key == "malabar" or key == "colonial" or key == "desert" or key == "tropic" or key == "seasia" or key == "pacific" or key == "wafrica" or key == "creole"
		for _, d in districts do
			local cx, cz = d.at.X, d.at.Z
			local face = if cz > 0 then 0 else math.pi
			if d.kind == "religious" then
				if key == "japan" or key == "china" then
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
				local crops = if hotKey then { "crops-cornstagec", "crop-melon", "crop-pumpkin" } else { "crops-wheatstagea", "crop-turnip", "crop-carrot" }
				for row = -1, 1 do
					for k = -3, 3 do
						put("Terrain", crops[(row + 1) % #crops + 1], 5, cx + k * 5, cz + row * 7, false)
					end
				end
				for k = -3, 3 do
					put("Town", "fence", 5, cx + k * 5.5, cz + (if cz > 0 then 12 else -12), false)
				end
				put("Town", if key == "iberia" or key == "north" or key == "med" then "windmill" else "watermill", 24, cx + 18, cz, true, face)
				put("Terrain", "log-stack", 4, cx - 16, cz + 4, false)
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
				local doorZ = cz + (if cz > 0 then -19 else 19)
				npc(-4, doorZ - (if cz > 0 then 1 else -1) * 0, face, "bell", "stay", { role = "Knight" })
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
		local lay = zoneLayout(info.portId, lvl)
		local sd = lay.side
		-- 농원구역(마을 서쪽 끝): 가축 울타리와 밭. 작은 마을일수록 울타리가 많고 큰 항구는 장터로 바뀐다.
		for i = 1, lay.pens do
			local c = penAt(i, lay.pens)
			for dx = -6, 6, 4 do
				for _, dz in { -6, 6 } do
					one("Town", "fence_rails", 4, c.X + dx, 0, c.Z + dz)
				end
			end
			for dz = -4, 4, 4 do
				for _, dx in { -8, 8 } do
					rotateAround(one("Town", "fence_rails", 4, c.X + dx, 0, c.Z + dz), Vector3.new(c.X + dx, 0, c.Z + dz), math.pi / 2)
				end
			end
			if lay.farm then
				rowOf("Terrain", "crops-wheatstagea", 4, c.X - 22, c.X - 44, 7, c.Z - 3)
				rowOf("Terrain", "crops-wheatstageb", 4, c.X - 22, c.X - 44, 7, c.Z + 3)
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
					importedModel(folder, mesh[1], mesh[2], Vector3.new(x + (kk - 2) * 1.8, 2.5, z), 1.8, false, mesh[3])
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
		local hz = -sd
		if lay.fish then
			for x = 12, -12, -8 do
				one("Town", "fence_straight", 5, x, 0, hz * 62)
				one("Cargo", "fish-large", 2, x, 3, hz * 62)
			end
			for _, bz in { 56, 66 } do
				one("Naval", "boat-row-small", 6, 16, 0.3, hz * bz)
			end
		end
		if lay.timber then
			one("Terrain", "log-stack", 4, 8, 0, hz * 78)
			one("Terrain", "log-stack", 4, 0, 0, hz * 78)
			one("Cargo", "resource-planks", 3, 8, 0, hz * 84)
		end
		if lay.mine then
			one("Cargo", "iron-bars-stack-large", 3, 10, 0, hz * 70)
			one("Town", "workbench-anvil", 3.4, 2, 0, hz * 70)
		end
		if lay.fort then
			one("Naval", "tower-watch", 12, 6, 0, sd * 72, true)
			if lvl >= 3 then
				for _, dz in { 62, 66 } do
					one("Naval", "cannon", 3.4, 14, 0, sd * dz)
				end
				one("Castle", "flag-banner-long", 9, 2, 0, sd * 64)
			end
			if lvl >= 5 then
				one("Naval", "tower-watch", 12, 6, 0, sd * 92, true)
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

	-- 2) 광장 중심: 동상·기둥·깃발, 시장 가판대를 더 둘러 세운다
	if lvl >= 2 then
		importedModel(folder, "Terrain", "statue-column", Vector3.new(-26, 0, 0), 12, true)
	end
	if lvl >= 2 then
		for _, c in { Vector3.new(-26, 0, 8), Vector3.new(-26, 0, -8), Vector3.new(-17, 0, 8), Vector3.new(-17, 0, -8) } do
			importedModel(folder, "Town", "pillar-stone", c, 5, false)
		end
	end
	if lvl >= 3 then
		for _, z in { -24, 24 } do
			for _, x in { -2, -22, -42, -62 } do
				importedModel(folder, "Castle", "flag-banner-short", Vector3.new(x, 0, z), 7, false)
			end
		end
	end
	local extraStalls = { Vector3.new(-44, 0, 13), Vector3.new(-44, 0, -13), Vector3.new(-70, 0, 13), Vector3.new(-70, 0, -13), Vector3.new(-6, 0, -14), Vector3.new(-6, 0, 14) }
	local stallMax = if lvl <= 1 then 2 elseif lvl == 2 then 4 else #extraStalls
	table.clear(stallSpots)
	for i, spot in extraStalls do
		if i > stallMax then break end
		table.insert(stallSpots, spot)
		importedModel(folder, "Town", if i % 2 == 0 then "stall-red" else "stall-green", spot, 6.5, false)
		for k = 1, 4 do
			local good = made[(i + k) % math.max(1, #made) + 1] or "cheese"
			local mesh = GOOD_MESH[good]
			importedModel(folder, mesh[1], mesh[2], spot + Vector3.new((k - 2.5) * 1.7, 2.5, 0), 1.8, false, mesh[3])
		end
	end

	-- 3) 부두: 둘째 잔교, 배 여러 척, 하역장
	local pier = part(folder, Vector3.new(44, 0.8, 7), CFrame.new(44, 1.6, 46), Color3.fromRGB(150, 110, 70), Enum.Material.WoodPlanks)
	pier.CanCollide = false
	pier.Transparency = 1
	for x = 30, 62, 16 do
		importedModel(folder, "Naval", "structure-platform-dock-small", Vector3.new(x, 0.8, 46), 14, false)
	end
	local dockCargo = { { "Naval", "crate" }, { "Cargo", "barrel" }, { "Naval", "cargo-pile-a" }, { "Naval", "cargo-pile-b" }, { "Naval", "chest" }, { "Naval", "crate-bottles" }, { "Naval", "detail-crate-ropes" } }
	for i = 0, 9 do
		local c = dockCargo[i % #dockCargo + 1]
		importedModel(folder, c[1], c[2], Vector3.new(26 + i * 4.2, 2, 46 + (if i % 2 == 0 then 1.6 else -1.6)), 2.6, false)
	end
	for i = 0, 5 do
		local c = dockCargo[(i + 2) % #dockCargo + 1]
		importedModel(folder, c[1], c[2], Vector3.new(26 + i * 12, 2, if i % 2 == 0 then 4.2 else -4.2), 2.6, false)
	end
	importedModel(folder, "Naval", "pulley-crate", Vector3.new(60, 2, 47), 4.6, false)
	importedModel(folder, "Naval", "mast", Vector3.new(66, 2, 44), 12, false)
	importedModel(folder, "Naval", "flag-pennant", Vector3.new(66, 14, 44), 3, false)
	local boats = { { "boat-sail-a", 14 }, { "boat-sail-b", 14 }, { "boat-fishing-small", 10 }, { "boat-row-large", 8 }, { "boat-row-small", 6 }, { "boat-fishing-small", 10 }, { "boat-sail-b", 13 } }
	local spots = { { 40, 60 }, { 70, 64 }, { 100, 78 }, { 52, -64 }, { 86, -70 }, { 120, -92 }, { 130, 100 }, { 38, 34 } }
	for i, spot in spots do
		local b = boats[i % #boats + 1]
		local m = importedModel(folder, "Naval", b[1], Vector3.new(spot[1], 0.8, spot[2]), b[2], false)
		rotateAround(m, Vector3.new(spot[1], 0, spot[2]), rng:NextNumber(-0.5, 0.5))
	end
	if big then
		importedModel(folder, "Naval", "ship-wreck", Vector3.new(150, 0.4, -120), 22, false)
		importedModel(folder, "Naval", "ship-pirate-small", Vector3.new(80, 0.8, 90), 20, false)
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

	-- 6-b) 광장 중앙: 이 마을의 핵심 정체성 상징물 (길 축을 막지 않게 분수 반대편에 둔다)
	do
		local ax, az = -8, 11
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
		elseif key == "japan" or key == "china" then
			big("Town", "temple-tower", 24)
		elseif key == "desert" then
			big("Terrain", "egypt-obelisk", 28)
		else
			big("Town", "bell-tower", 24)
		end
	end

	-- 7) 외곽: 성벽·망루로 마을을 두르고, 그 밖은 언덕과 숲으로 막는다
	local WZ, WX = 150, -204
	local walled = lvl >= 3
	for _, side in { 1, -1 } do
		local x = -22
		while walled and x > WX do
			local m = importedModel(folder, "Castle", "wall", Vector3.new(x, 0, side * WZ), 12.5, true)
			if not m then m = importedModel(folder, "Naval", "castle-wall", Vector3.new(x, 0, side * WZ), 12.5, true) end
			x -= 12
		end
		if lvl >= 2 then
			for _, tx in { -22, -80, -140, WX } do
				importedModel(folder, "Naval", "tower-watch", Vector3.new(tx, 0, side * WZ), 16, true)
			end
		end
	end
	local z = -WZ
	while walled and z <= WZ do
		local m = importedModel(folder, "Castle", if z == -18 or z == 18 then "wall-narrow-gate" else "wall", Vector3.new(WX, 0, z), 12.5, true)
		if not m then m = importedModel(folder, "Naval", "castle-wall", Vector3.new(WX, 0, z), 12.5, true) end
		rotateAround(m, Vector3.new(WX, 0, z), math.pi / 2)
		z += 12
	end
	if walled then
		importedModel(folder, "Naval", "tower-watch", Vector3.new(WX, 0, 0), 16, true)
	end
	-- 성벽 밖 언덕과 숲
	-- 평평한 절벽 판자(cliff-rock 은 두께 0.2 패널) 대신 입체 바위 군집
	local rocks = { "rock-large", "rock-wide", "rock-small" }
	for i = 1, 40 do
		local side = if i % 2 == 0 then 1 else -1
		local c = Vector3.new(rng:NextNumber(-250, -20), 0, side * rng:NextNumber(170, 250))
		importedModel(folder, "Town", "rock-large", c, rng:NextNumber(16, 26), true)
		for j = 1, 2 do
			importedModel(folder, "Town", rocks[rng:NextInteger(1, 3)], c + Vector3.new(rng:NextNumber(-12, 12), 0, rng:NextNumber(-12, 12)), rng:NextNumber(7, 13), false)
		end
	end
	for i = 1, 12 do
		importedModel(folder, "Town", "rock-wide", Vector3.new(rng:NextNumber(-270, -225), 0, rng:NextNumber(-170, 170)), rng:NextNumber(14, 24), true)
	end
	local hot = key == "ottoman" or key == "swahili" or key == "malabar" or key == "colonial" or key == "seasia" or key == "pacific" or key == "wafrica" or key == "creole"
	local trees = if key == "japan" then { "tree-pinedefaulta", "tree-pinedefaulta", "tree-oak" } elseif hot then { "palm-detailed-straight", "tree-crooked", "tree_large" } elseif cold then { "tree-pinedefaulta", "tree-oak", "tree_large", "tree-high" } else { "palm-detailed-straight", "tree-crooked", "tree_large" }
	for i = 1, 150 do
		local side = if i % 2 == 0 then 1 else -1
		local pos = Vector3.new(rng:NextNumber(-262, -10), 0, side * rng:NextNumber(158, 245))
		local pick = trees[rng:NextInteger(1, #trees)]
		local kind = if pick:find("palm", 1, true) or pick:find("tree-pine", 1, true) or pick:find("tree-oak", 1, true) then (if pick:find("palm", 1, true) then "Naval" else "Terrain") else "Town"
		importedModel(folder, kind, pick, pos, rng:NextNumber(8, 14), false)
	end
	for i = 1, 30 do
		local pos = Vector3.new(-212 - rng:NextNumber(0, 40), 0, rng:NextNumber(-150, 150))
		importedModel(folder, "Terrain", trees[1] == "tree-pinedefaulta" and "tree-pinedefaulta" or "tree-oak", pos, rng:NextNumber(8, 13), false)
	end
end

-- 발전도 랜드마크: 레벨 조건을 채운 시설이 자리에 들어선다. 등록된 모델과 기존 house()만 쓴다(새 도형 금지).
local function placeLandmarks(folder, info, style, rng, onFacility, walkers)
	local lvl = sceneLevel
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
		if at and lvl >= lm.minLevel then
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
				local plants = { "tree_large", "tree-oak", "plant-bush", "tree-crooked" }
				for k = 1, 9 do
					local pk = plants[(k - 1) % #plants + 1]
					local kind = if pk == "plant-bush" or pk == "tree-oak" then "Terrain" else "Town"
					put(kind, pk, if pk == "plant-bush" then 4 else 9, x - 11 + (k % 3) * 11, z - 11 + (k // 3) * 11, false)
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
				put("Town", "bell-tower", 20, x + 17, z, true)
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
			local adorn = body
			if typeof(body) == "Instance" and not body:IsA("BasePart") then adorn = body:FindFirstChildWhichIsA("BasePart", true) end
			if adorn then
				sign(folder, adorn, lm.name, nil, 18)
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
	local style = if REGION[info.portId] and STYLE[REGION[info.portId]] then STYLE[REGION[info.portId]] elseif MED[info.portId] then STYLE.med else STYLE.north
	local rng = seeded(info.portId)
	sceneLevel = math.clamp(math.floor(info.level or 1), 1, 5)
	houseTier = sceneLevel
	currentKey = styleKeyOf(style)
	currentYear = if type(info.year) == "number" then info.year else 1700
	local fac = {}
	for _, k in info.facilities or {} do
		fac[k] = true
	end

	local plate = workspace:FindFirstChild("Baseplate")
	if plate then
		plate.Color = style.ground
		-- 항공 시점에서 땅 모서리가 보이지 않게 넓힌다 (바다는 x>20 이라 서쪽으로만 확장)
		plate.Size = Vector3.new(2600, plate.Size.Y, 2600)
		plate.Position = Vector3.new(-1280, plate.Position.Y, 0)
		plate.Material = Enum.Material.Grass
	else
		-- 로블록스 기본 Baseplate가 없는 빌드: 항구 땅(서쪽)과 바다 밑바닥을 직접 만든다
		local land = part(folder, Vector3.new(2600, 4, 2600), CFrame.new(-1280, -2, 0), style.ground, Enum.Material.Grass)
		land.Name = "Ground"
		part(folder, Vector3.new(1400, 4, 1000), CFrame.new(430, -12, 0), Color3.fromRGB(176, 160, 120), Enum.Material.Sand)
	end

	-- 바다(동쪽, x > 20)와 부두
	local water = part(folder, Vector3.new(1300, 1, 1000), CFrame.new(670, 0.3, 0), Color3.fromRGB(32, 118, 160), Enum.Material.Glass)
	water.Transparency = 0.28
	water.Reflectance = 0.1
	water.CanCollide = false
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
		for _, z in { -280, 280 } do
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
		wall(Vector3.new(1, 40, 440), CFrame.new(22.5, 18, 225.5))
		wall(Vector3.new(1, 40, 440), CFrame.new(22.5, 18, -225.5))
		wall(Vector3.new(66, 40, 1), CFrame.new(56, 18, 5.6))
		wall(Vector3.new(66, 40, 1), CFrame.new(56, 18, -5.6))
		wall(Vector3.new(1, 40, 12), CFrame.new(89.5, 18, 0))
		wall(Vector3.new(1, 40, 900), CFrame.new(-600, 18, 0))
		wall(Vector3.new(1200, 40, 1), CFrame.new(0, 18, 440))
		wall(Vector3.new(1200, 40, 1), CFrame.new(0, 18, -440))
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
	sign(folder, gate, info.portName, Color3.fromRGB(150, 110, 40), 7)
	prompt(folder, Vector3.new(60, 4, 0), "부두", "출항 준비 (지도)", "map", onFacility)

	-- 내 배
	local ship = buildShip(folder, info.shipId, Vector3.new(50, 1.2, 16))

	-- 광장
	part(folder, Vector3.new(36, 0.3, 36), CFrame.new(-6, 0.15, 0), roadColor(style), roadMat())
	part(folder, Vector3.new(130, 0.25, 10), CFrame.new(-80, 0.13, 0), roadColor(style), roadMat())
	-- 시설 앞 큰 광장과 주택가 골목: 동선이 눈에 보이도록 돌바닥을 깐다
	part(folder, Vector3.new(100, 0.3, 74), CFrame.new(-38, 0.14, 0), roadColor(style), roadMat())
	for _, sz in { 57, -57 } do
		part(folder, Vector3.new(120, 0.25, 6), CFrame.new(-92, 0.12, sz), roadColor(style), roadMat())
	end
	for _, sx in (PROFILE[styleKeyOf(style)] or PROFILE.north).streets do
		part(folder, Vector3.new(4, 0.25, 130), CFrame.new(sx, 0.12, 0), roadColor(style), roadMat())
	end
	-- 광장 분수도 CC0 수입 메쉬 우선
	if true then
		part(folder, Vector3.new(2, 8, 8), CFrame.new(-8, 1, 0) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(200, 196, 186), Enum.Material.Marble, Enum.PartType.Cylinder)
		part(folder, Vector3.new(2.2, 6.5, 6.5), CFrame.new(-8, 1.2, 0) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(80, 150, 200), Enum.Material.Glass, Enum.PartType.Cylinder)
	end

	-- 시설 건물: { 이름, 탭, 위치, 크기, 벽색 }
	local facilities = {
		{ name = "교역소", tab = "trade", pos = Vector3.new(-12, 0, 36), w = 20, d = 12, floors = 1, color = Color3.fromRGB(176, 120, 60), always = true },
		{ name = "주점", tab = "quest", pos = Vector3.new(-12, 0, -36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(120, 76, 44), always = true },
		{ name = "항만청", tab = "route", pos = Vector3.new(8, 0, 58), w = 12, d = 10, floors = 2, color = Color3.fromRGB(90, 110, 140), key = "harbormaster" },
		{ name = "은행", tab = "harbor", pos = Vector3.new(-50, 0, 36), w = 14, d = 12, floors = if sceneLevel >= 4 then 3 else 2, color = Color3.fromRGB(220, 214, 200), key = "bank" },
		{ name = "상인 길드", tab = "trade", pos = Vector3.new(-50, 0, -36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(150, 120, 90), key = "guild" },
		{ name = "학자의 서재", tab = "tech", pos = Vector3.new(-88, 0, 36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(120, 100, 140), always = true },
		{ name = "도서관 (도감)", tab = "codex", pos = Vector3.new(-88, 0, -36), w = 14, d = 12, floors = 2, color = Color3.fromRGB(100, 120, 110), always = true },
	}
	for _, f in facilities do
		if f.always or (f.key and fac[f.key]) then
			-- 발전도가 오를수록 건물이 커지고 벽이 밝고 말끔해진다 (1단계는 낡고 어두운 색)
			local grow = 1.8 + 0.06 * (sceneLevel - 1) -- 방문 건물은 일반 집·주민보다 훨씬 크게(교역소·조선소·주점이 한눈에 보이게): 1단계 1.8배 → 5단계 약 2.04배
			local tone = f.color:Lerp(style.walls[1], 0.5):Lerp(Color3.fromRGB(90, 80, 70), if sceneLevel <= 1 then 0.18 else 0):Lerp(Color3.new(1, 1, 1), 0.05 * (sceneLevel - 1))
			local body = house(folder, f.pos, f.w * grow, f.d * grow, f.floors, style, rng, tone)
			-- 문이 광장(가운데 길) 쪽을 보도록: 위쪽 줄은 -Z, 아래쪽 줄은 +Z 방향 입구
			local doorZ = if f.pos.Z > 0 then f.pos.Z - f.d * grow / 2 - 2 else f.pos.Z + f.d * grow / 2 + 2
			sign(folder, body, f.name, nil, (f.floors * 3 + 6) * grow)
			do
				-- 시설별 외형 단계 (승인된 기존 3D 소품만): 2단계 생활 소품, 3단계 장식, 4단계 깃발·기둥, 5단계 상징물
				local lv = sceneLevel
				local zs = if f.pos.Z > 0 then -1 else 1
				local fx, fz = f.pos.X, doorZ
				local function at(dx, dz) return Vector3.new(fx + dx, 0, fz + zs * dz) end
				if f.name == "교역소" then
					if lv >= 2 then importedModel(folder, "Cargo", "barrel", at(-6, 0), 2.4, false) importedModel(folder, "Cargo", "box-open", at(-8, 0.5), 2.2, false) end
					if lv >= 3 then importedModel(folder, "Town", "stall-red", at(9, 2), 6, false) end
					if lv >= 4 then importedModel(folder, "Castle", "flag-banner-short", at(-10, 1), 8, false) end
					if lv >= 5 then importedModel(folder, "Cargo", "textiles-stack-large-colored", at(7, 0), 2.6, false) importedModel(folder, "Cargo", "gold-bars-stack-large", at(11, 0), 2.2, false) end
				elseif f.name == "주점" then
					if lv >= 2 then lantern(folder, at(-5, 0), 3) end
					if lv >= 3 then importedModel(folder, "Town", "bench_A", at(6, 1), 3.6, false) end
					if lv >= 4 then lantern(folder, at(5, 0), 3) importedModel(folder, "Castle", "flag-banner-short", at(-8, 1), 7, false) end
					if lv >= 5 then importedModel(folder, "Cargo", "pot-stew", at(9, 0), 2.2, false) end
				elseif f.name == "항만청" then
					if lv >= 3 then importedModel(folder, "Castle", "flag-banner-long", at(-8, 0), 9, false) end
					if lv >= 4 then
						for k, part_ in { "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-top" } do
							importedModel(folder, "Castle", part_, Vector3.new(fx + 11, (k - 1) * 6, f.pos.Z), 7, true)
						end
					end
				elseif f.name == "상인 길드" then
					if lv >= 3 then importedModel(folder, "Castle", "flag-banner-long", at(-8, 0), 9, false) end
					if lv >= 4 then for _, dx in { -4, 4 } do importedModel(folder, "Terrain", "column", at(dx, 1.5), 6, false) end end
					if lv >= 5 then importedModel(folder, "Town", "stall-green", at(10, 2), 6, false) end
				elseif f.name == "학자의 서재" or f.name == "도서관 (도감)" then
					if lv >= 2 then lantern(folder, at(-5, 0), 3) end
					if lv >= 4 then for _, dx in { -4, 4 } do importedModel(folder, "Terrain", "column", at(dx, 1.5), 6, false) end end
					if lv >= 5 then importedModel(folder, "Terrain", "statue-column", at(9, 2), 9, true) end
				end
			end
			-- 은행은 항구 발전도에 따라 커진다: 3단계 기둥, 4단계 깃발, 5단계 금괴 더미
			if f.key == "bank" then
				if sceneLevel >= 3 then
					for _, dx in { -5, 0, 5 } do
						importedModel(folder, "Terrain", "column", Vector3.new(f.pos.X + dx, 0, doorZ + (if f.pos.Z > 0 then -1.5 else 1.5)), 6, false)
					end
				end
				if sceneLevel >= 4 then
					importedModel(folder, "Castle", "flag-banner-long", Vector3.new(f.pos.X + 8, 0, doorZ), 9, false)
					importedModel(folder, "Castle", "flag-banner-long", Vector3.new(f.pos.X - 8, 0, doorZ), 9, false)
				end
				if sceneLevel >= 5 then
					importedModel(folder, "Cargo", "gold-bars-stack-large", Vector3.new(f.pos.X + 4, 0, doorZ + (if f.pos.Z > 0 then -3 else 3)), 2.4, false)
				end
			end
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
		local shed = house(folder, Vector3.new(-4, 0, -52), 14 * 1.9, 12 * 1.9, 2, style, rng, Color3.fromRGB(150, 118, 84))
		sign(folder, shed, "조선소", Color3.fromRGB(90, 60, 30), 12)
		prompt(folder, Vector3.new(8, 3, -52), "조선소", "들어가기", "yard", onFacility)
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
		-- 발전도 4단계부터 기둥·깃발이 늘고, 5단계 왕궁 없는 항구에는 같은 자리에 총독 관저가 선다
		if sceneLevel >= 4 then
			for _, z in { -12, 12 } do
				importedModel(folder, "Castle", "flag-banner-long", Vector3.new(px + 18, 0, z), 10, false)
			end
		end
		local palaceTitle = info.palaceName or "왕궁"
		sign(folder, body, palaceTitle, Color3.fromRGB(150, 110, 40), 16)
		prompt(folder, Vector3.new(px + 20, 3, 0), palaceTitle, "알현하기", "harbor", onFacility)
	end

	-- 성당 종탑 (유럽·식민지 문화권만. 다른 문화권은 지역 대표 건축물을 따로 세운다)
	if CHURCH_KEYS[currentKey] and sceneLevel < 2 then
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

	-- 광장의 이야기 NPC
	if (info.storyCount or 0) > 0 then
		local n = villager(folder, Vector3.new(2, 0, -8), math.pi / 2, Color3.fromRGB(150, 40, 60), rng, "Rogue_Hooded", true)
		local npcPart = n and (n:FindFirstChild("Head") or n:FindFirstChildWhichIsA("BasePart", true))
		if npcPart then sign(folder, npcPart, "! 이야기", Color3.fromRGB(180, 120, 30), 4) end
		prompt(folder, Vector3.new(2, 3, -8), "수상한 손님", "이야기 듣기", "harbor", onFacility)
	end
	-- 광장을 오가는 주민
	local walkers = {}
	for _ = 1, 4 do
		local v = villager(folder, Vector3.new(rng:NextNumber(-60, 8), 0, rng:NextNumber(-14, 14)), rng:NextNumber(0, math.pi * 2), Color3.fromRGB(rng:NextInteger(60, 200), rng:NextInteger(60, 160), rng:NextInteger(40, 140)), rng)
		if v then
			table.insert(walkers, { model = v, base = v:GetPivot(), len = rng:NextNumber(8, 18), speed = rng:NextNumber(1.6, 2.6), phase = rng:NextNumber(0, 10) })
		end
	end
	-- 주민이 광장을 천천히 오간다 (끝에서 몸을 돌려 되돌아온다)
	local walkConn = RunService.Heartbeat:Connect(function()
		local now = os.clock()
		for _, w in walkers do
			if w.mode == "stay" then
				if w.model.Parent then
					Pose.work(w.model, w.kind, now + w.phase)
				end
			elseif w.mode == "animal" then
				if w.model.Parent then
					local t = now + w.phase
					local pitch, bob = 0, 0
					if w.akind == "graze" then
						pitch = math.max(0, math.sin(t * 0.7)) * 0.22
					elseif w.akind == "peck" then
						pitch = math.max(0, math.sin(t * 3.1)) * 0.3
					elseif w.akind == "tail" then
						pitch = math.sin(t * 5) * 0.04
						bob = math.abs(math.sin(t * 2.2)) * 0.05
					else
						bob = math.sin(t * 1.3) * 0.03
					end
					if w.span then
						local u = t * w.rate
						local turn = if math.cos(u) < 0 then math.pi else 0
						bob = math.abs(math.sin(u * 6)) * 0.06
						w.model:PivotTo(w.base * CFrame.new(0, bob, -math.sin(u) * w.span) * CFrame.Angles(0, turn, 0))
					else
						w.model:PivotTo(w.base * CFrame.Angles(pitch, 0, 0) + Vector3.new(0, bob, 0))
					end
				end
			elseif w.mode == "circle" then
				if w.model.Parent then
					local a = (now + w.phase) * w.speed / w.r
					local pos = Vector3.new(w.cx + math.cos(a) * w.r, 0, w.cz + math.sin(a) * w.r)
					local hop = math.abs(math.sin(now * 7 + w.phase)) * 0.25
					local ahead = Vector3.new(w.cx + math.cos(a + 0.1) * w.r, 0, w.cz + math.sin(a + 0.1) * w.r)
					w.model:PivotTo(CFrame.lookAt(pos + Vector3.new(0, hop, 0), ahead + Vector3.new(0, hop, 0)) )
					Pose.walkR15(w.model, now * w.speed * 5 + w.phase, true)
				end
			elseif w.model.Parent then
				-- 끝에 닿으면 잠시 멈춰 서서(대화·둘러보기) 천천히 몸을 돌린 뒤 되돌아간다
				local cycle = w.len / w.speed
				local dwell = w.dwell or 2.2
				local total = (cycle + dwell) * 2
				local t = (now + w.phase) % total
				local d, yaw, moving = 0, 0, true
				local function ease(x) x = math.clamp(x, 0, 1) return x * x * (3 - 2 * x) end
				if t < cycle then
					d = t / cycle * w.len
				elseif t < cycle + dwell then
					d, yaw, moving = w.len, math.pi * ease((t - cycle) / (dwell * 0.6)), false
				elseif t < 2 * cycle + dwell then
					d, yaw = (1 - (t - cycle - dwell) / cycle) * w.len, math.pi
				else
					d, yaw, moving = 0, math.pi + math.pi * ease((t - 2 * cycle - dwell) / (dwell * 0.6)), false
				end
				local rot = w.base - w.base.Position
				local pos = w.base.Position + w.base.LookVector * d
				local bob = if moving then math.abs(math.sin(now * 6 + w.phase)) * 0.15 else 0
				w.model:PivotTo(CFrame.new(pos + Vector3.new(0, bob, 0)) * CFrame.Angles(0, yaw, 0) * rot)
				Pose.walkR15(w.model, now * w.speed * 2.5 + w.phase, moving)
				if not moving then
					Pose.work(w.model, w.idleKind or "talk", now + w.phase)
				elseif w.kind then
					Pose.work(w.model, w.kind, now + w.phase)
				elseif w.elder then
					Pose.work(w.model, "stoop", now)
				end
			end
		end
	end)
	folder.Destroying:Connect(function()
		walkConn:Disconnect()
	end)
	-- 가로등
	for x = -40, 10, 25 do
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
			ground.Material = if frosted then Enum.Material.Snow else Enum.Material.Grass
			ground.Color = if frosted then season.ground elseif temperate then style.ground:Lerp(season.ground, 0.48) else style.ground
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
		if workspace:GetAttribute("VoyageActive") or workspace:GetAttribute("ShotCF") then
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
	-- 부두: 짐과 대포
	do
		for i, x in { 30, 36, 44, 52 } do
			importedModel(folder, "Naval", "chest", Vector3.new(x, 2, if i % 2 == 0 then 3.4 else -3.4), 2.4, false)
		end
		importedModel(folder, "Naval", "cannon", Vector3.new(40, 2, -3.6), 3.4, false)
		importedModel(folder, "Naval", "cannon", Vector3.new(58, 2, 3.6), 3.4, false)
		-- 하역 도르래·화물·소형 선박은 실물 모델만 표시하고 기존 보행·교역 판정은 유지한다.
		importedModel(folder, "Naval", "pulley-crate", Vector3.new(66, 2, 3.5), 4.2, false)
		importedModel(folder, "Naval", "pulley", Vector3.new(74, 2, -3.5), 4.8, false)
		importedModel(folder, "Naval", "cargo-pile-a", Vector3.new(28, 2, -3.2), 3.6, false)
		importedModel(folder, "Naval", "cargo-pile-b", Vector3.new(70, 2, 3.1), 3.8, false)
		-- 신규 CC0 원본 화물통: 미등록이면 없는 상태로 유지하며 임시 도형으로 대체하지 않는다.
		importedModel(folder, "Cargo", "barrel", Vector3.new(82, 2, 3.3), 3.1, false)
		importedModel(folder, "Cargo", "barrel", Vector3.new(87, 2, -3.3), 2.8, false)
		importedModel(folder, "Naval", "buoy", Vector3.new(105, 0.8, -25), 2.5, false)
		importedModel(folder, "Naval", "buoy-flag", Vector3.new(112, 0.8, 25), 2.5, false)
		importedModel(folder, "Naval", "boat-sail-a", Vector3.new(112, 0.8, 48), 14, false)
		importedModel(folder, "Naval", "boat-fishing-small", Vector3.new(116, 0.8, -48), 10, false)
	end
	-- 광장: 시장 가판대, 우물, 수레, 벤치
	do
		for i, spot in { Vector3.new(-18, 0, -13), Vector3.new(-18, 0, 13), Vector3.new(2, 0, 14) } do
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
		local stalls = { Vector3.new(-18, 2.5, -13), Vector3.new(-18, 2.5, 13), Vector3.new(2, 2.5, 14) }
		for index, good in showcase do
			local stand = stalls[math.ceil(index / 4)]
			local mesh = GOOD_MESH[good]
			importedModel(folder, mesh[1], mesh[2], stand + Vector3.new(((index - 1) % 4 - 1.5) * 1.7, 0, 0), 1.8, false, mesh[3])
		end
		-- 큰길 가로등과 울타리, 광장 분수
		for _, x in { -30, -75, -120 } do
			lantern(folder, Vector3.new(x, 0, 7), 3)
			lantern(folder, Vector3.new(x, 0, -7), 3)
		end
		importedModel(folder, "Town", "fountain-square", Vector3.new(-10, 0, 0), 7, true)
		importedModel(folder, "Town", "stall-bench", Vector3.new(-6, 0, 13), 4, false)
		importedModel(folder, "Town", "stall-stool", Vector3.new(-12, 0, 11), 2, false)
		-- 조선소가 있는 큰 항구는 항구 어귀에 감시탑을 세운다
		if PortData.Ports[info.portId] and PortData.Ports[info.portId].shipyard then
			importedModel(folder, "Naval", "tower-complete-large", Vector3.new(40, 0, -46), 12, true)
			importedModel(folder, "Naval", "tower-complete-large", Vector3.new(40, 0, 46), 12, true)
			importedModel(folder, "Castle", "flag-banner-long", Vector3.new(30, 0, -28), 5, false)
			importedModel(folder, "Castle", "flag-banner-long", Vector3.new(30, 0, 28), 5, false)
		end
		importedModel(folder, "Interior", "tablecrosscloth", Vector3.new(-30, 0, -13), 4.8, false)
		importedModel(folder, "Interior", "coatrack", Vector3.new(-36, 0, -23), 3.4, false)
		importedModel(folder, "Interior", "rugrounded", Vector3.new(-10, 0, -18), 4.8, false)
		importedModel(folder, "Town", "village-well", Vector3.new(-30, 0, 15), 5.5, true)
		importedModel(folder, "Town", "cart", Vector3.new(-24, 0, 19), 5.5, false)
		importedModel(folder, "Town", "cart", Vector3.new(-26, 0, -19), 5.5, false)
		importedModel(folder, "Town", "bench_A", Vector3.new(-8, 0, 9), 4.5, false)
		importedModel(folder, "Town", "bench_B", Vector3.new(-8, 0, -9), 4.5, false)
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

	-- 동료: R15 NPC로 플레이어 뒤를 따라다닌다 (보기용, 효과는 서버의 동료 시스템)
	local followers = {}
	do
		local looks = {
			c_merian = { "Rogue", Color3.fromRGB(176, 96, 120) }, c_halley = { "Knight", Color3.fromRGB(60, 80, 140) },
			c_leeuwenhoek = { "Mage", Color3.fromRGB(110, 90, 70) }, c_linnaeus = { "Rogue_Hooded", Color3.fromRGB(70, 120, 84) },
			c_boyle = { "Mage", Color3.fromRGB(130, 70, 70) }, c_papin = { "Barbarian", Color3.fromRGB(96, 100, 110) },
			t_navigator = { "Knight", Color3.fromRGB(40, 90, 120) }, t_gunner = { "Barbarian", Color3.fromRGB(120, 60, 50) },
			t_purser = { "Rogue", Color3.fromRGB(90, 80, 50) }, t_surgeon = { "Mage", Color3.fromRGB(230, 230, 235) },
			t_helmsman = { "Knight", Color3.fromRGB(50, 70, 110) }, t_mate = { "Rogue", Color3.fromRGB(120, 60, 80) },
			t_boatswain = { "Barbarian", Color3.fromRGB(90, 70, 50) }, t_master_gunner = { "Barbarian", Color3.fromRGB(140, 50, 50) },
		}
		for i, c in info.companions or {} do
			local look = looks[c.id] or { "Rogue", Color3.fromRGB(120, 100, 80) }
			local v = villager(folder, Vector3.new(-6 - i * 3, 0, 8 + i * 2), math.pi / 2, look[2], rng, look[1])
			if v then
				v.Name = "Companion_" .. c.id
				local tag = v:FindFirstChild("Head") or v:FindFirstChildWhichIsA("BasePart", true)
				if tag then sign(folder, tag, c.name, Color3.fromRGB(40, 90, 150), 4) end
				local at = v:GetPivot().Position
				table.insert(followers, { model = v, index = i, pos = Vector3.new(at.X, 0, at.Z), baseY = at.Y, phase = i * 1.7 })
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
			if tag then sign(folder, tag, v.name .. " (" .. v.role .. ")", Color3.fromRGB(110, 80, 30), 4) end
		end
	end
	local followConn
	if #followers > 0 then
		local Players = game:GetService("Players")
		local last = os.clock()
		followConn = RunService.Heartbeat:Connect(function()
			local now = os.clock()
			local dt = math.min(now - last, 0.1)
			last = now
			local char = Players.LocalPlayer and Players.LocalPlayer.Character
			local root = char and char:FindFirstChild("HumanoidRootPart")
			if not root then return end
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
					if dist > 60 then
						f.pos = target
					elseif dist > 0.8 then
						f.pos += delta.Unit * math.min(dist, (6 + dist * 1.5) * dt)
					end
					local moving = dist > 1.2
					local faceDir = if moving then delta.Unit else look
					local bob = if moving then math.abs(math.sin(now * 7 + f.phase)) * 0.12 else 0
					local at = f.pos + Vector3.new(0, f.baseY + bob, 0)
					f.model:PivotTo(CFrame.lookAt(at, at + faceDir))
					Pose.walkR15(f.model, now * 9 + f.phase, moving)
				end
			end
		end)
		folder.Destroying:Connect(function()
			followConn:Disconnect()
		end)
	end

	densify(folder, info, style, rng, walkers, (PortData.Ports[info.portId] and PortData.Ports[info.portId].produces) or {})
	placeLandmarks(folder, info, style, rng, onFacility, walkers)
	placeSignature(folder, info)

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
						em.Texture = "rbxasset://textures/particles/smoke_main.dds"
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

	return { folder = folder, spawn = CFrame.new(-2, 4, 10) * CFrame.Angles(0, math.rad(90), 0), controls = controls }
end

-- 항해 장면(VoyageScene)에서 같은 배 모델을 쓰기 위해 내보낸다
PortScene.makeShip = buildShip
-- 항해 장면 등에서 승인된 모델 하나를 놓는다 (없으면 nil)
function PortScene.placeModel(parent, kind, asset, pos, size)
	return importedModel(parent, kind, asset, pos, size, false)
end

return PortScene

