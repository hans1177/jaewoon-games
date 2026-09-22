local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local Lighting=game:GetService("Lighting")
local Shared=RS:WaitForChild("Shared")
local C=require(Shared:WaitForChild("GameConfig"))
local Style=require(Shared:WaitForChild("VisualStyle"))
local BattleVisual=require(script.Parent:WaitForChild("BattleVisual"))
local store=DSS:GetDataStore("cozy-island-conquest-v2")
local remote=RS:FindFirstChild(C.RemoteName) or Instance.new("RemoteEvent")
remote.Name=C.RemoteName;remote.Parent=RS
local qaCaptureStore=DSS:GetDataStore("qa-camera-captures-v1")
local qaCaptureRemote=RS:FindFirstChild(C.QACaptureRemoteName or "QACaptureReport")or Instance.new("RemoteEvent")
qaCaptureRemote.Name=C.QACaptureRemoteName or "QACaptureReport";qaCaptureRemote.Parent=RS
local qaCaptureLast={}

local lastRequest,battling={},{}
local function part(parent,name,size,pos,color,material)
  local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.Size=size;x.Position=pos;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic;x.Parent=parent;return x
end
local function label(target,text)
  local g=Instance.new("BillboardGui");g.Size=UDim2.fromOffset(112,24);g.StudsOffset=Vector3.new(0,5,0);g.AlwaysOnTop=false;g.MaxDistance=78;g.LightInfluence=.35;g.Parent=target
  local t=Instance.new("TextLabel");t.Size=UDim2.fromScale(1,1);t.BackgroundColor3=Color3.fromRGB(25,35,31);t.BackgroundTransparency=.28;t.TextScaled=true;t.Text=text;t.TextColor3=Color3.new(1,1,1);t.TextStrokeTransparency=.65;t.Parent=g
  local cr=Instance.new("UICorner");cr.CornerRadius=UDim.new(0,6);cr.Parent=t
end
local function buildWorld()
  local old=workspace:FindFirstChild("CozyConquestWorld");if old then old:Destroy()end
  local f=Instance.new("Folder");f.Name="CozyConquestWorld";f.Parent=workspace
  for k,v in pairs(Style.Lighting)do Lighting[k]=v end
  local water=part(f,"Sea",Vector3.new(720,2,720),Vector3.new(0,-6,0),Style.Water,Enum.Material.Glass);water.Transparency=.18

  local function tree(pos,scale)
    local trunk=part(f,"TreeTrunk",Vector3.new(2.4,8,2.4)*scale,pos+Vector3.new(0,4*scale,0),Color3.fromRGB(106,74,48),Enum.Material.Wood)
    local crown=part(f,"TreeCrown",Vector3.new(8,8,8)*scale,trunk.Position+Vector3.new(0,6*scale,0),Color3.fromRGB(77,150,78),Enum.Material.Grass);crown.Shape=Enum.PartType.Ball
  end
  local function rock(pos,scale,color)
    local r=part(f,"Rock",Vector3.new(6,4,5)*scale,pos+Vector3.new(0,2*scale,0),color or Color3.fromRGB(104,103,108),Enum.Material.Rock)
    r.Orientation=Vector3.new(math.random(-8,8),math.random(0,180),math.random(-8,8))
  end
  local function hut(pos,accent)
    local body=part(f,"VillageHut",Vector3.new(12,7,10),pos+Vector3.new(0,3.5,0),Color3.fromRGB(184,150,105),Enum.Material.WoodPlanks)
    local roof=part(f,"VillageRoof",Vector3.new(14,2,12),body.Position+Vector3.new(0,4.7,0),accent,Enum.Material.WoodPlanks);roof.Orientation=Vector3.new(0,0,5)
    part(f,"VillageDoor",Vector3.new(2.5,4,1),body.Position+Vector3.new(0,-1,5.2),Color3.fromRGB(91,65,45),Enum.Material.Wood)
  end

  for index,r in ipairs(Style.Regions)do
    local island=part(f,r.Name,r.Size,r.Pos,r.Color,r.Material);island.Shape=Enum.PartType.Block;label(island,r.Name)
    local topY=r.Pos.Y+r.Size.Y/2
    local base=part(f,"Base_"..index,Vector3.new(22,9,22),Vector3.new(r.Pos.X,topY+4.5,r.Pos.Z),r.Accent,Enum.Material.Brick)
    local roof=part(f,"Roof_"..index,Vector3.new(26,2,26),base.Position+Vector3.new(0,5.5,0),Style.Banner,Enum.Material.WoodPlanks)

    if index==1 then
      -- 기본섬: 넓은 생활권 + 채집/성장 시설을 눈으로 구분
      for i=1,18 do
        local a=i/18*math.pi*2;local radius=44+(i%3)*8
        tree(r.Pos+Vector3.new(math.cos(a)*radius,topY-r.Pos.Y,math.sin(a)*radius),.85+(i%4)*.08)
      end
      for i=1,3 do hut(Vector3.new(-34+i*18,topY+1,24),Color3.fromRGB(116,151,88))end
      part(f,"FarmPlot",Vector3.new(34,1,24),Vector3.new(-33,topY+.7,-28),Color3.fromRGB(116,91,56),Enum.Material.Ground)
      for i=1,5 do part(f,"CropRow",Vector3.new(29,.7,2),Vector3.new(-33,topY+1.2,-38+i*4),Color3.fromRGB(122,177,75),Enum.Material.Grass)end
      part(f,"BarracksYard",Vector3.new(36,1,28),Vector3.new(34,topY+.65,-26),Color3.fromRGB(132,121,103),Enum.Material.Cobblestone)
      part(f,"Dock",Vector3.new(16,2,34),Vector3.new(0,topY-1,76),Color3.fromRGB(125,89,56),Enum.Material.WoodPlanks)
      for _,x in ipairs({-54,-18,18,54})do part(f,"PathStone",Vector3.new(12,.5,6),Vector3.new(x,topY+.5,0),Color3.fromRGB(174,165,139),Enum.Material.Cobblestone)end
    elseif index==2 then
      for i=1,16 do local a=i/16*math.pi*2;rock(r.Pos+Vector3.new(math.cos(a)*36,topY-r.Pos.Y,math.sin(a)*36),.7+(i%3)*.15,Color3.fromRGB(86,91,101))end
      for i=1,6 do part(f,"IronVein",Vector3.new(4,7,4),Vector3.new(r.Pos.X-30+i*10,topY+3,r.Pos.Z+26),Color3.fromRGB(145,158,171),Enum.Material.Metal)end
    elseif index==3 then
      for i=1,10 do tree(r.Pos+Vector3.new(-48+i*9,topY-r.Pos.Y,34+(i%2)*10),.72)end
      for i=1,7 do
        local bale=part(f,"HayBale",Vector3.new(6,5,6),Vector3.new(r.Pos.X-38+i*11,topY+2.5,r.Pos.Z-32+(i%2)*8),Color3.fromRGB(214,183,96),Enum.Material.Fabric);bale.Shape=Enum.PartType.Cylinder;bale.Orientation=Vector3.new(0,0,90)
      end
      part(f,"RanchFence",Vector3.new(72,3,2),Vector3.new(r.Pos.X,topY+1.5,r.Pos.Z+47),Color3.fromRGB(125,92,61),Enum.Material.WoodPlanks)
    elseif index==4 then
      for i=1,22 do local a=i/22*math.pi*2;rock(r.Pos+Vector3.new(math.cos(a)*(30+(i%3)*9),topY-r.Pos.Y,math.sin(a)*(30+(i%3)*9)),.65+(i%4)*.12)end
      part(f,"QuarryCut",Vector3.new(48,2,42),Vector3.new(r.Pos.X,topY+1,r.Pos.Z+22),Color3.fromRGB(107,101,96),Enum.Material.Slate)
    elseif index==5 then
      for i=1,10 do rock(r.Pos+Vector3.new(-48+i*9,topY-r.Pos.Y,30+(i%2)*13),.62,Color3.fromRGB(159,124,69))end
      for i=1,5 do part(f,"GoldVein",Vector3.new(4,6,4),Vector3.new(r.Pos.X-28+i*11,topY+3,r.Pos.Z-30),Color3.fromRGB(244,197,71),Enum.Material.Neon)end
      part(f,"DesertTent",Vector3.new(24,7,18),Vector3.new(r.Pos.X+30,topY+3.5,r.Pos.Z+25),Color3.fromRGB(174,93,65),Enum.Material.Fabric)
    else
      for i=1,18 do local a=i/18*math.pi*2;rock(r.Pos+Vector3.new(math.cos(a)*(34+(i%2)*10),topY-r.Pos.Y,math.sin(a)*(34+(i%2)*10)),.7,Color3.fromRGB(57,55,59))end
      for i=1,7 do part(f,"SulfurVent",Vector3.new(4,8,4),Vector3.new(r.Pos.X-36+i*10,topY+4,r.Pos.Z+28),Color3.fromRGB(239,163,53),Enum.Material.Neon)end
      local lava=part(f,"LavaCrack",Vector3.new(64,.7,8),Vector3.new(r.Pos.X,topY+.4,r.Pos.Z-33),Color3.fromRGB(255,91,30),Enum.Material.Neon);lava.CanCollide=false
    end
  end
  workspace:SetAttribute("WorldArtPass","STYLIZED_ISLANDS_EXPANDED_V2")
end
buildWorld()
local function n(p,k,d)local v=p:GetAttribute(k);return typeof(v)=="number" and v or d end
local function s(p,k,v)p:SetAttribute(k,math.max(0,math.floor(v)))end
local function msg(p,t)p:SetAttribute("LastActivity",t)end
local function feedback(p,kind)p:SetAttribute("FeedbackEvent",kind..":"..tostring(math.floor(os.clock()*1000)))end
local function init(p)for k,v in pairs(C.InitialState)do p:SetAttribute(k,v)end;p:SetAttribute("SupportReady",false);p:SetAttribute("InBattle",false);msg(p,"벌목·식량 수급부터 시작")end
local function load(p)
  init(p)
  local ok,d=pcall(function()return store:GetAsync("p:"..p.UserId)end)
  if ok and typeof(d)=="table" then for k,v in pairs(C.InitialState)do if typeof(d[k])=="number" then p:SetAttribute(k,d[k])end end;if typeof(d.SupportReady)=="boolean" then p:SetAttribute("SupportReady",d.SupportReady)end;msg(p,"개척 상태 복구")end
end
local function save(p)local d={SupportReady=p:GetAttribute("SupportReady")==true};for k,v in pairs(C.InitialState)do d[k]=n(p,k,v)end;pcall(function()store:SetAsync("p:"..p.UserId,d)end)end
local function freeResidents(p)return n(p,"Residents",0)-n(p,"WoodWorkers",0)-n(p,"Farmers",0)end
local function chop(p)s(p,"Wood",n(p,"Wood",0)+3);msg(p,"벌목 +3");feedback(p,"RESOURCE")end
local function food(p)s(p,"Food",n(p,"Food",0)+3);msg(p,"식량 +3");feedback(p,"RESOURCE")end
local function hire(p)if n(p,"Coins",0)<10 then msg(p,"고용 코인 부족")return end;s(p,"Coins",n(p,"Coins",0)-10);s(p,"Residents",n(p,"Residents",0)+1);msg(p,"주민 고용");feedback(p,"BUILD")end
local function job(p,k)if freeResidents(p)<=0 then msg(p,"배치할 주민 없음")return end;s(p,k,n(p,k,0)+1);msg(p,k=="WoodWorkers" and "벌목 주민 배치" or "식량 주민 배치")end
local function barracks(p)
  local lv=n(p,"BarracksLevel",1);local wc=14+lv*8;local fc=10+lv*6;local ic=math.max(0,(lv-1)*4)
  if n(p,"Wood",0)<wc or n(p,"Food",0)<fc or n(p,"Iron",0)<ic then msg(p,string.format("병영재료 부족 나무%d 식량%d 철%d",wc,fc,ic))return end
  s(p,"Wood",n(p,"Wood",0)-wc);s(p,"Food",n(p,"Food",0)-fc);s(p,"Iron",n(p,"Iron",0)-ic);s(p,"BarracksLevel",lv+1);msg(p,"병영 Lv."..(lv+1));feedback(p,"BUILD")
end
local function recruit(p)
  local lv=n(p,"BarracksLevel",1);local fc=4+lv;local wc=2+math.floor(lv/2);local ic=lv>=3 and 1 or 0
  if n(p,"Food",0)<fc or n(p,"Wood",0)<wc or n(p,"Iron",0)<ic then msg(p,"병사 모집 자원 부족")return end
  s(p,"Food",n(p,"Food",0)-fc);s(p,"Wood",n(p,"Wood",0)-wc);s(p,"Iron",n(p,"Iron",0)-ic);s(p,"Troops",n(p,"Troops",0)+1);msg(p,"병사 +1");feedback(p,"BUILD")
end
local function supportPower(p)local x=0;for _,o in ipairs(Players:GetPlayers())do if o~=p and o:GetAttribute("SupportReady")==true then x+=n(o,"Troops",0)*2 end end;return x end
local function attack(p)
  if battling[p] then msg(p,"전투 중")return end
  local idx=n(p,"NextBaseIndex",1);local b=C.Bases[idx];if not b then msg(p,"현재 공개 기지 전부 점령")return end
  local troops=n(p,"Troops",0);if troops<=0 then msg(p,"병사가 필요해")return end
  battling[p]=true;p:SetAttribute("InBattle",true);p:SetAttribute("BattleTarget",b.Name);p:SetAttribute("BattleEnemy",b.Enemy or"수비대");p:SetAttribute("BattlePower",troops*(6+n(p,"BarracksLevel",1)*2)+supportPower(p));msg(p,b.Name.." · "..(b.Enemy or"수비대").." 자동전투");feedback(p,"HIT");BattleVisual.start(p,idx,troops,C,Style)
  task.spawn(function()
    for i=1,4 do if not p.Parent then battling[p]=nil return end;s(p,"BattleProgress",i*25);task.wait(.5)end
    local power=troops*(6+n(p,"BarracksLevel",1)*2)+supportPower(p);local won=power*(.92+math.random()*.16)>=b.Strength
    local lost=math.max(1,math.floor(troops*(won and .15 or .35)));s(p,"Troops",math.max(0,n(p,"Troops",0)-lost))
    if won then s(p,b.Reward,n(p,b.Reward,0)+b.Amount);s(p,"Coins",n(p,"Coins",0)+b.Coins);s(p,"CapturedBases",n(p,"CapturedBases",0)+1);if b.IslandFinal then s(p,"CapturedIslands",n(p,"CapturedIslands",0)+1)end;s(p,"NextBaseIndex",idx+1);msg(p,b.Name.." 점령!");feedback(p,"CAPTURE")
    else msg(p,b.Name.." 패배 - 병력을 키워");feedback(p,"HIT")end
    s(p,"BattleProgress",0);p:SetAttribute("InBattle",false);p:SetAttribute("BattleTarget","");battling[p]=nil;BattleVisual.finish(p,won)
  end)
end
local H={
 [C.Actions.CHOP]=chop,[C.Actions.FOOD]=food,[C.Actions.HIRE]=hire,
 [C.Actions.WOOD_JOB]=function(p)job(p,"WoodWorkers")end,[C.Actions.FOOD_JOB]=function(p)job(p,"Farmers")end,
 [C.Actions.BARRACKS]=barracks,[C.Actions.RECRUIT]=recruit,[C.Actions.ATTACK]=attack,
 [C.Actions.SUPPORT]=function(p)p:SetAttribute("SupportReady",not(p:GetAttribute("SupportReady")==true));msg(p,p:GetAttribute("SupportReady") and "원정지원 ON" or "원정지원 OFF")end,
}
Players.PlayerAdded:Connect(load);for _,p in ipairs(Players:GetPlayers())do task.defer(load,p)end
local function broadcastMultiplayerSync(actor)
 local participants=Players:GetPlayers()
 local sharedObjective=0
 for _,participant in ipairs(participants)do sharedObjective+=(participant:GetAttribute("CapturedBases")or 0)end
 for _,participant in ipairs(participants)do participant:SetAttribute("SharedObjective",sharedObjective)end
 remote:FireAllClients("MULTIPLAYER_SYNC",{ActorUserId=actor.UserId,ParticipantCount=#participants,SharedObjective=sharedObjective})
end
remote.OnServerEvent:Connect(function(p,a)
 if typeof(a)~="string"or not H[a]then return end
 local t=os.clock();if t-(lastRequest[p]or 0)<C.RateLimitSeconds then return end
 lastRequest[p]=t
 H[a](p)
 broadcastMultiplayerSync(p)
end)
task.spawn(function()while true do task.wait(C.AutomationTickSeconds);for _,p in ipairs(Players:GetPlayers())do local w=n(p,"WoodWorkers",0);local f=n(p,"Farmers",0);if w>0 then s(p,"Wood",n(p,"Wood",0)+w)end;if f>0 then s(p,"Food",n(p,"Food",0)+f)end;if w+f>0 and not battling[p] then msg(p,string.format("주민 자동생산 나무+%d 식량+%d",w,f))end end end end)
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

Players.PlayerRemoving:Connect(function(p)save(p);lastRequest[p]=nil;battling[p]=nil;BattleVisual.cleanup(p)qaCaptureLast[p]=nil end)
game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)
