--!nonstrict
-- 파일명: FieldScene.luau
-- 필드 탐험 장면 (클라이언트 전용). 탐험 지점에 도착하면 걸어 다니며 발견물을 조사하고,
-- 길을 막는 적을 공격 버튼으로 물리친다. 이 장면은 연출과 위험 부담이고,
-- 도감 카드 발견과 보상은 장면이 끝난 뒤 서버(Explore)가 판정한다.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Pose = require(script.Parent:WaitForChild("Pose"))
local AC = require(script.Parent:WaitForChild("ActionCombat"))
local AssetIds = require(script.Parent:WaitForChild("AssetIds"))
local KnowledgeCards = require(script.Parent:WaitForChild("KnowledgeCards"))
local Sfx = require(script.Parent:WaitForChild("Sfx"))
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

-- [아이콘 표시] 등록된 공용 아이콘·도감 원화만 사용한다. 스킬은 글자 없이 그림을 중앙 배치한다.
-- 공격·철수 등 기존 글자 버튼의 아이콘 위치는 변경하지 않는다.
local function addIcon(button: TextButton, key: string)
	local id = (AssetIds :: any)[key]
	if not id then return nil end
	local painted = string.sub(key, 1, 8) == "CardArt/"
	local iconOnly = button.Name == "FieldAttack" or string.sub(button.Name, 1, 11) == "FieldSkill_" or string.sub(button.Name, 1, 16) == "FieldLockedSkill"
	local medallion = Instance.new("Frame")
	medallion.Name = "FieldIconMedallion"
	medallion.AnchorPoint = Vector2.new(0.5, 0.5)
	medallion.Position = UDim2.fromScale(0.5, if iconOnly then 0.5 else 0.385)
	medallion.Size = UDim2.fromScale(if iconOnly then 0.94 else (if painted then 0.83 else 0.82),
		if iconOnly then 0.94 else (if painted then 0.74 else 0.76))
	medallion.BackgroundColor3 = if button.Name == "FieldSkill_dodge" then Color3.fromRGB(12, 72, 87)
		elseif button.Name == "FieldAttack" then Color3.fromRGB(88, 29, 33)
		elseif painted then Color3.fromRGB(38, 32, 28) else Color3.fromRGB(40, 43, 47)
	medallion.BackgroundTransparency = if painted then 0 else 0.33
	medallion.BorderSizePixel = 0
	medallion.ZIndex = button.ZIndex + 2
	medallion.Parent = button
	local rounded = Instance.new("UICorner")
	rounded.CornerRadius = UDim.new(if painted then 0.16 else 1, 0)
	rounded.Parent = medallion
	local rim = Instance.new("UIStroke")
	rim.Name = "FieldIconRim"
	rim.Color = if button.Name == "FieldSkill_dodge" then Color3.fromRGB(120, 244, 233)
		elseif button.Name == "FieldAttack" then Color3.fromRGB(255, 207, 143)
		else Color3.fromRGB(245, 208, 128)
	rim.Thickness = if button.Name == "FieldSkill_dodge" then 3 elseif button.Name == "FieldAttack" then 2.5
		elseif painted then 1.2 else 1.6
	rim.Transparency = 0.14
	rim.Parent = medallion
	local img = Instance.new("ImageLabel")
	img.Name = "FieldButtonIcon"
	img.BackgroundTransparency = 1
	img.Image = "rbxassetid://" .. tostring(id)
	img.AnchorPoint = Vector2.new(0.5, 0.5)
	img.Position = UDim2.fromScale(0.5, if iconOnly then 0.5 else 0.385)
	img.Size = UDim2.fromScale(if iconOnly then 0.88 else (if painted then 0.83 else 0.79),
		if iconOnly then 0.88 else 0.72)
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
	korea = { ground = RC(110, 140, 94), mat = Enum.Material.Grass, fog = RC(200, 215, 224), fogEnd = 510, clock = 11, treeMul = 1.2, rockMul = 0.9, sizeMul = 1, trees = { "tree-pinedefaulta", "tree-oak" }, mobs = { "산적", "탈영병", "산적 두목" }, props = { { "Terrain", "east-bamboo-grove", 3, 8 }, { "Terrain", "river-stone-bank", 3, 5 }, { "Terrain", "coast-grass-patch", 3, 2 } } },
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
	japan = "forest", korea = "coast", china = "highland", seasia = "forest", tropic = "coast",
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
	-- [스킬 재사용 시각화] 원형 메달 안에서는 마스킹과 초 단위 숫자,
	-- 아래에서는 남은 시간 비율을 표시한다. 빠른 화면에서도 글자 크기는 고정한다.
	local ring = Instance.new("UICorner")
	ring.CornerRadius = UDim.new(1, 0)
	ring.Parent = shade
	local track = Instance.new("Frame")
	track.Name = "FieldCooldownTrack"
	track.Position = UDim2.new(0.13, 0, 1, -7)
	track.Size = UDim2.new(0.74, 0, 0, 4)
	track.BackgroundColor3 = Color3.fromRGB(32, 46, 63)
	track.BorderSizePixel = 0
	track.Visible = false
	track.ZIndex = b.ZIndex + 5
	track.Parent = b
	local progress = Instance.new("Frame")
	progress.Name = "FieldCooldownProgress"
	progress.Size = UDim2.fromScale(1, 1)
	progress.BackgroundColor3 = Color3.fromRGB(106, 206, 228)
	progress.BorderSizePixel = 0
	progress.ZIndex = track.ZIndex + 1
	progress.Parent = track
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
	workspace:SetAttribute("FieldExitReason", nil)
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
	local comboRng = Random.new() -- [연타 난수] 지역 맵·보상 추첨 RNG와 별개로 실제 무작위 시각 발동
	-- [무기별 영구 숙련] 서버 저장본에서 단계를 복원하고 이번 탐험에서 획득한 경험치만 별도 정산한다.
	local weaponPractice, earnedPractice = {}, {}
	local function practiceRank(xp)
		return if xp >= 100 then 5 elseif xp >= 55 then 4 elseif xp >= 26 then 3 elseif xp >= 8 then 2 else 1
	end
	if type(opts.weaponPractice) == "table" then
		for id, xp in opts.weaponPractice do
			if type(id) == "string" and Weapons.get(id).id == id and type(xp) == "number" and xp == xp then
				local safeXp = math.floor(math.clamp(xp, 0, 10000))
				weaponPractice[id] = { xp = safeXp, rank = practiceRank(safeXp) }
			end
		end
	end
	local biome = lookFor(opts.name or "", opts.portId)
	local visualMobile = game:GetService("UserInputService").TouchEnabled
	folder:SetAttribute("FieldDifficultyGrade", math.clamp(math.floor(tonumber(opts.danger) or 1), 1, 5))
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

	-- [탐험 지역변수 한도] 현장 지형 생성은 이 블록에서 종료하고 전투 UI 변수를 보호한다.
	do
	-- 나무와 바위
	local treeNames = biome.treeNames or { "tree", "tree-crooked", "tree-high", "tree_large", "tree_tiny" }
	-- [모바일 안정화] 메시는 화면 자원만 줄이고 탐험 보상·몬스터 수·위험도는 유지한다.
	local treeCount = math.floor(biome.trees * 2 * AREA)
	local visualTreeCount = if visualMobile then math.min(treeCount, 44) else treeCount
	for _ = 1, visualTreeCount do
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
	local visualRockCount = if visualMobile then math.min(rockCount, 36) else rockCount
	for _ = 1, visualRockCount do
		local pos = ORIGIN + scatter(10)
		local rock = rockNames[rng:NextInteger(1, #rockNames)]
		-- 실제 등록된 바위 메시만 배치한다. 파츠 박스 우회 금지.
		placeModel(folder, rock[1], rock[2], pos, rng:NextNumber(2.5, 6), true)
	end

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
	-- [휴식 회복] 자동 회복은 이번 지상 탐험의 체력에만 적용한다. 동료는 실제 영입·소환된 치료 직업만 인정한다.
	local lastCombatAt = os.clock()
	local activeHealers = {}
	local passiveRegenHudAt, passiveRegenFxAt = 0, -100
	-- [정예 둔화·보스 독] 탐험 한 판에만 존재하는 비저장 상태. 중복 효과와 지속 피해 폭증을 방지한다.
	local eliteSlowUntil, bossPoisonUntil, bossPoisonNextAt = 0, 0, math.huge
	local slowedHumanoid, originalFieldWalkSpeed = nil, nil
	local fieldStreakResult = { hits = 0, speed = 0, accuracy = 100, credited = {} }
	local found = 0
	local nodeCount = math.max(1, opts.nodes or 1)
	local observedCardId = nil -- [탐험] finish 콜백과 현장 조사에서 공유하는 이번 탐험 한정 값
	local finished = false
	local enemies = {}
	local conns = {}

	local gui = Instance.new("ScreenGui")
	gui.Name = "FieldGui"
	gui.ResetOnSpawn = false
	gui.DisplayOrder = 20
	gui.Parent = player:WaitForChild("PlayerGui")
	-- [예외 종료 복구] 정상 finish가 아닌 중간 생성 오류로 폴더가 삭제돼도
	-- Heartbeat/입력 연결·카메라·조명·필드 UI를 남기지 않는다.
	folder.Destroying:Connect(function()
		if finished then return end
		finished = true
		-- [예외 철수] 둔화 상태를 항구로 가져가지 않도록 원래 이동속도를 즉시 복원한다.
		if slowedHumanoid and slowedHumanoid.Parent and originalFieldWalkSpeed then
			slowedHumanoid.WalkSpeed = originalFieldWalkSpeed
		end
		slowedHumanoid, originalFieldWalkSpeed = nil, nil
		for _, c in conns do
			local ok, err = pcall(function() c:Disconnect() end)
			if not ok then warn("[MareEssentia] 비정상 탐험 정리 오류", err) end
		end
		workspace:SetAttribute("FieldCombatReady", nil)
		workspace:SetAttribute("FieldTouchPad", nil)
		workspace:SetAttribute("FieldCameraMode", nil)
		workspace:SetAttribute("FieldCameraZoomMax", nil)
		player.CameraMode = savedCameraMode
		player.CameraMaxZoomDistance = math.max(savedZoomMin, savedZoomMax)
		player.CameraMinZoomDistance = savedZoomMin
		player.CameraMaxZoomDistance = savedZoomMax
		local L = game:GetService("Lighting")
		L.FogColor, L.FogStart, L.FogEnd, L.ClockTime = lightSave.FogColor, lightSave.FogStart, lightSave.FogEnd, lightSave.ClockTime
		L.Brightness, L.Ambient, L.OutdoorAmbient = lightSave.Brightness, lightSave.Ambient, lightSave.OutdoorAmbient
		L.ColorShift_Top = lightSave.ColorShiftTop
		if gui.Parent then gui:Destroy() end
	end)
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
	title.Position = UDim2.new(0.5, 0, 0, 18)
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

	-- [탐험 파티 HUD] 기존 선장실 초상 시트 좌표를 그대로 표시하고 체력·기력·마력을 한 카드에 모은다.
	local heroPanel = Instance.new("Frame")
	heroPanel.Name = "FieldHeroStatus"
	heroPanel.Size = UDim2.fromOffset(202, 82)
	heroPanel.Position = UDim2.fromOffset(12, 74)
	heroPanel.BackgroundColor3 = Color3.fromRGB(23, 32, 47)
	heroPanel.BackgroundTransparency = 0.12
	heroPanel.BorderSizePixel = 0
	heroPanel.Parent = gui
	local heroCorner = Instance.new("UICorner")
	heroCorner.CornerRadius = UDim.new(0, 10)
	heroCorner.Parent = heroPanel
	local heroStroke = Instance.new("UIStroke")
	heroStroke.Color = Color3.fromRGB(210, 170, 99)
	heroStroke.Thickness = 1.3
	heroStroke.Parent = heroPanel
	local heroFace = Instance.new("ImageLabel")
	heroFace.Name = "FieldHeroPortrait"
	heroFace.Size = UDim2.fromOffset(44, 56)
	heroFace.Position = UDim2.fromOffset(7, 10)
	heroFace.BackgroundColor3 = Color3.fromRGB(56, 66, 75)
	heroFace.BorderSizePixel = 0
	heroFace.ScaleType = Enum.ScaleType.Crop
	if type(opts.heroPortrait) == "table" and opts.heroPortrait.id then
		heroFace.Image = "rbxassetid://" .. tostring(opts.heroPortrait.id)
		heroFace.ImageRectOffset = opts.heroPortrait.offset or Vector2.zero
		heroFace.ImageRectSize = opts.heroPortrait.size or Vector2.zero
	end
	heroFace.Parent = heroPanel
	local faceCorner = Instance.new("UICorner")
	faceCorner.CornerRadius = UDim.new(0, 7)
	faceCorner.Parent = heroFace
	local heroName = label(heroPanel, tostring(opts.heroName or player.DisplayName), 14)
	heroName.Name = "FieldHeroName"
	heroName.Size = UDim2.fromOffset(136, 20)
	heroName.Position = UDim2.fromOffset(58, 5)
	heroName.TextXAlignment = Enum.TextXAlignment.Left
	heroName.TextTruncate = Enum.TextTruncate.AtEnd
	hpBack.Parent = heroPanel
	hpBack.AnchorPoint = Vector2.zero
	hpBack.Position = UDim2.fromOffset(58, 29)
	hpBack.Size = UDim2.fromOffset(133, 11)
	local healthNumber = label(heroPanel, "", 11, Color3.fromRGB(233, 255, 234))
	healthNumber.Name = "FieldHeroHealthText"
	healthNumber.Position = UDim2.fromOffset(58, 29)
	healthNumber.Size = UDim2.fromOffset(133, 11)
	healthNumber.ZIndex = 6
	-- [상태이상 HUD] 초상화 아래에 간결하게 표시해 기존 기력·마력 진행선과 겹치지 않는다.
	local debuffLabel = label(heroPanel, "", 10, Color3.fromRGB(151, 210, 249))
	debuffLabel.Name = "FieldHeroDebuff"
	debuffLabel.Position = UDim2.fromOffset(5, 67)
	debuffLabel.Size = UDim2.fromOffset(52, 13)
	debuffLabel.TextScaled = true
	debuffLabel.ZIndex = 7
	local magicUser = opts.heroUsesMana == true
	local magicValue, magicFill, magicAmount = 100, nil, nil
	if magicUser then
		local magicBack = Instance.new("Frame")
		magicBack.Name = "FieldHeroMana"
		magicBack.Size = UDim2.fromOffset(133, 7)
		magicBack.Position = UDim2.fromOffset(58, 66)
		magicBack.BackgroundColor3 = Color3.fromRGB(34, 40, 65)
		magicBack.BorderSizePixel = 0
		magicBack.Parent = heroPanel
		magicFill = Instance.new("Frame")
		magicFill.Name = "FieldHeroManaFill"
		magicFill.Size = UDim2.fromScale(1, 1)
		magicFill.BackgroundColor3 = Color3.fromRGB(111, 154, 244)
		magicFill.BorderSizePixel = 0
		magicFill.Parent = magicBack
		magicAmount = label(heroPanel, "마력 100", 10, Color3.fromRGB(194, 222, 255))
		magicAmount.Size = UDim2.fromOffset(127, 12)
		magicAmount.Position = UDim2.fromOffset(58, 68)
		magicAmount.TextXAlignment = Enum.TextXAlignment.Right
		magicAmount.ZIndex = 6
	end

	local note = label(gui, "", 14, Color3.fromRGB(255, 220, 160))
	note.AnchorPoint = Vector2.new(0.5, 0)
	note.Position = UDim2.new(0.5, 0, 0, 46)
	note.Size = UDim2.fromOffset(320, 22)

	local function refresh()
		if workspace:GetAttribute("DevGod") then pl.hp = pl.maxHp end -- 개발 캡처 전용: 서 있기만 해도 죽지 않게
		title.Text = string.format("%s · %d단  발견 %d/%d  적 %d", opts.name or "탐험", folder:GetAttribute("FieldDifficultyGrade") or 1, found, nodeCount, #enemies)
		hpFill.Size = UDim2.fromScale(math.clamp(pl.hp / pl.maxHp, 0, 1), 1)
		hpFill.BackgroundColor3 = if pl.hp / pl.maxHp < 0.35 then Color3.fromRGB(214, 82, 76) else Color3.fromRGB(91, 181, 120)
		healthNumber.Text = string.format("체력 %d / %d", math.ceil(pl.hp), pl.maxHp)
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

	-- [2~3연타 마무리] 숙련도는 5단계까지 유지하되 연타는 최대 3타, 시각 연출만 적용한다.
	local killcamToken = 0
	local killcamCamera = nil
	local killcamFov = 70
	local function finish(result)
		if finished then
			return
		end
		finished = true
		-- [정상 철수] 감속으로 낮춘 이동속도는 필드를 떠나기 전에 반드시 복구한다.
		if slowedHumanoid and slowedHumanoid.Parent and originalFieldWalkSpeed then
			slowedHumanoid.WalkSpeed = originalFieldWalkSpeed
		end
		slowedHumanoid, originalFieldWalkSpeed = nil, nil
		killcamToken += 1
		pcall(function() RunService:UnbindFromRenderStep("FieldMasteryKillcam") end)
		if killcamCamera and killcamCamera.Parent then killcamCamera.FieldOfView = killcamFov end
		workspace:SetAttribute("FieldExitReason", result)
		if RunService:IsStudio() then warn("[MareEssentia] 탐험 종료 이유", result) end
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
			local ok, err = pcall(opts.onFinish, result, observedCardId, earnedPractice, fieldStreakResult)
			if not ok then warn("[MareEssentia] 탐험 복귀 오류", err) end
		end
	end

	-- [전투 중 강제 귀환 방지] 발견물을 전부 조사해도 자동으로 항구로 나가지 않는다.
	-- 실제 탐험 완료 버튼을 선택했을 때만 기존 Explore 보상 서버 액션이 실행된다.
	-- [탐험 완료 연출] 발견물 조사 후에만 나타나는 확인 팝업. 클릭 전에는 기존 Explore 보상을 처리하지 않는다.
	local completePopup = Instance.new("Frame")
	completePopup.Name = "FieldCompletionPopup"
	completePopup.AnchorPoint = Vector2.new(0.5, 0.5)
	completePopup.Position = UDim2.fromScale(0.5, 0.43)
	completePopup.Size = UDim2.fromOffset(286, 198)
	completePopup.BackgroundColor3 = Color3.fromRGB(27, 39, 55)
	completePopup.BackgroundTransparency = 0.05
	completePopup.BorderSizePixel = 0
	completePopup.ZIndex = 22
	completePopup.Visible = false
	completePopup.Parent = gui
	local popupCorner = Instance.new("UICorner")
	popupCorner.CornerRadius = UDim.new(0, 15)
	popupCorner.Parent = completePopup
	local popupStroke = Instance.new("UIStroke")
	popupStroke.Color = Color3.fromRGB(239, 202, 115)
	popupStroke.Thickness = 2.2
	popupStroke.Parent = completePopup
	local popupTitle = label(completePopup, "탐험 조사 완료!", 24, Color3.fromRGB(255, 231, 157))
	popupTitle.Name = "FieldCompletionTitle"
	popupTitle.Size = UDim2.new(1, -24, 0, 34)
	popupTitle.Position = UDim2.fromOffset(12, 18)
	popupTitle.ZIndex = 24
	local popupSummary = label(completePopup, "현장 기록 수집 완료 · 보상은 귀환 후 확정", 13, Color3.fromRGB(222, 235, 246))
	popupSummary.Size = UDim2.new(1, -20, 0, 43)
	popupSummary.Position = UDim2.fromOffset(10, 60)
	popupSummary.TextWrapped = true
	popupSummary.ZIndex = 24
	local completeBtn = btn(completePopup, "항구로 귀환", Color3.fromRGB(146, 115, 52), UDim2.fromOffset(172, 45),
		UDim2.new(0.5, 0, 1, -10), Vector2.new(0.5, 1))
	completeBtn.Name = "FieldComplete"
	completeBtn.ZIndex = 25
	completeBtn.Visible = false
	completeBtn.TextSize = 17
	local completeReopen = btn(gui, "조사 완료", Color3.fromRGB(137, 111, 59), UDim2.fromOffset(98, 38),
		UDim2.new(1, -12, 0, 98), Vector2.new(1, 0))
	completeReopen.Name = "FieldCompleteReopen"
	completeReopen.Visible = false
	completeReopen.TextSize = 14
	completeReopen.Activated:Connect(function()
		if not finished and found >= nodeCount then completePopup.Visible = true end
	end)
	local continueBtn = btn(completePopup, "더 둘러보기", Color3.fromRGB(63, 94, 110), UDim2.fromOffset(116, 32),
		UDim2.new(0.5, 0, 0, 112), Vector2.new(0.5, 0))
	continueBtn.Name = "FieldContinue"
	continueBtn.ZIndex = 25
	continueBtn.TextSize = 13
	continueBtn.Activated:Connect(function() completePopup.Visible = false end)
	local function showCompletion()
		if completePopup.Visible then return end
		popupSummary.Text = string.format("이번 최고 %d연타 · 초당 %.1f타 · 명중률 %d%%\n역대 최고 %d연타 · 보상은 귀환 후 확정",
			fieldStreakResult.hits, fieldStreakResult.speed, fieldStreakResult.accuracy,
			math.max(math.floor(tonumber(opts.fieldStreakBest) or 0), fieldStreakResult.hits))
		completeBtn.Visible, completeReopen.Visible = true, true
		completePopup.Visible = true
		local scale = Instance.new("UIScale")
		scale.Scale = 0.78
		scale.Parent = completePopup
		TweenService:Create(scale, TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
		TweenService:Create(popupStroke, TweenInfo.new(0.55, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Thickness = 3.1 }):Play()
		task.delay(0.65, function() if popupStroke.Parent then TweenService:Create(popupStroke, TweenInfo.new(0.4), { Thickness = 2.2 }):Play() end end)
		sfx("sfx_coin", 0.7, 1.1)
		for i = 1, 10 do
			local glint = Instance.new("Frame")
			glint.Name = "FieldCompletionSpark"
			glint.Size = UDim2.fromOffset(5, 5)
			glint.Position = UDim2.fromScale(0.1 + (i % 5) * 0.2, if i <= 5 then 0.11 else 0.92)
			glint.BackgroundColor3 = Color3.fromRGB(255, 224, 142)
			glint.BorderSizePixel = 0
			glint.ZIndex = 26
			glint.Parent = completePopup
			TweenService:Create(glint, TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				BackgroundTransparency = 1, Position = glint.Position + UDim2.fromOffset((i - 5) * 3, -12),
			}):Play()
			task.delay(0.65, function() if glint.Parent then glint:Destroy() end end)
		end
	end
	completeBtn.Activated:Connect(function()
		if not finished and found >= nodeCount then finish("clear") end
	end)
	-- [지역 도감] 서버가 미발견·시대·연구 선행 조건을 검사한 기존 탐험지 카드만 현장에 출현한다.
	-- 카드 희귀도·획득 확률은 서버의 원래 Explore 처리에서 결정하고, 현장 연출은 저장하지 않는다.
	local availableCards = {}
	for _, id in (opts.observableCards or {}) do
		if type(id) == "string" and KnowledgeCards.ById[id] then
			table.insert(availableCards, id)
		end
	end
	local targetCard = if #availableCards > 0 then KnowledgeCards.ById[availableCards[rng:NextInteger(1, #availableCards)]] else nil
	local isWildlife = targetCard and (targetCard.field == "Zoology" or (targetCard.meta and targetCard.meta.kind == "animal")) == true
	local rareTrace = targetCard and (targetCard.rarity == "Rare" or targetCard.rarity == "Epic" or targetCard.rarity == "Legendary") == true
	folder:SetAttribute("FieldTargetCard", targetCard and targetCard.id or "")
	folder:SetAttribute("FieldRareTraceTotal", if rareTrace then 2 else 0)
	folder:SetAttribute("FieldRareTraceFound", 0)

	local questHint = label(gui, "", 13, Color3.fromRGB(254, 229, 162))
	questHint.Name = "FieldQuestHint"
	questHint.Position = UDim2.fromOffset(12, 173)
	questHint.Size = UDim2.fromOffset(230, 42)
	questHint.TextWrapped = true
	questHint.TextXAlignment = Enum.TextXAlignment.Left
	if targetCard then
		questHint.Text = if rareTrace then "희귀 조사: 흔적 0/2 → " .. targetCard.name
			else (if isWildlife then "지역 동물 관찰: " else "지식 단서 조사: ") .. targetCard.name
	end

	-- 기존 발견물 수/발견 완료 기준은 그대로 둔다. 첫 발견 지점만 지역 도감 실물/기록으로 연출한다.
	for i = 1, nodeCount do
		local pos = ORIGIN + scatter(30)
		local special = i == 1 and targetCard ~= nil
		local anchor = part(folder, Vector3.new(3, 3, 3), CFrame.new(pos + Vector3.new(0, 1.5, 0)), Color3.fromRGB(255, 214, 120), Enum.Material.Neon)
		anchor.Transparency = if special then 1 else 0.35
		anchor.CanCollide = false
		anchor.CanQuery = false
		anchor.Name = "Discovery" .. i
		if special then
			anchor:SetAttribute("ObservationCardId", targetCard.id)
			-- [승인된 동물 실물] 기존 Animals 폴더의 실제 종이 맞을 때만 3D 메시를 사용한다.
			-- 없는 종을 다른 동물 메시로 위장하지 않고 종 이름과 승인된 도감 원화를 보여 준다.
			local animalModels = {
				zoo_elephant = { "elephant", 11 }, zoo_indian_elephant = { "elephant", 11 },
				am_llama = { "llama", 6 },
			}
			local animal = if isWildlife then animalModels[targetCard.id] else nil
			if animal and AssetIds["Animals/" .. animal[1]] then
				local placed = placeModel(folder, "Animals", animal[1], pos, animal[2], false)
				if placed then
					placed.Name = "FieldWildlife"
					placed:SetAttribute("ObservedSpecies", targetCard.id)
				else
					-- [지연 로드] 기존 AssetLoader로 로드가 끝난 동일 종의 승인 모델만 배치한다.
					local assets = ReplicatedStorage:FindFirstChild("MareAssets")
					local group = assets and assets:FindFirstChild("Animals")
					if group then
						table.insert(conns, group.ChildAdded:Connect(function(asset)
							if asset.Name ~= animal[1] or finished or not anchor.Parent then return end
							task.defer(function()
								if finished or not anchor.Parent then return end
								local readyModel = placeModel(folder, "Animals", animal[1], pos, animal[2], false)
								if readyModel then
									readyModel.Name = "FieldWildlife"
									readyModel:SetAttribute("ObservedSpecies", targetCard.id)
								end
							end)
						end))
					end
				end
			end
			-- [원본 도감] 등록된 카드 원화만 노출한다. 없는 카드에는 확인 불가능한 동물 이미지를 만들지 않는다.
			local board = Instance.new("BillboardGui")
			board.Name = "FieldObservation"
			board.Adornee = anchor
			board.Size = UDim2.fromOffset(154, 150)
			board.StudsOffset = Vector3.new(0, 3.5, 0)
			board.AlwaysOnTop = false
			board.MaxDistance = 58
			board.Parent = anchor
			local artId = AssetIds["CardArt/" .. targetCard.id]
			if artId then
				local art = Instance.new("ImageLabel")
				art.Name = "FieldSpeciesArt"
				art.Size = UDim2.new(1, 0, 0, 118)
				art.BackgroundTransparency = 1
				art.Image = "rbxassetid://" .. tostring(artId)
				art.ScaleType = Enum.ScaleType.Fit
				art.Parent = board
			end
			local tag = label(board, targetCard.name, 16, Color3.fromRGB(255, 229, 164))
			tag.Name = "FieldSpeciesName"
			tag.Position = UDim2.fromOffset(0, if artId then 117 else 45)
			tag.Size = UDim2.fromOffset(154, 28)
			tag.TextWrapped = true
		else
			placeModel(folder, "Naval", "chest", pos, 3.2, false)
		end
		local light = Instance.new("PointLight")
		light.Color = Color3.fromRGB(255, 214, 120)
		light.Range = 18
		light.Brightness = 2
		light.Parent = anchor
		local pp = Instance.new("ProximityPrompt")
		pp.ActionText = if special then (if isWildlife then "동물 관찰" else "지식 기록") else "조사"
		pp.KeyboardKeyCode = Enum.KeyCode.T -- 회전 스킬 E와 구분
		pp.ObjectText = if special then targetCard.name else "발견물"
		pp.HoldDuration = 0.6
		pp.MaxActivationDistance = 12
		pp.RequiresLineOfSight = false
		pp.Enabled = not (special and rareTrace)
		pp.Parent = anchor
		if special and rareTrace then
			-- [희귀 조사 퀘스트] 같은 탐험 안에서 단서 2개를 찾아야 본 관찰이 열린다.
			-- 이 단계는 기존 발견물 수·소모 일수·보상 확률·저장 키를 바꾸지 않는다.
			local clues = 0
			for clueIndex = 1, 2 do
				local cluePos = ORIGIN + scatter(36)
				local clue = part(folder, Vector3.new(2.2, 0.35, 2.2), CFrame.new(cluePos + Vector3.new(0, 0.25, 0)),
					Color3.fromRGB(164, 138, 79), Enum.Material.Slate)
				clue.Name = "FieldEvidence" .. clueIndex
				clue.CanCollide = false
				local cluePrompt = Instance.new("ProximityPrompt")
				cluePrompt.ActionText = if isWildlife then "동물 흔적 조사" else "현장 단서 조사"
				cluePrompt.ObjectText = targetCard.name
				cluePrompt.KeyboardKeyCode = Enum.KeyCode.T
				cluePrompt.HoldDuration = 0.5
				cluePrompt.MaxActivationDistance = 12
				cluePrompt.RequiresLineOfSight = false
				cluePrompt.Parent = clue
				cluePrompt.Triggered:Connect(function()
					if finished or not clue.Parent then return end
					clues += 1
					folder:SetAttribute("FieldRareTraceFound", clues)
					clue:Destroy()
					questHint.Text = string.format("희귀 조사: 흔적 %d/2 → %s", clues, targetCard.name)
					if clues >= 2 then
						pp.Enabled = true
						say("희귀 단서 확보! 지도에 표시된 " .. targetCard.name .. "을(를) 관찰해.")
					else
						say("흔적을 찾았어. 한 곳 더 확인해.")
					end
				end)
			end
		end
		pp.Triggered:Connect(function()
			if finished or not anchor.Parent then return end
			if special then
				observedCardId = targetCard.id
				questHint.Text = "현장 기록 완료: " .. targetCard.name
			end
			found += 1
			anchor:Destroy()
			say(string.format(if special then "현장 관찰 완료 (%d/%d) · 도감 보상은 귀환 후 판정" else "발견물을 조사했다 (%d/%d)", found, nodeCount))
			refresh()
			if found >= nodeCount then
				showCompletion()
				say("조사 완료! 항구로 귀환하거나 현장을 더 둘러볼 수 있어.")
			end
		end)
	end

	-- [탐험 지역변수 한도] 적 생성 작업용 변수는 스폰 완료 즉시 해제. 적 목록과 규칙은 기존 그대로.
	do
	-- 적: 가까이 오면 쫓아와 때린다
	-- 적: 최소 20명, 위험할수록 늘어 최대 100명(두목 포함). 무리를 지어 맵 곳곳에 흩어져 있다.
	local danger0 = opts.danger or 1
	local bossCount = if danger0 < 3 then 0 else math.clamp(math.floor(danger0 / 2), 1, 8)
	local enemyCount = math.clamp(20 + (danger0 - 1) * 6, 20, 100 - bossCount)
	-- [몹 다양화] 규칙(HP/속도/피해/드롭)은 원본 그대로, 색상·복식·관절 액션만 직군별 3종으로 구분한다.
	-- [실물 병종] 기존 승인된 Relics 무기·방패만 연결한다. 원본 적 수/HP/피해/드롭은 유지한다.
	-- 병종 외형: 직업 명칭, 복식 원형, 외투색, Weapons ID, 왼손 방패(있을 때).
	local looks = {
		grunt = {
			{ "검병", "Rogue", Color3.fromRGB(114, 86, 72), "sword" },
			{ "단검 척후병", "Rogue_Hooded", Color3.fromRGB(67, 79, 87), "dagger" },
			{ "철퇴병", "Knight", Color3.fromRGB(117, 119, 132), "mace" },
			{ "격투병", "Barbarian", Color3.fromRGB(140, 75, 59), "fist" },
			{ "선상도 검병", "Rogue", Color3.fromRGB(62, 92, 124), "cutlass" },
		},
		archer = {
			{ "궁수", "Rogue", Color3.fromRGB(98, 105, 70), "bow" },
			{ "석궁병", "Knight", Color3.fromRGB(82, 101, 127), "crossbow" },
			{ "돌 투척병", "Rogue_Hooded", Color3.fromRGB(107, 109, 93), "fist", nil, "stone" },
			{ "도기 투척병", "Rogue", Color3.fromRGB(134, 91, 65), "fist", nil, "jar" },
			{ "장총병", "Rogue_Hooded", Color3.fromRGB(66, 106, 90), "flintlock_musket" },
			{ "권총병", "Rogue", Color3.fromRGB(112, 90, 72), "flintlock_pistol" },
			{ "화약 폭탄병", "Rogue_Hooded", Color3.fromRGB(118, 77, 57), "bomb", nil, "bomb" },
			{ "해적 권총병", "Rogue", Color3.fromRGB(117, 84, 57), "ship_pistol" },
		},
		shield = {
			{ "원형방패 검병", "Knight", Color3.fromRGB(117, 119, 132), "sword", "shield-round" },
			{ "사각방패 철퇴병", "Knight", Color3.fromRGB(126, 91, 76), "mace", "shield-rectangle" },
			{ "원형방패 창병", "Barbarian", Color3.fromRGB(103, 94, 76), "spear", "shield-round" },
			{ "사각방패 도끼병", "Knight", Color3.fromRGB(95, 107, 109), "axe", "shield-rectangle" },
		},
		charger = {
			{ "도끼 돌격병", "Barbarian", Color3.fromRGB(132, 80, 58), "axe" },
			{ "장창 돌격병", "Knight", Color3.fromRGB(120, 104, 84), "spear" },
			{ "단검 습격병", "Rogue_Hooded", Color3.fromRGB(84, 91, 70), "dagger" },
			{ "망치 돌격병", "Barbarian", Color3.fromRGB(120, 54, 61), "warhammer" },
			{ "쌍날도끼 돌격병", "Barbarian", Color3.fromRGB(71, 102, 93), "doubleaxe" },
		},
		boss = {
			{ "도끼 두목", "Barbarian", Color3.fromRGB(135, 63, 55), "axe" },
			{ "방패 지휘관", "Knight", Color3.fromRGB(117, 77, 66), "sword", "shield-rectangle" },
			{ "철퇴 두목", "Knight", Color3.fromRGB(83, 90, 109), "mace" },
			{ "전투망치 두목", "Barbarian", Color3.fromRGB(112, 67, 69), "warhammer" },
			{ "쌍날도끼 두목", "Barbarian", Color3.fromRGB(64, 86, 112), "doubleaxe" },
		},
	}
	-- [퀘스트 1~5단 적 편성] 기존 적 수·체력·공격력·드롭은 그대로, 상위 단계는 견제·정예 조합이 늘어난다.
	local kinds = if danger0 <= 1 then { "grunt", "grunt", "archer", "grunt" }
		elseif danger0 == 2 then { "grunt", "archer", "grunt", "shield" }
		elseif danger0 == 3 then { "grunt", "archer", "shield", "charger" }
		elseif danger0 == 4 then { "grunt", "archer", "shield", "charger", "archer" }
		else { "archer", "shield", "charger", "grunt", "archer", "charger" }
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
		local styleN = math.floor((i - 1) / 4) % #looks[ac.kind] + 1
		-- [실등록 화약병] 1650년 이후, 전용 폭탄이 Roblox AssetIds에 있는 경우만 편성한다.
		local assetShelf = ReplicatedStorage:FindFirstChild("MareAssets")
		local bombShelf = assetShelf and assetShelf:FindFirstChild("Relics")
		local bombModel = AssetIds["Relics/weapon-bomb"] and bombShelf and bombShelf:FindFirstChild("weapon-bomb")
		local bombReady = bombModel and bombModel:IsA("Model") and bombModel:FindFirstChildWhichIsA("BasePart", true) ~= nil
		if ac.kind == "archer" and (opts.year or 1517) >= 1650
			and bombReady and math.floor((i - 1) / 4) % 6 == 4 then styleN = 7 end
		local style = looks[ac.kind][styleN]
		if style[6] == "bomb" and ((opts.year or 1517) < 1650 or not bombReady) then
			styleN = 1
			style = looks.archer[1]
		end
		-- [실물 무기 승인] 로블록스 자산 번호 미등록 중에는 빈손 무장병 대신 기존 원본 병종을 사용한다.
		if style[4] == "cutlass" and not AssetIds["Relics/weapon-cutlass"] then
			style = looks.grunt[1]
		elseif style[4] == "doubleaxe" and not AssetIds["Relics/weapon-doubleaxe"] then
			style = looks.charger[1]
		elseif style[4] == "ship_pistol" and not AssetIds["Relics/weapon-pirate-pistol"] then
			style = looks.archer[2]
		end
		-- [모든 시대 투척병] 시대별 실물을 재사용한다. 미등록 폭탄 메시로 대체하지 않는다.
		local throwAsset = style[6]
		-- [역사·실물 일치] 도기는 어디까지나 도기 투척이고, 폭탄병 명칭은 실물 화약 폭탄에만 쓴다.
		-- [시대 일치] 1680년 이전에는 수석식 총 대신 기존 활/석궁 실물 모델만 사용한다.
		if (opts.year or 1517) < 1680 and (style[4] == "flintlock_musket" or style[4] == "flintlock_pistol" or style[4] == "ship_pistol") then
			style = looks.archer[(styleN % 2) + 1]
		end
		local weapon = Weapons.get(style[4])
		-- [병종 전술] 원본 HP·공격력·드롭률은 고정하고 무기에 맞는 공격 준비/거리만 달리한다.
		local individualDef = table.clone(ac.def)
		if weapon.family == "dagger" then
			individualDef.windup *= 0.80
			individualDef.recover *= 0.85
		elseif weapon.family == "axe" or weapon.id == "warhammer" then
			individualDef.windup *= 1.18
			individualDef.recover *= 1.18
		elseif weapon.family == "spear" then
			if not isBoss then individualDef.range = math.max(individualDef.range, 8) end
		elseif weapon.id == "crossbow" then
			individualDef.range = math.min(individualDef.range, weapon.range)
			individualDef.recover *= 1.28
		elseif weapon.family == "explosive" then
			individualDef.range = math.min(individualDef.range, weapon.range)
			individualDef.keepAway = 10
			individualDef.windup = 1.2
			individualDef.recover = 1.85
		elseif weapon.family == "firearm" then
			individualDef.windup *= 1.17
			individualDef.recover *= 1.50
			individualDef.range = math.min(individualDef.range, weapon.range)
		end
		if weapon.family == "bow" then individualDef.range = math.min(individualDef.range, weapon.range) end
		ac.def = individualDef
		-- [몹 역할별 실루엣] 기존 전투 능력은 유지하고 R15 비율·걸음 성격만 다르게 설정한다.
		-- [병종 실루엣] 기존 R15 리그·실제 손 장착 메시 재사용. 키/체형/바지색으로 원거리·투척·방패·돌격을 구분.
		local bodyType = if isBoss or ac.kind == "shield" then "heavy" elseif throwAsset or ac.kind == "archer" then "slim"
			elseif ac.kind == "charger" then "athletic" else "average"
		local motionStyle = if ac.kind == "archer" then "nimble" elseif ac.kind == "shield" or isBoss then "heavy"
			elseif ac.kind == "charger" then "disciplined" else "civilian"
		local stature = if isBoss then 7.6 elseif ac.kind == "shield" then 6.2 elseif ac.kind == "charger" then 6
			elseif throwAsset then 5.35 elseif ac.kind == "archer" then 5.55 else 5.7
		local trousers = if throwAsset then Color3.fromRGB(92, 70, 52)
			elseif ac.kind == "archer" then Color3.fromRGB(55, 76, 60)
			elseif ac.kind == "shield" then Color3.fromRGB(50, 59, 73)
			elseif ac.kind == "charger" then Color3.fromRGB(81, 48, 43)
			elseif isBoss then Color3.fromRGB(53, 41, 41) else Color3.fromRGB(65, 58, 52)
		-- [승인 R15 몹 외형] 기존 적의 병종·시대·무기를 따라 부위별 실물 복식을 선택한다.
		-- 몬스터 원본을 통째로 고정하지 않고 R15 관절·원본 전투 판정은 유지한다.
		local mobProfile = if isBoss then "warlord"
			elseif throwAsset == "bomb" then "bombard"
			elseif weapon.id == "ship_pistol" or weapon.id == "cutlass" then (if styleN % 2 == 0 then "pirate_female" else "pirate")
			elseif ac.kind == "shield" then "knight"
			elseif style[2] == "Barbarian" then "brute"
			elseif style[2] == "Rogue_Hooded" then "rogue"
			elseif ac.kind == "archer" then "ranger"
			else "pirate"
		local mobHat = if mobProfile == "pirate" or mobProfile == "pirate_female" then "tricorn" else nil
		-- [생성 중단 보호] 공식 R15 로딩이 지연되는 동안 철수해도 콜백 오류가 전파되지 않는다.
		local created, model = pcall(Pose.createR15, folder, pos, 0, style[3], rng, if styleN == 1 then def[2] else style[2], stature,
			{ bodyType = bodyType, motionStyle = motionStyle, trousers = trousers, persona = styleN, profession = ac.kind, year = opts.year, hat = mobHat })
		if not created and not finished then
			warn("[MareEssentia] 탐험 적 리그 생성 오류", model)
			model = nil
		end
		if finished or not folder.Parent then
			if created and model and typeof(model) == "Instance" then model:Destroy() end
			return { finish = finish, cancelled = true }
		end
		if not model then
			warn("[MareEssentia] R15 적 모델 생성 불가", def[1])
			continue
		end
		model.Name = "FieldEnemy"
		-- [모바일 최적화] 가까운 선발대·정예·두목 우선으로 메시 복식을 적용한다.
		-- 멀리 있는 일반 적의 원본 R15·무기는 변경하지 않는다.
		if isBoss or not visualMobile or i <= 28 or i % 6 == 0 then
			model:SetAttribute("MobAssetProfile", mobProfile)
			Pose.applyRegisteredMobOutfit(model)
		end
		local root = model:FindFirstChild("HumanoidRootPart")
		if not root then model:Destroy(); continue end
		local bb = Instance.new("BillboardGui")
		bb.Adornee = root
		bb.Size = UDim2.fromOffset(158, 34)
		bb.StudsOffset = Vector3.new(0, 4.5, 0)
		bb.AlwaysOnTop = true
		bb.MaxDistance = if isBoss then 90 else 52
		bb.Parent = root
		local nameColor = if isBoss then Color3.fromRGB(255, 204, 105)
			elseif throwAsset then Color3.fromRGB(255, 178, 103)
			elseif ac.kind == "archer" then Color3.fromRGB(138, 229, 172)
			elseif ac.kind == "shield" then Color3.fromRGB(159, 191, 255)
			elseif ac.kind == "charger" then Color3.fromRGB(255, 130, 118)
			else Color3.fromRGB(240, 223, 194)
		local tag = label(bb, def[1], if isBoss then 16 else 14, nameColor)
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
		model:SetAttribute("FieldDifficultyGrade", math.clamp(danger0, 1, 5))
		model:SetAttribute("EnemyWeaponId", weapon.id)
		model:SetAttribute("EnemyShieldModel", style[5] or "")
		model:SetAttribute("MotionRole", if isBoss then "boss" elseif throwAsset then "thrower" else ac.kind) -- 게임 규칙이 아닌 관절 동작 선택용
		if throwAsset then model:SetAttribute("ThrownAsset", throwAsset) end
		model:SetAttribute("MotionVariant", styleN) -- 복식·전투 몸짓 전용(저장/피해와 무관)
		local isElite = isBoss or ac.kind == "shield" or ac.kind == "charger"
		tag.Text = string.format("[%d단] ", math.clamp(danger0, 1, 5))
			.. (if isBoss then "두목 " elseif isElite then "정예 " else "")
			.. (if throwAsset then "투척 " else "") .. style[1]
		tag.TextSize = if isBoss then 14 else 12
		tag.TextTruncate = Enum.TextTruncate.AtEnd
		local fm = if FM then FM.new(model, false) else nil
		table.insert(enemies, { fm = fm, ac = ac, model = model, root = root, hp = ac.hp, maxHp = ac.def.hp, dmg = ac.def.dmg, speed = ac.def.speed, bar = bar, tag = tag, elite = isElite, weapon = weapon, shieldModel = style[5], throwAsset = throwAsset, moveVel = Vector3.zero, lastDodge = -100, dodgeUntil = 0, nextHit = 0, home = pos, boss = isBoss, swingAt = -10, hurtAt = -10, spawnT = os.clock(), motionPhase = rng:NextNumber(), gait = rng:NextNumber() })
	end

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
				if ch:IsA("BasePart") and string.sub(ch.Name, 1, 9) == "Discovery" then
					place(ch.Position, Color3.fromRGB(255, 214, 120), 8, true)
				elseif ch:IsA("BasePart") and string.sub(ch.Name, 1, 13) == "FieldEvidence" then
					-- [희귀 동물/지식 퀘스트] 추적해야 할 흔적은 미니맵에 청록색으로 표시한다.
					place(ch.Position, Color3.fromRGB(98, 232, 203), 7, true)
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
	local attackBtn = btn(gui, "", Color3.fromRGB(169, 55, 50),
		UDim2.fromOffset(if visualMobile then 112 else 100, if visualMobile then 112 else 100),
		UDim2.new(1, -90, 1, -88), Vector2.new(0.5, 0.5))
	attackBtn.Name = "FieldAttack"
	-- [작은 스마트폰 세로 화면] 왼쪽 이동 패드와 손가락 입력 공간 확보.
	if visualMobile and workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize.X < 450 then
		attackBtn.Position = UDim2.new(1, -74, 1, -74)
		attackBtn.Size = UDim2.fromOffset(104, 104)
	end
	attackBtn:SetAttribute("SkillFullName", "일반 공격")
	attackBtn.Text = ""
	attackBtn.TextSize = 19
	attackBtn:FindFirstChildOfClass("UICorner").CornerRadius = UDim.new(1, 0)
	local attackIcon = addIcon(attackBtn, "Menu/cc0_sword")
	-- [무기별 스킬] 강타·휩쓸기 두 가지만 계산한다. 막기·회피·카드는 별개 행동.
	attackBtn:SetAttribute("WeaponSkillCount", 1)
	local retreat = btn(gui, "철수", Color3.fromRGB(54, 75, 86), UDim2.fromOffset(88, 42), UDim2.new(0, 12, 0, 12), Vector2.new(0, 0))
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
	-- [연타 관절 연결] 한 공격이 끝나기 전에 다음 시각 모션을 시작할 때 R15 실제 마지막 자세를 이어 붙인다.
	-- 신규 애니메이션 트랙/이동 판정 없이 기존 캐논 관절만 보간한다. 최근 프레임 포즈는 테이블을 재사용한다.
	local swingBridge = { last = {}, from = nil, at = 0, duration = 0, basicBeat = 0, basicAt = -100 }
	-- [모션 직업] 기존 캐릭터 FieldDodgeStyle 속성을 입력·렌더 간 정본으로 사용하여 Luau 지역변수 한도를 지킨다.
	local SLASH_IDS = { "W:BLADE_SLASH_R", "W:BLADE_SLASH_L", "W:BLADE_THRUST" }
	-- 주인공 무기: 모든 무기를 쓸 수 있고 버튼으로 바꾼다(동료는 직업별로 고정)

	-- [무기 숙련] 명중 경험치는 전투 밸런스가 아니라 시각 연타 단계에만 적용한다.
	local chainMotionSerial = 0 -- 다음 공격/무기 교체 때 남은 연출을 취소한다.
	local lastMasteryComboAt = -100 -- [연타 절제] 무기 교체로 쿨다운을 우회하지 못하는 탐험 공용 재발동 간격
	local wpn = Weapons.get(opts.weapon or workspace:GetAttribute("DevWeapon") or "sword")
	local weaponRankLabel = label(gui, "숙련 1단", 13, Color3.fromRGB(255, 231, 158))
	weaponRankLabel.Name = "FieldWeaponMastery"
	weaponRankLabel.AnchorPoint = Vector2.new(0.5, 0)
	weaponRankLabel.Position = UDim2.new(1, -90, 1, -34)
	weaponRankLabel.Size = UDim2.fromOffset(114, 22)
	weaponRankLabel.Font = Enum.Font.GothamBlack
	weaponRankLabel.TextStrokeTransparency = 0.16
	weaponRankLabel.ZIndex = attackBtn.ZIndex + 3
	local initialPractice = weaponPractice[wpn.id]
	weaponRankLabel.Text = string.format("무기 숙련 %d단", initialPractice and initialPractice.rank or 1)
	attackBtn:SetAttribute("WeaponMasteryRank", initialPractice and initialPractice.rank or 1)
	attackBtn:SetAttribute("WeaponMasteryExperience", initialPractice and initialPractice.xp or 0)
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
	-- [무기별 실물 R15 모션] 보통 공격은 반드시 1단. 뒤이어 보이는 타격은 숙련 발동시에만 재생한다.
	local function startSwing(kind: string, dur: number, stage: number?, visualOnly: boolean?)
		local nextStage = math.clamp(math.floor(stage or 1), 1, 5)
		-- [연타 교차 보간] 2·3타에서 현재 실제 관절을 남겨 끊기는 팔/허리/발목을 연결한다.
		if FM and nextStage >= 2 and swingKind and next(swingBridge.last) then
			swingBridge.from = table.clone(swingBridge.last)
			swingBridge.at = os.clock()
			swingBridge.duration = if wpn.family == "dagger" or wpn.family == "fist" then 0.075
				elseif wpn.family == "axe" or wpn.family == "blunt" then 0.14
				elseif wpn.ranged then 0.12 else 0.105
		else
			swingBridge.from = nil
		end
		-- [무기별 공격음] 각 승인 오디오의 원본을 사용한다.
		-- 준비/휘두름은 여기서, 투사체 발포는 실제 공격 판정 시 한 번만 재생해 저음이 겹치지 않는다.
		if wpn.ranged and (kind == "slash" or kind == "heavy" or kind == "spin") then
			-- [영화식 속사] 첫 발은 기존 준비음, 이어지는 2·3발은 장전/노리쇠가 아닌 실제 격발음.
			-- 숙련에서 따라 나오는 2·3발은 시각 연출이며 피해 판정은 앞선 한 번만 수행한다.
			if nextStage >= 2 and visualOnly then
				local shotVolume = 0.31
				if wpn.motion == "CROSSBOW" then
					sfx("sfx_card_volley", shotVolume, if nextStage == 2 then 1.43 else 1.58)
				elseif wpn.family == "bow" then
					sfx("sfx_rope_release", shotVolume, if wpn.motion == "LONGBOW" then 1.12 else 1.38)
				elseif wpn.motion == "RIFLE" then
					sfx("sfx_cannon", shotVolume * 0.8, if nextStage == 2 then 1.85 else 1.95)
				else
					sfx("sfx_card_fire", shotVolume, if nextStage == 2 then 1.52 else 1.62)
				end
			elseif nextStage >= 2 then
				-- [실제 연속 평타] 다음 발포음은 기존 공격 판정 시점에서 한 번만 재생한다.
				-- 시위/장전 준비음을 겹치지 않게 하고 몸과 팔은 즉시 다음 사격 자세로 움직인다.
			elseif wpn.motion == "CROSSBOW" then
				sfx("sfx_equipment_wear", 0.28, 1.48)
			elseif wpn.family == "bow" then
				sfx("sfx_rope_pull", 0.25, if wpn.motion == "LONGBOW" then 1.05 else 1.32)
			elseif wpn.motion == "RIFLE" then
				sfx("sfx_cannon_reload", 0.23, 1.62)
			else
				sfx("sfx_card_chain", 0.22, 1.72)
			end
		elseif kind == "dash" then
			sfx("sfx_skill_evade", 0.54, 1.16)
		elseif kind == "guard" then
			sfx("sfx_equipment_wear", 0.45, 1.24)
		elseif string.sub(kind, 1, 4) == "cast" then
			-- 카드 전용 효과는 실제 시전 함수에서 재생한다.
		else
			local heavy = kind == "heavy" or kind == "spin"
			local family = wpn.family
			if family == "dagger" then
				sfx("sfx_boarding_draw", if heavy then 0.47 else 0.34, if heavy then 1.42 else 1.68)
			elseif family == "spear" then
				sfx("sfx_card_blade", if heavy then 0.49 else 0.36, if heavy then 1.34 else 1.58)
			elseif family == "axe" then
				sfx("sfx_boarding_slash", if heavy then 0.52 else 0.40, if heavy then 0.93 else 1.12)
			elseif family == "blunt" then
				sfx("sfx_card_chain", if heavy then 0.48 else 0.36, if heavy then 0.98 else 1.14)
			elseif family == "fist" then
				sfx("sfx_card_swing", if heavy then 0.42 else 0.29, if heavy then 1.12 else 1.38)
			elseif wpn.motion == "RAPIER" then
				sfx("sfx_card_blade", if heavy then 0.45 else 0.30, 1.48) -- 레이피어 찌르기
			elseif wpn.motion == "SABRE" or wpn.motion == "SCIMITAR" or wpn.motion == "KATANA" then
				sfx("sfx_boarding_slash", if heavy then 0.49 else 0.34, 1.30) -- 외날검
			else
				sfx("sfx_boarding_draw", if heavy then 0.49 else 0.35, if heavy then 1.12 else 1.31) -- 양날검
			end
		end
		swingCombo = nil
		if FM then
			local beat = nextStage
			if wpn.family == "fist" then
				-- [마력숲 원본 참조] 잽·크로스·훅 / 승룡 / 회전차기 / 팔꿈치·무릎
				local style = if kind == "heavy" then "UNARMED_UPPERCUT"
					elseif kind == "spin" then "UNARMED_KICK"
					elseif kind == "elbow" then "UNARMED_ELBOW"
					elseif kind == "slash" then "UNARMED_RUSH" else nil
				if style then swingCombo = FM.weaponCombo(style, beat) end
			elseif kind == "heavy" then
				swingCombo = FM.weaponCombo(wpn.motion, Weapons.actionDesign(wpn).heavyBeat) or FM.combo("heavy", { "W:BLADE_OVERHEAD" })
			elseif kind == "spin" then
				swingCombo = FM.weaponCombo(wpn.motion, Weapons.actionDesign(wpn).sweepBeat) or FM.combo("spin", { "W:BLADE_SLASH_R", "W:BLADE_SLASH_L" })
			elseif kind == "slash" then
				swingCombo = FM.weaponCombo(wpn.motion, beat) or FM.combo("slash" .. beat, { SLASH_IDS[(beat - 1) % #SLASH_IDS + 1] })
			end
			dur = Weapons.swingDuration(wpn, dur)
			if kind == "slash" and beat == 1 then
				-- [일반 공격 모션만] 단검이 가장 빠르고 다른 무기는 0.05~0.12초 더 느리게 복귀한다.
				-- 기존 무기 속도/쿨타임/피해/타격 판정/스킬 동작 시간은 유지한다.
				dur = if wpn.family == "dagger" then 0.34
					elseif wpn.family == "fist" then 0.37
					elseif wpn.family == "blade" then 0.39
					elseif wpn.family == "spear" then 0.41
					elseif wpn.id == "crossbow" then 0.46
					elseif wpn.family == "bow" or wpn.family == "firearm" then 0.43
					elseif wpn.family == "axe" or wpn.family == "blunt" then 0.45
					else 0.42
			elseif swingCombo and kind ~= "spin" then
				dur = math.max(dur, swingCombo.duration)
			end
		end
		slashIdx = nextStage
		swingKind, swingT0, swingDur = kind, os.clock(), dur
		local source = player.Character
		if source then
			source:SetAttribute("FieldWeaponMotion", wpn.family .. ":" .. kind .. ":" .. tostring(slashIdx))
		end
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
		-- [직업별 R15 회피] 기본 행동은 그대로, 가드 팔·골반·디딤발 자세를 직업에 따라 구별한다.
		castPoses.dodge = {
			warrior = {
				Spine = A(0.16, 0.22, -0.12), Chest = A(-0.32, -0.20, 0.14),
				UpperArmL = A(-0.74, 0, -0.21), UpperArmR = A(-0.55, 0, 0.26),
				ThighL = A(-0.54, 0, -0.20), ThighR = A(0.34, 0, 0.13), ShinL = A(0.60, 0, 0), FootL = A(0.26, 0, -0.12),
			},
			gunner = {
				Spine = A(0.28, 0.10, -0.13), Chest = A(0.42, -0.15, 0), Head = A(-0.18, 0, 0),
				UpperArmL = A(-0.70, 0, -0.32), UpperArmR = A(-0.92, 0, 0.13),
				ThighL = A(-0.88, 0, -0.11), ThighR = A(0.40, 0, 0.13), ShinL = A(1.05, 0, 0), FootL = A(0.32, 0, 0),
			},
			clergy = {
				-- [성역 도약] 두 팔로 커다란 보호 원을 펼치며 옆으로 몸을 던지고 한 발로 착지한다.
				Spine = A(-0.24, 0.34, 0.32), Chest = A(-0.36, -0.34, -0.28), Head = A(0.18, 0.20, 0),
				UpperArmL = A(-1.28, -0.24, -1.06), UpperArmR = A(-1.32, 0.24, 1.06),
				ForearmL = A(-0.68, 0, 0), ForearmR = A(-0.68, 0, 0),
				HandL = A(-0.30, 0, -0.32), HandR = A(-0.30, 0, 0.32),
				ThighL = A(-0.83, 0, -0.33), ThighR = A(0.65, 0, 0.35),
				ShinL = A(0.94, 0, 0), ShinR = A(-0.22, 0, 0),
				FootL = A(0.46, -0.12, 0), FootR = A(-0.20, 0.12, 0),
			},
			doctor = {
				Spine = A(0.20, -0.10, 0), Chest = A(0.30, 0.12, 0), Head = A(-0.16, 0.06, 0),
				UpperArmL = A(-0.60, 0, -0.25), UpperArmR = A(-0.72, 0, 0.18),
				ThighL = A(-0.62, 0, -0.10), ThighR = A(0.49, 0, 0.11), ShinL = A(0.64, 0, 0),
			},
			navigator = {
				Spine = A(0.60, 0.12, 0), Chest = A(0.48, -0.18, 0), Head = A(-0.32, 0, 0),
				UpperArmL = A(0.88, 0, -0.15), UpperArmR = A(0.88, 0, 0.15),
				ThighL = A(-1.08, 0, 0), ThighR = A(0.65, 0, 0), ShinL = A(1.20, 0, 0), FootL = A(-0.20, 0, 0),
			},
			merchant = {
				Spine = A(0.18, 0.28, 0.10), Chest = A(-0.11, -0.26, -0.12), Head = A(0.05, 0.14, 0),
				UpperArmL = A(-0.38, 0, -0.32), UpperArmR = A(-0.48, 0, 0.28),
				ThighL = A(-0.69, 0, -0.28), ThighR = A(0.40, 0, 0.28), ShinL = A(0.58, 0, 0), FootR = A(0.14, 0, 0.24),
			},
			scholar = {
				-- [지식의 도약] 몸을 깊게 숙이고 한 팔로 머리를 감싼 채 반대 방향으로 크게 비껴뛴다.
				Spine = A(0.65, -0.48, -0.34), Chest = A(0.56, 0.36, 0.26), Head = A(-0.36, 0.30, 0),
				UpperArmL = A(-1.70, -0.16, -0.52), UpperArmR = A(-0.70, 0.32, 0.65),
				ForearmL = A(-1.02, 0, -0.18), ForearmR = A(-0.38, 0, 0),
				HandL = A(-0.22, 0, -0.30), HandR = A(0.24, 0, 0.20),
				ThighL = A(-1.18, 0, -0.36), ThighR = A(0.74, 0, 0.32),
				ShinL = A(1.28, 0, 0), ShinR = A(-0.35, 0, 0),
				FootL = A(0.55, 0, -0.11), FootR = A(-0.32, 0, 0.15),
			},
		}
		-- 몸 전체 움직임(마력숲처럼): 베기는 앞으로 숙이며 파고들고, 강타는 뛰어올라 내리찍고, 회전베기는 낮게 두 바퀴, 회피는 앞구르기
		local function bell(x: number): number return math.sin(math.clamp(x, 0, 1) * math.pi) end
		local function rootFor(kind: string, p: number): CFrame?
			if kind == "slash" then
				-- [원거리 사격 자세] 실제 사격은 몸을 앞으로 날리지 않고 발을 고정한 채 견착·반동만 준다.
				if wpn.ranged then
					local kick = bell(p)
					if slashIdx == 2 then
						-- [원거리 2타] 발을 옆으로 딛으며 상체를 크게 틀고 측면 사격.
						return CFrame.new(-0.36 * kick, -0.18 * kick, 0)
							* CFrame.Angles(-0.16 * kick, 0.44 * kick, -0.20 * kick)
					elseif slashIdx == 3 then
						-- [원거리 3타] 낮은 무릎 슬라이드 후 반대 방향으로 꺾으며 마무리 사격.
						return CFrame.new(0.39 * kick, -0.45 * kick, 0)
							* CFrame.Angles(0.28 * kick, -0.51 * kick, 0.23 * kick)
					end
					return CFrame.new(0, -0.09 * kick, 0) * CFrame.Angles(0.07 * kick, 0, 0)
				end
				-- 일반 공격: 몸을 크게 비틀며 한 걸음 내딛고 벤다(좌우 번갈아)
				local side = if slashIdx % 2 == 0 then 1 else -1
				return CFrame.new(0, -0.25 * bell(p), -1.4 * bell((p - 0.1) / 0.7)) * CFrame.Angles(-0.45 * bell((p - 0.1) / 0.65), 0.45 * side * bell(p), 0.12 * side * bell(p))
			elseif kind == "heavy" then
				if wpn.ranged then return CFrame.new(0, -0.12 * bell(p), 0) * CFrame.Angles(0.10 * bell(p), 0, 0) end
				-- [숙련 3타] 3타는 시각 보조 동작이므로 공중으로 뛰지 않고, 발을 디디며 무게만 싣는다.
				if slashIdx >= 2 then
					local side = if slashIdx % 2 == 0 then 1 else -1
					return CFrame.new(0, -0.25 * bell(p), 0) * CFrame.Angles(0.30 * bell(p), side * 0.20 * bell(p), 0)
				end
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
				if wpn.ranged then return CFrame.new(0, -0.12 * bell(p), 0) * CFrame.Angles(0, 0.12 * bell(p), 0) end
				return CFrame.new(0, -0.5 * bell(p), 0) * CFrame.Angles(0.12, p * math.pi * 4, 0)
			elseif kind == "dash" then
				-- [회피 가중치] 직업 속성을 R15 루트 관절에서도 직접 읽는다. 상위 전투 변수는 추가하지 않는다.
				local dodgeStyle = player.Character and player.Character:GetAttribute("FieldDodgeStyle") or "warrior"
				local press = bell(p)
				if dodgeStyle == "navigator" then
					return CFrame.new(0, -0.36 * press, 0) * CFrame.Angles(-p * math.pi * 2, 0, 0)
				elseif dodgeStyle == "gunner" then
					return CFrame.new(0, -0.48 * press, 0) * CFrame.Angles(-0.22 * press, 0.18 * press, -0.15 * press)
				elseif dodgeStyle == "merchant" then
					return CFrame.new(0, -0.23 * press, 0) * CFrame.Angles(-0.12 * press, 0.30 * press, 0.18 * press)
				elseif dodgeStyle == "clergy" then
					-- 성직자: 부드러운 성역 측면 도약. 원점에서 끝 자세까지 영구 이동하지 않는 관절 오프셋.
					return CFrame.new(1.35 * press, -0.35 * press, 0) * CFrame.Angles(-0.30 * press, 0.42 * press, 0.28 * press)
				elseif dodgeStyle == "scholar" then
					-- 학자: 반대쪽으로 몸을 크게 던지는 저공 비껴뛰기.
					return CFrame.new(-1.55 * press, -0.62 * press, 0) * CFrame.Angles(-0.48 * press, -0.42 * press, -0.35 * press)
				elseif dodgeStyle == "doctor" then
					return CFrame.new(0, -0.32 * press, 0) * CFrame.Angles(0.14 * press, -0.22 * press, 0)
				end
				return CFrame.new(0, -0.30 * press, 0) * CFrame.Angles(-0.24 * press, -0.34 * press, 0)
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
				local elapsed = math.max(0, nowc - hitStopLast)
				if nowc < hitStopUntil then
					swingT0 += elapsed -- 기존 타격 정지는 유지한다. 긴 숙련 슬로모션은 사용하지 않는다.
				end
				hitStopLast = nowc
			end
			if swingKind then
				local p = (os.clock() - swingT0) / swingDur
				if p >= 1 then
					swingKind = nil
				elseif swingCombo then
					-- [타격 순간 고정] 무기별 일반 공격 길이가 달라도 기존 0.14초 적중 시 원본 CONTACT 자세로 맞춘다.
					local progress = p
					if swingKind == "slash" and slashIdx == 1 then
						local contact = math.clamp(swingCombo.steps[1].contact / swingCombo.duration, 0.1, 0.85)
						local impact = math.clamp(0.14 / swingDur, 0.15, 0.75)
						progress = if p < impact then p / impact * contact
							else contact + (p - impact) / (1 - impact) * (1 - contact)
					end
					FM.sample(swingCombo, math.clamp(progress, 0, 1) * swingCombo.duration, canon)
				else
					-- 회피는 짧은 0.4초에도 큰 자세가 충분히 보여야 하므로 극대점 전후 체류를 늘린다.
					local w = if swingKind == "guard" then math.min(1, p * 8) * (1 - math.max(0, (p - 0.85) / 0.15))
						elseif swingKind == "dash" then math.sin(math.clamp(p, 0, 1) * math.pi) ^ 0.72
						else math.sin(math.min(p, 1) * math.pi)
					local src
					if swingKind == "guard" then
						src = FM.combo("slash1", { "W:BLADE_SLASH_R" }).guard
					elseif swingKind == "dash" then
						src = castPoses.dodge[ch:GetAttribute("FieldDodgeStyle") or "warrior"] or castPoses.dodge.warrior
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
			-- [주인공 무기별 지면 접지·손목 반동] 원본 숙련 콤보 뒤에 작은 보조 관절만 합성한다.
			-- 명중 횟수·타격 정지·애니메이션 길이·능력치는 기존 계산을 그대로 사용한다.
			if swingKind and swingCombo then
				local p = math.clamp((os.clock() - swingT0) / swingDur, 0, 1)
				local impulse = math.sin(p * math.pi)
				local settle = math.max(0, (p - 0.57) / 0.43)
				local id = CFrame.identity
				local family = wpn.family
				local thrust = family == "spear" or family == "dagger"
				local heavy = family == "axe" or family == "blunt"
				local range = family == "bow" or family == "firearm"
				local torque = if heavy then 0.20 elseif thrust then 0.08 elseif range then 0.045 else 0.12
				canon.Chest = (canon.Chest or id) * CFrame.Angles(
					if heavy then -0.14 * impulse + 0.09 * settle elseif thrust then -0.12 * impulse else 0.045 * impulse,
					(if range then -0.04 else 1) * torque * impulse, 0)
				canon.HandR = (canon.HandR or id) * CFrame.Angles(
					if heavy then 0.17 * impulse - 0.12 * settle
					elseif family == "firearm" then 0.25 * impulse - 0.14 * settle
					elseif family == "bow" then -0.21 * impulse + 0.18 * settle
					elseif thrust then -0.11 * impulse else 0.09 * impulse, 0, 0)
				if not range then
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.13 * impulse, 0, -0.025 * impulse)
					canon.ShinL = (canon.ShinL or id) * CFrame.Angles(-0.10 * impulse, 0, 0)
					canon.FootL = (canon.FootL or id) * CFrame.Angles(0.09 * impulse, 0, 0)
				else
					-- 활·총기는 발을 고정하고 상체의 순간 반동을 더 크게 보여 준다.
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.08 * impulse, 0, -0.03)
					canon.Head = (canon.Head or id) * CFrame.Angles(0.07 * impulse, 0, 0)
				end
			end
			-- [R15 원거리 견착] 원본 공용 콤보 뒤에 실제 무기별 팔·가슴·손목 정렬만 보정한다.
			-- 석궁은 두 손으로 수평 지지, 활은 한 팔로 밀고 한 팔로 당기며, 화기는 개머리판을 견착한다.
			-- 이동 중에는 어깨를 내려 걷기 모션을 보존한다. 타격·발사 시각·사거리는 기존 전투 함수가 소유한다.
			if wpn.ranged then
				local hum = ch:FindFirstChildOfClass("Humanoid")
				local traveling = hum and hum.MoveDirection.Magnitude > 0.08
				local actionPose = swingKind == "slash" or swingKind == "heavy" or swingKind == "spin"
				local readiness = if actionPose then 0.95 elseif traveling then 0.32 else 0.75
				local firing = actionPose -- 2·3타도 팔과 개머리판에 연속 격발 반동을 부여한다.
				local progress = if firing then math.clamp((os.clock() - swingT0) / math.max(swingDur, 0.05), 0, 1) else 0
				local press = if firing then math.sin(math.clamp(progress / 0.48, 0, 1) * math.pi * 0.5) else 0
				local recoil = if firing then math.sin(math.clamp((progress - 0.35) / 0.34, 0, 1) * math.pi) else 0
				local poseWeight = if firing then 0.65 + 0.35 * press else readiness
				local id = CFrame.identity
				local crossbow = wpn.motion == "CROSSBOW"
				local bow = wpn.family == "bow"
				local longGun = wpn.motion == "RIFLE"
				local pistol = wpn.motion == "PISTOL"
				if crossbow then
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.56 * poseWeight + 0.13 * recoil, 0.08, 0.10)
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.65 * poseWeight, -0.13, -0.11)
					canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.38 * poseWeight + 0.20 * recoil, 0, 0)
					canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.50 * poseWeight, 0, 0)
					canon.HandR = (canon.HandR or id) * CFrame.Angles(0.18 * recoil, 0, 0)
				elseif bow then
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.92 * poseWeight, 0, -0.09)
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.52 * poseWeight - 0.30 * press + 0.28 * recoil, 0.18 * poseWeight, 0.18)
					canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.70 * poseWeight - 0.26 * press + 0.47 * recoil, 0, 0)
				elseif longGun then
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.65 * poseWeight, 0, -0.18)
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.69 * poseWeight + 0.15 * recoil, 0, 0.13)
					canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.42 * poseWeight, 0, 0)
					canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.42 * poseWeight + 0.20 * recoil, 0, 0)
				elseif pistol or wpn.family == "firearm" then
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.80 * poseWeight + 0.20 * recoil, 0, 0.08)
					canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.48 * poseWeight + 0.25 * recoil, 0, 0)
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.21 * poseWeight, 0, -0.12)
				end
				canon.Head = (canon.Head or id) * CFrame.Angles(-0.06 * poseWeight + 0.06 * recoil, 0, 0)
				canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.08 * poseWeight + 0.11 * recoil, 0, 0)
			end
			-- [연타 관성] 무기 프로필별 두 번째/세 번째 시각 동작에 발 디딤과 팔꿈치 회수를 얹는다.
			-- CommonMotion 원본 타격 동작에만 아주 짧은 보정으로 적용, 공격력·속도·사거리에는 영향 없음.
			if swingKind and swingCombo and slashIdx >= 2 then
				local p = math.clamp((os.clock() - swingT0) / math.max(swingDur, 0.05), 0, 1)
				local pulse = math.sin(p * math.pi)
				local side = if slashIdx % 2 == 0 then -1 else 1
				local id = CFrame.identity
				local family = wpn.family
				if family == "dagger" then
					canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.08 * pulse, side * 0.19 * pulse, side * 0.06 * pulse)
					canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.18 * pulse, 0, side * 0.14 * pulse)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.06 * pulse, side * 0.10 * pulse, 0)
				elseif family == "spear" then
					canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.09 * pulse, side * 0.10 * pulse, 0)
					canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.10 * pulse, 0, side * 0.06 * pulse)
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.12 * pulse, 0, -0.04 * pulse)
				elseif family == "axe" or family == "blunt" then
					canon.Chest = (canon.Chest or id) * CFrame.Angles(0.12 * pulse, side * 0.23 * pulse, 0)
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.12 * pulse, 0, -side * 0.08 * pulse)
					canon.FootL = (canon.FootL or id) * CFrame.Angles(0.12 * pulse, 0, side * 0.04 * pulse)
				elseif family == "blade" then
					canon.Chest = (canon.Chest or id) * CFrame.Angles(0, side * 0.16 * pulse, -side * 0.04 * pulse)
					canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.09 * pulse, side * 0.12 * pulse, 0)
				elseif family == "fist" then
					canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.12 * pulse, side * 0.16 * pulse, 0)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(0.12 * pulse, 0, side * 0.06 * pulse)
				elseif wpn.ranged then
					-- [원거리 영화식 2·3연타] 팔·허리·무릎·발끝이 좌우로 번갈아 움직인다.
					-- 실제 충돌체/서버 위치/명중 횟수는 바꾸지 않고 R15 관절만 넓게 흔든다.
					local bow = family == "bow"
					local crossbow = wpn.motion == "CROSSBOW"
					local rifle = wpn.motion == "RIFLE"
					local drop = if slashIdx == 3 then 1 else 0.45
					canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.18 * drop * pulse, side * 0.30 * pulse, -side * 0.12 * pulse)
					canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.12 * pulse, -side * 0.36 * pulse, side * 0.16 * pulse)
					canon.Head = (canon.Head or id) * CFrame.Angles(0.07 * pulse, side * 0.15 * pulse, 0)
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.37 * drop * pulse, 0, -0.11 * pulse)
					canon.ThighR = (canon.ThighR or id) * CFrame.Angles(0.31 * drop * pulse, 0, 0.10 * pulse)
					canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.32 * drop * pulse, 0, 0)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.18 * pulse, 0, side * 0.09 * pulse)
					if bow then
						-- 활: 몸을 크게 열고 시위 팔을 뒤로 빼며 좌우 교차 사격.
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.24 * pulse, 0, -side * 0.20 * pulse)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.34 * pulse, side * 0.26 * pulse, 0)
						canon.HandR = (canon.HandR or id) * CFrame.Angles(0.33 * pulse, 0, side * 0.21 * pulse)
					elseif crossbow then
						-- 석궁: 양손 수평 견착 유지, 측면 빠른 격발과 반동.
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.26 * pulse, -side * 0.14 * pulse, 0)
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.38 * pulse, side * 0.12 * pulse, 0)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(0.29 * pulse, 0, 0)
					elseif rifle then
						-- 장총: 견착한 채 어깨와 허리가 다른 방향으로 역회전.
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.24 * pulse, 0, -0.09 * pulse)
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(0.34 * pulse, side * 0.09 * pulse, 0)
						canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.20 * pulse, 0, 0)
					else
						-- 권총: 한 손을 크게 뻗고 반대손으로 균형을 잡으며 빠른 연사.
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.45 * pulse, 0, side * 0.17 * pulse)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(0.39 * pulse, 0, 0)
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(0.25 * pulse, -side * 0.14 * pulse, 0)
					end
				end
			end
			-- [관절 교량] 2·3타 첫 0.08~0.14초 동안 직전 프레임 자세를 목표 자세까지 스무스스텝으로 잇는다.
			if swingKind and swingBridge.from then
				local weight = math.clamp((os.clock() - swingBridge.at) / swingBridge.duration, 0, 1)
				if weight >= 1 then
					swingBridge.from = nil
				else
					weight = weight * weight * (3 - 2 * weight)
					for joint, old in swingBridge.from do
						if typeof(old) == "CFrame" then
							canon[joint] = old:Lerp(canon[joint] or CFrame.identity, weight)
						end
					end
				end
			end
			-- [프레임 캐시] 공격 중에만 카메라·모션과 독립적인 캐논 관절을 재사용한다.
			table.clear(swingBridge.last)
			if swingKind and swingCombo then
				for joint, cf in canon do
					if typeof(cf) == "CFrame" then swingBridge.last[joint] = cf end
				end
			end
			if swingKind then
				rootRot = rootFor(swingKind, math.clamp((os.clock() - swingT0) / swingDur, 0, 1))
			end
			-- [거대한 회피] 성직자·학자 2.0배, 기타 직업 1.70배. 무기 공격 원래 자세는 1.45배 그대로.
			FM.scale(canon, if swingKind == "dash" then
				(if ch:GetAttribute("FieldDodgeStyle") == "clergy" or ch:GetAttribute("FieldDodgeStyle") == "scholar" then 2.0 else 1.70) else 1.45)
			FM.step(pfm, dt, rootRot, if swingKind == "dash" then 1.85 else nil)
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
		-- [피격음] 낮은 울림을 줄이고 짧고 또렷한 피격음으로 조정한다.
		sfx("sfx_hit", 0.48, 1.25 + math.random() * 0.12)
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
	local function arrowTrail(from: Vector3, to: Vector3, thrownAsset: string?, flightOverride: number?, shotMotion: string?, charged: boolean?)
		if thrownAsset == "stone" or thrownAsset == "jar" or thrownAsset == "bomb" then
			-- [실물 포물선] 실등록된 돌·도기·해적 화약폭탄 메시만 복제한다. 임시 원형 대체 금지.
			local kind = if thrownAsset == "stone" then "Town" else "Relics"
			local asset = if thrownAsset == "stone" then "rock-small" elseif thrownAsset == "bomb" then "weapon-bomb" else "pot"
			local lib = ReplicatedStorage:FindFirstChild("MareAssets")
			local group = lib and lib:FindFirstChild(kind)
			local original = AssetIds[kind .. "/" .. asset] and group and group:FindFirstChild(asset)
			if not (original and original:IsA("Model")) then return end
			local item = original:Clone()
			local pieces = 0
			for _, bp in item:GetDescendants() do
				if bp:IsA("BasePart") then
					bp.Anchored, bp.CanCollide, bp.CanTouch, bp.CanQuery = true, false, false, false
					pieces += 1
				end
			end
			if pieces == 0 then item:Destroy() return end
			local _, ext = item:GetBoundingBox()
			local length = math.max(ext.X, ext.Y, ext.Z)
			if length < 0.01 then item:Destroy() return end
			item:ScaleTo(math.clamp(1.3 / length, 0.08, 3))
			item.Parent = folder
			local started = os.clock()
			local duration = flightOverride or math.clamp((to - from).Magnitude / 75, 0.2, 0.42)
			local move
			move = RunService.Heartbeat:Connect(function()
				if finished or not item.Parent then
					move:Disconnect()
					item:Destroy()
					return
				end
				local t = math.clamp((os.clock() - started) / duration, 0, 1)
				local p = from:Lerp(to, t) + Vector3.new(0, math.sin(t * math.pi) * math.min((to - from).Magnitude * 0.18, 5), 0)
				item:PivotTo(CFrame.new(p) * CFrame.Angles(t * 7, t * 4, t * 3))
				if t >= 1 then
					move:Disconnect()
					item:Destroy()
					burst(to, if thrownAsset == "bomb" then 20 elseif thrownAsset == "jar" then 11 else 5, thrownAsset ~= "stone")
					if thrownAsset == "bomb" then sfx("sfx_naval_cannon", 0.5, 1.4)
					elseif thrownAsset == "jar" then sfx("sfx_card_chain", 0.28, 0.9) end
				end
			end)
			return
		end
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
		-- [실물 사격 궤적] 기존 공용 Beam 두 개 앵커만 사용한다. 시위·석궁 볼트·화기 탄도를 분리한다.
		-- 피해 판정은 FieldScene 원본에서 이미 확정되며 여기서는 빛의 폭·색·이동만 표시한다.
		local bow = shotMotion == "BOW" or shotMotion == "LONGBOW"
		local crossbow = shotMotion == "CROSSBOW"
		local gun = shotMotion == "PISTOL" or shotMotion == "RIFLE"
		local flight = to - from
		local flightDir = if flight.Magnitude > 0.05 then flight.Unit else Vector3.new(0, 0, -1)
		local streakLength = math.min(flight.Magnitude * 0.6, if bow then 3.4 elseif crossbow then 2.7 else 2.2)
		-- [탄두-탄미] 맵 전체를 잇는 고정 빔이 아니라 실제 전진하는 짧은 발광 궤적을 만든다.
		local a0, at0 = anchorAt(from)
		local a1, at1 = anchorAt(from + flightDir * streakLength)
		local beam = Instance.new("Beam")
		beam.Attachment0, beam.Attachment1 = at0, at1
		beam.Width0 = if bow then (if charged then 0.17 else 0.10)
			elseif crossbow then (if charged then 0.13 else 0.08)
			elseif gun then (if charged then 0.24 else 0.16) else 0.26
		beam.Width1 = if bow then 0.025 elseif crossbow then 0.02 elseif gun then 0.045 else 0.08
		beam.Color = if bow then ColorSequence.new(Color3.fromRGB(178, 214, 154), Color3.fromRGB(224, 195, 130))
			elseif crossbow then ColorSequence.new(Color3.fromRGB(188, 213, 228), Color3.fromRGB(243, 226, 173))
			elseif gun then ColorSequence.new(Color3.fromRGB(255, 243, 197), Color3.fromRGB(255, 177, 82))
			else ColorSequence.new(Color3.fromRGB(255, 232, 150), Color3.fromRGB(255, 150, 70))
		beam.LightEmission = if bow then 0.24 elseif crossbow then 0.42 else 0.82
		beam.FaceCamera = true
		beam.Transparency = NumberSequence.new(if bow then 0.26 elseif crossbow then 0.18 else 0.08)
		beam.CurveSize0 = if bow then 0.35 else 0
		beam.Segments = if bow then 5 else 1
		beam.Parent = a0
		-- 탄속: 볼트는 직진, 장궁 화살은 조금 느리고 화승총 탄환은 거의 즉시 화면을 가른다.
		local duration = if shotMotion == "RIFLE" or shotMotion == "PISTOL" then 0.09
			elseif crossbow then 0.13 elseif bow then 0.20 else 0.16
		game:GetService("TweenService"):Create(a0, TweenInfo.new(duration, Enum.EasingStyle.Linear),
			{ Position = to - flightDir * streakLength }):Play()
		game:GetService("TweenService"):Create(a1, TweenInfo.new(duration, Enum.EasingStyle.Linear),
			{ Position = to }):Play()
		task.delay(duration + 0.06, function()
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

	-- [누적 명중 연타 HUD] 숙련 2~3타와 분리한다. 실제 공격 속도·피해·3초 유지 규칙은 변경하지 않는다.
	local comboLabel = label(gui, "", 54, Color3.fromRGB(255, 226, 120))
	comboLabel.Name = "FieldHitStreak"
	comboLabel.AnchorPoint = Vector2.new(0.5, 0.5)
	comboLabel.Position = UDim2.fromScale(0.5, 0.27)
	comboLabel.Size = UDim2.new(0.94, 0, 0, 112)
	comboLabel.TextTransparency = 1
	-- [연타 전용 글꼴] 검증된 Roblox 기본 Bangers 폰트 + 먹색 외곽선. 외부 유료 폰트·이미지 없음.
	comboLabel.Font = Enum.Font.Bangers
	comboLabel.TextStrokeColor3 = Color3.fromRGB(22, 22, 37)
	comboLabel.TextStrokeTransparency = 0.04
	comboLabel.ZIndex = 22
	local comboInfo = label(gui, "", if visualMobile then 17 else 18, Color3.fromRGB(202, 235, 255))
	comboInfo.Name = "FieldStreakRecord"
	comboInfo.AnchorPoint = Vector2.new(0.5, 0.5)
	comboInfo.Position = UDim2.fromScale(0.5, 0.44)
	comboInfo.Size = UDim2.new(0.92, 0, 0, 30)
	comboInfo.TextStrokeColor3 = Color3.fromRGB(15, 22, 30)
	comboInfo.TextStrokeTransparency = 0.06
	comboInfo.Font = Enum.Font.GothamBlack
	comboInfo.ZIndex = 22
	comboInfo.Visible = false
	local comboGauge = Instance.new("Frame")
	comboGauge.Name = "FieldStreakTimer"
	comboGauge.AnchorPoint = Vector2.new(0.5, 0.5)
	comboGauge.Position = UDim2.fromScale(0.5, 0.492)
	comboGauge.Size = UDim2.new(0.46, 0, 0, 9)
	comboGauge.BackgroundColor3 = Color3.fromRGB(23, 32, 45)
	comboGauge.BackgroundTransparency = 0.2
	comboGauge.BorderSizePixel = 0
	comboGauge.ClipsDescendants = true
	comboGauge.Visible = false
	comboGauge.ZIndex = 22
	comboGauge.Parent = gui
	Instance.new("UICorner", comboGauge).CornerRadius = UDim.new(1, 0)
	local comboGaugeFill = Instance.new("Frame")
	comboGaugeFill.Name = "TimeRemaining"
	comboGaugeFill.Size = UDim2.fromScale(1, 1)
	comboGaugeFill.BackgroundColor3 = Color3.fromRGB(95, 226, 203)
	comboGaugeFill.BorderSizePixel = 0
	comboGaugeFill.ZIndex = 23
	comboGaugeFill.Parent = comboGauge
	Instance.new("UICorner", comboGaugeFill).CornerRadius = UDim.new(1, 0)
	local comboToken, comboTween, comboPopTween = 0, nil, nil
	local function showCombo(text: string, milestone: boolean?, accent: Color3?)
		if finished or not comboLabel.Parent then return end
		comboToken += 1
		local token = comboToken
		if comboTween then comboTween:Cancel() end
		if comboPopTween then comboPopTween:Cancel() end
		-- [타격 연출] 숫자/획수가 클 때 스크린을 가리지 않도록 긴 문장만 축소한다.
		local targetSize = if #text > 48 then (if visualMobile then 34 else 42)
			elseif milestone then (if visualMobile then 63 else 76)
			else (if visualMobile then 51 else 60)
		comboLabel.Text = text
		comboLabel.TextSize = targetSize + (if milestone then 19 else 12)
		comboLabel.TextColor3 = accent or (if milestone then Color3.fromRGB(255, 226, 112) else Color3.fromRGB(232, 249, 255))
		comboLabel.TextTransparency = 0
		comboLabel.TextStrokeTransparency = 0.04
		comboLabel.Rotation = if milestone then -6 else (if comboToken % 2 == 0 then 3 else -3)
		comboLabel.Position = UDim2.fromScale(0.5, if milestone then 0.245 else 0.27)
		comboPopTween = TweenService:Create(comboLabel, TweenInfo.new(0.13, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
			TextSize = targetSize, Rotation = 0,
		})
		comboPopTween:Play()
		task.delay(if milestone then 0.75 else 0.43, function()
			if finished or comboToken ~= token or not comboLabel.Parent then return end
			comboTween = TweenService:Create(comboLabel, TweenInfo.new(0.28, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				TextTransparency = 1, TextStrokeTransparency = 1, Position = UDim2.fromScale(0.5, 0.20),
			})
			comboTween:Play()
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

	-- [연타] 광역 공격은 한 번의 공격 행동당 1타만 기록한다. 저장 보상·무기 숙련은 기존 책임 함수에 남긴다.
	local streakN, streakT, streakSpeedBest = 0, 0, 0
	local streakBest = math.floor(math.clamp(tonumber(opts.fieldStreakBest) or 0, 0, 500))
	local streakRecent, streakRecordShown, streakHudAt = {}, false, 0
	local streakActionSeq, streakCountedSeq, streakAttempts, streakLanded = 0, -1, 0, 0
	-- [정확도 경쟁] 무기·광역 타격 범위를 불문하고 공격 행동 1회당 시도/성공 1회만 집계한다.
	local function streakLimit(): number
		return if streakN >= 100 then 1.8 elseif streakN >= 50 then 2.25 else 3
	end
	local function endStreak(reason: string)
		if streakN <= 0 then return end
		local ended = streakN
		streakN = 0
		pl.autoNormalHits = 0
		streakRecordShown = false
		table.clear(streakRecent)
		comboGauge.Visible = false
		comboInfo.Visible = true
		comboInfo.Text = string.format("역대 최고 %d연타 · 이번 최고 %d연타", streakBest, fieldStreakResult.hits)
		if ended >= 5 and not finished then
			showCombo(string.format("%d연타 종료 · %s", ended, reason), false, Color3.fromRGB(215, 229, 240))
			if reason ~= "시간 만료" then sfx("sfx_card_swing", 0.26, 0.84) end
		end
	end
	table.insert(conns, RunService.Heartbeat:Connect(function()
		if finished or streakN == 0 then return end
		local now = os.clock()
		if now < streakHudAt then return end
		streakHudAt = now + 0.05
		local left = streakLimit() - (now - streakT)
		if left <= 0 then endStreak("시간 만료") return end
		comboGauge.Visible = true
		comboGaugeFill.Size = UDim2.fromScale(math.clamp(left / streakLimit(), 0, 1), 1)
		comboGaugeFill.BackgroundColor3 = if left < 0.6 then Color3.fromRGB(255, 114, 91)
			elseif left < 1.2 then Color3.fromRGB(255, 211, 111)
			else Color3.fromRGB(95, 226, 203)
		local gap = streakBest - streakN
		if streakBest >= 25 and gap >= 1 and gap <= 5 then
			comboInfo.Text = string.format("기록 돌파까지 %d타 · 초당 %.1f타", gap + 1, fieldStreakResult.speed)
		elseif streakBest >= 25 and gap == 0 and not streakRecordShown then
			comboInfo.Text = string.format("타이기록 %d연타! · 다음 명중이 신기록", streakBest)
		end
	end))
	-- [연타 축하] 화면 효과·소리는 5타 간격, 핵심 기록 10·25·50·100·200타만 강하게 강조한다.
	local function comboCinema(n: number, isRecord: boolean)
		local _, h0 = char3()
		local precision = if streakAttempts > 0 then streakLanded / streakAttempts else 1
		local qualified = if n >= 200 then precision >= 0.95 elseif n >= 100 then precision >= 0.90
			elseif n >= 50 then precision >= 0.85 elseif n >= 25 then precision >= 0.70 else true
		local spectacular = qualified and (n == 25 or n == 50 or n == 100 or n == 200 or (n > 200 and n % 100 == 0))
		local title = if not qualified then "정밀도 부족" elseif n >= 200 then "신화" elseif n >= 100 then "전설"
			elseif n >= 50 then "폭주" elseif n >= 25 then "질주" elseif n >= 10 then "가속" else "연결"
		local color = if n >= 200 then Color3.fromRGB(255, 155, 231)
			elseif n >= 100 then Color3.fromRGB(255, 115, 102)
			elseif n >= 50 then Color3.fromRGB(255, 218, 107)
			elseif n >= 25 then Color3.fromRGB(187, 150, 255)
			else Color3.fromRGB(112, 214, 255)
		showCombo(string.format("%d연타 · %s%s!", n, title, if isRecord then " · 역대 신기록" else ""), true, color)
		if n >= 10 then screenFlash(color, if visualMobile then 0.90 else (if spectacular then 0.68 else 0.83)) end
		hitStopUntil = math.max(hitStopUntil, os.clock() + (if spectacular then 0.12 else 0.055))
		shakeUntil, shakeAmp = os.clock() + 0.15, if visualMobile then 0.22 else (if spectacular then 0.72 else 0.35)
		if spectacular then
			sfx("sfx_fanfare", if visualMobile then 0.35 else 0.48, 1 + math.min(n, 200) / 350)
		elseif n % 10 == 0 then
			sfx("sfx_card_ring", 0.43, 1 + math.min(n, 100) / 260)
		else
			sfx("sfx_card_chain", 0.22, 1.05)
		end
		if h0 and (n % 10 == 0 or spectacular) then
			shockRing(h0.Position - Vector3.new(0, 2.5, 0), if spectacular then 22 else 12, color, 0.32)
			if spectacular then
				pulseAt("UPGRADE_BURST", h0.CFrame * CFrame.new(0, -1.5, 0), color, Color3.fromRGB(255, 245, 225), 11, if visualMobile then 8 else 16)
				if not visualMobile then afterimage(player.Character, color, 2, 0.055) end
			end
		end
	end
	-- [무기별 2~3연타 막타] 2타는 짧게, 3타는 각 무기에 맞춘 순간 마무리로 차별화한다.
	-- 기존 카메라·사운드·공용 VFX만 사용한다. 추가 발사체 판정·피해·보상·쿨타임은 없다.
	local function masteryCinema(hrp: BasePart, stage: number, defeatedAt: Vector3?)
		if finished or not hrp.Parent or stage < 2 or stage > 3 then return end
		local strong = stage == 3
		local family = wpn.family
		local front = hrp.Position + hrp.CFrame.LookVector * (if wpn.ranged then 10 else 4)
		local target = if typeof(defeatedAt) == "Vector3" and (defeatedAt - hrp.Position).Magnitude <= 40 then defeatedAt else front
		local reach = math.max(7, wpn.range * STUD)
		local color = if family == "fist" then Color3.fromRGB(255, 209, 132)
			elseif family == "dagger" then Color3.fromRGB(120, 243, 205)
			elseif family == "axe" then Color3.fromRGB(255, 144, 90)
			elseif family == "spear" then Color3.fromRGB(126, 224, 245)
			elseif family == "blunt" then Color3.fromRGB(238, 189, 124)
			elseif family == "bow" then Color3.fromRGB(165, 231, 165)
			elseif wpn.id == "crossbow" then Color3.fromRGB(231, 201, 140)
			elseif family == "firearm" then Color3.fromRGB(255, 210, 119)
			else Color3.fromRGB(165, 218, 255)
		local finishName = if family == "fist" then "훅"
			elseif family == "dagger" then "급습"
			elseif family == "axe" then "분쇄"
			elseif family == "spear" then "관통"
			elseif family == "blunt" then "충격"
			elseif family == "bow" then "속사"
			elseif wpn.id == "crossbow" then "관통 사격"
			elseif family == "firearm" then "반동 사격"
			else "교차 베기"
		showCombo(string.format("%s %d연타 · %s!", wpn.name, stage, finishName), strong)
		screenFlash(color, if visualMobile then (if strong then 0.91 else 0.95) else (if strong then 0.81 else 0.91))
		local now = os.clock()
		shakeUntil = math.max(shakeUntil, now + (if strong then 0.14 else 0.07))
		shakeAmp = (if visualMobile then (if strong then 0.14 else 0.06) else (if strong then 0.30 else 0.12))
			* (if family == "axe" or family == "blunt" then 1.25 else 1)
		-- [숙련 연타 마무리] 원거리 격발음은 startSwing에서 발마다 한 번만 재생한다.
		if not wpn.ranged then
			sfx(if family == "dagger" then "sfx_boarding_draw"
				elseif family == "spear" then "sfx_card_blade"
				elseif family == "axe" then "sfx_boarding_slash"
				elseif family == "blunt" then "sfx_metal_clash"
				elseif family == "blade" then "sfx_boarding_slash" else "sfx_card_swing",
				if visualMobile then 0.21 else 0.32, if strong then 1.18 else 1.36)
		end
		if family == "fist" then
			trailsOn(player.Character, { "RightHand", "LeftHand" }, color, 0.11, 0.22)
			shockRing(front - Vector3.new(0, 1.6, 0), if strong then 9 else 5, color, 0.22)
		elseif family == "blade" then
			slashArc(hrp, color, reach, 110, 30)
			if strong then slashArc(hrp, color:Lerp(Color3.new(1, 1, 1), 0.3), reach * 0.85, 100, -35) end
		elseif family == "dagger" then
			slashArc(hrp, color, reach * 0.7, 68, -30)
			if strong and not visualMobile then afterimage(player.Character, color, 2, 0.035) end
		elseif family == "axe" then
			slashArc(hrp, color, reach, 120, -45)
			shockRing(front - Vector3.new(0, 1.6, 0), if strong then 11 else 6, color, 0.26)
		elseif family == "spear" then
			slashArc(hrp, color, reach, 50, 6)
			pulseAt("IMPACT_FLASH", CFrame.new(target), color, Color3.new(1, 1, 1), if strong then 8 else 4, if strong then 7 else 3)
		elseif family == "blunt" then
			shockRing(front - Vector3.new(0, 1.8, 0), if strong then 12 else 7, color, 0.28)
			if strong and not visualMobile then shards(front, 8, color, 4) end
		elseif wpn.ranged then
			-- [영화식 마무리] 다음 시각 탄도는 연타 함수가 1회만 그린다.
			-- 허공 원거리 연출이 실제 적 명중으로 오인되지 않도록 적 위치에는 피해/피격 섬광을 만들지 않는다.
			pulseAt("SHAPE_BURST", hrp.CFrame * CFrame.new(0, 1.2, -3.1), color,
				Color3.fromRGB(250, 249, 227), if strong then 6 else 4, if visualMobile then 3 else 6)
			if strong and not visualMobile then afterimage(player.Character, color, 2, 0.045) end
		end
		-- 3타에서만 짧은 시점 펀치. 4·5타 킬캠과 긴 시간 감속은 제거한다.
		if not strong then return end
		killcamToken += 1
		local token = killcamToken
		local camera = workspace.CurrentCamera
		if not camera then return end
		pcall(function() RunService:UnbindFromRenderStep("FieldMasteryKillcam") end)
		if killcamCamera and killcamCamera.Parent then killcamCamera.FieldOfView = killcamFov end
		killcamCamera = camera
		killcamFov = camera.FieldOfView
		local duration = if visualMobile then 0.14 else 0.19
		local zoom = if visualMobile then 2.2 else 3.8
		RunService:BindToRenderStep("FieldMasteryKillcam", Enum.RenderPriority.Camera.Value + 2, function()
			if finished or token ~= killcamToken or workspace.CurrentCamera ~= camera then
				RunService:UnbindFromRenderStep("FieldMasteryKillcam")
				return
			end
			local progress = math.clamp((os.clock() - now) / duration, 0, 1)
			if progress >= 1 then
				camera.FieldOfView = killcamFov
				RunService:UnbindFromRenderStep("FieldMasteryKillcam")
				return
			end
			local pulse = math.sin(progress * math.pi)
			camera.FieldOfView = killcamFov - zoom * pulse
			if typeof(defeatedAt) == "Vector3" and (defeatedAt - hrp.Position).Magnitude <= 40 then
				local cameraPosition = camera.CFrame.Position
				if (target - cameraPosition).Magnitude > 1 then
					camera.CFrame = camera.CFrame:Lerp(CFrame.lookAt(cameraPosition, target + Vector3.new(0, 2, 0)),
						pulse * (if visualMobile then 0.07 else 0.11))
				end
			end
		end)
	end

	local function strikeEnemy(e, mult: number, hrpPos: Vector3, knock: number, stagger: boolean?, quiet: boolean?, ownerAttack: boolean?, actionSeq: number?, attackerWeapon)
		-- [동료 무기음] 실제 공격자의 장비를 따라가고 피해·보상은 기존 공식 그대로 둔다.
		local impactWeapon = attackerWeapon or wpn
		-- [정예 반응 회피] 공격 중·경직 중에는 발동하지 않으며, 7초 제한으로 무한 회피를 방지한다.
		local evadeAt = os.clock()
		if not quiet and e.elite and not e.ac.dead and (e.ac.state == "chase" or e.ac.state == "recover")
			and evadeAt - (e.lastDodge or -100) >= 7 and math.random() < (if e.boss then 0.12 else 0.22) then
			local away = (e.root.Position - hrpPos) * Vector3.new(1, 0, 1)
			if away.Magnitude > 0.1 then
				local side = Vector3.new(-away.Unit.Z, 0, away.Unit.X) * (if (e.motionPhase or 0) < 0.5 then 1 else -1)
				local target = e.root.Position + side * 4.2
				if math.abs(target.X - ORIGIN.X) < half - 8 and math.abs(target.Z - ORIGIN.Z) < half - 8 then
					e.lastDodge, e.dodgeT0, e.dodgeUntil, e.dodgeDir = evadeAt, evadeAt, evadeAt + 0.3, side
					e.hurtAt = -100
					if e.tag and e.tag.Parent then
						local oldText = e.tag.Text
						e.tag.Text = "회피!"
						task.delay(0.45, function()
							if e.tag and e.tag.Parent and e.tag.Text == "회피!" then e.tag.Text = oldText end
						end)
					end
					burst(e.root.Position + Vector3.new(0, 1.6, 0), 8, false, "dodge")
					sfx("sfx_skill_evade", 0.5, 1.18)
					return
				end
			end
		end
		-- [실물 방패 판정] 등록된 방패가 실제 왼손에 들려 있고 적 정면에서 오는 직접 공격일 때만 방어한다.
		-- 경직, 측면·후방, 광역 피해는 방패에 막히지 않는다. 기존 70% 방어율은 보존한다.
		local approach = (hrpPos - e.root.Position) * Vector3.new(1, 0, 1)
		local shieldBlocked = not quiet and e.shieldModel and e.ac.def.frontGuard
			and e.ac.state ~= "stagger" and approach.Magnitude > 0.1
			and e.root.CFrame.LookVector:Dot(approach.Unit) > 0.35
			and e.model:FindFirstChild("FieldShield") ~= nil
		local dealt, died = AC.damageEnemy(e.ac, BASE_DMG * (if quiet then 1 else wpn.power) * (if os.clock() < (pl.buffUntil or 0) then 1.3 else 1), mult, shieldBlocked == true, stagger)
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
			local hitAt = os.clock()
			hitStopUntil = math.max(hitStopUntil, hitAt + (if mult >= 1.5 then 0.09 else 0.045))
			lastCombatAt = hitAt
			local creditedSeq = actionSeq or streakActionSeq
			if ownerAttack ~= false and creditedSeq > 0 and creditedSeq > streakActionSeq - 64
				and not fieldStreakResult.credited[creditedSeq] then
				-- [빠른 연속 공격] 지연 판정이 겹쳐도 행동별 실제 명중 1회만 기록한다.
				fieldStreakResult.credited[creditedSeq] = true
				streakCountedSeq = math.max(streakCountedSeq, creditedSeq)
				if streakCountedSeq % 64 == 0 then
					for oldSeq in fieldStreakResult.credited do
						if oldSeq < streakCountedSeq - 64 then fieldStreakResult.credited[oldSeq] = nil end
					end
				end
				streakLanded += 1
				if hitAt - streakT > streakLimit() then endStreak("시간 만료") end
				local miracle = streakN >= 10 and (streakLimit() - (hitAt - streakT)) > 0
					and (streakLimit() - (hitAt - streakT)) <= 0.5
				streakN += 1
				streakT = hitAt
				-- [주인공 일반공격만] 동료·광역·자동 스킬 적중은 다음 자동 발동을 쌓지 않는다.
				if creditedSeq == pl.basicAttackSeq then
					pl.autoNormalHits = (pl.autoNormalHits or 0) + 1
					if pl.autoNormalHits % 5 == 0 then
						local owner = player.Character
						if owner then owner:SetAttribute("FieldAutoSkillPending", pl.autoNormalHits) end
					end
				end
				for i = #streakRecent, 1, -1 do
					if hitAt - streakRecent[i] > 1.5 then table.remove(streakRecent, i) end
				end
				table.insert(streakRecent, hitAt)
				local pace = math.min(#streakRecent / 1.5, 12)
				streakSpeedBest = math.max(streakSpeedBest, pace)
				fieldStreakResult.hits = math.max(fieldStreakResult.hits, streakN)
				fieldStreakResult.speed = streakSpeedBest
				fieldStreakResult.accuracy = math.floor(streakLanded / math.max(streakAttempts, 1) * 100 + 0.5)
				local grade = if pace >= 5 then "폭주" elseif pace >= 3 then "질주"
					elseif pace >= 1.5 then "가속" else "연결"
				local accent = if pace >= 5 then Color3.fromRGB(255, 194, 95)
					elseif pace >= 3 then Color3.fromRGB(203, 166, 255)
					elseif pace >= 1.5 then Color3.fromRGB(112, 229, 251)
					else Color3.fromRGB(229, 244, 255)
				local isRecord = streakN >= 25 and streakN > streakBest and not streakRecordShown
				if isRecord then streakRecordShown = true end
				streakBest = math.max(streakBest, streakN)
				comboInfo.Visible = true
				comboInfo.TextColor3 = accent
				-- [속도 읽기] 한글 글자는 고딕 볼드, 숫자는 크고 대비 높은 메달로 표시한다.
				comboInfo.Text = string.format("%s  ·  초당 %.1f타  ·  적중 %d%%  ·  최고 %d연타",
					grade, pace, fieldStreakResult.accuracy, streakBest)
				comboGauge.Visible = true
				comboGaugeFill.Size = UDim2.fromScale(1, 1)
				if miracle then
					sfx("sfx_card_ring", 0.35, 1.4)
					local _, root = char3()
					if root then pulseAt("BUFF_PULSE", root.CFrame * CFrame.new(0, -1.8, 0), accent, Color3.new(1, 1, 1), 5, if visualMobile then 3 else 6) end
				end
				if streakN % 5 == 0 then
					comboCinema(streakN, isRecord)
				elseif miracle and not isRecord then
					showCombo(string.format("%d연타 · 기적의 연결!", streakN), true, accent)
				else
					showCombo(string.format("%d연타 · %s%s", streakN, grade, if isRecord then " · 역대 신기록!" else ""), isRecord, accent)
					if isRecord then sfx("sfx_card_ring", 0.52, 1.24) end
				end
			end
		end
		-- [무기 타격감] 동일 피해·보상은 유지하고 원본 사운드·이펙트만 무기별로 차별화한다.
		local impactPos = e.root.Position + Vector3.new(0, 2, 0)
		local family = impactWeapon.family
		local rangedImpact = impactWeapon.ranged and (family == "bow" or family == "firearm")
		-- [맞는 재질감] 화살/볼트/총알 명중은 둔탁한 파열 대신 작은 타격 섬광만 사용한다.
		if not rangedImpact then
			burst(impactPos, if visualMobile then math.min(12 + dealt, 20) else 12 + dealt, mult >= 1.5)
		end
		if shieldBlocked then
			sfx("sfx_metal_clash", 0.75, 0.93)
			pulseAt("BLOCK_IMPACT", CFrame.new(impactPos), Color3.fromRGB(155, 194, 224), Color3.fromRGB(255, 230, 161), 7, 5)
		elseif family == "axe" then
			-- [도끼 적중] 둔탁한 작업장 도끼질 대신 짧은 칼날 절삭음.
			sfx("sfx_boarding_slash", if quiet then 0.20 else 0.48, 1.16)
			if not visualMobile then shockRing(impactPos - Vector3.new(0, 2, 0), 7, Color3.fromRGB(246, 169, 100), 0.18) end
		elseif family == "blunt" then
			-- [철퇴 적중] 묵직한 목재 타격 대신 금속 징 소리의 어택 부분만 사용한다.
			sfx("sfx_metal_clash", if quiet then 0.19 else 0.38, 1.37)
		elseif family == "spear" then
			sfx("sfx_card_blade", 0.55, 1.33)
			pulseAt("IMPACT_FLASH", CFrame.new(impactPos), Color3.fromRGB(155, 229, 248), Color3.new(1, 1, 1), 5, 4)
		elseif family == "dagger" then
			sfx("sfx_card_blade", 0.46, 1.5)
		elseif impactWeapon.motion == "CROSSBOW" then
			-- [석궁 적중] 격발과 겹치는 화기 소리를 없애고 짧은 쇠 볼트 접촉음만 사용한다.
			sfx("sfx_card_chain", if quiet then 0.16 else 0.29, 1.65)
		elseif family == "bow" then
			sfx("sfx_card_blade", if quiet then 0.14 else 0.27, 1.75)
		elseif family == "firearm" then
			-- [총탄 적중] 발포음은 사격 함수에서 한 번, 접촉음은 가벼운 금속성 잔향만 출력한다.
			sfx("sfx_card_ring", if quiet then 0.14 else 0.23, 1.65)
		elseif family == "fist" then
			sfx("sfx_card_swing", if quiet then 0.20 else 0.44, 1.27)
		elseif impactWeapon.motion == "RAPIER" then
			sfx("sfx_card_blade", if quiet then 0.18 else 0.40, 1.52)
		elseif impactWeapon.motion == "SABRE" or impactWeapon.motion == "SCIMITAR" or impactWeapon.motion == "KATANA" then
			sfx("sfx_boarding_slash", if quiet then 0.22 else 0.43, 1.43)
		else
			-- [양날검] 목제 타격음 없이 금속 날 끝의 짧은 충돌음을 선택한다.
			sfx("sfx_boarding_draw", if quiet then 0.20 else 0.42, 1.34)
		end
		-- 치명타 금속음 중복을 없앤다. 타격별로 고유 오디오를 한 번만 재생한다.
		if rangedImpact and not shieldBlocked then
			local tint = if impactWeapon.motion == "CROSSBOW" then Color3.fromRGB(186, 215, 230)
				elseif family == "bow" then Color3.fromRGB(175, 221, 152)
				else Color3.fromRGB(255, 216, 145)
			pulseAt("IMPACT_FLASH", CFrame.new(impactPos), tint, Color3.fromRGB(246, 241, 212),
				if mult >= 1.5 then 5 else 3, if visualMobile then 2 else 4)
		end
		flashHit(e.model)
		popDamage(e.model, dealt, mult >= 1.5)
		do
			local crit = mult >= 1.5
			local c = if crit then Color3.fromRGB(255, 205, 80) else Color3.fromRGB(190, 230, 255)
			if not rangedImpact then
				shards(e.root.Position + Vector3.new(0, 1.5, 0), if crit then 14 else 7, c, if crit then 7 else 4)
				if crit then shockRing(e.root.Position - Vector3.new(0, e.root.Size.Y * 0.5 + 1.5, 0), 9, c, 0.35) end
			end
		end
		-- 타격 멈춤(적이 잠깐 굳음)과 시야 펀치로 손맛을 준다
		e.holdUntil = os.clock() + (if rangedImpact then (if mult >= 1.5 then 0.05 else 0.025)
			elseif mult >= 1.5 then 0.12 elseif impactWeapon.family == "axe" or impactWeapon.family == "blunt" then 0.085
			elseif impactWeapon.family == "dagger" then 0.04 else 0.06)
		local punchCam = workspace.CurrentCamera
		if punchCam and not quiet then
			punchCam.FieldOfView = 70 - (if rangedImpact then (if mult >= 1.5 then 1.4 else 0.6)
				elseif mult >= 1.5 then 5 else 2)
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
		return true -- 정예 회피로 빗나간 경우에만 nil을 돌려준다.
	end

	-- [무기 외형] 등록된 실제 3D 메시만 사용한다. 늦게 도착한 모델도 기존 장착 함수로 갱신한다.
	-- 기존 무기·동료 데이터와 무관한 클라이언트 연출만 교체한다. 전투 수치·저장키는 수정하지 않는다.
	-- [실물 장비] 주인공/동료/적이 같은 검증된 Relics 메시를 공유한다. 오른손 무기, 왼손 실제 방패.
	local function equipFieldWeapon(character, weapon, shieldModel, thrownAsset: string?)
		if not character or not weapon then return end
		local prev = character:FindFirstChild("FieldWeapon") or character:FindFirstChild("FieldSword")
		if prev then prev:Destroy() end
		local previousShield = character:FindFirstChild("FieldShield")
		if previousShield then previousShield:Destroy() end
		character:SetAttribute("EquippedWeaponId", weapon.id)
		character:SetAttribute("EquippedWeaponName", weapon.name)
		character:SetAttribute("EquippedShieldModel", shieldModel or "")
		character:SetAttribute("EquippedThrownAsset", thrownAsset or "")
		character:SetAttribute("WeaponVisualSource", "unarmed")
		if weapon.family == "fist" and not shieldModel and not thrownAsset then return end
		local rightHand = character:FindFirstChild("RightHand") or character:FindFirstChild("Right Arm")
		local leftHand = character:FindFirstChild("LeftHand") or character:FindFirstChild("Left Arm")
		local lib = ReplicatedStorage:FindFirstChild("MareAssets")
		local group = lib and lib:FindFirstChild("Relics")
		local items = {}
		if thrownAsset then
			-- [실물 투척병] 손에 든 돌/도기/폭탄과 날아가는 동일 모델을 쓴다.
			table.insert(items, { modelName = if thrownAsset == "stone" then "rock-small" elseif thrownAsset == "bomb" then "weapon-bomb" else "pot",
				kind = if thrownAsset == "stone" then "Town" else "Relics", hand = rightHand, shield = false, throwable = true })
		end
		if weapon.family ~= "fist" and not (thrownAsset == "bomb" and weapon.family == "explosive") then
			table.insert(items, { modelName = weapon.model, hand = rightHand, shield = false })
		end
		if shieldModel then
			table.insert(items, { modelName = shieldModel, hand = leftHand, shield = true })
		end
		local complete = true
		for _, item in items do
			local modelName = item.modelName
			local hand = item.hand
			local assetKind = item.kind or "Relics"
			local assetGroup = if assetKind == "Relics" then group else (lib and lib:FindFirstChild(assetKind))
			local registeredId = modelName and AssetIds[assetKind .. "/" .. modelName]
			local tpl = registeredId and assetGroup and assetGroup:FindFirstChild(modelName)
			if not (hand and hand:IsA("BasePart") and tpl and tpl:IsA("Model")) then
				complete = false
				continue
			end
			local held = tpl:Clone()
			held.Name = if item.shield then "FieldShield" elseif weapon.id == "sword" then "FieldSword" else "FieldWeapon"
			local count = 0
			for _, bp in held:GetDescendants() do
				if bp:IsA("BasePart") then
					count += 1
					bp.Anchored, bp.CanCollide, bp.CanTouch, bp.CanQuery = false, false, false, false
					bp.Massless = true
					-- [무기 실사 재질] 이미 등록된 GLB의 표면외형/PBR·텍스처 맵은 최우선으로 보존한다.
					-- 지도 없는 메시의 손잡이·총열·검날·시위·방패 테두리만 재질과 빛 반사량으로 구별한다.
					-- 부품을 새로 추가하거나 게임 속성·무기 밸런스를 변경하지 않는다.
					local preservedPbr = bp:FindFirstChildOfClass("SurfaceAppearance") ~= nil
					local preservedTexture = bp:IsA("MeshPart") and bp.TextureID ~= ""
					if not preservedPbr and not preservedTexture then
						local name = string.lower(bp.Name)
						local handle = name:find("handle", 1, true) or name:find("grip", 1, true)
							or name:find("hilt", 1, true) or name:find("shaft", 1, true)
						local stock = name:find("stock", 1, true) or name:find("wood", 1, true)
						local edge = name:find("blade", 1, true) or name:find("edge", 1, true)
							or name:find("sword", 1, true) or name:find("cutlass", 1, true)
						local iron = name:find("barrel", 1, true) or name:find("lock", 1, true)
							or name:find("hammer", 1, true) or name:find("muzzle", 1, true)
							or name:find("axehead", 1, true) or name:find("bolt", 1, true)
						local guard = name:find("guard", 1, true) or name:find("pommel", 1, true)
							or name:find("rivet", 1, true) or name:find("rim", 1, true)
						local stringPart = name:find("string", 1, true) or name:find("fuse", 1, true)
							or name:find("cord", 1, true)
						local family = weapon.family
						local material, tint, reflectance
						if item.throwable and thrownAsset == "stone" then
							material, tint, reflectance = Enum.Material.Slate, Color3.fromRGB(111, 106, 100), 0
						elseif item.throwable and thrownAsset == "bomb" then
							-- 17세기 화약폭탄은 거울 광택이 아니라 검게 산화된 철피·짧은 심지로 표현한다.
							material = if stringPart then Enum.Material.Fabric else Enum.Material.CorrodedMetal
							tint = if stringPart then Color3.fromRGB(174, 156, 116) else Color3.fromRGB(62, 65, 62)
							reflectance = if stringPart then 0 else 0.012
						elseif item.throwable then
							material, tint, reflectance = Enum.Material.SmoothPlastic, Color3.fromRGB(137, 111, 81), 0
						elseif item.shield then
							-- 방패 표면은 옻칠 목재/가죽, 쇠테·리벳만 무광 강철로 구별한다.
							if guard or iron then
								material, tint, reflectance = Enum.Material.Metal, Color3.fromRGB(122, 127, 124), 0.025
							elseif handle then
								material, tint, reflectance = Enum.Material.Leather, Color3.fromRGB(74, 55, 42), 0
							else
								material = if modelName == "shield-rectangle" then Enum.Material.Metal else Enum.Material.Wood
								tint = if modelName == "shield-rectangle" then Color3.fromRGB(93, 101, 106) else Color3.fromRGB(112, 82, 55)
								reflectance = if modelName == "shield-rectangle" then 0.022 else 0
							end
						elseif stringPart then
							material, tint, reflectance = Enum.Material.Fabric, Color3.fromRGB(186, 167, 131), 0
						elseif handle then
							material, tint, reflectance = Enum.Material.Leather, Color3.fromRGB(77, 55, 38), 0
						elseif stock or (family == "bow" and not edge and not iron) or (weapon.id == "crossbow" and not edge and not iron and not guard) or (family == "spear" and not edge and not iron) then
							material, tint, reflectance = Enum.Material.Wood, Color3.fromRGB(116, 84, 52), 0
						elseif edge then
							material, tint, reflectance = Enum.Material.Metal, Color3.fromRGB(172, 182, 187), 0.055
						elseif guard then
							material, tint, reflectance = Enum.Material.Metal, Color3.fromRGB(142, 121, 80), 0.032
						elseif iron or family == "firearm" then
							material, tint, reflectance = Enum.Material.Metal, Color3.fromRGB(95, 104, 110), 0.035
						elseif family == "axe" or family == "blunt" or family == "blade" or family == "dagger" then
							material, tint, reflectance = Enum.Material.Metal, Color3.fromRGB(150, 159, 164), 0.04
						else
							material, tint, reflectance = Enum.Material.Wood, Color3.fromRGB(119, 86, 55), 0
						end
						bp.Material, bp.Reflectance = material, reflectance
						-- 원본에 색이 있으면 최대한 남기고, 색 없는 회백색 메시만 소재에 맞춰 보정한다.
						local light = math.max(bp.Color.R, bp.Color.G, bp.Color.B)
						local chroma = light - math.min(bp.Color.R, bp.Color.G, bp.Color.B)
						local influence = if light > 0.74 and chroma < 0.12 then 0.78 else 0.13
						bp.Color = bp.Color:Lerp(tint, influence)
					end
				end
			end
			if count == 0 then
				complete = false
				held:Destroy()
				continue
			end
			local bb, ext = held:GetBoundingBox()
			local longest = math.max(ext.X, ext.Y, ext.Z)
			local targetLength = if item.shield then (if modelName == "shield-rectangle" then 3.1 else 2.5)
				elseif item.throwable then 1.25
				elseif weapon.family == "dagger" then 1.8
				elseif weapon.family == "bow" then 3.5
				elseif weapon.family == "spear" then 4.6
				elseif weapon.family == "axe" or weapon.family == "blunt" then 3.1
				elseif weapon.family == "firearm" then (if weapon.motion == "PISTOL" then 2.0 else 3.7)
				else 3.3
			if longest > 0.05 then pcall(function() held:ScaleTo(targetLength / longest) end) end
			held.Parent = character
			bb, ext = held:GetBoundingBox()
			local ax = if item.shield then (if ext.X <= ext.Y and ext.X <= ext.Z then bb.RightVector
				elseif ext.Y <= ext.Z then bb.UpVector else bb.LookVector)
				else (if ext.X >= ext.Y and ext.X >= ext.Z then bb.RightVector
				elseif ext.Y >= ext.Z then bb.UpVector else bb.LookVector)
			local fwd = if item.shield then character:GetPivot().LookVector else hand.CFrame.LookVector
			local cross = ax:Cross(fwd)
			local rotation = if cross.Magnitude < 1e-4
				then (if ax:Dot(fwd) > 0 then CFrame.identity else CFrame.fromAxisAngle(hand.CFrame.UpVector, math.pi))
				else CFrame.fromAxisAngle(cross.Unit, math.acos(math.clamp(ax:Dot(fwd), -1, 1)))
			local len = math.max(ext.X, ext.Y, ext.Z)
			local newBB = CFrame.new(hand.Position + fwd * (if item.shield then 0.55 else len * 0.35)
				- hand.CFrame.UpVector * (if item.shield then 0 else 0.3)) * (rotation * bb.Rotation)
			held:PivotTo(newBB * bb:ToObjectSpace(held:GetPivot()))
			for _, bp in held:GetDescendants() do
				if bp:IsA("BasePart") then
					local weld = Instance.new("WeldConstraint")
					weld.Part0, weld.Part1, weld.Parent = hand, bp, bp
				end
			end
		end
		character:SetAttribute("WeaponVisualSource", if complete then "registered" else "asset_pending")
	end
	-- [실물 무기 지연 로드] Relics는 항구 모델보다 늦게 로드되므로, 도착한 승인 모델만 재장착한다.
	-- 플레이어/동료의 기존 무기 ID와 전투 수치, 저장 구조는 유지한다.
	-- [실물 무기·방패 지연 로드] 실제 메시가 뒤늦게 도착하면 해당 장비가 필요한 배우만 갱신한다.
	local assetLibrary = ReplicatedStorage:FindFirstChild("MareAssets")
	local relicGroup = assetLibrary and assetLibrary:FindFirstChild("Relics")
	if relicGroup then
		table.insert(conns, relicGroup.ChildAdded:Connect(function(asset)
			if not asset:IsA("Model") or not (string.match(asset.Name, "^weapon%-") or string.match(asset.Name, "^shield%-") or asset.Name == "pot")
				or not AssetIds["Relics/" .. asset.Name] then return end
			task.defer(function()
				local deadline = os.clock() + 5
				while asset.Parent == relicGroup and not asset:FindFirstChildWhichIsA("BasePart", true)
					and os.clock() < deadline and not finished do
					task.wait(0.1)
				end
				if finished or not folder.Parent or not asset:FindFirstChildWhichIsA("BasePart", true) then return end
				local character = player.Character
				if character and character:GetAttribute("WeaponVisualSource") == "asset_pending" then
					local id = character:GetAttribute("EquippedWeaponId")
					local shieldName = character:GetAttribute("EquippedShieldModel")
					if type(id) == "string" then
						local weapon = Weapons.get(id)
						if weapon.model == asset.Name or shieldName == asset.Name then
							equipFieldWeapon(character, weapon, if shieldName ~= "" then shieldName else nil)
						end
					end
				end
				for _, characterModel in folder:GetDescendants() do
					if characterModel:IsA("Model") and characterModel:GetAttribute("WeaponVisualSource") == "asset_pending" then
						local id = characterModel:GetAttribute("EquippedWeaponId")
						local shieldName = characterModel:GetAttribute("EquippedShieldModel")
						local thrownName = characterModel:GetAttribute("EquippedThrownAsset")
						if type(id) == "string" then
							local weapon = Weapons.get(id)
							if weapon.model == asset.Name or shieldName == asset.Name
								or (asset.Name == "pot" and thrownName == "jar") or (asset.Name == "weapon-bomb" and thrownName == "bomb") then
								equipFieldWeapon(characterModel, weapon, if shieldName ~= "" then shieldName else nil,
									if thrownName ~= "" then thrownName else nil)
							end
						end
					end
				end
			end)
		end))
	end
	-- [늦게 로드된 R15 몹 자산] 기존 MareAssets.People 도착 이벤트로 복식만 재연결한다.
	-- R15 모터·움직임·HP·사거리·드롭·저장 키에는 손대지 않는다.
	local peopleGroup = assetLibrary and assetLibrary:FindFirstChild("People")
	if peopleGroup then
		table.insert(conns, peopleGroup.ChildAdded:Connect(function(asset)
			if not asset:IsA("Model") or not AssetIds["People/" .. asset.Name] then return end
			task.defer(function()
				if finished or not folder.Parent then return end
				for _, enemy in enemies do
					if enemy.model.Parent and enemy.model:GetAttribute("MobAppearanceState") ~= "ready"
						and enemy.model:GetAttribute("MobAssetProfile") then
						Pose.applyRegisteredMobOutfit(enemy.model)
					end
				end
			end)
		end))
	end
	-- [몬스터 무기·방패] 기존 적을 생성한 뒤 승인된 실물 메시를 손에 장착한다.
	for _, enemy in enemies do
		if enemy.model and enemy.model.Parent and enemy.weapon then
			equipFieldWeapon(enemy.model, enemy.weapon, enemy.shieldModel, enemy.throwAsset)
		end
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

	local function explodeBarrel(b, hrp: BasePart, hitActionSeq: number?)
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
				strikeEnemy(e, 3, b.pos, 6, true, nil, nil, hitActionSeq)
				n += 1
			end
		end
		if (hrp.Position - b.pos).Magnitude <= 8 then
			local dealt = AC.takeHit(pl, 8, os.clock(), nil)
			if dealt > 0 then
				lastCombatAt = os.clock()
				endStreak("피격")
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
			-- [실제 직업 → 모션] 직업 우선, 게임에 직업 정보가 없는 구버전은 장비와 마력으로 자세만 추정한다.
			-- 회피 거리는 원래 14스터드, 무적과 스태미나 판정은 기존 ActionCombat이 전담한다.
			local ch0 = player.Character
			local profession = opts.heroProfession or opts.heroJob or opts.profession or opts.job
				or (ch0 and (ch0:GetAttribute("Profession") or ch0:GetAttribute("Job")))
			if type(profession) ~= "string" or profession == "" then
				-- [구버전 호환] 별도 직업값이 없다면 기존 실제 카드 특성으로 학자/성직자만 구별한다.
				local study, care = false, false
				for _, card in opts.cardSkills or {} do
					if card.skill == "read" or card.skill == "snipe" then study = true end
					if card.skill == "heal" or card.skill == "ward" or card.skill == "armor" then care = true end
				end
				profession = if study and not care then "학자"
					elseif magicUser then "성직자" elseif wpn.family == "dagger" then "항해사"
					elseif wpn.ranged then "포수" else "무인"
			end
			local dodgeStyle = JobSkills.categoryOf(profession)
			if ch0 then ch0:SetAttribute("FieldDodgeStyle", dodgeStyle) end
			local dodgeOrigin = hrp.CFrame
			local look = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
			if look.Magnitude > 0.1 then
				hrp.CFrame = hrp.CFrame + look.Unit * 14
			end
			-- [직업별 거대 회피 이펙트] 기존 공용 VFX만 사용. 회피 거리·명중·무적·쿨타임 불변.
			burst(hrp.Position, if dodgeStyle == "clergy" or dodgeStyle == "scholar"
				then (if visualMobile then 22 else 32) else 24, false, "dodge")
			do
				local ch0 = player.Character
				if dodgeStyle == "clergy" then
					-- 성직자: 시작 지점 성역 빛 고리 → 커다란 황금 보호파 → 두 팔에서 뻗는 빛줄기와 잔상.
					local gold = Color3.fromRGB(252, 218, 125)
					local pearl = Color3.fromRGB(244, 242, 255)
					trailsOn(ch0, { "LeftHand", "RightHand", "LeftLowerArm", "RightLowerArm", "LeftLowerLeg", "RightLowerLeg" },
						gold, 0.46, 0.75)
					auraOn(ch0, Color3.fromRGB(255, 219, 143), pearl, 0.65)
					afterimage(ch0, gold, if visualMobile then 2 else 5, 0.065)
					pulseAt("DODGE_EVASION_PULSE", dodgeOrigin * CFrame.new(0, -2.4, 0),
						gold, pearl, if visualMobile then 11 else 15, if visualMobile then 7 else 14)
					pulseAt("BLOCK_IMPACT", hrp.CFrame * CFrame.new(0, -2.1, 0),
						Color3.fromRGB(255, 231, 173), pearl, if visualMobile then 13 else 18, if visualMobile then 8 else 17)
					task.delay(0.18, function()
						if finished or not hrp.Parent then return end
						pulseAt("HEAL_PULSE", hrp.CFrame * CFrame.new(0, -2.2, 0),
							gold, pearl, if visualMobile then 10 else 15, if visualMobile then 5 else 12)
					end)
				elseif dodgeStyle == "scholar" then
					-- 학자: 시작 지점 청록 지식 원 → 푸른 대각선 잔상 → 착지 시 별빛 파동.
					local cyan = Color3.fromRGB(94, 228, 239)
					local blue = Color3.fromRGB(178, 185, 255)
					trailsOn(ch0, { "LeftHand", "RightHand", "LeftLowerArm", "RightLowerArm", "LeftFoot", "RightFoot" },
						cyan, 0.48, 0.78)
					auraOn(ch0, Color3.fromRGB(116, 180, 255), cyan, 0.66)
					afterimage(ch0, cyan, if visualMobile then 3 else 6, 0.06)
					pulseAt("UPGRADE_BURST", dodgeOrigin * CFrame.new(0, -2.1, 0),
						cyan, blue, if visualMobile then 10 else 15, if visualMobile then 7 else 15)
					pulseAt("DODGE_EVASION_PULSE", hrp.CFrame * CFrame.new(0, -2.3, 0),
						Color3.fromRGB(116, 198, 255), cyan, if visualMobile then 14 else 19, if visualMobile then 9 else 19)
					task.delay(0.17, function()
						if finished or not hrp.Parent then return end
						pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(0, -0.5, 0),
							blue, cyan, if visualMobile then 6 else 10, if visualMobile then 4 else 9)
					end)
				else
					trailsOn(ch0, TRAIL_LIMBS, Color3.fromRGB(82, 204, 255), 0.42, 1.2)
					auraOn(ch0, Color3.fromRGB(96, 181, 255), Color3.fromRGB(244, 218, 147), 0.9)
					afterimage(ch0, Color3.fromRGB(110, 205, 255), 4, 0.05)
					for i, dl in { 0.02, 0.2 } do
						task.delay(dl, function()
							if finished or not hrp.Parent then return end
							pulseAt("DODGE_EVASION_PULSE", hrp.CFrame * CFrame.new(0, -2.4, 0),
								if i == 1 then Color3.fromRGB(117, 214, 255) else Color3.fromRGB(255, 210, 127),
								Color3.fromRGB(239, 249, 255), 7, 10)
						end)
					end
				end
			end
			startSwing("dash", 0.4)
			say("회피! 잠깐 무적")
			return
		end
		-- [공격 1회 = 연타 최대 1타] 대시 회피는 공격으로 집계하지 않는다.
		streakActionSeq += 1
		streakAttempts += 1
		lastCombatAt = now
		-- [원거리 조준 보조] 활·석궁·총은 실제 무기 사거리까지 탐색하고, 근접 무기만 기존 40스터드를 쓴다.
		-- 전진 돌진을 원거리 사격에 적용하지 않는다. 정면에서 가장 가까운 살아 있는 적을 바라본다.
		do
			local near, nd = nil, if wpn.ranged then wpn.range * STUD + 3 else 40
			for _, e in enemies do
				if not e.ac.dead and e.root and e.root.Parent then
					local d = ((e.root.Position - hrp.Position) * Vector3.new(1, 0, 1)).Magnitude
					if d < nd then near, nd = e, d end
				end
			end
			if near then
				local flat = (near.root.Position - hrp.Position) * Vector3.new(1, 0, 1)
				if flat.Magnitude > 0.1 then
					local reach = (if moveId == "rush" then wpn.range else (AC.Moves[moveId] and AC.Moves[moveId].range or 5)) * STUD
					local lunge = if not wpn.ranged and nd > reach - 2 then math.min(nd - (reach - 3), 10) else 0
					hrp.CFrame = CFrame.lookAt(hrp.Position + flat.Unit * math.max(0, lunge), hrp.Position + flat.Unit * math.max(0, lunge) + flat.Unit)
				end
			end
		end
		-- [연타 무조건 발동 금지] ActionCombat의 공용 기본 3타 규칙은 유지하고
		-- 이 탐험에서만 기본 공격을 항상 단타로 처리한다. 숙련 연타는 명중 뒤 별도로 추첨한다.
		if moveId == "rush" then
			chainMotionSerial += 1
			pl.basicAttackSeq = streakActionSeq
			pl.combo = 0
			pl.lastHit = -100
			mult = 1
			slashIdx = 0
		end
		local combo0 = pl.combo
		local kind = if moveId == "sweep" then "spin" elseif moveId == "heavy" then "heavy" else "slash"
		-- [평타 1→2→3] 원거리 무기는 빠르게 반복 터치할 때 매 발마다 다른 영화식 사격 자세로 이어진다.
		-- 숙련 추가 타격이 아니며 원본 공격 수·피해·사거리·재사용시간은 그대로 유지한다.
		local basicBeat = 1
		if wpn.ranged and moveId == "rush" then
			local pressedAt = os.clock()
			basicBeat = if pressedAt - swingBridge.basicAt <= 1.1 then swingBridge.basicBeat % 3 + 1 else 1
			swingBridge.basicBeat, swingBridge.basicAt = basicBeat, pressedAt
		end
		startSwing(kind, if kind == "spin" then 0.6 elseif kind == "heavy" then 0.7 else 0.4, basicBeat)
		do
			local reachV = (mv.range or 5) * STUD
			do
				local ch0 = player.Character
				if wpn.ranged then
					local aimColor = if wpn.motion == "CROSSBOW" then Color3.fromRGB(181, 215, 240)
						elseif wpn.family == "bow" then Color3.fromRGB(156, 225, 159)
						else Color3.fromRGB(255, 200, 129)
					trailsOn(ch0, { "RightHand", "RightLowerArm", "LeftHand" }, aimColor,
						if kind == "heavy" then 0.34 else 0.18, if kind == "heavy" then 0.74 else 0.40)
				elseif kind == "spin" then
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
			if wpn.ranged then
				-- [원거리 스킬 준비] 집중=총구/시위에 압축 광휘, 견제=짧은 횡방향 잔광. 평타는 불필요한 오라 없음.
				if kind ~= "slash" then
					local skillColor = if wpn.motion == "CROSSBOW" then Color3.fromRGB(166, 214, 240)
						elseif wpn.family == "bow" then Color3.fromRGB(142, 228, 160)
						else Color3.fromRGB(255, 202, 131)
					pulseAt(if kind == "heavy" then "CRITICAL_BURST" else "SHAPE_BURST",
						hrp.CFrame * CFrame.new(0, 1.2, -2.6), skillColor, Color3.fromRGB(252, 241, 210),
						if kind == "heavy" then 5 else 3.6, if visualMobile then 3 else 6)
				end
			elseif kind == "spin" then
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
				local colour = if wpn.family == "fist" then Color3.fromRGB(255, 214, 156)
					elseif wpn.family == "spear" then Color3.fromRGB(159, 215, 249)
					elseif wpn.family == "axe" then Color3.fromRGB(255, 176, 112)
					elseif wpn.family == "blunt" then Color3.fromRGB(221, 194, 155)
					elseif wpn.family == "dagger" then Color3.fromRGB(170, 229, 215)
					else Color3.fromRGB(235, 245, 255)
				slashArc(hrp, colour, reachV, if wpn.family == "spear" then 55 elseif wpn.family == "dagger" then 75 else 110, if combo0 % 2 == 0 then 25 else -25)
			end
		end
		local combo = pl.combo
		local hitActionSeq = streakActionSeq -- 지연된 타격 판정도 원래 누른 공격의 식별값을 사용한다.
		task.delay(if kind == "slash" then 0.14 elseif kind == "heavy" then 0.42 else 0.2, function()
			if finished then
				return
			end
			local hits, shots = 0, 0 -- [회피 명중 분리] 사격 시도 수와 실제 적중 수를 혼동하지 않는다.
			local defeatedAt = nil -- [킬캠] 기존 타격으로 쓰러진 적 위치만 읽는다.
			-- [원거리 실제 판정] 일반 사격·집중 사격·견제 사격 모두 해당 무기의 등록 사거리에서 한 발만 명중한다.
			-- 기본 공격·스킬의 피해 배수·기력·재사용시간은 그대로, 근접 스킬은 기존 범위를 유지한다.
			local rangeR = if wpn.ranged or moveId == "rush" then wpn.range else mv.range
			local arcR = if wpn.ranged then (if moveId == "sweep" then 70 else 36) else mv.arc
			local rangedShot = wpn.ranged
			-- [무기별 실제 격발음] 명중 여부와 무관하게 한 발을 쏠 때 한 번만 재생한다.
			-- 활/장궁은 시위, 석궁은 볼트, 권총은 작은 화약음, 장총은 명확한 긴 화약음.
			if rangedShot then
				local flashColor = if wpn.motion == "CROSSBOW" then Color3.fromRGB(186, 214, 234)
					elseif wpn.family == "bow" then Color3.fromRGB(169, 230, 169)
					else Color3.fromRGB(255, 210, 134)
				pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(0, 1.1, -2.6), flashColor,
					Color3.fromRGB(255, 246, 225), if moveId == "heavy" then 5.5 else 3.2,
					if visualMobile then 2 else 4)
				if wpn.motion == "CROSSBOW" then
					sfx("sfx_card_volley", 0.45, 1.46)
				elseif wpn.family == "bow" then
					sfx("sfx_rope_release", 0.49, if wpn.motion == "LONGBOW" then 1.12 else 1.38)
				elseif wpn.motion == "RIFLE" then
					sfx("sfx_cannon", 0.38, 1.87)
				else
					sfx("sfx_card_fire", 0.43, 1.52)
				end
			end
			local list = table.clone(enemies)
			if rangedShot then
				table.sort(list, function(x, y)
					return (x.root.Position - hrp.Position).Magnitude < (y.root.Position - hrp.Position).Magnitude
				end)
			end
			for _, e in list do
				if rangedShot and shots >= 1 then
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
					local landed = strikeEnemy(e, mult, hrp.Position, if combo >= 3 and moveId == "rush" then 6 elseif mv.stagger then 5 else 2.5, mv.stagger or (moveId == "rush" and combo >= 3) or wpn.family == "blunt", nil, nil, hitActionSeq)
					if e.ac.dead then defeatedAt = e.root.Position end
					if landed then hits += 1 end
					shots += 1
					if rangedShot then
						-- 총알·화살 궤적: 짧게 번쩍이는 빛줄기
						local a0 = hrp.Position + Vector3.new(0, 1.1, 0)
						local b0 = e.root.Position + Vector3.new(0, 1.2, 0)
						-- [무기별 탄도] 기존 데미지 판정 1회에 시위/볼트/화약 궤적 1개만 연결한다.
						-- 총구 발포음은 위에서 한 번 재생했으므로 여기서는 중복 재생하지 않는다.
						arrowTrail(a0, b0, nil, nil, wpn.motion, moveId ~= "rush")
					end
				end
			end
			for _, b in table.clone(barrels) do
				if rangedShot and shots >= 1 then break end
				local tb = (b.pos - hrp.Position) * Vector3.new(1, 0, 1)
				local ab = 0
				if tb.Magnitude > 0.1 then
					local lk = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
					ab = math.deg(math.acos(math.clamp(lk.Unit:Dot(tb.Unit), -1, 1)))
				end
				if AC.inReach(rangeR * STUD + 3, arcR, tb.Magnitude, ab) then
					explodeBarrel(b, hrp, hitActionSeq)
					hits += 1
					if rangedShot then shots += 1 end
				end
			end
			for _, c in table.clone(crates) do
				if rangedShot and shots >= 1 then break end
				local tb = (c.pos - hrp.Position) * Vector3.new(1, 0, 1)
				local ab = 0
				if tb.Magnitude > 0.1 then
					local lk = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
					ab = math.deg(math.acos(math.clamp(lk.Unit:Dot(tb.Unit), -1, 1)))
				end
				if AC.inReach(rangeR * STUD + 3, arcR, tb.Magnitude, ab) then
					breakCrate(c)
					if rangedShot then shots += 1 end
				end
			end
			if hits == 0 and hitActionSeq >= streakCountedSeq then endStreak("헛손질") end
			if moveId == "rush" and hits > 0 then
				local practice = weaponPractice[wpn.id]
				if not practice then
					practice = { xp = 0, rank = 1 }
					weaponPractice[wpn.id] = practice
				end
				-- [무기별 경험치] 명중한 공격당 1 경험치. 적 수로 중복 계상하지 않는다.
				practice.xp = math.min(10000, practice.xp + 1)
				earnedPractice[wpn.id] = (earnedPractice[wpn.id] or 0) + 1
				local rank = practiceRank(practice.xp)
				local promoted = rank > practice.rank
				practice.rank = rank
				weaponRankLabel.Text = string.format("무기 숙련 %d단", rank)
				attackBtn:SetAttribute("WeaponMasteryRank", rank)
				attackBtn:SetAttribute("WeaponMasteryExperience", practice.xp)
				-- [숙련 연타 2~3타] 5단계 숙련 데이터는 유지한다. 전투 레벨 가산 최대 2%, 전 무기 공용 7초 제한.
				-- 민첩 무기는 발동·3타가 약간 유리하고, 도끼·철퇴·화기는 2타 위주로 묵직하게 표현한다.
				-- 1단에서는 절대 발동하지 않으며 추가 타격 판정·피해·보상·드롭·재사용시간을 만들지 않는다.
				local baseChance = if rank == 2 then 0.07 elseif rank == 3 then 0.10
					elseif rank == 4 then 0.13 elseif rank == 5 then 0.16 else 0
				local weaponChance = if wpn.family == "dagger" then 0.02 elseif wpn.family == "fist" then 0.015
					elseif wpn.family == "axe" then -0.015 elseif wpn.family == "blunt" then -0.01
					elseif wpn.id == "crossbow" then -0.025 elseif wpn.family == "firearm" then -0.02
					elseif wpn.family == "spear" or wpn.family == "bow" then -0.005 else 0
				local battleBonus = math.min(0.02, math.max(0, (opts.battleLevel or 1) - 1) * 0.0007)
				local chain = 1
				local comboNow = os.clock()
				if rank > 1 and comboNow - lastMasteryComboAt >= 7
					and comboRng:NextNumber() < baseChance + weaponChance + battleBonus then
					lastMasteryComboAt = comboNow
					local threeHitBase = if rank == 2 then 0 elseif rank == 3 then 0.16 elseif rank == 4 then 0.26 else 0.34
					local threeHitBias = if wpn.family == "fist" or wpn.family == "dagger" then 0.12
						elseif wpn.family == "spear" then 0.04 elseif wpn.family == "bow" then 0.02
						elseif wpn.family == "axe" then -0.14 elseif wpn.family == "blunt" then -0.10
						elseif wpn.id == "crossbow" then -0.12 elseif wpn.family == "firearm" then -0.08 else 0
					chain = if rank == 2 then 2
						elseif comboRng:NextNumber() < math.clamp(threeHitBase + threeHitBias, 0, 0.5) then 3 else 2
				end
				if promoted then
					showCombo(string.format("%s 숙련 %d단!", wpn.name, rank))
					sfx("sfx_coin", 0.55, 1.3)
				end
				if chain > 1 then
					local activeWeapon, activeSerial = wpn.id, chainMotionSerial
					for stage = 2, chain do
						-- [연타 연결] 후속 3타는 2타의 무기별 충격·회수 자세가 화면에 드러난 뒤 시작한다.
						-- 처음 한 번의 명중 판정/공격속도는 그대로, 시각 연출 예약시간만 변경한다.
						local stageDelay = if stage == 2 then 0.20
							elseif wpn.family == "dagger" or wpn.family == "fist" then 0.45
							elseif wpn.family == "axe" or wpn.family == "blunt" then 0.53
							elseif wpn.ranged then 0.41 else 0.49
						task.delay(stageDelay, function()
							if finished or not hrp.Parent or wpn.id ~= activeWeapon or chainMotionSerial ~= activeSerial then return end
							-- 추가 공격은 R15 무기 자세와 이펙트뿐이다. 실제 피해·드롭·보상은 최초 명중 1회 그대로.
							local finishKind = if stage == chain and stage == 3 and wpn.family == "fist" then "elbow"
								elseif stage == chain and stage == 3 and (wpn.family == "axe" or wpn.family == "blunt") then "heavy"
								else "slash"
							startSwing(finishKind, if stage == 3 then 0.34 else 0.26, stage, true)
							-- [실제 영화식 연타] 숙련 2·3타에서 각기 다른 견착·측면 사격·낮은 마무리 격발을 보여 준다.
							-- 추가 탄도는 시각 연출만 담당하며 실제 피해/드롭/보상은 앞선 첫 공격 1회 그대로.
							if wpn.ranged then
								local shotColor = if wpn.motion == "CROSSBOW" then Color3.fromRGB(174, 218, 241)
									elseif wpn.family == "bow" then Color3.fromRGB(150, 235, 174)
									else Color3.fromRGB(255, 210, 134)
								local shootFrom = hrp.Position + Vector3.new(0, 1.3, 0) + hrp.CFrame.LookVector * 2.2
								local side = if stage == 2 then -1 else 1
								local shootTo = shootFrom + hrp.CFrame.LookVector * (if wpn.family == "bow" then 30 else 34)
									+ hrp.CFrame.RightVector * (side * (if stage == 2 then 4.5 else 2.5))
								arrowTrail(shootFrom, shootTo, nil, nil, wpn.motion, stage == 3)
								pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(side * 0.35, 1.2, -2.9),
									shotColor, Color3.fromRGB(255, 247, 227), if stage == 3 then 6 else 4,
									if visualMobile then 2 else 5)
								trailsOn(player.Character, { "RightHand", "LeftHand" }, shotColor, 0.18, 0.32)
							end
							if stage == chain then
								masteryCinema(hrp, stage, defeatedAt)
							elseif not wpn.ranged then
								local reach = math.max(7, wpn.range * STUD)
								local color = if wpn.family == "fist" then Color3.fromRGB(250, 209, 132)
									elseif wpn.family == "axe" then Color3.fromRGB(255, 153, 109)
									elseif wpn.family == "spear" then Color3.fromRGB(144, 231, 234)
									else Color3.fromRGB(146, 223, 255)
								slashArc(hrp, color, reach, if wpn.family == "spear" then 65 else 88, 25)
							end
						end)
					end
				end
			elseif hits == 0 and moveId == "rush" then
				say("헛손질")
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
		streakActionSeq += 1
		streakAttempts += 1
		lastCombatAt = os.clock()
		pl.stamina -= 25
		dashCd = os.clock() + 3
		pl.invulnUntil = math.max(pl.invulnUntil or -1, os.clock() + 0.35)
		local from = hrp.Position
		afterimage(player.Character, Color3.fromRGB(255, 214, 120), 6, 0.04)
		trailsOn(player.Character, TRAIL_LIMBS, Color3.fromRGB(255, 214, 120), 0.4, 1)
		startSwing(if wpn.family == "fist" then "elbow" else "heavy", 0.5, 1)
		hrp.CFrame = hrp.CFrame + look * 22
		local n, landed = 0, false
		for _, e in table.clone(enemies) do
			local rel = (e.root.Position - from) * Vector3.new(1, 0, 1)
			local along = rel:Dot(look)
			local side = (rel - look * along).Magnitude
			if along > -2 and along < 26 and side < 6 then
				if strikeEnemy(e, 2.2, from, 4, true) then landed = true end
				n += 1
			end
		end
		if not landed then endStreak("헛손질") end
		shockRing(hrp.Position - Vector3.new(0, 2.5, 0), 12, Color3.fromRGB(255, 220, 120), 0.4)
		shakeUntil, shakeAmp = os.clock() + 0.25, 1
		say(if n > 0 then string.format("돌진 베기! %d명", n) else "돌진 베기!")
		refresh()
	end

	-- 지형 이벤트: 굴러오는 바위(경고선 후 돌진, 적도 휩쓴다)와 지뢰 함정(경고 원 후 폭발)
	local function hurtPlayerBy(dmg: number)
		local dealt = AC.takeHit(pl, dmg, os.clock(), nil)
		if dealt > 0 then
			lastCombatAt = os.clock()
			endStreak("피격")
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
						-- [원거리 터치 조작] 활·석궁·총은 꾹 눌러도 근접 돌진으로 무기를 바꾸지 않는다.
						say(if wpn.ranged then "원거리 조준 중" else "차징 완료! 손을 떼면 돌진 베기")
					end
				end)
			end
		end)
		b.InputEnded:Connect(function(input)
			if (input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1) and holdFrom > 0 then
				local held = os.clock() - holdFrom
				holdFrom = 0
				if held >= 0.5 and not wpn.ranged then
					-- 기본 사격은 누른 순간 이미 한 발 발사된다. 손 뗄 때 중복 공격·순간 이동은 만들지 않는다.
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
		local wbtn = btn(gui, wpn.name .. " ↔ " .. reserveWeapon.name, Color3.fromRGB(65, 83, 105), UDim2.fromOffset(110, 42), UDim2.new(1, -88, 0, 210), Vector2.new(0.5, 0.5))
		wbtn.Name = "FieldWeapon"
		wbtn.TextSize = 13
		wbtn:SetAttribute("WeaponChoiceCount", 2)
		local chooseBtn = btn(gui, "보조: " .. reserveWeapon.name, Color3.fromRGB(69, 100, 89), UDim2.fromOffset(126, 40), UDim2.new(1, -88, 0, 264), Vector2.new(0.5, 0.5))
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
			chainMotionSerial += 1
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
			local practice = weaponPractice[wpn.id]
			local rank = practice and practice.rank or 1
			weaponRankLabel.Text = string.format("무기 숙련 %d단", rank)
			attackBtn:SetAttribute("WeaponMasteryRank", rank)
			attackBtn:SetAttribute("WeaponMasteryExperience", practice and practice.xp or 0)
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
	staminaBack.Parent = heroPanel
	staminaBack.AnchorPoint = Vector2.zero
	staminaBack.Size = UDim2.fromOffset(133, 8)
	staminaBack.Position = UDim2.fromOffset(58, 48)
	local staminaNumber = label(heroPanel, "", 11, Color3.fromRGB(255, 237, 178))
	staminaNumber.Name = "FieldHeroStaminaText"
	staminaNumber.Position = UDim2.fromOffset(58, 47)
	staminaNumber.Size = UDim2.fromOffset(133, 11)
	staminaNumber.ZIndex = 6
	local skillBtns = {}
	-- [모바일 두 버튼] 공격은 우하단, 회피는 엄지 위쪽에 크게 고정. 글씨 없는 기존 등록 아이콘만 사용.
	-- 세로 화면은 이동 조이스틱과 거리 확보, 가로 화면은 전투 시야와 손가락이 겹치지 않게 한다.
	do
		local compactTouch = visualMobile and workspace.CurrentCamera
			and workspace.CurrentCamera.ViewportSize.X < 450
		local b = btn(gui, "", Color3.fromRGB(32, 141, 144),
			UDim2.fromOffset(if compactTouch then 100 elseif visualMobile then 110 else 94,
				if compactTouch then 100 elseif visualMobile then 110 else 94),
			if compactTouch then UDim2.new(1, -155, 1, -199)
				else UDim2.new(1, attackBtn.Position.X.Offset - 142, 1, attackBtn.Position.Y.Offset - 50),
			Vector2.new(0.5, 0.5))
		b.Name = "FieldSkill_dodge"
		b.Text = ""
		b:SetAttribute("SkillFullName", "회피")
		b:SetAttribute("TouchPriority", "DODGE")
		b:FindFirstChildOfClass("UICorner").CornerRadius = UDim.new(1, 0)
		b:FindFirstChildOfClass("UIStroke").Color = Color3.fromRGB(114, 244, 228)
		b:FindFirstChildOfClass("UIStroke").Thickness = 3.2
		addIcon(b, "Menu/chart_compass")
		bindPress(b, function() useMove("dodge") end)
		skillBtns.dodge = { btn = b, label = "회피" }
	end
	-- 스킬 효과 하나: 주인공 카드 스킬과 동료 스킬이 같이 쓴다. caster = 시전자 모델·루트(주인공이면 내 캐릭터).
	local function castEffect(sk, name, ch, hp0)
		-- [전투 스킬 안정성] 시전자의 이름/대상과 관계없이 시간 효과의 시각을 함수 안에서 계산한다.
		local now = os.clock()
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
			-- [카드 원거리 스킬] 실제 사용자의 무기 장착 ID로 투사체·발포음을 선택한다.
			-- 명중 수/배율/사거리/쿨타임은 기존 카드 규칙을 그대로 유지한다.
			local equippedId = ch and ch:GetAttribute("EquippedWeaponId")
			local rangedWeapon = if type(equippedId) == "string" then Weapons.get(equippedId) else wpn
			local motion = if rangedWeapon.ranged then rangedWeapon.motion else "BOW"
			local spellColor = if motion == "CROSSBOW" then Color3.fromRGB(181, 217, 238)
				elseif motion == "BOW" or motion == "LONGBOW" then Color3.fromRGB(162, 231, 173)
				else Color3.fromRGB(255, 202, 140)
			pulseAt(if sk == "snipe" then "CRITICAL_BURST" else "SHAPE_BURST",
				hp0.CFrame * CFrame.new(0, 1.3, -2.2), spellColor, Color3.fromRGB(255, 243, 216),
				if sk == "snipe" then 5.5 else 3.8, if visualMobile then 3 else 7)
			local list = table.clone(enemies)
			table.sort(list, function(a, b)
				return (a.root.Position - hp0.Position).Magnitude < (b.root.Position - hp0.Position).Magnitude
			end)
			local n = if sk == "snipe" then 1 else 3
			local hitN, hitLanded = 0, 0
			for _, e in list do
				if hitN >= n or (e.root.Position - hp0.Position).Magnitude > 30 * STUD then
					break
				end
				hitN += 1
				local hitPos = e.root.Position + Vector3.new(0, 1.5, 0)
				arrowTrail(pos, hitPos, nil, nil, motion, sk == "snipe")
				pulseAt("IMPACT_FLASH", CFrame.new(hitPos), spellColor, Color3.fromRGB(251, 248, 229),
					if sk == "snipe" then 5 else 3, if visualMobile then 2 else 4)
				if strikeEnemy(e, if sk == "snipe" then 3.0 else 1.2, hp0.Position, 1.5, sk == "snipe", false, ch == player.Character) then
					hitLanded += 1
				end
			end
			if ch == player.Character and hitLanded == 0 then endStreak("헛손질") end
			trailsOn(ch, { "RightHand", "RightLowerArm", "LeftHand", "LeftLowerArm" }, spellColor,
				if sk == "snipe" then 0.42 else 0.25, if sk == "snipe" then 0.8 else 0.54)
			say(name .. (if hitN > 0 then ": 원거리 공격!" else ": 맞힐 적이 없다"))
			if motion == "CROSSBOW" then
				sfx("sfx_card_volley", 0.42, if sk == "snipe" then 1.21 else 1.46)
			elseif motion == "BOW" or motion == "LONGBOW" then
				sfx("sfx_rope_release", 0.45, if motion == "LONGBOW" then 1.12 else 1.38)
			elseif motion == "RIFLE" then
				sfx("sfx_cannon", 0.32, 1.87)
			else
				sfx("sfx_card_fire", 0.4, 1.52)
			end
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
			if near then
				if not strikeEnemy(near, 1.8, hp0.Position, 5, true, false, ch == player.Character) and ch == player.Character then endStreak("헛손질") end
			elseif ch == player.Character then endStreak("헛손질") end
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
	-- [Luau 200레지스터 제한] 같은 UI 초기화 본문을 별도 함수 프레임에서 바로 실행해 바깥 전투 함수의 지역변수 폭증을 막는다.
	(function()
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
		-- [일반 스킬 한 종류] 저장된 카드/장착 데이터는 그대로 읽지만 자동 강타 하나만 전투에서 사용한다.
		equipped.heavy, equipped.sweep = true, false
		-- [자동 스킬] 기존 장착 칸/해금 정보는 그대로 유지하고 공격·회피 외 버튼만 만들지 않는다.
		local function useCard(key, card)
			local now = os.clock()
			if finished then
				return
			end
			if (pl.cd[key] or 0) > now then
				say(string.format("%s 재사용까지 %.1f초", card.name, pl.cd[key] - now))
				return
			end
			local ch = player.Character
			local hp0 = ch and ch:FindFirstChild("HumanoidRootPart")
			if not hp0 then
				return
			end
			local sk = card.skill
			-- [마력 직업] 치유·보호·지식 계열 카드에만 마력 20 소모.
			-- 다른 직업/공격 카드는 기존 기력·쿨타임만 유지한다.
			local spell = sk == "heal" or sk == "ward" or sk == "armor" or sk == "read"
			if magicUser and spell then
				if magicValue < 20 then say("마력이 부족해요") return end
				magicValue -= 20
			end
			pl.cd[key] = now + 8
			if sk == "volley" or sk == "snipe" or sk == "bash" then
				streakActionSeq += 1
				streakAttempts += 1
				lastCombatAt = now
			end
			startSwing("cast_" .. tostring(sk), if sk == "volley" or sk == "snipe" then 0.8 else 0.9)
			castEffect(sk, card.name, ch, hp0)
		end
		-- [주인공 전용 연타 자동 스킬] 평타 명중 5회마다 강타 1종만 발동. 동료·카드는 연타 미집계.
		-- 기존 ActionCombat.tryMove가 쿨타임·기력·무적·피해 판정을 그대로 맡는다.
		table.insert(conns, RunService.Heartbeat:Connect(function()
			local ch = player.Character
			local mark = ch and ch:GetAttribute("FieldAutoSkillPending")
			if mark and ch then
				ch:SetAttribute("FieldAutoSkillPending", nil)
				if not finished and pl.hp > 0 and mark == pl.autoNormalHits
					and (pl.cd.heavy or -100) <= os.clock() and pl.stamina >= AC.Moves.heavy.stamina then
					showCombo(string.format("%d연타 · %s 자동!", streakN, Weapons.actionDesign(wpn).heavy),
						true, Color3.fromRGB(255, 205, 122))
					useMove("heavy")
				end
			end
			-- [기존 개발 검증] 수동 스킬 버튼 삭제와 무관하게 테스트용 카드 발동은 보존.
			local dev = workspace:GetAttribute("DevCardSkill")
			if dev and cs[dev] then
				workspace:SetAttribute("DevCardSkill", nil)
				useCard("card" .. dev, cs[dev])
			end
		end))
	end)()
	table.insert(conns, RunService.Heartbeat:Connect(function(dt)
		local now = os.clock()
		AC.regen(pl, math.min(dt, 0.1)) -- 느린 폰(30fps)에서도 기력이 같은 속도로 찬다
		-- [보스 독 지속피해] 4초 동안 1초마다 2피해. 매 프레임 차감하거나 여러 보스의 독을 합산하지 않는다.
		-- 최초 공격을 막았거나 회피했으면 아예 걸리지 않는다. 본 효과는 기존 플레이어 저장과 무관하다.
		if pl.hp > 0 and bossPoisonNextAt <= bossPoisonUntil and now >= bossPoisonNextAt then
			-- [정확한 4틱] 프레임 지연으로 마지막 1초가 건너뛰지 않도록 발동 예정시각으로 누적한다.
			bossPoisonNextAt += 1
			pl.hp = math.max(0, pl.hp - 2)
			lastCombatAt = now
			-- [독 피드백] 피해 숫자만 바뀌는 대신 독이 흐르는 걸 보여 주되, 모바일은 입자를 최소화한다.
			local poisonedRoot = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			if poisonedRoot then
				shards(poisonedRoot.Position + Vector3.new(0, 1.5, 0), if visualMobile then 2 else 5,
					Color3.fromRGB(115, 220, 101), 2)
			end
			refresh()
			if pl.hp <= 0 then
				task.defer(function() finish("defeat") end)
				return
			end
		end
		-- [동시 상태이상 표시] 정예 둔화와 두목 독은 별개 타이머로 처리하며 둘 다 있을 때 짧게 안내한다.
		local slowed = now < eliteSlowUntil
		local poisoned = now < bossPoisonUntil
		local debuff = if poisoned and slowed then "독" .. tostring(math.ceil(bossPoisonUntil - now))
			.. "·둔" .. tostring(math.ceil(eliteSlowUntil - now))
			elseif poisoned then "독 " .. tostring(math.ceil(bossPoisonUntil - now))
			elseif slowed then "둔화 " .. tostring(math.ceil(eliteSlowUntil - now)) else ""
		if debuffLabel.Text ~= debuff then
			debuffLabel.Text = debuff
			debuffLabel.TextColor3 = if poisoned then Color3.fromRGB(144, 232, 144) else Color3.fromRGB(151, 210, 249)
		end
		-- [비전투 극소량 체력 회복] 8초간 전투 행동이 없고 40스터드 이내 적이 없을 때만 작동한다.
		-- 자연 초당 0.12, 실제 치료 동료가 28스터드 안에 있으면 동료당 +0.18(최대 2명).
		if now - lastCombatAt >= 8 and pl.hp > 0 and pl.hp < pl.maxHp then
			local ch = player.Character
			local root = ch and ch:FindFirstChild("HumanoidRootPart")
			local danger = root == nil
			if root then
				for _, e in enemies do
					if not e.ac.dead and e.root.Parent and (e.root.Position - root.Position).Magnitude < 40 then
						danger = true
						break
					end
				end
			end
			if not danger then
				local healers = 0
				for _, a in activeHealers do
					if a.root and a.root.Parent and (a.root.Position - root.Position).Magnitude <= 28 then
						healers += 1
					end
				end
				pl.hp = math.min(pl.maxHp, pl.hp + (0.12 + math.min(healers, 2) * 0.18) * math.min(dt, 0.1))
				if now >= passiveRegenHudAt then
					passiveRegenHudAt = now + 0.5
					refresh()
				end
				if now - passiveRegenFxAt >= 12 then
					passiveRegenFxAt = now
					pulseAt("HEAL_PULSE", root.CFrame * CFrame.new(0, -2.1, 0), Color3.fromRGB(104, 207, 151),
						Color3.fromRGB(215, 250, 227), 3.8, if visualMobile then 2 else 4)
					sfx("sfx_card_magic", 0.16, if healers > 0 then 1.15 else 1.32)
				end
			end
		end
		staminaFill.Size = UDim2.fromScale(math.clamp(pl.stamina / AC.STAMINA_MAX, 0, 1), 1)
		staminaNumber.Text = string.format("기력 %d", math.floor(pl.stamina + 0.5))
		if magicFill then
			magicValue = math.min(100, magicValue + math.min(dt, 0.1) * 5)
			magicFill.Size = UDim2.fromScale(magicValue / 100, 1)
			magicAmount.Text = string.format("마력 %d", math.floor(magicValue + 0.5))
		end
		for key, sb in skillBtns do
			if key == "heavy" or key == "sweep" then
				local style = Weapons.actionDesign(wpn)
				local detailed = if key == "heavy" then style.heavyName else style.sweepName
				sb.label = if key == "heavy" then style.heavy else style.sweep
				sb.btn:SetAttribute("SkillFullName", detailed)
				-- 무기 교체 시 기존 아이콘 이미지도 바로 해당 무기 계열로 전환한다.
				local iconKey = if wpn.family == "fist" then "Menu/cc0_glove"
					elseif wpn.ranged then "Menu/cc0_crossbow"
					elseif key == "heavy" and (wpn.family == "axe" or wpn.family == "blunt") then "Menu/cc0_axe"
					elseif key == "sweep" and wpn.family == "axe" then "Menu/cc0_axe"
					else "Menu/cc0_sword"
				if sb.btn:GetAttribute("IconArtKey") ~= iconKey and AssetIds[iconKey] then
					local icon = sb.btn:FindFirstChild("FieldButtonIcon")
					if icon then
						icon.Image = "rbxassetid://" .. tostring(AssetIds[iconKey])
						sb.btn:SetAttribute("IconArtKey", iconKey)
					end
				end
			end
			local left = (pl.cd[key] or 0) - now
			local shade = sb.btn:FindFirstChild("FieldCooldownShade")
			local timer = sb.btn:FindFirstChild("FieldCooldownTime")
			local duration = if string.sub(key, 1, 4) == "card" then 8 else (AC.Moves[key] and AC.Moves[key].cooldown) or 4
			if shade and timer then
				shade.Visible = left > 0
				timer.Visible = false -- [아이콘 전용] 재사용 숫자 대신 기존 진행 막대만 표시한다.
				shade.Size = UDim2.fromScale(1, math.clamp(left / math.max(duration, 0.1), 0, 1))
				local track = sb.btn:FindFirstChild("FieldCooldownTrack")
				local fill = track and track:FindFirstChild("FieldCooldownProgress")
				if track and fill then
					track.Visible = left > 0
					fill.Size = UDim2.fromScale(1 - math.clamp(left / math.max(duration, 0.1), 0, 1), 1)
				end
				if left > 0 then
					sb.wasCooling = true
				elseif sb.wasCooling then
					sb.wasCooling = false
					local stroke = sb.btn:FindFirstChildOfClass("UIStroke")
					if stroke then
						stroke.Color = Color3.fromRGB(100, 248, 178)
						stroke.Thickness = 3
						TweenService:Create(stroke, TweenInfo.new(0.45), { Color = Color3.fromRGB(224, 184, 105), Thickness = 2 }):Play()
					end
				end
			end
			sb.btn.BackgroundTransparency = if left > 0 then 0.14 else 0
			sb.btn:SetAttribute("CooldownRemaining", math.max(0, left))
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
				-- [적 무기 연속 동작] 공격 차례에 따라 기존 공용 무기 1~3타를 순환한다. 피해·판정은 동일.
				if e.fm then e.fm.weaponBeat = ((e.fm.weaponBeat or 0) % 3) + 1 end
				attackers += 1
				e.warnUntil = now + e.ac.def.windup
				burst(e.root.Position + Vector3.new(0, 3, 0), 0, false, "telegraph")
				sfx("sfx_event_danger", 0.35, 1.2)
				if e.ac.def.aoe then
					groundRing(e.root.Position - Vector3.new(0, e.root.Size.Y * 0.5 + 2.6, 0), e.ac.def.range * STUD * 0.85, e.ac.def.windup)
				end
				e.parryAt = nil
				-- [정예·보스 특수공격 예고] 다음 공격이 감속/독을 거는지 기존 빨간 예고 UI에 직접 표시한다.
				-- 타격 시 다시 명중·방어·쿨타임을 검사하므로 예고 자체가 피해나 상태를 적용하지 않는다.
				e.telegraphStatus = if e.boss and now >= (e.nextPoisonAt or 0) and now >= bossPoisonUntil then "poison"
					elseif e.elite and not e.boss and now >= (e.nextSlowAt or 0) then "slow" else nil
				-- [폭탄 사전 경고] 던지기 전에 목표 지점을 고정한다. 움직이면 폭발을 피할 수 있다.
				if e.throwAsset == "bomb" then
					e.bombAim = hrp.Position
					groundRing(e.bombAim - Vector3.new(0, 2.5, 0), 6, e.ac.def.windup + 0.28)
					-- [폭발 충돌 동기화] 실물 투사체가 타격 판정 시각에 도착하도록 예고 말기에 투척한다.
					-- 기존 공격력·회피·방어는 원본 strike에서 한 번만 정산한다.
					local destination = e.bombAim
					task.delay(math.max(0, e.ac.def.windup - 0.32), function()
						if finished or not folder.Parent or not e.model.Parent or e.ac.dead or e.ac.state ~= "windup" then return end
						-- [실물 투척] 발사한 순간 오른손에 든 동일 폭탄을 감춘다.
						-- 복제품이 날아가 착탄한 뒤 다음 투척 준비 전에 원래 메시 투명도로 복구한다.
						local held = e.model:FindFirstChild("FieldWeapon")
						local hidden = {}
						if held and e.model:GetAttribute("EnemyWeaponId") == "bomb" then
							for _, part in held:GetDescendants() do
								if part:IsA("BasePart") then
									table.insert(hidden, { part = part, alpha = part.Transparency })
									part.Transparency = 1
								end
							end
						end
						arrowTrail(e.root.Position + Vector3.new(0, 2.6, 0), destination + Vector3.new(0, -1.8, 0), "bomb", 0.32)
						task.delay(0.32 + math.min(e.ac.def.recover * 0.65, 1.2), function()
							for _, item in hidden do
								if item.part.Parent then item.part.Transparency = item.alpha end
							end
						end)
					end)
				end
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
					h.FillColor = if e.telegraphStatus == "poison" then Color3.fromRGB(70, 198, 94)
						elseif e.telegraphStatus == "slow" then Color3.fromRGB(85, 160, 245) else Color3.fromRGB(255, 40, 40)
					h.FillTransparency = 0.55
					h.OutlineColor = if e.telegraphStatus == "poison" then Color3.fromRGB(175, 255, 147)
						elseif e.telegraphStatus == "slow" then Color3.fromRGB(160, 222, 255) else Color3.fromRGB(255, 80, 60)
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
					wl.Text = if e.telegraphStatus == "poison" then "독"
						elseif e.telegraphStatus == "slow" then "둔" else "!"
					wl.TextColor3 = if e.telegraphStatus == "poison" then Color3.fromRGB(144, 255, 157)
						elseif e.telegraphStatus == "slow" then Color3.fromRGB(143, 215, 255) else Color3.fromRGB(255, 70, 60)
					wl.Font = Enum.Font.GothamBlack
					wl.TextScaled = true
					wl.Parent = bbw
					bbw.Parent = gui
					e.warnBb = bbw
				end
			elseif event == "strike" then
				e.swingAt = now
				if e.throwAsset == "bomb" and e.bombAim then
					local diff = (hrp.Position - e.bombAim) * Vector3.new(1, 0, 1)
					hit = diff.Magnitude <= 6
				end
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
					if e.throwAsset == "bomb" then
						-- 화약 폭탄은 사전 경고 중 날아왔고 현재 착탄/피해 판정이 일치한다.
						e.bombAim = nil
					elseif e.throwAsset then
						arrowTrail(e.root.Position + Vector3.new(0, 2.6, 0), hrp.Position + Vector3.new(0, 0.6, 0), e.throwAsset)
						sfx("sfx_card_swing", 0.34, if e.throwAsset == "stone" then 1.22 else 0.92)
					elseif e.weapon and e.weapon.id == "crossbow" then
						-- [석궁] 쇠뇌 시위·볼트 궤적. 총기 발포음은 재생하지 않는다.
						sfx("sfx_card_volley", 0.34, 1.46)
						arrowTrail(e.root.Position + Vector3.new(0, 1.5, 0), hrp.Position + Vector3.new(0, 1.5, 0), nil, nil, "CROSSBOW")
					elseif e.weapon and e.weapon.family == "firearm" then
						-- [총병] 승인된 화약 사격 소리와 총구 섬광.
						sfx(if e.weapon.motion == "PISTOL" then "sfx_card_fire" else "sfx_cannon",
							if e.weapon.motion == "PISTOL" then 0.29 else 0.34, if e.weapon.motion == "PISTOL" then 1.52 else 1.87)
						pulseAt("IMPACT_FLASH", e.root.CFrame * CFrame.new(0, 1.3, -2),
							Color3.fromRGB(255, 207, 125), Color3.fromRGB(255, 248, 210), 5, if visualMobile then 2 else 4)
						arrowTrail(e.root.Position + Vector3.new(0, 1.5, 0), hrp.Position + Vector3.new(0, 1.5, 0), nil, nil, e.weapon.motion)
					else
						sfx("sfx_rope_release", 0.32, if e.weapon and e.weapon.motion == "LONGBOW" then 1.12 else 1.38)
						arrowTrail(e.root.Position + Vector3.new(0, 1.5, 0), hrp.Position + Vector3.new(0, 1.5, 0),
							nil, nil, if e.weapon then e.weapon.motion else "BOW")
					end
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
						lastCombatAt = now
						endStreak("피격")
						-- [정예 스킬] 방패·돌격 정예는 명중 시 3초간 이동속도 35% 감소.
						-- 같은 몹은 8초에 한 번만 적용하고, 여러 명이 맞혀도 감속률은 중첩하지 않는다.
						if not pl.guarding and e.elite and not e.boss and now >= (e.nextSlowAt or 0) then
							e.nextSlowAt = now + 8
							eliteSlowUntil = math.max(eliteSlowUntil, now + 3)
							say("정예 둔화! 3초")
							pulseAt("BUFF_PULSE", hrp.CFrame * CFrame.new(0, -1.7, 0),
								Color3.fromRGB(92, 173, 244), Color3.fromRGB(202, 237, 255), 4, if visualMobile then 2 else 5)
						-- [두목 스킬] 보스의 독타격은 4초간 매초 2의 지속피해. 효과 중복 불가, 보스별 10초 제한.
						elseif not pl.guarding and e.boss and now >= (e.nextPoisonAt or 0) and now >= bossPoisonUntil then
							e.nextPoisonAt = now + 10
							bossPoisonUntil, bossPoisonNextAt = now + 4, now + 1
							say("두목의 맹독! 4초")
							pulseAt("BUFF_PULSE", hrp.CFrame * CFrame.new(0, -1.7, 0),
								Color3.fromRGB(93, 190, 92), Color3.fromRGB(194, 255, 156), 5, if visualMobile then 2 else 6)
						else
							say("공격을 받았다!")
						end
						local armedFamily = e.weapon and e.weapon.family or "blade"
						hurtReact(if e.ac.def.boss then 2 elseif armedFamily == "axe" or armedFamily == "blunt" then 1.45
							elseif armedFamily == "dagger" then 0.65 else 1)
						local sparkColor = if e.throwAsset == "bomb" then Color3.fromRGB(255, 155, 80)
							elseif armedFamily == "axe" or armedFamily == "blunt" then Color3.fromRGB(252, 183, 91)
							elseif armedFamily == "spear" then Color3.fromRGB(146, 226, 246)
							elseif e.shieldModel then Color3.fromRGB(164, 200, 242) else Color3.fromRGB(255, 91, 75)
						shards(hrp.Position + Vector3.new(0, 1.5, 0), if visualMobile then 5 else 9, sparkColor, 4)
						burst(hrp.Position + Vector3.new(0, 2, 0), if visualMobile then 9 else 16, false)
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
			-- [적 가감속·선회] 기존 추적/후퇴/돌진 규칙은 유지하고 이동을 부드럽게 보간한다.
			local wish = if frozen then 0 else AC.moveWish(e.ac, dist)
			local beforeMove = e.root.Position
			if frozen or e.ac.state == "stagger" then
				e.chargeTarget = nil
				e.dodgeUntil = 0
			end
			local pv = e.model:GetPivot()
			local desired = Vector3.zero
			local facing = if flat.Magnitude > 0.1 then flat.Unit else nil
			local evading = (e.dodgeUntil or 0) > now
			local charging = e.chargeTarget ~= nil
			if evading then
				desired = (e.dodgeDir or Vector3.zero) * (if e.boss then 15 else 19)
			elseif charging then
				local remaining = Vector3.new(e.chargeTarget.X - pv.Position.X, 0, e.chargeTarget.Z - pv.Position.Z)
				if remaining.Magnitude <= 0.2 then
					e.chargeTarget = nil
				else
					desired = remaining.Unit * math.min(48, remaining.Magnitude / math.max(dtc, 0.016))
					facing = remaining.Unit
				end
			elseif e.waiting and not frozen and flat.Magnitude > 0.1 and wish == 0 then
				-- 공격 차례를 기다리는 적은 정면을 유지하며 측면으로 포위한다.
				e.circleDir = e.circleDir or (if math.random() < 0.5 then 1 else -1)
				desired = flat.Unit:Cross(Vector3.yAxis) * e.circleDir * e.ac.def.speed * 0.45
			elseif wish ~= 0 and flat.Magnitude > 0.1 then
				desired = flat.Unit * wish * math.min(e.ac.def.speed * 0.8, flat.Magnitude / math.max(dtc, 0.016))
			end
			local response = if evading then 22 elseif charging then 17 elseif desired.Magnitude > 0 then 9 else 13
			-- [스키 이동 방지] 공격 준비·타격·후딜에 잔여 속도를 끊고 발을 접지한다.
			if not charging and not evading and (frozen or e.ac.state == "windup" or e.ac.state == "active" or e.ac.state == "recover") then
				e.moveVel = Vector3.zero
			else
				e.moveVel = (e.moveVel or Vector3.zero):Lerp(desired, 1 - math.exp(-response * dtc))
			end
			if e.moveVel.Magnitude < 0.07 then e.moveVel = Vector3.zero end
			local delta = e.moveVel * dtc
			if charging and e.chargeTarget then
				local remaining = (e.chargeTarget - pv.Position) * Vector3.new(1, 0, 1)
				if delta.Magnitude >= remaining.Magnitude then
					delta = remaining
					e.chargeTarget = nil
				end
			elseif not evading and wish > 0 and delta.Magnitude > flat.Magnitude then
				delta = flat
			end
			if delta.Magnitude > 0.001 or (facing and e.ac.state ~= "idle") then
				local rot = pv.Rotation
				if facing then
					local targetRot = CFrame.lookAt(Vector3.zero, facing).Rotation
					rot = rot:Lerp(targetRot, 1 - math.exp(-(if charging then 12 elseif e.ac.state == "windup" then 10 else 7) * dtc))
				end
				e.model:PivotTo(CFrame.new(pv.Position + delta) * rot)
			end
			local traveled = (e.root.Position - beforeMove).Magnitude
			if traveled > 0.02 then
				e.gait = (e.gait or 0) + traveled / (if e.boss then 7 else 5.2)
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
				if (e.dodgeUntil or 0) > now then
					st, ph = "EVADE", math.clamp((now - (e.dodgeT0 or now)) / 0.3, 0, 1)
				elseif hurtProgress >= 0 and hurtProgress < 1 then
					st, ph = "HIT", hurtProgress
				elseif acs == "windup" then
					st, ph = "ANTICIPATION", math.clamp(e.ac.t / math.max(e.ac.def.windup, 0.05), 0, 1)
				elseif acs == "active" then
					st, ph = "ATTACK", 0.25 + math.clamp(e.ac.t / math.max(e.ac.def.active, 0.05), 0, 1) * 0.35
				elseif acs == "recover" then
					st, ph = "RECOVERY", math.clamp(e.ac.t / math.max(e.ac.def.recover, 0.05), 0, 1)
				elseif traveled > 0.025 then
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
				-- [근접 돌진 접지] 기존 공격 이동거리와 사거리·판정은 그대로 두되,
				-- 실제 전진한 거리만 발 디딤 포즈로 전달해 공중에서 미끄러지는 느낌을 막는다.
				e.attackStep = 0
				if st == "ATTACK" and not def0.keepAway and def0.range <= 12 and flat.Magnitude > 2.5 then
					local lunge = flat.Unit * math.min(def0.speed * 1.8 * dtc, flat.Magnitude - 2.5)
					e.model:PivotTo(e.model:GetPivot() + lunge)
					e.attackStep = lunge.Magnitude
				end
				-- 숨쉬기·체중 이동(대기), 달릴 때 위아래 출렁임과 앞으로 숙임으로 가만히 있어도 살아 보이게 한다
				local bob, roll = 0, 0
				if st == "IDLE" then
					bob, roll, lean = math.sin(now * 2.2 + e.spawnT) * 0.06, math.sin(now * 1.1 + e.spawnT) * 0.05, lean + math.sin(now * 1.6 + e.spawnT) * 0.04
				elseif st == "RUN" then
					local pace = math.clamp((e.moveVel or Vector3.zero).Magnitude / math.max(e.ac.def.speed, 1), 0, 1.4)
					bob, roll, lean = math.abs(math.sin((e.gait or 0) * math.pi * 2)) * 0.075 * pace, math.sin((e.gait or 0) * math.pi * 2) * 0.03, -0.12 * pace
				elseif st == "EVADE" then
					bob, roll, lean = -0.18 * math.sin(ph * math.pi), (if (e.motionPhase or 0) < 0.5 then 1 else -1) * 0.20 * math.sin(ph * math.pi), -0.20
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
				FM.actor(e.fm, st, ph, dt, e.boss, if e.boss then 1.45 else 1.35, CFrame.new(0, bob, 0) * CFrame.Angles(lean, 0, roll),
					(kindId == "archer" or e.throwAsset ~= nil) and wish < 0, nil,
					if e.throwAsset then nil else (e.weapon and e.weapon.motion),
					math.clamp(traveled / math.max(dtc, 0.016) / math.max(e.ac.def.speed, 1), 0.18, 1.25),
					math.clamp(e.root.CFrame.RightVector:Dot(e.moveVel) / math.max(e.ac.def.speed, 1), -1, 1),
					e.attackStep)
			elseif hurtProgress >= 0 and hurtProgress < 1 then
				Pose.makeR15Action(e.model, "hurt", hurtProgress, now - e.spawnT)
			elseif attackProgress >= 0 and attackProgress < 1 then
				Pose.makeR15Action(e.model, "attack", attackProgress, now - e.spawnT)
			else
				Pose.makeR15Action(e.model, if traveled > 0.025 then "run" else "idle", 0, if traveled > 0.025 then (e.gait or 0) * 2 * math.pi else now - e.spawnT)
			end
		end
	end))

	-- 동료(최대 2명): 주인공 곁을 따라다니다 가까운 적에게 달려가 알아서 싸운다. 맞지는 않는 지원군.
	do
		local function hashName(str: string): number
			local h = 7
			for _, cp in utf8.codes(str) do h = (h * 31 + cp) % 100003 end
			return h
		end
		-- [동료 명세 준비] 기존 영입·직업·국적 판정은 그대로 두고 루아우 200개 지역변수 한도를 피하도록 이 책임만 분리.
		local function prepareAllyDefs()
			local allyDefs = {}
			local allyNames = opts.allies or {}
			if #allyNames == 0 and RunService:IsStudio() and workspace:GetAttribute("DevAllies") then
				allyNames = { { name = "동료 포수", role = "포수" }, { name = "동료 항해사", role = "항해사" } } -- 실제 서버에서는 없는 동료를 만들지 않는다.
			end
			-- [동료 식별] 같은 영입 ID 중복은 한 번만 소환한다. 최대 2명, 직업별 기존 스킬·무기는 유지.
			local ROLE_BY_JOB = { ["성직자"] = "Mage", ["수녀"] = "Mage", ["승려"] = "Mage", ["비구니"] = "Mage", ["순례자"] = "Mage", ["필사자"] = "Mage", ["포수"] = "Barbarian", ["항해사"] = "Rogue" }
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
			return allyDefs
		end
		local allyDefs = prepareAllyDefs()
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
					local created, m = pcall(Pose.createR15, folder, pos0, 0, ad.coat, rng, ad.role, heroHeight, outfit)
					if not created and not finished then
						warn("[MareEssentia] 동료 리그 생성 오류", m)
						m = nil
					end
					if finished or not folder.Parent then
						if created and m and typeof(m) == "Instance" then m:Destroy() end
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
						-- [기존 영입 동료 초상과 지원 상태] 무적 지원군은 생명력이 소모되지 않으므로
						-- 고정 체력 표시를 두고 실제 공격·스킬 사용량에 따른 전투 에너지만 시각적으로 갱신한다.
						local status = Instance.new("Frame")
						status.Name = "FieldAllyStatus" .. i
						status.Position = UDim2.fromOffset(12, 162 + (i - 1) * 56)
						status.Size = UDim2.fromOffset(202, 52)
						status.BackgroundColor3 = Color3.fromRGB(24, 33, 49)
						status.BackgroundTransparency = 0.12
						status.BorderSizePixel = 0
						status.Parent = gui
						local round = Instance.new("UICorner")
						round.CornerRadius = UDim.new(0, 9)
						round.Parent = status
						local frame = Instance.new("UIStroke")
						frame.Color = if i == 1 then Color3.fromRGB(105, 200, 223) else Color3.fromRGB(222, 181, 103)
						frame.Thickness = 1.1
						frame.Parent = status
						local face = Instance.new("ImageLabel")
						face.Name = "FieldAllyPortrait"
						face.Size = UDim2.fromOffset(39, 43)
						face.Position = UDim2.fromOffset(6, 5)
						face.BackgroundColor3 = Color3.fromRGB(56, 70, 82)
						face.BorderSizePixel = 0
						face.ScaleType = Enum.ScaleType.Crop
						local portrait = opts.allyPortraits and opts.allyPortraits[ad.id]
						if portrait and portrait.id then
							face.Image = "rbxassetid://" .. tostring(portrait.id)
							face.ImageRectOffset = portrait.offset or Vector2.zero
							face.ImageRectSize = portrait.size or Vector2.zero
						end
						face.Parent = status
						local faceRound = Instance.new("UICorner")
						faceRound.CornerRadius = UDim.new(0, 7)
						faceRound.Parent = face
						local nameText = label(status, ad.name, 13)
						nameText.Name = "FieldAllyName"
						nameText.Position = UDim2.fromOffset(51, 3)
						nameText.Size = UDim2.fromOffset(143, 18)
						nameText.TextXAlignment = Enum.TextXAlignment.Left
						nameText.TextTruncate = Enum.TextTruncate.AtEnd
						local hpLine = Instance.new("Frame")
						hpLine.Name = "FieldAllyHealth"
						hpLine.Size = UDim2.fromOffset(140, 6)
						hpLine.Position = UDim2.fromOffset(51, 24)
						hpLine.BackgroundColor3 = Color3.fromRGB(82, 181, 117)
						hpLine.BorderSizePixel = 0
						hpLine.Parent = status
						local manaAlly = JobSkills.categoryOf(ad.job) == "clergy"
						local energyLine = Instance.new("Frame")
						energyLine.Name = if manaAlly then "FieldAllyMana" else "FieldAllyStamina"
						energyLine.Size = UDim2.fromOffset(140, 7)
						energyLine.Position = UDim2.fromOffset(51, 36)
						energyLine.BackgroundColor3 = Color3.fromRGB(42, 52, 68)
						energyLine.BorderSizePixel = 0
						energyLine.Parent = status
						local energyFill = Instance.new("Frame")
						energyFill.Name = "FieldAllyEnergyFill"
						energyFill.Size = UDim2.fromScale(1, 1)
						energyFill.BackgroundColor3 = if manaAlly then Color3.fromRGB(110, 151, 247) else Color3.fromRGB(232, 191, 89)
						energyFill.BorderSizePixel = 0
						energyFill.Parent = energyLine
						local energyCaption = label(status, if manaAlly then "마력" else "기력", 10, Color3.fromRGB(239, 233, 215))
						energyCaption.Name = "FieldAllyEnergyCaption"
						energyCaption.TextXAlignment = Enum.TextXAlignment.Right
						energyCaption.Position = UDim2.fromOffset(153, 34)
						energyCaption.Size = UDim2.fromOffset(38, 12)
						energyCaption.ZIndex = 6
						local ally = { model = m, root = r, slot = i, swingAt = -10, nextAt = 0, t0 = now,
							fm = if FM then FM.new(m, false) else nil, name = ad.name, skills = ad.skills,
							weapon = ad.weapon or Weapons.get("sword"), skillCd = {}, nextSkill = now + 4 + i * 2,
							gait = (i - 1) * 0.45, energy = 100, energyFill = energyFill,
							healer = table.find(ad.skills, "heal") ~= nil }
						table.insert(allies, ally)
						if ally.healer then table.insert(activeHealers, ally) end
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
				-- [동료 가감속] 목표가 바뀔 때 발은 연속해서 디디며 몸이 갑자기 직각으로 꺾이지 않는다.
				local wantedVel = if moving then to.Unit * (if tgt then 16 else 20) else Vector3.zero
				a.moveVel = (a.moveVel or Vector3.zero):Lerp(wantedVel, 1 - math.exp(-10 * math.clamp(dt, 0, 0.1)))
				if moving and a.moveVel.Magnitude > 0.05 then
					local step = math.min(to.Magnitude - stop, a.moveVel.Magnitude * math.clamp(dt, 0, 0.1))
					a.model:PivotTo(a.model:GetPivot() + a.moveVel.Unit * step)
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
					-- [동료 기본 공격] 별도 연타 누적·마무리 콤보는 사용하지 않는다.
					-- 기존 동료 공격 주기·피해·실물 무기 동작은 유지한다.
					a.energy = math.max(0, a.energy - 10)
					strikeEnemy(tgt, 0.6 * aw.power, a.root.Position, if aw.family == "axe" then 2 else 1.0,
						aw.family == "axe", true, false, nil, aw)
					if aw.ranged then
						-- 동료 사격: 총알·화살 궤적
						local a0 = a.root.Position + Vector3.new(0, 0.5, 0)
						local b0 = tgt.root.Position
						local arrow = aw.family == "bow" or aw.motion == "CROSSBOW"
						-- [동료 사격] 화살·볼트·총알의 색상과 발사소리를 실제 동료 장비로 구분한다.
						arrowTrail(a0, b0, nil, nil, aw.motion)
						if aw.motion == "CROSSBOW" then
							sfx("sfx_card_volley", 0.28, 1.46)
						elseif aw.family == "bow" then
							sfx("sfx_rope_release", 0.32, if aw.motion == "LONGBOW" then 1.12 else 1.38)
						elseif aw.motion == "RIFLE" then
							sfx("sfx_cannon", 0.29, 1.87)
						else
							sfx("sfx_card_fire", 0.30, 1.52)
						end
						if CommonVFX then
							pcall(CommonVFX.Create, "IMPACT_FLASH", {
								parent = workspace, cframe = CFrame.new(b0), color = if arrow then Color3.fromRGB(210, 187, 129) else Color3.fromRGB(255, 226, 162),
								endSize = 2.2, count = 4, duration = 0.18, hideRing = true,
							})
						end
					end
				end
				-- 직업 스킬(최대 2개): 상황이 맞을 때 자동으로 쓴다 (치료=체력 낮을 때, 보호막=없을 때, 사격·강타·저격=적이 가까울 때, 사기=적 2명 이상)
				if now >= a.nextSkill and (#enemies > 0 or (a.healer and pl.hp < pl.maxHp * 0.65)) then
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
								a.energy = math.max(0, a.energy - 20)
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
				-- [동료 자원 HUD] 전투 판정과 별개로 화면에 최근 행동량을 표시한다.
				a.energy = math.min(100, a.energy + math.min(dt, 0.1) * 13)
				if a.energyFill and a.energyFill.Parent then
					a.energyFill.Size = UDim2.fromScale(a.energy / 100, 1)
				end
				local ap = (now - a.swingAt) / 0.5
				if a.fm then
					if a.castAt and now - a.castAt < 0.7 then
						FM.actor(a.fm, "INTERACT", (now - a.castAt) / 0.7, dt, nil, 1.3, nil, false, a.castSkill)
					elseif ap >= 0 and ap < 1 then
						-- [동료 무기 공격 통합] 원본 1~3타의 재생 속도는 유지하면서 전신·축발·반동을 함께 적용한다.
						-- 맨손도 공용 연타를 사용하며 기존 피해 발생 시각과 공격 주기는 그대로다.
						FM.actor(a.fm, "ATTACK", 0.25 + math.clamp(ap, 0, 1) * 0.35,
							dt, nil, 1.3, nil, false, nil, a.weapon.motion)
					elseif ap >= 1 and ap < 1.7 then
						-- [동료 무기 회수] 실제 공격 후 0.35초 자세를 정돈한다(기존 공격 판정·주기는 동일).
						FM.actor(a.fm, "RECOVERY", math.clamp((ap - 1) / 0.7, 0, 1), dt, nil, 1.25, nil, false, nil, a.weapon.motion)
					elseif tgt and not moving and a.nextAt > now and a.nextAt - now < 0.22 then
						-- [타격 예고] 다음 공격 직전의 짧은 무기 준비. 대미지 발생 시각은 변경하지 않는다.
						FM.actor(a.fm, "ANTICIPATION", 1 - (a.nextAt - now) / 0.22, dt, nil, 1.18, nil, false, nil, a.weapon.motion)
					elseif moving then
						FM.actor(a.fm, "RUN", (a.gait or 0) % 1, dt, nil, 1.3, nil, false, nil, a.weapon.motion,
							math.clamp(a.moveVel.Magnitude / (if tgt then 16 else 20), 0.18, 1.25))
					else
						FM.actor(a.fm, "IDLE", (now / 2.4 + a.slot * 0.3) % 1, dt, nil, 1.15, nil, false, nil, a.weapon.motion)
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
	-- [Luau 200레지스터 제한] 모바일 패드 초기화는 원래 기능을 그대로 별도 실행 프레임에서 처리한다.
	(function()
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
	end)()

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
			-- [이동 감시와 둔화 통합] 기존 '<16이면 강제 회복' 로직이 감속을 즉시 지우던 충돌을 수정한다.
			-- 기준속도는 첫 명중 때 기록하고 효과 종료·캐릭터 변경·철수 시 복원한다.
			if slowedHumanoid and slowedHumanoid ~= h2 then
				if slowedHumanoid.Parent and originalFieldWalkSpeed then
					slowedHumanoid.WalkSpeed = originalFieldWalkSpeed
				end
				slowedHumanoid, originalFieldWalkSpeed = nil, nil
			end
			if os.clock() < eliteSlowUntil then
				if slowedHumanoid ~= h2 then
					slowedHumanoid = h2
					originalFieldWalkSpeed = if h2.WalkSpeed < 16 then (if workspace:GetAttribute("FieldTouchPad") then 22 else 18)
						else h2.WalkSpeed
				end
				local targetSpeed = math.max(7, (originalFieldWalkSpeed or 18) * 0.65)
				if math.abs(h2.WalkSpeed - targetSpeed) > 0.05 then h2.WalkSpeed = targetSpeed end
			else
				if slowedHumanoid == h2 and originalFieldWalkSpeed then
					h2.WalkSpeed = originalFieldWalkSpeed
					slowedHumanoid, originalFieldWalkSpeed = nil, nil
				elseif h2.WalkSpeed < 16 then
					h2.WalkSpeed = if workspace:GetAttribute("FieldTouchPad") then 22 else 18
				end
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
	say("공격 F(기본 단타) · 무기 숙련 시 2~3연타 확률 발동 · 기술 Q/E · 회피 R")
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
