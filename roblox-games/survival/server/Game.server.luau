local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("survival-development-v1")
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

local RunService = game:GetService("RunService")

local function markAction(player, actionId, learningPattern)
  player:SetAttribute("LastApprovedScope", actionId)
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", learningPattern)
end

local function ensureWorldPart(parent, name, size, position, material, color)
  local part = parent:FindFirstChild(name)
  if part and not part:IsA("BasePart") then part:Destroy(); part = nil end
  if not part then
    part = Instance.new("Part")
    part.Name = name
    part.Size = size
    part.Position = position
    part.Anchored = true
    part.CanCollide = true
    part.Parent = parent
  end
  part.Material = material
  part.Color = color
  return part
end

local function buildSurvivalWorld()
  local world = workspace:FindFirstChild("SurvivalWorld")
  if not world then
    world = Instance.new("Folder")
    world.Name = "SurvivalWorld"
    world.Parent = workspace
  end

  local resources = world:FindFirstChild("Resources")
  if not resources then
    resources = Instance.new("Folder")
    resources.Name = "Resources"
    resources.Parent = world
  end

  local enemies = world:FindFirstChild("Enemies")
  if not enemies then
    enemies = Instance.new("Folder")
    enemies.Name = "Enemies"
    enemies.Parent = world
  end

  ensureWorldPart(world, "SurvivalLandmarkCamp", Vector3.new(18, 1, 18), Vector3.new(0, 0, 0), Enum.Material.Slate, Color3.fromRGB(86, 91, 82))
  ensureWorldPart(world, "SurvivalObjectiveWorkbench", Vector3.new(5, 2, 3), Vector3.new(8, 1, 0), Enum.Material.WoodPlanks, Color3.fromRGB(126, 91, 58))
  ensureWorldPart(resources, "WoodResourceNode", Vector3.new(3, 5, 3), Vector3.new(-12, 2.5, 8), Enum.Material.Wood, Color3.fromRGB(94, 74, 48))
  ensureWorldPart(resources, "StoneResourceNode", Vector3.new(4, 3, 4), Vector3.new(13, 1.5, 7), Enum.Material.Rock, Color3.fromRGB(112, 117, 123))
  local enemySpawn = ensureWorldPart(world, "SurvivalEnemySpawn", Vector3.new(4, 0.5, 4), Vector3.new(0, 0.25, 24), Enum.Material.Basalt, Color3.fromRGB(108, 70, 70))
  enemySpawn.CanCollide = false
  return world, resources, enemies, enemySpawn
end

local survivalWorld, survivalResources, survivalEnemies, survivalEnemySpawn = buildSurvivalWorld()

local function bindEnemyAi(enemy, owner)
  local humanoid = enemy:FindFirstChildOfClass("Humanoid")
  local rootPart = enemy.PrimaryPart
  if not humanoid or not rootPart then return end

  local nextThinkAt = 0
  local aiConnection
  aiConnection = RunService.Heartbeat:Connect(function()
    if not enemy.Parent or not owner.Parent then
      if aiConnection then aiConnection:Disconnect() end
      return
    end
    local now = os.clock()
    if now < nextThinkAt then return end
    nextThinkAt = now + 0.35

    local character = owner.Character
    local targetRoot = character and character:FindFirstChild("HumanoidRootPart")
    if not targetRoot then return end
    local distance = (targetRoot.Position - rootPart.Position).Magnitude
    if distance <= 64 then
      enemy:SetAttribute("Aggro", true)
      enemy:SetAttribute("TargetUserId", owner.UserId)
      if distance > 5 then
        enemy:SetAttribute("AttackState", "CHASE")
        humanoid:MoveTo(targetRoot.Position)
      else
        enemy:SetAttribute("AttackState", "WINDUP")
      end
    else
      enemy:SetAttribute("Aggro", false)
      enemy:SetAttribute("AttackState", "DISENGAGE")
      humanoid:MoveTo(survivalEnemySpawn.Position)
    end
  end)
end

local function spawnEnemy(player)
  local enemy = Instance.new("Model")
  enemy.Name = "SurvivalEnemy_" .. tostring(player.UserId)
  enemy:SetAttribute("OwnerUserId", player.UserId)
  enemy:SetAttribute("AttackState", "SPAWN")

  local rootPart = Instance.new("Part")
  rootPart.Name = "HumanoidRootPart"
  rootPart.Size = Vector3.new(2.4, 3.2, 2.4)
  rootPart.Position = survivalEnemySpawn.Position + Vector3.new(0, 2, 0)
  rootPart.Anchored = false
  rootPart.CanCollide = true
  rootPart.Material = Enum.Material.SmoothPlastic
  rootPart.Color = Color3.fromRGB(128, 72, 72)
  rootPart.Parent = enemy

  local humanoid = Instance.new("Humanoid")
  humanoid.MaxHealth = 100
  humanoid.Health = math.clamp(readNumber(player, "EnemyHealth", 100), 1, 100)
  humanoid.WalkSpeed = 8
  humanoid.Parent = enemy

  enemy.PrimaryPart = rootPart
  enemy.Parent = survivalEnemies
  bindEnemyAi(enemy, player)
  return enemy
end

local function currentEnemyFor(player)
  for _, enemy in ipairs(survivalEnemies:GetChildren()) do
    if enemy:IsA("Model") and enemy:GetAttribute("OwnerUserId") == player.UserId then
      return enemy
    end
  end
  return nil
end

local function gatherResource(player)
  local wood = survivalResources:FindFirstChild("WoodResourceNode")
  local stone = survivalResources:FindFirstChild("StoneResourceNode")
  local chooseWood = readNumber(player, "ResourceWood", 0) <= readNumber(player, "ResourceStone", 0)
  if chooseWood then
    setNumber(player, "ResourceWood", readNumber(player, "ResourceWood", 0) + 1)
    if wood then wood:SetAttribute("LastGatheredBy", player.UserId) end
  else
    setNumber(player, "ResourceStone", readNumber(player, "ResourceStone", 0) + 1)
    if stone then stone:SetAttribute("LastGatheredBy", player.UserId) end
  end
end

local function craftAndEquipTool(player)
  local wood = readNumber(player, "ResourceWood", 0)
  local stone = readNumber(player, "ResourceStone", 0)
  if wood < 1 or stone < 1 then return false end
  setNumber(player, "ResourceWood", wood - 1)
  setNumber(player, "ResourceStone", stone - 1)
  setNumber(player, "InventoryItems", readNumber(player, "InventoryItems", 0) + 1)
  setNumber(player, "EquippedToolTier", math.max(1, readNumber(player, "EquippedToolTier", 0)))
  return true
end

local function awardEnemyDefeat(player, enemy)
  if enemy and enemy.Parent then enemy:Destroy() end
  setNumber(player, "EnemyHealth", 100)
  setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  setNumber(player, "EnemyKills", readNumber(player, "EnemyKills", 0) + 1)
end

local function attackEnemy(player, damage)
  local enemy = currentEnemyFor(player) or spawnEnemy(player)
  local humanoid = enemy and enemy:FindFirstChildOfClass("Humanoid")
  if not humanoid then return false end
  humanoid:TakeDamage(damage)
  local remaining = math.max(0, math.floor(humanoid.Health))
  setNumber(player, "EnemyHealth", remaining)
  enemy:SetAttribute("AttackState", "HIT_REACTION")
  enemy:SetAttribute("CombatCooldownUntil", os.clock() + Config.RateLimitSeconds)
  if remaining <= 0 then
    awardEnemyDefeat(player, enemy)
    return true
  end
  return false
end

local function updateProgressionRecord(player)
  setNumber(player, "SurvivalRecord", math.max(readNumber(player, "SurvivalRecord", 0), readNumber(player, "Wave", 1)))
  setNumber(player, "RecipeUnlock", math.max(readNumber(player, "RecipeUnlock", 0), readNumber(player, "EquippedToolTier", 0)))
end

local function startDayPhase(player)
  setNumber(player, "DayPhase", 0)
  setNumber(player, "Objective", readNumber(player, "Objective", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 7)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 9)
  updateProgressionRecord(player)
  markAction(player, "genre-core", "board-grid-placement")
end

local function exploreGatherAndCraft(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 3) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 5)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  gatherResource(player)
  craftAndEquipTool(player)
  markAction(player, "scope-coreloop-0-bfe946a409", "input-drag-touch")
end

local function fightCurrentEnemy(player)
  attackEnemy(player, 12)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 10)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  markAction(player, "scope-corefun-1cd2fbbfbf", "score-combo-reward")
end

local function startNightWave(player)
  setNumber(player, "DayPhase", 1)
  if not currentEnemyFor(player) then spawnEnemy(player) end
  attackEnemy(player, 14)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 12)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  markAction(player, "scope-coreloop-1-db2f6e6134", "progression-difficulty")
end

local function finishNightWave(player)
  local defeated = attackEnemy(player, 15)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 13)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 9)
  if defeated then
    setNumber(player, "DayPhase", 0)
    setNumber(player, "CurrentDay", readNumber(player, "CurrentDay", 1) + 1)
    updateProgressionRecord(player)
  end
  markAction(player, "scope-coreloop-2-7bd63ffae3", "save-state-persistence")
end

local function resetNextDayStrategy(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 3) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 8)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 11)
  updateProgressionRecord(player)
  markAction(player, "scope-coreloop-3-133b4afeb9", "ads-monetization")
end

local function useEquippedTool(player)
  attackEnemy(player, 17)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 15)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 11)
  markAction(player, "scope-mobileux-4d98ef9e2d", "short-session")
end

local handlers = {
  ["genre-core"] = startDayPhase,
  ["scope-corefun-1cd2fbbfbf"] = fightCurrentEnemy,
  ["scope-coreloop-0-bfe946a409"] = exploreGatherAndCraft,
  ["scope-coreloop-1-db2f6e6134"] = startNightWave,
  ["scope-coreloop-2-7bd63ffae3"] = finishNightWave,
  ["scope-coreloop-3-133b4afeb9"] = resetNextDayStrategy,
  ["scope-mobileux-4d98ef9e2d"] = useEquippedTool,
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
