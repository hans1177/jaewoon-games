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
local remoteLast={}
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
local function applyMapEvent(f,map,event)
 workspace:SetAttribute("CurrentMapEvent",event.Id)
 workspace:SetAttribute("CurrentMapEventName",event.Name)
 if event.Id=="LIGHTS_OUT"or event.Id=="POWER_OUTAGE"or event.Id=="RIDE_BLACKOUT"then
  Lighting.Brightness=.55
  for _,x in ipairs(f:GetDescendants())do if x:IsA("Part")and x.Name=="CeilingLight"then x.Transparency=.82 end end
 elseif event.Id=="RED_HALL"or event.Id=="EMERGENCY_LIGHTS"then
  Lighting.Ambient=Color3.fromRGB(70,28,32)
  for _,x in ipairs(f:GetDescendants())do if x:IsA("Part")and x.Name=="CeilingLight"then x.Color=Color3.fromRGB(255,72,72)end end
 elseif event.Id=="FOG_HALL"or event.Id=="STERILE_FOG"or event.Id=="MIDWAY_FOG"then
  Lighting.FogEnd=105
 elseif event.Id=="NEON_SURGE"then
  for _,x in ipairs(f:GetDescendants())do if x:IsA("Part")and x.Name=="CeilingLight"then x.Material=Enum.Material.Neon;x.Transparency=0 end end
 end
end
local function makeArena(map)
 local old=workspace:FindFirstChild("MidnightArena");if old then old:Destroy()end
 local f=Instance.new("Folder");f.Name="MidnightArena";f.Parent=workspace
 for k,v in pairs(Style.Lighting)do Lighting[k]=v end
 arenaPart(f,"Floor",Vector3.new(160,1,160),Vector3.new(0,0,0),Style.Floor,Enum.Material.Concrete)
 for _,x in ipairs({-79,79})do arenaPart(f,"OuterWall",Vector3.new(2,18,160),Vector3.new(x,9,0),Style.Wall,Enum.Material.Concrete)end
 for _,z in ipairs({-79,79})do arenaPart(f,"OuterWall",Vector3.new(160,18,2),Vector3.new(0,9,z),Style.Wall,Enum.Material.Concrete)end

 if map.Id=="SCHOOL"then
  for row=-1,1 do
   local z=row*42
   arenaPart(f,"HallWallL",Vector3.new(48,12,3),Vector3.new(-45,6,z),Style.Wall,Enum.Material.Concrete)
   arenaPart(f,"HallWallR",Vector3.new(48,12,3),Vector3.new(45,6,z),Style.Wall,Enum.Material.Concrete)
   for col=-2,2 do
    arenaPart(f,"Locker",Vector3.new(5,8,3),Vector3.new(col*13,4,z+8),Style.Locker,Enum.Material.Metal)
    if (col+row)%2==0 then local lamp=arenaPart(f,"CeilingLight",Vector3.new(8,.5,2),Vector3.new(col*13,10,z-8),Style.SafeLight,Enum.Material.Neon);lamp.Transparency=.1 end
   end
  end
  for i=1,8 do arenaPart(f,"Bench",Vector3.new(11,2,3),Vector3.new(-52+(i%4)*35,1.5,-50+math.floor((i-1)/4)*100),Color3.fromRGB(113,84,68),Enum.Material.WoodPlanks)end
 elseif map.Id=="HOSPITAL"then
  for _,x in ipairs({-38,0,38})do
   arenaPart(f,"WardWall",Vector3.new(3,12,60),Vector3.new(x,6,-34),Style.Wall,Enum.Material.Concrete)
   arenaPart(f,"WardWall",Vector3.new(3,12,60),Vector3.new(x,6,38),Style.Wall,Enum.Material.Concrete)
  end
  for i=-2,2 do
   arenaPart(f,"Bed",Vector3.new(12,2,5),Vector3.new(-56,1.5,i*24),Color3.fromRGB(177,188,191),Enum.Material.Metal)
   arenaPart(f,"Bed",Vector3.new(12,2,5),Vector3.new(56,1.5,i*24),Color3.fromRGB(177,188,191),Enum.Material.Metal)
   local lamp=arenaPart(f,"CeilingLight",Vector3.new(7,.5,2),Vector3.new(0,10,i*24),Color3.fromRGB(185,225,214),Enum.Material.Neon);lamp.Transparency=.12
  end
  arenaPart(f,"Surgery",Vector3.new(28,10,3),Vector3.new(0,5,62),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"Morgue",Vector3.new(34,10,3),Vector3.new(0,5,-62),Style.Wall,Enum.Material.Concrete)
 elseif map.Id=="THEME_PARK"then
  for i=1,10 do
   local a=(i/10)*math.pi*2
   local x,z=math.cos(a)*48,math.sin(a)*48
   arenaPart(f,"RideBooth",Vector3.new(10,7,10),Vector3.new(x,3.5,z),Color3.fromRGB(90+((i*23)%110),55+((i*31)%100),105+((i*17)%100)),Enum.Material.Metal)
  end
  arenaPart(f,"Carousel",Vector3.new(30,2,30),Vector3.new(0,1.5,0),Color3.fromRGB(116,68,116),Enum.Material.WoodPlanks)
  arenaPart(f,"HauntedHouse",Vector3.new(34,12,18),Vector3.new(0,6,58),Color3.fromRGB(54,45,62),Enum.Material.Slate)
  for _,x in ipairs({-45,0,45})do local lamp=arenaPart(f,"CeilingLight",Vector3.new(3,10,3),Vector3.new(x,5,-45),Color3.fromRGB(224,95,184),Enum.Material.Neon);lamp.Transparency=.1 end
 end

 local events=map.Events or {}
 local event=events[math.random(1,math.max(1,#events))]or{Id="NONE",Name="평온"}
 workspace:SetAttribute("CurrentMapId",map.Id)
 workspace:SetAttribute("CurrentMapName",map.Name)
 applyMapEvent(f,map,event)
 workspace:SetAttribute("WorldArtPass","MIDNIGHT_"..map.Id.."_PLAYABLE_V3")
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
  p:SetAttribute("Frozen",true);speed(p,0)
  local c=p.Character;if c then local h=c:FindFirstChild("RoleHighlight");if h then h.FillColor=Style.Frozen;h.OutlineColor=Color3.fromRGB(220,248,255)end end
 end
end
local function thawPlayer(p)
 if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")==true then p:SetAttribute("Frozen",false);speed(p,16);applyRoleVisual(p,"SURVIVOR")end
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
  p:SetAttribute("RoundState","RESULT_"..winner);p:SetAttribute("Frozen",false);speed(p,16)
 end
 clearBots();monster=nil;monsterBot=nil;task.wait(4)
end
local function rescue(p)
 if state~="RUNNING"or p:GetAttribute("Role")~="SURVIVOR"or p:GetAttribute("Frozen")==true then return end
 local r=root(p);if not r then return end
 for _,o in ipairs(Players:GetPlayers())do
  if o~=p and o:GetAttribute("Frozen")==true then local q=root(o);if q and(q.Position-r.Position).Magnitude<=C.RescueDistance then thawPlayer(o);return end end
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
 if now-(remoteLast[p]or 0)<C.RemoteMinInterval then return false end
 remoteLast[p]=now
 return true
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
end)
local function onCharacter(p)
 task.wait(.25)
 if state=="RUNNING"then setRole(p,p==monster and"MONSTER"or"SURVIVOR")end
end
Players.PlayerAdded:Connect(function(p)load(p);p.CharacterAdded:Connect(function()onCharacter(p)end)end)
for _,p in ipairs(Players:GetPlayers())do load(p);p.CharacterAdded:Connect(function()onCharacter(p)end)end
Players.PlayerRemoving:Connect(function(p)
 save(p);cooldown[p]=nil;dashCooldown[p]=nil;remoteLast[p]=nil;lastValidPosition[p]=nil;movementGraceUntil[p]=nil
end)
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
