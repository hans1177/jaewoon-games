-- 백수대전쟁 V2: 게임 전용 모듈 제작기 (공용 카탈로그의 아이디어/명칭만 자체 구현)
-- 자산 사용: 외부 AssetId/메시/이미지/오디오 0. 오리지널 Luau 파츠.
-- 참고 카탈로그: roblox-common-building-v1, roblox-common-creature-parts-v1,
--                roblox-common-world-props-v1. 원본 카탈로그의 Studio PASS를 주장하지 않는다.
local Debris=game:GetService("Debris")
local K={}
K.CatalogFamilies={"BUILDING","CREATURE_PARTS","WORLD_PROPS","COMBAT_VFX"}
local function p(parent,name,size,cf,color,material,shape)
 local part=Instance.new("Part")
 part.Name=name;part.Size=size;part.CFrame=cf
 part.Color=color;part.Material=material or Enum.Material.SmoothPlastic
 part.Anchored=true;part.CanCollide=false;part.CanTouch=false
 part.CastShadow=true
 if shape then part.Shape=shape end
 part.Parent=parent
 return part
end
local function sphere(parent,name,size,cf,color,mat)
 return p(parent,name,size,cf,color,mat,Enum.PartType.Ball)
end
local function detail(parent,name,size,origin,offset,color,mat,shape)
 return p(parent,name,size,origin*CFrame.new(offset),color,mat,shape)
end
local function glow(parent,origin,color,height)
 local light=p(parent,"전투의 빛",Vector3.new(.38,height or 1.5,.38),origin,color,Enum.Material.Neon)
 light.Transparency=.13
 return light
end

-- CREATURE_PARTS: INSECT_THORAX / WING_PAIR / QUADRUPED_TORSO /
-- SHELL_BACK / GOLEM_CORE / TAIL_LONG / HORN_PAIR / ELITE_ORNAMENT
function K.BuildCreature(model,cf,unit,level,team)
 local kind=unit.Shape
 local tone=team=="ALLY" and unit.Color or unit.Color:Lerp(Color3.fromRGB(204,81,77),.45)
 local pale=tone:Lerp(Color3.fromRGB(255,247,222),.45)
 local shade=tone:Lerp(Color3.fromRGB(30,39,43),.42)
 local legColor=tone:Lerp(Color3.fromRGB(55,53,49),.23)
 local scale=1+math.min(level-1,9)*.042
 local function off(x,y,z)
  return cf*CFrame.new(x*scale,y*scale,z*scale)
 end
 local torso
 if kind=="GOLEM" then
  torso=p(model,"암석 몸통",Vector3.new(3.3,4.2,2.8)*scale,off(0,0,0),tone,Enum.Material.Slate)
  for _,side in ipairs({-1,1}) do
   p(model,"거석 팔",Vector3.new(1.25,2.4,1.45)*scale,off(side*2.5,-.1,0),shade,Enum.Material.Slate)
   p(model,"암석 발",Vector3.new(1.3,1,1.8)*scale,off(side*.85,-2.5,.3),shade,Enum.Material.Cobblestone)
  end
  sphere(model,"머리",Vector3.new(2.5,2.3,2.3)*scale,off(0,3.1,.2),pale,Enum.Material.Slate)
  glow(model,off(0,3.2,1.39),Color3.fromRGB(255,205,98),.38)
 elseif kind=="SLIME" then
  torso=sphere(model,"젤리 몸",Vector3.new(4.5,3.3,3.8)*scale,off(0,-.25,0),tone,Enum.Material.Glass)
  torso.Transparency=.25
  sphere(model,"속 핵",Vector3.new(1.4,1.4,1.4)*scale,off(0,-.2,.35),pale,Enum.Material.Neon)
 elseif kind=="BIRD" then
  torso=sphere(model,"깃털 몸",Vector3.new(2.9,2.6,3)*scale,cf,tone)
  sphere(model,"머리",Vector3.new(2.1,2.1,2.1)*scale,off(0,1.4,.9),pale)
  p(model,"부리",Vector3.new(.9,.7,1.45)*scale,off(0,1.2,2.15),Color3.fromRGB(244,181,83))
  for _,side in ipairs({-1,1}) do
   local wing=p(model,"깃털 날개",Vector3.new(2.3,.5,2.4)*scale,off(side*2,.35,-.2),shade)
   wing.CFrame=wing.CFrame*CFrame.Angles(0,0,side*.32)
   p(model,"발",Vector3.new(.37,.85,.9)*scale,off(side*.7,-1.55,.7),Color3.fromRGB(191,114,64))
  end
 elseif kind=="DRAGON" then
  torso=sphere(model,"용 몸통",Vector3.new(3.6,3.4,4)*scale,cf,tone)
  sphere(model,"용 머리",Vector3.new(2.5,2.1,3)*scale,off(0,1.6,2),pale)
  p(model,"주둥이",Vector3.new(1.8,.9,1.8)*scale,off(0,1.1,3.7),shade)
  for _,side in ipairs({-1,1}) do
   local wing=p(model,"박쥐 날개",Vector3.new(4,.48,3.2)*scale,off(side*3.2,1.3,-.9),shade)
   wing.CFrame=wing.CFrame*CFrame.Angles(0,side*.23,side*.2)
   p(model,"용 발",Vector3.new(.9,1.6,1.15)*scale,off(side*1.2,-1.9,.2),legColor)
   p(model,"뿔",Vector3.new(.43,1.3,.53)*scale,off(side*.8,3,1.3),Color3.fromRGB(237,205,130))
  end
  p(model,"용 꼬리",Vector3.new(1.05,.9,4.5)*scale,off(0,-.5,-4),shade)
 elseif kind=="TURTLE" then
  torso=sphere(model,"복부",Vector3.new(3.7,2.4,4.7)*scale,cf,tone)
  sphere(model,"등껍질",Vector3.new(4.1,2.8,4.6)*scale,off(0,1.25,-.1),shade,Enum.Material.Slate)
  for _,side in ipairs({-1,1}) do
   for _,z in ipairs({-1.65,1.65}) do
    sphere(model,"발",Vector3.new(1.1,1.2,1.3)*scale,off(side*1.8,-1.3,z),legColor)
   end
  end
  sphere(model,"거북 머리",Vector3.new(2.1,1.7,2.2)*scale,off(0,.15,2.8),pale)
 elseif kind=="WOLF" then
  torso=sphere(model,"늑대 몸통",Vector3.new(3.1,2.6,5)*scale,cf,tone)
  sphere(model,"늑대 머리",Vector3.new(2.3,2.25,2.4)*scale,off(0,.95,2.8),pale)
  p(model,"늑대 주둥이",Vector3.new(1.2,1.15,2)*scale,off(0,.55,4.3),shade)
  for _,side in ipairs({-1,1}) do
   for _,z in ipairs({-1.65,1.75}) do
    p(model,"늑대 발",Vector3.new(.7,1.8,.8)*scale,off(side*1,-1.8,z),legColor)
   end
   p(model,"귀",Vector3.new(.65,1.2,.62)*scale,off(side*.75,2.6,3),shade)
  end
  p(model,"꼬리",Vector3.new(.7,.85,2.5)*scale,off(0,.5,-3.3),pale)
 elseif kind=="ANT" or kind=="BUG" then
  local beetle=kind=="BUG"
  torso=sphere(model,beetle and "풍뎅이 몸" or "개미 가슴",Vector3.new(2.7,2.4,3.2)*scale,cf,tone)
  sphere(model,"배",Vector3.new((beetle and 3.6 or 2.6),2.3,2.8)*scale,off(0,-.25,-2.3),shade)
  sphere(model,"머리",Vector3.new(2.1,1.85,2.1)*scale,off(0,.45,2),pale)
  for _,side in ipairs({-1,1}) do
   for _,z in ipairs({-1.4,0,1.4}) do
    local leg=p(model,"곤충 다리",Vector3.new(.35,.45,2.4)*scale,off(side*1.75,-1.3,z),legColor)
    leg.CFrame=leg.CFrame*CFrame.Angles(0,side*.3,side*.3)
   end
   p(model,"더듬이",Vector3.new(.25,1.5,.25)*scale,off(side*.7,1.9,2.45),shade)
  end
  if beetle then
   sphere(model,"등딱지",Vector3.new(3.3,1.3,3.7)*scale,off(0,1.3,-1),tone,Enum.Material.Slate)
   p(model,"뿔",Vector3.new(.7,1.7,.85)*scale,off(0,2.3,2.1),shade)
  end
 else
  torso=sphere(model,"몸통",Vector3.new(3,3,3)*scale,cf,tone)
 end
 if not torso then return nil end
 if kind~="GOLEM" then
  for _,side in ipairs({-1,1}) do
   sphere(model,"눈",Vector3.new(.34,.37,.3)*scale,off(side*.68,.6,kind=="DRAGON" and 3.4 or (kind=="BIRD" and 1.85 or (kind=="WOLF" and 3.9 or (kind=="TURTLE" and 3.8 or (kind=="ANT" or kind=="BUG") and 2.9 or 1.9)))),Color3.fromRGB(30,39,47))
  end
 end
 if level>=5 then
  sphere(model,"진화의 빛",Vector3.new(1,.7,1)*scale,off(0,kind=="GOLEM" and 4.7 or 2.55,0),Color3.fromRGB(255,226,115),Enum.Material.Neon)
 end
 if level>=10 then
  p(model,"왕관",Vector3.new(2.4,.55,1.7)*scale,off(0,kind=="GOLEM" and 5.7 or 3.4,0),Color3.fromRGB(250,192,71),Enum.Material.Metal)
 end
 return torso
end

-- BUILDING: FLOOR_TILE / WALL_WINDOW / WALL_TRIM / GATE_FRAME / ROOF_SLOPE
function K.BuildHome(model,pos,unit,level)
 local cf=CFrame.new(pos.X,0,pos.Z)
 local base=unit.Color
 local wood=Color3.fromRGB(124,87,60)
 local white=Color3.fromRGB(217,205,171)
 local roof=base:Lerp(Color3.fromRGB(63,57,80),.58)
 p(model,"돌 기초",Vector3.new(9,1.2,9),cf*CFrame.new(0,1,0),Color3.fromRGB(145,141,129),Enum.Material.Cobblestone)
 local height=4.6+level*.35
 p(model,"생물 집",Vector3.new(7.6,height,7),cf*CFrame.new(0,1.6+height/2,0),wood,Enum.Material.WoodPlanks)
 for _,side in ipairs({-1,1}) do
  p(model,"모서리 기둥",Vector3.new(.75,height+.6,.75),cf*CFrame.new(side*3.7,1.5+height/2,3.25),white,Enum.Material.WoodPlanks)
  p(model,"모서리 기둥",Vector3.new(.75,height+.6,.75),cf*CFrame.new(side*3.7,1.5+height/2,-3.25),white,Enum.Material.WoodPlanks)
  local window=p(model,"빛나는 창문",Vector3.new(1.5,1.4,.14),cf*CFrame.new(side*1.9,height*.56+1.1,3.57),Color3.fromRGB(250,213,120),Enum.Material.Neon)
  window.Transparency=.25
 end
 p(model,"지붕",Vector3.new(9.4,1.15,8.8),cf*CFrame.new(0,2.1+height,0),roof,Enum.Material.Slate)
 p(model,"지붕 꼭지",Vector3.new(6.6,.8,5.8),cf*CFrame.new(0,2.85+height,0),roof:Lerp(white,.18),Enum.Material.Slate)
 p(model,"문",Vector3.new(2.25,3.2,.22),cf*CFrame.new(0,3.1,3.57),Color3.fromRGB(53,54,55),Enum.Material.Wood)
 p(model,"문 손잡이",Vector3.new(.26,.26,.21),cf*CFrame.new(.65,3.1,3.76),Color3.fromRGB(238,194,89),Enum.Material.Metal)
 if level>=5 then
  for _,side in ipairs({-1,1}) do
   p(model,"전망 탑",Vector3.new(1.4,2.7,1.4),cf*CFrame.new(side*3,3.45+height,0),white,Enum.Material.Cobblestone)
  end
 end
 if level>=10 then
  p(model,"최종 진화 첨탑",Vector3.new(1.7,3.5,1.7),cf*CFrame.new(0,4.5+height,0),Color3.fromRGB(251,201,78),Enum.Material.Metal)
 end
end

function K.DecorateGate(folder,x,z,enemy)
 local cf=CFrame.new(x,0,z)
 local stone=enemy and Color3.fromRGB(140,105,101) or Color3.fromRGB(126,152,167)
 local bright=enemy and Color3.fromRGB(240,135,95) or Color3.fromRGB(95,185,244)
 for _,side in ipairs({-1,1}) do
  for i=1,3 do
   p(folder,"성가퀴",Vector3.new(3,2,6),cf*CFrame.new(side*(6+i*3.6),22,0),stone,Enum.Material.Slate)
  end
  p(folder,"수문 탑",Vector3.new(7,22,8),cf*CFrame.new(side*23,11,0),stone,Enum.Material.Cobblestone)
  p(folder,"탑 지붕",Vector3.new(8.2,2,9.2),cf*CFrame.new(side*23,23,0),Color3.fromRGB(83,77,93),Enum.Material.Slate)
  p(folder,"세력 깃발",Vector3.new(.35,7,.35),cf*CFrame.new(side*23,28,0),Color3.fromRGB(205,195,157),Enum.Material.Metal)
  p(folder,"깃천",Vector3.new(4,3,.4),cf*CFrame.new(side*23+2,29.5,0),bright,Enum.Material.Fabric)
 end
 for _,side in ipairs({-1,1}) do
  p(folder,"아치 발광",Vector3.new(.45,12,.45),cf*CFrame.new(side*10.75,8,2.6),bright,Enum.Material.Neon)
 end
end

-- WORLD_PROPS: WOOD_FENCE / STREET_LANTERN / RESOURCE_ROCK_NODE / RESOURCE_WOOD_NODE
function K.BuildWorld(folder,x)
 local wood=Color3.fromRGB(139,100,65)
 local grass=Color3.fromRGB(88,147,99)
 for i=-5,5 do
  if math.abs(i)>1 then
   local z=i*9
   for _,side in ipairs({-1,1}) do
    local xx=x+side*29
    p(folder,"잔디 언덕",Vector3.new(13,3,13),CFrame.new(xx,0,z),grass,Enum.Material.Grass,Enum.PartType.Ball)
    p(folder,"나무 몸통",Vector3.new(1.4,7,1.4),CFrame.new(xx,3,z),wood,Enum.Material.Wood)
    sphere(folder,"나무 잎",Vector3.new(7,7,7),CFrame.new(xx,8,z),Color3.fromRGB(70+(i+5)*3,145,91),Enum.Material.Grass)
    sphere(folder,"잎 꼭대기",Vector3.new(5,5,5),CFrame.new(xx,11,z),Color3.fromRGB(104,166,103),Enum.Material.Grass)
   end
  end
 end
 for _,side in ipairs({-1,1}) do
  for _,z in ipairs({-24,0,24}) do
   local xx=x+side*16
   p(folder,"길가 등불 기둥",Vector3.new(.8,7,.8),CFrame.new(xx,3.6,z),Color3.fromRGB(75,70,72),Enum.Material.Metal)
   local lamp=sphere(folder,"길가 등불",Vector3.new(1.9,1.9,1.9),CFrame.new(xx,7.4,z),Color3.fromRGB(255,210,126),Enum.Material.Neon)
   local light=Instance.new("PointLight");light.Color=lamp.Color;light.Brightness=.65;light.Range=15;light.Parent=lamp
  end
  for _,z in ipairs({-16,0,16}) do
   p(folder,"자원석",Vector3.new(3.5,2.7,3),CFrame.new(x+side*25,.8,z),Color3.fromRGB(153,149,139),Enum.Material.Slate,Enum.PartType.Ball)
  end
 end
 for z=-28,28,7 do
  p(folder,"돌 포장",Vector3.new(11,.12,5.2),CFrame.new(x,.18,z),Color3.fromRGB(169,159,143),Enum.Material.Cobblestone)
 end
end

function K.HitSpark(folder,position,team)
 local color=team=="ALLY" and Color3.fromRGB(255,233,145) or Color3.fromRGB(255,123,117)
 local spark=sphere(folder,"피격 이펙트",Vector3.new(.9,.9,.9),CFrame.new(position.X,2.9,position.Z),color,Enum.Material.Neon)
 spark.Transparency=.2
 Debris:AddItem(spark,.2)
end
return K
