--!nonstrict
-- 항구 3D 장면 (클라이언트 전용, 보기용). 도형(Part)으로 항구 마을·부두·배·갈매기를 만든다.
-- 항구마다 지역 양식(북유럽 / 지중해)과 시설(교역소, 조선소, 은행, 길드, 왕궁, 항만청)이 달라진다.
-- 판정에는 쓰이지 않는다. 시설 앞의 ProximityPrompt를 누르면 onFacility(탭 id)가 불린다.

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Pose = require(script.Parent:WaitForChild("Pose"))
local PortData = require(script.Parent:WaitForChild("Ports"))

local PortScene = {}

local MED = { cape_town = true, malaga = true, gibraltar = true, cartagena = true, trieste = true, messina = true, corfu = true, palma = true, cagliari = true, ajaccio = true, toulon = true, syracuse = true, ancona = true, split = true, thessaloniki = true, candia = true, rhodes = true, famagusta = true, smyrna = true, las_palmas = true, funchal = true, ponta_delgada = true, barcelona = true, valencia = true, palermo = true, valletta = true, ragusa = true, athens = true, cadiz = true, porto = true, lisbon = true, seville = true, marseille = true, genoa = true, venice = true, livorno = true, naples = true }

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

-- 지역별 마을 색: 네덜란드/한자는 붉은 벽돌, 북유럽은 색칠한 목조, 영국은 회색 돌과 갈색 벽돌
local function variant(base, walls, roofs, ground, street, pitch)
	return {
		walls = walls, roofs = roofs or base.roofs, roofPitch = pitch or base.roofPitch,
		ground = ground or base.ground, street = street or base.street,
	}
end
local C = Color3.fromRGB
STYLE.brick = variant(STYLE.north,
	{ C(160, 70, 52), C(176, 84, 60), C(142, 62, 48), C(196, 150, 110), C(224, 214, 196) },
	{ C(70, 56, 52), C(52, 48, 50) }, nil, C(130, 112, 100), 1.25)
STYLE.nordic = variant(STYLE.north,
	{ C(168, 52, 44), C(226, 184, 70), C(236, 232, 222), C(70, 110, 140), C(190, 100, 60) },
	{ C(56, 50, 48), C(96, 52, 44) }, C(86, 120, 78), C(128, 124, 118), 1.15)
STYLE.stone = variant(STYLE.north,
	{ C(150, 148, 140), C(176, 168, 150), C(128, 120, 108), C(200, 192, 176), C(150, 110, 84) },
	{ C(78, 80, 88), C(60, 62, 70) }, C(92, 124, 76), C(118, 116, 112), 0.9)
STYLE.desert = variant(STYLE.med,
	{ C(226, 204, 160), C(214, 186, 140), C(238, 222, 190), C(200, 170, 124), C(244, 236, 214) },
	{ C(210, 180, 130), C(196, 164, 116) }, C(204, 184, 132), C(206, 190, 150), 0.12)
STYLE.tropic = variant(STYLE.med,
	{ C(184, 140, 96), C(160, 110, 74), C(204, 164, 112), C(140, 96, 64), C(226, 196, 150) },
	{ C(150, 120, 70), C(130, 100, 60) }, C(112, 150, 70), C(176, 150, 112), 0.55)
local REGION = {
	san_francisco = "stone",
	sitka = "nordic", vancouver = "nordic",
	sydney = "tropic", hobart = "tropic", perth = "tropic", darwin = "tropic", auckland = "tropic", port_moresby = "tropic", suva = "tropic", tahiti = "tropic", honolulu = "tropic", guam = "tropic", acapulco = "tropic", panama = "tropic", guayaquil = "tropic", callao = "tropic", valparaiso = "tropic",
	charleston = "tropic", new_orleans = "tropic", nassau = "tropic", havana = "tropic", veracruz = "tropic", campeche = "tropic", kingston = "tropic", santo_domingo = "tropic", san_juan = "tropic", bridgetown = "tropic", port_of_spain = "tropic", la_guaira = "tropic", cartagena_indias = "tropic", portobelo = "tropic", paramaribo = "tropic", belem = "tropic", recife = "tropic", salvador = "tropic", rio = "tropic", montevideo = "tropic", buenos_aires = "tropic",
	halifax = "stone", st_johns = "stone", boston = "stone", new_york = "stone", philadelphia = "stone", quebec = "stone",
	nagasaki = "brick", osaka = "brick", edo = "brick",
	hakodate = "nordic",
	macau = "stone", canton = "stone", amoy = "stone", ningbo = "stone", shanghai = "stone", tianjin = "stone", busan = "stone", incheon = "stone",
	manila = "tropic", hoi_an = "tropic", bangkok = "tropic", rangoon = "tropic", singapore = "tropic", batavia = "tropic", makassar = "tropic", ternate = "tropic", ambon = "tropic", banda = "tropic", brunei = "tropic", tainan = "tropic",
	aden = "desert", mocha = "desert", jeddah = "desert", muscat = "desert", bandar_abbas = "desert", basra = "desert",
	mozambique = "tropic", kilwa = "tropic", mombasa = "tropic", zanzibar = "tropic", mogadishu = "tropic", goa = "tropic", calicut = "tropic", cochin = "tropic", colombo = "tropic", madras = "tropic", calcutta = "tropic", malacca = "tropic", port_louis = "tropic", diu = "tropic", surat = "tropic",
	praia = "tropic", saint_louis = "tropic", dakar = "tropic", bissau = "tropic", freetown = "tropic", elmina = "tropic", ouidah = "tropic",
	lagos = "tropic", calabar = "tropic", sao_tome = "tropic", luanda = "tropic", benguela = "tropic", st_helena = "tropic",
	casablanca = "desert", safi = "desert", agadir = "desert", cape_town = "med",
	beirut = "desert", damietta = "desert", bone = "desert",
	acre = "desert", oran = "desert", benghazi = "desert",
	riga = "brick", tallinn = "brick", koenigsberg = "brick", visby = "stone", helsinki = "nordic", st_petersburg = "stone",
	algiers = "desert", tunis = "desert", tripoli = "desert", alexandria = "desert", istanbul = "desert", tangier = "desert",
	amsterdam = "brick", rotterdam = "brick", antwerp = "brick", hamburg = "brick", lubeck = "brick", gdansk = "brick",
	bergen = "nordic", oslo = "nordic", stockholm = "nordic", gothenburg = "nordic", copenhagen = "nordic",
	london = "stone", edinburgh = "stone", glasgow = "stone", dublin = "stone", plymouth = "stone", hull = "stone",
}

-- 특산품 진열용 3D 모델 (없는 상품은 상자로 대신한다)
local GOOD_MESH = {
	cheese = { "Cargo", "cheese" }, wine = { "Cargo", "wine-red" }, fish = { "Cargo", "fish-large" }, wool = { "Cargo", "textiles-stack-small" },
	cloth = { "Cargo", "textiles-stack-large" }, silk = { "Cargo", "textiles-stack-large-colored" }, grain = { "Cargo", "food-flour" },
	iron = { "Cargo", "iron-bars" }, copper = { "Cargo", "copper-bars" }, silver = { "Cargo", "silver-bars" }, gold = { "Cargo", "gold-bars" },
	gems = { "Cargo", "gems-pile-small" }, pearls = { "Cargo", "gem-small" }, honey = { "Cargo", "honey" }, pepper = { "Cargo", "pepper-mill" },
	olive_oil = { "Cargo", "bottle-oil" }, timber = { "Cargo", "wood-log-stack" }, mahogany = { "Cargo", "wood-planks-stack-small" },
	coffee = { "Cargo", "cup-coffee" }, tea = { "Cargo", "cup-tea" }, cocoa = { "Cargo", "chocolate" }, rum = { "Cargo", "barrel" },
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

local function sign(parent, adornee, text, color, height)
	local bb = Instance.new("BillboardGui")
	bb.Adornee = adornee
	bb.Size = UDim2.fromOffset(210, 46)
	bb.StudsOffset = Vector3.new(0, (height or 4) + 2.5, 0)
	bb.AlwaysOnTop = false
	bb.LightInfluence = 0
	bb.MaxDistance = 90
	local l = Instance.new("TextLabel")
	l.Size = UDim2.fromScale(1, 1)
	l.BackgroundColor3 = color or Color3.fromRGB(30, 34, 44)
	l.BackgroundTransparency = 0.05
	l.TextColor3 = Color3.new(1, 1, 1)
	l.Font = Enum.Font.GothamBold
	l.TextScaled = false
	l.TextSize = 26
	l.TextWrapped = false
	l.TextTruncate = Enum.TextTruncate.AtEnd
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
		if kind == "People" then
			Pose.relaxArms(m)
		end
	end)
	if not ok then
		warn("[MareScientia] 모델 수입본 배치 오류", kind, asset, err)
		m:Destroy()
		return nil
	end
	return m
end

-- 항구 주민·시설 NPC: 공통 R15 Humanoid 관절 모델 사용.
local KEEPER_ROLE = {
	["교역소"] = "Rogue", ["주점"] = "Barbarian", ["항만청"] = "Knight", ["은행"] = "Mage",
	["상인 길드"] = "Rogue_Hooded", ["학자의 서재"] = "Mage", ["도서관 (도감)"] = "Mage",
}
local function villager(parent, pos, facing, coat, rng, role)
	role = role or ({ "Knight", "Barbarian", "Mage", "Rogue", "Rogue_Hooded" })[rng:NextInteger(1, 5)]
	local figure = Pose.createR15(parent, pos, facing, coat, rng, role, 5.8)
	if figure then figure.Name = "Villager" end
	return figure
end

-- 캐릭터(약 5스터드)에 비해 집이 장난감처럼 작아 보여서 전체적으로 키운다 (대신 간격도 같이 넓힌다)
local HOUSE_SCALE = 1.45

local function house(parent, pos, w, d, floors, style, rng, wallColor)
	-- 벽 색을 먼저 정해, 수입한 집 메쉬 전체에 같은 따뜻한 색을 입힌다 (회색 맨몸 집 방지)
	local tintColor = wallColor or style.walls[rng:NextInteger(1, #style.walls)]
	-- 위치로 정한 크기 변주(0.86~1.08배)와 180도 뒤집기로 같은 집이 반복돼 보이지 않게 한다
	local seed = math.floor(math.abs(pos.X * 3 + pos.Z * 5))
	local variation = 0.86 + (seed % 7) * 0.037
	-- 층수가 높을수록 집도 키워서 1·2·3층이 실루엣으로 구분되게 한다 (0.92~1.12배)
	variation *= 0.92 + (math.clamp(floors or 2, 1, 3) - 1) * 0.1
	-- (Town/house_chimney, house_door 는 집 전체가 아니라 굴뚝·문 부품이라 집 본체로 쓰지 않는다)
	local variant = "house"
	local mesh = importedModel(parent, "Town", variant, pos, math.max(w, d) * variation * HOUSE_SCALE, true, tintColor)
	if mesh then
		mesh.Name = "HarborHouse"
		if (seed // 7) % 2 == 1 then
			local c = mesh:GetBoundingBox().Position
			mesh:PivotTo(CFrame.new(c) * CFrame.Angles(0, math.pi, 0) * CFrame.new(-c) * mesh:GetPivot())
		end
		-- 집마다 같은 실루엣이 되지 않게, 위치로 정한 일부 집 용마루에 승인된 굴뚝(Town/chimney)을 얹는다
		local size = math.max(w, d) * variation
		-- 네 채 중 한 채는 옆에 작은 별채를 붙여 ㄱ자 집처럼 보이게 한다
		if seed % 4 == 1 then
			local annex = importedModel(parent, "Town", "house", pos + Vector3.new(size * 0.95, 0, size * 0.25), size * 0.62 * HOUSE_SCALE, true, tintColor)
			if annex then
				annex.Name = "HarborAnnex"
			end
		end
		if variant ~= "house_chimney" and math.floor(math.abs(pos.X * 7 + pos.Z * 13)) % 2 == 0 then
			local chim = importedModel(parent, "Town", "chimney", pos + Vector3.new(0, size * 0.7, 0), size * 0.4, false, Color3.fromRGB(122, 98, 84))
			if chim then chim.Name = "HarborChimney" end
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

local function rotateAround(m, pos, yaw)
	if m then
		m:PivotTo(CFrame.new(pos) * CFrame.Angles(0, yaw, 0) * CFrame.new(-pos) * m:GetPivot())
	end
end

local function strip(folder, style, cx, cz, sx, sz)
	local p = part(folder, Vector3.new(sx, 0.2, sz), CFrame.new(cx, 0.1, cz), style.street, Enum.Material.Cobblestone)
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

local function densify(folder, info, style, rng, walkers, made)
	local key = styleKeyOf(style)
	local palm = palmOk(info.portId, style)
	local cold = not palm
	local port = PortData.Ports[info.portId]
	local big = (port and port.shipyard) or false
	local streetsX = { -50, -90, -130 }
	local function nearStreet(x, w)
		for _, sx in streetsX do
			if math.abs(x - sx) < w / 2 + 3.5 then return true end
		end
		return false
	end

	-- 1) 건물 밀도: 골목을 더 깔고 집을 빽빽하게 채운다 (뒷줄일수록 높고 크게)
	for _, side in { 1, -1 } do
		strip(folder, style, -92, side * 38, 130, 6)
		strip(folder, style, -92, side * 73, 130, 4)
		strip(folder, style, -98, side * 87, 140, 5)
		strip(folder, style, -98, side * 101, 140, 5)
		strip(folder, style, -98, side * 115, 140, 5)
	end
	for _, sx in streetsX do
		strip(folder, style, sx, 0, 5, 250)
	end
	local rows = {
		{ z = 20, w0 = 7, w1 = 9, d = 7, fl = 1, from = -74, step = 10 },
		{ z = 48, w0 = 6, w1 = 8, d = 8, fl = 2, from = -38, step = 16, off = 8 },
		{ z = 80, w0 = 8, w1 = 11, d = 8, fl = 2, from = -26, step = 12 },
		{ z = 108, w0 = 10, w1 = 13, d = 9, fl = 3, from = -26, step = 14 },
	}
	local smokers = 0
	for _, row in rows do
		for _, side in { 1, -1 } do
			local x = row.from - (row.off or 0)
			while x > -168 do
				local w = rng:NextNumber(row.w0, row.w1)
				if not nearStreet(x, w * HOUSE_SCALE) and rng:NextNumber() < 0.93 then
					-- 격자 느낌을 깨기 위해 앞뒤 위치·깊이·층수를 줄마다 흩뜨린다
					local z = side * (row.z + rng:NextNumber(-2.5, 2.5))
					local pos = Vector3.new(x + rng:NextNumber(-2.5, 2.5), 0, z)
					local fl = row.fl
					local r = rng:NextNumber()
					if r < 0.2 and fl > 1 then fl -= 1 elseif r > 0.88 and fl < 3 then fl += 1 end
					house(folder, pos, w, row.d + rng:NextNumber(-1, 1.5), fl, style, rng)
					if smokers < 28 and rng:NextNumber() < 0.25 then
						smokers += 1
						smokeOn(folder, pos + Vector3.new(w * 0.2, row.fl * 6 + 4, 0))
					end
				end
				x -= row.step * HOUSE_SCALE + rng:NextNumber(-2, 3)
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
		for x = -40, -150, -44 do
			importedModel(folder, "Town", "lantern", Vector3.new(x, 0, side * 40.8), 3, false)
		end
	end

	-- 2) 광장 중심: 동상·기둥·깃발, 시장 가판대를 더 둘러 세운다
	importedModel(folder, "Terrain", "statue-column", Vector3.new(-26, 0, 0), 12, true)
	for _, c in { Vector3.new(-26, 0, 8), Vector3.new(-26, 0, -8), Vector3.new(-17, 0, 8), Vector3.new(-17, 0, -8) } do
		importedModel(folder, "Town", "pillar-stone", c, 5, false)
	end
	for _, z in { -24, 24 } do
		for _, x in { -2, -22, -42, -62 } do
			importedModel(folder, "Castle", "flag-banner-short", Vector3.new(x, 0, z), 7, false)
		end
	end
	local extraStalls = { Vector3.new(-44, 0, 19), Vector3.new(-44, 0, -19), Vector3.new(-70, 0, 19), Vector3.new(-70, 0, -19), Vector3.new(-6, 0, -20), Vector3.new(-6, 0, 22) }
	for i, spot in extraStalls do
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

	-- 5) 움직임: 골목을 오가는 주민 14명
	for i = 1, 14 do
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
	if key == "med" then
		for z = -24, 24, 8 do
			importedModel(folder, "Terrain", "column", Vector3.new(lx, 0, z), 12, true)
		end
		importedModel(folder, "Terrain", "statue-head", Vector3.new(lx - 10, 0, 0), 14, true)
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

	-- 7) 외곽: 성벽·망루로 마을을 두르고, 그 밖은 언덕과 숲으로 막는다
	local WZ, WX = 150, -204
	for _, side in { 1, -1 } do
		local x = -22
		while x > WX do
			local m = importedModel(folder, "Castle", "wall", Vector3.new(x, 0, side * WZ), 12.5, true)
			if not m then m = importedModel(folder, "Naval", "castle-wall", Vector3.new(x, 0, side * WZ), 12.5, true) end
			x -= 12
		end
		for _, tx in { -22, -80, -140, WX } do
			importedModel(folder, "Naval", "tower-watch", Vector3.new(tx, 0, side * WZ), 16, true)
		end
	end
	local z = -WZ
	while z <= WZ do
		local m = importedModel(folder, "Castle", if z == -18 or z == 18 then "wall-narrow-gate" else "wall", Vector3.new(WX, 0, z), 12.5, true)
		if not m then m = importedModel(folder, "Naval", "castle-wall", Vector3.new(WX, 0, z), 12.5, true) end
		rotateAround(m, Vector3.new(WX, 0, z), math.pi / 2)
		z += 12
	end
	importedModel(folder, "Naval", "tower-watch", Vector3.new(WX, 0, 0), 16, true)
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
	local trees = if cold then { "tree-pinedefaulta", "tree-oak", "tree_large", "tree-high" } else { "palm-detailed-straight", "palm-bend", "tree-crooked", "tree_large" }
	for i = 1, 150 do
		local side = if i % 2 == 0 then 1 else -1
		local pos = Vector3.new(rng:NextNumber(-262, -10), 0, side * rng:NextNumber(158, 245))
		local pick = trees[rng:NextInteger(1, #trees)]
		local kind = if pick:find("palm") or pick:find("tree-pine") or pick:find("tree-oak") then (if pick:find("palm") then "Naval" else "Terrain") else "Town"
		importedModel(folder, kind, pick, pos, rng:NextNumber(8, 14), false)
	end
	for i = 1, 30 do
		local pos = Vector3.new(-212 - rng:NextNumber(0, 40), 0, rng:NextNumber(-150, 150))
		importedModel(folder, "Terrain", trees[1] == "tree-pinedefaulta" and "tree-pinedefaulta" or "tree-oak", pos, rng:NextNumber(8, 13), false)
	end
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
	local style = if MED[info.portId] then STYLE.med else (STYLE[REGION[info.portId] or "north"] or STYLE.north)
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
		fish = "food-barrel-fish", cheese = "cheese", wine = "wine-red",
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
			local x = -30 - col * 16 * HOUSE_SCALE
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
		local npcPart = n and (n:FindFirstChild("Head") or n:FindFirstChildWhichIsA("BasePart", true))
		if npcPart then sign(folder, npcPart, "! 이야기", Color3.fromRGB(180, 120, 30), 4) end
		prompt(folder, Vector3.new(2, 3, -8), "수상한 손님", "이야기 듣기", "harbor", onFacility)
	end
	-- 광장을 오가는 주민
	local walkers = {}
	for _ = 1, 8 do
		local v = villager(folder, Vector3.new(rng:NextNumber(-60, 8), 0, rng:NextNumber(-14, 14)), rng:NextNumber(0, math.pi * 2), Color3.fromRGB(rng:NextInteger(60, 200), rng:NextInteger(60, 160), rng:NextInteger(40, 140)), rng)
		if v then
			table.insert(walkers, { model = v, base = v:GetPivot(), len = rng:NextNumber(8, 18), speed = rng:NextNumber(1.6, 2.6), phase = rng:NextNumber(0, 10) })
		end
	end
	-- 주민이 광장을 천천히 오간다 (끝에서 몸을 돌려 되돌아온다)
	local walkConn = RunService.Heartbeat:Connect(function()
		local now = os.clock()
		for _, w in walkers do
			if w.model.Parent then
				local cycle = w.len / w.speed
				local u = ((now + w.phase) % (cycle * 2)) / cycle -- 0..2
				local forward = u < 1
				local d = if forward then u * w.len else (2 - u) * w.len
				local rot = w.base - w.base.Position
				local dir = w.base.LookVector
				local pos = w.base.Position + dir * d
				local bob = math.abs(math.sin(now * 6 + w.phase)) * 0.15
				local turn = if forward then CFrame.new() else CFrame.Angles(0, math.pi, 0)
				w.model:PivotTo(CFrame.new(pos + Vector3.new(0, bob, 0)) * turn * rot)
				Pose.walkR15(w.model, now * w.speed * 2.5 + w.phase, true)
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
	-- 하늘·빛: 늦은 오후의 따뜻한 바다 분위기
	do
		local Lighting = game:GetService("Lighting")
		Lighting.ClockTime = 13.5
		Lighting.Brightness = 2.0
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
			cc.Contrast = 0.04
			cc.TintColor = Color3.fromRGB(255, 255, 255)
			cc.Parent = Lighting
			local bloom = Instance.new("BloomEffect")
			bloom.Name = "MareBloom"
			bloom.Intensity = 0.2
			bloom.Size = 28
			bloom.Threshold = 2.2
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
			if palmOk(info.portId, style) then
				importedModel(folder, "Naval", "palm-detailed-straight", Vector3.new(13, 0, z), 6.5, false)
				importedModel(folder, "Naval", "palm-bend", Vector3.new(17, 0, z + 5), 7.5, false)
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
			importedModel(folder, "Town", "lantern", Vector3.new(x, 0, 7), 3, false)
			importedModel(folder, "Town", "lantern", Vector3.new(x, 0, -7), 3, false)
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
-- 항해 장면 등에서 승인된 모델 하나를 놓는다 (없으면 nil)
function PortScene.placeModel(parent, kind, asset, pos, size)
	return importedModel(parent, kind, asset, pos, size, false)
end

return PortScene

