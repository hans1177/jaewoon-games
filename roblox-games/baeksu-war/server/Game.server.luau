
-- 파일명: server/Game.server.luau
-- 임포트
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local Run=game:GetService("RunService")
local C=require(RS:WaitForChild("Shared"):WaitForChild("Config"))
local VisualKit=require(RS:WaitForChild("Shared"):WaitForChild("VisualKit"))
VisualKit.Preload()
local terrain=workspace.Terrain
local Lighting=game:GetService("Lighting")
local remote=RS:FindFirstChild(C.Remote) or Instance.new("RemoteEvent")
remote.Name=C.Remote;remote.Parent=RS
local store
pcall(function()store=DSS:GetDataStore(C.SaveKey)end)
local arenas,lastRequest={},{}
local nextArena=0
local root=Instance.new("Folder");root.Name="BaeksuWarWorld";root.Parent=workspace
-- ===== 배경/지형 =====
-- Terrain만 사용하며, 캐릭터·건물·소품을 도형 파츠로 새로 제작하지 않는다.
local function terrainBlock(cf,size,material)
 terrain:FillBlock(cf,size,material)
end
local function buildArenaTerrain(x)
 -- 각 사용자 전장은 좌우 180 스터드 간격으로 격리한다.
 -- 병력 AI, 성문 좌표, 건물 슬롯, 저장 데이터에는 영향을 주지 않는 시각 지형이다.
 terrainBlock(CFrame.new(x,-8,-7),Vector3.new(156,15,274),Enum.Material.Rock)
 terrainBlock(CFrame.new(x,-2,-7),Vector3.new(154,5,272),Enum.Material.Grass)
 -- 기지와 공성전 연결 도로: 자연 흙길 + 거친 석재 입구. 밟을 수 있는 Terrain이다.
 terrainBlock(CFrame.new(x,-.6,-1),Vector3.new(30,2,112),Enum.Material.Ground)
 terrainBlock(CFrame.new(x,-.48,-1),Vector3.new(19,1.7,112),Enum.Material.Sand)
 for _,z in ipairs({-45,40}) do
  terrainBlock(CFrame.new(x,-.42,z),Vector3.new(30,1.8,9),Enum.Material.Cobblestone)
 end
 -- 양옆 강줄기는 이동로 밖에만 놓아 기존 전투/건설을 방해하지 않는다.
 for _,side in ipairs({-1,1}) do
  local riverX=x+side*80
  terrainBlock(CFrame.new(riverX,-2.6,-8),Vector3.new(11,5,215),Enum.Material.Air)
  terrainBlock(CFrame.new(riverX,-3.15,-8),Vector3.new(10,3,215),Enum.Material.Water)
  for i=0,7 do
   local z=-112+i*31
   local ridgeX=x+side*(59+math.sin(i*1.9+side)*4)
   local radius=10+(i%3)*2
   terrain:FillBall(Vector3.new(ridgeX,-4,z),radius,Enum.Material.Rock)
   terrain:FillBall(Vector3.new(ridgeX-side*3,-4,z),radius*.79,Enum.Material.Grass)
  end
 end
 -- 앞뒤 골짜기 경계. 실제 GLB 소품은 기존 VisualKit만 담당한다.
 for i=0,7 do
  local xx=x-64+i*18
  terrain:FillBall(Vector3.new(xx,-9,117),10+(i%3)*2,Enum.Material.Grass)
  terrain:FillBall(Vector3.new(xx,-9,-131),11+(i%2)*2,Enum.Material.Grass)
 end
end
-- 장소의 환경 설정은 별도 파츠/자산을 생성하지 않는다.
Lighting.ClockTime=14
Lighting.Brightness=2.3
Lighting.GlobalShadows=true
Lighting.OutdoorAmbient=Color3.fromRGB(149,158,158)
Lighting.EnvironmentDiffuseScale=.65
Lighting.EnvironmentSpecularScale=.4
local atmosphere=Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
atmosphere.Density=.24
atmosphere.Offset=.1
atmosphere.Haze=.8
atmosphere.Color=Color3.fromRGB(214,234,247)
atmosphere.Decay=Color3.fromRGB(151,179,163)
atmosphere.Parent=Lighting
local clouds=terrain:FindFirstChildOfClass("Clouds") or Instance.new("Clouds")
clouds.Cover=.31
clouds.Density=.35
clouds.Color=Color3.fromRGB(251,250,246)
clouds.Parent=terrain
local function slotPosition(a,i)
 return Vector3.new(a.X+((i-1)%3-1)*14,1,-60-math.floor((i-1)/3)*13)
end
-- 확장 슬롯 뒤쪽에도 충돌 가능한 마당을 넓힌다. 기존 3열 배치는 그대로 유지.
local function resizeBuildYard(a)
 local lastRow=math.floor((a.Unlocked-1)/3)
 local furthestZ=-60-lastRow*13
 local nearZ=-46
 local backZ=furthestZ-8
 terrainBlock(CFrame.new(a.X,-2.5,(nearZ+backZ)/2),
  Vector3.new(50,5,nearZ-backZ),Enum.Material.Grass)
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
 if not a.Loaded or a.SessionOnly or not store then return false end
 local data={Version=1,Gold=math.floor(a.Gold),Stage=a.Stage,Unlocked=a.Unlocked,Buildings={}}
 for i,b in pairs(a.Buildings) do data.Buildings[tostring(i)]={Kind=b.Kind,Level=b.Level} end
 local ok,result=pcall(function()
  return store:UpdateAsync("p:"..a.Player.UserId,function(previous)
   if type(previous)=="table" and (tonumber(previous.Version) or 1)>1 then return nil end
   return data
  end)
 end)
 local saved=ok and result~=nil
 a.Player:SetAttribute("SaveStatus",saved and "SAVED" or "SAVE_FAILED")
 return saved
end
local function createGate(a,enemy)
 local z=enemy and 45 or -40
 VisualKit.DecorateGate(a.Folder,a.X,z,enemy)
end
local function drawBuilding(a,index)
 if a.Visuals[index] then a.Visuals[index]:Destroy() end
 local m=Instance.new("Model");m.Name="슬롯 "..index;m.Parent=a.Folder;a.Visuals[index]=m
 local pos=slotPosition(a,index)
 local b=a.Buildings[index]
 if not b then return end
 local u=C.ById[b.Kind]
 VisualKit.BuildHome(m,pos,u,b.Level)
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
 local m=Instance.new("Model");m.Name=(team=="ENEMY" and "적 " or "")..u.Name.." Lv."..level;m.Parent=a.Folder
 local cf=CFrame.new(a.X+x,2.5,z)
 local body=VisualKit.BuildCreature(m,cf,u,level,team)
 if not body then m:Destroy();return end
 m.PrimaryPart=body
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
 send(a,a.SessionOnly and "임시 플레이: 저장 서버 연결 안 됨 · 이번 접속 기록은 저장되지 않아" or "전투 시작! 건물을 지으면 자동 출격해.")
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
 local a={Player=player,X=x,Folder=Instance.new("Folder"),Buildings={},Visuals={},Units={},Gold=C.StartGold,Stage=1,Unlocked=C.StartSlots,Serial=0,Loaded=true,SessionOnly=not loaded}
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
 buildArenaTerrain(x)
 VisualKit.BuildWorld(a.Folder,x)
 resizeBuildYard(a)
 createGate(a,false);createGate(a,true)
 for i=1,a.Unlocked do drawBuilding(a,i) end
 player:SetAttribute("ArenaX",x)
 player:SetAttribute("SaveStatus",loaded and "READY" or "SESSION_ONLY")
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
 if now-(lastRequest[p] or 0)<.15 then return end
 lastRequest[p]=now
 -- DataStore가 끊기면 이 서버 세션에서만 플레이하도록 허용한다. 미확인 기존 저장본은 덮어쓰지 않는다.
 if action=="BUY_SLOT" then
  local i=a.Unlocked+1
  local cost=C.SlotCost(i)
  if cost~=cost or cost==math.huge or a.Gold<cost then send(a,"슬롯 구매 골드 부족");return end
  a.Gold-=cost;a.Unlocked=i
  resizeBuildYard(a)
  drawBuilding(a,i)
  send(a,"슬롯 "..i.." 해금!")
 elseif action=="BUILD" then
  if type(index)~="number" or index%1~=0 or index<1 or index>a.Unlocked then return end
  if type(kind)~="string" or not C.ById[kind] or a.Buildings[index] then return end
  local u=C.ById[kind]
  if a.Gold<u.Cost then send(a,"건설 골드 부족");return end
  a.Gold-=u.Cost;a.Buildings[index]={Kind=kind,Level=1,Timer=C.Stats(u,1).Interval}
  drawBuilding(a,index);spawn(a,kind,"ALLY",1)
  send(a,u.Home.." 즉시 완성 · 자동 출격")
 elseif action=="UPGRADE" then
  if type(index)~="number" or index%1~=0 or index<1 or index>a.Unlocked then return end
  local b=a.Buildings[index]
  if not b or b.Level>=C.MaxLevel then return end
  local cost=C.UpgradeCost(C.ById[b.Kind],b.Level)
  if a.Gold<cost then send(a,"업그레이드 골드 부족");return end
  a.Gold-=cost;b.Level+=1;b.Timer=C.Stats(C.ById[b.Kind],b.Level).Interval
  drawBuilding(a,index)
  for i=1,C.Stats(C.ById[b.Kind],b.Level).Count do spawn(a,b.Kind,"ALLY",b.Level) end
  send(a,C.ById[b.Kind].Name.." Lv."..b.Level.." 진화!")
 end
end)
local function kill(a,u,ally)
 if u.Dead then return end
 u.Dead=true;u.HP=0;u.Model:Destroy()
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
  if a.Stage>=3 then table.insert(kinds,"slime") end
  if a.Stage>=5 then table.insert(kinds,"golem") end
  if a.Stage>=8 then table.insert(kinds,"dragon") end
  spawn(a,kinds[1+(math.floor(a.Serial/3)+a.Stage-1)%#kinds],"ENEMY",math.min(10,1+math.floor((a.Stage-1)/2)))
 end
 local byTeam={ALLY={},ENEMY={}}
 for _,u in ipairs(a.Units) do
  if u.HP>0 and byTeam[u.Team] then table.insert(byTeam[u.Team],u) end
 end
 for _,u in ipairs(a.Units) do
  if u.HP>0 then
   local target,best=nil,math.huge
   local opponents=byTeam[u.Team=="ALLY" and "ENEMY" or "ALLY"]
   for _,v in ipairs(opponents) do
    if v.HP>0 then
     local d=(u.X-v.X)^2+(u.Z-v.Z)^2
     if d<best then target=v;best=d end
    end
   end
   local distance=math.sqrt(best)
   if target and distance<u.Range+2 then
    if now-u.Last>=.85 then
     u.Last=now;target.HP-=u.Damage
     VisualKit.HitSpark(a.Folder,Vector3.new(a.X+target.X,2.5,target.Z),u.Team)
     if target.HP<=0 then kill(a,target,u.Team=="ALLY") end
    end
   else
    local direction=u.Team=="ALLY" and 1 or -1
    u.Z+=direction*u.Speed*dt
    if target and distance<13 then u.X+=math.clamp(target.X-u.X,-u.Speed*dt*.3,u.Speed*dt*.3) end
    u.Model:PivotTo(CFrame.new(a.X+u.X,2.5+math.sin(now*5+u.X)*.08,u.Z)*CFrame.Angles(0,direction==1 and 0 or math.pi,0))
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
 lastRequest[p]=nil
end)
game:BindToClose(function()for _,a in pairs(arenas) do save(a) end end)
