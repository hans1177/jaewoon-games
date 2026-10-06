-- 파일명: assets/roblox/common-creature-parts-v1/RobloxCommonCreatureParts.luau
-- 역할: 여러 Roblox 게임에서 재사용하는 회사 공용 생물/몬스터 외형 모듈 25종 생성
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

	ARACHNID_CORE=table.freeze({id="ARACHNID_CORE",name="거미형 코어",familyRootId="CREATURE_ARACHNID",family="CREATURE",subfamily="ARACHNID_CORE",creatureRole="BODY_CORE",bodyPlan="ARACHNID",ecologyRole="AMBUSH_PREDATOR",silhouette="LOW_CEPHALOTHORAX_ROUND_ABDOMEN",palette=table.freeze({body=c(64,58,55),light=c(94,84,75),dark=c(38,35,34),accent=c(149,89,64)})}),
	SERPENT_BODY=table.freeze({id="SERPENT_BODY",name="뱀형 몸체",familyRootId="CREATURE_SERPENT",family="CREATURE",subfamily="SERPENT_BODY",creatureRole="BODY_CORE",bodyPlan="SERPENT",ecologyRole="AMBUSH_PREDATOR",silhouette="LONG_SEGMENTED_SERPENT_BODY",palette=table.freeze({body=c(76,91,66),light=c(112,129,88),dark=c(44,54,41),accent=c(160,132,73)})}),
	AQUATIC_BODY=table.freeze({id="AQUATIC_BODY",name="수생형 몸체",familyRootId="CREATURE_AQUATIC",family="CREATURE",subfamily="AQUATIC_BODY",creatureRole="BODY_CORE",bodyPlan="AQUATIC",ecologyRole="AQUATIC_PREDATOR_OR_PREY",silhouette="STREAMLINED_TORPEDO_BODY",palette=table.freeze({body=c(61,101,117),light=c(100,148,160),dark=c(34,62,72),accent=c(155,181,152)})}),
	FLYING_BODY=table.freeze({id="FLYING_BODY",name="비행형 몸체",familyRootId="CREATURE_FLYING",family="CREATURE",subfamily="FLYING_BODY",creatureRole="BODY_CORE",bodyPlan="FLYING",ecologyRole="FLYING_PREDATOR_OR_SCAVENGER",silhouette="LIGHT_KEELED_TORSO",palette=table.freeze({body=c(93,83,72),light=c(135,121,103),dark=c(52,48,44),accent=c(165,139,82)})}),
	GOLEM_CORE=table.freeze({id="GOLEM_CORE",name="골렘 코어",familyRootId="CREATURE_GOLEM",family="CREATURE",subfamily="GOLEM_CORE",creatureRole="BODY_CORE",bodyPlan="GOLEM",ecologyRole="CONSTRUCT_GUARDIAN",silhouette="BLOCKY_STONE_CORE_SHOULDERS",palette=table.freeze({body=c(102,102,96),light=c(142,140,129),dark=c(61,63,61),accent=c(103,182,194)})}),
	GIANT_TORSO=table.freeze({id="GIANT_TORSO",name="거대형 몸통",familyRootId="CREATURE_GIANT",family="CREATURE",subfamily="GIANT_TORSO",creatureRole="BODY_CORE",bodyPlan="GIANT",ecologyRole="GIANT_OR_BOSS",silhouette="MASSIVE_BROAD_TORSO",palette=table.freeze({body=c(116,92,75),light=c(157,128,101),dark=c(67,52,45),accent=c(150,101,62)})}),
	HUMANOID_RAIDER_TORSO=table.freeze({id="HUMANOID_RAIDER_TORSO",name="인간형 약탈자 몸통",familyRootId="CREATURE_HUMANOID",family="CREATURE",subfamily="HUMANOID_RAIDER_TORSO",creatureRole="BODY_CORE",bodyPlan="HUMANOID",ecologyRole="HUMANOID_FACTION",silhouette="ARMORED_BIPED_TORSO",palette=table.freeze({body=c(104,92,82),light=c(139,122,105),dark=c(58,53,49),accent=c(155,115,63)})}),
	UNDEAD_TORSO=table.freeze({id="UNDEAD_TORSO",name="언데드 몸통",familyRootId="CREATURE_UNDEAD",family="CREATURE",subfamily="UNDEAD_TORSO",creatureRole="BODY_CORE",bodyPlan="UNDEAD",ecologyRole="UNDEAD",silhouette="GAUNT_RIBCAGE_TORSO",palette=table.freeze({body=c(117,111,94),light=c(159,151,126),dark=c(65,63,57),accent=c(91,132,115)})}),
	PREDATOR_HEAD=table.freeze({id="PREDATOR_HEAD",name="포식자 머리",familyRootId="CREATURE_HEAD",family="CREATURE",subfamily="PREDATOR_HEAD",creatureRole="HEAD_VARIANT",bodyPlan="MULTI",ecologyRole="PREDATOR",silhouette="LONG_MUZZLE_STRONG_JAW",palette=table.freeze({body=c(91,76,63),light=c(132,111,88),dark=c(49,43,39),accent=c(184,159,112)})}),
	GRAZER_HEAD=table.freeze({id="GRAZER_HEAD",name="초식동물 머리",familyRootId="CREATURE_HEAD",family="CREATURE",subfamily="GRAZER_HEAD",creatureRole="HEAD_VARIANT",bodyPlan="QUADRUPED",ecologyRole="PREY_GRAZER",silhouette="NARROW_MUZZLE_LONG_EARS",palette=table.freeze({body=c(125,107,83),light=c(166,145,112),dark=c(72,62,51),accent=c(180,154,105)})}),
	INSECT_HEAD=table.freeze({id="INSECT_HEAD",name="곤충 머리",familyRootId="CREATURE_INSECT_HEAD",family="CREATURE",subfamily="INSECT_HEAD",creatureRole="HEAD_VARIANT",bodyPlan="INSECT",ecologyRole="INSECT",silhouette="COMPOUND_EYE_MANDIBLE_HEAD",palette=table.freeze({body=c(66,82,65),light=c(99,117,86),dark=c(38,49,39),accent=c(169,130,63)})}),
	ARACHNID_LEG_CLUSTER=table.freeze({id="ARACHNID_LEG_CLUSTER",name="거미 다리 군락",familyRootId="CREATURE_ARACHNID_LEGS",family="CREATURE",subfamily="ARACHNID_LEG_CLUSTER",creatureRole="APPENDAGE",bodyPlan="ARACHNID",ecologyRole="ARACHNID",silhouette="EIGHT_ARTICULATED_LEGS",palette=table.freeze({body=c(62,56,53),light=c(92,82,72),dark=c(35,33,32),accent=c(140,84,60)})}),
	FIN_PAIR=table.freeze({id="FIN_PAIR",name="지느러미 한 쌍",familyRootId="CREATURE_FINS",family="CREATURE",subfamily="FIN_PAIR",creatureRole="APPENDAGE",bodyPlan="AQUATIC",ecologyRole="AQUATIC",silhouette="TAPERED_SIDE_FINS",palette=table.freeze({body=c(62,104,119),light=c(108,154,164),dark=c(35,62,71),accent=c(144,183,174)})}),
	CLAW_PAIR=table.freeze({id="CLAW_PAIR",name="발톱 한 쌍",familyRootId="CREATURE_CLAWS",family="CREATURE",subfamily="CLAW_PAIR",creatureRole="APPENDAGE",bodyPlan="MULTI",ecologyRole="PREDATOR",silhouette="CURVED_TWIN_CLAWS",palette=table.freeze({body=c(122,111,91),light=c(177,165,137),dark=c(70,65,57),accent=c(195,173,126)})}),
	MANDIBLE_PAIR=table.freeze({id="MANDIBLE_PAIR",name="턱 한 쌍",familyRootId="CREATURE_MANDIBLES",family="CREATURE",subfamily="MANDIBLE_PAIR",creatureRole="HEAD_APPENDAGE",bodyPlan="INSECT",ecologyRole="INSECT_PREDATOR",silhouette="CURVED_OPPOSING_MANDIBLES",palette=table.freeze({body=c(74,81,64),light=c(111,121,91),dark=c(42,47,38),accent=c(174,133,62)})}),
	ELITE_ORNAMENT=table.freeze({id="ELITE_ORNAMENT",name="엘리트 장식",familyRootId="CREATURE_ELITE",family="CREATURE",subfamily="ELITE_ORNAMENT",creatureRole="ELITE_ORNAMENT",bodyPlan="MULTI",ecologyRole="ELITE_VARIANT",silhouette="BACK_SPIKE_SHOULDER_CREST",palette=table.freeze({body=c(93,73,61),light=c(137,105,81),dark=c(52,43,39),accent=c(218,156,67)})}),
	AMORPHOUS_CORE=table.freeze({id="AMORPHOUS_CORE",name="비정형 점액 코어",familyRootId="CREATURE_AMORPHOUS",family="CREATURE",subfamily="AMORPHOUS_CORE",creatureRole="BODY_CORE",bodyPlan="AMORPHOUS",ecologyRole="SCAVENGER",silhouette="LOW_IRREGULAR_BLOB_CORE",palette=table.freeze({body=c(79,118,102),light=c(119,158,135),dark=c(44,70,62),accent=c(131,208,170)})}),
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


local function addCreatureExpansion(model,root,row,level)
	local p=row.palette
	local id=row.id
	if id=="ARACHNID_CORE" then
		weld(root,makePart("Thorax",Vector3.new(1.75,1.15,1.55),p.body,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(-0.55,0,0))
		weld(root,makePart("Abdomen",Vector3.new(2.15,1.55,1.90),p.light,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(1.05,0.15,0))
	elseif id=="SERPENT_BODY" then
		local count=level==1 and 5 or level==2 and 7 or 9
		for i=1,count do local t=i-1; local sz=1.15-t*0.055; weld(root,makePart("Segment"..i,Vector3.new(sz,sz,sz*1.15),i%2==0 and p.light or p.body,Enum.Material.SmoothPlastic,"BALL"),CFrame.new(0,0,t*0.78)) end
	elseif id=="AQUATIC_BODY" then
		weld(root,makePart("Body",Vector3.new(1.9,1.45,4.25),p.body,Enum.Material.SmoothPlastic,"BALL"),CFrame.new())
		weld(root,wedge("Nose",Vector3.new(1.35,1.05,1.55),p.light,Enum.Material.SmoothPlastic),CFrame.new(0,0,-2.55)*CFrame.Angles(math.rad(90),0,0))
	elseif id=="FLYING_BODY" then
		weld(root,makePart("Keel",Vector3.new(1.75,2.05,1.45),p.body,Enum.Material.SmoothPlastic,"BALL"),CFrame.new())
		weld(root,makePart("Chest",Vector3.new(2.15,1.05,1.35),p.light,Enum.Material.SmoothPlastic),CFrame.new(0,0.25,-0.35))
	elseif id=="GOLEM_CORE" then
		weld(root,makePart("Core",Vector3.new(2.8,3.0,2.2),p.body,Enum.Material.Slate),CFrame.new(0,0,0))
		for _,x in ipairs({-1.65,1.65}) do weld(root,makePart("Shoulder"..x,Vector3.new(1.2,1.2,1.2),p.light,Enum.Material.Slate),CFrame.new(x,0.75,0)) end
		if detail(level,2) then weld(root,makePart("GlowCore",Vector3.new(0.65,0.65,0.40),p.accent,Enum.Material.Neon),CFrame.new(0,0,-1.15)) end
	elseif id=="GIANT_TORSO" then
		weld(root,makePart("Torso",Vector3.new(4.2,4.6,2.7),p.body,Enum.Material.SmoothPlastic),CFrame.new())
		weld(root,makePart("ShoulderMass",Vector3.new(5.2,1.25,2.9),p.light,Enum.Material.SmoothPlastic),CFrame.new(0,1.55,0))
	elseif id=="HUMANOID_RAIDER_TORSO" then
		weld(root,makePart("Torso",Vector3.new(2.55,2.85,1.35),p.body,Enum.Material.Fabric),CFrame.new())
		weld(root,makePart("ChestPlate",Vector3.new(2.25,1.65,0.35),p.light,Enum.Material.Metal),CFrame.new(0,0.25,-0.72))
		if detail(level,2) then weld(root,makePart("Belt",Vector3.new(2.65,0.28,1.42),p.accent,Enum.Material.Fabric),CFrame.new(0,-1.15,0)) end
	elseif id=="UNDEAD_TORSO" then
		weld(root,makePart("Spine",Vector3.new(0.42,2.65,0.42),p.dark,Enum.Material.SmoothPlastic),CFrame.new())
		for i=-2,2 do weld(root,makePart("Rib"..i,Vector3.new(2.15-math.abs(i)*0.20,0.18,0.30),i%2==0 and p.light or p.body,Enum.Material.SmoothPlastic),CFrame.new(0,i*0.38,-0.05)) end
	elseif id=="PREDATOR_HEAD" then
		weld(root,makePart("Skull",Vector3.new(1.75,1.45,1.75),p.body,Enum.Material.SmoothPlastic,"BALL"),CFrame.new())
		weld(root,wedge("Muzzle",Vector3.new(1.15,0.85,1.65),p.light,Enum.Material.SmoothPlastic),CFrame.new(0,-0.15,-1.35)*CFrame.Angles(math.rad(90),0,0))
	elseif id=="GRAZER_HEAD" then
		weld(root,makePart("Skull",Vector3.new(1.45,1.45,1.75),p.body,Enum.Material.SmoothPlastic,"BALL"),CFrame.new())
		for _,x in ipairs({-0.85,0.85}) do weld(root,wedge("Ear"..x,Vector3.new(0.55,1.15,0.22),p.light,Enum.Material.SmoothPlastic),CFrame.new(x,0.55,0)*CFrame.Angles(0,0,math.rad(x<0 and 35 or -35))) end
	elseif id=="INSECT_HEAD" then
		weld(root,makePart("Head",Vector3.new(1.75,1.45,1.45),p.body,Enum.Material.SmoothPlastic,"BALL"),CFrame.new())
		for _,x in ipairs({-0.62,0.62}) do weld(root,makePart("Eye"..x,Vector3.new(0.62,0.62,0.32),p.accent,Enum.Material.Neon,"BALL"),CFrame.new(x,0.28,-0.65)) end
	elseif id=="ARACHNID_LEG_CLUSTER" then
		for side=-1,1,2 do for i=1,4 do local z=-1.25+(i-1)*0.82; weld(root,makePart("Leg"..side.."_"..i,Vector3.new(2.45,0.18,0.18),i%2==0 and p.light or p.body,Enum.Material.SmoothPlastic),CFrame.new(side*1.25,0,z)*CFrame.Angles(0,0,math.rad(side*(18+i*6)))) end end
	elseif id=="FIN_PAIR" then
		for _,x in ipairs({-1,1}) do weld(root,wedge("Fin"..x,Vector3.new(1.25,0.22,1.75),p.light,Enum.Material.SmoothPlastic),CFrame.new(x*0.95,0,0)*CFrame.Angles(0,math.rad(x*12),math.rad(x*28))) end
	elseif id=="CLAW_PAIR" then
		for _,x in ipairs({-1,1}) do weld(root,wedge("Claw"..x,Vector3.new(0.48,0.55,1.45),p.light,Enum.Material.SmoothPlastic),CFrame.new(x*0.48,0,-0.45)*CFrame.Angles(math.rad(90),0,math.rad(x*14))) end
	elseif id=="MANDIBLE_PAIR" then
		for _,x in ipairs({-1,1}) do weld(root,wedge("Mandible"..x,Vector3.new(0.55,0.55,1.55),p.body,Enum.Material.SmoothPlastic),CFrame.new(x*0.52,0,-0.65)*CFrame.Angles(math.rad(90),0,math.rad(x*22))) end
	elseif id=="ELITE_ORNAMENT" then
		for i=-2,2 do weld(root,wedge("Crest"..i,Vector3.new(0.50,1.05+math.abs(i)*0.15,0.30),i%2==0 and p.accent or p.light,Enum.Material.SmoothPlastic),CFrame.new(i*0.48,0.65,0)*CFrame.Angles(0,0,math.rad(i*6))) end
	elseif id=="AMORPHOUS_CORE" then
		weld(root,makePart("BlobCore",Vector3.new(2.85,1.55,2.35),p.body,Enum.Material.SmoothPlastic,"BALL"),CFrame.new())
		local lobes={{Vector3.new(1.35,0.90,1.20),CFrame.new(-1.05,-0.10,0.30)},{Vector3.new(1.20,1.15,1.05),CFrame.new(0.95,0.12,-0.25)},{Vector3.new(0.95,0.78,0.90),CFrame.new(-0.25,0.66,0.55)},{Vector3.new(0.88,0.72,0.82),CFrame.new(0.38,-0.48,-0.82)},{Vector3.new(0.72,0.62,0.68),CFrame.new(-1.18,-0.38,-0.65)},{Vector3.new(0.66,0.58,0.62),CFrame.new(1.18,-0.30,0.62)}}
		local lobeCount=level==1 and 2 or level==2 and 4 or 6
		for i=1,lobeCount do local entry=lobes[i]; weld(root,makePart("BlobLobe"..i,entry[1],i%2==0 and p.light or p.body,Enum.Material.SmoothPlastic,"BALL"),entry[2]) end
		if detail(level,3) then for i,x in ipairs({-0.62,0.62}) do weld(root,makePart("GlowNodule"..i,Vector3.new(0.30,0.30,0.18),p.accent,Enum.Material.Neon,"BALL"),CFrame.new(x,0.24,-1.10)) end end
	end
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
	ARACHNID_CORE=addCreatureExpansion,
	SERPENT_BODY=addCreatureExpansion,
	AQUATIC_BODY=addCreatureExpansion,
	FLYING_BODY=addCreatureExpansion,
	GOLEM_CORE=addCreatureExpansion,
	GIANT_TORSO=addCreatureExpansion,
	HUMANOID_RAIDER_TORSO=addCreatureExpansion,
	UNDEAD_TORSO=addCreatureExpansion,
	PREDATOR_HEAD=addCreatureExpansion,
	GRAZER_HEAD=addCreatureExpansion,
	INSECT_HEAD=addCreatureExpansion,
	ARACHNID_LEG_CLUSTER=addCreatureExpansion,
	FIN_PAIR=addCreatureExpansion,
	CLAW_PAIR=addCreatureExpansion,
	MANDIBLE_PAIR=addCreatureExpansion,
	ELITE_ORNAMENT=addCreatureExpansion,
	AMORPHOUS_CORE=addCreatureExpansion,
})

local function applyModelMetadata(model,row,quality)
	model:SetAttribute("StudioAssetFamilyRootId",row.familyRootId)
	model:SetAttribute("StudioAssetSubfamily",row.subfamily)
	model:SetAttribute("StudioAssetCreatureRole",row.creatureRole)
	model:SetAttribute("CreatureBodyPlan",row.bodyPlan or "MULTI")
	model:SetAttribute("CreatureEcologyRole",row.ecologyRole or "GENERAL")
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
