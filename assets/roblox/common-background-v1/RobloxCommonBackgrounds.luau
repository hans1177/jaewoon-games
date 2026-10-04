-- 파일명: assets/roblox/common-background-v1/RobloxCommonBackgrounds.luau
-- 역할: 로딩/메뉴/인트로에 재사용하는 회사 공용 레이어형 배경
-- 원칙: UI 배경 표현만 제공한다. 실제 월드 지형·게임플레이·카메라 권한은 소유하지 않는다.

local RobloxCommonBackgrounds = {}

local function c(r,g,b) return Color3.fromRGB(r,g,b) end

local PROFILES = table.freeze({
  FOREST_DAWN = table.freeze({skyA=c(42,71,82),skyB=c(184,158,106),far=c(46,72,63),mid=c(37,62,50),near=c(25,45,36),accent=c(231,190,112),fog=c(171,190,173),landmark="TREE_SPIRE"}),
  DEEP_FOREST = table.freeze({skyA=c(18,38,42),skyB=c(36,64,56),far=c(28,55,45),mid=c(21,45,36),near=c(13,31,27),accent=c(111,169,111),fog=c(91,121,104),landmark="CANOPY_GAP"}),
  SNOW_FIELD = table.freeze({skyA=c(92,126,153),skyB=c(211,224,232),far=c(135,157,171),mid=c(184,196,204),near=c(226,231,232),accent=c(245,249,250),fog=c(226,235,240),landmark="SNOW_PINE"}),
  DESERT_DUSK = table.freeze({skyA=c(91,62,84),skyB=c(227,145,91),far=c(171,105,73),mid=c(143,85,58),near=c(93,59,45),accent=c(246,191,111),fog=c(213,158,115),landmark="MESA"}),
  SWAMP_MIST = table.freeze({skyA=c(49,65,62),skyB=c(93,104,84),far=c(54,72,62),mid=c(43,62,51),near=c(25,42,35),accent=c(132,160,101),fog=c(139,150,129),landmark="DEAD_TREE"}),
  CAVE_BLUE = table.freeze({skyA=c(12,24,37),skyB=c(25,51,67),far=c(23,43,55),mid=c(18,34,46),near=c(10,21,31),accent=c(74,148,185),fog=c(65,95,112),landmark="CAVE_ARCH"}),
  CRYSTAL_CAVERN = table.freeze({skyA=c(24,18,43),skyB=c(54,38,79),far=c(47,35,70),mid=c(34,27,54),near=c(17,16,30),accent=c(116,103,224),fog=c(104,89,154),landmark="CRYSTAL_SPIRE"}),
  COAST_SUNSET = table.freeze({skyA=c(62,91,127),skyB=c(240,159,112),far=c(90,124,146),mid=c(52,84,103),near=c(30,56,67),accent=c(250,202,134),fog=c(192,177,159),landmark="COAST_ROCK"}),
  VILLAGE_WARM = table.freeze({skyA=c(70,91,108),skyB=c(218,177,119),far=c(83,86,75),mid=c(92,70,51),near=c(52,43,36),accent=c(244,188,103),fog=c(172,151,119),landmark="VILLAGE_ROOFS"}),
  CITY_NIGHT = table.freeze({skyA=c(13,20,36),skyB=c(32,45,69),far=c(35,45,58),mid=c(25,34,47),near=c(13,20,29),accent=c(83,160,221),fog=c(61,74,92),landmark="CITY_TOWER"}),
  RUINS_MOON = table.freeze({skyA=c(20,26,43),skyB=c(63,70,88),far=c(61,62,66),mid=c(48,48,48),near=c(28,29,31),accent=c(198,204,204),fog=c(111,115,120),landmark="BROKEN_ARCH"}),
  VOLCANIC_GLOW = table.freeze({skyA=c(31,22,24),skyB=c(87,40,34),far=c(63,39,36),mid=c(45,30,29),near=c(23,19,19),accent=c(230,91,47),fog=c(117,68,56),landmark="VOLCANO"}),
  SKY_ISLAND = table.freeze({skyA=c(69,135,188),skyB=c(207,231,245),far=c(121,165,188),mid=c(93,129,144),near=c(55,86,101),accent=c(245,241,198),fog=c(205,226,235),landmark="FLOATING_ISLAND"}),
  HORROR_CORRIDOR = table.freeze({skyA=c(24,24,27),skyB=c(47,40,39),far=c(50,45,43),mid=c(35,31,31),near=c(17,17,19),accent=c(166,52,52),fog=c(81,70,69),landmark="CORRIDOR_LIGHT"}),
})

local function corner(parent,r) local x=Instance.new("UICorner");x.CornerRadius=UDim.new(0,r);x.Parent=parent;return x end
local function tag(root,id)
  root:SetAttribute("StudioAssetId","BACKGROUND_"..id);root:SetAttribute("StudioAssetPack","roblox-common-background-v1")
  root:SetAttribute("StudioAssetFamily","ENVIRONMENT");root:SetAttribute("StudioAssetSubfamily","BACKGROUND")
  root:SetAttribute("CompanyCommonBase",true);root:SetAttribute("InternalAuditStudioRequired",false)
  root:SetAttribute("ProductionVerified",false);root:SetAttribute("GameplayAuthority",false)
end

local function makeLayer(parent,name,color,pos,size,transparency,rotation)
  local f=Instance.new("Frame");f.Name=name;f.Position=pos;f.Size=size;f.BackgroundColor3=color;f.BackgroundTransparency=transparency or 0;f.BorderSizePixel=0;f.Rotation=rotation or 0;f.Parent=parent
  return f
end

local function addStars(root,color,count)
  for i=1,count do
    local dot=Instance.new("Frame");dot.Name="Star"..i;dot.Size=UDim2.fromOffset(2+(i%2),2+(i%2));dot.Position=UDim2.fromScale(((i*37)%97)/100,((i*61)%53)/100);dot.BackgroundColor3=color;dot.BackgroundTransparency=.18+(i%4)*.12;dot.BorderSizePixel=0;dot.Parent=root;corner(dot,8)
  end
end

local function addSnow(root,color,count)
  for i=1,count do
    local dot=Instance.new("Frame");dot.Name="Snow"..i;local s=3+(i%4);dot.Size=UDim2.fromOffset(s,s);dot.Position=UDim2.fromScale(((i*29)%101)/100,((i*47)%89)/100);dot.BackgroundColor3=color;dot.BackgroundTransparency=.12+(i%4)*.1;dot.BorderSizePixel=0;dot.Parent=root;corner(dot,8)
  end
end

local function addLandmark(root,profile)
  local holder=Instance.new("Frame");holder.Name="Landmark_"..profile.landmark;holder.AnchorPoint=Vector2.new(.5,1);holder.Position=UDim2.fromScale(.72,.76);holder.Size=UDim2.fromScale(.24,.42);holder.BackgroundTransparency=1;holder.Parent=root
  if profile.landmark=="TREE_SPIRE" or profile.landmark=="SNOW_PINE" or profile.landmark=="DEAD_TREE" then
    local trunk=makeLayer(holder,"Trunk",profile.near,UDim2.fromScale(.47,.30),UDim2.fromScale(.10,.70),0,0);corner(trunk,8)
    for i=1,4 do local crown=makeLayer(holder,"Crown"..i,profile.mid,UDim2.fromScale(.18,.05+i*.11),UDim2.fromScale(.64,.18),.03,0);corner(crown,28) end
  elseif profile.landmark=="MESA" or profile.landmark=="VOLCANO" then
    local base=makeLayer(holder,"Mass",profile.mid,UDim2.fromScale(.08,.40),UDim2.fromScale(.84,.60),0,0);corner(base,30)
    if profile.landmark=="VOLCANO" then local glow=makeLayer(holder,"Glow",profile.accent,UDim2.fromScale(.36,.30),UDim2.fromScale(.28,.08),.05,0);corner(glow,20) end
  elseif profile.landmark=="CRYSTAL_SPIRE" then
    for i=1,4 do local sp=makeLayer(holder,"Crystal"..i,i%2==0 and profile.accent or profile.fog,UDim2.fromScale(.12+i*.15,.18+(i%2)*.12),UDim2.fromScale(.11,.68-(i%3)*.11),.03,(i-2)*6);corner(sp,6) end
  elseif profile.landmark=="CITY_TOWER" or profile.landmark=="VILLAGE_ROOFS" then
    for i=1,5 do local h=.25+(i%3)*.13;local b=makeLayer(holder,"Building"..i,profile.mid,UDim2.fromScale(.04+(i-1)*.19,1-h),UDim2.fromScale(.16,h),0,0);corner(b,3) end
  elseif profile.landmark=="BROKEN_ARCH" or profile.landmark=="CAVE_ARCH" then
    makeLayer(holder,"Left",profile.mid,UDim2.fromScale(.14,.18),UDim2.fromScale(.16,.82),0,-4)
    makeLayer(holder,"Right",profile.mid,UDim2.fromScale(.70,.22),UDim2.fromScale(.16,.78),0,4)
    makeLayer(holder,"Top",profile.mid,UDim2.fromScale(.18,.18),UDim2.fromScale(.58,.13),0,0)
  elseif profile.landmark=="FLOATING_ISLAND" then
    local island=makeLayer(holder,"Island",profile.mid,UDim2.fromScale(.05,.45),UDim2.fromScale(.90,.26),0,0);corner(island,50)
    makeLayer(holder,"Underside",profile.near,UDim2.fromScale(.24,.62),UDim2.fromScale(.52,.25),0,0);corner(holder,30)
  elseif profile.landmark=="CORRIDOR_LIGHT" then
    makeLayer(holder,"Hall",profile.mid,UDim2.fromScale(.10,.08),UDim2.fromScale(.80,.92),.08,0)
    local light=makeLayer(holder,"Light",profile.accent,UDim2.fromScale(.39,.15),UDim2.fromScale(.22,.12),.05,0);corner(light,8)
  else
    local rock=makeLayer(holder,"CoastRock",profile.mid,UDim2.fromScale(.18,.38),UDim2.fromScale(.64,.62),0,-6);corner(rock,30)
  end
  return holder
end

function RobloxCommonBackgrounds.List()
  local ids={};for id in pairs(PROFILES) do table.insert(ids,id) end;table.sort(ids);return table.freeze(ids)
end

function RobloxCommonBackgrounds.Describe(profileId)
  local id=string.upper(tostring(profileId or ""));local p=PROFILES[id];assert(p,"UNKNOWN_COMMON_BACKGROUND: "..id);return p
end

function RobloxCommonBackgrounds.Create(profileId, options)
  options=options or {};local id=string.upper(tostring(profileId or "FOREST_DAWN"));local p=PROFILES[id];assert(p,"UNKNOWN_COMMON_BACKGROUND: "..id)
  local root=Instance.new("Frame");root.Name=options.name or ("Background_"..id);root.Size=options.size or UDim2.fromScale(1,1);root.BackgroundColor3=p.skyA;root.BorderSizePixel=0;root.ClipsDescendants=true;tag(root,id)
  local sky=Instance.new("UIGradient");sky.Color=ColorSequence.new({ColorSequenceKeypoint.new(0,p.skyA),ColorSequenceKeypoint.new(1,p.skyB)});sky.Rotation=90;sky.Parent=root

  local far=makeLayer(root,"Far",p.far,UDim2.fromScale(-.05,.48),UDim2.fromScale(1.10,.38),.06,-2);corner(far,50)
  local mid=makeLayer(root,"Mid",p.mid,UDim2.fromScale(-.07,.62),UDim2.fromScale(1.14,.34),.03,2);corner(mid,46)
  local near=makeLayer(root,"Near",p.near,UDim2.fromScale(-.08,.76),UDim2.fromScale(1.16,.30),0,-1);corner(near,42)

  local fog=makeLayer(root,"FogBand",p.fog,UDim2.fromScale(0,.54),UDim2.fromScale(1,.18),.72,0)
  local fogGradient=Instance.new("UIGradient");fogGradient.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.5,.2),NumberSequenceKeypoint.new(1,1)});fogGradient.Parent=fog

  local light=makeLayer(root,"LightBloom",p.accent,UDim2.fromScale(.08,.10),UDim2.fromScale(.34,.34),.82,0);corner(light,999)
  local landmark=addLandmark(root,p)

  if id=="CITY_NIGHT" or id=="RUINS_MOON" or id=="CRYSTAL_CAVERN" then addStars(root,p.accent,18) end
  if id=="SNOW_FIELD" then addSnow(root,p.accent,20) end

  local controller={}
  function controller.SetDepth(amount)
    local a=math.clamp(tonumber(amount) or 1,.5,1.5)
    far.Position=UDim2.fromScale(-.05-(a-1)*.01,.48)
    mid.Position=UDim2.fromScale(-.07+(a-1)*.012,.62)
    near.Position=UDim2.fromScale(-.08+(a-1)*.02,.76)
  end
  function controller.SetReducedMotion(enabled)
    root:SetAttribute("ReducedMotion",enabled==true)
  end
  root:SetAttribute("BackgroundProfile",id);root:SetAttribute("LayerCount",6);root:SetAttribute("WorldGeometryAuthority",false)
  return root,controller,{sky=sky,far=far,mid=mid,near=near,fog=fog,light=light,landmark=landmark}
end

function RobloxCommonBackgrounds.Audit()
  return table.freeze({
    version=1,packId="roblox-common-background-v1",profileCount=#RobloxCommonBackgrounds.List(),
    profiles=RobloxCommonBackgrounds.List(),layerRoles=table.freeze({"SKY","FAR","MID","NEAR","FOG_LIGHT","LANDMARK"}),
    companyCommonBase=true,internalAuditStudioRequired=false,worldGeometryAuthority=false,gameplayAuthority=false,productionVerified=false
  })
end

return table.freeze(RobloxCommonBackgrounds)
