local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local Lighting=game:GetService("Lighting")
local Shared=RS:WaitForChild("Shared")
local C=require(Shared:WaitForChild("GameConfig"))
local Style=require(Shared:WaitForChild("VisualStyle"))
local store=DSS:GetDataStore("daechung-rpg-party-v2")
local remote=RS:FindFirstChild(C.RemoteName)or Instance.new("RemoteEvent")
remote.Name=C.RemoteName;remote.Parent=RS

local world=nil
local enemies={}
local companionParts={}
local lastHit={}
local lastRequest={}
local allowedActions={}
for _,action in pairs(C.Actions)do allowedActions[action]=true end

local function root(p)local c=p.Character;return c and c:FindFirstChild("HumanoidRootPart")end
local function n(p,k,d)local v=p:GetAttribute(k);return typeof(v)=="number"and v or d end
local function feedback(p,kind)p:SetAttribute("FeedbackEvent",kind..":"..tostring(math.floor(os.clock()*1000)))end
local function class(p)local id=p:GetAttribute("ClassId")or C.Classes[1].Id;for _,x in ipairs(C.Classes)do if x.Id==id then return x end end;return C.Classes[1]end
local function unlocked(p,id)return p:GetAttribute("Companion_"..id)==true end
local function unlock(p,id,msg)
 if not unlocked(p,id)then p:SetAttribute("Companion_"..id,true);p:SetAttribute("LastAction",msg or(id.." 합류"))end
end
local function saveKeys()
 local t={"Gold","XP","Level","WeaponTier","ClassId","AIStyle","Relic","PartyMemory","Kills","StoryStage","BossesDefeated","HiddenCompanionUnlocked"}
 for _,x in ipairs(C.Companions)do table.insert(t,"Companion_"..x.Id)end
 return t
end
local SAVE_KEYS=saveKeys()

local function ppart(name,size,pos,color,material)
 local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.Size=size;x.Position=pos;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic;x.Parent=world;return x
end
local function nameplate(target,text,color)
 local g=Instance.new("BillboardGui");g.Size=UDim2.fromOffset(120,24);g.StudsOffset=Vector3.new(0,4.2,0);g.AlwaysOnTop=false;g.MaxDistance=42;g.LightInfluence=.25;g.Parent=target
 local t=Instance.new("TextLabel");t.Size=UDim2.fromScale(1,1);t.BackgroundColor3=Color3.fromRGB(25,22,31);t.BackgroundTransparency=.35;t.TextScaled=true;t.Text=text;t.TextColor3=color or Color3.new(1,1,1);t.TextStrokeTransparency=.65;t.Parent=g
 local cr=Instance.new("UICorner");cr.CornerRadius=UDim.new(0,5);cr.Parent=t
end
local function prompt(target,text,action)
 local pr=Instance.new("ProximityPrompt");pr.ActionText=action;pr.ObjectText=text;pr.HoldDuration=.15;pr.MaxActivationDistance=10;pr.RequiresLineOfSight=false;pr.Parent=target;return pr
end
local function attach(root,name,size,offset,color,material,shape)
 local x=Instance.new("Part");x.Name=name;x.Size=size;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic;x.CanCollide=false;x.Massless=true
 x.Anchored=false;x.CFrame=root.CFrame*CFrame.new(offset);if shape then x.Shape=shape end;x.Parent=root
 local w=Instance.new("WeldConstraint");w.Part0=root;w.Part1=x;w.Parent=x
 return x
end
local function humanoidFigure(name,pos,color,accent,scale)
 scale=scale or 1
 local root=ppart(name,Vector3.new(3.2,4.2,2.2)*scale,pos,color,Enum.Material.SmoothPlastic);root.CanCollide=true
 attach(root,"Head",Vector3.new(2.5,2.5,2.5)*scale,Vector3.new(0,3.15*scale,0),Color3.fromRGB(224,190,154),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 attach(root,"ArmL",Vector3.new(1.1,3.8,1.1)*scale,Vector3.new(-2.05*scale,0,0),color)
 attach(root,"ArmR",Vector3.new(1.1,3.8,1.1)*scale,Vector3.new(2.05*scale,0,0),color)
 attach(root,"LegL",Vector3.new(1.2,3.2,1.2)*scale,Vector3.new(-.85*scale,-3.55*scale,0),accent or color)
 attach(root,"LegR",Vector3.new(1.2,3.2,1.2)*scale,Vector3.new(.85*scale,-3.55*scale,0),accent or color)
 attach(root,"ShoulderGlow",Vector3.new(3.7,.35,2.6)*scale,Vector3.new(0,1.4*scale,0),accent or color,Enum.Material.Neon)
 return root
end
local function treeProp(pos,scale)
 scale=scale or 1
 local trunk=ppart("WorldTree",Vector3.new(2.2,7,2.2)*scale,pos+Vector3.new(0,3.5*scale,0),Color3.fromRGB(92,68,51),Enum.Material.Wood)
 local crown=ppart("WorldTreeCrown",Vector3.new(7,7,7)*scale,trunk.Position+Vector3.new(0,5*scale,0),Color3.fromRGB(67,112,73),Enum.Material.Grass);crown.Shape=Enum.PartType.Ball
end
local function makeWorld()
 local old=workspace:FindFirstChild("DaechungRPGWorld");if old then old:Destroy()end
 world=Instance.new("Folder");world.Name="DaechungRPGWorld";world.Parent=workspace
 for k,v in pairs(Style.Lighting)do Lighting[k]=v end
 ppart("Field",Vector3.new(320,1,320),Vector3.new(0,0,0),Style.Ground,Enum.Material.Grass)
 ppart("VillagePlaza",Vector3.new(78,2,78),Vector3.new(0,1,0),Style.Stone,Enum.Material.Slate)
 ppart("NorthRoad",Vector3.new(18,1.1,130),Vector3.new(0,1.1,-88),Color3.fromRGB(116,104,91),Enum.Material.Cobblestone)
 ppart("EastRoad",Vector3.new(130,1.1,15),Vector3.new(88,1.1,12),Color3.fromRGB(108,99,88),Enum.Material.Cobblestone)
 ppart("WestRoad",Vector3.new(122,1.1,15),Vector3.new(-84,1.1,-8),Color3.fromRGB(108,99,88),Enum.Material.Cobblestone)
 for i=1,8 do
  local a=i/8*math.pi*2;local pos=Vector3.new(math.cos(a)*31,3,math.sin(a)*31)
  ppart("RunePillar",Vector3.new(3,8,3),pos,Style.Stone,Enum.Material.Slate)
  local crystal=ppart("RuneCrystal",Vector3.new(2,4,2),pos+Vector3.new(0,6,0),Style.Crystal,Enum.Material.Neon);crystal.Orientation=Vector3.new(0,i*23,45)
 end
 local gate=ppart("Gate",Vector3.new(28,18,4),Vector3.new(0,9,-36),Style.Stone,Enum.Material.Slate);nameplate(gate,"마을 · 4인 파티 거점",Style.Gold)
 local chief=humanoidFigure("VillageChief",Vector3.new(-15,5,6),Color3.fromRGB(142,104,68),Color3.fromRGB(218,174,92),1);nameplate(chief,"이장 · 카일",Style.Gold)
 prompt(chief,"이장","이야기 듣기").Triggered:Connect(function(p)
  if n(p,"StoryStage",0)==0 then p:SetAttribute("StoryStage",1);unlock(p,"KYLE","폐광 수호자 카일이 합류했다.")
  else p:SetAttribute("LastAction","카일과 함께 필드 몬스터 5마리를 처치해.")end
 end)
 local sera=humanoidFigure("SeraNPC",Vector3.new(0,5,12),Style.CompanionColors.SERA,Color3.fromRGB(116,171,193),.95);nameplate(sera,"세라 · 추적자",Style.Gold)
 prompt(sera,"세라","동료 영입").Triggered:Connect(function(p)
  if unlocked(p,"KYLE")and n(p,"Kills",0)>=5 then unlock(p,"SERA","카일과 함께 도적단을 밀어내 세라가 합류했다.");p:SetAttribute("StoryStage",math.max(2,n(p,"StoryStage",0)))
  else p:SetAttribute("LastAction","세라: 먼저 카일과 합류하고 몬스터 5마리를 쓰러뜨려.")end
 end)
 local iris=humanoidFigure("IrisNPC",Vector3.new(15,5,6),Style.CompanionColors.IRIS,Style.Crystal,.95);nameplate(iris,"이리스 · 룬술사",Style.Gold)
 prompt(iris,"이리스","룬 해방").Triggered:Connect(function(p)
  if unlocked(p,"SERA")and n(p,"BossesDefeated",0)>=1 then unlock(p,"IRIS","세라의 추적 끝에 보스의 룬을 깨고 이리스가 합류했다.");p:SetAttribute("StoryStage",math.max(3,n(p,"StoryStage",0)))
  else p:SetAttribute("LastAction","이리스: 세라와 합류한 뒤 지역보스를 쓰러뜨려.")end
 end)
 local noa=humanoidFigure("NoaNPC",Vector3.new(0,5,-13),Color3.fromRGB(83,125,148),Color3.fromRGB(131,211,219),.95);nameplate(noa,"노아 · 영혼소환사",Style.Gold)
 prompt(noa,"노아","영혼 이야기").Triggered:Connect(function(p)
  if unlocked(p,"IRIS")and n(p,"PartyMemory",0)>=12 then unlock(p,"NOA","완성된 파티의 기억을 본 노아가 합류했다.")
  else p:SetAttribute("LastAction","노아: 이리스와 합류하고 전투의 기억 12를 모아.")end
 end)
 -- 마을 외곽과 사냥터를 구역처럼 읽히게 하는 배경 디테일
 for i=1,12 do
  local a=i/12*math.pi*2
  treeProp(Vector3.new(math.cos(a)*(88+(i%3)*12),1,math.sin(a)*(82+(i%2)*18)),.8+(i%3)*.12)
 end
 for i=1,5 do
  local x=-56+i*22
  local house=ppart("VillageHouse",Vector3.new(15,9,13),Vector3.new(x,5,42+(i%2)*8),Color3.fromRGB(128,94,73),Enum.Material.WoodPlanks)
  ppart("VillageHouseRoof",Vector3.new(18,2,16),house.Position+Vector3.new(0,5.4,0),Color3.fromRGB(83,68,74),Enum.Material.Slate)
  ppart("VillageWindow",Vector3.new(3,3,.5),house.Position+Vector3.new(0,1,6.7),Color3.fromRGB(179,217,225),Enum.Material.Neon)
 end
 for i=1,9 do
  local a=i/9*math.pi*2
  local pos=Vector3.new(math.cos(a)*126,2,math.sin(a)*118)
  local ruin=ppart("FieldRuin",Vector3.new(8,math.random(5,11),5),pos,Color3.fromRGB(81,78,88),Enum.Material.Slate)
  ruin.Orientation=Vector3.new(0,i*31,math.random(-7,7))
 end
 for i=1,7 do
  local a=i/7*math.pi*2
  local crystal=ppart("FieldCrystal",Vector3.new(3,9,3),Vector3.new(math.cos(a)*105,5,math.sin(a)*105),Style.Crystal,Enum.Material.Neon)
  crystal.Orientation=Vector3.new(0,i*23,18)
 end
 ppart("BossArena",Vector3.new(58,1.2,58),Vector3.new(0,1,-128),Color3.fromRGB(67,54,77),Enum.Material.Slate)
 for i=1,8 do local a=i/8*math.pi*2;ppart("BossObelisk",Vector3.new(4,13,4),Vector3.new(math.cos(a)*24,7,-128+math.sin(a)*24),Color3.fromRGB(76,61,91),Enum.Material.Slate)end
 workspace:SetAttribute("WorldArtPass","FANTASY_PARTY_WORLD_ART_V3")
end

local function enemyColor(id)
 if id=="HOUND"then return Color3.fromRGB(137,92,73)end
 if id=="GOBLIN"then return Color3.fromRGB(91,132,76)end
 if id=="SLIME"then return Color3.fromRGB(101,91,190)end
 if id=="BANDIT"then return Color3.fromRGB(76,83,104)end
 return Style.Enemy
end
local function unit(def,pos,kind)
 local boss=kind=="BOSS";local elite=kind=="ELITE"
 local baseColor=boss and Style.Boss or elite and Color3.fromRGB(125,91,52)or enemyColor(def.Id)
 local p=Instance.new("Part");p.Name=def.Name;p.Anchored=true;p.CanCollide=true
 p.Size=boss and Vector3.new(6,8,4)or elite and Vector3.new(5.2,6.5,3.5)or Vector3.new(3.6,4.5,3);p.Position=pos
 p.Color=baseColor;p.Material=(boss or elite)and Enum.Material.Slate or Enum.Material.SmoothPlastic;p.Parent=world
 if def.Id=="HOUND"then
  p.Size=Vector3.new(3.8,2.7,6);p.Position=pos
  attach(p,"HoundHead",Vector3.new(3.1,2.6,3),Vector3.new(0,.55,-3.8),baseColor,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  for _,x in ipairs({-1.25,1.25})do for _,z in ipairs({-1.7,1.7})do attach(p,"HoundLeg",Vector3.new(.8,2.4,.8),Vector3.new(x,-2,z),Color3.fromRGB(91,67,57))end end
 elseif def.Id=="SLIME"then
  p.Shape=Enum.PartType.Ball;p.Size=Vector3.new(5.5,4.5,5.5);p.Position=pos
  attach(p,"SlimeCore",Vector3.new(1.6,1.6,1.6),Vector3.new(0,.2,-2.1),Style.Crystal,Enum.Material.Neon,Enum.PartType.Ball)
 elseif def.Id=="GOBLIN"then
  attach(p,"GoblinHead",Vector3.new(2.6,2.6,2.6),Vector3.new(0,3.15,0),Color3.fromRGB(111,154,80),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  attach(p,"GoblinEarL",Vector3.new(1.5,.6,.7),Vector3.new(-1.7,3.2,0),Color3.fromRGB(111,154,80))
  attach(p,"GoblinEarR",Vector3.new(1.5,.6,.7),Vector3.new(1.7,3.2,0),Color3.fromRGB(111,154,80))
  attach(p,"GoblinBlade",Vector3.new(.45,4,.8),Vector3.new(2.5,0,-.4),Color3.fromRGB(175,181,182),Enum.Material.Metal)
 elseif def.Id=="BANDIT"then
  attach(p,"BanditHead",Vector3.new(2.5,2.5,2.5),Vector3.new(0,3.2,0),Color3.fromRGB(171,135,107),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  attach(p,"BanditHood",Vector3.new(3.1,1.4,2.8),Vector3.new(0,4,0),Color3.fromRGB(45,48,61),Enum.Material.Fabric)
  attach(p,"BanditBlade",Vector3.new(.45,4.5,.8),Vector3.new(2.5,-.2,0),Color3.fromRGB(183,187,194),Enum.Material.Metal)
 else
  attach(p,"StoneHead",Vector3.new(3.8,3.5,3.6),Vector3.new(0,5.2,0),baseColor,Enum.Material.Slate)
 end
 if elite then
  attach(p,"EliteShoulderL",Vector3.new(3.4,2.4,3),Vector3.new(-3.7,1.5,0),Color3.fromRGB(100,82,64),Enum.Material.Slate)
  attach(p,"EliteShoulderR",Vector3.new(3.4,2.4,3),Vector3.new(3.7,1.5,0),Color3.fromRGB(100,82,64),Enum.Material.Slate)
  attach(p,"EliteCore",Vector3.new(2,2,1),Vector3.new(0,1,-2.1),Style.Gold,Enum.Material.Neon)
 end
 if boss then
  attach(p,"BossHead",Vector3.new(5,4,4),Vector3.new(0,6.2,0),Color3.fromRGB(54,31,69),Enum.Material.Slate)
  attach(p,"BossHornL",Vector3.new(1,4,1),Vector3.new(-2.1,9,0),Style.Crystal,Enum.Material.Neon)
  attach(p,"BossHornR",Vector3.new(1,4,1),Vector3.new(2.1,9,0),Style.Crystal,Enum.Material.Neon)
  attach(p,"BossCore",Vector3.new(2.5,3,1),Vector3.new(0,1,-2.6),Style.Crystal,Enum.Material.Neon)
 end
 if boss or elite then local l=Instance.new("PointLight");l.Color=boss and Style.Crystal or Style.Gold;l.Range=boss and 26 or 16;l.Brightness=boss and 3 or 1.5;l.Parent=p end
 nameplate(p,(elite and"ELITE · "or"")..def.Name,boss and Style.Gold or elite and Style.Gold or Color3.new(1,1,1))
 local e={part=p,hp=def.HP,max=def.HP,boss=boss,elite=elite,gold=def.Gold,xp=def.XP,id=def.Id}
 p:SetAttribute("HP",def.HP);p:SetAttribute("EnemyId",def.Id);p:SetAttribute("Elite",elite);p:SetAttribute("Boss",boss);table.insert(enemies,e);return e
end
local function spawnEnemy(kind)
 local a=math.random()*6.28
 if kind=="BOSS"then return unit(C.FinalBoss,Vector3.new(math.cos(a)*76,6,math.sin(a)*76),"BOSS")end
 if kind=="ELITE"then return unit(C.Elite,Vector3.new(math.cos(a)*62,5,math.sin(a)*62),"ELITE")end
 local def=C.EnemyTypes[math.random(1,#C.EnemyTypes)]
 local r=math.random(45,90)
 return unit(def,Vector3.new(math.cos(a)*r,3,math.sin(a)*r),"NORMAL")
end

local function load(p)
 p:SetAttribute("Gold",100);p:SetAttribute("XP",0);p:SetAttribute("Level",1);p:SetAttribute("WeaponTier",1)
 p:SetAttribute("ClassId","BREAKER");p:SetAttribute("AIStyle","PROTECT");p:SetAttribute("Relic","FURY")
 p:SetAttribute("PartyMemory",0);p:SetAttribute("Kills",0);p:SetAttribute("StoryStage",0);p:SetAttribute("BossesDefeated",0);p:SetAttribute("HiddenCompanionUnlocked",0)
 for _,x in ipairs(C.Companions)do p:SetAttribute("Companion_"..x.Id,false)end
 local ok,d=pcall(function()return store:GetAsync("p:"..p.UserId)end)
 if ok and typeof(d)=="table"then
  for _,k in ipairs(SAVE_KEYS)do local v=d[k];if typeof(v)=="number"or typeof(v)=="string"or typeof(v)=="boolean"then p:SetAttribute(k,v)end end
 end
 p:SetAttribute("LastAction","마을 이장에게 가서 첫 동료를 만나.")
end
local function save(p)
 local d={};for _,k in ipairs(SAVE_KEYS)do d[k]=p:GetAttribute(k)end
 pcall(function()store:SetAsync("p:"..p.UserId,d)end)
end
local function grantXP(p,amount)
 local xp=n(p,"XP",0)+amount;local lv=n(p,"Level",1);local before=lv
 while xp>=lv*100 do xp-=lv*100;lv+=1 end
 p:SetAttribute("XP",xp);p:SetAttribute("Level",lv)
 if lv>before then p:SetAttribute("LastAction","레벨 "..lv.." 달성!");feedback(p,"LEVEL_UP")end
end
local function nearest(pos,range)
 local best,bd=nil,range
 for _,e in ipairs(enemies)do if e.hp>0 and e.part.Parent then local d=(e.part.Position-pos).Magnitude;if d<=bd then bd=d;best=e end end end
 return best
end
local function afterKill(p,e)
 p:SetAttribute("Gold",n(p,"Gold",0)+(e.gold or(e.boss and 100 or e.elite and 35 or 10)))
 grantXP(p,e.xp or(e.boss and 140 or e.elite and 55 or 18))
 p:SetAttribute("PartyMemory",n(p,"PartyMemory",0)+(e.boss and 4 or e.elite and 2 or 1))
 if e.boss then
  p:SetAttribute("BossEngaged",false);p:SetAttribute("BossesDefeated",n(p,"BossesDefeated",0)+1);unlock(p,"WARDEN","심연의 간수의 의지를 꺾어 보스 동료 루트가 열렸다.");feedback(p,"VICTORY")
 else p:SetAttribute("Kills",n(p,"Kills",0)+1);feedback(p,e.elite and"ELITE_KILL"or"KILL")end
 if n(p,"PartyMemory",0)>=20 and p:GetAttribute("Relic")=="CONTROL"then unlock(p,"NAMELESS","숨겨진 조건을 만족해 무명의 동료가 나타났다.");p:SetAttribute("HiddenCompanionUnlocked",1)end
end
local function hit(p,amount,range,kind)
 local now=os.clock();if now-(lastHit[p]or 0)<.18 then return end;lastHit[p]=now
 local r=root(p);if not r then return end;local e=nearest(r.Position,range);if not e then p:SetAttribute("LastAction","사거리 안에 적이 없어.");return end
 local firstBoss=e.boss and p:GetAttribute("BossEngaged")~=true
 p:SetAttribute("InCombat",true);p:SetAttribute("CombatStamp",now);p:SetAttribute("BossEngaged",e.boss==true)
 if firstBoss then p:SetAttribute("LastAction","심연의 간수 등장!");feedback(p,"BOSS_APPEAR")else feedback(p,kind or"ATTACK")end
 local original=e.part.Color;e.part.Color=Color3.fromRGB(245,245,255)
 task.delay(.08,function()if e.part and e.part.Parent then e.part.Color=original end end)
 if kind=="SKILL"then
  local pulse=Instance.new("PointLight");pulse.Color=Style.Crystal;pulse.Range=18;pulse.Brightness=3;pulse.Parent=e.part
  task.delay(.18,function()if pulse.Parent then pulse:Destroy()end end)
 end
 e.hp-=amount;e.part:SetAttribute("HP",math.max(0,e.hp))
 local stamp=now
 task.delay(4,function()if p.Parent and p:GetAttribute("CombatStamp")==stamp and p:GetAttribute("BossEngaged")~=true then p:SetAttribute("InCombat",false)end end)
 if e.hp<=0 then if e.part.Parent then e.part:Destroy()end;afterKill(p,e);p:SetAttribute("LastAction",e.boss and"최종 보스 격파!"or e.elite and"엘리트 격파!"or(e.part.Name.." 처치"))end
end

local function cycle(p,key,list)
 local cur=p:GetAttribute(key);local idx=1
 for i,v in ipairs(list)do local id=typeof(v)=="table"and v.Id or v;if id==cur then idx=i end end
 local nextv=list[idx%#list+1];p:SetAttribute(key,typeof(nextv)=="table"and nextv.Id or nextv)
end
local function broadcastMultiplayerSync(actor)
 local participants=Players:GetPlayers()
 local sharedObjective=0
 for _,participant in ipairs(participants)do sharedObjective+=(participant:GetAttribute("PartyMemory")or 0)end
 for _,participant in ipairs(participants)do participant:SetAttribute("SharedObjective",sharedObjective)end
 remote:FireAllClients("MULTIPLAYER_SYNC",{ActorUserId=actor.UserId,ParticipantCount=#participants,SharedObjective=sharedObjective})
end
remote.OnServerEvent:Connect(function(p,a)
 if typeof(a)~="string"or allowedActions[a]~=true then return end
 local now=os.clock();if now-(lastRequest[p]or 0)<C.RemoteMinInterval then return end
 lastRequest[p]=now
 if a==C.Actions.ATTACK then local x=class(p);hit(p,(x.Damage or 10)+n(p,"WeaponTier",1)*3+n(p,"Level",1),15,"ATTACK")
 elseif a==C.Actions.SKILL then local x=class(p);local bonus=p:GetAttribute("Relic")=="FURY"and 10 or 0;hit(p,(x.Skill or 25)+n(p,"WeaponTier",1)*4+bonus,26,"SKILL")
 elseif a==C.Actions.DODGE then local r=root(p);if r then r.AssemblyLinearVelocity=r.CFrame.LookVector*48+Vector3.new(0,r.AssemblyLinearVelocity.Y,0)end
 elseif a==C.Actions.NEXT_CLASS then cycle(p,"ClassId",C.Classes)
 elseif a==C.Actions.NEXT_AI then cycle(p,"AIStyle",C.AIStyles)
 elseif a==C.Actions.NEXT_RELIC then cycle(p,"Relic",C.Relics)
 elseif a==C.Actions.UPGRADE_WEAPON then local cost=40+n(p,"WeaponTier",1)*30;if n(p,"Gold",0)>=cost then p:SetAttribute("Gold",n(p,"Gold",0)-cost);p:SetAttribute("WeaponTier",n(p,"WeaponTier",1)+1);p:SetAttribute("LastAction","무기 강화 완료")else p:SetAttribute("LastAction","강화 골드 부족")end end
 broadcastMultiplayerSync(p)
end)

makeWorld();for i=1,10 do spawnEnemy("NORMAL")end;spawnEnemy("ELITE");spawnEnemy("BOSS")

local function unlockedList(p)
 local list={}
 for _,def in ipairs(C.Companions)do if unlocked(p,def.Id)then table.insert(list,def)end end
 return list
end
local function rebuildCompanions()
 for _,x in ipairs(companionParts)do if x.part then x.part:Destroy()elseif x.Destroy then x:Destroy()end end;companionParts={}
 local humans=Players:GetPlayers();if #humans==0 then return end
 local leader=humans[1];local needed=math.max(0,C.PartySlots-#humans);local choices=unlockedList(leader)
 for i=1,math.min(needed,#choices)do
  local def=choices[i];local col=Style.CompanionColors[def.Id]or Style.Gold
  local p=humanoidFigure("AI동료_"..def.Name,Vector3.new(0,5,0),col,Style.Gold,.78);p.CanCollide=false;nameplate(p,def.Name.." · "..def.Class,Style.Gold)
  table.insert(companionParts,{part=p,def=def})
 end
 for _,h in ipairs(humans)do h:SetAttribute("HumanPartyMembers",#humans);h:SetAttribute("AIPartyMembers",#companionParts);h:SetAttribute("PartySize",math.min(C.PartySlots,#humans+#companionParts))end
end

Players.PlayerAdded:Connect(function(p)
 load(p);p.CharacterAdded:Connect(function()task.delay(.4,rebuildCompanions)end)
 for _,x in ipairs(C.Companions)do p:GetAttributeChangedSignal("Companion_"..x.Id):Connect(rebuildCompanions)end
 task.defer(rebuildCompanions)
end)
for _,p in ipairs(Players:GetPlayers())do load(p);for _,x in ipairs(C.Companions)do p:GetAttributeChangedSignal("Companion_"..x.Id):Connect(rebuildCompanions)end end
Players.PlayerRemoving:Connect(function(p)save(p);lastHit[p]=nil;lastRequest[p]=nil;task.defer(rebuildCompanions)end)
game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)

RunService.Heartbeat:Connect(function(dt)
 local humans=Players:GetPlayers();if #humans==0 then return end;local leader=humans[1];local lr=root(leader);if not lr then return end
 local style=leader:GetAttribute("AIStyle")or"PROTECT";local relic=leader:GetAttribute("Relic")or"FURY"
 for i,entry in ipairs(companionParts)do
  local p=entry.part
  if p.Parent then
   local distance=style=="PROTECT"and 4 or 7;local target=lr.Position+Vector3.new((i-2)*distance,0,6)
   local d=Vector3.new(target.X-p.Position.X,0,target.Z-p.Position.Z);if d.Magnitude>.5 then p.Position+=d.Unit*math.min(d.Magnitude,(style=="AGGRESSIVE"and 17 or 14)*dt)end
   local range=style=="CONTROL"and 18 or 13;local e=nearest(p.Position,range)
   if e then
    local damage=(relic=="FURY"and 9 or 6)*dt;e.hp-=damage;e.part:SetAttribute("HP",math.max(0,e.hp))
    if e.hp<=0 and e.part.Parent then e.part:Destroy();afterKill(leader,e)end
   end
  end
 end
 for i=#enemies,1,-1 do if enemies[i].hp<=0 or not enemies[i].part.Parent then table.remove(enemies,i)end end
 if #enemies<7 then spawnEnemy("NORMAL")end
 local eliteAlive=false
 for _,enemy in ipairs(enemies)do if enemy.elite and enemy.hp>0 and enemy.part.Parent then eliteAlive=true;break end end
 if not eliteAlive then spawnEnemy("ELITE")end
end)
