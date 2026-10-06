local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local store = nil
local storeOk, storeResult = pcall(function()
  return DataStoreService:GetDataStore("seed-casual-realm-weaver-development-v1")
end)
if storeOk then store = storeResult end
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
  local chain = readNumber(player, "PuzzleChain", 0) + 1
  setNumber(player, "PuzzleChain", chain)
  setNumber(player, "Score", readNumber(player, "Score", 0) + chain * 3)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  player:SetAttribute("LastApprovedScope", "genre-core")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "board-grid-placement")
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
  player:SetAttribute("LastApprovedScope", "scope-corefun-5b52385f9a")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "score-combo-reward")
end

local function scopeHandler3(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 3) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 5)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-0-b46035eaa3")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "input-drag-touch")
end

local function scopeHandler4(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 11)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 9)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 6)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-1-a21a6e21b0")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "progression-difficulty")
end

local function scopeHandler5(player)
  setNumber(player, "Objective", readNumber(player, "Objective", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 11)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 13)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-2-edebd26130")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "save-state-persistence")
end

local function scopeHandler6(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 13)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 11)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 8)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-3-545e010215")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "ads-monetization")
end

local function scopeHandler7(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 1) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 9)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 10)
  player:SetAttribute("LastApprovedScope", "scope-mobileux-6b1e61eae0")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "board-state")
end

local handlers = {
  ["genre-core"] = scopeHandler1,
  ["scope-corefun-5b52385f9a"] = scopeHandler2,
  ["scope-coreloop-0-b46035eaa3"] = scopeHandler3,
  ["scope-coreloop-1-a21a6e21b0"] = scopeHandler4,
  ["scope-coreloop-2-edebd26130"] = scopeHandler5,
  ["scope-coreloop-3-545e010215"] = scopeHandler6,
  ["scope-mobileux-6b1e61eae0"] = scopeHandler7,
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
  local humanoid = character:WaitForChild("Humanoid", 10)
  local rootPart = character:WaitForChild("HumanoidRootPart", 10)
  if not humanoid or not rootPart then character:SetAttribute("FoundationFailure", "CHARACTER_FOUNDATION_FAILURE"); return end
  character:SetAttribute("GROUND_CONTACT", false)
  character:SetAttribute("MOVEMENT_CONFIRMED", false)
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  for _, bodyPart in ipairs(character:GetDescendants()) do
    if bodyPart:IsA("BasePart") and not bodyPart:FindFirstAncestorOfClass("Tool") then bodyPart.Anchored = false end
  end
  local params = RaycastParams.new()
  params.ExcludeInstances = {character, nativeFoundationSpawn}
  params.RespectCanCollide = true
  params.IgnoreWater = true
  params.CollisionGroup = rootPart.CollisionGroup
  local leg = humanoid.RigType == Enum.HumanoidRigType.R6 and character:FindFirstChild("Left Leg") or nil
  local clearance = humanoid.HipHeight + rootPart.Size.Y * 0.5 + (leg and leg.Size.Y or 0)
  local groundHit = workspace:Raycast(rootPart.Position + Vector3.new(0, 4, 0), Vector3.new(0, -512, 0), params)
  if not groundHit or groundHit.Normal.Y < 0.55 then
    groundHit = workspace:Raycast(nativeFoundationSpawn.Position + Vector3.new(0, 64, 0), Vector3.new(0, -576, 0), params)
  end
  if not groundHit or groundHit.Normal.Y < 0.55 then
    character:SetAttribute("FoundationFailure", "SPAWN_GROUND_MISSING")
    return
  end
  -- The existing spawn rests on verified world geometry; it cannot be its own ground proof.
  local spawnHit = workspace:Raycast(nativeFoundationSpawn.Position + Vector3.new(0, 64, 0), Vector3.new(0, -576, 0), params)
  if spawnHit and spawnHit.Normal.Y >= 0.55 then
    nativeFoundationSpawn.Position = Vector3.new(nativeFoundationSpawn.Position.X, spawnHit.Position.Y - nativeFoundationSpawn.Size.Y * 0.5 + 0.05, nativeFoundationSpawn.Position.Z)
  end
  local target = groundHit.Position + Vector3.new(0, clearance + 0.1, 0)
  character:PivotTo(character:GetPivot() + (target - rootPart.Position))
  rootPart.AssemblyLinearVelocity = Vector3.zero
  rootPart.AssemblyAngularVelocity = Vector3.zero
  local movementOrigin = rootPart.Position
  humanoid.Running:Connect(function(speed)
    if not rootPart.Parent or humanoid.FloorMaterial == Enum.Material.Air then return end
    local displacement = (rootPart.Position - movementOrigin) * Vector3.new(1, 0, 1)
    if speed > 0.1 and displacement.Magnitude > 0.5 then character:SetAttribute("MOVEMENT_CONFIRMED", true) end
  end)
  local deadline = os.clock() + 5
  repeat
    if not character.Parent or not rootPart.Parent then return end
    local contact = workspace:Raycast(rootPart.Position, Vector3.new(0, -(clearance + 0.75), 0), params)
    if contact and contact.Normal.Y >= 0.55 and humanoid.FloorMaterial ~= Enum.Material.Air and math.abs(rootPart.AssemblyLinearVelocity.Y) < 3 then
      character:SetAttribute("GROUND_CONTACT", true)
      character:SetAttribute("FoundationFailure", nil)
      character:SetAttribute("NativeFoundationGroundingVersion", 2)
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
end)
game:BindToClose(function() end)
