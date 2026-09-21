local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
local store=DSS:GetDataStore("midnight-tag-v2")
local remote=RS:FindFirstChild(C.RemoteName)or Instance.new("RemoteEvent");remote.Name=C.RemoteName;remote.Parent=RS
local state="WAITING";local timeLeft=0;local monster=nil;local monsterBot=nil;local forced=false;local lastMonster=0;local bots={};local cooldown={}
local function root(p)local c=p.Character;return c and c:FindFirstChild("HumanoidRootPart")end
local function hum(p)local c=p.Character;return c and c:FindFirstChildOfClass("Humanoid")end
local function speed(p,v)local h=hum(p);if h then h.WalkSpeed=v end end
local function form(p)
 local id=p:GetAttribute("MonsterForm")or"DRAK";for _,f in ipairs(C.MonsterForms)do if f.Id==id then return f end end;return C.MonsterForms[1]
end
local function load(p)
 p:SetAttribute("MonsterPreference","ANY");p:SetAttribute("SoloRole","SURVIVOR");p:SetAttribute("MonsterXP",0);p:SetAttribute("Coins",0);p:SetAttribute("RoundsSinceMonster",0);p:SetAttribute("MonsterForm","DRAK");p:SetAttribute("Role","WAITING");p:SetAttribute("Frozen",false)
 local ok,d=pcall(function()return store:GetAsync("p:"..p.UserId)end);if ok and typeof(d)=="table"then for _,k in ipairs({"MonsterXP","Coins","RoundsSinceMonster"})do if typeof(d[k])=="number"then p:SetAttribute(k,d[k])end end;if typeof(d.MonsterForm)=="string"then p:SetAttribute("MonsterForm",d.MonsterForm)end end
end
local function save(p)pcall(function()store:SetAsync("p:"..p.UserId,{MonsterXP=p:GetAttribute("MonsterXP")or 0,Coins=p:GetAttribute("Coins")or 0,RoundsSinceMonster=p:GetAttribute("RoundsSinceMonster")or 0,MonsterForm=p:GetAttribute("MonsterForm")or"DRAK"})end)end
local function makeArena()
 local old=workspace:FindFirstChild("MidnightArena");if old then old:Destroy()end
 local f=Instance.new("Folder");f.Name="MidnightArena";f.Parent=workspace
 local floor=Instance.new("Part");floor.Anchored=true;floor.Size=Vector3.new(150,1,150);floor.Position=Vector3.new(0,0,0);floor.Parent=f
 for i=1,12 do local o=Instance.new("Part");o.Name="Obstacle"..i;o.Anchored=true;o.Size=Vector3.new(8+(i%3)*3,8,8);o.Position=Vector3.new(-55+(i%4)*35,4,-45+math.floor((i-1)/4)*45);o.Parent=f end
 return f
end
local arena=nil
local function clearBots()for _,b in ipairs(bots)do if b.part then b.part:Destroy()end end;bots={};monsterBot=nil end
local function bot(role,pos)
 local p=Instance.new("Part");p.Anchored=true;p.Size=Vector3.new(3,5,3);p.Position=pos;p.Color=role=="MONSTER"and Color3.fromRGB(80,20,24)or Color3.fromRGB(180,210,230);p.Parent=arena
 local b={part=p,role=role,frozen=false,speed=role=="MONSTER"and 18 or 13};table.insert(bots,b);return b
end
local function weightPick(list)local total=0;for _,p in ipairs(list)do total+=math.max(1,(p:GetAttribute("RoundsSinceMonster")or 0)+1)end;local r=math.random()*total;for _,p in ipairs(list)do r-=math.max(1,(p:GetAttribute("RoundsSinceMonster")or 0)+1);if r<=0 then return p end end;return list[#list]end
local function choose(h)
 if #h==1 then return h[1]:GetAttribute("SoloRole")=="MONSTER"and h[1]or nil,false end
 local v={};for _,p in ipairs(h)do if p:GetAttribute("MonsterPreference")=="MONSTER"then table.insert(v,p)end end
 local pool=#v>0 and v or h;local f={};for _,p in ipairs(pool)do if p.UserId~=lastMonster then table.insert(f,p)end end;if #f>0 then pool=f end
 return weightPick(pool),#v==0
end
local function setRole(p,r)p:SetAttribute("Role",r);p:SetAttribute("Frozen",false);speed(p,r=="MONSTER"and 19 or 16)end
local function active()
 local a={};for _,p in ipairs(Players:GetPlayers())do if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")~=true then table.insert(a,{p=p})end end
 for _,b in ipairs(bots)do if b.role=="SURVIVOR"and not b.frozen then table.insert(a,{b=b})end end;return a
end
local function freezePlayer(p)if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")~=true then p:SetAttribute("Frozen",true);speed(p,0)end end
local function thawPlayer(p)if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")==true then p:SetAttribute("Frozen",false);speed(p,16)end end
local function monsterPos()if monster then local r=root(monster);return r and r.Position end;if monsterBot then return monsterBot.part.Position end end
local function configure(h)
 clearBots();local need=math.max(0,C.TargetPopulation-#h)
 if #h==1 and not monster then monsterBot=bot("MONSTER",Vector3.new(0,3,-45));need=math.max(0,need-1)end
 for i=1,need do bot("SURVIVOR",Vector3.new(-45+(i*17)%80,3,40-(i%3)*28))end
end
local function startRound()
 local h=Players:GetPlayers();if #h==0 then return false end;arena=makeArena();monster,forced=choose(h);if monster then lastMonster=monster.UserId end
 for _,p in ipairs(h)do setRole(p,p==monster and"MONSTER"or"SURVIVOR");p:SetAttribute("RoundState","RUNNING")end;configure(h);state="RUNNING";timeLeft=C.RoundSeconds;return true
end
local function endRound(winner)
 if state~="RUNNING"then return end;state="RESULT"
 for _,p in ipairs(Players:GetPlayers())do local m=p:GetAttribute("Role")=="MONSTER";local win=(winner=="MONSTER"and m)or(winner=="SURVIVOR"and not m);local reward=win and 30 or 12;if m and forced then reward=math.floor(reward*1.5)end;p:SetAttribute("Coins",(p:GetAttribute("Coins")or 0)+reward);if m then p:SetAttribute("MonsterXP",(p:GetAttribute("MonsterXP")or 0)+(win and 40 or 18));p:SetAttribute("RoundsSinceMonster",0)else p:SetAttribute("RoundsSinceMonster",(p:GetAttribute("RoundsSinceMonster")or 0)+1)end;p:SetAttribute("RoundState","RESULT_"..winner)end
 clearBots();monster=nil;monsterBot=nil;task.wait(4)
end
local function rescue(p)
 if state~="RUNNING"or p:GetAttribute("Role")~="SURVIVOR"or p:GetAttribute("Frozen")==true then return end;local r=root(p);if not r then return end
 for _,o in ipairs(Players:GetPlayers())do if o~=p and o:GetAttribute("Frozen")==true then local q=root(o);if q and(q.Position-r.Position).Magnitude<=C.RescueDistance then thawPlayer(o);return end end end
 for _,b in ipairs(bots)do if b.role=="SURVIVOR"and b.frozen and(b.part.Position-r.Position).Magnitude<=C.RescueDistance then b.frozen=false;b.part.Color=Color3.fromRGB(180,210,230);return end end
end
local function ability(p)
 if state~="RUNNING"or p~=monster then return end;local now=os.clock();if now-(cooldown[p]or 0)<7 then return end;cooldown[p]=now;local r=root(p);if not r then return end;local f=form(p)
 if f.Ability=="BAT_DASH"then r.AssemblyLinearVelocity=r.CFrame.LookVector*70+Vector3.new(0,r.AssemblyLinearVelocity.Y,0)
 elseif f.Ability=="POWER_CHARGE"then r.AssemblyLinearVelocity=r.CFrame.LookVector*85+Vector3.new(0,4,0)
 elseif f.Ability=="RAGE_RUN"then speed(p,28);task.delay(3,function()if p.Parent and p:GetAttribute("Role")=="MONSTER"then speed(p,19)end end)
 elseif f.Ability=="CURSE_SLOW"then for _,o in ipairs(Players:GetPlayers())do if o:GetAttribute("Role")=="SURVIVOR"and o:GetAttribute("Frozen")~=true then local q=root(o);if q and(q.Position-r.Position).Magnitude<=22 then speed(o,9);task.delay(3,function()if o.Parent and o:GetAttribute("Frozen")~=true then speed(o,16)end end)end end end
 elseif f.Ability=="SHADOW_STEP"then r.CFrame=r.CFrame+ r.CFrame.LookVector*18 end
end
local function nextMonster(p)
 if state=="RUNNING"then return end;local xp=p:GetAttribute("MonsterXP")or 0;local cur=p:GetAttribute("MonsterForm")or"DRAK";local idx=1;for i,f in ipairs(C.MonsterForms)do if f.Id==cur then idx=i end end
 for n=1,#C.MonsterForms do local j=((idx+n-1)%#C.MonsterForms)+1;local f=C.MonsterForms[j];if xp>=f.UnlockXP then p:SetAttribute("MonsterForm",f.Id);return end end
end
remote.OnServerEvent:Connect(function(p,a)
 if a==C.Actions.PREFER_MONSTER then p:SetAttribute("MonsterPreference","MONSTER")
 elseif a==C.Actions.PREFER_SURVIVOR then p:SetAttribute("MonsterPreference","SURVIVOR")
 elseif a==C.Actions.SOLO_MONSTER and #Players:GetPlayers()==1 and state~="RUNNING"then p:SetAttribute("SoloRole","MONSTER")
 elseif a==C.Actions.SOLO_SURVIVOR and #Players:GetPlayers()==1 and state~="RUNNING"then p:SetAttribute("SoloRole","SURVIVOR")
 elseif a==C.Actions.RESCUE then rescue(p)
 elseif a==C.Actions.ABILITY then ability(p)
 elseif a==C.Actions.NEXT_MONSTER then nextMonster(p)end
end)
Players.PlayerAdded:Connect(load);for _,p in ipairs(Players:GetPlayers())do load(p)end;Players.PlayerRemoving:Connect(function(p)save(p);cooldown[p]=nil end);game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)
task.spawn(function()while true do
 if #Players:GetPlayers()==0 then state="WAITING";task.wait(1)else
  state="INTERMISSION";for t=C.IntermissionSeconds,1,-1 do for _,p in ipairs(Players:GetPlayers())do p:SetAttribute("RoundState","INTERMISSION");p:SetAttribute("TimeLeft",t)end;task.wait(1)end
  if startRound()then while state=="RUNNING"and timeLeft>0 do
    local mp=monsterPos();if mp then for _,p in ipairs(Players:GetPlayers())do if p:GetAttribute("Role")=="SURVIVOR"and p:GetAttribute("Frozen")~=true then local r=root(p);if r and(r.Position-mp).Magnitude<=C.TagDistance then freezePlayer(p)end end end;for _,b in ipairs(bots)do if b.role=="SURVIVOR"and not b.frozen and(b.part.Position-mp).Magnitude<=C.TagDistance then b.frozen=true;b.part.Color=Color3.fromRGB(120,190,240)end end end
    if #active()==0 then endRound("MONSTER");break end;for _,p in ipairs(Players:GetPlayers())do p:SetAttribute("TimeLeft",timeLeft)end;task.wait(.25);timeLeft-=.25
   end;if state=="RUNNING"then endRound("SURVIVOR")end
  end
 end
end end)
RunService.Heartbeat:Connect(function(dt)
 if state~="RUNNING"then return end;local mp=monsterPos()
 for _,b in ipairs(bots)do if not b.frozen then
  if b.role=="MONSTER"then local best,bd=nil,math.huge;for _,a in ipairs(active())do local pos=a.p and(root(a.p)and root(a.p).Position)or(a.b and a.b.part.Position);if pos then local d=(pos-b.part.Position).Magnitude;if d<bd then bd=d;best=pos end end end;if best then local d=Vector3.new(best.X-b.part.Position.X,0,best.Z-b.part.Position.Z);if d.Magnitude>.1 then b.part.Position+=d.Unit*math.min(d.Magnitude,b.speed*dt)end end
  elseif mp then local away=b.part.Position-mp;if away.Magnitude<35 then local d=Vector3.new(away.X,0,away.Z);if d.Magnitude>.1 then b.part.Position+=d.Unit*b.speed*dt end end end
 end end
end)
