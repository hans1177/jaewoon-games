-- 파일명: roblox-games/amusement-tycoon/server/Game.server.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
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

local function scopeHandler1(player)
  local nextOpen = readNumber(player, "ParkOpen", 0) == 1 and 0 or 1
  setNumber(player, "ParkOpen", nextOpen)
  recomputePark(player)
  markAction(player, "genre-core", "park-open-close")
end

local function scopeHandler2(player)
  recomputePark(player)
  if readNumber(player, "ParkOpen", 0) ~= 1 then
    markAction(player, "scope-corefun-a853810159", "guest-flow-park-closed")
    return
  end
  local guests = readNumber(player, "GuestCount", 0)
  local satisfaction = readNumber(player, "Satisfaction", 70)
  local entryFee = clamp(readNumber(player, "EntryFee", 10), 10, 100)
  local revenue = math.floor(guests * entryFee * satisfaction / 100)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + revenue)
  setNumber(player, "Score", readNumber(player, "Score", 0) + satisfaction)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + guests)
  setNumber(player, "TrashCount", readNumber(player, "TrashCount", 0) + math.floor(guests / 6))
  recomputePark(player)
  markAction(player, "scope-corefun-a853810159", "guest-flow-satisfaction-revenue")
end

local function scopeHandler3(player)
  setNumber(player, "PathTiles", readNumber(player, "PathTiles", 0) + 1)
  setNumber(player, "Position", readNumber(player, "PathTiles", 0))
  recomputePark(player)
  markAction(player, "scope-coreloop-0-523ae29a28", "path-placement")
end

local function scopeHandler4(player)
  if readNumber(player, "PathTiles", 0) <= 0 then
    markAction(player, "scope-coreloop-1-640e4b8554", "ride-placement-needs-path")
    return
  end
  setNumber(player, "RideCount", readNumber(player, "RideCount", 0) + 1)
  recomputePark(player)
  markAction(player, "scope-coreloop-1-640e4b8554", "ride-placement")
end

local function scopeHandler5(player)
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

local function scopeHandler6(player)
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
  ["genre-core"] = scopeHandler1,
  ["scope-corefun-a853810159"] = scopeHandler2,
  ["scope-coreloop-0-523ae29a28"] = scopeHandler3,
  ["scope-coreloop-1-640e4b8554"] = scopeHandler4,
  ["scope-coreloop-2-3c5e4bad83"] = scopeHandler5,
  ["scope-mobileux-99c5a4b00a"] = scopeHandler6,
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

-- 직접 1차 빌드업: 입구 카운터와 건설 가능한 공원 구역만 제공하고 이후 확장은 자동 순환에 맡긴다.
local parkSeed = workspace:FindFirstChild("AmusementTycoonSeed")
if not parkSeed then
  parkSeed = Instance.new("Folder")
  parkSeed.Name = "AmusementTycoonSeed"
  parkSeed.Parent = workspace

  local counter = Instance.new("Part")
  counter.Name = "EntranceCounter"
  counter.Size = Vector3.new(8, 4, 3)
  counter.Position = lobbyCenter + Vector3.new(0, 2, -12)
  counter.Anchored = true
  counter.CanCollide = true
  counter.Material = Enum.Material.Wood
  counter.Color = Color3.fromRGB(154, 104, 66)
  counter.Parent = parkSeed

  local buildPad = Instance.new("Part")
  buildPad.Name = "RideBuildPad"
  buildPad.Size = Vector3.new(22, 0.4, 22)
  buildPad.Position = lobbyCenter + Vector3.new(18, 0.2, 10)
  buildPad.Anchored = true
  buildPad.CanCollide = true
  buildPad.Material = Enum.Material.Concrete
  buildPad.Color = Color3.fromRGB(96, 126, 158)
  buildPad.Parent = parkSeed

  local path = Instance.new("Part")
  path.Name = "StarterPath"
  path.Size = Vector3.new(8, 0.3, 26)
  path.Position = lobbyCenter + Vector3.new(0, 0.25, 3)
  path.Anchored = true
  path.CanCollide = true
  path.Material = Enum.Material.Concrete
  path.Color = Color3.fromRGB(190, 184, 166)
  path.Parent = parkSeed
end
local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid")
  local rootPart = character:WaitForChild("HumanoidRootPart")
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  local raycastParams = RaycastParams.new()
  raycastParams.FilterType = Enum.RaycastFilterType.Exclude
  raycastParams.FilterDescendantsInstances = {character}
  local groundHit = workspace:Raycast(rootPart.Position, Vector3.new(0, -10, 0), raycastParams)
  character:SetAttribute("GROUND_CONTACT", groundHit ~= nil)
  character:SetAttribute("MOVEMENT_CONFIRMED", false)
  humanoid.Running:Connect(function(speed)
    character:SetAttribute("MOVEMENT_CONFIRMED", speed > 0.1 and humanoid.FloorMaterial ~= Enum.Material.Air)
  end)
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
end)
game:BindToClose(function() end)
