
-- 파일명: server/Game.server.luau
-- 임포트
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local Run=game:GetService("RunService")
local C=require(RS:WaitForChild("Shared"):WaitForChild("Config"))
local VisualKit=require(RS:WaitForChild("Shared"):WaitForChild("VisualKit"))
-- 모델 적재는 서버 시작 단계에서 기다리지 않는다. UI/지형을 먼저 만든다.
local terrain=workspace.Terrain
local Lighting=game:GetService("Lighting")
local remote=RS:FindFirstChild(C.Remote) or Instance.new("RemoteEvent")
remote.Name=C.Remote;remote.Parent=RS
local store
pcall(function()store=DSS:GetDataStore(C.SaveKey)end)
local arenas,lastRequest={},{}
local nextArena=0
local root=Instance.new("Folder");root.Name="BaeksuWarWorld";root.Parent=workspace
-- 기존 8종/10단계/저장키를 유지하며 경제·지휘·전선점령만 확장한다.
local COMMANDS={PUSH=true,RALLY=true,DEFEND=true}
local MISSIONS={
 {Title="적 병력 5마리 처치",Reward=90},
 {Title="서식지 2개 건설",Reward=140},
 {Title="전초 거점 1곳 점령",Reward=180},
 {Title="3스테이지 진입",Reward=230},
 {Title="군단 연구 2단계 달성",Reward=360},
}
local function workerCost(n)return math.floor(75*1.65^n) end
local function labCost(n)return math.floor(125*1.7^n) end
local function techCost(n)return math.floor(65*2.05^n) end
local function buildingCount(a)
 local n=0
 for _,b in pairs(a.Buildings) do if b then n+=1 end end
 return n
end
local function questReady(a)
 if a.Mission==1 then return a.Kills>=5 end
 if a.Mission==2 then return buildingCount(a)>=2 end
 if a.Mission==3 then return a.CapturedEver>=1 end
 if a.Mission==4 then return a.Stage>=3 end
 if a.Mission==5 then return a.Tech>=2 end
 return false
end
local function ownedPoints(a)
 local n=0
 for _,point in ipairs(a.Points) do if point.Owner=="ALLY" then n+=1 end end
 return n
end
local function economy(a)
 local owned=ownedPoints(a)
 local income=math.floor(3+a.Workers*2.5+owned*(2+a.Workers*.8))
 return {
  Gold=a.Gold,Workers=a.Workers,Lab=a.Lab,Research=a.Research,Tech=a.Tech,
  Command=a.Command,Points=owned,Kills=a.Kills,Mission=a.Mission,
  MissionTitle=MISSIONS[a.Mission] and MISSIONS[a.Mission].Title or "모든 임무 완료",
  MissionReward=MISSIONS[a.Mission] and MISSIONS[a.Mission].Reward or 0,
  CanClaim=questReady(a),WorkerCost=a.Workers<8 and workerCost(a.Workers) or 0,
  LabCost=a.Lab<5 and labCost(a.Lab) or 0,
  TechCost=a.Tech<5 and techCost(a.Tech) or 0,PassiveGold=income
 }
end
local function drawCaptureMarker(a,point,index)
 -- 월드 공간 UI만 사용한다. 새 Part/임의 건물/원통형 장식은 만들지 않는다.
 local marker=Instance.new("Attachment")
 marker.Name="전초 거점 "..index
 marker.Parent=terrain
 marker.WorldPosition=Vector3.new(a.X+(index==1 and -15 or 15),2.5,point.Z)
 local board=Instance.new("BillboardGui")
 board.Name="전선 점령 현황";board.AlwaysOnTop=true
 board.Size=UDim2.fromOffset(103,30);board.MaxDistance=80
 board.StudsOffsetWorldSpace=Vector3.new(0,1.1,0);board.Adornee=marker;board.Parent=marker
 local text=Instance.new("TextLabel")
 text.Name="상태";text.Size=UDim2.fromScale(1,1)
 text.BackgroundColor3=Color3.fromRGB(27,36,42)
 text.BackgroundTransparency=.36;text.TextColor3=Color3.fromRGB(255,230,174)
 text.TextScaled=false;text.TextSize=12;text.TextWrapped=false
 text.Font=Enum.Font.GothamBold;text.Parent=board
 local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,9);corner.Parent=text
 point.Marker=marker;point.Label=text;point.Index=index
end
local function captureState(point)
 local state=point.Owner=="ALLY" and "우리 군단" or point.Owner=="ENEMY" and "적 군단" or "중립"
 return "거점 "..point.Index.." "..state.." "..math.floor(math.abs(point.Progress)).."%"
end
local function tickCapture(a,dt)
 local changed=false
 for _,point in ipairs(a.Points) do
  local ally,enemy=0,0
  for _,u in ipairs(a.Units) do
   if u.HP>0 and math.abs(u.Z-point.Z)<9 and math.abs(u.X)<17 then
    if u.Team=="ALLY" then ally+=1 else enemy+=1 end
   end
  end
  local pressure=math.clamp(ally-enemy,-5,5)
  if pressure~=0 then
   point.Progress=math.clamp(point.Progress+pressure*18*dt,-100,100)
  end
  local previous=point.Owner
  if point.Progress>=100 then point.Owner="ALLY"
  elseif point.Progress<=-100 then point.Owner="ENEMY"
  elseif math.abs(point.Progress)<5 then point.Owner="NEUTRAL" end
  if previous~=point.Owner then
   changed=true
   if point.Owner=="ALLY" then
    if not point.Credited then
     point.Credited=true
     a.CapturedEver=math.min(2,a.CapturedEver+1)
     a.Gold+=45
    end
   end
  end
  if point.Label then
   local display=captureState(point)
   if point.Label.Text~=display then point.Label.Text=display end
   point.Label.TextColor3=point.Owner=="ALLY" and Color3.fromRGB(151,255,189)
    or point.Owner=="ENEMY" and Color3.fromRGB(255,159,153) or Color3.fromRGB(255,230,174)
  end
 end
 if changed then a.Player:SetAttribute("CapturedPoints",ownedPoints(a)) end
end
-- ===== 배경/지형 =====
-- Terrain만 사용하며, 캐릭터·건물·소품을 도형 파츠로 새로 제작하지 않는다.
local function terrainBlock(cf,size,material)
 terrain:FillBlock(cf,size,material)
end
local function buildArenaTerrain(x)
 -- 대형 섬형 군단 타이쿤: 바다 1000x1280, 주 섬 760x1100 스터드.
 -- 재료는 Roblox Terrain만 사용. 건물/전투 캐릭터를 파츠로 제작하지 않는다.
 local world=C.World
 terrainBlock(CFrame.new(x,-15,-18),Vector3.new(world.WaterWidth,20,world.WaterLength),Enum.Material.Water)
 terrainBlock(CFrame.new(x,-11,-22),Vector3.new(world.IslandWidth,20,world.IslandLength),Enum.Material.Rock)
 terrainBlock(CFrame.new(x,-.9,-22),Vector3.new(world.IslandWidth-10,5,world.IslandLength-12),Enum.Material.Grass)

 -- 후방 기지와 적 본진은 전선에서 멀리 떨어진 별도 확장 구역이다.
 terrainBlock(CFrame.new(x,1,-388),Vector3.new(265,2,180),Enum.Material.Ground)
 terrainBlock(CFrame.new(x,1,375),Vector3.new(240,2,170),Enum.Material.Sand)
 terrainBlock(CFrame.new(x,1.1,-340),Vector3.new(230,1.7,100),Enum.Material.Grass)
 terrainBlock(CFrame.new(x,1.1,347),Vector3.new(195,1.7,95),Enum.Material.Ground)

 -- 기지에서 적 성채까지 이어지는 긴 간선로(폭 42), 측면 보급 도로.
 terrainBlock(CFrame.new(x,1.4,12),Vector3.new(42,2,693),Enum.Material.Ground)
 terrainBlock(CFrame.new(x,1.5,12),Vector3.new(26,2,693),Enum.Material.Cobblestone)
 for _,side in ipairs({-1,1}) do
  terrainBlock(CFrame.new(x+side*212,1.4,-30),Vector3.new(24,2,620),Enum.Material.Ground)
 end
 for _,z in ipairs({-300,-225,-55,130,274,326}) do
  terrainBlock(CFrame.new(x,1.4,z),Vector3.new(462,2,24),Enum.Material.Ground)
 end
 -- 모래·바위 노출지대: 직선 도로 옆의 광활한 전장 지형을 구획한다.
 terrainBlock(CFrame.new(x-103,1.05,49),Vector3.new(135,1.8,133),Enum.Material.Sand)
 terrainBlock(CFrame.new(x+127,1.05,158),Vector3.new(138,1.8,151),Enum.Material.Ground)
 terrainBlock(CFrame.new(x+105,1.05,-81),Vector3.new(145,1.8,137),Enum.Material.LeafyGrass)

 -- 물길 두 곳으로 기지·전선·적 본토가 분리되며, 실제 이동 가능한 다리로 연결.
 -- 먼저 Terrain을 파내고 물을 깐 다음 가운데와 측면 보급로를 지형 다리로 잇는다.
 for _,channelZ in ipairs({-174,208}) do
  terrainBlock(CFrame.new(x,-1,channelZ),Vector3.new(725,13,32),Enum.Material.Air)
  terrainBlock(CFrame.new(x,-7,channelZ),Vector3.new(725,10,32),Enum.Material.Water)
  for _,roadX in ipairs({0,-212,212}) do
   local width=roadX==0 and 51 or 34
   terrainBlock(CFrame.new(x+roadX,-1,channelZ),Vector3.new(width+8,8,55),Enum.Material.Rock)
   terrainBlock(CFrame.new(x+roadX,2.1,channelZ),Vector3.new(width,2,55),Enum.Material.Cobblestone)
  end
 end

 -- 먼 해안 암벽·언덕. 전투 경로 바깥에만 배치하고 중앙 도로는 방해하지 않는다.
 for i=0,15 do
  local z=-465+i*61
  for _,side in ipairs({-1,1}) do
   local ridgeX=x+side*(298+math.sin(i*2.14+side)*26)
   local radius=22+(i%4)*7
   terrain:FillBall(Vector3.new(ridgeX,-5+((i%3)*2),z),radius,Enum.Material.Rock)
   terrain:FillBall(Vector3.new(ridgeX-side*16,-6,z+11),radius*.72,Enum.Material.Grass)
  end
 end
 -- 육지 끝단에 굴곡을 줘 매끄러운 직사각형 바닥처럼 보이지 않게 한다.
 for i=0,8 do
  local dx=-318+i*79
  terrain:FillBall(Vector3.new(x+dx,-8,-532+math.sin(i*2.1)*16),27,Enum.Material.Rock)
  terrain:FillBall(Vector3.new(x+dx,-8,494+math.sin(i*2.37)*19),27,Enum.Material.Rock)
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
 return Vector3.new(a.X+((i-1)%3-1)*18,1,C.World.BuildZ-math.floor((i-1)/3)*19)
end
-- 확장 슬롯 뒤쪽에도 충돌 가능한 마당을 넓힌다. 기존 3열 배치는 그대로 유지.
local function resizeBuildYard(a)
 local lastRow=math.floor((a.Unlocked-1)/3)
 local furthestZ=C.World.BuildZ-lastRow*19
 local nearZ=C.World.BuildZ+17
 local backZ=furthestZ-12
 terrainBlock(CFrame.new(a.X,-.9,(nearZ+backZ)/2),
  Vector3.new(75,5,nearZ-backZ),Enum.Material.Grass)
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
 remote:FireClient(p,"STATE",{Gold=a.Gold,Stage=a.Stage,HomeHP=a.HomeHP,EnemyHP=a.EnemyHP,Unlocked=a.Unlocked,Buildings=slots,Economy=economy(a),Message=msg or ""})
end
local function save(a)
 if not a.Loaded or a.SessionOnly or not store then return false end
 local data={Version=1,Gold=math.floor(a.Gold),Stage=a.Stage,Unlocked=a.Unlocked,Buildings={},Workers=a.Workers,Lab=a.Lab,Research=math.floor(a.Research),Tech=a.Tech,Mission=a.Mission,Kills=a.Kills,CapturedEver=a.CapturedEver,Command=a.Command}
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
 local z=enemy and C.World.EnemyGateZ or C.World.FriendlyGateZ
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
 local z=team=="ALLY" and C.World.FriendlySpawnZ or C.World.EnemySpawnZ
 local stat=C.Stats(u,level)
 if team=="ALLY" and a.Tech>0 then
  stat.HP=math.floor(stat.HP*(1+a.Tech*.06))
  stat.Damage=math.floor(stat.Damage*(1+a.Tech*.06))
 end
 local m=Instance.new("Model");m.Name=(team=="ENEMY" and "적 " or "")..u.Name.." Lv."..level;m.Parent=a.Folder
 local cf=CFrame.new(a.X+x,0,z)
 local body,visual=VisualKit.BuildCreature(m,cf,u,level,team)
 if not body or not visual then m:Destroy();return end
 -- 임의 메시의 첫 MeshPart를 전체 유닛의 이동 Pivot으로 지정하지 않는다.
 -- 전투 판정은 기존 X/Z 좌표를 그대로 쓰고, 외형만 Terrain 발 높이로 이동한다.
 table.insert(a.Units,{Model=m,Visual=visual,Team=team,Kind=kind,HP=stat.HP,Damage=stat.Damage,Speed=stat.Speed,Range=stat.Range,X=x,Z=z,Last=0})
end
local function clearUnits(a)
 for _,u in ipairs(a.Units) do if u.Model then u.Model:Destroy() end end
 a.Units={}
end
local function restart(a)
 clearUnits(a);a.HomeHP=C.GateHP;a.EnemyHP=C.EnemyHP+(a.Stage-1)*100;a.EnemyTimer=1.2
 a.Result="";a.Transition=false
 for _,b in pairs(a.Buildings) do b.Timer=.15 end
 send(a,a.SessionOnly and "임시 플레이: 저장 서버 연결 안 됨 · 이번 접속 기록은 저장되지 않아" or (VisualKit.Ready() and "전투 시작! 건물을 지으면 자동 출격해." or "전장 표시 준비 중 · 지형과 UI부터 불러왔어."))
end
local function load(player)
 if not store then return nil,false end
 local ok,value=pcall(function()return store:GetAsync("p:"..player.UserId)end)
 if not ok or (value~=nil and type(value)~="table") then return nil,false end
 if value and (tonumber(value.Version) or 1)>1 then return nil,false end
 return value,true
end
local function populateVisuals(a)
 if a.VisualsInitialized or not VisualKit.Ready() then return end
 a.VisualsInitialized=true
 VisualKit.BuildWorld(a.Folder,a.X)
 createGate(a,false);createGate(a,true)
 for i=1,a.Unlocked do drawBuilding(a,i) end
end
local function makeArena(player,data,loaded)
 nextArena+=1
 local x=(nextArena-1)*C.World.ArenaGap
 local a={Player=player,X=x,Folder=Instance.new("Folder"),Buildings={},Visuals={},Units={},Gold=C.StartGold,Stage=1,Unlocked=C.StartSlots,Serial=0,Loaded=true,SessionOnly=not loaded,
  Workers=0,Lab=0,Research=0,Tech=0,Mission=1,Kills=0,CapturedEver=0,Command="PUSH",
  Points={{Z=C.World.CaptureZ[1],Progress=0,Owner="NEUTRAL"},{Z=C.World.CaptureZ[2],Progress=0,Owner="NEUTRAL"}}}
 a.Folder.Name="Arena_"..player.UserId;a.Folder.Parent=root;arenas[player]=a
 if type(data)=="table" then
  a.Gold=math.max(0,math.floor(tonumber(data.Gold) or a.Gold))
  a.Stage=math.clamp(math.floor(tonumber(data.Stage) or 1),1,9999)
  a.Unlocked=math.max(C.StartSlots,math.floor(tonumber(data.Unlocked) or C.StartSlots))
  -- V1 저장본과 호환: 확장 필드는 없어도 기본값으로 정상 진입한다.
  a.Workers=math.clamp(math.floor(tonumber(data.Workers) or 0),0,8)
  a.Lab=math.clamp(math.floor(tonumber(data.Lab) or 0),0,5)
  a.Research=math.clamp(math.floor(tonumber(data.Research) or 0),0,100000000)
  a.Tech=math.clamp(math.floor(tonumber(data.Tech) or 0),0,5)
  a.Mission=math.clamp(math.floor(tonumber(data.Mission) or 1),1,#MISSIONS+1)
  a.Kills=math.clamp(math.floor(tonumber(data.Kills) or 0),0,100000000)
  a.CapturedEver=math.clamp(math.floor(tonumber(data.CapturedEver) or 0),0,2)
  a.Command=COMMANDS[data.Command] and data.Command or "PUSH"
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
 for i,point in ipairs(a.Points) do drawCaptureMarker(a,point,i) end
 resizeBuildYard(a)
 local visualOk,visualError=pcall(populateVisuals,a)
 if not visualOk then warn("백수대전쟁 월드 외형 배치 실패: "..tostring(visualError)) end
 player:SetAttribute("ArenaX",x)
 player:SetAttribute("SaveStatus",loaded and "READY" or "SESSION_ONLY")
 player.CharacterAdded:Connect(function(character)
  local h=character:WaitForChild("HumanoidRootPart",10)
  if h then character:PivotTo(CFrame.new(x,7,C.World.PlayerSpawnZ)) end
 end)
 if player.Character then task.defer(function()
  local h=player.Character:WaitForChild("HumanoidRootPart",10)
  if h then player.Character:PivotTo(CFrame.new(x,7,C.World.PlayerSpawnZ)) end
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
 -- 클라이언트는 명령만 보내며 비용/조건/전투 결과는 서버에서 검증한다.
 if action=="SET_COMMAND" then
  if type(index)~="string" or not COMMANDS[index] then return end
  a.Command=index
  local names={PUSH="전면 진격",RALLY="전선 집결",DEFEND="본진 방어"}
  send(a,"군단 지휘: "..names[index])
 elseif action=="HIRE_WORKER" then
  if a.Workers>=8 or a.Gold<workerCost(a.Workers) then send(a,"일꾼 고용 조건 부족");return end
  a.Gold-=workerCost(a.Workers);a.Workers+=1
  send(a,"일꾼 "..a.Workers.."명 · 자동 골드 생산 증가")
 elseif action=="UPGRADE_LAB" then
  if a.Lab>=5 or a.Gold<labCost(a.Lab) then send(a,"연구소 증설 조건 부족");return end
  a.Gold-=labCost(a.Lab);a.Lab+=1
  send(a,"연구소 "..a.Lab.."단계 · 연구 생산 증가")
 elseif action=="RESEARCH" then
  if a.Tech>=5 or a.Research<techCost(a.Tech) then send(a,"연구 포인트 부족");return end
  a.Research-=techCost(a.Tech);a.Tech+=1
  send(a,"군단 훈련 연구 "..a.Tech.."단계 완료 · 공격력과 체력 상승")
 elseif action=="CLAIM_MISSION" then
  if not questReady(a) or a.Mission>#MISSIONS then return end
  local reward=MISSIONS[a.Mission].Reward
  a.Gold+=reward;a.Mission+=1
  send(a,"임무 완료 보상 +"..reward.."G")
 -- 기존 집 슬롯/건설/10단계 성장 루프는 변경하지 않는다.
 elseif action=="BUY_SLOT" then
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
 if u.Team=="ENEMY" and ally then
  a.Gold+=9+math.floor(a.Stage*.8)
  a.Kills+=1
 end
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
 tickCapture(a,dt)
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
    -- ATTACK=공성, RALLY=중앙 전선, DEFEND=본진. 기존 적 AI는 유지한다.
    local goal=direction==1 and C.World.EnemyGateZ+5 or C.World.FriendlyGateZ-5
    if u.Team=="ALLY" then
     if a.Command=="RALLY" then goal=C.World.RallyZ
     elseif a.Command=="DEFEND" then goal=C.World.DefendZ end
    end
    local advance=direction==-1 or u.Z<goal
    -- 진형을 유지하면서도 근처 적은 추적해 방어한다.
    if u.Team=="ALLY" and not advance and target and distance<18 then advance=true end
    if advance then
     local step=direction*u.Speed*dt
     if u.Team=="ALLY" and a.Command~="PUSH" and (not target or distance>=18) then
      step=math.min(step,math.max(0,goal-u.Z))
     end
     u.Z+=step
    end
    if target and distance<13 then u.X+=math.clamp(target.X-u.X,-u.Speed*dt*.3,u.Speed*dt*.3) end
    VisualKit.PoseCreature(u.Visual,a.X+u.X,u.Z,direction==1 and 0 or math.pi)
    if direction==1 and u.Z>C.World.EnemyGateZ+2 then a.EnemyHP-=u.Damage;kill(a,u,false)
    elseif direction==-1 and u.Z<C.World.FriendlyGateZ-2 then a.HomeHP-=u.Damage;kill(a,u,false) end
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
  task.wait(2)
  for p,a in pairs(arenas) do
   if p.Parent and not a.Transition then
    local owned=ownedPoints(a)
    a.Gold+=math.floor(3+a.Workers*2.5+owned*(2+a.Workers*.8))
    a.Research+=1+a.Lab*2+owned
    remote:FireClient(p,"ECONOMY",economy(a))
    p:SetAttribute("Research",a.Research)
    p:SetAttribute("CapturedPoints",owned)
    p:SetAttribute("Gold",a.Gold)
    p:SetAttribute("HomeHP",math.max(0,math.ceil(a.HomeHP)))
    p:SetAttribute("EnemyHP",math.max(0,math.ceil(a.EnemyHP)))
   end
  end
 end
end)
task.spawn(function()while true do task.wait(60) for _,a in pairs(arenas) do save(a) end end end)
-- CC0 메시는 승인된 모델만 별도 로드하며 실패 시 파츠로 우회하지 않는다.
task.spawn(function()
 for attempt=1,6 do
  if VisualKit.Preload() then
   for p,a in pairs(arenas) do
    if p.Parent then
    local ok,err=pcall(populateVisuals,a)
    if not ok then warn("백수대전쟁 외형 배치 실패: "..tostring(err)) end
    send(a,ok and "3D 전장 준비 완료 · 군단 출격!" or "3D 모델 배치 오류 · 지형과 UI는 실행 중")
   end
   end
   return
  end
  for p,a in pairs(arenas) do
   if p.Parent then send(a,"3D 모델 연결 재시도 "..attempt.."/6 · 지형/UI 먼저 표시") end
  end
  task.wait(math.min(attempt*5,20))
 end
 warn("백수대전쟁: 승인된 3D 모델 적재 실패; 임의 Part 대체 금지")
 for p,a in pairs(arenas) do
  if p.Parent then send(a,"3D 모델 적재 실패 · 외형 확인 불가") end
 end
end)
Players.PlayerAdded:Connect(function(p)
 local d,loaded=load(p)
 if not p.Parent then return end
 local ok,err=pcall(makeArena,p,d,loaded)
 if not ok then
  warn("백수대전쟁 전장 시작 실패: "..tostring(err))
  local a=arenas[p]
  if a then send(a,"전장 시작 오류 · 서버 재접속 필요")
  else remote:FireClient(p,"LOAD_ERROR",{Message="전장을 시작하지 못했어 · 재접속해 줘"}) end
 end
end)
Players.PlayerRemoving:Connect(function(p)
 local a=arenas[p];if a then save(a);a.Folder:Destroy();arenas[p]=nil end
 lastRequest[p]=nil
end)
game:BindToClose(function()for _,a in pairs(arenas) do save(a) end end)
