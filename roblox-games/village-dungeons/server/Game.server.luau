local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("village-dungeons-development-v1")
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

local function scopeHandler1(player)
  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - 11)
  setNumber(player, "EnemyHealth", enemy)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 9)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 5)
  if enemy <= 0 then
    setNumber(player, "EnemyHealth", 100)
    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  end
  player:SetAttribute("LastApprovedScope", "scope-corefun-029d85a01a")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "idle-reward")
end

local function scopeHandler2(player)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 8)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 5)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-0-ba1530d55b")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "offline-progress")
end

local function scopeHandler3(player)
  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - 13)
  setNumber(player, "EnemyHealth", enemy)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 11)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 7)
  if enemy <= 0 then
    setNumber(player, "EnemyHealth", 100)
    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  end
  player:SetAttribute("LastApprovedScope", "scope-coreloop-1-14e5fec9e4")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "upgrade-layer")
end

local function scopeHandler4(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 11)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 9)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 6)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-2-21cda65cb7")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "claim-idempotency")
end

local function scopeHandler5(player)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 11)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 8)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 9)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-3-efa14099cd")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "persistent-growth")
end

local function scopeHandler6(player)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 9)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 10)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-4-d2fe2a4ec6")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "commercial-idle-runtime-architecture")
end

local function scopeHandler7(player)
  setNumber(player, "Health", math.clamp(readNumber(player, "Health", 100) - 1, 0, 100))
  setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 12)
  player:SetAttribute("LastApprovedScope", "scope-mobileux-a3fe13f59a")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "board-state")
end

local handlers = {
  ["scope-corefun-029d85a01a"] = scopeHandler1,
  ["scope-coreloop-0-ba1530d55b"] = scopeHandler2,
  ["scope-coreloop-1-14e5fec9e4"] = scopeHandler3,
  ["scope-coreloop-2-21cda65cb7"] = scopeHandler4,
  ["scope-coreloop-3-efa14099cd"] = scopeHandler5,
  ["scope-coreloop-4-d2fe2a4ec6"] = scopeHandler6,
  ["scope-mobileux-a3fe13f59a"] = scopeHandler7,
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
-- A packaged place has no Studio baseplate. Build solid ground before exposing its spawn.
local villageGround = workspace:FindFirstChild("VillageGround")
if not villageGround then
  villageGround = Instance.new("Part")
  villageGround.Name = "VillageGround"
  villageGround.Size = Vector3.new(160, 2, 160)
  villageGround.Position = Vector3.new(0, 1, 0)
  villageGround.Anchored = true
  villageGround.CanCollide = true
  villageGround.Material = Enum.Material.Cobblestone
  villageGround.Color = Color3.fromRGB(119, 126, 109)
  villageGround.TopSurface = Enum.SurfaceType.Smooth
  villageGround.Parent = workspace
  for index, edge in ipairs({
    {Vector3.new(160, 10, 2), Vector3.new(0, 7, -79)},
    {Vector3.new(160, 10, 2), Vector3.new(0, 7, 79)},
    {Vector3.new(2, 10, 156), Vector3.new(-79, 7, 0)},
    {Vector3.new(2, 10, 156), Vector3.new(79, 7, 0)},
  }) do
    local wall = Instance.new("Part")
    wall.Name = "VillageBoundary" .. index
    wall.Size = edge[1]
    wall.Position = edge[2]
    wall.Anchored = true
    wall.CanCollide = true
    wall.Material = Enum.Material.Brick
    wall.Color = Color3.fromRGB(105, 112, 97)
    wall.Parent = villageGround
  end
end
if not nativeFoundationSpawn then
  nativeFoundationSpawn = Instance.new("SpawnLocation")
  nativeFoundationSpawn.Name = "NativeFoundationSpawn"
  nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
  nativeFoundationSpawn.Position = Vector3.new(0, 3, 0)
  nativeFoundationSpawn.Anchored = true
  nativeFoundationSpawn.CanCollide = true
  nativeFoundationSpawn.Neutral = true
  nativeFoundationSpawn.Parent = workspace
end
local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid")
  local rootPart = character:WaitForChild("HumanoidRootPart")
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  local params = RaycastParams.new()
  params.FilterType = Enum.RaycastFilterType.Exclude
  params.FilterDescendantsInstances = {character}
  local groundHit = workspace:Raycast(rootPart.Position, Vector3.new(0, -10, 0), params)
  character:SetAttribute("GROUND_CONTACT", groundHit ~= nil)
  character:SetAttribute("MOVEMENT_CONFIRMED", false)
  local origin = rootPart.Position
  task.spawn(function()
    while character.Parent and humanoid.Health > 0 do
      local delta = rootPart.Position - origin
      if Vector3.new(delta.X, 0, delta.Z).Magnitude > 1 and humanoid.FloorMaterial ~= Enum.Material.Air then
        character:SetAttribute("MOVEMENT_CONFIRMED", true)
        break
      end
      task.wait(0.25)
    end
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
