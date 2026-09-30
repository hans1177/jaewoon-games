-- 파일명: roblox-games/horror-escape-room/server/Game.server.luau
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local DSS=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local Lighting=game:GetService("Lighting")
local AssetService=game:GetService("AssetService")
local TeleportService=game:GetService("TeleportService")
local MemoryStoreService=game:GetService("MemoryStoreService")
local TweenService=game:GetService("TweenService")

-- 서버 부팅 첫 프레임부터 실제 로비 좌표에 SpawnLocation을 둔다.
-- 동적 로비 생성 전 Roblox 기본 공중 스폰이 노출되는 것을 막는다.
local lobbyBootstrapSpawn=workspace:FindFirstChild("LobbyBootstrapSpawn")
if not lobbyBootstrapSpawn or not lobbyBootstrapSpawn:IsA("SpawnLocation")then
 if lobbyBootstrapSpawn then lobbyBootstrapSpawn:Destroy()end
 lobbyBootstrapSpawn=Instance.new("SpawnLocation")
 lobbyBootstrapSpawn.Name="LobbyBootstrapSpawn"
 lobbyBootstrapSpawn.Size=Vector3.new(18,.2,18)
 lobbyBootstrapSpawn.Position=Vector3.new(0,.55,270)
 lobbyBootstrapSpawn.Anchored=true
 lobbyBootstrapSpawn.Neutral=true
 lobbyBootstrapSpawn.Transparency=1
 lobbyBootstrapSpawn.CanCollide=true
 lobbyBootstrapSpawn.CanTouch=false
 lobbyBootstrapSpawn.CanQuery=true
 lobbyBootstrapSpawn.Duration=0
 lobbyBootstrapSpawn.Parent=workspace
end
local function bootstrapLobbyCharacter(player,character)
 if workspace:GetAttribute("LobbyPhase")=="RUNNING"or workspace:GetAttribute("RoomState")=="RUNNING"then return end
 player.RespawnLocation=lobbyBootstrapSpawn
 task.defer(function()
  local rootPart=character and character:WaitForChild("HumanoidRootPart",5)
  local humanoid=character and character:WaitForChild("Humanoid",5)
  if not rootPart or not humanoid or not character.Parent then return end
  if workspace:GetAttribute("LobbyPhase")=="RUNNING"or workspace:GetAttribute("RoomState")=="RUNNING"then return end
  character:PivotTo(CFrame.lookAt(Vector3.new(0,3.7,270),Vector3.new(0,3.7,210)))
  rootPart.AssemblyLinearVelocity=Vector3.zero
  rootPart.AssemblyAngularVelocity=Vector3.zero
  humanoid.PlatformStand=false;humanoid.Sit=false;humanoid.AutoRotate=true
 end)
end
local function bindBootstrapLobbySpawn(player)
 player.RespawnLocation=lobbyBootstrapSpawn
 player.CharacterAdded:Connect(function(character)bootstrapLobbyCharacter(player,character)end)
 if player.Character then bootstrapLobbyCharacter(player,player.Character)end
end
Players.PlayerAdded:Connect(bindBootstrapLobbySpawn)
for _,player in ipairs(Players:GetPlayers())do bindBootstrapLobbySpawn(player)end

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
-- 로컬 플레이는 기존 단일 서버 방 흐름을 사용하고 온라인 방 저장소는 게시 서버에서만 연다.
local studioRoomFallback=RunService:IsStudio()
local roomDirectory
if not studioRoomFallback then
 roomDirectory=MemoryStoreService:GetSortedMap("midnight-infection-room-directory-v1")
end
local roomServer=game.PrivateServerId~=""and game.PrivateServerOwnerId==0
local roomCode=""
local roomHostUserId=0
local roomHostName=""
local roomVisibility="PUBLIC"
local roomSelectedMapId="SCHOOL"
local roomStartRequested=false
local roomActionLast={}
local roomJoinedAt={}
local roomExpectedCount=1
local roomFirstJoinAt=0
local roomTeleportPending={}
local lobbyQueueBays={}
local LOBBY_QUEUE_SECONDS=5
local LOBBY_QUEUE_MAX=8

local state="WAITING"
local timeLeft=0
local monster=nil
local monsterBot=nil
local lastMonsterIds={}
local bots={}
local botSequence=0
local cooldown={}
local dashCooldown={}
local infectAttackCooldown={}
local humanAbilityCooldown={}
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
local lobbySpawnLocation=lobbyBootstrapSpawn
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
local refreshPhysicalLobby=nil
local updateMatchBayLabel=nil

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
 local selectedMap=mapById(roomSelectedMapId)
 workspace:SetAttribute("RoomSelectedMapId",selectedMap.Id)
 workspace:SetAttribute("RoomSelectedMapName",selectedMap.Name)
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
  player:SetAttribute("RoomSelectedMapId",selectedMap.Id)
  player:SetAttribute("RoomSelectedMapName",selectedMap.Name)
 end
 if refreshPhysicalLobby then refreshPhysicalLobby()end
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
local function elevatorProfile(index)
 local list=C.Matchmaking and C.Matchmaking.Elevators or{}
 for _,row in ipairs(list)do if tonumber(row.Index)==tonumber(index)then return row end end
 return{Index=index,Label=tostring(index).."번",MinPlayers=1,MaxPlayers=LOBBY_QUEUE_MAX,Countdown=LOBBY_QUEUE_SECONDS}
end
local function mapById(id)
 local wanted=tostring(id or"")
 for _,map in ipairs(C.Maps or{})do if map.Id==wanted then return map end end
 return(C.Maps and C.Maps[1])or{Id="SCHOOL",Name="학교"}
end
local function setRoomDirectoryEntry(code,data)
 if not roomDirectory or code==""or typeof(data)~="table"then return false end
 local ok=pcall(function()roomDirectory:SetAsync(code,data,roomDirectoryExpiration(),os.time())end)
 return ok
end
local function getRoomDirectoryEntry(code)
 if not roomDirectory then return nil end
 local ok,data=pcall(function()return roomDirectory:GetAsync(code)end)
 if not ok or typeof(data)~="table"then return nil end
 return data
end
local function removeRoomDirectoryEntry(code)
 if not roomDirectory or code==""then return end
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
 if roomTeleportPending[p]then return true end
 roomTeleportPending[p]=true
 roomFeedback(p,"CONNECTING",record.code or"")
 local options=Instance.new("TeleportOptions")
 options.ReservedServerAccessCode=record.accessCode
 options:SetTeleportData({
  roomCode=record.code,
  roomHostUserId=record.hostUserId,
  roomHostName=record.hostName,
  roomVisibility=record.visibility,
  roomCreatedAt=record.createdAt,
  expectedMemberCount=math.max(1,tonumber(record.memberCount)or 1),
  selectedMapId=tostring(record.mapId or"SCHOOL"),
  selectedMapName=tostring(record.mapName or"학교"),
 })
 local ok,err=pcall(function()TeleportService:TeleportAsync(game.PlaceId,{p},options)end)
 if not ok then
  roomTeleportPending[p]=nil
  roomFeedback(p,"ERROR","방 연결 실패 · 다시 시도")
  warn("Room teleport failed",err)
  return false
 end
 roomFeedback(p,"TELEPORTING",record.code or"")
 task.delay(10,function()if p.Parent==Players then roomTeleportPending[p]=nil end end)
 return true
end
local function teleportPlayersToReservedRoom(players,record)
 if typeof(players)~="table"or #players==0 or typeof(record)~="table"or typeof(record.accessCode)~="string"or record.accessCode==""then return false end
 local valid={}
 for _,p in ipairs(players)do
  if p and p.Parent==Players and not roomTeleportPending[p]then table.insert(valid,p)end
 end
 if #valid==0 then return false end
 for _,p in ipairs(valid)do roomTeleportPending[p]=true;roomFeedback(p,"CONNECTING",record.code or"")end
 local options=Instance.new("TeleportOptions")
 options.ReservedServerAccessCode=record.accessCode
 options:SetTeleportData({
  roomCode=record.code,
  roomHostUserId=record.hostUserId,
  roomHostName=record.hostName,
  roomVisibility=record.visibility,
  roomCreatedAt=record.createdAt,
  expectedMemberCount=#valid,
  selectedMapId=tostring(record.mapId or"SCHOOL"),
  selectedMapName=tostring(record.mapName or"학교"),
 })
 local ok,err=pcall(function()TeleportService:TeleportAsync(game.PlaceId,valid,options)end)
 if not ok then
  for _,p in ipairs(valid)do
   roomTeleportPending[p]=nil
   roomFeedback(p,"ERROR","방 연결 실패 · 승강기에서 다시 시도")
  end
  warn("Room group teleport failed",err)
  return false
 end
 for _,p in ipairs(valid)do
  roomFeedback(p,"TELEPORTING",record.code or"")
  task.delay(10,function()if p.Parent==Players then roomTeleportPending[p]=nil end end)
 end
 return true
end

local function createQueuedReservedRoom(players,selectedMapId)
 if state=="RUNNING"or typeof(players)~="table"or #players==0 then return false end
 local selectedMap=mapById(selectedMapId)
 if studioRoomFallback then
  local host=players[1]
  roomServer=true;roomCode="000001";roomHostUserId=host.UserId;roomHostName=host.DisplayName;roomVisibility="PUBLIC";roomSelectedMapId=selectedMap.Id;roomStartRequested=true
  for _,p in ipairs(players)do roomJoinedAt[p]=os.clock();p:SetAttribute("LobbySelectionConfirmed",true);roomFeedback(p,"CREATED",roomCode)end
  workspace:SetAttribute("StudioRoomFallback",true)
  syncRoomState();syncLobbyState("INTERMISSION")
  return true
 end
 local code=createUniqueRoomCode()
 if not code then for _,p in ipairs(players)do roomFeedback(p,"ERROR","방 코드 생성 실패")end;return false end
 local ok,accessCode=pcall(function()return TeleportService:ReserveServerAsync(game.PlaceId)end)
 if not ok or typeof(accessCode)~="string"or accessCode==""then for _,p in ipairs(players)do roomFeedback(p,"ERROR","예약 서버 생성 실패")end;return false end
 local host=players[1]
 local record={
  code=code,accessCode=accessCode,hostUserId=host.UserId,hostName=host.DisplayName,
  visibility="PUBLIC",memberCount=#players,maxPlayers=roomMaxPlayers(),mapId=selectedMap.Id,mapName=selectedMap.Name,
  createdAt=os.time(),updatedAt=os.time(),state="WAITING",placeId=game.PlaceId,
 }
 if not setRoomDirectoryEntry(code,record)then for _,p in ipairs(players)do roomFeedback(p,"ERROR","방 등록 실패")end;return false end
 if not teleportPlayersToReservedRoom(players,record)then removeRoomDirectoryEntry(code);return false end
 return true
end
local function createReservedRoom(p,visibility)
 if roomServer or state=="RUNNING"or not roomActionReady(p)then return end
 if studioRoomFallback then
  roomServer=true;roomCode="000001";roomHostUserId=p.UserId;roomHostName=p.DisplayName;roomVisibility=normalizeRoomVisibility(visibility);roomStartRequested=true
  roomJoinedAt[p]=os.clock()
  workspace:SetAttribute("StudioRoomFallback",true)
  p:SetAttribute("LobbySelectionConfirmed",true);roomFeedback(p,"CREATED",roomCode);syncRoomState();syncLobbyState("INTERMISSION")
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
 if not roomDirectory then roomFeedback(p,"EMPTY","로컬 테스트는 승강기로 입장");return end
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
 if typeof(teleportData)~="table"then
  if roomCode==""then
   roomCode="R"..string.sub(tostring(game.PrivateServerId),-6)
   roomHostUserId=p.UserId
   roomHostName=p.DisplayName
   roomVisibility="PRIVATE"
   roomExpectedCount=1
   roomFirstJoinAt=os.clock()
   roomFeedback(p,"CONNECTED","예약 방 연결 복구")
  end
  roomJoinedAt[p]=os.clock()
  syncRoomState();syncLobbyState("ROOM_WAITING")
  return
 end
 local incomingCode=tostring(teleportData.roomCode or"")
 if incomingCode==""then
  incomingCode=roomCode~=""and roomCode or("R"..string.sub(tostring(game.PrivateServerId),-6))
 end
 if roomCode==""then
  roomCode=incomingCode
  roomHostUserId=tonumber(teleportData.roomHostUserId)or p.UserId
  roomHostName=tostring(teleportData.roomHostName or p.DisplayName)
  roomVisibility=normalizeRoomVisibility(teleportData.roomVisibility)
  roomSelectedMapId=mapById(teleportData.selectedMapId).Id
  roomExpectedCount=math.clamp(math.floor(tonumber(teleportData.expectedMemberCount)or 1),1,roomMaxPlayers())
  roomFirstJoinAt=os.clock()
 elseif roomCode~=incomingCode then
  warn("Room code mismatch recovered",roomCode,incomingCode,p.UserId)
  roomFeedback(p,"SYNC","기존 방에 안전하게 연결됨")
 end
 roomJoinedAt[p]=os.clock()
 p:SetAttribute("LobbySelectionConfirmed",true)
 roomFeedback(p,"CONNECTED",roomCode)
 syncRoomState()
 syncLobbyState("ROOM_WAITING")
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
local monsterSpawns={
 Vector3.new(-12,3,-54),Vector3.new(-4,3,-54),Vector3.new(4,3,-54),
 Vector3.new(12,3,-54),Vector3.new(-8,3,-42),Vector3.new(8,3,-42)
}
local function shuffledSpawns(source)
 local shuffled=table.clone(source)
 for i=#shuffled,2,-1 do
  local j=math.random(1,i)
  shuffled[i],shuffled[j]=shuffled[j],shuffled[i]
 end
 return shuffled
end
local lobbySpawns={
 Vector3.new(-21,3,270),Vector3.new(-7,3,270),Vector3.new(7,3,270),Vector3.new(21,3,270),
 Vector3.new(-21,3,258),Vector3.new(-7,3,258),Vector3.new(7,3,258),Vector3.new(21,3,258)
}
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
 p:SetAttribute("PurifyReadyAt",0);p:SetAttribute("DashReadyAt",0);p:SetAttribute("HumanAbilityReadyAt",0);p:SetAttribute("InfectReadyAt",0);p:SetAttribute("AbilityReadyAt",0);p:SetAttribute("Spectating",false)
 p:SetAttribute("FalseAlarmUntil",0);p:SetAttribute("BlackoutUntil",0);p:SetAttribute("HuntFlashUntil",0);p:SetAttribute("AbilityFeedback","");p:SetAttribute("HumanAbilityFeedback","");p:SetAttribute("RageUntil",0)
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
local function groundedRootTarget(p,pos)
 local c=p.Character;local r=root(p);local h=hum(p)
 if not c or not r or not h then return Vector3.new(pos.X,pos.Y,pos.Z)end
 local lobbyDestination=pos.Z>=180
 local rootFolders=lobbyDestination and{workspace:FindFirstChild("MidnightLobby")}or{arena}
 local grounds={}
 for _,rootFolder in ipairs(rootFolders)do
  if rootFolder and rootFolder.Parent then
   for _,d in ipairs(rootFolder:GetDescendants())do
    if d:IsA("BasePart")and d:GetAttribute("WalkableGround")==true then table.insert(grounds,d)end
   end
  end
 end
 local params=RaycastParams.new();params.IgnoreWater=true
 local hit=nil
 if #grounds>0 then
  params.FilterType=Enum.RaycastFilterType.Include
  params.FilterDescendantsInstances=grounds
  local rayTop=lobbyDestination and 24 or(pos.Y+16)
  local rayLength=lobbyDestination and 48 or 36
  hit=workspace:Raycast(Vector3.new(pos.X,rayTop,pos.Z),Vector3.new(0,-rayLength,0),params)
 else
  params.FilterType=Enum.RaycastFilterType.Exclude
  params.FilterDescendantsInstances={c}
  hit=workspace:Raycast(Vector3.new(pos.X,pos.Y+12,pos.Z),Vector3.new(0,-28,0),params)
 end
 local groundY=hit and hit.Position.Y or(lobbyDestination and .65 or .5)
 local standingOffset=math.max(1,tonumber(h.HipHeight)or 0)+(r.Size.Y*.5)
 local targetY=groundY+standingOffset+.03
 if lobbyDestination then targetY=math.clamp(targetY,3.1,4.4)end
 return Vector3.new(pos.X,targetY,pos.Z)
end
local function teleport(p,pos,lookAtPos)
 local c=p.Character
 local r=root(p);if r then
  local target=groundedRootTarget(p,pos)
  movementGraceUntil[p]=os.clock()+1
  lastValidPosition[p]=target
  local targetCFrame=CFrame.new(target)
  if typeof(lookAtPos)=="Vector3"then
   local flatLook=Vector3.new(lookAtPos.X,target.Y,lookAtPos.Z)
   if(flatLook-target).Magnitude>.1 then targetCFrame=CFrame.lookAt(target,flatLook)end
  end
  r.Anchored=false
  r.CFrame=targetCFrame
  r.AssemblyLinearVelocity=Vector3.zero
  r.AssemblyAngularVelocity=Vector3.zero
  local h=hum(p)
  if h then
   h.PlatformStand=false;h.Sit=false;h.AutoRotate=true
   pcall(function()h:ChangeState(Enum.HumanoidStateType.GettingUp)end)
  end
  task.defer(function()
   task.wait()
   local rr=root(p);local hh=hum(p)
   if p.Character~=c or rr~=r or not rr or not hh or not rr.Parent or lastValidPosition[p]~=target then return end
   local corrected=groundedRootTarget(p,pos)
   if math.abs(rr.Position.Y-corrected.Y)>.12 or hh.FloorMaterial==Enum.Material.Air then
    movementGraceUntil[p]=os.clock()+1
    lastValidPosition[p]=corrected
    local correctedCFrame=CFrame.new(corrected)
    if typeof(lookAtPos)=="Vector3"then
     local flatLook=Vector3.new(lookAtPos.X,corrected.Y,lookAtPos.Z)
     if(flatLook-corrected).Magnitude>.1 then correctedCFrame=CFrame.lookAt(corrected,flatLook)end
    end
    rr.Anchored=false
    rr.CFrame=correctedCFrame
    rr.AssemblyLinearVelocity=Vector3.zero
    rr.AssemblyAngularVelocity=Vector3.zero
    hh.PlatformStand=false;hh.Sit=false;hh.AutoRotate=true
   end
  end)
 end
end
-- 월드 생성 전용 지역 범위: 세 진입점만 외부 라운드 흐름에서 사용한다.
local makePhysicalLobby,makeFallbackArena,ensureArena
do
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


-- 실제 3D 로비: 메뉴 화면 대신 캐릭터가 걸어 다니며 단말을 직접 사용한다.
local function lobbyLabel(part,text,color)
 local gui=Instance.new("BillboardGui");gui.Name="LobbyLabel";gui.Size=UDim2.fromOffset(132,28);gui.StudsOffset=Vector3.new(0,3.6,0);gui.AlwaysOnTop=false;gui.MaxDistance=34;gui.Parent=part
 local label=Instance.new("TextLabel");label.Size=UDim2.fromScale(1,1);label.BackgroundTransparency=.38;label.BackgroundColor3=Color3.fromRGB(15,18,25);label.Text=text;label.TextColor3=color or Color3.fromRGB(235,240,248);label.TextScaled=false;label.TextSize=14;label.TextWrapped=false;label.Font=Enum.Font.GothamBold;label.Parent=gui
 return label
end

local function lobbySurfaceText(part,text,color,size)
 local gui=Instance.new("SurfaceGui");gui.Name="LobbySurfaceText";gui.Face=Enum.NormalId.Front;gui.AlwaysOnTop=false;gui.LightInfluence=.35;gui.SizingMode=Enum.SurfaceGuiSizingMode.PixelsPerStud;gui.PixelsPerStud=36;gui.Parent=part
 local label=Instance.new("TextLabel");label.Size=UDim2.fromScale(1,1);label.BackgroundTransparency=1;label.Text=text;label.TextColor3=color or Color3.fromRGB(235,240,248);label.TextSize=size or 22;label.TextScaled=true;label.TextStrokeTransparency=.76;label.Font=Enum.Font.GothamBold;label.Parent=gui
 return label
end

local function lobbyTerminal(parent,name,pos,labelText,actionText,color,onTriggered)
 local wood=color or Color3.fromRGB(62,43,34)
 local base=arenaPart(parent,name,Vector3.new(6.6,5.6,3.6),pos,wood,Enum.Material.WoodPlanks)
 base:SetAttribute("LobbyTerminal",true)
 local cap=arenaPart(parent,name.."Cap",Vector3.new(7.2,.55,4.1),pos+Vector3.new(0,3,0),Color3.fromRGB(112,80,48),Enum.Material.WoodPlanks);cap.CanCollide=false
 local brassFrame=arenaPart(parent,name.."BrassFrame",Vector3.new(5.4,3.15,.24),pos+Vector3.new(0,.55,-1.92),Color3.fromRGB(159,119,61),Enum.Material.Metal);brassFrame.CanCollide=false
 local screen=arenaPart(parent,name.."Screen",Vector3.new(4.7,2.5,.18),pos+Vector3.new(0,.55,-2.08),Color3.fromRGB(53,44,37),Enum.Material.SmoothPlastic);screen.CanCollide=false
 lobbySurfaceText(screen,labelText,Color3.fromRGB(225,206,169),17)
 local slot=arenaPart(parent,name.."KeySlot",Vector3.new(1.25,.18,.12),pos+Vector3.new(0,-1.5,-2.03),Color3.fromRGB(179,137,67),Enum.Material.Metal);slot.CanCollide=false
 local prompt=Instance.new("ProximityPrompt");prompt.Name=name.."Prompt";prompt.ObjectText=labelText;prompt.ActionText=actionText;prompt.HoldDuration=.18;prompt.MaxActivationDistance=9;prompt.RequiresLineOfSight=false;prompt.Parent=base
 prompt.Triggered:Connect(onTriggered)
 return base,prompt
end

local function lobbyLampPost(parent,pos)
 local pole=arenaPart(parent,"LobbyLampPost",Vector3.new(.65,9,.65),pos+Vector3.new(0,4.5,0),Color3.fromRGB(45,49,57),Enum.Material.Metal)
 local arm=arenaPart(parent,"LobbyLampArm",Vector3.new(3,.4,.4),pos+Vector3.new(1.2,8.65,0),Color3.fromRGB(45,49,57),Enum.Material.Metal)
 local lamp=arenaPart(parent,"LobbyStreetLight",Vector3.new(1.8,.35,1.2),pos+Vector3.new(2.4,8.3,0),Color3.fromRGB(232,209,145),Enum.Material.Neon);lamp.CanCollide=false
 glow(lamp,lamp.Color,22,1.15)
 pole.CastShadow=true;arm.CastShadow=true
end

local function lobbyBuilding(parent,name,pos,size,baseColor,windowColor)
 local body=arenaPart(parent,name,size,pos,baseColor,Enum.Material.Concrete)
 local floors=math.max(2,math.floor(size.Y/7))
 local cols=math.max(2,math.floor(size.X/10))
 local frontZ=pos.Z-(size.Z*.5)-.08
 for row=1,floors do
  for col=1,cols do
   if (row+col)%3~=0 then
    local wx=pos.X-size.X*.5+5+(col-1)*(size.X-10)/math.max(1,cols-1)
    local wy=pos.Y-size.Y*.5+4+(row-1)*(size.Y-8)/math.max(1,floors-1)
    local win=arenaPart(parent,name.."Window",Vector3.new(3.8,2.1,.18),Vector3.new(wx,wy,frontZ),windowColor,Enum.Material.Glass)
    win.Transparency=.22;win.CanCollide=false
   end
  end
 end
 local trim=arenaPart(parent,name.."RoofTrim",Vector3.new(size.X+1,.7,size.Z+1),pos+Vector3.new(0,size.Y*.5+.35,0),Color3.fromRGB(32,36,44),Enum.Material.Metal)
 trim.CastShadow=true
 return body
end

-- 로비 직원은 전투와 무관한 R15 연출 전용 NPC다.
local function lobbyStaff(parent,staffId,pos,lookAt,labelText,promptText,lines)
 local model=Instance.new("Model");model.Name="LobbyStaff_"..staffId;model.Parent=parent
 local facePoint=Vector3.new(lookAt.X,pos.Y,lookAt.Z)
 local rootCf=CFrame.lookAt(pos,facePoint)
 local root=Instance.new("Part");root.Name="StaffRoot";root.Size=Vector3.new(2.6,7,2.2);root.CFrame=rootCf*CFrame.new(0,3.5,0);root.Transparency=1
 root.Anchored=true;root.CanCollide=false;root.CanTouch=false;root.CanQuery=false;root.Parent=model;model.PrimaryPart=root

 local parts={}
 local function part(name,size,offset,color,material,shape,rotation,className)
  local p=Instance.new(className or"Part");p.Name=name;p.Size=size;p.Color=color;p.Material=material or Enum.Material.SmoothPlastic
  p.Anchored=true;p.CanCollide=false;p.CanTouch=false;p.CanQuery=false;p.CastShadow=true
  if shape and p:IsA("Part")then p.Shape=shape end
  p.CFrame=rootCf*CFrame.new(offset)*(rotation or CFrame.new())
  p.Parent=model;table.insert(parts,p);return p
 end
 local function cylinder(name,length,width,offset,color,material,tilt)
  return part(name,Vector3.new(length,width,width),offset,color,material,Enum.PartType.Cylinder,CFrame.Angles(0,0,math.rad(90+(tilt or 0))))
 end

 local black=Color3.fromRGB(18,17,19)
 local wine=Color3.fromRGB(80,18,25)
 local red=Color3.fromRGB(113,22,29)
 local brass=Color3.fromRGB(184,137,64)
 local ivory=Color3.fromRGB(216,205,189)
 local skin=staffId=="MAID"and Color3.fromRGB(190,181,177)or staffId=="BELLBOY"and Color3.fromRGB(202,185,166)or Color3.fromRGB(211,195,177)
 local head,smile,eyeL,eyeR

 if staffId=="CLERK"then
  -- 미스터 블랙: 비정상적으로 큰 키, 긴 팔다리, 좁은 어깨와 길게 찢어진 미소.
  part("Tailcoat",Vector3.new(2.35,4.8,1.15),Vector3.new(0,5.25,0),black,Enum.Material.Fabric)
  part("CoatTailL",Vector3.new(.92,3.8,.75),Vector3.new(-.52,1.75,.42),black,Enum.Material.Fabric,nil,CFrame.Angles(math.rad(-5),0,math.rad(3)))
  part("CoatTailR",Vector3.new(.92,3.8,.75),Vector3.new(.52,1.75,.42),black,Enum.Material.Fabric,nil,CFrame.Angles(math.rad(-5),0,math.rad(-3)))
  part("WineVest",Vector3.new(1.65,3.1,.16),Vector3.new(0,5.2,-.67),wine,Enum.Material.Fabric)
  part("ShirtFront",Vector3.new(.72,2.75,.12),Vector3.new(0,5.55,-.78),ivory,Enum.Material.Fabric)
  part("Tie",Vector3.new(.22,2.05,.11),Vector3.new(0,5.3,-.88),Color3.fromRGB(8,8,9),Enum.Material.Fabric)
  cylinder("LegL",3.7,.52,Vector3.new(-.42,-.85,0),black,Enum.Material.Fabric,0)
  cylinder("LegR",3.7,.52,Vector3.new(.42,-.85,0),black,Enum.Material.Fabric,0)
  cylinder("ArmL",4.35,.43,Vector3.new(-1.42,4.8,.04),black,Enum.Material.Fabric,4)
  cylinder("ArmR",4.35,.43,Vector3.new(1.42,4.8,.04),black,Enum.Material.Fabric,-4)
  part("GloveL",Vector3.new(.58,.78,.58),Vector3.new(-1.6,2.65,-.02),ivory,Enum.Material.Fabric,Enum.PartType.Ball)
  part("GloveR",Vector3.new(.58,.78,.58),Vector3.new(1.6,2.65,-.02),ivory,Enum.Material.Fabric,Enum.PartType.Ball)
  part("ShoeL",Vector3.new(.76,.42,1.35),Vector3.new(-.42,-2.8,-.28),Color3.fromRGB(7,7,8),Enum.Material.SmoothPlastic)
  part("ShoeR",Vector3.new(.76,.42,1.35),Vector3.new(.42,-2.8,-.28),Color3.fromRGB(7,7,8),Enum.Material.SmoothPlastic)
  part("LongNeck",Vector3.new(.46,2.35,.46),Vector3.new(0,8.55,0),skin,Enum.Material.SmoothPlastic)
  head=part("Head",Vector3.new(1.42,2.85,1.38),Vector3.new(0,10.35,-.02),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  part("SlickHair",Vector3.new(1.6,.6,1.45),Vector3.new(0,10.62,.12),Color3.fromRGB(19,16,16),Enum.Material.Fabric)
  eyeL=part("EyeL",Vector3.new(.12,.28,.1),Vector3.new(-.31,10.62,-.74),Color3.fromRGB(7,7,8),Enum.Material.SmoothPlastic)
  eyeR=part("EyeR",Vector3.new(.28,.11,.1),Vector3.new(.34,10.48,-.74),Color3.fromRGB(153,18,27),Enum.Material.Neon)
  smile=part("Smile",Vector3.new(1.55,.11,.09),Vector3.new(.08,9.72,-.77),Color3.fromRGB(132,8,18),Enum.Material.Neon)
  part("JawShadow",Vector3.new(1.22,.42,.1),Vector3.new(.08,9.48,-.75),Color3.fromRGB(36,10,14),Enum.Material.SmoothPlastic)
  for finger=1,3 do
   part("ExtraFingerL"..finger,Vector3.new(.11,.7,.11),Vector3.new(-1.78+(finger*.16),2.25,-.28),skin,Enum.Material.SmoothPlastic)
  end
  part("NamePlate",Vector3.new(.75,.24,.1),Vector3.new(.43,6.15,-.73),brass,Enum.Material.Metal)
 elseif staffId=="BELLBOY"then
  -- 토비: 작고 넓은 몸통, 큰 머리와 과장된 모자, 황동 장식이 많은 붉은 제복.
  part("BellboyBody",Vector3.new(3.25,3.05,1.65),Vector3.new(0,2.65,0),red,Enum.Material.Fabric)
  part("JacketFront",Vector3.new(2.45,2.5,.15),Vector3.new(0,2.75,-.89),Color3.fromRGB(132,27,35),Enum.Material.Fabric)
  part("GoldBelt",Vector3.new(3.35,.32,1.72),Vector3.new(0,1.45,0),brass,Enum.Material.Metal)
  cylinder("LegL",1.8,.75,Vector3.new(-.72,-.05,0),Color3.fromRGB(28,24,25),Enum.Material.Fabric,0)
  cylinder("LegR",1.8,.75,Vector3.new(.72,-.05,0),Color3.fromRGB(28,24,25),Enum.Material.Fabric,0)
  cylinder("ArmL",2.7,.7,Vector3.new(-1.8,2.45,0),red,Enum.Material.Fabric,-12)
  cylinder("ArmR",2.7,.7,Vector3.new(1.8,2.45,0),red,Enum.Material.Fabric,12)
  part("WhiteGloveL",Vector3.new(.76,.9,.76),Vector3.new(-2.08,1.1,-.04),ivory,Enum.Material.Fabric,Enum.PartType.Ball)
  part("WhiteGloveR",Vector3.new(.76,.9,.76),Vector3.new(2.08,1.1,-.04),ivory,Enum.Material.Fabric,Enum.PartType.Ball)
  part("ShoeL",Vector3.new(1,.45,1.35),Vector3.new(-.72,-1.15,-.22),Color3.fromRGB(10,10,11),Enum.Material.SmoothPlastic)
  part("ShoeR",Vector3.new(1,.45,1.35),Vector3.new(.72,-1.15,-.22),Color3.fromRGB(10,10,11),Enum.Material.SmoothPlastic)
  part("BellboyHump",Vector3.new(3.5,2.15,1.5),Vector3.new(0,3.25,1.15),Color3.fromRGB(87,19,27),Enum.Material.Fabric)
  head=part("Head",Vector3.new(3.05,2.75,2.65),Vector3.new(0,5.55,-.02),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  eyeL=part("EyeL",Vector3.new(.52,.48,.12),Vector3.new(-.58,5.78,-1.37),Color3.fromRGB(18,15,16),Enum.Material.SmoothPlastic)
  eyeR=part("EyeR",Vector3.new(.12,.17,.12),Vector3.new(.64,5.58,-1.38),Color3.fromRGB(194,35,44),Enum.Material.Neon)
  smile=part("Smile",Vector3.new(1.72,.2,.1),Vector3.new(.08,4.92,-1.42),Color3.fromRGB(111,16,24),Enum.Material.Neon)
  part("BellboyCheekL",Vector3.new(.62,.48,.12),Vector3.new(-.8,5.05,-1.36),Color3.fromRGB(159,111,98),Enum.Material.SmoothPlastic)
  part("BellboyCheekR",Vector3.new(.62,.48,.12),Vector3.new(.8,5.05,-1.36),Color3.fromRGB(159,111,98),Enum.Material.SmoothPlastic)
  part("HatBrim",Vector3.new(3.15,.3,2.65),Vector3.new(0,6.4,-.02),brass,Enum.Material.Metal)
  part("Hat",Vector3.new(2.55,1.15,2.25),Vector3.new(0,7.05,-.02),Color3.fromRGB(102,17,25),Enum.Material.Fabric)
  part("HatBand",Vector3.new(2.62,.22,2.32),Vector3.new(0,6.75,-.02),brass,Enum.Material.Metal)
  for y=2.1,3.35,.62 do part("Button"..tostring(y),Vector3.new(.2,.2,.12),Vector3.new(0,y,-.98),brass,Enum.Material.Metal,Enum.PartType.Ball)end
 elseif staffId=="MAID"then
  -- 메리: 긴 목과 팔, 좁은 상체, 바닥까지 떨어지는 검은 드레스와 그림자 얼굴.
  part("DressTorso",Vector3.new(1.75,3.5,1.15),Vector3.new(0,5,0),black,Enum.Material.Fabric)
  part("DressSkirt",Vector3.new(3.4,4.6,1.8),Vector3.new(0,1.1,.08),Color3.fromRGB(20,19,21),Enum.Material.Fabric)
  part("Apron",Vector3.new(1.8,4.5,.14),Vector3.new(0,2.35,-.98),Color3.fromRGB(195,190,182),Enum.Material.Fabric)
  cylinder("ArmL",4.5,.4,Vector3.new(-1.18,4.25,.05),black,Enum.Material.Fabric,-3)
  cylinder("ArmR",4.5,.4,Vector3.new(1.18,4.25,.05),black,Enum.Material.Fabric,3)
  part("HandL",Vector3.new(.48,.8,.48),Vector3.new(-1.35,1.98,-.02),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  part("HandR",Vector3.new(.48,.8,.48),Vector3.new(1.35,1.98,-.02),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  part("LongNeck",Vector3.new(.38,2.5,.38),Vector3.new(0,7.8,0),skin,Enum.Material.SmoothPlastic)
  head=part("Head",Vector3.new(1.5,2.55,1.5),Vector3.new(0,9.65,-.03),skin,Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  part("MaidHairCurtain",Vector3.new(1.7,3.15,.36),Vector3.new(0,9.2,-.62),Color3.fromRGB(25,22,24),Enum.Material.Fabric)
  part("FaceShadow",Vector3.new(1.22,1.05,.12),Vector3.new(0,9.68,-.83),Color3.fromRGB(22,19,21),Enum.Material.SmoothPlastic)
  eyeL=part("EyeL",Vector3.new(.12,.22,.09),Vector3.new(-.26,9.86,-.94),Color3.fromRGB(189,30,39),Enum.Material.Neon)
  eyeR=part("EyeR",Vector3.new(.05,.05,.07),Vector3.new(.31,9.72,-.94),Color3.fromRGB(5,5,6),Enum.Material.SmoothPlastic)
  smile=part("Smile",Vector3.new(.78,.07,.08),Vector3.new(-.08,9.25,-.95),Color3.fromRGB(92,14,20),Enum.Material.SmoothPlastic)
  part("MaidFingerL",Vector3.new(.1,1.25,.1),Vector3.new(-1.38,1.52,-.22),skin,Enum.Material.SmoothPlastic)
  part("MaidFingerR",Vector3.new(.1,1.25,.1),Vector3.new(1.38,1.52,-.22),skin,Enum.Material.SmoothPlastic)
  part("MaidCap",Vector3.new(2.05,.5,1.55),Vector3.new(0,9.9,.04),Color3.fromRGB(207,202,193),Enum.Material.Fabric)
  part("Collar",Vector3.new(1.6,.38,.15),Vector3.new(0,6.35,-.74),Color3.fromRGB(207,202,193),Enum.Material.Fabric)
  part("Ribbon",Vector3.new(.66,.66,.12),Vector3.new(0,5.95,-.82),wine,Enum.Material.Fabric,nil,CFrame.Angles(0,0,math.rad(45)))
 end

 local labelAnchor=part("StaffLabelAnchor",Vector3.new(.1,.1,.1),Vector3.new(0,staffId=="CLERK"and 12.3 or staffId=="BELLBOY"and 8.6 or 11,0),Color3.new(1,1,1),Enum.Material.SmoothPlastic)
 labelAnchor.Transparency=1
 local nameGui=Instance.new("BillboardGui");nameGui.Name="StaffLabel";nameGui.Size=UDim2.fromOffset(155,25);nameGui.AlwaysOnTop=false;nameGui.MaxDistance=22;nameGui.Parent=labelAnchor
 local nameLabel=Instance.new("TextLabel");nameLabel.Size=UDim2.fromScale(1,1);nameLabel.BackgroundTransparency=1;nameLabel.TextColor3=Color3.fromRGB(210,190,151);nameLabel.TextStrokeTransparency=.35;nameLabel.TextSize=11;nameLabel.Text=labelText;nameLabel.Font=Enum.Font.GothamBold;nameLabel.Parent=nameGui

 local speechAnchor=part("SpeechAnchor",Vector3.new(.1,.1,.1),Vector3.new(0,staffId=="CLERK"and 11.6 or staffId=="BELLBOY"and 7.9 or 10.4,0),Color3.new(1,1,1),Enum.Material.SmoothPlastic)
 speechAnchor.Transparency=1
 local speechGui=Instance.new("BillboardGui");speechGui.Name="StaffSpeech";speechGui.Size=UDim2.fromOffset(330,86);speechGui.StudsOffset=Vector3.new(0,1.25,0);speechGui.AlwaysOnTop=true;speechGui.MaxDistance=34;speechGui.Enabled=false;speechGui.Parent=speechAnchor
 local speechLabel=Instance.new("TextLabel");speechLabel.Size=UDim2.fromScale(1,1);speechLabel.BackgroundColor3=Color3.fromRGB(10,8,9);speechLabel.BackgroundTransparency=.03;speechLabel.TextColor3=Color3.fromRGB(238,225,199);speechLabel.TextSize=14;speechLabel.TextWrapped=true;speechLabel.Font=Enum.Font.GothamBold;speechLabel.Parent=speechGui
 local speechStroke=Instance.new("UIStroke");speechStroke.Color=staffId=="MAID"and Color3.fromRGB(133,28,34)or brass;speechStroke.Transparency=.25;speechStroke.Thickness=1.5;speechStroke.Parent=speechLabel
 local speechCorner=Instance.new("UICorner");speechCorner.CornerRadius=UDim.new(0,7);speechCorner.Parent=speechLabel

 local prompt=Instance.new("ProximityPrompt");prompt.Name="LobbyStaffPrompt";prompt.ObjectText=labelText;prompt.ActionText=promptText;prompt.HoldDuration=.08;prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=root
 local lineIndex,serial=0,0
 prompt.Triggered:Connect(function(player)
  local options=typeof(lines)=="table"and lines or{}
  if #options==0 then return end
  lineIndex=lineIndex%#options+1;serial+=1
  local token=serial;local line=tostring(options[lineIndex])
  speechLabel.Text=line;speechGui.Enabled=true
  player:SetAttribute("LobbyStoryEvent",labelText.."|"..line.."|"..tostring(math.floor(workspace:GetServerTimeNow()*1000)))
  local headBase=head.CFrame;local smileBase=smile.Size
  if staffId=="CLERK"then
   TweenService:Create(head,TweenInfo.new(.14,Enum.EasingStyle.Quad),{CFrame=headBase*CFrame.Angles(0,0,math.rad(26))}):Play()
   TweenService:Create(smile,TweenInfo.new(.16,Enum.EasingStyle.Back),{Size=Vector3.new(smileBase.X*1.85,smileBase.Y,smileBase.Z)}):Play()
  elseif staffId=="BELLBOY"then
   TweenService:Create(head,TweenInfo.new(.09,Enum.EasingStyle.Quad),{CFrame=headBase*CFrame.Angles(0,math.rad(48),math.rad(-8))}):Play()
  else
   TweenService:Create(head,TweenInfo.new(.2,Enum.EasingStyle.Sine),{CFrame=headBase*CFrame.Angles(math.rad(22),0,math.rad(-9))}):Play()
   eyeL.Size=Vector3.new(.28,.22,.09);eyeR.Size=Vector3.new(.28,.22,.09)
  end
  task.delay(.7,function()
   if head.Parent then TweenService:Create(head,TweenInfo.new(.24),{CFrame=headBase}):Play()end
   if smile.Parent then TweenService:Create(smile,TweenInfo.new(.24),{Size=smileBase}):Play()end
  end)
  task.delay(4.2,function()if serial==token and speechGui.Parent then speechGui.Enabled=false end end)
 end)

 -- 직원은 가만히 서 있어도 서로 다른 기괴한 습관을 보여 준다.
 task.spawn(function()
  local base=head.CFrame
  while model.Parent do
   task.wait(staffId=="BELLBOY"and 5.3 or staffId=="MAID"and 7.1 or 6.4)
   if not head.Parent then break end
   if staffId=="CLERK"then
    TweenService:Create(head,TweenInfo.new(.6,Enum.EasingStyle.Sine),{CFrame=base*CFrame.Angles(0,math.rad(10),math.rad(7))}):Play();task.wait(.8)
   elseif staffId=="BELLBOY"then
    TweenService:Create(head,TweenInfo.new(.08,Enum.EasingStyle.Linear),{CFrame=base*CFrame.Angles(0,math.rad(-38),0)}):Play();task.wait(.28)
   else
    TweenService:Create(head,TweenInfo.new(.9,Enum.EasingStyle.Sine),{CFrame=base*CFrame.Angles(math.rad(12),0,0)}):Play();task.wait(1.1)
   end
   if head.Parent then TweenService:Create(head,TweenInfo.new(.3,Enum.EasingStyle.Sine),{CFrame=base}):Play()end
  end
 end)
 return model
end

local function lobbyHauntTrigger(parent,name,pos,kind,radius,text)
 local trigger=arenaPart(parent,"LobbyHaunt_"..name,Vector3.new(1,1,1),pos,Color3.new(1,1,1),Enum.Material.SmoothPlastic)
 trigger.Transparency=1;trigger.CanCollide=false;trigger.CanTouch=false;trigger.CanQuery=false
 trigger:SetAttribute("LobbyHauntKind",kind);trigger:SetAttribute("LobbyHauntRadius",radius or 12);trigger:SetAttribute("LobbyHauntText",text or"")
 return trigger
end

-- 월드 로비: 오래된 심야 호텔 + 승강기형 자동 매칭.
makePhysicalLobby=function()
 local old=workspace:FindFirstChild("MidnightLobby");if old then old:Destroy()end
 local f=Instance.new("Folder");f.Name="MidnightLobby";f.Parent=workspace
 local flickerLights={}
 lobbySpawnLocation=lobbyBootstrapSpawn
 lobbySpawnLocation.Name="LobbySpawn"
 lobbySpawnLocation.Size=Vector3.new(18,.2,18)
 lobbySpawnLocation.Position=Vector3.new(0,.55,270)
 lobbySpawnLocation.Anchored=true
 lobbySpawnLocation.Neutral=true
 lobbySpawnLocation.Transparency=1
 lobbySpawnLocation.CanCollide=true
 lobbySpawnLocation.CanTouch=false
 lobbySpawnLocation.CanQuery=true
 lobbySpawnLocation.Parent=f

 -- 폐호텔 메인홀: 이동 범위를 의도적으로 좁혀 빈 광장 느낌을 없앤다.
 local floor=zoneFloor(f,"HotelLobbyFloor",Vector3.new(178,1.2,136),Vector3.new(0,.05,246),Color3.fromRGB(45,39,36),Enum.Material.Slate)
 floor:SetAttribute("PhysicalLobbyGround",true)
 local catch=arenaPart(f,"LobbySafetyCatch",Vector3.new(188,1,146),Vector3.new(0,-4.2,246),Color3.fromRGB(14,13,13),Enum.Material.Concrete)
 catch.Transparency=1;catch.CanCollide=true
 arenaPart(f,"HotelCeiling",Vector3.new(178,1,136),Vector3.new(0,21,246),Color3.fromRGB(27,25,24),Enum.Material.Concrete)

 -- 외벽/목재 하부 벽체. 로비에서는 맵 밖으로 떨어질 수 없다.
 arenaPart(f,"BackWall",Vector3.new(178,21,2),Vector3.new(0,10.5,313),Color3.fromRGB(55,49,46),Enum.Material.Plaster)
 for _,side in ipairs({-1,1})do
  arenaPart(f,"SideWall",Vector3.new(2,21,136),Vector3.new(side*88.5,10.5,246),Color3.fromRGB(54,49,46),Enum.Material.Plaster)
  arenaPart(f,"SideWainscot",Vector3.new(2.35,6,134),Vector3.new(side*87.3,3.2,246),Color3.fromRGB(67,48,37),Enum.Material.WoodPlanks)
 end
 arenaPart(f,"FrontSafetyWallL",Vector3.new(24,21,2),Vector3.new(-77,10.5,179),Color3.fromRGB(45,41,39),Enum.Material.Concrete)
 arenaPart(f,"FrontSafetyWallR",Vector3.new(24,21,2),Vector3.new(77,10.5,179),Color3.fromRGB(45,41,39),Enum.Material.Concrete)

 -- 1920년대 서양 호텔 벽지와 몰딩. 평평한 검은 상자 인상을 줄인다.
 for _,side in ipairs({-1,1})do
  for _,z in ipairs({225,245,265,285})do
   local paper=arenaPart(f,"WallpaperPanel",Vector3.new(.18,10.5,17),Vector3.new(side*87.05,12.7,z),Color3.fromRGB(46,52,43),Enum.Material.Fabric)
   paper.CanCollide=false
   arenaPart(f,"WallpaperGoldTop",Vector3.new(.22,.25,17.2),Vector3.new(side*86.92,17.8,z),Color3.fromRGB(133,99,54),Enum.Material.Metal).CanCollide=false
   arenaPart(f,"WallpaperGoldBottom",Vector3.new(.22,.25,17.2),Vector3.new(side*86.92,7.55,z),Color3.fromRGB(108,78,47),Enum.Material.Metal).CanCollide=false
  end
 end
 for _,z in ipairs({233,258,283})do
  local pool=arenaPart(f,"WallSconceGlow",Vector3.new(1,.75,.42),Vector3.new(-86.3,11.7,z),Color3.fromRGB(238,191,105),Enum.Material.Neon);pool.CanCollide=false;glow(pool,pool.Color,23,1.15)
  local pool2=arenaPart(f,"WallSconceGlow",Vector3.new(1,.75,.42),Vector3.new(86.3,11.7,z),Color3.fromRGB(238,191,105),Enum.Material.Neon);pool2.CanCollide=false;glow(pool2,pool2.Color,23,1.15)
 end
 local staffDoor=arenaPart(f,"StaffOnlyDoor",Vector3.new(11,14,.9),Vector3.new(72,7.2,306),Color3.fromRGB(49,34,30),Enum.Material.WoodPlanks)
 local staffPlaque=arenaPart(f,"StaffOnlyPlaque",Vector3.new(6.5,1.7,.18),Vector3.new(72,11.7,305.45),Color3.fromRGB(127,91,48),Enum.Material.Metal);staffPlaque.CanCollide=false
 lobbySurfaceText(staffPlaque,"STAFF ONLY",Color3.fromRGB(228,207,168),16)
 for i=-2,2 do
  local chain=arenaPart(f,"StaffDoorChain",Vector3.new(12,.22,.22),Vector3.new(72,7.4+i*.38,305.35),Color3.fromRGB(92,87,79),Enum.Material.Metal)
  chain.Orientation=Vector3.new(0,0,i%2==0 and 13 or -13);chain.CanCollide=false
 end

 -- 중앙 동선은 카펫과 천장등으로 바로 승강기까지 이어진다.
 zoneFloor(f,"MainCarpet",Vector3.new(36,.16,79),Vector3.new(0,.72,250),Color3.fromRGB(89,29,34),Enum.Material.Fabric)
 zoneFloor(f,"ElevatorCarpetApron",Vector3.new(150,.17,20),Vector3.new(0,.74,220),Color3.fromRGB(63,28,31),Enum.Material.Fabric)
 for _,x in ipairs({-15,15})do
  arenaPart(f,"CarpetBrassEdge",Vector3.new(.18,.18,78),Vector3.new(x,.84,250),Color3.fromRGB(154,119,66),Enum.Material.Metal).CanCollide=false
 end

 -- 프런트 데스크: 스폰 뒤쪽을 채우고 호텔의 중심점을 만든다.
 arenaPart(f,"ReceptionBack",Vector3.new(74,18,2),Vector3.new(0,10,307.5),Color3.fromRGB(43,37,35),Enum.Material.Concrete)
 for _,x in ipairs({-33,-22,-11,0,11,22,33})do
  arenaPart(f,"ReceptionBackTrim",Vector3.new(.7,16,.45),Vector3.new(x,9.5,306.35),Color3.fromRGB(86,61,43),Enum.Material.WoodPlanks).CanCollide=false
 end
 local desk=arenaPart(f,"ReceptionDesk",Vector3.new(44,5.2,8.5),Vector3.new(0,3.25,294),Color3.fromRGB(68,47,37),Enum.Material.WoodPlanks)
 arenaPart(f,"ReceptionTop",Vector3.new(47,.65,9.5),Vector3.new(0,6.15,294),Color3.fromRGB(116,82,52),Enum.Material.WoodPlanks)
 for _,x in ipairs({-16,-8,0,8,16})do
  arenaPart(f,"ReceptionPanel",Vector3.new(6.4,3.3,.35),Vector3.new(x,3.1,289.6),Color3.fromRGB(49,35,31),Enum.Material.WoodPlanks).CanCollide=false
 end
 local sign=arenaPart(f,"HotelSign",Vector3.new(37,5.4,.6),Vector3.new(0,14.5,306.15),Color3.fromRGB(30,26,25),Enum.Material.WoodPlanks)
 lobbySurfaceText(sign,"NOCTURNE HOTEL · 1927\n심야 대탈출",Color3.fromRGB(223,194,137),23)
 local bell=arenaPart(f,"DeskBell",Vector3.new(1.4,.7,1.4),Vector3.new(-9,6.85,290.6),Color3.fromRGB(184,143,72),Enum.Material.Metal);bell.Shape=Enum.PartType.Ball;bell.CanCollide=false
 arenaPart(f,"GuestBook",Vector3.new(5.8,.35,3.9),Vector3.new(7,6.82,290.5),Color3.fromRGB(188,176,148),Enum.Material.Fabric).CanCollide=false
 -- 프런트와 대기실 소품: 오래된 호텔이 실제로 운영 중인 듯한 밀도를 만든다.
 local phoneBase=arenaPart(f,"FrontDeskPhone",Vector3.new(3.2,.8,2.5),Vector3.new(15,6.85,291),Color3.fromRGB(37,32,31),Enum.Material.SmoothPlastic);phoneBase.CanCollide=false
 local receiver=arenaPart(f,"FrontDeskReceiver",Vector3.new(3.5,.45,.7),Vector3.new(15,7.55,291),Color3.fromRGB(21,20,21),Enum.Material.SmoothPlastic);receiver.CanCollide=false
 receiver.Orientation=Vector3.new(0,8,-4)
 local radio=arenaPart(f,"LobbyOldRadio",Vector3.new(5.8,3.8,2.6),Vector3.new(-28,2.6,301),Color3.fromRGB(74,51,37),Enum.Material.WoodPlanks)
 radio.CanCollide=false
 local radioDial=arenaPart(f,"LobbyRadioDial",Vector3.new(1.25,1.25,.2),Vector3.new(-26.3,2.6,299.62),Color3.fromRGB(190,145,71),Enum.Material.Metal);radioDial.CanCollide=false
 local vending=arenaPart(f,"BrokenVendingMachine",Vector3.new(7.2,12,4.5),Vector3.new(-77,6.5,242),Color3.fromRGB(52,59,61),Enum.Material.Metal)
 local vendingGlow=arenaPart(f,"VendingGhostDisplay",Vector3.new(5.3,4.2,.25),Vector3.new(-77,8.6,239.68),Color3.fromRGB(82,155,142),Enum.Material.Neon);vendingGlow.CanCollide=false;vendingGlow.Transparency=.22
 local umbrellaStand=arenaPart(f,"UmbrellaStand",Vector3.new(3.3,4.2,3.3),Vector3.new(-72,2.55,231),Color3.fromRGB(66,59,54),Enum.Material.Metal);umbrellaStand.Shape=Enum.PartType.Cylinder
 for i=-1,1 do
  local umbrella=arenaPart(f,"LobbyUmbrella",Vector3.new(.34,6,.34),Vector3.new(-72+i*.75,5.6,231),Color3.fromRGB(51+i*5,43,47),Enum.Material.Metal)
  umbrella.Orientation=Vector3.new(i*5,0,i*4);umbrella.CanCollide=false
 end
 local cleaningCart=arenaPart(f,"CleaningCart",Vector3.new(6.5,3.2,4),Vector3.new(70,2.2,246),Color3.fromRGB(92,84,72),Enum.Material.Metal)
 local bucket=arenaPart(f,"MopBucket",Vector3.new(2.4,2,2.4),Vector3.new(72.2,2,244.8),Color3.fromRGB(132,111,61),Enum.Material.Metal);bucket.Shape=Enum.PartType.Cylinder
 local mop=arenaPart(f,"MopHandle",Vector3.new(.34,8,.34),Vector3.new(68.4,5.1,245),Color3.fromRGB(101,71,44),Enum.Material.Wood)
 mop.Orientation=Vector3.new(0,0,14);mop.CanCollide=false
 local doll=arenaPart(f,"LostAndFoundDoll",Vector3.new(1.5,2.6,1.2),Vector3.new(64,2.1,269),Color3.fromRGB(184,155,142),Enum.Material.Fabric)
 doll.CanCollide=false
 local dollEye=arenaPart(f,"LostDollEye",Vector3.new(.16,.16,.1),Vector3.new(64.25,2.55,268.35),Color3.fromRGB(141,23,31),Enum.Material.Neon);dollEye.CanCollide=false
 local wetSign=arenaPart(f,"WetFloorSign",Vector3.new(2.8,4,.6),Vector3.new(58,2.6,239),Color3.fromRGB(201,164,51),Enum.Material.SmoothPlastic)
 wetSign.Orientation=Vector3.new(0,-18,0)
 local shoeL=arenaPart(f,"LostShoeL",Vector3.new(1.3,.55,2.2),Vector3.new(-52,1.05,272),Color3.fromRGB(39,31,29),Enum.Material.Fabric);shoeL.Orientation=Vector3.new(0,28,4)
 local shoeR=arenaPart(f,"LostShoeR",Vector3.new(1.3,.55,2.2),Vector3.new(-49.8,1.05,270.7),Color3.fromRGB(39,31,29),Enum.Material.Fabric);shoeR.Orientation=Vector3.new(0,-12,-7)
 for _,x in ipairs({-14,0,14})do
  local deskLamp=arenaPart(f,"ReceptionDownlight",Vector3.new(3.8,.3,1.2),Vector3.new(x,18.2,295),Color3.fromRGB(236,190,108),Enum.Material.Neon)
  deskLamp.CanCollide=false;glow(deskLamp,deskLamp.Color,26,1.35)
 end

 -- 로비 자체가 게임 튜토리얼 역할을 한다. 안내판도 호텔의 미친 투숙 규정으로 보인다.
 local rules=arenaPart(f,"MadHotelRules",Vector3.new(24,10,.7),Vector3.new(-50,10.6,306.05),Color3.fromRGB(28,24,23),Enum.Material.WoodPlanks)
 lobbySurfaceText(rules,"심야 투숙 규정\n1. 승강기 안에 서면 5초 뒤 체크인\n2. 인간은 정화 · 괴물은 감염\n3. 상대 진영이 0명이면 승리\n4. 같은 직원이 두 번 보이면 뛰지 마시오",Color3.fromRGB(219,202,169),15)
 local rulesPrompt=Instance.new("ProximityPrompt");rulesPrompt.Name="HotelRulesPrompt";rulesPrompt.ObjectText="심야 투숙 규정";rulesPrompt.ActionText="읽기";rulesPrompt.HoldDuration=.12;rulesPrompt.MaxActivationDistance=10;rulesPrompt.RequiresLineOfSight=false;rulesPrompt.Parent=rules
 rulesPrompt.Triggered:Connect(function(player)
  player:SetAttribute("LobbyStoryEvent","투숙 규정|승강기에 들어가면 5초 뒤 체크인. 인간은 정화, 괴물은 감염. 상대 진영을 0명으로 만들면 승리.|"..tostring(math.floor(workspace:GetServerTimeNow()*1000)))
  local before=rules.Color;rules.Color=Color3.fromRGB(65,44,37);task.delay(.25,function()if rules.Parent then rules.Color=before end end)
 end)
 local warningBoard=arenaPart(f,"MadWarning",Vector3.new(24,5.6,.65),Vector3.new(50,13.1,306.05),Color3.fromRGB(35,28,28),Enum.Material.WoodPlanks)
 lobbySurfaceText(warningBoard,"직원을 믿지 마십시오\n웃고 있는 직원은 더더욱.",Color3.fromRGB(167,48,53),19)
 for i=1,5 do
  local scratch=arenaPart(f,"WallScratch",Vector3.new(.16,3.4,.12),Vector3.new(38+i*2.3,5.7+(i%2)*.5,305.65),Color3.fromRGB(91,25,29),Enum.Material.Neon)
  scratch.Orientation=Vector3.new(0,0,-18+(i*7));scratch.CanCollide=false
 end

 local clerkLines={
  "어서 오세요. 체크아웃은… 살아 계실 때만 가능합니다.",
  "승강기 안에 서 계시면 객실이 알아서 손님을 골라 드립니다.",
  "직원이 두 명으로 보이면 눈을 감지 마세요. 하나는 제가 아닙니다.",
 }
 lobbyStaff(f,"CLERK",Vector3.new(0,3.05,299),Vector3.new(0,3.05,270),"야간 프런트 · 미스터 블랙","문의",clerkLines)
 local bellboyLines={
  "짐은 제가 들겠습니다. 손님까지 들 필요는 없겠죠?",
  "13층 버튼은 누르지 마세요. 없는 층이라서 더 빨리 옵니다.",
  "승강기가 웃으면 다른 칸을 타십시오. 네, 승강기가요.",
 }
 lobbyStaff(f,"BELLBOY",Vector3.new(-64,1.25,282),Vector3.new(-42,1.25,260),"벨보이 · 토비","말 걸기",bellboyLines)
 local maidLines={
  "방금 복도에 떨어진 손님은 청소했습니다. 아주 깨끗하게요.",
  "피 얼룩은 지워지는데 비명 얼룩은 잘 안 지워져요.",
  "저를 세 번째 보셨다면 프런트에는 비밀로 해 주세요.",
 }
 lobbyStaff(f,"MAID",Vector3.new(77,2.35,231),Vector3.new(48,2.35,250),"야간 메이드 · 메리","질문",maidLines)

 local bellPrompt=Instance.new("ProximityPrompt");bellPrompt.Name="DeskBellPrompt";bellPrompt.ObjectText="프런트 벨";bellPrompt.ActionText="누르기";bellPrompt.HoldDuration=.1;bellPrompt.MaxActivationDistance=7;bellPrompt.RequiresLineOfSight=false;bellPrompt.Parent=bell
 bellPrompt.Triggered:Connect(function(player)
  local line="딩— 예약 확인 완료. 손님 수: 살아 있는 만큼."
  player:SetAttribute("LobbyStoryEvent","호텔 벨|"..line.."|"..tostring(math.floor(workspace:GetServerTimeNow()*1000)))
  local oldColor=bell.Color;bell.Color=Color3.fromRGB(225,54,59)
  task.delay(.18,function()if bell.Parent then bell.Color=oldColor end end)
  for _,light in ipairs(flickerLights)do
   if light and light.Parent then
    local before=light.Brightness;light.Brightness=.02
    task.delay(.16,function()if light.Parent then light.Brightness=before end end)
   end
  end
 end)

 -- 열쇠함과 오래된 객실 번호. 단순 벽이 아니라 호텔처럼 보이게 한다.
 for row=0,2 do
  for col=-3,3 do
   local keyBox=arenaPart(f,"KeyCubby",Vector3.new(6.2,3.1,.55),Vector3.new(col*7.1,8.5+row*3.4,306.05),Color3.fromRGB(39,31,29),Enum.Material.WoodPlanks)
   keyBox.CanCollide=false
   local tag=arenaPart(f,"KeyTag",Vector3.new(1.5,.55,.18),Vector3.new(col*7.1,8.5+row*3.4,305.7),Color3.fromRGB(161,125,66),Enum.Material.Metal)
   tag.CanCollide=false
  end
 end

 -- 1927 호텔 로비의 상징물: 황동 짐수레, 멈춘 시계, 폐쇄된 13층 표지.
 local cartBase=arenaPart(f,"BellhopCartBase",Vector3.new(7,.65,4.2),Vector3.new(-58,1.25,284),Color3.fromRGB(102,72,42),Enum.Material.Metal)
 for _,dx in ipairs({-2.6,2.6})do
  for _,dz in ipairs({-1.55,1.55})do
   local wheel=arenaPart(f,"BellhopCartWheel",Vector3.new(1.2,1.2,.45),Vector3.new(-58+dx,.75,284+dz),Color3.fromRGB(27,25,25),Enum.Material.SmoothPlastic)
   wheel.Shape=Enum.PartType.Cylinder;wheel.Orientation=Vector3.new(0,90,0)
  end
 end
 for _,dx in ipairs({-3,3})do arenaPart(f,"BellhopCartPost",Vector3.new(.32,6,.32),Vector3.new(-58+dx,4,284),Color3.fromRGB(170,128,61),Enum.Material.Metal)end
 arenaPart(f,"BellhopCartTop",Vector3.new(6.3,.32,.32),Vector3.new(-58,7,284),Color3.fromRGB(170,128,61),Enum.Material.Metal)
 arenaPart(f,"CartSuitcase1",Vector3.new(3.4,2.8,2.8),Vector3.new(-59,3,284),Color3.fromRGB(74,49,37),Enum.Material.Fabric)
 arenaPart(f,"CartSuitcase2",Vector3.new(2.4,2.1,2.5),Vector3.new(-56.3,2.6,284.1),Color3.fromRGB(47,42,39),Enum.Material.Fabric)

 for i,spec in ipairs({{-22,"03:13"},{0,"03:13"},{22,"13:13"}})do
  local clock=arenaPart(f,"LobbyClock"..i,Vector3.new(8,4.1,.42),Vector3.new(spec[1],17,306),Color3.fromRGB(26,24,24),Enum.Material.Metal)
  lobbySurfaceText(clock,(i==3 and"13F  "or"")..spec[2],i==3 and Color3.fromRGB(177,43,48)or Color3.fromRGB(207,189,154),18)
 end
 local floorNotice=arenaPart(f,"Floor13Notice",Vector3.new(16,3.8,.5),Vector3.new(66,8,306),Color3.fromRGB(44,34,31),Enum.Material.WoodPlanks)
 lobbySurfaceText(floorNotice,"13층 폐쇄\n직원도 출입 금지",Color3.fromRGB(178,54,57),18)
 local floorPrompt=Instance.new("ProximityPrompt");floorPrompt.Name="Floor13Prompt";floorPrompt.ObjectText="폐쇄 안내";floorPrompt.ActionText="읽기";floorPrompt.HoldDuration=.12;floorPrompt.MaxActivationDistance=9;floorPrompt.RequiresLineOfSight=false;floorPrompt.Parent=floorNotice
 floorPrompt.Triggered:Connect(function(player)
  player:SetAttribute("LobbyStoryEvent","13층 안내|13층은 존재하지 않습니다. 따라서 폐쇄할 수도 없습니다.|"..tostring(math.floor(workspace:GetServerTimeNow()*1000)))
 end)

 -- 좌우 대기실: 소파/탁자/짐/낡은 액자로 빈 공간을 끊는다.
 for _,side in ipairs({-1,1})do
  local sx=side*63
  for _,z in ipairs({245,270})do
   arenaPart(f,"LobbyRug",Vector3.new(30,.14,18),Vector3.new(sx,.72,z),Color3.fromRGB(70,42,38),Enum.Material.Fabric)
   local sofa=arenaPart(f,"LobbySofa",Vector3.new(16,3.3,5.8),Vector3.new(sx,2.25,z+5),Color3.fromRGB(56,39,39),Enum.Material.Fabric)
   arenaPart(f,"LobbySofaBack",Vector3.new(16,5.4,.9),Vector3.new(sx,4.2,z+7.3),Color3.fromRGB(48,33,34),Enum.Material.Fabric)
   arenaPart(f,"CoffeeTable",Vector3.new(8,.55,5),Vector3.new(sx,2,z-1.5),Color3.fromRGB(80,56,41),Enum.Material.WoodPlanks)
   for _,dx in ipairs({-3.1,3.1})do
    for _,dz in ipairs({-1.7,1.7})do
     arenaPart(f,"CoffeeLeg",Vector3.new(.45,2.6,.45),Vector3.new(sx+dx,.9,z-1.5+dz),Color3.fromRGB(60,43,34),Enum.Material.WoodPlanks)
    end
   end
   sofa.CastShadow=true
  end
  for _,z in ipairs({230,255,280})do
   local frame=arenaPart(f,"PortraitFrame",Vector3.new(.55,8,10),Vector3.new(side*87,10.7,z),Color3.fromRGB(76,55,39),Enum.Material.WoodPlanks)
   frame.CanCollide=false
   local portrait=arenaPart(f,"PortraitShadow",Vector3.new(.3,6.8,8.7),Vector3.new(side*86.65,10.7,z),Color3.fromRGB(24,21,22),Enum.Material.SmoothPlastic)
   portrait.CanCollide=false
   local face=arenaPart(f,"PortraitFace",Vector3.new(.22,1.6,1.4),Vector3.new(side*86.45,11.4,z),Color3.fromRGB(84,73,65),Enum.Material.SmoothPlastic)
   face.CanCollide=false
  end
 end
 -- 벽지 얼룩과 누수 흔적. 깨끗한 호텔 인상을 의도적으로 깨뜨린다.
 for _,spec in ipairs({
  {-84,7,238,8,5},{-84,12,265,7,9},{84,6,250,6,7},{84,13,286,8,5},
  {-31,18,306,9,3},{26,17,306,7,4}
 })do
  local stain=arenaPart(f,"WallStain",Vector3.new(spec[4],spec[5],.12),Vector3.new(spec[1],spec[2],spec[3]),Color3.fromRGB(40,32,29),Enum.Material.SmoothPlastic)
  stain.Transparency=.38;stain.CanCollide=false
 end
 for _,spec in ipairs({{-82,4,225},{82,4,225},{-55,2,234},{56,2,278}})do
  local debris=arenaPart(f,"BrokenTrim",Vector3.new(7,.45,.7),Vector3.new(spec[1],spec[2],spec[3]),Color3.fromRGB(65,47,36),Enum.Material.WoodPlanks)
  debris.Orientation=Vector3.new((spec[1]%9)-4,(spec[3]%13)-6,12);debris.CanCollide=false
 end

 for _,spec in ipairs({{-75,286},{-69,289},{72,287},{77,291}})do
  arenaPart(f,"OldLuggage",Vector3.new(4.4,4.8,3),Vector3.new(spec[1],2.8,spec[2]),Color3.fromRGB(71,47,36),Enum.Material.WoodPlanks)
  local strap=arenaPart(f,"LuggageStrap",Vector3.new(.45,4.9,3.1),Vector3.new(spec[1],2.8,spec[2]),Color3.fromRGB(35,29,27),Enum.Material.Fabric)
  strap.CanCollide=false
 end

 -- 천장 보와 샹들리에. 밝은 점이 승강기 방향으로 점점 이어진다.
 -- 코믹한 공포 포인트: 짐가방 손, 액자 시선, 13층, 복도 메이드 잔상.
 local hand=arenaPart(f,"LuggageHand",Vector3.new(1.2,.45,2.4),Vector3.new(-72.5,5.15,285.5),Color3.fromRGB(171,155,145),Enum.Material.SmoothPlastic)
 hand.Orientation=Vector3.new(0,0,-18);hand.CanCollide=false
 for finger=1,4 do
  local fp=arenaPart(f,"LuggageFinger",Vector3.new(.26,.26,1.4),Vector3.new(-73.35+finger*.42,5.55,285.2),Color3.fromRGB(171,155,145),Enum.Material.SmoothPlastic)
  fp.Orientation=Vector3.new(-15,0,-8+finger*4);fp.CanCollide=false
 end
 lobbyHauntTrigger(f,"Portrait",Vector3.new(-70,9,255),"PORTRAIT_EYES",13,"초상화 속 손님이 눈을 돌렸다.")
 lobbyHauntTrigger(f,"Bellboy",Vector3.new(-66,3,278),"LUGGAGE_HAND",12,"벨보이: 짐은 제가 들겠습니다. 손님도요.")
 lobbyHauntTrigger(f,"Maid",Vector3.new(74,3,235),"MAID_CORRIDOR",13,"메이드: 청소할 손님이 한 명 늘었네요.")
 lobbyHauntTrigger(f,"HallShadow",Vector3.new(0,3,252),"MAID_CORRIDOR",10,"방금 네 뒤로 누가 지나갔다.")
 lobbyHauntTrigger(f,"Elevator13",Vector3.new(0,3,225),"ELEVATOR_13",12,"띵— 13층은 존재하지 않습니다.")
 lobbyHauntTrigger(f,"Clerk",Vector3.new(2,3,286),"CLERK_SMILE",11,"프런트 직원의 미소가 너무 길다.")
 lobbyHauntTrigger(f,"Phone",Vector3.new(15,3,291),"PHONE_GLITCH",10,"전화선은 끊겼는데 예약 전화가 왔다.")
 lobbyHauntTrigger(f,"Vending",Vector3.new(-77,4,242),"VENDING_SHAKE",11,"자판기가 캔 대신 객실 열쇠를 내놓으려 한다.")
 lobbyHauntTrigger(f,"Doll",Vector3.new(64,3,269),"DOLL_TURN",9,"분실물 인형이 프런트 쪽을 보고 있었다.")
 lobbyHauntTrigger(f,"CleaningCart",Vector3.new(70,3,246),"CART_ROLL",10,"청소 카트가 스스로 야간 순찰을 시작했다.")
 lobbyHauntTrigger(f,"Umbrella",Vector3.new(-72,3,231),"UMBRELLA_TWITCH",9,"비도 안 오는데 우산들이 출근 준비를 한다.")

 -- 천장 보와 샹들리에. 밝은 점이 승강기 방향으로 점점 이어진다.
 for _,z in ipairs({226,246,266,286})do
  arenaPart(f,"CeilingBeam",Vector3.new(176,.8,1.2),Vector3.new(0,19.8,z),Color3.fromRGB(50,37,31),Enum.Material.WoodPlanks)
 end
 for _,z in ipairs({236,258,280})do
  arenaPart(f,"ChandelierStem",Vector3.new(.3,5,.3),Vector3.new(0,17.2,z),Color3.fromRGB(85,66,45),Enum.Material.Metal)
  local ring=arenaPart(f,"ChandelierRing",Vector3.new(5.5,.45,5.5),Vector3.new(0,14.6,z),Color3.fromRGB(102,76,48),Enum.Material.Metal)
  ring.Shape=Enum.PartType.Cylinder;ring.Orientation=Vector3.new(0,0,90);ring.CanCollide=false
  for _,dx in ipairs({-2.1,0,2.1})do
   local bulb=arenaPart(f,"ChandelierBulb",Vector3.new(.85,1.2,.85),Vector3.new(dx,14.1,z),Color3.fromRGB(221,179,105),Enum.Material.Neon)
   bulb.CanCollide=false
   local light=glow(bulb,Color3.fromRGB(255,211,145),z==236 and 24 or 20,z==236 and 1.7 or 1.3)
   table.insert(flickerLights,light)
  end
 end

 -- 승강기 은행. 문이 메인홀 쪽(+Z)을 향하도록 구조를 바로잡는다.
 lobbyQueueBays={}
 for i,x in ipairs({-54,-18,18,54})do
  local bay=Instance.new("Folder");bay.Name="ElevatorBay"..i;bay.Parent=f
  local bayFloor=zoneFloor(bay,"MatchBay"..i,Vector3.new(25,.38,24),Vector3.new(x,1.02,198),Color3.fromRGB(60,56,53),Enum.Material.Metal)
  bayFloor:SetAttribute("MatchBayIndex",i);bayFloor:SetAttribute("PhysicalLobbyGround",true)
  zoneFloor(bay,"ElevatorRunner",Vector3.new(20,.14,20),Vector3.new(x,1.3,198),Color3.fromRGB(71,30,34),Enum.Material.Fabric)

  arenaPart(bay,"ElevatorBack",Vector3.new(25,13,1),Vector3.new(x,7.1,186.2),Color3.fromRGB(55,53,51),Enum.Material.Metal)
  arenaPart(bay,"ElevatorLeft",Vector3.new(1,13,24),Vector3.new(x-12,7.1,198),Color3.fromRGB(56,53,51),Enum.Material.Metal)
  arenaPart(bay,"ElevatorRight",Vector3.new(1,13,24),Vector3.new(x+12,7.1,198),Color3.fromRGB(56,53,51),Enum.Material.Metal)
  arenaPart(bay,"ElevatorCeiling",Vector3.new(25,1,24),Vector3.new(x,13.5,198),Color3.fromRGB(39,37,36),Enum.Material.Metal)
  for _,z in ipairs({191,199,206})do
   local insideLamp=arenaPart(bay,"ElevatorInsideLamp",Vector3.new(5,.28,1.1),Vector3.new(x,12.75,z),Color3.fromRGB(205,166,99),Enum.Material.Neon)
   insideLamp.CanCollide=false
   local light=glow(insideLamp,Color3.fromRGB(248,205,132),14,.82);table.insert(flickerLights,light)
  end

  -- 문틀과 양쪽 벽면. 문 앞은 완전히 열려 메인홀에서 바로 들어간다.
  for _,dx in ipairs({-12.4,12.4})do
   arenaPart(bay,"ElevatorFrame",Vector3.new(1.8,14.5,2),Vector3.new(x+dx,7.7,210.1),Color3.fromRGB(106,79,51),Enum.Material.Metal)
  end
  arenaPart(bay,"ElevatorHeader",Vector3.new(26.5,2.2,2),Vector3.new(x,14.1,210.1),Color3.fromRGB(94,68,47),Enum.Material.Metal)

  local profile=elevatorProfile(i)
  local board=arenaPart(bay,"GateBoard",Vector3.new(20,5.2,.55),Vector3.new(x,10.7,211.25),Color3.fromRGB(25,23,22),Enum.Material.Metal)
  board.Orientation=Vector3.new(0,180,0)
  local label=lobbySurfaceText(board,string.format("승강기 %02d · %s\n학교 · 0/%d · 대기",i,profile.Label,profile.MaxPlayers),Color3.fromRGB(236,213,169),16)

  local numberPlate=arenaPart(bay,"ElevatorNumber",Vector3.new(4.4,2.2,.35),Vector3.new(x,15.4,211.25),Color3.fromRGB(171,128,65),Enum.Material.Metal)
  numberPlate.Orientation=Vector3.new(0,180,0)
  local numberLabel=lobbySurfaceText(numberPlate,string.format("%02d",i),Color3.fromRGB(29,25,22),18)

  local left=arenaPart(bay,"SlidingDoorL",Vector3.new(11.6,10.8,.7),Vector3.new(x-5.9,6.7,210.05),Color3.fromRGB(79,75,72),Enum.Material.Metal)
  local right=arenaPart(bay,"SlidingDoorR",Vector3.new(11.6,10.8,.7),Vector3.new(x+5.9,6.7,210.05),Color3.fromRGB(79,75,72),Enum.Material.Metal)
  left.CanCollide=false;right.CanCollide=false

  lobbyQueueBays[i]={
   part=bayFloor,label=label,numberLabel=numberLabel,players={},joinedAt={},countdown=nil,token=0,index=i,
   minPlayers=math.max(1,tonumber(profile.MinPlayers)or 1),maxPlayers=math.max(1,tonumber(profile.MaxPlayers)or LOBBY_QUEUE_MAX),
   countdownSeconds=math.max(2,tonumber(profile.Countdown)or LOBBY_QUEUE_SECONDS),modeLabel=tostring(profile.Label or("승강기 "..i)),
   hostUserId=0,selectedMapId="SCHOOL",selectedMapName="학교",
   doorLeft=left,doorRight=right,
   doorLeftOpen=left.CFrame*CFrame.new(-7,0,0),doorRightOpen=right.CFrame*CFrame.new(7,0,0),
   doorLeftClosed=left.CFrame,doorRightClosed=right.CFrame,
  }
  left.CFrame=lobbyQueueBays[i].doorLeftOpen;right.CFrame=lobbyQueueBays[i].doorRightOpen
  local bayData=lobbyQueueBays[i]
  for mapIndex,map in ipairs(C.Maps or{})do
   local bx=x+(mapIndex-2)*6.1
   local button=arenaPart(bay,"MapSelect_"..map.Id,Vector3.new(5.3,2.5,.35),Vector3.new(bx,5.2,187.05),Color3.fromRGB(55,51,49),Enum.Material.Metal)
   button.CanCollide=false
   lobbySurfaceText(button,map.Name,Color3.fromRGB(232,214,177),13)
   local prompt=Instance.new("ProximityPrompt")
   prompt.Name="MapSelectPrompt";prompt.ObjectText=map.Name;prompt.ActionText="맵 선택";prompt.HoldDuration=.1;prompt.MaxActivationDistance=8;prompt.RequiresLineOfSight=false;prompt.Parent=button
   prompt.Triggered:Connect(function(player)
    if roomServer or state=="RUNNING"or not bayData.players[player]then return end
    if bayData.hostUserId==0 then bayData.hostUserId=player.UserId end
    if bayData.hostUserId~=player.UserId then roomFeedback(player,"INFO","승강기 방장만 맵 선택 가능");return end
    bayData.selectedMapId=map.Id;bayData.selectedMapName=map.Name
    player:SetAttribute("SelectedElevatorMap",map.Id)
    roomFeedback(player,"MAP",map.Name)
    if updateMatchBayLabel then updateMatchBayLabel(bayData)end
   end)
  end
 end

 -- 승강기 사이 벽체를 따로 만들어 문을 막지 않으면서 한 덩어리 호텔 벽처럼 보이게 한다.
 for _,spec in ipairs({{-80,16},{-36,9.5},{0,9.5},{36,9.5},{80,16}})do
  arenaPart(f,"ElevatorBankWall",Vector3.new(spec[2],20,2),Vector3.new(spec[1],10.5,211.5),Color3.fromRGB(52,47,44),Enum.Material.Plaster)
  arenaPart(f,"ElevatorBankWainscot",Vector3.new(spec[2]+.4,5.8,2.3),Vector3.new(spec[1],3.2,211.25),Color3.fromRGB(67,47,36),Enum.Material.WoodPlanks)
 end
 local routeSign=arenaPart(f,"ElevatorRouteSign",Vector3.new(56,4,.55),Vector3.new(0,18.1,212.55),Color3.fromRGB(29,25,24),Enum.Material.WoodPlanks)
 routeSign.Orientation=Vector3.new(0,180,0)
 lobbySurfaceText(routeSign,"1번 1인 · 2번 2인 · 3번 3~4인 · 4번 5~8인\n각 승강기 방장이 안에서 맵 선택",Color3.fromRGB(218,199,163),16)

 -- 승강기 번호가 가끔 존재하지 않는 13층으로 바뀐다. 로비 어디서든 보이는 반복 연출이다.
 task.spawn(function()
  local cursor=0
  while f.Parent do
   task.wait(9.5)
   if #lobbyQueueBays>0 then
    cursor=cursor%#lobbyQueueBays+1
    local bay=lobbyQueueBays[cursor]
    local numberLabel=bay and bay.numberLabel
    if numberLabel and numberLabel.Parent then
     numberLabel.Text="13";numberLabel.TextColor3=Color3.fromRGB(205,48,52)
     task.wait(.72)
     if numberLabel.Parent then numberLabel.Text=string.format("%02d",bay.index);numberLabel.TextColor3=Color3.fromRGB(29,25,22)end
    end
   end
  end
 end)

 -- 좌우의 어두운 막힌 복도는 깊이감만 만들고 실제 진행로는 아니다.
 for _,side in ipairs({-1,1})do
  local hx=side*78
  local hall=arenaPart(f,"DarkHall",Vector3.new(15,13,1),Vector3.new(hx,7,221),Color3.fromRGB(13,13,14),Enum.Material.SmoothPlastic)
  hall.CanCollide=true
  arenaPart(f,"DarkHallFrame",Vector3.new(18,1.2,1.4),Vector3.new(hx,14,221),Color3.fromRGB(71,50,36),Enum.Material.WoodPlanks)
  for _,dx in ipairs({-8.1,8.1})do arenaPart(f,"DarkHallPillar",Vector3.new(1.2,14,1.4),Vector3.new(hx+dx,7.2,221),Color3.fromRGB(70,49,35),Enum.Material.WoodPlanks)end
  local exitLamp=arenaPart(f,"HallWarningLamp",Vector3.new(1.1,1.8,.55),Vector3.new(hx,11.4,220.25),Color3.fromRGB(128,27,31),Enum.Material.Neon)
  exitLamp.CanCollide=false;table.insert(flickerLights,glow(exitLamp,Color3.fromRGB(180,45,48),9,.48))
 end

 -- 보조 기능은 프런트 양옆에 모아 주동선과 섞이지 않게 한다.
 local _,friendJoinPrompt=lobbyTerminal(f,"QuickFriendRoom",Vector3.new(61,4,296),"친구 방","참가",Color3.fromRGB(63,53,50),function(p)
  if roomServer or state=="RUNNING"then return end
  quickJoinRoom(p,true)
 end)
 local _,codePrompt=lobbyTerminal(f,"CodeRoomTerminal",Vector3.new(74,4,296),"초대 코드","입력",Color3.fromRGB(57,50,55),function(p)
  if roomServer or state=="RUNNING"then return end
  p:SetAttribute("WorldLobbyCodeInputRequest",tostring(math.floor(os.clock()*1000)))
 end)
 local _,leavePrompt=lobbyTerminal(f,"RoomLeaveTerminal",Vector3.new(-70,4,296),"메인 로비","나가기",Color3.fromRGB(65,48,46),function(p)
  leaveReservedRoom(p)
 end)

 -- 드문 조명 깜빡임. 전투 판정과 무관한 로비 연출만 바꾼다.
 task.spawn(function()
  local index=1
  while f.Parent do
   task.wait(3.2+((index%4)*.8))
   local light=flickerLights[index]
   if light and light.Parent then
    local original=light.Brightness
    light.Brightness=.05
    task.wait(.08)
    if light.Parent then light.Brightness=original*.45 end
    task.wait(.11)
    if light.Parent then light.Brightness=original end
   end
   index=index%math.max(1,#flickerLights)+1
  end
 end)

 refreshPhysicalLobby=function()
  local browser=not roomServer
  friendJoinPrompt.Enabled=browser;codePrompt.Enabled=browser
  leavePrompt.Enabled=roomServer and state=="WAITING"
  for _,bay in ipairs(lobbyQueueBays)do if bay.part then bay.part.CanTouch=browser end end
 end
 refreshPhysicalLobby()
 workspace:SetAttribute("PhysicalLobbyReady",true)
 workspace:SetAttribute("WorldLobbyMode",true)
 workspace:SetAttribute("LobbyArtPass","NOCTURNE_CURSED_HOTEL_V7")
 workspace:SetAttribute("LobbyBuildRevision","NOCTURNE_GROTESQUE_COMIC_LOBBY_20260930")
 return f
end

local function playerInsideMatchBay(p,bay)
 if not bay or not bay.part or not bay.part.Parent then return false end
 local r=root(p);if not r then return false end
 local localPos=bay.part.CFrame:PointToObjectSpace(r.Position)
 local half=bay.part.Size*.5
 return math.abs(localPos.X)<=half.X and math.abs(localPos.Z)<=half.Z and localPos.Y>=-5 and localPos.Y<=8
end

updateMatchBayLabel=function(bay)
 if not bay or not bay.label then return end
 local count=0
 for p in pairs(bay.players)do if p.Parent==Players then count+=1 end end
 local maxPlayers=math.max(1,tonumber(bay.maxPlayers)or LOBBY_QUEUE_MAX)
 local minPlayers=math.max(1,tonumber(bay.minPlayers)or 1)
 local mapName=tostring(bay.selectedMapName or"학교")
 local mode=tostring(bay.modeLabel or"")
 local status
 if count<minPlayers then status=string.format("대기 %d/%d",count,minPlayers)
 elseif bay.countdown then status=string.format("%d/%d · %d초",count,maxPlayers,math.max(0,math.ceil(bay.countdown)))
 else status=string.format("%d/%d · 출발 준비",count,maxPlayers)end
 bay.label.Text=string.format("승강기 %02d · %s\n%s · %s",bay.index,mode,mapName,status)
end
local function beginMatchBayCountdown(bay)
 if not bay or bay.countdown or roomServer then return end
 bay.token+=1
 local token=bay.token
 bay.countdown=math.max(2,tonumber(bay.countdownSeconds)or LOBBY_QUEUE_SECONDS)
 if bay.doorLeft and bay.doorRight then
  TweenService:Create(bay.doorLeft,TweenInfo.new(.35,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{CFrame=bay.doorLeftOpen}):Play()
  TweenService:Create(bay.doorRight,TweenInfo.new(.35,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{CFrame=bay.doorRightOpen}):Play()
 end
 task.spawn(function()
  while token==bay.token and bay.countdown and bay.countdown>0 do
   updateMatchBayLabel(bay)
   task.wait(1)
   if token~=bay.token then return end
   bay.countdown-=1
  end
  if token~=bay.token then return end
  local group={}
  for p in pairs(bay.players)do
   if p.Parent==Players and playerInsideMatchBay(p,bay)then table.insert(group,p)end
  end
  table.sort(group,function(a,b)return a.UserId<b.UserId end)
  if #group<(bay.minPlayers or 1)then bay.countdown=nil;bay.players={};bay.joinedAt={};bay.hostUserId=0;updateMatchBayLabel(bay);return end
  while #group>(bay.maxPlayers or LOBBY_QUEUE_MAX)do table.remove(group)end
  if bay.doorLeft and bay.doorRight then
   TweenService:Create(bay.doorLeft,TweenInfo.new(.45,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{CFrame=bay.doorLeftClosed}):Play()
   TweenService:Create(bay.doorRight,TweenInfo.new(.45,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{CFrame=bay.doorRightClosed}):Play()
   task.wait(.5)
  end
  local selectedMapId=bay.selectedMapId or"SCHOOL"
  bay.countdown=nil;bay.players={};bay.joinedAt={};bay.hostUserId=0;updateMatchBayLabel(bay)
  createQueuedReservedRoom(group,selectedMapId)
  task.delay(1,function()
   if bay.doorLeft and bay.doorLeft.Parent then TweenService:Create(bay.doorLeft,TweenInfo.new(.35),{CFrame=bay.doorLeftOpen}):Play()end
   if bay.doorRight and bay.doorRight.Parent then TweenService:Create(bay.doorRight,TweenInfo.new(.35),{CFrame=bay.doorRightOpen}):Play()end
  end)
 end)
end

task.spawn(function()
 while true do
  if state~="RUNNING"and #lobbyQueueBays>0 then
   local currentPlayers=Players:GetPlayers()
   table.sort(currentPlayers,function(a,b)return a.UserId<b.UserId end)
   for i,player in ipairs(currentPlayers)do
    local rr=root(player)
    if rr and player:GetAttribute("RoundState")~="RUNNING"and player:GetAttribute("RoundState")~="SPECTATING"and(rr.Position.Y<-2 or rr.Position.Y>20 or math.abs(rr.Position.X)>86 or rr.Position.Z<182 or rr.Position.Z>310)then
     local slot=((i-1)%#lobbySpawns)+1
     teleport(player,lobbySpawns[slot],Vector3.new(0,3,210))
     player:SetAttribute("LobbySafetyRecoveredAt",workspace:GetServerTimeNow())
    end
   end
  end
  if not roomServer and state~="RUNNING"and #lobbyQueueBays>0 then
   local assigned={}
   for _,bay in ipairs(lobbyQueueBays)do
    local changed=false
    for _,p in ipairs(Players:GetPlayers())do
     local inside=not assigned[p] and playerInsideMatchBay(p,bay)
     if inside then
      assigned[p]=true
      local count=0;for _ in pairs(bay.players)do count+=1 end
      if not bay.players[p]and count<(bay.maxPlayers or LOBBY_QUEUE_MAX)then
       bay.players[p]=true;bay.joinedAt[p]=os.clock();changed=true
       if bay.hostUserId==0 then
        bay.hostUserId=p.UserId
        local preferred=mapById(p:GetAttribute("SelectedElevatorMap")or bay.selectedMapId or"SCHOOL")
        bay.selectedMapId=preferred.Id;bay.selectedMapName=preferred.Name
        roomFeedback(p,"HOST","승강기 방장 · 안쪽에서 맵 선택")
       end
      elseif not bay.players[p]and count>=(bay.maxPlayers or LOBBY_QUEUE_MAX)then
       roomFeedback(p,"FULL","이 승강기는 가득 참 · 다른 승강기 이용")
      end
     elseif bay.players[p]then
      bay.players[p]=nil;bay.joinedAt[p]=nil;changed=true
      if bay.hostUserId==p.UserId then
       bay.hostUserId=0
       local nextHost=nil;local oldest=math.huge
       for candidate in pairs(bay.players)do
        local joined=bay.joinedAt[candidate]or math.huge
        if joined<oldest then oldest=joined;nextHost=candidate end
       end
       if nextHost then bay.hostUserId=nextHost.UserId;roomFeedback(nextHost,"HOST","승강기 방장이 되었어")end
      end
     end
    end
    for p in pairs(bay.players)do if not p.Parent then bay.players[p]=nil;changed=true end end
    local count=0;for _ in pairs(bay.players)do count+=1 end
    if count>=(bay.maxPlayers or LOBBY_QUEUE_MAX)and bay.countdown then bay.countdown=1 end
    if count>=(bay.minPlayers or 1)and not bay.countdown then beginMatchBayCountdown(bay)
    elseif count<(bay.minPlayers or 1)and bay.countdown then bay.token+=1;bay.countdown=nil;changed=true end
    if count==0 then bay.hostUserId=0 end
    if changed then updateMatchBayLabel(bay)end
   end
  end
  task.wait(.2)
 end
end)

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
  -- 학교는 추격 시 카메라와 몬스터 실루엣이 잘 보이도록 높은 천장으로 통일한다.
  local schoolWallHeight=24
  local schoolWallY=12
  local schoolCeilingY=24.4
  local schoolLightY=22.2
  -- 실제 실내 구역 천장만 사용하고 전체 맵을 덮는 단일 지붕판은 두지 않는다.
   for i,spec in ipairs({
    {Vector3.new(0,25.4,-163),Vector3.new(336,1,10)},
    {Vector3.new(0,25.4,163),Vector3.new(336,1,10)},
    {Vector3.new(-163,25.4,0),Vector3.new(10,1,336)},
    {Vector3.new(163,25.4,0),Vector3.new(10,1,336)}
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
   arenaPart(f,"SchoolCeilingBeam",Vector3.new(37,.65,1.1),Vector3.new(0,schoolCeilingY-.75,z),Color3.fromRGB(82,87,95),Enum.Material.Metal)
  end
  for _,x in ipairs({-16.25,16.25})do
   arenaPart(f,"SchoolWallBaseTrim",Vector3.new(.38,1.1,112),Vector3.new(x,1.25,0),Color3.fromRGB(68,76,84),Enum.Material.Metal)
   arenaPart(f,"SchoolWallTopTrim",Vector3.new(.42,.55,112),Vector3.new(x,schoolCeilingY-1.7,0),Color3.fromRGB(78,84,92),Enum.Material.Metal)
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
  -- 폐병원: 중앙 병동과 수술실은 높은 천장, 지하실은 상대적으로 낮게 유지한다.
  local hospitalWallHeight=18
  local hospitalWallY=9
  local hospitalCeilingY=18.5
  local hospitalLightY=16.2
  local basementCeilingY=12.5
  local basementWallHeight=13
  local basementWallY=6.5
  Lighting.FogEnd=132
  zoneFloor(f,"HospitalHallFloor",Vector3.new(20,.35,136),Vector3.new(0,.68,0),Color3.fromRGB(112,128,123),Enum.Material.Concrete)
  zoneFloor(f,"HospitalSurgeryFloor",Vector3.new(56,.35,40),Vector3.new(-48,.68,51),Color3.fromRGB(102,120,119),Enum.Material.Concrete)
  zoneFloor(f,"HospitalBasementFloor",Vector3.new(56,.35,34),Vector3.new(47,.68,57),Color3.fromRGB(64,70,70),Enum.Material.Concrete)
  local emergency=arenaPart(f,"HospitalEmergencySign",Vector3.new(10,2,.8),Vector3.new(0,7,-62),Color3.fromRGB(224,73,73),Enum.Material.Neon);glow(emergency,emergency.Color,18,1.6)
  arenaPart(f,"HospitalHallL",Vector3.new(3,hospitalWallHeight,132),Vector3.new(-11,hospitalWallY,0),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"HospitalHallR",Vector3.new(3,hospitalWallHeight,132),Vector3.new(11,hospitalWallY,0),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"HospitalHallCeiling",Vector3.new(25,1,138),Vector3.new(0,hospitalCeilingY,0),Color3.fromRGB(101,110,109),Enum.Material.Concrete)
  for _,z in ipairs({-48,-22,4,30})do
   for _,side in ipairs({-1,1})do
    local x=side*42
    arenaPart(f,"WardOuter",Vector3.new(52,hospitalWallHeight,3),Vector3.new(x,hospitalWallY,z),Style.Wall,Enum.Material.Concrete)
    arenaPart(f,"WardCeiling",Vector3.new(52,1,24),Vector3.new(x,hospitalCeilingY,z+9),Color3.fromRGB(103,112,111),Enum.Material.Concrete)
    local door=arenaPart(f,"WardDoor",Vector3.new(5,9,2),Vector3.new(side*13,4.5,z+8),Color3.fromRGB(91,111,108),Enum.Material.Metal);door.CanCollide=false;door.Transparency=.7
    for bed=1,3 do arenaPart(f,"HospitalBed",Vector3.new(10,2,5),Vector3.new(side*(29+bed*10),1.5,z+9),Color3.fromRGB(174,187,188),Enum.Material.Metal)end
   end
   local lamp=arenaPart(f,"CeilingLight",Vector3.new(8,.5,2),Vector3.new(0,hospitalLightY,z+10),Color3.fromRGB(183,217,207),Enum.Material.Neon);lamp.Transparency=.06;glow(lamp,lamp.Color,24,1.15)
  end
  -- 수술실
  arenaPart(f,"SurgeryWall",Vector3.new(55,hospitalWallHeight,3),Vector3.new(-45,hospitalWallY,61),Style.Wall,Enum.Material.Concrete)
  arenaPart(f,"SurgeryCeiling",Vector3.new(58,1,43),Vector3.new(-48,hospitalCeilingY,51),Color3.fromRGB(99,111,110),Enum.Material.Concrete)
  arenaPart(f,"SurgeryTable",Vector3.new(12,3,5),Vector3.new(-48,2,52),Color3.fromRGB(132,151,151),Enum.Material.Metal)
  arenaPart(f,"SurgeryLamp",Vector3.new(6,.7,6),Vector3.new(-48,hospitalLightY,52),Color3.fromRGB(190,240,220),Enum.Material.Neon)
  -- 지하실은 병동보다 낮지만 기존보다 여유를 줘 카메라 충돌을 줄인다.
  arenaPart(f,"BasementCeiling",Vector3.new(56,1,34),Vector3.new(47,basementCeilingY,57),Color3.fromRGB(60,64,66),Enum.Material.Concrete)
  arenaPart(f,"BasementWallA",Vector3.new(3,basementWallHeight,34),Vector3.new(20,basementWallY,57),Color3.fromRGB(69,73,75),Enum.Material.Concrete)
  arenaPart(f,"BasementWallB",Vector3.new(3,basementWallHeight,34),Vector3.new(75,basementWallY,57),Color3.fromRGB(69,73,75),Enum.Material.Concrete)
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
  -- 폐놀이공원: 야외는 개방감을 유지하고 귀신의 집/지하통로 실내 높이만 올린다.
  local hauntedWallHeight=18
  local hauntedWallY=9
  local hauntedCeilingY=18.5
  local underpassWallHeight=12
  local underpassWallY=6
  local underpassCeilingY=12.5
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
  local canopy=arenaPart(f,"CarouselCanopy",Vector3.new(38,2,38),Vector3.new(-32,13,8),Color3.fromRGB(112,68,111),Enum.Material.Fabric);canopy.Transparency=.08
  for i=1,8 do
   local a=i/8*math.pi*2
   arenaPart(f,"CarouselHorse",Vector3.new(3,5,2),Vector3.new(-32+math.cos(a)*11,5,8+math.sin(a)*11),Color3.fromRGB(212,190,153),Enum.Material.SmoothPlastic)
  end
  -- 귀신의 집 내부
  arenaPart(f,"HauntedShell",Vector3.new(58,hauntedWallHeight,3),Vector3.new(34,hauntedWallY,54),Color3.fromRGB(54,45,62),Enum.Material.Slate)
  arenaPart(f,"HauntedSideL",Vector3.new(3,hauntedWallHeight,42),Vector3.new(6,hauntedWallY,37),Color3.fromRGB(54,45,62),Enum.Material.Slate)
  arenaPart(f,"HauntedSideR",Vector3.new(3,hauntedWallHeight,42),Vector3.new(62,hauntedWallY,37),Color3.fromRGB(54,45,62),Enum.Material.Slate)
  arenaPart(f,"HauntedCeiling",Vector3.new(58,1,42),Vector3.new(34,hauntedCeilingY,37),Color3.fromRGB(45,38,52),Enum.Material.Slate)
  for i=1,4 do arenaPart(f,"HauntedDivider",Vector3.new(24,13,2),Vector3.new(18+(i%2)*28,6.5,25+i*7),Color3.fromRGB(67,55,72),Enum.Material.Slate)end
  -- 매표소와 숨는 부스
  for i=1,5 do
   arenaPart(f,"TicketBooth",Vector3.new(10,8,10),Vector3.new(-60+i*18,4,-38),Color3.fromRGB(83,72+(i*7),94),Enum.Material.Metal)
  end
  for i=1,7 do
   local a=i/7*math.pi*2
   arenaPart(f,"HideBooth",Vector3.new(8,7,8),Vector3.new(math.cos(a)*59,3.5,math.sin(a)*54),Color3.fromRGB(75,66,82),Enum.Material.Metal)
  end
  -- 지하 통로는 긴장감은 유지하되 카메라가 눌리지 않을 정도로 천장을 높인다.
  arenaPart(f,"UnderpassCeiling",Vector3.new(72,1,18),Vector3.new(0,underpassCeilingY,-66),Color3.fromRGB(53,54,61),Enum.Material.Concrete)
  arenaPart(f,"UnderpassWallL",Vector3.new(72,underpassWallHeight,2),Vector3.new(0,underpassWallY,-74),Color3.fromRGB(62,63,70),Enum.Material.Concrete)
  arenaPart(f,"UnderpassWallR",Vector3.new(72,underpassWallHeight,2),Vector3.new(0,underpassWallY,-58),Color3.fromRGB(62,63,70),Enum.Material.Concrete)
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
 workspace:SetAttribute("WorldArtPass","MIDNIGHT_"..map.Id.."_INFECTION_HORROR_V10")
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

makeFallbackArena=function(map,reason)
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

ensureArena=function(map)
 local ok,result=pcall(function()return makeArena(map)end)
 if ok and result and result.Parent and workspace:GetAttribute("MapReady")==true then
  return result
 end
 return makeFallbackArena(map,ok and"NO_READY"or result)
end

end -- 월드 생성 지역 범위

local function clearBots()
 for _,b in ipairs(bots)do
  if b.visuals then for _,v in ipairs(b.visuals)do if v.part then v.part:Destroy()end end end
  if b.model and b.model.Parent then b.model:Destroy()elseif b.part then b.part:Destroy()end
 end
 bots={};monsterBot=nil
end
local function botVisualPart(rootPart,name,size,offset,color,material,shape)
 local x=Instance.new("Part");x.Name=name;x.Anchored=true;x.CanCollide=false;x.CanTouch=false;x.CanQuery=false;x.Size=size;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic
 if shape then x.Shape=shape end;x.CFrame=rootPart.CFrame*CFrame.new(offset);x.Parent=rootPart.Parent
 return x
end
local function decorateClassicMonster(anchor,id)
 local style=Style.Monsters[id]or Style.Monsters.DRACULA
 if anchor.Name=="HumanoidRootPart"then
  anchor.Transparency=1
 else
  anchor.Color=style.Color;anchor.Transparency=.12
 end
 local visuals={}
 local function add(name,size,offset,color,material,shape,rotation)
  local x=botVisualPart(anchor,name,size,offset,color,material,shape)
  local row={part=x,offset=offset,rotation=rotation or CFrame.identity}
  table.insert(visuals,row)
  x.CFrame=anchor.CFrame*CFrame.new(offset)*row.rotation
  return x
 end
 if id=="DRACULA"then
  add("Cape",Vector3.new(5.8,6.6,.42),Vector3.new(0,-.15,1.65),Color3.fromRGB(20,8,17),Enum.Material.Fabric)
  add("CapeWingL",Vector3.new(2.5,5.2,.28),Vector3.new(-2.05,-.15,1.55),Color3.fromRGB(47,9,21),Enum.Material.Fabric,nil,CFrame.Angles(0,0,math.rad(10)))
  add("CapeWingR",Vector3.new(2.5,5.2,.28),Vector3.new(2.05,-.15,1.55),Color3.fromRGB(47,9,21),Enum.Material.Fabric,nil,CFrame.Angles(0,0,math.rad(-10)))
  add("Collar",Vector3.new(6,1.4,1.1),Vector3.new(0,2.35,.42),Color3.fromRGB(118,16,38),Enum.Material.Fabric)
  add("Head",Vector3.new(2.5,2.85,2.45),Vector3.new(0,3.75,0),Color3.fromRGB(224,207,194),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  add("Hair",Vector3.new(2.55,.72,2.2),Vector3.new(0,4.75,.12),Color3.fromRGB(14,12,15),Enum.Material.Fabric)
  add("BloodEyeL",Vector3.new(.2,.17,.12),Vector3.new(-.42,3.96,-1.23),Color3.fromRGB(239,35,55),Enum.Material.Neon)
  add("BloodEyeR",Vector3.new(.2,.17,.12),Vector3.new(.42,3.96,-1.23),Color3.fromRGB(239,35,55),Enum.Material.Neon)
  add("FangL",Vector3.new(.22,.82,.22),Vector3.new(-.38,3.17,-1.22),Color3.fromRGB(246,246,235),Enum.Material.SmoothPlastic)
  add("FangR",Vector3.new(.22,.82,.22),Vector3.new(.38,3.17,-1.22),Color3.fromRGB(246,246,235),Enum.Material.SmoothPlastic)
  add("BloodMedallion",Vector3.new(.72,.9,.26),Vector3.new(0,.8,-1.12),Color3.fromRGB(212,35,54),Enum.Material.Neon)
 elseif id=="FRANKENSTEIN"then
  add("Head",Vector3.new(3.5,3.25,2.95),Vector3.new(0,3.75,0),Color3.fromRGB(112,144,99),Enum.Material.SmoothPlastic)
  add("HeavyBrow",Vector3.new(2.9,.5,.48),Vector3.new(0,4.15,-1.36),Color3.fromRGB(45,58,47),Enum.Material.SmoothPlastic)
  add("ShoulderL",Vector3.new(2.5,1.6,2.7),Vector3.new(-2.55,1.15,0),Color3.fromRGB(58,72,59),Enum.Material.Metal)
  add("ShoulderR",Vector3.new(2.5,1.6,2.7),Vector3.new(2.55,1.15,0),Color3.fromRGB(58,72,59),Enum.Material.Metal)
  add("ChestPlate",Vector3.new(3.8,3.5,.5),Vector3.new(0,.15,-1.2),Color3.fromRGB(53,67,56),Enum.Material.Metal)
  add("ElectricCore",Vector3.new(1,1.45,.3),Vector3.new(0,.3,-1.5),Color3.fromRGB(134,246,112),Enum.Material.Neon)
  add("BoltL",Vector3.new(.52,.52,1.55),Vector3.new(-1.95,3.55,0),Color3.fromRGB(164,171,173),Enum.Material.Metal)
  add("BoltR",Vector3.new(.52,.52,1.55),Vector3.new(1.95,3.55,0),Color3.fromRGB(164,171,173),Enum.Material.Metal)
  for i=-1,1 do add("FaceStitch"..i,Vector3.new(.58,.09,.09),Vector3.new(i*.52,3.55,-1.5),Color3.fromRGB(32,39,33),Enum.Material.Metal,nil,CFrame.Angles(0,0,math.rad(i*18)))end
  add("CableL",Vector3.new(.18,3.1,.18),Vector3.new(-1.55,-.5,.9),Color3.fromRGB(77,126,70),Enum.Material.Neon,nil,CFrame.Angles(math.rad(8),0,math.rad(12)))
  add("CableR",Vector3.new(.18,3.1,.18),Vector3.new(1.55,-.5,.9),Color3.fromRGB(77,126,70),Enum.Material.Neon,nil,CFrame.Angles(math.rad(8),0,math.rad(-12)))
 elseif id=="WEREWOLF"then
  add("Head",Vector3.new(3.15,3,3.35),Vector3.new(0,3.55,-.25),Color3.fromRGB(102,74,57),Enum.Material.SmoothPlastic,Enum.PartType.Ball)
  add("Muzzle",Vector3.new(2.15,1.45,2.65),Vector3.new(0,3.18,-2.05),Color3.fromRGB(126,89,64),Enum.Material.SmoothPlastic)
  add("Nose",Vector3.new(.72,.52,.55),Vector3.new(0,3.35,-3.2),Color3.fromRGB(25,22,21),Enum.Material.SmoothPlastic)
  add("EyeL",Vector3.new(.22,.18,.12),Vector3.new(-.5,3.85,-1.62),Color3.fromRGB(243,178,67),Enum.Material.Neon)
  add("EyeR",Vector3.new(.22,.18,.12),Vector3.new(.5,3.85,-1.62),Color3.fromRGB(243,178,67),Enum.Material.Neon)
  add("EarL",Vector3.new(1.15,2.2,1),Vector3.new(-1.05,5.25,0),Color3.fromRGB(87,60,46),Enum.Material.SmoothPlastic,Enum.PartType.Wedge,CFrame.Angles(0,0,math.rad(-8)))
  add("EarR",Vector3.new(1.15,2.2,1),Vector3.new(1.05,5.25,0),Color3.fromRGB(87,60,46),Enum.Material.SmoothPlastic,Enum.PartType.Wedge,CFrame.Angles(0,0,math.rad(8)))
  add("BackFur",Vector3.new(4,4.8,.9),Vector3.new(0,.45,1.35),Color3.fromRGB(70,51,42),Enum.Material.Fabric)
  add("Tail",Vector3.new(.9,4.5,.9),Vector3.new(0,-1.3,2.1),Color3.fromRGB(83,58,45),Enum.Material.Fabric,nil,CFrame.Angles(math.rad(32),0,0))
  for i=-1,1 do
   add("ClawL"..i,Vector3.new(.17,.17,1),Vector3.new(-2.35+i*.18,-.65,-.75),Color3.fromRGB(229,214,184),Enum.Material.SmoothPlastic,nil,CFrame.Angles(math.rad(-15),0,0))
   add("ClawR"..i,Vector3.new(.17,.17,1),Vector3.new(2.35+i*.18,-.65,-.75),Color3.fromRGB(229,214,184),Enum.Material.SmoothPlastic,nil,CFrame.Angles(math.rad(-15),0,0))
  end
 elseif id=="MUMMY"then
  add("Head",Vector3.new(2.75,3,2.7),Vector3.new(0,3.55,0),Color3.fromRGB(202,190,151),Enum.Material.Fabric,Enum.PartType.Ball)
  add("EyeSlit",Vector3.new(1.8,.42,.18),Vector3.new(0,3.72,-1.38),Color3.fromRGB(52,42,29),Enum.Material.SmoothPlastic)
  add("CurseEyeL",Vector3.new(.18,.12,.1),Vector3.new(-.35,3.72,-1.5),Color3.fromRGB(232,193,86),Enum.Material.Neon)
  add("CurseEyeR",Vector3.new(.18,.12,.1),Vector3.new(.35,3.72,-1.5),Color3.fromRGB(232,193,86),Enum.Material.Neon)
  for i=-3,3 do add("Bandage"..i,Vector3.new(4.7,.52,2.65),Vector3.new(0,i*.53,0),i%2==0 and Color3.fromRGB(215,203,165)or Color3.fromRGB(184,173,140),Enum.Material.Fabric,nil,CFrame.Angles(0,0,math.rad(i*3)))end
  add("LooseBandageL",Vector3.new(.5,4.3,.34),Vector3.new(-2.15,-1.1,.35),Color3.fromRGB(204,192,156),Enum.Material.Fabric,nil,CFrame.Angles(math.rad(8),0,math.rad(9)))
  add("LooseBandageR",Vector3.new(.5,3.5,.34),Vector3.new(2.15,-.8,.45),Color3.fromRGB(183,172,139),Enum.Material.Fabric,nil,CFrame.Angles(math.rad(-5),0,math.rad(-12)))
  add("CurseScarab",Vector3.new(1,1,.25),Vector3.new(0,.65,-1.35),Color3.fromRGB(226,188,92),Enum.Material.Neon)
 elseif id=="GRIM_REAPER"then
  add("Cloak",Vector3.new(5.7,6.6,3),Vector3.new(0,-.2,.45),Color3.fromRGB(20,16,27),Enum.Material.Fabric)
  add("ShoulderL",Vector3.new(2.6,1.4,2.2),Vector3.new(-2.15,1.45,.1),Color3.fromRGB(31,24,42),Enum.Material.Fabric)
  add("ShoulderR",Vector3.new(2.6,1.4,2.2),Vector3.new(2.15,1.45,.1),Color3.fromRGB(31,24,42),Enum.Material.Fabric)
  add("Hood",Vector3.new(3.8,3.9,3.8),Vector3.new(0,3.75,0),Color3.fromRGB(16,12,23),Enum.Material.Fabric,Enum.PartType.Ball)
  add("FaceVoid",Vector3.new(2.3,2.25,.55),Vector3.new(0,3.6,-1.92),Color3.fromRGB(3,3,6),Enum.Material.Neon)
  add("VoidEyeL",Vector3.new(.2,.15,.12),Vector3.new(-.38,3.85,-2.22),Color3.fromRGB(169,84,255),Enum.Material.Neon)
  add("VoidEyeR",Vector3.new(.2,.15,.12),Vector3.new(.38,3.85,-2.22),Color3.fromRGB(169,84,255),Enum.Material.Neon)
  add("ScytheStaff",Vector3.new(.45,7.5,.45),Vector3.new(3.1,0,0),Color3.fromRGB(69,58,52),Enum.Material.Wood)
  add("ScytheBlade",Vector3.new(.5,3.9,2.7),Vector3.new(3.1,3.35,-1.25),Color3.fromRGB(190,197,205),Enum.Material.Metal,nil,CFrame.Angles(0,0,math.rad(60)))
  add("ShadowChainL",Vector3.new(.16,3.8,.16),Vector3.new(-1.65,-.65,.8),Color3.fromRGB(91,51,138),Enum.Material.Neon,nil,CFrame.Angles(math.rad(8),0,math.rad(13)))
  add("ShadowChainR",Vector3.new(.16,3.8,.16),Vector3.new(1.65,-.65,.8),Color3.fromRGB(91,51,138),Enum.Material.Neon,nil,CFrame.Angles(math.rad(8),0,math.rad(-13)))
 end
 return visuals
end

local function decorateHumanBot(anchor,id)
 local visuals={}
 local function add(name,size,offset,color,material,shape,rotation)
  local x=botVisualPart(anchor,name,size,offset,color,material,shape)
  local row={part=x,offset=offset,rotation=rotation or CFrame.identity}
  table.insert(visuals,row);x.CFrame=anchor.CFrame*CFrame.new(offset)*row.rotation;return x
 end
 if id=="BROADCAST"then
  add("BroadcastPack",Vector3.new(2.7,3.2,.8),Vector3.new(0,.4,1.25),Color3.fromRGB(48,72,88),Enum.Material.Metal)
  add("SignalAntenna",Vector3.new(.18,4,.18),Vector3.new(.7,2.4,1.35),Color3.fromRGB(91,213,229),Enum.Material.Neon,nil,CFrame.Angles(math.rad(-8),0,0))
 elseif id=="ELECTRICIAN"then
  add("ElectricVest",Vector3.new(4.1,3.8,.38),Vector3.new(0,.3,-1.15),Color3.fromRGB(205,168,54),Enum.Material.Fabric)
  add("CoilTool",Vector3.new(1.2,2.2,.8),Vector3.new(1.65,.2,-.55),Color3.fromRGB(109,214,225),Enum.Material.Neon)
 elseif id=="COURIER"then
  add("CourierBag",Vector3.new(3.4,3.5,1.1),Vector3.new(0,.1,1.4),Color3.fromRGB(112,76,51),Enum.Material.Fabric)
  add("CourierStripe",Vector3.new(4,.35,.25),Vector3.new(0,.65,-1.18),Color3.fromRGB(236,157,72),Enum.Material.Neon)
 elseif id=="PHOTOGRAPHER"then
  add("CameraBody",Vector3.new(2.1,1.4,1.2),Vector3.new(0,.55,-1.55),Color3.fromRGB(36,38,43),Enum.Material.Metal)
  add("CameraLens",Vector3.new(.85,.85,.85),Vector3.new(0,.55,-2.15),Color3.fromRGB(108,195,231),Enum.Material.Neon,Enum.PartType.Ball)
 elseif id=="SECURITY"then
  add("SecurityPlate",Vector3.new(4.3,3.9,.42),Vector3.new(0,.2,-1.18),Color3.fromRGB(52,66,82),Enum.Material.Metal)
  add("Baton",Vector3.new(.35,4.4,.35),Vector3.new(1.85,-.3,-.4),Color3.fromRGB(114,197,225),Enum.Material.Neon,nil,CFrame.Angles(0,0,math.rad(-12)))
 end
 return visuals
end
local function createBotAvatar(role,pos)
 local description=Instance.new("HumanoidDescription")
 description.HeightScale=role=="MONSTER"and 1.08 or 1
 description.WidthScale=role=="MONSTER"and 1.04 or .98
 description.DepthScale=role=="MONSTER"and 1.04 or .98
 description.HeadScale=1
 local ok,model=pcall(function()return Players:CreateHumanoidModelFromDescription(description,Enum.HumanoidRigType.R15)end)
 if not ok or not model then return nil,nil,nil end
 model.Name=role=="MONSTER"and"AI_MONSTER_R15"or"AI_SURVIVOR_R15"
 model.Parent=arena
 local rootPart=model:FindFirstChild("HumanoidRootPart")
 local humanoid=model:FindFirstChildOfClass("Humanoid")
 if humanoid then
  humanoid.DisplayDistanceType=Enum.HumanoidDisplayDistanceType.None
  humanoid.NameDisplayDistance=0
  humanoid.HealthDisplayDistance=0
  humanoid.AutoRotate=false
 end
 local skin=role=="MONSTER"and Color3.fromRGB(159,151,145)or Color3.fromRGB(222,188,157)
 local shirt=role=="MONSTER"and Color3.fromRGB(54,38,48)or Color3.fromRGB(47,83,108)
 local pants=role=="MONSTER"and Color3.fromRGB(37,30,37)or Color3.fromRGB(38,45,57)
 for _,d in ipairs(model:GetDescendants())do
  if d:IsA("BasePart")then
   d.Anchored=d==rootPart
   d.CanCollide=false;d.CanTouch=false;d.CanQuery=false;d.Massless=d~=rootPart
   if d~=rootPart then
    if d.Name=="Head"or d.Name:find("Hand")or d.Name:find("LowerArm")then d.Color=skin
    elseif d.Name:find("UpperTorso")or d.Name:find("LowerTorso")or d.Name:find("UpperArm")then d.Color=shirt
    elseif d.Name:find("Leg")or d.Name:find("Foot")then d.Color=pants end
    d.Material=Enum.Material.SmoothPlastic
   end
  elseif d:IsA("Script")or d:IsA("LocalScript")then d:Destroy()end
 end
 if rootPart then rootPart.Transparency=1 end

 local function accessory(name,body,size,offset,color,material)
  if not body then return nil end
  local x=Instance.new("Part");x.Name=name;x.Size=size;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic
  x.CanCollide=false;x.CanTouch=false;x.CanQuery=false;x.Massless=true;x.CFrame=body.CFrame*CFrame.new(offset);x.Parent=model
  local weld=Instance.new("WeldConstraint");weld.Part0=body;weld.Part1=x;weld.Parent=x
  return x
 end
 local head=model:FindFirstChild("Head")
 local torso=model:FindFirstChild("UpperTorso")
 if role=="SURVIVOR"then
  accessory("AIHair",head,Vector3.new(2.05,.52,1.9),Vector3.new(0,.82,.08),Color3.fromRGB(45,35,32),Enum.Material.Fabric)
  accessory("AIJacketStripe",torso,Vector3.new(.24,1.8,1.12),Vector3.new(0,.1,-.58),Color3.fromRGB(91,205,220),Enum.Material.Neon)
 end

 local hi=Instance.new("Highlight");hi.Name="AIRoleHighlight";hi.FillTransparency=role=="MONSTER"and .82 or .94;hi.OutlineTransparency=.48
 hi.FillColor=role=="MONSTER"and Color3.fromRGB(120,42,58)or Color3.fromRGB(75,143,169)
 hi.OutlineColor=role=="MONSTER"and Color3.fromRGB(225,86,103)or Color3.fromRGB(142,213,235)
 hi.Parent=model

 local walkTrack=nil
 if humanoid then
  local animator=humanoid:FindFirstChildOfClass("Animator")or Instance.new("Animator")
  animator.Parent=humanoid
  local animation=Instance.new("Animation")
  animation.AnimationId="rbxassetid://507777826"
  local loaded,track=pcall(function()return animator:LoadAnimation(animation)end)
  animation:Destroy()
  if loaded and track then
   track.Looped=true
   track.Priority=Enum.AnimationPriority.Movement
   track:Play(.15,1,role=="MONSTER"and 1.15 or 1)
   walkTrack=track
  end
 end
 model:PivotTo(CFrame.new(pos))
 return model,rootPart,walkTrack
end

local function setBotCFrame(b,cf)
 if b.model and b.model.Parent then b.model:PivotTo(cf)
 elseif b.part then b.part.CFrame=cf end
end

local function bot(role,pos)
 botSequence+=1
 local monsterId="DRACULA"
 local humanFormId="BROADCAST"
 if role=="MONSTER"and C.MonsterForms and #C.MonsterForms>0 then
  monsterId=C.MonsterForms[((botSequence-1)%#C.MonsterForms)+1].Id or"DRACULA"
 elseif role=="SURVIVOR"and C.HumanForms and #C.HumanForms>0 then
  humanFormId=C.HumanForms[((botSequence-1)%#C.HumanForms)+1].Id or"BROADCAST"
 end
 local model,p,walkTrack=createBotAvatar(role,pos)
 local visuals={}
 if not p then
  p=Instance.new("Part");p.Name=role=="MONSTER"and"AI_MONSTER"or"AI_SURVIVOR";p.Anchored=true;p.CanCollide=false;p.CanTouch=false;p.Size=Vector3.new(2.8,3.6,1.9);p.Position=pos;p.Transparency=.18
  p.Color=role=="MONSTER"and Color3.fromRGB(65,34,44)or Color3.fromRGB(66,94,108);p.Material=Enum.Material.Fabric;p.Parent=arena
 end
 if role=="MONSTER"then
  visuals=decorateClassicMonster(p,monsterId)
  if model then model.Name="AI_MONSTER_"..monsterId end
 else
  visuals=decorateHumanBot(p,humanFormId)
  if model then model.Name="AI_SURVIVOR_"..humanFormId end
 end
 local b={
  part=p,model=model,animationTrack=walkTrack,role=role,
  speed=role=="MONSTER"and 18 or 14,baseSpeed=role=="MONSTER"and 18 or 14,
  monsterId=monsterId,humanFormId=humanFormId,visuals=visuals,
  infectReadyAt=0,purifyReadyAt=0,infectAttackReadyAt=0,abilityReadyAt=0,dashReadyAt=0,
  energy=energyMax(),motionClock=math.random()*6.28,tacticSlot=botSequence,
  decisionAt=0,speedResetAt=0,currentTargetKey=nil,targetLockUntil=0,patrolTarget=nil,patrolRefreshAt=0,patrolCycle=0,
 }
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
 local x=Instance.new("Part");x.Name=name;x:SetAttribute("MonsterCostume",true);x.Size=size;x.Color=color;x.Material=material or Enum.Material.SmoothPlastic;x.CanCollide=false;x.CanTouch=false;x.CanQuery=false;x.Massless=true
 if shape then x.Shape=shape end;x.CFrame=base.CFrame*CFrame.new(offset);x.Parent=character
 local w=Instance.new("WeldConstraint");w.Part0=base;w.Part1=x;w.Parent=x;return x
end
local function costumeGlow(part,color,range,brightness)
 local light=Instance.new("PointLight");light.Color=color;light.Range=range or 8;light.Brightness=brightness or 1;light.Shadows=false;light.Parent=part
end
local function applyClassicCostume(character,id)
 local torso=character:FindFirstChild("UpperTorso")or character:FindFirstChild("Torso")or character:FindFirstChild("HumanoidRootPart")
 local rootPart=character:FindFirstChild("HumanoidRootPart")or torso
 local head=character:FindFirstChild("Head")or torso
 local leftHand=character:FindFirstChild("LeftHand")or character:FindFirstChild("LeftLowerArm")or character:FindFirstChild("Left Arm")or torso
 local rightHand=character:FindFirstChild("RightHand")or character:FindFirstChild("RightLowerArm")or character:FindFirstChild("Right Arm")or torso
 if not torso or not head or not rootPart then return end

 if id=="DRACULA"then
  costumePart(character,torso,"Cape",Vector3.new(5.8,6.6,.42),Vector3.new(0,-.15,1.55),Color3.fromRGB(20,8,17),Enum.Material.Fabric)
  costumePart(character,torso,"CapeWingL",Vector3.new(2.5,5.2,.28),Vector3.new(-2.05,-.15,1.55),Color3.fromRGB(47,9,21),Enum.Material.Fabric)
  costumePart(character,torso,"CapeWingR",Vector3.new(2.5,5.2,.28),Vector3.new(2.05,-.15,1.55),Color3.fromRGB(47,9,21),Enum.Material.Fabric)
  costumePart(character,torso,"Collar",Vector3.new(6,1.4,1.1),Vector3.new(0,2.35,.42),Color3.fromRGB(118,16,38),Enum.Material.Fabric)
  costumePart(character,torso,"VampireVest",Vector3.new(3.25,3.5,.3),Vector3.new(0,.1,-1.08),Color3.fromRGB(72,11,25),Enum.Material.Fabric)
  costumePart(character,head,"VampireHair",Vector3.new(2.55,.72,2.2),Vector3.new(0,.95,.12),Color3.fromRGB(14,12,15),Enum.Material.Fabric)
  costumePart(character,head,"FangL",Vector3.new(.22,.82,.22),Vector3.new(-.38,-.5,-.72),Color3.fromRGB(246,246,235))
  costumePart(character,head,"FangR",Vector3.new(.22,.82,.22),Vector3.new(.38,-.5,-.72),Color3.fromRGB(246,246,235))
  local eyeL=costumePart(character,head,"BloodEyeL",Vector3.new(.2,.17,.12),Vector3.new(-.4,.2,-.72),Color3.fromRGB(239,35,55),Enum.Material.Neon)
  local eyeR=costumePart(character,head,"BloodEyeR",Vector3.new(.2,.17,.12),Vector3.new(.4,.2,-.72),Color3.fromRGB(239,35,55),Enum.Material.Neon)
  costumeGlow(eyeL,eyeL.Color,7,.9);costumeGlow(eyeR,eyeR.Color,7,.9)
  local gem=costumePart(character,torso,"BloodMedallion",Vector3.new(.72,.9,.26),Vector3.new(0,.75,-1.22),Color3.fromRGB(212,35,54),Enum.Material.Neon)
  costumeGlow(gem,gem.Color,7,.8)

 elseif id=="FRANKENSTEIN"then
  costumePart(character,head,"FrankenBrow",Vector3.new(2.9,.5,.48),Vector3.new(0,.6,-.68),Color3.fromRGB(45,58,47),Enum.Material.SmoothPlastic)
  costumePart(character,head,"BoltL",Vector3.new(.52,.52,1.55),Vector3.new(-1.4,-.15,0),Color3.fromRGB(164,171,173),Enum.Material.Metal)
  costumePart(character,head,"BoltR",Vector3.new(.52,.52,1.55),Vector3.new(1.4,-.15,0),Color3.fromRGB(164,171,173),Enum.Material.Metal)
  costumePart(character,torso,"Shoulders",Vector3.new(6.4,1.45,2.5),Vector3.new(0,1.45,0),Color3.fromRGB(58,72,59),Enum.Material.Metal)
  costumePart(character,torso,"ChestPlate",Vector3.new(3.8,3.5,.5),Vector3.new(0,.15,-1.12),Color3.fromRGB(53,67,56),Enum.Material.Metal)
  local core=costumePart(character,torso,"ElectricCore",Vector3.new(1,1.45,.3),Vector3.new(0,.3,-1.42),Color3.fromRGB(134,246,112),Enum.Material.Neon)
  costumeGlow(core,core.Color,10,1.35)
  for i=-1,1 do
   local stitch=costumePart(character,head,"FaceStitch"..i,Vector3.new(.58,.09,.09),Vector3.new(i*.5,.05,-.78),Color3.fromRGB(32,39,33),Enum.Material.Metal)
   stitch.Orientation=Vector3.new(0,0,i*18)
  end
  costumePart(character,torso,"FrankenCableL",Vector3.new(.18,3.1,.18),Vector3.new(-1.55,-.5,.9),Color3.fromRGB(77,126,70),Enum.Material.Neon)
  costumePart(character,torso,"FrankenCableR",Vector3.new(.18,3.1,.18),Vector3.new(1.55,-.5,.9),Color3.fromRGB(77,126,70),Enum.Material.Neon)
  costumePart(character,head,"FrankenJaw",Vector3.new(2.4,.55,.85),Vector3.new(0,-.75,-.45),Color3.fromRGB(91,118,82),Enum.Material.SmoothPlastic)

 elseif id=="WEREWOLF"then
  costumePart(character,head,"WolfEarL",Vector3.new(1,2,.85),Vector3.new(-.82,1.55,0),Color3.fromRGB(87,60,46),Enum.Material.SmoothPlastic,Enum.PartType.Wedge)
  costumePart(character,head,"WolfEarR",Vector3.new(1,2,.85),Vector3.new(.82,1.55,0),Color3.fromRGB(87,60,46),Enum.Material.SmoothPlastic,Enum.PartType.Wedge)
  costumePart(character,head,"WolfMuzzle",Vector3.new(2,1.15,2.1),Vector3.new(0,-.05,-1.05),Color3.fromRGB(126,89,64),Enum.Material.SmoothPlastic)
  costumePart(character,head,"WolfNose",Vector3.new(.72,.52,.55),Vector3.new(0,.05,-2.05),Color3.fromRGB(25,22,21),Enum.Material.SmoothPlastic)
  local eyeL=costumePart(character,head,"WolfEyeL",Vector3.new(.2,.16,.11),Vector3.new(-.4,.3,-.78),Color3.fromRGB(243,178,67),Enum.Material.Neon)
  local eyeR=costumePart(character,head,"WolfEyeR",Vector3.new(.2,.16,.11),Vector3.new(.4,.3,-.78),Color3.fromRGB(243,178,67),Enum.Material.Neon)
  costumeGlow(eyeL,eyeL.Color,6,.75);costumeGlow(eyeR,eyeR.Color,6,.75)
  costumePart(character,torso,"WolfBackFur",Vector3.new(4,4.8,.9),Vector3.new(0,.4,1.3),Color3.fromRGB(70,51,42),Enum.Material.Fabric)
  local tail=costumePart(character,rootPart,"WolfTail",Vector3.new(.9,4.5,.9),Vector3.new(0,-1.25,2),Color3.fromRGB(83,58,45),Enum.Material.Fabric)
  tail.Orientation=Vector3.new(32,0,0)
  for i=-1,1 do
   local l=costumePart(character,leftHand,"LeftClaw"..i,Vector3.new(.17,.17,1),Vector3.new(i*.2,-.15,-.62),Color3.fromRGB(229,214,184),Enum.Material.SmoothPlastic)
   local r=costumePart(character,rightHand,"RightClaw"..i,Vector3.new(.17,.17,1),Vector3.new(i*.2,-.15,-.62),Color3.fromRGB(229,214,184),Enum.Material.SmoothPlastic)
   l.Orientation=Vector3.new(-15,0,0);r.Orientation=Vector3.new(-15,0,0)
  end

 elseif id=="MUMMY"then
  for i=-3,3 do
   local wrap=costumePart(character,torso,"Bandage"..i,Vector3.new(4.45,.5,2.35),Vector3.new(0,i*.5,0),i%2==0 and Color3.fromRGB(215,203,165)or Color3.fromRGB(184,173,140),Enum.Material.Fabric)
   wrap.Orientation=Vector3.new(0,0,i*3)
  end
  costumePart(character,head,"MummyWrapA",Vector3.new(2.45,.58,2.35),Vector3.new(0,.35,0),Color3.fromRGB(209,197,161),Enum.Material.Fabric)
  costumePart(character,head,"MummyWrapB",Vector3.new(2.5,.52,2.3),Vector3.new(0,-.38,0),Color3.fromRGB(190,178,145),Enum.Material.Fabric)
  costumePart(character,head,"MummyEyeSlit",Vector3.new(1.8,.42,.18),Vector3.new(0,.12,-1.16),Color3.fromRGB(52,42,29),Enum.Material.SmoothPlastic)
  local eyeL=costumePart(character,head,"CurseEyeL",Vector3.new(.18,.12,.1),Vector3.new(-.35,.12,-1.28),Color3.fromRGB(232,193,86),Enum.Material.Neon)
  local eyeR=costumePart(character,head,"CurseEyeR",Vector3.new(.18,.12,.1),Vector3.new(.35,.12,-1.28),Color3.fromRGB(232,193,86),Enum.Material.Neon)
  costumeGlow(eyeL,eyeL.Color,6,.7);costumeGlow(eyeR,eyeR.Color,6,.7)
  costumePart(character,torso,"LooseBandageL",Vector3.new(.5,4.3,.34),Vector3.new(-2.05,-1.05,.3),Color3.fromRGB(204,192,156),Enum.Material.Fabric)
  costumePart(character,torso,"LooseBandageR",Vector3.new(.5,3.5,.34),Vector3.new(2.05,-.75,.4),Color3.fromRGB(183,172,139),Enum.Material.Fabric)
  local scarab=costumePart(character,torso,"CurseScarab",Vector3.new(1,1,.25),Vector3.new(0,.65,-1.18),Color3.fromRGB(226,188,92),Enum.Material.Neon)
  costumeGlow(scarab,scarab.Color,8,.9)

 elseif id=="GRIM_REAPER"then
  costumePart(character,torso,"ReaperCloak",Vector3.new(5.7,6.6,3),Vector3.new(0,-.2,.45),Color3.fromRGB(20,16,27),Enum.Material.Fabric)
  costumePart(character,torso,"ReaperShoulderL",Vector3.new(2.6,1.4,2.2),Vector3.new(-2.15,1.45,.1),Color3.fromRGB(31,24,42),Enum.Material.Fabric)
  costumePart(character,torso,"ReaperShoulderR",Vector3.new(2.6,1.4,2.2),Vector3.new(2.15,1.45,.1),Color3.fromRGB(31,24,42),Enum.Material.Fabric)
  costumePart(character,head,"ReaperHood",Vector3.new(3.8,3.9,3.8),Vector3.new(0,.35,0),Color3.fromRGB(16,12,23),Enum.Material.Fabric,Enum.PartType.Ball)
  costumePart(character,head,"ReaperFaceVoid",Vector3.new(2.3,2.25,.55),Vector3.new(0,.1,-1.38),Color3.fromRGB(3,3,6),Enum.Material.Neon)
  local eyeL=costumePart(character,head,"VoidEyeL",Vector3.new(.2,.15,.12),Vector3.new(-.38,.3,-1.7),Color3.fromRGB(169,84,255),Enum.Material.Neon)
  local eyeR=costumePart(character,head,"VoidEyeR",Vector3.new(.2,.15,.12),Vector3.new(.38,.3,-1.7),Color3.fromRGB(169,84,255),Enum.Material.Neon)
  costumeGlow(eyeL,eyeL.Color,8,1);costumeGlow(eyeR,eyeR.Color,8,1)
  costumePart(character,torso,"ScytheStaff",Vector3.new(.45,7.5,.45),Vector3.new(3.05,0,0),Color3.fromRGB(69,58,52),Enum.Material.Wood)
  local blade=costumePart(character,torso,"ScytheBlade",Vector3.new(.5,3.9,2.7),Vector3.new(3.05,3.35,-1.2),Color3.fromRGB(190,197,205),Enum.Material.Metal)
  blade.Orientation=Vector3.new(0,0,60)
  costumePart(character,torso,"ShadowChainL",Vector3.new(.16,3.8,.16),Vector3.new(-1.65,-.65,.8),Color3.fromRGB(91,51,138),Enum.Material.Neon)
  costumePart(character,torso,"ShadowChainR",Vector3.new(.16,3.8,.16),Vector3.new(1.65,-.65,.8),Color3.fromRGB(91,51,138),Enum.Material.Neon)
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
 b.role="MONSTER";b.part.Name="AI_MONSTER";b.speed=18;b.infectReadyAt=os.clock()+2.5;if b.animationTrack then b.animationTrack:AdjustSpeed(1.15)end
 local monsterId="DRACULA"
 if C.MonsterForms and #C.MonsterForms>0 then monsterId=C.MonsterForms[math.random(1,#C.MonsterForms)].Id or"DRACULA"end
 b.monsterId=monsterId
 local monsterStyle=Style.Monsters[monsterId]or Style.Monsters.DRACULA
 if b.model and b.model.Parent then
  b.model.Name="AI_MONSTER_"..monsterId
  for _,d in ipairs(b.model:GetDescendants())do if d:IsA("BasePart")and d~=b.part and d:GetAttribute("MonsterCostume")~=true then d.Color=monsterStyle.Color;d.Material=Enum.Material.Fabric end end
  local hi=b.model:FindFirstChild("AIRoleHighlight");if hi and hi:IsA("Highlight")then hi.FillTransparency=.72;hi.FillColor=monsterStyle.Color;hi.OutlineColor=monsterStyle.Accent end
 else
  b.part.Color=monsterStyle.Color;b.part.Material=Enum.Material.Fabric
 end
 if b.visuals then for _,v in ipairs(b.visuals)do if v.part and v.part.Parent then v.part:Destroy()end end end
 b.visuals=decorateClassicMonster(b.part,monsterId)
 if sourcePlayer then awardContribution(sourcePlayer,(C.Reward and C.Reward.InfectAICoins)or 1)end
 return true
end
local function monsterPos()
 local list=monsterPositions();return list[1]
end
local function configure(h,survivorOrder,monsterOrder,nextSurvivor,nextMonster)
 clearBots()
 local realHumans,realMonsters=0,0
 for _,p in ipairs(h)do if p:GetAttribute("Role")=="MONSTER"then realMonsters+=1 elseif p:GetAttribute("Role")=="SURVIVOR"then realHumans+=1 end end
 local monsterNeed=math.max(0,(C.MonsterSlots or 4)-realMonsters)
 local humanNeed=math.max(0,(C.SurvivorSlots or 4)-realHumans)
 for i=1,monsterNeed do
  local index=((nextMonster+i-2)%#monsterOrder)+1
  bot("MONSTER",monsterOrder[index])
 end
 for i=1,humanNeed do
  local index=((nextSurvivor+i-2)%#survivorOrder)+1
  bot("SURVIVOR",survivorOrder[index])
 end
 local hc,mc=teamCounts();workspace:SetAttribute("ActivePopulation",hc+mc);workspace:SetAttribute("AIBotCount",#bots);workspace:SetAttribute("HumanCount",hc);workspace:SetAttribute("MonsterCount",mc)
end
local function startRound()
 local all=Players:GetPlayers();if #all==0 then return false end
 table.sort(all,function(a,b)return(roomJoinedAt[a]or 0)<(roomJoinedAt[b]or 0)end)
 local h={}
 local overflow={}
 for i,p in ipairs(all)do
  if i<=C.TargetPopulation then table.insert(h,p)else table.insert(overflow,p)end
 end
 if #overflow>0 and not studioRoomFallback then
  task.spawn(function()createQueuedReservedRoom(overflow,roomSelectedMapId)end)
 end
 local map=mapById(roomSelectedMapId)
 for i,row in ipairs(C.Maps or{})do if row.Id==map.Id then currentMapIndex=i;break end end
 local existing=workspace:FindFirstChild("MidnightArena")
 if existing and workspace:GetAttribute("MapReady")==true and workspace:GetAttribute("CurrentMapId")==map.Id then arena=existing else arena=ensureArena(map)end
 if not arena or workspace:GetAttribute("MapReady")~=true then arena=makeFallbackArena(map,"START_ROUND_NOT_READY")end
 local startingMonsters=selectStartingMonsters(h)
 objectiveState.round+=1;objectiveState.done=0;objectiveState.total=C.ObjectiveCount
 escapedPlayers={};workspace:SetAttribute("EscapeUnlocked",false);workspace:SetAttribute("SurvivorEscapeTriggered",false)
 local survivorOrder=shuffledSpawns(survivorSpawns)
 local monsterOrder=shuffledSpawns(monsterSpawns)
 local si,mi=1,1
 for _,p in ipairs(h)do
  p:SetAttribute("CurrentMap",map.Name);p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
  p:SetAttribute("ObjectivesDone",0);p:SetAttribute("ObjectivesTotal",C.ObjectiveCount);p:SetAttribute("Escaped",false);p:SetAttribute("Infected",false);p:SetAttribute("InfectionReadyAt",0);p:SetAttribute("RoundScore",0)
  p:SetAttribute("PurifyReadyAt",0);p:SetAttribute("DashReadyAt",0);p:SetAttribute("HumanAbilityReadyAt",0);p:SetAttribute("InfectReadyAt",0);p:SetAttribute("AbilityReadyAt",0);p:SetAttribute("Spectating",false)
  p:SetAttribute("FalseAlarmUntil",0);p:SetAttribute("BlackoutUntil",0);p:SetAttribute("HuntFlashUntil",0);p:SetAttribute("AbilityFeedback","");p:SetAttribute("HumanAbilityFeedback","");p:SetAttribute("RageUntil",0)
  setEnergy(p,energyMax());p:SetAttribute("EnergyFeedback","")
  p:SetAttribute("RoundContributionCoins",0);p:SetAttribute("LastRoundBaseReward",0);p:SetAttribute("LastRoundWinBonus",0);p:SetAttribute("LastRoundContribution",0)
  p:SetAttribute("RoundParticipant",true)
  ghostSeenThisRound[p]={_count=0}
  p:SetAttribute("CelebrationName","");p:SetAttribute("CelebrationCaption","");p:SetAttribute("CelebrationWinner",false);p:SetAttribute("CelebrationComic",false)
  local role=startingMonsters[p]and"MONSTER"or"SURVIVOR";setRole(p,role);p:SetAttribute("RoundState","RUNNING")
  if role=="MONSTER"then
   teleport(p,monsterOrder[((mi-1)%#monsterOrder)+1]);mi+=1
  else
   teleport(p,survivorOrder[((si-1)%#survivorOrder)+1]);si+=1
  end
 end
 configure(h,survivorOrder,monsterOrder,si,mi)
 local startHumans,startMonsters=teamCounts();pressureLastCounts.SURVIVOR=startHumans;pressureLastCounts.MONSTER=startMonsters
 state="RUNNING";timeLeft=C.RoundSeconds;syncLobbyState("RUNNING");return true
end
local function chooseCelebration(winner)
 local pool=(C.Celebrations and C.Celebrations[winner])or(C.Celebrations and C.Celebrations.DRAW)or{}
 if #pool==0 then return{Id="DEFAULT",Name="팀 세레머니",Emote="cheer",ComicEmote="laugh",Caption="다음 판 준비"}end
 return pool[math.random(1,#pool)]
end
local function playCelebrationEmote(player,celebration)
 local h=hum(player);if not h then return end
 local emote=celebration.Emote
 if typeof(emote)~="string"or emote==""then return end
 pcall(function()h:PlayEmote(emote)end)
end

local function stageResultCeremony(winner,celebrationPlayers)
 local cameraPos=Vector3.new(0,7.2,32)
 local focusPos=Vector3.new(0,3.8,12)
 local slots={-7.5,-2.5,2.5,7.5}
 local entries={}
 for _,player in ipairs(celebrationPlayers)do table.insert(entries,{player=player})end
 for _,b in ipairs(bots)do
  if winner=="DRAW"or b.role==winner then table.insert(entries,{bot=b})end
 end
 while #entries>4 do table.remove(entries)end
 workspace:SetAttribute("CelebrationCameraPosition",cameraPos)
 workspace:SetAttribute("CelebrationFocusPosition",focusPos)
 workspace:SetAttribute("CelebrationStagedCount",#entries)

 for i,row in ipairs(entries)do
  local x=slots[i]or 0
  local pos=Vector3.new(x,3,12)
  if row.player then
   teleport(row.player,pos,cameraPos)
   speed(row.player,0)
  elseif row.bot and row.bot.part and row.bot.part.Parent then
   local grounded=Vector3.new(pos.X,row.bot.part.Position.Y,pos.Z)
   setBotCFrame(row.bot,CFrame.lookAt(grounded,Vector3.new(cameraPos.X,grounded.Y,cameraPos.Z)))
  end
 end
 return entries
end

local function animateCelebratingBots(winner,duration,entries)
 local bases={}
 for _,row in ipairs(entries or{})do
  local b=row.bot
  if b and b.part and b.part.Parent then bases[b]={cf=b.part.CFrame,phase=math.random()*math.pi*2}end
 end
 if next(bases)==nil then return end
 task.spawn(function()
  local started=os.clock()
  while state=="RESULT"and os.clock()-started<duration do
   local t=os.clock()-started
   for b,row in pairs(bases)do
    if b.part and b.part.Parent then
     local sway=math.rad(math.sin(t*2.2+row.phase)*(winner=="MONSTER"and 5 or 2))
     local lean=winner=="MONSTER"and math.rad(-7)or math.rad(-2)
     local lift=winner=="SURVIVOR"and math.max(0,math.sin(t*2+row.phase))*.08 or 0
     setBotCFrame(b,row.cf*CFrame.new(0,lift,0)*CFrame.Angles(lean,0,sway))
    end
   end
   task.wait(.08)
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
 workspace:SetAttribute("CelebrationWinnerTeam",winner)
 workspace:SetAttribute("CelebrationName",celebration.Name or"팀 세레머니")
 workspace:SetAttribute("CelebrationCaption",celebration.Caption or"")
 local aiWinners=0
 for _,b in ipairs(bots)do if winner=="DRAW"or b.role==winner then aiWinners+=1 end end
 workspace:SetAttribute("CelebrationAIWinners",aiWinners)
 local stagedEntries=stageResultCeremony(winner,celebrationPlayers)
 animateCelebratingBots(winner,math.max(1,(C.ResultSeconds or 6)-1),stagedEntries)
 remote:FireAllClients("RESULT_CEREMONY_STAGE",{
  Winner=winner,Name=celebration.Name or"결과",Caption=celebration.Caption or"",
  CameraPosition=workspace:GetAttribute("CelebrationCameraPosition"),
  FocusPosition=workspace:GetAttribute("CelebrationFocusPosition"),
  StagedCount=#stagedEntries,
 })
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
  p:SetAttribute("PurifyReadyAt",0);p:SetAttribute("DashReadyAt",0);p:SetAttribute("HumanAbilityReadyAt",0);p:SetAttribute("InfectReadyAt",0);p:SetAttribute("AbilityReadyAt",0);p:SetAttribute("Spectating",false)
  p:SetAttribute("FalseAlarmUntil",0);p:SetAttribute("BlackoutUntil",0);p:SetAttribute("HuntFlashUntil",0);p:SetAttribute("AbilityFeedback","");p:SetAttribute("HumanAbilityFeedback","");p:SetAttribute("RageUntil",0)
  setEnergy(p,energyMax());p:SetAttribute("EnergyFeedback","")
  p:SetAttribute("CelebrationName",celebration.Name or"팀 세레머니");p:SetAttribute("CelebrationCaption",celebration.Caption or"")
  local celebrate=participated and(winner=="DRAW"or win)
  p:SetAttribute("CelebrationWinner",winner~="DRAW"and win);p:SetAttribute("CelebrationComic",false)
  if celebrate then playCelebrationEmote(p,celebration)end
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
 workspace:SetAttribute("CelebrationWinnerTeam","");workspace:SetAttribute("CelebrationName","");workspace:SetAttribute("CelebrationCaption","");workspace:SetAttribute("CelebrationAIWinners",0);workspace:SetAttribute("CelebrationStagedCount",0)
 local players=Players:GetPlayers();table.sort(players,function(a,b)return a.UserId<b.UserId end)
 for i,p in ipairs(players)do
  p:SetAttribute("RoundState",roomServer and "ROOM_WAITING"or"ROOM_BROWSER")
  teleport(p,lobbySpawns[((i-1)%#lobbySpawns)+1])
 end
 if refreshPhysicalLobby then refreshPhysicalLobby()end
end
local purifyCooldown={}
local function removeBot(target)
 for i=#bots,1,-1 do
  if bots[i]==target then
   local b=bots[i];if b.visuals then for _,v in ipairs(b.visuals)do if v.part then v.part:Destroy()end end end
   if b.model and b.model.Parent then b.model:Destroy()elseif b.part then b.part:Destroy()end;table.remove(bots,i);return true
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
local function humanAbilityProfile(formInfo)
 local abilityId=formInfo and formInfo.ActiveAbility or nil
 local profile=abilityId and C.HumanAbilities and C.HumanAbilities[abilityId]or nil
 return abilityId,profile
end

local function humanAbilityTargets(origin,radius)
 local rows={}
 for _,player in ipairs(Players:GetPlayers())do
  if player:GetAttribute("Role")=="MONSTER"then
   local rr=root(player)
   if rr then
    local distance=(rr.Position-origin).Magnitude
    if distance<=radius then table.insert(rows,{player=player,pos=rr.Position,distance=distance})end
   end
  end
 end
 for _,b in ipairs(bots)do
  if b.role=="MONSTER"and b.part and b.part.Parent then
   local distance=(b.part.Position-origin).Magnitude
   if distance<=radius then table.insert(rows,{bot=b,pos=b.part.Position,distance=distance})end
  end
 end
 table.sort(rows,function(a,b)return a.distance<b.distance end)
 return rows
end

local function applyHumanControlTarget(row,slowSpeed,duration)
 if row.player then
  speed(row.player,slowSpeed)
  task.delay(duration,function()if row.player.Parent and row.player:GetAttribute("Role")=="MONSTER"then speed(row.player,19)end end)
 elseif row.bot then
  row.bot.speed=math.min(row.bot.speed or row.bot.baseSpeed or 18,slowSpeed)
  row.bot.speedResetAt=math.max(row.bot.speedResetAt or 0,os.clock()+duration)
 end
end

local function humanAbility(p)
 if state~="RUNNING"or p:GetAttribute("Role")~="SURVIVOR"then return end
 local formInfo=humanForm(p)
 local abilityId,profile=humanAbilityProfile(formInfo)
 if not abilityId or not profile then return end
 local rr=root(p);if not rr then return end
 local now=os.clock()
 local cooldownSeconds=math.max(1,tonumber(profile.Cooldown)or 8)
 local last=humanAbilityCooldown[p]
 if last and now-last<cooldownSeconds then return end
 local radius=math.max(1,tonumber(profile.Radius)or tonumber(profile.Range)or 12)
 local rows=humanAbilityTargets(rr.Position,radius)
 if #rows==0 then p:SetAttribute("EnergyFeedback","NO_TARGET:HUMAN_ABILITY");return end
 local cost=math.max(0,tonumber(profile.Cost)or 30)
 if not spendEnergy(p,cost,"HUMAN_ABILITY")then return end
 humanAbilityCooldown[p]=now
 p:SetAttribute("HumanAbilityReadyAt",workspace:GetServerTimeNow()+cooldownSeconds)
 local targetPos=rows[1]and rows[1].pos or nil

 if abilityId=="SIGNAL_JAM"then
  local drain=math.max(0,tonumber(profile.EnergyDrain)or 20)
  for _,row in ipairs(rows)do
   if row.player then setEnergy(row.player,energyOf(row.player)-drain)
   elseif row.bot then row.bot.energy=math.max(0,(row.bot.energy or 0)-drain)end
  end
 elseif abilityId=="OVERLOAD"or abilityId=="CAMERA_FLASH"or abilityId=="SHOCK_BATON"then
  local slowSpeed=math.max(0,tonumber(profile.SlowSpeed)or 10)
  local duration=math.max(.2,tonumber(profile.Duration)or 1.2)
  for _,row in ipairs(rows)do applyHumanControlTarget(row,slowSpeed,duration)end
 elseif abilityId=="IMPACT_BAG"then
  local row=rows[1]
  local force=math.max(10,tonumber(profile.Knockback)or 42)
  if row then
   local delta=row.pos-rr.Position
   local flat=Vector3.new(delta.X,0,delta.Z)
   if flat.Magnitude>.01 then
    local dir=flat.Unit
    if row.player then
     local targetRoot=root(row.player)
     if targetRoot then
      movementGraceUntil[row.player]=now+.55
      targetRoot.AssemblyLinearVelocity=dir*force+Vector3.new(0,4,0)
     end
    elseif row.bot then
     local step=math.min(8,force*.14)
     local current=row.bot.part.Position
     local target=current+dir*step
     setBotCFrame(row.bot,CFrame.lookAt(target,target+dir))
    end
   end
  end
 end
 local stamp=tostring(math.floor(now*1000))
 p:SetAttribute("HumanAbilityFeedback",(profile.Name or abilityId)..":"..stamp)
 p:SetAttribute("FeedbackEvent","HUMAN_ABILITY:"..abilityId..":"..stamp)
 remote:FireAllClients("HUMAN_ABILITY_EFFECT",{
  Ability=abilityId,Effect=profile.Effect or abilityId,FormId=formInfo.Id,
  Origin=rr.Position,Target=targetPos,UserId=p.UserId,Stamp=stamp,
 })
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
 movementGraceUntil[p]=now+.9
 local stamp=tostring(math.floor(now*1000))
 local infectedAbility=p:GetAttribute("Infected")==true and humanForm(p).InfectedAbility or nil
 local profile=infectedAbility and C.InfectedAbilities and C.InfectedAbilities[infectedAbility]or nil

 if infectedAbility and profile then
  local radius=math.max(4,tonumber(profile.Radius)or 24)
  local duration=math.max(.5,tonumber(profile.Duration)or 2.5)
  if infectedAbility=="RUSH"then
   local boosted=math.max(20,tonumber(profile.Speed)or 27)
   speed(p,boosted)
   task.delay(duration,function()if p.Parent and p:GetAttribute("Role")=="MONSTER"then speed(p,19)end end)
  elseif infectedAbility=="BREACH"then
   local velocity=math.max(60,tonumber(profile.Velocity)or 96)
   local lift=tonumber(profile.Lift)or 3
   r.AssemblyLinearVelocity=r.CFrame.LookVector*velocity+Vector3.new(0,lift,0)
  elseif infectedAbility=="FALSE_ALARM"then
   for _,o in ipairs(Players:GetPlayers())do
    if o~=p and o:GetAttribute("Role")=="SURVIVOR"then
     local q=root(o)
     if q and(q.Position-r.Position).Magnitude<=radius then o:SetAttribute("FalseAlarmUntil",workspace:GetServerTimeNow()+duration)end
    end
   end
  elseif infectedAbility=="BLACKOUT"then
   for _,o in ipairs(Players:GetPlayers())do
    if o:GetAttribute("Role")=="SURVIVOR"then
     local q=root(o)
     if q and(q.Position-r.Position).Magnitude<=radius then
      o:SetAttribute("BlackoutUntil",workspace:GetServerTimeNow()+duration)
      speed(o,13)
      task.delay(duration,function()if o.Parent and o:GetAttribute("Role")=="SURVIVOR"then speed(o,16)end end)
     end
    end
   end
   for _,b in ipairs(bots)do
    if b.role=="SURVIVOR"and(b.part.Position-r.Position).Magnitude<=radius then
     local previous=b.speed;b.speed=math.min(previous,11)
     task.delay(duration,function()if b and b.role=="SURVIVOR"then b.speed=previous end end)
    end
   end
  elseif infectedAbility=="HUNT_FLASH"then
   local slow=math.clamp(tonumber(profile.SlowSpeed)or 11,6,15)
   for _,o in ipairs(Players:GetPlayers())do
    if o:GetAttribute("Role")=="SURVIVOR"then
     local q=root(o)
     if q and(q.Position-r.Position).Magnitude<=radius then
      o:SetAttribute("HuntFlashUntil",workspace:GetServerTimeNow()+duration)
      speed(o,slow)
      task.delay(duration,function()if o.Parent and o:GetAttribute("Role")=="SURVIVOR"then speed(o,16)end end)
     end
    end
   end
   for _,b in ipairs(bots)do
    if b.role=="SURVIVOR"and(b.part.Position-r.Position).Magnitude<=radius then
     local previous=b.speed;b.speed=math.min(previous,slow)
     task.delay(duration,function()if b and b.role=="SURVIVOR"then b.speed=previous end end)
    end
   end
  end
  p:SetAttribute("AbilityFeedback",(profile.Name or infectedAbility)..":"..stamp)
  p:SetAttribute("FeedbackEvent","ABILITY:"..infectedAbility..":"..stamp)
  return
 end

 local f=form(p)
 local abilityProfile=(C.MonsterAbilities and C.MonsterAbilities[f.Ability])or{}
 local origin=r.Position
 local look=r.CFrame.LookVector
 local effectTarget=nil
 if f.Ability=="BAT_DASH"then
  local velocity=tonumber(abilityProfile.Velocity)or 70
  local drainRadius=tonumber(abilityProfile.DrainRadius)or 10
  local drain=tonumber(abilityProfile.EnergyDrain)or 12
  r.AssemblyLinearVelocity=look*velocity+Vector3.new(0,r.AssemblyLinearVelocity.Y,0)
  for _,o in ipairs(Players:GetPlayers())do
   if o:GetAttribute("Role")=="SURVIVOR"then
    local q=root(o)
    if q and(q.Position-origin).Magnitude<=drainRadius then setEnergy(o,energyOf(o)-drain)end
   end
  end
  for _,b in ipairs(bots)do
   if b.role=="SURVIVOR"and b.part and(b.part.Position-origin).Magnitude<=drainRadius then b.energy=math.max(0,(b.energy or 0)-drain)end
  end
 elseif f.Ability=="POWER_CHARGE"then
  local velocity=tonumber(abilityProfile.Velocity)or 85
  local lift=tonumber(abilityProfile.Lift)or 4
  local shockRadius=tonumber(abilityProfile.ShockRadius)or 8
  local shockDuration=tonumber(abilityProfile.ShockDuration)or 1
  local shockSlow=tonumber(abilityProfile.ShockSlowSpeed)or 8
  r.AssemblyLinearVelocity=look*velocity+Vector3.new(0,lift,0)
  task.delay(.2,function()
   local rr=root(p);if not rr or p:GetAttribute("Role")~="MONSTER"then return end
   local center=rr.Position
   for _,o in ipairs(Players:GetPlayers())do
    if o:GetAttribute("Role")=="SURVIVOR"then
     local q=root(o)
     if q and(q.Position-center).Magnitude<=shockRadius then
      speed(o,shockSlow);task.delay(shockDuration,function()if o.Parent and o:GetAttribute("Role")=="SURVIVOR"then speed(o,16)end end)
     end
    end
   end
   for _,b in ipairs(bots)do
    if b.role=="SURVIVOR"and b.part and(b.part.Position-center).Magnitude<=shockRadius then
     b.speed=math.min(b.speed or b.baseSpeed or 14,shockSlow);b.speedResetAt=math.max(b.speedResetAt or 0,os.clock()+shockDuration)
    end
   end
  end)
 elseif f.Ability=="RAGE_RUN"then
  local runSpeed=tonumber(abilityProfile.Speed)or 28
  local duration=tonumber(abilityProfile.Duration)or 3
  speed(p,runSpeed);p:SetAttribute("RageUntil",workspace:GetServerTimeNow()+duration)
  task.delay(duration,function()if p.Parent and p:GetAttribute("Role")=="MONSTER"then speed(p,19);p:SetAttribute("RageUntil",0)end end)
 elseif f.Ability=="CURSE_SLOW"then
  local radius=tonumber(abilityProfile.Radius)or 22
  local slowSpeed=tonumber(abilityProfile.SlowSpeed)or 9
  local duration=tonumber(abilityProfile.Duration)or 3
  for _,o in ipairs(Players:GetPlayers())do
   if o:GetAttribute("Role")=="SURVIVOR"then
    local q=root(o)
    if q and(q.Position-r.Position).Magnitude<=radius then
     speed(o,slowSpeed);task.delay(duration,function()if o.Parent and o:GetAttribute("Role")=="SURVIVOR"then speed(o,16)end end)
    end
   end
  end
 elseif f.Ability=="SHADOW_STEP"then
  local distance=tonumber(abilityProfile.Distance)or 18
  local target=r.Position+look*distance
  effectTarget=target
  teleport(p,target,target+look)
 end
 local label=abilityProfile.Name or(C.MonsterAbilityLabels and C.MonsterAbilityLabels[f.Ability])or f.Name or"괴물 스킬"
 p:SetAttribute("AbilityFeedback",label..":"..stamp)
 p:SetAttribute("FeedbackEvent","ABILITY:"..tostring(f.Ability or"MONSTER")..":"..stamp)
 remote:FireAllClients("MONSTER_ABILITY_EFFECT",{
  Ability=f.Ability,Effect=abilityProfile.Effect or f.Ability,
  Origin=origin,Target=effectTarget,Look=look,UserId=p.UserId,Stamp=stamp,
 })
end
local function infectAttack(p)
 if state~="RUNNING"or p:GetAttribute("Role")~="MONSTER"then return end
 local now=os.clock();local cd=math.max(.4,tonumber(C.Energy and C.Energy.InfectAttackCooldown)or 1.2)
 local last=infectAttackCooldown[p];if last and now-last<cd then return end
 if now<(p:GetAttribute("InfectionReadyAt")or 0)then return end
 local r=root(p);if not r then return end
 local range=math.max(2,tonumber(C.Energy and C.Energy.InfectRange)or 8)
 local currentForm=form(p)
 local currentAbility=(C.MonsterAbilities and C.MonsterAbilities[currentForm.Ability])or{}
 if currentForm.Ability=="RAGE_RUN"and(tonumber(p:GetAttribute("RageUntil"))or 0)>workspace:GetServerTimeNow()then
  range+=math.max(0,tonumber(currentAbility.InfectRangeBonus)or 0)
 end
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
 elseif a==C.Actions.HUMAN_ABILITY then humanAbility(p)
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
 if a==C.Actions.PURIFY or a==C.Actions.RESCUE or a==C.Actions.DASH or a==C.Actions.HUMAN_ABILITY or a==C.Actions.INFECT_ATTACK or a==C.Actions.ABILITY then foundationCheckpoint("CORE_LOOP_READY",p,{action=a})end
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
 task.wait(.05)
 local c=p.Character
 if state~="RUNNING"then
  local lobbyDeadline=os.clock()+3
  while workspace:GetAttribute("PhysicalLobbyReady")~=true and os.clock()<lobbyDeadline do task.wait(.05)end
  if not c or not c.Parent then return end
  local h=c:WaitForChild("Humanoid",5);local r=c:WaitForChild("HumanoidRootPart",5)
  if not h or not r then return end
  if lobbySpawnLocation and lobbySpawnLocation.Parent then p.RespawnLocation=lobbySpawnLocation end
  h.PlatformStand=false;h.Sit=false;h.AutoRotate=true;r.Anchored=false
  setEnergy(p,energyMax());p:SetAttribute("EnergyFeedback","")
  p:SetAttribute("CurrentMap",workspace:GetAttribute("CurrentMapName")or"학교")
  p:SetAttribute("CurrentMapEvent",workspace:GetAttribute("CurrentMapEventName")or"")
  local players=Players:GetPlayers();table.sort(players,function(a,b)return a.UserId<b.UserId end)
  local slot=1
  for i,player in ipairs(players)do if player==p then slot=((i-1)%#lobbySpawns)+1;break end end
  teleport(p,lobbySpawns[slot],Vector3.new(0,3,210))
  p:SetAttribute("LobbySpawnGroundedAt",workspace:GetServerTimeNow())
  return
 end

 local readyDeadline=os.clock()+10
 while workspace:GetAttribute("MapReady")~=true and os.clock()<readyDeadline do task.wait(.1)end
 c=p.Character
 if c then validateCharacterFoundation(p,c)end
 local role=p:GetAttribute("Role")
 if role=="MONSTER"or role=="SURVIVOR"then setRole(p,role);restoreMovement(p,role=="MONSTER"and 19 or 16)
 elseif role=="ELIMINATED"then local rr=root(p);if rr then rr.Anchored=true end end
end
Players.PlayerAdded:Connect(function(p)
 load(p)
 if state~="RUNNING"and lobbySpawnLocation and lobbySpawnLocation.Parent then p.RespawnLocation=lobbySpawnLocation end
 p:SetAttribute("RoomFeedback","")
 adoptReservedRoomFromPlayer(p)
 if roomServer and #Players:GetPlayers()>roomMaxPlayers()then
  roomFeedback(p,"FULL","방 정원 초과 · 다음 판까지 관전")
  p:SetAttribute("Role","SPECTATING");p:SetAttribute("RoundState","SPECTATING");p:SetAttribute("Spectating",true)
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
 if state~="RUNNING"and lobbySpawnLocation and lobbySpawnLocation.Parent then p.RespawnLocation=lobbySpawnLocation end
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
 local leavingPos=rr and rr.Position or(leavingRole=="MONSTER"and monsterSpawns[1]or survivorSpawns[1])
 save(p);for _,bay in ipairs(lobbyQueueBays)do bay.players[p]=nil end;cooldown[p]=nil;dashCooldown[p]=nil;infectAttackCooldown[p]=nil;humanAbilityCooldown[p]=nil;energyStationReady[p]=nil;ghostSeenThisRound[p]=nil;roomActionLast[p]=nil;roomJoinedAt[p]=nil;roomTeleportPending[p]=nil;lastRequest[p]=nil;lastValidPosition[p]=nil;movementGraceUntil[p]=nil;movementProbeStart[p]=nil;foundationLast[p]=nil;qaCaptureLast[p]=nil;tagGraceUntil[p]=nil;purifyCooldown[p]=nil
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

TeleportService.TeleportInitFailed:Connect(function(player,teleportResult,errorMessage)
 if player and player.Parent==Players then
  roomTeleportPending[player]=nil
  roomFeedback(player,"ERROR","방 연결 실패 · 승강기에서 다시 시도")
  warn("Room teleport init failed",player.UserId,teleportResult,errorMessage)
 end
end)

game:BindToClose(function()for _,p in ipairs(Players:GetPlayers())do save(p)end end)

-- 로비는 실제 3D 공간으로 항상 유지한다.
if not workspace:FindFirstChild("MidnightLobby")then makePhysicalLobby()end

-- 첫 라운드 전 학교 맵도 백그라운드에서 준비한다.
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
   local expected=math.clamp(math.floor(tonumber(roomExpectedCount)or 1),1,roomMaxPlayers())
   local grace=math.max(2,tonumber(C.Room and C.Room.ArrivalGraceSeconds)or 6)
   local elapsed=roomFirstJoinAt>0 and(os.clock()-roomFirstJoinAt)or grace
   if #players>=expected or elapsed>=grace then
    roomStartRequested=true
    workspace:SetAttribute("RoomStartRequested",true)
    syncLobbyState("INTERMISSION")
    task.wait(.1)
   else
    for _,p in ipairs(players)do
     p:SetAttribute("RoundState","ROOM_WAITING")
     p:SetAttribute("TimeLeft",math.max(0,math.ceil(grace-elapsed)))
     roomFeedback(p,"WAITING",string.format("참가자 연결 중 %d/%d",#players,expected))
    end
    syncLobbyState("ROOM_WAITING")
    task.wait(.2)
   end
  else
   roomStartRequested=false;workspace:SetAttribute("RoomStartRequested",false)
   state="INTERMISSION";syncLobbyState("INTERMISSION");updateCurrentRoomDirectory()
   soloStartRequested=false
   local fastStartSeconds=3
   for t=fastStartSeconds,1,-1 do
    for _,p in ipairs(Players:GetPlayers())do
     p:SetAttribute("LobbySelectionConfirmed",true)
     p:SetAttribute("RoundState","INTERMISSION")
     p:SetAttribute("TimeLeft",t)
    end
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
 end
end)

local function botHumanForm(b)
 local id=b and b.humanFormId or"BROADCAST"
 for _,row in ipairs(C.HumanForms or{})do if row.Id==id then return row end end
 return(C.HumanForms and C.HumanForms[1])or{Id="BROADCAST",PurifyRangeBonus=0,PurifyCooldownBonus=0,DashCooldownBonus=0,DashPowerBonus=0}
end

local function botMonsterForm(b)
 local id=b and b.monsterId or"DRACULA"
 for _,row in ipairs(C.MonsterForms or{})do if row.Id==id then return row end end
 return(C.MonsterForms and C.MonsterForms[1])or{Id="DRACULA",Ability="BAT_DASH"}
end

local function botSeparationVector(b)
 local radius=math.max(6,tonumber(C.AICombat and C.AICombat.SeparationRadius)or 12)
 local force=Vector3.zero
 local count=0
 for _,other in ipairs(bots)do
  if other~=b and other.role==b.role and other.part and other.part.Parent then
   local delta=b.part.Position-other.part.Position
   local flat=Vector3.new(delta.X,0,delta.Z)
   local distance=flat.Magnitude
   if distance>.01 and distance<radius then
    force+=flat.Unit*((radius-distance)/radius)
    count+=1
   end
  end
 end
 if count>0 then force/=count end
 return force
end

local function steerBotAroundObstacle(b,desired)
 local flat=Vector3.new(desired.X,0,desired.Z)
 if flat.Magnitude<.01 then return desired end
 flat=flat.Unit
 local ignore={}
 if b.model and b.model.Parent then table.insert(ignore,b.model)elseif b.part then table.insert(ignore,b.part)end
 for _,player in ipairs(Players:GetPlayers())do if player.Character then table.insert(ignore,player.Character)end end
 for _,other in ipairs(bots)do
  if other~=b then
   if other.model and other.model.Parent then table.insert(ignore,other.model)elseif other.part then table.insert(ignore,other.part)end
  end
 end
 local params=RaycastParams.new()
 params.FilterType=Enum.RaycastFilterType.Exclude
 params.FilterDescendantsInstances=ignore
 params.IgnoreWater=true
 params.RespectCanCollide=true
 local origin=b.part.Position+Vector3.new(0,1.6,0)
 local probe=4.8
 if not workspace:Raycast(origin,flat*probe,params)then return flat end
 local right=Vector3.new(-flat.Z,0,flat.X)
 local sign=b.strafeSign or(((b.tacticSlot or 1)%2==0)and 1 or-1)
 local first=(flat*.35+right*.94*sign).Unit
 local second=(flat*.35-right*.94*sign).Unit
 if not workspace:Raycast(origin,first*probe,params)then return first end
 if not workspace:Raycast(origin,second*probe,params)then return second end
 return right*sign
end

local function moveBotDirection(b,direction,dt,speedValue)
 local flat=Vector3.new(direction.X,0,direction.Z)
 if flat.Magnitude<.01 then return end
 local separation=botSeparationVector(b)
 local separationWeight=math.max(0,tonumber(C.AICombat and C.AICombat.SeparationWeight)or 7)
 local desired=flat.Unit+separation*(separationWeight/10)
 if desired.Magnitude<.01 then desired=flat.Unit else desired=desired.Unit end
 desired=steerBotAroundObstacle(b,desired)
 local speedNow=math.max(0,tonumber(speedValue)or b.speed or 14)
 local current=b.part.Position
 local nextPos=current+desired*speedNow*dt
 local limit=math.max(20,(tonumber(C.ArenaLimit)or 176)-4)
 nextPos=Vector3.new(math.clamp(nextPos.X,-limit,limit),current.Y,math.clamp(nextPos.Z,-limit,limit))
 setBotCFrame(b,CFrame.lookAt(nextPos,nextPos+desired))
end

local function botTargetPosition(entry)
 if entry and entry.p then local rr=root(entry.p);return rr and rr.Position or nil end
 if entry and entry.b and entry.b.part then return entry.b.part.Position end
 return nil
end

local botPatrolPoints={
 Vector3.new(-105,3,-54),Vector3.new(0,3,-68),Vector3.new(105,3,-54),
 Vector3.new(-118,3,36),Vector3.new(0,3,12),Vector3.new(118,3,36),
 Vector3.new(-86,3,108),Vector3.new(0,3,92),Vector3.new(86,3,108),
}
local function botEntryKey(entry)
 if entry and entry.p then return"P:"..tostring(entry.p.UserId)end
 if entry and entry.b then return"B:"..tostring(entry.b.tacticSlot or 0)end
 return""
end
local function botFindEntryByKey(role,key)
 if key==""then return nil,nil end
 if string.sub(key,1,2)=="P:"then
  local id=tonumber(string.sub(key,3))
  for _,player in ipairs(Players:GetPlayers())do
   if player.UserId==id and player:GetAttribute("Role")==role then
    local rr=root(player);if rr then return{p=player},rr.Position end
   end
  end
 else
  local slot=tonumber(string.sub(key,3))
  for _,other in ipairs(bots)do
   if other.tacticSlot==slot and other.role==role and other.part and other.part.Parent then return{b=other},other.part.Position end
  end
 end
 return nil,nil
end
local function botTargetLoad(role,key,exclude)
 local count=0
 for _,other in ipairs(bots)do
  if other~=exclude and other.role==role and other.currentTargetKey==key and(os.clock()<(other.targetLockUntil or 0))then count+=1 end
 end
 return count
end
local function botPatrolTarget(b)
 local reach=math.max(4,tonumber(C.AICombat and C.AICombat.PatrolReachDistance)or 8)
 local refresh=math.max(3,tonumber(C.AICombat and C.AICombat.PatrolRefreshSeconds)or 7)
 local now=os.clock()
 if not b.patrolTarget or not b.patrolRefreshAt or now>=b.patrolRefreshAt or(b.part.Position-b.patrolTarget).Magnitude<=reach then
  b.patrolCycle=(b.patrolCycle or 0)+1
  local index=((math.max(1,b.tacticSlot or 1)+(b.patrolCycle*3)-2)%#botPatrolPoints)+1
  local base=botPatrolPoints[index]
  local jitter=Vector3.new(((b.tacticSlot or 1)%3-1)*6,0,((b.patrolCycle%3)-1)*5)
  b.patrolTarget=base+jitter
  b.patrolRefreshAt=now+refresh+((b.tacticSlot or 1)%4)*.55
 end
 return Vector3.new(b.patrolTarget.X,b.part.Position.Y,b.patrolTarget.Z)
end

local function distributedSurvivorTarget(b)
 local now=os.clock()
 if b.currentTargetKey and now<(b.targetLockUntil or 0)then
  local locked,pos=botFindEntryByKey("SURVIVOR",b.currentTargetKey)
  if locked and pos then return locked,pos,(pos-b.part.Position).Magnitude end
 end
 local entries={}
 for _,entry in ipairs(active())do
  local pos=botTargetPosition(entry)
  if pos then
   local key=botEntryKey(entry)
   local distance=(pos-b.part.Position).Magnitude
   local load=botTargetLoad("MONSTER",key,b)
   local lane=math.abs(pos.X-(botPatrolTarget(b).X))*.035
   table.insert(entries,{entry=entry,pos=pos,distance=distance,key=key,score=distance+load*(tonumber(C.AICombat and C.AICombat.TargetCrowdPenalty)or 38)+lane})
  end
 end
 table.sort(entries,function(a,c)return a.score<c.score end)
 local chosen=entries[1]
 if not chosen then b.currentTargetKey=nil;return nil,nil,math.huge end
 b.currentTargetKey=chosen.key
 b.targetLockUntil=now+(tonumber(C.AICombat and C.AICombat.TargetLockSeconds)or 3.2)+((b.tacticSlot or 1)%3)*.45
 return chosen.entry,chosen.pos,chosen.distance
end

local function distributedMonsterTarget(b)
 local now=os.clock()
 if b.currentTargetKey and now<(b.targetLockUntil or 0)then
  local locked,pos=botFindEntryByKey("MONSTER",b.currentTargetKey)
  if locked and pos then
   return locked.p and{player=locked.p,pos=pos}or{bot=locked.b,pos=pos},pos,(pos-b.part.Position).Magnitude
  end
 end
 local entries={}
 for _,player in ipairs(Players:GetPlayers())do
  if player:GetAttribute("Role")=="MONSTER"then
   local rr=root(player)
   if rr then
    local key="P:"..tostring(player.UserId);local distance=(rr.Position-b.part.Position).Magnitude
    local load=botTargetLoad("SURVIVOR",key,b)
    table.insert(entries,{player=player,pos=rr.Position,distance=distance,key=key,score=distance+load*(tonumber(C.AICombat and C.AICombat.TargetCrowdPenalty)or 38)})
   end
  end
 end
 for _,other in ipairs(bots)do
  if other~=b and other.role=="MONSTER"and other.part and other.part.Parent then
   local pos=other.part.Position;local key="B:"..tostring(other.tacticSlot or 0);local distance=(pos-b.part.Position).Magnitude
   local load=botTargetLoad("SURVIVOR",key,b)
   table.insert(entries,{bot=other,pos=pos,distance=distance,key=key,score=distance+load*(tonumber(C.AICombat and C.AICombat.TargetCrowdPenalty)or 38)})
  end
 end
 table.sort(entries,function(a,c)return a.score<c.score end)
 local chosen=entries[1]
 if not chosen then b.currentTargetKey=nil;return nil,nil,math.huge end
 b.currentTargetKey=chosen.key
 b.targetLockUntil=now+(tonumber(C.AICombat and C.AICombat.TargetLockSeconds)or 3.2)+((b.tacticSlot or 1)%3)*.45
 return chosen,chosen.pos,chosen.distance
end

local function fireBotHumanEffect(b,action,targetPos)
 remote:FireAllClients("AI_HUMAN_ACTION_EFFECT",{
  Action=action,FormId=b.humanFormId or"BROADCAST",Origin=b.part.Position,
  Target=targetPos,TacticSlot=b.tacticSlot or 0,
 })
end

local function tryBotHumanPurify(b,target,distance)
 local profile=botHumanForm(b)
 local range=math.max(4,(C.PurifyDistance or 8)+(tonumber(profile.PurifyRangeBonus)or 0))
 local cost=math.max(0,tonumber(C.Energy and C.Energy.PurifyCost)or 35)
 local cooldownSeconds=math.max(2,(C.PurifyCooldown or 5)+(tonumber(profile.PurifyCooldownBonus)or 0))
 if not target or distance>range or os.clock()<(b.purifyReadyAt or 0)or(b.energy or 0)<cost then return false,range end
 b.energy=math.max(0,(b.energy or 0)-cost);b.purifyReadyAt=os.clock()+cooldownSeconds
 local targetPos=target.pos
 if target.player then
  eliminateMonsterPlayer(target.player)
 elseif target.bot then
  removeBot(target.bot)
 end
 fireBotHumanEffect(b,"PURIFY",targetPos)
 return true,range
end

local function tryBotHumanDash(b,direction,distance)
 local profile=botHumanForm(b)
 local cost=math.max(0,tonumber(C.Energy and C.Energy.DashCost)or 25)
 local cooldownSeconds=math.max(3,(C.SurvivorDashCooldown or 7)+(tonumber(profile.DashCooldownBonus)or 0))
 if os.clock()<(b.dashReadyAt or 0)or(b.energy or 0)<cost then return false end
 local shouldDash=(profile.Id=="COURIER"and distance>12)or distance<6 or distance>30
 if not shouldDash then return false end
 local flat=Vector3.new(direction.X,0,direction.Z)
 if flat.Magnitude<.01 then return false end
 b.energy=math.max(0,(b.energy or 0)-cost);b.dashReadyAt=os.clock()+cooldownSeconds
 local dashPower=52+(tonumber(profile.DashPowerBonus)or 0)
 local current=b.part.Position
 local step=math.min(15,dashPower*.18)
 local target=current+flat.Unit*step
 local limit=math.max(20,(tonumber(C.ArenaLimit)or 176)-4)
 target=Vector3.new(math.clamp(target.X,-limit,limit),current.Y,math.clamp(target.Z,-limit,limit))
 setBotCFrame(b,CFrame.lookAt(target,target+flat.Unit))
 fireBotHumanEffect(b,"DASH",target)
 return true
end

local function tryBotHumanAbility(b,target,distance)
 local formInfo=botHumanForm(b)
 local abilityId=formInfo and formInfo.ActiveAbility or nil
 local profile=abilityId and C.HumanAbilities and C.HumanAbilities[abilityId]or nil
 if not abilityId or not profile then return false end
 local now=os.clock()
 local cooldownSeconds=math.max(1,tonumber(profile.Cooldown)or 8)
 if now<(b.humanAbilityReadyAt or 0)then return false end
 local cost=math.max(0,tonumber(profile.Cost)or 30)
 if(b.energy or 0)<cost then return false end
 local radius=math.max(1,tonumber(profile.Radius)or tonumber(profile.Range)or 12)
 if distance>radius then return false end
 b.energy=math.max(0,(b.energy or 0)-cost)
 b.humanAbilityReadyAt=now+cooldownSeconds
 local origin=b.part.Position
 local targetPos=target and target.pos or nil

 if abilityId=="SIGNAL_JAM"then
  local drain=math.max(0,tonumber(profile.EnergyDrain)or 20)
  for _,player in ipairs(Players:GetPlayers())do
   if player:GetAttribute("Role")=="MONSTER"then
    local rr=root(player)
    if rr and(rr.Position-origin).Magnitude<=radius then setEnergy(player,energyOf(player)-drain)end
   end
  end
  for _,other in ipairs(bots)do
   if other.role=="MONSTER"and other.part and(other.part.Position-origin).Magnitude<=radius then
    other.energy=math.max(0,(other.energy or 0)-drain)
   end
  end
 elseif abilityId=="OVERLOAD"or abilityId=="CAMERA_FLASH"or abilityId=="SHOCK_BATON"then
  local slowSpeed=math.max(0,tonumber(profile.SlowSpeed)or 10)
  local duration=math.max(.2,tonumber(profile.Duration)or 1.2)
  for _,player in ipairs(Players:GetPlayers())do
   if player:GetAttribute("Role")=="MONSTER"then
    local rr=root(player)
    if rr and(rr.Position-origin).Magnitude<=radius then
     speed(player,slowSpeed)
     task.delay(duration,function()if player.Parent and player:GetAttribute("Role")=="MONSTER"then speed(player,19)end end)
    end
   end
  end
  for _,other in ipairs(bots)do
   if other.role=="MONSTER"and other.part and(other.part.Position-origin).Magnitude<=radius then
    other.speed=math.min(other.speed or other.baseSpeed or 18,slowSpeed)
    other.speedResetAt=math.max(other.speedResetAt or 0,now+duration)
   end
  end
 elseif abilityId=="IMPACT_BAG"and target then
  local force=math.max(10,tonumber(profile.Knockback)or 42)
  local delta=target.pos-origin
  local flat=Vector3.new(delta.X,0,delta.Z)
  if flat.Magnitude>.01 then
   local dir=flat.Unit
   if target.player then
    local rr=root(target.player)
    if rr then
     movementGraceUntil[target.player]=now+.55
     rr.AssemblyLinearVelocity=dir*force+Vector3.new(0,4,0)
    end
   elseif target.bot then
    local step=math.min(8,force*.14)
    local current=target.bot.part.Position
    local pushed=current+dir*step
    setBotCFrame(target.bot,CFrame.lookAt(pushed,pushed+dir))
   end
  end
 end

 remote:FireAllClients("HUMAN_ABILITY_EFFECT",{
  Ability=abilityId,Effect=profile.Effect or abilityId,FormId=formInfo.Id,
  Origin=origin,Target=targetPos,UserId=0,Stamp=tostring(math.floor(now*1000)),
 })
 return true
end

local function tryBotMonsterAbility(b,targetPos,distance)
 if not targetPos then return false end
 local now=os.clock()
 if now<(b.abilityReadyAt or 0)then return false end
 local cost=math.max(0,tonumber(C.Energy and C.Energy.AbilityCost)or 45)
 if(b.energy or 0)<cost then return false end
 local formInfo=botMonsterForm(b)
 local ability=tostring(formInfo.Ability or"")
 local profile=(C.MonsterAbilities and C.MonsterAbilities[ability])or{}
 local minRange=math.max(0,tonumber(C.AICombat and C.AICombat.MonsterAbilityMinRange)or 9)
 local maxRange=math.max(minRange+1,tonumber(C.AICombat and C.AICombat.MonsterAbilityMaxRange)or 34)
 if ability~="CURSE_SLOW"and(distance<minRange or distance>maxRange)then return false end
 local origin=b.part.Position
 local flat=Vector3.new(targetPos.X-origin.X,0,targetPos.Z-origin.Z)
 if flat.Magnitude<.01 then return false end
 local look=flat.Unit
 local effectTarget=nil
 b.energy=math.max(0,(b.energy or 0)-cost)
 b.abilityReadyAt=now+(C.MonsterAbilityCooldown or 7)
 if ability=="BAT_DASH"then
  local step=math.min(14,math.max(5,distance-4))
  effectTarget=origin+look*step
  setBotCFrame(b,CFrame.lookAt(effectTarget,effectTarget+look))
  local drainRadius=tonumber(profile.DrainRadius)or 10
  local drain=tonumber(profile.EnergyDrain)or 12
  for _,player in ipairs(Players:GetPlayers())do
   if player:GetAttribute("Role")=="SURVIVOR"then
    local rr=root(player)
    if rr and(rr.Position-effectTarget).Magnitude<=drainRadius then setEnergy(player,energyOf(player)-drain)end
   end
  end
  for _,other in ipairs(bots)do
   if other.role=="SURVIVOR"and other.part and(other.part.Position-effectTarget).Magnitude<=drainRadius then other.energy=math.max(0,(other.energy or 0)-drain)end
  end
 elseif ability=="POWER_CHARGE"then
  local step=math.min(16,math.max(6,distance-4))
  effectTarget=origin+look*step
  setBotCFrame(b,CFrame.lookAt(effectTarget,effectTarget+look))
  local shockRadius=tonumber(profile.ShockRadius)or 8
  local shockDuration=tonumber(profile.ShockDuration)or 1
  local shockSlow=tonumber(profile.ShockSlowSpeed)or 8
  for _,player in ipairs(Players:GetPlayers())do
   if player:GetAttribute("Role")=="SURVIVOR"then
    local rr=root(player)
    if rr and(rr.Position-effectTarget).Magnitude<=shockRadius then
     speed(player,shockSlow);task.delay(shockDuration,function()if player.Parent and player:GetAttribute("Role")=="SURVIVOR"then speed(player,16)end end)
    end
   end
  end
  for _,other in ipairs(bots)do
   if other.role=="SURVIVOR"and other.part and(other.part.Position-effectTarget).Magnitude<=shockRadius then
    other.speed=math.min(other.speed or other.baseSpeed or 14,shockSlow);other.speedResetAt=math.max(other.speedResetAt or 0,now+shockDuration)
   end
  end
 elseif ability=="RAGE_RUN"then
  local duration=tonumber(profile.Duration)or 3
  b.speed=tonumber(profile.Speed)or 28
  b.speedResetAt=now+duration;b.rageUntil=now+duration
 elseif ability=="CURSE_SLOW"then
  local radius=tonumber(profile.Radius)or 22
  if distance>radius then b.energy=math.min(energyMax(),(b.energy or 0)+cost);b.abilityReadyAt=0;return false end
  local slowSpeed=tonumber(profile.SlowSpeed)or 9
  local duration=tonumber(profile.Duration)or 3
  for _,player in ipairs(Players:GetPlayers())do
   if player:GetAttribute("Role")=="SURVIVOR"then
    local rr=root(player)
    if rr and(rr.Position-origin).Magnitude<=radius then
     speed(player,slowSpeed);task.delay(duration,function()if player.Parent and player:GetAttribute("Role")=="SURVIVOR"then speed(player,16)end end)
    end
   end
  end
  for _,other in ipairs(bots)do
   if other.role=="SURVIVOR"and other.part and(other.part.Position-origin).Magnitude<=radius then
    other.speed=math.min(other.speed or other.baseSpeed or 14,slowSpeed)
    other.speedResetAt=math.max(other.speedResetAt or 0,now+duration)
   end
  end
 elseif ability=="SHADOW_STEP"then
  local step=math.min(tonumber(profile.Distance)or 18,math.max(6,distance-4))
  effectTarget=origin+look*step
  setBotCFrame(b,CFrame.lookAt(effectTarget,effectTarget+look))
 else
  b.energy=math.min(energyMax(),(b.energy or 0)+cost);b.abilityReadyAt=0;return false
 end
 remote:FireAllClients("MONSTER_ABILITY_EFFECT",{
  Ability=ability,Effect=profile.Effect or ability,Origin=origin,Target=effectTarget,Look=look,UserId=0,Stamp=tostring(math.floor(now*1000)),
 })
 return true
end

RunService.Heartbeat:Connect(function(dt)
 if state=="RUNNING"then
  for _,b in ipairs(bots)do
   b.motionClock=(b.motionClock or 0)+dt*(b.role=="MONSTER"and 7.5 or 9)
   local nowClock=os.clock()
   if not b.strafeFlipAt or nowClock>=b.strafeFlipAt then
    b.strafeSign=math.random()<.5 and-1 or 1
    b.strafeFlipAt=nowClock+1.8+math.random()*2.2
   end
   if(b.speedResetAt or 0)>0 and nowClock>=(b.speedResetAt or 0)then
    b.speed=b.baseSpeed or(b.role=="MONSTER"and 18 or 14);b.speedResetAt=0
   end
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
      elseif name=="Cape"or name=="Cloak"or string.find(name,"Bandage")then pitch=math.rad(4+stride*3)end
      local roleLean=b.role=="MONSTER"and math.rad(-5)or math.rad(-2)
      v.part.CFrame=b.part.CFrame*CFrame.new(v.offset+Vector3.new(0,bob,0))*CFrame.Angles(roleLean+pitch,0,0)*(v.rotation or CFrame.identity)
     end
    end
   end

   if b.role=="MONSTER"then
    local bestEntry,bestPos,bd=distributedSurvivorTarget(b)
    if bestPos then
     local infectRange=math.max(2,tonumber(C.Energy and C.Energy.InfectRange)or 8)
     local botForm=botMonsterForm(b)
     if botForm.Ability=="RAGE_RUN"and(b.rageUntil or 0)>os.clock()then
      local rageProfile=(C.MonsterAbilities and C.MonsterAbilities.RAGE_RUN)or{}
      infectRange+=math.max(0,tonumber(rageProfile.InfectRangeBonus)or 0)
     end
     local infectCost=math.max(0,tonumber(C.Energy and C.Energy.InfectAttackCost)or 30)
     local attackCd=math.max(.4,tonumber(C.Energy and C.Energy.InfectAttackCooldown)or 1.2)
     if bd<=infectRange and os.clock()>=(b.infectAttackReadyAt or 0)and(b.energy or 0)>=infectCost then
      b.energy=math.max(0,(b.energy or 0)-infectCost);b.infectAttackReadyAt=os.clock()+attackCd
      if bestEntry and bestEntry.p then infectPlayer(bestEntry.p,nil)elseif bestEntry and bestEntry.b then infectBot(bestEntry.b,nil)end
     elseif not tryBotMonsterAbility(b,bestPos,bd)then
      local toTarget=bestPos-b.part.Position
      local flat=Vector3.new(toTarget.X,0,toTarget.Z)
      if flat.Magnitude>.1 then
       local side=b.strafeSign or((b.tacticSlot or 1)%2==0 and 1 or-1)
       local right=Vector3.new(-flat.Unit.Z,0,flat.Unit.X)
       local approach=flat.Unit+right*(bd<20 and .28*side or .12*side)
       moveBotDirection(b,approach,dt,b.speed)
      end
     end
    end

   elseif b.role=="SURVIVOR"then
    local target,targetPos,best=distributedMonsterTarget(b)
    local engageRange=math.max(20,tonumber(C.AICombat and C.AICombat.HumanEngageRange)or 46)
    if targetPos and best<=engageRange then
     local usedAbility=tryBotHumanAbility(b,target,best)
     local attacked,purifyRange=false,math.max(4,(C.PurifyDistance or 8)+(tonumber(botHumanForm(b).PurifyRangeBonus)or 0))
     if not usedAbility then attacked,purifyRange=tryBotHumanPurify(b,target,best)end
     if not usedAbility and not attacked then
      local preferred=math.max(5,math.min(purifyRange-1,tonumber(C.AICombat and C.AICombat.HumanPreferredRange)or 10))
      local delta=targetPos-b.part.Position
      local flat=Vector3.new(delta.X,0,delta.Z)
      if flat.Magnitude>.1 then
       local dir=flat.Unit
       local side=b.strafeSign or((b.tacticSlot or 1)%2==0 and 1 or-1)
       local right=Vector3.new(-dir.Z,0,dir.X)
       local moveDir
       if best>purifyRange+4 then moveDir=dir+right*(.25*side)
       elseif best<preferred-2 then moveDir=-dir+right*(.48*side)
       else moveDir=right*side-dir*.08 end
       if not tryBotHumanDash(b,moveDir,best)then moveBotDirection(b,moveDir,dt,b.speed)end
      end
     end
    else
     b.currentTargetKey=nil
     local patrol=botPatrolTarget(b)
     local delta=patrol-b.part.Position
     if delta.Magnitude>.5 then moveBotDirection(b,delta,dt,b.speed*.88)end
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
