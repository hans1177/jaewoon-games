-- 파일명: roblox-games/animal-auto-battle/server/Game.server.luau
-- 임포트: 규칙, Roblox 데이터 저장, 인증된 행동 채널
local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local DataStoreService=game:GetService("DataStoreService")
local Rules=require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Rules"))
local store=DataStoreService:GetDataStore("AnimalAutoBattle_v1")
local channel=Instance.new("Folder")
channel.Name="AnimalAutoBattle"
channel.Parent=ReplicatedStorage
local request=Instance.new("RemoteEvent")
request.Name="Request"
request.Parent=channel
local snapshot=Instance.new("RemoteEvent")
snapshot.Name="Snapshot"
snapshot.Parent=channel

-- 메인: 모든 금화·조합·전투·보상은 서버에서만 변경
local sessions,lastAction,saving={},{},{}
local rng=Random.new()
local petIds={"bunny","cat","dog","pig","fox","turtle","wolf","cow"}
local foodIds={"berry","seed","meal","feast"}
local function index(value,max)
 if typeof(value)~="number" or value~=value or value%1~=0 or value<1 or value>max then return nil end
 return value
end
local function number(value,min,max,fallback)
 if typeof(value)~="number" or value~=value or value%1~=0 or value<min or value>max then return fallback end
 return value
end
local function makeState()
 return {version=1,round=1,gold=Rules.StartGold,hearts=Rules.StartHearts,wins=0,
  phase="shop",team={},shop={},events={},replay={},replaySerial=0,ready=false,dirty=true}
end
local function choice(ids,data,tier)
 local pool={}
 for _,id in ipairs(ids) do if data[id].tier<=tier then table.insert(pool,id) end end
 return pool[rng:NextInteger(1,#pool)]
end
local function roll(state,preserve)
 local old=state.shop
 local nextShop={}
 local tier=Rules.tier(state.round)
 for i=1,4 do
  if preserve and typeof(old[i])=="table" and old[i].frozen then
   nextShop[i]=old[i]
  elseif i<4 then
   nextShop[i]={kind="pet",id=choice(petIds,Rules.Pets,tier),frozen=false}
  else
   nextShop[i]={kind="food",id=choice(foodIds,Rules.Foods,tier),frozen=false}
  end
 end
 state.shop=nextShop
 state.dirty=true
end
local function loadState(raw)
 local state=makeState()
 if typeof(raw)~="table" or raw.version~=1 then roll(state,false) return state end
 state.round=number(raw.round,1,99,1)
 state.gold=number(raw.gold,0,30,Rules.StartGold)
 state.hearts=number(raw.hearts,0,Rules.StartHearts,Rules.StartHearts)
 state.wins=number(raw.wins,0,Rules.TargetWins,0)
 if typeof(raw.team)=="table" then
  for i=1,math.min(#raw.team,Rules.TeamLimit) do
   local pet=Rules.cleanPet(raw.team[i])
   if pet then table.insert(state.team,pet) end
  end
 end
 local tier=Rules.tier(state.round)
 if typeof(raw.shop)=="table" then
  for i=1,4 do
   local offer=raw.shop[i]
   if typeof(offer)=="table" then
    local kind=i<4 and "pet" or "food"
    local data=kind=="pet" and Rules.Pets or Rules.Foods
    if data[offer.id] and data[offer.id].tier<=tier then
     state.shop[i]={id=offer.id,kind=kind,frozen=offer.frozen==true}
    else state.shop[i]=false end
   else state.shop[i]=false end
  end
 end
 if #state.shop~=4 then roll(state,false) end
 state.phase=(state.hearts==0 or state.wins>=Rules.TargetWins) and "ended" or "shop"
 state.dirty=false
 return state
end
local function save(player,state)
 if not state or not state.ready or not state.dirty or saving[player] then return end
 saving[player]=true
 -- 저장 도중 새 행동이 발생하면 그 변경을 다음 저장 대상으로 남긴다.
 state.dirty=false
 local payload={version=1,round=state.round,gold=state.gold,hearts=state.hearts,
  wins=state.wins,team=state.team,shop=state.shop}
 local ok,err=pcall(function() store:SetAsync("u:"..player.UserId,payload) end)
 if not ok then state.dirty=true;warn("[동물자동대전][저장] "..tostring(err)) end
 saving[player]=nil
end
local function sync(player,err)
 local s=sessions[player]
 if not s then return end
 snapshot:FireClient(player,{ready=s.ready,round=s.round,gold=s.gold,hearts=s.hearts,
  wins=s.wins,phase=s.phase,team=s.team,shop=s.shop,events=s.events,
  replay=s.replay,replaySerial=s.replaySerial,error=err or ""})
end
local function battleCopy(source)
 local result={}
 for _,pet in ipairs(source) do table.insert(result,table.clone(pet)) end
 for i,pet in ipairs(result) do
  if pet.id=="dog" and result[i+1] then
   result[i+1].attack=Rules.stat(result[i+1].attack+pet.level)
  elseif pet.id=="cow" then
   for j,ally in ipairs(result) do
    if j~=i then ally.health=Rules.stat(ally.health+pet.level) end
   end
  elseif pet.id=="fox" then pet.first=1+pet.level
  elseif pet.id=="turtle" then pet.armor=pet.level end
 end
 return result
end
local function enemyTeam(round)
 local result={}
 local count=math.min(Rules.TeamLimit,math.max(1,math.floor((round+1)/2)))
 for _=1,count do
  local pet=Rules.newPet(choice(petIds,Rules.Pets,Rules.tier(round)))
  local bonus=math.floor((round-1)/3)
  pet.attack=Rules.stat(pet.attack+bonus)
  pet.health=Rules.stat(pet.health+bonus)
  table.insert(result,pet)
 end
 return result
end
-- 전투: 서버가 한 번만 판정하고, 같은 판정의 읽기 전용 재생 프레임을 전달한다.
local function battle(s)
 local mine,foes=battleCopy(s.team),battleCopy(enemyTeam(s.round))
 local events,frames={},{}
 local function record(description)
  local allies,enemies={},{}
  for i,pet in ipairs(mine) do
   allies[i]={id=pet.id,attack=pet.attack,health=math.max(0,pet.health),level=pet.level}
  end
  for i,pet in ipairs(foes) do
   enemies[i]={id=pet.id,attack=pet.attack,health=math.max(0,pet.health),level=pet.level}
  end
  local frame={mine=allies,foes=enemies,text=description}
  -- 지나치게 긴 전투에서도 마지막 결과 프레임은 반드시 보존한다.
  if #frames<48 then table.insert(frames,frame) else frames[#frames]=frame end
 end
 record(string.format("%d라운드 · 양 팀 준비 완료",s.round))
 local hits=0
 while #mine>0 and #foes>0 and hits<360 do
  hits+=1
  local a,b=mine[1],foes[1]
  local ap=Rules.stat(a.attack+(hits==1 and (a.first or 0) or 0))
  local bp=Rules.stat(b.attack+(hits==1 and (b.first or 0) or 0))
  local hurtA=math.max(1,bp-(a.armor or 0))
  local hurtB=math.max(1,ap-(b.armor or 0))
  a.health-=hurtA
  b.health-=hurtB
  local description=string.format("%s → %s %d 피해 · %s → %s %d 피해",
   Rules.Pets[a.id].name,Rules.Pets[b.id].name,hurtB,
   Rules.Pets[b.id].name,Rules.Pets[a.id].name,hurtA)
  if #events<75 then table.insert(events,description) end
  if b.health<=0 and a.health>0 and a.id=="wolf" then a.attack=Rules.stat(a.attack+a.level) end
  if a.health<=0 and b.health>0 and b.id=="wolf" then b.attack=Rules.stat(b.attack+b.level) end
  if a.health<=0 then table.remove(mine,1) end
  if b.health<=0 then table.remove(foes,1) end
  record(description)
 end
 local verdict="무승부"
 if #mine>0 and #foes==0 then
  s.wins+=1
  verdict="승리"
 elseif #foes>0 and #mine==0 then
  s.hearts-=1
  verdict="패배"
 end
 table.insert(events,1,string.format("%d라운드: %s",s.round,verdict))
 record(string.format("%d라운드 결과 · %s",s.round,verdict))
 s.events=events
 s.replaySerial+=1
 s.replay={round=s.round,verdict=verdict,frames=frames}
 s.dirty=true
 if s.wins>=Rules.TargetWins or s.hearts<=0 then
  s.phase="ended"
 else
  s.round=math.min(99,s.round+1)
  s.gold=Rules.StartGold
  roll(s,true)
 end
end

local function act(s,m)
 local action=m.action
 if action=="SYNC" then return end
 if action=="NEW" then
  if s.phase~="ended" then return "현재 도전이 아직 진행 중이야" end
  local previousReplaySerial=s.replaySerial
  local reset=makeState()
  roll(reset,false)
  reset.ready=true
  for k,v in pairs(reset) do s[k]=v end
  s.replaySerial=previousReplaySerial
  return
 end
 if s.phase~="shop" then return "새 도전을 시작해" end
 if action=="ROLL" then
  if s.gold<1 then return "금화가 부족해" end
  s.gold-=1
  roll(s,true)
 elseif action=="FREEZE" then
  local i=index(m.slot,4)
  if not i or typeof(s.shop[i])~="table" then return "해당 상점 칸이 비어 있어" end
  s.shop[i].frozen=not s.shop[i].frozen
  s.dirty=true
 elseif action=="SELL" then
  local i=index(m.slot,#s.team)
  if not i then return "판매할 동물을 선택해" end
  local pet=s.team[i]
  s.gold=math.min(30,s.gold+1+(pet.id=="pig" and pet.level or 0))
  table.remove(s.team,i)
  s.dirty=true
 elseif action=="MOVE" then
  local i,j=index(m.from,#s.team),index(m.to,#s.team)
  if not i or not j then return "두 동물을 선택해" end
  s.team[i],s.team[j]=s.team[j],s.team[i]
  s.dirty=true
 elseif action=="BUY" then
  local i=index(m.slot,4)
  if not i or typeof(s.shop[i])~="table" then return "상점 칸이 비어 있어" end
  if s.gold<3 then return "금화가 부족해" end
  local offer=s.shop[i]
  local target=index(m.target,Rules.TeamLimit)
  local pet=target and s.team[target] or nil
  if offer.kind=="food" then
   if not pet then return "먹이를 줄 동물을 선택해" end
   local food=Rules.Foods[offer.id]
   pet.attack=Rules.stat(pet.attack+food.attack+(pet.id=="cat" and pet.level or 0))
   pet.health=Rules.stat(pet.health+food.health+(pet.id=="bunny" and pet.level or 0))
  elseif pet and pet.id==offer.id then
   pet.exp=math.min(5,pet.exp+1)
   pet.level=Rules.level(pet.exp)
   pet.attack=Rules.stat(pet.attack+1)
   pet.health=Rules.stat(pet.health+1)
  elseif not pet and #s.team<Rules.TeamLimit then
   local unit=Rules.newPet(offer.id)
   if target and target<=#s.team+1 then table.insert(s.team,target,unit)
   else table.insert(s.team,unit) end
  else return "빈 팀 칸을 선택하거나 같은 동물을 합쳐" end
  s.gold-=3
  s.shop[i]=false
  s.dirty=true
 elseif action=="BATTLE" then
  if #s.team==0 then return "동물을 먼저 편성해" end
  battle(s)
 else return "허용되지 않은 행동이야" end
end

-- 저장·복구
Players.PlayerAdded:Connect(function(player)
 local state=makeState()
 sessions[player]=state
 local ok,data=pcall(function() return store:GetAsync("u:"..player.UserId) end)
 if ok then state=loadState(data);sessions[player]=state
 else warn("[동물자동대전][복구] "..tostring(data));roll(state,false) end
 state.ready=true
 sync(player)
end)
request.OnServerEvent:Connect(function(player,message)
 if typeof(message)~="table" or typeof(message.action)~="string" or #message.action>12 then return end
 local state=sessions[player]
 if not state or not state.ready then return end
 local now=os.clock()
 if now-(lastAction[player] or 0)<0.12 then return end
 lastAction[player]=now
 local ok,result=pcall(act,state,message)
 if ok then sync(player,result)
 else warn("[동물자동대전][행동] "..tostring(result));sync(player,"처리 오류") end
end)
Players.PlayerRemoving:Connect(function(player)
 save(player,sessions[player])
 sessions[player]=nil
 lastAction[player]=nil
end)
task.spawn(function()
 while true do
  task.wait(180)
  for player,state in pairs(sessions) do save(player,state) end
 end
end)
game:BindToClose(function()
 for player,state in pairs(sessions) do save(player,state) end
end)
