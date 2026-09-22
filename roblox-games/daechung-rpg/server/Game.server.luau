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
 local g=Instance.new("BillboardGui");g.Size=UDim2.fromOffset(190,38);g.StudsOffset=Vector3.new(0,5,0);g.AlwaysOnTop=true;g.Parent=target
 local t=Instance.new("TextLabel");t.Size=UDim2.fromScale(1,1);t.BackgroundTransparency=1;t.TextScaled=true;t.Text=text;t.TextColor3=color or Color3.new(1,1,1);t.TextStrokeTransparency=.4;t.Parent=g
end
local function prompt(target,text,action)
 local pr=Instance.new("ProximityPrompt");pr.ActionText=action;pr.ObjectText=text;pr.HoldDuration=.15;pr.MaxActivationDistance=10;pr.RequiresLineOfSight=false;pr.Parent=target;return pr
end
local function makeWorld()
 local old=workspace:FindFirstChild("DaechungRPGWorld");if old then old:Destroy()end
 world=Instance.new("Folder");world.Name="DaechungRPGWorld";world.Parent=workspace
 for k,v in pairs(Style.Lighting)do Lighting[k]=v end
 ppart("Field",Vector3.new(210,1,210),Vector3.new(0,0,0),Style.Ground,Enum.Material.Grass)
 ppart("VillagePlaza",Vector3.new(60,2,60),Vector3.new(0,1,0),Style.Stone,Enum.Material.Slate)
 for i=1,8 do
  local a=i/8*math.pi*2;local pos=Vector3.new(math.cos(a)*31,3,math.sin(a)*31)
  ppart("RunePillar",Vector3.new(3,8,3),pos,Style.Stone,Enum.Material.Slate)
  local crystal=ppart("RuneCrystal",Vector3.new(2,4,2),pos+Vector3.new(0,6,0),Style.Crystal,Enum.Material.Neon);crystal.Orientation=Vector3.new(0,i*23,45)
 end
 local gate=ppart("Gate",Vector3.new(28,18,4),Vector3.new(0,9,-36),Style.Stone,Enum.Material.Slate);nameplate(gate,"마을 · 4인 파티 거점",Style.Gold)
 local chief=ppart("VillageChief",Vector3.new(4,6,4),Vector3.new(-15,4,6),Color3.fromRGB(186,151,101),Enum.Material.SmoothPlastic);nameplate(chief,"이장 · 첫 동료 카일",Style.Gold)
 prompt(chief,"이장","이야기 듣기").Triggered:Connect(function(p)
  if n(p,"StoryStage",0)==0 then p:SetAttribute("StoryStage",1);unlock(p,"KYLE","폐광 수호자 카일이 합류했다.")
  else p:SetAttribute("LastAction","카일과 함께 필드 몬스터 5마리를 처치해.")end
 end)
 local sera=ppart("SeraNPC",Vector3.new(4,6,4),Vector3.new(0,4,12),Style.CompanionColors.SERA,Enum.Material.SmoothPlastic);nameplate(sera,"세라 · 추적자",Style.Gold)
 prompt(sera,"세라","동료 영입").Triggered:Connect(function(p)
  if unlocked(p,"KYLE")and n(p,"Kills",0)>=5 then unlock(p,"SERA","카일과 함께 도적단을 밀어내 세라가 합류했다.");p:SetAttribute("StoryStage",math.max(2,n(p,"StoryStage",0)))
  else p:SetAttribute("LastAction","세라: 먼저 카일과 합류하고 몬스터 5마리를 쓰러뜨려.")end
 end)
 local iris=ppart("IrisNPC",Vector3.new(4,6,4),Vector3.new(15,4,6),Style.CompanionColors.IRIS,Enum.Material.SmoothPlastic);nameplate(iris,"이리스 · 룬술사",Style.Gold)
 prompt(iris,"이리스","룬 해방").Triggered:Connect(function(p)
  if unlocked(p,"SERA")and n(p,"BossesDefeated",0)>=1 then unlock(p,"IRIS","세라의 추적 끝에 보스의 룬을 깨고 이리스가 합류했다.");p:SetAttribute("StoryStage",math.max(3,n(p,"StoryStage",0)))
  else p:SetAttribute("LastAction","이리스: 세라와 합류한 뒤 지역보스를 쓰러뜨려.")end
 end)
 local noa=ppart("NoaNPC",Vector3.new(4,6,4),Vector3.new(0,4,-13),Color3.fromRGB(102,153,176),Enum.Material.SmoothPlastic);nameplate(noa,"노아 · 영혼소환사",Style.Gold)
 prompt(noa,"노아","영혼 이야기").Triggered:Connect(function(p)
  if unlocked(p,"IRIS")and n(p,"PartyMemory",0)>=12 then unlock(p,"NOA","완성된 파티의 기억을 본 노아가 합류했다.")
  else p:SetAttribute("LastAction","노아: 이리스와 합류하고 전투의 기억 12를 모아.")end
 end)
 workspace:SetAttribute("WorldArtPass","FANTASY_PARTY_PLAYABLE_V2")
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
 local p=Instance.new("Part");p.Name=def.Name;p.Anchored=true
 p.Size=boss and Vector3.new(10,13,10)or elite and Vector3.new(7,9,7)or Vector3.new(4,6,4);p.Position=pos
 p.Color=boss and Style.Boss or elite and Color3.fromRGB(125,91,52)or enemyColor(def.Id)
 p.Material=(boss or elite)and Enum.Material.Slate or Enum.Material.SmoothPlastic;p.Parent=world
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
  local def=choices[i];local p=Instance.new("Part");p.Name="AI동료_"..def.Name;p.Anchored=true;p.Size=Vector3.new(3,5,3)
  p.Color=Style.CompanionColors[def.Id]or Style.Gold;p.Material=Enum.Material.SmoothPlastic;p.Parent=world;nameplate(p,def.Name.." · "..def.Class,Style.Gold)
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
