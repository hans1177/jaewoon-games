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
local lastRequest,battling={},{}
local function part(parent,name,size,pos,color,material)
  local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.Size=size;x.Position=pos;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic;x.Parent=parent;return x
end
local function label(target,text)
  local g=Instance.new("BillboardGui");g.Size=UDim2.fromOffset(180,42);g.StudsOffset=Vector3.new(0,7,0);g.AlwaysOnTop=true;g.Parent=target
  local t=Instance.new("TextLabel");t.Size=UDim2.fromScale(1,1);t.BackgroundTransparency=.25;t.TextScaled=true;t.Text=text;t.TextColor3=Color3.new(1,1,1);t.Parent=g
end
local function buildWorld()
  local old=workspace:FindFirstChild("CozyConquestWorld");if old then old:Destroy()end
  local f=Instance.new("Folder");f.Name="CozyConquestWorld";f.Parent=workspace
  for k,v in pairs(Style.Lighting)do Lighting[k]=v end
  local water=part(f,"Sea",Vector3.new(360,2,360),Vector3.new(0,-5,0),Style.Water,Enum.Material.Glass);water.Transparency=.22
  for index,r in ipairs(Style.Regions)do
    local island=part(f,r.Name,r.Size,r.Pos,r.Color,r.Material);island.Shape=Enum.PartType.Block;label(island,r.Name)
    local base=part(f,"Base_"..index,Vector3.new(15,8,15),r.Pos+Vector3.new(0,r.Size.Y/2+4,0),r.Accent,Enum.Material.Brick)
    local roof=part(f,"Roof_"..index,Vector3.new(18,2,18),base.Position+Vector3.new(0,5,0),Style.Banner,Enum.Material.WoodPlanks)
    if index==1 then
      for i=1,8 do
        local a=i/8*math.pi*2;local trunk=part(f,"TreeTrunk",Vector3.new(2,7,2),r.Pos+Vector3.new(math.cos(a)*24,6,math.sin(a)*24),Color3.fromRGB(113,79,55),Enum.Material.Wood)
        local crown=part(f,"TreeCrown",Vector3.new(7,7,7),trunk.Position+Vector3.new(0,5,0),Color3.fromRGB(82,145,78),Enum.Material.Grass);crown.Shape=Enum.PartType.Ball
      end
    else
      local marker=part(f,"ResourceMarker_"..index,Vector3.new(6,10,6),base.Position+Vector3.new(13,1,0),r.Accent,Enum.Material.Neon);marker.Transparency=.15
    end
  end
  workspace:SetAttribute("WorldArtPass","STYLIZED_DIORAMA_V1")
end
buildWorld()
local function n(p,k,d)local v=p:GetAttribute(k);return typeof(v)=="number" and v or d end
local function s(p,k,v)p:SetAttribute(k,math.max(0,math.floor(v)))end
local function msg(p,t)p:SetAttribute("LastActivity",t)end
local function init(p)for k,v in pairs(C.InitialState)do p:SetAttribute(k,v)end;p:SetAttribute("SupportReady",false);p:SetAttribute("InBattle",false);msg(p,"벌목·식량 수급부터 시작")end
local function load(p)
  init(p)
  local ok,d=pcall(function()return store:GetAsync("p:"..p.UserId)end)
  if ok and typeof(d)=="table" then for k,v in pairs(C.InitialState)do if typeof(d[k])=="number" then p:SetAttribute(k,d[k])end end;if typeof(d.SupportReady)=="boolean" then p:SetAttribute("SupportReady",d.SupportReady)end;msg(p,"개척 상태 복구")end
end
local function save(p)local d={SupportReady=p:GetAttribute("SupportReady")==true};for k,v in pairs(C.InitialState)do d[k]=n(p,k,v)end;pcall(function()store:SetAsync("p:"..p.UserId,d)end)end
local function freeResidents(p)return n(p,"Residents",0)-n(p,"WoodWorkers",0)-n(p,"Farmers",0)end
local function chop(p)s(p,"Wood",n(p,"Wood",0)+3);msg(p,"벌목 +3")end
local function food(p)s(p,"Food",n(p,"Food",0)+3);msg(p,"식량 +3")end
local function hire(p)if n(p,"Coins",0)<10 then msg(p,"고용 코인 부족")return end;s(p,"Coins",n(p,"Coins",0)-10);s(p,"Residents",n(p,"Residents",0)+1);msg(p,"주민 고용")end
local function job(p,k)if freeResidents(p)<=0 then msg(p,"배치할 주민 없음")return end;s(p,k,n(p,k,0)+1);msg(p,k=="WoodWorkers" and "벌목 주민 배치" or "식량 주민 배치")end
local function barracks(p)
  local lv=n(p,"BarracksLevel",1);local wc=14+lv*8;local fc=10+lv*6;local ic=math.max(0,(lv-1)*4)
  if n(p,"Wood",0)<wc or n(p,"Food",0)<fc or n(p,"Iron",0)<ic then msg(p,string.format("병영재료 부족 나무%d 식량%d 철%d",wc,fc,ic))return end
  s(p,"Wood",n(p,"Wood",0)-wc);s(p,"Food",n(p,"Food",0)-fc);s(p,"Iron",n(p,"Iron",0)-ic);s(p,"BarracksLevel",lv+1);msg(p,"병영 Lv."..(lv+1))
end
local function recruit(p)
  local lv=n(p,"BarracksLevel",1);local fc=4+lv;local wc=2+math.floor(lv/2);local ic=lv>=3 and 1 or 0
  if n(p,"Food",0)<fc or n(p,"Wood",0)<wc or n(p,"Iron",0)<ic then msg(p,"병사 모집 자원 부족")return end
  s(p,"Food",n(p,"Food",0)-fc);s(p,"Wood",n(p,"Wood",0)-wc);s(p,"Iron",n(p,"Iron",0)-ic);s(p,"Troops",n(p,"Troops",0)+1);msg(p,"병사 +1")
end
local function supportPower(p)local x=0;for _,o in ipairs(Players:GetPlayers())do if o~=p and o:GetAttribute("SupportReady")==true then x+=n(o,"Troops",0)*2 end end;return x end
local function attack(p)
  if battling[p] then msg(p,"전투 중")return end
  local idx=n(p,"NextBaseIndex",1);local b=C.Bases[idx];if not b then msg(p,"현재 공개 기지 전부 점령")return end
  local troops=n(p,"Troops",0);if troops<=0 then msg(p,"병사가 필요해")return end
  battling[p]=true;p:SetAttribute("InBattle",true);p:SetAttribute("BattleTarget",b.Name);p:SetAttribute("BattlePower",troops*(6+n(p,"BarracksLevel",1)*2)+supportPower(p));msg(p,b.Name.." 자동전투");BattleVisual.start(p,idx,troops,C,Style)
  task.spawn(function()
    for i=1,4 do if not p.Parent then battling[p]=nil return end;s(p,"BattleProgress",i*25);task.wait(.5)end
    local power=troops*(6+n(p,"BarracksLevel",1)*2)+supportPower(p);local won=power*(.92+math.random()*.16)>=b.Strength
    local lost=math.max(1,math.floor(troops*(won and .15 or .35)));s(p,"Troops",math.max(0,n(p,"Troops",0)-lost))
    if won then s(p,b.Reward,n(p,b.Reward,0)+b.Amount);s(p,"Coins",n(p,"Coins",0)+b.Coins);s(p,"CapturedBases",n(p,"CapturedBases",0)+1);if b.IslandFinal then s(p,"CapturedIslands",n(p,"CapturedIslands",0)+1)end;s(p,"NextBaseIndex",idx+1);msg(p,b.Name.." 점령!")
    else msg(p,b.Name.." 패배 - 병력을 키워")end
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
Players.PlayerRemoving:Connect(function(p)save(p);lastRequest[p]=nil;battling[p]=nil;BattleVisual.cleanup(p)end)
game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)
