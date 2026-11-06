-- 파일명: assets/roblox/common-tools-v1/RobloxCommonTools.luau
-- 역할: 여러 Roblox 게임에서 재사용하는 회사 공용 무기/도구 비주얼 20종 생성
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

	GREATSWORD = table.freeze({id="GREATSWORD",name="대검",familyRootId="TOOL_GREATSWORD",family="WEAPON",subfamily="TWO_HAND_BLADE",toolRole="HEAVY_MELEE",motionProfile="HEAVY_ATTACK_1",impactProfile="SLASH_HEAVY",trailProfile="TRAIL_WIDE",skillFamily="WEAPON_ARC",physicsFeel="HEAVY",silhouette="LONG_WIDE_TWO_HAND_BLADE",palette=table.freeze({metal=c(143,149,153),edge=c(217,222,224),dark=c(53,57,60),grip=c(78,56,44),accent=c(171,125,58)})}),
	DAGGER = table.freeze({id="DAGGER",name="단검",familyRootId="TOOL_DAGGER",family="WEAPON",subfamily="DAGGER",toolRole="FAST_MELEE",motionProfile="LIGHT_ATTACK_1",impactProfile="PIERCE_LIGHT",trailProfile="TRAIL_THIN",skillFamily="DASH_STRIKE",physicsFeel="LIGHT",silhouette="SHORT_TAPERED_BLADE",palette=table.freeze({metal=c(165,171,174),edge=c(228,231,231),dark=c(55,58,60),grip=c(79,54,43),accent=c(160,119,57)})}),
	MACE = table.freeze({id="MACE",name="철퇴",familyRootId="TOOL_MACE",family="WEAPON",subfamily="HAMMER_MACE",toolRole="BLUNT_MELEE",motionProfile="HEAVY_ATTACK_1",impactProfile="BLUNT_HEAVY",trailProfile="TRAIL_SHORT",skillFamily="GROUND_IMPACT",physicsFeel="HEAVY",silhouette="FLANGED_HEAD_SHORT_SHAFT",palette=table.freeze({metal=c(105,110,113),edge=c(163,169,171),shaft=c(84,62,47),accent=c(153,107,55)})}),
	CROSSBOW = table.freeze({id="CROSSBOW",name="석궁",familyRootId="TOOL_CROSSBOW",family="WEAPON",subfamily="CROSSBOW",toolRole="RANGED",motionProfile="RANGED_DRAW_SHOT",impactProfile="PIERCE_RANGED",trailProfile="PROJECTILE_STREAK",skillFamily="PROJECTILE",physicsFeel="MEDIUM",silhouette="HORIZONTAL_LIMBS_STOCK",palette=table.freeze({wood=c(104,72,48),woodLight=c(157,111,68),metal=c(113,120,122),string=c(212,202,179),accent=c(164,121,60)})}),
	DUAL_BLADES = table.freeze({id="DUAL_BLADES",name="쌍검",familyRootId="TOOL_DUAL_BLADES",family="WEAPON",subfamily="DUAL_WIELD_PAIR",toolRole="FAST_MELEE",motionProfile="LIGHT_ATTACK_1",impactProfile="SLASH_FAST",trailProfile="TRAIL_DOUBLE",skillFamily="DASH_STRIKE",physicsFeel="LIGHT",silhouette="TWIN_SHORT_CURVED_BLADES",palette=table.freeze({metal=c(157,165,169),edge=c(224,228,229),dark=c(50,54,56),grip=c(78,54,42),accent=c(174,128,61)})}),
	THROWING_KNIFE = table.freeze({id="THROWING_KNIFE",name="투척 단검",familyRootId="TOOL_THROWING_KNIFE",family="WEAPON",subfamily="THROWN",toolRole="THROWN",motionProfile="RANGED_DRAW_SHOT",impactProfile="PIERCE_LIGHT",trailProfile="PROJECTILE_STREAK",skillFamily="PROJECTILE",physicsFeel="LIGHT",silhouette="BALANCED_THROWING_BLADE",palette=table.freeze({metal=c(161,168,171),edge=c(225,229,230),dark=c(56,59,60),grip=c(86,62,46),accent=c(162,120,58)})}),
	GREAT_AXE = table.freeze({id="GREAT_AXE",name="대형 도끼",familyRootId="TOOL_GREAT_AXE",family="WEAPON",subfamily="GREAT_AXE",toolRole="HEAVY_MELEE",motionProfile="HEAVY_ATTACK_1",impactProfile="SLASH_HEAVY",trailProfile="TRAIL_WIDE",skillFamily="GROUND_IMPACT",physicsFeel="VERY_HEAVY",silhouette="TWO_HAND_DOUBLE_WEIGHT_AXE",palette=table.freeze({metal=c(112,119,122),edge=c(187,194,196),shaft=c(88,63,45),wrap=c(72,53,44),accent=c(149,99,47)})}),
	WARHAMMER = table.freeze({id="WARHAMMER",name="전투망치",familyRootId="TOOL_WARHAMMER",family="WEAPON",subfamily="WARHAMMER",toolRole="HEAVY_MELEE",motionProfile="HEAVY_ATTACK_1",impactProfile="BLUNT_CRUSH",trailProfile="TRAIL_SHORT",skillFamily="GROUND_IMPACT",physicsFeel="VERY_HEAVY",silhouette="MASSIVE_HEAD_TWO_HAND_HANDLE",palette=table.freeze({metal=c(94,100,103),edge=c(151,158,160),shaft=c(82,59,44),accent=c(143,94,44)})}),
	WAND = table.freeze({id="WAND",name="마법봉",familyRootId="TOOL_WAND",family="WEAPON",subfamily="MAGIC_FOCUS",toolRole="MAGIC_FOCUS",motionProfile="CAST_BURST",impactProfile="MAGIC_IMPACT",trailProfile="MAGIC_TRAIL",skillFamily="CAST_PROJECTILE",physicsFeel="ENERGY",silhouette="SHORT_FOCUS_CRYSTAL_TIP",palette=table.freeze({wood=c(78,57,45),woodLight=c(120,86,57),crystal=c(121,186,240),glow=c(176,229,255),metal=c(90,95,98)})}),
	SCYTHE = table.freeze({id="SCYTHE",name="낫",familyRootId="TOOL_SCYTHE",family="WEAPON",subfamily="SCYTHE",toolRole="POLEARM",motionProfile="HEAVY_ATTACK_1",impactProfile="SLASH_ARC",trailProfile="TRAIL_WIDE",skillFamily="WEAPON_ARC",physicsFeel="MEDIUM_HEAVY",silhouette="LONG_SHAFT_CURVED_BLADE",palette=table.freeze({metal=c(130,136,140),edge=c(207,212,214),shaft=c(82,61,47),wrap=c(69,51,43),accent=c(150,106,54)})}),
	CLUB = table.freeze({id="CLUB",name="곤봉",familyRootId="TOOL_CLUB",family="WEAPON",subfamily="CLUB",toolRole="BLUNT_MELEE",motionProfile="LIGHT_ATTACK_1",impactProfile="BLUNT_MEDIUM",trailProfile="TRAIL_SHORT",skillFamily="STAGGER_STRIKE",physicsFeel="MEDIUM",silhouette="THICK_TAPERED_CLUB",palette=table.freeze({wood=c(101,72,48),woodLight=c(151,108,67),dark=c(65,49,40),accent=c(130,91,48)})}),
	JAVELIN = table.freeze({id="JAVELIN",name="투창",familyRootId="TOOL_JAVELIN",family="WEAPON",subfamily="THROWN",toolRole="POLEARM_THROWN",motionProfile="RANGED_DRAW_SHOT",impactProfile="PIERCE_HEAVY",trailProfile="PROJECTILE_STREAK",skillFamily="PROJECTILE",physicsFeel="MEDIUM",silhouette="LIGHT_SPEAR_THROWING_SHAFT",palette=table.freeze({metal=c(151,160,163),edge=c(214,220,221),shaft=c(96,69,47),wrap=c(76,57,46)})}),
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


local function addExtendedWeapon(model,root,row,level)
	local p=row.palette
	local id=row.id
	if id=="GREATSWORD" then
		weld(root,makePart("Grip",Vector3.new(0.42,2.0,0.42),p.grip,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,-1.5,0))
		weld(root,makePart("Guard",Vector3.new(2.6,0.28,0.38),p.accent,Enum.Material.Metal),CFrame.new(0,-0.35,0))
		weld(root,makePart("Blade",Vector3.new(0.82,4.8,0.26),p.metal,Enum.Material.Metal),CFrame.new(0,2.2,0))
		weld(root,wedge("Tip",Vector3.new(0.82,1.15,0.26),p.edge,Enum.Material.Metal),CFrame.new(0,5.18,0))
	elseif id=="DAGGER" or id=="THROWING_KNIFE" then
		local gripColor=p.grip or p.dark
		weld(root,makePart("Grip",Vector3.new(0.28,0.95,0.28),gripColor,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,-0.58,0))
		weld(root,makePart("Guard",Vector3.new(0.95,0.16,0.24),p.accent or p.dark,Enum.Material.Metal),CFrame.new(0,-0.05,0))
		weld(root,wedge("Blade",Vector3.new(0.42,2.0,0.18),p.metal,Enum.Material.Metal),CFrame.new(0,1.05,0))
	elseif id=="MACE" then
		weld(root,makePart("Handle",Vector3.new(0.34,3.15,0.34),p.shaft,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,-0.25,0))
		weld(root,makePart("Head",Vector3.new(1.35,1.35,1.35),p.metal,Enum.Material.Metal,"BALL"),CFrame.new(0,1.75,0))
		if detail(level,2) then for i=0,5 do local a=math.rad(i*60); weld(root,wedge("Flange"..i,Vector3.new(0.35,0.82,0.18),p.edge,Enum.Material.Metal),CFrame.new(math.cos(a)*0.78,1.75,math.sin(a)*0.78)*CFrame.Angles(0,-a,0)) end end
	elseif id=="CROSSBOW" then
		weld(root,makePart("Stock",Vector3.new(0.55,0.55,3.7),p.wood,Enum.Material.WoodPlanks),CFrame.new(0,0,0.35))
		weld(root,makePart("Limb",Vector3.new(4.0,0.24,0.35),p.woodLight,Enum.Material.WoodPlanks),CFrame.new(0,0,-1.15))
		weld(root,makePart("String",Vector3.new(3.9,0.05,0.05),p.string,Enum.Material.Fabric),CFrame.new(0,0,-0.85))
		weld(root,makePart("Rail",Vector3.new(0.12,0.18,3.2),p.metal,Enum.Material.Metal),CFrame.new(0,0,-0.10))
	elseif id=="DUAL_BLADES" then
		for _,x in ipairs({-0.42,0.42}) do
			weld(root,makePart("Grip"..x,Vector3.new(0.24,0.95,0.24),p.grip,Enum.Material.Wood,"CYLINDER"),CFrame.new(x,-0.72,0))
			weld(root,wedge("Blade"..x,Vector3.new(0.38,2.3,0.18),p.metal,Enum.Material.Metal),CFrame.new(x,0.95,0)*CFrame.Angles(0,0,math.rad(x<0 and -5 or 5)))
		end
	elseif id=="GREAT_AXE" or id=="WARHAMMER" then
		local shaft=p.shaft
		weld(root,makePart("Handle",Vector3.new(0.42,5.2,0.42),shaft,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,-0.25,0))
		if id=="GREAT_AXE" then
			weld(root,wedge("HeadA",Vector3.new(2.15,1.95,0.55),p.metal,Enum.Material.Metal),CFrame.new(0.75,2.15,0)*CFrame.Angles(0,0,math.rad(-90)))
			weld(root,wedge("HeadB",Vector3.new(1.45,1.55,0.48),p.edge,Enum.Material.Metal),CFrame.new(-0.65,2.15,0)*CFrame.Angles(0,math.rad(180),math.rad(-90)))
		else
			weld(root,makePart("Head",Vector3.new(2.85,1.45,1.45),p.metal,Enum.Material.Metal),CFrame.new(0,2.1,0))
			if detail(level,2) then weld(root,makePart("Face",Vector3.new(0.22,1.60,1.60),p.edge,Enum.Material.Metal),CFrame.new(1.55,2.1,0)) end
		end
	elseif id=="WAND" then
		weld(root,makePart("Shaft",Vector3.new(0.24,2.7,0.24),p.wood,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,0,0))
		local gem=weld(root,wedge("Focus",Vector3.new(0.52,0.85,0.52),p.crystal,Enum.Material.Neon),CFrame.new(0,1.75,0))
		gem.Transparency=0.08
		if detail(level,2) then weld(root,makePart("Glow",Vector3.new(0.30,0.30,0.30),p.glow,Enum.Material.Neon,"BALL"),CFrame.new(0,1.82,0)) end
	elseif id=="SCYTHE" then
		weld(root,makePart("Shaft",Vector3.new(0.34,5.5,0.34),p.shaft,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,-0.15,0))
		weld(root,wedge("Blade",Vector3.new(2.5,1.2,0.34),p.metal,Enum.Material.Metal),CFrame.new(0.95,2.1,0)*CFrame.Angles(0,0,math.rad(-72)))
	elseif id=="CLUB" then
		weld(root,makePart("Body",Vector3.new(0.75,3.7,0.75),p.wood,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,0.2,0))
		weld(root,makePart("Head",Vector3.new(1.05,1.45,1.05),p.woodLight,Enum.Material.Wood,"BALL"),CFrame.new(0,1.95,0))
	elseif id=="JAVELIN" then
		weld(root,makePart("Shaft",Vector3.new(0.24,4.8,0.24),p.shaft,Enum.Material.Wood,"CYLINDER"),CFrame.new(0,0,0))
		weld(root,wedge("Head",Vector3.new(0.56,1.12,0.20),p.metal,Enum.Material.Metal),CFrame.new(0,3.0,0))
	end
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
	GREATSWORD=addExtendedWeapon,
	DAGGER=addExtendedWeapon,
	MACE=addExtendedWeapon,
	CROSSBOW=addExtendedWeapon,
	DUAL_BLADES=addExtendedWeapon,
	THROWING_KNIFE=addExtendedWeapon,
	GREAT_AXE=addExtendedWeapon,
	WARHAMMER=addExtendedWeapon,
	WAND=addExtendedWeapon,
	SCYTHE=addExtendedWeapon,
	CLUB=addExtendedWeapon,
	JAVELIN=addExtendedWeapon,
})

local function applyModelMetadata(model,row,quality)
	model:SetAttribute("StudioAssetFamilyRootId",row.familyRootId)
	model:SetAttribute("StudioAssetSubfamily",row.subfamily)
	model:SetAttribute("StudioAssetToolRole",row.toolRole)
	model:SetAttribute("CombatMotionProfile",row.motionProfile or "GAME_DEFINED")
	model:SetAttribute("CombatImpactProfile",row.impactProfile or "GAME_DEFINED")
	model:SetAttribute("CombatTrailProfile",row.trailProfile or "GAME_DEFINED")
	model:SetAttribute("CombatSkillFamily",row.skillFamily or "GAME_DEFINED")
	model:SetAttribute("CombatPhysicsFeel",row.physicsFeel or "GAME_DEFINED")
	model:SetAttribute("OwnsDamageAuthority",false)
	model:SetAttribute("OwnsHitboxAuthority",false)
	model:SetAttribute("OwnsPhysicsImpulseAuthority",false)
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
