-- 파일명: roblox-games/amusement-tycoon/server/Game.server.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local TweenService = game:GetService("TweenService")
-- 로컬 Studio에서 저장소를 사용할 수 없어도 시작 월드가 생성되어야 한다.
local store
local storeReady, storeResult = pcall(function()
  return DataStoreService:GetDataStore("amusement-tycoon-development-v1")
end)
if storeReady then store = storeResult end
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

local remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)
if remote and not remote:IsA("RemoteEvent") then remote:Destroy(); remote = nil end
if not remote then
  remote = Instance.new("RemoteEvent")
  remote.Name = Config.RemoteName
  remote.Parent = ReplicatedStorage
end

-- F1~F4 메인: 기존 게임과 별도로 실제 Roblox 서버 관측만 기록한다.
-- 진행도·보상·기존 플레이어 저장 키에는 접근하지 않는다.
local foundationStore = nil
local foundationStoreOk, foundationStoreResult = pcall(function()
  return DataStoreService:GetDataStore("native-foundation-sentinel-v1")
end)
if foundationStoreOk then foundationStore = foundationStoreResult end
local foundationSeen = {}
local foundationSequence = 0
local function foundationCheckpoint(name, player, facts)
  if foundationSeen[name] then return true end
  if not foundationStore then return false end
  local row = {
    name = name, at = os.time(), userId = player and player.UserId or 0,
    gameId = Config.GameId, placeId = tostring(game.PlaceId), placeVersion = game.PlaceVersion,
  }
  if typeof(facts) == "table" then
    for key, value in pairs(facts) do
      if typeof(value) == "boolean" or typeof(value) == "number" or typeof(value) == "string" then
        row[key] = value
      end
    end
  end
  for attempt = 1, 3 do
    local committedSequence = foundationSequence
    local ok = pcall(function()
      foundationStore:UpdateAsync("latest", function(previous)
        local exact = typeof(previous) == "table"
          and tostring(previous.gameId or "") == Config.GameId
          and tostring(previous.placeId or "") == tostring(game.PlaceId)
          and tonumber(previous.placeVersion) == game.PlaceVersion
        local data = exact and previous or {
          version = 3, gameId = Config.GameId, placeId = tostring(game.PlaceId),
          placeVersion = game.PlaceVersion, checkpoints = {}, sequence = 0,
        }
        data.checkpoints = typeof(data.checkpoints) == "table" and data.checkpoints or {}
        if typeof(data.checkpoints[name]) == "table" then
          committedSequence = math.floor(tonumber(data.checkpoints[name].sequence) or 0)
          return nil -- 이미 같은 후보에서 검증한 단계는 다시 쓰지 않는다.
        end
        committedSequence = math.max(foundationSequence, math.floor(tonumber(data.sequence) or 0)) + 1
        row.sequence = committedSequence
        data.sequence = committedSequence
        data.checkpoints[name] = row
        data.updatedAt = os.time()
        data.requirements = {
          saveEnabled = Config.SaveEnabled == true,
          multiplayerRequired = Config.MultiplayerRequired == true,
        }
        return data
      end)
    end)
    if ok and committedSequence > 0 then
      foundationSeen[name] = true
      foundationSequence = math.max(foundationSequence, committedSequence)
      workspace:SetAttribute("Foundation_" .. name, true)
      return true
    end
    if attempt < 3 then task.wait(0.15 * attempt) end
  end
  if player then player:SetAttribute("FoundationFailure", "CHECKPOINT_WRITE_FAILED:" .. name) end
  warn("ROBLOX_FOUNDATION_CHECKPOINT_WRITE_FAILED:" .. name)
  return false
end
foundationCheckpoint("SERVER_BOOT", nil, {placeVersion = game.PlaceVersion})
foundationCheckpoint("MODULE_GRAPH_READY", nil, {modulesReady = true})

local lastAction = {}
local function readNumber(player, name, fallback)
  local value = player:GetAttribute(name)
  if typeof(value) ~= "number" then return fallback end
  return value
end
local function setNumber(player, name, value)
  if typeof(value) ~= "number" then return end
  player:SetAttribute(name, math.floor(value))
end
local function initializePlayer(player)
  for key, value in pairs(Config.InitialState) do player:SetAttribute(key, value) end
  player:SetAttribute("LastApprovedScope", "ready")
  player:SetAttribute("CurrentPhase", "PARK_CLOSED")
  if Config.LearningContext and Config.LearningContext.Applied then
    player:SetAttribute("LearningOperator", Config.LearningContext.Operator)
    player:SetAttribute("LastLearningPattern", "")
    player:SetAttribute("ActionSequence", 0)
  end
end

local function clamp(value, low, high)
  return math.max(low, math.min(high, value))
end

local function markAction(player, scope, pattern)
  player:SetAttribute("LastApprovedScope", scope)
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", pattern)
end

local function buildThemeParkWorld()
  local spawn = workspace:FindFirstChild("NativeFoundationSpawn")
  if not spawn then
    spawn = Instance.new("SpawnLocation")
    spawn.Name = "NativeFoundationSpawn"
    spawn.Size = Vector3.new(8, 1, 8)
    spawn.Position = Vector3.new(0, 3, 0)
    spawn.Neutral = true
    spawn.Anchored = true
    spawn.CanCollide = true
    spawn.Parent = workspace
  end

  local parkSeed = workspace:FindFirstChild("AmusementTycoonSeed")
  if not parkSeed then
    parkSeed = Instance.new("Folder")
    parkSeed.Name = "AmusementTycoonSeed"
    parkSeed.Parent = workspace

    local counter = Instance.new("Part")
    counter.Name = "EntranceCounter"
    counter.Size = Vector3.new(8, 4, 3)
    counter.Position = spawn.Position + Vector3.new(0, -1, -12)
    counter.Anchored = true
    counter.CanCollide = true
    counter.Material = Enum.Material.Wood
    counter.Color = Color3.fromRGB(154, 104, 66)
    counter:SetAttribute("Landmark", "PARK_ENTRANCE")
    counter.Parent = parkSeed

    local buildPad = Instance.new("Part")
    buildPad.Name = "RideBuildPad"
    buildPad.Size = Vector3.new(22, 0.4, 22)
    buildPad.Position = spawn.Position + Vector3.new(18, -2.8, 10)
    buildPad.Anchored = true
    buildPad.CanCollide = true
    buildPad.Material = Enum.Material.Concrete
    buildPad.Color = Color3.fromRGB(96, 126, 158)
    buildPad.Parent = parkSeed

    local path = Instance.new("Part")
    path.Name = "StarterPath"
    path.Size = Vector3.new(8, 0.3, 26)
    path.Position = spawn.Position + Vector3.new(0, -2.75, 3)
    path.Anchored = true
    path.CanCollide = true
    path.Material = Enum.Material.Concrete
    path.Color = Color3.fromRGB(190, 184, 166)
    path.Parent = parkSeed
  end

  local guests = workspace:FindFirstChild("ParkGuests")
  if not guests then
    guests = Instance.new("Folder")
    guests.Name = "ParkGuests"
    guests.Parent = workspace
  end
  return spawn, parkSeed, guests
end

local parkSpawn, parkWorld, parkGuests = buildThemeParkWorld()

local function spawnCustomer(player)
  if #parkGuests:GetChildren() >= 12 then return nil end

  local customer = Instance.new("Model")
  customer.Name = "Customer_" .. tostring(player.UserId) .. "_" .. tostring(readNumber(player, "ActionSequence", 0))

  local body = Instance.new("Part")
  body.Name = "Body"
  body.Size = Vector3.new(1.8, 3.2, 1.4)
  body.Position = parkSpawn.Position + Vector3.new(-4 + (#parkGuests:GetChildren() % 5) * 2, -0.9, -8)
  body.Anchored = true
  body.CanCollide = false
  body.Material = Enum.Material.SmoothPlastic
  body.Color = Color3.fromRGB(255, 206, 112)
  body.Parent = customer
  customer.PrimaryPart = body
  customer.Parent = parkGuests

  local ridePad = parkWorld:FindFirstChild("RideBuildPad")
  if ridePad then
    TweenService:Create(
      body,
      TweenInfo.new(3.5, Enum.EasingStyle.Linear),
      { Position = ridePad.Position + Vector3.new(0, 2, 0) }
    ):Play()
  end

  task.delay(5, function()
    if customer.Parent then customer:Destroy() end
  end)
  return customer
end

local function recomputePark(player)
  local open = readNumber(player, "ParkOpen", 0) == 1
  local paths = readNumber(player, "PathTiles", 0)
  local rides = readNumber(player, "RideCount", 0)
  local food = readNumber(player, "FoodShopCount", 0)
  local toilets = readNumber(player, "ToiletCount", 0)
  local rideUpgrade = readNumber(player, "RideUpgradeLevel", 0)
  local foodUpgrade = readNumber(player, "FoodUpgradeLevel", 0)
  local janitors = readNumber(player, "Janitors", 0)
  local trash = readNumber(player, "TrashCount", 0)

  local connectedFacilities = paths > 0 and (rides + food + toilets) or 0
  local capacity = rides * (4 + rideUpgrade * 2)
    + food * (4 + foodUpgrade * Config.DirectBuildUpSeed.FoodCapacityPerUpgrade)
    + toilets * 2
  local demand = open and math.max(0, connectedFacilities * 3 + math.floor(paths / 2)) or 0
  local queue = math.max(0, demand - capacity)
  local satisfaction = clamp(82 + math.min(paths, 8) * 2 + janitors * 4 - queue * 5 - trash * 6, 0, 100)

  setNumber(player, "GuestCount", demand)
  setNumber(player, "QueueLength", queue)
  setNumber(player, "Satisfaction", satisfaction)
  setNumber(player, "Towers", rides + food + toilets)
  setNumber(player, "Objective", connectedFacilities)
end

local function startParkDay(player)
  setNumber(player, "ParkOpen", 1)
  player:SetAttribute("CurrentPhase", "PARK_OPEN")
  recomputePark(player)
  markAction(player, "genre-core", "park-open")
end

local function finishParkDay(player)
  setNumber(player, "ParkOpen", 0)
  player:SetAttribute("CurrentPhase", "PARK_CLOSED")
  recomputePark(player)
  markAction(player, "genre-core", "park-close")
end

local function toggleParkSession(player)
  if readNumber(player, "ParkOpen", 0) == 1 then
    finishParkDay(player)
  else
    startParkDay(player)
  end
end

local function runCustomerFlow(player)
  recomputePark(player)
  if readNumber(player, "ParkOpen", 0) ~= 1 then
    markAction(player, "scope-corefun-a853810159", "guest-flow-park-closed")
    return
  end
  local guests = readNumber(player, "GuestCount", 0)
  local satisfaction = readNumber(player, "Satisfaction", 70)
  if guests > 0 then spawnCustomer(player) end
  local entryFee = clamp(readNumber(player, "EntryFee", 10), 10, 100)
  local revenue = math.floor(guests * entryFee * satisfaction / 100)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + revenue)
  setNumber(player, "Score", readNumber(player, "Score", 0) + satisfaction)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + guests)
  setNumber(player, "TrashCount", readNumber(player, "TrashCount", 0) + math.floor(guests / 6))
  recomputePark(player)
  markAction(player, "scope-corefun-a853810159", "guest-flow-satisfaction-revenue")
end

local function buildPathTile(player)
  setNumber(player, "PathTiles", readNumber(player, "PathTiles", 0) + 1)
  setNumber(player, "Position", readNumber(player, "PathTiles", 0))
  recomputePark(player)
  markAction(player, "scope-coreloop-0-523ae29a28", "path-placement")
end

local function placeRide(player)
  if readNumber(player, "PathTiles", 0) <= 0 then
    markAction(player, "scope-coreloop-1-640e4b8554", "ride-placement-needs-path")
    return
  end
  setNumber(player, "RideCount", readNumber(player, "RideCount", 0) + 1)
  recomputePark(player)
  markAction(player, "scope-coreloop-1-640e4b8554", "ride-placement")
end

local function upgradeRide(player)
  local coins = readNumber(player, "Coins", 0)
  local current = readNumber(player, "RideUpgradeLevel", 0)
  if current >= Config.DirectBuildUpSeed.MaxFacilityUpgrade then
    markAction(player, "scope-coreloop-2-3c5e4bad83", "ride-upgrade-maxed")
    return
  end
  local cost = 10 * (2 ^ current)
  if coins < cost then
    markAction(player, "scope-coreloop-2-3c5e4bad83", "ride-upgrade-needs-revenue")
    return
  end
  setNumber(player, "Coins", coins - cost)
  setNumber(player, "RideUpgradeLevel", current + 1)
  setNumber(player, "Level", math.max(readNumber(player, "Level", 1), current + 2))
  recomputePark(player)
  markAction(player, "scope-coreloop-2-3c5e4bad83", "ride-upgrade")
end

local function manageJanitors(player)
  local janitors = readNumber(player, "Janitors", 0)
  local trash = readNumber(player, "TrashCount", 0)
  if trash > 0 then
    setNumber(player, "TrashCount", math.max(0, trash - math.max(1, janitors)))
  elseif janitors < Config.DirectBuildUpSeed.MaxJanitors then
    setNumber(player, "Janitors", janitors + 1)
  end
  recomputePark(player)
  markAction(player, "scope-mobileux-99c5a4b00a", "janitor-cleaning")
end

local handlers = {
  ["genre-core"] = toggleParkSession,
  ["scope-corefun-a853810159"] = runCustomerFlow,
  ["scope-coreloop-0-523ae29a28"] = buildPathTile,
  ["scope-coreloop-1-640e4b8554"] = placeRide,
  ["scope-coreloop-2-3c5e4bad83"] = upgradeRide,
  ["scope-mobileux-99c5a4b00a"] = manageJanitors,
}

Players.PlayerAdded:Connect(function(player)
  local ok, saved = pcall(function()
    return store:GetAsync("player:" .. player.UserId)
  end)
  if ok and typeof(saved) == "table" then
    for key, fallback in pairs(Config.InitialState) do
      local value = saved[key]
      if typeof(value) == "number" then player:SetAttribute(key, value) else player:SetAttribute(key, fallback) end
    end
  else
    initializePlayer(player)
  end
end)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(function() if player:GetAttribute("Score") == nil then initializePlayer(player) end end)
end
remote.OnServerEvent:Connect(function(player, actionId)
  if typeof(actionId) ~= "string" then return end
  local handler = handlers[actionId]
  if typeof(handler) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or 0
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  handler(player)
end)
Players.PlayerRemoving:Connect(function(player)
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do snapshot[key] = readNumber(player, key, fallback) end
  pcall(function()
    store:UpdateAsync("player:" .. player.UserId, function() return snapshot end)
  end)
  lastAction[player] = nil
end)


-- native-foundation-sentinel-v1
local nativeFoundationRemote = ReplicatedStorage:FindFirstChild("RuntimeFoundationReport")
if nativeFoundationRemote and not nativeFoundationRemote:IsA("RemoteEvent") then
  nativeFoundationRemote:Destroy()
  nativeFoundationRemote = nil
end
if not nativeFoundationRemote then
  nativeFoundationRemote = Instance.new("RemoteEvent")
  nativeFoundationRemote.Name = "RuntimeFoundationReport"
  nativeFoundationRemote.Parent = ReplicatedStorage
end
local nativeFoundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")
-- SpawnLocation 자체와 주변 이동 영역을 물리 월드에 고정한 뒤 공개한다.
local lobbyCenter = nativeFoundationSpawn and nativeFoundationSpawn.Position or Vector3.new(0, 3, 0)
local lobbyGround = workspace:FindFirstChild("NativeLobbyGround")
if not lobbyGround then
  lobbyGround = Instance.new("Part")
  lobbyGround.Name = "NativeLobbyGround"
  lobbyGround.Size = Vector3.new(96, 2, 96)
  lobbyGround.Position = lobbyCenter - Vector3.new(0, 1.5, 0)
  lobbyGround.Anchored = true
  lobbyGround.CanCollide = true
  lobbyGround.Material = Enum.Material.Concrete
  lobbyGround.Color = Color3.fromRGB(86, 114, 98)
  lobbyGround.Parent = workspace
end
for index, side in ipairs({
  {Vector3.new(96, 8, 2), Vector3.new(0, 3, -48)},
  {Vector3.new(96, 8, 2), Vector3.new(0, 3, 48)},
  {Vector3.new(2, 8, 96), Vector3.new(-48, 3, 0)},
  {Vector3.new(2, 8, 96), Vector3.new(48, 3, 0)},
}) do
  local name = "NativeLobbyBoundary" .. index
  if not workspace:FindFirstChild(name) then
    local boundary = Instance.new("Part")
    boundary.Name = name
    boundary.Size = side[1]
    boundary.Position = lobbyCenter + side[2]
    boundary.Anchored = true
    boundary.CanCollide = true
    boundary.Transparency = 0.65
    boundary.Color = Color3.fromRGB(110, 144, 124)
    boundary.Parent = workspace
  end
end
if not nativeFoundationSpawn then
  nativeFoundationSpawn = Instance.new("SpawnLocation")
  nativeFoundationSpawn.Name = "NativeFoundationSpawn"
  nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
  nativeFoundationSpawn.Position = lobbyCenter
  nativeFoundationSpawn.Neutral = true
end
nativeFoundationSpawn.Anchored = true
nativeFoundationSpawn.CanCollide = true
nativeFoundationSpawn.Parent = workspace

-- F2: 현재 월드의 충돌 지면을 확인한 뒤에만 월드·스폰을 기록한다.
if parkWorld and parkWorld.Parent == workspace and lobbyGround.Parent == workspace and lobbyGround.CanCollide then
  foundationCheckpoint("WORLD_READY", nil, {worldReady = true})
end
local spawnSupportParams = RaycastParams.new()
spawnSupportParams.FilterType = Enum.RaycastFilterType.Exclude
spawnSupportParams.FilterDescendantsInstances = {nativeFoundationSpawn}
spawnSupportParams.RespectCanCollide = true
spawnSupportParams.IgnoreWater = true
spawnSupportParams.CollisionGroup = nativeFoundationSpawn.CollisionGroup
local spawnSupport = workspace:Raycast(
  nativeFoundationSpawn.Position + Vector3.new(0, 4, 0),
  Vector3.new(0, -20, 0),
  spawnSupportParams
)
local spawnBottom = nativeFoundationSpawn.Position.Y - nativeFoundationSpawn.Size.Y * 0.5
if nativeFoundationSpawn:IsA("SpawnLocation") and nativeFoundationSpawn.CanCollide
  and spawnSupport and spawnSupport.Normal.Y >= 0.55
  and math.abs(spawnSupport.Position.Y - spawnBottom) <= 0.6 then
  foundationCheckpoint("SPAWN_READY", nil, {spawnY = nativeFoundationSpawn.Position.Y, groundY = spawnSupport.Position.Y})
end

-- 공원 핵심 월드는 buildThemeParkWorld에서 생성하며 foundation은 같은 오브젝트를 재사용한다.
local function bindNativeFoundationCharacter(character)
  local foundationPlayer = Players:GetPlayerFromCharacter(character)
  local humanoid = character:WaitForChild("Humanoid", 10)
  local rootPart = character:WaitForChild("HumanoidRootPart", 10)
  if not humanoid or not rootPart then
    character:SetAttribute("FoundationFailure", "CHARACTER_FOUNDATION_FAILURE")
    return
  end

  character:SetAttribute("GROUND_CONTACT", false)
  character:SetAttribute("MOVEMENT_CONFIRMED", false)
  rootPart.Anchored = false
  humanoid.PlatformStand = false

  local raycastParams = RaycastParams.new()
  raycastParams.FilterType = Enum.RaycastFilterType.Exclude
  raycastParams.FilterDescendantsInstances = {character, nativeFoundationSpawn}
  raycastParams.RespectCanCollide = true
  raycastParams.IgnoreWater = true
  raycastParams.CollisionGroup = rootPart.CollisionGroup

  local clearance = humanoid.HipHeight + rootPart.Size.Y * 0.5
  local groundHit = workspace:Raycast(
    rootPart.Position + Vector3.new(0, 4, 0),
    Vector3.new(0, -(clearance + 12), 0),
    raycastParams
  )
  if not groundHit or groundHit.Normal.Y < 0.55 then
    groundHit = workspace:Raycast(
      nativeFoundationSpawn.Position + Vector3.new(0, 8, 0),
      Vector3.new(0, -20, 0),
      raycastParams
    )
  end
  if not groundHit or groundHit.Normal.Y < 0.55 then
    character:SetAttribute("FoundationFailure", "SPAWN_GROUND_MISSING")
    return
  end

  local target = groundHit.Position + Vector3.new(0, clearance + 0.1, 0)
  character:PivotTo(character:GetPivot() + (target - rootPart.Position))
  rootPart.AssemblyLinearVelocity = Vector3.zero
  rootPart.AssemblyAngularVelocity = Vector3.zero

  -- F3: 실제 캐릭터·루트 파트가 생성되고 유효한 좌표에 배치된 경우만 기록한다.
  local position = rootPart.Position
  if position.X ~= position.X or position.Y ~= position.Y or position.Z ~= position.Z
    or math.abs(position.X) == math.huge or math.abs(position.Y) == math.huge
    or math.abs(position.Z) == math.huge then
    character:SetAttribute("FoundationFailure", "INVALID_ROOT_POSITION")
    return
  end
  if foundationPlayer then
    foundationCheckpoint("CHARACTER_READY", foundationPlayer, {
      rootAnchored = rootPart.Anchored,
      platformStand = humanoid.PlatformStand,
      rootX = position.X, rootY = position.Y, rootZ = position.Z,
    })
  end

  local movementOrigin = rootPart.Position
  humanoid.Running:Connect(function(speed)
    if not rootPart.Parent or humanoid.FloorMaterial == Enum.Material.Air then return end
    local displacement = (rootPart.Position - movementOrigin) * Vector3.new(1, 0, 1)
    if speed > 0.1 and displacement.Magnitude > 0.5 then
      character:SetAttribute("MOVEMENT_CONFIRMED", true)
      if foundationPlayer then
        foundationCheckpoint("MOVEMENT_CONFIRMED", foundationPlayer, {displacement = displacement.Magnitude})
      end
    end
  end)

  local deadline = os.clock() + 5
  repeat
    if not character.Parent or not rootPart.Parent then return end
    local contact = workspace:Raycast(
      rootPart.Position,
      Vector3.new(0, -(clearance + 0.75), 0),
      raycastParams
    )
    if contact
      and contact.Normal.Y >= 0.55
      and humanoid.FloorMaterial ~= Enum.Material.Air
      and math.abs(rootPart.AssemblyLinearVelocity.Y) < 3
    then
      character:SetAttribute("GROUND_CONTACT", true)
      character:SetAttribute("FoundationFailure", nil)
      character:SetAttribute("NativeFoundationGroundingVersion", 2)
      if foundationPlayer then
        foundationCheckpoint("GROUND_CONTACT", foundationPlayer, {groundY = contact.Position.Y, rootY = rootPart.Position.Y})
      end
      return
    end
    task.wait(0.1)
  until os.clock() >= deadline

  character:SetAttribute("FoundationFailure", "GROUND_CONTACT_FAILURE")
end
local function bindNativeFoundationPlayer(player)
  if player.Character then task.defer(bindNativeFoundationCharacter, player.Character) end
  player.CharacterAdded:Connect(bindNativeFoundationCharacter)
end
Players.PlayerAdded:Connect(bindNativeFoundationPlayer)
for _, nativeFoundationPlayer in ipairs(Players:GetPlayers()) do
  task.defer(bindNativeFoundationPlayer, nativeFoundationPlayer)
end
nativeFoundationRemote.OnServerEvent:Connect(function(player, signal)
  if typeof(signal) ~= "string" then return end
  player:SetAttribute("NativeFoundationReadyAt", os.time())
  -- F5는 실제 클라이언트가 보낸 준비 보고만 저장한다. F1~F4를 대신 통과시키지 않는다.
  if signal == "CAMERA_READY" or signal == "INPUT_READY" or signal == "INPUT_READY_TOUCH" then
    if player.Character and player.Character:FindFirstChildOfClass("Humanoid") then
      foundationCheckpoint(signal == "INPUT_READY_TOUCH" and "INPUT_READY" or signal, player, {clientReported = true})
    end
  end
end)
game:BindToClose(function() end)
