-- 파일명: assets/roblox/common-foliage-v1/RobloxCommonFoliage.luau
-- 역할: 여러 Roblox 게임에서 재사용하는 회사 공용 초목/자연 소품 18종 생성
-- 원칙: 순수 표현 자산만 제공한다. 이동/채집/드랍/밸런스/세이브/네트워크 권한은 소유하지 않는다.

local RobloxCommonFoliage = {}

local QUALITY_LEVEL = table.freeze({
	far = 1,
	mid = 2,
	near = 3,
})

local function c(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local Catalog = table.freeze({
	GRASS_TUFT = table.freeze({
		id = "GRASS_TUFT",
		name = "풀 포기",
		familyRootId = "FOLIAGE_GRASS",
		family = "ENVIRONMENT",
		subfamily = "GRASS",
		environmentRole = "GROUND_COVER",
		silhouette = "RADIAL_TAPERED_BLADES",
		palette = table.freeze({
			leaf = c(75, 116, 61),
			leafLight = c(108, 145, 76),
			leafDark = c(55, 84, 48),
		}),
	}),
	BUSH_ROUND = table.freeze({
		id = "BUSH_ROUND",
		name = "둥근 관목",
		familyRootId = "FOLIAGE_BUSH",
		family = "ENVIRONMENT",
		subfamily = "BUSH",
		environmentRole = "MIDGROUND_FOLIAGE",
		silhouette = "ASYMMETRIC_ROUND_CLUSTER",
		palette = table.freeze({
			leaf = c(65, 106, 55),
			leafLight = c(91, 132, 68),
			leafDark = c(45, 72, 42),
			stem = c(90, 67, 46),
		}),
	}),
	FERN_CLUSTER = table.freeze({
		id = "FERN_CLUSTER",
		name = "고사리 군락",
		familyRootId = "FOLIAGE_FERN",
		family = "ENVIRONMENT",
		subfamily = "FERN",
		environmentRole = "UNDERSTORY",
		silhouette = "RADIAL_ARCHING_FRONDS",
		palette = table.freeze({
			leaf = c(61, 110, 62),
			leafLight = c(88, 141, 78),
			leafDark = c(43, 78, 47),
			stem = c(78, 91, 52),
		}),
	}),
	WILDFLOWER_PATCH = table.freeze({
		id = "WILDFLOWER_PATCH",
		name = "야생화 군락",
		familyRootId = "FOLIAGE_FLOWER",
		family = "ENVIRONMENT",
		subfamily = "FLOWER",
		environmentRole = "GROUND_ACCENT",
		silhouette = "LOW_STEMS_SMALL_BLOOMS",
		palette = table.freeze({
			stem = c(74, 111, 58),
			leaf = c(90, 128, 65),
			flowerA = c(236, 194, 92),
			flowerB = c(204, 120, 153),
			core = c(245, 220, 117),
		}),
	}),
	TREE_STUMP = table.freeze({
		id = "TREE_STUMP",
		name = "나무 그루터기",
		familyRootId = "FOLIAGE_STUMP",
		family = "ENVIRONMENT",
		subfamily = "STUMP",
		environmentRole = "NATURAL_PROP",
		silhouette = "LOW_CUT_TRUNK_ROOT_FLARE",
		palette = table.freeze({
			bark = c(89, 62, 43),
			barkLight = c(117, 81, 52),
			cut = c(177, 135, 88),
			moss = c(79, 102, 60),
		}),
	}),
	FALLEN_LOG = table.freeze({
		id = "FALLEN_LOG",
		name = "쓰러진 통나무",
		familyRootId = "FOLIAGE_FALLEN_LOG",
		family = "ENVIRONMENT",
		subfamily = "FALLEN_LOG",
		environmentRole = "NATURAL_PROP",
		silhouette = "HORIZONTAL_LOG_BROKEN_BRANCHES",
		palette = table.freeze({
			bark = c(84, 58, 40),
			barkLight = c(112, 77, 49),
			cut = c(169, 126, 81),
			moss = c(76, 99, 57),
		}),
	}),
	PINE_TREE = table.freeze({
		id = "PINE_TREE",
		name = "소나무",
		familyRootId = "FOLIAGE_PINE_TREE",
		family = "ENVIRONMENT",
		subfamily = "PINE_TREE",
		environmentRole = "CANOPY_TREE",
		silhouette = "TALL_TRUNK_LAYERED_CONIFER",
		palette = table.freeze({
			bark = c(83, 59, 43),
			barkLight = c(110, 75, 51),
			needle = c(50, 88, 59),
			needleLight = c(70, 110, 68),
			needleDark = c(38, 66, 48),
		}),
	}),
	DEAD_TREE = table.freeze({
		id = "DEAD_TREE",
		name = "고사목",
		familyRootId = "FOLIAGE_DEAD_TREE",
		family = "ENVIRONMENT",
		subfamily = "DEAD_TREE",
		environmentRole = "SILHOUETTE_TREE",
		silhouette = "BARE_TRUNK_FORKED_BRANCHES",
		palette = table.freeze({
			bark = c(78, 68, 57),
			barkLight = c(108, 95, 78),
			barkDark = c(57, 49, 43),
			moss = c(73, 85, 57),
		}),
	}),,
	BROADLEAF_TREE = table.freeze({
		id="BROADLEAF_TREE", name="활엽수", familyRootId="FOLIAGE_BROADLEAF", family="ENVIRONMENT", subfamily="BROADLEAF_TREE", environmentRole="CANOPY_TREE",
		systemRoles=table.freeze({"BROADLEAF_TREE"}), silhouette="BRANCHED_TRUNK_ROUND_CANOPY", palette=table.freeze({bark=c(91,66,47), barkLight=c(121,87,58), leaf=c(69,111,62), leafLight=c(101,143,78), leafDark=c(48,80,48)}),
	}),
	VINE_CLUSTER = table.freeze({
		id="VINE_CLUSTER", name="덩굴 군락", familyRootId="FOLIAGE_VINE", family="ENVIRONMENT", subfamily="VINE", environmentRole="CLIMBING_FOLIAGE",
		systemRoles=table.freeze({"VINE"}), silhouette="HANGING_VINES_LEAF_KNOTS", palette=table.freeze({stem=c(63,91,50), leaf=c(69,112,56), leafLight=c(100,143,72), leafDark=c(43,77,42)}),
	}),
	REED_PATCH = table.freeze({
		id="REED_PATCH", name="갈대 군락", familyRootId="FOLIAGE_REED", family="ENVIRONMENT", subfamily="REED", environmentRole="WETLAND_EDGE",
		systemRoles=table.freeze({"REED"}), silhouette="TALL_REED_STEMS_SEED_HEADS", palette=table.freeze({stem=c(111,123,72), leaf=c(91,112,61), seed=c(135,105,70)}),
	}),
	MOSS_PATCH = table.freeze({
		id="MOSS_PATCH", name="이끼 군락", familyRootId="FOLIAGE_MOSS", family="ENVIRONMENT", subfamily="MOSS", environmentRole="GROUND_SURFACE",
		systemRoles=table.freeze({"MOSS"}), silhouette="LOW_IRREGULAR_MOSS_MATS", palette=table.freeze({moss=c(73,105,61), mossLight=c(105,132,75), mossDark=c(49,75,47)}),
	}),
	MUSHROOM_CLUSTER = table.freeze({
		id="MUSHROOM_CLUSTER", name="버섯 군락", familyRootId="FOLIAGE_MUSHROOM", family="ENVIRONMENT", subfamily="MUSHROOM", environmentRole="FOREST_FLOOR",
		systemRoles=table.freeze({"MUSHROOM"}), silhouette="SMALL_CAP_CLUSTER", palette=table.freeze({stem=c(207,195,165), cap=c(150,87,68), capLight=c(198,128,91), spot=c(226,213,174)}),
	}),
	ROOT_CLUSTER = table.freeze({
		id="ROOT_CLUSTER", name="노출 뿌리 군락", familyRootId="FOLIAGE_ROOT", family="ENVIRONMENT", subfamily="ROOT", environmentRole="ROOT_STRUCTURE",
		systemRoles=table.freeze({"ROOT"}), silhouette="RADIAL_EXPOSED_ROOTS", palette=table.freeze({bark=c(91,65,45), barkLight=c(126,89,57), moss=c(74,98,56)}),
	}),
	AUTUMN_TREE_VARIANT = table.freeze({
		id="AUTUMN_TREE_VARIANT", name="가을 활엽수 변형", familyRootId="FOLIAGE_SEASON_TREE", family="ENVIRONMENT", subfamily="SEASON_VARIANT", environmentRole="SEASON_VARIANT",
		systemRoles=table.freeze({"SEASON_VARIANT","BIOME_VARIANT"}), silhouette="BRANCHED_TRUNK_AUTUMN_CANOPY", palette=table.freeze({bark=c(91,65,47), barkLight=c(122,87,58), leaf=c(184,108,54), leafLight=c(222,157,68), leafDark=c(129,73,45)}),
	}),
	WIND_BENT_TREE = table.freeze({
		id="WIND_BENT_TREE", name="바람에 휜 나무", familyRootId="FOLIAGE_WIND_TREE", family="ENVIRONMENT", subfamily="WIND_VARIANT", environmentRole="WIND_VARIANT",
		systemRoles=table.freeze({"WIND_VARIANT"}), silhouette="LEANING_TRUNK_ONE_SIDED_CANOPY", palette=table.freeze({bark=c(85,64,49), barkLight=c(116,83,58), leaf=c(62,96,62), leafLight=c(89,126,73), leafDark=c(42,70,48)}),
	}),
	BIOME_SHRUB_VARIANT = table.freeze({
		id="BIOME_SHRUB_VARIANT", name="바이옴 관목 변형", familyRootId="FOLIAGE_BIOME_SHRUB", family="ENVIRONMENT", subfamily="BIOME_VARIANT", environmentRole="BIOME_VARIANT",
		systemRoles=table.freeze({"BIOME_VARIANT"}), silhouette="LOW_DENSE_BIOME_SHRUB", palette=table.freeze({stem=c(88,70,49), leaf=c(83,108,69), leafLight=c(119,138,83), leafDark=c(56,78,52)}),
	}),
	LOD_FOLIAGE_PROXY = table.freeze({
		id="LOD_FOLIAGE_PROXY", name="원거리 식생 프록시", familyRootId="FOLIAGE_LOD", family="ENVIRONMENT", subfamily="LOD", environmentRole="LOD",
		systemRoles=table.freeze({"LOD"}), silhouette="LOW_PART_TREE_PROXY", palette=table.freeze({bark=c(91,68,50), leaf=c(65,98,61), leafLight=c(89,119,72)}),
	})
})

local function makePart(name, size, color, material, shape)
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.Color = color
	part.Material = material or Enum.Material.SmoothPlastic
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.CastShadow = true
	part.Massless = true
	if shape == "BALL" then
		part.Shape = Enum.PartType.Ball
	elseif shape == "CYLINDER" then
		part.Shape = Enum.PartType.Cylinder
	end
	return part
end

local function makeWedge(name, size, color, material)
	local part = Instance.new("WedgePart")
	part.Name = name
	part.Size = size
	part.Color = color
	part.Material = material or Enum.Material.SmoothPlastic
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.CastShadow = true
	part.Massless = true
	return part
end

local function weld(root, part, localCFrame)
	part.CFrame = root.CFrame * localCFrame
	part.Parent = root.Parent
	local joint = Instance.new("WeldConstraint")
	joint.Name = part.Name .. "_Weld"
	joint.Part0 = root
	joint.Part1 = part
	joint.Parent = part
	return part
end

local function rootFor(id)
	local model = Instance.new("Model")
	model.Name = "CommonFoliage_" .. id
	model:SetAttribute("StudioAssetId", id)
	model:SetAttribute("StudioAssetPack", "roblox-common-foliage-v1")
	model:SetAttribute("StudioAssetFamily", "ENVIRONMENT")
	model:SetAttribute("CompanyCommonBase", true)
	model:SetAttribute("CompatibleGameScope", "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH")
	model:SetAttribute("ThemeAdaptationRequiredPerGame", true)
	model:SetAttribute("SourceAssetLibrary", "company-asset-library.json")
	model:SetAttribute("ProductionVerified", false)
	model:SetAttribute("GameplayAuthority", false)

	local root = makePart("VisualRoot", Vector3.new(0.3, 0.3, 0.3), c(255, 255, 255), Enum.Material.SmoothPlastic)
	root.Transparency = 1
	root.CastShadow = false
	root.Massless = false
	root.Parent = model
	model.PrimaryPart = root
	return model, root
end

local function detail(level, needed)
	return level >= needed
end

local function rowWithPalette(row, override)
	if type(override) ~= "table" then
		return row
	end
	local palette = {}
	for key, value in pairs(row.palette or {}) do
		palette[key] = value
	end
	for key, value in pairs(override) do
		if palette[key] ~= nil and typeof(value) == "Color3" then
			palette[key] = value
		end
	end
	local clone = {}
	for key, value in pairs(row) do
		clone[key] = value
	end
	clone.palette = table.freeze(palette)
	return table.freeze(clone)
end

local function addGrass(model, root, row, level)
	local p = row.palette
	local count = level == 1 and 5 or level == 2 and 8 or 12
	for i = 1, count do
		local angle = math.rad((i - 1) * (360 / count))
		local radius = 0.10 + (i % 3) * 0.10
		local height = 0.75 + (i % 4) * 0.12
		local blade = makeWedge("Blade" .. i, Vector3.new(0.14, height, 0.34), i % 3 == 0 and p.leafLight or i % 3 == 1 and p.leaf or p.leafDark, Enum.Material.Grass)
		weld(root, blade, CFrame.new(math.cos(angle) * radius, height * 0.45, math.sin(angle) * radius) * CFrame.Angles(math.rad(-8 - (i % 3) * 4), angle, math.rad((i % 2 == 0 and 1 or -1) * 8)))
	end
end

local function addBush(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Stem", Vector3.new(0.28, 1.25, 0.28), p.stem, Enum.Material.Wood, "CYLINDER"), CFrame.new(0, 0.62, 0))
	local clusters = {
		{Vector3.new(0, 1.28, 0), Vector3.new(1.55, 1.30, 1.45)},
		{Vector3.new(-0.55, 1.10, 0.18), Vector3.new(1.05, 0.95, 1.10)},
		{Vector3.new(0.58, 1.05, -0.12), Vector3.new(1.10, 0.92, 1.00)},
	}
	if detail(level, 2) then
		table.insert(clusters, {Vector3.new(0.10, 1.72, 0.28), Vector3.new(0.92, 0.80, 0.88)})
	end
	for i, data in ipairs(clusters) do
		local color = i % 3 == 0 and p.leafLight or i % 2 == 0 and p.leafDark or p.leaf
		weld(root, makePart("LeafCluster" .. i, data[2], color, Enum.Material.Grass, "BALL"), CFrame.new(data[1]))
	end
	if detail(level, 3) then
		for i, pos in ipairs({Vector3.new(-0.85, 0.88, -0.12), Vector3.new(0.80, 0.92, 0.36)}) do
			weld(root, makePart("OuterLeaf" .. i, Vector3.new(0.48, 0.32, 0.78), p.leafLight, Enum.Material.Grass), CFrame.new(pos) * CFrame.Angles(0, math.rad(i * 48), math.rad(i == 1 and -18 or 16)))
		end
	end
end

local function addFern(model, root, row, level)
	local p = row.palette
	local count = level == 1 and 4 or level == 2 and 6 or 8
	for i = 1, count do
		local angle = math.rad((i - 1) * (360 / count))
		local length = 1.55 + (i % 3) * 0.18
		weld(root, makePart("Stem" .. i, Vector3.new(0.10, length, 0.10), p.stem, Enum.Material.Grass, "CYLINDER"), CFrame.new(math.cos(angle) * 0.16, length * 0.36, math.sin(angle) * 0.16) * CFrame.Angles(math.rad(28), 0, -angle))
		local leafCount = detail(level, 3) and 5 or 3
		for j = 1, leafCount do
			local t = j / (leafCount + 1)
			local y = 0.28 + t * 0.80
			local radius = 0.22 + t * 0.46
			for side = -1, 1, 2 do
				local leaf = makeWedge("FrondLeaf" .. i .. "_" .. j .. "_" .. side, Vector3.new(0.10, 0.38, 0.28), (j + i) % 2 == 0 and p.leafLight or p.leaf, Enum.Material.Grass)
				weld(root, leaf, CFrame.new(math.cos(angle) * radius * side, y, math.sin(angle) * radius * side) * CFrame.Angles(0, angle + (side < 0 and math.pi or 0), math.rad(-20 * side)))
			end
		end
	end
end

local function addFlowers(model, root, row, level)
	local p = row.palette
	local count = level == 1 and 4 or level == 2 and 6 or 9
	for i = 1, count do
		local angle = math.rad((i - 1) * 137.5)
		local radius = 0.25 + (i % 4) * 0.18
		local height = 0.65 + (i % 3) * 0.16
		weld(root, makePart("Stem" .. i, Vector3.new(0.07, height, 0.07), p.stem, Enum.Material.Grass, "CYLINDER"), CFrame.new(math.cos(angle) * radius, height * 0.5, math.sin(angle) * radius))
		local bloom = weld(root, makePart("Bloom" .. i, Vector3.new(0.30, 0.14, 0.30), i % 2 == 0 and p.flowerA or p.flowerB, Enum.Material.SmoothPlastic, "BALL"), CFrame.new(math.cos(angle) * radius, height, math.sin(angle) * radius))
		bloom:SetAttribute("VisualOnly", true)
		if detail(level, 2) then
			weld(root, makePart("BloomCore" .. i, Vector3.new(0.10, 0.08, 0.10), p.core, Enum.Material.SmoothPlastic, "BALL"), CFrame.new(math.cos(angle) * radius, height + 0.06, math.sin(angle) * radius))
		end
	end
end

local function addStump(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Stump", Vector3.new(1.65, 1.25, 1.65), p.bark, Enum.Material.Wood, "CYLINDER"), CFrame.new(0, 0.62, 0) * CFrame.Angles(0, 0, math.rad(90)))
	weld(root, makePart("CutFace", Vector3.new(1.70, 0.10, 1.70), p.cut, Enum.Material.Wood, "CYLINDER"), CFrame.new(0, 1.27, 0) * CFrame.Angles(0, 0, math.rad(90)))
	for i = 0, 3 do
		local angle = math.rad(i * 90 + 18)
		weld(root, makeWedge("Root" .. i, Vector3.new(0.52, 0.34, 1.12), p.barkLight, Enum.Material.Wood), CFrame.new(math.cos(angle) * 0.76, 0.22, math.sin(angle) * 0.76) * CFrame.Angles(0, angle, 0))
	end
	if detail(level, 3) then
		weld(root, makePart("MossPatch", Vector3.new(0.62, 0.10, 0.42), p.moss, Enum.Material.Grass), CFrame.new(-0.30, 1.34, 0.20) * CFrame.Angles(0, math.rad(18), 0))
	end
end

local function addFallenLog(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Log", Vector3.new(1.35, 4.2, 1.35), p.bark, Enum.Material.Wood, "CYLINDER"), CFrame.new(0, 0.72, 0) * CFrame.Angles(0, 0, math.rad(90)))
	for _, x in ipairs({-2.12, 2.12}) do
		weld(root, makePart("CutFace" .. tostring(x), Vector3.new(1.38, 0.08, 1.38), p.cut, Enum.Material.Wood, "CYLINDER"), CFrame.new(x, 0.72, 0) * CFrame.Angles(0, 0, math.rad(90)))
	end
	if detail(level, 2) then
		for i, data in ipairs({
			{Vector3.new(-0.72, 1.10, 0.20), math.rad(-34)},
			{Vector3.new(0.85, 1.02, -0.28), math.rad(28)},
		}) do
			weld(root, makePart("BrokenBranch" .. i, Vector3.new(0.26, 1.15, 0.26), p.barkLight, Enum.Material.Wood, "CYLINDER"), CFrame.new(data[1]) * CFrame.Angles(0, 0, data[2]))
		end
	end
	if detail(level, 3) then
		weld(root, makePart("MossStrip", Vector3.new(2.15, 0.10, 0.46), p.moss, Enum.Material.Grass), CFrame.new(0.10, 1.38, 0.22) * CFrame.Angles(0, 0, math.rad(2)))
	end
end

local function addPine(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Trunk", Vector3.new(0.78, 6.8, 0.78), p.bark, Enum.Material.Wood, "CYLINDER"), CFrame.new(0, 3.4, 0))
	local layers = level == 1 and 3 or level == 2 and 4 or 5
	for i = 1, layers do
		local y = 2.6 + (i - 1) * 0.95
		local width = 4.2 - (i - 1) * 0.62
		local color = i % 3 == 0 and p.needleLight or i % 2 == 0 and p.needleDark or p.needle
		weld(root, makePart("NeedleLayer" .. i, Vector3.new(width, 0.65, width), color, Enum.Material.Grass, "BALL"), CFrame.new(0, y, 0))
	end
	if detail(level, 3) then
		for i, angle in ipairs({0, 120, 240}) do
			local a = math.rad(angle)
			weld(root, makePart("LowerBranch" .. i, Vector3.new(0.28, 2.25, 0.28), p.barkLight, Enum.Material.Wood, "CYLINDER"), CFrame.new(math.cos(a) * 0.72, 2.32, math.sin(a) * 0.72) * CFrame.Angles(math.rad(72), a, 0))
		end
	end
end

local function addDeadTree(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Trunk", Vector3.new(0.86, 5.8, 0.86), p.bark, Enum.Material.Wood, "CYLINDER"), CFrame.new(0, 2.9, 0) * CFrame.Angles(math.rad(2), 0, math.rad(-4)))
	local branches = {
		{Vector3.new(-0.58, 4.20, 0.08), Vector3.new(0.32, 2.20, 0.32), math.rad(-42)},
		{Vector3.new(0.62, 4.55, -0.05), Vector3.new(0.30, 2.00, 0.30), math.rad(38)},
		{Vector3.new(-0.28, 5.35, 0.20), Vector3.new(0.24, 1.42, 0.24), math.rad(-24)},
	}
	local count = level == 1 and 2 or 3
	for i = 1, count do
		local data = branches[i]
		weld(root, makePart("Branch" .. i, data[2], i % 2 == 0 and p.barkLight or p.barkDark, Enum.Material.Wood, "CYLINDER"), CFrame.new(data[1]) * CFrame.Angles(0, 0, data[3]))
	end
	if detail(level, 3) then
		weld(root, makePart("MossPatch", Vector3.new(0.45, 1.15, 0.12), p.moss, Enum.Material.Grass), CFrame.new(-0.38, 2.05, -0.36) * CFrame.Angles(0, math.rad(15), math.rad(-4)))
	end
end


local function addBroadleafTree(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Trunk",Vector3.new(0.82,5.0,0.82),p.bark,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,2.5,0))
	for i,data in ipairs({
		{Vector3.new(0,5.0,0),Vector3.new(3.4,2.7,3.2)},
		{Vector3.new(-1.0,4.6,0.4),Vector3.new(2.3,2.0,2.2)},
		{Vector3.new(1.0,4.7,-0.4),Vector3.new(2.2,1.9,2.1)}
	}) do
		if i==1 or detail(level,2) then
			weld(root,makePart("Canopy"..i,data[2],i%2==0 and p.leafLight or p.leaf,Enum.Material.Grass,"BALL"),CFrame.new(data[1]))
		end
	end
	if detail(level,3) then weld(root,makePart("Branch",Vector3.new(0.34,2.1,0.34),p.barkLight,Enum.Material.Wood,"CYLINDER"),CFrame.new(0.7,3.8,0)*CFrame.Angles(0,0,math.rad(-40))) end
end

local function addVineCluster(model, root, row, level)
	local p=row.palette
	local count=level==1 and 3 or level==2 and 5 or 7
	for i=1,count do
		local x=(i-(count+1)/2)*0.26
		local length=1.6+(i%3)*0.45
		weld(root,makePart("Vine"..i,Vector3.new(0.08,length,0.08),p.stem,Enum.Material.Grass,"CYLINDER"),CFrame.new(x,-length*0.45,0))
		local leafCount=detail(level,3) and 3 or 2
		for j=1,leafCount do
			weld(root,makeWedge("Leaf"..i.."_"..j,Vector3.new(0.22,0.36,0.18),j%2==0 and p.leafLight or p.leaf,Enum.Material.Grass),CFrame.new(x+(j%2==0 and 0.14 or -0.14),-j*0.42,0)*CFrame.Angles(0,math.rad(i*23),math.rad(j%2==0 and 22 or -22)))
		end
	end
end

local function addReedPatch(model, root, row, level)
	local p=row.palette
	local count=level==1 and 5 or level==2 and 8 or 12
	for i=1,count do
		local angle=math.rad(i*137.5)
		local radius=0.18+(i%4)*0.16
		local height=1.5+(i%3)*0.32
		weld(root,makePart("Stem"..i,Vector3.new(0.06,height,0.06),p.stem,Enum.Material.Grass,"CYLINDER"),CFrame.new(math.cos(angle)*radius,height*0.5,math.sin(angle)*radius))
		if detail(level,2) then weld(root,makePart("Seed"..i,Vector3.new(0.12,0.38,0.12),p.seed,Enum.Material.Grass,"CYLINDER"),CFrame.new(math.cos(angle)*radius,height+0.14,math.sin(angle)*radius)) end
	end
end

local function addMossPatch(model, root, row, level)
	local p=row.palette
	local count=level==1 and 3 or level==2 and 5 or 8
	for i=1,count do
		local angle=math.rad(i*83)
		local radius=0.15+(i%4)*0.18
		local patch=makePart("Moss"..i,Vector3.new(0.7+(i%2)*0.25,0.08,0.55+(i%3)*0.18),i%3==0 and p.mossLight or i%2==0 and p.mossDark or p.moss,Enum.Material.Grass)
		weld(root,patch,CFrame.new(math.cos(angle)*radius,0.05,math.sin(angle)*radius)*CFrame.Angles(0,angle,0))
	end
end

local function addMushroomCluster(model, root, row, level)
	local p=row.palette
	local count=level==1 and 3 or level==2 and 5 or 7
	for i=1,count do
		local angle=math.rad(i*137.5)
		local radius=0.15+(i%4)*0.16
		local h=0.35+(i%3)*0.12
		weld(root,makePart("Stem"..i,Vector3.new(0.10,h,0.10),p.stem,Enum.Material.SmoothPlastic,"CYLINDER"),CFrame.new(math.cos(angle)*radius,h*0.5,math.sin(angle)*radius))
		weld(root,makePart("Cap"..i,Vector3.new(0.42,0.18,0.42),i%2==0 and p.capLight or p.cap,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(math.cos(angle)*radius,h,math.sin(angle)*radius))
		if detail(level,3) then weld(root,makePart("Spot"..i,Vector3.new(0.08,0.05,0.08),p.spot,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(math.cos(angle)*radius,h+0.08,math.sin(angle)*radius)) end
	end
end

local function addRootCluster(model, root, row, level)
	local p=row.palette
	local count=level==1 and 4 or level==2 and 6 or 8
	for i=1,count do
		local angle=math.rad((i-1)*360/count)
		local length=1.4+(i%3)*0.35
		weld(root,makeWedge("Root"..i,Vector3.new(0.34,0.28,length),i%2==0 and p.barkLight or p.bark,Enum.Material.Wood),CFrame.new(math.cos(angle)*0.52,0.16,math.sin(angle)*0.52)*CFrame.Angles(0,-angle,0))
	end
	if detail(level,3) then weld(root,makePart("Moss",Vector3.new(0.72,0.08,0.52),p.moss,Enum.Material.Grass),CFrame.new(0.15,0.26,-0.12)) end
end

local function addAutumnTree(model, root, row, level)
	addBroadleafTree(model,root,row,level)
end

local function addWindBentTree(model, root, row, level)
	local p=row.palette
	weld(root,makePart("BentTrunk",Vector3.new(0.70,4.8,0.70),p.bark,Enum.Material.Wood,"CYLINDER"),CFrame.new(-0.55,2.3,0)*CFrame.Angles(0,0,math.rad(-18)))
	weld(root,makePart("CanopyMain",Vector3.new(3.1,2.1,2.5),p.leaf,Enum.Material.Grass,"BALL"),CFrame.new(0.75,4.45,0))
	if detail(level,2) then weld(root,makePart("CanopyLee",Vector3.new(1.8,1.4,1.6),p.leafLight,Enum.Material.Grass,"BALL"),CFrame.new(1.75,4.15,0.15)) end
	if detail(level,3) then weld(root,makePart("CanopyDark",Vector3.new(1.5,1.2,1.5),p.leafDark,Enum.Material.Grass,"BALL"),CFrame.new(0.2,4.8,-0.5)) end
end

local function addBiomeShrubVariant(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Stem",Vector3.new(0.24,1.0,0.24),p.stem,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,0.5,0))
	local count=level==1 and 3 or level==2 and 5 or 7
	for i=1,count do
		local angle=math.rad(i*137.5)
		local radius=0.32+(i%3)*0.18
		weld(root,makePart("LeafCluster"..i,Vector3.new(0.78,0.62,0.72),i%3==0 and p.leafLight or i%2==0 and p.leafDark or p.leaf,Enum.Material.Grass,"BALL"),CFrame.new(math.cos(angle)*radius,0.75+(i%2)*0.25,math.sin(angle)*radius))
	end
end

local function addLodFoliageProxy(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Trunk",Vector3.new(0.46,3.5,0.46),p.bark,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,1.75,0))
	weld(root,makePart("Canopy",Vector3.new(2.4,2.0,2.2),p.leaf,Enum.Material.Grass,"BALL"),CFrame.new(0,3.8,0))
	if detail(level,3) then weld(root,makePart("Highlight",Vector3.new(1.2,0.7,1.0),p.leafLight,Enum.Material.Grass,"BALL"),CFrame.new(0.45,4.2,-0.25)) end
end

local BUILDERS = table.freeze({
	GRASS_TUFT = addGrass,
	BUSH_ROUND = addBush,
	FERN_CLUSTER = addFern,
	WILDFLOWER_PATCH = addFlowers,
	TREE_STUMP = addStump,
	FALLEN_LOG = addFallenLog,
	PINE_TREE = addPine,
	DEAD_TREE = addDeadTree,
	BROADLEAF_TREE = addBroadleafTree,
	VINE_CLUSTER = addVineCluster,
	REED_PATCH = addReedPatch,
	MOSS_PATCH = addMossPatch,
	MUSHROOM_CLUSTER = addMushroomCluster,
	ROOT_CLUSTER = addRootCluster,
	AUTUMN_TREE_VARIANT = addAutumnTree,
	WIND_BENT_TREE = addWindBentTree,
	BIOME_SHRUB_VARIANT = addBiomeShrubVariant,
	LOD_FOLIAGE_PROXY = addLodFoliageProxy,
})

local function applyModelMetadata(model, row, quality)
	model:SetAttribute("StudioAssetFamilyRootId", row.familyRootId)
	model:SetAttribute("StudioAssetSubfamily", row.subfamily)
	model:SetAttribute("StudioAssetEnvironmentRole", row.environmentRole)
	model:SetAttribute("StudioAssetSilhouette", row.silhouette)
	if row.systemRoles then model:SetAttribute("StudioAssetSystemRoles", table.concat(row.systemRoles, ",")) end
	model:SetAttribute("StudioAssetQualityLevel", quality)
	model:SetAttribute("StudioAssetQualityTarget", 100)
	model:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
end

function RobloxCommonFoliage.List()
	local result = {}
	for id, row in pairs(Catalog) do
		table.insert(result, table.freeze({
			id = id,
			name = row.name,
			familyRootId = row.familyRootId,
			family = row.family,
			subfamily = row.subfamily,
			environmentRole = row.environmentRole,
			systemRoles = row.systemRoles,
			silhouette = row.silhouette,
			productionVerified = false,
		}))
	end
	table.sort(result, function(a, b)
		return a.id < b.id
	end)
	return table.freeze(result)
end

function RobloxCommonFoliage.Describe(id)
	local row = Catalog[string.upper(tostring(id or ""))]
	assert(row, "UNKNOWN_COMMON_FOLIAGE: " .. tostring(id))
	return row
end

function RobloxCommonFoliage.Create(id, options)
	options = options or {}
	local key = string.upper(tostring(id or ""))
	local row = Catalog[key]
	local builder = BUILDERS[key]
	assert(row and builder, "UNKNOWN_COMMON_FOLIAGE: " .. tostring(id))

	local quality = string.lower(tostring(options.quality or "mid"))
	local level = QUALITY_LEVEL[quality]
	assert(level, "INVALID_COMMON_FOLIAGE_QUALITY: " .. tostring(quality))

	local styledRow = rowWithPalette(row, options.palette)
	local model, root = rootFor(key)
	builder(model, root, styledRow, level)
	applyModelMetadata(model, styledRow, quality)
	model:SetAttribute("PaletteAdapted", type(options.palette) == "table")

	local scale = math.clamp(tonumber(options.scale) or 1, 0.25, 4)
	if scale ~= 1 then
		model:ScaleTo(scale)
	end

	local anchored = options.anchored ~= false
	for _, descendant in ipairs(model:GetDescendants()) do
		if descendant:IsA("BasePart") then
			descendant.Anchored = anchored
			descendant.CanCollide = false
			descendant.CanTouch = false
			descendant.CanQuery = false
		end
	end

	model.Parent = options.parent
	if typeof(options.pivot) == "CFrame" then
		model:PivotTo(options.pivot)
	end
	return model
end

function RobloxCommonFoliage.CreateViewport(id, options)
	options = options or {}
	local frame = Instance.new("ViewportFrame")
	frame.Name = "CommonFoliageViewport_" .. string.upper(tostring(id or ""))
	frame.BackgroundTransparency = options.backgroundTransparency == nil and 1 or options.backgroundTransparency
	frame.Ambient = options.ambient or c(105, 112, 105)
	frame.LightColor = options.lightColor or c(246, 238, 214)
	frame.LightDirection = options.lightDirection or Vector3.new(-1, -1, -1)
	frame.Size = options.size or UDim2.fromScale(1, 1)

	local world = Instance.new("WorldModel")
	world.Name = "CommonFoliageWorld"
	world.Parent = frame

	local model = RobloxCommonFoliage.Create(id, {
		quality = options.quality or "near",
		palette = options.palette,
		anchored = true,
		parent = world,
	})

	local camera = Instance.new("Camera")
	camera.Name = "CommonFoliageCamera"
	camera.FieldOfView = tonumber(options.fieldOfView) or 36
	camera.Parent = frame
	frame.CurrentCamera = camera

	local boxCf, boxSize = model:GetBoundingBox()
	local radius = math.max(boxSize.X, boxSize.Y, boxSize.Z)
	local distance = math.max(4.5, radius * 1.55)
	camera.CFrame = CFrame.new(boxCf.Position + Vector3.new(distance * 0.72, distance * 0.46, distance), boxCf.Position)

	frame.Parent = options.parent
	return frame
end

return table.freeze(RobloxCommonFoliage)
