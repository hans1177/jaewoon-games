local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local Lighting=game:GetService("Lighting")
local AssetService=game:GetService("AssetService")
local Shared=RS:WaitForChild("Shared")
local C=require(Shared:WaitForChild("GameConfig"))
local Style=require(Shared:WaitForChild("VisualStyle"))
local store=DSS:GetDataStore("midnight-tag-v3")
local remote=RS:FindFirstChild(C.RemoteName)or Instance.new("RemoteEvent")
remote.Name=C.RemoteName;remote.Parent=RS
local qaCaptureStore=DSS:GetDataStore("qa-camera-captures-v1")
local qaCaptureRemote=RS:FindFirstChild(C.QACaptureRemoteName or "QACaptureReport")or Instance.new("RemoteEvent")
qaCaptureRemote.Name=C.QACaptureRemoteName or "QACaptureReport";qaCaptureRemote.Parent=RS
local qaCaptureLast={}


local state="WAITING"
local timeLeft=0
local monster=nil
local monsterBot=nil
local forced=false
local lastMonster=0
local bots={}
local cooldown={}
local dashCooldown={}
local arena=nil
local currentMapIndex=0
local lastRequest={}
local lastValidPosition={}
local movementGraceUntil={}
local movementGuardClock=0
local soloStartRequested=false
local tagGraceUntil={}
local allowedActions={}
for _,action in pairs(C.Actions)do allowedActions[action]=true end

local survivorSpawns={
 Vector3.new(-126,3,-118),Vector3.new(126,3,-118),Vector3.new(-126,3,118),
 Vector3.new(126,3,118),Vector3.new(0,3,126),Vector3.new(0,3,-96)
}
local monsterSpawn=Vector3.new(0,3,-150)
local assetCache={}
local objectiveState={round=0,done=0,total=0}
local escapedPlayers={}

local function root(p)local c=p.Character;return c and c:FindFirstChild("HumanoidRootPart")end
local function hum(p)local c=p.Character;return c and c:FindFirstChildOfClass("Humanoid")end
local function restoreMovement(p,v)
 local h=hum(p);local r=root(p)
 if r then r.Anchored=false end
 if h then
  h.PlatformStand=false;h.Sit=false;h.AutoRotate=true;h.WalkSpeed=v
  h.JumpPower=50;h.JumpHeight=7.2
 end
end
local function speed(p,v)restoreMovement(p,v)end
local function form(p)
 local id=p:GetAttribute("MonsterForm")or"DRAK"
 for _,f in ipairs(C.MonsterForms)do if f.Id==id then return f end end
 return C.MonsterForms[1]
end
local function load(p)
 p:SetAttribute("MonsterPreference","ANY");p:SetAttribute("SoloRole","SURVIVOR")
 p:SetAttribute("MonsterXP",0);p:SetAttribute("Coins",0);p:SetAttribute("RoundsSinceMonster",0)
 p:SetAttribute("MonsterForm","DRAK");p:SetAttribute("Role","WAITING");p:SetAttribute("Frozen",false)
 p:SetAttribute("RoundState","WAITING");p:SetAttribute("TimeLeft",0)
 p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
 p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"맵 준비")
 local ok,d=pcall(function()return store:GetAsync("p:"..p.UserId)end)
 if ok and typeof(d)=="table"then
  for _,k in ipairs({"MonsterXP","Coins","RoundsSinceMonster"})do if typeof(d[k])=="number"then p:SetAttribute(k,d[k])end end
  if typeof(d.MonsterForm)=="string"then p:SetAttribute("MonsterForm",d.MonsterForm)end
 end
end
local function save(p)
 pcall(function()store:SetAsync("p:"..p.UserId,{
  MonsterXP=p:GetAttribute("MonsterXP")or 0,Coins=p:GetAttribute("Coins")or 0,
  RoundsSinceMonster=p:GetAttribute("RoundsSinceMonster")or 0,MonsterForm=p:GetAttribute("MonsterForm")or"DRAK"
 })end)
end
local function arenaPart(f,name,size,pos,color,material)
 local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.Size=size;x.Position=pos;x.Color=color
 x.Material=material or Enum.Material.SmoothPlastic;x.Parent=f;return x
end
local function glow(part,color,range,brightness)
 local l=Instance.new("PointLight");l.Color=color;l.Range=range or 22;l.Brightness=brightness or 1.4;l.Shadows=true;l.Parent=part;return l
end
local function zoneFloor(f,name,size,pos,color,material)
 local x=arenaPart(f,name,size,pos,color,material);x.CanCollide=true;return x
end

local function stripLoadedAsset(root)
 for _,d in ipairs(root:GetDescendants())do
  if d:IsA("LuaSourceContainer")or d:IsA("Tool")or d:IsA("RemoteEvent")or d:IsA("RemoteFunction")then
   d:Destroy()
  elseif d:IsA("BasePart")then
   d.Anchored=true;d.CanTouch=false
  end
 end
 return root
end
local function loadOfficialAsset(id)
 if assetCache[id]then return assetCache[id]end
 local ok,result=pcall(AssetService.LoadAssetAsync,AssetService,id)
 if not ok or not result then return nil end
 stripLoadedAsset(result);result.Parent=nil;assetCache[id]=result
 return result
end
local function matchingMesh(root,keywords,seed)
 if not root then return nil end
 local candidates={}
 for _,d in ipairs(root:GetDescendants())do
  if d:IsA("MeshPart")then
   local name=string.lower(d.Name)
   for _,key in ipairs(keywords)do
    if string.find(name,string.lower(key),1,true)then table.insert(candidates,d);break end
   end
  end
 end
 if #candidates==0 then return nil end
 return candidates[((seed or 1)-1)%#candidates+1]
end
local function spawnOfficialProp(assetId,keywords,parent,pos,scale,seed,collide)
 local rootAsset=loadOfficialAsset(assetId);local template=matchingMesh(rootAsset,keywords,seed)
 if not template then return nil end
 local x=template:Clone();x.Name="Asset_"..template.Name;x.Anchored=true;x.CanCollide=collide==true;x.CanTouch=false
 x.Size=x.Size*(scale or 1);x.CFrame=CFrame.new(pos)*CFrame.Angles(0,math.rad(((seed or 1)*47)%360),0);x.Parent=parent
 return x
end
local function cloneWholeAsset(assetId,parent,pos,scale)
 local template=loadOfficialAsset(assetId);if not template then return nil end
 local clone=template:Clone();clone.Name="OfficialAsset_"..assetId;stripLoadedAsset(clone);clone.Parent=parent
 pcall(function()clone:ScaleTo(scale or 1)end);pcall(function()clone:PivotTo(CFrame.new(pos))end)
 return clone
end
local function addObjectiveStation(f,name,pos,index)
 local base=arenaPart(f,"Objective_"..name,Vector3.new(7,5,4),pos,Color3.fromRGB(70,79,87),Enum.Material.Metal)
 local screen=arenaPart(f,"ObjectiveScreen_"..name,Vector3.new(4.6,2.2,.35),pos+Vector3.new(0,.5,-2.2),Color3.fromRGB(91,201,176),Enum.Material.Neon);screen.CanCollide=false
 local prompt=Instance.new("ProximityPrompt");prompt.Name="ObjectivePrompt";prompt.ObjectText=name;prompt.ActionText="작동";prompt.HoldDuration=1.2;prompt.MaxActivationDistance=10;prompt.RequiresLineOfSight=false;prompt.Parent=base
 base:SetAttribute("ObjectiveIndex",index);base:SetAttribute("Completed",false)
 prompt.Triggered:Connect(function(p)
  if state~="RUNNING"or p:GetAttribute("Role")~="SURVIVOR"or p:GetAttribute("Frozen")==true or base:GetAttribute("Completed")==true then return end
  base:SetAttribute("Completed",true);prompt.Enabled=false;screen.Color=Color3.fromRGB(98,235,125)
  objectiveState.done+=1
  for _,player in ipairs(Players:GetPlayers())do
   player:SetAttribute("ObjectivesDone",objectiveState.done);player:SetAttribute("ObjectivesTotal",objectiveState.total)
  end
  if objectiveState.done>=C.EscapeUnlockObjectives then
   workspace:SetAttribute("EscapeUnlocked",true)
   for _,exit in ipairs(f:GetDescendants())do
    if exit:IsA("ProximityPrompt")and exit.Name=="EscapePrompt"then exit.Enabled=true end
   end
  end
 end)
 return base
end
local function addEscapeGate(f,mapId,pos)
 local gate=arenaPart(f,"EscapeGate",Vector3.new(18,12,3),pos,Color3.fromRGB(68,96,86),Enum.Material.Metal)
 local sign=arenaPart(f,"EscapeSign",Vector3.new(12,2,.4),pos+Vector3.new(0,6,-1.8),Color3.fromRGB(100,230,156),Enum.Material.Neon);sign.CanCollide=false
 local prompt=Instance.new("ProximityPrompt");prompt.Name="EscapePrompt";prompt.ObjectText="비상 탈출구";prompt.ActionText="탈출";prompt.HoldDuration=1.4;prompt.MaxActivationDistance=10;prompt.RequiresLineOfSight=false;prompt.Enabled=false;prompt.Parent=gate
 prompt.Triggered:Connect(function(p)
  if state=="RUNNING"and p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")~=true and workspace:GetAttribute("EscapeUnlocked")==true then
   escapedPlayers[p]=true;p:SetAttribute("Escaped",true);workspace:SetAttribute("SurvivorEscapeTriggered",true)
  end
 end)
 return gate
end
local function decorateArenaWithOfficialAssets(f,map)
 task.spawn(function()
  task.wait(.1);if not f.Parent then return end
  local city=C.OfficialAssets.CityPack;local dungeon=C.OfficialAssets.DungeonPack;local house=C.OfficialAssets.HouseProps
  local pack=map.Id=="THEME_PARK"and city or map.Id=="HOSPITAL"and house or city
  local keywords=map.Id=="SCHOOL"and{"bench","chair","table","cabinet","plant"}or map.Id=="HOSPITAL"and{"chair","table","cabinet","bed","plant"}or{"bench","lamp","trash","fence","sign"}
  for i=1,18 do
   if not f.Parent then return end
   local angle=i/18*math.pi*2;local radius=105+(i%3)*24
   spawnOfficialProp(pack,keywords,f,Vector3.new(math.cos(angle)*radius,2,math.sin(angle)*radius),.85+(i%3)*.12,i,false)
  end
  if map.Id=="HOSPITAL"then
   for i=1,10 do spawnOfficialProp(dungeon,{"crate","barrel","rock","rune"},f,Vector3.new(-132+i*25,1.8,122+(i%2)*16),.75,i,false)end
  elseif map.Id=="THEME_PARK"then
   for i=1,10 do spawnOfficialProp(city,{"bench","lamp","trash","sign"},f,Vector3.new(-138+i*28,1.8,-118+(i%2)*18),.9,i,false)end
  end
 end)
end
local function applyMapEvent(f,map,event)
 workspace:SetAttribute("CurrentMapEvent",event.Id)
 workspace:SetAttribute("CurrentMapEventName",event.Name)
 if event.Id=="LIGHTS_OUT"or event.Id=="POWER_OUTAGE"or event.Id=="RIDE_BLACKOUT"then
  -- 정전은 긴장감만 주고 플레이 경로 자체는 읽혀야 한다.
  Lighting.Brightness=1.18
  Lighting.FogEnd=map.Id=="HOSPITAL"and 118 or 165
  Lighting.Ambient=Color3.fromRGB(66,72,82)
  for _,x in ipairs(f:GetDescendants())do
   if x:IsA("Part")and(x.Name=="CeilingLight"or x.Name=="ParkLight")then x.Transparency=.68 end
  end
 elseif event.Id=="RED_HALL"then
  Lighting.Ambient=Color3.fromRGB(72,22,28)
  for _,x in ipairs(f:GetDescendants())do if x:IsA("Part")and x.Name=="CeilingLight"then x.Color=Color3.fromRGB(255,70,70);x.Transparency=.05 end end
 elseif event.Id=="FIRE_DRILL"then
  local door=f:FindFirstChild("GymDoor",true)
  if door and door:IsA("BasePart")then door.CanCollide=false;door.Transparency=.72;door.Color=Color3.fromRGB(255,180,70)end
  workspace:SetAttribute("MapEventGameplay","GYM_ESCAPE_ROUTE_OPEN")
 elseif event.Id=="WARD_LOCKDOWN"then
  for _,x in ipairs(f:GetDescendants())do
   if x:IsA("Part")and x.Name=="WardDoor"then x.CanCollide=true;x.Transparency=.08;x.Color=Color3.fromRGB(138,52,52)end
  end
  Lighting.Brightness=.9
  workspace:SetAttribute("MapEventGameplay","WARD_SHORTCUTS_CLOSED")
 elseif event.Id=="BASEMENT_FOG"then
  Lighting.Brightness=1.02;Lighting.FogEnd=92;Lighting.FogColor=Color3.fromRGB(75,82,78)
  workspace:SetAttribute("MapEventGameplay","HOSPITAL_SHORT_SIGHT")
 elseif event.Id=="CAROUSEL_START"then
  local rotor=f:FindFirstChild("CarouselRotor",true)
  if rotor and rotor:IsA("BasePart")then
   task.spawn(function()
    while rotor.Parent and workspace:GetAttribute("CurrentMapEvent")=="CAROUSEL_START"do
     rotor.CFrame=rotor.CFrame*CFrame.Angles(0,math.rad(4),0)
     task.wait(.08)
    end
   end)
  end
  workspace:SetAttribute("MapEventGameplay","MOVING_CAROUSEL_HAZARD")
 elseif event.Id=="TUNNEL_FOG"then
  Lighting.FogEnd=108;Lighting.Brightness=1.05
  workspace:SetAttribute("MapEventGameplay","UNDERPASS_LOW_VISIBILITY")
 end
end
local function makeArena(map)
 local old=workspace:FindFirstChild("MidnightArena")
 local hadReady=old~=nil and workspace:GetAttribute("MapReady")==true
 workspace:SetAttribute("MapBuilding",true)
 if not hadReady then workspace:SetAttribute("MapReady",false)end
 local stale=workspace:FindFirstChild("MidnightArenaNext");if stale then stale:Destroy()end
 local f=Instance.new("Folder")
 f.Name=old and"MidnightArenaNext"or"MidnightArena"
 f.Parent=workspace
 for k,v in pairs(Style.Lighting)do Lighting[k]=v end
 local floorColor=map.Id=="SCHOOL"and Color3.fromRGB(96,102,111)or map.Id=="HOSPITAL"and Color3.fromRGB(78,92,91)or Color3.fromRGB(70,69,81)
 local floorMaterial=map.Id=="THEME_PARK"and Enum.Material.Asphalt or Enum.Material.Concrete
 arenaPart(f,"Floor",Vector3.new(340,1,340),Vector3.new(0,0,0),floorColor,floorMaterial)
 for _,x in ipairs({-169,169})do arenaPart(f,"OuterWall",Vector3.new(2,22,340),Vector3.new(x,11,0),Style.Wall,Enum.Material.Concrete)end
 for _,z in ipairs({-169,169})do arenaPart(f,"OuterWall",Vector3.new(340,22,2),Vector3.new(0,11,z),Style.Wall,Enum.Material.Concrete)end
 -- 대형 맵의 가장자리와 주요 동선을 읽을 수 있는 낮은 유도등
 for _,x in ipairs({-145,-108,-72,-36,0,36,72,108,145})do
  local edge=arenaPart(f,"EdgeGuide",Vector3.new(12,.18,1),Vector3.new(x,.62,-164),Color3.fromRGB(72,132,146),Enum.Material.Neon);edge.CanCollide=false;edge.Transparency=.28
 end

 if map.Id=="SCHOOL"then
  -- 초보용 학교: 중앙 복도 + 교실 + 급식실 + 체육관. 시야가 길고 우회로가 단순하다.
  zoneFloor(f,"SchoolHallFloor",Vector3.new(32,.35,124),Vector3.new(0,.68,0),Color3.fromRGB(133,136,139),Enum.Material.Marble)
  zoneFloor(f,"SchoolCafeteriaFloor",Vector3.new(54,.35,48),Vector3.new(-51,.68,43),Color3.fromRGB(111,101,91),Enum.Material.Concrete)
  zoneFloor(f,"SchoolGymZone",Vector3.new(52,.35,46),Vector3.new(50,.68,48),Color3.fromRGB(136,95,67),Enum.Material.WoodPlanks)
  local exitLight=arenaPart(f,"SchoolExitLight",Vector3.new(8,2,.7),Vector3.new(0,7,-67),Color3.fromRGB(91,231,158),Enum.Material.Neon);glow(exitLight,exitLight.Color,18,1.8)
  arenaPart(f,"MainHallLeft",Vector3.new(3,12,112),Vector3.new(-18,6,0),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"MainHallRight",Vector3.new(3,12,112),Vector3.new(18,6,0),Style.Wall,Enum.Material.Concrete)
  for _,z in ipairs({-40,-12,16})do
   for _,side in ipairs({-1,1})do
    local x=side*48
    arenaPart(f,"ClassroomWall",Vector3.new(56,12,3),Vector3.new(x,6,z),Style.Wall,Enum.Material.Concrete)
    arenaPart(f,"ClassroomBack",Vector3.new(3,12,27),Vector3.new(side*76,6,z+13),Style.Wall,Enum.Material.Concrete)
    for desk=1,4 do
     arenaPart(f,"ClassDesk",Vector3.new(7,2,4),Vector3.new(side*(31+(desk%2)*12),1.5,z+6+math.floor((desk-1)/2)*9),Color3.fromRGB(121,91,67),Enum.Material.WoodPlanks)
    end
   end
   local lamp=arenaPart(f,"CeilingLight",Vector3.new(12,.5,2),Vector3.new(0,10,z+7),Style.SafeLight,Enum.Material.Neon);lamp.Transparency=.04;glow(lamp,Style.SafeLight,24,1.25)
  end
  -- 급식실
  arenaPart(f,"CafeteriaSign",Vector3.new(22,8,2),Vector3.new(-52,4,48),Style.Locker,Enum.Material.Metal)
  for i=1,6 do
   arenaPart(f,"CafeteriaTable",Vector3.new(12,2,5),Vector3.new(-58+(i%2)*20,1.5,30+math.floor((i-1)/2)*12),Color3.fromRGB(151,117,79),Enum.Material.WoodPlanks)
  end
  -- 체육관 + 숨는 공간
  arenaPart(f,"GymFloor",Vector3.new(48,1,42),Vector3.new(50,.6,48),Color3.fromRGB(126,91,65),Enum.Material.WoodPlanks)
  local gymDoor=arenaPart(f,"GymDoor",Vector3.new(4,10,14),Vector3.new(20,5,48),Style.Locker,Enum.Material.Metal);gymDoor.Transparency=.18
  for i=1,4 do arenaPart(f,"GymBleacher",Vector3.new(18,3,5),Vector3.new(58,2,26+i*8),Color3.fromRGB(94,101,110),Enum.Material.Metal)end
  for i=1,10 do arenaPart(f,"Locker",Vector3.new(4,8,3),Vector3.new(-12+(i%5)*6,4,-62+math.floor((i-1)/5)*8),Style.Locker,Enum.Material.Metal)end
  for _,z in ipairs({-52,-26,0,26,52})do
   local strip=arenaPart(f,"HallGuideStrip",Vector3.new(12,.18,1.2),Vector3.new(0,.78,z),Color3.fromRGB(87,210,224),Enum.Material.Neon);strip.CanCollide=false
  end
  arenaPart(f,"SchoolNoticeBoard",Vector3.new(12,6,.8),Vector3.new(-16,5,-28),Color3.fromRGB(126,89,54),Enum.Material.WoodPlanks)
  arenaPart(f,"SchoolClock",Vector3.new(4,4,.6),Vector3.new(16,7,-6),Color3.fromRGB(215,220,222),Enum.Material.SmoothPlastic)
  -- 확장 구역: 도서관 / 과학동 / 운동장 / 강당
  zoneFloor(f,"LibraryWing",Vector3.new(78,.35,72),Vector3.new(-118,.68,-70),Color3.fromRGB(105,99,92),Enum.Material.WoodPlanks)
  zoneFloor(f,"ScienceWing",Vector3.new(78,.35,72),Vector3.new(118,.68,-70),Color3.fromRGB(103,112,118),Enum.Material.Concrete)
  zoneFloor(f,"SchoolCourtyard",Vector3.new(92,.35,78),Vector3.new(-108,.68,104),Color3.fromRGB(79,112,79),Enum.Material.Grass)
  zoneFloor(f,"Auditorium",Vector3.new(92,.35,78),Vector3.new(108,.68,104),Color3.fromRGB(103,74,67),Enum.Material.WoodPlanks)
  zoneFloor(f,"SchoolWestConnector",Vector3.new(94,.35,16),Vector3.new(-72,.7,-28),Color3.fromRGB(128,130,132),Enum.Material.Marble)
  zoneFloor(f,"SchoolEastConnector",Vector3.new(94,.35,16),Vector3.new(72,.7,-28),Color3.fromRGB(128,130,132),Enum.Material.Marble)
  zoneFloor(f,"SchoolSouthConnector",Vector3.new(16,.35,92),Vector3.new(0,.7,108),Color3.fromRGB(128,130,132),Enum.Material.Marble)
  for i=1,8 do
   arenaPart(f,"LibraryShelf",Vector3.new(12,7,3),Vector3.new(-146+(i%4)*18,3.5,-92+math.floor((i-1)/4)*32),Color3.fromRGB(94,72,54),Enum.Material.WoodPlanks)
   arenaPart(f,"ScienceBench",Vector3.new(12,3,5),Vector3.new(90+(i%4)*18,1.7,-92+math.floor((i-1)/4)*32),Color3.fromRGB(110,119,123),Enum.Material.Metal)
  end
  for i=1,5 do arenaPart(f,"AuditoriumSeat",Vector3.new(13,3,5),Vector3.new(78+i*12,1.7,86+(i%2)*18),Color3.fromRGB(118,61,57),Enum.Material.Fabric)end
  addObjectiveStation(f,"도서관 단말",-Vector3.new(118,-3,70),1)
  addObjectiveStation(f,"과학실 전원",Vector3.new(118,3,-70),2)
  addObjectiveStation(f,"운동장 방송",Vector3.new(-108,3,104),3)
  addObjectiveStation(f,"강당 비상패널",Vector3.new(108,3,104),4)
  addEscapeGate(f,map.Id,Vector3.new(0,6,158))
 elseif map.Id=="HOSPITAL"then
  -- 폐병원: 좁은 중앙 복도와 병실, 수술실, 지하실 느낌의 저천장 구역.
  Lighting.FogEnd=132
  zoneFloor(f,"HospitalHallFloor",Vector3.new(20,.35,136),Vector3.new(0,.68,0),Color3.fromRGB(112,128,123),Enum.Material.Concrete)
  zoneFloor(f,"HospitalSurgeryFloor",Vector3.new(56,.35,40),Vector3.new(-48,.68,51),Color3.fromRGB(102,120,119),Enum.Material.Concrete)
  zoneFloor(f,"HospitalBasementFloor",Vector3.new(56,.35,34),Vector3.new(47,.68,57),Color3.fromRGB(64,70,70),Enum.Material.Concrete)
  local emergency=arenaPart(f,"HospitalEmergencySign",Vector3.new(10,2,.8),Vector3.new(0,7,-62),Color3.fromRGB(224,73,73),Enum.Material.Neon);glow(emergency,emergency.Color,18,1.6)
  arenaPart(f,"HospitalHallL",Vector3.new(3,12,132),Vector3.new(-11,6,0),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"HospitalHallR",Vector3.new(3,12,132),Vector3.new(11,6,0),Style.Wall,Enum.Material.Concrete)
  for _,z in ipairs({-48,-22,4,30})do
   for _,side in ipairs({-1,1})do
    local x=side*42
    arenaPart(f,"WardOuter",Vector3.new(52,12,3),Vector3.new(x,6,z),Style.Wall,Enum.Material.Concrete)
    local door=arenaPart(f,"WardDoor",Vector3.new(5,9,2),Vector3.new(side*13,4.5,z+8),Color3.fromRGB(91,111,108),Enum.Material.Metal);door.CanCollide=false;door.Transparency=.7
    for bed=1,3 do arenaPart(f,"HospitalBed",Vector3.new(10,2,5),Vector3.new(side*(29+bed*10),1.5,z+9),Color3.fromRGB(174,187,188),Enum.Material.Metal)end
   end
   local lamp=arenaPart(f,"CeilingLight",Vector3.new(8,.5,2),Vector3.new(0,10,z+10),Color3.fromRGB(183,217,207),Enum.Material.Neon);lamp.Transparency=.06;glow(lamp,lamp.Color,20,1.15)
  end
  -- 수술실
  arenaPart(f,"SurgeryWall",Vector3.new(55,12,3),Vector3.new(-45,6,61),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"SurgeryTable",Vector3.new(12,3,5),Vector3.new(-48,2,52),Color3.fromRGB(132,151,151),Enum.Material.Metal)
  arenaPart(f,"SurgeryLamp",Vector3.new(6,.7,6),Vector3.new(-48,10,52),Color3.fromRGB(190,240,220),Enum.Material.Neon)
  -- 지하실: 낮은 천장과 좁은 통로로 시야를 압축
  arenaPart(f,"BasementCeiling",Vector3.new(56,1,34),Vector3.new(47,7,57),Color3.fromRGB(60,64,66),Enum.Material.Concrete)
  arenaPart(f,"BasementWallA",Vector3.new(3,8,34),Vector3.new(20,4,57),Color3.fromRGB(69,73,75),Enum.Material.Concrete)
  arenaPart(f,"BasementWallB",Vector3.new(3,8,34),Vector3.new(75,4,57),Color3.fromRGB(69,73,75),Enum.Material.Concrete)
  for i=1,5 do arenaPart(f,"BasementCrate",Vector3.new(6,5,6),Vector3.new(28+i*8,2.5,50+(i%2)*12),Color3.fromRGB(83,74,65),Enum.Material.WoodPlanks)end
  for _,z in ipairs({-56,-28,0,28,56})do
   local strip=arenaPart(f,"HospitalGuideStrip",Vector3.new(8,.18,1),Vector3.new(0,.78,z),Color3.fromRGB(111,215,190),Enum.Material.Neon);strip.CanCollide=false
  end
  -- 확장 구역: 응급실 / 약국 / 영안실 / 하역장
  zoneFloor(f,"EmergencyWing",Vector3.new(82,.35,76),Vector3.new(-118,.68,-82),Color3.fromRGB(102,116,113),Enum.Material.Concrete)
  zoneFloor(f,"PharmacyWing",Vector3.new(82,.35,76),Vector3.new(118,.68,-82),Color3.fromRGB(98,112,108),Enum.Material.Concrete)
  zoneFloor(f,"MorgueWing",Vector3.new(86,.35,76),Vector3.new(-118,.68,108),Color3.fromRGB(65,71,72),Enum.Material.Concrete)
  zoneFloor(f,"LoadingDock",Vector3.new(86,.35,76),Vector3.new(118,.68,108),Color3.fromRGB(76,77,78),Enum.Material.Concrete)
  zoneFloor(f,"HospitalCrossA",Vector3.new(120,.35,14),Vector3.new(-70,.7,-20),Color3.fromRGB(109,122,119),Enum.Material.Concrete)
  zoneFloor(f,"HospitalCrossB",Vector3.new(120,.35,14),Vector3.new(70,.7,-20),Color3.fromRGB(109,122,119),Enum.Material.Concrete)
  for i=1,8 do
   arenaPart(f,"EmergencyBed",Vector3.new(10,2,5),Vector3.new(-148+(i%4)*19,1.5,-104+math.floor((i-1)/4)*30),Color3.fromRGB(167,180,181),Enum.Material.Metal)
   arenaPart(f,"PharmacyShelf",Vector3.new(12,7,3),Vector3.new(88+(i%4)*19,3.5,-104+math.floor((i-1)/4)*30),Color3.fromRGB(126,137,135),Enum.Material.Metal)
  end
  for i=1,6 do arenaPart(f,"MorgueDrawer",Vector3.new(8,5,3),Vector3.new(-150+i*11,2.5,116+(i%2)*15),Color3.fromRGB(97,106,107),Enum.Material.Metal)end
  addObjectiveStation(f,"응급실 발전기",Vector3.new(-118,3,-82),1)
  addObjectiveStation(f,"약국 보안패널",Vector3.new(118,3,-82),2)
  addObjectiveStation(f,"영안실 퓨즈",Vector3.new(-118,3,108),3)
  addObjectiveStation(f,"하역장 셔터",Vector3.new(118,3,108),4)
  addEscapeGate(f,map.Id,Vector3.new(0,6,158))
 elseif map.Id=="THEME_PARK"then
  -- 폐놀이공원: 넓은 야외, 내부 공간, 매표소, 숨는 부스와 복잡한 우회 동선.
  zoneFloor(f,"ParkMainPath",Vector3.new(20,.3,142),Vector3.new(0,.66,0),Color3.fromRGB(92,82,103),Enum.Material.Concrete)
  zoneFloor(f,"ParkCrossPath",Vector3.new(142,.3,18),Vector3.new(0,.66,-30),Color3.fromRGB(92,82,103),Enum.Material.Concrete)
  zoneFloor(f,"HauntedZoneFloor",Vector3.new(58,.3,42),Vector3.new(34,.66,38),Color3.fromRGB(60,50,68),Enum.Material.Slate)
  zoneFloor(f,"CarouselZoneFloor",Vector3.new(42,.3,42),Vector3.new(-32,.66,8),Color3.fromRGB(92,64,92),Enum.Material.Slate)
  for _,x in ipairs({-58,-20,20,58})do
   local light=arenaPart(f,"ParkLight",Vector3.new(2,11,2),Vector3.new(x,5.5,-52),Color3.fromRGB(220,91,180),Enum.Material.Neon);light.Transparency=.05;glow(light,light.Color,30,1.7)
  end
  -- 회전목마
  arenaPart(f,"CarouselBase",Vector3.new(34,2,34),Vector3.new(-32,1.5,8),Color3.fromRGB(102,68,108),Enum.Material.WoodPlanks)
  local rotor=arenaPart(f,"CarouselRotor",Vector3.new(28,1,28),Vector3.new(-32,3,8),Color3.fromRGB(180,100,142),Enum.Material.Neon);rotor.CanCollide=false;glow(rotor,rotor.Color,26,1.3)
  local canopy=arenaPart(f,"CarouselCanopy",Vector3.new(38,2,38),Vector3.new(-32,10,8),Color3.fromRGB(112,68,111),Enum.Material.Fabric);canopy.Transparency=.08
  for i=1,8 do
   local a=i/8*math.pi*2
   arenaPart(f,"CarouselHorse",Vector3.new(3,5,2),Vector3.new(-32+math.cos(a)*11,5,8+math.sin(a)*11),Color3.fromRGB(212,190,153),Enum.Material.SmoothPlastic)
  end
  -- 귀신의 집 내부
  arenaPart(f,"HauntedShell",Vector3.new(58,12,3),Vector3.new(34,6,54),Color3.fromRGB(54,45,62),Enum.Material.Slate)
  arenaPart(f,"HauntedSideL",Vector3.new(3,12,42),Vector3.new(6,6,37),Color3.fromRGB(54,45,62),Enum.Material.Slate)
  arenaPart(f,"HauntedSideR",Vector3.new(3,12,42),Vector3.new(62,6,37),Color3.fromRGB(54,45,62),Enum.Material.Slate)
  for i=1,4 do arenaPart(f,"HauntedDivider",Vector3.new(24,9,2),Vector3.new(18+(i%2)*28,4.5,25+i*7),Color3.fromRGB(67,55,72),Enum.Material.Slate)end
  -- 매표소와 숨는 부스
  for i=1,5 do
   arenaPart(f,"TicketBooth",Vector3.new(10,8,10),Vector3.new(-60+i*18,4,-38),Color3.fromRGB(83,72+(i*7),94),Enum.Material.Metal)
  end
  for i=1,7 do
   local a=i/7*math.pi*2
   arenaPart(f,"HideBooth",Vector3.new(8,7,8),Vector3.new(math.cos(a)*59,3.5,math.sin(a)*54),Color3.fromRGB(75,66,82),Enum.Material.Metal)
  end
  -- 지하 통로 느낌의 저천장 복도
  arenaPart(f,"UnderpassCeiling",Vector3.new(72,1,18),Vector3.new(0,7,-66),Color3.fromRGB(53,54,61),Enum.Material.Concrete)
  arenaPart(f,"UnderpassWallL",Vector3.new(72,8,2),Vector3.new(0,4,-74),Color3.fromRGB(62,63,70),Enum.Material.Concrete)
  arenaPart(f,"UnderpassWallR",Vector3.new(72,8,2),Vector3.new(0,4,-58),Color3.fromRGB(62,63,70),Enum.Material.Concrete)
  local sign=arenaPart(f,"ParkLandmarkSign",Vector3.new(18,5,1),Vector3.new(0,9,-30),Color3.fromRGB(222,105,178),Enum.Material.Neon);glow(sign,sign.Color,26,1.4)
  for _,x in ipairs({-45,45})do local guide=arenaPart(f,"ParkRouteGuide",Vector3.new(12,.18,1.2),Vector3.new(x,.8,-30),Color3.fromRGB(111,201,225),Enum.Material.Neon);guide.CanCollide=false end
  -- 확장 구역: 아케이드 / 범퍼카 / 푸드코트 / 정비구역
  zoneFloor(f,"ArcadeZone",Vector3.new(86,.35,74),Vector3.new(-118,.68,-92),Color3.fromRGB(73,58,82),Enum.Material.Slate)
  zoneFloor(f,"BumperCarZone",Vector3.new(86,.35,74),Vector3.new(118,.68,-92),Color3.fromRGB(84,70,88),Enum.Material.Asphalt)
  zoneFloor(f,"FoodCourtZone",Vector3.new(88,.35,76),Vector3.new(-118,.68,108),Color3.fromRGB(94,77,76),Enum.Material.Concrete)
  zoneFloor(f,"MaintenanceYard",Vector3.new(88,.35,76),Vector3.new(118,.68,108),Color3.fromRGB(64,65,72),Enum.Material.Concrete)
  for i=1,10 do
   local arcade=arenaPart(f,"ArcadeCabinet",Vector3.new(4,7,4),Vector3.new(-151+(i%5)*16,3.5,-112+math.floor((i-1)/5)*28),Color3.fromRGB(104,64+(i%3)*15,130),Enum.Material.Metal)
   local scr=arenaPart(f,"ArcadeGlow",Vector3.new(2.8,2,.2),arcade.Position+Vector3.new(0,1,-2.1),Color3.fromRGB(89,183,214),Enum.Material.Neon);scr.CanCollide=false
  end
  for i=1,8 do arenaPart(f,"BumperCar",Vector3.new(7,3,9),Vector3.new(86+(i%4)*20,2,-112+math.floor((i-1)/4)*30),Color3.fromRGB(140+(i%2)*45,69,92+(i%3)*28),Enum.Material.Metal)end
  for i=1,8 do arenaPart(f,"FoodTable",Vector3.new(9,2,6),Vector3.new(-151+(i%4)*19,1.5,88+math.floor((i-1)/4)*30),Color3.fromRGB(124,94,72),Enum.Material.WoodPlanks)end
  for i=1,8 do arenaPart(f,"MaintenanceCrate",Vector3.new(7,6,7),Vector3.new(88+(i%4)*19,3,88+math.floor((i-1)/4)*30),Color3.fromRGB(78,72,68),Enum.Material.WoodPlanks)end
  addObjectiveStation(f,"아케이드 전력",Vector3.new(-118,3,-92),1)
  addObjectiveStation(f,"범퍼카 제어반",Vector3.new(118,3,-92),2)
  addObjectiveStation(f,"푸드코트 셔터",Vector3.new(-118,3,108),3)
  addObjectiveStation(f,"정비실 발전기",Vector3.new(118,3,108),4)
  addEscapeGate(f,map.Id,Vector3.new(0,6,158))
 end

 local events=map.Events or {}
 local event=events[math.random(1,math.max(1,#events))]or{Id="NONE",Name="평온"}
 applyMapEvent(f,map,event)
 -- 새 맵을 끝까지 만든 뒤 기존 맵과 원자적으로 교체한다.
 if old and old.Parent then
  old:Destroy()
  f.Name="MidnightArena"
 end
 workspace:SetAttribute("CurrentMapId",map.Id)
 workspace:SetAttribute("CurrentMapName",map.Name)
 workspace:SetAttribute("WorldArtPass","MIDNIGHT_"..map.Id.."_ASSET_ESCAPE_V7")
 workspace:SetAttribute("EscapeUnlocked",false)
 workspace:SetAttribute("SurvivorEscapeTriggered",false)
 decorateArenaWithOfficialAssets(f,map)
 workspace:SetAttribute("MapReady",true)
 workspace:SetAttribute("MapBuilding",false)
 return f
end
local function recordServerQA(status)
 pcall(function()
  qaCaptureStore:UpdateAsync("latest",function(old)
   local data=typeof(old)=="table"and old or{captures={}}
   data.captures=typeof(data.captures)=="table"and data.captures or{}
   table.insert(data.captures,{
    gameId=C.GameId,label="SERVER",kind="STATUS",status=tostring(status):sub(1,160),
    userId=0,capturedAt=os.time(),
   })
   while #data.captures>30 do table.remove(data.captures,1)end
   data.updatedAt=os.time();data.gameId=C.GameId
   return data
  end)
 end)
end

local function makeFallbackArena(map,reason)
 local old=workspace:FindFirstChild("MidnightArena");if old then old:Destroy()end
 local nextArena=workspace:FindFirstChild("MidnightArenaNext");if nextArena then nextArena:Destroy()end
 local f=Instance.new("Folder");f.Name="MidnightArena";f.Parent=workspace
 Lighting.Brightness=2.05;Lighting.ClockTime=.35;Lighting.FogEnd=270
 Lighting.Ambient=Color3.fromRGB(72,78,90);Lighting.OutdoorAmbient=Color3.fromRGB(58,64,76)
 arenaPart(f,"Floor",Vector3.new(160,1,160),Vector3.new(0,0,0),Style.Floor,Enum.Material.Concrete)
 for _,x in ipairs({-79,79})do arenaPart(f,"OuterWall",Vector3.new(2,18,160),Vector3.new(x,9,0),Style.Wall,Enum.Material.Concrete)end
 for _,z in ipairs({-79,79})do arenaPart(f,"OuterWall",Vector3.new(160,18,2),Vector3.new(0,9,z),Style.Wall,Enum.Material.Concrete)end
 zoneFloor(f,"SafeHall",Vector3.new(28,.35,126),Vector3.new(0,.68,0),Color3.fromRGB(125,130,139),Enum.Material.Concrete)
 for _,z in ipairs({-48,-16,16,48})do
  local lamp=arenaPart(f,"CeilingLight",Vector3.new(10,.5,2),Vector3.new(0,10,z),Style.SafeLight,Enum.Material.Neon)
  lamp.CanCollide=false;glow(lamp,Style.SafeLight,22,1.1)
 end
 local chosen=map or C.Maps[1]
 workspace:SetAttribute("CurrentMapId",chosen.Id)
 workspace:SetAttribute("CurrentMapName",chosen.Name)
 workspace:SetAttribute("CurrentMapEvent","")
 workspace:SetAttribute("CurrentMapEventName","")
 workspace:SetAttribute("MapEventGameplay","FALLBACK_SAFE_MAP")
 workspace:SetAttribute("WorldArtPass","MIDNIGHT_FALLBACK_SAFE_V1")
 workspace:SetAttribute("MapBuilding",false)
 workspace:SetAttribute("MapReady",true)
 arena=f
 recordServerQA("MAP_FALLBACK:"..tostring(reason or"unknown"))
 return f
end

local function ensureArena(map)
 local ok,result=pcall(function()return makeArena(map)end)
 if ok and result and result.Parent and workspace:GetAttribute("MapReady")==true then
  return result
 end
 return makeFallbackArena(map,ok and"NO_READY"or result)
end

local function clearBots()
 for _,b in ipairs(bots)do if b.part then b.part:Destroy()end end
 bots={};monsterBot=nil
end
local function bot(role,pos)
 local p=Instance.new("Part");p.Name=role=="MONSTER"and"AI_MONSTER"or"AI_SURVIVOR";p.Anchored=true;p.Size=Vector3.new(3,5,3);p.Position=pos
 p.Color=role=="MONSTER"and Style.Monsters.DRAK.Color or Style.Survivor;p.Material=Enum.Material.SmoothPlastic;p.Parent=arena
 local b={part=p,role=role,frozen=false,speed=role=="MONSTER"and 18 or 13};table.insert(bots,b);return b
end
local function weightPick(list)
 local total=0;for _,p in ipairs(list)do total+=math.max(1,(p:GetAttribute("RoundsSinceMonster")or 0)+1)end
 local r=math.random()*total
 for _,p in ipairs(list)do r-=math.max(1,(p:GetAttribute("RoundsSinceMonster")or 0)+1);if r<=0 then return p end end
 return list[#list]
end
local function choose(h)
 if #h==1 then return h[1]:GetAttribute("SoloRole")=="MONSTER"and h[1]or nil,false end
 local volunteers={};for _,p in ipairs(h)do if p:GetAttribute("MonsterPreference")=="MONSTER"then table.insert(volunteers,p)end end
 local pool=#volunteers>0 and volunteers or h
 local filtered={};for _,p in ipairs(pool)do if p.UserId~=lastMonster then table.insert(filtered,p)end end
 if #filtered>0 then pool=filtered end
 return weightPick(pool),#volunteers==0
end
local function clearRoleVisual(p)
 local c=p.Character;if not c then return end
 for _,d in ipairs(c:GetDescendants())do if d.Name=="RoleVisual"then d:Destroy()end end
 local old=c:FindFirstChild("RoleHighlight");if old then old:Destroy()end
end
local function applyRoleVisual(p,r)
 clearRoleVisual(p);local c=p.Character;if not c then return end
 local hi=Instance.new("Highlight");hi.Name="RoleHighlight";hi.FillTransparency=.67;hi.OutlineTransparency=.05;hi.Parent=c
 if r=="MONSTER"then
  local mf=Style.Monsters[form(p).Id]or Style.Monsters.DRAK;hi.FillColor=mf.Color;hi.OutlineColor=mf.Accent
  local head=c:FindFirstChild("Head")or root(p)
  if head then
   local g=Instance.new("BillboardGui");g.Name="RoleVisual";g.Size=UDim2.fromOffset(150,34);g.StudsOffset=Vector3.new(0,3.8,0);g.AlwaysOnTop=true;g.Parent=head
   local t=Instance.new("TextLabel");t.Size=UDim2.fromScale(1,1);t.BackgroundTransparency=1;t.TextScaled=true;t.Text=mf.Label;t.TextColor3=mf.Accent;t.TextStrokeTransparency=.25;t.Parent=g
  end
 else hi.FillColor=Style.Survivor;hi.OutlineColor=Color3.new(1,1,1)end
end
local function teleport(p,pos)
 local r=root(p);if r then
  local target=pos+Vector3.new(0,2,0)
  movementGraceUntil[p]=os.clock()+1
  lastValidPosition[p]=target
  r.CFrame=CFrame.new(target)
 end
end
local function setRole(p,r)
 p:SetAttribute("Role",r);p:SetAttribute("Frozen",false);restoreMovement(p,r=="MONSTER"and 19 or 16);applyRoleVisual(p,r)
 tagGraceUntil[p]=os.clock()+6
end
local function active()
 local a={}
 for _,p in ipairs(Players:GetPlayers())do if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")~=true then table.insert(a,{p=p})end end
 for _,b in ipairs(bots)do if b.role=="SURVIVOR"and not b.frozen then table.insert(a,{b=b})end end
 return a
end
local function frozenCount()
 local n=0
 for _,p in ipairs(Players:GetPlayers())do if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")==true then n+=1 end end
 for _,b in ipairs(bots)do if b.role=="SURVIVOR"and b.frozen then n+=1 end end
 return n
end
local function freezePlayer(p)
 if os.clock()<(tagGraceUntil[p]or 0)then return end
 if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")~=true then
  p:SetAttribute("Frozen",true);p:SetAttribute("FeedbackEvent","FREEZE:"..tostring(math.floor(os.clock()*1000)));speed(p,0)
  local c=p.Character;if c then local h=c:FindFirstChild("RoleHighlight");if h then h.FillColor=Style.Frozen;h.OutlineColor=Color3.fromRGB(220,248,255)end end
  -- 1인 플레이는 AI 구조 실패로 영구 정지되지 않게 자동 해동 안전장치를 둔다.
  if #Players:GetPlayers()==1 then
   task.delay(2.4,function()
    if p.Parent and p:GetAttribute("Frozen")==true and state=="RUNNING"then
     p:SetAttribute("Frozen",false);p:SetAttribute("FeedbackEvent","RESCUE:SOLO_AUTO");restoreMovement(p,16);applyRoleVisual(p,"SURVIVOR");tagGraceUntil[p]=os.clock()+4
    end
   end)
  end
 end
end
local function thawPlayer(p)
 if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")==true then
  p:SetAttribute("Frozen",false);p:SetAttribute("FeedbackEvent","RESCUE:"..tostring(math.floor(os.clock()*1000)));restoreMovement(p,16);applyRoleVisual(p,"SURVIVOR");tagGraceUntil[p]=os.clock()+3
 end
end
local function monsterPos()
 if monster then local r=root(monster);return r and r.Position end
 if monsterBot then return monsterBot.part.Position end
end
local function configure(h)
 clearBots();local need=math.max(0,C.TargetPopulation-#h)
 if #h==1 and not monster then monsterBot=bot("MONSTER",monsterSpawn);need=math.max(0,need-1)end
 for i=1,need do bot("SURVIVOR",survivorSpawns[((i-1)%#survivorSpawns)+1])end
end
local function startRound()
 local h=Players:GetPlayers();if #h==0 then return false end
 currentMapIndex=(currentMapIndex%#C.Maps)+1
 local map=C.Maps[currentMapIndex]
 local existing=workspace:FindFirstChild("MidnightArena")
 if existing and workspace:GetAttribute("MapReady")==true and workspace:GetAttribute("CurrentMapId")==map.Id then
  -- 첫 라운드 학교 맵은 이미 프리로드되어 있으므로 절대 다시 지우지 않는다.
  arena=existing
 else
  arena=ensureArena(map)
 end
 if not arena or workspace:GetAttribute("MapReady")~=true then arena=makeFallbackArena(map,"START_ROUND_NOT_READY")end
 monster,forced=choose(h);if monster then lastMonster=monster.UserId end
 for _,p in ipairs(h)do p:SetAttribute("CurrentMap",map.Name);p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")end
 local si=1
 for _,p in ipairs(h)do
  local role=p==monster and"MONSTER"or"SURVIVOR";setRole(p,role);p:SetAttribute("RoundState","RUNNING")
  if role=="MONSTER"then teleport(p,monsterSpawn)else teleport(p,survivorSpawns[((si-1)%#survivorSpawns)+1]);si+=1 end
 end
 configure(h);state="RUNNING";timeLeft=C.RoundSeconds;return true
end
local function endRound(winner)
 if state~="RUNNING"then return end;state="RESULT"
 for _,p in ipairs(Players:GetPlayers())do
  local m=p:GetAttribute("Role")=="MONSTER";local win=(winner=="MONSTER"and m)or(winner=="SURVIVOR"and not m)
  local reward=win and 30 or 12;if m and forced then reward=math.floor(reward*1.5)end
  p:SetAttribute("Coins",(p:GetAttribute("Coins")or 0)+reward)
  if m then p:SetAttribute("MonsterXP",(p:GetAttribute("MonsterXP")or 0)+(win and 40 or 18));p:SetAttribute("RoundsSinceMonster",0)
  else p:SetAttribute("RoundsSinceMonster",(p:GetAttribute("RoundsSinceMonster")or 0)+1)end
  p:SetAttribute("RoundState","RESULT_"..winner);p:SetAttribute("FeedbackEvent","RESULT:"..winner..":"..tostring(math.floor(os.clock()*1000)));p:SetAttribute("Frozen",false);speed(p,16)
 end
 clearBots();monster=nil;monsterBot=nil;task.wait(4)
end
local function rescue(p)
 if state~="RUNNING"or p:GetAttribute("Role")~="SURVIVOR"or p:GetAttribute("Frozen")==true then return end
 local r=root(p);if not r then return end
 for _,o in ipairs(Players:GetPlayers())do
  if o~=p and o:GetAttribute("Frozen")==true then local q=root(o);if q and(q.Position-r.Position).Magnitude<=C.RescueDistance then thawPlayer(o);p:SetAttribute("FeedbackEvent","RESCUE:"..tostring(math.floor(os.clock()*1000)));return end end
 end
 for _,b in ipairs(bots)do
  if b.role=="SURVIVOR"and b.frozen and(b.part.Position-r.Position).Magnitude<=C.RescueDistance then b.frozen=false;b.part.Color=Style.Survivor;return end
 end
end
local function survivorDash(p)
 if state~="RUNNING"or p:GetAttribute("Role")~="SURVIVOR"or p:GetAttribute("Frozen")==true then return end
 local now=os.clock();if now-(dashCooldown[p]or 0)<C.SurvivorDashCooldown then return end;dashCooldown[p]=now
 local r=root(p);if r then movementGraceUntil[p]=now+.7;r.AssemblyLinearVelocity=r.CFrame.LookVector*52+Vector3.new(0,r.AssemblyLinearVelocity.Y,0)end
end
local function ability(p)
 if state~="RUNNING"or p~=monster then return end
 local now=os.clock();if now-(cooldown[p]or 0)<C.MonsterAbilityCooldown then return end;cooldown[p]=now
 local r=root(p);if not r then return end;local f=form(p);movementGraceUntil[p]=now+.8
 if f.Ability=="BAT_DASH"then r.AssemblyLinearVelocity=r.CFrame.LookVector*70+Vector3.new(0,r.AssemblyLinearVelocity.Y,0)
 elseif f.Ability=="POWER_CHARGE"then r.AssemblyLinearVelocity=r.CFrame.LookVector*85+Vector3.new(0,4,0)
 elseif f.Ability=="RAGE_RUN"then speed(p,28);task.delay(3,function()if p.Parent and p:GetAttribute("Role")=="MONSTER"then speed(p,19)end end)
 elseif f.Ability=="CURSE_SLOW"then
  for _,o in ipairs(Players:GetPlayers())do if o:GetAttribute("Role")=="SURVIVOR"and o:GetAttribute("Frozen")~=true then local q=root(o);if q and(q.Position-r.Position).Magnitude<=22 then speed(o,9);task.delay(3,function()if o.Parent and o:GetAttribute("Frozen")~=true then speed(o,16)end end)end end end
 elseif f.Ability=="SHADOW_STEP"then r.CFrame=r.CFrame+r.CFrame.LookVector*18 end
end
local function nextMonster(p)
 if state=="RUNNING"then return end
 local xp=p:GetAttribute("MonsterXP")or 0;local cur=p:GetAttribute("MonsterForm")or"DRAK";local idx=1
 for i,f in ipairs(C.MonsterForms)do if f.Id==cur then idx=i end end
 for n=1,#C.MonsterForms do local j=((idx+n-1)%#C.MonsterForms)+1;local f=C.MonsterForms[j];if xp>=f.UnlockXP then p:SetAttribute("MonsterForm",f.Id);return end end
end
local function validRemoteAction(p,a)
 if typeof(a)~="string"or allowedActions[a]~=true then return false end
 local now=os.clock()
 if now-(lastRequest[p]or 0)<C.RemoteMinInterval then return false end
 lastRequest[p]=now
 return true
end
local function broadcastMultiplayerSync(actor)
 local participants=Players:GetPlayers()
 local roundScore=0
 for _,participant in ipairs(participants)do
  if participant:GetAttribute("Role")=="SURVIVOR"and participant:GetAttribute("Frozen")~=true then roundScore+=1 end
 end
 remote:FireAllClients("MULTIPLAYER_SYNC",{
  ActorUserId=actor and actor.UserId or 0,
  ParticipantCount=#participants,
  RoundScore=roundScore,
  FrozenCount=frozenCount(),
  TimeLeft=math.max(0,math.ceil(timeLeft)),
 })
end
remote.OnServerEvent:Connect(function(p,a)
 if not validRemoteAction(p,a)then return end
 if a==C.Actions.PREFER_MONSTER and state~="RUNNING"then p:SetAttribute("MonsterPreference","MONSTER")
 elseif a==C.Actions.PREFER_SURVIVOR and state~="RUNNING"then p:SetAttribute("MonsterPreference","SURVIVOR")
 elseif a==C.Actions.SOLO_MONSTER and #Players:GetPlayers()==1 and state~="RUNNING"then p:SetAttribute("SoloRole","MONSTER");soloStartRequested=true
 elseif a==C.Actions.SOLO_SURVIVOR and #Players:GetPlayers()==1 and state~="RUNNING"then p:SetAttribute("SoloRole","SURVIVOR");soloStartRequested=true
 elseif a==C.Actions.RESCUE then rescue(p)
 elseif a==C.Actions.DASH then survivorDash(p)
 elseif a==C.Actions.ABILITY then ability(p)
 elseif a==C.Actions.NEXT_MONSTER then nextMonster(p)end
 broadcastMultiplayerSync(p)
end)
local function onCharacter(p)
 task.wait(.1)
 local readyDeadline=os.clock()+10
 while workspace:GetAttribute("MapReady")~=true and os.clock()<readyDeadline do task.wait(.1)end
 if state=="RUNNING"then
  setRole(p,p==monster and"MONSTER"or"SURVIVOR")
  restoreMovement(p,p==monster and 19 or 16)
 else
  -- 1인 플레이는 맵 복제가 끝난 뒤 실제 맵 안에서 시작한다.
  if #Players:GetPlayers()==1 then
   p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
   p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
   teleport(p,survivorSpawns[1])
  end
 end
end
Players.PlayerAdded:Connect(function(p)
 load(p)
 p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
 p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
 p.CharacterAdded:Connect(function()onCharacter(p)end)
 if p.Character then task.defer(function()onCharacter(p)end)end
end)
for _,p in ipairs(Players:GetPlayers())do
 load(p)
 p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
 p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
 p.CharacterAdded:Connect(function()onCharacter(p)end)
 if p.Character then task.defer(function()onCharacter(p)end)end
end
qaCaptureRemote.OnServerEvent:Connect(function(p,label,value)
 if C.QACameraEnabled~=true then return end
 if typeof(label)~="string"or #label<1 or #label>48 then return end
 local raw=tostring(value or"")
 if #raw<1 or #raw>160 then return end
 local isStatus=label=="STATUS"
 if not isStatus and not raw:match("^%d+$")then return end
 local now=os.clock();if now-(qaCaptureLast[p]or 0)<.18 then return end;qaCaptureLast[p]=now
 local record={gameId=C.GameId,label=label,userId=p.UserId,capturedAt=os.time()}
 if isStatus then record.status=raw;record.kind="STATUS"else record.assetId=raw;record.kind="CAPTURE"end
 local ok=pcall(function()
  qaCaptureStore:UpdateAsync("latest",function(old)
   local data=typeof(old)=="table"and old or{captures={}}
   data.captures=typeof(data.captures)=="table"and data.captures or{}
   table.insert(data.captures,record)
   while #data.captures>30 do table.remove(data.captures,1)end
   data.updatedAt=os.time();data.gameId=C.GameId
   return data
  end)
 end)
 if isStatus then p:SetAttribute("QALastCaptureStatus",raw)else p:SetAttribute("QALastCaptureAssetId",raw);p:SetAttribute("QALastCaptureLabel",label)end
 p:SetAttribute("QALastCaptureStored",ok)
end)

Players.PlayerRemoving:Connect(function(p)
 save(p);cooldown[p]=nil;dashCooldown[p]=nil;lastRequest[p]=nil;lastValidPosition[p]=nil;movementGraceUntil[p]=nil;qaCaptureLast[p]=nil;tagGraceUntil[p]=nil
end)
game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)

-- 로비에서도 맵이 즉시 보여야 한다. 첫 라운드 전 학교 맵을 프리로드한다.
if not workspace:FindFirstChild("MidnightArena")then
 arena=ensureArena(C.Maps[1])
end
if not arena or workspace:GetAttribute("MapReady")~=true then
 arena=makeFallbackArena(C.Maps[1],"BOOT_NOT_READY")
end
for _,p in ipairs(Players:GetPlayers())do
 p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
 p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
end

task.spawn(function()
 while true do
  if #Players:GetPlayers()==0 then state="WAITING";task.wait(1)
  else
   state="INTERMISSION"
   soloStartRequested=false
   for t=C.IntermissionSeconds,1,-1 do
    for _,p in ipairs(Players:GetPlayers())do p:SetAttribute("RoundState","INTERMISSION");p:SetAttribute("TimeLeft",t)end
    if #Players:GetPlayers()==1 and soloStartRequested then break end
    task.wait(1)
   end
   if startRound()then
    while state=="RUNNING"and timeLeft>0 do
     local mp=monsterPos()
     if mp then
      for _,p in ipairs(Players:GetPlayers())do if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")~=true and os.clock()>=(tagGraceUntil[p]or 0)then local r=root(p);if r and(r.Position-mp).Magnitude<=C.TagDistance then freezePlayer(p)end end end
      for _,b in ipairs(bots)do if b.role=="SURVIVOR"and not b.frozen and(b.part.Position-mp).Magnitude<=C.TagDistance then b.frozen=true;b.part.Color=Style.Frozen end end
     end
     local alive=#active()
     if alive==0 then endRound("MONSTER");break end
     for _,p in ipairs(Players:GetPlayers())do
      p:SetAttribute("TimeLeft",math.ceil(timeLeft));p:SetAttribute("FrozenCount",frozenCount());p:SetAttribute("AliveCount",alive)
      if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")~=true then speed(p,alive==1 and 19 or 16)end
     end
     task.wait(.25);timeLeft-=.25
    end
    if state=="RUNNING"then endRound("SURVIVOR")end
   end
  end
 end
end)

RunService.Heartbeat:Connect(function(dt)
 if state=="RUNNING"then
  local mp=monsterPos()
  for _,b in ipairs(bots)do
   if not b.frozen then
    if b.role=="MONSTER"then
     local best,bd=nil,math.huge
     for _,a in ipairs(active())do
      local pos=a.p and(root(a.p)and root(a.p).Position)or(a.b and a.b.part.Position)
      if pos then local d=(pos-b.part.Position).Magnitude;if d<bd then bd=d;best=pos end end
     end
     if best then local d=Vector3.new(best.X-b.part.Position.X,0,best.Z-b.part.Position.Z);if d.Magnitude>.1 then b.part.Position+=d.Unit*math.min(d.Magnitude,b.speed*dt)end end
    else
     local rescueTarget=nil
     for _,human in ipairs(Players:GetPlayers())do
      if human:GetAttribute("Role")=="SURVIVOR"and human:GetAttribute("Frozen")==true then
       local hr=root(human);if hr and(hr.Position-b.part.Position).Magnitude<62 then rescueTarget=human;break end
      end
     end
     if rescueTarget then
      local hr=root(rescueTarget);local d=hr and Vector3.new(hr.Position.X-b.part.Position.X,0,hr.Position.Z-b.part.Position.Z)
      if d and d.Magnitude>C.RescueDistance-1 then b.part.Position+=d.Unit*math.min(d.Magnitude,b.speed*dt)
      elseif hr then thawPlayer(rescueTarget)end
     elseif mp then
      local away=b.part.Position-mp;if away.Magnitude<38 then local d=Vector3.new(away.X,0,away.Z);if d.Magnitude>.1 then b.part.Position+=d.Unit*b.speed*dt end end
     end
    end
   end
  end
 end

 movementGuardClock+=dt
 if movementGuardClock<.25 then return end
 movementGuardClock=0
 local now=os.clock()
 for _,p in ipairs(Players:GetPlayers())do
  local r=root(p)
  if r and state=="RUNNING"then
   local pos=r.Position
   local horizontal=Vector3.new(r.AssemblyLinearVelocity.X,0,r.AssemblyLinearVelocity.Z).Magnitude
   local previous=lastValidPosition[p]
   local inBounds=math.abs(pos.X)<=C.ArenaLimit and math.abs(pos.Z)<=C.ArenaLimit and pos.Y>=-8 and pos.Y<=42
   local grace=now<(movementGraceUntil[p]or 0)
   local stepOkay=not previous or(pos-previous).Magnitude<=C.MaxTeleportStep
   local velocityOkay=horizontal<=C.MaxHorizontalVelocity
   if grace or(inBounds and stepOkay and velocityOkay)then
    lastValidPosition[p]=pos
   elseif previous then
    movementGraceUntil[p]=now+.35
    r.AssemblyLinearVelocity=Vector3.zero
    r.CFrame=CFrame.new(previous)
   end
  elseif r then
   lastValidPosition[p]=r.Position
  end
 end
end)
