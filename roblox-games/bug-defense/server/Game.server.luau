-- 파일명: roblox-games/bug-defense/server/Game.server.luau

-- 임포트
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

-- 저장
-- 로컬 Studio에서 저장소를 사용할 수 없어도 시작 월드가 생성되어야 한다.
local store
local storeReady, storeResult = pcall(function()
  return DataStoreService:GetDataStore("bug-defense-development-v1")
end)
if storeReady then store = storeResult end

-- 네트워크
local remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)
if remote and not remote:IsA("RemoteEvent") then
  remote:Destroy()
  remote = nil
end
if not remote then
  remote = Instance.new("RemoteEvent")
  remote.Name = Config.RemoteName
  remote.Parent = ReplicatedStorage
end

-- 플레이어 상태
local lastAction = {}
local sessions = {}

local function readNumber(player, name, fallback)
  local value = player:GetAttribute(name)
  if typeof(value) ~= "number" then return fallback end
  return value
end

local function setNumber(player, name, value)
  if typeof(value) ~= "number" then return end
  player:SetAttribute(name, math.floor(value))
end

local function initializeTransientState(player)
  player:SetAttribute("LastApprovedScope", "ready")
  player:SetAttribute("WaveActive", false)
  player:SetAttribute("SessionActive", false)
  player:SetAttribute("TutorialHint", "ANALYZE_WAVE")
  if Config.LearningContext and Config.LearningContext.Applied then
    player:SetAttribute("LearningOperator", Config.LearningContext.Operator)
    player:SetAttribute("LastLearningPattern", "")
    player:SetAttribute("ActionSequence", 0)
  end
end

local function initializePlayer(player)
  for key, value in pairs(Config.InitialState) do
    player:SetAttribute(key, value)
  end
  initializeTransientState(player)
end

local function savePlayer(player)
  if not store then return end
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do
    snapshot[key] = readNumber(player, key, fallback)
  end
  pcall(function()
    store:UpdateAsync("player:" .. player.UserId, function()
      return snapshot
    end)
  end)
end

local function recordAction(player, scopeId, learningPattern, scoreDelta, progressDelta)
  player:SetAttribute("LastApprovedScope", scopeId)
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", learningPattern)
  if scoreDelta and scoreDelta ~= 0 then
    setNumber(player, "Score", readNumber(player, "Score", 0) + scoreDelta)
  end
  if progressDelta and progressDelta ~= 0 then
    setNumber(player, "Progress", readNumber(player, "Progress", 0) + progressDelta)
  end
end


-- 기본 멀티 동기화
local function multiplayerSnapshot(changedPlayer)
  local participants = {}
  for _, participant in ipairs(Players:GetPlayers()) do
    table.insert(participants, {
      UserId = participant.UserId,
      Name = participant.Name,
      Level = readNumber(participant, "Level", 1),
      Wave = readNumber(participant, "Wave", 1),
      BaseHealth = readNumber(participant, "BaseHealth", 100),
      SessionActive = participant:GetAttribute("SessionActive") == true,
    })
  end
  return {
    Version = 1,
    ParticipantCount = #participants,
    ChangedUserId = changedPlayer and changedPlayer.UserId or 0,
    Participants = participants,
    ServerTime = os.time(),
  }
end

local function broadcastMultiplayerSync(changedPlayer)
  remote:FireAllClients("MULTIPLAYER_SYNC", multiplayerSnapshot(changedPlayer))
end

-- 월드
local function makeWorldPart(parent, name, size, position, color, material)
  local part = parent:FindFirstChild(name)
  if part and not part:IsA("BasePart") then
    part:Destroy()
    part = nil
  end
  if not part then
    part = Instance.new("Part")
    part.Name = name
    part.Parent = parent
  end
  part.Size = size
  part.Position = position
  part.Anchored = true
  part.CanCollide = true
  part.Material = material
  part.Color = color
  return part
end

local function buildWorld()
  local world = workspace:FindFirstChild("BugDefenseGarden")
  if world and not world:IsA("Model") then
    world:Destroy()
    world = nil
  end
  if not world then
    world = Instance.new("Model")
    world.Name = "BugDefenseGarden"
    world.Parent = workspace
  end

  local ground = makeWorldPart(
    world,
    "GardenRegion",
    Vector3.new(88, 2, 96),
    Vector3.new(0, -1, 0),
    Color3.fromRGB(83, 132, 72),
    Enum.Material.Grass
  )
  local enemyLane = makeWorldPart(
    world,
    "EnemyPath",
    Vector3.new(16, 0.5, 78),
    Vector3.new(0, 0.25, -4),
    Color3.fromRGB(104, 79, 53),
    Enum.Material.Ground
  )
  local gardenCore = makeWorldPart(
    world,
    "GardenCoreObjective",
    Vector3.new(16, 7, 8),
    Vector3.new(0, 3.5, 37),
    Color3.fromRGB(92, 180, 88),
    Enum.Material.WoodPlanks
  )
  local enemySpawn = makeWorldPart(
    world,
    "EnemySpawnZone",
    Vector3.new(14, 1, 6),
    Vector3.new(0, 0.5, -43),
    Color3.fromRGB(123, 72, 52),
    Enum.Material.Ground
  )
  enemySpawn.Transparency = 0.35

  local habitats = {
    makeWorldPart(world, "LeafHabitat", Vector3.new(12, 1, 12), Vector3.new(-18, 0.5, -8), Color3.fromRGB(64, 156, 80), Enum.Material.Grass),
    makeWorldPart(world, "StemHabitat", Vector3.new(12, 1, 12), Vector3.new(18, 0.5, 4), Color3.fromRGB(139, 100, 66), Enum.Material.Wood),
    makeWorldPart(world, "FlowerHabitat", Vector3.new(12, 1, 12), Vector3.new(-18, 0.5, 19), Color3.fromRGB(197, 109, 157), Enum.Material.Grass),
  }

  world:SetAttribute("Landmark", "GARDEN_DEFENSE")
  world:SetAttribute("Objective", "PROTECT_GARDEN_CORE")
  world:SetAttribute("WorldReady", true)
  ground:SetAttribute("Zone", "GARDEN")
  enemyLane:SetAttribute("Hazard", "INVASION_LANE")
  gardenCore:SetAttribute("Objective", "BASE_HEALTH")
  return {
    model = world,
    ground = ground,
    lane = enemyLane,
    base = gardenCore,
    spawn = enemySpawn,
    habitats = habitats,
  }
end

local worldState = buildWorld()

-- 세션
local function getSession(player)
  local session = sessions[player]
  if session then return session end
  session = {
    waveActive = false,
    enemies = {},
    towers = {},
    towerSequence = 0,
    skillReadyAt = 0,
  }
  sessions[player] = session
  return session
end

local function countModels(models)
  local count = 0
  for model in pairs(models) do
    if model and model.Parent then
      count += 1
    end
  end
  return count
end

local function clearEnemies(session)
  for enemy in pairs(session.enemies) do
    if enemy and enemy.Parent then enemy:Destroy() end
  end
  table.clear(session.enemies)
end

local function clearTowers(session)
  for tower in pairs(session.towers) do
    if tower and tower.Parent then tower:Destroy() end
  end
  table.clear(session.towers)
end

local function finishWave(player, reason)
  local session = sessions[player]
  if not session or not session.waveActive then return end
  session.waveActive = false
  player:SetAttribute("WaveActive", false)
  player:SetAttribute("SessionActive", false)
  player:SetAttribute("WaveEndReason", reason or "CLEARED")

  local wave = readNumber(player, "Wave", 1)
  local reward = 3 + math.floor(wave / 2)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + reward)
  setNumber(player, "Wave", wave + 1)
  setNumber(player, "EnemyHealth", 0)
  player:SetAttribute("TutorialHint", "PLACE_OR_EVOLVE")
end

local function retryWave(player, reason)
  local session = getSession(player)
  clearEnemies(session)
  session.waveActive = false
  player:SetAttribute("WaveActive", false)
  player:SetAttribute("SessionActive", false)
  player:SetAttribute("WaveEndReason", reason or "BASE_BREACHED")
  setNumber(player, "BaseHealth", 100)
  setNumber(player, "EnemyHealth", 0)
  player:SetAttribute("TutorialHint", "ADJUST_DEFENSE_AND_RETRY")
end

-- 전투 / 상성
local function resolveEcologyMultiplier(attackType, defenseType, habitat)
  local multiplier = 1
  if attackType == "POISON" and defenseType == "SWARM" then
    multiplier = 1.35
  elseif attackType == "PHYSICAL" and defenseType == "ARMOR" then
    multiplier = 1.30
  elseif attackType == "AREA" and defenseType == "FLYING" then
    multiplier = 1.25
  end

  if (habitat == "LEAF" and attackType == "POISON")
    or (habitat == "STEM" and attackType == "PHYSICAL")
    or (habitat == "FLOWER" and attackType == "AREA") then
    multiplier += 0.15
  end
  return multiplier
end

local function findTargetEnemy(player)
  local session = getSession(player)
  local target = nil
  local nearestDistance = math.huge
  for enemy in pairs(session.enemies) do
    local root = enemy and enemy.PrimaryPart
    if root and enemy.Parent then
      local distance = (root.Position - worldState.base.Position).Magnitude
      if distance < nearestDistance then
        nearestDistance = distance
        target = enemy
      end
    end
  end
  return target
end

local function damageEnemy(player, enemy, amount)
  local session = sessions[player]
  if not session or not enemy or not session.enemies[enemy] or not enemy.Parent then return false end
  local health = tonumber(enemy:GetAttribute("Health")) or 0
  if health <= 0 then return false end

  local nextHealth = math.max(0, health - math.max(1, amount))
  enemy:SetAttribute("Health", nextHealth)
  enemy:SetAttribute("HitReactionAt", os.clock())
  enemy:SetAttribute("RecoveryState", nextHealth > 0 and "RECOVERING" or "DEFEATED")
  setNumber(player, "EnemyHealth", nextHealth)

  if nextHealth <= 0 then
    local reward = tonumber(enemy:GetAttribute("PollenReward")) or 3
    session.enemies[enemy] = nil
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + reward)
    setNumber(player, "Score", readNumber(player, "Score", 0) + 10)
    enemy:Destroy()

    local nextTarget = findTargetEnemy(player)
    if nextTarget then
      setNumber(player, "EnemyHealth", tonumber(nextTarget:GetAttribute("Health")) or 0)
    elseif session.waveActive then
      finishWave(player, "CLEARED")
    end
    return true
  end
  return false
end

local function runEnemyAI(player, enemy)
  enemy:SetAttribute("Target", "GardenCoreObjective")
  enemy:SetAttribute("AggroState", "ADVANCING")
  enemy:SetAttribute("AttackState", "CHASE")

  task.spawn(function()
    while player.Parent and enemy.Parent do
      local session = sessions[player]
      local root = enemy.PrimaryPart
      if not session or not session.waveActive or not root then break end

      local targetPosition = worldState.base.Position + Vector3.new(0, 2, 0)
      local offset = targetPosition - root.Position
      local distance = offset.Magnitude
      if distance <= 4 then
        enemy:SetAttribute("AttackState", "ATTACK_WINDUP")
        enemy:SetAttribute("AttackAnticipation", os.clock())
        task.wait(0.2)
        if not enemy.Parent or not sessions[player] then break end

        local baseDamage = tonumber(enemy:GetAttribute("BaseDamage")) or 8
        local baseHealth = math.max(0, readNumber(player, "BaseHealth", 100) - baseDamage)
        setNumber(player, "BaseHealth", baseHealth)
        session.enemies[enemy] = nil
        enemy:Destroy()

        if baseHealth <= 0 then
          retryWave(player, "BASE_BREACHED")
        elseif countModels(session.enemies) == 0 and session.waveActive then
          finishWave(player, "SURVIVED")
        end
        break
      end

      local moveSpeed = tonumber(enemy:GetAttribute("MoveSpeed")) or 7
      local step = math.min(distance, moveSpeed * 0.1)
      local nextPosition = root.Position + offset.Unit * step
      root.CFrame = CFrame.lookAt(nextPosition, targetPosition)
      task.wait(0.1)
    end
  end)
end

-- 적 / 보스
local enemyTypes = {"ARMOR", "FLYING", "SWARM"}

local function spawnEnemy(player, enemyKind, wave, index)
  local session = getSession(player)
  local kind = enemyKind or enemyTypes[((index - 1) % #enemyTypes) + 1]
  local enemy = Instance.new("Model")
  enemy.Name = kind == "BOSS" and "BossPest" or ("Pest_" .. kind .. "_" .. index)
  enemy.Parent = worldState.model

  local body = Instance.new("Part")
  body.Name = "Body"
  body.Shape = Enum.PartType.Ball
  body.Anchored = true
  body.CanCollide = false
  body.Material = Enum.Material.SmoothPlastic
  body.Color = kind == "ARMOR" and Color3.fromRGB(87, 102, 116)
    or kind == "FLYING" and Color3.fromRGB(173, 130, 74)
    or kind == "SWARM" and Color3.fromRGB(121, 78, 143)
    or Color3.fromRGB(153, 52, 45)
  body.Size = kind == "BOSS" and Vector3.new(7, 7, 7) or Vector3.new(3.5, 3.5, 3.5)
  body.Position = worldState.spawn.Position + Vector3.new(((index - 1) % 3 - 1) * 4, body.Size.Y / 2, -math.floor((index - 1) / 3) * 4)
  body.Parent = enemy
  enemy.PrimaryPart = body

  local health = kind == "BOSS" and (260 + wave * 40) or (55 + wave * 15 + index * 4)
  local moveSpeed = kind == "BOSS" and math.min(8 + wave * 0.2, 12) or math.min(7 + wave * 0.35, 15)
  enemy:SetAttribute("EnemyType", kind)
  enemy:SetAttribute("Health", health)
  enemy:SetAttribute("MaxHealth", health)
  enemy:SetAttribute("MoveSpeed", moveSpeed)
  enemy:SetAttribute("BaseDamage", kind == "BOSS" and 24 or (7 + math.floor(wave / 2)))
  enemy:SetAttribute("PollenReward", kind == "BOSS" and (8 + wave) or 3)
  enemy:SetAttribute("OwnerUserId", player.UserId)

  session.enemies[enemy] = true
  if readNumber(player, "EnemyHealth", 0) <= 0 then
    setNumber(player, "EnemyHealth", health)
  end
  runEnemyAI(player, enemy)
  return enemy
end

local function spawnBoss(player, wave)
  local boss = spawnEnemy(player, "BOSS", wave, 99)
  boss:SetAttribute("Boss", true)
  boss:SetAttribute("Telegraph", "HEAVY_APPROACH")
  return boss
end

-- 웨이브
local function startWave(player)
  local session = getSession(player)
  if session.waveActive then return end

  if readNumber(player, "BaseHealth", 100) <= 0 then
    setNumber(player, "BaseHealth", 100)
  end
  session.waveActive = true
  player:SetAttribute("WaveActive", true)
  player:SetAttribute("SessionActive", true)
  player:SetAttribute("SessionStartedAt", os.time())
  player:SetAttribute("WaveEndReason", "")
  player:SetAttribute("TutorialHint", "WATCH_ENEMY_TYPES")

  local wave = math.max(1, readNumber(player, "Wave", 1))
  local enemyCount = math.clamp(3 + wave, 4, 10)
  for index = 1, enemyCount do
    spawnEnemy(player, nil, wave, index)
  end
  if wave >= 5 and wave % 5 == 0 then
    spawnBoss(player, wave)
  end
end

local function analyzeWaveStrategy(player)
  local wave = math.max(1, readNumber(player, "Wave", 1))
  local nextType = enemyTypes[((wave - 1) % #enemyTypes) + 1]
  player:SetAttribute("NextEnemyType", nextType)
  player:SetAttribute("ObjectiveHint", "COUNTER_" .. nextType)
  if not getSession(player).waveActive then
    startWave(player)
  end
  recordAction(player, "scope-coreloop-0-db6dafda13", "input-drag-touch", 11, 7)
end

-- 포식자 배치 / 진화
local attackTypes = {"POISON", "PHYSICAL", "AREA"}
local habitatNames = {"LEAF", "STEM", "FLOWER"}

local function createPredatorTower(player)
  local session = getSession(player)
  session.towerSequence += 1
  local index = session.towerSequence
  local habitatIndex = ((index - 1) % #worldState.habitats) + 1
  local attackType = attackTypes[((index - 1) % #attackTypes) + 1]
  local habitat = habitatNames[habitatIndex]

  local tower = Instance.new("Model")
  tower.Name = "PredatorTower_" .. index
  tower.Parent = worldState.model

  local body = Instance.new("Part")
  body.Name = "PredatorBody"
  body.Anchored = true
  body.CanCollide = true
  body.Material = Enum.Material.SmoothPlastic
  body.Color = attackType == "POISON" and Color3.fromRGB(62, 136, 83)
    or attackType == "PHYSICAL" and Color3.fromRGB(124, 93, 58)
    or Color3.fromRGB(178, 102, 61)
  body.Size = Vector3.new(4, 5, 4)
  body.Position = worldState.habitats[habitatIndex].Position + Vector3.new(0, 3, 0)
  body.Parent = tower
  tower.PrimaryPart = body

  local level = math.max(1, readNumber(player, "Level", 1))
  tower:SetAttribute("AttackType", attackType)
  tower:SetAttribute("Habitat", habitat)
  tower:SetAttribute("Damage", 9 + level * 3)
  tower:SetAttribute("Range", 44)
  tower:SetAttribute("OwnerUserId", player.UserId)
  session.towers[tower] = true

  task.spawn(function()
    while player.Parent and tower.Parent and sessions[player] do
      local target = findTargetEnemy(player)
      if target then
        local defenseType = tostring(target:GetAttribute("EnemyType") or "SWARM")
        local multiplier = resolveEcologyMultiplier(attackType, defenseType, habitat)
        local damage = (tonumber(tower:GetAttribute("Damage")) or 10) * multiplier
        tower:SetAttribute("TargetEnemy", target.Name)
        tower:SetAttribute("AttackStartedAt", os.clock())
        damageEnemy(player, target, damage)
        tower:SetAttribute("AttackRecoveryAt", os.clock())
      end
      task.wait(1.2)
    end
  end)
  return tower
end

local function placePredator(player)
  local currentTowers = math.max(0, readNumber(player, "Towers", 0))
  local cost = 3 + currentTowers * 2
  local coins = math.max(0, readNumber(player, "Coins", 0))
  if coins < cost then
    player:SetAttribute("ObjectiveHint", "NEED_POLLEN_" .. cost)
    return false
  end

  setNumber(player, "Coins", coins - cost)
  setNumber(player, "Towers", currentTowers + 1)
  createPredatorTower(player)
  player:SetAttribute("ObjectiveHint", "PREDATOR_PLACED")
  return true
end

local function upgradePredator(player)
  local towers = math.max(0, readNumber(player, "Towers", 0))
  if towers <= 0 then
    player:SetAttribute("ObjectiveHint", "PLACE_PREDATOR_FIRST")
    return false
  end

  local level = math.max(1, readNumber(player, "Level", 1))
  local cost = 5 + level * 2
  local coins = math.max(0, readNumber(player, "Coins", 0))
  if coins < cost then
    player:SetAttribute("ObjectiveHint", "NEED_POLLEN_" .. cost)
    return false
  end

  local nextLevel = level + 1
  setNumber(player, "Coins", coins - cost)
  setNumber(player, "Level", nextLevel)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 10)
  player:SetAttribute("SpeciesUnlockTier", math.max(1, math.floor((nextLevel - 1) / 2) + 1))

  local session = getSession(player)
  for tower in pairs(session.towers) do
    if tower and tower.Parent then
      tower:SetAttribute("Damage", (tonumber(tower:GetAttribute("Damage")) or 10) + 3)
    end
  end
  player:SetAttribute("ObjectiveHint", "PREDATOR_EVOLVED")
  return true
end

local function placeOrUpgradePredator(player)
  if readNumber(player, "Towers", 0) < 3 then
    placePredator(player)
  else
    upgradePredator(player)
  end
  recordAction(player, "scope-coreloop-1-d43c3d2506", "progression-difficulty", 12, 8)
end

-- 플레이어 전투 행동
local function attackEnemy(player)
  local session = getSession(player)
  if not session.waveActive then startWave(player) end
  local target = findTargetEnemy(player)
  if target then
    local level = math.max(1, readNumber(player, "Level", 1))
    local defenseType = tostring(target:GetAttribute("EnemyType") or "SWARM")
    local multiplier = resolveEcologyMultiplier("PHYSICAL", defenseType, "STEM")
    damageEnemy(player, target, (12 + level * 2) * multiplier)
    setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  end
  recordAction(player, "scope-corefun-f556b6611b", "score-combo-reward", 10, 6)
end

local function useCombatSkill(player)
  local session = getSession(player)
  local now = os.clock()
  if now < session.skillReadyAt then
    player:SetAttribute("ObjectiveHint", "SKILL_RECOVERY")
    return
  end
  if not session.waveActive then startWave(player) end
  session.skillReadyAt = now + 3

  local targets = {}
  for enemy in pairs(session.enemies) do
    table.insert(targets, enemy)
  end
  local level = math.max(1, readNumber(player, "Level", 1))
  for _, enemy in ipairs(targets) do
    damageEnemy(player, enemy, 8 + level * 2)
  end
  player:SetAttribute("SkillRecovery", session.skillReadyAt)
  recordAction(player, "scope-coreloop-2-42423ea982", "save-state-persistence", 13, 9)
end

local function prepareNextWave(player)
  local session = getSession(player)
  if session.waveActive then
    player:SetAttribute("ObjectiveHint", "CLEAR_CURRENT_WAVE")
  else
    upgradePredator(player)
    player:SetAttribute("TutorialHint", "ANALYZE_WAVE")
  end
  recordAction(player, "scope-coreloop-3-683fae91c6", "ads-monetization", 14, 10)
end

local function prepareDefenseObjective(player)
  setNumber(player, "Objective", readNumber(player, "Objective", 0) + 1)
  player:SetAttribute("ObjectiveHint", "PROTECT_GARDEN_CORE")
  recordAction(player, "genre-core", "board-grid-placement", 7, 9)
end

local function reviewDefenseState(player)
  local session = getSession(player)
  player:SetAttribute("ObjectiveHint", session.waveActive and "WATCH_LANE_PRESSURE" or "PREPARE_NEXT_WAVE")
  player:SetAttribute("VisibleEnemyCount", countModels(session.enemies))
  recordAction(player, "scope-mobileux-62b476fd93", "lane-pressure", 15, 11)
end

local handlers = {
  ["genre-core"] = prepareDefenseObjective,
  ["scope-corefun-f556b6611b"] = attackEnemy,
  ["scope-coreloop-0-db6dafda13"] = analyzeWaveStrategy,
  ["scope-coreloop-1-d43c3d2506"] = placeOrUpgradePredator,
  ["scope-coreloop-2-42423ea982"] = useCombatSkill,
  ["scope-coreloop-3-683fae91c6"] = prepareNextWave,
  ["scope-mobileux-62b476fd93"] = reviewDefenseState,
}

local function restorePredatorTowers(player)
  local count = math.clamp(readNumber(player, "Towers", 0), 0, 3)
  for _ = 1, count do
    createPredatorTower(player)
  end
end

local function bindPlayer(player)
  local loaded = false
  if store then
    local ok, saved = pcall(function()
      return store:GetAsync("player:" .. player.UserId)
    end)
    if ok and typeof(saved) == "table" then
      for key, fallback in pairs(Config.InitialState) do
        local value = saved[key]
        if typeof(value) == "number" then
          player:SetAttribute(key, value)
        else
          player:SetAttribute(key, fallback)
        end
      end
      loaded = true
    end
  end

  if not loaded then
    initializePlayer(player)
  else
    initializeTransientState(player)
  end
  if readNumber(player, "BaseHealth", 100) <= 0 then setNumber(player, "BaseHealth", 100) end
  getSession(player)
  restorePredatorTowers(player)
  task.defer(function()
    if player.Parent == Players then broadcastMultiplayerSync(player) end
  end)
end

Players.PlayerAdded:Connect(bindPlayer)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(function()
    if player:GetAttribute("Score") == nil then
      bindPlayer(player)
    else
      initializeTransientState(player)
      getSession(player)
      restorePredatorTowers(player)
    end
  end)
end
task.defer(function() broadcastMultiplayerSync(nil) end)

remote.OnServerEvent:Connect(function(player, actionId)
  if typeof(actionId) ~= "string" then return end
  local handler = handlers[actionId]
  if typeof(handler) ~= "function" then return end

  local now = os.clock()
  local previous = lastAction[player] or 0
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  handler(player)
  broadcastMultiplayerSync(player)
end)

Players.PlayerRemoving:Connect(function(player)
  savePlayer(player)
  local session = sessions[player]
  if session then
    clearEnemies(session)
    clearTowers(session)
  end
  sessions[player] = nil
  lastAction[player] = nil
  task.defer(function() broadcastMultiplayerSync(nil) end)
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
local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid")
  local rootPart = character:WaitForChild("HumanoidRootPart")
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  local raycastParams = RaycastParams.new()
  raycastParams.FilterType = Enum.RaycastFilterType.Exclude
  raycastParams.FilterDescendantsInstances = {character}
  local groundHit = workspace:Raycast(rootPart.Position, Vector3.new(0, -10, 0), raycastParams)
  local groundContact = groundHit ~= nil and groundHit.Instance ~= nil
  character:SetAttribute("GROUND_CONTACT", groundContact)
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
game:BindToClose(function()
  for _, player in ipairs(Players:GetPlayers()) do
    savePlayer(player)
  end
end)
