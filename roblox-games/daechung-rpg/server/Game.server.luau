-- 대충 RPG: 마을 허브 + 5포탈 + 대형 사냥터/던전 + AI 파티
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local Lighting=game:GetService("Lighting")
local AssetService=game:GetService("AssetService")
local Shared=RS:WaitForChild("Shared")
local C=require(Shared:WaitForChild("GameConfig"))
local Style=require(Shared:WaitForChild("VisualStyle"))

local store=DSS:GetDataStore("daechung-rpg-portal-v1")
local remote=RS:FindFirstChild(C.RemoteName)or Instance.new("RemoteEvent")
remote.Name=C.RemoteName;remote.Parent=RS
local qaCaptureStore=DSS:GetDataStore("qa-camera-captures-v1")
local qaCaptureRemote=RS:FindFirstChild(C.QACaptureRemoteName or "QACaptureReport")or Instance.new("RemoteEvent")
qaCaptureRemote.Name=C.QACaptureRemoteName or "QACaptureReport";qaCaptureRemote.Parent=RS
local qaCaptureLast={}

local world
local enemies={}
local aiUsers={}
local parties={}
local clickTimes={}
local lastRequest={}
local lastCombat={}
local assetCache={}
local ASSETS={Nature=6933438443,City=6933556508,Dungeon=6934021345,StonePortal=12931228293}

local function n(p,k,d)local v=p:GetAttribute(k);return typeof(v)=="number"and v or d end
local function root(p)local c=p.Character;return c and c:FindFirstChild("HumanoidRootPart")end
local function hum(p)local c=p.Character;return c and c:FindFirstChildOfClass("Humanoid")end
local function feedback(p,k)p:SetAttribute("FeedbackEvent",k..":"..tostring(math.floor(os.clock()*1000)))end
local function msg(p,t)p:SetAttribute("LastAction",t)end
local function portalDef(id)for _,z in ipairs(C.Portals)do if z.Id==id then return z end end end

local function ppart(parent,name,size,pos,color,material)
 local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.Size=size;x.Position=pos;x.Color=color
 x.Material=material or Enum.Material.SmoothPlastic;x.TopSurface=Enum.SurfaceType.Smooth;x.BottomSurface=Enum.SurfaceType.Smooth;x.Parent=parent
 return x
end
local function attach(rootPart,name,size,offset,color,material,shape)
 local x=Instance.new("Part");x.Name=name;x.Size=size;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic
 x.CanCollide=false;x.Massless=true;x.Anchored=false;x.CFrame=rootPart.CFrame*CFrame.new(offset);if shape then x.Shape=shape end;x.Parent=rootPart
 local w=Instance.new("WeldConstraint");w.Part0=rootPart;w.Part1=x;w.Parent=x
 return x
end
local function stripAsset(root)
 for _,d in ipairs(root:GetDescendants())do
  if d:IsA("LuaSourceContainer")or d:IsA("Tool")or d:IsA("RemoteEvent")or d:IsA("RemoteFunction")then d:Destroy()
  elseif d:IsA("BasePart")then d.Anchored=true;d.CanTouch=false end
 end
 return root
end
local function loadAsset(id)
 if assetCache[id]then return assetCache[id]end
 local ok,result=pcall(AssetService.LoadAssetAsync,AssetService,id)
 if not ok or not result then return nil end
 stripAsset(result);result.Parent=nil;assetCache[id]=result;return result
end
local function chooseMesh(assetId,keywords,seed)
 local rootAsset=loadAsset(assetId);if not rootAsset then return nil end
 local preferred,all={},{}
 for _,d in ipairs(rootAsset:GetDescendants())do
  if d:IsA("MeshPart")then
   table.insert(all,d);local low=string.lower(d.Name)
   for _,k in ipairs(keywords)do if string.find(low,string.lower(k),1,true)then table.insert(preferred,d);break end end
  end
 end
 local pool=#preferred>0 and preferred or all;if #pool==0 then return nil end
 return pool[((seed or 1)-1)%#pool+1]
end
local function assetProp(parent,assetId,keywords,pos,scale,seed,collide)
 local t=chooseMesh(assetId,keywords,seed);if not t then return nil end
 local x=t:Clone();x.Name="AssetProp_"..t.Name;x.Anchored=true;x.CanCollide=collide==true;x.CanTouch=false;x.Size=x.Size*(scale or 1)
 x.CFrame=CFrame.new(pos)*CFrame.Angles(0,math.rad(((seed or 1)*41)%360),0);x.Parent=parent;return x
end
local function wholeAsset(parent,assetId,pos,scale,name)
 local t=loadAsset(assetId);if not t then return nil end
 local x=t:Clone();x.Name=name or("AssetModel_"..assetId);stripAsset(x);x.Parent=parent
 pcall(function()x:ScaleTo(scale or 1)end);pcall(function()x:PivotTo(CFrame.new(pos))end);return x
end
local function decorateVillageAssets(parent)
 task.spawn(function()
  for i=1,24 do
   local a=i/24*math.pi*2;local r=94+(i%3)*18
   assetProp(parent,ASSETS.Nature,{"tree","bush","flower","rock","log"},Vector3.new(math.cos(a)*r,2,math.sin(a)*r),.65+(i%4)*.08,i,false)
  end
  for i=1,12 do
   local a=i/12*math.pi*2
   assetProp(parent,ASSETS.City,{"bench","lamp","fence","trash","sign","table"},Vector3.new(math.cos(a)*58,2,math.sin(a)*58),.65,i,false)
  end
 end)
end
local function decorateZoneAssets(parent,z)
 task.spawn(function()
  local pack=(z.Theme=="MEADOW"or z.Theme=="SNOW")and ASSETS.Nature or ASSETS.Dungeon
  local keys=(pack==ASSETS.Nature)and{"tree","bush","rock","log","plant"}or{"rock","rune","pillar","wall","bridge","crate","barrel"}
  for i=1,34 do
   local a=i/34*math.pi*2;local r=72+(i%7)*20
   assetProp(parent,pack,keys,z.Center+Vector3.new(math.cos(a)*r,2,math.sin(a)*r),.7+(i%5)*.07,i,false)
  end
 end)
end

local function label(target,text,color,maxDistance)
 local g=Instance.new("BillboardGui");g.Name="WorldLabel";g.Size=UDim2.fromOffset(128,24);g.StudsOffset=Vector3.new(0,4.8,0)
 g.AlwaysOnTop=false;g.MaxDistance=maxDistance or 34;g.LightInfluence=.35;g.Parent=target
 local t=Instance.new("TextLabel");t.Size=UDim2.fromScale(1,1);t.BackgroundColor3=Color3.fromRGB(22,24,29);t.BackgroundTransparency=.28
 t.Text=text;t.TextColor3=color or Color3.new(1,1,1);t.TextStrokeTransparency=.72;t.TextScaled=true;t.Font=Enum.Font.GothamBold;t.Parent=g
 local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,5);c.Parent=t
 return g
end
local function prompt(target,objectText,actionText)
 local p=Instance.new("ProximityPrompt");p.ObjectText=objectText;p.ActionText=actionText;p.MaxActivationDistance=11;p.HoldDuration=.12
 p.RequiresLineOfSight=false;p.Parent=target;return p
end
local function humanoidFigure(parent,name,pos,color,accent,scale)
 scale=math.clamp(scale or 1,.74,1.04)
 local skin=Color3.fromRGB(224,190,154)
 local r=ppart(parent,name,Vector3.new(2.7,3.8,1.75)*scale,pos,color,Enum.Material.SmoothPlastic);r.CanCollide=true
 attach(r,"Neck",Vector3.new(.75,.45,.75)*scale,Vector3.new(0,2.15*scale,0),skin)
 attach(r,"Head",Vector3.new(2.15,2.15,2.15)*scale,Vector3.new(0,3.15*scale,0),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 attach(r,"Hair",Vector3.new(2.3,.62,2.3)*scale,Vector3.new(0,4.02*scale,.05*scale),Color3.fromRGB(55,43,38))
 attach(r,"ArmL",Vector3.new(.72,2.95,.72)*scale,Vector3.new(-1.68*scale,-.05*scale,0),color)
 attach(r,"ArmR",Vector3.new(.72,2.95,.72)*scale,Vector3.new(1.68*scale,-.05*scale,0),color)
 attach(r,"LegL",Vector3.new(.88,2.78,.88)*scale,Vector3.new(-.63*scale,-3.08*scale,0),accent)
 attach(r,"LegR",Vector3.new(.88,2.78,.88)*scale,Vector3.new(.63*scale,-3.08*scale,0),accent)
 attach(r,"EyeL",Vector3.new(.22,.24,.12)*scale,Vector3.new(-.4*scale,3.28*scale,-1.08*scale),Color3.fromRGB(25,28,34),Enum.Material.Neon)
 attach(r,"EyeR",Vector3.new(.22,.24,.12)*scale,Vector3.new(.4*scale,3.28*scale,-1.08*scale),Color3.fromRGB(25,28,34),Enum.Material.Neon)
 attach(r,"Belt",Vector3.new(2.85,.28,1.86)*scale,Vector3.new(0,-.76*scale,0),Color3.fromRGB(74,57,45),Enum.Material.Fabric)
 if name=="VillageChief"then
  attach(r,"ChiefCape",Vector3.new(2.9,3.1,.22)*scale,Vector3.new(0,.05*scale,.98*scale),Color3.fromRGB(92,56,43),Enum.Material.Fabric)
  attach(r,"ChiefHat",Vector3.new(2.9,.35,2.9)*scale,Vector3.new(0,4.5*scale,0),Color3.fromRGB(92,66,48),Enum.Material.Fabric)
 elseif name=="WeaponMerchant"then
  attach(r,"Sword",Vector3.new(.32,4.1,.32)*scale,Vector3.new(2.05*scale,-.25*scale,.25*scale),Color3.fromRGB(170,174,181),Enum.Material.Metal)
  attach(r,"SwordGuard",Vector3.new(1.35,.28,.35)*scale,Vector3.new(2.05*scale,1.2*scale,.25*scale),Color3.fromRGB(201,157,72),Enum.Material.Metal)
 elseif name=="ArmorMerchant"then
  attach(r,"ShoulderL",Vector3.new(1.15,.62,1.75)*scale,Vector3.new(-1.48*scale,1.2*scale,0),Color3.fromRGB(102,112,115),Enum.Material.Metal)
  attach(r,"ShoulderR",Vector3.new(1.15,.62,1.75)*scale,Vector3.new(1.48*scale,1.2*scale,0),Color3.fromRGB(102,112,115),Enum.Material.Metal)
 elseif name=="VillageHealer"then
  attach(r,"HealerHood",Vector3.new(2.55,1.15,2.55)*scale,Vector3.new(0,4.12*scale,.12*scale),Color3.fromRGB(184,211,226),Enum.Material.Fabric)
  attach(r,"HealerMark",Vector3.new(.35,1.65,.16)*scale,Vector3.new(0,.35*scale,-.96*scale),Color3.fromRGB(116,202,226),Enum.Material.Neon)
 elseif string.find(name,"Resident",1,true)or string.find(name,"AI_",1,true)then
  attach(r,"Vest",Vector3.new(2.28,2.45,.18)*scale,Vector3.new(0,.1*scale,-.98*scale),accent,Enum.Material.Fabric)
 end
 return r
end
local function tree(parent,pos,scale)
 scale=scale or 1
 local trunk=ppart(parent,"TreeTrunk",Vector3.new(2.2,8,2.2)*scale,pos+Vector3.new(0,4*scale,0),Color3.fromRGB(91,67,47),Enum.Material.Wood)
 local crown=ppart(parent,"TreeCrown",Vector3.new(7.5,7.5,7.5)*scale,trunk.Position+Vector3.new(0,6*scale,0),Color3.fromRGB(62,120,68),Enum.Material.Grass);crown.Shape=Enum.PartType.Ball
end
local function rock(parent,pos,scale,color)
 scale=scale or 1
 local r=ppart(parent,"Rock",Vector3.new(5,4,5)*scale,pos+Vector3.new(0,2*scale,0),color or Color3.fromRGB(92,91,96),Enum.Material.Rock)
 r.Orientation=Vector3.new(math.random(-10,10),math.random(0,180),math.random(-10,10))
end
local function teleportPlayer(p,pos)
 local r=root(p);if r then r.AssemblyLinearVelocity=Vector3.zero;r.CFrame=CFrame.new(pos+Vector3.new(0,4,0))end
end
local function setStats(p,heal)
 local level=n(p,"Level",1);local wt=n(p,"WeaponTier",1);local at=n(p,"ArmorTier",1)
 local maxHP=C.BaseMaxHP+(level-1)*C.LevelHPGain+(C.ArmorBonus[at]or 0)
 local attack=C.BaseAttack+(level-1)*C.LevelAttackGain+(C.WeaponBonus[wt]or 0)
 p:SetAttribute("MaxHP",maxHP);p:SetAttribute("AttackPower",attack)
 local h=hum(p);if h then h.MaxHealth=maxHP;if heal then h.Health=maxHP else h.Health=math.min(h.Health,maxHP)end end
end
local function grantXP(p,amount)
 local xp=n(p,"XP",0)+amount;local level=n(p,"Level",1);local leveled=false
 while xp>=level*100 do xp-=level*100;level+=1;leveled=true end
 p:SetAttribute("XP",xp);p:SetAttribute("Level",level)
 if leveled then setStats(p,true);msg(p,"레벨 "..level.." · 최대체력/공격력 +10");feedback(p,"LEVEL_UP")end
end
local SAVE={"Gold","XP","Level","WeaponTier","ArmorTier","QuestPortal","QuestKills","QuestNeed","RoomCode"}
local function init(p)
 p:SetAttribute("Gold",100);p:SetAttribute("XP",0);p:SetAttribute("Level",1);p:SetAttribute("WeaponTier",1);p:SetAttribute("ArmorTier",1)
 p:SetAttribute("CurrentZone",0);p:SetAttribute("InCombat",false);p:SetAttribute("QuestPortal",0);p:SetAttribute("QuestKills",0);p:SetAttribute("QuestNeed",0)
 p:SetAttribute("PartyCount",0);p:SetAttribute("PartyKills",0);p:SetAttribute("Contribution",0);p:SetAttribute("PartyHuntActive",false);p:SetAttribute("RoomCode",1)
 msg(p,"마을 이장에게 퀘스트를 받고 포탈로 이동해.")
 parties[p]={};clickTimes[p]={};setStats(p,true)
end
local function load(p)
 init(p)
 local ok,d=pcall(function()return store:GetAsync("p:"..p.UserId)end)
 if ok and typeof(d)=="table"then for _,k in ipairs(SAVE)do if d[k]~=nil then p:SetAttribute(k,d[k])end end end
 setStats(p,true)
end
local function save(p)
 local d={};for _,k in ipairs(SAVE)do d[k]=p:GetAttribute(k)end
 pcall(function()store:SetAsync("p:"..p.UserId,d)end)
end
local function updatePartyCount(p)
 local count=0;for _ in pairs(parties[p]or{})do count+=1 end;p:SetAttribute("PartyCount",count)
end
local function partyHas(p,id)return parties[p]and parties[p][id]==true end

local function makeVillage()
 local f=Instance.new("Folder");f.Name="Village";f.Parent=world
 ppart(f,"VillageGround",Vector3.new(300,2,300),Vector3.new(0,0,0),Color3.fromRGB(93,141,85),Enum.Material.Grass)
 ppart(f,"VillagePlaza",Vector3.new(96,2.3,96),Vector3.new(0,1.2,0),Color3.fromRGB(128,122,111),Enum.Material.Cobblestone)
 for _,z in ipairs({-112,-84,-56,56,84,112})do ppart(f,"MainRoad",Vector3.new(16,1,36),Vector3.new(0,1.15,z),Color3.fromRGB(119,105,88),Enum.Material.Cobblestone)end
 for i=1,12 do local a=i/12*math.pi*2;tree(f,Vector3.new(math.cos(a)*126,1,math.sin(a)*126),.9+(i%3)*.08)end
 for i=1,10 do
  local a=i/10*math.pi*2;local pos=Vector3.new(math.cos(a)*72,6,math.sin(a)*72)
  local h=ppart(f,"VillageHouse",Vector3.new(20,11,17),pos,Color3.fromRGB(145,108,76),Enum.Material.WoodPlanks)
  ppart(f,"VillageRoof",Vector3.new(23,2,20),h.Position+Vector3.new(0,6.5,0),Color3.fromRGB(78,68,73),Enum.Material.Slate)
  ppart(f,"HouseDoor",Vector3.new(4,7,.6),h.Position+Vector3.new(0,-1,-8.7),Color3.fromRGB(83,59,44),Enum.Material.Wood)
  local window=ppart(f,"HouseWindow",Vector3.new(4,3,.35),h.Position+Vector3.new(6,1,-8.9),Color3.fromRGB(128,191,209),Enum.Material.Glass);window.Transparency=.22
  ppart(f,"HouseChimney",Vector3.new(2.2,5,2.2),h.Position+Vector3.new(-6,8,3),Color3.fromRGB(91,78,72),Enum.Material.Brick)
 end
 for _,x in ipairs({-48,-24,24,48})do
  local pole=ppart(f,"VillageLamp",Vector3.new(1,8,1),Vector3.new(x,5,25),Color3.fromRGB(70,66,62),Enum.Material.Metal)
  local light=ppart(f,"VillageLampGlow",Vector3.new(2,2,2),pole.Position+Vector3.new(0,4,0),Color3.fromRGB(245,202,116),Enum.Material.Neon);light.CanCollide=false
  local pl=Instance.new("PointLight");pl.Color=light.Color;pl.Range=20;pl.Brightness=.75;pl.Parent=light
 end
 for i=1,4 do
  local stall=ppart(f,"MarketStall",Vector3.new(12,5,7),Vector3.new(-30+i*20,3.5,38),Color3.fromRGB(126,88,61),Enum.Material.WoodPlanks)
  ppart(f,"MarketAwning",Vector3.new(14,.6,9),stall.Position+Vector3.new(0,3.2,0),i%2==0 and Color3.fromRGB(164,74,67)or Color3.fromRGB(197,157,82),Enum.Material.Fabric)
 end
 decorateVillageAssets(f)
 local fountain=ppart(f,"Fountain",Vector3.new(14,3,14),Vector3.new(0,3,0),Color3.fromRGB(90,112,124),Enum.Material.Slate);label(fountain,"마을 광장",Color3.fromRGB(255,232,168),28)

 local chief=humanoidFigure(f,"VillageChief",Vector3.new(-18,6,10),Color3.fromRGB(142,98,68),Color3.fromRGB(80,67,54),1);label(chief,"이장",Color3.fromRGB(255,221,145),28)
 prompt(chief,"마을 이장","퀘스트 받기").Triggered:Connect(function(p)
  local level=n(p,"Level",1);local id=math.clamp(math.floor((level-1)/3)+1,1,5);local need=5+id
  p:SetAttribute("QuestPortal",id);p:SetAttribute("QuestKills",0);p:SetAttribute("QuestNeed",need)
  msg(p,string.format("%s 몬스터 %d마리 처치",C.Portals[id].Name,need))
 end)

 local weapon=humanoidFigure(f,"WeaponMerchant",Vector3.new(22,6,8),Color3.fromRGB(85,92,112),Color3.fromRGB(170,120,65),.95);label(weapon,"무기상인",Color3.fromRGB(255,215,140),28)
 prompt(weapon,"무기상인","다음 무기 구매").Triggered:Connect(function(p)
  local tier=n(p,"WeaponTier",1);if tier>=5 then msg(p,"최고급 무기 보유")return end
  local cost=C.WeaponPrices[tier+1];if n(p,"Gold",0)<cost then msg(p,"무기 구매 골드 부족 · "..cost)return end
  p:SetAttribute("Gold",n(p,"Gold",0)-cost);p:SetAttribute("WeaponTier",tier+1);setStats(p,false);msg(p,"무기 "..(tier+1).."단계 구매")
 end)
 local armor=humanoidFigure(f,"ArmorMerchant",Vector3.new(22,6,-10),Color3.fromRGB(92,112,102),Color3.fromRGB(80,91,77),.95);label(armor,"방어구상인",Color3.fromRGB(180,235,190),28)
 prompt(armor,"방어구상인","다음 방어구 구매").Triggered:Connect(function(p)
  local tier=n(p,"ArmorTier",1);if tier>=5 then msg(p,"최고급 방어구 보유")return end
  local cost=C.ArmorPrices[tier+1];if n(p,"Gold",0)<cost then msg(p,"방어구 구매 골드 부족 · "..cost)return end
  p:SetAttribute("Gold",n(p,"Gold",0)-cost);p:SetAttribute("ArmorTier",tier+1);setStats(p,true);msg(p,"방어구 "..(tier+1).."단계 구매")
 end)
 local healer=humanoidFigure(f,"VillageHealer",Vector3.new(-18,6,-10),Color3.fromRGB(208,221,235),Color3.fromRGB(116,169,193),.95);label(healer,"치유사",Color3.fromRGB(180,232,255),28)
 prompt(healer,"치유사","회복").Triggered:Connect(function(p)local h=hum(p);if h then h.Health=h.MaxHealth;msg(p,"체력 완전 회복")end end)

 for i=1,6 do
  local a=i/6*math.pi*2;local npc=humanoidFigure(f,"Resident"..i,Vector3.new(math.cos(a)*43,6,math.sin(a)*43),Color3.fromRGB(110+i*8,105+i*5,96+i*4),Color3.fromRGB(72,70,68),.82)
  label(npc,"주민",Color3.fromRGB(225,225,218),22)
 end

 local portalAngles={-80,-40,0,40,80}
 for i,z in ipairs(C.Portals)do
  local x=(i-3)*46
  local pad=ppart(f,"Portal"..i,Vector3.new(28,2,20),Vector3.new(x,2,-112),z.Color,Enum.Material.Neon)
  wholeAsset(f,ASSETS.StonePortal,pad.Position+Vector3.new(0,0,-2),.28,"StonePortalAsset"..i)
  ppart(f,"PortalArchL"..i,Vector3.new(3,18,3),pad.Position+Vector3.new(-11,10,0),z.Color,Enum.Material.Slate)
  ppart(f,"PortalArchR"..i,Vector3.new(3,18,3),pad.Position+Vector3.new(11,10,0),z.Color,Enum.Material.Slate)
  label(pad,i.." · "..z.Name,z.Color,48)
  prompt(pad,z.Name,"포탈 입장").Triggered:Connect(function(p)
   p:SetAttribute("CurrentZone",z.Id);p:SetAttribute("InCombat",false);lastCombat[p]=0
   teleportPlayer(p,z.Center+Vector3.new(0,0,170));msg(p,z.Name.." 입장")
   if n(p,"PartyCount",0)>0 then p:SetAttribute("PartyHuntActive",true);p:SetAttribute("PartyKills",0);p:SetAttribute("Contribution",0)end
  end)
 end
end

local function themedProp(f,z,i)
 local a=i/24*math.pi*2;local r=115+(i%5)*17;local pos=z.Center+Vector3.new(math.cos(a)*r,0,math.sin(a)*r)
 if z.Theme=="MEADOW"then tree(f,pos,.8+(i%3)*.12)
 elseif z.Theme=="CANYON"then rock(f,pos,1+(i%3)*.2,Color3.fromRGB(147,86,63))
 elseif z.Theme=="RUINS"then
  local p=ppart(f,"RuinPillar",Vector3.new(5,8+(i%4)*4,5),pos+Vector3.new(0,6,0),Color3.fromRGB(86,82,99),Enum.Material.Slate)
  if i%4==0 then local c=ppart(f,"RuneCrystal",Vector3.new(2.5,7,2.5),p.Position+Vector3.new(0,8,0),z.Color,Enum.Material.Neon);c.Orientation=Vector3.new(0,i*17,20)end
 elseif z.Theme=="SNOW"then
  tree(f,pos,.72+(i%2)*.1);local s=ppart(f,"SnowPatch",Vector3.new(12,.5,9),pos+Vector3.new(4,.7,3),Color3.fromRGB(221,235,241),Enum.Material.Snow)
 elseif z.Theme=="ABYSS"then
  local ob=ppart(f,"AbyssObelisk",Vector3.new(5,13+(i%3)*4,5),pos+Vector3.new(0,7,0),Color3.fromRGB(58,48,72),Enum.Material.Slate)
  local glow=ppart(f,"AbyssRune",Vector3.new(2,4,.6),ob.Position+Vector3.new(0,1,-2.8),z.Color,Enum.Material.Neon);glow.CanCollide=false
 end
end
local function makeZone(z)
 local f=Instance.new("Folder");f.Name="Zone"..z.Id;f.Parent=world
 local groundColor=z.Theme=="MEADOW"and Color3.fromRGB(75,126,67)or z.Theme=="CANYON"and Color3.fromRGB(136,83,60)or z.Theme=="RUINS"and Color3.fromRGB(74,70,86)or z.Theme=="SNOW"and Color3.fromRGB(188,211,220)or Color3.fromRGB(49,43,62)
 local material=z.Theme=="MEADOW"and Enum.Material.Grass or z.Theme=="CANYON"and Enum.Material.Sand or z.Theme=="SNOW"and Enum.Material.Snow or Enum.Material.Slate
 ppart(f,"ZoneGround",Vector3.new(440,2,440),z.Center+Vector3.new(0,0,0),groundColor,material)
 ppart(f,"ZoneInnerRoad",Vector3.new(22,1,330),z.Center+Vector3.new(0,1,0),Color3.fromRGB(105,100,94),Enum.Material.Cobblestone)
 for i=1,28 do themedProp(f,z,i)end
 for i=1,8 do
  local a=i/8*math.pi*2;local lamp=ppart(f,"Guide"..i,Vector3.new(1.2,8,1.2),z.Center+Vector3.new(math.cos(a)*86,5,math.sin(a)*86),Color3.fromRGB(75,73,76),Enum.Material.Metal)
  local glow=ppart(f,"GuideGlow"..i,Vector3.new(2.2,2.2,2.2),lamp.Position+Vector3.new(0,5,0),z.Color,Enum.Material.Neon);glow.CanCollide=false
 end
 decorateZoneAssets(f,z)
 local ret=ppart(f,"ReturnPortal",Vector3.new(26,2,18),z.Center+Vector3.new(0,2,190),Color3.fromRGB(112,180,205),Enum.Material.Neon);label(ret,"마을 귀환",Color3.fromRGB(180,235,255),36)
 prompt(ret,"마을","귀환").Triggered:Connect(function(p)
  local combat=os.clock()-(lastCombat[p]or 0)<C.CombatLockSeconds
  if combat or p:GetAttribute("InCombat")==true then msg(p,"전투 중에는 마을로 돌아갈 수 없어")return end
  p:SetAttribute("CurrentZone",0);p:SetAttribute("PartyHuntActive",false);teleportPlayer(p,C.VillageCenter);local h=hum(p);if h then h.Health=h.MaxHealth end;msg(p,"마을 귀환 · 체력 회복")
 end)
 if z.Boss then
  local arena=ppart(f,"BossArena",Vector3.new(96,1,96),z.Center+Vector3.new(0,1,-86),Color3.fromRGB(73,60,82),Enum.Material.Slate)
  for i=1,8 do local a=i/8*math.pi*2;ppart(f,"BossPillar",Vector3.new(4,15,4),arena.Position+Vector3.new(math.cos(a)*39,8,math.sin(a)*39),z.Color,Enum.Material.Slate)end
 end
end

local function enemyModel(parent,z,pos,boss)
 local rootPart=ppart(parent,boss and(z.Boss.Name)or z.Enemy,boss and Vector3.new(6.4,7.4,4.6)or Vector3.new(3.7,4.4,2.7),pos,boss and Color3.fromRGB(66,44,82)or z.Color,boss and Enum.Material.Slate or Enum.Material.SmoothPlastic)
 local scale=boss and 1.35 or 1
 attach(rootPart,"EnemyHead",Vector3.new(2.55,2.35,2.55)*scale,Vector3.new(0,3.3*scale,-.28),boss and Color3.fromRGB(100,72,120)or z.Color,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 attach(rootPart,"EnemyEyeL",Vector3.new(.3,.34,.18)*scale,Vector3.new(-.52,3.45*scale,-1.52*scale),Color3.fromRGB(255,208,96),Enum.Material.Neon)
 attach(rootPart,"EnemyEyeR",Vector3.new(.3,.34,.18)*scale,Vector3.new(.52,3.45*scale,-1.52*scale),Color3.fromRGB(255,208,96),Enum.Material.Neon)
 attach(rootPart,"EnemyArmL",Vector3.new(.78,3.1,.78)*scale,Vector3.new(-2.05*scale,0,0),rootPart.Color)
 attach(rootPart,"EnemyArmR",Vector3.new(.78,3.1,.78)*scale,Vector3.new(2.05*scale,0,0),rootPart.Color)
 attach(rootPart,"EnemyLegL",Vector3.new(.9,2.75,.9)*scale,Vector3.new(-.72*scale,-3.25*scale,0),Color3.fromRGB(50,50,55))
 attach(rootPart,"EnemyLegR",Vector3.new(.9,2.75,.9)*scale,Vector3.new(.72*scale,-3.25*scale,0),Color3.fromRGB(50,50,55))
 if z.Theme=="MEADOW"and not boss then
  attach(rootPart,"WolfMuzzle",Vector3.new(1.8,1.2,1.7),Vector3.new(0,3,-2),Color3.fromRGB(104,92,79),Enum.Material.SmoothPlastic)
  attach(rootPart,"WolfEarL",Vector3.new(.65,1.35,.55),Vector3.new(-.8,5,0),Color3.fromRGB(82,73,66),Enum.Material.Fabric)
  attach(rootPart,"WolfEarR",Vector3.new(.65,1.35,.55),Vector3.new(.8,5,0),Color3.fromRGB(82,73,66),Enum.Material.Fabric)
  attach(rootPart,"WolfTail",Vector3.new(.55,2.6,.55),Vector3.new(0,-.6,2),Color3.fromRGB(82,73,66),Enum.Material.Fabric)
 elseif z.Theme=="CANYON"and not boss then
  attach(rootPart,"BanditHood",Vector3.new(2.9,1.15,2.9),Vector3.new(0,4.1,.1),Color3.fromRGB(84,56,45),Enum.Material.Fabric)
  attach(rootPart,"BanditBlade",Vector3.new(.25,3.2,.3),Vector3.new(2.3,-.2,-.3),Color3.fromRGB(169,169,174),Enum.Material.Metal)
 elseif z.Theme=="RUINS"and not boss then
  attach(rootPart,"GolemShoulderL",Vector3.new(1.8,1.6,1.8),Vector3.new(-2.1,1.25,0),Color3.fromRGB(83,79,94),Enum.Material.Rock)
  attach(rootPart,"GolemShoulderR",Vector3.new(1.8,1.6,1.8),Vector3.new(2.1,1.25,0),Color3.fromRGB(83,79,94),Enum.Material.Rock)
  attach(rootPart,"GolemCore",Vector3.new(1.1,1.1,.35),Vector3.new(0,.6,-1.5),z.Color,Enum.Material.Neon,Enum.PartType.Ball)
 elseif z.Theme=="SNOW"and not boss then
  attach(rootPart,"BeastFur",Vector3.new(4.3,2.25,3.05),Vector3.new(0,.9,.2),Color3.fromRGB(220,231,235),Enum.Material.Fabric)
  attach(rootPart,"BeastMuzzle",Vector3.new(2.05,1.35,1.7),Vector3.new(0,3,-2),Color3.fromRGB(118,142,151),Enum.Material.SmoothPlastic)
  attach(rootPart,"BeastEarL",Vector3.new(.7,1.45,.6),Vector3.new(-.9,4.95,0),Color3.fromRGB(115,137,146),Enum.Material.Fabric)
  attach(rootPart,"BeastEarR",Vector3.new(.7,1.45,.6),Vector3.new(.9,4.95,0),Color3.fromRGB(115,137,146),Enum.Material.Fabric)
  attach(rootPart,"BeastClawL",Vector3.new(.95,.42,1.55),Vector3.new(-2.05,-1.65,-.8),Color3.fromRGB(225,235,240),Enum.Material.SmoothPlastic)
  attach(rootPart,"BeastClawR",Vector3.new(.95,.42,1.55),Vector3.new(2.05,-1.65,-.8),Color3.fromRGB(225,235,240),Enum.Material.SmoothPlastic)
 elseif z.Theme=="ABYSS"and not boss then
  attach(rootPart,"KnightShoulderL",Vector3.new(1.5,.75,1.8),Vector3.new(-2,1.25,0),Color3.fromRGB(57,52,67),Enum.Material.Metal)
  attach(rootPart,"KnightShoulderR",Vector3.new(1.5,.75,1.8),Vector3.new(2,1.25,0),Color3.fromRGB(57,52,67),Enum.Material.Metal)
  attach(rootPart,"AbyssBlade",Vector3.new(.35,4.2,.45),Vector3.new(2.45,-.1,-.25),z.Color,Enum.Material.Neon)
 end
 if boss then
  attach(rootPart,"BossHornL",Vector3.new(.8,4,.8),Vector3.new(-1.7,7,0),z.Color,Enum.Material.Neon)
  attach(rootPart,"BossHornR",Vector3.new(.8,4,.8),Vector3.new(1.7,7,0),z.Color,Enum.Material.Neon)
  attach(rootPart,"BossCore",Vector3.new(1.4,1.4,.4),Vector3.new(0,1,-2.45),z.Color,Enum.Material.Neon,Enum.PartType.Ball)
 end
 label(rootPart,boss and("BOSS · "..z.Boss.Name)or z.Enemy,boss and Color3.fromRGB(255,198,105)or Color3.new(1,1,1),boss and 58 or 32)
 return rootPart
end
local function spawnEnemy(z,boss,index)
 local parent=world:FindFirstChild("Zone"..z.Id);if not parent then return end
 local a=(index or math.random(1,100))/10*math.pi*2
 local radius=boss and 86 or 55+((index or math.random(1,8))%5)*24
 local spawn=z.Center+Vector3.new(math.cos(a)*radius,boss and 6 or 4,math.sin(a)*radius)
 if boss then spawn=z.Center+Vector3.new(0,6,-86)end
 local part=enemyModel(parent,z,spawn,boss)
 local hp=boss and z.Boss.HP or z.EnemyHP
 local e={part=part,zone=z.Id,hp=hp,max=hp,damage=boss and z.Boss.Damage or z.EnemyDamage,gold=boss and z.Boss.Gold or z.RewardGold,xp=boss and z.Boss.XP or z.RewardXP,spawn=spawn,boss=boss,lastAttack=0,target=nil}
 part:SetAttribute("HP",hp);part:SetAttribute("MaxHP",hp);part:SetAttribute("Zone",z.Id);table.insert(enemies,e);return e
end
local function nearestEnemy(pos,zone,range)
 local best,bd=nil,range
 for _,e in ipairs(enemies)do if e.hp>0 and e.zone==zone and e.part.Parent then local d=(e.part.Position-pos).Magnitude;if d<bd then best=e;bd=d end end end
 return best
end

local function completeQuestIfNeeded(p,zone)
 if n(p,"QuestPortal",0)~=zone then return end
 local kills=n(p,"QuestKills",0)+1;p:SetAttribute("QuestKills",kills)
 local need=n(p,"QuestNeed",0)
 if need>0 and kills>=need then
  local rewardGold=C.QuestBaseGold+(zone-1)*25;local rewardXP=C.QuestBaseXP+(zone-1)*30
  p:SetAttribute("Gold",n(p,"Gold",0)+rewardGold);grantXP(p,rewardXP);p:SetAttribute("QuestPortal",0);p:SetAttribute("QuestNeed",0)
  msg(p,string.format("퀘스트 완료 · 골드 %d / 경험치 %d",rewardGold,rewardXP));feedback(p,"QUEST")
 end
end
local function partyKill(p,contribution)
 if p:GetAttribute("PartyHuntActive")~=true then return end
 local kills=n(p,"PartyKills",0)+1;p:SetAttribute("PartyKills",kills);p:SetAttribute("Contribution",n(p,"Contribution",0)+contribution)
 if kills>=C.PartyHuntTarget then
  local c=n(p,"Contribution",0);local rewardGold=80+c*5;local rewardXP=80+c*6
  p:SetAttribute("Gold",n(p,"Gold",0)+rewardGold);grantXP(p,rewardXP);p:SetAttribute("PartyHuntActive",false)
  msg(p,string.format("파티 사냥 완료 · 기여도 %d · 골드 %d / 경험치 %d",c,rewardGold,rewardXP));feedback(p,"PARTY_COMPLETE")
 end
end
local function killEnemy(p,e,contribution)
 if e.hp>0 then return end
 local z=portalDef(e.zone);if e.part.Parent then e.part:Destroy()end
 p:SetAttribute("Gold",n(p,"Gold",0)+e.gold);grantXP(p,e.xp);completeQuestIfNeeded(p,e.zone);partyKill(p,contribution or 2)
 msg(p,(e.boss and"보스 격파 · "or"처치 · ")..(e.boss and z.Boss.Name or z.Enemy));feedback(p,e.boss and"BOSS_KILL"or"KILL")
 task.delay(e.boss and 18 or 8,function()if world and world.Parent then spawnEnemy(z,e.boss,math.random(1,80))end end)
end
local function playerAttack(p,skill)
 local zone=n(p,"CurrentZone",0);if zone==0 then msg(p,"포탈을 타고 사냥터로 이동해")return end
 local r=root(p);if not r then return end;local range=skill and 25 or 15;local e=nearestEnemy(r.Position,zone,range);if not e then msg(p,"사거리 안에 몬스터가 없어")return end
 local damage=n(p,"AttackPower",10)*(skill and 2.15 or 1);e.hp-=damage;e.part:SetAttribute("HP",math.max(0,e.hp));lastCombat[p]=os.clock();p:SetAttribute("InCombat",true);feedback(p,skill and"SKILL"or"ATTACK")
 if e.hp<=0 then killEnemy(p,e,skill and 3 or 2)end
 local stamp=lastCombat[p];task.delay(C.CombatLockSeconds,function()if p.Parent and lastCombat[p]==stamp then p:SetAttribute("InCombat",false)end end)
end

local function makeAI()
 local f=Instance.new("Folder");f.Name="AIUsers";f.Parent=world
 local colors={NONE=Color3.fromRGB(128,128,133),HEALER=Color3.fromRGB(191,222,234),WARRIOR=Color3.fromRGB(164,91,67),ARCHER=Color3.fromRGB(80,145,88)}
 for i,def in ipairs(C.AIUsers)do
  local angle=i/#C.AIUsers*math.pi*2;local part=humanoidFigure(f,"AI_"..def.Name,Vector3.new(math.cos(angle)*58,6,math.sin(angle)*58),colors[def.Class],Color3.fromRGB(62,58,55),.82)
  label(part,def.Name.." · "..(def.Class=="NONE"and"무직"or def.Class=="HEALER"and"힐러"or def.Class=="WARRIOR"and"전사"or"궁수"),Color3.fromRGB(240,240,234),26)
  local cd=Instance.new("ClickDetector");cd.MaxActivationDistance=18;cd.Parent=part
  local ai={id=i,def=def,part=part,zone=0,gold=70,weaponTier=1,hp=100,lastAttack=0}
  table.insert(aiUsers,ai)
  cd.MouseClick:Connect(function(p)
   clickTimes[p]=clickTimes[p]or{};local now=os.clock();local last=clickTimes[p][i]or 0;clickTimes[p][i]=now
   if now-last>.55 then msg(p,def.Name.." · 한 번 더 눌러 파티 초대/제외")return end
   parties[p]=parties[p]or{}
   if parties[p][i]then parties[p][i]=nil;msg(p,def.Name.." 파티에서 제외")
   else
    local count=0;for _ in pairs(parties[p])do count+=1 end
    if count>=C.PartySlots-1 then msg(p,"AI 파티 슬롯이 가득 찼어")return end
    parties[p][i]=true;msg(p,def.Name.." 파티 참가")
   end
   updatePartyCount(p)
  end)
 end
end

local function buildWorld()
 local old=workspace:FindFirstChild("DaechungRPGWorld");if old then old:Destroy()end
 world=Instance.new("Folder");world.Name="DaechungRPGWorld";world.Parent=workspace
 Lighting.Brightness=2.2;Lighting.ClockTime=13.5;Lighting.FogEnd=1400;Lighting.Ambient=Color3.fromRGB(132,136,145);Lighting.OutdoorAmbient=Color3.fromRGB(145,150,160)
 makeVillage();for _,z in ipairs(C.Portals)do makeZone(z)end;makeAI()
 for _,z in ipairs(C.Portals)do for i=1,10 do spawnEnemy(z,false,i)end;if z.Boss then spawnEnemy(z,true,1)end end
 workspace:SetAttribute("WorldArtPass","RPG_FIVE_PORTAL_VISUAL_WORLD_V3")
end

remote.OnServerEvent:Connect(function(p,a)
 if typeof(a)~="string"then return end
 local now=os.clock();if now-(lastRequest[p]or 0)<C.RemoteMinInterval then return end;lastRequest[p]=now
 if a==C.Actions.ATTACK then playerAttack(p,false)
 elseif a==C.Actions.SKILL then playerAttack(p,true)
 elseif a==C.Actions.DODGE then local r=root(p);if r then r.AssemblyLinearVelocity=r.CFrame.LookVector*52+Vector3.new(0,r.AssemblyLinearVelocity.Y,0)end
 elseif a==C.Actions.RETURN_VILLAGE then
  if os.clock()-(lastCombat[p]or 0)<C.CombatLockSeconds or p:GetAttribute("InCombat")==true then msg(p,"전투 중에는 마을 귀환 불가")return end
  p:SetAttribute("CurrentZone",0);p:SetAttribute("PartyHuntActive",false);teleportPlayer(p,C.VillageCenter);setStats(p,true);msg(p,"마을 귀환 · 체력 완전 회복")
 elseif a==C.Actions.NEXT_ROOM_CODE then local code=n(p,"RoomCode",1)%10+1;p:SetAttribute("RoomCode",code);msg(p,"멀티 코드 "..code)
 end
end)

Players.PlayerAdded:Connect(function(p)
 load(p)
 p.CharacterAdded:Connect(function()
  task.wait(.35);setStats(p,true);p:SetAttribute("CurrentZone",0);teleportPlayer(p,C.VillageCenter)
 end)
 if p.Character then task.defer(function()task.wait(.35);setStats(p,true);teleportPlayer(p,C.VillageCenter)end)end
end)
for _,p in ipairs(Players:GetPlayers())do load(p)end
Players.PlayerRemoving:Connect(function(p)save(p);parties[p]=nil;clickTimes[p]=nil;lastRequest[p]=nil;lastCombat[p]=nil;qaCaptureLast[p]=nil end)
game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)

qaCaptureRemote.OnServerEvent:Connect(function(p,labelName,value)
 if C.QACameraEnabled~=true then return end;if typeof(labelName)~="string"then return end
 local raw=tostring(value or"");if #raw<1 or #raw>160 then return end;local isStatus=labelName=="STATUS";if not isStatus and not raw:match("^%d+$")then return end
 local now=os.clock();if now-(qaCaptureLast[p]or 0)<.18 then return end;qaCaptureLast[p]=now
 local rec={gameId=C.GameId,label=labelName,userId=p.UserId,capturedAt=os.time(),kind=isStatus and"STATUS"or"CAPTURE"}
 if isStatus then rec.status=raw else rec.assetId=raw end
 pcall(function()qaCaptureStore:UpdateAsync("latest",function(old)local d=typeof(old)=="table"and old or{captures={}};d.captures=typeof(d.captures)=="table"and d.captures or{};table.insert(d.captures,rec);while #d.captures>30 do table.remove(d.captures,1)end;d.updatedAt=os.time();d.gameId=C.GameId;return d end)end)
end)

buildWorld()

RunService.Heartbeat:Connect(function(dt)
 local now=os.clock()
 -- 몬스터: 같은 지역 플레이어만 추적, 일정 거리 밖이면 원위치로 돌아간다.
 for _,e in ipairs(enemies)do
  if e.hp>0 and e.part.Parent then
   local z=portalDef(e.zone);local target,bd=nil,z.Aggro
   for _,p in ipairs(Players:GetPlayers())do
    if n(p,"CurrentZone",0)==e.zone then local r=root(p);local h=hum(p);if r and h and h.Health>0 then local d=(r.Position-e.part.Position).Magnitude;if d<bd then target=p;bd=d end end end
   end
   if target then
    local tr=root(target);local d=tr and Vector3.new(tr.Position.X-e.part.Position.X,0,tr.Position.Z-e.part.Position.Z)
    if d and d.Magnitude>4 then e.part.CFrame=e.part.CFrame+ d.Unit*math.min(d.Magnitude,(e.boss and 9 or 7)*dt)end
    if tr and(tr.Position-e.part.Position).Magnitude<=5.5 and now-e.lastAttack>1.15 then
     e.lastAttack=now;local h=hum(target);if h then h:TakeDamage(e.damage)end;lastCombat[target]=now;target:SetAttribute("InCombat",true)
    end
   else
    local back=Vector3.new(e.spawn.X-e.part.Position.X,0,e.spawn.Z-e.part.Position.Z)
    if back.Magnitude>2 then e.part.CFrame=e.part.CFrame+back.Unit*math.min(back.Magnitude,9*dt)end
   end
   if (e.part.Position-e.spawn).Magnitude>z.Leash then e.part.CFrame=CFrame.new(e.spawn)end
  end
 end

 -- AI 유저 10명: 파티 AI는 플레이어를 따라가고, 나머지는 사냥터를 순환한다.
 for _,ai in ipairs(aiUsers)do
  if ai.part.Parent then
   local leader=nil
   for _,p in ipairs(Players:GetPlayers())do if partyHas(p,ai.id)then leader=p;break end end
   if leader then
    local zone=n(leader,"CurrentZone",0);ai.zone=zone
    local lr=root(leader);if lr then
     local desired=lr.Position+Vector3.new((ai.id%3-1)*5,0,7+(ai.id%2)*3);local d=Vector3.new(desired.X-ai.part.Position.X,0,desired.Z-ai.part.Position.Z)
     if d.Magnitude>2 then ai.part.CFrame=ai.part.CFrame+d.Unit*math.min(d.Magnitude,13*dt)end
    end
    if ai.def.Class=="HEALER"then
     local h=hum(leader);if h and h.Health<h.MaxHealth and now-ai.lastAttack>1.3 then ai.lastAttack=now;h.Health=math.min(h.MaxHealth,h.Health+10)end
    elseif zone>0 then
     local range=ai.def.Class=="ARCHER"and 24 or 11;local e=nearestEnemy(ai.part.Position,zone,range)
     if e and now-ai.lastAttack>(ai.def.Class=="WARRIOR"and .7 or 1.0)then
      ai.lastAttack=now;local dmg=ai.def.Class=="WARRIOR"and 18 or ai.def.Class=="ARCHER"and 15 or 8;e.hp-=dmg;e.part:SetAttribute("HP",math.max(0,e.hp))
      if e.hp<=0 then killEnemy(leader,e,1)end
     end
    end
   else
    if ai.zone==0 and math.random()<.002 then ai.zone=math.random(1,5);local z=portalDef(ai.zone);ai.part.CFrame=CFrame.new(z.Center+Vector3.new(math.random(-120,120),5,math.random(-120,120)))end
    if ai.zone>0 then
     local e=nearestEnemy(ai.part.Position,ai.zone,20)
     if e and ai.def.Class~="HEALER" and now-ai.lastAttack>1.1 then ai.lastAttack=now;e.hp-=8+ai.weaponTier*3;e.part:SetAttribute("HP",math.max(0,e.hp));if e.hp<=0 then e.part:Destroy()end end
     ai.gold+=dt*.3;if ai.weaponTier<5 and ai.gold>=C.WeaponPrices[ai.weaponTier+1]then ai.gold-=C.WeaponPrices[ai.weaponTier+1];ai.weaponTier+=1 end
     if math.random()<.001 then ai.zone=0;ai.part.CFrame=CFrame.new(math.random(-60,60),6,math.random(-60,60))end
    end
   end
  end
 end

 for _,p in ipairs(Players:GetPlayers())do
  local zone=n(p,"CurrentZone",0)
  if zone==0 then local h=hum(p);if h and h.Health<h.MaxHealth then h.Health=math.min(h.MaxHealth,h.Health+25*dt)end end
  if p:GetAttribute("InCombat")==true and now-(lastCombat[p]or 0)>=C.CombatLockSeconds then p:SetAttribute("InCombat",false)end
 end
 for i=#enemies,1,-1 do if enemies[i].hp<=0 or not enemies[i].part.Parent then table.remove(enemies,i)end end
end)
