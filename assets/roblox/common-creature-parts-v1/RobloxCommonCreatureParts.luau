-- 파일명: assets/roblox/common-creature-parts-v1/RobloxCommonCreatureParts.luau
-- 역할: 여러 Roblox 게임에서 재사용하는 회사 공용 생물/몬스터 외형 모듈 8종 생성
-- 원칙: 순수 표현 자산만 제공한다. AI/체력/데미지/이동/히트박스/드랍/세이브/네트워크 권한은 소유하지 않는다.

local RobloxCommonCreatureParts = {}

local QUALITY_LEVEL = table.freeze({far=1,mid=2,near=3})

local function c(r,g,b)
	return Color3.fromRGB(r,g,b)
end

local Catalog=table.freeze({
	BIPED_TORSO=table.freeze({
		id="BIPED_TORSO",name="이족형 몸통",familyRootId="CREATURE_BIPED_TORSO",family="CREATURE",subfamily="TORSO_BIPED",creatureRole="BODY_CORE",
		silhouette="BROAD_SHOULDER_TAPERED_TORSO",palette=table.freeze({body=c(104,108,101),light=c(139,143,133),dark=c(63,66,62),accent=c(128,91,61)}),
	}),
	QUADRUPED_TORSO=table.freeze({
		id="QUADRUPED_TORSO",name="사족형 몸통",familyRootId="CREATURE_QUADRUPED_TORSO",family="CREATURE",subfamily="TORSO_QUADRUPED",creatureRole="BODY_CORE",
		silhouette="LONG_BACK_DEEP_CHEST",palette=table.freeze({body=c(105,91,76),light=c(139,122,99),dark=c(66,57,50),accent=c(122,104,76)}),
	}),
	INSECT_THORAX=table.freeze({
		id="INSECT_THORAX",name="곤충 흉부",familyRootId="CREATURE_INSECT_THORAX",family="CREATURE",subfamily="THORAX_INSECT",creatureRole="BODY_CORE",
		silhouette="SEGMENTED_THORAX_ABDOMEN",palette=table.freeze({shell=c(70,91,72),shellLight=c(104,128,95),shellDark=c(43,56,46),accent=c(143,116,61)}),
	}),
	WING_PAIR=table.freeze({
		id="WING_PAIR",name="날개 한 쌍",familyRootId="CREATURE_WINGS",family="CREATURE",subfamily="WING_PAIR",creatureRole="APPENDAGE",
		silhouette="TAPERED_SYMMETRIC_WINGS",palette=table.freeze({membrane=c(153,187,188),edge=c(74,92,91),accent=c(195,215,205)}),
	}),
	TAIL_LONG=table.freeze({
		id="TAIL_LONG",name="긴 꼬리",familyRootId="CREATURE_TAIL",family="CREATURE",subfamily="TAIL_LONG",creatureRole="APPENDAGE",
		silhouette="TAPERED_SEGMENTED_TAIL",palette=table.freeze({body=c(100,94,81),light=c(135,127,108),dark=c(60,57,51)}),
	}),
	HORN_PAIR=table.freeze({
		id="HORN_PAIR",name="뿔 한 쌍",familyRootId="CREATURE_HORNS",family="CREATURE",subfamily="HORN_PAIR",creatureRole="HEAD_APPENDAGE",
		silhouette="CURVED_TWIN_HORNS",palette=table.freeze({horn=c(137,128,106),light=c(181,171,145),dark=c(82,77,66)}),
	}),
	SHELL_BACK=table.freeze({
		id="SHELL_BACK",name="등껍질",familyRootId="CREATURE_SHELL",family="CREATURE",subfamily="SHELL_BACK",creatureRole="BACK_ARMOR_VISUAL",
		silhouette="DOMED_SEGMENTED_CARAPACE",palette=table.freeze({shell=c(77,91,71),shellLight=c(111,127,92),shellDark=c(47,57,46),ridge=c(151,125,72)}),
	}),
	TENTACLE_CLUSTER=table.freeze({
		id="TENTACLE_CLUSTER",name="촉수 군락",familyRootId="CREATURE_TENTACLE",family="CREATURE",subfamily="TENTACLE_CLUSTER",creatureRole="APPENDAGE",
		silhouette="RADIAL_TAPERED_TENTACLES",palette=table.freeze({body=c(109,77,104),light=c(151,104,143),dark=c(66,48,67),sucker=c(190,143,164)}),
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
	if shape=="BALL" then part.Shape=Enum.PartType.Ball elseif shape=="CYLINDER" then part.Shape=Enum.PartType.Cylinder end
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
	model.Name="CommonCreaturePart_"..id
	model:SetAttribute("StudioAssetId",id)
	model:SetAttribute("StudioAssetPack","roblox-common-creature-parts-v1")
	model:SetAttribute("StudioAssetFamily","CREATURE")
	model:SetAttribute("CompanyCommonBase",true)
	model:SetAttribute("BodyPlanCompatibilityRequired",true)
	model:SetAttribute("CompatibleGameScope","ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_BODY_PLAN_AND_PLATFORM_MATCH")
	model:SetAttribute("ThemeAdaptationRequiredPerGame",true)
	model:SetAttribute("SourceAssetLibrary","company-asset-library.json")
	model:SetAttribute("ProductionVerified",false)
	model:SetAttribute("GameplayAuthority",false)
	model:SetAttribute("RigBindingState","AUTHORING_REQUIRED")
	local root=makePart("VisualRoot",Vector3.new(0.28,0.28,0.28),c(255,255,255),Enum.Material.SmoothPlastic)
	root.Transparency=1
	root.CastShadow=false
	root.Massless=false
	root.Parent=model
	model.PrimaryPart=root
	local anchor=Instance.new("Attachment")
	anchor.Name="CreatureVisualAnchor"
	anchor.Parent=root
	return model,root
end

local function detail(level,needed) return level>=needed end

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

local function addBipedTorso(model,root,row,level)
	local p=row.palette
	weld(root,wedge("TorsoLeft",Vector3.new(1.45,2.45,1.10),p.body,Enum.Material.SmoothPlastic),CFrame.new(-0.62,0,0)*CFrame.Angles(0,math.rad(180),0))
	weld(root,wedge("TorsoRight",Vector3.new(1.45,2.45,1.10),p.body,Enum.Material.SmoothPlastic),CFrame.new(0.62,0,0))
	weld(root,makePart("ShoulderBar",Vector3.new(3.0,0.48,1.16),p.light,Enum.Material.SmoothPlastic),CFrame.new(0,1.0,0))
	if detail(level,2) then weld(root,makePart("ChestRidge",Vector3.new(0.20,1.75,0.16),p.accent,Enum.Material.SmoothPlastic),CFrame.new(0,0.15,-0.61)) end
	if detail(level,3) then weld(root,makePart("Abdomen",Vector3.new(1.75,0.72,1.0),p.dark,Enum.Material.SmoothPlastic),CFrame.new(0,-1.25,0)) end
end

local function addQuadrupedTorso(model,root,row,level)
	local p=row.palette
	weld(root,makePart("Body",Vector3.new(3.9,1.75,1.65),p.body,Enum.Material.SmoothPlastic),CFrame.new(0,0.35,0))
	weld(root,makePart("Chest",Vector3.new(1.65,2.10,1.82),p.light,Enum.Material.SmoothPlastic),CFrame.new(-1.30,0.20,0))
	if detail(level,2) then weld(root,makePart("BackRidge",Vector3.new(2.75,0.24,0.45),p.accent,Enum.Material.SmoothPlastic),CFrame.new(0.25,1.28,0)) end
	if detail(level,3) then weld(root,makePart("Belly",Vector3.new(2.55,0.42,1.28),p.dark,Enum.Material.SmoothPlastic),CFrame.new(0.30,-0.68,0)) end
end

local function addInsectThorax(model,root,row,level)
	local p=row.palette
	weld(root,makePart("Thorax",Vector3.new(1.75,1.55,1.55),p.shell,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(-0.55,0,0))
	weld(root,makePart("Abdomen",Vector3.new(2.35,1.62,1.48),p.shellDark,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(1.15,0,0))
	if detail(level,2) then weld(root,makePart("ThoraxPlate",Vector3.new(0.75,1.10,1.60),p.shellLight,Enum.Material.SmoothPlastic),CFrame.new(-0.65,0,-0.18)) end
	if detail(level,3) then
		for _,x in ipairs({0.45,1.10,1.70}) do weld(root,makePart("AbdomenBand"..tostring(x),Vector3.new(0.12,1.25,1.38),p.accent,Enum.Material.SmoothPlastic),CFrame.new(x,0,0)) end
	end
end

local function addWings(model,root,row,level)
	local p=row.palette
	for _,side in ipairs({-1,1}) do
		local wing=weld(root,wedge("Wing"..side,Vector3.new(2.45,3.25,0.18),p.membrane,Enum.Material.Glass),CFrame.new(side*1.15,0.35,0)*CFrame.Angles(0,0,math.rad(side*28)))
		wing.Transparency=0.35
		weld(root,makePart("WingEdge"..side,Vector3.new(0.12,2.70,0.12),p.edge,Enum.Material.SmoothPlastic),CFrame.new(side*1.65,0.35,0)*CFrame.Angles(0,0,math.rad(side*28)))
		if detail(level,2) then weld(root,makePart("WingVein"..side,Vector3.new(0.08,2.10,0.08),p.accent,Enum.Material.SmoothPlastic),CFrame.new(side*1.05,0.20,-0.12)*CFrame.Angles(0,0,math.rad(side*12))) end
	end
	if detail(level,3) then weld(root,makePart("WingRoot",Vector3.new(1.20,0.48,0.45),p.edge,Enum.Material.SmoothPlastic),CFrame.new(0,-0.55,0)) end
end

local function addTail(model,root,row,level)
	local p=row.palette
	local count=level==1 and 4 or level==2 and 6 or 8
	for i=1,count do
		local t=(i-1)/(count-1)
		local size=0.78-(t*0.42)
		weld(root,makePart("TailSegment"..i,Vector3.new(size,0.75,size),i%2==0 and p.light or p.body,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(0,-t*1.2,t*3.25)*CFrame.Angles(math.rad(t*32),0,0))
	end
	if detail(level,3) then weld(root,wedge("TailTip",Vector3.new(0.42,0.85,0.42),p.dark,Enum.Material.SmoothPlastic),CFrame.new(0,-1.45,3.65)) end
end

local function addHorns(model,root,row,level)
	local p=row.palette
	for _,side in ipairs({-1,1}) do
		local segments=level==1 and 2 or level==2 and 3 or 4
		for i=1,segments do
			local t=i/segments
			local size=0.48-(t*0.18)
			weld(root,wedge("Horn"..side.."_"..i,Vector3.new(size,0.82,size),i%2==0 and p.light or p.horn,Enum.Material.SmoothPlastic),CFrame.new(side*(0.55+t*0.45),0.30+t*0.68,t*0.12)*CFrame.Angles(0,0,math.rad(side*(-18-12*t))))
		end
	end
	if detail(level,3) then
		for _,side in ipairs({-1,1}) do weld(root,makePart("HornBase"..side,Vector3.new(0.62,0.26,0.62),p.dark,Enum.Material.SmoothPlastic,"CYLINDER"),CFrame.new(side*0.58,0.18,0)) end
	end
end

local function addShell(model,root,row,level)
	local p=row.palette
	weld(root,makePart("ShellDome",Vector3.new(3.15,1.55,2.75),p.shell,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(0,0.35,0))
	if detail(level,2) then
		for _,x in ipairs({-0.9,0,0.9}) do weld(root,makePart("ShellBand"..tostring(x),Vector3.new(0.18,1.25,2.38),p.shellLight,Enum.Material.SmoothPlastic),CFrame.new(x,0.48,0)) end
	end
	if detail(level,3) then weld(root,makePart("ShellRidge",Vector3.new(2.20,0.18,0.22),p.ridge,Enum.Material.SmoothPlastic),CFrame.new(0,1.05,-0.25)) end
end

local function addTentacles(model,root,row,level)
	local p=row.palette
	local count=level==1 and 4 or level==2 and 6 or 8
	for i=1,count do
		local a=math.rad((i-1)*(360/count))
		for seg=1,3 do
			local r=0.25+seg*0.42
			local y=-seg*0.34
			local size=0.36-seg*0.05
			weld(root,makePart("Tentacle"..i.."_"..seg,Vector3.new(size,0.78,size),seg%2==0 and p.light or p.body,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(math.cos(a)*r,y,math.sin(a)*r))
		end
		if detail(level,3) then weld(root,makePart("Sucker"..i,Vector3.new(0.18,0.10,0.18),p.sucker,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(math.cos(a)*1.55,-1.15,math.sin(a)*1.55)) end
	end
	if detail(level,2) then weld(root,makePart("Core",Vector3.new(1.45,0.72,1.45),p.dark,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(0,0,0)) end
end

local BUILDERS=table.freeze({
	BIPED_TORSO=addBipedTorso,
	QUADRUPED_TORSO=addQuadrupedTorso,
	INSECT_THORAX=addInsectThorax,
	WING_PAIR=addWings,
	TAIL_LONG=addTail,
	HORN_PAIR=addHorns,
	SHELL_BACK=addShell,
	TENTACLE_CLUSTER=addTentacles,
})

local function applyModelMetadata(model,row,quality)
	model:SetAttribute("StudioAssetFamilyRootId",row.familyRootId)
	model:SetAttribute("StudioAssetSubfamily",row.subfamily)
	model:SetAttribute("StudioAssetCreatureRole",row.creatureRole)
	model:SetAttribute("StudioAssetSilhouette",row.silhouette)
	model:SetAttribute("StudioAssetQualityLevel",quality)
	model:SetAttribute("StudioAssetQualityTarget",100)
	model:SetAttribute("RuntimeVerificationState","PENDING_STUDIO")
end

function RobloxCommonCreatureParts.List()
	local result={}
	for id,row in pairs(Catalog) do
		table.insert(result,table.freeze({
			id=id,name=row.name,familyRootId=row.familyRootId,family=row.family,subfamily=row.subfamily,
			creatureRole=row.creatureRole,silhouette=row.silhouette,productionVerified=false,
		}))
	end
	table.sort(result,function(a,b) return a.id<b.id end)
	return table.freeze(result)
end

function RobloxCommonCreatureParts.Describe(id)
	local row=Catalog[string.upper(tostring(id or ""))]
	assert(row,"UNKNOWN_COMMON_CREATURE_PART: "..tostring(id))
	return row
end

function RobloxCommonCreatureParts.Create(id,options)
	options=options or {}
	local key=string.upper(tostring(id or ""))
	local row=Catalog[key]
	local builder=BUILDERS[key]
	assert(row and builder,"UNKNOWN_COMMON_CREATURE_PART: "..tostring(id))
	local quality=string.lower(tostring(options.quality or "mid"))
	local level=QUALITY_LEVEL[quality]
	assert(level,"INVALID_COMMON_CREATURE_PART_QUALITY: "..tostring(quality))
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

function RobloxCommonCreatureParts.CreateViewport(id,options)
	options=options or {}
	local frame=Instance.new("ViewportFrame")
	frame.Name="CommonCreaturePartViewport_"..string.upper(tostring(id or ""))
	frame.BackgroundTransparency=options.backgroundTransparency==nil and 1 or options.backgroundTransparency
	frame.Ambient=options.ambient or c(105,108,105)
	frame.LightColor=options.lightColor or c(246,238,214)
	frame.LightDirection=options.lightDirection or Vector3.new(-1,-1,-1)
	frame.Size=options.size or UDim2.fromScale(1,1)
	local world=Instance.new("WorldModel")
	world.Name="CommonCreaturePartWorld"
	world.Parent=frame
	local model=RobloxCommonCreatureParts.Create(id,{quality=options.quality or "near",palette=options.palette,anchored=true,parent=world})
	local camera=Instance.new("Camera")
	camera.Name="CommonCreaturePartCamera"
	camera.FieldOfView=tonumber(options.fieldOfView) or 36
	camera.Parent=frame
	frame.CurrentCamera=camera
	local boxCf,boxSize=model:GetBoundingBox()
	local radius=math.max(boxSize.X,boxSize.Y,boxSize.Z)
	local distance=math.max(5.0,radius*1.65)
	camera.CFrame=CFrame.new(boxCf.Position+Vector3.new(distance*0.75,distance*0.45,distance),boxCf.Position)
	frame.Parent=options.parent
	return frame
end

return table.freeze(RobloxCommonCreatureParts)
