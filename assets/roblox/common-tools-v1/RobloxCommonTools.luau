-- 파일명: assets/roblox/common-tools-v1/RobloxCommonTools.luau
-- 역할: 여러 Roblox 게임에서 재사용하는 회사 공용 무기/도구 비주얼 8종 생성
-- 원칙: 순수 표현 자산만 제공한다. 공격력/공속/채집량/내구도/세이브/네트워크 권한은 소유하지 않는다.

local RobloxCommonTools = {}

local QUALITY_LEVEL = table.freeze({
	far = 1,
	mid = 2,
	near = 3,
})

local function c(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local Catalog = table.freeze({
	SWORD = table.freeze({
		id = "SWORD", name = "장검", familyRootId = "TOOL_SWORD", family = "WEAPON", subfamily = "SWORD", toolRole = "MELEE",
		silhouette = "STRAIGHT_BLADE_CROSSGUARD", palette = table.freeze({metal=c(171,177,181), edge=c(222,226,227), dark=c(56,60,62), grip=c(82,55,43), accent=c(180,136,58)}),
	}),
	SPEAR = table.freeze({
		id = "SPEAR", name = "창", familyRootId = "TOOL_SPEAR", family = "WEAPON", subfamily = "SPEAR", toolRole = "POLEARM",
		silhouette = "LONG_SHAFT_LEAF_POINT", palette = table.freeze({metal=c(160,168,171), edge=c(217,222,223), shaft=c(95,67,45), wrap=c(79,55,44)}),
	}),
	AXE = table.freeze({
		id = "AXE", name = "도끼", familyRootId = "TOOL_AXE", family = "WEAPON", subfamily = "AXE", toolRole = "MELEE_TOOL",
		silhouette = "LONG_HANDLE_WEDGE_HEAD", palette = table.freeze({metal=c(117,124,127), edge=c(185,191,193), shaft=c(99,69,45), wrap=c(71,52,43)}),
	}),
	HAMMER = table.freeze({
		id = "HAMMER", name = "망치", familyRootId = "TOOL_HAMMER", family = "WEAPON", subfamily = "HAMMER", toolRole = "HEAVY_TOOL",
		silhouette = "BLOCK_HEAD_LONG_HANDLE", palette = table.freeze({metal=c(101,106,109), edge=c(158,163,164), shaft=c(91,63,43), accent=c(139,91,45)}),
	}),
	PICKAXE = table.freeze({
		id = "PICKAXE", name = "곡괭이", familyRootId = "TOOL_PICKAXE", family = "WEAPON", subfamily = "PICKAXE", toolRole = "GATHERING_TOOL",
		silhouette = "CURVED_PICK_HEAD_HANDLE", palette = table.freeze({metal=c(105,113,117), edge=c(170,177,180), shaft=c(94,66,45), wrap=c(72,53,44)}),
	}),
	BOW = table.freeze({
		id = "BOW", name = "활", familyRootId = "TOOL_BOW", family = "WEAPON", subfamily = "BOW", toolRole = "RANGED",
		silhouette = "CURVED_LIMBS_CENTER_GRIP", palette = table.freeze({wood=c(118,76,45), woodLight=c(173,117,67), string=c(215,205,180), grip=c(72,51,40)}),
	}),
	STAFF = table.freeze({
		id = "STAFF", name = "지팡이", familyRootId = "TOOL_STAFF", family = "WEAPON", subfamily = "STAFF", toolRole = "MAGIC_FOCUS",
		silhouette = "LONG_SHAFT_CRYSTAL_CROWN", palette = table.freeze({wood=c(82,58,43), woodLight=c(123,86,54), crystal=c(102,175,238), glow=c(151,220,255), metal=c(88,93,96)}),
	}),
	SHIELD = table.freeze({
		id = "SHIELD", name = "방패", familyRootId = "TOOL_SHIELD", family = "WEAPON", subfamily = "SHIELD", toolRole = "DEFENSIVE_VISUAL",
		silhouette = "KITE_PLATE_RIM_BOSS", palette = table.freeze({metal=c(101,107,110), edge=c(166,172,174), wood=c(94,67,48), accent=c(181,137,56)}),
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
	model.Name = "CommonTool_" .. id
	model:SetAttribute("StudioAssetId", id)
	model:SetAttribute("StudioAssetPack", "roblox-common-tools-v1")
	model:SetAttribute("StudioAssetFamily", "WEAPON")
	model:SetAttribute("CompanyCommonBase", true)
	model:SetAttribute("CompatibleGameScope", "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH")
	model:SetAttribute("ThemeAdaptationRequiredPerGame", true)
	model:SetAttribute("SourceAssetLibrary", "company-asset-library.json")
	model:SetAttribute("ProductionVerified", false)
	model:SetAttribute("GameplayAuthority", false)
	model:SetAttribute("VisualGripSocketName", "VisualGrip")

	local root = makePart("VisualRoot", Vector3.new(0.30, 0.30, 0.30), c(255,255,255), Enum.Material.SmoothPlastic)
	root.Transparency = 1
	root.CastShadow = false
	root.Massless = false
	root.Parent = model
	model.PrimaryPart = root

	local attachment = Instance.new("Attachment")
	attachment.Name = "VisualGrip"
	attachment.Parent = root
	return model, root
end

local function detail(level, needed)
	return level >= needed
end

local function rowWithPalette(row, override)
	if type(override) ~= "table" then return row end
	local palette = {}
	for key, value in pairs(row.palette or {}) do palette[key] = value end
	for key, value in pairs(override) do
		if palette[key] ~= nil and typeof(value) == "Color3" then palette[key] = value end
	end
	local clone = {}
	for key, value in pairs(row) do clone[key] = value end
	clone.palette = table.freeze(palette)
	return table.freeze(clone)
end

local function addSword(model, root, row, level)
	local p=row.palette
	weld(root, makePart("Grip",Vector3.new(0.34,1.45,0.34),p.grip,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,-1.0,0))
	weld(root, makePart("Guard",Vector3.new(2.0,0.22,0.30),p.accent,Enum.Material.Metal),CFrame.new(0,-0.20,0))
	weld(root, makePart("Blade",Vector3.new(0.50,3.5,0.18),p.metal,Enum.Material.Metal),CFrame.new(0,1.65,0))
	weld(root, wedge("Tip",Vector3.new(0.50,0.82,0.18),p.edge,Enum.Material.Metal),CFrame.new(0,3.80,0))
	if detail(level,2) then weld(root,makePart("Pommel",Vector3.new(0.48,0.34,0.48),p.dark,Enum.Material.Metal,"BALL"),CFrame.new(0,-1.82,0)) end
	if detail(level,3) then weld(root,makePart("BladeRidge",Vector3.new(0.09,3.15,0.05),p.edge,Enum.Material.Metal),CFrame.new(0,1.62,-0.12)) end
end

local function addSpear(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Shaft",Vector3.new(0.30,5.8,0.30),p.shaft,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,0.3,0))
	weld(root,wedge("SpearHead",Vector3.new(0.78,1.55,0.24),p.metal,Enum.Material.Metal),CFrame.new(0,3.85,0))
	if detail(level,2) then weld(root,makePart("HeadRidge",Vector3.new(0.10,1.10,0.05),p.edge,Enum.Material.Metal),CFrame.new(0,3.65,-0.14)) end
	if detail(level,3) then
		for _,y in ipairs({-1.7,-1.35,-1.0}) do weld(root,makePart("Wrap"..tostring(y),Vector3.new(0.36,0.14,0.36),p.wrap,Enum.Material.Fabric,"CYLINDER"),CFrame.new(0,y,0)) end
	end
end

local function addAxe(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Handle",Vector3.new(0.34,4.3,0.34),p.shaft,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,0,0))
	weld(root,wedge("AxeHead",Vector3.new(1.55,1.45,0.46),p.metal,Enum.Material.Metal),CFrame.new(0.55,1.70,0)*CFrame.Angles(0,0,math.rad(-90)))
	weld(root,makePart("HeadCore",Vector3.new(0.58,0.75,0.58),p.edge,Enum.Material.Metal),CFrame.new(0,1.70,0))
	if detail(level,2) then weld(root,makePart("Butt",Vector3.new(0.70,0.42,0.42),p.metal,Enum.Material.Metal),CFrame.new(-0.55,1.70,0)) end
	if detail(level,3) then weld(root,makePart("GripWrap",Vector3.new(0.40,0.95,0.40),p.wrap,Enum.Material.Fabric,"CYLINDER"),CFrame.new(0,-1.55,0)) end
end

local function addHammer(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Handle",Vector3.new(0.38,4.0,0.38),p.shaft,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,-0.1,0))
	weld(root,makePart("HammerHead",Vector3.new(2.05,1.05,1.05),p.metal,Enum.Material.Metal),CFrame.new(0,1.65,0))
	if detail(level,2) then
		weld(root,makePart("FaceA",Vector3.new(0.18,1.15,1.15),p.edge,Enum.Material.Metal),CFrame.new(1.10,1.65,0))
		weld(root,makePart("FaceB",Vector3.new(0.18,1.15,1.15),p.edge,Enum.Material.Metal),CFrame.new(-1.10,1.65,0))
	end
	if detail(level,3) then weld(root,makePart("HeadBand",Vector3.new(0.24,1.22,1.22),p.accent,Enum.Material.Metal),CFrame.new(0,1.65,0)) end
end

local function addPickaxe(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Handle",Vector3.new(0.34,4.4,0.34),p.shaft,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,-0.15,0))
	weld(root,wedge("PickA",Vector3.new(1.65,0.55,0.36),p.metal,Enum.Material.Metal),CFrame.new(0.72,1.85,0)*CFrame.Angles(0,0,math.rad(-12)))
	weld(root,wedge("PickB",Vector3.new(1.65,0.55,0.36),p.metal,Enum.Material.Metal),CFrame.new(-0.72,1.85,0)*CFrame.Angles(0,math.rad(180),math.rad(12)))
	if detail(level,2) then weld(root,makePart("HeadSocket",Vector3.new(0.62,0.62,0.62),p.edge,Enum.Material.Metal),CFrame.new(0,1.80,0)) end
	if detail(level,3) then weld(root,makePart("GripWrap",Vector3.new(0.40,0.96,0.40),p.wrap,Enum.Material.Fabric,"CYLINDER"),CFrame.new(0,-1.65,0)) end
end

local function addBow(model, root, row, level)
	local p=row.palette
	local segments=level==1 and 5 or level==2 and 7 or 9
	for i=0,segments-1 do
		local t=i/(segments-1)
		local y=-2.5+t*5
		local x=math.sin((t-0.5)*math.pi)*0.95
		weld(root,makePart("Limb"..i,Vector3.new(0.20,0.72,0.24),i%2==0 and p.wood or p.woodLight,Enum.Material.Wood),CFrame.new(x,y,0)*CFrame.Angles(0,0,math.rad(-18*x)))
	end
	weld(root,makePart("Grip",Vector3.new(0.34,0.95,0.38),p.grip,Enum.Material.Fabric),CFrame.new(0,0,0))
	weld(root,makePart("String",Vector3.new(0.05,5.05,0.05),p.string,Enum.Material.Fabric,"CYLINDER"),CFrame.new(0,0,0.16))
	if detail(level,3) then weld(root,makePart("NockMark",Vector3.new(0.18,0.08,0.10),p.string,Enum.Material.SmoothPlastic),CFrame.new(0,0,0.20)) end
end

local function addStaff(model, root, row, level)
	local p=row.palette
	weld(root,makePart("Shaft",Vector3.new(0.38,5.3,0.38),p.wood,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,-0.10,0))
	for i=0,3 do
		local a=math.rad(i*90)
		weld(root,makePart("CrownArm"..i,Vector3.new(0.18,1.05,0.18),p.woodLight,Enum.Material.Wood,"CYLINDER"),CFrame.new(math.cos(a)*0.34,2.72+math.sin(a)*0.34,0)*CFrame.Angles(0,0,a))
	end
	local crystal=weld(root,wedge("Crystal",Vector3.new(0.76,1.20,0.76),p.crystal,Enum.Material.Neon),CFrame.new(0,3.02,0))
	crystal.Transparency=0.08
	if detail(level,2) then weld(root,makePart("CrystalGlow",Vector3.new(0.42,0.42,0.42),p.glow,Enum.Material.Neon,"BALL"),CFrame.new(0,3.12,0)) end
	if detail(level,3) then weld(root,makePart("Collar",Vector3.new(0.66,0.22,0.66),p.metal,Enum.Material.Metal,"CYLINDER"),CFrame.new(0,2.30,0)) end
end

local function addShield(model, root, row, level)
	local p=row.palette
	weld(root,wedge("ShieldLeft",Vector3.new(2.25,3.25,0.40),p.wood,Enum.Material.WoodPlanks),CFrame.new(-0.56,0.20,0))
	weld(root,wedge("ShieldRight",Vector3.new(2.25,3.25,0.40),p.wood,Enum.Material.WoodPlanks),CFrame.new(0.56,0.20,0)*CFrame.Angles(0,math.rad(180),0))
	weld(root,makePart("Boss",Vector3.new(0.82,0.82,0.48),p.accent,Enum.Material.Metal,"BALL"),CFrame.new(0,0.45,-0.28))
	if detail(level,2) then
		for _,x in ipairs({-1.06,1.06}) do weld(root,makePart("Rim"..tostring(x),Vector3.new(0.18,2.85,0.48),p.edge,Enum.Material.Metal),CFrame.new(x,0.32,0)) end
	end
	if detail(level,3) then weld(root,makePart("CenterRib",Vector3.new(0.18,2.82,0.48),p.metal,Enum.Material.Metal),CFrame.new(0,0.35,0)) end
end

local BUILDERS=table.freeze({
	SWORD=addSword,
	SPEAR=addSpear,
	AXE=addAxe,
	HAMMER=addHammer,
	PICKAXE=addPickaxe,
	BOW=addBow,
	STAFF=addStaff,
	SHIELD=addShield,
})

local function applyModelMetadata(model,row,quality)
	model:SetAttribute("StudioAssetFamilyRootId",row.familyRootId)
	model:SetAttribute("StudioAssetSubfamily",row.subfamily)
	model:SetAttribute("StudioAssetToolRole",row.toolRole)
	model:SetAttribute("StudioAssetSilhouette",row.silhouette)
	model:SetAttribute("StudioAssetQualityLevel",quality)
	model:SetAttribute("StudioAssetQualityTarget",100)
	model:SetAttribute("RuntimeVerificationState","PENDING_STUDIO")
end

function RobloxCommonTools.List()
	local result={}
	for id,row in pairs(Catalog) do
		table.insert(result,table.freeze({
			id=id,name=row.name,familyRootId=row.familyRootId,family=row.family,subfamily=row.subfamily,toolRole=row.toolRole,
			silhouette=row.silhouette,productionVerified=false,
		}))
	end
	table.sort(result,function(a,b) return a.id<b.id end)
	return table.freeze(result)
end

function RobloxCommonTools.Describe(id)
	local row=Catalog[string.upper(tostring(id or ""))]
	assert(row,"UNKNOWN_COMMON_TOOL: "..tostring(id))
	return row
end

function RobloxCommonTools.Create(id,options)
	options=options or {}
	local key=string.upper(tostring(id or ""))
	local row=Catalog[key]
	local builder=BUILDERS[key]
	assert(row and builder,"UNKNOWN_COMMON_TOOL: "..tostring(id))

	local quality=string.lower(tostring(options.quality or "mid"))
	local level=QUALITY_LEVEL[quality]
	assert(level,"INVALID_COMMON_TOOL_QUALITY: "..tostring(quality))

	local styledRow=rowWithPalette(row,options.palette)
	local model,root=rootFor(key)
	builder(model,root,styledRow,level)
	applyModelMetadata(model,styledRow,quality)
	model:SetAttribute("PaletteAdapted",type(options.palette)=="table")

	local scale=math.clamp(tonumber(options.scale) or 1,0.25,4)
	if scale~=1 then model:ScaleTo(scale) end

	local anchored=options.anchored~=false
	for _,descendant in ipairs(model:GetDescendants()) do
		if descendant:IsA("BasePart") then
			descendant.Anchored=anchored
			descendant.CanCollide=false
			descendant.CanTouch=false
			descendant.CanQuery=false
		end
	end

	model.Parent=options.parent
	if typeof(options.pivot)=="CFrame" then model:PivotTo(options.pivot) end
	return model
end

function RobloxCommonTools.CreateViewport(id,options)
	options=options or {}
	local frame=Instance.new("ViewportFrame")
	frame.Name="CommonToolViewport_"..string.upper(tostring(id or ""))
	frame.BackgroundTransparency=options.backgroundTransparency==nil and 1 or options.backgroundTransparency
	frame.Ambient=options.ambient or c(110,113,117)
	frame.LightColor=options.lightColor or c(255,238,214)
	frame.LightDirection=options.lightDirection or Vector3.new(-1,-1,-1)
	frame.Size=options.size or UDim2.fromScale(1,1)

	local world=Instance.new("WorldModel")
	world.Name="CommonToolWorld"
	world.Parent=frame

	local model=RobloxCommonTools.Create(id,{
		quality=options.quality or "near",
		palette=options.palette,
		anchored=true,
		parent=world,
	})

	local camera=Instance.new("Camera")
	camera.Name="CommonToolCamera"
	camera.FieldOfView=tonumber(options.fieldOfView) or 34
	camera.Parent=frame
	frame.CurrentCamera=camera

	local boxCf,boxSize=model:GetBoundingBox()
	local radius=math.max(boxSize.X,boxSize.Y,boxSize.Z)
	local distance=math.max(5.5,radius*1.55)
	camera.CFrame=CFrame.new(boxCf.Position+Vector3.new(distance*0.72,distance*0.38,distance),boxCf.Position)

	frame.Parent=options.parent
	return frame
end

return table.freeze(RobloxCommonTools)
