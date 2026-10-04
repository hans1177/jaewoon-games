-- 파일명: assets/roblox/common-character-gear-v1/RobloxCommonCharacterGear.luau
-- 역할: 여러 Roblox 게임에서 재사용하는 회사 공용 방어구/의상 비주얼 8종 생성
-- 원칙: 순수 표현 자산만 제공한다. 방어력/체력/이동/장착판정/세이브/네트워크 권한은 소유하지 않는다.

local RobloxCommonCharacterGear = {}

local QUALITY_LEVEL = table.freeze({
	far = 1,
	mid = 2,
	near = 3,
})

local function c(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local Catalog = table.freeze({
	CLOTH_TUNIC = table.freeze({
		id="CLOTH_TUNIC", name="천 상의", familyRootId="GEAR_TUNIC", family="CHARACTER", subfamily="TORSO_GEAR", gearRole="LIGHT_TORSO",
		silhouette="LAYERED_CLOTH_TORSO", palette=table.freeze({cloth=c(105,126,112), clothLight=c(145,158,132), trim=c(75,66,55), accent=c(181,146,89)}),
	}),
	LEATHER_VEST = table.freeze({
		id="LEATHER_VEST", name="가죽 조끼", familyRootId="GEAR_VEST", family="CHARACTER", subfamily="TORSO_GEAR", gearRole="MEDIUM_TORSO",
		silhouette="OPEN_NECK_PANEL_VEST", palette=table.freeze({leather=c(102,70,48), leatherLight=c(143,101,65), trim=c(64,49,39), buckle=c(155,125,70)}),
	}),
	IRON_CHESTPLATE = table.freeze({
		id="IRON_CHESTPLATE", name="철 흉갑", familyRootId="GEAR_CHESTPLATE", family="CHARACTER", subfamily="TORSO_GEAR", gearRole="HEAVY_TORSO",
		silhouette="ANGLED_METAL_BREASTPLATE", palette=table.freeze({metal=c(111,119,124), metalLight=c(166,173,177), metalDark=c(65,70,73), accent=c(155,118,56)}),
	}),
	CLOTH_HOOD = table.freeze({
		id="CLOTH_HOOD", name="천 후드", familyRootId="GEAR_HOOD", family="CHARACTER", subfamily="HEAD_GEAR", gearRole="LIGHT_HEAD",
		silhouette="SOFT_HOOD_FACE_OPENING", palette=table.freeze({cloth=c(77,91,83), clothLight=c(111,127,113), trim=c(57,52,47)}),
	}),
	IRON_HELMET = table.freeze({
		id="IRON_HELMET", name="철 투구", familyRootId="GEAR_HELMET", family="CHARACTER", subfamily="HEAD_GEAR", gearRole="HEAVY_HEAD",
		silhouette="ROUND_CAP_BROW_GUARD", palette=table.freeze({metal=c(105,114,119), metalLight=c(167,174,178), metalDark=c(61,66,69), accent=c(153,116,55)}),
	}),
	LEATHER_GLOVES = table.freeze({
		id="LEATHER_GLOVES", name="가죽 장갑", familyRootId="GEAR_GLOVES", family="CHARACTER", subfamily="HAND_GEAR", gearRole="HAND",
		silhouette="PAIR_GAUNTLET_CUFF", palette=table.freeze({leather=c(91,62,45), leatherLight=c(133,91,59), trim=c(61,48,39), buckle=c(149,116,65)}),
	}),
	LEATHER_BOOTS = table.freeze({
		id="LEATHER_BOOTS", name="가죽 장화", familyRootId="GEAR_BOOTS", family="CHARACTER", subfamily="FOOT_GEAR", gearRole="FOOT",
		silhouette="PAIR_HIGH_BOOT_CUFF", palette=table.freeze({leather=c(82,58,43), leatherLight=c(123,84,56), sole=c(51,45,40), buckle=c(145,112,63)}),
	}),
	TRAVEL_CLOAK = table.freeze({
		id="TRAVEL_CLOAK", name="여행 망토", familyRootId="GEAR_CLOAK", family="CHARACTER", subfamily="BACK_GEAR", gearRole="BACK",
		silhouette="SHOULDER_MANTLE_TAPERED_CAPE", palette=table.freeze({cloth=c(75,89,78), clothLight=c(109,126,104), trim=c(56,51,45), clasp=c(168,133,68)}),
	}),
})

local function makePart(name,size,color,material,shape)
	local part=Instance.new("Part")
	part.Name=name
	part.Size=size
	part.Color=color
	part.Material=material or Enum.Material.SmoothPlastic
	part.TopSurface=Enum.SurfaceType.Smooth
	part.BottomSurface=Enum.SurfaceType.Smooth
	part.CanCollide=false
	part.CanTouch=false
	part.CanQuery=false
	part.CastShadow=true
	part.Massless=true
	if shape=="BALL" then
		part.Shape=Enum.PartType.Ball
	elseif shape=="CYLINDER" then
		part.Shape=Enum.PartType.Cylinder
	end
	return part
end

local function wedge(name,size,color,material)
	local part=Instance.new("WedgePart")
	part.Name=name
	part.Size=size
	part.Color=color
	part.Material=material or Enum.Material.SmoothPlastic
	part.TopSurface=Enum.SurfaceType.Smooth
	part.BottomSurface=Enum.SurfaceType.Smooth
	part.CanCollide=false
	part.CanTouch=false
	part.CanQuery=false
	part.CastShadow=true
	part.Massless=true
	return part
end

local function weld(root,part,localCFrame)
	part.CFrame=root.CFrame*localCFrame
	part.Parent=root.Parent
	local joint=Instance.new("WeldConstraint")
	joint.Name=part.Name.."_Weld"
	joint.Part0=root
	joint.Part1=part
	joint.Parent=part
	return part
end

local function rootFor(id)
	local model=Instance.new("Model")
	model.Name="CommonCharacterGear_"..id
	model:SetAttribute("StudioAssetId",id)
	model:SetAttribute("StudioAssetPack","roblox-common-character-gear-v1")
	model:SetAttribute("StudioAssetFamily","CHARACTER")
	model:SetAttribute("CompanyCommonBase",true)
	model:SetAttribute("CompatibleGameScope","ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_BODY_PLAN_AND_PLATFORM_MATCH")
	model:SetAttribute("ThemeAdaptationRequiredPerGame",true)
	model:SetAttribute("BodyPlanCompatibilityRequired",true)
	model:SetAttribute("SourceAssetLibrary","company-asset-library.json")
	model:SetAttribute("ProductionVerified",false)
	model:SetAttribute("GameplayAuthority",false)
	model:SetAttribute("VisualAnchorName","VisualAnchor")

	local root=makePart("VisualRoot",Vector3.new(0.28,0.28,0.28),c(255,255,255),Enum.Material.SmoothPlastic)
	root.Transparency=1
	root.CastShadow=false
	root.Massless=false
	root.Parent=model
	model.PrimaryPart=root

	local anchor=Instance.new("Attachment")
	anchor.Name="VisualAnchor"
	anchor.Parent=root
	return model,root
end

local function detail(level,needed)
	return level>=needed
end

local function rowWithPalette(row,override)
	if type(override)~="table" then return row end
	local palette={}
	for key,value in pairs(row.palette or {}) do palette[key]=value end
	for key,value in pairs(override) do
		if palette[key]~=nil and typeof(value)=="Color3" then palette[key]=value end
	end
	local clone={}
	for key,value in pairs(row) do clone[key]=value end
	clone.palette=table.freeze(palette)
	return table.freeze(clone)
end

local function addTunic(model,root,row,level)
	local p=row.palette
	weld(root,makePart("Torso",Vector3.new(2.35,2.55,1.12),p.cloth,Enum.Material.Fabric),CFrame.new(0,0,0))
	weld(root,makePart("WaistBand",Vector3.new(2.50,0.24,1.18),p.trim,Enum.Material.Fabric),CFrame.new(0,-1.0,0))
	if detail(level,2) then
		weld(root,makePart("Hem",Vector3.new(2.42,0.20,1.15),p.clothLight,Enum.Material.Fabric),CFrame.new(0,-1.30,0))
		weld(root,makePart("NeckTrim",Vector3.new(0.75,0.18,0.16),p.accent,Enum.Material.Fabric),CFrame.new(0,1.18,-0.58))
	end
	if detail(level,3) then
		for _,x in ipairs({-0.80,0.80}) do
			weld(root,makePart("Seam"..tostring(x),Vector3.new(0.08,1.85,0.05),p.clothLight,Enum.Material.Fabric),CFrame.new(x,0,-0.58))
		end
	end
end

local function addVest(model,root,row,level)
	local p=row.palette
	weld(root,makePart("VestBody",Vector3.new(2.48,2.42,1.18),p.leather,Enum.Material.Fabric),CFrame.new(0,0,0))
	weld(root,makePart("CenterGap",Vector3.new(0.20,2.06,0.10),p.trim,Enum.Material.Fabric),CFrame.new(0,0,-0.62))
	if detail(level,2) then
		for _,x in ipairs({-0.72,0.72}) do
			weld(root,makePart("Panel"..tostring(x),Vector3.new(0.52,1.85,0.08),p.leatherLight,Enum.Material.Fabric),CFrame.new(x,0,-0.64))
		end
	end
	if detail(level,3) then
		for _,y in ipairs({-0.50,0.30}) do
			weld(root,makePart("Buckle"..tostring(y),Vector3.new(0.35,0.18,0.12),p.buckle,Enum.Material.Metal),CFrame.new(0,y,-0.72))
		end
	end
end

local function addChestplate(model,root,row,level)
	local p=row.palette
	weld(root,wedge("ChestLeft",Vector3.new(1.25,2.45,1.28),p.metal,Enum.Material.Metal),CFrame.new(-0.56,0,0)*CFrame.Angles(0,math.rad(180),0))
	weld(root,wedge("ChestRight",Vector3.new(1.25,2.45,1.28),p.metal,Enum.Material.Metal),CFrame.new(0.56,0,0))
	weld(root,makePart("CenterRidge",Vector3.new(0.18,2.30,0.14),p.metalLight,Enum.Material.Metal),CFrame.new(0,0,-0.68))
	if detail(level,2) then
		weld(root,makePart("LowerBand",Vector3.new(2.48,0.28,1.25),p.metalDark,Enum.Material.Metal),CFrame.new(0,-1.10,0))
		weld(root,makePart("Collar",Vector3.new(1.15,0.28,1.18),p.accent,Enum.Material.Metal),CFrame.new(0,1.12,0))
	end
	if detail(level,3) then
		for _,x in ipairs({-1.02,1.02}) do
			weld(root,makePart("Rivet"..tostring(x),Vector3.new(0.15,0.15,0.12),p.metalLight,Enum.Material.Metal,"BALL"),CFrame.new(x,0.72,-0.68))
		end
	end
end

local function addHood(model,root,row,level)
	local p=row.palette
	weld(root,makePart("HoodShell",Vector3.new(2.25,2.15,2.10),p.cloth,Enum.Material.Fabric,"BALL"),CFrame.new(0,0.18,0))
	weld(root,makePart("FaceOpening",Vector3.new(1.25,1.50,0.20),p.trim,Enum.Material.Fabric),CFrame.new(0,0.08,-1.04))
	if detail(level,2) then
		weld(root,makePart("ShoulderDrape",Vector3.new(2.85,0.48,2.10),p.clothLight,Enum.Material.Fabric),CFrame.new(0,-1.05,0.08))
	end
	if detail(level,3) then
		for _,x in ipairs({-0.28,0.28}) do
			weld(root,makePart("Tie"..tostring(x),Vector3.new(0.08,0.72,0.08),p.trim,Enum.Material.Fabric,"CYLINDER"),CFrame.new(x,-0.75,-0.98))
		end
	end
end

local function addHelmet(model,root,row,level)
	local p=row.palette
	local dome=weld(root,makePart("HelmetDome",Vector3.new(2.20,1.72,2.20),p.metal,Enum.Material.Metal,"BALL"),CFrame.new(0,0.30,0))
	dome:SetAttribute("MaterialVariantRole","METAL_ARMOR")
	weld(root,makePart("BrowGuard",Vector3.new(2.28,0.30,0.42),p.metalDark,Enum.Material.Metal),CFrame.new(0,-0.10,-0.98))
	if detail(level,2) then
		weld(root,makePart("TopRidge",Vector3.new(0.22,1.20,0.30),p.metalLight,Enum.Material.Metal),CFrame.new(0,1.02,0))
		for _,x in ipairs({-1.00,1.00}) do
			weld(root,makePart("EarGuard"..tostring(x),Vector3.new(0.32,0.82,0.62),p.metal,Enum.Material.Metal),CFrame.new(x,-0.25,0))
		end
	end
	if detail(level,3) then
		weld(root,makePart("ForeheadAccent",Vector3.new(0.55,0.28,0.14),p.accent,Enum.Material.Metal),CFrame.new(0,0.45,-1.02))
	end
end

local function addGloves(model,root,row,level)
	local p=row.palette
	for _,side in ipairs({-1,1}) do
		local x=side*0.72
		weld(root,makePart("Glove"..side,Vector3.new(0.62,1.05,0.72),p.leather,Enum.Material.Fabric),CFrame.new(x,0,0))
		weld(root,makePart("Cuff"..side,Vector3.new(0.82,0.28,0.82),p.trim,Enum.Material.Fabric),CFrame.new(x,0.58,0))
		if detail(level,2) then
			weld(root,makePart("Knuckle"..side,Vector3.new(0.52,0.20,0.18),p.leatherLight,Enum.Material.Fabric),CFrame.new(x,-0.18,-0.42))
		end
		if detail(level,3) then
			weld(root,makePart("Buckle"..side,Vector3.new(0.24,0.18,0.12),p.buckle,Enum.Material.Metal),CFrame.new(x,0.58,-0.44))
		end
	end
end

local function addBoots(model,root,row,level)
	local p=row.palette
	for _,side in ipairs({-1,1}) do
		local x=side*0.68
		weld(root,makePart("BootLeg"..side,Vector3.new(0.78,1.72,0.86),p.leather,Enum.Material.Fabric),CFrame.new(x,0.40,0))
		weld(root,makePart("BootFoot"..side,Vector3.new(0.86,0.68,1.28),p.leatherLight,Enum.Material.Fabric),CFrame.new(x,-0.55,-0.22))
		weld(root,makePart("Sole"..side,Vector3.new(0.90,0.16,1.34),p.sole,Enum.Material.SmoothPlastic),CFrame.new(x,-0.94,-0.22))
		if detail(level,2) then
			weld(root,makePart("Cuff"..side,Vector3.new(0.92,0.28,0.92),p.leatherLight,Enum.Material.Fabric),CFrame.new(x,1.20,0))
		end
		if detail(level,3) then
			weld(root,makePart("Buckle"..side,Vector3.new(0.26,0.18,0.12),p.buckle,Enum.Material.Metal),CFrame.new(x,0.42,-0.48))
		end
	end
end

local function addCloak(model,root,row,level)
	local p=row.palette
	weld(root,wedge("CapeLeft",Vector3.new(1.45,3.65,0.32),p.cloth,Enum.Material.Fabric),CFrame.new(-0.62,-0.45,0.32)*CFrame.Angles(0,math.rad(180),math.rad(-4)))
	weld(root,wedge("CapeRight",Vector3.new(1.45,3.65,0.32),p.cloth,Enum.Material.Fabric),CFrame.new(0.62,-0.45,0.32)*CFrame.Angles(0,0,math.rad(4)))
	weld(root,makePart("Mantle",Vector3.new(2.65,0.62,0.72),p.clothLight,Enum.Material.Fabric),CFrame.new(0,1.25,0.08))
	if detail(level,2) then
		weld(root,makePart("Clasp",Vector3.new(0.38,0.38,0.22),p.clasp,Enum.Material.Metal,"BALL"),CFrame.new(0,1.22,-0.38))
	end
	if detail(level,3) then
		for _,x in ipairs({-0.45,0.45}) do
			weld(root,makePart("HemLine"..tostring(x),Vector3.new(0.08,2.72,0.05),p.trim,Enum.Material.Fabric),CFrame.new(x,-0.55,0.16)*CFrame.Angles(0,0,math.rad(x<0 and -5 or 5)))
		end
	end
end

local BUILDERS=table.freeze({
	CLOTH_TUNIC=addTunic,
	LEATHER_VEST=addVest,
	IRON_CHESTPLATE=addChestplate,
	CLOTH_HOOD=addHood,
	IRON_HELMET=addHelmet,
	LEATHER_GLOVES=addGloves,
	LEATHER_BOOTS=addBoots,
	TRAVEL_CLOAK=addCloak,
})

local function applyModelMetadata(model,row,quality)
	model:SetAttribute("StudioAssetFamilyRootId",row.familyRootId)
	model:SetAttribute("StudioAssetSubfamily",row.subfamily)
	model:SetAttribute("StudioAssetGearRole",row.gearRole)
	model:SetAttribute("StudioAssetSilhouette",row.silhouette)
	model:SetAttribute("StudioAssetQualityLevel",quality)
	model:SetAttribute("StudioAssetQualityTarget",100)
	model:SetAttribute("RuntimeVerificationState","PENDING_STUDIO")
end

function RobloxCommonCharacterGear.List()
	local result={}
	for id,row in pairs(Catalog) do
		table.insert(result,table.freeze({
			id=id,name=row.name,familyRootId=row.familyRootId,family=row.family,subfamily=row.subfamily,
			gearRole=row.gearRole,silhouette=row.silhouette,productionVerified=false,
		}))
	end
	table.sort(result,function(a,b) return a.id<b.id end)
	return table.freeze(result)
end

function RobloxCommonCharacterGear.Describe(id)
	local row=Catalog[string.upper(tostring(id or ""))]
	assert(row,"UNKNOWN_COMMON_CHARACTER_GEAR: "..tostring(id))
	return row
end

function RobloxCommonCharacterGear.Create(id,options)
	options=options or {}
	local key=string.upper(tostring(id or ""))
	local row=Catalog[key]
	local builder=BUILDERS[key]
	assert(row and builder,"UNKNOWN_COMMON_CHARACTER_GEAR: "..tostring(id))
	local quality=string.lower(tostring(options.quality or "mid"))
	local level=QUALITY_LEVEL[quality]
	assert(level,"INVALID_COMMON_CHARACTER_GEAR_QUALITY: "..tostring(quality))
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

function RobloxCommonCharacterGear.CreateViewport(id,options)
	options=options or {}
	local frame=Instance.new("ViewportFrame")
	frame.Name="CommonCharacterGearViewport_"..string.upper(tostring(id or ""))
	frame.BackgroundTransparency=options.backgroundTransparency==nil and 1 or options.backgroundTransparency
	frame.Ambient=options.ambient or c(108,110,112)
	frame.LightColor=options.lightColor or c(255,239,218)
	frame.LightDirection=options.lightDirection or Vector3.new(-1,-1,-1)
	frame.Size=options.size or UDim2.fromScale(1,1)
	local world=Instance.new("WorldModel")
	world.Name="CommonCharacterGearWorld"
	world.Parent=frame
	local model=RobloxCommonCharacterGear.Create(id,{
		quality=options.quality or "near",
		palette=options.palette,
		anchored=true,
		parent=world,
	})
	local camera=Instance.new("Camera")
	camera.Name="CommonCharacterGearCamera"
	camera.FieldOfView=tonumber(options.fieldOfView) or 34
	camera.Parent=frame
	frame.CurrentCamera=camera
	local boxCf,boxSize=model:GetBoundingBox()
	local radius=math.max(boxSize.X,boxSize.Y,boxSize.Z)
	local distance=math.max(4.8,radius*1.65)
	camera.CFrame=CFrame.new(boxCf.Position+Vector3.new(distance*0.72,distance*0.40,distance),boxCf.Position)
	frame.Parent=options.parent
	return frame
end

return table.freeze(RobloxCommonCharacterGear)
