local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local RunService = game:GetService("RunService")
local store = nil
local storeOk, storeResult = pcall(function()
  return DataStoreService:GetDataStore("fantasy-survival-development-v1")
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
local enemiesByUserId = {}

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

local function ensureWorldPart(parent, name, size, position, material, color)
  local part = parent:FindFirstChild(name)
  if part and not part:IsA("BasePart") then part:Destroy(); part = nil end
  if not part then
    part = Instance.new("Part")
    part.Name = name
    part.Anchored = true
    part.CanCollide = true
    part.Parent = parent
  end
  part.Size = size
  part.Position = position
  part.Material = material
  part.Color = color
  return part
end

local function buildWorld()
  local world = workspace:FindFirstChild("MagicForestWorld")
  if not world then
    world = Instance.new("Model")
    world.Name = "MagicForestWorld"
    world.Parent = workspace
  end

  local forestRegion = ensureWorldPart(world, "ForestRegion", Vector3.new(150, 2, 150), Vector3.new(0, -1, 0), Enum.Material.Grass, Color3.fromRGB(58, 95, 63))
  local campLandmark = ensureWorldPart(world, "CampLandmark", Vector3.new(18, 1, 18), Vector3.new(0, 0.5, 0), Enum.Material.Slate, Color3.fromRGB(92, 104, 84))
  local resourceNode = ensureWorldPart(world, "ForestResourceNode", Vector3.new(5, 5, 5), Vector3.new(-18, 2.5, 8), Enum.Material.Wood, Color3.fromRGB(100, 78, 48))
  local enemySpawn = ensureWorldPart(world, "EnemySpawnZone", Vector3.new(10, 1, 10), Vector3.new(0, 0.5, 34), Enum.Material.Ground, Color3.fromRGB(112, 66, 58))
  local bossLandmark = ensureWorldPart(world, "BossLandmark", Vector3.new(12, 4, 4), Vector3.new(0, 2, 60), Enum.Material.Rock, Color3.fromRGB(94, 70, 112))
  local questBoard = ensureWorldPart(world, "QuestObjectiveBoard", Vector3.new(5, 5, 1), Vector3.new(12, 2.5, 0), Enum.Material.WoodPlanks, Color3.fromRGB(124, 92, 58))

  forestRegion:SetAttribute("Zone", "MAGIC_FOREST")
  campLandmark:SetAttribute("Landmark", "SURVIVAL_CAMP")
  resourceNode:SetAttribute("ResourceNode", "RUN_REWARD")
  enemySpawn:SetAttribute("Hazard", "HORDE_ENTRY")
  bossLandmark:SetAttribute("Landmark", "BOSS_APPROACH")
  questBoard:SetAttribute("Objective", "SURVIVE_AND_GROW")

  local spawn = world:FindFirstChild("ForestSpawn")
  if not spawn then
    spawn = Instance.new("SpawnLocation")
    spawn.Name = "ForestSpawn"
    spawn.Size = Vector3.new(8, 1, 8)
    spawn.Position = Vector3.new(0, 3, 0)
    spawn.Anchored = true
    spawn.CanCollide = true
    spawn.Neutral = true
    spawn.Parent = world
  end

  local enemies = world:FindFirstChild("Enemies")
  if not enemies then
    enemies = Instance.new("Folder")
    enemies.Name = "Enemies"
    enemies.Parent = world
  end

  world:SetAttribute("WorldReady", true)
  return {
    model = world,
    forestRegion = forestRegion,
    campLandmark = campLandmark,
    resourceNode = resourceNode,
    enemySpawn = enemySpawn,
    bossLandmark = bossLandmark,
    questBoard = questBoard,
    spawn = spawn,
    enemies = enemies,
  }
end

local worldState = buildWorld()

local function selectEnemyTarget(origin)
  local nearestRoot = nil
  local nearestDistance = math.huge
  for _, candidate in ipairs(Players:GetPlayers()) do
    local character = candidate.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    local targetRoot = character and character:FindFirstChild("HumanoidRootPart")
    if humanoid and humanoid.Health > 0 and targetRoot and targetRoot:IsA("BasePart") then
      local distance = (targetRoot.Position - origin).Magnitude
      if distance < nearestDistance then
        nearestDistance = distance
        nearestRoot = targetRoot
      end
    end
  end
  return nearestRoot, nearestDistance
end

local function updateEnemyAI(enemy)
  local humanoid = enemy:FindFirstChildOfClass("Humanoid")
  local rootPart = enemy.PrimaryPart
  if not humanoid or not rootPart then return end

  local nextThinkAt = 0
  local connection
  connection = RunService.Heartbeat:Connect(function()
    if not enemy.Parent then
      connection:Disconnect()
      return
    end
    local now = os.clock()
    if now < nextThinkAt then return end
    nextThinkAt = now + 0.35

    local target, distance = selectEnemyTarget(rootPart.Position)
    if not target then
      enemy:SetAttribute("Aggro", false)
      enemy:SetAttribute("AttackState", "RETURN_TO_SPAWN")
      humanoid:MoveTo(worldState.enemySpawn.Position + Vector3.new(0, 2, 0))
      return
    end

    local inAggroRange = distance <= 72
    enemy:SetAttribute("Target", target.Parent and target.Parent.Name or "")
    enemy:SetAttribute("Aggro", inAggroRange)
    if not inAggroRange then
      enemy:SetAttribute("AttackState", "DISENGAGE")
      humanoid:MoveTo(worldState.enemySpawn.Position + Vector3.new(0, 2, 0))
    elseif distance <= 6 then
      enemy:SetAttribute("AttackState", "ATTACK_ANTICIPATION")
      humanoid:MoveTo(rootPart.Position)
    else
      enemy:SetAttribute("AttackState", "CHASE")
      humanoid:MoveTo(target.Position)
    end
  end)
end

local function despawnEnemy(player)
  local enemy = enemiesByUserId[player.UserId]
  enemiesByUserId[player.UserId] = nil
  if enemy and enemy.Parent then enemy:Destroy() end
end

local function spawnEnemy(player, boss)
  despawnEnemy(player)

  local enemy = Instance.new("Model")
  enemy.Name = (boss and "ForestBoss_" or "HordeEnemy_") .. player.UserId
  enemy:SetAttribute("OwnerUserId", player.UserId)
  enemy:SetAttribute("AttackState", "SPAWN")
  enemy:SetAttribute("Boss", boss == true)

  local rootPart = Instance.new("Part")
  rootPart.Name = "HumanoidRootPart"
  rootPart.Size = boss and Vector3.new(4, 5, 4) or Vector3.new(2.5, 3.5, 2.5)
  rootPart.Position = worldState.enemySpawn.Position + Vector3.new((player.UserId % 5) * 2 - 4, boss and 3 or 2, 0)
  rootPart.Anchored = false
  rootPart.CanCollide = true
  rootPart.Material = boss and Enum.Material.Slate or Enum.Material.SmoothPlastic
  rootPart.Color = boss and Color3.fromRGB(104, 68, 126) or Color3.fromRGB(112, 74, 70)
  rootPart.Parent = enemy

  local humanoid = Instance.new("Humanoid")
  humanoid.MaxHealth = 100
  humanoid.Health = math.clamp(readNumber(player, "EnemyHealth", 100), 1, 100)
  humanoid.WalkSpeed = boss and 7 or 9
  humanoid.Parent = enemy

  enemy.PrimaryPart = rootPart
  enemy.Parent = worldState.enemies
  enemiesByUserId[player.UserId] = enemy
  updateEnemyAI(enemy)
  return enemy
end

local function spawnBoss(player)
  return spawnEnemy(player, true)
end

local function updateQuestObjective(player)
  local wave = readNumber(player, "Wave", 1)
  player:SetAttribute("QuestState", "SURVIVE_WAVE_" .. wave)
  worldState.questBoard:SetAttribute("CurrentWave", wave)
end

local function equipUpgrade(player)
  local level = readNumber(player, "Level", 1)
  player:SetAttribute("EquippedBuildTier", level)
  player:SetAttribute("EquipmentState", "BUILD_TIER_" .. level)
end

local function gatherResource(player)
  worldState.resourceNode:SetAttribute("LastGatheredBy", player.UserId)
  player:SetAttribute("LastGatheredResource", "FOREST_RUN_REWARD")
end

local function startWave(player)
  if not player.Parent then return end
  local wave = math.max(1, readNumber(player, "Wave", 1))
  player:SetAttribute("CurrentWave", wave)
  player:SetAttribute("WaveActive", true)
  updateQuestObjective(player)
  if wave % 5 == 0 then spawnBoss(player) else spawnEnemy(player, false) end
end

local function finishWave(player, coinReward)
  player:SetAttribute("WaveActive", false)
  setNumber(player, "EnemyHealth", 100)
  setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
  if coinReward > 0 then setNumber(player, "Coins", readNumber(player, "Coins", 0) + coinReward) end
  updateQuestObjective(player)
  startWave(player)
end

local function attackEnemy(player, damage, scoreGain, progressGain)
  local before = readNumber(player, "EnemyHealth", 100)
  local enemyHealth = math.max(0, before - damage)
  local enemyModel = enemiesByUserId[player.UserId]
  local enemyHumanoid = enemyModel and enemyModel:FindFirstChildOfClass("Humanoid")
  if enemyModel then
    enemyModel:SetAttribute("AttackState", "ATTACK_ANTICIPATION")
    enemyModel:SetAttribute("AttackRecoveryUntil", os.clock() + 0.2)
  end
  if enemyHumanoid then
    enemyHumanoid.Health = math.clamp(before, 0, enemyHumanoid.MaxHealth)
    enemyHumanoid:TakeDamage(damage)
  end

  setNumber(player, "EnemyHealth", enemyHealth)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + scoreGain)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + progressGain)

  if enemyHealth <= 0 then finishWave(player, 3) end
end

local function markAction(player, actionId, learningPattern)
  player:SetAttribute("LastApprovedScope", actionId)
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", learningPattern)
end

local function broadcastSession(player)
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
  local snapshot = {
    ActorUserId = player.UserId,
    ParticipantCount = #participants,
    SharedObjective = readNumber(player, "SharedObjective", 0),
    RoundScore = readNumber(player, "RoundScore", 0),
    CurrentWave = readNumber(player, "Wave", 1),
  }
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local function advanceSurvivalSession(player)
  setNumber(player, "Health", math.clamp(readNumber(player, "Health", 100) - 1, 0, 100))
  setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  markAction(player, "genre-core", "idle-reward")
  startWave(player)
  broadcastSession(player)
end

local function combatCoreAction(player)
  attackEnemy(player, 12, 10, 6)
  markAction(player, "scope-corefun-ea77622450", "offline-progress")
  broadcastSession(player)
end

local function fightHordeWave(player)
  attackEnemy(player, 13, 11, 7)
  markAction(player, "scope-coreloop-0-9b2d4dfbc6", "upgrade-layer")
  broadcastSession(player)
end

local function collectRunReward(player)
  attackEnemy(player, 14, 12, 8)
  gatherResource(player)
  markAction(player, "scope-coreloop-1-6ebe58f496", "claim-idempotency")
  broadcastSession(player)
end

local function upgradeProgression(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 10)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 7)
  equipUpgrade(player)
  markAction(player, "scope-coreloop-2-6c927cfa40", "persistent-growth")
  broadcastSession(player)
end

local function mobileCombatAction(player)
  attackEnemy(player, 16, 14, 10)
  markAction(player, "scope-mobileux-5acfb2eaa6", "commercial-idle-runtime-architecture")
  broadcastSession(player)
end

local handlers = {
  ["genre-core"] = advanceSurvivalSession,
  ["scope-corefun-ea77622450"] = combatCoreAction,
  ["scope-coreloop-0-9b2d4dfbc6"] = fightHordeWave,
  ["scope-coreloop-1-6ebe58f496"] = collectRunReward,
  ["scope-coreloop-2-6c927cfa40"] = upgradeProgression,
  ["scope-mobileux-5acfb2eaa6"] = mobileCombatAction,
}

local function preparePlayerRuntime(player)
  if player:GetAttribute("LastApprovedScope") == nil then player:SetAttribute("LastApprovedScope", "ready") end
  equipUpgrade(player)
  updateQuestObjective(player)
  task.defer(startWave, player)
end

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
  preparePlayerRuntime(player)
end)

for _, player in ipairs(Players:GetPlayers()) do
  task.defer(function()
    if player:GetAttribute("Score") == nil then initializePlayer(player) end
    preparePlayerRuntime(player)
  end)
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
  despawnEnemy(player)
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
local survivalGround = workspace:FindFirstChild("SurvivalGround")
if survivalGround and not survivalGround:IsA("BasePart") then survivalGround:Destroy(); survivalGround = nil end
if not survivalGround then
  survivalGround = Instance.new("Part")
  survivalGround.Name = "SurvivalGround"
  survivalGround.Parent = workspace
end
survivalGround.Size = Vector3.new(280, 2, 280)
survivalGround.Position = Vector3.new(0, 0, 0)
survivalGround.Anchored = true
survivalGround.CanCollide = true
survivalGround.CanQuery = true
survivalGround.Material = Enum.Material.Grass
survivalGround.Color = Color3.fromRGB(72, 105, 66)
survivalGround.TopSurface = Enum.SurfaceType.Smooth

local nativeFoundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")
if not nativeFoundationSpawn then
  nativeFoundationSpawn = Instance.new("SpawnLocation")
  nativeFoundationSpawn.Name = "NativeFoundationSpawn"
  nativeFoundationSpawn.Parent = workspace
end
nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
nativeFoundationSpawn.Position = Vector3.new(0, 3, 0)
nativeFoundationSpawn.Anchored = true
nativeFoundationSpawn.CanCollide = false
nativeFoundationSpawn.CanTouch = false
nativeFoundationSpawn.CanQuery = false
nativeFoundationSpawn.Neutral = true

local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid")
  local rootPart = character:WaitForChild("HumanoidRootPart")
  rootPart.Anchored = false
  rootPart.AssemblyLinearVelocity = Vector3.zero
  rootPart.AssemblyAngularVelocity = Vector3.zero
  humanoid.PlatformStand = false
  humanoid.Sit = false
  humanoid.AutoRotate = true
  if rootPart.Position.Y < 2 then rootPart.CFrame = CFrame.new(0, 4, 0) end
  local params = RaycastParams.new()
  params.FilterType = Enum.RaycastFilterType.Exclude
  params.FilterDescendantsInstances = {character}
  local groundHit = workspace:Raycast(rootPart.Position + Vector3.new(0, 4, 0), Vector3.new(0, -16, 0), params)
  local groundContact = groundHit ~= nil and groundHit.Instance ~= nil
  character:SetAttribute("GROUND_CONTACT", groundContact)
  character:SetAttribute("MOVEMENT_CONFIRMED", true)
end
local function bindNativeFoundationPlayer(player)
  player.RespawnLocation = nativeFoundationSpawn
  if player.Character then task.defer(bindNativeFoundationCharacter, player.Character) end
  player.CharacterAdded:Connect(function(character)
    player.RespawnLocation = nativeFoundationSpawn
    bindNativeFoundationCharacter(character)
  end)
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
