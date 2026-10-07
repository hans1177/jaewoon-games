-- 파일명: roblox-games/line-defense/server/Game.server.luau

-- 임포트
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

-- 저장
local store
pcall(function()
  store = DataStoreService:GetDataStore("line-defense-development-v1")
end)

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

-- 상태
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
  player:SetAttribute("SessionActive", false)
  player:SetAttribute("WaveActive", false)
  player:SetAttribute("WaveCleared", false)
  player:SetAttribute("BattleResource", 0)
  player:SetAttribute("InventorySummary", "")
  player:SetAttribute("QuestState", "READY")
  player:SetAttribute("NextLane", "CENTER")
  player:SetAttribute("ObjectiveHint", "CHECK_INVASION_ROUTE")
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
local function worldPart(parent, name, size, position, color, material)
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
  part.Color = color
  part.Material = material
  return part
end

local function buildWorld()
  local world = workspace:FindFirstChild("LineDefenseWorld")
  if world and not world:IsA("Model") then
    world:Destroy()
    world = nil
  end
  if not world then
    world = Instance.new("Model")
    world.Name = "LineDefenseWorld"
    world.Parent = workspace
  end

  local ground = worldPart(world, "AlleyRegion", Vector3.new(92, 2, 104), Vector3.new(0, -1, 0), Color3.fromRGB(83, 84, 88), Enum.Material.Concrete)
  local enemyPath = worldPart(world, "EnemyPath", Vector3.new(15, 0.5, 86), Vector3.new(0, 0.25, -2), Color3.fromRGB(111, 92, 72), Enum.Material.Cobblestone)
  local base = worldPart(world, "HideoutObjective", Vector3.new(18, 9, 10), Vector3.new(0, 4.5, 42), Color3.fromRGB(62, 83, 104), Enum.Material.Brick)
  local enemySpawn = worldPart(world, "EnemySpawn", Vector3.new(14, 1, 8), Vector3.new(0, 0.5, -46), Color3.fromRGB(120, 62, 55), Enum.Material.Asphalt)
  enemySpawn.Transparency = 0.35

  local lanes = {
    worldPart(world, "LaneLeft", Vector3.new(13, 0.8, 18), Vector3.new(-20, 0.4, -12), Color3.fromRGB(91, 97, 104), Enum.Material.Cobblestone),
    worldPart(world, "LaneCenter", Vector3.new(13, 0.8, 18), Vector3.new(0, 0.4, 2), Color3.fromRGB(96, 101, 108), Enum.Material.Cobblestone),
    worldPart(world, "LaneRight", Vector3.new(13, 0.8, 18), Vector3.new(20, 0.4, 16), Color3.fromRGB(91, 97, 104), Enum.Material.Cobblestone),
  }

  world:SetAttribute("Landmark", "ALLEY_HIDEOUT")
  world:SetAttribute("Objective", "DEFEND_HIDEOUT")
  world:SetAttribute("WorldReady", true)
  ground:SetAttribute("Zone", "ALLEY")
  enemyPath:SetAttribute("Hazard", "INVASION_ROUTE")
  base:SetAttribute("Objective", "BASE_HEALTH")
  return {model = world, ground = ground, path = enemyPath, base = base, spawn = enemySpawn, lanes = lanes}
end

local worldState = buildWorld()

-- 세션 / 인벤토리
local function getSession(player)
  local session = sessions[player]
  if session then return session end
  session = {
    waveActive = false,
    enemies = {},
    towers = {},
    inventory = {},
    towerSequence = 0,
    lastClearedWave = 0,
  }
  sessions[player] = session
  return session
end

local function countLive(map)
  local count = 0
  for instance in pairs(map) do
    if instance and instance.Parent then count += 1 end
  end
  return count
end

local function updateInventorySummary(player)
  local session = getSession(player)
  local rows = {}
  for itemId, amount in pairs(session.inventory) do
    if amount > 0 then table.insert(rows, itemId .. ":" .. tostring(amount)) end
  end
  table.sort(rows)
  player:SetAttribute("InventorySummary", table.concat(rows, ","))
end

local function addItemToInventory(player, itemId, amount)
  local session = getSession(player)
  local usedSlots = 0
  for _, value in pairs(session.inventory) do
    if value > 0 then usedSlots += 1 end
  end
  if session.inventory[itemId] == nil and usedSlots >= 5 then
    player:SetAttribute("ObjectiveHint", "INVENTORY_FULL")
    return false
  end
  session.inventory[itemId] = math.max(0, (session.inventory[itemId] or 0) + math.max(1, math.floor(amount or 1)))
  updateInventorySummary(player)
  return true
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

-- 퀘스트 / 성장
local function startQuest(player)
  local wave = math.max(1, readNumber(player, "Wave", 1))
  player:SetAttribute("QuestState", "ACTIVE")
  player:SetAttribute("QuestTargetWave", wave)
  player:SetAttribute("ObjectiveHint", "DEFEND_WAVE_" .. tostring(wave))
  setNumber(player, "Objective", wave)
  if readNumber(player, "BattleResource", 0) <= 0 then
    setNumber(player, "BattleResource", 10 + readNumber(player, "Level", 1) * 2)
  end
  recordAction(player, "genre-core", "board-grid-placement", 7, 4)
end

local function awardProgress(player, amount)
  local progress = readNumber(player, "Progress", 0) + math.max(0, math.floor(amount or 0))
  local level = math.max(1, readNumber(player, "Level", 1))
  local threshold = level * 20
  while progress >= threshold do
    progress -= threshold
    level += 1
    threshold = level * 20
  end
  setNumber(player, "Progress", progress)
  setNumber(player, "Level", level)
end

local function settleInventory(player)
  local session = getSession(player)
  local lootCount = 0
  for _, amount in pairs(session.inventory) do
    lootCount += math.max(0, math.floor(amount))
  end
  table.clear(session.inventory)
  updateInventorySummary(player)
  if lootCount > 0 then
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + lootCount)
    awardProgress(player, lootCount * 2)
  end
  return lootCount
end

local function upgradeUnit(player)
  local battleResource = math.max(0, readNumber(player, "BattleResource", 0))
  local level = math.max(1, readNumber(player, "Level", 1))
  local cost = 5 + level
  if battleResource < cost then
    player:SetAttribute("ObjectiveHint", "NEED_ALLEY_RESOURCE_" .. tostring(cost))
    return false
  end

  setNumber(player, "BattleResource", battleResource - cost)
  local session = getSession(player)
  for tower in pairs(session.towers) do
    if tower and tower.Parent then
      tower:SetAttribute("Damage", (tonumber(tower:GetAttribute("Damage")) or 9) + 3)
      tower:SetAttribute("UpgradeTier", (tonumber(tower:GetAttribute("UpgradeTier")) or 1) + 1)
    end
  end
  player:SetAttribute("ObjectiveHint", "UNIT_UPGRADE_APPLIED")
  return true
end

-- 실시간 자원
local function collectAlleyResource(player, amount)
  local gain = math.max(1, math.floor(amount or 1))
  setNumber(player, "BattleResource", readNumber(player, "BattleResource", 0) + gain)
  setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + gain)
  player:SetAttribute("LastResourceGain", gain)
end

-- 전투
local function findTargetEnemy(player)
  local session = getSession(player)
  local target = nil
  local nearest = math.huge
  for enemy in pairs(session.enemies) do
    local root = enemy and enemy.PrimaryPart
    if root and enemy.Parent then
      local distance = (root.Position - worldState.base.Position).Magnitude
      if distance < nearest then
        nearest = distance
        target = enemy
      end
    end
  end
  return target
end

local finishWave

local function damageEnemy(player, enemy, amount)
  local session = sessions[player]
  if not session or not enemy or not session.enemies[enemy] or not enemy.Parent then return false end
  local health = tonumber(enemy:GetAttribute("Health")) or 0
  if health <= 0 then return false end

  local nextHealth = math.max(0, health - math.max(1, math.floor(amount)))
  enemy:SetAttribute("Health", nextHealth)
  enemy:SetAttribute("HitReactionAt", os.clock())
  enemy:SetAttribute("RecoveryState", nextHealth > 0 and "RECOVERING" or "DEFEATED")
  setNumber(player, "EnemyHealth", nextHealth)

  if nextHealth <= 0 then
    local reward = tonumber(enemy:GetAttribute("AlleyResourceReward")) or 2
    collectAlleyResource(player, reward)
    addItemToInventory(player, enemy:GetAttribute("Boss") == true and "HIDEOUT_PART" or "BATTLE_LOOT", 1)
    setNumber(player, "Score", readNumber(player, "Score", 0) + 10 + reward)
    session.enemies[enemy] = nil
    enemy:Destroy()

    local nextTarget = findTargetEnemy(player)
    if nextTarget then
      setNumber(player, "EnemyHealth", tonumber(nextTarget:GetAttribute("Health")) or 0)
    elseif session.waveActive and finishWave then
      finishWave(player, "CLEARED")
    end
    broadcastMultiplayerSync(player)
    return true
  end
  return false
end

local function retryStage(player, reason)
  local session = getSession(player)
  clearEnemies(session)
  session.waveActive = false
  player:SetAttribute("SessionActive", false)
  player:SetAttribute("WaveActive", false)
  player:SetAttribute("WaveCleared", false)
  player:SetAttribute("WaveEndReason", reason or "FAILED")
  player:SetAttribute("QuestState", "RETRY_READY")
  setNumber(player, "BaseHealth", 100)
  setNumber(player, "EnemyHealth", 0)
  setNumber(player, "BattleResource", 0)
  setNumber(player, "RoundScore", 0)
  player:SetAttribute("ObjectiveHint", "REVIEW_ENEMY_WEAKNESS")
  broadcastMultiplayerSync(player)
end

finishWave = function(player, reason)
  local session = getSession(player)
  if not session.waveActive then return end
  session.waveActive = false
  local clearedWave = math.max(1, readNumber(player, "Wave", 1))
  session.lastClearedWave = clearedWave

  player:SetAttribute("SessionActive", false)
  player:SetAttribute("WaveActive", false)
  player:SetAttribute("WaveCleared", true)
  player:SetAttribute("WaveEndReason", reason or "CLEARED")
  player:SetAttribute("QuestState", "COMPLETE")
  setNumber(player, "Wave", clearedWave + 1)
  setNumber(player, "EnemyHealth", 0)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3 + math.floor(clearedWave / 2))
  awardProgress(player, 6 + clearedWave)
  player:SetAttribute("ObjectiveHint", "SETTLE_LOOT_AND_UPGRADE")
  broadcastMultiplayerSync(player)
end

local function runEnemyAI(player, enemy)
  enemy:SetAttribute("Target", "HideoutObjective")
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
          retryStage(player, "BASE_BREACHED")
        elseif countLive(session.enemies) == 0 and session.waveActive then
          finishWave(player, "SURVIVED")
        else
          broadcastMultiplayerSync(player)
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
local enemyKinds = {"RUSHER", "ARMORED", "RANGED"}

local function spawnEnemy(player, enemyKind, wave, index)
  local session = getSession(player)
  local kind = enemyKind or enemyKinds[((index - 1) % #enemyKinds) + 1]

  local enemy = Instance.new("Model")
  enemy.Name = kind == "BOSS" and "BossEnemy" or ("Enemy_" .. kind .. "_" .. index)
  enemy.Parent = worldState.model

  local body = Instance.new("Part")
  body.Name = "Body"
  body.Shape = Enum.PartType.Ball
  body.Anchored = true
  body.CanCollide = false
  body.Material = Enum.Material.SmoothPlastic
  body.Color = kind == "RUSHER" and Color3.fromRGB(170, 74, 67)
    or kind == "ARMORED" and Color3.fromRGB(82, 101, 119)
    or kind == "RANGED" and Color3.fromRGB(145, 101, 71)
    or Color3.fromRGB(113, 53, 118)
  body.Size = kind == "BOSS" and Vector3.new(7, 7, 7) or Vector3.new(3.5, 3.5, 3.5)
  body.Position = worldState.spawn.Position + Vector3.new(((index - 1) % 3 - 1) * 4, body.Size.Y / 2, -math.floor((index - 1) / 3) * 4)
  body.Parent = enemy
  enemy.PrimaryPart = body

  local health = kind == "BOSS" and (240 + wave * 35) or (52 + wave * 14 + index * 3)
  local moveSpeed = kind == "RUSHER" and math.min(9 + wave * 0.3, 15) or math.min(7 + wave * 0.25, 12)
  enemy:SetAttribute("EnemyType", kind)
  enemy:SetAttribute("Health", health)
  enemy:SetAttribute("MaxHealth", health)
  enemy:SetAttribute("MoveSpeed", moveSpeed)
  enemy:SetAttribute("BaseDamage", kind == "BOSS" and 22 or (7 + math.floor(wave / 2)))
  enemy:SetAttribute("AlleyResourceReward", kind == "BOSS" and 8 or 2)
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

-- 방어 유닛
local laneNames = {"LEFT", "CENTER", "RIGHT"}

local function createDefenseUnit(player)
  local session = getSession(player)
  session.towerSequence += 1
  local index = session.towerSequence
  local laneIndex = ((index - 1) % #worldState.lanes) + 1

  local tower = Instance.new("Model")
  tower.Name = "AlleyTower_" .. tostring(player.UserId) .. "_" .. index
  tower.Parent = worldState.model

  local body = Instance.new("Part")
  body.Name = "TowerBody"
  body.Anchored = true
  body.CanCollide = true
  body.Size = Vector3.new(4, 6, 4)
  body.Material = Enum.Material.Metal
  body.Color = Color3.fromRGB(66 + laneIndex * 18, 102, 137)
  body.Position = worldState.lanes[laneIndex].Position + Vector3.new(0, 3.5, 0)
  body.Parent = tower
  tower.PrimaryPart = body

  tower:SetAttribute("Lane", laneNames[laneIndex])
  tower:SetAttribute("Damage", 9 + math.max(1, readNumber(player, "Level", 1)) * 2)
  tower:SetAttribute("UpgradeTier", 1)
  tower:SetAttribute("OwnerUserId", player.UserId)
  session.towers[tower] = true

  task.spawn(function()
    while player.Parent and tower.Parent and sessions[player] do
      local target = findTargetEnemy(player)
      if target then
        tower:SetAttribute("TargetEnemy", target.Name)
        tower:SetAttribute("AttackStartedAt", os.clock())
        damageEnemy(player, target, tonumber(tower:GetAttribute("Damage")) or 10)
        tower:SetAttribute("AttackRecoveryAt", os.clock())
      end
      task.wait(1.15)
    end
  end)
  return tower
end

local function placeTower(player)
  local battleResource = math.max(0, readNumber(player, "BattleResource", 0))
  local towers = math.max(0, readNumber(player, "Towers", 0))
  local cost = 4 + towers * 2
  if battleResource < cost then
    player:SetAttribute("ObjectiveHint", "NEED_ALLEY_RESOURCE_" .. tostring(cost))
    return false
  end

  setNumber(player, "BattleResource", battleResource - cost)
  setNumber(player, "Towers", towers + 1)
  local tower = createDefenseUnit(player)
  player:SetAttribute("NextLane", tostring(tower:GetAttribute("Lane") or "CENTER"))
  player:SetAttribute("ObjectiveHint", "UNIT_PLACED")
  return true
end

-- 웨이브
local function startWave(player)
  local session = getSession(player)
  if session.waveActive then return end
  if player:GetAttribute("QuestState") ~= "ACTIVE" then startQuest(player) end
  if readNumber(player, "BaseHealth", 100) <= 0 then setNumber(player, "BaseHealth", 100) end

  session.waveActive = true
  player:SetAttribute("SessionActive", true)
  player:SetAttribute("SessionStartedAt", os.time())
  player:SetAttribute("WaveActive", true)
  player:SetAttribute("WaveCleared", false)
  player:SetAttribute("WaveEndReason", "")
  player:SetAttribute("ObjectiveHint", "DEFEND_ALLEY")
  setNumber(player, "RoundScore", 0)

  local wave = math.max(1, readNumber(player, "Wave", 1))
  local enemyCount = math.clamp(3 + wave, 4, 10)
  for index = 1, enemyCount do
    spawnEnemy(player, nil, wave, index)
  end
  if wave >= 5 and wave % 5 == 0 then
    spawnBoss(player, wave)
  end

  if countLive(session.towers) == 0 and readNumber(player, "BattleResource", 0) >= 4 then
    placeTower(player)
  end
  broadcastMultiplayerSync(player)
end

local function inspectInvasionAndDeploy(player)
  if player:GetAttribute("QuestState") ~= "ACTIVE" then startQuest(player) end
  local wave = math.max(1, readNumber(player, "Wave", 1))
  local lane = laneNames[((wave - 1) % #laneNames) + 1]
  player:SetAttribute("NextLane", lane)
  player:SetAttribute("EnemyComposition", table.concat(enemyKinds, ","))
  placeTower(player)
  if not getSession(player).waveActive then startWave(player) end
  recordAction(player, "scope-coreloop-0-86bde7efe9", "input-drag-touch", 11, 7)
end

local function attackEnemy(player)
  local session = getSession(player)
  if not session.waveActive then startWave(player) end
  local target = findTargetEnemy(player)
  if target then
    local level = math.max(1, readNumber(player, "Level", 1))
    damageEnemy(player, target, 12 + level * 2)
    setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  end
  recordAction(player, "scope-corefun-27c99c0f63", "score-combo-reward", 10, 6)
end

local function combatResourceLoop(player)
  local session = getSession(player)
  if not session.waveActive then startWave(player) end
  local target = findTargetEnemy(player)
  if target then
    local level = math.max(1, readNumber(player, "Level", 1))
    damageEnemy(player, target, 10 + level)
  end
  if readNumber(player, "BattleResource", 0) >= 6 then
    upgradeUnit(player)
  elseif readNumber(player, "BattleResource", 0) >= 4 then
    placeTower(player)
  end
  recordAction(player, "scope-coreloop-1-b347a6bd0a", "progression-difficulty", 12, 8)
end

local function settleLootAndProgress(player)
  local session = getSession(player)
  if session.waveActive then
    player:SetAttribute("ObjectiveHint", "CLEAR_CURRENT_WAVE_FIRST")
  else
    local lootCount = settleInventory(player)
    if lootCount > 0 then
      player:SetAttribute("QuestState", "SETTLED")
      player:SetAttribute("ObjectiveHint", "PERMANENT_GROWTH_APPLIED")
    else
      player:SetAttribute("ObjectiveHint", "NO_LOOT_TO_SETTLE")
    end
  end
  recordAction(player, "scope-coreloop-2-c614cb6a4b", "save-state-persistence", 13, 9)
  broadcastMultiplayerSync(player)
end

local function reviewDefenseState(player)
  local session = getSession(player)
  player:SetAttribute("VisibleEnemyCount", countLive(session.enemies))
  player:SetAttribute("VisibleTowerCount", countLive(session.towers))
  player:SetAttribute("ObjectiveHint", session.waveActive and "WATCH_LANE_PRESSURE" or "PREPARE_NEXT_WAVE")
  recordAction(player, "scope-mobileux-53f9059bd3", "ads-monetization", 14, 10)
  broadcastMultiplayerSync(player)
end

local handlers = {
  ["genre-core"] = startQuest,
  ["scope-corefun-27c99c0f63"] = attackEnemy,
  ["scope-coreloop-0-86bde7efe9"] = inspectInvasionAndDeploy,
  ["scope-coreloop-1-b347a6bd0a"] = combatResourceLoop,
  ["scope-coreloop-2-c614cb6a4b"] = settleLootAndProgress,
  ["scope-mobileux-53f9059bd3"] = reviewDefenseState,
}

local function restoreTowers(player)
  local savedCount = math.clamp(readNumber(player, "Towers", 0), 0, 5)
  for _ = 1, savedCount do
    createDefenseUnit(player)
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
  restoreTowers(player)
  task.defer(function()
    if player.Parent == Players then broadcastMultiplayerSync(player) end
  end)
end

Players.PlayerAdded:Connect(bindPlayer)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(function()
    if player:GetAttribute("Score") == nil then bindPlayer(player) end
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
  task.defer(function()
    broadcastMultiplayerSync(nil)
  end)
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
  nativeFoundationSpawn.Neutral = true
  nativeFoundationSpawn.Parent = workspace
end
nativeFoundationSpawn.Anchored = true
nativeFoundationSpawn.CanCollide = true
-- 첫 헤드리스 프레임에서도 플레이어 접속 없이 실제 경로 지면에 스폰을 고정한다.
nativeFoundationSpawn.Position = Vector3.new(
  0,
  worldState.path.Position.Y + worldState.path.Size.Y * 0.5 + nativeFoundationSpawn.Size.Y * 0.5 + 0.05,
  0
)

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

game:BindToClose(function()
  for _, player in ipairs(Players:GetPlayers()) do
    savePlayer(player)
  end
end)
