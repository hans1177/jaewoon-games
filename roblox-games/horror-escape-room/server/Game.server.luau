-- 파일명: roblox-games/horror-escape-room/server/Game.server.luau
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local Lighting=game:GetService("Lighting")
local AssetService=game:GetService("AssetService")
local TeleportService=game:GetService("TeleportService")
local MemoryStoreService=game:GetService("MemoryStoreService")
local Shared=RS:WaitForChild("Shared")
local C=require(Shared:WaitForChild("GameConfig"))
local Style=require(Shared:WaitForChild("VisualStyle"))
local store
pcall(function()store=DSS:GetDataStore("midnight-tag-v3")end)
local remote=RS:FindFirstChild(C.RemoteName)or Instance.new("RemoteEvent")
remote.Name=C.RemoteName;remote.Parent=RS
local qaCaptureStore
pcall(function()qaCaptureStore=DSS:GetDataStore("qa-camera-captures-v1")end)
local qaCaptureRemote=RS:FindFirstChild(C.QACaptureRemoteName or "QACaptureReport")or Instance.new("RemoteEvent")
qaCaptureRemote.Name=C.QACaptureRemoteName or "QACaptureReport";qaCaptureRemote.Parent=RS
local foundationStore
pcall(function()foundationStore=DSS:GetDataStore("native-foundation-sentinel-v1")end)
local foundationRemote=RS:FindFirstChild("RuntimeFoundationReport")or Instance.new("RemoteEvent")
foundationRemote.Name="RuntimeFoundationReport";foundationRemote.Parent=RS
local qaCaptureLast={}
local roomDirectory=MemoryStoreService:GetSortedMap("midnight-infection-room-directory-v1")
local studioRoomFallback=RunService:IsStudio()
local roomServer=game.PrivateServerId~=""and game.PrivateServerOwnerId==0
local roomCode=""
local roomHostUserId=0
local roomHostName=""
local roomVisibility="PUBLIC"
local roomStartRequested=false
local roomActionLast={}
local roomJoinedAt={}

local state="WAITING"
local timeLeft=0
local monster=nil
local monsterBot=nil
local lastMonsterIds={}
local bots={}
local cooldown={}
local dashCooldown={}
local infectAttackCooldown={}
local energyStationReady={}
local ghostSeenThisRound={}
local arena=nil
local currentMapIndex=0
local lastRequest={}
local lastValidPosition={}
local movementGraceUntil={}
local movementProbeStart={}
local movementGuardClock=0
local pressureLastCounts={SURVIVOR=4,MONSTER=4}
local foundationSpawn=nil
local foundationSeen={}
local foundationSequence=0
local foundationLast={}
local soloStartRequested=false
local tagGraceUntil={}
local allowedActions={}
for _,action in pairs(C.Actions)do allowedActions[action]=true end

workspace:SetAttribute("LobbyReady",false)
workspace:SetAttribute("LobbyPhase","LOADING")
workspace:SetAttribute("LobbyRealPlayers",0)
workspace:SetAttribute("LobbyAIFill",C.TargetPopulation)
workspace:SetAttribute("RoomServer",roomServer)
workspace:SetAttribute("RoomCode","")
workspace:SetAttribute("RoomHostUserId",0)
workspace:SetAttribute("RoomHostName","")
workspace:SetAttribute("RoomVisibility",roomServer and"PRIVATE"or"BROWSER")
workspace:SetAttribute("RoomState",roomServer and"INITIALIZING"or"BROWSER")
workspace:SetAttribute("RoomMemberCount",0)
workspace:SetAttribute("RoomMaxPlayers",(C.Room and C.Room.MaxPlayers)or 8)
workspace:SetAttribute("RoomStartRequested",false)

local function syncRoomState()
 local count=#Players:GetPlayers()
 workspace:SetAttribute("RoomServer",roomServer)
 workspace:SetAttribute("RoomCode",roomCode)
 workspace:SetAttribute("RoomHostUserId",roomHostUserId)
 workspace:SetAttribute("RoomHostName",roomHostName)
 workspace:SetAttribute("RoomVisibility",roomServer and roomVisibility or"BROWSER")
 workspace:SetAttribute("RoomState",roomServer and(state=="RUNNING"and"RUNNING"or state=="RESULT"and"RESULT"or state=="INTERMISSION"and"INTERMISSION"or"ROOM_WAITING")or"BROWSER")
 workspace:SetAttribute("RoomMemberCount",count)
 workspace:SetAttribute("RoomMaxPlayers",(C.Room and C.Room.MaxPlayers)or 8)
 workspace:SetAttribute("RoomStartRequested",roomStartRequested)
 for _,player in ipairs(Players:GetPlayers())do
  player:SetAttribute("RoomServer",roomServer)
  player:SetAttribute("RoomCode",roomCode)
  player:SetAttribute("RoomHostUserId",roomHostUserId)
  player:SetAttribute("RoomHostName",roomHostName)
  player:SetAttribute("RoomVisibility",roomServer and roomVisibility or"BROWSER")
  player:SetAttribute("RoomState",roomServer and(state=="RUNNING"and"RUNNING"or state=="RESULT"and"RESULT"or state=="INTERMISSION"and"INTERMISSION"or"ROOM_WAITING")or"BROWSER")
  player:SetAttribute("RoomMemberCount",count)
  player:SetAttribute("RoomMaxPlayers",(C.Room and C.Room.MaxPlayers)or 8)
  player:SetAttribute("RoomIsHost",roomServer and player.UserId==roomHostUserId)
 end
end

local function syncLobbyState(phase)
 local real=#Players:GetPlayers()
 local aiFill=math.max(0,(C.TargetPopulation or 8)-real)
 local currentPhase=phase or tostring(workspace:GetAttribute("LobbyPhase")or"WAITING")
 local ready=workspace:GetAttribute("MapReady")==true
 workspace:SetAttribute("LobbyReady",ready)
 workspace:SetAttribute("LobbyPhase",currentPhase)
 workspace:SetAttribute("LobbyRealPlayers",real)
 workspace:SetAttribute("LobbyAIFill",aiFill)
 for _,player in ipairs(Players:GetPlayers())do
  player:SetAttribute("LobbyReady",ready)
  player:SetAttribute("LobbyPhase",currentPhase)
  player:SetAttribute("LobbyRealPlayers",real)
  player:SetAttribute("LobbyAIFill",aiFill)
 end
 syncRoomState()
end

local function roomFeedback(p,kind,message)
 if not p or not p.Parent then return end
 p:SetAttribute("RoomFeedback",tostring(kind or"INFO")..":"..tostring(message or""))
end
local function normalizeRoomVisibility(value)
 local raw=string.upper(tostring(value or"PUBLIC"))
 for _,allowed in ipairs(C.Room and C.Room.Visibility or{"PUBLIC","FRIENDS","PRIVATE"})do
  if raw==allowed then return raw end
 end
 return"PUBLIC"
end
local function roomActionReady(p)
 local now=os.clock()
 local cd=math.max(.5,tonumber(C.Room and C.Room.ActionCooldownSeconds)or 1.5)
 if now-(roomActionLast[p]or 0)<cd then return false end
 roomActionLast[p]=now
 return true
end
local function roomDirectoryExpiration()
 return math.max(300,math.floor(tonumber(C.Room and C.Room.DirectoryExpirationSeconds)or 7200))
end
local function roomMaxPlayers()
 return math.max(1,math.floor(tonumber(C.Room and C.Room.MaxPlayers)or C.TargetPopulation or 8))
end
local function setRoomDirectoryEntry(code,data)
 if code==""or typeof(data)~="table"then return false end
 local ok=pcall(function()roomDirectory:SetAsync(code,data,roomDirectoryExpiration(),os.time())end)
 return ok
end
local function getRoomDirectoryEntry(code)
 local ok,data=pcall(function()return roomDirectory:GetAsync(code)end)
 if not ok or typeof(data)~="table"then return nil end
 return data
end
local function removeRoomDirectoryEntry(code)
 if code==""then return end
 pcall(function()roomDirectory:RemoveAsync(code)end)
end
local function updateCurrentRoomDirectory()
 if not roomServer or roomCode==""then return end
 local existing=getRoomDirectoryEntry(roomCode)
 if not existing then return end
 existing.hostUserId=roomHostUserId
 existing.hostName=roomHostName
 existing.visibility=roomVisibility
 existing.memberCount=#Players:GetPlayers()
 existing.maxPlayers=roomMaxPlayers()
 existing.updatedAt=os.time()
 existing.state=state=="RUNNING"and"RUNNING"or state=="RESULT"and"RESULT"or"WAITING"
 setRoomDirectoryEntry(roomCode,existing)
end
local function createUniqueRoomCode()
 local length=math.clamp(math.floor(tonumber(C.Room and C.Room.CodeLength)or 6),4,8)
 local low=10^(length-1);local high=10^length-1
 for _=1,12 do
  local code=tostring(math.random(low,high))
  if not getRoomDirectoryEntry(code)then return code end
 end
 return nil
end
local function teleportToReservedRoom(p,record)
 if not p or not p.Parent or typeof(record)~="table"or typeof(record.accessCode)~="string"or record.accessCode==""then return false end
 local options=Instance.new("TeleportOptions")
 options.ReservedServerAccessCode=record.accessCode
 options:SetTeleportData({
  roomCode=record.code,
  roomHostUserId=record.hostUserId,
  roomHostName=record.hostName,
  roomVisibility=record.visibility,
  roomCreatedAt=record.createdAt,
 })
 local ok,err=pcall(function()TeleportService:TeleportAsync(game.PlaceId,{p},options)end)
 if not ok then roomFeedback(p,"ERROR","방 이동 실패");warn("Room teleport failed",err);return false end
 roomFeedback(p,"TELEPORTING",record.code or"")
 return true
end
local function createReservedRoom(p,visibility)
 if roomServer or state=="RUNNING"or not roomActionReady(p)then return end
 if studioRoomFallback then
  roomServer=true;roomCode="000001";roomHostUserId=p.UserId;roomHostName=p.DisplayName;roomVisibility=normalizeRoomVisibility(visibility);roomStartRequested=false
  roomJoinedAt[p]=os.clock()
  workspace:SetAttribute("StudioRoomFallback",true)
  roomFeedback(p,"CREATED",roomCode);syncRoomState();syncLobbyState("ROOM_WAITING")
  return
 end
 local code=createUniqueRoomCode()
 if not code then roomFeedback(p,"ERROR","방 코드 생성 실패");return end
 local ok,accessCode=pcall(function()
  local reservedCode=TeleportService:ReserveServerAsync(game.PlaceId)
  return reservedCode
 end)
 if not ok or typeof(accessCode)~="string"or accessCode==""then roomFeedback(p,"ERROR","예약 서버 생성 실패");return end
 local record={
  code=code,accessCode=accessCode,hostUserId=p.UserId,hostName=p.DisplayName,
  visibility=normalizeRoomVisibility(visibility),memberCount=0,maxPlayers=roomMaxPlayers(),
  createdAt=os.time(),updatedAt=os.time(),state="WAITING",placeId=game.PlaceId,
 }
 if not setRoomDirectoryEntry(code,record)then roomFeedback(p,"ERROR","방 등록 실패");return end
 if not teleportToReservedRoom(p,record)then removeRoomDirectoryEntry(code)end
end
local function canJoinRoom(p,record,explicitCode)
 if typeof(record)~="table"then return false,"방을 찾을 수 없음"end
 if tonumber(record.placeId)~=game.PlaceId then return false,"다른 장소의 방"end
 if tostring(record.state or"WAITING")~="WAITING"then return false,"이미 게임 진행 중"end
 if (tonumber(record.memberCount)or 0)>=(tonumber(record.maxPlayers)or roomMaxPlayers())then return false,"방이 가득 참"end
 local visibility=normalizeRoomVisibility(record.visibility)
 if visibility=="PRIVATE"and explicitCode~=true then return false,"비공개 방"end
 if visibility=="FRIENDS"and p.UserId~=tonumber(record.hostUserId)then
  local ok,isFriend=pcall(function()return p:IsFriendsWithAsync(tonumber(record.hostUserId)or 0)end)
  if not ok or isFriend~=true then return false,"방장 친구만 입장 가능"end
 end
 return true,nil
end
local function joinRoomByCode(p,rawCode)
 if roomServer or state=="RUNNING"or not roomActionReady(p)then return end
 local code=tostring(rawCode or""):gsub("%s+","")
 if not code:match("^%d+$")or #code~=math.clamp(math.floor(tonumber(C.Room and C.Room.CodeLength)or 6),4,8)then roomFeedback(p,"ERROR","방 코드 확인");return end
 local record=getRoomDirectoryEntry(code)
 local allowed,reason=canJoinRoom(p,record,true)
 if not allowed then roomFeedback(p,"ERROR",reason);return end
 teleportToReservedRoom(p,record)
end
local function quickJoinRoom(p,friendsOnly)
 if roomServer or state=="RUNNING"or not roomActionReady(p)then return end
 local ok,rows=pcall(function()return roomDirectory:GetRangeAsync(Enum.SortDirection.Descending,30)end)
 if not ok or typeof(rows)~="table"then roomFeedback(p,"ERROR","방 목록 조회 실패");return end
 for _,row in ipairs(rows)do
  local record=typeof(row)=="table"and row.value or nil
  if typeof(record)=="table"then
   local visibility=normalizeRoomVisibility(record.visibility)
   local candidate=(friendsOnly and visibility=="FRIENDS")or(not friendsOnly and visibility=="PUBLIC")
   if candidate then
    local allowed=canJoinRoom(p,record,false)
    if allowed and teleportToReservedRoom(p,record)then return end
   end
  end
 end
 roomFeedback(p,"EMPTY",friendsOnly and"참가 가능한 친구 방 없음"or"참가 가능한 공개 방 없음")
end
local function adoptReservedRoomFromPlayer(p)
 if not roomServer then return end
 local ok,joinData=pcall(function()return p:GetJoinData()end)
 local teleportData=ok and typeof(joinData)=="table"and joinData.TeleportData or nil
 if typeof(teleportData)~="table"then return end
 local incomingCode=tostring(teleportData.roomCode or"")
 if incomingCode==""then return end
 if roomCode==""then
  roomCode=incomingCode
  roomHostUserId=tonumber(teleportData.roomHostUserId)or p.UserId
  roomHostName=tostring(teleportData.roomHostName or p.DisplayName)
  roomVisibility=normalizeRoomVisibility(teleportData.roomVisibility)
 elseif roomCode~=incomingCode then
  roomFeedback(p,"ERROR","잘못된 방 연결")
  task.defer(function()pcall(function()TeleportService:TeleportAsync(game.PlaceId,{p})end)end)
  return
 end
 roomJoinedAt[p]=os.clock()
 syncRoomState()
 task.defer(updateCurrentRoomDirectory)
end
local function startRoomMatch(p)
 if not roomServer or state~="WAITING"or p.UserId~=roomHostUserId then return end
 if #Players:GetPlayers()<math.max(1,tonumber(C.MinimumParticipants)or 1)then roomFeedback(p,"ERROR","참가 인원 부족");return end
 roomStartRequested=true
 workspace:SetAttribute("RoomStartRequested",true)
 roomFeedback(p,"START","게임 시작")
 syncRoomState()
end
local function leaveReservedRoom(p)
 if not roomServer or state~="WAITING"then return end
 if studioRoomFallback then
  roomServer=false;roomCode="";roomHostUserId=0;roomHostName="";roomVisibility="PUBLIC";roomStartRequested=false
  workspace:SetAttribute("StudioRoomFallback",false)
  for _,player in ipairs(Players:GetPlayers())do player:SetAttribute("RoundState","ROOM_BROWSER");roomFeedback(player,"LEFT","로비로 이동")end
  syncLobbyState("ROOM_BROWSER")
  return
 end
 roomFeedback(p,"TELEPORTING","로비로 이동")
 pcall(function()TeleportService:TeleportAsync(game.PlaceId,{p})end)
end

-- 모든 맵 공통 중앙 통로의 전용 안전 스폰. 상호작용 단말/소품 중심점과 겹치지 않는다.
local survivorSpawns={
 Vector3.new(-5,3,54),Vector3.new(5,3,54),Vector3.new(-5,3,42),
 Vector3.new(5,3,42),Vector3.new(-5,3,30),Vector3.new(5,3,30)
}
local monsterSpawn=Vector3.new(0,3,-54)
local assetCache={}
local objectiveState={round=0,done=0,total=0}
local escapedPlayers={}

local function root(p)local c=p.Character;return c and c:FindFirstChild("HumanoidRootPart")end
local function hum(p)local c=p.Character;return c and c:FindFirstChildOfClass("Humanoid")end
local function loadFoundationState()
 if not foundationStore then return end
 local ok,old=pcall(function()return foundationStore:GetAsync("latest")end)
 if not ok or typeof(old)~="table"then return end
 if tostring(old.gameId or"")~=tostring(C.GameId)or tonumber(old.placeId)~=game.PlaceId or tonumber(old.placeVersion)~=game.PlaceVersion then return end
 local checkpoints=typeof(old.checkpoints)=="table"and old.checkpoints or{}
 for name,row in pairs(checkpoints)do
  foundationSeen[name]=true
  foundationSequence=math.max(foundationSequence,math.floor(tonumber(row.sequence)or 0))
 end
 foundationSequence=math.max(foundationSequence,math.floor(tonumber(old.sequence)or 0))
end
local function foundationCheckpoint(name,p,extra)
 if foundationSeen[name]then return true end
 if not foundationStore then
  foundationSeen[name]=true
  workspace:SetAttribute("Foundation_"..name,true)
  return true
 end
 local payload={name=name,at=os.time(),userId=p and p.UserId or 0,gameId=C.GameId,placeId=tostring(game.PlaceId),placeVersion=game.PlaceVersion}
 if typeof(extra)=="table"then for k,v in pairs(extra)do if typeof(v)=="number"or typeof(v)=="string"or typeof(v)=="boolean"then payload[k]=v end end end
 local committedSequence=foundationSequence
 local lastError=nil
 for attempt=1,4 do
  local ok,err=pcall(function()
   foundationStore:UpdateAsync("latest",function(old)
    local exact=typeof(old)=="table"and tonumber(old.placeVersion)==game.PlaceVersion and tonumber(old.placeId)==game.PlaceId and tostring(old.gameId or"")==tostring(C.GameId)
    local data=exact and old or{version=3,gameId=C.GameId,placeId=tostring(game.PlaceId),placeVersion=game.PlaceVersion,checkpoints={},sequence=0}
    data.version=3;data.gameId=C.GameId;data.placeId=tostring(game.PlaceId);data.placeVersion=game.PlaceVersion;data.updatedAt=os.time()
    data.requirements={saveEnabled=C.SaveEnabled==true,multiplayerRequired=C.MultiplayerRequired==true}
    data.checkpoints=typeof(data.checkpoints)=="table"and data.checkpoints or{}
    if typeof(data.checkpoints[name])=="table"then committedSequence=math.floor(tonumber(data.checkpoints[name].sequence)or foundationSequence);return data end
    committedSequence=math.max(foundationSequence,math.floor(tonumber(data.sequence)or 0))+1
    local row={};for k,v in pairs(payload)do row[k]=v end;row.sequence=committedSequence
    data.sequence=committedSequence;data.checkpoints[name]=row
    return data
   end)
  end)
  if ok then
   foundationSeen[name]=true;foundationSequence=math.max(foundationSequence,committedSequence)
   workspace:SetAttribute("Foundation_"..name,true)
   return true
  end
  lastError=err
  if attempt<4 then task.wait(.15*attempt)end
 end
 if p then p:SetAttribute("FoundationFailure","CHECKPOINT_WRITE_FAILED:"..name)end
 warn("Foundation checkpoint write failed",name,lastError)
 return false
end
loadFoundationState()
foundationCheckpoint("SERVER_BOOT",nil,{placeVersion=game.PlaceVersion})
foundationCheckpoint("MODULE_GRAPH_READY",nil,{modulesReady=true})
local function restoreMovement(p,v)
 local h=hum(p);local r=root(p)
 if r then r.Anchored=false end
 if h then
  h.PlatformStand=false;h.Sit=false;h.AutoRotate=true;h.WalkSpeed=v
  h.JumpPower=50;h.JumpHeight=7.2
 end
end
local function speed(p,v)restoreMovement(p,v)end
local legacyMonsterIds={DRAK="DRACULA",FRANKEN="FRANKENSTEIN",WOLF="WEREWOLF",MIRAA="MUMMY",REAPER="GRIM_REAPER"}
local function form(p)
 local id=p:GetAttribute("MonsterForm")or"DRACULA"
 id=legacyMonsterIds[id]or id
 for _,f in ipairs(C.MonsterForms)do if f.Id==id then return f end end
 return C.MonsterForms[1]
end
local function humanForm(p)
 local id=p:GetAttribute("HumanForm")or"BROADCAST"
 for _,f in ipairs(C.HumanForms or{})do if f.Id==id then return f end end
 return(C.HumanForms and C.HumanForms[1])or{Id="BROADCAST",Name="방송부"}
end
local function energyMax()return math.max(1,tonumber(C.Energy and C.Energy.Max)or 100)end
local function energyOf(p)return math.clamp(tonumber(p:GetAttribute("Energy"))or 0,0,energyMax())end
local function setEnergy(p,value)
 local v=math.clamp(tonumber(value)or 0,0,energyMax())
 p:SetAttribute("Energy",v);p:SetAttribute("EnergyMax",energyMax())
 return v
end
local function spendEnergy(p,cost,actionName)
 cost=math.max(0,tonumber(cost)or 0)
 local current=energyOf(p)
 if current+1e-4<cost then
  p:SetAttribute("EnergyFeedback","NO_ENERGY:"..tostring(actionName or"ACTION")..":"..tostring(math.ceil(cost-current)))
  return false
 end
 setEnergy(p,current-cost)
 return true
end
local function pressurePassiveFor(role,humans,monsters)
 local own=role=="SURVIVOR"and humans or role=="MONSTER"and monsters or 0
 local other=role=="SURVIVOR"and monsters or role=="MONSTER"and humans or 0
 for _,row in ipairs(C.Energy and C.Energy.PressurePassives or{})do
  if own==(tonumber(row.Minority)or-1)and other==(tonumber(row.Majority)or-1)then return row end
 end
 return nil
end

local ghostById={}
for _,item in ipairs(C.GhostCatalog or{})do ghostById[item.Id]=item end
local function ghostProgressFrom(value)
 local progress={}
 if typeof(value)=="table"then
  for id,stage in pairs(value)do
   if ghostById[id]and typeof(stage)=="number"then progress[id]=math.clamp(math.floor(stage),0,(C.GhostProgression and C.GhostProgression.MaxStage)or 3)end
  end
 elseif typeof(value)=="string"then
  for id,stage in string.gmatch(value,"([^:,]+):(%d+)")do
   if ghostById[id]then progress[id]=math.clamp(tonumber(stage)or 0,0,(C.GhostProgression and C.GhostProgression.MaxStage)or 3)end
  end
 end
 return progress
end
local function ghostProgressAttribute(progress)
 local out={}
 for _,item in ipairs(C.GhostCatalog or{})do
  local stage=tonumber(progress[item.Id])or 0
  if stage>0 then table.insert(out,item.Id..":"..tostring(stage))end
 end
 return table.concat(out,",")
end
local function ghostProgressSave(progress)
 local out={}
 for _,item in ipairs(C.GhostCatalog or{})do
  local stage=tonumber(progress[item.Id])or 0
  if stage>0 then out[item.Id]=stage end
 end
 return out
end
local function ghostStats(progress)
 local seen,completed=0,0
 local maxStage=(C.GhostProgression and C.GhostProgression.MaxStage)or 3
 for _,item in ipairs(C.GhostCatalog or{})do
  local stage=tonumber(progress[item.Id])or 0
  if stage>0 then seen+=1 end
  if stage>=maxStage then completed+=1 end
 end
 return seen,completed
end
local function ghostTitleFor(completed)
 local title="괴담 견습생"
 for _,row in ipairs(C.GhostTitles or{})do if completed>=(tonumber(row.Completed)or math.huge)then title=tostring(row.Title or title)end end
 return title
end
local function syncGhostAttributes(p,progress)
 local seen,completed=ghostStats(progress)
 p:SetAttribute("GhostProgress",ghostProgressAttribute(progress))
 p:SetAttribute("GhostSeenCount",seen);p:SetAttribute("GhostCompleted",completed);p:SetAttribute("GhostTotal",#(C.GhostCatalog or{}))
 p:SetAttribute("GhostTitle",ghostTitleFor(completed))
end

local loreById={}
for _,item in ipairs(C.Lore or{})do loreById[item.Id]=item end
local function foundLoreFrom(value)
 local found={}
 if typeof(value)=="table"then
  for _,id in ipairs(value)do if typeof(id)=="string"and loreById[id]then found[id]=true end end
 elseif typeof(value)=="string"then
  for id in string.gmatch(value,"[^,]+")do if loreById[id]then found[id]=true end end
 end
 return found
end
local function foundLoreList(found)
 local out={}
 for _,item in ipairs(C.Lore or{})do if found[item.Id]then table.insert(out,item.Id)end end
 return out
end
local function foundLoreAttribute(found)return table.concat(foundLoreList(found),",")end
local function loreTitleFor(count)
 local title="야간 신입"
 for _,row in ipairs(C.LoreTitles or{})do if count>=(tonumber(row.Count)or math.huge)then title=tostring(row.Title or title)end end
 return title
end

local cosmeticById={}
for _,item in ipairs(C.Cosmetics or{})do cosmeticById[item.Id]=item end
local function ownedCosmeticsFrom(value)
 local owned={DEFAULT=true}
 if typeof(value)=="table"then
  for _,id in ipairs(value)do if typeof(id)=="string"and cosmeticById[id]then owned[id]=true end end
 elseif typeof(value)=="string"then
  for id in string.gmatch(value,"[^,]+")do if cosmeticById[id]then owned[id]=true end end
 end
 return owned
end
local function ownedCosmeticsList(owned)
 local out={}
 for _,item in ipairs(C.Cosmetics or{})do if owned[item.Id]then table.insert(out,item.Id)end end
 if #out==0 then table.insert(out,"DEFAULT")end
 return out
end
local function ownedCosmeticsAttribute(owned)
 return table.concat(ownedCosmeticsList(owned),",")
end
local function load(p)
 p:SetAttribute("MonsterPreference","ANY");p:SetAttribute("SoloRole","SURVIVOR");p:SetAttribute("LobbySelectionConfirmed",false)
 p:SetAttribute("MonsterXP",0);p:SetAttribute("Coins",0);p:SetAttribute("RoundsSinceMonster",0)
 p:SetAttribute("OwnedCosmetics","DEFAULT");p:SetAttribute("EquippedCosmetic","DEFAULT");p:SetAttribute("CosmeticFeedback","")
 p:SetAttribute("FoundLore","");p:SetAttribute("LoreCount",0);p:SetAttribute("LoreTotal",#(C.Lore or{}));p:SetAttribute("LoreFeedback","");p:SetAttribute("LoreTitle","야간 신입")
 p:SetAttribute("GhostProgress","");p:SetAttribute("GhostSeenCount",0);p:SetAttribute("GhostCompleted",0);p:SetAttribute("GhostTotal",#(C.GhostCatalog or{}));p:SetAttribute("GhostTitle","괴담 견습생");p:SetAttribute("GhostFeedback","")
 p:SetAttribute("GhostFragments",0);p:SetAttribute("GhostContracts",0);p:SetAttribute("GhostCatalogBonusClaimed",false)
 p:SetAttribute("MonsterForm","DRACULA");p:SetAttribute("HumanForm","BROADCAST");p:SetAttribute("Role","WAITING");p:SetAttribute("Frozen",false);p:SetAttribute("Infected",false);p:SetAttribute("InfectionReadyAt",0)
 p:SetAttribute("RoundState","WAITING");p:SetAttribute("TimeLeft",0);p:SetAttribute("RoundScore",0)
 p:SetAttribute("LastRoundReward",0);p:SetAttribute("LastRoundWinner","");p:SetAttribute("LastRoundRole","")
 p:SetAttribute("LastRoundBaseReward",0);p:SetAttribute("LastRoundWinBonus",0);p:SetAttribute("LastRoundContribution",0);p:SetAttribute("RoundContributionCoins",0)
 p:SetAttribute("PurifyReadyAt",0);p:SetAttribute("DashReadyAt",0);p:SetAttribute("InfectReadyAt",0);p:SetAttribute("AbilityReadyAt",0);p:SetAttribute("Spectating",false)
 p:SetAttribute("Energy",energyMax());p:SetAttribute("EnergyMax",energyMax());p:SetAttribute("EnergyFeedback","");p:SetAttribute("PressurePassive","")
 p:SetAttribute("MapContentFeedback","")
 p:SetAttribute("CelebrationName","");p:SetAttribute("CelebrationCaption","");p:SetAttribute("CelebrationWinner",false);p:SetAttribute("CelebrationComic",false)
 p:SetAttribute("RoundParticipant",false);p:SetAttribute("RoundTeam","")
 p:SetAttribute("ObjectivesDone",0);p:SetAttribute("ObjectivesTotal",C.ObjectiveCount);p:SetAttribute("Escaped",false)
 p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
 p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"맵 준비")
 local ok,d=pcall(function()return store:GetAsync("p:"..p.UserId)end)
 if ok and typeof(d)=="table"then
  for _,k in ipairs({"MonsterXP","Coins","RoundsSinceMonster"})do if typeof(d[k])=="number"then p:SetAttribute(k,d[k])end end
  if typeof(d.MonsterForm)=="string"then p:SetAttribute("MonsterForm",legacyMonsterIds[d.MonsterForm]or d.MonsterForm)end
  if typeof(d.HumanForm)=="string"then p:SetAttribute("HumanForm",d.HumanForm)end
  local owned=ownedCosmeticsFrom(d.OwnedCosmetics)
  local equipped=typeof(d.EquippedCosmetic)=="string"and d.EquippedCosmetic or"DEFAULT"
  if not owned[equipped]or not cosmeticById[equipped]then equipped="DEFAULT"end
  p:SetAttribute("OwnedCosmetics",ownedCosmeticsAttribute(owned));p:SetAttribute("EquippedCosmetic",equipped)
  local found=foundLoreFrom(d.FoundLore);local count=#foundLoreList(found)
  p:SetAttribute("FoundLore",foundLoreAttribute(found));p:SetAttribute("LoreCount",count);p:SetAttribute("LoreTotal",#(C.Lore or{}));p:SetAttribute("LoreTitle",loreTitleFor(count))
  local ghostProgress=ghostProgressFrom(d.GhostProgress);syncGhostAttributes(p,ghostProgress)
  if typeof(d.GhostFragments)=="number"then p:SetAttribute("GhostFragments",math.max(0,math.floor(d.GhostFragments)))end
  if typeof(d.GhostContracts)=="number"then p:SetAttribute("GhostContracts",math.max(0,math.floor(d.GhostContracts)))end
  p:SetAttribute("GhostCatalogBonusClaimed",d.GhostCatalogBonusClaimed==true)
 end
end
local function save(p)
 local owned=ownedCosmeticsFrom(p:GetAttribute("OwnedCosmetics"))
 local equipped=p:GetAttribute("EquippedCosmetic")or"DEFAULT"
 if not owned[equipped]or not cosmeticById[equipped]then equipped="DEFAULT"end
 pcall(function()store:SetAsync("p:"..p.UserId,{
  MonsterXP=p:GetAttribute("MonsterXP")or 0,Coins=p:GetAttribute("Coins")or 0,
  RoundsSinceMonster=p:GetAttribute("RoundsSinceMonster")or 0,MonsterForm=p:GetAttribute("MonsterForm")or"DRACULA",HumanForm=p:GetAttribute("HumanForm")or"BROADCAST",
  OwnedCosmetics=ownedCosmeticsList(owned),EquippedCosmetic=equipped,FoundLore=foundLoreList(foundLoreFrom(p:GetAttribute("FoundLore"))),
  GhostProgress=ghostProgressSave(ghostProgressFrom(p:GetAttribute("GhostProgress"))),GhostFragments=p:GetAttribute("GhostFragments")or 0,GhostContracts=p:GetAttribute("GhostContracts")or 0,GhostCatalogBonusClaimed=p:GetAttribute("GhostCatalogBonusClaimed")==true
 })end)
end
local function arenaPart(f,name,size,pos,color,material)
 local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.Size=size;x.Position=pos;x.Color=color
 x.Material=material or Enum.Material.SmoothPlastic;x.Parent=f;return x
end
local function glow(part,color,range,brightness)
 local l=Instance.new("PointLight");l.Color=color;l.Range=range or 22;l.Brightness=brightness or 1.4;l.Shadows=true;l.Parent=part;return l
end
local function zoneFloor(f,name,size,pos,color,material)
 local x=arenaPart(f,name,size,pos,color,material);x.CanCollide=true;x:SetAttribute("WalkableGround",true);return x
end

local function stripLoadedAsset(root)
 for _,d in ipairs(root:GetDescendants())do
  if d:IsA("LuaSourceContainer")or d:IsA("Tool")or d:IsA("RemoteEvent")or d:IsA("RemoteFunction")then
   d:Destroy()
  elseif d:IsA("BasePart")then
   d.Anchored=true;d.CanTouch=false
  end
 end
 return root
end
local function loadOfficialAsset(id)
 if assetCache[id]then return assetCache[id]end
 local ok,result=pcall(AssetService.LoadAssetAsync,AssetService,id)
 if not ok or not result then return nil end
 stripLoadedAsset(result);result.Parent=nil;assetCache[id]=result
 return result
end
local function matchingMesh(root,keywords,seed)
 if not root then return nil end
 local candidates,all={},{}
 for _,d in ipairs(root:GetDescendants())do
  if d:IsA("MeshPart")then
   table.insert(all,d)
   local name=string.lower(d.Name)
   for _,key in ipairs(keywords)do
    if string.find(name,string.lower(key),1,true)then table.insert(candidates,d);break end
   end
  end
 end
 if #candidates==0 then candidates=all end
 if #candidates==0 then return nil end
 return candidates[((seed or 1)-1)%#candidates+1]
end
local function spawnOfficialProp(assetId,keywords,parent,pos,scale,seed,collide)
 local rootAsset=loadOfficialAsset(assetId);local template=matchingMesh(rootAsset,keywords,seed)
 if not template then return nil end
 local x=template:Clone();x.Name="Asset_"..template.Name;x.Anchored=true;x.CanCollide=collide==true;x.CanTouch=false
 x.Size=x.Size*(scale or 1);x.CFrame=CFrame.new(pos)*CFrame.Angles(0,math.rad(((seed or 1)*47)%360),0);x.Parent=parent
 return x
end
local function cloneWholeAsset(assetId,parent,pos,scale)
 local template=loadOfficialAsset(assetId);if not template then return nil end
 local clone=template:Clone();clone.Name="OfficialAsset_"..assetId;stripLoadedAsset(clone);clone.Parent=parent
 pcall(function()clone:ScaleTo(scale or 1)end);pcall(function()clone:PivotTo(CFrame.new(pos))end)
 return clone
end
local function addLoreCollectible(f,id,pos)
 local item=loreById[id];if not item then return nil end
 local base=arenaPart(f,"Lore_"..id,Vector3.new(2.6,.5,3.2),pos,Color3.fromRGB(92,83,72),Enum.Material.WoodPlanks);base.CanCollide=false
 local paper=arenaPart(f,"LorePaper_"..id,Vector3.new(2.1,.12,2.7),pos+Vector3.new(0,.32,0),Color3.fromRGB(224,215,184),Enum.Material.SmoothPlastic);paper.CanCollide=false
 local prompt=Instance.new("ProximityPrompt");prompt.Name="LorePrompt";prompt.ObjectText=item.Name;prompt.ActionText="조사";prompt.HoldDuration=.45;prompt.MaxActivationDistance=9;prompt.RequiresLineOfSight=false;prompt.Parent=base
 prompt.Triggered:Connect(function(p)
  if state=="RESULT"then return end
  local found=foundLoreFrom(p:GetAttribute("FoundLore"))
  if found[id]then p:SetAttribute("LoreFeedback","ALREADY:"..id);return end
  found[id]=true
  local count=#foundLoreList(found)
  p:SetAttribute("FoundLore",foundLoreAttribute(found));p:SetAttribute("LoreCount",count);p:SetAttribute("LoreTotal",#(C.Lore or{}))
  p:SetAttribute("LoreTitle",loreTitleFor(count))
  p:SetAttribute("LoreFeedback","FOUND:"..id..":"..tostring(count))
  save(p)
 end)
 return base
end

local function addObjectiveStation(f,name,pos,index)
 local base=arenaPart(f,"EnergyStation_"..name,Vector3.new(7,5,4),pos,Color3.fromRGB(62,72,86),Enum.Material.Metal)
 local screen=arenaPart(f,"EnergyScreen_"..name,Vector3.new(4.6,2.2,.35),pos+Vector3.new(0,.5,-2.2),Color3.fromRGB(84,181,235),Enum.Material.Neon);screen.CanCollide=false
 local prompt=Instance.new("ProximityPrompt");prompt.Name="EnergyPrompt";prompt.ObjectText=name.." · 에너지";prompt.ActionText="충전";prompt.HoldDuration=.8;prompt.MaxActivationDistance=10;prompt.RequiresLineOfSight=false;prompt.Parent=base
 base:SetAttribute("EnergyStationIndex",index)
 prompt.Triggered:Connect(function(p)
  if state~="RUNNING"or p:GetAttribute("Frozen")==true then return end
  local role=p:GetAttribute("Role");if role~="SURVIVOR"and role~="MONSTER"then return end
  local now=workspace:GetServerTimeNow()
  local ready=energyStationReady[p]or{};energyStationReady[p]=ready
  local availableAt=tonumber(ready[index])or 0
  if now<availableAt then p:SetAttribute("EnergyFeedback","STATION_COOLDOWN:"..tostring(math.ceil(availableAt-now)));return end
  local current=energyOf(p);local max=energyMax()
  if current>=max-.01 then p:SetAttribute("EnergyFeedback","ENERGY_FULL");return end
  local recharge=math.max(0,tonumber(C.Energy and C.Energy.StationRecharge)or 35)
  local humans=tonumber(workspace:GetAttribute("HumanCount"))or 0
  local monsters=tonumber(workspace:GetAttribute("MonsterCount"))or 0
  local pressure=pressurePassiveFor(role,humans,monsters)
  recharge+=math.max(0,tonumber(pressure and pressure.StationBonus)or 0)
  local stationCooldown=math.max(1,tonumber(C.Energy and C.Energy.StationCooldown)or 25)
  ready[index]=now+stationCooldown
  setEnergy(p,current+recharge)
  p:SetAttribute("EnergyFeedback","STATION_RECHARGE:"..tostring(math.floor(recharge)))
  screen.Color=Color3.fromRGB(150,226,255)
  task.delay(.25,function()if screen and screen.Parent then screen.Color=Color3.fromRGB(84,181,235)end end)
 end)
 return base
end
local function addEscapeGate(f,mapId,pos)
 local gate=arenaPart(f,"EmergencyGate",Vector3.new(18,12,3),pos,Color3.fromRGB(68,78,86),Enum.Material.Metal)
 local sign=arenaPart(f,"EmergencySign",Vector3.new(12,2,.4),pos+Vector3.new(0,6,-1.8),Color3.fromRGB(112,130,145),Enum.Material.Neon);sign.CanCollide=false
 gate:SetAttribute("DecorativeOnly",true);gate:SetAttribute("MapId",mapId)
 return gate
end
local function addMapUtility(f,id,name,pos)
 local base=arenaPart(f,"MapUtility_"..id,Vector3.new(6,5,4),pos,Color3.fromRGB(58,66,78),Enum.Material.Metal)
 local panel=arenaPart(f,"MapUtilityPanel_"..id,Vector3.new(4,2,.35),pos+Vector3.new(0,.5,-2.2),Color3.fromRGB(124,172,221),Enum.Material.Neon);panel.CanCollide=false
 local prompt=Instance.new("ProximityPrompt");prompt.Name="MapUtilityPrompt";prompt.ObjectText=name;prompt.ActionText="가동";prompt.HoldDuration=1;prompt.MaxActivationDistance=10;prompt.RequiresLineOfSight=false;prompt.Parent=base
 local readyAt=0
 prompt.Triggered:Connect(function(p)
  if state~="RUNNING"then return end
  local role=p:GetAttribute("Role");if role~="SURVIVOR"and role~="MONSTER"then return end
  local now=workspace:GetServerTimeNow()
  if now<readyAt then p:SetAttribute("MapContentFeedback","UTILITY_COOLDOWN:"..name..":"..tostring(math.ceil(readyAt-now)));return end
  readyAt=now+math.max(1,tonumber(C.Energy and C.Energy.MapUtilityCooldown)or 35)
  local recharge=math.max(0,tonumber(C.Energy and C.Energy.MapUtilityRecharge)or 20)
  setEnergy(p,energyOf(p)+recharge)
  p:SetAttribute("MapContentFeedback","UTILITY:"..id..":"..name)
  workspace:SetAttribute("MapUtilityActive",id)
  workspace:SetAttribute("MapUtilityUntil",now+math.max(1,tonumber(C.Energy and C.Energy.MapUtilityDuration)or 8))
  panel.Color=Color3.fromRGB(183,231,255)
  task.delay(.25,function()if panel and panel.Parent then panel.Color=Color3.fromRGB(124,172,221)end end)
  local duration=math.max(1,tonumber(C.Energy and C.Energy.MapUtilityDuration)or 8)
  if id=="SCHOOL_BROADCAST"then
   local marks={}
   for _,d in ipairs(f:GetDescendants())do
    if d:IsA("BasePart")and(string.find(d.Name,"EnergyStation_",1,true)==1 or d.Name=="EnergyCore")then
     local h=Instance.new("Highlight");h.Name="UtilityReveal";h.Adornee=d;h.DepthMode=Enum.HighlightDepthMode.AlwaysOnTop;h.FillTransparency=.78;h.OutlineTransparency=.15;h.Parent=d;table.insert(marks,h)
    end
   end
   task.delay(duration,function()for _,h in ipairs(marks)do if h and h.Parent then h:Destroy()end end end)
  elseif id=="HOSPITAL_SURGERY_LIGHT"then
   local beforeBrightness,beforeFog=Lighting.Brightness,Lighting.FogEnd
   Lighting.Brightness=math.max(Lighting.Brightness,2.15);Lighting.FogEnd=math.max(Lighting.FogEnd,210)
   task.delay(duration,function()
    if f.Parent and workspace:GetAttribute("MapUtilityActive")==id then Lighting.Brightness=beforeBrightness;Lighting.FogEnd=beforeFog;workspace:SetAttribute("MapUtilityActive","")end
   end)
  elseif id=="PARK_CAROUSEL_POWER"then
   local rotor=f:FindFirstChild("CarouselRotor",true)
   if rotor and rotor:IsA("BasePart")then
    task.spawn(function()
     local untilAt=os.clock()+duration
     while rotor.Parent and os.clock()<untilAt do rotor.CFrame=rotor.CFrame*CFrame.Angles(0,math.rad(4),0);task.wait(.08)end
     if workspace:GetAttribute("MapUtilityActive")==id then workspace:SetAttribute("MapUtilityActive","")end
    end)
   end
  end
 end)
 return base
end
local function addEnergyCore(f,mapId,pos)
 local core=arenaPart(f,"EnergyCore",Vector3.new(6,8,6),pos,Color3.fromRGB(52,60,72),Enum.Material.Neon);core.CanCollide=false
 local light=glow(core,Color3.fromRGB(90,185,255),30,.25)
 local prompt=Instance.new("ProximityPrompt");prompt.Name="EnergyCorePrompt";prompt.ObjectText="중앙 에너지 코어";prompt.ActionText="흡수";prompt.HoldDuration=1;prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Enabled=false;prompt.Parent=core
 local open=false
 prompt.Triggered:Connect(function(p)
  if state~="RUNNING"or not open then return end
  local role=p:GetAttribute("Role");if role~="SURVIVOR"and role~="MONSTER"then return end
  open=false;prompt.Enabled=false;core.Color=Color3.fromRGB(52,60,72);light.Brightness=.25
  local recharge=math.max(0,tonumber(C.Energy and C.Energy.CoreRecharge)or 50)
  setEnergy(p,energyOf(p)+recharge)
  p:SetAttribute("MapContentFeedback","CORE:"..mapId..":"..tostring(math.floor(recharge)))
  workspace:SetAttribute("EnergyCoreState","CLAIMED")
 end)
 task.spawn(function()
  local cycle=math.max(20,tonumber(C.Energy and C.Energy.CoreCycle)or 60)
  local openSeconds=math.clamp(tonumber(C.Energy and C.Energy.CoreOpenSeconds)or 15,5,cycle-5)
  local closedSeconds=cycle-openSeconds
  while core.Parent do
   open=false;prompt.Enabled=false;core.Color=Color3.fromRGB(52,60,72);light.Brightness=.25
   workspace:SetAttribute("EnergyCoreState","CHARGING")
   task.wait(closedSeconds)
   if not core.Parent then return end
   open=true;prompt.Enabled=true;core.Color=Color3.fromRGB(78,190,255);light.Brightness=2.2
   workspace:SetAttribute("EnergyCoreState","OPEN")
   local deadline=os.clock()+openSeconds
   while core.Parent and open and os.clock()<deadline do task.wait(.2)end
   open=false;prompt.Enabled=false
  end
 end)
 return core
end
local function addSurpriseTrigger(f,id,kind,pos,radius,text)
 local trigger=Instance.new("Part")
 trigger.Name="SurpriseTrigger_"..id
 trigger.Size=Vector3.new(2,2,2)
 trigger.Position=pos
 trigger.Anchored=true
 trigger.CanCollide=false
 trigger.CanTouch=false
 trigger.CanQuery=false
 trigger.Transparency=1
 trigger:SetAttribute("SurpriseId",id)
 trigger:SetAttribute("SurpriseKind",kind)
 trigger:SetAttribute("SurpriseRadius",radius or 10)
 trigger:SetAttribute("SurpriseText",text or"")
 trigger:SetAttribute("CompetitiveEffect",false)
 trigger.Parent=f
 return trigger
end
local function addGhostSightingTrigger(f,id,pos,radius)
 local item=ghostById[id];if not item then return nil end
 local trigger=Instance.new("Part")
 trigger.Name="GhostSighting_"..id
 trigger.Size=Vector3.new(2,2,2)
 trigger.Position=pos
 trigger.Anchored=true
 trigger.CanCollide=false
 trigger.CanTouch=false
 trigger.CanQuery=false
 trigger.Transparency=1
 trigger:SetAttribute("GhostId",id)
 trigger:SetAttribute("GhostRadius",radius or 11)
 trigger:SetAttribute("CompetitiveEffect",false)
 trigger.Parent=f
 return trigger
end

local function ambientPart(f,name,size,pos,color,material,shape)
 local x=arenaPart(f,name,size,pos,color,material)
 x.CanCollide=false;x.CanTouch=false;x.CanQuery=false;x:SetAttribute("AmbientDecorativeOnly",true)
 if shape then x.Shape=shape end
 return x
end
local function setAmbientVisible(parts,visible)
 for _,part in ipairs(parts)do
  if part and part.Parent then
   part.Transparency=visible and(part:GetAttribute("AmbientBaseTransparency")or 0)or 1
  end
 end
end
local function ambientGroupPart(parts,part,baseTransparency)
 part:SetAttribute("AmbientBaseTransparency",baseTransparency or 0)
 part.Transparency=1
 table.insert(parts,part)
 return part
end
local function addAmbientSurprises(f,map)
 local surprises={}
 local function addSurprise(id,parts,run)
  for _,part in ipairs(parts)do part:SetAttribute("AmbientSurpriseId",id)end
  setAmbientVisible(parts,false)
  table.insert(surprises,{id=id,parts=parts,run=run})
 end

 if map.Id=="SCHOOL"then
  -- 괴담 몬스터: 복도/창문 구석에 잠깐 보이는 시각 연출 전용 실루엣.
  local watcher={}
  ambientGroupPart(watcher,ambientPart(f,"SchoolHallWatcherBody",Vector3.new(2.8,5.6,1.4),Vector3.new(73,4.1,-18),Color3.fromRGB(28,30,34),Enum.Material.Fabric),.08)
  ambientGroupPart(watcher,ambientPart(f,"SchoolHallWatcherHead",Vector3.new(2.4,2.4,2.4),Vector3.new(73,7.8,-18),Color3.fromRGB(35,36,39),Enum.Material.SmoothPlastic,Enum.PartType.Ball),.03)
  ambientGroupPart(watcher,ambientPart(f,"SchoolHallWatcherEyeL",Vector3.new(.28,.28,.18),Vector3.new(72.55,8,-18.75),Color3.fromRGB(214,59,66),Enum.Material.Neon,Enum.PartType.Ball),0)
  ambientGroupPart(watcher,ambientPart(f,"SchoolHallWatcherEyeR",Vector3.new(.28,.28,.18),Vector3.new(73.45,8,-18.75),Color3.fromRGB(214,59,66),Enum.Material.Neon,Enum.PartType.Ball),0)
  addSurprise("SCHOOL_WATCHER",watcher,function(parts)
   setAmbientVisible(parts,true);task.wait(2.6);setAmbientVisible(parts,false)
  end)

  -- 사물함 고무오리: 공포 뒤에 한 번 웃길 수 있는 발견 요소.
  local duck={}
  ambientGroupPart(duck,ambientPart(f,"LockerDuckBody",Vector3.new(1.5,1.3,1.7),Vector3.new(11,5.2,-64.2),Color3.fromRGB(246,207,61),Enum.Material.SmoothPlastic,Enum.PartType.Ball),0)
  ambientGroupPart(duck,ambientPart(f,"LockerDuckHead",Vector3.new(1.05,1.05,1.05),Vector3.new(11,6.15,-64.5),Color3.fromRGB(250,219,71),Enum.Material.SmoothPlastic,Enum.PartType.Ball),0)
  ambientGroupPart(duck,ambientPart(f,"LockerDuckBeak",Vector3.new(.75,.3,.55),Vector3.new(11,6.05,-65.2),Color3.fromRGB(237,129,38),Enum.Material.SmoothPlastic),0)
  addSurprise("SCHOOL_LOCKER_DUCK",duck,function(parts)
   setAmbientVisible(parts,true)
   for n=1,8 do
    for _,p in ipairs(parts)do if p.Parent then p.CFrame=p.CFrame*CFrame.Angles(0,math.rad(n%2==0 and 8 or-8),0)end end
    task.wait(.09)
   end
   task.wait(2);setAmbientVisible(parts,false)
  end)

  -- 칠판 눈: 교실 구석을 확인하면 잠깐 마주치는 요소.
  local chalk={}
  ambientGroupPart(chalk,ambientPart(f,"ChalkEyeL",Vector3.new(1.3,.55,.2),Vector3.new(-73.2,7,-2.15),Color3.fromRGB(224,233,222),Enum.Material.Neon),.08)
  ambientGroupPart(chalk,ambientPart(f,"ChalkEyeR",Vector3.new(1.3,.55,.2),Vector3.new(-70.8,7,-2.15),Color3.fromRGB(224,233,222),Enum.Material.Neon),.08)
  ambientGroupPart(chalk,ambientPart(f,"ChalkSmile",Vector3.new(3.6,.22,.2),Vector3.new(-72,5.8,-2.15),Color3.fromRGB(224,233,222),Enum.Material.Neon),.12)
  addSurprise("SCHOOL_CHALK_FACE",chalk,function(parts)
   setAmbientVisible(parts,true);task.wait(3.2);setAmbientVisible(parts,false)
  end)

  -- 자판기 캔: 혼자 튀어나와 바닥에서 짧게 굴러가는 코믹 장면.
  local can=ambientGroupPart({},ambientPart(f,"VendingRunawayCan",Vector3.new(.65,1.1,.65),Vector3.new(-14,1.25,53),Color3.fromRGB(204,67,72),Enum.Material.Metal,Enum.PartType.Cylinder),0)
  local canParts={can};can:SetAttribute("AmbientBaseTransparency",0)
  addSurprise("SCHOOL_VENDING_CAN",canParts,function(parts)
   local p=parts[1];if not p.Parent then return end
   local start=CFrame.new(-14,1.25,53)*CFrame.Angles(0,0,math.rad(90));p.CFrame=start;setAmbientVisible(parts,true)
   for i=1,18 do if not p.Parent then return end;p.CFrame=start*CFrame.new(0,0,-i*.32)*CFrame.Angles(0,math.rad(i*24),0);task.wait(.045)end
   task.wait(1.2);setAmbientVisible(parts,false)
  end)
 elseif map.Id=="HOSPITAL"then
  local patient={}
  ambientGroupPart(patient,ambientPart(f,"MorguePeekHead",Vector3.new(2.1,2.1,2.1),Vector3.new(-117,5.1,121),Color3.fromRGB(177,185,180),Enum.Material.SmoothPlastic,Enum.PartType.Ball),.06)
  ambientGroupPart(patient,ambientPart(f,"MorguePeekEyes",Vector3.new(1.1,.22,.18),Vector3.new(-117,5.2,119.95),Color3.fromRGB(177,220,204),Enum.Material.Neon),0)
  addSurprise("HOSPITAL_MORGUE_PEEK",patient,function(parts) setAmbientVisible(parts,true);task.wait(2.4);setAmbientVisible(parts,false)end)

  local slipper={}
  ambientGroupPart(slipper,ambientPart(f,"RunawaySlipperL",Vector3.new(1.4,.35,2.6),Vector3.new(-4,1.05,12),Color3.fromRGB(151,190,183),Enum.Material.Fabric),0)
  ambientGroupPart(slipper,ambientPart(f,"RunawaySlipperR",Vector3.new(1.4,.35,2.6),Vector3.new(4,1.05,9),Color3.fromRGB(151,190,183),Enum.Material.Fabric),0)
  addSurprise("HOSPITAL_RUNAWAY_SLIPPERS",slipper,function(parts)
   setAmbientVisible(parts,true)
   for i=1,14 do
    for n,p in ipairs(parts)do if p.Parent then p.CFrame=p.CFrame*CFrame.new((n==1 and-.12 or.12),0,-.28)end end
    task.wait(.07)
   end
   task.wait(1);setAmbientVisible(parts,false)
  end)

  local iv={}
  local pole=ambientGroupPart(iv,ambientPart(f,"GhostIVPole",Vector3.new(.25,5,.25),Vector3.new(9,3.2,-34),Color3.fromRGB(160,170,174),Enum.Material.Metal),.08)
  ambientGroupPart(iv,ambientPart(f,"GhostIVBag",Vector3.new(1.1,1.6,.4),Vector3.new(9,5.4,-34),Color3.fromRGB(179,218,211),Enum.Material.Glass),.28)
  addSurprise("HOSPITAL_IV_WALK",iv,function(parts)
   local origins={};for i,p in ipairs(parts)do origins[i]=p.CFrame end;setAmbientVisible(parts,true)
   for step=1,20 do for i,p in ipairs(parts)do if p.Parent then p.CFrame=origins[i]*CFrame.new(0,0,-step*.35)end end;task.wait(.06)end
   task.wait(.8);setAmbientVisible(parts,false);for i,p in ipairs(parts)do if p.Parent then p.CFrame=origins[i]end end
  end)
 elseif map.Id=="THEME_PARK"then
  local clown={}
  ambientGroupPart(clown,ambientPart(f,"BoothClownHead",Vector3.new(2.7,2.7,2.7),Vector3.new(48,7,-39),Color3.fromRGB(226,219,199),Enum.Material.SmoothPlastic,Enum.PartType.Ball),.04)
  ambientGroupPart(clown,ambientPart(f,"BoothClownNose",Vector3.new(.7,.7,.7),Vector3.new(48,6.8,-40.3),Color3.fromRGB(222,54,73),Enum.Material.Neon,Enum.PartType.Ball),0)
  addSurprise("PARK_CLOWN_PEEK",clown,function(parts) setAmbientVisible(parts,true);task.wait(2.2);setAmbientVisible(parts,false)end)

  local balloon={}
  ambientGroupPart(balloon,ambientPart(f,"LonelyBalloon",Vector3.new(2.6,3,2.6),Vector3.new(-70,8,36),Color3.fromRGB(218,75,151),Enum.Material.SmoothPlastic,Enum.PartType.Ball),.08)
  ambientGroupPart(balloon,ambientPart(f,"BalloonString",Vector3.new(.08,5,.08),Vector3.new(-70,4,36),Color3.fromRGB(201,201,205),Enum.Material.SmoothPlastic),.25)
  addSurprise("PARK_LONELY_BALLOON",balloon,function(parts)
   setAmbientVisible(parts,true)
   for i=1,18 do for _,p in ipairs(parts)do if p.Parent then p.CFrame=p.CFrame*CFrame.new(math.sin(i*.7)*.03,.04,0)end end;task.wait(.07)end
   task.wait(.8);setAmbientVisible(parts,false)
  end)

  local car={}
  ambientGroupPart(car,ambientPart(f,"DriverlessBumperCar",Vector3.new(6,2.2,8),Vector3.new(103,2,-91),Color3.fromRGB(80,151,199),Enum.Material.Metal),.06)
  addSurprise("PARK_DRIVERLESS_CAR",car,function(parts)
   local p=parts[1];if not p.Parent then return end;local start=p.CFrame;setAmbientVisible(parts,true)
   for i=1,24 do if p.Parent then p.CFrame=start*CFrame.new(math.sin(i*.25)*5,0,-i*.18)*CFrame.Angles(0,math.rad(i*7),0)end;task.wait(.055)end
   task.wait(.8);setAmbientVisible(parts,false);if p.Parent then p.CFrame=start end
  end)
 end

 if #surprises==0 then return end
 task.spawn(function()
  task.wait(6+math.random()*5)
  while f.Parent do
   if state=="RUNNING"then
    local chosen=surprises[math.random(1,#surprises)]
    workspace:SetAttribute("AmbientSurprise",chosen.id)
    chosen.run(chosen.parts)
    workspace:SetAttribute("AmbientSurprise","")
   end
   task.wait(15+math.random()*13)
  end
 end)
end

local function decorateArenaWithOfficialAssets(f,map)
 task.spawn(function()
  task.wait(.1);if not f.Parent then return end
  local city=C.OfficialAssets.CityPack;local dungeon=C.OfficialAssets.DungeonPack;local house=C.OfficialAssets.HouseProps
  local pack=map.Id=="THEME_PARK"and city or map.Id=="HOSPITAL"and house or city
  local keywords=map.Id=="SCHOOL"and{"bench","chair","table","cabinet","plant"}or map.Id=="HOSPITAL"and{"chair","table","cabinet","bed","plant"}or{"bench","lamp","trash","fence","sign"}
  if map.Id=="SCHOOL"then
   local spots={
    Vector3.new(-138,2,-82),Vector3.new(-118,2,-82),Vector3.new(-98,2,-82),
    Vector3.new(98,2,-82),Vector3.new(118,2,-82),Vector3.new(138,2,-82),
    Vector3.new(-62,2,35),Vector3.new(-42,2,47),Vector3.new(42,2,37),Vector3.new(60,2,54),
    Vector3.new(88,2,98),Vector3.new(108,2,118),Vector3.new(128,2,98),
    Vector3.new(-128,2,100),Vector3.new(-108,2,116),Vector3.new(-88,2,100),
    Vector3.new(-12,2,-18),Vector3.new(12,2,18)
   }
   for i,pos in ipairs(spots)do
    if not f.Parent then return end
    spawnOfficialProp(pack,keywords,f,pos,.78+(i%3)*.1,i,false)
   end
  else
   for i=1,18 do
    if not f.Parent then return end
    local angle=i/18*math.pi*2;local radius=105+(i%3)*24
    spawnOfficialProp(pack,keywords,f,Vector3.new(math.cos(angle)*radius,2,math.sin(angle)*radius),.85+(i%3)*.12,i,false)
   end
  end
  if map.Id=="HOSPITAL"then
   for i=1,10 do spawnOfficialProp(dungeon,{"crate","barrel","rock","rune"},f,Vector3.new(-132+i*25,1.8,122+(i%2)*16),.75,i,false)end
  elseif map.Id=="THEME_PARK"then
   for i=1,10 do spawnOfficialProp(city,{"bench","lamp","trash","sign"},f,Vector3.new(-138+i*28,1.8,-118+(i%2)*18),.9,i,false)end
  end
 end)
end
local function applyMapEvent(f,map,event)
 workspace:SetAttribute("CurrentMapEvent",event.Id)
 workspace:SetAttribute("CurrentMapEventName",event.Name)
 if event.Id=="LIGHTS_OUT"or event.Id=="POWER_OUTAGE"or event.Id=="RIDE_BLACKOUT"then
  -- 정전은 긴장감만 주고 플레이 경로 자체는 읽혀야 한다.
  Lighting.Brightness=map.Id=="SCHOOL"and 1.82 or 1.65
  Lighting.FogEnd=map.Id=="HOSPITAL"and 150 or map.Id=="SCHOOL"and 235 or 205
  Lighting.Ambient=map.Id=="SCHOOL"and Color3.fromRGB(104,109,121)or Color3.fromRGB(86,91,103)
  for _,x in ipairs(f:GetDescendants())do
   if x:IsA("Part")and(x.Name=="CeilingLight"or x.Name=="ParkLight")then x.Transparency=.42
   elseif x:IsA("Part")and(x.Name=="HallGuideStrip"or x.Name=="EdgeGuide")then x.Transparency=.08 end
  end
 elseif event.Id=="RED_HALL"then
  Lighting.Brightness=1.82
  Lighting.Ambient=Color3.fromRGB(104,45,52)
  for _,x in ipairs(f:GetDescendants())do if x:IsA("Part")and x.Name=="CeilingLight"then x.Color=Color3.fromRGB(255,70,70);x.Transparency=.05 end end
 elseif event.Id=="FIRE_DRILL"then
  local door=f:FindFirstChild("GymDoor",true)
  if door and door:IsA("BasePart")then door.CanCollide=false;door.Transparency=.72;door.Color=Color3.fromRGB(255,180,70)end
  workspace:SetAttribute("MapEventGameplay","GYM_ESCAPE_ROUTE_OPEN")
 elseif event.Id=="WARD_LOCKDOWN"then
  for _,x in ipairs(f:GetDescendants())do
   if x:IsA("Part")and x.Name=="WardDoor"then x.CanCollide=true;x.Transparency=.08;x.Color=Color3.fromRGB(138,52,52)end
  end
  Lighting.Brightness=1.3
  workspace:SetAttribute("MapEventGameplay","WARD_SHORTCUTS_CLOSED")
 elseif event.Id=="BASEMENT_FOG"then
  Lighting.Brightness=1.38;Lighting.FogEnd=110;Lighting.FogColor=Color3.fromRGB(75,82,78)
  workspace:SetAttribute("MapEventGameplay","HOSPITAL_SHORT_SIGHT")
 elseif event.Id=="CAROUSEL_START"then
  local rotor=f:FindFirstChild("CarouselRotor",true)
  if rotor and rotor:IsA("BasePart")then
   task.spawn(function()
    while rotor.Parent and workspace:GetAttribute("CurrentMapEvent")=="CAROUSEL_START"do
     rotor.CFrame=rotor.CFrame*CFrame.Angles(0,math.rad(4),0)
     task.wait(.08)
    end
   end)
  end
  workspace:SetAttribute("MapEventGameplay","MOVING_CAROUSEL_HAZARD")
 elseif event.Id=="TUNNEL_FOG"then
  Lighting.FogEnd=126;Lighting.Brightness=1.42
  workspace:SetAttribute("MapEventGameplay","UNDERPASS_LOW_VISIBILITY")
 end
end
local function makeArena(map)
 local old=workspace:FindFirstChild("MidnightArena")
 local hadReady=old~=nil and workspace:GetAttribute("MapReady")==true
 workspace:SetAttribute("MapBuilding",true)
 if not hadReady then workspace:SetAttribute("MapReady",false)end
 local stale=workspace:FindFirstChild("MidnightArenaNext");if stale then stale:Destroy()end
 local f=Instance.new("Folder")
 f.Name=old and"MidnightArenaNext"or"MidnightArena"
 f.Parent=workspace
 foundationSpawn=Instance.new("SpawnLocation")
 foundationSpawn.Name="FoundationSpawn"
 foundationSpawn.Size=Vector3.new(10,1,10)
 foundationSpawn.Position=Vector3.new(survivorSpawns[1].X,.55,survivorSpawns[1].Z)
 foundationSpawn.Anchored=true
 foundationSpawn.Neutral=true
 foundationSpawn.Transparency=1
 foundationSpawn.CanCollide=false
 foundationSpawn.CanTouch=false
 foundationSpawn.CanQuery=false
 foundationSpawn.Parent=f
 for k,v in pairs(Style.Lighting)do Lighting[k]=v end
 local grade=Lighting:FindFirstChild("MidnightColorGrade")or Instance.new("ColorCorrectionEffect")
 grade.Name="MidnightColorGrade";grade.Brightness=.035;grade.Contrast=.08;grade.Saturation=-.04;grade.TintColor=Color3.fromRGB(230,235,242);grade.Parent=Lighting
 local floorColor=map.Id=="SCHOOL"and Color3.fromRGB(36,41,48)or map.Id=="HOSPITAL"and Color3.fromRGB(61,72,72)or Color3.fromRGB(56,55,67)
 local floorMaterial=map.Id=="THEME_PARK"and Enum.Material.Asphalt or Enum.Material.Concrete
 local mainFloor=arenaPart(f,"Floor",Vector3.new(340,1,340),Vector3.new(0,0,0),floorColor,floorMaterial);mainFloor:SetAttribute("WalkableGround",true)
 for _,x in ipairs({-169,169})do arenaPart(f,"OuterWall",Vector3.new(2,22,340),Vector3.new(x,11,0),Style.Wall,Enum.Material.Concrete)end
 for _,z in ipairs({-169,169})do arenaPart(f,"OuterWall",Vector3.new(340,22,2),Vector3.new(0,11,z),Style.Wall,Enum.Material.Concrete)end
 -- 대형 맵의 가장자리와 주요 동선을 읽을 수 있는 낮은 유도등
 for _,x in ipairs({-145,-108,-72,-36,0,36,72,108,145})do
  local edge=arenaPart(f,"EdgeGuide",Vector3.new(12,.18,1),Vector3.new(x,.62,-164),Color3.fromRGB(72,132,146),Enum.Material.Neon);edge.CanCollide=false;edge.Transparency=.28
 end

 if map.Id=="SCHOOL"then
  -- 초보용 학교: 중앙 복도 + 교실 + 급식실 + 체육관. 시야가 길고 우회로가 단순하다.
  -- 학교는 답답한 저천장을 피하고, 교실/복도는 약 18스터드 높이로 통일한다.
  local schoolWallHeight=18
  local schoolWallY=9
  local schoolCeilingY=18.4
  local schoolLightY=16.4
  -- 실제 실내 구역 천장만 사용하고 전체 맵을 덮는 단일 지붕판은 두지 않는다.
   for i,spec in ipairs({
    {Vector3.new(0,19.4,-163),Vector3.new(336,1,10)},
    {Vector3.new(0,19.4,163),Vector3.new(336,1,10)},
    {Vector3.new(-163,19.4,0),Vector3.new(10,1,336)},
    {Vector3.new(163,19.4,0),Vector3.new(10,1,336)}
   })do
    arenaPart(f,"SchoolRoofRim"..i,spec[2],spec[1],Color3.fromRGB(72,76,84),Enum.Material.Concrete)
   end
   for _,roofZ in ipairs({-144,-120,-96,-72,-48,-24,0,24,48,72,96,120,144})do
    local hallLamp=arenaPart(f,"CeilingLight",Vector3.new(11,.45,2),Vector3.new(0,schoolLightY,roofZ),Style.SafeLight,Enum.Material.Neon)
    hallLamp.CanCollide=false;hallLamp.Transparency=.08;glow(hallLamp,Style.SafeLight,17,.58)
   end
  zoneFloor(f,"SchoolHallFloor",Vector3.new(32,.35,124),Vector3.new(0,.68,0),Color3.fromRGB(133,136,139),Enum.Material.Marble)
  zoneFloor(f,"SchoolCafeteriaFloor",Vector3.new(54,.35,48),Vector3.new(-51,.68,43),Color3.fromRGB(111,101,91),Enum.Material.Concrete)
  zoneFloor(f,"SchoolGymZone",Vector3.new(52,.35,46),Vector3.new(50,.68,48),Color3.fromRGB(136,95,67),Enum.Material.WoodPlanks)
  local exitLight=arenaPart(f,"SchoolExitLight",Vector3.new(8,2,.7),Vector3.new(0,7,-67),Color3.fromRGB(91,231,158),Enum.Material.Neon);glow(exitLight,exitLight.Color,18,1.8)
  arenaPart(f,"MainHallLeft",Vector3.new(3,schoolWallHeight,112),Vector3.new(-18,schoolWallY,0),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"MainHallRight",Vector3.new(3,schoolWallHeight,112),Vector3.new(18,schoolWallY,0),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"MainHallCeiling",Vector3.new(39,1,126),Vector3.new(0,schoolCeilingY,0),Color3.fromRGB(104,109,118),Enum.Material.Concrete)
  arenaPart(f,"ClassWingCeilingL",Vector3.new(58,1,84),Vector3.new(-48,schoolCeilingY,-6),Color3.fromRGB(108,111,117),Enum.Material.Concrete)
  arenaPart(f,"ClassWingCeilingR",Vector3.new(58,1,84),Vector3.new(48,schoolCeilingY,-6),Color3.fromRGB(108,111,117),Enum.Material.Concrete)
  arenaPart(f,"CafeteriaCeiling",Vector3.new(58,1,52),Vector3.new(-51,schoolCeilingY,43),Color3.fromRGB(104,101,98),Enum.Material.Concrete)
  arenaPart(f,"GymCeiling",Vector3.new(56,1,50),Vector3.new(50,schoolCeilingY,48),Color3.fromRGB(102,101,105),Enum.Material.Concrete)
  for _,z in ipairs({-40,-12,16})do
   for _,side in ipairs({-1,1})do
    local x=side*48
    arenaPart(f,"ClassroomWall",Vector3.new(56,schoolWallHeight,3),Vector3.new(x,schoolWallY,z),Style.Wall,Enum.Material.Concrete)
    arenaPart(f,"ClassroomBack",Vector3.new(3,schoolWallHeight,27),Vector3.new(side*76,schoolWallY,z+13),Style.Wall,Enum.Material.Concrete)
    for desk=1,4 do
     arenaPart(f,"ClassDesk",Vector3.new(7,2,4),Vector3.new(side*(31+(desk%2)*12),1.5,z+6+math.floor((desk-1)/2)*9),Color3.fromRGB(121,91,67),Enum.Material.WoodPlanks)
    end
   end
   for _,side in ipairs({-1,1})do
     local classCenter=side*48
     local door=arenaPart(f,"ClassDoor",Vector3.new(8,9,.8),Vector3.new(classCenter,4.5,z-1.7),Color3.fromRGB(103,78,58),Enum.Material.Wood);door.CanCollide=false;door.Transparency=.1
     local doorGlass=arenaPart(f,"ClassDoorGlass",Vector3.new(4,2.7,.25),door.Position+Vector3.new(0,1.7,-.5),Color3.fromRGB(143,190,205),Enum.Material.Glass);doorGlass.CanCollide=false;doorGlass.Transparency=.3
     local board=arenaPart(f,"ClassBoard",Vector3.new(14,4,.35),Vector3.new(side*73,6,z+10),Color3.fromRGB(45,78,65),Enum.Material.Slate);board.CanCollide=false
     for _,wz in ipairs({-8,8})do
      local window=arenaPart(f,"ClassWindow",Vector3.new(7,3.5,.28),Vector3.new(side*75,7,z+wz),Color3.fromRGB(148,188,202),Enum.Material.Glass);window.CanCollide=false;window.Transparency=.32
     end
    end
    local lamp=arenaPart(f,"CeilingLight",Vector3.new(12,.5,2),Vector3.new(0,schoolLightY,z+7),Style.SafeLight,Enum.Material.Neon);lamp.Transparency=.12;glow(lamp,Style.SafeLight,18,.72)
  end
  -- 급식실
  arenaPart(f,"CafeteriaSign",Vector3.new(22,8,2),Vector3.new(-52,4,48),Style.Locker,Enum.Material.Metal)
  for i=1,6 do
   arenaPart(f,"CafeteriaTable",Vector3.new(12,2,5),Vector3.new(-58+(i%2)*20,1.5,30+math.floor((i-1)/2)*12),Color3.fromRGB(151,117,79),Enum.Material.WoodPlanks)
  end
  -- 체육관 + 숨는 공간
  arenaPart(f,"GymFloor",Vector3.new(48,1,42),Vector3.new(50,.6,48),Color3.fromRGB(126,91,65),Enum.Material.WoodPlanks)
  local gymDoor=arenaPart(f,"GymDoor",Vector3.new(4,10,14),Vector3.new(20,5,48),Style.Locker,Enum.Material.Metal);gymDoor.Transparency=.18
  for i=1,4 do arenaPart(f,"GymBleacher",Vector3.new(18,3,5),Vector3.new(58,2,26+i*8),Color3.fromRGB(94,101,110),Enum.Material.Metal)end
  for i=1,16 do
    local locker=arenaPart(f,"Locker",Vector3.new(3.4,8,3),Vector3.new(-14+(i%8)*4,4,-64+math.floor((i-1)/8)*8),Style.Locker,Enum.Material.Metal)
    local vent=arenaPart(f,"LockerVent",Vector3.new(2.2,.25,.2),locker.Position+Vector3.new(0,1.5,-1.6),Color3.fromRGB(121,145,157),Enum.Material.Metal);vent.CanCollide=false
   end
  for _,z in ipairs({-52,-26,0,26,52})do
   local strip=arenaPart(f,"HallGuideStrip",Vector3.new(12,.18,1.2),Vector3.new(0,.78,z),Color3.fromRGB(87,210,224),Enum.Material.Neon);strip.CanCollide=false
  end
  for i,spec in ipairs({
   {Vector3.new(-118,schoolLightY,-70),Vector3.new(14,.45,3)},{Vector3.new(118,schoolLightY,-70),Vector3.new(14,.45,3)},
   {Vector3.new(-51,schoolLightY,43),Vector3.new(14,.45,3)},{Vector3.new(50,schoolLightY,48),Vector3.new(14,.45,3)},
   {Vector3.new(108,schoolLightY,104),Vector3.new(14,.45,3)}
  })do
   local roomLight=arenaPart(f,"SchoolRoomLight"..i,spec[2],spec[1],Style.SafeLight,Enum.Material.Neon);roomLight.CanCollide=false;roomLight.Transparency=.18;glow(roomLight,Style.SafeLight,16,.58)
  end
  arenaPart(f,"SchoolNoticeBoard",Vector3.new(12,6,.8),Vector3.new(-16,6.2,-28),Color3.fromRGB(126,89,54),Enum.Material.WoodPlanks)
  arenaPart(f,"SchoolClock",Vector3.new(4,4,.6),Vector3.new(16,9.4,-6),Color3.fromRGB(215,220,222),Enum.Material.SmoothPlastic)

  -- 학교 구조 디테일: 높은 천장을 비어 보이지 않게 기둥/몰딩/천장 프레임/안내물을 배치한다.
  for _,z in ipairs({-48,-24,0,24,48})do
   for _,x in ipairs({-16.1,16.1})do
    arenaPart(f,"SchoolHallColumn",Vector3.new(1.3,schoolWallHeight,1.3),Vector3.new(x,schoolWallY,z),Color3.fromRGB(104,109,117),Enum.Material.Concrete)
   end
   arenaPart(f,"SchoolCeilingBeam",Vector3.new(37,.65,1.1),Vector3.new(0,17.65,z),Color3.fromRGB(82,87,95),Enum.Material.Metal)
  end
  for _,x in ipairs({-16.25,16.25})do
   arenaPart(f,"SchoolWallBaseTrim",Vector3.new(.38,1.1,112),Vector3.new(x,1.25,0),Color3.fromRGB(68,76,84),Enum.Material.Metal)
   arenaPart(f,"SchoolWallTopTrim",Vector3.new(.42,.55,112),Vector3.new(x,16.7,0),Color3.fromRGB(78,84,92),Enum.Material.Metal)
  end
  for _,z in ipairs({-40,-12,16})do
   for _,side in ipairs({-1,1})do
    local classCenter=side*48
    arenaPart(f,"ClassDoorFrameL",Vector3.new(.45,10,.7),Vector3.new(classCenter-4.2,5,z-1.72),Color3.fromRGB(76,82,88),Enum.Material.Metal)
    arenaPart(f,"ClassDoorFrameR",Vector3.new(.45,10,.7),Vector3.new(classCenter+4.2,5,z-1.72),Color3.fromRGB(76,82,88),Enum.Material.Metal)
    arenaPart(f,"ClassDoorFrameTop",Vector3.new(8.8,.45,.7),Vector3.new(classCenter,10,z-1.72),Color3.fromRGB(76,82,88),Enum.Material.Metal)
    arenaPart(f,"ClassRoomNumber",Vector3.new(3.4,1.2,.25),Vector3.new(classCenter+(side>0 and-5.7 or 5.7),10.3,z-1.75),Color3.fromRGB(195,204,208),Enum.Material.SmoothPlastic).CanCollide=false
   end
  end
  for _,spec in ipairs({
   {Vector3.new(-15.8,7.2,42),"SchoolFireCabinet"},
   {Vector3.new(15.8,7.2,-42),"SchoolFireCabinet"},
  })do
   local cabinet=arenaPart(f,spec[2],Vector3.new(.7,5,3.2),spec[1],Color3.fromRGB(146,45,45),Enum.Material.Metal);cabinet.CanCollide=false
  end
  arenaPart(f,"SchoolTrophyCase",Vector3.new(10,6,1.6),Vector3.new(16.1,5.2,30),Color3.fromRGB(77,91,104),Enum.Material.Glass).Transparency=.38
  arenaPart(f,"SchoolVendingMachine",Vector3.new(4,8,3),Vector3.new(-14,4.3,55),Color3.fromRGB(72,99,123),Enum.Material.Metal)
  local gymBackboard=arenaPart(f,"GymBackboard",Vector3.new(9,5,.4),Vector3.new(50,11.5,25.5),Color3.fromRGB(222,224,220),Enum.Material.SmoothPlastic);gymBackboard.CanCollide=false
  local gymRim=arenaPart(f,"GymRim",Vector3.new(4,.35,4),Vector3.new(50,9.2,23.6),Color3.fromRGB(199,75,49),Enum.Material.Metal);gymRim.CanCollide=false

  -- 확장 구역: 도서관 / 과학동 / 운동장 / 강당
  zoneFloor(f,"LibraryWing",Vector3.new(78,.35,72),Vector3.new(-118,.68,-70),Color3.fromRGB(105,99,92),Enum.Material.WoodPlanks)
  zoneFloor(f,"ScienceWing",Vector3.new(78,.35,72),Vector3.new(118,.68,-70),Color3.fromRGB(103,112,118),Enum.Material.Concrete)
  zoneFloor(f,"SchoolCourtyard",Vector3.new(92,.35,78),Vector3.new(-108,.68,104),Color3.fromRGB(79,112,79),Enum.Material.Grass)
  zoneFloor(f,"Auditorium",Vector3.new(92,.35,78),Vector3.new(108,.68,104),Color3.fromRGB(103,74,67),Enum.Material.WoodPlanks)
  zoneFloor(f,"SchoolWestConnector",Vector3.new(94,.35,16),Vector3.new(-72,.7,-28),Color3.fromRGB(128,130,132),Enum.Material.Marble)
  zoneFloor(f,"SchoolEastConnector",Vector3.new(94,.35,16),Vector3.new(72,.7,-28),Color3.fromRGB(128,130,132),Enum.Material.Marble)
  zoneFloor(f,"SchoolSouthConnector",Vector3.new(16,.35,92),Vector3.new(0,.7,108),Color3.fromRGB(128,130,132),Enum.Material.Marble)
  arenaPart(f,"LibraryCeiling",Vector3.new(80,1,74),Vector3.new(-118,schoolCeilingY,-70),Color3.fromRGB(96,92,89),Enum.Material.Concrete)
  arenaPart(f,"ScienceCeiling",Vector3.new(80,1,74),Vector3.new(118,schoolCeilingY,-70),Color3.fromRGB(98,106,112),Enum.Material.Concrete)
  arenaPart(f,"AuditoriumCeiling",Vector3.new(94,1,80),Vector3.new(108,schoolCeilingY,104),Color3.fromRGB(90,76,77),Enum.Material.Concrete)
  for _,spec in ipairs({
   {Vector3.new(-157,schoolWallY,-70),Vector3.new(3,schoolWallHeight,72)},{Vector3.new(-118,schoolWallY,-106),Vector3.new(78,schoolWallHeight,3)},
   {Vector3.new(157,schoolWallY,-70),Vector3.new(3,schoolWallHeight,72)},{Vector3.new(118,schoolWallY,-106),Vector3.new(78,schoolWallHeight,3)},
   {Vector3.new(154,schoolWallY,104),Vector3.new(3,schoolWallHeight,78)},{Vector3.new(108,schoolWallY,143),Vector3.new(92,schoolWallHeight,3)}
  })do arenaPart(f,"SchoolWingWall",spec[2],spec[1],Style.Wall,Enum.Material.Concrete)end
  for i=1,8 do
   arenaPart(f,"LibraryShelf",Vector3.new(12,7,3),Vector3.new(-146+(i%4)*18,3.5,-92+math.floor((i-1)/4)*32),Color3.fromRGB(94,72,54),Enum.Material.WoodPlanks)
   arenaPart(f,"ScienceBench",Vector3.new(12,3,5),Vector3.new(90+(i%4)*18,1.7,-92+math.floor((i-1)/4)*32),Color3.fromRGB(110,119,123),Enum.Material.Metal)
  end
  for i=1,5 do arenaPart(f,"AuditoriumSeat",Vector3.new(13,3,5),Vector3.new(78+i*12,1.7,86+(i%2)*18),Color3.fromRGB(118,61,57),Enum.Material.Fabric)end
  for i=1,8 do
    local row=math.floor((i-1)/4);local col=(i-1)%4
    arenaPart(f,"LibraryShelfExtra",Vector3.new(11,6.8,3),Vector3.new(-145+col*18,3.5,-82+row*18),Color3.fromRGB(91,69,52),Enum.Material.WoodPlanks)
   end
   for i=1,6 do
    local row=math.floor((i-1)/3);local col=(i-1)%3
    arenaPart(f,"ScienceBenchExtra",Vector3.new(10,3,5),Vector3.new(94+col*18,1.7,-82+row*22),Color3.fromRGB(105,116,121),Enum.Material.Metal)
   end
   addObjectiveStation(f,"도서관 단말",Vector3.new(-118,3,-70),1)
  addObjectiveStation(f,"과학실 전원",Vector3.new(118,3,-70),2)
  addObjectiveStation(f,"운동장 방송",Vector3.new(-108,3,104),3)
  addObjectiveStation(f,"강당 비상패널",Vector3.new(108,3,104),4)
  addMapUtility(f,"SCHOOL_BROADCAST","비상 방송실",Vector3.new(0,3,-42))
  addEnergyCore(f,map.Id,Vector3.new(0,4,0))

  -- 학교 구석 놀람/코믹 연출. 로컬 클라이언트에서만 보이며 경쟁 판정에는 영향이 없다.
  addSurpriseTrigger(f,"SCHOOL_HALL_SHADOW","SCHOOL_SHADOW",Vector3.new(0,4,24),12,"방금 뭐가 지나갔지?")
  addSurpriseTrigger(f,"SCHOOL_LOCKER_EYES","SCHOOL_LOCKER",Vector3.new(0,4,-58),10,"사물함 안에서 누가 보고 있다")
  addSurpriseTrigger(f,"SCHOOL_JANITOR","SCHOOL_JANITOR",Vector3.new(2,4,51),12,"청소 중이니까 뛰지 마!")
  addSurpriseTrigger(f,"SCHOOL_GYM_BALL","SCHOOL_BALL",Vector3.new(50,3,50),11,"체육관 공이 혼자 굴러간다")
  addSurpriseTrigger(f,"SCHOOL_BOARD_GAG","SCHOOL_BOARD",Vector3.new(-66,5,-28),10,"오늘의 숙제: 살아서 집 가기")
  addSurpriseTrigger(f,"SCHOOL_CAFETERIA","SCHOOL_TRAY",Vector3.new(-51,3,39),10,"급식 당번이 아직 남아 있다…")
  addGhostSightingTrigger(f,"YUREI",Vector3.new(-118,4,-52),12)
  addGhostSightingTrigger(f,"NOPPERABO",Vector3.new(48,4,-12),11)
  addGhostSightingTrigger(f,"CHEONNYEO_GWISHIN",Vector3.new(108,4,104),12)
  addGhostSightingTrigger(f,"KRASUE",Vector3.new(-108,7,104),13)
  addLoreCollectible(f,"SCHOOL_01",Vector3.new(-43,1.1,-34));addLoreCollectible(f,"SCHOOL_02",Vector3.new(14,1.1,-62))
  addLoreCollectible(f,"SCHOOL_03",Vector3.new(63,1.1,65));addLoreCollectible(f,"SCHOOL_04",Vector3.new(-64,1.1,54))
  addEscapeGate(f,map.Id,Vector3.new(0,6,158))
 elseif map.Id=="HOSPITAL"then
  -- 폐병원: 좁은 중앙 복도와 병실, 수술실, 지하실 느낌의 저천장 구역.
  Lighting.FogEnd=132
  zoneFloor(f,"HospitalHallFloor",Vector3.new(20,.35,136),Vector3.new(0,.68,0),Color3.fromRGB(112,128,123),Enum.Material.Concrete)
  zoneFloor(f,"HospitalSurgeryFloor",Vector3.new(56,.35,40),Vector3.new(-48,.68,51),Color3.fromRGB(102,120,119),Enum.Material.Concrete)
  zoneFloor(f,"HospitalBasementFloor",Vector3.new(56,.35,34),Vector3.new(47,.68,57),Color3.fromRGB(64,70,70),Enum.Material.Concrete)
  local emergency=arenaPart(f,"HospitalEmergencySign",Vector3.new(10,2,.8),Vector3.new(0,7,-62),Color3.fromRGB(224,73,73),Enum.Material.Neon);glow(emergency,emergency.Color,18,1.6)
  arenaPart(f,"HospitalHallL",Vector3.new(3,12,132),Vector3.new(-11,6,0),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"HospitalHallR",Vector3.new(3,12,132),Vector3.new(11,6,0),Style.Wall,Enum.Material.Concrete)
  for _,z in ipairs({-48,-22,4,30})do
   for _,side in ipairs({-1,1})do
    local x=side*42
    arenaPart(f,"WardOuter",Vector3.new(52,12,3),Vector3.new(x,6,z),Style.Wall,Enum.Material.Concrete)
    local door=arenaPart(f,"WardDoor",Vector3.new(5,9,2),Vector3.new(side*13,4.5,z+8),Color3.fromRGB(91,111,108),Enum.Material.Metal);door.CanCollide=false;door.Transparency=.7
    for bed=1,3 do arenaPart(f,"HospitalBed",Vector3.new(10,2,5),Vector3.new(side*(29+bed*10),1.5,z+9),Color3.fromRGB(174,187,188),Enum.Material.Metal)end
   end
   local lamp=arenaPart(f,"CeilingLight",Vector3.new(8,.5,2),Vector3.new(0,10,z+10),Color3.fromRGB(183,217,207),Enum.Material.Neon);lamp.Transparency=.06;glow(lamp,lamp.Color,20,1.15)
  end
  -- 수술실
  arenaPart(f,"SurgeryWall",Vector3.new(55,12,3),Vector3.new(-45,6,61),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"SurgeryTable",Vector3.new(12,3,5),Vector3.new(-48,2,52),Color3.fromRGB(132,151,151),Enum.Material.Metal)
  arenaPart(f,"SurgeryLamp",Vector3.new(6,.7,6),Vector3.new(-48,10,52),Color3.fromRGB(190,240,220),Enum.Material.Neon)
  -- 지하실: 낮은 천장과 좁은 통로로 시야를 압축
  arenaPart(f,"BasementCeiling",Vector3.new(56,1,34),Vector3.new(47,7,57),Color3.fromRGB(60,64,66),Enum.Material.Concrete)
  arenaPart(f,"BasementWallA",Vector3.new(3,8,34),Vector3.new(20,4,57),Color3.fromRGB(69,73,75),Enum.Material.Concrete)
  arenaPart(f,"BasementWallB",Vector3.new(3,8,34),Vector3.new(75,4,57),Color3.fromRGB(69,73,75),Enum.Material.Concrete)
  for i=1,5 do arenaPart(f,"BasementCrate",Vector3.new(6,5,6),Vector3.new(28+i*8,2.5,50+(i%2)*12),Color3.fromRGB(83,74,65),Enum.Material.WoodPlanks)end
  for _,z in ipairs({-56,-28,0,28,56})do
   local strip=arenaPart(f,"HospitalGuideStrip",Vector3.new(8,.18,1),Vector3.new(0,.78,z),Color3.fromRGB(111,215,190),Enum.Material.Neon);strip.CanCollide=false
  end
  -- 확장 구역: 응급실 / 약국 / 영안실 / 하역장
  zoneFloor(f,"EmergencyWing",Vector3.new(82,.35,76),Vector3.new(-118,.68,-82),Color3.fromRGB(102,116,113),Enum.Material.Concrete)
  zoneFloor(f,"PharmacyWing",Vector3.new(82,.35,76),Vector3.new(118,.68,-82),Color3.fromRGB(98,112,108),Enum.Material.Concrete)
  zoneFloor(f,"MorgueWing",Vector3.new(86,.35,76),Vector3.new(-118,.68,108),Color3.fromRGB(65,71,72),Enum.Material.Concrete)
  zoneFloor(f,"LoadingDock",Vector3.new(86,.35,76),Vector3.new(118,.68,108),Color3.fromRGB(76,77,78),Enum.Material.Concrete)
  zoneFloor(f,"HospitalCrossA",Vector3.new(120,.35,14),Vector3.new(-70,.7,-20),Color3.fromRGB(109,122,119),Enum.Material.Concrete)
  zoneFloor(f,"HospitalCrossB",Vector3.new(120,.35,14),Vector3.new(70,.7,-20),Color3.fromRGB(109,122,119),Enum.Material.Concrete)
  for i=1,8 do
   arenaPart(f,"EmergencyBed",Vector3.new(10,2,5),Vector3.new(-148+(i%4)*19,1.5,-104+math.floor((i-1)/4)*30),Color3.fromRGB(167,180,181),Enum.Material.Metal)
   arenaPart(f,"PharmacyShelf",Vector3.new(12,7,3),Vector3.new(88+(i%4)*19,3.5,-104+math.floor((i-1)/4)*30),Color3.fromRGB(126,137,135),Enum.Material.Metal)
  end
  for i=1,6 do arenaPart(f,"MorgueDrawer",Vector3.new(8,5,3),Vector3.new(-150+i*11,2.5,116+(i%2)*15),Color3.fromRGB(97,106,107),Enum.Material.Metal)end
  addObjectiveStation(f,"응급실 발전기",Vector3.new(-118,3,-82),1)
  addObjectiveStation(f,"약국 보안패널",Vector3.new(118,3,-82),2)
  addObjectiveStation(f,"영안실 퓨즈",Vector3.new(-118,3,108),3)
  addObjectiveStation(f,"하역장 셔터",Vector3.new(118,3,108),4)
  addMapUtility(f,"HOSPITAL_SURGERY_LIGHT","수술실 전력장치",Vector3.new(-48,3,40))
  addEnergyCore(f,map.Id,Vector3.new(0,4,0))
  addSurpriseTrigger(f,"HOSPITAL_WHEELCHAIR","HOSPITAL_WHEELCHAIR",Vector3.new(8,3,26),11,"휠체어가 혼자 움직였다")
  addSurpriseTrigger(f,"HOSPITAL_CURTAIN","HOSPITAL_CURTAIN",Vector3.new(-45,4,53),10,"커튼 뒤에는 아무도… 없나?")
  addSurpriseTrigger(f,"HOSPITAL_MONITOR","HOSPITAL_MONITOR",Vector3.new(43,4,57),10,"삐— 배터리 1%")
  addSurpriseTrigger(f,"HOSPITAL_XRAY","HOSPITAL_XRAY",Vector3.new(118,4,-82),10,"엑스레이에 사람 말고 오리가 찍혔다")
  addSurpriseTrigger(f,"HOSPITAL_BED","HOSPITAL_BED",Vector3.new(-118,3,-82),11,"빈 침대가 혼자 한 칸 움직였다")
  addGhostSightingTrigger(f,"BANSHEE",Vector3.new(-48,4,52),12)
  addGhostSightingTrigger(f,"JIANGSHI",Vector3.new(47,4,57),11)
  addGhostSightingTrigger(f,"CHUREL",Vector3.new(-118,4,108),12)
  addGhostSightingTrigger(f,"WHITE_LADY",Vector3.new(118,4,-82),12)
  addLoreCollectible(f,"HOSPITAL_01",Vector3.new(-96,1.1,-94));addLoreCollectible(f,"HOSPITAL_02",Vector3.new(-54,1.1,58));addLoreCollectible(f,"HOSPITAL_03",Vector3.new(-132,1.1,122))
  addEscapeGate(f,map.Id,Vector3.new(0,6,158))
 elseif map.Id=="THEME_PARK"then
  -- 폐놀이공원: 넓은 야외, 내부 공간, 매표소, 숨는 부스와 복잡한 우회 동선.
  zoneFloor(f,"ParkMainPath",Vector3.new(20,.3,142),Vector3.new(0,.66,0),Color3.fromRGB(92,82,103),Enum.Material.Concrete)
  zoneFloor(f,"ParkCrossPath",Vector3.new(142,.3,18),Vector3.new(0,.66,-30),Color3.fromRGB(92,82,103),Enum.Material.Concrete)
  zoneFloor(f,"HauntedZoneFloor",Vector3.new(58,.3,42),Vector3.new(34,.66,38),Color3.fromRGB(60,50,68),Enum.Material.Slate)
  zoneFloor(f,"CarouselZoneFloor",Vector3.new(42,.3,42),Vector3.new(-32,.66,8),Color3.fromRGB(92,64,92),Enum.Material.Slate)
  for _,x in ipairs({-58,-20,20,58})do
   local light=arenaPart(f,"ParkLight",Vector3.new(2,11,2),Vector3.new(x,5.5,-52),Color3.fromRGB(220,91,180),Enum.Material.Neon);light.Transparency=.05;glow(light,light.Color,30,1.7)
  end
  -- 회전목마
  arenaPart(f,"CarouselBase",Vector3.new(34,2,34),Vector3.new(-32,1.5,8),Color3.fromRGB(102,68,108),Enum.Material.WoodPlanks)
  local rotor=arenaPart(f,"CarouselRotor",Vector3.new(28,1,28),Vector3.new(-32,3,8),Color3.fromRGB(180,100,142),Enum.Material.Neon);rotor.CanCollide=false;glow(rotor,rotor.Color,26,1.3)
  local canopy=arenaPart(f,"CarouselCanopy",Vector3.new(38,2,38),Vector3.new(-32,10,8),Color3.fromRGB(112,68,111),Enum.Material.Fabric);canopy.Transparency=.08
  for i=1,8 do
   local a=i/8*math.pi*2
   arenaPart(f,"CarouselHorse",Vector3.new(3,5,2),Vector3.new(-32+math.cos(a)*11,5,8+math.sin(a)*11),Color3.fromRGB(212,190,153),Enum.Material.SmoothPlastic)
  end
  -- 귀신의 집 내부
  arenaPart(f,"HauntedShell",Vector3.new(58,12,3),Vector3.new(34,6,54),Color3.fromRGB(54,45,62),Enum.Material.Slate)
  arenaPart(f,"HauntedSideL",Vector3.new(3,12,42),Vector3.new(6,6,37),Color3.fromRGB(54,45,62),Enum.Material.Slate)
  arenaPart(f,"HauntedSideR",Vector3.new(3,12,42),Vector3.new(62,6,37),Color3.fromRGB(54,45,62),Enum.Material.Slate)
  for i=1,4 do arenaPart(f,"HauntedDivider",Vector3.new(24,9,2),Vector3.new(18+(i%2)*28,4.5,25+i*7),Color3.fromRGB(67,55,72),Enum.Material.Slate)end
  -- 매표소와 숨는 부스
  for i=1,5 do
   arenaPart(f,"TicketBooth",Vector3.new(10,8,10),Vector3.new(-60+i*18,4,-38),Color3.fromRGB(83,72+(i*7),94),Enum.Material.Metal)
  end
  for i=1,7 do
   local a=i/7*math.pi*2
   arenaPart(f,"HideBooth",Vector3.new(8,7,8),Vector3.new(math.cos(a)*59,3.5,math.sin(a)*54),Color3.fromRGB(75,66,82),Enum.Material.Metal)
  end
  -- 지하 통로 느낌의 저천장 복도
  arenaPart(f,"UnderpassCeiling",Vector3.new(72,1,18),Vector3.new(0,7,-66),Color3.fromRGB(53,54,61),Enum.Material.Concrete)
  arenaPart(f,"UnderpassWallL",Vector3.new(72,8,2),Vector3.new(0,4,-74),Color3.fromRGB(62,63,70),Enum.Material.Concrete)
  arenaPart(f,"UnderpassWallR",Vector3.new(72,8,2),Vector3.new(0,4,-58),Color3.fromRGB(62,63,70),Enum.Material.Concrete)
  local sign=arenaPart(f,"ParkLandmarkSign",Vector3.new(18,5,1),Vector3.new(0,9,-30),Color3.fromRGB(222,105,178),Enum.Material.Neon);glow(sign,sign.Color,26,1.4)
  for _,x in ipairs({-45,45})do local guide=arenaPart(f,"ParkRouteGuide",Vector3.new(12,.18,1.2),Vector3.new(x,.8,-30),Color3.fromRGB(111,201,225),Enum.Material.Neon);guide.CanCollide=false end
  -- 확장 구역: 아케이드 / 범퍼카 / 푸드코트 / 정비구역
  zoneFloor(f,"ArcadeZone",Vector3.new(86,.35,74),Vector3.new(-118,.68,-92),Color3.fromRGB(73,58,82),Enum.Material.Slate)
  zoneFloor(f,"BumperCarZone",Vector3.new(86,.35,74),Vector3.new(118,.68,-92),Color3.fromRGB(84,70,88),Enum.Material.Asphalt)
  zoneFloor(f,"FoodCourtZone",Vector3.new(88,.35,76),Vector3.new(-118,.68,108),Color3.fromRGB(94,77,76),Enum.Material.Concrete)
  zoneFloor(f,"MaintenanceYard",Vector3.new(88,.35,76),Vector3.new(118,.68,108),Color3.fromRGB(64,65,72),Enum.Material.Concrete)
  for i=1,10 do
   local arcade=arenaPart(f,"ArcadeCabinet",Vector3.new(4,7,4),Vector3.new(-151+(i%5)*16,3.5,-112+math.floor((i-1)/5)*28),Color3.fromRGB(104,64+(i%3)*15,130),Enum.Material.Metal)
   local scr=arenaPart(f,"ArcadeGlow",Vector3.new(2.8,2,.2),arcade.Position+Vector3.new(0,1,-2.1),Color3.fromRGB(89,183,214),Enum.Material.Neon);scr.CanCollide=false
  end
  for i=1,8 do arenaPart(f,"BumperCar",Vector3.new(7,3,9),Vector3.new(86+(i%4)*20,2,-112+math.floor((i-1)/4)*30),Color3.fromRGB(140+(i%2)*45,69,92+(i%3)*28),Enum.Material.Metal)end
  for i=1,8 do arenaPart(f,"FoodTable",Vector3.new(9,2,6),Vector3.new(-151+(i%4)*19,1.5,88+math.floor((i-1)/4)*30),Color3.fromRGB(124,94,72),Enum.Material.WoodPlanks)end
  for i=1,8 do arenaPart(f,"MaintenanceCrate",Vector3.new(7,6,7),Vector3.new(88+(i%4)*19,3,88+math.floor((i-1)/4)*30),Color3.fromRGB(78,72,68),Enum.Material.WoodPlanks)end
  addObjectiveStation(f,"아케이드 전력",Vector3.new(-118,3,-92),1)
  addObjectiveStation(f,"범퍼카 제어반",Vector3.new(118,3,-92),2)
  addObjectiveStation(f,"푸드코트 셔터",Vector3.new(-118,3,108),3)
  addObjectiveStation(f,"정비실 발전기",Vector3.new(118,3,108),4)
  addMapUtility(f,"PARK_CAROUSEL_POWER","회전목마 전원",Vector3.new(-32,3,30))
  addEnergyCore(f,map.Id,Vector3.new(0,4,-12))
  addSurpriseTrigger(f,"PARK_CLOWN","PARK_CLOWN",Vector3.new(34,4,38),11,"광대가 방금 고개를 돌린 것 같은데")
  addSurpriseTrigger(f,"PARK_TICKET","PARK_TICKET",Vector3.new(0,4,-38),10,"매표소: 오늘도 무단결근")
  addSurpriseTrigger(f,"PARK_HORSE","PARK_HORSE",Vector3.new(-32,4,8),12,"회전목마 말이 나만 본다")
  addSurpriseTrigger(f,"PARK_ARCADE","PARK_ARCADE",Vector3.new(-118,4,-92),11,"아케이드 최고점수 이름: HELP")
  addSurpriseTrigger(f,"PARK_POPCORN","PARK_POPCORN",Vector3.new(-118,3,108),10,"팝콘 기계가 혼자 한 알씩 튀긴다")
  addGhostSightingTrigger(f,"DULLAHAN",Vector3.new(118,4,108),13)
  addGhostSightingTrigger(f,"LA_LLORONA",Vector3.new(0,4,-66),12)
  addGhostSightingTrigger(f,"PONTIANAK",Vector3.new(34,7,38),12)
  addGhostSightingTrigger(f,"BLACK_SHUCK",Vector3.new(-118,3,-92),13)
  addLoreCollectible(f,"PARK_01",Vector3.new(-24,1.1,-42));addLoreCollectible(f,"PARK_02",Vector3.new(-44,1.1,16));addLoreCollectible(f,"PARK_03",Vector3.new(47,1.1,45))
  addEscapeGate(f,map.Id,Vector3.new(0,6,158))
 end

 addAmbientSurprises(f,map)

 local events=map.Events or {}
 local event=events[math.random(1,math.max(1,#events))]or{Id="NONE",Name="평온"}
 applyMapEvent(f,map,event)
 -- 새 맵을 끝까지 만든 뒤 기존 맵과 원자적으로 교체한다.
 if old and old.Parent then
  old:Destroy()
  f.Name="MidnightArena"
 end
 workspace:SetAttribute("CurrentMapId",map.Id)
 workspace:SetAttribute("CurrentMapName",map.Name)
 workspace:SetAttribute("WorldArtPass","MIDNIGHT_"..map.Id.."_INFECTION_HORROR_V9")
 workspace:SetAttribute("CharacterArtDirection","REALISTIC_HUMANS_ABERRANT_MONSTERS")
 workspace:SetAttribute("DesignCodeSync","PRIMARY_THREE_FINAL_4V4_INFECTION_V1")
 workspace:SetAttribute("EscapeUnlocked",false)
 workspace:SetAttribute("SurvivorEscapeTriggered",false)
 decorateArenaWithOfficialAssets(f,map)
 workspace:SetAttribute("MapReady",true)
 workspace:SetAttribute("MapBuilding",false)
 foundationCheckpoint("WORLD_READY",nil,{mapId=map.Id})
 if foundationSpawn and foundationSpawn.Parent then foundationCheckpoint("SPAWN_READY",nil,{spawnY=foundationSpawn.Position.Y})end
 return f
end
local function recordServerQA(status)
 pcall(function()
  qaCaptureStore:UpdateAsync("latest",function(old)
   local data=typeof(old)=="table"and old or{captures={}}
   data.captures=typeof(data.captures)=="table"and data.captures or{}
   table.insert(data.captures,{
    gameId=C.GameId,label="SERVER",kind="STATUS",status=tostring(status):sub(1,160),
    userId=0,capturedAt=os.time(),
   })
   while #data.captures>30 do table.remove(data.captures,1)end
   data.updatedAt=os.time();data.gameId=C.GameId
   return data
  end)
 end)
end

local function makeFallbackArena(map,reason)
 local old=workspace:FindFirstChild("MidnightArena");if old then old:Destroy()end
 local nextArena=workspace:FindFirstChild("MidnightArenaNext");if nextArena then nextArena:Destroy()end
 local f=Instance.new("Folder");f.Name="MidnightArena";f.Parent=workspace
 foundationSpawn=Instance.new("SpawnLocation");foundationSpawn.Name="FoundationSpawn";foundationSpawn.Size=Vector3.new(10,1,10);foundationSpawn.Position=Vector3.new(survivorSpawns[1].X,.55,survivorSpawns[1].Z);foundationSpawn.Anchored=true;foundationSpawn.Neutral=true;foundationSpawn.Transparency=1;foundationSpawn.CanCollide=false;foundationSpawn.CanTouch=false;foundationSpawn.CanQuery=false;foundationSpawn.Parent=f
 Lighting.Brightness=2.05;Lighting.ClockTime=.35;Lighting.FogEnd=270
 Lighting.Ambient=Color3.fromRGB(72,78,90);Lighting.OutdoorAmbient=Color3.fromRGB(58,64,76)
 local mainFloor=arenaPart(f,"Floor",Vector3.new(160,1,160),Vector3.new(0,0,0),Style.Floor,Enum.Material.Concrete);mainFloor:SetAttribute("WalkableGround",true)
 for _,x in ipairs({-79,79})do arenaPart(f,"OuterWall",Vector3.new(2,18,160),Vector3.new(x,9,0),Style.Wall,Enum.Material.Concrete)end
 for _,z in ipairs({-79,79})do arenaPart(f,"OuterWall",Vector3.new(160,18,2),Vector3.new(0,9,z),Style.Wall,Enum.Material.Concrete)end
 zoneFloor(f,"SafeHall",Vector3.new(28,.35,126),Vector3.new(0,.68,0),Color3.fromRGB(125,130,139),Enum.Material.Concrete)
 for _,z in ipairs({-48,-16,16,48})do
  local lamp=arenaPart(f,"CeilingLight",Vector3.new(10,.5,2),Vector3.new(0,10,z),Style.SafeLight,Enum.Material.Neon)
  lamp.CanCollide=false;glow(lamp,Style.SafeLight,22,1.1)
 end
 local chosen=map or C.Maps[1]
 workspace:SetAttribute("CurrentMapId",chosen.Id)
 workspace:SetAttribute("CurrentMapName",chosen.Name)
 workspace:SetAttribute("CurrentMapEvent","")
 workspace:SetAttribute("CurrentMapEventName","")
 workspace:SetAttribute("MapEventGameplay","FALLBACK_SAFE_MAP")
 workspace:SetAttribute("WorldArtPass","MIDNIGHT_FALLBACK_SAFE_V1")
 workspace:SetAttribute("MapBuilding",false)
 workspace:SetAttribute("MapReady",true)
 foundationCheckpoint("WORLD_READY",nil,{mapId=chosen.Id,fallback=true})
 if foundationSpawn and foundationSpawn.Parent then foundationCheckpoint("SPAWN_READY",nil,{spawnY=foundationSpawn.Position.Y,fallback=true})end
 arena=f
 recordServerQA("MAP_FALLBACK:"..tostring(reason or"unknown"))
 return f
end

local function ensureArena(map)
 local ok,result=pcall(function()return makeArena(map)end)
 if ok and result and result.Parent and workspace:GetAttribute("MapReady")==true then
  return result
 end
 return makeFallbackArena(map,ok and"NO_READY"or result)
end

local function clearBots()
 for _,b in ipairs(bots)do
  if b.visuals then for _,v in ipairs(b.visuals)do if v.part then v.part:Destroy()end end end
  if b.part then b.part:Destroy()end
 end
 bots={};monsterBot=nil
end
local function botVisualPart(rootPart,name,size,offset,color,material,shape)
 local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.CanCollide=false;x.CanTouch=false;x.Size=size;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic
 if shape then x.Shape=shape end;x.CFrame=rootPart.CFrame*CFrame.new(offset);x.Parent=rootPart.Parent
 return x
end
local function decorateClassicMonster(anchor,id)
 local style=Style.Monsters[id]or Style.Monsters.DRACULA
 anchor.Color=style.Color;anchor.Transparency=.15
 local visuals={}
 local function add(name,size,offset,color,material,shape)local x=botVisualPart(anchor,name,size,offset,color,material,shape);table.insert(visuals,{part=x,offset=offset,rotation=CFrame.identity});return x end
 if id=="DRACULA"then
  add("Cape",Vector3.new(5.5,6,.45),Vector3.new(0,0,1.7),Color3.fromRGB(28,16,23),Enum.Material.Fabric)
  add("Collar",Vector3.new(5.8,1.2,1),Vector3.new(0,2.2,.4),Color3.fromRGB(102,18,35),Enum.Material.Fabric)
  add("Head",Vector3.new(2.6,2.6,2.6),Vector3.new(0,3.4,0),Color3.fromRGB(224,209,196),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  add("FangL",Vector3.new(.25,.8,.25),Vector3.new(-.45,2.9,-1.25),Color3.fromRGB(245,245,235),Enum.Material.SmoothPlastic)
  add("FangR",Vector3.new(.25,.8,.25),Vector3.new(.45,2.9,-1.25),Color3.fromRGB(245,245,235),Enum.Material.SmoothPlastic)
 elseif id=="FRANKENSTEIN"then
  add("Head",Vector3.new(3.2,3,2.8),Vector3.new(0,3.4,0),Color3.fromRGB(117,146,103),Enum.Material.SmoothPlastic)
  add("ShoulderL",Vector3.new(2.2,1.4,2.5),Vector3.new(-2.4,1,0),Color3.fromRGB(62,70,62),Enum.Material.Metal)
  add("ShoulderR",Vector3.new(2.2,1.4,2.5),Vector3.new(2.4,1,0),Color3.fromRGB(62,70,62),Enum.Material.Metal)
  add("BoltL",Vector3.new(.5,.5,1.3),Vector3.new(-1.8,3.3,0),Color3.fromRGB(155,160,160),Enum.Material.Metal)
  add("BoltR",Vector3.new(.5,.5,1.3),Vector3.new(1.8,3.3,0),Color3.fromRGB(155,160,160),Enum.Material.Metal)
 elseif id=="WEREWOLF"then
  add("Head",Vector3.new(3,2.8,3.2),Vector3.new(0,3.3,-.2),Color3.fromRGB(105,78,60),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  add("Muzzle",Vector3.new(2.1,1.4,2.4),Vector3.new(0,3,-2),Color3.fromRGB(122,91,69),Enum.Material.SmoothPlastic)
  local earL=add("EarL",Vector3.new(1.1,2,1),Vector3.new(-1,5,0),Color3.fromRGB(91,65,50),Enum.Material.SmoothPlastic);earL.Shape=Enum.PartType.Wedge
  local earR=add("EarR",Vector3.new(1.1,2,1),Vector3.new(1,5,0),Color3.fromRGB(91,65,50),Enum.Material.SmoothPlastic);earR.Shape=Enum.PartType.Wedge
  add("ClawL",Vector3.new(.7,2.8,.7),Vector3.new(-2.3,-.6,-.3),Color3.fromRGB(55,48,43),Enum.Material.SmoothPlastic)
  add("ClawR",Vector3.new(.7,2.8,.7),Vector3.new(2.3,-.6,-.3),Color3.fromRGB(55,48,43),Enum.Material.SmoothPlastic)
 elseif id=="MUMMY"then
  add("Head",Vector3.new(2.7,2.9,2.7),Vector3.new(0,3.4,0),Color3.fromRGB(203,190,148),Enum.Material.Fabric,Enum.PartType.Ball)
  for i=-2,2 do add("Bandage"..i,Vector3.new(4.6,.65,2.6),Vector3.new(0,i*.75,0),i%2==0 and Color3.fromRGB(213,202,164)or Color3.fromRGB(187,176,141),Enum.Material.Fabric)end
 elseif id=="GRIM_REAPER"then
  add("Cloak",Vector3.new(5.4,6,2.8),Vector3.new(0,0,.4),Color3.fromRGB(28,24,35),Enum.Material.Fabric)
  add("Hood",Vector3.new(3.7,3.7,3.7),Vector3.new(0,3.6,0),Color3.fromRGB(24,20,30),Enum.Material.Fabric,Enum.PartType.Ball)
  add("FaceVoid",Vector3.new(2.2,2.1,.5),Vector3.new(0,3.45,-1.75),Color3.fromRGB(6,6,8),Enum.Material.Neon)
  add("ScytheStaff",Vector3.new(.45,7,.45),Vector3.new(3,0,0),Color3.fromRGB(72,64,59),Enum.Material.Wood)
  local blade=add("ScytheBlade",Vector3.new(.5,3.8,2.5),Vector3.new(3,3.3,-1.2),Color3.fromRGB(184,190,198),Enum.Material.Metal);visuals[#visuals].rotation=CFrame.Angles(0,0,math.rad(60));blade.CFrame=anchor.CFrame*CFrame.new(visuals[#visuals].offset)*visuals[#visuals].rotation
 end
 return visuals
end
local function bot(role,pos)
 local p=Instance.new("Part");p.Name=role=="MONSTER"and"AI_MONSTER"or"AI_SURVIVOR";p.Anchored=true;p.CanCollide=false;p.CanTouch=false;p.Size=Vector3.new(2.8,3.6,1.9);p.Position=pos
 p.Color=role=="MONSTER"and Color3.fromRGB(65,34,44)or Color3.fromRGB(66,94,108);p.Material=role=="MONSTER"and Enum.Material.Fabric or Enum.Material.SmoothPlastic;p.Parent=arena
 local visuals={}
 if role=="MONSTER"then
  visuals=decorateClassicMonster(p,"DRACULA")
 else
  local function add(name,size,offset,color,material,shape)
   local x=botVisualPart(p,name,size,offset,color,material,shape);table.insert(visuals,{part=x,offset=offset,rotation=CFrame.identity});return x
  end
  add("AIHumanHead",Vector3.new(2.05,2.05,1.9),Vector3.new(0,2.8,0),Color3.fromRGB(211,181,153),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  add("AIHumanHair",Vector3.new(2.12,.55,1.95),Vector3.new(0,3.65,.05),Color3.fromRGB(47,38,36),Enum.Material.Fabric)
  add("AIHumanArmL",Vector3.new(.62,2.7,.72),Vector3.new(-1.7,-.1,0),Color3.fromRGB(66,94,108),Enum.Material.Fabric)
  add("AIHumanArmR",Vector3.new(.62,2.7,.72),Vector3.new(1.7,-.1,0),Color3.fromRGB(66,94,108),Enum.Material.Fabric)
  add("AIHumanLegL",Vector3.new(.78,2.85,.9),Vector3.new(-.64,-3.1,0),Color3.fromRGB(42,47,54),Enum.Material.Fabric)
  add("AIHumanLegR",Vector3.new(.78,2.85,.9),Vector3.new(.64,-3.1,0),Color3.fromRGB(42,47,54),Enum.Material.Fabric)
  add("AIHumanTool",Vector3.new(.42,1.9,.42),Vector3.new(1.9,-.1,-.65),Color3.fromRGB(91,205,220),Enum.Material.Neon)
 end
 local b={part=p,role=role,speed=role=="MONSTER"and 18 or 14,monsterId="DRACULA",visuals=visuals,infectReadyAt=0,purifyReadyAt=0,infectAttackReadyAt=0,energy=energyMax(),motionClock=math.random()*6.28}
 table.insert(bots,b);return b
end
local function weightPick(list)
 local total=0;for _,p in ipairs(list)do total+=math.max(1,(p:GetAttribute("RoundsSinceMonster")or 0)+1)end
 local r=math.random()*total
 for _,p in ipairs(list)do r-=math.max(1,(p:GetAttribute("RoundsSinceMonster")or 0)+1);if r<=0 then return p end end
 return list[#list]
end
local function selectStartingMonsters(h)
 local preferred,neutral,survivorPreferred={},{},{}
 for _,p in ipairs(h)do
  local pref=p:GetAttribute("MonsterPreference")
  if pref=="MONSTER"then table.insert(preferred,p)
  elseif pref=="SURVIVOR"then table.insert(survivorPreferred,p)
  else table.insert(neutral,p)end
 end

 local selected={}
 if #h==1 then
  local only=h[1]
  if only:GetAttribute("SoloRole")=="MONSTER"or only:GetAttribute("MonsterPreference")=="MONSTER"then selected[only]=true end
  lastMonsterIds={}
  for player in pairs(selected)do lastMonsterIds[player.UserId]=true end
  return selected
 end

 local monsterSlots=C.MonsterSlots or 4
 local survivorSlots=C.SurvivorSlots or 4
 local targetRealMonsters=math.min(monsterSlots,math.max(1,#h-survivorSlots))
 local count=0

 local function candidates(pool,avoidPrevious)
  local out={}
  for _,player in ipairs(pool)do
   if not selected[player]and(not avoidPrevious or not lastMonsterIds[player.UserId])then table.insert(out,player)end
  end
  return out
 end
 local function pickFromPools(avoidPrevious)
  for _,pool in ipairs({preferred,neutral,survivorPreferred})do
   local list=candidates(pool,avoidPrevious)
   if #list>0 then return weightPick(list)end
  end
  return nil
 end

 while count<targetRealMonsters do
  local pick=pickFromPools(true)
  if not pick then break end
  selected[pick]=true;count+=1
 end
 while count<targetRealMonsters do
  local pick=pickFromPools(false)
  if not pick then break end
  selected[pick]=true;count+=1
 end

 lastMonsterIds={}
 for player in pairs(selected)do lastMonsterIds[player.UserId]=true end
 return selected
end
local function clearRoleVisual(p)
 local c=p.Character;if not c then return end
 for _,d in ipairs(c:GetDescendants())do if d.Name=="RoleVisual"or d:GetAttribute("MonsterCostume")==true then d:Destroy()end end
 local old=c:FindFirstChild("RoleHighlight");if old then old:Destroy()end
end
local function costumePart(character,base,name,size,offset,color,material,shape)
 local x=Instance.new("Part");x.Name=name;x:SetAttribute("MonsterCostume",true);x.Size=size;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic;x.CanCollide=false;x.CanTouch=false;x.Massless=true
 if shape then x.Shape=shape end;x.CFrame=base.CFrame*CFrame.new(offset);x.Parent=character
 local w=Instance.new("WeldConstraint");w.Part0=base;w.Part1=x;w.Parent=x;return x
end
local function applyClassicCostume(character,id)
 local torso=character:FindFirstChild("HumanoidRootPart")or character:FindFirstChild("UpperTorso")or character:FindFirstChild("Torso")
 local head=character:FindFirstChild("Head")or torso;if not torso or not head then return end
 if id=="DRACULA"then
  costumePart(character,torso,"Cape",Vector3.new(5.2,6,.35),Vector3.new(0,0,1.8),Color3.fromRGB(25,14,21),Enum.Material.Fabric)
  costumePart(character,torso,"Collar",Vector3.new(5.6,1,1),Vector3.new(0,2.2,.5),Color3.fromRGB(112,18,38),Enum.Material.Fabric)
  costumePart(character,head,"FangL",Vector3.new(.22,.7,.22),Vector3.new(-.38,-.45,-.72),Color3.fromRGB(248,248,238))
  costumePart(character,head,"FangR",Vector3.new(.22,.7,.22),Vector3.new(.38,-.45,-.72),Color3.fromRGB(248,248,238))
 elseif id=="FRANKENSTEIN"then
  costumePart(character,head,"FrankenBrow",Vector3.new(2.5,.45,.45),Vector3.new(0,.55,-.65),Color3.fromRGB(54,60,52),Enum.Material.SmoothPlastic)
  costumePart(character,head,"BoltL",Vector3.new(.4,.4,1.2),Vector3.new(-1.35,-.15,0),Color3.fromRGB(158,164,164),Enum.Material.Metal)
  costumePart(character,head,"BoltR",Vector3.new(.4,.4,1.2),Vector3.new(1.35,-.15,0),Color3.fromRGB(158,164,164),Enum.Material.Metal)
  costumePart(character,torso,"Shoulders",Vector3.new(6,1.1,2.2),Vector3.new(0,1.2,0),Color3.fromRGB(70,82,67),Enum.Material.Metal)
 elseif id=="WEREWOLF"then
  local earL=costumePart(character,head,"WolfEarL",Vector3.new(.9,1.8,.8),Vector3.new(-.8,1.5,0),Color3.fromRGB(96,69,53));earL.Shape=Enum.PartType.Wedge
  local earR=costumePart(character,head,"WolfEarR",Vector3.new(.9,1.8,.8),Vector3.new(.8,1.5,0),Color3.fromRGB(96,69,53));earR.Shape=Enum.PartType.Wedge
  costumePart(character,head,"WolfMuzzle",Vector3.new(1.8,1,1.8),Vector3.new(0,-.1,-1),Color3.fromRGB(122,90,67),Enum.Material.SmoothPlastic)
 elseif id=="MUMMY"then
  for i=-2,2 do costumePart(character,torso,"Bandage"..i,Vector3.new(4.2,.52,2.15),Vector3.new(0,i*.62,0),i%2==0 and Color3.fromRGB(218,207,172)or Color3.fromRGB(190,180,149),Enum.Material.Fabric)end
  costumePart(character,head,"MummyWrap",Vector3.new(2.3,.55,2.3),Vector3.new(0,.25,0),Color3.fromRGB(209,197,161),Enum.Material.Fabric)
 elseif id=="GRIM_REAPER"then
  costumePart(character,torso,"ReaperCloak",Vector3.new(5.3,6,2.6),Vector3.new(0,0,.3),Color3.fromRGB(24,21,31),Enum.Material.Fabric)
  costumePart(character,head,"ReaperHood",Vector3.new(3.3,3.3,3.3),Vector3.new(0,.35,0),Color3.fromRGB(21,18,28),Enum.Material.Fabric,Enum.PartType.Ball)
  costumePart(character,torso,"ScytheStaff",Vector3.new(.4,7,.4),Vector3.new(3,0,0),Color3.fromRGB(74,63,54),Enum.Material.Wood)
  costumePart(character,torso,"ScytheBlade",Vector3.new(.5,3.2,2.3),Vector3.new(3,3,-1),Color3.fromRGB(189,195,202),Enum.Material.Metal)
 end
end
local function applyRoleVisual(p,r)
 clearRoleVisual(p);local c=p.Character;if not c then return end
 local hi=Instance.new("Highlight");hi.Name="RoleHighlight";hi.FillTransparency=.86;hi.OutlineTransparency=.42;hi.Parent=c
 if r=="MONSTER"then
  local currentForm=form(p);local mf=Style.Monsters[currentForm.Id]or Style.Monsters.DRACULA;hi.FillColor=mf.Color;hi.OutlineColor=mf.Accent
  applyClassicCostume(c,currentForm.Id)
  local head=c:FindFirstChild("Head")or root(p)
  if head then
   local g=Instance.new("BillboardGui");g.Name="RoleVisual";g.Size=UDim2.fromOffset(150,34);g.StudsOffset=Vector3.new(0,3.8,0);g.AlwaysOnTop=true;g.Parent=head
   local t=Instance.new("TextLabel");t.Size=UDim2.fromScale(1,1);t.BackgroundTransparency=1;t.TextScaled=true;t.Text=mf.Label;t.TextColor3=mf.Accent;t.TextStrokeTransparency=.25;t.Parent=g
  end
 else hi.FillColor=Style.Survivor;hi.OutlineColor=Color3.fromRGB(166,205,219)end
end
local function groundedRootTarget(p,pos)
 local c=p.Character;local r=root(p);local h=hum(p)
 if not c or not r or not h then return Vector3.new(pos.X,pos.Y,pos.Z)end
 local grounds={}
 if arena and arena.Parent then
  for _,d in ipairs(arena:GetDescendants())do
   if d:IsA("BasePart")and d:GetAttribute("WalkableGround")==true then table.insert(grounds,d)end
  end
 end
 local params=RaycastParams.new()
 params.IgnoreWater=true
 local hit=nil
 if #grounds>0 then
  params.FilterType=Enum.RaycastFilterType.Include
  params.FilterDescendantsInstances=grounds
  hit=workspace:Raycast(Vector3.new(pos.X,pos.Y+10,pos.Z),Vector3.new(0,-24,0),params)
 else
  params.FilterType=Enum.RaycastFilterType.Exclude
  params.FilterDescendantsInstances={c}
  hit=workspace:Raycast(Vector3.new(pos.X,pos.Y+10,pos.Z),Vector3.new(0,-24,0),params)
 end
 local groundY=hit and hit.Position.Y or .5
 local standingOffset=math.max(1,tonumber(h.HipHeight)or 0)+(r.Size.Y*.5)
 return Vector3.new(pos.X,groundY+standingOffset+.03,pos.Z)
end
local function teleport(p,pos)
 local r=root(p);if r then
  local target=groundedRootTarget(p,pos)
  movementGraceUntil[p]=os.clock()+1
  lastValidPosition[p]=target
  r.CFrame=CFrame.new(target)
  r.AssemblyLinearVelocity=Vector3.zero
  r.AssemblyAngularVelocity=Vector3.zero
  local h=hum(p)
  if h then
   h.PlatformStand=false;h.Sit=false;h.AutoRotate=true
   pcall(function()h:ChangeState(Enum.HumanoidStateType.GettingUp)end)
  end
 end
end
local function setRole(p,r)
 p:SetAttribute("Role",r);p:SetAttribute("Frozen",false)
 if r=="MONSTER"or r=="SURVIVOR"then p:SetAttribute("RoundTeam",r)end
 restoreMovement(p,r=="MONSTER"and 19 or 16);applyRoleVisual(p,r)
 tagGraceUntil[p]=os.clock()+6
end
local function active()
 local a={}
 for _,p in ipairs(Players:GetPlayers())do if p:GetAttribute("Role")=="SURVIVOR"then table.insert(a,{p=p})end end
 for _,b in ipairs(bots)do if b.role=="SURVIVOR"then table.insert(a,{b=b})end end
 return a
end
local function teamCounts()
 local humans,monsters=0,0
 for _,p in ipairs(Players:GetPlayers())do
  if p:GetAttribute("Role")=="SURVIVOR"then humans+=1 elseif p:GetAttribute("Role")=="MONSTER"then monsters+=1 end
 end
 for _,b in ipairs(bots)do if b.role=="SURVIVOR"then humans+=1 elseif b.role=="MONSTER"then monsters+=1 end end
 return humans,monsters
end
local function monsterPositions()
 local out={};local now=os.clock()
 for _,p in ipairs(Players:GetPlayers())do
  if p:GetAttribute("Role")=="MONSTER"and now>=(p:GetAttribute("InfectionReadyAt")or 0)then local r=root(p);if r then table.insert(out,r.Position)end end
 end
 for _,b in ipairs(bots)do if b.role=="MONSTER"and now>=(b.infectReadyAt or 0)then table.insert(out,b.part.Position)end end
 return out
end
local function nearestMonsterSource(pos)
 local best=math.huge;local sourcePlayer=nil;local sourceBot=nil;local now=os.clock()
 for _,player in ipairs(Players:GetPlayers())do
  if player:GetAttribute("Role")=="MONSTER"and now>=(player:GetAttribute("InfectionReadyAt")or 0)then
   local rr=root(player)
   if rr then local d=(rr.Position-pos).Magnitude;if d<best then best=d;sourcePlayer=player;sourceBot=nil end end
  end
 end
 for _,b in ipairs(bots)do
  if b.role=="MONSTER"and now>=(b.infectReadyAt or 0)then
   local d=(b.part.Position-pos).Magnitude
   if d<best then best=d;sourcePlayer=nil;sourceBot=b end
  end
 end
 return best,sourcePlayer,sourceBot
end
local function nearestMonsterDistance(pos)
 local best=nearestMonsterSource(pos)
 return best
end
local function awardContribution(player,amount)
 if not player or not player.Parent or state~="RUNNING"then return end
 local cap=(C.Reward and C.Reward.ContributionCapCoins)or 12
 local current=tonumber(player:GetAttribute("RoundContributionCoins"))or 0
 player:SetAttribute("RoundContributionCoins",math.min(cap,current+math.max(0,tonumber(amount)or 0)))
end
local function infectPlayer(p,sourcePlayer)
 if state~="RUNNING"or p:GetAttribute("Role")~="SURVIVOR"or os.clock()<(tagGraceUntil[p]or 0)then return false end
 p:SetAttribute("Infected",true);p:SetAttribute("InfectionReadyAt",os.clock()+2.5);setRole(p,"MONSTER")
 if sourcePlayer and sourcePlayer~=p then awardContribution(sourcePlayer,(C.Reward and C.Reward.InfectPlayerCoins)or 4)end
 p:SetAttribute("FeedbackEvent","INFECT:"..tostring(math.floor(os.clock()*1000)));return true
end
local function infectBot(b,sourcePlayer)
 if not b or b.role~="SURVIVOR"then return false end
 if b.visuals then for _,v in ipairs(b.visuals)do if v.part then v.part:Destroy()end end end
 b.role="MONSTER";b.part.Name="AI_MONSTER";b.part.Color=Color3.fromRGB(65,34,44);b.part.Material=Enum.Material.Fabric;b.speed=18;b.infectReadyAt=os.clock()+2.5
 b.visuals=decorateClassicMonster(b.part,"DRACULA")
 if sourcePlayer then awardContribution(sourcePlayer,(C.Reward and C.Reward.InfectAICoins)or 1)end
 return true
end
local function monsterPos()
 local list=monsterPositions();return list[1]
end
local function configure(h)
 clearBots()
 local realHumans,realMonsters=0,0
 for _,p in ipairs(h)do if p:GetAttribute("Role")=="MONSTER"then realMonsters+=1 elseif p:GetAttribute("Role")=="SURVIVOR"then realHumans+=1 end end
 local monsterNeed=math.max(0,(C.MonsterSlots or 4)-realMonsters)
 local humanNeed=math.max(0,(C.SurvivorSlots or 4)-realHumans)
 for i=1,monsterNeed do bot("MONSTER",monsterSpawn+Vector3.new((i-1)*6-(monsterNeed-1)*3,0,0))end
 for i=1,humanNeed do bot("SURVIVOR",survivorSpawns[((realHumans+i-1)%#survivorSpawns)+1])end
 local hc,mc=teamCounts();workspace:SetAttribute("ActivePopulation",hc+mc);workspace:SetAttribute("AIBotCount",#bots);workspace:SetAttribute("HumanCount",hc);workspace:SetAttribute("MonsterCount",mc)
end
local function startRound()
 local all=Players:GetPlayers();if #all==0 then return false end
 local h={}
 for i,p in ipairs(all)do if i<=C.TargetPopulation then table.insert(h,p)else setRole(p,"WAITING");p:SetAttribute("RoundState","SPECTATING")end end
 currentMapIndex=(currentMapIndex%#C.Maps)+1
 local map=C.Maps[currentMapIndex]
 local existing=workspace:FindFirstChild("MidnightArena")
 if existing and workspace:GetAttribute("MapReady")==true and workspace:GetAttribute("CurrentMapId")==map.Id then arena=existing else arena=ensureArena(map)end
 if not arena or workspace:GetAttribute("MapReady")~=true then arena=makeFallbackArena(map,"START_ROUND_NOT_READY")end
 local startingMonsters=selectStartingMonsters(h)
 objectiveState.round+=1;objectiveState.done=0;objectiveState.total=C.ObjectiveCount
 escapedPlayers={};workspace:SetAttribute("EscapeUnlocked",false);workspace:SetAttribute("SurvivorEscapeTriggered",false)
 local si,mi=1,1
 for _,p in ipairs(h)do
  p:SetAttribute("CurrentMap",map.Name);p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
  p:SetAttribute("ObjectivesDone",0);p:SetAttribute("ObjectivesTotal",C.ObjectiveCount);p:SetAttribute("Escaped",false);p:SetAttribute("Infected",false);p:SetAttribute("InfectionReadyAt",0);p:SetAttribute("RoundScore",0)
  p:SetAttribute("PurifyReadyAt",0);p:SetAttribute("DashReadyAt",0);p:SetAttribute("InfectReadyAt",0);p:SetAttribute("AbilityReadyAt",0);p:SetAttribute("Spectating",false)
  setEnergy(p,energyMax());p:SetAttribute("EnergyFeedback","")
  p:SetAttribute("RoundContributionCoins",0);p:SetAttribute("LastRoundBaseReward",0);p:SetAttribute("LastRoundWinBonus",0);p:SetAttribute("LastRoundContribution",0)
  p:SetAttribute("RoundParticipant",true)
  ghostSeenThisRound[p]={_count=0}
  p:SetAttribute("CelebrationName","");p:SetAttribute("CelebrationCaption","");p:SetAttribute("CelebrationWinner",false);p:SetAttribute("CelebrationComic",false)
  local role=startingMonsters[p]and"MONSTER"or"SURVIVOR";setRole(p,role);p:SetAttribute("RoundState","RUNNING")
  if role=="MONSTER"then teleport(p,monsterSpawn+Vector3.new((mi-1)*6,0,0));mi+=1 else teleport(p,survivorSpawns[((si-1)%#survivorSpawns)+1]);si+=1 end
 end
 configure(h)
 local startHumans,startMonsters=teamCounts();pressureLastCounts.SURVIVOR=startHumans;pressureLastCounts.MONSTER=startMonsters
 state="RUNNING";timeLeft=C.RoundSeconds;syncLobbyState("RUNNING");return true
end
local function chooseCelebration(winner)
 local pool=(C.Celebrations and C.Celebrations[winner])or(C.Celebrations and C.Celebrations.DRAW)or{}
 if #pool==0 then return{Id="DEFAULT",Name="팀 세레머니",Emote="cheer",ComicEmote="laugh",Caption="다음 판 준비"}end
 return pool[math.random(1,#pool)]
end
local function playCelebrationEmote(player,celebration,comic)
 local h=hum(player);if not h then return end
 local emote=comic and celebration.ComicEmote or celebration.Emote
 if typeof(emote)~="string"or emote==""then return end
 pcall(function()h:PlayEmote(emote)end)
end
local function animateCelebratingBots(winner,duration)
 local bases={}
 for _,b in ipairs(bots)do
  local wins=winner=="DRAW"or b.role==winner
  if wins and b.part and b.part.Parent then bases[b]={cf=b.part.CFrame,phase=math.random()*math.pi*2}end
 end
 if next(bases)==nil then return end
 task.spawn(function()
  local started=os.clock()
  while state=="RESULT"and os.clock()-started<duration do
   local t=os.clock()-started
   for b,row in pairs(bases)do
    if b.part and b.part.Parent then
     local hop=math.abs(math.sin(t*5+row.phase))*.45
     local yaw=math.rad(math.sin(t*4+row.phase)*12)
     b.part.CFrame=row.cf*CFrame.new(0,hop,0)*CFrame.Angles(0,yaw,0)
    end
   end
   task.wait(.06)
  end
 end)
end
local function endRound(winner)
 if state~="RUNNING"then return end;state="RESULT";syncLobbyState("RESULT")
 local celebration=chooseCelebration(winner)
 local celebrationPlayers={}
 for _,player in ipairs(Players:GetPlayers())do
  local team=player:GetAttribute("RoundTeam")or player:GetAttribute("Role")
  local participated=player:GetAttribute("RoundParticipant")==true
  if participated and(winner=="DRAW"or team==winner)then table.insert(celebrationPlayers,player)end
 end
 local comicPlayer=#celebrationPlayers>0 and celebrationPlayers[math.random(1,#celebrationPlayers)]or nil
 workspace:SetAttribute("CelebrationWinnerTeam",winner)
 workspace:SetAttribute("CelebrationName",celebration.Name or"팀 세레머니")
 workspace:SetAttribute("CelebrationCaption",celebration.Caption or"")
 local aiWinners=0
 for _,b in ipairs(bots)do if winner=="DRAW"or b.role==winner then aiWinners+=1 end end
 workspace:SetAttribute("CelebrationAIWinners",aiWinners)
 animateCelebratingBots(winner,math.max(1,(C.ResultSeconds or 6)-1))
 for _,p in ipairs(Players:GetPlayers())do
  local role=p:GetAttribute("Role");local team=p:GetAttribute("RoundTeam")or role
  local participated=p:GetAttribute("RoundParticipant")==true
  local m=team=="MONSTER";local win=(winner=="MONSTER"and m)or(winner=="SURVIVOR"and team=="SURVIVOR")
  local baseReward=participated and((C.Reward and C.Reward.ParticipationCoins)or 12)or 0
  local winBonus=participated and win and winner~="DRAW"and((C.Reward and C.Reward.WinBonusCoins)or 18)or 0
  local contribution=participated and math.min((C.Reward and C.Reward.ContributionCapCoins)or 12,tonumber(p:GetAttribute("RoundContributionCoins"))or 0)or 0
  local reward=baseReward+winBonus+contribution
  p:SetAttribute("Coins",(p:GetAttribute("Coins")or 0)+reward)
  p:SetAttribute("RoundScore",win and 1 or 0)
  p:SetAttribute("LastRoundReward",reward);p:SetAttribute("LastRoundWinner",winner);p:SetAttribute("LastRoundRole",team)
  p:SetAttribute("LastRoundBaseReward",baseReward);p:SetAttribute("LastRoundWinBonus",winBonus);p:SetAttribute("LastRoundContribution",contribution)
  p:SetAttribute("PurifyReadyAt",0);p:SetAttribute("DashReadyAt",0);p:SetAttribute("InfectReadyAt",0);p:SetAttribute("AbilityReadyAt",0);p:SetAttribute("Spectating",false)
  setEnergy(p,energyMax());p:SetAttribute("EnergyFeedback","")
  p:SetAttribute("CelebrationName",celebration.Name or"팀 세레머니");p:SetAttribute("CelebrationCaption",celebration.Caption or"")
  local celebrate=participated and(winner=="DRAW"or win)
  p:SetAttribute("CelebrationWinner",winner~="DRAW"and win);p:SetAttribute("CelebrationComic",celebrate and comicPlayer==p)
  if celebrate then playCelebrationEmote(p,celebration,comicPlayer==p)end
  p:SetAttribute("RoundParticipant",false)
  if m then p:SetAttribute("MonsterXP",(p:GetAttribute("MonsterXP")or 0)+(win and 40 or 18));p:SetAttribute("RoundsSinceMonster",0)
  elseif role=="SURVIVOR"then p:SetAttribute("RoundsSinceMonster",(p:GetAttribute("RoundsSinceMonster")or 0)+1)end
  p:SetAttribute("RoundState","RESULT_"..winner);p:SetAttribute("FeedbackEvent","RESULT:"..winner..":"..tostring(math.floor(os.clock()*1000)));p:SetAttribute("Frozen",false);p:SetAttribute("Escaped",false);p:SetAttribute("LobbySelectionConfirmed",false)
  if celebrate then speed(p,0)else speed(p,16)end
 end
 task.wait(C.ResultSeconds or 6)
 for _,p in ipairs(Players:GetPlayers())do
  p:SetAttribute("CelebrationWinner",false);p:SetAttribute("CelebrationComic",false);speed(p,16)
 end
 clearBots();monster=nil;monsterBot=nil;workspace:SetAttribute("HumanCount",0);workspace:SetAttribute("MonsterCount",0)
 workspace:SetAttribute("CelebrationWinnerTeam","");workspace:SetAttribute("CelebrationName","");workspace:SetAttribute("CelebrationCaption","");workspace:SetAttribute("CelebrationAIWinners",0)
end
local purifyCooldown={}
local function removeBot(target)
 for i=#bots,1,-1 do
  if bots[i]==target then
   local b=bots[i];if b.visuals then for _,v in ipairs(b.visuals)do if v.part then v.part:Destroy()end end end
   if b.part then b.part:Destroy()end;table.remove(bots,i);return true
  end
 end
 return false
end
local function eliminateMonsterPlayer(target)
 if not target or target:GetAttribute("Role")~="MONSTER"then return false end
 target:SetAttribute("Role","ELIMINATED");target:SetAttribute("Infected",false);target:SetAttribute("FeedbackEvent","PURIFIED:"..tostring(math.floor(os.clock()*1000)))
 clearRoleVisual(target);local h=hum(target);local r=root(target);if h then h.WalkSpeed=0;h.JumpPower=0;h.JumpHeight=0 end;if r then r.Anchored=true end
 return true
end
local function purify(p)
 if state~="RUNNING"or p:GetAttribute("Role")~="SURVIVOR"then return end
 local hf=humanForm(p);local now=os.clock();local cd=math.max(2,(C.PurifyCooldown or 5)+(hf.PurifyCooldownBonus or 0))
 local lastPurify=purifyCooldown[p]
 if lastPurify and now-lastPurify<cd then return end
 local r=root(p);if not r then return end
 local range=math.max(4,(C.PurifyDistance or 8)+(hf.PurifyRangeBonus or 0));local targetPlayer,targetBot,best=nil,nil,range
 for _,other in ipairs(Players:GetPlayers())do if other:GetAttribute("Role")=="MONSTER"then local q=root(other);if q then local d=(q.Position-r.Position).Magnitude;if d<=best then best=d;targetPlayer=other;targetBot=nil end end end end
 for _,b in ipairs(bots)do if b.role=="MONSTER"then local d=(b.part.Position-r.Position).Magnitude;if d<=best then best=d;targetBot=b;targetPlayer=nil end end end
 if not targetPlayer and not targetBot then p:SetAttribute("EnergyFeedback","NO_TARGET:PURIFY");return end
 if not spendEnergy(p,C.Energy and C.Energy.PurifyCost or 35,"PURIFY")then return end
 purifyCooldown[p]=now;p:SetAttribute("PurifyReadyAt",workspace:GetServerTimeNow()+cd)
 if targetPlayer then
  if eliminateMonsterPlayer(targetPlayer)then awardContribution(p,(C.Reward and C.Reward.PurifyPlayerCoins)or 4);p:SetAttribute("FeedbackEvent","PURIFY_HIT:"..tostring(math.floor(os.clock()*1000)))end
 elseif targetBot then
  if removeBot(targetBot)then awardContribution(p,(C.Reward and C.Reward.PurifyAICoins)or 1);p:SetAttribute("FeedbackEvent","PURIFY_HIT:"..tostring(math.floor(os.clock()*1000)))end
 end
end
local function survivorDash(p)
 if state~="RUNNING"or p:GetAttribute("Role")~="SURVIVOR"then return end
 local hf=humanForm(p);local now=os.clock();local cd=math.max(3,C.SurvivorDashCooldown+(hf.DashCooldownBonus or 0))
 -- First use must not inherit server uptime as cooldown; only an actual prior dash starts it. Studio actual-play validates the resulting movement.
 local lastDash=dashCooldown[p]
 if lastDash and now-lastDash<cd then return end
 local r=root(p);if r then
  if not spendEnergy(p,C.Energy and C.Energy.DashCost or 25,"DASH")then return end
  dashCooldown[p]=now;p:SetAttribute("DashReadyAt",workspace:GetServerTimeNow()+cd)
  movementGraceUntil[p]=now+.7
  r.AssemblyLinearVelocity=r.CFrame.LookVector*(52+(hf.DashPowerBonus or 0))+Vector3.new(0,r.AssemblyLinearVelocity.Y,0)
  p:SetAttribute("FeedbackEvent","DASH:"..tostring(math.floor(now*1000)))
 end
end
local function ability(p)
 if state~="RUNNING"or p:GetAttribute("Role")~="MONSTER"then return end
 local now=os.clock();local lastAbility=cooldown[p];if lastAbility and now-lastAbility<C.MonsterAbilityCooldown then return end
 local r=root(p);if not r then return end
 if not spendEnergy(p,C.Energy and C.Energy.AbilityCost or 45,"ABILITY")then return end
 cooldown[p]=now;p:SetAttribute("AbilityReadyAt",workspace:GetServerTimeNow()+C.MonsterAbilityCooldown)
 local f=form(p);movementGraceUntil[p]=now+.8
 local infectedAbility=p:GetAttribute("Infected")==true and humanForm(p).InfectedAbility or nil
 if infectedAbility=="RUSH"or infectedAbility=="BREACH"then r.AssemblyLinearVelocity=r.CFrame.LookVector*82+Vector3.new(0,r.AssemblyLinearVelocity.Y,0)
 elseif infectedAbility=="BLACKOUT"or infectedAbility=="HUNT_FLASH"or infectedAbility=="FALSE_ALARM"then
  for _,o in ipairs(Players:GetPlayers())do if o:GetAttribute("Role")=="SURVIVOR"then local q=root(o);if q and(q.Position-r.Position).Magnitude<=24 then speed(o,10);task.delay(2.5,function()if o.Parent and o:GetAttribute("Role")=="SURVIVOR"then speed(o,16)end end)end end end
 elseif f.Ability=="BAT_DASH"then r.AssemblyLinearVelocity=r.CFrame.LookVector*70+Vector3.new(0,r.AssemblyLinearVelocity.Y,0)
 elseif f.Ability=="POWER_CHARGE"then r.AssemblyLinearVelocity=r.CFrame.LookVector*85+Vector3.new(0,4,0)
 elseif f.Ability=="RAGE_RUN"then speed(p,28);task.delay(3,function()if p.Parent and p:GetAttribute("Role")=="MONSTER"then speed(p,19)end end)
 elseif f.Ability=="CURSE_SLOW"then
  for _,o in ipairs(Players:GetPlayers())do if o:GetAttribute("Role")=="SURVIVOR"and o:GetAttribute("Frozen")~=true then local q=root(o);if q and(q.Position-r.Position).Magnitude<=22 then speed(o,9);task.delay(3,function()if o.Parent and o:GetAttribute("Frozen")~=true then speed(o,16)end end)end end end
 elseif f.Ability=="SHADOW_STEP"then r.CFrame=r.CFrame+r.CFrame.LookVector*18 end
end
local function infectAttack(p)
 if state~="RUNNING"or p:GetAttribute("Role")~="MONSTER"then return end
 local now=os.clock();local cd=math.max(.4,tonumber(C.Energy and C.Energy.InfectAttackCooldown)or 1.2)
 local last=infectAttackCooldown[p];if last and now-last<cd then return end
 if now<(p:GetAttribute("InfectionReadyAt")or 0)then return end
 local r=root(p);if not r then return end
 local range=math.max(2,tonumber(C.Energy and C.Energy.InfectRange)or 8)
 local targetPlayer,targetBot,best=nil,nil,range
 for _,other in ipairs(Players:GetPlayers())do
  if other:GetAttribute("Role")=="SURVIVOR"and os.clock()>=(tagGraceUntil[other]or 0)then
   local q=root(other)
   if q then
    local delta=q.Position-r.Position;local d=delta.Magnitude
    if d<=best and d>.001 and r.CFrame.LookVector:Dot(delta.Unit)>=.05 then best=d;targetPlayer=other;targetBot=nil end
   end
  end
 end
 for _,b in ipairs(bots)do
  if b.role=="SURVIVOR"then
   local delta=b.part.Position-r.Position;local d=delta.Magnitude
   if d<=best and d>.001 and r.CFrame.LookVector:Dot(delta.Unit)>=.05 then best=d;targetBot=b;targetPlayer=nil end
  end
 end
 if not targetPlayer and not targetBot then p:SetAttribute("EnergyFeedback","NO_TARGET:INFECT");return end
 if not spendEnergy(p,C.Energy and C.Energy.InfectAttackCost or 30,"INFECT")then return end
 infectAttackCooldown[p]=now;p:SetAttribute("InfectReadyAt",workspace:GetServerTimeNow()+cd)
 local hit=targetPlayer and infectPlayer(targetPlayer,p)or infectBot(targetBot,p)
 if hit then p:SetAttribute("FeedbackEvent","INFECT_ATTACK_HIT:"..tostring(math.floor(now*1000)))end
end

local function nextMonster(p)
 if state=="RUNNING"then return end
 local xp=p:GetAttribute("MonsterXP")or 0;local cur=legacyMonsterIds[p:GetAttribute("MonsterForm")or"DRACULA"]or(p:GetAttribute("MonsterForm")or"DRACULA");local idx=1
 for i,f in ipairs(C.MonsterForms)do if f.Id==cur then idx=i end end
 for n=1,#C.MonsterForms do local j=((idx+n-1)%#C.MonsterForms)+1;local f=C.MonsterForms[j];if xp>=f.UnlockXP then p:SetAttribute("MonsterForm",f.Id);return end end
end
local function nextHuman(p)
 if state=="RUNNING"then return end
 local list=C.HumanForms or{};if #list==0 then return end
 local current=p:GetAttribute("HumanForm")or list[1].Id;local idx=1
 for i,f in ipairs(list)do if f.Id==current then idx=i end end
 p:SetAttribute("HumanForm",list[idx%#list+1].Id)
end
local function buyCosmetic(p,id)
 if state=="RUNNING"or typeof(id)~="string"or #id>32 then return end
 local item=cosmeticById[id];if not item then return end
 local owned=ownedCosmeticsFrom(p:GetAttribute("OwnedCosmetics"))
 if owned[id]then p:SetAttribute("CosmeticFeedback","OWNED:"..id);return end
 local price=math.max(0,math.floor(tonumber(item.Price)or 0))
 local coins=math.max(0,math.floor(tonumber(p:GetAttribute("Coins"))or 0))
 if coins<price then p:SetAttribute("CosmeticFeedback","NEED_COINS:"..id..":"..price);return end
 p:SetAttribute("Coins",coins-price);owned[id]=true
 p:SetAttribute("OwnedCosmetics",ownedCosmeticsAttribute(owned))
 p:SetAttribute("CosmeticFeedback","PURCHASED:"..id)
 save(p)
end
local function equipCosmetic(p,id)
 if state=="RUNNING"or typeof(id)~="string"or #id>32 then return end
 local item=cosmeticById[id];if not item then return end
 local owned=ownedCosmeticsFrom(p:GetAttribute("OwnedCosmetics"))
 if not owned[id]then p:SetAttribute("CosmeticFeedback","NOT_OWNED:"..id);return end
 p:SetAttribute("EquippedCosmetic",id);p:SetAttribute("CosmeticFeedback","EQUIPPED:"..id)
 save(p)
end
local function reportGhostSighting(p,id)
 if state~="RUNNING"or typeof(id)~="string"or #id>48 then return end
 local role=p:GetAttribute("Role");if role~="SURVIVOR"and role~="MONSTER"then return end
 local item=ghostById[id];if not item then return end
 if tostring(workspace:GetAttribute("CurrentMapId")or"")~=tostring(item.Map or"")then return end
 local trigger=arena and arena:FindFirstChild("GhostSighting_"..id,true)
 local rr=root(p)
 if not trigger or not trigger:IsA("BasePart")or not rr then return end
 local radius=math.max(3,tonumber(trigger:GetAttribute("GhostRadius"))or 11)+3
 if (rr.Position-trigger.Position).Magnitude>radius then return end

 local roundSeen=ghostSeenThisRound[p]or{_count=0};ghostSeenThisRound[p]=roundSeen
 if roundSeen[id]then p:SetAttribute("GhostFeedback","ROUND_SEEN:"..id);return end
 local cap=math.max(1,tonumber(C.GhostProgression and C.GhostProgression.MaxSightingsPerRound)or 2)
 if (tonumber(roundSeen._count)or 0)>=cap then p:SetAttribute("GhostFeedback","ROUND_CAP:"..tostring(cap));return end
 roundSeen[id]=true;roundSeen._count=(tonumber(roundSeen._count)or 0)+1

 local progress=ghostProgressFrom(p:GetAttribute("GhostProgress"))
 local maxStage=math.max(1,tonumber(C.GhostProgression and C.GhostProgression.MaxStage)or 3)
 local stage=tonumber(progress[id])or 0
 if stage<maxStage then
  stage+=1;progress[id]=stage;syncGhostAttributes(p,progress)
  p:SetAttribute("GhostFeedback","STAGE:"..id..":"..tostring(stage))
  local _,completed=ghostStats(progress)
  if completed>=#(C.GhostCatalog or{})and p:GetAttribute("GhostCatalogBonusClaimed")~=true then
   local bonus=math.max(0,math.floor(tonumber(C.GhostProgression and C.GhostProgression.FullCatalogContractBonus)or 1))
   p:SetAttribute("GhostContracts",(p:GetAttribute("GhostContracts")or 0)+bonus);p:SetAttribute("GhostCatalogBonusClaimed",true)
   p:SetAttribute("GhostFeedback","CATALOG_COMPLETE:"..id..":"..tostring(bonus))
  end
 else
  local fragments=(p:GetAttribute("GhostFragments")or 0)+math.max(0,math.floor(tonumber(C.GhostProgression and C.GhostProgression.DuplicateFragmentReward)or 1))
  local contracts=p:GetAttribute("GhostContracts")or 0
  local perContract=math.max(1,math.floor(tonumber(C.GhostProgression and C.GhostProgression.FragmentsPerContract)or 24))
  if fragments>=perContract then
   local gained=math.floor(fragments/perContract);fragments%=perContract;contracts+=gained
   p:SetAttribute("GhostFeedback","CONTRACT:"..id..":"..tostring(gained))
  else
   p:SetAttribute("GhostFeedback","DUPLICATE:"..id..":"..tostring(fragments))
  end
  p:SetAttribute("GhostFragments",fragments);p:SetAttribute("GhostContracts",contracts)
 end
 save(p)
end

local function validRemoteAction(p,a)
 if typeof(a)~="string"or allowedActions[a]~=true then return false end
 local now=os.clock()
 if now-(lastRequest[p]or 0)<C.RemoteMinInterval then return false end
 lastRequest[p]=now
 return true
end
local function broadcastMultiplayerSync(actor)
 local participants=Players:GetPlayers();local hc,mc=teamCounts()
 remote:FireAllClients("MULTIPLAYER_SYNC",{ActorUserId=actor and actor.UserId or 0,ParticipantCount=#participants,ActivePopulation=hc+mc,AICount=#bots,HumanCount=hc,MonsterCount=mc,TimeLeft=math.max(0,math.ceil(timeLeft)),RoundScore=actor and(actor:GetAttribute("RoundScore")or 0)or 0})
end
remote.OnServerEvent:Connect(function(p,a,value)
 if not validRemoteAction(p,a)then return end
 if a==C.Actions.PREFER_MONSTER and state~="RUNNING"then
  p:SetAttribute("MonsterPreference","MONSTER");p:SetAttribute("SoloRole","MONSTER");p:SetAttribute("LobbySelectionConfirmed",true);if #Players:GetPlayers()==1 then soloStartRequested=true end
 elseif a==C.Actions.PREFER_SURVIVOR and state~="RUNNING"then
  p:SetAttribute("MonsterPreference","SURVIVOR");p:SetAttribute("SoloRole","SURVIVOR");p:SetAttribute("LobbySelectionConfirmed",true);if #Players:GetPlayers()==1 then soloStartRequested=true end
 elseif a==C.Actions.SOLO_MONSTER and #Players:GetPlayers()==1 and state~="RUNNING"then p:SetAttribute("MonsterPreference","MONSTER");p:SetAttribute("SoloRole","MONSTER");p:SetAttribute("LobbySelectionConfirmed",true);soloStartRequested=true
 elseif a==C.Actions.SOLO_SURVIVOR and #Players:GetPlayers()==1 and state~="RUNNING"then p:SetAttribute("MonsterPreference","SURVIVOR");p:SetAttribute("SoloRole","SURVIVOR");p:SetAttribute("LobbySelectionConfirmed",true);soloStartRequested=true
 elseif a==C.Actions.PURIFY or a==C.Actions.RESCUE then purify(p)
 elseif a==C.Actions.DASH then survivorDash(p)
 elseif a==C.Actions.INFECT_ATTACK then infectAttack(p)
 elseif a==C.Actions.ABILITY then ability(p)
 elseif a==C.Actions.NEXT_MONSTER then nextMonster(p)
 elseif a==C.Actions.NEXT_HUMAN then nextHuman(p)
 elseif a==C.Actions.BUY_COSMETIC then buyCosmetic(p,value)
 elseif a==C.Actions.EQUIP_COSMETIC then equipCosmetic(p,value)
 elseif a==C.Actions.GHOST_SIGHTING_FOUND then reportGhostSighting(p,value)
 elseif a==C.Actions.CREATE_ROOM then createReservedRoom(p,value)
 elseif a==C.Actions.JOIN_ROOM_CODE then joinRoomByCode(p,value)
 elseif a==C.Actions.QUICK_JOIN_PUBLIC then quickJoinRoom(p,false)
 elseif a==C.Actions.QUICK_JOIN_FRIEND then quickJoinRoom(p,true)
 elseif a==C.Actions.START_ROOM then startRoomMatch(p)
 elseif a==C.Actions.LEAVE_ROOM then leaveReservedRoom(p)end
 if a==C.Actions.PURIFY or a==C.Actions.RESCUE or a==C.Actions.DASH or a==C.Actions.INFECT_ATTACK or a==C.Actions.ABILITY then foundationCheckpoint("CORE_LOOP_READY",p,{action=a})end
 broadcastMultiplayerSync(p)
end)

local function validateCharacterFoundation(p,c)
 local h=c:WaitForChild("Humanoid",10);local r=c:WaitForChild("HumanoidRootPart",10)
 if not h or not r then p:SetAttribute("FoundationFailure","CHARACTER_FOUNDATION_FAILURE");return end
 if not foundationSpawn or not foundationSpawn.Parent then p:SetAttribute("FoundationFailure","SPAWN_FOUNDATION_MISSING");return end
 h.PlatformStand=false;h.AutoRotate=true;r.Anchored=false;p.RespawnLocation=foundationSpawn
 local pos=r.Position
 if pos.X~=pos.X or pos.Y~=pos.Y or pos.Z~=pos.Z or math.abs(pos.X)==math.huge or math.abs(pos.Y)==math.huge or math.abs(pos.Z)==math.huge then p:SetAttribute("FoundationFailure","INVALID_ROOT_POSITION");return end
 foundationCheckpoint("CHARACTER_READY",p,{rootAnchored=r.Anchored,platformStand=h.PlatformStand,rootX=pos.X,rootY=pos.Y,rootZ=pos.Z})
 task.spawn(function()
  local deadline=os.clock()+3
  local params=RaycastParams.new();params.FilterType=Enum.RaycastFilterType.Exclude;params.FilterDescendantsInstances={c}
  repeat
   if not c.Parent or not r.Parent then return end
   local hit=workspace:Raycast(r.Position,Vector3.new(0,-14,0),params)
   if hit and h.FloorMaterial~=Enum.Material.Air then foundationCheckpoint("GROUND_CONTACT",p,{groundY=hit.Position.Y,rootY=r.Position.Y});return end
   task.wait(.1)
  until os.clock()>=deadline
  p:SetAttribute("FoundationFailure","GROUND_CONTACT_FAILURE")
 end)
end

local function onCharacter(p)
 task.wait(.1)
 local readyDeadline=os.clock()+10
 while workspace:GetAttribute("MapReady")~=true and os.clock()<readyDeadline do task.wait(.1)end
 local c=p.Character
 if c then validateCharacterFoundation(p,c)end
 if state=="RUNNING"then
  local role=p:GetAttribute("Role")
  if role=="MONSTER"or role=="SURVIVOR"then setRole(p,role);restoreMovement(p,role=="MONSTER"and 19 or 16)
  elseif role=="ELIMINATED"then local rr=root(p);if rr then rr.Anchored=true end end
 else
  -- 대기/방 브라우저에서도 모든 실제 캐릭터를 보이지 않는 SpawnLocation이 아니라 실제 바닥에 둔다.
  p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
  p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
  local players=Players:GetPlayers()
  table.sort(players,function(a,b)return a.UserId<b.UserId end)
  local slot=1
  for i,player in ipairs(players)do if player==p then slot=((i-1)%#survivorSpawns)+1;break end end
  teleport(p,survivorSpawns[slot])
 end
end
Players.PlayerAdded:Connect(function(p)
 load(p)
 p:SetAttribute("RoomFeedback","")
 adoptReservedRoomFromPlayer(p)
 if roomServer and #Players:GetPlayers()>roomMaxPlayers()then
  roomFeedback(p,"ERROR","방 정원 초과")
  task.defer(function()pcall(function()TeleportService:TeleportAsync(game.PlaceId,{p})end)end)
  return
 end
 p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
 p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
 if state=="RUNNING"then
  p:SetAttribute("Role","SPECTATING");p:SetAttribute("RoundState","SPECTATING");p:SetAttribute("Spectating",true);p:SetAttribute("TimeLeft",math.max(0,math.ceil(timeLeft)))
 end
 p.CharacterAdded:Connect(function()onCharacter(p)end)
 if p.Character then task.defer(function()onCharacter(p)end)end
 syncLobbyState()
end)
for _,p in ipairs(Players:GetPlayers())do
 load(p)
 p:SetAttribute("RoomFeedback","")
 adoptReservedRoomFromPlayer(p)
 p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
 p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
 p.CharacterAdded:Connect(function()onCharacter(p)end)
 if p.Character then task.defer(function()onCharacter(p)end)end
end
syncLobbyState()
qaCaptureRemote.OnServerEvent:Connect(function(p,label,value)
 if C.QACameraEnabled~=true then return end
 if typeof(label)~="string"or #label<1 or #label>48 then return end
 local raw=tostring(value or"")
 if #raw<1 or #raw>160 then return end
 local isStatus=label=="STATUS"
 if not isStatus and not raw:match("^%d+$")then return end
 local now=os.clock();if now-(qaCaptureLast[p]or 0)<.18 then return end;qaCaptureLast[p]=now
 local record={gameId=C.GameId,label=label,userId=p.UserId,capturedAt=os.time()}
 if isStatus then record.status=raw;record.kind="STATUS"else record.assetId=raw;record.kind="CAPTURE"end
 local ok=pcall(function()
  qaCaptureStore:UpdateAsync("latest",function(old)
   local data=typeof(old)=="table"and old or{captures={}}
   data.captures=typeof(data.captures)=="table"and data.captures or{}
   table.insert(data.captures,record)
   while #data.captures>30 do table.remove(data.captures,1)end
   data.updatedAt=os.time();data.gameId=C.GameId
   return data
  end)
 end)
 if isStatus then p:SetAttribute("QALastCaptureStatus",raw)else p:SetAttribute("QALastCaptureAssetId",raw);p:SetAttribute("QALastCaptureLabel",label)end
 p:SetAttribute("QALastCaptureStored",ok)
end)

foundationRemote.OnServerEvent:Connect(function(p,name)
 if typeof(name)~="string"then return end
 if name=="REMOTE_PING"then foundationRemote:FireClient(p,"REMOTE_PONG");return end
 if name=="REMOTE_ROUNDTRIP"then foundationCheckpoint("REMOTE_ROUNDTRIP",p,{roundtrip=true});return end
 local now=os.clock();if now-(foundationLast[p]or 0)<.05 then return end;foundationLast[p]=now
 if name=="CAMERA_READY"or name=="INPUT_READY"then foundationCheckpoint(name,p,{clientReported=true})end
end)

Players.PlayerRemoving:Connect(function(p)
 local leavingRole=p:GetAttribute("Role")
 local leavingWasHost=roomServer and p.UserId==roomHostUserId
 local rr=root(p)
 local leavingPos=rr and rr.Position or(leavingRole=="MONSTER"and monsterSpawn or survivorSpawns[1])
 save(p);cooldown[p]=nil;dashCooldown[p]=nil;infectAttackCooldown[p]=nil;energyStationReady[p]=nil;ghostSeenThisRound[p]=nil;roomActionLast[p]=nil;roomJoinedAt[p]=nil;lastRequest[p]=nil;lastValidPosition[p]=nil;movementGraceUntil[p]=nil;movementProbeStart[p]=nil;foundationLast[p]=nil;qaCaptureLast[p]=nil;tagGraceUntil[p]=nil;purifyCooldown[p]=nil
 task.defer(function()
  if state=="RUNNING"and arena and arena.Parent and(leavingRole=="MONSTER"or leavingRole=="SURVIVOR")then
   bot(leavingRole,leavingPos)
   local hc,mc=teamCounts();workspace:SetAttribute("ActivePopulation",hc+mc);workspace:SetAttribute("AIBotCount",#bots);workspace:SetAttribute("HumanCount",hc);workspace:SetAttribute("MonsterCount",mc)
   for _,player in ipairs(Players:GetPlayers())do player:SetAttribute("HumanCount",hc);player:SetAttribute("MonsterCount",mc)end
   broadcastMultiplayerSync(nil)
  end
  if roomServer then
   local remaining=Players:GetPlayers()
   if #remaining==0 then
    removeRoomDirectoryEntry(roomCode)
   elseif leavingWasHost then
    table.sort(remaining,function(a,b)return(roomJoinedAt[a]or math.huge)<(roomJoinedAt[b]or math.huge)end)
    local nextHost=remaining[1]
    if nextHost then roomHostUserId=nextHost.UserId;roomHostName=nextHost.DisplayName;roomFeedback(nextHost,"HOST","방장이 되었어")end
   end
   syncRoomState();updateCurrentRoomDirectory()
  end
  syncLobbyState()
 end)
end)
game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)

-- 로비에서도 맵이 즉시 보여야 한다. 첫 라운드 전 학교 맵을 프리로드한다.
if not workspace:FindFirstChild("MidnightArena")then
 arena=ensureArena(C.Maps[1])
end
if not arena or workspace:GetAttribute("MapReady")~=true then
 arena=makeFallbackArena(C.Maps[1],"BOOT_NOT_READY")
end
for _,p in ipairs(Players:GetPlayers())do
 p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
 p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
end
syncLobbyState("WAITING")

task.spawn(function()
 while true do
  local players=Players:GetPlayers()
  if #players==0 then
   state="WAITING";roomStartRequested=false;syncLobbyState("WAITING");task.wait(1)
  elseif not roomServer then
   state="WAITING";roomStartRequested=false
   for _,p in ipairs(players)do p:SetAttribute("RoundState","ROOM_BROWSER");p:SetAttribute("TimeLeft",0)end
   syncLobbyState("ROOM_BROWSER")
   task.wait(.5)
  elseif roomCode==""then
   state="WAITING";roomStartRequested=false
   for _,p in ipairs(players)do p:SetAttribute("RoundState","ROOM_CONNECTING");p:SetAttribute("TimeLeft",0)end
   syncLobbyState("ROOM_CONNECTING")
   task.wait(.25)
  elseif not roomStartRequested then
   state="WAITING"
   for _,p in ipairs(players)do p:SetAttribute("RoundState","ROOM_WAITING");p:SetAttribute("TimeLeft",0)end
   syncLobbyState("ROOM_WAITING");updateCurrentRoomDirectory()
   task.wait(.25)
  else
   roomStartRequested=false;workspace:SetAttribute("RoomStartRequested",false)
   state="INTERMISSION";syncLobbyState("INTERMISSION");updateCurrentRoomDirectory()
   soloStartRequested=false
   for t=C.IntermissionSeconds,1,-1 do
    for _,p in ipairs(Players:GetPlayers())do p:SetAttribute("RoundState","INTERMISSION");p:SetAttribute("TimeLeft",t)end
    if #Players:GetPlayers()==1 and soloStartRequested then break end
    task.wait(1)
   end
   if startRound()then
    updateCurrentRoomDirectory()
    while state=="RUNNING"and timeLeft>0 do
     local humans,monsters=teamCounts();workspace:SetAttribute("HumanCount",humans);workspace:SetAttribute("MonsterCount",monsters)
     if humans==0 then endRound("MONSTER");break end
     if monsters==0 then endRound("SURVIVOR");break end

     local baseRegen=math.max(0,tonumber(C.Energy and C.Energy.RegenPerSecond)or 10)*.25
     for _,p in ipairs(Players:GetPlayers())do
      local role=p:GetAttribute("Role")
      if role=="SURVIVOR"or role=="MONSTER"then
       local pressure=pressurePassiveFor(role,humans,monsters)
       local mult=math.max(1,tonumber(pressure and pressure.RegenMultiplier)or 1)
       setEnergy(p,energyOf(p)+baseRegen*mult)
       p:SetAttribute("PressurePassive",pressure and tostring(pressure.Label or"열세 보정")or"")
      else
       p:SetAttribute("PressurePassive","")
      end
     end
     for _,b in ipairs(bots)do
      local pressure=pressurePassiveFor(b.role,humans,monsters)
      local mult=math.max(1,tonumber(pressure and pressure.RegenMultiplier)or 1)
      b.energy=math.clamp((tonumber(b.energy)or energyMax())+baseRegen*mult,0,energyMax())
     end

     if humans==1 and pressureLastCounts.SURVIVOR>1 then
      local row=pressurePassiveFor("SURVIVOR",humans,monsters);local bonus=math.max(0,tonumber(row and row.LastStandEnergy)or 0)
      if bonus>0 then
       for _,p in ipairs(Players:GetPlayers())do if p:GetAttribute("Role")=="SURVIVOR"then setEnergy(p,energyOf(p)+bonus);p:SetAttribute("EnergyFeedback","LAST_STAND:"..tostring(math.floor(bonus)))end end
       for _,b in ipairs(bots)do if b.role=="SURVIVOR"then b.energy=math.min(energyMax(),(b.energy or 0)+bonus)end end
      end
     end
     if monsters==1 and pressureLastCounts.MONSTER>1 then
      local row=pressurePassiveFor("MONSTER",humans,monsters);local bonus=math.max(0,tonumber(row and row.LastStandEnergy)or 0)
      if bonus>0 then
       for _,p in ipairs(Players:GetPlayers())do if p:GetAttribute("Role")=="MONSTER"then setEnergy(p,energyOf(p)+bonus);p:SetAttribute("EnergyFeedback","LAST_STAND:"..tostring(math.floor(bonus)))end end
       for _,b in ipairs(bots)do if b.role=="MONSTER"then b.energy=math.min(energyMax(),(b.energy or 0)+bonus)end end
      end
     end
     pressureLastCounts.SURVIVOR=humans;pressureLastCounts.MONSTER=monsters

     for _,p in ipairs(Players:GetPlayers())do p:SetAttribute("TimeLeft",math.ceil(timeLeft));p:SetAttribute("HumanCount",humans);p:SetAttribute("MonsterCount",monsters);p:SetAttribute("AliveCount",humans)end
     task.wait(.25);timeLeft-=.25
    end
    if state=="RUNNING"then endRound("DRAW")end
    roomStartRequested=false;workspace:SetAttribute("RoomStartRequested",false)
    syncRoomState();updateCurrentRoomDirectory()
  end
 end
end)

RunService.Heartbeat:Connect(function(dt)
 if state=="RUNNING"then
  for _,b in ipairs(bots)do
   b.motionClock=(b.motionClock or 0)+dt*(b.role=="MONSTER"and 7.5 or 9)
   if b.visuals then
    local bob=math.sin(b.motionClock*2)*.08
    local stride=math.sin(b.motionClock)
    for _,v in ipairs(b.visuals)do
     if v.part and v.part.Parent then
      local name=v.part.Name
      local pitch=0
      if string.find(name,"Arm")or string.find(name,"Claw")then pitch=math.rad(stride*18)
      elseif string.find(name,"LegL")then pitch=math.rad(stride*16)
      elseif string.find(name,"LegR")then pitch=math.rad(-stride*16)
      elseif name=="Cape"or name=="Cloak"then pitch=math.rad(4+stride*3)end
      local roleLean=b.role=="MONSTER"and math.rad(-5)or math.rad(-2)
      v.part.CFrame=b.part.CFrame*CFrame.new(v.offset+Vector3.new(0,bob,0))*CFrame.Angles(roleLean+pitch,0,0)*(v.rotation or CFrame.identity)
     end
    end
   end
   if b.role=="MONSTER"then
    local bestEntry,bestPos,bd=nil,nil,math.huge
    for _,a in ipairs(active())do
     local pos=a.p and(root(a.p)and root(a.p).Position)or(a.b and a.b.part.Position)
     if pos then local d=(pos-b.part.Position).Magnitude;if d<bd then bd=d;bestPos=pos;bestEntry=a end end
    end
    if bestPos then
     local infectRange=math.max(2,tonumber(C.Energy and C.Energy.InfectRange)or 8)
     local infectCost=math.max(0,tonumber(C.Energy and C.Energy.InfectAttackCost)or 30)
     local attackCd=math.max(.4,tonumber(C.Energy and C.Energy.InfectAttackCooldown)or 1.2)
     if bd<=infectRange and os.clock()>=(b.infectAttackReadyAt or 0)and(b.energy or 0)>=infectCost then
      b.energy=math.max(0,(b.energy or 0)-infectCost);b.infectAttackReadyAt=os.clock()+attackCd
      if bestEntry and bestEntry.p then infectPlayer(bestEntry.p,nil)elseif bestEntry and bestEntry.b then infectBot(bestEntry.b,nil)end
     else
      local d=Vector3.new(bestPos.X-b.part.Position.X,0,bestPos.Z-b.part.Position.Z)
      if d.Magnitude>.1 then
       local dir=d.Unit;local nextPos=b.part.Position+dir*math.min(d.Magnitude,b.speed*dt)
       b.part.CFrame=CFrame.lookAt(nextPos,nextPos+dir)
      end
     end
    end
   elseif b.role=="SURVIVOR"then
    local nearest,best=nil,math.huge
    for _,mpos in ipairs(monsterPositions())do local d=(b.part.Position-mpos).Magnitude;if d<best then best=d;nearest=mpos end end
    local purifyCost=math.max(0,tonumber(C.Energy and C.Energy.PurifyCost)or 35)
    if nearest and best<=C.PurifyDistance and os.clock()>=(b.purifyReadyAt or 0)and(b.energy or 0)>=purifyCost then
     local targetPlayer,targetBot=nil,nil;local targetDist=C.PurifyDistance
     for _,other in ipairs(Players:GetPlayers())do if other:GetAttribute("Role")=="MONSTER"then local rr=root(other);if rr then local dd=(rr.Position-b.part.Position).Magnitude;if dd<=targetDist then targetDist=dd;targetPlayer=other;targetBot=nil end end end end
     for _,otherBot in ipairs(bots)do if otherBot~=b and otherBot.role=="MONSTER"then local dd=(otherBot.part.Position-b.part.Position).Magnitude;if dd<=targetDist then targetDist=dd;targetBot=otherBot;targetPlayer=nil end end end
     if targetPlayer or targetBot then
      b.energy=math.max(0,(b.energy or 0)-purifyCost);b.purifyReadyAt=os.clock()+6
      if targetPlayer then eliminateMonsterPlayer(targetPlayer)elseif targetBot then removeBot(targetBot)end
     end
    elseif nearest and best<46 then
     local away=b.part.Position-nearest;local d=Vector3.new(away.X,0,away.Z)
     if d.Magnitude>.1 then
      local dir=d.Unit;local nextPos=b.part.Position+dir*b.speed*dt
      b.part.CFrame=CFrame.lookAt(nextPos,nextPos+dir)
     end
    end
   end
  end
 end

 movementGuardClock+=dt
 if movementGuardClock<.25 then return end
 movementGuardClock=0
 local now=os.clock()
 for _,p in ipairs(Players:GetPlayers())do
  local h=hum(p);local r=root(p)
  if h and r and h.MoveDirection.Magnitude>.05 then
   local start=movementProbeStart[p]
   if not start then movementProbeStart[p]=r.Position
   elseif (r.Position-start).Magnitude>=2 then foundationCheckpoint("MOVEMENT_CONFIRMED",p,{displacement=(r.Position-start).Magnitude});movementProbeStart[p]=nil end
  elseif h and h.MoveDirection.Magnitude<=.05 then movementProbeStart[p]=nil end
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
