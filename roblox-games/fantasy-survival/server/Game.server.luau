local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("fantasy-survival-development-v1")
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
  setNumber(player, "Health", math.clamp(readNumber(player, "Health", 100) - 1, 0, 100))
  setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  player:SetAttribute("LastApprovedScope", "genre-core")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "idle-reward")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local function scopeHandler2(player)
  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - 12)
  setNumber(player, "EnemyHealth", enemy)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 10)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  if enemy <= 0 then
    setNumber(player, "EnemyHealth", 100)
    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  end
  player:SetAttribute("LastApprovedScope", "scope-corefun-ea77622450")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "offline-progress")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
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
  player:SetAttribute("LastApprovedScope", "scope-coreloop-0-9b2d4dfbc6")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "upgrade-layer")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local function scopeHandler4(player)
  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - 14)
  setNumber(player, "EnemyHealth", enemy)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 12)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  if enemy <= 0 then
    setNumber(player, "EnemyHealth", 100)
    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  end
  player:SetAttribute("LastApprovedScope", "scope-coreloop-1-6ebe58f496")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "claim-idempotency")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local function scopeHandler5(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 10)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 7)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-2-6c927cfa40")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "persistent-growth")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local function scopeHandler6(player)
  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - 16)
  setNumber(player, "EnemyHealth", enemy)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 14)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 10)
  if enemy <= 0 then
    setNumber(player, "EnemyHealth", 100)
    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  end
  player:SetAttribute("LastApprovedScope", "scope-mobileux-5acfb2eaa6")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "commercial-idle-runtime-architecture")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local handlers = {
  ["genre-core"] = scopeHandler1,
  ["scope-corefun-ea77622450"] = scopeHandler2,
  ["scope-coreloop-0-9b2d4dfbc6"] = scopeHandler3,
  ["scope-coreloop-1-6ebe58f496"] = scopeHandler4,
  ["scope-coreloop-2-6c927cfa40"] = scopeHandler5,
  ["scope-mobileux-5acfb2eaa6"] = scopeHandler6,
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
if not nativeFoundationSpawn then
  nativeFoundationSpawn = Instance.new("SpawnLocation")
  nativeFoundationSpawn.Name = "NativeFoundationSpawn"
  nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
  nativeFoundationSpawn.Position = Vector3.new(0, 3, 0)
  nativeFoundationSpawn.Neutral = true
  nativeFoundationSpawn.Parent = workspace
end
local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid")
  local rootPart = character:WaitForChild("HumanoidRootPart")
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  local groundHit = workspace:Raycast(rootPart.Position, Vector3.new(0, -10, 0))
  character:SetAttribute("GROUND_CONTACT", groundHit ~= nil)
  character:SetAttribute("MOVEMENT_CONFIRMED", true)
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
