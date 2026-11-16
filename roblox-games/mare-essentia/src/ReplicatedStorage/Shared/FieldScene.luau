--!nonstrict
-- 파일명: FieldScene.luau
-- 필드 탐험 장면 (클라이언트 전용). 탐험 지점에 도착하면 걸어 다니며 발견물을 조사하고,
-- 길을 막는 적을 공격 버튼으로 물리친다. 이 장면은 연출과 위험 부담이고,
-- 도감 카드 발견과 보상은 장면이 끝난 뒤 서버(Explore)가 판정한다.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Pose = require(script.Parent:WaitForChild("Pose"))
local AC = require(script.Parent:WaitForChild("ActionCombat"))
local AssetIds = require(script.Parent:WaitForChild("AssetIds"))
local JobSkills = require(script.Parent:WaitForChild("JobSkills"))
local Weapons = require(script.Parent:WaitForChild("Weapons"))
local Specialties = require(script.Parent:WaitForChild("Specialties"))
local Ports = require(script.Parent:WaitForChild("Ports"))
local Cultures = require(script.Parent:WaitForChild("PortCultures"))
-- 마력숲과 같은 공용 전투 이펙트(타격·치명타·회피·공격 예고). 못 읽어도 기존 입자 효과로 돌아간다.
local okVfx, CommonVFX = pcall(function()
	return require(script.Parent:WaitForChild("CommonVFX", 5))
end)
if not okVfx then
	CommonVFX = nil
end

-- 몸 움직임: 마력숲과 같은 공용 R15 모션(CommonMotion)을 관절에 얹는다. 못 읽으면 예전 방식(Pose)으로 돌아간다.
local okFM, FM = pcall(function()
	return require(script.Parent:WaitForChild("FieldMotion", 5))
end)
if not okFM then
	FM = nil
end

-- 버튼 그림: 마력숲과 같은 원본 아이콘을 우리 업로드 파이프라인으로 등록한 것(등록 전에는 글자만 보인다)
-- [전투 원화] 등록된 무료 아이콘/도감 원화만 사용한다. 기호마다 황동 메달과 내부 그림 층을 분리한다.
local function addIcon(button: TextButton, key: string)
	local id = (AssetIds :: any)[key]
	if not id then return nil end
	local painted = string.sub(key, 1, 8) == "CardArt/"
	local medallion = Instance.new("Frame")
	medallion.Name = "FieldIconMedallion"
	medallion.AnchorPoint = Vector2.new(0.5, 0.5)
	medallion.Position = UDim2.fromScale(0.5, 0.385)
	medallion.Size = UDim2.fromScale(if painted then 0.83 else 0.82, if painted then 0.74 else 0.76)
	medallion.BackgroundColor3 = if painted then Color3.fromRGB(38, 32, 28) else Color3.fromRGB(40, 43, 47)
	medallion.BackgroundTransparency = if painted then 0 else 0.33
	medallion.BorderSizePixel = 0
	medallion.ZIndex = button.ZIndex + 2
	medallion.Parent = button
	local rounded = Instance.new("UICorner")
	rounded.CornerRadius = UDim.new(if painted then 0.16 else 1, 0)
	rounded.Parent = medallion
	local rim = Instance.new("UIStroke")
	rim.Name = "FieldIconRim"
	rim.Color = Color3.fromRGB(245, 208, 128)
	rim.Thickness = if painted then 1.2 else 1.6
	rim.Transparency = 0.14
	rim.Parent = medallion
	local img = Instance.new("ImageLabel")
	img.Name = "FieldButtonIcon"
	img.BackgroundTransparency = 1
	img.Image = "rbxassetid://" .. tostring(id)
	img.AnchorPoint = Vector2.new(0.5, 0.5)
	img.Position = UDim2.fromScale(0.5, 0.385)
	img.Size = UDim2.fromScale(if painted then 0.83 else 0.79, if painted then 0.72 else 0.72)
	img.ScaleType = Enum.ScaleType.Fit -- 승인 원화 가장자리 잘림 없이 전부 표시
	img.ImageTransparency = 0
	img.ImageColor3 = if painted then Color3.new(1, 1, 1) else Color3.fromRGB(255, 246, 222)
	img.ZIndex = button.ZIndex + 3
	img.Parent = button
	if painted then
		local crop = Instance.new("UICorner")
		crop.CornerRadius = UDim.new(0, 7)
		crop.Parent = img
	end
	button.TextYAlignment = Enum.TextYAlignment.Bottom
	button.TextTruncate = Enum.TextTruncate.AtEnd
	button:SetAttribute("IconArtKey", key)
	return img
end

local FieldScene = {}

local ORIGIN = Vector3.new(3000, 0, 0) -- 항구 장면과 멀리 떨어진 곳

local BIOMES = {
	{ words = { "해안", "갯벌", "바위", "절벽", "만", "섬", "부두", "어장", "군도" }, ground = Color3.fromRGB(196, 178, 128), mat = Enum.Material.Sand, trees = 4, rocks = 26,
		size = 300, fog = Color3.fromRGB(190, 215, 235), fogEnd = 700, clock = 15.5, kind = "coast", mobs = { { "해적", "Rogue_Hooded", 3, 8, 8.5 }, { "밀수꾼", "Rogue", 3, 7, 9.5 }, { "해적 두목", "Barbarian", 6, 12, 7.5, true } } },
	{ words = { "고지", "봉분", "평원", "열석", "들판", "돌" }, ground = Color3.fromRGB(110, 134, 82), mat = Enum.Material.Grass, trees = 8, rocks = 22,
		size = 380, fog = Color3.fromRGB(200, 220, 200), fogEnd = 850, clock = 14, kind = "plains", mobs = { { "산적", "Barbarian", 3, 8, 8.5 }, { "탈영병", "Knight", 4, 9, 7.5 }, { "산적 두목", "Barbarian", 7, 12, 7.5, true } } },
	{ words = { "광산", "탄광", "채석" }, ground = Color3.fromRGB(110, 108, 104), mat = Enum.Material.Slate, trees = 2, rocks = 40,
		size = 240, fog = Color3.fromRGB(70, 66, 62), fogEnd = 280, clock = 18.5, kind = "mine", mobs = { { "광산 도적", "Rogue", 3, 8, 9.5 }, { "갱 감독", "Knight", 5, 10, 7 }, { "도적 두목", "Barbarian", 7, 12, 7.5, true } } },
	{ words = { "숲", "과수원", "호수", "농장", "아마", "정원" }, ground = Color3.fromRGB(70, 118, 66), mat = Enum.Material.Grass, trees = 34, rocks = 8,
		size = 320, fog = Color3.fromRGB(120, 150, 120), fogEnd = 420, clock = 11, kind = "forest", mobs = { { "밀렵꾼", "Rogue_Hooded", 3, 8, 9 }, { "산적", "Barbarian", 3, 8, 8.5 }, { "숲의 사냥꾼", "Rogue", 4, 9, 10 }, { "산적 두목", "Knight", 7, 12, 7.5, true } } },
}
local DEFAULT_BIOME = { ground = Color3.fromRGB(96, 128, 72), mat = Enum.Material.Grass, trees = 16, rocks = 14, kind = "plain", size = 300, fog = Color3.fromRGB(190, 205, 190), fogEnd = 700, clock = 14,
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

-- 문화권(지역)별 탐험지 분위기: 땅·나무·안개·시간대·크기·적 이름·소품. 지점 이름으로 정한 지형 위에 덧입힌다.
local RC = Color3.fromRGB
local REGION_LOOK: {[string]: any} = {
	iberia = { ground = RC(176, 150, 96), mat = Enum.Material.Ground, fog = RC(232, 214, 176), fogEnd = 900, clock = 15, treeMul = 0.6, rockMul = 1.2, sizeMul = 1.1, trees = { "tree-oak", "tree-default-fall" }, mobs = { "투우사 도적", "탈영 병사", "카스티야 산적 두목" }, props = { { "Terrain", "column", 14, 5 }, { "Terrain", "Bush_Small", 3, 3.2 }, { "Terrain", "ruins-wall-arched", 1, 8 } } },
	italy = { ground = RC(150, 142, 98), mat = Enum.Material.Grass, fog = RC(226, 220, 196), fogEnd = 900, clock = 15.5, treeMul = 0.8, rockMul = 1, sizeMul = 1.05, trees = { "tree-oak", "tree-pinedefaulta" }, mobs = { "콘도티에리", "도적", "산적 두목" }, props = { { "Terrain", "column", 12, 5 }, { "Terrain", "statue-column", 4, 6 }, { "Terrain", "forest-flower-yellow", 4, 2 }, { "Terrain", "ruins-pillar-decorated", 2, 8 } } },
	france = { ground = RC(112, 140, 84), mat = Enum.Material.Grass, fog = RC(214, 224, 216), fogEnd = 800, clock = 13, treeMul = 1, rockMul = 0.8, sizeMul = 1.05, trees = { "tree-oak", "tree" }, mobs = { "노상강도", "탈영병", "산적 두목" }, props = { { "Terrain", "forest-flower-purple", 4, 1.8 }, { "Terrain", "river-stone-bank", 2, 5 } } },
	britain = { ground = RC(88, 124, 76), mat = Enum.Material.Grass, fog = RC(190, 200, 204), fogEnd = 520, clock = 12, treeMul = 0.9, rockMul = 1.1, sizeMul = 1, trees = { "tree-oak", "tree-crooked" }, mobs = { "노상강도", "탈영병", "도적 두목" }, props = { { "Terrain", "haunted-pine-crooked", 3, 11 }, { "Terrain", "haunted-iron-gate", 1, 8 } } },
	hanse = { ground = RC(104, 126, 88), mat = Enum.Material.Grass, fog = RC(188, 200, 208), fogEnd = 560, clock = 12.5, treeMul = 1.2, rockMul = 0.8, sizeMul = 1, trees = { "tree-pinedefaulta", "tree-oak" }, mobs = { "해적 용병", "밀수꾼", "해적 두목" }, props = { { "Terrain", "north-pine-fall", 3, 11 }, { "Terrain", "river-stone-bank", 2, 6 } } },
	nordic = { ground = RC(196, 204, 206), mat = Enum.Material.Snow, fog = RC(206, 220, 232), fogEnd = 420, clock = 10.5, treeMul = 1.4, rockMul = 1.4, sizeMul = 1.15, trees = { "tree-pinedefaulta", "tree-high" }, mobs = { "바이킹 약탈자", "사냥꾼", "전사 두목" }, props = { { "Terrain", "campfire-logs", 3, 2.4 }, { "Terrain", "north-pine-fall", 3, 13 } } },
	brick = { ground = RC(112, 150, 90), mat = Enum.Material.Grass, fog = RC(200, 214, 224), fogEnd = 700, clock = 13, treeMul = 0.5, rockMul = 0.3, sizeMul = 0.95, trees = { "tree-oak", "tree_tiny" }, mobs = { "밀수꾼", "해적", "해적 두목" }, props = { { "Town", "windmill", 3, 16 }, { "Terrain", "river-stone-bank", 2, 5 }, { "Terrain", "forest-flower-yellow", 3, 1.8 } } },
	stone = { ground = RC(110, 122, 100), mat = Enum.Material.Grass, fog = RC(186, 198, 206), fogEnd = 480, clock = 11.5, treeMul = 1.3, rockMul = 1.5, sizeMul = 1.1, trees = { "tree-pinedefaulta", "tree-oak" }, mobs = { "밀렵꾼", "탈영병", "산적 두목" }, props = { { "Terrain", "north-pine-fall", 2, 13 }, { "Terrain", "ruins-wall-arched", 1, 9 } } },
	med = { ground = RC(168, 150, 104), mat = Enum.Material.Ground, fog = RC(230, 216, 184), fogEnd = 900, clock = 15, treeMul = 0.5, rockMul = 1.4, sizeMul = 1.1, trees = { "tree-oak", "tree-default-fall" }, mobs = { "바르바리 해적", "도적", "해적 두목" }, props = { { "Terrain", "column", 8, 5 }, { "Terrain", "ruins-pillar-decorated", 2, 9 }, { "Terrain", "coast-grass-patch", 4, 1.8 } } },
	ottoman = { ground = RC(198, 170, 116), mat = Enum.Material.Sand, fog = RC(238, 214, 170), fogEnd = 760, clock = 15.5, treeMul = 0.3, rockMul = 1.3, sizeMul = 1.2, trees = { "tree-default-fall" }, mobs = { "사막 도적", "예니체리 탈영병", "도적 두목" }, props = { { "Terrain", "tent-detailedopen", 6, 8 }, { "Terrain", "column", 8, 5 }, { "Terrain", "tropical-palm-short", 1, 10 }, { "Terrain", "river-stone-bank", 1, 5 } } },
	desert = { ground = RC(214, 184, 120), mat = Enum.Material.Sand, fog = RC(240, 220, 176), fogEnd = 640, clock = 14.5, treeMul = 0.1, rockMul = 1.6, sizeMul = 1.3, trees = { "tree-default-fall" }, mobs = { "사막 노략꾼", "낙타 상인 도적", "베두인 두목" }, props = { { "Terrain", "tent-detailedopen", 8, 8 }, { "Terrain", "cliff-rock", 6, 14 }, { "Terrain", "tropical-palm-tall", 2, 13 }, { "Terrain", "egypt-column", 1, 9 } } },
	swahili = { ground = RC(188, 156, 96), mat = Enum.Material.Ground, fog = RC(236, 218, 176), fogEnd = 800, clock = 14, treeMul = 0.7, rockMul = 0.9, sizeMul = 1.2, trees = { "tree-default-fall", "tree_large" }, mobs = { "해안 약탈자", "노예 상인 용병", "약탈 두목" }, props = { { "Terrain", "canoe", 4, 8 }, { "Terrain", "tropical-palm-tall", 3, 13 }, { "Terrain", "Grass_Small", 4, 2 } } },
	malabar = { ground = RC(84, 132, 64), mat = Enum.Material.Grass, fog = RC(204, 224, 200), fogEnd = 460, clock = 10, treeMul = 1.8, rockMul = 0.7, sizeMul = 1.1, trees = { "tree_large", "tree-high" }, mobs = { "해적(말라바르)", "향신료 도적", "해적 두목" }, props = { { "Terrain", "canoe", 3, 8 }, { "Terrain", "tropical-palm-tall", 3, 13 }, { "Terrain", "east-bamboo-grove", 3, 8 } } },
	japan = { ground = RC(96, 136, 80), mat = Enum.Material.Grass, fog = RC(206, 222, 220), fogEnd = 440, clock = 10.5, treeMul = 1.6, rockMul = 1, sizeMul = 0.95, trees = { "tree-pinedefaulta", "tree-oak" }, mobs = { "낭인", "왜구", "산적 두목" }, props = { { "Terrain", "pillar-obelisk", 3, 6 }, { "Terrain", "bridge-wood", 2, 10 }, { "Terrain", "east-bamboo-grove", 5, 8 }, { "Terrain", "forest-flower-purple", 3, 1.7 } } },
	china = { ground = RC(120, 144, 84), mat = Enum.Material.Grass, fog = RC(212, 220, 212), fogEnd = 480, clock = 10.5, treeMul = 1.2, rockMul = 1.3, sizeMul = 1.1, trees = { "tree-oak", "tree-high" }, mobs = { "왜구", "비적", "해적 두목" }, props = { { "Terrain", "cliff-rock", 6, 14 }, { "Terrain", "bridge-stone", 2, 10 }, { "Terrain", "east-bamboo-grove", 4, 9 }, { "Terrain", "river-stone-bank", 2, 5 } } },
	seasia = { ground = RC(70, 124, 60), mat = Enum.Material.Grass, fog = RC(190, 220, 196), fogEnd = 380, clock = 9.5, treeMul = 2, rockMul = 0.6, sizeMul = 1.05, trees = { "tree_large", "tree-high", "plant-bush" }, mobs = { "해적", "정글 도적", "해적 두목" }, props = { { "Terrain", "canoe", 3, 8 }, { "Terrain", "east-bamboo-grove", 4, 9 }, { "Terrain", "tropical-palm-short", 3, 11 } } },
	tropic = { ground = RC(82, 134, 66), mat = Enum.Material.Grass, fog = RC(196, 224, 214), fogEnd = 560, clock = 11, treeMul = 1.4, rockMul = 0.8, sizeMul = 1.05, trees = { "tree_large", "plant-bush" }, mobs = { "카리브 해적", "밀수꾼", "해적 두목" }, props = { { "Terrain", "canoe", 3, 8 }, { "Terrain", "tropical-palm-tall", 4, 14 }, { "Terrain", "Grass_Small", 4, 2 } } },
	colonial = { ground = RC(120, 138, 82), mat = Enum.Material.Grass, fog = RC(206, 218, 204), fogEnd = 600, clock = 12.5, treeMul = 1.1, rockMul = 0.9, sizeMul = 1.15, trees = { "tree_large", "tree-oak" }, mobs = { "정글 도적", "탈영병", "산적 두목" }, props = { { "Terrain", "crops-cornstagec", 8, 3.8 }, { "Terrain", "arid-cactus-short", 2, 2.7 }, { "Terrain", "arid-cactus-tall", 1, 4 }, { "Terrain", "forest-flower-yellow", 3, 2 } } },
	creole = { ground = RC(76, 130, 62), mat = Enum.Material.Grass, fog = RC(196, 224, 208), fogEnd = 520, clock = 11, treeMul = 1.5, rockMul = 0.6, sizeMul = 1.05, trees = { "tree_large", "plant-bush" }, mobs = { "카리브 해적", "농장 도망자", "해적 두목" }, props = { { "Terrain", "crop-melon", 8, 3.2 }, { "Terrain", "tropical-palm-short", 4, 11 }, { "Terrain", "forest-flower-yellow", 3, 2 } } },
	pacific = { ground = RC(214, 196, 140), mat = Enum.Material.Sand, fog = RC(204, 228, 238), fogEnd = 700, clock = 12, treeMul = 0.6, rockMul = 0.9, sizeMul = 1.25, trees = { "tree_large", "plant-bush" }, mobs = { "섬 약탈자", "난파 도적", "해적 두목" }, props = { { "Terrain", "canoe", 5, 8 }, { "Terrain", "tropical-palm-tall", 4, 13 }, { "Terrain", "coast-grass-patch", 4, 2 } } },
	wafrica = { ground = RC(168, 140, 84), mat = Enum.Material.Ground, fog = RC(232, 214, 170), fogEnd = 700, clock = 13.5, treeMul = 0.8, rockMul = 1, sizeMul = 1.2, trees = { "tree_large", "tree-default-fall" }, mobs = { "해안 약탈자", "노예 상인 용병", "약탈 두목" }, props = { { "Terrain", "canoe", 3, 8 }, { "Terrain", "tropical-palm-short", 3, 11 }, { "Terrain", "Bush_Small", 4, 3 } } },
}

-- [지역별 생태] 기존 21개 문화권의 지형·소품과 연결하는 적 무리 배치 구역. 전투 수치/적 수는 그대로 둔다.
local REGION_ENCOUNTERS = {
	iberia = "ruins", italy = "ruins", france = "forest", britain = "highland", hanse = "coast",
	nordic = "highland", brick = "coast", stone = "highland", med = "ruins",
	ottoman = "desert", desert = "desert", swahili = "coast", malabar = "forest",
	japan = "forest", china = "highland", seasia = "forest", tropic = "coast",
	colonial = "plains", creole = "forest", pacific = "coast", wafrica = "plains",
}

-- 지점 이름(지형) + 항구의 문화권(분위기)을 합쳐 탐험지 모습을 정한다.
local function lookFor(name: string, portId: string?)
	local b = biomeFor(name)
	local reg = portId and Cultures.REGION[portId]
	local r = reg and REGION_LOOK[reg]
	if not r then
		return b
	end
	local t = table.clone(b)
	if b.kind == "mine" then
		t.ground = b.ground:Lerp(r.ground, 0.25)
		t.fog = b.fog:Lerp(r.fog, 0.2)
	elseif b.kind == "coast" then
		t.ground = b.ground:Lerp(r.ground, 0.3)
		t.fog = r.fog
		t.fogEnd, t.clock = r.fogEnd, r.clock
	else
		t.ground, t.mat, t.fog, t.fogEnd, t.clock = r.ground, r.mat, r.fog, r.fogEnd, r.clock
	end
	t.trees = math.floor(b.trees * r.treeMul + 0.5)
	t.rocks = math.floor(b.rocks * r.rockMul + 0.5)
	t.size = math.floor(b.size * r.sizeMul)
	t.treeNames = if b.kind == "mine" then nil else r.trees
	t.props = r.props
	t.region = reg
	t.encounter = REGION_ENCOUNTERS[reg] or b.kind
	local mobs = {}
	for i, m in b.mobs do
		local copy = table.clone(m)
		copy[1] = if i == #b.mobs then r.mobs[3] else r.mobs[(i - 1) % 2 + 1]
		mobs[i] = copy
	end
	t.mobs = mobs
	return t
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
-- 수입 나무·덤불은 질감이 청록색이라, 항구 장면과 같은 색을 곱해 자연스러운 초록·가을색으로 만든다
local FIELD_TINT = {
	["tree-oak"] = Color3.fromRGB(88, 138, 62), ["tree-pinedefaulta"] = Color3.fromRGB(255, 238, 120), ["tree-default-fall"] = Color3.fromRGB(204, 118, 48),
	tree = Color3.fromRGB(255, 238, 120), ["tree-high"] = Color3.fromRGB(255, 238, 120), ["tree-crooked"] = Color3.fromRGB(255, 238, 120),
	tree_large = Color3.fromRGB(78, 132, 66), tree_tiny = Color3.fromRGB(84, 138, 70), ["plant-bush"] = Color3.fromRGB(78, 128, 58),
	-- [지형 실물 착색] 원본 회색 PBR 메시를 지역색과 자연스럽게 맞춘다.
	["Grass_Small"] = Color3.fromRGB(134, 188, 88), ["Bush_Small"] = Color3.fromRGB(82, 146, 72),
	["Rock_2"] = Color3.fromRGB(153, 148, 134),
}
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
			local tint = FIELD_TINT[asset]
			if tint then
				d.Color = tint
				pcall(function() (d :: any).UsePartColor = true end)
				local sa = d:FindFirstChildOfClass("SurfaceAppearance")
				if sa then sa.Color = tint end
				for _, ch in d:GetChildren() do
					if ch:IsA("SpecialMesh") then ch.VertexColor = Vector3.new(tint.R, tint.G, tint.B) end
				end
			end
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
	b.TextStrokeTransparency = 0.48
	b.AutoButtonColor = true
	b.BorderSizePixel = 0
	b.ZIndex = 3
	b.ClipsDescendants = true
	b.TextWrapped = false
	b.TextYAlignment = Enum.TextYAlignment.Bottom
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 15)
	c.Parent = b
	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, color:Lerp(Color3.new(1, 1, 1), 0.28)),
		ColorSequenceKeypoint.new(0.45, color),
		ColorSequenceKeypoint.new(1, color:Lerp(Color3.new(0, 0, 0), 0.36)),
	})
	grad.Rotation = 90
	grad.Parent = b
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(224, 184, 105)
	st.Thickness = 2
	st.Parent = b
	local grainId = AssetIds["Menu/leather_grain"]
	if grainId then
		local grain = Instance.new("ImageLabel")
		grain.Name = "FieldLeatherTexture"
		grain.BackgroundTransparency = 1
		grain.Size = UDim2.fromScale(1, 1)
		grain.Image = "rbxassetid://" .. tostring(grainId)
		grain.ScaleType = Enum.ScaleType.Crop
		grain.ImageTransparency = 0.73
		grain.ZIndex = b.ZIndex + 1
		grain.Parent = b
	end
	-- 스킬만 사용: 원형/직사각 버튼 모두 실제 남은 재사용 시간을 그림 위에 보여 준다.
	local shade = Instance.new("Frame")
	shade.Name = "FieldCooldownShade"
	shade.AnchorPoint = Vector2.new(0, 1)
	shade.Position = UDim2.fromScale(0, 1)
	shade.Size = UDim2.fromScale(1, 0)
	shade.BackgroundColor3 = Color3.fromRGB(13, 22, 32)
	shade.BackgroundTransparency = 0.24
	shade.BorderSizePixel = 0
	shade.Visible = false
	shade.Active = false
	shade.ZIndex = b.ZIndex + 4
	shade.Parent = b
	local timer = Instance.new("TextLabel")
	timer.Name = "FieldCooldownTime"
	timer.Size = UDim2.fromScale(1, 1)
	timer.BackgroundTransparency = 1
	timer.Font = Enum.Font.GothamBlack
	timer.TextSize = 19
	timer.TextColor3 = Color3.fromRGB(255, 245, 213)
	timer.TextStrokeColor3 = Color3.fromRGB(11, 17, 25)
	timer.TextStrokeTransparency = 0.24
	timer.Visible = false
	timer.ZIndex = b.ZIndex + 5
	timer.Parent = b
	local pressScale = Instance.new("UIScale")
	pressScale.Parent = b
	b.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
			game:GetService("TweenService"):Create(pressScale, TweenInfo.new(0.09), { Scale = 0.94 }):Play()
		end
	end)
	b.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
			game:GetService("TweenService"):Create(pressScale, TweenInfo.new(0.13), { Scale = 1 }):Play()
		end
	end)
	b.Parent = parent
	return b
end

-- opts: { name, nodes, danger, seed, onFinish(result) }  result: "clear" | "retreat" | "defeat"
function FieldScene.start(opts)
	workspace:SetAttribute("FieldCombatReady", nil) -- 이전 탐험의 준비 상태를 새 입장의 성공으로 오인하지 않는다.
	if RunService:IsStudio() then workspace:SetAttribute("FieldFallRescues", 0) end
	local player = Players.LocalPlayer
	local old = workspace:FindFirstChild("FieldScene")
	if old then
		old:Destroy()
	end
	local folder = Instance.new("Folder")
	folder.Name = "FieldScene"
	folder.Parent = workspace
	local rng = Random.new(opts.seed or 7)
	local biome = lookFor(opts.name or "", opts.portId)
	local visualMobile = game:GetService("UserInputService").TouchEnabled
	folder:SetAttribute("FieldRegion", biome.region or "generic")
	folder:SetAttribute("FieldEncounterPattern", biome.encounter or biome.kind)
	-- 지역(바이옴)과 위험도에 따라 맵 크기가 다르다: 위험한 곳일수록 넓다
	local SIZE = math.floor(biome.size * (1 + math.min(opts.danger or 1, 10) * 0.03))
	local AREA = math.min((SIZE / 200) ^ 2, 2.5)
	-- 지역마다 하늘·안개 분위기가 다르다(끝나면 되돌린다)
	local lightSave = {}
	do
		local L = game:GetService("Lighting")
		-- [지역 조명] 항구의 밤 설정이 탐험의 주간 전장을 어둡게 만들지 않게 값 보관 후 전장에 맞춰 조절.
		lightSave = {
			FogColor = L.FogColor, FogStart = L.FogStart, FogEnd = L.FogEnd, ClockTime = L.ClockTime,
			Brightness = L.Brightness, Ambient = L.Ambient, OutdoorAmbient = L.OutdoorAmbient,
			ColorShiftTop = L.ColorShift_Top,
		}
		pcall(function()
			L.FogColor, L.FogStart, L.FogEnd, L.ClockTime = biome.fog, 40, biome.fogEnd, biome.clock
			L.Brightness = 2.1
			L.Ambient = biome.fog:Lerp(Color3.fromRGB(132, 139, 153), 0.65)
			L.OutdoorAmbient = biome.fog:Lerp(Color3.fromRGB(153, 160, 168), 0.55)
			L.ColorShift_Top = Color3.fromRGB(255, 246, 229)
		end)
	end

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

	-- [낙사 방지] 기존 바닥 아래에 충돌 안전판을 두고, 이동 감시에서 추락 시 마지막 안전 지점으로 복귀한다.
	local safetyFloor = part(folder, Vector3.new(SIZE + 24, 2, SIZE + 24), CFrame.new(ORIGIN + Vector3.new(0, -14, 0)), Color3.fromRGB(44, 43, 40))
	safetyFloor.Name = "FieldSafetyFloor"
	safetyFloor.Transparency = 1
	safetyFloor.CanQuery = false

	-- 지평선 언덕: 사방 가장자리 바깥에 복셀 지형 언덕을 쌓아 평평한 느낌을 줄인다 (끝나면 지운다)
	do
		local terrain = workspace.Terrain
		local mat = biome.mat
		if mat ~= Enum.Material.Sand and mat ~= Enum.Material.Slate and mat ~= Enum.Material.Mud then
			mat = Enum.Material.Grass
		end
		local hills = {}
		local hillRng = Random.new((opts.seed or 7) * 13 + 5)
		-- [모바일 메모리] 보이지 않는 원거리 지형 갱신 횟수를 줄이고 동일한 둘레를 유지한다.
		local hillCount = if visualMobile then 16 else 28
		for i = 0, hillCount - 1 do
			local ang = i / hillCount * math.pi * 2 + hillRng:NextNumber(-0.08, 0.08)
			local dist = half + hillRng:NextNumber(34, 54)
			local r = hillRng:NextNumber(22, 38)
			local c = ORIGIN + Vector3.new(math.cos(ang) * dist, -r * hillRng:NextNumber(0.35, 0.6), math.sin(ang) * dist)
			terrain:FillBall(c, r, mat)
			table.insert(hills, { c, r })
		end
		folder.Destroying:Connect(function()
			for _, h in hills do
				terrain:FillBall(h[1], h[2] + 2, Enum.Material.Air)
			end
		end)
	end

	local spawn = ORIGIN + Vector3.new(0, 4, half - 14)
	-- 필드 바닥 생성 직후 캐릭터와 카메라를 이동시켜, 나머지 적·조작 UI 생성과 분리한다.
	-- 캐릭터를 필드로 옮긴다
	local char = player.Character or player.CharacterAdded:Wait()
	char:PivotTo(CFrame.new(spawn))
	-- 항구 전경에서는 캐릭터가 고정(Anchored)되어 있다. 탐험에서는 걸어 다닐 수 있어야 하므로 풀어 준다.
	local fieldRoot = char:FindFirstChild("HumanoidRootPart")
	if fieldRoot and fieldRoot:IsA("BasePart") then
		fieldRoot.Anchored = false
	end
	do
		local fh = char:FindFirstChildOfClass("Humanoid")
		if fh then
			fh.PlatformStand = false
			fh.Sit = false
			fh.WalkSpeed = 18
			fh.JumpPower = 50
			fh.AutoRotate = true
			fh:ChangeState(Enum.HumanoidStateType.GettingUp)
		end
	end
	-- [카메라] 마력숲의 자유 3D 확대 범위를 필드 전용으로 적용하고 탐험 종료 시 원래 설정을 복원한다.
	local savedCameraMode = player.CameraMode
	local savedZoomMin, savedZoomMax = player.CameraMinZoomDistance, player.CameraMaxZoomDistance
	local cameraModes = {
		{ name = "근접", min = 3, max = 15 },
		{ name = "기본", min = 5, max = 36 },
		{ name = "원거리", min = 18, max = 72 },
	}
	local cameraIndex = 2
	local function applyFieldCamera(index: number)
		cameraIndex = index
		local profile = cameraModes[index]
		player.CameraMode = Enum.CameraMode.Classic
		player.CameraMaxZoomDistance = profile.max
		player.CameraMinZoomDistance = profile.min
		workspace:SetAttribute("FieldCameraMode", profile.name)
		workspace:SetAttribute("FieldCameraZoomMax", profile.max)
		local currentCamera = workspace.CurrentCamera
		if currentCamera then
			currentCamera.CameraType = Enum.CameraType.Custom
			currentCamera.FieldOfView = 70
			local currentHumanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
			if currentHumanoid then currentCamera.CameraSubject = currentHumanoid end
		end
	end
	applyFieldCamera(cameraIndex)

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
	local treeNames = biome.treeNames or { "tree", "tree-crooked", "tree-high", "tree_large", "tree_tiny" }
	-- [모바일 안정화] 메시는 화면 자원만 줄이고 탐험 보상·몬스터 수·위험도는 유지한다.
	local treeCount = math.floor(biome.trees * 2 * AREA)
	for _ = 1, if visualMobile then math.min(treeCount, 44) else treeCount do
		local pos = ORIGIN + scatter(14)
		local h = rng:NextNumber(9, 15)
		-- 지역 나무는 기존 Town/Terrain의 실제 CC0 메시만 사용한다. 없는 종류는 도형 대체 없이 건너뛴다.
		local name = treeNames[rng:NextInteger(1, #treeNames)]
		local kind = if AssetIds["Terrain/" .. name] then "Terrain" else "Town"
		placeModel(folder, kind, name, pos, h, false)
	end
	-- [무료 실물 지형] 기존 바위 개수를 유지하면서 등록된 Quaternius 모델을 섞는다.
	local rockNames = { { "Town", "rock-large" }, { "Town", "rock-small" }, { "Town", "rock-wide" }, { "Terrain", "Rock_2" } }
	local rockCount = math.floor(biome.rocks * 1.6 * AREA)
	for _ = 1, if visualMobile then math.min(rockCount, 36) else rockCount do
		local pos = ORIGIN + scatter(10)
		local rock = rockNames[rng:NextInteger(1, #rockNames)]
		-- 실제 등록된 바위 메시만 배치한다. 파츠 박스 우회 금지.
		placeModel(folder, rock[1], rock[2], pos, rng:NextNumber(2.5, 6), true)
	end

	-- 문화권 소품(기둥·천막·카누 등): 등록된 모델만 놓고, 없으면 건너뛴다
	for _, pr in (biome.props or {}) do
		-- [모바일] 장식 메시만 종류당 4개로 제한한다. PC 배치와 전투·보상은 유지한다.
		for _ = 1, math.min(if visualMobile then 4 else 8, math.max(1, math.floor(pr[3] * math.min(AREA, 1.25)))) do
			placeModel(folder, pr[1], pr[2], ORIGIN + scatter(18), pr[4], pr[1] == "Terrain" and pr[2] == "cliff-rock")
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

	-- 실제 도시·유적 랜드마크: 탐험 지점 이름에 맞는 건축물 군을 시작 지점 맞은편에 세운다.
	-- 등록된 실제 3D 모델만 조합한다 (새 도형 금지). 항목: { 종류, 모델, 크기, dx, dz, 충돌, 회전(도) }
	do
		local function ringOf(kind, asset, size, r, n, solid)
			local t = {}
			for i = 0, n - 1 do
				local a = i / n * math.pi * 2
				table.insert(t, { kind, asset, size, math.cos(a) * r, math.sin(a) * r, solid })
			end
			return t
		end
		local function rowOf(kind, asset, size, x0, x1, n, dz, solid)
			local t = {}
			for i = 0, n - 1 do
				table.insert(t, { kind, asset, size, x0 + (x1 - x0) * i / math.max(1, n - 1), dz, solid })
			end
			return t
		end
		local function cat(...)
			local out = {}
			for _, l in { ... } do
				for _, e in l do table.insert(out, e) end
			end
			return out
		end
		local CATHEDRAL = cat({ { "Town", "church", 38, 0, 0, true }, { "Town", "bell-tower", 28, -24, 6, true }, { "Town", "fountain-round", 8, 0, 26, true },
			{ "Town", "bench_A", 4, -8, 24 }, { "Town", "bench_A", 4, 8, 24 } }, rowOf("Town", "house", 16, -40, 40, 4, -22, true))
		local MOSQUE = cat({ { "Town", "temple-stone", 36, 0, 0, true }, { "Terrain", "pillar-obelisk", 24, 26, 4, true }, { "Terrain", "pillar-obelisk", 24, -26, 4, true },
			{ "Town", "fountain-round", 8, 0, 26, true } }, rowOf("Terrain", "column", 9, -20, 20, 5, 20))
		local GREEK = cat(rowOf("Terrain", "greek-column", 12, -30, 30, 8, -14, true), rowOf("Terrain", "greek-column", 12, -30, 30, 8, 14, true),
			{ { "Terrain", "greek-statue", 10, 0, 0, true }, { "Terrain", "greek-ruins-a", 16, -36, 0, true }, { "Terrain", "greek-ruins-b", 16, 36, 0, true },
			{ "Terrain", "greek-amphitheater", 30, 0, -34, true } })
		local STONES = cat(ringOf("Terrain", "mystic-column", 12, 22, 10, true), { { "Terrain", "mystic-stone-arch", 16, 0, 0, true }, { "Terrain", "mystic-broken-column", 9, 8, 6, true } })
		local FORT = cat({ { "Castle", "fortress", 44, 0, 0, true } }, rowOf("Castle", "wall", 14, -36, 36, 6, 30, true), rowOf("Castle", "wall", 14, -36, 36, 6, -30, true),
			{ { "Castle", "flag-banner-long", 12, -12, 24 }, { "Castle", "flag-banner-long", 12, 12, 24 } })
		local TOWER = cat({ { "Castle", "fortress", 40, 0, 0, true }, { "Castle", "tower-hexagon-base", 12, -30, -26, true }, { "Castle", "tower-hexagon-mid", 12, -30, -26, true },
			{ "Castle", "tower-hexagon-roof", 12, -30, -26, true }, { "Castle", "tower-hexagon-base", 12, 30, -26, true }, { "Castle", "tower-hexagon-mid", 12, 30, -26, true },
			{ "Castle", "tower-hexagon-roof", 12, 30, -26, true }, { "Castle", "bridge-draw", 14, 0, 32, true } }, rowOf("Castle", "wall", 14, -40, 40, 6, -40, true))
		local DOCKS = cat({ { "Naval", "structure-platform-dock", 40, 0, -20, true }, { "Naval", "boat-fishing-small", 12, 14, -34 }, { "Town", "windmill", 24, -34, 10, true } },
			rowOf("Cargo", "barrel", 3, -24, 24, 6, 12), rowOf("Town", "house", 18, -40, 40, 3, 30, true), { { "Town", "stall-red", 7, -14, 18 }, { "Town", "stall-green", 7, 14, 18 } })
		local LIGHT = cat({ { "Naval", "tower-complete-large", 40, 0, 0, true }, { "Naval", "tower-complete-small", 14, 20, 14, true } }, rowOf("Cargo", "barrel", 3, -14, 14, 4, 18))
		local OLDTOWN = cat(rowOf("Town", "house", 18, -42, 42, 5, -20, true), rowOf("Town", "house", 18, -42, 42, 5, 22, true),
			{ { "Town", "fountain-square", 12, 0, 0, true }, { "Town", "bell-tower", 24, 0, -34, true }, { "Town", "stall-red", 7, -14, 6 }, { "Town", "stall-green", 7, 14, 6 } })
		local LANDMARKS = {
			{ { "런던탑", "런던 유적" }, TOWER }, { { "대성당", "몽생미셸", "세비야", "팔레르모" }, CATHEDRAL },
			{ { "하기아", "알함브라", "모스크", "이스탄불" }, MOSQUE }, { { "파르테논", "로마", "폼페이", "아테네", "수도교" }, GREEK },
			{ { "솔즈베리", "선돌", "환상열석", "보인", "봉분", "룬석", "신석기" }, STONES },
			{ { "성채", "성벽", "방벽", "성 바위", "에든버러 성" }, FORT }, { { "등대" }, LIGHT },
			{ { "부두", "창고", "크레인", "운하" }, DOCKS }, { { "구시가", "한자 회관", "광장" }, OLDTOWN },
		}
		local nm = opts.name or ""
		for _, lm in LANDMARKS do
			local hit = false
			for _, w in lm[1] do
				if string.find(nm, w, 1, true) then hit = true break end
			end
			if hit then
				local c = ORIGIN + Vector3.new(0, 0, -10)
				local first
				for index, e in lm[2] do
					-- [모바일] 대표 랜드마크를 우선 유지하고 반복된 외곽 장식만 제한한다.
					if not visualMobile or index <= 22 then
						local m = placeModel(folder, e[1], e[2], c + Vector3.new(e[4], 0, e[5]), e[3], e[6] == true)
						first = first or m
					end
				end
				local adorn = first and (first:IsA("BasePart") and first or first:FindFirstChildWhichIsA("BasePart", true))
				if adorn then
					local bb = Instance.new("BillboardGui")
					bb.Adornee = adorn
					bb.Size = UDim2.fromOffset(300, 56)
					bb.StudsOffset = Vector3.new(0, 34, 0)
					bb.MaxDistance = 400
					bb.AlwaysOnTop = true
					local l = Instance.new("TextLabel")
					l.Size = UDim2.fromScale(1, 1)
					l.BackgroundColor3 = Color3.fromRGB(58, 40, 28)
					l.TextColor3 = Color3.fromRGB(255, 244, 214)
					l.Font = Enum.Font.GothamBlack
					l.TextSize = 24
					l.Text = "🏛️ " .. nm
					local st = Instance.new("UIStroke")
					st.Color = Color3.fromRGB(232, 190, 96)
					st.Thickness = 2
					st.Parent = l
					local cr = Instance.new("UICorner")
					cr.CornerRadius = UDim.new(0, 12)
					cr.Parent = l
					l.Parent = bb
					bb.Parent = adorn
				end
				break
			end
		end
	end

	-- 상태
	local pl = AC.newPlayer(100)
	local BASE_DMG = 10
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
	-- [모바일/PC] 카메라 거리 3단계. 각 모드 안에서는 핀치·마우스 휠로 자유롭게 확대한다.
	local cameraBtn = btn(gui, "시야: 기본", Color3.fromRGB(56, 78, 96), UDim2.fromOffset(108, 44),
		UDim2.new(1, -12, 0, 184), Vector2.new(1, 0))
	cameraBtn.Name = "FieldCameraMode"
	cameraBtn.TextSize = 14
	cameraBtn.Activated:Connect(function()
		if finished then return end
		local nextIndex = cameraIndex % #cameraModes + 1
		applyFieldCamera(nextIndex)
		cameraBtn.Text = "시야: " .. cameraModes[nextIndex].name
	end)

	local title = label(gui, "", 16)
	title.AnchorPoint = Vector2.new(0.5, 0)
	title.Position = UDim2.new(0.5, 0, 0, 58)
	title.Size = UDim2.fromOffset(320, 24)

	local hpBack = Instance.new("Frame")
	hpBack.AnchorPoint = Vector2.new(0.5, 0)
	hpBack.Position = UDim2.new(0.5, 0, 0, 86)
	hpBack.Size = UDim2.fromOffset(240, 14)
	hpBack.BackgroundColor3 = Color3.fromRGB(26, 34, 40)
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
		if workspace:GetAttribute("DevGod") then pl.hp = pl.maxHp end -- 개발 캡처 전용: 서 있기만 해도 죽지 않게
		title.Text = string.format("%s  발견 %d/%d  적 %d", opts.name or "탐험", found, nodeCount, #enemies)
		hpFill.Size = UDim2.fromScale(math.clamp(pl.hp / pl.maxHp, 0, 1), 1)
		hpFill.BackgroundColor3 = if pl.hp / pl.maxHp < 0.35 then Color3.fromRGB(214, 82, 76) else Color3.fromRGB(91, 181, 120)
	end
	local function sfx(name: string, vol: number?, speed: number?)
		pcall(function()
			Sfx.play(name, vol or 0.6, speed or 1)
		end)
	end
	pcall(function()
		Sfx.ambient({ "sfx_wind" }, 0.3)
	end)
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
		-- [복구] 항구 복귀 시 이전 카메라·줌 제한을 남기지 않는다.
		player.CameraMode = savedCameraMode
		player.CameraMaxZoomDistance = math.max(savedZoomMax, savedZoomMin)
		player.CameraMinZoomDistance = savedZoomMin
		player.CameraMaxZoomDistance = savedZoomMax
		workspace:SetAttribute("FieldCameraMode", nil)
		workspace:SetAttribute("FieldCameraZoomMax", nil)
		workspace:SetAttribute("FieldCombatReady", nil)
		if RunService:IsStudio() then workspace:SetAttribute("FieldFallRescues", nil) end
		pcall(function()
			local L = game:GetService("Lighting")
			L.FogColor, L.FogStart, L.FogEnd, L.ClockTime = lightSave.FogColor, lightSave.FogStart, lightSave.FogEnd, lightSave.ClockTime
			L.Brightness, L.Ambient, L.OutdoorAmbient = lightSave.Brightness, lightSave.Ambient, lightSave.OutdoorAmbient
			L.ColorShift_Top = lightSave.ColorShiftTop
		end)
		-- [탐험 종료] 한 연결의 정리 실패가 항구 복귀를 막지 않도록 각각 해제한다.
		for _, c in conns do
			local ok, err = pcall(function() c:Disconnect() end)
			if not ok then warn("[MareEssentia] 필드 연결 정리 오류", err) end
		end
		gui:Destroy()
		folder:Destroy()
		if opts.onFinish then
			local ok, err = pcall(opts.onFinish, result)
			if not ok then warn("[MareEssentia] 탐험 복귀 오류", err) end
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
	-- 적: 최소 20명, 위험할수록 늘어 최대 100명(두목 포함). 무리를 지어 맵 곳곳에 흩어져 있다.
	local danger0 = opts.danger or 1
	local bossCount = if danger0 < 3 then 0 else math.clamp(math.floor(danger0 / 2), 1, 8)
	local enemyCount = math.clamp(20 + (danger0 - 1) * 6, 20, 100 - bossCount)
	-- [몹 다양화] 규칙(HP/속도/피해/드롭)은 원본 그대로, 색상·복식·관절 액션만 직군별 3종으로 구분한다.
	local looks = {
		grunt = { { "검객", "Rogue", Color3.fromRGB(114, 86, 72) }, { "난투꾼", "Barbarian", Color3.fromRGB(140, 75, 59) }, { "기습병", "Rogue_Hooded", Color3.fromRGB(67, 79, 87) } },
		archer = { { "궁수", "Rogue", Color3.fromRGB(98, 105, 70) }, { "명사수", "Knight", Color3.fromRGB(82, 101, 127) }, { "척후병", "Rogue_Hooded", Color3.fromRGB(66, 106, 90) } },
		shield = { { "호위병", "Knight", Color3.fromRGB(117, 119, 132) }, { "근위병", "Knight", Color3.fromRGB(126, 91, 76) }, { "경비대장", "Rogue", Color3.fromRGB(103, 94, 76) } },
		charger = { { "돌격대", "Barbarian", Color3.fromRGB(132, 80, 58) }, { "광전사", "Barbarian", Color3.fromRGB(120, 54, 61) }, { "습격병", "Rogue", Color3.fromRGB(84, 91, 70) } },
		boss = { { "전장 두목", "Knight", Color3.fromRGB(117, 77, 66) }, { "약탈 우두머리", "Barbarian", Color3.fromRGB(135, 63, 55) }, { "거인 대장", "Knight", Color3.fromRGB(83, 90, 109) } },
	}
	local kinds = { "grunt", "archer", "shield", "charger" }
	-- [지역별 몬스터 배치] 숲길·유적·해안·산길·사막마다 무리 위치를 바꾼다.
	-- 기존 적 수/역할/체력/공격력/드롭/보스 규칙은 변경하지 않는다.
	local packCenters = {}
	local encounterZones = {
		coast = { Vector2.new(-0.70, -0.42), Vector2.new(0.68, -0.48), Vector2.new(-0.65, 0.30), Vector2.new(0.62, 0.20) },
		forest = { Vector2.new(-0.53, -0.62), Vector2.new(0.64, -0.55), Vector2.new(-0.70, 0.12), Vector2.new(0.68, 0.22) },
		ruins = { Vector2.new(-0.75, -0.18), Vector2.new(0.75, -0.18), Vector2.new(-0.48, -0.73), Vector2.new(0.50, -0.73) },
		highland = { Vector2.new(-0.68, -0.55), Vector2.new(0.52, -0.74), Vector2.new(-0.62, 0.20), Vector2.new(0.74, 0.06) },
		desert = { Vector2.new(-0.74, -0.67), Vector2.new(0.73, -0.48), Vector2.new(-0.52, 0.04), Vector2.new(0.60, 0.15) },
		plains = { Vector2.new(-0.70, -0.22), Vector2.new(0.70, -0.24), Vector2.new(-0.48, -0.72), Vector2.new(0.50, -0.65) },
		mine = { Vector2.new(-0.73, -0.33), Vector2.new(0.74, -0.30), Vector2.new(-0.46, -0.70), Vector2.new(0.46, -0.70) },
	}
	local zones = encounterZones[biome.encounter or biome.kind] or encounterZones.plains
	for i = 1, math.max(4, math.floor(enemyCount / 5)) do
		local zone = zones[(i - 1) % #zones + 1]
		local x = math.clamp(zone.X * half + rng:NextNumber(-15, 15), -half + 16, half - 16)
		local z = math.clamp(zone.Y * half + rng:NextNumber(-15, 15), -half + 16, half - 35)
		local pos = Vector3.new(x, 0, z)
		if (pos - Vector3.new(0, 0, half - 14)).Magnitude < 54 then pos = scatter(54) end
		table.insert(packCenters, pos)
	end
	for i = 1, enemyCount + bossCount do
		-- [튕김 복구] 생성 도중 철수로 폴더가 삭제되면 낡은 장면에 인스턴스를 만들지 않는다.
		if finished or not folder.Parent then return { finish = finish, cancelled = true } end
		local isBoss = i > enemyCount
		local def
		if isBoss then
			def = biome.mobs[#biome.mobs]
		else
			def = biome.mobs[rng:NextInteger(1, math.max(1, #biome.mobs - 1))]
		end
		local pos
		if isBoss then
			-- 두목은 시작점 반대편 깊숙한 곳을 지킨다
			pos = ORIGIN + Vector3.new(rng:NextNumber(-half * 0.6, half * 0.6), 0, -half * rng:NextNumber(0.35, 0.8))
		elseif i <= 3 then
			-- 처음 몇 마리는 시작점 앞 부채꼴(30~46 스터드): 바로 싸움이 붙는다
			local fanA = rng:NextNumber(-0.95, 0.95)
			local fanR = rng:NextNumber(30, 46)
			pos = ORIGIN + Vector3.new(math.sin(fanA) * fanR, 0, (half - 14) - math.cos(fanA) * fanR)
		else
			local c = packCenters[(i % #packCenters) + 1]
			pos = ORIGIN + c + Vector3.new(rng:NextNumber(-9, 9), 0, rng:NextNumber(-9, 9))
		end
		-- 적이 많아 한 번에 만들면 폰에서 멈춘 것처럼 보이므로, 몇 마리씩 나눠 만든다
		if i > 6 and i % 4 == 0 then
			task.wait()
		end
		local ac = AC.newEnemy(if isBoss then "boss" else kinds[(i - 1) % #kinds + 1])
		local styleN = math.floor((i - 1) / 4) % 3 + 1
		local style = looks[ac.kind][styleN]
		-- [몹 역할별 실루엣] 기존 전투 능력은 유지하고 R15 비율·걸음 성격만 다르게 설정한다.
		local bodyType = if ac.kind == "archer" then "slim" elseif ac.kind == "shield" or isBoss then "heavy"
			elseif ac.kind == "charger" then "athletic" else "average"
		local motionStyle = if ac.kind == "archer" then "nimble" elseif ac.kind == "shield" or isBoss then "heavy"
			elseif ac.kind == "charger" then "disciplined" else "civilian"
		local model = Pose.createR15(folder, pos, 0, style[3], rng, if styleN == 1 then def[2] else style[2], if isBoss then 7.6 else 5.6,
			{ bodyType = bodyType, motionStyle = motionStyle, persona = styleN, profession = ac.kind, year = opts.year })
		if finished or not folder.Parent then
			if model then model:Destroy() end
			return { finish = finish, cancelled = true }
		end
		if not model then
			warn("[MareEssentia] R15 적 모델 생성 불가", def[1])
			continue
		end
		model.Name = "FieldEnemy"
		local root = model:FindFirstChild("HumanoidRootPart")
		if not root then model:Destroy(); continue end
		local bb = Instance.new("BillboardGui")
		bb.Adornee = root
		bb.Size = UDim2.fromOffset(158, 34)
		bb.StudsOffset = Vector3.new(0, 4.5, 0)
		bb.AlwaysOnTop = true
		bb.MaxDistance = if isBoss then 90 else 52
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
		model:SetAttribute("MotionRole", if isBoss then "boss" else ac.kind) -- 게임 규칙이 아닌 관절 동작 선택용
		model:SetAttribute("MotionVariant", styleN) -- 복식·전투 몸짓 전용(저장/피해와 무관)
		tag.Text = def[1] .. " · " .. style[1]
		tag.TextSize = if isBoss then 14 else 12
		tag.TextTruncate = Enum.TextTruncate.AtEnd
		local fm = if FM then FM.new(model, false) else nil
		table.insert(enemies, { fm = fm, ac = ac, model = model, root = root, hp = ac.hp, maxHp = ac.def.hp, dmg = ac.def.dmg, speed = ac.def.speed, bar = bar, nextHit = 0, home = pos, boss = isBoss, swingAt = -10, hurtAt = -10, spawnT = os.clock(), motionPhase = rng:NextNumber(), gait = rng:NextNumber() })
	end

	-- 미니맵: 주변 약 130스터드를 보여 준다(북쪽이 위). 흰 점=나, 금색=발견물(멀면 가장자리에 표시), 빨강=적, 큰 주황=두목
	do
		local MM, RADIUS = 120, 130
		local map = Instance.new("Frame")
		map.AnchorPoint = Vector2.new(0, 0)
		map.Position = UDim2.fromOffset(118, 50)
		map.Size = UDim2.fromOffset(MM, MM)
		map.BackgroundColor3 = Color3.fromRGB(16, 24, 30)
		map.BackgroundTransparency = 0.35
		map.BorderSizePixel = 0
		map.ClipsDescendants = true
		map.Parent = gui
		local mc = Instance.new("UICorner")
		mc.CornerRadius = UDim.new(1, 0)
		mc.Parent = map
		local ms = Instance.new("UIStroke")
		ms.Color = Color3.fromRGB(232, 190, 96)
		ms.Thickness = 2
		ms.Parent = map
		local dots = {}
		local function dot(i: number, color: Color3, size: number)
			local d = dots[i]
			if not d then
				d = Instance.new("Frame")
				d.AnchorPoint = Vector2.new(0.5, 0.5)
				d.BorderSizePixel = 0
				local c = Instance.new("UICorner")
				c.CornerRadius = UDim.new(1, 0)
				c.Parent = d
				d.Parent = map
				dots[i] = d
			end
			d.BackgroundColor3 = color
			d.Size = UDim2.fromOffset(size, size)
			return d
		end
		local me = Instance.new("Frame")
		me.AnchorPoint = Vector2.new(0.5, 0.5)
		me.Position = UDim2.fromScale(0.5, 0.5)
		me.Size = UDim2.fromOffset(7, 7)
		me.BackgroundColor3 = Color3.new(1, 1, 1)
		me.BorderSizePixel = 0
		me.ZIndex = 5
		local mec = Instance.new("UICorner")
		mec.CornerRadius = UDim.new(1, 0)
		mec.Parent = me
		me.Parent = map
		local acc = 0
		table.insert(conns, RunService.Heartbeat:Connect(function(dt)
			acc += dt
			if acc < 0.1 or finished then
				return
			end
			acc = 0
			local hrp0 = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			if not hrp0 then
				return
			end
			local p0 = hrp0.Position
			local used = 0
			local function place(worldPos: Vector3, color: Color3, size: number, clampEdge: boolean): boolean
				local off = Vector2.new(worldPos.X - p0.X, worldPos.Z - p0.Z) / RADIUS
				if off.Magnitude > 1 then
					if not clampEdge then
						return false
					end
					off = off.Unit
				end
				used += 1
				local d = dot(used, color, size)
				d.Position = UDim2.fromOffset(MM / 2 + off.X * (MM / 2 - 4), MM / 2 + off.Y * (MM / 2 - 4))
				d.Visible = true
				return true
			end
			for _, ch in folder:GetChildren() do
				if string.sub(ch.Name, 1, 9) == "Discovery" and ch:IsA("BasePart") then
					place(ch.Position, Color3.fromRGB(255, 214, 120), 8, true)
				end
			end
			for _, e in enemies do
				if e.root and e.root.Parent then
					place(e.root.Position, if e.boss then Color3.fromRGB(255, 150, 60) else Color3.fromRGB(226, 80, 76), if e.boss then 9 else 4, false)
				end
			end
			for i = used + 1, #dots do
				dots[i].Visible = false
			end
		end))
	end

	-- 입력 버튼: 공격 + 스킬 3개(강타·회전베기·구르기). 키보드 F·Q·E·R 도 된다.
	local UserInputService = game:GetService("UserInputService")
	-- [모바일 전투 HUD] 엄지 버튼은 오른쪽 하단, 철수는 왼쪽 위로 분리해 오터치를 방지한다.
	local attackBtn = btn(gui, "공격", Color3.fromRGB(169, 55, 50), UDim2.fromOffset(96, 96), UDim2.new(1, -90, 1, -88), Vector2.new(0.5, 0.5))
	attackBtn.Name = "FieldAttack"
	attackBtn.TextSize = 19
	attackBtn:FindFirstChildOfClass("UICorner").CornerRadius = UDim.new(1, 0)
	local attackIcon = addIcon(attackBtn, "Menu/cc0_sword")
	local retreat = btn(gui, "철수", Color3.fromRGB(54, 75, 86), UDim2.fromOffset(88, 50), UDim2.new(0, 12, 0, 50), Vector2.new(0, 0))
	retreat.Name = "FieldRetreat"
	retreat.TextSize = 14
	addIcon(retreat, "Menu/chart_departure")
	retreat.Activated:Connect(function()
		finish("retreat")
	end)

	local swingKind, swingT0, swingDur = nil, 0, 0
	local hitStopUntil = 0 -- 타격 정지: 이 시각까지 휘두르기 진행을 멈춘다
	local hitStopLast = os.clock()
	local swingCombo, slashIdx = nil, 0
	local SLASH_IDS = { "W:BLADE_SLASH_R", "W:BLADE_SLASH_L", "W:BLADE_THRUST" }
	-- 주인공 무기: 모든 무기를 쓸 수 있고 버튼으로 바꾼다(동료는 직업별로 고정)
	local wpn = Weapons.get(opts.weapon or workspace:GetAttribute("DevWeapon") or "sword")
	-- [무기 교체] 기존 장비를 첫 번째 슬롯으로 보존하고, 다른 전투 거리의 무기 1개만 빠르게 교체한다.
	local reserveWeapon = Weapons.get(if wpn.ranged then "sword" else "bow")
	if attackIcon then
		local iconKey = if wpn.family == "fist" then "Menu/cc0_glove" elseif wpn.family == "axe" then "Menu/cc0_axe"
			elseif wpn.ranged then "Menu/cc0_crossbow" else "Menu/cc0_sword"
		attackIcon.Image = "rbxassetid://" .. tostring(AssetIds[iconKey])
	end
	local function char3()
		local char = player.Character
		return char, char and char:FindFirstChild("HumanoidRootPart")
	end

	-- 공격 동작: 캐릭터의 오른팔·허리를 짧게 휘두른다 (애니메이터가 쓴 뒤 덮어쓴다)
	local function startSwing(kind, dur)
		if kind == "heavy" then
			sfx("sfx_card_blade", 0.7, 0.85)
		elseif kind == "spin" then
			sfx("sfx_card_swing", 0.7, 0.75)
		elseif kind == "dash" then
			sfx("sfx_skill_evade", 0.6, 1.1)
		elseif kind == "guard" then
			sfx("sfx_equipment_wear", 0.5, 1.2)
		elseif string.sub(kind, 1, 4) == "cast" then
			-- 카드 스킬은 자기 효과음을 낸다
		else
			sfx("sfx_card_swing", 0.55, 0.95 + math.random() * 0.2)
		end
		swingCombo = nil
		if FM then
			local isSword = wpn.id == "sword"
			if kind == "heavy" then
				swingCombo = (if isSword then nil else FM.weaponCombo(wpn.motion, 3)) or FM.combo("heavy", { "W:BLADE_OVERHEAD" })
			elseif kind == "spin" then
				swingCombo = (if isSword then nil else FM.weaponCombo(wpn.motion, 2)) or FM.combo("spin", { "W:BLADE_SLASH_R", "W:BLADE_SLASH_L" })
			elseif kind == "slash" then
				slashIdx = slashIdx % 3 + 1
				swingCombo = (if isSword then nil else FM.weaponCombo(wpn.motion, slashIdx)) or FM.combo("slash" .. slashIdx, { SLASH_IDS[slashIdx] })
			end
			dur = Weapons.swingDuration(wpn, dur)
			if swingCombo and kind ~= "spin" then
				dur = math.max(dur, swingCombo.duration)
			end
		end
		swingKind, swingT0, swingDur = kind, os.clock(), dur
	end
	pcall(function()
		RunService:UnbindFromRenderStep("FieldSwing")
	end)
	RunService:BindToRenderStep("FieldSwing", Enum.RenderPriority.Character.Value + 5, function()
		if FM then
			return -- 공용 모션(아래 PreSimulation)이 처리한다
		end
		if not swingKind then
			return
		end
		local char = player.Character
		if not char then
			return
		end
		local p = (os.clock() - swingT0) / swingDur
		if p >= 1 then
			swingKind = nil
			return
		end
		local function joint(partName, jointName)
			local part = char:FindFirstChild(partName)
			local j2 = part and part:FindFirstChild(jointName)
			return if j2 and (j2:IsA("Motor6D") or j2:IsA("AnimationConstraint")) then j2 else nil
		end
		local sh, el, waist = joint("RightUpperArm", "RightShoulder"), joint("RightLowerArm", "RightElbow"), joint("UpperTorso", "Waist")
		local wind = math.min(p / 0.3, 1) -- 뒤로 젖힘
		local strike = math.clamp((p - 0.3) / 0.35, 0, 1) -- 내려침
		if swingKind == "guard" then
			if sh then sh.Transform = CFrame.Angles(-1.5, 0, 0.5) end
			if el then el.Transform = CFrame.Angles(-1.4, 0, 0) end
			if waist then waist.Transform = CFrame.Angles(0.1, 0, 0) end
		elseif swingKind == "spin" then
			if waist then waist.Transform = CFrame.Angles(0, p * math.pi * 4, 0) end
			if sh then sh.Transform = CFrame.Angles(0, 0, -1.4) end
		else
			local power = if swingKind == "heavy" then 1.3 else 1
			if sh then sh.Transform = CFrame.Angles(-2.6 * wind * (1 - strike) + 0.8 * strike * power, 0, -0.3 * wind) end
			if el then el.Transform = CFrame.Angles(-1.2 * wind * (1 - strike), 0, 0) end
			if waist then waist.Transform = CFrame.Angles(0.15 * strike, 0.5 * wind * (1 - strike) - 0.6 * strike, 0) end
		end
	end)
	table.insert(conns, { Disconnect = function()
		pcall(function()
			RunService:UnbindFromRenderStep("FieldSwing")
		end)
	end })

	-- 주인공 모션(마력숲 공용 모션): Animator 가 걷기 포즈를 쓴 직후 그 위에 공격·방어·회피·시전 포즈를 섞는다.
	if FM then
		local pfm, pfmChar = nil, nil
		local castPose = {
			UpperArmL = CFrame.Angles(-2.3, 0, -0.35), UpperArmR = CFrame.Angles(-2.3, 0, 0.35),
			ForearmL = CFrame.Angles(-0.5, 0, 0), ForearmR = CFrame.Angles(-0.5, 0, 0),
			Head = CFrame.Angles(-0.35, 0, 0), Chest = CFrame.Angles(-0.2, 0, 0),
		}
		-- 카드 스킬마다 다른 자세: 회복=두 팔을 벌려 올리고 무릎 굽힘, 보호막=팔을 엇갈려 막기, 원거리=활 당기기, 사기=주먹 치켜들기, 행운=양팔 번쩍, 그 밖(탐색)=손가락으로 가리키기
		local A = CFrame.Angles
		local castPoses = {
			cast_heal = {
				UpperArmL = A(-1.0, 0, -0.9), UpperArmR = A(-1.0, 0, 0.9), ForearmL = A(-0.5, 0, 0), ForearmR = A(-0.5, 0, 0),
				Head = A(-0.4, 0, 0), Chest = A(-0.25, 0, 0), ThighL = A(-0.35, 0, 0), ThighR = A(-0.35, 0, 0), ShinL = A(0.7, 0, 0), ShinR = A(0.7, 0, 0),
			},
			cast_armor = {
				UpperArmL = A(-1.5, 0, 0.9), UpperArmR = A(-1.5, 0, -0.9), ForearmL = A(-1.9, 0, 0), ForearmR = A(-1.9, 0, 0), Chest = A(0.15, 0, 0), Head = A(0.1, 0, 0),
			},
			cast_volley = {
				UpperArmL = A(-1.55, 0, 0.1), UpperArmR = A(-1.5, 0.5, -0.4), ForearmR = A(-2.1, 0, 0), Chest = A(0, 0.5, 0), Head = A(0, -0.3, 0),
				ThighL = A(-0.3, 0, 0), ThighR = A(0.25, 0, 0),
			},
			cast_rally = {
				UpperArmR = A(-3.0, 0, -0.2), ForearmR = A(-0.2, 0, 0), UpperArmL = A(0.3, 0, 0.3), Head = A(-0.5, 0, 0), Chest = A(-0.3, 0, 0),
			},
			cast_luck = {
				UpperArmL = A(-2.6, 0, -0.8), UpperArmR = A(-2.6, 0, 0.8), Head = A(-0.4, 0, 0), Chest = A(-0.2, 0, 0),
			},
			cast_read = {
				UpperArmR = A(-1.55, -0.2, 0), ForearmR = A(-0.1, 0, 0), UpperArmL = A(0.2, 0, 0.25), Head = A(0, -0.3, 0), Chest = A(0.1, -0.2, 0),
			},
		}
		castPoses.cast_ward, castPoses.cast_snipe = castPoses.cast_armor, castPoses.cast_volley
		local dashPose = {
			Spine = CFrame.Angles(0.5, 0, 0), Chest = CFrame.Angles(0.25, 0, 0), Head = CFrame.Angles(-0.4, 0, 0),
			ThighL = CFrame.Angles(-1.0, 0, 0), ThighR = CFrame.Angles(0.6, 0, 0), ShinL = CFrame.Angles(1.2, 0, 0),
			UpperArmL = CFrame.Angles(0.9, 0, -0.1), UpperArmR = CFrame.Angles(0.9, 0, 0.1),
		}
		-- 몸 전체 움직임(마력숲처럼): 베기는 앞으로 숙이며 파고들고, 강타는 뛰어올라 내리찍고, 회전베기는 낮게 두 바퀴, 회피는 앞구르기
		local function bell(x: number): number return math.sin(math.clamp(x, 0, 1) * math.pi) end
		local function rootFor(kind: string, p: number): CFrame?
			if kind == "slash" then
				-- 일반 공격: 몸을 크게 비틀며 한 걸음 내딛고 벤다(좌우 번갈아)
				local side = if slashIdx % 2 == 0 then 1 else -1
				return CFrame.new(0, -0.25 * bell(p), -1.4 * bell((p - 0.1) / 0.7)) * CFrame.Angles(-0.45 * bell((p - 0.1) / 0.65), 0.45 * side * bell(p), 0.12 * side * bell(p))
			elseif kind == "heavy" then
				-- 점프 강타: 웅크림(0~0.18) → 도약(~0.55) → 내려찍기(~0.62) → 착지 충격(~0.8) → 일어남
				local y, lean = 0, 0
				if p < 0.18 then
					local k = p / 0.18
					y, lean = -0.6 * k, 0.3 * k
				elseif p < 0.55 then
					local k = (p - 0.18) / 0.37
					y, lean = -0.6 + 4.4 * math.sin(k * math.pi * 0.5), 0.3 - 0.55 * k
				elseif p < 0.62 then
					local k = (p - 0.55) / 0.07
					y, lean = 3.8 - 4.1 * k * k, -0.25 - 0.65 * k
				elseif p < 0.8 then
					local k = (p - 0.62) / 0.18
					y, lean = -0.3 * (1 - k), -0.9 * (1 - k * 0.6)
				else
					local k = (p - 0.8) / 0.2
					y, lean = 0, -0.36 * (1 - k)
				end
				return CFrame.new(0, y, 0) * CFrame.Angles(lean, 0, 0)
			elseif kind == "spin" then
				return CFrame.new(0, -0.5 * bell(p), 0) * CFrame.Angles(0.12, p * math.pi * 4, 0)
			elseif kind == "dash" then
				return CFrame.new(0, 0.9 * bell(p) - 0.2, 0) * CFrame.Angles(-p * math.pi * 2, 0, 0)
			elseif kind == "cast_heal" then
				return CFrame.new(0, -0.35 * bell(p), 0)
			elseif kind == "cast_luck" then
				return CFrame.new(0, 0.9 * bell(p), 0)
			elseif kind == "cast_rally" then
				return CFrame.new(0, 0.3 * bell(p), 0) * CFrame.Angles(-0.15 * bell(p), 0, 0)
			elseif kind == "cast_volley" or kind == "cast_snipe" then
				return CFrame.Angles(0, -0.35 * bell(p), 0)
			elseif string.sub(kind, 1, 4) == "cast" then
				return CFrame.new(0, 0.15 * bell(p), 0)
			end
			return nil
		end
		table.insert(conns, RunService.PreSimulation:Connect(function(dt)
			if finished then
				return
			end
			local ch = player.Character
			if not ch then
				return
			end
			-- 관절이 아직 안 만들어졌을 때 한 번 묶고 끝나지 않도록, 관절이 모자라면 1초마다 다시 묶는다
			if pfm and pfm.nj < 6 and os.clock() - pfm.t0 > 1 then
				pfmChar = nil
			end
			if pfmChar ~= ch then
				if pfm then
					FM.destroy(pfm)
				end
				pfm, pfmChar = FM.new(ch, true), ch
			end
			local canon = pfm.canon
			table.clear(canon)
			local rootRot = nil
			do
				local nowc = os.clock()
				if nowc < hitStopUntil then
					swingT0 += nowc - hitStopLast -- 멈춘 시간만큼 휘두르기 시작을 늦춘다
				end
				hitStopLast = nowc
			end
			if swingKind then
				local p = (os.clock() - swingT0) / swingDur
				if p >= 1 then
					swingKind = nil
				elseif swingCombo then
					FM.sample(swingCombo, p * swingCombo.duration, canon)
				else
					local w = if swingKind == "guard" then math.min(1, p * 8) * (1 - math.max(0, (p - 0.85) / 0.15)) else math.sin(math.min(p, 1) * math.pi)
					local src
					if swingKind == "guard" then
						src = FM.combo("slash1", { "W:BLADE_SLASH_R" }).guard
					elseif swingKind == "dash" then
						src = dashPose
					else
						src = castPoses[swingKind] or (if string.sub(swingKind, 1, 4) == "cast" then castPoses.cast_read else castPose)
					end
					-- 원거리는 당기다가 놓는 느낌으로: 끝 25%에서 활시위 팔이 튕겨 풀린다
					local wl = w
					if swingKind == "cast_volley" or swingKind == "cast_snipe" then
						wl = if p > 0.7 then math.max(0.15, 1 - (p - 0.7) / 0.1) * w else w
					end
					for name, cf in src do
						canon[name] = CFrame.identity:Lerp(cf, wl)
					end
				end
			end
			if swingKind then
				rootRot = rootFor(swingKind, math.clamp((os.clock() - swingT0) / swingDur, 0, 1))
			end
			FM.scale(canon, 1.45) -- 주인공 공격·스킬 동작도 큼직하게
			FM.step(pfm, dt, rootRot)
		end))
		table.insert(conns, { Disconnect = function()
			if pfm then
				FM.destroy(pfm)
			end
		end })
	end

	-- 효과: 베기 궤적·타격 불꽃(입자)과 맞은 적 붉게 번쩍임, 떠오르는 피해 숫자
	local fxPart = Instance.new("Part")
	fxPart.Anchored = true
	fxPart.CanCollide = false
	fxPart.CanQuery = false
	fxPart.Transparency = 1
	fxPart.Size = Vector3.one
	fxPart.Name = "FieldFx"
	fxPart.Parent = workspace
	local sparks = Instance.new("ParticleEmitter")
	sparks.Rate = 0
	sparks.Lifetime = NumberRange.new(0.25, 0.5)
	sparks.Speed = NumberRange.new(14, 26)
	sparks.SpreadAngle = Vector2.new(180, 180)
	sparks.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.7), NumberSequenceKeypoint.new(1, 0) })
	sparks.LightEmission = 1
	sparks.Color = ColorSequence.new(Color3.fromRGB(255, 226, 120), Color3.fromRGB(255, 120, 60))
	sparks.Parent = fxPart
	local slash = Instance.new("ParticleEmitter")
	slash.Rate = 0
	slash.Lifetime = NumberRange.new(0.2, 0.3)
	slash.Speed = NumberRange.new(0, 2)
	slash.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 4), NumberSequenceKeypoint.new(1, 8) })
	slash.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(1, 1) })
	slash.LightEmission = 1
	slash.Color = ColorSequence.new(Color3.fromRGB(255, 255, 255), Color3.fromRGB(150, 210, 255))
	slash.Parent = fxPart
	table.insert(conns, { Disconnect = function()
		fxPart:Destroy()
	end })
	local function burst(at: Vector3, n: number, big: boolean?, kind: string?)
		fxPart.Position = at
		sparks:Emit(n)
		if big then
			slash:Emit(3)
		end
		if CommonVFX then
			local fn = if kind == "dodge" then "CreateDodgeEvasionPulse" elseif kind == "telegraph" then "CreateAttackTelegraphPulse" elseif big then "CreateCriticalBurst" else "CreateImpactFlash"
			pcall(function()
				CommonVFX[fn]({ cframe = CFrame.new(at), scale = if big then 1.4 else 1, parent = workspace })
			end)
		end
	end
	local function popDamage(model: Model, dmg: number, crit: boolean)
		local root = model:FindFirstChild("HumanoidRootPart")
		if not root then
			return
		end
		local bb = Instance.new("BillboardGui")
		bb.Size = UDim2.fromOffset(90, 40)
		bb.StudsOffset = Vector3.new(0, 5, 0)
		bb.AlwaysOnTop = true
		bb.Adornee = root
		local l = Instance.new("TextLabel")
		l.BackgroundTransparency = 1
		l.Size = UDim2.fromScale(1, 1)
		l.Font = Enum.Font.GothamBlack
		l.TextScaled = true
		l.Text = tostring(dmg)
		l.TextColor3 = if crit then Color3.fromRGB(255, 200, 70) else Color3.fromRGB(255, 255, 255)
		l.TextStrokeTransparency = 0.2
		l.Parent = bb
		bb.Parent = gui
		task.spawn(function()
			for i = 1, 16 do
				bb.StudsOffset = Vector3.new(0, 5 + i * 0.18, 0)
				l.TextTransparency = i / 16
				l.TextStrokeTransparency = 0.2 + 0.8 * i / 16
				task.wait(0.03)
			end
			bb:Destroy()
		end)
	end
	local function flashHit(model: Model)
		local h = Instance.new("Highlight")
		h.FillColor = Color3.fromRGB(255, 70, 60)
		h.FillTransparency = 0.35
		h.OutlineTransparency = 1
		h.Parent = model
		task.delay(0.15, function()
			h:Destroy()
		end)
	end

	-- 맞았을 때 화면 반응: 붉은 테두리와 짧은 카메라 흔들림
	local hurtFlash = Instance.new("Frame")
	hurtFlash.Size = UDim2.fromScale(1, 1)
	hurtFlash.BackgroundTransparency = 1
	hurtFlash.BorderSizePixel = 0
	hurtFlash.Active = false
	hurtFlash.ZIndex = 2
	hurtFlash.Parent = gui
	local hurtStroke = Instance.new("UIStroke")
	hurtStroke.Color = Color3.fromRGB(220, 40, 40)
	hurtStroke.Thickness = 26
	hurtStroke.Transparency = 1
	hurtStroke.Parent = hurtFlash
	local shakeUntil, shakeAmp = 0, 0
	local function hurtReact(power: number)
		hurtStroke.Transparency = 0.35
		sfx("sfx_hit", 0.8, 0.7 + math.random() * 0.1)
		shakeUntil, shakeAmp = os.clock() + 0.25, power
	end
	table.insert(conns, RunService.RenderStepped:Connect(function(dt)
		-- 붉은 테두리는 서서히 사라지고, 체력이 낮으면 계속 은은하게 깜빡인다
		local low = pl.hp / pl.maxHp < 0.3
		local target = if low then 0.78 + 0.1 * math.sin(os.clock() * 5) else 1
		hurtStroke.Transparency += (target - hurtStroke.Transparency) * math.min(1, dt * 4)
		local cam = workspace.CurrentCamera
		if cam and os.clock() < shakeUntil then
			local k = (shakeUntil - os.clock()) / 0.25 * shakeAmp
			cam.CFrame = cam.CFrame * CFrame.new(math.sin(os.clock() * 70) * 0.25 * k, math.sin(os.clock() * 83) * 0.25 * k, 0)
		end
	end))

	-- 궁수 화살 궤적: 두 끝점 사이에 빔을 잠깐 그린다 (모양 파트 없이 보이지 않는 좌표만 쓴다)
	local function arrowTrail(from: Vector3, to: Vector3)
		local function anchorAt(pos: Vector3)
			local a = Instance.new("Part")
			a.Anchored, a.CanCollide, a.CanQuery, a.CanTouch = true, false, false, false
			a.Transparency = 1
			a.Size = Vector3.one * 0.1
			a.Position = pos
			a.Parent = workspace
			local at = Instance.new("Attachment")
			at.Parent = a
			return a, at
		end
		local a0, at0 = anchorAt(from)
		local a1, at1 = anchorAt(to)
		local beam = Instance.new("Beam")
		beam.Attachment0, beam.Attachment1 = at0, at1
		beam.Width0, beam.Width1 = 0.5, 0.15
		beam.Color = ColorSequence.new(Color3.fromRGB(255, 232, 150), Color3.fromRGB(255, 150, 70))
		beam.LightEmission = 1
		beam.FaceCamera = true
		beam.Transparency = NumberSequence.new(0.1)
		beam.Parent = a0
		task.delay(0.22, function()
			a0:Destroy()
			a1:Destroy()
		end)
	end

	-- 바닥 범위 예고: 두목 내려치기처럼 넓은 공격이 닿을 자리를 붉은 원으로 보여 준다
	local function groundRing(center: Vector3, radius: number, dur: number)
		local ring = Instance.new("Part")
		ring.Shape = Enum.PartType.Cylinder
		ring.Anchored, ring.CanCollide, ring.CanQuery, ring.CanTouch = true, false, false, false
		ring.Material = Enum.Material.Neon
		ring.Color = Color3.fromRGB(255, 60, 50)
		ring.Transparency = 0.7
		ring.Size = Vector3.new(0.25, radius * 2, radius * 2)
		ring.CFrame = CFrame.new(center.X, center.Y + 0.2, center.Z) * CFrame.Angles(0, 0, math.pi / 2)
		ring.Parent = workspace
		task.spawn(function()
			local t0 = os.clock()
			while ring.Parent and os.clock() - t0 < dur do
				local k = (os.clock() - t0) / dur
				ring.Transparency = 0.75 - 0.4 * k
				task.wait()
			end
			ring:Destroy()
		end)
	end

	-- ===== 화려한 타격 연출: 충격파 링·네온 파편·휘두르는 칼빛·화면 번쩍임 =====
	local TweenService = game:GetService("TweenService")
	-- [공용 VFX] 마력숲의 등록형 입자·검빛 스프라이트를 재사용한다. 새 도형 파편·원통·막대는 만들지 않는다.
	local function shockRing(center: Vector3, maxR: number, color: Color3, dur: number?)
		if not CommonVFX then return end
		pcall(CommonVFX.Create, "SHAPE_BURST", {
			parent = workspace, cframe = CFrame.new(center), color = color, accent = color:Lerp(Color3.new(1, 1, 1), 0.4),
			startDiameter = 1.8, endDiameter = math.min(maxR * 2, 90), duration = dur or 0.35,
			count = 4, hideFlash = true,
		})
	end
	local function shards(at: Vector3, n: number, color: Color3, dist: number)
		if not CommonVFX then return end
		pcall(CommonVFX.Create, "CRITICAL_BURST", {
			parent = workspace, cframe = CFrame.new(at), color = color, accent = color:Lerp(Color3.new(1, 1, 1), 0.35),
			count = math.min(n, 16), distance = dist, duration = 0.32, hideRing = true,
		})
	end
	-- [검술 궤적] 손·무기 Trail과 연동하는 반투명 붓질 스프라이트. 전투 판정과 별도다.
	local function slashArc(hrp: BasePart, color: Color3, reach: number, arc: number, tilt: number)
		if not CommonVFX then return end
		pcall(CommonVFX.Create, "SHAPE_BURST", {
			parent = workspace, cframe = hrp.CFrame * CFrame.new(0, 0.6, -reach * 0.35),
			color = color, accent = color:Lerp(Color3.new(1, 1, 1), 0.5), textureKey = "slash",
			rotation = tilt + arc * 0.25, hideRing = true, count = 2,
			startSize = math.max(1.5, reach * 0.35), endSize = reach * 1.3, duration = 0.2,
		})
	end
	local flashFrame = Instance.new("Frame")
	flashFrame.Size = UDim2.fromScale(1, 1)
	flashFrame.BackgroundColor3 = Color3.new(1, 1, 1)
	flashFrame.BackgroundTransparency = 1
	flashFrame.BorderSizePixel = 0
	flashFrame.Active = false
	flashFrame.ZIndex = 0
	flashFrame.Parent = gui
	local function screenFlash(color: Color3, alpha: number)
		flashFrame.BackgroundColor3 = color
		flashFrame.BackgroundTransparency = alpha
		TweenService:Create(flashFrame, TweenInfo.new(0.25), { BackgroundTransparency = 1 }):Play()
	end

	-- ===== 마력숲식 스킬 연출: 팔다리·칼 궤적(AttachShortTrail), 몸에 오라(Highlight), 공용 파동(CommonVFX.Create) =====
	local TRAIL_LIMBS = { "RightHand", "RightLowerArm", "LeftHand", "LeftLowerArm", "RightLowerLeg", "LeftLowerLeg" }
	local function trailsOn(ch: Model?, names: { string }, color: Color3, life: number, dur: number)
		if not ch or not CommonVFX or not CommonVFX.AttachShortTrail then return end
		local function attach(part: Instance?, len: number?)
			if part and part:IsA("BasePart") then
				local ok, trail, ctl = pcall(CommonVFX.AttachShortTrail, part, {
					lifetime = life, width = 1, axis = Vector3.new(0, 1, 0), length = math.max(0.8, len or part.Size.Y * 1.5), color = color,
				})
				if ok and trail and ctl then
					task.delay(dur, function() pcall(ctl.Destroy) end)
				end
			end
		end
		for _, nm in names do attach(ch:FindFirstChild(nm)) end
		local sword = ch:FindFirstChild("FieldWeapon", true) or ch:FindFirstChild("FieldSword", true)
		if sword then
			local blade = if sword:IsA("BasePart") then sword else sword:FindFirstChildWhichIsA("BasePart", true)
			attach(blade, 4)
		end
	end
	local function auraOn(ch: Model?, fill: Color3, outline: Color3, dur: number)
		if not ch then return end
		local h = Instance.new("Highlight")
		h.Adornee = ch
		h.DepthMode = Enum.HighlightDepthMode.Occluded
		h.FillColor, h.OutlineColor = fill, outline
		h.FillTransparency, h.OutlineTransparency = 0.72, 0.08
		h.Parent = ch
		task.delay(dur * 0.55, function()
			if h.Parent then
				TweenService:Create(h, TweenInfo.new(dur * 0.45), { FillTransparency = 1, OutlineTransparency = 1 }):Play()
			end
		end)
		task.delay(dur, function() h:Destroy() end)
	end
	-- 잔상: 지금 몸 모양 그대로 반투명 빛 분신을 남기고 서서히 사라진다(대시·회전베기·강타용)
	local GHOST_PARTS = { "Head", "UpperTorso", "LowerTorso", "LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand", "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "RightUpperLeg", "RightLowerLeg", "RightFoot" }
	local function afterimage(ch: Model?, color: Color3, count: number, interval: number)
		if not ch then return end
		local TweenService = game:GetService("TweenService")
		for i = 1, count do
			task.delay((i - 1) * interval, function()
				if finished or not ch.Parent then return end
				local ghosts = {}
				for _, nm in GHOST_PARTS do
					local src = ch:FindFirstChild(nm)
					if src and src:IsA("BasePart") then
						local g = src:Clone()
						g:ClearAllChildren()
						g.Anchored = true
						g.CanCollide, g.CanTouch, g.CanQuery = false, false, false
						g.Material = Enum.Material.Neon
						g.Color = color
						g.Transparency = 0.45
						g.CFrame = src.CFrame
						pcall(function() (g :: any).TextureID = "" end)
						g.Parent = folder
						table.insert(ghosts, g)
						TweenService:Create(g, TweenInfo.new(0.42, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Transparency = 1, Size = g.Size * 0.85 }):Play()
					end
				end
				task.delay(0.5, function()
					for _, g in ghosts do g:Destroy() end
				end)
			end)
		end
	end
	local function pulseAt(atom: string, cf: CFrame, color: Color3, accent: Color3, endDia: number, count: number)
		if not CommonVFX or not CommonVFX.Create then return end
		pcall(CommonVFX.Create, atom, {
			parent = workspace, cframe = cf, duration = 0.42, color = color, accent = accent,
			startDiameter = 1.4, endDiameter = endDia, startSize = 0.46, endSize = 2.6, count = count,
		})
	end

	-- 연타 표시: 3연타 마무리에서 크게 보여 준다
	local comboLabel = label(gui, "", 30, Color3.fromRGB(255, 226, 120))
	comboLabel.AnchorPoint = Vector2.new(0.5, 0.5)
	comboLabel.Position = UDim2.fromScale(0.5, 0.62)
	comboLabel.Size = UDim2.fromOffset(300, 40)
	comboLabel.TextTransparency = 1
	local function showCombo(text: string)
		comboLabel.Text = text
		comboLabel.TextTransparency = 0
		task.spawn(function()
			for i = 1, 14 do
				comboLabel.TextTransparency = i / 14
				comboLabel.Position = UDim2.fromScale(0.5, 0.62 - i * 0.004)
				task.wait(0.03)
			end
		end)
	end

	local function nearest(hrp, range)
		local best, bestD = nil, range
		for _, e in enemies do
			local d = (e.root.Position - hrp.Position).Magnitude
			if d < bestD then
				best, bestD = e, d
			end
		end
		return best
	end

	-- 가장 가까운 적 표시: 발밑에 ▼ 표식
	local lockBb = Instance.new("BillboardGui")
	lockBb.Size = UDim2.fromOffset(34, 34)
	lockBb.StudsOffset = Vector3.new(0, 6.6, 0)
	lockBb.AlwaysOnTop = true
	lockBb.Enabled = false
	lockBb.Parent = gui
	local lockLbl = label(lockBb, "▼", 26, Color3.fromRGB(255, 226, 120))
	lockLbl.Size = UDim2.fromScale(1, 1)
	local lockTarget = nil
	table.insert(conns, RunService.Heartbeat:Connect(function()
		local _, hrp = char3()
		local best = if hrp then nearest(hrp, 30) else nil
		if best ~= lockTarget then
			lockTarget = best
			lockBb.Adornee = if best then best.root else nil
		end
		lockBb.Enabled = best ~= nil
	end))

	-- 한 번의 타격: ActionCombat 규칙으로 피해를 계산하고 효과·처치를 처리한다
	-- 연속 명중 연출: 5·10·15… 명중마다 화면 번쩍임·충격파·잠깐 멈춤(슬로모션 느낌)
	local streakN, streakT = 0, 0
	local function comboCinema(n: number)
		local _, h0 = char3()
		showCombo(string.format("%d 콤보!", n))
		screenFlash(Color3.fromRGB(255, 236, 170), 0.55)
		hitStopUntil = math.max(hitStopUntil, os.clock() + 0.22)
		shakeUntil, shakeAmp = os.clock() + 0.3, 1.2
		if h0 then
			shockRing(h0.Position - Vector3.new(0, 2.5, 0), 18, Color3.fromRGB(255, 220, 120), 0.5)
			afterimage(player.Character, Color3.fromRGB(255, 214, 120), 3, 0.05)
		end
	end
	local function strikeEnemy(e, mult: number, hrpPos: Vector3, knock: number, stagger: boolean?, quiet: boolean?)
		local dealt, died = AC.damageEnemy(e.ac, BASE_DMG * (if quiet then 1 else wpn.power) * (if os.clock() < (pl.buffUntil or 0) then 1.3 else 1), mult, e.ac.state ~= "stagger", stagger)
		e.hp = e.ac.hp
		e.hurtAt = os.clock()
		e.bar.Size = UDim2.fromScale(math.max(e.ac.hp, 0) / e.maxHp, 1)
		local away = (e.root.Position - hrpPos) * Vector3.new(1, 0, 1)
		if away.Magnitude > 0.1 and not e.ac.def.boss then
			-- 순간이동 대신 짧게 미끄러지듯 밀려난다(0.18초 감속)
			e.kbVel = away.Unit * (knock / 0.09)
			e.kbUntil = os.clock() + 0.18
			e.kbT0 = os.clock()
		end
		if not quiet then
			hitStopUntil = math.max(hitStopUntil, os.clock() + (if mult >= 1.5 then 0.09 else 0.045))
			if os.clock() - streakT > 3 then
				streakN = 0
			end
			streakN += 1
			streakT = os.clock()
			if streakN % 5 == 0 then
				comboCinema(streakN)
			end
		end
		burst(e.root.Position + Vector3.new(0, 2, 0), 12 + dealt, mult >= 1.5)
		if not quiet then
			sfx("sfx_hit", 0.7, 0.95 + math.random() * 0.2)
			if mult >= 1.5 then
				sfx("sfx_metal_clash", 0.6, 0.9)
			end
		else
			sfx("sfx_hit", 0.4, 1.1)
		end
		flashHit(e.model)
		popDamage(e.model, dealt, mult >= 1.5)
		do
			local crit = mult >= 1.5
			local c = if crit then Color3.fromRGB(255, 205, 80) else Color3.fromRGB(190, 230, 255)
			shards(e.root.Position + Vector3.new(0, 1.5, 0), if crit then 14 else 7, c, if crit then 7 else 4)
			if crit then shockRing(e.root.Position - Vector3.new(0, e.root.Size.Y * 0.5 + 1.5, 0), 9, c, 0.35) end
		end
		-- 타격 멈춤(적이 잠깐 굳음)과 시야 펀치로 손맛을 준다
		e.holdUntil = os.clock() + (if mult >= 1.5 then 0.12 else 0.06)
		local punchCam = workspace.CurrentCamera
		if punchCam and not quiet then
			punchCam.FieldOfView = 70 - (if mult >= 1.5 then 5 else 2)
			task.delay(0.1, function()
				punchCam.FieldOfView = 70
			end)
		end
		-- 두목은 체력이 절반 아래로 내려가면 격분한다(더 빠르고 공격 준비가 짧아진다)
		if e.ac.def.boss and not e.enraged and not died and e.ac.hp <= e.maxHp * 0.5 then
			e.enraged = true
			local d2 = table.clone(e.ac.def)
			d2.windup = d2.windup * 0.7
			d2.recover = d2.recover * 0.7
			d2.speed = d2.speed * 1.3
			e.ac.def = d2
			say("두목이 격분했다!")
			sfx("sfx_event_war", 0.7, 1)
			hurtReact(1.5)
			burst(e.root.Position + Vector3.new(0, 3, 0), 40, true)
		end
		if died then
			local idx = table.find(enemies, e)
			if idx then
				table.remove(enemies, idx)
			end
			if e.warnBb then e.warnBb:Destroy() e.warnBb = nil end
			local dying = e.model
			if e.fm then
				FM.destroy(e.fm)
				e.fm = nil
			end
			-- 마지막 일격: 맞은 반대 방향으로 밀려나며(점점 느려짐) 쓰러진다
			local flyDir = (e.root.Position - hrpPos) * Vector3.new(1, 0, 1)
			flyDir = if flyDir.Magnitude > 0.1 then flyDir.Unit else Vector3.zero
			local flyDist = (if mult >= 1.5 then 9 else 5) * (if e.boss then 0.3 else 1)
			task.spawn(function()
				local t0 = os.clock()
				local lastP = 0
				while dying.Parent and os.clock() - t0 < 0.7 do
					local p = (os.clock() - t0) / 0.7
					Pose.dieR15(dying, p)
					local ease = 1 - (1 - p) * (1 - p)
					pcall(function()
						dying:PivotTo(dying:GetPivot() + flyDir * flyDist * (ease - lastP))
					end)
					lastP = ease
					task.wait()
				end
				dying:Destroy()
			end)
			do
				local p0 = e.root.Position
				local gold = Color3.fromRGB(255, 214, 90)
				shockRing(p0 - Vector3.new(0, 2.5, 0), if e.boss then 30 else 14, gold, 0.55)
				shards(p0, if e.boss then 40 else 18, gold, if e.boss then 16 else 9)
				if e.boss then
					shockRing(p0 - Vector3.new(0, 2.5, 0), 20, Color3.fromRGB(255, 120, 70), 0.8)
					screenFlash(Color3.new(1, 0.95, 0.8), 0.35)
					shakeUntil, shakeAmp = os.clock() + 0.5, 2.2
				end
			end
			say(if e.boss then "두목을 쓰러뜨렸다!" else "적을 물리쳤다!")
			sfx(if e.boss then "sfx_fanfare" else "sfx_card_chain", 0.6, 1)
			-- 전리품: 쓰러뜨리면 체력 회복약을 줍는다 (두목은 항상, 졸개는 40%)
			if e.boss or math.random() < 0.4 then
				local heal = if e.boss then 30 else 12
				pl.hp = math.min(pl.maxHp, pl.hp + heal)
				popDamage(e.model, heal, false)
				burst(e.root.Position + Vector3.new(0, 2, 0), 10, false)
				refresh()
			end
		end
	end

	-- [무기 외형] 등록된 실제 3D 메시만 사용한다. 늦게 도착한 모델도 기존 장착 함수로 갱신한다.
	-- 기존 무기·동료 데이터와 무관한 클라이언트 연출만 교체한다. 전투 수치·저장키는 수정하지 않는다.
	local function equipFieldWeapon(character, weapon)
		if not character then return end
		local prev = character:FindFirstChild("FieldWeapon") or character:FindFirstChild("FieldSword")
		if prev then prev:Destroy() end
		character:SetAttribute("EquippedWeaponId", weapon.id)
		character:SetAttribute("EquippedWeaponName", weapon.name)
		character:SetAttribute("WeaponVisualSource", "unarmed")
		if weapon.family == "fist" then return end
		local hand = character:FindFirstChild("RightHand") or character:FindFirstChild("Right Arm")
		if not (hand and hand:IsA("BasePart")) then return end
		local lib = ReplicatedStorage:FindFirstChild("MareAssets")
		local group = lib and lib:FindFirstChild("Relics")
		-- [자산 권한] 등록표에 없는 임의 모델을 장착하지 않는다.
		local registeredId = weapon.model and AssetIds["Relics/" .. weapon.model]
		local tpl = registeredId and group and group:FindFirstChild(weapon.model)
		if tpl and tpl:IsA("Model") then
			local held = tpl:Clone()
			held.Name = if weapon.id == "sword" then "FieldSword" else "FieldWeapon"
			local count = 0
			for _, bp in held:GetDescendants() do
				if bp:IsA("BasePart") then
					count += 1
					bp.Anchored, bp.CanCollide, bp.CanTouch, bp.CanQuery = false, false, false, false
					bp.Massless = true
				end
			end
			if count > 0 then
				local bb, ext = held:GetBoundingBox()
				local longest = math.max(ext.X, ext.Y, ext.Z)
				-- [손 장착 크기] 원본 메시 비율을 유지하며 무기별 크기만 조정한다.
				local targetLength = if weapon.family == "dagger" then 1.8
					elseif weapon.family == "bow" then 3.5
					elseif weapon.family == "spear" then 4.6
					elseif weapon.family == "axe" or weapon.family == "blunt" then 3.1
					elseif weapon.family == "firearm" then (if weapon.motion == "PISTOL" then 2.0 else 3.7)
					else 3.3
				if longest > 0.05 then pcall(function() held:ScaleTo(targetLength / longest) end) end
				held.Parent = character
				bb, ext = held:GetBoundingBox()
				local ax = if ext.X >= ext.Y and ext.X >= ext.Z then bb.RightVector elseif ext.Y >= ext.Z then bb.UpVector else bb.LookVector
				local fwd = hand.CFrame.LookVector
				local cross = ax:Cross(fwd)
				local rotation = if cross.Magnitude < 1e-4
					then (if ax:Dot(fwd) > 0 then CFrame.identity else CFrame.fromAxisAngle(hand.CFrame.UpVector, math.pi))
					else CFrame.fromAxisAngle(cross.Unit, math.acos(math.clamp(ax:Dot(fwd), -1, 1)))
				local len = math.max(ext.X, ext.Y, ext.Z)
				local newBB = CFrame.new(hand.Position + fwd * (len * 0.35) - hand.CFrame.UpVector * 0.3) * (rotation * bb.Rotation)
				held:PivotTo(newBB * bb:ToObjectSpace(held:GetPivot()))
				for _, bp in held:GetDescendants() do
					if bp:IsA("BasePart") then
						local weld = Instance.new("WeldConstraint")
						weld.Part0, weld.Part1, weld.Parent = hand, bp, bp
					end
				end
				character:SetAttribute("WeaponVisualSource", "registered")
				return
			end
			held:Destroy()
		end

		-- [미등록 자산] Roblox 등록·권한·실물 수입 전에는 도형 조립으로 대체하지 않는다.
		-- 원본이 등록되고 MareAssets에 수입되면 위 경로로 바로 장착된다.
		character:SetAttribute("WeaponVisualSource", "asset_pending")
	end
	-- [실물 무기 지연 로드] Relics는 항구 모델보다 늦게 로드되므로, 도착한 승인 모델만 재장착한다.
	-- 플레이어/동료의 기존 무기 ID와 전투 수치, 저장 구조는 유지한다.
	local assetLibrary = ReplicatedStorage:FindFirstChild("MareAssets")
	local relicGroup = assetLibrary and assetLibrary:FindFirstChild("Relics")
	if relicGroup then
		table.insert(conns, relicGroup.ChildAdded:Connect(function(asset)
			if not asset:IsA("Model") or not string.match(asset.Name, "^weapon%-") then return end
			task.defer(function()
				-- Roblox 모델/메시의 복제 순서가 달라도 빈 모델을 장착 완료로 간주하지 않는다.
				local deadline = os.clock() + 5
				while asset.Parent == relicGroup and not asset:FindFirstChildWhichIsA("BasePart", true)
					and os.clock() < deadline and not finished do
					task.wait(0.1)
				end
				if finished or not folder.Parent or not asset:FindFirstChildWhichIsA("BasePart", true) then return end
				local character = player.Character
				if character and character:GetAttribute("WeaponVisualSource") == "asset_pending" then
					local id = character:GetAttribute("EquippedWeaponId")
					if type(id) == "string" then
						local weapon = Weapons.get(id)
						if weapon.model == asset.Name then equipFieldWeapon(character, weapon) end
					end
				end
				for _, characterModel in folder:GetDescendants() do
					if characterModel:IsA("Model") and characterModel:GetAttribute("WeaponVisualSource") == "asset_pending" then
						local id = characterModel:GetAttribute("EquippedWeaponId")
						if type(id) == "string" then
							local weapon = Weapons.get(id)
							if weapon.model == asset.Name then equipFieldWeapon(characterModel, weapon) end
						end
					end
				end
			end)
		end))
	end
	-- 플레이어 무기는 현장 교체 시 즉시 실제 손의 장비까지 교체한다.
	equipFieldWeapon(player.Character, wpn)
	table.insert(conns, { Disconnect = function()
		local character = player.Character
		local held = character and (character:FindFirstChild("FieldWeapon") or character:FindFirstChild("FieldSword"))
		if held then held:Destroy() end
	end })

	-- 폭발통: 들판 곳곳의 통(Naval/barrel). 공격이 닿으면 터져 주변 적에게 큰 피해를 준다(가까이 있으면 나도 다친다).
	local barrels: { any } = {}
	do
		local lib = ReplicatedStorage:FindFirstChild("MareAssets")
		local grp = lib and lib:FindFirstChild("Naval")
		local tpl = grp and grp:FindFirstChild("barrel")
		if tpl and tpl:IsA("Model") then
			for i = 1, 3 do
				local m = tpl:Clone()
				m.Name = "FieldBarrel"
				for _, bp in m:GetDescendants() do
					if bp:IsA("BasePart") then
						bp.Anchored = true
						bp.CanCollide = false
						bp.CanQuery = false
						bp.CanTouch = false
					end
				end
				local _, ext = m:GetBoundingBox()
				local longest = math.max(ext.X, ext.Y, ext.Z)
				if longest > 0.05 then
					pcall(function()
						m:ScaleTo(4 / longest)
					end)
				end
				local p0 = ORIGIN + scatter(20)
				m.Parent = folder
				m:PivotTo(CFrame.new(p0 + Vector3.new(0, 2, 0)))
				local hl = Instance.new("Highlight")
				hl.FillColor = Color3.fromRGB(255, 90, 40)
				hl.FillTransparency = 0.75
				hl.OutlineColor = Color3.fromRGB(255, 160, 60)
				hl.Parent = m
				table.insert(barrels, { model = m, pos = p0 + Vector3.new(0, 2, 0) })
			end
		end
	end
	-- 부서지는 사물: 상자·양동이·자루. 공격이 닿으면 부서지며 회복·기력·공격력 상승 중 하나가 나온다.
	local crates: { any } = {}
	do
		local lib = ReplicatedStorage:FindFirstChild("MareAssets")
		local grp = lib and lib:FindFirstChild("Cargo")
		for i = 1, 10 do
			local tpl = grp and grp:FindFirstChild(({ "box-open", "bucket", "bag" })[(i - 1) % 3 + 1])
			if tpl and tpl:IsA("Model") then
				local m = tpl:Clone()
				m.Name = "FieldCrate"
				for _, bp in m:GetDescendants() do
					if bp:IsA("BasePart") then
						bp.Anchored, bp.CanCollide, bp.CanQuery, bp.CanTouch = true, false, false, false
					end
				end
				local _, ext = m:GetBoundingBox()
				local longest = math.max(ext.X, ext.Y, ext.Z)
				if longest > 0.05 then
					pcall(function()
						m:ScaleTo(3 / longest)
					end)
				end
				local p0 = ORIGIN + scatter(12)
				m.Parent = folder
				m:PivotTo(CFrame.new(p0 + Vector3.new(0, 1.5, 0)) * CFrame.Angles(0, rng:NextNumber(0, 6.28), 0))
				table.insert(crates, { model = m, pos = p0 + Vector3.new(0, 1.5, 0) })
			end
		end
	end
	local function breakCrate(c)
		local idx = table.find(crates, c)
		if not idx then
			return
		end
		table.remove(crates, idx)
		c.model:Destroy()
		burst(c.pos, 18, false)
		sfx("sfx_hit", 0.5, 1.3)
		local r = math.random()
		if r < 0.4 then
			pl.hp = math.min(pl.maxHp, pl.hp + pl.maxHp * 0.12)
			say("상자에서 약초! 체력 회복")
		elseif r < 0.8 then
			pl.stamina = math.min(AC.STAMINA_MAX, pl.stamina + 40)
			say("기력이 차올라요")
		else
			pl.buffUntil = os.clock() + 8
			say("공격력 상승! (8초)")
		end
		refresh()
	end

	local function explodeBarrel(b, hrp: BasePart)
		local idx = table.find(barrels, b)
		if not idx then
			return
		end
		table.remove(barrels, idx)
		b.model:Destroy()
		burst(b.pos, 60, true)
		sfx("sfx_naval_cannon", 0.9, 1.1)
		shakeUntil, shakeAmp = os.clock() + 0.4, 1.6
		local n = 0
		for _, e in table.clone(enemies) do
			if (e.root.Position - b.pos).Magnitude <= 14 then
				strikeEnemy(e, 3, b.pos, 6, true)
				n += 1
			end
		end
		if (hrp.Position - b.pos).Magnitude <= 8 then
			local dealt = AC.takeHit(pl, 8, os.clock(), nil)
			if dealt > 0 then
				hurtReact(1.5)
				refresh()
				if pl.hp <= 0 then
					task.defer(function()
						finish("defeat")
					end)
				end
			end
		end
		say(if n > 0 then string.format("폭발! %d명 휘말렸다", n) else "폭발! 아무도 없었다")
	end

	-- 동작 하나를 쓴다: 규칙 검사(쿨타임·기력·콤보) → 모션 → 범위 안의 적을 친다
	local STUD = 2 -- 규칙의 거리 1 = 2 스터드
	-- 장착한 스킬만 쓴다(주인공 스킬은 최대 3개). 공격·회피는 기본 행동이라 늘 쓸 수 있다.
	local equipped = { heavy = true, sweep = true }
	local function useMove(moveId: string)
		if finished then
			return
		end
		if (moveId == "heavy" or moveId == "sweep") and not equipped[moveId] then
			say("장착한 스킬이 아니에요")
			return
		end
		local _, hrp = char3()
		if not hrp then
			return
		end
		local now = os.clock()
		local ok, mult, mv = AC.tryMove(pl, moveId, now)
		if not ok then
			if mv and pl.stamina < mv.stamina then
				say("기력이 부족해요")
			elseif mv and (pl.cd[moveId] or -100) > now then
				say(string.format("%s 재사용까지 %.1f초", mv.label or "스킬", pl.cd[moveId] - now))
			end
			return
		end
		if moveId == "dodge" then
			local look = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
			if look.Magnitude > 0.1 then
				hrp.CFrame = hrp.CFrame + look.Unit * 14
			end
			burst(hrp.Position, 24, false, "dodge")
			do
				local ch0 = player.Character
				trailsOn(ch0, TRAIL_LIMBS, Color3.fromRGB(82, 204, 255), 0.42, 1.2)
				auraOn(ch0, Color3.fromRGB(96, 181, 255), Color3.fromRGB(244, 218, 147), 0.9)
				afterimage(ch0, Color3.fromRGB(110, 205, 255), 4, 0.05)
				for i, dl in { 0.02, 0.2 } do
					task.delay(dl, function()
						pulseAt("DODGE_EVASION_PULSE", hrp.CFrame * CFrame.new(0, -2.4, 0), if i == 1 then Color3.fromRGB(117, 214, 255) else Color3.fromRGB(255, 210, 127), Color3.fromRGB(239, 249, 255), 7, 10)
					end)
				end
			end
			startSwing("dash", 0.4)
			say("회피! 잠깐 무적")
			return
		end
		-- 조준 보조: 가까운 적(40스터드 안)을 바라보고, 닿지 않으면 몸을 날려 붙는다 (폰에서 헛손질 방지)
		do
			local near, nd = nil, 40
			for _, e in enemies do
				if e.root and e.root.Parent then
					local d = ((e.root.Position - hrp.Position) * Vector3.new(1, 0, 1)).Magnitude
					if d < nd then near, nd = e, d end
				end
			end
			if near then
				local flat = (near.root.Position - hrp.Position) * Vector3.new(1, 0, 1)
				if flat.Magnitude > 0.1 then
					local reach = (if moveId == "rush" then wpn.range else (AC.Moves[moveId] and AC.Moves[moveId].range or 5)) * STUD
					local lunge = if nd > reach - 2 and not (wpn.ranged and moveId == "rush") then math.min(nd - (reach - 3), 10) else 0
					hrp.CFrame = CFrame.lookAt(hrp.Position + flat.Unit * math.max(0, lunge), hrp.Position + flat.Unit * math.max(0, lunge) + flat.Unit)
				end
			end
		end
		local combo0 = pl.combo
		local kind = if moveId == "sweep" then "spin" elseif moveId == "heavy" or (moveId == "rush" and pl.combo >= 3) then "heavy" else "slash"
		startSwing(kind, if kind == "spin" then 0.6 elseif kind == "heavy" then 0.7 else 0.4)
		do
			local reachV = (mv.range or 5) * STUD
			do
				local ch0 = player.Character
				if kind == "spin" then
					trailsOn(ch0, TRAIL_LIMBS, Color3.fromRGB(120, 220, 255), 0.4, 0.9)
					auraOn(ch0, Color3.fromRGB(90, 190, 255), Color3.fromRGB(230, 250, 255), 0.8)
					afterimage(ch0, Color3.fromRGB(130, 225, 255), 5, 0.06)
					pulseAt("SHAPE_BURST", hrp.CFrame * CFrame.new(0, -2.2, 0), Color3.fromRGB(130, 225, 255), Color3.fromRGB(240, 250, 255), reachV * 2.4, 16)
				elseif kind == "heavy" then
					trailsOn(ch0, { "RightHand", "RightLowerArm", "RightLowerLeg" }, Color3.fromRGB(255, 160, 70), 0.45, 0.9)
					auraOn(ch0, Color3.fromRGB(255, 140, 60), Color3.fromRGB(255, 226, 150), 0.8)
					afterimage(ch0, Color3.fromRGB(255, 170, 80), 3, 0.08)
					pulseAt("CRITICAL_BURST", hrp.CFrame * CFrame.new(0, -1.5, -reachV * 0.6), Color3.fromRGB(255, 180, 90), Color3.fromRGB(255, 240, 200), reachV * 1.8, 14)
				else
					trailsOn(ch0, { "RightHand", "RightLowerArm" }, Color3.fromRGB(225, 240, 255), 0.3, 0.6)
				end
			end
			if kind == "spin" then
				shockRing(hrp.Position - Vector3.new(0, 2.5, 0), reachV + 4, Color3.fromRGB(120, 220, 255), 0.45)
				slashArc(hrp, Color3.fromRGB(150, 230, 255), reachV, 330, 0)
			elseif kind == "heavy" then
				-- 착지(내려찍는 순간)에 맞춰 충격파·호를 낸다
				task.delay(0.42, function()
					if finished or not hrp.Parent then return end
					slashArc(hrp, Color3.fromRGB(255, 160, 70), reachV + 2, 150, -35)
					shockRing(hrp.Position + hrp.CFrame.LookVector * (reachV * 0.6) - Vector3.new(0, 2.5, 0), 12, Color3.fromRGB(255, 150, 60), 0.5)
					shockRing(hrp.Position - Vector3.new(0, 2.5, 0), 7, Color3.fromRGB(255, 226, 150), 0.35)
					shakeUntil, shakeAmp = os.clock() + 0.25, 1.1
				end)
			else
				slashArc(hrp, Color3.fromRGB(235, 245, 255), reachV, 110, if combo0 % 2 == 0 then 25 else -25)
			end
		end
		local combo = pl.combo
		task.delay(if kind == "slash" then 0.14 elseif kind == "heavy" then 0.42 else 0.2, function()
			if finished then
				return
			end
			local hits = 0
			-- 무기에 따라 기본 공격의 사거리·각도가 다르다. 석궁·총은 가장 가까운 한 명을 쏜다(총알 궤적 표시).
			local rangeR = if moveId == "rush" then wpn.range else mv.range
			local arcR = if moveId == "rush" and wpn.ranged then 36 else mv.arc
			local rangedShot = moveId == "rush" and wpn.ranged
			local list = table.clone(enemies)
			if rangedShot then
				table.sort(list, function(x, y)
					return (x.root.Position - hrp.Position).Magnitude < (y.root.Position - hrp.Position).Magnitude
				end)
			end
			for _, e in list do
				if rangedShot and hits >= 1 then
					break
				end
				local to = (e.root.Position - hrp.Position) * Vector3.new(1, 0, 1)
				local dist = to.Magnitude
				local ang = 0
				if dist > 0.1 then
					local look = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
					ang = math.deg(math.acos(math.clamp(look.Unit:Dot(to.Unit), -1, 1)))
				end
				if AC.inReach(rangeR * STUD + 3, arcR, dist, ang) then
					strikeEnemy(e, mult, hrp.Position, if combo >= 3 and moveId == "rush" then 6 elseif mv.stagger then 5 else 2.5, mv.stagger or (moveId == "rush" and combo >= 3) or wpn.family == "blunt")
					hits += 1
					if rangedShot then
						-- 총알·화살 궤적: 짧게 번쩍이는 빛줄기
						local a0 = hrp.Position + Vector3.new(0, 0.5, 0)
						local b0 = e.root.Position
						local len = (b0 - a0).Magnitude
						local arrow = wpn.family == "bow" or wpn.id == "crossbow"
						local tr = part(folder, Vector3.new(if arrow then 0.09 else 0.25, if arrow then 0.09 else 0.25, len), CFrame.lookAt(a0, b0) * CFrame.new(0, 0, -len / 2), if arrow then Color3.fromRGB(187, 148, 89) else Color3.fromRGB(255, 230, 150), if arrow then Enum.Material.Wood else Enum.Material.Neon)
						tr.CanCollide, tr.CanQuery = false, false
						game:GetService("TweenService"):Create(tr, TweenInfo.new(0.14), { Transparency = 1, Size = Vector3.new(0.05, 0.05, len) }):Play()
						task.delay(0.2, function() tr:Destroy() end)
						burst(b0 + Vector3.new(0, 1.5, 0), 6, false)
						sfx(if wpn.family == "firearm" and wpn.id ~= "crossbow" then "sfx_hit" else "sfx_card_swing", 0.6, if wpn.family == "firearm" and wpn.id ~= "crossbow" then 1.6 else 1.2)
					end
				end
			end
			for _, b in table.clone(barrels) do
				local tb = (b.pos - hrp.Position) * Vector3.new(1, 0, 1)
				local ab = 0
				if tb.Magnitude > 0.1 then
					local lk = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
					ab = math.deg(math.acos(math.clamp(lk.Unit:Dot(tb.Unit), -1, 1)))
				end
				if AC.inReach(rangeR * STUD + 3, arcR, tb.Magnitude, ab) then
					explodeBarrel(b, hrp)
					hits += 1
				end
			end
			for _, c in table.clone(crates) do
				local tb = (c.pos - hrp.Position) * Vector3.new(1, 0, 1)
				local ab = 0
				if tb.Magnitude > 0.1 then
					local lk = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
					ab = math.deg(math.acos(math.clamp(lk.Unit:Dot(tb.Unit), -1, 1)))
				end
				if AC.inReach(rangeR * STUD + 3, arcR, tb.Magnitude, ab) then
					breakCrate(c)
				end
			end
			if hits == 0 and moveId == "rush" then
				say("헛손질")
			elseif moveId == "rush" and combo >= 3 then
				say("3연타 마무리!")
				showCombo("3연타!")
				screenFlash(Color3.fromRGB(255, 232, 160), 0.6)
				shockRing(hrp.Position - Vector3.new(0, 2.5, 0), 16, Color3.fromRGB(255, 220, 120), 0.45)
				shakeUntil, shakeAmp = os.clock() + 0.2, 0.8
			elseif moveId == "rush" and hits > 0 then
				showCombo(string.format("%d연타", combo))
			elseif hits > 0 and mv.label then
				say(mv.label .. (if hits > 1 then string.format(" %d명 적중", hits) else ""))
			end
			refresh()
		end)
	end
	-- 돌진 베기: 공격 버튼을 0.5초 이상 눌렀다 떼면 앞으로 돌진하며 길 위의 적을 모두 벤다(기력 25, 3초 쿨).
	local dashCd = 0
	local function dashSlash()
		if finished or os.clock() < dashCd then
			return
		end
		local _, hrp = char3()
		if not hrp then
			return
		end
		if pl.stamina < 25 then
			say("기력이 부족해요")
			return
		end
		local look = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
		if look.Magnitude < 0.1 then
			return
		end
		look = look.Unit
		pl.stamina -= 25
		dashCd = os.clock() + 3
		pl.invulnUntil = math.max(pl.invulnUntil or -1, os.clock() + 0.35)
		local from = hrp.Position
		afterimage(player.Character, Color3.fromRGB(255, 214, 120), 6, 0.04)
		trailsOn(player.Character, TRAIL_LIMBS, Color3.fromRGB(255, 214, 120), 0.4, 1)
		startSwing("heavy", 0.5)
		hrp.CFrame = hrp.CFrame + look * 22
		local n = 0
		for _, e in table.clone(enemies) do
			local rel = (e.root.Position - from) * Vector3.new(1, 0, 1)
			local along = rel:Dot(look)
			local side = (rel - look * along).Magnitude
			if along > -2 and along < 26 and side < 6 then
				strikeEnemy(e, 2.2, from, 4, true)
				n += 1
			end
		end
		shockRing(hrp.Position - Vector3.new(0, 2.5, 0), 12, Color3.fromRGB(255, 220, 120), 0.4)
		shakeUntil, shakeAmp = os.clock() + 0.25, 1
		say(if n > 0 then string.format("돌진 베기! %d명", n) else "돌진 베기!")
		refresh()
	end

	-- 지형 이벤트: 굴러오는 바위(경고선 후 돌진, 적도 휩쓴다)와 지뢰 함정(경고 원 후 폭발)
	local function hurtPlayerBy(dmg: number)
		local dealt = AC.takeHit(pl, dmg, os.clock(), nil)
		if dealt > 0 then
			hurtReact(1.4)
			refresh()
			if pl.hp <= 0 then
				task.defer(function()
					finish("defeat")
				end)
			end
		end
	end
	local function boulderEvent()
		local _, hrp = char3()
		if not hrp then
			return
		end
		local lib = ReplicatedStorage:FindFirstChild("MareAssets")
		local grp = lib and lib:FindFirstChild("Town")
		local tpl = grp and grp:FindFirstChild("rock-large")
		if not (tpl and tpl:IsA("Model")) then
			return
		end
		local alongX = math.random() < 0.5
		local lane = if alongX then hrp.Position.Z else hrp.Position.X
		local a = if alongX then Vector3.new(ORIGIN.X - half + 4, ORIGIN.Y, lane) else Vector3.new(lane, ORIGIN.Y, ORIGIN.Z - half + 4)
		local dir = if alongX then Vector3.new(1, 0, 0) else Vector3.new(0, 0, 1)
		local len = half * 2 - 8
		local warn = part(folder, Vector3.new(len, 0.2, 9), CFrame.lookAt(a, a + dir) * CFrame.new(0, 0.3, -len / 2), Color3.fromRGB(255, 70, 50), Enum.Material.Neon)
		warn.Transparency = 0.7
		warn.CanCollide, warn.CanQuery = false, false
		say("⚠ 바위가 굴러와요! 경고선에서 비켜요")
		sfx("sfx_naval_cannon", 0.5, 0.6)
		task.delay(2, function()
			warn:Destroy()
			if finished then
				return
			end
			local m = tpl:Clone()
			m.Name = "FieldBoulder"
			for _, bp in m:GetDescendants() do
				if bp:IsA("BasePart") then
					bp.Anchored, bp.CanCollide, bp.CanQuery, bp.CanTouch = true, false, false, false
				end
			end
			local _, ext = m:GetBoundingBox()
			local longest = math.max(ext.X, ext.Y, ext.Z)
			if longest > 0.05 then
				pcall(function()
					m:ScaleTo(8 / longest)
				end)
			end
			m.Parent = folder
			local d, spin, hitP, hitE = 0, 0, false, {}
			while not finished and m.Parent and d < len do
				local dt2 = RunService.Heartbeat:Wait()
				d += 42 * dt2
				spin += 6 * dt2
				local p = a + dir * d + Vector3.new(0, 4, 0)
				m:PivotTo(CFrame.new(p) * CFrame.Angles(if alongX then 0 else spin, 0, if alongX then -spin else 0))
				local _, h3 = char3()
				if h3 and not hitP and (h3.Position - p).Magnitude < 7 then
					hitP = true
					hurtPlayerBy(14)
				end
				for _, e in table.clone(enemies) do
					if not hitE[e] and e.root.Parent and (e.root.Position - p).Magnitude < 7 then
						hitE[e] = true
						strikeEnemy(e, 3, p, 8, true, true)
					end
				end
			end
			m:Destroy()
		end)
	end
	local function mineEvent()
		local _, hrp = char3()
		if not hrp then
			return
		end
		local at = hrp.Position + Vector3.new(rng:NextNumber(-22, 22), 0, rng:NextNumber(-22, 22))
		at = Vector3.new(math.clamp(at.X, ORIGIN.X - half + 8, ORIGIN.X + half - 8), ORIGIN.Y, math.clamp(at.Z, ORIGIN.Z - half + 8, ORIGIN.Z + half - 8))
		groundRing(at, 9, 1.6)
		task.delay(1.6, function()
			if finished then
				return
			end
			burst(at + Vector3.new(0, 1.5, 0), 50, true)
			shockRing(at, 10, Color3.fromRGB(255, 120, 60), 0.5)
			sfx("sfx_naval_cannon", 0.7, 1.2)
			shakeUntil, shakeAmp = os.clock() + 0.3, 1.2
			local _, h3 = char3()
			if h3 and ((h3.Position - at) * Vector3.new(1, 0, 1)).Magnitude < 9 then
				hurtPlayerBy(10)
			end
			for _, e in table.clone(enemies) do
				if e.root.Parent and ((e.root.Position - at) * Vector3.new(1, 0, 1)).Magnitude < 9 then
					strikeEnemy(e, 2.5, at, 6, true, true)
				end
			end
		end)
	end
	task.spawn(function()
		task.wait(14)
		local k = 0
		while not finished do
			k += 1
			if k % 2 == 1 then
				boulderEvent()
			else
				mineEvent()
			end
			task.wait(rng:NextNumber(14, 24))
		end
	end)

	-- 방어: 누른 직후 0.25초는 완벽 방어(반격), 이후 1.2초는 막기(피해 70% 감소)
	local function useGuard()
		if finished then
			return
		end
		local now = os.clock()
		local ok = AC.tryMove(pl, "parry", now)
		if not ok then
			if (pl.cd.parry or -100) > now then
				say(string.format("방어 재사용까지 %.1f초", pl.cd.parry - now))
			end
			return
		end
		pl.parryAt = now
		pl.guarding = true
		do
			local ch0, hrpG = char3()
			auraOn(ch0, Color3.fromRGB(150, 120, 220), Color3.fromRGB(235, 225, 255), 1.2)
			if hrpG then pulseAt("BLOCK_IMPACT", hrpG.CFrame * CFrame.new(0, 0.5, -2), Color3.fromRGB(190, 160, 255), Color3.fromRGB(255, 255, 255), 6, 10) end
		end
		startSwing("guard", 1.2)
		say("방어 자세!")
		task.delay(1.2, function()
			pl.guarding = false
		end)
	end
	local function useAttack() useMove("rush") end
	local function useHeavy() useMove("heavy") end
	local function useSpin() useMove("sweep") end
	local function useDash() useMove("dodge") end
	-- 버튼은 터치 '닿는 순간' 바로 반응한다(폰에서 손가락이 살짝 밀려도 Activated 가 안 뜨는 경우 대비). 같은 누름의 중복은 막는다.
	local function bindPress(b: GuiButton, fn: () -> ())
		local last = 0
		local function go()
			local t = os.clock()
			if t - last < 0.08 then
				return
			end
			last = t
			fn()
		end
		b.InputBegan:Connect(function(input)
			if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
				go()
			end
		end)
		b.Activated:Connect(go)
	end
	bindPress(attackBtn, useAttack)
	local holdFrom = 0
	local function bindHold(b: GuiButton)
		b.InputBegan:Connect(function(input)
			if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
				holdFrom = os.clock()
				local mine = holdFrom
				task.delay(0.5, function()
					if holdFrom == mine and not finished then
						say("차징 완료! 손을 떼면 돌진 베기")
					end
				end)
			end
		end)
		b.InputEnded:Connect(function(input)
			if (input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1) and holdFrom > 0 then
				local held = os.clock() - holdFrom
				holdFrom = 0
				if held >= 0.5 then
					dashSlash()
				end
			end
		end)
	end
	bindHold(attackBtn)
	-- 공격 버튼 주변(약 2배 크기)을 눌러도 공격이 나간다: 손가락이 버튼 바깥으로 살짝 빗나가도 된다
	do
		local hit = Instance.new("TextButton")
		hit.AnchorPoint = attackBtn.AnchorPoint
		hit.Position = attackBtn.Position
		hit.Name = "FieldAttackHit"
		hit.Size = UDim2.fromOffset(150, 150)
		hit.BackgroundTransparency = 1
		hit.Text = ""
		hit.AutoButtonColor = false
		hit.ZIndex = math.max(attackBtn.ZIndex - 1, 0)
		hit.Parent = gui
		bindPress(hit, useAttack)
		bindHold(hit)
	end
	-- [탐험 무기] 기존 두 무기 빠른 교체는 유지하고, 보조 슬롯에서 등록된 실물 무기를 선택한다.
	-- 기존 무기 정의의 공격력/속도/사거리만 쓰며, 등록되지 않은 외형을 가짜로 장착하지 않는다.
	do
		local availableWeapons = {}
		for _, candidate in Weapons.playerChoices() do
			if candidate.family == "fist" or (candidate.model and AssetIds["Relics/" .. candidate.model]) then
				table.insert(availableWeapons, candidate)
			end
		end
		-- 수석식 총기 실물은 해당 역사 시기에서만 보조 슬롯에 제공한다.
		if type(opts.year) == "number" and opts.year >= 1680 then
			for _, candidate in Weapons.Regional do
				if candidate.model and AssetIds["Relics/" .. candidate.model] then
					table.insert(availableWeapons, candidate)
				end
			end
		end
		local wbtn = btn(gui, wpn.name .. " ↔ " .. reserveWeapon.name, Color3.fromRGB(65, 83, 105), UDim2.fromOffset(110, 42), UDim2.new(1, -82, 1, -315), Vector2.new(0.5, 0.5))
		wbtn.Name = "FieldWeapon"
		wbtn.TextSize = 13
		wbtn:SetAttribute("WeaponChoiceCount", 2)
		local chooseBtn = btn(gui, "보조: " .. reserveWeapon.name, Color3.fromRGB(69, 100, 89), UDim2.fromOffset(126, 40), UDim2.new(0, 80, 1, -218), Vector2.new(0.5, 0.5))
		chooseBtn.Name = "FieldWeaponSelect"
		chooseBtn.TextSize = 13
		chooseBtn:SetAttribute("AvailableWeaponCount", #availableWeapons)
		bindPress(chooseBtn, function()
			if finished or #availableWeapons < 2 then return end
			local currentIndex = table.find(availableWeapons, reserveWeapon) or 0
			for offset = 1, #availableWeapons do
				local candidate = availableWeapons[(currentIndex + offset - 1) % #availableWeapons + 1]
				if candidate.id ~= wpn.id then
					reserveWeapon = candidate
					chooseBtn.Text = "보조: " .. reserveWeapon.name
					wbtn.Text = wpn.name .. " ↔ " .. reserveWeapon.name
					say("선택한 보조 무기: " .. reserveWeapon.name)
					break
				end
			end
		end)
		bindPress(wbtn, function()
			wpn, reserveWeapon = reserveWeapon, wpn
			wbtn.Text = wpn.name .. " ↔ " .. reserveWeapon.name
			chooseBtn.Text = "보조: " .. reserveWeapon.name
			if attackIcon then
				local iconKey = if wpn.family == "fist" then "Menu/cc0_glove" elseif wpn.family == "axe" then "Menu/cc0_axe"
					elseif wpn.ranged then "Menu/cc0_crossbow" else "Menu/cc0_sword"
				attackIcon.Image = "rbxassetid://" .. tostring(AssetIds[iconKey])
			end
			equipFieldWeapon(player.Character, wpn)
			slashIdx = 0
			say(string.format("%s — %s", wpn.name, wpn.note))
		end)
		task.delay(1, function()
			if not finished then equipFieldWeapon(player.Character, wpn) end
		end)
	end

	local staminaBack = Instance.new("Frame")
	staminaBack.AnchorPoint = Vector2.new(0.5, 0)
	staminaBack.Size = UDim2.fromOffset(240, 5)
	staminaBack.Position = UDim2.new(0.5, 0, 0, 101)
	staminaBack.BackgroundColor3 = Color3.fromRGB(30, 36, 48)
	staminaBack.BorderSizePixel = 0
	staminaBack.Parent = gui
	local staminaFill = Instance.new("Frame")
	staminaFill.Size = UDim2.fromScale(1, 1)
	staminaFill.BackgroundColor3 = Color3.fromRGB(240, 200, 80)
	staminaFill.BorderSizePixel = 0
	staminaFill.Parent = staminaBack
	local skillBtns = {}
	-- [전투 HUD] 공격은 오른쪽 엄지 아래, 회피·방어와 장착 3칸은 위쪽 반원 두 줄에 배치한다.
	-- 기존 공격 판정·단축키·슬롯 해금 수는 바꾸지 않고 터치 간격만 넓힌다.
	local screenWidth = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize.X or 390
	if screenWidth < 100 then screenWidth = 390 end
	local outerSkillRadius = math.clamp(math.floor((screenWidth - 40) * 0.42), 110, 147)
	local innerSkillRadius = math.max(58, outerSkillRadius - 56)
	local ATK_C = Vector2.new(-math.clamp(screenWidth * 0.48, 154, 192), -157)
	local function arcPos(r: number, theta: number): UDim2
		local a = math.rad(theta)
		return UDim2.new(1, ATK_C.X - r * math.cos(a), 1, ATK_C.Y - r * math.sin(a))
	end
	local function mkSkill(key, label, color, pos, size)
		local b = btn(gui, label, color, UDim2.fromOffset(size or 56, size or 56), pos, Vector2.new(0.5, 0.5))
		b.Name = "FieldSkill_" .. key
		b.TextSize = 13
		bindPress(b, function()
			if key == "parry" then useGuard() else useMove(key) end
		end)
		skillBtns[key] = { btn = b, label = label }
	end
	-- 기본 행동(스킬 수에 안 센다): 회피·방어. 스킬 3칸은 바깥 줄에 놓인다.
	mkSkill("dodge", "회피", Color3.fromRGB(61, 127, 106), arcPos(innerSkillRadius, 48))
	mkSkill("parry", "방어", Color3.fromRGB(94, 89, 138), arcPos(innerSkillRadius, 132))
	addIcon(skillBtns.dodge.btn, "Menu/cc0_glove")
	addIcon(skillBtns.parry.btn, "Menu/cc0_shield2")
	-- 스킬 효과 하나: 주인공 카드 스킬과 동료 스킬이 같이 쓴다. caster = 시전자 모델·루트(주인공이면 내 캐릭터).
	local function castEffect(sk, name, ch, hp0)
		local pos = hp0.Position + Vector3.new(0, 2, 0)
		if sk == "heal" then
			pl.hp = math.min(pl.maxHp, pl.hp + pl.maxHp * 0.25)
			say(name .. ": 체력 회복")
			sfx("sfx_card_magic", 0.7, 1)
			burst(pos, 20, false)
			auraOn(ch, Color3.fromRGB(110, 230, 140), Color3.fromRGB(230, 255, 230), 1.1)
			pulseAt("HEAL_PULSE", hp0.CFrame * CFrame.new(0, -2.3, 0), Color3.fromRGB(120, 235, 150), Color3.fromRGB(235, 255, 240), 9, 14)
			refresh()
		elseif sk == "ward" or sk == "armor" then
			pl.ward = true
			say(name .. ": 보호막 (다음 공격 1회 무효)")
			sfx("sfx_card_armor", 0.7, 1.1)
			burst(pos, 26, true)
			auraOn(ch, Color3.fromRGB(100, 170, 255), Color3.fromRGB(235, 245, 255), 1.4)
			pulseAt("BLOCK_IMPACT", hp0.CFrame * CFrame.new(0, 0.5, 0), Color3.fromRGB(120, 190, 255), Color3.fromRGB(255, 255, 255), 8, 12)
		elseif sk == "volley" or sk == "snipe" then
			local list = table.clone(enemies)
			table.sort(list, function(a, b)
				return (a.root.Position - hp0.Position).Magnitude < (b.root.Position - hp0.Position).Magnitude
			end)
			local n = if sk == "snipe" then 1 else 3
			local hitN = 0
			for _, e in list do
				if hitN >= n or (e.root.Position - hp0.Position).Magnitude > 30 * STUD then
					break
				end
				hitN += 1
				arrowTrail(pos, e.root.Position + Vector3.new(0, 1.5, 0))
				strikeEnemy(e, if sk == "snipe" then 3.0 else 1.2, hp0.Position, 1.5, sk == "snipe")
			end
			trailsOn(ch, { "RightHand", "RightLowerArm", "LeftHand", "LeftLowerArm" }, Color3.fromRGB(255, 220, 130), 0.4, 0.9)
			pulseAt("SHAPE_BURST", hp0.CFrame * CFrame.new(0, -1.5, 0), Color3.fromRGB(255, 210, 120), Color3.fromRGB(255, 245, 210), 9, 12)
			say(name .. (if hitN > 0 then ": 원거리 공격!" else ": 맞힐 적이 없다"))
			sfx("sfx_card_volley", 0.7, 1)
		elseif sk == "rally" then
			pl.buffUntil = now + 8
			say(name .. ": 8초간 공격력 +30%")
			sfx("sfx_horn", 0.5, 1.3)
			burst(pos, 26, true)
			auraOn(ch, Color3.fromRGB(255, 190, 80), Color3.fromRGB(255, 240, 180), 1.6)
			pulseAt("BUFF_PULSE", hp0.CFrame * CFrame.new(0, -2.3, 0), Color3.fromRGB(255, 200, 90), Color3.fromRGB(255, 245, 210), 10, 14)
		elseif sk == "luck" then
			pl.stamina = AC.STAMINA_MAX
			pl.hp = math.min(pl.maxHp, pl.hp + pl.maxHp * 0.1)
			say(name .. ": 행운! 기력 가득")
			sfx("sfx_coin", 0.7, 1.2)
			burst(pos, 24, true)
			pulseAt("UPGRADE_BURST", hp0.CFrame * CFrame.new(0, -2.3, 0), Color3.fromRGB(255, 225, 120), Color3.fromRGB(255, 255, 220), 10, 14)
			refresh()
		elseif sk == "bash" then
			local near, nd = nil, 12 * STUD
			for _, e in enemies do
				local d = (e.root.Position - hp0.Position).Magnitude
				if d < nd then near, nd = e, d end
			end
			if near then strikeEnemy(near, 1.8, hp0.Position, 5, true) end
			say(name .. (if near then ": 강타!" else ": 맞힐 적이 없다"))
			sfx("sfx_card_blade", 0.7, 0.9)
			burst(pos, 22, true)
		else
			local n = 0
			for _, e in enemies do
				if (e.root.Position - hp0.Position).Magnitude <= 14 * STUD and not e.ac.def.boss then
					e.ac.stagger = 1.5
					n += 1
				end
			end
			say(name .. (if n > 0 then ": 적의 움직임을 읽었다!" else ": 주변에 적이 없다"))
			sfx("sfx_card_spell", 0.7, 1)
			burst(pos, 22, false)
		end
	end
	-- 카드 스킬: 덱의 학문·우군 카드가 둘째 줄 버튼이 된다(최대 3장, 재사용 14초). 효과는 카드의 skill 종류가 정한다.
	do
		local cs = opts.cardSkills or {}
		if #cs == 0 and workspace:GetAttribute("DevCards") then
			cs = { { name = "의학", skill = "heal" }, { name = "화학", skill = "volley" }, { name = "물리", skill = "armor" } } -- 개발 캡처 전용
		end
		-- 장착 스킬 최대 3개: 강타·회전베기·카드 스킬 중에서 고른다(opts.loadout 순서대로, 없으면 강타·회전베기·첫 카드)
		local available = { "heavy", "sweep" }
		for i2 = 1, math.min(#cs, 3) do
			table.insert(available, "card" .. i2)
		end
		local slotCount = JobSkills.playerSlots(opts.battleLevel, opts.battleStats) -- 처음 2칸, 중렙 전투 칭호를 얻으면 3칸
		local loadout = JobSkills.playerLoadout(opts.loadout, available, slotCount)
		local slotOf = {}
		for i2, id in loadout do
			slotOf[id] = i2
		end
		equipped.heavy, equipped.sweep = slotOf.heavy ~= nil, slotOf.sweep ~= nil
		local function slotPos(id): UDim2
			return arcPos(outerSkillRadius, 28 + ((slotOf[id] or 1) - 1) * 62)
		end
		-- 아직 안 열린 칸은 잠금 표시로 보여 준다(누르면 해금 조건을 알려 준다)
		for slotI = slotCount + 1, JobSkills.MAX_PLAYER_SKILLS do
			local lb = btn(gui, "잠금", Color3.fromRGB(70, 76, 90), UDim2.fromOffset(56, 56), arcPos(outerSkillRadius, 28 + (slotI - 1) * 62), Vector2.new(0.5, 0.5))
			lb.Name = "FieldLockedSkill" .. slotI
			lb.TextSize = 14
			lb.BackgroundTransparency = 0.35
			bindPress(lb, function()
				say(JobSkills.unlockHint())
			end)
		end
		if slotOf.heavy then
			mkSkill("heavy", "강타", Color3.fromRGB(169, 100, 54), slotPos("heavy"), 56)
			addIcon(skillBtns.heavy.btn, "Menu/cc0_axe")
		end
		if slotOf.sweep then
			mkSkill("sweep", "회전", Color3.fromRGB(70, 108, 155), slotPos("sweep"), 56)
			addIcon(skillBtns.sweep.btn, "Menu/cc0_sword")
		end
		local function useCard(key, card)
			local now = os.clock()
			if finished then
				return
			end
			if (pl.cd[key] or 0) > now then
				say(string.format("%s 재사용까지 %.1f초", card.name, pl.cd[key] - now))
				return
			end
			pl.cd[key] = now + 8
			local ch = player.Character
			local hp0 = ch and ch:FindFirstChild("HumanoidRootPart")
			if not hp0 then
				return
			end
			local sk = card.skill
			startSwing("cast_" .. tostring(sk), if sk == "volley" or sk == "snipe" then 0.8 else 0.9)
			castEffect(sk, card.name, ch, hp0)
		end
		for i, card in cs do
			local key = "card" .. i
			if i > 3 or not slotOf[key] then
				continue
			end
			local b = btn(gui, card.name, Color3.fromRGB(135, 106, 61), UDim2.fromOffset(56, 56), slotPos(key), Vector2.new(0.5, 0.5))
			b.Name = "FieldSkill_" .. key
			b.TextSize = 12
			-- [도감 원화 연동] 실제 카드 ID의 등록 원화가 있으면 그림 전체를 고급 스킬 메달로 재사용한다.
			local paintedKey = if type(card.id) == "string" and AssetIds["CardArt/" .. card.id] then "CardArt/" .. card.id else nil
			addIcon(b, paintedKey or (if card.skill == "heal" then "Menu/cc0_book" elseif card.skill == "armor" or card.skill == "ward" then "Menu/cc0_shield2"
				elseif card.skill == "volley" or card.skill == "snipe" then "Menu/cc0_crossbow" else "Menu/cc0_fireball"))
			bindPress(b, function()
				useCard(key, card)
			end)
			skillBtns[key] = { btn = b, label = card.name }
			table.insert(conns, UserInputService.InputBegan:Connect(function(input, processed)
				if not processed and not finished and input.KeyCode == (if i == 1 then Enum.KeyCode.One elseif i == 2 then Enum.KeyCode.Two else Enum.KeyCode.Three) then
					useCard(key, card)
				end
			end))
		end
		table.insert(conns, RunService.Heartbeat:Connect(function()
			local dev = workspace:GetAttribute("DevCardSkill")
			if dev and cs[dev] then
				workspace:SetAttribute("DevCardSkill", nil)
				useCard("card" .. dev, cs[dev])
			end
		end))
	end
	table.insert(conns, RunService.Heartbeat:Connect(function(dt)
		local now = os.clock()
		AC.regen(pl, math.min(dt, 0.1)) -- 느린 폰(30fps)에서도 기력이 같은 속도로 찬다
		staminaFill.Size = UDim2.fromScale(math.clamp(pl.stamina / AC.STAMINA_MAX, 0, 1), 1)
		for key, sb in skillBtns do
			local left = (pl.cd[key] or 0) - now
			local shade = sb.btn:FindFirstChild("FieldCooldownShade")
			local timer = sb.btn:FindFirstChild("FieldCooldownTime")
			local duration = if string.sub(key, 1, 4) == "card" then 8 else (AC.Moves[key] and AC.Moves[key].cooldown) or 4
			if shade and timer then
				shade.Visible = left > 0
				timer.Visible = left > 0
				shade.Size = UDim2.fromScale(1, math.clamp(left / math.max(duration, 0.1), 0, 1))
				if left > 0 then timer.Text = if left >= 10 then tostring(math.ceil(left)) else string.format("%.1f", left) end
			end
			sb.btn.Text = sb.label
			sb.btn.BackgroundTransparency = if left > 0 then 0.14 else 0
		end
	end))
	-- 화면 아무 곳이나 톡 치면(버튼 제외) 공격: 폰은 탭, PC는 마우스 왼쪽 클릭
	table.insert(conns, UserInputService.TouchTap:Connect(function(_, processed)
		if not processed and not finished then
			useAttack()
		end
	end))
	table.insert(conns, UserInputService.InputBegan:Connect(function(input, processed)
		if not processed and not finished and input.UserInputType == Enum.UserInputType.MouseButton1 then
			useAttack()
		end
	end))
	table.insert(conns, UserInputService.InputBegan:Connect(function(input, processed)
		if processed or finished then
			return
		end
		if input.KeyCode == Enum.KeyCode.F then
			useAttack()
		elseif input.KeyCode == Enum.KeyCode.Q then
			useHeavy()
		elseif input.KeyCode == Enum.KeyCode.E then
			useSpin()
		elseif input.KeyCode == Enum.KeyCode.R then
			useDash()
		elseif input.KeyCode == Enum.KeyCode.G then
			useGuard()
		end
	end))
	-- 개발 캡처용: DevFieldSkill 속성에 attack/heavy/spin/dash 를 넣으면 그 동작을 쓴다
	table.insert(conns, RunService.Heartbeat:Connect(function()
		local dev = workspace:GetAttribute("DevFieldSkill")
		if dev then
			workspace:SetAttribute("DevFieldSkill", nil)
			local map = { attack = "rush", heavy = "heavy", spin = "sweep", dash = "dodge" }
			if dev == "guard" then useGuard() else useMove(map[dev] or dev) end
		end
	end))
	workspace:SetAttribute("FieldCombatReady", true)

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
		local dtc = math.min(dt, 0.1)
		local acList = {}
		for _, o in enemies do table.insert(acList, o.ac) end
		local attackers = AC.attackersCount(acList)
		for _, e in table.clone(enemies) do
			local to = hrp.Position - e.root.Position
			local flat = Vector3.new(to.X, 0, to.Z)
			local dist = flat.Magnitude / STUD -- 규칙의 거리 단위
			-- 멀리서 자고 있는 적은 계산을 쉰다(적이 100명이어도 가볍게)
			if flat.Magnitude > 120 and e.ac.state == "idle" and not e.ac.dead then
				continue
			end
			local frozen = now < (e.holdUntil or 0)
			if e.kbUntil and now < e.kbUntil and not e.ac.def.boss then
				local k = 1 - (now - e.kbT0) / 0.18 -- 선형 감속
				e.model:PivotTo(e.model:GetPivot() + e.kbVel * math.max(k, 0) * dtc * 2)
			end
			local event, hit = nil, nil
			if not frozen then
				local others = attackers - (if e.ac.state == "windup" or e.ac.state == "active" then 1 else 0)
				e.waiting = others >= AC.MELEE_TOKENS and e.ac.state == "chase" and not e.ac.def.keepAway and not e.ac.def.boss
				event, hit = AC.stepEnemy(e.ac, dtc, dist, if e.ac.def.keepAway or e.ac.def.boss then true else not e.waiting)
			end
			if event == "telegraph" then
				attackers += 1
				e.warnUntil = now + e.ac.def.windup
				burst(e.root.Position + Vector3.new(0, 3, 0), 0, false, "telegraph")
				sfx("sfx_event_danger", 0.35, 1.2)
				if e.ac.def.aoe then
					groundRing(e.root.Position - Vector3.new(0, e.root.Size.Y * 0.5 + 2.6, 0), e.ac.def.range * STUD * 0.85, e.ac.def.windup)
				end
				e.parryAt = nil
				-- 돌진병은 달려들 길(붉은 띠), 사수는 조준선(붉은 빔)을 보여 준다: 예고 중에 비키면 피할 수 있다
				if e.ac.def.charge or e.ac.def.keepAway then
					local from, gp = e.root.Position, hrp.Position
					local dv = Vector3.new(gp.X - from.X, 0, gp.Z - from.Z)
					if dv.Magnitude > 1 then
						local isCharge = e.ac.def.charge
						local len = if isCharge then math.min(dv.Magnitude, e.ac.def.range * STUD) else dv.Magnitude
						local mid = from + dv.Unit * (len * 0.5)
						local y = if isCharge then from.Y - e.root.Size.Y * 0.5 - 2.4 else from.Y + 0.5
						-- [적 공격 예고] 막대 도형 대신 기존 R15 루트와 투명 목표점 사이의 붉은 빔으로 조준 경로를 보여 준다.
						local target = Instance.new("Part")
						target.Name = "FieldTelegraphTarget"
						target.Size = Vector3.one * 0.1
						target.Transparency = 1
						target.Anchored, target.CanCollide, target.CanQuery, target.CanTouch = true, false, false, false
						target.Position = Vector3.new(from.X + dv.Unit.X * len, y, from.Z + dv.Unit.Z * len)
						target.Parent = folder
						local startAt = Instance.new("Attachment")
						startAt.Position = Vector3.new(0, y - from.Y, 0)
						startAt.Parent = e.root
						local endAt = Instance.new("Attachment")
						endAt.Parent = target
						local lane = Instance.new("Beam")
						lane.Attachment0, lane.Attachment1 = startAt, endAt
						lane.Width0, lane.Width1 = if isCharge then 2.7 else 0.16, if isCharge then 2.7 else 0.08
						lane.Color = ColorSequence.new(Color3.fromRGB(255, 75, 59), Color3.fromRGB(255, 180, 123))
						lane.Transparency = NumberSequence.new(0.28)
						lane.LightEmission = 0.8
						lane.FaceCamera = false
						lane.Parent = target
						task.delay(e.ac.def.windup + 0.05, function()
							startAt:Destroy()
							target:Destroy()
						end)
					end
				end
				-- 공격 예고: 머리 위 붉은 느낌표 + 몸이 붉게
				if not e.warn then
					local h = Instance.new("Highlight")
					h.FillColor = Color3.fromRGB(255, 40, 40)
					h.FillTransparency = 0.55
					h.OutlineColor = Color3.fromRGB(255, 80, 60)
					h.Parent = e.model
					e.warn = h
					local bbw = Instance.new("BillboardGui")
					bbw.Size = UDim2.fromOffset(44, 44)
					bbw.StudsOffset = Vector3.new(0, 8.5, 0)
					bbw.AlwaysOnTop = true
					bbw.Adornee = e.root
					local wl = Instance.new("TextLabel")
					wl.Size = UDim2.fromScale(1, 1)
					wl.BackgroundTransparency = 1
					wl.Text = "!"
					wl.TextColor3 = Color3.fromRGB(255, 70, 60)
					wl.Font = Enum.Font.GothamBlack
					wl.TextScaled = true
					wl.Parent = bbw
					bbw.Parent = gui
					e.warnBb = bbw
				end
			elseif event == "strike" then
				e.swingAt = now
				if e.ac.def.charge then
					-- [돌진 모션] 공격 판정 시각·범위는 유지하되 시각 모델은 목표로 1프레임 순간이동하지 않는다.
					-- 매 프레임 일정 거리만 전진해 PC·모바일 프레임 지연에도 돌진이 눈에 보인다.
					local to = Vector3.new(hrp.Position.X - e.root.Position.X, 0, hrp.Position.Z - e.root.Position.Z)
					if to.Magnitude > 4 then
						local reach = math.min(to.Magnitude - 3, e.ac.def.range * STUD)
						e.chargeTarget = e.model:GetPivot().Position + to.Unit * reach
						burst(e.root.Position + Vector3.new(0, 2, 0), 18, false)
					end
				end
				do
					local ep, ered = e.root.Position, Color3.fromRGB(255, 90, 70)
					local gy = ep - Vector3.new(0, e.root.Size.Y * 0.5 + 2.2, 0)
					if e.ac.def.aoe then
						shockRing(gy, e.ac.def.range * STUD, ered, 0.5)
						shockRing(gy, e.ac.def.range * STUD * 0.6, Color3.fromRGB(255, 190, 90), 0.4)
						shards(ep, 26, ered, 13)
						shakeUntil, shakeAmp = os.clock() + 0.35, 1.8
					elseif e.ac.def.charge then
						shockRing(e.root.Position - Vector3.new(0, e.root.Size.Y * 0.5 + 2.2, 0), 8, ered, 0.35)
						shards(e.root.Position, 10, Color3.fromRGB(255, 200, 140), 5)
					elseif e.ac.def.keepAway then
						shards(ep + Vector3.new(0, 1.5, 0), 5, Color3.fromRGB(255, 225, 160), 3)
					else
						shockRing(gy, 5, ered, 0.28)
						shards(ep + Vector3.new(0, 1.5, 0), 6, ered, 4)
					end
				end
				if e.ac.def.keepAway then
					arrowTrail(e.root.Position + Vector3.new(0, 1.5, 0), hrp.Position + Vector3.new(0, 1.5, 0))
				end
				if e.warn then e.warn:Destroy() e.warn = nil end
				if e.warnBb then e.warnBb:Destroy() e.warnBb = nil end
				-- 예고 중에 멀리 피했으면 헛치고, 닿았으면 피해(회피 중이면 0)
				if hit and pl.ward then
					pl.ward = false
					say("보호막이 공격을 막았다!")
					sfx("sfx_card_armor", 0.8, 1)
					burst(hrp.Position + Vector3.new(0, 2, 0), 24, true)
				elseif hit then
					local dealt, parried = AC.takeHit(pl, e.ac.def.dmg, now, pl.parryAt)
					if parried then
						say("완벽 방어! 반격 기회")
						sfx("sfx_metal_clash", 1, 1.1)
						sfx("sfx_card_ring", 0.7, 1.2)
						burst(hrp.Position + Vector3.new(0, 2, 0), 30, true)
						e.ac.stagger = 1.4
						e.ac.state = "stagger"
						pl.stamina = math.min(AC.STAMINA_MAX, pl.stamina + 25)
					elseif dealt > 0 then
						say("공격을 받았다!")
						hurtReact(if e.ac.def.boss then 2 else 1)
						burst(hrp.Position + Vector3.new(0, 2, 0), 16, false)
						refresh()
						if pl.hp <= 0 then
							task.defer(function()
								finish("defeat")
							end)
							return
						end
					else
						say("피했다!")
					end
				else
					say("헛쳤다! 지금이 기회")
				end
			end
			-- 이동: 규칙이 정한 방향(다가가기·거리 두기)
			local wish = if frozen then 0 else AC.moveWish(e.ac, dist)
			local beforeMove = e.root.Position
			if frozen or e.ac.state == "stagger" then e.chargeTarget = nil end
			if e.chargeTarget then
				-- [적 이동] 돌진 중에는 일반 추적과 겹쳐 앞뒤로 튀지 않도록 기존 이동 분기에서만 갱신한다.
				local pv = e.model:GetPivot()
				local remaining = Vector3.new(e.chargeTarget.X - pv.Position.X, 0, e.chargeTarget.Z - pv.Position.Z)
				if remaining.Magnitude <= 0.08 then
					e.chargeTarget = nil
				else
					local step = math.min(remaining.Magnitude, 48 * dtc)
					local dir = remaining.Unit
					local front = CFrame.lookAt(Vector3.zero, dir)
					e.model:PivotTo(CFrame.new(pv.Position + dir * step) * pv.Rotation:Lerp(front.Rotation, math.clamp(dtc * 10, 0, 1)))
					if step >= remaining.Magnitude then e.chargeTarget = nil end
					wish = 1
				end
			elseif e.waiting and not frozen and flat.Magnitude > 0.1 and wish == 0 then
				-- 차례를 기다리는 적: 주인공 둘레를 천천히 돈다(한꺼번에 몰려 때리지 않는다)
				local sd = flat.Unit:Cross(Vector3.yAxis) * (e.circleDir or 1)
				e.circleDir = e.circleDir or (if math.random() < 0.5 then 1 else -1)
				local pv = e.model:GetPivot()
				local front = CFrame.lookAt(Vector3.zero, flat.Unit)
				e.model:PivotTo(CFrame.new(pv.Position + sd * e.ac.def.speed * 0.45 * dtc) * pv.Rotation:Lerp(front.Rotation, math.clamp(dtc * 10, 0, 1)))
				wish = 0.5
			elseif wish ~= 0 and flat.Magnitude > 0.1 then
				local step = flat.Unit * wish * math.min(e.ac.def.speed * 0.8 * dtc, flat.Magnitude)
				local pv = e.model:GetPivot()
				local front = CFrame.lookAt(Vector3.zero, flat.Unit)
				e.model:PivotTo(CFrame.new(pv.Position + step) * pv.Rotation:Lerp(front.Rotation, math.clamp(dtc * 10, 0, 1)))
			elseif flat.Magnitude > 0.1 and e.ac.state ~= "idle" and e.ac.state ~= "stagger" then
				local pv = e.model:GetPivot()
				local front = CFrame.lookAt(Vector3.zero, flat.Unit)
				e.model:PivotTo(CFrame.new(pv.Position) * pv.Rotation:Lerp(front.Rotation, math.clamp(dtc * 10, 0, 1)))
			end
			-- [발걸음] 실제 이동 거리로 보행 위상을 계산해 헛발질을 줄인다.
			if wish ~= 0 then
				e.gait = (e.gait or 0) + (e.root.Position - beforeMove).Magnitude / (if e.boss then 7 else 5.2)
			end
			if e.warn and now > (e.warnUntil or 0) + 0.3 then
				e.warn:Destroy()
				e.warn = nil
				if e.warnBb then e.warnBb:Destroy() e.warnBb = nil end
			end
			local hurtProgress = (now - e.hurtAt) / 0.3
			local attackProgress = (now - e.swingAt) / 0.5
			if e.fm then
				local st, ph = "IDLE", (now / 2.4 + e.motionPhase) % 1
				local acs = e.ac.state
				if hurtProgress >= 0 and hurtProgress < 1 then
					st, ph = "HIT", hurtProgress
				elseif acs == "windup" then
					st, ph = "ANTICIPATION", math.clamp(e.ac.t / math.max(e.ac.def.windup, 0.05), 0, 1)
				elseif acs == "active" then
					st, ph = "ATTACK", 0.25 + math.clamp(e.ac.t / math.max(e.ac.def.active, 0.05), 0, 1) * 0.35
				elseif acs == "recover" then
					st, ph = "RECOVERY", math.clamp(e.ac.t / math.max(e.ac.def.recover, 0.05), 0, 1)
				elseif wish ~= 0 then
					st, ph = "RUN", (e.gait or 0) % 1
				end
				-- 몸통 기울기: 근접형은 준비 때 뒤로 젖혔다가 타격 때 앞으로 숙이고, 사수는 활을 당기며 뒤로 젖힌다
				local lean = 0
				local def0 = e.ac.def
				if st == "ANTICIPATION" then
					lean = (if def0.keepAway then 0.28 else 0.38) * ph
				elseif st == "ATTACK" then
					lean = if def0.keepAway then 0.1 else -0.55
				elseif st == "RECOVERY" then
					lean = -0.3 * (1 - ph)
				elseif st == "HIT" then
					-- 맞는 순간 확 젖혀졌다가 되돌아온다(맞은 쪽으로 몸이 꺾이는 느낌)
					lean = 0.6 * (1 - ph) * (1 - ph)
				end
				-- 타격 순간 앞으로 짧게 달려들며 벤다 (근접형만, 플레이어 앞 2.5스터드까지)
				if st == "ATTACK" and not def0.keepAway and def0.range <= 12 and flat.Magnitude > 2.5 then
					local lunge = flat.Unit * math.min(def0.speed * 1.8 * dtc, flat.Magnitude - 2.5)
					e.model:PivotTo(e.model:GetPivot() + lunge)
				end
				-- 숨쉬기·체중 이동(대기), 달릴 때 위아래 출렁임과 앞으로 숙임으로 가만히 있어도 살아 보이게 한다
				local bob, roll = 0, 0
				if st == "IDLE" then
					bob, roll, lean = math.sin(now * 2.2 + e.spawnT) * 0.06, math.sin(now * 1.1 + e.spawnT) * 0.05, lean + math.sin(now * 1.6 + e.spawnT) * 0.04
				elseif st == "RUN" then
					bob, roll, lean = math.abs(math.sin((e.gait or 0) * math.pi * 2)) * 0.075, math.sin((e.gait or 0) * math.pi * 2) * 0.03, -0.10
				elseif st == "HIT" then
					roll = 0.25 * (1 - ph) * (if (e.spawnT * 100) % 2 < 1 then 1 else -1)
				end
				-- 종류별 고유 몸짓: 방패병은 웅크려 방패를 앞세우고, 돌진병은 발을 구르며 벼르고, 사수는 뒷걸음질하며 흔들리고, 두목은 몸을 솟구쳤다 내려찍는다
				local kindId = e.ac.kind
				if kindId == "shield" then
					if st == "IDLE" or st == "RUN" then
						lean, bob = -0.28, bob * 0.4 - 0.12
					elseif st == "ANTICIPATION" then
						lean = 0.15 * ph - 0.28 * (1 - ph)
					end
				elseif kindId == "charger" then
					if st == "ANTICIPATION" then
						bob, lean, roll = -0.17 * math.sin(ph * math.pi), -0.40 * ph, math.sin(now * 7.5) * 0.045 * ph
					end
				elseif kindId == "archer" then
					if wish < 0 then
						lean, roll = 0.12, math.sin(now * 3.2) * 0.04
					end
				elseif e.boss then
					if st == "ANTICIPATION" then
						bob, lean = -0.28 * math.sin(ph * math.pi), 0.40 * ph
					elseif st == "ATTACK" then
						bob, lean = 0.22 * (1 - math.clamp((ph - 0.25) / 0.2, 0, 1)), -0.55
					end
				end
				FM.actor(e.fm, st, ph, dt, e.boss, if e.boss then 1.45 else 1.35, CFrame.new(0, bob, 0) * CFrame.Angles(lean, 0, roll), kindId == "archer" and wish < 0)
			elseif hurtProgress >= 0 and hurtProgress < 1 then
				Pose.makeR15Action(e.model, "hurt", hurtProgress, now - e.spawnT)
			elseif attackProgress >= 0 and attackProgress < 1 then
				Pose.makeR15Action(e.model, "attack", attackProgress, now - e.spawnT)
			else
				Pose.makeR15Action(e.model, if wish ~= 0 then "run" else "idle", 0, if wish ~= 0 then (e.gait or 0) * 2 * math.pi else now - e.spawnT)
			end
		end
	end))

	-- 동료(최대 2명): 주인공 곁을 따라다니다 가까운 적에게 달려가 알아서 싸운다. 맞지는 않는 지원군.
	do
		local allyDefs = {}
		local allyNames = opts.allies or {}
		if #allyNames == 0 and RunService:IsStudio() and workspace:GetAttribute("DevAllies") then
			allyNames = { { name = "동료 포수", role = "포수" }, { name = "동료 항해사", role = "항해사" } } -- 실제 서버에서는 없는 동료를 만들지 않는다.
		end
		-- [동료 식별] 같은 영입 ID 중복은 한 번만 소환한다. 최대 2명, 직업별 기존 스킬·무기는 유지.
		local ROLE_BY_JOB = { ["성직자"] = "Mage", ["수녀"] = "Mage", ["승려"] = "Mage", ["비구니"] = "Mage", ["순례자"] = "Mage", ["필사자"] = "Mage", ["포수"] = "Barbarian", ["항해사"] = "Rogue" }
		local function hashName(str: string): number
			local h = 7
			for _, cp in utf8.codes(str) do h = (h * 31 + cp) % 100003 end
			return h
		end
		local ROLES = { "Knight", "Rogue", "Barbarian", "Mage" }
		local seenAllies = {}
		for _, nm in allyNames do
			if #allyDefs < 2 then
				local name = if type(nm) == "table" then tostring(nm.name) else tostring(nm)
				local job = if type(nm) == "table" then nm.role else nil
				local id = if type(nm) == "table" and nm.id then tostring(nm.id) else name .. "|" .. tostring(job)
				if not seenAllies[id] then
					seenAllies[id] = true
					local slot = #allyDefs + 1
					local h = hashName(name)
					-- [동료 무기] 기존 영입 ID로 출신·경력을 조회한다. 저장값/영입 순서는 변경하지 않는다.
					local history = Specialties.CompanionById[id]
					local birthplace = history and history.homePort and Ports.Ports[history.homePort]
					local nation = (history and history.nation) or (birthplace and birthplace.country)
					local vocation = job or (history and history.scholarId ~= "" and "학자") or "무인"
					local category = JobSkills.categoryOf(vocation)
					local life = history and history.summary or vocation
					local weapon = Weapons.allyWeapon(category, { job = vocation, nation = nation, background = life, year = opts.year })
					local role = (job and ROLE_BY_JOB[job]) or ROLES[(h + slot) % #ROLES + 1]
					-- [동료 외형] 출신 지역을 확인할 수 있는 동료에게는 기존 복식 팔레트를 우선한다.
					local regionalCoats = {
						france = Color3.fromRGB(64, 95, 136), england = Color3.fromRGB(86, 110, 104),
						portugal = Color3.fromRGB(118, 91, 120), spain = Color3.fromRGB(153, 90, 69),
						ottoman = Color3.fromRGB(80, 111, 107), japan = Color3.fromRGB(112, 88, 127),
						netherlands = Color3.fromRGB(130, 94, 65), swahili = Color3.fromRGB(137, 108, 73),
						malabar = Color3.fromRGB(79, 119, 88),
					}
					local coat = regionalCoats[nation] or Color3.fromHSV(((h % 360) / 360 + (slot - 1) * 0.32) % 1, 0.45, 0.67)
					table.insert(allyDefs, { id = id, name = name, role = role, coat = coat, job = vocation, skills = JobSkills.allySkills(vocation), weapon = weapon, nation = nation })
				end
			end
		end
		local allies: { any } = {}
		local spawned = false
		table.insert(conns, RunService.Heartbeat:Connect(function(dt)
			if finished or #allyDefs == 0 then
				return
			end
			local ch = player.Character
			local root0 = ch and ch:FindFirstChild("HumanoidRootPart")
			if not root0 then
				return
			end
			local now = os.clock()
			if not spawned then
				spawned = true
				for i, ad in allyDefs do
					-- [동료 접지] Pose.createR15의 인자는 몸통 위치가 아닌 발바닥 좌표다.
					-- 주인공 루트 높이(약 3스터드)를 더하던 기존 계산이 동료 공중부양의 원인이다.
					local footX = root0.Position.X + i * 5 - 8
					local pos0 = Vector3.new(footX, ORIGIN.Y + 0.08, root0.Position.Z - 4)
					-- [동료 고유 R15] 영입 이름·직업에 따른 체형·움직임을 안정적으로 재생한다.
					local persona = hashName(ad.name) % 3 + 1
					local bodyType = if ad.role == "Barbarian" then "heavy" elseif ad.role == "Rogue" then "slim" else "athletic"
					local motionStyle = if ad.weapon and ad.weapon.ranged then "scholar" elseif ad.role == "Barbarian" then "heavy" else "disciplined"
					local outfit = { bodyType = bodyType, motionStyle = motionStyle, persona = persona, profession = ad.job, year = opts.year }
					-- 시대가 맞지 않는 조립형 장식은 추가하지 않는다.
					if type(opts.year) == "number" and opts.year >= 1500 then
						outfit.hair = if persona == 2 then "bun" else "short"
						outfit.hairColor = if persona == 1 then Color3.fromRGB(46, 34, 28) else Color3.fromRGB(88, 68, 50)
					end
					-- [동료 체격] 주인공의 실제 R15 머리~발 높이에 맞춘다. 성별 추정으로 크기를 임의 변경하지 않는다.
					local heroHead = ch:FindFirstChild("Head")
					local heroFoot = ch:FindFirstChild("LeftFoot") or ch:FindFirstChild("RightFoot")
					local heroHeight = if heroHead and heroFoot
						then math.clamp((heroHead.Position.Y + heroHead.Size.Y * 0.5) - (heroFoot.Position.Y - heroFoot.Size.Y * 0.5), 5.3, 7.2)
						else 5.8
					local m = Pose.createR15(folder, pos0, 0, ad.coat, rng, ad.role, heroHeight, outfit)
					if finished or not folder.Parent then
						if m then m:Destroy() end
						return
					end
					local r = m and m:FindFirstChild("HumanoidRootPart")
					if m and r then
						m.Name = "FieldAlly"
						m:SetAttribute("CompanionId", ad.id)
						m:SetAttribute("CompanionName", ad.name)
						m:SetAttribute("EquippedWeaponId", ad.weapon.id)
						m:SetAttribute("EquippedWeaponName", ad.weapon.name)
						m:SetAttribute("CompanionOriginNation", ad.nation or "")
						equipFieldWeapon(m, ad.weapon)
						m:SetAttribute("MotionRole", if ad.weapon and ad.weapon.ranged then "ally-ranged" else "ally-melee") -- 기존 직업별 모션 구분 유지
						-- [탐험 HUD] 동료 이름을 근거리에서 작게 표시한다. 색상과 거리 제한은 유지한다.
						local bbA = Instance.new("BillboardGui")
						bbA.Name = "AllyRoleTag"
						bbA.Adornee = r
						bbA.Size = UDim2.fromOffset(120, 18)
						bbA.StudsOffset = Vector3.new(0, 3.7, 0)
						bbA.AlwaysOnTop = false
						bbA.LightInfluence = 0
						bbA.MaxDistance = 24
						bbA.Parent = r
						local tg = label(bbA, ad.name, 12, if i == 1 then Color3.fromRGB(125, 224, 255) else Color3.fromRGB(245, 207, 110))
						tg.TextTruncate = Enum.TextTruncate.AtEnd
						tg.Size = UDim2.new(1, 0, 1, 0)
						table.insert(allies, { model = m, root = r, slot = i, swingAt = -10, nextAt = 0, t0 = now, fm = if FM then FM.new(m, false) else nil, name = ad.name, skills = ad.skills, weapon = ad.weapon or Weapons.get("sword"), skillCd = {}, nextSkill = now + 4 + i * 2, gait = (i - 1) * 0.45 })
						table.insert(conns, { Disconnect = function()
							m:Destroy()
						end })
					end
				end
			end
			for _, a in allies do
				-- [동료 안정 추적] 한 프레임마다 목표를 바꾸면 몹 사이를 지그재그로 뛰므로 기존 대상을 유지한다.
				-- 주인공과 멀어지면 대형 복귀를 먼저 하고, 더 가까운 적이 확실할 때만 목표를 바꾼다.
				local tgt, td = a.focus, 40 * STUD
				if tgt then
					local d = (tgt.root.Position - a.root.Position).Magnitude
					if tgt.ac.dead or not tgt.root.Parent or d > 40 * STUD or (root0.Position - a.root.Position).Magnitude > 30 then
						tgt = nil
					else
						td = d
					end
				end
				if (root0.Position - a.root.Position).Magnitude <= 30 then
					for _, e in enemies do
						local d0 = (e.root.Position - a.root.Position).Magnitude
						if d0 < td * (if tgt then 0.65 else 1) then
							tgt, td = e, d0
						end
					end
				end
				a.focus = tgt
				-- [동료 대형] 주인공을 따라 방향을 바꿔도 좌우 후방에 서도록 로컬 좌표를 사용한다.
				local goal = if tgt then tgt.root.Position else (root0.CFrame * CFrame.new(if a.slot == 1 then -3.4 else 3.4, 0, 4.7)).Position
				local aw = a.weapon
				local stop = if tgt then (if aw.ranged then 16 else 5.5) else 3
				local to = Vector3.new(goal.X - a.root.Position.X, 0, goal.Z - a.root.Position.Z)
				local moving = to.Magnitude > stop
				if moving then
					local step = math.min(to.Magnitude - stop, (if tgt then 16 else 20) * math.clamp(dt, 0, 0.1))
					a.model:PivotTo(a.model:GetPivot() + to.Unit * step)
					a.gait = (a.gait or 0) + step / 5.2
				end
				if to.Magnitude > 0.5 then
					local pv = a.model:GetPivot()
					local front = CFrame.lookAt(pv.Position, pv.Position + to.Unit)
					a.model:PivotTo(CFrame.new(pv.Position) * pv.Rotation:Lerp(front.Rotation, math.clamp(dt * 10, 0, 1)))
				end
				if tgt and not moving and now >= a.nextAt then
					a.nextAt = now + 1.3 / aw.speed
					a.swingAt = now
					strikeEnemy(tgt, 0.6 * aw.power, a.root.Position, if aw.family == "axe" then 2 else 1.0, aw.family == "axe", true)
					if aw.ranged then
						-- 동료 사격: 총알·화살 궤적
						local a0 = a.root.Position + Vector3.new(0, 0.5, 0)
						local b0 = tgt.root.Position
						local len = (b0 - a0).Magnitude
						local arrow = aw.family == "bow" or aw.id == "crossbow"
						-- [동료 사격] 거친 직육면체 탄환 대신 기존 화살·사격 빔과 적중 스프라이트를 사용한다.
						arrowTrail(a0, b0)
						if CommonVFX then
							pcall(CommonVFX.Create, "IMPACT_FLASH", {
								parent = workspace, cframe = CFrame.new(b0), color = if arrow then Color3.fromRGB(210, 187, 129) else Color3.fromRGB(255, 226, 162),
								endSize = 2.2, count = 4, duration = 0.18, hideRing = true,
							})
						end
					end
				end
				-- 직업 스킬(최대 2개): 상황이 맞을 때 자동으로 쓴다 (치료=체력 낮을 때, 보호막=없을 때, 사격·강타·저격=적이 가까울 때, 사기=적 2명 이상)
				if now >= a.nextSkill and #enemies > 0 then
					for _, sid in a.skills do
						local def = JobSkills.Skills[sid]
						if def and (a.skillCd[sid] or 0) <= now then
							local nearE = 0
							for _, e in enemies do
								if (e.root.Position - a.root.Position).Magnitude <= 30 * STUD then nearE += 1 end
							end
							local ok = false
							if sid == "heal" then ok = pl.hp < pl.maxHp * 0.65
							elseif sid == "armor" then ok = not pl.ward and nearE > 0
							elseif sid == "rally" then ok = nearE >= 2 and now > (pl.buffUntil or 0)
							elseif sid == "luck" then ok = pl.stamina < 40
							else ok = nearE > 0 end
							if ok then
								a.skillCd[sid] = now + def.cooldown
								a.nextSkill = now + 3
								a.swingAt = now
								-- 지원기 발동 시 공격 대신 지원 자세를 보여 준다. 효과와 쿨타임은 기존 로직 유지.
								if sid == "heal" or sid == "armor" or sid == "rally" or sid == "luck" then
									a.castAt, a.castSkill = now, sid
								end
								castEffect(sid, a.name .. " · " .. def.name, a.model, a.root)
								break
							end
						end
					end
				end
				local ap = (now - a.swingAt) / 0.5
				if a.fm then
					if a.castAt and now - a.castAt < 0.7 then
						FM.actor(a.fm, "INTERACT", (now - a.castAt) / 0.7, dt, nil, 1.3, nil, false, a.castSkill)
					elseif ap >= 0 and ap < 1 then
						-- 동료의 실제 경력·지역·시대에 맞춰 검·활·총의 기존 모션을 재사용한다
						local ac = FM.weaponCombo(a.weapon.motion, 1)
						if ac then
							table.clear(a.fm.canon)
							FM.sample(ac, math.min(ap * 1.6, 1) * ac.duration, a.fm.canon)
							FM.scale(a.fm.canon, 1.3)
							FM.step(a.fm, dt)
						else
							FM.actor(a.fm, "ATTACK", ap * 0.9, dt, nil, 1.35)
						end
					elseif ap >= 1 and ap < 1.7 then
						-- [동료 무기 회수] 실제 공격 후 0.35초 자세를 정돈한다(기존 공격 판정·주기는 동일).
						FM.actor(a.fm, "RECOVERY", math.clamp((ap - 1) / 0.7, 0, 1), dt, nil, 1.25)
					elseif tgt and not moving and a.nextAt > now and a.nextAt - now < 0.22 then
						-- [타격 예고] 다음 공격 직전의 짧은 무기 준비. 대미지 발생 시각은 변경하지 않는다.
						FM.actor(a.fm, "ANTICIPATION", 1 - (a.nextAt - now) / 0.22, dt, nil, 1.18)
					elseif moving then
						FM.actor(a.fm, "RUN", (a.gait or 0) % 1, dt, nil, 1.3)
					else
						FM.actor(a.fm, "IDLE", (now / 2.4 + a.slot * 0.3) % 1, dt, nil, 1.15)
					end
				elseif a.castAt and now - a.castAt < 0.7 then
					Pose.makeR15Action(a.model, if a.castSkill == "rally" or a.castSkill == "heal" then "cheer" elseif a.castSkill == "armor" then "guard" else "talk", (now - a.castAt) / 0.7, now - a.t0)
				elseif ap >= 0 and ap < 1 then
					Pose.makeR15Action(a.model, "attack", ap, now - a.t0)
				else
					Pose.makeR15Action(a.model, if moving then "run" else "idle", 0, if moving then (a.gait or 0) * 2 * math.pi else now - a.t0)
				end
			end
		end))
	end


	-- 폰: 기본 터치 조이스틱이 막히는 경우가 있어, 탐험 중에는 직접 만든 이동 패드를 쓴다(왼쪽 아래 원판을 끌면 카메라 기준으로 걷는다).
	do
		local UIS = game:GetService("UserInputService")
		if UIS.TouchEnabled and not UIS.KeyboardEnabled then
			local ctrl
			pcall(function()
				ctrl = require(player:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule", 3)):GetControls()
				ctrl:Disable()
			end)
			local pad = Instance.new("Frame")
			pad.Name = "FieldMovePad" -- [모바일 입력] 실제 이동 조작을 검사할 수 있도록 기존 패드에 이름만 부여한다.
			pad.AnchorPoint = Vector2.new(0, 1)
			pad.Position = UDim2.new(0, 28, 1, -28)
			pad.Size = UDim2.fromOffset(150, 150)
			pad.BackgroundColor3 = Color3.fromRGB(20, 28, 40)
			pad.BackgroundTransparency = 0.55
			pad.BorderSizePixel = 0
			pad.Active = true
			pad.Parent = gui
			local padCorner = Instance.new("UICorner")
			padCorner.CornerRadius = UDim.new(1, 0)
			padCorner.Parent = pad
			local knob = Instance.new("Frame")
			knob.Name = "FieldMoveKnob"
			knob.AnchorPoint = Vector2.new(0.5, 0.5)
			knob.Position = UDim2.fromScale(0.5, 0.5)
			knob.Size = UDim2.fromOffset(60, 60)
			knob.BackgroundColor3 = Color3.fromRGB(235, 220, 170)
			knob.BackgroundTransparency = 0.2
			knob.BorderSizePixel = 0
			knob.Parent = pad
			local knobCorner = Instance.new("UICorner")
			knobCorner.CornerRadius = UDim.new(1, 0)
			knobCorner.Parent = knob
			local active, vec = nil, Vector2.zero
			local lastLow, lastRoll = 0, 0
			local function setFrom(pos: Vector3)
				local c = pad.AbsolutePosition + pad.AbsoluteSize / 2
				local d = (Vector2.new(pos.X, pos.Y) - c) / 42
				vec = if d.Magnitude > 1 then d.Unit else d
				-- 튕기기(플릭): 스틱을 0.12초 안에 끝까지 빠르게 밀면 그 방향으로 구른다(적이 가까울 때만)
				local nowF = os.clock()
				if vec.Magnitude < 0.35 then
					lastLow = nowF
				elseif vec.Magnitude > 0.95 and nowF - lastLow < 0.12 and nowF - lastRoll > 0.6 then
					local _, hr = char3()
					local cm = workspace.CurrentCamera
					local near = false
					if hr then
						for _, e in enemies do
							if e.root and e.root.Parent and (e.root.Position - hr.Position).Magnitude < 35 then
								near = true
								break
							end
						end
					end
					if near and hr and cm then
						lastRoll = nowF
						local wd = cm.CFrame:VectorToWorldSpace(Vector3.new(vec.X, 0, vec.Y)) * Vector3.new(1, 0, 1)
						if wd.Magnitude > 0.1 then
							hr.CFrame = CFrame.lookAt(hr.Position, hr.Position + wd.Unit)
							useMove("dodge")
						end
					end
				end
				knob.Position = UDim2.new(0.5, vec.X * 48, 0.5, vec.Y * 48)
			end
			-- 화면 왼쪽 절반 아무 데나 누르면 거기가 스틱 중심이 된다(패드 바깥에서도 조작 가능). 손을 떼면 제자리로 돌아간다.
			local homePos = pad.Position
			local function startAt(input: InputObject)
				active = input
				local half = pad.AbsoluteSize.X / 2
				local vs = workspace.CurrentCamera.ViewportSize
				local cx = math.clamp(input.Position.X, half + 8, vs.X * 0.5)
				local cy = math.clamp(input.Position.Y, half + 8, vs.Y - half - 8)
				-- [모바일 이동] 스크린의 원점·안전 영역을 추측하지 않고 실제 패드 중심과 손가락 좌표의 차이만큼 이동한다.
				local center = pad.AbsolutePosition + pad.AbsoluteSize / 2
				pad.Position = pad.Position + UDim2.fromOffset(cx - center.X, cy - center.Y)
				setFrom(input.Position)
			end
			table.insert(conns, pad.InputBegan:Connect(function(input)
				if not active and (input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1) then
					startAt(input)
				end
			end))
			table.insert(conns, UIS.InputBegan:Connect(function(input, processed)
				if active or processed or input.UserInputType ~= Enum.UserInputType.Touch then
					return
				end
				if input.Position.X < workspace.CurrentCamera.ViewportSize.X * 0.5 then
					startAt(input)
				end
			end))
			table.insert(conns, UIS.InputChanged:Connect(function(input)
				if active and (input == active or input.UserInputType == Enum.UserInputType.MouseMovement) then
					setFrom(input.Position)
				end
			end))
			table.insert(conns, UIS.InputEnded:Connect(function(input)
				if input == active then
					active, vec = nil, Vector2.zero
					knob.Position = UDim2.fromScale(0.5, 0.5)
					pad.Position = homePos
				end
			end))
			table.insert(conns, RunService.Heartbeat:Connect(function()
				if finished then
					return
				end
				local h3 = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
				local cam3 = workspace.CurrentCamera
				if h3 and cam3 then
					if vec.Magnitude > 0.15 then
						local dir = cam3.CFrame:VectorToWorldSpace(Vector3.new(vec.X, 0, vec.Y))
						dir = Vector3.new(dir.X, 0, dir.Z)
						-- 끝까지 안 밀어도 전속(곡선): 반응이 둔하지 않게
						h3:Move(if dir.Magnitude > 0 then dir.Unit * math.min(1, vec.Magnitude * 1.4) else Vector3.zero, false)
					elseif active == nil then
						h3:Move(Vector3.zero, false)
					end
				end
			end))
			table.insert(conns, { Disconnect = function()
				workspace:SetAttribute("FieldTouchPad", nil)
				pcall(function()
					if ctrl then
						ctrl:Enable()
					end
				end)
			end })
			workspace:SetAttribute("FieldTouchPad", true)
		end
	end

	-- 이동 감시: 다른 화면 코드(항구 전경 등)가 캐릭터를 다시 고정하거나 조작을 끄지 못하게 매 프레임 되돌린다.
	local lastSafe = CFrame.new(spawn)
	pcall(function()
		local controls = require(player:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule", 3)):GetControls()
		if not workspace:GetAttribute("FieldTouchPad") then
			controls:Enable()
		end
	end)
	table.insert(conns, RunService.Heartbeat:Connect(function()
		if finished then
			return
		end
		local c2 = player.Character
		local r2 = c2 and c2:FindFirstChild("HumanoidRootPart")
		local h2 = c2 and c2:FindFirstChildOfClass("Humanoid")
		-- [낙사 복구] 장애물·전투 넉백으로 바닥 아래 또는 전투 구역 밖에 떨어져도 전투 상태/보상은 유지한다.
		if r2 and r2:IsA("BasePart") then
			local p = r2.Position
			local off = p - ORIGIN
			if off.Y < -6 or math.abs(off.X) > half + 2 or math.abs(off.Z) > half + 2 then
				r2.CFrame = CFrame.new(lastSafe.Position) * r2.CFrame.Rotation
				r2.AssemblyLinearVelocity = Vector3.zero
				r2.AssemblyAngularVelocity = Vector3.zero
				if h2 then h2:ChangeState(Enum.HumanoidStateType.GettingUp) end
				if RunService:IsStudio() then workspace:SetAttribute("FieldFallRescues", (workspace:GetAttribute("FieldFallRescues") or 0) + 1) end
			elseif off.Y >= 2 and off.Y < 14 and math.abs(off.X) < half - 8 and math.abs(off.Z) < half - 8
				and h2 and h2.FloorMaterial ~= Enum.Material.Air then
				lastSafe = r2.CFrame
			end
		end
		if r2 and r2:IsA("BasePart") and r2.Anchored then
			r2.Anchored = false
		end
		if h2 then
			if h2.WalkSpeed < 16 then
				h2.WalkSpeed = if workspace:GetAttribute("FieldTouchPad") then 22 else 18
			end
			if h2.PlatformStand or h2.Sit then
				h2.PlatformStand = false
				h2.Sit = false
			end
		end
		local cam2 = workspace.CurrentCamera
		if cam2 and cam2.CameraType ~= Enum.CameraType.Custom and not workspace:GetAttribute("ShotCF") then
			cam2.CameraType = Enum.CameraType.Custom
			if h2 then
				cam2.CameraSubject = h2
			end
		end
		local tg = player:FindFirstChild("PlayerGui") and player.PlayerGui:FindFirstChild("TouchGui")
		if tg and tg:IsA("ScreenGui") and not tg.Enabled and not workspace:GetAttribute("FieldTouchPad") then
			tg.Enabled = true
		end
	end))

	refresh()
	say("공격 F(3연타) · 강타 Q · 회전베기 E · 회피 R. 적이 붉게 변하면 공격 예고!")
	-- [필드 입장] 큰 탐험 맵의 생성 중 서버/항구 시점이 캐릭터를 되돌렸다면 기존 출발 좌표로 한 번 복구한다.
	local readyCharacter = player.Character
	local readyRoot = readyCharacter and readyCharacter:FindFirstChild("HumanoidRootPart")
	if readyRoot and readyRoot.Position.X < ORIGIN.X - 500 then
		readyCharacter:PivotTo(CFrame.new(spawn))
		readyRoot.Anchored = false
	end
	return { finish = finish, spawn = CFrame.new(spawn) }
end

return FieldScene
