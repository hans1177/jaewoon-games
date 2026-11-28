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
-- [동물 실물 규격] 기존 항구/목장의 Animals 시각 정본만 재사용한다.
local PortBuildings = require(script.Parent:WaitForChild("PortBuildings"))
-- [발견물 외형] 백과 실물 대표 모양 연출. 못 읽어도 기존 발견 흐름은 그대로 돈다.
-- [자동 배치 보정] 보정표(제외·폰 숨김·배율·회전·높이). 못 읽어도 배치는 그대로 돈다.
local okOverrides, PlacementOverridesMod = pcall(function()
	return require(script.Parent:WaitForChild("PlacementOverrides", 5))
end)
if not okOverrides then PlacementOverridesMod = nil end
local okStage, DiscoveryStage = pcall(function()
	return require(script.Parent:WaitForChild("DiscoveryStage", 5))
end)
if not okStage then DiscoveryStage = nil end
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
-- [게임 스크립트 권한] SurfaceAppearance.ColorMap은 플러그인 권한에서만 읽힌다. 읽기 실패 시 원본 PBR로 보고 보존한다.
local function surfaceHasColorMap(sa: Instance?): boolean
	if not sa then return false end
	local ok, mapped = pcall(function() return (sa :: any).ColorMap ~= "" end)
	return (not ok) or mapped == true
end

local function addIcon(button: TextButton, key: string)
	local id = (AssetIds :: any)[key]
	if not id then return nil end
	-- [지상 전투 원화] 완성형 원형 PNG는 기존 금속 테두리·가죽 배경 위에 겹치지 않는다.
	-- Roblox Image 자산 등록 이전에는 호출부가 기존 아이콘을 그대로 사용한다.
	if string.sub(key, 1, 11) == "Menu/field_" then
		button.BackgroundTransparency = 1
		button.ClipsDescendants = false
		local gradient = button:FindFirstChildOfClass("UIGradient")
		if gradient then gradient.Enabled = false end
		local outline = button:FindFirstChildOfClass("UIStroke")
		-- [승인 원화·버튼 테두리] 공격 버튼의 기존 금색 UIStroke는 보이게 유지한다.
		if outline then outline.Enabled = button.Name == "FieldAttack" end
		local leather = button:FindFirstChild("FieldLeatherTexture")
		if leather then leather.Visible = false end
		local art = Instance.new("ImageLabel")
		art.Name = "FieldButtonIcon"
		art.BackgroundTransparency = 1
		art.AnchorPoint = Vector2.new(0.5, 0.5)
		art.Position = UDim2.fromScale(0.5, 0.5)
		art.Size = UDim2.fromScale(1, 1)
		art.ScaleType = Enum.ScaleType.Fit
		art.Image = "rbxassetid://" .. tostring(id)
		art.ImageColor3 = Color3.new(1, 1, 1)
		art.ZIndex = button.ZIndex + 3
		art.Parent = button
		button:SetAttribute("IconArtKey", key)
		return art
	end
	local painted = string.sub(key, 1, 8) == "CardArt/"
	local iconOnly = button.Name == "FieldAttack" or button.Name == "FieldDodge"
	local medallion = Instance.new("Frame")
	medallion.Name = "FieldIconMedallion"
	medallion.AnchorPoint = Vector2.new(0.5, 0.5)
	medallion.Position = UDim2.fromScale(0.5, if iconOnly then 0.5 else 0.385)
	medallion.Size = UDim2.fromScale(if iconOnly then 0.94 else (if painted then 0.83 else 0.82),
		if iconOnly then 0.94 else (if painted then 0.74 else 0.76))
	medallion.BackgroundColor3 = if button.Name == "FieldDodge" then Color3.fromRGB(12, 72, 87)
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
	rim.Color = if button.Name == "FieldDodge" then Color3.fromRGB(120, 244, 233)
		elseif button.Name == "FieldAttack" then Color3.fromRGB(255, 207, 143)
		else Color3.fromRGB(245, 208, 128)
	rim.Thickness = if button.Name == "FieldDodge" then 3 elseif button.Name == "FieldAttack" then 2.5
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

-- [항구 고유 지형] 등록된 지역별 자연·건축 실물을 교체해 실재 항구의 지리 특성을 나타낸다.
-- 이름을 특정하지 않은 나머지 항구도 Ports 원본 위도·경도와 특산품으로 유형을 결정한다.
-- 전투/보상/지도 좌표는 고치지 않고 장면 마지막 원경 모델 1종과 약한 색감만 변경한다.
local PORT_NATURE = {
	venice="lagoon", amsterdam="lagoon", rotterdam="lagoon", antwerp="river",
	hamburg="river", london="river", rouen="river", bordeaux="river",
	lisbon="cliff_coast", porto="cliff_coast", copenhagen="islands",
	stockholm="islands", bergen="fjord", oslo="fjord", edinburgh="moor",
	glasgow="moor", seville="farmland", naples="volcanic", athens="ruins",
	cape_town="cliff_coast", algiers="arid_coast", alexandria="river",
	dakar="arid_coast", zanzibar="mangrove", mombasa="mangrove", kilwa="mangrove",
	goa="jungle_coast", calcutta="delta", shanghai="delta", canton="delta",
	singapore="mangrove", batavia="volcanic", nagasaki="mountain_coast",
	busan="mountain_coast", hakodate="northern_coast",
	new_orleans="delta", new_york="river", havana="reef", san_juan="reef",
	san_francisco="cliff_coast", rio="mountain_coast", valparaiso="cliff_coast",
	sydney="woodland", auckland="volcanic", guam="reef", honolulu="volcanic", suva="reef",
	hobart="mountain_coast", perth="coast", darwin="mangrove", port_moresby="jungle_coast",
	tahiti="reef", acapulco="mountain_coast", panama="jungle_coast", guayaquil="delta",
	callao="arid_coast", sitka="northern_coast", vancouver="fjord",
}
-- 문화권의 대표 랜드마크 앞에 들어가는 3번째 실물만 항구 지리와 탐험지로 교체한다.
-- 없는 자산을 그리지 않고 기존 FieldScene.stageFeature 등록 검사 경로를 통과한다.
local PORT_NATURE_MODELS = {
	lagoon = { {"Terrain","ground-riverbendbank",16,0.72,-0.48}, {"Terrain","bridge-stone",15,-0.71,-0.62} },
	river = { {"Terrain","river-stone-bank",14,0.73,-0.49}, {"Terrain","ground-riverside",17,-0.75,-0.65} },
	fjord = { {"Terrain","cliff-large-stone",29,0.82,-0.67}, {"Terrain","cliff-cornerlarge-stone",28,-0.83,-0.74} },
	islands = { {"Terrain","cliff-diagonal-rock",26,0.81,-0.72}, {"Terrain","tree-pinedefaulta",19,-0.76,-0.44} },
	moor = { {"Terrain","rock-largec",15,0.73,-0.53}, {"Town","tree-crooked",20,-0.78,-0.39} },
	farmland = { {"Terrain","crops-wheatstageb",12,0.72,-0.49}, {"Town","windmill",25,-0.81,-0.78} },
	volcanic = { {"Terrain","cliff-blockdiagonal-rock",28,0.84,-0.65}, {"Terrain","rock-talld",16,-0.77,-0.46} },
	ruins = { {"Terrain","ruins-pillar-decorated",20,0.78,-0.61}, {"Terrain","greek-ruins-a",22,-0.83,-0.73} },
	cliff_coast = { {"Terrain","cliff-cornerinnertop-rock",28,0.84,-0.61}, {"Terrain","cliff-large-rock",29,-0.86,-0.69} },
	arid_coast = { {"Terrain","mystic-sand-dune",24,0.81,-0.64}, {"Terrain","cliff-diagonal-rock",26,-0.82,-0.69} },
	mangrove = { {"Terrain","tropical-palm-tall",22,0.76,-0.55}, {"Terrain","ground-riverbendbank",15,-0.77,-0.60} },
	jungle_coast = { {"Terrain","east-bamboo-grove",17,0.79,-0.52}, {"Terrain","tropical-palm-tall",21,-0.75,-0.69} },
	delta = { {"Terrain","ground-riverbendbank",17,0.79,-0.55}, {"Terrain","bridge-wood",15,-0.74,-0.58} },
	mountain_coast = { {"Terrain","cliff-diagonal-rock",29,0.84,-0.68}, {"Terrain","tree-oak",21,-0.75,-0.54} },
	northern_coast = { {"Terrain","north-pine-fall",21,0.75,-0.55}, {"Terrain","cliff-large-stone",29,-0.83,-0.68} },
	reef = { {"Terrain","platform-beach",24,0.81,-0.74}, {"Terrain","coast-grass-patch",10,-0.75,-0.45} },
	woodland = { {"Terrain","tree-plateau",22,0.78,-0.61}, {"Terrain","forest-bush-detailed",9,-0.72,-0.38} },
	mineral = { {"Terrain","cliff-cave-rock",28,0.84,-0.73}, {"Terrain","rock-largea",16,-0.76,-0.45} },
	forest = { {"Terrain","tree-oak",20,0.75,-0.61}, {"Terrain","forest-bush-detailed",10,-0.72,-0.37} },
	coast = { {"Terrain","cliff-diagonal-rock",24,0.82,-0.69}, {"Terrain","river-stone-bank",12,-0.75,-0.44} },
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
	-- [정식 등록 시 자동 사용] 원본 PBR/텍스처가 있으면 그대로 두고 맵 없는 면만 색 보정.
	["kenney_rock_largeB"] = Color3.fromRGB(150, 144, 130),
	["kenney_rock_largeD"] = Color3.fromRGB(137, 129, 114),
	["kenney_rock_tallE"] = Color3.fromRGB(143, 135, 122),
	["kenney_rock_smallFlatA"] = Color3.fromRGB(151, 143, 128),
	["kenney_stone_largeB"] = Color3.fromRGB(172, 175, 170),
	["kenney_stone_smallFlatA"] = Color3.fromRGB(159, 158, 151),
	["kenney_tree_fat"] = Color3.fromRGB(84, 139, 73),
	["kenney_tree_defaultDark"] = Color3.fromRGB(72, 124, 68),
	["kenney_tree_pinetallD_detailed"] = Color3.fromRGB(87, 128, 109),
	["kenney_tree_palmShort"] = Color3.fromRGB(82, 144, 85),
	["kenney_stump_old"] = Color3.fromRGB(121, 98, 70),
	["kenney_stump_roundDetailed"] = Color3.fromRGB(126, 101, 71),
	["kenney_log_stackLarge"] = Color3.fromRGB(128, 99, 69),
}
local function placeModel(parent, kind, asset, bottom, desired, solid, tintOverride, scenicBand)
	-- [자동 배치 보정] 보정표의 제외·폰 숨김·배율(회전·높이는 아래 배치 뒤 적용)
	local ov = PlacementOverridesMod and PlacementOverridesMod.get(kind, asset)
	if ov and (ov.disabled or (ov.mobileHide and game:GetService("UserInputService").TouchEnabled)) then return nil end
	if ov and ov.scale then desired = desired * ov.scale end
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
			-- [저폴리 자산 권한 보호] RenderFidelity는 실제 게임 클라이언트에서 쓰기 권한이 없다.
			-- 원경은 승인된 저폴리 모델 자체를 선택하고, 등록 메시의 정밀도·PBR은 그대로 보존한다.
			-- [무제한 경관 경량화] 전투 오브젝트 타격은 fieldObjects가 직접 판정하므로
			-- 충돌 없는 장식은 물리 쿼리에서 제외한다. 계단·단서 등 충돌형 실물은 보존.
			if solid ~= true then d.CanQuery = false end
			-- [원경 메시 최적화] 먼 바위·나무는 충돌 유지 여부와 관계없이 그림자만 생략한다.
			-- 중경 작은 실물·근경 초소형 장식도 같은 방식으로 부하를 줄인다.
			-- 근경 대형 나무·건물 그림자와 원본 메시·텍스처는 보존한다.
			if scenicBand == "far" or (solid ~= true
				and ((scenicBand == "mid" and desired <= 9) or desired <= 4.5)) then
				d.CastShadow = false
			end
			local tint = tintOverride or FIELD_TINT[asset]
			if kind == "Animals" and tint then
				-- [야생 생물 품종색] 원본 PBR 맵/무늬와 눈·발굽·뿔 등 세부색은 보존한다.
				local sa = d:FindFirstChildOfClass("SurfaceAppearance")
				local textured = (d:IsA("MeshPart") and d.TextureID ~= "") or (sa and surfaceHasColorMap(sa))
					or d.MaterialVariant ~= ""
				for _, ch in d:GetChildren() do
					if ch:IsA("SpecialMesh") and ch.TextureId ~= "" then textured = true end
				end
				local partName = d.Name:lower()
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
					-- [원본 PBR] 등록된 색상지도와 메시 색을 변형하지 않는다.
					if sa and surfaceHasColorMap(sa) then
						-- 기존 색상지도와 Part.Color 모두 보존.
					end
				elseif not textured and not detail then
					-- [유실색 복구] 회백색으로 표시된 동물의 텍스처 없는 몸통만 품종색으로 조정.
					local low = math.min(d.Color.R, d.Color.G, d.Color.B)
					local high = math.max(d.Color.R, d.Color.G, d.Color.B)
					local faded = high - low <= 0.14 and high >= 0.58
					if sa and not surfaceHasColorMap(sa) then
						sa.Color = sa.Color:Lerp(tint, if faded then 0.7 else 0)
					else
						d.Color = d.Color:Lerp(tint, if faded then 0.82 else 0)
					end
					if not sa then
						d.Material = if faded and (d.Material == Enum.Material.SmoothPlastic or d.Material == Enum.Material.Plastic)
							and (asset == "sheep" or asset == "llama") then Enum.Material.Fabric else d.Material
						-- 원래 Leather/Concrete 재질과 색상 있는 털·피부는 강제로 덮지 않는다.
						if d.Material == Enum.Material.Leather or d.Material == Enum.Material.Concrete then
							d.Reflectance = math.min(d.Reflectance, 0.02)
						end
					end
				elseif not textured and not sa and (partName:find("mane", 1, true) or partName:find("tail", 1, true)) then
					d.Material = Enum.Material.Fabric
				end
			elseif tint and kind ~= "Town" and kind ~= "Castle" and kind ~= "Terrain" and kind ~= "Interior" then
				-- [지상전 PBR 재질] 계절색은 무늬 없는 표면에만 약하게 섞는다.
				-- 승인 메시의 ColorMap/TextureID/UV·원본 색을 강제로 덮지 않는다.
				local sa = d:FindFirstChildOfClass("SurfaceAppearance")
				local textured = (d:IsA("MeshPart") and d.TextureID ~= "") or sa ~= nil or d.MaterialVariant ~= ""
				for _, ch in d:GetChildren() do
					if ch:IsA("SpecialMesh") and ch.TextureId ~= "" then textured = true end
				end
				if not textured then
					local strength = if kind == "Terrain" then 0.40 else 0.28
					if sa then sa.Color = sa.Color:Lerp(tint, strength)
					else d.Color = d.Color:Lerp(tint, strength) end
				end
			else
				-- [흰 건물·바닥 복구] 맵 있는 승인 메시/PBR은 보존하고, 색이 빠진 흰 면만 기존 재질로 복구한다.
				local named = (kind == "Town" and (asset:find("house", 1, true) or asset:find("church", 1, true)
					or asset:find("temple", 1, true) or asset:find("tower", 1, true)
					or asset:find("windmill", 1, true) or asset:find("kenney_", 1, true)
					or asset:find("quaternius_", 1, true) or asset:find("eastasia", 1, true)
					or asset:find("wall", 1, true) or asset:find("roof", 1, true)
					or asset:find("floor", 1, true) or asset:find("arch", 1, true)
					or asset:find("door", 1, true) or asset:find("stall", 1, true)))
					or (kind == "Castle" and not asset:find("flag", 1, true))
					or (kind == "Terrain" and (asset:find("ground-", 1, true) or asset:find("ruins", 1, true)
					or asset:find("bridge", 1, true) or asset:find("column", 1, true)))
					or (kind == "Naval" and (asset:find("dock", 1, true) or asset:find("platform", 1, true)))
					or kind == "Town" or kind == "Terrain" or kind == "Interior"
				if named then
					local sa = d:FindFirstChildOfClass("SurfaceAppearance")
					local textured = (d:IsA("MeshPart") and d.TextureID ~= "") or sa ~= nil
					for _, ch in d:GetChildren() do
						if ch:IsA("SpecialMesh") and ch.TextureId ~= "" then textured = true end
					end
					local light = math.min(d.Color.R, d.Color.G, d.Color.B)
					local chroma = math.max(d.Color.R, d.Color.G, d.Color.B) - light
					local gray = light >= 0.35 and chroma <= 0.10
						and (d.Material == Enum.Material.Plastic or d.Material == Enum.Material.SmoothPlastic)
					if not textured and d.MaterialVariant == "" and (light >= 0.80 and chroma <= 0.13 or gray)
						and d.Material ~= Enum.Material.Glass and d.Material ~= Enum.Material.Metal and d.Material ~= Enum.Material.Neon then
						local role = d.Name:lower()
						local name = (asset .. " " .. d.Name):lower()
						for _, key in { "glass", "windowpane", "glazing", "hinge", "iron", "metal", "latch", "awning", "canvas", "cloth", "fabric",
							"rug", "flag", "banner", "roof", "tile", "gable", "shingle", "wood", "timber", "beam", "door", "frame",
							"fence", "bench", "cart", "table", "bookcase", "crate", "stone", "wall", "brick", "plaster",
							"trunk", "bark", "branch", "stump", "log", "leaf", "leaves", "grass", "foliage", "moss", "rock", "cliff", "sand", "snow" } do
							if role:find(key, 1, true) then name = role; break end
						end
						local mat, color = Enum.Material.Cobblestone, Color3.fromRGB(160, 141, 117)
						if name:find("trunk", 1, true) or name:find("bark", 1, true) or name:find("branch", 1, true) or name:find("stump", 1, true) or name:find("log", 1, true) then
							mat, color = Enum.Material.Wood, Color3.fromRGB(116, 83, 53)
						elseif name:find("leaf", 1, true) or name:find("leaves", 1, true) or name:find("foliage", 1, true) or name:find("tree", 1, true) or name:find("bush", 1, true) or name:find("grass", 1, true) or name:find("moss", 1, true) or name:find("plant", 1, true) then
							mat, color = Enum.Material.Grass, tint or Color3.fromRGB(87, 137, 65)
						elseif name:find("snow", 1, true) or name:find("ice", 1, true) then
							mat, color = Enum.Material.Snow, Color3.fromRGB(225, 234, 239)
						elseif name:find("sand", 1, true) then
							mat, color = Enum.Material.Sand, tint or Color3.fromRGB(194, 168, 122)
						elseif name:find("rock", 1, true) or name:find("cliff", 1, true) then
							mat, color = Enum.Material.Rock, tint or Color3.fromRGB(137, 126, 105)
						elseif name:find("fence", 1, true) or name:find("bench", 1, true) or name:find("cart", 1, true) or name:find("table", 1, true) or name:find("bookcase", 1, true) or name:find("crate", 1, true) then
							mat, color = Enum.Material.WoodPlanks, tint or Color3.fromRGB(129, 91, 60)
						elseif name:find("rug", 1, true) or name:find("flag", 1, true) or name:find("banner", 1, true)
							or name:find("awning", 1, true) or name:find("canvas", 1, true) or name:find("cloth", 1, true) or name:find("fabric", 1, true) then
							mat, color = Enum.Material.Fabric, tint or Color3.fromRGB(144, 75, 55)
						elseif name:find("glass", 1, true) or name:find("windowpane", 1, true) or name:find("glazing", 1, true) then
							mat, color = Enum.Material.Glass, Color3.fromRGB(194, 218, 222)
						elseif name:find("metal", 1, true) or name:find("iron", 1, true) or name:find("hinge", 1, true) or name:find("latch", 1, true) then
							mat, color = Enum.Material.Metal, Color3.fromRGB(100, 105, 108)
						elseif name:find("roof", 1, true) or name:find("tile", 1, true) or name:find("gable", 1, true) or name:find("shingle", 1, true) then
							mat, color = Enum.Material.Slate, Color3.fromRGB(122, 85, 63)
						elseif name:find("wood", 1, true) or name:find("beam", 1, true) or name:find("timber", 1, true)
							or name:find("door", 1, true) or name:find("frame", 1, true) or name:find("dock", 1, true) or name:find("platform", 1, true) then
							mat, color = Enum.Material.WoodPlanks, Color3.fromRGB(128, 97, 69)
						elseif name:find("path", 1, true) or name:find("ground-", 1, true) then
							mat, color = Enum.Material.Ground, Color3.fromRGB(135, 119, 91)
						elseif name:find("house", 1, true) or name:find("church", 1, true)
							or name:find("temple", 1, true) or name:find("wall", 1, true) then
							mat, color = Enum.Material.Brick, tint or Color3.fromRGB(181, 157, 128)
						elseif kind == "Terrain" then
							mat, color = Enum.Material.Ground, tint or Color3.fromRGB(135, 119, 91)
						elseif kind == "Interior" then
							mat, color = Enum.Material.WoodPlanks, tint or Color3.fromRGB(126, 92, 64)
						end
						d.Material, d.Color, d.Reflectance = mat, color, 0
						-- SurfaceAppearance가 있는 원본은 위에서 제외하므로 색 지도를 변경하지 않는다.
					end
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
		-- [원본 배율 보존] ScaleTo는 절대 배율이므로 모델의 수입 배율을 보존한다.
		local ratio = desired / axis
		if ratio ~= ratio or ratio <= 0 or ratio == math.huge then error("invalid imported model scale") end
		m:ScaleTo(m:GetScale() * ratio)
		local center, size = m:GetBoundingBox()
		-- [야생 동물 접지] 수입 리그의 투명 루트 대신 보이는 메시의 발바닥을 기준으로 배치한다.
		local visibleBottomY = math.huge
		if kind == "Animals" then
			for _, piece in m:GetDescendants() do
				if piece:IsA("BasePart") and piece.Transparency < 0.98 then
					local half = piece.Size * 0.5
					local pose = piece.CFrame
					visibleBottomY = math.min(visibleBottomY, pose.Position.Y
						- math.abs(pose.RightVector.Y) * half.X - math.abs(pose.UpVector.Y) * half.Y
						- math.abs(pose.LookVector.Y) * half.Z)
				end
			end
		end
		local b = Vector3.new(center.Position.X,
			if visibleBottomY < math.huge then visibleBottomY else center.Position.Y - size.Y / 2, center.Position.Z)
		m:PivotTo(CFrame.new(bottom - b) * m:GetPivot())
		if kind == "People" then
			Pose.relaxArms(m)
		end
	end)
	if not ok then
		m:Destroy()
		return nil
	end
	if ov then PlacementOverridesMod.apply(m, ov) end
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

local okButtonFx, ButtonFx = pcall(function() return require(script.Parent:WaitForChild("BattleButtonFx", 5)) end)
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
	-- [쿨타임] 버튼 아이콘 자체가 어두워졌다 서서히 밝아지며 준비 시 테두리만 반짝인다.
	local shade = Instance.new("Frame")
	shade.Name = "FieldCooldownShade"
	shade.AnchorPoint = Vector2.new(0, 1)
	shade.Position = UDim2.fromScale(0, 1)
	shade.Size = UDim2.fromScale(1, 1)
	shade.BackgroundColor3 = Color3.fromRGB(43, 33, 25)
	shade.BackgroundTransparency = 0.24
	shade.BorderSizePixel = 0
	shade.Visible = false
	shade.Active = false
	shade.ZIndex = b.ZIndex + 4
	shade.Parent = b
	-- [지상 재사용 연출] 초 숫자를 표시하지 않고 음영·아이콘·가장자리 빛으로 충전 상태를 알린다.
    -- 기존 쿨타임 판정·모션 버튼은 그대로 사용한다.
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
    timer.Text = ""
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
	-- [전투 버튼 효과 · 2026-11-28] 누를 때 충격 고리·불꽃·섬광(해상과 같은 모듈)
	if okButtonFx and ButtonFx then ButtonFx.attach(b) end
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
		return if xp >= 720 then 10 elseif xp >= 530 then 9 elseif xp >= 380 then 8
			elseif xp >= 260 then 7 elseif xp >= 170 then 6 elseif xp >= 100 then 5
			elseif xp >= 55 then 4 elseif xp >= 26 then 3 elseif xp >= 8 then 2 else 1
	end
	if type(opts.weaponPractice) == "table" then
		for id, xp in opts.weaponPractice do
			if type(id) == "string" and Weapons.get(id).id == id and type(xp) == "number" and xp == xp then
				local safeXp = math.floor(math.clamp(xp, 0, 10000))
				weaponPractice[id] = { xp = safeXp, rank = practiceRank(safeXp) }
			end
		end
	end
	-- [지역·계절 지형] 실제 달력 월에 맞춰 온대 사계절·북방 설기·열대 우건기·건조지대의 차이를 준다.
	-- 기존 위험도·몬스터·보상과 무관한 이번 필드 한정 시각 값이며 원본 BIOMES 테이블은 변경하지 않는다.
	local biome = table.clone(lookFor(opts.name or "", opts.portId))
	-- [대륙·항구 식별] 기존 Ports 원본 좌표·특산품을 시각적 구역 정체성으로만 읽는다.
	-- [Luau 지역변수 상한] 대륙 계산용 좌표와 이름은 이 블록에서 바로 해제한다.
	local portNature, portVisualSeed = nil, 0
	do
		local port = opts.portId and Ports.Ports[opts.portId]
		local latitude, longitude = port and port.lat or 0, port and port.lon or 0
		local portId = opts.portId or ""
		local continent = if port == nil then "generic"
			elseif table.find({ "honolulu", "guam", "tahiti", "suva", "port_moresby" }, portId) then "oceania"
			elseif portId == "port_louis" then "africa"
			elseif portId == "panama" or portId == "portobelo" then "north_america"
			elseif portId == "la_guaira" or portId == "cartagena_indias" then "south_america"
			elseif longitude < -30 then (if latitude < 10 then "south_america" else "north_america")
			elseif longitude > 100 and latitude < -9 then "oceania"
			elseif (biome.region == "wafrica" or biome.region == "swahili" or
				(latitude < -10 and longitude < 55)) then "africa"
			elseif longitude >= 38 or biome.region == "korea" or biome.region == "japan"
				or biome.region == "china" or biome.region == "malabar" or biome.region == "seasia"
				or biome.region == "ottoman" then "asia"
			else "europe"
		portNature = PORT_NATURE[portId]
		if not portNature and port then
			portNature = if latitude > 56 then "northern_coast"
				elseif latitude < -10 and latitude > -42 and continent == "oceania" then "woodland"
				elseif table.find(port.produces, "timber") then "forest"
				elseif table.find(port.produces, "iron") or table.find(port.produces, "copper")
					or table.find(port.produces, "coal") then "mineral"
				elseif table.find(port.produces, "rice") or table.find(port.produces, "spice") then "mangrove"
				elseif latitude > 25 and latitude < 36 and continent == "africa" then "arid_coast"
				elseif continent == "oceania" or (continent == "north_america" and latitude < 28) then "reef"
				elseif continent == "asia" and latitude < 20 then "jungle_coast"
				else "coast"
		end
		-- [퀘스트마다 다른 배치] 실제 siteId를 사용. 게임 RNG 및 저장·보상과 완전히 분리.
		local visualKey = portId .. "/" .. (opts.siteId or opts.name or "")
		for index = 1, #visualKey do
			portVisualSeed = (portVisualSeed * 31 + string.byte(visualKey, index)) % 2147483647
		end
		folder:SetAttribute("FieldContinent", continent)
		folder:SetAttribute("FieldPortId", portId)
		folder:SetAttribute("FieldSiteId", opts.siteId or "")
		folder:SetAttribute("FieldPortNature", portNature or "unknown")
		folder:SetAttribute("FieldVisualSeed", portVisualSeed)
	end
	local month = os.date("!*t").month
	-- [Studio 촬영] 기존 계절 계산만 검증한다. 실제 서버·클라이언트의 달력은 변경하지 않는다.
	if RunService:IsStudio() and type(opts.studioCaptureMonth) == "number" and opts.studioCaptureMonth % 1 == 0
		and opts.studioCaptureMonth >= 1 and opts.studioCaptureMonth <= 12 then
		month = opts.studioCaptureMonth
	end
	do
		local port = opts.portId and Ports.Ports[opts.portId]
		if port and port.lat < -10 then month = (month + 5) % 12 + 1 end
	end
	local season = if month >= 3 and month <= 5 then "봄" elseif month >= 6 and month <= 8 then "여름"
		elseif month >= 9 and month <= 11 then "가을" else "겨울"
	local region = biome.region or ""
	local northern = region == "nordic" or region == "hanse" or region == "britain" or region == "stone"
	local tropical = region == "seasia" or region == "tropic" or region == "malabar"
		or region == "pacific" or region == "creole"
	-- 태평양 전역을 열대로 취급하지 않는다. 실제 조사 항구의 계절·수목만 보정한다.
	if string.match(opts.siteId or "", "^pac_survey_%d%d$") then
		tropical = table.find({ "darwin", "port_moresby", "suva", "tahiti", "honolulu", "guam", "acapulco", "panama", "guayaquil" }, opts.portId or "") ~= nil
		northern = table.find({ "sitka", "vancouver" }, opts.portId or "") ~= nil
	end
	local arid = not tropical and (region == "desert" or region == "ottoman" or region == "med"
		or region == "wafrica" or region == "swahili") -- 해변의 모래는 건조 기후의 근거가 아니다.
	if string.match(opts.siteId or "", "^pac_survey_%d%d$") then arid = opts.portId == "callao" end
	local climateZone = if northern then "북방" elseif tropical then "열대"
		elseif arid then "건조" else "온대"
	local monsoon = tropical and month >= 5 and month <= 10
	local seasonName = if tropical then (if monsoon then "우기" else "건기")
		elseif arid then (if season == "겨울" then "서늘한 계절" else "건조한 계절")
		else season
	local winterScene = season == "겨울" and (northern or biome.mat == Enum.Material.Snow)
	if winterScene then
		biome.ground = biome.ground:Lerp(Color3.fromRGB(218, 226, 228), 0.83)
		biome.mat = Enum.Material.Snow
		biome.fog = biome.fog:Lerp(Color3.fromRGB(187, 208, 223), 0.38)
	elseif northern and biome.mat == Enum.Material.Snow then
		biome.mat = Enum.Material.Grass
		biome.ground = Color3.fromRGB(91, 117, 86):Lerp(biome.ground, if season == "여름" then 0.15 else 0.42)
	elseif not arid and not tropical and biome.mat == Enum.Material.Grass then
		if season == "봄" then biome.ground = biome.ground:Lerp(Color3.fromRGB(91, 154, 83), 0.30)
		elseif season == "가을" then biome.ground = biome.ground:Lerp(Color3.fromRGB(155, 127, 77), 0.37)
		elseif season == "겨울" then biome.ground = biome.ground:Lerp(Color3.fromRGB(151, 153, 131), 0.33) end
	elseif tropical and monsoon then
		biome.ground = biome.ground:Lerp(Color3.fromRGB(53, 112, 71), 0.27)
		biome.fog = biome.fog:Lerp(Color3.fromRGB(157, 195, 182), 0.30)
	end
	folder:SetAttribute("FieldSeason", season)
	folder:SetAttribute("FieldSeasonLabel", seasonName)
	folder:SetAttribute("FieldClimateZone", climateZone)
	folder:SetAttribute("FieldSeasonMonth", month)
	local visualMobile = game:GetService("UserInputService").TouchEnabled
	folder:SetAttribute("FieldDifficultyGrade", math.clamp(math.floor(tonumber(opts.danger) or 1), 1, 5))
	folder:SetAttribute("FieldRegion", biome.region or "generic")
	folder:SetAttribute("FieldEncounterPattern", biome.encounter or biome.kind)
	local questName = opts.name or ""
	local questTerrain = if string.find(questName, "화산", 1, true) or string.find(questName, "용암", 1, true)
			or string.find(questName, "분화구", 1, true) then "volcanic"
		elseif string.find(questName, "빙하", 1, true) or string.find(questName, "설원", 1, true)
			or string.find(questName, "빙설", 1, true) then "glacier"
		elseif string.find(questName, "늪", 1, true) or string.find(questName, "습지", 1, true)
			or string.find(questName, "맹그로브", 1, true) then "swamp"
		elseif string.find(questName, "정글", 1, true) or string.find(questName, "밀림", 1, true)
			or string.find(questName, "우림", 1, true) then "jungle"
		elseif string.find(questName, "기록", 1, true) or string.find(questName, "보관소", 1, true)
			or string.find(questName, "도서관", 1, true) or string.find(questName, "천문대", 1, true)
			or string.find(questName, "진열실", 1, true) or string.find(questName, "약방", 1, true)
			or string.find(questName, "학회", 1, true) or string.find(questName, "관측", 1, true)
			or string.find(questName, "대학", 1, true) or string.find(questName, "수도원", 1, true)
			or string.find(questName, "실험실", 1, true) or string.find(questName, "자료실", 1, true)
			or string.find(questName, "학자와의 대화", 1, true) or string.find(questName, "병원", 1, true)
			or string.find(questName, "식물원", 1, true) then "archive"
		elseif string.find(questName, "광산", 1, true) or string.find(questName, "탄광", 1, true) or string.find(questName, "채석", 1, true) or string.find(questName, "폐광", 1, true) then "mine"
		elseif string.find(questName, "폭포", 1, true) or string.find(questName, "계곡", 1, true)
			or string.find(questName, "절벽", 1, true) or string.find(questName, "고지", 1, true)
			or string.find(questName, "산맥", 1, true) or string.find(questName, "봉우리", 1, true)
			or string.find(questName, "고개", 1, true) or string.find(questName, "바위산", 1, true)
			or string.find(questName, "후지 산", 1, true) then "highland"
		elseif string.find(questName, "유적", 1, true) or string.find(questName, "신전", 1, true)
			or string.find(questName, "열석", 1, true) or string.find(questName, "봉분", 1, true)
			or string.find(questName, "석상", 1, true) or string.find(questName, "발굴지", 1, true)
			or string.find(questName, "폐허", 1, true) or string.find(questName, "피라미드", 1, true)
			or string.find(questName, "사원", 1, true) then "ruins"
		elseif string.find(questName, "성채", 1, true) or string.find(questName, "요새", 1, true)
			or string.find(questName, "성벽", 1, true) or string.find(questName, "방벽", 1, true)
			or string.find(questName, "성 해자", 1, true) then "fort"
		elseif string.find(questName, "농장", 1, true) or string.find(questName, "과수원", 1, true)
			or string.find(questName, "감자밭", 1, true) or string.find(questName, "아마 밭", 1, true)
			or string.find(questName, "올리브 밭", 1, true) then "farm"
		elseif string.find(questName, "호수", 1, true) or string.find(questName, "강", 1, true)
			or string.find(questName, "습지", 1, true) then "lake"
		elseif string.find(questName, "사막", 1, true) or string.find(questName, "모래", 1, true)
			or string.find(questName, "오아시스", 1, true) then "desert"
		elseif string.find(questName, "정글", 1, true) or string.find(questName, "밀림", 1, true)
			or string.find(questName, "숲", 1, true) then "forest"
		elseif string.find(questName, "해변", 1, true) or string.find(questName, "난파", 1, true)
			or string.find(questName, "항만", 1, true) or string.find(questName, "포구", 1, true)
			or string.find(questName, "해적 소굴", 1, true) or string.find(questName, "해안", 1, true)
			or string.find(questName, "해협", 1, true) or string.find(questName, "갯벌", 1, true)
			or string.find(questName, "석호", 1, true) or string.find(questName, "등대", 1, true) then "coast"
		elseif string.find(questName, "평원", 1, true) or string.find(questName, "들판", 1, true)
			or string.find(questName, "초원", 1, true) then "plains"
		elseif biome.kind == "forest" then "forest"
		elseif biome.kind == "coast" then "coast"
		elseif biome.kind == "mine" then "mine"
		elseif biome.mat == Enum.Material.Sand then "desert"
		elseif biome.encounter == "ruins" then "ruins"
		elseif biome.encounter == "highland" then "highland"
		else "plains"
	-- [지점 ID] 기존 자동 학문 탐험도 기관 정원으로 연결한다. 적·보상·위험도용 바이옴은 바꾸지 않는다.
	do
		local discipline = string.match(opts.siteId or "", "^auto_([%a]+)_")
		if discipline and table.find({ "chemistry", "physics", "philosophy", "medicine", "astronomy", "navigation", "language", "weather" }, discipline) then
			questTerrain = "archive"
		end
	end
	-- [지점별 실제 지형] 기존 탐험 지점 ID의 지리·용도를 이름 추정보다 우선한다.
	do
		local exact = {
			london_fields = "plains",
			salisbury_plain = "plains",
			london_chalk = "coast",
			bergen_cliffs = "coast",
			gibraltar_cliff = "coast",
			giants_causeway = "coast",
			visby_cliffs = "coast",
			oran_cliffs = "coast",
			viking_harbor = "coast",
			bergen_whale = "coast",
			bergen_kelp_coast = "coast",
			venice_lagoon = "coast",
			stockholm_woods = "forest",
			antwerp_willow_river = "lake",
			seville_groves = "lake",
			amsterdam_canals = "lake",
			amsterdam_polder = "lake",
			stockholm_mine = "mine",
			falun_mine = "mine",
			carrara_quarry = "mine",
			marble_quarry = "mine",
			london_tin = "mine",
			plymouth_tin = "mine",
			vesuvius_slopes = "volcanic",
			palermo_etna = "volcanic",
			palermo_etna2 = "volcanic",
			edo_fuji = "highland",
			cape_table_mountain = "highland",
			pompeii_ruins = "ruins",
			pont_du_gard = "ruins",
			alexandria_library = "ruins",
			brittany_stones = "ruins",
			edo_castle = "fort",
			quebec_citadel = "fort",
			hadrian_hills = "fort",
			antwerp_monastery_herbs = "archive",
			amsterdam_gardens = "archive",
			genoa_gardens = "archive",
			hamburg_lab = "archive",
			genoa_instruments = "archive",
			royal_archive = "archive",
			london_lab = "archive",
			london_hospital = "archive",
			copenhagen_observatory = "archive",
			amsterdam_telescope = "archive",
			provence_fields = "farm",
			genoa_olive = "farm",
			dublin_potatoes = "farm",
			antwerp_flax_fields = "farm",
			antwerp_flax = "farm",
			norman_orchards = "farm",
			porto_douro = "farm",
			funchal_vineyards = "farm",
			funchal_grapes = "farm",
			saffron_fields = "farm",
			canton_tea = "farm",
			calicut_pepper = "farm",
			mocha_coffee = "farm",
			zanzibar_spice = "farm",
			sao_tome_cocoa = "farm",
			-- 북해·발트해 지점별 지시서: 항만, 갯벌, 피오르, 거석 유적, 학술지.
			antwerp_cabinet = "archive",
			antwerp_apothecary = "archive",
			venice_arsenal = "archive",
			edinburgh_hospital = "archive",
			amsterdam_garden = "archive",
			rouen_powder = "archive",
			lisbon_apothecary = "archive",
			hamburg_docks = "archive",
			bergen_arctic_log = "archive",
			london_pewter_shop = "archive",
			london_tower_armory = "archive",
			hamburg_hansa_hall = "archive",
			hamburg_speicher = "archive",
			lubeck_hansa_hall = "archive",
			rouen_coast = "coast",
			copenhagen_shore = "coast",
			edinburgh_coast = "coast",
			edinburgh_legend = "coast",
			amsterdam_fog = "coast",
			lisbon_legend = "coast",
			bergen_maelstrom = "coast",
			bergen_whale_station = "coast",
			amsterdam_dogger = "coast",
			rouen_mont_saint_michel = "coast",
			copenhagen_eider_isle = "coast",
			dunkirk_flats = "coast",
			amsterdam_herring_quay = "coast",
			gdansk_harbor = "coast",
			stockholm_skerries = "coast",
			copenhagen_sound = "coast",
			bordeaux_quay = "coast",
			bergen_wharf = "coast",
			bergen_fjord = "coast",
			gdansk_amber_beach = "coast",
			amsterdam_flats = "coast",
			gothenburg_eider = "coast",
			plymouth_sound = "coast",
			hull_whalers = "coast",
			glasgow_clyde = "coast",
			lubeck_baltic_coast = "coast",
			oslo_fjord = "coast",
			gothenburg_forest = "forest",
			copenhagen_birch = "forest",
			runestone_field = "ruins",
			boyne_valley = "ruins",
			orkney_village = "ruins",
			orkney_brodgar = "ruins",
			uppsala_mounds = "ruins",
			dublin_stones = "ruins",
			stockholm_runes = "ruins",
			oslo_viking_ships = "ruins",
			london_tower = "fort",
			edinburgh_castle_rock = "fort",
			edinburgh_highlands = "highland",
			edinburgh_heather = "highland",
			glasgow_highlands = "highland",
			edinburgh_colliery = "mine",
			hamburg_estuary = "lake",
			gothenburg_beaver_lake = "lake",
			rotterdam_dike = "lake",
			dublin_cranberry = "swamp",
			bergen_ice_edge = "glacier",
			hamburg_hops_farm = "farm",
			marseille_calanques = "coast",
			gibraltar_strait = "coast",
			gibraltar_cave = "coast",
			la_rochelle_towers = "coast",
			porto_ribeira = "coast",
			cadiz_bay = "coast",
			cadiz_treasure_fleet = "coast",
			istanbul_bosphorus = "coast",
			tangier_strait = "coast",
			riga_gulf = "coast",
			helsinki_archipelago = "coast",
			koenigsberg_amber = "coast",
			tangier_pillars = "coast",
			azores_calm = "coast",
			ragusa_coast = "coast",
			tripoli_dig = "coast",
			toulon_arsenal = "coast",
			aegean_isles = "coast",
			trieste_karst = "coast",
			messina_strait = "coast",
			coral_banks = "coast",
			livorno_lab = "archive",
			naples_coins = "archive",
			seville_cathedral = "archive",
			lisbon_navigators = "archive",
			rouen_cathedral = "archive",
			antwerp_cathedral = "archive",
			barcelona_gothic = "archive",
			barcelona_market = "archive",
			algiers_kasbah = "archive",
			palermo_cathedral = "archive",
			istanbul_bazaar = "archive",
			riga_old_town = "archive",
			istanbul_hagia = "archive",
			riga_guild_hall = "archive",
			palma_cathedral = "archive",
			smyrna_bazaar = "archive",
			casablanca_medina = "archive",
			marseille_salt = "swamp",
			la_rochelle_salt = "swamp",
			valencia_albufera = "swamp",
			cagliari_salt = "swamp",
			damietta_nile = "swamp",
			gibraltar_rock = "highland",
			barcelona_montjuic = "highland",
			safi_potters = "highland",
			tripoli_oasis = "desert",
			algiers_oasis = "desert",
			valletta_bastions = "fort",
			ragusa_walls = "fort",
			tallinn_walls = "fort",
			visby_ruins = "fort",
			seville_alhambra = "fort",
			petersburg_fortress = "fort",
			valletta_walls2 = "fort",
			thessaloniki_walls = "fort",
			acre_crusader = "fort",
			malaga_alcazaba = "fort",
			corfu_fortress = "fort",
			tunis_carthage = "ruins",
			athens_acropolis = "ruins",
			alexandria_pharos = "ruins",
			athens_parthenon = "ruins",
			alex_pharos2 = "ruins",
			tunis_ruins2 = "ruins",
			syracuse_theatre = "ruins",
			ancona_arch = "ruins",
			split_palace = "ruins",
			crete_knossos = "ruins",
			rhodes_colossus = "ruins",
			benghazi_ruins = "ruins",
			bone_ruins = "ruins",
			petersburg_neva = "lake",
			azores_crater = "lake",
			petersburg_forest = "forest",
			las_palmas_dragon = "forest",
			tallinn_forest = "forest",
			corsica_maquis = "forest",
			beirut_cedars = "forest",
			las_palmas_volcano = "volcanic",
			valencia_orchard = "farm",
			helsinki_gulf = "glacier",
			cyprus_copper = "mine",
			cartagena_mines = "mine",
			agadir_argan = "forest",
			ouidah_forest = "forest",
			colombo_cinnamon = "forest",
			praia_cliffs = "volcanic",
			aden_crater = "volcanic",
			ternate_volcano = "volcanic",
			saint_louis_river = "lake",
			basra_canals = "lake",
			cochin_backwaters = "lake",
			tianjin_canal = "lake",
			batavia_canal = "lake",
			brunei_water = "lake",
			goree_island = "coast",
			dakar_cape = "coast",
			lagos_lagoon = "coast",
			sao_tome_coast = "coast",
			luanda_coast = "coast",
			helena_mid = "coast",
			cape_good_hope = "coast",
			mombasa_reef = "coast",
			mogadishu_coast = "coast",
			aden_straits = "coast",
			jeddah_pilgrim = "coast",
			jeddah_reef = "coast",
			muscat_pearl = "coast",
			bandar_hormuz = "coast",
			calicut_vasco = "coast",
			cochin_nets = "coast",
			maldives_atoll = "coast",
			madras_coast = "coast",
			malacca_spice = "coast",
			louis_dodo = "coast",
			indian_chinese_ship = "coast",
			manila_galleon = "coast",
			amoy_harbor = "coast",
			shanghai_estuary = "coast",
			nagasaki_dejima = "coast",
			nagasaki_kuroshio = "coast",
			hakodate_bay = "coast",
			incheon_flats = "coast",
			singapore_strait = "coast",
			makassar_pearl = "coast",
			komodo_island = "coast",
			typhoon_sea = "coast",
			bissau_mangrove = "swamp",
			calabar_delta = "swamp",
			basra_marsh = "swamp",
			calcutta_delta = "swamp",
			freetown_peninsula = "highland",
			goa_ghats = "highland",
			elmina_castle = "fort",
			cape_coast_castle = "fort",
			mozambique_island = "fort",
			mombasa_fort = "fort",
			muscat_forts = "fort",
			diu_fortress = "fort",
			malacca_fort = "fort",
			manila_walls = "fort",
			osaka_castle = "fort",
			tainan_fort = "fort",
			elmina_goldfields = "mine",
			mozambique_gold = "mine",
			colombo_gems = "mine",
			silver_mine = "mine",
			kilwa_ruins = "ruins",
			muscat_persepolis = "ruins",
			madras_temple = "ruins",
			macau_ruins = "ruins",
			ningbo_temple = "ruins",
			bangkok_temples = "ruins",
			rangoon_shwedagon = "ruins",
			java_borobudur = "ruins",
			zanzibar_stone = "archive",
			surat_bazaar = "archive",
			goa_church = "archive",
			calcutta_silk = "archive",
			canton_factories = "archive",
			shanghai_silk = "archive",
			osaka_market = "archive",
			busan_waegwan = "archive",
			hoi_an_lanterns = "archive",
			jade_market = "archive",
			nagasaki_armory = "archive",
			istanbul_arsenal = "archive",
			mombasa_fort_records = "archive",
			sao_tome_peak = "jungle",
			angkor_jungle = "jungle",
			borneo_rainforest = "jungle",
			benguela_desert = "desert",
			ambon_spice = "farm",
			banda_nutmeg = "farm",
			lagos_benin_road = "plains",
			surat_agra = "plains",
			beijing_road = "plains",
			-- 북미·카리브·중남미: 실제 지형과 기록 조사 장소를 구분한다.
			halifax_citadel = "fort",
			louisbourg_fort = "fort",
			stjohns_banks = "coast",
			quebec_wilds = "forest",
			survey_am_d = "plains",
			boston_church = "archive",
			boston_whalers = "coast",
			newyork_harbor = "lake",
			niagara_trip = "lake",
			philadelphia_hall = "archive",
			charleston_rice = "farm",
			survey_am_b = "farm",
			neworleans_delta = "swamp",
			nassau_pirates = "coast",
			veracruz_road = "highland",
			survey_am_c = "mine",
			veracruz_battlefield = "plains",
			campeche_maya = "ruins",
			kingston_royal = "fort",
			hurricane_sea = "coast",
			survey_am_a = "coast",
			sanjuan_morro = "fort",
			bridgetown_sugar = "farm",
			trinidad_pitch = "lake",
			laguaira_coast = "coast",
			cartagena_walls = "fort",
			portobelo_fair = "archive",
			paramaribo_jungle = "jungle",
			belem_amazon = "swamp",
			recife_reef = "coast",
			salvador_church = "archive",
			rio_sugarloaf = "highland",
			rio_gold = "mine",
			montevideo_plata = "lake",
			horn_trip = "coast",
			buenosaires_pampas = "plains",
			andes_route = "highland",
			potosi_trip = "mine",
			auto_mystery_mys_sargasso = "archive",
			auto_lostland_el_dorado = "archive",
			santodomingo_amber = "mine",
			auto_mystery_mys_bermuda = "archive",
			auto_lostland_cibola = "archive",
			havana_fort = "fort",
			havana_orchard = "farm",
			-- 태평양 탐사: 항구의 실제 자연환경과 외지 유물·해도 조사 장소를 구분한다.
			pac_survey_00 = "forest",
			pac_survey_01 = "forest",
			pac_survey_02 = "coast",
			pac_survey_03 = "swamp",
			pac_survey_04 = "forest",
			pac_survey_05 = "jungle",
			pac_survey_06 = "jungle",
			pac_survey_07 = "coast",
			pac_survey_08 = "volcanic",
			pac_survey_09 = "coast",
			pac_survey_10 = "archive",
			pac_survey_11 = "archive",
			pac_survey_12 = "archive",
			pac_survey_13 = "coast",
			pac_survey_14 = "archive",
			pac_survey_15 = "coast",
			pac_survey_16 = "coast",
			pac_survey_17 = "coast",
			pac_survey_18 = "coast",
			pac_survey_19 = "coast",
			pac_survey_20 = "coast",
			-- 학문·유물·전설: 발견 대상과 실제 조사 장소를 대조한 개별 지형.
			auto_relic_london_low = "archive",
			auto_relic_amsterdam_low = "archive",
			auto_relic_lisbon_low = "archive",
			auto_zoology_bergen_low = "coast",
			auto_zoology_hamburg_low = "coast",
			auto_zoology_marseille_low = "coast",
			auto_zoology_gdansk_low = "swamp",
			auto_physics_genoa_low = "archive",
			auto_physics_amsterdam_low = "archive",
			auto_physics_venice_low = "archive",
			auto_physics_london_mid = "archive",
			auto_site_naples_mid = "ruins",
			auto_site_naples_high = "ruins",
			auto_site_lisbon_low = "fort",
			auto_site_stockholm_mid = "fort",
			auto_site_copenhagen_mid = "fort",
			auto_site_bergen_low = "coast",
			auto_site_marseille_mid = "ruins",
			auto_site_london_low = "ruins",
			auto_geography_london_low = "coast",
			auto_geography_bergen_low = "coast",
			auto_geography_stockholm_low = "coast",
			auto_geography_genoa_low = "coast",
			auto_geography_hamburg_low = "coast",
			auto_geography_lisbon_low = "coast",
			auto_astronomy_copenhagen_low = "archive",
			auto_astronomy_gothenburg_low = "archive",
			auto_astronomy_edinburgh_low = "archive",
			auto_astronomy_gdansk_mid = "archive",
			auto_astronomy_bergen_low = "archive",
			auto_astronomy_amsterdam_low = "archive",
			auto_astronomy_london_mid = "archive",
			auto_mineral_edinburgh_low = "highland",
			auto_mineral_dublin_low = "mine",
			auto_mineral_bergen_low = "highland",
			auto_mineral_london_low = "mine",
			auto_mineral_genoa_mid = "mine",
			auto_mineral_naples_low = "volcanic",
			auto_mineral_livorno_mid = "mine",
			auto_myth_bergen_high = "archive",
			auto_myth_edinburgh_low = "coast",
			auto_myth_copenhagen_mid = "coast",
			auto_myth_genoa_mid = "coast",
			auto_myth_naples_high = "archive",
			auto_myth_rouen_mid = "coast",
			auto_myth_london_mid = "coast",
			auto_myth_dublin_high = "archive",
			auto_mystery_mys_green_children = "plains",
			auto_mystery_mys_stone_circle = "ruins",
			auto_mystery_mys_roanoke = "archive",
			auto_mystery_mys_voynich = "archive",
			auto_mystery_mys_oak_island = "archive",
			auto_mystery_mys_piri_reis = "archive",
			auto_mystery_mys_gevaudan = "archive",
			auto_mystery_mys_greenland_norse = "archive",
			auto_mystery_mys_rongorongo = "archive",
			auto_mystery_mys_mary_celeste = "archive",
			auto_mystery_mys_franklin = "archive",
			auto_mystery_mys_antikythera = "archive",
			auto_mystery_mys_flannan = "archive",
			auto_mystery_lost_terra_incognita = "archive",
			auto_mystery_lost_edge_dragons = "archive",
			auto_mystery_lost_thule = "archive",
			auto_mystery_lost_antillia = "archive",
			auto_lostland_hy_brasil = "archive",
			auto_lostland_blessed_isles = "archive",
			auto_lostland_terra_australis = "archive",
			auto_lostland_lemuria = "archive",
			auto_lostland_prester_john = "archive",
			auto_lostland_hyperborea = "archive",
			auto_lostland_astheria_shore = "coast",
			auto_lostland_astheria_ruins = "ruins",
			auto_lostland_astheria_heart = "archive",
			auto_myth_gdansk_low = "coast",
			auto_chemistry_rouen_low = "archive",
			auto_chemistry_bordeaux_low = "archive",
			auto_chemistry_london_low = "archive",
			auto_chemistry_antwerp_low = "archive",
			auto_chemistry_amsterdam_low = "archive",
			auto_chemistry_hamburg_low = "archive",
			auto_chemistry_venice_low = "archive",
			auto_chemistry_marseille_low = "archive",
			auto_chemistry_london_mid = "archive",
			auto_chemistry_seville_mid = "archive",
			auto_chemistry_dublin_low = "archive",
			auto_philosophy_amsterdam_low = "archive",
			auto_philosophy_london_mid = "archive",
			auto_philosophy_edinburgh_low = "archive",
			auto_philosophy_naples_low = "archive",
			auto_philosophy_rouen_low = "archive",
			auto_philosophy_bordeaux_low = "archive",
			auto_philosophy_antwerp_low = "archive",
			auto_philosophy_hamburg_mid = "archive",
			auto_philosophy_hamburg_high = "archive",
			auto_philosophy_edinburgh_high = "archive",
			auto_medicine_marseille_low = "archive",
			auto_medicine_rouen_low = "archive",
			auto_medicine_venice_low = "archive",
			auto_medicine_london_mid = "archive",
			auto_medicine_antwerp_low = "archive",
			auto_medicine_edinburgh_low = "archive",
			auto_medicine_lisbon_low = "archive",
			auto_medicine_amsterdam_low = "archive",
			auto_medicine_genoa_low = "archive",
			auto_medicine_gothenburg_low = "archive",
			auto_navigation_genoa_low = "archive",
			auto_navigation_venice_mid = "archive",
			auto_navigation_lisbon_low = "archive",
			auto_navigation_london_low = "archive",
			auto_navigation_amsterdam_low = "archive",
			auto_navigation_seville_low = "archive",
			auto_navigation_edinburgh_mid = "archive",
			auto_navigation_london_high = "archive",
			auto_navigation_antwerp_mid = "archive",
			auto_navigation_gothenburg_low = "archive",
			auto_navigation_hamburg_low = "archive",
			auto_navigation_bergen_mid = "archive",
			auto_weather_london_low = "archive",
			auto_weather_dublin_low = "archive",
			auto_weather_edinburgh_low = "archive",
			auto_weather_marseille_low = "archive",
			auto_weather_bordeaux_low = "archive",
			auto_weather_naples_mid = "archive",
			auto_weather_seville_high = "archive",
			auto_weather_lisbon_low = "archive",
			auto_weather_hamburg_low = "archive",
			auto_weather_gothenburg_low = "archive",
			auto_weather_gdansk_mid = "archive",
			auto_weather_stockholm_low = "archive",
			auto_weather_london_high = "archive",
			auto_architecture_rouen_low = "archive",
			auto_architecture_antwerp_low = "archive",
			auto_architecture_amsterdam_low = "lake",
			auto_architecture_gdansk_low = "archive",
			auto_architecture_antwerp_mid = "fort",
			auto_architecture_naples_low = "archive",
			auto_architecture_rouen_mid = "archive",
			auto_architecture_bergen_mid = "archive",
			auto_architecture_edinburgh_low = "fort",
			auto_architecture_venice_low = "coast",
			auto_architecture_hamburg_low = "lake",
			auto_architecture_livorno_high = "archive",
			auto_art_antwerp_low = "archive",
			auto_art_amsterdam_low = "archive",
			auto_art_hamburg_low = "archive",
			auto_art_venice_mid = "archive",
			auto_art_gdansk_low = "archive",
			auto_art_london_low = "archive",
			auto_art_amsterdam_mid = "archive",
			auto_art_rouen_low = "archive",
			auto_art_gdansk_mid = "archive",
			auto_art_venice_high = "archive",
			auto_goods_lisbon_low = "archive",
			auto_goods_amsterdam_low = "archive",
			auto_goods_seville_low = "archive",
			auto_goods_amsterdam_mid = "archive",
			auto_goods_venice_low = "archive",
			auto_goods_seville_mid = "archive",
			auto_goods_genoa_low = "archive",
			auto_goods_bordeaux_low = "archive",
			auto_goods_hamburg_low = "archive",
			auto_goods_gothenburg_low = "archive",
			auto_goods_gdansk_low = "archive",
			auto_goods_bergen_low = "archive",
			auto_goods_marseille_low = "archive",
			auto_shipbuilding_amsterdam_low = "coast",
			auto_shipbuilding_gothenburg_low = "coast",
			auto_shipbuilding_stockholm_low = "coast",
			auto_shipbuilding_genoa_low = "coast",
			auto_shipbuilding_bergen_low = "coast",
			auto_shipbuilding_antwerp_low = "coast",
			auto_shipbuilding_rouen_low = "coast",
			auto_shipbuilding_copenhagen_low = "coast",
			auto_shipbuilding_london_mid = "coast",
			auto_shipbuilding_bergen_mid = "coast",
			auto_shipbuilding_seville_low = "coast",
			auto_shipbuilding_venice_mid = "coast",
			auto_shipbuilding_hamburg_high = "archive",
			auto_language_gothenburg_low = "archive",
			auto_language_rouen_low = "archive",
			auto_language_hamburg_low = "archive",
			auto_language_marseille_mid = "archive",
			auto_language_london_low = "archive",
			auto_language_antwerp_mid = "archive",
			auto_language_dublin_low = "archive",
			auto_language_bergen_low = "archive",
			auto_language_copenhagen_low = "archive",
			auto_language_livorno_high = "archive",
			auto_language_dublin_mid = "archive",
			auto_language_genoa_low = "archive",
			auto_language_seville_low = "archive",
			auto_language_venice_mid = "archive",
			-- 일반 조사: 혼합 발견물은 현재 항구의 실제 환경과 조사 장소를 우선한다.
			survey_00 = "coast",
			survey_01 = "coast",
			survey_02 = "coast",
			survey_03 = "lake",
			survey_04 = "coast",
			survey_05 = "swamp",
			survey_06 = "coast",
			survey_07 = "lake",
			survey_08 = "archive",
			survey_09 = "coast",
			survey_10 = "coast",
			survey_11 = "highland",
			survey_12 = "archive",
			survey_13 = "jungle",
			survey_14 = "coast",
			survey_15 = "lake",
			survey_16 = "coast",
			survey_17 = "coast",
			survey_18 = "coast",
			survey_19 = "archive",
			survey_20 = "coast",
			survey_21 = "fort",
			survey_22 = "forest",
			survey_23 = "volcanic",
			survey_24 = "archive",
			survey_25 = "mine",
			survey_26 = "archive",
			survey_27 = "swamp",
			survey_28 = "mine",
			survey_29 = "ruins",
			survey_30 = "coast",
			survey_31 = "coast",
			survey_32 = "coast",
		}
		local selected = exact[opts.siteId or ""]
		if selected then questTerrain = selected end
		folder:SetAttribute("FieldPacificSurvey", string.match(opts.siteId or "", "^pac_survey_%d%d$") ~= nil)
		folder:SetAttribute("FieldSiteTerrainSource", if selected then "site-id" else "site-name")
	end
	-- [특수 기후의 실제 바닥 재질] 색 보정만이 아니라 눈·진흙·화산암 지형을 구분한다.
	if questTerrain == "glacier" then
		winterScene = true
		seasonName = "빙설기"
		biome.mat = Enum.Material.Snow
		biome.ground = Color3.fromRGB(214, 227, 235)
		biome.fog = Color3.fromRGB(184, 205, 226)
		biome.fogEnd = math.min(biome.fogEnd, 470)
	elseif questTerrain == "volcanic" then
		biome.mat = Enum.Material.Slate
		biome.ground = Color3.fromRGB(77, 72, 75)
		biome.fog = Color3.fromRGB(122, 109, 112)
		biome.fogEnd = math.min(biome.fogEnd, 520)
	elseif questTerrain == "swamp" then
		biome.mat = Enum.Material.Mud
		biome.ground = biome.ground:Lerp(Color3.fromRGB(65, 87, 76), 0.72)
		biome.fog = Color3.fromRGB(137, 167, 154)
		biome.fogEnd = math.min(biome.fogEnd, 390)
	elseif questTerrain == "jungle" then
		biome.mat = Enum.Material.Grass
		biome.ground = biome.ground:Lerp(Color3.fromRGB(49, 103, 59), 0.55)
		biome.fog = biome.fog:Lerp(Color3.fromRGB(123, 173, 146), 0.45)
	elseif questTerrain == "desert" then
		-- [지형별 실제 바닥] 지역 문화권의 기본 초록색보다 모래 지형을 우선한다.
		biome.mat = Enum.Material.Sand
		biome.ground = Color3.fromRGB(204, 177, 122)
	elseif questTerrain == "coast" then
		-- [해안 지질] 북방 겨울 눈은 보존, 그 외는 절벽 암석과 모래 해변으로 구별한다.
		if winterScene then
			biome.mat = Enum.Material.Snow
		elseif portNature == "fjord" or portNature == "cliff_coast" or portNature == "mountain_coast" then
			biome.mat = Enum.Material.Slate
			biome.ground = Color3.fromRGB(118, 122, 117)
		else
			biome.mat = Enum.Material.Sand
			biome.ground = Color3.fromRGB(196, 180, 139)
		end
	elseif questTerrain == "highland" then
		-- [산악 지질] 설기에는 눈을 지키고 그 외에는 풀밭 대신 바위 고원을 사용한다.
		if not winterScene then
			biome.mat = Enum.Material.Slate
			biome.ground = biome.ground:Lerp(Color3.fromRGB(113, 117, 109), 0.75)
		end
	elseif questTerrain == "mine" then
		biome.mat = Enum.Material.Slate
		biome.ground = biome.ground:Lerp(Color3.fromRGB(107, 103, 98), 0.7)
	elseif questTerrain == "archive" then
		-- 기관의 마당과 정원: 눈 계절은 유지하고 기존 지역 흙빛을 낮은 채도의 석재와 섞는다.
		if not winterScene then
			biome.mat = Enum.Material.Ground
			biome.ground = biome.ground:Lerp(Color3.fromRGB(154, 139, 111), 0.38)
		end
	elseif questTerrain == "ruins" or questTerrain == "fort" then
		-- [고대 유적·요새] 기존 건물/길목은 그대로 두고 주변 흙과 석질을 드러낸다.
		if not winterScene then
			biome.mat = Enum.Material.Ground
			biome.ground = biome.ground:Lerp(Color3.fromRGB(133, 124, 103), 0.7)
		end
	end
	-- [항구별 토양 광량] 같은 대륙·문화권 안에서도 하구·암벽·열대·삼림의 색을 조금씩 구분한다.
	-- 빙하·화산·늪·밀림의 퀘스트 재질과 기후는 우선하며 지면 충돌·경로는 변경하지 않는다.
	if questTerrain ~= "glacier" and questTerrain ~= "volcanic" and questTerrain ~= "swamp" and questTerrain ~= "jungle" then
		local portColor = if portNature == "fjord" or portNature == "cliff_coast" then Color3.fromRGB(116, 131, 121)
			elseif portNature == "lagoon" or portNature == "delta" or portNature == "river" then Color3.fromRGB(91, 132, 111)
			elseif portNature == "reef" then Color3.fromRGB(206, 185, 130)
			elseif portNature == "arid_coast" then Color3.fromRGB(198, 164, 108)
			elseif portNature == "mineral" or portNature == "volcanic" then Color3.fromRGB(120, 117, 106)
			elseif portNature == "mangrove" or portNature == "jungle_coast" then Color3.fromRGB(69, 128, 75)
			else nil
		if portColor then biome.ground = biome.ground:Lerp(portColor, 0.17) end
	end
	-- [지점 지질] 도버 백악·카라라 대리석·팔룬 광산의 구별된 지표.
	if opts.siteId == "london_chalk" or opts.siteId == "carrara_quarry" or opts.siteId == "marble_quarry" then
		biome.mat = Enum.Material.Limestone
		biome.ground = Color3.fromRGB(205, 203, 189)
	elseif opts.siteId == "falun_mine" then
		biome.ground = Color3.fromRGB(123, 87, 67)
	elseif folder:GetAttribute("FieldPacificSurvey") then
		if questTerrain == "forest" then
			biome.mat = Enum.Material.Grass
			biome.ground = Color3.fromRGB(88, 115, 75)
		elseif opts.siteId == "pac_survey_13" then
			biome.mat = Enum.Material.Sand
			biome.ground = Color3.fromRGB(186, 162, 125)
		end
	end
	-- 열린 지역의 먼 항구는 맑을 때 실제로 보이도록 한다. 광산·습지·빙설의 짙은 기후는 유지.
	if questTerrain == "archive" or questTerrain == "plains" or questTerrain == "coast" or questTerrain == "farm" then
		biome.fogEnd = math.max(biome.fogEnd, 820)
	end
	folder:SetAttribute("FieldQuestTerrainTheme", questTerrain)
	folder:SetAttribute("FieldSeasonLabel", seasonName)
	-- 지역(바이옴)과 위험도에 따라 맵 크기가 다르다: 위험한 곳일수록 넓다
	local SIZE = math.floor(biome.size * (1 + math.min(opts.danger or 1, 10) * 0.03))
	-- [필드 경관] 맵 넓이에 맞춰 모델을 배치하며 임의 면적별 모델 수 상한을 두지 않는다.
	local AREA = (SIZE / 200) ^ 2
	-- 지역마다 하늘·안개 분위기가 다르다(끝나면 되돌린다)
	local lightSave = {}
	do
		local L = game:GetService("Lighting")
		-- [지역 조명] 항구의 밤 설정이 탐험의 주간 전장을 어둡게 만들지 않게 값 보관 후 전장에 맞춰 조절.
		lightSave = {
			FogColor = L.FogColor, FogStart = L.FogStart, FogEnd = L.FogEnd, ClockTime = L.ClockTime,
			Brightness = L.Brightness, Ambient = L.Ambient, OutdoorAmbient = L.OutdoorAmbient,
			ColorShiftTop = L.ColorShift_Top, ShadowSoftness = L.ShadowSoftness,
		}
		-- [실제 대기 원근] 포트의 기존 Atmosphere가 있으면 수치를 보관해 재사용한다.
		-- 엔진 Fog만 바꿨을 때 기존 Atmosphere에 가려 거리감이 사라지는 문제를 해결한다.
		local oldAtmosphere = L:FindFirstChildOfClass("Atmosphere")
		local fieldAtmosphere = oldAtmosphere or Instance.new("Atmosphere")
		local oldAtmosphereLook = if oldAtmosphere then {
			color = oldAtmosphere.Color, decay = oldAtmosphere.Decay,
			density = oldAtmosphere.Density, offset = oldAtmosphere.Offset,
			haze = oldAtmosphere.Haze, glare = oldAtmosphere.Glare,
		} else nil
		lightSave.FieldAtmosphere = fieldAtmosphere
		-- 기존 항구 구름을 재사용하고 퇴장 시 정확히 복원한다. 새 날씨 갱신 루프 없음.
		local oldClouds = workspace.Terrain:FindFirstChildOfClass("Clouds")
		local clouds = oldClouds or Instance.new("Clouds")
		local cloudLook = if oldClouds then { cover = oldClouds.Cover, density = oldClouds.Density, color = oldClouds.Color } else nil
		lightSave.FieldClouds = clouds
		clouds.Name = if oldClouds then oldClouds.Name else "MareFieldClouds"
		clouds.Cover = if arid then 0.12 elseif tropical then 0.46 elseif northern then 0.42 else 0.25
		clouds.Density = if arid then 0.20 else 0.42
		clouds.Color = biome.fog:Lerp(Color3.fromRGB(240, 244, 248), 0.70)
		if not oldClouds then clouds.Parent = workspace.Terrain end
		folder.Destroying:Connect(function()
			if not clouds.Parent then return end
			if cloudLook then
				clouds.Cover, clouds.Density, clouds.Color = cloudLook.cover, cloudLook.density, cloudLook.color
			else clouds:Destroy() end
		end)
		fieldAtmosphere.Color = biome.fog:Lerp(Color3.fromRGB(215, 229, 239), 0.19)
		fieldAtmosphere.Decay = biome.fog:Lerp(
			if arid then Color3.fromRGB(184, 159, 132) else Color3.fromRGB(103, 143, 179), 0.43)
		-- [입체감] 짙은 연무가 근경까지 하얗게 덮어 평면처럼 보였다(Studio f0_environment).
		-- 근경은 선명하게, 원경만 흐려지도록 밀도·연무를 낮추고 시작 거리(Offset)를 뒤로 민다.
		fieldAtmosphere.Density = if biome.fogEnd < 480 then 0.26 elseif biome.fogEnd < 650 then 0.21 else 0.17
		fieldAtmosphere.Offset = 0.32
		fieldAtmosphere.Haze = if visualMobile then 0.45 else 0.65
		fieldAtmosphere.Glare = 0.12
		if not oldAtmosphere then
			fieldAtmosphere.Name = "FieldDepthAtmosphere"
			fieldAtmosphere.Parent = L
		end
		folder.Destroying:Connect(function()
			L.ShadowSoftness = lightSave.ShadowSoftness
			if oldAtmosphereLook and fieldAtmosphere.Parent then
				fieldAtmosphere.Color, fieldAtmosphere.Decay = oldAtmosphereLook.color, oldAtmosphereLook.decay
				fieldAtmosphere.Density, fieldAtmosphere.Offset = oldAtmosphereLook.density, oldAtmosphereLook.offset
				fieldAtmosphere.Haze, fieldAtmosphere.Glare = oldAtmosphereLook.haze, oldAtmosphereLook.glare
			elseif not oldAtmosphere and fieldAtmosphere.Parent then
				fieldAtmosphere:Destroy()
			end
		end)
		-- [입체감] 대비·채도를 살짝 올려 지형 굴곡과 모델 윤곽이 읽히게 한다(끝나면 제거).
		local grade = Instance.new("ColorCorrectionEffect")
		grade.Name = "FieldDepthGrade"
		grade.Contrast = 0.12
		grade.Saturation = 0.10
		grade.Brightness = -0.01
		grade.Parent = L
		folder.Destroying:Connect(function()
			grade:Destroy()
		end)
		pcall(function()
			L.ShadowSoftness = if arid then 0.21 elseif tropical or northern then 0.39 else 0.30
			L.FogColor, L.FogStart, L.FogEnd, L.ClockTime = biome.fog, math.min(120, biome.fogEnd * 0.35), biome.fogEnd, biome.clock
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
		p.CastShadow = false -- 보이지 않는 필드 경계가 주변 나무/모래에 그림자를 만들지 않는다.
	end

	-- [낙사 방지] 기존 바닥 아래에 충돌 안전판을 두고, 이동 감시에서 추락 시 마지막 안전 지점으로 복귀한다.
	do -- [Luau 지역변수 한도] 낙사 안전판 임시 참조 정리
		local safetyFloor = part(folder, Vector3.new(SIZE + 24, 2, SIZE + 24), CFrame.new(ORIGIN + Vector3.new(0, -14, 0)), Color3.fromRGB(44, 43, 40))
		safetyFloor.Name = "FieldSafetyFloor"
		safetyFloor.Transparency = 1
		safetyFloor.CanQuery = false
		safetyFloor.CastShadow = false -- 투명 충돌판은 햇빛·모래색에 영향 없음.
	end

	-- [실제 지형 높이] 기존 Kenney CC0 나무·암석 모델을 놓는 전장 안쪽에도
	-- 걸어 올라갈 수 있는 완만한 복셀 구릉을 만든다. 원래 중앙 이동로·스폰·전투 수치는 유지한다.
	-- 지평선용 외곽 능선과 내부 구릉은 같은 Terrain을 사용하며 퇴장 때 모두 정리한다.
	do
		local terrain = workspace.Terrain
		local mat = biome.mat
		if questTerrain == "volcanic" or questTerrain == "mine" then mat = Enum.Material.Slate
		elseif questTerrain == "glacier" then mat = Enum.Material.Snow
		elseif questTerrain == "swamp" then mat = Enum.Material.Mud
		elseif mat ~= Enum.Material.Sand and mat ~= Enum.Material.Slate and mat ~= Enum.Material.Mud
			and mat ~= Enum.Material.Snow and mat ~= Enum.Material.Ground then mat = Enum.Material.Grass end
		local hills = {}
		-- [실제 수평선] 해안 외곽만 네이티브 Terrain 물을 사용. 기존 이동 경계 안은 변경하지 않는다.
		local waterCF, waterSize
		if questTerrain == "coast" then
			waterCF = CFrame.new(ORIGIN + Vector3.new(half + 96, -7, -half * 0.12))
			waterSize = Vector3.new(176, 12, SIZE + 100)
			terrain:FillBlock(waterCF, waterSize, Enum.Material.Water)
		end
		local hillRng = Random.new((opts.seed or 7) * 13 + 5)
		local hillCount = if visualMobile then 16 else 28
		for i = 0, hillCount - 1 do
			local ang = i / hillCount * math.pi * 2 + hillRng:NextNumber(-0.08, 0.08)
			local radius = if questTerrain == "highland" or questTerrain == "volcanic" then hillRng:NextNumber(40, 60)
				elseif questTerrain == "mine" or questTerrain == "glacier" then hillRng:NextNumber(32, 48)
				elseif questTerrain == "forest" or questTerrain == "jungle" then hillRng:NextNumber(27, 41)
				elseif questTerrain == "farm" or questTerrain == "swamp" or questTerrain == "archive" then hillRng:NextNumber(13, 24)
				elseif questTerrain == "coast" or questTerrain == "lake" then hillRng:NextNumber(15, 27)
				else hillRng:NextNumber(20, 35)
			local dist = half + radius + hillRng:NextNumber(8, 23)
			local rise = if questTerrain == "highland" or questTerrain == "volcanic" then 0.27
				elseif questTerrain == "mine" or questTerrain == "glacier" then 0.32
				elseif questTerrain == "farm" or questTerrain == "swamp" or questTerrain == "archive" then 0.72 else 0.48
			local center = ORIGIN + Vector3.new(math.cos(ang) * dist, -radius * rise, math.sin(ang) * dist)
			-- 해안의 바다 쪽 능선은 열어 수평선이 보이도록 한다. 기존 이동 경계는 유지.
			if questTerrain ~= "coast" or math.cos(ang) < 0.55 then
				terrain:FillBall(center, radius, mat)
				table.insert(hills, { center, radius })
			end
		end
		-- [전장 내부] 양쪽 숲·협곡에 교차 구릉. 중앙 폭과 입구는 항상 평탄하게 남긴다.
		local insideCount = if questTerrain == "farm" or questTerrain == "ruins" or questTerrain == "archive" then (if visualMobile then 4 else 6)
			elseif visualMobile then 7 else 11
		for i = 1, insideCount do
			local side = if i % 2 == 0 then -1 else 1
			local radius = if questTerrain == "highland" or questTerrain == "volcanic" then hillRng:NextNumber(33, 44)
				elseif questTerrain == "forest" or questTerrain == "jungle" then hillRng:NextNumber(29, 40)
				else hillRng:NextNumber(23, 34)
			local x = side * (half * hillRng:NextNumber(0.41, 0.61))
			local z = half * (-0.75 + (i - 1) / math.max(1, insideCount - 1) * 1.23)
				+ hillRng:NextNumber(-8, 8)
			local depth = if questTerrain == "highland" or questTerrain == "volcanic" then 0.58
				elseif questTerrain == "forest" or questTerrain == "jungle" then 0.66 else 0.77
			local center = ORIGIN + Vector3.new(x, -radius * depth, z)
			terrain:FillBall(center, radius, mat)
			table.insert(hills, { center, radius })
		end
		-- [다층 지형] 발헤임식 생물군계 높낮이를 참고한 낮은 옆능선.
		-- 전투 중앙 길·진입 스폰을 비우고, 기등록 실물 절벽/수목과 표면을 연결한다.
		local contourCount = if questTerrain == "highland" or questTerrain == "volcanic" or questTerrain == "glacier" then (if visualMobile then 4 else 7)
			elseif questTerrain == "forest" or questTerrain == "jungle" or questTerrain == "mine" then (if visualMobile then 3 else 5)
			elseif questTerrain == "coast" or questTerrain == "lake" then (if visualMobile then 2 else 4)
			else (if visualMobile then 1 else 2)
		for index = 1, contourCount do
			local side = if index % 2 == 0 then -1 else 1
			local lane = math.floor((index - 1) / 2)
			local radius = if questTerrain == "highland" or questTerrain == "glacier" then hillRng:NextNumber(36, 49)
				elseif questTerrain == "forest" or questTerrain == "jungle" then hillRng:NextNumber(29, 39)
				else hillRng:NextNumber(24, 35)
			local x = side * half * hillRng:NextNumber(0.61, 0.79)
			local z = -half * 0.69 + lane * half * 0.29 + hillRng:NextNumber(-9, 9)
			local center = ORIGIN + Vector3.new(x, -radius * (if questTerrain == "highland" or questTerrain == "glacier" then 0.58 else 0.72), z)
			terrain:FillBall(center, radius, mat)
			table.insert(hills, { center, radius })
		end
		-- [등고선 경로] 절벽 테두리와 전장 사이의 짧은 발판을 Terrain 복셀로 만든다.
		-- 중앙 전투 진입로는 그대로 두고 0.5~0.8 반폭 측면에서 오르내릴 수 있다.
		local shelfCount = if questTerrain == "highland" or questTerrain == "glacier" or questTerrain == "mine" then (if visualMobile then 2 else 4)
			elseif questTerrain == "forest" or questTerrain == "jungle" then (if visualMobile then 1 else 3)
			else 0
		for i = 1, shelfCount do
			local side = if i % 2 == 0 then 1 else -1
			local r = hillRng:NextNumber(24, 34)
			local x = side * half * hillRng:NextNumber(0.54, 0.68)
			local z = -half * (0.54 - math.floor((i - 1) / 2) * 0.33)
			local center = ORIGIN + Vector3.new(x, -r * 0.78, z)
			terrain:FillBall(center, r, mat)
			table.insert(hills, { center, r })
		end
		folder:SetAttribute("FieldWalkableHillCount", insideCount)
		folder:SetAttribute("FieldDepthRidgeCount", contourCount)
		folder:SetAttribute("FieldElevatedTerraceCount", shelfCount)
		-- [원경 산선] 전장 바깥 북쪽 지평선에만 낮은 복셀 봉우리를 둔다.
		-- 스폰과 중앙 전투 길·판정에 닿지 않으며 기존 Terrain 정리 흐름으로 전부 해제한다.
		local backdropCount = if visualMobile then 2 else 4
		for index = 1, backdropCount do
			local r = if questTerrain == "highland" or questTerrain == "glacier" or questTerrain == "volcanic"
				then hillRng:NextNumber(47, 61) else hillRng:NextNumber(32, 46)
			local x = half * (-0.86 + (index - 1) / math.max(1, backdropCount - 1) * 1.72)
			local z = -(half + r + hillRng:NextNumber(9, 17))
			local center = ORIGIN + Vector3.new(x, -r * (if questTerrain == "highland" or questTerrain == "glacier" then 0.48 else 0.67), z)
			terrain:FillBall(center, r, mat)
			table.insert(hills, { center, r })
		end
		folder:SetAttribute("FieldBackdropCrestCount", backdropCount)
		-- [전투장 밖 원경] 기존 외곽 능선은 유지하고 400스터드 이상 먼 지평선에
		-- 항구 문화권 실물의 접지용 자연 지형만 둔다. 광산은 닫힌 경관을 유지한다.
		if questTerrain ~= "mine" then
			local r = if visualMobile then 94 else 112
			local center = ORIGIN + Vector3.new(0, -r * 0.86, -math.max(400, half + 150))
			terrain:FillBall(center, r, mat)
			table.insert(hills, { center, r })
		end
		folder.Destroying:Connect(function()
			if waterCF and waterSize then terrain:FillBlock(waterCF, waterSize, Enum.Material.Air) end
			for _, h in hills do
				terrain:FillBall(h[1], h[2] + 2, Enum.Material.Air)
			end
		end)
	end

	-- [실제 접지] 생성된 복셀 언덕과 기존 지면 중 먼저 닿는 표면만 읽는다.
	-- 나무/바위/적군을 동일 지형 표면에 배치하고 다른 장식의 충돌은 높이 측정에서 제외한다.
	local groundRay = RaycastParams.new()
	groundRay.FilterType = Enum.RaycastFilterType.Include
	groundRay.FilterDescendantsInstances = { workspace.Terrain, ground }
	groundRay.IgnoreWater = true

	local spawn = ORIGIN + Vector3.new(0, 4, half - 14)
	-- 필드 바닥 생성 직후 캐릭터와 카메라를 이동시켜, 나머지 적·조작 UI 생성과 분리한다.
	-- 캐릭터를 필드로 옮긴다
	local char = player.Character or player.CharacterAdded:Wait()
	char:PivotTo(CFrame.new(spawn))
	-- 항구 전경에서는 캐릭터가 고정(Anchored)되어 있다. 탐험에서는 걸어 다닐 수 있어야 하므로 풀어 준다.
	do -- [Luau 지역변수 한도] 항구 앵커 해제 임시 참조 정리
		local fieldRoot = char:FindFirstChild("HumanoidRootPart")
		if fieldRoot and fieldRoot:IsA("BasePart") then
			fieldRoot.Anchored = false
		end
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

	-- [디아블로식 타격 월드] 모든 승인된 배경 모델의 피격만 기록, 전투 수치·보상·랜드마크는 그대로 둔다.
	local fieldObjects = {}
	-- [퀘스트 지형 배치] 지형 이름이 먼저, 문화권은 그 위에 추가한다.
	-- 숲길·협곡·폐광·해안·유적·사막·농경지·호숫가의 실루엣을 구별한다.
	-- 전투/조사/시작 위치를 건드리지 않고 기존 승인 메시만 필드 외곽과 측면에 배치한다.
	do

	local mirror = if (math.floor(tonumber(opts.seed) or 7) % 2 == 0) then 1 else -1
	-- [전경 배치 난수 분리] 시야 구성 때문에 기존 rng 시퀀스가 달라져
	-- 퀘스트 카드·적 위치·공격 패턴에 영향을 주지 않도록 승인 실물의 재배치만 별도 추첨한다.
	local visualLayoutRng = Random.new((portVisualSeed + math.floor(tonumber(opts.seed) or 7) * 97) % 2147483647)
	-- [지상탐험 배치 정본] 진입 시야와 중경의 3~6개 실물 군락. 중앙 통로·스폰은 유지한다.
	-- 전체 수량은 기존 면적 계산을 따르고, 반복 행의 좌표 중복을 없애기 위해 군락마다 다른 중심을 사용한다.
	local function sceneryPosition(index, total, groupSize, spacing, offset, biasX, biasZ)
		local group = math.floor((index - 1) / groupSize)
		local slot = (index - 1) % groupSize
		local groups = math.max(1, math.ceil(total / groupSize))
		local side = (if (group + offset) % 2 == 0 then -1 else 1) * mirror
		local lane = math.floor(group / 2)
		local lanes = math.max(1, math.ceil(groups / 2))
		local nearLanes = math.max(1, math.floor(lanes * 0.16))
		local near = lane < nearLanes
		local progress = if near then (lane + 0.5) / nearLanes
			else (lane - nearLanes + 0.5) / math.max(1, lanes - nearLanes)
		local phase = (lane * 0.61803398875 + (portVisualSeed % 997) / 997 + offset * 0.173) % 1
		local corridor = math.max(24, half * (if questTerrain == "forest" or questTerrain == "jungle" then 0.20 else 0.28))
		local edge = half * 0.89
		local nearEdge = math.min(edge, 64)
		local lateral = if near then corridor + math.max(0, nearEdge - corridor) * (0.20 + phase * 0.65)
			else half * (0.46 + 0.34 * phase)
		local depth = if near then half - 34 - progress * math.min(57, half * 0.38)
			else half * (0.30 - progress * 1.12)
		-- 농지·기관은 구획 외곽에, 산악·광산은 측면 능선에, 숲은 굽은 통로 양옆에 집중한다.
		if not near then
			if questTerrain == "farm" or questTerrain == "archive" then lateral = math.max(lateral, half * 0.66)
			elseif questTerrain == "highland" or questTerrain == "mine" or questTerrain == "glacier" then
				lateral = math.max(lateral, half * 0.62)
			elseif questTerrain == "forest" or questTerrain == "jungle" then
				lateral += math.sin(depth / math.max(half, 1) * 5) * half * 0.07
			end
		end
		local angle = slot * math.pi * 2 / groupSize + phase * math.pi * 2
		local radius = if slot == 0 then 0 else spacing * (0.85 + 0.25 * (slot % 2))
		local x = math.clamp(lateral + math.cos(angle) * radius + biasX, corridor, edge)
		local z = math.clamp(depth + math.sin(angle) * radius + biasZ, -half * 0.86, half - 26)
		return ORIGIN + Vector3.new(side * x, 0, z)
	end

	-- [실물 배경 통합 배치] 나무·바위·문화권 소품·퀘스트 건축물 모두 기존 승인된 원본으로만 생성한다.
	-- AssetLoader가 뒤늦게 등록한 모델도 같은 좌표에 한 번만 배치한다. 새 파츠 대체는 하지 않는다.
	local pending = {}
	local built = 0
	-- [무제한 모델 분할 배치] 한 프레임에 수백 개를 복제하지 않고 기존 배치 흐름에서 분산한다.
	local sceneryBatch = 0
	local function placeFeature(entry)
		if not folder.Parent then return nil end
		local pos = entry.position or (ORIGIN + Vector3.new(entry[4] * half * mirror, 0, entry[5] * half))
		if math.abs(pos.Y - ORIGIN.Y) < 0.5 then
			local hit = workspace:Raycast(Vector3.new(pos.X, ORIGIN.Y + 100, pos.Z), Vector3.new(0, -140, 0), groundRay)
			if hit then pos = Vector3.new(pos.X, hit.Position.Y, pos.Z) end
		end
		-- [실거리 분류] 진입 위치 기준 120/400 스터드. 임의 인덱스로 먼 모델을 표시하지 않는다.
		if entry.band or entry.landmark or entry.depth then
			local distance = (Vector3.new(pos.X, spawn.Y, pos.Z) - spawn).Magnitude
			entry.band = if entry.horizon or distance >= 400 then "far" elseif distance >= 120 then "mid" else "near"
		end
		local m = placeModel(folder, entry[1], entry[2], pos, entry[3], entry[6], entry.tint, entry.band)
		if not m then return nil end
		-- [Studio 근·중·원경 확인] 등록 모델이 실제 배치됐을 때만 세며, 지연 로드도 같은 수치에 포함한다.
		if entry.band then
			m:SetAttribute("FieldSceneryBand", entry.band)
			-- [먼 수목과 절벽] 원본 텍스처/PBR을 보존하고 무텍스처 면만 하늘빛에 옅게 섞는다.
			-- 근경은 명암을 유지하며 모델 개수와 전투 피격 판정은 건드리지 않는다.
			if entry.band == "far" then
				local faded = 0
				for _, piece in m:GetDescendants() do
					if piece:IsA("BasePart") and piece.Transparency < 0.95
						and not piece:FindFirstChildOfClass("SurfaceAppearance")
						and (not piece:IsA("MeshPart") or piece.TextureID == "") then
						local specialMap = false
						for _, child in piece:GetChildren() do
							if child:IsA("SpecialMesh") and child.TextureId ~= "" then specialMap = true; break end
						end
						if not specialMap then
							piece.Color = piece.Color:Lerp(biome.fog, if biome.fogEnd < 500 then 0.30 else 0.20)
							faded += 1
						end
					end
				end
				if faded > 0 then m:SetAttribute("FieldAtmosphericFarTone", true) end
			end
			if entry.lowPolyVariant then
				m:SetAttribute("FieldSceneryLowPolyVariant", true) -- [Studio 실물 계수] 자산 선택 결과만 기록한다.
				folder:SetAttribute("FieldSceneryLowPolyPlaced", (folder:GetAttribute("FieldSceneryLowPolyPlaced") or 0) + 1)
			end
			local counter = if entry.band == "near" then "FieldSceneryNearPlaced"
				elseif entry.band == "mid" then "FieldSceneryMidPlaced" else "FieldSceneryFarPlaced"
			folder:SetAttribute(counter, (folder:GetAttribute(counter) or 0) + 1)
		end
		if entry.depth then
			folder:SetAttribute("FieldDepthFeatureCount", (folder:GetAttribute("FieldDepthFeatureCount") or 0) + 1)
		end
		if entry.landmark then
			m.Name = "FieldTerrainLandmark"
			m:SetAttribute("TerrainTheme", questTerrain)
			m:SetAttribute("TerrainFeature", entry[2])
			if entry.survey then m:SetAttribute("FieldTerrainSurvey", true) end
			built += 1
			folder:SetAttribute("FieldTerrainFeatureCount", built)
		end
		if entry[7] and entry[7] ~= 0 then
			m:PivotTo(CFrame.new(pos) * CFrame.Angles(0, math.rad(entry[7]), 0) * CFrame.new(-pos) * m:GetPivot())
		end
		-- 모든 승인된 필드 장식은 무기로 타격 가능. 큰 랜드마크는 시각 반응만 하고 영구 파괴하지 않는다.
		if entry.horizon then
			-- 전장 밖 배경은 조사·타격 대상이 아니다. 실제 로드 성공 후에만 계수한다.
			m:SetAttribute("FieldHorizon", true)
			if entry.horizonNature then
				m:SetAttribute("FieldHorizonNature", true)
			elseif entry.briefBackdrop then
				m:SetAttribute("FieldBriefAssetKey", entry[1] .. "/" .. entry[2])
				folder:SetAttribute("FieldBriefBackdropPlaced", entry[2])
			else
				folder:SetAttribute("FieldHorizonPlaced", (folder:GetAttribute("FieldHorizonPlaced") or 0) + 1)
			end
		else
			local center, extent = m:GetBoundingBox()
			m:SetAttribute("FieldCombatObject", true)
			m:SetAttribute("FieldObjectHits", 0)
			table.insert(fieldObjects, { model = m, pos = center.Position,
				radius = math.clamp(math.max(extent.X, extent.Z) * 0.24, 1.4, 7.5),
				origin = m:GetPivot(), lastHit = -100 })
		end
		-- 대표 건축물은 지연 로드돼도 지명 표지판을 놓친 채 끝나지 않게 한다.
		if entry.title and not folder:GetAttribute("FieldNamedLandmarkTitle") then
			local adorn = m:FindFirstChildWhichIsA("BasePart", true)
			if adorn then
				folder:SetAttribute("FieldNamedLandmarkTitle", true)
				local bb = Instance.new("BillboardGui")
				bb.Adornee = adorn
				bb.Size = UDim2.fromOffset(300, 56)
				bb.StudsOffset = Vector3.new(0, 34, 0)
				bb.MaxDistance = 400
				bb.AlwaysOnTop = true
				local titleLabel = Instance.new("TextLabel")
				titleLabel.Size = UDim2.fromScale(1, 1)
				titleLabel.BackgroundColor3 = Color3.fromRGB(58, 40, 28)
				titleLabel.TextColor3 = Color3.fromRGB(255, 244, 214)
				titleLabel.Font = Enum.Font.GothamBlack
				titleLabel.TextSize = 24
				titleLabel.Text = "🏛️ " .. entry.title
				local stroke = Instance.new("UIStroke")
				stroke.Color = Color3.fromRGB(232, 190, 96)
				stroke.Thickness = 2
				stroke.Parent = titleLabel
				local corner = Instance.new("UICorner")
				corner.CornerRadius = UDim.new(0, 12)
				corner.Parent = titleLabel
				titleLabel.Parent = bb
				bb.Parent = adorn
			end
		end
		sceneryBatch += 1
		if sceneryBatch >= 12 then
			sceneryBatch = 0
			-- 모델 수 하드캡은 없으며, 대량 배치의 순간 렌더링 끊김만 줄인다.
			task.wait()
		end
		return m
	end
	local function stageFeature(entry)
		if not AssetIds[entry[1] .. "/" .. entry[2]] then return nil end
		local placed = placeFeature(entry)
		if not placed then table.insert(pending, entry) end
		return placed
	end
	-- 나무와 바위
	local treeNames = table.clone(biome.treeNames or { "tree", "tree-crooked", "tree-high", "tree_large", "tree_tiny" })
	-- [지역 수목 실물] 신규 케니 자연 모델은 ID+체험권한 확인 후 정식 AssetIds에 생길 때만 선택한다.
	-- 나무 개수를 늘리지 않고 기존 나무 슬롯에서 계절·지역별 수종만 추가한다.
	do
		local trees = if winterScene or northern then { "kenney_tree_pinetallD_detailed" }
			elseif tropical or portNature == "mangrove" or portNature == "jungle_coast"
				then { "kenney_tree_fat", "kenney_tree_palmShort" }
			elseif questTerrain == "forest" or portNature == "forest"
				then { "kenney_tree_fat", "kenney_tree_defaultDark" }
			else { "kenney_tree_defaultDark" }
		if not arid then
			for _, name in trees do
				if AssetIds["Terrain/" .. name] then table.insert(treeNames, name) end
			end
		end
	end
	-- [신규 내부 CC0 원본] Roblox Universe 등록 ID가 확인된 나무만 기존 실물 선택군에 합류한다.
	-- 미등록 파일은 화면에 가짜 도형으로 대체하지 않고 기존 등록 나무를 유지한다.
	if not arid and AssetIds["Terrain/tree-detailed"] then table.insert(treeNames, "tree-detailed") end
	if northern and AssetIds["Terrain/tree-pinedefaultb"] then table.insert(treeNames, "tree-pinedefaultb") end
	if northern and AssetIds["Terrain/tree-pinetalla-detailed"] then table.insert(treeNames, "tree-pinetalla-detailed") end
	-- [구역별 수관] 가을 황금수관·그늘진 참나무·북방 침엽수·열대 큰 야자.
	-- 새 실물 모델은 기존 나무 수량 안에서만 섞는다.
	if season == "가을" and not tropical and not winterScene and AssetIds["Terrain/tree-detailed-fall"] then
		table.insert(treeNames, "tree-detailed-fall")
	end
	if questTerrain == "forest" and not winterScene and AssetIds["Terrain/tree-oak-dark"] then
		table.insert(treeNames, "tree-oak-dark")
	end
	if northern and AssetIds["Terrain/tree-pinetallb-detailed"] then
		table.insert(treeNames, "tree-pinetallb-detailed")
	end
	if northern and AssetIds["Terrain/tree-pinetallc-detailed"] then
		table.insert(treeNames, "tree-pinetallc-detailed")
	end
	if not arid and (questTerrain == "highland" or questTerrain == "forest") and AssetIds["Terrain/tree-plateau"] then
		table.insert(treeNames, "tree-plateau")
	end
	-- [정식 CC0 실물] 기존 수목 배치 수를 유지하며 권한 확인된 숲·북방 원경 변종만 선택한다.
	if (questTerrain == "forest" or questTerrain == "highland") and AssetIds["Terrain/tree-detailed-dark"] then
		table.insert(treeNames, "tree-detailed-dark")
	end
	if northern and AssetIds["Terrain/tree-pinetalld-detailed"] then
		table.insert(treeNames, "tree-pinetalld-detailed")
	end
	if tropical and AssetIds["Terrain/tree-palmdetailedtall"] then
		table.insert(treeNames, "tree-palmdetailedtall")
	end
	-- [계절 수관 실물] 기존 나무 총량은 보존하면서 가을 참나무·해풍에 굽은 야자수를 섞는다.
	if season == "가을" and not tropical and not winterScene and AssetIds["Terrain/tree-oak-fall"] then
		table.insert(treeNames, "tree-oak-fall")
	end
	if tropical and AssetIds["Terrain/tree-palmbend"] then
		table.insert(treeNames, "tree-palmbend")
	end
	-- [5차 승인 모델] 기존 수목 예산 안에서 수직 숲 실루엣·먼 수관·계절 색을 강화한다.
	if not arid and (questTerrain == "forest" or questTerrain == "highland" or questTerrain == "jungle")
		and AssetIds["Terrain/tree-tall"] then table.insert(treeNames, "tree-tall") end
	if northern and questTerrain == "highland" and AssetIds["Terrain/tree-thin"] then
		table.insert(treeNames, "tree-thin")
	end
	if season == "가을" and not tropical and not winterScene and AssetIds["Terrain/tree-tall-fall"] then
		table.insert(treeNames, "tree-tall-fall")
	end
	-- [구획별 단순화된 식생 팔레트] 고스트 오브 쓰시마처럼 동일 화면의 나뭇잎색을 절제해 지역 정체성을 강조한다.
	local foliageTint = if winterScene then Color3.fromRGB(150, 173, 160)
		elseif northern and season == "가을" then Color3.fromRGB(155, 119, 66)
		elseif season == "가을" and not tropical and not arid then Color3.fromRGB(196, 119, 61)
		elseif season == "봄" and not tropical and not arid then Color3.fromRGB(111, 170, 91)
		elseif tropical then Color3.fromRGB(81, 146, 82)
		elseif arid then Color3.fromRGB(156, 151, 94)
		else Color3.fromRGB(102, 153, 82)
	-- [승인 자연물] 탐험 보상·몬스터 수·위험도와 분리된 환경 배치만 계산한다.
	local treeCount = math.floor(biome.trees * 2 * AREA)
	-- [지형 모델 수 해제] 기기별 개수 제한 없이 현재 바이옴과 맵 면적이 정한 수목을 배치한다.
	local visualTreeCount = treeCount
	for index = 1, visualTreeCount do
		local sample = scatter(14)
		-- 기존 전투 RNG 소비 순서를 유지한다. 이 값은 군락의 작은 편차로만 사용한다.
		local a, b
		if questTerrain == "forest" then
			b = rng:NextNumber(-half * 0.88, half * 0.61)
			a = rng:NextNumber(0.27, 0.78)
		elseif questTerrain == "highland" or questTerrain == "mine" or questTerrain == "ruins" then
			a = rng:NextNumber(0.62, 0.89)
			b = rng:NextNumber(-half * 0.83, half * 0.53)
		else
			a = rng:NextNumber(0.52, 0.88)
			b = rng:NextNumber(-half * 0.81, half * 0.50)
		end
		local pos = sceneryPosition(index, visualTreeCount, 5, 11, 0,
			(a - 0.55) * 7 + sample.X / half * 1.5, b / half * 3 + sample.Z / half)
		local h = rng:NextNumber(9, 15)
		local name = treeNames[rng:NextInteger(1, #treeNames)]
		-- [저폴리 원경] 신규 생성물 없이 같은 식생권의 기등록 Kenney 간결 실물을 선택한다.
		-- 근·중경의 수종 다양성·고품질 메시·지면 충돌과 총 배치 수는 그대로 둔다.
		local lowPolyVariant = false
		local distance = (Vector3.new(pos.X, spawn.Y, pos.Z) - spawn).Magnitude
		if distance >= 400 and not arid then
			local simpler = if winterScene or northern then "tree-pinedefaulta"
				elseif tropical then "kenney_tree_palmShort" else "kenney_tree_defaultDark"
			if AssetIds["Terrain/" .. simpler] then
				name, lowPolyVariant = simpler, true
			end
		end
		-- 실제 등록된 계절·수종 원본만 군락에 합류한다. 미등록 식생은 기존 수종을 보존한다.
		do
			local candidates = if winterScene then { "veg_birch_snow", "veg_alpine_conifer" }
				elseif questTerrain == "highland" then { "veg_alpine_conifer", "veg_conifer_grove" }
				elseif tropical then { "veg_coconut_palm_3", "veg_coconut_palm_4", "veg_palm_grove" }
				elseif questTerrain == "lake" or questTerrain == "swamp" then { "veg_river_willow_1", "veg_river_willow_2" }
				elseif region == "korea" or region == "japan" or region == "china" then { "veg_bamboo_tall", "veg_conifer_grove" }
				elseif arid then { "veg_dry_canopy" }
				elseif season == "가을" then { "veg_birch_autumn", "veg_autumn_grove" }
				elseif northern then { "veg_birch_green", "veg_northern_grove", "veg_conifer_grove" }
				else { "veg_birch_green", "veg_forest_edge" }
			if not lowPolyVariant and index % 5 <= 2 then
				local candidate = candidates[(index + portVisualSeed) % #candidates + 1]
				if AssetIds["Terrain/" .. candidate] then name = candidate end
			end
		end
		local kind = if AssetIds["Terrain/" .. name] then "Terrain" else "Town"
		local entry = { kind, name, h, nil, nil, false }
		entry.lowPolyVariant = lowPolyVariant
		entry.position = pos
		entry.band = if distance < 120 then "near" elseif distance < 400 then "mid" else "far"
		entry[7] = visualLayoutRng:NextNumber(-180, 180)
		-- 상록수는 북방 겨울에도 녹음을 유지하고, 낙엽수만 황금·적갈색 또는 서리색을 입힌다.
		entry.tint = if name == "tree-pinedefaulta" or name == "tree-pinedefaultb" or name == "tree-pinetalla-detailed"
			or name == "tree-pinetallb-detailed" or name == "tree-pinetallc-detailed" or name == "north-pine-fall"
			then (if winterScene then Color3.fromRGB(85, 117, 116) else Color3.fromRGB(103, 146, 92))
			elseif name == "tree-detailed-fall" then Color3.fromRGB(194, 123, 61)
			elseif name == "tree-oak-dark" then Color3.fromRGB(71, 109, 77)
			elseif name == "tree-plateau" then Color3.fromRGB(107, 143, 90)
			elseif name == "tree-oak-fall" or name == "tree-tall-fall" then Color3.fromRGB(169, 100, 52)
			elseif name == "tree-thin" then Color3.fromRGB(105, 136, 110)
			elseif name == "tree-tall" then Color3.fromRGB(105, 148, 88)
			elseif name == "tree-palmdetailedtall" or name == "tree-palmbend" then Color3.fromRGB(83, 157, 97)
			else foliageTint
		stageFeature(entry)
	end
	-- [무료 실물 지형] 기존 바위 개수를 유지하면서 등록된 Quaternius 모델을 섞는다.
	local rockNames = { { "Town", "rock-large" }, { "Town", "rock-small" }, { "Town", "rock-wide" }, { "Terrain", "Rock_2" } }
	-- [퀘스트 암석 실물] 기존 바위 슬롯 수만 사용. 계곡·광산·빙하·해안에서 바위의 단면을 달리한다.
	do
		local rocks = if questTerrain == "glacier" or questTerrain == "ruins" then {
			"kenney_stone_largeB", "kenney_rock_largeB" }
			elseif questTerrain == "highland" or questTerrain == "volcanic" then {
				"kenney_rock_tallE", "kenney_rock_largeD", "kenney_rock_largeB" }
			elseif questTerrain == "mine" or questTerrain == "desert" then {
				"kenney_rock_largeD", "kenney_rock_smallFlatA" }
			elseif questTerrain == "lake" or questTerrain == "coast" or portNature == "lagoon" then {
				"kenney_rock_smallFlatA", "kenney_stone_smallFlatA" }
			else { "kenney_rock_largeB", "kenney_rock_smallFlatA" }
		for _, name in rocks do
			if AssetIds["Terrain/" .. name] then table.insert(rockNames, { "Terrain", name }) end
		end
	end
	if AssetIds["Terrain/rock-largea"] then table.insert(rockNames, { "Terrain", "rock-largea" }) end
	if (questTerrain == "highland" or questTerrain == "mine" or questTerrain == "coast" or questTerrain == "glacier")
		and AssetIds["Terrain/rock-tallc"] then table.insert(rockNames, { "Terrain", "rock-tallc" }) end
	if (questTerrain == "highland" or questTerrain == "coast" or questTerrain == "glacier" or questTerrain == "volcanic")
		and AssetIds["Terrain/rock-talli"] then table.insert(rockNames, { "Terrain", "rock-talli" }) end
	if (questTerrain == "highland" or questTerrain == "coast" or questTerrain == "mine")
		and AssetIds["Terrain/rock-largec"] then table.insert(rockNames, { "Terrain", "rock-largec" }) end
	if (questTerrain == "highland" or questTerrain == "coast" or questTerrain == "mine" or questTerrain == "volcanic")
		and AssetIds["Terrain/rock-talld"] then table.insert(rockNames, { "Terrain", "rock-talld" }) end
	local rockCount = math.floor(biome.rocks * 1.6 * AREA)
	local visualRockCount = rockCount
	for index = 1, visualRockCount do
		local sample = scatter(10)
		local a, b
		if questTerrain == "highland" or questTerrain == "mine" or questTerrain == "coast" then
			a = rng:NextNumber(0.65, 0.90)
			b = rng:NextNumber(-half * 0.86, half * 0.44)
		else
			a = rng:NextNumber(0.55, 0.90)
			b = rng:NextNumber(-half * 0.84, half * 0.48)
		end
		local pos = sceneryPosition(index, visualRockCount, 4, 7, 1,
			(a - 0.55) * 6 + sample.X / half, b / half * 4 + sample.Z / half)
		local distance = (Vector3.new(pos.X, spawn.Y, pos.Z) - spawn).Magnitude
		local rock = rockNames[rng:NextInteger(1, #rockNames)]
		local lowPolyVariant = false
		-- [저폴리 원경] 근경 암석과 실제 충돌을 유지하며 원경만 승인된 단순 바위 메시 사용.
		if distance >= 400 and AssetIds["Terrain/kenney_rock_smallFlatA"] then
			rock, lowPolyVariant = { "Terrain", "kenney_rock_smallFlatA" }, true
		end
		local entry = { rock[1], rock[2], rng:NextNumber(2.5, 6), nil, nil, true }
		entry.lowPolyVariant = lowPolyVariant
		entry.position = pos
		entry.band = if distance < 120 then "near" elseif distance < 400 then "mid" else "far"
		entry[7] = visualLayoutRng:NextNumber(-180, 180)
		stageFeature(entry)
	end


	-- [입체 지형 랜드마크] 같은 평면에 소품만 흩뿌리던 방식 대신,
	-- 외곽 절벽·입구·강변·농경 구획을 하나의 장소로 묶어 뚜렷한 원근감을 준다.
	-- 항목: { 등록 그룹, 메시 이름, 높이, X/반폭, Z/반폭, 충돌, Y회전 }
	local landforms = {
		coast = {
			{"Naval","structure-platform-dock",34,-0.66,-0.74,true,0}, {"Naval","dock-side",16,-0.76,-0.53,true,90},
			{"Naval","boat-fishing-small",12,-0.61,-0.87,false,22}, {"Terrain","cliff-rock",27,0.79,-0.70,true,0},
			{"Terrain","cliff-rock",21,0.83,-0.34,true,25}, {"Naval","rocks-sand-a",13,0.68,-0.85,true,0},
			{"Naval","rocks-sand-b",10,0.70,-0.58,true,0}, {"Terrain","coast-grass-patch",5,-0.50,-0.30,false,0},
			{"Terrain","bridge-wood",12,-0.58,-0.42,true,0}, {"Terrain","campfire-logs",3.8,-0.44,-0.71,false,0},
		},
		forest = {
			{"Terrain","cliff-waterfall-rock",34,-0.77,-0.78,true,0}, {"Terrain","land-waterfall",21,-0.72,-0.72,false,0},
			{"Terrain","bridge-wood",16,-0.43,-0.56,true,42}, {"Terrain","forest-bush-detailed",7,-0.51,-0.26,false,0},
			{"Terrain","tree-oak",17,-0.49,-0.44,true,0}, {"Terrain","tree-oak",15,0.49,-0.30,true,0},
			{"Terrain","tree-pinedefaulta",18,-0.61,-0.14,true,0}, {"Terrain","tree-pinedefaulta",17,0.60,-0.56,true,0},
			{"Terrain","campfire-logs",4.5,0.66,-0.74,false,0}, {"Terrain","river-stone-bank",12,-0.67,-0.60,false,0},
			{"Terrain","forest-flower-purple",3,0.45,-0.15,false,0},
		},
		highland = {
			{"Terrain","cliff-rock",34,-0.78,-0.85,true,0}, {"Terrain","cliff-steps-rock",27,-0.81,-0.51,true,30},
			{"Terrain","cliff-rock",31,0.80,-0.77,true,0}, {"Terrain","cliff-rock",25,0.85,-0.38,true,15},
			{"Terrain","cliff-waterfall-rock",32,-0.72,-0.18,true,0}, {"Terrain","cliff-waterfalltop-rock",25,-0.76,-0.24,true,0},
			{"Terrain","bridge-stone",18,0.61,-0.62,true,33}, {"Terrain","gate-rock",16,-0.57,-0.67,true,0},
			{"Terrain","river-stone-bank",12,0.68,-0.42,false,0}, {"Terrain","campfire-stones",6,0.59,-0.14,false,0},
		},
		mine = {
			{"Terrain","cliff-cave-rock",43,0.67,-0.78,true,0}, {"Terrain","gate-metal-bars",18,0.65,-0.53,true,0},
			{"Terrain","cliff-rock",29,0.85,-0.50,true,0}, {"Terrain","cliff-rock",28,0.78,-0.20,true,0},
			{"Terrain","cliff-rock",30,-0.77,-0.67,true,0}, {"Terrain","cliff-steps-rock",17,-0.69,-0.35,true,0},
			{"Terrain","log-stack",7,0.51,-0.39,true,0}, {"Terrain","campfire-logs",5,-0.53,-0.68,false,0},
			{"Terrain","bridge-wood",13,-0.64,-0.48,true,0}, {"Terrain","debris",12,0.57,-0.26,false,0},
		},
		ruins = {
			{"Terrain","ruins-wall-arched",23,-0.71,-0.75,true,0}, {"Terrain","ruins-pillar-decorated",16,-0.57,-0.70,true,0},
			{"Terrain","greek-ruins-a",24,0.68,-0.72,true,0}, {"Terrain","greek-ruins-b",23,0.77,-0.56,true,35},
			{"Terrain","greek-column",15,-0.44,-0.47,true,0}, {"Terrain","greek-column",16,0.48,-0.47,true,0},
			{"Terrain","greek-statue",12,0.68,-0.33,true,0}, {"Terrain","ruins-wall-arched",18,-0.63,-0.20,true,90},
			{"Terrain","altar-stone",10,-0.64,-0.46,true,0}, {"Terrain","greek-ruins-c",18,0.76,-0.16,true,0},
		},
		fort = {
			{"Castle","wall-narrow-gate",23,-0.52,-0.74,true,0}, {"Castle","wall",20,-0.79,-0.74,true,0},
			{"Castle","wall",20,-0.79,-0.49,true,0}, {"Castle","tower-hexagon-base",23,-0.73,-0.88,true,0},
			{"Castle","fortress",38,0.75,-0.71,true,0}, {"Castle","wall",20,0.67,-0.42,true,0},
			{"Castle","flag-banner-long",15,0.62,-0.86,false,0}, {"Castle","bridge-draw",19,0.54,-0.61,true,0},
		},
		desert = {
			{"Terrain","mystic-sand-dune",27,-0.76,-0.84,true,0}, {"Terrain","mystic-sand-dune",31,0.74,-0.67,true,90},
			{"Terrain","egypt-temple-arch-a",21,-0.54,-0.66,true,0}, {"Terrain","egypt-obelisk",26,0.69,-0.28,true,0},
			{"Terrain","egypt-column",14,-0.64,-0.38,true,0}, {"Terrain","arid-cactus-tall",8,0.76,-0.15,false,0},
			{"Terrain","arid-cactus-tall",7,-0.77,-0.20,false,0}, {"Terrain","cliff-rock",23,0.83,-0.88,true,0},
			{"Terrain","campfire-stones",5,0.57,-0.50,false,0},
		},
		farm = {
			{"Town","windmill",35,0.72,-0.76,true,0}, {"Terrain","ground-pathstraight",25,0.42,-0.45,false,0},
			{"Terrain","crops-wheatstageb",8,-0.72,-0.72,false,0}, {"Terrain","crops-wheatstageb",8,-0.58,-0.72,false,0},
			{"Terrain","crops-wheatstageb",8,-0.72,-0.48,false,0}, {"Terrain","crops-wheatstageb",8,-0.58,-0.48,false,0},
			{"Terrain","crop-carrot",7,0.63,-0.35,false,0}, {"Terrain","crop-turnip",7,0.78,-0.35,false,0},
			{"Terrain","crops-cornstagec",10,-0.60,-0.18,false,0}, {"Terrain","log-stack",7,0.61,-0.57,true,0},
		},
		lake = {
			{"Terrain","cliff-waterfall-rock",29,-0.82,-0.78,true,0}, {"Terrain","land-waterfall",19,-0.73,-0.72,false,0},
			{"Terrain","ground-riverbend",18,-0.59,-0.53,false,0}, {"Terrain","ground-riverstraight",20,-0.51,-0.34,false,0},
			{"Terrain","bridge-stone",20,-0.56,-0.12,true,90}, {"Terrain","river-stone-bank",12,-0.75,-0.34,true,0},
			{"Terrain","river-stone-bank",12,-0.72,-0.12,true,0}, {"Terrain","forest-bush-detailed",9,0.60,-0.42,false,0},
			{"Terrain","tree-oak",18,0.77,-0.68,true,0}, {"Terrain","campfire-logs",5,0.56,-0.75,false,0},
		},
		jungle = {
			{"Terrain","cliff-waterfall-rock",36,-0.80,-0.81,true,0}, {"Terrain","land-waterfall",25,-0.77,-0.74,false,0},
			{"Terrain","tropical-palm-tall",21,-0.61,-0.48,true,0}, {"Terrain","tropical-palm-tall",19,0.62,-0.43,true,0},
			{"Terrain","east-bamboo-grove",15,-0.74,-0.12,false,0}, {"Terrain","east-bamboo-grove",13,0.75,-0.14,false,0},
			{"Terrain","bridge-wood",16,-0.48,-0.55,true,32}, {"Terrain","river-stone-bank",13,-0.70,-0.37,false,0},
			{"Terrain","forest-bush-detailed",9,0.54,-0.16,false,0},
		},
		swamp = {
			{"Terrain","ground-riverbend",22,-0.68,-0.75,false,0}, {"Terrain","ground-riverstraight",21,-0.60,-0.46,false,70},
			{"Terrain","bridge-wood",17,-0.58,-0.28,true,90}, {"Town","tree-crooked",18,-0.77,-0.62,true,0},
			{"Terrain","forest-bush-detailed",11,0.59,-0.72,false,0}, {"Terrain","river-stone-bank",15,0.76,-0.43,false,0},
			{"Terrain","tree-oak",20,0.80,-0.78,true,0}, {"Terrain","ground-rivercross",18,-0.71,-0.12,false,0},
			{"Terrain","forest-bush-detailed",7,0.58,-0.15,false,0},
		},
		glacier = {
			{"Terrain","cliff-rock",38,-0.79,-0.79,true,0}, {"Terrain","cliff-steps-rock",29,-0.81,-0.46,true,20},
			{"Terrain","cliff-rock",41,0.82,-0.81,true,0}, {"Terrain","cliff-rock",30,0.83,-0.40,true,30},
			{"Terrain","gate-rock",19,-0.57,-0.55,true,0}, {"Terrain","north-pine-fall",18,0.66,-0.22,false,0},
			{"Terrain","north-pine-fall",15,-0.67,-0.13,false,0}, {"Terrain","river-stone-bank",14,0.73,-0.60,false,0},
		},
		volcanic = {
			{"Terrain","cliff-cave-rock",44,0.75,-0.84,true,0}, {"Terrain","cliff-rock",38,-0.78,-0.82,true,0},
			{"Terrain","cliff-steps-rock",30,-0.83,-0.48,true,35}, {"Terrain","cliff-rock",33,0.85,-0.43,true,0},
			{"Terrain","debris",16,0.68,-0.27,false,0}, {"Terrain","cliff-rock",26,-0.70,-0.18,true,20},
			{"Terrain","campfire-stones",7,0.54,-0.56,false,0}, {"Terrain","Rock_2",11,-0.61,-0.61,true,0},
		},
		archive = {
			{"Terrain","platform-stone",24,-0.57,-0.53,false,0}, {"Terrain","ground-pathstraight",18,-0.55,-0.30,false,0},
			{"Terrain","village-fence",14,-0.73,-0.63,false,90}, {"Terrain","village-fence",14,0.73,-0.63,false,90},
			{"Town","cart",7,-0.48,-0.32,false,15}, {"Town","bench_A",5,0.48,-0.26,false,180},
			{"Terrain","forest-bush-detailed",7,0.58,-0.44,false,0}, {"Terrain","forest-flower-purple",4,-0.48,-0.13,false,0},
			{"Terrain","ground-pathcorner",10,0.62,-0.36,false,90},
		},
		plains = {
			{"Terrain","ground-pathstraight",24,-0.45,-0.60,false,0}, {"Terrain","village-fence",17,0.72,-0.70,false,90},
			{"Terrain","forest-bush-detailed",9,0.69,-0.53,false,0}, {"Terrain","campfire-stones",5,-0.62,-0.64,false,0},
			{"Terrain","coast-grass-patch",7,-0.64,-0.34,false,0}, {"Terrain","forest-flower-yellow",5,0.57,-0.25,false,0},
			{"Terrain","rock-largea",13,0.78,-0.42,true,0},
		},
	}

	-- 조사 가능한 두 흔적은 높은 절벽·먼 성벽 대신 접근 가능한 기존 소품에 붙인다.
	local surveyIndices = {
		coast = { 7, 8, 9 }, forest = { 4, 8, 9 }, highland = { 8, 9, 10 },
		mine = { 7, 9, 10 }, ruins = { 5, 7, 9 }, fort = { 7, 8 },
		desert = { 5, 6, 9 }, farm = { 2, 3, 7 }, lake = { 3, 7, 8 },
		plains = { 4, 6, 5 }, archive = { 5, 6, 8 }, jungle = { 5, 8, 9 }, swamp = { 3, 6, 8 },
		glacier = { 5, 6, 8 }, volcanic = { 5, 7, 8 },
	}
	local featureList = landforms[questTerrain] or landforms.plains
	-- 일반 혼합 조사에는 지역 밖 발견물의 건축물·동식물을 대표 경관으로 사칭하지 않는다.
	if table.find({ "survey_01", "survey_08", "survey_12", "survey_13", "survey_14", "survey_15", "survey_18", "survey_19", "survey_21", "survey_24", "survey_27", "survey_29", "survey_30" }, opts.siteId or "") then
		folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
	end
	if folder:GetAttribute("FieldPacificSurvey") then
		-- 유칼립투스·카우리·맹그로브·산호 및 문화권 전용 원본은 실제 등록 전까지 미확보로 기록한다.
		folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
		if questTerrain == "jungle" then
			featureList[5][2], featureList[6][2] = "plant-bushlarge", "forest-bush-detailed"
		elseif questTerrain == "forest" then
			-- 외국 수종을 대표종으로 사칭하지 않고 중립 하층과 숲길을 사용한다.
			featureList[5][2], featureList[6][2] = "tree-detailed", "tree-detailed-dark"
			featureList[7][2], featureList[8][2] = "tree-tall", "tree-detailed"
		end
	end
	-- 그리스 신전·이집트 기둥·유럽 풍차를 모든 문화권의 유적/농경지에 반복하지 않는다.
	-- 해당 문화권 전용 원본이 없는 자리는 승인된 자연물·무명의 발굴 흔적만 배치한다.
	do
		local port = opts.portId and Ports.Ports[opts.portId]
		if questTerrain == "ruins" and region ~= "italy" and region ~= "med" then
			local neutral = { [1] = "debris", [2] = "rock-talld", [3] = "rock-largec", [4] = "cliff-rock",
				[5] = "ground-pathrocks", [6] = "rock-largea", [7] = "debris", [8] = "rock-largec",
				[9] = "ground-pathrocks", [10] = "rock-talld" }
			for index, asset in neutral do
				local entry = featureList[index]
				if entry then
					entry[1], entry[2] = "Terrain", asset
					entry[3] = math.min(entry[3], if index == 4 or index == 8 then 19 else 10)
				end
			end
		elseif questTerrain == "desert" and (not port or port.country ~= "egypt") then
			for index, asset in { [3] = "cliff-rock", [4] = "rock-talld", [5] = "rock-largea" } do
				local entry = featureList[index]
				entry[1], entry[2], entry[3] = "Terrain", asset, math.min(entry[3], 17)
			end
		elseif questTerrain == "farm" and (tropical or arid or region == "japan" or region == "korea" or region == "china"
			or table.find({ "charleston_rice", "survey_am_b", "bridgetown_sugar", "havana_orchard" }, opts.siteId or "")) then
			featureList[1][1], featureList[1][2], featureList[1][3] = "Terrain", "village-fence", 18
		end
		-- [장소별 근·중경 구성] 승인 실물만 기존 슬롯에 배치한다. 조사 슬롯/충돌은 보존한다.
		if questTerrain == "mine" then
			featureList[8][1], featureList[8][2], featureList[8][3] = "Town", "lantern", 2.5
			featureList[10][1], featureList[10][2], featureList[10][3] = "Cargo", "resource-stone", 6
			if opts.siteId == "carrara_quarry" or opts.siteId == "marble_quarry" then
				for _, index in { 1, 2, 3, 4, 5, 6 } do
					featureList[index][2] = if index == 6 then "cliff-cornerlarge-stone" else "cliff-large-stone"
				end
				featureList[10][2] = "stone-bricks-stack-small"
			end
		elseif questTerrain == "swamp" and table.find({ "marseille_salt", "la_rochelle_salt", "cagliari_salt" }, opts.siteId or "") then
			-- [염전] 낮은 제방과 수로, 소금 운반 도구를 같은 구획에 배치한다.
			-- 실제 염전 원본은 아직 미등록이므로 기존 수로 원본만 사용한다.
			featureList[1] = { "Terrain", "ground-riverstraight", 24, -0.68, -0.75, false, 0 }
			featureList[2] = { "Terrain", "ground-riverstraight", 24, -0.60, -0.46, false, 0 }
			featureList[3] = { "Terrain", "ground-riverbendbank", 13, -0.58, -0.28, true, 0 }
			featureList[4] = { "Town", "cart", 6, -0.77, -0.62, true, 0 }
			featureList[5] = { "Terrain", "river-stone-bank", 11, 0.59, -0.72, false, 0 }
			featureList[6] = { "Cargo", "barrel", 3, 0.76, -0.43, true, 0 }
			featureList[7] = { "Terrain", "village-fence", 14, 0.80, -0.78, true, 0 }
			featureList[8] = { "Terrain", "ground-riverrocks", 8, -0.71, -0.12, false, 0 }
			featureList[9] = { "Terrain", "coast-grass-patch", 4, 0.58, -0.15, false, 0 }
			folder:SetAttribute("FieldSiteComposition", "salt-work-waterway")
		elseif questTerrain == "swamp" and table.find({ "bissau_mangrove", "calabar_delta", "calcutta_delta", "basra_marsh", "neworleans_delta", "belem_amazon", "pac_survey_03", "survey_05", "survey_27" }, opts.siteId or "") then
			-- [삼각주·맹그로브 수변] 물길과 둑, 낮은 식생을 분리한다. 미등록 맹그로브 뿌리나 갈대 원본을 사칭하지 않는다.
			featureList[1] = { "Terrain", "ground-riverbend", 23, -0.68, -0.75, false, 0 }
			featureList[2] = { "Terrain", "ground-riverstraight", 21, -0.60, -0.46, false, 70 }
			featureList[3] = { "Terrain", "bridge-wood", 15, -0.58, -0.28, true, 90 }
			featureList[4] = { "Terrain", "ground-riverbendbank", 15, -0.77, -0.62, false, 0 }
			featureList[5] = { "Terrain", "plant-bushlarge", 7, 0.59, -0.72, false, 0 }
			featureList[6] = { "Terrain", "river-stone-bank", 10, 0.76, -0.43, false, 0 }
			featureList[7] = { "Terrain", if opts.siteId == "neworleans_delta" then "tree-oak" else "tropical-palm-tall", 17, 0.80, -0.78, true, 0 }
			featureList[8] = { "Terrain", "canoe", 9, -0.71, -0.12, false, 0 }
			featureList[9] = { "Terrain", "grass-leafslarge", 4, 0.58, -0.15, false, 0 }
			folder:SetAttribute("FieldSiteComposition", "delta-waterway")
			folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
		elseif questTerrain == "coast" then
			-- [해안 세부 구성] 갯벌·암벽·어항을 같은 부두 복제본으로 표시하지 않는다.
			local siteId = opts.siteId or ""
			local tidal = table.find({ "dunkirk_flats", "amsterdam_flats", "copenhagen_eider_isle", "incheon_flats", "auto_geography_hamburg_low", "auto_geography_london_low" }, siteId) ~= nil
			local fjord = table.find({ "bergen_fjord", "oslo_fjord", "bergen_cliffs", "stockholm_skerries", "pac_survey_16", "pac_survey_17", "pac_survey_19", "auto_geography_bergen_low", "survey_02", "survey_32" }, siteId) ~= nil
			local cliffs = fjord or table.find({ "london_chalk", "giants_causeway", "rouen_coast", "edinburgh_coast", "gothenburg_eider", "gdansk_amber_beach", "marseille_calanques", "gibraltar_cliff",
				"gibraltar_cave", "trieste_karst", "pac_survey_15", "pac_survey_18", "survey_04", "survey_06", "survey_16" }, siteId) ~= nil
			local wharf = table.find({ "bergen_wharf", "bergen_whale_station", "amsterdam_herring_quay", "amsterdam_fog",
				"gdansk_harbor", "hull_whalers", "glasgow_clyde", "bordeaux_quay", "porto_ribeira",
				"cadiz_treasure_fleet", "toulon_arsenal", "la_rochelle_towers", "jeddah_pilgrim",
				"cochin_nets", "manila_galleon", "amoy_harbor", "nagasaki_dejima", "stjohns_banks", "boston_whalers", "auto_site_bergen_low", "auto_architecture_venice_low" }, siteId) ~= nil
			local shipyard = string.match(siteId, "^auto_shipbuilding_") ~= nil or siteId == "survey_30"
			local reef = table.find({ "mombasa_reef", "jeddah_reef", "maldives_atoll", "coral_banks", "recife_reef", "survey_am_a", "pac_survey_07", "pac_survey_09", "survey_14", "survey_18" }, siteId) ~= nil
			if reef then
				-- [산호 해안] 원본 산호가 없으므로 얕은 해안과 낮은 암반만 구성한다.
				featureList[1] = { "Terrain", "platform-beach", 25, -0.66, -0.74, true, 0 }
				featureList[2] = { "Terrain", "kenney_rock_smallFlatA", 5, -0.76, -0.53, true, 90 }
				featureList[4] = { "Naval", "rocks-sand-a", 5, 0.79, -0.70, true, 0 }
				featureList[5] = { "Naval", "rocks-sand-b", 4, 0.83, -0.34, true, 25 }
				featureList[6] = { "Terrain", "tropical-palm-short", 10, 0.68, -0.85, false, 0 }
				featureList[9] = { "Terrain", "ground-riverrocks", 7, -0.58, -0.42, true, 0 }
				folder:SetAttribute("FieldSiteComposition", "shallow-reef-shore")
				folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
			elseif table.find({ "pac_survey_02", "pac_survey_13", "pac_survey_20", "survey_01", "survey_10", "survey_20", "survey_31" }, siteId) then
				-- 호주 서안·페루 연안: 부두와 거대 암벽 대신 모래·낮은 돌 해안.
				featureList[1] = { "Terrain", "platform-beach", 25, -0.66, -0.74, false, 0 }
				featureList[2] = { "Terrain", "river-stone-bank", 7, -0.76, -0.53, false, 90 }
				featureList[3] = { "Terrain", "ground-pathrocks", 8, -0.61, -0.87, false, 22 }
				featureList[4] = { "Terrain", "kenney_rock_smallFlatA", 5, 0.79, -0.70, false, 0 }
				featureList[5] = { "Terrain", "kenney_stone_smallFlatA", 4, 0.83, -0.34, false, 25 }
				featureList[6] = { "Terrain", "coast-grass-patch", 5, 0.68, -0.85, false, 0 }
				featureList[7] = { "Naval", "rocks-sand-b", 5, 0.70, -0.58, false, 0 }
				featureList[9] = { "Terrain", "ground-riverrocks", 7, -0.58, -0.42, false, 0 }
				folder:SetAttribute("FieldSiteComposition", "low-sandy-shore")
			elseif tidal then
				featureList[1] = { "Terrain", "platform-beach", 19, -0.66, -0.74, true, 0 }
				featureList[2] = { "Terrain", "river-stone-bank", 9, -0.76, -0.53, true, 90 }
				featureList[4] = { "Terrain", "kenney_rock_smallFlatA", 4, 0.79, -0.70, true, 0 }
				featureList[5] = { "Terrain", "kenney_stone_smallFlatA", 3, 0.83, -0.34, true, 25 }
				featureList[9] = { "Terrain", "ground-riverrocks", 8, -0.58, -0.42, true, 0 }
				folder:SetAttribute("FieldSiteComposition", "tidal-flat")
			elseif cliffs then
				featureList[1] = { "Terrain", "cliff-blockslope-rock", 28, -0.76, -0.74, true, 15 }
				featureList[2] = { "Terrain", "rock-largec", 12, -0.76, -0.53, true, 90 }
				featureList[4][2], featureList[5][2] = if siteId == "london_chalk" then "cliff-large-stone" else "cliff-large-rock",
					if siteId == "london_chalk" then "cliff-cornerlarge-stone" else "cliff-cornerlarge-rock"
				featureList[4][3], featureList[5][3] = if fjord then 43 else 39, if fjord then 36 else 32
				featureList[9] = { "Terrain", "rock-largea", 7, -0.58, -0.42, true, 0 }
				folder:SetAttribute("FieldSiteComposition", if fjord then "fjord" else "rocky-shore")
			elseif shipyard then
				-- 조선소는 기존 등록 부두·가공 목재·닻으로 작업 구획을 구성한다.
				featureList[1] = { "Naval", "structure-platform-dock-small", 24, -0.66, -0.74, true, 0 }
				featureList[4] = { "Cargo", "wood-planks-stack-small", 7, 0.79, -0.70, false, 0 }
				featureList[5] = { "Cargo", "wood-log-stack", 7, 0.83, -0.34, false, 25 }
				featureList[6] = { "Naval", "anchor", 5, 0.68, -0.85, false, 0 }
				featureList[7] = { "Cargo", "resource-planks", 5, 0.70, -0.58, false, 0 }
				featureList[10] = { "Town", "lantern", 3, -0.44, -0.71, false, 0 }
				folder:SetAttribute("FieldSiteComposition", "shipyard-workspace")
				folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
			elseif wharf then
				featureList[4] = { "Naval", "structure-platform-dock-small", 19, 0.79, -0.70, true, 90 }
				featureList[5] = { "Town", "cart", 5, 0.83, -0.34, true, 25 }
				featureList[6] = { "Cargo", "wood-log-stack", 5, 0.68, -0.85, true, 0 }
				featureList[7] = { "Cargo", "food-barrel-fish", 3, 0.70, -0.58, true, 0 }
				featureList[10] = { "Town", "lantern", 3, -0.44, -0.71, false, 0 }
				folder:SetAttribute("FieldSiteComposition", "working-wharf")
			end
		elseif questTerrain == "ruins" and opts.siteId == "campeche_maya" then
			folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
		elseif questTerrain == "ruins" and (opts.siteId == "ningbo_temple" or opts.siteId == "survey_29") then
			-- [동아시아 사찰 터] 실제 등록된 동아시아 석재 기단·계단·종을 배치한다.
			-- 미등록 사찰 본전은 만들지 않고 조사 동선은 기존 자리에 유지한다.
			featureList[1] = { "Town", "eastasia-base", 19, -0.71, -0.75, true, 0 }
			featureList[2] = { "Town", "eastasia-column-base", 7, -0.57, -0.70, true, 0 }
			featureList[3] = { "Town", "eastasia-bell", 11, 0.68, -0.72, true, 0 }
			featureList[4] = { "Town", "eastasia-stairs", 12, 0.77, -0.56, true, 35 }
			featureList[5] = { "Terrain", "ground-pathrocks", 8, -0.44, -0.47, true, 0 }
			featureList[7] = { "Terrain", "east-bamboo-grove", 9, 0.68, -0.33, true, 0 }
			featureList[9] = { "Terrain", "altar-stone", 6, -0.64, -0.46, true, 0 }
			folder:SetAttribute("FieldSiteComposition", "east-asian-temple-court")
			folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
		elseif questTerrain == "fort" and table.find({ "halifax_citadel", "louisbourg_fort", "kingston_royal", "sanjuan_morro", "cartagena_walls", "havana_fort" }, opts.siteId or "") then
			-- 미주 역사 요새 전용 모델이 확인될 때까지 중세 성·깃발·도개교를 표시하지 않는다.
			featureList[1] = { "Terrain", "ground-pathstraight", 18, -0.52, -0.74, false, 0 }
			featureList[2] = { "Terrain", "ground-pathrocks", 12, -0.79, -0.74, false, 0 }
			featureList[3] = { "Terrain", "river-stone-bank", 10, -0.79, -0.49, false, 0 }
			featureList[4] = { "Terrain", "platform-stone", 15, -0.73, -0.88, false, 0 }
			featureList[5] = { "Terrain", "rock-largea", 9, 0.75, -0.71, false, 0 }
			featureList[6] = { "Terrain", "river-stone-bank", 10, 0.67, -0.42, false, 0 }
			featureList[7] = { "Terrain", "ground-pathrocks", 9, 0.62, -0.86, false, 0 }
			featureList[8] = { "Town", "lantern", 3, 0.54, -0.61, false, 0 }
			folder:SetAttribute("FieldSiteComposition", "colonial-fort-ground")
			folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
		elseif questTerrain == "fort" and (opts.siteId == "osaka_castle" or opts.siteId == "edo_castle") then
			-- [일본 성터] 서양 성채 모델을 일본 천수각으로 표시하지 않는다.
			-- 기등록 석재 기단과 절개면, 계단만 사용한다.
			featureList[1] = { "Town", "eastasia-stairs", 15, -0.52, -0.74, true, 0 }
			featureList[2] = { "Terrain", "cliff-blockslopewalls-rock", 23, -0.79, -0.74, true, 0 }
			featureList[3] = { "Terrain", "cliff-large-stone", 20, -0.79, -0.49, true, 0 }
			featureList[4] = { "Town", "eastasia-base", 19, -0.73, -0.88, true, 0 }
			featureList[5] = { "Terrain", "cliff-cornerlarge-stone", 28, 0.75, -0.71, true, 0 }
			featureList[6] = { "Terrain", "cliff-blockslopewalls-rock", 20, 0.67, -0.42, true, 0 }
			featureList[7] = { "Terrain", "ground-pathrocks", 9, 0.62, -0.86, false, 0 }
			featureList[8] = { "Terrain", "bridge-wood", 16, 0.54, -0.61, true, 0 }
			folder:SetAttribute("FieldSiteComposition", "japanese-stone-fort")
			folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
		elseif questTerrain == "ruins" and table.find({ "runestone_field", "stockholm_runes", "boyne_valley", "orkney_brodgar",
			"uppsala_mounds", "dublin_stones", "brittany_stones", "orkney_village", "auto_mystery_mys_stone_circle" }, opts.siteId or "") then
			-- 거석과 봉분의 일반적인 석재 윤곽만 표현한다. 실제 룬 문자·유적 원본으로 사칭하지 않는다.
			for _, index in { 1, 2, 3, 4, 6, 8, 10 } do
				local entry = featureList[index]
				entry[1], entry[2], entry[3] = "Terrain", if index % 2 == 0 then "rock-tallc" else "rock-talld", if index % 2 == 0 then 8 else 11
			end
			featureList[5][2], featureList[7][2], featureList[9][2] = "ground-pathrocks", "rock-largea", "ground-pathrocks"
			folder:SetAttribute("FieldSiteComposition", "megalithic-stone")
		elseif questTerrain == "lake" and table.find({ "amsterdam_canals", "amsterdam_polder", "rotterdam_dike", "hamburg_estuary",
			"saint_louis_river", "basra_canals", "cochin_backwaters", "tianjin_canal", "batavia_canal", "brunei_water", "newyork_harbor", "montevideo_plata", "trinidad_pitch", "auto_architecture_amsterdam_low", "auto_architecture_hamburg_low", "survey_03", "survey_07", "survey_15" }, opts.siteId or "") then
			-- 평탄한 제방·운하의 접지 모델을 연속 배치하며 폭포·산악 실루엣을 제거한다.
			featureList[1] = { "Terrain", "ground-riverbendbank", 18, -0.82, -0.78, true, 0 }
			featureList[2] = { "Terrain", "ground-riverside", 17, -0.73, -0.72, false, 0 }
			featureList[3][2], featureList[4][2] = "ground-riverbend", "ground-riverstraight"
			featureList[9] = { "Terrain", "village-fence", 12, 0.77, -0.68, true, 0 }
			folder:SetAttribute("FieldSiteComposition", "lowland-waterway")
		elseif questTerrain == "archive" and (string.match(opts.siteId or "", "^auto_goods_") or table.find({ "istanbul_bazaar", "smyrna_bazaar", "barcelona_market",
			"barcelona_gothic", "algiers_kasbah", "riga_old_town", "casablanca_medina",
			"surat_bazaar", "osaka_market", "jade_market", "hoi_an_lanterns", "zanzibar_stone", "portobelo_fair", "survey_12", "survey_24" }, opts.siteId or "")) then
			-- [시장과 구시가] 기관 정원 대신 석재 길과 실제 시장 가판대, 운반 상자를 배치한다.
			featureList[1] = { "Terrain", "platform-stone", 24, -0.57, -0.53, false, 0 }
			featureList[2] = { "Terrain", "ground-pathstraight", 18, -0.55, -0.30, false, 0 }
			featureList[3] = { "Town", "stall-red", 8, -0.73, -0.63, false, 90 }
			featureList[4] = { "Town", "stall-green", 8, 0.73, -0.63, false, 90 }
			featureList[7] = { "Cargo", "barrel", 3, 0.58, -0.44, false, 0 }
			featureList[9] = { "Town", "lantern", 3, 0.62, -0.36, false, 90 }
			folder:SetAttribute("FieldSiteComposition", "market-street")
		elseif questTerrain == "archive" then
			if table.find({ "boston_church", "philadelphia_hall", "salvador_church" }, opts.siteId or "") then
				folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
			end
			-- 기관 정원: 석재 마당·경계·벤치·수레. 전용 건물을 사칭하지 않는다.
			featureList[3][1], featureList[3][2] = "Town", "fence_straight_long"
			featureList[4][1], featureList[4][2] = "Town", "fence_straight_long"
			featureList[9][1], featureList[9][2] = "Town", "bench_B"
			-- 학문별 기관 바깥 조사 공간: 승인된 소품만 이용하며 실제 연구기구·건물로 사칭하지 않는다.
			local discipline = string.match(opts.siteId or "", "^auto_([%a]+)_")
			if discipline == "chemistry" or discipline == "physics" then
				featureList[5] = { "Town", "stall-bench", 5, -0.48, -0.32, false, 15 }
				featureList[6] = { "Naval", "crate-bottles", 3, 0.48, -0.26, false, 180 }
				featureList[8] = { "Town", "lantern", 2.5, -0.48, -0.13, false, 0 }
				folder:SetAttribute("FieldSiteComposition", "study-work-court")
				folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
			elseif discipline == "medicine" then
				featureList[5] = { "Town", "bench_A", 5, -0.48, -0.32, false, 15 }
				featureList[7] = { "Terrain", "plant-bushsmall", 3, 0.58, -0.44, false, 0 }
				featureList[8] = { "Terrain", "forest-flower-purple", 3, -0.48, -0.13, false, 0 }
				folder:SetAttribute("FieldSiteComposition", "medical-garden")
				folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
			elseif discipline == "astronomy" then
				featureList[3] = { "Terrain", "ground-pathrocks", 9, -0.73, -0.63, false, 90 }
				featureList[4] = { "Terrain", "ground-pathrocks", 9, 0.73, -0.63, false, 90 }
				featureList[5] = { "Town", "bench_A", 5, -0.48, -0.32, false, 15 }
				folder:SetAttribute("FieldSiteComposition", "observation-court")
				folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
			elseif discipline == "art" then
				featureList[5] = { "Town", "stall-bench", 6, -0.48, -0.32, false, 15 }
				featureList[7] = { "Cargo", "wood-planks-stack-small", 4, 0.58, -0.44, false, 0 }
				folder:SetAttribute("FieldSiteComposition", "artisan-court")
				folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
			elseif discipline then
				folder:SetAttribute("FieldSiteComposition", "records-court")
				folder:SetAttribute("FieldSiteSpecialOriginalMissing", true)
			end
		elseif questTerrain == "farm" then
			-- 실제 작물이 없는 농경지에 밀·옥수수·당근을 임의로 표시하지 않는다.
			local crop = if string.find(questName, "밀", 1, true) then "crops-wheatstageb"
				elseif string.find(questName, "옥수수", 1, true) then "crops-cornstagec"
				elseif string.find(questName, "당근", 1, true) then "crop-carrot"
				elseif string.find(questName, "호박", 1, true) then "crop-pumpkin" else nil
			for _, index in { 3, 4, 5, 6, 7, 8, 9 } do
				local entry = featureList[index]
				if crop then entry[2] = crop
				else entry[2], entry[3] = "ground-pathrocks", 8 end
			end
			folder:SetAttribute("FieldCropOriginalMissing", crop == nil)
		end
	end
	for index, entry in featureList do
		entry.landmark = true
		entry.survey = table.find(surveyIndices[questTerrain] or surveyIndices.plains, index) ~= nil
		-- 지형의 대표 구조물은 중경 묶음에 두고 조사 대상은 접근 가능한 기존 전장 안쪽에 유지한다.
		if not entry.survey then
			local sign = if entry[4] < 0 then -1 else 1
			entry[4] = sign * math.clamp(math.abs(entry[4]) + 0.06, 0.52, 0.90)
			entry[5] = math.clamp(entry[5] - 0.08, -0.90, 0.15)
		end
		stageFeature(entry)
	end
	-- [전장 지형지물] 발헤임의 생물군계 구분·엘든 링의 먼 유적 윤곽·고스트 오브 쓰시마의 식생층 원리만 참고한다.
	-- 타 게임 모델·텍스처는 복제하지 않으며 등록된 CC0 실물 지형만 사용한다.
	-- [원근 입체감] Kenney CC0 실물 절벽 면/상단/경사와 숲 하층을 지형 높이 위에 층으로 배치한다.
	-- 동선과 퀘스트 조사 대상은 그대로 유지하며 시각 모델 충돌은 만들지 않는다.
	do -- [Luau 지역변수 상한] 추가 실물 깊이 배치표는 기존 구획과 지역변수 생명주기를 분리한다.
	local depthLandforms = if folder:GetAttribute("FieldSiteComposition") == "shallow-reef-shore"
		or folder:GetAttribute("FieldSiteComposition") == "tidal-flat"
		or folder:GetAttribute("FieldSiteComposition") == "low-sandy-shore" then {
		{ "platform-beach", 25, -0.87, -0.82, -18 },
		{ "kenney_rock_smallFlatA", 5, 0.87, -0.60, 20 },
		{ "ground-riverrocks", 9, -0.83, -0.31, 32 },
		{ "coast-grass-patch", 4, 0.76, -0.27, -10 },
		{ "river-stone-bank", 8, -0.57, -0.49, 40 },
	} elseif folder:GetAttribute("FieldSiteComposition") == "lowland-waterway"
		or folder:GetAttribute("FieldSiteComposition") == "delta-waterway"
		or folder:GetAttribute("FieldSiteComposition") == "salt-work-waterway" then {
		{ "ground-riverstraight", 22, -0.84, -0.71, 24 },
		{ "ground-riverbendbank", 15, 0.77, -0.49, -12 },
		{ "ground-rivertile", 19, 0.89, -0.83, 15 },
		{ "river-stone-bank", 10, -0.70, -0.37, 8 },
		{ "grass-leafslarge", 4, 0.64, -0.34, 18 },
	} elseif questTerrain == "glacier" then {
		{ AssetIds["Terrain/cliff-cornerinnertop-stone"] and "cliff-cornerinnertop-stone" or "cliff-large-stone", 45, -0.85, -0.66, 14 },
		{ "cliff-cornerlarge-stone", 32, 0.82, -0.43, 28 },
		{ "cliff-blockdiagonal-rock", 31, 0.91, -0.84, -9 },
		{ "cliff-cornertop-rock", 33, -0.84, -0.22, -24 },
		{ "rock-largec", 16, 0.73, -0.78, 0 },
		{ "ground-pathrocks", 10, -0.52, -0.39, -17 },
		{ "cliff-blockslope-rock", 24, -0.92, -0.45, 23 }
	} elseif questTerrain == "archive" then {
		{ "platform-stone", 20, -0.76, -0.64, 0 },
		{ "village-fence", 19, 0.77, -0.52, 90 },
		{ "village-fence", 19, -0.79, -0.35, 90 },
		{ "ground-pathcorner", 12, 0.62, -0.42, 90 },
		{ "forest-bush-detailed", 8, -0.62, -0.30, 12 },
		{ "forest-flower-yellow", 5, 0.58, -0.25, 0 },
	} elseif questTerrain == "volcanic" then {
		-- [화산 전장] 신규 절벽 측벽은 등록 시에만 기존 원경 암벽 대신 사용한다.
		{ AssetIds["Terrain/cliff-blockslopewalls-rock"] and "cliff-blockslopewalls-rock" or "cliff-large-rock", 43, -0.84, -0.70, 14 },
		{ "cliff-blockdiagonal-rock", 33, 0.86, -0.54, -17 },
		{ "debris", 14, -0.66, -0.35, 11 },
		{ "cliff-cornerinnertop-rock", 31, 0.87, -0.83, 22 },
		{ "rock-talld", 18, 0.77, -0.26, 14 },
		{ "ground-pathrocks", 9, -0.55, -0.44, 13 },
	} elseif questTerrain == "highland" then {
		{ AssetIds["Terrain/cliff-topdiagonal-rock"] and "cliff-topdiagonal-rock" or "cliff-diagonal-rock", 44, -0.83, -0.65, 13 },
		{ "cliff-blockslope-rock", 29, 0.80, -0.44, 28 },
		{ "cliff-blockdiagonal-rock", 32, 0.92, -0.84, -11 },
		{ "cliff-cornerinnertop-rock", 33, -0.84, -0.22, -24 },
		{ "rock-talld", 16, 0.73, -0.78, 0 },
		{ "ground-pathbend", 10, -0.52, -0.39, -17 },
		{ "cliff-large-rock", 36, -0.92, -0.85, 11 },
		{ "cliff-cornerinnerlarge-rock", 29, -0.89, -0.38, 30 }
	} elseif questTerrain == "coast" then {
		{ "cliff-cornerinnertop-rock", 34, 0.87, -0.60, 20 },
		{ "platform-beach", 28, -0.87, -0.82, -18 },
		{ "cliff-cornertop-rock", 26, -0.83, -0.31, 32 },
		{ "cliff-diagonal-rock", 29, 0.86, -0.83, -12 },
		{ "ground-riverside", 15, 0.76, -0.27, -10 },
		{ "ground-riverbendbank", 13, -0.57, -0.49, 40 },
		{ "cliff-blockdiagonal-rock", 34, 0.91, -0.88, 15 },
		{ "cliff-cornerinnerlarge-rock", 31, -0.91, -0.37, 27 }
	} elseif questTerrain == "lake" then {
		{ "cliff-cornerinnertop-rock", 34, 0.87, -0.60, 20 },
		{ "cliff-blockslope-rock", 24, 0.86, -0.77, 18 },
		{ "cliff-cornertop-rock", 26, -0.83, -0.31, 32 },
		{ "cliff-diagonal-rock", 29, 0.86, -0.83, -12 },
		{ "ground-riverside", 15, 0.76, -0.27, -10 },
		{ AssetIds["Terrain/ground-rivercorner"] and "ground-rivercorner" or "ground-riverbendbank", 13, -0.57, -0.49, 40 },
		{ AssetIds["Terrain/ground-rivertile"] and "ground-rivertile" or "ground-riverbendbank", 15, -0.73, -0.70, -16 }
	} elseif questTerrain == "mine" then {
		-- [광산 3D 층] 등록 확인된 동굴암벽 원본을 기존 원경 자리에서만 사용한다.
		{ AssetIds["Terrain/cliff-blockcave-rock"] and "cliff-blockcave-rock" or "cliff-cave-rock", 36, -0.84, -0.68, 15 },
		{ "wood-support", 19, 0.78, -0.54, -12 },
		{ "cliff-blockslope-rock", 28, 0.87, -0.82, 20 },
		{ "log-stack", 8, -0.63, -0.41, 28 },
		{ "rock-talld", 18, 0.79, -0.27, 9 },
		{ "cliff-cornerinnerlarge-rock", 31, -0.91, -0.88, 14 },
	} elseif questTerrain == "fort" then {
		-- [성채 전장] 성벽 실루엣을 유지하고 아래 암반·목재 보강 구조를 따로 깐다.
		{ "cliff-blockslope-rock", 31, -0.85, -0.68, 18 },
		{ "wood-support", 19, 0.78, -0.47, -10 },
		{ "cliff-blockdiagonal-rock", 30, 0.89, -0.84, 17 },
		{ "rock-largea", 13, -0.72, -0.32, -12 },
		{ "ground-pathrocks", 9, 0.63, -0.37, 19 },
		{ "cliff-cornerlarge-rock", 28, -0.90, -0.81, 15 },
	} elseif questTerrain == "ruins" then {
		-- [유적 3D 층] 아치·부서진 기둥과 암벽을 다른 원근에 분리한다.
		{ if region == "italy" or region == "med" then "ruins-wall-arched" else "cliff-large-stone", 28, -0.84, -0.75, 15 },
		{ if region == "italy" or region == "med" then "ruins-pillar-decorated" else "rock-tallc", 19, 0.81, -0.56, -21 },
		{ "cliff-cornerinnertop-rock", 29, 0.89, -0.83, 24 },
		{ "rock-largea", 13, -0.74, -0.34, 12 },
		{ "ground-pathrocks", 9, 0.61, -0.41, 18 },
		{ "cliff-blockdiagonal-rock", 26, -0.91, -0.54, -12 },
	} elseif questTerrain == "desert" then {
		-- [사막 3D 층] 모래 언덕을 근경, 암벽을 원경으로 구분한다.
		{ "mystic-sand-dune", 35, -0.86, -0.78, 10 },
		{ "rock-largea", 19, 0.80, -0.47, -12 },
		{ "cliff-blockdiagonal-rock", 31, 0.90, -0.87, 21 },
		{ "ground-pathrocks", 9, -0.58, -0.32, 8 },
		{ "rock-talld", 14, -0.81, -0.19, -11 },
		{ "cliff-cornerlarge-rock", 29, -0.91, -0.57, 15 },
	} elseif questTerrain == "farm" then {
		-- [농경지 3D 층] 신규 흙길 굽이를 기존 자갈길 자리에서만 선택한다.
		{ AssetIds["Terrain/ground-pathcorner"] and "ground-pathcorner" or "ground-pathstraight", 23, -0.81, -0.71, 14 },
		{ "village-fence", 13, 0.75, -0.52, -17 },
		{ "cliff-blockslope-rock", 24, 0.89, -0.87, 12 },
		{ "log-stack", 8, -0.67, -0.35, 10 },
		{ "plant-bushdetailed", 7, 0.66, -0.32, 11 },
		{ "ground-pathrocks", 11, -0.86, -0.43, -10 },
	} elseif questTerrain == "swamp" then {
		-- [습지 3D 층] 원경 강수면은 등록된 실제 타일로 바꿔 층을 강조한다.
		{ AssetIds["Terrain/ground-rivertile"] and "ground-rivertile" or "ground-riverbendbank", 21, -0.84, -0.71, 24 },
		{ "forest-bush-detailed", 12, 0.77, -0.49, -12 },
		{ "cliff-cornerinnertop-rock", 26, 0.89, -0.83, 15 },
		{ "plant-bushdetailed", 8, -0.70, -0.37, 8 },
		{ "river-stone-bank", 12, 0.64, -0.34, 18 },
		{ "cliff-blockslope-rock", 23, -0.91, -0.45, -19 },
	} elseif questTerrain == "jungle" then {
		-- [밀림 전장] 원경 큰 절벽에 대나무·하층 수풀을 분리해 깊은 녹지 질감을 만든다.
		{ "cliff-blockslope-rock", 27, -0.82, -0.66, 18 },
		{ "east-bamboo-grove", 17, 0.77, -0.50, -12 },
		{ "forest-bush-detailed", 12, -0.65, -0.35, 13 },
		{ "cliff-blockdiagonal-rock", 30, 0.90, -0.83, 16 },
		{ "ground-riverbendbank", 12, 0.73, -0.37, -20 },
		{ "plant-bushdetailed", 9, -0.53, -0.29, 6 },
	} elseif questTerrain == "forest" then {
		{ "cliff-blockslope-rock", 25, -0.81, -0.53, 22 },
		{ "cliff-cornerinnertop-rock", 24, 0.78, -0.73, -30 },
		{ AssetIds["Terrain/plant-bushtriangle"] and "plant-bushtriangle" or "plant-bushdetailed", 7, 0.60, -0.33, 6 },
		{ "plant-bushlargetriangle", 8, -0.52, -0.29, 6 },
		{ "grass-large", 6, 0.51, -0.35, 0 },
		{ "ground-pathbend", 7, -0.49, -0.56, 15 },
		{ "cliff-blockslope-rock", 23, 0.90, -0.58, -21 },
		{ AssetIds["Terrain/grass-leafs"] and "grass-leafs" or "grass-leafslarge", 6, -0.63, -0.22, 7 }
	} else {
		{ "cliff-large-rock", 27, -0.86, -0.74, 8 },
		{ "ground-pathrocks", 7, 0.51, -0.42, 22 },
		{ "cliff-blockslope-rock", 26, 0.89, -0.82, -12 },
		{ "grass-large", 5, -0.57, -0.28, 0 },
		{ "rock-tallc", 10, 0.76, -0.63, 0 },
		{ "plant-bushdetailed", 6, -0.62, -0.29, 0 }
	}
	folder:SetAttribute("FieldDepthFeatureCount", 0)
	for _, spec in depthLandforms do
		local name = spec[1]
		if AssetIds["Terrain/" .. name] then
			local entry = { "Terrain", name, spec[2], nil, nil, false, spec[5] }
			entry.position = ORIGIN + Vector3.new(spec[3] * half * mirror, 0, spec[4] * half)
			entry.depth = true
			entry.band = "far"
			stageFeature(entry)
		end
	end
	end
	-- [가까운 시야층] 원신식 원근 구도의 원리만 참고한다. 전경의 낮은 수풀, 중경의
	-- 강가 돌무더기, 원경의 절벽선을 서로 다른 거리에 배치한다. 중앙 전투 길을 가리지 않는다.
	do
		local nearBands = if folder:GetAttribute("FieldSiteComposition") == "shallow-reef-shore"
			or folder:GetAttribute("FieldSiteComposition") == "tidal-flat"
			or folder:GetAttribute("FieldSiteComposition") == "low-sandy-shore" then {
			{ "coast-grass-patch", 4, -0.66, 0.18, 12 },
			{ "kenney_rock_smallFlatA", 5, 0.72, -0.17, 8 },
			{ "platform-beach", 19, -0.84, -0.81, -18 },
		} elseif folder:GetAttribute("FieldSiteComposition") == "lowland-waterway"
			or folder:GetAttribute("FieldSiteComposition") == "delta-waterway"
			or folder:GetAttribute("FieldSiteComposition") == "salt-work-waterway" then {
			{ "ground-riverbendbank", 12, -0.66, 0.18, 12 },
			{ "grass-leafslarge", 4, 0.72, -0.17, 8 },
			{ "river-stone-bank", 9, -0.74, -0.40, -16 },
		} elseif questTerrain == "archive" then {
			{ "forest-flower-purple", 5, -0.48, 0.28, 0 },
			{ "ground-pathcorner", 13, 0.54, 0.03, 90 },
			{ "plant-bushdetailed", 8, -0.58, 0.05, 10 },
			{ "platform-stone", 19, 0.72, -0.55, 0 },
		} elseif tropical and (questTerrain == "coast" or questTerrain == "forest" or questTerrain == "jungle" or questTerrain == "plains" or questTerrain == "lake") then {
			-- [바이옴 전경] 해안/밀림의 실물 모래 해변/대나무 군집으로 시야층을 구분한다.
			if questTerrain == "jungle" then { "east-bamboo-grove", 19, -0.73, 0.10, 11 }
				else { "tree-palmbend", 24, -0.66, 0.18, 12 },
			if questTerrain == "coast" then { "platform-beach", 19, -0.84, -0.81, -18 }
				elseif questTerrain == "jungle" then { "forest-bush-detailed", 11, 0.72, -0.17, 8 }
				else { "grass-leafslarge", 6, -0.54, 0.16, 7 },
			{ "plant-flattall", 7, 0.52, 0.07, 0 },
			{ "cliff-cornerlarge-stone", 31, 0.85, -0.47, 35 },
			{ "ground-riverbendbank", 13, -0.68, -0.54, 19 },
		} elseif questTerrain == "volcanic" then {
			-- [화산 전경] 용암 재질을 가짜로 그리지 않고 실제 쇄설암·절벽을 서로 다른 깊이로 배치한다.
			{ "debris", 15, -0.82, 0.13, 15 }, { "cliff-large-rock", 32, 0.85, -0.49, -19 },
			{ "rock-talld", 17, -0.70, -0.27, 11 }, { "cliff-blockdiagonal-rock", 29, 0.90, -0.82, 19 },
		} elseif questTerrain == "fort" then {
			-- [성채 전경] 멀리 선 기존 성벽 앞에 지면 돌계단과 목재 버팀목 층을 배치한다.
			{ "cliff-blockslope-rock", 25, -0.85, 0.12, 18 }, { "wood-support", 17, 0.81, -0.28, -12 },
			{ "rock-largea", 14, -0.68, -0.36, 11 }, { "ground-pathrocks", 9, 0.64, -0.39, -14 },
		} elseif questTerrain == "mine" then {
			-- [광산 전경] 기존 2개 모바일 슬롯에서 동굴 벽과 버팀목의 깊이를 먼저 보여 준다.
			{ "cliff-cave-rock", 34, -0.86, 0.12, 14 }, { "wood-support", 17, 0.82, -0.27, -19 },
			{ "rock-talld", 13, 0.76, -0.13, 7 }, { "cliff-blockdiagonal-rock", 28, -0.90, -0.58, 12 },
		} elseif questTerrain == "ruins" then {
			-- [유적 전경] 기존 조사·전투 위치 바깥에 실물 건축 파편을 한 층 더 배치한다.
			{ if region == "italy" or region == "med" then "ruins-pillar-decorated" else "rock-tallc", 21, -0.86, 0.12, 16 }, { "rock-largea", 12, 0.78, -0.17, 7 },
			{ if region == "italy" or region == "med" then "ruins-wall-arched" else "cliff-large-stone", 23, -0.87, -0.61, 12 }, { "ground-pathrocks", 8, 0.65, -0.38, 16 },
		} elseif questTerrain == "desert" then {
			-- [사막 전경] 승인 바위와 모래 언덕의 거리 차이를 노출한다.
			{ "rock-largea", 15, -0.81, 0.13, -13 }, { "mystic-sand-dune", 27, 0.85, -0.46, 18 },
			{ "rock-talld", 12, 0.74, -0.12, 20 }, { "ground-pathrocks", 8, -0.69, -0.39, 14 },
		} elseif questTerrain == "farm" then {
			-- [농경지 전경] 밀밭과 지면 길을 서로 다른 깊이에 둔다.
			{ "village-fence", 13, -0.77, 0.12, 11 }, { "ground-pathstraight", 16, 0.78, -0.23, -12 },
			{ "log-stack", 7, -0.67, -0.36, 14 }, { "plant-bushdetailed", 7, 0.68, -0.41, 12 },
		} elseif questTerrain == "swamp" then {
			-- [습지 전경] 실제 하천 둑과 식생을 구분해 평면감을 줄인다.
			{ "ground-riverbendbank", 15, -0.84, 0.11, 19 }, { "forest-bush-detailed", 12, 0.72, -0.17, 11 },
			{ "river-stone-bank", 13, -0.74, -0.40, -16 }, { "plant-bushdetailed", 8, 0.69, -0.35, 15 },
		} elseif questTerrain == "forest" then {
			-- [숲 전경] 모바일 두 슬롯에서 나무 수관과 낮은 관목이 겹치게 실루엣을 분리한다.
			{ "plant-bushlargetriangle", 9, -0.55, 0.22, 0 },
			{ "tree-tall", 20, 0.71, 0.06, -10 }, { "plant-bushdetailed", 8, -0.69, 0.11, 9 },
			{ "ground-riverside", 19, -0.83, -0.37, 34 }, { "ground-riverbendbank", 12, 0.65, -0.56, -24 },
		} elseif questTerrain == "glacier" then {
			-- [빙하 전경] 같은 모델 수에서 회색 암석 대신 실제 밝은 석벽·침엽수층을 노출한다.
			{ "cliff-large-stone", 39, -0.86, 0.14, 13 }, { "north-pine-fall", 20, 0.79, -0.17, -9 },
			{ "cliff-cornerlarge-stone", 34, -0.89, -0.52, 16 }, { "rock-largec", 17, 0.77, -0.38, -12 },
		} elseif questTerrain == "highland" then {
			-- [협곡 전경] 폭포·계곡 지명에선 원본 폭포 암벽을 두 번째 모바일 전경으로 노출한다.
			{ "cliff-cornerinnertop-rock", 34, -0.85, 0.18, 12 },
			if string.find(questName, "폭포", 1, true) or string.find(questName, "계곡", 1, true)
				then { "cliff-waterfall-stone", 31, 0.89, -0.53, -12 }
				else { "cliff-blockdiagonal-rock", 29, 0.90, -0.80, -12 },
			{ "rock-talld", 17, 0.77, 0.09, 0 }, { "cliff-cornerlarge-rock", 39, 0.89, -0.49, -20 },
			{ "cliff-waterfall-stone", 31, -0.84, -0.70, 0 },
		} elseif questTerrain == "coast" then {
			-- [해안 전경] 모바일 두 슬롯 안에 승인된 실제 해변 모델을 넣고 진입로를 비운다.
			{ "cliff-diagonal-rock", 36, -0.87, 0.08, 12 }, { "platform-beach", 19, -0.84, -0.81, -18 },
			{ "rock-talld", 14, 0.78, -0.15, -18 }, { "ground-riverside", 12, -0.64, -0.46, 30 },
			{ "ground-riverbendbank", 13, 0.74, -0.61, 0 },
		} elseif questTerrain == "lake" then {
			-- [호숫가 전경] 모래 해변과 구별하고 바위가 있는 실제 강둑을 두 번째 슬롯에서 노출한다.
			{ "cliff-diagonal-rock", 36, -0.87, 0.08, 12 }, { "river-stone-bank", 13, 0.74, -0.61, 0 },
			{ "rock-talld", 14, 0.78, -0.15, -18 }, { "ground-riverside", 12, -0.64, -0.46, 30 },
		} else {
			{ "plant-bushlarge", 7, -0.57, 0.22, 0 }, { "rock-talli", 12, 0.78, -0.23, 0 },
			{ "ground-riverrocks", 9, 0.65, -0.53, 24 },
		}
		local placedBandCount = 0
		for index, spec in nearBands do
			if AssetIds["Terrain/" .. spec[1]] then
				local entry = { "Terrain", spec[1], spec[2], nil, nil, false, spec[5] }
				-- [실물 근경] 모바일에도 표시되는 첫 두 승인 실물을 실제 전투 시야 안으로 당긴다.
				-- 크기·종류·기존 2개 제한은 바꾸지 않고 중앙 이동로는 비운다.
				local depthX = spec[3] * half * mirror
				local depthZ = spec[4] * half
				if index <= 2 then
					-- 해안 바위/산악 대형 모델도 중앙 길 안으로 들어오지 않게 한다.
					depthX = (if depthX < 0 then -1 else 1) * half * (if index == 1 then 0.42 else 0.60)
					depthZ = half * (if index == 1 then 0.52 else -0.05)
				end
				entry.position = ORIGIN + Vector3.new(depthX, 0, depthZ)
				entry.depth = true
				entry.band = if index == 1 then "near" elseif index == 2 then "mid" else "far"
				stageFeature(entry)
				placedBandCount += 1
			end
		end
		folder:SetAttribute("FieldNearDepthBandCount", placedBandCount)
	end
	-- [문화권 전용 윤곽] 승인된 문화권 대표 건축물 전체를 거리별로 배치한다.
	-- 중앙 전투·시작 동선과 간격을 두고 지역 상징물을 배치한다.
	local regionalSilhouettes = {
		iberia = { {"Terrain","ruins-wall-arched",23,-0.73,-0.59}, {"Terrain","column",15,-0.62,-0.42}, {"Terrain","tree-oak",17,0.71,-0.59} },
		italy = { {"Town","bell-tower",27,0.84,-0.87}, {"Terrain","greek-ruins-a",28,0.72,-0.75}, {"Terrain","greek-column",20,-0.62,-0.61}, {"Terrain","greek-statue",14,0.63,-0.39}, {"Town","house",19,-0.88,-0.53} },
		france = { {"Town","house",20,0.85,-0.82}, {"Town","windmill",30,0.73,-0.79}, {"Terrain","bridge-stone",19,-0.63,-0.47}, {"Terrain","forest-flower-purple",6,-0.65,-0.20}, {"Town","village-well",8,-0.79,-0.34} },
		britain = { {"Town","quaternius_watchtower",27,0.84,-0.83}, {"Castle","wall-narrow-gate",27,-0.72,-0.76}, {"Terrain","haunted-pine-crooked",20,-0.67,-0.36}, {"Terrain","haunted-iron-gate",16,0.71,-0.60}, {"Town","kenney_wood_arch_01",15,-0.85,-0.50} },
		hanse = { {"Town","watermill",26,0.85,-0.83}, {"Town","windmill",31,0.77,-0.76}, {"Naval","structure-platform-dock",24,-0.69,-0.72}, {"Terrain","north-pine-fall",19,-0.73,-0.34}, {"Town","house",19,-0.86,-0.52} },
		nordic = { {"Terrain","cliff-rock",39,-0.78,-0.77}, {"Terrain","gate-rock",22,0.73,-0.64}, {"Terrain","north-pine-fall",20,-0.66,-0.24}, {"Terrain","campfire-logs",6,0.57,-0.30} },
		brick = { {"Town","quaternius_wall_bricks",24,0.87,-0.83}, {"Town","windmill",31,0.73,-0.81}, {"Town","house",19,-0.71,-0.32}, {"Terrain","ground-riverbend",25,-0.64,-0.61}, {"Town","village-well",8,-0.82,-0.47} },
		stone = { {"Town","quaternius_small_tower",25,0.87,-0.82}, {"Castle","tower-hexagon-base",28,-0.73,-0.73}, {"Terrain","bridge-stone",18,0.63,-0.48}, {"Terrain","north-pine-fall",20,-0.65,-0.28}, {"Town","house",18,-0.84,-0.54} },
		med = { {"Town","kenney_grey_arch_01",20,-0.87,-0.83}, {"Terrain","greek-amphitheater",34,-0.76,-0.79}, {"Terrain","greek-column",18,0.71,-0.58}, {"Terrain","coast-grass-patch",8,0.62,-0.28}, {"Town","house",20,0.84,-0.53} },
		ottoman = { {"Town","temple-stone",36,0.74,-0.78}, {"Terrain","tent-detailedopen",15,-0.66,-0.56}, {"Terrain","egypt-column",17,0.70,-0.32} },
		desert = { {"Terrain","mystic-sand-dune",34,-0.79,-0.81}, {"Terrain","egypt-temple-arch-a",28,0.73,-0.73}, {"Terrain","egypt-obelisk",25,0.69,-0.40} },
		swahili = { {"Terrain","tent-detailedopen",17,0.68,-0.68}, {"Terrain","canoe",13,-0.72,-0.70}, {"Terrain","tropical-palm-tall",21,-0.66,-0.30} },
		malabar = { {"Terrain","tropical-palm-tall",24,-0.75,-0.77}, {"Terrain","east-bamboo-grove",16,0.74,-0.61}, {"Terrain","ground-riverbend",22,-0.64,-0.35} },
		korea = { {"Town","temple-stone",33,0.72,-0.77}, {"Terrain","bridge-stone",20,-0.65,-0.51}, {"Terrain","east-bamboo-grove",18,0.68,-0.29} },
		japan = { {"Town","temple-tower",36,-0.74,-0.80}, {"Terrain","bridge-wood",20,0.66,-0.62}, {"Terrain","east-bamboo-grove",18,-0.69,-0.37}, {"Terrain","forest-flower-purple",7,0.63,-0.25} },
		china = { {"Town","temple-tower",40,0.75,-0.82}, {"Terrain","bridge-stone",21,-0.64,-0.56}, {"Terrain","cliff-rock",32,-0.80,-0.83}, {"Terrain","east-bamboo-grove",15,0.66,-0.30} },
		seasia = { {"Terrain","cliff-waterfall-rock",38,-0.79,-0.81}, {"Terrain","tropical-palm-tall",24,0.76,-0.68}, {"Terrain","east-bamboo-grove",18,-0.66,-0.29} },
		tropic = { {"Terrain","tropical-palm-tall",24,-0.73,-0.75}, {"Naval","boat-fishing-small",15,0.70,-0.73}, {"Terrain","canoe",12,0.66,-0.39} },
		colonial = { {"Town","house",22,0.85,-0.83}, {"Town","windmill",34,0.75,-0.82}, {"Terrain","crops-cornstagec",15,-0.70,-0.59}, {"Town","house",21,-0.66,-0.32}, {"Town","village-well",7,-0.83,-0.45} },
		creole = { {"Terrain","crop-melon",12,-0.71,-0.69}, {"Terrain","tropical-palm-short",17,0.71,-0.59}, {"Terrain","canoe",13,0.63,-0.31} },
		pacific = { {"Naval","structure-platform-dock",29,-0.71,-0.76}, {"Terrain","canoe",14,0.72,-0.68}, {"Terrain","tropical-palm-tall",24,0.69,-0.29} },
		wafrica = { {"Terrain","tent-detailedopen",18,-0.72,-0.68}, {"Terrain","tropical-palm-tall",23,0.71,-0.75}, {"Terrain","canoe",14,0.66,-0.39} },
	}
	local regionalFeatures = regionalSilhouettes[region]
	if folder:GetAttribute("FieldPacificSurvey") then
		-- 문화권의 서양 성·풍차·이국 신전 대신 항구별 자연물 정본만 사용한다.
		regionalFeatures = PORT_NATURE_MODELS[portNature or ""]
	end
	if regionalFeatures then
		for index, feature in regionalFeatures do
			-- [대륙 → 항구 → 탐험지] 승인된 전체 지역 모델 사용. 세 번째 모델은 항구/유적 지형으로 선택.
			local selected = feature
			local variants = PORT_NATURE_MODELS[portNature or ""]
			if index == 3 and variants then
				local candidate = variants[portVisualSeed % #variants + 1]
				if AssetIds[candidate[1] .. "/" .. candidate[2]] then selected = candidate end
			end
			local entry = { selected[1], selected[2], selected[3], nil, nil, false }
			-- [근·중·원경] 항구 고유 자연물은 진입 근경, 대표 건축물은 중경·원경으로 계단식 배치.
			local stagger = (portVisualSeed % 9 - 4) * 0.008
			local bandX = if index == 3 then 0.40 elseif index == 2 then 0.51
				else 0.59 + math.max(0, index - 3) * 0.07
			local bandZ = if index == 3 then 0.43 elseif index == 2 then 0.10
				else -0.20 - math.max(0, index - 3) * 0.17
			entry.position = ORIGIN + Vector3.new(
				(if selected[4] > 0 then 1 else -1) * half * (bandX + stagger) * mirror,
				0, half * (bandZ + stagger * 0.6))
			entry.band = if index == 3 then "near" elseif index <= 2 then "mid" else "far"
			entry.landmark = true
			stageFeature(entry)
		end
	end
	-- [항구별 실제 원경] 마을의 181개 항구 경관 정본을 그대로 사용한다.
	-- 전용 역사 원본이 등록되지 않았으면 원본으로 사칭하지 않는다. 기존 승인 경관만 표시.
	if questTerrain ~= "mine" then
		local signature = opts.portScenery
		-- 모듈 직접 호출(Studio 등)도 동일한 마을 표만 참조한다. 게임 진입 경로의 전달값 우선.
		if not signature and opts.portId then
			local ok, portScene = pcall(function() return require(script.Parent:WaitForChild("PortScene")) end)
			if ok and portScene.Signatures then signature = portScene.Signatures[opts.portId] end
		end
		local original = (opts.portId or "") .. "_landmark_full"
		local horizonZ = -math.max(400, half + 150) -- 실제 400스터드 밖의 항구 실루엣
		-- [탐험 지시서 원본] 기존 원경 배치/지연 로드 경로로 정확한 지점 모델을 연결한다.
		-- 닫힌 광산·전투 통로·조사 대상·복셀 지형은 바꾸지 않는다. 실제 배치는 별도 증거로 기록한다.
		do
			local siteId = opts.siteId
			if type(siteId) == "string" and string.match(siteId, "^[a-z0-9_]+$") then
				local asset = "field_" .. siteId
				if AssetIds["Terrain/" .. asset] then
					local entry = { "Terrain", asset, if visualMobile then 60 else 85, nil, nil, false }
					entry.position = ORIGIN + Vector3.new(half * 0.65, 0, horizonZ)
					entry.band, entry.horizon, entry.briefBackdrop = "far", true, true
					stageFeature(entry)
				end
			end
		end
		local groups, groupCount = {}, 0
		folder:SetAttribute("FieldHorizonPlaced", 0)
		folder:SetAttribute("FieldPortLandmarkOriginalMissing", not AssetIds["Town/" .. original])
		if AssetIds["Town/" .. original] then
			local entry = { "Town", original, 40, nil, nil, false }
			entry.position = ORIGIN + Vector3.new(0, 0, horizonZ)
			entry.band, entry.horizon = "far", true
			stageFeature(entry)
			folder:SetAttribute("FieldHorizonSource", "registered-port-original")
		elseif type(signature) == "table" and not folder:GetAttribute("FieldPacificSurvey") then
			folder:SetAttribute("FieldHorizonSource", "existing-port-signature")
			for _, e in signature do
				-- 선박과 적재물은 언덕 위에 올리지 않는다. 원본의 탑/지붕 층은 같은 그룹으로 유지한다.
				if not e.waterfront and e.kind ~= "Cargo" and not string.find(e.asset, "boat-", 1, true)
					and not string.find(e.asset, "dock", 1, true) and AssetIds[e.kind .. "/" .. e.asset] then
					local key = tostring(e.dx) .. ":" .. tostring(e.dz)
					if groups[key] == nil and groupCount < (if visualMobile then 3 else 6) then
						local x = e.dx * 1.15
						local z = horizonZ + e.dz * 0.9
						local groundHit = workspace:Raycast(ORIGIN + Vector3.new(x, 100, z), Vector3.new(0, -140, 0), groundRay)
						if groundHit then
							groups[key] = Vector3.new(ORIGIN.X + x, groundHit.Position.Y, ORIGIN.Z + z)
							groupCount += 1
						end
					end
					if groups[key] then
						local entry = { e.kind, e.asset, e.size * 1.15, nil, nil, false }
						entry.position = groups[key] + Vector3.new(0, e.y * 1.15, 0)
						entry.band, entry.horizon, entry.tint = "far", true, e.tint
						stageFeature(entry)
					end
				end
			end
			folder:SetAttribute("FieldHorizonPlannedGroups", groupCount)
			if groupCount == 0 then folder:SetAttribute("FieldHorizonSource", "port-signature-no-land-model") end
		else
			folder:SetAttribute("FieldHorizonSource", "port-signature-unavailable")
		end
		-- [실제 원경 자연층] 좁은 전장에서도 400스터드 밖의 등록된 간결 실물을 산선에 놓는다.
		-- 항구 실루엣의 성공 수치와 분리하고, 충돌·조사·전투 대상에는 포함하지 않는다.
		do
			local asset = if questTerrain == "coast" or questTerrain == "desert" or questTerrain == "volcanic"
				or questTerrain == "glacier" or arid then "kenney_rock_smallFlatA"
				elseif winterScene or northern then "tree-pinedefaulta"
				elseif tropical then "kenney_tree_palmShort" else "kenney_tree_defaultDark"
			if AssetIds["Terrain/" .. asset] then
				for _, side in { -1, 1 } do
					for index = 1, (if visualMobile then 2 else 3) do
						local x = side * (28 + index * 9)
						local z = horizonZ + 12 + index * 4
						local hit = workspace:Raycast(ORIGIN + Vector3.new(x, 100, z), Vector3.new(0, -140, 0), groundRay)
						if hit then
							local entry = { "Terrain", asset, 10 + index * 2, nil, nil, false }
							entry.position = hit.Position
							entry.band, entry.horizon, entry.horizonNature = "far", true, true
							entry.lowPolyVariant = true
							entry[7] = side * index * 29
							stageFeature(entry)
						end
					end
				end
			end
		end
	end
	folder:SetAttribute("FieldTerrainFeatureCount", built)

	-- 문화권 소품(기둥·천막·카누 등): 등록된 모델만 놓고, 없으면 건너뛴다
	for groupIndex, pr in (biome.props or {}) do
		-- [문화권 군집] 나무·기둥·천막·카누를 길 한가운데 흩뿌리지 않고 각 문화권의 외곽 마을/해안대로 묶는다.
		-- [수량 고정 제한 해제] 문화권 소품은 바이옴 수량과 맵 면적에 비례해 확장한다.
		for index = 1, math.max(1, math.floor(pr[3] * math.sqrt(AREA))) do
			local cluster = math.floor((index - 1) / 5)
			local slot = (index - 1) % 5
			local side = if (groupIndex + cluster) % 2 == 0 then -1 else 1
			local jitterX = rng:NextNumber(0.54, 0.85)
			local jitterZ = rng:NextNumber(-half * 0.78, half * 0.40)
			local spacing = math.max(5, pr[4] * 0.55)
			local x = side * math.clamp(half * (0.58 + (cluster % 2) * 0.13) + (slot % 2) * spacing + jitterX, half * 0.54, half * 0.9)
			local z = math.clamp(half * (0.24 - ((cluster + groupIndex) % 4) * 0.30)
				+ math.floor(slot / 2) * spacing + jitterZ * 0.035, -half * 0.86, half * 0.50)
			local entry = { pr[1], pr[2], pr[4], nil, nil, pr[1] == "Terrain" and pr[2] == "cliff-rock" }
			entry.position = ORIGIN + Vector3.new(x, 0, z)
			entry.band = "mid"
			-- 문화권 소품의 무조건 반복을 제거한다. 난수 소비는 기존대로 유지.
			local asset = pr[2]
			local nautical = asset == "canoe" or asset == "river-stone-bank"
			local monument = asset:find("column", 1, true) or asset:find("ruins", 1, true) or asset:find("obelisk", 1, true)
			local haunted = asset:find("haunted-", 1, true) ~= nil
			if not asset:find("crop", 1, true)
				and (not folder:GetAttribute("FieldPacificSurvey") or (pr[1] == "Terrain" and (asset == "coast-grass-patch" or asset == "river-stone-bank" or (tropical and asset:find("palm", 1, true)))))
				and (not nautical or questTerrain == "coast" or questTerrain == "lake" or questTerrain == "swamp")
				and (not monument or questTerrain == "ruins")
				and (not haunted or questTerrain == "ruins")
				and (asset ~= "windmill" or questTerrain == "farm" or questTerrain == "plains")
				and (not asset:find("cactus", 1, true) or questTerrain == "desert") then
				stageFeature(entry)
			end
		end
	end


	-- [지역 원근·계절 디테일] 큰 랜드마크 앞에 잎·풀·자갈·화단 군집을 층으로 배치해 평면감을 줄인다.
	-- 지역마다 실제 승인된 기존 Terrain 모델만 사용한다. 새 물체 합성이나 지형 장벽은 만들지 않는다.
	local detailAssets = if questTerrain == "jungle" then { "forest-bush-detailed", "east-bamboo-grove", "tropical-palm-short" }
		elseif questTerrain == "archive" then { "forest-flower-purple", "forest-flower-yellow", "plant-bushdetailed", "ground-pathrocks" }
		elseif questTerrain == "swamp" then { "forest-bush-detailed", "river-stone-bank", "ground-riverbend" }
		elseif questTerrain == "glacier" then { "north-pine-fall", "Rock_2", "river-stone-bank" }
		elseif questTerrain == "volcanic" then { "debris", "Rock_2", "cliff-rock" }
		elseif questTerrain == "coast" then { "coast-grass-patch", "Grass_Small", "river-stone-bank" }
		elseif questTerrain == "mine" then { "debris", "Rock_2", "log-stack" }
		elseif questTerrain == "ruins" or questTerrain == "fort" then { "forest-bush-detailed", "river-stone-bank", "forest-flower-purple" }
		elseif questTerrain == "highland" then { "river-stone-bank", "Rock_2", "north-pine-fall" }
		elseif questTerrain == "farm" then { "ground-pathrocks", "Grass_Small", "plant-bushsmall" }
		elseif questTerrain == "lake" then { "river-stone-bank", "forest-bush-detailed", "forest-flower-purple" }
		elseif questTerrain == "desert" then { "arid-cactus-short", "coast-grass-patch", "Grass_Small" }
		elseif questTerrain == "forest" then { "forest-bush-detailed", "forest-flower-purple", "Grass_Small" }
		else { "Grass_Small", "forest-flower-yellow", "river-stone-bank" }
	if tropical and (questTerrain == "forest" or questTerrain == "jungle" or questTerrain == "plains") then detailAssets = { "forest-bush-detailed", "Grass_Small", "east-bamboo-grove" }
	elseif winterScene then detailAssets = { "north-pine-fall", "river-stone-bank", "Rock_2" }
	elseif season == "가을" and (questTerrain == "forest" or questTerrain == "plains") then
		detailAssets = { "forest-bush-detailed", "forest-flower-yellow", "coast-grass-patch" }
	end
	-- [하층 식생] 기존 모바일/PC 상세 소품 총량은 늘리지 않고 CC0 풀·관목·돌길만 교체 후보로 섞는다.
	if not winterScene and not arid then
		if AssetIds["Terrain/plant-bushdetailed"] then table.insert(detailAssets, "plant-bushdetailed") end
		if AssetIds["Terrain/grass-large"] then table.insert(detailAssets, "grass-large") end
	end
	if questTerrain ~= "glacier" and questTerrain ~= "swamp" and AssetIds["Terrain/ground-pathrocks"] then
		table.insert(detailAssets, "ground-pathrocks")
	end
	if not arid and not winterScene and AssetIds["Terrain/plant-bushlarge"] then
		table.insert(detailAssets, "plant-bushlarge")
	end
	if (questTerrain == "lake" or questTerrain == "coast" or questTerrain == "jungle" or questTerrain == "swamp")
		and AssetIds["Terrain/ground-riverrocks"] then
		table.insert(detailAssets, "ground-riverrocks")
	end
	-- [근접 하천·바람풀] 등록된 자연물만 상세식생 선택군에 추가한다.
	if not winterScene and not arid then
		if AssetIds["Terrain/plant-bushsmall"] then table.insert(detailAssets, "plant-bushsmall") end
		if AssetIds["Terrain/grass-leafslarge"] then table.insert(detailAssets, "grass-leafslarge") end
		if AssetIds["Terrain/plant-flattall"] then table.insert(detailAssets, "plant-flattall") end
	end
	if questTerrain == "lake" or questTerrain == "coast" or questTerrain == "swamp" then
		if AssetIds["Terrain/ground-riverbendbank"] then table.insert(detailAssets, "ground-riverbendbank") end
		if AssetIds["Terrain/ground-riverside"] then table.insert(detailAssets, "ground-riverside") end
	end
	-- [대륙·항구·퀘스트 3중 식생 필터] 지역 실물과 지형 특성을 반영한다.
	-- 신규 모델이 자산번호를 아직 받지 못했으면 건너뛰며 기존 원본은 그대로 남는다.
	do
		local natureDetail = if questTerrain == "forest" then {
			"kenney_mushroom_red", "kenney_mushroom_redGroup", "kenney_mushroom_tanGroup",
			"kenney_stump_roundDetailed", "kenney_plant_bushTriangle", "kenney_grass_leafs" }
			elseif questTerrain == "jungle" then {
				"kenney_mushroom_redGroup", "kenney_stump_old", "kenney_grass_leafs", "kenney_plant_bushTriangle" }
			elseif questTerrain == "swamp" then {
				"kenney_stump_old", "kenney_mushroom_tanGroup", "kenney_ground_riverCorner", "kenney_stone_smallFlatA" }
			elseif questTerrain == "coast" or questTerrain == "lake" then {
				"kenney_rock_smallFlatA", "kenney_stone_smallFlatA", "kenney_ground_riverCorner" }
			elseif questTerrain == "highland" or questTerrain == "glacier" then {
				"kenney_stone_largeB", "kenney_rock_smallFlatA", "kenney_path_stoneCircle" }
			elseif questTerrain == "mine" or questTerrain == "volcanic" then {
				"kenney_rock_largeD", "kenney_rock_smallFlatA", "kenney_stone_smallFlatA" }
			elseif questTerrain == "ruins" or questTerrain == "fort" then {
				"kenney_stone_largeB", "kenney_path_stoneCircle", "kenney_stone_smallFlatA" }
			elseif questTerrain == "farm" then {
				"kenney_ground_pathCorner", "kenney_log_stackLarge", "kenney_stump_old" }
			elseif questTerrain == "desert" then {
				"kenney_rock_largeD", "kenney_rock_smallFlatA" }
			else { "kenney_rock_smallFlatA", "kenney_grass_leafs" }
		if portNature == "mangrove" or portNature == "lagoon" or portNature == "delta" then
			table.insert(natureDetail, "kenney_ground_riverCorner")
		elseif portNature == "fjord" or portNature == "cliff_coast" then
			table.insert(natureDetail, "kenney_stone_largeB")
		elseif portNature == "forest" or portNature == "woodland" then
			table.insert(natureDetail, "kenney_stump_roundDetailed")
		end
		-- 기존 꽃·풀·자갈을 제거하지 않고 등록된 모델을 앞쪽 선택군에 끼워 모바일에도 보이게 한다.
		for index = #natureDetail, 1, -1 do
			local name = natureDetail[index]
			if AssetIds["Terrain/" .. name] and not table.find(detailAssets, name) then
				table.insert(detailAssets, math.min(#detailAssets + 1, 3), name)
			end
		end
	end
	-- [자연층 자유 배치] 기존 승인 식생은 맵 넓이에 따라 배치하고 모바일/PC 고정 10/24개 제한을 없앤다.
	local detailCount = math.max(24, math.floor(24 * math.sqrt(AREA)))
	for index = 1, detailCount do
		-- [근·중경 하층] 6개 단위 군락으로 풀·돌·관목의 위치를 분리한다.
		local lateralJitter = rng:NextNumber(0, 0.13)
		local depthJitter = rng:NextNumber(-7, 7)
		local pos = sceneryPosition(index, detailCount, 6, 4.8, 2,
			(lateralJitter - 0.065) * 14, depthJitter * 0.4)
		local distance = (Vector3.new(pos.X, spawn.Y, pos.Z) - spawn).Magnitude
		local asset = detailAssets[((index - 1) % #detailAssets) + 1]
		local entry = { "Terrain", asset, if asset == "north-pine-fall" then 8.5
			elseif asset == "east-bamboo-grove" then 7 elseif asset == "log-stack" then 4.5
			elseif asset == "ground-pathrocks" or asset == "ground-riverrocks" then 8
			elseif asset == "plant-flattall" then 5.7
			elseif asset == "ground-riverbendbank" or asset == "ground-riverside" then 9
			elseif asset == "grass-large" or asset == "grass-leafslarge" then 4.2
			elseif asset == "plant-bushlarge" then 6.8 elseif asset == "plant-bushsmall" then 4.7
			elseif asset == "kenney_mushroom_red" then 1.4
			elseif asset == "kenney_mushroom_redGroup" or asset == "kenney_mushroom_tanGroup" then 2.6
			elseif asset == "kenney_stump_old" or asset == "kenney_stump_roundDetailed" then 3.6
			elseif asset == "kenney_stone_smallFlatA" or asset == "kenney_rock_smallFlatA" then 2.3
			elseif asset == "kenney_stone_largeB" or asset == "kenney_rock_largeD" then 6.5
			elseif asset == "kenney_path_stoneCircle" or asset == "kenney_ground_pathCorner" then 7.5
			elseif asset == "kenney_ground_riverCorner" then 8
			elseif asset == "kenney_log_stackLarge" then 4.8
			elseif asset == "kenney_plant_bushTriangle" or asset == "kenney_grass_leafs" then 4.4
			else rng:NextNumber(2.2, 5.2), nil, nil, false }
		-- 지형별 정확한 식생 후보만 등록 확인 후 기존 하층 슬롯에 연결한다.
		do
			local candidates = if winterScene then { {"veg_cold_scrub", 3}, {"veg_rock_moss_mat", 3} }
				elseif questTerrain == "highland" then { {"veg_alpine_cushion", 2}, {"veg_alpine_grass", 3}, {"veg_rock_crevice_plants", 3} }
				elseif questTerrain == "desert" or arid then { {"veg_desert_cactus_patch", 4}, {"veg_dry_scrub", 3}, {"veg_flowering_cactus", 3} }
				elseif questTerrain == "swamp" or questTerrain == "lake" then { {"veg_wetland_grass", 4}, {"veg_water_lily", 2} }
				elseif questTerrain == "coast" then { {"veg_coastal_grass", 4}, {"veg_rock_crevice_plants", 2} }
				elseif questTerrain == "archive" then { {"veg_garden_hedge", 5}, {"veg_wildflower_purple", 2}, {"veg_wildflower_yellow", 2} }
				elseif questTerrain == "ruins" or questTerrain == "fort" then { {"veg_wall_hanging_moss", 3}, {"veg_rock_moss_mat", 3} }
				elseif tropical then { {"veg_tropical_understory", 4}, {"veg_fern", 3} }
				elseif questTerrain == "forest" then { {"veg_woodland_understory", 4}, {"veg_fern", 3}, {"veg_mossy_stump", 4}, {"veg_berry_bush_1", 3}, {"veg_berry_bush_2", 3} }
				else { {"veg_meadow_tufts", 4}, {"veg_wildflower_yellow", 2}, {"veg_wildflower_purple", 2} }
			local choice = candidates[(index + portVisualSeed) % #candidates + 1]
			-- 수생식물·벽걸이 이끼는 실제 수면·벽면의 접지 검증 전까지 육지 슬롯에 올리지 않는다.
			if index % 2 == 0 and choice[1] ~= "veg_water_lily" and choice[1] ~= "veg_wall_hanging_moss"
				and AssetIds["Terrain/" .. choice[1]] then entry[2], entry[3] = choice[1], choice[2] end
		end
		entry.position = pos
		entry.band = if distance < 120 then "near" elseif distance < 400 then "mid" else "far"
		entry[7] = visualLayoutRng:NextNumber(-180, 180)
		stageFeature(entry)
	end

	-- 생산지·탐험 지역에 신규 CC0 자연 자산을 배치한다.
	-- 실제 모델이 등록되지 않았으면 배치를 생략하고 임시 원형/상자 대체물을 만들지 않는다.
	if questTerrain == "farm" then
		local orchard = string.find(questName, "과수원", 1, true) ~= nil
		local farmModels = if opts.siteId == "havana_orchard" then {} -- 카리브 과수원 전용 원본 미확보
			elseif orchard then { "veg_orchard_apple" }
			elseif string.find(questName, "밀", 1, true) then { "crops-wheatstagea", "crops-wheatstageb", "veg_farm_wheat" }
			elseif string.find(questName, "옥수수", 1, true) then { "crops-cornstagec", "veg_farm_maize" }
			elseif string.find(questName, "당근", 1, true) then { "crop-carrot", "veg_farm_carrot" }
			elseif string.find(questName, "호박", 1, true) then { "crop-pumpkin", "veg_farm_pumpkin" }
			elseif string.find(questName, "올리브", 1, true) or string.find(questName, "감자", 1, true)
				or string.find(questName, "아마", 1, true) then {}
			else {}
		local available = {}
		for _, crop in farmModels do
			if AssetIds["Terrain/" .. crop] then table.insert(available, crop) end
		end
		if #available > 0 then
			-- 밭과 과수원은 중경의 한쪽 구획으로 모으고 진입·조사 중심축은 비운다.
			for row = 0, 2 do
				for column = 0, 4 do
					local crop = available[(row + column) % #available + 1]
					local entry = { "Terrain", crop, if orchard then 10 else 3.8, nil, nil, false }
					local spacing = if orchard then 11 else 5
					entry.position = ORIGIN + Vector3.new(-mirror * (half * 0.53 + row * spacing), 0,
						-half * 0.36 + column * spacing)
					entry.band = "mid"
					stageFeature(entry)
				end
			end
		end
	end
	if string.find(opts.name or "", "숲", 1, true) or string.find(opts.name or "", "고지", 1, true) then
		local entry = { "Terrain", "campfire-logs", 3.4, nil, nil, false }
		entry.position = ORIGIN + Vector3.new(half * 0.50, 0, -half * 0.32)
		stageFeature(entry)
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
		local TOWER = cat({ { "Castle", "fortress", 40, 0, 0, true }, { "Castle", "tower-hexagon-base", 12, -30, -26, true }, { "Castle", "tower-hexagon-mid", 12, -30, -26, true, nil, 8 },
			{ "Castle", "tower-hexagon-roof", 12, -30, -26, true, nil, 16 }, { "Castle", "tower-hexagon-base", 12, 30, -26, true }, { "Castle", "tower-hexagon-mid", 12, 30, -26, true, nil, 8 },
			{ "Castle", "tower-hexagon-roof", 12, 30, -26, true, nil, 16 }, { "Castle", "bridge-draw", 14, 0, 32, true } }, rowOf("Castle", "wall", 14, -40, 40, 6, -40, true))
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
				-- 지명별 대표 건물은 맵 안쪽 목적지에 배치해 시작/전투 통로를 비운다.
				local c = ORIGIN + Vector3.new(0, 0, -half * 0.61)
				for index, e in lm[2] do
					local entry = { e[1], e[2], e[3], nil, nil, e[6] == true }
					-- [성탑 층높이] 기존 수직 오프셋·전투 통로 유지.
					entry.position = c + Vector3.new(e[4], e[8] or 0, e[5])
					if index == 1 then entry.title = nm end
					stageFeature(entry)
				end
				break
			end
		end
	end


	-- [지연 자산 동기화] Terrain/Town/Naval/Castle/Cargo 원본을 항구 뒤에 불러와도 배경이 비지 않게 복구한다.
	-- 하나의 기존 장면 배치 흐름에서만 재시도하며, 철수할 때 모든 이벤트를 해제한다.
	if #pending > 0 then
		local library = ReplicatedStorage:FindFirstChild("MareAssets")
		if library then
			local modelConnections = {}
			local function retryPending(groupName, modelName)
				if not folder.Parent then return end
				for index = #pending, 1, -1 do
					local entry = pending[index]
					if entry[1] == groupName and entry[2] == modelName and placeFeature(entry) then
						table.remove(pending, index)
					end
				end
			end
			for _, groupName in { "Terrain", "Town", "Castle", "Naval", "Cargo" } do
				local group = library:FindFirstChild(groupName)
				if group then
					table.insert(modelConnections, group.ChildAdded:Connect(function(child)
						if not child:IsA("Model") then return end
						local needed = false
						for _, entry in pending do
							if entry[1] == groupName and entry[2] == child.Name then needed = true break end
						end
						if not needed then return end
						task.delay(0.25, function()
							retryPending(groupName, child.Name)
							if not folder.Parent then return end
							task.delay(1.5, function() retryPending(groupName, child.Name) end)
						end)
					end))
				end
			end
			-- 이벤트 연결 사이에 모델이 이미 생겼다면 초기 목록도 검사한다.
			for index = #pending, 1, -1 do
				local entry = pending[index]
				local group = library:FindFirstChild(entry[1])
				if group and group:FindFirstChild(entry[2]) and placeFeature(entry) then
					table.remove(pending, index)
				end
			end
			folder.Destroying:Connect(function()
				for _, conn in modelConnections do conn:Disconnect() end
				table.clear(pending)
			end)
		end
	end
	end

	-- 상태
	local pl = AC.newPlayer(100)
	local BASE_DMG = 10
	-- [지상전투 단독] 동료는 파티 UI에만 남으며 전투/전투 중 회복에는 관여하지 않는다.
	local lastCombatAt = os.clock()
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
		-- [종료 메모리 정리] 미처치 적의 관절 제어기도 폐기하고 종료된 장면 참조를 해제한다.
		table.clear(conns)
		for _, enemy in enemies do
			if enemy.fm then
				FM.destroy(enemy.fm)
				enemy.fm = nil
			end
		end
		table.clear(enemies)
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
	local compactTouch = visualMobile and workspace.CurrentCamera
		and (workspace.CurrentCamera.ViewportSize.X < 520
			or workspace.CurrentCamera.ViewportSize.X <= workspace.CurrentCamera.ViewportSize.Y)
	-- [모바일/PC] 카메라 거리 3단계. 각 모드 안에서는 핀치·마우스 휠로 자유롭게 확대한다.
	local cameraBtn = btn(gui, "시야: 기본", Color3.fromRGB(56, 78, 96), UDim2.fromOffset(108, 44),
		UDim2.new(1, -12, 0, 12), Vector2.new(1, 0))
	cameraBtn.Name = "FieldCameraMode"
	cameraBtn.TextSize = 14
	-- [시야 버튼] 전투 아이콘용 장식을 걷어 텍스트 대비를 확보한다.
	cameraBtn.TextYAlignment = Enum.TextYAlignment.Center
	cameraBtn.TextStrokeTransparency = 1
	cameraBtn:FindFirstChildOfClass("UIStroke").ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	local cameraGradient = cameraBtn:FindFirstChildOfClass("UIGradient")
	if cameraGradient then cameraGradient:Destroy() end
	local cameraGrain = cameraBtn:FindFirstChild("FieldLeatherTexture")
	if cameraGrain then cameraGrain:Destroy() end
	cameraBtn.Activated:Connect(function()
		if finished then return end
		local nextIndex = cameraIndex % #cameraModes + 1
		applyFieldCamera(nextIndex)
		cameraBtn.Text = "시야: " .. cameraModes[nextIndex].name
	end)

	local title = label(gui, "", 16)
	title.AnchorPoint = if compactTouch then Vector2.zero else Vector2.new(0.5, 0)
	title.Position = if compactTouch then UDim2.fromOffset(109, 12) else UDim2.new(0.5, 0, 0, 18)
	title.Size = UDim2.fromOffset(if compactTouch then math.min(112, math.max(72, workspace.CurrentCamera.ViewportSize.X - 232)) else 320, if compactTouch then 40 else 24) -- [좁은 세로] 시야 버튼과 제목 분리
	title.TextWrapped = compactTouch
	if compactTouch then title.TextSize = 11 end

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
	do -- [Luau 지역변수 한도] 주인공 HUD 테두리 초기화 지역화
		local heroCorner = Instance.new("UICorner")
		heroCorner.CornerRadius = UDim.new(0, 10)
		heroCorner.Parent = heroPanel
		local heroStroke = Instance.new("UIStroke")
		heroStroke.Color = Color3.fromRGB(210, 170, 99)
		heroStroke.Thickness = 1.3
		heroStroke.Parent = heroPanel
	end
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
	do -- [Luau 지역변수 한도] 주인공 초상화 장식 지역화
		local faceCorner = Instance.new("UICorner")
		faceCorner.CornerRadius = UDim.new(0, 7)
		faceCorner.Parent = heroFace
	end
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

	-- [상호작용 안내] 평소 전투 HUD 배치는 유지하고 긴 유적 조사 기록만 별도 영역에 펼친다.
	local note = label(gui, "", 14, Color3.fromRGB(255, 220, 160))
	note.Name = "FieldInteractionNote"
	note.AnchorPoint = if compactTouch then Vector2.zero else Vector2.new(0.5, 0)
	note.Position = if compactTouch then UDim2.fromOffset(12, 260) else UDim2.new(0.5, 0, 0, 46)
	note.Size = UDim2.fromOffset(if compactTouch then 206 else 320, 22)
	note.BackgroundColor3 = Color3.fromRGB(19, 29, 40)
	note.TextStrokeTransparency = 0.16
	note.ZIndex = 9

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
		Sfx.ambient({ "sfx_wind" }, 0.60)
	end)
	local noteToken = 0
	local function say(text, duration)
		noteToken += 1
		local mine = noteToken
		-- [유적 상호작용] 읽는 동안에도 공격·회피·이동 패드가 가려지지 않게 전투 HUD 밖에 표시한다.
		local expanded = duration ~= nil and duration > 2.2
		local screen = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(832, 384)
		local narrowLandscape = visualMobile and not compactTouch and screen.X < 740 and screen.X > screen.Y
		-- 폭 740 미만 가로형에서는 긴 안내가 퀘스트·날씨와 같은 영역을 사용하므로 잠깐 숨긴다.
		-- 새 전투 알림이 덮어쓰더라도 마지막 메시지의 종료 시점에 원래 정보열을 복원한다.
		local questHud = if visualMobile and not compactTouch then gui:FindFirstChild("FieldQuestHint") else nil
		local weatherHud = if visualMobile and not compactTouch then gui:FindFirstChild("FieldWeatherClock") else nil
		if questHud then questHud.Visible = not expanded end
		if weatherHud then weatherHud.Visible = not expanded end
		note.AnchorPoint = if compactTouch or (expanded and visualMobile) then Vector2.zero else Vector2.new(0.5, 0)
		note.Position = if expanded then
			(if compactTouch then UDim2.fromOffset(12, 398)
				elseif narrowLandscape then UDim2.fromOffset(226, screen.Y - 108)
				elseif visualMobile then UDim2.fromOffset(226, 210)
				else UDim2.new(0.5, 0, 0, 190))
			elseif compactTouch then UDim2.fromOffset(12, 260) else UDim2.new(0.5, 0, 0, 46)
		note.Size = if expanded then UDim2.fromOffset(if compactTouch then 206 elseif narrowLandscape then math.min(244, screen.X - 404) elseif visualMobile then 244 else 256, 64)
			else UDim2.fromOffset(if compactTouch then 206 else 320, 22)
		note.TextWrapped = expanded
		note.TextYAlignment = Enum.TextYAlignment.Center
		note.TextSize = if expanded and narrowLandscape then 12 else 14
		note.BackgroundTransparency = if expanded then 0.2 else 1
		note.Text = text
		task.delay(duration or 2.2, function()
			if noteToken == mine then
				note.Text = ""
				note.BackgroundTransparency = 1
				if questHud and questHud.Parent then questHud.Visible = true end
				if weatherHud and weatherHud.Parent then weatherHud.Visible = true end
			end
		end)
	end

	-- [현장 단서 발견] 지형과 상호작용하면 지역 탐험 이야기가 열린다.
	-- 기존 발견물·카드/보상 집계와 무관한 1회성 클라이언트 관찰이다.
	do
		local theme = folder:GetAttribute("FieldQuestTerrainTheme") or "plains"
		local clueText = {
			coast = "부두 말뚝에 거친 밧줄 자국이 남아 있다. 누군가 서둘러 떠난 듯하다.",
			forest = "나뭇가지가 꺾인 방향과 발자국이 깊은 숲속으로 이어진다.",
			highland = "돌계단 아래에 오래된 등반 흔적이 있다. 바람이 협곡을 울린다.",
			mine = "갱도 주변에 최근 옮겨진 광석 흔적이 있다. 깊은 곳에서 울림이 들린다.",
			ruins = "무너진 석주에 지워진 문양이 남아 있다. 이곳에 오래된 길이 있었다.",
			fort = "성벽에 화살 자국과 오래된 수비 흔적이 남아 있다.",
			desert = "모래에 반쯤 묻힌 길 표식이 오래된 대상로를 가리킨다.",
			farm = "바람에 흔들리는 작물 사이로 낡은 수레바퀴 자국이 이어진다.",
			lake = "물가의 돌이 닳은 흔적을 보면 오래전 누군가 이 길을 지나갔다.",
			plains = "들판의 낡은 이정표가 지금은 사라진 길을 가리킨다.",
		}

		local clues = 0
		folder:SetAttribute("FieldTerrainClues", 0)
		local function attachClue(landmark)
			if clues >= 2 or finished or not landmark:IsA("Model") or landmark.Name ~= "FieldTerrainLandmark" then return end
			if landmark:GetAttribute("FieldTerrainSurvey") ~= true then return end
			local anchorPart = landmark:FindFirstChildWhichIsA("BasePart", true)
			if not anchorPart or anchorPart:FindFirstChild("FieldTerrainSurveyPoint") then return end
			local center, extent = landmark:GetBoundingBox()
			-- 높은 메시 중심 대신 지면 가까운, 중앙 오솔길 방향 모서리에 조사 위치를 고정한다.
			local surveyPoint = Instance.new("Attachment")
			surveyPoint.Name = "FieldTerrainSurveyPoint"
			surveyPoint.Parent = anchorPart
			-- [유적 석주·석상 접촉] 메시 안에 묻히지 않게 바깥쪽 중앙 길을 바라보는 조사 지점으로 이동한다.
			surveyPoint.WorldPosition = Vector3.new(
				center.Position.X + math.sign(ORIGIN.X - center.Position.X) * math.min(extent.X * 0.55 + 4, 16),
				ORIGIN.Y + 3.2,
				center.Position.Z + math.sign(ORIGIN.Z - center.Position.Z) * math.min(extent.Z * 0.55 + 4, 16))
			clues += 1
			local prompt = Instance.new("ProximityPrompt")
			prompt.Name = "FieldTerrainClue"
			prompt.ObjectText = if theme == "ruins" then "유적 조사 지점" else "탐험 흔적"
			prompt.ActionText = "현장 조사"
			prompt.KeyboardKeyCode = Enum.KeyCode.T -- 전투 회전 E와 중복되지 않게 발견물 조사와 통일
			prompt.HoldDuration = 0.55
			prompt.MaxActivationDistance = 12
			prompt.RequiresLineOfSight = false
			prompt.Parent = surveyPoint
			prompt.Triggered:Connect(function(activator)
				if finished or activator ~= player or not prompt.Enabled then return end
				prompt.Enabled = false
				folder:SetAttribute("FieldTerrainClues", (folder:GetAttribute("FieldTerrainClues") or 0) + 1)
				say(clueText[theme] or clueText.plains, 4.5)
			end)
		end
		for _, landmark in folder:GetChildren() do attachClue(landmark) end
		-- [지연 모델도 현장 조사 가능] 원본 모델이 늦게 도착한 경우에도 2개 조사 지점을 유지한다.
		table.insert(conns, folder.ChildAdded:Connect(function(landmark)
			if finished or clues >= 2 then return end
			task.defer(function()
				if landmark.Parent == folder then attachClue(landmark) end
			end)
		end))
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
		-- [종료 메모리 정리] 미처치 적의 관절 제어기도 폐기하고 종료된 장면 참조를 해제한다.
		table.clear(conns)
		for _, enemy in enemies do
			if enemy.fm then
				FM.destroy(enemy.fm)
				enemy.fm = nil
			end
		end
		table.clear(enemies)
		gui:Destroy()
		folder:Destroy()
		-- [현장 음향 복구] 항구·전투 화면에 탐험 풍향/폭풍 루프가 남지 않도록 원래 음향 관리자로 반환한다.
		pcall(function() Sfx.ambient(nil) end)
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
	do -- [Luau 지역변수 한도] 탐험 완료창 장식 지역화
		local popupCorner = Instance.new("UICorner")
		popupCorner.CornerRadius = UDim.new(0, 15)
		popupCorner.Parent = completePopup
		local popupStroke = Instance.new("UIStroke")
		popupStroke.Color = Color3.fromRGB(239, 202, 115)
		popupStroke.Thickness = 2.2
		popupStroke.Parent = completePopup
	end
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
	local completeReopen = btn(gui, "조사 완료", Color3.fromRGB(137, 111, 59), UDim2.fromOffset(if compactTouch then 90 else 98, 38), -- [좁은 세로] 영웅 상태창과 이격
		UDim2.new(1, -12, 0, 64), Vector2.new(1, 0))
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
			Instance.new("UICorner", glint).CornerRadius = UDim.new(1, 0) -- [완료 보상] 사각 픽셀 대신 둥근 광점
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
	-- [퀘스트 HUD] 주인공과 동료의 왼쪽 상태열을 비워 둔다.
	questHint.Position = if compactTouch then UDim2.fromOffset(12, 286) else UDim2.fromOffset(226, 210)
	questHint.Size = UDim2.fromOffset(if compactTouch then 206 elseif visualMobile then 212 else 230, 42)
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
		local anchor = part(folder, Vector3.new(3, 3, 3), CFrame.new(pos + Vector3.new(0, 1.5, 0)), Color3.fromRGB(255, 214, 120), Enum.Material.Neon, Enum.PartType.Ball)
		-- [발견 표시] 조사 판정 크기는 유지하고 네모난 발광 상자만 구형으로 바꾼다.
		-- [발견물 외형] 금빛 공 표식(기본 도형) 대신 보이지 않는 기준점만 두고, 실물·소품 모델로 보여 준다.
		anchor.Transparency = 1
		anchor.CanCollide = false
		anchor.CanQuery = false
		anchor.Name = "Discovery" .. i
		if special then
			anchor:SetAttribute("ObservationCardId", targetCard.id)
			-- [승인된 동물 실물] 기존 Animals 폴더의 실제 종이 맞을 때만 3D 메시를 사용한다.
			-- 없는 종을 다른 동물 메시로 위장하지 않고 종 이름과 승인된 도감 원화를 보여 준다.
			-- [발견물 외형] 실물 모델 배치는 아래 DiscoveryStage(매핑표)가 맡는다.
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
			-- [일반 발견물] 등록 소품 중 하나(상자·항아리·지도·기록장·잔해)로 보여 준다.
			local props = { { "Naval", "chest", 3.2 }, { "Relics", "pot", 2 }, { "Relics", "map-rolled", 1.8 }, { "Relics", "journal-closed", 1.6 }, { "Terrain", "debris", 3 } }
			local pick = props[(i - 1) % #props + 1]
			if not placeModel(folder, pick[1], pick[2], pos, pick[3], false) then
				placeModel(folder, "Naval", "chest", pos, 3.2, false)
			end
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
		-- [발견물 외형] 대표 모양 실물·실루엣·조건·동물 반응·조사 방법
		local stage = if special and DiscoveryStage then DiscoveryStage.setup({
			folder = folder, pos = pos, anchor = anchor, prompt = pp, card = targetCard,
			placeModel = placeModel, say = say, season = season, isFinished = function() return finished end,
		}) else nil
		if special and rareTrace then
			-- [희귀 조사 퀘스트] 같은 탐험 안에서 단서 2개를 찾아야 본 관찰이 열린다.
			-- 이 단계는 기존 발견물 수·소모 일수·보상 확률·저장 키를 바꾸지 않는다.
			local clues = 0
			for clueIndex = 1, 2 do
				local cluePos = ORIGIN + scatter(36)
				local clue = part(folder, Vector3.new(2.2, 0.35, 2.2), CFrame.new(cluePos + Vector3.new(0, 0.25, 0)),
					Color3.fromRGB(164, 138, 79), Enum.Material.Slate)
				clue.Name = "FieldEvidence" .. clueIndex
				clue.Transparency = 1 -- [발견물 외형] 기본 도형 대신 등록 돌 모델을 흔적으로 보여 준다
				clue.CanCollide = false
				local clueModel = placeModel(folder, "Terrain", "kenney_stone_smallFlatA", cluePos, 2.4, false)
				if clueModel then
					clueModel.Name = "FieldEvidenceStone" .. clueIndex
					clue.Destroying:Connect(function() if clueModel.Parent then clueModel:Destroy() end end)
				end
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
				if stage then pcall(stage.onObserved) end
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
		-- [전투 지속력] 장면 전용 최대 체력만 증가. 공용 ActionCombat/공격력/보상/드롭/저장은 불변.
		-- 일반 2.35배(검병 94·궁수 66), 방패·돌격 2.55배(179·128), 두목 2.75배(825).
		-- 적이 강타 후 기상·막기·회피 동작을 충분히 보여 주도록 한다.
		individualDef.hp = math.floor(individualDef.hp *
			(if isBoss then 2.75 elseif ac.kind == "shield" or ac.kind == "charger" then 2.55 else 2.35) + 0.5)
		ac.def = individualDef
		ac.hp = individualDef.hp
		-- [몹 역할별 실루엣] 기존 전투 능력은 유지하고 R15 비율·걸음 성격만 다르게 설정한다.
		-- [병종 실루엣] 기존 R15 리그·실제 손 장착 메시 재사용. 키/체형/바지색으로 원거리·투척·방패·돌격을 구분.
		-- [초급 적 실루엣] 1단은 검병·궁수만 나오므로 검병도 기존 복식 원형에 맞춰 체형을 나눈다.
		-- 기존 병종 편성·HP·공격·속도·드롭은 유지하고 승인된 R15 체형 네 가지만 재사용한다.
		local bodyType = if isBoss or ac.kind == "shield" then "heavy" elseif throwAsset or ac.kind == "archer" then "slim"
			elseif ac.kind == "charger" then "athletic"
			elseif ac.kind == "grunt" and style[2] == "Barbarian" then "heavy"
			elseif ac.kind == "grunt" and style[2] == "Knight" then "athletic"
			elseif ac.kind == "grunt" and style[2] == "Rogue_Hooded" then "slim"
			else "average"
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
		local mobFloor = workspace:Raycast(Vector3.new(pos.X, ORIGIN.Y + 100, pos.Z), Vector3.new(0, -140, 0), groundRay)
		if mobFloor then pos = Vector3.new(pos.X, mobFloor.Position.Y, pos.Z) end
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
		local mobGroundOffset = root.Position.Y - pos.Y
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
			.. (if AC.WEAK[ac.kind] then " · 약점: " .. AC.WEAK[ac.kind].label else "")
		tag.TextSize = if isBoss then 14 else 12
		tag.TextTruncate = Enum.TextTruncate.AtEnd
		local fm = if FM then FM.new(model, false) else nil
		table.insert(enemies, { fm = fm, ac = ac, model = model, root = root, groundOffset = mobGroundOffset, nextGroundAt = 0, hp = ac.hp, maxHp = ac.def.hp, dmg = ac.def.dmg, speed = ac.def.speed, bar = bar, tag = tag, elite = isElite, weapon = weapon, shieldModel = style[5], throwAsset = throwAsset, moveVel = Vector3.zero, lastDodge = -100, dodgeUntil = 0, nextHit = 0, home = pos, boss = isBoss, swingAt = -10, hurtAt = -10, spawnT = os.clock(), motionPhase = rng:NextNumber(), gait = rng:NextNumber(), lastFallAt = -100, knockUntil = 0, riseUntil = 0, guardUntil = 0, parryUntil = 0, nextParryAt = 0, hitVariant = 0, tacticAt = 0, tacticGoal = nil, tacticIntent = "approach", tacticSide = if rng:NextNumber() < 0.5 then -1 else 1,
			counterReadyAt = 0, counterUntil = 0, nextGuardCounterAt = 0, lastReadBasicAt = -100,
			playerChain = 0, bossReadUntil = 0, nextBossReadAt = 0 })
	end
	-- [전투 목표 · 2026-11-28 오너 지시] 매번 다른 목표 하나(속도·무피해·두목 먼저·약점 5번). 별 3개 평가(표시용).
	do
		local hasBoss = false
		for _, o in enemies do if o.boss then hasBoss = true end end
		local options = {
			{ kind = "speed", text = "빨리 끝내기" }, { kind = "untouched", text = "체력 70% 이상 지키기" },
			{ kind = "weak", text = "약점 5번 노리기" },
		}
		if hasBoss then table.insert(options, { kind = "boss", text = "두목부터 쓰러뜨리기" }) end
		if #enemies > 0 then
			local pick = options[math.random(1, #options)]
			pl.fieldChallenge = { kind = pick.kind, text = pick.text, startAt = os.clock(), limit = 25 + #enemies * 8 }
			if pick.kind == "speed" then pl.fieldChallenge.text = string.format("%d초 안에 끝내기", pl.fieldChallenge.limit) end
			folder:SetAttribute("FieldChallenge", pick.kind)
			task.delay(1.5, function() say("이번 목표: " .. pl.fieldChallenge.text, 3) end)
		end
	end

	end

	-- [탐험 시간·날씨·실물 동물] 이번 현장에만 존재하는 비저장 환경 연출.
	-- 기존 퀘스트 목표·전투 수치·보상·드롭·데이터 저장에는 간섭하지 않는다.
	do
		local lighting = game:GetService("Lighting")
		local climateRng = Random.new((opts.seed or 7) * 137 + 19)
		local snowy = winterScene or questTerrain == "glacier" or (region == "nordic" and season ~= "여름")
		local dry = arid or biome.kind == "mine"
		-- [기후별 기상] 북방 설기·온대 봄비·열대 우기·사막 건기를 구별한다.
		local weatherOptions = if snowy then { "맑음", "흐림", "눈", "옅은 안개" }
			elseif monsoon then { "흐림", "비", "소나기", "옅은 안개", "비" }
			elseif dry then { "맑음", "흐림", "옅은 안개" }
			elseif season == "봄" then { "맑음", "흐림", "비", "옅은 안개", "비" }
			else { "맑음", "흐림", "비", "옅은 안개", "소나기" }
		local weather = weatherOptions[climateRng:NextInteger(1, #weatherOptions)]
		-- [Studio 기후 촬영] 해당 지형에서 실제 허용되는 기상만 선택한다. 실제 플레이의 난수·시간·보상은 유지.
		if RunService:IsStudio() then
			if type(opts.studioCaptureWeather) == "table" then
				for _, wanted in opts.studioCaptureWeather do
					if table.find(weatherOptions, wanted) then
						weather = wanted
						break
					end
				end
			end
			if type(opts.studioCaptureHour) == "number" and opts.studioCaptureHour >= 0 and opts.studioCaptureHour < 24 then
				biome.clock = opts.studioCaptureHour
			end
		end
		folder:SetAttribute("FieldWeather", weather) -- [발견물 조건] 비 온 뒤에만 보이는 실물
		local clockStart = os.clock()
		local weatherNext = clockStart + climateRng:NextNumber(55, 90)
		local flashUntil, flashNext = 0, clockStart + 16
		local timeLabel = label(gui, "", 13, Color3.fromRGB(231, 239, 244))
		timeLabel.Name = "FieldWeatherClock"
		-- [기후 HUD] 퀘스트 바로 아래에 배치한다.
		timeLabel.Position = if compactTouch then UDim2.fromOffset(12, 332) else UDim2.fromOffset(226, 256)
		timeLabel.Size = UDim2.fromOffset(if compactTouch then 206 elseif visualMobile then 252 else 300, 26)
		timeLabel.TextSize = 12
		timeLabel.TextXAlignment = Enum.TextXAlignment.Left
		-- 투명 발사대는 눈·빗방울의 발원점일 뿐, 동물·장식용 기본 파츠를 생성하지 않는다.
		local precipAnchor = part(folder, Vector3.new(55, 0.2, 55),
			CFrame.new(ORIGIN + Vector3.new(0, 25, 0)), Color3.new(1, 1, 1))
		precipAnchor.Name = "FieldPrecipitationSource"
		precipAnchor.Transparency = 1
		precipAnchor.CastShadow = false
		precipAnchor.CanCollide, precipAnchor.CanTouch, precipAnchor.CanQuery = false, false, false
		local precip = Instance.new("ParticleEmitter")
		precip.Name = "FieldPrecipitation"
		precip.Texture = if snowy then "rbxasset://textures/particles/smoke_main.dds" else "rbxasset://textures/particles/sparkles_main.dds"
		precip.Shape = Enum.ParticleEmitterShape.Box
		precip.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume
		precip.EmissionDirection = Enum.NormalId.Bottom
		precip.Lifetime = if snowy then NumberRange.new(2.4, 3.4) else NumberRange.new(0.6, 1.1)
		precip.Speed = if snowy then NumberRange.new(4, 8) else NumberRange.new(45, 65)
		precip.Acceleration = if snowy then Vector3.new(1.6, -3.8, 0.9) else Vector3.new(3, -17, 1)
		precip.SpreadAngle = if snowy then Vector2.new(22, 22) else Vector2.new(8, 8)
		precip.Size = if snowy then NumberSequence.new(0.20) else NumberSequence.new(0.075)
		precip.Transparency = NumberSequence.new(0.43, 0.78)
		precip.Color = ColorSequence.new(if snowy then Color3.fromRGB(230, 243, 255) else Color3.fromRGB(171, 211, 247))
		precip.LightEmission = if snowy then 0.2 else 0.08
		precip.Rate = 0
		precip.Parent = precipAnchor
		-- [계절의 숨결] 기존 비·눈 발원점을 재사용해 봄 꽃가루·가을 낙엽·열대 수증기·사막 먼지를 띄운다.
		local driftType = if questTerrain == "volcanic" then "화산재"
			elseif questTerrain == "swamp" then "수면 안개"
			elseif questTerrain == "glacier" then "설풍"
			elseif arid then "모래바람" elseif season == "가을" and not tropical then "낙엽"
			elseif season == "봄" and not tropical then "꽃가루" elseif monsoon then "수증기"
			elseif snowy then "설풍" else "산들바람"
		local driftColor = if driftType == "화산재" then Color3.fromRGB(100, 102, 106)
			elseif driftType == "수면 안개" then Color3.fromRGB(157, 191, 183)
			elseif driftType == "모래바람" then Color3.fromRGB(209, 180, 124)
			elseif driftType == "낙엽" then Color3.fromRGB(198, 118, 58)
			elseif driftType == "꽃가루" then Color3.fromRGB(234, 207, 129)
			elseif driftType == "설풍" then Color3.fromRGB(225, 236, 244)
			else Color3.fromRGB(190, 215, 195)
		local drift = Instance.new("ParticleEmitter")
		drift.Name = "FieldSeasonalDrift"
		drift.Texture = "rbxasset://textures/particles/smoke_main.dds"
		drift.Shape = Enum.ParticleEmitterShape.Box
		drift.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume
		drift.EmissionDirection = Enum.NormalId.Front
		drift.Lifetime = NumberRange.new(2.0, 3.5)
		drift.Speed = NumberRange.new(2.4, 4.8)
		drift.Size = NumberSequence.new(if driftType == "수증기" then 0.7 else 0.24)
		drift.Transparency = NumberSequence.new(0.62, 1)
		drift.Color = ColorSequence.new(driftColor)
		drift.LightEmission = 0.04
		drift.Rotation = NumberRange.new(0, 360)
		drift.RotSpeed = NumberRange.new(-28, 28)
		drift.Rate = 0
		drift.Parent = precipAnchor
		folder:SetAttribute("FieldSeasonalDrift", driftType)
		folder:SetAttribute("FieldWeather", weather)
		-- [현장 음향] 등록·승인된 기존 음원만 사용한다. 날씨/계절/지형 변화에서만 부드럽게 교차 재생한다.
		local soundscapeKey = ""
		local nextDetailSoundAt = clockStart + climateRng:NextNumber(7, 14)
		local timeElapsed = 0
		table.insert(conns, RunService.Heartbeat:Connect(function(dt)
			if finished or not folder.Parent then return end
			timeElapsed += math.min(dt, 0.2)
			if timeElapsed < 0.5 then return end
			timeElapsed = 0
			local now = os.clock()
			local hrp0 = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			if hrp0 and precipAnchor.Parent then
				precipAnchor.Position = hrp0.Position + Vector3.new(0, 23, 0)
			end
			if now >= weatherNext then
				local old = weather
				weather = weatherOptions[climateRng:NextInteger(1, #weatherOptions)]
				if weather == old then weather = weatherOptions[climateRng:NextInteger(1, #weatherOptions)] end
				folder:SetAttribute("FieldWeather", weather)
				weatherNext = now + climateRng:NextNumber(65, 115)
				folder:SetAttribute("FieldWeather", weather)
				if weather ~= old then say("탐험 날씨 변화: " .. weather) end
			end
			-- 12분마다 한 바퀴의 새벽→낮→황혼→밤. 조명은 탐험 종료 시 기존 값으로 복구한다.
			local clock = (biome.clock + (now - clockStart) * (24 / 720)) % 24
			local sun = math.clamp(math.sin((clock - 6) * math.pi / 12) * 1.15 + 0.16, 0, 1)
			local phase = if clock < 5 or clock >= 20 then "밤"
				elseif clock < 8 then "새벽" elseif clock < 17 then "낮" else "황혼"
			local newSoundscape = questTerrain .. ":" .. weather .. ":" .. seasonName .. ":" .. phase
			if newSoundscape ~= soundscapeKey then
				soundscapeKey = newSoundscape
				local rain = weather == "비" or weather == "소나기"
				local water = questTerrain == "coast" or questTerrain == "lake" or questTerrain == "swamp"
					or (biome.kind == "coast" and questTerrain ~= "mine" and questTerrain ~= "desert")
				local layers = if rain then { "sfx_wind", "sfx_ambience_storm" }
					elseif water then { "sfx_waves", "sfx_wind" } else { "sfx_wind" }
				-- [배경음 청감] 기존 0.16~0.48배로 또 낮추던 환경음 게인을 회복한다.
				-- 전투 효과음보다는 작게, 바람·파도·비 소리가 확실히 들리는 범위만 유지.
				local gain = if rain then (if weather == "소나기" then 0.88 else 0.68)
					elseif weather == "옅은 안개" then 0.40
					elseif seasonName == "겨울" or seasonName == "건조한 계절" then 0.57
					elseif phase == "밤" then 0.43 else 0.58
				pcall(function() Sfx.ambient(layers, gain) end)
				folder:SetAttribute("FieldSoundscape", newSoundscape)
			end
			-- 자연의 작은 소리는 전투 중엔 건너뛴다. 반복 피드백·오디오 폭증을 방지한다.
			if now >= nextDetailSoundAt then
				nextDetailSoundAt = now + climateRng:NextNumber(if visualMobile then 16 else 12, 27)
				if now - lastCombatAt > 4 then
					local cue, vol, pitch = nil, 0.16, climateRng:NextNumber(0.91, 1.1)
					if weather == "비" or weather == "소나기" then
						cue, vol = "sfx_splash", 0.13
					elseif questTerrain == "coast" or biome.kind == "coast" then
						cue, vol = "sfx_gull", if phase == "밤" then 0.08 else 0.24
					elseif questTerrain == "mine" or questTerrain == "swamp" or questTerrain == "lake" then
						cue, vol = "sfx_splash", 0.11
					elseif questTerrain == "forest" or questTerrain == "jungle" then
						cue, vol = if season == "겨울" then "sfx_creak" else "sfx_sail_fabric", 0.13
					elseif questTerrain == "desert" or arid then
						cue, vol = "sfx_sail_fabric", 0.14
					elseif questTerrain == "fort" or region == "brick" or region == "britain" then
						cue, vol = "sfx_bell", 0.12
					elseif questTerrain == "volcanic" or questTerrain == "glacier" or season == "겨울" then
						cue, vol = "sfx_creak", 0.10
					elseif season == "가을" or season == "봄" then
						cue, vol = "sfx_sail_fabric", 0.11
					end
					if cue then sfx(cue, vol, pitch) end
				end
			end
			local damp = if weather == "옅은 안개" then 0.62 elseif weather == "소나기" then 0.71
				elseif weather == "눈" or weather == "비" then 0.80 else 1
			lighting.ClockTime = clock
			lighting.Brightness = (0.52 + 1.58 * sun) * (if weather == "소나기" then 0.78 else 1)
			lighting.FogEnd = math.max(105, biome.fogEnd * damp)
			lighting.FogStart = math.min(120, lighting.FogEnd * 0.35)
			if lightSave.FieldClouds and lightSave.FieldClouds.Parent then
				local cover = if weather == "소나기" then 0.84 elseif weather == "비" or weather == "눈" then 0.72
					elseif weather == "흐림" then 0.60 elseif weather == "옅은 안개" then 0.44
					elseif arid then 0.10 elseif tropical then 0.32 elseif northern then 0.28 else 0.18
				lightSave.FieldClouds.Cover = cover
				lightSave.FieldClouds.Density = if weather == "소나기" then 0.78 elseif weather == "비" or weather == "눈" then 0.62 else 0.36
				lightSave.FieldClouds.Color = biome.fog:Lerp(Color3.fromRGB(235, 241, 248), if sun < 0.3 then 0.35 else 0.76)
			end
			lighting.FogColor = biome.fog:Lerp(Color3.fromRGB(60, 78, 111), (1 - sun) * 0.55)
			-- [기존 날씨 틱 통합] 새 갱신 루프 없이 새벽·밤·비·해무의 대기 밀도만 조정한다.
			local depthAtmosphere = lightSave.FieldAtmosphere
			if depthAtmosphere and depthAtmosphere.Parent then
				depthAtmosphere.Color = lighting.FogColor:Lerp(Color3.fromRGB(216, 229, 240), 0.14)
				depthAtmosphere.Decay = lighting.FogColor:Lerp(
					if arid then Color3.fromRGB(184, 159, 132) else Color3.fromRGB(103, 143, 179),
					if sun < 0.2 then 0.39 else 0.28)
				-- [입체감] 날씨 틱이 시작 값(밀도·연무)을 덮어써 근경까지 하얗게 됐다(Studio 재촬영).
				-- 맑은 날은 근경 선명, 안개·소나기는 분위기만 남도록 상한을 낮춘다.
				depthAtmosphere.Density = math.clamp(0.17 + (600 - lighting.FogEnd) / 2200, 0.14, 0.30)
				depthAtmosphere.Offset = 0.32
				depthAtmosphere.Haze = if weather == "옅은 안개" then 1.6 elseif weather == "소나기" then 1.2
					else (if visualMobile then 0.45 else 0.65)
			end
			lighting.Ambient = biome.fog:Lerp(Color3.fromRGB(83, 103, 132), if sun < 0.5 then 0.77 else 0.54)
			lighting.OutdoorAmbient = biome.fog:Lerp(Color3.fromRGB(112, 127, 151), if sun < 0.5 then 0.69 else 0.45)
			if weather == "소나기" and now >= flashNext then
				flashUntil = now + 0.18
				flashNext = now + climateRng:NextNumber(14, 28)
			end
			lighting.ColorShift_Top = if now < flashUntil then Color3.fromRGB(215, 230, 255)
				elseif sun < 0.20 then Color3.fromRGB(131, 145, 180)
				elseif phase == "새벽" or phase == "황혼" then Color3.fromRGB(255, 182, 131)
				else lightSave.ColorShiftTop
			precip.Rate = if weather == "눈" then (if visualMobile then 15.5 else 31)
				elseif weather == "비" or weather == "소나기" then (if visualMobile then 45 else 90) else 0
			if weather == "소나기" then precip.Rate *= 1.45 end
			-- 바람은 지역 특성과 기상에 따라 방향·강도가 달라지되 이동/전투 판정에는 영향이 없다.
			local gust = math.sin(now * 0.15 + month) * 2.0
			local windStrength = if weather == "소나기" then 2.2 elseif weather == "눈" then 1.7 else 1
			drift.Acceleration = Vector3.new((5.5 + gust) * windStrength, if driftType == "낙엽" then -3.0 else 0.8, 1.9 * windStrength)
			drift.Rate = (if visualMobile then 4 else 8) * (if weather == "소나기" then 0.45 else 1)
				* (if driftType == "화산재" or driftType == "모래바람" then 1.5
					elseif driftType == "수면 안개" and phase == "밤" then 1.35 else 1)
			timeLabel.Text = string.format("%s %s %02d:%02d · %s", seasonName, phase, math.floor(clock), math.floor((clock % 1) * 60), weather)
			folder:SetAttribute("FieldTimePhase", phase)
			folder:SetAttribute("FieldClockTime", clock)
		end))
	end

	-- [자연 관찰] 항구에서 이미 쓰는 승인된 Animals 메시만 출현.
	-- 살아 있는 현장 동물은 공격 대상이 아니며 관찰은 기록 연출만 남긴다(보상·도감 저장 없음).
	do
		local wildlifeRng = Random.new((opts.seed or 7) * 197 + 31)
		-- 승인된 동물 메시가 늦게 로드되어도 새 조우 시 다시 조회한다.
		local animalShelf = nil
		local names = { sheep = "양", horse = "말", donkey = "당나귀", cow = "소",
			["dog-pug"] = "개", cat = "고양이", chicken = "닭", pig = "돼지",
			elephant = "코끼리", llama = "라마" }
		-- [항구·탐험 일치] 말 성체, 소, 양, 돼지 등 실물 비율을 목장과 똑같이 적용한다.
		local sizes = PortBuildings.AnimalVisual
		-- [종별 시각 보행] 목장과 같은 보폭을 사용하되 몸무게·발 수에 맞는 발 디딤과 머리/꼬리 움직임을 분리한다.
		-- stride(스터드), speed(스터드/초), swing(라디안), head, tail, fourBeat.
		local gait = {
			horse = {4.3, 2.8, 0.30, 0.07, 0.15, true}, cow = {3.8, 1.7, 0.21, 0.055, 0.12, true},
			donkey = {3.2, 2.2, 0.25, 0.07, 0.14, true}, llama = {3.4, 2.0, 0.24, 0.045, 0.11, true},
			sheep = {2.6, 1.7, 0.24, 0.09, 0.09, true}, pig = {2.5, 1.6, 0.22, 0.09, 0.13, true},
			elephant = {4.8, 1.5, 0.15, 0.035, 0.09, true},
			["dog-pug"] = {2.2, 2.5, 0.33, 0.065, 0.30, false},
			cat = {1.9, 1.8, 0.28, 0.045, 0.18, false},
			chicken = {1.0, 0.95, 0.35, 0.14, 0.055, false},
		}
		local region = biome.region or ""
		local candidates = if region == "nordic" or region == "britain" then { "sheep", "horse", "cow", "dog-pug" }
			elseif region == "desert" or region == "ottoman" then { "donkey", "cat", "sheep" }
			elseif region == "malabar" then { "elephant", "cow", "chicken", "cat" }
			elseif region == "colonial" then { "llama", "horse", "pig", "chicken" }
			elseif biome.kind == "forest" then { "sheep", "horse", "dog-pug", "cat" }
			elseif biome.kind == "coast" then { "chicken", "dog-pug", "cat", "sheep" }
			else { "horse", "donkey", "sheep", "chicken", "cat" }
		local animals = {}
		local maxAnimals = if visualMobile then 2 else 4
		local lastWildlifeSpawn = -100
		folder:SetAttribute("FieldAmbientObservations", 0)
		local function spawnWildlife()
			local assets = ReplicatedStorage:FindFirstChild("MareAssets")
			animalShelf = assets and assets:FindFirstChild("Animals")
			if not animalShelf or not animalShelf.Parent or #animals >= maxAnimals then return end
			local available = {}
			for _, species in candidates do
				local template = animalShelf:FindFirstChild(species)
				if AssetIds["Animals/" .. species] and template and template:IsA("Model") then
					table.insert(available, species)
				end
			end
			if #available == 0 then return end -- 승인 실물 없으면 가짜 동물 생성 금지.
			local species = available[wildlifeRng:NextInteger(1, #available)]
			local pos = ORIGIN + scatter(65)
			local root0 = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			if root0 and (root0.Position - pos).Magnitude < 32 then return end
			-- [실물 접지] 최초 생성부터 언덕·지면의 실제 높이를 따른다.
			local floorHit = workspace:Raycast(Vector3.new(pos.X, ORIGIN.Y + 110, pos.Z),
				Vector3.new(0, -170, 0), groundRay)
			if not floorHit or floorHit.Normal.Y <= 0.65 then return end
			pos = Vector3.new(pos.X, floorHit.Position.Y, pos.Z)
			local visual = sizes[species]
			local coatIndex = 1 + math.floor(math.abs(pos.X * 0.21 + pos.Z * 0.39)) % #visual.coats
			local model = placeModel(folder, "Animals", species, pos, visual.size, false, Color3.fromRGB(table.unpack(visual.coats[coatIndex])))
			if not model then return end
			model:SetAttribute("AnimalVisualSize", visual.size)
			model:SetAttribute("AnimalCoatIndex", coatIndex)
			model.Name = "FieldAmbientAnimal"
			model:SetAttribute("ObservedSpecies", species)
			local focus = model:FindFirstChildWhichIsA("BasePart", true)
			if focus then
				local prompt = Instance.new("ProximityPrompt")
				prompt.Name = "FieldWildlifeObserve"
				prompt.ObjectText = names[species] or species
				prompt.ActionText = "조용히 관찰"
				prompt.HoldDuration = 0.9
				prompt.MaxActivationDistance = 12
				prompt.RequiresLineOfSight = false
				prompt.Parent = focus
				prompt.Triggered:Connect(function(triggerPlayer)
					if finished or triggerPlayer ~= player or not prompt.Enabled then return end
					prompt.Enabled = false
					folder:SetAttribute("FieldAmbientObservations", (folder:GetAttribute("FieldAmbientObservations") or 0) + 1)
					say("동물 발견: " .. (names[species] or species) .. " · 현장 관찰 완료")
				end)
			end
			-- [원본 모델 보존] 수입 Pivot의 Up/Look 축은 실제 메시의 머리·발 방향과 다를 수 있다.
			-- 원본 자세를 CFrame.lookAt으로 덮지 않고, 월드 Y축 회전만 적용한다.
			local origin = model:GetPivot()
			local box, extent = model:GetBoundingBox()
			local headSum, tailSum, footSum = Vector3.zero, Vector3.zero, Vector3.zero
			local heads, tails, feet = 0, 0, 0
			for _, node in model:GetDescendants() do
				local p = if node:IsA("Bone") then node.WorldPosition
					elseif node:IsA("BasePart") and node.Transparency < 0.98 then node.Position else nil
				if p then
					local name = node.Name:lower()
					if name:find("head", 1, true) or name:find("beak", 1, true) or name:find("muzzle", 1, true) then
						headSum += p; heads += 1
					elseif name:find("tail", 1, true) then
						tailSum += p; tails += 1
					elseif name:find("foot", 1, true) or name:find("hoof", 1, true) or name:find("paw", 1, true) or name:find("toe", 1, true) then
						footSum += p; feet += 1
					end
				end
			end
			local front = if heads > 0 then headSum / heads else nil
			local back = if tails > 0 then tailSum / tails else box.Position
			local axis = if front then (front - back) * Vector3.new(1, 0, 1) else Vector3.zero
			local facingKnown = axis.Magnitude > math.max(0.08, visual.size * 0.035)
			local forward = if facingKnown then axis.Unit else Vector3.new(0, 0, -1)
			-- 발이 몸 중앙보다 위에 있다는 실측 증거가 있을 때만 뒤집힌 원본을 바로 세운다.
			if facingKnown and feet >= 2 and (footSum / feet).Y > box.Position.Y + extent.Y * 0.12 then
				model:PivotTo(CFrame.new(box.Position) * CFrame.fromAxisAngle(forward, math.pi)
					* CFrame.new(-box.Position) * origin)
				origin = model:GetPivot()
			end
			local yaw = wildlifeRng:NextNumber(-math.pi, math.pi)
			local spin = CFrame.Angles(0, yaw, 0)
			model:PivotTo(CFrame.new(box.Position) * spin * CFrame.new(-box.Position) * origin)
			forward = spin:VectorToWorldSpace(forward)
			local lowestY = math.huge
			local visiblePieces = {}
			for _, piece in model:GetDescendants() do
				if piece:IsA("BasePart") and piece.Transparency < 0.98 then
					table.insert(visiblePieces, piece)
					local half, cf = piece.Size * 0.5, piece.CFrame
					lowestY = math.min(lowestY, cf.Position.Y - math.abs(cf.RightVector.Y) * half.X
						- math.abs(cf.UpVector.Y) * half.Y - math.abs(cf.LookVector.Y) * half.Z)
				end
			end
			if lowestY < math.huge then
				model:PivotTo(CFrame.new(0, pos.Y - lowestY, 0) * model:GetPivot())
			end
			local basePivot = model:GetPivot()
			local right = forward:Cross(Vector3.yAxis)
			local profile = gait[species]
			model:SetAttribute("FieldAnimalFacing", if facingKnown then "ANATOMICAL_FORWARD" else "UNVERIFIED_STATIC")
			local _, ext = model:GetBoundingBox()
			local bodySize = math.max(ext.X, ext.Y, ext.Z)
			-- [실물 리그] Bone·Motor6D·분리 사지를 중복 없이 수집한다.
			-- 고정된 수입 모델은 Part1을 움직이고, 가동 관절은 원래 Transform으로만 구동한다.
			local bones, parts, legCount = {}, {}, 0
			local occupiedParts, drivenParts, legGroups = {}, {}, {}
			local legHinges = {}
			local biped = species == "chicken"
			local bodyCenter = model:GetBoundingBox().Position
			for _, node in model:GetDescendants() do
				if node:IsA("Motor6D") and node.Part1 then
					occupiedParts[node.Part1] = true
				elseif node:IsA("AnimationConstraint") then
					local target = node.Attachment1 and node.Attachment1.Parent
					if target and target:IsA("BasePart") then occupiedParts[target] = true end
				end
			end
			for _, node in model:GetDescendants() do
				local targetPart = if node:IsA("Motor6D") then node.Part1
					elseif node:IsA("AnimationConstraint") then node.Attachment1 and node.Attachment1.Parent else nil
				local name = node.Name:lower()
				if targetPart then name ..= " " .. targetPart.Name:lower() end
				local leg = name:find("leg", 1, true) or name:find("hoof", 1, true)
					or name:find("paw", 1, true) or name:find("foot", 1, true)
					or name:find("knee", 1, true) or name:find("hock", 1, true) or name:find("toe", 1, true)
				local head = name:find("head", 1, true) or name:find("neck", 1, true)
				local tail = name:find("tail", 1, true)
				local kind = if leg then "leg" elseif head then "head" elseif tail then "tail" else nil
				if kind then
					local jointFrame = if node:IsA("Bone") then node.WorldCFrame
						elseif node:IsA("Motor6D") and node.Part0 then node.Part0.CFrame * node.C0
						elseif node:IsA("AnimationConstraint") and node.Attachment0 then node.Attachment0.WorldCFrame
						elseif targetPart and targetPart:IsA("BasePart") then targetPart.CFrame
						elseif node:IsA("BasePart") then node.CFrame else basePivot
					local rel = (if targetPart and targetPart:IsA("BasePart") then targetPart.Position else jointFrame.Position) - bodyCenter
					local left = rel:Dot(right) < 0
					local rear = not biped and rel:Dot(forward) < 0
					local phase = if profile[6] then
						(if rear then (if left then math.pi * 1.5 else math.pi * 0.5) else (if left then 0 else math.pi))
						else (if rear then (if left then math.pi else 0) else (if left then 0 else math.pi))
					local localRight = jointFrame:VectorToObjectSpace(right)
					local localUp = jointFrame:VectorToObjectSpace(Vector3.yAxis)
					local lower = name:find("lower", 1, true) or name:find("foot", 1, true) or name:find("toe", 1, true)
					local legGroup, legChild
					if kind == "leg" then
						legGroup = (if rear then "rear" else "front") .. (if left then "_left" else "_right")
						local ancestor = if node:IsA("Bone") then node.Parent
							elseif node:IsA("Motor6D") then node.Part0
							elseif node:IsA("AnimationConstraint") and node.Attachment0 then node.Attachment0.Parent else nil
						while ancestor and ancestor ~= model do
							local n = ancestor.Name:lower()
							if n:find("leg", 1, true) or n:find("hoof", 1, true) or n:find("foot", 1, true)
								or n:find("knee", 1, true) or n:find("hock", 1, true) then legChild = true; break end
							if not ancestor:IsA("Bone") then break end
							ancestor = ancestor.Parent
						end
					end
					local accepted = false
					if node:IsA("Bone") and #bones < 14 then
						table.insert(bones, { joint = node, base = node.Transform, kind = kind, phase = phase, axis = localRight, up = localUp, lower = lower, legGroup = legGroup, legChild = legChild })
						accepted = true
					elseif targetPart and targetPart:IsA("BasePart") then
						if targetPart.Anchored and not drivenParts[targetPart] and #parts < 12
							and math.max(targetPart.Size.X, targetPart.Size.Y, targetPart.Size.Z) < bodySize * 0.77 then
							table.insert(parts, { part = targetPart, base = basePivot:ToObjectSpace(targetPart.CFrame),
								kind = kind, phase = phase, axis = targetPart.CFrame:VectorToObjectSpace(right), up = targetPart.CFrame:VectorToObjectSpace(Vector3.yAxis), lower = lower, legGroup = legGroup, hinge = math.min(targetPart.Size.Y * 0.34, 0.65) })
							drivenParts[targetPart] = true
							accepted = true
						elseif not targetPart.Anchored and #bones < 14 then
							table.insert(bones, { joint = node, base = node.Transform, kind = kind, phase = phase, axis = localRight, up = localUp, lower = lower, legGroup = legGroup, legChild = legChild })
							accepted = true
						end
					elseif node:IsA("BasePart") and not occupiedParts[node] and not drivenParts[node]
						and #parts < 12 and math.max(node.Size.X, node.Size.Y, node.Size.Z) < bodySize * 0.77 then
						table.insert(parts, { part = node, base = basePivot:ToObjectSpace(node.CFrame),
							kind = kind, phase = phase, axis = node.CFrame:VectorToObjectSpace(right), up = node.CFrame:VectorToObjectSpace(Vector3.yAxis), lower = lower, legGroup = legGroup, hinge = math.min(node.Size.Y * 0.34, 0.65) })
						drivenParts[node] = true
						accepted = true
					end
					if accepted and kind == "leg" then
						-- [발별 판정] 무릎과 정강이를 서로 다른 다리로 세지 않는다.
						local group = (if rear then "rear" else "front") .. (if left then "_left" else "_right")
						if not legGroups[group] then legGroups[group] = true; legCount += 1 end
					end
				end
			end
			-- 가축의 분리된 발굽·정강이는 동일한 회전점을 사용해 접합 간격을 보존한다.
			do
				for _, limb in parts do
					if limb.legGroup then
						local part = limb.part
						local cf, half = part.CFrame, part.Size * 0.5
						local top = cf.Position + Vector3.yAxis * (math.abs(cf.RightVector.Y) * half.X
							+ math.abs(cf.UpVector.Y) * half.Y + math.abs(cf.LookVector.Y) * half.Z)
						local current = legHinges[limb.legGroup]
						if not current or top.Y > current.Y then legHinges[limb.legGroup] = top end
					end
				end
				for _, limb in parts do
					if limb.legGroup then
						limb.legHinge = basePivot:PointToObjectSpace(legHinges[limb.legGroup])
						limb.legAxis = basePivot:VectorToObjectSpace(right)
					end
				end
			end
			local requiredLegs = if biped then 2 else 4
			local canWalk = facingKnown and legCount == requiredLegs
			model:SetAttribute("AnimalLegGroups", legCount)
			model:SetAttribute("AnimalRequiredLegGroups", requiredLegs)
			model:SetAttribute("FieldAnimalMotionRig", if canWalk then "WALK_RIG"
				elseif #bones + #parts > 0 then "IDLE_RIG" else "STATIC_UNRIGGED")
			table.insert(animals, { model = model, center = basePivot, bornAt = os.clock(),
				phase = wildlifeRng:NextNumber(0, 7), bones = bones, parts = parts, canWalk = canWalk,
				forward = forward, profile = profile, visiblePieces = visiblePieces,
				heading = 0, travel = 0, step = 0, stepWeight = 0, homeFloor = pos.Y, groundOffset = 0,
				legSwingScale = if species == "sheep" or species == "elephant" then 0.65 elseif biped then 0.80 else 0.75 })
		end
		-- 자연동물은 최대 4마리만 두고 화면 밖에 있을 때 짧은 산책·풀 뜯기를 반복한다.
		local tick = 0
		table.insert(conns, RunService.PreSimulation:Connect(function(dt)
			if finished or not folder.Parent then return end
			tick += math.min(dt, 0.2)
			-- [실물 관절 보행] 0.24초마다 순간이동하던 동물 위치를 근거리에서 부드럽게 갱신한다.
			if tick < (if visualMobile then 0.06 else 0.045) then return end
			local elapsed = tick
			tick = 0
			local now = os.clock()
			local root0 = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			for i = #animals, 1, -1 do
				local a = animals[i]
				if not a.model.Parent or now - a.bornAt > 100 then
					if a.model.Parent then a.model:Destroy() end
					table.remove(animals, i)
				elseif not root0 or (root0.Position - a.center.Position).Magnitude < 160 then
					local time = now - a.bornAt
					local cycle = time * 0.33 + a.phase
					local target = if a.canWalk then 5.5 * math.sin(cycle) else 0
					-- [전진 보행] 실제 남은 이동량을 기준으로 먼저 몸을 돌린 뒤 움직인다.
					local delta = target - a.travel
					local want = if delta < -0.025 then math.pi elseif delta > 0.025 then 0 else a.heading
					local turn = math.atan2(math.sin(want - a.heading), math.cos(want - a.heading))
					a.heading += math.clamp(turn, -2.8 * elapsed, 2.8 * elapsed)
					local remainingTurn = math.atan2(math.sin(want - a.heading), math.cos(want - a.heading))
					local stepDistance = if a.canWalk and math.abs(remainingTurn) < 0.12
						then math.clamp(delta, -a.profile[2] * elapsed, a.profile[2] * elapsed) else 0
					local proposed = a.travel + stepDistance
					local p = a.center.Position + a.forward * proposed
					-- 이동할 발밑을 먼저 검사한다. 절벽·구멍·급경사에는 들어가지 않는다.
					local hit = workspace:Raycast(Vector3.new(p.X, ORIGIN.Y + 110, p.Z),
						Vector3.new(0, -170, 0), groundRay)
					if hit and hit.Normal.Y > 0.65 and math.abs(hit.Position.Y - a.homeFloor - a.groundOffset) <= math.max(0.7, math.abs(stepDistance) * 1.5) then
						a.travel = proposed
						a.groundOffset = hit.Position.Y - a.homeFloor
					else
						stepDistance = 0
					end
					local walked = math.abs(stepDistance)
					local moving = walked > 0.001
					if moving then a.step += walked * (2 * math.pi / a.profile[1]) end
					a.stepWeight += ((if moving then 1 else 0) - a.stepWeight) * (1 - math.exp(-12 * elapsed))
					local position = a.center.Position + a.forward * a.travel + Vector3.new(0, a.groundOffset, 0)
					-- 원본의 회전(수입 리그의 Up축 포함)은 보존하고 월드 Y축만 돌린다.
					local pivot = CFrame.new(position) * CFrame.Angles(0, a.heading, 0) * a.center.Rotation
					a.model:PivotTo(pivot)
					for _, limb in a.bones do
						local pitch = if limb.kind == "leg" then math.sin(a.step + limb.phase) * a.profile[3] * a.stepWeight * (if limb.lower then -0.38 else 1)
							elseif limb.kind == "head" then (if moving then math.sin(a.step * 2) * a.profile[4] else math.sin(time * 1.4) * a.profile[4]) else 0
						local wag = if limb.kind == "tail" then math.sin(time * 2.2) * a.profile[5] else 0
						if limb.legGroup then
							pitch = if limb.legChild then 0 else math.sin(a.step + limb.phase) * a.profile[3] * a.stepWeight * a.legSwingScale
						end
						limb.joint.Transform = limb.base * CFrame.fromAxisAngle(limb.axis, pitch) * CFrame.fromAxisAngle(limb.up, wag)
					end
					for _, limb in a.parts do
						local pitch = if limb.kind == "leg" then math.sin(a.step + limb.phase) * a.profile[3] * a.stepWeight * (if limb.lower then -0.38 else 1)
							elseif limb.kind == "head" then (if moving then math.sin(a.step * 2) * a.profile[4] else math.sin(time * 1.4) * a.profile[4]) else 0
						local wag = if limb.kind == "tail" then math.sin(time * 2.2) * a.profile[5] else 0
						if limb.legHinge then
							pitch = math.sin(a.step + limb.phase) * a.profile[3] * a.stepWeight * a.legSwingScale
							limb.part.CFrame = pivot * CFrame.new(limb.legHinge) * CFrame.fromAxisAngle(limb.legAxis, pitch)
								* CFrame.new(-limb.legHinge) * limb.base
						else
							local hinge = limb.up * limb.hinge
							limb.part.CFrame = pivot * limb.base * CFrame.new(hinge)
								* CFrame.fromAxisAngle(limb.axis, pitch) * CFrame.fromAxisAngle(limb.up, wag) * CFrame.new(-hinge)
						end
					end
					-- 분리된 실제 사지의 움직임 뒤에도 가장 낮은 가시 메시를 지면에 유지한다.
					local low = math.huge
					for _, piece in a.visiblePieces do
						if piece.Parent then
							local half, cf = piece.Size * 0.5, piece.CFrame
							low = math.min(low, cf.Position.Y - math.abs(cf.RightVector.Y) * half.X
								- math.abs(cf.UpVector.Y) * half.Y - math.abs(cf.LookVector.Y) * half.Z)
						end
					end
					if low < math.huge then
						a.model:PivotTo(a.model:GetPivot() + Vector3.new(0, a.homeFloor + a.groundOffset - low, 0))
					end
				end
			end
			local phase = folder:GetAttribute("FieldTimePhase") or "낮"
			-- [새벽/황혼 생태] 동물 조우를 조금 더 자주 시도하지만 생성 수 상한은 항상 유지한다.
			local gap = if phase == "새벽" or phase == "황혼" then 18 else 32
			if now - lastWildlifeSpawn >= gap and #animals < maxAnimals then
				lastWildlifeSpawn = now
				spawnWildlife()
			end
		end))
	end

	-- 미니맵: 주변 약 130스터드를 보여 준다(북쪽이 위). 흰 점=나, 금색=발견물(멀면 가장자리에 표시), 빨강=적, 큰 주황=두목
	do
		local MM, RADIUS = if compactTouch then 92
			elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 then 82
			elseif visualMobile then 106 else 120, 130
		local map = Instance.new("Frame")
		map.AnchorPoint = Vector2.new(0, 0)
		map.Name = "FieldMiniMap"
		map.Position = UDim2.fromOffset(226, 74)
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
		-- [탐험 동료 대화] 영입된 실제 동료의 기존 개인사와 현장 좌표/전투를 엮어 중앙에 한마디씩 보여 준다.
		-- 게임 보상·호감도·드랍 판정은 건드리지 않는다. 한 번에 한 대사만 비차단으로 표시한다.
		local companionRows: { any } = {} -- [지상전투 단독] 동료는 지상전투에 나오지 않으므로 대화도 없다.
		local talkHistory = require(script.Parent:WaitForChild("CompanionTalk")).Talk
		local talkRng = Random.new(math.floor(os.clock() * 1000) % 2147483647)
		local dialogueFrame, speakerLabel, speechLabel = nil, nil, nil
		local nextTalkAt, lastSpeech, dialogueSerial = os.clock() + 3.5, "", 0
		if #companionRows > 0 then
			dialogueFrame = Instance.new("Frame")
			dialogueFrame.Name = "FieldCompanionDialogue"
			dialogueFrame.AnchorPoint = Vector2.new(0.5, 0.5)
			dialogueFrame.Position = UDim2.fromScale(0.5, if workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize.Y < 350 then 0.68 else 0.57)
			dialogueFrame.Size = UDim2.new(if compactTouch then 0.62 else 0.45, 0, 0, if compactTouch then 76 else 70)
			dialogueFrame.BackgroundColor3 = Color3.fromRGB(29, 35, 47)
			dialogueFrame.BackgroundTransparency = 0.13
			dialogueFrame.BorderSizePixel = 0
			dialogueFrame.Active = false
			dialogueFrame.ZIndex = 10
			dialogueFrame.Visible = false
			dialogueFrame.Parent = gui
			local rounded = Instance.new("UICorner")
			rounded.CornerRadius = UDim.new(0, 10)
			rounded.Parent = dialogueFrame
			local border = Instance.new("UIStroke")
			border.Color = Color3.fromRGB(222, 184, 112)
			border.Thickness = 1.7
			border.Parent = dialogueFrame
			speakerLabel = label(dialogueFrame, "", 15, Color3.fromRGB(255, 220, 143))
			speakerLabel.Name = "FieldCompanionSpeaker"
			speakerLabel.Position = UDim2.fromOffset(12, 5)
			speakerLabel.Size = UDim2.new(1, -24, 0, 21)
			speakerLabel.TextXAlignment = Enum.TextXAlignment.Left
			speakerLabel.TextTruncate = Enum.TextTruncate.AtEnd
			speakerLabel.ZIndex = 11
			speechLabel = label(dialogueFrame, "", if compactTouch then 13 else 15, Color3.fromRGB(252, 245, 223))
			speechLabel.Name = "FieldCompanionLine"
			speechLabel.Position = UDim2.fromOffset(12, 27)
			speechLabel.Size = UDim2.new(1, -24, 1, -31)
			speechLabel.TextXAlignment = Enum.TextXAlignment.Left
			speechLabel.TextYAlignment = Enum.TextYAlignment.Top
			speechLabel.TextWrapped = true
			speechLabel.ZIndex = 11
		end
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
			if dialogueFrame and os.clock() >= nextTalkAt then
				local speaker = companionRows[talkRng:NextInteger(1, #companionRows)]
				local speakerId = if type(speaker) == "table" then tostring(speaker.id or "") else ""
				local speakerName = if type(speaker) == "table" then tostring(speaker.name or "동료") else tostring(speaker)
				local nearEnemy = false
				for _, hostile in enemies do
					if hostile.root and hostile.root.Parent and not hostile.ac.dead
						and (hostile.root.Position - p0).Magnitude < 35 then
						nearEnemy = true
						break
					end
				end
				local nearbyDiscovery, nearestDistance = nil, math.huge
				for _, point in folder:GetChildren() do
					if point:IsA("BasePart") and string.sub(point.Name, 1, 9) == "Discovery" then
						local distance = (point.Position - p0).Magnitude
						if distance < nearestDistance then
							nearbyDiscovery, nearestDistance = point, distance
						end
					end
				end
				local kind = talkRng:NextInteger(1, 6)
				local speech, category
				if nearEnemy and kind <= 3 then
					local battleLines = {
						"정면에서 무리하지 마세요. 적의 공격 뒤가 빈틈이에요!",
						"적이 가까워요. 회피하고 빈틈을 노려요.",
						"지금은 흩어지지 말고 서로의 뒤를 봐요.",
						"주변을 살펴요. 다른 적이 끼어들 수 있어요.",
					}
					speech, category = battleLines[talkRng:NextInteger(1, #battleLines)], "전투 조언"
				elseif nearbyDiscovery and kind <= 4 then
					local offset = nearbyDiscovery.Position - p0
					local direction = if math.abs(offset.X) >= math.abs(offset.Z)
						then (if offset.X >= 0 then "동쪽" else "서쪽")
						else (if offset.Z >= 0 then "남쪽" else "북쪽")
					local rangeText = if nearestDistance < 25 then "바로 근처" elseif nearestDistance < 70 then "조금 앞" else "멀리"
					speech = string.format("%s %s에 발견물의 흔적이 있어요. 지도를 확인해요.", direction, rangeText)
					category = "발견물 힌트"
				else
					local lines = talkHistory[speakerId] and talkHistory[speakerId][1]
					if lines and #lines > 0 and kind >= 3 then
						speech, category = lines[talkRng:NextInteger(1, #lines)], "개인 이야기"
					else
							local feelings = {
							"이곳의 공기는 항구와 전혀 다르네요. 조금 설레요.",
							"오늘은 낯선 풍경을 오래 기억하고 싶어요.",
							"멀리 떠나온 가족들이 문득 생각나요.",
							"함께 걸으니 조금은 마음이 놓여요.",
							"무사히 돌아가면 따뜻한 식사가 그립겠어요.",
						}
							speech, category = feelings[talkRng:NextInteger(1, #feelings)], "동료의 마음"
					end
				end
				if speech == lastSpeech then
					speech = if nearbyDiscovery then "발견물이 남아 있어요. 금빛 지점을 따라가 봐요."
						else "함께 탐험하니 새로운 이야기가 쌓이네요."
				end
				lastSpeech = speech
				dialogueSerial += 1
				local serial = dialogueSerial
				speakerLabel.Text = speakerName .. " · " .. category
				speechLabel.Text = speech
				dialogueFrame:SetAttribute("FieldDialogueKind", category)
				dialogueFrame.Visible = true
				nextTalkAt = os.clock() + talkRng:NextNumber(12, 18)
				task.delay(5.8, function()
					if dialogueFrame and dialogueFrame.Parent and dialogueSerial == serial then
						dialogueFrame.Visible = false
					end
				end)
			end
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

	-- [탐험 전투 조작] 공격·회피 두 버튼만 표시한다. 강타는 주인공 기본 공격 5회 명중마다 자동 발동한다.
	local UserInputService = game:GetService("UserInputService")
	-- [모바일 3버튼] 승인 원형 원화를 유지하면서 공격·회피·무기교체 반원 간격을 확보한다.
	-- 파티 HUD와 분리하고 짧은 가로화면은 버튼 크기를 줄여 화면 아래에 안전하게 넣는다.
	local attackBtn = btn(gui, "", Color3.fromRGB(177, 57, 43),
		UDim2.fromOffset(if compactTouch then 104 elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 then 104
			elseif visualMobile then 116 else 112,
			if compactTouch then 104 elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 then 104
			elseif visualMobile then 116 else 112),
		UDim2.new(1, if compactTouch then -76
			elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 and workspace.CurrentCamera.ViewportSize.X < 650 then -76
			elseif visualMobile then -95 else -88,
			1, if compactTouch then -85 elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 then -70
				elseif visualMobile then -88 else -88), Vector2.new(0.5, 0.5))
	attackBtn.Name = "FieldAttack"
	attackBtn:SetAttribute("SkillFullName", "일반 공격")
	attackBtn:SetAttribute("TouchPriority", "ATTACK")
	attackBtn.Text = ""
	attackBtn.TextSize = 19
	attackBtn.AutoButtonColor = false -- 기본 회색 호버 대신 전용 금속 눌림/광택 연출
	attackBtn:FindFirstChildOfClass("UICorner").CornerRadius = UDim.new(1, 0)
	local attackIcon = if AssetIds["Menu/field_attack"] then addIcon(attackBtn, "Menu/field_attack")
		else addIcon(attackBtn, "Menu/cc0_sword")
	-- [공격 메달 한정 스타일] 임시 지역변수를 전투 본문에 남기지 않아 Luau 레지스터 예산을 보호한다.
	do
	local attackRim = attackBtn:FindFirstChildOfClass("UIStroke")
	attackRim.Color = Color3.fromRGB(255, 192, 112)
	attackRim.Thickness = if visualMobile then 4 else 3
	attackRim.Transparency = 0.04
	-- [기존 승인 아이콘 유지] 메달 내부의 아이콘/이중 링/텍스트를 시각 계층으로 분리한다.
	local innerMedal = attackBtn:FindFirstChild("FieldIconMedallion")
	if innerMedal then
		innerMedal.Size = UDim2.fromScale(0.86, 0.86)
		innerMedal.BackgroundTransparency = 0.08
		innerMedal.BackgroundColor3 = Color3.fromRGB(78, 29, 30)
		local gleam = Instance.new("UIGradient")
		gleam.Rotation = 115
		gleam.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(139, 63, 50)),
			ColorSequenceKeypoint.new(0.46, Color3.fromRGB(87, 30, 31)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(42, 17, 28)),
		})
		gleam.Parent = innerMedal
		local medalRim = innerMedal:FindFirstChild("FieldIconRim")
		if medalRim then
			medalRim.Thickness = 2.8
			medalRim.Color = Color3.fromRGB(255, 215, 144)
		end
	end
	if attackIcon and attackBtn:GetAttribute("IconArtKey") ~= "Menu/field_attack" then
		attackIcon.Size = UDim2.fromScale(0.67, 0.67)
		attackIcon.Position = UDim2.fromScale(0.5, 0.42)
		attackIcon.ImageColor3 = Color3.fromRGB(255, 242, 218)
	end
	local attackCaption = label(attackBtn, "공격", if visualMobile then 17 else 16, Color3.fromRGB(255, 235, 189))
	attackCaption.Name = "FieldAttackCaption"
	attackCaption.Visible = attackBtn:GetAttribute("IconArtKey") ~= "Menu/field_attack"
	attackCaption.Font = Enum.Font.GothamBlack
	attackCaption.AnchorPoint = Vector2.new(0.5, 0.5)
	attackCaption.Position = UDim2.fromScale(0.5, 0.78)
	attackCaption.Size = UDim2.fromScale(0.72, 0.19)
	attackCaption.TextStrokeTransparency = 0.12
	attackCaption.ZIndex = attackBtn.ZIndex + 6
	-- [터치 피드백] 공격 1회마다 즉시 번쩍이는 이너 링. 공격 판정 및 추가 피해 없음.
	local attackPulse = Instance.new("Frame")
	attackPulse.Name = "FieldAttackPulse"
	attackPulse.AnchorPoint = Vector2.new(0.5, 0.5)
	attackPulse.Position = UDim2.fromScale(0.5, 0.5)
	attackPulse.Size = UDim2.fromScale(0.65, 0.65)
	attackPulse.BackgroundTransparency = 1
	attackPulse.ZIndex = attackBtn.ZIndex + 7
	attackPulse.Active = false
	attackPulse.Parent = attackBtn
	Instance.new("UICorner", attackPulse).CornerRadius = UDim.new(1, 0)
	local pulseRim = Instance.new("UIStroke")
	pulseRim.Name = "FieldAttackPulseRim"
	pulseRim.Color = Color3.fromRGB(255, 231, 160)
	pulseRim.Thickness = 2.4
	pulseRim.Transparency = 1
	pulseRim.Parent = attackPulse
	end
	-- [무기 숙련] 공격 버튼 둘레에 10단계를 표시한다. 기존 경험치 저장 키를 유지한다.
	local autoHitPips = {}
	for i = 1, 10 do
		local pip = Instance.new("Frame")
		pip.Name = "FieldAutoHit" .. i
		pip.AnchorPoint = Vector2.new(0.5, 0.5)
		local angle = math.rad(205 + (i - 1) * 15)
		pip.Position = UDim2.fromScale(0.5 + 0.445 * math.cos(angle), 0.5 + 0.445 * math.sin(angle))
		pip.Size = UDim2.fromOffset(if visualMobile then 8 else 7, if visualMobile then 8 else 7)
		pip.BorderSizePixel = 0
		pip.ZIndex = attackBtn.ZIndex + 5
		pip.Parent = attackBtn
		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(1, 0)
		corner.Parent = pip
		autoHitPips[i] = pip
	end
	local function refreshAutoHitPips()
		-- [숙련 표시] 10칸 = 무기 숙련 1~10단(채운 칸 = 지금 단계). 스킬 자동 발동은 2단부터 확률.
		local charged = math.clamp(pl.masteryRank or 1, 1, 10)
		for i, pip in autoHitPips do
			pip.BackgroundColor3 = if i <= charged then Color3.fromRGB(255, 233, 151) else Color3.fromRGB(91, 45, 35)
			pip.BackgroundTransparency = if i <= charged then 0 else 0.15
			pip:SetAttribute("Charged", i <= charged)
		end
		attackBtn:SetAttribute("AutoHeavyHits", charged)
	end
	refreshAutoHitPips()
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
	-- [지상 연속 타격] 모션 시간은 멈추지 않는다. 강타 손맛은 기존 넉백·카메라·효과음으로 남긴다.
	local swingCombo, slashIdx = nil, 0
	-- [연타 관절 연결] 한 공격이 끝나기 전에 다음 시각 모션을 시작할 때 R15 실제 마지막 자세를 이어 붙인다.
	-- 신규 애니메이션 트랙/이동 판정 없이 기존 캐논 관절만 보간한다. 최근 프레임 포즈는 테이블을 재사용한다.
	local swingBridge = { last = {}, lastAt = -100, from = nil, rootLast = nil, rootFrom = nil, at = 0, duration = 0, basicBeat = 0, basicAt = -100, impactSeq = -1, lungeTween = nil, pendingBasicBeat = nil, pendingBasicScheduled = false }
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
	weaponRankLabel.Position = UDim2.new(1, -78, 1, -28)
	weaponRankLabel.Size = UDim2.fromOffset(114, 22)
	weaponRankLabel.Font = Enum.Font.GothamBlack
	weaponRankLabel.TextStrokeTransparency = 0.16
	weaponRankLabel.ZIndex = attackBtn.ZIndex + 3
	do -- [Luau 지역변수 한도] 시작 숙련 표시값 초기화 지역화
		local initialPractice = weaponPractice[wpn.id]
		pl.masteryRank = initialPractice and initialPractice.rank or 1
		refreshAutoHitPips()
		weaponRankLabel.Text = string.format("무기 숙련 %d단", initialPractice and initialPractice.rank or 1)
		attackBtn:SetAttribute("WeaponMasteryRank", initialPractice and initialPractice.rank or 1)
		attackBtn:SetAttribute("WeaponMasteryExperience", initialPractice and initialPractice.xp or 0)
	end
	-- [무기 교체] 기존 장비를 첫 번째 슬롯으로 보존하고, 다른 전투 거리의 무기 1개만 빠르게 교체한다.
	local reserveWeapon = Weapons.get(opts.reserveWeapon or (if wpn.ranged then "sword" else "bow"))
	-- [무기 교체가 같아 보이는 문제] 잘못된 보조 ID가 주 무기와 같으면 기존 기본 반대 병과를 사용한다.
	if reserveWeapon.id == wpn.id then
		reserveWeapon = Weapons.get(if wpn.ranged then "sword" else "bow")
	end
	-- [공격 원화 정본] 초기 장비별 아이콘은 승인된 완성형 PNG가 없을 때만 지정한다.
	-- 무기 정보·교체·전투 판정은 그대로 두고 완성형 공격 원화를 덮어쓰지 않는다.
	if attackIcon and attackBtn:GetAttribute("IconArtKey") ~= "Menu/field_attack" then
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
		local nextStage = math.clamp(math.floor(stage or 1), 1, 10)
		-- [평타 연타] 0.14초 접촉 전 다시 누르면 이전 검격을 끊지 않고 최신 입력 자세만 예약한다.
		-- 기존 명중 예약·피해·무기 쿨타임은 useMove에서 이미 처리했으므로 시각 모션만 정렬한다.
		if kind == "slash" and not visualOnly and swingKind == "slash" and os.clock() - swingT0 < 0.14 then
			swingBridge.pendingBasicBeat = nextStage
			swingBridge.pendingBasicSerial = chainMotionSerial
			swingBridge.pendingBasicWeapon = wpn.id
			if not swingBridge.pendingBasicScheduled then
				swingBridge.pendingBasicScheduled = true
				task.delay(math.max(0.01, swingT0 + 0.14 - os.clock()), function()
					swingBridge.pendingBasicScheduled = false
					local beat = swingBridge.pendingBasicBeat
					swingBridge.pendingBasicBeat = nil
					if not finished and beat and swingBridge.pendingBasicSerial == chainMotionSerial
						and swingBridge.pendingBasicWeapon == wpn.id and char3() then
						startSwing("slash", dur, beat)
					end
				end)
			end
			return
		elseif kind ~= "slash" or visualOnly then
			swingBridge.pendingBasicBeat = nil
		end
		-- [연타·회피 관절 연결] 공격 → 회피 → 다음 공격까지 최근 전신 자세를 이어 불연속 회전을 막는다.
		if FM and (kind == "dash" or nextStage >= 2 or kind == "slash" or kind == "heavy") and os.clock() - swingBridge.lastAt <= 0.32 and next(swingBridge.last) then
			swingBridge.from = table.clone(swingBridge.last)
			-- [쓰시마식 연계] 이전 검무의 골반과 전신 회전까지 다음 타의 첫 자세로 이어 준다.
			swingBridge.rootFrom = swingBridge.rootLast
			swingBridge.at = os.clock()
			swingBridge.duration = if kind == "dash" then 0.065
				elseif wpn.family == "dagger" or wpn.family == "fist" then 0.070
				elseif wpn.family == "axe" or wpn.family == "blunt" then 0.11
				elseif wpn.ranged then 0.085 else 0.09
		else
			swingBridge.from = nil
			swingBridge.rootFrom = nil
		end
		-- [무기별 공격음] 각 승인 오디오의 원본을 사용한다.
		-- 준비/휘두름은 여기서, 투사체 발포는 실제 공격 판정 시 한 번만 재생해 저음이 겹치지 않는다.
		if wpn.ranged and (kind == "slash" or kind == "heavy" or kind == "spin") then
			-- [영화식 속사] 첫 발은 기존 준비음, 이어지는 2·3발은 장전/노리쇠가 아닌 실제 격발음.
			-- 숙련에서 따라 나오는 2·3발은 시각 연출이며 피해 판정은 앞선 한 번만 수행한다.
			if nextStage >= 2 then
				-- [실제 연속 평타] 발포음은 원래 공격판정에서 1회. 숙련 시각 연타만 독립 격발음.
				if visualOnly then
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
				end
			elseif wpn.motion == "CROSSBOW" then
				sfx("sfx_card_chain", 0.16, 1.68)
			elseif wpn.family == "bow" then
				sfx("sfx_rope_pull", 0.25, if wpn.motion == "LONGBOW" then 1.05 else 1.32)
			elseif wpn.motion == "RIFLE" then
				sfx("sfx_card_chain", 0.17, 1.42)
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
			-- [고속 연출만 고정] 회피는 모든 무기에서 0.4초, 2~10타 전신 곡예는 최대 0.44초로 압축.
			-- 실제 쿨타임·공격 주기·피해·스킬 시계는 useMove/ActionCombat 원본 그대로.
			if kind == "dash" then
				dur = 0.4
			elseif kind == "slash" and beat >= 2 then
				dur = math.clamp(dur, 0.33, 0.44)
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
			-- [무인] 어깨를 감싼 전투 구르기: 무기를 몸에 붙이고 전방으로 굴렀다가 한쪽 무릎으로 착지.
			warrior = {
				Spine = A(0.66, 0.15, -0.32), Chest = A(0.54, -0.25, 0.22), Head = A(-0.44, -0.12, 0.12),
				UpperArmL = A(-1.20, 0.12, -0.38), UpperArmR = A(-1.36, -0.16, 0.48),
				ForearmL = A(-0.75, 0, 0), ForearmR = A(-0.84, 0, 0),
				ThighL = A(-1.18, 0, -0.32), ThighR = A(0.78, 0, 0.18),
				ShinL = A(1.30, 0, 0), ShinR = A(-0.42, 0, 0),
				FootL = A(0.48, 0, 0), FootR = A(-0.24, 0, 0),
			},
			-- [포수] 낮은 측면 슬라이딩: 왼팔로 무기를 고정하고 오른 무릎을 접어 조준선을 보존.
			gunner = {
				Spine = A(0.58, 0.28, -0.24), Chest = A(0.38, -0.34, 0.32), Head = A(-0.32, 0.18, -0.14),
				UpperArmL = A(-1.36, 0.12, -0.48), UpperArmR = A(-1.58, -0.10, 0.34),
				ForearmL = A(-0.88, 0, 0), ForearmR = A(-0.72, 0, 0),
				HandR = A(-0.22, 0, 0), ThighL = A(-1.34, 0, -0.28), ThighR = A(0.50, 0, 0.28),
				ShinL = A(1.44, 0, 0), ShinR = A(-0.68, 0, 0),
				FootL = A(0.56, 0, 0), FootR = A(-0.24, 0, 0),
			},
			-- [성직자] 보호 기도를 펼치며 빛 속으로 측면 도약. 회피 효과는 실제 보호막/회복을 생성하지 않는다.
			clergy = {
				Spine = A(-0.35, 0.38, 0.36), Chest = A(-0.48, -0.35, -0.36), Head = A(0.22, 0.20, 0),
				UpperArmL = A(-1.72, -0.25, -1.18), UpperArmR = A(-1.75, 0.25, 1.18),
				ForearmL = A(-0.78, 0, 0), ForearmR = A(-0.78, 0, 0),
				HandL = A(-0.36, 0, -0.35), HandR = A(-0.36, 0, 0.35),
				ThighL = A(-1.08, 0, -0.40), ThighR = A(0.84, 0, 0.40),
				ShinL = A(1.08, 0, 0), ShinR = A(-0.38, 0, 0),
				FootL = A(0.55, -0.12, 0), FootR = A(-0.25, 0.12, 0),
			},
			-- [의사] 수술 도구를 보호하는 낮은 측면 스텝, 팔꿈치로 몸을 가리며 빠르게 재정렬.
			doctor = {
				Spine = A(0.46, -0.25, -0.15), Chest = A(0.32, 0.30, 0.20), Head = A(-0.33, -0.12, 0.10),
				UpperArmL = A(-1.26, -0.10, -0.72), UpperArmR = A(-0.90, 0.20, 0.45),
				ForearmL = A(-1.28, 0, 0), ForearmR = A(-0.56, 0, 0),
				HandL = A(-0.36, 0, 0.10), ThighL = A(-1.16, 0, -0.24), ThighR = A(0.61, 0, 0.28),
				ShinL = A(1.12, 0, 0), ShinR = A(-0.34, 0, 0),
				FootL = A(0.42, 0, 0), FootR = A(-0.31, 0, 0),
			},
			-- [항해사] 양팔을 몸에 붙이고 공중에서 완전히 한 바퀴 도는 선원식 전방 공중제비.
			navigator = {
				Spine = A(0.92, 0.12, 0), Chest = A(0.70, -0.12, 0.05), Head = A(-0.57, 0, 0),
				UpperArmL = A(1.26, 0.06, -0.22), UpperArmR = A(1.26, -0.06, 0.22),
				ForearmL = A(-0.50, 0, 0), ForearmR = A(-0.50, 0, 0),
				ThighL = A(-1.46, 0, -0.13), ThighR = A(-1.46, 0, 0.13),
				ShinL = A(1.60, 0, 0), ShinR = A(1.60, 0, 0),
				FootL = A(-0.38, 0, 0), FootR = A(-0.38, 0, 0),
			},
			-- [상인] 한쪽 팔로 소지품을 지키면서 몸을 돌려 비껴가는 재빠른 반회전.
			merchant = {
				Spine = A(0.36, 0.52, 0.18), Chest = A(0.12, -0.54, -0.24), Head = A(-0.16, 0.36, 0),
				UpperArmL = A(-1.28, -0.15, -0.52), UpperArmR = A(-0.88, 0.26, 0.62),
				ForearmL = A(-1.20, 0, 0), ForearmR = A(-0.65, 0, 0),
				HandL = A(-0.30, 0, 0), ThighL = A(-0.95, 0, -0.34), ThighR = A(0.58, 0, 0.27),
				ShinL = A(0.94, 0, 0), ShinR = A(-0.40, 0, 0),
				FootL = A(0.34, 0, -0.15), FootR = A(-0.22, 0, 0.20),
			},
			-- [학자] 지식의 문양을 여는 양손 비틀림과 반대 방향 도약, 낮은 착지.
			scholar = {
				Spine = A(0.72, -0.62, -0.40), Chest = A(0.66, 0.52, 0.38), Head = A(-0.47, 0.35, 0),
				UpperArmL = A(-1.85, -0.35, -0.74), UpperArmR = A(-1.25, 0.44, 0.82),
				ForearmL = A(-1.24, 0, -0.20), ForearmR = A(-0.82, 0, 0.12),
				HandL = A(-0.38, 0, -0.32), HandR = A(0.26, 0, 0.24),
				ThighL = A(-1.36, 0, -0.42), ThighR = A(0.92, 0, 0.38),
				ShinL = A(1.38, 0, 0), ShinR = A(-0.54, 0, 0),
				FootL = A(0.60, 0, -0.10), FootR = A(-0.42, 0, 0.17),
			},
		}
		-- 몸 전체 움직임(마력숲처럼): 베기는 앞으로 숙이며 파고들고, 강타는 뛰어올라 내리찍고, 회전베기는 낮게 두 바퀴, 회피는 앞구르기
		local function bell(x: number): number return math.sin(math.clamp(x, 0, 1) * math.pi) end
		local function rootFor(kind: string, p: number): CFrame?
			if kind == "slash" then
				-- [원거리 사격 자세] 실제 사격은 몸을 앞으로 날리지 않고 발을 고정한 채 견착·반동만 준다.
				if wpn.ranged then
					-- [촬영식 3컷 전신 동선] 1타 조준/짧은 반동 → 2타 측면 발 디딤 → 3타 낮은 회전 사격.
					-- 실제 캐릭터의 서버 좌표나 사거리 변경 없이 R15 RootJoint의 시각 이동만 사용한다.
					local kick = bell(p)
					local release = math.sin(math.clamp((p - 0.18) / 0.64, 0, 1) * math.pi)
					local bow = wpn.family == "bow"
					local crossbow = wpn.motion == "CROSSBOW"
					local longGun = wpn.motion == "RIFLE"
					if slashIdx >= 4 then
						-- [원거리 4~10타] 교차사격→측면 선회→낮은 역회전→도약→10타 마무리.
						local phase = slashIdx - 3
						local side = if phase % 2 == 0 then 1 else -1
						local finale = if slashIdx == 10 then 1 else 0
						local spread = if bow then 0.93 elseif crossbow then 0.68 elseif longGun then 0.57 else 1.05
						local orbit = (0.45 + phase * 0.11 + finale * 0.40) * kick
						-- [활·권총 공중 연사] 낮은 측면 슬라이드→공중 옆돌기→역방향 발구름→높은 백덤블링.
						-- 석궁·장총은 견착과 무게를 유지하는 슬라이드·피벗 중심. 실제 사거리·탄환·피해는 불변.
						local agile = not crossbow and not longGun
						local rollP = math.clamp((p - 0.08) / 0.75, 0, 1)
						local roll = rollP * rollP * (3 - 2 * rollP) * math.pi * 2
						local catch = math.sin(math.clamp((p - 0.64) / 0.36, 0, 1) * math.pi)
						if slashIdx == 5 then
							return CFrame.new(side * spread * 1.42 * kick, -0.82 * kick + 0.13 * catch, -0.44 * release)
								* CFrame.Angles(0.28 * kick, -side * 0.68 * kick, side * 0.21 * kick)
						elseif slashIdx == 6 and agile then
							return CFrame.new(side * 0.92 * kick, 1.58 * kick - 0.19 * catch, -0.24 * release)
								* CFrame.Angles(-0.19 * kick, side * 0.18 * kick, side * roll)
						elseif slashIdx == 7 then
							return CFrame.new(-side * spread * 1.67 * kick, -0.96 * kick + 0.16 * catch, -0.32 * release)
								* CFrame.Angles(0.34 * kick, side * 0.76 * kick, -side * 0.24 * kick)
						elseif slashIdx == 8 then
							return CFrame.new(side * spread * 0.68 * kick, (if agile then 2.28 else 0.85) * kick - 0.17 * catch, -0.18 * release)
								* CFrame.Angles(if agile then roll else -0.19 * kick, -side * 0.24 * kick, side * 0.16 * kick)
						elseif slashIdx == 9 and agile then
							return CFrame.new(side * spread * 1.12 * kick, 2.16 * kick - 0.20 * catch, -0.22 * release)
								* CFrame.Angles(-0.17 * kick, side * 0.22 * kick, -side * roll)
						end
						-- [원거리 시네마틱 10박] 활·권총은 마지막에 완전 회전 후 목표선으로 복귀, 석궁·장총은 견착 유지.
						local eased = p * p * (3 - 2 * p)
						local landing = math.sin(math.clamp((p - 0.62) / 0.38, 0, 1) * math.pi)
						local yaw = if finale == 1 and not (crossbow or longGun) then -side * eased * math.pi * 2
							else -side * (0.52 + phase * 0.095 + finale * 0.45) * kick
						return CFrame.new(side * spread * orbit, (if phase % 3 == 0 then 0.30 else -0.28) * kick + finale * 0.35 * kick - 0.18 * landing, -0.20 * release)
							* CFrame.Angles((if finale == 1 then -0.48 else 0.22) * kick + 0.13 * landing,
								yaw, side * (0.31 * kick - 0.11 * landing))
					elseif slashIdx == 2 then
						-- 두 번째 발: 발을 옆으로 밟으며 시선을 목표에 고정하고 총구/활만 방향을 꺾는다.
						local sidestep = if bow then 0.76 elseif crossbow then 0.52 elseif longGun then 0.43 else 0.92
						local twist = if bow then 0.73 elseif crossbow then 0.48 elseif longGun then 0.40 else 0.89
						return CFrame.new(-sidestep * kick, -(if longGun then 0.24 else 0.34) * kick, -0.12 * release)
							* CFrame.Angles(-0.22 * kick + (if longGun then 0.17 else 0.07) * release,
								twist * kick, -(if crossbow then 0.17 else 0.30) * kick)
					elseif slashIdx == 3 then
						-- 세 번째 발: 재장전 없이 빠른 낮은 자세로 역회전, 팔·어깨 반동 후 화면 중심 복귀.
						local slide = if bow then 0.66 elseif crossbow then 0.57 elseif longGun then 0.47 else 0.90
						local crouch = if bow then 0.66 elseif crossbow then 0.44 elseif longGun then 0.58 else 0.82
						return CFrame.new(slide * kick, -crouch * kick, -0.18 * release)
							* CFrame.Angles(0.38 * kick + 0.13 * release,
								-(if longGun then 0.52 elseif crossbow then 0.58 else 0.82) * kick, 0.34 * kick)
					end
					-- 첫 발도 무기마다 실루엣을 달리한다: 활 당김·석궁 수평 지지·장총 견착·권총 한손 스냅.
					if bow then return CFrame.new(-0.10 * kick, -0.18 * kick, 0) * CFrame.Angles(-0.10 * kick, 0.19 * kick, -0.08 * kick) end
					if crossbow then return CFrame.new(0, -0.20 * kick, 0) * CFrame.Angles(0.07 * release, -0.10 * kick, 0) end
					if longGun then return CFrame.new(0, -0.29 * kick, 0) * CFrame.Angles(0.20 * release, -0.12 * kick, 0) end
					return CFrame.new(0.12 * kick, -0.15 * kick, 0) * CFrame.Angles(0.15 * release, -0.24 * kick, 0.11 * kick)
				end
				-- 일반 공격: 몸을 크게 비틀며 한 걸음 내딛고 벤다(좌우 번갈아)
				-- [근접 10박자 무기별 전신] 연속 디딤발, 골반, 척추와 무기 회전으로 무용처럼 연결.
				-- 공격 피해·실제 이동·서버 충돌 판정은 원본 전투 함수만 소유한다.
				local beat = bell(p)
				local thrust = bell((p - 0.08) / 0.78)
				local side = if slashIdx % 2 == 0 then 1 else -1
				local swift = wpn.family == "dagger" or wpn.family == "fist"
				local longReach = wpn.family == "spear"
				local heavy = wpn.family == "axe" or wpn.family == "blunt"
				local finale = slashIdx == 10
				local lateral = (0.16 + (slashIdx % 5) * 0.15) * (if swift then 1.24 else 1)
				local dip = if swift then 0.52 elseif longReach then 0.29 elseif heavy then 0.42 else 0.34
				local forward = if longReach then 1.20 elseif heavy then 0.65 else 0.96
				local rotation = (if finale then 1.95 elseif slashIdx % 3 == 0 then 1.1 else 0.50 + slashIdx * 0.055)
				local leap = if finale then (if swift then 0.62 elseif heavy then 0.20 else 0.40) else 0
				-- [전투 무용 4~9박] 옆구르기·한손 짚기·백덤블링·슬라이딩·높은 선회·측면 공중회전.
				-- 중량 무기는 무게 중심을 지키는 피벗 위주, 모든 동작은 기존 타격/이동과 분리된 시각 전용.
				local spinPhase = math.clamp((p - 0.08) / 0.75, 0, 1)
				local spin = spinPhase * spinPhase * (3 - 2 * spinPhase) * math.pi * 2
				local settle = math.sin(math.clamp((p - 0.63) / 0.37, 0, 1) * math.pi)
				-- [쓰시마 1·2·3단] 선발 체중 이동 → 반대발 사선 베기 → 낮은 선회 역베기.
				-- 모든 루트 이동은 R15 시각 포즈만 다루며 실제 명중·사거리·좌표는 기존 전투가 담당한다.
				local plant = math.sin(math.clamp(p / 0.48, 0, 1) * math.pi)
				local release = math.sin(math.clamp((p - 0.12) / 0.65, 0, 1) * math.pi)
				if slashIdx == 1 then
					return CFrame.new(-side * lateral * 0.32 * plant, -0.22 * plant, -forward * 0.64 * release)
						* CFrame.Angles(-0.16 * plant - 0.10 * release, -side * (if longReach then 0.20 else 0.32) * plant, -side * 0.10 * release)
				elseif slashIdx == 2 then
					return CFrame.new(side * lateral * 1.18 * beat, -0.38 * plant, -forward * 0.47 * release)
						* CFrame.Angles(-0.20 * plant + 0.11 * settle, side * 0.65 * beat, side * 0.21 * plant)
				elseif slashIdx == 3 then
					return CFrame.new(-side * lateral * 1.25 * beat, -(if swift then 0.67 else 0.50) * beat, -forward * 0.35 * release)
						* CFrame.Angles(0.38 * beat - 0.12 * settle, -side * 1.12 * beat, -side * 0.29 * beat)
				elseif slashIdx == 4 then
					return CFrame.new(side * lateral * 1.6 * beat, -(if heavy then 0.65 else 0.95) * beat + 0.12 * settle, -forward * 0.45 * thrust)
						* CFrame.Angles(-0.23 * beat, side * 0.22 * beat, if heavy then -side * 1.45 * beat else -side * spin)
				elseif slashIdx == 5 and swift then
					return CFrame.new(side * 0.87 * beat, -0.34 * beat + 0.68 * bell((p - 0.12) / 0.70), -0.26 * thrust)
						* CFrame.Angles(0.13 * beat, side * 0.22 * beat, side * spin)
				elseif slashIdx == 5 then
					-- [5단 축발 선회] 검·창은 반회전, 도끼·철퇴는 뒷발로 눌러 묵직하게 궤도 전환.
					return CFrame.new(side * lateral * 0.86 * beat, -(if heavy then 0.40 else 0.28) * beat, -0.23 * thrust)
						* CFrame.Angles(-0.22 * beat, side * (if heavy then 1.10 else 1.62) * beat, -side * 0.24 * beat)
				elseif slashIdx == 6 and not heavy then
					return CFrame.new(-side * 0.28 * beat, 2.15 * beat - 0.18 * settle, -0.37 * thrust)
						* CFrame.Angles(spin, side * 0.16 * beat, 0)
				elseif slashIdx == 6 then
					-- [6단 중량 차별화] 백덤블링 대신 두 손 내려찍기 전신 감아올리기.
					return CFrame.new(-side * 0.35 * beat, -0.60 * beat + 0.15 * settle, -0.31 * thrust)
						* CFrame.Angles(-0.44 * beat, side * 0.95 * beat, side * 0.16 * beat)
				elseif slashIdx == 7 then
					return CFrame.new(side * 1.12 * beat, -0.97 * beat + 0.12 * settle, -forward * 0.64 * thrust)
						* CFrame.Angles(0.34 * beat, -side * 0.82 * beat, side * 0.24 * beat)
				elseif slashIdx == 8 then
					return CFrame.new(side * 0.52 * beat, (if heavy then 1.55 else 2.82) * beat - 0.18 * settle, -0.25 * thrust)
						* CFrame.Angles(-0.28 * beat, side * spin, side * 0.14 * beat)
				elseif slashIdx == 9 and not heavy then
					return CFrame.new(side * 1.18 * beat, 1.91 * beat - 0.23 * settle, -forward * 0.28 * thrust)
						* CFrame.Angles(0.12 * beat, side * 0.24 * beat, -side * spin)
				elseif slashIdx == 9 then
					-- [9단 반대축] 중량 무기도 크게 역디딤해 10단 마무리로 관성을 넘긴다.
					return CFrame.new(side * lateral * 1.36 * beat, -0.64 * beat + 0.13 * settle, -0.30 * thrust)
						* CFrame.Angles(0.24 * beat, -side * 1.24 * beat, side * 0.27 * beat)
				end
				-- [검무 10박 마무리] 빠른 무기는 부드러운 전신 회전 후 전방 복귀, 중량 무기는 묵직한 반회전과 착지.
				local eased = p * p * (3 - 2 * p)
				local finishTurn = if finale and not heavy then side * eased * math.pi * 2 else side * rotation * beat
				local heelLand = if finale then math.sin(math.clamp((p - 0.60) / 0.40, 0, 1) * math.pi) else 0
				return CFrame.new(side * lateral * beat, (leap - dip) * beat - 0.16 * heelLand, -forward * thrust)
					* CFrame.Angles((if finale then -0.56 else -0.30) * beat + 0.18 * heelLand, finishTurn, -side * 0.26 * beat + side * 0.10 * heelLand)
			elseif kind == "heavy" then
				if wpn.ranged then return CFrame.new(0, -0.12 * bell(p), 0) * CFrame.Angles(0.10 * bell(p), 0, 0) end
				-- [숙련 3타] 3타는 시각 보조 동작이므로 공중으로 뛰지 않고, 발을 디디며 무게만 싣는다.
				if slashIdx >= 2 then
					local side = if slashIdx % 2 == 0 then 1 else -1
					return CFrame.new(0, -0.25 * bell(p), 0) * CFrame.Angles(0.30 * bell(p), side * 0.20 * bell(p), 0)
				end
				-- [무기별 강타 자세] 피해·사거리·기력은 그대로, R15 관절 자세만 변화한다.
				local beat = bell(p)
				if wpn.family == "dagger" then
					-- 단검 급습: 체중을 낮추고 교차 찌르기
					return CFrame.new(0, -0.34 * beat, -0.75 * beat)
						* CFrame.Angles(-0.48 * beat, 0.38 * beat, -0.16 * beat)
				elseif wpn.family == "spear" then
					-- 창 관통: 전방으로 길게 찌르기
					return CFrame.new(0, -0.25 * beat, -0.65 * beat)
						* CFrame.Angles(-0.24 * beat, 0.12 * beat, 0)
				elseif wpn.family == "fist" then
					-- 맨손 훅: 낮게 중심을 틀어 회전
					return CFrame.new(0, -0.27 * beat, 0)
						* CFrame.Angles(-0.20 * beat, -0.52 * beat, 0.24 * beat)
				end
				-- 도끼 분쇄·철퇴 충격·검 강타는 기존 도약 내려찍기를 유지한다.
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
				-- [0.4초 댄스 회피 6종] 옆구르기·백덤블링·높은 점프·슬라이딩·한손 짚기·측면 공중회전.
				-- R15 시각 RootJoint만 사용하며 실제 14스터드 이동·무적·공격 수치는 보존한다.
				local ch = player.Character
				local style = ch and ch:GetAttribute("FieldDodgeStyle") or "warrior"
				local side = ch and ch:GetAttribute("FieldDodgeBeat") or 1
				local trick = ch and ch:GetAttribute("FieldDodgeTrick") or 1
				local press = bell(p)
				-- [빠른 자연스러운 회전] 준비 0.08초, 회전 종료 0.33초, 남은 시간은 착지·회수.
				local t = math.clamp((p - 0.08) / 0.75, 0, 1)
				local spin = t * t * (3 - 2 * t) * math.pi * 2
				local turn = math.sin(math.clamp((p - 0.08) / 0.84, 0, 1) * math.pi)
				local land = math.sin(math.clamp((p - 0.64) / 0.36, 0, 1) * math.pi)
				local lift = if style == "navigator" or style == "clergy" then 1.18 elseif style == "gunner" or style == "doctor" then 0.92 else 1
				local span = if style == "scholar" or style == "merchant" then 1.18 else 1
				if trick == 1 then
					-- [옆구르기] 어깨부터 바닥을 감싸듯 말고 발끝으로 착지.
					return CFrame.new(side * 1.18 * span * press, -1.12 * press + 0.16 * land, -0.34 * press)
						* CFrame.Angles(-0.22 * press, side * 0.16 * turn, -side * spin)
				elseif trick == 2 then
					-- [백덤블링] 무릎을 접어 뒤로 한 바퀴 회전.
					return CFrame.new(-side * 0.22 * press, 2.38 * lift * press - 0.26 * land, 0.32 * press)
						* CFrame.Angles(spin, side * 0.14 * turn, 0)
				elseif trick == 3 then
					-- [높은 점프] 공중 피루엣, 가볍게 접지.
					return CFrame.new(side * 0.60 * span * press, 3.35 * lift * press - 0.28 * land, -0.43 * press)
						* CFrame.Angles(-0.36 * press, side * spin, side * 0.20 * turn)
				elseif trick == 4 then
					-- [슬라이딩] 몸을 낮게 미끄러뜨린 뒤 축발로 일어서기.
					return CFrame.new(side * 1.72 * span * press, -1.25 * press + 0.17 * land, -0.72 * press)
						* CFrame.Angles(0.34 * press, -side * 0.78 * turn, side * 0.23 * press)
				elseif trick == 5 then
					-- [한손 짚고 돌기] 한 팔을 축으로 카트휠, 골반·발끝 회수.
					return CFrame.new(side * 1.04 * span * press, -0.43 * press + 0.58 * lift * math.sin(math.clamp((p - 0.16) / 0.65, 0, 1) * math.pi), -0.18 * press)
						* CFrame.Angles(-0.16 * press, side * 0.24 * turn, side * spin)
				else
					-- [측면 공중회전] 손을 짚지 않고 옆으로 한 바퀴.
					return CFrame.new(side * 1.32 * span * press, 2.10 * lift * press - 0.22 * land, -0.24 * press)
						* CFrame.Angles(0.15 * press, side * 0.37 * turn, -side * spin)
				end
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
				-- [캐릭터 재생성] 이전 리그의 자세를 새 R15 관절로 넘기지 않는다.
				swingBridge.from, swingBridge.rootFrom, swingBridge.rootLast = nil, nil, nil
				table.clear(swingBridge.last)
				swingBridge.lastAt = -100
				pfm, pfmChar = FM.new(ch, true), ch
			end
			local canon = pfm.canon
			table.clear(canon)
			local rootRot = nil
			if swingKind then
				local p = (os.clock() - swingT0) / swingDur
				if p >= 1 then
					swingKind = nil
				elseif swingCombo then
					-- [1~10타 실타격 동기화] 빠른 일반 공격 모두 기존 0.14초 명중 시각에 원본 CONTACT 자세를 맞춘다.
					-- [연타 자연 복귀] 원본 fadeDuration까지 샘플링해서 마지막 프레임이 갑자기 초기 자세로 끊기지 않도록 한다.
					-- 실제 명중시각 0.14초는 고정, 마지막 22%는 무기 가드로 자연스럽게 풀어준다.
					local returnStart = 0.78
					local sampledAt
					if p >= returnStart then
						sampledAt = swingCombo.duration + (p - returnStart) / (1 - returnStart) * swingCombo.fadeDuration
					else
						local progress = p / returnStart
						if swingKind == "slash" then
							local contact = math.clamp(swingCombo.steps[1].contact / swingCombo.duration, 0.1, 0.85)
							local impact = math.clamp(0.14 / swingDur, 0.15, 0.65)
							progress = if p < impact then p / impact * contact
								else contact + (p - impact) / (returnStart - impact) * (1 - contact)
						end
						sampledAt = math.clamp(progress, 0, 1) * swingCombo.duration
					end
					FM.sample(swingCombo, sampledAt, canon)
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
					-- [직업별 회피 4박자] 예비 힘 저장 → 공중/슬라이드 → 접지 → 무기·시선 복귀. 피격·이동 권한은 변경하지 않는다.
					if swingKind == "dash" then
						local style = ch:GetAttribute("FieldDodgeStyle") or "warrior"
						local side = ch:GetAttribute("FieldDodgeBeat") or 1
						local trick = ch:GetAttribute("FieldDodgeTrick") or 1
						local peak = math.sin(p * math.pi)
						local land = math.sin(math.clamp((p - 0.5) / 0.5, 0, 1) * math.pi)
						local id = CFrame.identity
						local wind = math.sin(math.clamp(p / 0.24, 0, 1) * math.pi)
						local air = math.sin(math.clamp((p - 0.12) / 0.62, 0, 1) * math.pi)
						local recover = math.sin(math.clamp((p - 0.79) / 0.21, 0, 1) * math.pi)
						-- [공통 축발·상체 관성] 몸통 회전 → 무릎 접기 → 발끝 착지 → 어깨 회수.
						canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.17 * wind + 0.13 * land, side * 0.15 * air - side * 0.11 * recover, 0)
						canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.22 * wind + 0.18 * land, 0, -side * 0.12 * air)
						canon.ThighR = (canon.ThighR or id) * CFrame.Angles(0.18 * wind - 0.22 * land, 0, side * 0.12 * air)
						canon.ShinR = (canon.ShinR or id) * CFrame.Angles(-0.27 * air + 0.31 * land, 0, 0)
						canon.FootL = (canon.FootL or id) * CFrame.Angles(0.25 * air - 0.17 * land, -side * 0.11 * land, 0)
						canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.18 * air + 0.29 * land - 0.16 * recover, side * 0.10 * land, 0)
						canon.Chest = (canon.Chest or id) * CFrame.Angles(0.10 * wind - 0.15 * land, -side * 0.13 * air, 0)
						-- [회피 관성 마감] 동체보다 고개가 늦게 돌아오고 발끝부터 닿은 뒤 양팔이 무기 자세로 복귀.
						canon.Head = (canon.Head or id) * CFrame.Angles(-0.12 * air + 0.14 * recover, -side * 0.17 * wind + side * 0.16 * recover, 0)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.14 * wind + 0.17 * recover, 0, side * 0.07 * air)
						canon.HandL = (canon.HandL or id) * CFrame.Angles(-0.11 * air + 0.12 * recover, 0, -side * 0.10 * land)
						if style == "warrior" then
							canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.24 * land, -0.12 * side * peak, 0.20 * land)
							canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.42 * peak + 0.24 * land, 0, 0)
							canon.Head = (canon.Head or id) * CFrame.Angles(0.25 * land, -0.15 * side * peak, 0)
							canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.30 * wind + 0.26 * recover, 0, -side * 0.16 * air)
						elseif style == "gunner" then
							canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.38 * peak + 0.25 * land, 0, 0)
							canon.HandR = (canon.HandR or id) * CFrame.Angles(0.30 * land, 0, -0.12 * side * peak)
							canon.FootL = (canon.FootL or id) * CFrame.Angles(0.36 * land, 0, 0)
							canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.24 * wind + 0.22 * recover, 0, 0)
						elseif style == "navigator" then
							canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.35 * peak + 0.32 * land, 0, 0)
							canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.35 * peak + 0.32 * land, 0, 0)
							canon.Head = (canon.Head or id) * CFrame.Angles(-0.24 * peak + 0.15 * land, 0, 0)
							canon.FootL = (canon.FootL or id) * CFrame.Angles(0.36 * land, 0, side * 0.20 * air)
							canon.FootR = (canon.FootR or id) * CFrame.Angles(0.36 * land, 0, -side * 0.20 * air)
						elseif style == "merchant" then
							canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.38 * peak, 0, 0)
							canon.Head = (canon.Head or id) * CFrame.Angles(0, 0.24 * side * land, 0)
							canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.25 * wind + 0.21 * land, 0, side * 0.13 * air)
						elseif style == "doctor" then
							canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.30 * peak, 0, 0)
							canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.28 * peak + 0.22 * land, 0, 0)
							canon.Head = (canon.Head or id) * CFrame.Angles(0, -side * 0.18 * air + side * 0.15 * recover, 0)
						elseif style == "clergy" then
							canon.HandL = (canon.HandL or id) * CFrame.Angles(-0.24 * peak, 0, -0.12 * land)
							canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.24 * peak, 0, 0.12 * land)
							canon.Head = (canon.Head or id) * CFrame.Angles(-0.20 * peak + 0.18 * land, 0, 0)
							canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.25 * air + 0.18 * recover, 0, -0.14 * wind)
						elseif style == "scholar" then
							canon.HandL = (canon.HandL or id) * CFrame.Angles(-0.32 * peak, 0, -0.24 * land)
							canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.27 * land, 0, 0.18 * peak)
							canon.Head = (canon.Head or id) * CFrame.Angles(0, -0.22 * side * land, 0)
							canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.16 * air + 0.20 * recover, side * 0.16 * air, 0)
						end
						-- [6종 회피 전신 관절] 발 디딤 → 회전 → 손 지지 → 발끝 착지를 묘기별로 연결.
						if trick == 1 then
							canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.76 * air, 0, -side * 0.40 * air)
							canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.76 * air, 0, side * 0.40 * air)
							canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.85 * air - 0.35 * land, 0, 0)
							canon.ShinR = (canon.ShinR or id) * CFrame.Angles(0.85 * air - 0.35 * land, 0, 0)
						elseif trick == 2 then
							-- [백덤블링] 팔 젖히기·양무릎 접기.
							canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.85 * wind + 0.58 * air, 0, -0.15 * air)
							canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.85 * wind + 0.58 * air, 0, 0.15 * air)
							canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.90 * air + 0.32 * land, 0, 0)
							canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.90 * air + 0.32 * land, 0, 0)
							canon.ShinL = (canon.ShinL or id) * CFrame.Angles(1.10 * air - 0.42 * land, 0, 0)
							canon.ShinR = (canon.ShinR or id) * CFrame.Angles(1.10 * air - 0.42 * land, 0, 0)
						elseif trick == 3 then
							-- [공중 피루엣] 양팔 펼치기·한 무릎 올리기.
							canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.40 * air, 0, -0.92 * air)
							canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.40 * air, 0, 0.92 * air)
							canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.83 * air + 0.24 * land, 0, -0.12 * air)
							canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.90 * air - 0.34 * land, 0, 0)
							canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.39 * air + 0.28 * land, 0, 0)
						elseif trick == 4 then
							-- [슬라이딩] 양다리 비대칭·팔 지지.
							canon.ThighL = (canon.ThighL or id) * CFrame.Angles(0.68 * air - 0.22 * land, 0, -side * 0.18 * air)
							canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.82 * air + 0.28 * land, 0, 0)
							canon.ShinR = (canon.ShinR or id) * CFrame.Angles(0.95 * air - 0.30 * land, 0, 0)
							canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(0.36 * air - 0.15 * recover, 0, -side * 0.26 * air)
							canon.FootL = (canon.FootL or id) * CFrame.Angles(-0.35 * air + 0.24 * land, 0, 0)
						elseif trick == 5 then
							-- [한손 지지 카트휠] 왼손 짚기·양다리 V자.
							canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-1.04 * air, 0, -side * 0.24 * air)
							canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.31 * air + 0.26 * recover, 0, 0)
							canon.HandL = (canon.HandL or id) * CFrame.Angles(-0.42 * air + 0.36 * land, 0, side * 0.14 * air)
							canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(0.38 * air, 0, side * 0.72 * air)
							canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.40 * air, 0, -side * 0.42 * air)
							canon.ThighR = (canon.ThighR or id) * CFrame.Angles(0.38 * air, 0, side * 0.46 * air)
						else
							-- [옆공중회전] 두 팔 벌리기·교차 무릎·발끝 착지.
							canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.56 * air, 0, -0.66 * air)
							canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.56 * air, 0, 0.66 * air)
							canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.70 * air + 0.28 * land, 0, -side * 0.14 * air)
							canon.ThighR = (canon.ThighR or id) * CFrame.Angles(0.35 * air - 0.20 * land, 0, side * 0.14 * air)
							canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.81 * air - 0.31 * land, 0, 0)
							canon.FootR = (canon.FootR or id) * CFrame.Angles(0.36 * land - 0.25 * air, 0, 0)
						end
					end
				end
			end
			-- [주인공 무기별 지면 접지·손목 반동] 원본 숙련 콤보 뒤에 작은 보조 관절만 합성한다.
			-- 명중 횟수·타격 정지·애니메이션 길이·능력치는 기존 계산을 그대로 사용한다.
			if swingKind and swingCombo then
				local p = math.clamp((os.clock() - swingT0) / swingDur, 0, 1)
				local impulse = math.sin(p * math.pi)
				local settle = math.sin(math.clamp((p - 0.57) / 0.43, 0, 1) * math.pi)
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
				-- [무기별 정밀 동작] 준비·접촉·회수의 관절 파형은 양 끝에서 0이 되어 다음 타 자세를 튕기지 않는다.
				-- 공격 판정·0.14초 명중·10박자·이동·쿨타임은 건드리지 않고 기존 관절 목표에만 덧셈한다.
				if not range then
					local prepare = math.sin(math.clamp(p / 0.34, 0, 1) * math.pi) ^ 2
					local contact = math.sin(math.clamp((p - 0.11) / 0.60, 0, 1) * math.pi) ^ 2
					local recover = math.sin(math.clamp((p - 0.43) / 0.57, 0, 1) * math.pi) ^ 2
					local side = if slashIdx % 2 == 0 then -1 else 1
					if family == "dagger" then
						-- 단검: 역수 준비 → 짧은 손목 관통 → 팔꿈치 접고 축발 회수.
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(0.13 * prepare - 0.18 * contact, side * 0.09 * contact, 0)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.16 * prepare + 0.23 * contact - 0.11 * recover, 0, 0)
						canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.13 * contact + 0.17 * recover, 0, side * 0.11 * contact)
						canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.12 * prepare + 0.10 * recover, 0, -side * 0.07 * contact)
					elseif family == "fist" then
						-- 격투: 비공격손 가드 → 어깨 선행 → 전완 충격 → 손목과 발목의 늦은 복귀.
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.12 * prepare + 0.08 * recover, 0, -side * 0.06 * contact)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.19 * contact + 0.15 * recover, 0, 0)
						canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.12 * contact + 0.10 * recover, side * 0.07 * contact, 0)
						canon.ShinR = (canon.ShinR or id) * CFrame.Angles(0.13 * prepare - 0.09 * recover, 0, 0)
					elseif family == "spear" then
						-- 창: 앞손 지지·뒷손 관통, 뒷꿈치로 체중을 밀고 창끝을 늦게 회수한다.
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.12 * prepare + 0.10 * recover, 0, -side * 0.07 * contact)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.23 * contact + 0.14 * recover, side * 0.06 * contact, 0)
						canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.10 * contact + 0.12 * recover, 0, 0)
						canon.FootL = (canon.FootL or id) * CFrame.Angles(-0.14 * prepare + 0.11 * recover, 0, 0)
					elseif family == "axe" or family == "blunt" then
						-- 도끼는 수직 중량, 철퇴는 측면 관성: 어깨가 먼저 멈추고 손목이 늦게 따라온다.
						local mass = if family == "axe" then 1 else 0.82
						canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.12 * mass * prepare + 0.08 * mass * recover, side * 0.06 * contact, 0)
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.16 * mass * contact + 0.08 * recover, 0, side * 0.07 * contact)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.13 * mass * contact + 0.19 * mass * recover, 0, 0)
						canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.10 * mass * contact + 0.16 * mass * recover, 0, side * (if family == "axe" then 0.04 else 0.12) * contact)
						canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.11 * prepare + 0.07 * recover, 0, 0)
					elseif family == "blade" then
						-- 직검 교차베기 / 레이피어 직선찌르기 / 외날검 허리와 칼끝이 엇박으로 회수된다.
						canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.06 * prepare, side * 0.10 * contact - side * 0.06 * recover, 0)
						if wpn.motion == "RAPIER" then
							canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.19 * contact + 0.12 * recover, -side * 0.04 * contact, 0)
							canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.09 * contact + 0.10 * recover, 0, 0)
							canon.FootL = (canon.FootL or id) * CFrame.Angles(-0.11 * prepare + 0.09 * recover, 0, 0)
						elseif wpn.motion == "KATANA" or wpn.motion == "SABRE" or wpn.motion == "SCIMITAR" then
							canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.14 * contact + 0.10 * recover, side * 0.09 * contact, 0)
							canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.16 * contact + 0.15 * recover, 0, side * 0.09 * recover)
							canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.09 * prepare + 0.10 * recover, 0, 0)
						else
							canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.12 * contact + 0.13 * recover, 0, side * 0.06 * contact)
							canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.14 * contact + 0.12 * recover, 0, 0)
						end
					end
				end
				-- [쓰시마식 1~3타] 발끝→골반→어깨→손목의 시간차를 첫 타부터 적용.
				if swingKind == "slash" and slashIdx <= 3 and not wpn.ranged then
					local side = if slashIdx % 2 == 0 then 1 else -1
					local plant = math.sin(math.clamp(p / 0.51, 0, 1) * math.pi)
					local release = math.sin(math.clamp((p - 0.11) / 0.62, 0, 1) * math.pi)
					local recover = math.sin(math.clamp((p - 0.47) / 0.53, 0, 1) * math.pi)
					local weight = if heavy then 0.73 elseif family == "dagger" or family == "fist" then 1.17 else 1
					if slashIdx == 1 then
						-- [1타] 칼을 뽑듯 짧게 앞디딤, 골반 회전과 손목 회수.
						canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.22 * plant * weight, -side * 0.20 * release, 0)
						canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.36 * plant + 0.21 * recover, 0, -side * 0.12 * plant)
						canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.33 * plant - 0.24 * recover, 0, 0)
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.27 * release * weight + 0.17 * recover, side * 0.16 * release, 0)
						canon.Head = (canon.Head or id) * CFrame.Angles(-0.09 * plant, side * 0.10 * recover, 0)
					elseif slashIdx == 2 then
						-- [2타] 뒷발 교차, 허리 역회전, 반대쪽 대각 베기.
						canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.15 * plant, side * 0.30 * release * weight, -side * 0.14 * plant)
						canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.40 * plant + 0.22 * recover, 0, side * 0.17 * plant)
						canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.21 * plant + 0.24 * recover, 0, side * 0.12 * release)
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.33 * release + 0.21 * recover, -side * 0.15 * release, 0)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.29 * release + 0.20 * recover, 0, 0)
					else
						-- [3타] 무릎 낮추고 측면으로 흘리면서 상승 역베기.
						canon.Spine = (canon.Spine or id) * CFrame.Angles(0.19 * plant - 0.14 * recover, -side * 0.37 * release * weight, -side * 0.18 * plant)
						canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.52 * plant + 0.31 * recover, 0, -side * 0.18 * plant)
						canon.ThighR = (canon.ThighR or id) * CFrame.Angles(0.34 * plant - 0.21 * recover, 0, side * 0.15 * plant)
						canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.55 * plant - 0.30 * recover, 0, 0)
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.41 * release + 0.26 * recover, side * 0.17 * release, 0)
						canon.FootL = (canon.FootL or id) * CFrame.Angles(-0.24 * plant + 0.25 * recover, 0, 0)
					end
				end
				if not range then
					-- [근접 무용식 디딤발] 10박자 내내 반대 무릎을 접고 착지해 몸통 선회에 연결.
					local stepSide = if slashIdx % 2 == 0 then -1 else 1
					local quick = family == "dagger" or family == "fist"
					local heavyStep = family == "axe" or family == "blunt"
					local stride = if quick then 0.42 elseif heavyStep then 0.26 else 0.33
					canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.14 * impulse, stepSide * stride * impulse, -stepSide * 0.12 * impulse)
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-stride * impulse, 0, -stepSide * 0.13 * impulse)
					canon.ThighR = (canon.ThighR or id) * CFrame.Angles(0.34 * impulse, 0, stepSide * 0.14 * impulse)
					canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.40 * impulse, 0, 0)
					canon.ShinR = (canon.ShinR or id) * CFrame.Angles(-0.22 * impulse, 0, 0)
					canon.FootL = (canon.FootL or id) * CFrame.Angles(0.18 * impulse, 0, -stepSide * 0.09 * impulse)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.16 * impulse, 0, stepSide * 0.09 * impulse)
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
				-- [사격 곡선] 조준 압력·발사 반동·견착 회수 모두 시작/끝 미분값 0. 일반 평타의 0.14초 명중 시각은 유지.
				local press = if firing then math.sin(progress * math.pi) ^ 2 else 0
				local recoil = if firing then math.sin(math.clamp((progress - 0.26) / 0.42, 0, 1) * math.pi) ^ 2 else 0
				local recover = if firing then math.sin(math.clamp((progress - 0.56) / 0.44, 0, 1) * math.pi) ^ 2 else 0
				local poseWeight = if firing then 0.75 + 0.20 * press else readiness
				local id = CFrame.identity
				local crossbow = wpn.motion == "CROSSBOW"
				local bow = wpn.family == "bow"
				local longGun = wpn.motion == "RIFLE"
				local pistol = wpn.motion == "PISTOL"
				-- [기본 사격 팔 역전 보정] FM.sample이 이미 원거리 조준 팔을 만든 뒤 같은 어깨에
				-- 음수 피치를 곱하던 중복 누적이 활/석궁의 팔을 등 뒤로 돌렸다.
				-- 사격 중에는 공용 콤보 위에 더하지 않고 실제 R15 전방 견착 목표각으로 직접 수렴한다.
				-- 이동/대기 중에는 기존 공용 포즈를 일부 보존해 어깨가 갑자기 고정되지 않는다.
				if crossbow then
					local gripBlend = if firing then 1 else (if traveling then 0.38 else 0.68)
					canon.UpperArmR = (canon.UpperArmR or id):Lerp(
						CFrame.Angles(-0.79 * poseWeight + 0.16 * recoil - 0.06 * recover, 0.04, 0.10), gripBlend)
					canon.UpperArmL = (canon.UpperArmL or id):Lerp(
						CFrame.Angles(-0.88 * poseWeight, -0.11, -0.14), gripBlend)
					canon.ForearmR = (canon.ForearmR or id):Lerp(
						CFrame.Angles(-0.44 * poseWeight + 0.18 * recoil, 0, 0), gripBlend)
					canon.ForearmL = (canon.ForearmL or id):Lerp(
						CFrame.Angles(-0.54 * poseWeight + 0.07 * recover, 0, 0), gripBlend)
					canon.HandL = (canon.HandL or id):Lerp(CFrame.Angles(-0.13 * poseWeight, 0, -0.04), gripBlend)
					canon.HandR = (canon.HandR or id):Lerp(
						CFrame.Angles(0.18 * recoil - 0.11 * recover, 0, 0), gripBlend)
					canon.Head = (canon.Head or id) * CFrame.Angles(-0.04 * poseWeight, 0, 0)
				elseif bow then
					-- [전방 활시위] 왼팔은 전방에 활대를 세우고 오른팔은 턱 옆에서 시위를 당긴다.
					-- 공용 W:BOW_RELEASE 원자와 같은 전방 피치를 사용하되 두 번 회전시키지 않는다.
					local gripBlend = if firing then 1 else (if traveling then 0.38 else 0.70)
					canon.UpperArmL = (canon.UpperArmL or id):Lerp(
						CFrame.Angles(-1.01 * poseWeight + 0.06 * recover, -0.12, -0.20), gripBlend)
					canon.ForearmL = (canon.ForearmL or id):Lerp(
						CFrame.Angles(-0.14 * poseWeight, 0, 0), gripBlend)
					canon.HandL = (canon.HandL or id):Lerp(CFrame.Angles(-0.12 * poseWeight, 0, 0), gripBlend)
					canon.UpperArmR = (canon.UpperArmR or id):Lerp(
						CFrame.Angles(-0.70 * poseWeight - 0.19 * press + 0.22 * recoil, 0.27 * poseWeight, 0.24), gripBlend)
					canon.ForearmR = (canon.ForearmR or id):Lerp(
						CFrame.Angles(-0.66 * poseWeight - 0.14 * press + 0.33 * recoil + 0.08 * recover, 0.08, 0), gripBlend)
					canon.HandR = (canon.HandR or id):Lerp(
						CFrame.Angles(-0.12 * press + 0.26 * recoil + 0.11 * recover, 0.08, 0), gripBlend)
					canon.Chest = (canon.Chest or id) * CFrame.Angles(0, 0.08 * poseWeight, 0)
					canon.Head = (canon.Head or id) * CFrame.Angles(-0.04 * poseWeight, -0.07 * poseWeight, 0)
				elseif longGun then
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.65 * poseWeight, 0, -0.18)
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.69 * poseWeight + 0.21 * recoil - 0.08 * recover, 0, 0.13)
					canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.42 * poseWeight + 0.10 * recover, 0, 0)
					canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.42 * poseWeight + 0.24 * recoil - 0.11 * recover, 0, 0)
				elseif pistol or wpn.family == "firearm" then
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.80 * poseWeight + 0.25 * recoil - 0.10 * recover, 0, 0.08)
					canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.48 * poseWeight + 0.30 * recoil - 0.13 * recover, 0, 0)
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.21 * poseWeight - 0.11 * recoil + 0.09 * recover, 0, -0.12)
				end
				canon.Head = (canon.Head or id) * CFrame.Angles(-0.06 * poseWeight + 0.06 * recoil - 0.04 * recover, 0, 0)
				canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.08 * poseWeight + 0.11 * recoil - 0.07 * recover, 0, 0)
			end
			-- [연타 관성] 무기 프로필별 두 번째/세 번째 시각 동작에 발 디딤과 팔꿈치 회수를 얹는다.
			-- CommonMotion 원본 타격 동작에만 아주 짧은 보정으로 적용, 공격력·속도·사거리에는 영향 없음.
			if swingKind and swingCombo and slashIdx >= 2 then
				local p = math.clamp((os.clock() - swingT0) / math.max(swingDur, 0.05), 0, 1)
				local pulse = math.sin(p * math.pi)
				local side = if slashIdx % 2 == 0 then -1 else 1
				local id = CFrame.identity
				local family = wpn.family
				-- [10타 진폭] 여덟·아홉 타에서 선회가 커지고 열 번째에 공중 회전 마무리.
				local flourish = if slashIdx == 10 then 1.90 elseif slashIdx >= 7 then 1.48 else 1
				pulse *= flourish
				
				-- [전신 연쇄] 골반·발은 먼저, 가슴·팔꿈치는 그다음, 손목·시선은 마지막에 움직인다.
				-- 매 단계 방향과 리듬을 바꿔 같은 동작을 기계적으로 반복하지 않는다.
				local step = math.sin(math.clamp(p / 0.56, 0, 1) * math.pi)
				local shoulder = math.sin(math.clamp((p - 0.10) / 0.70, 0, 1) * math.pi)
				local finish = math.sin(math.clamp((p - 0.29) / 0.54, 0, 1) * math.pi)
				-- [4·7·10박 강조] 어깨·팔꿈치·발의 지연 반응으로 끊기지 않는 검무/연사 연결.
				local accent = if slashIdx == 4 then 0.24 elseif slashIdx == 7 then 0.38 elseif slashIdx == 10 then 0.52 else 0
				if accent > 0 then
					local push = math.sin(math.clamp((p - 0.05) / 0.60, 0, 1) * math.pi)
					local recover = math.sin(math.clamp((p - 0.43) / 0.55, 0, 1) * math.pi)
					canon.Chest = (canon.Chest or id) * CFrame.Angles(-accent * 0.54 * push, side * accent * 0.70 * recover, 0)
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-accent * push + 0.22 * accent * recover, 0, -side * accent * 0.37 * push)
					canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-accent * 0.48 * push + accent * 0.68 * recover, 0, 0)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(-accent * 0.24 * push + accent * 0.31 * recover, 0, side * 0.12 * recover)
				end
				-- [4~9박 전신 곡예 관절] 무기별 모션에 손목 지지·무릎 접힘·발끝 순차 착지 동작을 합성.
				if not wpn.ranged and slashIdx == 4 then
					-- [4타] 옆구르기에 맞춰 양팔 보호·양무릎 접기.
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.62 * shoulder, 0, -side * 0.36 * shoulder)
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.49 * shoulder, 0, side * 0.31 * shoulder)
					canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.69 * step - 0.25 * finish, 0, 0)
					canon.ShinR = (canon.ShinR or id) * CFrame.Angles(0.52 * step - 0.22 * finish, 0, 0)
				elseif not wpn.ranged and slashIdx == 5 then
					-- [5타] 한손 짚기 또는 중량 무기의 축발 선회.
					local handWeight = if family == "dagger" or family == "fist" then 1 else 0.55
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.93 * shoulder * handWeight, 0, -side * 0.24 * shoulder)
					canon.HandL = (canon.HandL or id) * CFrame.Angles(-0.36 * shoulder * handWeight + 0.28 * finish, 0, 0)
					canon.ThighR = (canon.ThighR or id) * CFrame.Angles(0.45 * step, 0, side * 0.34 * shoulder)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.19 * step + 0.25 * finish, side * 0.15 * step, 0)
				elseif not wpn.ranged and slashIdx == 6 then
					-- [6타] 날렵한 무기는 백덤블링 무릎 접기, 중량 무기는 힘 모아 들어치기.
					local tuck = if family == "axe" or family == "blunt" then 0.40 else 1
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles((-0.71 * step + 0.29 * finish) * tuck, 0, 0)
					canon.ThighR = (canon.ThighR or id) * CFrame.Angles((-0.71 * step + 0.29 * finish) * tuck, 0, 0)
					canon.ShinL = (canon.ShinL or id) * CFrame.Angles((0.84 * step - 0.35 * finish) * tuck, 0, 0)
					canon.ShinR = (canon.ShinR or id) * CFrame.Angles((0.84 * step - 0.35 * finish) * tuck, 0, 0)
				elseif not wpn.ranged and slashIdx == 7 then
					canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.85 * step + 0.35 * finish, 0, 0)
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(0.55 * step, 0, -side * 0.17 * step)
					canon.FootL = (canon.FootL or id) * CFrame.Angles(-0.30 * step + 0.25 * finish, 0, 0)
				elseif not wpn.ranged and slashIdx == 8 then
					-- [8타] 공중 피루엣에서 팔 벌리기·한 무릎 접기.
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.34 * shoulder, 0, -0.61 * shoulder)
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.34 * shoulder, 0, 0.61 * shoulder)
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.47 * step, 0, 0)
				elseif not wpn.ranged and slashIdx == 9 then
					-- [9타] 측면회전 후 양발의 늦은 접지로 마지막 타격 각도를 확보.
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.48 * shoulder + 0.19 * finish, 0, side * 0.41 * shoulder)
					canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.56 * step + 0.36 * finish, 0, side * 0.24 * step)
					canon.ShinR = (canon.ShinR or id) * CFrame.Angles(0.72 * step - 0.38 * finish, 0, 0)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.26 * step + 0.33 * finish, 0, -side * 0.17 * finish)
				end
				-- [10박자 마무리] 스윙을 억지로 반복하지 않고 시선·축발·팔끝이 순차적으로 회수된다.
				if slashIdx == 10 then
					local landing = math.sin(math.clamp((p - 0.55) / 0.43, 0, 1) * math.pi)
					canon.Head = (canon.Head or id) * CFrame.Angles(-0.16 * shoulder + 0.22 * landing, side * 0.17 * finish, 0)
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.24 * step + 0.16 * landing, 0, -side * 0.11 * step)
					canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.32 * step - 0.26 * landing, 0, 0)
					canon.FootL = (canon.FootL or id) * CFrame.Angles(-0.19 * step + 0.27 * landing, 0, side * 0.12 * landing)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(0.22 * landing, 0, -side * 0.10 * landing)
				end
				if family == "dagger" then
					-- [단검] 골반을 낮추며 교차 역수 → 후속 손목 회수 → 빠른 공중 교차 마무리.
					canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.25 * step, -side * 0.31 * step, side * 0.18 * step)
					canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.24 * shoulder, side * 0.38 * shoulder * flourish, side * 0.16 * shoulder)
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.34 * shoulder, -side * 0.24 * shoulder, -side * 0.18 * shoulder)
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.39 * shoulder + 0.21 * finish, side * 0.31 * shoulder, side * 0.15 * shoulder)
					canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.26 * shoulder + 0.25 * finish, 0, side * 0.20 * finish)
					canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.27 * step, 0, side * 0.13 * step)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(0.17 * finish, side * 0.12 * step, 0)
				elseif family == "spear" then
					-- [창] 뒷발 밀기 → 창자루 회전 → 긴 찌르기·뒤로 훑는 마무리.
					canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.18 * step, -side * 0.19 * step, 0)
					canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.16 * shoulder, side * 0.29 * shoulder * flourish, -side * 0.08 * shoulder)
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.25 * shoulder, -side * 0.23 * shoulder, 0)
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.24 * shoulder + 0.22 * finish, side * 0.24 * shoulder, 0)
					canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.19 * shoulder, 0, side * 0.13 * finish)
					canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.14 * shoulder + 0.21 * finish, 0, 0)
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.27 * step, 0, -0.11 * step)
					-- [창술 실루엣] 앞손은 지지, 뒷손은 늦게 회수하고 발끝이 찌르기 방향을 받친다.
					canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.34 * shoulder + 0.28 * finish, side * 0.10 * shoulder, 0)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(0.21 * step - 0.18 * finish, 0, side * 0.11 * step)
				elseif family == "axe" or family == "blunt" then
					-- [도끼·철퇴] 느리지만 큰 관성: 발 밀기 → 몸통 역회전 → 묵직한 활강·상승 마무리.
					local axe = family == "axe"
					local swing = if axe then 0.38 else 0.33
					canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.18 * step, -side * 0.27 * step, 0)
					canon.Chest = (canon.Chest or id) * CFrame.Angles(0.15 * shoulder, side * swing * shoulder * flourish, -side * 0.16 * shoulder)
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.33 * shoulder + 0.23 * finish, side * 0.22 * shoulder, side * 0.18 * shoulder)
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.27 * shoulder, -side * 0.18 * shoulder, -side * 0.12 * shoulder)
					canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.22 * shoulder + 0.26 * finish, 0, 0)
					canon.FootL = (canon.FootL or id) * CFrame.Angles(0.24 * finish, 0, side * 0.11 * step)
					-- [무게 중심 반작용] 도끼는 수직 내려찍기, 철퇴는 옆으로 크게 휘두른 뒤 무릎이 늦게 접힌다.
					canon.HandR = (canon.HandR or id) * CFrame.Angles((if axe then -0.28 else 0.23) * shoulder + 0.20 * finish, 0, side * 0.10 * finish)
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.21 * step + 0.18 * finish, 0, -side * 0.12 * step)
					canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.31 * step - 0.22 * finish, 0, 0)
				elseif family == "blade" then
					-- [검] X자 교차 베기 → 낮은 역선회 → 10타 상승 회전 베기.
					canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.13 * step, -side * 0.28 * step, side * 0.11 * step)
					canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.17 * shoulder, side * 0.36 * shoulder * flourish, -side * 0.15 * shoulder)
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.29 * shoulder + 0.26 * finish, side * 0.26 * shoulder, -side * 0.19 * shoulder)
					canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.24 * shoulder + 0.19 * finish, 0, side * 0.12 * shoulder)
					canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.20 * shoulder + 0.21 * finish, side * 0.22 * shoulder, 0)
					-- [무기 개성] 레이피어 정면 찌르기, 외날검 허리 회전 베기, 직검 좌우 교차 베기.
					if wpn.motion == "RAPIER" then
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.40 * shoulder + 0.25 * finish, -side * 0.10 * shoulder, 0)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.32 * shoulder + 0.22 * finish, 0, 0)
						canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.24 * step, 0, -0.08 * step)
						canon.Head = (canon.Head or id) * CFrame.Angles(-0.09 * shoulder, -side * 0.13 * finish, 0)
					elseif wpn.motion == "KATANA" or wpn.motion == "SABRE" or wpn.motion == "SCIMITAR" then
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.27 * shoulder + 0.24 * finish, -side * 0.19 * shoulder, 0)
						canon.HandR = (canon.HandR or id) * CFrame.Angles(-0.22 * shoulder + 0.31 * finish, 0, side * 0.17 * finish)
						canon.FootL = (canon.FootL or id) * CFrame.Angles(-0.19 * step + 0.18 * finish, 0, side * 0.12 * step)
					else
						canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.18 * shoulder + 0.16 * finish, 0, -side * 0.14 * finish)
						canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.19 * step + 0.16 * finish, 0, side * 0.12 * step)
					end
				elseif family == "fist" then
					-- [맨손] 반대발 디딤 → 회전 훅 → 팔꿈치·돌려차기 → 10타 공중 마무리.
					canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.19 * step, -side * 0.34 * step, side * 0.17 * step)
					canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.24 * shoulder, side * 0.39 * shoulder * flourish, side * 0.15 * shoulder)
					canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.40 * shoulder, -side * 0.24 * shoulder, 0)
					canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.33 * shoulder + 0.20 * finish, side * 0.23 * shoulder, 0)
					canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.36 * step + 0.22 * finish, 0, side * 0.24 * step)
					canon.ShinR = (canon.ShinR or id) * CFrame.Angles(0.55 * step - 0.24 * finish, 0, 0)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(0.28 * finish, 0, side * 0.15 * step)
					-- [격투술] 어깨·팔꿈치·무릎 엇박 회수로 발차기에서 다음 훅까지 부드럽게 잇는다.
					canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.39 * shoulder + 0.30 * finish, 0, -side * 0.15 * finish)
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.24 * step + 0.32 * finish, 0, -side * 0.14 * step)
					canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.40 * step - 0.24 * finish, 0, 0)
				elseif wpn.ranged then
					-- [원거리 영화식 2·3연타] 팔·허리·무릎·발끝이 좌우로 번갈아 움직인다.
					-- 실제 충돌체/서버 위치/명중 횟수는 바꾸지 않고 R15 관절만 넓게 흔든다.
					local bow = family == "bow"
					local crossbow = wpn.motion == "CROSSBOW"
					local rifle = wpn.motion == "RIFLE"
					local drop = if slashIdx == 3 then 1 elseif slashIdx >= 7 then 1.1 else 0.65
					-- [모션의 시간차] 지지발/골반이 먼저 회전하고, 어깨가 따라오며, 손목은 마지막 격발에 튕긴다.
					local plant = math.sin(math.clamp(p / 0.58, 0, 1) * math.pi)
					local shoulder = math.sin(math.clamp((p - 0.08) / 0.72, 0, 1) * math.pi)
					local trigger = math.sin(math.clamp((p - 0.26) / 0.55, 0, 1) * math.pi)
					canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.32 * drop * plant, side * 0.52 * plant, -side * 0.24 * plant)
					canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.21 * shoulder, -side * 0.56 * shoulder, side * 0.26 * shoulder)
					-- 고개는 허리가 돌아가도 목표 방향을 더 늦게 따라가고, 사격 직후에 회수한다.
					canon.Head = (canon.Head or id) * CFrame.Angles(0.12 * trigger, side * (0.39 * shoulder - 0.15 * trigger), 0)
					canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.61 * drop * plant, 0, -0.17 * plant)
					canon.ThighR = (canon.ThighR or id) * CFrame.Angles(0.53 * drop * plant, 0, 0.18 * plant)
					canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.59 * drop * plant, 0, 0)
					canon.ShinR = (canon.ShinR or id) * CFrame.Angles(-0.31 * drop * plant, 0, 0)
					canon.FootL = (canon.FootL or id) * CFrame.Angles(0.23 * plant, 0, -side * 0.12 * plant)
					canon.FootR = (canon.FootR or id) * CFrame.Angles(-0.28 * plant, 0, side * 0.14 * plant)
					-- [원거리 공중연사 발놀림] 낮은 슬라이드는 축다리를 뻗고, 공중 사격은 양무릎을 늦게 회수.
					if slashIdx == 5 or slashIdx == 7 then
						canon.ThighL = (canon.ThighL or id) * CFrame.Angles(0.42 * plant - 0.16 * trigger, 0, side * 0.15 * plant)
						canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.74 * plant + 0.27 * trigger, 0, 0)
						canon.FootL = (canon.FootL or id) * CFrame.Angles(-0.39 * plant + 0.20 * trigger, 0, 0)
					elseif (slashIdx == 6 or slashIdx == 8 or slashIdx == 9) and not crossbow and not rifle then
						canon.ThighL = (canon.ThighL or id) * CFrame.Angles(-0.79 * plant + 0.27 * trigger, 0, -side * 0.18 * plant)
						canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.41 * plant + 0.28 * trigger, 0, side * 0.19 * plant)
						canon.ShinL = (canon.ShinL or id) * CFrame.Angles(0.82 * plant - 0.34 * trigger, 0, 0)
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.30 * plant + 0.24 * trigger, 0, -side * 0.30 * plant)
					end
					if slashIdx >= 4 then
						-- [4~10회 연사] 골반과 어깨를 반대로 열고 반대손을 목표선으로 빠르게 복귀.
						local turn = if slashIdx % 2 == 0 then 1 else -1
						local finalWeight = if slashIdx == 10 then 1.65 else 1
						canon.Spine = (canon.Spine or id) * CFrame.Angles(-0.24 * plant, turn * 0.39 * plant, turn * 0.22 * plant)
						canon.Chest = (canon.Chest or id) * CFrame.Angles(-0.19 * shoulder, -turn * 0.42 * shoulder, -turn * 0.15 * shoulder)
						canon.ThighR = (canon.ThighR or id) * CFrame.Angles(-0.41 * finalWeight * plant, 0, turn * 0.20 * plant)
						canon.ShinR = (canon.ShinR or id) * CFrame.Angles(0.46 * finalWeight * plant, 0, 0)
						canon.HandL = (canon.HandL or id) * CFrame.Angles(-0.33 * shoulder, turn * 0.18 * shoulder, 0)
						canon.HandR = (canon.HandR or id) * CFrame.Angles(0.33 * trigger, -turn * 0.20 * trigger, 0)
						-- [10타 연속 사격 착지] 방아쇠 손목·고개는 앞발 접지 뒤 차례로 조준선에 복귀.
						if slashIdx == 10 then
							local land = math.sin(math.clamp((p - 0.58) / 0.42, 0, 1) * math.pi)
							canon.Head = (canon.Head or id) * CFrame.Angles(-0.12 * shoulder + 0.19 * land, -turn * 0.16 * trigger, 0)
							canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.15 * shoulder + 0.24 * land, 0, 0)
							canon.FootL = (canon.FootL or id) * CFrame.Angles(-0.28 * plant + 0.27 * land, 0, -turn * 0.12 * land)
							canon.HandR = (canon.HandR or id) * CFrame.Angles(0.31 * trigger - 0.24 * land, 0, 0)
						end
					end
					if bow then
						-- 활: 몸을 크게 열고 시위 팔을 뒤로 빼며 좌우 교차 사격.
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.30 * shoulder, 0, -side * 0.24 * shoulder)
						canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.20 * shoulder, 0, 0)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(-0.41 * shoulder + 0.27 * trigger, side * 0.30 * shoulder, 0)
						canon.HandR = (canon.HandR or id) * CFrame.Angles(0.45 * trigger, 0, side * 0.27 * trigger)
					elseif crossbow then
						-- 석궁: 양손 수평 견착 유지, 측면 빠른 격발과 반동.
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.28 * shoulder, -side * 0.14 * shoulder, 0)
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.38 * shoulder + 0.30 * trigger, side * 0.12 * shoulder, 0)
						canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.16 * shoulder, 0, -0.05 * shoulder)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(0.36 * trigger, 0, 0)
						canon.HandR = (canon.HandR or id) * CFrame.Angles(0.21 * trigger, 0, 0)
					elseif rifle then
						-- 장총: 견착한 채 어깨와 허리가 다른 방향으로 역회전.
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(-0.26 * shoulder, 0, -0.09 * shoulder)
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.12 * shoulder + 0.46 * trigger, side * 0.09 * shoulder, 0)
						canon.ForearmL = (canon.ForearmL or id) * CFrame.Angles(-0.23 * shoulder, 0, 0)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(0.24 * trigger, 0, 0)
					else
						-- 권총: 한 손을 크게 뻗고 반대손으로 균형을 잡으며 빠른 연사.
						canon.UpperArmR = (canon.UpperArmR or id) * CFrame.Angles(-0.55 * shoulder + 0.39 * trigger, 0, side * 0.20 * shoulder)
						canon.ForearmR = (canon.ForearmR or id) * CFrame.Angles(0.51 * trigger, 0, 0)
						canon.HandR = (canon.HandR or id) * CFrame.Angles(0.26 * trigger, 0, side * 0.14 * trigger)
						canon.UpperArmL = (canon.UpperArmL or id) * CFrame.Angles(0.28 * plant, -side * 0.16 * plant, 0)
					end
				end
			end
			-- [모션 일관성] 관절 배율은 교량과 캐시 이전에 한 번만 적용한다.
			-- [거대한 회피] 성직자·학자 2.0배, 기타 직업 1.70배. 무기 공격 원래 자세는 1.45배 그대로.
			FM.scale(canon, if swingKind == "dash" then
				(if ch:GetAttribute("FieldDodgeStyle") == "clergy" or ch:GetAttribute("FieldDodgeStyle") == "scholar" then 2.0 else 1.70) else 1.45)
			-- [관절 교량] 실제 적용한 관절 배율을 맞춰 직전 타의 마지막 프레임에서 다음 타로 자연스럽게 연결한다.
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
			if swingKind then
				rootRot = rootFor(swingKind, math.clamp((os.clock() - swingT0) / swingDur, 0, 1))
				-- [전신 연속 보간] 회전 중 공격↔공격·공격↔회피 전환에도 RootJoint를 관절과 동일하게 이음.
				if swingBridge.rootFrom then
					local blend = math.clamp((os.clock() - swingBridge.at) / swingBridge.duration, 0, 1)
					if blend >= 1 then
						swingBridge.rootFrom = nil
					else
						blend = blend * blend * (3 - 2 * blend)
						rootRot = swingBridge.rootFrom:Lerp(rootRot or CFrame.identity, blend)
					end
				end
				swingBridge.rootLast = rootRot
			else
				swingBridge.rootLast = nil
				swingBridge.rootFrom = nil
			end
			-- [프레임 캐시] 관절 배율과 보정까지 합친 이번 프레임의 최종 목표 자세를 저장한다.
			if swingKind and (swingCombo or swingKind == "dash") then
				table.clear(swingBridge.last)
				for joint, cf in canon do
					if typeof(cf) == "CFrame" then swingBridge.last[joint] = cf end
				end
				swingBridge.lastAt = os.clock()
			elseif os.clock() - swingBridge.lastAt > 1.1 then
				-- [기존 연계 창 유지] 1.1초가 지난 오래된 포즈만 버리고 0.32초 내 다음 타는 연결한다.
				table.clear(swingBridge.last)
			end
			-- [관절 응답] 가벼운 무기는 즉시 반응하고 중량 무기는 늦게 따라오되 판정·동작 시간은 동일하다.
			FM.step(pfm, dt, rootRot, if swingKind == "dash" then 1.85
				elseif swingKind and swingCombo and (wpn.family == "dagger" or wpn.family == "fist") then 1.12
				elseif swingKind and swingCombo and (wpn.family == "axe" or wpn.family == "blunt") then 0.96
				elseif swingKind and swingCombo and wpn.family == "spear" then 1.06 else nil)
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
	sparks.Texture = "rbxasset://textures/particles/sparkles_main.dds" -- 기본 흰 사각 입자 제거
	sparks.Lifetime = NumberRange.new(0.25, 0.5)
	sparks.Speed = NumberRange.new(14, 26)
	sparks.SpreadAngle = Vector2.new(180, 180)
	sparks.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.7), NumberSequenceKeypoint.new(1, 0) })
	sparks.LightEmission = 1
	sparks.Color = ColorSequence.new(Color3.fromRGB(255, 226, 120), Color3.fromRGB(255, 120, 60))
	sparks.Parent = fxPart
	local slash = Instance.new("ParticleEmitter")
	slash.Rate = 0
	slash.Texture = "rbxasset://textures/particles/sparkles_main.dds" -- [네모 제거] 큰 평면 광륜 대신 작은 타격 불꽃
	slash.Lifetime = NumberRange.new(0.2, 0.3)
	slash.Speed = NumberRange.new(4, 9)
	slash.SpreadAngle = Vector2.new(180, 180)
	slash.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.75), NumberSequenceKeypoint.new(0.3, 1.1), NumberSequenceKeypoint.new(1, 0) })
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
		-- [실물형 투사체] 넓은 사각 Beam을 쓰지 않고 가느다란 3D 화살대·볼트·탄환을 날린다.
		-- 원본 공격 판정과 별개인 시각 효과. 원거리 사용 무기마다 길이·속도·색·탄도를 구분한다.
		local bow = shotMotion == "BOW" or shotMotion == "LONGBOW"
		local crossbow = shotMotion == "CROSSBOW"
		local gun = shotMotion == "PISTOL" or shotMotion == "RIFLE"
		local flight = to - from
		if flight.Magnitude < 0.05 then return end
		local direction = flight.Unit
		local length = if bow then 1.55 elseif crossbow then 0.92 elseif gun then 0.16 else 1.10
		local shaft = Instance.new("Part")
		shaft.Name = "FieldProjectile"
		shaft.Shape = if gun then Enum.PartType.Ball else Enum.PartType.Cylinder
		shaft.Size = if gun then Vector3.one * 0.14
			else Vector3.new(if crossbow then 0.075 else 0.055, length, if crossbow then 0.075 else 0.055)
		shaft.Material = if gun then Enum.Material.Neon else Enum.Material.SmoothPlastic
		shaft.Color = if bow then Color3.fromRGB(132, 96, 57)
			elseif crossbow then Color3.fromRGB(146, 157, 157)
			elseif gun then Color3.fromRGB(255, 226, 175) else Color3.fromRGB(177, 155, 103)
		shaft.Anchored, shaft.CanCollide, shaft.CanTouch, shaft.CanQuery = true, false, false, false
		shaft.CastShadow = false
		shaft.CFrame = CFrame.lookAt(from, to) * CFrame.Angles(math.pi / 2, 0, 0)
		shaft.Parent = folder
		-- [금속촉] 화살·볼트 끝만 작게 밝게 해 네모난 플래시 대신 비행방향이 읽히게 한다.
		local tip
		if not gun then
			tip = Instance.new("Part")
			tip.Name = "FieldArrowTip"
			tip.Shape = Enum.PartType.Ball
			tip.Size = Vector3.one * (if crossbow then 0.115 else 0.095)
			tip.Material = Enum.Material.Metal
			tip.Color = Color3.fromRGB(187, 195, 187)
			tip.Anchored, tip.CanCollide, tip.CanTouch, tip.CanQuery = true, false, false, false
			tip.CastShadow = false
			tip.CFrame = CFrame.new(from + direction * (length * 0.5))
			tip.Parent = folder
		end
		-- [아주 얇은 잔광] 공식 Trail을 꼬리 끝에 붙여 길고 각진 화면 가로 빛판을 제거한다.
		local at0 = Instance.new("Attachment")
		local at1 = Instance.new("Attachment")
		at0.Position = Vector3.new(-0.028, if gun then 0 else length * 0.48, 0)
		at1.Position = Vector3.new(0.028, if gun then 0 else length * 0.48, 0)
		at0.Parent, at1.Parent = shaft, shaft
		local trail = Instance.new("Trail")
		trail.Attachment0, trail.Attachment1 = at0, at1
		trail.FaceCamera = false -- [투사체] 카메라를 향한 사각 빛판 대신 아주 얇은 실제 비행 잔흔
		trail.Lifetime = if bow then 0.085 elseif crossbow then 0.055 else 0.035
		trail.MinLength = 0.15
		trail.LightEmission = if gun then 0.55 else 0.12
		trail.Color = ColorSequence.new(if gun then Color3.fromRGB(250, 202, 135)
			elseif crossbow then Color3.fromRGB(199, 214, 220) else Color3.fromRGB(208, 194, 150))
		trail.Transparency = NumberSequence.new({NumberSequenceKeypoint.new(0, 0.38),
			NumberSequenceKeypoint.new(1, 1)})
		trail.WidthScale = NumberSequence.new({NumberSequenceKeypoint.new(0, 0),
			NumberSequenceKeypoint.new(0.22, 0.15), NumberSequenceKeypoint.new(1, 0)})
		trail.Parent = shaft
		local duration = flightOverride or (if gun then 0.09 elseif crossbow then 0.16 elseif bow then 0.24 else 0.18)
		local lift = if bow then math.min(flight.Magnitude * 0.045, 2.5)
			elseif crossbow then math.min(flight.Magnitude * 0.012, 0.55) else 0
		local started = os.clock()
		local move
		move = RunService.Heartbeat:Connect(function()
			if finished or not shaft.Parent then
				move:Disconnect()
				if shaft.Parent then shaft:Destroy() end
				if tip and tip.Parent then tip:Destroy() end
				return
			end
			local t = math.clamp((os.clock() - started) / math.max(duration, 0.02), 0, 1)
			local p = from:Lerp(to, t) + Vector3.new(0, math.sin(t * math.pi) * lift, 0)
			local tangent = flight + Vector3.new(0, math.cos(t * math.pi) * math.pi * lift, 0)
			local aim = if tangent.Magnitude > 0.001 then tangent.Unit else direction
			shaft.CFrame = CFrame.lookAt(p, p + aim) * CFrame.Angles(math.pi / 2, 0, 0)
			if tip and tip.Parent then tip.CFrame = CFrame.new(p + aim * (length * 0.5)) end
			if t >= 1 then
				move:Disconnect()
				trail.Enabled = false
				task.delay(trail.Lifetime + 0.04, function()
					if shaft.Parent then shaft:Destroy() end
					if tip and tip.Parent then tip:Destroy() end
				end)
			end
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
	-- [검술 궤적] 손·무기 Trail과 연동하는 방향성 불꽃·검광. 전투 판정과 별도다.
	local function slashArc(hrp: BasePart, color: Color3, reach: number, arc: number, tilt: number)
		if not CommonVFX then return end
		-- [무기별 검광 실루엣] 창·레이피어는 좁은 찌르기, 단검은 짧은 사선, 검은 긴 호, 도끼·철퇴는 무거운 궤도.
		-- 승인된 공용 작은 불꽃과 Trail만 사용하며 새 도형·모델을 만들지 않는다.
		local thrust = wpn.family == "spear" or wpn.motion == "RAPIER"
		local dagger = wpn.family == "dagger"
		local weighted = wpn.family == "axe" or wpn.family == "blunt"
		local style = if thrust then "pierce" elseif dagger then "dagger"
			elseif wpn.family == "axe" then "cleave" elseif wpn.family == "blunt" then "hammer"
			elseif wpn.family == "fist" then "fist" else "blade"
		local span = math.min(reach, if thrust then 9 elseif dagger then 6.5 else 12)
		local orientation = tilt + arc * (if thrust then 0.12 elseif weighted then 0.19 else 0.25)
		local base = hrp.CFrame
		pcall(CommonVFX.Create, "SHAPE_BURST", {
			parent = workspace, cframe = base * CFrame.new(0, if weighted then 0.32 else 0.76, -span * 0.38),
			color = color, accent = color:Lerp(Color3.new(1, 1, 1), 0.68), style = style,
			rotation = orientation, hideRing = not weighted, count = if visualMobile then 1 else (if weighted then 4 else 2),
			distance = if thrust then 1.5 else 2.8,
			startSize = math.max(0.85, span * (if thrust then 0.14 elseif dagger then 0.22 else 0.32)),
			endSize = span * (if thrust then 0.82 elseif dagger then 0.96 else 1.30),
			duration = if dagger then 0.14 elseif weighted then 0.25 else 0.19,
		})
		-- [검날 이중 잔흔] PC에서만 회전베기 끝에 얇은 후속 광선을 겹쳐 속도감과 소멸 차이를 준다.
		if not visualMobile and not weighted and not wpn.ranged and math.abs(arc) > 70 then
			local fxWeapon = wpn.id
			task.delay(0.055, function()
				if finished or not hrp.Parent or wpn.id ~= fxWeapon then return end
				pcall(CommonVFX.Create, "SHAPE_BURST", {
					parent = workspace, cframe = base * CFrame.new(0, 0.72, -span * 0.42),
					color = color:Lerp(Color3.new(1, 1, 1), 0.45), accent = color,
					style = style, rotation = orientation + (if dagger then -29 else 15),
					hideRing = true, hideFlash = false, count = 0, startSize = math.max(0.65, span * 0.16),
					endSize = span * (if dagger then 0.78 else 1.04), duration = 0.13,
				})
			end)
		end
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
		-- [날폭·잔광 길이 차별화] 단검은 좁고 빨리 사라지며, 장검은 얇은 긴 자국, 도끼·철퇴는 무거운 잔흔.
		local family = wpn.family
		local quick = family == "dagger" or family == "fist"
		local thrust = family == "spear" or wpn.motion == "RAPIER"
		local heavy = family == "axe" or family == "blunt"
		local function attach(part: Instance?, len: number?, weaponPart: boolean?)
			if part and part:IsA("BasePart") then
				local foot = part.Name:find("Foot") ~= nil or part.Name:find("Leg") ~= nil
				-- [실제 칼날 축] 메시가 눕거나 비스듬히 장착돼도 가장 긴 날 방향을 따라 빛이 그려지도록 한다.
				local axis
				if weaponPart then
					local size = part.Size
					axis = if size.X >= size.Y and size.X >= size.Z then Vector3.new(1, 0, 0)
						elseif size.Z >= size.Y then Vector3.new(0, 0, 1) else Vector3.new(0, 1, 0)
				else
					axis = if foot or family == "fist" then Vector3.new(1, 0, 0) else Vector3.new(0, 1, 0)
				end
				local width = if weaponPart then (if thrust then 0.25 elseif quick then 0.38 elseif heavy then 0.92 else 0.63)
					elseif foot then 0.28 elseif wpn.ranged then 0.30 elseif quick then 0.38 else 0.53
				local length = if weaponPart then math.min(4, len or part.Size.Y * 1.5)
					else math.max(0.55, (len or part.Size.Y * 1.4) * (if quick then 0.77 elseif heavy then 1.10 else 1))
				local ok, trail, ctl = pcall(CommonVFX.AttachShortTrail, part, {
					lifetime = math.min(life, if quick then 0.25 else 0.43),
					width = width, axis = axis, length = length, color = color,
				})
				if ok and trail and ctl then
					-- [날끝 서서히 소멸] 즉시 파괴하지 않고 발광을 끈 뒤 기존 Trail 수명만큼 잔흔을 부드럽게 지운다.
					task.delay(dur, function()
						if trail.Parent then trail.Enabled = false end
						task.delay(trail.Lifetime + 0.04, function() pcall(ctl.Destroy) end)
					end)
				end
			end
		end
		for _, nm in names do attach(ch:FindFirstChild(nm)) end
		local sword = ch:FindFirstChild("FieldWeapon", true) or ch:FindFirstChild("FieldSword", true)
		if sword and family ~= "fist" and not wpn.ranged then
			-- [실물 무기날 선택] 손잡이나 장식보다 가장 긴 메시를 선택해 날 전체에 잔흔을 남긴다.
			local blade = if sword:IsA("BasePart") then sword else nil
			if not blade then
				for _, part in sword:GetDescendants() do
					if part:IsA("BasePart") and (not blade or math.max(part.Size.X, part.Size.Y, part.Size.Z)
						> math.max(blade.Size.X, blade.Size.Y, blade.Size.Z)) then
						blade = part
					end
				end
			end
			if blade then
				local size = blade.Size
				attach(blade, math.max(size.X, size.Y, size.Z), true)
			end
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
	local function pulseAt(atom: string, cf: CFrame, color: Color3, accent: Color3, endDia: number, count: number, style: string?)
		if not CommonVFX or not CommonVFX.Create then return end
		pcall(CommonVFX.Create, atom, {
			parent = workspace, cframe = cf, duration = 0.42, color = color, accent = accent,
			startDiameter = 1.4, endDiameter = endDia, startSize = 0.46, endSize = 2.6, count = count,
			style = style,
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
	-- [폰트 뭉개짐 방지] 라벨 글자 크기는 이벤트당 한 번만 고정하고 팝 애니메이션은 UIScale로 처리한다.
	local comboPopScale = Instance.new("UIScale")
	comboPopScale.Scale = 1
	comboPopScale.Parent = comboLabel
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
		comboLabel.TextSize = targetSize
		comboLabel.TextColor3 = accent or (if milestone then Color3.fromRGB(255, 226, 112) else Color3.fromRGB(232, 249, 255))
		comboLabel.TextTransparency = 0
		comboLabel.TextStrokeTransparency = 0.15
		comboLabel.Rotation = 0
		comboLabel.Position = UDim2.fromScale(0.5, if milestone then 0.245 else 0.27)
		comboPopScale.Scale = if milestone then 1.20 else 1.13
		comboPopTween = TweenService:Create(comboPopScale, TweenInfo.new(0.13, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
			Scale = 1,
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
	do -- [Luau 지역변수 한도] 목표 잠금 표식 상태를 연결 내부에 보존
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
	end

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
		refreshAutoHitPips()
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
	-- [연타 성공 시네마] 원본 5타 간격 축하를 유지하되, 자동 강타 성공 때는 중복 축하 대신 무기별 1회 필살 연출로 통합.
	-- 기존 피격/쿨타임/무기 숙련의 판정에는 관여하지 않으며, 모바일에는 최소한의 기존 공용 VFX만 쓴다.
	local function comboCinema(n: number, isRecord: boolean, autoHeavy: boolean?)
		local _, h0 = char3()
		local precision = if streakAttempts > 0 then streakLanded / streakAttempts else 1
		local qualified = if n >= 200 then precision >= 0.95 elseif n >= 100 then precision >= 0.90
			elseif n >= 50 then precision >= 0.85 elseif n >= 25 then precision >= 0.70 else true
		local spectacular = qualified and (n == 25 or n == 50 or n == 100 or n == 200 or (n > 200 and n % 100 == 0))
		local title = if not qualified then "정밀도 부족" elseif n >= 200 then "신화" elseif n >= 100 then "전설"
			elseif n >= 50 then "폭주" elseif n >= 25 then "질주" elseif n >= 10 then "가속" else "연결"
		local family = wpn.family
		local color = if autoHeavy then
			(if family == "fist" then Color3.fromRGB(255, 221, 155)
			elseif family == "dagger" then Color3.fromRGB(126, 249, 206)
			elseif family == "axe" then Color3.fromRGB(255, 127, 91)
			elseif family == "spear" then Color3.fromRGB(119, 224, 255)
			elseif family == "blunt" then Color3.fromRGB(248, 193, 119)
			elseif wpn.motion == "CROSSBOW" then Color3.fromRGB(188, 218, 255)
			elseif family == "bow" then Color3.fromRGB(156, 237, 169)
			elseif family == "firearm" then Color3.fromRGB(255, 203, 111)
			else Color3.fromRGB(243, 218, 149))
			elseif n >= 200 then Color3.fromRGB(255, 155, 231)
			elseif n >= 100 then Color3.fromRGB(255, 115, 102)
			elseif n >= 50 then Color3.fromRGB(255, 218, 107)
			elseif n >= 25 then Color3.fromRGB(187, 150, 255)
			else Color3.fromRGB(112, 214, 255)
		showCombo(if autoHeavy then string.format("%d연타 · %s 필살!%s", n, wpn.name, if isRecord then " · 신기록" else "")
			else string.format("%d연타 · %s%s!", n, title, if isRecord then " · 역대 신기록" else ""), true, color)
		if n >= 10 or autoHeavy then
			screenFlash(color, if visualMobile then (if autoHeavy then 0.88 else 0.90)
				else (if autoHeavy then 0.77 elseif spectacular then 0.68 else 0.83))
		end
		local now = os.clock()
		-- [강타 연속성] 필살/대기록도 관절 재생을 멈추지 않고 화면 흔들림만 증폭한다.
		shakeUntil = math.max(shakeUntil, now + (if autoHeavy then 0.17 else 0.15))
		shakeAmp = if visualMobile then (if autoHeavy then 0.27 else 0.22)
			else (if autoHeavy then 0.55 elseif spectacular then 0.72 else 0.35)
		-- 실제 무기 강타음은 기존 startSwing에서 1회 재생. 여기서는 짧은 성공 알림만 사용한다.
		if autoHeavy then
			sfx(if spectacular then "sfx_fanfare" else "sfx_card_ring", if visualMobile then 0.27 else 0.36, 1.25)
		elseif spectacular then
			sfx("sfx_fanfare", if visualMobile then 0.35 else 0.48, 1 + math.min(n, 200) / 350)
		elseif n % 10 == 0 then
			sfx("sfx_card_ring", 0.43, 1 + math.min(n, 100) / 260)
		else
			sfx("sfx_card_chain", 0.22, 1.05)
		end
		if not h0 then return end
		if autoHeavy then
			-- [5타 필살] 무기별 고유 광선/검광/충격. 기존 heavy 1회에만 더하는 순수 시각 연출.
			local front = h0.Position + h0.CFrame.LookVector * (if wpn.ranged then 8 else 5)
			local reach = math.max(7, wpn.range * 2)
			local ch = player.Character
			if family == "fist" then
				trailsOn(ch, { "RightHand", "LeftHand", "RightLowerArm" }, color, 0.23, 0.38)
				pulseAt("CRITICAL_BURST", h0.CFrame * CFrame.new(0, 2, -3), color, Color3.fromRGB(255, 251, 221),
					7, if visualMobile then 3 else 8)
				shockRing(front - Vector3.new(0, 1.5, 0), 10, color, 0.27)
			elseif family == "dagger" then
				slashArc(h0, color, reach * 0.85, 73, -34)
				slashArc(h0, color:Lerp(Color3.new(1, 1, 1), 0.45), reach * 0.85, 74, 34)
				afterimage(ch, color, if visualMobile then 1 else 3, 0.045)
			elseif family == "axe" then
				slashArc(h0, color, reach * 1.1, 125, -41)
				shards(front, if visualMobile then 4 else 10, color, 5)
				shockRing(front - Vector3.new(0, 2.2, 0), 12, color, 0.28)
			elseif family == "spear" then
				slashArc(h0, color, reach * 1.15, 38, 0)
				pulseAt("IMPACT_FLASH", h0.CFrame * CFrame.new(0, 1.3, -reach * 0.65), color,
					Color3.new(1, 1, 1), 9, if visualMobile then 3 else 7)
			elseif family == "blunt" then
				shockRing(front - Vector3.new(0, 1.8, 0), 13, color, 0.27)
				shards(front, if visualMobile then 3 else 8, color, 4)
			elseif wpn.motion == "CROSSBOW" then
				-- [볼트 환영 탄도] 빈 공간을 지나는 빛선. 실제 볼트/피해 판정은 뒤의 기존 1발만 처리한다.
				arrowTrail(h0.Position + Vector3.new(0, 1.4, 0), front + h0.CFrame.LookVector * 24,
					nil, nil, wpn.motion, true)
				pulseAt("IMPACT_FLASH", h0.CFrame * CFrame.new(0, 1.3, -2.8), color,
					Color3.fromRGB(255, 246, 227), 5, if visualMobile then 2 else 5)
			elseif family == "bow" then
				arrowTrail(h0.Position + Vector3.new(0, 1.4, 0), front + h0.CFrame.LookVector * 25,
					nil, nil, wpn.motion, true)
				trailsOn(ch, { "RightHand", "LeftHand", "RightLowerArm" }, color, 0.22, 0.36)
			elseif family == "firearm" then
				pulseAt("CRITICAL_BURST", h0.CFrame * CFrame.new(0, 1.3, -2.9), color,
					Color3.fromRGB(255, 250, 226), 7, if visualMobile then 3 else 8)
				arrowTrail(h0.Position + Vector3.new(0, 1.4, 0), front + h0.CFrame.LookVector * 29,
					nil, nil, wpn.motion, true)
			else
				-- 검/도검: 좌우 교차검광과 전방 황금 파동.
				slashArc(h0, color, reach, 110, -33)
				slashArc(h0, color:Lerp(Color3.new(1, 1, 1), 0.4), reach, 110, 33)
				shockRing(front - Vector3.new(0, 1.8, 0), 10, color, 0.26)
			end
			if n >= 10 then
				shockRing(h0.Position - Vector3.new(0, 2.3, 0), if spectacular then 19 else 12, color, 0.31)
			end
		elseif n % 10 == 0 or spectacular then
			shockRing(h0.Position - Vector3.new(0, 2.5, 0), if spectacular then 22 else 12, color, 0.32)
			if spectacular then
				pulseAt("UPGRADE_BURST", h0.CFrame * CFrame.new(0, -1.5, 0), color, Color3.fromRGB(255, 245, 225), 11,
					if visualMobile then 8 else 16)
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
		-- [기존 숙련 2·3타 버그] STUD은 이 함수 아래 지역변수여서 참조 불가. 기존 1거리=2스터드 그대로 사용.
		local reach = math.max(7, wpn.range * 2)
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

	local function strikeEnemy(e, mult: number, hrpPos: Vector3, knock: number, stagger: boolean?, quiet: boolean?, ownerAttack: boolean?, actionSeq: number?, attackerWeapon, basicAttack: boolean?, impactBeat: number?)
		-- [동료 무기음] 실제 공격자의 장비를 따라가고 피해·보상은 기존 공식 그대로 둔다.
		local impactWeapon = attackerWeapon or wpn
		-- [병종별 실전 방어] 궁수·투척병은 뒤로 미끄러지고 검병은 측면 회피,
		-- 두목은 드물게 측면 축발로 빠진다. 방패병은 회피 대신 정면 방패 사용.
		-- 강타/기절은 확실히 명중하게 회피를 금지하고 각 적마다 재사용 제한을 둔다.
		local evadeAt = os.clock()
		local dodgeRole = e.ac.kind == "archer" or e.ac.kind == "grunt" or e.boss
		local dodgeChance = if e.boss then 0.10 elseif e.ac.kind == "archer" then 0.22 else 0.14
		local dodgeGap = if e.ac.kind == "archer" then 5.2 else 7
		if dodgeRole and not stagger and not quiet and not e.ac.dead
			and (e.ac.state == "chase" or e.ac.state == "recover")
			and evadeAt - (e.lastDodge or -100) >= dodgeGap and math.random() < dodgeChance then
			local away = (e.root.Position - hrpPos) * Vector3.new(1, 0, 1)
			if away.Magnitude > 0.1 then
				-- [지형을 읽는 회피] 우선 방향이 벽·동료·맵 경계에 막히면 반대로 피한다.
				-- 실제 기존 회피 확률과 회피 시간은 그대로 유지하며 성공하는 경로만 고른다.
				local side = Vector3.new(-away.Unit.Z, 0, away.Unit.X) * (e.tacticSide or 1)
				local stepLen = if e.ac.kind == "archer" then 5.4 else 4.2
				local obstacleParams = RaycastParams.new()
				obstacleParams.FilterType = Enum.RaycastFilterType.Exclude
				obstacleParams.FilterDescendantsInstances = { e.model, player.Character }
				local dodgeDir = nil
				for choice = 1, 2 do
					local candidateSide = if choice == 1 then side else -side
					local candidate = if e.ac.kind == "archer"
						then (away.Unit * 0.82 + candidateSide * 0.18).Unit else candidateSide
					local target = e.root.Position + candidate * stepLen
					if math.abs(target.X - ORIGIN.X) < half - 8 and math.abs(target.Z - ORIGIN.Z) < half - 8 then
						local blocked = false
						local ray = workspace:Raycast(e.root.Position + Vector3.new(0, 1.6, 0), candidate * stepLen, obstacleParams)
						if ray and ray.Instance.CanCollide then blocked = true end
						if not blocked then
							for _, other in enemies do
								if other ~= e and not other.ac.dead and other.root and other.root.Parent
									and (other.root.Position - target).Magnitude < 3.8 then
									blocked = true
									break
								end
							end
						end
						if not blocked then
							dodgeDir = candidate
							e.tacticSide = if choice == 1 then (e.tacticSide or 1) else -(e.tacticSide or 1)
							break
						end
					end
				end
				if dodgeDir then
					e.lastDodge, e.dodgeT0, e.dodgeUntil, e.dodgeDir = evadeAt, evadeAt, evadeAt + 0.36, dodgeDir
					-- 선택한 실제 좌/우 회피 방향을 R15 어깨·발목 모션에도 전달한다.
					e.model:SetAttribute("FieldEnemyDodgeSide", e.tacticSide)
					e.hurtAt = -100
					e.model:SetAttribute("FieldEnemyReaction", if e.ac.kind == "archer" then "backstep" else "sidestep")
					if e.tag and e.tag.Parent then
						local oldText = e.tag.Text
						e.tag.Text = if e.ac.kind == "archer" then "후퇴!" else "회피!"
						task.delay(0.42, function()
							if e.tag and e.tag.Parent and (e.tag.Text == "회피!" or e.tag.Text == "후퇴!") then e.tag.Text = oldText end
						end)
					end
					burst(e.root.Position + Vector3.new(0, 1.6, 0), if visualMobile then 3 else 8, false, "dodge")
					sfx("sfx_skill_evade", 0.45, 1.18)
					return
				end
			end
		end
		-- [실물 방패 판정] 등록된 방패가 실제 왼손에 들려 있고 적 정면에서 오는 직접 공격일 때만 방어한다.
		-- 경직, 측면·후방, 광역 피해는 방패에 막히지 않는다. 기존 70% 방어율은 보존한다.
		local approach = (hrpPos - e.root.Position) * Vector3.new(1, 0, 1)
		local shieldBlocked = not quiet and e.shieldModel and e.ac.def.frontGuard
			and e.ac.state ~= "stagger" and not stagger and approach.Magnitude > 0.1
			and e.root.CFrame.LookVector:Dot(approach.Unit) > 0.35
			and e.model:FindFirstChild("FieldShield") ~= nil
		-- 검병·돌진병·두목은 실제 손의 무기로 측면 받아치기를 할 수 있다.
		-- 무기 없는 적/원거리 탄환/강타에는 무기 막기를 적용하지 않는다.
		local parryRole = e.ac.kind == "grunt" or e.ac.kind == "charger" or e.boss
		local weaponParry = not quiet and not stagger and not impactWeapon.ranged and not shieldBlocked
			and parryRole and approach.Magnitude > 0.1
			and e.root.CFrame.LookVector:Dot(approach.Unit) > 0.22
			and (e.ac.state == "chase" or e.ac.state == "recover")
			and evadeAt >= (e.nextParryAt or 0)
			and math.random() < (if e.boss then 0.16 elseif e.ac.kind == "charger" then 0.20 else 0.13)
		if weaponParry then
			e.parryUntil, e.nextParryAt = evadeAt + 0.37, evadeAt + (if e.boss then 6 else 4.5)
			-- [방어 후 반격] 기존 AC 공격 대기·공격권을 유지하며 다음 허용 차례만 우선 배정한다.
			e.counterReadyAt, e.counterUntil = evadeAt + 0.37, evadeAt + 2.2
			e.tacticAt = 0
			e.model:SetAttribute("FieldEnemyReaction", "parry")
		elseif shieldBlocked then
			e.guardUntil = evadeAt + 0.37
			-- 방패병은 무한 반격하지 않고 제한된 창에서만 공격 차례 우선권을 가진다.
			if evadeAt >= (e.nextGuardCounterAt or 0) then
				e.counterReadyAt, e.counterUntil = evadeAt + 0.37, evadeAt + 1.8
				e.nextGuardCounterAt = evadeAt + 4.2
			end
			e.model:SetAttribute("FieldEnemyReaction", "shield")
		end
		-- [약점·반격 · 2026-11-28] 적마다 노릴 곳(AC.weakness) + 완벽 회피 직후 1.6초 반격 ×2.
		local inFront = approach.Magnitude > 0.1 and e.root.CFrame.LookVector:Dot(approach.Unit) > 0.35
		local weakMult, weakLabel = AC.weakness(e.ac, inFront, approach.Magnitude / 2)
		local counterHit = ownerAttack ~= false and not quiet and os.clock() < (pl.counterUntil or 0)
		if counterHit then pl.counterUntil = 0 end
		if weaponParry or shieldBlocked then weakMult, weakLabel = 1, nil end
		local dealt, died = AC.damageEnemy(e.ac, BASE_DMG * (if quiet then 1 else wpn.power)
			* (if os.clock() < (pl.buffUntil or 0) then 1.3 else 1)
			* (if weaponParry then 0.52 else 1) * weakMult * (if counterHit then 2 else 1)
			* (if e.boss and os.clock() < (e.armorUntil or 0) then 0.6 else 1), mult, shieldBlocked == true, stagger)
		if counterHit then
			showCombo("반격 ×2!", true, Color3.fromRGB(122, 240, 246))
		elseif weakLabel then
			showCombo("약점! " .. weakLabel, true, Color3.fromRGB(255, 196, 90))
			e.model:SetAttribute("FieldWeakHit", weakLabel)
			if pl.fieldChallenge then pl.fieldChallenge.weakHits = (pl.fieldChallenge.weakHits or 0) + 1 end
		end
		-- [두목 단계 · 2026-11-28] 체력 2/3 아래 분노(빨라짐), 1/3 아래 최후의 일격(사거리↑·빈틈 길어짐)
		if e.boss and not died then
			local ratio = e.ac.hp / math.max(1, e.maxHp)
			if ratio < 0.66 and not e.bossPhase2 then
				e.bossPhase2 = true
				e.ac.def = table.clone(e.ac.def)
				e.ac.def.speed *= 1.25
				e.ac.def.windup *= 0.85
				e.speed = e.ac.def.speed
				e.model:SetAttribute("FieldBossPhase", 2)
				showCombo("두목 분노! · 2단계 — 더 빨라졌다", true, Color3.fromRGB(255, 110, 80))
				screenFlash(Color3.fromRGB(255, 90, 60), 0.82)
				sfx("sfx_horn", 0.5, 0.8)
			elseif ratio < 0.33 and not e.bossPhase3 then
				e.bossPhase3 = true
				e.ac.def = table.clone(e.ac.def)
				e.ac.def.range *= 1.2
				e.ac.def.recover *= 1.6
				e.model:SetAttribute("FieldBossPhase", 3)
				showCombo("최후의 일격! · 크게 내려친 뒤가 빈틈", true, Color3.fromRGB(255, 70, 60))
				screenFlash(Color3.fromRGB(255, 60, 40), 0.78)
				shakeUntil, shakeAmp = os.clock() + 0.4, 1.4
				sfx("sfx_event_danger", 0.6, 0.75)
			end
		end
		e.hp = e.ac.hp
		if died or stagger then e.counterUntil = 0 end -- 기절·쓰러진 몹은 방어 뒤 반격을 예약하지 않는다.
		e.hurtAt = os.clock()
		e.hitVariant = (e.hitVariant or 0) % 3 + 1
		e.model:SetAttribute("FieldHitVariant", e.hitVariant)
		e.bar.Size = UDim2.fromScale(math.max(e.ac.hp, 0) / e.maxHp, 1)
		-- [검증용 읽기 전용] Studio 지상전 검사가 실제 타격 결과를 확인한다. 피해 계산·판정 불변.
		e.model:SetAttribute("FieldEnemyHpRatio", math.max(e.ac.hp, 0) / e.maxHp)
		local away = (e.root.Position - hrpPos) * Vector3.new(1, 0, 1)
		if not died and stagger and knock >= 4 and not e.boss and not shieldBlocked
			and evadeAt - (e.lastFallAt or -100) >= 3.5 then
			-- 강타/스킬 → 밀려나며 넘어짐 → 바닥 버팀 → 무릎으로 일어남.
			-- 기존 ActionCombat.stagger로 기상 전 공격·이동을 막는다.
			e.lastFallAt, e.knockAt = evadeAt, evadeAt
			e.knockUntil, e.riseUntil = evadeAt + 0.78, evadeAt + 1.57
			e.knockVariant = e.hitVariant
			e.ac.stagger = math.max(e.ac.stagger, 1.57)
			e.ac.state = "stagger"
			e.model:SetAttribute("FieldEnemyReaction", "knockdown")
		elseif not died and e.boss and stagger then
			-- 두목은 완전히 넘어지지 않고 한쪽 무릎을 꿇으며 버텨 다음 공격을 준비한다.
			e.holdUntil = evadeAt + 0.42
			e.model:SetAttribute("FieldEnemyReaction", "boss-brace")
		end
		if away.Magnitude > 0.1 and not e.ac.def.boss then
			-- 짧은 후퇴를 감속시켜 강타가 아닌 평타도 몸이 밀리는 걸 보여 준다.
			e.kbVel = away.Unit * (knock / 0.11)
			e.kbUntil = evadeAt + (if e.riseUntil > evadeAt then 0.30 else 0.18)
			e.kbT0 = evadeAt
		end
		if not quiet then
			local hitAt = os.clock()
			-- [실제 명중] 강타·스킬도 공격 모션 시간을 멈추지 않는다. 기존 피해/넉백은 유지한다.
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
				-- [속사 입력 역전 방지] 발사 시 캡처한 공격 종류를 사용한다.
				-- 다음 공격이 먼저 입력돼도 0.14초 지연된 이전 평타의 명중은 정확하게 1회 기록한다.
				if basicAttack == true then
					pl.autoNormalHits = (pl.autoNormalHits or 0) + 1
					pl.supportHits = (pl.supportHits or 0) + 1
					-- [오너 지시 2026-11-28] 스킬은 처음부터 안 됨: 무기 숙련(경험치) 2단부터 열리고, 명중할 때 확률로 자동 발동.
					-- 2단 8% · 3단 11% · 4단 14% · 5단 17%, 최소 4초 간격. 4단부터 적 2명 이상 가까우면 회전 베기도 확률 발동.
					local rankNow = pl.masteryRank or 1
					local chanceNow = if rankNow >= 5 then math.min(0.25, 0.17 + (rankNow - 5) * 0.016) elseif rankNow == 4 then 0.14 elseif rankNow == 3 then 0.11 elseif rankNow == 2 then 0.08 else 0
					if chanceNow > 0 and hitAt - (pl.lastAutoSkillAt or -100) >= 4 and comboRng:NextNumber() < chanceNow then
						pl.lastAutoSkillAt = hitAt
						pl.autoHeavyFire = pl.autoNormalHits
						local near = 0
						for _, o in enemies do
							if not o.ac.dead and (o.root.Position - hrpPos).Magnitude < 14 then near += 1 end
						end
						pl.autoSkillKind = if rankNow >= 4 and near >= 2 and comboRng:NextNumber() < 0.5 then "sweep" else "heavy"
						local owner = player.Character
						if owner then owner:SetAttribute("FieldAutoSkillPending", pl.autoNormalHits) end
					end
					refreshAutoHitPips()
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
				-- [스킬 축하 충돌 방지] 5번째 명중에 발동할 자동 강타는 실제 성공 후 한 번만 축하한다.
				local autoHeavyReady = basicAttack == true
					and (pl.autoNormalHits or 0) > 0 and pl.autoHeavyFire == pl.autoNormalHits
					and (pl.cd.heavy or -100) <= hitAt and pl.hp > 0
				if autoHeavyReady then
					pl.autoHeavyRecord = isRecord -- 저장되지 않는 장면 임시 표시. 25타 등 최고 기록 축하를 자동 강타까지 전달.
					showCombo(string.format("숙련 %d단 · %s 발동!", pl.masteryRank or 2, if pl.autoSkillKind == "sweep" then "회전 베기" else "강타"), false, Color3.fromRGB(255, 226, 156))
				elseif streakN % 5 == 0 then
					comboCinema(streakN, isRecord)
				elseif miracle and not isRecord then
					showCombo(string.format("%d연타 · 기적의 연결!", streakN), true, accent)
				else
					-- [1~4타 연출] 기존 무기별 R15 연속동작 위에만 짧은 빛을 얹는다.
					local basicHit = basicAttack == true
					if basicHit and streakN <= 2 then
						trailsOn(player.Character, { "RightHand", "RightLowerArm" }, accent, 0.12, 0.18)
					elseif basicHit and streakN == 3 then
						screenFlash(accent, if visualMobile then 0.965 else 0.935)
						trailsOn(player.Character, { "RightHand", "RightLowerArm", "LeftHand" }, accent, 0.17, 0.25)
					elseif false then
						local rim = attackBtn:FindFirstChildOfClass("UIStroke")
						if rim then
							TweenService:Create(rim, TweenInfo.new(0.12), { Color = Color3.fromRGB(255, 236, 143), Thickness = 5 }):Play()
							task.delay(0.22, function()
								if rim.Parent then
									TweenService:Create(rim, TweenInfo.new(0.2), { Color = Color3.fromRGB(255, 192, 112),
										Thickness = if visualMobile then 4 else 3 }):Play()
								end
							end)
						end
					end
					showCombo(if false
						then ""
						else string.format("%d연타 · %s%s", streakN, grade, if isRecord then " · 역대 신기록!" else ""), isRecord, accent)
					if isRecord then sfx("sfx_card_ring", 0.52, 1.24) end
				end
			end
		end
		-- [무기 타격감] 동일 피해·보상은 유지하고 원본 사운드·이펙트만 무기별로 차별화한다.
		local impactPos = e.root.Position + Vector3.new(0, 2, 0)
		local family = impactWeapon.family
		local rangedImpact = impactWeapon.ranged and (family == "bow" or family == "firearm")
		-- [실제 적중 1회당 1번] 방패/패링/동료/스킬과 섞이지 않고 플레이어 연타가 닿은 표면만 정밀하게 밝힌다.
		-- 시각 효과만 교체하고 기존 damageEnemy·명중계수·숙련·경직·보상은 그대로 유지한다.
		local detailedContact = basicAttack == true and ownerAttack ~= false and not quiet
			and not shieldBlocked and not weaponParry and actionSeq ~= nil and actionSeq > 0
			and impactBeat ~= nil and swingBridge.impactSeq ~= actionSeq
			and dealt > 0 and CommonVFX ~= nil and CommonVFX.Create ~= nil
		if detailedContact then
			swingBridge.impactSeq = actionSeq
			if CommonVFX and CommonVFX.Create then
				local beat = math.clamp(math.floor(impactBeat), 1, 10)
				local side = if beat % 2 == 0 then -1 else 1
				local thrust = family == "spear" or impactWeapon.motion == "RAPIER"
				local sharp = family == "dagger" or family == "blade" or thrust
				local heavy = family == "axe" or family == "blunt"
				local fist = family == "fist"
				local bow = family == "bow"
				local crossbow = impactWeapon.motion == "CROSSBOW"
				local rifle = impactWeapon.motion == "RIFLE"
				local tint = if family == "dagger" then Color3.fromRGB(150, 251, 223)
					elseif thrust then Color3.fromRGB(157, 226, 255)
					elseif family == "axe" then Color3.fromRGB(255, 171, 113)
					elseif family == "blunt" then Color3.fromRGB(255, 217, 160)
					elseif fist then Color3.fromRGB(255, 237, 188)
					elseif bow then Color3.fromRGB(175, 246, 183)
					elseif crossbow then Color3.fromRGB(194, 229, 250)
					elseif rifle then Color3.fromRGB(255, 220, 166)
					elseif impactWeapon.ranged then Color3.fromRGB(255, 183, 133)
					elseif impactWeapon.motion == "KATANA" then Color3.fromRGB(209, 222, 255)
					else Color3.fromRGB(230, 242, 255)
				local size = if family == "dagger" then 1.55 elseif thrust then 2.05
					elseif heavy then 3.6 elseif fist then 2.5 elseif bow or crossbow then 1.55
					elseif impactWeapon.ranged then 2.35 else 2.9
				local angle = if thrust then side * 8 elseif family == "dagger" then side * 58
					elseif impactWeapon.motion == "KATANA" then side * 42 else side * 32
				local atom = if heavy then "CRITICAL_BURST" elseif impactWeapon.ranged or thrust or family == "dagger"
					then "IMPACT_FLASH" else "SHAPE_BURST"
				local epic = beat == 10
				local center = impactPos + e.root.CFrame.RightVector * (if family == "dagger" or fist then side * 0.25 else 0)
				local direction = (center - hrpPos) * Vector3.new(1, 0, 1)
				local contactFrame = if direction.Magnitude > 0.1 then CFrame.lookAt(center, center + direction.Unit)
					else CFrame.new(center)
				local style = if family == "dagger" then "dagger" elseif thrust then "pierce"
					elseif family == "axe" then "cleave" elseif family == "blunt" then "hammer"
					elseif fist then "fist" elseif bow then "arrow" elseif crossbow then "bolt"
					elseif impactWeapon.ranged then "gunshot" else "blade"
				pcall(CommonVFX.Create, atom, {
					parent = workspace, cframe = contactFrame, color = tint,
					accent = tint:Lerp(Color3.new(1, 1, 1), 0.76),
					style = style, rotation = angle,
					duration = if family == "dagger" then 0.13 elseif heavy then 0.27 else 0.19,
					startSize = if sharp then 0.40 else 0.55,
					endSize = size + (if epic then 1.0 else 0),
					startDiameter = if heavy then 1.1 else 0.55,
					endDiameter = if heavy then (if epic then 7 else 5.2) else 2.2,
					hideRing = not heavy, count = if visualMobile then 2 elseif heavy then 6 else 3,
					distance = if heavy then 3.8 elseif thrust then 1.2 else 2.1,
					mist = not visualMobile and heavy and beat >= 7,
				})
				-- [4·7·10타 실명중 단면] 무기별 교차 섬광·미세 파편. 기존 VFX 풀만 재사용하며 모바일은 단일 효과 유지.
				if not visualMobile and (beat == 4 or beat == 7 or beat == 10) then
					local glint = center + e.root.CFrame.RightVector * side * (if thrust then 0.12 else 0.28)
					pcall(CommonVFX.Create, "SHAPE_BURST", {
						parent = workspace, cframe = if direction.Magnitude > 0.1 then CFrame.lookAt(glint, glint + direction.Unit) else CFrame.new(glint),
						color = tint:Lerp(Color3.new(1, 1, 1), 0.72), accent = tint,
						style = style, rotation = angle - side * 58,
						hideRing = true, count = if heavy then 3 else 1,
						startSize = 0.18, endSize = if thrust then 1.35 elseif heavy then 2.35 else size * 0.65,
						duration = if heavy then 0.14 else 0.11, distance = if heavy then 1.9 else 0.9,
					})
				end
				-- [3·6·9타 잔흔] 다음 공격이 시작되면 이전 공격 예약을 취소한다.
				if not visualMobile and sharp and beat % 3 == 0 then
					local fxWeapon, hitSeq = impactWeapon.id, actionSeq
					task.delay(0.055, function()
						if finished or not e.root.Parent or wpn.id ~= fxWeapon
							or swingBridge.impactSeq ~= hitSeq then return end
						pcall(CommonVFX.Create, "SHAPE_BURST", {
							parent = workspace, cframe = contactFrame, color = tint:Lerp(Color3.new(1, 1, 1), 0.45),
							accent = tint, style = style, rotation = angle - side * 13,
							hideRing = true, count = 0, startSize = 0.23, endSize = size * 0.75, duration = 0.13,
						})
					end)
				end
			end
		end
		-- [맞는 재질감] 정밀 적중에는 중복 파열을 제거하고 방패·동료·스킬의 기존 효과는 유지한다.
		if not rangedImpact and not detailedContact then
			burst(impactPos, if visualMobile then math.min(12 + dealt, 20) else 12 + dealt, mult >= 1.5)
		end
		if weaponParry then
			sfx("sfx_metal_clash", 0.75, 1.20)
			pulseAt("BLOCK_IMPACT", CFrame.new(impactPos), Color3.fromRGB(239, 206, 130), Color3.fromRGB(255, 245, 194), 7, if visualMobile then 3 else 6)
		elseif shieldBlocked then
			sfx("sfx_metal_clash", 0.75, 0.93)
			pulseAt("BLOCK_IMPACT", CFrame.new(impactPos), Color3.fromRGB(155, 194, 224), Color3.fromRGB(255, 230, 161), 7, 5)
		elseif family == "axe" then
			-- [도끼 적중] 휘두름 슬래시와 별개로 묵직한 장갑 절삭음을 한 번만 사용한다.
			sfx("sfx_card_armor", if quiet then 0.18 else 0.40, 1.23)
			if not visualMobile then shockRing(impactPos - Vector3.new(0, 2, 0), 7, Color3.fromRGB(246, 169, 100), 0.18) end
		elseif family == "blunt" then
			-- [망치/철퇴] 저음 금속 충격으로 도끼의 날카로운 접촉음과 구분한다.
			sfx("sfx_metal_clash", if quiet then 0.19 else 0.42, 0.89)
		elseif family == "spear" then
			-- [창] 찌르기 준비 소리와 겹치지 않는 짧은 관통음을 사용한다.
			sfx("sfx_boarding_draw", if quiet then 0.17 else 0.37, 1.46)
			pulseAt("IMPACT_FLASH", CFrame.new(impactPos), Color3.fromRGB(155, 229, 248), Color3.new(1, 1, 1), 5, 4)
		elseif family == "dagger" then
			-- [단검] 빠르고 높은 음의 단일 베기 접촉음을 유지한다.
			sfx("sfx_card_blade", if quiet then 0.20 else 0.38, 1.62)
		elseif impactWeapon.motion == "CROSSBOW" then
			-- [석궁 적중] 격발과 겹치는 화기 소리를 없애고 짧은 쇠 볼트 접촉음만 사용한다.
			sfx("sfx_card_chain", if quiet then 0.16 else 0.29, 1.65)
		elseif family == "bow" then
			sfx("sfx_card_blade", if quiet then 0.14 else 0.27, 1.75)
		elseif family == "firearm" then
			-- [총탄 적중] 발포음은 사격 함수에서 한 번, 접촉음은 가벼운 금속성 잔향만 출력한다.
			sfx("sfx_card_ring", if quiet then 0.14 else 0.23, 1.65)
		elseif family == "fist" then
			-- [맨손] 휘두르는 바람소리 대신 몸체에 맞는 낮은 타격음.
			sfx("sfx_hit", if quiet then 0.17 else 0.41, 0.93)
		elseif impactWeapon.motion == "RAPIER" then
			sfx("sfx_card_blade", if quiet then 0.18 else 0.40, 1.52)
		elseif impactWeapon.motion == "SABRE" or impactWeapon.motion == "SCIMITAR" or impactWeapon.motion == "KATANA" then
			sfx("sfx_boarding_slash", if quiet then 0.22 else 0.43, 1.43)
		else
			-- [양날검] 목제 타격음 없이 금속 날 끝의 짧은 충돌음을 선택한다.
			sfx("sfx_boarding_draw", if quiet then 0.20 else 0.42, 1.34)
		end
		-- 치명타 금속음 중복을 없앤다. 타격별로 고유 오디오를 한 번만 재생한다.
		if rangedImpact and not shieldBlocked and not detailedContact then
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
			if not rangedImpact and not detailedContact then
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
			-- [3종 사망 연출] 마지막 일격 방향·병종에 따라 후방 쓰러짐/전방 무너짐/측면 굴러짐.
			-- 첫 0.7초 피격 밀림, 이후 관절이 바닥에서 진정되며 마지막에만 서서히 사라진다.
			-- 사망·전리품 판정은 이미 기존 AC.damageEnemy에서 확정하며 재출현은 없다.
			local flyDir = (e.root.Position - hrpPos) * Vector3.new(1, 0, 1)
			flyDir = if flyDir.Magnitude > 0.1 then flyDir.Unit else Vector3.zero
			local flyDist = (if mult >= 1.5 then 9 else 5) * (if e.boss then 0.3 else 1)
			local deathVariant = if e.boss then 1 else (e.hitVariant or 1)
			task.spawn(function()
				local t0 = os.clock()
				local lastP = 0
				local duration = if visualMobile then 1.35 else 1.70
				while dying.Parent and os.clock() - t0 < duration do
					local p = math.clamp((os.clock() - t0) / duration, 0, 1)
					Pose.dieR15(dying, p, deathVariant)
					local flight = math.min(p * duration / 0.70, 1)
					local ease = 1 - (1 - flight) * (1 - flight)
					pcall(function()
						dying:PivotTo(dying:GetPivot() + flyDir * flyDist * (ease - lastP))
					end)
					lastP = ease
					task.wait()
				end
				if dying.Parent then dying:Destroy() end
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
			-- [전투 목표 · 2026-11-28] 모두 쓰러뜨리면 이번 목표 달성 별(표시용, 보상·저장 불변)
			if pl.fieldChallenge and not pl.fieldChallenge.done then
				local alive = 0
				for _, o in enemies do if not o.ac.dead then alive += 1 end end
				if pl.fieldChallenge.kind == "boss" and e.boss then pl.fieldChallenge.bossFirst = alive > 0 end
				if alive == 0 then
					pl.fieldChallenge.done = true
					local elapsed = os.clock() - pl.fieldChallenge.startAt
					local ok = (pl.fieldChallenge.kind == "speed" and elapsed <= pl.fieldChallenge.limit)
						or (pl.fieldChallenge.kind == "untouched" and pl.hp / math.max(1, pl.maxHp) >= 0.7)
						or (pl.fieldChallenge.kind == "boss" and pl.fieldChallenge.bossFirst == true)
						or (pl.fieldChallenge.kind == "weak" and (pl.fieldChallenge.weakHits or 0) >= 5)
					local stars = 1 + (if ok then 1 else 0) + (if elapsed <= pl.fieldChallenge.limit * 1.5 and pl.hp / math.max(1, pl.maxHp) >= 0.5 then 1 else 0)
					folder:SetAttribute("FieldChallengeStars", stars)
					task.delay(1.2, function()
						showCombo(string.rep("★", stars) .. string.rep("☆", 3 - stars) .. "  " .. (if ok then "목표 달성! " else "목표 실패 · ") .. pl.fieldChallenge.text, true,
							if ok then Color3.fromRGB(255, 214, 90) else Color3.fromRGB(200, 190, 170))
						sfx(if ok then "sfx_fanfare" else "sfx_card_chain", 0.5, 1)
					end)
				end
			end
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
			table.insert(items, { modelName = weapon.model, hand = if weapon.family == "bow" then leftHand else rightHand, shield = false })
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
			-- [활·석궁 바로잡기] 손목 LookVector는 달리기/사격 중 수시로 회전해 실제 무기가 거꾸로 꺾이므로
			-- 몸통의 수평 전방을 기준으로 활의 긴 축을 수직, 석궁의 총몸을 전방으로 맞춘다.
			local bowHold = weapon.family == "bow" and not item.shield and not item.throwable
			local crossbowHold = weapon.motion == "CROSSBOW" and not item.shield and not item.throwable
			if bowHold or crossbowHold then
				local forward = character:GetPivot().LookVector
				forward = Vector3.new(forward.X, 0, forward.Z)
				forward = if forward.Magnitude > 0.1 then forward.Unit else Vector3.new(0, 0, -1)
				local sourceAxis = if bowHold then (if ext.X >= ext.Y and ext.X >= ext.Z then bb.RightVector
					elseif ext.Z >= ext.Y then bb.LookVector else bb.UpVector)
					else (if ext.Z >= ext.Y then bb.LookVector else bb.RightVector)
				local targetAxis = if bowHold then Vector3.yAxis else forward
				local rotation = CFrame.fromRotationBetweenVectors(sourceAxis, targetAxis)
				-- [활 활대 면 / 석궁 상부면] 축을 맞춘 뒤에도 뒤집히지 않게 몸 기준 수평/상부를 정렬한다.
				local secondary = if bowHold then (if ext.Z >= ext.Y and ext.Z >= ext.X then bb.RightVector else bb.LookVector)
					else bb.UpVector
				local rotated = rotation * secondary
				local facingPlane = if bowHold then Vector3.new(rotated.X, 0, rotated.Z)
					else rotated - forward * rotated:Dot(forward)
				local wanted = if bowHold then forward else Vector3.yAxis
				if facingPlane.Magnitude > 0.1 then
					rotation = CFrame.fromRotationBetweenVectors(facingPlane.Unit, wanted) * rotation
				end
				local placedAt = hand.Position + forward * (if bowHold then 0.30 else math.max(ext.X, ext.Y, ext.Z) * 0.25)
					+ Vector3.new(0, if bowHold then 0.02 else 0.16, 0)
				local alignedBB = CFrame.new(placedAt) * rotation * bb.Rotation
				held:PivotTo(alignedBB * bb:ToObjectSpace(held:GetPivot()))
			else
				-- 검·도끼·방패·총기의 승인 모델 장착 축과 기존 손맛은 그대로 유지한다.
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
			end
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
	do -- [Luau 지역변수 한도] 지연 로드 자산 참조가 화면 전체 레지스터를 점유하지 않게 정리
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
					-- 같은 People 인입 이벤트에서 탐험 동료도 재장착한다. 별도 반복 검사 없음.
					for _, subject in folder:GetChildren() do
						if subject:IsA("Model") and subject:GetAttribute("NpcAssetProfile")
							and subject:GetAttribute("NpcAppearanceState") ~= "ready" then
							Pose.applyRegisteredMobOutfit(subject)
						end
					end
				end)
			end))
		end
		-- [몬스터 무기·방패] 기존 적을 생성한 뒤 승인된 실물 메시를 손에 장착한다.
	end
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
				-- [전투 동선 배치] 이미 승인된 실제 통을 삼각형 위험 구역으로 모아 사격/근접 연타 대상이 된다.
				local p0 = ORIGIN + Vector3.new((i - 2) * half * 0.32, 0, half * 0.12 - (i - 1) * half * 0.26)
				m.Parent = folder
				m:PivotTo(CFrame.new(p0 + Vector3.new(0, 2, 0)))
				m:SetAttribute("FieldCombatObject", true)
				m:SetAttribute("FieldObjectMaxHp", 4)
				m:SetAttribute("FieldObjectHp", 4)
				local hl = Instance.new("Highlight")
				hl.FillColor = Color3.fromRGB(255, 90, 40)
				hl.FillTransparency = 0.75
				hl.OutlineColor = Color3.fromRGB(255, 160, 60)
				hl.Parent = m
				table.insert(barrels, { model = m, pos = p0 + Vector3.new(0, 2, 0), hp = 4 })
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
				-- [디아블로식 사물 군집] 좌우 전투 통로에 교대로 배치. 중앙 시작/조사 길은 비운다.
				local lane = if i % 2 == 0 then -1 else 1
				local row = math.floor((i - 1) / 2)
				local p0 = ORIGIN + Vector3.new(lane * (18 + row * 5), 0, half * (0.62 - row * 0.27))
				m.Parent = folder
				m:PivotTo(CFrame.new(p0 + Vector3.new(0, 1.5, 0)) * CFrame.Angles(0, rng:NextNumber(0, 6.28), 0))
				m:SetAttribute("FieldCombatObject", true)
				m:SetAttribute("FieldObjectMaxHp", 3)
				m:SetAttribute("FieldObjectHp", 3)
				table.insert(crates, { model = m, pos = p0 + Vector3.new(0, 1.5, 0), hp = 3 })
			end
		end
	end
	local function breakCrate(c, strikePower: number?)
		local idx = table.find(crates, c)
		if not idx then return false end
		-- [연타 내구도] 기존 1회 랜덤 드롭은 실제 파괴 순간에만 굴린다.
		c.hp = math.max(0, (c.hp or 3) - (strikePower or 1))
		c.model:SetAttribute("FieldObjectHp", c.hp)
		if c.hp > 0 then
			pulseAt("IMPACT_FLASH", CFrame.new(c.pos), Color3.fromRGB(226, 191, 125),
				Color3.fromRGB(255, 242, 209), 3.2, if visualMobile then 2 else 4)
			c.model:PivotTo(c.model:GetPivot() * CFrame.Angles(0, math.rad(if c.hp % 2 == 0 then 7 else -8), 0))
			sfx("sfx_card_chain", 0.24, 1.26)
			return true
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
		return true
	end

	local function explodeBarrel(b, hrp: BasePart, hitActionSeq: number?, strikePower: number?)
		local idx = table.find(barrels, b)
		if not idx then return false end
		-- [위험 사물 연타] 견제 타격에는 금속 불꽃만 튀고, 내구도 소진 뒤에만 기존 폭발/주변 피해가 발생한다.
		b.hp = math.max(0, (b.hp or 4) - (strikePower or 1))
		b.model:SetAttribute("FieldObjectHp", b.hp)
		if b.hp > 0 then
			pulseAt("IMPACT_FLASH", CFrame.new(b.pos), Color3.fromRGB(242, 144, 72),
				Color3.fromRGB(255, 238, 162), 3.5, if visualMobile then 2 else 5)
			sfx("sfx_metal_clash", 0.31, 1.25)
			return "damaged"
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
		return "exploded"
	end

	-- 동작 하나를 쓴다: 규칙 검사(쿨타임·기력·콤보) → 모션 → 범위 안의 적을 친다
	local STUD = 2 -- 규칙의 거리 1 = 2 스터드
	-- 장착한 스킬만 쓴다(주인공 스킬은 최대 3개). 공격·회피는 기본 행동이라 늘 쓸 수 있다.
	local equipped = { heavy = true, sweep = true }
	local function useMove(moveId: string, ultimateCast: boolean?)
		if finished then
			return
		end
		if ultimateCast and ((pl.masteryRank or 1) < 8 or (moveId ~= "heavy" and moveId ~= "sweep")) then return end
		if (moveId == "heavy" or moveId == "sweep") and not equipped[moveId] and not ultimateCast
			and not (moveId == "sweep" and (pl.masteryRank or 1) >= 4) then
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
		-- [평타 접근] 이전 보간이 남아 있으면 다음 공격·회피의 실제 현재 위치부터 다시 진행한다.
		if swingBridge.lungeTween then
			swingBridge.lungeTween:Cancel()
			swingBridge.lungeTween = nil
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
			-- [정규 직업 코드 호환] 한국어 직업명뿐 아니라 저장 없이 전달된 warrior/gunner 등 영문 분류도 그대로 인식한다.
			local dodgeStyle = if JobSkills.Categories[profession] then profession else JobSkills.categoryOf(profession)
			if ch0 then
				ch0:SetAttribute("FieldDodgeStyle", dodgeStyle)
				-- [시각 교대] 같은 직업도 회피마다 6종 묘기를 순환하며 왼쪽·오른쪽 전신 동작을 바꾼다.
				ch0:SetAttribute("FieldDodgeBeat", -(ch0:GetAttribute("FieldDodgeBeat") or -1))
				ch0:SetAttribute("FieldDodgeTrick", (ch0:GetAttribute("FieldDodgeTrick") or 0) % 6 + 1)
			end
			local dodgeOrigin = hrp.CFrame
			-- [완벽 회피 판정 준비] 누르는 순간 이미 공격 예고/진행 중이던 적만 기록한다.
			-- 실제 적 공격이 무적 시간 내에 빗나가야 성공. 단순 연속 회피·멀리서 누르기로 발동하지 않는다.
			local matrixThreats = {}
			for _, enemy in enemies do
				local state = enemy.ac.state
				if not enemy.ac.dead and (state == "windup" or state == "active")
					and (enemy.root.Position - dodgeOrigin.Position).Magnitude <= enemy.ac.def.range * STUD + 8 then
					matrixThreats[enemy] = true
				end
			end
			pl.matrixDodgeUntil = now + (mv.invuln or 0.35)
			pl.matrixDodgeOrigin = dodgeOrigin.Position
			pl.matrixDodgeThreats = matrixThreats
			pl.matrixDodgeConsumed = false
			local look = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
			if look.Magnitude > 0.1 then
				hrp.CFrame = hrp.CFrame + look.Unit * 14
			end
			-- [직업별 회피 영화식 연출] 시작·잔상·착지 3단계. 공격 판정/무적/기력/저장/이동 거리는 변경하지 않는다.
			-- 승인된 기존 공용 VFX와 사운드만 재사용하며, 모바일은 입자와 잔상 수를 줄인다.
			local mobile = visualMobile == true
			local originGround = dodgeOrigin * CFrame.new(0, -2.2, 0)
			local landingGround = hrp.CFrame * CFrame.new(0, -2.2, 0)
			if dodgeStyle == "warrior" then
				-- 무인: 검광을 두르고 어깨 구르기 → 금속성 착지 충격.
				local steel, spark = Color3.fromRGB(110, 205, 246), Color3.fromRGB(255, 222, 133)
				trailsOn(ch0, { "RightHand", "RightLowerArm", "LeftHand", "LeftLowerLeg", "RightLowerLeg" }, steel, 0.35, 0.72)
				afterimage(ch0, steel, if mobile then 2 else 4, 0.055)
				pulseAt("DODGE_EVASION_PULSE", originGround, steel, spark, 9, if mobile then 5 else 10)
				pulseAt("BLOCK_IMPACT", landingGround, spark, steel, 11, if mobile then 6 else 12)
				sfx("sfx_boarding_draw", 0.22, 1.34)
			elseif dodgeStyle == "gunner" then
				-- 포수: 낮은 슬라이딩 궤적 → 탄피빛 선광과 조준선 회복.
				local smoke, flash = Color3.fromRGB(131, 186, 210), Color3.fromRGB(255, 198, 113)
				trailsOn(ch0, { "LeftHand", "RightHand", "RightLowerArm", "LeftFoot", "RightFoot" }, flash, 0.36, 0.54)
				afterimage(ch0, smoke, if mobile then 2 else 4, 0.05)
				pulseAt("SHAPE_BURST", originGround, smoke, flash, 7, if mobile then 4 else 8)
				pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(0, 1, -1.8), flash, smoke, 5, if mobile then 3 else 6)
				sfx("sfx_card_chain", 0.23, 1.52)
			elseif dodgeStyle == "navigator" then
				-- 항해사: 바람을 가르며 공중제비 → 양쪽 발의 바람 소용돌이.
				local wind, foam = Color3.fromRGB(95, 230, 213), Color3.fromRGB(204, 251, 246)
				trailsOn(ch0, { "LeftFoot", "RightFoot", "LeftLowerLeg", "RightLowerLeg", "LeftHand" }, wind, 0.40, 0.72)
				afterimage(ch0, wind, if mobile then 2 else 5, 0.045)
				pulseAt("DODGE_EVASION_PULSE", originGround, wind, foam, 12, if mobile then 6 else 12)
				pulseAt("SHAPE_BURST", landingGround, foam, wind, 9, if mobile then 4 else 9)
				sfx("sfx_rope_release", 0.28, 1.48)
			elseif dodgeStyle == "merchant" then
				-- 상인: 금빛 피벗과 동전빛 궤적. 금화/보상은 실제 지급하지 않는다.
				local gold, ivory = Color3.fromRGB(255, 206, 98), Color3.fromRGB(255, 244, 196)
				trailsOn(ch0, { "LeftHand", "RightHand", "LeftFoot", "RightFoot" }, gold, 0.34, 0.54)
				afterimage(ch0, gold, if mobile then 2 else 4, 0.06)
				pulseAt("UPGRADE_BURST", originGround, gold, ivory, 7, if mobile then 4 else 8)
				pulseAt("SHAPE_BURST", landingGround, ivory, gold, 8, if mobile then 5 else 9)
				sfx("sfx_coin", 0.26, 1.28)
			elseif dodgeStyle == "doctor" then
				-- 의사: 청록 응급 회피 → 부드러운 생체 빛과 손목 재정렬. 체력 회복 효과는 없다.
				local jade, white = Color3.fromRGB(112, 229, 182), Color3.fromRGB(237, 255, 246)
				trailsOn(ch0, { "LeftHand", "RightHand", "LeftLowerArm", "LeftFoot", "RightFoot" }, jade, 0.34, 0.52)
				afterimage(ch0, jade, if mobile then 2 else 4, 0.06)
				pulseAt("HEAL_PULSE", originGround, jade, white, 7, if mobile then 4 else 7)
				pulseAt("DODGE_EVASION_PULSE", landingGround, jade, white, 10, if mobile then 5 else 10)
				sfx("sfx_card_magic", 0.23, 1.30)
			elseif dodgeStyle == "clergy" then
				-- 성직자: 금빛 성역 개방 → 기도 도약 → 후광 착지. 실제 보호막은 생성하지 않는다.
				local gold, pearl = Color3.fromRGB(252, 218, 125), Color3.fromRGB(244, 242, 255)
				trailsOn(ch0, { "LeftHand", "RightHand", "LeftLowerArm", "RightLowerArm", "LeftLowerLeg", "RightLowerLeg" }, gold, 0.44, 0.74)
				auraOn(ch0, gold, pearl, 0.53)
				afterimage(ch0, gold, if mobile then 2 else 5, 0.05)
				pulseAt("DODGE_EVASION_PULSE", originGround, gold, pearl, 12, if mobile then 6 else 13)
				pulseAt("BLOCK_IMPACT", landingGround, gold, pearl, 15, if mobile then 7 else 14)
				pulseAt("HEAL_PULSE", hrp.CFrame * CFrame.new(0, 0.5, 0), pearl, gold, 7, if mobile then 3 else 8)
				sfx("sfx_card_magic", 0.26, 1.22)
			elseif dodgeStyle == "scholar" then
				-- 학자: 시작 위치 지식문양 → 푸른 공간 궤적 → 보랏빛 귀환 문양.
				local cyan, violet = Color3.fromRGB(94, 228, 239), Color3.fromRGB(177, 157, 255)
				trailsOn(ch0, { "LeftHand", "RightHand", "LeftLowerArm", "RightLowerArm", "LeftFoot", "RightFoot" }, cyan, 0.44, 0.72)
				auraOn(ch0, violet, cyan, 0.50)
				afterimage(ch0, violet, if mobile then 2 else 5, 0.05)
				pulseAt("UPGRADE_BURST", originGround, cyan, violet, 12, if mobile then 6 else 12)
				pulseAt("DODGE_EVASION_PULSE", landingGround, violet, cyan, 14, if mobile then 7 else 15)
				pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(0, 0.5, 0), cyan, violet, 6, if mobile then 3 else 7)
				sfx("sfx_card_spell", 0.23, 1.34)
			end
			-- [회피 중간 궤적] 착지와 분리된 한 번의 짧은 시각 섬광. 모바일은 입자 2개로 제한.
			task.delay(0.13, function()
				if finished or not hrp.Parent or swingKind ~= "dash" then return end
				local glideColor = if dodgeStyle == "warrior" then Color3.fromRGB(110, 205, 246)
					elseif dodgeStyle == "gunner" then Color3.fromRGB(255, 198, 113)
					elseif dodgeStyle == "navigator" then Color3.fromRGB(95, 230, 213)
					elseif dodgeStyle == "merchant" then Color3.fromRGB(255, 206, 98)
					elseif dodgeStyle == "doctor" then Color3.fromRGB(112, 229, 182)
					elseif dodgeStyle == "clergy" then Color3.fromRGB(252, 218, 125)
					else Color3.fromRGB(177, 157, 255)
				-- [7직업 회피 궤적] 포수는 발화, 항해사는 바람, 의사·성직자는 부드러운 광휘로 분리.
				local atom = if dodgeStyle == "gunner" then "IMPACT_FLASH"
					elseif dodgeStyle == "clergy" or dodgeStyle == "doctor" then "HEAL_PULSE"
					elseif dodgeStyle == "scholar" then "UPGRADE_BURST"
					elseif dodgeStyle == "navigator" then "DODGE_EVASION_PULSE"
					else "SHAPE_BURST"
				pulseAt(atom, hrp.CFrame * CFrame.new(0, -0.5, -0.3), glideColor,
					glideColor:Lerp(Color3.new(1, 1, 1), 0.65), if mobile then 3.2 else 5.5,
					if mobile then 2 else 5)
			end)
			-- [공통 착지 박자] 발이 닿는 0.30초에 마지막 섬광. 장애물·적·피해 판정 없음.
			task.delay(0.30, function()
				if finished or not hrp.Parent or swingKind ~= "dash" then return end
				local color = if dodgeStyle == "warrior" then Color3.fromRGB(255, 218, 145)
					elseif dodgeStyle == "gunner" then Color3.fromRGB(255, 208, 148)
					elseif dodgeStyle == "navigator" then Color3.fromRGB(108, 237, 210)
					elseif dodgeStyle == "merchant" then Color3.fromRGB(255, 215, 126)
					elseif dodgeStyle == "doctor" then Color3.fromRGB(124, 237, 176)
					elseif dodgeStyle == "clergy" then Color3.fromRGB(255, 231, 164)
					else Color3.fromRGB(179, 187, 255)
				pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(0, -2.1, 0), color,
					Color3.fromRGB(255, 255, 240), if mobile then 3.5 else 5, if mobile then 2 else 5)
				-- [직업별 접지] PC에서만 바람·발구름 파동 1회. 실제 이동 거리·회피 무적은 그대로.
				if not mobile and (dodgeStyle == "warrior" or dodgeStyle == "gunner" or dodgeStyle == "navigator") then
					shockRing(hrp.Position - Vector3.new(0, 2.3, 0),
						if dodgeStyle == "warrior" then 5.8 elseif dodgeStyle == "gunner" then 4.4 else 6.2, color, 0.24)
				end
			end)
			-- [회피 우선순위] 예약된 숙련 시각 연타는 취소해 회피 관절과 충돌하지 않게 한다. 실타격 판정은 그대로.
			chainMotionSerial += 1
			startSwing("dash", 0.4)
			-- [묘기 알림] 실제 재생 중인 6종 동작 이름을 표시해 고정된 회피 안내와 불일치하지 않게 한다.
			local trickName = ({ "옆구르기", "백덤블링", "높은 회전 점프", "슬라이딩", "한손 짚고 돌기", "측면 공중회전" })[
				(ch0 and ch0:GetAttribute("FieldDodgeTrick")) or 1
			] or "회피"
			say((({
				warrior = "무인", gunner = "포수",
				navigator = "항해사", merchant = "상인",
				doctor = "의사", clergy = "성직자",
				scholar = "학자",
			})[dodgeStyle] or "회피") .. " · " .. trickName)
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
					local nextPos = hrp.Position + flat.Unit * math.max(0, lunge)
					-- [순간이동 제거] 원래 접근 거리(최대 10스터드)는 보존하고, 명중 0.14초 전에
					-- 기존 HRP를 실제 이동 경로로 보간한다. 방향 전환도 함께 이어 급격한 회전을 막는다.
					swingBridge.lungeTween = TweenService:Create(hrp,
						TweenInfo.new(0.125, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut),
						{ CFrame = CFrame.lookAt(nextPos, nextPos + flat.Unit) })
					swingBridge.lungeTween:Play()
				end
			end
		end
		-- [연타 무조건 발동 금지] ActionCombat의 공용 기본 3타 규칙은 유지하고
		-- 이 탐험에서만 기본 공격을 항상 단타로 처리한다. 숙련 연타는 명중 뒤 별도로 추첨한다.
		if moveId == "heavy" then
			-- [연속모션 충돌 차단] 필살이 시작되면 이전 평타의 예약된 숙련 2·3타 연출을 취소한다.
			-- 실제 예약 피해/회피 판정은 건드리지 않는다.
			chainMotionSerial += 1
		end
		if moveId == "rush" then
			chainMotionSerial += 1
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
		if moveId == "rush" then
			-- [연속 공격 10박자] 1회 입력당 피해 판정은 기존 1회. 무기별 전신 포즈만 10단 순환.
			local pressedAt = os.clock()
			-- [오너 지시 2026-11-28] 숙련 1~10단에 맞춰 입력 연속 자세를 1~10박자로 해금한다.
			local maxBeat = ({ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 })[math.clamp(pl.masteryRank or 1, 1, 10)]
			basicBeat = if pressedAt - swingBridge.basicAt <= 1.1 then swingBridge.basicBeat % maxBeat + 1 else 1
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
						elseif wpn.motion == "RIFLE" then Color3.fromRGB(255, 216, 158)
						else Color3.fromRGB(255, 174, 128)
					-- [원거리 무기별 10단 발사 섬광] 기존 0.14초 격발 순간에만 공용 승인 이펙트를 표시.
					-- 추가 화살·탄환·공격·피해를 발생시키지 않으며 오래된 연출은 다음 공격에서 취소한다.
					if kind == "slash" and moveId == "rush" then
						local fxAt, fxWeapon, fxBeat = swingBridge.basicAt, wpn.id, basicBeat
						task.delay(0.14, function()
							if finished or not hrp.Parent or swingKind ~= "slash" or slashIdx ~= fxBeat
								or swingBridge.basicAt ~= fxAt or wpn.id ~= fxWeapon then return end
							if visualMobile and fxBeat < 10 and fxBeat % 2 == 0 then return end
							local bow = wpn.family == "bow"
							local crossbow = wpn.motion == "CROSSBOW"
							local rifle = wpn.motion == "RIFLE"
							-- [활·석궁 발사] 사각 포구 폭발 대신 실제 화살·볼트·손목 잔광만 사용한다.
							if bow or crossbow then return end
							local side = if fxBeat % 2 == 0 then -1 else 1
							local muzzle = hrp.CFrame * CFrame.new(if bow then side * 0.53 elseif rifle then 0.15 else side * 0.42,
								if bow then 1.68 elseif rifle then 1.28 else 1.38, if rifle then -3.0 else -2.4)
							pulseAt(if bow then "DODGE_EVASION_PULSE" elseif crossbow then "IMPACT_FLASH"
								elseif rifle then "CRITICAL_BURST" else "SHAPE_BURST", muzzle,
								aimColor, aimColor:Lerp(Color3.new(1, 1, 1), 0.73),
								(if bow then 3.7 elseif crossbow then 3.5 elseif rifle then 5.4 else 4.4)
									+ (if fxBeat >= 7 then 0.8 else 0),
								if visualMobile then 2 elseif fxBeat == 10 then 6 else 4, "gunshot")
							-- [공중 연사 발구름] 기존 시각 발놀림에만 아주 짧은 보조 파동.
							if not visualMobile and (fxBeat == 6 or fxBeat == 9) then
								pulseAt("DODGE_EVASION_PULSE", hrp.CFrame * CFrame.new(side, -1.8, -0.5),
									aimColor, Color3.fromRGB(243, 250, 255), 4.0, 2)
							end
						end)
					end
					-- [영화식 연속 사격] 기본 1발은 가벼운 총구 잔상, 2·3발은 다리 디딤과 전신 잔광.
					local rapidPose = moveId == "rush" and basicBeat >= 2
					-- [원거리 손목별 잔광] 활 시위/석궁 지지대/장총 견착/권총 방아쇠가 서로 다른 위치에 나타난다.
					local rangedTrail = if wpn.family == "bow" then { "LeftHand", "LeftLowerArm", "RightHand", "RightLowerArm" }
						elseif wpn.motion == "CROSSBOW" then { "LeftHand", "RightHand", "RightLowerArm" }
						elseif wpn.motion == "RIFLE" then { "LeftHand", "LeftLowerArm", "RightHand" }
						else { "RightHand", "RightLowerArm", "RightLowerLeg" }
					trailsOn(ch0, rangedTrail, aimColor,
						if rapidPose then 0.26 elseif kind == "heavy" then 0.34 else 0.18,
						if rapidPose then 0.44 elseif kind == "heavy" then 0.74 else 0.40)
					if rapidPose then
						local flank = if basicBeat % 2 == 0 then -1 else 1
						local flashAt = hrp.CFrame * CFrame.new(flank * 1.1, if basicBeat == 3 then -1.0 else 0.6, -2.1)
						if wpn.family ~= "bow" and wpn.motion ~= "CROSSBOW" then
							pulseAt("SHAPE_BURST", flashAt, aimColor, aimColor:Lerp(Color3.new(1, 1, 1), 0.7),
								if basicBeat == 3 then 7 else 4.6, if visualMobile then 2 else 6)
						end
						if basicBeat == 3 then
							-- 낮은 회전 사격 후 다음 연타에 연결.
							auraOn(ch0, aimColor, aimColor:Lerp(Color3.new(1, 1, 1), 0.65), 0.34)
							if not visualMobile then afterimage(ch0, aimColor, 2, 0.06) end
						elseif basicBeat >= 4 then
							trailsOn(ch0, if wpn.family == "bow" then { "LeftHand", "RightHand", "RightLowerArm", "LeftLowerLeg" }
								elseif wpn.motion == "CROSSBOW" or wpn.motion == "RIFLE" then { "LeftHand", "RightHand", "RightLowerLeg" }
								else { "RightHand", "RightLowerArm", "LeftLowerLeg" }, aimColor,
								if basicBeat == 10 then 0.43 else 0.24, if basicBeat == 10 then 0.52 else 0.37)
							-- [4·7박 교차 사격 섬광] 주인공 관절 단계만 강조하며 추가 탄환·피해를 생성하지 않는다.
							if basicBeat == 4 or basicBeat == 7 then
								pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(flank * 0.8, if basicBeat == 7 then 0.65 else 1.15, -2.1),
									aimColor, Color3.fromRGB(248, 252, 255), if basicBeat == 7 then 5.2 else 3.7,
									if visualMobile then 2 else 5)
							end
							if basicBeat == 10 then
								auraOn(ch0, aimColor, aimColor:Lerp(Color3.new(1, 1, 1), 0.73), 0.42)
								pulseAt("SHAPE_BURST", hrp.CFrame * CFrame.new(0, 0.6, -2.2),
									aimColor, Color3.fromRGB(255, 252, 224), 8, if visualMobile then 3 else 8)
								-- [시각적 여운] 실제 1발 명중 이후 한 번만 반동 섬광. 추가 발사·피해 없음.
								local finishAt, finishWeapon = swingBridge.basicAt, wpn.id
								task.delay(0.22, function()
									if finished or not hrp.Parent or swingKind ~= "slash" or slashIdx ~= 10
										or swingBridge.basicAt ~= finishAt or wpn.id ~= finishWeapon then return end
									local x = if wpn.motion == "PISTOL" then 0.8 elseif wpn.motion == "RIFLE" then -0.15 else 0
									pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(x, if wpn.family == "bow" then 1.65 else 1.3, -3),
										aimColor, Color3.fromRGB(255, 255, 242), if visualMobile then 4.2 else 6.4,
										if visualMobile then 2 else 6)
								end)
							end
							if not visualMobile and basicBeat >= 7 then afterimage(ch0, aimColor, if basicBeat == 10 then 3 else 2, 0.055) end
						end
					end
				elseif kind == "slash" and basicBeat >= 2 then
					-- [근접 10연타 궤적] 무기별 잔광은 연출 전용. 10번째만 큰 회전 마무리.
					local trailColor = if wpn.family == "dagger" then Color3.fromRGB(156, 255, 220)
						elseif wpn.family == "axe" then Color3.fromRGB(255, 157, 88)
						elseif wpn.family == "spear" then Color3.fromRGB(127, 224, 255)
						elseif wpn.family == "blunt" then Color3.fromRGB(255, 216, 149)
						elseif wpn.family == "fist" then Color3.fromRGB(251, 233, 181)
						elseif wpn.motion == "RAPIER" then Color3.fromRGB(173, 233, 255)
						elseif wpn.motion == "KATANA" then Color3.fromRGB(206, 221, 255)
						elseif wpn.motion == "SABRE" or wpn.motion == "SCIMITAR" then Color3.fromRGB(255, 222, 177)
						else Color3.fromRGB(199, 216, 255)
					-- [근접 무기별 2~10타 도장 잔광] 단검 양손 교차·창 양손 찌르기·도끼 내리찍기·철퇴 손목·격투 손발.
					local strikeTrail = if wpn.family == "dagger" then { "RightHand", "LeftHand", "RightLowerArm", "LeftLowerArm" }
						elseif wpn.family == "spear" then { "RightHand", "LeftHand", "RightLowerArm" }
						elseif wpn.family == "axe" then { "RightHand", "RightLowerArm", "RightLowerLeg" }
						elseif wpn.family == "blunt" then { "RightHand", "RightLowerArm", "LeftHand" }
						elseif wpn.family == "fist" then { "RightHand", "LeftHand", "RightLowerLeg", "LeftLowerLeg" }
						else { "RightHand", "RightLowerArm", "LeftHand", "RightLowerLeg" }
					trailsOn(ch0, strikeTrail, trailColor, if basicBeat == 10 then 0.44
						elseif wpn.family == "dagger" or wpn.family == "fist" then 0.19 else 0.27,
						if basicBeat == 10 then 0.52 else 0.38)
					-- [4·7박 검무 궤적] 기존 검광 에셋을 교차 각도로 사용. 피해·타격 횟수는 원본 그대로.
					if basicBeat == 4 or basicBeat == 7 then
						if not visualMobile or basicBeat == 7 then
							slashArc(hrp, trailColor, math.min(reachV, 12),
								if wpn.family == "spear" then 60 elseif wpn.family == "dagger" then 95 else 145,
								if basicBeat == 4 then -38 else 42)
						end
					end
					-- [무기별 2~9타 접촉 섬광] 0.14초 공격 자세에 맞춰 창끝·검날·철퇴·발끝의 한 순간만 빛난다.
					-- 무기 교체/다음 타/회피에는 시각 예약을 폐기. 피해·공격·5타 강타 코드는 건드리지 않는다.
					if basicBeat < 10 then
						local fxAt, fxWeapon, fxBeat, fxFamily, fxMotion = swingBridge.basicAt, wpn.id, basicBeat, wpn.family, wpn.motion
						task.delay(0.14, function()
							if finished or not hrp.Parent or swingKind ~= "slash" or slashIdx ~= fxBeat
								or swingBridge.basicAt ~= fxAt or wpn.id ~= fxWeapon then return end
							if visualMobile and fxBeat % 2 == 0 then return end
							local side = if fxBeat % 2 == 0 then -1 else 1
							local thrust = fxFamily == "spear" or fxMotion == "RAPIER"
							local heavy = fxFamily == "axe" or fxFamily == "blunt"
							local fist = fxFamily == "fist"
							local at = hrp.CFrame * CFrame.new(if fxFamily == "dagger" or fist then side * 0.54 else 0,
								if heavy then -1.12 elseif fist and fxBeat % 3 == 0 then -0.84 else 1.03,
								-(if thrust then 3.0 elseif fist then 1.6 elseif heavy then 2.0 else 2.35))
							local atom = if heavy then "CRITICAL_BURST" elseif fist then "SHAPE_BURST"
								elseif thrust or fxFamily == "dagger" then "IMPACT_FLASH" else "SHAPE_BURST"
							local size = if fxFamily == "dagger" then 3.0 elseif thrust then 4.0
								elseif fxFamily == "axe" then 5.8 elseif fxFamily == "blunt" then 5.2 elseif fist then 4.1 else 4.6
							pulseAt(atom, at, trailColor, trailColor:Lerp(Color3.new(1, 1, 1), 0.74),
								size + (if fxBeat >= 7 then 1 else 0), if visualMobile then 2 else 4,
								if fxFamily == "dagger" then "dagger" elseif thrust then "pierce"
									elseif fxFamily == "axe" then "cleave" elseif fxFamily == "blunt" then "hammer"
									elseif fist then "fist" else "blade")
							-- [3·6·9타 무기별 2박] 날렵한 무기는 교차 칼빛, 무거운 무기는 발구름 충격파.
							if not visualMobile and (fxBeat == 3 or fxBeat == 6 or fxBeat == 9) then
								if heavy or fist then
									shockRing(hrp.Position - Vector3.new(0, 2, 0), if fist then 3.6 else 4.8, trailColor, 0.20)
								else
									slashArc(hrp, trailColor, math.min(reachV, 11),
										if thrust then 42 elseif fxFamily == "dagger" then 80 else 125,
										if fxFamily == "dagger" then side * 65 elseif fxMotion == "KATANA" then side * 34 else -side * 35)
								end
							end
						end)
					end
					if basicBeat == 10 then
						auraOn(ch0, trailColor, trailColor:Lerp(Color3.new(1, 1, 1), 0.66), 0.42)
						pulseAt("SHAPE_BURST", hrp.CFrame * CFrame.new(0, -1.6, -1.2),
							trailColor, Color3.fromRGB(255, 249, 226), 8, if visualMobile then 3 else 8,
							if wpn.family == "dagger" then "dagger" elseif wpn.family == "spear" or wpn.motion == "RAPIER" then "pierce"
								elseif wpn.family == "axe" then "cleave" elseif wpn.family == "blunt" then "hammer"
								elseif wpn.family == "fist" then "fist" else "blade")
						-- [10타 무기별 2박 피날레] 명중 후 칼빛·창끝 섬광, PC에서는 후속 검광 또는 중량 충격파.
						local finishAt, finishWeapon = swingBridge.basicAt, wpn.id
						task.delay(0.14, function()
							if finished or not hrp.Parent or swingKind ~= "slash" or slashIdx ~= 10
								or swingBridge.basicAt ~= finishAt or wpn.id ~= finishWeapon then return end
							local thrust = wpn.family == "spear" or wpn.motion == "RAPIER"
							pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(0, if thrust then 1.1 else 0.5,
								-(if thrust then 3 else (if wpn.family == "dagger" then 1.5 else 2.2))),
								trailColor, Color3.fromRGB(255, 255, 238), if visualMobile then 4.6 else 7.2,
								if visualMobile then 2 else 6)
						end)
						if not visualMobile then
							task.delay(0.27, function()
								if finished or not hrp.Parent or swingKind ~= "slash" or slashIdx ~= 10
									or swingBridge.basicAt ~= finishAt or wpn.id ~= finishWeapon then return end
								if wpn.family == "axe" or wpn.family == "blunt" or wpn.family == "fist" then
									shockRing(hrp.Position - Vector3.new(0, 2.2, 0),
										if wpn.family == "fist" then 6 else 9, trailColor, 0.23)
								else
									slashArc(hrp, trailColor, math.min(reachV, 13),
										if wpn.family == "spear" or wpn.motion == "RAPIER" then 58 else 160,
										if wpn.family == "dagger" then -55 else 50)
								end
							end)
						end
					end
					if not visualMobile and basicBeat >= 7 then afterimage(ch0, trailColor, if basicBeat == 10 then 3 else 2, 0.065) end
				elseif kind == "slash" and moveId == "rush" then
					-- [1타 무기별 첫칼] 첫 디딤부터 검·단검·창·도끼·철퇴·격투 잔광을 분리한다.
					local firstColor = if wpn.family == "dagger" then Color3.fromRGB(156, 255, 220)
						elseif wpn.family == "spear" then Color3.fromRGB(127, 224, 255)
						elseif wpn.family == "axe" then Color3.fromRGB(255, 157, 88)
						elseif wpn.family == "blunt" then Color3.fromRGB(255, 216, 149)
						elseif wpn.family == "fist" then Color3.fromRGB(251, 233, 181)
						else Color3.fromRGB(205, 224, 255)
					trailsOn(ch0, if wpn.family == "fist" then { "RightHand", "RightLowerArm", "RightLowerLeg" }
						elseif wpn.family == "dagger" or wpn.family == "spear" then { "RightHand", "LeftHand", "RightLowerArm" }
						else { "RightHand", "RightLowerArm" }, firstColor, 0.19, 0.33)
					local fxAt, fxWeapon = swingBridge.basicAt, wpn.id
					task.delay(0.14, function()
						if finished or not hrp.Parent or swingKind ~= "slash" or slashIdx ~= 1
							or swingBridge.basicAt ~= fxAt or wpn.id ~= fxWeapon then return end
						pulseAt(if wpn.family == "axe" or wpn.family == "blunt" then "CRITICAL_BURST" else "IMPACT_FLASH",
							hrp.CFrame * CFrame.new(0, if wpn.family == "axe" or wpn.family == "blunt" then -0.82 else 0.81, -2.0),
							firstColor, Color3.fromRGB(255, 252, 233), if visualMobile then 2.8 else 3.8,
							if visualMobile then 2 else 4,
							if wpn.family == "dagger" then "dagger" elseif wpn.family == "spear" or wpn.motion == "RAPIER" then "pierce"
								elseif wpn.family == "axe" then "cleave" elseif wpn.family == "blunt" then "hammer"
								elseif wpn.family == "fist" then "fist" else "blade")
					end)
				elseif kind == "spin" then
					trailsOn(ch0, TRAIL_LIMBS, Color3.fromRGB(120, 220, 255), 0.4, 0.9)
					auraOn(ch0, Color3.fromRGB(90, 190, 255), Color3.fromRGB(230, 250, 255), 0.8)
					afterimage(ch0, Color3.fromRGB(130, 225, 255), 5, 0.06)
					pulseAt("SHAPE_BURST", hrp.CFrame * CFrame.new(0, -2.2, 0), Color3.fromRGB(130, 225, 255), Color3.fromRGB(240, 250, 255), reachV * 2.4, 16)
				elseif kind == "heavy" then
					-- [무기별 5타 자동강타] 기존 강타 준비동작 위에 고유 색상만 얹는다.
					-- 실제 고유 필살 궤적은 comboCinema가 1회 담당하여 중복 폭발을 방지한다.
					local heavyColor = if wpn.family == "fist" then Color3.fromRGB(255, 218, 149)
						elseif wpn.family == "dagger" then Color3.fromRGB(127, 244, 200)
						elseif wpn.family == "axe" then Color3.fromRGB(255, 132, 93)
						elseif wpn.family == "spear" then Color3.fromRGB(126, 218, 249)
						elseif wpn.family == "blunt" then Color3.fromRGB(244, 198, 132)
						elseif wpn.motion == "CROSSBOW" then Color3.fromRGB(181, 215, 248)
						elseif wpn.family == "bow" then Color3.fromRGB(151, 230, 163)
						elseif wpn.family == "firearm" then Color3.fromRGB(255, 203, 125)
						else Color3.fromRGB(255, 211, 147)
					trailsOn(ch0, { "RightHand", "RightLowerArm", "RightLowerLeg" }, heavyColor, 0.37, 0.68)
					auraOn(ch0, heavyColor, heavyColor:Lerp(Color3.new(1, 1, 1), 0.6), 0.58)
					afterimage(ch0, heavyColor, if visualMobile then 1 else 2, 0.075)
					pulseAt("CRITICAL_BURST", hrp.CFrame * CFrame.new(0, -1.5, -reachV * 0.6),
						heavyColor, Color3.fromRGB(255, 247, 222), reachV * 1.3, if visualMobile then 4 else 9)
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
				-- [필살 착지 싱크] 예전 강타의 지연 연출이 새 평타·회피 위에 덮이지 않게
				-- 현재 무기/시각 연타 식별값을 확인한다. 실제 피해 판정 예약은 변경하지 않는다.
				local visualSerial, visualWeapon, rangedVisual = chainMotionSerial, wpn.id, wpn.ranged
				local slamColor = if wpn.family == "dagger" then Color3.fromRGB(127, 244, 200)
					elseif wpn.family == "spear" then Color3.fromRGB(126, 218, 249)
					elseif wpn.family == "bow" then Color3.fromRGB(151, 230, 163)
					elseif wpn.motion == "CROSSBOW" then Color3.fromRGB(181, 215, 248)
					elseif wpn.family == "firearm" then Color3.fromRGB(255, 203, 125)
					elseif wpn.family == "fist" then Color3.fromRGB(255, 218, 149)
					elseif wpn.family == "axe" then Color3.fromRGB(255, 132, 93)
					else Color3.fromRGB(255, 211, 147)
				task.delay(0.42, function()
					if finished or not hrp.Parent or chainMotionSerial ~= visualSerial or wpn.id ~= visualWeapon then return end
					if rangedVisual then
						pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(0, 1.4, -3),
							slamColor, Color3.fromRGB(255, 245, 218), 5, if visualMobile then 2 else 5)
					else
						slashArc(hrp, slamColor, reachV + 2, if wpn.family == "spear" then 53 else 150, -35)
						shockRing(hrp.Position + hrp.CFrame.LookVector * (reachV * 0.6) - Vector3.new(0, 2.5, 0),
							if visualMobile then 8 else 12, slamColor, 0.4)
					end
					shakeUntil, shakeAmp = os.clock() + 0.18, if visualMobile then 0.35 else 0.75
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
		-- 필살기와 실제 연속 명중 보너스도 기존 단일 피해 판정에서만 처리한다.
		if ultimateCast then
			mult *= (if (pl.masteryRank or 1) >= 10 then 1.5 else 1.35)
			screenFlash(Color3.fromRGB(255, 224, 145), if visualMobile then 0.91 else 0.82)
			shockRing(hrp.Position - Vector3.new(0, 2.5, 0), 12, Color3.fromRGB(255, 218, 140), 0.65)
			sfx("sfx_card_ring", 0.7, 0.85)
		elseif moveId == "rush" and basicBeat >= 3 and streakN >= basicBeat - 1 and os.clock() - streakT <= 1.1 then
			mult *= 1 + math.min(0.12, (basicBeat - 2) * 0.015)
		end
		local combo = pl.combo
		local hitActionSeq = streakActionSeq -- 지연된 타격 판정도 원래 누른 공격의 식별값을 사용한다.
		task.delay(if kind == "slash" then 0.14 elseif kind == "heavy" then 0.42 else 0.2, function()
			if finished then
				return
			end
			local hits, shots = 0, 0 -- [회피 명중 분리] 사격 시도 수와 실제 적중 수를 혼동하지 않는다.
			local defeatedAt = nil -- [킬캠] 기존 타격으로 쓰러진 적 위치만 읽는다.
			-- [원거리 실제 판정] 일반 사격·집중 사격·견제 사격 모두 해당 무기의 등록 사거리에서 한 발만 시도하고 실제 적중은 거리·이동·회피로 결정한다.
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
				-- [활/석궁 섬광 절제] 큰 사각 스프라이트를 숨기고 실물 화살·볼트의 짧은 꼬리만 남긴다.
				if wpn.family ~= "bow" and wpn.motion ~= "CROSSBOW" then
					pulseAt("IMPACT_FLASH", hrp.CFrame * CFrame.new(0, 1.1, -2.6), flashColor,
						Color3.fromRGB(255, 246, 225), if moveId == "heavy" then 5.5 else 3.2,
						if visualMobile then 2 else 4)
				end
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
					-- [원본 공격 종류 전달] 다음 입력에 의해 평타 명중 소유권이 바뀌지 않도록 행동별로 캡처한다.
					-- [원거리 명중 공정성] 거리·사격자 이동·적의 이동·회피가 명중 확률을 결정한다.
					-- 한 발은 한 번만 시도하며 빗나간 발은 피해·숙련·5타 자동강타를 적립하지 않는다.
					local shotLanded = true
					if rangedShot then
						local rangeRatio = math.clamp(dist / math.max(rangeR * STUD, 1), 0, 1)
						local shooterMoving = hrp.AssemblyLinearVelocity.Magnitude > 5
						local targetMoving = (e.moveVel or Vector3.zero).Magnitude > 5
						local baseAccuracy = if wpn.motion == "CROSSBOW" then 0.94
							elseif wpn.family == "bow" then 0.92 else 0.89
						local accuracy = baseAccuracy - 0.27 * rangeRatio
							- (if shooterMoving then 0.10 else 0)
							- (if targetMoving then 0.085 else 0)
							- (if (e.dodgeUntil or 0) > os.clock() then 0.20 else 0)
						if moveId == "heavy" then accuracy += 0.08 end
						shotLanded = comboRng:NextNumber() <= math.clamp(accuracy, 0.35, 0.98)
					end
					local landed = if shotLanded then strikeEnemy(e, mult, hrp.Position, if combo >= 3 and moveId == "rush" then 6 elseif mv.stagger then 5 else 2.5, mv.stagger or (moveId == "rush" and combo >= 3) or wpn.family == "blunt", nil, nil, hitActionSeq, nil, moveId == "rush", basicBeat) else false
					if shotLanded and e.ac.dead then defeatedAt = e.root.Position end
					if landed then hits += 1 end
					shots += 1
					if rangedShot then
						-- [발사 위치] 활은 왼손의 활대에서, 석궁은 오른손의 볼트 레일에서 시작한다.
						local hand = player.Character and player.Character:FindFirstChild(if wpn.family == "bow" then "LeftHand" else "RightHand")
						local a0 = if hand and hand:IsA("BasePart") then hand.Position + hrp.CFrame.LookVector * (if wpn.motion == "CROSSBOW" then 1.25 else 0.40)
							else hrp.Position + Vector3.new(0, 1.1, 0)
						local b0 = e.root.Position + Vector3.new(0, 1.2, 0)
						if not shotLanded then
							-- [실제 빗나감] 기하학적 목표 옆을 지나가게 하여 확정 명중과 화면 연출 불일치를 없앤다.
							local side = if comboRng:NextNumber() < 0.5 then -1 else 1
							b0 += hrp.CFrame.RightVector * side * (3 + dist * 0.055)
								+ Vector3.new(0, if comboRng:NextNumber() < 0.5 then 1.2 else -0.9, 0)
						end
						arrowTrail(a0, b0, nil, nil, wpn.motion, moveId ~= "rush")
					end
				end
			end
			-- 사물 타격은 오브젝트 반응만; 기존 몬스터 적중·무기숙련·최고 연타 기록으로 적립하지 않는다.
			local sceneryHit = false
			for _, b in table.clone(barrels) do
				if rangedShot and shots >= 1 then break end
				local tb = (b.pos - hrp.Position) * Vector3.new(1, 0, 1)
				local ab = 0
				if tb.Magnitude > 0.1 then
					local lk = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
					ab = math.deg(math.acos(math.clamp(lk.Unit:Dot(tb.Unit), -1, 1)))
				end
				if AC.inReach(rangeR * STUD + 3, arcR, tb.Magnitude, ab) then
					local result = explodeBarrel(b, hrp, hitActionSeq, if moveId == "heavy" then 2 else 1)
					if result then sceneryHit = true end
					-- 기존 1회 폭발만 적중/숙련 정산. 폭발 전 내구도 타격은 정산하지 않는다.
					if result == "exploded" then hits += 1 end
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
					if breakCrate(c, if moveId == "heavy" then 2 else 1) then sceneryHit = true end
					if rangedShot then shots += 1 end
				end
			end
			-- [모든 장면 배경 타격] 기존 나무/암석/캠프/도시/퀘스트 랜드마크 메시가
			-- 같은 무기 범위·각도에서 명중 섬광과 짧은 흔들림으로 반응한다.
			-- 건물/단서는 파괴하지 않아 맵·퀘스트 진행을 막지 않고, 타격 숙련/보상도 지급하지 않는다.
			local visualObjectHits = 0
			local maxVisualHits = if visualMobile then 2 else 4
			for _, obj in fieldObjects do
				if visualObjectHits >= maxVisualHits or (rangedShot and shots >= 1) then break end
				if not obj.model.Parent or not obj.model:GetAttribute("FieldCombatObject") then continue end
				-- [다수 모델 최적화] 실제 공격 사정거리 바깥은 제곱거리만 비교해
				-- 먼 나무·암석의 벡터/각도 계산을 건너뛴다. 공격범위·타격판정·보상은 그대로다.
				local dx, dz = obj.pos.X - hrp.Position.X, obj.pos.Z - hrp.Position.Z
				local maxReach = rangeR * STUD + 3 + obj.radius
				if dx * dx + dz * dz > maxReach * maxReach then continue end
				local toward = Vector3.new(dx, 0, dz)
				local nearDist = math.max(0, toward.Magnitude - obj.radius)
				local angle = 0
				if toward.Magnitude > 0.01 then
					local facing = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
					angle = math.deg(math.acos(math.clamp(facing.Unit:Dot(toward.Unit), -1, 1)))
				end
				if AC.inReach(rangeR * STUD + 3, arcR, nearDist, angle) then
					visualObjectHits += 1
					sceneryHit = true
					if rangedShot then shots += 1 end
					local nowHit = os.clock()
					obj.lastHit = nowHit
					local number = (obj.model:GetAttribute("FieldObjectHits") or 0) + 1
					obj.model:SetAttribute("FieldObjectHits", math.min(number, 999))
					local impactAt = Vector3.new(obj.pos.X, math.clamp(obj.pos.Y, ORIGIN.Y + 1.2, ORIGIN.Y + 6), obj.pos.Z)
					local tint = if obj.model:GetAttribute("TerrainTheme") == "mine" then Color3.fromRGB(179, 190, 203)
						elseif obj.model:GetAttribute("TerrainTheme") == "forest" then Color3.fromRGB(151, 213, 126)
						else Color3.fromRGB(247, 201, 130)
					pulseAt("IMPACT_FLASH", CFrame.new(impactAt), tint, Color3.fromRGB(255, 244, 203),
						if moveId == "heavy" then 5 else 3, if visualMobile then 2 else 4)
					if number % 3 == 0 then
						-- 실제 연타 표시만 준다. 원본 적중/무기 숙련/드롭 정산은 절대 누적하지 않는다.
						showCombo(string.format("환경 연속 타격 %d회!", number), false, tint)
					end
					local effect = Instance.new("Highlight")
					effect.Name = "FieldObjectImpact"
					effect.FillColor = tint
					effect.OutlineColor = Color3.fromRGB(255, 239, 178)
					effect.FillTransparency = 0.82
					effect.OutlineTransparency = 0.48
					effect.Parent = obj.model
					-- 등록 실물 메시 자체를 잠깐 기울였다가 원위치로 돌려 놓는다.
					if obj.radius <= 5 and number % 2 == 0 then
						local tilt = if number % 4 == 0 then -1 else 1
						obj.model:PivotTo(obj.origin * CFrame.Angles(0, 0, math.rad(tilt * (if moveId == "heavy" then 5 else 2.5))))
					end
					task.delay(0.18, function()
						if effect.Parent then effect:Destroy() end
						if obj.model.Parent and obj.lastHit == nowHit then obj.model:PivotTo(obj.origin) end
					end)
				end
			end
			-- [표적 없는 사격] 탄환이 없는 것처럼 보이지 않게 전방으로 실제 투사체만 날린다.
			if rangedShot and shots == 0 then
				local hand = player.Character and player.Character:FindFirstChild(if wpn.family == "bow" then "LeftHand" else "RightHand")
				local origin = if hand and hand:IsA("BasePart") then hand.Position else hrp.Position + Vector3.new(0, 1.2, 0)
				arrowTrail(origin, origin + hrp.CFrame.LookVector * math.min(rangeR * STUD, 45),
					nil, nil, wpn.motion, moveId ~= "rush")
			end
			if hits == 0 and not sceneryHit and hitActionSeq >= streakCountedSeq then endStreak("헛손질") end
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
				pl.masteryRank = rank
				refreshAutoHitPips()
				weaponRankLabel.Text = string.format("무기 숙련 %d단", rank)
				attackBtn:SetAttribute("WeaponMasteryRank", rank)
				attackBtn:SetAttribute("WeaponMasteryExperience", practice.xp)
				-- [숙련 연타 2~3타] 기존 1~5단 경험치 기준을 보존하고 6~10단을 확장한다. 전투 레벨 가산 최대 2%, 전 무기 공용 7초 제한.
				-- 민첩 무기는 발동·3타가 약간 유리하고, 도끼·철퇴·화기는 2타 위주로 묵직하게 표현한다.
				-- 1단에서는 절대 발동하지 않으며 추가 타격 판정·피해·보상·드롭·재사용시간을 만들지 않는다.
				local baseChance = if rank == 2 then 0.07 elseif rank == 3 then 0.10
					elseif rank == 4 then 0.13 elseif rank >= 5 then math.min(0.24, 0.16 + (rank - 5) * 0.016) else 0
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
					showCombo(string.format("%s 숙련 %d단! · %s", wpn.name, rank,
						if rank == 2 then "2연타·자동 강타 해금" elseif rank == 4 then "회전 베기 해금"
						elseif rank == 8 then "무기 필살기 해금" elseif rank == 9 then "동료 연계 해금"
						elseif rank == 10 then "10연타·궁극 연계 해금" else string.format("%d연타 해금", rank)))
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
								-- [숙련 연사] 발사 손과 발 디딤의 잔광을 동시에 표현한다. 기존 R15 소체와 공용 이펙트만 사용.
								trailsOn(player.Character, { "RightHand", "RightLowerArm", "LeftHand", "LeftLowerArm", "RightLowerLeg" },
									shotColor, if stage == 3 then 0.27 else 0.20, if stage == 3 then 0.48 else 0.35)
								if stage == 3 then
									pulseAt("SHAPE_BURST", hrp.CFrame * CFrame.new(side * 0.7, -1.4, -1.5),
										shotColor, shotColor:Lerp(Color3.new(1, 1, 1), 0.7), 7,
										if visualMobile then 2 else 7)
								end
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
		return true -- 실제 ActionCombat 시전 성공 여부를 자동 강타 축하와 공유.
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
		if swingBridge.lungeTween then
			swingBridge.lungeTween:Cancel()
			swingBridge.lungeTween = nil
		end
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
	-- [두목 스킬 · 2026-11-28 오너: "보스답게 페이즈·스킬·모션·피통·액션 다양하게, 쉽게 안 죽게"]
	-- 체력 단계 1(100~70%)·2(70~40%)·3(40~15%)·4(15% 아래). 단계가 오를수록 쓸 수 있는 스킬이 늘고 간격이 짧아진다.
	-- 모든 스킬은 바닥 원·이름·붉은 빛으로 예고한 뒤 발동 → 피하면(회피 무적) 안 맞는다. 일반 공격 중엔 쓰지 않는다.
	-- [레지스터 200 한도] 이 큰 함수에 지역 이름을 늘리지 않게 두목 스킬 묶음을 즉시 실행 함수 하나로 감싼다.
	local bossSkillTick = (function()
		local BOSS_SKILLS = {
			{ id = "wave", phase = 1, name = "대지 충격파", warn = 1.1, cd = 9 },
			{ id = "charge", phase = 2, name = "돌진", warn = 0.85, cd = 8 },
			{ id = "roar", phase = 3, name = "포효", warn = 0.7, cd = 11 },
			{ id = "frenzy", phase = 4, name = "광폭 연타", warn = 0.5, cd = 14 },
		}
		local function bossPhaseOf(e)
			local r = e.ac.hp / math.max(1, e.maxHp)
			return if r < 0.15 then 4 elseif r < 0.4 then 3 elseif r < 0.7 then 2 else 1
		end
		local function bossFeet(e)
			return e.root.Position - Vector3.new(0, e.root.Size.Y * 0.5 + 2.6, 0)
		end
		return function(e, now: number, hrp: BasePart?, dist: number)
			if not e.boss or e.ac.dead or not hrp or not e.root.Parent then return end
			local phase = bossPhaseOf(e)
			if phase >= 4 and not e.bossPhase4 then
				e.bossPhase4 = true
				e.armorUntil = now + 6
				e.model:SetAttribute("FieldBossPhase", 4)
				showCombo("두목 최후 발악! · 6초간 단단해짐 — 피하며 버텨라", true, Color3.fromRGB(255, 60, 60))
				screenFlash(Color3.fromRGB(255, 50, 40), 0.8)
				sfx("sfx_event_war", 0.8, 0.7)
			end
			local cast = e.bossCast
			if cast then
				if now < cast.at then return end
				e.bossCast = nil
				local dmg = e.ac.def.dmg
				local flatTo = (hrp.Position - cast.origin) * Vector3.new(1, 0, 1)
				if cast.id == "wave" then
					shockRing(cast.origin, cast.radius, Color3.fromRGB(255, 90, 60), 0.45)
					shakeUntil, shakeAmp = now + 0.35, 1.2
					sfx("sfx_cannon", 0.5, 0.55)
					if flatTo.Magnitude <= cast.radius then hurtPlayerBy(dmg * 0.9) end
				elseif cast.id == "roar" then
					shockRing(cast.origin, cast.radius, Color3.fromRGB(255, 200, 90), 0.4)
					sfx("sfx_horn", 0.7, 0.6)
					if flatTo.Magnitude <= cast.radius and not AC.isInvulnerable(pl, now) then
						hurtPlayerBy(dmg * 0.4)
						eliteSlowUntil = math.max(eliteSlowUntil, now + 2.5)
						say("포효에 몸이 굳었다! 2.5초 둔화")
					end
				elseif cast.id == "charge" then
					local dir = cast.dir
					local hitDone = false
					local start = e.model:GetPivot()
					local t0 = os.clock()
					sfx("sfx_event_danger", 0.6, 0.8)
					task.spawn(function()
						while e.root.Parent and not e.ac.dead and os.clock() - t0 < 0.45 do
							local k = (os.clock() - t0) / 0.45
							local pos = start.Position + dir * cast.length * k
							e.model:PivotTo(CFrame.lookAt(pos, pos + dir))
							local _, h = char3()
							if not hitDone and h and ((h.Position - e.root.Position) * Vector3.new(1, 0, 1)).Magnitude < 5 then
								hitDone = true
								hurtPlayerBy(dmg * 1.2)
							end
							RunService.Heartbeat:Wait()
						end
					end)
				elseif cast.id == "frenzy" then
					local base = e.ac.def
					local fast = table.clone(base)
					fast.windup *= 0.55
					fast.recover *= 0.6
					e.ac.def = fast
					say("두목 광폭 연타! 5초")
					task.delay(5, function()
						if e.ac and not e.ac.dead and e.ac.def == fast then e.ac.def = base end
					end)
				end
				return
			end
			if e.ac.state ~= "chase" and e.ac.state ~= "idle" then return end
			if dist > 28 or now < (e.nextBossSkillAt or 2) then return end
			e.skillReady = e.skillReady or {}
			local options = {}
			for _, sk in BOSS_SKILLS do
				if sk.phase <= phase and now >= (e.skillReady[sk.id] or 0) then table.insert(options, sk) end
			end
			if #options == 0 then return end
			local sk = options[math.random(1, #options)]
			e.skillReady[sk.id] = now + sk.cd
			e.nextBossSkillAt = now + (if phase >= 4 then 3.5 elseif phase == 3 then 5 elseif phase == 2 then 6.5 else 8)
			local origin = bossFeet(e)
			local c = { id = sk.id, at = now + sk.warn, origin = origin }
			if sk.id == "wave" then
				c.radius = 9 * STUD
				groundRing(origin, c.radius, sk.warn)
			elseif sk.id == "roar" then
				c.radius = 6 * STUD
				groundRing(origin, c.radius, sk.warn)
			elseif sk.id == "charge" then
				local to = (hrp.Position - e.root.Position) * Vector3.new(1, 0, 1)
				c.dir = if to.Magnitude > 0.1 then to.Unit else e.root.CFrame.LookVector
				c.length = math.clamp(to.Magnitude + 6, 12, 34)
				groundRing(e.root.Position + c.dir * c.length - Vector3.new(0, e.root.Size.Y * 0.5 + 2.6, 0), 4, sk.warn)
			end
			e.bossCast = c
			e.model:SetAttribute("FieldBossSkill", sk.id)
			showCombo("⚠ " .. sk.name .. "!", true, Color3.fromRGB(255, 120, 70))
			burst(e.root.Position + Vector3.new(0, 3, 0), 0, false, "telegraph")
		end
	end)()
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
		-- [바위 경고] 충돌 폭 9스터드를 따라 두 줄 경계선을 표시한다.
		-- 네모난 네온판은 없애고 실제 바위 이동축과 동일한 방향을 사용한다.
		local warn = Instance.new("Folder")
		warn.Name = "FieldBoulderWarning"
		warn.Parent = folder
		for side = -1, 1, 2 do
			local shift = Vector3.new(-dir.Z, 0, dir.X) * (4.5 * side)
			local begin = part(warn, Vector3.one * 0.1, CFrame.new(a + shift + Vector3.new(0, 0.35, 0)),
				Color3.fromRGB(255, 70, 50))
			local finishAt = part(warn, Vector3.one * 0.1, CFrame.new(a + dir * len + shift + Vector3.new(0, 0.35, 0)),
				Color3.fromRGB(255, 70, 50))
			begin.Transparency, finishAt.Transparency = 1, 1
			begin.CanCollide, begin.CanQuery, begin.CanTouch = false, false, false
			finishAt.CanCollide, finishAt.CanQuery, finishAt.CanTouch = false, false, false
			local p0 = Instance.new("Attachment")
			p0.Parent = begin
			local p1 = Instance.new("Attachment")
			p1.Parent = finishAt
			local beam = Instance.new("Beam")
			beam.Attachment0, beam.Attachment1 = p0, p1
			beam.Width0, beam.Width1 = 0.18, 0.18
			beam.Color = ColorSequence.new(Color3.fromRGB(255, 70, 50))
			beam.Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.8),
				NumberSequenceKeypoint.new(0.13, 0.18),
				NumberSequenceKeypoint.new(0.87, 0.18),
				NumberSequenceKeypoint.new(1, 0.8),
			})
			beam.LightEmission = 0.8
			beam.FaceCamera = false
			beam.Parent = warn
		end
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
	local lastAttackTap = -100
	local function useAttack()
		-- [버튼/넓은 터치면] 동시에 인식된 같은 탭은 한 번만 처리한다.
		local now = os.clock()
		if now - lastAttackTap < 0.08 then return end
		lastAttackTap = now
		useMove("rush")
		-- [공격 눌림 반응] 실제 동작에는 영향을 주지 않는 0.16초 빛의 원형 파문.
		local attackPulse = attackBtn:FindFirstChild("FieldAttackPulse")
		local pulseRim = attackPulse and attackPulse:FindFirstChild("FieldAttackPulseRim")
		if attackPulse and pulseRim then
			pulseRim.Transparency = 0.06
			attackPulse.Size = UDim2.fromScale(0.62, 0.62)
			TweenService:Create(attackPulse, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
				{ Size = UDim2.fromScale(0.86, 0.86) }):Play()
			TweenService:Create(pulseRim, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
				{ Transparency = 1 }):Play()
		end
	end
	local function useDash() useMove("dodge") end
	-- [입력 확정] Touch는 눌렀을 때 1회, 마우스/게임패드는 Activated 1회만 처리한다.
	-- 기존에는 Touch InputBegan/Activated가 둘 다 실행돼 교체를 두 번 눌러 원래 무기로 되돌아갔다.
	local function bindPress(b: GuiButton, fn: () -> ())
		local lastAction = -100
		local touchActive = false
		local lastTouchEnded = -100
		local function go()
			local now = os.clock()
			if now - lastAction < 0.08 then return end
			lastAction = now
			fn()
		end
		b.InputBegan:Connect(function(input)
			if input.UserInputType == Enum.UserInputType.Touch then
				touchActive = true
				go()
			end
		end)
		b.InputEnded:Connect(function(input)
			if input.UserInputType == Enum.UserInputType.Touch then
				touchActive = false
				lastTouchEnded = os.clock()
			end
		end)
		b.Activated:Connect(function()
			if touchActive or os.clock() - lastTouchEnded < 0.45 then return end
			go()
		end)
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
		-- [엄지 허용 오차] 주공격보다 20px 넓지만 회피 영역을 침범하지 않는 터치 범위.
		hit.Size = attackBtn.Size + UDim2.fromOffset(20, 20)
		hit.BackgroundTransparency = 1
		hit.Text = ""
		hit.AutoButtonColor = false
		hit.ZIndex = math.max(attackBtn.ZIndex - 1, 0)
		hit.Parent = gui
		bindPress(hit, useAttack)
		bindHold(hit)
	end
	-- [무기교체 반원 상단] 위쪽 파티 상태창·카메라 버튼을 침범하지 않도록 오른쪽 끝에 고정한다.
	-- 동일 반원에서 공격·회피의 확장 터치 영역과 실제 원형이 떨어지도록 간격을 계산했다.
	do
		local wbtn = btn(gui, "교체", Color3.fromRGB(65, 83, 105),
			UDim2.fromOffset(if compactTouch then 76 elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 then 72
				elseif visualMobile then 80 else 82,
				if compactTouch then 76 elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 then 72
				elseif visualMobile then 80 else 82),
			if compactTouch then UDim2.new(1, -68, 1, -315)
				elseif visualMobile then UDim2.new(1,
					-175,
					1, if workspace.CurrentCamera.ViewportSize.Y < 330 then -181 else -225)
				else UDim2.new(1, if workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize.Y < 440
					then -175 else attackBtn.Position.X.Offset - 12, 1, attackBtn.Position.Y.Offset - 182),
			Vector2.new(0.5, 0.5))
		wbtn.Name = "FieldWeapon"
		wbtn:FindFirstChildOfClass("UICorner").CornerRadius = UDim.new(1, 0)
		wbtn.AutoButtonColor = false
		wbtn.TextSize = if compactTouch then 13 else 14
		wbtn.TextWrapped = true
		if AssetIds["Menu/field_weapon"] then
			addIcon(wbtn, "Menu/field_weapon")
			wbtn.Text = ""
		end
		-- [무기교체 회전 광륜] 기존 교체 버튼 위에 재사용형 UI 링과 섬광만 얹는다. 신규 버튼/3D 입자는 없다.
		wbtn.ClipsDescendants = false
		local swapHalo = Instance.new("Frame")
		swapHalo.Name = "FieldWeaponSwapHalo"
		swapHalo.AnchorPoint = Vector2.new(0.5, 0.5)
		swapHalo.Position = UDim2.fromScale(0.5, 0.5)
		swapHalo.Size = UDim2.fromScale(0.9, 0.9)
		swapHalo.BackgroundTransparency = 1
		swapHalo.Active = false
		swapHalo.ZIndex = wbtn.ZIndex + 8
		swapHalo.Parent = wbtn
		Instance.new("UICorner", swapHalo).CornerRadius = UDim.new(1, 0)
		local swapStroke = Instance.new("UIStroke")
		swapStroke.Color = Color3.fromRGB(255, 233, 163)
		swapStroke.Thickness = if visualMobile then 2.3 else 3.1
		swapStroke.Transparency = 1
		swapStroke.Parent = swapHalo
		local swapBeam = Instance.new("UIGradient")
		swapBeam.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 244, 211)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(142, 226, 255)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 222, 140)),
		})
		swapBeam.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 1),
			NumberSequenceKeypoint.new(0.38, 0.85),
			NumberSequenceKeypoint.new(0.52, 0),
			NumberSequenceKeypoint.new(0.66, 0.85),
			NumberSequenceKeypoint.new(1, 1),
		})
		swapBeam.Parent = swapStroke
		local swapFlash = Instance.new("Frame")
		swapFlash.Name = "FieldWeaponSwapFlash"
		swapFlash.AnchorPoint = Vector2.new(0.5, 0.5)
		swapFlash.Position = UDim2.fromScale(0.5, 0.5)
		swapFlash.Size = UDim2.fromScale(0.78, 0.78)
		swapFlash.BackgroundColor3 = Color3.fromRGB(246, 250, 255)
		swapFlash.BackgroundTransparency = 1
		swapFlash.BorderSizePixel = 0
		swapFlash.Active = false
		swapFlash.ZIndex = wbtn.ZIndex + 9
		swapFlash.Parent = wbtn
		Instance.new("UICorner", swapFlash).CornerRadius = UDim.new(1, 0)
		wbtn:SetAttribute("SkillFullName", wpn.name .. " ↔ " .. reserveWeapon.name)
		wbtn:SetAttribute("WeaponChoiceCount", 2)
		wbtn:SetAttribute("WeaponPrimaryId", wpn.id)
		wbtn:SetAttribute("WeaponSecondaryId", reserveWeapon.id)
		bindPress(wbtn, function()
			if finished then return end
			chainMotionSerial += 1
			if swingBridge.lungeTween then
				swingBridge.lungeTween:Cancel()
				swingBridge.lungeTween = nil
			end
			swingBridge.pendingBasicBeat = nil
			-- [교체 즉시 시각 복원] 앞 무기의 예약 타격 포즈가 새 활·석궁·검에 남지 않게 한다.
			swingKind, swingCombo, slashIdx = nil, nil, 0
			swingBridge.rootFrom, swingBridge.rootLast = nil, nil
			wpn, reserveWeapon = reserveWeapon, wpn
			-- [교체 성공 피드백] 회전 광륜 1개 + 짧은 섬광 1개만 재사용한다. 모바일 신규 파티클 방출 0개.
			-- [해상·지상 통일] 링은 아이콘 안쪽(0.80→0.94)에서만 돌고, 흰 원 섬광 대신 아이콘이 톡 커졌다 돌아온다.
			swapHalo.Size = UDim2.fromScale(0.80, 0.80)
			swapStroke.Transparency = 0.05
			swapBeam.Rotation = 0
			swapFlash.BackgroundTransparency = 1
			do
				local pop = wbtn:FindFirstChild("FieldButtonIcon")
				pop = pop and (pop:FindFirstChildOfClass("UIScale") or Instance.new("UIScale", pop))
				if pop then
					pop.Scale = 1.14
					TweenService:Create(pop, TweenInfo.new(0.32, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
				end
			end
			TweenService:Create(swapHalo, TweenInfo.new(0.44, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
				{ Size = UDim2.fromScale(0.94, 0.94) }):Play()
			TweenService:Create(swapBeam, TweenInfo.new(0.44, Enum.EasingStyle.Linear),
				{ Rotation = 360 }):Play()
			TweenService:Create(swapStroke, TweenInfo.new(0.44, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
				{ Transparency = 1 }):Play()
			TweenService:Create(swapFlash, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
				{ BackgroundTransparency = 1 }):Play()
			wbtn:SetAttribute("SkillFullName", wpn.name .. " ↔ " .. reserveWeapon.name)
			if wbtn:GetAttribute("IconArtKey") ~= "Menu/field_weapon" then wbtn.Text = "교체" end
			wbtn:SetAttribute("WeaponPrimaryId", wpn.id)
			wbtn:SetAttribute("WeaponSecondaryId", reserveWeapon.id)
			if attackIcon and attackBtn:GetAttribute("IconArtKey") ~= "Menu/field_attack" then
				local iconKey = if wpn.family == "fist" then "Menu/cc0_glove" elseif wpn.family == "axe" then "Menu/cc0_axe"
					elseif wpn.ranged then "Menu/cc0_crossbow" else "Menu/cc0_sword"
				attackIcon.Image = "rbxassetid://" .. tostring(AssetIds[iconKey])
			end
			equipFieldWeapon(player.Character, wpn)
			slashIdx = 0
			swingBridge.basicBeat, swingBridge.basicAt = 0, -100
			swingBridge.from, swingBridge.lastAt = nil, -100
			table.clear(swingBridge.last)
			local practice = weaponPractice[wpn.id]
			local rank = practice and practice.rank or 1
			pl.masteryRank = rank
			refreshAutoHitPips()
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
	local combatBtns = {}
	-- [회피 버튼] 화면 아래 공격 왼쪽에 두고 중앙 파티창·보조 버튼과 입력 면적을 분리한다.
	do
		local b = btn(gui, "", Color3.fromRGB(32, 141, 144),
			UDim2.fromOffset(if compactTouch then 86 elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 then 88
				elseif visualMobile then 96 else 94,
				if compactTouch then 86 elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 then 88
				elseif visualMobile then 96 else 94),
			if compactTouch then UDim2.new(1, -62, 1, -202)
				elseif visualMobile then UDim2.new(1, -235, 1,
					if workspace.CurrentCamera.ViewportSize.Y < 330 then -67 else -106)
				else UDim2.new(1, attackBtn.Position.X.Offset - 146, 1, attackBtn.Position.Y.Offset - 66),
			Vector2.new(0.5, 0.5))
		b.Name = "FieldDodge"
		b.Text = ""
		b:SetAttribute("SkillFullName", "회피")
		b:SetAttribute("TouchPriority", "DODGE")
		b:FindFirstChildOfClass("UICorner").CornerRadius = UDim.new(1, 0)
		b:FindFirstChildOfClass("UIStroke").Color = Color3.fromRGB(114, 244, 228)
		b:FindFirstChildOfClass("UIStroke").Thickness = 3.2
		b.AutoButtonColor = false
		local dodgeIcon = if AssetIds["Menu/field_dodge"] then addIcon(b, "Menu/field_dodge")
			else addIcon(b, "Menu/chart_compass")
		if dodgeIcon and b:GetAttribute("IconArtKey") ~= "Menu/field_dodge" then
			dodgeIcon.Size = UDim2.fromScale(0.73, 0.73)
			dodgeIcon.Position = UDim2.fromScale(0.5, 0.41)
		end
		local dodgeCaption = label(b, "회피", if visualMobile then 14 else 13, Color3.fromRGB(198, 255, 242))
		dodgeCaption.Name = "FieldDodgeCaption"
		dodgeCaption.Visible = b:GetAttribute("IconArtKey") ~= "Menu/field_dodge"
		dodgeCaption.AnchorPoint = Vector2.new(0.5, 0.5)
		dodgeCaption.Position = UDim2.fromScale(0.5, 0.79)
		dodgeCaption.Size = UDim2.fromScale(0.70, 0.20)
		dodgeCaption.ZIndex = b.ZIndex + 6
		bindPress(b, function() useMove("dodge") end)
		combatBtns.dodge = { btn = b, label = "회피" }
	end
	-- 스킬 효과 하나: 주인공 카드 스킬과 동료 스킬이 같이 쓴다. caster = 시전자 모델·루트(주인공이면 내 캐릭터).
	local function castEffect(sk, name, ch, hp0, supportRole)
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
			local motion = if supportRole == "gunner" then (if (opts.year or 1517) >= 1680 then "RIFLE" else "CROSSBOW")
				elseif supportRole then "BOW" elseif rangedWeapon.ranged then rangedWeapon.motion else "BOW"
			local spellColor = if motion == "CROSSBOW" then Color3.fromRGB(181, 217, 238)
				elseif motion == "BOW" or motion == "LONGBOW" then Color3.fromRGB(162, 231, 173)
				else Color3.fromRGB(255, 202, 140)
			pulseAt(if sk == "snipe" then "CRITICAL_BURST" else "SHAPE_BURST",
				hp0.CFrame * CFrame.new(0, 1.3, -2.2), spellColor, Color3.fromRGB(255, 243, 216),
				if sk == "snipe" then 5.5 else 3.8, if visualMobile then 3 else 7)
			local list = {}
			for _, e in enemies do if not e.ac.dead and e.root.Parent then table.insert(list, e) end end
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
				if strikeEnemy(e, if sk == "snipe" then 3.0 else 1.2, hp0.Position, 1.5, sk == "snipe", false, not supportRole and ch == player.Character) then
					hitLanded += 1
				end
			end
			if not supportRole and ch == player.Character and hitLanded == 0 then endStreak("헛손질") end
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
				if not e.ac.dead and e.root.Parent and d < nd then near, nd = e, d end
			end
			if near then
				if not strikeEnemy(near, 1.8, hp0.Position, 5, true, false, not supportRole and ch == player.Character) and not supportRole and ch == player.Character then endStreak("헛손질") end
			elseif not supportRole and ch == player.Character then endStreak("헛손질") end
			say(name .. (if near then ": 강타!" else ": 맞힐 적이 없다"))
			sfx("sfx_card_blade", 0.7, 0.9)
			burst(pos, 22, true)
		else
			local n = 0
			for _, e in enemies do
				if not e.ac.dead and e.root.Parent and (e.root.Position - hp0.Position).Magnitude <= 14 * STUD and not e.ac.def.boss then
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
					-- [5타 자동강타] 스킬이 실제 시전된 경우에만 기존 연타 시네마 1회 실행.
					-- 위 strikeEnemy에서는 이 경우 5타 일반 축하를 생략해 화면·카메라·효과음 중복을 막는다.
					local record = pl.autoHeavyRecord == true
					pl.autoHeavyRecord = nil
					local autoKind = pl.autoSkillKind or "heavy"
					if autoKind == "sweep" and (pl.cd.sweep or -100) > os.clock() then autoKind = "heavy" end
					local swept = autoKind == "sweep" and useMove("sweep")
					if swept then comboCinema(streakN, record, true) end
					if not swept then
					if useMove("heavy") then
						comboCinema(streakN, record, true)
					else
						-- 중간에 시전 조건이 바뀌었으면 기존 5타 축하는 복원한다.
						comboCinema(streakN, record)
					end
					end
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
		-- [주인공 자연 회복] 기존 자연 회복량 0.12는 유지하고, 동료 파티는 필드 피해·회복에 관여하지 않는다.
		-- 전투 행동 8초 이상 없음 + 반경 40스터드 내 적 없음 조건을 그대로 적용한다.
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
				pl.hp = math.min(pl.maxHp, pl.hp + 0.12 * math.min(dt, 0.1))
				if now >= passiveRegenHudAt then
					passiveRegenHudAt = now + 0.5
					refresh()
				end
				if now - passiveRegenFxAt >= 12 then
					passiveRegenFxAt = now
					pulseAt("HEAL_PULSE", root.CFrame * CFrame.new(0, -2.1, 0), Color3.fromRGB(104, 207, 151),
						Color3.fromRGB(215, 250, 227), 3.8, if visualMobile then 2 else 4)
					sfx("sfx_card_magic", 0.16, 1.32)
				end
			end
		end
		local staminaSize = UDim2.fromScale(math.clamp(pl.stamina / AC.STAMINA_MAX, 0, 1), 1)
		if staminaFill.Size ~= staminaSize then staminaFill.Size = staminaSize end
		local staminaText = string.format("기력 %d", math.floor(pl.stamina + 0.5))
		if staminaNumber.Text ~= staminaText then staminaNumber.Text = staminaText end
		if magicFill then
			magicValue = math.min(100, magicValue + math.min(dt, 0.1) * 5)
			local magicSize = UDim2.fromScale(magicValue / 100, 1)
			if magicFill.Size ~= magicSize then magicFill.Size = magicSize end
			local magicText = string.format("마력 %d", math.floor(magicValue + 0.5))
			if magicAmount.Text ~= magicText then magicAmount.Text = magicText end
		end
		local style = Weapons.actionDesign(wpn)
		for key, sb in combatBtns do
			if key == "heavy" or key == "sweep" then
				local detailed = if key == "heavy" then style.heavyName else style.sweepName
				sb.label = if key == "heavy" then style.heavy else style.sweep
				if sb.btn:GetAttribute("SkillFullName") ~= detailed then sb.btn:SetAttribute("SkillFullName", detailed) end
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
			local duration = if string.sub(key, 1, 4) == "card" then 8 else (AC.Moves[key] and AC.Moves[key].cooldown) or 4
			if shade then
				local fraction = math.clamp(left / math.max(duration, 0.1), 0, 1)
				-- [해상·지상 통일] 원화 아이콘이 있으면 원 음영 대신 아이콘 자체만 어두워진다(음영이 아이콘보다 넓어 보이던 문제).
				local icon = sb.btn:FindFirstChild("FieldButtonIcon")
				local shadeVisible = left > 0 and icon == nil
				if shade.Visible ~= shadeVisible then shade.Visible = shadeVisible end
				local shadeSize = UDim2.fromScale(1, 1)
				if shade.Size ~= shadeSize then shade.Size = shadeSize end
				local shadeAlpha = 0.24 + (1 - fraction) * 0.68
				if shade.BackgroundTransparency ~= shadeAlpha then shade.BackgroundTransparency = shadeAlpha end
				local timer = sb.btn:FindFirstChild("FieldCooldownTime")
				if timer and timer.Visible then timer.Visible = false end
				local track = sb.btn:FindFirstChild("FieldCooldownTrack")
				if track and track.Visible then track.Visible = false end
				if icon and icon:IsA("ImageLabel") then
					icon.ImageTransparency = if left > 0 then fraction * 0.42 else 0
                    icon.ImageColor3 = if left > 0 then Color3.fromRGB(208, 190, 160):Lerp(Color3.fromRGB(97, 88, 83), fraction)
                        else Color3.fromRGB(255, 251, 224)
				end
				if left > 0 then
					sb.wasCooling = true
				elseif sb.wasCooling then
					sb.wasCooling = false
					if okButtonFx and ButtonFx then ButtonFx.ready(sb.btn, if key == "dodge" then Color3.fromRGB(114, 244, 228) else nil) end
					local stroke = sb.btn:FindFirstChildOfClass("UIStroke")
					if stroke then
						stroke.Color = Color3.fromRGB(255, 247, 164)
                        stroke.Thickness = 5
                        TweenService:Create(stroke, TweenInfo.new(0.48, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
                            Color = if key == "dodge" then Color3.fromRGB(114, 244, 228) else Color3.fromRGB(224, 184, 105),
                            Thickness = if key == "dodge" then 3.2 else 2,
                        }):Play()
                    end
                    -- [재사용 준비 회전광] 기존 버튼의 쿨타임 종료 순간에만 링 1개 생성·재사용한다.
                    -- 모바일에서는 작은 2D 선 하나만 움직이며 신규 ParticleEmitter와 매 프레임 생성은 없다.
                    local readyHalo = sb.btn:FindFirstChild("FieldReadyHalo")
                    if not readyHalo then
                        sb.btn.ClipsDescendants = false
                        readyHalo = Instance.new("Frame")
                        readyHalo.Name = "FieldReadyHalo"
                        readyHalo.AnchorPoint = Vector2.new(0.5, 0.5)
                        readyHalo.Position = UDim2.fromScale(0.5, 0.5)
                        readyHalo.Size = UDim2.fromScale(0.92, 0.92)
                        readyHalo.BackgroundTransparency = 1
                        readyHalo.Active = false
                        readyHalo.ZIndex = sb.btn.ZIndex + 8
                        readyHalo.Parent = sb.btn
                        Instance.new("UICorner", readyHalo).CornerRadius = UDim.new(1, 0)
                        local lightRim = Instance.new("UIStroke")
                        lightRim.Color = Color3.fromRGB(255, 245, 177)
                        lightRim.Thickness = if visualMobile then 2 else 2.8
                        lightRim.Transparency = 1
                        lightRim.Parent = readyHalo
                        local sweep = Instance.new("UIGradient")
                        sweep.Transparency = NumberSequence.new({
                            NumberSequenceKeypoint.new(0, 1),
                            NumberSequenceKeypoint.new(0.35, 0.92),
                            NumberSequenceKeypoint.new(0.5, 0),
                            NumberSequenceKeypoint.new(0.65, 0.92),
                            NumberSequenceKeypoint.new(1, 1),
                        })
                        sweep.Parent = lightRim
                    end
                    local lightRim = readyHalo:FindFirstChildOfClass("UIStroke")
                    local sweep = lightRim and lightRim:FindFirstChildOfClass("UIGradient")
                    if lightRim and sweep then
                        readyHalo.Size = UDim2.fromScale(0.80, 0.80) -- [해상·지상 통일] 아이콘 안쪽에서만
                        lightRim.Transparency = 0.03
                        sweep.Rotation = 0
                        TweenService:Create(readyHalo, TweenInfo.new(0.47, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
                            { Size = UDim2.fromScale(0.94, 0.94) }):Play()
                        TweenService:Create(sweep, TweenInfo.new(0.47, Enum.EasingStyle.Linear),
                            { Rotation = 360 }):Play()
                        TweenService:Create(lightRim, TweenInfo.new(0.47, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
                            { Transparency = 1 }):Play()
                    end
                    -- [지상 준비 완료] 엄지 위치에서 한 번 크게 숨쉬듯 확대 후 복귀한다.
                    local readyScale = sb.btn:FindFirstChildOfClass("UIScale")
                    if readyScale then
                        readyScale.Scale = 1.12
                        TweenService:Create(readyScale, TweenInfo.new(0.45, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
                    end
                    local readyIcon = sb.btn:FindFirstChild("FieldButtonIcon")
                    if readyIcon and readyIcon:IsA("ImageLabel") then
                        readyIcon.ImageColor3 = Color3.fromRGB(255, 245, 180)
                        TweenService:Create(readyIcon, TweenInfo.new(0.48), {
                            ImageColor3 = Color3.fromRGB(255, 251, 224),
                        }):Play()
					end
				end
			end
			local remaining = math.max(0, left)
			if sb.btn:GetAttribute("CooldownRemaining") ~= remaining then sb.btn:SetAttribute("CooldownRemaining", remaining) end
		end
	end))
	-- [모바일 오입력 방지] 탐험 화면 탭은 공격으로 처리하지 않고 공격 버튼만 받는다.
	-- PC의 기존 왼쪽 클릭 공격은 유지한다.
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

	-- [적 R15 관절·전술 통합 루프] Animator 갱신 뒤 PreSimulation에서 모터를 적용해야 팔·무릎 자세가 사라지지 않는다.
	-- 기존 적 공격·피해·스폰은 동일한 단일 업데이트 경로를 그대로 사용한다.
	table.insert(conns, RunService.PreSimulation:Connect(function(dt)
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
		-- [매트릭스 회피] 성공한 순간만 짧게 적 세계시간을 늦춘다. 주인공·동료·재화·쿨타임은 정상 진행.
		local enemyDt = dtc * (if now < (pl.matrixSlowUntil or 0) then 0.24 else 1)
		-- [전투 프레임] 적 상태는 기존 ActionCombat 집계 함수가 원본 배열에서 직접 확인한다.
		-- 매 프레임 임시 31개 엔트리 배열을 만들지 않으며 공격 순서/판정은 동일하다.
		local attackers = AC.attackersCount(enemies)
		-- [협동 반격권] 준비가 끝난 방어 성공 몹 한 명만 다음 순서를 우선 사용한다.
		-- 기존 동시 공격 상한·실제 예고시간·개인 공격 간격은 그대로 둔다.
		local nextCounter = nil
		if now >= (pl.nextEnemyTurnAt or 0) and attackers < AC.MELEE_TOKENS then
			for _, o in enemies do
				if not o.ac.dead and o.ac.state == "chase" and now >= (o.counterReadyAt or math.huge)
					and now < (o.counterUntil or 0) and now >= (o.nextDuelAt or 0)
					and now >= (o.riseUntil or 0) and now >= (o.parryUntil or 0)
					and (o.root.Position - hrp.Position).Magnitude <= o.ac.def.range * STUD + 5 then
					-- [공정한 반격 순서] 방어 성공 후 반격권이 먼저 만료되는 적에게 차례를 양보한다.
					if not nextCounter or (o.counterUntil or math.huge) < (nextCounter.counterUntil or math.huge) then
						nextCounter = o
					end
				end
			end
		end
		for index, e in table.clone(enemies) do
			local to = hrp.Position - e.root.Position
			local flat = Vector3.new(to.X, 0, to.Z)
			local dist = flat.Magnitude / STUD -- 규칙의 거리 단위
			if e.boss then bossSkillTick(e, now, hrp, dist) end
			-- [모바일 원거리 그림자] 일반 적의 실제 원본 그림자만 거리별로 관리한다.
			-- 100/80스터드 히스테리시스로 경계 반복 갱신 방지. 근접·정예·두목·공격 모션은 보존.
			if visualMobile and not e.elite and not e.ac.dead then
				local quiet = (e.ac.state == "idle" or e.ac.state == "chase")
					and now >= (e.hurtAt or -100) + 0.3 and now >= (e.riseUntil or 0)
					and now >= (e.guardUntil or 0) and now >= (e.parryUntil or 0)
					and now >= (e.dodgeUntil or 0) and now >= (e.kbUntil or 0)
				if e.shadowParts then
					if not quiet or flat.Magnitude <= 80 then
						for _, part in e.shadowParts do
							if part:IsDescendantOf(e.model) then part.CastShadow = true end
						end
						e.shadowParts = nil
					end
				elseif quiet and flat.Magnitude > 100 then
					e.shadowParts = {}
					for _, part in e.model:GetDescendants() do
						if part:IsA("BasePart") and part.CastShadow then
							table.insert(e.shadowParts, part)
							part.CastShadow = false
						end
					end
				end
			end
			-- 멀리서 자고 있는 적은 계산을 쉰다(적이 100명이어도 가볍게)
			if flat.Magnitude > 120 and e.ac.state == "idle" and not e.ac.dead then
				continue
			end
			-- [다운→기상 상태 머신] 기존 AC.stagger로 기상 중 공격을 완전히 막는다.
			-- 다운 시간이 끝나면 원래 AI가 추적 상태로 돌아간다(재생성·적 수 변화 없음).
			local knocked = now < (e.riseUntil or 0)
			if knocked then
				e.ac.stagger = math.max(0.05, e.riseUntil - now)
				e.ac.state = "stagger"
			end
			local frozen = knocked or now < (e.holdUntil or 0)
				or now < (e.guardUntil or 0) or now < (e.parryUntil or 0)
			if e.kbUntil and now < e.kbUntil and not e.ac.def.boss then
				local duration = math.max(e.kbUntil - e.kbT0, 0.05)
				local k = 1 - (now - e.kbT0) / duration
				e.model:PivotTo(e.model:GetPivot() + e.kbVel * math.max(k, 0) * enemyDt * 2)
			end
			local event, hit = nil, nil
			if not frozen then
				local others = attackers - (if e.ac.state == "windup" or e.ac.state == "active" then 1 else 0)
				-- [개떼 공격 차단] 기존 동시 공격 2명 상한을 원거리·두목까지 공통 적용한다.
				-- 공격권 대기 중에도 chase는 유지하고, 다음 공격권은 병종별 과거 공격 시각으로 분산한다.
				e.waiting = e.ac.state == "chase" and (others >= AC.MELEE_TOKENS
					or now < (pl.nextEnemyTurnAt or 0) or now < (e.nextDuelAt or 0)
					or (nextCounter ~= nil and nextCounter ~= e))
				event, hit = AC.stepEnemy(e.ac, enemyDt, dist, not e.waiting)
			end
			if event == "telegraph" then
				-- [적 무기 연속 동작] 공격 차례에 따라 기존 공용 무기 1~3타를 순환한다. 피해·판정은 동일.
				if e.fm then e.fm.weaponBeat = ((e.fm.weaponBeat or 0) % 3) + 1 end
				attackers += 1
				-- [공격 순서 분산] 예고가 끝나기 전 여러 무기가 한꺼번에 들어오지 않게 다음 차례를 예약.
				-- 개별 공격 시간·피해량·사거리·쿨타임은 ActionCombat 원본을 유지한다.
				pl.nextEnemyTurnAt = now + math.max(0.80, math.min(e.ac.def.windup + 0.20, 1.30))
				e.nextDuelAt = now + math.max(2.2, e.ac.def.windup + e.ac.def.active + e.ac.def.recover + 0.30)
				e.model:SetAttribute("FieldTacticalIntent", if e == nextCounter then "counter" else "strike")
				e.counterUntil = 0 -- 정상 공격으로 진입하면 한 번의 우선권을 소모한다.
				e.warnUntil = now + e.ac.def.windup
				burst(e.root.Position + Vector3.new(0, 3, 0), 0, false, "telegraph")
				sfx("sfx_event_danger", 0.35, 1.2)
				-- [타이밍 안내] 처음 몇 번은 무엇을 해야 하는지 말해 준다
				pl.fieldTeach = (pl.fieldTeach or 0) + 1
				if pl.fieldTeach <= 3 then say("빨간 신호! 맞기 직전에 회피 → 반격 ×2", 1.6) end
				if e.ac.def.aoe then
					groundRing(e.root.Position - Vector3.new(0, e.root.Size.Y * 0.5 + 2.6, 0), e.ac.def.range * STUD * 0.85, e.ac.def.windup)
				end
				e.parryAt = nil
				-- [원거리 조준 고정] 발사 예고 때 예상 탄착점만 정한다. 이후 좌우 이동하면 회피할 수 있다.
				-- 발사 횟수·무기 수치·폭탄의 기존 고정 목표점은 변경하지 않는다.
				e.rangedAim = nil
				if e.ac.def.keepAway and not e.throwAsset then
					local velocity = hrp.AssemblyLinearVelocity * Vector3.new(1, 0, 1)
					local lead = velocity * 0.14
					if lead.Magnitude > 2.4 then lead = lead.Unit * 2.4 end
					e.rangedAim = hrp.Position + lead
				end
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
					local from, gp = e.root.Position, (e.rangedAim or hrp.Position)
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
						-- [적 예고] 넓은 직사각형 빔 대신 조준 중심을 따라 가늘어지는 경고선.
						lane.Width0, lane.Width1 = if isCharge then 0.42 else 0.16, 0.04
						lane.Color = ColorSequence.new(Color3.fromRGB(255, 75, 59), Color3.fromRGB(255, 180, 123))
						lane.Transparency = NumberSequence.new({
							NumberSequenceKeypoint.new(0, 0.8),
							NumberSequenceKeypoint.new(0.25, 0.25),
							NumberSequenceKeypoint.new(1, 0.85),
						})
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
				-- [사수 회피 판정] 예고 이후 움직인 목표를 다시 추적하지 않는다.
				-- 기존 사거리·공격력·방어·무적·드랍 처리는 유지한다.
				if e.ac.def.keepAway and e.rangedAim and not e.throwAsset then
					local offset = (hrp.Position - e.rangedAim) * Vector3.new(1, 0, 1)
					local tolerance = if e.weapon and e.weapon.motion == "RIFLE" then 3.4
						elseif e.weapon and e.weapon.motion == "CROSSBOW" then 4.0 else 4.6
					hit = hit and offset.Magnitude <= tolerance
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
					local shotTarget = e.rangedAim or hrp.Position
					if e.throwAsset == "bomb" then
						-- 화약 폭탄은 사전 경고 중 날아왔고 현재 착탄/피해 판정이 일치한다.
						e.bombAim = nil
					elseif e.throwAsset then
						arrowTrail(e.root.Position + Vector3.new(0, 2.6, 0), hrp.Position + Vector3.new(0, 0.6, 0), e.throwAsset)
						sfx("sfx_card_swing", 0.34, if e.throwAsset == "stone" then 1.22 else 0.92)
					elseif e.weapon and e.weapon.id == "crossbow" then
						-- [석궁] 쇠뇌 시위·볼트 궤적. 총기 발포음은 재생하지 않는다.
						sfx("sfx_card_volley", 0.34, 1.46)
						arrowTrail(e.root.Position + Vector3.new(0, 1.5, 0), shotTarget + Vector3.new(0, 1.5, 0), nil, nil, "CROSSBOW")
					elseif e.weapon and e.weapon.family == "firearm" then
						-- [총병] 승인된 화약 사격 소리와 총구 섬광.
						sfx(if e.weapon.motion == "PISTOL" then "sfx_card_fire" else "sfx_cannon",
							if e.weapon.motion == "PISTOL" then 0.29 else 0.34, if e.weapon.motion == "PISTOL" then 1.52 else 1.87)
						pulseAt("IMPACT_FLASH", e.root.CFrame * CFrame.new(0, 1.3, -2),
							Color3.fromRGB(255, 207, 125), Color3.fromRGB(255, 248, 210), 5, if visualMobile then 2 else 4)
						arrowTrail(e.root.Position + Vector3.new(0, 1.5, 0), shotTarget + Vector3.new(0, 1.5, 0), nil, nil, e.weapon.motion)
					else
						sfx("sfx_rope_release", 0.32, if e.weapon and e.weapon.motion == "LONGBOW" then 1.12 else 1.38)
						arrowTrail(e.root.Position + Vector3.new(0, 1.5, 0), shotTarget + Vector3.new(0, 1.5, 0),
							nil, nil, if e.weapon then e.weapon.motion else "BOW")
					end
				end
				e.rangedAim = nil
				if e.warn then e.warn:Destroy() e.warn = nil end
				if e.warnBb then e.warnBb:Destroy() e.warnBb = nil end
				-- [완벽 회피] 실전 공격 판정이 온 순간에만 검증한다. 무적 회피 중이며
				-- 해당 적을 회피 시작 때 위협으로 확인했을 때만 100% 성공으로 인정한다.
				local perfectDodge = not pl.ward and not pl.matrixDodgeConsumed
					and now <= (pl.matrixDodgeUntil or 0) and AC.isInvulnerable(pl, now)
					and pl.matrixDodgeThreats and pl.matrixDodgeThreats[e] == true
					and (hit or (pl.matrixDodgeOrigin
						and (e.root.Position - pl.matrixDodgeOrigin).Magnitude <= e.ac.def.range * STUD + 8))
				-- 예고 중에 멀리 피했으면 헛치고, 닿았으면 피해(회피 중이면 0)
				if hit and pl.ward then
					pl.ward = false
					say("보호막이 공격을 막았다!")
					sfx("sfx_card_armor", 0.8, 1)
					burst(hrp.Position + Vector3.new(0, 2, 0), 24, true)
				elseif hit then
					local dealt, parried = AC.takeHit(pl, e.ac.def.dmg, now, pl.parryAt)
					if parried then
						pl.supportDefense = (pl.supportDefense or 0) + 1
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
					if not perfectDodge then say("헛쳤다! 지금이 기회") end
				end
				if perfectDodge then
					-- [매트릭스식 성공 연출] 피해/보상/시전 횟수 추가 없이 적 AI·이동만 0.72초 동안 24% 속도로 재생.
					pl.matrixDodgeConsumed = true
					pl.supportDefense = (pl.supportDefense or 0) + 1
					pl.matrixSlowUntil = now + 0.72
					pl.counterUntil = now + 1.6 -- [반격] 다음 한 방 ×2
					showCombo("완벽 회피! · 지금 치면 반격 ×2", true, Color3.fromRGB(122, 240, 246))
					screenFlash(Color3.fromRGB(122, 236, 248), if visualMobile then 0.91 else 0.82)
					pulseAt("DODGE_EVASION_PULSE", hrp.CFrame * CFrame.new(0, -2.2, 0),
						Color3.fromRGB(98, 220, 242), Color3.fromRGB(238, 255, 255), 13, if visualMobile then 5 else 12)
					afterimage(char, Color3.fromRGB(141, 230, 250), if visualMobile then 2 else 4, 0.055)
					sfx("sfx_card_ring", 0.44, 1.38)
					shakeUntil, shakeAmp = now + 0.12, if visualMobile then 0.12 else 0.26
				end
			end
			-- [고스트 오브 쓰시마식 병종 협동] 원본 AC 공격 토큰(동시 근접 2명)/공격 주기/데미지를 유지.
			-- 프레임당 전체 적을 새로 탐색하지 않고 각 적만 0.65~0.9초마다 목표 포지션을 갱신한다.
			-- 방패는 전면 압박, 검병은 좌우 측후방, 돌격병은 외측에서 합류, 사수는 거리 유지와 사선 확보.
			if e.ac.state == "chase" and not frozen and now >= (e.tacticAt or 0)
				and flat.Magnitude < 90 then
				e.tacticAt = now + 0.65 + (e.motionPhase or 0) * 0.25
				local looking = hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
				if looking.Magnitude < 0.01 then looking = Vector3.new(0, 0, -1) end
				looking = looking.Unit
				local right = Vector3.new(-looking.Z, 0, looking.X)
				local side = e.tacticSide or 1
				local spread = (index % 4) * 2.4
				local intent = "approach"
				local goal = hrp.Position
				-- [반복 공격 학습] 두목만 최근 일반 공격의 간격을 기억해 측면 전술을 바꾼다.
				-- 학습 반응에는 쿨다운이 있고 피해/회피 확률·공격 토큰 수를 올리지 않는다.
				if e.boss and swingBridge.basicAt > (e.lastReadBasicAt or -100) then
					e.playerChain = if swingBridge.basicAt - (e.lastReadBasicAt or -100) <= 1.25
						then math.min(4, (e.playerChain or 0) + 1) else 1
					e.lastReadBasicAt = swingBridge.basicAt
					if e.playerChain >= 3 and now >= (e.nextBossReadAt or 0) then
						e.bossReadUntil, e.nextBossReadAt = now + 2.0, now + 5.0
						e.tacticSide = -(e.tacticSide or 1)
						side = e.tacticSide
					end
				end
				if e.ac.kind == "shield" then
					intent, goal = "frontline", hrp.Position + looking * (7.2 + spread * 0.25) + right * side * (2.8 + spread)
				elseif e.weapon and e.weapon.family == "spear" then
					-- 창병은 사거리 바깥에서 좌우 디딤 후 찌르기. 명중 거리 자체는 바꾸지 않는다.
					intent, goal = "reach", hrp.Position - looking * (4.0 + spread * 0.25) + right * side * (6.5 + spread)
				elseif e.ac.kind == "grunt" then
					-- [3인 협동] 같은 근접 무리가 전부 후방으로 몰리지 않게 선두 하나를 세운다.
					-- 이미 방패병이 전면을 맡았으면 검병은 측면으로, 아니면 앞 번호 검병이 압박한다.
					local hasFront = false
					for mateIndex, mate in enemies do
						if mate ~= e and not mate.ac.dead and mate.root and mate.root.Parent
							and (mate.root.Position - hrp.Position).Magnitude <= 32
							and (mate.ac.kind == "shield" or (mate.ac.kind == "grunt" and mateIndex < index)) then
							hasFront = true
							break
						end
					end
					if hasFront then
						intent, goal = "flank", hrp.Position - looking * (3.8 + spread * 0.40) + right * side * (9.0 + spread)
					else
						intent, goal = "frontline", hrp.Position + looking * (7.2 + spread * 0.25) + right * side * (2.0 + spread * 0.3)
					end
				elseif e.ac.kind == "charger" then
					intent, goal = "ambush", hrp.Position - looking * (5.5 + spread * 0.55) + right * side * (10.5 + spread)
				elseif e.ac.kind == "archer" then
					local away = (e.root.Position - hrp.Position) * Vector3.new(1, 0, 1)
					if away.Magnitude > 0.1 then
						local retreat = if e.ac.hp <= e.maxHp * 0.35 then 34 else 28
						intent = if away.Magnitude < retreat then "retreat" else "strafe"
						goal = hrp.Position + away.Unit * retreat + right * side * (7 + spread)
					end
				elseif e.boss then
					-- [두목의 방어 읽기] 실제 방어 자세만 보고 측면으로 이동한다. 추가 공격이나 즉시 반격은 없다.
					if pl.guarding and now >= (e.nextGuardReadAt or 0) then
						e.guardReadUntil, e.nextGuardReadAt = now + 1.05, now + 5.5
						e.tacticSide = -(e.tacticSide or 1)
						side = e.tacticSide
					end
					local readingCombo = now < (e.bossReadUntil or 0)
					local readingGuard = now < (e.guardReadUntil or 0)
					local reading = readingCombo or readingGuard
					intent = if readingCombo then "counter-flank" elseif readingGuard then "guard-flank" else "pressure"
					goal = hrp.Position + looking * (if reading then -3 else 8)
						+ right * side * (if reading then 10 + spread * 0.5 else 3 + spread * 0.5)
					e.model:SetAttribute("FieldBossStance", if reading then "reading" else "pressure")
				end
				-- [협동 간격] 같은 지점으로 3명이 겹치지 않게 기존 목표를 옆으로 벌린다.
				-- 0.65초마다만 1회 검사하며 동료끼리 공격력/충돌체는 바꾸지 않는다.
				if not e.ac.def.keepAway and not e.boss then
					local nearGoal = 0
					for _, other in enemies do
						if other ~= e and not other.ac.dead and other.root and other.root.Parent
							and (other.root.Position - goal).Magnitude < 6 then
							nearGoal += 1
							if nearGoal >= 2 then break end
						end
					end
					if nearGoal > 0 then goal += right * side * (3.0 + nearGoal * 1.5) end
				end
				goal = Vector3.new(math.clamp(goal.X, ORIGIN.X - half + 9, ORIGIN.X + half - 9),
					e.root.Position.Y, math.clamp(goal.Z, ORIGIN.Z - half + 9, ORIGIN.Z + half - 9))
				e.tacticGoal, e.tacticIntent = goal, intent
				e.model:SetAttribute("FieldTacticalIntent", intent)
			end
			-- [방패 즉시 판단] 0.65초 이동 목표 갱신과 독립하여 주인공의 진짜 평타 입력을 짧게 읽는다.
			-- 정면에서만 방패를 들어 올리므로 측면·후면에서의 원래 피해 판정은 그대로 통과한다.
			if e.ac.kind == "shield" and (e.ac.state == "chase" or e.ac.state == "recover")
				and not frozen and flat.Magnitude > 0.1 and flat.Magnitude < 15
				and now - (swingBridge.basicAt or -100) < 0.22
				and now >= (e.nextGuardTellAt or 0)
				and e.root.CFrame.LookVector:Dot(flat.Unit) > 0.22 then
				e.guardUntil = math.max(e.guardUntil or 0, now + 0.30)
				e.nextGuardTellAt = now + 1.4
				e.model:SetAttribute("FieldTacticalIntent", "guard")
			end
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
			elseif e.waiting and not frozen and not e.ac.def.keepAway and e.ac.state == "chase"
				and flat.Magnitude > 0.1 and flat.Magnitude < 40 then
				-- [기다리는 적은 밖에서 견제] 플레이어에게 몸을 비비던 궤도를 반경 12~27 스터드로 유지한다.
				-- 뒤로 물러나는 발과 측면 디딤만 이동시키며 공격권이 오면 원래 사거리로 진입한다.
				e.circleDir = e.circleDir or e.tacticSide or 1
				local ring = math.clamp(e.ac.def.range * STUD + 5 + (index % 3) * 2, 12, 27)
				local band = math.clamp((flat.Magnitude - ring) / 6, -0.85, 0.75)
				local tangent = flat.Unit:Cross(Vector3.yAxis) * e.circleDir
				desired = (tangent * 0.44 + flat.Unit * band) * e.ac.def.speed * 0.70
				if e.model:GetAttribute("FieldTacticalIntent") ~= "guard-circle" then
					e.model:SetAttribute("FieldTacticalIntent", "guard-circle")
				end
			elseif e.ac.def.keepAway and e.ac.state == "chase" and not frozen
				and e.tacticGoal and (e.tacticIntent == "retreat" or wish == 0) then
				-- 궁수/총병은 조준 전 후방 재배치·수평 견제. 공격 예고/발사 시에는 기존 정지 규칙이 우선.
				local route = (e.tacticGoal - pv.Position) * Vector3.new(1, 0, 1)
				if route.Magnitude > 2 then
					desired = route.Unit * math.min(e.ac.def.speed * 0.64, route.Magnitude / math.max(dtc, 0.016))
				end
			elseif e.tacticGoal and wish > 0 and e.ac.state == "chase" and not frozen
				and flat.Magnitude > e.ac.def.range * STUD + 5 and flat.Magnitude < 70 then
				-- 검병과 돌격병은 목표 옆구리로 접근하지만 최종 타격 거리에서는 주인공을 향해 선회.
				local route = (e.tacticGoal - pv.Position) * Vector3.new(1, 0, 1)
				if route.Magnitude > 2 then
					local routeDir = (route.Unit * 0.72 + flat.Unit * 0.28)
					desired = routeDir.Unit * math.min(e.ac.def.speed * 0.8, route.Magnitude / math.max(dtc, 0.016))
				else
					desired = flat.Unit * e.ac.def.speed * 0.68
				end
			elseif wish ~= 0 and flat.Magnitude > 0.1 then
				desired = flat.Unit * wish * math.min(e.ac.def.speed * 0.8, flat.Magnitude / math.max(dtc, 0.016))
			end
			local response = if evading then 22 elseif charging then 17 elseif desired.Magnitude > 0 then 9 else 13
			-- [스키 이동 방지] 공격 준비·타격·후딜에 잔여 속도를 끊고 발을 접지한다.
			if not charging and not evading and (frozen or e.ac.state == "windup" or e.ac.state == "active" or e.ac.state == "recover") then
				e.moveVel = Vector3.zero
			else
				e.moveVel = (e.moveVel or Vector3.zero):Lerp(desired, 1 - math.exp(-response * enemyDt))
			end
			if e.moveVel.Magnitude < 0.07 then e.moveVel = Vector3.zero end
			local delta = e.moveVel * enemyDt
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
					if targetRot ~= rot then
						rot = rot:Lerp(targetRot, 1 - math.exp(-(if charging then 12 elseif e.ac.state == "windup" then 10 else 7) * enemyDt))
					end
				end
				-- [경사 접지] 적군도 실제 구릉 표면을 따른다. 높이 검사는 모바일에서 저빈도 갱신.
				local nextPos = pv.Position + delta
				if now >= (e.nextGroundAt or 0) then
					e.nextGroundAt = now + (if visualMobile then 0.18 else 0.12)
					local hit = workspace:Raycast(Vector3.new(nextPos.X, ORIGIN.Y + 100, nextPos.Z), Vector3.new(0, -140, 0), groundRay)
					if hit and hit.Normal.Y > 0.45 then e.groundY = hit.Position.Y + (e.groundOffset or 0) end
				end
				if e.groundY then
					nextPos = Vector3.new(nextPos.X,
						math.clamp(e.groundY, nextPos.Y - 25 * enemyDt, nextPos.Y + 25 * enemyDt), nextPos.Z)
				end
				-- [적 모델 이동 최적화] 완전히 동일한 위치·회전이면 전체 리그의 변환 재설정을 생략한다.
				-- 실제 미세 이동, 방향 전환, 접지 보정, 공격·넉백은 기존대로 반영한다.
				local nextPivot = CFrame.new(nextPos) * rot
				if nextPivot ~= pv then
					e.model:PivotTo(nextPivot)
				end
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
				-- [원거리 관절 경량화] 전술·이동·피해·공격권은 위의 기존 매 프레임 루프 그대로 유지한다.
				-- 화면에서 먼 일반 적의 R15 관절 샘플링만 저빈도로 갱신해 모바일 CPU 부하를 낮춘다.
				-- 공격 준비/타격/회복, 피격, 방어, 다운·기상, 두목은 매 프레임 즉시 반영한다.
				local constrainedVisual = visualMobile or dt > 1 / 35
				local farVisual = not e.boss and flat.Magnitude > (if constrainedVisual then 48 else 90)
					and (e.ac.state == "idle" or e.ac.state == "chase")
					and now >= (e.hurtAt or -100) + 0.3
					and now >= (e.knockUntil or 0) and now >= (e.riseUntil or 0)
					and now >= (e.guardUntil or 0) and now >= (e.parryUntil or 0)
					and now >= (e.dodgeUntil or 0)
				-- [프레임 예산] 먼 대기/추적의 관절 합성만 제한한다. 상태 전환은 즉시 반영.
				local visualChanged = e.lastVisualCombatState ~= e.ac.state
				e.visualElapsed = math.min(0.15, (e.visualElapsed or 0) + enemyDt)
				if not farVisual or visualChanged or now >= (e.nextVisualTickAt or 0) then
					e.lastVisualCombatState = e.ac.state
					e.nextVisualTickAt = if farVisual then now + (if constrainedVisual then 0.24 else 0.09) else 0
					local visualDt = if farVisual and not visualChanged then e.visualElapsed else enemyDt
					e.visualElapsed = 0
				local st, ph = "IDLE", (now / 2.4 + e.motionPhase) % 1
				local acs = e.ac.state
				if now < (e.knockUntil or 0) then
					st, ph = "KNOCKDOWN", math.clamp((now - (e.knockAt or now)) / 0.78, 0, 1)
				elseif now < (e.riseUntil or 0) then
					st, ph = "GETUP", math.clamp((now - e.knockUntil) / math.max(e.riseUntil - e.knockUntil, 0.1), 0, 1)
				elseif (e.parryUntil or 0) > now then
					st, ph = "PARRY", 1 - (e.parryUntil - now) / 0.37
				elseif (e.guardUntil or 0) > now then
					st, ph = "BLOCK", 1 - (e.guardUntil - now) / 0.37
				elseif (e.dodgeUntil or 0) > now then
					st, ph = "EVADE", math.clamp((now - (e.dodgeT0 or now)) / 0.36, 0, 1)
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
					-- 병종/타격 순번에 따라 상체 숙임과 뒤젖힘을 교대로 써 반복 피격도 다르게 보인다.
					lean = (if e.hitVariant == 2 then -0.36 else 0.6) * (1 - ph) * (1 - ph)
				elseif st == "BLOCK" or st == "PARRY" then
					lean = if st == "BLOCK" then 0.24 else -0.22
				elseif st == "KNOCKDOWN" then
					lean = -0.1
				elseif st == "GETUP" then
					lean = 0.18 * (1 - ph)
				end
				-- [근접 돌진 접지] 기존 공격 이동거리와 사거리·판정은 그대로 두되,
				-- 실제 전진한 거리만 발 디딤 포즈로 전달해 공중에서 미끄러지는 느낌을 막는다.
				e.attackStep = 0
				if st == "ATTACK" and not def0.keepAway and def0.range <= 12 and flat.Magnitude > 2.5 then
					local lunge = flat.Unit * math.min(def0.speed * 1.8 * enemyDt, flat.Magnitude - 2.5)
					e.model:PivotTo(e.model:GetPivot() + lunge)
					e.attackStep = lunge.Magnitude
				end
				-- 숨쉬기·체중 이동(대기), 달릴 때 위아래 출렁임과 앞으로 숙임으로 가만히 있어도 살아 보이게 한다
				local bob, roll = 0, 0
				if st == "IDLE" then
					bob, roll, lean = math.sin(now * 2.2 + e.spawnT) * 0.06, math.sin(now * 1.1 + e.spawnT) * 0.05, lean + math.sin(now * 1.6 + e.spawnT) * 0.04
				elseif st == "KNOCKDOWN" then
					bob = -0.65 * math.min(ph * 2.4, 1)
					roll = (if e.knockVariant == 2 then 0.36 else -0.21) * math.sin(ph * math.pi * 0.75)
				elseif st == "GETUP" then
					bob = -0.65 * (1 - ph) * (1 - ph)
					roll = (if e.knockVariant == 2 then 0.14 else -0.09) * (1 - ph)
				elseif st == "BLOCK" or st == "PARRY" then
					bob, roll = -0.13, if st == "PARRY" then 0.19 * math.sin(ph * math.pi) else -0.08
				elseif st == "RUN" then
					local pace = math.clamp((e.moveVel or Vector3.zero).Magnitude / math.max(e.ac.def.speed, 1), 0, 1.4)
					bob, roll, lean = math.abs(math.sin((e.gait or 0) * math.pi * 2)) * 0.075 * pace, math.sin((e.gait or 0) * math.pi * 2) * 0.03, -0.12 * pace
				elseif st == "EVADE" then
					-- [회피 모션 정합] 임의 생성 위상이 아니라 AI가 실제 선택한 좌/우를 관절 회전에 쓴다.
					local evadeSide = e.model:GetAttribute("FieldEnemyDodgeSide") or e.tacticSide or 1
					bob, roll, lean = -0.18 * math.sin(ph * math.pi), evadeSide * 0.20 * math.sin(ph * math.pi), -0.20
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
				FM.actor(e.fm, st, ph, visualDt, e.boss, if e.boss then 1.45 else 1.35, CFrame.new(0, bob, 0) * CFrame.Angles(lean, 0, roll),
					(kindId == "archer" or e.throwAsset ~= nil) and wish < 0, nil,
					if e.throwAsset then nil else (e.weapon and e.weapon.motion),
					math.clamp(traveled / math.max(dtc, 0.016) / math.max(e.ac.def.speed, 1), 0.18, 1.25),
					math.clamp(e.root.CFrame.RightVector:Dot(e.moveVel) / math.max(e.ac.def.speed, 1), -1, 1),
					e.attackStep)
				end
			elseif hurtProgress >= 0 and hurtProgress < 1 then
				Pose.makeR15Action(e.model, "hurt", hurtProgress, now - e.spawnT)
			elseif attackProgress >= 0 and attackProgress < 1 then
				Pose.makeR15Action(e.model, "attack", attackProgress, now - e.spawnT)
			else
				Pose.makeR15Action(e.model, if traveled > 0.025 then "run" else "idle", 0, if traveled > 0.025 then (e.gait or 0) * 2 * math.pi else now - e.spawnT)
			end
		end
	end))

	-- [직업 지원 파티] 상시 동료 모델/추적 AI는 만들지 않는다. 기존 영입 명단과 직업별 스킬만 사용한다.
	-- 호출/자동지원/필살 게이지는 이번 탐험 한정이며 저장 키를 추가하지 않는다.
	(function()
		local party = if type(opts.allies) == "table" then opts.allies else {}
		local seen = {}
		local count = 0
		local support = { members = {}, gauge = 0, ultimate = 0, failed = 0, nextAt = 0, nextCheck = 0, nextUltimate = 0, hits = 0, defense = 0, hp = pl.hp, threat = false }
		local function context()
			local ch, root = char3()
			if not root or not ch or pl.hp <= 0 then return nil end
			local ctx = { ch = ch, root = root, close = 0, ranged = 0, regular = 0, boss = false, warning = false, weak = false }
			for _, e in enemies do
				if not e.ac.dead and e.root.Parent then
					local d = (e.root.Position - root.Position).Magnitude
					if d <= 30 * STUD then ctx.ranged += 1 end
					if d <= 12 * STUD then ctx.close += 1 end
					if d <= 14 * STUD and not e.boss then ctx.regular += 1 end
					if e.boss and d <= 28 * STUD then
						ctx.boss = true
						ctx.warning = ctx.warning or e.ac.state == "windup" or e.bossCast ~= nil
						ctx.weak = ctx.weak or os.clock() < (e.bossWeakUntil or 0) or e.ac.state == "recover"
					end
				end
			end
			return ctx
		end
		local function score(skill, ctx)
			local hp = pl.hp / math.max(1, pl.maxHp)
			if skill == "heal" then return if hp <= 0.45 then 100 elseif hp <= 0.75 then 55 else 0 end
			if skill == "armor" then return if not pl.ward and ctx.warning then 95 elseif not pl.ward and ctx.close >= 2 then 45 else 0 end
			if skill == "read" then return if ctx.regular >= 2 then 80 elseif ctx.regular > 0 then 45 else 0 end
			if skill == "rally" then return if os.clock() >= (pl.buffUntil or 0) and ctx.ranged > 0 then (if streakN >= 4 or ctx.weak then 85 else 35) else 0 end
			if skill == "luck" then return if pl.stamina < AC.STAMINA_MAX * 0.4 or hp < 0.65 then 80 else 0 end
			if skill == "volley" then return if ctx.ranged >= 3 then 90 elseif ctx.ranged > 0 then 30 else 0 end
			if skill == "snipe" then return if ctx.ranged > 0 then (if ctx.weak or ctx.warning then 90 else 45) else 0 end
			if skill == "bash" then return if ctx.close > 0 then (if ctx.weak or streakN >= 3 then 85 else 45) else 0 end
			return 0
		end
		local function choose(member, ctx, automatic)
			local best, value = nil, 0
			for _, id in member.skills do
				local n = score(id, ctx)
				if (member.ready[id] or 0) <= os.clock() and n > value and (not automatic or n >= 45) then best, value = id, n end
			end
			return best, value
		end
		local function invoke(member, id, ctx, automatic)
			local now = os.clock()
			local cost = if automatic then 35 else 60
			if finished or pl.hp <= 0 or support.gauge < cost or now < support.nextAt or (member.ready[id] or 0) > now then return false end
			support.gauge -= cost
			support.nextAt, support.failed = now + (if automatic then 12 else 4), 0
			member.ready[id] = now + JobSkills.Skills[id].cooldown
			member.status:SetAttribute("FieldSupportSkill", id)
			member.status:SetAttribute("FieldSupportMode", if automatic then "automatic" else "called")
			showCombo(member.name .. " · " .. JobSkills.Skills[id].name, true, Color3.fromRGB(125, 228, 215))
			member.outline.Color = Color3.fromRGB(255, 222, 124)
			screenFlash(Color3.fromRGB(125, 228, 215), if visualMobile then 0.96 else 0.91)
			castEffect(id, member.name, ctx.ch, ctx.root, member.role)
			return true
		end
		local ultimate = btn(gui, "필살기 8단", Color3.fromRGB(99, 69, 119),
			UDim2.fromOffset(88, 42), if compactTouch then UDim2.new(0, 12, 1, -226) else UDim2.new(1, -12, 0, 62),
			if compactTouch then Vector2.zero else Vector2.new(1, 0))
		ultimate.Name = "FieldUltimate"
		ultimate.TextSize = 13
		ultimate.TextYAlignment = Enum.TextYAlignment.Center
		ultimate:SetAttribute("SkillFullName", "무기 필살기")
		bindPress(ultimate, function()
			if finished or pl.hp <= 0 or (pl.masteryRank or 1) < 8 or support.ultimate < 100 or os.clock() < support.nextUltimate then return end
			local ctx = context()
			if not ctx or ctx.ranged == 0 then return end
			local move = if not wpn.ranged and ctx.close >= 2 then "sweep" else "heavy"
			local success = useMove(move, true)
			if not success then return end
			support.ultimate, support.nextUltimate = 0, os.clock() + 18
			showCombo(wpn.name .. " · 필살기!", true, Color3.fromRGB(255, 219, 135))
			if (pl.masteryRank or 1) >= 9 then
				for _, member in support.members do
					local id = choose(member, ctx, false)
					if id and invoke(member, id, ctx, false) then break end
				end
			end
		end)
		for _, member in party do
			if count >= 2 then break end
			if type(member) == "table" and type(member.id) == "string" and type(member.name) == "string"
				and member.id ~= "" and not seen[member.id] then
				seen[member.id] = true
				count += 1
				-- [지역변수 예산] 파티 UI 객체는 한 테이블에서 관리하고 전투 함수 200레지스터 상한을 보호한다.
				local ui = {}
				local status = Instance.new("Frame")
				status.Name = "FieldAllyStatus" .. count
				status:SetAttribute("CompanionId", member.id)
				status:SetAttribute("CombatEnabled", false)
				status:SetAttribute("SupportEnabled", true)
				status.Position = UDim2.fromOffset(heroPanel.Position.X.Offset,
					heroPanel.Position.Y.Offset + heroPanel.Size.Y.Offset + 6 + (count - 1) * (if visualMobile then 48 else 56))
				status.Size = UDim2.fromOffset(heroPanel.Size.X.Offset, if visualMobile then 44 else 52)
				status.BackgroundColor3 = Color3.fromRGB(24, 33, 49)
				status.BackgroundTransparency = 0.12
				status.BorderSizePixel = 0
				status.Parent = gui
				ui.rounded = Instance.new("UICorner")
				ui.rounded.CornerRadius = UDim.new(0, 9)
				ui.rounded.Parent = status
				ui.outline = Instance.new("UIStroke")
				ui.outline.Color = if count == 1 then Color3.fromRGB(105, 200, 223) else Color3.fromRGB(222, 181, 103)
				ui.outline.Thickness = 1.1
				ui.outline.Parent = status
				ui.face = Instance.new("ImageLabel")
				ui.face.Name = "FieldAllyPortrait"
				ui.face.Size = UDim2.fromOffset(if visualMobile then 29 else 39, if visualMobile then 35 else 43)
				ui.face.Position = UDim2.fromOffset(6, 5)
				ui.face.BackgroundColor3 = Color3.fromRGB(56, 70, 82)
				ui.face.BorderSizePixel = 0
				ui.face.ScaleType = Enum.ScaleType.Crop
				ui.portrait = opts.allyPortraits and opts.allyPortraits[member.id]
				if ui.portrait and ui.portrait.id then
					ui.face.Image = "rbxassetid://" .. tostring(ui.portrait.id)
					ui.face.ImageRectOffset = ui.portrait.offset or Vector2.zero
					ui.face.ImageRectSize = ui.portrait.size or Vector2.zero
				end
				ui.face.Parent = status
				ui.faceRounded = Instance.new("UICorner")
				ui.faceRounded.CornerRadius = UDim.new(0, 7)
				ui.faceRounded.Parent = ui.face
				ui.nameText = label(status, member.name, if visualMobile then 12 else 13)
				ui.nameText.Name = "FieldAllyName"
				ui.nameText.Position = UDim2.fromOffset(if visualMobile then 43 else 51, 4)
				ui.nameText.Size = UDim2.fromOffset(if visualMobile then 151 else 143, 18)
				ui.nameText.TextXAlignment = Enum.TextXAlignment.Left
				ui.nameText.TextTruncate = Enum.TextTruncate.AtEnd
				ui.role = if type(member.role) == "string" and member.role ~= "" then member.role else "동료"
				ui.statusText = label(status, ui.role .. " · 파티원", if visualMobile then 10 else 11, Color3.fromRGB(168, 210, 190))
				ui.statusText.Name = "FieldAllyPartyRole"
				ui.statusText.Position = UDim2.fromOffset(if visualMobile then 43 else 51, if visualMobile then 23 else 27)
				ui.statusText.Size = UDim2.fromOffset(if visualMobile then 151 else 143, 18)
				ui.statusText.TextXAlignment = Enum.TextXAlignment.Left
				ui.statusText.TextTruncate = Enum.TextTruncate.AtEnd
				ui.nameText.Size = UDim2.fromOffset(if visualMobile then 83 else 77, 18)
				ui.statusText.Size = ui.nameText.Size
				local role = if JobSkills.Categories[ui.role] then ui.role else JobSkills.categoryOf(ui.role)
				local entry = { name = member.name, role = role, skills = JobSkills.Categories[role].skills, ready = {}, status = status, outline = ui.outline }
				local call = btn(status, "호출", Color3.fromRGB(44, 98, 108), UDim2.fromOffset(66, 38), UDim2.new(1, -3, 0.5, 0), Vector2.new(1, 0.5))
				call.Name = "FieldAllyCall" .. count
				call.TextSize = 12
				call.TextYAlignment = Enum.TextYAlignment.Center
				call.ZIndex = status.ZIndex + 3
				call:SetAttribute("SkillFullName", "동료 호출")
				entry.button = call
				table.insert(support.members, entry)
				bindPress(call, function()
					local ctx = context()
					if not ctx then return end
					local id = choose(entry, ctx, false)
					if id then invoke(entry, id, ctx, false) end
				end)
			end
		end
		table.insert(conns, RunService.Heartbeat:Connect(function()
			local now = os.clock()
			if finished or pl.hp <= 0 or now < support.nextCheck then return end
			support.nextCheck = now + 0.25
			local hits, defense = pl.supportHits or 0, pl.supportDefense or 0
			local gain = math.max(0, hits - support.hits) * 7 + math.max(0, defense - support.defense) * 18
			local damage = math.max(0, support.hp - pl.hp)
			support.hits, support.defense, support.hp = hits, defense, pl.hp
			support.gauge = math.min(100, support.gauge + gain)
			if (pl.masteryRank or 1) >= 8 then support.ultimate = math.min(100, support.ultimate + gain) end
			local ctx = context()
			if not ctx then return end
			local event = gain > 0 or damage > 0 or (ctx.warning and not support.threat)
			support.threat = ctx.warning
			-- 수동 호출 준비가 되면 자동 지원은 게이지를 선점하지 않는다. 위기에서만 예외.
			if event and now >= support.nextAt and support.gauge >= 35
				and (support.gauge < 60 or pl.hp / math.max(1, pl.maxHp) <= 0.35) then
				local best, skill, value = nil, nil, 0
				for _, member in support.members do
					local id, n = choose(member, ctx, true)
					if id and n > value then best, skill, value = member, id, n end
				end
				if best then
					local chance = math.min(0.9, 0.12 + value * 0.003 + support.failed * 0.12)
					if support.failed >= 5 or comboRng:NextNumber() < chance then
						invoke(best, skill, ctx, true)
					else
						support.failed += 1
						support.nextAt = now + 0.75
					end
				end
			end
			for _, member in support.members do
				local id = choose(member, ctx, false)
				local ready = id ~= nil and support.gauge >= 60 and now >= support.nextAt
				member.button.Text = if ready then "호출!" else string.format("호출 %d%%", math.floor(support.gauge))
				member.button:SetAttribute("SupportReady", ready)
				member.button:SetAttribute("SupportGauge", support.gauge)
				member.outline.Color = if ready then Color3.fromRGB(255, 222, 124) else Color3.fromRGB(105, 200, 223)
				member.button:SetAttribute("SupportNextSkill", id or "")
				member.button:SetAttribute("SkillFullName", if id then JobSkills.Skills[id].name else "동료 호출")
			end
			ultimate.Text = if (pl.masteryRank or 1) < 8 then "필살기 8단" elseif support.ultimate >= 100 and now >= support.nextUltimate then "필살기!" else string.format("필살기 %d%%", math.floor(support.ultimate))
			ultimate:SetAttribute("UltimateGauge", support.ultimate)
			ultimate:SetAttribute("UltimateReady", (pl.masteryRank or 1) >= 8 and support.ultimate >= 100 and now >= support.nextUltimate)
		end))
	end)()

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
			local viewport = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(800, 600)
			-- 짧은 가로 화면에서도 동료 카드 두 장 아래에 이동패드를 확보한다.
			local padSize = if viewport.X > viewport.Y then math.clamp(viewport.Y - 272, 44, 150) else 150
			pad.Position = UDim2.new(0, if viewport.X > viewport.Y and viewport.Y < 316 then 226 else 28,
				1, if padSize < 150 then -12 else -28)
			pad.Size = UDim2.fromOffset(padSize, padSize)
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
			knob.Size = UDim2.fromScale(0.4, 0.4)
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
				knob.Position = UDim2.fromScale(0.5 + vec.X * 0.32, 0.5 + vec.Y * 0.32)
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
	say("공격 F · 회피 R · 방어 G · 숙련 연타 · 동료 호출 · 8단 필살기")
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
