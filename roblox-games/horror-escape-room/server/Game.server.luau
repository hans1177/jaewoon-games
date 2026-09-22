local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local Lighting=game:GetService("Lighting")
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
local allowedActions={}
for _,action in pairs(C.Actions)do allowedActions[action]=true end

local survivorSpawns={
 Vector3.new(-55,3,-52),Vector3.new(55,3,-52),Vector3.new(-55,3,52),
 Vector3.new(55,3,52),Vector3.new(0,3,52),Vector3.new(0,3,-10)
}
local monsterSpawn=Vector3.new(0,3,-62)

local function root(p)local c=p.Character;return c and c:FindFirstChild("HumanoidRootPart")end
local function hum(p)local c=p.Character;return c and c:FindFirstChildOfClass("Humanoid")end
local function speed(p,v)local h=hum(p);if h then h.WalkSpeed=v end end
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
local function applyMapEvent(f,map,event)
 workspace:SetAttribute("CurrentMapEvent",event.Id)
 workspace:SetAttribute("CurrentMapEventName",event.Name)
 if event.Id=="LIGHTS_OUT"or event.Id=="POWER_OUTAGE"or event.Id=="RIDE_BLACKOUT"then
  Lighting.Brightness=.82
  Lighting.FogEnd=map.Id=="HOSPITAL"and 82 or 135
  for _,x in ipairs(f:GetDescendants())do
   if x:IsA("Part")and(x.Name=="CeilingLight"or x.Name=="ParkLight")then x.Transparency=.9 end
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
  Lighting.Brightness=.78;Lighting.FogEnd=72;Lighting.FogColor=Color3.fromRGB(75,82,78)
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
  Lighting.FogEnd=88;Lighting.Brightness=.82
  workspace:SetAttribute("MapEventGameplay","UNDERPASS_LOW_VISIBILITY")
 end
end
local function makeArena(map)
 local old=workspace:FindFirstChild("MidnightArena");if old then old:Destroy()end
 local f=Instance.new("Folder");f.Name="MidnightArena";f.Parent=workspace
 for k,v in pairs(Style.Lighting)do Lighting[k]=v end
 local floorColor=map.Id=="SCHOOL"and Color3.fromRGB(96,102,111)or map.Id=="HOSPITAL"and Color3.fromRGB(78,92,91)or Color3.fromRGB(70,69,81)
 local floorMaterial=map.Id=="THEME_PARK"and Enum.Material.Asphalt or Enum.Material.Concrete
 arenaPart(f,"Floor",Vector3.new(160,1,160),Vector3.new(0,0,0),floorColor,floorMaterial)
 for _,x in ipairs({-79,79})do arenaPart(f,"OuterWall",Vector3.new(2,18,160),Vector3.new(x,9,0),Style.Wall,Enum.Material.Concrete)end
 for _,z in ipairs({-79,79})do arenaPart(f,"OuterWall",Vector3.new(160,18,2),Vector3.new(0,9,z),Style.Wall,Enum.Material.Concrete)end
 -- 모든 맵 공통: 가장자리와 주요 동선을 눈으로 읽을 수 있게 약한 유도등 배치
 for _,x in ipairs({-62,-31,0,31,62})do
  local edge=arenaPart(f,"EdgeGuide",Vector3.new(10,.25,1),Vector3.new(x,.62,-76),Color3.fromRGB(95,152,167),Enum.Material.Neon);edge.CanCollide=false
 end

 if map.Id=="SCHOOL"then
  -- 초보용 학교: 중앙 복도 + 교실 + 급식실 + 체육관. 시야가 길고 우회로가 단순하다.
  zoneFloor(f,"SchoolHallFloor",Vector3.new(32,.35,124),Vector3.new(0,.68,0),Color3.fromRGB(133,136,139),Enum.Material.Marble)
  zoneFloor(f,"SchoolCafeteriaFloor",Vector3.new(54,.35,48),Vector3.new(-51,.68,43),Color3.fromRGB(111,101,91),Enum.Material.Tile)
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
 elseif map.Id=="HOSPITAL"then
  -- 폐병원: 좁은 중앙 복도와 병실, 수술실, 지하실 느낌의 저천장 구역.
  Lighting.FogEnd=132
  zoneFloor(f,"HospitalHallFloor",Vector3.new(20,.35,136),Vector3.new(0,.68,0),Color3.fromRGB(112,128,123),Enum.Material.Tile)
  zoneFloor(f,"HospitalSurgeryFloor",Vector3.new(56,.35,40),Vector3.new(-48,.68,51),Color3.fromRGB(102,120,119),Enum.Material.Tile)
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
 end

 local events=map.Events or {}
 local event=events[math.random(1,math.max(1,#events))]or{Id="NONE",Name="평온"}
 workspace:SetAttribute("CurrentMapId",map.Id)
 workspace:SetAttribute("CurrentMapName",map.Name)
 applyMapEvent(f,map,event)
 workspace:SetAttribute("WorldArtPass","MIDNIGHT_"..map.Id.."_READABLE_ART_V4")
 return f
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
 p:SetAttribute("Role",r);p:SetAttribute("Frozen",false);speed(p,r=="MONSTER"and 19 or 16);applyRoleVisual(p,r)
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
 if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")~=true then
  p:SetAttribute("Frozen",true);p:SetAttribute("FeedbackEvent","FREEZE:"..tostring(math.floor(os.clock()*1000)));speed(p,0)
  local c=p.Character;if c then local h=c:FindFirstChild("RoleHighlight");if h then h.FillColor=Style.Frozen;h.OutlineColor=Color3.fromRGB(220,248,255)end end
 end
end
local function thawPlayer(p)
 if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")==true then p:SetAttribute("Frozen",false);p:SetAttribute("FeedbackEvent","RESCUE:"..tostring(math.floor(os.clock()*1000)));speed(p,16);applyRoleVisual(p,"SURVIVOR")end
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
 arena=makeArena(map);monster,forced=choose(h);if monster then lastMonster=monster.UserId end
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
 elseif a==C.Actions.SOLO_MONSTER and #Players:GetPlayers()==1 and state~="RUNNING"then p:SetAttribute("SoloRole","MONSTER")
 elseif a==C.Actions.SOLO_SURVIVOR and #Players:GetPlayers()==1 and state~="RUNNING"then p:SetAttribute("SoloRole","SURVIVOR")
 elseif a==C.Actions.RESCUE then rescue(p)
 elseif a==C.Actions.DASH then survivorDash(p)
 elseif a==C.Actions.ABILITY then ability(p)
 elseif a==C.Actions.NEXT_MONSTER then nextMonster(p)end
 broadcastMultiplayerSync(p)
end)
local function onCharacter(p)
 task.wait(.25)
 if state=="RUNNING"then setRole(p,p==monster and"MONSTER"or"SURVIVOR")end
end
Players.PlayerAdded:Connect(function(p)load(p);p.CharacterAdded:Connect(function()onCharacter(p)end)end)
for _,p in ipairs(Players:GetPlayers())do load(p);p.CharacterAdded:Connect(function()onCharacter(p)end)end
qaCaptureRemote.OnServerEvent:Connect(function(p,label,assetId)
 if C.QACameraEnabled~=true then return end
 if typeof(label)~="string"or #label<1 or #label>48 then return end
 local id=tostring(assetId or"")
 if not id:match("^%d+$")then return end
 local now=os.clock();if now-(qaCaptureLast[p]or 0)<.35 then return end;qaCaptureLast[p]=now
 local record={gameId=C.GameId,label=label,assetId=id,userId=p.UserId,capturedAt=os.time()}
 local ok=pcall(function()
  qaCaptureStore:UpdateAsync("latest",function(old)
   local data=typeof(old)=="table"and old or{captures={}}
   data.captures=typeof(data.captures)=="table"and data.captures or{}
   table.insert(data.captures,record)
   while #data.captures>18 do table.remove(data.captures,1)end
   data.updatedAt=os.time();data.gameId=C.GameId
   return data
  end)
 end)
 p:SetAttribute("QALastCaptureAssetId",id)
 p:SetAttribute("QALastCaptureLabel",label)
 p:SetAttribute("QALastCaptureStored",ok)
end)

Players.PlayerRemoving:Connect(function(p)
 save(p);cooldown[p]=nil;dashCooldown[p]=nil;lastRequest[p]=nil;lastValidPosition[p]=nil;movementGraceUntil[p]=nil
qaCaptureLast[p]=nil end)
game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)

task.spawn(function()
 while true do
  if #Players:GetPlayers()==0 then state="WAITING";task.wait(1)
  else
   state="INTERMISSION"
   for t=C.IntermissionSeconds,1,-1 do
    for _,p in ipairs(Players:GetPlayers())do p:SetAttribute("RoundState","INTERMISSION");p:SetAttribute("TimeLeft",t)end
    task.wait(1)
   end
   if startRound()then
    while state=="RUNNING"and timeLeft>0 do
     local mp=monsterPos()
     if mp then
      for _,p in ipairs(Players:GetPlayers())do if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")~=true then local r=root(p);if r and(r.Position-mp).Magnitude<=C.TagDistance then freezePlayer(p)end end end
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
    elseif mp then
     local away=b.part.Position-mp;if away.Magnitude<38 then local d=Vector3.new(away.X,0,away.Z);if d.Magnitude>.1 then b.part.Position+=d.Unit*b.speed*dt end end
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
