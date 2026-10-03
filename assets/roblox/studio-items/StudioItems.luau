-- 파일명: assets/roblox/studio-items/StudioItems.luau
-- 역할: Roblox 공용 내부 아이템 비주얼 8종과 동일 모델 기반 Viewport UI 아이콘 생성
-- 원칙: 순수 표현 자산만 제공한다. 데미지/회복량/가격/세이브/네트워크 권한은 소유하지 않는다.

local StudioItems = {}

local QUALITY_LEVEL = table.freeze({
	far = 1,
	mid = 2,
	near = 3,
})

local function c(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local Catalog = table.freeze({
	HEALING_POTION = table.freeze({
		id = "HEALING_POTION",
		name = "회복 포션",
		familyRootId = "POTION_BOTTLE",
		family = "PROP",
		subfamily = "ITEM",
		itemRole = "CONSUMABLE",
		silhouette = "ROUND_BOTTLE_SHOULDER_CORK",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			glass = c(196, 219, 220),
			liquid = c(205, 64, 76),
			dark = c(51, 39, 36),
			accent = c(244, 207, 118),
			label = c(227, 220, 197),
		}),
	}),
	MANA_CRYSTAL = table.freeze({
		id = "MANA_CRYSTAL",
		name = "마력 수정",
		familyRootId = "CRYSTAL_CLUSTER",
		family = "PROP",
		subfamily = "RESOURCE",
		itemRole = "RESOURCE",
		silhouette = "ASYMMETRIC_FACETED_CLUSTER",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			core = c(92, 156, 255),
			mid = c(115, 210, 255),
			glow = c(159, 235, 255),
			base = c(48, 58, 75),
		}),
	}),
	IRON_INGOT = table.freeze({
		id = "IRON_INGOT",
		name = "철괴",
		familyRootId = "METAL_INGOT",
		family = "PROP",
		subfamily = "RESOURCE",
		itemRole = "RESOURCE",
		silhouette = "TAPERED_STACKED_INGOT",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			metal = c(115, 124, 132),
			edge = c(164, 172, 179),
			dark = c(62, 68, 73),
		}),
	}),
	GOLD_INGOT = table.freeze({
		id = "GOLD_INGOT",
		name = "금괴",
		familyRootId = "METAL_INGOT",
		family = "PROP",
		subfamily = "RESOURCE",
		itemRole = "RESOURCE",
		silhouette = "TAPERED_STACKED_INGOT",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			metal = c(214, 161, 48),
			edge = c(255, 219, 105),
			dark = c(126, 84, 24),
		}),
	}),
	WOOD_BUNDLE = table.freeze({
		id = "WOOD_BUNDLE",
		name = "나무 묶음",
		familyRootId = "RESOURCE_BUNDLE",
		family = "PROP",
		subfamily = "RESOURCE",
		itemRole = "RESOURCE",
		silhouette = "THREE_LOG_BUNDLE_WITH_BINDINGS",
		cameraRole = "HANDHELD_MEDIUM",
		palette = table.freeze({
			bark = c(89, 62, 43),
			cut = c(183, 139, 92),
			band = c(91, 92, 80),
		}),
	}),
	STONE_CHUNK = table.freeze({
		id = "STONE_CHUNK",
		name = "돌 덩이",
		familyRootId = "STONE_RESOURCE",
		family = "PROP",
		subfamily = "RESOURCE",
		itemRole = "RESOURCE",
		silhouette = "ASYMMETRIC_THREE_MASS_ROCK",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			stone = c(105, 112, 113),
			mid = c(130, 137, 136),
			dark = c(68, 74, 76),
			moss = c(74, 97, 64),
		}),
	}),
	RELIC_KEY = table.freeze({
		id = "RELIC_KEY",
		name = "유물 열쇠",
		familyRootId = "RELIC_KEY",
		family = "PROP",
		subfamily = "ITEM",
		itemRole = "KEY_ITEM",
		silhouette = "RING_SHAFT_ORNATE_BIT",
		cameraRole = "HANDHELD_SMALL",
		palette = table.freeze({
			metal = c(158, 119, 61),
			edge = c(214, 181, 105),
			dark = c(71, 54, 41),
			gem = c(95, 183, 173),
		}),
	}),
	LANTERN = table.freeze({
		id = "LANTERN",
		name = "랜턴",
		familyRootId = "HAND_LANTERN",
		family = "PROP",
		subfamily = "ITEM",
		itemRole = "UTILITY",
		silhouette = "CAGED_GLASS_LANTERN_HANDLE",
		cameraRole = "HANDHELD_MEDIUM",
		palette = table.freeze({
			metal = c(64, 67, 66),
			edge = c(127, 130, 123),
			glass = c(196, 218, 202),
			glow = c(255, 195, 95),
			dark = c(31, 33, 34),
		}),
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
	model.Name = "StudioItem_" .. id
	model:SetAttribute("StudioAssetId", id)
	model:SetAttribute("StudioAssetPack", "roblox-studio-items-v1")
	model:SetAttribute("StudioAssetFamily", "PROP")
	model:SetAttribute("SourceAssetLibrary", "company-asset-library.json")
	model:SetAttribute("ProductionVerified", false)
	model:SetAttribute("GameplayAuthority", false)

	local root = makePart("VisualRoot", Vector3.new(0.45, 0.45, 0.45), c(255, 255, 255), Enum.Material.SmoothPlastic)
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

local function addBottle(model, root, row, level)
	local p = row.palette
	local liquid = weld(root, makePart("Liquid", Vector3.new(1.34, 1.55, 1.34), p.liquid, Enum.Material.Neon, "BALL"), CFrame.new(0, 0.70, 0))
	liquid.Transparency = 0.12

	local glass = weld(root, makePart("GlassBody", Vector3.new(1.55, 1.82, 1.55), p.glass, Enum.Material.Glass, "BALL"), CFrame.new(0, 0.74, 0))
	glass.Transparency = 0.45

	weld(root, makePart("BottleNeck", Vector3.new(0.67, 0.82, 0.67), p.glass, Enum.Material.Glass, "CYLINDER"), CFrame.new(0, 1.75, 0))
	weld(root, makePart("Cork", Vector3.new(0.70, 0.52, 0.70), p.dark, Enum.Material.Wood, "CYLINDER"), CFrame.new(0, 2.22, 0))
	weld(root, makePart("NeckBand", Vector3.new(0.86, 0.16, 0.86), p.accent, Enum.Material.Metal, "CYLINDER"), CFrame.new(0, 1.95, 0))

	if detail(level, 2) then
		weld(root, makePart("FrontLabel", Vector3.new(0.82, 0.58, 0.10), p.label, Enum.Material.Fabric), CFrame.new(0, 0.76, -0.75))
		weld(root, makePart("LabelMark", Vector3.new(0.36, 0.36, 0.06), p.liquid, Enum.Material.SmoothPlastic, "BALL"), CFrame.new(0, 0.76, -0.82))
	end
	if detail(level, 3) then
		for side = -1, 1, 2 do
			weld(root, makePart("ShoulderRing" .. side, Vector3.new(0.10, 0.54, 0.10), p.accent, Enum.Material.Metal, "CYLINDER"), CFrame.new(side * 0.55, 1.35, 0) * CFrame.Angles(0, 0, math.rad(18 * side)))
		end
	end
end

local function addCrystal(model, root, row, level)
	local p = row.palette
	weld(root, makePart("StoneBase", Vector3.new(1.65, 0.48, 1.28), p.base, Enum.Material.Slate), CFrame.new(0, 0.12, 0))
	local shards = {
		{0, 1.08, 0, 0.46, 2.10, 0.50, 0, 0, 8},
		{-0.50, 0.78, 0.12, 0.34, 1.42, 0.38, -8, 0, -18},
		{0.48, 0.72, -0.10, 0.30, 1.30, 0.34, 8, 0, 20},
	}
	for i, data in ipairs(shards) do
		local shard = makeWedge("CrystalShard" .. i, Vector3.new(data[4], data[5], data[6]), i == 1 and p.core or p.mid, Enum.Material.Neon)
		weld(root, shard, CFrame.new(data[1], data[2], data[3]) * CFrame.Angles(math.rad(data[7]), math.rad(data[8]), math.rad(data[9])))
	end
	if detail(level, 2) then
		for i, pos in ipairs({Vector3.new(-0.72, 0.40, -0.22), Vector3.new(0.68, 0.36, 0.24)}) do
			weld(root, makePart("CrystalChip" .. i, Vector3.new(0.30, 0.58, 0.30), p.glow, Enum.Material.Neon), CFrame.new(pos) * CFrame.Angles(0, 0, math.rad(i == 1 and -28 or 24)))
		end
	end
end

local function addIngot(model, root, row, level)
	local p = row.palette
	local base = weld(root, makePart("IngotBody", Vector3.new(2.15, 0.58, 1.18), p.metal, Enum.Material.Metal), CFrame.new(0, 0.42, 0))
	base:SetAttribute("MaterialVariantRole", "METAL_CORE")
	weld(root, makePart("IngotTop", Vector3.new(1.65, 0.16, 0.86), p.edge, Enum.Material.Metal), CFrame.new(0, 0.79, 0))
	for side = -1, 1, 2 do
		weld(root, makeWedge("IngotSlope" .. side, Vector3.new(0.46, 0.46, 1.02), p.metal, Enum.Material.Metal), CFrame.new(side * 0.84, 0.52, 0) * CFrame.Angles(0, side < 0 and math.rad(180) or 0, 0))
	end
	if detail(level, 3) then
		weld(root, makePart("StampPlate", Vector3.new(0.58, 0.06, 0.34), p.dark, Enum.Material.Metal), CFrame.new(0, 0.90, 0))
	end
end

local function addWood(model, root, row, level)
	local p = row.palette
	for i, offset in ipairs({Vector3.new(-0.48, 0.50, 0), Vector3.new(0.48, 0.50, 0), Vector3.new(0, 1.08, 0)}) do
		local log = weld(root, makePart("Log" .. i, Vector3.new(0.72, 2.65, 0.72), p.bark, Enum.Material.Wood, "CYLINDER"), CFrame.new(offset) * CFrame.Angles(0, 0, math.rad(90)))
		log:SetAttribute("EndGrainColor", tostring(p.cut))
		if detail(level, 2) then
			weld(root, makePart("CutFace" .. i, Vector3.new(0.76, 0.08, 0.76), p.cut, Enum.Material.Wood, "CYLINDER"), CFrame.new(offset + Vector3.new(-1.34, 0, 0)) * CFrame.Angles(0, 0, math.rad(90)))
		end
	end
	for _, x in ipairs({-0.68, 0.68}) do
		weld(root, makePart("Binding" .. tostring(x), Vector3.new(0.12, 2.45, 1.72), p.band, Enum.Material.Fabric), CFrame.new(x, 0.76, 0))
	end
end

local function addStone(model, root, row, level)
	local p = row.palette
	local rocks = {
		{Vector3.new(-0.40, 0.54, 0.05), Vector3.new(1.18, 0.92, 1.02), -8, 16, 8, p.stone},
		{Vector3.new(0.43, 0.62, -0.10), Vector3.new(1.06, 1.12, 0.92), 10, -18, -6, p.mid},
		{Vector3.new(0.00, 1.06, 0.28), Vector3.new(0.80, 0.86, 0.72), -14, 7, 18, p.dark},
	}
	for i, data in ipairs(rocks) do
		local rock = makePart("Rock" .. i, data[2], data[6], Enum.Material.Slate)
		weld(root, rock, CFrame.new(data[1]) * CFrame.Angles(math.rad(data[3]), math.rad(data[4]), math.rad(data[5])))
	end
	if detail(level, 3) then
		weld(root, makePart("MossPatch", Vector3.new(0.68, 0.10, 0.46), p.moss, Enum.Material.Grass), CFrame.new(-0.18, 1.52, 0.18) * CFrame.Angles(math.rad(8), 0, math.rad(-12)))
	end
end

local function addKey(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Shaft", Vector3.new(0.20, 2.45, 0.20), p.metal, Enum.Material.Metal, "CYLINDER"), CFrame.new(0, 0.95, 0))
	weld(root, makePart("Collar", Vector3.new(0.42, 0.24, 0.42), p.edge, Enum.Material.Metal, "CYLINDER"), CFrame.new(0, 0.02, 0))
	for i = 0, 7 do
		local a = math.rad(i * 45)
		local ring = makePart("RingSegment" .. i, Vector3.new(0.15, 0.62, 0.15), p.edge, Enum.Material.Metal, "CYLINDER")
		weld(root, ring, CFrame.new(math.cos(a) * 0.64, 2.05 + math.sin(a) * 0.64, 0) * CFrame.Angles(0, 0, a + math.rad(90)))
	end
	weld(root, makePart("BitStem", Vector3.new(0.20, 0.68, 0.20), p.metal, Enum.Material.Metal), CFrame.new(0.26, -0.24, 0))
	weld(root, makePart("BitA", Vector3.new(0.58, 0.18, 0.28), p.edge, Enum.Material.Metal), CFrame.new(0.43, -0.55, 0))
	weld(root, makePart("BitB", Vector3.new(0.34, 0.18, 0.48), p.edge, Enum.Material.Metal), CFrame.new(0.26, -0.82, 0))
	if detail(level, 2) then
		local gem = weld(root, makePart("Gem", Vector3.new(0.34, 0.34, 0.34), p.gem, Enum.Material.Neon, "BALL"), CFrame.new(0, 2.05, -0.12))
		gem.Transparency = 0.08
	end
end

local function addLantern(model, root, row, level)
	local p = row.palette
	weld(root, makePart("Base", Vector3.new(1.42, 0.30, 1.42), p.metal, Enum.Material.Metal), CFrame.new(0, 0.15, 0))
	weld(root, makePart("Glass", Vector3.new(1.15, 1.58, 1.15), p.glass, Enum.Material.Glass), CFrame.new(0, 1.08, 0))
	weld(root, makePart("GlowCore", Vector3.new(0.56, 0.92, 0.56), p.glow, Enum.Material.Neon), CFrame.new(0, 1.04, 0))
	weld(root, makePart("Top", Vector3.new(1.36, 0.28, 1.36), p.metal, Enum.Material.Metal), CFrame.new(0, 1.94, 0))
	for sx = -1, 1, 2 do
		for sz = -1, 1, 2 do
			weld(root, makePart("Cage" .. sx .. "_" .. sz, Vector3.new(0.12, 1.72, 0.12), p.edge, Enum.Material.Metal), CFrame.new(sx * 0.55, 1.08, sz * 0.55))
		end
	end
	for i = 0, 6 do
		local a = math.pi * i / 6
		local segment = makePart("Handle" .. i, Vector3.new(0.12, 0.72, 0.12), p.dark, Enum.Material.Metal, "CYLINDER")
		weld(root, segment, CFrame.new(math.cos(a) * 0.72, 2.42 + math.sin(a) * 0.72, 0) * CFrame.Angles(0, 0, a + math.rad(90)))
	end
	if detail(level, 3) then
		weld(root, makePart("VentCap", Vector3.new(0.72, 0.32, 0.72), p.edge, Enum.Material.Metal, "CYLINDER"), CFrame.new(0, 2.14, 0))
	end
end

local BUILDERS = table.freeze({
	HEALING_POTION = addBottle,
	MANA_CRYSTAL = addCrystal,
	IRON_INGOT = addIngot,
	GOLD_INGOT = addIngot,
	WOOD_BUNDLE = addWood,
	STONE_CHUNK = addStone,
	RELIC_KEY = addKey,
	LANTERN = addLantern,
})

local function applyModelMetadata(model, row, quality)
	model:SetAttribute("StudioAssetFamilyRootId", row.familyRootId)
	model:SetAttribute("StudioAssetSubfamily", row.subfamily)
	model:SetAttribute("StudioAssetItemRole", row.itemRole)
	model:SetAttribute("StudioAssetSilhouette", row.silhouette)
	model:SetAttribute("StudioAssetCameraRole", row.cameraRole)
	model:SetAttribute("StudioAssetQualityLevel", quality)
	model:SetAttribute("StudioAssetQualityTarget", 120)
	model:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
end

function StudioItems.List()
	local result = {}
	for id, row in pairs(Catalog) do
		table.insert(result, table.freeze({
			id = id,
			name = row.name,
			familyRootId = row.familyRootId,
			family = row.family,
			subfamily = row.subfamily,
			itemRole = row.itemRole,
			silhouette = row.silhouette,
			productionVerified = false,
		}))
	end
	table.sort(result, function(a, b)
		return a.id < b.id
	end)
	return table.freeze(result)
end

function StudioItems.Describe(id)
	local row = Catalog[string.upper(tostring(id or ""))]
	assert(row, "UNKNOWN_STUDIO_ITEM: " .. tostring(id))
	return row
end

function StudioItems.Create(id, options)
	options = options or {}
	local key = string.upper(tostring(id or ""))
	local row = Catalog[key]
	local builder = BUILDERS[key]
	assert(row and builder, "UNKNOWN_STUDIO_ITEM: " .. tostring(id))

	local quality = string.lower(tostring(options.quality or "mid"))
	local level = QUALITY_LEVEL[quality]
	assert(level, "INVALID_STUDIO_ITEM_QUALITY: " .. tostring(quality))

	local model, root = rootFor(key)
	builder(model, root, row, level)
	applyModelMetadata(model, row, quality)

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
	local pivot = options.pivot
	if typeof(pivot) == "CFrame" then
		model:PivotTo(pivot)
	end
	return model
end

function StudioItems.CreateViewport(id, options)
	options = options or {}
	local frame = Instance.new("ViewportFrame")
	frame.Name = "StudioItemViewport_" .. string.upper(tostring(id or ""))
	frame.BackgroundTransparency = options.backgroundTransparency == nil and 1 or options.backgroundTransparency
	frame.Ambient = options.ambient or c(110, 118, 128)
	frame.LightColor = options.lightColor or c(255, 238, 214)
	frame.LightDirection = options.lightDirection or Vector3.new(-1, -1, -1)
	frame.Size = options.size or UDim2.fromScale(1, 1)

	local world = Instance.new("WorldModel")
	world.Name = "StudioItemWorld"
	world.Parent = frame

	local model = StudioItems.Create(id, {
		quality = options.quality or "near",
		anchored = true,
		parent = world,
	})

	local camera = Instance.new("Camera")
	camera.Name = "StudioItemCamera"
	camera.FieldOfView = tonumber(options.fieldOfView) or 34
	camera.Parent = frame
	frame.CurrentCamera = camera

	local boxCf, boxSize = model:GetBoundingBox()
	local maxSize = math.max(boxSize.X, boxSize.Y, boxSize.Z)
	local distance = math.max(3.2, maxSize * 2.35)
	local target = boxCf.Position + Vector3.new(0, boxSize.Y * 0.04, 0)
	local direction = (options.cameraDirection or Vector3.new(1.25, 0.75, 1.6)).Unit
	camera.CFrame = CFrame.lookAt(target + direction * distance, target)

	frame:SetAttribute("StudioAssetId", string.upper(tostring(id or "")))
	frame:SetAttribute("StudioAssetFamilyRootId", model:GetAttribute("StudioAssetFamilyRootId"))
	frame:SetAttribute("ProductionVerified", false)
	return frame, model
end

function StudioItems.Audit()
	local rows = StudioItems.List()
	local missing = {}
	for _, row in ipairs(rows) do
		if not BUILDERS[row.id] then
			table.insert(missing, row.id .. ":BUILDER")
		end
		if row.family ~= "PROP" then
			table.insert(missing, row.id .. ":FAMILY")
		end
		if not row.familyRootId or row.familyRootId == "" then
			table.insert(missing, row.id .. ":FAMILY_ROOT")
		end
	end
	return table.freeze({
		version = 1,
		packId = "roblox-studio-items-v1",
		itemCount = #rows,
		expectedItemCount = 8,
		pass = #rows == 8 and #missing == 0,
		missing = table.freeze(missing),
		productionVerified = false,
		runtimeVerificationRequired = true,
		gameplayAuthority = false,
	})
end

return table.freeze(StudioItems)
