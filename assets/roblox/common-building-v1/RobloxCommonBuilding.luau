-- 파일명: assets/roblox/common-building-v1/RobloxCommonBuilding.luau
-- 역할: 여러 Roblox 게임에서 재사용하는 회사 공용 건축/하우징 모듈 20종 생성
-- 원칙: 순수 표현 자산만 제공한다. 충돌/건설비용/내구도/세이브/네트워크 권한은 소유하지 않는다.

local RobloxCommonBuilding = {}

local QUALITY_LEVEL = table.freeze({
	far = 1,
	mid = 2,
	near = 3,
})

local function c(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local Catalog = table.freeze({
	FLOOR_TILE = table.freeze({
		id = "FLOOR_TILE",
		name = "바닥 모듈",
		familyRootId = "BUILDING_FLOOR",
		family = "BUILDING",
		subfamily = "FLOOR_TILE",
		buildingRole = "FLOOR",
		silhouette = "SQUARE_TILE_TRIM",
		palette = table.freeze({
			main = c(126, 97, 67),
			trim = c(79, 64, 51),
			accent = c(161, 126, 82),
		}),
	}),
	WALL_WINDOW = table.freeze({
		id = "WALL_WINDOW",
		name = "창문 벽",
		familyRootId = "BUILDING_WALL",
		family = "BUILDING",
		subfamily = "WALL_WINDOW",
		buildingRole = "WALL_OPENING",
		silhouette = "RECT_WALL_CENTER_WINDOW",
		palette = table.freeze({
			main = c(139, 124, 103),
			trim = c(78, 66, 54),
			glass = c(156, 199, 209),
			accent = c(184, 159, 118),
		}),
	}),
	WALL_CORNER = table.freeze({
		id = "WALL_CORNER",
		name = "모서리 벽",
		familyRootId = "BUILDING_WALL",
		family = "BUILDING",
		subfamily = "WALL_CORNER",
		buildingRole = "WALL_CORNER",
		silhouette = "L_SHAPED_DOUBLE_WALL",
		palette = table.freeze({
			main = c(137, 122, 102),
			trim = c(77, 65, 53),
			accent = c(181, 155, 116),
		}),
	}),
	PILLAR_STONE = table.freeze({
		id = "PILLAR_STONE",
		name = "돌 기둥",
		familyRootId = "BUILDING_PILLAR",
		family = "BUILDING",
		subfamily = "PILLAR",
		buildingRole = "STRUCTURAL_VISUAL",
		silhouette = "SQUARE_SHAFT_CAP_BASE",
		palette = table.freeze({
			stone = c(116, 118, 114),
			stoneLight = c(154, 155, 149),
			stoneDark = c(79, 82, 80),
		}),
	}),
	STAIRS_STRAIGHT = table.freeze({
		id = "STAIRS_STRAIGHT",
		name = "직선 계단",
		familyRootId = "BUILDING_STAIRS",
		family = "BUILDING",
		subfamily = "STAIRS",
		buildingRole = "VERTICAL_LINK_VISUAL",
		silhouette = "SIX_STEP_STRAIGHT_RUN",
		palette = table.freeze({
			main = c(121, 94, 67),
			trim = c(75, 61, 50),
			accent = c(158, 124, 83),
		}),
	}),
	ARCHWAY = table.freeze({
		id = "ARCHWAY",
		name = "아치문",
		familyRootId = "BUILDING_OPENING",
		family = "BUILDING",
		subfamily = "ARCHWAY",
		buildingRole = "PASSAGE_VISUAL",
		silhouette = "TWIN_PILLAR_SEGMENTED_ARCH",
		palette = table.freeze({
			main = c(125, 119, 108),
			light = c(160, 154, 142),
			dark = c(76, 72, 67),
		}),
	}),
	ROOF_FLAT = table.freeze({
		id = "ROOF_FLAT",
		name = "평지붕",
		familyRootId = "BUILDING_ROOF",
		family = "BUILDING",
		subfamily = "ROOF_FLAT",
		buildingRole = "ROOF",
		silhouette = "FLAT_SLAB_EDGE_CAP",
		palette = table.freeze({
			main = c(103, 91, 79),
			trim = c(63, 57, 53),
			accent = c(144, 121, 91),
		}),
	}),
	RAILING = table.freeze({
		id = "RAILING",
		name = "난간",
		familyRootId = "BUILDING_RAILING",
		family = "BUILDING",
		subfamily = "RAILING",
		buildingRole = "EDGE_VISUAL",
		silhouette = "POST_RAIL_BALUSTER",
		palette = table.freeze({
			main = c(88, 70, 54),
			trim = c(61, 54, 48),
			accent = c(152, 116, 75),
		}),
	}),

	FOUNDATION_TRIANGLE = table.freeze({
		id="FOUNDATION_TRIANGLE",name="삼각 기초",familyRootId="BUILDING_FOUNDATION",family="BUILDING",subfamily="FOUNDATION_TRIANGLE",
		buildingRole="FOUNDATION",housingShape="FOUNDATION_TRIANGLE",snapClass="FOUNDATION",stabilityRole="PRIMARY_SUPPORT",silhouette="TRIANGLE_FOUNDATION",
		palette=table.freeze({main=c(114,101,82),trim=c(72,64,54),accent=c(151,133,105)}),
	}),
	FENCE_FOUNDATION = table.freeze({
		id="FENCE_FOUNDATION",name="울타리 기초",familyRootId="BUILDING_FOUNDATION",family="BUILDING",subfamily="FENCE_FOUNDATION",
		buildingRole="BOUNDARY_FOUNDATION",housingShape="FENCE_FOUNDATION",snapClass="FOUNDATION_EDGE",stabilityRole="PRIMARY_SUPPORT",silhouette="NARROW_FOUNDATION_STRIP",
		palette=table.freeze({main=c(112,94,72),trim=c(68,58,48),accent=c(157,128,89)}),
	}),
	HALF_WALL = table.freeze({
		id="HALF_WALL",name="반벽",familyRootId="BUILDING_WALL",family="BUILDING",subfamily="HALF_WALL",
		buildingRole="WALL",housingShape="HALF_WALL",snapClass="WALL",stabilityRole="SUPPORTED",silhouette="LOW_WALL_PANEL",
		palette=table.freeze({main=c(137,122,101),trim=c(78,65,53),accent=c(180,153,113)}),
	}),
	DOOR_FRAME = table.freeze({
		id="DOOR_FRAME",name="문틀",familyRootId="BUILDING_OPENING",family="BUILDING",subfamily="DOOR_FRAME",
		buildingRole="DOOR_OPENING",housingShape="DOOR_FRAME",snapClass="WALL_OPENING",stabilityRole="SUPPORTED",silhouette="RECT_DOOR_FRAME",
		palette=table.freeze({main=c(133,116,95),trim=c(74,61,50),accent=c(176,146,103)}),
	}),
	WINDOW_FRAME = table.freeze({
		id="WINDOW_FRAME",name="창틀",familyRootId="BUILDING_OPENING",family="BUILDING",subfamily="WINDOW_FRAME",
		buildingRole="WINDOW_OPENING",housingShape="WINDOW_FRAME",snapClass="WALL_OPENING",stabilityRole="SUPPORTED",silhouette="RECT_WINDOW_FRAME",
		palette=table.freeze({main=c(133,116,95),trim=c(75,63,52),accent=c(183,157,116)}),
	}),
	CEILING_TILE = table.freeze({
		id="CEILING_TILE",name="천장 모듈",familyRootId="BUILDING_CEILING",family="BUILDING",subfamily="CEILING_TILE",
		buildingRole="CEILING",housingShape="CEILING_TILE",snapClass="CEILING",stabilityRole="SPAN_SUPPORTED",silhouette="SQUARE_CEILING_TILE",
		palette=table.freeze({main=c(119,92,66),trim=c(74,59,48),accent=c(157,123,82)}),
	}),
	CEILING_WEDGE = table.freeze({
		id="CEILING_WEDGE",name="삼각 천장",familyRootId="BUILDING_CEILING",family="BUILDING",subfamily="CEILING_WEDGE",
		buildingRole="CEILING",housingShape="CEILING_WEDGE",snapClass="CEILING",stabilityRole="SPAN_SUPPORTED",silhouette="TRIANGLE_CEILING",
		palette=table.freeze({main=c(119,92,66),trim=c(74,59,48),accent=c(157,123,82)}),
	}),
	ROOF_SLOPE = table.freeze({
		id="ROOF_SLOPE",name="경사 지붕",familyRootId="BUILDING_ROOF",family="BUILDING",subfamily="ROOF_SLOPE",
		buildingRole="ROOF",housingShape="ROOF_SLOPE",snapClass="ROOF",stabilityRole="SPAN_SUPPORTED",silhouette="SLOPED_ROOF_PANEL",
		palette=table.freeze({main=c(96,82,70),trim=c(58,52,48),accent=c(143,116,86)}),
	}),
	ROOF_CORNER = table.freeze({
		id="ROOF_CORNER",name="모서리 지붕",familyRootId="BUILDING_ROOF",family="BUILDING",subfamily="ROOF_CORNER",
		buildingRole="ROOF",housingShape="ROOF_CORNER",snapClass="ROOF",stabilityRole="SPAN_SUPPORTED",silhouette="CORNER_ROOF_WEDGE",
		palette=table.freeze({main=c(96,82,70),trim=c(58,52,48),accent=c(143,116,86)}),
	}),
	GATE_FRAME = table.freeze({
		id="GATE_FRAME",name="대문 틀",familyRootId="BUILDING_GATE",family="BUILDING",subfamily="GATE_FRAME",
		buildingRole="GATE_OPENING",housingShape="GATE_FRAME",snapClass="WALL_OPENING",stabilityRole="SUPPORTED",silhouette="WIDE_GATE_FRAME",
		palette=table.freeze({main=c(116,100,82),trim=c(69,57,48),accent=c(163,132,90)}),
	}),
	LADDER = table.freeze({
		id="LADDER",name="사다리",familyRootId="BUILDING_VERTICAL_LINK",family="BUILDING",subfamily="LADDER",
		buildingRole="VERTICAL_LINK_VISUAL",housingShape="LADDER",snapClass="WALL_ATTACHMENT",stabilityRole="ATTACHED",silhouette="TWIN_RAIL_RUNGS",
		palette=table.freeze({main=c(104,76,53),trim=c(70,55,44),accent=c(149,112,72)}),
	}),
	WALL_TRIM = table.freeze({
		id="WALL_TRIM",name="벽 장식띠",familyRootId="BUILDING_TRIM",family="BUILDING",subfamily="WALL_TRIM",
		buildingRole="EXTERIOR_TRIM",housingShape="WALL_TRIM",snapClass="WALL_ATTACHMENT",stabilityRole="ATTACHED",silhouette="LONG_TRIM_STRIP",
		palette=table.freeze({main=c(91,72,57),trim=c(60,51,45),accent=c(156,121,79)}),
	}),
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

local function wedge(name, size, color, material)
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
	model.Name = "CommonBuilding_" .. id
	model:SetAttribute("StudioAssetId", id)
	model:SetAttribute("StudioAssetPack", "roblox-common-building-v1")
	model:SetAttribute("StudioAssetFamily", "BUILDING")
	model:SetAttribute("CompanyCommonBase", true)
	model:SetAttribute("CompatibleGameScope", "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH")
	model:SetAttribute("ThemeAdaptationRequiredPerGame", true)
	model:SetAttribute("SourceAssetLibrary", "company-asset-library.json")
	model:SetAttribute("ProductionVerified", false)
	model:SetAttribute("GameplayAuthority", false)

	local root = makePart("VisualRoot", Vector3.new(0.4, 0.4, 0.4), c(255, 255, 255), Enum.Material.SmoothPlastic)
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

local function addFloor(model, root, row, level)
	local p = row.palette
	weld(root, makePart("FloorSlab", Vector3.new(6, 0.32, 6), p.main, Enum.Material.WoodPlanks), CFrame.new(0, 0.16, 0))
	if detail(level, 2) then
		for _, z in ipairs({-2.75, 2.75}) do
			weld(root, makePart("EdgeZ" .. tostring(z), Vector3.new(6.15, 0.18, 0.18), p.trim, Enum.Material.WoodPlanks), CFrame.new(0, 0.37, z))
		end
		for _, x in ipairs({-2.75, 2.75}) do
			weld(root, makePart("EdgeX" .. tostring(x), Vector3.new(0.18, 0.18, 5.8), p.trim, Enum.Material.WoodPlanks), CFrame.new(x, 0.37, 0))
		end
	end
	if detail(level, 3) then
		for i = -2, 2 do
			weld(root, makePart("BoardLine" .. i, Vector3.new(0.07, 0.04, 5.5), p.accent, Enum.Material.WoodPlanks), CFrame.new(i * 1.08, 0.36, 0))
		end
	end
end

local function addWindowWall(model, root, row, level)
	local p = row.palette
	weld(root, makePart("LeftWall", Vector3.new(2.0, 5.0, 0.38), p.main, Enum.Material.Brick), CFrame.new(-2.0, 2.5, 0))
	weld(root, makePart("RightWall", Vector3.new(2.0, 5.0, 0.38), p.main, Enum.Material.Brick), CFrame.new(2.0, 2.5, 0))
	weld(root, makePart("TopWall", Vector3.new(2.0, 1.35, 0.38), p.main, Enum.Material.Brick), CFrame.new(0, 4.325, 0))
	weld(root, makePart("BottomWall", Vector3.new(2.0, 1.55, 0.38), p.main, Enum.Material.Brick), CFrame.new(0, 0.775, 0))
	weld(root, makePart("WindowGlass", Vector3.new(1.9, 2.0, 0.12), p.glass, Enum.Material.Glass), CFrame.new(0, 2.65, 0)).Transparency = 0.38
	if detail(level, 2) then
		weld(root, makePart("WindowFrameV", Vector3.new(0.12, 2.15, 0.22), p.trim, Enum.Material.WoodPlanks), CFrame.new(0, 2.65, -0.06))
		weld(root, makePart("WindowFrameH", Vector3.new(2.05, 0.12, 0.22), p.trim, Enum.Material.WoodPlanks), CFrame.new(0, 2.65, -0.06))
	end
	if detail(level, 3) then
		weld(root, makePart("Sill", Vector3.new(2.25, 0.20, 0.62), p.accent, Enum.Material.WoodPlanks), CFrame.new(0, 1.58, 0))
	end
end

local function addCornerWall(model, root, row, level)
	local p = row.palette
	weld(root, makePart("WallA", Vector3.new(5.2, 5.0, 0.38), p.main, Enum.Material.Brick), CFrame.new(0, 2.5, 0))
	weld(root, makePart("WallB", Vector3.new(0.38, 5.0, 5.2), p.main, Enum.Material.Brick), CFrame.new(-2.4, 2.5, 2.4))
	if detail(level, 2) then
		weld(root, makePart("CornerBeam", Vector3.new(0.55, 5.15, 0.55), p.trim, Enum.Material.WoodPlanks), CFrame.new(-2.4, 2.55, 0))
	end
	if detail(level, 3) then
		weld(root, makePart("TopTrimA", Vector3.new(5.35, 0.18, 0.52), p.accent, Enum.Material.WoodPlanks), CFrame.new(0, 4.90, 0))
		weld(root, makePart("TopTrimB", Vector3.new(0.52, 0.18, 5.35), p.accent, Enum.Material.WoodPlanks), CFrame.new(-2.4, 4.90, 2.4))
	end
end

local function addPillar(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Shaft", Vector3.new(1.1, 5.2, 1.1), p.stone, Enum.Material.Slate), CFrame.new(0, 2.8, 0))
	weld(root, makePart("Base", Vector3.new(1.65, 0.5, 1.65), p.stoneDark, Enum.Material.Slate), CFrame.new(0, 0.25, 0))
	weld(root, makePart("Cap", Vector3.new(1.65, 0.5, 1.65), p.stoneLight, Enum.Material.Slate), CFrame.new(0, 5.35, 0))
	if detail(level, 2) then
		weld(root, makePart("BaseStep", Vector3.new(1.95, 0.18, 1.95), p.stoneLight, Enum.Material.Slate), CFrame.new(0, 0.05, 0))
		weld(root, makePart("CapStep", Vector3.new(1.95, 0.18, 1.95), p.stoneDark, Enum.Material.Slate), CFrame.new(0, 5.60, 0))
	end
	if detail(level, 3) then
		for _, y in ipairs({1.3, 4.25}) do
			weld(root, makePart("Band" .. tostring(y), Vector3.new(1.28, 0.16, 1.28), p.stoneLight, Enum.Material.Slate), CFrame.new(0, y, 0))
		end
	end
end

local function addStairs(model, root, row, level)
	local p = row.palette
	for i = 0, 5 do
		weld(root, makePart("Step" .. i, Vector3.new(4.0, 0.45, 0.95), i % 2 == 0 and p.main or p.accent, Enum.Material.WoodPlanks), CFrame.new(0, 0.225 + i * 0.45, 2.35 - i * 0.82))
	end
	if detail(level, 2) then
		for _, x in ipairs({-1.88, 1.88}) do
			weld(root, makePart("SideStringer" .. tostring(x), Vector3.new(0.20, 3.0, 5.35), p.trim, Enum.Material.WoodPlanks), CFrame.new(x, 1.35, 0.25) * CFrame.Angles(math.rad(-29), 0, 0))
		end
	end
	if detail(level, 3) then
		for _, x in ipairs({-1.72, 1.72}) do
			for i = 0, 3 do
				weld(root, makePart("RailPost" .. tostring(x) .. "_" .. i, Vector3.new(0.14, 1.25, 0.14), p.trim, Enum.Material.WoodPlanks), CFrame.new(x, 1.0 + i * 0.45, 2.0 - i * 1.23))
			end
		end
	end
end

local function addArchway(model, root, row, level)
	local p = row.palette
	weld(root, makePart("LeftPier", Vector3.new(1.15, 4.2, 1.0), p.main, Enum.Material.Brick), CFrame.new(-2.0, 2.1, 0))
	weld(root, makePart("RightPier", Vector3.new(1.15, 4.2, 1.0), p.main, Enum.Material.Brick), CFrame.new(2.0, 2.1, 0))
	local segments = level == 1 and 5 or level == 2 and 7 or 9
	for i = 0, segments - 1 do
		local t = i / (segments - 1)
		local angle = math.rad(180 - 180 * t)
		local x = math.cos(angle) * 2.0
		local y = 4.2 + math.sin(angle) * 1.8
		weld(root, wedge("ArchSegment" .. i, Vector3.new(0.72, 0.72, 1.05), i % 2 == 0 and p.light or p.main, Enum.Material.Brick), CFrame.new(x, y, 0) * CFrame.Angles(0, 0, angle - math.rad(90)))
	end
	if detail(level, 3) then
		weld(root, makePart("LeftFoot", Vector3.new(1.45, 0.28, 1.25), p.dark, Enum.Material.Slate), CFrame.new(-2.0, 0.14, 0))
		weld(root, makePart("RightFoot", Vector3.new(1.45, 0.28, 1.25), p.dark, Enum.Material.Slate), CFrame.new(2.0, 0.14, 0))
	end
end

local function addFlatRoof(model, root, row, level)
	local p = row.palette
	weld(root, makePart("RoofSlab", Vector3.new(6.4, 0.42, 6.4), p.main, Enum.Material.Slate), CFrame.new(0, 0.21, 0))
	if detail(level, 2) then
		for _, z in ipairs({-3.0, 3.0}) do
			weld(root, makePart("RoofEdgeZ" .. tostring(z), Vector3.new(6.5, 0.35, 0.32), p.trim, Enum.Material.Slate), CFrame.new(0, 0.52, z))
		end
		for _, x in ipairs({-3.0, 3.0}) do
			weld(root, makePart("RoofEdgeX" .. tostring(x), Vector3.new(0.32, 0.35, 5.9), p.trim, Enum.Material.Slate), CFrame.new(x, 0.52, 0))
		end
	end
	if detail(level, 3) then
		weld(root, makePart("RoofCenterCap", Vector3.new(2.2, 0.10, 2.2), p.accent, Enum.Material.Slate), CFrame.new(0, 0.47, 0))
	end
end

local function addRailing(model, root, row, level)
	local p = row.palette
	weld(root, makePart("TopRail", Vector3.new(5.5, 0.24, 0.28), p.main, Enum.Material.WoodPlanks), CFrame.new(0, 2.15, 0))
	weld(root, makePart("BottomRail", Vector3.new(5.5, 0.18, 0.24), p.trim, Enum.Material.WoodPlanks), CFrame.new(0, 0.42, 0))
	local count = level == 1 and 3 or level == 2 and 5 or 7
	for i = 0, count - 1 do
		local x = -2.55 + i * (5.1 / math.max(1, count - 1))
		weld(root, makePart("Baluster" .. i, Vector3.new(0.18, 1.85, 0.18), i % 2 == 0 and p.accent or p.main, Enum.Material.WoodPlanks), CFrame.new(x, 1.25, 0))
	end
	if detail(level, 3) then
		for _, x in ipairs({-2.72, 2.72}) do
			weld(root, makePart("EndPost" .. tostring(x), Vector3.new(0.34, 2.35, 0.34), p.trim, Enum.Material.WoodPlanks), CFrame.new(x, 1.18, 0))
		end
	end
end


local function addHousingModule(model,root,row,level)
	local p=row.palette
	local shape=row.housingShape
	if shape=="FOUNDATION_TRIANGLE" or shape=="CEILING_WEDGE" then
		local piece=weld(root,wedge("Triangle",Vector3.new(6,shape=="FOUNDATION_TRIANGLE" and 0.70 or 0.34,6),p.main,Enum.Material.Slate),CFrame.new(0,shape=="FOUNDATION_TRIANGLE" and 0.35 or 0.17,0))
		piece:SetAttribute("SnapVisualRole",row.snapClass)
	elseif shape=="FENCE_FOUNDATION" then
		weld(root,makePart("Strip",Vector3.new(6,0.72,0.72),p.main,Enum.Material.Slate),CFrame.new(0,0.36,0))
	elseif shape=="HALF_WALL" then
		weld(root,makePart("Panel",Vector3.new(6,2.6,0.38),p.main,Enum.Material.Brick),CFrame.new(0,1.3,0))
		if detail(level,2) then weld(root,makePart("TopCap",Vector3.new(6.15,0.22,0.50),p.accent,Enum.Material.WoodPlanks),CFrame.new(0,2.55,0)) end
	elseif shape=="DOOR_FRAME" then
		for _,x in ipairs({-2.15,2.15}) do weld(root,makePart("Post"..x,Vector3.new(0.72,5,0.46),p.main,Enum.Material.Brick),CFrame.new(x,2.5,0)) end
		weld(root,makePart("Header",Vector3.new(5.0,0.82,0.46),p.main,Enum.Material.Brick),CFrame.new(0,4.59,0))
		if detail(level,2) then weld(root,makePart("InnerTrim",Vector3.new(3.65,0.18,0.54),p.accent,Enum.Material.WoodPlanks),CFrame.new(0,4.08,0)) end
	elseif shape=="WINDOW_FRAME" then
		for _,x in ipairs({-2.25,2.25}) do weld(root,makePart("Side"..x,Vector3.new(0.55,5,0.42),p.main,Enum.Material.Brick),CFrame.new(x,2.5,0)) end
		for _,y in ipairs({0.45,4.55}) do weld(root,makePart("Rail"..y,Vector3.new(4.1,0.55,0.42),p.main,Enum.Material.Brick),CFrame.new(0,y,0)) end
		if detail(level,2) then
			weld(root,makePart("CrossV",Vector3.new(0.14,3.45,0.24),p.trim,Enum.Material.WoodPlanks),CFrame.new(0,2.5,-0.05))
			weld(root,makePart("CrossH",Vector3.new(4.0,0.14,0.24),p.trim,Enum.Material.WoodPlanks),CFrame.new(0,2.5,-0.05))
		end
	elseif shape=="CEILING_TILE" then
		weld(root,makePart("Ceiling",Vector3.new(6,0.34,6),p.main,Enum.Material.WoodPlanks),CFrame.new(0,0.17,0))
		if detail(level,2) then
			for _,x in ipairs({-2.75,2.75}) do weld(root,makePart("Edge"..x,Vector3.new(0.18,0.22,5.9),p.trim,Enum.Material.WoodPlanks),CFrame.new(x,0.37,0)) end
		end
	elseif shape=="ROOF_SLOPE" then
		weld(root,wedge("Slope",Vector3.new(6,1.5,6),p.main,Enum.Material.Slate),CFrame.new(0,0.75,0))
		if detail(level,2) then weld(root,makePart("Eave",Vector3.new(6.2,0.22,0.36),p.trim,Enum.Material.WoodPlanks),CFrame.new(0,0.18,-2.85)) end
	elseif shape=="ROOF_CORNER" then
		weld(root,wedge("CornerA",Vector3.new(3.2,1.5,6),p.main,Enum.Material.Slate),CFrame.new(-1.45,0.75,0))
		weld(root,wedge("CornerB",Vector3.new(3.2,1.5,6),p.main,Enum.Material.Slate),CFrame.new(1.45,0.75,0)*CFrame.Angles(0,math.rad(180),0))
	elseif shape=="GATE_FRAME" then
		for _,x in ipairs({-3.0,3.0}) do
			weld(root,makePart("GatePost"..x,Vector3.new(0.90,6.2,0.90),p.main,Enum.Material.Brick),CFrame.new(x,3.1,0))
		end
		weld(root,makePart("GateHeader",Vector3.new(6.9,0.95,0.90),p.accent,Enum.Material.Slate),CFrame.new(0,5.8,0))
	elseif shape=="LADDER" then
		for _,x in ipairs({-0.72,0.72}) do weld(root,makePart("Rail"..x,Vector3.new(0.20,5.6,0.20),p.main,Enum.Material.WoodPlanks),CFrame.new(x,2.8,0)) end
		for i=0,7 do weld(root,makePart("Rung"..i,Vector3.new(1.62,0.16,0.20),p.accent,Enum.Material.WoodPlanks),CFrame.new(0,0.45+i*0.68,0)) end
	elseif shape=="WALL_TRIM" then
		weld(root,makePart("Trim",Vector3.new(6,0.34,0.42),p.main,Enum.Material.WoodPlanks),CFrame.new(0,0.17,0))
		if detail(level,3) then
			for i=-2,2 do weld(root,makePart("Stud"..i,Vector3.new(0.12,0.48,0.52),p.accent,Enum.Material.Metal),CFrame.new(i*1.15,0.18,0)) end
		end
	end
end

local BUILDERS = table.freeze({
	FLOOR_TILE = addFloor,
	WALL_WINDOW = addWindowWall,
	WALL_CORNER = addCornerWall,
	PILLAR_STONE = addPillar,
	STAIRS_STRAIGHT = addStairs,
	ARCHWAY = addArchway,
	ROOF_FLAT = addFlatRoof,
	RAILING = addRailing,
	FOUNDATION_TRIANGLE = addHousingModule,
	FENCE_FOUNDATION = addHousingModule,
	HALF_WALL = addHousingModule,
	DOOR_FRAME = addHousingModule,
	WINDOW_FRAME = addHousingModule,
	CEILING_TILE = addHousingModule,
	CEILING_WEDGE = addHousingModule,
	ROOF_SLOPE = addHousingModule,
	ROOF_CORNER = addHousingModule,
	GATE_FRAME = addHousingModule,
	LADDER = addHousingModule,
	WALL_TRIM = addHousingModule,
})

local function applyModelMetadata(model, row, quality)
	model:SetAttribute("StudioAssetFamilyRootId", row.familyRootId)
	model:SetAttribute("StudioAssetSubfamily", row.subfamily)
	model:SetAttribute("StudioAssetBuildingRole", row.buildingRole)
	model:SetAttribute("StudioAssetSilhouette", row.silhouette)
	model:SetAttribute("HousingSnapClass", row.snapClass or "NONE")
	model:SetAttribute("HousingStabilityRole", row.stabilityRole or "VISUAL_ONLY")
	model:SetAttribute("HousingBuildingRole", row.buildingRole or "DECORATION")
	model:SetAttribute("StudioAssetQualityLevel", quality)
	model:SetAttribute("StudioAssetQualityTarget", 100)
	model:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
end

function RobloxCommonBuilding.List()
	local result = {}
	for id, row in pairs(Catalog) do
		table.insert(result, table.freeze({
			id = id,
			name = row.name,
			familyRootId = row.familyRootId,
			family = row.family,
			subfamily = row.subfamily,
			buildingRole = row.buildingRole,
			silhouette = row.silhouette,
			productionVerified = false,
		}))
	end
	table.sort(result, function(a, b)
		return a.id < b.id
	end)
	return table.freeze(result)
end

function RobloxCommonBuilding.Describe(id)
	local row = Catalog[string.upper(tostring(id or ""))]
	assert(row, "UNKNOWN_COMMON_BUILDING: " .. tostring(id))
	return row
end

function RobloxCommonBuilding.Create(id, options)
	options = options or {}
	local key = string.upper(tostring(id or ""))
	local row = Catalog[key]
	local builder = BUILDERS[key]
	assert(row and builder, "UNKNOWN_COMMON_BUILDING: " .. tostring(id))

	local quality = string.lower(tostring(options.quality or "mid"))
	local level = QUALITY_LEVEL[quality]
	assert(level, "INVALID_COMMON_BUILDING_QUALITY: " .. tostring(quality))

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

function RobloxCommonBuilding.CreateViewport(id, options)
	options = options or {}
	local frame = Instance.new("ViewportFrame")
	frame.Name = "CommonBuildingViewport_" .. string.upper(tostring(id or ""))
	frame.BackgroundTransparency = options.backgroundTransparency == nil and 1 or options.backgroundTransparency
	frame.Ambient = options.ambient or c(112, 108, 102)
	frame.LightColor = options.lightColor or c(255, 239, 218)
	frame.LightDirection = options.lightDirection or Vector3.new(-1, -1, -1)
	frame.Size = options.size or UDim2.fromScale(1, 1)

	local world = Instance.new("WorldModel")
	world.Name = "CommonBuildingWorld"
	world.Parent = frame

	local model = RobloxCommonBuilding.Create(id, {
		quality = options.quality or "near",
		palette = options.palette,
		anchored = true,
		parent = world,
	})

	local camera = Instance.new("Camera")
	camera.Name = "CommonBuildingCamera"
	camera.FieldOfView = tonumber(options.fieldOfView) or 38
	camera.Parent = frame
	frame.CurrentCamera = camera

	local boxCf, boxSize = model:GetBoundingBox()
	local radius = math.max(boxSize.X, boxSize.Y, boxSize.Z)
	local distance = math.max(6.5, radius * 1.55)
	camera.CFrame = CFrame.new(boxCf.Position + Vector3.new(distance * 0.78, distance * 0.52, distance), boxCf.Position)

	frame.Parent = options.parent
	return frame
end

return table.freeze(RobloxCommonBuilding)
