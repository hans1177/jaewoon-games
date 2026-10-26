
-- 파일명: server/Game.server.luau
-- 임포트
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local Run=game:GetService("RunService")
local C=require(RS:WaitForChild("Shared"):WaitForChild("Config"))
local remote=RS:FindFirstChild(C.Remote) or Instance.new("RemoteEvent")
remote.Name=C.Remote;remote.Parent=RS
local store
pcall(function()store=DSS:GetDataStore(C.SaveKey)end)
local arenas,last={},{}
local nextArena=0
local root=Instance.new("Folder");root.Name="BaeksuWarWorld";root.Parent=workspace
-- 유틸: 서버가 모든 전투·골드·슬롯을 소유한다.
local function block(parent,name,size,cf,color,material,shape)
 local x=Instance.new("Part")
 x.Name=name;x.Size=size;x.CFrame=cf;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic
 x.Anchored=true;x.CanCollide=false;x.CanTouch=false
 if shape then x.Shape=shape end;x.Parent=parent
 return x
end
local function tag(p,value)
 local g=Instance.new("BillboardGui")
 g.Size=UDim2.fromOffset(153,32);g.StudsOffset=Vector3.new(0,4,0);g.MaxDistance=160;g.Parent=p
 local t=Instance.new("TextLabel");t.Size=UDim2.fromScale(1,1);t.Text=value
 t.TextScaled=true;t.Font=Enum.Font.GothamBold;t.TextColor3=Color3.fromRGB(255,239,189)
 t.TextStrokeTransparency=.5;t.BackgroundColor3=Color3.fromRGB(30,40,44)
 t.BackgroundTransparency=.2;t.Parent=g
end
local function slotPosition(a,i)
 return Vector3.new(a.X+((i-1)%3-1)*14,1,-60-math.floor((i-1)/3)*13)
end
local function send(a,msg)
 if not a.Player.Parent then return end
 local p=a.Player
 p:SetAttribute("Gold",a.Gold);p:SetAttribute("Stage",a.Stage)
 p:SetAttribute("HomeHP",math.max(0,math.ceil(a.HomeHP)))
 p:SetAttribute("EnemyHP",math.max(0,math.ceil(a.EnemyHP)))
 p:SetAttribute("Unlocked",a.Unlocked)
 local slots={}
 for i=1,a.Unlocked do
  local b=a.Buildings[i]
  slots[i]=b and {Kind=b.Kind,Level=b.Level} or {Kind="",Level=0}
 end
 remote:FireClient(p,"STATE",{Gold=a.Gold,Stage=a.Stage,HomeHP=a.HomeHP,EnemyHP=a.EnemyHP,Unlocked=a.Unlocked,Buildings=slots,Message=msg or ""})
end
local function save(a)
 if not a.Loaded or not store then return false end
 local data={Version=1,Gold=math.floor(a.Gold),Stage=a.Stage,Unlocked=a.Unlocked,Buildings={}}
 for i,b in pairs(a.Buildings) do data.Buildings[tostring(i)]={Kind=b.Kind,Level=b.Level} end
 local ok=pcall(function()
  store:UpdateAsync("p:"..a.Player.UserId,function(previous)
   if type(previous)=="table" and (tonumber(previous.Version) or 1)>1 then return nil end
   return data
  end)
 end)
 a.Player:SetAttribute("SaveStatus",ok and "SAVED" or "SAVE_FAILED")
 return ok
end
local function createGate(a,enemy)
 local z=enemy and 45 or -40
 local parent=a.Folder
 local tone=enemy and Color3.fromRGB(155,80,71) or Color3.fromRGB(91,127,164)
 local stone=Color3.fromRGB(134,130,127)
 for _,side in ipairs({-1,1}) do
  block(parent,"성벽",Vector3.new(13,18,7),CFrame.new(a.X+side*17,9,z),stone,Enum.Material.Slate)
 end
 block(parent,"정문 상단",Vector3.new(46,5,8),CFrame.new(a.X,19,z),stone,Enum.Material.Slate)
 local door=block(parent,enemy and "적 정문" or "아군 정문",Vector3.new(21,14,4),CFrame.new(a.X,7,z),tone,Enum.Material.WoodPlanks)
 tag(door,enemy and "적 성문" or "우리 성문")
end
local function drawBuilding(a,index)
 if a.Visuals[index] then a.Visuals[index]:Destroy() end
 local m=Instance.new("Model");m.Name="슬롯 "..index;m.Parent=a.Folder;a.Visuals[index]=m
 local pos=slotPosition(a,index)
 local pad=block(m,"고정 건설 칸",Vector3.new(11,1,10),CFrame.new(pos),Color3.fromRGB(89,110,105),Enum.Material.Cobblestone)
 local b=a.Buildings[index]
 if not b then tag(pad,"슬롯 "..index.." · 비어있음");return end
 local u=C.ById[b.Kind]
 block(m,"집",Vector3.new(8,5+b.Level*.34,7),CFrame.new(pos.X,4+b.Level*.16,pos.Z),u.Color,Enum.Material.WoodPlanks)
 block(m,"지붕",Vector3.new(10,2,9),CFrame.new(pos.X,7+b.Level*.34,pos.Z),Color3.fromRGB(85,77,88),Enum.Material.Slate)
 block(m,"입구",Vector3.new(2,3,.8),CFrame.new(pos.X,3,pos.Z+3.8),Color3.fromRGB(40,48,52))
 tag(pad,u.Home.." Lv."..b.Level)
end
local function spawn(a,kind,team,level)
 local u=C.ById[kind];if not u then return end
 local alive=0
 for _,x in ipairs(a.Units) do if x.Team==team and x.HP>0 then alive+=1 end end
 if alive>=C.Cap then return end
 a.Serial+=1
 local x=((a.Serial*7)%19)-9
 local z=team=="ALLY" and -31 or 36
 local stat=C.Stats(u,level)
 local h=2.1+level*.2
 if u.Shape=="GOLEM" then h*=1.7 end
 local m=Instance.new("Model");m.Name=(team=="ENEMY" and "적 " or "")..u.Name.." Lv."..level;m.Parent=a.Folder
 local cf=CFrame.new(a.X+x,2.5,z)
 local color=team=="ALLY" and u.Color or u.Color:Lerp(Color3.fromRGB(190,65,61),.5)
 local body=block(m,"몸",Vector3.new(3,h,3),cf,color,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 m.PrimaryPart=body
 local dark=color:Lerp(Color3.fromRGB(38,42,39),.4)
 if u.Shape=="BIRD" or u.Shape=="DRAGON" then
  block(m,"날개 좌",Vector3.new(3,1,2),cf*CFrame.new(-2.2,0,0),dark)
  block(m,"날개 우",Vector3.new(3,1,2),cf*CFrame.new(2.2,0,0),dark)
 elseif u.Shape=="ANT" or u.Shape=="BUG" then
  block(m,"배",Vector3.new(2.5,2,3),cf*CFrame.new(0,-.3,-2),dark,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
 elseif u.Shape=="WOLF" then
  block(m,"주둥이",Vector3.new(2,1,2),cf*CFrame.new(0,0,1.8),dark)
 elseif u.Shape=="TURTLE" then
  block(m,"등껍질",Vector3.new(4,1.8,4),cf*CFrame.new(0,1,0),dark,Enum.Material.Slate,Enum.PartType.Ball)
 elseif u.Shape=="GOLEM" then
  block(m,"어깨",Vector3.new(6,1.5,2),cf*CFrame.new(0,1,0),dark,Enum.Material.Slate)
 else body.Transparency=.15;body.Material=Enum.Material.Glass end
 if level>=5 then block(m,"진화석",Vector3.new(1,1,1),cf*CFrame.new(0,h*.55+.3,0),Color3.fromRGB(255,223,91),Enum.Material.Neon) end
 if level>=10 then block(m,"왕관",Vector3.new(3,1,3),cf*CFrame.new(0,h*.55+1.1,0),Color3.fromRGB(250,198,66),Enum.Material.Metal) end
 table.insert(a.Units,{Model=m,Team=team,Kind=kind,HP=stat.HP,Damage=stat.Damage,Speed=stat.Speed,Range=stat.Range,X=x,Z=z,Last=0})
end
local function clearUnits(a)
 for _,u in ipairs(a.Units) do if u.Model then u.Model:Destroy() end end
 a.Units={}
end
local function restart(a)
 clearUnits(a);a.HomeHP=C.GateHP;a.EnemyHP=C.EnemyHP+(a.Stage-1)*100;a.EnemyTimer=1.2
 a.Result="";a.Transition=false
 for _,b in pairs(a.Buildings) do b.Timer=.15 end
 send(a,"전투 시작! 건물을 지으면 자동 출격해.")
end
local function load(player)
 if not store then return nil,false end
 local ok,value=pcall(function()return store:GetAsync("p:"..player.UserId)end)
 if not ok or (value~=nil and type(value)~="table") then return nil,false end
 if value and (tonumber(value.Version) or 1)>1 then return nil,false end
 return value,true
end
local function makeArena(player,data,loaded)
 nextArena+=1
 local x=(nextArena-1)*180
 local a={Player=player,X=x,Folder=Instance.new("Folder"),Buildings={},Visuals={},Units={},Gold=C.StartGold,Stage=1,Unlocked=C.StartSlots,Serial=0,Loaded=loaded}
 a.Folder.Name="Arena_"..player.UserId;a.Folder.Parent=root;arenas[player]=a
 if type(data)=="table" then
  a.Gold=math.max(0,math.floor(tonumber(data.Gold) or a.Gold))
  a.Stage=math.clamp(math.floor(tonumber(data.Stage) or 1),1,9999)
  a.Unlocked=math.max(C.StartSlots,math.floor(tonumber(data.Unlocked) or C.StartSlots))
  if type(data.Buildings)=="table" then
   for i=1,a.Unlocked do
    local item=data.Buildings[tostring(i)] or data.Buildings[i]
    if type(item)=="table" and C.ById[item.Kind] then
     local lv=tonumber(item.Level)
     if lv then a.Buildings[i]={Kind=item.Kind,Level=math.clamp(math.floor(lv),1,10),Timer=.15} end
    end
   end
  end
 end
 block(a.Folder,"집중 전장",Vector3.new(50,1,140),CFrame.new(x,-.5,-3),Color3.fromRGB(112,154,107),Enum.Material.Grass)
 block(a.Folder,"진격로",Vector3.new(24,.2,100),CFrame.new(x,.08,0),Color3.fromRGB(171,151,119),Enum.Material.Ground)
 createGate(a,false);createGate(a,true)
 for i=1,a.Unlocked do drawBuilding(a,i) end
 player:SetAttribute("ArenaX",x)
 player:SetAttribute("SaveStatus",loaded and "READY" or "LOAD_FAILED")
 player.CharacterAdded:Connect(function(character)
  local h=character:WaitForChild("HumanoidRootPart",10)
  if h then character:PivotTo(CFrame.new(x,5,-56)) end
 end)
 if player.Character then task.defer(function()
  local h=player.Character:WaitForChild("HumanoidRootPart",10)
  if h then player.Character:PivotTo(CFrame.new(x,5,-56)) end
 end) end
 restart(a)
end
-- 메인: 구매·건설·업그레이드. 다른 입력은 무시한다.
remote.OnServerEvent:Connect(function(p,action,index,kind)
 local a=arenas[p];if not a then return end
 if action=="SYNC" then send(a);return end
 local now=os.clock()
 if now-(last[p] or 0)<.15 then return end
 last[p]=now
 if not a.Loaded then send(a,"저장 확인 실패: 진행 보호를 위해 건설 잠금");return end
 if action=="BUY_SLOT" then
  local i=a.Unlocked+1
  local cost=C.SlotCost(i)
  if cost~=cost or cost==math.huge or a.Gold<cost then send(a,"슬롯 구매 골드 부족");return end
  a.Gold-=cost;a.Unlocked=i
  drawBuilding(a,i)
  send(a,"슬롯 "..i.." 해금!")
 elseif action=="BUILD" then
  if type(index)~="number" or index%1~=0 or index<1 or index>a.Unlocked then return end
  if type(kind)~="string" or not C.ById[kind] or a.Buildings[index] then return end
  local u=C.ById[kind]
  if a.Gold<u.Cost then send(a,"건설 골드 부족");return end
  a.Gold-=u.Cost;a.Buildings[index]={Kind=kind,Level=1,Timer=0}
  drawBuilding(a,index);spawn(a,kind,"ALLY",1)
  send(a,u.Home.." 즉시 완성 · 자동 출격")
 elseif action=="UPGRADE" then
  if type(index)~="number" or index%1~=0 or index<1 or index>a.Unlocked then return end
  local b=a.Buildings[index]
  if not b or b.Level>=C.MaxLevel then return end
  local cost=C.UpgradeCost(C.ById[b.Kind],b.Level)
  if a.Gold<cost then send(a,"업그레이드 골드 부족");return end
  a.Gold-=cost;b.Level+=1;b.Timer=0
  drawBuilding(a,index)
  for i=1,C.Stats(C.ById[b.Kind],b.Level).Count do spawn(a,b.Kind,"ALLY",b.Level) end
  send(a,C.ById[b.Kind].Name.." Lv."..b.Level.." 진화!")
 end
end)
local function kill(a,u,ally)
 if u.HP<=0 then return end
 u.HP=0;u.Model:Destroy()
 if u.Team=="ENEMY" and ally then a.Gold+=9+math.floor(a.Stage*.8) end
end
local function finish(a,win)
 if a.Transition then return end
 a.Transition=true
 if win then a.Gold+=90+45*a.Stage;a.Stage+=1 end
 send(a,win and "적 성문 파괴! 다음 스테이지" or "성문 함락! 재도전")
 save(a)
 task.delay(4,function()if arenas[a.Player]==a then restart(a) end end)
end
local function tickArena(a,dt,now)
 if a.Transition then return end
 for _,b in pairs(a.Buildings) do
  local stat=C.Stats(C.ById[b.Kind],b.Level)
  b.Timer=(b.Timer or 0)-dt
  if b.Timer<=0 then
   b.Timer=stat.Interval
   for i=1,stat.Count do spawn(a,b.Kind,"ALLY",b.Level) end
  end
 end
 a.EnemyTimer-=dt
 if a.EnemyTimer<=0 then
  a.EnemyTimer=math.max(1.3,3.6-a.Stage*.09)
  local kinds={"ant","sparrow","beetle","wolf","turtle"}
  spawn(a,kinds[1+(math.floor(a.Serial/3)+a.Stage-1)%#kinds],"ENEMY",math.min(10,1+math.floor((a.Stage-1)/2)))
 end
 for _,u in ipairs(a.Units) do
  if u.HP>0 then
   local target,best=nil,math.huge
   for _,v in ipairs(a.Units) do
    if v.HP>0 and v.Team~=u.Team then
     local d=(u.X-v.X)^2+(u.Z-v.Z)^2
     if d<best then target=v;best=d end
    end
   end
   local distance=math.sqrt(best)
   if target and distance<u.Range+2 then
    if now-u.Last>=.85 then
     u.Last=now;target.HP-=u.Damage
     if target.HP<=0 then target.HP=1;kill(a,target,u.Team=="ALLY") end
    end
   else
    local direction=u.Team=="ALLY" and 1 or -1
    u.Z+=direction*u.Speed*dt
    if target and distance<13 then u.X+=math.clamp(target.X-u.X,-u.Speed*dt*.3,u.Speed*dt*.3) end
    u.Model:PivotTo(CFrame.new(a.X+u.X,2.5,u.Z)*CFrame.Angles(0,direction==1 and 0 or math.pi,0))
    if direction==1 and u.Z>40 then a.EnemyHP-=u.Damage;kill(a,u,false)
    elseif direction==-1 and u.Z< -35 then a.HomeHP-=u.Damage;kill(a,u,false) end
   end
  end
 end
 for i=#a.Units,1,-1 do if a.Units[i].HP<=0 then table.remove(a.Units,i) end end
 if a.EnemyHP<=0 then finish(a,true)
 elseif a.HomeHP<=0 then finish(a,false) end
end
local elapsed=0
Run.Heartbeat:Connect(function(dt)
 elapsed+=math.min(dt,.2)
 if elapsed<.12 then return end
 local d=math.min(elapsed,.24);elapsed=0
 local now=os.clock()
 for p,a in pairs(arenas) do if p.Parent then tickArena(a,d,now) end end
end)
task.spawn(function()
 while true do
  task.wait(1)
  for p,a in pairs(arenas) do
   if p.Parent and not a.Transition then
    p:SetAttribute("Gold",a.Gold)
    p:SetAttribute("HomeHP",math.max(0,math.ceil(a.HomeHP)))
    p:SetAttribute("EnemyHP",math.max(0,math.ceil(a.EnemyHP)))
   end
  end
 end
end)
task.spawn(function()while true do task.wait(60) for _,a in pairs(arenas) do save(a) end end end)
Players.PlayerAdded:Connect(function(p)local d,ok=load(p);makeArena(p,d,ok) end)
Players.PlayerRemoving:Connect(function(p)
 local a=arenas[p];if a then save(a);a.Folder:Destroy();arenas[p]=nil end
 last[p]=nil
end)
game:BindToClose(function()for _,a in pairs(arenas) do save(a) end end)
