local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
local store=DSS:GetDataStore("daechung-rpg-party-v1")
local remote=RS:FindFirstChild(C.RemoteName)or Instance.new("RemoteEvent");remote.Name=C.RemoteName;remote.Parent=RS
local world,enemies={},{};local companionParts={}
local function root(p)local c=p.Character;return c and c:FindFirstChild("HumanoidRootPart")end
local function n(p,k,d)local v=p:GetAttribute(k);return typeof(v)=="number"and v or d end
local function class(p)local id=p:GetAttribute("ClassId")or C.Classes[1].Id;for _,x in ipairs(C.Classes)do if x.Id==id then return x end end;return C.Classes[1]end
local function makeWorld()
 local old=workspace:FindFirstChild("DaechungRPGWorld");if old then old:Destroy()end;world=Instance.new("Folder");world.Name="DaechungRPGWorld";world.Parent=workspace
 local f=Instance.new("Part");f.Anchored=true;f.Size=Vector3.new(180,1,180);f.Position=Vector3.new(0,0,0);f.Parent=world
end
local function unit(name,pos,hp,boss)
 local p=Instance.new("Part");p.Name=name;p.Anchored=true;p.Size=boss and Vector3.new(7,9,7)or Vector3.new(4,6,4);p.Position=pos;p.Parent=world
 local e={part=p,hp=hp,max=hp,boss=boss};table.insert(enemies,e);return e
end
local function spawnEnemy(boss)local a=math.random()*6.28;local r=boss and 62 or math.random(32,75);return unit(boss and"지역보스"or"몬스터",Vector3.new(math.cos(a)*r,3,math.sin(a)*r),boss and 260 or 60,boss)end
local function load(p)
 p:SetAttribute("Gold",100);p:SetAttribute("XP",0);p:SetAttribute("Level",1);p:SetAttribute("WeaponTier",1);p:SetAttribute("ClassId","BREAKER");p:SetAttribute("AIStyle","PROTECT");p:SetAttribute("Relic","FURY");p:SetAttribute("PartyMemory",0);p:SetAttribute("BossCompanionUnlocked",0);p:SetAttribute("HiddenCompanionUnlocked",0)
 local ok,d=pcall(function()return store:GetAsync("p:"..p.UserId)end);if ok and typeof(d)=="table"then for k,v in pairs(d)do if typeof(v)=="number"or typeof(v)=="string"then p:SetAttribute(k,v)end end end
end
local function save(p)local d={};for _,k in ipairs({"Gold","XP","Level","WeaponTier","ClassId","AIStyle","Relic","PartyMemory","BossCompanionUnlocked","HiddenCompanionUnlocked"})do d[k]=p:GetAttribute(k)end;pcall(function()store:SetAsync("p:"..p.UserId,d)end)end
local function nearest(pos,range)local best,bd=nil,range;for _,e in ipairs(enemies)do if e.hp>0 and e.part.Parent then local d=(e.part.Position-pos).Magnitude;if d<=bd then bd=d;best=e end end end;return best end
local function hit(p,amount,range)
 local r=root(p);if not r then return end;local e=nearest(r.Position,range);if not e then p:SetAttribute("LastAction","사거리 안 적 없음")return end
 e.hp-=amount; e.part:SetAttribute("HP",math.max(0,e.hp))
 if e.hp<=0 then e.part:Destroy();p:SetAttribute("Gold",n(p,"Gold",0)+(e.boss and 60 or 8));p:SetAttribute("XP",n(p,"XP",0)+(e.boss and 80 or 12));p:SetAttribute("PartyMemory",n(p,"PartyMemory",0)+(e.boss and 3 or 1));if e.boss then p:SetAttribute("BossCompanionUnlocked",1)end;p:SetAttribute("LastAction",e.boss and"보스 격파 - 보스동료 루트 해금"or"몬스터 처치")end
end
local function cycle(p,key,list)local cur=p:GetAttribute(key);local idx=1;for i,v in ipairs(list)do local id=typeof(v)=="table"and v.Id or v;if id==cur then idx=i end end;local nextv=list[idx%#list+1];p:SetAttribute(key,typeof(nextv)=="table"and nextv.Id or nextv)end
remote.OnServerEvent:Connect(function(p,a)
 if a==C.Actions.ATTACK then local x=class(p);hit(p,(x.Damage or 10)+n(p,"WeaponTier",1)*3,14)
 elseif a==C.Actions.SKILL then local x=class(p);hit(p,(x.Skill or 25)+n(p,"WeaponTier",1)*4,24)
 elseif a==C.Actions.DODGE then local r=root(p);if r then r.AssemblyLinearVelocity=r.CFrame.LookVector*45+Vector3.new(0,r.AssemblyLinearVelocity.Y,0)end
 elseif a==C.Actions.NEXT_CLASS then cycle(p,"ClassId",C.Classes)
 elseif a==C.Actions.NEXT_AI then cycle(p,"AIStyle",C.AIStyles)
 elseif a==C.Actions.NEXT_RELIC then cycle(p,"Relic",C.Relics)
 elseif a==C.Actions.UPGRADE_WEAPON then local cost=40+n(p,"WeaponTier",1)*30;if n(p,"Gold",0)>=cost then p:SetAttribute("Gold",n(p,"Gold",0)-cost);p:SetAttribute("WeaponTier",n(p,"WeaponTier",1)+1)end end
end)
makeWorld();for i=1,10 do spawnEnemy(false)end;spawnEnemy(true)
Players.PlayerAdded:Connect(load);for _,p in ipairs(Players:GetPlayers())do load(p)end;Players.PlayerRemoving:Connect(save);game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)
local function rebuildCompanions()
 for _,x in ipairs(companionParts)do if x then x:Destroy()end end;companionParts={}
 local humans=Players:GetPlayers();local needed=math.max(0,C.PartySlots-#humans)
 for i=1,needed do local def=C.StarterCompanions[((i-1)%#C.StarterCompanions)+1];local p=Instance.new("Part");p.Name="AI동료_"..def.Name;p.Anchored=true;p.Size=Vector3.new(3,5,3);p.Parent=world;table.insert(companionParts,p)end
end
Players.PlayerAdded:Connect(function()task.defer(rebuildCompanions)end);Players.PlayerRemoving:Connect(function()task.defer(rebuildCompanions)end);rebuildCompanions()
RunService.Heartbeat:Connect(function(dt)
 local humans=Players:GetPlayers();if #humans==0 then return end;local leader=root(humans[1]);if not leader then return end
 for i,p in ipairs(companionParts)do if p.Parent then local target=leader.Position+Vector3.new((i-2)*4,0,5);local d=Vector3.new(target.X-p.Position.X,0,target.Z-p.Position.Z);if d.Magnitude>.5 then p.Position+=d.Unit*math.min(d.Magnitude,14*dt)end
  local e=nearest(p.Position,13);if e then e.hp-=6*dt;if e.hp<=0 and e.part.Parent then e.part:Destroy()end end
 end end
 for i=#enemies,1,-1 do if enemies[i].hp<=0 or not enemies[i].part.Parent then table.remove(enemies,i)end end;if #enemies<6 then spawnEnemy(false)end
end)
